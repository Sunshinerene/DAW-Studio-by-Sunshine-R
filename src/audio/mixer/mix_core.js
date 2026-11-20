/* ===== Sunshine@R: Automation (Lautstärke · Pan · Filter) + Lautheitsmessung (ITU-R BS.1770 / EBU R128) ===== */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ------------------------------------------------------------ Automation */
  /* tr.auto = { vol:[{t,v}], pan:[{t,v}], filt:[{t,v}] }  (t in Sekunden der Zeitleiste, nach Zeit sortiert)
     Wirkung relativ zum Fader: vol = Multiplikator (1 = Fader-Wert), pan = Versatz zum Pan-Regler, filt = zusätzlicher Hochpass 0…1 → 20 Hz … 8 kHz. */
  const P = {
    vol:  { label: 'Lautstärke', short: 'Pegel', min: 0, max: 2, def: 1, log: false },
    pan:  { label: 'Panorama', short: 'Pan', min: -1, max: 1, def: 0, log: false },
    filt: { label: 'Filter (Hochpass)', short: 'Filter', min: 0, max: 1, def: 0, log: true }
  };
  const FILT_LO = 20, FILT_HI = 8000;
  const mapVal = (k, v) => k === 'filt' ? (v <= 0.002 ? 0 : FILT_LO * Math.pow(FILT_HI / FILT_LO, clamp(v, 0, 1))) : v;
  const fmtVal = (k, v) => {
    if (k === 'vol') return v <= 0.001 ? '−∞ dB' : ((20 * Math.log10(v) >= 0 ? '+' : '') + (20 * Math.log10(v)).toFixed(1).replace('-', '−') + ' dB');
    if (k === 'pan') return Math.abs(v) < 0.02 ? 'Mitte' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v) * 100) + ' %';
    const hz = mapVal(k, v); return hz === 0 ? 'aus' : (hz >= 1000 ? (hz / 1000).toFixed(1) + ' kHz' : Math.round(hz) + ' Hz');
  };
  const get = (tr, k) => (tr.auto && Array.isArray(tr.auto[k])) ? tr.auto[k] : [];
  const has = (tr, k) => k ? get(tr, k).length > 0 : Object.keys(P).some(x => get(tr, x).length > 0);
  const sortPts = (tr, k) => { if (tr.auto && tr.auto[k]) tr.auto[k].sort((a, b) => a.t - b.t); };
  function add(tr, k, t, v) {
    if (!tr.auto) tr.auto = {}; if (!tr.auto[k]) tr.auto[k] = [];
    const pt = { t: Math.max(0, t), v: clamp(v, P[k].min, P[k].max) }; tr.auto[k].push(pt); sortPts(tr, k); return pt;
  }
  function remove(tr, k, pt) { if (!tr.auto || !tr.auto[k]) return; tr.auto[k] = tr.auto[k].filter(p => p !== pt); if (!tr.auto[k].length) delete tr.auto[k]; if (!Object.keys(tr.auto).length) delete tr.auto; }
  function clear(tr, k) { if (!tr.auto) return; if (k) delete tr.auto[k]; else tr.auto = {}; if (!Object.keys(tr.auto).length) delete tr.auto; }
  function valueAt(pts, t, def) {
    if (!pts.length) return def; if (t <= pts[0].t) return pts[0].v; const l = pts[pts.length - 1]; if (t >= l.t) return l.v;
    for (let i = 1; i < pts.length; i++) if (t <= pts[i].t) { const a = pts[i - 1], b = pts[i]; return b.t === a.t ? b.v : a.v + (b.v - a.v) * (t - a.t) / (b.t - a.t); }
    return l.v;
  }
  /* Ein Kurvenstück auf einen AudioParam legen: ab Zeitleisten-Position offsetSec zur Kontextzeit when bis (optional) stopAt */
  function applyParam(param, k, pts, when, offsetSec, stopAt) {
    const d = P[k].def;
    try { param.cancelScheduledValues(when); } catch (_) {}
    if (!pts.length) { param.setValueAtTime(mapVal(k, d), when); return; }
    param.setValueAtTime(mapVal(k, valueAt(pts, offsetSec, d)), when);
    let prevT = offsetSec, prevV = valueAt(pts, offsetSec, d);
    for (const p of pts) {
      if (p.t <= offsetSec + 1e-6) continue;
      const at = when + (p.t - offsetSec); if (stopAt != null && at > stopAt + 1e-6) break;
      if (P[k].log) {                                       /* Filterweg: in Hz-Schritten annähern, damit die Fahrt gleichmäßig klingt */
        const n = Math.min(300, Math.max(1, Math.ceil((p.t - prevT) / 0.04)));
        for (let i = 1; i <= n; i++) { const f = i / n; param.linearRampToValueAtTime(mapVal(k, prevV + (p.v - prevV) * f), when + (prevT + (p.t - prevT) * f - offsetSec)); }
      } else param.linearRampToValueAtTime(mapVal(k, p.v), at);
      prevT = p.t; prevV = p.v;
    }
  }
  const targets = (n) => n ? { vol: n.autoGain && n.autoGain.gain, pan: n.panAuto && n.panAuto.offset, filt: n.filtAuto && n.filtAuto.offset } : {};
  function scheduleTrack(tr, nodes, when, offsetSec, stopAt) {
    const T = targets(nodes), off = tr.autoOff === true;
    Object.keys(P).forEach(k => { if (T[k]) applyParam(T[k], k, off ? [] : get(tr, k), when, offsetSec, stopAt); });
  }
  function schedule(eng, when, offsetSec, stopAt) { dawState.tracks.forEach(tr => scheduleTrack(tr, eng.channelNodes[tr.id], when, offsetSec, stopAt)); }
  function scheduleOffline(tr, nodes, totalSec) { scheduleTrack(tr, nodes, 0, 0, totalSec); }
  function reset(eng) {
    const now = eng.ctx ? eng.ctx.currentTime : 0;
    Object.values(eng.channelNodes || {}).forEach(n => { const T = targets(n); Object.keys(P).forEach(k => { const p = T[k]; if (!p) return; try { p.cancelScheduledValues(0); p.setValueAtTime(mapVal(k, P[k].def), now); } catch (_) {} }); });
  }

  /* ------------------------------------------------------------ Lautheit (BS.1770-4) */
  function kCoeffs(fs) {
    const f1 = 1681.974450955533, G = 3.999843853973347, Q1 = 0.7071752369554196;
    let K = Math.tan(Math.PI * f1 / fs); const Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416); let a0 = 1 + K / Q1 + K * K;
    const s1 = { b: [(Vh + Vb * K / Q1 + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q1 + K * K) / a0], a: [1, 2 * (K * K - 1) / a0, (1 - K / Q1 + K * K) / a0] };
    const f2 = 38.13547087602444, Q2 = 0.5003270373238773; K = Math.tan(Math.PI * f2 / fs); a0 = 1 + K / Q2 + K * K;
    const s2 = { b: [1, -2, 1], a: [1, 2 * (K * K - 1) / a0, (1 - K / Q2 + K * K) / a0] };
    return [s1, s2];
  }
  function biquad(x, c) {
    const y = new Float32Array(x.length), b0 = c.b[0], b1 = c.b[1], b2 = c.b[2], a1 = c.a[1], a2 = c.a[2];
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const xi = x[i], yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; y[i] = yi; x2 = x1; x1 = xi; y2 = y1; y1 = yi; }
    return y;
  }
  const kWeight = (x, fs) => { const [s1, s2] = kCoeffs(fs); return biquad(biquad(x, s1), s2); };
  const lufs = ms => ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity;
  /* Mittlere Quadrate je Block (Länge winSec, Schritt hopSec) über alle Kanäle (Gewicht 1) */
  function blockMS(chs, fs, winSec, hopSec) {
    const n = chs[0].length, win = Math.round(winSec * fs), hop = Math.round(hopSec * fs); if (n < win) return [];
    const cs = chs.map(c => { const s = new Float64Array(n + 1); let a = 0; for (let i = 0; i < n; i++) { a += c[i] * c[i]; s[i + 1] = a; } return s; });
    const out = []; for (let st = 0; st + win <= n; st += hop) { let m = 0; for (const s of cs) m += (s[st + win] - s[st]) / win; out.push(m); } return out;
  }
  function percentile(a, p) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
  function truePeak(chs) {
    let pk = 0, tp = 0; for (const c of chs) { const n = c.length;
      for (let i = 0; i < n; i++) { const a = Math.abs(c[i]); if (a > pk) pk = a; }
      for (let i = 1; i < n - 2; i++) { const a = Math.abs(c[i]), b = Math.abs(c[i + 1]); if (Math.max(a, b) < pk * 0.7) continue;     /* 4× Catmull-Rom nur nahe dem Maximum */
        const p0 = c[i - 1], p1 = c[i], p2 = c[i + 1], p3 = c[i + 2];
        for (let k = 1; k < 4; k++) { const t = k / 4, v = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t); const av = Math.abs(v); if (av > tp) tp = av; } } }
    tp = Math.max(tp, pk); const db = v => v > 0 ? 20 * Math.log10(v) : -Infinity; return { samplePeakDb: db(pk), truePeakDb: db(tp) };
  }
  /* buffer: AudioBuffer → {integrated, shortTermMax, momentaryMax, lra, samplePeakDb, truePeakDb, seconds} */
  async function measure(buffer) {
    const fs = buffer.sampleRate, raw = []; for (let c = 0; c < buffer.numberOfChannels; c++) raw.push(buffer.getChannelData(c));
    const chs = []; for (const r of raw) { chs.push(kWeight(r, fs)); await new Promise(r2 => setTimeout(r2, 0)); }
    const mom = blockMS(chs, fs, 0.4, 0.1), st = blockMS(chs, fs, 3, 1);
    const res = { seconds: buffer.duration, integrated: -Infinity, shortTermMax: -Infinity, momentaryMax: -Infinity, lra: 0 };
    if (mom.length) {
      const abs = mom.filter(m => lufs(m) > -70);
      if (abs.length) { const mean1 = abs.reduce((a, b) => a + b, 0) / abs.length, rel = lufs(mean1) - 10; const g = abs.filter(m => lufs(m) > rel); if (g.length) res.integrated = lufs(g.reduce((a, b) => a + b, 0) / g.length); }
      res.momentaryMax = lufs(Math.max.apply(null, mom));
    }
    if (st.length) {
      res.shortTermMax = lufs(Math.max.apply(null, st));
      const sl = st.map(lufs).filter(v => v > -70); if (sl.length) { const mean = lufs(sl.map(v => Math.pow(10, (v + 0.691) / 10)).reduce((a, b) => a + b, 0) / sl.length), g = sl.filter(v => v > mean - 20); if (g.length > 1) res.lra = percentile(g, 0.95) - percentile(g, 0.10); }
    }
    Object.assign(res, truePeak(raw)); return res;
  }
  const TARGETS = [
    { id: 'spotify', name: 'Spotify / YouTube / Tidal', lufs: -14, tp: -1 },
    { id: 'apple', name: 'Apple Music', lufs: -16, tp: -1 },
    { id: 'soundcloud', name: 'SoundCloud / Suno', lufs: -14, tp: -1 },
    { id: 'loud', name: 'Laut (Club / Radio)', lufs: -9, tp: -0.5 },
    { id: 'master', name: 'Mastering-Reserve (CD)', lufs: -12, tp: -1 }
  ];

  window.AutoModel = { P, FILT_LO, FILT_HI, mapVal, fmtVal, get, has, add, remove, clear, sortPts, valueAt, schedule, scheduleOffline, scheduleTrack, reset, applyParam };
  window.Loudness = { kCoeffs, kWeight, measure, lufs, TARGETS, blockMS };
})();

/* Ausschnitt eines AudioBuffers (mit 5-ms-Kantenblenden) – für Bereichs-Export */
window.__sliceBuf = function (buf, startSec, endSec) {
  const sr = buf.sampleRate, s = Math.max(0, Math.floor(startSec * sr)), e = Math.min(buf.length, endSec ? Math.ceil(endSec * sr) : buf.length), len = Math.max(1, e - s);
  const out = new AudioBuffer({ length: len, numberOfChannels: buf.numberOfChannels, sampleRate: sr }), f = Math.min(Math.floor(0.005 * sr), len >> 1);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = out.getChannelData(c); d.set(buf.getChannelData(c).subarray(s, s + len)); for (let i = 0; i < f; i++) { const g = i / f; if (s > 0) d[i] *= g; if (e < buf.length) d[len - 1 - i] *= g; } }
  return out;
};
