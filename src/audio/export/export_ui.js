/* ===== Sunshine@R: Export-Fenster (Master/Bereich · Einzelstems als ZIP · alle MIDI-Spuren · WAV 16/24 · Opus) ===== */
(function () {
  'use strict';
  if (typeof window.__exportMix !== 'function') return;
  const $ = id => document.getElementById(id);
  const say = (m, k) => { try { toast(m, k || 'info'); } catch (_) {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = { what: 'master', range: 'all', from: 1, to: 8, fmt: 'wav16', withMaster: true, tags: true, pick: {}, busy: false, cancel: false };
  let root = null, opusOk = false;

  /* ------------------------------------------------------------------ Formate */
  function wav24(buf) {
    const nCh = Math.min(2, buf.numberOfChannels), len = buf.length, sr = buf.sampleRate, bytes = len * nCh * 3, ab = new ArrayBuffer(44 + bytes), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nCh * 3, true); v.setUint16(32, nCh * 3, true); v.setUint16(34, 24, true); ws(36, 'data'); v.setUint32(40, bytes, true);
    const ch = []; for (let c = 0; c < nCh; c++) ch.push(buf.getChannelData(c)); let p = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < nCh; c++) { const x = clamp(ch[c][i], -1, 1), n = Math.round(x < 0 ? x * 0x800000 : x * 0x7FFFFF); v.setUint8(p, n & 255); v.setUint8(p + 1, (n >> 8) & 255); v.setUint8(p + 2, (n >> 16) & 255); p += 3; }
    return new Blob([ab], { type: 'audio/wav' });
  }
  /* Ogg-Opus über WebCodecs: schneller als Echtzeit, keine Fremdbibliothek */
  const OGG_T = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04C11DB7) : (r << 1); t[i] = r >>> 0; } return t; })();
  const oggCrc = b => { let c = 0; for (let i = 0; i < b.length; i++) c = ((c << 8) ^ OGG_T[((c >>> 24) ^ b[i]) & 255]) >>> 0; return c; };
  function oggPage(packets, type, granule, serial, seq) {
    const lac = []; packets.forEach(p => { let n = p.length; while (n >= 255) { lac.push(255); n -= 255; } lac.push(n); });
    const body = packets.reduce((s, p) => s + p.length, 0), out = new Uint8Array(27 + lac.length + body), v = new DataView(out.buffer);
    out.set([0x4F, 0x67, 0x67, 0x53, 0, type]); v.setUint32(6, granule % 4294967296, true); v.setUint32(10, Math.floor(granule / 4294967296), true); v.setUint32(14, serial, true); v.setUint32(18, seq, true); out[26] = lac.length; out.set(lac, 27);
    let o = 27 + lac.length; packets.forEach(p => { out.set(p, o); o += p.length; }); v.setUint32(22, oggCrc(out), true); return out;
  }
  /* Ein großes Paket (z. B. Tags mit Cover) auf mehrere Ogg-Seiten verteilen: Fortsetzungsseiten tragen Granule -1 */
  function oggBig(pkt, serial, seq) {
    const out = []; let pos = 0, first = true;
    while (true) {
      const room = 255 * 255, chunk = pkt.subarray(pos, Math.min(pkt.length, pos + room)), last = pos + chunk.length >= pkt.length, lac = []; let n = chunk.length;
      while (n >= 255) { lac.push(255); n -= 255; } if (last) lac.push(n); else if (!lac.length) lac.push(0);
      const pg = new Uint8Array(27 + lac.length + chunk.length), v = new DataView(pg.buffer);
      pg.set([0x4F, 0x67, 0x67, 0x53, 0, first ? 0 : 1]); if (last) { v.setUint32(6, 0, true); v.setUint32(10, 0, true); } else { v.setUint32(6, 0xFFFFFFFF, true); v.setUint32(10, 0xFFFFFFFF, true); }
      v.setUint32(14, serial, true); v.setUint32(18, seq + out.length, true); pg[26] = lac.length; pg.set(lac, 27); pg.set(chunk, 27 + lac.length); v.setUint32(22, oggCrc(pg), true); out.push(pg);
      pos += chunk.length; first = false; if (last) break;
    }
    return out;
  }
  async function opusSupported() { try { return typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })).supported === true; } catch (_) { return false; } }
  async function encodeOpus(buf, kbps, meta) {
    const N = Math.ceil(buf.length * 48000 / buf.sampleRate);
    let src = buf; if (buf.sampleRate !== 48000) { const oc = new OfflineAudioContext(2, N, 48000), bs = oc.createBufferSource(); bs.buffer = buf; bs.connect(oc.destination); bs.start(); src = await oc.startRendering(); }
    const L = src.getChannelData(0), R = src.numberOfChannels > 1 ? src.getChannelData(1) : L, chunks = []; let desc = null, err = null;
    const enc = new AudioEncoder({ output: (c, m) => { const d = new Uint8Array(c.byteLength); c.copyTo(d); chunks.push({ d, dur: c.duration }); if (m && m.decoderConfig && m.decoderConfig.description && !desc) desc = new Uint8Array(m.decoderConfig.description.buffer ? m.decoderConfig.description.buffer.slice(0) : m.decoderConfig.description); }, error: e => { err = e; } });
    enc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: kbps * 1000 });
    const BLK = 4800; for (let pos = 0; pos < N; pos += BLK) {
      if (err) throw err; const n = Math.min(BLK, N - pos), data = new Float32Array(n * 2); data.set(L.subarray(pos, pos + n), 0); data.set(R.subarray(pos, pos + n), n);
      enc.encode(new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(pos / 48000 * 1e6), data })); if (enc.encodeQueueSize > 12) await new Promise(r => setTimeout(r, 0));
    }
    await enc.flush(); enc.close(); if (err) throw err; if (!chunks.length) throw new Error('Opus-Encoder lieferte nichts');
    let pre = 312; if (desc && desc.length >= 12) pre = desc[10] | (desc[11] << 8);
    const head = new Uint8Array(19); head.set([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, 2]); head[10] = pre & 255; head[11] = pre >> 8; head[12] = 0x80; head[13] = 0xBB; /* 48000 Hz */
    let tg; if (window.Cover && Cover.opusTags) tg = await Cover.opusTags(meta || null); else { const tags = new TextEncoder().encode('Sunshine@R'); tg = new Uint8Array(8 + 4 + tags.length + 4); tg.set([0x4F, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73]); new DataView(tg.buffer).setUint32(8, tags.length, true); tg.set(tags, 12); }
    const serial = (Math.random() * 4294967295) >>> 0, pages = [oggPage([head], 2, 0, serial, 0)]; let seq = 1; { const tp = oggBig(tg, serial, seq); tp.forEach(pg => pages.push(pg)); seq += tp.length; } let gran = 0, acc = [];
    chunks.forEach((c, i) => { acc.push(c.d); gran += Math.round(c.dur * 48000 / 1e6); const last = i === chunks.length - 1;
      if (acc.length >= 40 || last) { pages.push(oggPage(acc, last ? 4 : 0, last ? pre + N : pre + gran, serial, seq++)); acc = []; } });
    return new Blob(pages, { type: 'audio/ogg' });
  }
  async function encodeBuf(buf, fmt, extra) {
    const meta = (S.tags && window.Cover) ? await Cover.exportMeta(extra) : null;
    if (fmt === 'wav24') return { blob: meta ? Cover.tagWav(wav24(buf), meta) : wav24(buf), ext: 'wav' };
    if (fmt === 'opus') return { blob: await encodeOpus(buf, 160, meta), ext: 'ogg' };
    return { blob: meta ? Cover.tagWav(encodeWav16Bit(buf), meta) : encodeWav16Bit(buf), ext: 'wav' };
  }

  /* ------------------------------------------------------------------ ZIP (ohne Kompression, ohne Fremdbibliothek) */
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function zipEntry(name, blob) { const ab = new Uint8Array(await blob.arrayBuffer()); return { name, blob, size: ab.length, crc: crc32(ab) }; }
  function zipBlob(files) {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0; const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(f => {
      const nb = enc.encode(f.name), lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, f.crc, true); lh.setUint32(18, f.size, true); lh.setUint32(22, f.size, true); lh.setUint16(26, nb.length, true);
      parts.push(lh.buffer, nb, f.blob);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, f.crc, true); ch.setUint32(20, f.size, true); ch.setUint32(24, f.size, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      central.push(ch.buffer, nb); off += 30 + nb.length + f.size;
    });
    const cd = central.reduce((s, p) => s + p.byteLength, 0), end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cd, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }

  /* ------------------------------------------------------------------ MIDI (Format 1, alle Spuren) */
  const vlq = v => { const o = [v & 127]; while ((v >>= 7)) o.unshift((v & 127) | 128); return o; };
  function midiTrackBytes(events) {
    events.sort((a, b) => a.t - b.t || (a.o || 0) - (b.o || 0)); const out = []; let last = 0;
    events.forEach(e => { const d = Math.max(0, Math.round(e.t) - last); last = Math.max(last, Math.round(e.t)); out.push(...vlq(d), ...e.b); }); out.push(0, 0xFF, 0x2F, 0);
    const n = out.length; return [0x4D, 0x54, 0x72, 0x6B, (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, ...out];
  }
  const nameMeta = nm => { const b = Array.from(new TextEncoder().encode(nm)); return { t: 0, o: -2, b: [0xFF, 0x03, ...vlq(b.length), ...b] }; };
  function buildMidi() {
    try { syncActiveMidiTrackFromState(); } catch (_) {}
    const TPB = 480, T16 = TPB / 4, trks = [], uspb = Math.round(60000000 / dawState.bpm);
    const _p = (typeof dawState !== 'undefined' && dawState.project) || null, _t = (_p && _p.tags) || {}, _txt = (id, v) => { const b = Array.from(new TextEncoder().encode(String(v))); return { t: 0, o: -3, b: [0xFF, id, ...vlq(b.length), ...b] }; };
    trks.push(midiTrackBytes([nameMeta((S.tags && _p && _p.name) || 'Sunshine@R'), ...((S.tags && _t.copyright) ? [_txt(0x02, _t.copyright)] : []), ...((S.tags && (_t.artist || _t.comment)) ? [_txt(0x01, [_t.artist, _t.comment].filter(Boolean).join(' · '))] : []), { t: 0, o: -1, b: [0xFF, 0x51, 3, (uspb >> 16) & 255, (uspb >> 8) & 255, uspb & 255] }, { t: 0, o: -1, b: [0xFF, 0x58, 4, 4, 2, 24, 8] }]));
    let ch = 0, count = 0, notes = 0;
    dawState.tracks.filter(t => t.type === 'midi').forEach(t => {
      const list = (t.midiNotes || []); if (!list.length) return; if (ch === 9) ch++; const c = ch % 16; ch++;
      const ev = [nameMeta(t.name || 'MIDI')];
      list.forEach(n => { const v = clamp(Math.round(n.vel || (t.stepVelocities && t.stepVelocities[n.start]) || 100), 1, 127); ev.push({ t: n.start * T16, o: 1, b: [0x90 | c, n.pitch & 127, v] }, { t: (n.start + Math.max(0.25, n.dur)) * T16, o: 0, b: [0x80 | c, n.pitch & 127, 0] }); notes++; });
      trks.push(midiTrackBytes(ev)); count++;
    });
    /* Sequencer-Muster über das Arrangement ausrollen (Kick/Hi-Hat → Kanal 10, 808-Bass → eigener Kanal) */
    const total = audioEngine.getTotalArrangementBars(), kt = dawState.tracks.find(t => t.type === 'kick' || t.id === 'ownKick'), bt = dawState.tracks.find(t => t.type === 'bass' || t.id === 'ownBass');
    const drum = [nameMeta('Sequencer Drums')], bass = [nameMeta('Sequencer Bass')]; let dn = 0, bn = 0;
    for (let bar = 0; bar < total; bar++) {
      const sec = audioEngine.getSectionAtBar(bar).section;
      for (let s = 0; s < 16; s++) {
        const t0 = (bar * 16 + s) * T16;
        if (kt && kt.sectionClips[sec.id] !== false) { if (dawState.seqKick[s]) { drum.push({ t: t0, o: 1, b: [0x99, 36, 110] }, { t: t0 + T16 * 0.9, o: 0, b: [0x89, 36, 0] }); dn++; } if (dawState.seqHat[s]) { drum.push({ t: t0, o: 1, b: [0x99, 42, 80] }, { t: t0 + T16 * 0.5, o: 0, b: [0x89, 42, 0] }); dn++; } }
        if (bt && bt.sectionClips[sec.id] !== false && dawState.seqBass[s]) { const p = clamp((dawState.midiRoot || 36) + (dawState.seqBassPitch[s] || 0), 0, 127), c = ch === 9 ? 10 : ch % 16; bass.push({ t: t0, o: 1, b: [0x90 | c, p, 100] }, { t: t0 + T16 * 0.9, o: 0, b: [0x80 | c, p, 0] }); bn++; }
      }
    }
    if (dn) { trks.push(midiTrackBytes(drum)); count++; notes += dn; } if (bn) { trks.push(midiTrackBytes(bass)); count++; notes += bn; }
    const hdr = [0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (trks.length >> 8) & 255, trks.length & 255, (TPB >> 8) & 255, TPB & 255];
    return { blob: new Blob([new Uint8Array(hdr), ...trks.map(t => new Uint8Array(t))], { type: 'audio/midi' }), tracks: count, notes };
  }

  /* ------------------------------------------------------------------ Bereich & Spuren */
  const barSec = () => 4 * 60 / dawState.bpm;
  function rangeSecs() {
    const bs = barSec(), total = audioEngine.getTotalArrangementBars(), v = S.range;
    if (v === 'content') { const c = audioEngine.getContentDurationSec(); return { start: 0, end: Math.min(total * bs, c > 0 ? c + 1 : total * bs), tag: '_Inhalt' }; }
    if (v.indexOf('sec') === 0) { const i = +v.slice(3), extra = total - audioEngine.getSectionBarsSum(); let b = 0; for (let k = 0; k < i; k++) b += dawState.sections[k].bars; const span = dawState.sections[i].bars + (i === dawState.sections.length - 1 ? extra : 0); return { start: b * bs, end: (b + span) * bs, tag: '_' + dawState.sections[i].name.replace(/[^\wÄÖÜäöüß-]+/g, '') }; }
    if (v === 'custom') { const f = clamp(parseInt(S.from, 10) || 1, 1, total), t = clamp(parseInt(S.to, 10) || total, f, total); return { start: (f - 1) * bs, end: t * bs, tag: `_Takt${f}-${t}` }; }
    return { start: 0, end: total * bs, tag: '' };
  }
  function trackEmpty(t) {
    if (['audio', 'stem', 'mic'].indexOf(t.type) >= 0) return !(dawState.buffers[t.id] || (Array.isArray(t.clips) && t.clips.length));
    if (t.type === 'midi') { try { syncActiveMidiTrackFromState(); } catch (_) {} return !(t.midiNotes && t.midiNotes.length); }
    if (t.type === 'kick') return !(dawState.seqKick.some(Boolean) || dawState.seqHat.some(Boolean));
    if (t.type === 'bass') return !dawState.seqBass.some(Boolean);
    if (t.type === 'fx') return !dawState.seqFx.some(Boolean);
    return false;
  }
  const safe = s => String(s || 'Spur').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim().slice(0, 40) || 'Spur';
  const fileBase = () => (S.tags && window.Cover && Cover.fileBase()) || `Sunshine-R_${dawState.bpm}BPM`;

  /* ------------------------------------------------------------------ Ausführen */
  const status = (m, pct) => { const s = $('ex-status'); if (s) s.textContent = m || ''; const b = $('ex-bar'); if (b) b.style.width = (pct == null ? 0 : pct) + '%'; };
  function setBusy(b) { S.busy = b; root.querySelectorAll('[data-ex="go"]').forEach(x => x.disabled = b); const c = root.querySelector('[data-ex="cancel"]'); if (c) c.hidden = !b; }
  async function save(blob, name) {
    const r = await saveOrShareBlob(blob, name);
    if (r === 'saved-documents') say(`Gespeichert unter Dokumente/SunshineDAW/${name}`, 'success'); else if (r !== 'cancelled') say(`${name} exportiert.`, 'success');
    return r;
  }
  async function run() {
    if (S.busy) return; S.cancel = false; setBusy(true);
    const bpmTag = fileBase();
    try {
      await audioEngine.ensureCtx();
      if (S.what === 'midi') {
        status('Erzeuge MIDI …', 30); const m = buildMidi();
        if (!m.notes) { status('Keine MIDI-Noten und keine Sequencer-Muster vorhanden.', 0); setBusy(false); return; }
        await save(m.blob, `${bpmTag}_MIDI.mid`); status(`MIDI exportiert: ${m.tracks} Spur(en), ${m.notes} Noten.`, 100); setBusy(false); return;
      }
      const rg = rangeSecs();
      const fmt = S.fmt;
      if (S.what === 'master') {
        status('Rendere Mix …', 15); const buf = await window.__exportMix({ returnBuffer: true, startSec: rg.start, endSec: rg.end });
        if (!buf) throw new Error('Render fehlgeschlagen'); status('Kodiere …', 70); const e = await encodeBuf(buf, fmt);
        await save(e.blob, `${bpmTag}_Mix${rg.tag}.${e.ext}`); status('Fertig.', 100); setBusy(false); return;
      }
      /* Einzelstems */
      const ids = dawState.tracks.filter(t => S.pick[t.id]).map(t => t.id); if (!ids.length) { status('Keine Spur ausgewählt.', 0); setBusy(false); return; }
      const files = [], total = ids.length + (S.withMaster ? 1 : 0); let done = 0;
      if (S.withMaster) { status(`Master-Mix …`, 2); const mb = await window.__exportMix({ returnBuffer: true, startSec: rg.start, endSec: rg.end }); const e = await encodeBuf(mb, fmt); files.push(await zipEntry(`00_Master-Mix.${e.ext}`, e.blob)); done++; }
      const snap = dawState.tracks.map(t => [t.mute, t.solo]); dawState.tracks.forEach(t => { t.mute = false; t.solo = false; });
      try {
        for (let i = 0; i < ids.length; i++) {
          if (S.cancel) break; const tr = dawState.tracks.find(t => t.id === ids[i]); status(`Stem ${i + 1}/${ids.length}: ${tr.name} …`, Math.round(done / total * 100));
          const buf = await window.__exportMix({ returnBuffer: true, onlyIds: [ids[i]], dry: true, startSec: rg.start, endSec: rg.end }); if (!buf) throw new Error('Render fehlgeschlagen: ' + tr.name);
          const e = await encodeBuf(buf, fmt, { title: ((dawState.project && dawState.project.name) || 'Song') + ' – ' + tr.name, track: i + 1, total: ids.length }); files.push(await zipEntry(`${String(dawState.tracks.indexOf(tr) + 1).padStart(2, '0')}_${safe(tr.name)}.${e.ext}`, e.blob)); done++;
        }
      } finally { dawState.tracks.forEach((t, i) => { t.mute = snap[i][0]; t.solo = snap[i][1]; }); try { audioEngine.syncAudioParams(); } catch (_) {} }
      if (S.cancel) { status('Abgebrochen.', 0); setBusy(false); return; }
      if (S.tags && window.Cover && Cover.coverBytes()) files.unshift(await zipEntry('cover.jpg', new Blob([Cover.coverBytes()], { type: 'image/jpeg' })));
      status('Packe ZIP …', 95); await save(zipBlob(files), `${bpmTag}_Stems${rg.tag}.zip`); status(`Fertig: ${files.length} Datei(en) in der ZIP.`, 100); setBusy(false);
    } catch (e) { console.error(e); status('Export fehlgeschlagen: ' + (e && e.message || e), 0); setBusy(false); }
  }

  /* ------------------------------------------------------------------ Fenster */
  function build() {
    if (root) return;
    const st = document.createElement('style'); st.textContent = (window.__lmCSS || '').replace(/#lm-root/g, '#ex-root') + '\n#ex-root .lm-seg{display:flex;gap:6px}#ex-root .lm-seg button{flex:1;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e2e8f0;font-weight:700;font-size:12px}#ex-root .lm-seg button[aria-pressed="true"]{background:rgba(245,158,11,.22);border-color:#f59e0b;color:#fff3dc}#ex-root .ex-list label{display:flex;gap:10px;align-items:center;min-height:40px;font-size:13px}#ex-root .ex-list input{width:20px;height:20px}#ex-root .ex-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:8px}#ex-root .ex-bar>div{height:100%;width:0;background:#f59e0b;transition:width .25s}#ex-root input[type=number]{min-height:44px;width:90px;border-radius:12px;background:#0b1220;border:1px solid rgba(255,255,255,.18);color:#e2e8f0;padding:0 10px}';
    document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'ex-root'; root.hidden = true; root.setAttribute('role', 'dialog');
    root.style.cssText = 'position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center';
    root.innerHTML = `<div class="lm-card" aria-label="Export">
      <div style="display:flex;align-items:center;gap:8px"><h3 style="flex:1">📦 Export</h3><button type="button" class="lm-btn" data-ex="close" aria-label="Schließen">✕</button></div>
      <div class="lm-sec"><b>Was?</b><div class="lm-seg" id="ex-what"><button type="button" data-what="master" aria-pressed="true">Mix</button><button type="button" data-what="stems" aria-pressed="false">Einzelstems (ZIP)</button><button type="button" data-what="midi" aria-pressed="false">MIDI</button></div><div class="lm-note" id="ex-whatnote"></div></div>
      <div class="lm-sec" id="ex-audio"><b>Bereich</b><select id="ex-range" aria-label="Bereich"></select>
        <div class="lm-row" id="ex-custom" hidden><label>Takt von <input id="ex-from" type="number" min="1" value="1"></label><label>bis <input id="ex-to" type="number" min="1" value="8"></label></div>
        <b style="margin-top:14px">Format</b><select id="ex-fmt" aria-label="Format"></select><div class="lm-note" id="ex-fmtnote"></div></div>
      <div class="lm-sec" id="ex-stems" hidden><b>Spuren</b><div class="ex-list" id="ex-list"></div><label class="ex-list" style="display:flex"><label style="display:flex;gap:10px;align-items:center;min-height:40px;font-size:13px"><input type="checkbox" id="ex-withmaster" checked> Mix zusätzlich als „00_Master-Mix“ in die ZIP</label></label>
        <div class="lm-note">Stems enthalten Fader, Pan, Automation und Effekte der Spur, aber nicht die Master-Lautstärke und den Limiter. Stumm/Solo werden dabei ignoriert.</div></div>
      <div class="lm-sec" id="ex-tagsec"><label style="display:flex;gap:10px;align-items:flex-start;min-height:40px;font-size:13px"><input type="checkbox" id="ex-tags" checked style="margin-top:3px"> <span>Tags &amp; Cover einbetten<span class="lm-note" id="ex-tagnote" style="display:block"></span></span></label></div>
      <div class="lm-row"><button type="button" class="lm-btn pri" data-ex="go" style="flex:1">Exportieren</button><button type="button" class="lm-btn" data-ex="cancel" hidden>Abbrechen</button></div>
      <div class="ex-bar"><div id="ex-bar"></div></div><div class="lm-note" id="ex-status"></div></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', e => {
      const w = e.target.closest('[data-what]'); if (w) { S.what = w.dataset.what; refresh(); return; }
      const b = e.target.closest('[data-ex]'); if (!b) { if (e.target === root && !S.busy) close(); return; }
      if (b.dataset.ex === 'close') { if (!S.busy) close(); } else if (b.dataset.ex === 'go') run(); else if (b.dataset.ex === 'cancel') { S.cancel = true; status('Wird nach dem aktuellen Schritt abgebrochen …'); }
    });
    $('ex-range').addEventListener('change', e => { S.range = e.target.value; refresh(); });
    $('ex-fmt').addEventListener('change', e => { S.fmt = e.target.value; refresh(); });
    $('ex-from').addEventListener('input', e => { S.from = e.target.value; }); $('ex-to').addEventListener('input', e => { S.to = e.target.value; });
    $('ex-withmaster').addEventListener('change', e => { S.withMaster = e.target.checked; });
    $('ex-tags').addEventListener('change', e => { S.tags = e.target.checked; });
    $('ex-list').addEventListener('change', e => { const c = e.target.closest('input[data-tid]'); if (c) S.pick[c.dataset.tid] = c.checked; });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden && !S.busy) close(); });
  }
  function refresh() {
    root.querySelectorAll('[data-what]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.what === S.what)));
    { const tn = $('ex-tagnote'), has = !!(window.Cover && Cover.hasTags()); $('ex-tags').checked = S.tags; tn.textContent = has ? (S.what === 'midi' ? 'Titel und Urheber kommen in die MIDI-Datei (ohne Cover).' : 'Titel, Künstler, Genre, Jahr, BPM, Tonart und Cover – in WAV und Opus/OGG; bei Stems zusätzlich cover.jpg in der ZIP.') : 'Noch keine Tags/Cover im Projekt (Projekt-Einstellungen → Cover & Tags).'; }
    $('ex-audio').hidden = S.what === 'midi'; $('ex-stems').hidden = S.what !== 'stems'; $('ex-custom').hidden = S.range !== 'custom';
    $('ex-whatnote').textContent = { master: 'Der fertige Mix mit Master-Lautstärke und Limiter – wie „Master WAV“, aber mit Bereich und Format zur Wahl.', stems: 'Jede Spur einzeln gerendert, alle in einer ZIP-Datei (zum Weiterbearbeiten in anderen Programmen).', midi: 'Alle MIDI-Spuren plus Kick/Hi-Hat/Bass-Muster des Sequencers als eine .mid-Datei (Format 1, Tempo enthalten).' }[S.what];
    const f = $('ex-fmtnote'); f.textContent = S.fmt === 'opus' ? 'Opus (.ogg): sehr klein (≈ 160 kbit/s), gut zum Teilen. Nicht für die Weiterbearbeitung.' : (S.fmt === 'wav24' ? '24-Bit-WAV: mehr Reserve für die Nachbearbeitung, größere Dateien.' : '16-Bit-WAV: Standard, überall abspielbar.');
  }
  function fill() {
    const total = audioEngine.getTotalArrangementBars(); let b = 0;
    const opts = [`<option value="all">Ganzer Song (${total} Takte)</option>`, `<option value="content">Bis Ende der Inhalte</option>`];
    const extra = total - audioEngine.getSectionBarsSum();
    dawState.sections.forEach((s, i) => { const span = s.bars + (i === dawState.sections.length - 1 ? extra : 0); opts.push(`<option value="sec${i}">Abschnitt: ${esc(s.name)} (Takt ${b + 1}–${b + span})</option>`); b += span; });
    opts.push('<option value="custom">Eigener Bereich (Takte) …</option>'); $('ex-range').innerHTML = opts.join(''); if (!$('ex-range').querySelector(`[value="${S.range}"]`)) S.range = 'all'; $('ex-range').value = S.range;
    $('ex-to').value = S.to = Math.min(total, Math.max(parseInt(S.to, 10) || 8, 1)); $('ex-to').max = $('ex-from').max = total;
    $('ex-fmt').innerHTML = `<option value="wav16">WAV 16-Bit</option><option value="wav24">WAV 24-Bit</option>${opusOk ? '<option value="opus">Opus komprimiert (.ogg, klein)</option>' : ''}`; if (S.fmt === 'opus' && !opusOk) S.fmt = 'wav16'; $('ex-fmt').value = S.fmt;
    const list = $('ex-list'); list.innerHTML = '';
    dawState.tracks.forEach((t, i) => { const empty = trackEmpty(t); if (S.pick[t.id] === undefined) S.pick[t.id] = !empty; const l = document.createElement('label'); l.innerHTML = `<input type="checkbox" data-tid="${esc(t.id)}" ${S.pick[t.id] ? 'checked' : ''}><span>${String(i + 1).padStart(2, '0')} · ${esc(t.name)}${empty ? ' <em style="color:#64748b">(leer)</em>' : ''}</span>`; list.appendChild(l); });
    if (!dawState.tracks.length) list.innerHTML = '<div class="lm-note">Noch keine Spuren.</div>';
  }
  async function open(what) {
    build(); opusOk = await opusSupported(); if (what) S.what = what; $('file-menu') && ($('file-menu').hidden = true);
    fill(); refresh(); status('', 0); setBusy(false); root.hidden = false;
  }
  function close() { if (root) root.hidden = true; }
  function addMenu(tries) {
    const menu = $('file-menu'); if (!menu) { if (tries > 0) setTimeout(() => addMenu(tries - 1), 250); return; } if ($('btn-export-all')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-export-all'; b.className = 'fm-item'; b.setAttribute('role', 'menuitem'); b.innerHTML = '📦 Export: Stems, Bereich, Format';
    const ref = $('btn-loudness') || $('btn-settings'); if (ref && ref.parentNode === menu) menu.insertBefore(b, ref); else menu.appendChild(b); b.addEventListener('click', () => open());
  }
  addMenu(40);
  window.ExportUI = { oggBig, oggCrc, open, close, run, buildMidi, zipBlob, zipEntry, encodeBuf, encodeOpus, wav24, opusSupported, state: S, rangeSecs, crc32 };
})();
