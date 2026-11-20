    /**
     * ============================================================================
     * TAB 4: VERTICAL CHANNEL MIXER RENDERER
     * ============================================================================
     */
    function renderVerticalMixer() {
      const container = document.getElementById('vertical-mixer-strips');
      container.innerHTML = '';

      dawState.tracks.forEach(tr => {
        const strip = document.createElement('div');
        strip.className = 'w-20 bg-daw-surface rounded-xl border border-daw-border p-2 flex flex-col items-center justify-between gap-1.5';

        const dbTxt = tr.vol <= 0.001 ? '-∞' : (20 * Math.log10(tr.vol)).toFixed(1);
        strip.innerHTML = `
          <div class="w-full text-center">
            <div class="text-[10px] font-mono font-extrabold px-1 rounded text-slate-950 mb-0.5" style="background:${tr.color}">${tr.num}</div>
            <div class="text-[10px] font-bold text-white truncate" title="${tr.name}">${tr.name}</div>
          </div>

          <!-- Vertical Meter + Fader -->
          <div class="flex items-center justify-center gap-2 my-1">
            <div class="w-2 h-28 bg-daw-bg rounded-full overflow-hidden border border-daw-border flex flex-col justify-end">
              <div id="vmix-meter-${tr.id}" class="w-full h-0 transition-all duration-75" style="background:${tr.color}"></div>
            </div>
            <input data-vmixvol="${tr.id}" type="range" min="0" max="1.25" step="0.01" value="${tr.vol}" class="vmix-fader vertical-fader" />
          </div>

          <div id="vmix-db-${tr.id}" class="font-mono text-[9px] text-slate-300">${dbTxt} dB</div>

          <div class="flex items-center gap-1 w-full">
            <button data-vmixmute="${tr.id}" class="vmix-mute flex-1 py-0.5 rounded text-[9px] font-bold border ${tr.mute ? 'bg-rose-500 text-white border-rose-400' : 'bg-daw-bg text-slate-400 border-daw-border'}">M</button>
            <button data-vmixsolo="${tr.id}" class="vmix-solo flex-1 py-0.5 rounded text-[9px] font-bold border ${tr.solo ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-daw-bg text-slate-400 border-daw-border'}">S</button>
          </div>
        `;
        container.appendChild(strip);
      });

      document.querySelectorAll('.vmix-fader').forEach(f => {
        f.addEventListener('input', () => {
          const tr = dawState.tracks.find(t => t.id === f.dataset.vmixvol);
          if (tr) {
            tr.vol = parseFloat(f.value);
            const db = tr.vol <= 0.001 ? '-∞' : (20 * Math.log10(tr.vol)).toFixed(1);
            document.getElementById(`vmix-db-${tr.id}`).textContent = `${db} dB`;
            audioEngine.syncAudioParams();
            renderMultiTrackLanes();
          }
        });
      });

      document.querySelectorAll('.vmix-mute').forEach(b => {
        b.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === b.dataset.vmixmute);
          if (tr) {
            tr.mute = !tr.mute;
            audioEngine.syncAudioParams();
            renderVerticalMixer();
            renderMultiTrackLanes();
          }
        });
      });

      document.querySelectorAll('.vmix-solo').forEach(b => {
        b.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === b.dataset.vmixsolo);
          if (tr) {
            tr.solo = !tr.solo;
            audioEngine.syncAudioParams();
            renderVerticalMixer();
            renderMultiTrackLanes();
          }
        });
      });
    }

    function updateAudioToMidiDropdown() {
      const sel = document.getElementById('select-a2m-source');
      if (!sel) return;
      sel.innerHTML = '';
      const audioTracks = dawState.tracks.filter(t => t.type === 'audio' || t.type === 'stem' || t.type === 'mic');
      if (audioTracks.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Keine Audio-Spur vorhanden';
        sel.appendChild(opt);
        return;
      }
      audioTracks.forEach(tr => {
        const opt = document.createElement('option');
        opt.value = tr.id;
        opt.textContent = `${tr.num} | ${tr.name}`;
        sel.appendChild(opt);
      });
    }
