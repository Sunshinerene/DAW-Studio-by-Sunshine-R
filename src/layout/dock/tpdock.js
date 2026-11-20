/* ===== Sunshine@R · Transport in der unteren Leiste (Handy) =====
   Am Handy (≤ 760 px) wandern Play / Stopp / Loop / Klick aus dem Kopfbereich in die untere Leiste.
   Die Leiste hat zwei Seiten: Transport und Bereiche (Spuren · Editor · Drums · Vocal · Mixer) – dazwischen wischen
   oder den kleinen Umschalter tippen. Es werden dieselben Knöpfe verschoben (alle Funktionen, Kürzel, Sprachbefehle bleiben).
   In den Optionen abschaltbar (dann bleibt der Transport oben wie bisher). */
(function () {
  'use strict';
  const LS = 'sunshine.tpdock', html = document.documentElement, $ = id => document.getElementById(id);
  let st = { on: true, kind: 'auto', icons: false, sb: false }; try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (_) {}
  const KINDS = [['auto', 'Wie das Design'], ['glass', 'Glas'], ['flat', 'Flach'], ['neon', 'Leuchtend'], ['plain', 'Dezent']];
  const applyKind = () => { const k = KINDS.some(x => x[0] === st.kind) ? st.kind : 'auto'; if (k === 'auto') html.removeAttribute('data-dock'); else html.setAttribute('data-dock', k); };
  const applyIcons = () => { if (st.icons) html.setAttribute('data-dockicons', 'on'); else html.removeAttribute('data-dockicons'); };
  const applySb = () => { if (st.sb) html.setAttribute('data-sb', 'show'); else html.removeAttribute('data-sb'); };
  applyKind(); applyIcons(); applySb();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (_) {} };
  const mq = window.matchMedia('(max-width:760px)');
  const ICON = {
    right: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>'
  };
  let tp = null, home = null, scroller = null, p1 = null, p2 = null, p3 = null, plc = null, pane = 'tp', settle = 0;
  const PANES = ['tp', 'tabs', 'pl'];

  const nav = () => $('bottom-nav');
  const findTp = () => { const b = $('btn-play'); return b ? b.parentElement : null; };
  const dots = a => '<span class="td-dots" aria-hidden="true">' + [0, 1, 2].map(i => '<i' + (a === i ? ' class="on"' : '') + '></i>').join('') + '</span>';

  function mark() {
    const n = nav(); if (!n || !scroller) return;
    n.setAttribute('data-pane', pane);
    [[p1, 'tp'], [p2, 'tabs'], [p3, 'pl']].forEach(([p, k]) => { if (!p) return; const on = k === pane; p.toggleAttribute('inert', !on); p.setAttribute('aria-hidden', on ? 'false' : 'true'); });
  }
  function go(name, instant) {
    if (!scroller) return;
    pane = PANES.indexOf(name) >= 0 ? name : 'tp';
    const x = PANES.indexOf(pane) * scroller.clientWidth;
    mark();
    try { scroller.scrollTo({ left: x, behavior: instant ? 'auto' : 'smooth' }); } catch (_) { scroller.scrollLeft = x; }
  }
  function onScroll() {
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!scroller || !scroller.clientWidth) return;
      const k = PANES[Math.max(0, Math.min(2, Math.round(scroller.scrollLeft / scroller.clientWidth)))];
      if (k !== pane) { pane = k; mark(); }
    }, 90);
  }

  /* Tasten-Zeichen der DAW-Leiste kommen aus derselben Quelle wie im Player (Maske, damit die Schrift in den Knöpfen unangetastet bleibt) */
  function setIconVars() {
    try {
      const P = window.Player; if (!P || !P.svg) return;
      ['repeat', 'metro', 'start'].forEach(k => { const sv = P.svg(k, 24).replace(/currentColor/g, '#000').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '); html.style.setProperty('--tdic-' + k, 'url("data:image/svg+xml,' + encodeURIComponent(sv) + '")'); });
    } catch (_) {}
  }
  /* Zustände der DAW-Knöpfe (Loop AN/AUS, Klick an/aus) als aria-pressed – wird von der Basis nur als Text/Klasse geführt */
  function watchStates() {
    const lp = $('btn-loop'), me = $('btn-metronome');
    if (lp && !lp.__td) { lp.__td = 1; const f = () => lp.setAttribute('aria-pressed', String(/AN/.test(lp.textContent))); try { new MutationObserver(f).observe(lp, { childList: true, characterData: true, subtree: true }); } catch (_) {} f(); }
    if (me && !me.__td) { me.__td = 1; const f = () => me.setAttribute('aria-pressed', String(/amber/.test(me.className))); try { new MutationObserver(f).observe(me, { attributes: true, attributeFilter: ['class'] }); } catch (_) {} f(); }
  }
  function build() {
    const n = nav(); if (!n || n.hidden) return false; setIconVars(); watchStates();
    const t = findTp(); if (!t) return false;
    tp = t;
    if (!home || !home.isConnected) { if (tp.parentNode && !(n.contains(tp))) { home = document.createComment('tpdock'); tp.parentNode.insertBefore(home, tp); } }
    if (n.querySelector('.td-scroll')) return true;
    const kids = Array.from(n.children);
    scroller = document.createElement('div'); scroller.className = 'td-scroll';
    p1 = document.createElement('div'); p1.className = 'td-pane td-tp';
    p2 = document.createElement('div'); p2.className = 'td-pane td-tabs';
    p3 = document.createElement('div'); p3.className = 'td-pane td-pl';
    const t1 = document.createElement('button'); t1.type = 'button'; t1.id = 'btn-td-tabs'; t1.className = 'td-sw'; t1.setAttribute('aria-label', 'Bereiche anzeigen: Spuren, Editor, Drums, Vocal, Mixer'); t1.title = 'Wischen oder tippen: Spuren · Editor · Drums · Vocal · Mixer'; t1.innerHTML = ICON.right + dots(0);
    const t2 = document.createElement('button'); t2.type = 'button'; t2.id = 'btn-td-tp'; t2.className = 'td-sw'; t2.setAttribute('aria-label', 'Transport anzeigen: Play, Stopp, Loop, Klick'); t2.title = 'Wischen oder tippen: Play · Stopp · Loop · Klick'; t2.innerHTML = ICON.left + dots(1);
    const t2r = document.createElement('button'); t2r.type = 'button'; t2r.id = 'btn-td-pl'; t2r.className = 'td-sw td-sw-r'; t2r.setAttribute('aria-label', 'Player anzeigen: Zufall, Zurück, Play, Weiter, Wiederholen'); t2r.title = 'Wischen oder tippen: Player'; t2r.innerHTML = ICON.right;
    const t3 = document.createElement('button'); t3.type = 'button'; t3.id = 'btn-td-back'; t3.className = 'td-sw'; t3.setAttribute('aria-label', 'Zurück zu Spuren, Editor, Drums, Vocal, Mixer'); t3.title = 'Wischen oder tippen: Bereiche'; t3.innerHTML = ICON.left + dots(2);
    const plh = document.createElement('div'); plh.className = 'td-plh';
    p1.append(tp, t1); p2.append(t2, ...kids, t2r); p3.append(t3, plh);
    scroller.append(p1, p2, p3); n.append(scroller);
    try { if (window.HmDock && HmDock.mountPane) plc = HmDock.mountPane(plh); } catch (_) {}
    t2r.addEventListener('click', () => go('pl')); t3.addEventListener('click', () => go('tabs'));
    scroller.addEventListener('scroll', onScroll, { passive: true });
    t1.addEventListener('click', () => go('tabs'));
    t2.addEventListener('click', () => go('tp'));
    n.classList.add('td-on'); html.classList.add('tp-dock');
    const br = $('status-subtitle'); const row = br && br.closest('.pr-2'); if (row) row.classList.add('td-brand');
    pane = 'tp'; mark(); setTimeout(() => go('tp', true), 0);
    liveMark();
    document.dispatchEvent(new CustomEvent('sunshine-tpdock', { detail: { on: true } }));
    return true;
  }
  function unbuild() {
    const n = nav();
    if (tp && home && home.isConnected) home.after(tp);
    if (n) { n.classList.remove('td-on'); n.removeAttribute('data-pane'); const sc = n.querySelector('.td-scroll'); if (sc) { /* Bereichs-Knöpfe zurück in die Leiste, damit die Basis sie wie gewohnt verwalten kann */ Array.from(p2 ? p2.children : []).forEach(c => { if (!c.classList.contains('td-sw')) n.appendChild(c); }); sc.remove(); } }
    try { if (plc && window.HmDock) HmDock.unmountPane(plc); } catch (_) {} plc = null;
    scroller = p1 = p2 = p3 = null; html.classList.remove('tp-dock');
    document.querySelectorAll('.td-brand').forEach(e => e.classList.remove('td-brand'));
    document.dispatchEvent(new CustomEvent('sunshine-tpdock', { detail: { on: false } }));
  }
  function sync() { const n = nav(); if (!n) return; if (mq.matches && st.on) { if (!n.querySelector('.td-scroll')) build(); } else if (n.querySelector('.td-scroll') || html.classList.contains('tp-dock')) unbuild(); }

  /* Läuft die Wiedergabe, leuchtet der Transport-Umschalter in der Bereichs-Seite (Pause-Symbol sichtbar = es spielt) */
  function liveMark() {
    const ic = $('icon-pause'); if (!ic || ic.__td) return; ic.__td = 1;
    const f = () => { const n = nav(); if (n) n.classList.toggle('td-live', !ic.classList.contains('hidden')); };
    try { new MutationObserver(f).observe(ic, { attributes: true, attributeFilter: ['class'] }); } catch (_) {} f();
  }

  (mq.addEventListener ? mq.addEventListener('change', () => setTimeout(sync, 0)) : mq.addListener(() => setTimeout(sync, 0)));
  window.addEventListener('orientationchange', () => setTimeout(() => { if (scroller) go(pane, true); }, 250));
  window.addEventListener('resize', () => { if (scroller) { clearTimeout(go._r); go._r = setTimeout(() => go(pane, true), 120); } });

  /* Die Leiste wird von der Basis neu gefüllt (replaceChildren) – dann Struktur erneut aufbauen */
  try { const n0 = nav(); if (n0) new MutationObserver(() => { if (mq.matches && st.on && !n0.querySelector('.td-scroll') && !n0.hidden) setTimeout(sync, 0); }).observe(n0, { childList: true }); } catch (_) {}

  /* ---------- Optionen ---------- */
  function section(ph) {
    ph.innerHTML = '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Untere Leiste</div><div class="rounded-xl border border-slate-800 p-3 space-y-2">'
      + '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-td-on class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Transport in der unteren Leiste (Handy)</span><span class="block text-[11px] leading-4 text-slate-400">Play, Stopp, Loop und Klick liegen unten in der Leiste. Mit einem Wisch (oder dem kleinen Pfeil) wechselst du zu Spuren · Editor · Drums · Vocal · Mixer und zurück. Oben bleibt mehr Platz für Cover und Spuren. Ausgeschaltet bleibt der Transport oben im Kopfbereich.</span></span></label></div>';
    const box = ph.querySelector('.rounded-xl'); const kd = document.createElement('div'); kd.className = 'pt-2';
    kd.innerHTML = '<div class="text-sm font-semibold mb-1">Leistenstil</div><div class="text-[11px] leading-4 text-slate-400 mb-2">Gilt für die untere Leiste der DAW, die Dockbar im Player und die Startseite.</div><div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Leistenstil">' + KINDS.map(k => '<button type="button" role="radio" data-td-kind="' + k[0] + '" class="px-3 min-h-[40px] rounded-xl border text-xs font-bold">' + k[1] + '</button>').join('') + '</div>';
    box.appendChild(kd);
    const paintK = () => kd.querySelectorAll('[data-td-kind]').forEach(b => { const on = b.dataset.tdKind === (KINDS.some(x => x[0] === st.kind) ? st.kind : 'auto'); b.setAttribute('aria-checked', String(on)); b.className = 'px-3 min-h-[40px] rounded-xl border text-xs font-bold ' + (on ? 'border-amber-400 bg-amber-400/20 text-white' : 'border-slate-700 bg-slate-900 text-slate-300'); });
    kd.addEventListener('click', e => { const b = e.target.closest('[data-td-kind]'); if (!b) return; st.kind = b.dataset.tdKind; save(); applyKind(); paintK(); });
    const ex = document.createElement('div'); ex.className = 'pt-3 space-y-2';
    ex.innerHTML = '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-td-icons class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Tasten passend zum Leistenstil</span><span class="block text-[11px] leading-4 text-slate-400">Form und Leuchten der Tasten (Play, Zurück, Weiter …) folgen dem gewählten Leistenstil – in der DAW-Leiste, im Player und auf der Startseite.</span></span></label>'
      + '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-td-sb class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Scrollbalken anzeigen</span><span class="block text-[11px] leading-4 text-slate-400">Standard: ausgeblendet – gescrollt wird wie gewohnt per Wischen oder Mausrad.</span></span></label>';
    box.appendChild(ex);
    const ci = ex.querySelector('[data-td-icons]'), cs = ex.querySelector('[data-td-sb]'); ci.checked = !!st.icons; cs.checked = !!st.sb;
    ci.addEventListener('change', () => { st.icons = ci.checked; save(); applyIcons(); }); cs.addEventListener('change', () => { st.sb = cs.checked; save(); applySb(); });
    paintK();
    const c = ph.querySelector('[data-td-on]'); c.checked = !!st.on;
    c.addEventListener('change', () => { st.on = c.checked; save(); sync(); });
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ph = n.id === 'td-sec' ? n : (n.querySelector && n.querySelector('#td-sec')); if (ph && !ph.dataset.done) { ph.dataset.done = '1'; section(ph); } }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.TpDock = { kind: () => st.kind, setKind: k => { st.kind = k; save(); applyKind(); }, icons: () => !!st.icons, setIcons: v => { st.icons = !!v; save(); applyIcons(); }, scrollbars: () => !!st.sb, setScrollbars: v => { st.sb = !!v; save(); applySb(); }, go, reveal: () => { if (scroller && pane !== 'tp') go('tp', true); }, state: () => ({ on: !!st.on, docked: html.classList.contains('tp-dock'), pane }), enable: v => { st.on = !!v; save(); sync(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(sync, 0)); else setTimeout(sync, 0);
})();
