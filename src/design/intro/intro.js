/* ===== Sunshine@R · Start-Intro (Video beim App-Start, in den Optionen abschaltbar und jederzeit ansehbar) ===== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const LS = 'sunshine.intro', SRC = 'assets/intro.mp4', POSTER = 'assets/intro-poster.jpg';
  let S = { on: true, sound: true };
  try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (_) {} };
  const say = (m, k) => { try { if (typeof toast === 'function') toast(m, k); } catch (_) {} };
  const svg = p => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const ICON = { on: '<path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>', off: '<path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/>', next: '<path d="m5 4 10 8-10 8V4z" fill="currentColor"/><path d="M19 5v14"/>' };
  let root = null, vid = null, wd = null, manual = false, closing = false;

  function sndBtn() { const b = root && root.querySelector('[data-in=snd]'); if (!b) return; const m = vid.muted; b.innerHTML = svg(m ? ICON.off : ICON.on); b.setAttribute('aria-label', m ? 'Ton einschalten' : 'Ton ausschalten'); }
  function close() {
    if (!root || closing) return; closing = true; clearTimeout(wd);
    const r = root, v = vid; r.classList.add('out');
    setTimeout(() => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {} try { r.remove(); } catch (_) {} if (root === r) { root = null; vid = null; } closing = false; }, 280);
  }
  async function start() {
    vid.muted = !S.sound;
    try { await vid.play(); }
    catch (e) {
      if (e && e.name === 'NotAllowedError' && !vid.muted) { vid.muted = true; try { await vid.play(); } catch (_) { fail(); return; } }   // Ton nicht erlaubt → stumm starten, Ton-Taste bietet „Ton an“
      else if (e && e.name !== 'AbortError') { fail(); return; }
    }
    sndBtn();
  }
  function fail() { if (manual) say('Das Intro-Video lässt sich nicht abspielen.', 'warn'); close(); }
  function show(isManual) {
    if (root) return false;
    manual = !!isManual; closing = false;
    if (manual) { try { if (window.Player) Player.pause(); } catch (_) {} try { if (typeof dawState !== 'undefined' && dawState.isPlaying) audioEngine.stop(false); } catch (_) {} }
    root = document.createElement('div'); root.id = 'in-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Intro');
    root.innerHTML = '<video playsinline webkit-playsinline preload="auto" poster="' + POSTER + '" disablepictureinpicture></video>' +
      '<button type="button" class="in-b in-snd" data-in="snd"></button><button type="button" class="in-b in-skip" data-in="skip"><span>Überspringen</span>' + svg(ICON.next) + '</button>';
    vid = root.querySelector('video'); vid.src = SRC;
    root.addEventListener('click', e => { const b = e.target.closest('[data-in]'); if (!b) return; if (b.dataset.in === 'skip') close(); else { vid.muted = !vid.muted; sndBtn(); } });
    vid.addEventListener('ended', close);
    vid.addEventListener('error', fail);
    vid.addEventListener('playing', () => clearTimeout(wd));
    document.body.appendChild(root); sndBtn();
    wd = setTimeout(() => { if (vid && (vid.paused || vid.readyState < 3)) fail(); }, 7000);   // hängt das Video, kommt die App trotzdem
    start();
    return true;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root) { close(); e.stopPropagation(); } }, true);
  document.addEventListener('visibilitychange', () => { if (!vid) return; if (document.hidden) { try { vid.pause(); } catch (_) {} } else { try { vid.play().catch(() => {}); } catch (_) {} } });

  function section(ph) {
    ph.innerHTML = '<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Start-Intro</div><div class="rounded-xl border border-slate-800 p-3 space-y-2.5">' +
      '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-in-on class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Intro beim App-Start abspielen</span><span class="block text-[11px] leading-4 text-slate-400">Kurzes Video (10 Sekunden) beim Öffnen der App. Mit „Überspringen“ oder der Zurück-Taste sofort beendet.</span></span></label>' +
      '<label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-in-snd class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Mit Ton</span><span class="block text-[11px] leading-4 text-slate-400">Aus = das Intro läuft stumm.</span></span></label>' +
      '<button type="button" data-in-play class="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">▶ Intro jetzt ansehen</button></div>';
    const a = ph.querySelector('[data-in-on]'), b = ph.querySelector('[data-in-snd]'); a.checked = !!S.on; b.checked = !!S.sound;
    ph.addEventListener('change', e => { if (e.target === a) S.on = a.checked; else if (e.target === b) S.sound = b.checked; else return; save(); });
    ph.addEventListener('click', e => { if (e.target.closest('[data-in-play]')) { const m = $('settings-modal'); if (m) m.remove(); show(true); } });
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ph = n.id === 'in-sec' ? n : (n.querySelector && n.querySelector('#in-sec')); if (ph && !ph.dataset.done) { ph.dataset.done = '1'; section(ph); } }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  /* Automatisch nur einmal pro App-Start (nicht bei jedem Neuladen der Seite) und nie in automatisierten Tests */
  function auto() {
    try {
      if (!S.on) return;
      if (navigator.webdriver && !localStorage.getItem('sunshine.intro.test')) return;
      if (sessionStorage.getItem('sunshine.intro.done')) return;
      sessionStorage.setItem('sunshine.intro.done', '1');
    } catch (_) {}
    show(false);
  }
  if (document.body) auto(); else document.addEventListener('DOMContentLoaded', auto);

  window.Intro = { show: () => show(true), close, isOpen: () => !!root, settings: () => Object.assign({}, S), video: () => vid, src: SRC };
})();
