    /**
     * ============================================================================
     * MULTI-TRACK VIEW RENDERING (INDIVIDUAL TRACK HEADERS & TIMELINE LANES)
     * ============================================================================
     */
    function renderArrangementHeaderBar() {
      const bar = document.getElementById('arrangement-header-bar');
      bar.innerHTML = '';
      const totalBars = audioEngine.getTotalArrangementBars();
      const extraBars = totalBars - audioEngine.getSectionBarsSum();
      let cursorBar = 0;

      dawState.sections.forEach((sec, idx) => {
        const startBar = cursorBar;
        cursorBar += sec.bars;
        const pct = ((sec.bars + (idx === dawState.sections.length - 1 ? extraBars : 0)) / totalBars) * 100;

        const cell = document.createElement('div');
        cell.style.width = `${pct}%`;
        cell.className = 'px-2.5 py-1.5 flex items-center justify-between gap-1 cursor-pointer hover:bg-daw-elevated/70 transition min-w-[95px]';
        cell.innerHTML = `
          <div class="flex items-center gap-1.5 truncate">
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${sec.color}"></span>
            <span class="text-[11px] font-bold text-white truncate">${sec.name}</span>
          </div>
          <button data-secidx="${idx}" title="Taktlänge umschalten (4T / 8T)" class="sec-bars-btn px-1.5 py-0.5 rounded bg-daw-bg border border-daw-border font-mono text-[10px] text-slate-300 hover:border-cyan-400">
            ${sec.bars}T
          </button>
        `;

        cell.addEventListener('click', (e) => {
          if (e.target.closest('.sec-bars-btn')) {
            dawState.sections[idx].bars = dawState.sections[idx].bars === 4 ? 8 : 4;
            renderArrangementHeaderBar();
            renderMultiTrackLanes();
            return;
          }
          const jumpSec = startBar * 4 * (60 / dawState.bpm);
          audioEngine.seek(jumpSec);
          toast(`Sprung zu „${sec.name}“ (Takt ${startBar + 1})`, 'info');
        });

        bar.appendChild(cell);
      });
    }

    function openNewTrackDialog() {
      const ov = document.createElement('div');
      ov.className = 'fixed inset-0 z-[var(--z-dialog)] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3';
      ov.innerHTML = `<div class="bg-daw-surface border border-daw-border rounded-2xl w-full max-w-md shadow-2xl text-slate-200 overflow-hidden">
        <div class="p-3.5 border-b border-daw-border font-bold text-sm flex items-center justify-between">
          <span>➕ Neue Spur erstellen</span>
          <button id="nt-close" class="text-slate-400 hover:text-white text-base px-1">✕</button>
        </div>
        <div class="p-3.5 flex flex-col gap-3 text-xs">
          <div>
            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Spur-Typ auswählen</label>
            <div id="nt-types" class="grid grid-cols-2 gap-1.5">
              <button type="button" data-kind="audio" class="nt-type-btn text-left p-2 rounded-xl border border-cyan-400 bg-cyan-500/20 text-white font-semibold">🎵 Leere Audio-Spur<div class="text-[10px] font-normal text-slate-300">WAV / MP3 / Stems</div></button>
              <button type="button" data-kind="midi"  class="nt-type-btn text-left p-2 rounded-xl border border-daw-border bg-daw-bg text-slate-300 font-semibold">🎹 Leere MIDI-Spur<div class="text-[10px] font-normal text-slate-400">Piano Roll &amp; Synth</div></button>
              <button type="button" data-kind="mic"   class="nt-type-btn text-left p-2 rounded-xl border border-daw-border bg-daw-bg text-slate-300 font-semibold">🎙️ Mikrofon-Spur<div class="text-[10px] font-normal text-slate-400">Vocal Aufnahme</div></button>
              <button type="button" data-kind="kick"  class="nt-type-btn text-left p-2 rounded-xl border border-daw-border bg-daw-bg text-slate-300 font-semibold">🥁 Own Kick / Perc<div class="text-[10px] font-normal text-slate-400">Drum Sequencer</div></button>
              <button type="button" data-kind="bass"  class="nt-type-btn text-left p-2 rounded-xl border border-daw-border bg-daw-bg text-slate-300 font-semibold">🔊 Own Bass / 808<div class="text-[10px] font-normal text-slate-400">Bassline &amp; Sub</div></button>
              <button type="button" data-kind="fx"    class="nt-type-btn text-left p-2 rounded-xl border border-daw-border bg-daw-bg text-slate-300 font-semibold">✨ FX &amp; Transitions<div class="text-[10px] font-normal text-slate-400">Riser &amp; Impacts</div></button>
            </div>
          </div>
          <div>
            <label for="nt-name" class="block text-[11px] font-semibold text-slate-400 mb-1">Spurname (optional)</label>
            <input id="nt-name" type="text" placeholder="z. B. Suno Vocals, Lead Synth, Beat..." class="w-full px-2.5 py-2 rounded-lg bg-daw-bg border border-daw-border text-white text-xs focus:outline-none focus:border-cyan-400" />
          </div>
          <label id="nt-vc-wrap" class="flex items-center gap-2 text-slate-300">
            <input id="nt-vc" type="checkbox" />
            <span>🎙️ Vocal-Cleanup &amp; Hall für diese Audio-Spur aktivieren</span>
          </label>
        </div>
        <div class="p-3.5 border-t border-daw-border flex justify-end gap-2">
          <button id="nt-cancel" class="px-3 py-1.5 rounded-lg bg-daw-bg border border-daw-border text-xs">Abbrechen</button>
          <button id="nt-create" class="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs">Spur erstellen</button>
        </div>
      </div>`;

      let selectedKind = 'audio';
      const vcWrap = ov.querySelector('#nt-vc-wrap');
      ov.querySelectorAll('.nt-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedKind = btn.dataset.kind;
          ov.querySelectorAll('.nt-type-btn').forEach(b => {
            const active = b.dataset.kind === selectedKind;
            b.className = active
              ? 'nt-type-btn text-left p-2 rounded-xl border border-cyan-400 bg-cyan-500/20 text-white font-semibold'
              : 'nt-type-btn text-left p-2 rounded-xl border border-daw-border bg-daw-bg text-slate-300 font-semibold';
          });
          vcWrap.style.display = selectedKind === 'audio' ? 'flex' : 'none';
        });
      });

      const close = () => ov.remove();
      ov.querySelector('#nt-close').onclick = close;
      ov.querySelector('#nt-cancel').onclick = close;
      ov.querySelector('#nt-create').onclick = () => {
        const customName = ov.querySelector('#nt-name').value;
        const vc = ov.querySelector('#nt-vc').checked;
        if (typeof window.__dawPushUndo === 'function') window.__dawPushUndo();
        const tr = createTrack(selectedKind, customName, { vocalCleanup: vc, lowCut: vc });
        close();
        renderMultiTrackLanes();
        renderVerticalMixer();
        updateAudioToMidiDropdown();
        drawPianoRoll();
        drawVelocityLane();
        document.getElementById('status-subtitle').textContent = `${dawState.tracks.length} Spur(en) aktiv`;
        toast(`Spur ${tr.num} „${tr.name}“ erstellt!`, 'success');
      };

      document.body.appendChild(ov);
    }

    function renderMultiTrackLanes() {
      const container = document.getElementById('multitrack-lanes');
      container.innerHTML = '';
      const countLabel = dawState.tracks.length === 1 ? '1 Spur' : `${dawState.tracks.length} Spuren`;
      document.getElementById('track-count-pill').textContent = countLabel;

      if (dawState.tracks.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.className = 'p-6 text-center flex flex-col items-center justify-center gap-3 bg-daw-bg/60';
        emptyBox.innerHTML = `
          <img src="assets/sunshine-r-daw-studio-logo.png" alt="Sunshine@R DAW Studio" class="hidden max-h-28 max-w-[85%] object-contain rounded-xl" onload="this.classList.remove('hidden')" onerror="this.remove()">
          <div class="text-xs sm:text-sm font-bold text-slate-200">Noch keine Spuren im Projekt</div>
          <div class="text-[11px] text-slate-400 max-w-md">Lege eine leere Audio- oder MIDI-Spur an oder lade direkt deine WAV-, MP3-, MIDI- oder ZIP-Dateien.</div>
          <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button id="empty-new-track-btn" class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition">➕ Neue Spur erstellen</button>
            <button id="empty-import-btn" class="px-3.5 py-2 rounded-xl bg-daw-surface hover:bg-daw-elevated text-cyan-300 border border-cyan-500/40 font-semibold text-xs transition">📂 Audio / MIDI / ZIP laden</button>
          </div>
        `;
        container.appendChild(emptyBox);
        emptyBox.querySelector('#empty-new-track-btn').addEventListener('click', openNewTrackDialog);
        emptyBox.querySelector('#empty-import-btn').addEventListener('click', () => document.getElementById('universal-file-input').click());
        return;
      }

      const totalBars = audioEngine.getTotalArrangementBars();

      dawState.tracks.forEach((tr) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 items-stretch hover:bg-daw-surface/30 transition';

        const dbVal = tr.vol <= 0.001 ? '-∞' : (20 * Math.log10(tr.vol)).toFixed(1);
        const panStr = tr.pan === 0 ? 'C' : (tr.pan < 0 ? `L${Math.abs(Math.round(tr.pan * 100))}` : `R${Math.round(tr.pan * 100)}`);

        let quickActionHtml = '';
        if (tr.type === 'audio' || tr.type === 'stem') {
          quickActionHtml = `
            <button data-loadaudio="${tr.id}" title="Audiodatei in diese Spur laden" class="tr-load-btn px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 text-[9px] font-mono font-bold">📂 Audio</button>
            <button data-vc="${tr.id}" title="Vocal-Cleanup &amp; Hall umschalten" class="tr-vc-btn px-1.5 py-0.5 rounded ${tr.vocalCleanup ? 'bg-amber-500/25 text-amber-200 border-amber-500/40' : 'bg-daw-surface text-slate-500 border-daw-border'} border text-[9px] font-mono font-bold">VC</button>
            <button data-a2m="${tr.id}" title="Melodie aus dieser Spur in Piano Roll extrahieren" class="tr-a2m-btn px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 border border-purple-500/40 text-[9px] font-mono font-bold">→ MIDI</button>
          `;
        } else if (tr.type === 'mic') {
          const isThisRec = dawState.isRecordingMic && dawState.recordingMicTrackId === tr.id;
          quickActionHtml = `<button data-micrec="${tr.id}" class="tr-mic-arm-btn px-1.5 py-0.5 rounded ${isThisRec ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'} text-[9px] font-mono font-bold">● Rec</button>`;
        } else if (tr.type === 'midi') {
          const isActiveMidi = tr.id === dawState.activeMidiTrackId;
          quickActionHtml = `<select data-inst="${tr.id}" title="Instrument dieser Spur" aria-label="Instrument" style="touch-action:manipulation" class="tr-inst-select max-w-[88px] px-1 py-0.5 rounded bg-daw-surface text-purple-200 border border-daw-border text-[9px] font-mono font-bold">${instrumentOptionsHtml(tr)}</select><button data-selmidi="${tr.id}" class="tr-selmidi-btn px-1.5 py-0.5 rounded ${isActiveMidi ? 'bg-purple-500 text-white border-purple-300' : 'bg-purple-500/20 text-purple-200 border-purple-500/40'} border text-[9px] font-mono font-bold">${isActiveMidi ? 'Aktiv' : 'Piano Roll'}</button>`;
        }

        const headerDiv = document.createElement('div');
        headerDiv.className = tr.collapsed ? 'col-span-12 px-2.5 py-1.5 border-b border-daw-border bg-daw-panel/80 flex flex-col justify-between gap-1' : 'col-span-12 lg:col-span-4 xl:col-span-3 px-2.5 py-1.5 border-b lg:border-b-0 lg:border-r border-daw-border bg-daw-panel/80 flex flex-col justify-between gap-1';
        headerDiv.innerHTML = `
          <div class="flex items-center justify-between gap-1.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold text-slate-950 shrink-0" style="background:${tr.color}">${tr.num}</span>
              <span class="text-xs font-bold text-white truncate ${tr.mute ? 'line-through opacity-50' : ''}" title="${tr.name}">${tr.name}</span>
              ${((tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') && dawState.buffers[tr.id]) ? `<span class="text-[9px] font-mono text-sky-300 shrink-0" title="Länge dieser Spur">${formatTimeStr(Math.max(0, dawState.buffers[tr.id].duration - dawState.startOffsetMs / 1000))}</span>` : ''}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-daw-bg text-slate-400 border border-daw-border hidden sm:inline">${tr.badge}</span>
              <button data-collapse="${tr.id}" title="Spur ein-/ausklappen" aria-expanded="${tr.collapsed ? 'false' : 'true'}" class="track-collapse-btn tr-collapse-btn px-1.5 py-0.5 rounded bg-daw-surface hover:bg-daw-elevated text-[10px] font-bold text-slate-300 border border-daw-border">${tr.collapsed ? '＋' : '－'}</button>
              <button type="button" data-fx="${escapeText(tr.id)}" title="FX-Rack öffnen" aria-label="FX-Rack öffnen" style="touch-action:manipulation" class="tr-fx-btn px-1.5 py-0.5 rounded bg-fuchsia-500/15 hover:bg-fuchsia-500/30 text-[9px] font-bold text-fuchsia-300 border border-fuchsia-500/40">FX ${Array.isArray(tr.fx)?tr.fx.filter(x=>x.enabled).length:0}</button>
              <button type="button" data-clipedit="${tr.id}" title="Spur groß ansehen &amp; bearbeiten (Teilen, Zuschneiden, Verschieben …)" aria-label="Spur groß ansehen" style="touch-action:manipulation" class="tr-edit-btn px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 text-[9px] font-bold text-amber-200 border border-amber-500/40">⤢</button>
              <button data-edit="${tr.editTab}" data-trackid="${tr.id}" class="tr-edit-btn px-1.5 py-0.5 rounded bg-daw-surface hover:bg-daw-elevated text-[9px] font-bold text-cyan-300 border border-daw-border">Edit</button>
              <button data-del="${tr.id}" title="Spur löschen" class="tr-del-btn px-1.5 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-[9px] font-bold text-rose-300 border border-rose-500/35">✕</button>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button data-mute="${tr.id}" class="tr-mute-btn w-6 h-5 rounded text-[10px] font-bold border transition ${tr.mute ? 'bg-rose-500 text-white border-rose-400' : 'bg-daw-surface text-slate-400 border-daw-border hover:text-white'}">M</button>
            <button data-solo="${tr.id}" class="tr-solo-btn w-6 h-5 rounded text-[10px] font-bold border transition ${tr.solo ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-daw-surface text-slate-400 border-daw-border hover:text-white'}">S</button>

            <div class="flex-1 flex items-center gap-1">
              <input data-vol="${tr.id}" type="range" min="0" max="1.25" step="0.01" value="${tr.vol}" class="tr-vol-slider flex-1 daw-slider" />
              <span id="tr-db-${tr.id}" class="font-mono text-[9px] text-slate-400 w-9 text-right">${dbVal}dB</span>
            </div>

            <div class="hidden sm:flex items-center gap-1 w-16">
              <input data-pan="${tr.id}" type="range" min="-1" max="1" step="0.05" value="${tr.pan}" class="tr-pan-slider w-10 daw-slider" title="Pan L/R" />
              <span id="tr-pan-${tr.id}" class="font-mono text-[9px] text-slate-400 w-5">${panStr}</span>
            </div>

            ${quickActionHtml}
          </div>
        `;

        const laneDiv = document.createElement('div');
        laneDiv.className = `col-span-12 lg:col-span-8 xl:col-span-9 relative h-14 bg-daw-bg/90 overflow-hidden flex items-stretch ${tr.collapsed ? 'track-is-collapsed' : ''}`;

        const clipsOverlay = document.createElement('div');
        clipsOverlay.className = 'absolute inset-0 flex items-stretch z-10 pointer-events-none';
        dawState.sections.forEach((sec, sIdx) => {
          const pct = ((sec.bars + (sIdx === dawState.sections.length - 1 ? (totalBars - audioEngine.getSectionBarsSum()) : 0)) / totalBars) * 100;
          const isClipOn = tr.sectionClips[sec.id] !== false;
          const clipBox = document.createElement('div');
          clipBox.style.width = `${pct}%`;
          clipBox.className = `border-r border-daw-border/60 relative transition ${isClipOn ? 'bg-transparent' : 'bg-black/65'}`;

          const togglePill = document.createElement('button');
          togglePill.title = `Spur in „${sec.name}“ an/ausschalten`;
          togglePill.className = `pointer-events-auto absolute top-1 right-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold border transition ${
            isClipOn ? 'bg-daw-panel/80 text-slate-300 border-daw-border hover:border-cyan-400' : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
          }`;
          togglePill.textContent = isClipOn ? 'CLIP' : 'OFF';
          togglePill.addEventListener('click', (e) => {
            e.stopPropagation();
            tr.sectionClips[sec.id] = !isClipOn;
            renderMultiTrackLanes();
          });

          clipBox.appendChild(togglePill);
          clipsOverlay.appendChild(clipBox);
        });

        const canvas = document.createElement('canvas');
        canvas.dataset.trackId = tr.id;
        canvas.className = 'track-lane-canvas w-full h-full block cursor-crosshair';
        canvas.addEventListener('click', (e) => {
          const rect = canvas.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const totalSec = totalBars * 4 * (60 / dawState.bpm);
          audioEngine.seek(ratio * totalSec);
        });

        laneDiv.appendChild(canvas);
        laneDiv.appendChild(clipsOverlay);

        row.appendChild(headerDiv);
        row.appendChild(laneDiv);
        container.appendChild(row);
      });

      document.querySelectorAll('.tr-collapse-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === btn.dataset.collapse);
          if (!tr) return;
          tr.collapsed = !tr.collapsed;
          renderMultiTrackLanes();
        });
      });

      document.querySelectorAll('.tr-mute-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === btn.dataset.mute);
          if (tr) {
            tr.mute = !tr.mute;
            audioEngine.syncAudioParams();
            renderMultiTrackLanes();
            renderVerticalMixer();
          }
        });
      });

      document.querySelectorAll('.tr-solo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === btn.dataset.solo);
          if (tr) {
            tr.solo = !tr.solo;
            audioEngine.syncAudioParams();
            renderMultiTrackLanes();
            renderVerticalMixer();
          }
        });
      });

      document.querySelectorAll('.tr-vol-slider').forEach(sl => {
        sl.addEventListener('input', () => {
          const tr = dawState.tracks.find(t => t.id === sl.dataset.vol);
          if (tr) {
            tr.vol = parseFloat(sl.value);
            const db = tr.vol <= 0.001 ? '-∞' : (20 * Math.log10(tr.vol)).toFixed(1);
            const lbl = document.getElementById(`tr-db-${tr.id}`);
            if (lbl) lbl.textContent = `${db}dB`;
            audioEngine.syncAudioParams();
          }
        });
      });

      document.querySelectorAll('.tr-pan-slider').forEach(sl => {
        sl.addEventListener('input', () => {
          const tr = dawState.tracks.find(t => t.id === sl.dataset.pan);
          if (tr) {
            tr.pan = parseFloat(sl.value);
            const pStr = tr.pan === 0 ? 'C' : (tr.pan < 0 ? `L${Math.abs(Math.round(tr.pan * 100))}` : `R${Math.round(tr.pan * 100)}`);
            const lbl = document.getElementById(`tr-pan-${tr.id}`);
            if (lbl) lbl.textContent = pStr;
            audioEngine.syncAudioParams();
          }
        });
      });

      document.querySelectorAll('.tr-vc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === btn.dataset.vc);
          if (tr) {
            tr.vocalCleanup = !tr.vocalCleanup;
            tr.lowCut = tr.vocalCleanup;
            audioEngine.syncAudioParams();
            renderMultiTrackLanes();
            toast(`Vocal-Cleanup für „${tr.name}“: ${tr.vocalCleanup ? 'AN' : 'AUS'}`, 'info');
          }
        });
      });

      document.querySelectorAll('.tr-load-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          dawState.pendingAudioTargetTrackId = btn.dataset.loadaudio;
          document.getElementById('single-track-audio-input').click();
        });
      });

      document.querySelectorAll('.tr-a2m-btn').forEach(btn => {
        btn.addEventListener('click', () => extractMidiFromStem(btn.dataset.a2m));
      });

      document.querySelectorAll('.tr-selmidi-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectMidiTrackForEditor(btn.dataset.selmidi);
          switchBottomTab('midi');
        });
      });

      // FX-Buttons: zentral über installFxButtonDelegation() behandelt (kein Einzel-Listener mehr nötig).

      document.querySelectorAll('.tr-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tr = dawState.tracks.find(t => t.id === btn.dataset.trackid);
          if (tr && tr.type === 'midi') selectMidiTrackForEditor(tr.id);
          switchBottomTab(btn.dataset.edit);
        });
      });

      document.querySelectorAll('.tr-del-btn').forEach(btn => {
        let armDel = null;
        btn.addEventListener('click', () => {
          if (armDel) {
            clearTimeout(armDel);
            armDel = null;
            deleteTrack(btn.dataset.del);
            return;
          }
          btn.textContent = 'Löschen?';
          armDel = setTimeout(() => {
            armDel = null;
            btn.textContent = '✕';
          }, 2800);
        });
      });

      document.querySelectorAll('.tr-mic-arm-btn').forEach(btn => {
        btn.addEventListener('click', () => audioEngine.toggleMicRecording(btn.dataset.micrec));
      });

      renderAllTrackCanvases();
      updateClockLCD();
    }

    function renderAllTrackCanvases() {
      const totalBars = audioEngine.getTotalArrangementBars();
      const totalSec = totalBars * 4 * (60 / dawState.bpm);
      const trimSec = dawState.startOffsetMs / 1000;
      const playRatio = totalSec > 0 ? ((dawState.playheadSec % totalSec) / totalSec) : 0;

      document.querySelectorAll('.track-lane-canvas').forEach(canvas => {
        const trId = canvas.dataset.trackId;
        const tr = dawState.tracks.find(t => t.id === trId);
        if (!tr) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(100, Math.floor(rect.width));
        const h = Math.max(40, Math.floor(rect.height));

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const barPx = w / totalBars;
        const gridStride = barPx >= 6 ? 1 : (barPx * 4 >= 6 ? 4 : 16);
        for (let b = gridStride; b < totalBars; b += gridStride) {
          const x = (b / totalBars) * w;
          ctx.strokeStyle = b % 4 === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        ctx.globalAlpha = tr.mute ? 0.25 : 0.9;
        ctx.fillStyle = tr.color;

        if (Array.isArray(tr.clips) && (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic')) {
          ClipModel.drawLane(ctx, tr, w, h, totalSec);
        } else if (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') {
          const buf = dawState.buffers[tr.id];
          if (buf && buf.__parked) {
            const pk = ClipModel.peaks(buf), spb = buf.sampleRate / 256, st0 = trimSec * spb, vb = totalSec * spb, mid = h / 2;
            for (let x = 0; x < w; x++) { const b0 = Math.floor(st0 + x * vb / w), b1 = Math.max(b0 + 1, Math.floor(st0 + (x + 1) * vb / w)); let m = 0; for (let b = Math.max(0, b0); b < b1 && b < pk.length; b++) if (pk[b] > m) m = pk[b]; const bh = Math.max(1.5, m * h * 0.85); ctx.fillRect(x, mid - bh / 2, 1.5, bh); }
          } else if (buf) {
            const data = buf.getChannelData(0);
            const startSamp = Math.floor(trimSec * buf.sampleRate);
            const viewSamps = Math.floor(totalSec * buf.sampleRate);
            const spp = Math.max(1, Math.floor(viewSamps / w));
            const midY = h / 2;

            for (let x = 0; x < w; x++) {
              const idx = startSamp + x * spp;
              if (idx >= data.length) break;
              let pk = 0;
              const step = Math.max(1, Math.floor(spp / 6));
              for (let j = 0; j < spp && idx + j < data.length; j += step) {
                const v = Math.abs(data[idx + j]);
                if (v > pk) pk = v;
              }
              const bh = Math.max(1.5, pk * h * 0.85);
              ctx.fillRect(x, midY - bh / 2, 1.5, bh);
            }
          } else {
            ctx.fillStyle = 'rgba(148,163,184,0.45)';
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.fillText(tr.type === 'mic' ? 'Bereit für Mikrofon-Aufnahme (● Rec)...' : 'Leere Audio-Spur – tippe „📂 Audio“ zum Laden', 10, h / 2 + 3);
          }
        } else if (tr.type === 'midi') {
          const notes = tr.id === dawState.activeMidiTrackId ? dawState.midiNotes : (tr.midiNotes || []);
          const totalSteps = totalBars * 16;
          const stepW = w / totalSteps;
          for (let s = 0; s < totalSteps; s += 32) {
            notes.forEach(n => {
              const x = (s + n.start) * stepW;
              const nw = Math.max(2, n.dur * stepW - 1);
              const normPitch = (n.pitch - 36) / 36;
              const y = h - 6 - normPitch * (h - 12);
              ctx.fillRect(x, y, nw, 3.5);
            });
          }
        } else if (tr.type === 'kick' || tr.type === 'bass' || tr.type === 'fx') {
          const totalSteps = totalBars * 16;
          const stepW = w / totalSteps;
          const pattern = tr.type === 'kick' ? dawState.seqKick : (tr.type === 'bass' ? dawState.seqBass : dawState.seqFx);
          for (let s = 0; s < totalSteps; s++) {
            if (pattern[s % 16]) {
              const x = s * stepW;
              const bh = tr.type === 'kick' ? h * 0.65 : h * 0.5;
              ctx.fillRect(x, h - bh - 4, Math.max(2, stepW - 1), bh);
            }
          }
        }

        ctx.globalAlpha = 1.0;

        // Playhead Line
        const px = playRatio * w;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();

        ctx.restore();
      });
    }
