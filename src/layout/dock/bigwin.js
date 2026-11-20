/* ===== Sunshine@R · Großansicht-Fenster (Editor / Drums / Vocal / Mixer) =====
   Die großen Bereiche liegen nicht mehr unter den Spuren, sondern öffnen auf Wunsch als eigenes Fenster über der DAW
   (Transportleiste oben und untere Leiste bleiben bedienbar). Die Bereiche werden dafür nur umgehängt – alle Regler,
   Zeichenflächen und Funktionen bleiben unverändert. Zusätzlich: MIDI-Editor mit Werkzeug-Gruppen statt einer langen Leiste. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const html = document.documentElement;
  const WINS = { midi: ['🎹', 'MIDI-Editor & Piano Roll', 'Editor'], drums: ['🥁', 'Drum-, 808- & FX-Sequencer', 'Drums'], vocals: ['🎙️', 'Vocal-Cleanup, Mic & FX', 'Vocal'], mixer: ['🎚️', 'Kanal-Mixer & Master', 'Mixer'] };
  const KEYS = Object.keys(WINS);
  const LSG = 'sunshine.midigroup';
  let root = null, body = null, launch = null, cur = null; const home = {}; let extraMoved = null;
  const isBig = () => !!(window.DockWin && DockWin.mode === 'big');

  function redraw(k) {
    try {
      if (k === 'midi') { drawPianoRoll(); drawVelocityLane(); }
      else if (k === 'drums') renderDrumSequencerGrids();
      else if (k === 'mixer') renderVerticalMixer();
    } catch (_) {}
  }
  function top() { const h = document.querySelector('header'); const r = h ? h.getBoundingClientRect() : null; return r ? Math.max(0, Math.round(r.bottom)) : 0; }
  function place() { if (root) root.style.top = top() + 'px'; }

  function build() {
    if (root) return;
    root = document.createElement('div'); root.id = 'bw-root'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'false'); root.setAttribute('aria-label', 'Bereich');
    root.innerHTML = `<div class="bw-bar"><div class="bw-title"><span class="bw-ic" data-bw-ic></span><b data-bw-title></b></div>
      <div class="bw-chips" data-bw-chips></div><div class="bw-extra" data-bw-extra></div>
      <button type="button" class="bw-x" data-bw-close aria-label="Fenster schließen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg> <span>Schließen</span></button></div><div class="bw-body" id="bw-body"></div>`;
    document.body.appendChild(root); body = $('bw-body');
    root.querySelector('[data-bw-chips]').innerHTML = KEYS.map(k => `<button type="button" class="bw-chip" data-bw-go="${k}">${WINS[k][0]} <span>${WINS[k][2]}</span></button>`).join('');
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-bw-close]'); if (c) { close(); return; }
      const g = e.target.closest('[data-bw-go]'); if (g) open(g.dataset.bwGo);
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !cur || e.defaultPrevented) return;
      if (Array.from(document.querySelectorAll('[role="dialog"]')).some(d => d !== root && !d.hidden && d.getBoundingClientRect().width > 0)) return;
      close();
    });
    window.addEventListener('resize', place);
    /* „Spuren“ in der unteren Leiste = Fenster schließen */
    document.addEventListener('click', e => { if (cur && e.target.closest && e.target.closest('#btn-nav-tracks')) close(); });
    buildLaunch();
  }
  function buildLaunch() {
    const tb = $('dock-tabbar'); const sec = tb && tb.closest('section'); if (!sec || launch) return;
    sec.classList.add('bw-dock');
    launch = document.createElement('section'); launch.id = 'bw-launch'; launch.className = 'max-w-[1800px] w-full mx-auto px-3 pb-24';
    launch.innerHTML = `<div class="bw-lcard"><div class="bw-lhead">Werkzeuge <small>öffnen als großes Fenster</small></div><div class="bw-lgrid">` +
      KEYS.map(k => `<button type="button" class="bw-lbtn" data-bw-open="${k}"><span class="bw-lic">${WINS[k][0]}</span><span class="bw-ltx"><b>${WINS[k][2]}</b><small>${WINS[k][1]}</small></span></button>`).join('') + `</div></div>`;
    sec.parentNode.insertBefore(launch, sec);
    launch.addEventListener('click', e => { const b = e.target.closest('[data-bw-open]'); if (b) open(b.dataset.bwOpen); });
  }

  function restore() {
    if (!cur) return;
    const p = $('tab-panel-' + cur), h = home[cur];
    if (p && h && h.parent) h.parent.appendChild(p);
    if (extraMoved && extraMoved.parent) { extraMoved.parent.appendChild(extraMoved.el); extraMoved = null; }
  }
  function open(k) {
    if (!isBig() || !WINS[k]) return false;
    build(); if (cur === k && !root.hidden) { close(); return true; }          // zweiter Tipp auf denselben Knopf schließt
    const p = $('tab-panel-' + k); if (!p) return false;
    if (cur) restore();
    if (!home[k]) home[k] = { parent: p.parentNode };
    body.appendChild(p); p.classList.remove('hidden'); cur = k;
    root.querySelector('[data-bw-ic]').textContent = WINS[k][0]; root.querySelector('[data-bw-title]').textContent = WINS[k][1];
    root.querySelectorAll('[data-bw-go]').forEach(b => b.setAttribute('aria-current', b.dataset.bwGo === k ? 'true' : 'false'));
    if (k === 'midi') { const w = $('btn-connect-webmidi'); const pill = w && w.parentNode; if (pill) { extraMoved = { el: pill, parent: pill.parentNode }; root.querySelector('[data-bw-extra]').appendChild(pill); } }
    root.setAttribute('data-win', k); root.hidden = false; place(); html.classList.add('bw-open');
    try { dawState.activeTab = k; dawState.dockCollapsed = false; } catch (_) {}
    body.scrollTop = 0;
    setTimeout(() => redraw(k), 30); setTimeout(() => redraw(k), 250);
    launchMark(); return true;
  }
  function close() {
    if (!cur) return false;
    const k = cur; restore(); cur = null;
    if (root) { root.hidden = true; root.removeAttribute('data-win'); }
    html.classList.remove('bw-open'); launchMark(); return true;
  }
  function launchMark() { if (launch) launch.querySelectorAll('[data-bw-open]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bwOpen === cur ? 'true' : 'false')); }
  function sync() { build(); if (!isBig()) { close(); } if (launch) launch.hidden = !isBig(); }

  /* ---------- MIDI-Editor: Werkzeug-Gruppen ---------- */
  const GROUPS = [['1', 'Raster', 'Raster & Transponieren'], ['2', 'Tonart', 'Tonart & Quantisieren'], ['3', 'Generator', 'Arpeggio & Pattern'], ['4', 'Audio→MIDI', 'Audio in Noten umwandeln'], ['5', 'Klang', 'Synth-Klang & Aufnahme']];
  function tidyMidi() {
    const p = $('tab-panel-midi'); if (!p || p.dataset.tidy) return; const tool = p.firstElementChild; if (!tool || !tool.classList.contains('grid')) return;
    const L = tool.children[0], R = tool.children[1], mid = p.children[1]; if (!L || !R || !mid || L.children.length < 3) return;
    p.dataset.tidy = '1'; tool.classList.add('mt-tool'); L.classList.add('mt-l'); R.classList.add('mt-r');
    Array.from(L.children).slice(0, 3).forEach((c, i) => c.setAttribute('data-mg', String(i + 1))); R.setAttribute('data-mg', '4');
    const pr = mid.children[0], syn = mid.children[1]; mid.classList.add('mt-mid'); if (pr) pr.classList.add('mt-pr'); if (syn) { syn.classList.add('mt-syn'); syn.setAttribute('data-mg', '5'); }
    const seg = document.createElement('div'); seg.className = 'mt-seg'; seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', 'Werkzeug-Gruppen');
    seg.innerHTML = GROUPS.map(g => `<button type="button" role="tab" data-mseg="${g[0]}" title="${g[2]}">${g[1]}</button>`).join('');
    p.insertBefore(seg, tool);
    let g = '1'; try { g = localStorage.getItem(LSG) || '1'; } catch (_) {} if (!GROUPS.some(x => x[0] === g)) g = '1';
    const set = v => { g = v; p.setAttribute('data-mseg', v); seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.mseg === v ? 'true' : 'false')); try { localStorage.setItem(LSG, v); } catch (_) {} setTimeout(() => redraw('midi'), 30); };
    seg.addEventListener('click', e => { const b = e.target.closest('[data-mseg]'); if (b) set(b.dataset.mseg); });
    /* Wer eine Funktion von außen anspringt (Handbuch, Assistent), bekommt die passende Gruppe eingeblendet */
    p.__showGroup = set; set(g);
  }

  function boot() { build(); tidyMidi(); sync(); }
  window.BigWin = { open, close, current: () => cur, isOpen: () => !!cur, sync, tidy: tidyMidi, showGroup: v => { const p = $('tab-panel-midi'); if (p && p.__showGroup) p.__showGroup(String(v)); }, groups: () => GROUPS.map(g => g[0]) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0)); else setTimeout(boot, 0);
})();
