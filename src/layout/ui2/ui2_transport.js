/* ===== Sunshine@R: Transport-Status, Zurück/Vor-Symbole ===== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  function syncTransport() {
    try {
      const l = $('btn-loop'), m = $('btn-metronome'), p = $('btn-play');
      if (l) l.dataset.on = dawState.isLooping ? '1' : '0';
      if (m) m.dataset.on = dawState.metronomeOn ? '1' : '0';
      if (p) p.dataset.on = dawState.isPlaying ? '1' : '0';
    } catch (_) {}
  }
  const UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
  const REDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>';
  function icons() {
    const u = $('btn-undo'), r = $('btn-redo');
    if (u && !u.querySelector('svg')) u.innerHTML = UNDO + '<span class="hb-tx">Zurück</span>';
    if (r && !r.querySelector('svg')) r.innerHTML = REDO + '<span class="hb-tx">Vor</span>';
  }
  function boot() {
    icons(); syncTransport();
    ['btn-loop', 'btn-metronome', 'btn-play', 'btn-stop'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => setTimeout(syncTransport, 0)); });
    setInterval(syncTransport, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', () => { icons(); syncTransport(); setTimeout(icons, 300); });
})();
