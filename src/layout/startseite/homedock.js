/* Sunshine@R · Bedienleiste für Player und DAW (1.27, erweitert 1.29)
   Ein Baustein, drei Orte:
   · Startseite – Dockbar unten, sobald etwas läuft; steuert Player ODER DAW (je nachdem, was läuft), mit Cover + Equalizer darüber.
   · DAW – dritte Seite der unteren Leiste („Player“): die Bedienung des Players 1:1. Startet der Player, springt die Leiste dorthin,
     startet die DAW, zurück zum DAW-Transport; per Wischen jederzeit erreichbar.
   Icons stammen aus dem Player (eine Quelle), damit überall dasselbe Zeichen steht. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const P = () => window.Player || null, SND = () => window.PlSound || null;
  const dsx = () => { try { return typeof dawState !== 'undefined' ? dawState : null; } catch (_) { return null; } };
  const fmt = s => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const ic = (k, w) => { try { return P() && P().svg ? P().svg(k, w) : ''; } catch (_) { return ''; } };
  const setT = (n, t) => { if (n && n.textContent !== t) n.textContent = t; };

  const CSS = `
html{--dk-seek:18px;--dk-ic:40px;--dk-play:48px;--dk-pane:68px}
.hm-dock{position:absolute;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom,0px));max-width:620px;margin:0 auto;padding:6px 10px 10px;z-index:6;color:#eef1ff}
.hm-dock[hidden]{display:none}
.hm-dock.hd-in{animation:hd-in .4s cubic-bezier(.2,.9,.2,1)}
@keyframes hd-in{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.hd{color:#eef1ff}
.hd .hd-top{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 2px}
.hd .hd-open{flex:1;min-width:0;text-align:left;background:none;border:0;color:inherit;padding:2px 0;min-height:40px}
.hd .hd-open b{display:block;font-size:14px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hd .hd-open small{display:block;font-size:11px;color:rgba(255,255,255,.66);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hd .hd-src{flex:none;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid var(--td-line);color:var(--td-dot)}
.hd .hd-x{flex:none;width:36px;height:36px;border-radius:50%;border:0;background:none;color:rgba(255,255,255,.6);font-size:16px}
.hd .hd-seek{display:flex;align-items:center;gap:8px;height:var(--dk-seek);font-size:11px;color:rgba(255,255,255,.72);font-variant-numeric:tabular-nums}
.hd .hd-seek input{flex:1;margin:0;min-width:0}
.hd .hd-ctl{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:2px 0 0;padding:0 4px;height:var(--dk-play)}
.hd .hd-ic{position:relative;width:var(--dk-ic);height:var(--dk-ic);border-radius:50%;border:0;background:none;color:#eef1ff;display:grid;place-items:center;flex:none}
.hd .hd-ic[aria-pressed=true]{color:var(--td-dot,rgb(var(--daw-accent)));background:rgb(var(--daw-accent)/.16)}
.hd .hd-ic b{position:absolute;right:8px;bottom:6px;font-size:10px;line-height:1;color:var(--td-dot,rgb(var(--daw-accent)))}
.hd .hd-play{width:var(--dk-play);height:var(--dk-play);border-radius:50%;border:0;background:var(--td-dot,rgb(var(--daw-accent)));color:#10131c;display:grid;place-items:center;box-shadow:0 4px 16px var(--td-glow,rgb(var(--daw-accent)/.4));flex:none}
html[data-theme=studio] .hd .hd-play{border-radius:14px}
html[data-theme=studio] .hd .hd-ic{border-radius:10px}
html[data-theme=neon] .hd .hd-play{background:linear-gradient(135deg,#8a3dff,#19c3ff);color:#fff}
html[data-theme=liquid] .hd .hd-play{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.18));color:#fff;border:1px solid rgba(255,255,255,.4)}
.hd button:active{transform:scale(.94)}
/* Variante in der unteren DAW-Leiste (dritte Seite): gleiche Maße wie überall, ohne Titelzeile */
.hd-pane{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;padding:0 2px}
.hd-pane .hd-top{display:none}
.hd-pane .hd-seek{padding:0 6px}
.hd-pane .hd-ctl{margin:2px 0 0;padding:0}
.hd-pane .hd-idle{flex:1;min-width:0;min-height:0;padding:0;text-align:center;background:none;border:0;color:rgba(255,255,255,.78);font-size:12px;font-weight:700;height:100%}
.hd-pane.hd-none .hd-seek input,.hd-pane.hd-none .hd-cur,.hd-pane.hd-none .hd-dur{display:none}
.hd-pane:not(.hd-none) .hd-idle{display:none}
/* Startseite: Titelzeile unter dem Cover */
.hm-cap{position:absolute;left:0;right:0;bottom:0;height:30px;display:flex;align-items:center;gap:8px;justify-content:center;padding:0 14px;z-index:3;pointer-events:auto}
.hm-cap .hd-src{flex:none;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:999px;border:1px solid var(--td-line);color:var(--td-dot)}
.hm-cap .hd-open{flex:0 1 auto;min-width:0;max-width:100%;text-align:center;background:none;border:0;color:#eef1ff;padding:0;display:flex;align-items:baseline;gap:8px;min-height:30px}
.hm-cap .hd-open b{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.hm-cap .hd-open small{font-size:11px;color:rgba(255,255,255,.62);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto}
.hm-cap .hd-x{flex:none;width:30px;height:30px;border-radius:50%;border:0;background:none;color:rgba(255,255,255,.6);font-size:14px}
`;
  const st = document.createElement('style'); st.id = 'hmdock-css'; st.textContent = CSS; document.head.appendChild(st);

  const dawOn = () => { const d = dsx(); return !!(d && d.isPlaying); };
  const plState = () => { try { return P() && P().state(); } catch (_) { return null; } };
  const dawTotal = () => { try { return audioEngine.getTotalArrangementBars() * 4 * 60 / (dsx().bpm || 120); } catch (_) { return 0; } };
  let gk = '', gcv = '';
  function info(m) {
    if (m === 'daw') {
      const d = dsx(), p = d && d.project; let cv0 = (p && p.cover) || '';
      if (!cv0) { const k = (p && p.name) || 'Projekt'; if (gk !== k) { gk = k; gcv = ''; try { if (window.Cover && Cover.generate) gcv = Cover.generate({ title: k, artist: '' }).cover; } catch (_) {} } cv0 = gcv; }
      return { title: (p && p.name) || 'Projekt', sub: 'In der DAW', cover: cv0, src: 'DAW' };
    }
    const c = P() && P().current && P().current(); return { title: c ? c.title : '', sub: c ? c.sub : '', cover: c ? c.cover : '', src: 'Player' };
  }

  /* ---------- Baustein ---------- */
  function ctlHtml(m) {
    if (m === 'daw') return '<button type="button" class="hd-ic" data-hd="loop" aria-label="Wiederholen (Loop)" aria-pressed="false">' + ic('repeat') + '</button><button type="button" class="hd-ic" data-hd="start" aria-label="Zum Anfang">' + ic('start', 24) + '</button>' +
      '<button type="button" class="hd-play" data-hd="toggle" aria-label="Abspielen"></button><button type="button" class="hd-ic" data-hd="stop" aria-label="Stopp">' + ic('stop', 22) + '</button><button type="button" class="hd-ic" data-hd="metro" aria-label="Metronom" aria-pressed="false">' + ic('metro') + '</button>';
    return '<button type="button" class="hd-ic" data-hd="shuffle" aria-label="Zufall" aria-pressed="false">' + ic('shuffle') + '</button><button type="button" class="hd-ic" data-hd="prev" aria-label="Zurück">' + ic('prev', 26) + '</button>' +
      '<button type="button" class="hd-play" data-hd="toggle" aria-label="Abspielen"></button><button type="button" class="hd-ic" data-hd="next" aria-label="Weiter">' + ic('next', 26) + '</button><button type="button" class="hd-ic" data-hd="repeat" aria-label="Wiederholen" aria-pressed="false">' + ic('repeat') + '<b class="hd-rep1" hidden>1</b></button>';
  }
  function createCtl(o) {
    o = o || {}; const el = document.createElement('div'); el.className = 'hd' + (o.pane ? ' hd-pane' : '');
    const topHtml = '<span class="hd-src"></span><button type="button" class="hd-open"><b class="hd-title"></b><small class="hd-sub"></small></button><button type="button" class="hd-x" aria-label="Leiste ausblenden">✕</button>';
    let top = null;
    if (o.capHost) { top = document.createElement('div'); top.className = 'hm-cap'; top.innerHTML = topHtml; o.capHost.appendChild(top); }
    el.innerHTML = (top ? '' : '<div class="hd-top">' + topHtml + '</div>') +
      '<div class="hd-seek"><span class="hd-cur">0:00</span><input type="range" class="daw-slider hd-sk" min="0" max="1000" value="0" step="1" aria-label="Position"><span class="hd-dur">–:––</span><button type="button" class="hd-idle hd-open" hidden>Player öffnen</button></div><div class="hd-ctl"></div>';
    const q = s => (top && top.querySelector(s)) || el.querySelector(s), c = { el, mode: '', shown: '', seeking: false, o, top };
    if (o.ids) { q('.hd-src').id = 'hd-src'; q('.hd-open').id = 'hd-open'; q('.hd-title').id = 'hd-title'; q('.hd-sub').id = 'hd-sub'; q('.hd-x').id = 'hd-x'; q('.hd-cur').id = 'hd-cur'; q('.hd-sk').id = 'hd-seek'; q('.hd-dur').id = 'hd-dur'; q('.hd-ctl').id = 'hd-ctl'; }
    const sk = q('.hd-sk');
    sk.addEventListener('pointerdown', () => { c.seeking = true; }); sk.addEventListener('pointerup', () => { c.seeking = false; }); sk.addEventListener('change', () => { c.seeking = false; });
    sk.addEventListener('input', () => {
      const r = sk.value / 1000;
      if (c.mode === 'player') { const s = plState(); if (s && isFinite(s.dur) && s.dur > 0) P().seek(r * s.dur); }
      else if (c.mode === 'daw') { const t = dawTotal(); if (t > 0) { try { audioEngine.seek(r * t); } catch (_) {} } }
      sk.style.setProperty('--pl-p', (sk.value / 10) + '%');
    });
    const onClick = e => {
      const b = e.target.closest('[data-hd]'), op = e.target.closest('.hd-open'), x = e.target.closest('.hd-x');
      if (x) { if (c.o.onClose) c.o.onClose(); return; }
      if (op) { if (c.mode === 'daw') { if (c.o.onOpenDaw) c.o.onOpenDaw(); } else { try { P().open(); } catch (_) {} } return; }
      if (!b) return; const a = b.dataset.hd;
      if (c.mode === 'player') {
        const p = P(); if (!p) return;
        if (a === 'toggle') p.toggle(); else if (a === 'next') p.next(); else if (a === 'prev') p.prev(); else if (a === 'shuffle') p.shuffle(); else if (a === 'repeat') p.repeat();
      } else if (c.mode === 'daw') {
        if (a === 'toggle') { const t = $('btn-play'); if (t) t.click(); } else if (a === 'stop') { const t = $('btn-stop'); if (t) t.click(); }
        else if (a === 'loop') { const t = $('btn-loop'); if (t) t.click(); } else if (a === 'metro') { const t = $('btn-metronome'); if (t) t.click(); }
        else if (a === 'start') { try { audioEngine.seek(0); } catch (_) {} }
      }
      setTimeout(() => c.render(c.mode), 60);
    };
    el.addEventListener('click', onClick); if (top) top.addEventListener('click', onClick);
    c.render = function (m) {
      if (!m) return; c.mode = m;
      if (c.shown !== m) { q('.hd-ctl').innerHTML = ctlHtml(m); c.shown = m; }
      const i = info(m), none = m === 'player' && !i.title;
      setT(q('.hd-src'), i.src); setT(q('.hd-title'), i.title || (m === 'player' ? 'Player' : 'Projekt')); setT(q('.hd-sub'), none ? 'Noch kein Titel – hier öffnen' : (i.sub || ''));
      if (c.o.pane) { el.classList.toggle('hd-none', none); const idl = el.querySelector('.hd-idle'); if (idl) idl.hidden = !none; }
      const playing = m === 'daw' ? dawOn() : !!(plState() && plState().playing), pb = q('[data-hd=toggle]');
      if (pb && pb.dataset.k !== (playing ? 'p' : 'n')) { pb.dataset.k = playing ? 'p' : 'n'; pb.innerHTML = ic(playing ? 'pause' : 'play', c.o.pane ? 24 : 30); pb.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen'); }
      const cur = q('.hd-cur'), dur = q('.hd-dur');
      if (m === 'player') {
        const s = plState() || {}, au = P() && P().audio, t = au ? au.currentTime : 0, d = s.dur, ok = isFinite(d) && d > 0;
        if (!c.seeking) { sk.value = ok ? Math.round(t / d * 1000) : 0; setT(cur, fmt(t)); } setT(dur, ok ? fmt(d) : '–:––'); sk.disabled = !ok;
        const sh = q('[data-hd=shuffle]'), rp = q('[data-hd=repeat]'); if (sh) sh.setAttribute('aria-pressed', String(!!s.shuffle)); if (rp) { rp.setAttribute('aria-pressed', String(s.repeat !== 'off' && !!s.repeat)); const r1 = q('.hd-rep1'); if (r1) r1.hidden = s.repeat !== 'one'; }
      } else {
        const d = dsx(), t = (d && d.playheadSec) || 0, tot = dawTotal();
        if (!c.seeking) { sk.value = tot > 0 ? Math.round(Math.min(1, t / tot) * 1000) : 0; setT(cur, fmt(t)); } setT(dur, tot > 0 ? fmt(tot) : '–:––'); sk.disabled = !(tot > 0);
        const lp = q('[data-hd=loop]'), me = q('[data-hd=metro]'); if (lp) lp.setAttribute('aria-pressed', String(!!(d && d.isLooping))); if (me) me.setAttribute('aria-pressed', String(!!(d && d.metronomeOn)));
      }
      sk.style.setProperty('--pl-p', (sk.value / 10) + '%');
    };
    return c;
  }

  /* ---------- Startseite ---------- */
  let root = null, hctl = null, dock = null, stage = null, cvb = null, cv = null, mode = '', last = '', dismissed = false, shownMode = '', sig = '';
  function compute() {
    const d = dsx(), ps = plState();
    if (dawOn()) { last = 'daw'; dismissed = false; return 'daw'; }
    if (ps && ps.playing) { last = 'player'; dismissed = false; return 'player'; }
    if (dismissed) return '';
    if (last === 'daw' && d && (d.playheadSec || 0) > 0.05) return 'daw';
    if (last === 'player' && ps && ps.count > 0 && ps.idx >= 0) return 'player';
    return '';
  }
  function build() {
    if (dock || !root) return;
    hctl = createCtl({ ids: true, capHost: $('hm-stage'), onClose() { if (mode === 'player') { try { P().pause(); } catch (_) {} } else if (mode === 'daw' && dawOn()) { const s = $('btn-stop'); if (s) s.click(); } dismissed = true; tick(); }, onOpenDaw() { if (window.Home && Home.close && $('hm-back') && !$('hm-back').hidden) Home.close(); } });
    dock = hctl.el; dock.classList.add('hm-dock'); dock.id = 'hm-dock'; dock.hidden = true; dock.setAttribute('role', 'group'); dock.setAttribute('aria-label', 'Wiedergabe');
    root.appendChild(dock); stage = $('hm-stage'); cv = $('hm-viz');
  }
  function stageSetup() { if (!stage || !cv) return; if (!cvb && window.Cover && Cover.bind) { cvb = Cover.bind($('hm-cvhost'), { size: 140, data: coverData, live: () => liveNow() }); cvb.el.classList.add('hd-cvb'); } }
  const liveNow = () => (mode === 'daw' ? dawOn() : mode === 'player' ? !!(plState() && plState().playing) : false);
  let dbuf = null, xbuf = null;
  function coverData() {
    if (mode === 'daw') { try { const an = audioEngine.masterAnalyser; if (!an) return null; if (!dbuf || dbuf.length !== an.frequencyBinCount) dbuf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(dbuf); return dbuf; } catch (_) { return null; } }
    try { return SND() ? SND().coverData() : null; } catch (_) { return null; }
  }
  const ext = () => { const an = audioEngine.masterAnalyser; if (!an) return null; if (!xbuf || xbuf.length !== an.frequencyBinCount) xbuf = new Uint8Array(an.frequencyBinCount); return { an, buf: xbuf, sr: audioEngine.ctx ? audioEngine.ctx.sampleRate : 44100 }; };
  function attachViz() {
    const s = SND(); if (!s || !cv) return; if (P() && P().isOpen && P().isOpen()) return;
    const want = mode === 'daw' ? ext : null, V = s.view();
    if (V.c !== cv || (V.ext || null) !== want) s.attach(cv, () => liveNow() && (mode === 'daw' || s.active()), want);
  }
  function fit() {
    if (!stage || !cvb) return; const w = root.clientWidth || 360; let reach = 100; try { reach = Cover.settings().reach; } catch (_) {}
    const px = Math.max(64, Math.min(96, Math.floor((w - 40) / (1 + 0.2 * reach / 100)), Math.round(window.innerHeight * 0.115))); cvb.size(px);
    const total = cvb.el.offsetHeight || px + 24; const sh = Math.round(total + 32); stage.style.setProperty('--hs-h', sh + 'px'); root.style.setProperty('--hs-h', sh + 'px');
  }
  function tick() {
    if (!root || root.hidden) return; build(); if (!dock) return;
    const m = compute(), changed = m !== mode; mode = m;
    const on = !!m; dock.hidden = !on; root.classList.toggle('hm-hasdock', on);
    if (stage) { stage.hidden = !on; stage.classList.toggle('on', on); }
    if (!on) { root.style.removeProperty('--hd-h'); root.style.removeProperty('--hs-h'); shownMode = ''; return; }
    if (shownMode !== m) { shownMode = m; dock.classList.remove('hd-in'); void dock.offsetWidth; dock.classList.add('hd-in'); stageSetup(); }
    hctl.render(m); const i = info(m);
    if (cvb) { cvb.set(i.cover || ''); attachViz(); const k = m + '|' + root.clientWidth + '|' + window.innerHeight; if (k !== sig || changed) { sig = k; fit(); } try { cvb.wake(); } catch (_) {} const s = SND(); if (s) s.wake(); }
    const h = dock.offsetHeight; if (h && root.style.getPropertyValue('--hd-h') !== h + 'px') root.style.setProperty('--hd-h', h + 'px');
  }

  /* ---------- Untere DAW-Leiste: Seite „Player“ ---------- */
  const panes = new Set();
  function mountPane(host) { const c = createCtl({ pane: true }); host.appendChild(c.el); panes.add(c); c.render('player'); return c; }
  function unmountPane(c) { if (!c) return; panes.delete(c); try { c.el.remove(); } catch (_) {} }

  /* Wer läuft, bestimmt die Seite der unteren Leiste: Player startet → Player-Seite, DAW startet → DAW-Transport */
  let wp = false, wd = false, first = true;
  function watch() {
    const ps = plState(), pp = !!(ps && ps.playing), dp = dawOn();
    if (!first && window.TpDock && TpDock.state && TpDock.state().docked) { if (pp && !wp) TpDock.go('pl'); else if (dp && !wd) TpDock.go('tp'); }
    wp = pp; wd = dp; first = false;
  }

  window.HmDock = {
    onOpen(r) { root = r; build(); tick(); }, onClose() { },
    mountPane, unmountPane, panes: () => panes.size,
    mode: () => mode, tick, state: () => ({ mode, visible: !!(dock && !dock.hidden), last, dismissed }),
    _reset() { last = ''; dismissed = false; mode = ''; tick(); }
  };
  window.addEventListener('resize', () => { sig = ''; });
  setInterval(() => { try { watch(); root = root || $('home-root'); if (root && !root.hidden) tick(); panes.forEach(c => { if (c.el.isConnected) c.render('player'); }); } catch (e) { console.warn('[HmDock]', e); } }, 250);
})();
