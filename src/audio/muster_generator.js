    /**
     * ============================================================================
     * PATTERN-GENERATOR v2 (Akkord-/Tonleiter-bewusst, Euklid-Rhythmen, Seed-Würfeln)
     * Erzeugt 2 Takte (32 Steps) im Piano-Roll-Bereich C2–B4 aus Tonart, Progression,
     * Rhythmus und Stil. Progression kann aus der Audio-Akkorderkennung stammen.
     * ============================================================================
     */
    const PATTERN_STYLES = {
      arpUp: 'Arp aufwärts', arpDown: 'Arp abwärts', arpUpDown: 'Arp auf & ab', arpRandom: 'Arp zufällig',
      stab: 'Akkord-Stabs', bass: 'Bassline', melody: 'Melodie', bell: 'Glocken-Melodie'
    };
    const PATTERN_PROGRESSIONS = {
      '1-6-3-7': [0, 5, 2, 6], '1-4-5-1': [0, 3, 4, 0], '1-7-6-7': [0, 6, 5, 6], '1-3-7-6': [0, 2, 6, 5],
      '1-5-6-4': [0, 4, 5, 3], '1-4-6-5': [0, 3, 5, 4], '6-4-1-5': [5, 3, 0, 4], '1-1-1-1': [0, 0, 0, 0]
    };
    const PATTERN_RHYTHMS = {
      straight16: '16tel durchgehend', eighths: '8tel', offbeat: 'Offbeat', sync: 'Synkopiert',
      euclid5: 'Euklid 5/16', euclid7: 'Euklid 7/16', euclid9: 'Euklid 9/16', random: 'Zufall'
    };
    const PATTERN_CFG = { style: 'arpUp', prog: '1-6-3-7', rhythm: 'straight16', oct: 2, len: 'normal', human: 'light', seed: 1 };

    function patMulberry32(a) {
      return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }
    function patMask(kind, rng) {
      const m = new Array(16).fill(0);
      if (kind === 'straight16') m.fill(1);
      else if (kind === 'eighths') for (let i = 0; i < 16; i += 2) m[i] = 1;
      else if (kind === 'offbeat') for (let i = 2; i < 16; i += 4) m[i] = 1;
      else if (kind === 'sync') [0, 3, 6, 9, 12, 14].forEach(i => m[i] = 1);
      else if (kind.startsWith('euclid')) {
        const k = parseInt(kind.slice(6), 10), rot = Math.floor(rng() * 4);
        for (let i = 0; i < 16; i++) if (((i * k) % 16) < k) m[(i + rot) % 16] = 1;
      } else { for (let i = 0; i < 16; i++) m[i] = rng() < 0.55 ? 1 : 0; m[0] = 1; }
      return m;
    }
    function patChordFromDegree(deg, root, scaleKey) {
      let iv = SCALES[scaleKey] || SCALES.minor;
      if (iv.length !== 7) iv = SCALES.minor;
      const abs = k => iv[((k % 7) + 7) % 7] + 12 * Math.floor(k / 7);
      const r = abs(deg);
      return { rootPc: (root + r) % 12, tones: [0, abs(deg + 2) - r, abs(deg + 4) - r] };
    }
    function patBuildChords(cfg, info) {
      if (cfg.prog === 'audio' && info.audioChords && info.audioChords.length) {
        const out = [];
        for (let w = 0; w < 4; w++) {
          const c = info.audioChords.find(ch => w * 8 >= ch.step && w * 8 < ch.step + ch.dur) || info.audioChords[w % info.audioChords.length];
          out.push({ rootPc: c.root, tones: [0, c.quality === 'maj' ? 4 : 3, 7] });
        }
        return out;
      }
      const degs = PATTERN_PROGRESSIONS[cfg.prog] || PATTERN_PROGRESSIONS['1-6-3-7'];
      return [0, 1, 2, 3].map(i => patChordFromDegree(degs[i % degs.length], info.root, info.scale));
    }
    function patGenerate(cfg, info) {
      const rng = patMulberry32((cfg.seed >>> 0) || 1);
      const chords = patBuildChords(cfg, info);
      const chordAt = s => chords[Math.floor(s / 8) % chords.length];
      const m1 = patMask(cfg.rhythm, rng);
      const m2 = m1.slice();
      if (/^(euclid|random)/.test(cfg.rhythm)) for (let k = 0; k < 2; k++) { const i = 1 + Math.floor(rng() * 15); m2[i] = m2[i] ? 0 : 1; }
      const hits = [];
      for (let s = 0; s < 32; s++) if ((s < 16 ? m1 : m2)[s % 16]) hits.push(s);
      const humAmp = { off: 0, light: 6, strong: 14 }[cfg.human] ?? 6;
      const clampP = p => { while (p > 71) p -= 12; while (p < 36) p += 12; return p; };
      const velAt = s => Math.max(40, Math.min(127, (s % 4 === 0 ? 112 : (s % 2 === 0 ? 98 : 86)) + Math.round((rng() * 2 - 1) * humAmp)));
      const notes = []; let id = Date.now();
      const durFor = (i, base) => {
        const gap = (hits[i + 1] !== undefined ? hits[i + 1] : 32) - hits[i];
        const d = cfg.len === 'short' ? 1 : cfg.len === 'long' ? Math.min(8, gap) : Math.min(2, gap);
        return Math.max(1, Math.min(d || base, 32 - hits[i]));
      };
      const pool = ch => { const b = 48 + ch.rootPc, p = []; for (let o = 0; o < cfg.oct; o++) ch.tones.forEach(t => p.push(b + t + 12 * o)); return p.filter(x => x <= 71).sort((a, b2) => a - b2); };
      const iv7 = (SCALES[info.scale] && SCALES[info.scale].length === 7) ? SCALES[info.scale] : SCALES.minor;
      const scalePcs = new Set(iv7.map(v => (v + info.root) % 12));
      const melPool = []; for (let p = (cfg.style === 'bell' ? 60 : 53); p <= 71; p++) if (scalePcs.has(p % 12)) melPool.push(p);
      let melIdx = Math.floor(melPool.length / 2), arpK = 0, lastChordI = -1;
      hits.forEach((s, i) => {
        const ci = Math.floor(s / 8) % chords.length, ch = chordAt(s);
        if (ci !== lastChordI) { arpK = 0; lastChordI = ci; }
        const P = pool(ch); if (!P.length) return;
        const vel = velAt(s), dur = durFor(i, 1);
        const push = (pitch, d) => { const p = clampP(pitch); if (!notes.some(n => n.start === s && n.pitch === p)) notes.push({ id: id++, pitch: p, start: s, dur: d || dur, vel }); };
        if (cfg.style === 'arpUp') push(P[arpK++ % P.length]);
        else if (cfg.style === 'arpDown') push(P[P.length - 1 - (arpK++ % P.length)]);
        else if (cfg.style === 'arpUpDown') { const seq = P.length > 2 ? P.concat(P.slice(1, -1).reverse()) : P; push(seq[arpK++ % seq.length]); }
        else if (cfg.style === 'arpRandom') push(P[Math.floor(rng() * P.length)]);
        else if (cfg.style === 'stab') ch.tones.forEach(t => push(48 + ch.rootPc + t));
        else if (cfg.style === 'bass') {
          let p = 36 + ch.rootPc; const r = rng();
          if (i % 4 === 3 && r < 0.6) p += 12; else if (s % 4 !== 0 && r < 0.3) p += 7;
          push(p);
        } else {
          // Melodie / Glocken: Schritte in der Tonleiter, auf starken Zeiten zum Akkordton
          const w = rng(); melIdx += w < 0.15 ? -2 : w < 0.45 ? -1 : w < 0.55 ? 0 : w < 0.85 ? 1 : 2;
          melIdx = Math.max(0, Math.min(melPool.length - 1, melIdx));
          if (s % 4 === 0) {
            const pcs = ch.tones.map(t => (ch.rootPc + t) % 12); let bi = melIdx, bd = 99;
            melPool.forEach((p, k) => { if (pcs.includes(p % 12) && Math.abs(k - melIdx) < bd) { bd = Math.abs(k - melIdx); bi = k; } });
            melIdx = bi;
          }
          push(melPool[melIdx], cfg.style === 'bell' ? Math.min(32 - s, Math.max(dur, 2)) : dur);
        }
      });
      return notes;
    }
    function patSummary(cfg) {
      return `${PATTERN_STYLES[cfg.style]} · ${cfg.prog === 'audio' ? 'Akkorde aus Audio' : cfg.prog} · ${PATTERN_RHYTHMS[cfg.rhythm]}`;
    }
    function patApply(cfg) {
      const info = { root: dawState.midiRoot, scale: dawState.midiScale, audioChords: dawState.detectedChords };
      const notes = patGenerate(cfg, info);
      if (!notes.length) { toast('Das Pattern ist leer – anderen Rhythmus oder Seed wählen.', 'warn'); return; }
      if (!getActiveMidiTrack()) createTrack('midi', 'Pattern');
      notes.forEach(n => { dawState.stepVelocities[n.start] = Math.max(dawState.stepVelocities[n.start] || 0, n.vel); });
      dawState.midiNotes = notes;
      syncActiveMidiTrackFromState();
      drawPianoRoll();
      drawVelocityLane();
      renderMultiTrackLanes();
      toast(`Pattern: ${patSummary(cfg)}`, 'success');
    }
    function patRandomize(cfg) {
      const pick = arr => arr[Math.floor(Math.random() * arr.length)];
      cfg.style = pick(Object.keys(PATTERN_STYLES));
      const progs = Object.keys(PATTERN_PROGRESSIONS); if (dawState.detectedChords && dawState.detectedChords.length) progs.push('audio', 'audio');
      cfg.prog = pick(progs);
      cfg.rhythm = pick(Object.keys(PATTERN_RHYTHMS));
      cfg.oct = pick([1, 2, 2, 3]); cfg.len = pick(['short', 'normal', 'normal', 'long']);
      cfg.seed = 1 + Math.floor(Math.random() * 99999);
      return cfg;
    }

    function openPatternStudio() {
      document.getElementById('pattern-studio-modal')?.remove();
      const ov = document.createElement('div');
      ov.id = 'pattern-studio-modal';
      ov.className = 'fixed inset-0 z-[110] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-5';
      const opts = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${escapeText(v)}</option>`).join('');
      const progObj = Object.fromEntries(Object.keys(PATTERN_PROGRESSIONS).map(k => [k, 'Stufen ' + k]));
      if (dawState.detectedChords && dawState.detectedChords.length) {
        progObj.audio = 'Aus Audio-Analyse: ' + dawState.detectedChords.map(c => A2M_NOTE_NAMES[c.root] + (c.quality === 'min' ? 'm' : '')).join(' – ');
      }
      if (PATTERN_CFG.prog === 'audio' && !progObj.audio) PATTERN_CFG.prog = '1-6-3-7';
      const sel = (id, label, html) => `<label class="block text-[11px] text-slate-400">${label}<select id="${id}" class="mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-slate-100">${html}</select></label>`;
      ov.innerHTML = `<div class="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-slate-950 p-4 shadow-2xl text-slate-100">
        <div class="flex items-center gap-3 mb-1"><div class="text-base font-black">✨ Pattern-Studio</div><button type="button" data-close class="ml-auto px-3 py-1 rounded-lg bg-slate-800 text-slate-300">✕</button></div>
        <div class="text-[11px] text-slate-400 mb-3">Tonart: <b id="ps-key" class="text-cyan-300"></b> · erzeugt 2 Takte im Piano Roll der aktiven MIDI-Spur.</div>
        <div class="grid grid-cols-2 gap-2">
          ${sel('ps-style', 'Stil', opts(PATTERN_STYLES, PATTERN_CFG.style))}
          ${sel('ps-prog', 'Akkord-Progression', opts(progObj, PATTERN_CFG.prog))}
          ${sel('ps-rhythm', 'Rhythmus', opts(PATTERN_RHYTHMS, PATTERN_CFG.rhythm))}
          ${sel('ps-oct', 'Oktaven (Arp)', opts({ 1: '1', 2: '2', 3: '3' }, String(PATTERN_CFG.oct)))}
          ${sel('ps-len', 'Notenlänge', opts({ short: 'Kurz', normal: 'Normal', long: 'Lang (legato)' }, PATTERN_CFG.len))}
          ${sel('ps-human', 'Humanize (Anschlag)', opts({ off: 'Aus', light: 'Leicht', strong: 'Stark' }, PATTERN_CFG.human))}
        </div>
        <div class="text-[10px] text-slate-500 mt-2">Seed: <span id="ps-seed" class="font-mono text-slate-300"></span> – gleicher Seed ergibt dasselbe Pattern.</div>
        <div class="grid grid-cols-3 gap-2 mt-3">
          <button type="button" data-ps="dice" class="px-2 py-2 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold">🎲 Variation</button>
          <button type="button" data-ps="gen" class="px-2 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-black">Generieren</button>
          <button type="button" data-ps="auto" class="px-2 py-2 rounded-lg bg-purple-500 text-white text-xs font-black">🎲 Vollautomatisch</button>
        </div></div>`;
      document.body.appendChild(ov);
      const $q = s => ov.querySelector(s);
      const readCfg = () => {
        PATTERN_CFG.style = $q('#ps-style').value; PATTERN_CFG.prog = $q('#ps-prog').value; PATTERN_CFG.rhythm = $q('#ps-rhythm').value;
        PATTERN_CFG.oct = parseInt($q('#ps-oct').value, 10) || 2; PATTERN_CFG.len = $q('#ps-len').value; PATTERN_CFG.human = $q('#ps-human').value;
      };
      const writeCfg = () => { $q('#ps-style').value = PATTERN_CFG.style; $q('#ps-prog').value = PATTERN_CFG.prog; $q('#ps-rhythm').value = PATTERN_CFG.rhythm; $q('#ps-oct').value = String(PATTERN_CFG.oct); $q('#ps-len').value = PATTERN_CFG.len; $q('#ps-human').value = PATTERN_CFG.human; $q('#ps-seed').textContent = PATTERN_CFG.seed; };
      const keyLabel = () => A2M_NOTE_NAMES[dawState.midiRoot] + ' ' + ({ major: 'Dur', minor: 'Moll', harmonicMinor: 'Harm. Moll', phrygian: 'Phrygisch', pentatonic: 'Moll-Pentatonik', chromatic: 'Chromatisch' }[dawState.midiScale] || dawState.midiScale);
      $q('#ps-key').textContent = keyLabel(); writeCfg();
      ov.addEventListener('click', e => {
        const t = e.target instanceof Element ? e.target : null; if (!t) return;
        if (t === ov || t.closest('[data-close]')) { ov.remove(); return; }
        const b = t.closest('[data-ps]'); if (!b) return;
        try {
          if (b.dataset.ps === 'dice') { readCfg(); PATTERN_CFG.seed = 1 + Math.floor(Math.random() * 99999); writeCfg(); patApply(PATTERN_CFG); }
          else if (b.dataset.ps === 'gen') { readCfg(); patApply(PATTERN_CFG); }
          else if (b.dataset.ps === 'auto') { patRandomize(PATTERN_CFG); writeCfg(); patApply(PATTERN_CFG); }
        } catch (err) { console.error('[Pattern]', err); toast(`Pattern konnte nicht erzeugt werden: ${err.message}`, 'error'); }
      });
    }

    /* Toolbar-Buttons „✨ Studio“ und „🎲 Auto“ (zentral, überleben jeden Neuaufbau) */
    (function installPatternButtons() {
      if (window.__patBtnInstalled) return; window.__patBtnInstalled = true;
      document.addEventListener('click', e => {
        const t = e.target instanceof Element ? e.target : null; if (!t) return;
        if (t.closest('#btn-pattern-studio')) { try { openPatternStudio(); } catch (err) { console.error(err); toast(`Pattern-Studio: ${err.message}`, 'error'); } }
        else if (t.closest('#btn-pattern-auto')) { try { patRandomize(PATTERN_CFG); patApply(PATTERN_CFG); } catch (err) { console.error(err); toast(`Auto-Pattern: ${err.message}`, 'error'); } }
      });
    })();

    function quantizeMidiNoteToScale(midi, root, scaleKey) {
      const intervals = SCALES[scaleKey] || SCALES.chromatic;
      if (intervals.length === 12) return midi;
      const pitchClass = ((midi - root) % 12 + 12) % 12;
      let closest = intervals[0];
      let minDiff = 99;
      for (const iv of intervals) {
        const diff = Math.abs(iv - pitchClass);
        if (diff < minDiff) {
          minDiff = diff;
          closest = iv;
        }
      }
      const octaveBase = midi - pitchClass;
      return Math.max(36, Math.min(71, octaveBase + closest));
    }
