    /**
     * ============================================================================
     * AUDIO-TO-MIDI v2 (reine DSP, kein Netzwerk, keine KI-Modelle)
     *  - Melodie/Bass: YIN-Pitch-Tracking (Downsampling, Median-Glättung, Segmentierung in Noten)
     *  - Akkorde:      Chroma (FFT) + Dur/Moll-Dreiklangs-Matching pro halbem Takt
     *  - Tonart:       Krumhansl-Schmuckler (Dur/Moll) aus Tonhöhen bzw. Chroma
     *  - Auto-Modus:   wählt Melodie/Bass/Akkorde nach Spurname und Periodizität
     * ============================================================================
     */
    const A2M_KEY_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const A2M_KEY_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const A2M_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    function a2mMedian(arr) {
      const a = Array.from(arr).sort((x, y) => x - y);
      const n = a.length; if (!n) return NaN;
      return n % 2 ? a[(n - 1) >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
    }

    /* Mono-Mix + Downsampling (~11 kHz) des Analysefensters */
    function a2mPrepare(buf, startSample, lenSamples, targetSr) {
      targetSr = targetSr || 11025;
      const sr = buf.sampleRate, chs = [];
      for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
      const factor = Math.max(1, Math.round(sr / targetSr));
      const n = Math.max(0, Math.min(lenSamples, buf.length - startSample));
      const m = Math.floor(n / factor), x = new Float32Array(m);
      for (let i = 0; i < m; i++) {
        let sum = 0; const base = startSample + i * factor;
        for (let k = 0; k < factor; k++) for (let c = 0; c < chs.length; c++) sum += chs[c][base + k];
        x[i] = sum / (factor * chs.length);
      }
      return { x, sr: sr / factor };
    }

    /* Ein YIN-Frame: liefert {freq, conf} oder null */
    function a2mYinFrame(x, i0, W, tauMin, tauMax, sr, buf) {
      const d = buf.d, cm = buf.c;
      for (let tau = 1; tau <= tauMax; tau++) {
        let sum = 0;
        for (let j = 0; j < W; j++) { const df = x[i0 + j] - x[i0 + j + tau]; sum += df * df; }
        d[tau] = sum;
      }
      cm[0] = 1; let run = 0;
      for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; cm[tau] = run > 1e-12 ? d[tau] * tau / run : 1; }
      let best = -1;
      for (let tau = tauMin; tau <= tauMax; tau++) {
        if (cm[tau] < 0.15) { while (tau + 1 <= tauMax && cm[tau + 1] < cm[tau]) tau++; best = tau; break; }
      }
      let conf;
      if (best < 0) {
        let mn = 1e9;
        for (let tau = tauMin; tau <= tauMax; tau++) if (cm[tau] < mn) { mn = cm[tau]; best = tau; }
        if (mn > 0.4) return null;
        conf = 1 - mn;
      } else conf = 1 - cm[best];
      let t0 = best;
      if (best > 1 && best < tauMax) {
        const s0 = cm[best - 1], s1 = cm[best], s2 = cm[best + 1], den = s0 - 2 * s1 + s2;
        if (den > 1e-9) t0 = best + (s0 - s2) / (2 * den);
      }
      return { freq: sr / t0, conf };
    }

    /* Pitch-Verlauf über das ganze Fenster */
    function a2mPitchTrack(x, sr, fmin, fmax) {
      const W = Math.round(sr * 0.046), hop = Math.max(1, Math.round(sr * 0.0116));
      const tauMax = Math.min(Math.floor(sr / fmin), W), tauMin = Math.max(2, Math.floor(sr / fmax));
      const buf = { d: new Float32Array(tauMax + 2), c: new Float32Array(tauMax + 2) };
      const midi = [], rms = [], conf = [];
      for (let i0 = 0; i0 + W + tauMax <= x.length; i0 += hop) {
        let e = 0; for (let j = 0; j < W; j++) e += x[i0 + j] * x[i0 + j];
        rms.push(Math.sqrt(e / W));
        const r = a2mYinFrame(x, i0, W, tauMin, tauMax, sr, buf);
        if (r && r.freq >= fmin && r.freq <= fmax) { midi.push(69 + 12 * Math.log2(r.freq / 440)); conf.push(r.conf); }
        else { midi.push(NaN); conf.push(0); }
      }
      return { midi, rms, conf, W, hop, sr };
    }

    /* Frames → Noten (Sekunden) */
    function a2mSegment(tr) {
      const n = tr.midi.length; if (!n) return [];
      const sorted = Array.from(tr.rms).sort((a, b) => a - b);
      const p95 = sorted[Math.floor(n * 0.95)] || 0;
      const gate = Math.max(0.006, 0.08 * p95);
      // Median-Glättung (5 Frames) der Pitch-Kurve
      const m = new Array(n).fill(NaN);
      for (let f = 0; f < n; f++) {
        if (isNaN(tr.midi[f])) continue;
        const win = []; for (let k = -2; k <= 2; k++) { const v = tr.midi[f + k]; if (v !== undefined && !isNaN(v)) win.push(v); }
        m[f] = a2mMedian(win);
      }
      const notes = []; let cur = null;
      const close = endF => {
        if (!cur) return;
        if (endF - cur.start >= 3) notes.push({ f0: cur.start, f1: endF, midi: a2mMedian(cur.ps), rms: cur.peak });
        cur = null;
      };
      for (let f = 0; f < n; f++) {
        const voiced = !isNaN(m[f]) && tr.rms[f] > gate;
        if (!voiced) { if (cur && f - cur.last > 2) close(cur.last + 1); continue; }
        if (!cur) { cur = { start: f, ps: [m[f]], peak: tr.rms[f], last: f }; continue; }
        if (f - cur.last > 3) { close(cur.last + 1); cur = { start: f, ps: [m[f]], peak: tr.rms[f], last: f }; continue; }
        const med = a2mMedian(cur.ps);
        const jump = Math.abs(m[f] - med) > 0.7;
        const onset = f > 0 && tr.rms[f] > 1.9 * Math.max(1e-6, tr.rms[f - 1]) && cur.ps.length >= 5;
        if (jump || onset) {
          const a = m[f + 1], b = m[f + 2];
          const agree = onset || ((a !== undefined && !isNaN(a) && Math.abs(a - m[f]) < 0.6) && (b === undefined || isNaN(b) || Math.abs(b - m[f]) < 0.7));
          if (agree) { close(cur.last + 1); cur = { start: f, ps: [m[f]], peak: tr.rms[f], last: f }; }
          continue;
        }
        cur.ps.push(m[f]); cur.last = f; cur.peak = Math.max(cur.peak, tr.rms[f]);
      }
      if (cur) close(cur.last + 1);
      return notes.map(o => ({
        t0: (o.f0 * tr.hop + tr.W * 0.25) / tr.sr, t1: (o.f1 * tr.hop + tr.W * 0.5) / tr.sr, midi: o.midi, rms: o.rms
      }));
    }

    function a2mFft(re, im) {
      const n = re.length;
      for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
        if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
      }
      for (let len = 2; len <= n; len <<= 1) {
        const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
        for (let i = 0; i < n; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < h; k++) {
            const ur = re[i + k], ui = im[i + k];
            const vr = re[i + k + h] * cr - im[i + k + h] * ci, vi = re[i + k + h] * ci + im[i + k + h] * cr;
            re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + h] = ur - vr; im[i + k + h] = ui - vi;
            const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
          }
        }
      }
    }

    /* Chroma (12 Tonklassen) eines Abschnitts [i0, i1) */
    function a2mChroma(x, sr, i0, i1) {
      const N = 4096, hann = new Float32Array(N), re = new Float64Array(N), im = new Float64Array(N), chroma = new Float64Array(12);
      for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
      const binPc = new Int8Array(N / 2).fill(-1);
      for (let k = 1; k < N / 2; k++) { const f = k * sr / N; if (f >= 100 && f <= 2000) binPc[k] = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12; }
      const end = Math.min(i1, x.length);
      for (let s = i0; s < end - 1024 || s === i0; s += 2048) {
        for (let i = 0; i < N; i++) { const v = s + i < end ? x[s + i] : 0; re[i] = v * hann[i]; im[i] = 0; }
        a2mFft(re, im);
        for (let k = 1; k < N / 2; k++) if (binPc[k] >= 0) chroma[binPc[k]] += Math.sqrt(Math.sqrt(re[k] * re[k] + im[k] * im[k]));
        if (s + 2048 >= end) break;
      }
      return chroma;
    }

    /* Krumhansl-Schmuckler → {root, mode:'major'|'minor', score} */
    function a2mKey(chroma) {
      const c = Array.from(chroma); const mean = c.reduce((a, b) => a + b, 0) / 12;
      if (c.reduce((a, b) => a + b, 0) <= 0) return null;
      let best = null;
      for (const [mode, prof] of [['major', A2M_KEY_MAJOR], ['minor', A2M_KEY_MINOR]]) {
        const pm = prof.reduce((a, b) => a + b, 0) / 12;
        for (let t = 0; t < 12; t++) {
          let num = 0, dc = 0, dp = 0;
          for (let i = 0; i < 12; i++) { const a = c[(t + i) % 12] - mean, b = prof[i] - pm; num += a * b; dc += a * a; dp += b * b; }
          const r = num / (Math.sqrt(dc * dp) + 1e-12);
          if (!best || r > best.score) best = { root: t, mode, score: r };
        }
      }
      return best;
    }

    /* Akkorde pro Fenster (chordSteps 16tel) → [{step, dur, root, quality:'maj'|'min'}] */
    function a2mChords(x, sr, stepSamples, steps, chordSteps, keyHint) {
      const wins = [], energies = [];
      for (let w = 0; w * chordSteps < steps; w++) {
        const i0 = Math.round(w * chordSteps * stepSamples), i1 = Math.round((w + 1) * chordSteps * stepSamples);
        if (i0 >= x.length) break;
        const ch = a2mChroma(x, sr, i0, i1); const en = ch.reduce((a, b) => a + b, 0);
        wins.push(ch); energies.push(en);
      }
      const maxE = Math.max(...energies, 1e-9);
      const inKey = (root, q) => {
        if (!keyHint) return false;
        const iv = keyHint.mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
        const set = new Set(iv.map(v => (v + keyHint.root) % 12));
        return [0, q === 'maj' ? 4 : 3, 7].every(t => set.has((root + t) % 12));
      };
      const out = []; let prev = null;
      wins.forEach((ch, w) => {
        if (energies[w] < 0.12 * maxE) { prev = null; return; }
        const norm = Math.sqrt(ch.reduce((a, b) => a + b * b, 0)) + 1e-12;
        let best = null;
        for (let r = 0; r < 12; r++) for (const q of ['maj', 'min']) {
          const tpl = new Array(12).fill(0); tpl[r] = 1; tpl[(r + (q === 'maj' ? 4 : 3)) % 12] = 0.85; tpl[(r + 7) % 12] = 0.8;
          const tn = Math.sqrt(tpl.reduce((a, b) => a + b * b, 0));
          let dot = 0; for (let i = 0; i < 12; i++) dot += ch[i] * tpl[i];
          let score = dot / (norm * tn); if (inKey(r, q)) score *= 1.05;
          if (!best || score > best.score) best = { root: r, quality: q, score };
        }
        if (prev && prev.root !== best.root || prev && prev.quality !== best.quality) {
          // Hysterese: vorigen Akkord behalten, wenn er fast gleich gut passt
          let dot = 0; const tpl = new Array(12).fill(0); tpl[prev.root] = 1; tpl[(prev.root + (prev.quality === 'maj' ? 4 : 3)) % 12] = 0.85; tpl[(prev.root + 7) % 12] = 0.8;
          for (let i = 0; i < 12; i++) dot += ch[i] * tpl[i];
          const ps = dot / (norm * Math.sqrt(tpl.reduce((a, b) => a + b * b, 0))) * (inKey(prev.root, prev.quality) ? 1.05 : 1);
          if (ps >= best.score * 0.94) best = { root: prev.root, quality: prev.quality, score: ps };
        }
        prev = best;
        const last = out[out.length - 1];
        if (last && last.root === best.root && last.quality === best.quality && last.step + last.dur === w * chordSteps) last.dur += chordSteps;
        else out.push({ step: w * chordSteps, dur: chordSteps, root: best.root, quality: best.quality });
      });
      return out;
    }
