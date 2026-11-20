/* ===== Sunshine@R · Speicher-Sparer (Spuren entladen) =====
   Warum: Jede Audiospur liegt entschlüsselt (Float32) im Arbeitsspeicher – ca. 95 MB für 4:30 Stereo. Spuren, die gerade nicht zu hören sind
   (stumm oder durch Solo ausgeblendet), brauchen diesen Speicher nicht. Der Sparer ersetzt solche Puffer durch einen leichten Platzhalter
   (Länge, Wellenform, Name bleiben) und hält die Daten kompakt als Datei-Blob bereit (Original-Datei oder verlustfreie WAV).
   Beim Hörbarmachen, Abspielen oder Exportieren wird die Spur automatisch wieder geladen – Bit für Bit identisch.
   Standard: AUS (Optionen → Stabilität & Leistung → Speicher-Sparer). Manuell einzelne Spuren entladen/laden geht immer. */
(function () {
  'use strict';
  const K = 'sunshine.saver', DELAY = 8000, MIN_MB = 1;
  const say = (m, k) => { try { if (typeof toast === 'function') toast(m, k || 'info'); } catch (_) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const auto = () => { try { return localStorage.getItem(K) === '1'; } catch (_) { return false; } };
  const eng = () => (typeof audioEngine !== 'undefined' ? audioEngine : null);
  const B = () => (typeof dawState !== 'undefined' && dawState.buffers) || {};
  const isAud = t => !!t && (t.type === 'audio' || t.type === 'stem' || t.type === 'mic');
  const trackOf = id => (dawState.tracks || []).find(t => String(t.id) === String(id));
  const nameOf = id => { const t = trackOf(id); return t ? (t.name || String(id)) : String(id); };
  const mbOf = b => b.length * b.numberOfChannels * 4 / 1048576;
  const log = m => { try { window.Health && Health.log && Health.log(m, 'saver'); } catch (_) {} };

  /* ---------- Platzhalter für einen entladenen Puffer ---------- */
  function Parked(buf, blob, name, own, id) {
    this.__parked = true; this.duration = buf.duration; this.length = buf.length; this.sampleRate = buf.sampleRate; this.numberOfChannels = buf.numberOfChannels;
    this.blob = blob; this.name = name || ''; this.own = !!own; this._id = id;
  }
  let warned = 0;
  Parked.prototype._need = function () {
    setTimeout(() => { ensureAll().catch(() => {}); }, 0);
    const now = Date.now(); if (now - warned > 4000) { warned = now; say('Spur „' + nameOf(this._id) + '“ war entladen (Speicher-Sparer) und wird geladen – bitte gleich noch einmal versuchen.', 'warn'); }
    throw new Error('Spur „' + nameOf(this._id) + '“ ist entladen (Speicher-Sparer) – sie wird jetzt geladen, bitte die Aktion wiederholen.');
  };
  ['getChannelData', 'copyFromChannel', 'copyToChannel'].forEach(m => { Parked.prototype[m] = function () { this._need(); }; });

  /* ---------- verlustfreie WAV (32 Bit Float) – nur für Spuren ohne Original-Datei ---------- */
  const w4 = (v, o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  function wavBlob(buf) {
    const nc = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, data = new Float32Array(n * nc);
    for (let c = 0; c < nc; c++) { const d = buf.getChannelData(c); for (let i = 0, j = c; i < n; i++, j += nc) data[j] = d[i]; }
    const h = new ArrayBuffer(44), v = new DataView(h);
    w4(v, 0, 'RIFF'); v.setUint32(4, 36 + data.byteLength, true); w4(v, 8, 'WAVE'); w4(v, 12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true);
    v.setUint16(22, nc, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nc * 4, true); v.setUint16(32, nc * 4, true); v.setUint16(34, 32, true); w4(v, 36, 'data'); v.setUint32(40, data.byteLength, true);
    return new Blob([h, data], { type: 'audio/wav' });
  }
  function fromWav(ab, ctx) {
    const v = new DataView(ab), nc = v.getUint16(22, true), sr = v.getUint32(24, true), n = Math.floor((ab.byteLength - 44) / (4 * nc)), f = new Float32Array(ab, 44, n * nc);
    const b = ctx.createBuffer(nc, n, sr);
    for (let c = 0; c < nc; c++) { const d = b.getChannelData(c); for (let i = 0, j = c; i < n; i++, j += nc) d[i] = f[j]; }
    return b;
  }

  /* ---------- Wer wird gerade gebraucht? ---------- */
  function needed() {
    const set = new Set(), T = dawState.tracks || [], any = T.some(t => t.solo);
    T.forEach(tr => {
      if (!isAud(tr)) return;
      if (!(any ? tr.solo : !tr.mute)) return;
      if (Array.isArray(tr.clips)) tr.clips.forEach(c => set.add(String(c.src || tr.id))); else set.add(String(tr.id));
    });
    return set;
  }
  const candidates = () => Object.keys(B()).filter(id => isAud(trackOf(id)));

  /* ---------- Entladen ---------- */
  function stopSourcesOf(buf) {
    try {
      const e = eng(); if (!e || !Array.isArray(e.activeStemSources)) return;
      e.activeStemSources = e.activeStemSources.filter(s => {
        if (s.buffer !== buf) return true;
        try { s.onended = null; s.stop(); s.disconnect(); if (s._g) s._g.disconnect(); } catch (_) {}
        return false;
      });
    } catch (_) {}
  }
  function park(id, opt) {
    opt = opt || {}; id = String(id);
    const b = B()[id]; if (!b || b.__parked || !b.length) return false;
    if (!opt.force && mbOf(b) < MIN_MB) return false;
    if (dawState.isPlaying && needed().has(id)) return false;          // Was gerade klingt, wird nie entladen
    const IO = window.__projectIO, s = IO && IO.srcOf && IO.srcOf(b);
    let blob, name = '', own = false;
    try { if (s && s.blob) { blob = s.blob; name = s.name || ''; } else { blob = wavBlob(b); own = true; } } catch (e) { log('Entladen fehlgeschlagen (' + nameOf(id) + '): ' + e.message); return false; }
    const st = new Parked(b, blob, name, own, id);
    try { ClipModel.adoptPeaks(b, st); } catch (_) {}
    stopSourcesOf(b);
    dawState.buffers[id] = st; stats.parks++;
    return true;
  }

  /* ---------- Laden ---------- */
  const loading = {};
  function load(id) {
    id = String(id); const st = B()[id];
    if (!st || !st.__parked) return Promise.resolve(true);
    if (loading[id]) return loading[id];
    loading[id] = (async () => {
      try {
        await audioEngine.ensureCtx();
        const ab = await st.blob.arrayBuffer();
        const nb = st.own ? fromWav(ab, audioEngine.ctx) : await __projectIO.decodeKeep(ab, st.name);
        if (B()[id] === st) {
          try { ClipModel.adoptPeaks(st, nb); } catch (_) {}
          dawState.buffers[id] = nb; stats.loads++;
        }
        return true;
      } catch (e) { log('Laden fehlgeschlagen (' + nameOf(id) + '): ' + (e && e.message)); say('Spur „' + nameOf(id) + '“ konnte nicht geladen werden: ' + (e && e.message), 'error'); return false; }
      finally { delete loading[id]; }
    })();
    return loading[id];
  }
  async function loadSet(ids) { let ok = true; for (const id of ids) { if (!(await load(id))) ok = false; } return ok; }
  const parkedIds = () => Object.keys(B()).filter(id => B()[id] && B()[id].__parked);
  const ensureAll = async () => { const ids = parkedIds(); const ok = await loadSet(ids); if (ids.length) repaint(); return ok; };
  const ensureAudible = async () => { const n = needed(), ids = parkedIds().filter(id => n.has(id)); const ok = await loadSet(ids); if (ids.length) repaint(); return ok; };

  /* ---------- Abgleich (läuft alle 3 s und nach Mute/Solo) ---------- */
  const idle = {}; let busy = false; const stats = { parks: 0, loads: 0 };
  async function reconcile(now) {
    if (busy) return; busy = true;
    try {
      const need = needed(), P = parkedIds().filter(id => need.has(id));
      if (P.length && (auto() || dawState.isPlaying)) {
        const ok = await loadSet(P);
        if (ok && dawState.isPlaying) { try { audioEngine.seek(dawState.playheadSec); } catch (_) {} }   // neu hörbare Spur an der Abspielposition einklinken
        repaint();
      }
      if (!auto()) { Object.keys(idle).forEach(k => delete idle[k]); return; }
      const t = now || Date.now(); let changed = false;
      candidates().forEach(id => {
        const b = B()[id]; if (!b || b.__parked) { delete idle[id]; return; }
        if (need.has(id)) { delete idle[id]; return; }
        if (!idle[id]) idle[id] = t;
        if (t - idle[id] >= DELAY && park(id)) { delete idle[id]; changed = true; }
      });
      if (changed) repaint();
    } finally { busy = false; }
  }
  let deb = 0; const later = () => { clearTimeout(deb); deb = setTimeout(() => { reconcile().catch(() => {}); }, 60); };

  /* ---------- Einbau in die App ---------- */
  function hook() {
    const e = eng(); if (!e || e.__saver) return; e.__saver = true;
    const play = e.play.bind(e);
    e.play = async function () { try { await ensureAudible(); } catch (_) {} return play.apply(null, arguments); };
    if (typeof e.syncAudioParams === 'function') { const sp = e.syncAudioParams.bind(e); e.syncAudioParams = function () { const r = sp.apply(null, arguments); later(); return r; }; }
    if (typeof window.__exportMix === 'function') { const ex = window.__exportMix; window.__exportMix = async function () { await ensureAudible(); return ex.apply(this, arguments); }; }
    /* Export-Knopf: erst laden, dann starten */
    document.addEventListener('click', ev => {
      const btn = ev.target.closest && ev.target.closest('#btn-export-wav, [data-saver-gate]'); if (!btn || btn.__sv) return;
      const n = needed(); if (!parkedIds().some(id => n.has(id))) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      say('Entladene Spuren werden geladen …', 'info');
      ensureAudible().then(ok => { if (ok) { btn.__sv = true; try { btn.click(); } finally { btn.__sv = false; } } });
    }, true);
  }

  /* ---------- Zustand ---------- */
  function status() {
    let loadedMB = 0, parkedMB = 0, nl = 0, np = 0; const rows = [];
    candidates().forEach(id => {
      const b = B()[id]; if (!b || !b.length) return; const mb = mbOf(b), p = !!b.__parked;
      if (p) { parkedMB += mb; np++; } else { loadedMB += mb; nl++; }
      rows.push({ id, name: nameOf(id), mb: Math.round(mb * 10) / 10, parked: p, audible: needed().has(id) });
    });
    return { auto: auto(), loadedMB: Math.round(loadedMB), parkedMB: Math.round(parkedMB), loaded: nl, parked: np, rows, parks: stats.parks, loads: stats.loads };
  }

  /* ---------- Optionen ---------- */
  let paintFn = null; function repaint() { try { if (paintFn) paintFn(); } catch (_) {} }
  function section(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Speicher-Sparer</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3">
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-sv-auto ${auto() ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Nicht hörbare Spuren automatisch entladen</span><span class="block text-[11px] leading-4 text-slate-400">Stumme Spuren (oder Spuren, die wegen Solo schweigen) geben nach ca. 8 Sekunden ihren Arbeitsspeicher frei. Beim Einschalten, Abspielen oder Exportieren werden sie automatisch wieder geladen (kurze Wartezeit). Aussehen, Länge und Wellenform bleiben erhalten.</span></span></label>
        <div class="text-[11px] text-slate-400" data-sv-sum></div>
        <div class="space-y-1" data-sv-list></div>
        <div class="grid grid-cols-2 gap-2"><button type="button" data-sv-inaud class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Nicht hörbare jetzt entladen</button><button type="button" data-sv-all class="py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Alle laden</button></div>
        <div class="text-[11px] leading-4 text-slate-500">Hinweis: Alles, was gleichzeitig klingt, muss geladen sein – wer 12 Spuren gleichzeitig hört, braucht auch 12 Puffer. Der Sparer hilft vor allem, wenn viele Spuren stumm sind (z. B. beim Arrangieren oder beim Üben einzelner Stems).</div>
      </div>`;
    const q = s => ph.querySelector(s);
    paintFn = () => {
      if (!ph.isConnected) { paintFn = null; return; }
      const st = status();
      q('[data-sv-sum]').innerHTML = st.rows.length ? 'Im Speicher: <b class="text-slate-200">' + st.loadedMB + ' MB</b> (' + st.loaded + ' Spuren) · entladen: <b class="text-emerald-300">' + st.parkedMB + ' MB</b> (' + st.parked + ' Spuren)' : 'Noch keine Audiospuren geladen.';
      q('[data-sv-list]').innerHTML = st.rows.map(r => `<div class="flex items-center gap-2 text-[12px]"><span class="min-w-0 flex-1 truncate ${r.parked ? 'text-slate-500' : 'text-slate-200'}">${esc(r.name)}</span><span class="font-mono text-slate-400">${r.mb} MB</span><button type="button" data-sv-one="${esc(r.id)}" class="px-2 py-1 text-[11px] font-bold rounded-lg border ${r.parked ? 'border-emerald-700 text-emerald-300' : 'border-slate-700 text-slate-300'} bg-slate-900">${r.parked ? 'Laden' : 'Entladen'}</button></div>`).join('');
    };
    paintFn();
    ph.addEventListener('change', e => { if (e.target.matches('[data-sv-auto]')) { try { localStorage.setItem(K, e.target.checked ? '1' : '0'); } catch (_) {} say(e.target.checked ? 'Speicher-Sparer an.' : 'Speicher-Sparer aus – entladene Spuren werden beim Abspielen geladen.', 'info'); later(); } });
    ph.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-sv-one]')) {
        const id = t.dataset.svOne, b = B()[id];
        if (b && b.__parked) await load(id);
        else if (!park(id, { force: true })) say(dawState.isPlaying && needed().has(id) ? 'Diese Spur klingt gerade – erst stoppen oder stummschalten.' : 'Diese Spur kann nicht entladen werden.', 'warn');
        repaint();
      } else if (t.matches('[data-sv-all]')) { await ensureAll(); say('Alle Spuren geladen.', 'info'); }
      else if (t.matches('[data-sv-inaud]')) { const n = needed(); let k = 0; candidates().forEach(id => { if (!n.has(id) && park(id, { force: true })) k++; }); say(k ? k + ' Spur(en) entladen.' : 'Keine nicht hörbare Spur zum Entladen.', 'info'); repaint(); }
    });
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ph = n.id === 'sv-sec' ? n : (n.querySelector && n.querySelector('#sv-sec')); if (ph && !ph.dataset.done) { ph.dataset.done = '1'; section(ph); } }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  function boot() { hook(); setInterval(() => { reconcile().catch(() => {}); }, 3000); }
  window.Saver = { status, park, load, ensureAll, ensureAudible, reconcile, needed: () => Array.from(needed()), setAuto: on => { try { localStorage.setItem(K, on ? '1' : '0'); } catch (_) {} later(); }, auto, _wavBlob: wavBlob, _DELAY: DELAY };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
