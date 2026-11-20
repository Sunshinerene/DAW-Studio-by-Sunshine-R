    /**
     * ============================================================================
     * BINARY STANDARD MIDI FILE (.MID) EXPORTER & IMPORTER
     * ============================================================================
     */
    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result || '';
          const commaIdx = res.indexOf(',');
          resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
        };
        reader.onerror = () => reject(reader.error || new Error('Base64-Konvertierung fehlgeschlagen'));
        reader.readAsDataURL(blob);
      });
    }

    async function saveOrShareBlob(blob, filename) {
      const cap = window.Capacitor;
      const isNative = Boolean(cap && ((typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) || cap.Plugins?.Filesystem));

      if (isNative && cap.Plugins?.Filesystem) {
        const base64Data = await blobToBase64(blob);
        const Filesystem = cap.Plugins.Filesystem;
        const Share = cap.Plugins.Share;

        if (Share && typeof Share.share === 'function') {
          const written = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'CACHE'
          });
          try {
            await Share.share({
              title: filename,
              url: written.uri,
              dialogTitle: 'DAW-Export speichern oder teilen'
            });
            return 'shared';
          } catch (shareErr) {
            const msg = String(shareErr?.message || shareErr || '').toLowerCase();
            if (msg.includes('cancel') || msg.includes('abort')) return 'cancelled';
          }
        }

        await Filesystem.writeFile({
          path: `SunshineDAW/${filename}`,
          data: base64Data,
          directory: 'DOCUMENTS',
          recursive: true
        });
        return 'saved-documents';
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return 'downloaded';
    }

    async function exportMidiFile() {
      try {
        const ticksPerBeat = 480;
        const ticksPer16th = ticksPerBeat / 4;
        const events = [];
        const microSecPerBeat = Math.round(60000000 / dawState.bpm);
        events.push({
          tick: 0,
          bytes: [0xFF, 0x51, 0x03, (microSecPerBeat >> 16) & 0xFF, (microSecPerBeat >> 8) & 0xFF, microSecPerBeat & 0xFF]
        });

        dawState.midiNotes.forEach(n => {
          const startTick = n.start * ticksPer16th;
          const endTick = (n.start + n.dur) * ticksPer16th;
          const vel = Math.max(1, Math.min(127, dawState.stepVelocities[n.start] || n.vel || 105));
          events.push({ tick: startTick, bytes: [0x90, n.pitch & 0x7F, vel] });
          events.push({ tick: endTick,   bytes: [0x80, n.pitch & 0x7F, 0x00] });
        });

        events.sort((a, b) => a.tick - b.tick);

        function writeVarLen(val) {
          let buffer = val & 0x7F;
          const out = [];
          while ((val >>= 7)) {
            buffer <<= 8;
            buffer |= ((val & 0x7F) | 0x80);
          }
          while (true) {
            out.push(buffer & 0xFF);
            if (buffer & 0x80) buffer >>= 8;
            else break;
          }
          return out;
        }

        const trackBytes = [];
        let lastTick = 0;
        events.forEach(ev => {
          const delta = Math.max(0, ev.tick - lastTick);
          lastTick = ev.tick;
          trackBytes.push(...writeVarLen(delta), ...ev.bytes);
        });
        trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

        const header = [
          0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01,
          (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
        ];
        const trkLen = trackBytes.length;
        const trkHeader = [
          0x4D, 0x54, 0x72, 0x6B,
          (trkLen >> 24) & 0xFF, (trkLen >> 16) & 0xFF, (trkLen >> 8) & 0xFF, trkLen & 0xFF
        ];

        const fullFile = new Uint8Array([...header, ...trkHeader, ...trackBytes]);
        const blob = new Blob([fullFile], { type: 'audio/midi' });
        const filename = `Sunshine-R_Stem_DAW_MIDI_${dawState.bpm}BPM.mid`;
        const status = await saveOrShareBlob(blob, filename);

        if (status === 'saved-documents') {
          toast(`MIDI gespeichert unter Dokumente/SunshineDAW/${filename}`, 'success');
        } else if (status !== 'cancelled') {
          toast('Standard MIDI Datei (.mid) exportiert!', 'success');
        }
      } catch (err) {
        console.error(err);
        toast('Fehler beim MIDI-Export.', 'error');
      }
    }

    function importMidiArrayBuffer(arrayBuffer) {
      const view = new DataView(arrayBuffer);
      if (view.byteLength < 14) throw new Error('Ungültige MIDI-Datei');

      const ticksPerBeat = view.getUint16(12, false) || 480;
      const ticksPer16th = ticksPerBeat / 4;

      let pos = 14;
      const parsedNotes = [];
      const activeOns = {};
      let idGen = Date.now();

      while (pos + 8 <= view.byteLength) {
        const chunkType = String.fromCharCode(
          view.getUint8(pos), view.getUint8(pos + 1), view.getUint8(pos + 2), view.getUint8(pos + 3)
        );
        const chunkLen = view.getUint32(pos + 4, false);
        pos += 8;

        if (chunkType === 'MTrk') {
          const endPos = Math.min(view.byteLength, pos + chunkLen);
          let absTick = 0;
          let runningStatus = 0;

          while (pos < endPos) {
            // Read VLQ delta
            let delta = 0;
            while (pos < endPos) {
              const b = view.getUint8(pos++);
              delta = (delta << 7) | (b & 0x7F);
              if (!(b & 0x80)) break;
            }
            absTick += delta;
            if (pos >= endPos) break;

            let status = view.getUint8(pos);
            if (status < 0x80) {
              status = runningStatus;
            } else {
              pos++;
              if (status < 0xF0) runningStatus = status;
            }

            const cmd = status & 0xF0;
            if (cmd === 0x90 || cmd === 0x80) {
              const note = view.getUint8(pos++);
              const vel = view.getUint8(pos++);
              if (cmd === 0x90 && vel > 0) {
                activeOns[note] = { startTick: absTick, vel };
              } else if (activeOns[note]) {
                const info = activeOns[note];
                delete activeOns[note];
                const startStep = Math.round(info.startTick / ticksPer16th) % 32;
                const durSteps = Math.max(1, Math.min(16, Math.round((absTick - info.startTick) / ticksPer16th)));
                let pitch = note;
                while (pitch < 36) pitch += 12;
                while (pitch > 71) pitch -= 12;
                parsedNotes.push({ id: idGen++, pitch, start: startStep, dur: durSteps, vel: info.vel });
              }
            } else if (cmd === 0xA0 || cmd === 0xB0 || cmd === 0xE0) {
              pos += 2;
            } else if (cmd === 0xC0 || cmd === 0xD0) {
              pos += 1;
            } else if (status === 0xFF) {
              const metaType = view.getUint8(pos++);
              let metaLen = 0;
              while (pos < endPos) {
                const b = view.getUint8(pos++);
                metaLen = (metaLen << 7) | (b & 0x7F);
                if (!(b & 0x80)) break;
              }
              if (metaType === 0x51 && metaLen === 3 && pos + 3 <= endPos) {
                const us = (view.getUint8(pos) << 16) | (view.getUint8(pos + 1) << 8) | view.getUint8(pos + 2);
                if (us > 0) {
                  dawState.bpm = Math.max(60, Math.min(180, Math.round(60000000 / us)));
                  document.getElementById('input-bpm').value = dawState.bpm;
                }
              }
              pos += metaLen;
            } else if (status === 0xF0 || status === 0xF7) {
              let sysLen = 0;
              while (pos < endPos) {
                const b = view.getUint8(pos++);
                sysLen = (sysLen << 7) | (b & 0x7F);
                if (!(b & 0x80)) break;
              }
              pos += sysLen;
            }
          }
          pos = endPos;
        } else {
          pos += chunkLen;
        }
      }

      if (parsedNotes.length > 0) {
        dawState.midiNotes = parsedNotes;
        switchBottomTab('midi');
        drawPianoRoll();
        drawVelocityLane();
        renderMultiTrackLanes();
        toast(`${parsedNotes.length} MIDI-Noten aus .mid importiert!`, 'success');
      } else {
        toast('Keine Noten in der MIDI-Datei gefunden.', 'warn');
      }
    }
