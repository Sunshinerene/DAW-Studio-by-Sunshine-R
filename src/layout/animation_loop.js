    /**
     * ============================================================================
     * REAL-TIME ANIMATION LOOP (PLAYHEAD, CLOCK, METERS, FFT SPECTRUM)
     * ============================================================================
     */
    function uiAnimationTick() {
      if (dawState.isPlaying) {
        updateClockLCD();
        renderAllTrackCanvases();
        if (dawState.activeTab === 'midi') drawPianoRoll();
      }

      if (audioEngine.ctx) {
        const buf = new Uint8Array(128);

        // Update Vertical Mixer Meters
        if (dawState.activeTab === 'mixer') {
          dawState.tracks.forEach(tr => {
            const node = audioEngine.channelNodes[tr.id];
            const el = document.getElementById(`vmix-meter-${tr.id}`);
            if (node && el) {
              node.analyser.getByteTimeDomainData(buf);
              let sum = 0;
              for (let i = 0; i < buf.length; i++) {
                const v = (buf[i] - 128) / 128;
                sum += v * v;
              }
              const rms = Math.sqrt(sum / buf.length);
              el.style.height = `${Math.min(100, Math.round(rms * 310))}%`;
            }
          });

          // Sidechain GR Meter
          const dt = (performance.now() - dawState.lastDuckTime) / 1000;
          const rel = Math.max(0.05, dawState.scReleaseMs / 1000);
          const gr = dt < rel ? dawState.lastDuckDb * (1 - dt / rel) : 0;
          document.getElementById('mixer-sc-gr-db').textContent = `-${gr.toFixed(1)} dB`;
          document.getElementById('mixer-sc-gr-bar').style.width = `${Math.min(100, (gr / 18) * 100)}%`;

          // Master Peak & FFT Spectrum Analyzer
          if (audioEngine.masterAnalyser) {
            audioEngine.masterAnalyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            const db = rms > 0.001 ? (20 * Math.log10(rms)).toFixed(1) : '-∞';
            document.getElementById('master-peak-db').textContent = `${db} dB`;

            drawSpectrumAnalyzer(audioEngine.masterAnalyser);
          }
        }

        // Mic Input Level Meter
        if (dawState.isRecordingMic && audioEngine.micAnalyser) {
          audioEngine.micAnalyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          document.getElementById('mic-vu-fill').style.width = `${Math.min(100, rms * 340)}%`;

          const recSec = (performance.now() - dawState.micRecStartTime) / 1000;
          document.getElementById('mic-rec-clock').textContent = formatTimeStr(recSec);
        }
      }

      requestAnimationFrame(uiAnimationTick);
    }

    function drawSpectrumAnalyzer(analyser) {
      const canvas = document.getElementById('spectrum-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(120, Math.floor(rect.width));
      const h = Math.max(60, Math.floor(rect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#090c12';
      ctx.fillRect(0, 0, w, h);

      const bars = 40;
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const val = freqData[i] / 255;
        const bh = val * (h - 6);
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.6, '#a855f7');
        grad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad;
        ctx.fillRect(i * barW + 1, h - bh, Math.max(2, barW - 2), bh);
      }
      ctx.restore();
    }

    function formatTimeStr(sec) {
      const m = Math.floor(sec / 60);
      const rem = sec % 60;
      const s = Math.floor(rem);
      const t = Math.floor((rem - s) * 10);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${t}`;
    }

    function updateClockLCD() {
      const s16 = (60 / dawState.bpm) / 4;
      const total16 = Math.floor(dawState.playheadSec / s16);
      const bar = Math.floor(total16 / 16) + 1;
      const beat = Math.floor((total16 % 16) / 4) + 1;
      const step = (total16 % 4) + 1;

      document.getElementById('lcd-position').textContent =
        `${String(bar).padStart(2, '0')} : ${beat} : ${String(step).padStart(2, '0')}`;
      document.getElementById('lcd-time').textContent = formatTimeStr(dawState.playheadSec);

      // Gesamtlänge: längste Audiodatei, sonst Länge des Arrangements
      const totalEl = document.getElementById('lcd-total');
      if (totalEl) {
        const contentSec = audioEngine.getContentDurationSec();
        const arrSec = audioEngine.getTotalArrangementBars() * 4 * (60 / dawState.bpm);
        totalEl.textContent = formatTimeStr(contentSec > 0 ? contentSec : arrSec);
      }
    }

    function updatePlayButtonUI() {
      const btn = document.getElementById('btn-play');
      const iPlay = document.getElementById('icon-play');
      const iPause = document.getElementById('icon-pause');
      const lbl = document.getElementById('lbl-play');
      if (dawState.isPlaying) {
        iPlay.classList.add('hidden');
        iPause.classList.remove('hidden');
        lbl.textContent = 'Pause';
        btn.classList.replace('bg-emerald-500', 'bg-amber-400');
      } else {
        iPlay.classList.remove('hidden');
        iPause.classList.add('hidden');
        lbl.textContent = 'Play';
        btn.classList.replace('bg-amber-400', 'bg-emerald-500');
      }
    }

    function updateMicUI() {
      const dot = document.getElementById('mic-rec-dot');
      const lbl = document.getElementById('lbl-mic-btn');
      if (dawState.isRecordingMic) {
        dot.className = 'w-3 h-3 rounded-full bg-rose-500 animate-ping';
        lbl.textContent = '■ Aufnahme stoppen & speichern';
      } else {
        dot.className = 'w-3 h-3 rounded-full bg-slate-600';
        lbl.textContent = '● Aufnahme starten';
        document.getElementById('mic-vu-fill').style.width = '0%';
      }
      renderMultiTrackLanes();
    }

    function switchBottomTab(tabKey) {
      dawState.activeTab = tabKey;
      dawState.dockCollapsed = false;
      document.querySelectorAll('.dock-tab-btn').forEach(btn => {
        const active = btn.dataset.tab === tabKey;
        btn.className = active
          ? 'dock-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/25 text-purple-200 border border-purple-500/50 transition flex items-center gap-1.5'
          : 'dock-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-daw-elevated border border-transparent transition flex items-center gap-1.5';
      });
      document.querySelectorAll('.dock-tab-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `tab-panel-${tabKey}`);
      });

      if (tabKey === 'midi') {
        drawPianoRoll();
        drawVelocityLane();
      } else if (tabKey === 'mixer') {
        renderVerticalMixer();
      }
    }
