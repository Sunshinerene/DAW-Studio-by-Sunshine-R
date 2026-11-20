/* ===== Sunshine@R: Spur-Großansicht mit Clip-Werkzeugen ===== */
(function () {
  'use strict';
  if (!window.ClipModel) return;
  const CM = window.ClipModel;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (_) {} };
  const push = () => { try { window.__dawPushUndo && window.__dawPushUndo(); } catch (_) {} };

  const E = { open: false, id: null, tool: 'move', sel: null, multi: [], multiMode: false, mode: 'clips', param: 'vol', apSel: null, snap: 'beat', pps: 40, view: 0, dirty: true, drag: null, pointers: new Map(), pinch: null, resetArmed: false };
  const RULER = 30, EDGE = 22;
  let root, cv, cx, raf = 0, ro = null;

  const track = () => dawState.tracks.find(t => t.id === E.id) || null;
  const barSec = () => 4 * 60 / dawState.bpm, beatSec = () => 60 / dawState.bpm;
  const snapStep = () => ({ off: 0, bar: barSec(), beat: beatSec(), eighth: beatSec() / 2, sixteenth: beatSec() / 4 }[E.snap] || 0);
  const snapT = t => { const s = snapStep(); return s ? Math.round(t / s) * s : t; };
  const xToT = x => E.view + x / E.pps, tToX = t => (t - E.view) * E.pps;
  const totalSec = () => { const t = track(); const e = t && CM.isAud(t) ? CM.end(t) : 0; return Math.max(audioEngine.getTotalArrangementBars() * barSec(), e + barSec() * 2); };
  const fmtPos = t => { const b = Math.floor(t / barSec()), r = t - b * barSec(); return `${b + 1}.${Math.floor(r / beatSec()) + 1}`; };
  const fmtSec = t => t.toFixed(2) + ' s';

  /* ------------------------------------------------------------------ Aufbau */
  const CE_CSS = `
#clip-editor[hidden]{display:none!important}
body.ce-open #toast-container,body.ce-open #toast-container *{pointer-events:none!important}
body.ce-open #toast-container>:not(:last-child){display:none!important}
#clip-editor{position:fixed;inset:0;z-index:125;background:#070b14;color:#e2e8f0;display:flex;flex-direction:column}
#clip-editor .ce-row{display:flex;gap:6px;align-items:center;padding:6px 10px;flex-wrap:wrap}
#clip-editor .ce-btn{min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#e2e8f0;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
#clip-editor .ce-btn:disabled{opacity:.35}
#clip-editor .ce-btn[aria-pressed="true"]{background:rgba(var(--acc-rgb,255,170,40),.24);border-color:rgba(var(--acc-rgb,255,170,40),.85);color:#fff3dc}
#clip-editor .ce-sep{width:1px;height:28px;background:rgba(255,255,255,.14);margin:0 2px}
#clip-editor select{min-height:44px;border-radius:12px;background:#0f172a;border:1px solid rgba(255,255,255,.16);color:#e2e8f0;padding:0 10px;font-size:13px}
#clip-editor .ce-wrap{position:relative;flex:1;min-height:180px;margin:0 8px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#0b1220}
#clip-editor canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
#clip-editor .ce-info{padding:4px 12px;font-size:11px;color:#94a3b8;min-height:28px}
#clip-editor .ce-msg[hidden]{display:none!important}
#clip-editor .ce-scroll{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
#clip-editor .ce-scroll::-webkit-scrollbar{display:none}
#clip-editor .ce-scroll>*{flex:none}
#clip-editor .ce-tools3 .ce-btn{flex:1 0 auto}
#clip-editor .ce-props[hidden]{display:none!important}
#clip-editor[data-mode="auto"] .ce-clipui{display:none!important}
#clip-editor:not([data-mode="auto"]) .ce-autoui{display:none!important}
#clip-editor .ce-modes .ce-btn{flex:1 1 0}
#clip-editor[data-mode="auto"] #ce-reset{display:none!important}
#clip-editor .ce-props{border-top:1px solid rgba(255,255,255,.08);gap:10px}
#clip-editor .ce-props label{display:flex;flex-direction:column;gap:2px;font-size:10px;color:#94a3b8;min-width:96px;flex:1 1 96px}
#clip-editor .ce-props label b{color:#fde68a;font-weight:700}
#clip-editor .ce-props input[type=range]{width:100%;min-height:28px}
#clip-editor .ce-msg{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;text-align:center;padding:20px;color:#94a3b8;font-size:13px}
`;
  function build() {
    if (root) return;
    const st = document.createElement('style'); st.id = 'ce-style'; st.textContent = CE_CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'clip-editor'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Spur bearbeiten');
    const B = (a, ic, tx, extra) => `<button type="button" class="ce-btn" data-ce="${a}" ${extra || ''}><span aria-hidden="true">${ic}</span><span>${tx}</span></button>`;
    const T = (a, ic, tx) => `<button type="button" class="ce-btn" data-ce-tool="${a}" aria-pressed="false"><span aria-hidden="true">${ic}</span><span>${tx}</span></button>`;
    const MD = (a, ic, tx) => `<button type="button" class="ce-btn" data-ce-mode="${a}" aria-pressed="false"><span aria-hidden="true">${ic}</span><span>${tx}</span></button>`;
    const PR = (a, ic, tx) => `<button type="button" class="ce-btn" data-ce-param="${a}" aria-pressed="false"><span aria-hidden="true">${ic}</span><span>${tx}</span></button>`;
    root.innerHTML = `
      <div class="ce-row" style="border-bottom:1px solid rgba(255,255,255,.1)">
        <button type="button" class="ce-btn" data-ce="prev" aria-label="Vorherige Spur">◀</button>
        <select id="ce-track" aria-label="Spur wählen" style="flex:1 1 140px;min-width:0"></select>
        <button type="button" class="ce-btn" data-ce="next" aria-label="Nächste Spur">▶</button>
        <button type="button" class="ce-btn" data-ce="mute" id="ce-m" aria-pressed="false" aria-label="Stumm">M</button>
        <button type="button" class="ce-btn" data-ce="solo" id="ce-s" aria-pressed="false" aria-label="Solo">S</button>
        <input id="ce-vol" type="range" min="0" max="1.25" step="0.01" class="daw-slider" aria-label="Lautstärke" style="flex:1 1 70px;min-width:60px;max-width:140px">
        <button type="button" class="ce-btn" data-ce="close" aria-label="Schließen" style="margin-left:auto">✕</button>
      </div>
      <div class="ce-row ce-modes" id="ce-modes">${MD('clips', '🎞', 'Clips')}${MD('auto', '∿', 'Automation')}</div>
      <div class="ce-row ce-tools3 ce-scroll ce-clipui" id="ce-tools">${T('move', '☝️', 'Verschieben')}${T('trim', '↔️', 'Zuschneiden')}${T('split', '✂️', 'Teilen')}${T('loop', '🔁', 'Schleife')}</div>
      <div class="ce-row ce-scroll ce-autoui" id="ce-autorow">${PR('vol', '🔊', 'Lautstärke')}${PR('pan', '↔', 'Pan')}${PR('filt', '🌀', 'Filter')}<span class="ce-sep"></span>${B('ap-del', '🗑', 'Punkt löschen')}${B('ap-clear', '⌫', 'Kurve leeren')}${B('ap-on', '⏻', 'Automation an', 'aria-pressed="true"')}</div>
      <div class="ce-row ce-scroll ce-clipui">${B('split-cursor', '|✂', 'Am Cursor teilen')}${B('copy', '📋', 'Kopieren')}${B('cut', '✂', 'Ausschneiden')}${B('paste', '📥', 'Einfügen')}${B('dup', '⧉', 'Duplizieren')}${B('del', '🗑', 'Löschen')}${B('ripple', '⇤', 'Löschen + Lücke zu')}<span class="ce-sep"></span>${B('multi', '☑', 'Mehrfach', 'aria-pressed="false"')}${B('all', '▦', 'Alle wählen')}${B('xfade', '⤫', 'Überblenden', 'aria-pressed="true"')}</div>
      <div class="ce-row ce-props ce-clipui" id="ce-props" hidden>
        <label>Clip-Pegel <b id="ce-gv">0 dB</b><input id="ce-gain" type="range" min="0" max="2" step="0.01" value="1" aria-label="Clip-Pegel"></label>
        <label>Einblenden <b id="ce-fiv">0 s</b><input id="ce-fi" type="range" min="0" max="1" step="0.01" value="0" aria-label="Einblenden"></label>
        <label>Ausblenden <b id="ce-fov">0 s</b><input id="ce-fo" type="range" min="0" max="1" step="0.01" value="0" aria-label="Ausblenden"></label>
      </div>
      <div class="ce-row ce-scroll">
        ${B('zoom-out', '−', 'Zoom')}${B('zoom-in', '+', 'Zoom')}${B('fit', '⤢', 'Alles')}
        <select id="ce-snap" aria-label="Raster"><option value="off">Raster: aus</option><option value="bar">Takt</option><option value="beat">1/4 (Beat)</option><option value="eighth">1/8</option><option value="sixteenth">1/16</option></select>
        <span class="ce-sep"></span>
        ${B('undo', '↩', 'Zurück')}${B('redo', '↪', 'Vor')}
        <span class="ce-sep"></span>
        ${B('play', '▶', 'Play', 'id="ce-play"')}${B('stop', '■', 'Stopp')}
        <span class="ce-sep"></span>
        ${B('reset', '⟲', 'Spur zurücksetzen', 'id="ce-reset"')}
      </div>
      <div class="ce-info" id="ce-info"></div>
      <div class="ce-wrap" id="ce-wrap"><canvas id="ce-canvas"></canvas><div class="ce-msg" id="ce-msg" hidden></div></div>
      <div class="ce-info" id="ce-hint" style="padding-bottom:max(8px,env(safe-area-inset-bottom))"></div>`;
    document.body.appendChild(root);
    cv = $('ce-canvas'); cx = cv.getContext('2d');
    root.addEventListener('click', onClick);
    $('ce-track').addEventListener('change', e => { setTrack(e.target.value); });
    $('ce-snap').addEventListener('change', e => { E.snap = e.target.value; E.dirty = true; });
    $('ce-vol').addEventListener('input', e => { const t = track(); if (!t) return; t.vol = +e.target.value; try { audioEngine.syncAudioParams(); } catch (_) {} });
    $('ce-vol').addEventListener('change', () => { try { renderMultiTrackLanes(); renderVerticalMixer(); } catch (_) {} });
    [['ce-gain', 'g'], ['ce-fi', 'fi'], ['ce-fo', 'fo']].forEach(([id, k]) => { $(id).addEventListener('input', e => propInput(k, +e.target.value)); $(id).addEventListener('change', propDone); });
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey, true);
    ro = new ResizeObserver(() => { if (E.open) { fitCanvas(); E.dirty = true; } }); ro.observe($('ce-wrap'));
  }

  /* ------------------------------------------------------------------ Öffnen / Schließen */
  function open(id) {
    build();
    const t = dawState.tracks.find(x => x.id === id) || dawState.tracks[0]; if (!t) { say('Noch keine Spur vorhanden.', 'warn'); return; }
    E.id = t.id; E.open = true; clearSel(); E.resetArmed = false; root.hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('ce-open');
    E.apSel = null; root.dataset.mode = E.mode; fillTracks(); setToolUI(); $('ce-snap').value = E.snap;
    requestAnimationFrame(() => { fitCanvas(); fitView(); E.dirty = true; loop(); });
    sync();
  }
  function close() { if (!root) return; E.open = false; root.hidden = true; document.body.style.overflow = ''; document.body.classList.remove('ce-open'); cancelAnimationFrame(raf); try { renderMultiTrackLanes(); } catch (_) {} }
  function fillTracks() {
    const sel = $('ce-track');
    sel.innerHTML = dawState.tracks.map((t, i) => `<option value="${esc(t.id)}" ${t.id === E.id ? 'selected' : ''}>${esc(t.num || String(i + 1).padStart(2, '0'))} · ${esc(t.name)}${CM.isAud(t) ? '' : ' (' + (t.type === 'midi' ? 'MIDI' : 'Sequencer') + ')'}</option>`).join('');
  }
  function setTrack(id) { E.id = id; clearSel(); E.apSel = null; E.resetArmed = false; fillTracks(); fitView(); sync(); E.dirty = true; }
  function step(d) { const i = dawState.tracks.findIndex(t => t.id === E.id), n = dawState.tracks.length; if (!n) return; setTrack(dawState.tracks[(i + d + n) % n].id); }
  function fitCanvas() {
    const w = $('ce-wrap'), r = w.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const W = Math.max(50, Math.floor(r.width)), H = Math.max(50, Math.floor(r.height));
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    E.w = W; E.h = H; E.dpr = dpr;
  }
  function fitView() {
    const t = track(); const e = t && CM.isAud(t) ? CM.end(t) : 0; const span = Math.max(e, E.mode === 'auto' ? audioEngine.getTotalArrangementBars() * barSec() : barSec() * 4) * 1.04;
    E.pps = clamp(((E.w || 360) - 12) / span, 3, 800); E.view = 0;
  }
  function setToolUI() { root.querySelectorAll('[data-ce-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ceTool === E.tool))); root.querySelectorAll('[data-ce-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ceMode === E.mode))); root.querySelectorAll('[data-ce-param]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ceParam === E.param))); hint(); }
  function setMode(m) { E.mode = m; E.apSel = null; root.dataset.mode = m; setToolUI(); fitView(); sync(); E.dirty = true; }
  const HINTS = { move: 'Clip antippen = auswählen · ziehen = verschieben · leere Fläche ziehen = Ansicht schieben · zwei Finger = zoomen. Kreise an den oberen Ecken des gewählten Clips = Ein-/Ausblenden.', trim: 'Rand eines Clips ziehen = kürzer/länger zuschneiden. Der Clip wird nur verdeckt, nicht gelöscht – er lässt sich wieder aufziehen.', loop: 'Rechten Rand eines Clips nach rechts über das Ende ziehen: der Clip wird als Schleife wiederholt (echte Kopien, einzeln bearbeitbar).', split: 'Auf einen Clip tippen = dort teilen. Für exakte Schnitte: Cursor im Lineal setzen und „Am Cursor teilen“.' };
  function hint() { const h = $('ce-hint'); if (h) h.textContent = E.mode === 'auto' ? 'Fläche antippen = Punkt setzen · Punkt ziehen = Zeit und Wert ändern · Punkt antippen + „Punkt löschen“ · leere Fläche ziehen = Ansicht schieben. Die Kurve wirkt relativ zum Fader.' : (HINTS[E.tool] || ''); }

  /* Zustand der Bedienelemente */
  function sync() {
    const t = track(); if (!t) { close(); return; }
    const aud = CM.isAud(t), hasSel = !!selClip();
    $('ce-m').setAttribute('aria-pressed', String(!!t.mute)); $('ce-s').setAttribute('aria-pressed', String(!!t.solo)); $('ce-vol').value = t.vol;
    const dis = (a, v) => { const b = root.querySelector(`[data-ce="${a}"]`); if (b) b.disabled = !!v; };
    ['copy', 'cut', 'dup', 'del', 'ripple'].forEach(a => dis(a, !hasSel)); dis('all', !aud || !CM.list(t).length); dis('multi', !aud); dis('xfade', !aud);
    const mb = root.querySelector('[data-ce="multi"]'); mb.setAttribute('aria-pressed', String(E.multiMode)); root.querySelector('[data-ce="xfade"]').setAttribute('aria-pressed', String(t.xfade !== false)); syncProps(aud); dis('paste', !aud || !CM.clipboard.clips.length); dis('split-cursor', !aud); dis('reset', !aud || !CM.has(t));
    root.querySelectorAll('[data-ce-tool]').forEach(b => b.disabled = !aud);
    const msg = $('ce-msg');
    if (E.mode === 'auto') { msg.hidden = true; syncAuto(t); }
    else if (!aud) {
      msg.hidden = false;
      msg.innerHTML = `<div style="font-size:15px;color:#e2e8f0;font-weight:800">${t.type === 'midi' ? '🎹 MIDI-Spur' : '🥁 Sequencer-Spur'}</div><div>Noten und Steps bearbeitest du im ${t.type === 'midi' ? 'Piano Roll' : 'Drum-/Sequencer-Fenster'}. Clips zum Teilen und Verschieben gibt es für Audio-Spuren.</div><button type="button" class="ce-btn" data-ce="goedit" style="border-color:rgba(251,191,36,.7)">${t.type === 'midi' ? 'Im Piano Roll öffnen' : 'Im Sequencer öffnen'}</button>`;
    } else if (!CM.list(t).length && !CM.has(t)) {
      msg.hidden = false; msg.innerHTML = `<div style="font-size:15px;color:#e2e8f0;font-weight:800">Leere Audio-Spur</div><div>Lade im Hauptfenster eine Datei („📂 Audio“) oder füge einen kopierten Clip hier ein.</div>`;
    } else msg.hidden = true;
    info(); $('ce-play').firstElementChild.textContent = dawState.isPlaying ? '❚❚' : '▶'; $('ce-play').lastElementChild.textContent = dawState.isPlaying ? 'Pause' : 'Play';
    const rs = $('ce-reset'); rs.lastElementChild.textContent = E.resetArmed ? 'Wirklich?' : 'Spur zurücksetzen';
  }
  const selIds = () => (E.sel ? [E.sel].concat(E.multi.filter(i => i !== E.sel)) : []);
  const isSel = id => id === E.sel || E.multi.indexOf(id) >= 0;
  const clearSel = () => { E.sel = null; E.multi = []; };
  function syncAuto(t) {
    const AM = window.AutoModel; if (!AM) return; const k = E.param, n = AM.get(t, k).length, any = AM.has(t);
    const dis = (a, v) => { const b = root.querySelector(`[data-ce="${a}"]`); if (b) b.disabled = !!v; };
    dis('ap-del', !E.apSel); dis('ap-clear', !n); dis('ap-on', !any); const ob = root.querySelector('[data-ce="ap-on"]'); if (ob) { ob.setAttribute('aria-pressed', String(!t.autoOff)); ob.lastElementChild.textContent = t.autoOff ? 'Automation aus' : 'Automation an'; }
    root.querySelectorAll('[data-ce-param]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.ceParam === k)); const has = AM.get(t, b.dataset.ceParam).length > 0; b.style.borderColor = has && b.dataset.ceParam !== k ? 'rgba(52,211,153,.6)' : ''; });
  }
  const dB = v => v <= 0.001 ? '−∞ dB' : (20 * Math.log10(v) >= 0 ? '+' : '') + (20 * Math.log10(v)).toFixed(1).replace('-', '−') + ' dB';
  let propEdit = false;
  function syncProps(aud) {
    const pr = $('ce-props'), c = aud ? selClip() : null; pr.hidden = !c; if (!c || propEdit) return;
    const m = Math.max(0.05, Math.min(10, c.dur / 2)); $('ce-fi').max = $('ce-fo').max = String(Math.round(m * 100) / 100);
    $('ce-gain').value = c.g == null ? 1 : c.g; $('ce-fi').value = c.fi || 0; $('ce-fo').value = c.fo || 0; propLabels(c);
  }
  function propLabels(c) { $('ce-gv').textContent = dB(c.g == null ? 1 : c.g); $('ce-fiv').textContent = (c.fi || 0).toFixed(2) + ' s'; $('ce-fov').textContent = (c.fo || 0).toFixed(2) + ' s'; }
  function propInput(k, v) {
    if (!selClip()) return; if (!propEdit) { prepEdit(); propEdit = true; }
    const t = track(), ids = selIds(); t.clips.filter(c => ids.indexOf(c.id) >= 0).forEach(c => { if (k === 'g') c.g = v; else if (v > 0) c[k] = Math.min(v, c.dur / 2); else delete c[k]; });
    const c = selClip(); if (c) propLabels(c); E.dirty = true;
  }
  function propDone() { propEdit = false; afterEdit(); }
  function selClip() { const t = track(); if (!t || !E.sel) return null; return CM.list(t).find(c => c.id === E.sel) || null; }
  function info() {
    const c = selClip(), el = $('ce-info'), t = track(); if (!el || !t) return;
    if (E.mode === 'auto' && window.AutoModel) { const AM = window.AutoModel, P = AM.P[E.param], pts = AM.get(t, E.param); el.innerHTML = `<b style="color:#fde68a">${P.label}</b> · ${pts.length ? pts.length + ' Punkt' + (pts.length === 1 ? '' : 'e') : 'noch keine Punkte – Fläche antippen'}${t.autoOff && pts.length ? ' · <span style="color:#fca5a5">Automation ist aus</span>' : ''}${E.apSel ? ` · gewählt: Takt ${fmtPos(E.apSel.t)} · ${AM.fmtVal(E.param, E.apSel.v)}` : ''}`; return; }
    if (!CM.isAud(t)) { el.textContent = ''; return; }
    el.innerHTML = c && selIds().length > 1 ? `<b style="color:#fde68a">${selIds().length} Clips ausgewählt</b> · ziehen verschiebt alle zusammen · Kopieren/Löschen/Duplizieren wirken auf alle` : c ? `<b style="color:#fde68a">Clip</b> · Start Takt ${fmtPos(c.start)} (${fmtSec(c.start)}) · Länge ${fmtSec(c.dur)} · Quelle ab ${fmtSec(c.offset)}${c.src && c.src !== t.id ? ' · eingefügt aus anderer Spur' : ''}` : `${CM.list(t).length} Clip${CM.list(t).length === 1 ? '' : 's'} · Cursor Takt ${fmtPos(dawState.playheadSec)} (${fmtSec(dawState.playheadSec)}) · Raster ${$('ce-snap').selectedOptions[0].textContent}`;
  }

  /* ------------------------------------------------------------------ Bearbeiten */
  function prepEdit() {
    const t = track(); if (!t) return null;
    push(); const wasImp = !CM.has(t); CM.materialize(t);
    if (wasImp && E.sel === 'implicit') E.sel = t.clips[0] ? t.clips[0].id : null;
    return t;
  }
  function afterEdit(restart) {
    try { renderMultiTrackLanes(); } catch (_) {}
    if (restart !== false && dawState.isPlaying) { try { audioEngine.seek(dawState.playheadSec); } catch (_) {} }
    sync(); E.dirty = true;
  }
  function clipAt(t, time) { const l = CM.list(t); for (let i = l.length - 1; i >= 0; i--) { const c = l[i]; if (time >= c.start && time <= c.start + c.dur) return c; } return null; }
  function doSplitAt(time, onlyId) {
    const t = track(); if (!t || !CM.isAud(t)) return;
    const target = onlyId ? CM.list(t).find(c => c.id === onlyId) : (selClip() && time >= selClip().start && time <= selClip().start + selClip().dur ? selClip() : clipAt(t, time));
    if (!target) { say('Hier liegt kein Clip.', 'info'); return; }
    if (!(time > target.start + CM.MIN && time < target.start + target.dur - CM.MIN)) { say('Zu nah am Clip-Rand zum Teilen.', 'info'); return; }
    const tid = target.id, wasImp = tid === 'implicit', tt = prepEdit(); const sid = wasImp ? tt.clips[0].id : tid;
    CM.split(tt, time, sid);
    const right = tt.clips.filter(c => c.start >= time - 1e-9 && (c.src || tt.id) === (tt.clips.find(x => x.id === sid).src || tt.id)).sort((a, b) => a.start - b.start)[0];
    E.sel = right ? right.id : sid; afterEdit(); say('Clip geteilt.', 'success');
  }
  function doCopy(cut) {
    const t = track(), c = selClip(); if (!t || !c) return;
    if (!CM.has(t)) { const tt = prepEdit(); E.sel = tt.clips[0].id; }
    const t2 = track(), ids = selIds(); if (!CM.copy(t2, ids)) return;
    if (cut) { const tt = prepEdit(); ids.forEach(i => CM.remove(tt, i)); clearSel(); afterEdit(); say('Ausgeschnitten.', 'success'); } else { say(ids.length > 1 ? ids.length + ' Clips kopiert – an anderer Stelle oder Spur einfügen.' : 'Kopiert – an anderer Stelle oder Spur einfügen.', 'success'); sync(); }
  }
  function doPaste(at) {
    const t = track(); if (!t || !CM.isAud(t) || !CM.clipboard.clips.length) return;
    const tt = prepEdit(), made = CM.paste(tt, at != null ? at : snapT(dawState.playheadSec));
    if (!made.length) { say('Die kopierte Audiodatei existiert nicht mehr.', 'warn'); return; }
    E.sel = made[0].id; ensureVisible(made[0].start); afterEdit(); say('Eingefügt bei Takt ' + fmtPos(made[0].start) + '.', 'success');
  }
  function doDup() {
    if (!selClip()) return; const a = prepEdit(), ids = selIds(), grp = a.clips.filter(c => ids.indexOf(c.id) >= 0);
    const end = Math.max.apply(null, grp.map(c => c.start + c.dur)); CM.copy(a, ids); const made = CM.paste(a, end);
    clearSel(); if (made.length) { E.sel = made[0].id; E.multi = made.slice(1).map(c => c.id); } afterEdit(); say(made.length > 1 ? 'Dupliziert (' + made.length + ' Clips).' : 'Dupliziert.', 'success');
  }
  function doDel(rip) {
    if (!selClip()) return; const tt = prepEdit(), ids = selIds();
    if (rip) CM.ripple(tt, ids); else ids.forEach(i => CM.remove(tt, i));
    clearSel(); afterEdit(); say(rip ? 'Gelöscht, Lücke geschlossen – „↩ Zurück“ macht es rückgängig.' : (ids.length > 1 ? ids.length + ' Clips gelöscht – „↩ Zurück“ holt sie wieder.' : 'Clip gelöscht – „↩ Zurück“ holt ihn wieder.'), 'info');
  }
  function autoDel() { const t = track(), AM = window.AutoModel; if (!t || !AM || !E.apSel) return; push(); AM.remove(t, E.param, E.apSel); E.apSel = null; afterEdit(); }
  function autoClear() { const t = track(), AM = window.AutoModel; if (!t || !AM || !AM.get(t, E.param).length) return; push(); AM.clear(t, E.param); E.apSel = null; afterEdit(); say('Kurve gelöscht – „↩ Zurück“ holt sie wieder.', 'info'); }
  function autoToggle() { const t = track(); if (!t) return; push(); if (t.autoOff) delete t.autoOff; else t.autoOff = true; afterEdit(); say(t.autoOff ? 'Automation dieser Spur ist aus (Kurven bleiben gespeichert).' : 'Automation an.', 'info'); }
  function doReset() {
    const t = track(); if (!t || !CM.has(t)) return;
    if (!E.resetArmed) { E.resetArmed = true; sync(); setTimeout(() => { E.resetArmed = false; if (E.open) sync(); }, 3000); return; }
    push(); CM.reset(t); E.resetArmed = false; clearSel(); afterEdit(); say('Spur auf die ursprüngliche Datei zurückgesetzt.', 'success');
  }
  function ensureVisible(t) { const x = tToX(t); if (x < 0 || x > E.w - 40) { E.view = Math.max(0, t - 30 / E.pps); } }
  function zoom(f, cxPx) { const a = cxPx != null ? cxPx : E.w / 2, tAt = xToT(a); E.pps = clamp(E.pps * f, 3, 800); E.view = Math.max(0, tAt - a / E.pps); E.dirty = true; }

  /* ------------------------------------------------------------------ Klicks */
  function onClick(e) {
    const md = e.target.closest('[data-ce-mode]'); if (md) { setMode(md.dataset.ceMode); return; }
    const pm = e.target.closest('[data-ce-param]'); if (pm) { E.param = pm.dataset.ceParam; E.apSel = null; setToolUI(); sync(); E.dirty = true; return; }
    const tb = e.target.closest('[data-ce-tool]'); if (tb) { E.tool = tb.dataset.ceTool; setToolUI(); return; }
    const b = e.target.closest('[data-ce]'); if (!b) return; const a = b.dataset.ce;
    switch (a) {
      case 'close': close(); break;
      case 'prev': step(-1); break; case 'next': step(1); break;
      case 'mute': case 'solo': { const t = track(); if (!t) break; const bt = document.querySelector(`[data-${a}="${CSS.escape(String(t.id))}"]`); if (bt) bt.click(); else { t[a] = !t[a]; try { audioEngine.syncAudioParams(); renderMultiTrackLanes(); } catch (_) {} } sync(); break; }
      case 'split-cursor': doSplitAt(dawState.playheadSec); break;
      case 'copy': doCopy(false); break; case 'cut': doCopy(true); break; case 'paste': doPaste(); break;
      case 'dup': doDup(); break; case 'del': doDel(); break; case 'ripple': doDel(true); break;
      case 'multi': E.multiMode = !E.multiMode; if (!E.multiMode) E.multi = []; sync(); E.dirty = true; say(E.multiMode ? 'Mehrfach-Auswahl: weitere Clips antippen.' : 'Mehrfach-Auswahl aus.', 'info'); break;
      case 'all': { const t = track(), l = t ? CM.list(t) : []; if (l.length) { E.sel = l[0].id; E.multi = l.slice(1).map(c => c.id); sync(); E.dirty = true; } break; }
      case 'xfade': { const t = track(); if (!t) break; push(); t.xfade = t.xfade === false; afterEdit(); say(t.xfade === false ? 'Überblenden aus: überlappende Clips addieren sich.' : 'Überblenden an: Überlappungen werden weich übergeblendet.', 'info'); break; }
      case 'zoom-in': zoom(1.5); break; case 'zoom-out': zoom(1 / 1.5); break; case 'fit': fitView(); E.dirty = true; break;
      case 'undo': window.__dawUndo && window.__dawUndo(); afterUndo(); break;
      case 'redo': window.__dawRedo && window.__dawRedo(); afterUndo(); break;
      case 'play': { const p = $('btn-play'); p && p.click(); setTimeout(sync, 60); break; }
      case 'stop': { const p = $('btn-stop'); p && p.click(); setTimeout(sync, 60); break; }
      case 'reset': doReset(); break;
      case 'ap-del': autoDel(); break; case 'ap-clear': autoClear(); break; case 'ap-on': autoToggle(); break;
      case 'goedit': { const t = track(); const bt = t && document.querySelector(`[data-edit][data-trackid="${CSS.escape(String(t.id))}"]`); close(); if (bt) bt.click(); break; }
    }
  }
  function afterUndo() { E.apSel = null; if (!track()) { close(); return; } if (E.sel && !selClip()) clearSel(); E.multi = E.multi.filter(i => CM.list(track()).some(c => c.id === i)); fillTracks(); sync(); E.dirty = true; }
  function onKey(e) {
    if (!E.open) return; const ae = document.activeElement || {}, tag = ae.tagName; if (tag === 'TEXTAREA' || (tag === 'INPUT' && ae.type !== 'range') || (tag === 'SELECT' && (e.key === ' ' || e.key.indexOf('Arrow') === 0))) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && 'zy'.indexOf(k.toLowerCase()) >= 0 || k === ' ') e.stopPropagation(); /* globale Undo-/Leertaste-Handler nicht doppelt auslösen */
    if (k === 'Escape') { close(); e.preventDefault(); }
    else if (k === 'Delete' || k === 'Backspace') { if (E.mode === 'auto') autoDel(); else doDel(); e.preventDefault(); }
    else if (E.mode === 'auto' && (k.toLowerCase() === 's' || (ctrl && 'cxv'.indexOf(k.toLowerCase()) >= 0))) { /* Clip-Kürzel im Automations-Modus aus */ }
    else if (ctrl && k.toLowerCase() === 'c') { doCopy(false); e.preventDefault(); }
    else if (ctrl && k.toLowerCase() === 'x') { doCopy(true); e.preventDefault(); }
    else if (ctrl && k.toLowerCase() === 'v') { doPaste(); e.preventDefault(); }
    else if (ctrl && k.toLowerCase() === 'z') { window.__dawUndo && window.__dawUndo(); afterUndo(); e.preventDefault(); }
    else if (ctrl && (k.toLowerCase() === 'y')) { window.__dawRedo && window.__dawRedo(); afterUndo(); e.preventDefault(); }
    else if (k.toLowerCase() === 's' && !ctrl) { doSplitAt(dawState.playheadSec); e.preventDefault(); }
    else if (k === '+' || k === '=') zoom(1.5); else if (k === '-') zoom(1 / 1.5);
    else if (k === ' ') { const p = $('btn-play'); p && p.click(); e.preventDefault(); setTimeout(sync, 60); }
  }

  /* ------------------------------------------------------------------ Zeiger (Maus & Touch) */
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function hit(x, y) {
    const t = track(); if (!t || !CM.isAud(t)) return null; const list = CM.list(t);
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i], x0 = tToX(c.start), x1 = tToX(c.start + c.dur); if (x < x0 - 2 || x > x1 + 2) continue;
      const ez = Math.min(EDGE, (x1 - x0) / 3);
      return { c, edge: x - x0 <= ez ? 'L' : (x1 - x <= ez ? 'R' : null) };
    }
    return null;
  }
  function onDown(e) {
    const p = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} E.pointers.set(e.pointerId, p);
    if (E.pointers.size === 2) { const [a, b] = [...E.pointers.values()]; E.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), pps: E.pps, mid: (a.x + b.x) / 2 }; E.drag = null; return; }
    const t = track(); if (!t) return;
    if (p.y < RULER) { E.drag = { mode: 'scrub' }; scrub(p.x); return; }
    if (E.mode === 'auto') { autoDown(p); return; }
    if (!CM.isAud(t)) return;
    const sc = selClip();
    if (sc && (E.tool === 'move' || E.tool === 'trim')) {                      /* Fade-Griffe am gewählten Clip */
      const top = RULER + 8, y = top + 12, hx1 = tToX(sc.start + (sc.fi || 0)), hx2 = tToX(sc.start + sc.dur - (sc.fo || 0));
      const d1 = Math.hypot(p.x - hx1, p.y - y), d2 = Math.hypot(p.x - hx2, p.y - y);
      if (Math.min(d1, d2) <= 18) { E.drag = { mode: d1 <= d2 ? 'fadeI' : 'fadeO', id: sc.id, x0: p.x, began: false }; return; }
    }
    const h = hit(p.x, p.y);
    if (E.tool === 'split') {
      if (h) { E.sel = h.c.id; E.multi = []; doSplitAt(snapT(xToT(p.x)), h.c.id); } else { clearSel(); sync(); E.dirty = true; } E.drag = null; return;
    }
    if (h) {
      const id = h.c.id, was = isSel(id), tm = xToT(p.x);
      if (E.multiMode) {                                                       /* Mehrfach: antippen schaltet um */
        const ids = selIds(), i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); else ids.push(id);
        E.sel = ids.length ? ids[ids.length - 1] : null; E.multi = ids.slice(0, -1); sync(); E.dirty = true; E.drag = null; return;
      }
      E.multi = was ? selIds().filter(i => i !== id) : [];
      E.sel = id; sync(); E.dirty = true;
      if (E.tool === 'trim') { if (h.edge) E.drag = { mode: h.edge === 'L' ? 'trimL' : 'trimR', id, x0: p.x, began: false }; else E.drag = null; }
      else if (E.tool === 'loop') { if (h.edge === 'R') E.drag = { mode: 'loopR', id, x0: p.x, began: false, endT: 0 }; else E.drag = null; }
      else E.drag = { mode: 'move', id, x0: p.x, grab: tm - h.c.start, began: false, collapse: was && selIds().length > 1 };
    } else { if (!E.multiMode) clearSel(); sync(); E.drag = { mode: 'pan', x0: p.x, v0: E.view }; E.dirty = true; }
  }
  /* ---- Automation: Zeiger ---- */
  const aTop = () => RULER + 10, aH = () => E.h - RULER - 20;
  const vToY = v => { const r = window.AutoModel.P[E.param]; return aTop() + aH() * (1 - (v - r.min) / (r.max - r.min)); };
  const yToV = y => {
    const r = window.AutoModel.P[E.param]; let v = clamp(r.min + (1 - (y - aTop()) / aH()) * (r.max - r.min), r.min, r.max);
    if (Math.abs(v - r.def) < (r.max - r.min) * 0.018) v = r.def; return Math.round(v * 1000) / 1000;
  };
  function autoDown(p) {
    const t = track(), AM = window.AutoModel; if (!t || !AM) return; let best = null, bd = 24;
    AM.get(t, E.param).forEach(pt => { const d = Math.hypot(p.x - tToX(pt.t), p.y - vToY(pt.v)); if (d < bd) { bd = d; best = pt; } });
    if (best) { E.apSel = best; E.drag = { mode: 'apt', pt: best, x0: p.x, y0: p.y, began: false }; sync(); E.dirty = true; return; }
    E.apSel = null; E.drag = { mode: 'aadd', x0: p.x, y0: p.y, v0: E.view, moved: false }; sync(); E.dirty = true;
  }
  function scrub(x) { const t = Math.max(0, xToT(x)); try { audioEngine.seek(t); } catch (_) { dawState.playheadSec = t; } E.dirty = true; info(); }
  function onMove(e) {
    if (!E.pointers.has(e.pointerId)) return; const p = pos(e); E.pointers.set(e.pointerId, p);
    if (E.pinch && E.pointers.size >= 2) { const [a, b] = [...E.pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mid = (a.x + b.x) / 2; const tAt = E.view + E.pinch.mid / E.pinch.pps; E.pps = clamp(E.pinch.pps * d / Math.max(10, E.pinch.d), 3, 800); E.view = Math.max(0, tAt - mid / E.pps); E.dirty = true; return; }
    const d = E.drag; if (!d) return;
    if (d.mode === 'scrub') { scrub(p.x); return; }
    if (d.mode === 'pan') { E.view = Math.max(0, d.v0 - (p.x - d.x0) / E.pps); E.dirty = true; return; }
    if (d.mode === 'apt') {
      if (!d.began) { if (Math.hypot(p.x - d.x0, p.y - d.y0) < 4) return; push(); d.began = true; }
      const t = track(); d.pt.t = Math.max(0, snapT(xToT(p.x))); d.pt.v = yToV(p.y); window.AutoModel.sortPts(t, E.param); E.dirty = true; info(); return;
    }
    if (d.mode === 'aadd') { if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) < 6) return; d.moved = true; E.view = Math.max(0, d.v0 - (p.x - d.x0) / E.pps); E.dirty = true; return; }
    if (d.mode === 'loopR') { if (!d.began && Math.abs(p.x - d.x0) < 4) return; d.began = true; d.endT = snapT(xToT(p.x)); E.dirty = true; return; }
    if (!d.began) {
      if (Math.abs(p.x - d.x0) < 4) return; const tt = prepEdit(); if (!tt) return; d.began = true; if (d.id === 'implicit') d.id = tt.clips[0].id; E.sel = d.id;
      if (d.mode === 'move') { d.orig = {}; selIds().forEach(i => { const k = tt.clips.find(x => x.id === i); if (k) d.orig[i] = k.start; }); }
    }
    const t = track(), c = t && (t.clips || []).find(x => x.id === d.id); if (!c) return;
    const tm = xToT(p.x);
    if (d.mode === 'move') {
      let dl = snapT(tm - d.grab) - d.orig[d.id]; dl = Math.max(dl, -Math.min.apply(null, Object.values(d.orig)));
      Object.keys(d.orig).forEach(i => { const k = t.clips.find(x => x.id === i); if (k) k.start = d.orig[i] + dl; }); CM.sort(t);
    }
    else if (d.mode === 'trimL') CM.trimLeft(t, c, snapT(tm));
    else if (d.mode === 'trimR') CM.trimRight(t, c, snapT(tm));
    else if (d.mode === 'fadeI') { const v = clamp(tm - c.start, 0, c.dur / 2); if (v > 0.005) c.fi = Math.round(v * 100) / 100; else delete c.fi; }
    else if (d.mode === 'fadeO') { const v = clamp(c.start + c.dur - tm, 0, c.dur / 2); if (v > 0.005) c.fo = Math.round(v * 100) / 100; else delete c.fo; }
    E.dirty = true; info();
  }
  function onUp(e) {
    E.pointers.delete(e.pointerId); if (E.pointers.size < 2) E.pinch = null;
    const d = E.drag; E.drag = null; if (!d) return;
    if (d.mode === 'apt') { if (d.began) afterEdit(); return; }
    if (d.mode === 'aadd') { if (!d.moved) { const t = track(); push(); E.apSel = window.AutoModel.add(t, E.param, Math.max(0, snapT(xToT(d.x0))), yToV(d.y0)); afterEdit(); } return; }
    if (d.mode === 'loopR') {
      if (d.began) {
        const t = track(), cl = t && CM.list(t).find(x => x.id === d.id);
        if (cl && d.endT > cl.start + cl.dur + CM.MIN) {
          const tt = prepEdit(), cid = d.id === 'implicit' ? tt.clips[0].id : d.id, c = tt.clips.find(x => x.id === cid), n = CM.loopTo(tt, c, d.endT);
          E.sel = cid; E.multi = []; afterEdit(); say(n + ' Wiederholung' + (n === 1 ? '' : 'en') + ' angelegt.', 'success');
        } else E.dirty = true;
      }
      return;
    }
    if (d.began) afterEdit(); else if (d.collapse) { E.sel = d.id; E.multi = []; sync(); E.dirty = true; }
  }
  function onWheel(e) {
    e.preventDefault(); const p = pos(e);
    if (e.ctrlKey || e.metaKey) zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x); else { E.view = Math.max(0, E.view + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / E.pps); E.dirty = true; }
  }

  /* ------------------------------------------------------------------ Zeichnen */
  function loop() {
    if (!E.open) return;
    if (dawState.isPlaying) {
      E.dirty = true;
      const x = tToX(dawState.playheadSec); if (x > E.w - 30 || x < 0) E.view = Math.max(0, dawState.playheadSec - 40 / E.pps);
      if ((loop.n = (loop.n || 0) + 1) % 20 === 0) sync();
    }
    if (E.dirty) draw();
    raf = requestAnimationFrame(loop);
  }
  function roundRect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function drawAuto(t) {
    const AM = window.AutoModel, k = E.param, P = AM.P[k], pts = AM.get(t, k), W = E.w, top = aTop(), h = aH(), off = !!t.autoOff;
    const ticks = k === 'vol' ? [0, 0.5, 1, 1.5, 2] : (k === 'pan' ? [-1, -0.5, 0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]);
    cx.save(); cx.font = '10px ui-monospace,monospace'; cx.textBaseline = 'middle';
    ticks.forEach(v => { const y = Math.round(vToY(v)) + .5, isDef = Math.abs(v - P.def) < 1e-9; cx.strokeStyle = isDef ? 'rgba(148,163,184,.45)' : 'rgba(148,163,184,.14)'; cx.setLineDash(isDef ? [] : [3, 4]); cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); cx.setLineDash([]); cx.fillStyle = '#94a3b8'; cx.fillText(AM.fmtVal(k, v), 5, Math.min(Math.max(y - 7, top - 2), top + h + 2)); });
    const col = off ? '#64748b' : '#34d399';
    if (!pts.length) { const y = vToY(P.def); cx.strokeStyle = col; cx.globalAlpha = .6; cx.setLineDash([6, 5]); cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1; cx.fillStyle = '#cbd5e1'; cx.font = '700 12px system-ui,sans-serif'; cx.textAlign = 'center'; cx.fillText('Fläche antippen, um den ersten Punkt zu setzen', W / 2, top + h / 2); cx.restore(); return; }
    cx.beginPath(); cx.moveTo(0, vToY(pts[0].v)); pts.forEach(p => cx.lineTo(tToX(p.t), vToY(p.v))); cx.lineTo(W, vToY(pts[pts.length - 1].v));
    cx.strokeStyle = col; cx.lineWidth = 2.5; cx.stroke();
    cx.lineTo(W, vToY(P.def)); cx.lineTo(0, vToY(P.def)); cx.closePath(); cx.fillStyle = off ? 'rgba(100,116,139,.12)' : 'rgba(52,211,153,.14)'; cx.fill();
    pts.forEach(p => { const x = tToX(p.t), y = vToY(p.v); if (x < -12 || x > W + 12) return; const sel = p === E.apSel; cx.beginPath(); cx.arc(x, y, sel ? 10 : 7, 0, 6.2832); cx.fillStyle = sel ? '#fde68a' : '#0b1220'; cx.fill(); cx.lineWidth = 2.5; cx.strokeStyle = sel ? '#f59e0b' : col; cx.stroke(); });
    cx.restore();
  }
  function draw() {
    E.dirty = false; if (!cx) return; const W = E.w, H = E.h, t = track(); if (!t) return;
    cx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0); cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#0b1220'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#0f1a2e'; cx.fillRect(0, 0, W, RULER);
    /* Lineal & Raster */
    const bs = barSec(), bt = beatSec(), pxBar = bs * E.pps; let every = 1; while (pxBar * every < 46) every *= 2;
    const t0 = E.view, t1 = E.view + W / E.pps; cx.font = '10px ui-monospace,monospace'; cx.textBaseline = 'middle';
    for (let b = Math.floor(t0 / bs); b * bs <= t1; b++) {
      const x = Math.round(tToX(b * bs)) + .5;
      if (b % every === 0) { cx.strokeStyle = 'rgba(148,163,184,.28)'; cx.beginPath(); cx.moveTo(x, RULER - 12); cx.lineTo(x, H); cx.stroke(); cx.fillStyle = '#94a3b8'; cx.fillText(String(b + 1), x + 4, RULER / 2 - 2); }
      else { cx.strokeStyle = 'rgba(148,163,184,.10)'; cx.beginPath(); cx.moveTo(x, RULER); cx.lineTo(x, H); cx.stroke(); }
      if (bt * E.pps >= 14) for (let k = 1; k < 4; k++) { const xb = Math.round(tToX(b * bs + k * bt)) + .5; cx.strokeStyle = 'rgba(148,163,184,.07)'; cx.beginPath(); cx.moveTo(xb, RULER); cx.lineTo(xb, H); cx.stroke(); }
    }
    /* Clips */
    if (CM.isAud(t)) {
      const top = RULER + 8, hh = H - RULER - 16;
      CM.list(t).forEach(c => {
        const buf = CM.bufOf(t, c); if (!buf) return; const x = tToX(c.start), w = c.dur * E.pps; if (x + w < -4 || x > W + 4) return;
        if (E.mode === 'auto') { cx.save(); roundRect(x, top, w, hh, 8); cx.clip(); cx.globalAlpha = .22; cx.fillStyle = t.color; CM.drawWave(cx, buf, c, x, E.pps, top + 14, hh - 18, Math.max(0, Math.floor(x)), Math.min(W, Math.ceil(x + w))); cx.restore(); return; }
        const sel = isSel(c.id), prim = c.id === E.sel, fe = CM.fades(t, c);
        cx.save(); roundRect(x, top, w, hh, 8); cx.clip();
        cx.fillStyle = t.color; cx.globalAlpha = sel ? .30 : .18; cx.fillRect(x, top, w, hh); cx.globalAlpha = t.mute ? .35 : .95; cx.fillStyle = t.color;
        const xa = Math.max(0, Math.floor(x)), xb = Math.min(W, Math.ceil(x + w)); CM.drawWave(cx, buf, c, x, E.pps, top + 14, hh - 18, xa, xb);
        const fiW = Math.min(fe.fi, c.dur / 2) * E.pps, foW = Math.min(fe.fo, c.dur / 2) * E.pps; cx.globalAlpha = 1; cx.fillStyle = 'rgba(7,11,20,.62)';
        if (fiW > 1) { cx.beginPath(); cx.moveTo(x, top); cx.lineTo(x + fiW, top); cx.lineTo(x, top + hh); cx.closePath(); cx.fill(); }
        if (foW > 1) { cx.beginPath(); cx.moveTo(x + w, top); cx.lineTo(x + w - foW, top); cx.lineTo(x + w, top + hh); cx.closePath(); cx.fill(); }
        cx.restore();
        cx.save(); cx.lineWidth = sel ? 2.5 : 1.2; cx.strokeStyle = sel ? '#fde68a' : t.color; cx.globalAlpha = sel ? 1 : .8; roundRect(x + .5, top + .5, Math.max(2, w - 1), hh - 1, 8); cx.stroke(); cx.restore();
        if (w > 70) { cx.fillStyle = 'rgba(255,255,255,.85)'; cx.font = '10px ui-monospace,monospace'; cx.textBaseline = 'top'; cx.fillText(fmtPos(c.start) + '  ' + c.dur.toFixed(1) + ' s' + (c.src && c.src !== t.id ? '  ⧉' : ''), x + 8, top + 3); }
        if (prim && E.tool !== 'split') { cx.save(); cx.fillStyle = '#fde68a'; cx.strokeStyle = '#0b1220'; cx.lineWidth = 2; [x + (c.fi || 0) * E.pps, x + w - (c.fo || 0) * E.pps].forEach(hx => { cx.beginPath(); cx.arc(hx, top + 12, 7, 0, 6.2832); cx.fill(); cx.stroke(); }); cx.restore(); }
        if (prim) { cx.fillStyle = '#fde68a'; const hw = 7; [x, x + w - hw].forEach(hx => { roundRect(hx, top + hh / 2 - 22, hw, 44, 3); cx.fill(); }); }
      });
    }
    if (E.mode === 'auto' && window.AutoModel) drawAuto(t);
    /* Vorschau der Schleife beim Ziehen */
    const dg = E.drag;
    if (dg && dg.mode === 'loopR' && dg.began && CM.isAud(t)) {
      const c = CM.list(t).find(x => x.id === dg.id);
      if (c) { let k = 1, n = 0; cx.save(); cx.setLineDash([5, 4]); cx.strokeStyle = '#fde68a'; cx.fillStyle = 'rgba(253,230,138,.12)'; cx.lineWidth = 1.5;
        for (;;) { const st = c.start + k * c.dur, d = Math.min(c.dur, dg.endT - st); if (d < CM.MIN || k > 400) break; const gx = tToX(st), gw = d * E.pps; roundRect(gx, RULER + 8, Math.max(2, gw), H - RULER - 16, 8); cx.fill(); cx.stroke(); k++; n++; }
        cx.setLineDash([]); cx.fillStyle = '#fde68a'; cx.font = '700 12px ui-monospace,monospace'; cx.textBaseline = 'top'; cx.fillText('🔁 ×' + n, tToX(c.start + c.dur) + 8, RULER + 12); cx.restore(); }
    }
    /* Playhead */
    const px = tToX(dawState.playheadSec);
    if (px >= -2 && px <= W + 2) { cx.strokeStyle = '#fb7185'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(px, 0); cx.lineTo(px, H); cx.stroke(); cx.fillStyle = '#fb7185'; cx.beginPath(); cx.moveTo(px - 7, 0); cx.lineTo(px + 7, 0); cx.lineTo(px, 11); cx.closePath(); cx.fill(); }
  }

  /* ------------------------------------------------------------------ Einbau */
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-clipedit]'); if (b) { e.preventDefault(); open(b.dataset.clipedit); } });
  document.addEventListener('dblclick', e => { const c = e.target.closest && e.target.closest('.track-lane-canvas'); if (c && c.dataset.trackId) open(c.dataset.trackId); });
  window.ClipEditor = { open, close, get isOpen() { return E.open; }, state: E, timeToX: tToX, xToTime: xToT, canvas: () => cv, draw, snapT, doSplitAt, doCopy, doPaste, doDel, sync };
})();
