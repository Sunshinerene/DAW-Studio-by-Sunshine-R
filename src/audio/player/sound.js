/* ===== Sunshine@R · Player-Klang (Voreinstellungen) + animierter Equalizer =====
   - 5-Band-Klangregler über Web Audio (Tiefbass 60 Hz · Bass 250 Hz · Mitten 1 kHz · Höhen 4 kHz · Brillanz 12 kHz) mit Vorverstärkung und Schutz-Limiter
   - Voreinstellungen: Original, Mehr Bass, Techno, Klassik, Pop, Rock, Stimme, Hip-Hop, Weich, Eigen
   - Anzeige: Spektrum, das zur Voreinstellung passt (eigene Darstellung je Klang) + Kurve des Klangreglers; Farben folgen dem Design
   Der Audio-Graph wird erst angelegt, wenn er gebraucht wird (Klang ≠ Original oder Anzeige an) – sonst läuft die Wiedergabe unverändert direkt. */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const FREQS = [60, 250, 1000, 4000, 12000];
  const BAND_NAMES = ['Tiefbass', 'Bass', 'Mitten', 'Höhen', 'Brillanz'];
  /* id, Name, 5 Bänder in dB, Darstellung, Kurzbeschreibung */
  const PRESETS = [
    { id: 'flat', name: 'Original', g: [0, 0, 0, 0, 0], vz: 'bars', desc: 'Unverändert, wie die Datei klingt.' },
    { id: 'bass', name: 'Mehr Bass', g: [7, 4, 0, 0, 1], vz: 'fat', desc: 'Kräftiger Tiefbass und Druck.' },
    { id: 'techno', name: 'Techno', g: [6, 2, -1, 2, 4], vz: 'led', desc: 'Harte Kick, klare Hi-Hats.' },
    { id: 'classic', name: 'Klassik', g: [2, 1, 0, 1, 3], vz: 'wave', desc: 'Warm und luftig, natürlich.' },
    { id: 'pop', name: 'Pop', g: [-1, 1, 3, 2, 0], vz: 'dots', desc: 'Präsente Mitten, klarer Gesang.' },
    { id: 'rock', name: 'Rock', g: [4, 2, -2, 2, 4], vz: 'spike', desc: 'V-Kurve: Bass und Höhen betont.' },
    { id: 'vocal', name: 'Stimme', g: [-3, -1, 3, 4, 1], vz: 'mirror', desc: 'Sprache und Gesang im Vordergrund.' },
    { id: 'hiphop', name: 'Hip-Hop', g: [6, 3, 0, 1, 2], vz: 'block', desc: 'Tiefer Bass, klare Stimme.' },
    { id: 'soft', name: 'Weich', g: [2, 1, 0, -2, -4], vz: 'aura', desc: 'Sanfter, weniger scharfe Höhen.' },
    { id: 'custom', name: 'Eigen', g: [0, 0, 0, 0, 0], vz: 'bars', desc: 'Fünf Regler selbst einstellen.' }
  ];
  const byId = id => PRESETS.find(p => p.id === id) || PRESETS[0];
  const MAXDB = 12;

  /* ---------------- Audio-Graph ---------------- */
  const E = { au: null, ctx: null, src: null, f: [], pre: null, an: null, lim: null, ok: false, failed: false, gains: [0, 0, 0, 0, 0], fade: null, fadeV: 1, buf: null, small: new Uint8Array(128) };
  function ensure() {
    if (E.ok) return true; if (E.failed || !E.au) return false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { E.failed = true; return false; }
      E.ctx = new AC({ latencyHint: 'playback' }); E.src = E.ctx.createMediaElementSource(E.au);
      const types = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
      E.f = FREQS.map((fr, i) => { const f = E.ctx.createBiquadFilter(); f.type = types[i]; f.frequency.value = fr; f.Q.value = types[i] === 'peaking' ? 0.9 : 0.7; f.gain.value = 0; return f; });
      E.pre = E.ctx.createGain(); E.fade = E.ctx.createGain(); E.fade.gain.value = E.fadeV;
      E.lim = E.ctx.createDynamicsCompressor(); E.lim.threshold.value = -3; E.lim.knee.value = 4; E.lim.ratio.value = 14; E.lim.attack.value = 0.004; E.lim.release.value = 0.14;
      E.an = E.ctx.createAnalyser(); E.an.fftSize = 1024; E.an.smoothingTimeConstant = 0.62; E.buf = new Uint8Array(E.an.frequencyBinCount);
      let n = E.src; E.f.forEach(f => { n.connect(f); n = f; }); n.connect(E.pre); E.pre.connect(E.lim); E.lim.connect(E.fade); E.fade.connect(E.an); E.an.connect(E.ctx.destination);
      E.ok = true; apply(true);
      E.ctx.addEventListener('statechange', () => { try { if (E.ctx.state === 'suspended' && E.au && !E.au.paused) E.ctx.resume(); } catch (_) {} });
      return true;
    } catch (e) { E.failed = true; E.ok = false; try { console.warn('Klang-Graph nicht möglich', e); } catch (_) {} return false; }
  }
  function apply(now) {
    if (!E.ok) return; const t = E.ctx.currentTime, g = E.gains, hi = Math.max(0, ...g);
    E.f.forEach((f, i) => { try { if (now) f.gain.value = g[i]; else f.gain.setTargetAtTime(g[i], t, 0.04); } catch (_) {} });
    const pre = Math.pow(10, -(hi * 0.75) / 20); try { if (now) E.pre.gain.value = pre; else E.pre.gain.setTargetAtTime(pre, t, 0.05); } catch (_) {}
  }
  function resume() { try { if (E.ok && E.ctx.state !== 'running') return E.ctx.resume(); } catch (_) {} }
  function setGains(g) { E.gains = g.map(v => clamp(Math.round(+v || 0), -MAXDB, MAXDB)); apply(false); }
  /* Spektrum: rohe Bins → 128 Bins im Format der DAW (für die Cover-Effekte) */
  function coverData() {
    if (!E.ok) return null; E.an.getByteFrequencyData(E.buf); const b = E.buf, q = Math.max(1, Math.floor(b.length / 128)), o = E.small;
    for (let i = 0; i < 128; i++) { let s = 0; for (let k = 0; k < q; k++) s += b[Math.min(b.length - 1, i * q + k)]; o[i] = s / q; } return o;
  }
  function bands(n, out, X) {   // n Bänder, logarithmisch 40 Hz – 16 kHz, Werte 0–1 (X: andere Quelle, z. B. die DAW)
    X = X || { an: E.an, buf: E.buf, sr: E.ctx.sampleRate }; const b = X.buf, sr = X.sr, binHz = sr / X.an.fftSize, lo = 40, hi = Math.min(16000, sr / 2 - 100);
    for (let i = 0; i < n; i++) {
      const f0 = lo * Math.pow(hi / lo, i / n), f1 = lo * Math.pow(hi / lo, (i + 1) / n); let a = Math.floor(f0 / binHz), z = Math.max(a, Math.ceil(f1 / binHz) - 1), m = 0, s = 0, c = 0;
      for (let k = a; k <= z && k < b.length; k++) { m = Math.max(m, b[k]); s += b[k]; c++; }
      const v = (m * 0.6 + (c ? s / c : 0) * 0.4) / 255, d = i / (n - 1); out[i] = clamp(Math.pow(v, 1.35) * (0.82 + d * 0.55) * 1.18, 0, 1);
    }
    return out;
  }

  /* ---------------- Kurve des Klangreglers ---------------- */
  const fx = f => Math.log(f / 30) / Math.log(16000 / 30);   // Position 0–1 auf der Frequenzachse
  function curveAt(g, x) {   // sanft zwischen den fünf Punkten (Kosinus-Interpolation, außen flach)
    const xs = FREQS.map(fx); if (x <= xs[0]) return g[0]; if (x >= xs[4]) return g[4];
    let i = 0; while (i < 3 && x > xs[i + 1]) i++; const t = (x - xs[i]) / (xs[i + 1] - xs[i]), s = (1 - Math.cos(t * Math.PI)) / 2; return lerp(g[i], g[i + 1], s);
  }

  /* ---------------- Darstellung ---------------- */
  const themeCols = () => {
    const read = n => { try { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim().split(/[\s,\/]+/).map(Number); return v.length >= 3 && v.slice(0, 3).every(isFinite) ? v.slice(0, 3) : null; } catch (_) { return null; } };
    return { a: read('--daw-accent') || [255, 138, 26], b: read('--cv-c2') || [56, 189, 248] };
  };
  const mixc = (c, t, al) => `rgba(${Math.round(lerp(c.a[0], c.b[0], t))},${Math.round(lerp(c.a[1], c.b[1], t))},${Math.round(lerp(c.a[2], c.b[2], t))},${clamp(al, 0, 1).toFixed(3)})`;
  const COUNT = { bars: 36, fat: 12, led: 24, wave: 56, dots: 20, spike: 28, mirror: 40, block: 16, aura: 48 };
  const V = { ext: null, c: null, g: null, vals: new Float32Array(64), tmp: new Float32Array(64), peaks: new Float32Array(64), raf: 0, last: 0, live: () => false, id: 'flat', cols: null, w: 0, h: 0, dpr: 1, hot: false, t0: 0, still: false };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  function fit() {
    const c = V.c, dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight; if (!w || !h) return false;
    if (w !== V.w || h !== V.h || dpr !== V.dpr) { V.w = w; V.h = h; V.dpr = dpr; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); V.g.setTransform(dpr, 0, 0, dpr, 0, 0); V.cols = themeCols(); }
    return true;
  }
  function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, Math.abs(h) / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function draw(ts, live) {
    if (!V.c || !fit()) return; const g = V.g, W = V.w, H = V.h, p = byId(V.id), st = p.vz, n = COUNT[st] || 32, C = V.cols || themeCols(), glow = document.documentElement.getAttribute('data-glow') !== 'off', neon = document.documentElement.getAttribute('data-theme') === 'neon';
    g.clearRect(0, 0, W, H);
    /* Werte: live aus dem Spektrum, sonst ausklingen */
    let X = null; try { X = V.ext ? V.ext() : (E.ok ? { an: E.an, buf: E.buf, sr: E.ctx.sampleRate } : null); } catch (_) { X = null; }
    const tmp = V.tmp; if (live && X) { X.an.getByteFrequencyData(X.buf); bands(n, tmp, X); } else for (let i = 0; i < n; i++) tmp[i] = 0;
    let en = 0; for (let i = 0; i < n; i++) { const t = tmp[i], o = V.vals[i]; V.vals[i] = t > o ? o + (t - o) * 0.7 : o * (live ? 0.86 : 0.8); en += V.vals[i]; if (V.vals[i] > V.peaks[i]) V.peaks[i] = V.vals[i]; else V.peaks[i] = Math.max(0, V.peaks[i] - 0.012); }
    V.hot = en / n > 0.006; const vals = V.vals, base = H - 8, top = 6, ah = base - top, gap = W / n;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const grad = (y0, y1) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, mixc(C, 1, 1)); q.addColorStop(1, mixc(C, 0, 1)); return q; };
    const shadow = (t, a, bl) => { if (!glow) return; g.shadowColor = mixc(C, t, a); g.shadowBlur = bl; };
    if (st === 'bars') {   // schlanke, runde Balken
      const bw = Math.max(2, gap * 0.52); for (let i = 0; i < n; i++) { const v = vals[i], hh = Math.max(2, v * ah), x = i * gap + (gap - bw) / 2; g.fillStyle = mixc(C, i / (n - 1), 0.55 + v * 0.45); rrect(g, x, base - hh, bw, hh, bw / 2); g.fill(); }
    } else if (st === 'fat') {   // breite, runde Bass-Balken, links betont, mit Leuchten
      g.save(); shadow(0.1, 0.55, 14); const bw = gap * 0.78; for (let i = 0; i < n; i++) { const w = Math.pow(1 - i / (n - 1), 0.5) * 0.35 + 0.65, v = clamp(vals[i] * (0.85 + (1 - i / n) * 0.55), 0, 1), hh = Math.max(4, v * ah * w + 3), x = i * gap + (gap - bw) / 2; g.fillStyle = grad(base - hh, base); rrect(g, x, base - hh, bw, hh, Math.min(10, bw / 2)); g.fill(); } g.restore();
    } else if (st === 'led') {   // LED-Segmente mit Spitzenmarke
      const seg = Math.max(5, Math.floor(ah / 7)), sh = ah / seg, bw = Math.max(3, gap * 0.7); for (let i = 0; i < n; i++) { const x = i * gap + (gap - bw) / 2, on = Math.round(vals[i] * seg), pk = Math.round(V.peaks[i] * seg);
        for (let s = 0; s < seg; s++) { const y = base - (s + 1) * sh + 1, lit = s < on, d = s / (seg - 1); g.fillStyle = lit ? mixc(C, d, 0.95) : mixc(C, d, 0.08); if (lit && neon && glow) { g.shadowColor = mixc(C, d, 0.7); g.shadowBlur = 6; } g.fillRect(x, y, bw, Math.max(1.5, sh - 2)); g.shadowBlur = 0; }
        if (pk > on && pk > 0) { g.fillStyle = mixc(C, 1, 0.95); g.fillRect(x, base - pk * sh + 1, bw, 2); } }
    } else if (st === 'wave') {   // geschwungene, gespiegelte Fläche
      const mid = (base + top) / 2, pts = []; for (let i = 0; i < n; i++) pts.push([i / (n - 1) * W, vals[i] * ah * 0.5]);
      const path = sg => { g.beginPath(); g.moveTo(0, mid - sg * pts[0][1]); for (let i = 1; i < n; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; g.quadraticCurveTo(x0, mid - sg * y0, cx, mid - sg * (y0 + y1) / 2); } g.lineTo(W, mid - sg * pts[n - 1][1]); };
      const fill = g.createLinearGradient(0, 0, W, 0); fill.addColorStop(0, mixc(C, 0, 0.5)); fill.addColorStop(1, mixc(C, 1, 0.5));
      path(1); for (let i = n - 1; i >= 0; i--) g.lineTo(pts[i][0], mid + pts[i][1]); g.closePath(); g.fillStyle = fill; g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
      g.save(); shadow(0.5, 0.5, 8); g.lineWidth = 1.8; g.strokeStyle = fill; path(1); g.stroke(); path(-1); g.stroke(); g.restore();
    } else if (st === 'dots') {   // Säulen aus Punkten
      const rows = Math.max(5, Math.floor(ah / 9)), rh = ah / rows, r = Math.max(1.6, Math.min(gap * 0.34, rh * 0.38)); for (let i = 0; i < n; i++) { const on = Math.round(vals[i] * rows), x = i * gap + gap / 2; for (let s = 0; s < rows; s++) { const lit = s < on; g.fillStyle = mixc(C, s / (rows - 1), lit ? 0.95 : 0.1); g.beginPath(); g.arc(x, base - (s + 0.5) * rh, lit ? r : r * 0.72, 0, 6.2832); g.fill(); } }
    } else if (st === 'spike') {   // spitze Zacken
      g.save(); shadow(0.2, 0.4, 6); for (let i = 0; i < n; i++) { const v = vals[i], hh = Math.max(3, v * ah), x = i * gap; g.fillStyle = grad(base - hh, base); g.beginPath(); g.moveTo(x + gap * 0.08, base); g.lineTo(x + gap * 0.5, base - hh); g.lineTo(x + gap * 0.92, base); g.closePath(); g.fill(); } g.restore();
    } else if (st === 'mirror') {   // dünne Balken, an der Mittellinie gespiegelt, Mitte betont
      const mid = (base + top) / 2, bw = Math.max(2, gap * 0.46); for (let i = 0; i < n; i++) { const d = Math.abs(i / (n - 1) - 0.5) * 2, v = vals[i] * (1.1 - d * 0.35), hh = Math.max(2, v * ah * 0.5), x = i * gap + (gap - bw) / 2; g.fillStyle = mixc(C, d, 0.5 + v * 0.5); rrect(g, x, mid - hh, bw, hh * 2, bw / 2); g.fill(); }
    } else if (st === 'block') {   // breite Blöcke mit Spiegelung
      const bw = gap * 0.84, ref = ah * 0.2, hmax = ah - ref; for (let i = 0; i < n; i++) { const v = vals[i], hh = Math.max(3, v * hmax), x = i * gap + (gap - bw) / 2; g.fillStyle = mixc(C, i / (n - 1), 0.85); g.fillRect(x, base - ref - hh, bw, hh); const rg = g.createLinearGradient(0, base - ref, 0, base); rg.addColorStop(0, mixc(C, i / (n - 1), 0.32 * v + 0.05)); rg.addColorStop(1, mixc(C, i / (n - 1), 0)); g.fillStyle = rg; g.fillRect(x, base - ref + 1, bw, Math.min(ref, hh * 0.5 + 2)); }
    } else if (st === 'aura') {   // weiche, leuchtende Fläche
      const pts = []; for (let i = 0; i < n; i++) pts.push([i / (n - 1) * W, base - Math.max(1, vals[i] * ah * 0.9)]);
      const path = () => { g.beginPath(); g.moveTo(0, base); g.lineTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) { const cx = (pts[i - 1][0] + pts[i][0]) / 2, cy = (pts[i - 1][1] + pts[i][1]) / 2; g.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], cx, cy); } g.lineTo(W, pts[n - 1][1]); g.lineTo(W, base); g.closePath(); };
      const f1 = g.createLinearGradient(0, top, 0, base); f1.addColorStop(0, mixc(C, 0.6, 0.55)); f1.addColorStop(1, mixc(C, 0, 0.05)); g.save(); shadow(0.4, 0.5, 16); path(); g.fillStyle = f1; g.fill(); g.restore();
      g.strokeStyle = mixc(C, 0.8, 0.8); g.lineWidth = 1.5; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    }
    /* Kurve des Klangreglers darüber */
    const gains = E.gains; if (p.id !== 'flat' || gains.some(v => v)) {
      g.save(); g.globalAlpha = 0.8; g.lineWidth = 1.4; g.setLineDash([]); const my = (base + top) / 2; g.beginPath(); for (let k = 0; k <= 60; k++) { const x = k / 60 * W, y = my - clamp(curveAt(gains, k / 60) / MAXDB, -1, 1) * ah * 0.42; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = 'rgba(255,255,255,.72)'; g.shadowColor = mixc(C, 0.5, 0.8); g.shadowBlur = glow ? 6 : 0; g.stroke(); g.shadowBlur = 0;
      FREQS.forEach((f, i) => { const x = fx(f) * W, y = my - clamp(gains[i] / MAXDB, -1, 1) * ah * 0.42; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 2.6, 0, 6.2832); g.fill(); g.strokeStyle = mixc(C, i / 4, 1); g.lineWidth = 1.2; g.stroke(); }); g.restore();
    } else { g.save(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.setLineDash([3, 4]); const my = (base + top) / 2; g.beginPath(); g.moveTo(0, my); g.lineTo(W, my); g.stroke(); g.restore(); }
  }
  function loop(ts) {
    V.raf = 0; if (!V.c || !V.c.isConnected || !V.c.offsetParent) return; if (ts - V.last < 22) { V.raf = requestAnimationFrame(loop); return; } V.last = ts;
    const live = !!V.live() && !reduced(); draw(ts, live); if (live || V.hot) V.raf = requestAnimationFrame(loop);
  }
  function wake() { if (V.raf || !V.c) return; V.raf = requestAnimationFrame(loop); }
  function attach(canvas, live, ext) { V.ext = ext || null; V.c = canvas; V.g = canvas.getContext('2d'); V.live = live || (() => false); V.w = V.h = 0; V.vals.fill(0); V.peaks.fill(0); wake(); }
  function paint() { if (!V.c) return; try { draw(performance.now(), false); } catch (_) {} wake(); }

  /* ---------------- Öffentliche Schnittstelle ---------------- */
  window.PlSound = {
    PRESETS, BAND_NAMES, FREQS, MAXDB, byId, ensure, resume, wake, attach, paint, coverData,
    bind(au) { E.au = au; },
    /* Ausblenden (Schlaf-Timer): 1 = volle Lautstärke, 0 = still; wirkt vor der Anzeige, auch wenn der Graph erst später entsteht */
    fade(v) { E.fadeV = clamp(+v || 0, 0, 1); if (E.ok) { try { E.fade.gain.setTargetAtTime(E.fadeV, E.ctx.currentTime, 0.12); } catch (_) {} } return E.fadeV; }, fadeNow: () => E.fadeV,
    gainsFor(id, custom) { const p = byId(id); return id === 'custom' ? (custom || [0, 0, 0, 0, 0]).slice(0, 5) : p.g.slice(); },
    set(id, custom, needGraph) { V.id = byId(id).id; const g = this.gainsFor(V.id, custom); E.gains = g.map(v => clamp(Math.round(+v || 0), -MAXDB, MAXDB)); if (needGraph) ensure(); apply(false); paint(); return E.gains.slice(); },
    _filters: () => E.f, _pre: () => E.pre,
    gains: () => E.gains.slice(), active: () => E.ok, failed: () => E.failed, state: () => (E.ctx ? E.ctx.state : 'none'), view: () => V, curveAt, style: id => byId(id).vz,
    /* Anzeige schon ohne Wiedergabe: einmal zeichnen */
    peekBands: (n) => { if (!E.ok) return null; const o = new Float32Array(n); E.an.getByteFrequencyData(E.buf); return bands(n, o); }
  };
})();
