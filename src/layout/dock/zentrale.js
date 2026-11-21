/* ===== Sunshine@R · „Zentrale“ – letzte Seite jeder Dockbar (1.40) =====
   Ein Baustein für DAW, Player und Startseite: sechs große Tasten – Startseite · DAW · Player · Feedback · Optionen · Anleitung.
   Damit kommt man von überall überallhin; die alten Einzel-Knöpfe (Zurück, Feedback, Optionen, Menüpunkte) entfallen dort,
   wo die Zentrale erreichbar ist (die Elemente bleiben im Dokument, werden nur ausgeblendet – Kürzel, Tests und Sprachbefehle laufen weiter).
   Wo es keine Dockbar gibt (DAW am großen Bildschirm), bleibt alles wie bisher. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), html = document.documentElement;
  const sv = p => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const IC = {
    home: '<path d="m3 10.5 9-7.5 9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    daw: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/>',
    player: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15v2a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z"/><path d="M3 15v2a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>',
    fb: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    opts: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>'
  };
  const TILES = [
    ['home', 'Startseite', 'Zur Startseite'], ['daw', 'DAW', 'Zur DAW (Projekt)'], ['player', 'Player', 'Zum Player'],
    ['fb', 'Feedback', 'Feedback senden'], ['opts', 'Optionen', 'Optionen & Design'], ['help', 'Anleitung', 'Anleitung & Rundgang']
  ];
  const P = () => window.Player || null, H = () => window.Home || null;
  const guard = f => { try { return f(); } catch (e) { try { console.error('[Zentrale]', e); } catch (_) {} } };

  /* Welche Ansicht ist gerade vorn? */
  function view() {
    const p = P(), h = H();
    if (p && p.isOpen && p.isOpen()) return 'player';
    if (h && h.isOpen && h.isOpen()) return 'home';
    return 'daw';
  }
  /* Ansicht wechseln – die alte schließen, die neue öffnen */
  function go(t) {
    const p = P(), h = H(), po = !!(p && p.isOpen && p.isOpen()), ho = !!(h && h.isOpen && h.isOpen());
    if (t === 'home') { if (po) guard(() => p.close()); if (!ho && h) guard(() => h.open()); }
    else if (t === 'daw') { if (po) guard(() => p.close()); if (ho) guard(() => h.close()); }
    else if (t === 'player') { if (ho) guard(() => h.close()); if (!po && p) guard(() => p.open()); }
    try { document.dispatchEvent(new CustomEvent('sunshine-view', { detail: { view: view() } })); } catch (_) {}
  }
  function act(k, v) {
    if (k === 'home' || k === 'daw' || k === 'player') return go(k);
    if (k === 'fb') return guard(() => window.Feedback && Feedback.open(v === 'player' ? { area: 'Player' } : undefined));
    if (k === 'opts') return guard(() => { if (window.SunshineTheme && SunshineTheme.open) SunshineTheme.open(); else { const b = $('btn-settings'); if (b) b.click(); } });
    if (k === 'help') return guard(() => window.Help && Help.openManual());
  }

  /* Die Seite selbst: v = Ansicht, in der sie sitzt (die eigene Taste ist markiert) */
  function pane(v) {
    const el = document.createElement('div'); el.className = 'zt'; el.dataset.view = v; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Zentrale');
    el.innerHTML = TILES.map(([k, t, d]) => '<button type="button" class="zt-b' + (k === v ? ' on' : '') + '" data-zt="' + k + '" aria-label="' + d + '"' + (k === v ? ' aria-current="page"' : '') + '>' + sv(IC[k]) + '<span>' + t + '</span></button>').join('');
    el.addEventListener('click', e => { const b = e.target.closest('[data-zt]'); if (!b) return; if (b.dataset.zt === v) return; act(b.dataset.zt, v); });
    return el;
  }
  /* Kleiner Pfeil zum Umschalten (gleiches Zeichen wie in der DAW-Leiste) */
  function arrow(dir, label, cls) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'zt-sw ' + (cls || ''); b.setAttribute('aria-label', label); b.title = label; b.innerHTML = sv(IC[dir]); return b;
  }

  /* ---------- Einrast-Wächter (1.41) ----------
     Nach dem Wischen muss immer eine GANZE Seite stehen. Bleibt die Leiste dazwischen stehen (Android-WebView bricht eine Wischgeste
     manchmal ab), schnappt sie nach kurzer Ruhe auf die nächste Seite. Erst dann (und nie mitten in einer Berührung) wird gemeldet. */
  function settle(sc, done) {
    let t = 0, touching = false, tries = 0;
    const w = () => Math.max(1, sc.clientWidth);
    const fin = () => {
      if (touching || !sc.isConnected || !sc.clientWidth) return;
      const n = Math.round(sc.scrollLeft / w()), off = Math.abs(sc.scrollLeft - n * w());
      if (off > 2 && tries < 3) { tries++; try { sc.scrollTo({ left: n * w(), behavior: 'smooth' }); } catch (_) { sc.scrollLeft = n * w(); } t = setTimeout(fin, 260); return; }
      if (off > 2) sc.scrollLeft = n * w();
      tries = 0; if (done) guard(() => done(n));
    };
    sc.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(fin, 120); }, { passive: true });
    sc.addEventListener('touchstart', () => { touching = true; tries = 0; clearTimeout(t); }, { passive: true });
    const end = () => { touching = false; clearTimeout(t); t = setTimeout(fin, 180); };
    sc.addEventListener('touchend', end, { passive: true }); sc.addEventListener('touchcancel', end, { passive: true });
    return { fin, busy: () => touching };
  }

  /* ---------- Scroll-Leiste mit beliebig vielen Seiten (Player + Startseite) ----------
     Gleiches Verhalten wie die DAW-Leiste: einrasten, wischen, Punkte zum Antippen. */
  function strip(host, opts) {
    opts = opts || {};
    const sc = document.createElement('div'); sc.className = 'zt-scroll'; if (opts.id) sc.id = opts.id;
    const dots = document.createElement('div'); dots.className = 'zt-dots'; if (opts.dotsId) dots.id = opts.dotsId;
    const S = { el: sc, dots, panes: [], cur: 0, onPane: opts.onPane || null };
    const w = () => Math.max(1, sc.clientWidth);
    /* inert nur bei ruhender Leiste – mitten in der Wischgeste darf keine Seite „abgeschaltet“ werden (das brach die Geste ab) */
    S.paint = rest => {
      const n = Math.max(0, Math.min(S.panes.length - 1, Math.round(sc.scrollLeft / w()))); S.cur = n; sc.dataset.pane = String(n);
      if (rest !== false) S.panes.forEach((p, i) => { p.el.toggleAttribute('inert', i !== n); p.el.setAttribute('aria-hidden', i === n ? 'false' : 'true'); });
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === n));
      if (S.onPane) guard(() => S.onPane(n, S.panes[n]));
    };
    S.go = (n, instant) => { n = Math.max(0, Math.min(S.panes.length - 1, +n || 0)); try { sc.scrollTo({ left: n * w(), behavior: instant ? 'auto' : 'smooth' }); } catch (_) { sc.scrollLeft = n * w(); } if (instant) S.paint(); };
    S.idx = id => S.panes.findIndex(p => p.id === id);
    S.goId = (id, instant) => { const i = S.idx(id); if (i >= 0) S.go(i, instant); };
    /* Seiten setzen: [{id, el, label, hidden}] – versteckte Seiten fehlen komplett (z. B. Playbar der Startseite, wenn nichts läuft) */
    S.set = list => {
      const keep = S.panes[S.cur] && S.panes[S.cur].id;
      S.panes.forEach(p => { if (p.el.parentNode === sc) sc.removeChild(p.el); });
      S.panes = list.filter(p => p && !p.hidden);
      S.panes.forEach(p => { p.el.classList.add('zt-pane'); sc.appendChild(p.el); });
      dots.innerHTML = S.panes.map((p, i) => '<button type="button" data-zi="' + i + '" aria-label="' + (p.label || ('Seite ' + (i + 1))) + '"></button>').join('');
      dots.hidden = S.panes.length < 2;
      const k = keep ? S.idx(keep) : -1; S.go(k >= 0 ? k : 0, true);
    };
    sc.addEventListener('scroll', () => { clearTimeout(S._t); S._t = setTimeout(() => S.paint(false), 60); }, { passive: true });
    S.guard = settle(sc, () => S.paint(true));
    dots.addEventListener('click', e => { const b = e.target.closest('[data-zi]'); if (b) S.go(+b.dataset.zi); });
    window.addEventListener('resize', () => { clearTimeout(S._r); S._r = setTimeout(() => { if (host.isConnected) S.go(S.cur, true); }, 120); });
    host.appendChild(sc); host.appendChild(dots);
    return S;
  }

  window.Zentrale = { view, go, pane, arrow, strip, settle, tiles: () => TILES.map(t => t[0]), icon: k => sv(IC[k]) };
})();
