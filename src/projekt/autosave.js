/* ===== Sunshine@R · Autosave & Wiederherstellung =====
   Sichert den Projektzustand automatisch im Browser-Speicher (IndexedDB, eigene Datenbank – getrennt von „Projekt speichern“).
   Audio-Daten werden nur geschrieben, wenn sich eine Datei geändert hat; Einstellungen/Noten/Clips alle paar Sekunden bei Änderung.
   Beim Start wird eine Wiederherstellung angeboten, solange das aktuelle Projekt leer ist. */
(function () {
  'use strict';
  const DB = 'SunshineAutosave', LS = 'sunshine.autosave', TICK = 8000, FIRST = 2500;
  const $ = id => document.getElementById(id);
  let enabled = true; try { const j = JSON.parse(localStorage.getItem(LS) || '{}'); if (j.on === false) enabled = false; } catch (_) {}
  let dbp = null, baseline = null, lastJson = null, offer = false, lastInfo = null, warnedSize = false;
  const savedBuf = new Map();          /* Spur-ID → AudioBuffer, der zuletzt gesichert wurde */
  const stats = { saves: 0, bufWrites: 0, skipped: 0 };

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let r; try { r = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); if (!d.objectStoreNames.contains('buf')) d.createObjectStore('buf'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('Autosave-Datenbank nicht verfügbar'));
    });
    return dbp;
  }
  function tx(stores, mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction(stores, mode); let out;
      try { out = fn(...[].concat(stores).map(s => t.objectStore(s))); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abgebrochen'));
    }));
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const bufCount = () => Object.values(dawState.buffers || {}).filter(b => b && b.numberOfChannels).length;
  const bytes = () => Object.values(dawState.buffers || {}).reduce((s, b) => s + (b && b.numberOfChannels ? b.length * b.numberOfChannels * 4 : 0), 0);
  function stateJson() { try { return JSON.stringify(window.__projectIO.makePayload({ noBuffers: true }).state); } catch (_) { return null; } }
  const hasContent = () => bufCount() > 0 || (lastJson !== null && baseline !== null && lastJson !== baseline);
  const fmtT = ts => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const mb = n => (n / 1048576 < 10 ? (n / 1048576).toFixed(1) : Math.round(n / 1048576)) + ' MB';
  function emit() { try { document.dispatchEvent(new CustomEvent('sunshine-autosave')); } catch (_) {} const s = $('as-status'); if (s) s.textContent = statusText(); }
  function statusText() {
    if (!enabled) return 'Autosave ist aus.';
    if (offer) return 'Wartet auf deine Entscheidung zur Wiederherstellung.';
    if (!lastInfo) return 'Noch nichts gesichert.';
    if (lastInfo.err) return 'Fehler beim Sichern: ' + lastInfo.err;
    return 'Zuletzt gesichert ' + fmtT(lastInfo.at) + ' · ' + lastInfo.audio + ' Audiospur(en) · ' + mb(lastInfo.size) + (lastInfo.partial ? ' (Audio zu groß – nur Einstellungen)' : '');
  }

  let chain = Promise.resolve(), inflight = 0;
  function saveNow(force) { inflight++; const p = chain.then(() => doSave(force)).finally(() => { inflight--; }); chain = p.catch(() => {}); return p; }
  async function doSave(force) {
    if (!enabled || offer || !window.__projectIO || typeof dawState === 'undefined') return false;
    const json = stateJson(); if (json === null) return false;
    lastJson = json;
    if (!hasContent()) return false;
    const bufs = Object.entries(dawState.buffers || {}).filter(([, b]) => b && b.numberOfChannels);
    const changed = bufs.filter(([id, b]) => savedBuf.get(id) !== b);
    const removed = [...savedBuf.keys()].filter(id => !bufs.some(([i]) => i === id));
    if (!force && !changed.length && !removed.length && lastInfo && lastInfo.json === json) return false;
    try {
      let partial = false, toWrite = changed;
      if (changed.length) {
        let free = Infinity; try { const e = await navigator.storage.estimate(); if (e && e.quota) free = (e.quota - (e.usage || 0)) * 0.85; } catch (_) {}
        const need = changed.reduce((s, [, b]) => { const c = window.__projectIO.compactOf && window.__projectIO.compactOf(b); return s + (c ? c.blob.size : b.length * b.numberOfChannels * 4); }, 0);
        if (need > free) { partial = true; toWrite = []; stats.skipped++; if (!warnedSize) { warnedSize = true; try { toast('Autosave: Für das Audio reicht der Browser-Speicher nicht – gesichert werden nur Einstellungen, Noten und Clips. „Projekt speichern“ bleibt möglich.', 'warn'); } catch (_) {} } }
      }
      for (const [id, b] of toWrite) {                       /* Audio: eine Datei je Transaktion, damit der Speicherbedarf klein bleibt */
        const cs = window.__projectIO.compactOf && window.__projectIO.compactOf(b);   // Original-Datei statt Rohdaten, wenn kleiner
        if (cs) await tx('buf', 'readwrite', s => s.put({ sampleRate: b.sampleRate, length: b.length, src: cs.blob, name: cs.name || '' }, id));
        else { const ch = []; for (let c = 0; c < b.numberOfChannels; c++) ch.push(b.getChannelData(c)); await tx('buf', 'readwrite', s => s.put({ sampleRate: b.sampleRate, length: b.length, channels: ch }, id)); }
        savedBuf.set(id, b); stats.bufWrites++;
      }
      const keep = partial ? [...savedBuf.keys()] : bufs.map(([i]) => i);
      if (!partial) for (const id of removed) { await tx('buf', 'readwrite', s => s.delete(id)); savedBuf.delete(id); }
      const name = ($('status-subtitle') && $('status-subtitle').dataset.projectName) || '';
      const size = bytes();
      const meta = { state: JSON.parse(json), savedAt: Date.now(), name, bufferIds: keep.filter(id => savedBuf.has(id)), audio: bufs.length, size, partial };
      await tx('meta', 'readwrite', s => s.put(meta, 'current'));
      lastInfo = { at: meta.savedAt, audio: bufs.length, size, partial, json }; stats.saves++;
    } catch (e) {
      lastInfo = { err: (e && e.message) || String(e), at: Date.now(), audio: 0, size: 0, json: null };
    } finally { emit(); }
    return !!lastInfo && !lastInfo.err;
  }

  async function readSaved() {
    const meta = await tx('meta', 'readonly', s => s.get('current')); if (!meta) return null;
    return meta;
  }
  async function clear() {
    try { await tx(['meta', 'buf'], 'readwrite', (m, b) => { m.clear(); b.clear(); }); } catch (_) {}
    savedBuf.clear(); lastInfo = null; offer = false; emit();
  }

  async function restore(meta) {
    await audioEngine.ensureCtx();
    if (dawState.isPlaying) audioEngine.stop(true);
    const buffers = {};
    for (const id of meta.bufferIds || []) {
      const rec = await tx('buf', 'readonly', s => s.get(id)); if (rec) buffers[id] = rec;
    }
    await window.__projectIO.restorePayload({ state: meta.state, buffers });
    Object.entries(buffers).forEach(([id]) => { if (dawState.buffers[id]) savedBuf.set(id, dawState.buffers[id]); });
    const st = $('status-subtitle'); if (st && meta.name) { st.textContent = 'Projekt: ' + meta.name; st.dataset.projectName = meta.name; }
    baseline = null; lastJson = stateJson();
  }

  function dialog(meta) {
    const nT = ((meta.state && meta.state.tracks) || []).length, when = new Date(meta.savedAt).toLocaleString('de-DE');
    const ov = document.createElement('div'); ov.id = 'as-offer';
    ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:14px';
    ov.innerHTML = '<div role="dialog" aria-modal="true" style="max-width:420px;width:100%;border-radius:18px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:18px;box-shadow:0 20px 60px #000a;font-family:inherit">' +
      '<div style="font-size:17px;font-weight:800;margin-bottom:6px">♻️ Letzte Sitzung wiederherstellen?</div>' +
      '<div style="font-size:13px;color:#94a3b8;line-height:1.5">Die App wurde zuletzt am <b style="color:#e2e8f0">' + when + '</b> automatisch gesichert' + (meta.name ? ' (Projekt „' + String(meta.name).replace(/[<&]/g, '') + '“)' : '') + ': ' + nT + ' Spur(en), ' + (meta.audio || 0) + ' mit Audio (' + mb(meta.size || 0) + ').' + (meta.partial ? '<br><span style="color:#fbbf24">Hinweis: Das Audio war zu groß für den Autosave – es werden nur Einstellungen, Noten und Clips wiederhergestellt.</span>' : '') + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px"><button data-as="no" style="flex:1;min-height:46px;border-radius:12px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-weight:700">Verwerfen</button><button data-as="yes" style="flex:1.4;min-height:46px;border-radius:12px;border:0;background:#f59e0b;color:#1c1100;font-weight:800">Wiederherstellen</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', async e => {
      const b = e.target.closest('[data-as]'); if (!b) return;
      b.disabled = true; const yes = b.dataset.as === 'yes';
      if (yes) { b.textContent = 'Lädt …'; try { await restore(meta); toast('Letzte Sitzung wiederhergestellt.', 'success'); } catch (err) { console.error(err); toast('Wiederherstellung fehlgeschlagen: ' + err.message, 'error'); } }
      else await clear();
      offer = false; ov.remove(); emit();
    });
  }

  async function checkOffer() {
    if (!enabled) return;
    if (window.Home && window.Home.active && window.Home.active()) return;      /* die Startseite zeigt die letzte Sitzung selbst an */
    let meta; try { meta = await readSaved(); } catch (_) { return; }
    const nowEmpty = bufCount() === 0 && (stateJson() === baseline);
    if (meta && meta.state && nowEmpty && ((meta.audio || 0) > 0 || JSON.stringify(meta.state) !== baseline)) { offer = true; dialog(meta); emit(); }
  }

  async function resume() { const m = await readSaved(); if (!m || !m.state) throw new Error('Keine gesicherte Sitzung vorhanden.'); offer = false; await restore(m); }
  function setEnabled(on) { enabled = !!on; try { localStorage.setItem(LS, JSON.stringify({ on: enabled })); } catch (_) {} if (!enabled) { /* Daten bleiben bis „löschen“ */ } else saveNow(true); emit(); }

  function start() {
    if (!window.__projectIO || typeof dawState === 'undefined') return;
    setTimeout(async () => { baseline = stateJson(); lastJson = baseline; await checkOffer(); }, FIRST);
    setInterval(() => { if (document.hidden) return; if (dawState.isPlaying || dawState.isRecordingMic || inflight) return; saveNow(); }, TICK);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    window.addEventListener('pagehide', () => { saveNow(); });
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-as-clear]')) { if (confirm('Den automatisch gesicherten Zwischenstand löschen? Gespeicherte Projekte bleiben erhalten.')) clear().then(() => toast('Autosave-Zwischenstand gelöscht.', 'success')); } });
  document.addEventListener('change', e => { const t = e.target; if (t && t.dataset && 'autosave' in t.dataset) setEnabled(t.checked); });
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start); else start();

  window.Autosave = { resume, enabled: () => enabled, setEnabled, saveNow, clear, statusText, stats, _peek: readSaved, _restore: restore, _info: () => lastInfo, _offer: () => offer };
})();
