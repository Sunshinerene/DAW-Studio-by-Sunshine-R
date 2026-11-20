
/* ===== Sunshine@R Stem DAW Studio: Import-Dialog, Undo, Reset ===== */
(() => {
  let ready = false;
  window.addEventListener('load', () => { ready = true; });
  const $ = id => document.getElementById(id);
  const safe = f => { try { f(); } catch (e) { console.warn(e); } };

  /* ---------- Undo ---------- */
  const undoStack = [];
  const SEQ = ['seqKick', 'seqBass', 'seqBassPitch', 'seqHat', 'seqFx'];
  const snap = () => ({
    tracks: JSON.parse(JSON.stringify(dawState.tracks)),
    buffers: { ...dawState.buffers },
    midiNotes: JSON.parse(JSON.stringify(dawState.midiNotes)),
    seq: SEQ.map(k => [...dawState[k]]),
    vel: [...dawState.stepVelocities],
    trim: dawState.startOffsetMs,
    sub: $('status-subtitle').textContent
  });
  const redoStack = [];
  function updateUndoBtn() {
    const b = $('btn-undo'); if (b) b.classList.toggle('opacity-40', undoStack.length === 0);
    const r = $('btn-redo'); if (r) r.classList.toggle('opacity-40', redoStack.length === 0);
  }
  // Neue Aktion → alter „Vor“-Verlauf ist ungültig
  function pushUndo() { if (!ready) return; undoStack.push(snap()); if (undoStack.length > 40) undoStack.shift(); redoStack.length = 0; updateUndoBtn(); }
  window.__dawPushUndo = pushUndo;
  function refreshAll() {
    renumberTracks();
    dawState.tracks.forEach(t => safe(() => audioEngine.ensureTrackNode(t)));
    safe(renderMultiTrackLanes); safe(renderVerticalMixer); safe(updateAudioToMidiDropdown);
    safe(renderDrumSequencerGrids); safe(drawPianoRoll); safe(drawVelocityLane);
    safe(() => audioEngine.syncAudioParams());
    $('lbl-trim-offset').textContent = `${dawState.startOffsetMs} ms`;
    if (dawState.isPlaying) safe(() => audioEngine.seek(dawState.playheadSec));
  }
  function restoreSnap(s) {
    dawState.tracks = s.tracks; dawState.buffers = s.buffers; dawState.midiNotes = s.midiNotes;
    SEQ.forEach((k, i) => { dawState[k] = s.seq[i]; });
    dawState.stepVelocities = s.vel; dawState.startOffsetMs = s.trim;
    const firstMidi = dawState.tracks.find(t => t.type === 'midi');
    dawState.activeMidiTrackId = firstMidi ? firstMidi.id : null;
    $('status-subtitle').textContent = s.sub;
    refreshAll();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) { updateUndoBtn(); toast('Nichts zum Rückgängigmachen.', 'info'); return; }
    redoStack.push(snap()); if (redoStack.length > 40) redoStack.shift();
    updateUndoBtn();
    restoreSnap(s);
    toast('Letzter Schritt rückgängig gemacht.', 'success');
  }
  function redo() {
    const s = redoStack.pop();
    if (!s) { updateUndoBtn(); toast('Nichts zum Wiederherstellen.', 'info'); return; }
    undoStack.push(snap()); if (undoStack.length > 40) undoStack.shift();
    updateUndoBtn();
    restoreSnap(s);
    toast('Schritt wiederhergestellt.', 'success');
  }
  window.__dawUndo = undo; window.__dawRedo = redo;
  ['autoTrimSilence', 'applyArpGenerator', 'extractMidiFromStem'].forEach(n => {
    const orig = window[n];
    if (typeof orig === 'function') window[n] = function (...a) { pushUndo(); return orig.apply(this, a); };
  });
  document.addEventListener('pointerdown', e => {
    const t = e.target;
    if (!(t instanceof Element) || t.closest('input,select,textarea')) return;
    if (t.closest('#piano-roll-canvas, #tab-panel-drums, #btn-clear-midi, .midi-trans-btn, #btn-midi-quantize')) pushUndo();
  }, true);
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.target.closest('input,select,textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
  });

  // + Neue Spur Button & Einzelspur-Audio-Upload verbinden
  const addTrackBtn = $('btn-add-track');
  if (addTrackBtn) addTrackBtn.addEventListener('click', openNewTrackDialog);

  const singleAudioInput = $('single-track-audio-input');
  if (singleAudioInput) {
    singleAudioInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      const targetId = dawState.pendingAudioTargetTrackId;
      dawState.pendingAudioTargetTrackId = null;
      singleAudioInput.value = '';
      if (!f || !targetId) return;
      const tr = dawState.tracks.find(t => t.id === targetId);
      if (!tr) return;
      try {
        await audioEngine.ensureCtx();
        pushUndo();
        const raw = await f.arrayBuffer();
        const decoded = await audioEngine.ctx.decodeAudioData(raw.slice(0));
        dawState.buffers[tr.id] = decoded;
        if (/^Audio Spur/i.test(tr.name)) {
          tr.name = f.name.replace(/.[^/.]+$/, '').slice(0, 28);
        }
        if (/vocal|vox|voice|acap|rap|sing/i.test(f.name)) {
          tr.vocalCleanup = true;
          tr.lowCut = true;
        }
        refreshAll();
        toast(`„${f.name}“ in Spur ${tr.num} geladen!`, 'success');
      } catch (err) {
        console.error(err);
        toast('Audiodatei konnte nicht dekodiert werden.', 'error');
      }
    });
  }

  /* ---------- Reset (komplett leer ohne vordefinierte Spuren) ---------- */
  function resetProject() {
    pushUndo();
    safe(() => { if (dawState.isPlaying) audioEngine.stop(true); });
    if (audioEngine.channelNodes) {
      Object.values(audioEngine.channelNodes).forEach(n => { try { n.fader.disconnect(); } catch (_) {} });
      audioEngine.channelNodes = {};
    }
    dawState.tracks = [];
    dawState.buffers = {};
    dawState.activeMidiTrackId = null;
    dawState.midiNotes = [];
    SEQ.forEach(k => { dawState[k] = new Array(16).fill(0); });
    dawState.stepVelocities = new Array(32).fill(108);
    dawState.startOffsetMs = 0; dawState.playheadSec = 0;
    $('status-subtitle').textContent = 'Leeres Projekt – Spur erstellen oder Datei laden';
    refreshAll();
    safe(updatePlayButtonUI); safe(updateClockLCD);
    toast('Projekt komplett geleert (0 Spuren). „↩ Zurück“ holt alles wieder.', 'success');
  }

  
  const imp = $('btn-import-files');
  const mk = (id, txt, cls, title) => {
    const b = document.createElement('button');
    b.id = id; b.textContent = txt; b.title = title;
    b.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ' + cls;
    imp.parentElement.insertBefore(b, imp); return b;
  };
  mk('btn-undo', '↩ Zurück', 'bg-daw-surface hover:bg-daw-elevated text-slate-200 border-daw-border opacity-40', 'Letzten Schritt rückgängig (Strg+Z)').onclick = undo;
  const br = mk('btn-reset', '🗑 Reset', 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30', 'Projekt auf Null setzen');
  let armed = null;
  br.onclick = () => {
    if (armed) { clearTimeout(armed); armed = null; br.textContent = '🗑 Reset'; resetProject(); return; }
    br.textContent = 'Wirklich leeren?';
    armed = setTimeout(() => { armed = null; br.textContent = '🗑 Reset'; }, 3000);
  };

  /* ---------- Kopfzeile aufgeräumt: Undo kompakt, Rest im Datei-Menü (IDs & Handler bleiben) ---------- */
  (function buildFileMenu() {
    try {
      const undoB = $('btn-undo');
      if (undoB) {
        undoB.innerHTML = '<span class="hb-ic">↩</span><span class="hb-tx"> Zurück</span>'; undoB.setAttribute('aria-label', 'Zurück (rückgängig)');
        const redoB = document.createElement('button');
        redoB.id = 'btn-redo'; redoB.type = 'button'; redoB.title = 'Rückgängig gemachten Schritt wiederherstellen (Strg+Y)';
        redoB.setAttribute('aria-label', 'Vor (wiederherstellen)');
        redoB.className = undoB.className;
        redoB.innerHTML = '<span class="hb-ic">↪</span><span class="hb-tx"> Vor</span>';
        redoB.onclick = redo;
        undoB.after(redoB); updateUndoBtn();
      }
      const hdr = $('hdr-actions'), btn = $('btn-menu');
      if (!hdr || !btn) return;
      const menu = document.createElement('div');
      menu.id = 'file-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
      menu.className = 'bg-slate-950 border border-daw-border rounded-2xl shadow-2xl';
      menu.innerHTML = '<div class="fm-title">Datei &amp; Optionen</div>';
      const put = (el, cls) => { if (!el) return; el.className = 'fm-item ' + (cls || ''); el.setAttribute('role', 'menuitem'); el.removeAttribute('hidden'); menu.appendChild(el); };
      put($('btn-export-midi'));
      put($('btn-settings'));
      const sep = document.createElement('div'); sep.className = 'fm-sep'; menu.appendChild(sep);
      put(br, 'fm-danger');
      document.body.appendChild(menu);
      const hdrEl = document.querySelector('header');
      const place = () => { const r = (hdrEl || hdr).getBoundingClientRect(); menu.style.top = Math.max(0, r.bottom + 6) + 'px'; menu.style.right = '12px'; };
      const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      const open = () => { place(); menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
      btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden ? open() : close(); });
      menu.addEventListener('click', e => {
        if (!e.target.closest('.fm-item')) return;
        // Reset braucht zwei Tipps: beim ersten bleibt das Menü offen
        setTimeout(() => { if (!/Wirklich/.test(br.textContent)) close(); }, 0);
      });
      document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) close(); });
      window.addEventListener('resize', () => { if (!menu.hidden) place(); });
    } catch (err) { console.error('[Datei-Menü]', err); }
  })();

  /* ---------- Schwebende Bottom-Navigation: Dock-Tabs wandern mobil in eine Glas-Leiste (Handler bleiben) ---------- */
  (function buildBottomNav() {
    try {
      const btns = Array.from(document.querySelectorAll('.dock-tab-btn'));
      if (!btns.length) return;
      const group = btns[0].parentElement;
      const SHORT = { midi: ['🎹', 'Editor'], drums: ['🥁', 'Drums'], vocals: ['🎙️', 'Vocal'], mixer: ['🎚️', 'Mixer'] };
      btns.forEach(b => { const s = b.querySelector('span'); if (s) b.dataset.longLabel = s.innerHTML; });
      const nav = document.createElement('nav');
      nav.id = 'bottom-nav'; nav.hidden = true; nav.setAttribute('aria-label', 'Bereiche');
      nav.className = 'bg-slate-950 border border-daw-border shadow-2xl';
      const tr = document.createElement('button');
      tr.type = 'button'; tr.id = 'btn-nav-tracks'; tr.className = 'text-slate-300 border border-transparent transition';
      tr.setAttribute('aria-label', 'Zu den Spuren'); tr.innerHTML = '<span class="nv-ic">🎛️</span><span class="nv-tx">Spuren</span>';
      document.body.appendChild(nav);
      const mq = window.matchMedia('(max-width:760px)');
      const hdrH = () => { const h = document.querySelector('header'); return h ? h.getBoundingClientRect().height : 0; };
      const goTo = el => { if (!el) return; const y = el.getBoundingClientRect().top + window.scrollY - hdrH() - 8; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); };
      const place = () => {
        if (mq.matches) {
          nav.replaceChildren(tr);
          btns.forEach(b => { const s = b.querySelector('span'), sh = SHORT[b.dataset.tab]; if (s && sh) s.innerHTML = '<span class="nv-ic">' + sh[0] + '</span><span class="nv-tx">' + sh[1] + '</span>'; s && (s.style.display = 'contents'); nav.appendChild(b); });
          nav.hidden = false;
        } else {
          btns.forEach(b => { const s = b.querySelector('span'); if (s && b.dataset.longLabel) { s.innerHTML = b.dataset.longLabel; s.style.display = ''; } group.appendChild(b); });
          nav.hidden = true;
        }
      };
      tr.addEventListener('click', () => { const l = $('multitrack-lanes'); goTo(l && (l.closest('section') || l)); });
      btns.forEach(b => b.addEventListener('click', () => {
        setTimeout(() => {
          if (!mq.matches || dawState.dockCollapsed) return;
          const p = $('tab-panel-' + b.dataset.tab); goTo(p && (p.closest('section') || p));
        }, 60);
      }));
      (mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place));
      place();
    } catch (err) { console.error('[Bottom-Nav]', err); }
  })();

  /* ---------- Lokaler OPFS-Zwischenspeicher ---------- */
  const STEM_CACHE_DIR = 'sunshine-stem-cache';
  let stemCacheReady = false;
  let stemCacheDir = null;
  let stemCacheBackend = null; // 'OPFS' oder 'IndexedDB'
  let stemCacheDbPromise = null;

  // IndexedDB ist der Ausweichspeicher, insbesondere wenn die HTML-Datei
  // lokal aus dem Android-Dateimanager (file://) geöffnet wird.
  function openStemCacheDB() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB wird von diesem Browser nicht unterstützt'));
    if (stemCacheDbPromise) return stemCacheDbPromise;
    stemCacheDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('SunshineStemCache', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('stems')) db.createObjectStore('stems', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB konnte nicht geöffnet werden'));
      req.onblocked = () => reject(new Error('IndexedDB ist durch einen anderen Tab blockiert'));
    });
    return stemCacheDbPromise;
  }

  async function cacheStemFileIndexedDB(blob, originalName, sourceName) {
    const db = await openStemCacheDB();
    const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const record = { id, name: originalName, source: sourceName || '', blob, size: blob.size || 0, savedAt: Date.now() };
    await new Promise((resolve, reject) => {
      const tx = db.transaction('stems', 'readwrite');
      tx.objectStore('stems').put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('IndexedDB-Schreibfehler'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB-Speicherung abgebrochen'));
    });
    stemCacheBackend = 'IndexedDB';
    stemCacheReady = true;
    return record;
  }

  async function getStemCacheDir() {
    if (!navigator.storage?.getDirectory) return null;
    if (stemCacheDir) return stemCacheDir;
    try {
      const root = await navigator.storage.getDirectory();
      stemCacheDir = await root.getDirectoryHandle(STEM_CACHE_DIR, { create: true });
      stemCacheReady = true;
      stemCacheBackend = 'OPFS';
      try { await navigator.storage.persist?.(); } catch (_) {}
      return stemCacheDir;
    } catch (err) {
      console.warn('OPFS nicht verfügbar:', err);
      return null;
    }
  }

  function safeCacheName(name) {
    return String(name || 'stem').replace(/[^a-z0-9._-]+/gi, '_').slice(-90) || 'stem';
  }

  async function cacheStemFile(blob, originalName, sourceName) {
    const dir = await getStemCacheDir();
    if (!dir || !blob) return null;
    const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const storedName = `${id}_${safeCacheName(originalName)}`;
    const handle = await dir.getFileHandle(storedName, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(blob);
      await writable.close();
    } catch (err) {
      try { await writable.abort(); } catch (_) {}
      throw err;
    }
    const meta = { name: originalName, source: sourceName || '', storedName, size: blob.size || 0, savedAt: Date.now() };
    try {
      const metaHandle = await dir.getFileHandle(`${id}.json`, { create: true });
      const w = await metaHandle.createWritable();
      await w.write(JSON.stringify(meta));
      await w.close();
    } catch (err) { console.warn('Cache-Metadaten konnten nicht gespeichert werden:', err); }
    return meta;
  }

  async function getStemCacheUsage() {
    try {
      const estimate = await navigator.storage?.estimate?.();
      return estimate ? { usage: estimate.usage || 0, quota: estimate.quota || 0 } : null;
    } catch (_) { return null; }
  }

  async function saveImportItemToCache(item) {
    // Datei zuerst holen und in einen Blob überführen. OPFS ist nur ein Zusatz-Cache:
    // Wenn der Browser-Speicher voll/gesperrt ist, darf dadurch der Import nicht abbrechen.
    const value = await item.get();
    const blob = value instanceof Blob ? value : new Blob([value], {
      type: item.kind === 'midi' ? 'audio/midi' : 'application/octet-stream'
    });
    try {
      const dir = await getStemCacheDir();
      if (dir) {
        await cacheStemFile(blob, item.name, item.src);
        stemCacheBackend = 'OPFS';
        stemCacheReady = true;
      } else {
        await cacheStemFileIndexedDB(blob, item.name, item.src);
      }
    } catch (cacheError) {
      // Falls OPFS zwar vorhanden war, das Schreiben aber scheitert,
      // unmittelbar IndexedDB versuchen. Der Audioimport bleibt unabhängig.
      try {
        await cacheStemFileIndexedDB(blob, item.name, item.src);
      } catch (idbError) {
        console.warn('Lokale Zwischenspeicherung fehlgeschlagen; Import läuft ohne Cache weiter:', cacheError, idbError);
      }
    }
    // AudioDecoder und MIDI-Importer bekommen immer einen ArrayBuffer.
    return await blob.arrayBuffer();
  }

  /* ---------- Import: ZIP / Audio / MIDI ---------- */
  const kindOf = n => /\.(wav|mp3|ogg|flac|m4a|aac)$/i.test(n) ? 'audio' : /\.(mid|midi)$/i.test(n) ? 'midi' : null;
  function guessSlot(name) {
    const l = name.toLowerCase();
    if (/back|bgv|harmon|choir/.test(l)) return null;
    if (/drum|perc|kick|snare|hat/.test(l)) return 'drums';
    if (/bass|808|\bsub/.test(l)) return 'bass';
    if (/vocal|vox|voice|acap|rap|sing/.test(l)) return 'vocals';
    if (/music|instrument|synth|keys|piano|guitar|melod|pad|chord|other/.test(l)) return 'music';
    return null;
  }

  async function readZipNative(file) {
    const buf = await file.arrayBuffer(), dv = new DataView(buf), u8 = new Uint8Array(buf);
    let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Kein gültiges ZIP');
    const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const entries = [];
    for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      entries.push({ method: dv.getUint16(p + 10, true), csize: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true),
        name: new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)) });
      p += 46 + nl + el + cl;
    }
    const read = async en => {
      const ln = dv.getUint16(en.off + 26, true), le = dv.getUint16(en.off + 28, true);
      const st = en.off + 30 + ln + le, data = u8.subarray(st, st + en.csize);
      if (en.method === 0) return data.slice().buffer;
      if (en.method === 8 && window.DecompressionStream)
        return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
      throw new Error('Kompression ' + en.method + ' nicht unterstützt');
    };
    return { entries, read };
  }
  async function readZip(file) {
    // JSZip zuerst verwenden: DecompressionStream('deflate-raw') ist nicht
    // in allen Android-/Browser-Versionen verfügbar bzw. gleich implementiert.
    if (typeof JSZip !== 'undefined') {
      try {
        const z = await JSZip.loadAsync(file), entries = [];
        z.forEach((p, en) => { if (!en.dir) entries.push({ name: p, en }); });
        return { entries, read: x => x.en.async('blob') };
      } catch (jsZipError) {
        console.warn('JSZip konnte ZIP nicht lesen; nativer Fallback:', jsZipError);
      }
    }
    return await readZipNative(file);
  }
  async function collect(files) {
    const items = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        try {
          const zip = await readZip(f); let found = 0;
          zip.entries.forEach(en => {
            if (en.name.endsWith('/') || en.name.includes('__MACOSX')) return;
            const base = en.name.split('/').pop();
            const k = base && !base.startsWith('.') && kindOf(base);
            if (k) { found++; items.push({ name: base, kind: k, src: f.name, get: () => zip.read(en) }); }
          });
          if (!found) toast(`ZIP „${f.name}“ enthält keine WAV/MP3/MIDI. Inhalt: ${zip.entries.slice(0, 4).map(x => x.name).join(', ')}`, 'warn');
        } catch (e) { console.error(e); toast(`ZIP „${f.name}“ nicht lesbar: ${e.message}`, 'error'); }
      } else if (kindOf(f.name)) {
        items.push({ name: f.name, kind: kindOf(f.name), src: '', get: () => Promise.resolve(f) });
      }
    }
    return items;
  }
  async function applyImport(items, sel, mode, useAutoTrim = false) {
    await audioEngine.ensureCtx();
    pushUndo();
    if (mode === 'replace') {
      if (audioEngine.channelNodes) {
        Object.values(audioEngine.channelNodes).forEach(n => { try { n.fader.disconnect(); } catch (_) {} });
        audioEngine.channelNodes = {};
      }
      dawState.tracks = [];
      dawState.buffers = {};
      dawState.midiNotes = [];
      dawState.activeMidiTrackId = null;
    }

    let ok = 0, midi = 0; const failed = [];
    for (const { i, target } of sel) {
      const it = items[i];
      try {
        const raw = await saveImportItemToCache(it);
        if (it.kind === 'midi') {
          let midiTr = (target && target !== 'new-midi')
            ? dawState.tracks.find(t => t.id === target && t.type === 'midi')
            : null;
          if (!midiTr) {
            const cleanName = it.name.replace(/.[^/.]+$/, '').slice(0, 28);
            midiTr = createTrack('midi', cleanName);
          } else {
            selectMidiTrackForEditor(midiTr.id);
          }
          importMidiArrayBuffer(raw);
          syncActiveMidiTrackFromState();
          midi++;
          continue;
        }

        const decoded = await audioEngine.ctx.decodeAudioData(raw.slice(0));
        const cleanName = it.name.replace(/.[^/.]+$/, '').slice(0, 28);
        const looksLikeVocals = /vocal|vox|voice|acap|rap|sing/i.test(it.name);

        let tr = (target && target !== 'new')
          ? dawState.tracks.find(t => t.id === target)
          : null;

        if (!tr) {
          tr = createTrack('audio', cleanName, {
            vocalCleanup: looksLikeVocals,
            lowCut: looksLikeVocals
          });
        } else if (/^Audio Spur/i.test(tr.name)) {
          tr.name = cleanName;
        }

        dawState.buffers[tr.id] = decoded;
        tr.mute = false;
        ok++;
      } catch (e) {
        console.error('Import fehlgeschlagen:', it.name, e);
        failed.push(`${it.name}: ${e?.message || e}`);
      }
    }

    refreshAll();
    if (useAutoTrim && ok > 0) {
      try { autoTrimSilence(); }
      catch (trimError) {
        console.warn('Auto-Trim konnte nicht ausgeführt werden:', trimError);
      }
    }
    $('status-subtitle').textContent = `${dawState.tracks.length} Spur(en) aktiv`;
    toast(ok + midi ? `${ok} Audio-Spur(en), ${midi} MIDI geladen.` : `Keine Datei importiert.`, ok + midi ? 'success' : 'warn');
    if (failed.length) toast(`Importfehler (${failed.length}): ${failed[0].slice(0, 150)}`, 'error');
  }

  function openDialog(items) {
    const ov = document.createElement('div');
    ov.className = 'fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3';
    ov.innerHTML = `<div class="bg-daw-surface border border-daw-border rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl text-slate-200">
      <div class="p-3.5 border-b border-daw-border font-bold text-sm">📂 Laden / Hinzufügen – ${items.length} Datei(en) gefunden</div>
      <div class="p-3.5 flex flex-col gap-1.5 text-xs border-b border-daw-border">
        <label class="flex items-center gap-2"><input type="radio" name="imp-mode" value="add" checked> <b>Hinzufügen</b> – bestehende Spuren bleiben unverändert, Auswahl kommt dazu</label>
        <label class="flex items-center gap-2"><input type="radio" name="imp-mode" value="replace"> <b>Projekt vorher leeren</b> – entfernt vorhandene Spuren vor dem Import</label>
        <label class="flex items-center gap-2 mt-1"><input id="imp-auto-trim" type="checkbox"> <span>✂️ Auto-Trim nach dem Import (optional)</span></label>
      </div>
      <div class="px-3.5 pt-2 flex gap-2 text-xs"><button data-all="1" class="underline text-cyan-300">Alle</button><button data-all="0" class="underline text-cyan-300">Keine</button></div>
      <div id="imp-list" class="p-3.5 overflow-y-auto flex flex-col gap-1"></div>
      <div class="p-3.5 border-t border-daw-border flex justify-end gap-2">
        <button id="imp-cancel" class="px-3 py-1.5 rounded-lg bg-daw-bg border border-daw-border text-xs">Abbrechen</button>
        <button id="imp-ok" class="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">Laden</button>
      </div></div>`;

    const list = ov.querySelector('#imp-list');
    const existingAudio = dawState.tracks.filter(t => t.type === 'audio' || t.type === 'stem' || t.type === 'mic');
    const existingMidi = dawState.tracks.filter(t => t.type === 'midi');

    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 text-xs bg-daw-bg rounded-lg px-2 py-1.5';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.dataset.i = i;
      const nm = document.createElement('span'); nm.className = 'flex-1 truncate';
      nm.textContent = `${it.kind === 'midi' ? '🎹' : '🎵'} ${it.name}${it.src ? '  (' + it.src + ')' : ''}`;
      row.append(cb, nm);

      const s = document.createElement('select');
      s.className = 'bg-daw-surface border border-daw-border rounded px-1.5 py-0.5 max-w-[170px]';
      if (it.kind === 'audio') {
        s.add(new Option('➕ Als neue Audio-Spur', 'new'));
        existingAudio.forEach(tr => s.add(new Option(`→ ${tr.num} | ${tr.name}`, tr.id)));
      } else {
        s.add(new Option('➕ Als neue MIDI-Spur', 'new-midi'));
        existingMidi.forEach(tr => s.add(new Option(`→ ${tr.num} | ${tr.name}`, tr.id)));
      }
      row.append(s);
      list.append(row);
    });

    ov.querySelectorAll('[data-all]').forEach(b => b.onclick = () => list.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = b.dataset.all === '1'));
    const close = () => ov.remove();
    ov.querySelector('#imp-cancel').onclick = close;
    ov.querySelector('#imp-ok').onclick = () => {
      const sel = [...list.children].map(r => ({
        i: +r.querySelector('input').dataset.i,
        on: r.querySelector('input').checked,
        target: r.querySelector('select')?.value || 'new'
      })).filter(s => s.on);
      const mode = ov.querySelector('input[name=imp-mode]:checked').value;
      const useAutoTrim = ov.querySelector('#imp-auto-trim').checked;
      close();
      if (!sel.length) { toast('Nichts ausgewählt.', 'warn'); return; }
      applyImport(items, sel, mode, useAutoTrim);
    };
    document.body.append(ov);
  }

  window.handleUniversalFileImport = async function (fileList) {
    const files = Array.from(fileList || []);
    const input = $('universal-file-input'); if (input) input.value = '';
    if (!files.length) return;
    let items;
    try { items = await collect(files); } catch (e) { toast('Import-Fehler: ' + e.message, 'error'); return; }
    if (!items.length) { toast('Keine Audio- oder MIDI-Dateien gefunden.', 'warn'); return; }
    openDialog(items);
  };
})();
