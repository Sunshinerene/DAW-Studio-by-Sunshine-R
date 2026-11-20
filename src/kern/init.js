    /**
     * ============================================================================
     * INITIALIZATION & EVENT BINDINGS
     * ============================================================================
     */
    window.addEventListener('DOMContentLoaded', () => {
      const unlockMobileAudio = () => {
        if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
          audioEngine.ctx.resume().catch(() => {});
        }
      };
      document.addEventListener('touchstart', unlockMobileAudio, { passive: true });
      document.addEventListener('pointerdown', unlockMobileAudio, { passive: true });

      renderArrangementHeaderBar();
      renderMultiTrackLanes();
      renderDrumSequencerGrids();
      renderVerticalMixer();
      updateAudioToMidiDropdown();
      drawPianoRoll();
      drawVelocityLane();
      initPianoRollInteractions();
      requestAnimationFrame(uiAnimationTick);

      // Transport Controls
      document.getElementById('btn-play').addEventListener('click', () => {
        if (dawState.isPlaying) audioEngine.stop(false);
        else audioEngine.play();
      });
      document.getElementById('btn-stop').addEventListener('click', () => audioEngine.stop(true));

      document.getElementById('btn-loop').addEventListener('click', (e) => {
        dawState.isLooping = !dawState.isLooping;
        e.currentTarget.textContent = `Loop: ${dawState.isLooping ? 'AN' : 'AUS'}`;
        if (dawState.isPlaying) audioEngine.seek(dawState.playheadSec);
      });

      document.getElementById('btn-metronome').addEventListener('click', (e) => {
        dawState.metronomeOn = !dawState.metronomeOn;
        e.currentTarget.className = dawState.metronomeOn
          ? 'px-2 py-1.5 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition'
          : 'px-2 py-1.5 rounded-lg bg-daw-surface hover:bg-daw-elevated text-slate-400 border border-daw-border text-[11px] font-semibold transition';
      });

      // Spacebar Play/Pause
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !['INPUT', 'SELECT'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          if (dawState.isPlaying) audioEngine.stop(false);
          else audioEngine.play();
        }
      });

      // BPM & Tap Tempo
      document.getElementById('input-bpm').addEventListener('change', (e) => {
        dawState.bpm = Math.max(60, Math.min(180, parseInt(e.target.value, 10) || 120));
        e.target.value = dawState.bpm;
        renderMultiTrackLanes();
        updateClockLCD();
        if (dawState.isPlaying) audioEngine.seek(dawState.playheadSec);
      });

      let tapTimes = [];
      document.getElementById('btn-tap-tempo').addEventListener('click', () => {
        const now = performance.now();
        tapTimes = tapTimes.filter(t => now - t < 2500);
        tapTimes.push(now);
        if (tapTimes.length >= 2) {
          let diffs = 0;
          for (let i = 1; i < tapTimes.length; i++) diffs += tapTimes[i] - tapTimes[i - 1];
          const avgMs = diffs / (tapTimes.length - 1);
          const tappedBpm = Math.max(60, Math.min(180, Math.round(60000 / avgMs)));
          dawState.bpm = tappedBpm;
          document.getElementById('input-bpm').value = tappedBpm;
          renderAllTrackCanvases();
        }
      });

      // Top File & Quick Action Buttons
      const fileInput = document.getElementById('universal-file-input');
      document.getElementById('btn-import-files').addEventListener('click', () => fileInput.click());
      // Immer den zentralen ZIP-/Audio-/MIDI-Importer verwenden (nicht die alte Demo-Importfunktion).
      fileInput.addEventListener('change', (e) => window.handleUniversalFileImport(e.target.files));

      // Drag & Drop anywhere on Multi-Track area
      const dropWrapper = document.getElementById('drop-zone-wrapper');
      dropWrapper.addEventListener('dragover', (e) => e.preventDefault());
      dropWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) window.handleUniversalFileImport(e.dataTransfer.files);
      });

      document.getElementById('btn-auto-trim').addEventListener('click', autoTrimSilence);
      document.getElementById('btn-export-midi').addEventListener('click', exportMidiFile);
      document.getElementById('btn-export-wav').addEventListener('click', exportMasterWav);

      // Bottom Tab Dock Switching
      document.querySelectorAll('.dock-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const panel = document.getElementById(`tab-panel-${btn.dataset.tab}`);
          const isOpen = panel && !panel.classList.contains('hidden');
          if (isOpen && dawState.activeTab === btn.dataset.tab) {
            panel.classList.add('hidden');
            dawState.dockCollapsed = true;
            btn.setAttribute('aria-expanded', 'false');
          } else {
            dawState.dockCollapsed = false;
            switchBottomTab(btn.dataset.tab);
            document.querySelectorAll('.dock-tab-btn').forEach(b => b.setAttribute('aria-expanded', b === btn ? 'true' : 'false'));
          }
        });
      });

      // Web MIDI Connect
      document.getElementById('btn-connect-webmidi').addEventListener('click', connectWebMidi);

      // Tab 1: MIDI Editor Toolbar Bindings
      document.querySelectorAll('.midi-grid-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          dawState.midiGridStep = parseInt(btn.dataset.grid, 10);
          document.querySelectorAll('.midi-grid-btn').forEach(b => {
            const on = parseInt(b.dataset.grid, 10) === dawState.midiGridStep;
            b.className = on
              ? 'midi-grid-btn px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold'
              : 'midi-grid-btn px-2 py-0.5 rounded text-slate-400 hover:text-white';
          });
        });
      });

      document.querySelectorAll('.midi-trans-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const semi = parseInt(btn.dataset.trans, 10);
          dawState.midiNotes.forEach(n => {
            n.pitch = Math.max(PIANO_MIN_MIDI, Math.min(PIANO_MAX_MIDI, n.pitch + semi));
          });
          syncActiveMidiTrackFromState();
          drawPianoRoll();
          renderMultiTrackLanes();
        });
      });

      document.getElementById('select-midi-root').addEventListener('change', (e) => {
        dawState.midiRoot = parseInt(e.target.value, 10);
        drawPianoRoll();
      });

      document.getElementById('select-midi-scale').addEventListener('change', (e) => {
        dawState.midiScale = e.target.value;
        drawPianoRoll();
      });

      document.getElementById('btn-midi-quantize').addEventListener('click', () => {
        dawState.midiNotes.forEach(n => {
          n.pitch = quantizeMidiNoteToScale(n.pitch, dawState.midiRoot, dawState.midiScale);
        });
        syncActiveMidiTrackFromState();
        drawPianoRoll();
        renderMultiTrackLanes();
        toast('Alle MIDI-Noten auf gewählte Tonleiter quantisiert!', 'success');
      });

      document.getElementById('btn-apply-arp').addEventListener('click', () => {
        const val = document.getElementById('select-midi-arp').value;
        if (val) applyArpGenerator(val);
      });

      document.getElementById('btn-clear-midi').addEventListener('click', () => {
        dawState.midiNotes = [];
        syncActiveMidiTrackFromState();
        drawPianoRoll();
        drawVelocityLane();
        renderMultiTrackLanes();
      });

      document.getElementById('btn-extract-midi').addEventListener('click', () => {
        const src = document.getElementById('select-a2m-source').value;
        extractMidiFromStem(src);
      });

      document.getElementById('btn-midi-rec-arm').addEventListener('click', (e) => {
        dawState.midiRecArmed = !dawState.midiRecArmed;
        e.currentTarget.className = dawState.midiRecArmed
          ? 'px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-mono font-bold animate-pulse'
          : 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold';
      });

      // MIDI Synth Engine Sliders
      document.getElementById('select-synth-preset').addEventListener('change', (e) => {
        dawState.synthPreset = e.target.value;
      });
      document.getElementById('sl-m-cutoff').addEventListener('input', (e) => {
        dawState.synthCutoff = parseInt(e.target.value, 10);
        document.getElementById('lbl-m-cutoff').textContent = `${dawState.synthCutoff} Hz`;
      });
      document.getElementById('sl-m-res').addEventListener('input', (e) => {
        dawState.synthRes = parseFloat(e.target.value);
        document.getElementById('lbl-m-res').textContent = dawState.synthRes.toFixed(1);
      });
      document.getElementById('sl-m-detune').addEventListener('input', (e) => {
        dawState.synthDetune = parseInt(e.target.value, 10);
        document.getElementById('lbl-m-detune').textContent = `${dawState.synthDetune} ct`;
      });
      document.getElementById('sl-m-att').addEventListener('input', (e) => {
        dawState.synthAttackMs = parseInt(e.target.value, 10);
        document.getElementById('lbl-m-att').textContent = `${dawState.synthAttackMs} ms`;
      });
      document.getElementById('sl-m-rel').addEventListener('input', (e) => {
        dawState.synthReleaseMs = parseInt(e.target.value, 10);
        document.getElementById('lbl-m-rel').textContent = `${dawState.synthReleaseMs} ms`;
      });
      document.getElementById('sl-m-sc').addEventListener('input', (e) => {
        dawState.synthScAmount = parseInt(e.target.value, 10);
        document.getElementById('lbl-m-sc').textContent = `${dawState.synthScAmount}%`;
      });

      // Tab 2: Drum-, 808- & FX-Sequencer Controls
      document.querySelectorAll('.drum-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.drumpreset;
          if (p === 'techno44') {
            dawState.seqKick = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
            dawState.seqBass = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];
            dawState.seqHat  = [0,0,1,0, 1,0,1,0, 0,0,1,0, 1,0,1,0];
            dawState.bassMode = 'rolling';
          } else if (p === 'hardtrance') {
            dawState.seqKick = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0];
            dawState.seqBass = [0,1,1,1, 0,1,1,1, 0,1,1,1, 0,1,1,1];
            dawState.seqHat  = [0,0,1,0, 1,0,1,0, 0,0,1,0, 1,0,1,1];
            dawState.bassMode = 'rolling';
          } else if (p === 'boombap') {
            dawState.seqKick = [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0];
            dawState.seqBass = [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0];
            dawState.seqHat  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
            dawState.bassMode = '808';
          } else if (p === 'trap808') {
            dawState.seqKick = [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,0,0];
            dawState.seqBass = [1,0,0,1, 0,0,1,0, 0,0,1,0, 0,1,0,1];
            dawState.seqHat  = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];
            dawState.bassMode = '808';
          } else {
            dawState.seqKick.fill(0); dawState.seqBass.fill(0); dawState.seqHat.fill(0); dawState.seqFx.fill(0);
          }
          renderDrumSequencerGrids();
          renderAllTrackCanvases();
        });
      });

      document.getElementById('sl-k-tune').addEventListener('input', (e) => {
        dawState.kickTuneHz = parseInt(e.target.value, 10);
        document.getElementById('lbl-k-tune').textContent = `${dawState.kickTuneHz} Hz`;
      });
      document.getElementById('sl-k-punch').addEventListener('input', (e) => {
        dawState.kickPunch = parseInt(e.target.value, 10);
        document.getElementById('lbl-k-punch').textContent = `${dawState.kickPunch}%`;
      });
      document.getElementById('sl-k-decay').addEventListener('input', (e) => {
        dawState.kickDecayMs = parseInt(e.target.value, 10);
        document.getElementById('lbl-k-decay').textContent = `${dawState.kickDecayMs}ms`;
      });

      document.getElementById('btn-b-mode-rolling').addEventListener('click', () => {
        dawState.bassMode = 'rolling';
        document.getElementById('btn-b-mode-rolling').className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40';
        document.getElementById('btn-b-mode-808').className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-daw-surface text-slate-400 border border-daw-border';
      });
      document.getElementById('btn-b-mode-808').addEventListener('click', () => {
        dawState.bassMode = '808';
        document.getElementById('btn-b-mode-808').className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40';
        document.getElementById('btn-b-mode-rolling').className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-daw-surface text-slate-400 border border-daw-border';
      });
      document.getElementById('btn-b-glide').addEventListener('click', (e) => {
        dawState.bassGlide = !dawState.bassGlide;
        e.currentTarget.textContent = `Glide: ${dawState.bassGlide ? 'AN' : 'AUS'}`;
      });
      document.getElementById('sl-b-drive').addEventListener('input', (e) => {
        dawState.bassDrive = parseInt(e.target.value, 10);
        document.getElementById('lbl-b-drive').textContent = `${dawState.bassDrive}%`;
      });
      document.getElementById('sl-sc-depth').addEventListener('input', (e) => {
        dawState.scDepth = parseInt(e.target.value, 10);
        document.getElementById('lbl-sc-depth').textContent = `${dawState.scDepth}%`;
      });

      // Manual FX Trigger Buttons
      const getFxDest = () => {
        const fxTr = dawState.tracks.find(t => t.type === 'fx');
        return (fxTr && audioEngine.channelNodes[fxTr.id]?.input) || audioEngine.masterGain;
      };
      document.getElementById('btn-trig-riser').addEventListener('click', async () => {
        await audioEngine.ensureCtx();
        synthNoiseRiser(audioEngine.ctx, getFxDest(), audioEngine.noiseBuffer, audioEngine.ctx.currentTime, 2.2);
      });
      document.getElementById('btn-trig-impact').addEventListener('click', async () => {
        await audioEngine.ensureCtx();
        synthSubImpact(audioEngine.ctx, getFxDest(), audioEngine.noiseBuffer, audioEngine.ctx.currentTime);
      });
      document.getElementById('btn-trig-revcrash').addEventListener('click', async () => {
        await audioEngine.ensureCtx();
        synthReverseCrash(audioEngine.ctx, getFxDest(), audioEngine.noiseBuffer, audioEngine.ctx.currentTime, 0.9);
      });
      document.getElementById('btn-auto-drop-fx').addEventListener('click', (e) => {
        dawState.autoDropFx = !dawState.autoDropFx;
        e.currentTarget.textContent = `Auto-Drop FX: ${dawState.autoDropFx ? 'AN' : 'AUS'}`;
      });

      // Tab 3: Vocal-Cleanup & Mic Controls
      document.getElementById('btn-v-bypass').addEventListener('click', (e) => {
        dawState.vocalRackActive = !dawState.vocalRackActive;
        e.currentTarget.textContent = `Rack: ${dawState.vocalRackActive ? 'AKTIV' : 'BYPASS'}`;
        audioEngine.syncAudioParams();
      });
      document.getElementById('sl-v-hpf').addEventListener('input', (e) => {
        dawState.vocalHpfHz = parseInt(e.target.value, 10);
        document.getElementById('lbl-v-hpf').textContent = `${dawState.vocalHpfHz} Hz`;
        audioEngine.syncAudioParams();
      });
      document.getElementById('sl-v-deharsh').addEventListener('input', (e) => {
        dawState.vocalDeHarshDb = parseFloat(e.target.value);
        document.getElementById('lbl-v-deharsh').textContent = `-${dawState.vocalDeHarshDb.toFixed(1)} dB`;
        audioEngine.syncAudioParams();
      });
      document.getElementById('sl-v-pres').addEventListener('input', (e) => {
        dawState.vocalPresenceDb = parseFloat(e.target.value);
        document.getElementById('lbl-v-pres').textContent = `+${dawState.vocalPresenceDb.toFixed(1)} dB`;
        audioEngine.syncAudioParams();
      });
      document.getElementById('sl-v-deess').addEventListener('input', (e) => {
        dawState.vocalDeEssDb = parseFloat(e.target.value);
        document.getElementById('lbl-v-deess').textContent = `-${dawState.vocalDeEssDb.toFixed(1)} dB`;
        audioEngine.syncAudioParams();
      });
      document.getElementById('sl-v-comp').addEventListener('input', (e) => {
        dawState.vocalCompRatio = parseFloat(e.target.value);
        document.getElementById('lbl-v-comp').textContent = `${dawState.vocalCompRatio.toFixed(1)} : 1`;
        audioEngine.syncAudioParams();
      });
      document.getElementById('sl-v-rev').addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10);
        dawState.vocalReverbWet = pct / 100;
        document.getElementById('lbl-v-rev').textContent = `${pct}%`;
        audioEngine.syncAudioParams();
      });

      document.getElementById('btn-mic-toggle').addEventListener('click', () => audioEngine.toggleMicRecording());
      document.getElementById('btn-mic-countin').addEventListener('click', (e) => {
        dawState.micCountIn = !dawState.micCountIn;
        e.currentTarget.textContent = `Vorzähler: ${dawState.micCountIn ? 'AN' : 'AUS'}`;
      });
      document.getElementById('btn-mic-delete').addEventListener('click', () => {
        const micTr = dawState.tracks.find(t => t.id === dawState.recordingMicTrackId) || dawState.tracks.find(t => t.type === 'mic');
        if (micTr && dawState.buffers[micTr.id]) {
          delete dawState.buffers[micTr.id];
          renderMultiTrackLanes();
          toast(`Mic-Take auf „${micTr.name}“ gelöscht.`, 'info');
        } else {
          toast('Kein Mic-Take vorhanden.', 'info');
        }
      });

      // Tab 4: Master Volume Fader
      document.getElementById('sl-master-vol').addEventListener('input', (e) => {
        dawState.masterGainVal = parseFloat(e.target.value);
        const db = dawState.masterGainVal <= 0.001 ? '-∞' : (20 * Math.log10(dawState.masterGainVal)).toFixed(1);
        document.getElementById('lbl-master-vol').textContent = `${db} dB`;
        audioEngine.syncAudioParams();
      });

      // Responsive Canvas Redraw on Window Resize
      window.addEventListener('resize', () => {
        renderAllTrackCanvases();
        if (dawState.activeTab === 'midi') {
          drawPianoRoll();
          drawVelocityLane();
        }
      });
    });
  