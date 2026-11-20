    /* ===== Polyphone Transkription (Klapuri-Stil): STFT → Obertonsummen-Salienz → iterative Auslöschung ===== */
    function a2mPoly(x, sr, secPer16th, steps, opt) {
      opt = opt || {};
      const N = 4096, hop = 512, maxPoly = opt.maxPoly || 5, pLo = 40, pHi = 88, H = 8;
      const W = [1.0, 0.85, 0.7, 0.6, 0.5, 0.4, 0.33, 0.28], Wsum = W.reduce((a, b) => a + b, 0);
      const binHz = sr / N, nB = N / 2;
      const hann = new Float32Array(N); for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
      const total = Math.min(x.length, Math.ceil(steps * secPer16th * sr));
      const nF = Math.max(1, Math.floor(total / hop) + 1), nP = pHi - pLo + 1;
      const re = new Float64Array(N), im = new Float64Array(N), mag = new Float32Array(nB), sp = new Float32Array(nB);
      const f0 = p => 440 * Math.pow(2, (p - 69) / 12);
      const A = [], L = []; let frameMaxAll = 1e-9;
      const mags = [];
      for (let f = 0; f < nF; f++) {
        const c = f * hop, s0 = c - N / 2;
        for (let i = 0; i < N; i++) { const j = s0 + i; re[i] = (j >= 0 && j < total ? x[j] : 0) * hann[i]; im[i] = 0; }
        a2mFft(re, im);
        let mx = 0; for (let k = 1; k < nB; k++) { const m = Math.hypot(re[k], im[k]); mag[k] = m; if (m > mx) mx = m; }
        mags.push({ m: Float32Array.from(mag), mx }); if (mx > frameMaxAll) frameMaxAll = mx;
      }
      const cand = new Float32Array(nP), cur = [];
      const peaksOf = (p, out) => { // Spitzenwerte der Obertöne von Tonhöhe p im Spektrum sp
        const fr = f0(p); let n = 0;
        for (let h = 1; h <= H; h++) {
          const fh = h * fr; if (fh > sr * 0.45) { out[h - 1] = 0; continue; }
          const kc = fh / binHz, tol = Math.max(1, 0.35 * 0.0595 * fh / binHz);
          let best = 0, bk = Math.round(kc); const a = Math.max(1, Math.round(kc - tol)), b = Math.min(nB - 1, Math.round(kc + tol));
          for (let k = a; k <= b; k++) if (sp[k] > best) { best = sp[k]; bk = k; }
          out[h - 1] = best; cur[h - 1] = bk; n++;
        }
      };
      const pk = new Float32Array(H);
      for (let f = 0; f < nF; f++) {
        const { m, mx } = mags[f]; const act = new Float32Array(nP), lev = new Float32Array(nP);
        A.push(act); L.push(lev);
        if (mx < 0.04 * frameMaxAll) continue;
        // Log-Kompression + Weißung (lokalen Mittelwert abziehen)
        for (let k = 1; k < nB; k++) sp[k] = Math.pow(m[k] / mx, 0.7);
        const run = new Float32Array(nB + 1); for (let k = 0; k < nB; k++) run[k + 1] = run[k] + sp[k];
        const wh = new Float32Array(nB);
        for (let k = 1; k < nB; k++) { const a = Math.max(0, k - 30), b = Math.min(nB, k + 31); wh[k] = Math.max(0, sp[k] - (run[b] - run[a]) / (b - a) * 1.15); }
        sp.set(wh);
        let firstS = 0;
        for (let it = 0; it < maxPoly; it++) {
          let bestP = -1, bestS = 0;
          for (let pi = 0; pi < nP; pi++) {
            const p = pLo + pi; peaksOf(p, pk);
            let present = 0; for (let h = 0; h < 4; h++) if (pk[h] > 0.12) present++;
            let s = 0; for (let h = 0; h < H; h++) s += W[h] * pk[h]; s /= Wsum;
            const okF = present >= 2 && (pk[0] > 0.12 || (pk[1] > 0.15 && pk[2] > 0.15));
            cand[pi] = okF ? s : 0;
            if (cand[pi] > bestS) { bestS = cand[pi]; bestP = p; }
          }
          if (bestP < 0) break;
          if (it === 0) firstS = bestS;
          if (bestS < 0.06 || bestS < 0.4 * firstS) break;
          act[bestP - pLo] = bestS;
          peaksOf(bestP, pk); const ks = cur.slice(0, H), pm = Array.from(pk);
          lev[bestP - pLo] = (m[ks[0]] + m[ks[1]] + m[ks[2]]) / frameMaxAll;
          for (let h = 0; h < H; h++) {
            if (pm[h] <= 0) continue;
            const nb = [h > 0 ? pm[h - 1] : null, h < H - 1 ? pm[h + 1] : null].filter(v => v !== null && v > 0);
            const est = h === 0 ? pm[0] : Math.min(pm[h], nb.length ? nb.reduce((a, b) => a + b, 0) / nb.length : pm[h]);
            const r = pm[h] > 0 ? Math.max(0, (pm[h] - est) / pm[h]) : 0;
            for (let k = Math.max(1, ks[h] - 2); k <= Math.min(nB - 1, ks[h] + 2); k++) sp[k] *= r;
          }
        }
      }
      // ---- Aktivierungen → Noten ----
      const frameT = f => f * hop / sr, notes = [];
      const globalPeak = Math.max(1e-9, ...A.map(a => Math.max(...a)));
      for (let pi = 0; pi < nP; pi++) {
        const thr = Math.max(0.08, 0.3 * globalPeak);
        let on = new Array(nF).fill(false);
        for (let f = 0; f < nF; f++) on[f] = A[f][pi] > thr;
        // Lücken ≤ 2 Frames schließen
        for (let f = 0; f < nF; f++) if (!on[f]) { let a = f; while (a < nF && !on[a]) a++; if (f > 0 && a < nF && a - f <= 2) for (let g = f; g < a; g++) on[g] = true; f = a; }
        let f = 0;
        while (f < nF) {
          if (!on[f]) { f++; continue; }
          let e = f; while (e < nF && on[e]) e++;
          // Neuanschläge innerhalb eines Laufs: stärkster Pegelanstieg (gleicher Ton wird neu angeschlagen)
          let segStart = f;
          const rise = g => (L[g + 3][pi]) / Math.max(L[g - 3][pi], 0.01);
          for (let g = f + 4; g < e - 4; g++) {
            const r = rise(g);
            if (r > 1.45 && r >= rise(g - 1) && r >= rise(g + 1) && g - segStart >= 4) { notes.push({ p: pLo + pi, f0: segStart, f1: g }); segStart = g; g += 3; }
          }
          notes.push({ p: pLo + pi, f0: segStart, f1: e });
          f = e;
        }
      }
      const out = [];
      for (const n of notes) {
        if (n.f1 - n.f0 < 4) continue;
        let sum = 0; for (let f = n.f0; f < n.f1; f++) sum += A[f][n.p - pLo];
        const mean = sum / (n.f1 - n.f0);
        out.push({ midi: n.p, f0: n.f0, f1: n.f1, sal: mean, t0: frameT(n.f0) + (opt.onsetShift ?? 0), t1: frameT(n.f1) + (opt.offsetShift ?? 0) });
      }
      // Halbton-Nachbarn (Spektralleck): schwächere gleichzeitige Note entfernen
      out.sort((a, b) => b.sal - a.sal);
      const kept = [];
      for (const n of out) {
        const HARM = [12, 19, 24, 28, 31, 34, 36];
        const hg = kept.some(k => HARM.includes(n.midi - k.midi) && Math.min(k.f1, n.f1) - Math.max(k.f0, n.f0) > 0.6 * (n.f1 - n.f0) && n.sal < 0.6 * k.sal);
        const ghost = hg || kept.some(k => Math.abs(k.midi - n.midi) === 1 && Math.min(k.f1, n.f1) - Math.max(k.f0, n.f0) > 0.6 * (n.f1 - n.f0) && n.sal < 0.7 * k.sal);
        if (!ghost) kept.push(n);
      }
      kept.sort((a, b) => a.t0 - b.t0 || a.midi - b.midi);
      return kept;
    }
    

    /* Hauptfunktion: liefert {mode, notes[{pitch,start,dur,vel}], key, chords, info} */
    function analyzeAudioToMidi(buf, o) {
      const steps = o.steps || 32, secPer16th = o.secPer16th, sr0 = buf.sampleRate;
      const prep = a2mPrepare(buf, o.startSample, Math.floor(steps * secPer16th * sr0));
      const x = prep.x, sr = prep.sr;
      if (x.length < sr * 0.2) return { mode: o.mode, notes: [], key: null, chords: null, info: 'Zu wenig Audio im gewählten Bereich.' };
      let mode = o.mode || 'auto', track = null;
      const nameBass = /bass|808|sub/i.test(o.name || ''), nameVoc = /vocal|voc\b|vox|lead|sing|mic|melod/i.test(o.name || ''), nameKeys = /piano|klavier|keys|key\b|guitar|gitarre|pad\b|organ|strings|pluck|arp|chord|akkord|synth/i.test(o.name || '');
      const runTrack = (fmin, fmax) => a2mPitchTrack(x, sr, fmin, fmax);
      if (mode === 'auto') {
        if (nameBass) mode = 'bass';
        else if (nameVoc) mode = 'melody';
        else if (nameKeys) mode = 'poly';
        else {
          track = runTrack(70, 1000);
          const s = Array.from(track.rms).sort((a, b) => a - b), gate = Math.max(0.006, 0.08 * (s[Math.floor(s.length * 0.95)] || 0));
          let cs = 0, cn = 0; for (let f = 0; f < track.rms.length; f++) if (track.rms[f] > gate) { cn++; cs += track.conf[f]; }
          mode = cn > 5 && cs / cn >= 0.8 ? 'melody' : 'chords';
        }
      }
      let notes = [], chords = null, key = null;
      if (mode === 'poly' || (mode === 'ai' && o.aiNotes)) {
        const pn = mode === 'ai' ? o.aiNotes : a2mPoly(x, sr, secPer16th, steps, {});
        const raw = pn.map(n => { const s0 = Math.round(n.t0 / secPer16th), s1 = Math.round(n.t1 / secPer16th); return { midi: n.midi, start: s0, dur: Math.max(1, s1 - s0), sal: n.sal }; })
          .filter(n => n.start >= 0 && n.start < steps);
        raw.forEach(n => { n.dur = Math.min(n.dur, steps - n.start); });
        if (!raw.length) return { mode, notes: [], key: null, chords: null, info: 'Keine Töne erkannt.' };
        const hist = new Float64Array(12); raw.forEach(n => { hist[((n.midi % 12) + 12) % 12] += n.dur; });
        key = a2mKey(hist);
        try { chords = a2mChords(x, sr, secPer16th * sr, steps, 8, key); } catch (_) { chords = null; }
        let bestK = 0, bestOut = Infinity;
        for (const k of [0, -1, -2, 1, -3, 2]) {
          const out = raw.filter(n => n.midi + 12 * k < 36 || n.midi + 12 * k > 71).length;
          if (out < bestOut) { bestOut = out; bestK = k; }
        }
        const peak = Math.max(...raw.map(n => n.sal), 1e-9), seen = new Set();
        raw.forEach(n => {
          let p = n.midi + 12 * bestK; while (p < 36) p += 12; while (p > 71) p -= 12;
          const id = p + ':' + n.start; if (seen.has(id)) return; seen.add(id);
          notes.push({ pitch: p, start: n.start, dur: n.dur, vel: Math.round(70 + 50 * Math.pow(n.sal / peak, 0.7)) });
        });
        let maxPoly = 0; for (let s = 0; s < steps; s++) maxPoly = Math.max(maxPoly, notes.filter(n => n.start <= s && n.start + n.dur > s).length);
        const kn = key ? A2M_NOTE_NAMES[key.root] + (key.mode === 'minor' ? ' Moll' : ' Dur') : '';
        return { mode, notes, key, chords: chords && chords.length ? chords : null, info: `${notes.length} Noten, bis zu ${maxPoly} gleichzeitig${kn ? ' · Tonart ' + kn : ''}` };
      }
      if (mode === 'chords') {
        const stepSamples = secPer16th * sr;
        const cr = new Float64Array(12);
        for (let w = 0; w * 8 < steps; w++) { const i0 = Math.round(w * 8 * stepSamples), i1 = Math.round((w + 1) * 8 * stepSamples); if (i0 >= x.length) break; const c = a2mChroma(x, sr, i0, i1); for (let i = 0; i < 12; i++) cr[i] += c[i]; }
        key = a2mKey(cr);
        chords = a2mChords(x, sr, stepSamples, steps, 8, key);
        chords.forEach(c => {
          const base = 48 + c.root, tones = [0, c.quality === 'maj' ? 4 : 3, 7];
          tones.forEach(t => notes.push({ pitch: Math.min(71, base + t), start: c.step, dur: Math.min(c.dur, steps - c.step), vel: 96 }));
        });
        return { mode, notes, key, chords, info: chords.map(c => A2M_NOTE_NAMES[c.root] + (c.quality === 'min' ? 'm' : '')).join(' – ') };
      }
      // Melodie / Bass
      const fmin = mode === 'bass' ? 38 : 70, fmax = mode === 'bass' ? 330 : 1000;
      if (!track || mode === 'bass') track = runTrack(fmin, fmax);
      else if (mode === 'melody' && !track) track = runTrack(fmin, fmax);
      const seg = a2mSegment(track);
      let raw = seg.map(sg => {
        const s0 = Math.round(sg.t0 / secPer16th), s1 = Math.round(sg.t1 / secPer16th);
        return { midi: Math.round(sg.midi), start: s0, dur: Math.max(1, s1 - s0), rms: sg.rms };
      }).filter(n => n.start >= 0 && n.start < steps);
      raw.sort((a, b) => a.start - b.start || b.dur - a.dur);
      const mono = [];
      raw.forEach(n => {
        const last = mono[mono.length - 1];
        if (last && last.start === n.start) return;                 // gleicher Start → längere (zuerst sortiert) behalten
        if (last && last.start + last.dur > n.start) last.dur = Math.max(1, n.start - last.start);
        mono.push(n);
      });
      mono.forEach(n => { n.dur = Math.min(n.dur, steps - n.start); });
      if (!mono.length) return { mode, notes: [], key: null, chords: null, info: 'Keine Töne erkannt.' };
      // Tonart aus gewichteter Tonhöhenverteilung
      if (mono.length >= 4) {
        const hist = new Float64Array(12); mono.forEach(n => { hist[((n.midi % 12) + 12) % 12] += n.dur; });
        key = a2mKey(hist);
      }
      // Oktav-Verschiebung der ganzen Phrase, damit sie in den Piano-Roll-Bereich (36–71) passt
      let bestK = 0, bestOut = Infinity;
      for (const k of [0, -1, 1, -2, 2, -3, 3]) {
        const out = mono.filter(n => n.midi + 12 * k < 36 || n.midi + 12 * k > 71).length;
        if (out < bestOut) { bestOut = out; bestK = k; }
      }
      const peak = Math.max(...mono.map(n => n.rms), 1e-9);
      mono.forEach(n => {
        let p = n.midi + 12 * bestK; while (p < 36) p += 12; while (p > 71) p -= 12;
        notes.push({ pitch: p, start: n.start, dur: n.dur, vel: Math.round(70 + 50 * Math.pow(n.rms / peak, 0.7)) });
      });
      const kn = key ? A2M_NOTE_NAMES[key.root] + (key.mode === 'minor' ? ' Moll' : ' Dur') : '';
      return { mode, notes, key, chords: null, info: `${notes.length} Noten${kn ? ' · Tonart ' + kn : ''}` };
    }

    async function extractMidiFromStem(stemId) {
      const buf = dawState.buffers[stemId];
      if (!buf) {
        toast('Dieser Stem ist noch leer – bitte zuerst Demo-Stems oder eine Datei laden.', 'warn');
        return;
      }
      const $ = id => document.getElementById(id);
      const mode = $('select-a2m-mode') ? $('select-a2m-mode').value : 'auto';
      const startBar = Math.max(1, parseInt($('input-a2m-bar') ? $('input-a2m-bar').value : '1', 10) || 1);
      const snap = $('chk-a2m-key') ? $('chk-a2m-key').checked : true;
      const tr = dawState.tracks.find(t => t.id === stemId);
      const secPer16th = (60 / dawState.bpm) / 4, sr = buf.sampleRate;
      const startSample = Math.floor((dawState.startOffsetMs / 1000) * sr + (startBar - 1) * 16 * secPer16th * sr);
      if (startSample >= buf.length - sr * 0.2) { toast('Takt ' + startBar + ' liegt hinter dem Ende der Audio-Datei.', 'warn'); return; }
      let effMode = mode, aiNotes = null;
      if (mode === 'ai') {
        try {
          if (!window.BasicPitchAI) throw new Error('KI-Modul fehlt');
          if (window.BasicPitchAI.state.status !== 'ready') toast('KI-Modell wird geladen (einmalig ~1 MB) …', 'info');
          const nS = Math.min(Math.floor(32 * secPer16th * sr), buf.length - startSample), mono = new Float32Array(nS);
          for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < nS; i++) mono[i] += d[startSample + i] / buf.numberOfChannels; }
          toast('KI analysiert …', 'info');
          const raw = await window.BasicPitchAI.transcribe(mono, sr, {});
          aiNotes = raw.map(n => ({ midi: n.midi, t0: n.t0, t1: n.t1, sal: n.amp }));
        } catch (err) {
          console.warn('[Basic Pitch]', err);
          toast('KI-Modell nicht verfügbar – es wird der eigene Polyphon-Algorithmus genutzt. (' + (err && err.message ? err.message.slice(0, 140) : err) + ')', 'warn');
          effMode = 'poly';
        }
      } else { toast('Analysiere Audio …', 'info'); }
      await new Promise(r => setTimeout(r, 40));
      let res;
      try { res = analyzeAudioToMidi(buf, { startSample, secPer16th, steps: 32, mode: effMode, aiNotes, name: tr ? tr.name : '' }); }
      catch (err) { console.error('[Audio→MIDI]', err); toast(`Analyse fehlgeschlagen: ${err && err.message ? err.message : err}`, 'error'); return; }
      if (!res.notes.length) { toast('Keine eindeutige Musik erkannt – anderen Stem, Modus oder Takt versuchen.', 'warn'); return; }

      let notes = res.notes;
      if (snap && res.key) {
        dawState.midiRoot = res.key.root; dawState.midiScale = res.key.mode;
        const rs = $('select-midi-root'), ss = $('select-midi-scale');
        if (rs) rs.value = String(res.key.root);
        if (ss) ss.value = res.key.mode;
        if (res.mode !== 'chords') notes = notes.map(n => Object.assign({}, n, { pitch: quantizeMidiNoteToScale(n.pitch, res.key.root, res.key.mode) }));
      } else if (snap && res.mode !== 'chords') {
        notes = notes.map(n => Object.assign({}, n, { pitch: quantizeMidiNoteToScale(n.pitch, dawState.midiRoot, dawState.midiScale) }));
      }
      let idCounter = Date.now();
      const out = notes.map(n => ({ id: idCounter++, pitch: n.pitch, start: n.start, dur: n.dur, vel: n.vel }));
      out.forEach(n => { dawState.stepVelocities[n.start] = n.vel; });
      dawState.detectedChords = res.chords && res.chords.length ? res.chords : null;

      if (!getActiveMidiTrack()) createTrack('midi', 'Extrahierte MIDI');
      dawState.midiNotes = out;
      syncActiveMidiTrackFromState();
      switchBottomTab('midi');
      drawPianoRoll();
      drawVelocityLane();
      renderMultiTrackLanes();
      const label = { melody: 'Melodie', bass: 'Bass', chords: 'Akkorde', poly: 'Polyphon', ai: '🧠 KI (Basic Pitch)' }[res.mode] || res.mode;
      toast(`${label}: ${res.info}${res.chords && res.chords.length ? ' · Akkorde für Pattern-Generator gemerkt' : ''}`, 'success');
    }
