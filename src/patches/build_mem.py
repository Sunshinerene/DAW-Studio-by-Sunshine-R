# ---------- Version 1.15: Speicher – Projekte kompakt (Original-Dateien) und Speichern ohne Verdopplung ----------
h=once(h,"""    Object.entries(dawState.buffers || {}).forEach(([id, audioBuffer]) => {
      if (!audioBuffer || !audioBuffer.numberOfChannels) return;
      const channels = [];
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c).slice());
      buffers[id] = { sampleRate: audioBuffer.sampleRate, length: audioBuffer.length, channels };
    });""","""    Object.entries(dawState.buffers || {}).forEach(([id, audioBuffer]) => {
      if (!audioBuffer || !audioBuffer.numberOfChannels) return;
      /* Importierte Dateien: die kleine Original-Datei speichern statt der entpackten Rohdaten (spart Speicher und Platz) */
      const sb = compactSource(audioBuffer);
      if (sb) { buffers[id] = { sampleRate: audioBuffer.sampleRate, length: audioBuffer.length, src: sb.blob, name: sb.name || '' }; return; }
      /* Sonst die Rohdaten – ohne zusätzliche Kopie (die Datenbank kopiert beim Schreiben selbst) */
      const channels = [];
      for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c));
      buffers[id] = { sampleRate: audioBuffer.sampleRate, length: audioBuffer.length, channels };
    });""","mem-payload")
h=once(h,"""  function makePayload(opts) {""","""  /* ---- Quellen-Merker: zu jedem aus einer Datei dekodierten Puffer die Original-Datei (Blob; liegt im Blob-Speicher des Browsers) ---- */
  const SRC = new WeakMap();
  function compactSource(ab) { const s = SRC.get(ab); if (!s || !s.blob) return null; const raw = ab.length * ab.numberOfChannels * 4; return s.blob.size <= raw * 0.9 ? s : null; }
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
  function makePayload(opts) {""","mem-fn")
h=once(h,"  function restorePayload(payload) {\n    if (!payload || !payload.state) throw","  function restoreCore(payload) {\n    if (!payload || !payload.state) throw","mem-core")
h=once(h,"""      Object.entries(payload.buffers || {}).forEach(([id, item]) => {
        try {
          const audioBuffer = ctx.createBuffer(""","""      Object.entries(payload.buffers || {}).forEach(([id, item]) => {
        try {
          if (item && item.audioBuffer) { dawState.buffers[id] = item.audioBuffer; return; }
          if (!item || !item.channels) return;
          const audioBuffer = ctx.createBuffer(""","mem-loop")
h=once(h,"  window.__projectIO = { makePayload, restorePayload };","""  /* Öffentlich: bei Projekten mit Original-Dateien ein Promise (erst dekodieren), sonst wie bisher sofort */
  function restorePayload(payload) {
    if (needsHydrate(payload)) return hydratePayload(payload).then(() => restoreCore(payload));
    return restoreCore(payload);
  }
  window.__projectIO = { makePayload, restorePayload, hydratePayload, decodeKeep, srcOf: ab => SRC.get(ab) || null, compactOf: compactSource };""","mem-export")
h=once(h,"          restorePayload(record.payload);\n          $('status-subtitle').textContent = `Projekt: ${record.name}`;","          await restorePayload(record.payload);\n          $('status-subtitle').textContent = `Projekt: ${record.name}`;","mem-lib")
# Import-Stellen
h=once(h,"const decoded = await audioEngine.ctx.decodeAudioData(item.buffer.slice(0));","const decoded = await (window.__projectIO && window.__projectIO.decodeKeep ? window.__projectIO.decodeKeep(item.buffer, item.name) : audioEngine.ctx.decodeAudioData(item.buffer.slice(0)));","mem-imp1")
h=once(h,"        const raw = await f.arrayBuffer();\n        const decoded = await audioEngine.ctx.decodeAudioData(raw.slice(0));","        const raw = await f.arrayBuffer();\n        const decoded = await (window.__projectIO && window.__projectIO.decodeKeep ? window.__projectIO.decodeKeep(raw, f.name) : audioEngine.ctx.decodeAudioData(raw.slice(0)));","mem-imp2")
h=once(h,"        const decoded = await audioEngine.ctx.decodeAudioData(raw.slice(0));\n        const cleanName = it.name.replace(","        const decoded = await (window.__projectIO && window.__projectIO.decodeKeep ? window.__projectIO.decodeKeep(raw, it.name) : audioEngine.ctx.decodeAudioData(raw.slice(0)));\n        const cleanName = it.name.replace(","mem-imp3")
