/* ===== Sunshine@R · Player & Hintergrund-Wiedergabe =====
   1) Player: einfacher Audio-Player (WAV, MP3, M4A, OGG, FLAC … auch aus ZIP, z. B. Suno-Download) – getrennt von der DAW.
   2) Benachrichtigungs-Player: In der Android-App zeigt ein Vordergrunddienst Titel + Tasten auf Sperrbildschirm/Benachrichtigungsleiste
      und hält die App im Hintergrund am Leben (Player UND DAW-Wiedergabe). Im Browser ohne Wirkung.
   3) WorkerTick: Taktgeber der DAW läuft in einem Worker, damit Drums/MIDI auch im Hintergrund nicht ins Stocken geraten. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const { esc, say } = window.SunUtil;
  const LS = 'sunshine.player';
  let S = { bg: true, vol: 1, shuffle: false, repeat: 'off', dsp: true, viz: true, preset: 'flat', custom: [0, 0, 0, 0, 0], cvr: true, tags: true };
  SunStore.merge(S, LS);
  if (!Array.isArray(S.custom) || S.custom.length !== 5) S.custom = [0, 0, 0, 0, 0];
  const saveS = () => SunStore.save(LS, S);

  /* ---------- WorkerTick ---------- */
  window.WorkerTick = {
    start(fn, ms) {
      const tok = {};
      const fallback = () => { if (tok.w) { try { tok.w.terminate(); } catch (_) {} tok.w = null; } if (!tok.iv) tok.iv = setInterval(fn, ms); };
      try {
        const src = 'let t=setInterval(function(){postMessage(1)},' + (ms | 0) + ');onmessage=function(e){if(e.data==="stop"){clearInterval(t);close()}};';
        tok.url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        tok.w = new Worker(tok.url);
        tok.w.onmessage = () => { try { fn(); } catch (e) { try { console.error(e); } catch (_) {} } };
        tok.w.onerror = fallback;
      } catch (_) { fallback(); }
      return tok;
    },
    stop(tok) {
      if (tok == null) return;
      if (typeof tok === 'number') { clearInterval(tok); return; }
      if (tok.w) { try { tok.w.postMessage('stop'); tok.w.terminate(); } catch (_) {} tok.w = null; }
      if (tok.url) { try { URL.revokeObjectURL(tok.url); } catch (_) {} tok.url = null; }
      if (tok.iv) { clearInterval(tok.iv); tok.iv = null; }
    }
  };

  /* ---------- Brücke zur Android-Benachrichtigung ---------- */
  const cap = () => window.Capacitor;
  const native = () => { try { return !!(cap() && cap().isNativePlatform && cap().isNativePlatform()); } catch (_) { return false; } };
  const plug = () => { try { return (cap() && cap().Plugins && cap().Plugins.SunshineMedia) || null; } catch (_) { return null; } };
  const hex2 = n => ('0' + Math.max(0, Math.min(255, n | 0)).toString(16)).slice(-2);
  function accent() {
    try { const v = getComputedStyle(document.documentElement).getPropertyValue('--daw-accent').trim().split(/[\s,]+/).map(Number); if (v.length >= 3 && v.every(x => isFinite(x))) return v; } catch (_) {}
    return [255, 138, 26];
  }
  let art = { key: '', b64: '', busy: false };
  function prepArt(cb) {   // Cover im Farbton des Designs (Verlauf + App-Symbol) – wird einmal pro Farbe erzeugt
    const a = accent(), key = a.join(',');
    if (art.key === key && art.b64) { cb(); return; }
    if (art.busy) { cb(); return; }
    art.busy = true;
    const done = () => { art.busy = false; cb(); };
    try {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, 'rgb(' + a.join(',') + ')'); g.addColorStop(1, 'rgb(20,22,40)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      const fin = () => { try { art = { key, b64: c.toDataURL('image/jpeg', 0.82).split(',')[1] || '', busy: false }; } catch (_) { art.busy = false; } cb(); };
      const im = new Image(); im.onload = () => { try { x.drawImage(im, 48, 48, 160, 160); } catch (_) {} fin(); }; im.onerror = () => { x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '120px sans-serif'; x.textAlign = 'center'; x.fillText('♪', 128, 160); fin(); };
      im.src = 'assets/sunshine-r-app-icon.png';
    } catch (_) { done(); }
  }
  const Media = {
    owner: null,
    available: () => !!(S.bg && native() && plug() && plug().update),
    update(o) {
      if (!Media.available()) return;
      const a = accent();
      const send = () => { try { plug().update(Object.assign({ color: '#' + hex2(a[0]) + hex2(a[1]) + hex2(a[2]), art: art.b64, artKey: art.key }, o)); } catch (_) {} };
      if (art.key === a.join(',') && art.b64) send(); else { send(); prepArt(send); }
    },
    stop() { Media.owner = null; try { if (native() && plug() && plug().stop) plug().stop(); } catch (_) {} }
  };
  const claim = who => { if (Media.owner && Media.owner !== who) { /* anderer Besitzer wird abgelöst */ } Media.owner = who; };

  /* ---------- Player ---------- */
  const AUDIO_RE = /\.(mp3|wav|wave|m4a|aac|ogg|oga|opus|flac|weba)$/i;
  const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', wave: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', weba: 'audio/webm' };
  const au = new Audio(); au.preload = 'metadata'; au.volume = Math.max(0, Math.min(1, S.vol));
  const SND = () => window.PlSound || null; try { if (SND()) { SND().bind(au); SND().set(S.dsp ? S.preset : 'flat', S.custom, false); } } catch (_) {}
  let list = [], idx = -1, nid = 0, url = null, history = [], errRun = 0, seeking = false, root = null, mini = null;
  const cur = () => list[idx] || null;
  const fmt = s => { if (!isFinite(s) || s < 0) return '–:––'; s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  const mb = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const titleOf = n => String(n).replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim() || 'Ohne Titel';
  const typed = (b, name) => { const e = (String(name).match(/\.([a-z0-9]+)$/i) || [])[1]; const t = MIME[(e || '').toLowerCase()]; return (b.type && /^audio\//.test(b.type)) || !t ? b : new Blob([b], { type: t }); };

  const extOf = n => ((String(n).match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
  let stage = null;   // beim Wiederverbinden einer alten Sitzung: neue Titel werden erst gesammelt und dann zugeordnet
  const pushAudio = (name, sub, size, get, key, head, stream) => { const it = { id: ++nid, name, key: key || name, title: titleOf(name), sub, size: size || 0, dur: NaN, artist: '', album: '', genre: '', year: '', track: '', comment: '', fmt: '', cover: '', get }; if (head) it.head = head; if (stream) it.stream = stream; (stage || list).push(it); };
  async function addFiles(files, opt) {
    opt = opt || {}; files = [...(files || [])]; let n = 0, skipped = 0, folderName = '', srcName = ''; beginStage();
    if (opt.folder) files.sort((a, b) => String(a.webkitRelativePath || a.name).localeCompare(String(b.webkitRelativePath || b.name), undefined, { numeric: true }));
    for (const f of files) {
      const isZip = /\.zip$/i.test(f.name) || /zip/.test(f.type || '');
      if (isZip) {
        let JSZip; try { JSZip = await SunLazy.zip(); } catch (_) { say('Das ZIP-Modul ist nicht geladen.', 'error'); continue; }
        try {
          const z = await JSZip.loadAsync(f), es = [];
          z.forEach((p, en) => { if (!en.dir && AUDIO_RE.test(p) && !/(^|\/)(__MACOSX|\.)/.test(p)) es.push({ p, en }); });
          es.sort((a, b) => a.p.localeCompare(b.p, undefined, { numeric: true }));
          const zn = f.name.replace(/\.zip$/i, '');
          es.forEach(({ p, en }) => { pushAudio(p, zn, (en._data && en._data.uncompressedSize) || 0, () => en.async('blob'), zn + '/' + p); n++; }); if (es.length) srcName = f.name;
          if (!es.length) say('In „' + f.name + '“ sind keine Audiodateien (WAV, MP3 …).', 'warn');
        } catch (e) { say('ZIP „' + f.name + '“ nicht lesbar.', 'error'); }
      } else if (AUDIO_RE.test(f.name) || /^audio\//.test(f.type || '')) {
        const rel = String(f.webkitRelativePath || '').split('/'); if (rel.length > 1) { folderName = folderName || rel[0]; }
        pushAudio(f.name, rel.length > 1 ? rel[rel.length - 2] : (extOf(f.name) || 'audio').toUpperCase(), f.size, async () => f, rel.length > 1 ? rel.slice(1).join('/') : f.name); n++; if (!srcName) srcName = f.name;
      } else skipped++;
    }
    const zipOnly = n && files.length === 1 && /\.zip$/i.test(files[0].name);
    setSrc(folderName ? { kind: 'dir', name: folderName } : zipOnly ? { kind: 'zip', name: srcName.replace(/\.zip$/i, '') } : { kind: 'files', name: n === 1 ? srcName : n + ' Dateien' }, n, null);
    return finishAdd(n, opt.folder ? 0 : skipped, folderName);
  }
  async function addEntries(entries, folderName, handle, nat) {   // Dateien aus dem Ordner-Dialog (Browser oder Android-App) – lesen erst beim Abspielen
    beginStage(); let n = 0; for (const e of entries) { pushAudio(e.name, e.sub, e.size, e.get, e.key, e.head, e.stream); n++; } setSrc({ kind: 'dir', name: folderName }, n, handle || null, nat || null); return finishAdd(n, 0, folderName);
  }
  async function finishAdd(n, skipped, folderName) {
    if (stage) return finishRelink(n);
    if (n) { say(n + ' Titel ' + (folderName ? 'aus „' + folderName + '“ ' : '') + 'hinzugefügt' + (skipped ? ' (' + skipped + ' Datei(en) übersprungen)' : '') + '.', 'success'); if (idx < 0) await load(0, false); scan(); }
    else if (skipped) say('Keine Audiodatei erkannt (WAV, MP3, M4A, OGG, FLAC oder ZIP).', 'warn');
    render(); persist();
    return n;
  }
  async function walkDir(dir, rel, out, depth) {
    for await (const [name, h] of dir.entries()) {
      if (out.length >= 3000 || name[0] === '.') continue;
      if (h.kind === 'directory') { if (depth < 5) await walkDir(h, rel + name + '/', out, depth + 1); }
      else if (AUDIO_RE.test(name)) { let size = 0; try { size = (await h.getFile()).size; } catch (_) {} out.push({ name: rel + name, key: rel + name, sub: rel ? rel.replace(/\/$/, '').split('/').pop() : dir.name, size, get: () => h.getFile() }); }
    }
  }
  /* ---- Android-App: eigener Ordner-Dialog (Storage Access Framework), Freigabe bleibt nach dem Neustart erhalten ---- */
  const natOk = () => native() && !!plug();
  const b64u8 = b => { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  /* Base64 → Bytes ohne Zeichen-Schleife auf dem Hauptthread (die Oberfläche bleibt flüssig); alter Weg als Rückfall */
  async function b64buf(b) {
    try { if (Uint8Array.fromBase64) return Uint8Array.fromBase64(b); } catch (_) {}
    try { const r = await fetch('data:application/octet-stream;base64,' + b); return new Uint8Array(await r.arrayBuffer()); } catch (_) { return b64u8(b); }
  }
  /* Alter Weg (Rückfall): liest in Stücken (2 MB) über die Brücke; das nächste Stück wird schon angefragt, während das vorige umgewandelt wird.
     limit: nur den Anfang (für Tags). cancel(): true → abbrechen (anderer Titel gewählt). prog(0..1): Fortschritt. */
  async function natBlob(uri, size, limit, cancel, prog) {
    const CH = 2048 * 1024, total = limit ? Math.min(size || limit, limit) : (size || 0), parts = [];
    const want = o => total ? Math.min(CH, total - o) : CH;
    let off = 0, w = want(0), pend = w > 0 ? plug().readChunk({ uri, offset: 0, length: w }) : null;
    while (pend) {
      const r = await pend, n = (r && r.n) | 0; if (n <= 0) break;
      const o2 = off + n, w2 = n < w ? 0 : want(o2);
      pend = w2 > 0 ? plug().readChunk({ uri, offset: o2, length: w2 }) : null;
      parts.push(await b64buf(r.b64)); off = o2; w = w2;
      if (prog && total) prog(off / total);
      if (cancel && cancel()) { if (pend) pend.catch(() => {}); throw new Error('abgebrochen'); }
    }
    return new Blob(parts);
  }
  /* Neuer Weg: Die App kopiert die Datei nativ (schnell, ohne Brücke) in den Zwischenspeicher; abgespielt wird direkt von dort
     (Spulen geht sofort, nichts liegt im Arbeitsspeicher). Gibt eine URL zurück oder wirft – dann greift der alte Weg. */
  let natFast = true, lastErr = '';
  async function natStream(uri, size, name) {
    if (!natFast) throw new Error('kein direkter Weg');
    try {
      const cap = window.Capacitor; if (!cap || !cap.convertFileSrc) throw new Error('kein Dateizugriff');
      const r = await plug().cacheFile({ uri, name, size: size || 0 }); if (!r || !r.path) throw new Error('kein Pfad');
      return cap.convertFileSrc('file://' + r.path);
    } catch (e) { if (/unimplemented|not implemented|is not a function/i.test(String((e && (e.code || e.message)) || e))) natFast = false; throw e; }
  }
  async function openNative(rec, o) {
    o = o || {};
    try {
      const nat = rec && rec.nat; if (!nat || !natOk()) return 0;
      const r = await plug().listFolder({ uri: nat.uri });
      const files = ((r && r.files) || []).filter(f => AUDIO_RE.test(f.name)); files.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
      if (!files.length) { if (!o.silent) say('In „' + nat.name + '“ wurden keine Audiodateien gefunden.', 'warn'); return 0; }
      const out = files.map(f => { const parts = String(f.name).split('/'); return { name: f.name, key: f.name, sub: parts.length > 1 ? parts[parts.length - 2] : nat.name, size: +f.size || 0, get: (cancel, prog) => natBlob(f.uri, +f.size || 0, 0, cancel, prog), head: () => natBlob(f.uri, +f.size || 0, 3 * 1048576), stream: () => natStream(f.uri, +f.size || 0, f.name) }; });
      if (!o.relink && !isOff() && list.length) { if (!au.paused && o.fresh !== false) pause(); resetList(); }
      hint = { play: !!o.play, key: o.key || '' }; await addEntries(out, nat.name, null, { uri: nat.uri, name: nat.name }); return out.length;
    } catch (e) { if (!o.silent) say('Der Ordner lässt sich nicht lesen – bitte erneut wählen.', 'warn'); return 0; }
  }
  async function pickNative() {
    try {
      const r = await plug().pickFolder(); if (!r || r.cancelled || !r.uri) return 0;
      return await openNative({ nat: { uri: r.uri, name: r.name || 'Ordner' } }, { fresh: true, play: false });
    } catch (e) { return -1; }   // ältere App ohne Ordner-Dialog → Datei-Dialog
  }
  async function pickFolder() {
    if (natOk()) { const n = await pickNative(); if (n >= 0) return n; }
    if (window.showDirectoryPicker && !native()) {   // Desktop-Browser: echter Ordner-Dialog, Dateien werden direkt vom Datenträger gelesen
      try {
        const dir = await window.showDirectoryPicker({ mode: 'read' }), out = []; await walkDir(dir, '', out, 0);
        out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        if (!out.length) { say('In „' + dir.name + '“ wurden keine Audiodateien gefunden.', 'warn'); return 0; }
        return addEntries(out, dir.name);
      } catch (e) { if (e && e.name === 'AbortError') return 0; }
    }
    const inp = $('pl-dir'); if (inp) inp.click(); return 0;
  }
  /* Tags + Längen der Dateien im Hintergrund nachtragen (nacheinander, damit der Player flüssig bleibt) */
  let dq = false, busyLoad = 0, idleW = [], loadGen = 0;
  const quiet = () => !busyLoad, waitQuiet = () => quiet() ? Promise.resolve() : new Promise(r => idleW.push(r));
  const wakeQuiet = () => { if (quiet()) { const w = idleW; idleW = []; w.forEach(f => f()); } };
  const nap = ms => new Promise(r => setTimeout(r, ms));
  /* Hintergrund-Scan wartet, solange gerade getippt/gewischt wird (Bedienung geht vor) */
  let lastTouch = 0; try { document.addEventListener('pointerdown', () => { lastTouch = performance.now(); }, { capture: true, passive: true }); document.addEventListener('touchmove', () => { lastTouch = performance.now(); }, { capture: true, passive: true }); } catch (_) {}
  const calm = async () => { let n = 0; while (performance.now() - lastTouch < 1200 && n++ < 40) await nap(250); };
  const subLine = t => [t.artist, t.album].filter(Boolean).join(' · ') || t.sub;
  function applyTags(t, m) {
    t.tagsDone = true; if (!m) return;
    if (m.title) t.title = m.title; t.artist = m.artist || ''; t.album = m.album || ''; t.genre = m.genre || ''; t.year = m.year || ''; t.track = m.track || ''; t.comment = m.comment || ''; t.fmt = m.fmt || '';
    if (m.dur && !isFinite(t.dur)) t.dur = m.dur;
    if (m.cover && !t.cover) { try { t.cover = URL.createObjectURL(m.cover); } catch (_) {} }
  }
  async function readTags(t, b) {
    if (t.tagsDone || !S.tags || !window.PlTags) return;
    try { applyTags(t, await PlTags.read(b, t.name)); } catch (_) { t.tagsDone = true; }
    if (cur() === t) { render(true); paintCover(); syncMedia(); }
  }
  async function scan() {
    if (dq) return; dq = true;
    try {
      for (const t of list) {
        if ((t.head ? (t.tagsDone || !S.tags) : (isFinite(t.dur) && (t.tagsDone || !S.tags))) || t.bad || t.size > 120 * 1048576) continue;
        await waitQuiet();   // beim Laden eines Titels ruht der Hintergrund-Scan, beim Abspielen läuft er gemächlich weiter
        await calm();
        try {
          const b = t.head ? await t.head() : await t.get();
          await readTags(t, b);
          if (!isFinite(t.dur) && !t.head) {
            const u = URL.createObjectURL(typed(b, t.name)), a = new Audio(); a.preload = 'metadata';
            await new Promise(res => { const to = setTimeout(res, 4000); a.onloadedmetadata = () => { t.dur = a.duration; clearTimeout(to); res(); }; a.onerror = () => { clearTimeout(to); res(); }; a.src = u; });
            URL.revokeObjectURL(u);
          }
        } catch (_) {}
        paintList();
        if (!au.paused) await nap(1500);
      }
    } finally { dq = false; }
  }
  function saveDraft() { /* Playlist bleibt nur für diese Sitzung (Audiodaten werden nicht dauerhaft gespeichert) */ }


  /* ================= Letzten Stand merken (Sitzung) und Ordner-Verlauf =================
     Gemerkt wird NUR die Liste (Namen, Tags, Längen), der aktuelle Titel und die Position – nie die Audiodaten selbst.
     Desktop-Browser: Der Ordner (FileSystemDirectoryHandle) wird mitgemerkt und per Tipp (oder von selbst, wenn der Browser die Freigabe behalten hat) wieder verbunden.
     Android-App: Der Browser-Dialog liefert keine dauerhafte Freigabe – die Liste erscheint sofort, der Ordner wird mit einem Tipp erneut gewählt (Treffer über Dateinamen, dann geht es an derselben Stelle weiter). */
  const KV = {
    p: null,
    open() { if (!this.p) this.p = SunIDB.open('player').catch(() => null); return this.p; },
    async get(k) { const db = await this.open(); if (!db) return null; return new Promise(res => { try { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result == null ? null : q.result); q.onerror = () => res(null); } catch (_) { res(null); } }); },
    async set(k, v) { const db = await this.open(); if (!db) return false; return new Promise(res => { try { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false); } catch (_) { res(false); } }); },
    async del(k) { const db = await this.open(); if (!db) return false; return new Promise(res => { try { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false); } catch (_) { res(false); } }); }
  };
  const META = ['name', 'key', 'sub', 'size', 'dur', 'title', 'artist', 'album', 'genre', 'year', 'track', 'fmt', 'comment', 'tagsDone'];
  const POSK = 'sunshine.player.pos';
  let curSrc = null, recents = [], resumePos = 0, resumeKey = '', hint = { play: false, key: '' }, pst = 0;
  const offGet = () => Promise.reject(new Error('nicht verbunden'));
  const isOff = () => list.length > 0 && list.every(t => t.off);
  function beginStage() { if (!stage && isOff()) stage = []; }
  function setSrc(src, n, handle, nat) {
    if (stage && !stage.length) return; curSrc = src;
    if (src && src.kind === 'dir' && n) rememberRecent(src.name, n, handle || null, nat || null);
  }
  function snapshot() {
    if (!list.length) return null; const t = cur();
    return { v: 1, ts: Date.now(), src: curSrc, idx, pos: au.src ? (au.currentTime || 0) : resumePos, items: list.map(x => { const o = {}; META.forEach(k => { o[k] = x[k]; }); if (!isFinite(o.dur)) o.dur = 0; return o; }), art: t && t.cover && t.artB64 && t.artFor === t.cover ? t.artB64 : '' };
  }
  let pTo = 0;
  function persist() { clearTimeout(pTo); pTo = setTimeout(() => { const sn = snapshot(); if (sn) KV.set('session', sn); else KV.del('session'); }, 700); }
  function savePos(force) {
    const t = cur(); if (!t || !au.src) return; const now = Date.now(); if (!force && now - pst < 3000) return; pst = now;
    try { localStorage.setItem(POSK, JSON.stringify({ key: t.key || t.name, i: idx, pos: Math.round((au.currentTime || 0) * 10) / 10, ts: now })); } catch (_) {}
  }
  async function saveRecents() { const ok = await KV.set('recent', recents); if (!ok) await KV.set('recent', recents.map(r => Object.assign({}, r, { handle: null }))); }
  function rememberRecent(name, count, handle, nat) {
    recents = recents.filter(r => r.name !== name); recents.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, count, ts: Date.now(), handle: handle || null, nat: nat || null }); recents = recents.slice(0, 8); saveRecents();
  }
  const recOfSrc = () => (curSrc && curSrc.kind === 'dir') ? recents.find(r => r.name === curSrc.name) : null;
  async function restore() {
    try {
      recents = (await KV.get('recent')) || []; const ss = await KV.get('session'); if (!ss || !Array.isArray(ss.items) || !ss.items.length || list.length) return;
      curSrc = ss.src || null; list = ss.items.map(m => Object.assign({ id: ++nid, cover: '', artist: '', album: '', genre: '', year: '', track: '', comment: '', fmt: '', off: true, get: offGet }, m, { dur: m.dur || NaN }));
      idx = Math.max(0, Math.min(list.length - 1, ss.idx | 0)); resumePos = +ss.pos || 0; resumeKey = list[idx].key || list[idx].name;
      try { const p = JSON.parse(localStorage.getItem(POSK) || 'null'); if (p && p.key === resumeKey && p.ts > (ss.ts || 0)) resumePos = +p.pos || 0; } catch (_) {}
      if (ss.art) { const t = list[idx]; t.cover = 'data:image/jpeg;base64,' + ss.art; t.artB64 = ss.art; t.artFor = t.cover; }
      render(); paintCover();
      const rec = recOfSrc();   // Desktop: Freigabe noch gültig → ohne Nachfrage verbinden
      if (rec && rec.handle && rec.handle.queryPermission) { try { if ((await rec.handle.queryPermission({ mode: 'read' })) === 'granted') await openHandle(rec, { silent: true, play: false, key: resumeKey }); } catch (_) {} }
      else if (rec && rec.nat) { await openNative(rec, { silent: true, relink: true, play: false, key: resumeKey }); }   // Android-App: Freigabe bleibt bestehen
    } catch (_) {}
  }
  async function openHandle(rec, o) {
    o = o || {};
    try {
      if (!rec || !rec.handle) return false; let q = rec.handle.queryPermission ? await rec.handle.queryPermission({ mode: 'read' }) : 'granted';
      if (q !== 'granted' && !o.silent && rec.handle.requestPermission) q = await rec.handle.requestPermission({ mode: 'read' });
      if (q !== 'granted') return false;
      const out = []; await walkDir(rec.handle, '', out, 0); out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (!out.length) { if (!o.silent) say('In „' + rec.handle.name + '“ wurden keine Audiodateien gefunden.', 'warn'); return false; }
      if (!o.relink && !isOff() && list.length) { if (!au.paused && o.fresh !== false) pause(); resetList(); }
      hint = { play: !!o.play, key: o.key || '' }; await addEntries(out, rec.handle.name, rec.handle); return true;
    } catch (e) { return false; }
  }
  async function finishRelink(n) {
    const st = stage || []; stage = null; const old = list, oldIdx = idx, oldKey = hint.key || (old[idx] ? (old[idx].key || old[idx].name) : ''), play = hint.play; hint = { play: false, key: '' };
    if (!n || !st.length) { say('Keine Audiodateien gefunden.', 'warn'); render(); return 0; }
    const byKey = new Map(old.map(t => [t.key || t.name, t])); let hit = 0;
    st.forEach(t => { const o = byKey.get(t.key || t.name); if (o) { hit++; ['title', 'artist', 'album', 'genre', 'year', 'track', 'fmt', 'comment'].forEach(k => { if (o[k]) t[k] = o[k]; }); if (o.dur) t.dur = o.dur; t.tagsDone = !!o.tagsDone; } });
    old.forEach(freeItem); list = st; let j = list.findIndex(t => (t.key || t.name) === oldKey);
    if (!hit) { say('Dieser Ordner passt nicht zur letzten Sitzung – neue Liste.', 'info'); j = 0; resumePos = 0; resumeKey = ''; } else { if (j < 0) { j = 0; resumePos = 0; resumeKey = ''; } say(hit + ' von ' + list.length + ' Titeln verbunden – weiter bei „' + list[j].title + '“.', 'success'); }
    idx = j; render(); await load(j, play); persist(); scan(); return n;
  }
  function resetList() { try { au.pause(); au.removeAttribute('src'); au.load(); } catch (_) {} if (url) { try { URL.revokeObjectURL(url); } catch (_) {} url = null; } list.forEach(freeItem); list = []; idx = -1; history = []; paintCover(); }
  async function onOffline(i, autoplay) {
    const rec = recOfSrc(); const t = list[i]; hint = { play: !!autoplay, key: t ? (t.key || t.name) : '' };
    if (rec && rec.handle) { if (await openHandle(rec, { relink: true, play: !!autoplay, key: hint.key })) return; }
    else if (rec && rec.nat) { if (await openNative(rec, { relink: true, play: !!autoplay, key: hint.key })) return; }
    render(); say(curSrc && curSrc.kind === 'dir' ? 'Ordner „' + curSrc.name + '“ bitte erneut wählen – dann geht es genau hier weiter.' : 'Bitte die Dateien erneut wählen – dann geht es genau hier weiter.', 'info');
  }
  function relinkNow() {
    hint = { play: false, key: '' }; const rec = recOfSrc();
    if (rec && rec.handle) { openHandle(rec, { relink: true, play: false, key: (cur() || {}).key }).then(ok => { if (!ok) pickFolder(); }); return; }
    if (rec && rec.nat) { openNative(rec, { relink: true, play: false, key: (cur() || {}).key }).then(ok => { if (!ok) pickFolder(); }); return; }
    if (curSrc && curSrc.kind === 'dir') pickFolder(); else { const f = $('pl-file'); if (f) f.click(); }
  }
  function paintOff() {
    const bar = $('pl-offbar'); if (!bar) return; const off = list.some(t => t.off); bar.hidden = !off; if (!off) return;
    const src = curSrc || {}, rec = recOfSrc(), what = src.kind === 'dir' ? 'Ordner „' + src.name + '“' : src.kind === 'zip' ? 'ZIP „' + src.name + '“' : 'Dateien', t = cur();
    bar.innerHTML = '<span>Letzte Sitzung: ' + esc(what) + ' · ' + list.length + ' Titel' + (t ? ' · weiter bei „' + esc(t.title) + '“' : '') + '. ' + (rec && (rec.handle || rec.nat) ? 'Mit einem Tipp wieder verbinden.' : (src.kind === 'dir' ? 'Den Ordner erneut wählen, dann geht es genau dort weiter.' : 'Die Dateien erneut wählen, dann geht es genau dort weiter.')) + '</span><button type="button" class="pl-btn pl-pri" data-pl="relink">' + (src.kind === 'dir' ? 'Ordner verbinden' : 'Dateien wählen') + '</button>';
  }
  /* Verlauf der letzten Ordner */
  /* ---------- Schlaf-Timer (1.48) ---------- */
  const SLEEP_FADE = 20;   // Sekunden zum Ausblenden am Ende
  let sleep = null, sleepTk = null;   // { mode: 'time' | 'track', end, mins, v }
  const sleepLeft = () => sleep && sleep.mode === 'time' ? Math.max(0, (sleep.end - Date.now()) / 1000) : -1;
  const sleepText = () => !sleep ? '' : sleep.mode === 'track' ? 'nach diesem Titel' : 'noch ' + (sleepLeft() < 60 ? Math.ceil(sleepLeft()) + ' Sek.' : Math.ceil(sleepLeft() / 60) + ' Min.');
  function fadeTo(v) {
    try { const P = SND(); if (P && P.fade) P.fade(v); } catch (_) {}
    try { const P = SND(); au.volume = Math.max(0, Math.min(1, S.vol * (P && P.active && P.active() ? 1 : v))); } catch (_) {}
  }
  function sleepPaint() {
    const b = root && root.querySelector('[data-pl="sleep"]'); if (!b) return; const on = !!sleep, tx = b.querySelector('b');
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); b.title = on ? 'Schlaf-Timer: ' + sleepText() : 'Schlaf-Timer';
    if (tx) { tx.hidden = !on; tx.textContent = !on ? '' : sleep.mode === 'track' ? '1' : String(sleepLeft() < 60 ? '<1' : Math.ceil(sleepLeft() / 60)); }
  }
  function sleepClear() { sleep = null; if (sleepTk) { SunTick.stop(sleepTk); sleepTk = null; } fadeTo(1); sleepPaint(); }
  function sleepSet(m) {
    sleepClear(); if (!m) { say('Schlaf-Timer ist aus.', 'info'); return; }
    sleep = m === 'track' ? { mode: 'track' } : { mode: 'time', mins: m, end: Date.now() + m * 60000, v: 1 };
    sleepTk = SunTick.every(1000, sleepTick, { hidden: true }); sleepPaint();
    say(m === 'track' ? 'Schlaf-Timer: Die Wiedergabe endet nach diesem Titel.' : 'Schlaf-Timer: In ' + m + ' Minuten ist Schluss – zum Schluss wird die Musik sanft leiser.', 'info');
  }
  function sleepTick() {
    if (!sleep || sleep.mode !== 'time') return; const left = sleepLeft();
    if (left <= 0) { const was = !au.paused; sleepClear(); pause(); fadeTo(1); if (was) say('Schlaf-Timer: Die Wiedergabe wurde angehalten. Gute Nacht!', 'info'); return; }
    const v = left < SLEEP_FADE ? left / SLEEP_FADE : 1; if (v !== sleep.v) { sleep.v = v; fadeTo(v); }
    SunTick.rate(sleepTk, left < SLEEP_FADE + 2 ? 250 : 1000); sleepPaint();
  }
  function sleepTrackEnd() {   // Titel zu Ende: zum nächsten Titel springen, aber nicht abspielen
    sleepClear(); const j = pick(1, true); say('Schlaf-Timer: Die Wiedergabe wurde angehalten. Gute Nacht!', 'info');
    if (j >= 0) load(j, false); else { try { au.currentTime = 0; } catch (_) {} syncMedia(); }
  }
  function showSleep() {
    const rc = $('pl-rc'); if (!rc) return; const row = (v, t, sm) => '<div class="pl-rrow' + (sleep && ((v === 'track' && sleep.mode === 'track') || sleep.mins === v) ? ' on' : '') + '"><button type="button" class="pl-rg" data-sl="' + v + '"><b>' + t + '</b>' + (sm ? '<small>' + sm + '</small>' : '') + '</button></div>';
    rc.innerHTML = '<div role="dialog" aria-label="Schlaf-Timer"><h3>Schlaf-Timer</h3><p>' + (sleep ? 'Aktiv: ' + sleepText() + '. Zum Schluss wird die Musik sanft leiser.' : 'Nach der gewählten Zeit wird die Musik sanft ausgeblendet und angehalten.') + '</p>' +
      [15, 30, 45, 60, 90].map(m => row(m, m + ' Minuten')).join('') + row('track', 'Nach diesem Titel', 'danach wartet der nächste Titel pausiert') + (sleep ? row(0, 'Timer ausschalten') : '') +
      '<div class="pl-ebtns"><button type="button" class="pl-btn" data-rcclose>Schließen</button></div></div>'; rc.hidden = false;
  }
  function showRecent() {
    const rc = $('pl-rc'); if (!rc) return; const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 2 ? 'gerade eben' : m < 90 ? 'vor ' + m + ' Min.' : m < 2880 ? 'vor ' + Math.round(m / 60) + ' Std.' : 'vor ' + Math.round(m / 1440) + ' Tagen'; };
    rc.innerHTML = '<div role="dialog" aria-label="Zuletzt genutzte Ordner"><h3>Zuletzt genutzte Ordner</h3><p>' + (recents.length ? 'Antippen öffnet den Ordner wieder' + (window.showDirectoryPicker ? ' (der Browser fragt eventuell einmal nach der Freigabe).' : natOk() ? ' – die App merkt sich die Freigabe, eventuell musst du nur einmal neu wählen.' : ' – auf Android wählst du ihn im Dialog erneut aus.') : 'Noch keine – sobald du einen Ordner öffnest, erscheint er hier.') + '</p>' +
      recents.map(r => '<div class="pl-rrow"><button type="button" class="pl-rg" data-rc="' + esc(r.id) + '"><b>' + esc(r.name) + '</b><small>' + r.count + ' Titel · ' + ago(r.ts) + (r.handle || r.nat ? '' : ' · neu wählen') + '</small></button><button type="button" class="pl-rx" data-rcx="' + esc(r.id) + '" aria-label="Aus dem Verlauf entfernen">' + svg('x', 16) + '</button></div>').join('') +
      '<div class="pl-ebtns"><button type="button" class="pl-btn" data-rcclose>Schließen</button></div></div>'; rc.hidden = false;
  }
  async function useRecent(id) {
    const r = recents.find(x => x.id === id); if (!r) return; const rc = $('pl-rc'); if (rc) rc.hidden = true;
    if (r.handle || r.nat) { if (!(r.nat ? await openNative(r, { play: false, fresh: true, silent: true }) : await openHandle(r, { play: false, fresh: true }))) say('Der Ordner „' + r.name + '“ ist nicht mehr freigegeben – bitte neu wählen.', 'warn'); else return; }
    else say('Bitte den Ordner „' + r.name + '“ im Dialog wählen.', 'info');
    pickFolder();
  }

  async function load(i, autoplay) {
    if (i < 0 || i >= list.length) return false;
    const t = list[i]; idx = i;
    if (t.off) { try { au.pause(); } catch (_) {} render(); paintCover(); persist(); await onOffline(i, autoplay); return false; }
    try { au.pause(); } catch (_) {}
    if (url) { try { URL.revokeObjectURL(url); } catch (_) {} url = null; }
    render(); busyLoad++; loadGen++; t.wantPlay = !!autoplay; t.streamed = false;
    try {
      let su = null, b = null;
      if (t.stream && !t.noStream) { try { su = await t.stream(); } catch (_) { su = null; } }   // direkter Weg (Android-App mit neuer Hülle)
      if (idx !== i) return false;   // inzwischen anderer Titel gewählt
      if (su) { t.streamed = true; t.via = 'direkt (native Kopie)'; au.src = su; au.load(); }
      else {
        let last = -1; const sub = $('pl-sub');
        const prog = p => { const q = Math.round(p * 100); if (q !== last && cur() === t) { last = q; if (sub) sub.textContent = 'Lädt … ' + q + ' %'; } };
        t.via = t.noStream ? 'Rückfall: ganze Datei geladen' : t.stream ? 'ganze Datei geladen (direkt nicht möglich)' : 'ganze Datei geladen';
        b = await t.get(() => idx !== i, prog);
        if (idx !== i) return false;
        if (!t.size) t.size = b.size;
        url = URL.createObjectURL(typed(b, t.name)); au.src = url; au.load();
      }
      const rp = (resumeKey && resumeKey === (t.key || t.name)) ? resumePos : 0; resumePos = 0; resumeKey = '';
      if (rp > 0.5) au.addEventListener('loadedmetadata', () => { try { au.currentTime = Math.max(0, Math.min(rp, (au.duration || rp) - 0.5)); } catch (_) {} paintTime(); }, { once: true });
      if (b) readTags(t, b); else if (t.head) t.head().then(h => readTags(t, h)).catch(() => {});
      paintCover(); persist();
      if (autoplay) await play();
      else syncMedia();
      return true;
    } catch (e) { if (idx !== i) return false; t.bad = true; say('„' + t.title + '“ lässt sich nicht öffnen.', 'error'); render(); return false; }
    finally { busyLoad--; wakeQuiet(); render(true); }
  }
  async function play() {
    if (!cur()) { if (list.length) await load(0, true); return; }
    if (!au.src) { await load(idx, true); return; }
    try { if (typeof dawState !== 'undefined' && dawState.isPlaying) audioEngine.stop(false); } catch (_) {}   // DAW und Player nicht gleichzeitig
    try { if (S.dsp && SND()) { SND().set(S.preset, S.custom, true); SND().resume(); } } catch (_) {}
    try { if (cvb) cvb.wake(); } catch (_) {}
    const g = loadGen;   // Fehler des direkten Wegs übernimmt der Rückfall im error-Ereignis (siehe unten)
    try { await au.play(); errRun = 0; } catch (e) { if (g !== loadGen || (!(e && e.name === 'NotAllowedError') && cur() && cur().streamed && !cur().noStream)) return; if (e && e.name === 'NotAllowedError') say('Zum Abspielen bitte auf Play tippen.', 'info'); else { const t = cur(); if (t) t.bad = true; say('Abspielen nicht möglich.', 'error'); } }
  }
  const pause = () => { try { au.pause(); } catch (_) {} };
  const toggle = () => { if (au.paused) play(); else pause(); };
  function pick(dir, auto) {
    const n = list.length; if (!n) return -1;
    if (S.shuffle && n > 1) {
      if (dir < 0) { history.pop(); return history.length ? history.pop() : idx; }
      history.push(idx); if (history.length > 200) history.shift();
      let r; do { r = Math.floor(Math.random() * n); } while (r === idx); return r;
    }
    let j = idx + dir;
    if (j >= n) { if (S.repeat === 'all' || !auto) j = 0; else return -1; }
    if (j < 0) j = n - 1;
    return j;
  }
  function next(auto) { const j = pick(1, !!auto); if (j < 0) { pause(); try { au.currentTime = 0; } catch (_) {} syncMedia(); return; } return load(j, true); }
  function prev() { if (au.currentTime > 3) { au.currentTime = 0; return; } const j = pick(-1, false); if (j >= 0) return load(j, !au.paused || true); }
  function seekTo(sec) { if (cur() && isFinite(au.duration)) { au.currentTime = Math.max(0, Math.min(au.duration, sec)); } }
  function freeItem(t) { if (t && t.cover) { try { URL.revokeObjectURL(t.cover); } catch (_) {} t.cover = ''; } }
  function remove(id) {
    const i = list.findIndex(t => t.id === id); if (i < 0) return;
    const was = i === idx, playing = !au.paused; freeItem(list[i]); list.splice(i, 1);
    if (!list.length) { clear(); return; }
    if (was) { idx = Math.min(i, list.length - 1); load(idx, playing); } else if (i < idx) idx--;
    render(); persist();
  }
  function clear() {
    pause(); try { au.removeAttribute('src'); au.load(); } catch (_) {} if (url) { try { URL.revokeObjectURL(url); } catch (_) {} url = null; }
    list.forEach(freeItem); list = []; idx = -1; history = []; curSrc = null; resumePos = 0; resumeKey = ''; if (Media.owner === 'player') Media.stop(); render(); updMini(); paintCover(); persist();
  }
  /* Cover des Titels: aus den Tags, sonst ein passendes Cover aus Titel + Künstler (wie in der DAW) */
  function coverOf(t) {
    if (!t) return ''; if (t.cover) return t.cover;
    const k = t.title + '|' + t.artist; if (t.genK !== k) { t.genK = k; t.gen = ''; try { if (window.Cover && Cover.generate) t.gen = Cover.generate({ title: t.title, artist: t.artist || '' }).cover; } catch (_) {} }
    return t.gen || '';
  }
  function prepItemArt(t) {   // 256-px-Cover für die Benachrichtigung (Base64) – einmal je Titel
    if (!t || t.artBusy || (t.artB64 && t.artFor === coverOf(t))) return; const src = coverOf(t); if (!src) return; t.artBusy = true;
    const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), m = Math.min(im.naturalWidth, im.naturalHeight); x.drawImage(im, (im.naturalWidth - m) / 2, (im.naturalHeight - m) / 2, m, m, 0, 0, 256, 256); t.artB64 = c.toDataURL('image/jpeg', 0.82).split(',')[1] || ''; t.artFor = src; } catch (_) {} t.artBusy = false; if (cur() === t) syncMedia(); };
    im.onerror = () => { t.artBusy = false; }; im.src = src;
  }
  function ctxMedia() {
    const t = cur(); const d = isFinite(au.duration) ? au.duration : (t && isFinite(t.dur) ? t.dur : 0);
    const o = { title: t ? t.title : 'Player', artist: t ? (t.artist || t.sub || 'Sunshine@R Player') : '', playing: !au.paused, position: au.currentTime || 0, duration: d || 0, hasPrev: list.length > 1, hasNext: list.length > 1 };
    if (t) { prepItemArt(t); if (t.artB64) { o.art = t.artB64; o.artKey = 'pl:' + t.id + ':' + (t.cover ? 'c' : 'g'); } }
    return o;
  }
  function syncMedia() {
    const t = cur(); if (!t) return;
    try {
      if ('mediaSession' in navigator && window.MediaMetadata) {
        const cv = coverOf(t); navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || t.sub || 'Sunshine@R Player', album: t.album || 'Sunshine@R Player', artwork: cv ? [{ src: cv, sizes: '512x512', type: /^data:image\/png/.test(cv) ? 'image/png' : 'image/jpeg' }] : [] });
        navigator.mediaSession.playbackState = au.paused ? 'paused' : 'playing';
      }
    } catch (_) {}
    if (!au.paused) claim('player');
    if (Media.owner === 'player' && Media.available()) Media.update(ctxMedia());
  }
  try {
    if ('mediaSession' in navigator) {
      const h = (n, f) => { try { navigator.mediaSession.setActionHandler(n, f); } catch (_) {} };
      h('play', () => play()); h('pause', pause); h('previoustrack', () => prev()); h('nexttrack', () => next(false)); h('seekto', d => { if (d && d.seekTime != null) seekTo(d.seekTime); });
    }
  } catch (_) {}

  au.addEventListener('play', () => { claim('player'); syncMedia(); render(true); });
  au.addEventListener('pause', () => { syncMedia(); render(true); savePos(true); persist(); });
  au.addEventListener('seeked', () => syncMedia());
  au.addEventListener('loadedmetadata', () => { const t = cur(); if (t && isFinite(au.duration)) { t.dur = au.duration; } paintList(); paintTime(); syncMedia(); });
  au.addEventListener('timeupdate', () => { paintTime(); savePos(false); });
  au.addEventListener('ended', () => { if (sleep && sleep.mode === 'track') { sleepTrackEnd(); return; } if (S.repeat === 'one') { au.currentTime = 0; play(); } else next(true); });
  au.addEventListener('error', () => {
    const t = cur(); if (!t || !au.src) return;
    if (t.streamed && !t.noStream) { t.noStream = true; t.streamed = false; say('Direktes Abspielen klappt nicht – die Datei wird geladen …', 'info'); load(idx, t.wantPlay); return; }   // einmaliger Rückfall auf den alten Weg
    t.bad = true; lastErr = 'Wiedergabefehler (' + (au.error ? 'Code ' + au.error.code : '?') + ') bei Weg: ' + (t.via || '?') + ' · ' + new Date().toLocaleTimeString('de-DE'); render();
    if (++errRun < list.length && !au.paused === false) { say('„' + t.title + '“ nicht abspielbar – nächster Titel.', 'warn'); if (list.length > 1) next(true); }
    else say('„' + t.title + '“ nicht abspielbar.', 'error');
  });

  /* Tasten der Benachrichtigung */
  window.addEventListener('sunshine-media', e => {
    const d = e.detail || {}, a = d.action, own = Media.owner;
    if (own === 'daw') {
      const playing = typeof dawState !== 'undefined' && !!dawState.isPlaying;
      if (a === 'play' && !playing) { const b = $('btn-play'); if (b) b.click(); }
      else if (a === 'pause' && playing) { const b = $('btn-play'); if (b) b.click(); }
      else if (a === 'stop') { const b = $('btn-stop'); if (b) b.click(); }
      return;
    }
    if (a === 'play') play(); else if (a === 'pause') pause(); else if (a === 'next') next(false); else if (a === 'prev') prev();
    else if (a === 'seek' && d.position != null) seekTo(d.position);
    else if (a === 'stop') { pause(); Media.stop(); }
  });

  /* ---------- DAW im Hintergrund ---------- */
  let dawT = null;
  function dawSync() {
    dawT = null;
    try {
      if (typeof dawState === 'undefined' || !Media.available()) return;
      const name = (dawState.project && dawState.project.name) || 'Projekt';
      const cvr = (dawState.project && dawState.project.cover) ? { art: String(dawState.project.cover).split(',')[1] || '', artKey: 'cv:' + (dawState.project.id || '') + ':' + dawState.project.cover.length } : {}, artist = (dawState.project && dawState.project.tags && dawState.project.tags.artist) || 'Sunshine@R DAW Studio';
      if (dawState.isPlaying) { try { if (!au.paused) pause(); } catch (_) {} claim('daw'); Media.update(Object.assign({ title: name, artist, playing: true, position: dawState.playheadSec || 0, duration: 0, hasPrev: false, hasNext: false }, cvr)); }
      else if (Media.owner === 'daw') { if ((dawState.playheadSec || 0) < 0.05) Media.stop(); else Media.update(Object.assign({ title: name, artist, playing: false, position: dawState.playheadSec || 0, duration: 0, hasPrev: false, hasNext: false }, cvr)); }
    } catch (_) {}
  }
  const dawSoon = () => { if (dawT) clearTimeout(dawT); dawT = setTimeout(dawSync, 300); };
  /* 1.43: Titel als Audio-Spur in die DAW laden. Schützt vor Speicher-Überlauf: Ein Titel wird als Gleitkomma-Audio (≈ 48 kHz, stereo) entpackt und braucht ein Vielfaches seiner Dateigröße. */
  let tdBusy = false;
  const estMB = t => { const d = isFinite(t.dur) && t.dur > 0 ? t.dur : (t.size ? t.size / (/wav/i.test((t.fmt || '') + ' ' + (t.name || '')) ? 176400 : 16000) : 0); return d * 48000 * 8 / 1048576; };
  async function toDaw(i) {
    const t = list[i]; if (!t || tdBusy) return false;
    if (typeof window.addAudioBlobAsTrack !== 'function') { say('Die DAW ist noch nicht bereit.', 'error'); return false; }
    if (t.bad || t.off) { say('„' + t.title + '“ ist gerade nicht lesbar.', 'warn'); return false; }
    let mem = null; try { mem = window.Health && Health.memory ? Health.memory() : null; } catch (_) {}
    const lim = mem ? mem.limits : [500, 900], have = mem ? mem.mb : 0, est = Math.round(estMB(t));
    if (have + est >= lim[1]) { say('„' + t.title + '“ ist zu lang für den Arbeitsspeicher (als Spur ≈ ' + est + ' MB, schon ' + have + ' MB belegt). Nicht geladen – nicht benötigte Spuren löschen und die App neu starten schafft Platz.', 'error'); return false; }
    if (have + est >= lim[0] && !confirm('„' + t.title + '“ braucht als Spur ≈ ' + est + ' MB Arbeitsspeicher (schon ' + have + ' MB belegt). Die App kann dadurch instabil werden. Trotzdem laden?')) return false;
    tdBusy = true; say('„' + t.title + '“ wird als Spur geladen …', 'info');
    try {
      const b = await t.get(() => false, () => {});
      const r = await window.addAudioBlobAsTrack(typed(b, t.name), t.name, t.title);
      say('„' + t.title + '“ liegt jetzt als Spur ' + r.num + ' im Projekt (' + fmt(r.seconds) + '). Rückgängig mit „Zurück“ in der DAW.', 'success');
      return true;
    } catch (e) { say('„' + t.title + '“ konnte nicht als Spur geladen werden.', 'error'); try { window.Health && Health.log && Health.log('Titel als Spur: ' + (e && e.message || e), 'player'); } catch (_) {} return false; }
    finally { tdBusy = false; }
  }
  function hookDaw() {
    try {
      if (typeof audioEngine === 'undefined' || audioEngine.__bg) return;
      const p = audioEngine.play, s = audioEngine.stop;
      audioEngine.play = async function () { try { if (!au.paused) pause(); } catch (_) {} const r = await p.apply(this, arguments); dawSoon(); return r; };
      audioEngine.stop = function () { const r = s.apply(this, arguments); dawSoon(); return r; };
      audioEngine.__bg = 1;
    } catch (_) {}
  }

  /* ---------- Oberfläche ---------- */
  const IC = {
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4.5" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="4" width="4.5" height="16" rx="1" fill="currentColor" stroke="none"/>',
    prev: '<path d="M19 20 9 12l10-8v16z" fill="currentColor"/><path d="M5 19V5"/>', next: '<path d="m5 4 10 8-10 8V4z" fill="currentColor"/><path d="M19 5v14"/>',
    shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    vol: '<path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
    tospur: '<path d="M4 7h9M4 12h6M4 17h9"/><path d="M16 9v8M13 14l3 3 3-3"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M5 12h14M12 5v14"/>', back: '<path d="m15 18-6-6 6-6"/>',
    note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>', start: '<path d="M19 20 9 12l10-8v16z" fill="currentColor"/><path d="M5 19V5"/>',
    metro: '<path d="M8 21 10 4h4l2 17z"/><path d="M12 17 16 8"/><path d="M10 12h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  const svg = (k, w) => '<svg viewBox="0 0 24 24" width="' + (w || 22) + '" height="' + (w || 22) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>';

  let cvb = null, vzOn = false;
  const metaLine = t => !t ? '' : [t.genre, t.year, t.track ? 'Nr. ' + t.track : '', t.fmt, t.size ? mb(t.size) : ''].filter(Boolean).join(' · ');
  function build() {
    if (root) return root;
    root = document.createElement('div'); root.id = 'pl-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Player'); root.hidden = true;
    const addBtns = '<button type="button" class="pl-btn pl-pri" data-pl="add">' + svg('plus', 18) + '<span>Dateien</span></button><button type="button" class="pl-btn" data-pl="folder">' + svg('folder', 18) + '<span>Ordner</span></button>';
    root.innerHTML =
      '<div class="pl-top"><span class="pl-tl"><button type="button" class="pl-btn" data-pl="close" aria-label="Player schließen">' + svg('back', 20) + '<span>Zurück</span></button></span><h2>Player</h2><span class="pl-tr"><button type="button" class="pl-btn pl-sq pl-sleep" data-pl="sleep" aria-label="Schlaf-Timer" title="Schlaf-Timer" aria-pressed="false">' + svg('moon', 20) + '<b hidden></b></button><button type="button" class="pl-btn pl-sq" data-pl="fb" aria-label="Feedback senden" title="Feedback senden">' + svg('chat', 20) + '</button><button type="button" class="pl-btn pl-sq" data-pl="opts" aria-label="Optionen" title="Optionen">' + svg('gear', 20) + '</button></span></div>' +
      '<div class="pl-fixed" id="pl-fixed">' +
      '<div class="pl-hero" id="pl-hero"><div class="pl-vizbox" id="pl-vizbox"><canvas id="pl-viz" aria-hidden="true"></canvas></div><div class="pl-cvhost" id="pl-cv"></div><div class="pl-art" id="pl-art"><img src="assets/sunshine-r-app-icon.png" alt="" onerror="this.remove()"></div></div>' +
      '<div class="pl-now"><div class="pl-title" id="pl-title">Noch nichts ausgewählt</div><div class="pl-sub" id="pl-sub">Dateien, einen Ordner oder ein Suno-ZIP hinzufügen</div><div class="pl-meta" id="pl-meta"></div></div></div>' +
      '<div class="pl-body">' +
      '<section class="pl-snd" id="pl-snd" aria-label="Klang"><div class="pl-sh"><b>Klang</b><span class="pl-pname" id="pl-pname"></span><button type="button" class="pl-chip pl-vzb" data-pl="viz" aria-pressed="true">Anzeige</button></div>' +
      '<div class="pl-pdesc" id="pl-pdesc"></div>' +
      '<div class="pl-bands" id="pl-bands" hidden>' + SND_BANDS() + '<button type="button" class="pl-link" data-pl="bandreset">Zurücksetzen</button></div>' +
      '<p class="pl-note" id="pl-snote"></p></section>' +
      '<div class="pl-off-bar" id="pl-offbar" hidden></div>' +
      '<div class="pl-lh"><span id="pl-count">0 Titel</span><button type="button" class="pl-btn pl-pri pl-lhadd" data-pl="add">' + svg('plus', 18) + '<span>Dateien</span></button><span class="pl-lhb"><button type="button" class="pl-link" data-pl="recent">Zuletzt</button><button type="button" class="pl-link" data-pl="folder">Ordner wählen</button><button type="button" class="pl-link" data-pl="clear">Liste leeren</button></span></div>' +
      '<div id="pl-list" role="list"></div>' +
      '<div class="pl-empty" id="pl-empty"><p>Hier spielst du Audiodateien ab – direkt von deinem Gerät, ohne ein Projekt zu öffnen und ohne sie erst in die App zu laden.</p><p>Unterstützt: <b>WAV, MP3, M4A, OGG, FLAC</b> und <b>ZIP</b> (z. B. der Suno-Download). Titel, Künstler, Album und Cover werden aus den Dateien gelesen.</p><div class="pl-ebtns">' + addBtns + '</div></div>' +
      '<p class="pl-note" id="pl-note"></p></div>' +
      '<div class="pl-dock" id="pl-dock" role="group" aria-label="Wiedergabe"><div class="pl-dk-scroll" id="pl-dkscroll"><div class="pl-dk-pane" id="pl-dkp-ctl"><div class="pl-dk-seek"><span id="pl-cur">0:00</span><input type="range" class="daw-slider pl-seek" id="pl-seek" min="0" max="1000" value="0" step="1" aria-label="Position" disabled><span id="pl-dur">–:––</span></div>' +
      '<div class="pl-ctl"><button type="button" class="pl-ic" data-pl="shuffle" aria-label="Zufall" aria-pressed="false">' + svg('shuffle') + '</button><button type="button" class="pl-ic" data-pl="prev" aria-label="Zurück">' + svg('prev', 26) + '</button>' +
      '<button type="button" class="pl-play" data-pl="toggle" aria-label="Abspielen">' + svg('play', 30) + '</button><button type="button" class="pl-ic" data-pl="next" aria-label="Weiter">' + svg('next', 26) + '</button><button type="button" class="pl-ic" data-pl="repeat" aria-label="Wiederholen" aria-pressed="false">' + svg('repeat') + '<b id="pl-rep1" hidden>1</b></button></div></div>' +
      '<div class="pl-dk-pane pl-dk-snd" id="pl-dkp-snd" aria-label="Klang-Vorauswahl"><div class="pl-chips" id="pl-chips" role="radiogroup" aria-label="Klang-Voreinstellung"></div></div>' +
      '<div class="pl-dk-pane pl-dk-zt" id="pl-dkp-zt" aria-label="Zentrale"></div></div>' +
      '<div class="pl-dk-dots" id="pl-dkdots"><button type="button" data-dk="0" class="on" aria-label="Steuerung"></button><button type="button" data-dk="1" aria-label="Klang-Vorauswahl"></button><button type="button" data-dk="2" aria-label="Zentrale"></button></div></div>' +
      '<div class="pl-rc" id="pl-rc" hidden></div>' +
      '<input type="file" id="pl-file" multiple accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.zip,application/zip" hidden>' +
      '<input type="file" id="pl-dir" webkitdirectory directory multiple hidden>';
    document.body.appendChild(root);
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-pl]'); const row = e.target.closest('[data-pl-i]'); const chip = e.target.closest('[data-pl-preset]');
      if (chip) { setPreset(chip.dataset.plPreset); return; }
      const slb = e.target.closest('[data-sl]'); if (slb) { sleepSet(slb.dataset.sl === 'track' ? 'track' : +slb.dataset.sl); const r = $('pl-rc'); if (r) r.hidden = true; return; }
      if (b && b.dataset.pl === 'sleep') { showSleep(); return; }
      const rcb = e.target.closest('[data-rc]'); if (rcb) { useRecent(rcb.dataset.rc); return; }
      const rcx = e.target.closest('[data-rcx]'); if (rcx) { recents = recents.filter(r => r.id !== rcx.dataset.rcx); saveRecents(); showRecent(); return; }
      if (e.target.closest('[data-rcclose]') || e.target === $('pl-rc')) { $('pl-rc').hidden = true; return; }
      if (b) {
        const a = b.dataset.pl;
        if (a === 'close') close(); else if (a === 'opts') openOpts(); else if (a === 'fb') { try { if (window.Feedback) Feedback.open({ area: 'Player' }); } catch (_) {} } else if (a === 'add') $('pl-file').click(); else if (a === 'folder') pickFolder(); else if (a === 'recent') showRecent(); else if (a === 'relink') relinkNow(); else if (a === 'toggle') toggle(); else if (a === 'next') next(false); else if (a === 'prev') prev();
        else if (a === 'shuffle') { S.shuffle = !S.shuffle; history = []; saveS(); render(true); }
        else if (a === 'repeat') { S.repeat = S.repeat === 'off' ? 'all' : S.repeat === 'all' ? 'one' : 'off'; saveS(); render(true); }
        else if (a === 'clear') { if (list.length) clear(); }
        else if (a === 'viz') { S.viz = !S.viz; saveS(); render(true); }
        else if (a === 'bandreset') { S.custom = [0, 0, 0, 0, 0]; saveS(); applySound(); paintSound(); }
        else if (a === 'dspon') { S.dsp = true; saveS(); applySound(); render(true); }
        else if (a === 'rm') { remove(+b.dataset.id); }
        else if (a === 'tospur') { toDaw(list.findIndex(x => x.id === +b.dataset.id)); }
        return;
      }
      if (row) { const i = +row.dataset.plI; if (i === idx) toggle(); else load(i, true); }
    });
    root.addEventListener('input', e => { const r = e.target.closest && e.target.closest('[data-pl-band]'); if (!r) return; S.custom[+r.dataset.plBand] = +r.value; if (S.preset !== 'custom') S.preset = 'custom'; clearTimeout(root._sv); root._sv = setTimeout(saveS, 250); applySound(); paintSound(true); });
    $('pl-file').addEventListener('change', async e => { const f = e.target.files; if (f && f.length) await addFiles(f); e.target.value = ''; });
    $('pl-dir').addEventListener('change', async e => { const f = e.target.files; if (f && f.length) await addFiles(f, { folder: true }); e.target.value = ''; });
    const sk = $('pl-seek');
    sk.addEventListener('input', () => { seeking = true; if (isFinite(au.duration)) $('pl-cur').textContent = fmt(au.duration * sk.value / 1000); });
    sk.addEventListener('change', () => { if (isFinite(au.duration)) seekTo(au.duration * sk.value / 1000); seeking = false; });
    const dks = $('pl-dkscroll'), dkd = $('pl-dkdots');
    const dkPane = () => Math.round(dks.scrollLeft / Math.max(1, dks.clientWidth));
    const dkIds = ['pl-dkp-ctl', 'pl-dkp-snd', 'pl-dkp-zt'];
    const dkPaint = rest => { const n = Math.max(0, Math.min(dkIds.length - 1, dkPane())); dkd.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === n)); dks.dataset.pane = String(n); if (rest !== false) dkIds.forEach((id, i) => $(id).toggleAttribute('inert', n !== i)); };
    /* Seite „Zentrale“ – derselbe Baustein wie in der DAW-Leiste und auf der Startseite (die DAW-Steuerung gehört nicht in den Player) */
    try { if (window.Zentrale) { $('pl-dkp-zt').appendChild(Zentrale.pane('player')); document.documentElement.classList.add('zt-on'); } } catch (_) {}
    dks.addEventListener('scroll', () => { clearTimeout(dks._t); dks._t = setTimeout(() => dkPaint(false), 60); }, { passive: true });
    try { if (window.Zentrale && Zentrale.settle) Zentrale.settle(dks, () => dkPaint(true)); } catch (_) {}
    dkd.addEventListener('click', e => { const b = e.target.closest('[data-dk]'); if (!b) return; dks.scrollTo({ left: +b.dataset.dk * dks.clientWidth, behavior: 'smooth' }); });
    dkPaint(); root._dkGo = n => { dks.scrollTo({ left: n * dks.clientWidth, behavior: 'auto' }); dkPaint(); };
    root.addEventListener('dragover', e => { e.preventDefault(); });
    root.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    window.addEventListener('resize', () => { if (root && !root.hidden) { clearTimeout(build._rz); build._rz = setTimeout(fitCover, 120); } });
    if (SND()) SND().attach($('pl-viz'), () => !au.paused && SND().active());
    return root;
  }
  function SND_BANDS() {
    const P = SND(); if (!P) return ''; return P.BAND_NAMES.map((n, i) => '<label class="pl-band"><output data-pl-bo="' + i + '">0</output><input type="range" data-pl-band="' + i + '" min="-' + P.MAXDB + '" max="' + P.MAXDB + '" step="1" value="0" aria-label="' + n + '" orient="vertical"><span>' + n + '</span></label>').join('');
  }
  /* ---- Klang ---- */
  function applySound() { const P = SND(); if (!P) return; try { P.set(S.dsp ? S.preset : 'flat', S.custom, !!(S.dsp && (au.src || !au.paused))); } catch (_) {} }
  function setPreset(id) {
    const P = SND(); if (!P || !S.dsp) return; if (id === 'custom' && S.preset !== 'custom' && !S.custom.some(v => v)) S.custom = P.gainsFor(S.preset, S.custom);
    S.preset = P.byId(id).id; saveS(); applySound(); paintSound(); try { P.resume(); } catch (_) {}
  }
  function paintSound() {
    if (!root) return; const P = SND(), box = $('pl-snd'); if (!box) return;
    box.hidden = !P; if (!P) return; const on = S.dsp, p = P.byId(S.preset);
    box.classList.toggle('pl-off', !on); box.dataset.vz = p.vz; box.dataset.preset = p.id;
    $('pl-chips').hidden = !on; $('pl-pdesc').hidden = !on; $('pl-vizbox').hidden = !(on && S.viz); root.querySelector('[data-pl=viz]').hidden = !on; root.querySelector('[data-pl=viz]').setAttribute('aria-pressed', String(S.viz));
    $('pl-pname').textContent = on ? p.name : '';
    if (!$('pl-chips').firstChild) $('pl-chips').innerHTML = P.PRESETS.map(q => '<button type="button" class="pl-chip" role="radio" data-pl-preset="' + q.id + '" aria-checked="false">' + esc(q.name) + '</button>').join('');
    $('pl-chips').querySelectorAll('[data-pl-preset]').forEach(b => { const o = b.dataset.plPreset === p.id; b.setAttribute('aria-checked', String(o)); b.classList.toggle('on', o); });
    $('pl-pdesc').textContent = p.desc;
    const bands = $('pl-bands'); bands.hidden = !(on && p.id === 'custom'); const g = P.gains();
    bands.querySelectorAll('[data-pl-band]').forEach(r => { const i = +r.dataset.plBand; if (+r.value !== g[i]) r.value = g[i]; const o = bands.querySelector('[data-pl-bo="' + i + '"]'); if (o) o.textContent = (g[i] > 0 ? '+' : '') + g[i]; });
    const note = $('pl-snote'); note.textContent = !on ? 'Klang-Voreinstellungen und die Anzeige sind in den Optionen ausgeschaltet.' : P.failed() ? 'Klangbearbeitung ist auf diesem Gerät nicht möglich – der Ton läuft unverändert.' : '';
    if (!on) { note.innerHTML = 'Klang-Voreinstellungen und die Anzeige sind ausgeschaltet. <button type="button" class="pl-link" data-pl="dspon">Einschalten</button>'; }
    P.wake(); fitCover();
  }
  /* ---- Cover ---- */
  function fitCover(force) {
    if (!root || root.hidden) return; const hero = $('pl-hero'), body = root.querySelector('.pl-body'); let total = 160;
    if (cvb) {
      const w = (root.clientWidth || 340) - 40; let reach = 100; try { reach = Cover.settings().reach; } catch (_) {}
      const px = Math.max(window.innerHeight < 520 ? 44 : 72, Math.min(124, Math.floor((w - 6) / (1 + 0.2 * reach / 100)), Math.round(window.innerHeight * 0.145))); cvb.size(px); if (force) cvb.refresh(); total = cvb.el.offsetHeight || px + 24;
    }
    if (hero) hero.style.setProperty('--pl-hero-h', Math.round(total + (S.dsp && S.viz ? 30 : 8)) + 'px');
  }
  function applyCover() {
    if (!root) return; const want = !!(S.cvr && window.Cover && Cover.bind);
    if (want && !cvb) { cvb = Cover.bind($('pl-cv'), { size: 160, data: () => (S.dsp && SND() ? SND().coverData() : null), live: () => !au.paused }); cvb.el.classList.add('pl-cvb'); }
    else if (!want && cvb) { cvb.destroy(); cvb = null; }
    root.classList.toggle('pl-hascv', !!cvb); if (cvb) { fitCover(); paintCover(); }
  }
  function paintCover() { if (cvb) { const t = cur(); cvb.set(t ? coverOf(t) : ''); cvb.wake(); } }
  function paintTime() {
    if (!root || root.hidden) { updMini(); return; }
    const ct = cur(); if (ct && ct.off) { const d0 = ct.dur || 0; $('pl-seek').value = d0 ? Math.round(Math.min(1, resumePos / d0) * 1000) : 0; $('pl-seek').disabled = true; $('pl-cur').textContent = fmt(resumePos); $('pl-dur').textContent = d0 ? fmt(d0) : '–:––'; return; }
    const sk = $('pl-seek'), d = au.duration, t = au.currentTime || 0;
    if (!seeking) { sk.value = isFinite(d) && d > 0 ? Math.round(t / d * 1000) : 0; $('pl-cur').textContent = fmt(t); }
    $('pl-dur').textContent = isFinite(d) ? fmt(d) : '–:––';
    sk.style.setProperty('--pl-p', (sk.value / 10) + '%');
  }
  /* Liste: Zeilen werden nur neu gebaut, wenn sich die Reihenfolge/Anzahl ändert. Sonst (z. B. Dauer vom Hintergrund-Scan, Wechsel des laufenden Titels) werden nur die geänderten Stellen angepasst –
     so bleiben Zeilen mitten in einem Fingertipp erhalten, und 107 Titel kosten nicht bei jedem Scan-Schritt einen kompletten Neuaufbau. */
  const subOf = t => esc(subLine(t)) + (t.size ? ' · ' + mb(t.size) : '') + (t.bad ? ' · nicht lesbar' : '');
  const rowOf = (t, i) => '<div class="pl-row' + (i === idx ? ' on' : '') + (t.bad ? ' bad' : '') + (t.off ? ' off' : '') + '" role="listitem" data-pl-i="' + i + '"><span class="pl-n" data-k="' + (i === idx && !au.paused ? 'eq' : i + 1) + '">' + (i === idx && !au.paused ? '<i class="pl-eq"><u></u><u></u><u></u></i>' : (i + 1)) + '</span><span class="pl-t"><b>' + esc(t.title) + '</b><small>' + subOf(t) + '</small></span><span class="pl-d">' + fmt(t.dur) + '</span><button type="button" class="pl-ts" data-pl="tospur" data-id="' + t.id + '" aria-label="Als Spur in die DAW laden" title="Als Spur in die DAW laden">' + svg('tospur', 18) + '</button><button type="button" class="pl-rm" data-pl="rm" data-id="' + t.id + '" aria-label="Aus Liste entfernen">' + svg('x', 16) + '</button></div>';
  function paintList() {
    if (!root) return;
    const L = $('pl-list'); if (!L) return;
    const key = list.map(t => t.id).join(',');
    if (L.dataset.k !== key || L.children.length !== list.length) { L.innerHTML = list.map(rowOf).join(''); L.dataset.k = key; return; }
    for (let i = 0; i < list.length; i++) {
      const t = list[i], r = L.children[i], on = i === idx, eq = on && !au.paused, n = r.firstElementChild, tt = r.children[1], d = r.children[2];
      r.classList.toggle('on', on); r.classList.toggle('bad', !!t.bad); r.classList.toggle('off', !!t.off);
      const nk = eq ? 'eq' : String(i + 1); if (n.dataset.k !== nk) { n.dataset.k = nk; n.innerHTML = eq ? '<i class="pl-eq"><u></u><u></u><u></u></i>' : String(i + 1); }
      const b = tt.firstElementChild, sm = tt.lastElementChild; if (b.textContent !== t.title) b.textContent = t.title;
      const sh = subOf(t); if (sm.dataset.h !== sh) { sm.dataset.h = sh; sm.innerHTML = sh; }
      const ds = fmt(t.dur); if (d.textContent !== ds) d.textContent = ds;
    }
  }
  function render(light) {
    updMini();
    if (!root) return;
    const t = cur(), playing = !au.paused;
    $('pl-title').textContent = t ? t.title : 'Noch nichts ausgewählt';
    $('pl-sub').textContent = t ? subLine(t) + (list.length > 1 ? ' · Titel ' + (idx + 1) + ' von ' + list.length : '') : 'Dateien, einen Ordner oder ein Suno-ZIP hinzufügen';
    $('pl-meta').textContent = metaLine(t); $('pl-meta').title = t && t.comment ? t.comment : '';
    const pb = root.querySelector('[data-pl=toggle]'); pb.innerHTML = svg(playing ? 'pause' : 'play', 30); pb.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
    root.querySelector('[data-pl=shuffle]').setAttribute('aria-pressed', String(S.shuffle));
    const rp = root.querySelector('[data-pl=repeat]'); rp.setAttribute('aria-pressed', String(S.repeat !== 'off')); $('pl-rep1').hidden = S.repeat !== 'one';
    $('pl-seek').disabled = !t; root.classList.toggle('pl-playing', playing); root.classList.toggle('pl-has', list.length > 0);
    $('pl-count').textContent = list.length + (list.length === 1 ? ' Titel' : ' Titel');
    $('pl-note').textContent = Media.available() ? 'Die Musik läuft auch bei gesperrtem Bildschirm weiter – mit Steuerung in der Benachrichtigungsleiste.' : (native() ? '' : 'Hinweis: Im Browser stoppt Android die Musik meist, sobald die Seite im Hintergrund ist. In der App läuft sie weiter.');
    paintList(); paintTime(); paintSound(); applyCover(); paintOff();
  }
  function updMini() {
    if (!mini) { mini = document.createElement('div'); mini.id = 'pl-mini'; mini.hidden = true; mini.innerHTML = '<button type="button" class="pl-mo" data-pm="open" aria-label="Player öffnen"><span class="pl-mi"></span><span class="pl-mt"><b></b></span></button><button type="button" class="pl-mp" data-pm="toggle" aria-label="Pause"></button><button type="button" class="pl-mx" data-pm="x" aria-label="Player-Leiste ausblenden">' + svg('x', 16) + '</button>'; document.body.appendChild(mini);
      mini.addEventListener('click', e => { const b = e.target.closest('[data-pm]'); if (!b) return; if (b.dataset.pm === 'open') open(); else if (b.dataset.pm === 'toggle') toggle(); else { pause(); mini.hidden = true; mini.dataset.off = '1'; } }); }
    const t = cur(), show = !!t && !t.off && (!root || root.hidden) && !(au.paused && mini.dataset.off === '1');
    if (!au.paused) mini.dataset.off = '';
    mini.hidden = !show; if (!show) return;
    mini.querySelector('.pl-mt b').textContent = t.title + (t.artist ? ' · ' + t.artist : ''); const p = mini.querySelector('.pl-mp'); p.innerHTML = svg(au.paused ? 'play' : 'pause', 20); p.setAttribute('aria-label', au.paused ? 'Abspielen' : 'Pause');
    const mi = mini.querySelector('.pl-mi'), want = au.paused ? 'n' : 'e'; if (mi.dataset.k !== want) { mi.dataset.k = want; mi.innerHTML = au.paused ? svg('note', 20) : '<i class="pl-eq" aria-hidden="true"><u></u><u></u><u></u></i>'; }
    let off = 12; try { const bn = $('bottom-nav'); if (bn && bn.getBoundingClientRect().height > 0 && getComputedStyle(bn).display !== 'none') off = Math.round(window.innerHeight - bn.getBoundingClientRect().top) + 8; } catch (_) {}
    mini.style.bottom = 'calc(' + off + 'px + env(safe-area-inset-bottom,0px))';
  }
  function openOpts() { try { if (window.SunshineTheme && SunshineTheme.open) SunshineTheme.open(); else { const b = $('btn-settings'); if (b) b.click(); } } catch (_) {} }
  function open() { build(); root.hidden = false; document.documentElement.classList.add('pl-open'); try { const m = $('file-menu'); if (m) m.hidden = true; } catch (_) {} render(); fitCover(true); if (SND()) { const pv = $('pl-viz'); if (pv && SND().view().c !== pv) SND().attach(pv, () => !au.paused && SND().active()); SND().wake(); } }
  function close() { if (root) root.hidden = true; document.documentElement.classList.remove('pl-open'); updMini(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden) { close(); e.stopPropagation(); } }, true);

  /* ---------- Einstiege: Menü, Startseite, Optionen ---------- */
  function menuItem() {
    const menu = $('file-menu'); if (!menu || $('btn-player')) return;
    const b = document.createElement('button'); b.id = 'btn-player'; b.type = 'button'; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = '<span>🎧</span><span>Player</span>';
    b.addEventListener('click', () => { try { menu.hidden = true; } catch (_) {} open(); });
    const a = $('btn-feedback') || $('btn-chat') || $('btn-assistant'); if (a && a.parentNode === menu) a.before(b); else menu.appendChild(b);
  }
  function section(ph) {
    const on = () => S.bg, tg = (k, t, d) => '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-pl-o="' + k + '" class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">' + t + '</span><span class="block text-[11px] leading-4 text-slate-400">' + d + '</span></span></label>';
    ph.innerHTML = '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Player &amp; Hintergrund</div><div class="rounded-xl border border-slate-800 p-3 space-y-2.5">' +
      '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-pl-bg class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Musik im Hintergrund + Benachrichtigungs-Player</span><span class="block text-[11px] leading-4 text-slate-400" data-pl-bgs></span></span></label>' +
      tg('dsp', 'Klang-Voreinstellungen &amp; Musik-Anzeige', 'Bass, Techno, Klassik … und die Effekte am Cover laufen über Web Audio. Falls die Musik bei gesperrtem Bildschirm aussetzt: ausschalten (gilt vollständig nach einem Neustart der App).') +
      tg('viz', 'Equalizer im Player anzeigen', 'Animierte Anzeige, die zur gewählten Voreinstellung passt – in den Farben des Designs.') +
      tg('cvr', 'Cover mit Rahmen und Effekt im Player', 'Wie im Kopfbereich der DAW; Effekt und Stärke stellst du unter „Cover &amp; Tags“ ein.') +
      tg('tags', 'Tags aus den Audiodateien lesen', 'Titel, Künstler, Album, Genre, Jahr und Cover aus der Datei (MP3, M4A, FLAC, OGG/Opus, WAV).') +
      '<button type="button" data-pl-open class="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">🎧 Player öffnen</button>' +
      '<div class="text-[10px] leading-snug text-slate-500">Stoppt die Musik nach längerer Zeit im Hintergrund, in den Android-Einstellungen für die App die Akku-Optimierung auf „Nicht einschränken“ stellen.</div></div>';
    const ck = ph.querySelector('[data-pl-bg]'), st = ph.querySelector('[data-pl-bgs]');
    const paint = () => { ck.checked = on(); ph.querySelectorAll('[data-pl-o]').forEach(c => { c.checked = !!S[c.dataset.plO]; }); st.textContent = native() ? (plug() ? 'Zeigt Titel und Tasten auf Sperrbildschirm und Benachrichtigungsleiste; die Musik läuft bei gesperrtem Bildschirm weiter (gilt für Player und DAW).' : 'In dieser App-Version noch nicht eingebaut – nach dem nächsten App-Update verfügbar.') : 'Nur in der Android-App verfügbar.'; };
    paint();
    ph.addEventListener('change', e => {
      if (e.target === ck) { S.bg = ck.checked; saveS(); if (!S.bg) Media.stop(); else { syncMedia(); dawSoon(); } return; }
      const o = e.target.closest && e.target.closest('[data-pl-o]'); if (!o) return; const k = o.dataset.plO; S[k] = o.checked; saveS();
      if (k === 'dsp') applySound(); if (k === 'tags' && S.tags) scan(); if (k === 'tags' && !S.tags) { /* vorhandene Tags bleiben bis die Liste geleert wird */ }
      if (root) render(true); try { if (SND()) SND().wake(); } catch (_) {}
    });
    ph.addEventListener('click', e => { if (e.target.closest('[data-pl-open]')) { const m = $('settings-modal'); if (m) m.remove(); open(); } });
  }
  SunDOM.mount('pl-sec', ph => section(ph)); SunDOM.on('#file-menu', () => menuItem());
  function boot() {
    menuItem(); hookDaw(); let tries = 0; const iv = SunTick.every(500, () => { menuItem(); hookDaw(); if (($('btn-player') && typeof audioEngine !== 'undefined' && audioEngine.__bg) || ++tries > 30) SunTick.stop(iv); }, { hidden: true });
    const hm = $('hm-player'); if (hm && !hm.__pl) { hm.__pl = 1; hm.onclick = () => open(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot(); restore(); }); else { boot(); restore(); }
  window.addEventListener('pagehide', () => { try { savePos(true); const sn = snapshot(); if (sn) KV.set('session', sn); } catch (_) {} try { if (Media.owner) Media.stop(); } catch (_) {} });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { try { savePos(true); persist(); } catch (_) {} } });

  window.Player = {
    svg, open, close, add: addFiles, play, pause, toggle, shuffle: () => { S.shuffle = !S.shuffle; history = []; saveS(); render(true); }, repeat: () => { S.repeat = S.repeat === 'off' ? 'all' : S.repeat === 'all' ? 'one' : 'off'; saveS(); render(true); }, current: () => { const t = cur(); return t ? { title: t.title, sub: subLine(t), cover: coverOf(t), off: !!t.off } : null; }, next: () => next(false), prev, seek: seekTo, clear, remove,
    toDaw: i => toDaw(i == null ? idx : i), addFolder: addEntries, pickFolder, preset: setPreset, scan, recents: () => recents.map(r => ({ id: r.id, name: r.name, count: r.count, ts: r.ts, handle: !!r.handle, nat: !!r.nat })), restore, _snap: snapshot, _persistNow: async () => { const sn = snapshot(); if (sn) await KV.set('session', sn); savePos(true); },
    _coverUrl: i => (list[i] && list[i].cover) || '',
    list: () => list.map(t => ({ id: t.id, title: t.title, sub: t.sub, artist: t.artist, album: t.album, genre: t.genre, year: t.year, track: t.track, fmt: t.fmt, hasCover: !!t.cover, size: t.size, dur: t.dur, bad: !!t.bad, off: !!t.off, key: t.key })),
    state: () => ({ idx, count: list.length, playing: !au.paused, time: au.currentTime, dur: au.duration, shuffle: S.shuffle, repeat: S.repeat, bg: S.bg, owner: Media.owner, preset: S.preset, dsp: S.dsp, viz: S.viz, cover: !!cvb }),
    /* Zeilen für den Feedback-Bericht: nur technische Angaben, keine Titel/Dateinamen */
    report: () => {
      const t = cur(), L = [], pad = n => String(n).padStart(2, '0'), tm = s => isFinite(s) ? Math.floor(s / 60) + ':' + pad(Math.round(s % 60)) : '–';
      L.push('Liste: ' + list.length + ' Titel' + (idx >= 0 ? ' · aktuell Nr. ' + (idx + 1) : '') + ' · Zufall ' + (S.shuffle ? 'an' : 'aus') + ' · Wiederholen ' + S.repeat);
      if (t) L.push('Titel: ' + (t.fmt || '?') + ' · ' + (t.size ? (t.size / 1048576).toFixed(1) + ' MB' : 'Größe unbekannt') + ' · Dauer ' + tm(t.dur) + ' · Laden: ' + (t.via || 'noch nicht geladen') + (t.bad ? ' · als fehlerhaft markiert' : '') + (t.off ? ' · offline/nicht erreichbar' : ''));
      L.push('Wiedergabe: ' + (au.paused ? 'pausiert' : 'läuft') + ' bei ' + tm(au.currentTime) + ' · Puffer bereit: ' + (au.readyState >= 3 ? 'ja' : 'nein (Status ' + au.readyState + ')') + (au.error ? ' · Medienfehler Code ' + au.error.code : ''));
      L.push('Klang: ' + (S.dsp ? S.preset : 'aus') + ' · Hintergrund-Wiedergabe: ' + (S.bg ? 'an' : 'aus') + ' · Direktweg: ' + (natFast ? 'verfügbar/unbekannt' : 'nicht verfügbar'));
      if (lastErr) L.push('Letzter Fehler: ' + lastErr);
      return L;
    },
    sleep: m => sleepSet(m), sleepState: () => sleep ? { mode: sleep.mode, mins: sleep.mins || 0, left: sleepLeft() } : null, _sleepAt: sec => { if (sleep && sleep.mode === 'time') { sleep.end = Date.now() + sec * 1000; sleepTick(); } },
    audio: au, media: Media, preset: id => setPreset(id), settings: () => Object.assign({}, S), isOpen: () => !!(root && !root.hidden), _dawSync: dawSync, hookDaw
  };
})();
