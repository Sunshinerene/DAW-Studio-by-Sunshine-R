/* ===== Sunshine@R · Dockbar-Effekte =====
   Derselbe Musik-Effekt wie am Cover, aber um die ganze Dockbar (DAW, Player, Startseite) – getrennt einstellbar in Optionen → Effekte & Anzeige.
   Standard: aus. Eigene Werte: Effekt, Stärke, Bewegung (Zur Musik · Animiert · Starr), Farbe, Größe, Helligkeit, Transparenz, Tempo, Linienstärke. */
(function () {
  'use strict';
  if (!window.Cover || !Cover.rim) return;
  const { clamp } = window.SunUtil, LS = 'sunshine.dockfx';
  const D = { on: false, fx: 'glow', gain: 'norm', reach: 100, bright: 100, trans: 0, speed: 100, thick: 100, color: 'theme', mode: 'music', daw: true, player: true, home: true };
  SunStore.merge(D, LS); Cover.cleanCfg(D); D.on = D.on === true; ['daw', 'player', 'home'].forEach(k => { D[k] = D[k] !== false; });
  const save = () => SunStore.save(LS, D);
  const HOSTS = [['daw', '#bottom-nav'], ['player', '#pl-dock'], ['home', '#hm-dock']];
  const homeOpen = () => { try { return !!(window.Home && Home.isOpen && Home.isOpen()); } catch (_) { return false; } };
  const plOpen = () => { try { return !!(window.Player && Player.isOpen && Player.isOpen()); } catch (_) { return false; } };
  const plPlaying = () => { try { const s = window.Player && Player.state && Player.state(); return !!(s && s.playing); } catch (_) { return false; } };
  const dawPlaying = () => { try { return typeof dawState !== 'undefined' && !!dawState.isPlaying; } catch (_) { return false; } };
  const visible = k => k === 'home' ? homeOpen() : k === 'player' ? plOpen() : (!homeOpen() && !plOpen());
  let buf = null;
  const data = () => {
    if (dawPlaying()) { try { const an = Cover.analyser(); if (an) { if (!buf || buf.length !== an.frequencyBinCount) buf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(buf); return buf; } } catch (_) {} }
    try { return window.PlSound ? PlSound.coverData() : null; } catch (_) { return null; }
  };
  const live = () => dawPlaying() || plPlaying();
  const rims = new Map();   // Schlüssel → Rim
  function sync() {
    { const v = D.on && D.daw ? 'on' : 'off', h = document.documentElement; if (h.getAttribute('data-dockfx') !== v) h.setAttribute('data-dockfx', v); }
    HOSTS.forEach(([k, sel]) => {
      const el = document.querySelector(sel), r = rims.get(k), want = D.on && D[k] && !!el;
      if (r && (!want || r.host !== el || !r.host.isConnected || !r.canvas.isConnected)) { r.destroy(); rims.delete(k); }
      if (want && !rims.get(k)) rims.set(k, Cover.rim(el, { cfg: () => D, live, data, pad: k === 'daw' ? 7 : 8, visible: () => visible(k) }));
    });
  }
  function apply(final) { sync(); rims.forEach(r => r.refresh()); if (pvRim) pvRim.refresh(); if (final) save(); }
  let pvRim = null;
  if (window.SunPerf) SunPerf.heavy(() => D.on && D.mode !== 'static' && D.fx !== 'off' && !document.hidden);
    SunTick.every(700, sync);
  document.addEventListener('sunshine-tpdock', () => setTimeout(() => { sync(); rims.forEach(r => r.refresh()); }, 120));

  /* ---------- Optionen ---------- */
  function section(ph) {
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Dockbar-Effekt</div><div class="rounded-xl border border-slate-800 p-3 space-y-3" data-dfx>
      <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-df-on class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Effekt an den Dockbars</span><span class="block text-[11px] leading-4 text-slate-400">Derselbe Effekt wie am Cover, aber um die Leisten am unteren Rand. Getrennt vom Cover einstellbar – standardmäßig aus.</span></span></label>
      <div data-df-body>
        <div class="dfx-where" role="group" aria-label="Wo anzeigen">${[['daw', 'DAW'], ['player', 'Player'], ['home', 'Startseite']].map(([k, l]) => `<label class="dfx-chk"><input type="checkbox" data-df-where="${k}"><span>${l}</span></label>`).join('')}</div>
        <div class="text-sm font-semibold mt-3 mb-1.5">Effekt</div><div class="dfx-pv" data-df-pv aria-hidden="true"><span></span><span></span><span class="dfx-big"></span><span></span><span></span></div>
        <div class="mt-2">${Cover.ui.chips('df')}</div><div class="text-[11px] leading-4 text-slate-400 mt-1 mb-3">Die Vorschau läuft mit einem Beispiel-Beat (bei „Starr“ steht sie still).</div>
        <div class="space-y-3">${Cover.ui.html('df')}</div>
      </div></div>`;
    const on = ph.querySelector('[data-df-on]'), body = ph.querySelector('[data-df-body]'), pv = ph.querySelector('[data-df-pv]');
    const marks = () => { on.checked = D.on; body.style.opacity = D.on ? '' : '.55'; ph.querySelectorAll('[data-df-where]').forEach(c => { c.checked = D[c.dataset.dfWhere] !== false; }); };
    if (pvRim) { try { pvRim.destroy(); } catch (_) {} }
    pvRim = Cover.rim(pv, { cfg: () => Object.assign({}, D, { on: true }), demo: true, pad: 7 });
    let sv = 0;
    Cover.ui.wire(ph, 'df', D, final => { if (final) { clearTimeout(sv); apply(true); } else { clearTimeout(sv); sv = setTimeout(() => apply(true), 250); apply(false); } });
    marks();
    ph.addEventListener('change', e => {
      if (e.target === on) { D.on = on.checked; marks(); apply(true); }
      else if (e.target.matches('[data-df-where]')) { D[e.target.dataset.dfWhere] = e.target.checked; apply(true); }
    });
    setTimeout(() => { pvRim && pvRim.refresh(); }, 80);
  }
  SunDOM.mount('dfx-sec', ph => section(ph));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
  window.DockFx = { get: () => Object.assign({}, D), set: (p) => { Object.assign(D, p); Cover.cleanCfg(D); apply(true); }, rims: () => [...rims.keys()], needs: () => { const o = {}; rims.forEach((r, k) => { o[k] = r.needs(); }); return o; }, apply };
})();
