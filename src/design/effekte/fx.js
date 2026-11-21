/* ===== Sunshine@R · Effekte =====
   Rand-Effekte (Glühen · Lichtstrahl · Linie) an Kopfleiste, Bereichen, Navigation und Dialogen
   + Flächen-Effekte (Aurora · Equalizer · Funken · Wellen) NUR auf den großen Bereichen – kein Overlay über der ganzen App.
   Standard: aus. Alles in Optionen → Effekte wählbar oder komplett abschaltbar. Voreinstellungen (Ruhig · Club · Aurora …), Bewegung „Animiert“ · „Zur Musik“ · „Starr“, Tempo; gilt in DAW, Player und Startseite. */
(function () {
  'use strict';
  const LS = 'sunshine.fx', VER = 2;
  const DEF = { on: false, edge: 'glow', full: 'aurora', k: 50, react: true, mode: 'anim', speed: 100, preset: '', daw: true, player: true, home: true, sides: 'b' };
  /* 1.41: An welchen Seiten der Fenster der Rand-Effekt sitzt (t · r · b · l). Standard: nur unten. Leisten (Kopf, Navigation) behalten den vollen Rand. */
  const SIDES = [['t', 'Oben'], ['r', 'Rechts'], ['b', 'Unten'], ['l', 'Links']];
  const EDGES = [['off', 'Aus'], ['glow', 'Glühen'], ['beam', 'Lichtstrahl'], ['line', 'Linie'], ['dual', 'Doppelstrahl'], ['rainbow', 'Regenbogen'], ['dash', 'Lauflinien'], ['frame', 'Rahmen']];
  const MODES = [['anim', 'Animiert'], ['music', 'Zur Musik'], ['static', 'Starr']];
  const PRESETS = [['calm', 'Ruhig', { edge: 'glow', full: 'off', k: 35, mode: 'anim', speed: 80 }], ['club', 'Club', { edge: 'dual', full: 'eq', k: 70, mode: 'music', speed: 110 }], ['aurora', 'Aurora', { edge: 'glow', full: 'aurora', k: 55, mode: 'anim', speed: 90 }], ['neon', 'Neon-Linie', { edge: 'line', full: 'waves', k: 60, mode: 'anim', speed: 100 }],
    ['rainbow', 'Regenbogen', { edge: 'rainbow', full: 'sparks', k: 60, mode: 'anim', speed: 100 }], ['beat', 'Im Takt', { edge: 'glow', full: 'off', k: 75, mode: 'music', speed: 100 }], ['dash', 'Lauflicht', { edge: 'dash', full: 'off', k: 60, mode: 'anim', speed: 100 }], ['still', 'Still', { edge: 'frame', full: 'off', k: 55, mode: 'static', speed: 100 }]];
  const FULLS = [['off', 'Aus'], ['aurora', 'Aurora'], ['eq', 'Equalizer'], ['sparks', 'Funken'], ['waves', 'Wellen']];
  const html = document.documentElement;
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let st = Object.assign({}, DEF);
  try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); if (o.v !== VER) o.on = false; delete o.v; Object.assign(st, o); } catch (_) {}   // Version 2: Effekte starten einmalig aus
  const clean = () => { if (!EDGES.some(e => e[0] === st.edge)) st.edge = DEF.edge; if (!FULLS.some(f => f[0] === st.full)) st.full = DEF.full; st.k = Math.max(10, Math.min(100, +st.k || DEF.k)); st.on = st.on === true; st.react = st.react !== false; if (!MODES.some(m => m[0] === st.mode)) st.mode = DEF.mode; st.speed = Math.max(50, Math.min(200, +st.speed || DEF.speed)); if (!PRESETS.some(p => p[0] === st.preset)) st.preset = ''; ['daw', 'player', 'home'].forEach(k => { st[k] = st[k] !== false; }); st.sides = SIDES.map(x => x[0]).filter(c => String(st.sides || '').indexOf(c) >= 0).join('') || DEF.sides; };
  clean();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(Object.assign({ v: VER }, st))); } catch (_) {} };

  // ---------- Rand: Elemente markieren ----------
  const BAR_SEL = ['header.sticky', '#bottom-nav', '#hm-dock', '#pl-root .pl-top', '#pl-root .pl-dock'];
  const EDGE_SEL = ['header.sticky', '#drop-zone-wrapper > .bg-daw-panel', 'section.pb-4 > .bg-daw-panel', '#bottom-nav', '.dock-win', '#bw-launch .bw-lcard', '#bw-root', '#home-root .hm-card', '#home-root .hm-cta', '#home-root .hm-pill', '#home-root .hp-new', '#home-root .hm-resume', '#home-root .hm-empty', '#hm-dock', '#pl-root .pl-top', '#pl-root .pl-snd', '#pl-root .pl-lh', '#pl-root .pl-dock'];
  const WIN_IDS = /^(settings-modal|assistant-modal|chat-modal|assistant-settings|pattern-studio-modal|sf-picker-modal|as-offer|track-fx-modal)$/;
  function mark(e) {
    if (!e || e.classList.contains('fx-edge')) return;
    e.classList.add('fx-edge');
    try { if (BAR_SEL.some(q => e.matches(q))) e.classList.add('fx-bar'); } catch (_) {}
    try { if (e.closest('#home-root')) e.classList.add('fx-h'); else if (e.closest('#pl-root')) e.classList.add('fx-p'); } catch (_) {}
    try { if (getComputedStyle(e).position === 'static') e.classList.add('fx-rel'); } catch (_) {}
  }
  function tagAll() { EDGE_SEL.forEach(s => document.querySelectorAll(s).forEach(mark)); }
  /* 1.42: Jedes Fenster bekommt den Rand – auch die ohne feste Kennung (Overlay „fixed inset-0“ → erstes Kind ist das Fenster) und die Sheets der Startseite */
  function tagWin(n) {
    if (n.nodeType !== 1) return;
    const c = typeof n.className === 'string' ? n.className : '';
    if (n.firstElementChild && (WIN_IDS.test(n.id || '') || (/\bfixed\b/.test(c) && /\binset-0\b/.test(c)) || n.classList.contains('hm-sheet-bg'))) n.firstElementChild.classList.add('fx-win');
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
  const plOpen = () => { try { return !!(window.Player && Player.isOpen && Player.isOpen()); } catch (_) { return false; } };
  const plPlaying = () => { try { const x = window.Player && Player.state && Player.state(); return !!(x && x.playing); } catch (_) { return false; } };
  const dawPlaying = () => { try { return typeof dawState !== 'undefined' && !!dawState.isPlaying; } catch (_) { return false; } };
  const attr = (n, v) => { if (html.getAttribute(n) !== v) html.setAttribute(n, v); };
  function live() {
    const pl = st.on && (st.mode === 'music' || (st.mode === 'anim' && st.react)) && (dawPlaying() || plPlaying());
    attr('data-fx-live', pl ? '1' : '0');
    attr('data-fx-pause', (st.on && !document.hidden) ? '0' : '1');
    attr('data-fx-view', plOpen() ? 'player' : homeOpen() ? 'home' : 'daw');
  }
  /* Modus „Zur Musik“: Pegel (Bässe) in 5 Stufen als --fx-lvl – nur bei laufender Musik und nur bei Änderung wird geschrieben */
  let lvBuf = null, lvLast = -1, lvTick = null;
  function level() {
    let q = 0;
    if (st.on && st.mode === 'music') {
      let d = null;
      try { if (dawPlaying()) { const an = window.Cover && Cover.analyser && Cover.analyser(); if (an) { if (!lvBuf || lvBuf.length !== an.frequencyBinCount) lvBuf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(lvBuf); d = lvBuf; } } else if (plPlaying() && window.PlSound) d = PlSound.coverData(); } catch (_) {}
      if (d) { let t = 0; for (let i = 1; i <= 6; i++) t += d[i] || 0; q = Math.round(Math.min(1, t / 6 / 255 * 1.3) * 5) / 5; }
    }
    if (q !== lvLast) { lvLast = q; html.style.setProperty('--fx-lvl', String(q)); }
  }
  if (window.SunPerf) SunPerf.heavy(() => st.on && st.mode !== 'static' && (st.edge !== 'off' || st.full !== 'off') && !document.hidden);
  function levelTick() {
    const need = st.on && st.mode === 'music';
    if (need && !lvTick) lvTick = SunTick.every(130, level); else if (!need && lvTick) { SunTick.stop(lvTick); lvTick = null; level(); }
  }
  /* Seiten-Auswahl → Attribut (fehlt = alle vier = bisheriges Aussehen) + Ausschnitt für die Ring-Stile (schmale Bänder an den gewählten Seiten) */
  const BAND = 4;
  function clipFor(sides) {
    const B = BAND + 'px', E = 'calc(100% - ' + BAND + 'px)', R = { t: [['0 0', '100% 0', '100% ' + B, '0 ' + B]], b: [['0 ' + E, '100% ' + E, '100% 100%', '0 100%']], l: [['0 0', B + ' 0', B + ' 100%', '0 100%']], r: [[E + ' 0', '100% 0', '100% 100%', E + ' 100%']] };
    const pts = []; sides.split('').forEach(c => { const q = R[c][0]; pts.push('0 0'); q.forEach(p => pts.push(p)); pts.push(q[0]); });
    return 'polygon(' + pts.join(',') + ',0 0)';
  }
  function applySides() {
    if (st.sides === 'trbl') { html.removeAttribute('data-fx-sides'); html.style.removeProperty('--fxs-clip'); return; }
    attr('data-fx-sides', st.sides.split('').join(' ')); html.style.setProperty('--fxs-clip', clipFor(st.sides));
  }
  function apply() {
    clean();
    html.setAttribute('data-fx', st.on ? 'on' : 'off');
    html.setAttribute('data-fx-edge', st.edge);
    html.setAttribute('data-fx-full', st.full);
    html.style.setProperty('--fx-k', String(st.k / 100)); html.style.setProperty('--fx-s', String(st.speed / 100));
    applySides();
    attr('data-fx-mode', st.mode); ['daw', 'player', 'home'].forEach(k => { const a = 'data-fx-no-' + k; if (st[k]) html.removeAttribute(a); else html.setAttribute(a, '1'); });
    syncColors(); tagAll(); live(); levelTick();
  }
  function set(p, persist) { Object.assign(st, p); clean(); if (persist !== false) save(); apply(); try { document.dispatchEvent(new CustomEvent('sunshine-fx', { detail: Object.assign({}, st) })); } catch (_) {} }
  document.addEventListener('visibilitychange', live);
  SunTick.every(600, () => { live(); if (st.on) tagAll(); });
  document.addEventListener('sunshine-ui', () => setTimeout(syncColors, 30));
  new MutationObserver(() => syncColors()).observe(html, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });

  // ---------- Optionen → Effekte ----------
  const seg = (attr, items, cur) => items.map(([v, l]) => `<button type="button" data-${attr}="${v}" aria-pressed="${cur === v}" class="py-2.5 text-xs font-bold rounded-xl border ${cur === v ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'}">${l}</button>`).join('');
  function section(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Effekte</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3.5">
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-fx-on ${st.on ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Visuelle Effekte</span><span class="block text-[11px] text-slate-400">Hauptschalter – standardmäßig aus. Aus = keine Animationen, schont den Akku.${mq.matches ? ' <b>Systemeinstellung „Bewegung reduzieren“ ist aktiv: Es laufen nur ruhige Effekte.</b>' : ''}</span></span></label>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Voreinstellung <span class="text-[11px] font-normal text-slate-400">setzt alles darunter auf einmal</span></div><div class="grid grid-cols-4 gap-2" id="fx-preset-row">${seg('fx-preset', PRESETS.map(p => [p[0], p[1]]), st.preset)}</div></div>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Rand-Effekte <span class="text-[11px] font-normal text-slate-400">an Leisten, Bereichen &amp; Fenstern</span></div><div class="grid grid-cols-4 gap-2" id="fx-edge-row">${seg('fx-edge', EDGES, st.edge)}</div></div>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Seiten der Fenster <span class="text-[11px] font-normal text-slate-400">wo der Rand leuchtet (gilt für alle Fenster, Karten und Leisten)</span></div><div class="grid grid-cols-4 gap-2" id="fx-sides-row" role="group" aria-label="Seiten der Fenster">${SIDES.map(([c, l]) => `<button type="button" data-fx-side="${c}" aria-pressed="${st.sides.indexOf(c) >= 0}" class="py-2.5 text-xs font-bold rounded-xl border ${st.sides.indexOf(c) >= 0 ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'}">${l}</button>`).join('')}</div></div>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Flächen-Effekte <span class="text-[11px] font-normal text-slate-400">nur große Bereiche</span></div><div class="grid grid-cols-5 gap-1.5" id="fx-full-row">${seg('fx-full', FULLS, st.full)}</div></div>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Bewegung <span class="text-[11px] font-normal text-slate-400">immer in Bewegung · nur zur Musik · stehend</span></div><div class="grid grid-cols-3 gap-2" id="fx-mode-row">${seg('fx-mode', MODES, st.mode)}</div></div>
        <label class="block"><span class="flex justify-between text-sm font-semibold"><span>Stärke</span><span id="fx-k-v" class="text-slate-400 font-mono text-xs">${st.k}%</span></span><input type="range" data-fx-k min="10" max="100" step="5" value="${st.k}" class="w-full daw-slider mt-1"></label>
        <label class="block"><span class="flex justify-between text-sm font-semibold"><span>Tempo</span><span id="fx-s-v" class="text-slate-400 font-mono text-xs">${st.speed}%</span></span><input type="range" data-fx-s min="50" max="200" step="10" value="${st.speed}" class="w-full daw-slider mt-1"></label>
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-fx-react ${st.react ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Beim Abspielen lebendiger</span><span class="block text-[11px] text-slate-400">Bei „Animiert“: Während Musik läuft, bewegen sich die Effekte etwa doppelt so schnell. Beim Wechsel sieht man die Wirkung kurz durch den Dialog.</span></span></label>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Leistung <span class="text-[11px] font-normal text-slate-400">schützt vor Ruckeln</span></div><div class="grid grid-cols-3 gap-2" id="fx-perf-row">${seg('fx-perf', [['auto', 'Automatisch'], ['full', 'Volle Qualität'], ['eco', 'Sparsam']], window.SunPerf ? SunPerf.mode() : 'auto')}</div><div class="text-[11px] leading-4 text-slate-400 mt-1" id="fx-perf-note"></div></div>
        <div data-fx-row><div class="text-sm font-semibold mb-1.5">Wo anzeigen</div><div class="dfx-where" role="group" aria-label="Wo anzeigen">${[['daw', 'DAW'], ['player', 'Player'], ['home', 'Startseite']].map(([k, l]) => `<label class="dfx-chk"><input type="checkbox" data-fx-where="${k}" ${st[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      </div>`;
    const ov = ph.closest('#settings-modal');
    const host = el => el.closest('[data-fx-row]') || el.closest('label') || el.parentElement;
    const peek = (el, ms) => { if (ov && el) SunPeek.on(ov, host(el), ms); };
    const sync = () => { paintSides(); pressed('fx-edge-row', 'fxEdge', st.edge); pressed('fx-full-row', 'fxFull', st.full); pressed('fx-mode-row', 'fxMode', st.mode); pressed('fx-preset-row', 'fxPreset', st.preset); const on = ph.querySelector('[data-fx-on]'); if (on) on.checked = st.on; const k = ph.querySelector('[data-fx-k]'); if (k) { k.value = st.k; ph.querySelector('#fx-k-v').textContent = st.k + '%'; } const sp = ph.querySelector('[data-fx-s]'); if (sp) { sp.value = st.speed; ph.querySelector('#fx-s-v').textContent = st.speed + '%'; } };
    const perfNote = () => { const n = ph.querySelector('#fx-perf-note'); if (!n || !window.SunPerf) return; const m = SunPerf.mode(), l = SunPerf.level(); n.textContent = m === 'auto' ? (l === 0 ? 'Automatisch: Volle Qualität. Ruckelt die Anzeige, stellt die App die Effekte von selbst sparsamer (Zeichenflächen mit weniger Bildern und ohne Weichzeichner, Flächen-Effekte stehen still).' : 'Automatisch: Wegen Ruckelns auf „' + (l === 1 ? 'sparsam' : 'minimal') + '“ gestellt – „Volle Qualität“ wählen, um es zurückzusetzen.') : m === 'full' ? 'Immer volle Qualität, auch wenn es ruckelt.' : 'Immer sparsam: weniger Bilder pro Sekunde, kein Weichzeichner, Flächen-Effekte stehen still.'; };
    setTimeout(perfNote, 0);
    const paintSides = () => ph.querySelectorAll('[data-fx-side]').forEach(b => { const on = st.sides.indexOf(b.dataset.fxSide) >= 0; b.setAttribute('aria-pressed', String(on)); b.className = 'py-2.5 text-xs font-bold rounded-xl border ' + (on ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'); });
    const pressed = (row, attr, v) => ph.querySelectorAll(`#${row} button`).forEach(b => { const on = b.dataset[attr] === v; b.setAttribute('aria-pressed', String(on)); b.className = 'py-2.5 text-xs font-bold rounded-xl border ' + (on ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'); });
    ph.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fxSide) { peek(b, 1800); const c = b.dataset.fxSide, cur = st.sides.split(''), on = cur.indexOf(c) >= 0; if (on && cur.length === 1) return; set({ sides: on ? cur.filter(x => x !== c).join('') : st.sides + c }); paintSides(); }
      else if (b.dataset.fxEdge) { peek(b, 1800); set({ edge: b.dataset.fxEdge, preset: '' }); pressed('fx-edge-row', 'fxEdge', st.edge); pressed('fx-preset-row', 'fxPreset', ''); }
      else if (b.dataset.fxFull) { peek(b, 1800); set({ full: b.dataset.fxFull, preset: '' }); pressed('fx-full-row', 'fxFull', st.full); pressed('fx-preset-row', 'fxPreset', ''); }
      else if (b.dataset.fxMode) { peek(b, 1800); set({ mode: b.dataset.fxMode, preset: '' }); pressed('fx-mode-row', 'fxMode', st.mode); pressed('fx-preset-row', 'fxPreset', ''); }
      else if (b.dataset.fxPerf) { if (window.SunPerf) SunPerf.setMode(b.dataset.fxPerf); pressed('fx-perf-row', 'fxPerf', b.dataset.fxPerf); perfNote(); }
      else if (b.dataset.fxPreset) { const pr = PRESETS.find(p => p[0] === b.dataset.fxPreset); if (!pr) return; peek(b, 2200); set(Object.assign({ on: true, preset: pr[0] }, pr[2])); sync(); }
    });
    ph.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('[data-fx-on]')) { peek(t, 1800); set({ on: t.checked }); }
      else if (t.matches('[data-fx-react]')) set({ react: t.checked });
      else if (t.matches('[data-fx-where]')) set({ [t.dataset.fxWhere]: t.checked });
    });
    ph.addEventListener('input', e => { const t = e.target; if (t.matches('[data-fx-k]')) { if (ov && !ov.classList.contains('peek')) peek(t); set({ k: +t.value, preset: '' }, false); ph.querySelector('#fx-k-v').textContent = st.k + '%'; pressed('fx-preset-row', 'fxPreset', ''); }
      else if (t.matches('[data-fx-s]')) { if (ov && !ov.classList.contains('peek')) peek(t); set({ speed: +t.value, preset: '' }, false); ph.querySelector('#fx-s-v').textContent = st.speed + '%'; pressed('fx-preset-row', 'fxPreset', ''); } });
    ['pointerup', 'pointercancel', 'change'].forEach(ev => ph.addEventListener(ev, e => { if (e.target.matches && e.target.matches('[data-fx-k],[data-fx-s]')) { save(); if (ov) SunPeek.off(ov); } }));
  }
  SunDOM.mount('fx-sec', ph => section(ph));

  window.FX = { get: () => Object.assign({}, st), set, apply, sides: () => st.sides, edges: EDGES.map(e => e[0]), fulls: FULLS.map(e => e[0]), modes: MODES.map(e => e[0]), presets: PRESETS.map(e => e[0]), preset: id => { const p = PRESETS.find(x => x[0] === id); if (p) set(Object.assign({ on: true, preset: id }, p[2])); return !!p; }, _live: () => html.getAttribute('data-fx-live') === '1', _colors: () => [C1, C2, C3] };
  function boot() { apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
