    /* ===== SoundFont (.sf2) Import & Wiedergabe =====
       Eigener, abhängigkeitsfreier SF2-Player: parst die Datei, speichert sie in IndexedDB (bleibt nach Neustart erhalten)
       und spielt die Samples per Web Audio ab (Key-/Velocity-Zonen, Root-Key, Stimmung, Loop, Volume-Hüllkurve,
       Filter, Pan). SF3 (komprimiert) wird nicht unterstützt. */
    const SF_LIB = { fonts: {}, listPromise: null, warned: {} };

    function sfOpenDb() { return SunIDB.open('fonts'); }
    const sfReq = SunIDB.req, sfTxDone = SunIDB.done;

    function sfListInstalled() {
      if (!SF_LIB.listPromise) {
        SF_LIB.listPromise = (async () => {
          const db = await sfOpenDb();
          const all = await sfReq(db.transaction('meta').objectStore('meta').getAll());
          all.forEach(m => { if (!SF_LIB.fonts[m.id]) SF_LIB.fonts[m.id] = { meta: m, parsed: null, loading: null }; });
          return all;
        })().catch(err => { SF_LIB.listPromise = null; throw err; });
      }
      return SF_LIB.listPromise;
    }
    async function sfSaveFont(meta, buf) {
      const db = await sfOpenDb();
      const tx = db.transaction(['meta', 'data'], 'readwrite');
      tx.objectStore('meta').put(meta);
      tx.objectStore('data').put(buf, meta.id);
      await sfTxDone(tx);
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {}
    }
    async function sfDeleteFont(id) {
      const db = await sfOpenDb();
      const tx = db.transaction(['meta', 'data'], 'readwrite');
      tx.objectStore('meta').delete(id);
      tx.objectStore('data').delete(id);
      await sfTxDone(tx);
      delete SF_LIB.fonts[id];
    }

    function sfParse(buf) {
      const dv = new DataView(buf);
      const u32 = o => dv.getUint32(o, true), u16 = o => dv.getUint16(o, true), s16 = o => dv.getInt16(o, true);
      const tag = o => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
      const str = (o, n) => { let s = ''; for (let i = 0; i < n; i++) { const c = dv.getUint8(o + i); if (!c) break; s += String.fromCharCode(c); } return s.trim(); };
      if (buf.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'sfbk') throw new Error('Keine gültige SoundFont-Datei (RIFF/sfbk fehlt).');
      let smplOff = -1, smplLen = 0, major = 2;
      const pd = {};
      let pos = 12;
      const end = Math.min(buf.byteLength, 8 + u32(4));
      while (pos + 8 <= end) {
        const id = tag(pos), size = u32(pos + 4), body = pos + 8;
        if (id === 'LIST') {
          const type = tag(body); let p = body + 4; const lend = Math.min(end, body + size);
          while (p + 8 <= lend) {
            const cid = tag(p), csz = u32(p + 4), cb = p + 8;
            if (type === 'sdta' && cid === 'smpl') { smplOff = cb; smplLen = csz; }
            else if (type === 'pdta') pd[cid] = { off: cb, len: csz };
            else if (type === 'INFO' && cid === 'ifil') major = u16(cb);
            p = cb + csz + (csz & 1);
          }
        }
        pos = body + size + (size & 1);
      }
      const isSf3 = major >= 3;
      if (isSf3 && !SpessaEngine.sf3Supported()) throw new Error('SF3 (komprimierte SoundFont) braucht das erweiterte SpessaSynth-Paket (mit stb-vorbis). Anleitung: spessa-build-kit/README.md – oder eine .sf2-Datei verwenden.');
      if (smplOff < 0) throw new Error('Die SoundFont enthält keine Sample-Daten (smpl).');
      for (const k of ['phdr', 'pbag', 'pgen', 'inst', 'ibag', 'igen', 'shdr']) if (!pd[k]) throw new Error(`SoundFont unvollständig (${k} fehlt).`);
      const recs = (c, size, fn) => { const n = Math.floor(pd[c].len / size), out = new Array(n); for (let i = 0; i < n; i++) out[i] = fn(pd[c].off + i * size); return out; };
      const phdr = recs('phdr', 38, o => ({ name: str(o, 20), preset: u16(o + 20), bank: u16(o + 22), bag: u16(o + 24) }));
      const pbag = recs('pbag', 4, o => ({ gen: u16(o) }));
      const pgen = recs('pgen', 4, o => ({ op: u16(o), v: s16(o + 2), lo: dv.getUint8(o + 2), hi: dv.getUint8(o + 3) }));
      const inst = recs('inst', 22, o => ({ name: str(o, 20), bag: u16(o + 20) }));
      const ibag = recs('ibag', 4, o => ({ gen: u16(o) }));
      const igen = recs('igen', 4, o => ({ op: u16(o), v: s16(o + 2), lo: dv.getUint8(o + 2), hi: dv.getUint8(o + 3) }));
      const shdr = recs('shdr', 46, o => ({ name: str(o, 20), start: u32(o + 20), end: u32(o + 24), sl: u32(o + 28), el: u32(o + 32), rate: u32(o + 36), pitch: dv.getUint8(o + 40), corr: dv.getInt8(o + 41), type: u16(o + 44) }));
      if (phdr.length < 2) throw new Error('Die SoundFont enthält keine Presets.');
      const pcm = isSf3 ? new Int16Array(0) : new Int16Array(buf, smplOff, Math.floor(smplLen / 2));
      const presets = [], presetMap = {};
      for (let i = 0; i < phdr.length - 1; i++) {
        const ph = phdr[i];
        presets.push({ idx: i, name: ph.name || `Preset ${ph.preset}`, bank: ph.bank, preset: ph.preset });
        presetMap[ph.bank + ':' + ph.preset] = i;
      }
      presets.sort((a, b) => a.bank - b.bank || a.preset - b.preset);
      return { phdr, pbag, pgen, inst, ibag, igen, shdr, pcm, presets, presetMap, sf3: isSf3, layerCache: {}, bufCache: {} };
    }

    function sfZones(bags, gens, from, to) {
      const zones = [];
      for (let b = from; b < to && b + 1 < bags.length; b++) {
        const z = { g: {}, key: null, vel: null };
        for (let gi = bags[b].gen; gi < bags[b + 1].gen && gi < gens.length; gi++) {
          const g = gens[gi];
          if (g.op === 43) z.key = [g.lo, g.hi];
          else if (g.op === 44) z.vel = [g.lo, g.hi];
          else z.g[g.op] = g.v;
        }
        zones.push(z);
      }
      return zones;
    }
    function sfLayers(font, presetIdx) {
      if (font.layerCache[presetIdx]) return font.layerCache[presetIdx];
      const P = font.phdr, layers = [];
      const pz = sfZones(font.pbag, font.pgen, P[presetIdx].bag, P[presetIdx + 1].bag);
      let gP = null;
      pz.forEach((z, zi) => {
        if (z.g[41] === undefined) { if (zi === 0) gP = z; return; }
        const pg = Object.assign({}, gP ? gP.g : {}, z.g);
        const pkey = z.key || (gP && gP.key) || [0, 127], pvel = z.vel || (gP && gP.vel) || [0, 127];
        const ins = font.inst[pg[41]]; if (!ins || !font.inst[pg[41] + 1]) return;
        const iz = sfZones(font.ibag, font.igen, ins.bag, font.inst[pg[41] + 1].bag);
        let gI = null;
        iz.forEach((y, yi) => {
          if (y.g[53] === undefined) { if (yi === 0) gI = y; return; }
          const ig = Object.assign({}, gI ? gI.g : {}, y.g);
          const ik = y.key || (gI && gI.key) || [0, 127], iv = y.vel || (gI && gI.vel) || [0, 127];
          const key = [Math.max(pkey[0], ik[0]), Math.min(pkey[1], ik[1])];
          const vel = [Math.max(pvel[0], iv[0]), Math.min(pvel[1], iv[1])];
          if (key[0] > key[1] || vel[0] > vel[1]) return;
          const add = (op, def) => (ig[op] ?? def) + (pg[op] || 0);
          layers.push({
            key, vel, sample: ig[53],
            startOff: (ig[0] || 0) + (ig[4] || 0) * 32768, endOff: (ig[1] || 0) + (ig[12] || 0) * 32768,
            slOff: (ig[2] || 0) + (ig[45] || 0) * 32768, elOff: (ig[3] || 0) + (ig[50] || 0) * 32768,
            fc: add(8, 13500), q: add(9, 0), pan: add(17, 0), atten: add(48, 0),
            coarse: add(51, 0), fine: add(52, 0), scale: ig[56] ?? 100, root: ig[58] ?? -1, mode: (ig[54] || 0) & 3,
            delay: add(33, -12000), attack: add(34, -12000), hold: add(35, -12000), decay: add(36, -12000), sustain: add(37, 0), release: add(38, -12000)
          });
        });
      });
      font.layerCache[presetIdx] = layers;
      return layers;
    }
    function sfMakeBuffer(ctx, len, rate) {
      try { return new AudioBuffer({ length: len, sampleRate: rate, numberOfChannels: 1 }); }
      catch (_) { return ctx.createBuffer(1, len, rate); }
    }
    function sfSampleBuffer(ctx, font, layer) {
      const sh = font.shdr[layer.sample];
      if (!sh || (sh.type & 0x8000)) return null; // ROM-Samples nicht unterstützt
      const start = sh.start + layer.startOff;
      const end = Math.min(font.pcm.length, sh.end + layer.endOff);
      if (end - start < 2 || start < 0) return null;
      const key = `${layer.sample}:${layer.startOff}:${layer.endOff}`;
      if (font.bufCache[key]) return font.bufCache[key];
      const rate = Math.min(96000, Math.max(8000, sh.rate || 44100));
      const buf = sfMakeBuffer(ctx, end - start, rate);
      const ch = buf.getChannelData(0), pcm = font.pcm;
      for (let i = 0; i < ch.length; i++) ch[i] = pcm[start + i] / 32768;
      font.bufCache[key] = buf;
      return buf;
    }

    const sfSecs = tc => Math.pow(2, Math.min(8000, Math.max(-12000, tc)) / 1200);

    function sfPlay(ctx, dest, time, opts) {
      const { font, presetIdx, bank } = opts.sfPreset;
      const note = opts.midiNote;
      const vel127 = Math.round(Math.min(1, Math.max(0, opts.velocity ?? 0.85)) * 127);
      const dur = Math.max(0.03, opts.durationSec || 0.25);
      const layers = sfLayers(font, presetIdx)
        .filter(l => note >= l.key[0] && note <= l.key[1] && vel127 >= l.vel[0] && vel127 <= l.vel[1]).slice(0, 8);
      layers.forEach(l => {
        const buf = sfSampleBuffer(ctx, font, l);
        if (!buf) return;
        const sh = font.shdr[l.sample];
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const root = l.root >= 0 ? l.root : (sh.pitch === 255 ? 60 : sh.pitch);
        const rateComp = sh.rate && buf.sampleRate !== sh.rate ? 1200 * Math.log2(sh.rate / buf.sampleRate) : 0;
        const cents = (note - root) * l.scale + l.coarse * 100 + l.fine + sh.corr + rateComp;
        src.detune.setValueAtTime(cents, time);
        let looping = false;
        if (l.mode === 1 || l.mode === 3) {
          const ls = (sh.sl + l.slOff - (sh.start + l.startOff)) / buf.sampleRate;
          const le = (sh.el + l.elOff - (sh.start + l.startOff)) / buf.sampleRate;
          if (le > ls + 0.002 && le <= buf.duration + 0.001 && ls >= 0) { src.loop = true; src.loopStart = ls; src.loopEnd = Math.min(le, buf.duration); looping = true; }
        }
        const ratio = Math.pow(2, cents / 1200);
        const g = ctx.createGain();
        const v = vel127 / 127;
        const level = 0.6 * Math.pow(v, 1.2) * Math.pow(10, -(Math.max(0, l.atten) * 0.4) / 200);
        const t0 = time + (l.delay > -12000 ? sfSecs(l.delay) : 0);
        const atk = Math.max(0.002, sfSecs(l.attack));
        const hold = l.hold > -12000 ? sfSecs(l.hold) : 0;
        const dec = l.decay > -12000 ? sfSecs(l.decay) : 0;
        const sus = Math.pow(10, -Math.min(1440, Math.max(0, l.sustain)) / 200);
        const rel = Math.max(0.02, l.release > -12000 ? sfSecs(l.release) : 0.02);
        // Schlagzeug-/Einmal-Samples (nicht geloopt, Bank 128) klingen komplett aus
        let tOff = time + dur;
        if (!looping && bank === 128) tOff = Math.max(tOff, t0 + buf.duration / ratio);
        tOff = Math.max(tOff, t0 + atk);
        const tDec = t0 + atk + hold;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(level, t0 + atk);
        let vOff = level;
        if (dec > 0 && sus < 1) {
          const tau = dec / 6.9;
          g.gain.setValueAtTime(level, tDec);
          g.gain.setTargetAtTime(level * sus, tDec, tau);
          if (tOff > tDec) vOff = level * sus + (level - level * sus) * Math.exp(-(tOff - tDec) / tau);
        }
        g.gain.setValueAtTime(vOff, tOff);
        g.gain.setTargetAtTime(0, tOff, rel / 6.9);
        let tail = src;
        if (l.fc < 13000) {
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = Math.min(20000, Math.max(20, 8.176 * Math.pow(2, l.fc / 1200)));
          f.Q.value = Math.min(25, Math.max(0, l.q / 10));
          tail.connect(f); tail = f;
        }
        tail.connect(g); tail = g;
        if (l.pan) { const pn = ctx.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, l.pan / 500)); tail.connect(pn); tail = pn; }
        tail.connect(dest);
        src.onended = () => { try { src.disconnect(); g.disconnect(); } catch (_) {} };
        src.start(time);
        src.stop(tOff + rel + 0.05);
      });
    }

    /* Liefert {font, presetIdx, bank} für sf-Zuweisung einer Spur – oder null (dann spielt der Standard-Synth). */
    function sfVoiceSource(sf) {
      if (!SF_LIB.listPromise) sfListInstalled().catch(e => console.warn('[SoundFont]', e));
      const font = SF_LIB.fonts[sf.font];
      if (!font) {
        if (SF_LIB.listPromise && !SF_LIB.warned[sf.font]) {
          SF_LIB.warned[sf.font] = true;
          SF_LIB.listPromise.then(() => { if (!SF_LIB.fonts[sf.font]) toast(`SoundFont „${sf.fontName || sf.font}“ ist auf diesem Gerät nicht installiert – Standard-Synth wird verwendet.`, 'warn'); }).catch(() => {});
        }
        return null;
      }
      if (!font.parsed) { sfLoadFont(sf.font).catch(() => {}); return null; }
      if (font.parsed.sf3) return null; // SF3 spielt nur SpessaSynth
      const idx = font.parsed.presetMap[sf.bank + ':' + sf.preset];
      if (idx === undefined) return null;
      return { font: font.parsed, presetIdx: idx, bank: sf.bank };
    }
    function sfLoadFont(id) {
      const font = SF_LIB.fonts[id];
      if (!font) return Promise.reject(new Error('SoundFont nicht gefunden.'));
      if (font.parsed) return Promise.resolve(font.parsed);
      if (!font.loading) {
        font.loading = (async () => {
          const db = await sfOpenDb();
          const buf = await sfReq(db.transaction('data').objectStore('data').get(id));
          if (!buf) throw new Error('SoundFont-Daten fehlen im Speicher.');
          font.parsed = sfParse(buf);
          return font.parsed;
        })().catch(err => { font.loading = null; toast(`SoundFont konnte nicht geladen werden: ${err.message}`, 'error'); throw err; });
      }
      return font.loading;
    }
    async function sfImportFile(file) {
      const buf = await file.arrayBuffer();
      const parsed = sfParse(buf);
      const id = `${file.name}|${file.size}`;
      const meta = { id, name: file.name.replace(/\.(sf2|sf3)$/i, ''), size: file.size, addedAt: Date.now(), presets: parsed.presets.length };
      await sfSaveFont(meta, buf);
      SF_LIB.fonts[id] = { meta, parsed, loading: null };
      SF_LIB.listPromise = null;
      return id;
    }

    /* Externe Links (Capacitor-Browser, sonst neues Fenster) */
    function openExternalUrl(url) {
      try {
        const cap = window.Capacitor, B = cap && cap.Plugins && cap.Plugins.Browser;
        if (B && typeof B.open === 'function') { B.open({ url }); return; }
      } catch (_) {}
      const w = window.open(url, '_blank', 'noopener');
      if (!w) toast(`Link konnte nicht geöffnet werden: ${url}`, 'warn');
    }

    const SF_FREE_SOURCES = [
      { name: 'GeneralUser GS', note: 'ca. 30 MB · General MIDI, gut für den Einstieg', url: 'https://schristiancollins.com/generaluser.php' },
      { name: 'TimGM6mb (MuseScore-Liste)', note: 'ca. 6 MB · sehr klein, GPL', url: 'https://musescore.org/en/handbook/soundfonts-and-sfz-files' },
      { name: 'FreePats', note: 'freie Instrumente (z. B. Klaviere) · Größen vorher prüfen', url: 'https://freepats.zenvoid.org/' },
      { name: 'Polyphone Soundfonts', note: 'Community-Sammlung, viele kleine Bänke', url: 'https://www.polyphone.io/en/soundfonts' },
      { name: 'Musical Artifacts', note: 'großes Archiv · Lizenz je Datei beachten', url: 'https://musical-artifacts.com/' }
    ];

    function openSoundFontPicker(track) {
      document.getElementById('sf-picker-modal')?.remove();
      const ov = document.createElement('div');
      ov.id = 'sf-picker-modal';
      ov.className = 'fixed inset-0 z-[var(--z-dialog-2)] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-5';
      ov.innerHTML = `<div class="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-purple-500/40 bg-slate-950 p-4 shadow-2xl text-slate-100">
        <div class="flex items-center gap-3 mb-2"><div class="text-base font-black">🎼 SoundFont · ${escapeText(track.name)}</div><button type="button" data-close class="ml-auto px-3 py-1 rounded-lg bg-slate-800 text-slate-300">✕</button></div>
        <div class="flex gap-2 mb-2"><select id="sf-font" class="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm"></select><button type="button" data-sf-del class="px-3 rounded-lg border border-rose-500/40 text-rose-300 text-xs" title="SoundFont vom Gerät entfernen">🗑</button></div>
        <button type="button" data-sf-load class="mb-2 px-3 py-2 rounded-lg bg-purple-500 text-white font-bold text-xs">📂 SoundFont laden (.sf2 / .sf3)</button>
        <details class="mb-2 rounded-lg border border-slate-800 bg-slate-900/60">
          <summary class="px-3 py-2 text-xs font-bold text-cyan-300 cursor-pointer">🌐 Kostenlose SoundFonts herunterladen</summary>
          <div class="px-3 pb-2 space-y-1">
            ${SF_FREE_SOURCES.map(x => `<button type="button" data-ext="${escapeText(x.url)}" class="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-800"><span class="text-xs font-semibold text-slate-100">${escapeText(x.name)}</span> <span class="text-[10px] text-slate-400">– ${escapeText(x.note)}</span><div class="text-[10px] text-cyan-400/80 break-all">${escapeText(x.url)}</div></button>`).join('')}
            <div class="text-[10px] text-slate-500 pt-1">Nach dem Download hier über „SoundFont laden“ auswählen. SF2 funktioniert immer; SF3 nur mit dem erweiterten SpessaSynth-Paket (siehe spessa-build-kit), DLS geht nicht. Lizenz und Dateigröße vor dem Download prüfen – auf dem Handy am besten unter ca. 60 MB bleiben.</div>
          </div>
        </details>
        <div id="sf-status" class="text-[11px] text-slate-400 mb-2">Lade eine .sf2-Datei (SF3 nur mit erweitertem Paket). Sie bleibt auf diesem Gerät gespeichert.</div>
        <label class="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-300 mb-2 cursor-pointer"><input id="sf-engine" type="checkbox"> <span>SpessaSynth-Engine (empfohlen: volle SoundFont-Unterstützung)</span> <span id="sf-engine-status" class="text-slate-500"></span></label>
        <input id="sf-search" type="search" placeholder="Preset suchen …" class="mb-2 bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm w-full" />
        <div id="sf-list" class="flex-1 min-h-[120px] overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800"></div>
        <div class="flex justify-end mt-3"><button type="button" data-close class="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">Fertig</button></div></div>`;
      document.body.appendChild(ov);
      const $q = s => ov.querySelector(s);
      const setStatus = (t, err) => { const el = $q('#sf-status'); el.textContent = t; el.className = 'text-[11px] mb-2 ' + (err ? 'text-rose-300' : 'text-slate-400'); };
      let curFont = track.sf && track.sf.font ? track.sf.font : null;

      const renderList = () => {
        const list = $q('#sf-list'), font = curFont && SF_LIB.fonts[curFont];
        if (!font || !font.parsed) { list.innerHTML = '<div class="p-3 text-xs text-slate-500">Noch kein SoundFont gewählt.</div>'; return; }
        const q = $q('#sf-search').value.trim().toLowerCase();
        const all = font.parsed.presets.filter(p => !q || p.name.toLowerCase().includes(q) || String(p.preset) === q);
        const shown = all.slice(0, 300);
        list.innerHTML = shown.map(p => {
          const on = track.instrument === 'sf' && track.sf && track.sf.font === curFont && track.sf.bank === p.bank && track.sf.preset === p.preset;
          return `<button type="button" data-sf-preset="${p.bank}:${p.preset}" class="w-full text-left px-3 py-2 text-xs ${on ? 'bg-purple-500/25 text-purple-100' : 'hover:bg-slate-900 text-slate-200'}">${p.bank === 128 ? '🥁' : '🎹'} <span class="font-mono text-slate-500">${String(p.bank).padStart(3, '0')}:${String(p.preset).padStart(3, '0')}</span> ${escapeText(p.name)}</button>`;
        }).join('') + (all.length > shown.length ? `<div class="p-2 text-[10px] text-slate-500">… ${all.length - shown.length} weitere – Suche verfeinern.</div>` : '') + (all.length === 0 ? '<div class="p-3 text-xs text-slate-500">Keine Treffer.</div>' : '');
      };
      const renderFonts = async () => {
        let metas = [];
        try { metas = await sfListInstalled(); } catch (err) { setStatus(`Speicher nicht verfügbar: ${err.message}`, true); }
        const sel = $q('#sf-font');
        sel.innerHTML = metas.length ? metas.map(m => `<option value="${escapeText(m.id)}">${escapeText(m.name)} (${(m.size / 1048576).toFixed(1)} MB)</option>`).join('') : '<option value="">– kein SoundFont installiert –</option>';
        if (!curFont || !SF_LIB.fonts[curFont]) curFont = metas[0] ? metas[0].id : null;
        if (curFont) sel.value = curFont;
        if (curFont) {
          setStatus('SoundFont wird geladen …');
          try { await sfLoadFont(curFont); setStatus(`${SF_LIB.fonts[curFont].parsed.presets.length} Presets. Tippe ein Preset an: es wird zugewiesen und angespielt.`); }
          catch (err) { setStatus(err.message, true); }
        }
        renderList();
      };

      const engCb = $q('#sf-engine'), engSt = $q('#sf-engine-status');
      engCb.checked = SpessaEngine.enabled;
      const updEng = () => {
        const sf = track.instrument === 'sf' && track.sf ? track.sf : (curFont ? { font: curFont } : null);
        const st = SpessaEngine.status(sf);
        engSt.textContent = '· ' + st.text;
        engSt.className = st.state === 'ready' ? 'text-emerald-300' : (st.state === 'fail' || st.state === 'na') ? 'text-amber-300' : 'text-slate-400';
      };
      engCb.addEventListener('change', async () => {
        SpessaEngine.setEnabled(engCb.checked);
        if (engCb.checked) { try { await audioEngine.ensureCtx(); const sf = track.instrument === 'sf' && track.sf ? track.sf : (curFont ? { font: curFont, fontName: SF_LIB.fonts[curFont] && SF_LIB.fonts[curFont].meta.name } : null); if (sf) SpessaEngine.prepare(audioEngine.ctx, sf); } catch (err) { console.warn(err); } }
        updEng();
      });
      const engTimer = SunTick.every(500, () => { if (!document.body.contains(ov)) { SunTick.stop(engTimer); return; } updEng(); });
      updEng();

      ov.addEventListener('click', async e => {
        const t = e.target instanceof Element ? e.target : null; if (!t) return;
        if (t === ov || t.closest('[data-close]')) { ov.remove(); return; }
        const ext = t.closest('[data-ext]'); if (ext) { openExternalUrl(ext.dataset.ext); return; }
        if (t.closest('[data-sf-load]')) {
          const inp = document.createElement('input'); inp.type = 'file'; inp.style.display = 'none';
          document.body.appendChild(inp);
          inp.onchange = async () => {
            const file = inp.files && inp.files[0]; inp.remove(); if (!file) return;
            setStatus(`„${file.name}“ wird gelesen und gespeichert …`);
            try { curFont = await sfImportFile(file); toast(`SoundFont „${file.name}“ importiert.`, 'success'); await renderFonts(); }
            catch (err) { console.error('[SoundFont]', err); setStatus(err.message, true); toast(`SoundFont-Import fehlgeschlagen: ${err.message}`, 'error'); }
          };
          inp.click(); return;
        }
        if (t.closest('[data-sf-del]')) {
          if (!curFont) return;
          const name = SF_LIB.fonts[curFont] ? SF_LIB.fonts[curFont].meta.name : curFont;
          if (!confirm(`SoundFont „${name}“ vom Gerät entfernen?`)) return;
          try { SpessaEngine.dispose(curFont); await sfDeleteFont(curFont); curFont = null; await renderFonts(); } catch (err) { setStatus(err.message, true); }
          return;
        }
        const pb = t.closest('[data-sf-preset]');
        if (pb && curFont) {
          const [bank, preset] = pb.dataset.sfPreset.split(':').map(Number);
          const pr = SF_LIB.fonts[curFont].parsed.presets.find(p => p.bank === bank && p.preset === preset);
          try {
            if (window.__dawPushUndo) window.__dawPushUndo();
            track.instrument = 'sf';
            track.sf = { font: curFont, fontName: SF_LIB.fonts[curFont].meta.name, bank, preset, name: pr ? pr.name : `Preset ${preset}` };
            renderList();
            await audioEngine.ensureCtx();
            audioEngine.ensureTrackNode(track);
            if (SpessaEngine.enabled && SpessaEngine.hasBundle()) {
              setStatus('SpessaSynth lädt den SoundFont …');
              await SpessaEngine.whenReady(track.sf, 8000);
              setStatus(`Preset „${track.sf.name}“ ist der Spur zugewiesen.`);
            }
            auditionMidiNote(bank === 128 ? 36 : 60, 0.8, 0.85, track);
            renderMultiTrackLanes();
          } catch (err) { console.error('[SoundFont]', err); toast(`Preset konnte nicht gesetzt werden: ${err.message}`, 'error'); }
        }
      });
      $q('#sf-font').addEventListener('change', async e => { curFont = e.target.value || null; if (curFont) { setStatus('SoundFont wird geladen …'); try { await sfLoadFont(curFont); setStatus(`${SF_LIB.fonts[curFont].parsed.presets.length} Presets.`); } catch (err) { setStatus(err.message, true); } } renderList(); });
      $q('#sf-search').addEventListener('input', renderList);
      renderFonts();
    }
