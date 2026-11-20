    /**
     * ============================================================================
     * TAB 1: INTERACTIVE PIANO ROLL & VELOCITY LANE CANVAS
     * ============================================================================
     */
    const PIANO_MIN_MIDI = 36; // C2
    const PIANO_MAX_MIDI = 71; // B4
    const PIANO_KEYS_COUNT = PIANO_MAX_MIDI - PIANO_MIN_MIDI + 1; // 36 rows
    const KEYBOARD_WIDTH = 48;

    let pianoDragState = null;

    function isBlackKey(midi) {
      return [1, 3, 6, 8, 10].includes(midi % 12);
    }

    function isNoteInSelectedScale(midi) {
      const ivs = SCALES[dawState.midiScale] || SCALES.chromatic;
      const pc = ((midi - dawState.midiRoot) % 12 + 12) % 12;
      return ivs.includes(pc);
    }

    function drawPianoRoll() {
      const canvas = document.getElementById('piano-roll-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(300, Math.floor(rect.width));
      const h = 360;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);

      const rowH = h / PIANO_KEYS_COUNT;
      const gridW = w - KEYBOARD_WIDTH;
      const stepW = gridW / 32;

      // 1. Draw Rows (Scale Highlighting + Piano Keyboard on Left)
      for (let i = 0; i < PIANO_KEYS_COUNT; i++) {
        const midi = PIANO_MAX_MIDI - i;
        const y = i * rowH;
        const black = isBlackKey(midi);
        const inScale = isNoteInSelectedScale(midi);

        // Grid Row Background
        if (!inScale && dawState.midiScale !== 'chromatic') {
          ctx.fillStyle = '#07090e';
        } else {
          ctx.fillStyle = black ? '#0d121d' : '#131a29';
        }
        ctx.fillRect(KEYBOARD_WIDTH, y, gridW, rowH);

        // Row Horizontal Border
        ctx.strokeStyle = (midi % 12 === 0) ? 'rgba(56, 189, 248, 0.35)' : 'rgba(40, 51, 74, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(KEYBOARD_WIDTH, y + rowH);
        ctx.lineTo(w, y + rowH);
        ctx.stroke();

        // Piano Key Left
        ctx.fillStyle = black ? '#1e293b' : '#e2e8f0';
        ctx.fillRect(0, y, KEYBOARD_WIDTH - 1, rowH - 0.5);

        if (midi % 12 === 0 || midi === PIANO_MAX_MIDI) {
          const octave = Math.floor(midi / 12) - 1;
          const name = NOTE_NAMES[midi % 12] + octave;
          ctx.fillStyle = black ? '#94a3b8' : '#0f172a';
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillText(name, 4, y + rowH - 2);
        }
      }

      // 2. Vertical Step Columns (32 steps = 2 Bars)
      for (let s = 0; s <= 32; s++) {
        const x = KEYBOARD_WIDTH + s * stepW;
        ctx.strokeStyle = s === 16
          ? 'rgba(56, 189, 248, 0.65)'
          : (s % 4 === 0 ? 'rgba(148, 163, 184, 0.3)' : 'rgba(40, 51, 74, 0.45)');
        ctx.lineWidth = s === 16 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // 3. Draw MIDI Notes
      dawState.midiNotes.forEach(note => {
        if (note.pitch < PIANO_MIN_MIDI || note.pitch > PIANO_MAX_MIDI) return;
        const rowIdx = PIANO_MAX_MIDI - note.pitch;
        const x = KEYBOARD_WIDTH + note.start * stepW + 1;
        const y = rowIdx * rowH + 1;
        const nw = Math.max(6, note.dur * stepW - 2);
        const nh = Math.max(4, rowH - 2);

        const grad = ctx.createLinearGradient(x, y, x, y + nh);
        grad.addColorStop(0, '#c084fc');
        grad.addColorStop(1, '#7e22ce');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, nw, nh, 3);
        ctx.fill();

        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Resize handle indicator on right edge
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x + nw - 3, y + 2, 2, nh - 4);
      });

      // 4. Playhead Indicator on Piano Roll
      const secPer16th = (60 / dawState.bpm) / 4;
      const playStep32 = (dawState.playheadSec / secPer16th) % 32;
      const px = KEYBOARD_WIDTH + playStep32 * stepW;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      ctx.restore();
      document.getElementById('midi-note-count').textContent = `${dawState.midiNotes.length} Noten`;
    }

    function drawVelocityLane() {
      const canvas = document.getElementById('velocity-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(36, Math.floor(rect.height));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#090c12';
      ctx.fillRect(0, 0, w, h);

      const gridW = w - KEYBOARD_WIDTH;
      const stepW = gridW / 32;

      for (let s = 0; s < 32; s++) {
        const x = KEYBOARD_WIDTH + s * stepW;
        const vel = dawState.stepVelocities[s] || 105;
        const hasNote = dawState.midiNotes.some(n => n.start === s);
        const barH = (vel / 127) * (h - 6);

        ctx.fillStyle = hasNote ? '#a855f7' : 'rgba(100, 116, 139, 0.25)';
        ctx.fillRect(x + 2, h - barH - 2, Math.max(3, stepW - 4), barH);
      }
      ctx.restore();
    }

    function initPianoRollInteractions() {
      const canvas = document.getElementById('piano-roll-canvas');
      const velCanvas = document.getElementById('velocity-canvas');

      function getPointerXY(el, e) {
        const rect = el.getBoundingClientRect();
        const pt = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
        return {
          rect,
          x: pt.clientX - rect.left,
          y: pt.clientY - rect.top,
          isTouch: Boolean(e.touches || e.changedTouches)
        };
      }

      canvas.addEventListener('contextmenu', e => e.preventDefault());

      async function handlePianoDown(e) {
        if (e.cancelable) e.preventDefault();
        const { rect, x, y, isTouch } = getPointerXY(canvas, e);
        const rowH = 360 / PIANO_KEYS_COUNT;
        const rowIdx = Math.max(0, Math.min(PIANO_KEYS_COUNT - 1, Math.floor(y / rowH)));
        const pitch = PIANO_MAX_MIDI - rowIdx;

        if (x < KEYBOARD_WIDTH) {
          await audioEngine.ensureCtx();
          auditionMidiNote(pitch, 0.35, 0.85);
          return;
        }

        const gridW = rect.width - KEYBOARD_WIDTH;
        const stepW = gridW / 32;
        const rawStep = Math.floor((x - KEYBOARD_WIDTH) / stepW);
        const step = Math.max(0, Math.min(31, rawStep));

        const hitNoteIdx = dawState.midiNotes.findIndex(
          n => n.pitch === pitch && step >= n.start && step < n.start + n.dur
        );

        if (hitNoteIdx !== -1) {
          const hitNote = dawState.midiNotes[hitNoteIdx];
          const noteRightPx = KEYBOARD_WIDTH + (hitNote.start + hitNote.dur) * stepW;
          const edgeHitZone = isTouch ? 14 : 8;

          if (e.button === 2 || (noteRightPx - x) > edgeHitZone) {
            dawState.midiNotes.splice(hitNoteIdx, 1);
            drawPianoRoll();
            drawVelocityLane();
            renderMultiTrackLanes();
          } else {
            pianoDragState = { mode: 'resize', note: hitNote };
          }
          return;
        }

        if (e.button === 2) return;

        const finalPitch = quantizeMidiNoteToScale(pitch, dawState.midiRoot, dawState.midiScale);
        const snapStep = Math.floor(step / dawState.midiGridStep) * dawState.midiGridStep;
        const newNote = {
          id: Date.now() + Math.random(),
          pitch: finalPitch,
          start: snapStep,
          dur: dawState.midiGridStep,
          vel: dawState.stepVelocities[snapStep] || 108
        };
        dawState.midiNotes.push(newNote);
        pianoDragState = { mode: 'resize', note: newNote };

        await audioEngine.ensureCtx();
        auditionMidiNote(finalPitch, 0.22, 0.85);

        drawPianoRoll();
        drawVelocityLane();
        renderMultiTrackLanes();
      }

      function handlePianoMove(e) {
        if (!pianoDragState) return;
        if (e.cancelable) e.preventDefault();
        const { rect, x } = getPointerXY(canvas, e);
        const gridW = rect.width - KEYBOARD_WIDTH;
        const stepW = gridW / 32;
        const hoverStep = Math.max(0, Math.min(32, Math.ceil((x - KEYBOARD_WIDTH) / stepW)));

        if (pianoDragState.mode === 'resize') {
          const newDur = Math.max(1, Math.min(32 - pianoDragState.note.start, hoverStep - pianoDragState.note.start));
          pianoDragState.note.dur = newDur;
          drawPianoRoll();
          renderMultiTrackLanes();
        }
      }

      canvas.addEventListener('mousedown', handlePianoDown);
      canvas.addEventListener('touchstart', handlePianoDown, { passive: false });
      window.addEventListener('mousemove', handlePianoMove);
      window.addEventListener('touchmove', handlePianoMove, { passive: false });
      window.addEventListener('mouseup', () => { pianoDragState = null; });
      window.addEventListener('touchend', () => { pianoDragState = null; });
      window.addEventListener('touchcancel', () => { pianoDragState = null; });

      let velDragging = false;
      function updateVelAtPointer(e) {
        if (e.cancelable) e.preventDefault();
        const { rect, x, y } = getPointerXY(velCanvas, e);
        if (x < KEYBOARD_WIDTH) return;
        const stepW = (rect.width - KEYBOARD_WIDTH) / 32;
        const step = Math.max(0, Math.min(31, Math.floor((x - KEYBOARD_WIDTH) / stepW)));
        const vel = Math.max(15, Math.min(127, Math.round((1 - y / rect.height) * 127)));
        dawState.stepVelocities[step] = vel;
        dawState.midiNotes.filter(n => n.start === step).forEach(n => n.vel = vel);
        document.getElementById('vel-hover-readout').textContent = `Step ${step + 1} · Vel: ${vel}`;
        drawVelocityLane();
      }

      velCanvas.addEventListener('mousedown', (e) => { velDragging = true; updateVelAtPointer(e); });
      velCanvas.addEventListener('touchstart', (e) => { velDragging = true; updateVelAtPointer(e); }, { passive: false });
      window.addEventListener('mousemove', (e) => { if (velDragging) updateVelAtPointer(e); });
      window.addEventListener('touchmove', (e) => { if (velDragging) updateVelAtPointer(e); }, { passive: false });
      window.addEventListener('mouseup', () => { velDragging = false; });
      window.addEventListener('touchend', () => { velDragging = false; });
    }

    function applyArpGenerator(type) {
      const rootBase = 48 + dawState.midiRoot; // C3..B3
      const scaleIvs = SCALES[dawState.midiScale] || SCALES.minor;
      const notes = [];
      let idGen = Date.now();

      if (type === 'tranceUp') {
        const pattern = [0, 2, 4, 7, 4, 2, 0, 4];
        for (let s = 0; s < 32; s++) {
          const iv = scaleIvs[pattern[s % pattern.length] % scaleIvs.length];
          const oct = s >= 16 ? 12 : 0;
          notes.push({ id: idGen++, pitch: Math.min(71, rootBase + iv + oct), start: s, dur: 1, vel: s % 4 === 0 ? 118 : 96 });
        }
      } else if (type === 'darkDown') {
        const pattern = [7, 4, 3, 2, 0, 3, 2, 0];
        for (let s = 0; s < 32; s += 2) {
          const iv = scaleIvs[pattern[(s / 2) % pattern.length] % scaleIvs.length];
          notes.push({ id: idGen++, pitch: rootBase + iv, start: s, dur: 1, vel: 112 });
        }
      } else if (type === 'tranceGate') {
        const chord = [0, 3, 7, 12];
        const gateSteps = [0, 2, 3, 6, 8, 10, 12, 14, 16, 18, 19, 22, 24, 26, 28, 30];
        gateSteps.forEach(st => {
          chord.forEach(semi => {
            notes.push({ id: idGen++, pitch: Math.min(71, rootBase + semi), start: st, dur: 1, vel: 105 });
          });
        });
      } else if (type === 'offbeatStab') {
        const chord = [0, 3, 7];
        for (let s = 2; s < 32; s += 4) {
          chord.forEach(semi => {
            notes.push({ id: idGen++, pitch: rootBase + semi, start: s, dur: 2, vel: 116 });
          });
        }
      } else if (type === 'rapBells') {
        const seq = [
          { s: 0, iv: 0, d: 3 }, { s: 4, iv: 7, d: 2 }, { s: 7, iv: 8, d: 3 },
          { s: 12, iv: 5, d: 4 }, { s: 16, iv: 0, d: 3 }, { s: 20, iv: 7, d: 2 },
          { s: 23, iv: 10, d: 3 }, { s: 28, iv: 7, d: 4 }
        ];
        seq.forEach(item => {
          notes.push({ id: idGen++, pitch: Math.min(71, rootBase + 12 + item.iv), start: item.s, dur: item.d, vel: 110 });
        });
      }

      dawState.midiNotes = notes;
      syncActiveMidiTrackFromState();
      drawPianoRoll();
      drawVelocityLane();
      renderMultiTrackLanes();
      toast(`MIDI-Pattern „${type}“ generiert!`, 'success');
    }
