    /**
     * ============================================================================
     * HARDWARE WEB MIDI API SUPPORT
     * ============================================================================
     */
    async function connectWebMidi() {
      const statusTxt = document.getElementById('webmidi-status-text');
      const dot = document.getElementById('webmidi-dot');

      if (!navigator.requestMIDIAccess) {
        toast('Web MIDI wird von diesem Browser nicht unterstützt (nutze Chrome/Edge).', 'warn');
        return;
      }

      try {
        const midiAccess = await navigator.requestMIDIAccess();
        const inputs = Array.from(midiAccess.inputs.values());

        if (inputs.length === 0) {
          dot.className = 'w-2 h-2 rounded-full bg-amber-400';
          statusTxt.textContent = 'Kein USB-MIDI-Gerät';
          toast('Kein USB-MIDI-Keyboard erkannt. Schließe ein Gerät an und klicke erneut.', 'warn');
          return;
        }

        inputs.forEach(input => {
          input.onmidimessage = async (msg) => {
            const [status, note, velocity] = msg.data;
            const cmd = status & 0xF0;
            if (cmd === 0x90 && velocity > 0) {
              await audioEngine.ensureCtx();
              let clampedNote = note;
              while (clampedNote < 36) clampedNote += 12;
              while (clampedNote > 71) clampedNote -= 12;

              // Live audition
              const activeMidi = getActiveMidiTrack();
              const dest = (activeMidi && audioEngine.channelNodes[activeMidi.id]?.input) || audioEngine.masterGain;
              synthMidiVoice(audioEngine.ctx, dest, audioEngine.ctx.currentTime, midiVoiceOpts(activeMidi, { midiNote: clampedNote, durationSec: 0.35, velocity: velocity / 127 }));

              // Record into Piano Roll if armed
              if (dawState.midiRecArmed && activeMidi) {
                const secPer16th = (60 / dawState.bpm) / 4;
                const step32 = Math.floor(dawState.playheadSec / secPer16th) % 32;
                dawState.midiNotes.push({
                  id: Date.now() + Math.random(),
                  pitch: clampedNote,
                  start: step32,
                  dur: 2,
                  vel: velocity
                });
                dawState.stepVelocities[step32] = velocity;
                syncActiveMidiTrackFromState();
                drawPianoRoll();
                drawVelocityLane();
                renderMultiTrackLanes();
              }
            }
          };
        });

        dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        statusTxt.textContent = `MIDI: ${inputs[0].name.slice(0, 18)}`;
        toast(`USB-MIDI verbunden: ${inputs[0].name}`, 'success');
      } catch (err) {
        console.error(err);
        toast('Web MIDI Zugriff blockiert oder nicht verfügbar.', 'error');
      }
    }
