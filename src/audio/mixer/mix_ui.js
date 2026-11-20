/* ===== Sunshine@R: Lautheit & Spektrum (Fenster) ===== */
(function () {
  'use strict';
  if (!window.Loudness || !window.AutoModel) return;
  const $ = id => document.getElementById(id);
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (_) {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const L = window.Loudness;
  const fmt = (v, d = 1) => v === -Infinity || v == null || !isFinite(v) ? '−∞' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  let root = null, raf = 0, tap = null, busy = false, cancel = false, target = L.TARGETS[0].id, specA = '', specB = '';
  const hist = [], mem = { maxM: -Infinity, peak: -Infinity };

  const CSS = `
#lm-root{position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center}
#lm-root[hidden]{display:none!important}
#lm-root .lm-card{width:100%;max-width:520px;max-height:94vh;overflow:auto;-webkit-overflow-scrolling:touch;border-radius:20px 20px 0 0;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:14px 14px max(18px,env(safe-area-inset-bottom));font-family:inherit}
#lm-root h3{margin:0;font-size:16px;font-weight:800}
#lm-root .lm-sec{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}
#lm-root .lm-sec>b{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}
#lm-root .lm-meters{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#lm-root .lm-m{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:8px;background:rgba(255,255,255,.04);text-align:center}
#lm-root .lm-m span{display:block;font-size:10px;color:#94a3b8}
#lm-root .lm-m strong{font-size:20px;font-variant-numeric:tabular-nums}
#lm-root .lm-btn{min-height:46px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#e2e8f0;font-weight:700;font-size:13px}
#lm-root .lm-btn.pri{background:#f59e0b;border-color:#f59e0b;color:#1c1100}
#lm-root .lm-btn:disabled{opacity:.45}
#lm-root select{min-height:44px;border-radius:12px;background:#0b1220;border:1px solid rgba(255,255,255,.18);color:#e2e8f0;padding:0 10px;font-size:13px;width:100%}
#lm-root .lm-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
#lm-root .lm-res{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:13px;margin-top:10px}
#lm-root .lm-res span:nth-child(odd){color:#94a3b8}
#lm-root .lm-res span:nth-child(even){text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
#lm-root .lm-verdict{margin-top:10px;padding:10px;border-radius:12px;font-size:13px;font-weight:700}
#lm-root .lm-verdict.ok{background:rgba(16,185,129,.16);color:#6ee7b7}
#lm-root .lm-verdict.warn{background:rgba(245,158,11,.16);color:#fcd34d}
#lm-root label.lm-sl{display:flex;flex-direction:column;gap:2px;font-size:12px;color:#94a3b8;margin-top:8px}
#lm-root label.lm-sl b{color:#fde68a}
#lm-root input[type=range]{width:100%;min-height:30px}
#lm-root canvas{width:100%;height:190px;border-radius:12px;background:#090c12;border:1px solid rgba(255,255,255,.1);display:block}
#lm-root .lm-note{font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.45}`;

  window.__lmCSS = CSS;
  function build() {
    if (root) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'lm-root'; root.hidden = true;
    root.innerHTML = `<div class="lm-card" role="dialog" aria-modal="true" aria-label="Lautheit und Spektrum">
      <div style="display:flex;align-items:center;gap:8px"><h3 style="flex:1">📊 Lautheit &amp; Spektrum</h3><button type="button" class="lm-btn" data-lm="close" aria-label="Schließen">✕</button></div>
      <div class="lm-sec"><b>Live beim Abspielen</b>
        <div class="lm-meters"><div class="lm-m"><span>Momentan (LUFS)</span><strong id="lm-m">−∞</strong></div><div class="lm-m"><span>Kurzzeit (LUFS)</span><strong id="lm-s">−∞</strong></div><div class="lm-m"><span>Spitze (dBFS)</span><strong id="lm-p">−∞</strong></div></div>
        <div class="lm-note">Gemessen nach dem Limiter, K-bewertet (ITU-R BS.1770). <a href="#" data-lm="resetmax" style="color:#fcd34d">Spitze zurücksetzen</a></div></div>
      <div class="lm-sec"><b>Ganzen Mix messen &amp; auf Ziel bringen</b>
        <select id="lm-target" aria-label="Zielwert"></select>
        <div class="lm-row"><button type="button" class="lm-btn" data-lm="measure" style="flex:1">Messen</button><button type="button" class="lm-btn pri" data-lm="auto" style="flex:1.4">Auf Ziel anpassen</button></div>
        <div id="lm-status" class="lm-note"></div><div id="lm-out"></div></div>
      <div class="lm-sec"><b>Master von Hand</b>
        <label class="lm-sl">Master-Anhebung (vor dem Limiter) <b id="lm-trimv">0 dB</b><input id="lm-trim" type="range" min="-12" max="18" step="0.5" aria-label="Master-Anhebung"></label>
        <label class="lm-sl">Limiter-Schwelle <b id="lm-limv">−1 dB</b><input id="lm-lim" type="range" min="-12" max="0" step="0.5" aria-label="Limiter-Schwelle"></label>
        <div class="lm-note">Mehr Anhebung = lauter; der Limiter fängt die Spitzen ab. Beides wird mit dem Projekt gespeichert und gilt auch im Master-WAV.</div>
        <div class="lm-row"><button type="button" class="lm-btn" data-lm="reset" style="flex:1">Zurücksetzen (0 dB / −1 dB)</button></div></div>
      <div class="lm-sec"><b>Spektrum</b><canvas id="lm-spec" aria-label="Spektrum"></canvas>
        <div class="lm-row"><select id="lm-a" aria-label="Spur A" style="flex:1"></select><select id="lm-b" aria-label="Spur B" style="flex:1"></select></div>
        <div class="lm-note">Grau = ganzer Mix. Wähle zwei Spuren (z. B. Bass und Kick): <span style="color:#38bdf8">Spur A</span> und <span style="color:#f472b6">Spur B</span>. Rote Balken unten = beide Spuren laufen hier im gleichen Frequenzbereich (Kollision). Zum Anzeigen den Song abspielen.</div></div>
    </div>`;
    document.body.appendChild(root);
    $('lm-target').innerHTML = L.TARGETS.map(t => `<option value="${t.id}">${t.name} · ${t.lufs} LUFS / ${t.tp} dBTP</option>`).join('');
    root.addEventListener('click', onClick);
    $('lm-target').addEventListener('change', e => { target = e.target.value; });
    $('lm-trim').addEventListener('input', e => { dawState.masterTrimDb = +e.target.value; apply(); });
    $('lm-lim').addEventListener('input', e => { dawState.limiterDb = +e.target.value; apply(); });
    $('lm-a').addEventListener('change', e => { specA = e.target.value; retap(); });
    $('lm-b').addEventListener('change', e => { specB = e.target.value; retap(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden) close(); });
  }
  function apply() { try { audioEngine.syncAudioParams(); } catch (_) {} labels(); }
  function labels() {
    $('lm-trim').value = dawState.masterTrimDb || 0; $('lm-lim').value = dawState.limiterDb == null ? -1 : dawState.limiterDb;
    $('lm-trimv').textContent = ((dawState.masterTrimDb || 0) > 0 ? '+' : '') + fmt(dawState.masterTrimDb || 0) + ' dB'; $('lm-limv').textContent = fmt(dawState.limiterDb == null ? -1 : dawState.limiterDb) + ' dB';
  }
  function fillTracks() {
    const opts = '<option value="">— keine —</option>' + dawState.tracks.map((t, i) => `<option value="${t.id}">${String(t.num || String(i + 1).padStart(2, '0'))} · ${String(t.name).replace(/[<&]/g, '')}</option>`).join('');
    $('lm-a').innerHTML = opts; $('lm-b').innerHTML = opts; $('lm-a').value = specA; $('lm-b').value = specB;
  }

  /* ---------- Live-Messung ---------- */
  function connectTap() {
    const eng = audioEngine; if (!eng.ctx || !eng.masterLimiter) return false; if (tap) return true; const ctx = eng.ctx, [c1, c2] = L.kCoeffs(ctx.sampleRate);
    const f1 = ctx.createIIRFilter(c1.b, c1.a), f2 = ctx.createIIRFilter(c2.b, c2.a), an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
    const spec = ctx.createAnalyser(); spec.fftSize = 8192; spec.smoothingTimeConstant = 0.8; spec.minDecibels = -110; spec.maxDecibels = 0;
    const sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination);
    eng.masterLimiter.connect(f1); f1.connect(f2); f2.connect(an); an.connect(sink); eng.masterLimiter.connect(spec); spec.connect(sink);
    const pk = ctx.createAnalyser(); pk.fftSize = 2048; eng.masterLimiter.connect(pk); pk.connect(sink);
    tap = { f1, f2, an, spec, pk, sink, bufT: new Float32Array(2048), bufP: new Float32Array(2048), a: null, b: null, specA: null, specB: null }; return true;
  }
  function retap() {
    if (!tap) return; const eng = audioEngine, ctx = eng.ctx;
    ['a', 'b'].forEach(k => { if (tap[k]) { try { tap[k].src.disconnect(tap[k].an); } catch (_) {} try { tap[k].an.disconnect(); } catch (_) {} tap[k] = null; } });
    [['a', specA], ['b', specB]].forEach(([k, id]) => { const n = id && eng.channelNodes[id]; if (!n) return; const an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0.8; an.minDecibels = -110; an.maxDecibels = 0; n.autoGain.connect(an); an.connect(tap.sink); tap[k] = { an, src: n.autoGain }; });
  }
  function disconnectTap() {
    if (!tap) return; const eng = audioEngine;
    try { eng.masterLimiter.disconnect(tap.f1); eng.masterLimiter.disconnect(tap.spec); eng.masterLimiter.disconnect(tap.pk); } catch (_) {}
    ['a', 'b'].forEach(k => { if (tap[k]) { try { tap[k].src.disconnect(tap[k].an); } catch (_) {} } });
    try { tap.sink.disconnect(); } catch (_) {} tap = null;
  }
  const dbv = v => v > 0 ? 20 * Math.log10(v) : -Infinity;
  function liveMeters(now) {
    if (!tap) return;
    tap.an.getFloatTimeDomainData(tap.bufT); let s = 0; for (let i = 0; i < tap.bufT.length; i++) s += tap.bufT[i] * tap.bufT[i]; const ms = s / tap.bufT.length;
    tap.pk.getFloatTimeDomainData(tap.bufP); let pk = 0; for (let i = 0; i < tap.bufP.length; i++) { const a = Math.abs(tap.bufP[i]); if (a > pk) pk = a; }
    hist.push([now, ms]); while (hist.length && now - hist[0][0] > 3000) hist.shift();
    const avg = ms0 => { const a = hist.filter(h => now - h[0] <= ms0); return a.length ? a.reduce((x, y) => x + y[1], 0) / a.length : 0; };
    const m = L.lufs(avg(400)), sh = L.lufs(avg(3000)); mem.peak = Math.max(mem.peak, dbv(pk)); mem.maxM = Math.max(mem.maxM, m);
    $('lm-m').textContent = fmt(m); $('lm-s').textContent = fmt(sh); const pe = $('lm-p'); pe.textContent = fmt(mem.peak); pe.style.color = mem.peak > -0.5 ? '#fca5a5' : '';
  }

  /* ---------- Spektrum (logarithmische Frequenzachse) ---------- */
  function drawSpec() {
    const cv = $('lm-spec'); if (!cv) return; const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, W = Math.max(100, Math.floor(r.width)), H = Math.max(80, Math.floor(r.height));
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#090c12'; cx.fillRect(0, 0, W, H);
    const F0 = 20, F1 = 20000, X = f => Math.log(f / F0) / Math.log(F1 / F0) * W, DB0 = -90, Y = d => H - 16 - clamp((d - DB0) / (0 - DB0), 0, 1) * (H - 26);
    cx.font = '9px ui-monospace,monospace'; cx.textBaseline = 'top';
    [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(f => { const x = Math.round(X(f)) + .5; cx.strokeStyle = 'rgba(148,163,184,.14)'; cx.beginPath(); cx.moveTo(x, 4); cx.lineTo(x, H - 16); cx.stroke(); cx.fillStyle = '#64748b'; cx.fillText(f >= 1000 ? (f / 1000) + 'k' : String(f), x + 2, H - 13); });
    [-20, -40, -60, -80].forEach(d => { const y = Math.round(Y(d)) + .5; cx.strokeStyle = 'rgba(148,163,184,.10)'; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); });
    if (!tap) return; const sr = audioEngine.ctx.sampleRate;
    const curve = an => { const N = an.frequencyBinCount, d = new Float32Array(N); an.getFloatFrequencyData(d); const out = new Float32Array(W); let any = false;
      for (let x = 0; x < W; x++) { const fa = F0 * Math.pow(F1 / F0, x / W), fb = F0 * Math.pow(F1 / F0, (x + 1) / W); let b0 = Math.max(1, Math.floor(fa / (sr / 2) * N)), b1 = Math.max(b0, Math.min(N - 1, Math.ceil(fb / (sr / 2) * N))), m = -200; for (let b = b0; b <= b1; b++) if (d[b] > m) m = d[b]; out[x] = m; if (m > -100) any = true; }
      return any ? out : null; };
    const area = (c, col, fill) => { cx.beginPath(); cx.moveTo(0, Y(c[0])); for (let x = 1; x < W; x++) cx.lineTo(x, Y(c[x])); cx.strokeStyle = col; cx.lineWidth = 1.5; cx.stroke(); if (fill) { cx.lineTo(W, H - 16); cx.lineTo(0, H - 16); cx.closePath(); cx.fillStyle = fill; cx.fill(); } };
    const cm = curve(tap.spec), ca = tap.a ? curve(tap.a.an) : null, cb = tap.b ? curve(tap.b.an) : null;
    if (cm) area(cm, 'rgba(148,163,184,.8)', 'rgba(148,163,184,.16)'); else { cx.fillStyle = '#64748b'; cx.textAlign = 'center'; cx.font = '12px system-ui'; cx.fillText('Song abspielen, um das Spektrum zu sehen', W / 2, H / 2 - 8); cx.textAlign = 'left'; }
    if (ca) area(ca, '#38bdf8', 'rgba(56,189,248,.14)'); if (cb) area(cb, '#f472b6', 'rgba(244,114,182,.14)');
    if (ca && cb) { cx.fillStyle = 'rgba(239,68,68,.75)'; for (let x = 0; x < W; x++) if (ca[x] > -62 && cb[x] > -62 && Math.abs(ca[x] - cb[x]) < 6) cx.fillRect(x, H - 22, 1, 6); }
  }
  function loop() { if (!root || root.hidden) return; const now = performance.now(); if (dawState.isPlaying) liveMeters(now); drawSpec(); raf = requestAnimationFrame(loop); }

  /* ---------- Messen & Anpassen ---------- */
  const tgt = () => L.TARGETS.find(t => t.id === target) || L.TARGETS[0];
  function contentEnd() { const c = audioEngine.getContentDurationSec(); const total = audioEngine.getTotalArrangementBars() * 4 * 60 / dawState.bpm; return c > 0 ? Math.min(total, c + 1) : total; }
  async function measureMix() {
    if (typeof window.__exportMix !== 'function') throw new Error('Render-Funktion fehlt');
    const buf = await window.__exportMix({ returnBuffer: true, endSec: contentEnd() }); if (!buf) throw new Error('Render fehlgeschlagen');
    return L.measure(buf);
  }
  function show(res) {
    const t = tgt(); const d = res.integrated - t.lufs; let verdict;
    if (!isFinite(res.integrated)) verdict = ['warn', 'Kein hörbares Signal gefunden – lade Spuren oder prüfe Stumm/Solo.'];
    else if (res.truePeakDb > t.tp + 0.3) verdict = ['warn', `Spitzen zu hoch (${fmt(res.truePeakDb)} dBTP, erlaubt ${t.tp}). Limiter-Schwelle senken oder „Auf Ziel anpassen“.`];
    else if (Math.abs(d) <= 1) verdict = ['ok', `Passt zum Ziel (${t.lufs} LUFS): Abweichung ${d > 0 ? '+' : ''}${fmt(d)} LU.`];
    else verdict = ['warn', `${fmt(Math.abs(d))} LU ${d < 0 ? 'zu leise' : 'zu laut'} für ${t.name} (${t.lufs} LUFS).`];
    $('lm-out').innerHTML = `<div class="lm-res"><span>Integrierte Lautheit</span><span>${fmt(res.integrated)} LUFS</span><span>True Peak (≈)</span><span>${fmt(res.truePeakDb)} dBTP</span><span>Lautheitsumfang (LRA)</span><span>${fmt(res.lra)} LU</span><span>Max. Kurzzeit</span><span>${fmt(res.shortTermMax)} LUFS</span><span>Max. Momentan</span><span>${fmt(res.momentaryMax)} LUFS</span><span>Länge</span><span>${res.seconds.toFixed(1)} s</span></div><div class="lm-verdict ${verdict[0]}">${verdict[1]}</div>`;
  }
  function setBusy(b, msg) { busy = b; root.querySelectorAll('[data-lm="measure"],[data-lm="auto"]').forEach(x => x.disabled = b); $('lm-status').textContent = msg || ''; }
  async function doMeasure() {
    if (busy) return; setBusy(true, 'Rendere den Mix … (kann auf dem Handy etwas dauern)');
    try { const r = await measureMix(); show(r); setBusy(false, ''); } catch (e) { console.error(e); setBusy(false, 'Messung fehlgeschlagen: ' + e.message); }
  }
  async function doAuto() {
    if (busy) return; const t = tgt(); setBusy(true, 'Messe …');
    try {
      let res = await measureMix(); if (!isFinite(res.integrated)) { show(res); setBusy(false, ''); return; }
      for (let i = 0; i < 5; i++) {
        const dl = t.lufs - res.integrated, over = res.truePeakDb - t.tp;
        if (Math.abs(dl) <= 0.3 && over <= 0.3) break;
        $('lm-status').textContent = `Runde ${i + 1}/5 – Lautheit ${fmt(res.integrated)} LUFS → Ziel ${t.lufs} …`;
        if (over > 0.3 && dl <= 0.3) dawState.limiterDb = clamp((dawState.limiterDb == null ? -1 : dawState.limiterDb) - over, -12, 0);
        else { dawState.masterTrimDb = clamp((dawState.masterTrimDb || 0) + dl, -24, 18); if (over > 0.3) dawState.limiterDb = clamp(Math.min(dawState.limiterDb == null ? -1 : dawState.limiterDb, t.tp), -12, 0); }
        apply(); res = await measureMix();
      }
      show(res); setBusy(false, `Fertig: Anhebung ${fmt(dawState.masterTrimDb || 0)} dB, Limiter ${fmt(dawState.limiterDb == null ? -1 : dawState.limiterDb)} dB.`);
    } catch (e) { console.error(e); setBusy(false, 'Anpassung fehlgeschlagen: ' + e.message); }
  }
  function onClick(e) {
    const b = e.target.closest('[data-lm]'); if (!b) { if (e.target === root) close(); return; } e.preventDefault();
    switch (b.dataset.lm) {
      case 'close': close(); break; case 'measure': doMeasure(); break; case 'auto': doAuto(); break;
      case 'reset': dawState.masterTrimDb = 0; dawState.limiterDb = -1; apply(); say('Master-Anhebung 0 dB, Limiter −1 dB.', 'info'); break;
      case 'resetmax': mem.peak = -Infinity; mem.maxM = -Infinity; hist.length = 0; $('lm-p').textContent = '−∞'; $('lm-p').style.color = ''; break;
    }
  }
  async function open() {
    build(); try { await audioEngine.ensureCtx(); } catch (_) {}
    const m = $('file-menu'); if (m) m.hidden = true;
    root.hidden = false; $('lm-target').value = target; labels(); fillTracks(); $('lm-out').innerHTML = ''; $('lm-status').textContent = '';
    connectTap(); retap(); cancelAnimationFrame(raf); loop();
  }
  function close() { if (!root) return; root.hidden = true; cancelAnimationFrame(raf); disconnectTap(); }

  function addMenu(tries) {
    const menu = $('file-menu'); if (!menu) { if (tries > 0) setTimeout(() => addMenu(tries - 1), 250); return; }
    if ($('btn-loudness')) return; const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-loudness'; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = '📊 Lautheit &amp; Spektrum';
    const ref = $('btn-settings'); if (ref && ref.parentNode === menu) menu.insertBefore(b, ref); else menu.appendChild(b);
    b.addEventListener('click', () => open());
  }
  addMenu(40);
  window.LoudnessUI = { open, close, isOpen: () => !!root && !root.hidden, measure: doMeasure, auto: doAuto, _tap: () => tap };
})();
