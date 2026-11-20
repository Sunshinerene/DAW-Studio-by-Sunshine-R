/* ===== Sunshine@R · Updates & Datensicherung =====
   Update: fragt bei GitHub nach der neuesten veröffentlichten APK ("Build N"), vergleicht mit der installierten Build-Nummer
           und öffnet den Download. Installiert wird über die bestehende App → Projekte & Einstellungen bleiben erhalten
           (setzt voraus, dass alle Builds mit demselben Signatur-Schlüssel gebaut wurden – siehe ANLEITUNG-UPDATES.md).
   Sicherung: packt ALLE Projekte, Autosave, Startseiten-Index und Einstellungen (IndexedDB + sunshine.*-Einstellungen) in eine ZIP-Datei
              und stellt sie wieder her (Zusammenführen: gleiche Projekte werden überschrieben, andere bleiben). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const say = (m, k) => { try { if (typeof toast === 'function') toast(m, k || 'info'); } catch (_) {} };
  const LS = 'sunshine.update';
  let U = { auto: true, checked: 0, latest: null, dismissed: 0, dismissedLive: '', weekly: null }; try { Object.assign(U, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (_) {}
  U.weekly = Object.assign({ on: true, last: 0, snooze: 0, pending: false, res: null }, U.weekly || {});
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const saveU = () => { try { localStorage.setItem(LS, JSON.stringify(U)); } catch (_) {} };

  /* ================================================================ Update */
  const B = window.SUNSHINE_BUILD || {};
  const BUILD = /^\d+$/.test(String(B.n || '')) ? +B.n : 0;
  const REPO = /^[\w.-]+\/[\w.-]+$/.test(String(B.repo || '')) ? B.repo : '';
  const isNew = () => !!(U.latest && U.latest.n > BUILD);
  const dateDe = s => { try { return new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (_) { return ''; } };
  async function fetchLatest() {
    if (!REPO) throw new Error('Diese Version kennt ihr GitHub-Repo nicht (Entwicklungsversion). Updates werden nur in der gebauten App geprüft.');
    if (navigator.onLine === false) throw new Error('Keine Internetverbindung.');
    const r = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (r.status === 404) {   // genauer unterscheiden: Repo unsichtbar (privat/falscher Name) oder nur noch keine Release?
      let repoOk = false; try { repoOk = (await fetch('https://api.github.com/repos/' + REPO, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })).ok; } catch (_) {}
      throw new Error(repoOk ? 'Das Repository ' + REPO + ' ist erreichbar, aber es gibt noch keine Release. Prüfe auf GitHub: Actions → letzter Lauf → Schritt „Release veröffentlichen“ (Fehler 403 → Settings → Actions → General → Workflow permissions: Read and write).'
        : 'Das Repository ' + REPO + ' ist von der App aus nicht sichtbar – vermutlich ist es privat. Updates kannst du dann manuell unter Releases laden; für die automatische Suche muss es öffentlich sein.');
    }
    if (!r.ok) throw new Error('GitHub antwortet mit Fehler ' + r.status + '.');
    const j = await r.json(), m = /(\d+)/.exec(j.tag_name || ''), apk = (j.assets || []).find(x => /\.apk$/i.test(x.name || ''));
    const body = String(j.body || ''); let live = null; const mk = /<!--\s*sunshine:(\{[\s\S]*?\})\s*-->/.exec(body); if (mk) { try { live = JSON.parse(mk[1]); } catch (_) {} }
    return { n: m ? +m[1] : 0, tag: j.tag_name || '', name: j.name || '', live, notes: body.replace(/<!--[\s\S]*?-->/g, '').trim().slice(0, 2000), published: j.published_at || '', url: apk ? apk.browser_download_url : j.html_url, page: j.html_url, size: apk ? apk.size : 0 };
  }
  async function check(opts) {
    opts = opts || {};
    try {
      const l = await fetchLatest(); U.latest = l; U.checked = Date.now(); saveU();
      try { document.dispatchEvent(new CustomEvent('sunshine-update', { detail: { available: isNew(), latest: l, build: BUILD } })); } catch (_) {}
      return { ok: true, available: isNew(), latest: l, build: BUILD };
    } catch (e) { return { ok: false, error: e && e.message || String(e), build: BUILD }; }
  }
  function download() {
    const l = U.latest; if (!l) return false;
    try { if (typeof openExternalUrl === 'function') openExternalUrl(l.url); else window.open(l.url, '_blank', 'noopener'); } catch (_) { try { location.href = l.url; } catch (__) {} }
    return true;
  }
  const noteLines = t => String(t || '').split(/\r?\n/).map(x => x.trim()).filter(x => x && !/^#/.test(x)).map(x => x.replace(/^[-*]\s+/, ''));
  const notesHtml = (t, max) => { const L = noteLines(t); if (!L.length) return ''; const sh = max ? L.slice(0, max) : L; return '<ul class="up-notes">' + sh.map(x => '<li>' + esc(x) + '</li>').join('') + (max && L.length > max ? '<li>… und mehr unter „Was ist neu“</li>' : '') + '</ul>'; };
  const liveOffer = () => { try { return (window.Live && U.latest) ? Live.offer(U.latest) : { kind: 'none' }; } catch (_) { return { kind: 'none' }; } };
  function weeklyCard() {
    const w = U.weekly; if (!w.on || !w.pending || Date.now() < (w.snooze || 0)) return '';
    const d = w.last ? Math.floor((Date.now() - w.last) / 864e5) : null;
    return '<div class="hp-new" data-card="wk"><span class="tx"><b>Wöchentliche Sicherung fällig</b><span class="s">' + (d == null ? 'Noch keine Sicherung.' : 'Die letzte ist ' + d + ' Tage alt.') + ' Alle Projekte in eine ZIP-Datei.</span></span><button type="button" data-wk="now">Sichern</button><button type="button" class="no" data-wk="later">Morgen</button></div>';
  }
  function onHome(el) {
    if (!el) return; const l = U.latest, lo = liveOffer(); let h = '';
    if (lo.kind === 'ready') h += '<div class="hp-new" data-card="ready"><span class="tx"><b>Oberfläche ' + esc(lo.v) + ' geladen</b><span class="s">Neu starten, um sie zu nutzen.</span></span><button type="button" data-lv="go">Neu starten</button><button type="button" class="no" data-lv="later">Später</button></div>';
    else if (lo.kind === 'live' && U.dismissedLive !== lo.v) h += '<div class="hp-new" data-card="live"><span class="tx"><b>Neue Oberfläche ' + esc(lo.v) + ' bereit</b><span class="s">Ohne Neuinstallation – deine Projekte bleiben. ' + esc(noteLines(l.notes)[0] || '') + '</span></span><button type="button" data-up="live">Laden</button><button type="button" class="no" data-up="nolive">Später</button></div>';
    else if (isNew() && U.dismissed !== l.n) h += '<div class="hp-new"><span class="tx"><b>Update verfügbar · Build ' + l.n + '</b><span class="s">Installiert ist Build ' + (BUILD || '–') + '. Deine Projekte bleiben erhalten.' + (noteLines(l.notes)[0] ? ' ' + esc(noteLines(l.notes)[0]) : '') + '</span></span><button type="button" data-up="dl">Laden</button><button type="button" class="no" data-up="no">Später</button></div>';
    h += weeklyCard(); try { if (window.News) h += News.card(); } catch (_) {} try { if (window.Preview) h += Preview.card(); } catch (_) {}
    el.innerHTML = h;
    el.onclick = async e => {
      const b = e.target.closest('[data-up],[data-wk],[data-nw],[data-lv],[data-pv]'); if (!b) return;
      const d = b.dataset;
      if (d.pv) { try { Preview.act(d.pv); } catch (_) {} onHome(el); return; }
      if (d.up === 'dl') download();
      else if (d.up === 'no') { U.dismissed = l.n; saveU(); onHome(el); }
      else if (d.up === 'nolive') { U.dismissedLive = lo.v; saveU(); onHome(el); }
      else if (d.up === 'live') { b.disabled = true; b.textContent = 'Lade …'; try { await Live.download(U.latest, {}); } catch (err) { say(err && err.message || String(err), 'warn'); } onHome(el); }
      else if (d.lv === 'go') Live.restart();
      else if (d.lv === 'later') { U.dismissedLive = lo.v; saveU(); onHome(el); }
      else if (d.nw) { try { News.handle(d.nw); } catch (_) {} onHome(el); }
      else if (d.wk === 'now') { b.disabled = true; try { const r = await exportBackup({}); say(r.how === 'cancelled' ? 'Sicherung abgebrochen.' : 'Sicherung gespeichert (' + r.records + ' Datensätze).', r.how === 'cancelled' ? 'info' : 'success'); } catch (err) { say('Sicherung fehlgeschlagen: ' + (err && err.message || err), 'warn'); } onHome(el); }
      else if (d.wk === 'later') { U.weekly.snooze = Date.now() + 864e5; saveU(); onHome(el); }
    };
  }

  /* ================================================================ Sicherung */
  const BASE = /^(SunshineRStemStudioProjects|SunshineHome|SunshineAutosave)$/;
  const idbp = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('IndexedDB-Fehler')); });
  const txdone = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abgebrochen')); });
  async function listDbs() {
    if (indexedDB.databases) { try { return (await indexedDB.databases()).map(d => d.name).filter(Boolean); } catch (_) {} }
    return ['SunshineRStemStudioProjects', 'SunshineHome', 'SunshineAutosave', 'sunshine-soundfonts', 'SunshineStemCache'];
  }
  async function enc(v, zip, ctx, depth) {
    depth = depth || 0; if (depth > 60) throw new Error('Datenstruktur zu tief');
    if (v === undefined) return { $t: 'u' };
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : { $t: 'n', v: String(v) };
    if (typeof v === 'bigint') return { $t: 'bi', v: v.toString() };
    if (v instanceof Date) return { $t: 'd', v: v.getTime() };
    if (v instanceof ArrayBuffer) { const f = 'bin/' + (ctx.n++); zip.file(f, v, { binary: true, compression: 'STORE' }); ctx.bytes += v.byteLength; return { $t: 'ab', f }; }
    if (ArrayBuffer.isView(v)) { const f = 'bin/' + (ctx.n++); zip.file(f, new Uint8Array(v.buffer, v.byteOffset, v.byteLength), { binary: true, compression: 'STORE' }); ctx.bytes += v.byteLength; return { $t: 'ta', k: v.constructor.name, f }; }
    if (typeof Blob !== 'undefined' && v instanceof Blob) { const f = 'bin/' + (ctx.n++); const ab = await v.arrayBuffer(); zip.file(f, ab, { binary: true, compression: 'STORE' }); ctx.bytes += ab.byteLength; return { $t: 'bl', t: v.type || '', f, name: v.name, lm: v.lastModified }; }
    if (Array.isArray(v)) { const o = []; for (const x of v) o.push(await enc(x, zip, ctx, depth + 1)); return o; }
    if (v instanceof Map) { const o = []; for (const [k, x] of v) o.push([await enc(k, zip, ctx, depth + 1), await enc(x, zip, ctx, depth + 1)]); return { $t: 'm', v: o }; }
    if (v instanceof Set) { const o = []; for (const x of v) o.push(await enc(x, zip, ctx, depth + 1)); return { $t: 's', v: o }; }
    if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) { if (typeof v[k] === 'function') continue; o[k] = await enc(v[k], zip, ctx, depth + 1); } return k_esc(o); }
    return null;
  }
  const k_esc = o => (o && Object.prototype.hasOwnProperty.call(o, '$t')) ? { $t: 'o', v: o } : o;   // echtes Feld namens „$t“ schützen
  async function dec(j, zip) {
    if (j === null || typeof j !== 'object') return j;
    if (Array.isArray(j)) { const o = []; for (const x of j) o.push(await dec(x, zip)); return o; }
    if (typeof j.$t === 'string') {
      const bin = async () => { const f = zip.file(j.f); if (!f) throw new Error('Datei fehlt in der Sicherung: ' + j.f); return f.async('arraybuffer'); };
      switch (j.$t) {
        case 'u': return undefined; case 'n': return Number(j.v); case 'bi': return BigInt(j.v); case 'd': return new Date(j.v);
        case 'ab': return bin();
        case 'ta': { const ab = await bin(), C = globalThis[j.k]; return C ? new C(ab) : new Uint8Array(ab); }
        case 'bl': { const ab = await bin(); return (j.name && typeof File !== 'undefined') ? new File([ab], j.name, { type: j.t, lastModified: j.lm }) : new Blob([ab], { type: j.t }); }
        case 'm': { const m = new Map(); for (const [k, x] of j.v) m.set(await dec(k, zip), await dec(x, zip)); return m; }
        case 's': { const s = new Set(); for (const x of j.v) s.add(await dec(x, zip)); return s; }
        case 'o': { const o = {}; for (const k of Object.keys(j.v)) o[k] = await dec(j.v[k], zip); return o; }
      }
    }
    const o = {}; for (const k of Object.keys(j)) o[k] = await dec(j[k], zip); return o;
  }
  const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); };

  async function make(opts) {
    opts = opts || {}; const prog = opts.onProgress || (() => {});
    if (typeof JSZip === 'undefined') throw new Error('Das ZIP-Modul (JSZip) ist nicht geladen.');
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB ist nicht verfügbar.');
    const zip = new JSZip(), ctx = { n: 0, bytes: 0 };
    const names = (await listDbs()).filter(n => opts.all ? true : BASE.test(n));
    const man = { format: 1, app: 'Sunshine@R Stem DAW Studio', build: BUILD, created: new Date().toISOString(), dbs: [], ls: {} };
    let records = 0;
    for (let i = 0; i < names.length; i++) {
      const name = names[i]; prog('Datenbank ' + (i + 1) + '/' + names.length + ': ' + name);
      const db = await idbp(indexedDB.open(name)); const d = { name, version: db.version, stores: [] };
      try {
        const snames = Array.from(db.objectStoreNames);
        for (let j = 0; j < snames.length; j++) {
          const sn = snames[j], t = db.transaction(sn, 'readonly'), s = t.objectStore(sn);
          const sch = { name: sn, keyPath: s.keyPath, autoIncrement: s.autoIncrement, indexes: Array.from(s.indexNames).map(x => { const ix = s.index(x); return { name: ix.name, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; }), count: 0 };
          const keys = await idbp(s.getAllKeys());
          for (let n = 0; n < keys.length; n++) {
            const val = await idbp(db.transaction(sn, 'readonly').objectStore(sn).get(keys[n]));
            const ek = await enc(keys[n], zip, ctx), ev = await enc(val, zip, ctx);
            zip.file('d' + i + '/s' + j + '/' + n + '.json', JSON.stringify({ k: ek, v: ev }), { compression: 'DEFLATE' }); sch.count++; records++;
            if (n % 5 === 0) prog(name + ' · ' + sn + ' ' + (n + 1) + '/' + keys.length);
          }
          d.stores.push(sch);
        }
      } finally { db.close(); }
      man.dbs.push(d);
    }
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^sunshine/i.test(k) && k !== LS) man.ls[k] = localStorage.getItem(k); } } catch (_) {}
    man.records = records; man.binBytes = ctx.bytes;
    zip.file('manifest.json', JSON.stringify(man, null, 1));
    prog('ZIP wird gepackt …');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE', streamFiles: true }, m => prog('Packen ' + Math.round(m.percent) + ' %'));
    return { blob, name: 'Sunshine-Sicherung-' + stamp() + '.zip', records, dbs: man.dbs.length, bytes: blob.size, manifest: man };
  }
  async function exportBackup(opts) {
    const r = await make(opts);
    let how = 'downloaded'; try { if (typeof saveOrShareBlob === 'function') how = await saveOrShareBlob(r.blob, r.name); else { const u = URL.createObjectURL(r.blob), a = document.createElement('a'); a.href = u; a.download = r.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); } } catch (e) { throw new Error('Speichern fehlgeschlagen: ' + (e && e.message || e)); }
    if (how !== 'cancelled') { U.weekly.last = Date.now(); U.weekly.pending = false; saveU(); }
    return Object.assign({ how }, r);
  }
  async function ensureStore(name, d) {
    let db = await new Promise((res, rej) => { const q = indexedDB.open(name, d.version || 1); q.onupgradeneeded = () => mkStores(q.result, d); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); q.onblocked = () => rej(new Error('Datenbank ' + name + ' ist blockiert – App neu starten und erneut versuchen.')); });
    const miss = d.stores.filter(s => !db.objectStoreNames.contains(s.name));
    if (miss.length) { const v = db.version + 1; db.close(); db = await new Promise((res, rej) => { const q = indexedDB.open(name, v); q.onupgradeneeded = () => mkStores(q.result, d); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); q.onblocked = () => rej(new Error('Datenbank ' + name + ' ist blockiert – App neu starten und erneut versuchen.')); }); }
    return db;
  }
  function mkStores(db, d) { d.stores.forEach(s => { if (db.objectStoreNames.contains(s.name)) return; const os = db.createObjectStore(s.name, s.keyPath == null ? { autoIncrement: !!s.autoIncrement } : { keyPath: s.keyPath, autoIncrement: !!s.autoIncrement }); (s.indexes || []).forEach(ix => { try { os.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry }); } catch (_) {} }); }); }
  async function inspect(file) {
    if (typeof JSZip === 'undefined') throw new Error('Das ZIP-Modul (JSZip) ist nicht geladen.');
    let zip; try { zip = await JSZip.loadAsync(file); } catch (_) { throw new Error('Das ist keine gültige ZIP-Datei.'); } const mf = zip.file('manifest.json'); if (!mf) throw new Error('Das ist keine Sunshine-Sicherung (manifest.json fehlt).');
    const man = JSON.parse(await mf.async('string')); if (man.format !== 1 || !Array.isArray(man.dbs)) throw new Error('Unbekanntes Sicherungsformat.');
    return { zip, man };
  }
  async function restore(file, opts) {
    opts = opts || {}; const prog = opts.onProgress || (() => {});
    const { zip, man } = await inspect(file); let n = 0; const total = man.records || man.dbs.reduce((a, d) => a + d.stores.reduce((b, s) => b + s.count, 0), 0);
    for (let i = 0; i < man.dbs.length; i++) {
      const d = man.dbs[i]; const db = await ensureStore(d.name, d);
      try {
        for (let j = 0; j < d.stores.length; j++) {
          const s = d.stores[j];
          for (let k = 0; k < s.count; k++) {
            const f = zip.file('d' + i + '/s' + j + '/' + k + '.json'); if (!f) continue;
            const rec = JSON.parse(await f.async('string')), key = await dec(rec.k, zip), val = await dec(rec.v, zip);
            const t = db.transaction(s.name, 'readwrite'), os = t.objectStore(s.name);
            if (os.keyPath == null) os.put(val, key); else os.put(val);
            await txdone(t); n++; if (n % 3 === 0) prog('Wiederherstellen ' + n + '/' + total);
          }
        }
      } finally { db.close(); }
    }
    let ls = 0; try { Object.keys(man.ls || {}).forEach(k => { if (/^sunshine/i.test(k)) { localStorage.setItem(k, man.ls[k]); ls++; } }); } catch (_) {}
    return { records: n, dbs: man.dbs.length, settings: ls, created: man.created, build: man.build };
  }
  async function storageInfo() {
    const o = { persisted: null, usage: null, quota: null };
    try { if (navigator.storage && navigator.storage.persisted) o.persisted = await navigator.storage.persisted(); } catch (_) {}
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); o.usage = e.usage; o.quota = e.quota; } } catch (_) {}
    return o;
  }
  async function persist() { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (_) {} return false; }
  const mb = b => b == null ? '–' : (b / 1048576 >= 1024 ? (b / 1073741824).toFixed(1) + ' GB' : Math.round(b / 1048576) + ' MB');

  /* ================================================================ Wöchentliche Sicherung */
  const WEEK = 7 * 864e5, SILENT_MAX = 100 * 1048576, DIR = 'SunshineDAW/Sicherung';
  const toB64 = blob => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.onerror = () => rej(f.error || new Error('Lesefehler')); f.readAsDataURL(blob); });
  async function hasData() {
    try {
      if (!indexedDB.databases) return true;
      for (const n of (await listDbs()).filter(x => BASE.test(x))) { const db = await idbp(indexedDB.open(n)); try { for (const sn of Array.from(db.objectStoreNames)) { if ((await idbp(db.transaction(sn, 'readonly').objectStore(sn).count())) > 0) return true; } } finally { db.close(); } }
    } catch (_) { return true; }
    return false;
  }
  const weeklyDue = () => U.weekly.on && Date.now() - (U.weekly.last || 0) > WEEK;
  async function silentSave() {   // still in „Dokumente/SunshineDAW/Sicherung“ ablegen (nur Android-App mit Dateizugriff)
    const cap = window.Capacitor, FS = cap && cap.Plugins && cap.Plugins.Filesystem;
    if (!FS) return { ok: false, why: 'kein Dateizugriff' };
    try { if (typeof dawState !== 'undefined' && dawState.isPlaying) return { ok: false, why: 'busy', quiet: true }; } catch (_) {}
    const st = await storageInfo(); if (st.usage && st.usage > 1.5 * SILENT_MAX) return { ok: false, why: 'zu groß für die stille Sicherung' };
    const r = await make({}); if (r.bytes > SILENT_MAX) return { ok: false, why: 'zu groß für die stille Sicherung' };
    await FS.writeFile({ path: DIR + '/' + r.name, data: await toB64(r.blob), directory: 'DOCUMENTS', recursive: true });
    try {   // nur die letzten 4 behalten
      const d = await FS.readdir({ path: DIR, directory: 'DOCUMENTS' });
      const names = (d.files || []).map(f => typeof f === 'string' ? f : f.name).filter(n => /^Sunshine-Sicherung-.*\.zip$/.test(n)).sort();
      while (names.length > 4) await FS.deleteFile({ path: DIR + '/' + names.shift(), directory: 'DOCUMENTS' });
    } catch (_) {}
    return { ok: true, name: r.name, bytes: r.bytes, records: r.records };
  }
  async function weeklyTick() {
    const w = U.weekly; if (!w.on || !weeklyDue()) return { ran: false };
    if (!(await hasData())) { w.last = Date.now(); w.pending = false; saveU(); return { ran: false, why: 'keine Daten' }; }
    let r; try { r = await silentSave(); } catch (e) { r = { ok: false, why: String(e && e.message || e).slice(0, 80) }; }
    if (r.ok) { w.last = Date.now(); w.pending = false; w.res = { ok: true, name: r.name, bytes: r.bytes, at: Date.now() }; saveU(); say('Wöchentliche Sicherung gespeichert: Dokumente/' + DIR + ' (' + mb(r.bytes) + ')', 'success'); }
    else if (!r.quiet) { w.pending = true; w.res = { ok: false, why: r.why, at: Date.now() }; saveU(); say('Wöchentliche Sicherung ist fällig – siehe Startseite.', 'info'); }
    try { const h = $('hm-update'); if (h && window.Home && Home.isOpen()) onHome(h); } catch (_) {}
    return { ran: true, result: r };
  }

  /* ================================================================ Optionen */
  function section(ph) {
    const ver = BUILD ? 'Build ' + BUILD : 'Entwicklungsversion (Browser)';
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Updates &amp; Datensicherung</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3">
        <div><div class="flex justify-between items-baseline"><span class="text-sm font-semibold">Installierte Version</span><span class="text-xs font-mono text-slate-300" data-up-ver>${ver}</span></div>
          <div class="mt-2 grid grid-cols-2 gap-2"><button type="button" data-up-check class="py-2.5 text-sm font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Nach Updates suchen</button><button type="button" data-nw-open class="py-2.5 text-sm font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Was ist neu?</button></div>
          <div data-up-res class="hidden mt-2 text-[12px] leading-5 text-slate-300"></div></div>
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-up-auto ${U.auto ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Beim Start nach Updates suchen</span><span class="block text-[11px] text-slate-400">Höchstens alle 12 Stunden, nur bei Internet. Es wird nichts ohne dein Zutun installiert.</span></span></label>
        <div data-lv-box class="border-t border-slate-800 pt-3"></div>
        <div class="border-t border-slate-800 pt-3"><div class="text-sm font-semibold">Datensicherung</div><div class="text-[11px] text-slate-400 mb-2">Alle Projekte, der letzte Autosave und deine Einstellungen als eine ZIP-Datei. Mach vorher eine Sicherung, wenn du die App neu installierst.</div>
          <div class="grid grid-cols-2 gap-2"><button type="button" data-bk-make class="py-2.5 text-sm font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Alles sichern</button><button type="button" data-bk-restore class="py-2.5 text-sm font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Wiederherstellen</button></div>
          <input type="file" data-bk-file accept=".zip,application/zip" class="hidden">
          <label class="flex items-center gap-2 mt-2 text-[12px] text-slate-300 cursor-pointer"><input type="checkbox" data-bk-all class="w-4 h-4"> Auch große Zusatzdaten (SoundFonts, Zwischenspeicher)</label>
          <label class="flex items-start gap-3 mt-3 cursor-pointer"><input type="checkbox" data-wk-on ${U.weekly.on ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Wöchentliche Sicherung</span><span class="block text-[11px] text-slate-400" data-wk-info></span></span></label>
          <div data-bk-out class="hidden mt-2 text-[12px] leading-5 text-slate-300 whitespace-pre-wrap"></div></div>
        <div class="border-t border-slate-800 pt-3"><div class="flex justify-between items-baseline"><span class="text-sm font-semibold">Gerätespeicher</span><span class="text-xs font-mono text-slate-300" data-st-info>…</span></div><div class="text-[11px] text-slate-400">Android darf Browser-Daten bei Platzmangel löschen. „Dauerhaft“ schützt davor.</div>
          <button type="button" data-st-persist class="mt-2 w-full py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Speicher dauerhaft schützen</button></div>
      </div>`;
    const res = ph.querySelector('[data-up-res]'), out = ph.querySelector('[data-bk-out]'), info = ph.querySelector('[data-st-info]');
    const showRes = h => { res.innerHTML = h; res.classList.remove('hidden'); }, showOut = t => { out.textContent = t; out.classList.remove('hidden'); };
    const refreshSt = async () => { const s = await storageInfo(); info.textContent = (s.persisted === null ? '' : (s.persisted ? 'dauerhaft · ' : 'nicht geschützt · ')) + mb(s.usage) + ' von ' + mb(s.quota); };
    refreshSt();
    const wkInfo = () => { const w = U.weekly, e = ph.querySelector('[data-wk-info]'); if (!e) return; const cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem; e.textContent = 'Letzte Sicherung: ' + (w.last ? dateDe(w.last) : 'noch keine') + (w.pending ? ' · fällig (siehe Startseite)' : '') + '. ' + (cap ? 'Läuft still im Hintergrund nach Documents/' + DIR + ' (die letzten 4 bleiben). Bei sehr großen Projekten erinnert dich die App stattdessen.' : 'Hier (Browser) erinnert dich die App einmal pro Woche.'); };
    wkInfo();
    try { const box = ph.querySelector('[data-lv-box]'); if (window.Live) Live.mount(box); else box.remove(); } catch (_) {}
    const paintUpdate = r => {
      if (!r.ok) { showRes('<span class="text-amber-300">' + esc(r.error) + '</span>'); return; }
      const lo = liveOffer(), nt = notesHtml(r.latest.notes, 6), apkBtn = (txt) => `<button type="button" data-up-dl class="mt-2 w-full py-2.5 text-sm font-bold rounded-xl ${txt ? 'border border-slate-700 bg-slate-900 text-slate-200' : 'bg-amber-400 text-slate-900'}">${txt || 'Update herunterladen'}</button>`;
      if (lo.kind === 'ready') showRes(`<b class="text-emerald-300">Oberfläche ${esc(lo.v)} ist geladen.</b> Sie wird beim nächsten Start der App aktiv.${nt}<button type="button" data-lv-go class="mt-2 w-full py-2.5 text-sm font-bold rounded-xl bg-amber-400 text-slate-900">Jetzt neu starten</button>`);
      else if (lo.kind === 'live') showRes(`<b class="text-emerald-300">Neue Oberfläche ${esc(lo.v)} verfügbar</b> – ohne Neuinstallation, Projekte bleiben.${nt}<button type="button" data-lv-dl class="mt-2 w-full py-2.5 text-sm font-bold rounded-xl bg-amber-400 text-slate-900">Oberfläche laden</button>${r.available ? apkBtn('Stattdessen komplette APK laden') : ''}`);
      else if (r.available) showRes(`<b class="text-emerald-300">Update verfügbar: Build ${r.latest.n}</b>${r.latest.published ? ' · ' + dateDe(r.latest.published) : ''}${r.latest.size ? ' · ' + mb(r.latest.size) : ''}${nt}Tipp: erst „Alles sichern“. Nach dem Download die Datei öffnen und „Installieren“ wählen – die App wird <b>aktualisiert</b>, deine Projekte bleiben.${apkBtn()}`);
      else showRes('Du hast die neueste Version (Build ' + BUILD + '; veröffentlicht: Build ' + r.latest.n + ').');
    };
    if (isNew() || liveOffer().kind === 'live' || liveOffer().kind === 'ready') paintUpdate({ ok: true, available: isNew(), latest: U.latest });
    ph.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-up-check]')) { t.disabled = true; showRes('Suche …'); paintUpdate(await check()); t.disabled = false; }
      else if (t.matches('[data-up-dl]')) { download(); }
      else if (t.matches('[data-nw-open]')) { try { News.open(); } catch (_) {} }
      else if (t.matches('[data-lv-go]')) { Live.restart(); }
      else if (t.matches('[data-lv-dl]')) { t.disabled = true; showRes('Lade …'); try { const r = await Live.download(U.latest, { onProgress: m => showRes(esc(m)) }); showRes(`<b class="text-emerald-300">Oberfläche ${esc(r.v)} geladen (${mb(r.size)}).</b> Sie wird beim nächsten Start aktiv.<button type="button" data-lv-go class="mt-2 w-full py-2.5 text-sm font-bold rounded-xl bg-amber-400 text-slate-900">Jetzt neu starten</button>`); try { const h = $('hm-update'); if (h) onHome(h); } catch (_) {} } catch (err) { showRes('<span class="text-amber-300">' + esc(err && err.message || err) + '</span>'); t.disabled = false; } }
      else if (t.matches('[data-bk-make]')) {
        t.disabled = true; showOut('Sicherung wird erstellt …');
        try { const r = await exportBackup({ all: ph.querySelector('[data-bk-all]').checked, onProgress: showOut }); showOut(r.how === 'cancelled' ? 'Abgebrochen.' : '✓ Gesichert: ' + r.records + ' Datensätze aus ' + r.dbs + ' Datenbanken (' + mb(r.bytes) + ')\n' + r.name + (r.how === 'downloaded' ? '\nDie Datei liegt im Download-Ordner.' : '')); }
        catch (err) { showOut('Fehler: ' + (err && err.message || err)); }
        t.disabled = false; refreshSt(); wkInfo();
      }
      else if (t.matches('[data-bk-restore]')) ph.querySelector('[data-bk-file]').click();
      else if (t.matches('[data-st-persist]')) { const ok = await persist(); say(ok ? 'Speicher ist jetzt dauerhaft geschützt.' : 'Android hat den Schutz nicht gewährt (er wird oft erst nach häufigerer Nutzung erteilt).', ok ? 'success' : 'info'); refreshSt(); }
    });
    ph.addEventListener('change', async e => {
      const t = e.target;
      if (t.matches('[data-up-auto]')) { U.auto = t.checked; saveU(); }
      else if (t.matches('[data-wk-on]')) { U.weekly.on = t.checked; if (t.checked && !U.weekly.last) U.weekly.last = Date.now(); if (!t.checked) U.weekly.pending = false; saveU(); wkInfo(); }
      else if (t.matches('[data-bk-file]') && t.files && t.files[0]) {
        const f = t.files[0]; t.value = '';
        try {
          showOut('Datei wird gelesen …'); const { man } = await inspect(f);
          const n = man.records || 0, when = man.created ? new Date(man.created).toLocaleString('de-DE') : '?';
          if (!confirm('Sicherung vom ' + when + ' wiederherstellen?\n' + n + ' Datensätze. Gleiche Projekte werden überschrieben, andere bleiben erhalten. Die App lädt danach neu.')) { showOut('Abgebrochen.'); return; }
          const r = await restore(f, { onProgress: showOut });
          showOut('✓ Wiederhergestellt: ' + r.records + ' Datensätze, ' + r.settings + ' Einstellungen. Die App lädt neu …'); setTimeout(() => location.reload(), 1200);
        } catch (err) { showOut('Fehler: ' + (err && err.message || err)); }
      }
    });
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ph = n.id === 'up-sec' ? n : (n.querySelector && n.querySelector('#up-sec')); if (ph && !ph.dataset.done) { ph.dataset.done = '1'; section(ph); } }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  function boot() {
    if (!U.weekly.last) { U.weekly.last = Date.now(); saveU(); }   // erste Sicherung frühestens in 7 Tagen
    setTimeout(weeklyTick, 12000);
    persist();   // stilles Anfordern des dauerhaften Speichers (Android erteilt es oft erst später)
    if (REPO && U.auto && navigator.onLine !== false && Date.now() - (U.checked || 0) > 12 * 3600e3) setTimeout(async () => { const r = await check(); if (r.ok && r.available) { say('Update verfügbar: Build ' + r.latest.n + ' – Optionen → Updates & Datensicherung.', 'info'); try { const h = $('hm-update'); if (h && window.Home && Home.isOpen()) onHome(h); } catch (_) {} } }, 6000);
  }
  window.Update = { build: () => BUILD, repo: () => REPO, check, download, onHome, isNew, weeklyTick, silentSave, weeklyDue, _state: () => Object.assign({}, U), _setWeekly: o => { Object.assign(U.weekly, o); saveU(); }, _notes: notesHtml };
  window.Backup = { make, export: exportBackup, restore, inspect, storageInfo, persist, _enc: enc, _dec: dec };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
