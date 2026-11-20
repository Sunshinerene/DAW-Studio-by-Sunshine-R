/* ===== Sunshine@R: Kreativ-Fenster – Tonart & Tempo · Beat-Slicer · Marker · Import-Assistent ===== */
(function () {
  'use strict';
  if (!window.Creative || !window.StudioAI) return;
  const C = window.Creative, D = window.StudioAI.dsp, MK = C.Markers;
  const $ = id => document.getElementById(id);
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (_) {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nextFrame = () => new Promise(r => setTimeout(r, 16));
  const safe = f => { try { return f(); } catch (e) { console.warn(e); } };
  const audioTracks = () => dawState.tracks.filter(t => t.type !== 'midi' && dawState.buffers[t.id]);
  const trackOf = id => dawState.tracks.find(t => t.id === id);
  const trim = () => (dawState.startOffsetMs || 0) / 1000;
  const barSec = () => 4 * 60 / dawState.bpm;
  const push = () => { try { window.__dawPushUndo && window.__dawPushUndo(); } catch (_) {} };
  const fmtT = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
  const barOf = t => (t / barSec() + 1);
  function refresh() {
    safe(() => typeof renumberTracks === 'function' && renumberTracks());
    dawState.tracks.forEach(t => safe(() => audioEngine.ensureTrackNode(t)));
    safe(() => renderMultiTrackLanes()); safe(() => renderVerticalMixer()); safe(() => updateAudioToMidiDropdown && updateAudioToMidiDropdown());
    safe(() => audioEngine.syncAudioParams && audioEngine.syncAudioParams());
    if (dawState.isPlaying) safe(() => audioEngine.seek(dawState.playheadSec));
  }
  const trackOptions = (sel, extra) => (extra || '') + audioTracks().map(t => `<option value="${esc(t.id)}"${t.id === sel ? ' selected' : ''}>${esc(t.num)} | ${esc(t.name)}</option>`).join('');

  /* ------------------------------------------------------------------ Gemeinsame Optik */
  const CSS = `
.cr-root{position:fixed;inset:0;z-index:145;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center}
.cr-root[hidden]{display:none!important}
.cr-card{width:100%;max-width:560px;max-height:94vh;overflow:auto;-webkit-overflow-scrolling:touch;border-radius:20px 20px 0 0;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:14px 14px max(18px,env(safe-area-inset-bottom))}
.cr-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.cr-head h3{margin:0;font-size:16px;font-weight:800}
.cr-x{min-width:44px;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#e2e8f0;font-size:16px}
.cr-sec{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}
.cr-sec>b{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}
.cr-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.cr-row>label{font-size:12px;color:#94a3b8}
.cr-card select,.cr-card input[type=number],.cr-card input[type=text]{min-height:40px;border-radius:10px;border:1px solid #334155;background:#020617;color:#e2e8f0;padding:0 8px;font-size:13px}
.cr-card input[type=range]{flex:1;min-width:120px}
.cr-btn{min-height:46px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#e2e8f0;font-weight:700;font-size:13px}
.cr-btn.pri{background:#f59e0b;border-color:#f59e0b;color:#1c1100}.cr-btn.sm{min-height:36px;padding:0 10px;font-size:12px}.cr-btn[disabled]{opacity:.45}
.cr-btn.on{background:#0e7490;border-color:#22d3ee;color:#fff}
.cr-box{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px;background:rgba(255,255,255,.04);font-size:12px;line-height:1.45}
.cr-big{font-size:26px;font-weight:900;color:#fbbf24;line-height:1}
.cr-hint{font-size:11px;color:#94a3b8;line-height:1.4}
.cr-prog{height:8px;border-radius:6px;background:#1e293b;overflow:hidden;margin-top:8px}.cr-prog>i{display:block;height:100%;width:0;background:#f59e0b;transition:width .1s}
.cr-pads{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.cr-pad{min-height:46px;border-radius:12px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-weight:800;font-size:15px;position:relative}
.cr-pad small{position:absolute;right:6px;bottom:2px;font-size:9px;font-weight:600;color:#94a3b8}
.cr-pad.sel{border-color:#fbbf24;background:#78350f}.cr-pad[disabled]{opacity:.3}
.cr-steps{display:grid;grid-template-columns:repeat(8,1fr);gap:5px}
.cr-st{min-height:44px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:#e2e8f0;font-weight:800;font-size:14px;position:relative}
.cr-st.beat{border-color:#475569}.cr-st.on{background:#0e7490;border-color:#22d3ee}.cr-st small{position:absolute;left:4px;top:1px;font-size:8px;color:#64748b;font-weight:600}
.cr-cv{width:100%;height:84px;border-radius:12px;background:#020617;border:1px solid #1e293b;display:block;touch-action:manipulation}
.cr-mk{display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.cr-mk input[type=text]{flex:1;min-width:0}.cr-mk .t{font-variant-numeric:tabular-nums;font-size:11px;color:#94a3b8;min-width:64px;text-align:right}
#mk-strip{display:flex;gap:6px;overflow-x:auto;padding:5px 8px;border-top:1px solid rgba(255,255,255,.06);background:rgba(15,23,42,.6);-webkit-overflow-scrolling:touch}
#mk-strip[hidden]{display:none}
#mk-strip button{flex:none;min-height:32px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#e2e8f0;font-size:11px;font-weight:700;white-space:nowrap}
`;
  const st = document.createElement('style'); st.id = 'creative-css'; st.textContent = CSS; document.head.appendChild(st);

  function sheet(id, title) {
    let r = $(id); if (r) return r;
    r = document.createElement('div'); r.id = id; r.className = 'cr-root'; r.hidden = true;
    r.innerHTML = `<div class="cr-card" role="dialog" aria-label="${esc(title)}"><div class="cr-head"><h3>${title}</h3><button type="button" class="cr-x" data-cr-close aria-label="Schließen">✕</button></div><div class="cr-body"></div></div>`;
    document.body.appendChild(r);
    r.addEventListener('click', e => { if (e.target === r || e.target.closest('[data-cr-close]')) closeSheet(r); });
    return r;
  }
  const closeSheet = r => { r.hidden = true; stopPlay(); if (r.id === 'kt-root') KT.cancel = true; };
  function hideMenu() { const m = $('file-menu'); if (m) m.hidden = true; }

  /* ------------------------------------------------------------------ Vorhören */
  let playing = null;
  async function playBuf(buf, s, e, loop, kind) {
    await audioEngine.ensureCtx(); stopPlay();
    const ctx = audioEngine.ctx, src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = 0.9; src.connect(g); g.connect(audioEngine.masterGain || ctx.destination);
    if (loop) { src.loop = true; src.loopStart = s || 0; src.loopEnd = e || buf.duration; }
    src.start(0, s || 0, loop ? undefined : Math.max(0.01, (e || buf.duration) - (s || 0)));
    playing = { src, g, kind }; src.onended = () => { if (playing && playing.src === src) { playing = null; document.dispatchEvent(new Event('cr-stopped')); } };
  }
  document.addEventListener('cr-stopped', () => { const b = $('bs-play'); if (b) b.textContent = '▶ Pattern anhören'; });
  function stopPlay() { if (playing) { try { playing.src.onended = null; playing.src.stop(); playing.g.disconnect(); } catch (_) {} playing = null; document.dispatchEvent(new Event('cr-stopped')); } }

  /* ================================================================== 1) Tonart & Tempo */
  const KT = { src: 'all', key: null, semis: 0, ratio: 1, srcBpm: null, busy: false, cancel: false, scope: 'sel', skipDrums: true, followKey: true, mid: true };
  const keyName = (r, m) => C.NAMES[r] + (m === 'major' ? ' Dur' : ' Moll');
  function ktBufs() { if (KT.src === 'all') return audioTracks().filter(t => D.roleOf(t.name, t.type) !== 'drums' || audioTracks().length === 1).map(t => dawState.buffers[t.id]); const t = trackOf(KT.src); return t && dawState.buffers[t.id] ? [dawState.buffers[t.id]] : []; }
  function ktRender() {
    const r = sheet('kt-root', '🎼 Tonart &amp; Tempo'), body = r.querySelector('.cr-body'), k = KT.key;
    const keyOpts = [];['major', 'minor'].forEach(m => { for (let i = 0; i < 12; i++) keyOpts.push(`<option value="${i}|${m}">${keyName(i, m)}</option>`); });
    body.innerHTML = `
    <div class="cr-sec"><b>1 · Tonart erkennen</b>
      <div class="cr-row"><label for="kt-src">Quelle</label><select id="kt-src" style="flex:1;min-width:0">${trackOptions(KT.src, '<option value="all">Alle Audio-Spuren (ohne Drums)</option>')}</select></div>
      <div class="cr-row"><button type="button" class="cr-btn pri" id="kt-detect">🔍 Tonart erkennen</button></div>
      <div id="kt-keyres" style="margin-top:8px">${k ? ktKeyHtml(k) : '<div class="cr-hint">Analysiert Tonhöhen-Verteilung (Chroma + Krumhansl-Schmuckler). Am besten mit Gesang, Bass, Akkorden – bei reinen Drums nicht sinnvoll.</div>'}</div></div>
    <div class="cr-sec"><b>2 · Transponieren</b>
      <div class="cr-row"><label for="kt-target">Zieltonart</label><select id="kt-target" style="flex:1;min-width:0"><option value="">— nach Halbtönen —</option>${keyOpts.join('')}</select></div>
      <div class="cr-row"><label>Halbtöne</label><button type="button" class="cr-btn sm" id="kt-m">−</button><b id="kt-semis" style="min-width:36px;text-align:center;font-size:18px">${KT.semis > 0 ? '+' : ''}${KT.semis}</b><button type="button" class="cr-btn sm" id="kt-p">+</button><span class="cr-hint" id="kt-semihint"></span></div>
      <div class="cr-row"><label for="kt-scope">Anwenden auf</label><select id="kt-scope"><option value="sel">Nur die Quell-Spur</option><option value="all">Alle Audio-Spuren</option></select></div>
      <label class="cr-hint" style="display:flex;gap:6px;margin-top:6px"><input type="checkbox" id="kt-skipdrums" ${KT.skipDrums ? 'checked' : ''}> Drums/Percussion nicht verändern</label>
      <label class="cr-hint" style="display:flex;gap:6px;margin-top:4px"><input type="checkbox" id="kt-midi" ${KT.mid ? 'checked' : ''}> MIDI-Noten mit verschieben</label>
      <label class="cr-hint" style="display:flex;gap:6px;margin-top:4px"><input type="checkbox" id="kt-follow" ${KT.followKey ? 'checked' : ''}> Projekt-Tonart (Skala im Piano-Roll) mitziehen</label>
      <div class="cr-row"><button type="button" class="cr-btn pri" id="kt-do-pitch">🎚 Transponieren</button></div></div>
    <div class="cr-sec"><b>3 · Tempo angleichen (Tonhöhe bleibt)</b>
      <div class="cr-row"><label>Quelle</label><input type="number" id="kt-srcbpm" min="40" max="240" step="0.1" style="width:90px" value="${KT.srcBpm ? KT.srcBpm : ''}" placeholder="BPM"><button type="button" class="cr-btn sm" id="kt-tempo">🔍 erkennen</button>
        <label>→ Ziel</label><b style="color:#fbbf24">${dawState.bpm} BPM</b></div>
      <div class="cr-hint" id="kt-ratiohint" style="margin-top:6px"></div>
      <div class="cr-row"><button type="button" class="cr-btn pri" id="kt-do-tempo">⏱ Tempo angleichen</button></div></div>
    <div class="cr-prog" id="kt-prog" hidden><i></i></div>
    <div class="cr-row"><button type="button" class="cr-btn" id="kt-cancel" hidden>Abbrechen</button><span class="cr-hint" id="kt-msg"></span></div>
    <div class="cr-hint" style="margin-top:10px">Alles lässt sich mit „↩ Zurück“ umkehren. Rechnet lokal (WSOLA-Zeitdehnung) – bei Änderungen über ±4 Halbtöne bzw. ±25 % Tempo hört man Artefakte, vor allem bei Gesang.</div>`;
    $('kt-src').onchange = e => { KT.src = e.target.value; KT.key = null; ktRender(); };
    $('kt-scope').value = KT.scope;
    ktSync(); wireKt();
  }
  function ktKeyHtml(k) {
    const conf = Math.round(k.confidence * 100), cls = conf >= 55 ? '#34d399' : conf >= 30 ? '#fbbf24' : '#f87171';
    return `<div class="cr-box"><div class="cr-big">${esc(k.name)}</div><div style="margin-top:6px">Sicherheit <b style="color:${cls}">${conf} %</b> · Stimmung ${k.tuneCents > 0 ? '+' : ''}${k.tuneCents} Cent<br>Parallele Tonart: ${esc(k.relative.name)}</div>
      <div class="cr-row">${k.top.slice(1).map(t => `<button type="button" class="cr-btn sm" data-kt-alt="${t.root}|${t.mode}">${esc(t.name)}</button>`).join('')}<span class="cr-hint">andere Kandidaten</span></div>
      <div class="cr-row"><button type="button" class="cr-btn" id="kt-setkey">Als Projekt-Tonart setzen</button></div>${conf < 30 ? '<div class="cr-hint" style="color:#fbbf24;margin-top:6px">Wenig eindeutig – evtl. wenig tonales Material oder wechselnde Tonart.</div>' : ''}</div>`;
  }
  function ktSync() {
    const sv = $('kt-semis'); if (!sv) return;
    sv.textContent = (KT.semis > 0 ? '+' : '') + KT.semis;
    const k = KT.key, h = $('kt-semihint'); if (h) h.textContent = k && KT.semis ? `${k.name} → ${keyName(((k.root + KT.semis) % 12 + 12) % 12, k.mode)}` : '';
    const rh = $('kt-ratiohint'), sb = +($('kt-srcbpm') && $('kt-srcbpm').value) || 0;
    if (rh) { if (sb > 0) { KT.ratio = sb / dawState.bpm; const dev = Math.abs(KT.ratio - 1) * 100; rh.textContent = `Faktor ${KT.ratio.toFixed(3)} (${KT.ratio > 1 ? 'verlangsamt' : 'beschleunigt'} um ${dev.toFixed(1)} %)${dev > 25 ? ' – groß, hörbare Artefakte möglich' : dev < 0.3 ? ' – praktisch gleich' : ''}${dev > 100 ? '' : ''}`; } else rh.textContent = 'Quell-Tempo eintragen oder erkennen lassen.'; }
  }
  function wireKt() {
    $('kt-detect').onclick = async () => {
      const bufs = ktBufs(); if (!bufs.length) { say('Keine Audio-Spur zum Analysieren.', 'warn'); return; }
      $('kt-keyres').innerHTML = '<span class="cr-hint">Analysiere …</span>'; await nextFrame();
      const k = C.detectKey(bufs, {}); if (k.error) { $('kt-keyres').innerHTML = `<span style="color:#fbbf24;font-size:12px">${esc(k.error)}</span>`; return; }
      KT.key = k; $('kt-keyres').innerHTML = ktKeyHtml(k); wireKeyBtns(); ktSync();
    };
    wireKeyBtns();
    const upd = () => ktSync(); $('kt-srcbpm').oninput = upd;
    $('kt-m').onclick = () => { KT.semis = clamp(KT.semis - 1, -12, 12); $('kt-target').value = ''; ktSync(); };
    $('kt-p').onclick = () => { KT.semis = clamp(KT.semis + 1, -12, 12); $('kt-target').value = ''; ktSync(); };
    $('kt-target').onchange = e => {
      if (!e.target.value) return; if (!KT.key) { say('Zuerst die Tonart erkennen – sonst ist der Ausgangspunkt unbekannt.', 'warn'); e.target.value = ''; return; }
      const [r, m] = e.target.value.split('|'), eq = (root, mode) => mode === 'minor' ? (root + 3) % 12 : root;   /* Moll → gleichnamige Dur-Parallele, damit C Dur → A Moll = 0 */
      KT.semis = C.semiDist(eq(KT.key.root, KT.key.mode), eq(+r, m)); ktSync();
    };
    $('kt-scope').onchange = e => { KT.scope = e.target.value; };
    $('kt-skipdrums').onchange = e => { KT.skipDrums = e.target.checked; }; $('kt-midi').onchange = e => { KT.mid = e.target.checked; }; $('kt-follow').onchange = e => { KT.followKey = e.target.checked; };
    $('kt-tempo').onclick = async () => {
      const bufs = ktBufs(); if (!bufs.length) return; $('kt-ratiohint').textContent = 'Analysiere Tempo …'; await nextFrame();
      const sr = bufs[0].sampleRate; let x = D.toMono(bufs[0], 90, 0).x;
      for (let i = 1; i < bufs.length; i++) { if (bufs[i].sampleRate !== sr) continue; const m = D.toMono(bufs[i], 90, 0).x, n = Math.min(x.length, m.length), y = new Float32Array(n); for (let k = 0; k < n; k++) y[k] = x[k] + m[k]; x = y; }
      const r = D.detectTempo(x, sr, {}); if (r.error) { $('kt-ratiohint').textContent = r.error; return; }
      KT.srcBpm = Math.round(r.bpmApp * 10) / 10; $('kt-srcbpm').value = KT.srcBpm; ktSync();
    };
    $('kt-do-pitch').onclick = () => ktRun('pitch'); $('kt-do-tempo').onclick = () => ktRun('tempo');
    $('kt-cancel').onclick = () => { KT.cancel = true; };
  }
  function wireKeyBtns() {
    document.querySelectorAll('[data-kt-alt]').forEach(b => b.onclick = () => { const [r, m] = b.dataset.ktAlt.split('|'); KT.key = Object.assign({}, KT.key, { root: +r, mode: m, name: keyName(+r, m), short: C.NAMES[+r] }); $('kt-keyres').innerHTML = ktKeyHtml(KT.key); wireKeyBtns(); ktSync(); });
    const sk = $('kt-setkey'); if (sk) sk.onclick = () => { setProjectKey(KT.key.root, KT.key.mode); say('Projekt-Tonart: ' + KT.key.name, 'success'); };
  }
  function setProjectKey(root, mode) {
    dawState.midiRoot = ((root % 12) + 12) % 12; dawState.midiScale = mode === 'major' ? 'major' : 'minor';
    const rs = $('select-midi-root'), ss = $('select-midi-scale'); if (rs) rs.value = String(dawState.midiRoot); if (ss) ss.value = dawState.midiScale;
    safe(() => drawPianoRoll());
  }
  function targetTracks() {
    let list = KT.scope === 'all' ? audioTracks() : [trackOf(KT.src)].filter(t => t && dawState.buffers[t.id]);
    if (KT.scope === 'all' && KT.skipDrums) list = list.filter(t => D.roleOf(t.name, t.type) !== 'drums');
    if (KT.scope === 'sel' && KT.src === 'all') list = audioTracks().filter(t => D.roleOf(t.name, t.type) !== 'drums');
    return list;
  }
  async function ktRun(kind) {
    if (KT.busy) return; const semis = KT.semis, ratio = KT.ratio;
    const list = targetTracks(); if (!list.length) { say('Keine passende Audio-Spur.', 'warn'); return; }
    if (kind === 'pitch' && !semis) { say('Halbtöne auf 0 – nichts zu tun.', 'info'); return; }
    if (kind === 'tempo') { const sb = +$('kt-srcbpm').value; if (!(sb > 0)) { say('Bitte das Quell-Tempo eintragen oder erkennen lassen.', 'warn'); return; } if (Math.abs(sb / dawState.bpm - 1) < 0.003) { say('Tempo ist praktisch schon gleich.', 'info'); return; } if (sb / dawState.bpm < 0.5 || sb / dawState.bpm > 2) { say('Faktor außerhalb 0,5–2 – Quell-Tempo prüfen (evtl. halbes/doppeltes Tempo).', 'warn'); return; } KT.ratio = sb / dawState.bpm; }
    await audioEngine.ensureCtx(); KT.busy = true; KT.cancel = false; const ctx = audioEngine.ctx, prog = $('kt-prog'), bar = prog.firstElementChild, cb = $('kt-cancel');
    prog.hidden = false; cb.hidden = false; $('kt-do-pitch').disabled = $('kt-do-tempo').disabled = true; const t0 = performance.now(), out = [];
    try {
      for (let i = 0; i < list.length; i++) {
        const t = list[i], buf = dawState.buffers[t.id]; $('kt-msg').textContent = `${t.name} (${i + 1}/${list.length}) …`;
        const o = { onProgress: f => { bar.style.width = Math.round(((i + f) / list.length) * 100) + '%'; }, cancel: () => KT.cancel };
        out.push({ t, buf: kind === 'pitch' ? await C.pitchBuffer(ctx, buf, semis, o) : await C.stretchBuffer(ctx, buf, KT.ratio, o) });
      }
      push();
      out.forEach(({ t, buf }) => {
        dawState.buffers[t.id] = buf;
        if (kind === 'tempo' && t.clips) { const r = KT.ratio; t.clips.forEach(c => { c.start *= r; c.dur *= r; if ((c.src || t.id) === t.id) c.offset *= r; if (c.fi) c.fi *= r; if (c.fo) c.fo *= r; }); if (t.auto) Object.values(t.auto).forEach(a => a.forEach(p => { p.t *= r; })); }
        else if (kind === 'tempo' && t.auto) Object.values(t.auto).forEach(a => a.forEach(p => { p.t *= KT.ratio; }));
      });
      if (kind === 'pitch') {
        if (KT.mid) { safe(() => syncActiveMidiTrackFromState()); dawState.tracks.filter(t => t.type === 'midi').forEach(t => { (t.midiNotes || []).forEach(n => { n.pitch = clamp(n.pitch + semis, 0, 127); }); }); const a = dawState.tracks.find(t => t.id === dawState.activeMidiTrackId); if (a) dawState.midiNotes = JSON.parse(JSON.stringify(a.midiNotes || [])); safe(() => drawPianoRoll()); }
        if (KT.followKey) setProjectKey(dawState.midiRoot + semis, dawState.midiScale === 'major' ? 'major' : 'minor');
        if (KT.key) KT.key = Object.assign({}, KT.key, { root: ((KT.key.root + semis) % 12 + 12) % 12 }), KT.key.name = keyName(KT.key.root, KT.key.mode), KT.key.short = C.NAMES[KT.key.root];
      }
      refresh();
      const sec = ((performance.now() - t0) / 1000).toFixed(1);
      $('kt-msg').textContent = ''; say(kind === 'pitch' ? `${out.length} Spur(en) um ${semis > 0 ? '+' : ''}${semis} Halbtöne transponiert (${sec} s) – „↩ Zurück“ macht es rückgängig.` : `${out.length} Spur(en) auf ${dawState.bpm} BPM angeglichen (${sec} s).`, 'success');
      if (kind === 'pitch') { KT.semis = 0; }
      ktRender();
    } catch (e) { say(e && e.message === 'abgebrochen' ? 'Abgebrochen – nichts verändert.' : 'Fehler: ' + (e && e.message), 'warn'); $('kt-msg').textContent = ''; }
    finally { KT.busy = false; const p = $('kt-prog'); if (p) p.hidden = true; const c = $('kt-cancel'); if (c) c.hidden = true; const a = $('kt-do-pitch'), b = $('kt-do-tempo'); if (a) a.disabled = false; if (b) b.disabled = false; }
  }
  function openKey() { hideMenu(); if (KT.src !== 'all' && !trackOf(KT.src)) KT.src = 'all'; const r = sheet('kt-root', '🎼 Tonart &amp; Tempo'); ktRender(); r.hidden = false; }

  /* ================================================================== 2) Beat-Slicer */
  const BS = { tid: null, from: 1, bars: 1, mode: 'transient', grid: 1 / 16, sens: 0.5, slices: [], pad: 0, steps: [], swing: 0, repeat: 2, rev: {}, buf: null, r0: 0 };
  function bsSteps() { return 16 * BS.bars; }
  function bsRender() {
    const r = sheet('bs-root', '✂️ Beat-Slicer'), body = r.querySelector('.cr-body'); if (!BS.tid || !trackOf(BS.tid) || !dawState.buffers[BS.tid]) { const a = audioTracks()[0]; BS.tid = a ? a.id : null; }
    if (!BS.tid) { body.innerHTML = '<div class="cr-hint" style="margin-top:14px">Noch keine Audio-Spur geladen – zuerst Stems importieren.</div>'; return; }
    body.innerHTML = `
    <div class="cr-sec"><b>1 · Quelle &amp; Slices</b>
      <div class="cr-row"><label for="bs-src">Spur</label><select id="bs-src" style="flex:1;min-width:0">${trackOptions(BS.tid)}</select></div>
      <div class="cr-row"><label for="bs-from">Ab Takt</label><input type="number" id="bs-from" min="1" max="999" value="${BS.from}" style="width:70px"><label for="bs-bars">Länge</label><select id="bs-bars"><option value="1">1 Takt</option><option value="2">2 Takte</option></select></div>
      <div class="cr-row"><label for="bs-mode">Schnitt</label><select id="bs-mode"><option value="transient">An Schlägen (Transienten)</option><option value="grid">Im Raster</option></select><select id="bs-grid"><option value="0.25">¼</option><option value="0.125">⅛</option><option value="0.0625">1/16</option></select></div>
      <div class="cr-row" id="bs-sensrow"><label for="bs-sens">Empfindlichkeit</label><input type="range" id="bs-sens" min="0" max="100" value="${Math.round(BS.sens * 100)}"></div>
      <div class="cr-row"><button type="button" class="cr-btn pri" id="bs-find">✂️ Slices finden</button><span class="cr-hint" id="bs-info"></span></div>
      <canvas id="bs-cv" class="cr-cv" aria-label="Wellenform mit Slices"></canvas></div>
    <div class="cr-sec"><b>2 · Pads (antippen = vorhören · max. 16)</b><div class="cr-pads" id="bs-pads"></div></div>
    <div class="cr-sec"><b>3 · Pattern – Pad wählen, dann Steps antippen</b>
      <div class="cr-steps" id="bs-steps"></div>
      <div class="cr-row"><button type="button" class="cr-btn sm" id="bs-orig">Originalrhythmus</button><button type="button" class="cr-btn sm" id="bs-rand">🎲 Zufall</button><button type="button" class="cr-btn sm" id="bs-clr">Leeren</button><button type="button" class="cr-btn sm" id="bs-rev">↺ Pad rückwärts</button></div>
      <div class="cr-row"><label for="bs-swing">Swing</label><input type="range" id="bs-swing" min="0" max="60" value="${Math.round(BS.swing * 100)}"><label for="bs-rep">Wiederholen</label><select id="bs-rep"><option>1</option><option>2</option><option>4</option><option>8</option></select></div></div>
    <div class="cr-sec"><b>4 · Ergebnis</b>
      <div class="cr-row"><button type="button" class="cr-btn" id="bs-play">▶ Pattern anhören</button><button type="button" class="cr-btn pri" id="bs-new">➕ Als neue Audio-Spur</button></div>
      <div class="cr-row"><button type="button" class="cr-btn" id="bs-cut">✂️ Original an den Slices schneiden</button></div>
      <div class="cr-hint" style="margin-top:6px">„Neue Spur“ rendert das Pattern ab Takt 1 (Projekt-BPM ${dawState.bpm}), die Original-Spur bleibt. „Schneiden“ teilt die Original-Spur in Clips, die du dann im Clip-Editor umordnen kannst.</div></div>`;
    $('bs-bars').value = String(BS.bars); $('bs-mode').value = BS.mode; $('bs-grid').value = String(BS.grid); $('bs-rep').value = String(BS.repeat);
    bsWire(); bsDraw(); bsPads(); bsStepsUi(); bsSyncMode();
  }
  function bsSyncMode() { const g = BS.mode === 'grid'; $('bs-grid').style.display = g ? '' : 'none'; $('bs-sensrow').style.display = g ? 'none' : ''; }
  function bsRange() { const buf = dawState.buffers[BS.tid]; if (!buf) return null; const s = trim() + (BS.from - 1) * barSec(), e = Math.min(buf.duration, s + BS.bars * barSec()); return e - s > 0.05 ? { buf, s, e } : null; }
  function bsFind() {
    const R = bsRange(); if (!R) { $('bs-info').textContent = 'Bereich liegt hinter dem Ende der Datei.'; return; }
    BS.buf = R.buf; BS.r0 = R.s; BS.slices = C.makeSlices(R.buf, { mode: BS.mode, bpm: dawState.bpm, grid: BS.grid, sens: BS.sens, startSec: R.s, endSec: R.e, firstSec: R.s, max: 16 });
    BS.pad = 0; BS.steps = new Array(bsSteps()).fill(-1); bsOriginal(); BS.rev = {};
    $('bs-info').textContent = BS.slices.length + ' Slices' + (BS.mode === 'transient' && BS.slices.length < 3 ? ' – wenige gefunden, Empfindlichkeit erhöhen' : '');
    bsDraw(); bsPads(); bsStepsUi();
  }
  function bsOriginal() { const st16 = 60 / dawState.bpm / 4; BS.steps = new Array(bsSteps()).fill(-1); BS.slices.forEach((s, i) => { const k = Math.round((s.start - BS.r0) / st16); if (k >= 0 && k < BS.steps.length) BS.steps[k] = i; }); }
  function bsDraw() {
    const cv = $('bs-cv'); if (!cv) return; const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 300, h = cv.clientHeight || 84; cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, w, h); const R = bsRange(); if (!R) return;
    const d = R.buf.getChannelData(0), sr = R.buf.sampleRate, n = Math.floor((R.e - R.s) * sr), a0 = Math.floor(R.s * sr); g.fillStyle = '#22d3ee';
    for (let x = 0; x < w; x++) { const i0 = a0 + Math.floor(x / w * n), i1 = a0 + Math.floor((x + 1) / w * n); let m = 0; for (let i = i0; i < i1; i += Math.max(1, (i1 - i0) >> 4)) { const v = Math.abs(d[i] || 0); if (v > m) m = v; } const bh = Math.max(1, m * h * 0.9); g.fillRect(x, h / 2 - bh / 2, 1, bh); }
    BS.slices.forEach((s, i) => { const x = (s.start - R.s) / (R.e - R.s) * w; g.fillStyle = i === BS.pad ? '#fbbf24' : '#f472b6'; g.fillRect(x, 0, 1.5, h); g.font = 'bold 10px sans-serif'; g.fillText(String(i + 1), x + 3, 11); });
  }
  function bsPads() {
    const el = $('bs-pads'); if (!el) return; el.innerHTML = '';
    for (let i = 0; i < 16; i++) { const s = BS.slices[i], b = document.createElement('button'); b.type = 'button'; b.className = 'cr-pad' + (i === BS.pad && s ? ' sel' : ''); b.disabled = !s; b.dataset.pad = i; b.innerHTML = (i + 1) + (s ? `<small>${((s.end - s.start) * 1000).toFixed(0)} ms${BS.rev[i] ? ' ↺' : ''}</small>` : ''); el.appendChild(b); }
  }
  function bsStepsUi() {
    const el = $('bs-steps'); if (!el) return; el.innerHTML = ''; const n = bsSteps();
    for (let i = 0; i < n; i++) { const v = BS.steps[i], b = document.createElement('button'); b.type = 'button'; b.className = 'cr-st' + (i % 4 === 0 ? ' beat' : '') + (v >= 0 ? ' on' : ''); b.dataset.step = i; b.innerHTML = `<small>${i % 4 === 0 ? (i / 4 + 1) : ''}</small>${v >= 0 ? v + 1 : ''}`; b.setAttribute('aria-label', `Step ${i + 1}${v >= 0 ? ', Pad ' + (v + 1) : ', leer'}`); el.appendChild(b); }
  }
  function bsRenderBuf() {
    if (!BS.slices.length) return null; const ctx = audioEngine.ctx;
    const pat = C.renderPattern(ctx, BS.buf, BS.slices, BS.steps, { bpm: dawState.bpm, bars: BS.repeat, swing: BS.swing, reverse: bsRevSteps() });
    return pat;
  }
  function bsRevSteps() { const o = {}; BS.steps.forEach((v, i) => { if (v >= 0 && BS.rev[v]) o[i] = true; }); return o; }
  function bsWire() {
    $('bs-src').onchange = e => { BS.tid = e.target.value; BS.slices = []; bsDraw(); bsPads(); bsStepsUi(); $('bs-info').textContent = ''; };
    $('bs-from').onchange = e => { BS.from = clamp(parseInt(e.target.value, 10) || 1, 1, 999); e.target.value = BS.from; BS.slices = []; bsDraw(); bsPads(); };
    $('bs-bars').onchange = e => { BS.bars = +e.target.value; BS.slices = []; BS.steps = new Array(bsSteps()).fill(-1); bsDraw(); bsPads(); bsStepsUi(); };
    $('bs-mode').onchange = e => { BS.mode = e.target.value; bsSyncMode(); }; $('bs-grid').onchange = e => { BS.grid = +e.target.value; };
    $('bs-sens').oninput = e => { BS.sens = e.target.value / 100; }; $('bs-swing').oninput = e => { BS.swing = e.target.value / 100; }; $('bs-rep').onchange = e => { BS.repeat = +e.target.value; };
    $('bs-find').onclick = async () => { await audioEngine.ensureCtx(); bsFind(); };
    const cv = $('bs-cv'); cv.onclick = e => { const R = bsRange(); if (!R || !BS.slices.length) return; const t = R.s + (e.offsetX / cv.clientWidth) * (R.e - R.s); let k = 0; BS.slices.forEach((s, i) => { if (s.start <= t) k = i; }); BS.pad = k; bsDraw(); bsPads(); prev(k); };
    $('bs-pads').onclick = e => { const b = e.target.closest('[data-pad]'); if (!b || b.disabled) return; BS.pad = +b.dataset.pad; bsDraw(); bsPads(); prev(BS.pad); };
    $('bs-steps').onclick = e => { const b = e.target.closest('[data-step]'); if (!b || !BS.slices.length) return; const i = +b.dataset.step; BS.steps[i] = BS.steps[i] === BS.pad ? -1 : BS.pad; bsStepsUi(); if (BS.steps[i] >= 0) prev(BS.pad); };
    $('bs-orig').onclick = () => { bsOriginal(); bsStepsUi(); };
    $('bs-rand').onclick = () => { const n = BS.slices.length; if (!n) return; BS.steps = BS.steps.map((_, i) => (i % 2 === 0 || Math.random() < 0.35) ? Math.floor(Math.random() * n) : -1); bsStepsUi(); };
    $('bs-clr').onclick = () => { BS.steps = new Array(bsSteps()).fill(-1); bsStepsUi(); };
    $('bs-rev').onclick = () => { if (!BS.slices[BS.pad]) return; BS.rev[BS.pad] = !BS.rev[BS.pad]; bsPads(); say(`Pad ${BS.pad + 1}: ${BS.rev[BS.pad] ? 'rückwärts' : 'vorwärts'}`, 'info'); };
    $('bs-play').onclick = async () => { await audioEngine.ensureCtx(); if (playing && playing.kind === 'pat') { stopPlay(); return; } const o = bsRenderBuf(); if (!o) { say('Erst „Slices finden“.', 'warn'); return; } $('bs-play').textContent = '■ Stopp'; await playBuf(o, 0, o.duration, true, 'pat'); };
    $('bs-new').onclick = async () => {
      await audioEngine.ensureCtx(); const o = bsRenderBuf(); if (!o) { say('Erst „Slices finden“.', 'warn'); return; }
      const ctx = audioEngine.ctx, pre = Math.round(trim() * o.sampleRate), out = ctx.createBuffer(o.numberOfChannels, o.length + pre, o.sampleRate);
      for (let c = 0; c < o.numberOfChannels; c++) out.getChannelData(c).set(o.getChannelData(c), pre);
      push(); const src = trackOf(BS.tid), tr = createTrack('audio', ('Slices ' + (src ? src.name : '')).slice(0, 28)); dawState.buffers[tr.id] = out; tr.color = src ? src.color : tr.color; refresh();
      say(`Neue Spur „${tr.name}“ (${BS.repeat}× ${bsSteps()} Steps) angelegt.`, 'success');
    };
    $('bs-cut').onclick = () => {
      if (!BS.slices.length) { say('Erst „Slices finden“.', 'warn'); return; } const tr = trackOf(BS.tid); if (!tr) return; push(); let n = 0;
      BS.slices.slice(1).forEach(s => { (ClipModel.has(tr) ? tr.clips : ClipModel.list(tr)).slice().forEach(c => { if ((c.src || tr.id) !== tr.id) return; if (s.start > c.offset && s.start < c.offset + c.dur) n += ClipModel.split(tr, c.start + (s.start - c.offset), c.implicit ? undefined : c.id); }); });
      refresh(); say(n ? `„${tr.name}“ an ${n} Stellen geschnitten – im Clip-Editor (⤢) umordnen.` : 'Nichts zu schneiden (Slices liegen schon an Clip-Grenzen).', n ? 'success' : 'info');
    };
    window.addEventListener('resize', () => { if (!$('bs-root').hidden) bsDraw(); });
  }
  async function prev(i) { const s = BS.slices[i]; if (!s || !BS.buf) return; await audioEngine.ensureCtx(); const b = BS.buf; if (BS.rev[i]) { const ctx = audioEngine.ctx, sr = b.sampleRate, a = Math.round(s.start * sr), z = Math.round(s.end * sr), o = ctx.createBuffer(b.numberOfChannels, z - a, sr); for (let c = 0; c < b.numberOfChannels; c++) { const src = b.getChannelData(c), dst = o.getChannelData(c); for (let k = 0; k < z - a; k++) dst[k] = src[z - 1 - k]; } playBuf(o, 0, o.duration); } else playBuf(b, s.start, s.end); }
  function openSlicer() { hideMenu(); const r = sheet('bs-root', '✂️ Beat-Slicer'); BS.slices = BS.slices.length && BS.buf === dawState.buffers[BS.tid] ? BS.slices : []; bsRender(); r.hidden = false; bsDraw(); }

  /* ================================================================== 3) Marker */
  function mkOpen() { hideMenu(); const r = sheet('mk-root', '🚩 Strukturmarker'); mkRender(); r.hidden = false; }
  function mkRender() {
    const r = $('mk-root'), body = r.querySelector('.cr-body'), l = MK.list();
    body.innerHTML = `
    <div class="cr-row"><button type="button" class="cr-btn pri" id="mk-add">＋ Marker an Abspielposition (${fmtT(dawState.playheadSec || 0)})</button></div>
    <div class="cr-row"><button type="button" class="cr-btn sm" id="mk-sec">Aus Arrangement</button><button type="button" class="cr-btn sm" id="mk-det">🔍 Struktur erkennen</button><button type="button" class="cr-btn sm" id="mk-clr" ${l.length ? '' : 'disabled'}>Alle löschen</button></div>
    <div class="cr-hint" style="margin:6px 0">Antippen von ▶ springt zur Stelle. Marker erscheinen auch als Chips über den Spuren. „Struktur erkennen“ sucht Lautstärke-Sprünge (Intro/Strophe/Refrain …) und rastet auf Takte ein.</div>
    <div id="mk-list">${l.length ? l.map(m => `<div class="cr-mk" data-id="${m.id}"><button type="button" class="cr-btn sm" data-go aria-label="Springen">▶</button><input type="text" value="${esc(m.name)}" maxlength="24" data-name aria-label="Name"><span class="t">Takt ${barOf(m.t).toFixed(1)}<br>${fmtT(m.t)}</span><button type="button" class="cr-btn sm" data-here title="auf Abspielposition setzen" aria-label="Auf Abspielposition setzen">⌖</button><button type="button" class="cr-btn sm" data-del aria-label="Löschen">🗑</button></div>`).join('') : '<div class="cr-hint">Noch keine Marker.</div>'}</div>`;
    $('mk-add').onclick = () => { push(); const m = MK.add(dawState.playheadSec || 0, 'Marker ' + (MK.list().length + 1)); mkRender(); stripRender(); say('Marker gesetzt bei Takt ' + barOf(m.t).toFixed(1), 'success'); };
    $('mk-sec').onclick = () => { const f = MK.fromSections(dawState.bpm); if (!f.length) return; push(); f.forEach(s => { if (!MK.list().some(m => Math.abs(m.t - s.t) < 0.05)) MK.add(s.t, s.name, s.color); }); mkRender(); stripRender(); };
    $('mk-det').onclick = async () => {
      const bufs = audioTracks().map(t => dawState.buffers[t.id]); if (!bufs.length) { say('Keine Audio-Spur geladen.', 'warn'); return; }
      $('mk-det').textContent = 'Analysiere …'; await nextFrame(); const res = MK.detect(bufs, { bpm: dawState.bpm }).map(x => Object.assign({}, x, { t: Math.max(0, x.t - trim()) }));
      push(); let n = 0; res.forEach(x => { if (!MK.list().some(m => Math.abs(m.t - x.t) < 0.5)) { MK.add(x.t, x.name); n++; } }); mkRender(); stripRender(); say(n ? n + ' Marker vorgeschlagen – Namen anpassen.' : 'Keine deutlichen Wechsel gefunden.', n ? 'success' : 'info');
    };
    $('mk-clr').onclick = () => { push(); dawState.markers = []; mkRender(); stripRender(); };
    $('mk-list').onclick = e => { const row = e.target.closest('.cr-mk'); if (!row) return; const id = row.dataset.id, m = MK.list().find(x => x.id === id); if (!m) return;
      if (e.target.closest('[data-go]')) { jump(m); } else if (e.target.closest('[data-del]')) { push(); MK.remove(id); mkRender(); stripRender(); } else if (e.target.closest('[data-here]')) { push(); MK.move(id, dawState.playheadSec || 0); mkRender(); stripRender(); } };
    $('mk-list').onchange = e => { const row = e.target.closest('.cr-mk'); if (row && e.target.matches('[data-name]')) { push(); MK.rename(row.dataset.id, e.target.value); stripRender(); } };
  }
  function jump(m) { try { audioEngine.seek(m.t); } catch (_) { dawState.playheadSec = m.t; } say(`Sprung zu „${m.name}“ (Takt ${barOf(m.t).toFixed(1)})`, 'info'); }
  let stripSig = '';
  function stripRender(force) {
    const lanes = $('multitrack-lanes'); if (!lanes) return; let s = $('mk-strip');
    if (!s) { s = document.createElement('div'); s.id = 'mk-strip'; s.hidden = true; s.setAttribute('aria-label', 'Strukturmarker'); lanes.parentNode.insertBefore(s, lanes); s.addEventListener('click', e => { const b = e.target.closest('[data-mk]'); if (!b) return; if (b.dataset.mk === '+') { mkOpen(); return; } const m = MK.list().find(x => x.id === b.dataset.mk); if (m) jump(m); }); }
    const l = MK.list(), sig = JSON.stringify(l); if (!force && sig === stripSig) return; stripSig = sig;
    s.hidden = !l.length; s.innerHTML = l.map(m => `<button type="button" data-mk="${m.id}" style="border-color:${esc(m.color)}">🚩 ${esc(m.name)} <span style="opacity:.6">T${barOf(m.t).toFixed(0)}</span></button>`).join('') + '<button type="button" data-mk="+" aria-label="Marker bearbeiten">✎</button>';
  }
  setInterval(() => { safe(() => stripRender()); }, 700);

  /* ================================================================== 4) Import-Assistent */
  const LS = 'sunshine-import-assist', ROLE_COL = { vocal: '#f472b6', drums: '#fb923c', bass: '#60a5fa', fx: '#c084fc', other: '#34d399' };
  const autoOn = () => { try { return localStorage.getItem(LS) !== 'off'; } catch (_) { return true; } };
  const IA = { ids: [], tempo: null, key: null, rows: [], busy: false };
  async function iaOpen(ids) {
    hideMenu(); const r = sheet('ia-root', '🧭 Import-Assistent'), body = r.querySelector('.cr-body');
    IA.ids = (ids && ids.length ? ids : audioTracks().map(t => t.id)).filter(id => dawState.buffers[id]); IA.tempo = IA.key = null; IA.rows = [];
    if (!IA.ids.length) { body.innerHTML = '<div class="cr-hint" style="margin-top:14px">Keine Audio-Spuren zum Analysieren.</div>'; r.hidden = false; return; }
    body.innerHTML = '<div class="cr-hint" style="margin-top:14px">Analysiere Tempo, Tonart und Rollen … <span id="ia-st"></span></div>'; r.hidden = false; await nextFrame(); await audioEngine.ensureCtx();
    const tr = IA.ids.map(trackOf).filter(Boolean), bufs = tr.map(t => dawState.buffers[t.id]);
    try {
      $('ia-st').textContent = '(Rollen)'; await nextFrame();
      IA.rows = tr.map(t => { const b = dawState.buffers[t.id], st = D.trackStats(b, 60), role = D.roleOf(t.name, t.type, st); return { id: t.id, name: t.name, role, roleName: D.ROLE_NAME[role] || role, silent: st.rmsDb < -70 }; });
      $('ia-st').textContent = '(Tempo)'; await nextFrame();
      const sr = bufs[0].sampleRate; let x = null; bufs.forEach(b => { if (b.sampleRate !== sr) return; const m = D.toMono(b, 90, 0).x; if (!x) x = m.slice(); else { const n = Math.min(x.length, m.length), y = new Float32Array(n); for (let k = 0; k < n; k++) y[k] = x[k] + m[k]; x = y; } });
      const t = x ? D.detectTempo(x, sr, {}) : { error: 'kein Audio' }; IA.tempo = t.error ? null : t;
      $('ia-st').textContent = '(Tonart)'; await nextFrame();
      const kb = tr.filter((t, i) => IA.rows[i].role !== 'drums' && !IA.rows[i].silent).map(t => dawState.buffers[t.id]); const k = kb.length ? C.detectKey(kb, {}) : { error: 'nur Drums' }; IA.key = k.error ? null : k;
    } catch (e) { console.warn(e); }
    iaRender();
  }
  function iaRender() {
    const body = $('ia-root').querySelector('.cr-body'), T = IA.tempo, K = IA.key, bar = T ? (T.firstBarSec != null ? T.firstBarSec : T.firstBeatSec || 0) : 0;
    body.innerHTML = `<div class="cr-hint" style="margin:8px 0">Ich habe die neuen Spuren angehört. Hake an, was übernommen werden soll – alles in einem Schritt, mit „↩ Zurück“ umkehrbar.</div>
    <div class="cr-box"><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="ia-bpm" ${T ? 'checked' : 'disabled'}><span><b>Tempo:</b> ${T ? `<span style="color:#fbbf24;font-weight:800">${T.bpmApp} BPM</span> <span class="cr-hint">(Sicherheit ${Math.round((T.confidence || 0) * 100)} %)</span>` : '<span class="cr-hint">nicht erkannt</span>'}${T && T.bpmApp === dawState.bpm ? ' <span class="cr-hint">– entspricht schon dem Projekt</span>' : ''}</span></label>
      <label style="display:flex;gap:8px;align-items:flex-start;margin-top:8px"><input type="checkbox" id="ia-bar" ${T && bar > 0.02 ? 'checked' : (T ? '' : 'disabled')}><span><b>Takt 1 ausrichten:</b> ${T ? bar.toFixed(2) + ' s <span class="cr-hint">(Vorspann/Stille wird übersprungen)</span>' : '–'}</span></label></div>
    <div class="cr-box" style="margin-top:8px"><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="ia-key" ${K ? 'checked' : 'disabled'}><span><b>Tonart:</b> ${K ? `<span style="color:#fbbf24;font-weight:800">${esc(K.name)}</span> <span class="cr-hint">(Sicherheit ${Math.round(K.confidence * 100)} %)</span> <span class="cr-hint">→ Skala im Piano-Roll</span>` : '<span class="cr-hint">nicht erkannt</span>'}</span></label></div>
    <div class="cr-box" style="margin-top:8px"><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="ia-col" checked><span><b>Farben nach Rolle</b> <span class="cr-hint">(Gesang · Drums · Bass · FX · Sonstiges)</span></span></label>
      <div style="margin-top:6px">${IA.rows.map(r => `<div class="cr-hint" style="display:flex;gap:8px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;background:${ROLE_COL[r.role] || '#94a3b8'};display:inline-block"></i><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0">${esc(r.name)}</span><span>${esc(r.roleName)}${r.silent ? ' · stumm' : ''}</span></div>`).join('')}</div></div>
    <div class="cr-box" style="margin-top:8px"><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="ia-mix" checked><span><b>Start-Mischung</b> <span class="cr-hint">(Pegel, Panorama, Low-Cut je Rolle – wie beim Auto-Mix)</span></span></label></div>
    <div class="cr-row"><button type="button" class="cr-btn pri" id="ia-ok" style="flex:1">✔ Übernehmen</button><button type="button" class="cr-btn" data-cr-close>Später</button></div>
    <label class="cr-hint" style="display:flex;gap:6px;margin-top:10px"><input type="checkbox" id="ia-auto" ${autoOn() ? 'checked' : ''}> Nach jedem Import automatisch anzeigen (jederzeit auch über ☰ → 🧭 Import-Assistent)</label>`;
    $('ia-auto').onchange = e => { try { localStorage.setItem(LS, e.target.checked ? 'on' : 'off'); } catch (_) {} };
    $('ia-ok').onclick = iaApply;
  }
  async function iaApply() {
    if (IA.busy) return; IA.busy = true; const T = IA.tempo, K = IA.key, done = [];
    try {
      push();
      if ($('ia-bpm').checked && T) { const inp = $('input-bpm'); inp.value = clamp(T.bpmApp, 60, 180); inp.dispatchEvent(new Event('change', { bubbles: true })); done.push(dawState.bpm + ' BPM'); }
      if ($('ia-bar').checked && T) { const b = T.firstBarSec != null ? T.firstBarSec : T.firstBeatSec || 0; dawState.startOffsetMs = Math.max(0, Math.round(b * 1000)); const l = $('lbl-trim-offset'); if (l) l.textContent = dawState.startOffsetMs + ' ms'; done.push('Takt 1 bei ' + dawState.startOffsetMs + ' ms'); }
      if ($('ia-key').checked && K) { setProjectKey(K.root, K.mode); done.push(K.name); }
      if ($('ia-col').checked) { IA.rows.forEach(r => { const t = trackOf(r.id); if (t && ROLE_COL[r.role]) t.color = ROLE_COL[r.role]; }); done.push('Farben'); }
      if ($('ia-mix').checked) {
        const items = IA.ids.map(trackOf).filter(Boolean).map(t => ({ id: t.id, name: t.name, type: t.type, vol: t.vol, pan: t.pan || 0, lowCut: !!t.lowCut, buf: dawState.buffers[t.id] || null }));
        $('ia-ok').textContent = 'Mische …'; await nextFrame(); const r = D.suggestMix(items, {}); let n = 0;
        (r.rows || []).forEach(x => { if (x.skipped || x.silent || x.newVol == null) return; const t = trackOf(x.id); if (t) { t.vol = x.newVol; t.pan = x.newPan; t.lowCut = !!x.newLowCut; n++; } }); done.push(n + ' Spuren gemischt');
      }
      refresh(); say('Übernommen: ' + (done.join(' · ') || 'nichts'), 'success'); $('ia-root').hidden = true;
    } catch (e) { say('Fehler: ' + (e && e.message), 'warn'); } finally { IA.busy = false; }
  }
  window.__afterImport = info => { if (!autoOn() || !info || !info.ids || !info.ids.length) return; setTimeout(() => iaOpen(info.ids), 300); };

  /* ------------------------------------------------------------------ Menü */
  function addMenu(tries) {
    const menu = $('file-menu'); if (!menu) { if (tries > 0) setTimeout(() => addMenu(tries - 1), 250); return; }
    const ref = $('btn-settings');
    [['btn-key-tempo', '🎼 Tonart &amp; Tempo', openKey], ['btn-slicer', '✂️ Beat-Slicer', openSlicer], ['btn-markers', '🚩 Strukturmarker', mkOpen], ['btn-import-assist', '🧭 Import-Assistent', () => iaOpen()]].forEach(([id, label, fn]) => {
      if ($(id)) return; const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = label;
      if (ref && ref.parentNode === menu) menu.insertBefore(b, ref); else menu.appendChild(b); b.addEventListener('click', () => fn());
    });
  }
  addMenu(40); stripRender();
  window.CreativeUI = { openKey, openSlicer, openMarkers: mkOpen, openAssistant: iaOpen, KT, BS, IA, stripRender, setProjectKey, _play: () => playing };
})();
