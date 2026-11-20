/* ===== Sunshine@R · Effekte =====
   Rand-Effekte (Glühen · Lichtstrahl · Linie) an Kopfleiste, Bereichen, Navigation und Dialogen
   + Flächen-Effekte (Aurora · Equalizer · Funken · Wellen) NUR auf den großen Bereichen – kein Overlay über der ganzen App.
   Standard: aus. Alles in Optionen → Effekte wählbar oder komplett abschaltbar. Während Musik spielt, laufen die Effekte lebendiger. */
(function () {
  'use strict';
  const LS = 'sunshine.fx', VER = 2;
  const DEF = { on: false, edge: 'glow', full: 'aurora', k: 50, react: true };
  const EDGES = [['off', 'Aus'], ['glow', 'Glühen'], ['beam', 'Lichtstrahl'], ['line', 'Linie']];
  const FULLS = [['off', 'Aus'], ['aurora', 'Aurora'], ['eq', 'Equalizer'], ['sparks', 'Funken'], ['waves', 'Wellen']];
  const html = document.documentElement;
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let st = Object.assign({}, DEF);
  try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); if (o.v !== VER) o.on = false; delete o.v; Object.assign(st, o); } catch (_) {}   // Version 2: Effekte starten einmalig aus
  const clean = () => { if (!EDGES.some(e => e[0] === st.edge)) st.edge = DEF.edge; if (!FULLS.some(f => f[0] === st.full)) st.full = DEF.full; st.k = Math.max(10, Math.min(100, +st.k || DEF.k)); st.on = st.on === true; st.react = st.react !== false; };
  clean();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(Object.assign({ v: VER }, st))); } catch (_) {} };

  // ---------- Rand: Elemente markieren ----------
  const EDGE_SEL = ['header.sticky', '#drop-zone-wrapper > .bg-daw-panel', 'section.pb-4 > .bg-daw-panel', '#bottom-nav', '.dock-win'];
  const WIN_IDS = /^(settings-modal|assistant-modal|chat-modal|assistant-settings|pattern-studio-modal|sf-picker-modal|as-offer|track-fx-modal)$/;
  function mark(e) {
    if (!e || e.classList.contains('fx-edge')) return;
    e.classList.add('fx-edge');
    try { if (getComputedStyle(e).position === 'static') e.classList.add('fx-rel'); } catch (_) {}
  }
  function tagAll() { EDGE_SEL.forEach(s => document.querySelectorAll(s).forEach(mark)); }
  function tagWin(n) {
    if (n.nodeType !== 1) return;
    if (WIN_IDS.test(n.id || '') && n.firstElementChild) n.firstElementChild.classList.add('fx-win');
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(tagWin); }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------- Farben ----------
  let C1 = [255, 138, 26], C2 = [124, 61, 255], C3 = [25, 195, 255];
  const trip = v => { const a = String(v || '').trim().split(/[\s,]+/).map(Number); return a.length >= 3 && a.every(x => !isNaN(x)) ? a.slice(0, 3) : null; };
  function syncColors() {
    const cs = getComputedStyle(html);
    if (html.getAttribute('data-accent') === '1') { const t = trip(cs.getPropertyValue('--acc-rgb')); if (t) html.style.setProperty('--fx-rgb', t.join(' ')); }
    else html.style.removeProperty('--fx-rgb');
    C1 = trip(getComputedStyle(html).getPropertyValue('--fx-rgb')) || trip(cs.getPropertyValue('--daw-accent')) || C1;
    C2 = trip(cs.getPropertyValue('--fx-rgb2')) || C2; C3 = trip(cs.getPropertyValue('--fx-rgb3')) || C3;
  }

  // ---------- Anwenden ----------
  const homeOpen = () => { try { return !!(window.Home && Home.isOpen && Home.isOpen()); } catch (_) { return false; } };
  function live() {
    let pl = false; try { pl = st.on && st.react && typeof dawState !== 'undefined' && !!dawState.isPlaying; } catch (_) {}
    const v = pl ? '1' : '0'; if (html.getAttribute('data-fx-live') !== v) html.setAttribute('data-fx-live', v);
    const p = (st.on && !document.hidden && !homeOpen()) ? '0' : '1'; if (html.getAttribute('data-fx-pause') !== p) html.setAttribute('data-fx-pause', p);
  }
  function apply() {
    clean();
    html.setAttribute('data-fx', st.on ? 'on' : 'off');
    html.setAttribute('data-fx-edge', st.edge);
    html.setAttribute('data-fx-full', st.full);
    html.style.setProperty('--fx-k', String(st.k / 100));
    syncColors(); tagAll(); live();
  }
  function set(p, persist) { Object.assign(st, p); clean(); if (persist !== false) save(); apply(); try { document.dispatchEvent(new CustomEvent('sunshine-fx', { detail: Object.assign({}, st) })); } catch (_) {} }
  document.addEventListener('visibilitychange', live);
  setInterval(() => { live(); if (st.on) tagAll(); }, 600);
  document.addEventListener('sunshine-ui', () => setTimeout(syncColors, 30));
  new MutationObserver(() => syncColors()).observe(html, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });

  // ---------- Optionen → Effekte ----------
  const seg = (attr, items, cur) => items.map(([v, l]) => `<button type="button" data-${attr}="${v}" aria-pressed="${cur === v}" class="py-2.5 text-xs font-bold rounded-xl border ${cur === v ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'}">${l}</button>`).join('');
  function section(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Effekte</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3.5">
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-fx-on ${st.on ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Visuelle Effekte</span><span class="block text-[11px] text-slate-400">Hauptschalter – standardmäßig aus. Aus = keine Animationen, schont den Akku.${mq.matches ? ' <b>Systemeinstellung „Bewegung reduzieren“ ist aktiv: Es laufen nur ruhige Effekte.</b>' : ''}</span></span></label>
        <div><div class="text-sm font-semibold mb-1.5">Rand-Effekte <span class="text-[11px] font-normal text-slate-400">an Leisten, Bereichen &amp; Fenstern</span></div><div class="grid grid-cols-4 gap-2" id="fx-edge-row">${seg('fx-edge', EDGES, st.edge)}</div></div>
        <div><div class="text-sm font-semibold mb-1.5">Flächen-Effekte <span class="text-[11px] font-normal text-slate-400">nur große Bereiche</span></div><div class="grid grid-cols-5 gap-1.5" id="fx-full-row">${seg('fx-full', FULLS, st.full)}</div></div>
        <label class="block"><span class="flex justify-between text-sm font-semibold"><span>Stärke</span><span id="fx-k-v" class="text-slate-400 font-mono text-xs">${st.k}%</span></span><input type="range" data-fx-k min="10" max="100" step="5" value="${st.k}" class="w-full daw-slider mt-1"></label>
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-fx-react ${st.react ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Beim Abspielen lebendiger</span><span class="block text-[11px] text-slate-400">Während Musik läuft, bewegen sich die Effekte etwa doppelt so schnell. Beim Wechsel sieht man die Wirkung kurz durch den Dialog.</span></span></label>
      </div>`;
    const ov = ph.closest('#settings-modal');
    const peek = ms => { if (!ov) return; ov.classList.add('peek'); clearTimeout(ov._fxp); ov._fxp = setTimeout(() => ov.classList.remove('peek'), ms); };
    const pressed = (row, attr, v) => ph.querySelectorAll(`#${row} button`).forEach(b => { const on = b.dataset[attr] === v; b.setAttribute('aria-pressed', String(on)); b.className = 'py-2.5 text-xs font-bold rounded-xl border ' + (on ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'); });
    ph.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fxEdge) { set({ edge: b.dataset.fxEdge }); pressed('fx-edge-row', 'fxEdge', st.edge); peek(1800); }
      else if (b.dataset.fxFull) { set({ full: b.dataset.fxFull }); pressed('fx-full-row', 'fxFull', st.full); peek(1800); }
    });
    ph.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('[data-fx-on]')) { set({ on: t.checked }); peek(1800); }
      else if (t.matches('[data-fx-react]')) set({ react: t.checked });
    });
    ph.addEventListener('input', e => { const t = e.target; if (t.matches('[data-fx-k]')) { set({ k: +t.value }, false); ph.querySelector('#fx-k-v').textContent = st.k + '%'; if (ov) ov.classList.add('peek'); } });
    ['pointerup', 'pointercancel', 'change'].forEach(ev => ph.addEventListener(ev, e => { if (e.target.matches && e.target.matches('[data-fx-k]')) { save(); if (ov) ov.classList.remove('peek'); } }));
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ph = n.id === 'fx-sec' ? n : (n.querySelector && n.querySelector('#fx-sec')); if (ph && !ph.dataset.done) { ph.dataset.done = '1'; section(ph); } }); }).observe(document.body, { childList: true, subtree: true });

  window.FX = { get: () => Object.assign({}, st), set, apply, edges: EDGES.map(e => e[0]), fulls: FULLS.map(e => e[0]), _live: () => html.getAttribute('data-fx-live') === '1', _colors: () => [C1, C2, C3] };
  function boot() { apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
