/* ===== Sunshine@R · Optionen mit Kategorien =====
   Ordnet das Optionen-Fenster neu: Startübersicht mit 6 Kategorien, jede Kategorie als eigene Seite, dazu eine Suche.
   Die vorhandenen Bereiche werden nur verschoben (nicht neu gebaut) – alle Schalter, Knöpfe und Abläufe bleiben unverändert.
   Automatisierte Tests (navigator.webdriver) bekommen die alte flache Liste, außer localStorage 'sunshine.optnav' = 'on'. */
(function () {
  'use strict';
  const KEY = 'sunshine.optnav';
  const flat = () => { try { const v = localStorage.getItem(KEY); if (v === 'flat') return true; if (v === 'on') return false; } catch (_) {} return !!navigator.webdriver; };
  const svg = p => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const IC = {
    look: '<circle cx="13.5" cy="6.5" r=".6"/><circle cx="17.5" cy="10.5" r=".6"/><circle cx="8.5" cy="7.5" r=".6"/><circle cx="6.5" cy="12.5" r=".6"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
    fx: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>',
    sound: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    perf: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    data: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    next: '<path d="m9 18 6-6-6-6"/>', back: '<path d="m15 18-6-6 6-6"/>', search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'
  };
  const themeName = () => { try { const t = SunshineTheme.themes.find(x => x.id === SunshineTheme.get()); return t ? t.name : ''; } catch (_) { return ''; } };
  const CATS = [
    { id: 'look', title: 'Design & Aussehen', sum: () => 'Design, Farben, Rundung, Icons, Cover, Start-Intro' + (themeName() ? ' · jetzt: ' + themeName() : ''), keys: ['Design', 'Darstellung', 'Anpassen', 'in-sec', 'cv-sec', 'td-sec'], kw: 'untere leiste transport play stopp loop klick wischen cover bild tags titelbild album künstler intro video start startvideo trailer theme farbe akzent hell dunkel rund eckig glas icons emoji transparenz unschärfe große bedienelemente bereiche editor drums vocal mixer fenster tabs' },
    { id: 'fx', title: 'Effekte & Anzeige', sum: () => 'Animationen, Rand-/Flächen-Effekte, Kamera-Abstand', keys: ['fx-sec', 'ly-sec'], kw: 'animation effekt glühen lichtstrahl aurora equalizer funken wellen kamera aussparung notch querformat rand abstand ausrichtung' },
    { id: 'sound', title: 'Klang, KI & Assistent', sum: () => 'Player, Hintergrund-Wiedergabe, SoundFonts, Audio→MIDI-KI, Assistent', keys: ['Klang', 'KI · Audio → MIDI', 'ai-btn', 'Experimentell', 'pl-sec'], kw: 'player hintergrund benachrichtigung sperrbildschirm musik abspielen mp3 wav zip soundfont synth spessasynth basic pitch ki audio midi assistent chat modell sprache sprachsteuerung mikrofon experimentell' },
    { id: 'perf', title: 'Leistung & Speicher', sum: () => { try { const m = Health.memory(); return 'Arbeitsspeicher ≈ ' + m.mb + ' MB · Sparmodus · Speicher-Sparer'; } catch (_) { return 'Arbeitsspeicher, Sparmodus, Speicher-Sparer'; } }, keys: ['hl-sec', 'sv-sec'], kw: 'ram speicher ruckeln langsam sparmodus fehlerprotokoll absturz entladen spuren anzeige-test akku' },
    { id: 'data', title: 'Updates & Datensicherung', sum: () => { try { const b = Update.build(); return (b ? 'Build ' + b + ' · ' : '') + 'Updates, Sicherung, Autosave'; } catch (_) { return 'Updates, Sicherung, Autosave'; } }, keys: ['up-sec', 'Sicherheit'], kw: 'update version build apk live oberfläche was ist neu sicherung backup wiederherstellen zip autosave zwischenstand gerätespeicher' },
    { id: 'help', title: 'Hilfe & Feedback', sum: () => 'Rundgang, Handbuch, Feedback, Vorschau', keys: ['hp-sec', 'fb-sec'], kw: 'anleitung handbuch rundgang tour hilfe feedback fehler melden idee vorschau neu nächstes' }
  ];
  let cur = null, query = '', rest = null, lastScroll = 0, busy = false;

  const isLabel = el => el.tagName === 'DIV' && !el.id && el.children.length === 0 && /uppercase/.test(el.className) && /tracking-wider/.test(el.className);

  function organize(ov) {
    if (flat() || !ov || ov.dataset.on === '1') return;
    const sc = ov.querySelector('[role=dialog]') || ov.firstElementChild; if (!sc) return;
    const kids = [...sc.children]; if (kids.length < 5) return;
    ov.dataset.on = '1'; busy = true;
    const row0 = kids[0], last = kids[kids.length - 1];
    const foot = /border-t/.test(last.className) ? last : null;
    const mid = kids.slice(1, foot ? -1 : undefined);
    // Einheiten bilden: Bereiche mit id (…-sec) oder Überschrift + Inhalt
    const units = []; let u = null;
    mid.forEach(el => {
      if (el.id && /-sec$/.test(el.id)) { units.push({ key: el.id, els: [el] }); u = null; }
      else if (isLabel(el)) { u = { key: el.textContent.trim(), els: [el] }; units.push(u); }
      else if (el.matches && el.matches('button[data-ai-settings]')) { units.push({ key: 'ai-btn', els: [el] }); u = null; }
      else if (u) u.els.push(el);
      else units.push({ key: '?', els: [el] });
    });
    const head = document.createElement('div'); head.id = 'on-head'; head.className = 'on-head';
    sc.insertBefore(head, row0); head.appendChild(row0);
    const nav = document.createElement('div'); nav.id = 'on-nav'; nav.className = 'on-nav'; head.appendChild(nav);
    nav.innerHTML = '<label class="on-search" data-on-s>' + svg(IC.search) + '<input id="on-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Einstellung suchen …" aria-label="Einstellungen durchsuchen"><button type="button" class="on-x" data-on-clear aria-label="Suche leeren" hidden>✕</button></label>'
      + '<div class="on-bar" data-on-b hidden><button type="button" class="on-back" data-on-back aria-label="Zurück zur Übersicht">' + svg(IC.back) + '<span>Optionen</span></button><span class="on-ct" data-on-ct></span></div>';
    const home = document.createElement('div'); home.id = 'on-home'; home.className = 'on-home';
    const pages = document.createElement('div'); pages.id = 'on-pages'; pages.className = 'on-pages';
    const empty = document.createElement('div'); empty.id = 'on-empty'; empty.className = 'on-empty'; empty.hidden = true; empty.textContent = 'Nichts gefunden – probier ein anderes Wort (z. B. „Update“, „Farbe“, „Speicher“).';
    sc.insertBefore(home, foot); sc.insertBefore(pages, foot); sc.insertBefore(empty, foot);
    const used = new Set();
    CATS.forEach(c => {
      const pg = document.createElement('section'); pg.className = 'on-page'; pg.dataset.onPage = c.id; pg.hidden = true;
      pg.innerHTML = '<h3 class="on-ptitle">' + c.title.replace(/&/g, '&amp;') + '</h3>';
      c.keys.forEach(k => { units.forEach((x, i) => { if (x.key !== k || used.has(i)) return; used.add(i); wrap(pg, x, c); }); });
      pages.appendChild(pg);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'on-card'; b.dataset.onGo = c.id;
      b.innerHTML = '<span class="on-ic">' + svg(IC[c.id]) + '</span><span class="on-tx"><b>' + c.title.replace(/&/g, '&amp;') + '</b><i data-on-sum></i></span><span class="on-ch">' + svg(IC.next) + '</span>';
      home.appendChild(b);
    });
    // Unbekannte Bereiche (z. B. künftige Module) landen auf einer Seite „Weiteres“
    const rest2 = units.filter((x, i) => !used.has(i));
    if (rest2.length) {
      const c = { id: 'more', title: 'Weiteres', sum: () => 'Weitere Einstellungen', kw: '' };
      const pg = document.createElement('section'); pg.className = 'on-page'; pg.dataset.onPage = 'more'; pg.hidden = true; pg.innerHTML = '<h3 class="on-ptitle">Weiteres</h3>';
      rest2.forEach(x => wrap(pg, x, c)); pages.appendChild(pg); CATS.push(c);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'on-card'; b.dataset.onGo = 'more';
      b.innerHTML = '<span class="on-ic">' + svg(IC.help) + '</span><span class="on-tx"><b>Weiteres</b><i data-on-sum></i></span><span class="on-ch">' + svg(IC.next) + '</span>'; home.appendChild(b);
    }
    ov.addEventListener('click', e => {
      const go = e.target.closest && e.target.closest('[data-on-go]'); if (go) { show(ov, go.dataset.onGo); return; }
      if (e.target.closest && e.target.closest('[data-on-back]')) { back(); return; }
      if (e.target.closest && e.target.closest('[data-on-clear]')) { query = ''; const i = ov.querySelector('#on-q'); if (i) { i.value = ''; i.focus(); } paint(ov); }
    });
    ov.addEventListener('input', e => { if (e.target && e.target.id === 'on-q') { query = e.target.value; paint(ov); } });
    sc.addEventListener('scroll', () => { lastScroll = sc.scrollTop; }, { passive: true });
    busy = false;
    // Seite wiederherstellen, wenn das Fenster nur neu aufgebaut wurde (z. B. nach Design-Wechsel)
    if (rest && Date.now() - rest.t < 1500 && rest.page && CATS.some(c => c.id === rest.page)) { cur = rest.page; query = ''; paint(ov); sc.scrollTop = rest.scroll || 0; }
    else { cur = null; query = ''; paint(ov); }
    rest = null;
  }
  function wrap(pg, x, c) {
    const w = document.createElement('div'); w.className = 'on-unit'; w.dataset.onKey = x.key; w.dataset.onKw = c.kw || '';
    x.els[0].parentNode.insertBefore(w, x.els[0]); x.els.forEach(el => w.appendChild(el)); pg.appendChild(w);
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function paint(ov) {
    if (!ov || ov.dataset.on !== '1') return;
    const sc = ov.querySelector('[role=dialog]'), nav = ov.querySelector('#on-nav'), home = ov.querySelector('#on-home'), pages = ov.querySelector('#on-pages'), empty = ov.querySelector('#on-empty');
    const q = query.trim().toLowerCase(), searching = !!q;
    const cat = CATS.find(c => c.id === cur);
    // Navigation: Suche (Übersicht) oder Zurück-Leiste (Seite)
    const s = nav.querySelector('[data-on-s]'), bar = nav.querySelector('[data-on-b]'), inp = nav.querySelector('#on-q');
    const onPage = !!cur && !searching;
    s.hidden = onPage; bar.hidden = !onPage;
    nav.querySelector('[data-on-clear]').hidden = !searching;
    if (inp && inp.value !== query) inp.value = query;
    nav.querySelector('[data-on-ct]').textContent = cat ? cat.title : '';
    home.hidden = !!cur || searching;
    home.querySelectorAll('.on-card').forEach(b => { const c = CATS.find(x => x.id === b.dataset.onGo); const el = b.querySelector('[data-on-sum]'); if (c && el) { let t = ''; try { t = c.sum(); } catch (_) {} el.textContent = t; } });
    let hits = 0;
    pages.querySelectorAll('.on-page').forEach(pg => {
      let any = false;
      pg.querySelectorAll('.on-unit').forEach(un => {
        let on = true;
        if (searching) { const hay = (un.textContent + ' ' + un.dataset.onKw + ' ' + pg.querySelector('.on-ptitle').textContent).toLowerCase().replace(/\s+/g, ' '); on = q.split(/\s+/).every(w => hay.indexOf(w) >= 0); }
        un.hidden = !on; if (on) { any = true; hits++; }
      });
      const show = searching ? any : (pg.dataset.onPage === cur);
      pg.hidden = !show; pg.classList.toggle('on-flat', searching);
    });
    empty.hidden = !(searching && !hits);
    pages.hidden = !(cur || searching);
  }
  function show(ov, id) {
    ov = ov || document.getElementById('settings-modal'); if (!ov || ov.dataset.on !== '1') return false;
    if (!CATS.some(c => c.id === id)) return false;
    cur = id; query = ''; paint(ov); const sc = ov.querySelector('[role=dialog]'); if (sc) sc.scrollTop = 0; lastScroll = 0; return true;
  }
  function back() {
    const ov = document.getElementById('settings-modal'); if (!ov || ov.dataset.on !== '1') return false;
    if (!cur && !query) return false;
    cur = null; query = ''; paint(ov); const sc = ov.querySelector('[role=dialog]'); if (sc) sc.scrollTop = 0; lastScroll = 0; return true;
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const ov = document.getElementById('settings-modal'); if (!ov || ov.dataset.on !== '1') return;
    if (back()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  new MutationObserver(ms => {
    if (busy) return;
    for (const m of ms) {
      m.removedNodes.forEach(n => { if (n.nodeType === 1 && n.id === 'settings-modal' && n.dataset.on === '1') rest = { page: cur, scroll: lastScroll, t: Date.now() }; });
      m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ov = n.id === 'settings-modal' ? n : (n.querySelector && n.querySelector('#settings-modal')); if (ov && ov.dataset.on !== '1') setTimeout(() => { try { if (document.body.contains(ov)) organize(ov); } catch (e) { try { console.error('[optnav]', e); } catch (_) {} } }, 0); });
    }
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.OptNav = { open: id => show(null, id), back, home: () => back(), page: () => cur, query: () => query, pages: () => CATS.map(c => c.id), enabled: () => !flat() };
})();
