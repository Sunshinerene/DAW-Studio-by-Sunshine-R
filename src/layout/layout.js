/* ===== Sunshine@R · Anzeige-Wächter =====
   Sorgt dafür, dass die App IMMER genau so breit wie der Bildschirm ist:
   – kein seitliches Verschieben/Wischen der Seite (egal welcher Effekt oder Dialog etwas überstehen lässt)
   – kein fester Seitenrand durch Kamera-Aussparung/Systemleisten, solange du ihn nicht in Optionen einschaltest
   – „Anzeige prüfen“ in den Optionen zeigt die Messwerte und stellt die Ausrichtung sofort wieder her */
(function () {
  'use strict';
  const LS = 'sunshine.layout', html = document.documentElement;
  let st = { cutout: false }; SunStore.merge(st, LS);
  const save = () => SunStore.save(LS, st);
  const apply = () => html.setAttribute('data-cutout', st.cutout ? '1' : '0');
  apply();

  let fixes = 0;
  function guard() {
    let moved = false;
    try {
      if (window.scrollX) { window.scrollTo(0, window.scrollY); moved = true; }
      if (html.scrollLeft) { html.scrollLeft = 0; moved = true; }
      if (document.body && document.body.scrollLeft) { document.body.scrollLeft = 0; moved = true; }
    } catch (_) {}
    if (moved) fixes++;
    return moved;
  }
  window.addEventListener('scroll', () => { if (window.scrollX || html.scrollLeft) guard(); }, { passive: true });
  ['resize', 'orientationchange'].forEach(e => window.addEventListener(e, () => { guard(); setTimeout(guard, 300); }));
  if (window.visualViewport) visualViewport.addEventListener('resize', guard);
  document.addEventListener('sunshine-fx', () => setTimeout(guard, 50));
  SunTick.every(1500, guard);

  function probe() {   // gemessene Sicherheitsabstände (so wie der Browser sie meldet)
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(d); const c = getComputedStyle(d), r = [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(x => Math.round(parseFloat(x) || 0)); d.remove(); return r;
  }
  function measure() {
    const b = document.body.getBoundingClientRect(), hd = document.querySelector('header.sticky, header'), h = hd ? hd.getBoundingClientRect() : null, vv = window.visualViewport;
    const ins = probe();
    return {
      Fenster: innerWidth + ' × ' + innerHeight, Bildschirm: screen.width + ' × ' + screen.height, 'Dichte (dpr)': +(devicePixelRatio || 1).toFixed(2),
      'Seite verschoben': (window.scrollX || html.scrollLeft) ? 'ja (' + Math.round(window.scrollX) + ' px)' : 'nein', 'Sichtfenster-Versatz': vv ? Math.round(vv.offsetLeft) + ' px' : '–', Zoom: vv ? +vv.scale.toFixed(2) : 1,
      'Inhalt links/rechts': h ? Math.round(h.left) + ' / ' + Math.round(innerWidth - h.right) + ' px' : '–',
      'Sicherheitsrand o/r/u/l': ins.join(' / ') + ' px', 'Kamera-Abstand': st.cutout ? 'an' : 'aus',
      'Überstand (Seitenbreite)': Math.max(0, html.scrollWidth - innerWidth) + ' px', Korrekturen: fixes, Orientierung: innerWidth > innerHeight ? 'Quer' : 'Hoch'
    };
  }

  // ---------- Optionen ----------
  function section(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Anzeige</div>
      <div class="rounded-xl border border-slate-800 p-3 space-y-3">
        <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-ly-cut ${st.cutout ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Abstand zur Kamera-Aussparung (Querformat)</span><span class="block text-[11px] text-slate-400">Aus = Inhalt füllt den ganzen Bildschirm bis zum Rand (Standard). An = links/rechts bleibt Platz, falls dein Handy eine Kamera-Aussparung an der Seite hat.</span></span></label>
        <div><button type="button" data-ly-check class="w-full py-2.5 text-sm font-bold rounded-xl border border-slate-700 bg-slate-900 text-slate-200">Anzeige prüfen &amp; korrigieren</button><pre data-ly-out class="hidden mt-2 text-[11px] leading-5 text-slate-300 bg-slate-950 rounded-lg p-2.5 whitespace-pre-wrap select-text"></pre></div>
      </div>`;
    ph.addEventListener('change', e => { if (e.target.matches('[data-ly-cut]')) { st.cutout = e.target.checked; save(); apply(); setTimeout(guard, 50); } });
    ph.addEventListener('click', e => {
      if (!e.target.closest('[data-ly-check]')) return;
      const was = guard(); const m = measure(), out = ph.querySelector('[data-ly-out]');
      out.textContent = Object.entries(m).map(([k, v]) => k + ': ' + v).join('\n') + (was ? '\n→ Seite war verschoben und wurde zurückgesetzt.' : '\n→ Ausrichtung in Ordnung.');
      out.classList.remove('hidden');
    });
  }
  SunDOM.mount('ly-sec', ph => section(ph));

  window.Layout = { get: () => Object.assign({}, st), set: p => { Object.assign(st, p); save(); apply(); guard(); }, guard, measure, _fixes: () => fixes };
})();
