
/* ===== Sunshine@R · KI-Audio→MIDI: Basic Pitch (Spotify, Apache-2.0) via TensorFlow.js =====
   Modell (~0,9 MB) + TF.js werden bei Bedarf nachgeladen und danach offline aus dem Browser-Speicher genutzt.
   Quellen in dieser Reihenfolge: gespeichertes Modell (IndexedDB) → assets/basic-pitch/ → CDN.
   Alternativ: Modelldateien (model.json + .bin) in den Optionen von Hand wählen.
   Inferenz/Fensterung folgen basic-pitch-ts (22,05 kHz mono, Fenster 43844 Samples, Hop 36164, 15 Frames Rand). */
(function () {
  'use strict';
  const SR = 22050, HOPF = 256, WIN = 43844, HOP = 36164, PAD = 3840, TRIM = 15, MIDI0 = 21, NP = 88;
  const TF_URLS = ['assets/basic-pitch/tf.min.js', 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'];
  const MODEL_URLS = ['assets/basic-pitch/model.json',
    'https://cdn.jsdelivr.net/npm/@spotify/basic-pitch@1.0.1/model/model.json',
    'https://raw.githubusercontent.com/spotify/basic-pitch-ts/main/model/model.json'];
  const IDB_KEY = 'indexeddb://sunshine-basic-pitch', LS_FLAG = 'sunshine.bp.cached';
  const listeners = [];
  const st = { status: 'idle', source: '', error: '', cached: false, backend: '' };
  try { st.cached = localStorage.getItem(LS_FLAG) === '1'; } catch (_) {}
  let model = null, loading = null;
  const emit = () => listeners.forEach(f => { try { f(st); } catch (_) {} });
  const set = (o) => { Object.assign(st, o); emit(); };

  function loadScript(url, ms = 25000) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); let done = false;
      const t = setTimeout(() => { if (!done) { done = true; s.remove(); rej(new Error('Zeitüberschreitung: ' + url)); } }, ms);
      s.src = url; s.async = true;
      s.onload = () => { if (!done) { done = true; clearTimeout(t); res(); } };
      s.onerror = () => { if (!done) { done = true; clearTimeout(t); s.remove(); rej(new Error('Nicht ladbar: ' + url)); } };
      document.head.appendChild(s);
    });
  }
  async function ensureTf() {
    if (window.tf && window.tf.loadGraphModel) return window.tf;
    let last = null;
    for (const u of TF_URLS) { try { await loadScript(u); if (window.tf && window.tf.loadGraphModel) break; } catch (e) { last = e; } }
    if (!(window.tf && window.tf.loadGraphModel)) throw new Error('TensorFlow.js konnte nicht geladen werden (' + (last ? last.message : '?') + '). Internet prüfen oder assets/basic-pitch/tf.min.js ablegen.');
    try { await window.tf.ready(); } catch (_) {}
    try { set({ backend: window.tf.getBackend() }); } catch (_) {}
    return window.tf;
  }
  async function persist(m) { try { await m.save(IDB_KEY); try { localStorage.setItem(LS_FLAG, '1'); } catch (_) {} set({ cached: true }); } catch (e) { console.warn('[BasicPitch] Speichern im Browser nicht möglich:', e); } }

  async function load(force) {
    if (model && !force) return model;
    if (loading) return loading;
    loading = (async () => {
      set({ status: 'loading', error: '' });
      try {
        const tf = await ensureTf();
        let m = null, src = '';
        if (st.cached) { try { m = await tf.loadGraphModel(IDB_KEY); src = 'Browser-Speicher'; } catch (_) { try { localStorage.removeItem(LS_FLAG); } catch (__) {} st.cached = false; } }
        const errs = [];
        for (const u of (m ? [] : MODEL_URLS)) {
          try { m = await tf.loadGraphModel(u); src = /^https?:/.test(u) ? 'Download' : 'assets-Ordner'; await persist(m); break; }
          catch (e) { errs.push(u + ' → ' + (e && e.message ? e.message : e)); }
        }
        if (!m) throw new Error('Modell nicht erreichbar. Bitte Internet prüfen oder die Dateien model.json + group1-shard1of1.bin in den Optionen auswählen. (' + errs.length + ' Quellen versucht)');
        model = m; set({ status: 'ready', source: src, error: '' });
        return m;
      } catch (e) { model = null; set({ status: 'error', error: e && e.message ? e.message : String(e) }); throw e; }
      finally { loading = null; }
    })();
    return loading;
  }
  async function installFiles(files) {
    const arr = Array.from(files || []);
    const js = arr.find(f => /\.json$/i.test(f.name)), bins = arr.filter(f => /\.bin$/i.test(f.name));
    if (!js || !bins.length) throw new Error('Bitte model.json UND die .bin-Datei (group1-shard1of1.bin) gemeinsam auswählen.');
    set({ status: 'loading', error: '' });
    try {
      const tf = await ensureTf();
      const m = await tf.loadGraphModel(tf.io.browserFiles([js].concat(bins)));
      await persist(m); model = m; set({ status: 'ready', source: 'eigene Dateien', error: '' });
    } catch (e) { set({ status: 'error', error: e && e.message ? e.message : String(e) }); throw e; }
  }
  async function remove() {
    try { if (window.tf) await window.tf.io.removeModel(IDB_KEY); } catch (_) {}
    try { localStorage.removeItem(LS_FLAG); } catch (_) {}
    model = null; set({ status: 'idle', cached: false, source: '', error: '' });
  }

  async function resample(x, sr) {
    if (Math.abs(sr - SR) < 1) return x;
    const n = Math.max(1, Math.ceil(x.length * SR / sr));
    const oc = new OfflineAudioContext(1, n, SR), b = oc.createBuffer(1, x.length, sr);
    b.copyToChannel(x, 0);
    const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
    return (await oc.startRendering()).getChannelData(0);
  }

  /* ---- Modell über alle Fenster laufen lassen → frames/onsets [T][88], contours werden nicht gebraucht ---- */
  async function run(x, progress) {
    const tf = window.tf, L = x.length;
    const padded = new Float32Array(PAD + L); padded.set(x, PAD);
    const nWin = Math.max(1, Math.ceil((L - (172 - 2 * TRIM) * HOPF) / HOP) + 1);
    const G = Math.max(1, Math.floor(L / HOPF));
    const frames = new Array(G), onsets = new Array(G);
    const zero = () => new Float32Array(NP);
    let last = -1;
    for (let w = 0; w < nWin; w++) {
      if (progress) progress(w / nWin);
      const win = new Float32Array(WIN); win.set(padded.subarray(w * HOP, Math.min(padded.length, w * HOP + WIN)));
      let fr, on;
      const res = tf.tidy(() => {
        const inp = tf.tensor3d(win, [1, WIN, 1]);
        try { return { named: model.execute(inp, ['Identity_1', 'Identity_2', 'Identity']) }; }
        catch (_) { return { pred: model.predict(inp) }; }
      });
      let outs;
      if (res.named) outs = res.named; else { const p = res.pred; outs = Array.isArray(p) ? p : Object.values(p); }
      const arrs = [];
      for (const t of outs) { arrs.push({ shape: t.shape, data: await t.array() }); t.dispose && t.dispose(); }
      if (res.named) { fr = arrs[0].data[0]; on = arrs[1].data[0]; }
      else {
        const n88 = arrs.filter(a => a.shape[a.shape.length - 1] === NP);
        if (n88.length < 2) throw new Error('Unerwartete Modell-Ausgabe (Form ' + arrs.map(a => a.shape.join('x')).join(' | ') + ')');
        const mean = a => { let s = 0, c = 0; for (const r of a.data[0]) for (const v of r) { s += v; c++; } return s / c; };
        n88.sort((a, b) => mean(b) - mean(a)); fr = n88[0].data[0]; on = n88[1].data[0];   // Frames sind dichter als Onsets
      }
      for (let j = TRIM; j < fr.length - TRIM; j++) {
        const g = Math.round((w * HOP + (j - TRIM) * HOPF) / HOPF);
        if (g >= G) break;
        frames[g] = Float32Array.from(fr[j]); onsets[g] = Float32Array.from(on[j]); last = Math.max(last, g);
      }
    }
    for (let g = 0; g < G; g++) { if (!frames[g]) { frames[g] = g ? frames[g - 1] : zero(); onsets[g] = zero(); } }
    if (progress) progress(1);
    return { frames, onsets };
  }

  /* ---- Port von outputToNotesPoly (basic-pitch): Onset-Spitzen verfolgen + Melodia-Trick ---- */
  function toNotes(frames, onsets, o) {
    o = o || {};
    const onT = o.onsetThresh ?? 0.5, frT = o.frameThresh ?? 0.3, minLen = o.minNoteLen ?? 5, tol = o.energyTol ?? 11, T = frames.length;
    if (T < 3) return [];
    // abgeleitete Onsets aus Frame-Anstiegen (hilft bei sanften Einsätzen)
    let maxOn = 0; for (let t = 0; t < T; t++) for (let p = 0; p < NP; p++) if (onsets[t][p] > maxOn) maxOn = onsets[t][p];
    const diff = new Array(T); let maxD = 0;
    for (let t = 0; t < T; t++) {
      diff[t] = new Float32Array(NP);
      if (t < 2) continue;
      for (let p = 0; p < NP; p++) { const d = Math.max(0, Math.min(frames[t][p] - frames[t - 1][p], frames[t][p] - frames[t - 2][p])); diff[t][p] = d; if (d > maxD) maxD = d; }
    }
    const on2 = new Array(T);
    for (let t = 0; t < T; t++) { on2[t] = new Float32Array(NP); for (let p = 0; p < NP; p++) { const inf = maxD > 0 ? maxOn * diff[t][p] / maxD : 0; on2[t][p] = Math.max(onsets[t][p], inf); } }
    const rem = new Float32Array(T * NP);
    for (let t = 0; t < T; t++) rem.set(frames[t], t * NP);
    const clear = (a, b, p) => { for (let i = a; i < b; i++) { rem[i * NP + p] = 0; if (p < NP - 1) rem[i * NP + p + 1] = 0; if (p > 0) rem[i * NP + p - 1] = 0; } };
    const peaks = [];
    for (let t = 1; t < T - 1; t++) for (let p = 0; p < NP; p++) { const v = on2[t][p]; if (v >= onT && v > on2[t - 1][p] && v > on2[t + 1][p]) peaks.push([t, p]); }
    peaks.sort((a, b) => b[0] - a[0]);
    const notes = [];
    for (const [t, p] of peaks) {
      if (t >= T - 1) continue;
      let i = t + 1, k = 0;
      while (i < T - 1 && k < tol) { if (frames[i][p] < frT) k++; else k = 0; i++; }
      i -= k;
      if (i - t <= minLen) continue;
      clear(t, i, p);
      let s = 0; for (let f = t; f < i; f++) s += frames[f][p];
      notes.push({ startFrame: t, durFrames: i - t, bin: p, amp: s / (i - t) });
    }
    if (o.melodia !== false) {
      for (let guard = 0; guard < 4000; guard++) {
        let best = frT, bi = -1;
        for (let q = 0; q < rem.length; q++) if (rem[q] > best) { best = rem[q]; bi = q; }
        if (bi < 0) break;
        const im = Math.floor(bi / NP), p = bi % NP;
        rem[bi] = 0;
        let i = im + 1, k = 0;
        while (i < T - 1 && k < tol) { if (rem[i * NP + p] < frT) k++; else k = 0; rem[i * NP + p] = 0; if (p < NP - 1) rem[i * NP + p + 1] = 0; if (p > 0) rem[i * NP + p - 1] = 0; i++; }
        const iEnd = i - 1 - k;
        i = im - 1; k = 0;
        while (i > 0 && k < tol) { if (rem[i * NP + p] < frT) k++; else k = 0; rem[i * NP + p] = 0; if (p < NP - 1) rem[i * NP + p + 1] = 0; if (p > 0) rem[i * NP + p - 1] = 0; i--; }
        const iStart = i + 1 + k;
        if (iEnd - iStart <= minLen) continue;
        let s = 0; for (let f = iStart; f < iEnd; f++) s += frames[f][p];
        notes.push({ startFrame: iStart, durFrames: iEnd - iStart, bin: p, amp: s / (iEnd - iStart) });
      }
    }
    return notes;
  }

  /* x: Float32Array (mono) bei Samplerate sr → [{midi,t0,t1,amp}] in Sekunden ab Anfang von x */
  async function transcribe(x, sr, opts, progress) {
    opts = opts || {};
    if (!model) await load();
    const y = await resample(x, sr);
    if (y.length < SR * 0.25) return [];
    const { frames, onsets } = await run(y, progress);
    const raw = toNotes(frames, onsets, opts);
    return raw.map(n => ({ midi: n.bin + MIDI0, t0: n.startFrame * HOPF / SR, t1: (n.startFrame + n.durFrames) * HOPF / SR, amp: n.amp }))
      .sort((a, b) => a.t0 - b.t0 || a.midi - b.midi);
  }

  window.BasicPitchAI = {
    state: st, load, installFiles, remove, transcribe,
    onChange: f => { listeners.push(f); },
    _internals: { toNotes, run, resample, set model(m) { model = m; st.status = 'ready'; }, get model() { return model; }, consts: { SR, HOPF, WIN, HOP, PAD, TRIM } }
  };
})();
