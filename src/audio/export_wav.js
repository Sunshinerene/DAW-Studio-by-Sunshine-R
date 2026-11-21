    /**
     * ============================================================================
     * MASTER WAV EXPORT (OFFLINE RENDERING OF FULL ARRANGEMENT, MIDI & DSP)
     * ============================================================================
     */
    window.__exportMix = (o) => exportMasterWav(o);
    async function exportMasterWav(opts) {
      if (!opts || opts.type) opts = {};
      const stubEl = () => ({ classList: { add() {}, remove() {} }, textContent: '' });
      const btn = opts.returnBuffer ? stubEl() : document.getElementById('btn-export-wav');
      const lbl = opts.returnBuffer ? stubEl() : document.getElementById('lbl-export-wav');
      btn.classList.add('opacity-70', 'pointer-events-none');
      lbl.textContent = 'Rendere WAV...';

      try {
        const sr = 44100;
        const totalBars = audioEngine.getTotalArrangementBars();
        const secPer16th = (60 / dawState.bpm) / 4;
        const fullSec = totalBars * 16 * secPer16th;
        const totalSec = opts.endSec ? Math.min(fullSec, Math.max(0.5, opts.endSec)) : fullSec;
        const totalSamples = Math.ceil(totalSec * sr);

        const offCtx = new OfflineAudioContext(2, totalSamples, sr);
        const masterGain = offCtx.createGain();
        masterGain.gain.value = opts.dry ? 1 : dawState.masterGainVal * Math.pow(10, (dawState.masterTrimDb || 0) / 20);

        const limiter = offCtx.createDynamicsCompressor();
        limiter.threshold.value = dawState.limiterDb == null ? -1.0 : dawState.limiterDb;
        limiter.ratio.value = 16;
        limiter.attack.value = 0.0015;
        limiter.release.value = 0.07;

        if (opts.dry) masterGain.connect(offCtx.destination); else { masterGain.connect(limiter); limiter.connect(offCtx.destination); }

        const revConv = offCtx.createConvolver();
        revConv.buffer = createStereoImpulse(offCtx, 1.7, 2.5);
        const revRet = offCtx.createGain();
        revRet.gain.value = dawState.vocalRackActive ? dawState.vocalReverbWet : 0;
        revConv.connect(revRet);
        revRet.connect(masterGain);

        const noiseBuf = createWhiteNoiseBuffer(offCtx, 4.0);
        const anySolo = dawState.tracks.some(t => t.solo);
        const offNodes = {};

        dawState.tracks.forEach(tr => {
          const audible = (anySolo ? tr.solo : !tr.mute) && (!opts.onlyIds || opts.onlyIds.indexOf(tr.id) >= 0);
          const input = offCtx.createGain();
          const vcOn = dawState.vocalRackActive && (tr.vocalCleanup || tr.type === 'mic');
          const lowCut = offCtx.createBiquadFilter();
          lowCut.type = 'highpass';
          lowCut.frequency.value = (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic')
            ? (vcOn && tr.lowCut ? dawState.vocalHpfHz : (tr.lowCut ? dawState.lowCutFreq : 10))
            : (tr.lowCut ? dawState.lowCutFreq : 10);

          let tail = lowCut;
          if ((tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') && vcOn) {
            const deHarsh = offCtx.createBiquadFilter();
            deHarsh.type = 'peaking'; deHarsh.frequency.value = 4800; deHarsh.Q.value = 1.9; deHarsh.gain.value = -dawState.vocalDeHarshDb;
            const pres = offCtx.createBiquadFilter();
            pres.type = 'peaking'; pres.frequency.value = 3500; pres.Q.value = 1.4; pres.gain.value = dawState.vocalPresenceDb;
            const deEss = offCtx.createBiquadFilter();
            deEss.type = 'highshelf'; deEss.frequency.value = 8500; deEss.gain.value = -dawState.vocalDeEssDb;
            const comp = offCtx.createDynamicsCompressor();
            comp.threshold.value = -19; comp.ratio.value = dawState.vocalCompRatio;
            lowCut.connect(deHarsh); deHarsh.connect(pres); pres.connect(deEss); deEss.connect(comp);
            tail = comp;
          }

          const scGain = offCtx.createGain();
          const secGate = offCtx.createGain();
          const panner = offCtx.createStereoPanner();
          panner.pan.value = tr.pan;
          const fader = offCtx.createGain();
          fader.gain.value = audible ? tr.vol : 0;

          input.connect(lowCut);
          // Spur-FX (FX-Rack) auch im Export berücksichtigen
          (tr.fx || []).forEach(effect => {
            if (!effect.enabled) return;
            let built = null;
            try { built = buildTrackEffect(offCtx, effect, revConv); } catch (err) { console.warn('[Export-FX]', effect.type, err); }
            if (!built) return;
            tail.connect(built.input || built.node);
            tail = built.output || built.node;
          });
          tail.connect(scGain);
          scGain.connect(secGate);
          secGate.connect(panner);
          panner.connect(fader);
          const autoGain = offCtx.createGain(); fader.connect(autoGain); autoGain.connect(masterGain);
          const panAuto = offCtx.createConstantSource(); panAuto.offset.value = 0; panAuto.connect(panner.pan); panAuto.start();
          const filtAuto = offCtx.createConstantSource(); filtAuto.offset.value = 0; filtAuto.connect(lowCut.frequency); filtAuto.start();
          if ((tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') && vcOn) autoGain.connect(revConv);

          offNodes[tr.id] = { input, scGain, secGate, autoGain, panAuto, filtAuto };
          try { AutoModel.scheduleOffline(tr, offNodes[tr.id], totalSec); } catch (aerr) { console.warn('[Export-Automation]', aerr); }
        });

        // Schedule Audio Buffers
        const trimSec = dawState.startOffsetMs / 1000;
        dawState.tracks.forEach(tr => {
          if (Array.isArray(tr.clips) && offNodes[tr.id]) { ClipModel.scheduleOffline(offCtx, tr, offNodes[tr.id].input, totalSec); return; }
          const buf = dawState.buffers[tr.id];
          if (!buf) return;
          if (buf.__parked) { if (window.Saver && Saver.needed().indexOf(String(tr.id)) >= 0) buf._need(); return; }   /* entladen (Speicher-Sparer): nur wenn hörbar ist es ein Fehler */
          const usable = Math.max(0.2, buf.duration - trimSec);
          const fillLoop = usable < totalSec - 4 * (60 / dawState.bpm); // nur deutlich kürzere Spuren wiederholen
          let cursor = 0;
          while (cursor < totalSec) {
            const src = offCtx.createBufferSource();
            src.buffer = buf;
            src.connect(offNodes[tr.id].input);
            src.start(cursor, trimSec, Math.min(usable, totalSec - cursor));
            cursor += usable;
            if (!fillLoop) break;
          }
        });

        // Schedule all 16th steps across totalBars
        const totalSteps = Math.min(totalBars * 16, Math.ceil(totalSec / secPer16th - 1e-6));
        for (let s = 0; s < totalSteps; s++) {
          const t = s * secPer16th;
          const step32 = s % 32;
          const step16 = s % 16;
          const barIdx = Math.floor(s / 16);
          const { section, barInSection } = audioEngine.getSectionAtBar(barIdx);

          dawState.tracks.forEach(tr => {
            const on = tr.sectionClips[section.id] !== false;
            offNodes[tr.id].secGate.gain.setValueAtTime(on ? 1.0 : 0.0, t);
          });

          let anyKickFired = false;
          dawState.tracks.filter(tr => tr.type === 'kick' || tr.id === 'ownKick').forEach(kickTr => {
            if (kickTr.sectionClips[section.id] === false || kickTr.mute) return;
            if (dawState.seqKick[step16]) {
              anyKickFired = true;
              synthKick(offCtx, offNodes[kickTr.id].input, t, {
                tuneHz: dawState.kickTuneHz, punch: dawState.kickPunch, decayMs: dawState.kickDecayMs
              });
            }
            if (dawState.seqHat[step16]) {
              synthHatClap(offCtx, offNodes[kickTr.id].input, noiseBuf, t, step16);
            }
          });

          if (anyKickFired) {
            const scBass = dawState.scDepth / 100;
            const scMidi = dawState.synthScAmount / 100;
            const relSec = dawState.scReleaseMs / 1000;

            if (scBass > 0.01) {
              const minG = Math.max(0.05, 1 - scBass * 0.92);
              dawState.tracks
                .filter(tr => tr.type === 'bass' || ((tr.type === 'audio' || tr.type === 'stem') && !tr.vocalCleanup))
                .forEach(tr => {
                  const g = offNodes[tr.id]?.scGain;
                  if (!g) return;
                  g.gain.setValueAtTime(1.0, t);
                  g.gain.linearRampToValueAtTime(minG, t + 0.007);
                  g.gain.exponentialRampToValueAtTime(1.0, t + 0.012 + relSec);
                });
            }
            if (scMidi > 0.01) {
              const minG = Math.max(0.05, 1 - scMidi * 0.92);
              dawState.tracks.filter(tr => tr.type === 'midi').forEach(tr => {
                const g = offNodes[tr.id]?.scGain;
                if (!g) return;
                g.gain.setValueAtTime(1.0, t);
                g.gain.linearRampToValueAtTime(minG, t + 0.007);
                g.gain.exponentialRampToValueAtTime(1.0, t + 0.012 + relSec);
              });
            }
          }

          dawState.tracks.filter(tr => tr.type === 'bass' || tr.id === 'ownBass').forEach(bassTr => {
            if (bassTr.sectionClips[section.id] !== false && dawState.seqBass[step16]) {
              synthBass808(offCtx, offNodes[bassTr.id].input, t, {
                rootNote: dawState.midiRoot, pitchOffset: dawState.seqBassPitch[step16] || 0,
                mode: dawState.bassMode, glide: dawState.bassGlide, drive: dawState.bassDrive, stepDur: secPer16th
              });
            }
          });

          dawState.tracks.filter(tr => tr.type === 'midi' || tr.id === 'midiSynth').forEach(midiTr => {
            if (midiTr.sectionClips[section.id] === false) return;
            const notes = midiTr.id === dawState.activeMidiTrackId ? dawState.midiNotes : (midiTr.midiNotes || []);
            const vels = midiTr.id === dawState.activeMidiTrackId ? dawState.stepVelocities : (midiTr.stepVelocities || dawState.stepVelocities);
            notes.filter(n => n.start === step32).forEach(note => {
              const vel = (vels[step32] || note.vel || 105) / 127;
              synthMidiVoice(offCtx, offNodes[midiTr.id].input, t, midiVoiceOpts(midiTr, { midiNote: note.pitch, durationSec: Math.max(0.06, note.dur * secPer16th * 0.95), velocity: vel }));
            });
          });

          dawState.tracks.filter(tr => tr.type === 'fx' || tr.id === 'fxTrack').forEach(fxTr => {
            if (fxTr.sectionClips[section.id] === false) return;
            if (dawState.seqFx[step16]) {
              if (step16 === 0) synthSubImpact(offCtx, offNodes[fxTr.id].input, noiseBuf, t);
              else if (step16 === 8) synthNoiseRiser(offCtx, offNodes[fxTr.id].input, noiseBuf, t, secPer16th * 8);
              else synthReverseCrash(offCtx, offNodes[fxTr.id].input, noiseBuf, t, secPer16th * 4);
            }
            if (dawState.autoDropFx) {
              if (section.id === 'verse' && barInSection === section.bars - 2 && step16 === 0) {
                synthNoiseRiser(offCtx, offNodes[fxTr.id].input, noiseBuf, t, secPer16th * 32);
              }
              if (section.id === 'drop' && barInSection === 0 && step16 === 0) {
                synthSubImpact(offCtx, offNodes[fxTr.id].input, noiseBuf, t);
              }
            }
          });
        }

        if (offCtx.__spessaRec && offCtx.__spessaRec.length) lbl.textContent = 'Rendere SoundFont-Spuren …';
        if (opts.onlyIds && offCtx.__spessaRec) offCtx.__spessaRec = offCtx.__spessaRec.filter(it => opts.onlyIds.indexOf(it.ref.trackId) >= 0);
        try { await SpessaEngine.renderOffline(offCtx); }
        catch (spErr) { console.warn('[SpessaSynth] Export-Vorbereitung fehlgeschlagen:', spErr); }
        lbl.textContent = 'Rendere WAV...';
        const rendered = await offCtx.startRendering();
        if (opts.returnBuffer) return (opts.startSec > 0 || opts.endSec) ? window.__sliceBuf(rendered, opts.startSec || 0, opts.endSec) : rendered;
        let blob = encodeWav16Bit(rendered);
        let filename = `Sunshine-R_Stem_DAW_Pro_${dawState.bpm}BPM.wav`;
        try { if (window.Cover && Cover.hasTags()) { const _m = await Cover.exportMeta(); if (_m) blob = Cover.tagWav(blob, _m); const _fb = Cover.fileBase(); if (_fb) filename = _fb + '.wav'; } } catch (_e) { console.warn('Tags:', _e); }
        const status = await saveOrShareBlob(blob, filename);
        if (status === 'saved-documents') {
          toast(`Master WAV gespeichert unter Dokumente/SunshineDAW/${filename}`, 'success');
        } else if (status !== 'cancelled') {
          toast(`Master WAV (${totalBars} Takte @ ${dawState.bpm} BPM) exportiert!`, 'success');
        }
      } catch (err) {
        console.error(err);
        toast('Fehler beim Master WAV Export.', 'error');
      } finally {
        btn.classList.remove('opacity-70', 'pointer-events-none');
        lbl.textContent = '⬇️ Master WAV';
      }
    }

    function encodeWav16Bit(buffer) {
      const nCh = buffer.numberOfChannels;
      const sr = buffer.sampleRate;
      const len = buffer.length;
      const dataBytes = len * nCh * 2;
      const ab = new ArrayBuffer(44 + dataBytes);
      const v = new DataView(ab);
      const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

      writeStr(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true);
      writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * nCh * 2, true);
      v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true);
      writeStr(36, 'data'); v.setUint32(40, dataBytes, true);

      const c0 = buffer.getChannelData(0);
      const c1 = nCh > 1 ? buffer.getChannelData(1) : c0;
      let pos = 44;
      for (let i = 0; i < len; i++) {
        const s0 = Math.max(-1, Math.min(1, c0[i]));
        const s1 = Math.max(-1, Math.min(1, c1[i]));
        v.setInt16(pos, s0 < 0 ? s0 * 0x8000 : s0 * 0x7FFF, true);
        v.setInt16(pos + 2, s1 < 0 ? s1 * 0x8000 : s1 * 0x7FFF, true);
        pos += 4;
      }
      return new Blob([ab], { type: 'audio/wav' });
    }
