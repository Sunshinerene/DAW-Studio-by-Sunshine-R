/* ===== Sunshine@R · Startseite & Projektverwaltung =====
   Startbildschirm mit Logo-Animation, Projektliste (laden · umbenennen · duplizieren · löschen),
   „Neues Projekt“ mit Einstellungen und späteren Projekt-Einstellungen.
   Projekte liegen in derselben Datenbank wie „Projekt speichern“ (SunshineRStemStudioProjects); für die schnelle Liste gibt es
   zusätzlich einen kleinen Index (SunshineHome), damit das Audio nicht bei jedem Öffnen der Startseite geladen werden muss. */
(function () {
  'use strict';
  function main() {
  if (!window.__projectIO || typeof dawState === 'undefined') { console.warn('[Home] Projekt-Modul fehlt'); document.documentElement.classList.remove('home-pending'); return; }
  const $ = id => document.getElementById(id);
  const safe = f => { try { return f(); } catch (e) { console.warn('[Home]', e); } };
  const say = (m, k) => safe(() => toast(m, k || 'info'));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const LS_ON = 'sunshine.home', html = document.documentElement;
  const startEnabled = () => { try { return localStorage.getItem(LS_ON) !== 'off'; } catch (_) { return true; } };
  const ACTIVE = startEnabled();

  const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const SCALES = { chromatic: 'Chromatisch', major: 'Dur', minor: 'Moll', harmonicMinor: 'Harmonisch Moll', phrygian: 'Phrygisch', pentatonic: 'Pentatonik' };
  const keyLabel = (r, s) => (r == null || s === 'chromatic') ? '' : NOTES[((r % 12) + 12) % 12] + ' ' + (SCALES[s] || s);
  const SECTION_BASE = [['intro', 'Intro', '#64748b'], ['verse', 'Verse / Build-Up', '#f59e0b'], ['drop', 'Drop / Hook', '#10b981'], ['break', 'Break', '#a855f7'], ['outro', 'Outro', '#38bdf8']];
  const ARR = { std: { label: 'Standard · 24 Takte', bars: [4, 4, 8, 4, 4] }, short: { label: 'Kurz · 16 Takte', bars: [2, 2, 8, 2, 2] }, long: { label: 'Lang · 48 Takte', bars: [8, 8, 16, 8, 8] } };
  const arrSections = k => SECTION_BASE.map((s, i) => ({ id: s[0], name: s[1], bars: ARR[k].bars[i], color: s[2] }));
  const fmtDur = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function rel(ts) {
    const d = Date.now() - ts, m = d / 60000;
    if (m < 1) return 'gerade eben'; if (m < 60) return 'vor ' + Math.round(m) + ' Min.'; const h = m / 60; if (h < 24) return 'vor ' + Math.round(h) + ' Std.';
    const dd = h / 24; if (dd < 2) return 'gestern'; if (dd < 7) return 'vor ' + Math.floor(dd) + ' Tagen';
    return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /* ------------------------------------------------------------------ Datenbank */
  const dbs = {};
  function openDb(name, stores) {
    return dbs[name] || (dbs[name] = new Promise((res, rej) => {
      let r; try { r = indexedDB.open(name, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => { const d = r.result; stores.forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('Datenbank nicht verfügbar'));
    }));
  }
  const mainDb = () => openDb('SunshineRStemStudioProjects', ['projects']), idxDb = () => openDb('SunshineHome', ['idx']);
  function rq(dbf, store, mode, fn) {
    return dbf().then(db => new Promise((res, rej) => {
      const t = db.transaction(store, mode); let r; try { r = fn(t.objectStore(store)); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abgebrochen'));
    }));
  }
  function metaOf(rec) {
    const p = rec.payload || {}, st = p.state || {}, tr = st.tracks || [], bufs = p.buffers || {}; let dur = 0;
    Object.values(bufs).forEach(b => { if (b && b.length && b.sampleRate) dur = Math.max(dur, b.length / b.sampleRate); });
    const bars = (st.sections || []).reduce((a, s) => a + (s.bars || 0), 0), arrSec = bars * 4 * 60 / (st.bpm || 120);
    return { id: rec.id, name: rec.name, updatedAt: rec.updatedAt, created: (st.project && st.project.created) || rec.updatedAt, notes: (st.project && st.project.notes) || '', thumb: (st.project && st.project.thumb) || '',
      bpm: st.bpm, key: keyLabel(st.midiRoot, st.midiScale), tracks: tr.length, audio: Object.keys(bufs).length, dur: Math.max(dur, 0), arrSec,
      colors: tr.slice(0, 8).map(t => t.color || '#38bdf8') };
  }
  async function loadIndex() {
    const keys = (await rq(mainDb, 'projects', 'readonly', s => s.getAllKeys())) || [], have = (await rq(idxDb, 'idx', 'readonly', s => s.getAll())) || [], hv = new Map(have.map(m => [m.id, m]));
    for (const k of keys) {
      if (hv.has(k)) continue;
      try { const rec = await rq(mainDb, 'projects', 'readonly', s => s.get(k)); if (rec && rec.payload) { const m = metaOf(rec); await rq(idxDb, 'idx', 'readwrite', s => s.put(m)); hv.set(k, m); } } catch (e) { console.warn(e); }
    }
    for (const k of [...hv.keys()]) if (!keys.includes(k)) { await rq(idxDb, 'idx', 'readwrite', s => s.delete(k)); hv.delete(k); }
    return [...hv.values()];
  }

  /* ------------------------------------------------------------------ Projektzustand */
  const BLANK = JSON.parse(JSON.stringify(window.__projectIO.makePayload({ noBuffers: true }).state));
  let savedSig = null, saving = null, pendingSession = null, items = [], sortBy = 'recent', query = '', listLoaded = false;
  const bufCount = () => Object.values(dawState.buffers || {}).filter(b => b && b.numberOfChannels).length;
  const hasContent = () => (dawState.tracks || []).length > 0 || bufCount() > 0;
  function sig() { try { return JSON.stringify(window.__projectIO.makePayload({ noBuffers: true }).state) + '|' + Object.entries(dawState.buffers || {}).map(([i, x]) => i + ':' + (x && x.length)).join(','); } catch (_) { return ''; } }
  const isDirty = () => hasContent() && sig() !== savedSig;
  function setSubtitle() { const s = $('status-subtitle'); if (s && dawState.project) { s.textContent = 'Projekt: ' + dawState.project.name; s.dataset.projectName = dawState.project.name; } }
  const autoName = () => 'Unbenannt ' + new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  function ensureProject(name) { if (!dawState.project) dawState.project = { id: uid(), name: name || autoName(), created: Date.now(), notes: '' }; return dawState.project; }
  function uniqueName(base) { const names = new Set(items.map(i => i.name.toLowerCase())); if (!names.has(base.toLowerCase())) return base; for (let n = 2; n < 999; n++) if (!names.has((base + ' ' + n).toLowerCase())) return base + ' ' + n; return base; }

  function saveCurrent(o) {
    o = o || {};
    const run = async () => {
      const fresh = !dawState.project, p = ensureProject(o.name); if (o.name) p.name = o.name;
      const payload = window.__projectIO.makePayload(), rec = { id: p.id, name: p.name, updatedAt: Date.now(), payload };
      await rq(mainDb, 'projects', 'readwrite', s => s.put(rec)); await rq(idxDb, 'idx', 'readwrite', s => s.put(metaOf(rec)));
      savedSig = sig(); setSubtitle();
      if (!o.silent || fresh) say(fresh && o.silent ? `Gesichert als „${p.name}“.` : `Projekt „${p.name}“ gespeichert.`, 'success');
      return rec;
    };
    const p = (saving || Promise.resolve()).catch(() => {}).then(run);      /* Speichervorgänge laufen nacheinander, nie parallel */
    saving = p; p.then(() => {}, () => {}).then(() => { if (saving === p) saving = null; });
    return p;
  }
  async function persistCurrent() {
    if (saving) { try { await saving; } catch (_) {} }
    if (!isDirty()) return true;
    try { await saveCurrent({ silent: true }); return true; } catch (e) { console.error(e); say('Automatisches Speichern fehlgeschlagen: ' + (e && e.message ? e.message : e), 'error'); return false; }
  }
  function syncControls() {
    const bpm = $('input-bpm'); if (bpm) bpm.value = dawState.bpm;
    const rs = $('select-midi-root'), ss = $('select-midi-scale'); if (rs) rs.value = String(dawState.midiRoot); if (ss) ss.value = dawState.midiScale;
    document.querySelectorAll('.midi-grid-btn').forEach(b => { const on = +b.dataset.grid === dawState.midiGridStep; b.className = on ? 'midi-grid-btn px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold' : 'midi-grid-btn px-2 py-0.5 rounded text-slate-400 hover:text-white'; });
    const l = $('btn-loop'); if (l) l.textContent = 'Loop: ' + (dawState.isLooping ? 'AN' : 'AUS');
    const m = $('btn-metronome'); if (m) m.className = dawState.metronomeOn ? 'px-2 py-1.5 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition' : 'px-2 py-1.5 rounded-lg bg-daw-surface hover:bg-daw-elevated text-slate-400 border border-daw-border text-[11px] font-semibold transition';
    const t = $('lbl-trim-offset'); if (t) t.textContent = (dawState.startOffsetMs || 0) + ' ms';
    safe(() => updateClockLCD()); safe(() => document.dispatchEvent(new CustomEvent('sunshine-project-changed')));
  }
  const clearHistory = () => safe(() => window.__dawClearHistory && window.__dawClearHistory());
  async function prepareSwitch() { await audioEngine.ensureCtx(); safe(() => { if (dawState.isPlaying) audioEngine.stop(true); }); return persistCurrent(); }

  async function createProject(o) {
    await prepareSwitch();
    const st = JSON.parse(JSON.stringify(BLANK));
    st.bpm = clamp(Math.round(o.bpm) || 120, 60, 180); st.midiRoot = o.root; st.midiScale = o.scale; st.midiGridStep = o.grid; st.metronomeOn = !!o.click; st.isLooping = !!o.loop;
    st.sections = arrSections(o.arr || 'std'); st.project = { id: uid(), name: (o.name || 'Neues Projekt').trim().slice(0, 48), created: Date.now(), notes: (o.notes || '').slice(0, 400) };
    if (o.cv && window.Cover) Cover.applyTo(st.project, o.cv);
    window.__projectIO.restorePayload({ state: st, buffers: {} });
    dawState.project = st.project; clearHistory(); syncControls(); setSubtitle(); savedSig = null;
    if (o.start === 'midi') safe(() => { const tr = createTrack('midi', 'Melodie'); dawState.activeMidiTrackId = tr.id; dawState.tracks.forEach(t => safe(() => audioEngine.ensureTrackNode(t))); renderMultiTrackLanes(); renderVerticalMixer(); drawPianoRoll(); });
    try { await saveCurrent({ silent: true }); } catch (e) { say('Projekt konnte nicht gespeichert werden: ' + (e && e.message), 'error'); }
    close(); say(`Projekt „${dawState.project.name}“ angelegt.`, 'success');
    if (o.start === 'import') setTimeout(() => safe(() => $('btn-import-files') && $('btn-import-files').click()), 350);
    if (pendingSession) { pendingSession = null; }
  }
  async function openProject(id) {
    const rec = await rq(mainDb, 'projects', 'readonly', s => s.get(id)); if (!rec || !rec.payload) { say('Projekt nicht gefunden.', 'error'); return false; }
    await prepareSwitch();
    try { await window.__projectIO.restorePayload(rec.payload); } catch (e) { console.error(e); say('Projekt konnte nicht geöffnet werden: ' + e.message, 'error'); return false; }
    if (!dawState.project || dawState.project.id !== rec.id) dawState.project = { id: rec.id, name: rec.name, created: rec.updatedAt, notes: '' };
    dawState.project.name = rec.name; clearHistory(); syncControls(); setSubtitle(); savedSig = sig(); pendingSession = null; close(); say(`Projekt „${rec.name}“ geöffnet.`, 'success'); return true;
  }
  async function renameProject(id, name) {
    name = String(name || '').trim().slice(0, 48); if (!name) return false;
    const rec = await rq(mainDb, 'projects', 'readonly', s => s.get(id)); if (!rec) return false;
    rec.name = name; if (rec.payload && rec.payload.state) rec.payload.state.project = Object.assign({}, rec.payload.state.project || { id, created: rec.updatedAt }, { name });
    await rq(mainDb, 'projects', 'readwrite', s => s.put(rec)); await rq(idxDb, 'idx', 'readwrite', s => s.put(metaOf(rec)));
    if (dawState.project && dawState.project.id === id) { dawState.project.name = name; setSubtitle(); }
    return true;
  }
  async function duplicateProject(id) {
    const rec = await rq(mainDb, 'projects', 'readonly', s => s.get(id)); if (!rec) return null;
    rec.id = uid(); rec.name = uniqueName((rec.name + ' Kopie').slice(0, 48)); rec.updatedAt = Date.now();
    if (rec.payload && rec.payload.state) rec.payload.state.project = Object.assign({}, rec.payload.state.project || {}, { id: rec.id, name: rec.name, created: Date.now() });
    await rq(mainDb, 'projects', 'readwrite', s => s.put(rec)); await rq(idxDb, 'idx', 'readwrite', s => s.put(metaOf(rec))); return rec;
  }
  async function deleteProject(id) {
    await rq(mainDb, 'projects', 'readwrite', s => s.delete(id)); await rq(idxDb, 'idx', 'readwrite', s => s.delete(id));
    if (dawState.project && dawState.project.id === id) { dawState.project = null; savedSig = null; }
  }

  /* ------------------------------------------------------------------ Optik */
  const CSS = `
html.home-pending body>*:not(#home-root){visibility:hidden}
#home-root,.hm-sheet-bg,.hm-big-bg{--hm-a:rgb(var(--daw-accent,255 138 26));--hm-b:#7c3dff;--hm-c:#ff5ca8;--hm-bg:#070920;--hm-glass:rgba(255,255,255,.07);--hm-line:rgba(255,255,255,.14);--hm-r:22px;--hm-blur:blur(18px) saturate(1.4);--hm-text:#eef1ff;--hm-dim:rgba(226,230,255,.66);color-scheme:dark}
html[data-theme=neon] #home-root,html[data-theme=neon] .hm-sheet-bg,html[data-theme=neon] .hm-big-bg{--hm-bg:#05060b;--hm-b:#19c3ff;--hm-c:#ff2fa0}
html[data-theme=liquid] #home-root,html[data-theme=liquid] .hm-sheet-bg,html[data-theme=liquid] .hm-big-bg{--hm-bg:#1b1d2b;--hm-b:#b0a0ff;--hm-c:#ffc4a0;--hm-r:26px;--hm-glass:rgba(255,255,255,.08)}
html[data-theme=studio] #home-root,html[data-theme=studio] .hm-sheet-bg,html[data-theme=studio] .hm-big-bg{--hm-bg:#14161a;--hm-b:#ffb21e;--hm-c:#6b7280;--hm-glass:#1e2127;--hm-line:#2d323b;--hm-r:8px;--hm-blur:none}
html[data-theme=classic] #home-root,html[data-theme=classic] .hm-sheet-bg,html[data-theme=classic] .hm-big-bg{--hm-bg:#090c12;--hm-b:#10b981;--hm-c:#38bdf8;--hm-glass:#171e2e;--hm-line:#28334a;--hm-r:10px;--hm-blur:none}
html[data-glass=off] #home-root,html[data-glass=off] .hm-sheet-bg,html[data-glass=off] .hm-big-bg{--hm-blur:none}
#home-root{position:fixed;inset:0;z-index:110;overflow:hidden;color:var(--hm-text);background:var(--hm-bg);font-family:inherit}
.hm-sheet *{box-sizing:border-box}
#home-root[hidden]{display:none}
#home-root *{box-sizing:border-box}
.hm-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.hm-blob{position:absolute;width:90vmax;height:90vmax;border-radius:50%;will-change:transform;opacity:.55}
.hm-blob.b1{left:-30vmax;top:-45vmax;background:radial-gradient(circle,var(--hm-a) 0%,transparent 62%)}
.hm-blob.b2{right:-45vmax;top:20vmax;background:radial-gradient(circle,var(--hm-b) 0%,transparent 62%)}
.hm-blob.b3{left:-20vmax;bottom:-55vmax;background:radial-gradient(circle,var(--hm-c) 0%,transparent 62%);opacity:.4}
html[data-theme=studio] .hm-blob,html[data-theme=classic] .hm-blob{opacity:.16}
.hm-stage{position:absolute;left:0;right:0;bottom:calc(var(--hd-h,0px) + 20px + env(safe-area-inset-bottom,0px));height:var(--hs-h,200px);display:flex;align-items:flex-start;justify-content:center;pointer-events:none;opacity:0;transition:opacity .5s}
.hm-stage.on{opacity:1}.hm-stage[hidden]{display:none}
.hm-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 30%,#000 80%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 30%,#000 80%,transparent 100%);opacity:.85}
.hm-stage .hm-cvhost{position:relative;z-index:2;margin:6px auto 0;filter:drop-shadow(0 8px 22px rgba(0,0,0,.45))}
#home-root.hm-hasdock .hm-logo{max-height:19vh}#home-root.hm-hasdock .hm-hero::before{height:min(19vh,calc(min(100vw - 32px,560px)*9/16))}
#home-root.hm-hasdock .hm-scroll{height:calc(100% - var(--hd-h,0px) - var(--hs-h,0px) - 28px - env(safe-area-inset-bottom,0px))}
.hm-scroll{position:relative;height:100%;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:max(14px,env(safe-area-inset-top)) 16px max(28px,env(safe-area-inset-bottom))}
.hm-wrap{width:100%;max-width:620px;margin:0 auto}
.hm-top{display:flex;justify-content:flex-start;min-height:44px}
.hm-pill{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--hm-line);background:var(--hm-glass);-webkit-backdrop-filter:var(--hm-blur);backdrop-filter:var(--hm-blur);color:var(--hm-text);font-weight:700;font-size:13px}
.hm-hero{text-align:center;padding:0 0 14px}
.hm-logo{position:relative;display:block;width:min(100%,560px);aspect-ratio:16/9;max-height:34vh;margin:0 auto;-webkit-mask-image:radial-gradient(ellipse 80% 78% at 50% 50%,#000 58%,transparent 100%);mask-image:radial-gradient(ellipse 80% 78% at 50% 50%,#000 58%,transparent 100%);animation:hm-logo-in .9s cubic-bezier(.2,.9,.2,1) both,hm-float 7s ease-in-out .9s infinite}
.hm-hero::before{content:"";position:absolute;left:50%;top:0;width:min(100%,720px);height:min(34vh,calc(min(100vw - 32px,560px)*9/16));transform:translateX(-50%);background:radial-gradient(ellipse at center,color-mix(in srgb,var(--hm-a) 42%,transparent),transparent 68%);animation:hm-halo 4.5s ease-in-out infinite;pointer-events:none}
.hm-hero{position:relative}
.hm-logo img{position:relative;width:100%;height:100%;object-fit:contain;display:none}
.hm-logo.ok img{display:block}.hm-logo.ok .hm-wm{display:none}
.hm-logo.ok::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.38) 50%,transparent 60%) 170% 0/260% 100% no-repeat;mix-blend-mode:screen;animation:hm-shine 6s ease-in-out 1.8s infinite;pointer-events:none}
.hm-wm{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:4px}
.hm-wm svg{width:64px;height:64px;filter:drop-shadow(0 0 18px var(--hm-a))}
.hm-wm b{font-size:clamp(26px,8vw,36px);font-weight:900;letter-spacing:-.02em;background:linear-gradient(90deg,var(--hm-a),var(--hm-c));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
.hm-wm small{font-size:11px;letter-spacing:.32em;color:var(--hm-dim);font-weight:700}
.hm-tag{position:relative;margin:2px 0 0;font-size:13px;color:var(--hm-dim);animation:hm-up .8s .45s both}
.hm-card{border:1px solid var(--hm-line);background:var(--hm-glass);-webkit-backdrop-filter:var(--hm-blur);backdrop-filter:var(--hm-blur);border-radius:var(--hm-r);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 12px 32px rgba(0,0,0,.25)}
.hm-resume{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;text-align:left;color:inherit;border-color:color-mix(in srgb,var(--hm-a) 60%,transparent);animation:hm-up .7s .25s both;min-height:72px}
.hm-resume .ic{flex:none;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,var(--hm-a),var(--hm-c));color:#1b0f00;font-size:18px;animation:hm-pulse 2.4s ease-out infinite}
.hm-resume .tx{flex:1;min-width:0}.hm-resume .tx b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hm-resume .tx span{font-size:12px;color:var(--hm-dim)}
.hm-x{flex:none;min-width:44px;min-height:44px;border-radius:12px;border:1px solid var(--hm-line);background:transparent;color:var(--hm-dim)}
.hm-cta{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:64px;border:0;border-radius:var(--hm-r);font-size:18px;font-weight:900;color:#1b0f00;background:linear-gradient(135deg,var(--hm-a),color-mix(in srgb,var(--hm-a) 55%,#ffe26a));box-shadow:0 10px 30px color-mix(in srgb,var(--hm-a) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.5);margin-top:12px;animation:hm-up .7s .35s both;transition:transform .15s}
.hm-cta:active{transform:scale(.97)}
.hm-cta em{font-style:normal;font-size:26px;line-height:1}
.hm-one{grid-template-columns:1fr!important;margin-top:8px!important}
.hm-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;animation:hm-up .7s .45s both}
.hm-tile{display:flex;align-items:center;gap:10px;min-height:56px;padding:0 14px;border-radius:var(--hm-r);text-align:left;color:var(--hm-text);font-weight:700;font-size:14px}
.hm-tile:active,.hm-item:active,.hm-pill:active{transform:scale(.98)}.hm-tile span{font-size:20px}
.hm-sechead{display:flex;align-items:center;gap:10px;margin:22px 2px 10px;animation:hm-up .7s .55s both}
.hm-sechead h2{margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--hm-dim);font-weight:800;flex:1}
.hm-sechead input,.hm-sechead select,.hm-field input,.hm-field select,.hm-field textarea{min-height:40px;border-radius:12px;border:1px solid var(--hm-line);background:rgba(0,0,0,.28);color:var(--hm-text);padding:0 10px;font-size:14px;font-family:inherit}
.hm-sechead input{width:128px}
.hm-list{display:flex;flex-direction:column;gap:9px}
.hm-item{position:relative;display:flex;align-items:center;gap:12px;width:100%;padding:10px 8px 10px 10px;text-align:left;color:inherit;animation:hm-up .6s calc(.6s + var(--i,0)*60ms) both;transition:transform .15s;min-height:76px}
.hm-art{flex:none;width:56px;height:56px;border-radius:14px;overflow:hidden;background:rgba(0,0,0,.35);border:1px solid var(--hm-line)}
.hm-art svg{width:100%;height:100%;display:block}
.hm-info{flex:1;min-width:0}.hm-info b{display:block;font-size:15px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-info .m{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11.5px;color:var(--hm-dim);margin-top:3px}
.hm-info .d{font-size:11px;color:var(--hm-dim);opacity:.8;margin-top:2px}
.hm-more{flex:none;min-width:44px;min-height:48px;border:0;background:transparent;color:var(--hm-dim);font-size:22px;border-radius:12px}
.hm-cur{display:inline-block;padding:1px 7px;margin-left:6px;border-radius:999px;font-size:9px;letter-spacing:.08em;background:var(--hm-a);color:#1b0f00;vertical-align:middle;font-weight:900}
.hm-empty{text-align:center;padding:26px 16px;color:var(--hm-dim);font-size:13px;line-height:1.5;border:1.5px dashed var(--hm-line);border-radius:var(--hm-r);animation:hm-up .7s .6s both}
.hm-empty svg{width:56px;height:56px;margin-bottom:6px;opacity:.7}
.hm-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:22px;padding:0 4px;font-size:12px;color:var(--hm-dim)}
.hm-sw{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer;font-size:13px}
.hm-sw input{position:absolute;opacity:0;width:1px;height:1px}
.hm-sw i{flex:none;width:44px;height:26px;border-radius:999px;background:rgba(255,255,255,.16);position:relative;transition:background .2s}
.hm-sw i::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
.hm-sw input:checked+i{background:var(--hm-a)}.hm-sw input:checked+i::after{transform:translateX(18px)}
.hm-sw input:focus-visible+i{outline:2px solid #fff;outline-offset:2px}
.hm-sheet-bg{position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.66);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:hm-fade .2s both}
.hm-sheet{width:100%;max-width:560px;max-height:94vh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;border-radius:24px 24px 0 0;border:1px solid var(--hm-line);background:color-mix(in srgb,var(--hm-bg) 94%,#fff);color:var(--hm-text);padding:16px 16px max(20px,env(safe-area-inset-bottom));animation:hm-sheet .28s cubic-bezier(.2,.9,.2,1) both}
@media(min-width:640px){.hm-sheet-bg{align-items:center}.hm-sheet{border-radius:24px}}
.hm-sheet h3{margin:0 0 12px;font-size:17px;font-weight:900;display:flex;align-items:center;gap:8px}.hm-sheet h3 button{margin-left:auto}
.hm-field{display:flex;flex-direction:column;gap:5px;margin-top:12px}
.hm-field>label,.hm-lab{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--hm-dim);font-weight:800}
.hm-field input[type=text],.hm-field textarea{width:100%;min-height:46px}.hm-field textarea{padding:10px;min-height:64px;resize:none}
.hm-row{display:flex;gap:8px;align-items:center}
.hm-row>*{min-width:0}
.hm-seg{display:flex;gap:4px;padding:3px;border-radius:14px;background:rgba(0,0,0,.3);border:1px solid var(--hm-line)}
.hm-seg button{flex:1;min-height:42px;border:0;border-radius:11px;background:transparent;color:var(--hm-dim);font-weight:700;font-size:12.5px}
.hm-seg button.on{background:var(--hm-a);color:#1b0f00}
.hm-themes{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.hm-themes button{border:2px solid transparent;border-radius:12px;padding:0;background:none;color:var(--hm-dim);font-size:10px;font-weight:700;text-align:center}
.hm-themes button i{display:block;height:34px;border-radius:10px;margin-bottom:3px;border:1px solid var(--hm-line)}
.hm-themes button[aria-pressed=true]{border-color:var(--hm-a);color:var(--hm-text)}
.hm-btns{display:flex;gap:10px;margin-top:18px}.hm-btns .hm-btn{flex:1}
.hm-btn{min-height:50px;border-radius:14px;border:1px solid var(--hm-line);background:rgba(255,255,255,.07);color:var(--hm-text);font-weight:800;font-size:14px;padding:0 14px}
.hm-btn.pri{background:linear-gradient(135deg,var(--hm-a),color-mix(in srgb,var(--hm-a) 55%,#ffe26a));color:#1b0f00;border-color:transparent}.hm-btn.dng{background:#be123c;border-color:#be123c;color:#fff}
.hm-btn[disabled]{opacity:.5}
.hm-act{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:0 14px;border:0;border-radius:14px;background:rgba(255,255,255,.06);color:var(--hm-text);font-size:14px;font-weight:700;text-align:left;margin-top:6px}
.hm-act.dng{color:#fda4af}
.hm-note{font-size:11.5px;color:var(--hm-dim);line-height:1.45;margin-top:10px}
.hm-warn{color:#fbbf24}
.hm-skel{height:76px;border-radius:var(--hm-r);background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.12),rgba(255,255,255,.05)) 0 0/220% 100%;animation:hm-skel 1.2s linear infinite}
@keyframes hm-logo-in{from{opacity:0;transform:scale(.82) translateY(14px);filter:blur(12px)}to{opacity:1;transform:none;filter:none}}
@keyframes hm-halo{0%,100%{opacity:.55;transform:translateX(-50%) scale(.96)}50%{opacity:1;transform:translateX(-50%) scale(1.04)}}
@keyframes hm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes hm-shine{0%,55%{background-position:160% 0}100%{background-position:-60% 0}}
@keyframes hm-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes hm-fade{from{opacity:0}to{opacity:1}}
@keyframes hm-sheet{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
@keyframes hm-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--hm-a) 60%,transparent)}70%,100%{box-shadow:0 0 0 14px transparent}}
@keyframes hm-skel{to{background-position:-220% 0}}
@keyframes hm-b1{0%,100%{transform:translate(0,0)}50%{transform:translate(9vmax,7vmax)}}
@keyframes hm-b2{0%,100%{transform:translate(0,0)}50%{transform:translate(-10vmax,-6vmax)}}
@keyframes hm-b3{0%,100%{transform:translate(0,0)}50%{transform:translate(8vmax,-8vmax)}}
@media(prefers-reduced-motion:no-preference){.hm-blob.b1{animation:hm-b1 22s ease-in-out infinite}.hm-blob.b2{animation:hm-b2 26s ease-in-out infinite}.hm-blob.b3{animation:hm-b3 30s ease-in-out infinite}}
@media(prefers-reduced-motion:reduce){#home-root *{animation-duration:.01s!important;animation-delay:0s!important;animation-iteration-count:1!important}}
/* ===== 1.30: kompakte Startseite im Stil des gewählten Designs ===== */
#home-root,.hm-big-bg{--hm-card-bg:var(--hm-glass);--hm-card-bd:var(--hm-line);--hm-card-sh:inset 0 1px 0 rgba(255,255,255,.1),0 10px 26px rgba(0,0,0,.25);--hm-cta-bg:linear-gradient(135deg,var(--hm-a),color-mix(in srgb,var(--hm-a) 55%,#ffe26a));--hm-cta-fg:#1b0f00;--hm-cta-bd:transparent;--hm-cta-sh:0 8px 24px color-mix(in srgb,var(--hm-a) 40%,transparent),inset 0 1px 0 rgba(255,255,255,.5)}
html[data-theme=aurora] #home-root,html[data-theme=aurora] .hm-big-bg{--hm-r:24px;--hm-card-bg:linear-gradient(180deg,rgba(52,44,112,.6),rgba(14,12,40,.78));--hm-card-bd:var(--td-line);--hm-card-sh:0 10px 26px rgba(0,0,0,.38),0 0 20px var(--td-glow),inset 0 1px 0 rgba(255,255,255,.12)}
html[data-theme=studio] #home-root,html[data-theme=studio] .hm-big-bg{--hm-r:12px;--hm-card-bg:linear-gradient(#262A32,#181B21);--hm-card-bd:#363B45;--hm-card-sh:inset 0 1px 0 rgba(255,255,255,.08),0 2px 0 #0E1013,0 10px 22px rgba(0,0,0,.45);--hm-cta-sh:0 2px 0 rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.4)}
html[data-theme=neon] #home-root,html[data-theme=neon] .hm-big-bg{--hm-r:24px;--hm-card-bg:linear-gradient(180deg,rgba(26,12,58,.88),rgba(8,6,26,.94));--hm-card-bd:rgba(138,61,255,.6);--hm-card-sh:0 0 0 1px rgba(25,195,255,.2),0 0 22px rgba(138,61,255,.32),0 10px 26px rgba(0,0,0,.45);--hm-cta-bg:linear-gradient(135deg,#8a3dff,#19c3ff);--hm-cta-fg:#fff;--hm-cta-sh:0 0 26px rgba(138,61,255,.55),0 8px 22px rgba(0,0,0,.4)}
html[data-theme=liquid] #home-root,html[data-theme=liquid] .hm-big-bg{--hm-r:30px;--hm-card-bg:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.06)),rgba(22,18,48,.6);--hm-card-bd:rgba(255,255,255,.22);--hm-card-sh:0 12px 30px rgba(6,6,16,.4),inset 0 1px 0 rgba(255,255,255,.18);--hm-cta-bg:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.2));--hm-cta-fg:#fff;--hm-cta-bd:rgba(255,255,255,.45);--hm-cta-sh:0 10px 28px rgba(6,6,16,.4),inset 0 1px 0 rgba(255,255,255,.6)}
html[data-theme=classic] #home-root,html[data-theme=classic] .hm-big-bg{--hm-r:14px;--hm-card-bg:rgb(var(--daw-surface,23 30 46));--hm-card-bd:rgb(var(--daw-border,40 51 74));--hm-card-sh:0 6px 16px rgba(0,0,0,.3)}
html[data-radius=sharp] #home-root,html[data-radius=sharp] .hm-big-bg{--hm-r:10px}
html[data-radius=round] #home-root,html[data-radius=round] .hm-big-bg{--hm-r:32px}
html[data-glow=off] #home-root,html[data-glow=off] .hm-big-bg{--hm-card-sh:0 6px 16px rgba(0,0,0,.3)}
#home-root .hm-card{background:var(--hm-card-bg);border:1px solid var(--hm-card-bd);box-shadow:var(--hm-card-sh)}
html[data-theme=studio] #home-root .hm-card{border-top-color:var(--td-line)}
html[data-theme=liquid] #home-root .hm-card{-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3)}
#home-root .hm-pill{background:var(--hm-card-bg);border-color:var(--hm-card-bd);box-shadow:var(--hm-card-sh);min-height:40px;padding:0 14px;font-size:12.5px}
#home-root .hm-resume{border-color:var(--td-line)}
#home-root .hm-cta{background:var(--hm-cta-bg);color:var(--hm-cta-fg);border:1px solid var(--hm-cta-bd);box-shadow:var(--hm-cta-sh);min-height:54px;font-size:17px;margin-top:10px}
#home-root .hm-cta em{font-size:24px}
#home-root .hm-resume{min-height:60px;padding:10px 14px}
#home-root .hm-resume .ic{width:40px;height:40px;font-size:16px}
#home-root .hm-x{min-height:44px}
/* Kompaktere Abstände */
.hm-scroll{padding:max(10px,env(safe-area-inset-top)) 16px max(14px,env(safe-area-inset-bottom))}
.hm-top{min-height:40px;gap:8px;justify-content:space-between}
.hm-hero{padding:0 0 8px}
.hm-logo{max-height:22vh}.hm-hero::before{height:min(22vh,calc(min(100vw - 32px,560px)*9/16))}
.hm-tag{font-size:12.5px;margin:0}
#home-root.hm-hasdock .hm-logo{max-height:15vh}#home-root.hm-hasdock .hm-hero::before{height:min(15vh,calc(min(100vw - 32px,560px)*9/16))}
.hm-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;animation:hm-up .7s .45s both}
.hm-tiles .hm-tile{min-height:48px;padding:0 12px;font-size:13.5px;gap:9px}.hm-tile em{font-style:normal}.hm-tile em i{font-style:normal;font-weight:600;opacity:.75}
.hm-tile-pl{grid-column:1/-1}
.hm-tile span{font-size:18px;line-height:1}
.hm-sechead{margin:14px 2px 8px}
.hm-all{margin-left:auto;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--hm-card-bd);background:var(--hm-card-bg);color:var(--hm-text);font-size:12px;font-weight:800}
.hm-all[hidden]{display:none}
.hm-list{gap:7px}
.hm-item{min-height:62px;padding:7px 4px 7px 8px;gap:10px}
.hm-art{width:46px;height:46px;border-radius:12px}
.hm-info b{font-size:14px}.hm-info .m{margin-top:1px;font-size:11px}.hm-info .d{font-size:10.5px;margin-top:1px}
.hm-more{min-width:44px;min-height:44px}
.hm-foot{margin-top:10px;font-size:11.5px}.hm-sw{min-height:38px}
.hm-skel{height:62px}
/* Passt-ohne-Scrollen: Stufen */
#home-root[data-fit="1"] .hm-tag{display:none}
#home-root[data-fit="1"] .hm-logo{max-height:17vh}#home-root[data-fit="1"] .hm-hero::before{height:min(17vh,calc(min(100vw - 32px,560px)*9/16))}
#home-root[data-fit="1"] .hm-sechead{margin-top:10px}
#home-root[data-fit="2"] .hm-tag,#home-root[data-fit="3"] .hm-tag{display:none}
#home-root[data-fit="2"] .hm-logo{max-height:17vh}#home-root[data-fit="2"] .hm-hero::before{height:min(17vh,calc(min(100vw - 32px,560px)*9/16))}
#home-root[data-fit="2"] .hm-loc,#home-root[data-fit="3"] .hm-loc{display:none}
#home-root[data-fit="2"] .hm-list>.hm-item:nth-child(n+3),#home-root[data-fit="3"] .hm-list>.hm-item:nth-child(n+3){display:none}
#home-root[data-fit="3"] .hm-logo{max-height:11vh}#home-root[data-fit="3"] .hm-hero::before{height:min(11vh,calc(min(100vw - 32px,560px)*9/16))}
#home-root[data-fit="3"] .hm-tiles{grid-template-columns:repeat(3,1fr)}
#home-root[data-fit="3"] .hm-tile-pl{grid-column:auto}
#home-root[data-fit="3"] .hm-tiles .hm-tile{flex-direction:column;justify-content:center;gap:2px;min-height:50px;padding:0 4px;font-size:12px;text-align:center}
#home-root[data-fit="3"] .hm-tile em i{display:none}
#home-root[data-fit="3"] .hm-cta{min-height:48px}
#home-root[data-fit="4"] .hm-tag{display:none}#home-root[data-fit="4"] .hm-loc{display:none}
#home-root[data-fit="4"] .hm-logo{max-height:8vh}#home-root[data-fit="4"] .hm-hero::before{height:min(8vh,calc(min(100vw - 32px,560px)*9/16))}
#home-root[data-fit="4"] .hm-list>.hm-item:nth-child(n+3){display:none}
#home-root[data-fit="4"] .hm-tiles{grid-template-columns:repeat(3,1fr)}#home-root[data-fit="4"] .hm-tile-pl{grid-column:auto}
#home-root[data-fit="4"] .hm-tiles .hm-tile{flex-direction:column;justify-content:center;gap:2px;min-height:44px;padding:0 4px;font-size:12px;text-align:center}#home-root[data-fit="4"] .hm-tile em i{display:none}
#home-root[data-fit="4"] .hm-cta{min-height:44px;margin-top:8px}#home-root[data-fit="4"] .hm-resume{min-height:48px;padding:6px 12px}#home-root[data-fit="4"] .hm-resume .ic{width:34px;height:34px}
#home-root[data-fit="4"] .hm-item{min-height:52px}#home-root[data-fit="4"] .hm-art{width:38px;height:38px}#home-root[data-fit="4"] .hm-info .d{display:none}
#home-root[data-fit="4"] .hm-sechead{margin:8px 2px 6px}#home-root[data-fit="4"] #hm-update>.hp-new:nth-child(n+2){display:none}#home-root[data-fit="4"] #hm-update:not(:empty)+#hm-newbie{display:none}
#home-root[data-fit="4"] .hm-foot{margin-top:4px}#home-root[data-fit="4"] .hm-sw{min-height:32px}
#home-root[data-fit="3"] .hm-resume{min-height:52px}
/* Bühne (Cover + Equalizer): tiefer, direkt über der Dockbar */
.hm-stage{bottom:calc(var(--hd-h,0px) + 12px + env(safe-area-inset-bottom,0px));align-items:flex-start}
.hm-stage .hm-cvhost{margin:2px auto 0}
.hm-stage canvas{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 24%,#000 78%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 24%,#000 78%,transparent 100%)}
#home-root.hm-hasdock .hm-scroll{height:calc(100% - var(--hd-h,0px) - var(--hs-h,0px) - 16px - env(safe-area-inset-bottom,0px))}
/* Große Ansicht: schwebendes Fenster mit Abstand zum Hauptbildschirm */
#home-root{transition:transform .42s cubic-bezier(.2,.9,.2,1),filter .42s,border-radius .42s;transform-origin:50% 40%}
#home-root.hm-depth{transform:scale(.92) translateY(-6px);filter:brightness(.5) saturate(.85) blur(2px);border-radius:30px;pointer-events:none}
.hm-big-bg{position:fixed;inset:0;z-index:140;background:rgba(2,3,10,.62);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 7vh) 10px calc(10px + env(safe-area-inset-bottom,0px));animation:hm-fade .22s both;color:var(--hm-text)}
.hm-big-bg *{box-sizing:border-box}
.hm-big::before{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--hm-card-bg);pointer-events:none;z-index:0}.hm-big>*{position:relative;z-index:1}
.hm-big-bg.out{opacity:0;transition:opacity .22s}.hm-big-bg.out .hm-big{transform:translateY(40px) scale(.97);transition:transform .25s}
.hm-big{position:relative;width:100%;max-width:600px;height:100%;display:flex;flex-direction:column;border-radius:calc(var(--hm-r) + 6px);border:1px solid var(--hm-card-bd);background:color-mix(in srgb,var(--hm-bg) 94%,#fff);box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.05),var(--hm-card-sh);padding:6px 14px 14px;animation:hm-bigin .38s cubic-bezier(.2,.9,.2,1) both;overflow:hidden}
html[data-theme=liquid] .hm-big{-webkit-backdrop-filter:blur(26px);backdrop-filter:blur(26px)}
.hm-grab{align-self:center;flex:none;width:100%;height:22px;border:0;background:none;display:grid;place-items:center}.hm-grab i{display:block;width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.3)}
.hm-big-h{display:flex;align-items:center;gap:10px;margin:0 2px 8px}.hm-big-h h3{margin:0;flex:1;font-size:16px;font-weight:900}
.hm-pill-x{min-width:40px;padding:0!important;display:grid;place-items:center;border:1px solid var(--hm-card-bd);background:var(--hm-card-bg);border-radius:999px;color:var(--hm-text)}
.hm-big-tools{display:flex;gap:8px;margin-bottom:10px}
.hm-big-tools input,.hm-big-tools select{min-height:42px;border-radius:12px;border:1px solid var(--hm-line);background:rgba(0,0,0,.3);color:var(--hm-text);padding:0 12px;font-size:14px;font-family:inherit}
.hm-big-tools input{flex:1;min-width:0}
.hm-biglist{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:2px 0 6px;scrollbar-width:none}
.hm-biglist::-webkit-scrollbar{display:none}
.hm-biglist .hm-item{animation:none}
.hm-big .hm-card{background:var(--hm-card-bg);border:1px solid var(--hm-card-bd)}
@keyframes hm-bigin{from{transform:translateY(60px) scale(.96);opacity:0}to{transform:none;opacity:1}}
/* Hinweiskarten (Update, Neu hier, Neu in …, Bald in der App): einzeilig und kompakt */
#home-root :is(#hm-newbie,#hm-update) .hp-new{padding:8px 10px;gap:8px;margin-bottom:8px;border-radius:var(--hm-r);background:var(--hm-card-bg);border-color:var(--hm-card-bd);box-shadow:var(--hm-card-sh)}
#home-root :is(#hm-newbie,#hm-update) .hp-new b{font-size:13.5px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#home-root :is(#hm-newbie,#hm-update) .hp-new span.s{display:block;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#home-root :is(#hm-newbie,#hm-update) .hp-new .tx>span.s:nth-of-type(n+2){display:none}
#home-root :is(#hm-newbie,#hm-update) .hp-new button{min-height:36px;padding:0 12px;font-size:12px;border-radius:12px}
#home-root :is(#hm-newbie,#hm-update) .hp-new .no{padding:0 6px;background:transparent}
#home-root[data-fit="2"] #hm-update:not(:empty)+#hm-newbie,#home-root[data-fit="3"] #hm-update:not(:empty)+#hm-newbie{display:none}
#home-root[data-fit="3"] #hm-update>.hp-new:nth-child(n+2){display:none}
/* Scrollbalken der Startseite ausblenden (Option „Scrollbalken anzeigen“ blendet sie wieder ein) */
html:not([data-sb=show]) .hm-scroll,html:not([data-sb=show]) .hm-sheet{scrollbar-width:none}
html:not([data-sb=show]) .hm-scroll::-webkit-scrollbar,html:not([data-sb=show]) .hm-sheet::-webkit-scrollbar{display:none}
`;
  const style = document.createElement('style'); style.id = 'home-css'; style.textContent = CSS; document.head.appendChild(style);

  /* ------------------------------------------------------------------ Aufbau */
  const WM = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="hmg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff7a1a"/></linearGradient></defs><circle cx="32" cy="32" r="13" fill="url(#hmg)"/><g stroke="url(#hmg)" stroke-width="4" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return `<path d="M${(32 + c * 20).toFixed(1)} ${(32 + s * 20).toFixed(1)}L${(32 + c * 27).toFixed(1)} ${(32 + s * 27).toFixed(1)}"/>`; }).join('')}</g></svg>`;
  const LOGO = 'assets/sunshine-r-daw-studio-logo.png';
  const root = document.createElement('div');
  root.id = 'home-root'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Startseite');
  root.style.setProperty('--hm-logo-url', `url("${LOGO}")`);
  root.innerHTML = `<div class="hm-bg" aria-hidden="true"><i class="hm-blob b1"></i><i class="hm-blob b2"></i><i class="hm-blob b3"></i><div class="hm-stage" id="hm-stage" hidden><canvas id="hm-viz" aria-hidden="true"></canvas><div class="hm-cvhost" id="hm-cvhost"></div></div></div>
  <div class="hm-scroll"><div class="hm-wrap">
    <div class="hm-top"><button type="button" class="hm-pill" id="hm-back" hidden>← Projekt</button><button type="button" class="hm-pill" id="hm-fb">💬 Feedback</button><button type="button" class="hm-pill" id="hm-help">❓ Anleitung</button></div>
    <header class="hm-hero"><div class="hm-logo" id="hm-logo"><img src="${LOGO}" alt="Sunshine@R DAW Studio"><div class="hm-wm">${WM}<b>Sunshine@R</b><small>STEM DAW STUDIO</small></div></div>
      <p class="hm-tag">Stems importieren · mischen · veredeln</p></header>
    <div id="hm-update"></div>
    <div id="hm-newbie"></div>
    <div id="hm-resume"></div>
    <button type="button" class="hm-cta" id="hm-new"><em>＋</em> Neues Projekt</button>
    <div class="hm-tiles"><button type="button" class="hm-card hm-tile" id="hm-import"><span>🎵</span><em>Stems laden</em></button><button type="button" class="hm-card hm-tile" id="hm-opts"><span>⚙️</span><em>Optionen</em></button><button type="button" class="hm-card hm-tile hm-tile-pl" id="hm-player"><span>🎧</span><em>Player<i> – Musik abspielen</i></em></button></div>
    <div class="hm-sechead"><h2 id="hm-count">Letzte Projekte</h2><button type="button" class="hm-all" id="hm-all" hidden>Alle anzeigen ›</button></div>
    <div class="hm-list" id="hm-list"></div>
    <div class="hm-foot"><label class="hm-sw"><input type="checkbox" id="hm-auto"><i></i><span>Beim Start anzeigen</span></label><span class="hm-loc">Alles bleibt lokal auf diesem Gerät</span></div>
  </div></div>`;
  const img = root.querySelector('.hm-logo img'), logoBox = root.querySelector('#hm-logo');
  img.addEventListener('load', () => { if (img.naturalWidth > 0) logoBox.classList.add('ok'); }); img.addEventListener('error', () => logoBox.classList.remove('ok'));
  document.body.appendChild(root);
  if (img.complete && img.naturalWidth > 0) logoBox.classList.add('ok');

  /* ------------------------------------------------------------------ Darstellung der Listen */
  function artSvg(m) {
    const cols = m.colors && m.colors.length ? m.colors : ['#64748b', '#38bdf8', '#a855f7'];
    let seed = 0; for (const ch of String(m.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const bars = Array.from({ length: 9 }, (_, i) => { const hgt = 10 + rnd() * 30, c = cols[i % cols.length]; return `<rect x="${4 + i * 5.6}" y="${48 - hgt}" width="3.6" height="${hgt}" rx="1.8" fill="${c}"/>`; }).join('');
    return `<svg viewBox="0 0 56 56" aria-hidden="true"><defs><linearGradient id="g${m.id.replace(/\W/g, '').slice(0, 8)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cols[0]}" stop-opacity=".35"/><stop offset="1" stop-color="${cols[cols.length - 1]}" stop-opacity=".12"/></linearGradient></defs><rect width="56" height="56" fill="url(#g${m.id.replace(/\W/g, '').slice(0, 8)})"/>${bars}</svg>`;
  }
  function curId() { return dawState.project ? dawState.project.id : null; }
  function renderResume() {
    const el = $('hm-resume'); if (!el) return; let h = '';
    if (pendingSession) {
      const s = pendingSession; h = `<div style="display:flex;gap:8px;align-items:stretch"><button type="button" class="hm-card hm-resume" id="hm-resume-go" style="flex:1"><span class="ic">↺</span><span class="tx"><b>Letzte Sitzung fortsetzen</b><span>${esc(s.name || 'Unbenannt')} · ${s.tracks} Spur(en) · ${rel(s.savedAt)}</span></span></button><button type="button" class="hm-card hm-x" id="hm-resume-no" aria-label="Gesicherte Sitzung verwerfen" title="Verwerfen" style="min-height:72px">✕</button></div>`;
    } else if (hasContent() || dawState.project) {
      const name = dawState.project ? dawState.project.name : 'Aktuelles Projekt';
      h = `<button type="button" class="hm-card hm-resume" id="hm-resume-cur"><span class="ic">▶</span><span class="tx"><b>Weiter: ${esc(name)}</b><span>${(dawState.tracks || []).length} Spur(en) · ${dawState.bpm} BPM${isDirty() ? ' · nicht gesichert' : ''}</span></span></button>`;
    }
    el.innerHTML = h;
    const go = $('hm-resume-go'); if (go) go.onclick = async () => { go.disabled = true; try { await window.Autosave.resume(); safe(() => dawState.project && setSubtitle()); clearHistory(); syncControls(); savedSig = null; pendingSession = null; close(); say('Letzte Sitzung fortgesetzt.', 'success'); } catch (e) { say('Konnte nicht fortsetzen: ' + (e && e.message), 'error'); go.disabled = false; } };
    const no = $('hm-resume-no'); if (no) no.onclick = () => confirmSheet('Gesicherte Sitzung verwerfen?', 'Der automatisch gesicherte Zwischenstand wird gelöscht. Gespeicherte Projekte bleiben erhalten.', 'Verwerfen', async () => { try { await window.Autosave.clear(); } catch (_) {} pendingSession = null; renderResume(); });
    const cu = $('hm-resume-cur'); if (cu) cu.onclick = () => close();
  }
  const itemHtml = (m, i) => `<div class="hm-card hm-item" data-id="${esc(m.id)}" style="--i:${Math.min(i, 8)}" role="button" tabindex="0" aria-label="Projekt ${esc(m.name)} öffnen">
      <div class="hm-art">${m.thumb ? `<img class="hm-thumb" src="${esc(m.thumb)}" alt="">` : artSvg(m)}</div>
      <div class="hm-info"><b>${esc(m.name)}${m.id === curId() ? '<span class="hm-cur">OFFEN</span>' : ''}</b>
        <div class="m"><span>${m.bpm || '–'} BPM</span>${m.key ? `<span>${esc(m.key)}</span>` : ''}<span>${m.tracks} Spur${m.tracks === 1 ? '' : 'en'}</span>${(m.dur || m.arrSec) ? `<span>${fmtDur(m.dur || m.arrSec)}</span>` : ''}</div>
        <div class="d">${rel(m.updatedAt)}${m.notes ? ' · ' + esc(m.notes.slice(0, 40)) : ''}</div></div>
      <button type="button" class="hm-more" data-more="${esc(m.id)}" aria-label="Mehr zu ${esc(m.name)}">⋯</button></div>`;
  const EMPTY = `<div class="hm-empty"><svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 40V28M18 40V16M26 40V24M34 40V12M42 40V30M50 40V22"/><path d="M6 46h44" opacity=".5"/></svg><br><b style="color:var(--hm-text)">Noch keine Projekte</b><br>Starte mit „Neues Projekt“ – Name, Tempo und Tonart legst du gleich fest.</div>`;
  const RECENT_N = 3;
  const byRecent = () => items.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  function renderList() {
    const el = $('hm-list'); if (!el) return;
    if (!listLoaded) { el.innerHTML = '<div class="hm-skel"></div><div class="hm-skel" style="opacity:.6"></div>'; fit(); return; }
    const l = byRecent().slice(0, RECENT_N);
    $('hm-count').textContent = items.length > RECENT_N ? `Letzte Projekte · ${items.length} gesamt` : items.length ? `Meine Projekte · ${items.length}` : 'Meine Projekte';
    const all = $('hm-all'); all.hidden = items.length <= RECENT_N; all.textContent = `Alle ${items.length} ›`;
    el.innerHTML = items.length ? l.map(itemHtml).join('') : EMPTY;
    renderBig(); fit(); fitSoon();
  }
  /* Große Ansicht: alle Projekte, suchen/sortieren – schwebt mit Abstand über der Startseite */
  let big = null;
  function renderBig() {
    if (!big || !document.body.contains(big.bg)) { big = null; return; }
    const q = query.trim().toLowerCase(); let l = items.filter(m => !q || m.name.toLowerCase().includes(q));
    l = l.sort(sortBy === 'name' ? (a, b) => a.name.localeCompare(b.name, 'de') : (a, b) => b.updatedAt - a.updatedAt);
    big.sh.querySelector('#hm-bigcount').textContent = `Alle Projekte · ${items.length}`;
    big.sh.querySelector('#hm-biglist').innerHTML = !items.length ? EMPTY : l.length ? l.map(itemHtml).join('') : '<div class="hm-empty">Kein Projekt gefunden.</div>';
  }
  function openAll() {
    if (big) return; query = ''; sortBy = 'recent';
    const bg = document.createElement('div'); bg.className = 'hm-big-bg';
    bg.innerHTML = `<div class="hm-big" role="dialog" aria-modal="true" aria-label="Alle Projekte"><button type="button" class="hm-grab" data-x aria-label="Schließen"><i></i></button>
      <div class="hm-big-h"><h3 id="hm-bigcount">Alle Projekte</h3><button type="button" class="hm-pill hm-pill-x" data-x aria-label="Schließen">✕</button></div>
      <div class="hm-big-tools"><input type="search" id="hm-q" placeholder="Projekte suchen …" aria-label="Projekte suchen"><select id="hm-sort" aria-label="Sortierung"><option value="recent">Zuletzt</option><option value="name">A–Z</option></select></div>
      <div class="hm-list hm-biglist" id="hm-biglist"></div></div>`;
    document.body.appendChild(bg); root.classList.add('hm-depth');
    const sh = bg.firstElementChild; big = { bg, sh };
    const kill = () => { if (!big) return; big = null; bg.classList.add('out'); root.classList.remove('hm-depth'); document.removeEventListener('keydown', onKey, true); setTimeout(() => bg.remove(), 260); };
    const onKey = e => { if (e.key === 'Escape' && big && !document.querySelector('.hm-sheet-bg')) { e.stopPropagation(); kill(); } };
    big.kill = kill; document.addEventListener('keydown', onKey, true);
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x]')) kill(); });
    sh.addEventListener('click', e => { const more = e.target.closest('[data-more]'); if (more) { e.stopPropagation(); itemMenu(more.dataset.more); return; } const it = e.target.closest('.hm-item'); if (it) { kill(); openProject(it.dataset.id); } });
    sh.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('hm-item')) { e.preventDefault(); kill(); openProject(e.target.dataset.id); } });
    sh.querySelector('#hm-q').oninput = e => { query = e.target.value; renderBig(); }; sh.querySelector('#hm-sort').onchange = e => { sortBy = e.target.value; renderBig(); };
    renderBig();
  }
  const closeAll = () => { if (big && big.kill) big.kill(); };
  async function refreshList() {
    listLoaded = false; renderList();
    try { items = await loadIndex(); } catch (e) { console.warn(e); items = []; say('Projektliste konnte nicht geladen werden: ' + (e && e.message), 'warn'); }
    listLoaded = true; renderList();
  }

  /* Passt den oberen Teil an den freien Platz an, damit nichts gescrollt werden muss (Stufen 1–3) */
  let fitBusy = false, fitT = 0;
  function fit() {
    if (!root || root.hidden || fitBusy) return; const sc = root.querySelector('.hm-scroll'); if (!sc) return; fitBusy = true;
    let lv = 0; root.dataset.fit = '0';
    while (lv < 4 && sc.scrollHeight > sc.clientHeight + 1) { lv++; root.dataset.fit = String(lv); }
    fitBusy = false;
  }
  function fitSoon() { cancelAnimationFrame(fitT); fitT = requestAnimationFrame(() => requestAnimationFrame(fit)); }
  try { const ro = new ResizeObserver(() => { if (!fitBusy) fitSoon(); }); ro.observe(root); const wrap = root.querySelector('.hm-wrap'); if (wrap) ro.observe(wrap); } catch (_) {}
  window.addEventListener('resize', fitSoon); window.addEventListener('orientationchange', fitSoon);

  /* ------------------------------------------------------------------ Sheets */
  function sheet(inner, opt) {
    const bg = document.createElement('div'); bg.className = 'hm-sheet-bg'; bg.innerHTML = `<div class="hm-sheet" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(bg); const sh = bg.firstElementChild;
    const kill = () => { bg.remove(); document.removeEventListener('keydown', esc_, true); }; const esc_ = e => { if (e.key === 'Escape' && document.body.contains(bg)) { e.stopPropagation(); kill(); } };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x]')) kill(); }); document.addEventListener('keydown', esc_, true);
    return { bg, sh, kill };
  }
  function confirmSheet(title, text, okLabel, onOk, danger) {
    const s = sheet(`<h3>${esc(title)}</h3><div class="hm-note" style="margin:0">${esc(text)}</div><div class="hm-btns"><button type="button" class="hm-btn" data-x>Abbrechen</button><button type="button" class="hm-btn ${danger === false ? 'pri' : 'dng'}" data-ok>${esc(okLabel)}</button></div>`);
    s.sh.querySelector('[data-ok]').onclick = async () => { s.sh.querySelector('[data-ok]').disabled = true; try { await onOk(); } finally { s.kill(); } };
  }
  function promptSheet(title, label, value, okLabel, onOk) {
    const s = sheet(`<h3>${esc(title)}</h3><div class="hm-field"><label for="hm-pi">${esc(label)}</label><input type="text" id="hm-pi" maxlength="48" value="${esc(value)}" autocomplete="off"></div><div class="hm-btns"><button type="button" class="hm-btn" data-x>Abbrechen</button><button type="button" class="hm-btn pri" data-ok>${esc(okLabel)}</button></div>`);
    const inp = s.sh.querySelector('#hm-pi'), ok = s.sh.querySelector('[data-ok]'); setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const go = async () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } ok.disabled = true; try { await onOk(v); s.kill(); } catch (e) { say('Fehler: ' + (e && e.message), 'error'); ok.disabled = false; } };
    ok.onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  function itemMenu(id) {
    const m = items.find(x => x.id === id); if (!m) return;
    const s = sheet(`<h3>${esc(m.name)}</h3><button type="button" class="hm-act" data-a="open"><span>▶</span>Öffnen</button><button type="button" class="hm-act" data-a="ren"><span>✏️</span>Umbenennen</button><button type="button" class="hm-act" data-a="dup"><span>⧉</span>Duplizieren</button><button type="button" class="hm-act dng" data-a="del"><span>🗑</span>Löschen</button><div class="hm-btns"><button type="button" class="hm-btn" data-x>Schließen</button></div>`);
    s.sh.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'open') { s.kill(); openProject(id); }
      else if (a === 'ren') { s.kill(); promptSheet('Projekt umbenennen', 'Neuer Name', m.name, 'Umbenennen', async v => { await renameProject(id, v); await refreshList(); renderResume(); }); }
      else if (a === 'dup') { s.kill(); try { const r = await duplicateProject(id); say(`„${r.name}“ erstellt.`, 'success'); await refreshList(); } catch (err) { say('Duplizieren fehlgeschlagen: ' + (err && err.message), 'error'); } }
      else if (a === 'del') { s.kill(); confirmSheet('Projekt löschen?', `„${m.name}“ wird endgültig entfernt – samt Audio. Das lässt sich nicht rückgängig machen.`, 'Löschen', async () => { await deleteProject(id); say(`„${m.name}“ gelöscht.`, 'success'); await refreshList(); renderResume(); }); }
    });
  }

  /* ------------------------------------------------------------------ Projekt-Formular (neu / bearbeiten) */
  const seg = (name, opts, cur) => `<div class="hm-seg" data-seg="${name}" role="radiogroup">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(v) === String(cur)}" data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const segVal = (sh, name) => { const b = sh.querySelector(`[data-seg="${name}"] .on`); return b ? b.dataset.v : null; };
  function openForm(mode, pre) {
    const isNew = mode === 'new', p = dawState.project || {};
    const o = Object.assign({ name: isNew ? uniqueName('Neues Projekt') : (p.name || ''), bpm: isNew ? 128 : dawState.bpm, root: isNew ? 0 : dawState.midiRoot, scale: isNew ? 'minor' : dawState.midiScale, grid: isNew ? 2 : dawState.midiGridStep,
      arr: 'std', click: isNew ? false : !!dawState.metronomeOn, loop: isNew ? true : !!dawState.isLooping, start: 'empty', notes: isNew ? '' : (p.notes || '') }, pre || {});
    const th = (window.SunshineTheme && SunshineTheme.themes) || [], cur = window.SunshineTheme ? SunshineTheme.get() : 'aurora';
    const rootOpts = NOTES.map((n, i) => `<option value="${i}" ${i === o.root ? 'selected' : ''}>${n}</option>`).join(''), scaleOpts = Object.entries(SCALES).map(([k, v]) => `<option value="${k}" ${k === o.scale ? 'selected' : ''}>${v}</option>`).join('');
    const s = sheet(`<h3>${isNew ? '＋ Neues Projekt' : '📁 Projekt-Einstellungen'}<button type="button" class="hm-pill" data-x aria-label="Schließen" style="min-width:44px;padding:0">✕</button></h3>
      <div class="hm-field"><label for="pf-name">Projektname</label><input type="text" id="pf-name" maxlength="48" value="${esc(o.name)}" autocomplete="off" placeholder="z. B. Sommer-Hymne"></div>
      <details class="cv-det${isNew ? ' cv-new' : ''}" id="pf-cvdet"${isNew ? ' open' : ''}><summary><span class="cv-sum">🖼 Cover &amp; Tags</span><small>${isNew ? 'Bild wählen oder aus Titel &amp; Künstler erstellen' : 'optional'}</small></summary><div id="pf-cover"></div></details>
      <div class="hm-field"><label for="pf-bpm">Tempo (BPM)</label><div class="hm-row"><input type="range" id="pf-bpm-r" min="60" max="180" value="${o.bpm}" style="flex:1" aria-label="Tempo Regler"><input type="number" id="pf-bpm" min="60" max="180" value="${o.bpm}" style="width:76px;text-align:center;font-weight:800"></div></div>
      <div class="hm-field"><span class="hm-lab">Tonart &amp; Skala</span><div class="hm-row"><select id="pf-root" aria-label="Grundton" style="width:84px">${rootOpts}</select><select id="pf-scale" aria-label="Skala" style="flex:1">${scaleOpts}</select></div></div>
      <div class="hm-field"><span class="hm-lab">Raster im MIDI-Editor</span>${seg('grid', [[4, '1/8'], [2, '1/16'], [1, '1/32']], o.grid)}</div>
      ${isNew ? `<div class="hm-field"><span class="hm-lab">Arrangement</span>${seg('arr', Object.entries(ARR).map(([k, v]) => [k, v.label.replace(' · ', '<br>')]), o.arr)}</div>` : ''}
      <div class="hm-row" style="margin-top:6px;flex-wrap:wrap"><label class="hm-sw" style="flex:1"><input type="checkbox" id="pf-click" ${o.click ? 'checked' : ''}><i></i><span>Metronom-Klick</span></label><label class="hm-sw" style="flex:1"><input type="checkbox" id="pf-loop" ${o.loop ? 'checked' : ''}><i></i><span>Loop an</span></label></div>
      <div class="hm-field"><span class="hm-lab">Design (gilt für die ganze App)</span><div class="hm-themes">${th.map(t => `<button type="button" data-th="${t.id}" aria-pressed="${t.id === cur}" aria-label="Design ${esc(t.name)}"><i style="background:${t.pv.bg}"></i>${esc(t.name.split(' ')[0])}</button>`).join('')}</div></div>
      ${isNew ? `<div class="hm-field"><span class="hm-lab">Start mit</span>${seg('start', [['empty', 'Leer'], ['import', '🎵 Stems laden'], ['midi', '🎹 MIDI-Spur']], o.start)}</div>` : ''}
      <div class="hm-field"><label for="pf-notes">Notiz (optional)</label><textarea id="pf-notes" maxlength="400" placeholder="Idee, Referenz-Track, To-dos …">${esc(o.notes)}</textarea></div>
      ${isNew && pendingSession ? '<div class="hm-note hm-warn">Hinweis: Die automatisch gesicherte letzte Sitzung wird durch dieses Projekt irgendwann überschrieben. Willst du sie behalten, setze sie vorher fort und speichere sie.</div>' : ''}
      ${!isNew ? '<div class="hm-note">Tempo, Tonart, Raster, Klick und Loop gelten sofort. Das Arrangement änderst du weiterhin direkt in der Arrangement-Leiste.</div>' : ''}
      <div class="hm-btns"><button type="button" class="hm-btn" data-x>Abbrechen</button><button type="button" class="hm-btn pri" id="pf-ok">${isNew ? 'Projekt anlegen' : 'Übernehmen'}</button></div>
      ${!isNew ? '<div class="hm-btns" style="margin-top:8px"><button type="button" class="hm-btn" id="pf-saveas">Speichern unter …</button><button type="button" class="hm-btn" id="pf-home">🏠 Startseite</button></div>' : ''}`);
    const sh = s.sh, $q = q => sh.querySelector(q);
    let cvEd = null; try { if (window.Cover) cvEd = Cover.editor(sh.querySelector('#pf-cover'), { project: isNew ? null : p, isNew, getTitle: () => $q('#pf-name').value, titleInput: $q('#pf-name') }); } catch (e) { console.warn(e); }
    sh.querySelectorAll('.hm-seg').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); }));
    const num = $q('#pf-bpm'), rng = $q('#pf-bpm-r'); rng.oninput = () => { num.value = rng.value; }; num.oninput = () => { if (num.value) rng.value = clamp(+num.value, 60, 180); };
    sh.querySelectorAll('[data-th]').forEach(b => b.addEventListener('click', () => { safe(() => SunshineTheme.apply(b.dataset.th)); sh.querySelectorAll('[data-th]').forEach(x => x.setAttribute('aria-pressed', x === b)); }));
    setTimeout(() => { const n = $q('#pf-name'); n.focus(); if (isNew) n.select(); }, 80);
    const read = () => ({ name: $q('#pf-name').value.trim(), bpm: clamp(parseInt(num.value, 10) || o.bpm, 60, 180), root: +$q('#pf-root').value, scale: $q('#pf-scale').value, grid: +segVal(sh, 'grid'), arr: segVal(sh, 'arr') || 'std', click: $q('#pf-click').checked, loop: $q('#pf-loop').checked, start: segVal(sh, 'start') || 'empty', notes: $q('#pf-notes').value.trim(), cv: cvEd ? cvEd.read() : null });
    const submit = async () => {
      const v = read(); if (!v.name) { const n = $q('#pf-name'); n.focus(); n.placeholder = 'Bitte einen Namen eingeben'; return; }
      const ok = $q('#pf-ok'); ok.disabled = true; ok.textContent = isNew ? 'Lege an …' : 'Speichere …';
      try { if (isNew) { s.kill(); await createProject(v); } else { applyEdit(v); s.kill(); } } catch (e) { console.error(e); say('Fehler: ' + (e && e.message), 'error'); ok.disabled = false; ok.textContent = isNew ? 'Projekt anlegen' : 'Übernehmen'; }
    };
    $q('#pf-ok').onclick = submit; $q('#pf-name').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    if (!isNew) {
      $q('#pf-saveas').onclick = () => { const v = read(); s.kill(); promptSheet('Speichern unter', 'Neuer Projektname', uniqueName(v.name + ' Kopie'), 'Speichern', async nm => { applyEdit(v, true); dawState.project = Object.assign({}, dawState.project || {}, { id: uid(), name: nm, created: Date.now(), notes: v.notes }); await saveCurrent({ name: nm }); }); };
      $q('#pf-home').onclick = () => { s.kill(); open(); };
    }
    return s;
  }
  function applyEdit(v, keepName) {
    const p = ensureProject(v.name); if (!keepName) p.name = v.name; p.notes = v.notes;
    if (v.cv && window.Cover) Cover.applyTo(p, v.cv);
    const bpm = $('input-bpm'); if (bpm) { bpm.value = v.bpm; bpm.dispatchEvent(new Event('change', { bubbles: true })); } else dawState.bpm = v.bpm;
    dawState.midiRoot = v.root; dawState.midiScale = v.scale; dawState.midiGridStep = v.grid; dawState.metronomeOn = v.click; dawState.isLooping = v.loop;
    syncControls(); setSubtitle(); safe(() => drawPianoRoll()); say('Projekt-Einstellungen übernommen.', 'success');
    if (hasContent()) saveCurrent({ silent: true }).catch(() => {});
  }
  async function quickSave() {
    if (!dawState.project) { promptSheet('Projekt speichern', 'Projektname', uniqueName('Mein Projekt'), 'Speichern', async nm => { await saveCurrent({ name: nm }); }); return; }
    try { await saveCurrent({}); } catch (e) { console.error(e); say('Speichern fehlgeschlagen: ' + (e && e.message), 'error'); }
  }

  /* ------------------------------------------------------------------ Öffnen / Schließen */
  const inertd = [];
  function open() {
    root.hidden = false; html.classList.remove('home-pending');
    [...document.body.children].forEach(el => { if (el !== root && !el.matches('script,style,#toast-container') && !el.inert) { el.inert = true; inertd.push(el); } });
    $('hm-back').hidden = !(hasContent() || dawState.project); $('hm-auto').checked = startEnabled();
    root.querySelector('.hm-scroll').scrollTop = 0;
    root.querySelectorAll('.hm-logo,.hm-tag,.hm-cta,.hm-two,.hm-sechead').forEach(e => { e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; });
    closeAll(); renderResume(); refreshList(); safe(() => window.HmDock && HmDock.onOpen(root)); fitSoon(); safe(() => window.Help && Help.onHome($('hm-newbie'))); safe(() => window.Update && Update.onHome($('hm-update')));
    if (hasContent() && isDirty()) persistCurrent().then(() => { renderResume(); if (!root.hidden) refreshList(); });
    safe(() => window.Autosave && Autosave._peek && !hasContent() && Autosave._peek().then(m => { if (m && m.state && !root.hidden && !hasContent()) { pendingSession = { name: m.name || (m.state.project && m.state.project.name) || '', savedAt: m.savedAt, tracks: (m.state.tracks || []).length }; renderResume(); } }));
  }
  function close() {
    closeAll(); root.hidden = true; safe(() => window.HmDock && HmDock.onClose()); html.classList.remove('home-pending'); inertd.splice(0).forEach(el => { el.inert = false; });
    safe(() => document.dispatchEvent(new CustomEvent('sunshine-home-closed')));
  }

  /* Events */
  $('hm-back').onclick = close;
  $('hm-help').onclick = () => { if (window.Help) Help.openManual(); };
  $('hm-fb').onclick = () => { if (window.Feedback) Feedback.open(); };
  $('hm-new').onclick = () => openForm('new');
  $('hm-import').onclick = () => openForm('new', { start: 'import' });
  $('hm-player').onclick = () => { if (window.Player) Player.open(); };
  $('hm-opts').onclick = () => { const b = $('btn-settings'); if (window.SunshineTheme && SunshineTheme.open) SunshineTheme.open(); else if (b) b.click(); };
  $('hm-all').onclick = openAll;
  $('hm-auto').onchange = e => { try { localStorage.setItem(LS_ON, e.target.checked ? 'on' : 'off'); } catch (_) {} };
  $('hm-list').addEventListener('click', e => { const more = e.target.closest('[data-more]'); if (more) { e.stopPropagation(); itemMenu(more.dataset.more); return; } const it = e.target.closest('.hm-item'); if (it) openProject(it.dataset.id); });
  $('hm-list').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('hm-item')) { e.preventDefault(); openProject(e.target.dataset.id); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden && !document.querySelector('.hm-sheet-bg') && $('hm-back') && !$('hm-back').hidden) close(); });

  function wireHost() {
    const menu = $('file-menu');
    if (menu && !$('btn-home')) {
      const mk = (id, label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = label; b.addEventListener('click', () => { menu.hidden = true; fn(); }); return b; };
      const title = menu.querySelector('.fm-title'), first = title ? title.nextSibling : menu.firstChild, a = mk('btn-home', '🏠 Startseite', open), c = mk('btn-project-settings', '📁 Projekt-Einstellungen', () => openForm('edit')), sep = document.createElement('div'); sep.className = 'fm-sep';
      menu.insertBefore(a, first); menu.insertBefore(c, first); menu.insertBefore(sep, first);
    }
    const brand = document.querySelector('header .brand-banner, #brand-icon');
    document.querySelectorAll('header .brand-banner, header #brand-icon, header .brand-mark').forEach(el => { if (el.dataset.homeLink) return; el.dataset.homeLink = '1'; el.style.cursor = 'pointer'; el.setAttribute('title', 'Startseite'); el.addEventListener('click', open); });
    void brand;
  }
  wireHost(); setTimeout(wireHost, 800); setTimeout(wireHost, 2500);

  window.Home = { fit: fitSoon, openAll, closeAll, open, close, active: () => ACTIVE, isOpen: () => !root.hidden, openForm, save: quickSave, createProject, openProject, renameProject, duplicateProject, deleteProject, refreshList, persistCurrent, saveCurrent, isDirty, items: () => items, metaOf, keyLabel, syncControls, _blank: BLANK, pendingSession: () => pendingSession };
  if (ACTIVE) open(); else { html.classList.remove('home-pending'); }
  }
  if (window.__projectIO && typeof dawState !== 'undefined') main(); else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main); else main();
})();
