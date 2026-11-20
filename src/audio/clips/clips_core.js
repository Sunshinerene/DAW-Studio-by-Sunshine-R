/* ===== Sunshine@R: Clip-Modell (Teilen, Zuschneiden, Kopieren, Einfügen, Verschieben) ===== */
(function () {
  'use strict';
  const FADE = 0.004, MIN = 0.03;
  const isAud = tr => !!tr && (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic');
  const has = tr => !!tr && Array.isArray(tr.clips);
  const bufOf = (tr, c) => dawState.buffers[c.src || tr.id];
  let uid = 0;
  const nid = () => 'c' + Date.now().toString(36) + (uid++).toString(36) + Math.floor(Math.random() * 1e5).toString(36);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clipboard = { clips: [], from: null };

  /* Ohne eigene Clips verhält sich die Spur wie bisher: ein Clip = ganze Datei ab „Takt 1“ (Trim). */
  function implicit(tr) {
    const b = dawState.buffers[tr.id]; if (!b) return [];
    const trim = clamp(dawState.startOffsetMs / 1000, 0, Math.max(0, b.duration - 0.05));
    return [{ id: 'implicit', src: tr.id, offset: trim, start: 0, dur: Math.max(0.05, b.duration - trim), implicit: true }];
  }
  function materialize(tr) { if (!has(tr)) tr.clips = implicit(tr).map(c => { delete c.implicit; c.id = nid(); return c; }); return tr.clips; }
  function list(tr) { return has(tr) ? tr.clips.filter(c => bufOf(tr, c)) : implicit(tr); }
  function end(tr) { return list(tr).reduce((m, c) => Math.max(m, c.start + c.dur), 0); }
  function sortClips(tr) { tr.clips.sort((a, b) => a.start - b.start || a.offset - b.offset); }
  function reset(tr) { delete tr.clips; }

  /* Lautstärkeverlauf eines Clips: Einblenden (fi) → Pegel (g) → Ausblenden (fo); mindestens 4 ms gegen Knackser */
  function envPoints(D, fi, fo, g, r, tEnd) {
    fi = Math.max(FADE, Math.min(fi || 0, D)); fo = Math.max(FADE, Math.min(fo || 0, D));
    if (fi + fo > D) { const k = D / (fi + fo); fi *= k; fo *= k; }
    const P = [[0, 0], [fi, g], [Math.max(fi, D - fo), g], [D, 0]];
    const val = t => { if (t <= 0 || t >= D) return 0; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const a = P[i - 1], b = P[i]; return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return 0; };
    const cut = tEnd < D - 1e-6, cutS = Math.max(r, tEnd - FADE);
    const out = [[r, val(r)]];
    P.forEach(q => { if (q[0] > r + 1e-9 && (!cut || q[0] < cutS - 1e-9)) out.push(q); });
    if (cut) { out.push([cutS, val(cutS)]); out.push([tEnd, 0]); }
    return out;
  }
  /* Ein Clip mit Hüllkurve in die Kanalkette schicken. env = {g, fi, fo, r (bereits abgelaufene Clip-Zeit), D (volle Clip-Länge)} */
  function connect(ctx, buf, dest, when, bufPos, dur, fadeIn, env) {
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); s.connect(g); g.connect(dest);
    const e = env || {}, r = e.r || 0, D = Math.max(dur + r, e.D || 0);
    const pts = envPoints(D, e.fi, e.fo, e.g == null ? 1 : e.g, r, r + dur);
    g.gain.setValueAtTime(pts[0][1], when); for (let i = 1; i < pts.length; i++) g.gain.linearRampToValueAtTime(pts[i][1], when + (pts[i][0] - r));
    s.start(when, bufPos, dur); s._g = g; return s;
  }
  /* Effektive Fades eines Clips inkl. automatischer Überblendung bei teilweiser Überlappung */
  function fades(tr, c) {
    let fi = c.fi || 0, fo = c.fo || 0;
    if (tr.xfade !== false && has(tr)) {
      const ce = c.start + c.dur;
      tr.clips.forEach(o => {
        if (o === c || !bufOf(tr, o)) return; const oe = o.start + o.dur;
        const earlier = o.start < c.start - 1e-9 || (Math.abs(o.start - c.start) < 1e-9 && String(o.id) < String(c.id));
        if (earlier) { if (oe > c.start + 1e-9 && oe < ce - 1e-9) fi = Math.max(fi, oe - c.start); }
        else if (o.start < ce - 1e-9 && oe > ce + 1e-9) fo = Math.max(fo, ce - o.start);
      });
    }
    return { fi, fo };
  }
  function plan(tr, offsetSec, stopRoom) {
    /* → [{c, when(rel. Sekunden ab Abspielstart), pos, dur, fadeIn}] */
    const out = [];
    tr.clips.forEach(c => {
      const buf = bufOf(tr, c); if (!buf || buf.__parked) return;   /* entladene Spur (Speicher-Sparer): stumm, wird beim Hörbarmachen neu geladen */
      const cs = c.start, ce = c.start + c.dur; if (ce <= offsetSec + 1e-4) return;
      let w, pos, dur, fi, r = 0;
      if (cs >= offsetSec) { w = cs - offsetSec; pos = c.offset; dur = c.dur; fi = true; } else { w = 0; pos = c.offset + (offsetSec - cs); dur = ce - offsetSec; fi = false; r = offsetSec - cs; }
      pos = clamp(pos, 0, buf.duration - 0.001); dur = Math.min(dur, buf.duration - pos);
      if (stopRoom != null) { const room = stopRoom - w; if (room <= 0) return; dur = Math.min(dur, room); }
      if (dur > 0.002) { const f = fades(tr, c); out.push({ c, buf, when: w, pos, dur, fadeIn: fi, env: { g: c.g == null ? 1 : c.g, fi: f.fi, fo: f.fo, r: r, D: c.dur } }); }
    });
    return out;
  }
  function schedule(eng, tr, node, when, offsetSec, stopAt) {
    plan(tr, offsetSec, stopAt != null ? stopAt - when : null).forEach(p => {
      const s = api.connect(eng.ctx, p.buf, node.input, when + p.when, p.pos, p.dur, p.fadeIn, p.env);
      s.onended = () => { eng.activeStemSources = eng.activeStemSources.filter(x => x !== s); try { s.disconnect(); s._g.disconnect(); } catch (e) {} };
      eng.activeStemSources.push(s);
    });
  }
  function scheduleOffline(offCtx, tr, dest, totalSec) {
    tr.clips.forEach(c => {
      const buf = bufOf(tr, c); if (!buf || c.start >= totalSec) return;
      if (buf.__parked) { if (window.Saver && Saver.needed().indexOf(String(c.src || tr.id)) >= 0) buf._need(); return; }   /* entladen: nur wenn hörbar ist ein Fehler (Export darf nie still eine Spur weglassen) */
      const pos = clamp(c.offset, 0, buf.duration - 0.001), dur = Math.min(c.dur, buf.duration - pos, totalSec - c.start); if (dur <= 0.002) return;
      const f = fades(tr, c); connect(offCtx, buf, dest, c.start, pos, dur, true, { g: c.g == null ? 1 : c.g, fi: f.fi, fo: f.fo, r: 0, D: c.dur });
    });
  }

  /* ---------- Bearbeitungen (reine Datenoperationen) ---------- */
  function split(tr, t, id) {
    materialize(tr); let n = 0;
    tr.clips.slice().forEach(c => {
      if (id && c.id !== id) return;
      if (t > c.start + MIN && t < c.start + c.dur - MIN) {
        const b = { id: nid(), src: c.src || tr.id, offset: c.offset + (t - c.start), start: t, dur: c.start + c.dur - t };
        if (c.g != null) b.g = c.g; if (c.fo) b.fo = c.fo; delete c.fo;
        c.dur = t - c.start; tr.clips.push(b); n++;
      }
    });
    sortClips(tr); return n;
  }
  function remove(tr, id) { materialize(tr); const n = tr.clips.length; tr.clips = tr.clips.filter(c => c.id !== id); return n - tr.clips.length; }
  function setStart(tr, c, start) { c.start = Math.max(0, start); sortClips(tr); }
  function trimLeft(tr, c, newStart) {
    const buf = bufOf(tr, c), minStart = c.start - Math.min(c.offset, c.start);   /* nicht vor Dateianfang / Zeitleisten-Null */
    const maxStart = c.start + c.dur - MIN; newStart = clamp(newStart, minStart, maxStart);
    const d = newStart - c.start; c.start = newStart; c.offset += d; c.dur -= d; sortClips(tr);
  }
  function trimRight(tr, c, newEnd) {
    const buf = bufOf(tr, c), maxEnd = c.start + (buf.duration - c.offset); c.dur = clamp(newEnd, c.start + MIN, maxEnd) - c.start;
  }
  /* Löschen und Lücke schließen: spätere Clips rücken um die Länge der gelöschten nach links */
  function ripple(tr, ids) {
    materialize(tr); const gone = tr.clips.filter(c => ids.includes(c.id)); if (!gone.length) return 0;
    tr.clips = tr.clips.filter(c => !ids.includes(c.id));
    tr.clips.forEach(c => { const sh = gone.reduce((m, g) => m + (g.start + g.dur <= c.start + 1e-6 ? g.dur : 0), 0); if (sh) c.start = Math.max(0, c.start - sh); });
    sortClips(tr); return gone.length;
  }
  /* Clip als Schleife bis endT wiederholen (echte Kopien hintereinander, der letzte wird gekürzt) */
  function loopTo(tr, c, endT) {
    materialize(tr); const unit = c.dur; let n = 0, k = 1;
    if (unit < MIN * 2) return 0;
    while (true) {
      const st = c.start + k * unit, d = Math.min(unit, endT - st); if (d < MIN || k > 400) break;
      const b = { id: nid(), src: c.src || tr.id, offset: c.offset, start: st, dur: d }; if (c.g != null) b.g = c.g; tr.clips.push(b); n++; k++;
    }
    sortClips(tr); return n;
  }
  function copy(tr, ids) {
    const sel = (tr.clips || []).filter(c => ids.includes(c.id)); if (!sel.length) return 0;
    const t0 = Math.min(...sel.map(c => c.start));
    clipboard.clips = sel.map(c => ({ src: c.src || tr.id, offset: c.offset, dur: c.dur, rel: c.start - t0, g: c.g, fi: c.fi, fo: c.fo })); clipboard.from = tr.id; return sel.length;
  }
  function paste(tr, at) {
    if (!clipboard.clips.length) return [];
    materialize(tr); const made = [];
    clipboard.clips.forEach(k => { if (!dawState.buffers[k.src]) return; const c = { id: nid(), src: k.src, offset: k.offset, dur: k.dur, start: Math.max(0, at + k.rel) }; if (k.g != null) c.g = k.g; if (k.fi) c.fi = k.fi; if (k.fo) c.fo = k.fo; tr.clips.push(c); made.push(c); });
    sortClips(tr); return made;
  }

  /* ---------- Wellenform ---------- */
  const peakCache = new WeakMap(), BUCKET = 256;
  function peaks(buf) {
    let p = peakCache.get(buf); if (p) return p;
    const n = Math.ceil(buf.length / BUCKET); p = new Float32Array(n);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let b = 0; b < n; b++) { let m = p[b]; const s = b * BUCKET, e = Math.min(buf.length, s + BUCKET); for (let i = s; i < e; i += 2) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > m) m = v; } p[b] = m; } }
    peakCache.set(buf, p); return p;
  }
  /* Wellenform eines Clips in Pixelspalten [x0, x1) zeichnen */
  function drawWave(ctx, buf, c, xClip, pxPerSec, y, h, x0, x1) {
    const p = peaks(buf), sr = buf.sampleRate, mid = y + h / 2, gn = c.g == null ? 1 : c.g;
    for (let x = x0; x < x1; x++) {
      const t0 = c.offset + (x - xClip) / pxPerSec, t1 = c.offset + (x + 1 - xClip) / pxPerSec;
      let b0 = Math.floor(t0 * sr / BUCKET), b1 = Math.max(b0 + 1, Math.ceil(t1 * sr / BUCKET)); b0 = Math.max(0, b0); b1 = Math.min(p.length, b1);
      let m = 0; const stride = Math.max(1, Math.floor((b1 - b0) / 24)); for (let b = b0; b < b1; b += stride) if (p[b] > m) m = p[b];
      const bh = Math.max(1.2, Math.min(1, m * gn) * h * 0.9); ctx.fillRect(x, mid - bh / 2, 1, bh);
    }
  }
  /* Spur-Streifen in der Hauptansicht (ganze Zeitleiste auf Breite w) */
  function drawLane(ctx, tr, w, h, totalSec) {
    const pps = w / Math.max(0.001, totalSec);
    list(tr).forEach(c => {
      const buf = bufOf(tr, c); if (!buf) return;
      const x = c.start * pps, cw = c.dur * pps, xa = Math.max(0, Math.floor(x)), xb = Math.min(w, Math.ceil(x + cw));
      if (xb <= xa) return;
      ctx.save(); ctx.globalAlpha = (tr.mute ? 0.25 : 0.9) * 0.18; ctx.fillStyle = tr.color; ctx.fillRect(xa, 2, xb - xa, h - 4); ctx.restore();
      ctx.save(); ctx.globalAlpha = tr.mute ? 0.25 : 0.9; ctx.fillStyle = tr.color; drawWave(ctx, buf, c, x, pps, 0, h, xa, xb); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff'; ctx.fillRect(xa, 2, 1, h - 4); ctx.restore();
    });
  }

  /* Wellenform-Cache von einem Puffer auf einen anderen übertragen (Speicher-Sparer: entladene Spur behält ihre Wellenform) */
  function adoptPeaks(from, to) { const p = peaks(from); peakCache.set(to, p); return p; }
  const api = { adoptPeaks, isAud, has, list, end, materialize, reset, implicit, connect, plan, schedule, scheduleOffline, split, remove, ripple, loopTo, fades, envPoints, setStart, trimLeft, trimRight, copy, paste, drawWave, drawLane, peaks, clipboard, MIN, bufOf, sort: sortClips };
  window.ClipModel = api;
})();
