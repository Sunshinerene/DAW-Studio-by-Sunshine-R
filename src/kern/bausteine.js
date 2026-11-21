/* ===== Sunshine@R · Gemeinsame Bausteine (laden vor allen anderen Modulen) =====
   SunUtil  – kleine Helfer, die vorher in fast jedem Modul einzeln standen (esc, clamp, say, safe)
   SunStore – Einstellungen im Browser-Speicher (localStorage), immer abgesichert (Privatmodus, gesperrter Speicher)
   SunIDB   – alle IndexedDB-Datenbanken der App an EINEM Ort (Name, Stores, Öffnen, Transaktionen)
   SunTick  – ein gemeinsamer Taktgeber für wiederkehrende Aufgaben (pausiert im Hintergrund, steht still ohne Aufgaben)
   SunDOM   – ein gemeinsamer Beobachter für „Platzhalter erscheint“ (Optionsmenü-Abschnitte)
   SunLazy  – Bibliotheken erst bei Bedarf nachladen (derzeit: ZIP-Bibliothek JSZip)
   Die Namen der Schlüssel und Datenbanken bleiben unverändert – bestehende Daten werden also ohne Übernahme weiter gefunden. */
(function () {
  'use strict';

  /* ---------- SunUtil ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }, ESCQ = Object.assign({ "'": '&#39;' }, ESC);
  const SunUtil = {
    /** Text für HTML (Inhalt und Attribute in doppelten Anführungszeichen) */
    esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ESC[c]),
    /** wie esc, zusätzlich ' (für Attribute in einfachen Anführungszeichen) */
    escQ: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESCQ[c]),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    /** Meldung zeigen; ohne Toast-Funktion oder bei Fehler still */
    say: (m, k) => { try { if (typeof toast === 'function') toast(m, k || 'info'); } catch (_) {} },
    /** Funktion ausführen, Fehler nur ins Log schreiben; gibt das Ergebnis zurück */
    safe: f => { try { return f(); } catch (e) { console.warn(e); } }
  };

  /* ---------- SunStore ---------- */
  const SunStore = {
    /** Gespeichertes Objekt in o hineinmischen (fehlt es oder ist es kaputt: o bleibt unverändert) */
    merge(o, key) { try { Object.assign(o, JSON.parse(localStorage.getItem(key) || '{}')); } catch (_) {} return o; },
    /** Objekt als JSON speichern */
    save(key, o) { try { localStorage.setItem(key, JSON.stringify(o)); return true; } catch (_) { return false; } },
    /** Text lesen (d, wenn nichts da oder der Speicher gesperrt ist) */
    get(key, d) { try { const v = localStorage.getItem(key); return v == null ? (d === undefined ? null : d) : v; } catch (_) { return d === undefined ? null : d; } },
    set(key, v) { try { localStorage.setItem(key, v); return true; } catch (_) { return false; } },
    del(key) { try { localStorage.removeItem(key); return true; } catch (_) { return false; } },
    /** JSON lesen (d bei fehlendem oder kaputtem Eintrag) */
    json(key, d) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? d : v; } catch (_) { return d; } }
  };

  /* ---------- SunIDB ---------- */
  /* Alle Datenbanken. Version bleibt 1 (so wie bisher), damit vorhandene Daten ohne Umbau weiter gelesen werden.
     stores: Name → Schlüsselfeld (keyPath) oder null (Schlüssel wird beim Schreiben mitgegeben). */
  const DEFS = {
    player:   { name: 'sunshine-player',             stores: { kv: null } },
    stems:    { name: 'SunshineStemCache',           stores: { stems: 'id' } },
    autosave: { name: 'SunshineAutosave',            stores: { meta: null, buf: null } },
    projects: { name: 'SunshineRStemStudioProjects', stores: { projects: 'id' } },
    home:     { name: 'SunshineHome',                stores: { idx: 'id' } },
    fonts:    { name: 'sunshine-soundfonts',         stores: { meta: 'id', data: null } }
  };
  const cache = {};
  const SunIDB = {
    DEFS,
    /** Datenbank öffnen (einmal je Schlüssel, danach dieselbe Verbindung). Schlägt das Öffnen fehl, wird nicht zwischengespeichert. */
    open(key) {
      if (cache[key]) return cache[key];
      const d = DEFS[key];
      const p = new Promise((res, rej) => {
        if (!d) { rej(new Error('Unbekannte Datenbank: ' + key)); return; }
        if (typeof indexedDB === 'undefined') { rej(new Error('IndexedDB ist nicht verfügbar.')); return; }
        let r; try { r = indexedDB.open(d.name, 1); } catch (e) { rej(e); return; }
        r.onupgradeneeded = () => { const db = r.result; Object.keys(d.stores).forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, d.stores[s] ? { keyPath: d.stores[s] } : undefined); }); };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('Datenbank konnte nicht geöffnet werden: ' + d.name));
        r.onblocked = () => rej(new Error('Datenbank ist durch einen anderen Tab blockiert: ' + d.name));
      });
      cache[key] = p; p.catch(() => { if (cache[key] === p) delete cache[key]; });
      return p;
    },
    /** IDBRequest → Promise */
    req: r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
    /** Transaktion → Promise (fertig bei complete) */
    done: t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Speichern abgebrochen.')); }),
    /** Transaktion auf einem oder mehreren Stores; fn bekommt die Stores in der Reihenfolge von `stores`
        und liefert eine Anfrage (IDBRequest) oder nichts. Ergebnis = result dieser Anfrage. */
    tx(key, stores, mode, fn) {
      return SunIDB.open(key).then(db => new Promise((res, rej) => {
        const t = db.transaction(stores, mode); let out;
        try { out = fn(...[].concat(stores).map(s => t.objectStore(s))); } catch (e) { rej(e); return; }
        t.oncomplete = () => res(out && typeof out === 'object' && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abgebrochen'));
      }));
    }
  };


  /* ---------- SunTick ---------- */
  /* EIN gemeinsamer Taktgeber statt vieler einzelner Timer. Raster 250 ms: Aufgaben laufen im Vielfachen davon
     (400 ms → 500 ms, 700 ms → 750 ms …), so wachen alle zur selben Zeit auf und das Gerät kann dazwischen schlafen.
     Im Hintergrund (Seite versteckt) laufen nur Aufgaben mit { hidden: true }; die übrigen holen beim Zurückkehren sofort nach.
     Gibt es nichts zu tun, steht der Takt still. */
  const BASE = 250, tasks = []; let tm = 0, n = 0;
  const live = t => !t.off && (t.hidden || !document.hidden);
  function run(t) { try { t.fn(); } catch (e) { console.warn(e); } }
  function plan() {
    clearTimeout(tm); tm = 0;
    let best = Infinity; tasks.forEach(t => { if (live(t)) best = Math.min(best, t.k - (n % t.k)); });
    if (best === Infinity) return;
    tm = setTimeout(() => { tm = 0; n += best; tasks.slice().forEach(t => { if (live(t) && n % t.k === 0) run(t); }); plan(); }, best * BASE);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tasks.slice().forEach(t => { if (!t.hidden && !t.off) run(t); }); plan(); });
  const SunTick = {
    BASE,
    /** fn alle ms Millisekunden (gerundet auf das 250-ms-Raster, mindestens 250). opts.hidden: auch im Hintergrund. Gibt ein Handle für stop() zurück. */
    every(ms, fn, opts) { const t = { fn, k: Math.max(1, Math.round(ms / BASE)), hidden: !!(opts && opts.hidden), off: false }; tasks.push(t); plan(); return t; },
    /** Takt einer laufenden Aufgabe ändern (z. B. im Leerlauf langsamer) */
    rate(t, ms) { if (!t || t.off) return; const k = Math.max(1, Math.round(ms / BASE)); if (k !== t.k) { t.k = k; plan(); } },
    stop(t) { if (!t || t.off) return; t.off = true; const i = tasks.indexOf(t); if (i >= 0) tasks.splice(i, 1); plan(); },
    /** Anzahl aktiver Aufgaben (für Tests) */
    count: () => tasks.filter(t => !t.off).length
  };

  /* ---------- SunDOM ---------- */
  /* EIN Beobachter für „Platzhalter erscheint“ (Abschnitte im Optionsmenü u. ä.), statt je Modul ein eigener Beobachter über die ganze Seite. */
  const mounts = {}, hooks = []; let mo = null, selAll = '';
  function visit(n) {
    if (n.nodeType !== 1) return;
    if (selAll) {
      const els = n.matches(selAll) ? [n] : []; n.querySelectorAll(selAll).forEach(e => els.push(e));
      els.forEach(e => { const fs = mounts[e.id]; if (fs && !e.dataset.done) { e.dataset.done = '1'; fs.forEach(f => { try { f(e); } catch (x) { console.warn(x); } }); } });
    }
    hooks.forEach(h => { const e = n.matches(h.sel) ? n : n.querySelector(h.sel); if (e) { try { h.fn(e); } catch (x) { console.warn(x); } } });
  }
  function watch() { if (mo) return; mo = new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(visit); }); mo.observe(document.body || document.documentElement, { childList: true, subtree: true }); }
  const SunDOM = {
    /** fn(element), sobald ein Element mit dieser id neu in die Seite kommt – je Element genau einmal */
    mount(id, fn) { (mounts[id] = mounts[id] || []).push(fn); selAll = Object.keys(mounts).map(i => '#' + i).join(','); watch(); },
    /** fn(element), jedes Mal wenn ein neuer Teilbaum das Element (CSS-Selektor) enthält oder ist */
    on(sel, fn) { hooks.push({ sel, fn }); watch(); }
  };

  /* ---------- SunLazy ---------- */
  /* Große Bibliotheken, die nur bei bestimmten Aktionen gebraucht werden, laden nicht mehr beim Start, sondern bei der ersten Nutzung
     (und zusätzlich einmal im Leerlauf kurz nach dem Start, damit der erste Import nicht warten muss).
     SunLazy.zip() → Promise mit JSZip. Erst die lokale Kopie, dann (Browser mit Netz) das CDN als Rückfall. Schlägt beides fehl, kann später erneut versucht werden. */
  const lazy = {};
  function loadScript(url) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.async = true; s.onload = () => res(); s.onerror = () => { s.remove(); rej(new Error('Konnte nicht laden: ' + url)); }; document.head.appendChild(s); }); }
  function lazyOnce(key, urls, ready) {
    if (lazy[key]) return lazy[key];
    const p = (async () => {
      if (ready()) return ready();
      let last = null;
      for (const u of urls) { try { await loadScript(u); if (ready()) return ready(); } catch (e) { last = e; } }
      throw last || new Error('Bibliothek nicht verfügbar: ' + key);
    })();
    lazy[key] = p; p.catch(() => { if (lazy[key] === p) delete lazy[key]; });
    return p;
  }
  const SunLazy = {
    once: lazyOnce,
    zip: () => lazyOnce('jszip', ['assets/vendor/jszip-3.10.1.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'], () => window.JSZip),
    /** Anzahl bisher gestarteter Nachlade-Vorgänge (für Tests) */
    started: () => Object.keys(lazy)
  };
  (function prefetch() {
    const go = () => { try { (window.requestIdleCallback || (f => setTimeout(f, 2500)))(() => { SunLazy.zip().catch(() => {}); }, { timeout: 8000 }); } catch (_) {} };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', () => setTimeout(go, 1500), { once: true });
  })();

  /* ---------- SunPeek: Vorschau beim Einstellen ----------
     Beim Ändern von Design/Effekten soll man die Wirkung auf der echten Oberfläche sehen. Statt das ganze Fenster durchsichtig zu machen
     (Texte laufen dann durcheinander), bleibt NUR die bediente Zeile sichtbar – alles andere wird ausgeblendet. */
  const SunPeek = {
    on(ov, el, ms) {
      try {
        const panel = ov && ov.firstElementChild; if (!panel || !el || !el.getBoundingClientRect) return false;
        const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect(); if (!r.height || !p.height) return false;
        const pad = 10, t = Math.max(0, Math.round(r.top - p.top - pad)), b = Math.max(0, Math.round(p.bottom - r.bottom - pad));
        panel.style.clipPath = 'inset(' + t + 'px 0 ' + b + 'px 0 round 16px)';
        ov.classList.add('peek'); clearTimeout(ov._pk);
        if (ms) ov._pk = setTimeout(() => SunPeek.off(ov), ms);
        return true;
      } catch (_) { return false; }
    },
    off(ov) { try { if (!ov) return; clearTimeout(ov._pk); const panel = ov.firstElementChild; ov.classList.remove('peek'); if (panel) panel.style.clipPath = ''; } catch (_) {} }
  };


  /* ---------- SunPerf ----------
     Leistungs-Wächter für Effekte. Stufe 0 = volle Qualität, 1 = sparsam (Zeichenflächen mit 20 Bildern/s ohne Weichzeichner, Flächen-Effekte stehen still), 2 = minimal (10 Bilder/s, alle Rand-Animationen stehen still).
     Modus „auto“: Solange etwas Aufwendiges läuft (heavy()), misst eine kurze Probe (≈1,8 s alle 20 s) die echte Bildrate; ruckelt es, geht es eine Stufe hoch. Es geht nie von selbst zurück (kein Hin und Her) – ein Neustart oder die Auswahl „Volle Qualität“ setzt zurück.
     Modus „full“ = immer Stufe 0, „eco“ = immer Stufe 1. Der Zustand steht als data-perf am <html>; Module lesen SunPerf.level(). */
  const SunPerf = (() => {
    const KEY = 'sunshine.perf', cfg = { mode: 'auto' }; SunStore.merge(cfg, KEY); if (!['auto', 'full', 'eco'].includes(cfg.mode)) cfg.mode = 'auto';
    let lvl = cfg.mode === 'eco' ? 1 : 0, probing = false, probes = 0, lastAvg = 0; const subs = new Set(), heavy = new Set();
    const html = document.documentElement; html.setAttribute('data-perf', String(lvl));
    const set = l => { l = Math.max(0, Math.min(2, l | 0)); if (l === lvl) return; lvl = l; html.setAttribute('data-perf', String(l)); subs.forEach(f => { try { f(l); } catch (_) {} }); };
    const isHeavy = () => { for (const f of heavy) { try { if (f()) return true; } catch (_) {} } return false; };
    function probe(ms, done) {
      if (probing || document.hidden) return false; probing = true; let n = 0, t0 = 0, last = 0, sum = 0;
      const f = t => { if (last) { sum += t - last; n++; } last = t; if (!t0) t0 = t; if (t - t0 < (ms || 1800) && !document.hidden) requestAnimationFrame(f); else { probing = false; probes++; lastAvg = n ? sum / n : 16.7; if (done) done(lastAvg); } };
      requestAnimationFrame(f); return true;
    }
    function check() { if (cfg.mode !== 'auto' || lvl >= 2 || probing || !isHeavy()) return; probe(1800, avg => { if (avg > 38 && cfg.mode === 'auto') { set(lvl + 1); try { if (typeof toast === 'function') toast('Die Anzeige ruckelte – Effekte wurden sparsamer gestellt (Optionen → Effekte → Leistung).', 'warn'); } catch (_) {} } }); }
    let tk = null;   // der Takt startet erst, wenn sich ein Modul mit aufwendigen Effekten meldet
    return {
      level: () => lvl, mode: () => cfg.mode, avg: () => lastAvg, probes: () => probes,
      setMode(m) { if (!['auto', 'full', 'eco'].includes(m)) return; cfg.mode = m; SunStore.save(KEY, cfg); set(m === 'eco' ? 1 : 0); if (m === 'auto') setTimeout(check, 4000); },
      on(fn) { subs.add(fn); return () => subs.delete(fn); }, heavy(fn) { heavy.add(fn); if (!tk) tk = SunTick.every(20000, check); }, check, probe, _set: set
    };
  })();

  window.SunUtil = SunUtil; window.SunPeek = SunPeek; window.SunPerf = SunPerf; window.SunStore = SunStore; window.SunIDB = SunIDB; window.SunTick = SunTick; window.SunDOM = SunDOM; window.SunLazy = SunLazy;
})();
