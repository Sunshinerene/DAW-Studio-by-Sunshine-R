/* ===== Sunshine@R · Anleitung =====
   1) Rundgang: leuchtet echte Bedienelemente der App nacheinander an und erklärt sie.
   2) Handbuch: durchsuchbare Kapitel; „Zeig es mir“ startet zu jedem Thema einen kurzen Mini-Rundgang.
   Start: Optionen → Anleitung · ☰ → Anleitung · Startseite → Anleitung (beim ersten Start mit Hinweis-Karte). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const LS = 'sunshine.help';
  let HS = { seen: false }; SunStore.merge(HS, LS);
  const saveHS = () => SunStore.save(LS, HS);
  const { say } = window.SunUtil;
  const ic = n => (window.Icons && Icons.paths[n]) ? `<svg viewBox="0 0 24 24" aria-hidden="true">${Icons.paths[n]}</svg>` : '';
  const shown = e => { if (!e || !e.isConnected || e.hidden) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 2 && r.height > 2 && c.display !== 'none' && c.visibility !== 'hidden'; };
  const q1 = s => { try { return document.querySelector(s); } catch (_) { return null; } };
  const firstShown = (...sels) => { for (const s of sels) { let e = null; try { e = typeof s === 'function' ? s() : document.querySelector(s); } catch (_) {} if (shown(e)) return e; } return null; };

  /* ================================================================== Helfer für Schritte */
  const menuEl = () => $('file-menu'), menuBtn = () => $('btn-menu');
  /* Am Handy sitzen Optionen & Co. in der „Zentrale“ der Dockbar (statt im ☰-Menü) */
  const dockOpts = () => { try { return document.documentElement.classList.contains('tp-dock') ? document.querySelector('#bottom-nav [data-zt=opts]') : null; } catch (_) { return null; } };
  const openMenu = () => { const m = menuEl(), b = menuBtn(); if (m && b && m.hidden) b.click(); };
  const closeMenu = () => { const m = menuEl(), b = menuBtn(); if (m && b && !m.hidden) b.click(); };
  const openWin = k => { try { if (window.DockWin && DockWin.mode !== 'tabs') DockWin.setOpen(k, true, false); else if (typeof switchBottomTab === 'function') switchBottomTab(k); } catch (_) {} };
  const winTarget = k => { const e = firstShown(`.dock-win[data-win="${k}"] > .dock-win-head`, `.dock-tab-btn[data-tab="${k}"]`); try { if (e && e.closest && e.closest('.td-tabs') && window.TpDock) TpDock.go('tabs', true); } catch (_) {} return e; };
  const transportBox = () => { try { window.TpDock && TpDock.reveal(); } catch (_) {} const b = $('btn-play'); return b && b.parentElement; };
  const lcdBox = () => { const l = $('lcd-position'); return l && l.closest('.font-mono'); };
  const brand = () => firstShown('header .brand-banner', '#brand-icon', 'header .brand-mark');

  /* ================================================================== Schritte */
  const S = {
    welcome: { icon: 'sparkles', title: 'Willkommen bei Sunshine@R', text: 'Hier lädst du <b>Suno-Stems</b> (ZIP, WAV, MP3, MIDI), mischst sie, baust Beats und MIDI dazu und exportierst am Ende deinen Song.<br><br>Der Rundgang dauert etwa zwei Minuten und leuchtet die wichtigsten Stellen echt in der App an. Mit <b>Weiter</b> geht es voran, mit <b>Überspringen</b> beendest du ihn jederzeit.' },
    logo: { icon: 'home', title: 'Logo = Startseite', sel: brand, text: 'Ein Tipp aufs Logo bringt dich zur <b>Startseite</b>: Projekte laden, umbenennen, duplizieren oder löschen und ein <b>neues Projekt</b> mit Name, Tempo und Tonart anlegen.' },
    transport: { icon: 'play', title: 'Abspielen', sel: transportBox, text: '<b>Play</b> startet und pausiert (auch mit der <kbd>Leertaste</kbd>), <b>Stopp</b> springt an den Anfang. <b>Loop</b> wiederholt den Loop-Bereich bzw. das Arrangement, <b>Klick</b> schaltet das Metronom dazu.' },
    lcd: { icon: 'timer', title: 'Position, Zeit und Tempo', sel: lcdBox, text: 'Links siehst du die Position als <b>Takt : Schlag : Step</b>, daneben die Zeit und die Gesamtlänge. Rechts steht das <b>Tempo (BPM)</b> – eintippen oder mit <b>TAP</b> im Rhythmus mehrfach antippen.' },
    bar: { icon: 'slidersH', title: 'Werkzeugleiste', sel: '#hdr-actions', text: '<b>Zurück / Vor</b> machen Schritte rückgängig. Daneben: Dateien <b>laden</b>, Projekt <b>speichern</b>, <b>Projekte</b> öffnen, der große <b>Master-WAV</b>-Knopf und das <b>Menü ☰</b>.' },
    load: { icon: 'folderOpen', title: 'Stems laden', sel: '#btn-import-files', text: 'Hier lädst du ein <b>Suno-ZIP</b>, einzelne Audiodateien oder MIDI. Danach schlägt der <b>Import-Assistent</b> vor, wie die Spuren heißen, welche Farbe sie bekommen und wie sie zum Tempo passen.' },
    save: { icon: 'save', title: 'Speichern', sel: '#btn-save-project', text: 'Speichert still unter dem aktuellen Projektnamen (ohne Namen fragt die App einmal nach). Beim Wechsel zur Startseite oder in ein anderes Projekt wird automatisch mitgesichert.' },
    master: { icon: 'download', title: 'Master exportieren', sel: '#btn-export-wav', text: 'Rechnet das ganze Projekt zu einer <b>WAV-Datei</b> zusammen. Stems einzeln, einen Bereich oder Opus findest du im Menü unter <b>Export</b>.' },
    menuBtn: { icon: 'menu', title: 'Das Menü', sel: '#btn-menu', tap: true, tapText: 'Tippe jetzt auf ☰ – oder auf „Weiter“.', text: 'Im Menü liegen die Werkzeuge, die nicht ständig im Weg sein sollen.' },
    menuAll: { icon: 'menu', title: 'Alles Weitere im Menü', sel: '#file-menu', before: openMenu, text: '<b>Startseite</b> · <b>Projekt-Einstellungen</b> · <b>.MID-Export</b> · <b>Export</b> (Stems, Bereich, Format) · <b>Lautheit &amp; Spektrum</b> · <b>Tonart &amp; Tempo</b> · <b>Beat-Slicer</b> · <b>Strukturmarker</b> · <b>Import-Assistent</b> · <b>KI-Assistent</b> · <b>Assistent</b> (Chat) · <b>Optionen</b> · <b>Anleitung</b> (am Handy stattdessen in der Dockbar unter „Zentrale“).' },
    settings: { icon: 'gear', title: 'Optionen', sel: () => dockOpts() || q1('#btn-settings'), before: () => { if (dockOpts()) { closeMenu(); try { TpDock.go('zt', true); } catch (_) {} } else openMenu(); }, text: 'Am Handy: Dockbar nach links wischen bis <b>Zentrale</b> – dort sind auch <b>Feedback</b>, <b>Anleitung</b>, <b>Startseite</b> und <b>Player</b>. Die Optionen sind in <b>Kategorien</b> geordnet (mit Suchfeld oben): Design, Effekte, Klang &amp; KI, Leistung &amp; Speicher, Updates &amp; Sicherung, Hilfe. Auch diese Anleitung startest du von dort.' },
    assist: { icon: 'compass', title: 'Import-Assistent', sel: '#btn-import-assist', before: openMenu, text: 'Nach dem Laden führt er dich durch: <b>Tempo</b> übernehmen, <b>Takt 1</b> ausrichten, <b>Tonart</b> erkennen, <b>Farben nach Rolle</b> und eine <b>Start-Mischung</b>. Du kannst jeden Vorschlag annehmen oder „Später“ wählen.' },
    exportAll: { icon: 'pack', title: 'Export: Stems, Bereich, Format', sel: '#btn-export-all', before: openMenu, text: 'Hier exportierst du alle Stems als <b>ZIP</b>, nur einen <b>Bereich</b> oder im Format <b>Opus</b>. MP3 ist im Browser/der App nicht möglich – Opus ist der kleine, moderne Ersatz.' },
    keytempo: { icon: 'wave', title: 'Tonart &amp; Tempo', sel: '#btn-key-tempo', before: openMenu, text: '<b>Tonart erkennen</b>, Spuren <b>transponieren</b> und das <b>Tempo angleichen</b> (die Tonhöhe bleibt dabei gleich) – praktisch, wenn Stems aus verschiedenen Songs zusammenpassen sollen.' },
    slicer: { icon: 'scissors', title: 'Beat-Slicer', sel: '#btn-slicer', before: openMenu, text: 'Schneidet eine Spur an ihren Schlägen in Pads. Daraus baust du ein neues <b>Pattern</b> (Zufall, rückwärts, Swing) und fügst es als neue Audio-Spur ein.' },
    markers: { icon: 'flag', title: 'Strukturmarker', sel: '#btn-markers', before: openMenu, text: 'Setze Marker (Intro, Drop, …) oder lass die Struktur <b>erkennen</b>. Die Marker erscheinen als Chips über den Spuren und springen beim Antippen dorthin.' },
    loud: { icon: 'chart', title: 'Lautheit &amp; Spektrum', sel: '#btn-loudness', before: openMenu, text: 'Misst die <b>Lautheit (LUFS)</b>, zeigt das <b>Spektrum</b> und hilft dir, den Master mit dem <b>Limiter</b> auf ein Ziel zu bringen.' },
    lanes: { icon: 'slidersV', title: 'Spuren &amp; Arrangement', sel: '#drop-zone-wrapper > .bg-daw-panel', before: closeMenu, text: 'Oben die <b>Arrangement-Leiste</b> mit den Abschnitten (Intro, Verse, Drop …; 4T/8T = Taktlänge, ✎ = bearbeiten). Darunter jede <b>Spur</b> mit ihren Clips. Der orange Strich ist die Abspielposition.' },
    addTrack: { icon: 'plus', title: 'Neue Spur', sel: '#btn-add-track', text: 'Legt eine leere <b>Audio-</b> oder <b>MIDI-Spur</b> an – oder du lädst eine Audiodatei direkt in eine neue Spur.' },
    laneRow: { icon: 'slidersH', title: 'Eine Spur im Detail', sel: () => firstShown('#multitrack-lanes > *'), fallbackCenter: true, text: '<b>M</b> = stumm, <b>S</b> = Solo, Regler = Lautstärke (in dB), <b>FX</b> = Effekt-Rack der Spur, <b>Edit</b> = Clip-Editor (Clips schneiden, verschieben, ein-/ausblenden, Automation), Auswahl = Instrument/Klang, <b>✕</b> löscht die Spur.<br><br><i>Noch keine Spur? Sobald du Stems geladen hast, siehst du das hier an echten Spuren.</i>' },
    win_midi: { icon: 'piano', title: 'MIDI-Editor &amp; Piano Roll', sel: () => winTarget('midi'), before: () => openWin('midi'), text: 'Noten zeichnen, <b>Raster</b> (1/8 – 1/32) und <b>Transponieren</b>, Tonart/Skala mit <b>Quantize Scale</b>, der <b>Arp-/Pattern-Generator</b> (🎲 Auto, ✨ Studio, 🧬 Variation) und der <b>Audio-to-MIDI-Extraktor</b>, der Melodien aus Audio in Noten verwandelt.' },
    win_drums: { icon: 'drum', title: 'Drums, 808 &amp; FX', sel: () => winTarget('drums'), before: () => openWin('drums'), text: '16-Step-Sequencer mit Presets (Techno, Trance, Boom-Bap, Trap), Kick-Synthesizer, <b>Bass/808</b>-Engine sowie <b>FX &amp; Transitions</b> wie Noise Riser, Sub Impact und Rev Crash.' },
    win_vocals: { icon: 'mic', title: 'Vocal-Cleanup &amp; Mikrofon', sel: () => winTarget('vocals'), before: () => openWin('vocals'), text: 'Das <b>Vocal-Rack</b> poliert Suno-Stimmen (an/aus über „Rack“), darunter nimmst du mit dem <b>Mikrofon</b> auf – mit Vorzähler.' },
    win_mixer: { icon: 'slidersV', title: 'Mixer &amp; Master', sel: () => winTarget('mixer'), before: () => openWin('mixer'), text: 'Alle Kanäle als Fader mit Pegel, dazu <b>Busse</b> und der <b>Master-Ausgang</b> mit Spitzenpegel.' },
    nav: { icon: 'menu', title: 'Untere Leiste', sel: () => firstShown('#bottom-nav'), before: () => { closeMenu(); try { TpDock.go('tp', true); } catch (_) {} }, text: 'Am Handy liegt hier der <b>Transport</b> (Play, Stopp, Loop, Klick). <b>Wische nach links</b> (oder tippe einen der kleinen Punkte unten) zu <b>Spuren</b>, <b>Editor</b>, <b>Drums</b>, <b>Vocal</b> und <b>Mixer</b>, dann zur <b>Player-Steuerung</b> und ganz rechts zur <b>Zentrale</b> (Startseite, DAW, Player, Feedback, Optionen, Anleitung) – und wieder zurück.', skipIfMissing: true },
    done: { icon: 'check', title: 'Geschafft!', text: 'Du kennst jetzt die wichtigsten Stellen. Mehr Details, Tipps und Hilfe bei Problemen findest du im <b>Handbuch</b>: <b>☰ → Anleitung</b> oder <b>Optionen → Anleitung</b>. Dort startet jedes Kapitel auf Wunsch einen kurzen Mini-Rundgang.', last: true }
  };
  const TOURS = {
    rundgang: ['welcome', 'logo', 'transport', 'lcd', 'bar', 'load', 'save', 'master', 'menuBtn', 'menuAll', 'settings', 'lanes', 'addTrack', 'laneRow', 'nav', 'win_midi', 'win_drums', 'win_vocals', 'win_mixer', 'done'],
    import: ['load', 'assist'], projects: ['logo', 'save'], lanes: ['lanes', 'addTrack', 'laneRow'], midi: ['win_midi'], drums: ['win_drums'], vocals: ['win_vocals'], mixer: ['win_mixer', 'loud'],
    tools: ['keytempo', 'slicer', 'markers'], export: ['master', 'exportAll'], design: ['settings'], transport: ['transport', 'lcd']
  };

  /* ================================================================== Rundgang-Motor */
  const T = { open: false, steps: [], i: 0, root: null, snap: null, menuWasOpen: false, raf: 0, tapOff: null, mini: false };
  function startTour(id) {
    const ids = Array.isArray(id) ? id : (TOURS[id] || TOURS.rundgang);
    closeManual(true);
    try { document.getElementById('settings-modal') && document.getElementById('settings-modal').remove(); } catch (_) {}
    try { if (window.Home && Home.isOpen && Home.isOpen()) Home.close(); } catch (_) {}
    if (T.open) endTour(true);
    T.steps = ids.map(k => Object.assign({ key: k }, S[k])).filter(Boolean); T.i = 0; T.open = true; T.mini = !(ids === TOURS.rundgang);
    T.menuWasOpen = !!(menuEl() && !menuEl().hidden);
    try { T.snap = (window.DockWin && DockWin.state) ? JSON.parse(JSON.stringify(DockWin.state.open)) : null; } catch (_) { T.snap = null; }
    build(); HS.seen = true; saveHS();
    window.scrollTo(0, 0);
    go(0);
  }
  function build() {
    const r = document.createElement('div'); r.id = 'hp-tour'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', 'Rundgang');
    r.innerHTML = `<div class="hp-b" data-b="t"></div><div class="hp-b" data-b="b"></div><div class="hp-b" data-b="l"></div><div class="hp-b" data-b="r"></div><div class="hp-b" data-b="h"></div><div class="hp-ring" hidden></div>
      <div class="hp-card" aria-live="polite"><div class="hp-h"><span class="ic-i"></span><h3></h3><button type="button" class="hp-x" data-act="skip" aria-label="Rundgang beenden">✕</button></div><div class="hp-t"></div><div class="hp-tap" hidden></div>
      <div class="hp-nav"><button type="button" class="hp-btn" data-act="back">←</button><div class="hp-bar"><i></i></div><span class="hp-cnt"></span><button type="button" class="hp-btn pri" data-act="next">Weiter</button></div></div>`;
    r.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; if (a === 'next') next(); else if (a === 'back') back(); else if (a === 'skip') endTour(false); });
    document.body.appendChild(r); T.root = r;
    window.addEventListener('resize', relayout); window.addEventListener('orientationchange', relayout); window.addEventListener('scroll', relayout, true);
  }
  function relayout() { if (!T.open) return; cancelAnimationFrame(T.raf); T.raf = requestAnimationFrame(place); }
  function next() { if (T.i >= T.steps.length - 1) endTour(true); else go(T.i + 1); }
  function back() { if (T.i > 0) go(T.i - 1, -1); }
  function go(i, dir) {
    if (T.tapOff) { T.tapOff(); T.tapOff = null; }
    T.i = i; const st = T.steps[i];
    /* before() erst nach dem aktuellen Klick ausführen – sonst schließt der „Klick außerhalb“-Handler des Menüs es sofort wieder */
    setTimeout(() => {
      if (!T.open || T.i !== i) return;
      try { if (st.before) st.before(); else if (!/menu|settings|assist|exportAll|keytempo|slicer|markers|loud/i.test(st.key)) closeMenu(); } catch (_) {}
      setTimeout(() => {
        if (!T.open || T.i !== i) return;
        const el = resolve(st);
        if (!el && st.skipIfMissing && T.steps[i + (dir || 1)]) { go(i + (dir || 1), dir); return; }
        fill(st); place(); armTap(st, el);
      }, st.before ? 140 : 30);
    }, 0);
  }
  const resolve = st => { if (!st.sel) return null; if (typeof st.sel === 'function') { try { const e = st.sel(); return shown(e) ? e : null; } catch (_) { return null; } } const e = q1(st.sel); return shown(e) ? e : null; };
  function fill(st) {
    const c = T.root.querySelector('.hp-card');
    c.querySelector('.ic-i').innerHTML = ic(st.icon || 'sparkles');
    c.querySelector('h3').innerHTML = st.title; c.querySelector('.hp-t').innerHTML = st.text;
    const tp = c.querySelector('.hp-tap'); tp.hidden = !st.tap; if (st.tap) tp.textContent = st.tapText || 'Tippe auf das markierte Element.';
    c.querySelector('[data-act="back"]').disabled = T.i === 0;
    const nx = c.querySelector('[data-act="next"]'); nx.textContent = st.last || T.i === T.steps.length - 1 ? 'Fertig' : 'Weiter';
    c.querySelector('.hp-bar i').style.width = ((T.i + 1) / T.steps.length * 100) + '%'; c.querySelector('.hp-cnt').textContent = (T.i + 1) + '/' + T.steps.length;
    c.scrollTop = 0;
  }
  function place() {
    if (!T.open) return; const st = T.steps[T.i]; let el = resolve(st);
    const vw = window.innerWidth, vh = window.innerHeight, card = T.root.querySelector('.hp-card'), ring = T.root.querySelector('.hp-ring');
    const B = k => T.root.querySelector(`[data-b="${k}"]`); const setB = (k, x, y, w, h) => { const b = B(k); b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = Math.max(0, w) + 'px'; b.style.height = Math.max(0, h) + 'px'; };
    if (el) {
      const r0 = el.getBoundingClientRect(); const tall = r0.height > vh * .55;
      if (r0.top < 8 || r0.bottom > vh - 8) { try { el.scrollIntoView({ block: tall ? 'start' : 'center' }); } catch (_) {} }
      /* Passt die Karte weder unter noch über das Element (z. B. eine hohe Spur), wird das Element nach oben geschoben, damit darunter Platz bleibt */
      else if (!tall) { const need = card.offsetHeight + 26, rr = el.getBoundingClientRect(); if (rr.bottom + need > vh && rr.top - need < 0 && rr.top > 12) { try { window.scrollBy(0, rr.top - 12); } catch (_) {} } }
    }
    if (!el) { ring.hidden = true; setB('t', 0, 0, vw, vh); ['b', 'l', 'r', 'h'].forEach(k => setB(k, 0, 0, 0, 0)); card.style.top = Math.max(16, (vh - card.offsetHeight) / 2) + 'px'; card.style.bottom = 'auto'; return; }
    const r = el.getBoundingClientRect(), pad = 6, x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad), w = Math.min(vw - x, r.width + pad * 2), h = Math.min(vh - y, r.height + pad * 2);
    ring.hidden = false; ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.style.width = w + 'px'; ring.style.height = h + 'px';
    try { ring.style.borderRadius = Math.min(26, parseFloat(getComputedStyle(el).borderTopLeftRadius) + pad || 14) + 'px'; } catch (_) {}
    setB('t', 0, 0, vw, y); setB('b', 0, y + h, vw, vh - y - h); setB('l', 0, y, x, h); setB('r', x + w, y, vw - x - w, h);
    const hole = B('h'); if (st.tap) setB('h', 0, 0, 0, 0); else setB('h', x, y, w, h); hole.style.background = 'transparent';
    const ch = card.offsetHeight, below = vh - (y + h), above = y;
    card.style.bottom = 'auto';
    if (below >= ch + 14) card.style.top = (y + h + 12) + 'px';
    else if (above >= ch + 14) card.style.top = (y - ch - 12) + 'px';
    else card.style.top = Math.max(10, vh - ch - 12) + 'px';
  }
  function armTap(st, el) {
    if (!st.tap || !el) return;
    const f = () => setTimeout(() => { if (T.open && T.steps[T.i] === st) next(); }, 380);
    el.addEventListener('click', f, true); T.tapOff = () => el.removeEventListener('click', f, true);
  }
  function endTour(finished) {
    if (!T.open) return; T.open = false; if (T.tapOff) { T.tapOff(); T.tapOff = null; }
    window.removeEventListener('resize', relayout); window.removeEventListener('orientationchange', relayout); window.removeEventListener('scroll', relayout, true);
    if (T.root) { T.root.remove(); T.root = null; }
    if (!T.menuWasOpen) closeMenu();
    try { if (T.snap && window.DockWin) Object.keys(T.snap).forEach(k => DockWin.setOpen(k, !!T.snap[k], false)); } catch (_) {}
    try { window.scrollTo(0, 0); } catch (_) {}
    if (finished) say(T.mini ? 'Fertig.' : 'Rundgang abgeschlossen – das Handbuch findest du unter ☰ → Anleitung.', 'success');
  }

  /* ================================================================== Handbuch */
  const tip = t => `<div class="hp-tip">${ic('bulb')}<div>${t}</div></div>`;
  const warn = t => `<div class="hp-tip hp-warn">${ic('alert')}<div>${t}</div></div>`;
  const show = (label, tour) => `<button type="button" class="hp-show" data-tour="${tour}">${ic('play')}${label || 'Zeig es mir'}</button>`;
  const CH = [
    { id: 'start', icon: 'play', title: 'Schnellstart', sum: 'Vom Stem zum fertigen Song in sechs Schritten', body: `
      <ol><li><b>Projekt anlegen:</b> Startseite → <b>Neues Projekt</b>. Name, Tempo und Tonart kannst du gleich setzen – und später ändern.</li>
      <li><b>Stems laden:</b> <b>ZIP / Audio / MIDI</b> antippen und dein Suno-ZIP oder einzelne Dateien wählen. Der <b>Import-Assistent</b> schlägt Tempo, Tonart, Farben und eine Start-Mischung vor.</li>
      <li><b>Anhören:</b> <b>Play</b> (oder <kbd>Leertaste</kbd>). Mit <b>Loop</b> hörst du einen Abschnitt wiederholt.</li>
      <li><b>Mischen:</b> pro Spur <b>M</b> (stumm), <b>S</b> (Solo) und Lautstärke; feiner im <b>Mixer</b>.</li>
      <li><b>Speichern:</b> 💾 sichert unter dem Projektnamen.</li>
      <li><b>Exportieren:</b> <b>Master WAV</b> oben rechts.</li></ol>
      ${tip('Fehler passiert? <b>Zurück</b> (links oben) macht fast alles rückgängig, <b>Vor</b> stellt es wieder her.')}${show('Rundgang starten', 'rundgang')}` },
    { id: 'projekte', icon: 'folder', title: 'Startseite &amp; Projekte', sum: 'Anlegen, laden, umbenennen, duplizieren, löschen', body: `
      <h4>Neues Projekt</h4><p>Name, Tempo (BPM), Tonart und Skala, MIDI-Raster, Arrangement (kurz 16, normal 24 oder lang 48 Takte), Klick, Loop, Design und eine Notiz. Als Start wählst du „leer“, „Stems laden“ oder „MIDI-Spur“.</p>
      <h4>Später ändern</h4><p><b>☰ → Projekt-Einstellungen</b> öffnet dieselben Felder. Dort gibt es auch <b>Speichern unter …</b>.</p>
      <h4>Die Projektliste</h4><ul><li>Tippen öffnet das Projekt.</li><li><b>⋯</b> an der Karte: <b>Umbenennen</b>, <b>Duplizieren</b>, <b>Löschen</b> (mit Rückfrage).</li><li>Oben steht <b>Weiter: …</b> bzw. <b>Letzte Sitzung fortsetzen</b>.</li></ul>
      <h4>Speichern</h4><p>💾 speichert still. Beim Wechsel zur Startseite, in ein anderes oder neues Projekt wird automatisch gesichert. Zusätzlich sichert der <b>Autosave</b> zwischendurch.</p>
      <p>Die Startseite kannst du mit <b>„Beim Start anzeigen“</b> ausschalten; du erreichst sie immer über das <b>Logo</b> oder <b>☰ → Startseite</b>.</p>
      ${warn('Jedes Projekt speichert seine Audiodaten auf dem Gerät. Viele große Projekte können den Speicher füllen – lösche nicht mehr benötigte.')}${show('Zeig es mir', 'projects')}` },
    { id: 'import', icon: 'inbox', title: 'Laden &amp; Import', sum: 'ZIP, Audio, MIDI und der Import-Assistent', body: `
      <p><b>ZIP / Audio / MIDI</b> nimmt Suno-ZIPs, einzelne Audiodateien und MIDI-Dateien. Jede Datei wird eine Spur; ZIPs werden entpackt.</p>
      <h4>Import-Assistent</h4><p>Erscheint nach dem Laden (oder über <b>☰ → Import-Assistent</b>). Er zeigt <b>Tempo</b>, hilft bei <b>Takt 1</b>, erkennt die <b>Tonart</b>, färbt Spuren <b>nach Rolle</b> und kann eine <b>Start-Mischung</b> setzen. Mit <b>Übernehmen</b> wendest du es an, mit <b>Später</b> lässt du es.</p>
      ${tip('Klingt das Tempo nicht passend, probiere <b>☰ → Tonart &amp; Tempo</b>: Tempo erkennen oder angleichen, ohne dass die Tonhöhe kippt.')}${show('Zeig es mir', 'import')}` },
    { id: 'spuren', icon: 'slidersH', title: 'Spuren, Clips &amp; Arrangement', sum: 'Spurzeile, Arrangement-Leiste, Loop', body: `
      <h4>Spurzeile</h4><ul><li><b>M / S</b>: stumm / Solo.</li><li><b>Regler</b>: Lautstärke in dB (im Querformat auch Pan).</li><li><b>FX</b>: Effekt-Rack der Spur; die Zahl zeigt, wie viele Effekte aktiv sind.</li><li><b>Edit</b>: Clip-Editor.</li><li>Auswahl rechts: Instrument bzw. Klang; <b>Aktiv</b> schaltet die Spur ein/aus.</li><li><b>✕</b>: Spur löschen (mit Zurück rückgängig zu machen).</li></ul>
      <h4>Arrangement-Leiste</h4><p>Abschnitte wie Intro, Verse, Drop, Break, Outro. <b>4T / 8T</b> schaltet die Länge eines Abschnitts um, <b>✎</b> bearbeitet sie. <b>Loop: AN</b> folgt dem Arrangement bzw. dem Loop-Bereich.</p>
      <h4>Clip-Editor (Edit)</h4><p>Zwei Modi: <b>Clips</b> und <b>Automation</b>.</p><ul><li><b>Verschieben</b>: Clip antippen, ziehen; zwei Finger zoomen.</li><li><b>Zuschneiden</b>: Rand ziehen – der Clip wird nur verdeckt, nicht gelöscht.</li><li><b>Teilen</b>: auf den Clip tippen.</li><li><b>Schleife</b>: rechten Rand über das Ende ziehen.</li><li>Pegel, Ein- und Ausblenden (Fades) pro Clip über die Regler.</li><li><b>Automation</b>: Lautstärke, Pan und Filter als Kurve; Punkte setzen, ziehen, löschen.</li></ul>
      <p>Die Hinweiszeile unten im Editor erklärt immer das gerade aktive Werkzeug.</p>${show('Zeig es mir', 'lanes')}` },
    { id: 'transport', icon: 'timer', title: 'Abspielen, Tempo &amp; Klick', sum: 'Play, Loop, Metronom, BPM, TAP', body: `
      <ul><li><b>Play / Pause</b> auch mit <kbd>Leertaste</kbd>; <b>Stopp</b> springt zum Anfang.</li><li><b>Loop</b> wiederholt Arrangement bzw. Loop-Bereich.</li><li><b>Drei Seiten</b> in der unteren Leiste (Handy): Transport, Bereiche und <b>Player</b> – nach links/rechts wischen. Spielt der Player, springt die Leiste zur Player-Seite, startet die DAW, zurück zum Transport. Unter <b>Optionen → Untere Leiste</b> gibt es „Tasten passend zum Leistenstil“ und „Scrollbalken anzeigen“.</li><li><b>Leistenstil</b>: Unter <b>Optionen → Untere Leiste</b> wählst du „Wie das Design“, „Glas“, „Flach“, „Leuchtend“ oder „Dezent“ – gilt auch für die Dockbar des Players.</li><li><b>Klick</b> = Metronom.</li><li><b>Am Handy</b> liegen Play, Stopp, Loop und Klick in der <b>unteren Leiste</b>. Wische dort nach links (oder tippe einen der kleinen Punkte unten) zu Spuren · Editor · Drums · Vocal · Mixer, nach rechts zurück zum Transport. Optionen → Design &amp; Aussehen → Untere Leiste: abschaltbar, dann liegt der Transport wieder oben.</li><li><b>BPM</b> (60–180) eintippen oder mit <b>TAP</b> mehrfach im Takt tippen.</li><li>Die Anzeige zeigt Takt : Schlag : Step sowie Zeit und Länge.</li><li><kbd>Strg</kbd>+<kbd>Z</kbd> / <kbd>Strg</kbd>+<kbd>Y</kbd> machen rückgängig/wiederherstellen (Tastatur).</li></ul>${show('Zeig es mir', 'transport')}` },
    { id: 'midi', icon: 'piano', title: 'MIDI-Editor &amp; Piano Roll', sum: 'Noten, Skalen, Generatoren, Audio-to-MIDI', body: `
      <h4>Großansicht &amp; Werkzeug-Gruppen</h4><ul><li>Klavier/Piano Roll, Drums, Vocal und Mixer öffnen in einem <b>eigenen Fenster</b> über den Knöpfen unter den Spuren (oder die untere Leiste). Zweiter Tipp, <b>✕</b>, Zurück-Taste oder <kbd>Esc</kbd> schließen es wieder.</li><li>Im MIDI-Fenster zeigt die Leiste oben fünf <b>Gruppen</b>: <b>Raster</b>, <b>Tonart</b>, <b>Generator</b>, <b>Audio→MIDI</b>, <b>Klang</b>. Es ist immer nur die gewählte Gruppe sichtbar; die Wahl wird gemerkt.</li><li>Lieber die alte Darstellung? <b>Optionen → Bereiche (Editor, Drums, Vocal, Mixer)</b>: „Großes Fenster bei Bedarf“, „Untereinander, einklappbar“ oder „Reiter unter den Spuren“.</li></ul>
      <ul><li><b>Raster</b> 1/8, 1/16, 1/32; <b>Transponieren</b> −12 / −1 / +1 / +12.</li><li><b>Tonart und Skala</b> wählen und mit <b>Quantize Scale</b> alle Noten einrasten.</li><li><b>Arp / Pattern-Generator</b> wählen und <b>Generieren</b>; dazu 🎲 <b>Auto</b>, ✨ <b>Studio</b>, 🧬 <b>Variation</b>; <b>Leeren</b> löscht die Noten der Spur.</li><li><b>● MIDI Rec</b> nimmt von einem angeschlossenen MIDI-Keyboard auf (WebMIDI, z. B. per USB).</li><li><b>Klangfarbe / Oszillator-Preset</b> für die eingebaute Synth-Engine; über SoundFonts sind echte Instrumente möglich.</li></ul>
      <h4>Audio-to-MIDI</h4><p><b>Analysieren &amp; extrahieren</b> macht aus einer Audiospur Noten (Tonhöhen-Erkennung). <b>Ab Takt</b> legt den Startpunkt fest, <b>Tonart auto + einrasten</b> korrigiert auf die erkannte Tonart. Für mehrstimmiges Material gibt es unter <b>Optionen → KI · Audio → MIDI</b> das Modell „Basic Pitch“ (polyphon, einmal laden).</p>${show('Zeig es mir', 'midi')}` },
    { id: 'drums', icon: 'drum', title: 'Drums, 808 &amp; FX', sum: '16-Step-Sequencer, Bass, Transitions', body: `
      <ul><li><b>Presets</b>: Techno 4/4 + Offbeat, Hard Trance Gallop, Hip-Hop Boom-Bap, Trap 808 Bounce; <b>Leeren</b> setzt zurück.</li><li>Steps antippen = Schlag an/aus; Zeilen für Kick, Snare/Clap, Hi-Hat u. a.</li><li><b>Kick-Synthesizer</b> und <b>Bass / 808</b>-Engine (<b>Rolling</b> oder <b>808 Sub</b>, <b>Glide</b> an/aus).</li><li><b>FX &amp; Transitions</b>: <b>Noise Riser</b>, <b>Sub Impact</b>, <b>Rev Crash</b>; <b>Auto-Drop FX</b> setzt sie automatisch an Übergängen.</li></ul>${show('Zeig es mir', 'drums')}` },
    { id: 'vocal', icon: 'mic', title: 'Vocal-Cleanup &amp; Aufnahme', sum: 'Suno-Stimmen polieren, eigenes Mikrofon', body: `
      <ul><li><b>Vocal-Cleanup &amp; KI-Artefakt-Rack</b>: poliert Suno-Vocals; <b>Rack: AKTIV</b> / Bypass zum Vergleichen.</li><li><b>Own Mic / Vocal Recorder</b>: <b>Aufnahme starten</b>, <b>Vorzähler</b> an/aus, <b>Take löschen</b>.</li></ul>
      ${tip('Beim ersten Aufnehmen fragt Android nach der <b>Mikrofon-Berechtigung</b>. Mit Kopfhörern aufnehmen, sonst nimmt das Mikrofon die Wiedergabe mit auf.')}${show('Zeig es mir', 'vocals')}` },
    { id: 'mixer', icon: 'slidersV', title: 'Mixer, Lautheit &amp; Master', sum: 'Fader, Busse, LUFS, Limiter, Spektrum', body: `
      <ul><li><b>Mixer</b>: Fader pro Kanal mit Pegel, dazu <b>Busse</b> und <b>Master Out</b> (Spitzenpegel in dB).</li><li><b>☰ → Lautheit &amp; Spektrum</b>: <b>LUFS</b> messen, <b>Limiter</b> und <b>Spektrum</b> ansehen.</li><li><b>KI-Assistent</b> (☰) kann eine <b>Mix-Empfehlung</b> vorschlagen, die du prüfst und übernimmst.</li></ul>${tip('Faustregel: Master-Spitzen unter 0 dB halten. Für Streaming-Plattformen wird oft um etwa −14 LUFS gearbeitet – das ist ein Richtwert, kein Zwang.')}${show('Zeig es mir', 'mixer')}` },
    { id: 'tools', icon: 'scissors', title: 'Tonart, Slicer &amp; Marker', sum: 'Kreativ-Werkzeuge im Menü', body: `
      <h4>Tonart &amp; Tempo</h4><p>1 · <b>Tonart erkennen</b> (mit Sicherheit in %), 2 · <b>Transponieren</b> auf eine Zieltonart oder um Halbtöne, 3 · <b>Tempo angleichen</b> (Tonhöhe bleibt). Mit <b>Als Projekt-Tonart setzen</b> übernimmst du das Ergebnis.</p>
      <h4>Beat-Slicer</h4><p>1 · Quelle &amp; Slices (<b>Slices finden</b>: nach Anschlägen oder im Raster), 2 · <b>Pads</b> antippen zum Vorhören (bis 16), 3 · <b>Pattern</b>: Pad wählen und Steps antippen; <b>Zufall</b>, <b>Pad rückwärts</b>, <b>Swing</b>; 4 · <b>Pattern anhören</b> und <b>Als neue Audio-Spur</b> einfügen.</p>
      <h4>Strukturmarker</h4><p><b>＋ Marker an Abspielposition</b>, <b>Aus Arrangement</b> oder <b>Struktur erkennen</b>. Alle Marker erscheinen als Chips über den Spuren und werden mit dem Projekt gespeichert.</p>
      ${warn('Tonart- und Tempo-Erkennung sind Schätzungen. Bei starken Tempoänderungen können hörbare Artefakte entstehen – im Zweifel nach Gehör prüfen.')}${show('Zeig es mir', 'tools')}` },
    { id: 'player', icon: 'play', title: 'Player, Klang &amp; Musik im Hintergrund', sum: 'Dateien und Ordner abspielen, Klang, Equalizer, Tags', body: `
      <h4>Player öffnen</h4><ul><li><b>☰ → Player</b>, die Kachel auf der Startseite oder <b>Optionen → Klang → Player öffnen</b>.</li><li><b>Dateien</b> antippen und WAV, MP3, M4A, OGG oder FLAC wählen – oder ein <b>ZIP</b> (z. B. der Suno-Download). Aus dem ZIP erscheinen alle Audiodateien als Titel; Bilder und Textdateien werden ignoriert.</li><li><b>Ordner</b>: Im Desktop-Browser öffnet sich ein echter Ordner-Dialog – alle Audiodateien samt Unterordnern erscheinen sofort in der Liste. Auf Android zeigt die App die normale Dateiauswahl (alle Titel markieren); ein eigener Ordner-Dialog folgt mit dem nächsten App-Update.</li><li>Die Dateien werden <b>direkt abgespielt</b> – nichts wird in ein Projekt oder in die App kopiert.</li><li>Antippen eines Titels spielt ihn. Unten: Zufall, Zurück, Play/Pause, Weiter, Wiederholen (aus → alle → ein Titel) und Lautstärke.</li><li>Schließt du den Player, bleibt eine kleine Leiste über der unteren Navigation (mit Mini-Equalizer) – damit pausierst du oder kommst zurück.</li><li>Die <b>Dockbar unten</b> trägt Zeitleiste, Zufall, Zurück, Play/Pause, Weiter und Wiederholen – im selben Stil wie die untere Leiste der DAW.</li></ul>
      <h4>Auf der Startseite steuern</h4><ul><li>Läuft der Player oder die DAW, erscheint auf der <b>Startseite</b> unten dieselbe Dockbar. Sie zeigt beim Player Zufall/Zurück/Play/Weiter/Wiederholen, bei der DAW Loop/Anfang/Play/Stopp/Metronom.</li><li>Darüber siehst du das <b>Cover</b> des laufenden Titels mit Effekt und Equalizer. Tipp auf den Titel: Player öffnen bzw. zurück ins Projekt; <b>✕</b> blendet die Leiste aus.</li></ul>
      <h4>Letzter Stand und Ordner-Verlauf</h4><ul><li>Der Player merkt sich <b>Liste, letzten Titel und Position</b>. Nach dem Neustart steht alles wieder da.</li><li>Im Desktop-Browser verbindet sich der gemerkte Ordner mit einem Tipp (oder von selbst). In der Android-App (ab 1.28) bleibt die Ordner-Freigabe erhalten: Beim Start ist alles von selbst wieder da. Mit einer älteren App erscheint oben in der Liste „Letzte Sitzung“ – <b>Ordner verbinden</b>, den gleichen Ordner wählen, und es geht genau an der Stelle weiter.</li><li><b>Zuletzt</b> in der Listenzeile zeigt die letzten 8 Ordner; mit dem × entfernst du Einträge.</li></ul>
      <h4>Tags und Cover</h4><ul><li>Der Player liest <b>Titel, Künstler, Album, Genre, Jahr, Titelnummer und Cover</b> aus MP3 (ID3), M4A, FLAC, OGG/Opus und WAV. Sie erscheinen in der Liste, auf der Titelkarte, in der Mini-Leiste und in der Steuerung von Sperrbildschirm und Benachrichtigung.</li><li>Das Cover bekommt denselben <b>Rahmen und Musik-Effekt</b> wie in der DAW (Effekt, Stärke, Helligkeit unter <b>Optionen → Cover &amp; Tags</b>). Fehlt ein Bild, entsteht automatisch eins aus Titel und Künstler.</li></ul>
      <h4>Startseite</h4><ul><li>Die Startseite zeigt die <b>letzten 3 Projekte</b>. Mit <b>Alle …</b> öffnet sich ein großes, schwebendes Fenster mit allen Projekten, Suche und Sortierung.</li><li>Die Seite passt sich dem freien Platz an, damit du nicht scrollen musst; Farben und Formen folgen dem gewählten <b>Design</b>.</li></ul>
      <h4>Klang-Voreinstellungen und Equalizer</h4><ul><li>In der <b>Dockbar unten</b> wischst du nach links zur zweiten Seite und wählst den <b>Klang</b>: Original, Mehr Bass, Techno, Klassik, Pop, Rock, Stimme, Hip-Hop, Weich oder <b>Eigen</b> (fünf Regler: Tiefbass, Bass, Mitten, Höhen, Brillanz).</li><li>Die <b>Anzeige</b> darüber tanzt zur Musik und passt zum Klang – dicke Balken für Bass, LED-Segmente für Techno, weiche Wellen für Klassik, Punkte für Pop, Zacken für Rock, gespiegelte Balken für Stimme, Blöcke für Hip-Hop, Leuchtfläche für Weich. Die weiße Linie zeigt die Kurve des Klangreglers. Farben und Rundung folgen dem Design.</li><li>Die Anzeige sitzt oben und verschmilzt mit dem Cover. <b>Anzeige</b> (oben rechts in der Klang-Karte) blendet sie aus und ein; alles zusätzlich unter <b>Optionen → Player &amp; Hintergrund</b>.</li><li>Ein Schutz-Limiter verhindert Übersteuern bei starker Anhebung.</li></ul>
      <h4>Musik im Hintergrund</h4><ul><li>In der <b>Android-App</b> läuft die Musik weiter, wenn du eine andere App öffnest oder den Bildschirm sperrst – für den Player <b>und</b> für die DAW. In der Benachrichtigungsleiste und auf dem Sperrbildschirm erscheinen Titel, Künstler, Cover und Tasten.</li><li>Beim ersten Mal fragt Android nach der Erlaubnis für Benachrichtigungen – bitte erlauben, sonst bleibt der Player unsichtbar.</li><li>Abschalten: <b>Optionen → Klang → Player &amp; Hintergrund</b>.</li><li>Im Browser (ohne App) hält Android die Seite im Hintergrund meist an – das ist eine Browser-Grenze.</li></ul>
      <h4>Player und DAW</h4><ul><li>Beide spielen nie gleichzeitig: Startest du den Player, hält die DAW an – und umgekehrt.</li><li>Die Titelliste des Players bleibt nur, bis du die App schließt.</li></ul>
      ${tip('Setzt die Musik bei gesperrtem Bildschirm aus, probiere <b>Optionen → Player &amp; Hintergrund → „Klang-Voreinstellungen &amp; Musik-Anzeige“</b> aus (App danach neu starten). Stoppt Android die Musik nach einiger Zeit trotzdem, in den Android-Einstellungen unter App-Info → Akku auf „Nicht einschränken“ stellen.')}` },
    { id: 'cover', icon: 'image', title: 'Cover &amp; Tags', sum: 'Titelbild, Künstler, Genre – ins Projekt und in den Export', body: `
      <h4>Cover und Tags festlegen</h4><ul><li>Beim <b>Neuen Projekt</b> (und später unter <b>Projekt-Einstellungen</b>) gibt es den Bereich <b>🖼 Cover &amp; Tags</b>. Oder oben rechts auf das Cover-Feld tippen.</li><li><b>Bild wählen</b>: ein eigenes Bild; es wird mittig quadratisch zugeschnitten (512 × 512).</li><li><b>Cover erstellen</b>: entsteht automatisch aus Projektname und Künstler/Produzent – vier Stile (Sonne, Wellen, Equalizer, Leuchten), <b>Neu mischen</b> würfelt eine neue Variante. Ändern sich Name oder Künstler, wird das erzeugte Cover neu gesetzt.</li><li>Tags: Künstler/Produzent, Genre (mit Vorschlägen), Jahr, Album, Komponist, Label/Copyright, Kommentar. Der Titel ist der Projektname; Tempo (BPM) und Tonart kommen automatisch dazu. Das Projekt merkt sich Cover und Tags beim Speichern; der Künstler wird für neue Projekte vorgeschlagen.</li></ul>
      <h4>In der DAW</h4><ul><li>Das Cover steht im Kopfbereich oben rechts, in der Projektliste als Vorschaubild und in der Android-Benachrichtigung während die DAW spielt.</li><li><b>Musik-Effekt:</b> Rund um das Bild reagiert ein Rand auf die Musik (Bass unten, Höhen oben) – das Bild selbst bleibt immer frei. Optionen → Design &amp; Aussehen → Cover &amp; Tags: vierzehn Randeffekte zum Antippen (Pegel-Ring, Punkte, Welle, Puls, Lauflicht, Rahmen, Leuchten, Ring + Leuchten, Flackerlinien, Lauflinien, Blur-Rand, Lichtkranz, Aura, Aus) mit <b>Live-Vorschau</b>, dazu <b>Stärke</b> (dezent / normal / kräftig), <b>Größe</b> des Covers (klein / mittel / groß) und drei Regler für <b>Größe des Effekts</b>, <b>Helligkeit</b> und <b>Transparenz</b> (mit „Zurücksetzen“). Das Cover kann dort auch ausgeblendet werden.</li><li><b>Passend zum Design:</b> Rahmen, Rundung, Leuchten und die Effektfarben folgen dem gewählten Design (Aurora, Studio, Neon, Liquid, Klassik) und der Akzentfarbe. Die Größe passt sich Hoch- und Querformat an und weicht Knöpfen im Kopfbereich aus.</li></ul>
      <h4>Beim Export</h4><ul><li><b>Export-Fenster → „Tags &amp; Cover einbetten“</b> (und der Knopf <b>Master WAV</b>): WAV bekommt Titel, Künstler, Album, Genre, Jahr, Komponist, Copyright, Kommentar, BPM, Tonart und das Cover; Opus/OGG ebenso. Der Dateiname wird „Künstler - Projektname“.</li><li>Stems-ZIP: jede Datei trägt Tags und Stem-Namen, dazu liegt <b>cover.jpg</b> in der ZIP. MIDI-Dateien erhalten Titel, Künstler und Copyright (ohne Bild).</li><li>MP3 gibt es in der App derzeit nicht (kein Encoder eingebaut). Manche Abspielprogramme zeigen Tags und Cover in WAV-Dateien nicht an – bei Opus/OGG klappt das meist besser.</li></ul>
      ${tip('Projekte ohne Cover und Tags werden wie bisher exportiert – nichts ändert sich, solange du nichts einträgst.')}` },
    { id: 'export', icon: 'download', title: 'Exportieren', sum: 'Master, Stems, Bereich, MIDI', body: `
      <ul><li><b>Master WAV</b>: das gesamte Projekt als Stereo-WAV.</li><li><b>☰ → Export: Stems, Bereich, Format</b>: alle Stems als ZIP, nur einen Bereich, oder als <b>Opus</b>.</li><li><b>☰ → .MID Export</b>: die MIDI-Spuren als MIDI-Datei.</li></ul>
      ${warn('<b>MP3</b> kann die App nicht erzeugen (Browser-Grenze). Nimm Opus oder WAV und wandle bei Bedarf extern um. Stems werden einzeln gerechnet – bei langen Projekten dauert das am Handy.')}${show('Zeig es mir', 'export')}` },
    { id: 'ki', icon: 'bot', title: 'KI-Assistent &amp; Sprache', sum: 'Mix-Hilfe, Chat, Sprachbefehle', body: `
      <ul><li><b>✨ KI-Assistent</b> (☰): analysiert die Spuren und macht Vorschläge für Rollen, Mix und Pattern – du entscheidest.</li><li><b>💬 Assistent</b> (☰): Chat zum Bedienen und Fragen. In den Chat-Einstellungen wählst du ein <b>lokales Modell</b> (Download nötig, braucht viel Speicher) oder einen <b>Online-Dienst</b> mit deinem eigenen Schlüssel.</li><li><b>Sprachsteuerung (Test)</b> (Optionen → Experimentell): Befehle wie „Play“, „Tempo 120“, „Spur 2 stumm“. Löschen und Zurücksetzen sind aus Sicherheitsgründen gesperrt.</li></ul>
      ${tip('Online-Dienste und die Spracherkennung können je nach Gerät Daten an Dritte senden. Alles andere in der App bleibt lokal auf dem Gerät.')}` },
    { id: 'design', icon: 'gear', title: 'Design, Icons &amp; Effekte', sum: 'Optionen: Aussehen anpassen', body: `
      <h4>Start-Intro</h4><ul><li>Beim Öffnen der App läuft ein kurzes Video (10 Sekunden). <b>Überspringen</b> oder die Zurück-Taste beendet es sofort; mit dem Lautsprecher-Knopf oben links schaltest du den Ton um.</li><li><b>Optionen → Design &amp; Aussehen → Start-Intro</b>: beim Start abspielen ein/aus, mit/ohne Ton, und <b>Intro jetzt ansehen</b>.</li><li>Das Intro läuft einmal pro App-Start – nicht jedes Mal, wenn du zwischen Apps wechselst.</li></ul>
      <h4>So sind die Optionen aufgebaut</h4><ul><li>Beim Öffnen siehst du sechs <b>Kategorien</b>: <b>Design &amp; Aussehen</b>, <b>Effekte &amp; Anzeige</b>, <b>Klang, KI &amp; Assistent</b>, <b>Leistung &amp; Speicher</b>, <b>Updates &amp; Datensicherung</b> und <b>Hilfe &amp; Feedback</b>. Tipp auf eine Kategorie öffnet ihre Einstellungen.</li><li><b>‹ Optionen</b> (oben, bleibt beim Scrollen stehen), die Zurück-Taste oder <kbd>Esc</kbd> führen zurück zur Übersicht.</li><li>Das <b>Suchfeld</b> findet Einstellungen nach Stichwort, z. B. „Farbe“, „Update“ oder „Speicher“. Mehrere Wörter müssen alle passen.</li></ul>
      <ul><li><b>Design</b>: Aurora Glass, Studio Matt, Neon Spektrum, Liquid Matt, Klassisch.</li><li><b>Darstellung</b>: Glas-Effekte, Leuchteffekte, große Bedienelemente, <b>einheitliche Linien-Icons</b> (oder Emoji).</li><li><b>Effekte</b> (standardmäßig aus): Rand-Effekte (Glühen, Lichtstrahl, Linie) und Flächen-Effekte (Aurora, Equalizer, Funken, Wellen), die nur auf den großen Bereichen laufen – mit Stärke und „Beim Abspielen lebendiger“. Hauptschalter aus = keine Animation.</li><li><b>Anzeige</b>: „Abstand zur Kamera-Aussparung“ (Querformat) und <b>Anzeige prüfen &amp; korrigieren</b>.</li><li><b>Anpassen</b>: Akzentfarbe, Transparenz, Unschärfe, Rundung (eckig bis extra rund).</li><li><b>Fenster untereinander</b>: Editor, Drums, Vocal und Mixer als einklappbare Fenster – oder klassisch als Reiter.</li></ul>
      ${tip('Ruckelt es auf einem älteren Gerät: Glas-Effekte und Effekte ausschalten. Das spart Akku und Rechenleistung.')}${show('Zeig es mir', 'design')}` },
    { id: 'update', icon: 'download', title: 'Updates &amp; Datensicherung', sum: 'Neue Version, „Was ist neu“, Live-Update, Sicherung', body: `
      <h4>Update (neue APK)</h4><ul><li><b>Optionen → Updates &amp; Datensicherung → Nach Updates suchen</b> vergleicht deine <b>Build-Nummer</b> mit der neuesten veröffentlichten Version.</li><li>Gibt es eine neuere, erscheint <b>Update herunterladen</b> (und auf der Startseite ein Hinweis) – mit einer Kurzfassung, was neu ist. Datei öffnen und <b>Installieren</b> wählen: die App wird <b>aktualisiert</b>, Projekte und Einstellungen bleiben.</li><li>Die App prüft beim Start höchstens alle 12 Stunden selbst (abschaltbar) und installiert nie etwas ohne dich.</li></ul>
      <h4>Was ist neu</h4><ul><li><b>Optionen → Updates → Was ist neu?</b> zeigt das Änderungsprotokoll aller Versionen.</li><li>Nach einem Update erscheint auf der Startseite <b>einmal</b> die Karte „Neu in Version …“.</li></ul>
      <h4>Vorschau auf das nächste Update</h4><ul><li>Auf der Startseite und unter <b>Was ist neu</b> steht, was als Nächstes kommt („Bald neu“). Der Text wird beim Start live aus dem Repo geladen und lässt sich mit „Nein, danke“ ausblenden – bei neuem Inhalt erscheint er wieder.</li><li><b>Optionen → Feedback → Vorschau ansehen</b> zeigt ihn jederzeit.</li></ul>
      <h4>Live-Update der Oberfläche</h4><ul><li>Kleine Änderungen kommen <b>ohne neue APK</b>: Die Startseite meldet „Neue Oberfläche … bereit“ → <b>Laden</b> → <b>Neu starten</b>. Du wirst immer vorher gefragt.</li><li>Die geladene Datei wird per Prüfsumme kontrolliert. Startet eine neue Oberfläche nicht richtig, springt die App <b>von selbst auf die eingebaute Version zurück</b> und merkt sich, diese Version zu überspringen.</li><li><b>Optionen → Updates → Auf eingebaute Version zurücksetzen</b> wirft eine geladene Oberfläche jederzeit weg. Mit dem Schalter „Live-Updates der Oberfläche“ kannst du die Funktion ganz ausschalten.</li><li>Änderungen an der Android-Hülle (z. B. Berechtigungen) brauchen weiterhin eine neue APK – dann bietet die App die APK an.</li></ul>
      <h4>Datensicherung</h4><ul><li><b>Alles sichern</b> packt alle Projekte, den letzten Autosave und deine Einstellungen in eine ZIP-Datei (Download-Ordner bzw. Teilen-Dialog).</li><li><b>Wiederherstellen</b> liest so eine ZIP wieder ein: gleiche Projekte werden überschrieben, andere bleiben. Danach lädt die App neu. Auch für ein neues Handy.</li><li><b>Wöchentliche Sicherung</b> (Standard: an): In der Android-App legt die App einmal pro Woche still eine ZIP unter <b>Dokumente/SunshineDAW/Sicherung</b> ab (die letzten 4 bleiben). Bei sehr großen Projekten oder im Browser erscheint stattdessen auf der Startseite eine Erinnerung mit <b>Sichern</b>.</li><li>„Auch große Zusatzdaten“ nimmt SoundFonts und Zwischenspeicher mit.</li></ul>
      <h4>Gerätespeicher</h4><p><b>Speicher dauerhaft schützen</b> bittet Android, die App-Daten bei Platzmangel nicht zu löschen.</p>
      ${warn('Updates über die installierte App klappen nur, wenn alle APKs mit demselben Schlüssel gebaut wurden (feste Signatur). Beim allerersten Wechsel darauf ist einmal Deinstallieren nötig – vorher <b>Alles sichern</b> bzw. exportieren, soweit die alte Version das kann.')}
      ${tip('Vor jedem größeren Update kurz <b>Alles sichern</b> – dauert bei kleinen Projekten Sekunden.')}` },
    { id: 'stabil', icon: 'gear', title: 'Stabilität &amp; Leistung', sum: 'Speicher, Speicher-Sparer, Sparmodus, Fehlerprotokoll', body: `
      <h4>Arbeitsspeicher</h4><ul><li><b>Optionen → Stabilität &amp; Leistung</b> zeigt, wie viel Audio die App gerade im Arbeitsspeicher hält. Geladene Spuren liegen unkomprimiert im Speicher: <b>ca. 95 MB pro Stereo-Spur von 4½ Minuten</b>.</li><li>Wird es viel, blendet die App einen Hinweis ein – bevor Android die App beendet.</li></ul>
      <h4>Sparmodus</h4><ul><li>Schaltet Unschärfe, Schatten und Animationen ab. Das entlastet die Grafik auf schwächeren Handys. Der Klang bleibt gleich.</li><li><b>Anzeige-Test</b> misst zwei Sekunden lang die Bilder pro Sekunde und rät zum Sparmodus, wenn es ruckelt.</li></ul>
      <h4>Projektgröße</h4><ul><li>Importierte Stems werden im Projekt als <b>Original-Datei</b> gespeichert (WAV etwa halb so groß wie die entpackten Daten, MP3 rund ein Zehntel). Beim Öffnen werden sie neu dekodiert – bei vielen Spuren dauert das einige Sekunden.</li><li>Aufnahmen und bearbeitete Spuren bleiben Rohdaten. Ältere Projekte werden kompakt, wenn du die Stems neu importierst.</li></ul>
      <h4>Speicher-Sparer (Spuren entladen)</h4><ul><li><b>Optionen → Speicher-Sparer</b>: Spuren, die gerade nicht zu hören sind (stumm oder durch Solo ausgeblendet), geben ihren Arbeitsspeicher frei – Name, Länge und Wellenform bleiben sichtbar. Der Schalter ist <b>standardmäßig aus</b>.</li><li>Sobald du eine Spur wieder einschaltest, das Abspielen startest oder exportierst, wird sie automatisch neu geladen (bit-genau, dauert je nach Spur Sekundenbruchteile bis wenige Sekunden).</li><li>In der Liste kannst du einzelne Spuren auch von Hand <b>entladen</b> oder <b>laden</b>. Eine Spur, die gerade klingt, wird nie entladen.</li><li>Grenze: Was <b>gleichzeitig klingt</b>, muss geladen sein. Der Sparer hilft beim Arrangieren, Üben und Abhören einzelner Stems, nicht beim Abspielen aller Spuren zusammen.</li><li>Wenn du eine Spur bearbeitest, die entladen ist, lädt die App sie und bittet dich, die Aktion zu wiederholen.</li></ul>
      <h4>Fehlerprotokoll</h4><ul><li>Die App merkt sich Fehler (und ein vermutlich unerwartetes Ende des letzten Starts). <b>Kopieren</b> oder <b>Als Datei</b> erzeugt einen Bericht, den du mir schicken kannst.</li></ul>
      <h4>Tipps für flüssiges Arbeiten</h4><ul><li>Nicht benötigte Spuren löschen oder mehrere Stems zu einer Spur zusammenfassen.</li><li>Effekte und Glas-Effekte aus, bei langen Sitzungen die App zwischendurch neu starten.</li><li>Regelmäßig sichern (Autosave + wöchentliche Sicherung laufen mit).</li></ul>
      ${tip('Die Warnung ist eine Schätzung für das Audio. Zusätzlich brauchen App, Effekte und Anzeige Speicher.')}` },
    { id: 'feedback', icon: 'help', title: 'Feedback &amp; Fehler melden', sum: 'Rückmeldung an die Entwicklerin schicken', body: `
      <ul><li><b>☰ → Feedback</b> (auch auf der Startseite und unter Optionen): Art wählen (Fehler, Idee, Anmerkung, Lob, Frage), beschreiben, fertig. Der Bereich (z. B. Mixer) wird automatisch erkannt.</li><li>Optional hängt die App <b>Geräte- und Versionsangaben</b> und das <b>technische Fehlerprotokoll</b> an – ohne Audiodaten und Projektinhalte. Unter „Das wird gesendet“ siehst du den genauen Text.</li><li>Abschicken per <b>E-Mail</b>, <b>Teilen</b> (WhatsApp, Mail …), als <b>Datei</b> oder <b>Kopieren</b>. Es wird <b>nie automatisch</b> etwas gesendet; ein angefangener Text bleibt als Entwurf erhalten.</li></ul>
      ${tip('Bei Fehlern hilft am meisten: Was hast du getippt, was ist passiert, was hattest du erwartet?')}` },
    { id: 'hilfe', icon: 'help', title: 'Hilfe bei Problemen', sum: 'Kein Ton, Speicher, offline, Zurück-Taste', body: `
      <h4>Kein Ton</h4><ul><li>Ist die Spur auf <b>M</b> (stumm) oder ist ein anderer Kanal auf <b>S</b> (Solo)?</li><li>Lautstärke der Spur, des Masters und des Handys prüfen.</li><li>Ist die Spur <b>Aktiv</b>?</li></ul>
      <h4>Es ruckelt</h4><ul><li>Optionen → <b>Stabilität &amp; Leistung → Sparmodus</b> einschalten (Anzeige-Test hilft bei der Entscheidung).</li><li>Optionen → <b>Effekte</b> und <b>Glas-Effekte</b> ausschalten.</li><li>Andere Apps schließen; sehr viele Spuren mit vielen FX belasten das Gerät.</li></ul>
      <h4>Speichern geht nicht</h4><ul><li>Der Gerätespeicher oder die Browser-Quote ist voll: alte Projekte löschen, Stems als ZIP exportieren.</li></ul>
      <h4>Inhalt ist seitlich verschoben / es gibt einen Rand</h4><ul><li><b>Optionen → Anzeige → Anzeige prüfen &amp; korrigieren</b> stellt die Ausrichtung sofort wieder her und zeigt Messwerte (gern als Screenshot schicken).</li><li>Der Schalter „Abstand zur Kamera-Aussparung“ sollte aus sein, wenn du den ganzen Bildschirm nutzen willst.</li></ul>
      <h4>Offline</h4><ul><li>Die App läuft ohne Internet. Nur Online-Assistent, Modell-Download und Spracherkennung brauchen Netz.</li></ul>
      <h4>Zurück-Taste (Android)</h4><ul><li>Schließt zuerst Dialoge und Menüs, dann führt sie zur Startseite, danach geht die App in den Hintergrund.</li></ul>
      ${tip('Nichts gefunden? Nutze die Suche oben im Handbuch – sie durchsucht alle Kapitel.')}` }
  ];

  let MAN = null;
  function openManual(chId) {
    if (MAN) return;
    try { if (T.open) endTour(false); } catch (_) {}
    const r = document.createElement('div'); r.id = 'hp-man'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); r.setAttribute('aria-label', 'Anleitung');
    r.innerHTML = `<div class="hp-top"><h2>${ic('book')}Anleitung</h2><button type="button" class="hp-close" data-act="close">Schließen</button></div>
      <div class="hp-scroll"><div class="hp-wrap">
        <div class="hp-hero"><button type="button" class="hp-go" data-tour="rundgang">${ic('play')}<span><b>Rundgang starten</b><span>Die App Schritt für Schritt – ca. 2 Minuten</span></span></button></div>
        <input class="hp-q" type="search" placeholder="Im Handbuch suchen …" aria-label="Im Handbuch suchen">
        <div class="hp-list">${CH.map(c => `<details data-id="${c.id}"><summary><span class="hp-ic">${ic(c.icon)}</span><span class="hp-st"><b>${c.title}</b><span class="s">${c.sum}</span></span></summary><div class="hp-body" data-o="">${c.body}</div></details>`).join('')}</div>
        <div class="hp-none" hidden>Dazu habe ich nichts gefunden. Versuche ein anderes Stichwort, z. B. „Export“, „Tempo“ oder „Mikrofon“.</div>
        <div class="hp-foot">Sunshine@R DAW Studio · Anleitung</div></div></div>`;
    r.querySelectorAll('.hp-body').forEach(b => b.dataset.o = b.innerHTML);
    document.body.appendChild(r); MAN = r;
    r.addEventListener('click', e => {
      const t = e.target.closest('[data-tour]'); if (t) { startTour(t.dataset.tour); return; }
      if (e.target.closest('[data-act="close"]')) closeManual();
    });
    const qEl = r.querySelector('.hp-q'); qEl.addEventListener('input', () => filter(qEl.value));
    if (chId) { const d = r.querySelector(`details[data-id="${chId}"]`); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'start' }), 60); } }
  }
  function filter(v) {
    if (!MAN) return; const s = (v || '').trim().toLowerCase(); let n = 0;
    MAN.querySelectorAll('details').forEach(d => {
      const b = d.querySelector('.hp-body'); b.innerHTML = b.dataset.o;
      if (s.length < 2) { d.hidden = false; return; }
      const hit = (d.textContent || '').toLowerCase().includes(s); d.hidden = !hit; if (hit) { n++; d.open = true; mark(b, s); }
    });
    MAN.querySelector('.hp-none').hidden = s.length < 2 || n > 0;
  }
  function mark(root, s) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; let x; while (x = w.nextNode()) if (x.nodeValue.toLowerCase().includes(s) && !x.parentElement.closest('button')) list.push(x);
    list.forEach(tn => { const t = tn.nodeValue, lo = t.toLowerCase(), f = document.createDocumentFragment(); let p = 0, k; while ((k = lo.indexOf(s, p)) >= 0) { f.appendChild(document.createTextNode(t.slice(p, k))); const m = document.createElement('mark'); m.textContent = t.slice(k, k + s.length); f.appendChild(m); p = k + s.length; } f.appendChild(document.createTextNode(t.slice(p))); tn.parentNode.replaceChild(f, tn); });
  }
  function closeManual(silent) { if (!MAN) return; MAN.remove(); MAN = null; }

  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (T.open) { e.stopPropagation(); endTour(false); } else if (MAN) closeManual(); }, true);

  /* ================================================================== Einstiege */
  function wireMenu() {
    const m = menuEl(); if (!m || $('btn-help')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-help'; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = '❓ Anleitung';
    b.addEventListener('click', () => setTimeout(() => openManual(), 60));
    const s = $('btn-settings'); if (s && s.nextSibling) m.insertBefore(b, s.nextSibling); else m.appendChild(b);
  }
  function optionsSection(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 mb-2">Anleitung &amp; Hilfe</div>
      <div class="grid grid-cols-2 gap-2.5"><button type="button" data-hp="tour" class="text-left rounded-2xl p-3 border border-slate-700 bg-slate-900"><div class="text-sm font-bold">🧭 Rundgang</div><div class="text-[11px] text-slate-400 mt-0.5">Die App Schritt für Schritt, ca. 2 Min.</div></button>
      <button type="button" data-hp="man" class="text-left rounded-2xl p-3 border border-slate-700 bg-slate-900"><div class="text-sm font-bold">📖 Handbuch</div><div class="text-[11px] text-slate-400 mt-0.5">Alle Funktionen, durchsuchbar</div></button></div>`;
    ph.addEventListener('click', e => { const b = e.target.closest('[data-hp]'); if (!b) return; const ov = ph.closest('#settings-modal'); if (ov) ov.remove(); if (b.dataset.hp === 'tour') startTour('rundgang'); else openManual(); });
  }
  SunDOM.mount('hp-sec', ph => optionsSection(ph));

  function onHome(el) { // Startseite: „Neu hier?“-Karte beim ersten Start
    if (!el) return; el.innerHTML = '';
    if (HS.seen || HS.hideCard) return;
    el.innerHTML = `<div class="hp-new"><span class="tx"><b>Neu hier?</b><span class="s">Ein kurzer Rundgang zeigt dir die App – ca. 2 Minuten.</span></span><button type="button" data-hp="tour">Los</button><button type="button" class="no" data-hp="no">Nein, danke</button></div>`;
    el.onclick = e => { const b = e.target.closest('[data-hp]'); if (!b) return; if (b.dataset.hp === 'tour') startTour('rundgang'); else { HS.hideCard = true; saveHS(); el.innerHTML = ''; } };
  }
  function boot() { try { if (window.Home && Home.isOpen && Home.isOpen()) onHome($('hm-newbie')); } catch (_) {} wireMenu(); setTimeout(wireMenu, 700); setTimeout(wireMenu, 2500); }
  window.Help = { startTour, openManual, closeManual, endTour, onHome, tours: () => Object.keys(TOURS), chapters: () => CH.map(c => c.id), isOpen: () => T.open || !!MAN, tourOpen: () => T.open, manualOpen: () => !!MAN, _state: () => ({ i: T.i, n: T.steps.length, key: T.steps[T.i] && T.steps[T.i].key }), _seen: () => HS.seen, _reset: () => { HS = { seen: false }; saveHS(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
