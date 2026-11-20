/* ===== Sunshine@R · Tags aus Audiodateien lesen =====
   Liest Titel, Künstler, Album, Genre, Jahr, Titelnummer, Kommentar und das Cover direkt aus der Datei – ohne sie zu laden oder zu dekodieren.
   Unterstützt: MP3 (ID3v2.2/2.3/2.4, ID3v1), M4A/MP4/AAC (iTunes-Atome), FLAC, OGG Vorbis / Opus, WAV (LIST-INFO und id3-Block).
   PlTags.read(blobOderFile, dateiname) → Promise<{ title, artist, album, genre, year, track, comment, cover: Blob|null, dur?, fmt }>  (nie ein Fehler: leeres Ergebnis) */
(function () {
  'use strict';
  const u8 = async (b, s, e) => new Uint8Array(await b.slice(s, e).arrayBuffer());
  const dec = (bytes, enc) => { try { return new TextDecoder(enc).decode(bytes); } catch (_) { let s = ''; for (const c of bytes) s += String.fromCharCode(c); return s; } };
  const latin = b => dec(b, 'iso-8859-1'), utf8 = b => dec(b, 'utf-8');
  const clean = s => String(s == null ? '' : s).replace(/\u0000+$/g, '').replace(/\u0000/g, ' / ').replace(/﻿/g, '').trim();
  const be32 = (a, o) => ((a[o] << 24) | (a[o + 1] << 16) | (a[o + 2] << 8) | a[o + 3]) >>> 0, le32 = (a, o) => (a[o] | (a[o + 1] << 8) | (a[o + 2] << 16) | (a[o + 3] << 24)) >>> 0;
  const ss32 = (a, o) => ((a[o] & 127) << 21) | ((a[o + 1] & 127) << 14) | ((a[o + 2] & 127) << 7) | (a[o + 3] & 127);
  const str4 = (a, o) => String.fromCharCode(a[o], a[o + 1], a[o + 2], a[o + 3]);
  const empty = () => ({ title: '', artist: '', album: '', genre: '', year: '', track: '', comment: '', cover: null, fmt: '' });
  const imgBlob = (bytes, mime) => { if (!bytes || bytes.length < 16) return null; let t = mime || ''; if (!/^image\//.test(t)) t = bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : 'image/jpeg'; return new Blob([bytes], { type: t }); };
  const yr = s => { const m = String(s || '').match(/\d{4}/); return m ? m[0] : ''; };
  const ID3V1_GENRES = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'AlternRock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychadelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock'];
  const genreFix = g => { g = clean(g); const m = g.match(/^\((\d+)\)\s*(.*)$/) || g.match(/^(\d+)$/); if (m) { const n = +m[1]; return (m[2] && !/^\d+$/.test(m[2])) ? m[2] : (ID3V1_GENRES[n] || ''); } return g; };

  /* ---- ID3v2 ---- */
  function id3text(d) {   // d = Bytes eines Textrahmens (inkl. Kodierungsbyte)
    if (!d.length) return ''; const e = d[0], b = d.subarray(1);
    if (e === 1 || e === 2) { let le = true, o = 0; if (b[0] === 0xFE && b[1] === 0xFF) { le = false; o = 2; } else if (b[0] === 0xFF && b[1] === 0xFE) o = 2; else if (e === 2) le = false; return clean(dec(b.subarray(o), le ? 'utf-16le' : 'utf-16be')); }
    return clean(e === 3 ? utf8(b) : latin(b));
  }
  function endOfStr(b, o, enc) {   // Ende eines nullterminierten Textes; liefert Index nach dem Terminator
    if (enc === 1 || enc === 2) { for (let i = o; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i + 2; return b.length; }
    for (let i = o; i < b.length; i++) if (b[i] === 0) return i + 1; return b.length;
  }
  function parseId3(a) {   // a = Uint8Array ab „ID3“
    const r = empty(); if (a.length < 10 || a[0] !== 0x49 || a[1] !== 0x44 || a[2] !== 0x33) return r;
    const ver = a[3], flags = a[5], size = ss32(a, 6), end = Math.min(a.length, 10 + size); let o = 10;
    if (flags & 0x40) { const xs = ver === 4 ? ss32(a, o) : be32(a, o) + 4; o += xs; }
    const hl = ver === 2 ? 6 : 10;
    while (o + hl <= end) {
      let id, sz, fl = 0;
      if (ver === 2) { id = String.fromCharCode(a[o], a[o + 1], a[o + 2]); sz = (a[o + 3] << 16) | (a[o + 4] << 8) | a[o + 5]; } else { id = str4(a, o); sz = ver === 4 ? ss32(a, o + 4) : be32(a, o + 4); fl = (a[o + 8] << 8) | a[o + 9]; }
      if (!/^[A-Z0-9]{3,4}$/.test(id) || sz <= 0) break; const s0 = o + hl, s1 = s0 + sz; if (s1 > end) break; let d = a.subarray(s0, s1);
      if (ver === 4 && (fl & 0x0001)) d = d.subarray(4);   // Datenlängen-Kennung
      switch (id) {
        case 'TIT2': case 'TT2': r.title = r.title || id3text(d); break;
        case 'TPE1': case 'TP1': r.artist = r.artist || id3text(d); break;
        case 'TPE2': case 'TP2': if (!r.artist) r.albumArtist = id3text(d); break;
        case 'TALB': case 'TAL': r.album = r.album || id3text(d); break;
        case 'TCON': case 'TCO': r.genre = r.genre || genreFix(id3text(d)); break;
        case 'TYER': case 'TYE': case 'TDRC': case 'TDRL': r.year = r.year || yr(id3text(d)); break;
        case 'TRCK': case 'TRK': r.track = r.track || id3text(d).split('/')[0]; break;
        case 'COMM': case 'COM': { if (d.length > 4) { const enc = d[0], p = endOfStr(d, 4, enc), t = id3text(new Uint8Array([enc, ...d.subarray(p)])); if (t && !r.comment) r.comment = t; } break; }
        case 'APIC': { if (r.cover) break; const enc = d[0]; let p = 1, mime = ''; if (id === 'APIC') { const e2 = endOfStr(d, 1, 0); mime = latin(d.subarray(1, e2 - 1)); p = e2; } else { const f = latin(d.subarray(1, 4)).toLowerCase(); mime = f === 'png' ? 'image/png' : 'image/jpeg'; p = 4; } p += 1; p = endOfStr(d, p, enc); r.cover = imgBlob(d.subarray(p), mime); break; }
        case 'PIC': { if (r.cover) break; const enc = d[0], f = latin(d.subarray(1, 4)).toLowerCase(); let p = 5; p = endOfStr(d, p, enc); r.cover = imgBlob(d.subarray(p), f === 'png' ? 'image/png' : 'image/jpeg'); break; }
      }
      o = s1;
    }
    if (!r.artist && r.albumArtist) r.artist = r.albumArtist; delete r.albumArtist; return r;
  }
  async function readMp3(b) {
    let r = empty(); r.fmt = 'MP3';
    const h = await u8(b, 0, 10);
    if (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) { const size = ss32(h, 6) + 10 + ((h[5] & 0x10) ? 10 : 0); r = Object.assign(r, parseId3(await u8(b, 0, Math.min(size, 12 * 1048576)))); r.fmt = 'MP3'; }
    if (!r.title && b.size > 128) { const t = await u8(b, b.size - 128, b.size); if (t[0] === 0x54 && t[1] === 0x41 && t[2] === 0x47) { const f = (o, n) => clean(latin(t.subarray(o, o + n))); r.title = f(3, 30); r.artist = r.artist || f(33, 30); r.album = r.album || f(63, 30); r.year = r.year || yr(f(93, 4)); r.genre = r.genre || (ID3V1_GENRES[t[127]] || ''); } }
    return r;
  }

  /* ---- MP4 / M4A ---- */
  async function boxes(b, s, e, want) {   // Top-Level-Atome eines Bereichs: [{type, start, size, hdr}]
    const out = []; let p = s, guard = 0;
    while (p + 8 <= e && guard++ < 400) {
      const h = await u8(b, p, Math.min(e, p + 16)); let sz = be32(h, 0); const ty = str4(h, 4); let hd = 8;
      if (sz === 1 && h.length >= 16) { sz = be32(h, 8) * 4294967296 + be32(h, 12); hd = 16; } else if (sz === 0) sz = e - p;
      if (sz < hd) break; out.push({ type: ty, start: p, size: sz, hdr: hd }); if (want && ty === want) break; p += sz;
    }
    return out;
  }
  function mp4Children(a, o, e) { const out = []; while (o + 8 <= e) { const sz = be32(a, o), ty = str4(a, o + 4); if (sz < 8 || o + sz > e) break; out.push({ type: ty, s: o + 8, e: o + sz }); o += sz; } return out; }
  async function readMp4(b) {
    const r = empty(); r.fmt = 'M4A'; const top = await boxes(b, 0, b.size, 'moov'), mv = top.find(x => x.type === 'moov'); if (!mv || mv.size > 40 * 1048576) return r;
    const a = await u8(b, mv.start + mv.hdr, mv.start + mv.size);
    const udta = mp4Children(a, 0, a.length).find(x => x.type === 'udta'); if (!udta) return r;
    const meta = mp4Children(a, udta.s, udta.e).find(x => x.type === 'meta'); if (!meta) return r;
    const ilst = mp4Children(a, meta.s + 4, meta.e).find(x => x.type === 'ilst'); if (!ilst) return r;
    for (const it of mp4Children(a, ilst.s, ilst.e)) {
      const dt = mp4Children(a, it.s, it.e).find(x => x.type === 'data'); if (!dt) continue; const flg = be32(a, dt.s) & 0xFFFFFF, pay = a.subarray(dt.s + 8, dt.e);
      const key = it.type.replace(/©/g, '©'), txt = () => clean(utf8(pay));
      if (key === '©nam') r.title = txt(); else if (key === '©ART' || (key === 'aART' && !r.artist)) r.artist = r.artist || txt(); else if (key === '©alb') r.album = txt(); else if (key === '©gen') r.genre = txt(); else if (key === '©day') r.year = yr(txt()); else if (key === '©cmt') r.comment = txt();
      else if (key === 'gnre' && pay.length >= 2 && !r.genre) r.genre = ID3V1_GENRES[((pay[0] << 8) | pay[1]) - 1] || ''; else if (key === 'trkn' && pay.length >= 4) r.track = String((pay[2] << 8) | pay[3]);
      else if (key === 'covr') r.cover = imgBlob(pay, flg === 14 ? 'image/png' : 'image/jpeg');
    }
    return r;
  }

  /* ---- Vorbis-Kommentare (FLAC, Ogg) ---- */
  function pictureBlock(a) {   // FLAC-PICTURE-Block
    try { let o = 4; const ml = be32(a, o); o += 4; const mime = latin(a.subarray(o, o + ml)); o += ml; const dl = be32(a, o); o += 4 + dl + 16; const n = be32(a, o); o += 4; return imgBlob(a.subarray(o, o + n), mime); } catch (_) { return null; }
  }
  function vorbisComments(a, o, r) {
    try {
      const vl = le32(a, o); o += 4 + vl; const n = le32(a, o); o += 4;
      for (let i = 0; i < n && o + 4 <= a.length; i++) {
        const l = le32(a, o); o += 4; if (o + l > a.length) break; const s = utf8(a.subarray(o, o + l)); o += l; const k = s.indexOf('='); if (k < 1) continue; const key = s.slice(0, k).toUpperCase(), v = s.slice(k + 1);
        if (key === 'TITLE') r.title = r.title || clean(v); else if (key === 'ARTIST') r.artist = r.artist || clean(v); else if (key === 'ALBUMARTIST' && !r.artist) r.artist = clean(v); else if (key === 'ALBUM') r.album = r.album || clean(v); else if (key === 'GENRE') r.genre = r.genre || clean(v);
        else if (key === 'DATE' || key === 'YEAR') r.year = r.year || yr(v); else if (key === 'TRACKNUMBER') r.track = r.track || clean(v).split('/')[0]; else if (key === 'COMMENT' || key === 'DESCRIPTION') r.comment = r.comment || clean(v);
        else if ((key === 'METADATA_BLOCK_PICTURE') && !r.cover) { try { const bin = atob(v), bytes = new Uint8Array(bin.length); for (let q = 0; q < bin.length; q++) bytes[q] = bin.charCodeAt(q); r.cover = pictureBlock(bytes); } catch (_) {} }
      }
    } catch (_) {}
    return r;
  }
  async function readFlac(b) {
    const r = empty(); r.fmt = 'FLAC'; let p = 4, last = false, guard = 0;
    while (!last && p + 4 <= b.size && guard++ < 60) {
      const h = await u8(b, p, p + 4); last = !!(h[0] & 0x80); const ty = h[0] & 0x7F, len = (h[1] << 16) | (h[2] << 8) | h[3];
      if (ty === 4 && len < 4 * 1048576) vorbisComments(await u8(b, p + 4, p + 4 + len), 0, r);
      else if (ty === 6 && !r.cover && len < 12 * 1048576) { const c = pictureBlock(await u8(b, p + 4, p + 4 + len)); if (c) r.cover = c; }
      else if (ty === 0 && len >= 18) { const si = await u8(b, p + 4, p + 4 + 18), sr = (si[10] << 12) | (si[11] << 4) | (si[12] >> 4), tot = ((si[13] & 15) * 4294967296) + be32(si, 14); if (sr > 0 && tot > 0) r.dur = tot / sr; }
      p += 4 + len;
    }
    return r;
  }
  async function readOgg(b) {
    const r = empty(); const a = await u8(b, 0, Math.min(b.size, 3 * 1048576)); let o = 0, packets = [], cur = [], page = 0;
    while (o + 27 <= a.length && packets.length < 2 && page++ < 4000) {
      if (str4(a, o) !== 'OggS') break; const nseg = a[o + 26]; let dp = o + 27 + nseg; const lac = a.subarray(o + 27, o + 27 + nseg);
      for (const l of lac) { cur.push(a.subarray(dp, dp + l)); dp += l; if (l < 255) { let n = 0; cur.forEach(c => n += c.length); const pk = new Uint8Array(n); let q = 0; cur.forEach(c => { pk.set(c, q); q += c.length; }); packets.push(pk); cur = []; if (packets.length >= 2) break; } }
      o = dp;
    }
    const first = packets[0] || new Uint8Array(0), cm = packets[1];
    r.fmt = first.length > 7 && latin(first.subarray(0, 8)) === 'OpusHead' ? 'Opus' : 'Ogg';
    if (cm) { if (latin(cm.subarray(0, 8)) === 'OpusTags') vorbisComments(cm, 8, r); else if (cm[0] === 3 && latin(cm.subarray(1, 7)) === 'vorbis') vorbisComments(cm, 7, r); }
    return r;
  }

  /* ---- WAV ---- */
  async function readWav(b) {
    const r = empty(); r.fmt = 'WAV'; let p = 12, guard = 0, byteRate = 0;
    while (p + 8 <= b.size && guard++ < 80) {
      const h = await u8(b, p, p + 8), id = str4(h, 0), sz = le32(h, 4), body = p + 8;
      if (id === 'fmt ' && sz >= 16) { const f = await u8(b, body, body + 16); byteRate = le32(f, 8); }
      else if (id === 'data') { if (byteRate > 0) r.dur = sz / byteRate; }
      else if (id === 'LIST' && sz >= 4 && sz < 4 * 1048576) {
        const a = await u8(b, body, body + sz); if (str4(a, 0) === 'INFO') { let o = 4; while (o + 8 <= a.length) { const k = str4(a, o), n = le32(a, o + 4), v = clean(utf8(a.subarray(o + 8, o + 8 + n))); o += 8 + n + (n & 1); if (k === 'INAM') r.title = r.title || v; else if (k === 'IART') r.artist = r.artist || v; else if (k === 'IPRD') r.album = r.album || v; else if (k === 'IGNR') r.genre = r.genre || v; else if (k === 'ICRD') r.year = r.year || yr(v); else if (k === 'ICMT') r.comment = r.comment || v; } }
      } else if ((id === 'id3 ' || id === 'ID3 ') && sz > 10 && sz < 16 * 1048576) { const t = parseId3(await u8(b, body, body + sz)); Object.keys(t).forEach(k => { if (t[k] && (!r[k] || k === 'cover')) r[k] = t[k]; }); }
      p = body + sz + (sz & 1);
    }
    return r;
  }

  async function read(blob, name) {
    try {
      if (!blob || !blob.size) return empty();
      const ext = (String(name || blob.name || '').match(/\.([a-z0-9]+)$/i) || [])[1]; const x = (ext || '').toLowerCase();
      const head = await u8(blob, 0, 12), h4 = str4(head, 0);
      let r;
      if (h4 === 'fLaC') r = await readFlac(blob);
      else if (h4 === 'OggS') r = await readOgg(blob);
      else if (h4 === 'RIFF' && latin(head.subarray(8, 12)) === 'WAVE') r = await readWav(blob);
      else if (str4(head, 4) === 'ftyp') r = await readMp4(blob);
      else if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) r = await readMp3(blob);
      else if (x === 'mp3' || x === 'aac') r = await readMp3(blob);
      else r = empty();
      r.cover = r.cover || null; return r;
    } catch (_) { return empty(); }
  }
  window.PlTags = { read, parseId3 };
})();
