/* ===== Sunshine@R · Studio-Assistent (lokal, ohne Server): Tempo/Takt, Auto-Mix, Rauschfilter, Lern-Pattern, Sprachbefehle ===== */
(function () {
  'use strict';
  const dsp = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- FFT ---------- */
  function makeFFT(N) {
    const rev = new Uint32Array(N), cos = new Float64Array(N / 2), sin = new Float64Array(N / 2);
    for (let i = 0, j = 0; i < N; i++) { rev[i] = j; let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; }
    for (let k = 0; k < N / 2; k++) { cos[k] = Math.cos(2 * Math.PI * k / N); sin[k] = -Math.sin(2 * Math.PI * k / N); }
    return function (re, im, inverse) {
      for (let i = 0; i < N; i++) { const j = rev[i]; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (let len = 2; len <= N; len <<= 1) {
        const h = len >> 1, step = N / len;
        for (let i = 0; i < N; i += len) for (let k = 0; k < h; k++) {
          const wr = cos[k * step], wi = inverse ? -sin[k * step] : sin[k * step];
          const a = i + k, b = a + h, xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        }
      }
      if (inverse) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
    };
  }
  dsp.makeFFT = makeFFT;

  function toMono(buf, maxSec, startSec) {
    const sr = buf.sampleRate, i0 = Math.floor((startSec || 0) * sr), n = Math.min(buf.length - i0, Math.floor((maxSec || 1e9) * sr));
    const out = new Float32Array(Math.max(0, n)), nc = buf.numberOfChannels;
    for (let c = 0; c < nc; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i0 + i] / nc; }
    return { x: out, sr };
  }
  dsp.toMono = toMono;
  function decimate(x, sr, target) {
    const f = Math.max(1, Math.round(sr / target)); if (f === 1) return { x, sr };
    const n = Math.floor(x.length / f), y = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < f; k++) s += x[i * f + k]; y[i] = s / f; }
    return { x: y, sr: sr / f };
  }

  /* ---------- Tempo & Takt ---------- */
  function onsetEnv(x0, sr0) {
    const { x, sr } = decimate(x0, sr0, 22050), N = 1024, HOP = 256, fft = makeFFT(N), re = new Float64Array(N), im = new Float64Array(N);
    const win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const kLo = Math.max(1, Math.floor(30 * N / sr)), kLoHi = Math.floor(180 * N / sr), kHi = Math.min(N / 2 - 1, Math.floor(8000 * N / sr));
    const T = Math.max(0, Math.floor((x.length - N) / HOP) + 1), env = new Float32Array(T), low = new Float32Array(T);
    let prev = new Float32Array(N / 2);
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < N; i++) { re[i] = x[t * HOP + i] * win[i]; im[i] = 0; }
      fft(re, im);
      let f = 0, l = 0; const cur = new Float32Array(N / 2);
      for (let k = kLo; k <= kHi; k++) { const m = Math.log(1 + 80 * Math.hypot(re[k], im[k]) / N * 8); cur[k] = m; if (t > 0) { const d = m - prev[k]; if (d > 0) { f += d; if (k <= kLoHi) l += d; } } }
      env[t] = f; low[t] = l; prev = cur;
    }
    return { env, low, fps: sr / HOP, lat: (N / 2) / sr };
  }
  function normEnv(e, fps) {
    const n = e.length, out = new Float32Array(n), w = Math.max(3, Math.round(fps * 0.8)), cs = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + e[i];
    let ss = 0;
    for (let i = 0; i < n; i++) { const a = Math.max(0, i - w), b = Math.min(n, i + w + 1), m = (cs[b] - cs[a]) / (b - a); const v = Math.max(0, e[i] - m); out[i] = v; ss += v * v; }
    const sd = Math.sqrt(ss / Math.max(1, n)) || 1; for (let i = 0; i < n; i++) out[i] /= sd;
    return out;
  }
  function at(a, p) { const i = Math.floor(p), f = p - i; if (i < 0 || i + 1 >= a.length) return 0; return a[i] * (1 - f) + a[i + 1] * f; }

  /* x: Mono-Float32Array, sr → {bpm, bpmApp, confidence, firstBeatSec, firstBarSec, beatsPerBar:4, candidates[], downbeatIdx} */
  dsp.detectTempo = function (x, sr, opt) {
    opt = opt || {};
    const { env: e0, low: l0, fps, lat: LAT } = onsetEnv(x, sr);
    if (e0.length < fps * 4) return { bpm: 0, bpmApp: 0, confidence: 0, error: 'Zu wenig Audio (mind. ca. 4 Sekunden).' };
    const full = normEnv(e0, fps), low = normEnv(l0, fps), n = full.length;
    const envT = new Float32Array(n); for (let i = 0; i < n; i++) envT[i] = 0.5 * full[i] + low[i];   // Kick/Tiefen zählen stärker als Hi-Hat-Rauschen
    const smooth = new Float32Array(n); for (let i = 0; i < n; i++) smooth[i] = 0.25 * (envT[Math.max(0, i - 1)] + 2 * envT[i] + envT[Math.min(n - 1, i + 1)]);
    const lagMin = Math.floor(fps * 60 / 215), lagMax = Math.ceil(fps * 60 / 55), maxL = Math.min(n - 2, lagMax * 2 + 2);
    const acf = new Float64Array(maxL + 1);
    for (let l = lagMin; l <= maxL; l++) { let sum = 0; for (let i = 0; i + l < n; i++) sum += envT[i] * envT[i + l]; acf[l] = sum / (n - l); }
    const prior = bpm => Math.exp(-0.5 * Math.pow(Math.log2(bpm / (opt.prior || 115)) / 0.6, 2));
    const comb = (period) => {
      let best = -1, bestPh = 0; const stepsN = Math.max(8, Math.round(period * 2));
      for (let st = 0; st < stepsN; st++) { const ph = period * st / stepsN; let sum = 0, cnt = 0; for (let p = ph; p < n - 1; p += period) { sum += at(smooth, p); cnt++; } sum /= Math.max(1, cnt); if (sum > best) { best = sum; bestPh = ph; } }
      return { score: best, phase: bestPh };
    };
    // Kandidaten: ACF-Spitzen + Oktav-Verwandte
    const pk = [];
    for (let l = lagMin + 1; l < Math.min(lagMax, maxL); l++) if (acf[l] > acf[l - 1] && acf[l] >= acf[l + 1] && acf[l] > 0) {
      const aa = acf[l - 1], bb = acf[l], cc = acf[l + 1], d = aa - 2 * bb + cc, off = d ? 0.5 * (aa - cc) / d : 0; pk.push({ lag: l + off, v: bb });
    }
    pk.sort((a, b) => b.v - a.v);
    const lags = []; const addLag = l => { if (l >= lagMin && l <= lagMax && !lags.some(q => Math.abs(q / l - 1) < 0.03)) lags.push(l); };
    pk.slice(0, 5).forEach(p => { addLag(p.lag); addLag(p.lag * 2); addLag(p.lag / 2); });
    if (!lags.length) return { bpm: 0, bpmApp: 0, confidence: 0, error: 'Kein klarer Puls gefunden.' };
    const scored = lags.map(l => { const c = comb(l), bpm = 60 * fps / l; return { lag: l, bpm, pt: c.score, score: c.score * prior(bpm) }; }).sort((a, b) => b.score - a.score);
    const win = scored[0];
    // Feinabstimmung ±2,4 % (reiner Kamm-Score, ohne Prior)
    let bestP = win.lag, bestS = -1, bestPh = 0;
    for (let k = -24; k <= 24; k++) { const p = win.lag * (1 + k * 0.001), r = comb(p); if (r.score > bestS) { bestS = r.score; bestP = p; bestPh = r.phase; } }
    const period = bestP, bpm = 60 * fps / period;
    // Downbeat (4/4): Tiefen-Onsets auf Zählzeit 1..4 vergleichen
    const nb = Math.floor((n - 1 - bestPh) / period) + 1, S = [0, 0, 0, 0], C = [0, 0, 0, 0];
    for (let k = 0; k < nb; k++) { const p = bestPh + k * period; let l = 0, f = 0; for (let d = -1; d <= 1; d++) { l = Math.max(l, at(low, p + d)); f = Math.max(f, at(full, p + d)); } S[k % 4] += l + 0.08 * f; C[k % 4]++; /* Snare liegt auf 2/4 – darum zählen fast nur Tiefen-Einsätze */ }
    const avg = S.map((v, i) => C[i] ? v / C[i] : 0), mean = (avg[0] + avg[1] + avg[2] + avg[3]) / 4 || 1;
    let m = 0; for (let i = 1; i < 4; i++) if (avg[i] > avg[m]) m = i;
    const dbConf = clamp((avg[m] / mean - 1) / 0.6, 0, 1);
    let mx = 0; for (let i = 0; i < n; i++) if (smooth[i] > mx) mx = smooth[i];
    let c0 = 0; while (c0 < n && smooth[c0] < 0.25 * mx) c0++;
    let k0 = Math.max(0, Math.ceil((c0 - bestPh - period * 0.5) / period)); while (k0 % 4 !== m) k0++;
    let tot = 0; for (let i = 0; i < n; i++) tot += Math.max(0, smooth[i]); tot /= n;
    const conf = clamp((bestS / (tot || 1) - 1.5) / 3.0, 0, 1);
    let app = bpm; while (app > 180) app /= 2; while (app < 60) app *= 2;
    return {
      bpm, bpmApp: Math.round(app), confidence: conf, beatPeriodSec: period / fps, firstBeatSec: bestPh / fps + LAT,
      firstBarSec: (bestPh + k0 * period) / fps + LAT, downbeatIdx: m, downbeatConfidence: dbConf,
      candidates: scored.slice(0, 3).map(t => ({ bpm: Math.round(t.bpm * 10) / 10 })), beatsPerBar: 4
    };
  };

  /* ---------- Spur-Statistik & Auto-Mix ---------- */
  dsp.trackStats = function (buf, maxSec) {
    const sr = buf.sampleRate, { x } = toMono(buf, maxSec || 90, 0), N = 2048, fft = makeFFT(N), re = new Float64Array(N), im = new Float64Array(N);
    const blk = Math.floor(sr * 0.4), nb = Math.floor(x.length / blk), rms = [];
    let peak = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); const n = Math.min(d.length, x.length); for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
    for (let b = 0; b < nb; b++) { let s = 0; for (let i = 0; i < blk; i++) { const v = x[b * blk + i]; s += v * v; } rms.push(Math.sqrt(s / blk)); }
    const db = v => 20 * Math.log10(Math.max(v, 1e-9));
    const gate = db(Math.max(...rms, 1e-9)) - 40, act = rms.map((r, i) => (db(r) > gate && r > 1e-4) ? i : -1).filter(i => i >= 0);
    let rmsDb = -90; if (act.length) { let s = 0; act.forEach(i => s += rms[i] * rms[i]); rmsDb = db(Math.sqrt(s / act.length)); }
    const win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const band = [0, 0, 0, 0, 0], edges = [0, 120, 500, 2000, 6000, 1e9]; let cen = 0, tot = 0, frames = 0;
    const take = act.length > 24 ? Math.ceil(act.length / 24) : 1;
    for (let a = 0; a < act.length; a += take) {
      const b = act[a], off = b * blk + Math.floor(blk / 2) - N / 2; if (off < 0 || off + N > x.length) continue;
      for (let i = 0; i < N; i++) { re[i] = x[off + i] * win[i]; im[i] = 0; } fft(re, im);
      for (let k = 1; k < N / 2; k++) { const f = k * sr / N, p = re[k] * re[k] + im[k] * im[k]; for (let q = 0; q < 5; q++) if (f >= edges[q] && f < edges[q + 1]) { band[q] += p; break; } cen += f * p; tot += p; }
      frames++;
    }
    const sum = band.reduce((s, v) => s + v, 0) || 1, frac = band.map(v => v / sum);
    let corr = 1;
    if (buf.numberOfChannels > 1) { const L = buf.getChannelData(0), R = buf.getChannelData(1), n = Math.min(L.length, R.length, Math.floor(sr * 20)); let sl = 0, sr2 = 0, sx = 0; for (let i = 0; i < n; i++) { sl += L[i] * L[i]; sr2 += R[i] * R[i]; sx += L[i] * R[i]; } corr = sx / (Math.sqrt(sl * sr2) || 1); }
    return { rmsDb, peak, peakDb: db(peak), band: frac, centroid: tot ? cen / tot : 0, mono: buf.numberOfChannels === 1 || corr > 0.98, corr, active: act.length / Math.max(1, nb), seconds: x.length / sr };
  };

  const ROLE_RX = [['vocal', /vocal|vox|voice|sing|acap|rap|lead\s*voc|mic/i], ['drums', /drum|beat|perc|kick|snare|hat|cymbal|clap/i], ['bass', /bass|808|sub\b/i], ['fx', /\bfx\b|riser|impact|sweep|transition|noise/i], ['other', /pad|synth|keys|piano|klavier|guitar|gitarre|string|organ|lead|chord|arp|pluck|brass|choir|chor\b/i]];
  dsp.roleOf = function (name, type, st) {
    if (type === 'mic') return 'vocal'; if (type === 'kick') return 'drums'; if (type === 'bass') return 'bass'; if (type === 'fx') return 'fx';
    for (const [r, rx] of ROLE_RX) if (rx.test(name || '')) return r;
    if (st) { if (st.band[0] + st.band[1] > 0.85 && st.centroid < 250) return 'bass'; }
    return 'other';
  };
  const ROLE_NAME = { vocal: 'Gesang', drums: 'Drums', bass: 'Bass', fx: 'FX', other: 'Instrument/Sonstiges' };
  const ROLE_OFF = { vocal: 0, drums: -1.5, bass: -3, other: -4.5, fx: -8 };
  dsp.ROLE_NAME = ROLE_NAME;

  /* items: [{id,name,type,vol,pan,lowCut,buf}] → {rows[], mixPeakBefore/After, anchor} */
  dsp.suggestMix = function (items, opt) {
    opt = opt || {};
    const rows = items.map(it => {
      if (!it.buf) return { id: it.id, name: it.name, skipped: true, reason: 'ohne Audio (MIDI/Sequencer) – nicht analysierbar', curVol: it.vol, curPan: it.pan };
      const st = dsp.trackStats(it.buf, opt.maxSec || 90), role = dsp.roleOf(it.name, it.type, st);
      return { id: it.id, name: it.name, role, roleName: ROLE_NAME[role], st, curVol: it.vol, curPan: it.pan, curLowCut: !!it.lowCut, buf: it.buf, silent: st.rmsDb < -70 };
    });
    const an = rows.filter(r => !r.skipped && !r.silent);
    if (!an.length) return { rows, anchor: null, empty: true };
    const anchorRole = an.some(r => r.role === 'vocal') ? 'vocal' : (an.some(r => r.role === 'drums') ? 'drums' : an[0].role);
    const target = opt.anchorDb ?? -18;
    const reasons = (r, rawDb) => {
      const out = [], curDb = rawDb + 20 * Math.log10(Math.max(r.curVol, 1e-4)), tgt = r.targetDb, d = tgt - curDb;
      if (d > 2.5) out.push(`${r.roleName} zu leise (${d.toFixed(1)} dB zu wenig)`); else if (d < -2.5) out.push(`${r.roleName} zu laut (${(-d).toFixed(1)} dB zu viel)`); else out.push('Pegel passt schon');
      return out;
    };
    an.forEach(r => {
      r.targetDb = target + ROLE_OFF[r.role] - ROLE_OFF[anchorRole];
      let v = Math.pow(10, (r.targetDb - r.st.rmsDb) / 20);
      r.newVol = clamp(v, 0.03, 1.25); r.reasons = reasons(r, r.st.rmsDb);
    });
    // Headroom: geschätzte Summenspitze (nur Audio) ≤ 0.89
    const mixPeak = (vols) => {
      const L = Math.min(...an.map(r => r.buf.length), 44100 * 40); let pk = 0; const step = 2;
      for (let i = 0; i < L; i += step) { let s = 0; for (const r of an) { const d = r.buf.getChannelData(0); s += d[i] * vols(r); } if (Math.abs(s) > pk) pk = Math.abs(s); }
      return pk;
    };
    const before = mixPeak(r => r.curVol), p0 = mixPeak(r => r.newVol);
    let scale = 1; if (p0 > 0.89) scale = 0.89 / p0;
    an.forEach(r => { r.newVol = clamp(r.newVol * scale, 0.02, 1.25); });
    const after = mixPeak(r => r.newVol);
    // Pan & Tiefenschnitt
    const spread = an.filter(r => r.role === 'other' && r.st.mono);
    spread.forEach((r, i) => { if (spread.length >= 2) { r.newPan = (i % 2 ? 1 : -1) * 0.3; r.reasons.push(`Mono → ${i % 2 ? 'rechts' : 'links'} 30 % (Breite)`); } });
    an.forEach(r => {
      if (r.newPan === undefined) r.newPan = (r.role === 'other' && !r.st.mono) ? r.curPan : (['vocal', 'bass', 'drums'].includes(r.role) ? 0 : r.curPan);
      const lowE = r.st.band[0];
      r.newLowCut = r.curLowCut;
      if ((r.role === 'other' || r.role === 'vocal') && lowE > 0.12) { r.newLowCut = true; if (!r.curLowCut) r.reasons.push(`Tiefenanteil ${Math.round(lowE * 100)} % → Low-Cut (macht Platz für Bass)`); }
    });
    return { rows, anchor: anchorRole, mixPeakBefore: before, mixPeakAfter: after, scale };
  };

  /* ---------- Rauschfilter (spektral, mit Rauschprofil aus den leisesten Stellen) ---------- */
  dsp.denoiseChannel = function (d, sr, opt) {
    opt = opt || {};
    const N = 2048, HOP = 512, fft = makeFFT(N), strength = clamp(opt.strength ?? 0.5, 0, 1);
    const maxRedDb = 8 + 22 * strength, gMin = Math.pow(10, -maxRedDb / 20), alpha = 1.0 + 1.6 * strength;
    const n = d.length, T = Math.floor((n + N) / HOP) + 1, win = new Float64Array(N), H = N / 2 + 1;
    for (let i = 0; i < N; i++) win[i] = Math.sin(Math.PI * (i + 0.5) / N);   /* sqrt-Hann (Analyse & Synthese) */
    const re = new Float64Array(N), im = new Float64Array(N);
    const frame = t => { const off = t * HOP - N / 2; for (let i = 0; i < N; i++) { const j = off + i; re[i] = (j >= 0 && j < n ? d[j] : 0) * win[i]; im[i] = 0; } fft(re, im); };
    /* Durchgang 1: nur die Energie je Frame (kein Speicher pro Frame -> auch lange Songs sicher) */
    const en = new Float32Array(T);
    for (let t = 0; t < T; t++) { frame(t); let e = 0; for (let k = 0; k < H; k++) e += re[k] * re[k] + im[k] * im[k]; en[t] = e; }
    /* Rauschprofil: Mittel der leisesten 12 % der Frames */
    const idx = Array.from({ length: T }, (_, i) => i).sort((a, b) => en[a] - en[b]), q = Math.max(3, Math.floor(T * 0.12));
    const noise = new Float64Array(H);
    for (let a = 0; a < q; a++) { frame(idx[a]); for (let k = 0; k < H; k++) noise[k] += Math.hypot(re[k], im[k]) / q; }
    for (let k = 1; k < H - 1; k++) noise[k] = (noise[k - 1] + 2 * noise[k] + noise[k + 1]) / 4;
    /* Durchgang 2: filtern und überlappt addieren */
    const out = new Float32Array(n), norm = new Float32Array(n), prevG = new Float32Array(H).fill(1), g = new Float32Array(H), m = new Float32Array(H), pr = new Float32Array(H), pi = new Float32Array(H);
    for (let t = 0; t < T; t++) {
      frame(t);
      for (let k = 0; k < H; k++) { m[k] = Math.hypot(re[k], im[k]); pr[k] = re[k]; pi[k] = im[k]; }
      for (let k = 0; k < H; k++) { const nz = alpha * noise[k]; g[k] = m[k] > 1e-12 ? Math.max(gMin, 1 - nz / m[k]) : gMin; }
      for (let k = 1; k < H - 1; k++) g[k] = (g[k - 1] + 2 * g[k] + g[k + 1]) / 4 * 0.5 + g[k] * 0.5;            /* Frequenzglättung */
      for (let k = 0; k < H; k++) { const a = g[k] < prevG[k] ? 0.55 : 0.85; g[k] = prevG[k] * (1 - a) + g[k] * a; prevG[k] = g[k]; }   /* Zeitglättung gegen „Zwitschern“ */
      for (let k = 0; k < H; k++) { re[k] = pr[k] * g[k]; im[k] = pi[k] * g[k]; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; } }
      im[0] = 0; im[N / 2] = 0;
      fft(re, im, true);
      const off = t * HOP - N / 2;
      for (let i = 0; i < N; i++) { const j = off + i; if (j >= 0 && j < n) { out[j] += re[i] * win[i]; norm[j] += win[i] * win[i]; } }
    }
    for (let i = 0; i < n; i++) out[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0;
    return out;
  };

  dsp.denoiseBuffer = async function (ctx, buf, opt, progress) {
    const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      out.copyToChannel(dsp.denoiseChannel(buf.getChannelData(c), buf.sampleRate, opt), c);
      if (progress) progress((c + 1) / buf.numberOfChannels);
      await new Promise(r => setTimeout(r, 0));
    }
    return out;
  };

  /* ---------- Lern-Pattern (Markov über Intervalle + Rhythmus-Wahrscheinlichkeiten) ---------- */
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  dsp.learnPattern = function (notes) {
    if (!notes || notes.length < 6) return null;
    const byStart = new Map(); notes.forEach(n => { const o = byStart.get(n.start); if (!o || n.pitch > o.pitch) byStart.set(n.start, n); });
    const seq = [...byStart.values()].sort((a, b) => a.start - b.start);
    const pos = new Float64Array(16).fill(0.05), dur = new Float64Array(9).fill(0.2), iv = {};
    seq.forEach(n => { pos[n.start % 16] += 1; dur[clamp(n.dur, 1, 8)] += 1; });
    for (let i = 1; i < seq.length; i++) { const d = clamp(seq[i].pitch - seq[i - 1].pitch, -12, 12); iv[d] = (iv[d] || 0) + 1; }
    for (let d = -12; d <= 12; d++) iv[d] = (iv[d] || 0) + (Math.abs(d) <= 3 ? 0.3 : 0.05);
    const pitches = seq.map(n => n.pitch);
    return { pos: [...pos], dur: [...dur], iv, lo: Math.min(...pitches), hi: Math.max(...pitches), first: seq[0].pitch, vel: Math.round(seq.reduce((s, n) => s + (n.vel || 100), 0) / seq.length), count: seq.length, span: Math.max(...seq.map(n => n.start + n.dur)) };
  };
  const pick = (weights, r) => { let tot = 0; for (const w of weights) tot += w; let x = r * tot; for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; } return weights.length - 1; };
  dsp.generateVariation = function (model, original, o) {
    o = o || {}; const r = rng(o.seed || 1), v = clamp(o.variation ?? 0.4, 0, 1), steps = o.steps || 32, snap = o.snap || (p => p);
    const keep = []; const used = new Set();
    original.forEach(n => {
      if (r() < 1 - 0.8 * v) {
        let p = n.pitch;
        if (r() < 0.3 * v) { const keys = Object.keys(model.iv).map(Number), d = keys[pick(keys.map(k => model.iv[k]), r())]; p = clamp(snap(p + d), 36, 71); }
        let s = n.start; if (r() < 0.25 * v) s = clamp(s + (r() < 0.5 ? -1 : 1), 0, steps - 1);
        const k = s + ':' + p; if (!used.has(k)) { used.add(k); keep.push({ pitch: p, start: s, dur: n.dur, vel: n.vel || model.vel }); }
      }
    });
    const add = Math.round(v * original.length * 0.8), occupied = new Set(keep.map(n => n.start));
    for (let a = 0; a < add; a++) {
      const w = []; for (let s = 0; s < steps; s++) w.push(occupied.has(s) ? 0 : model.pos[s % 16]);
      if (!w.some(x => x > 0)) break;
      const s = pick(w, r()); occupied.add(s);
      const prev = keep.filter(n => n.start < s).sort((x, y) => y.start - x.start)[0], base = prev ? prev.pitch : model.first;
      const keys = Object.keys(model.iv).map(Number), d = keys[pick(keys.map(k => model.iv[k]), r())];
      const p = clamp(snap(clamp(base + d, model.lo - 3, model.hi + 3)), 36, 71);
      const dd = clamp(pick(model.dur, r()), 1, 8);
      keep.push({ pitch: p, start: s, dur: Math.min(dd, steps - s), vel: clamp(model.vel + Math.round((r() - 0.5) * 24), 40, 127) });
    }
    keep.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
    // Überlappungen gleicher Tonhöhe vermeiden
    keep.forEach((n, i) => { const nx = keep.find((m, j) => j > i && m.pitch === n.pitch && m.start > n.start); if (nx && n.start + n.dur > nx.start) n.dur = Math.max(1, nx.start - n.start); n.dur = Math.min(n.dur, steps - n.start); });
    return keep;
  };

  /* ---------- Sprachbefehle (Text → Aktion) ---------- */
  const NUM_W = { null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12 };
  const TENS = { zwanzig: 20, dreissig: 30, vierzig: 40, fuenfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
  const norm = t => String(t || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
  function parseNum(s) {
    const m = s.match(/\d+/); if (m) return parseInt(m[0], 10);
    const ws = s.split(' '); let total = 0, found = false;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i]; if (/^(ein)?hundert/.test(w)) { total += 100; found = true; const rest = w.replace(/^(ein)?hundert/, ''); if (rest) { const r2 = parseNum(rest); if (r2) total += r2; } continue; }
      const m2 = w.match(/^(\w+?)und(\w+)$/); if (m2 && NUM_W[m2[1]] !== undefined && TENS[m2[2]] !== undefined) { total += NUM_W[m2[1]] + TENS[m2[2]]; found = true; continue; }
      if (TENS[w] !== undefined) { total += TENS[w]; found = true; continue; }
      if (NUM_W[w] !== undefined && w !== 'ein' && w !== 'eine') { total += NUM_W[w]; found = true; }
    }
    return found ? total : null;
  }
  dsp.parseNum = parseNum;
  dsp.parseCommand = function (text) {
    const t = norm(text); if (!t) return { cmd: 'none' };
    if (/\b(reset|loesch|loeschen|alles leeren|projekt leeren|entfern)/.test(t)) return { cmd: 'blocked', text: t };
    const tn = t.match(/\b(?:spur|track)\s+([a-z0-9]+(?:\s?(?:und)?\s?[a-z]+)?)/);
    const trackNo = () => { if (!tn) return null; const n = parseNum(tn[1].split(' ')[0]) ?? parseNum(tn[1]); return n; };
    let m;
    if ((m = t.match(/\b(?:tempo|bpm|geschwindigkeit)\s*(?:auf|=)?\s*([a-z0-9 ]+)/)) || (m = t.match(/\b([a-z0-9]+)\s*bpm/))) { const n = parseNum(m[1]); if (n) return { cmd: 'bpm', value: n }; }
    if (/tempo erkennen|bpm erkennen|takt erkennen|tempo analysier/.test(t)) return { cmd: 'open', what: 'tempo' };
    if (/auto ?mix|automix|mischen vorschlag|mix vorschlag/.test(t)) return { cmd: 'open', what: 'mix' };
    if (/rausch/.test(t)) return { cmd: 'open', what: 'denoise' };
    if (/variation|pattern lernen|aus meinen noten/.test(t)) return { cmd: 'open', what: 'pattern' };
    if (/\b(zurueck|rueckgaengig|undo|letzten schritt)\b/.test(t)) return { cmd: 'undo' };
    if (/\b(vor|wiederherstellen|wieder herstellen|redo|nochmal)\b/.test(t) && !/spur/.test(t)) return { cmd: 'redo' };
    if (/\b(stopp|stop|halt|anhalten|pause|pausieren)\b/.test(t)) return { cmd: 'stop' };
    if (/\b(play|start|starte|abspielen|spiel|los|wiedergabe)\b/.test(t) && !/spur/.test(t)) return { cmd: 'play' };
    if (/metronom|klick/.test(t)) return { cmd: 'metronome', on: !/\baus\b|deaktiv/.test(t) };
    if (/\bloop\b|schleife/.test(t)) return { cmd: 'loop', on: !/\baus\b|deaktiv/.test(t) };
    if (/speicher/.test(t)) return { cmd: 'save' };
    if (/neue spur|spur hinzu|spur erstell/.test(t)) return { cmd: 'newtrack' };
    if (/wav|master export|exportier|bounce/.test(t)) return { cmd: 'exportwav' };
    if ((m = t.match(/\b(editor|piano ?roll|midi|drums?|sequencer|vocals?|gesang|mixer|kanal)\b/)) && /\b(zeig|oeffne|wechsel|gehe|tab|geh)/.test(t)) {
      const k = m[1]; return { cmd: 'tab', tab: /editor|piano|midi/.test(k) ? 'midi' : /drum|sequencer/.test(k) ? 'drums' : /vocal|gesang/.test(k) ? 'vocals' : 'mixer' };
    }
    if (tn) {
      const n = trackNo(); const common = { track: n };
      if (/\b(solo)\b/.test(t)) return Object.assign({ cmd: 'solo', on: !/\baus\b|nicht|beenden/.test(t) }, common);
      if (/\b(stumm|mute|muten|leise stellen)\b/.test(t)) return Object.assign({ cmd: 'mute', on: !/\baus\b|nicht|entstumm|aufheben/.test(t) }, common);
      if (/\bentstumm/.test(t)) return Object.assign({ cmd: 'mute', on: false }, common);
      if (/\b(lauter|hoeher|anheben)\b/.test(t)) return Object.assign({ cmd: 'vol', db: +2 }, common);
      if (/\b(leiser|tiefer|absenken)\b/.test(t)) return Object.assign({ cmd: 'vol', db: -2 }, common);
    }
    if (/\blauter\b/.test(t)) return { cmd: 'master', db: +1.5 };
    if (/\bleiser\b/.test(t)) return { cmd: 'master', db: -1.5 };
    return { cmd: 'unknown', text: t };
  };

  window.StudioAI = { dsp, version: 1 };
})();
