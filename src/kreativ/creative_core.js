/* ===== Sunshine@R: Kreativ-Kern – Tonart-Erkennung, Tonhöhe/Tempo (WSOLA), Beat-Slicer ===== */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const tick = () => new Promise(r => setTimeout(r, 0));
  function fftFn() { return window.StudioAI.dsp.makeFFT; }

  /* ---------------------------------------------------------------- Tonart */
  /* Krumhansl-Schmuckler-Profile */
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  function corr(a, b) {
    let ma = 0, mb = 0; for (let i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; } ma /= 12; mb /= 12;
    let s = 0, sa = 0, sb = 0; for (let i = 0; i < 12; i++) { const x = a[i] - ma, y = b[i] - mb; s += x * y; sa += x * x; sb += y * y; }
    return sa > 0 && sb > 0 ? s / Math.sqrt(sa * sb) : 0;
  }
  /* chroma → Ergebnis */
  function keyFromChroma(ch) {
    const sc = [];
    for (let r = 0; r < 12; r++) {
      const rot = new Array(12); for (let i = 0; i < 12; i++) rot[i] = ch[(i + r) % 12];
      sc.push({ root: r, mode: 'major', r: corr(rot, MAJ) }); sc.push({ root: r, mode: 'minor', r: corr(rot, MIN) });
    }
    sc.sort((a, b) => b.r - a.r);
    const b = sc[0], s2 = sc[1];
    /* parallele Tonart (Dur ↔ relatives Moll) ist musikalisch verwandt: Unterschied zur nächsten *nicht* verwandten Tonart zählt */
    const rel = b.mode === 'major' ? { root: (b.root + 9) % 12, mode: 'minor' } : { root: (b.root + 3) % 12, mode: 'major' };
    const other = sc.find(k => !(k.root === rel.root && k.mode === rel.mode) && k !== b) || s2;
    const conf = 0.6 * clamp((b.r - 0.55) / 0.35, 0, 1) + 0.4 * clamp((b.r - other.r) * 10, 0, 1);
    return { root: b.root, mode: b.mode, name: NAMES[b.root] + (b.mode === 'major' ? ' Dur' : ' Moll'), short: NAMES[b.root] + (b.mode === 'major' ? '' : 'm'),
      relative: { root: rel.root, mode: rel.mode, name: NAMES[rel.root] + (rel.mode === 'major' ? ' Dur' : ' Moll') }, r: b.r, confidence: conf,
      top: sc.slice(0, 3).map(k => ({ root: k.root, mode: k.mode, name: NAMES[k.root] + (k.mode === 'major' ? ' Dur' : ' Moll'), r: k.r })), chroma: Array.from(ch) };
  }
  /* bufs: Liste von AudioBuffer (werden gemischt analysiert). opt: {maxSec, startSec} */
  function detectKey(bufs, opt) {
    opt = opt || {}; bufs = [].concat(bufs).filter(Boolean);
    if (!bufs.length) return { error: 'Kein Audio zum Analysieren.' };
    const D = window.StudioAI.dsp, maxSec = opt.maxSec || 100, N = 8192, HOP = 4096, TS = 11025, fft = fftFn()(N);
    let mix = null, sr = 0;
    bufs.forEach(b => {
      const m = D.toMono(b, maxSec, opt.startSec || 0);
      const f = Math.max(1, Math.round(m.sr / TS)), n = Math.floor(m.x.length / f), y = new Float32Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < f; k++) s += m.x[i * f + k]; y[i] = s / f; }
      const rate = m.sr / f; if (!mix) { mix = y; sr = rate; } else if (Math.abs(rate - sr) < 1) { const L = Math.min(mix.length, y.length), z = new Float32Array(L); for (let i = 0; i < L; i++) z[i] = mix[i] + y[i]; mix = z; }
    });
    if (!mix || mix.length < N) return { error: 'Audio zu kurz für die Tonart-Erkennung (mind. ca. 1 s).' };
    const re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const kLo = Math.ceil(65 * N / sr), kHi = Math.min(N / 2 - 2, Math.floor(2200 * N / sr));
    const peaks = []; let frames = 0, energy = 0;
    for (let off = 0; off + N <= mix.length; off += HOP) {
      let e = 0; for (let i = 0; i < N; i++) { const v = mix[off + i]; re[i] = v * win[i]; im[i] = 0; e += v * v; }
      if (e / N < 1e-8) continue; fft(re, im); frames++; energy += e;
      const mag = new Float64Array(kHi + 2); let mx = 0; for (let k = kLo - 1; k <= kHi + 1; k++) { mag[k] = Math.hypot(re[k], im[k]); }
      for (let k = kLo; k <= kHi; k++) if (mag[k] > mx) mx = mag[k];
      const thr = mx * 0.06, fp = [];
      for (let k = kLo; k <= kHi; k++) {
        const m = mag[k]; if (m < thr || m <= mag[k - 1] || m < mag[k + 1]) continue;
        const a = Math.log(mag[k - 1] + 1e-12), b = Math.log(m + 1e-12), c = Math.log(mag[k + 1] + 1e-12), den = a - 2 * b + c, d = den ? 0.5 * (a - c) / den : 0;
        fp.push({ f: (k + d) * sr / N, m: m / mx });
      }
      /* Obertöne dämpfen: die 3. und 5. Harmonische eines starken Tons zählen nicht als eigene Note (sonst bevorzugt die Quinte) */
      const base = fp.map(q => q.m);
      for (let i = 0; i < fp.length; i++) for (const [h, w] of [[3, 0.6], [5, 0.35]]) for (let j = i + 1; j < fp.length; j++) {
        const dv = Math.abs(Math.log2(fp[j].f / (h * fp[i].f))); if (dv < 0.03) fp[j].m = Math.max(0, fp[j].m - w * base[i]); else if (fp[j].f > h * fp[i].f * 1.05) break;
      }
      fp.forEach(q => { if (q.m > 0.03) peaks.push([69 + 12 * Math.log2(q.f / 440), Math.pow(q.m, 1.3)]); });
    }
    if (!frames || !peaks.length) return { error: 'Zu leise oder kein tonales Material gefunden.' };
    /* Stimmung (Abweichung von 440 Hz) per gewichtetem Kreismittel */
    let sx = 0, sy = 0; peaks.forEach(([m, w]) => { const a = 2 * Math.PI * (m - Math.round(m)); sx += w * Math.cos(a); sy += w * Math.sin(a); });
    const tune = Math.atan2(sy, sx) / (2 * Math.PI), tuneCents = Math.round(tune * 100);
    const ch = new Float64Array(12); peaks.forEach(([m, w]) => { ch[((Math.round(m - tune) % 12) + 12) % 12] += w; });
    const tot = ch.reduce((s, v) => s + v, 0) || 1; for (let i = 0; i < 12; i++) ch[i] /= tot;
    const r = keyFromChroma(ch); if (opt.debug) r.peaks = peaks.slice(0, 40); r.tuneCents = tuneCents; r.frames = frames; return r;
  }

  /* ------------------------------------------------- Resample & WSOLA-Dehnung */
  function resample(x, factor) { /* factor>1: schneller (kürzer, höher). kubisch (Catmull-Rom) */
    const n = Math.max(1, Math.floor(x.length / factor)), y = new Float32Array(n), L = x.length;
    for (let i = 0; i < n; i++) {
      const p = i * factor, i1 = Math.floor(p), f = p - i1, a = x[Math.max(0, i1 - 1)], b = x[Math.min(L - 1, i1)], c = x[Math.min(L - 1, i1 + 1)], d = x[Math.min(L - 1, i1 + 2)];
      y[i] = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
    }
    return y;
  }
  /* chs: Float32Array[] · ratio = Ausgabelänge / Eingabelänge (1.25 = langsamer) · Ergebnis: Float32Array[] */
  async function wsola(chs, sr, ratio, opt) {
    opt = opt || {}; ratio = clamp(ratio, 0.25, 4);
    const nc = chs.length, L = chs[0].length, N = 2 * Math.round(sr * 0.023), Hs = N / 2, Ha = Hs / ratio, TOL = Math.round(N / 4), DEC = 4;
    const outLen = Math.max(1, Math.round(L * ratio)), out = chs.map(() => new Float32Array(outLen + N * 2)), norm = new Float32Array(outLen + N * 2);
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / N);
    const mono = new Float32Array(L); for (let c = 0; c < nc; c++) { const d = chs[c]; for (let i = 0; i < L; i++) mono[i] += d[i] / nc; }
    const dm = new Float32Array(Math.ceil(L / DEC)); for (let i = 0; i < dm.length; i++) { let s = 0, k = 0; for (; k < DEC && i * DEC + k < L; k++) s += mono[i * DEC + k]; dm[i] = s / k; }
    const nF = Math.ceil((outLen + Hs) / Hs); let prev = 0, t0 = performance.now();
    const sd = N / DEC, hd = Hs / DEC;
    for (let f = 0; f < nF; f++) {
      const ideal = Math.round(f * Ha); let pos = ideal;
      if (f > 0) {
        /* Ziel: die natürliche Fortsetzung des vorigen Fensters (prev+Hs) – beste Übereinstimmung in ±TOL suchen */
        const tgt = Math.floor((prev + Hs) / DEC); let best = -Infinity, bi = 0; const lo = Math.max(-TOL, -ideal), hi = TOL;
        const loD = Math.ceil(lo / DEC), hiD = Math.floor(hi / DEC);
        for (let s = loD; s <= hiD; s++) {
          const a = Math.floor(ideal / DEC) + s; if (a < 0 || a + sd > dm.length || tgt + sd > dm.length) continue;
          let dot = 0, e = 1e-9; for (let i = 0; i < sd; i += 2) { const v = dm[a + i]; dot += v * dm[tgt + i]; e += v * v; }
          const sc = dot / Math.sqrt(e); if (sc > best) { best = sc; bi = s * DEC; }
        }
        pos = ideal + bi;
        /* Feinsuche auf voller Rate */
        let bb = 0; best = -Infinity; const tg = prev + Hs;
        for (let s = -DEC; s <= DEC; s++) { const a = pos + s; if (a < 0 || a + N > L || tg + N > L) continue; let dot = 0, e = 1e-9; for (let i = 0; i < N; i += 3) { const v = mono[a + i]; dot += v * mono[tg + i]; e += v * v; } const sc = dot / Math.sqrt(e); if (sc > best) { best = sc; bb = s; } }
        pos += bb;
      }
      pos = clamp(pos, 0, Math.max(0, L - 1));
      const o = f * Hs; if (o >= outLen + Hs) break;
      for (let c = 0; c < nc; c++) { const src = chs[c], dst = out[c]; for (let i = 0; i < N; i++) { const si = pos + i; if (si >= L) break; dst[o + i] += src[si] * win[i]; } }
      for (let i = 0; i < N; i++) norm[o + i] += win[i];
      prev = pos;
      if (opt.onProgress && (f & 63) === 0) opt.onProgress(f / nF);
      if (performance.now() - t0 > 40) { await tick(); t0 = performance.now(); if (opt.cancel && opt.cancel()) throw new Error('abgebrochen'); }
    }
    return out.map(d => { const r = new Float32Array(outLen); for (let i = 0; i < outLen; i++) r[i] = norm[i] > 1e-3 ? d[i] / norm[i] : d[i]; return r; });
  }
  async function stretchChannels(chs, sr, ratio, opt) { return Math.abs(ratio - 1) < 1e-4 ? chs.map(c => c.slice()) : wsola(chs, sr, ratio, opt); }
  /* Tonhöhe um `semis` Halbtöne (±) verschieben, Länge bleibt. */
  async function pitchChannels(chs, sr, semis, opt) {
    if (!semis) return chs.map(c => c.slice());
    const p = Math.pow(2, semis / 12), L = chs[0].length;
    const st = await wsola(chs, sr, p, opt);                 /* p-fach länger (Tonhöhe unverändert) … */
    return st.map(d => { const r = resample(d, p); const o = new Float32Array(L); o.set(r.subarray(0, Math.min(L, r.length))); return o; });  /* … dann p-fach schneller abspielen */
  }
  function toBuffer(ctx, chs, sr) { const b = ctx.createBuffer(chs.length, chs[0].length, sr); chs.forEach((d, i) => b.copyToChannel(d, i)); return b; }
  function chansOf(buf) { const o = []; for (let c = 0; c < buf.numberOfChannels; c++) o.push(buf.getChannelData(c)); return o; }
  async function pitchBuffer(ctx, buf, semis, opt) { return toBuffer(ctx, await pitchChannels(chansOf(buf), buf.sampleRate, semis, opt), buf.sampleRate); }
  async function stretchBuffer(ctx, buf, ratio, opt) { return toBuffer(ctx, await stretchChannels(chansOf(buf), buf.sampleRate, ratio, opt), buf.sampleRate); }
  /* kürzester Weg (−6 … +5 Halbtöne) von Tonart a nach b (Wurzeltöne) */
  function semiDist(fromRoot, toRoot) { let d = ((toRoot - fromRoot) % 12 + 12) % 12; if (d > 6) d -= 12; return d; }

  /* -------------------------------------------------------------- Beat-Slicer */
  /* Onset-Erkennung per Spektralfluss. Rückgabe sortiert: [{t, s}] (t in Sekunden, s Stärke 0…1) */
  function onsets(buf, opt) {
    opt = opt || {}; const D = window.StudioAI.dsp, m = D.toMono(buf, opt.maxSec || 60, opt.startSec || 0), x = m.x, sr = m.sr, N = 1024, HOP = 256, fft = fftFn()(N);
    const re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const T = Math.max(0, Math.floor((x.length - N) / HOP) + 1), flux = new Float32Array(T), kHi = Math.min(N / 2 - 1, Math.floor(10000 * N / sr));
    let prev = new Float32Array(N / 2);
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < N; i++) { re[i] = x[t * HOP + i] * win[i]; im[i] = 0; } fft(re, im);
      let f = 0; const cur = new Float32Array(N / 2);
      for (let k = 2; k <= kHi; k++) { const v = Math.log(1 + 100 * Math.hypot(re[k], im[k]) / N * 8); cur[k] = v; if (t > 0) { const d = v - prev[k]; if (d > 0) f += d; } }
      flux[t] = f; prev = cur;
    }
    const w = 12, sens = clamp(opt.sens == null ? 0.5 : opt.sens, 0, 1), k = 2.2 - 1.8 * sens;   /* höhere Empfindlichkeit → niedrigere Schwelle */
    let mx = 0; for (let i = 0; i < T; i++) if (flux[i] > mx) mx = flux[i];
    const res = [], minGap = Math.round((opt.minGapSec || 0.06) * sr / HOP);
    for (let i = 1; i < T - 1; i++) {
      if (flux[i] < flux[i - 1] || flux[i] <= flux[i + 1]) continue;
      const a = Math.max(0, i - w), b = Math.min(T, i + w + 1); let s = 0; for (let j = a; j < b; j++) s += flux[j]; const mean = s / (b - a);
      if (flux[i] > mean * (1 + k * 0.5) + 0.04 * mx) {
        const t = (i * HOP + N / 2 - HOP) / sr + (opt.startSec || 0), str = clamp(flux[i] / (mx || 1), 0, 1);
        if (res.length && i - res[res.length - 1]._i < minGap) { if (str > res[res.length - 1].s) { res[res.length - 1].t = t; res[res.length - 1].s = str; res[res.length - 1]._i = i; } continue; }
        res.push({ t: Math.max(0, t), s: str, _i: i });
      }
    }
    return res.map(o => ({ t: o.t, s: o.s }));
  }
  /* Schnittpunkt zur Vermeidung von Klicks: kurz vor dem Onset den leisesten Punkt (Nulldurchgang) suchen */
  function snapStart(buf, t) {
    const sr = buf.sampleRate, d = buf.getChannelData(0), c = Math.round(t * sr), a = Math.max(1, c - Math.round(0.004 * sr)), b = Math.min(d.length - 2, c);
    let best = c, bv = Infinity; for (let i = a; i <= b; i++) { const v = Math.abs(d[i]) + 0.5 * Math.abs(d[i + 1] - d[i - 1]); if (v < bv) { bv = v; best = i; } }
    return best / sr;
  }
  /* Slices bestimmen. mode: 'transient' | 'grid'. Ergebnis: [{start, end, s}] (Sekunden, lückenlos bis Dateiende bzw. endSec) */
  function makeSlices(buf, opt) {
    opt = opt || {}; const dur = buf.duration, endSec = opt.endSec || dur, startSec = opt.startSec || 0, max = opt.max || 16; let starts = [];
    if (opt.mode === 'grid') {
      const bpm = opt.bpm || 120, step = (60 / bpm) * 4 * (opt.grid || 1 / 16), t0 = opt.firstSec || startSec;
      for (let t = t0; t < endSec - 0.01; t += step) starts.push({ t, s: 1 });
    } else {
      starts = onsets(buf, { sens: opt.sens, maxSec: endSec - startSec, startSec, minGapSec: opt.minGapSec });
      if (!starts.length || starts[0].t > startSec + 0.03) starts.unshift({ t: startSec, s: 1 });
    }
    if (starts.length > max) { /* die stärksten behalten (erster Slice bleibt), Reihenfolge nach Zeit */
      const first = starts[0], rest = starts.slice(1).sort((a, b) => b.s - a.s).slice(0, max - 1).sort((a, b) => a.t - b.t); starts = [first].concat(rest);
    }
    return starts.map((o, i) => { const st = i === 0 && opt.mode !== 'grid' ? o.t : snapStart(buf, o.t), nx = i + 1 < starts.length ? snapStart(buf, starts[i + 1].t) : endSec; return { start: st, end: Math.max(st + 0.005, Math.min(nx, endSec)), s: o.s }; });
  }
  /* Pattern rendern. slices: [{start,end}], steps: Array(n) mit Slice-Index (0…) oder -1 (Pause) · bpm · stepsPerBar (16) */
  function renderPattern(ctx, buf, slices, steps, opt) {
    opt = opt || {}; const sr = buf.sampleRate, bpm = opt.bpm || 120, step16 = 60 / bpm / 4, n = steps.length, swing = clamp(opt.swing || 0, 0, 0.6), bars = Math.max(1, opt.bars || 1), per = steps.length;
    const len = Math.ceil(per * bars * step16 * sr), nc = Math.max(1, Math.min(2, buf.numberOfChannels)), out = []; for (let c = 0; c < nc; c++) out.push(new Float32Array(len));
    const fade = Math.round(0.003 * sr), g = opt.gain == null ? 1 : opt.gain;
    for (let bar = 0; bar < bars; bar++) for (let i = 0; i < n; i++) {
      const v = steps[i]; if (v == null || v < 0 || !slices[v]) continue;
      const sw = (i % 2 === 1 ? swing * step16 : 0), at = Math.round(((bar * per + i) * step16 + sw) * sr); if (at >= len) continue;
      const s = slices[v], s0 = Math.round(s.start * sr), s1 = Math.round(s.end * sr); let l = Math.min(s1 - s0, len - at);
      /* Choke: nächster Auslöser beendet diesen Slice */
      for (let j = i + 1; j < n; j++) if (steps[j] != null && steps[j] >= 0 && slices[steps[j]]) { const nat = Math.round(((bar * per + j) * step16 + (j % 2 === 1 ? swing * step16 : 0)) * sr); l = Math.min(l, nat - at); break; }
      if (l <= 1) continue; const rev = opt.reverse && opt.reverse[i];
      for (let c = 0; c < nc; c++) {
        const src = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1)), dst = out[c], f = Math.min(fade, l >> 1);
        for (let k = 0; k < l; k++) { let a = 1; if (k < f) a = k / f; else if (k > l - f) a = (l - k) / f; dst[at + k] += src[rev ? s1 - 1 - k : s0 + k] * a * g; }
      }
    }
    return toBuffer(ctx, out, sr);
  }

  /* ---------------------------------------------------------- Strukturmarker */
  /* Marker = {id, t (Sekunden), name, color}; liegen in dawState.markers (wird im Projekt mitgespeichert) */
  const MK = {
    list() { const m = (typeof dawState !== 'undefined' && dawState.markers) || []; return m.slice().sort((a, b) => a.t - b.t); },
    add(t, name, color) { if (!dawState.markers) dawState.markers = []; const m = { id: 'mk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: Math.max(0, +t || 0), name: (name || 'Marker').slice(0, 24), color: color || '#f59e0b' }; dawState.markers.push(m); return m; },
    remove(id) { const n = (dawState.markers || []).length; dawState.markers = (dawState.markers || []).filter(m => m.id !== id); return n - dawState.markers.length; },
    rename(id, name) { const m = (dawState.markers || []).find(x => x.id === id); if (m) m.name = String(name).slice(0, 24); return !!m; },
    move(id, t) { const m = (dawState.markers || []).find(x => x.id === id); if (m) m.t = Math.max(0, +t || 0); return !!m; },
    next(from) { return MK.list().find(m => m.t > from + 0.05) || null; },
    prev(from) { const l = MK.list().filter(m => m.t < from - 0.5); return l.length ? l[l.length - 1] : null; },
    /* aus den Arrangement-Abschnitten (Intro/Strophe/…) */
    fromSections(bpm) {
      const bar = 4 * 60 / bpm; let t = 0; const out = [];
      (dawState.sections || []).forEach(s => { out.push({ t, name: s.name, color: s.color }); t += s.bars * bar; }); return out;
    },
    /* Strukturvorschlag aus der Energie-Kurve: Sprünge im gleitenden Pegel (Takt-genau, wenn bpm bekannt) */
    detect(bufs, opt) {
      opt = opt || {}; bufs = [].concat(bufs).filter(Boolean); if (!bufs.length) return [];
      const sr = bufs[0].sampleRate, hop = Math.round(sr * 0.25), dur = Math.max(...bufs.map(b => b.duration)), nF = Math.floor(dur * sr / hop), e = new Float32Array(nF);
      bufs.forEach(b => { const d = b.getChannelData(0); for (let f = 0; f < nF; f++) { let s = 0; const a = f * hop, z = Math.min(d.length, a + hop); for (let i = a; i < z; i += 4) s += d[i] * d[i]; e[f] += s / Math.max(1, (z - a) / 4); } });
      const db = Array.from(e, v => 10 * Math.log10(v + 1e-10)), bar = opt.bpm ? 4 * 60 / opt.bpm : 8, w = Math.max(4, Math.round(bar * 4 * 0.5 / 1));
      const sc = new Float32Array(nF); for (let i = w; i < nF - w; i++) { let a = 0, b = 0; for (let k = 1; k <= w; k++) { a += db[i - k]; b += db[i + k - 1]; } sc[i] = Math.abs(b - a) / w; }
      const res = [{ t: 0, s: 99 }]; const minGap = bar * 4 / 0.25;
      const idx = []; for (let i = w; i < nF - w; i++) if (sc[i] > 2.5 && sc[i] >= sc[i - 1] && sc[i] > sc[i + 1]) idx.push(i);
      idx.sort((a, b) => sc[b] - sc[a]); const keep = [];
      idx.forEach(i => { if (keep.every(j => Math.abs(i - j) >= minGap)) keep.push(i); });
      keep.sort((a, b) => a - b).forEach(i => { let t = i * 0.25; if (opt.bpm) t = Math.round(t / bar) * bar; if (t > 1 && t < dur - 2 && res.every(r => Math.abs(r.t - t) > bar * 2)) res.push({ t, s: sc[i] }); });
      return res.sort((a, b) => a.t - b.t).map((r, i) => ({ t: r.t, name: 'Teil ' + (i + 1) }));
    }
  };

  window.Creative = { NAMES, detectKey, keyFromChroma, wsola, resample, stretchChannels, pitchChannels, pitchBuffer, stretchBuffer, semiDist, onsets, makeSlices, renderPattern, toBuffer, chansOf, Markers: MK, version: 1 };
})();
