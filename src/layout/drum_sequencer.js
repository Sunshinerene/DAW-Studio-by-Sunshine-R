    /**
     * ============================================================================
     * TAB 2: DRUM-, 808- & FX-SEQUENCER GRID RENDERER
     * ============================================================================
     */
    function renderDrumSequencerGrids() {
      const kGrid = document.getElementById('grid-seq-kick');
      const bGrid = document.getElementById('grid-seq-bass');
      const hGrid = document.getElementById('grid-seq-hat');
      const fGrid = document.getElementById('grid-seq-fx');

      kGrid.innerHTML = ''; bGrid.innerHTML = ''; hGrid.innerHTML = ''; fGrid.innerHTML = '';

      for (let i = 0; i < 16; i++) {
        const beatMark = i % 4 === 0;

        // Kick Pad
        const kp = document.createElement('button');
        kp.dataset.step = i;
        kp.className = `seq-pad h-8 rounded border text-[10px] font-mono font-bold ${
          dawState.seqKick[i] ? 'on-kick' : (beatMark ? 'bg-daw-surface border-slate-600 text-slate-300' : 'bg-daw-bg border-daw-border text-slate-600')
        }`;
        kp.textContent = i + 1;
        kp.addEventListener('click', () => {
          dawState.seqKick[i] = dawState.seqKick[i] ? 0 : 1;
          renderDrumSequencerGrids();
          renderAllTrackCanvases();
        });
        kGrid.appendChild(kp);

        // Bass / 808 Pad (Left click toggles step, Right click cycles semitone offset +0/+3/+5/+7/+12)
        const bp = document.createElement('button');
        bp.dataset.step = i;
        const pOff = dawState.seqBassPitch[i] || 0;
        bp.className = `seq-pad h-8 rounded border text-[10px] font-mono font-bold ${
          dawState.seqBass[i] ? 'on-bass' : (beatMark ? 'bg-daw-surface border-slate-600 text-slate-300' : 'bg-daw-bg border-daw-border text-slate-600')
        }`;
        bp.textContent = dawState.seqBass[i] ? (pOff > 0 ? `+${pOff}` : '●') : (i + 1);
        bp.addEventListener('click', () => {
          dawState.seqBass[i] = dawState.seqBass[i] ? 0 : 1;
          renderDrumSequencerGrids();
          renderAllTrackCanvases();
        });
        bp.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const offsets = [0, 3, 5, 7, 12];
          const next = offsets[(offsets.indexOf(pOff) + 1) % offsets.length];
          dawState.seqBassPitch[i] = next;
          dawState.seqBass[i] = 1;
          renderDrumSequencerGrids();
        });
        bGrid.appendChild(bp);

        // Hat / Clap Pad
        const hp = document.createElement('button');
        hp.dataset.step = i;
        hp.className = `seq-pad h-7 rounded border text-[10px] font-mono font-bold ${
          dawState.seqHat[i] ? 'on-hat' : (beatMark ? 'bg-daw-surface border-slate-600 text-slate-300' : 'bg-daw-bg border-daw-border text-slate-600')
        }`;
        hp.textContent = (i === 4 || i === 12) ? 'CP' : (i + 1);
        hp.addEventListener('click', () => {
          dawState.seqHat[i] = dawState.seqHat[i] ? 0 : 1;
          renderDrumSequencerGrids();
        });
        hGrid.appendChild(hp);

        // FX Trigger Pad
        const fp = document.createElement('button');
        fp.dataset.step = i;
        fp.className = `seq-pad h-7 rounded border text-[10px] font-mono font-bold ${
          dawState.seqFx[i] ? 'on-fx' : (beatMark ? 'bg-daw-surface border-slate-600 text-slate-300' : 'bg-daw-bg border-daw-border text-slate-600')
        }`;
        fp.textContent = i === 0 ? 'IMP' : (i === 8 ? 'RIS' : (i + 1));
        fp.addEventListener('click', () => {
          dawState.seqFx[i] = dawState.seqFx[i] ? 0 : 1;
          renderDrumSequencerGrids();
          renderAllTrackCanvases();
        });
        fGrid.appendChild(fp);
      }
    }

    function updateStepHighlightUI(step16) {
      document.querySelectorAll('.seq-pad').forEach(pad => {
        const s = parseInt(pad.dataset.step, 10);
        if (s === step16) pad.classList.add('current-play-step');
        else pad.classList.remove('current-play-step');
      });
    }
