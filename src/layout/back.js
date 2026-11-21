/* ===== Sunshine@R · Android-Zurück-Taste =====
   Die native Hülle (MainActivity) ruft window.__androidBack() auf. true = Ich habe etwas geschlossen / bin einen Schritt zurück;
   false = nichts mehr zu schließen → die App geht in den Hintergrund. Im Browser ohne Wirkung. */
(function () {
  'use strict';
  const OVERLAYS = '#zt-sheet,#cv-root,#in-root,#pl-root,#fb-root,#bw-root,#settings-modal,#sf-picker-modal,#pattern-studio-modal,#chat-modal,#assistant-settings,#assistant-modal,#as-offer,.hm-sheet-bg,#lm-root,#ex-root,#kt-root,#bs-root,#mk-root,#ia-root,#ce-root,#nw-root,#hp-tour,#hp-man,#file-menu';
  const shown = e => { if (!e || e.hidden || !e.isConnected) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const zOf = e => { let z = 0; for (let n = e; n && n !== document.body; n = n.parentElement) { const v = parseInt(getComputedStyle(n).zIndex, 10); if (!isNaN(v)) z = Math.max(z, v); } return z; };
  function topOverlay() {
    let best = null, bz = -1;
    document.querySelectorAll(OVERLAYS).forEach(e => { if (!shown(e)) return; const z = zOf(e); if (z >= bz) { best = e; bz = z; } });
    return best;
  }
  function closeOverlay(el) {
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    try { esc(); } catch (_) {}
    if (!shown(el)) return true;
    try { el.click(); } catch (_) {}                       // Klick auf den Hintergrund
    if (!shown(el)) return true;
    const x = el.querySelector('[data-close],button[aria-label="Schließen"],.sheet-x,[data-act="close"]'); if (x) { try { x.click(); } catch (_) {} }
    if (el.isConnected && shown(el) && /^(settings-modal|sf-picker-modal|pattern-studio-modal|chat-modal|assistant-settings|assistant-modal|as-offer)$/.test(el.id)) { try { el.remove(); } catch (_) {} }
    return true;
  }
  window.__androidBack = function () {
    try {
      const ov = topOverlay(); if (ov) { if (ov.id === 'settings-modal' && window.OptNav && OptNav.back()) return true; return closeOverlay(ov); }
      const H = window.Home;
      if (H && H.isOpen && H.isOpen()) { const b = document.getElementById('hm-back'); if (b && !b.hidden && H.close) { H.close(); return true; } return false; }
      if (H && H.open && document.getElementById('home-root')) { H.open(); return true; }   // Projekt → Startseite
    } catch (_) {}
    return false;
  };
})();
