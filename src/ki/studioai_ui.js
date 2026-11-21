/* ===== Sunshine@R: KI-Assistent (lokale DSP-/Lernverfahren) + Sprachsteuerung (Test) ===== */
(function () {
  'use strict';
  if (!window.StudioAI || !StudioAI.dsp) return;
  const D = StudioAI.dsp;
  const $ = id => document.getElementById(id);
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (_) { console.log(m); } };
  const { esc, clamp, safe } = window.SunUtil;
  const push = () => { try { window.__dawPushUndo && window.__dawPushUndo(); } catch (_) {} };
  const refresh = () => { safe(() => audioEngine.syncAudioParams()); safe(renderVerticalMixer); safe(renderMultiTrackLanes); };
  const audioTracks = () => dawState.tracks.filter(t => t.type !== 'midi' && dawState.buffers[t.id]);
  const pct = v => Math.round(v * 100) + ' %';
  const panTxt = p => !p ? 'Mitte' : (p < 0 ? 'L ' : 'R ') + Math.round(Math.abs(p) * 100) + ' %';
  const nextFrame = () => new Promise(r => setTimeout(r, 30));

  /* ------------------------------------------------------------------ Assistent-Dialog */
  const S = { tempo: null, mix: null, patOrigin: null, busy: false };

  function srcOptions() {
    const at = audioTracks();
    return '<option value="all">Alle Audio-Spuren (Summe)</option>' + at.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  }
  function trackOptions() {
    const at = audioTracks();
    if (!at.length) return '<option value="">– keine Audio-Spur geladen –</option>';
    const pre = at.find(t => t.vocalCleanup || /vocal|vox|voice|gesang/i.test(t.name) || t.type === 'mic') || at[0];
    return at.map(t => `<option value="${esc(t.id)}" ${t.id === pre.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  }
  const BTN = 'py-2.5 px-3 rounded-xl border text-xs font-bold ';
  const B_MAIN = BTN + 'border-amber-400/70 bg-amber-400/15 text-amber-100';
  const B_SEC = BTN + 'border-slate-700 bg-slate-900 text-slate-200';
  const SUM = 'cursor-pointer list-none flex items-center gap-2 px-3 py-3 text-sm font-bold select-none';

  function openAssistant(section) {
    $('assistant-modal')?.remove();
    S.tempo = null; S.mix = null; S.patOrigin = null;
    const ov = document.createElement('div');
    ov.id = 'assistant-modal';
    ov.className = 'fixed inset-0 z-[var(--z-dialog-3)] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-5';
    const sec = (id, ico, title, sub, body) => `<details id="as-sec-${id}" class="rounded-2xl border border-slate-800 bg-slate-900/60 mb-2.5" ${section === id ? 'open' : ''}>
        <summary class="${SUM}"><span class="text-lg">${ico}</span><span class="min-w-0"><span class="block">${title}</span><span class="block text-[11px] font-normal text-slate-400">${sub}</span></span><span class="ml-auto text-slate-500 text-xs">▾</span></summary>
        <div class="px-3 pb-3 space-y-2.5">${body}</div></details>`;
    const notes = dawState.midiNotes.length;
    ov.innerHTML = `<div class="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-purple-500/40 bg-slate-950 p-4 shadow-2xl text-slate-100" role="dialog" aria-label="KI-Assistent">
      <div class="flex items-center gap-3 mb-1"><div class="text-base font-black">✨ KI-Assistent</div><button type="button" data-close class="ml-auto px-3 py-2 rounded-lg bg-slate-800 text-slate-300" aria-label="Schließen">✕</button></div>
      <div class="text-[11px] text-slate-400 mb-3">Alles läuft lokal auf deinem Gerät – kein Upload, kein Konto. Jede Änderung lässt sich mit „↩ Zurück“ rückgängig machen.</div>
      ${sec('tempo', '🥁', 'Tempo &amp; Taktraster erkennen', 'BPM, Zählzeit 1 und Takt-Anfang aus dem Audio', `
        <label class="block text-[11px] text-slate-400">Analysieren aus<select id="as-src" class="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm">${srcOptions()}</select></label>
        <button type="button" data-as="tempo" class="w-full ${B_MAIN}">Tempo analysieren</button>
        <div id="as-tempo-res" class="text-xs text-slate-300"></div>`)}
      ${sec('mix', '🎚️', 'Auto-Mix', 'Pegel, Stereo-Breite und Tiefen-Filter vorschlagen', `
        <div class="text-[11px] text-slate-400">Analysiert Lautheit, Klangfarbe und Stereo-Bild jeder Audio-Spur und schlägt Lautstärke, Pan und Low-Cut vor. Du siehst erst die Liste und bestätigst.</div>
        <button type="button" data-as="mix" class="w-full ${B_MAIN}">Spuren analysieren</button>
        <div id="as-mix-res" class="text-xs text-slate-300"></div>`)}
      ${sec('denoise', '🧹', 'Vocal-Cleanup · Rauschfilter', 'Rauschen, Brummen und Zischen aus einer Spur dämpfen', `
        <label class="block text-[11px] text-slate-400">Spur<select id="as-dn-track" class="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm">${trackOptions()}</select></label>
        <label class="block"><div class="flex justify-between text-[11px] text-slate-400"><span>Stärke</span><span id="as-dn-v" class="font-mono">60 %</span></div><input id="as-dn-str" type="range" min="20" max="100" value="60" class="w-full daw-slider"></label>
        <button type="button" data-as="denoise" class="w-full ${B_MAIN}">Rauschen entfernen</button>
        <div id="as-dn-res" class="text-xs text-slate-300"></div>
        <div class="text-[10px] leading-snug text-slate-500">Spektrales Entrauschen (Signalverarbeitung): lernt das Rauschen aus den leisesten Stellen der Spur. Das ist keine Stimmen-KI wie RNNoise – bei zu hoher Stärke klingt Gesang „unter Wasser“. Ohne Pausen in der Spur wirkt es schwächer.</div>`)}
      ${sec('pattern', '🧬', 'Pattern-Variation', 'Lernt aus deinen MIDI-Noten und erzeugt Varianten im selben Stil', `
        <div id="as-pat-info" class="text-[11px] text-slate-400">Aktive MIDI-Spur: <b class="text-slate-200">${notes}</b> Noten ${notes < 6 ? '– mindestens 6 nötig.' : ''}</div>
        <label class="block"><div class="flex justify-between text-[11px] text-slate-400"><span>Abweichung vom Original</span><span id="as-pat-v" class="font-mono">40 %</span></div><input id="as-pat-var" type="range" min="0" max="100" value="40" class="w-full daw-slider"></label>
        <div class="grid grid-cols-2 gap-2"><button type="button" data-as="pattern" class="${B_MAIN}">Variation erzeugen</button><button type="button" data-as="pattern-orig" class="${B_SEC}">Original zurück</button></div>
        <div class="text-[10px] leading-snug text-slate-500">Lokales Lernmodell (Wahrscheinlichkeiten für Rhythmus-Positionen, Notenlängen und Tonschritte aus deinen Noten) – kein neuronales Netz. Jeder Klick würfelt eine neue Variante aus dem Original.</div>`)}
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => {
      const t = e.target;
      if (t === ov || t.closest('[data-close]')) { ov.remove(); return; }
      const b = t.closest('button[data-as]'); if (b) { run(b.dataset.as, b); return; }
      const alt = t.closest('button[data-as-alt]'); if (alt && S.tempo) { setBpmChoice(+alt.dataset.asAlt); return; }
      const ap = t.closest('button[data-as-apply]'); if (ap) { apply(ap.dataset.asApply); return; }
    });
    ov.addEventListener('input', e => {
      if (e.target.id === 'as-dn-str') $('as-dn-v').textContent = e.target.value + ' %';
      if (e.target.id === 'as-pat-var') $('as-pat-v').textContent = e.target.value + ' %';
    });
    if (section) setTimeout(() => { const d = $('as-sec-' + section); d && d.scrollIntoView({ block: 'nearest' }); }, 30);
  }

  async function run(what, btn) {
    if (S.busy) return; S.busy = true; const old = btn.textContent; btn.disabled = true;
    try {
      if (what === 'tempo') await runTempo(btn);
      else if (what === 'mix') await runMix();
      else if (what === 'denoise') await runDenoise(btn);
      else if (what === 'pattern') runPattern(false);
      else if (what === 'pattern-orig') runPattern(true);
    } catch (e) { console.error(e); say('KI-Assistent: ' + e.message, 'error'); }
    finally { S.busy = false; btn.disabled = false; if (btn.isConnected) btn.textContent = old; }
  }

  /* ---------- Tempo ---------- */
  async function runTempo(btn) {
    const sel = $('as-src').value, at = audioTracks();
    const list = sel === 'all' ? at : at.filter(t => String(t.id) === sel);
    const res = $('as-tempo-res');
    if (!list.length) { res.innerHTML = '<span class="text-amber-300">Noch keine Audio-Spur geladen – zuerst Stems importieren.</span>'; return; }
    btn.textContent = 'Analysiere …'; await nextFrame();
    const first = D.toMono(dawState.buffers[list[0].id], 90, 0); let x = first.x; const sr = first.sr;
    for (let i = 1; i < list.length; i++) {
      const b = dawState.buffers[list[i].id]; if (b.sampleRate !== sr) continue;
      const m = D.toMono(b, 90, 0).x, n = Math.min(x.length, m.length); const y = new Float32Array(n);
      for (let k = 0; k < n; k++) y[k] = x[k] + m[k]; x = y;
    }
    const r = D.detectTempo(x, sr, {});
    if (r.error) { res.innerHTML = `<span class="text-amber-300">${esc(r.error)}</span>`; S.tempo = null; return; }
    S.tempo = r; renderTempo();
  }
  function renderTempo(choice) {
    const r = S.tempo, res = $('as-tempo-res'); if (!r || !res) return;
    const bpm = choice || r.bpmApp, conf = Math.round((r.confidence || 0) * 100), dconf = Math.round((r.downbeatConfidence || 0) * 100);
    const alts = (r.candidates || []).slice(0, 4).map(c => Math.round(c.bpm || c)).filter((v, i, a) => a.indexOf(v) === i && v >= 60 && v <= 180 && v !== Math.round(bpm));
    const bar = r.firstBarSec != null ? r.firstBarSec : r.firstBeatSec || 0;
    S.pickBpm = Math.round(bpm);
    res.innerHTML = `<div class="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
      <div class="flex items-end gap-3"><div><div class="text-[10px] uppercase text-slate-500">Tempo</div><div class="text-2xl font-black text-amber-300 leading-none">${Math.round(bpm)} <span class="text-xs font-bold text-slate-400">BPM</span></div></div>
        <div class="text-[11px] text-slate-400 leading-tight">Sicherheit: <b class="text-slate-200">${conf} %</b><br>Takt-Anfang: <b class="text-slate-200">${bar.toFixed(2)} s</b> <span class="text-slate-500">(${dconf} % sicher)</span></div></div>
      ${r.bpm && Math.abs(r.bpm - bpm) > 1 ? `<div class="text-[10px] text-slate-500">Rohwert ${r.bpm.toFixed(1)} BPM – für die App-Skala (60–180) auf ${Math.round(bpm)} umgerechnet.</div>` : ''}
      ${alts.length ? `<div class="text-[11px] text-slate-400">Andere Möglichkeiten: ${alts.map(a => `<button type="button" data-as-alt="${a}" class="ml-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-mono">${a}</button>`).join('')}</div>` : ''}
      <div class="grid grid-cols-1 gap-2"><button type="button" data-as-apply="bpm" class="${B_SEC}">BPM auf ${Math.round(bpm)} setzen</button>
      <button type="button" data-as-apply="bar" class="${B_SEC}">Takt 1 auf ${bar.toFixed(2)} s legen <span class="font-normal text-slate-400">(Vorspann wird abgeschnitten)</span></button>
      <button type="button" data-as-apply="both" class="${B_MAIN}">Beides übernehmen</button></div></div>`;
  }
  function setBpmChoice(v) { renderTempo(v); }
  function setBpm(v) {
    v = clamp(Math.round(v), 60, 180);
    const inp = $('input-bpm'); if (!inp) return false;
    inp.value = v; inp.dispatchEvent(new Event('change', { bubbles: true })); return v;
  }
  function setBar(sec) {
    dawState.startOffsetMs = Math.max(0, Math.round(sec * 1000));
    const l = $('lbl-trim-offset'); if (l) l.textContent = dawState.startOffsetMs + ' ms';
    safe(renderMultiTrackLanes); if (dawState.isPlaying) safe(() => audioEngine.seek(dawState.playheadSec));
  }
  function apply(what) {
    if (what === 'bpm' || what === 'bar' || what === 'both') {
      const r = S.tempo; if (!r) return; push();
      const bar = r.firstBarSec != null ? r.firstBarSec : r.firstBeatSec || 0; const msg = [];
      if (what !== 'bar') { const v = setBpm(S.pickBpm || r.bpmApp); msg.push(v + ' BPM'); }
      if (what !== 'bpm') { setBar(bar); msg.push('Takt 1 bei ' + dawState.startOffsetMs + ' ms'); }
      say('Übernommen: ' + msg.join(' · '), 'success');
    } else if (what === 'mix') applyMix();
  }

  /* ---------- Auto-Mix ---------- */
  async function runMix() {
    const res = $('as-mix-res');
    if (!audioTracks().length) { res.innerHTML = '<span class="text-amber-300">Noch keine Audio-Spur geladen – zuerst Stems importieren.</span>'; return; }
    res.textContent = 'Analysiere …'; await nextFrame();
    const items = dawState.tracks.map(t => ({ id: t.id, name: t.name, type: t.type, vol: t.vol, pan: t.pan || 0, lowCut: !!t.lowCut, buf: (t.type !== 'midi' && dawState.buffers[t.id]) || null }));
    const r = D.suggestMix(items, {}); S.mix = r;
    if (r.empty) { res.innerHTML = '<span class="text-amber-300">Alle Spuren sind (nahezu) stumm – nichts zu mischen.</span>'; return; }
    const rows = r.rows.map(x => {
      if (x.skipped) return `<tr class="border-t border-slate-800 text-slate-500"><td class="py-2 pr-2" colspan="3"><span class="font-semibold">${esc(x.name)}</span> · ${esc(x.reason)}</td></tr>`;
      if (x.silent) return `<tr class="border-t border-slate-800 text-slate-500"><td class="py-2 pr-2" colspan="3"><span class="font-semibold">${esc(x.name)}</span> · stumm – unverändert</td></tr>`;
      return `<tr class="border-t border-slate-800 align-top"><td class="py-2 pr-2"><div class="font-semibold text-slate-100">${esc(x.name)} <span class="text-[10px] font-normal text-slate-500">· ${esc(x.roleName)}</span></div><div class="text-[10px] leading-snug text-slate-400">${x.reasons.map(esc).join(' · ')}</div></td>
        <td class="py-2 pr-2 font-mono whitespace-nowrap">${pct(x.curVol)}<br>→ <b class="text-amber-300">${pct(x.newVol)}</b></td>
        <td class="py-2 whitespace-nowrap">${panTxt(x.curPan)}${(x.newPan || 0) !== (x.curPan || 0) ? '<br>→ <b class="text-amber-300">' + panTxt(x.newPan) + '</b>' : ''}${x.newLowCut && !x.curLowCut ? '<div class="text-[10px] text-amber-300">+ Low-Cut</div>' : ''}</td></tr>`;
    }).join('');
    res.innerHTML = `<div class="rounded-xl border border-slate-800 bg-slate-900 p-2.5 space-y-2"><table class="w-full text-[11px]"><thead><tr class="text-[10px] uppercase text-slate-500 text-left"><th class="pr-2">Spur &amp; Begründung</th><th class="pr-2">Lautst.</th><th>Pan</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="text-[10px] text-slate-500">Bezug: ${esc(D.ROLE_NAME[r.anchor] || r.anchor)} · geschätzte Summenspitze ${(r.mixPeakBefore * 100).toFixed(0)} % → ${(r.mixPeakAfter * 100).toFixed(0)} %</div>
      <button type="button" data-as-apply="mix" class="w-full ${B_MAIN}">Vorschlag übernehmen</button></div>`;
  }
  function applyMix() {
    const r = S.mix; if (!r) return; push(); let n = 0;
    r.rows.forEach(x => {
      if (x.skipped || x.silent || x.newVol == null) return;
      const t = dawState.tracks.find(t => t.id === x.id); if (!t) return;
      t.vol = x.newVol; t.pan = x.newPan; t.lowCut = !!x.newLowCut; n++;
    });
    refresh(); say(`Auto-Mix auf ${n} Spuren angewendet – mit „↩ Zurück“ umkehrbar.`, 'success');
  }

  /* ---------- Rauschfilter ---------- */
  async function runDenoise(btn) {
    const id = $('as-dn-track').value, res = $('as-dn-res');
    const t = dawState.tracks.find(t => String(t.id) === id), buf = t && dawState.buffers[t.id];
    if (!buf) { res.innerHTML = '<span class="text-amber-300">Keine Audio-Spur gewählt.</span>'; return; }
    const strength = (+$('as-dn-str').value) / 100; await audioEngine.ensureCtx(); const ctx = audioEngine.ctx;
    if (buf.duration > 600) { res.innerHTML = '<span class="text-amber-300">Spur ist länger als 10 Minuten – bitte vorher kürzen.</span>'; return; }
    const t0 = performance.now(); btn.textContent = 'Filtere … 0 %'; await nextFrame();
    const out = await D.denoiseBuffer(ctx, buf, { strength }, f => { btn.textContent = `Filtere … ${Math.round(f * 100)} %`; });
    push(); dawState.buffers[t.id] = out;
    refresh();
    const sec = ((performance.now() - t0) / 1000).toFixed(1);
    res.innerHTML = `<span class="text-emerald-300">✓ „${esc(t.name)}“ gefiltert (${sec} s). Zum Vergleich: „↩ Zurück“ und wieder „↪ Vor“.</span>`;
    say('Rauschfilter angewendet.', 'success');
  }

  /* ---------- Pattern-Variation ---------- */
  function runPattern(restore) {
    const info = $('as-pat-info');
    if (restore) {
      if (!S.patOrigin) { say('Noch keine Variation erzeugt.', 'info'); return; }
      push(); setNotes(S.patOrigin.map(n => Object.assign({}, n))); say('Original wiederhergestellt.', 'success'); return;
    }
    if (!S.patOrigin) {
      if (dawState.midiNotes.length < 6) { say('Für ein Lernmodell braucht es mindestens 6 Noten in der aktiven MIDI-Spur.', 'warn'); return; }
      S.patOrigin = dawState.midiNotes.map(n => Object.assign({}, n));
    }
    const model = D.learnPattern(S.patOrigin); if (!model) { say('Zu wenige Noten für das Lernmodell.', 'warn'); return; }
    const classes = new Set(S.patOrigin.map(n => n.pitch % 12));
    const snap = p => { for (let d = 0; d < 6; d++) { if (classes.has(((p + d) % 12 + 12) % 12)) return p + d; if (classes.has(((p - d) % 12 + 12) % 12)) return p - d; } return p; };
    const v = (+$('as-pat-var').value) / 100, seed = 1 + Math.floor(Math.random() * 99999);
    const out = D.generateVariation(model, S.patOrigin, { variation: v, seed, snap });
    if (!out.length) { say('Variation war leer – nochmal versuchen.', 'warn'); return; }
    push(); setNotes(out.map(n => ({ id: Date.now() + Math.random(), pitch: n.pitch, start: n.start, dur: n.dur, vel: n.vel })));
    say(`Variation (${Math.round(v * 100)} % Abweichung, ${out.length} Noten) – „↩ Zurück“ stellt den vorherigen Stand her.`, 'success');
    if (info) info.innerHTML = `Aktive MIDI-Spur: <b class="text-slate-200">${out.length}</b> Noten (Original: ${S.patOrigin.length})`;
  }
  function setNotes(arr) {
    arr.forEach(n => { if (!n.id) n.id = Date.now() + Math.random(); });
    dawState.midiNotes = arr;
    arr.forEach(n => { dawState.stepVelocities[n.start] = Math.max(dawState.stepVelocities[n.start] || 0, n.vel); });
    safe(syncActiveMidiTrackFromState); safe(drawPianoRoll); safe(drawVelocityLane); safe(renderMultiTrackLanes);
  }

  /* ------------------------------------------------------------------ Menü-/Button-Einbau */
  function injectEntryPoints() {
    const menu = $('file-menu');
    if (menu && !$('btn-assistant')) {
      const b = document.createElement('button');
      b.id = 'btn-assistant'; b.type = 'button'; b.className = 'fm-item'; b.setAttribute('role', 'menuitem');
      b.innerHTML = '<span>✨</span><span>KI-Assistent</span>';
      b.addEventListener('click', () => openAssistant('tempo'));
      const anchor = $('btn-settings');
      if (anchor && anchor.parentNode === menu) menu.insertBefore(b, anchor); else menu.appendChild(b);
    }
    const ps = $('btn-pattern-studio');
    if (ps && !$('btn-pattern-variation')) {
      const b = document.createElement('button');
      b.id = 'btn-pattern-variation'; b.type = 'button'; b.title = 'Variation aus deinen eigenen Noten lernen';
      b.className = ps.className; b.innerHTML = '🧬 Variation';
      b.addEventListener('click', () => openAssistant('pattern'));
      ps.after(b);
    }
  }

  /* ------------------------------------------------------------------ Sprachsteuerung (Test) */
  const LS_UI = 'sunshine.ui';
  const voiceOn = () => { try { return !!JSON.parse(localStorage.getItem(LS_UI) || '{}').voice; } catch (_) { return false; } };
  const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
  const V = { log: [], rec: null, listening: false };

  function clickIf(id) { const b = $(id); if (b) { b.click(); return true; } return false; }
  function trackBy(n) { return dawState.tracks[n - 1] || null; }
  function execute(c) {
    switch (c.cmd) {
      case 'play': if (!dawState.isPlaying) clickIf('btn-play'); return 'Wiedergabe';
      case 'stop': if (dawState.isPlaying) clickIf('btn-stop'); else clickIf('btn-stop'); return 'Stopp';
      case 'undo': window.__dawUndo && window.__dawUndo(); return 'Zurück';
      case 'redo': window.__dawRedo && window.__dawRedo(); return 'Vor';
      case 'bpm': { if (c.value < 60 || c.value > 180) return { err: `Tempo ${c.value} liegt außerhalb 60–180.` }; push(); setBpm(c.value); return 'Tempo ' + c.value; }
      case 'mute': case 'solo': {
        const t = trackBy(c.track); if (!t) return { err: `Spur ${c.track} gibt es nicht.` };
        const key = c.cmd, want = c.on; if (!!t[key] !== want) { const b = document.querySelector(`[data-${key}="${CSS.escape(String(t.id))}"]`); if (b) b.click(); else { t[key] = want; refresh(); } }
        return `Spur ${c.track} ${key === 'mute' ? (want ? 'stumm' : 'hörbar') : (want ? 'solo' : 'solo aus')}`;
      }
      case 'vol': {
        const t = trackBy(c.track); if (!t) return { err: `Spur ${c.track} gibt es nicht.` };
        push(); t.vol = clamp(t.vol * Math.pow(10, c.db / 20), 0.02, 1.25); refresh(); return `Spur ${c.track} ${c.db > 0 ? 'lauter' : 'leiser'}`;
      }
      case 'master': {
        const s = $('sl-master-vol'); if (!s) return { err: 'Master-Regler nicht gefunden.' };
        const min = +s.min || 0, max = +s.max || 1, step = (max - min) * 0.08 * (c.db > 0 ? 1 : -1);
        s.value = clamp(+s.value + step, min, max); s.dispatchEvent(new Event('input', { bubbles: true })); return c.db > 0 ? 'Master lauter' : 'Master leiser';
      }
      case 'loop': if (!!dawState.isLooping !== c.on) clickIf('btn-loop'); return 'Loop ' + (c.on ? 'an' : 'aus');
      case 'metronome': if (!!dawState.metronomeOn !== c.on) clickIf('btn-metronome'); return 'Metronom ' + (c.on ? 'an' : 'aus');
      case 'tab': { const b = document.querySelector(`.dock-tab-btn[data-tab="${c.tab}"]`); if (b) b.click(); return 'Bereich ' + c.tab; }
      case 'save': clickIf('btn-save-project'); return 'Projekt speichern';
      case 'newtrack': clickIf('btn-add-track'); return 'Neue Spur';
      case 'exportwav': clickIf('btn-export-wav'); return 'WAV-Export';
      case 'open': openAssistant(c.what === 'tempo' ? 'tempo' : c.what); return 'KI-Assistent: ' + c.what;
      case 'blocked': return { err: 'Löschen und Zurücksetzen sind per Sprache aus Sicherheitsgründen gesperrt.' };
      case 'unknown': return { err: `Nicht verstanden: „${c.text}“` };
      default: return { err: 'Kein Befehl erkannt.' };
    }
  }
  function exec(c) { let r; try { r = execute(c); } catch (e) { r = { err: 'Fehler: ' + e.message }; } const ok = !(r && r.err); return { ok, msg: ok ? r : r.err }; }
  function handle(text) {
    const c = D.parseCommand(text);
    if (c.cmd === 'unknown' && window.SunshineAI && typeof SunshineAI.ask === 'function' && SunshineAI.available && SunshineAI.available()) {
      V.log.unshift({ text, ok: true, msg: 'an den Assistenten übergeben' }); V.log.length = Math.min(V.log.length, 6); renderVoice();
      SunshineAI.ask(text); return { ok: true, msg: 'an den Assistenten übergeben', cmd: c };
    }
    let r; try { r = execute(c); } catch (e) { r = { err: 'Fehler: ' + e.message }; }
    const ok = !(r && r.err), msg = ok ? r : r.err;
    V.log.unshift({ text, ok, msg }); V.log.length = Math.min(V.log.length, 6); renderVoice();
    say((ok ? '🎤 ' : '🎤 ✗ ') + msg, ok ? 'success' : 'warn');
    return { ok, msg, cmd: c };
  }

  function renderVoice() {
    const p = $('voice-panel'); if (!p) return;
    p.querySelector('#vp-log').innerHTML = V.log.length ? V.log.map(l => `<div class="${l.ok ? 'text-emerald-300' : 'text-amber-300'}">${l.ok ? '✓' : '✗'} <span class="text-slate-400">„${esc(l.text)}“</span> → ${esc(l.msg)}</div>`).join('') : '<div class="text-slate-500">Noch keine Befehle.</div>';
    const mic = p.querySelector('#vp-mic'); mic.textContent = V.listening ? '● Ich höre zu …' : '🎤 Sprechen';
    mic.classList.toggle('animate-pulse', V.listening);
  }
  function startListening(cb) {
    V.cb = typeof cb === 'function' ? cb : null;
    if (!SRC) { say('Spracherkennung ist in diesem Browser/WebView nicht verfügbar – Befehl bitte tippen oder das 🎤 der Tastatur nutzen.', 'warn'); return; }
    if (V.listening) { try { V.rec.stop(); } catch (_) {} return; }
    const rec = new SRC(); rec.lang = 'de-DE'; rec.interimResults = false; rec.maxAlternatives = 3; V.rec = rec;
    rec.onstart = () => { V.listening = true; renderVoice(); };
    rec.onend = () => { V.listening = false; renderVoice(); };
    rec.onerror = e => { V.listening = false; renderVoice(); say('Spracherkennung: ' + (e.error === 'not-allowed' ? 'Mikrofon-Zugriff verweigert.' : e.error === 'network' ? 'braucht Internet.' : e.error), 'warn'); };
    rec.onresult = e => { const alts = Array.from(e.results[0] || []).map(a => a.transcript); let best = alts[0] || ''; for (const a of alts) { if (D.parseCommand(a).cmd !== 'unknown') { best = a; break; } } if (best) (V.cb || handle)(best); };
    try { rec.start(); } catch (e) { say('Mikrofon konnte nicht gestartet werden: ' + e.message, 'warn'); }
  }
  function buildVoice() {
    if ($('voice-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'voice-fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Sprachsteuerung (Test)'); fab.title = 'Sprachsteuerung (Test)';
    fab.textContent = '🎤'; fab.hidden = true;
    fab.style.cssText = 'position:fixed;right:14px;bottom:calc(88px + env(safe-area-inset-bottom,0px));width:52px;height:52px;border-radius:calc(26px * var(--rk,1));z-index:var(--z-fab);font-size:22px;background:rgba(15,23,42,.92);border:1px solid rgba(251,191,36,.6);box-shadow:0 6px 22px rgba(0,0,0,.5)';
    document.body.appendChild(fab);
    const p = document.createElement('div');
    p.id = 'voice-panel'; p.hidden = true;
    p.style.cssText = 'position:fixed;left:10px;right:10px;bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:var(--z-fab-panel);max-width:440px;margin-left:auto;padding:12px;border-radius:calc(18px * var(--rk,1));background:rgba(2,6,23,.96);border:1px solid rgba(168,85,247,.45);color:#e2e8f0;box-shadow:0 10px 40px rgba(0,0,0,.6)';
    p.innerHTML = `<div class="flex items-center gap-2 mb-2"><div class="text-sm font-black">🎤 Sprachsteuerung <span class="text-[10px] font-bold text-amber-300 border border-amber-400/50 rounded px-1 ml-1">TEST</span></div><button type="button" id="vp-close" class="ml-auto px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300" aria-label="Schließen">✕</button></div>
      <div class="flex gap-2"><input id="vp-in" type="text" autocomplete="off" placeholder="z. B. „Tempo 120“ oder „Spur 2 stumm“" class="flex-1 min-w-0 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm"><button type="button" id="vp-go" class="px-3 rounded-xl border border-amber-400/70 bg-amber-400/15 text-amber-100 text-sm font-bold">OK</button></div>
      <button type="button" id="vp-mic" class="mt-2 w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold ${SRC ? '' : 'opacity-50'}">🎤 Sprechen</button>
      <div id="vp-log" class="mt-2 text-[11px] space-y-0.5 max-h-24 overflow-y-auto"></div>
      <div class="mt-2 text-[10px] leading-snug text-slate-500">Beispiele: Play · Stopp · Zurück · Vor · Tempo 128 · Spur 2 stumm · Spur 3 solo · Spur 1 lauter · Loop aus · Metronom an · Mixer zeigen · Tempo erkennen · Auto-Mix · speichern.<br>${SRC ? 'Spracherkennung nutzt je nach Gerät einen Online-Dienst.' : 'Hier gibt es keine eingebaute Spracherkennung – nutze das Tipp-Feld mit dem 🎤 deiner Android-Tastatur.'} Löschen/Reset sind gesperrt.</div>`;
    document.body.appendChild(p);
    fab.addEventListener('click', () => { p.hidden = !p.hidden; if (!p.hidden) { renderVoice(); setTimeout(() => $('vp-in').focus(), 50); } });
    p.querySelector('#vp-close').addEventListener('click', () => { p.hidden = true; });
    const go = () => { const i = $('vp-in'); const v = i.value.trim(); if (!v) return; handle(v); i.value = ''; };
    p.querySelector('#vp-go').addEventListener('click', go);
    p.querySelector('#vp-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    p.querySelector('#vp-mic').addEventListener('click', startListening);
  }
  function syncVoice() {
    const on = voiceOn();
    if (on) buildVoice();
    const fab = $('voice-fab'), p = $('voice-panel');
    if (fab) fab.hidden = !on;
    if (p && !on) { p.hidden = true; try { V.rec && V.rec.stop(); } catch (_) {} }
  }

  /* ------------------------------------------------------------------ Start */
  window.SunshineAI = Object.assign(window.SunshineAI || {}, { open: openAssistant, state: S, exec, listen: startListening, voiceOn, speechSupported: !!SRC });
  window.SunshineVoice = { handle, supported: !!SRC, get enabled() { return voiceOn(); }, parse: D.parseCommand };
  document.addEventListener('sunshine-ui', syncVoice);
  window.addEventListener('storage', e => { if (e.key === LS_UI) syncVoice(); });
  const boot = () => { injectEntryPoints(); syncVoice(); };
  if (document.readyState === 'complete') setTimeout(boot, 0); else window.addEventListener('load', () => setTimeout(boot, 0));
  /* Menü kann später gebaut werden → kurz nachprüfen */
  let tries = 0; const iv = SunTick.every(500, () => { injectEntryPoints(); if ((($('btn-assistant') && $('btn-pattern-variation')) || ++tries > 20)) SunTick.stop(iv); }, { hidden: true });
})();
