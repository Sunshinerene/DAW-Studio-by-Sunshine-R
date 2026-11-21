
/* Sunshine@R project library: named projects with audio buffers + DAW state */
(() => {
  const STORE = 'projects';
  const $ = id => document.getElementById(id);

  const requestStore = (mode, action) => SunIDB.tx('projects', STORE, mode, action);

  /* ---- Quellen-Merker: zu jedem aus einer Datei dekodierten Puffer die Original-Datei (Blob; liegt im Blob-Speicher des Browsers) ---- */
  const SRC = new WeakMap();
  function compactSource(ab) { if (ab && ab.__parked) return { blob: ab.blob, name: ab.name }; const s = SRC.get(ab); if (!s || !s.blob) return null; const raw = ab.length * ab.numberOfChannels * 4; return s.blob.size <= raw * 0.9 ? s : null; }
  const MIME = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4' };
  /* Datei dekodieren UND merken (statt decodeAudioData(buf.slice(0)) direkt) */
  async function decodeKeep(ab, name) {
    const ext = (String(name || '').split('.').pop() || '').toLowerCase();
    const blob = new Blob([ab], { type: MIME[ext] || 'application/octet-stream' });
    const decoded = await audioEngine.ctx.decodeAudioData(ab.slice(0));
    SRC.set(decoded, { blob, name: String(name || '') });
    return decoded;
  }
  /* Gespeicherte Projekte mit Original-Dateien: erst dekodieren (nacheinander 2 gleichzeitig, damit der Speicher klein bleibt) */
  const needsHydrate = p => !!p && !!p.buffers && Object.values(p.buffers).some(it => it && it.src && !it.audioBuffer);
  async function hydratePayload(payload) {
    const list = Object.entries(payload.buffers || {}).filter(([, it]) => it && it.src && !it.audioBuffer);
    if (!list.length) return { ok: 0, failed: [] };
    await audioEngine.ensureCtx();
    if (list.length >= 4) { try { toast('Audio wird geladen … (' + list.length + ' Dateien)', 'info'); } catch (_) {} }
    const failed = []; let next = 0, ok = 0;
    const worker = async () => {
      while (next < list.length) {
        const [id, it] = list[next++];
        try {
          const ab = await it.src.arrayBuffer();
          const decoded = await audioEngine.ctx.decodeAudioData(ab);
          SRC.set(decoded, { blob: it.src, name: it.name || '' });
          it.audioBuffer = decoded; ok++;
        } catch (e) { console.warn('Audio konnte nicht dekodiert werden:', id, e); failed.push(id); it.src = null; }
      }
    };
    await Promise.all([worker(), worker()]);
    if (failed.length) { try { toast(failed.length + ' Audiodatei(en) konnten nicht gelesen werden.', 'error'); } catch (_) {} }
    return { ok, failed };
  }
  function makePayload(opts) {
    if (typeof syncActiveMidiTrackFromState === 'function') syncActiveMidiTrackFromState();
    const state = {};
    Object.keys(dawState).forEach(key => {
      if (['buffers','isPlaying','playheadSec','isRecordingMic','micRecStartTime','recordingMicTrackId','pendingAudioTargetTrackId','lastDuckTime','lastDuckDb'].includes(key)) return;
      try { state[key] = JSON.parse(JSON.stringify(dawState[key])); } catch (_) {}
    });
    const buffers = {};
    if (opts && opts.noBuffers) return { state, buffers, savedAt: Date.now(), formatVersion: 1 };
    Object.entries(dawState.buffers || {}).forEach(([id, audioBuffer]) => {
      if (!audioBuffer || !audioBuffer.numberOfChannels) return;
      /* Importierte Dateien: die kleine Original-Datei speichern statt der entpackten Rohdaten (spart Speicher und Platz) */
      const sb = compactSource(audioBuffer);
      if (sb) { buffers[id] = { sampleRate: audioBuffer.sampleRate, length: audioBuffer.length, src: sb.blob, name: sb.name || '' }; return; }
      /* Sonst die Rohdaten – ohne zusätzliche Kopie (die Datenbank kopiert beim Schreiben selbst) */
      const channels = [];
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c));
      buffers[id] = { sampleRate: audioBuffer.sampleRate, length: audioBuffer.length, channels };
    });
    return { state, buffers, savedAt: Date.now(), formatVersion: 1 };
  }

  function restoreCore(payload) {
    if (!payload || !payload.state) throw new Error('Das Projekt enthält keine gültigen DAW-Daten.');
    const volatile = new Set(['buffers','isPlaying','playheadSec','isRecordingMic','micRecStartTime','recordingMicTrackId','pendingAudioTargetTrackId','lastDuckTime','lastDuckDb']);
    Object.entries(payload.state).forEach(([key, value]) => {
      if (!volatile.has(key) && key in dawState) dawState[key] = value;
    });
    dawState.isPlaying = false;
    dawState.playheadSec = 0;
    dawState.isRecordingMic = false;
    dawState.recordingMicTrackId = null;
    dawState.pendingAudioTargetTrackId = null;
    dawState.buffers = {};

    const ctx = audioEngine.ctx;
    if (ctx && typeof ctx.createBuffer === 'function') {
      Object.entries(payload.buffers || {}).forEach(([id, item]) => {
        try {
          if (item && item.audioBuffer) { dawState.buffers[id] = item.audioBuffer; return; }
          if (!item || !item.channels) return;
          const audioBuffer = ctx.createBuffer(item.channels.length, item.length, item.sampleRate);
          item.channels.forEach((channel, index) => audioBuffer.copyToChannel(new Float32Array(channel), index));
          dawState.buffers[id] = audioBuffer;
        } catch (e) { console.warn('Audio-Track konnte nicht wiederhergestellt werden:', id, e); }
      });
    }

    if (!Array.isArray(dawState.tracks)) dawState.tracks = [];
    dawState.tracks.forEach(track => {
      if (!track.sectionClips) track.sectionClips = { intro:true, verse:true, drop:true, break:true, outro:true };
      if (!Array.isArray(track.fx)) track.fx = [];
      if (track.type === 'midi') {
        if (!Array.isArray(track.midiNotes)) track.midiNotes = [];
        if (!Array.isArray(track.stepVelocities)) track.stepVelocities = new Array(32).fill(108);
      }
    });
    const active = dawState.tracks.find(t => t.id === dawState.activeMidiTrackId && t.type === 'midi');
    dawState.midiNotes = active ? JSON.parse(JSON.stringify(active.midiNotes || [])) : [];
    dawState.stepVelocities = active && active.stepVelocities ? [...active.stepVelocities] : new Array(32).fill(108);
    renumberTracks();

    if (audioEngine.channelNodes) {
      Object.values(audioEngine.channelNodes).forEach(n => { try { n.fader.disconnect(); } catch (_) {} });
      audioEngine.channelNodes = {};
    }
    dawState.tracks.forEach(track => { try { audioEngine.ensureTrackNode(track); } catch (e) { console.warn(e); } });
    try { audioEngine.syncAudioParams(); } catch (_) {}
    renderArrangementHeaderBar();
    renderMultiTrackLanes();
    renderDrumSequencerGrids();
    renderVerticalMixer();
    updateAudioToMidiDropdown();
    drawPianoRoll();
    drawVelocityLane();
    updateClockLCD();
    if (typeof updatePlayButtonUI === 'function') updatePlayButtonUI();
  }

  function modalBase(title, body, footer) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[var(--z-sheet)] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3';
    overlay.innerHTML = `<div class="w-full max-w-lg max-h-[88vh] overflow-hidden rounded-2xl border border-daw-border bg-daw-panel shadow-2xl flex flex-col text-slate-100">
      <div class="px-4 py-3 border-b border-daw-border flex items-center justify-between"><strong class="text-sm">${title}</strong><button type="button" data-close class="text-slate-400 hover:text-white text-xl">×</button></div>
      <div class="p-4 overflow-y-auto">${body}</div>
      <div class="px-4 py-3 border-t border-daw-border flex justify-end gap-2">${footer}</div></div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close]')) overlay.remove(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  async function saveNamedProject() {
    const body = `<label class="block text-xs text-slate-400 mb-2" for="project-name-input">Projektname</label>
      <input id="project-name-input" maxlength="48" placeholder="z. B. Mein neuer Trance-Track" class="w-full rounded-lg bg-daw-bg border border-daw-border px-3 py-2 text-sm text-white outline-none focus:border-cyan-400">
      <p class="text-[11px] text-slate-500 mt-2">Gespeichert werden Spuraufbau, MIDI-Noten, Sequencer, Mixer- und Effektwerte sowie geladene Audio-Stems.</p>`;
    const ov = modalBase('💾 Projekt speichern', body,
      `<button data-cancel class="px-3 py-2 rounded-lg bg-daw-surface border border-daw-border text-xs">Abbrechen</button><button id="project-save-confirm" class="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs">Speichern</button>`);
    ov.querySelector('[data-cancel]').onclick = () => ov.remove();
    const input = ov.querySelector('#project-name-input');
    input.value = $('status-subtitle')?.dataset.projectName || '';
    input.focus();
    ov.querySelector('#project-save-confirm').onclick = async () => {
      const name = input.value.trim();
      if (!name) { input.focus(); input.placeholder = 'Bitte einen Projektnamen eingeben'; return; }
      const button = ov.querySelector('#project-save-confirm');
      button.disabled = true; button.textContent = 'Speichert…';
      try {
        const all = await requestStore('readonly', store => store.getAll()) || [];
        const existing = all.find(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        const record = { id: existing?.id || (crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`), name, updatedAt: Date.now(), payload: makePayload() };
        await requestStore('readwrite', store => store.put(record));
        $('status-subtitle').textContent = `Projekt: ${name}`;
        $('status-subtitle').dataset.projectName = name;
        ov.remove();
        toast(`Projekt „${name}“ wurde gespeichert.`, 'success');
      } catch (e) {
        console.error(e); button.disabled = false; button.textContent = 'Erneut versuchen';
        toast(`Projekt konnte nicht gespeichert werden: ${e.message}`, 'error');
      }
    };
  }

  async function openProjectLibrary() {
    try {
      const projects = (await requestStore('readonly', store => store.getAll()) || []).sort((a,b) => b.updatedAt - a.updatedAt);
      const body = projects.length ? `<div class="flex flex-col gap-2" id="project-list">
        ${projects.map(p => `<div class="rounded-xl border border-daw-border bg-daw-bg p-3 flex items-center gap-2">
          <div class="min-w-0 flex-1"><div class="text-sm font-bold truncate">${escapeText(p.name)}</div><div class="text-[10px] text-slate-500">${new Date(p.updatedAt).toLocaleString('de-DE')}</div></div>
          <button data-open="${escapeText(p.id)}" class="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-bold">Öffnen</button>
          <button data-delete="${escapeText(p.id)}" class="px-2 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">✕</button>
        </div>`).join('')}</div>` : `<div class="rounded-xl border border-dashed border-daw-border p-6 text-center text-xs text-slate-400">Noch keine gespeicherten Projekte vorhanden.</div>`;
      const ov = modalBase('🗂️ Gespeicherte Projekte', body,
        `<span class="mr-auto self-center text-[10px] text-slate-500">${projects.length} Projekt(e)</span><button data-close class="px-3 py-2 rounded-lg bg-daw-surface border border-daw-border text-xs">Schließen</button>`);
      ov.querySelectorAll('[data-open]').forEach(btn => btn.onclick = async () => {
        const record = projects.find(p => p.id === btn.dataset.open);
        if (!record) return;
        if (!confirm(`Aktuelles Projekt durch „${record.name}“ ersetzen? Nicht gespeicherte Änderungen gehen verloren.`)) return;
        try {
          await audioEngine.ensureCtx();
          if (dawState.isPlaying) audioEngine.stop(true);
          await restorePayload(record.payload);
          $('status-subtitle').textContent = `Projekt: ${record.name}`;
          $('status-subtitle').dataset.projectName = record.name;
          ov.remove();
          toast(`Projekt „${record.name}“ wurde geöffnet.`, 'success');
        } catch (e) { console.error(e); toast(`Projekt konnte nicht geöffnet werden: ${e.message}`, 'error'); }
      });
      ov.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = async () => {
        const record = projects.find(p => p.id === btn.dataset.delete);
        if (!record || !confirm(`Projekt „${record.name}“ wirklich löschen?`)) return;
        await requestStore('readwrite', store => store.delete(record.id));
        ov.remove(); openProjectLibrary();
        toast(`Projekt „${record.name}“ gelöscht.`, 'success');
      });
    } catch (e) {
      console.error(e); toast(`Projektliste konnte nicht geladen werden: ${e.message}`, 'error');
    }
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  /* Öffentlich: bei Projekten mit Original-Dateien ein Promise (erst dekodieren), sonst wie bisher sofort */
  function restorePayload(payload) {
    if (needsHydrate(payload)) return hydratePayload(payload).then(() => restoreCore(payload));
    return restoreCore(payload);
  }
  window.__projectIO = { makePayload, restorePayload, hydratePayload, decodeKeep, srcOf: ab => SRC.get(ab) || null, compactOf: compactSource };
  window.addEventListener('DOMContentLoaded', () => {
    $('btn-save-project')?.addEventListener('click', () => (window.Home && window.Home.save) ? window.Home.save() : saveNamedProject());
    $('btn-open-projects')?.addEventListener('click', () => (window.Home && window.Home.open) ? window.Home.open() : openProjectLibrary());
  });
})();
