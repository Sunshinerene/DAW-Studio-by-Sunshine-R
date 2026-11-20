/* ===== Sunshine@R · Cover & Tags =====
   - Projekt-Cover (eigenes Bild oder automatisch aus Titel + Künstler/Produzent erzeugt) und Tags (Künstler, Genre, Jahr …)
   - Anzeige im Kopfbereich der DAW mit musikgesteuertem Effekt RUNDHERUM (das Bild bleibt frei)
   - Einbetten beim Export: WAV (INFO + ID3 mit Cover), Opus/OGG (Vorbis-Kommentare + Cover), MIDI (Titel/Urheber), ZIP (cover.jpg) */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const say = (m, k) => { try { if (typeof toast === 'function') toast(m, k || 'info'); } catch (_) {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LS = 'sunshine.cover', LAST = 'sunshine.cover.last';
  let S = { show: true, fx: 'ring', size: 'm', gain: 'norm', reach: 100, bright: 100, trans: 0 };
  try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (_) {}
    const saveS = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (_) {} };
  const lastTags = () => { try { return JSON.parse(localStorage.getItem(LAST) || '{}') || {}; } catch (_) { return {}; } };
  const COVER_PX = 512, THUMB_PX = 96, SMALL_PX = 300;
  const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Trap', 'R&B', 'Soul', 'Techno', 'House', 'Trance', 'Hard Trance', 'EDM', 'Dance', 'Drum & Bass', 'Dubstep', 'Lo-Fi', 'Ambient', 'Chill', 'Jazz', 'Klassik', 'Filmmusik', 'Schlager', 'Reggae', 'Latin', 'Metal', 'Punk', 'Indie', 'Folk', 'Country', 'Experimentell'];
  const STYLES = [['sun', 'Sonne'], ['wave', 'Wellen'], ['eq', 'Equalizer'], ['glow', 'Leuchten']];

  /* ---------------------------------------------------------------- Projekt-Zugriff */
  const proj = () => (typeof dawState !== 'undefined' && dawState.project) || null;
  function ensureProj() {
    if (typeof dawState === 'undefined') return null;
    if (!dawState.project) dawState.project = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: 'Unbenannt ' + new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), created: Date.now(), notes: '' };
    return dawState.project;
  }
  const tagsOf = p => Object.assign({ artist: '', album: '', genre: '', year: '', composer: '', copyright: '', comment: '' }, (p && p.tags) || {});
  const hasTags = () => { const p = proj(); if (!p) return false; const t = tagsOf(p); return !!(p.cover || t.artist || t.album || t.genre || t.composer || t.copyright || t.comment); };

  /* ---------------------------------------------------------------- Bildverarbeitung */
  function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Bild nicht lesbar')); im.src = src; }); }
  async function fileToImage(file) {
    if (typeof createImageBitmap === 'function') { try { return await createImageBitmap(file); } catch (_) {} }
    const u = URL.createObjectURL(file); try { return await loadImage(u); } finally { setTimeout(() => URL.revokeObjectURL(u), 4000); }
  }
  function squareCanvas(img, px) {   // mittig quadratisch zuschneiden
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, s = Math.min(w, h), c = document.createElement('canvas'); c.width = c.height = px;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#000'; x.fillRect(0, 0, px, px); x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, px, px); return c;
  }
  function jpegOf(canvas, q) { let d = canvas.toDataURL('image/jpeg', q || 0.88); if (d.length > 190000) d = canvas.toDataURL('image/jpeg', 0.72); return d; }
  async function resized(dataUrl, px, q) { const im = await loadImage(dataUrl); return jpegOf(squareCanvas(im, px), q || 0.8); }
  async function fromFile(file) {
    const img = await fileToImage(file); const c = squareCanvas(img, COVER_PX);
    return { cover: jpegOf(c, 0.88), thumb: squareCanvas(c, THUMB_PX).toDataURL('image/jpeg', 0.75) };
  }
  const b64bytes = d => { const b = atob(String(d).split(',')[1] || ''), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

  /* ---------------------------------------------------------------- Cover-Generator */
  const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const prng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hueRgb = v => { const [r, g, b] = v.map(x => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 30; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  function accentHue() {
    try { const v = getComputedStyle(document.documentElement).getPropertyValue('--daw-accent').trim().split(/[\s,]+/).map(Number); if (v.length >= 3 && v.every(isFinite)) { const [r, g, b] = v.map(x => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 30; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; } } catch (_) {}
    return 28;
  }
  const hsl = (h, s, l, a) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a == null ? 1 : a})`;
  function wrapText(x, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur); return lines;
  }
  function generate(o) {
    o = o || {}; const S0 = COVER_PX * 2, title = String(o.title || 'Ohne Titel').trim(), artist = String(o.artist || '').trim(), style = STYLES.some(s => s[0] === o.style) ? o.style : 'sun';
    const rnd = prng(hash(title + '|' + artist + '|' + (o.seed || 0) + '|' + style)), c = document.createElement('canvas'); c.width = c.height = S0; const x = c.getContext('2d');
    const h0 = o.hue != null ? o.hue : accentHue(), h1 = (h0 + (rnd() < 0.55 ? 0 : 30 + rnd() * 290)) % 360, h2 = (h1 + 40 + rnd() * 90) % 360, hB = hueRgb(themeCols().b), h3 = rnd() < 0.6 ? hB : (h1 + 170 + rnd() * 60) % 360;   // Zweitfarbe des Designs bevorzugt
    const bg = x.createLinearGradient(0, 0, S0 * 0.3, S0); bg.addColorStop(0, hsl(h1, 60, 9)); bg.addColorStop(1, hsl(h2, 65, 19)); x.fillStyle = bg; x.fillRect(0, 0, S0, S0);
    if (style === 'sun') {
      const cx = S0 / 2, cy = S0 * 0.58, R = S0 * 0.2; x.save(); x.translate(cx, cy); const n = 26; for (let i = 0; i < n; i++) { if (i % 2) continue; const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, S0 * 1.2, a0, a1); x.closePath(); x.fillStyle = hsl(h3, 90, 60, 0.1); x.fill(); } x.restore();
      const g = x.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.9); g.addColorStop(0, hsl(h3, 95, 62, 0.5)); g.addColorStop(1, hsl(h3, 95, 50, 0)); x.fillStyle = g; x.fillRect(0, 0, S0, S0);
      const sg = x.createLinearGradient(0, cy - R, 0, cy + R); sg.addColorStop(0, hsl(h3 + 30, 95, 66)); sg.addColorStop(1, hsl(h3, 95, 52)); x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
      x.fillStyle = hsl(h2, 65, 12, 0.9); for (let i = 0; i < 5; i++) { const yy = cy + R * (0.05 + i * 0.2), hh = 4 + i * 5; x.fillRect(cx - R, yy, R * 2, hh); }
    } else if (style === 'wave') {
      const n = 8; for (let i = 0; i < n; i++) { const base = S0 * (0.3 + i * 0.075), amp = S0 * (0.03 + rnd() * 0.07), f = 1.2 + rnd() * 2.6, ph = rnd() * 6.28, hh = i % 2 ? h3 : h1 + 20 * i;
        x.beginPath(); x.moveTo(0, S0); for (let px = 0; px <= S0; px += 6) x.lineTo(px, base + Math.sin(px / S0 * Math.PI * f + ph) * amp + Math.sin(px / S0 * 9 + ph) * amp * 0.25); x.lineTo(S0, S0); x.closePath(); x.fillStyle = hsl(hh, 85, 52, 0.22); x.fill(); x.strokeStyle = hsl(hh, 90, 70, 0.55); x.lineWidth = 3; x.stroke(); }
    } else if (style === 'eq') {
      const n = 22, gap = S0 / n, bw = gap * 0.64, mid = S0 * 0.56; let v = rnd();
      for (let i = 0; i < n; i++) { v = clamp(v + (rnd() - 0.5) * 0.7, 0.12, 1); const env = 0.55 + 0.45 * Math.sin(i / (n - 1) * Math.PI), hgt = S0 * 0.4 * v * env, xx = i * gap + (gap - bw) / 2;
        const g = x.createLinearGradient(0, mid - hgt, 0, mid); g.addColorStop(0, hsl(h3, 95, 66)); g.addColorStop(1, hsl(h1 + 20, 90, 52)); x.fillStyle = g; x.fillRect(xx, mid - hgt, bw, hgt);
        x.fillStyle = hsl(h1 + 20, 90, 52, 0.18); x.fillRect(xx, mid + 6, bw, hgt * 0.45); }
    } else {
      x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const cx = rnd() * S0, cy = rnd() * S0 * 0.9, r = S0 * (0.35 + rnd() * 0.4), g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, hsl(i % 2 ? h3 : h1 + i * 25, 90, 52, 0.55)); g.addColorStop(1, hsl(h1, 90, 40, 0)); x.fillStyle = g; x.fillRect(0, 0, S0, S0); }
      x.globalCompositeOperation = 'source-over'; x.lineWidth = 3; for (let i = 1; i <= 4; i++) { x.strokeStyle = 'rgba(255,255,255,' + (0.16 - i * 0.025) + ')'; x.beginPath(); x.arc(S0 * 0.5, S0 * 0.42, S0 * (0.1 + i * 0.1), 0, Math.PI * 2); x.stroke(); }
    }
    for (let i = 0; i < 1600; i++) { x.fillStyle = 'rgba(255,255,255,' + (rnd() * 0.06).toFixed(3) + ')'; x.fillRect(rnd() * S0, rnd() * S0, 2, 2); }   // feines Korn
    const sc = x.createLinearGradient(0, S0 * 0.42, 0, S0); sc.addColorStop(0, 'rgba(0,0,0,0)'); sc.addColorStop(1, 'rgba(0,0,0,.8)'); x.fillStyle = sc; x.fillRect(0, S0 * 0.42, S0, S0 * 0.58);
    const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif", pad = S0 * 0.075, maxW = S0 - pad * 2; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    let fs = S0 * 0.14, lines; for (; fs >= S0 * 0.055; fs -= 4) { x.font = `800 ${fs}px ${FONT}`; lines = wrapText(x, title, maxW); if (lines.length <= 3 && lines.every(l => x.measureText(l).width <= maxW)) break; }
    x.font = `800 ${fs}px ${FONT}`; lines = wrapText(x, title, maxW).slice(0, 3);
    const aSize = S0 * 0.045, lh = fs * 1.08, bottom = S0 - pad; let y = bottom - (artist ? aSize * 2.1 : 0) - (lines.length - 1) * lh;
    x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 14; x.fillStyle = '#fff'; lines.forEach((l, i) => x.fillText(l, pad, y + i * lh)); x.shadowBlur = 0;
    if (artist) { x.fillStyle = hsl(h3, 95, 72); x.fillRect(pad, bottom - aSize * 1.85 + 2, S0 * 0.12, 4); x.font = `700 ${aSize}px ${FONT}`; try { x.letterSpacing = (aSize * 0.18) + 'px'; } catch (_) {} x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(artist.toUpperCase().slice(0, 40), pad, bottom); try { x.letterSpacing = '0px'; } catch (_) {} }
    const out = squareCanvas(c, COVER_PX);
    return { cover: jpegOf(out, 0.9), thumb: squareCanvas(out, THUMB_PX).toDataURL('image/jpeg', 0.75) };
  }

  /* ---------------------------------------------------------------- Editor (Projektformular + eigener Dialog) */
  function editor(host, opt) {
    opt = opt || {}; const p = opt.project || null, t0 = Object.assign(tagsOf(p), opt.isNew ? lastTags() : {}); if (opt.isNew && !t0.year) t0.year = String(new Date().getFullYear());
    const st = { cover: (p && p.cover) || '', thumb: (p && p.thumb) || '', gen: (p && p.coverGen) || null, style: (p && p.coverGen && p.coverGen.style) || 'sun', seed: (p && p.coverGen && p.coverGen.seed) || 0 };
    const uid = 'cv' + Math.random().toString(36).slice(2, 6);
    host.innerHTML = `<div class="cv-ed">
      <div class="cv-row"><div class="cv-prev" data-cv-prev></div><div class="cv-btns">
        <button type="button" class="cv-btn" data-cv="pick">Bild wählen</button><button type="button" class="cv-btn" data-cv="gen">Cover erstellen</button><button type="button" class="cv-btn" data-cv="rm">Entfernen</button></div></div>
      <div class="cv-gen" data-cv-genp hidden><div class="cv-seg" role="radiogroup" aria-label="Stil">${STYLES.map(([k, l]) => `<button type="button" role="radio" data-cv-style="${k}" aria-checked="false">${l}</button>`).join('')}</div>
        <button type="button" class="cv-btn" data-cv="mix">🎲 Neu mischen</button><div class="cv-note">Entsteht aus Titel und Künstler/Produzent – ändern sich diese, wird das Cover neu gesetzt.</div></div>
      <input type="file" accept="image/*" hidden data-cv-file>
      <div class="cv-fields">
        <label>Künstler / Produzent<input type="text" data-t="artist" maxlength="60" autocomplete="off" placeholder="z. B. Sunshine@R"></label>
        <div class="cv-two"><label>Genre<input type="text" data-t="genre" maxlength="40" autocomplete="off" list="${uid}-g" placeholder="z. B. Trance"></label><label>Jahr<input type="text" inputmode="numeric" data-t="year" maxlength="4" placeholder="${new Date().getFullYear()}"></label></div>
        <datalist id="${uid}-g">${GENRES.map(g => `<option value="${esc(g)}">`).join('')}</datalist>
        <label>Album / Single<input type="text" data-t="album" maxlength="60" autocomplete="off" placeholder="optional"></label>
        <label>Komponist<input type="text" data-t="composer" maxlength="60" autocomplete="off" placeholder="optional"></label>
        <label>Label / Copyright<input type="text" data-t="copyright" maxlength="80" autocomplete="off" placeholder="z. B. © ${new Date().getFullYear()} Dein Name"></label>
        <label>Kommentar<textarea data-t="comment" maxlength="300" rows="2" placeholder="Standard: Erstellt mit Sunshine@R DAW Studio"></textarea></label>
        <div class="cv-note">Der Titel ist der Projektname. Tempo (BPM) und Tonart werden beim Export automatisch ergänzt.</div></div></div>`;
    const q = s => host.querySelector(s);
    Object.keys(t0).forEach(k => { const e = q(`[data-t="${k}"]`); if (e) e.value = t0[k] || ''; });
    const title = () => String((opt.getTitle ? opt.getTitle() : (p && p.name)) || '').trim() || 'Ohne Titel', artist = () => q('[data-t=artist]').value.trim();
    function paint() {
      const pv = q('[data-cv-prev]'); pv.innerHTML = st.cover ? `<img src="${st.cover}" alt="Cover-Vorschau">` : '<span aria-hidden="true">♪</span><small>Kein Cover</small>';
      q('[data-cv=rm]').disabled = !st.cover; q('[data-cv-genp]').hidden = !st.gen;
      host.querySelectorAll('[data-cv-style]').forEach(b => { const on = b.dataset.cvStyle === st.style; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); });
    }
    function regen() { const r = generate({ title: title(), artist: artist(), style: st.style, seed: st.seed }); st.cover = r.cover; st.thumb = r.thumb; st.gen = { style: st.style, seed: st.seed }; paint(); }
    let timer = null; const later = () => { if (!st.gen) return; clearTimeout(timer); timer = setTimeout(regen, 450); };
    host.addEventListener('input', e => { if (e.target.matches('[data-t=artist]')) later(); });
    if (opt.titleInput) opt.titleInput.addEventListener('input', later);
    host.addEventListener('click', async e => {
      const b = e.target.closest('[data-cv]'), s = e.target.closest('[data-cv-style]');
      if (s) { st.style = s.dataset.cvStyle; regen(); return; }
      if (!b) return; const a = b.dataset.cv;
      if (a === 'pick') q('[data-cv-file]').click();
      else if (a === 'gen') { st.gen = st.gen || { style: st.style, seed: st.seed }; regen(); }
      else if (a === 'mix') { st.seed = (st.seed || 0) + 1; regen(); }
      else if (a === 'rm') { st.cover = ''; st.thumb = ''; st.gen = null; paint(); }
    });
    q('[data-cv-file]').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const r = await fromFile(f); st.cover = r.cover; st.thumb = r.thumb; st.gen = null; paint(); } catch (err) { say('Das Bild lässt sich nicht öffnen.', 'error'); }
    });
    paint();
    return {
      read() { const tags = {}; host.querySelectorAll('[data-t]').forEach(e => { tags[e.dataset.t] = e.value.trim(); }); return { cover: st.cover, thumb: st.thumb, coverGen: st.gen, tags }; },
      state: st, regen, destroy() { clearTimeout(timer); host.innerHTML = ''; }
    };
  }
  function applyTo(p, d) {
    if (!p || !d) return;
    if (d.cover) { p.cover = d.cover; p.thumb = d.thumb || ''; } else { delete p.cover; delete p.thumb; }
    if (d.coverGen) p.coverGen = d.coverGen; else delete p.coverGen;
    p.tags = Object.assign({}, d.tags || {});
    try { const t = d.tags || {}; localStorage.setItem(LAST, JSON.stringify({ artist: t.artist || '', copyright: t.copyright || '', genre: t.genre || '' })); } catch (_) {}
  }

  /* ---------------------------------------------------------------- Dialog */
  let root = null, ed = null;
  function open() {
    if (root) return; const p = ensureProj(); if (!p) return;
    root = document.createElement('div'); root.id = 'cv-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Cover und Tags');
    root.innerHTML = `<div class="cv-top"><button type="button" class="cv-x" data-cvd="close">Abbrechen</button><h2>Cover &amp; Tags</h2><button type="button" class="cv-x cv-ok" data-cvd="ok">Übernehmen</button></div><div class="cv-body"><div class="cv-ptitle">Titel: <b>${esc(p.name)}</b></div><div data-cvd-host></div></div>`;
    document.body.appendChild(root); ed = editor(root.querySelector('[data-cvd-host]'), { project: p, getTitle: () => p.name });
    root.addEventListener('click', e => { const b = e.target.closest('[data-cvd]'); if (!b) return; if (b.dataset.cvd === 'close') close(); else if (b.dataset.cvd === 'ok') apply(); });
  }
  function close() { if (!root) return; try { ed && ed.destroy(); } catch (_) {} root.remove(); root = null; ed = null; }
  async function apply() {
    const p = ensureProj(); if (!p || !ed) return; applyTo(p, ed.read()); close(); refresh();
    try { document.dispatchEvent(new CustomEvent('sunshine-project-changed')); } catch (_) {}
    try { if (window.Home && Home.saveCurrent) await Home.saveCurrent({ silent: true }); } catch (_) {}
    say('Cover & Tags übernommen.', 'success');
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root) { close(); e.stopPropagation(); } }, true);

  /* ---------------------------------------------------------------- Kopfbereich: Cover + Musik-Effekt rundherum */
  const FX = [['ring', 'Pegel-Ring'], ['dots', 'Punkte'], ['wave', 'Welle'], ['pulse', 'Puls'], ['orbit', 'Lauflicht'], ['frame', 'Rahmen'], ['glow', 'Leuchten'], ['both', 'Ring + Leuchten'], ['flick', 'Flackerlinien'], ['chase', 'Lauflinien'], ['blur', 'Blur-Rand'], ['light', 'Lichtkranz'], ['aura', 'Aura'], ['off', 'Aus']];
  S.reach = clamp(+S.reach || 100, 50, 160); S.bright = clamp(+S.bright || 100, 40, 160); S.trans = clamp(+S.trans || 0, 0, 80);
  const SIZES = { s: [40, 72], m: [52, 96], l: [64, 124] }, SIZES_D = { s: 52, m: 68, l: 84 }, GAINS = { soft: 0.7, norm: 1, hard: 1.4 };
  if (!FX.some(f => f[0] === S.fx)) S.fx = 'ring'; if (!SIZES[S.size]) S.size = 'm'; if (!GAINS[S.gain]) S.gain = 'norm';
  const html = document.documentElement;
  let slot = null, img = null, main = null, lastKey = '', raf = 0, poll = 0, buf = null, PAD = 7, SIZE = 60;
  const previews = new Set(), binds = new Set();
  const lerp = (a, b, t) => a + (b - a) * t;
  function themeCols() {   // Farben des gewählten Designs: Akzent + Zweitfarbe
    const read = n => { try { const v = getComputedStyle(html).getPropertyValue(n).trim().split(/[\s,\/]+/).map(Number); return v.length >= 3 && v.slice(0, 3).every(isFinite) ? v.slice(0, 3) : null; } catch (_) { return null; } };
    return { a: read('--daw-accent') || [255, 138, 26], b: read('--cv-c2') || [56, 189, 248] };
  }
  /* Umriss eines Rechtecks mit runden Ecken als Linienzug; sample(u, off) liefert Punkt + Normale bei Anteil u (0 = unten Mitte, im Uhrzeigersinn → links) */
  function makeGeo(size, pad, R) {
    R = clamp(R, 0, size / 2 - 0.5); const x0 = pad, y0 = pad, x1 = pad + size, y1 = pad + size, cx = pad + size / 2, v = [];
    const line = (x, y, nx, ny) => v.push({ x, y, nx, ny });
    const arc = (ax, ay, a0, a1) => { for (let k = 0; k <= 8; k++) { const a = lerp(a0, a1, k / 8), c = Math.cos(a), s2 = Math.sin(a); v.push({ x: ax + R * c, y: ay + R * s2, nx: c, ny: s2 }); } };
    line(cx, y1, 0, 1); line(x0 + R, y1, 0, 1); arc(x0 + R, y1 - R, Math.PI / 2, Math.PI);
    line(x0, y0 + R, -1, 0); arc(x0 + R, y0 + R, Math.PI, Math.PI * 1.5);
    line(x1 - R, y0, 0, -1); arc(x1 - R, y0 + R, Math.PI * 1.5, Math.PI * 2);
    line(x1, y1 - R, 1, 0); arc(x1 - R, y1 - R, 0, Math.PI / 2); line(cx, y1, 0, 1);
    const cum = [0]; for (let i = 1; i < v.length; i++) cum.push(cum[i - 1] + Math.hypot(v[i].x - v[i - 1].x, v[i].y - v[i - 1].y)); const len = cum[cum.length - 1] || 1;
    return { len, R, size, pad, sample(u, off) {
      u = ((u % 1) + 1) % 1; const t = u * len; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= t) lo = m; else hi = m; }
      const f = (t - cum[lo]) / ((cum[hi] - cum[lo]) || 1), A = v[lo], B = v[hi]; let nx = lerp(A.nx, B.nx, f), ny = lerp(A.ny, B.ny, f); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const x = lerp(A.x, B.x, f), y = lerp(A.y, B.y, f); return { x: x + nx * off, y: y + ny * off, nx, ny, d: Math.abs(u - 0.5) * 2 };
    } };
  }
  /* Ein Effekt-Zeichner: eigener Zustand (Pegel, Bass, Puls-Wellen, Lauflicht) + Zielfläche (Kopfbereich oder Vorschau in den Optionen) */
  function FxView(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); this.spec = new Float32Array(48); this.bass = 0; this.en = 0; this.pulses = []; this.orb = [0.0, 0.5]; this.t0 = 0; this.size = 60; this.pad = 7; this.rad = 10; this.geo = null; this.cols = themeCols(); this.hot = false; this.q = { br: 1, al: 1 }; this.run = 0; this.flk = new Float32Array(64); }
  FxView.prototype.layout = function (size, pad, rad) {
    this.size = size; this.pad = pad; this.rad = rad; this.geo = makeGeo(size, pad, rad); this.cols = themeCols(); const dpr = Math.min(window.devicePixelRatio || 1, 2), w = size + pad * 2;
    this.c.style.width = this.c.style.height = w + 'px'; this.c.width = this.c.height = Math.round(w * dpr); this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  FxView.prototype.feed = function (b, ts, dt, k) {   // b = Frequenzdaten (0–255) oder null → ausklingen
    const sp = this.spec, n = sp.length;
    if (b) {
      for (let i = 0; i < n; i++) { const d = i / (n - 1), bin = 1 + Math.floor(Math.pow(d, 1.35) * (Math.min(b.length, 100) - 2)); const raw = Math.pow(((b[bin] || 0) + (b[bin + 1] || 0)) / 510, 1.25) * 1.25 * (0.78 + d * 0.65) * k, t = clamp(raw, 0, 1); sp[i] = t > sp[i] ? sp[i] + (t - sp[i]) * 0.65 : sp[i] * 0.86; }
      const bs = clamp((((b[1] || 0) + (b[2] || 0) + (b[3] || 0)) / 765) * k, 0, 1), prev = this.bass; this.bass = bs > prev ? prev + (bs - prev) * 0.6 : prev * 0.9;
      if (this.bass > 0.55 && prev < this.bass - 0.04 && (!this.pulses.length || ts - this.pulses[this.pulses.length - 1] > 170)) { this.pulses.push(ts); if (this.pulses.length > 4) this.pulses.shift(); }
    } else { for (let i = 0; i < n; i++) sp[i] *= 0.82; this.bass *= 0.85; }
    let e = 0; for (let i = 0; i < n; i++) e += sp[i]; this.en = lerp(this.en, e / n, 0.3);
    this.orb[0] = (this.orb[0] + dt * (0.1 + this.en * 1.1)) % 1; this.orb[1] = (this.orb[1] + dt * (0.1 + this.en * 1.1)) % 1;
    this.run = (this.run + dt * (0.05 + this.en * 0.8 + this.bass * 0.4)) % 1;
    this.hot = !!b || this.en > 0.015 || this.bass > 0.02 || this.pulses.length > 0;
  };
  FxView.prototype.col = function (d, a, l) {   // Farbe aus Akzent → Zweitfarbe; Helligkeit (q.br) und Transparenz (q.al) aus den Optionen
    const c = this.cols, t = clamp(d, 0, 1), br = this.q.br, f = v => { v = lerp(c.a[v], c.b[v], t) + (l || 0); v = br >= 1 ? v + (255 - v) * (br - 1) : v * br; return Math.round(clamp(v, 0, 255)); };
    return `rgba(${f(0)},${f(1)},${f(2)},${clamp(a * this.q.al, 0, 1).toFixed(3)})`;
  };
  FxView.prototype.rr = function (off) { const g = this.g, p = this.pad - off, s = this.size + off * 2, r = clamp(this.rad + off, 0, s / 2); g.beginPath(); g.moveTo(p + r, p); g.arcTo(p + s, p, p + s, p + s, r); g.arcTo(p + s, p + s, p, p + s, r); g.arcTo(p, p + s, p, p, r); g.arcTo(p, p, p + s, p, r); g.closePath(); };
  FxView.prototype.draw = function (fx, ts, live) {
    const g = this.g, W = this.size + this.pad * 2, sp = this.spec, gap = 2.2, maxL = Math.max(2, this.pad - gap - 0.6), geo = this.geo, big = this.size >= 70, n = big ? 64 : 44;
    this.q = { br: S.bright / 100, al: 1 - S.trans / 100 }; const ws = clamp(this.pad / 7, 0.7, 2.2);
    g.clearRect(0, 0, W, W); if (!geo || fx === 'off') return; const C = this.cols, lv = d => sp[clamp(Math.round(d * (sp.length - 1)), 0, sp.length - 1)];
    const ring = () => { g.lineCap = 'round'; g.lineWidth = Math.max(1.8, geo.len / n * 0.46) * Math.min(ws, 1.5);
      for (let i = 0; i < n; i++) { const p = geo.sample((i + 0.5) / n, gap), v = live ? lv(p.d) : 0, L = 1.3 + v * maxL; g.strokeStyle = this.col(p.d, live ? 0.5 + v * 0.5 : 0.3, v * 40); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.nx * L, p.y + p.ny * L); g.stroke(); } };
    const glow = () => { const k = live ? this.bass : 0.06; g.save(); g.shadowColor = this.col(0.2, 0.35 + k * 0.6); g.shadowBlur = 3 + k * this.pad * 1.7; g.strokeStyle = this.col(0.1, 0.35 + k * 0.55); g.lineWidth = 1.6; this.rr(1); g.stroke(); g.shadowColor = this.col(0.9, 0.25 + k * 0.5); g.shadowBlur = 2 + k * this.pad; g.strokeStyle = this.col(0.9, 0.12 + k * 0.4); g.lineWidth = 1; this.rr(2.5); g.stroke(); g.restore(); };
    if (fx === 'ring') ring();
    else if (fx === 'glow') glow();
    else if (fx === 'both') { glow(); ring(); }
    else if (fx === 'dots') { for (let i = 0; i < n; i++) { const p = geo.sample((i + 0.5) / n, gap + 1), v = live ? lv(p.d) : 0, L = v * (maxL - 1.2); g.fillStyle = this.col(p.d, live ? 0.45 + v * 0.55 : 0.28, v * 40); g.beginPath(); g.arc(p.x + p.nx * L, p.y + p.ny * L, 1 + v * 1.5, 0, 6.2832); g.fill(); } }
    else if (fx === 'wave') {
      const m = 72, off = []; for (let i = 0; i < m; i++) { const d = Math.abs((i + 0.5) / m - 0.5) * 2; off.push(live ? lv(d) : 0); } const sm = off.map((v, i) => (off[(i + m - 1) % m] + v * 2 + off[(i + 1) % m]) / 4);
      const pts = sm.map((v, i) => geo.sample((i + 0.5) / m, gap + 0.5 + v * (maxL - 0.5))); g.lineJoin = 'round';
      const path = () => { g.beginPath(); const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2]; let s0 = mid(pts[m - 1], pts[0]); g.moveTo(s0[0], s0[1]); for (let i = 0; i < m; i++) { const q = pts[i], e = mid(q, pts[(i + 1) % m]); g.quadraticCurveTo(q.x, q.y, e[0], e[1]); } g.closePath(); };
      path(); g.strokeStyle = this.col(0.1, 0.22 + this.en * 0.3); g.lineWidth = 4; g.stroke(); path(); let st = this.col(0.2, live ? 0.9 : 0.4); try { if (g.createConicGradient) { const cg = g.createConicGradient(ts / 2500, W / 2, W / 2); cg.addColorStop(0, this.col(0, 1)); cg.addColorStop(0.5, this.col(1, 1)); cg.addColorStop(1, this.col(0, 1)); st = cg; } } catch (_) {} g.strokeStyle = st; g.globalAlpha = live ? 0.95 : 0.45; g.lineWidth = 1.8; g.stroke(); g.globalAlpha = 1;
    } else if (fx === 'pulse') {
      g.lineWidth = 1.6; if (!live || !this.pulses.length) { g.strokeStyle = this.col(0.1, 0.25); this.rr(gap); g.stroke(); }
      this.pulses.forEach(t0 => { const t = clamp((ts - t0) / 650, 0, 1), e = 1 - Math.pow(1 - t, 2); g.strokeStyle = this.col(t, (1 - t) * 0.95); g.lineWidth = 2.2 - t * 1.2; this.rr(gap + e * (maxL - 0.4)); g.stroke(); });
      this.pulses = this.pulses.filter(t0 => ts - t0 < 650);
    } else if (fx === 'orbit') {
      const T = 22; this.orb.forEach((u0, k) => { for (let j = T; j >= 0; j--) { const u = u0 - j * 0.0075, p = geo.sample(u, gap + 1.4), a = Math.pow(1 - j / T, 2) * (live ? 0.95 : 0.45); g.fillStyle = this.col(k, a); g.beginPath(); g.arc(p.x, p.y, (j === 0 ? 2.1 : 1.7 - j / T * 1.1) + this.en * (j === 0 ? 1.6 : 0.6), 0, 6.2832); g.fill(); } });
    } else if (fx === 'frame') {
      const lw = 1.6 + (live ? this.en * 1.5 + this.bass * 1.2 : 0) * (maxL - 1), off = gap - 0.6 + lw / 2; let st = this.col(0, 0.8);
      try { if (g.createConicGradient) { const cg = g.createConicGradient(ts / 1400, W / 2, W / 2); cg.addColorStop(0, this.col(0, 0.95)); cg.addColorStop(0.33, this.col(1, 0.95)); cg.addColorStop(0.66, this.col(0.5, 0.9)); cg.addColorStop(1, this.col(0, 0.95)); st = cg; } } catch (_) {}
      g.strokeStyle = st; g.globalAlpha = live ? 1 : 0.45; g.lineWidth = lw; this.rr(off); g.stroke(); g.globalAlpha = 1;
    } else if (fx === 'flick' || fx === 'chase' || fx === 'blur' || fx === 'light' || fx === 'aura') {
      /* Neue Effekte: zeichnen nur außerhalb des Covers (Aussparung), damit das Bild nie überdeckt wird */
      const hit = live && this.pulses.length && ts - this.pulses[this.pulses.length - 1] < 60, en = live ? this.en : 0, bs = live ? this.bass : 0;
      g.save(); g.beginPath(); g.rect(0, 0, W, W); { const p0 = this.pad, s0 = this.size, r0 = clamp(this.rad, 0, s0 / 2); g.moveTo(p0 + r0, p0); g.arcTo(p0 + s0, p0, p0 + s0, p0 + s0, r0); g.arcTo(p0 + s0, p0 + s0, p0, p0 + s0, r0); g.arcTo(p0, p0 + s0, p0, p0, r0); g.arcTo(p0, p0, p0 + s0, p0, r0); g.closePath(); } g.clip('evenodd');
      if (fx === 'flick') {   // dünne Linien, die im Takt aufblitzen und flackern
        const m = big ? 56 : 40; g.lineCap = 'butt';
        for (let i = 0; i < m; i++) { const p = geo.sample((i + 0.5) / m, gap), v = live ? lv(p.d) : 0; let f = this.flk[i] || 0; if (hit && Math.random() < 0.38) f = 1; f *= 0.82; this.flk[i] = f;
          const tw = live ? (Math.sin(ts / (55 + (i % 7) * 17) + i * 1.9) > 0.35 ? 1 : 0.35) : 0.25, L = 1.4 + (v * 0.7 + f * 0.9) * maxL, a = live ? clamp(0.18 + v * 0.45 + f * 0.7, 0, 1) * tw : 0.2;
          g.strokeStyle = this.col(p.d, a, f * 50); g.lineWidth = 1.05 * Math.min(ws, 1.6) + f * 0.7; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.nx * L, p.y + p.ny * L); g.stroke(); }
      } else if (fx === 'chase') {   // Linienstücke laufen um das Cover, schneller bei mehr Energie
        g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = this.col(0.1, live ? 0.16 : 0.12); g.lineWidth = 1; this.rr(gap + 1.3); g.stroke();
        const G = 4, len = 0.07 + bs * 0.09 + en * 0.05;
        for (let k = 0; k < G; k++) { const dir = k % 2 ? -1 : 1, u0 = this.run * dir * 1.4 + k / G, steps = 14; g.beginPath(); for (let j = 0; j <= steps; j++) { const q = geo.sample(u0 + (j / steps) * len, gap + 1.3 + (k % 2) * 1.6); if (j) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }
          g.strokeStyle = this.col(k / (G - 1), live ? 0.55 + bs * 0.4 : 0.4, bs * 40); g.lineWidth = (1.5 + bs * 1.2) * Math.min(ws, 1.5); g.stroke(); }
      } else if (fx === 'blur') {   // weicher, unscharfer Lichtsaum, der mit dem Bass „atmet“
        const k = live ? 0.28 + bs * 0.7 + en * 0.3 : 0.22; g.lineJoin = 'round';
        [[1.0, 0.5, 0.15], [0.6, 0.65, 0.5], [0.28, 0.9, 0.85]].forEach(([bl, al, cd]) => { g.save(); g.shadowColor = this.col(cd, al * k * 1.3); g.shadowBlur = Math.min(this.pad * 1.15, this.pad * bl * (0.5 + k)); g.strokeStyle = this.col(cd, al * k); g.lineWidth = 1.2 + bl * this.pad * 0.55; this.rr(gap * 0.6 + bl * 0.8); g.stroke(); g.restore(); });
      } else if (fx === 'light') {   // wandernde Lichtflecken (Spotlights) am Rand
        g.globalCompositeOperation = 'lighter'; const N = 3;
        for (let k = 0; k < N; k++) { const u = this.run * (k % 2 ? -0.7 : 0.9) + k / N, p = geo.sample(u, this.pad * 0.5), r = this.pad * 0.62 * (1 + bs * 0.3 + en * 0.15), rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r), a = live ? 0.4 + bs * 0.55 + en * 0.3 : 0.32;
          rg.addColorStop(0, this.col(k / (N - 1), a)); rg.addColorStop(0.5, this.col(k / (N - 1), a * 0.3)); rg.addColorStop(1, this.col(k / (N - 1), 0)); g.fillStyle = rg; g.fillRect(p.x - r, p.y - r, r * 2, r * 2); }
        g.globalCompositeOperation = 'source-over'; g.strokeStyle = this.col(0.2, live ? 0.3 : 0.2); g.lineWidth = 1; this.rr(gap - 0.4); g.stroke();
      } else if (fx === 'aura') {   // mehrere weiche Schichten, die nach außen schwingen
        for (let j = 0; j < 3; j++) { const k = live ? 0.16 + en * 0.45 + bs * 0.35 : 0.1, off = gap + j * (maxL / 3.2) * (0.8 + bs * 0.5), a = k * (1 - j * 0.28); g.save(); g.shadowColor = this.col(j / 2, a); g.shadowBlur = this.pad * 0.55; g.strokeStyle = this.col(j / 2, a); g.lineWidth = Math.max(1.4, maxL / 2.1) * (1 + bs * 0.5); this.rr(off); g.stroke(); g.restore(); }
        this.pulses.forEach(t0 => { const t = clamp((ts - t0) / 700, 0, 1); g.strokeStyle = this.col(t, (1 - t) * 0.6); g.lineWidth = 2.4 * (1 - t) + 0.6; this.rr(gap + t * maxL); g.stroke(); }); this.pulses = this.pulses.filter(t0 => ts - t0 < 700);
      }
      g.restore();
    }
  };
  /* Beispiel-Spektrum für die Vorschau (ohne laufende Musik): Bass-Schläge im 120-BPM-Takt, wandernde Mitten, Hi-Hats */
  const demoBuf = new Uint8Array(128);
  function synth(ts) { const t = ts / 1000, kick = Math.pow(1 - ((t * 2) % 1), 3), hat = Math.pow(1 - (((t * 4) + 0.5) % 1), 4); for (let i = 0; i < 128; i++) { const lo = Math.max(0, 1 - i / 34) * kick, mid = (0.5 + 0.5 * Math.sin(t * 2.6 + i * 0.33)) * 0.55 * Math.max(0, 1 - i / 100), hi = i > 55 ? hat * 0.6 : 0; demoBuf[i] = Math.round(255 * clamp(lo + mid + hi, 0, 1)); } return demoBuf; }

  const playing = () => { try { return typeof dawState !== 'undefined' && dawState.isPlaying; } catch (_) { return false; } };
  const analyser = () => { try { return audioEngine && audioEngine.masterAnalyser; } catch (_) { return null; } };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  /* Größe als Variablen auf <body> (nicht auf <html>): so löst das Messen keine Beobachter an <html> aus – keine Dauerschleife */
  function setSize(sz) { SIZE = sz; const st = document.body.style; if (st.getPropertyValue('--cv') !== sz + 'px') st.setProperty('--cv', sz + 'px'); if (st.getPropertyValue('--cvp') !== PAD + 'px') st.setProperty('--cvp', PAD + 'px'); }
  const padCls = on => { const c = document.body.classList; if (c.contains('cv-pad') !== on) c.toggle('cv-pad', on); };
  /* Größe wählen: Wunschgröße, aber so, dass das Cover keine Knöpfe/Texte im Kopfbereich überdeckt (Layout ist je Gerät/Ausrichtung anders) */
  function collides() {
    const h = document.querySelector('header.sticky'); if (!h || !slot) return false; const r = slot.getBoundingClientRect(), L = r.left + PAD - 2, R = r.right - PAD + 2, T = r.top + PAD - 2, B = r.bottom - PAD + 2;
    const els = h.querySelectorAll('button,img,h1,input,select,a,[role=button],.font-mono');
    for (const e of els) { if (e === slot || slot.contains(e)) continue; const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue; if (q.right > L && q.left < R && q.bottom > T && q.top < B) return true; }
    return false;
  }
  function metrics() {
    const w = window.innerWidth || 400, wide = w >= 640; PAD = clamp(Math.round((wide ? 12 : 7) * S.reach / 100), 4, wide ? 16 : 10); const dk = !wide && html.classList.contains('tp-dock'), want = dk ? SIZES_D[S.size] : SIZES[S.size][wide ? 1 : 0], ladder = wide ? [124, 96, 84, 72, 60, 52, 44] : (dk ? [88, 80, 72, 64, 56, 48, 44, 40, 36] : [76, 64, 56, 52, 46, 40, 36]), cand = [want].concat(ladder.filter(v => v < want));
    padCls(false); let okSize = 0;
    if (slot && !slot.hidden) { for (const sz of cand) { setSize(sz); if (!collides()) { okSize = sz; break; } } if (!okSize) { setSize(wide ? 60 : 36); padCls(true); } } else setSize(want);
  }
  function ensureSlot() {
    if (slot && slot.isConnected) return true; const h = document.querySelector('header.sticky'); if (!h) return false;
    slot = document.createElement('button'); slot.type = 'button'; slot.id = 'cv-slot'; slot.setAttribute('aria-label', 'Cover und Tags bearbeiten');
    slot.innerHTML = '<canvas class="cv-fx" aria-hidden="true"></canvas><span class="cv-box"><img alt="" class="cv-img"><span class="cv-ph" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><small>Cover</small></span></span>';
    h.appendChild(slot); img = slot.querySelector('.cv-img'); main = new FxView(slot.querySelector('.cv-fx')); slot.addEventListener('click', open); return true;
  }
  const boxRadius = box => { try { return parseFloat(getComputedStyle(box).borderTopLeftRadius) || 10; } catch (_) { return 10; } };
  function refresh() {
    binds.forEach(b => b.refresh());
    if (!ensureSlot()) return; const p = proj(), on = S.show !== false;
    if (html.classList.contains('cv-show') !== on) html.classList.toggle('cv-show', on); slot.hidden = !on; if (!on) { padCls(false); return; } metrics();
    const c = p && p.cover ? p.cover : ''; slot.classList.toggle('has', !!c);
    if (c) { if (img.getAttribute('src') !== c) img.src = c; } else img.removeAttribute('src');
    slot.title = c ? 'Cover & Tags bearbeiten' : 'Cover hinzufügen';
    main.layout(SIZE, PAD, boxRadius(slot.querySelector('.cv-box'))); main.draw(S.fx, performance.now(), false); wake();
    previews.forEach(pv => pv.refresh && pv.refresh());
  }
  let lastTs = 0;
  function frame(ts) {
    raf = 0; const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0.016; if (ts - lastTs < 28) { raf = requestAnimationFrame(frame); return; } lastTs = ts; let keep = false;
    const k = GAINS[S.gain], an = analyser(), pl = playing();
    if (slot && !slot.hidden && main && main.geo && S.fx !== 'off') {
      let b = null; if (pl && an && !reduced()) { if (!buf || buf.length !== an.frequencyBinCount) buf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(buf); b = buf; }
      main.feed(b, ts, dt, k); if (pl || main.hot) { main.draw(S.fx, ts, pl || main.hot); keep = true; } else main.draw(S.fx, ts, false);
    }
    previews.forEach(pv => { if (!pv.c.isConnected) { previews.delete(pv); return; } if (!pv.c.offsetParent) return; pv.feed(reduced() ? null : synth(ts), ts, dt, k); pv.draw(pv.fx || S.fx, ts, true); keep = true; });
    binds.forEach(bd => {   // eingebundene Cover (z. B. im Player): Daten und „läuft“-Zustand liefert der Aufrufer
      if (!bd.el.isConnected) { binds.delete(bd); return; } if (!bd.el.offsetParent || !bd.v.geo || S.fx === 'off') return;
      const lv = bd.isLive(), d = lv && !reduced() ? bd.getData() : null; bd.v.feed(d, ts, dt, k);
      if (lv || bd.v.hot) { bd.v.draw(S.fx, ts, true); keep = true; } else bd.v.draw(S.fx, ts, false);
    });
    if (keep && !document.hidden) raf = requestAnimationFrame(frame); else lastTs = 0;
  }
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function start() {
    refresh();
    poll = setInterval(() => { const p = proj(), k = p ? (p.id || '') + ':' + (p.cover ? p.cover.length : 0) : ''; if (k !== lastKey) { lastKey = k; refresh(); } if (playing() || previews.size || [...binds].some(b => b.isLive())) wake(); }, 500);
    document.addEventListener('sunshine-project-changed', () => { lastKey = ''; setTimeout(refresh, 30); });
    window.addEventListener('resize', () => { clearTimeout(start._t); start._t = setTimeout(refresh, 120); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    document.addEventListener('sunshine-tpdock', () => setTimeout(refresh, 80));
    try { const h = document.querySelector('header.sticky'); if (h && window.ResizeObserver) { let hh = 0; new ResizeObserver(() => { const nh = Math.round(h.getBoundingClientRect().height); if (nh !== hh) { hh = nh; clearTimeout(start._r); start._r = setTimeout(refresh, 150); } }).observe(h); } } catch (_) {}
    try { new MutationObserver(() => setTimeout(refresh, 60)).observe(html, { attributes: true, attributeFilter: ['data-theme', 'data-accent', 'data-glow', 'style'] }); } catch (_) {}
  }

  /* ---------------------------------------------------------------- Tags einbetten (Export) */
  const te = new TextEncoder();
  const ascii = s => Array.from(String(s)).map(c => c.charCodeAt(0) & 127);
  const u32be = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255], u32le = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const ss = n => [(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127];
  const utf16 = s => { const o = [0xFF, 0xFE]; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); o.push(c & 255, c >> 8); } return o; };
  const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function keyShort() { try { const r = dawState.midiRoot | 0, sc = String(dawState.midiScale || ''); return NOTE[((r % 12) + 12) % 12] + (/minor|moll|aeol|dorian|phryg/i.test(sc) ? 'm' : ''); } catch (_) { return ''; } }
  function keyLong() { try { return window.Home && Home.keyLabel ? Home.keyLabel(dawState.midiRoot, dawState.midiScale) : keyShort(); } catch (_) { return keyShort(); } }
  /* Alle Angaben für eine Datei; extra = { title, track, total, comment } überschreibt Einzelnes (z. B. Stem-Namen) */
  async function exportMeta(extra) {
    extra = extra || {}; const p = proj(); if (!p || !hasTags()) return null; const t = tagsOf(p);
    const m = { title: extra.title || p.name || 'Sunshine@R', artist: t.artist, album: t.album, genre: t.genre, year: t.year || String(new Date().getFullYear()), composer: t.composer, copyright: t.copyright, publisher: '',
      comment: extra.comment || t.comment || 'Erstellt mit Sunshine@R DAW Studio', bpm: (typeof dawState !== 'undefined' && dawState.bpm) || 0, key: keyShort(), keyLong: keyLong(), track: extra.track || 0, total: extra.total || 0, cover: null, coverSmall: null, software: 'Sunshine@R DAW Studio' };
    if (p.cover) { m.cover = b64bytes(p.cover); try { m.coverSmall = b64bytes(await resized(p.cover, SMALL_PX, 0.7)); } catch (_) { m.coverSmall = m.cover; } }
    return m;
  }
  function textFrame(id, s) { const d = [1, ...utf16(String(s)), 0, 0]; return [...ascii(id), ...u32be(d.length), 0, 0, ...d]; }
  function id3(m) {
    const fr = [];
    const T = (id, v) => { if (v !== '' && v != null && v !== 0) fr.push(textFrame(id, v)); };
    T('TIT2', m.title); T('TPE1', m.artist); T('TALB', m.album); T('TCON', m.genre); T('TYER', m.year); T('TCOM', m.composer); T('TCOP', m.copyright); T('TPUB', m.publisher); T('TBPM', m.bpm ? Math.round(m.bpm) : ''); T('TKEY', m.key); T('TSSE', m.software);
    if (m.track) T('TRCK', m.total ? m.track + '/' + m.total : String(m.track));
    const comm = [1, ...ascii('deu'), 0xFF, 0xFE, 0, 0, ...utf16(m.comment + (m.keyLong ? ' · Tonart: ' + m.keyLong : '') + (m.bpm ? ' · ' + Math.round(m.bpm) + ' BPM' : '')), 0, 0]; fr.push([...ascii('COMM'), ...u32be(comm.length), 0, 0, ...comm]);
    if (m.cover) { const d = [0, ...ascii('image/jpeg'), 0, 3, 0]; const len = d.length + m.cover.length; fr.push({ head: [...ascii('APIC'), ...u32be(len), 0, 0], pre: d, data: m.cover }); }
    const parts = []; let size = 0; fr.forEach(f => { if (Array.isArray(f)) { parts.push(new Uint8Array(f)); size += f.length; } else { parts.push(new Uint8Array(f.head), new Uint8Array(f.pre), f.data); size += f.head.length + f.pre.length + f.data.length; } });
    return new Blob([new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, ...ss(size)]), ...parts]);
  }
  function infoChunk(m) {
    const subs = []; const add = (id, v) => { if (!v) return; const b = te.encode(String(v)), n = b.length + 1, pad = n & 1; const a = new Uint8Array(8 + n + pad); a.set(ascii(id)); a.set(u32le(n), 4); a.set(b, 8); subs.push(a); };
    add('INAM', m.title); add('IART', m.artist); add('IPRD', m.album); add('IGNR', m.genre); add('ICRD', m.year); add('ICMT', m.comment); add('ICOP', m.copyright); add('IENG', m.composer); add('ISFT', m.software);
    const n = 4 + subs.reduce((s, a) => s + a.length, 0), head = new Uint8Array([...ascii('LIST'), ...u32le(n), ...ascii('INFO')]); return new Blob([head, ...subs]);
  }
  /* WAV: RIFF-Größe anpassen, LIST/INFO und „id3 “-Block hinten anhängen (die Audiodaten bleiben unverändert) */
  function tagWav(blob, m) {
    if (!m || !blob) return blob; const parts = [], info = infoChunk(m), t3 = id3(m); const pad1 = blob.size & 1 ? [new Uint8Array(1)] : [];
    const c3 = new Blob([new Uint8Array([...ascii('id3 '), ...u32le(t3.size)]), t3, ...(t3.size & 1 ? [new Uint8Array(1)] : [])]);
    const total = blob.size + pad1.length + info.size + c3.size; return new Blob([blob.slice(0, 4), new Uint8Array(u32le(total - 8)), blob.slice(8), ...pad1, info, c3], { type: 'audio/wav' });
  }
  function pictureBlock(jpeg) { const mime = ascii('image/jpeg'); return new Blob([new Uint8Array([...u32be(3), ...u32be(mime.length), ...mime, ...u32be(0), ...u32be(SMALL_PX), ...u32be(SMALL_PX), ...u32be(24), ...u32be(0), ...u32be(jpeg.length)]), jpeg]); }
  async function opusTags(m) {   // Inhalt des „OpusTags“-Pakets (Vorbis-Kommentare, Cover als METADATA_BLOCK_PICTURE)
    const vendor = te.encode('Sunshine@R DAW Studio'), list = []; const add = (k, v) => { if (v) list.push(te.encode(k + '=' + v)); };
    if (m) { add('TITLE', m.title); add('ARTIST', m.artist); add('ALBUM', m.album); add('GENRE', m.genre); add('DATE', m.year); add('COMPOSER', m.composer); add('COPYRIGHT', m.copyright); add('COMMENT', m.comment); add('BPM', m.bpm ? String(Math.round(m.bpm)) : ''); add('INITIALKEY', m.key); if (m.track) add('TRACKNUMBER', String(m.track));
      if (m.coverSmall) { const pb = new Uint8Array(await pictureBlock(m.coverSmall).arrayBuffer()); let s = ''; for (let i = 0; i < pb.length; i += 0x8000) s += String.fromCharCode.apply(null, pb.subarray(i, i + 0x8000)); add('METADATA_BLOCK_PICTURE', btoa(s)); } }
    const total = 8 + 4 + vendor.length + 4 + list.reduce((s, b) => s + 4 + b.length, 0), out = new Uint8Array(total); out.set(ascii('OpusTags')); let o = 8; out.set(u32le(vendor.length), o); o += 4; out.set(vendor, o); o += vendor.length; out.set(u32le(list.length), o); o += 4;
    list.forEach(b => { out.set(u32le(b.length), o); o += 4; out.set(b, o); o += b.length; }); return out;
  }
  function fileBase() {
    const p = proj(); if (!p || !hasTags()) return ''; const t = tagsOf(p), safe = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim().slice(0, 50);
    return safe((t.artist ? t.artist + ' - ' : '') + (p.name || 'Song')) || '';
  }
  function coverBytes() { const p = proj(); return p && p.cover ? b64bytes(p.cover) : null; }

  /* ---------------------------------------------------------------- Optionen */
  function section(ph) {
    const chips = FX.map(([k, l]) => `<button type="button" role="radio" data-cv-fxv="${k}" aria-checked="false">${l}</button>`).join('');
    ph.innerHTML = `<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-1">Cover &amp; Tags</div><div class="rounded-xl border border-slate-800 p-3 space-y-3">
      <label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" data-cv-show class="mt-1 w-5 h-5 shrink-0"><span class="min-w-0"><span class="block text-sm font-semibold">Cover im Kopfbereich anzeigen</span><span class="block text-[11px] leading-4 text-slate-400">Oben rechts; Antippen öffnet Cover &amp; Tags. Rahmen, Rundung und Farben folgen dem gewählten Design.</span></span></label>
      <div><div class="text-sm font-semibold mb-1.5">Größe</div><div class="cv-seg2" role="radiogroup" aria-label="Größe des Covers">${[['s', 'Klein'], ['m', 'Mittel'], ['l', 'Groß']].map(([k, l]) => `<button type="button" role="radio" data-cv-size="${k}" aria-checked="false">${l}</button>`).join('')}</div></div>
      <div><div class="text-sm font-semibold mb-1.5">Musik-Effekt am Rand</div><div class="cv-pvrow"><div class="cv-pv" data-cv-pv><canvas class="cv-fx" aria-hidden="true"></canvas><span class="cv-box"><img alt="" class="cv-img"><span class="cv-ph" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span></span></div>
        <div class="cv-chips" role="radiogroup" aria-label="Effekt">${chips}</div></div><div class="text-[11px] leading-4 text-slate-400 mt-1">Die Vorschau läuft mit einem Beispiel-Beat. Der Effekt liegt immer um das Bild herum – das Cover bleibt frei.</div></div>
      <div><div class="text-sm font-semibold mb-1.5">Stärke</div><div class="cv-seg2" role="radiogroup" aria-label="Stärke des Effekts">${[['soft', 'Dezent'], ['norm', 'Normal'], ['hard', 'Kräftig']].map(([k, l]) => `<button type="button" role="radio" data-cv-gain="${k}" aria-checked="false">${l}</button>`).join('')}</div></div>
      <div class="cv-rngs">${[['reach', 'Größe des Effekts', 50, 160, '%'], ['bright', 'Helligkeit', 40, 160, '%'], ['trans', 'Transparenz', 0, 80, '%']].map(([k, l, a, b, u]) => `<label class="cv-rng"><span class="cv-rl"><b>${l}</b><output data-cv-out="${k}"></output></span><input type="range" data-cv-rng="${k}" min="${a}" max="${b}" step="5" aria-label="${l}"></label>`).join('')}<button type="button" class="cv-rst" data-cv-reset>Zurücksetzen</button></div>
      <button type="button" data-cv-edit class="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200">Cover &amp; Tags bearbeiten</button></div>`;
    const a = ph.querySelector('[data-cv-show]'), pvEl = ph.querySelector('[data-cv-pv]'), cvs = pvEl.querySelector('canvas'), pimg = pvEl.querySelector('.cv-img');
    const pv = new FxView(cvs);
    pv.refresh = () => { const p = proj(); const c = (p && p.cover) || ''; pvEl.classList.toggle('has', !!c); if (c) { if (pimg.getAttribute('src') !== c) pimg.src = c; } else pimg.removeAttribute('src'); pv.fx = S.fx; const pp = clamp(Math.round(12 * S.reach / 100), 6, 16); pvEl.style.setProperty('--cvp', pp + 'px'); pvEl.style.width = pvEl.style.height = (72 + pp * 2) + 'px'; pv.layout(72, pp, boxRadius(pvEl.querySelector('.cv-box'))); pv.draw(S.fx, performance.now(), false); };
    const mark = () => { a.checked = S.show !== false; ph.querySelectorAll('[data-cv-fxv]').forEach(b => { const on = b.dataset.cvFxv === S.fx; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); }); ph.querySelectorAll('[data-cv-size]').forEach(b => { const on = b.dataset.cvSize === S.size; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); }); ph.querySelectorAll('[data-cv-gain]').forEach(b => { const on = b.dataset.cvGain === S.gain; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); }); ph.querySelectorAll('[data-cv-rng]').forEach(r => { const k = r.dataset.cvRng; if (+r.value !== S[k]) r.value = S[k]; const o = ph.querySelector('[data-cv-out="' + k + '"]'); if (o) o.textContent = S[k] + ' %'; }); };
    mark(); previews.add(pv); setTimeout(() => { pv.refresh(); wake(); }, 60);
    ph.addEventListener('change', e => { if (e.target === a) { S.show = a.checked; saveS(); refresh(); } });
    ph.addEventListener('input', e => { const r = e.target.closest && e.target.closest('[data-cv-rng]'); if (!r) return; S[r.dataset.cvRng] = +r.value; mark(); clearTimeout(ph._sv); ph._sv = setTimeout(saveS, 250); pv.refresh(); refresh(); wake(); });
    ph.addEventListener('click', e => {
      const f = e.target.closest('[data-cv-fxv]'), z = e.target.closest('[data-cv-size]'), g2 = e.target.closest('[data-cv-gain]');
      if (f) { S.fx = f.dataset.cvFxv; pv.fx = S.fx; } else if (z) S.size = z.dataset.cvSize; else if (g2) S.gain = g2.dataset.cvGain;
      if (e.target.closest('[data-cv-reset]')) { S.reach = 100; S.bright = 100; S.trans = 0; saveS(); mark(); pv.refresh(); refresh(); wake(); return; }
      if (f || z || g2) { saveS(); mark(); refresh(); wake(); return; }
      if (e.target.closest('[data-cv-edit]')) { const m = $('settings-modal'); if (m) m.remove(); open(); }
    });
  }
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; const ph = n.id === 'cv-sec' ? n : (n.querySelector && n.querySelector('#cv-sec')); if (ph && !ph.dataset.done) { ph.dataset.done = '1'; section(ph); } }); }).observe(document.body || document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* Cover mit Effekt an beliebiger Stelle (Player): gleiche Rahmen-/Randgestaltung wie im Kopfbereich, Daten liefert der Aufrufer.
     o = { size, data: () => Uint8Array|null (Frequenzdaten), live: () => bool }.  Rückgabe: { el, set(src, label), size(px), refresh(), wake(), destroy() } */
  const PH_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  function bind(host, o) {
    o = o || {}; const el = document.createElement('div'); el.className = 'cv-pv cv-b'; el.innerHTML = '<canvas class="cv-fx" aria-hidden="true"></canvas><span class="cv-box"><img alt="" class="cv-img"><span class="cv-ph" aria-hidden="true">' + PH_SVG + '</span></span>';
    host.appendChild(el); const im = el.querySelector('.cv-img'), v = new FxView(el.querySelector('canvas'));
    const bd = { el, v, px: o.size || 150, src: '', isLive: () => { try { return !!(o.live && o.live()); } catch (_) { return false; } }, getData: () => { try { return o.data ? o.data() : null; } catch (_) { return null; } } };
    const padOf = px => clamp(Math.round(px * 0.1 * S.reach / 100), 5, 26);
    bd.refresh = () => { const pad = padOf(bd.px), w = bd.px + pad * 2; el.style.setProperty('--cv', bd.px + 'px'); el.style.setProperty('--cvp', pad + 'px'); el.style.width = el.style.height = w + 'px'; el.style.minWidth = el.style.minHeight = '0'; v.layout(bd.px, pad, boxRadius(el.querySelector('.cv-box'))); v.draw(S.fx, performance.now(), false); };
    bd.set = src => { src = src || ''; if (src === bd.src) return; bd.src = src; el.classList.toggle('has', !!src); if (src) im.src = src; else im.removeAttribute('src'); };
    bd.size = px => { px = Math.round(px); if (px !== bd.px && px > 20) { bd.px = px; bd.refresh(); } };
    bd.wake = wake; bd.destroy = () => { binds.delete(bd); el.remove(); };
    binds.add(bd); bd.refresh(); return bd;
  }
  window.Cover = { bind, open, close, editor, generate, fromFile, applyTo, exportMeta, tagWav, id3, opusTags, fileBase, coverBytes, hasTags, tagsOf, refresh, settings: () => Object.assign({}, S), set: (k, v) => { S[k] = v; saveS(); refresh(); wake(); }, styles: STYLES, effects: FX, slot: () => slot, view: () => main, resized, keyShort, SMALL_PX, makeGeo };
})();
