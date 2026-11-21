    /**
     * ============================================================================
     * DEMO STEMS GENERATOR & UNIVERSAL FILE IMPORTER (ZIP / AUDIO / MIDI)
     * ============================================================================
     */
    async function generateDemoStems() {
      await audioEngine.ensureCtx();
      document.getElementById('status-subtitle').textContent = 'Generiere 4 Demo-Stems...';

      const sr = 44100;
      const bpm = dawState.bpm;
      const bars = 24;
      const preSilenceSec = 0.18; // 180ms deliberate silence to test Auto-Trim!
      const totalSec = preSilenceSec + bars * 4 * (60 / bpm);
      const len = Math.ceil(totalSec * sr);
      const noiseBuf = createWhiteNoiseBuffer(audioEngine.ctx, 1.0);

      async function renderOfflineStem(fn) {
        const off = new OfflineAudioContext(2, len, sr);
        fn(off, preSilenceSec, bpm, bars);
        return await off.startRendering();
      }

      // 01 Suno Drums
      const drumsBuf = await renderOfflineStem((ctx, off, b, nBars) => {
        const s16 = (60 / b) / 4;
        for (let s = 0; s < nBars * 16; s++) {
          const t = off + s * s16;
          const st = s % 16;
          if (st % 4 === 0) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.setValueAtTime(125, t);
            osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
            g.gain.setValueAtTime(0.55, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(t); osc.stop(t + 0.14);
          }
          if (st % 4 === 2) {
            const src = ctx.createBufferSource(); src.buffer = noiseBuf;
            const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
            src.connect(hp); hp.connect(g); g.connect(ctx.destination);
            src.start(t); src.stop(t + 0.12);
          }
          if (st === 4 || st === 12) {
            const src = ctx.createBufferSource(); src.buffer = noiseBuf;
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1850;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            src.connect(bp); bp.connect(g); g.connect(ctx.destination);
            src.start(t); src.stop(t + 0.16);
          }
        }
      });

      // 02 Suno Bass (Muddy sustained bass)
      const bassBuf = await renderOfflineStem((ctx, off, b, nBars) => {
        const barSec = 4 * (60 / b);
        const notes = [41.2, 41.2, 36.7, 38.9];
        for (let bar = 0; bar < nBars; bar++) {
          const t = off + bar * barSec;
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(notes[bar % 4], t);
          lp.type = 'lowpass'; lp.frequency.value = 240;
          g.gain.setValueAtTime(0.48, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + barSec * 0.98);
          osc.connect(lp); lp.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + barSec);
        }
      });

      // 03 Suno Music (Arp melody + 4.8kHz metallic AI peak)
      const musicBuf = await renderOfflineStem((ctx, off, b, nBars) => {
        const s16 = (60 / b) / 4;
        const seq = [65, 68, 72, 75, 72, 68, 65, 63, 65, 72, 75, 77, 75, 72, 68, 65];
        const peak = ctx.createBiquadFilter();
        peak.type = 'peaking'; peak.frequency.value = 4800; peak.Q.value = 3.0; peak.gain.value = 8.0;
        peak.connect(ctx.destination);

        for (let s = 0; s < nBars * 16; s++) {
          const t = off + s * s16;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(midiToFreq(seq[s % 16]), t);
          g.gain.setValueAtTime(0.24, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + s16 * 0.85);
          osc.connect(g); g.connect(peak);
          osc.start(t); osc.stop(t + s16 * 0.9);
        }
      });

      // 04 Suno Vocals (Rhythmic Rap/Vocal phrase)
      const vocalsBuf = await renderOfflineStem((ctx, off, b, nBars) => {
        const s16 = (60 / b) / 4;
        const steps = [0, 2, 3, 6, 8, 10, 12, 14];
        const formants = [680, 960, 1340, 820, 1120, 1480, 740, 1260];
        for (let bar = 0; bar < nBars; bar++) {
          steps.forEach((st, i) => {
            const t = off + (bar * 16 + st) * s16;
            const osc = ctx.createOscillator();
            const bp = ctx.createBiquadFilter();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(148 + (i % 3) * 16, t);
            bp.type = 'bandpass'; bp.frequency.value = formants[i]; bp.Q.value = 4.0;
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.55, t + 0.014);
            g.gain.exponentialRampToValueAtTime(0.001, t + s16 * 1.25);
            osc.connect(bp); bp.connect(g); g.connect(ctx.destination);
            osc.start(t); osc.stop(t + s16 * 1.3);
          });
        }
      });

      dawState.buffers.drums = drumsBuf;
      dawState.buffers.bass = bassBuf;
      dawState.buffers.music = musicBuf;
      dawState.buffers.vocals = vocalsBuf;

      dawState.startOffsetMs = 0;
      document.getElementById('lbl-trim-offset').textContent = '0 ms';
      document.getElementById('status-subtitle').textContent = `Demo-Stems aktiv (${bpm} BPM)`;

      renderMultiTrackLanes();
      toast('Demo-Stems geladen! Klicke „✂️ Auto-Trim“ um die 180 ms Vorlauf-Stille abzuschneiden.', 'success');
    }

    async function handleUniversalFileImport(fileList) {
      if (!fileList || fileList.length === 0) return;
      await audioEngine.ensureCtx();

      const files = Array.from(fileList);
      const audioItems = [];

      for (const file of files) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
          const buf = await file.arrayBuffer();
          importMidiArrayBuffer(buf);
        } else if (lower.endsWith('.zip')) {
          try {
            const JSZip = await SunLazy.zip(), zip = await JSZip.loadAsync(file);
            const tasks = [];
            zip.forEach((relPath, entry) => {
              if (entry.dir) return;
              const base = relPath.split('/').pop();
              if (base.startsWith('.') || relPath.includes('__MACOSX')) return;
              if (/\.(wav|mp3|ogg|flac|m4a)$/i.test(base)) {
                tasks.push(entry.async('arraybuffer').then(b => ({ name: base, buffer: b })));
              } else if (/\.(mid|midi)$/i.test(base)) {
                entry.async('arraybuffer').then(b => importMidiArrayBuffer(b));
              }
            });
            const extracted = await Promise.all(tasks);
            audioItems.push(...extracted);
          } catch (err) {
            console.error(err);
            toast(`Fehler beim Entpacken von ${file.name}`, 'error');
          }
        } else if (/\.(wav|mp3|ogg|flac|m4a)$/i.test(lower)) {
          const buf = await file.arrayBuffer();
          audioItems.push({ name: file.name, buffer: buf });
        }
      }

      if (audioItems.length === 0) return;

      // Reset dynamic extra stem tracks before assigning new batch
      dawState.tracks = dawState.tracks.filter(t => !t.isExtraStem);
      const primarySlots = ['drums', 'bass', 'music', 'vocals'];
      const usedPrimary = new Set();
      let extraCounter = 0;

      for (const item of audioItems) {
        try {
          const decoded = await (window.__projectIO && window.__projectIO.decodeKeep ? window.__projectIO.decodeKeep(item.buffer, item.name) : audioEngine.ctx.decodeAudioData(item.buffer.slice(0)));
          const lower = item.name.toLowerCase();
          let slot = null;

          if (/drum|perc|beat|kick|hat|snare/.test(lower) && !usedPrimary.has('drums')) slot = 'drums';
          else if (/bass|sub|808|low/.test(lower) && !usedPrimary.has('bass')) slot = 'bass';
          else if (/vocal|vox|voice|rap|sing|acapella/.test(lower) && !usedPrimary.has('vocals')) slot = 'vocals';
          else if (/music|inst|synth|melod|pad|chord|other/.test(lower) && !usedPrimary.has('music')) slot = 'music';
          else slot = primarySlots.find(s => !usedPrimary.has(s)) || null;

          if (slot) {
            usedPrimary.add(slot);
            dawState.buffers[slot] = decoded; { const _t = dawState.tracks.find(t => t.id === slot); if (_t) delete _t.clips; }
          } else {
            // Create dynamic individual track row (04b, 04c, ...) right after 04 | Suno Vocals!
            extraCounter++;
            const suffix = String.fromCharCode(97 + extraCounter); // b, c, d...
            const extraId = `extraStem_${extraCounter}`;
            const cleanName = item.name.replace(/\.[^/.]+$/, '').slice(0, 22);

            const extraTrack = {
              id: extraId,
              num: `04${suffix}`,
              name: `Suno ${cleanName}`,
              type: 'stem',
              isExtraStem: true,
              color: '#34d399',
              vol: 0.90,
              pan: 0,
              mute: false,
              solo: false,
              lowCut: true,
              badge: 'Extra Stem',
              editTab: 'midi',
              sectionClips: { intro: true, verse: true, drop: true, break: true, outro: true }
            };

            const vocalIdx = dawState.tracks.findIndex(t => t.id === 'vocals');
            dawState.tracks.splice(vocalIdx + extraCounter, 0, extraTrack);
            dawState.buffers[extraId] = decoded;
            audioEngine.ensureTrackNode(extraTrack);
          }
        } catch (err) {
          console.error('Decode failed:', item.name, err);
        }
      }

      updateAudioToMidiDropdown();
      renderMultiTrackLanes();
      renderVerticalMixer();
      document.getElementById('status-subtitle').textContent = `${audioItems.length} Audio-Stems geladen`;
      toast(`${audioItems.length} Stems geladen! Alle Spuren sind einzeln sichtbar.`, 'success');
    }

    function autoTrimSilence() {
      const stemTracks = dawState.tracks.filter(t => t.type === 'stem');
      let minSample = Infinity;
      let sr = 44100;

      stemTracks.forEach(tr => {
        const buf = dawState.buffers[tr.id];
        if (!buf) return;
        sr = buf.sampleRate;
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) {
          if (Math.abs(ch[i]) > 0.015) {
            if (i < minSample) minSample = i;
            break;
          }
        }
      });

      if (minSample === Infinity) {
        toast('Bitte zuerst Demo-Stems oder eigene Stems laden.', 'warn');
        return;
      }

      dawState.startOffsetMs = Math.round((minSample / sr) * 1000);
      document.getElementById('lbl-trim-offset').textContent = `${dawState.startOffsetMs} ms`;
      renderMultiTrackLanes();
      if (dawState.isPlaying) audioEngine.seek(dawState.playheadSec);
      toast(`Auto-Trim: ${dawState.startOffsetMs} ms Stille entfernt → Takt 1.1.1 eingerastet!`, 'success');
    }
