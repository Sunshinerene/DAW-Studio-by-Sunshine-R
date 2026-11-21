/* ===== Sunshine@R: einklappbare Fenster (Editor / Drums / Vocal / Mixer / Spuren) ===== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const LS = 'sunshine.dock';
  const html = document.documentElement;
  const WINS = [['midi', '🎹', 'MIDI-Editor & Piano Roll'], ['drums', '🥁', 'Drum-, 808- & FX-Sequencer'], ['vocals', '🎙️', 'Vocal-Cleanup, Mic & FX'], ['mixer', '🎚️', 'Kanal-Mixer & Master']];
  const DEF = { mode: 'big', v: 2, open: { midi: true, drums: false, vocals: false, mixer: false }, mt: true };
  let st = (() => { try { const j = JSON.parse(localStorage.getItem(LS) || '{}'); if (j.v !== 2) { if (j.mode !== 'tabs') j.mode = 'big'; j.v = 2; } return Object.assign({}, DEF, j, { open: Object.assign({}, DEF.open, j.open || {}) }); } catch (_) { return JSON.parse(JSON.stringify(DEF)); } })();
  const save = () => SunStore.save(LS, st);
  let built = false, guard = false;

  function redraw(tab) {
    const f = { midi: () => { drawPianoRoll(); drawVelocityLane(); }, drums: () => renderDrumSequencerGrids(), mixer: () => renderVerticalMixer() }[tab];
    if (f) try { f(); } catch (_) {}
  }
  function apply() {
    html.setAttribute('data-dock', st.mode);
    document.querySelectorAll('.dock-win').forEach(w => w.setAttribute('data-open', st.open[w.dataset.win] ? '1' : '0'));
    document.querySelectorAll('.dock-win-head').forEach(b => b.setAttribute('aria-expanded', st.open[b.parentNode.dataset.win] ? 'true' : 'false'));
    unhide();
    html.setAttribute('data-mt', st.mt ? 'open' : 'closed');
    const mt = $('mt-collapse'); if (mt) mt.setAttribute('aria-expanded', st.mt ? 'true' : 'false');
    try { if (window.BigWin) BigWin.sync(); } catch (_) {}
  }
  function unhide() {
    if (st.mode === 'tabs') return;
    guard = true; document.querySelectorAll('.dock-tab-panel.hidden').forEach(p => p.classList.remove('hidden')); guard = false;
  }
  function setOpen(tab, on, scroll) {
    if (st.mode === 'big') { if (window.BigWin) { if (on) { if (BigWin.current() !== tab) BigWin.open(tab); } else if (BigWin.current() === tab) BigWin.close(); } return; }
    st.open[tab] = !!on; save(); apply();
    if (on) { try { dawState.activeTab = tab; dawState.dockCollapsed = false; } catch (_) {} setTimeout(() => redraw(tab), 30); }
    if (on && scroll) { const w = document.querySelector(`.dock-win[data-win="${tab}"]`); if (w) setTimeout(() => { const h = (document.querySelector('header') || {}).getBoundingClientRect; const hh = h ? document.querySelector('header').getBoundingClientRect().height : 0; window.scrollTo({ top: Math.max(0, w.getBoundingClientRect().top + window.scrollY - hh - 8), behavior: 'smooth' }); }, 80); }
  }
  function build() {
    if (built) return; const first = $('tab-panel-midi'); if (!first) return; built = true;
    WINS.forEach(([k, ic, title]) => {
      const p = $('tab-panel-' + k); if (!p) return;
      const w = document.createElement('div'); w.className = 'dock-win'; w.dataset.win = k; w.dataset.open = st.open[k] ? '1' : '0';
      const h = document.createElement('button'); h.type = 'button'; h.className = 'dock-win-head'; h.setAttribute('aria-expanded', st.open[k] ? 'true' : 'false'); h.dataset.winToggle = k;
      h.innerHTML = `<span class="text-base">${ic}</span><span>${title}</span><span class="dw-chev" aria-hidden="true">▾</span>`;
      p.parentNode.insertBefore(w, p); w.appendChild(h); w.appendChild(p);
    });
    const tb = $('dock-tabbar'); if (tb) tb.id = 'dock-tabbar';
    document.addEventListener('click', e => {
      const h = e.target.closest && e.target.closest('.dock-win-head'); if (!h) return;
      const k = h.dataset.winToggle; setOpen(k, !st.open[k], false);
    });
    /* Reiter-Knöpfe (auch die untere Leiste am Handy) öffnen im Fenster-Modus das jeweilige Fenster */
    document.querySelectorAll('.dock-tab-btn').forEach(b => b.addEventListener('click', () => { if (st.mode === 'tabs') return; setTimeout(() => { if (st.mode === 'big' && window.BigWin) BigWin.open(b.dataset.tab); else setOpen(b.dataset.tab, true, true); }, 90); }));
    /* Andere Skripte verstecken Panels beim Reiter-Wechsel → im Fenster-Modus wieder einblenden */
    new MutationObserver(() => { if (!guard) unhide(); }).observe(first.parentNode.parentNode, { subtree: true, attributes: true, attributeFilter: ['class'] });
    /* Spuren-Bereich */
    const left = document.querySelector('#track-count-pill'); if (left && !$('mt-collapse')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'mt-collapse'; b.title = 'Spuren ein-/ausklappen'; b.setAttribute('aria-label', 'Spuren ein- oder ausklappen');
      b.innerHTML = '<span class="dw-chev" aria-hidden="true">▾</span>'; left.parentNode.insertBefore(b, left.parentNode.firstChild);
      b.addEventListener('click', () => { st.mt = !st.mt; save(); apply(); if (st.mt) try { renderMultiTrackLanes(); } catch (_) {} });
    }
    apply();
  }
  window.DockWin = {
    isOpen: k => st.mode === 'tabs' ? (typeof dawState !== 'undefined' && dawState.activeTab === k) : st.mode === 'big' ? !!(window.BigWin && BigWin.current() === k) : !!st.open[k],
    setOpen, setMode(m) { st.mode = m === 'tabs' ? 'tabs' : m === 'windows' ? 'windows' : 'big'; save(); apply(); if (st.mode === 'tabs') { try { switchBottomTab(dawState.activeTab || 'midi'); } catch (_) {} } },
    get mode() { return st.mode; }, state: st, openAll(on) { if (st.mode === 'big') return; WINS.forEach(([k]) => st.open[k] = !!on); save(); apply(); if (on) WINS.forEach(([k]) => setTimeout(() => redraw(k), 30)); }
  };
  const boot = () => { build(); setTimeout(() => { unhide(); WINS.forEach(([k]) => { if (st.open[k]) redraw(k); }); }, 200); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
