    /* ===== SpessaSynth-Engine (hochwertige SoundFont-Wiedergabe) =====
       Der SpessaSynth-Core steckt inline in dieser Datei (Block #spessa-core-src am Dateiende).
       Live: ein AudioWorklet pro SoundFont (16 Stereo-Ausgänge, MIDI-Kanal ↔ DAW-Spur) → jede Spur behält
       FX-Rack, Fader, Pan und Section-Gate. Export: derselbe Renderer läuft offline im Hauptthread.
       Fallback-Kette: SpessaSynth → eigener einfacher SF2-Player (sfPlay) → globaler Synth. */
    const SpessaEngine = (() => {
      const LS_KEY = 'sunshine.spessa.enabled';
      let enabled = true;
      try { if (localStorage.getItem(LS_KEY) === '0') enabled = false; } catch (_) {}
      const hosts = {};            // fontId -> Host { ctx, node, ready, failed, routes[16], owners[16], prog[16] }
      const pending = {};          // fontId -> Promise
      const modules = new WeakMap();
      const said = {};
      let unavailable = '';        // dauerhafte Ursache (z. B. AudioWorklet fehlt / Blob blockiert)
      let mainRunnerClass = null;

      const srcOf = id => { const e = document.getElementById(id); return e ? e.textContent : ''; };
      const hasBundle = () => srcOf('spessa-core-src').length > 1000;
      const once = (key, fn) => { if (said[key]) return; said[key] = 1; try { fn(); } catch (_) {} };
      const errMsg = e => (e && e.message ? e.message : String(e));

      async function sfReadRaw(id) {
        const db = await sfOpenDb();
        const buf = await sfReq(db.transaction('data').objectStore('data').get(id));
        if (!buf) throw new Error('SoundFont-Daten nicht gefunden.');
        return buf;
      }

      function loadModule(ctx) {
        let p = modules.get(ctx);
        if (!p) {
          p = (async () => {
            if (!hasBundle()) throw new Error('SpessaSynth-Code fehlt in dieser Datei.');
            if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') throw new Error('AudioWorklet wird von diesem Browser nicht unterstützt.');
            const code = srcOf('spessa-core-src') + '\n' + srcOf('spessa-runner-src') + '\n' + srcOf('spessa-worklet-src');
            const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
            try { await ctx.audioWorklet.addModule(url); }
            catch (blobErr) {
              // Ohne echte Origin (z. B. file:///android_asset/…) sind Blob-Module gesperrt → zweiter Versuch per data:-URL.
              console.warn('[SpessaSynth] Blob-Worklet nicht möglich, versuche data:-URL …', blobErr);
              const bytes = new TextEncoder().encode(code); let bin = '';
              for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
              await ctx.audioWorklet.addModule('data:text/javascript;base64,' + btoa(bin));
            } finally { URL.revokeObjectURL(url); }
          })();
          modules.set(ctx, p);
        }
        return p;
      }

      function dispose(fontId) {
        const h = hosts[fontId];
        if (h && h.node) { try { h.node.port.postMessage({ type: 'panic' }); h.node.disconnect(); h.node.port.onmessage = null; } catch (_) {} }
        delete hosts[fontId];
        delete pending[fontId];
      }

      async function createHost(ctx, sf) {
        try { await loadModule(ctx); }
        catch (err) { const e = new Error(errMsg(err)); e.permanent = true; throw e; }
        const node = new AudioWorkletNode(ctx, 'spessa-host', { numberOfInputs: 0, numberOfOutputs: 16, outputChannelCount: new Array(16).fill(2) });
        const host = { fontId: sf.font, ctx, node, ready: false, failed: false, routes: new Array(16).fill(null), owners: new Array(16).fill(null), prog: new Array(16).fill('') };
        let done;
        const loaded = new Promise(res => { done = res; });
        node.port.onmessage = e => {
          const m = e.data || {};
          if (m.type === 'loaded') { host.ready = true; done(true); }
          else if (m.type === 'error') {
            host.failed = true; done(false);
            console.error('[SpessaSynth]', m.message);
            once('err:' + sf.font + ':' + m.message, () => toast(`${m.message} – einfacher SoundFont-Player wird verwendet.`, 'error'));
          }
        };
        node.onprocessorerror = () => {
          host.failed = true; done(false);
          once('perr:' + sf.font, () => toast('SpessaSynth-Audiothread ist abgestürzt – einfacher SoundFont-Player wird verwendet.', 'error'));
        };
        const buf = await sfReadRaw(sf.font);
        node.port.postMessage({ type: 'load', id: sf.font, buffer: buf }, [buf]);
        await loaded;
        return host;
      }

      /* Startet (falls nötig) das Laden; liefert den Host, sobald er existiert (sonst null). */
      function prepare(ctx, sf) {
        if (!enabled || !sf || !sf.font || !ctx || unavailable) return null;
        const h = hosts[sf.font];
        if (h) { if (h.ctx === ctx) return h; dispose(sf.font); }
        if (!pending[sf.font]) {
          once('load:' + sf.font, () => toast('SpessaSynth lädt den SoundFont …', 'info'));
          pending[sf.font] = createHost(ctx, sf).then(host => {
            delete pending[sf.font];
            hosts[sf.font] = host;
            if (host.ready) once('ready:' + sf.font, () => toast(`SpessaSynth bereit: ${sf.fontName || 'SoundFont'}`, 'success'));
            return host;
          }).catch(err => {
            delete pending[sf.font];
            console.error('[SpessaSynth]', err);
            if (err && err.permanent) {
              unavailable = errMsg(err);
              once('unavail', () => toast(`SpessaSynth nicht verfügbar: ${unavailable} – einfacher SoundFont-Player wird verwendet.`, 'warn'));
            } else {
              hosts[sf.font] = { failed: true, ctx, fontId: sf.font };
              once('hfail:' + sf.font, () => toast(`SpessaSynth konnte den SoundFont nicht laden: ${errMsg(err)} – einfacher Player wird verwendet.`, 'warn'));
            }
            return null;
          });
        }
        return null;
      }

      function channelFor(host, trackId) {
        let ch = host.owners.indexOf(trackId);
        if (ch >= 0) return ch;
        host.owners.forEach((id, i) => { if (id && !dawState.tracks.some(t => t.id === id)) { host.owners[i] = null; host.prog[i] = ''; } });
        ch = host.owners.indexOf(null);
        if (ch < 0) return -1;
        host.owners[ch] = trackId;
        host.prog[ch] = '';
        return ch;
      }

      function route(host, ch, dest) {
        if (host.routes[ch] === dest) return;
        try { if (host.routes[ch]) host.node.disconnect(host.routes[ch], ch); } catch (_) {}
        try { host.node.connect(dest, ch); host.routes[ch] = dest; }
        catch (err) { console.warn('[SpessaSynth] Routing fehlgeschlagen:', err); host.routes[ch] = null; }
      }

      /* ---------- Offline (WAV-Export) ---------- */
      function getMainRunner() {
        if (mainRunnerClass) return mainRunnerClass;
        if (!globalThis.SpessaCore) new Function(srcOf('spessa-core-src'))();
        mainRunnerClass = new Function(srcOf('spessa-runner-src') + '\nreturn SpessaRunner;')();
        return mainRunnerClass;
      }
      function record(ctx, ref, dest, time, note, vel, dur, opts) {
        const rec = ctx.__spessaRec || (ctx.__spessaRec = []);
        rec.push({ ref, dest, time, note, vel, dur, fb: Object.assign({}, opts, { spessaRef: null }) });
      }

      async function renderOffline(ctx) {
        const items = ctx.__spessaRec;
        if (!items || !items.length) return 0;
        delete ctx.__spessaRec;
        const byFont = {};
        items.forEach(it => { (byFont[it.ref.font] = byFont[it.ref.font] || []).push(it); });
        const sr = ctx.sampleRate;
        let rendered = 0;
        for (const fontId of Object.keys(byFont)) {
          const group = byFont[fontId].sort((a, b) => a.time - b.time);
          const fallback = () => group.forEach(it => { try { synthMidiVoice(ctx, it.dest, it.time, it.fb); } catch (e) { console.warn(e); } });
          try {
            const Runner = getMainRunner();
            const runner = new Runner(sr, 0);
            await runner.loadFont(await sfReadRaw(fontId));
            // Kanäle je Spur
            const chOf = {}; const chs = [];
            for (const it of group) {
              if (chOf[it.ref.trackId] === undefined) { if (chs.length >= 16) continue; chOf[it.ref.trackId] = chs.length; chs.push({ trackId: it.ref.trackId, dest: it.dest, key: '' }); }
            }
            let lastEnd = 0;
            for (const it of group) {
              const ci = chOf[it.ref.trackId]; if (ci === undefined) { try { synthMidiVoice(ctx, it.dest, it.time, it.fb); } catch (_) {} continue; }
              const key = it.ref.bank + ':' + it.ref.preset;
              if (chs[ci].key !== key) { runner.insert({ k: 'prog', t: it.time, ch: ci, bank: it.ref.bank, preset: it.ref.preset, drums: it.ref.bank === 128 }); chs[ci].key = key; }
              runner.insert({ k: 'on', t: it.time, ch: ci, note: it.note, vel: it.vel });
              runner.insert({ k: 'off', t: it.time + it.dur, ch: ci, note: it.note });
              lastEnd = Math.max(lastEnd, it.time + it.dur);
            }
            const frames = Math.min(ctx.length, Math.ceil((lastEnd + 3) * sr));
            const outs = Array.from({ length: 16 }, () => [new Float32Array(128), new Float32Array(128)]);
            const bufs = chs.map(() => [new Float32Array(frames), new Float32Array(frames)]);
            let q = 0;
            for (let pos = 0; pos < frames; pos += 128, q++) {
              const n = Math.min(128, frames - pos);
              if (!runner.idle) {
                for (let k = 0; k < chs.length; k++) { outs[k][0].fill(0); outs[k][1].fill(0); }
                runner.render(pos / sr, outs, n);
                for (let k = 0; k < chs.length; k++) { bufs[k][0].set(outs[k][0].subarray(0, n), pos); bufs[k][1].set(outs[k][1].subarray(0, n), pos); }
              }
              if ((q & 511) === 511) await new Promise(r => setTimeout(r, 0)); // UI atmen lassen
            }
            chs.forEach((c, k) => {
              const ab = ctx.createBuffer(2, frames, sr);
              ab.copyToChannel(bufs[k][0], 0); ab.copyToChannel(bufs[k][1], 1);
              const src = ctx.createBufferSource(); src.buffer = ab; src.connect(c.dest); src.start(0);
            });
            rendered += chs.length;
          } catch (err) {
            console.error('[SpessaSynth] Export-Rendering fehlgeschlagen, einfacher Player springt ein:', err);
            once('expfail:' + fontId, () => toast(`SpessaSynth-Export fehlgeschlagen (${errMsg(err)}) – einfacher Player wird verwendet.`, 'warn'));
            fallback();
          }
        }
        return rendered;
      }

      /* ---------- Öffentliche API ---------- */
      function play(ctx, dest, time, opts) {
        if (!enabled) return false;
        const ref = opts.spessaRef;
        if (!ref || !ref.font) return false;
        const note = opts.midiNote | 0;
        const vel = Math.max(1, Math.min(127, Math.round((opts.velocity ?? 0.85) * 127)));
        const dur = Math.max(0.03, opts.durationSec || 0.25);
        if (ctx === audioEngine.ctx) {
          const h = prepare(ctx, ref);
          if (!h || !h.ready || h.failed) return false;
          const ch = channelFor(h, ref.trackId);
          if (ch < 0) { once('nochan:' + ref.font, () => toast('SpessaSynth: mehr als 16 Spuren mit demselben SoundFont – weitere nutzen den einfachen Player.', 'warn')); return false; }
          route(h, ch, dest);
          const port = h.node.port, key = ref.bank + ':' + ref.preset;
          if (h.prog[ch] !== key) { port.postMessage({ type: 'ev', k: 'prog', t: time, ch, bank: ref.bank, preset: ref.preset, drums: ref.bank === 128 }); h.prog[ch] = key; }
          port.postMessage({ type: 'ev', k: 'on', t: time, ch, note, vel });
          port.postMessage({ type: 'ev', k: 'off', t: time + dur, ch, note });
          return true;
        }
        if (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext && hasBundle()) {
          record(ctx, ref, dest, time, note, vel, dur, opts);
          return true;
        }
        return false;
      }
      function isReady(sf) {
        const h = sf && sf.font ? hosts[sf.font] : null;
        return !!(enabled && h && h.ready && !h.failed && h.ctx === audioEngine.ctx);
      }
      function panic() { Object.values(hosts).forEach(h => { try { h.node && h.node.port.postMessage({ type: 'panic' }); } catch (_) {} }); }
      function prepareAll() {
        if (!audioEngine.ctx) return;
        dawState.tracks.forEach(t => { if (t.instrument === 'sf' && t.sf) prepare(audioEngine.ctx, t.sf); });
      }
      async function whenReady(sf, ms) {
        const ctx = audioEngine.ctx;
        prepare(ctx, sf);
        const t0 = performance.now();
        while (performance.now() - t0 < (ms || 5000)) {
          const h = hosts[sf.font];
          if (h && (h.ready || h.failed)) return !!(h.ready && !h.failed);
          if (unavailable || !enabled) return false;
          await new Promise(r => setTimeout(r, 60));
        }
        return false;
      }
      function status(sf) {
        if (!hasBundle()) return { state: 'na', text: 'nicht eingebaut' };
        if (!enabled) return { state: 'off', text: 'aus – einfacher Player' };
        if (unavailable) return { state: 'na', text: `nicht verfügbar (${unavailable}) – einfacher Player` };
        const h = sf && sf.font ? hosts[sf.font] : null;
        if (sf && sf.font && pending[sf.font]) return { state: 'loading', text: 'lädt SoundFont …' };
        if (h && h.failed) return { state: 'fail', text: 'SoundFont nicht ladbar – einfacher Player' };
        if (h && h.ready) return { state: 'ready', text: 'aktiv' };
        return { state: 'idle', text: 'startet bei Bedarf' };
      }
      function setEnabled(on) {
        enabled = !!on;
        try { localStorage.setItem(LS_KEY, enabled ? '1' : '0'); } catch (_) {}
        if (!enabled) panic();
      }
      const sf3Supported = () => /^\/\*SPESSA_BUILD[^*]*vorbis=true/.test(srcOf('spessa-core-src').slice(0, 160));
      return { play, panic, prepare, prepareAll, isReady, whenReady, status, setEnabled, dispose, renderOffline, sf3Supported, get enabled() { return enabled; }, hasBundle };
    })();

    /* Instrument-Auswahl pro MIDI-Spur (zentral per change-Event, überlebt jeden Neuaufbau der Spurliste). */
    (function installInstrumentSelect() {
      if (window.__instSelectInstalled) return;
      window.__instSelectInstalled = true;
      document.addEventListener('change', async e => {
        const sel = e.target instanceof Element ? e.target.closest('.tr-inst-select') : null;
        if (!sel) return;
        try {
          const tr = dawState.tracks.find(t => t.id === sel.dataset.inst);
          if (!tr) throw new Error('Spur nicht gefunden.');
          if (sel.value === '__sf_pick') { sel.value = tr.instrument || 'global'; openSoundFontPicker(tr); return; }
          if (sel.value === 'sf') return;
          if (!INSTRUMENT_CATALOG[sel.value]) throw new Error('Unbekanntes Instrument.');
          if (window.__dawPushUndo) window.__dawPushUndo();
          tr.instrument = sel.value;
          toast(`Instrument für „${tr.name}“: ${INSTRUMENT_CATALOG[sel.value].name}`, 'info');
          await audioEngine.ensureCtx();
          audioEngine.ensureTrackNode(tr);
          auditionMidiNote(60, 0.55, 0.85, tr); // Hörprobe (C4)
        } catch (err) {
          console.error('[Instrument]', err);
          toast(`Instrument konnte nicht gesetzt werden: ${err && err.message ? err.message : err}`, 'error');
        }
      }, true);
    })();

    class ProDawAudioEngine {
      constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.masterLimiter = null;
        this.masterAnalyser = null;
        this.reverbConvolver = null;
        this.reverbReturn = null;
        this.noiseBuffer = null;

        this.channelNodes = {};
        this.activeStemSources = [];

        this.timerId = null;
        this.nextStepTime = 0;
        this.stepCounter32 = 0;
        this.playStartCtxTime = 0;
        this.playStartOffsetSec = 0;

        // Mic Recording
        this.micStream = null;
        this.micSrcNode = null;
        this.micAnalyser = null;
        this.micProcNode = null;
        this.micChunksL = [];
        this.micChunksR = [];
      }

      async ensureCtx() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
          this.buildMasterGraph();
        }
        if (this.ctx.state === 'suspended') {
          await this.ctx.resume();
        }
        return this.ctx;
      }

      buildMasterGraph() {
        const ctx = this.ctx;
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = dawState.masterGainVal;

        this.masterLimiter = ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.value = -1.0;
        this.masterLimiter.knee.value = 2;
        this.masterLimiter.ratio.value = 16;
        this.masterLimiter.attack.value = 0.0015;
        this.masterLimiter.release.value = 0.07;

        this.masterAnalyser = ctx.createAnalyser();
        this.masterAnalyser.fftSize = 256;
        this.masterAnalyser.smoothingTimeConstant = 0.82;

        this.masterGain.connect(this.masterLimiter);
        this.masterLimiter.connect(this.masterAnalyser);
        this.masterAnalyser.connect(ctx.destination);

        // Stereo Convolution Reverb
        this.reverbConvolver = ctx.createConvolver();
        this.reverbConvolver.buffer = createStereoImpulse(ctx, 1.7, 2.5);
        this.reverbReturn = ctx.createGain();
        this.reverbReturn.gain.value = dawState.vocalReverbWet;
        this.reverbConvolver.connect(this.reverbReturn);
        this.reverbReturn.connect(this.masterGain);

        this.noiseBuffer = createWhiteNoiseBuffer(ctx, 4.0);

        dawState.tracks.forEach(tr => this.ensureTrackNode(tr));
        this.syncAudioParams();
      }

      ensureTrackNode(track) {
        if (!this.ctx || this.channelNodes[track.id]) return;
        const ctx = this.ctx;

        const input = ctx.createGain();
        const lowCut = ctx.createBiquadFilter();
        lowCut.type = 'highpass';
        lowCut.Q.value = 0.85;
        lowCut.frequency.value = track.lowCut ? dawState.lowCutFreq : 10;

        let postFilter = lowCut;
        let vocalChain = null;
        let revSend = null;

        if (track.type === 'audio' || track.type === 'stem' || track.type === 'mic') {
          const vcOn = dawState.vocalRackActive && (track.vocalCleanup || track.type === 'mic');
          const deHarsh = ctx.createBiquadFilter();
          deHarsh.type = 'peaking';
          deHarsh.frequency.value = 4800;
          deHarsh.Q.value = 1.9;
          deHarsh.gain.value = vcOn ? -dawState.vocalDeHarshDb : 0;

          const presence = ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.value = 3500;
          presence.Q.value = 1.4;
          presence.gain.value = vcOn ? dawState.vocalPresenceDb : 0;

          const deEsser = ctx.createBiquadFilter();
          deEsser.type = 'highshelf';
          deEsser.frequency.value = 8500;
          deEsser.gain.value = vcOn ? -dawState.vocalDeEssDb : 0;

          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -19;
          comp.knee.value = 5;
          comp.ratio.value = vcOn ? dawState.vocalCompRatio : 1;
          comp.attack.value = 0.004;
          comp.release.value = 0.085;

          lowCut.connect(deHarsh);
          deHarsh.connect(presence);
          presence.connect(deEsser);
          deEsser.connect(comp);

          postFilter = comp;
          vocalChain = { deHarsh, presence, deEsser, comp };
        }

        // Individuelle Effektkette pro Spur (wird im Spur-FX-Rack bearbeitet)
        const fxNodes = [];
        let fxInput = ctx.createGain();
        postFilter.connect(fxInput);
        let fxTail = fxInput;
        (track.fx || []).forEach(effect => {
          if (!effect.enabled) return;
          const built = buildTrackEffect(ctx, effect);
          if (!built) return;
          if (built.input) fxTail.connect(built.input);
          else fxTail.connect(built.node);
          fxTail = built.output || built.node;
          fxNodes.push({ id: effect.id, ...built });
        });

        const scGain = ctx.createGain();
        scGain.gain.value = 1.0;
        fxTail.connect(scGain);

        const sectionGate = ctx.createGain();
        sectionGate.gain.value = 1.0;

        const panner = ctx.createStereoPanner();
        panner.pan.value = track.pan;

        const fader = ctx.createGain();
        fader.gain.value = track.vol;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;

        input.connect(lowCut);
        scGain.connect(sectionGate);
        sectionGate.connect(panner);
        panner.connect(fader);
        fader.connect(analyser);
        analyser.connect(this.masterGain);

        if (track.type === 'audio' || track.type === 'stem' || track.type === 'mic') {
          revSend = ctx.createGain();
          revSend.gain.value = (dawState.vocalRackActive && (track.vocalCleanup || track.type === 'mic')) ? 1.0 : 0.0;
          fader.connect(revSend);
          revSend.connect(this.reverbConvolver);
        }

        this.channelNodes[track.id] = {
          input, lowCut, scGain, sectionGate, panner, fader, analyser, vocalChain, revSend, fxInput, fxNodes
        };
      }

      syncAudioParams() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const anySolo = dawState.tracks.some(t => t.solo);

        if (this.masterGain) {
          this.masterGain.gain.setTargetAtTime(dawState.masterGainVal, now, 0.015);
        }
        if (this.reverbReturn) {
          const hasTrackReverb = dawState.tracks.some(t => (t.fx || []).some(fx => fx.type === 'reverb' && fx.enabled));
          this.reverbReturn.gain.setTargetAtTime(dawState.vocalRackActive ? dawState.vocalReverbWet : (hasTrackReverb ? 1 : 0), now, 0.02);
        }

        dawState.tracks.forEach(tr => {
          this.ensureTrackNode(tr);
          const node = this.channelNodes[tr.id];
          if (!node) return;

          const audible = anySolo ? tr.solo : !tr.mute;
          node.fader.gain.setTargetAtTime(audible ? tr.vol : 0, now, 0.015);
          node.panner.pan.setTargetAtTime(tr.pan, now, 0.015);

          if (tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') {
            const vcOn = dawState.vocalRackActive && (tr.vocalCleanup || tr.type === 'mic');
            const hpfFreq = (vcOn && tr.lowCut) ? dawState.vocalHpfHz : (tr.lowCut ? dawState.lowCutFreq : 10);
            node.lowCut.frequency.setTargetAtTime(hpfFreq, now, 0.02);
            if (node.vocalChain) {
              node.vocalChain.deHarsh.gain.setTargetAtTime(vcOn ? -dawState.vocalDeHarshDb : 0, now, 0.02);
              node.vocalChain.presence.gain.setTargetAtTime(vcOn ? dawState.vocalPresenceDb : 0, now, 0.02);
              node.vocalChain.deEsser.gain.setTargetAtTime(vcOn ? -dawState.vocalDeEssDb : 0, now, 0.02);
              node.vocalChain.comp.ratio.setTargetAtTime(vcOn ? dawState.vocalCompRatio : 1, now, 0.02);
            }
            if (node.revSend) {
              node.revSend.gain.setTargetAtTime(vcOn ? 1.0 : 0.0, now, 0.02);
            }
          } else {
            const freq = tr.lowCut ? dawState.lowCutFreq : 10;
            node.lowCut.frequency.setTargetAtTime(freq, now, 0.02);
          }
        });
      }

      // Summe der Arrangement-Abschnitte (Intro, Verse, ...) in Takten
      getSectionBarsSum() {
        return dawState.sections.reduce((acc, s) => acc + s.bars, 0);
      }

      // Länge der längsten geladenen Audiodatei in Sekunden (abzüglich Trim)
      getContentDurationSec() {
        const trimSec = dawState.startOffsetMs / 1000;
        let longest = 0;
        dawState.tracks.forEach(tr => {
          const buf = dawState.buffers[tr.id];
          if (buf) longest = Math.max(longest, buf.duration - trimSec);
        });
        return Math.max(0, longest);
      }

      // Gesamtlänge der Zeitleiste in Takten: mindestens das Arrangement,
      // bei längeren Audiodateien automatisch so viele Takte, dass alles hineinpasst.
      getTotalArrangementBars() {
        const base = this.getSectionBarsSum();
        const barSec = 4 * (60 / dawState.bpm);
        const needed = Math.ceil(this.getContentDurationSec() / barSec - 0.001);
        return Math.max(base, needed);
      }

      getSectionAtBar(barIdx) {
        const total = this.getTotalArrangementBars();
        const extra = total - this.getSectionBarsSum(); // Verlängerung gehört zum letzten Abschnitt
        const lastIdx = dawState.sections.length - 1;
        const wrappedBar = ((barIdx % total) + total) % total;
        let cursor = 0;
        for (let i = 0; i < dawState.sections.length; i++) {
          const sec = dawState.sections[i];
          const span = sec.bars + (i === lastIdx ? extra : 0);
          if (wrappedBar >= cursor && wrappedBar < cursor + span) {
            return { section: sec, barInSection: wrappedBar - cursor };
          }
          cursor += span;
        }
        return { section: dawState.sections[0], barInSection: 0 };
      }

      async play() {
        await this.ensureCtx();
        if (dawState.isPlaying) return;
        try { SpessaEngine.prepareAll(); } catch (_) {}

        dawState.isPlaying = true;
        updatePlayButtonUI();

        const now = this.ctx.currentTime;
        this.playStartCtxTime = now;
        this.playStartOffsetSec = dawState.playheadSec;

        const secPer16th = (60 / dawState.bpm) / 4;
        const float16th = dawState.playheadSec / secPer16th;
        this.stepCounter32 = Math.floor(float16th);
        const frac = float16th - this.stepCounter32;
        this.nextStepTime = now - frac * secPer16th;

        this.startAudioStemSources(now, dawState.playheadSec);
        this.timerId = setInterval(() => this.schedulerLoop(), 22);
      }

      stop(resetZero = true) {
        dawState.isPlaying = false;
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
        }
        this.stopAudioStemSources();
        try { SpessaEngine.panic(); } catch (_) {}

        if (resetZero) {
          dawState.playheadSec = 0;
          dawState.currentStep16 = -1;
          updateStepHighlightUI(-1);
        }
        updatePlayButtonUI();
        renderAllTrackCanvases();
        drawPianoRoll();
      }

      seek(sec) {
        const wasPlaying = dawState.isPlaying;
        if (wasPlaying) this.stop(false);
        dawState.playheadSec = Math.max(0, sec);
        updateClockLCD();
        renderAllTrackCanvases();
        drawPianoRoll();
        if (wasPlaying) this.play();
      }

      startAudioStemSources(ctxStart, offsetTimelineSec) {
        this.stopAudioStemSources();
        this.lastStemBoundary = null;
        const totalArrSec = this.getTotalArrangementBars() * 4 * (60 / dawState.bpm);
        const offset = dawState.isLooping ? (offsetTimelineSec % totalArrSec) : offsetTimelineSec;
        const stopAt = dawState.isLooping ? ctxStart + (totalArrSec - offset) : null;
        this.scheduleStemPass(ctxStart, offset, stopAt);
      }

      // Startet alle Audiospuren zum Zeitpunkt `when` ab Zeitleisten-Position `offsetSec`.
      scheduleStemPass(when, offsetSec, stopAt) {
        const trimSec = dawState.startOffsetMs / 1000;
        const barSec = 4 * (60 / dawState.bpm);
        const totalArrSec = this.getTotalArrangementBars() * barSec;

        dawState.tracks.forEach(tr => {
          const buf = dawState.buffers[tr.id];
          const node = this.channelNodes[tr.id];
          if (!buf || !node) return;

          const usable = Math.max(0.1, buf.duration - trimSec);
          // Nur deutlich kürzere Samples (> 1 Takt kürzer als die Zeitleiste) wiederholen sich selbst
          const loopInside = dawState.isLooping && usable < totalArrSec - barSec;

          let posInBuf;
          if (loopInside) {
            posInBuf = trimSec + (offsetSec % usable);
          } else {
            if (offsetSec >= usable) return;
            posInBuf = trimSec + offsetSec;
          }
          if (posInBuf >= buf.duration) return;

          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.connect(node.input); // Quelle in die Kanalkette (Filter → Fader → Master) einspeisen
          if (loopInside) {
            src.loop = true;
            src.loopStart = trimSec;
            src.loopEnd = buf.duration;
          }
          src.onended = () => {
            this.activeStemSources = this.activeStemSources.filter(x => x !== src);
            try { src.disconnect(); } catch (e) {}
          };
          src.start(when, posInBuf);
          if (stopAt != null) src.stop(stopAt);
          this.activeStemSources.push(src);
        });
      }

      stopAudioStemSources() {
        this.activeStemSources.forEach(src => {
          try { src.onended = null; src.stop(); src.disconnect(); } catch (e) {}
        });
        this.activeStemSources = [];
      }

      schedulerLoop() {
        if (!dawState.isPlaying || !this.ctx) return;

        const secPer16th = (60 / dawState.bpm) / 4;
        const lookaheadSec = 0.11;
        const totalBars = this.getTotalArrangementBars();
        const totalArrSec = totalBars * 4 * (60 / dawState.bpm);

        const elapsed = this.ctx.currentTime - this.playStartCtxTime;
        let currentTimeline = this.playStartOffsetSec + elapsed;

        if (dawState.isLooping && currentTimeline >= totalArrSec) {
          const loops = Math.floor(currentTimeline / totalArrSec);
          this.playStartCtxTime += loops * totalArrSec - this.playStartOffsetSec;
          this.playStartOffsetSec = 0;
          currentTimeline = currentTimeline % totalArrSec;
        }
        dawState.playheadSec = currentTimeline;

        // Audio-Spuren für die nächste Loop-Runde sample-genau vorplanen
        if (dawState.isLooping) {
          const boundary = this.playStartCtxTime + (totalArrSec - this.playStartOffsetSec);
          if (boundary - this.ctx.currentTime < lookaheadSec + 0.1 && this.lastStemBoundary !== boundary) {
            this.lastStemBoundary = boundary;
            this.scheduleStemPass(boundary, 0, boundary + totalArrSec);
          }
        }

        while (this.nextStepTime < this.ctx.currentTime + lookaheadSec) {
          const step32 = this.stepCounter32 % 32;
          const step16 = this.stepCounter32 % 16;
          const barIdx = Math.floor(this.stepCounter32 / 16);

          this.scheduleStep(this.nextStepTime, step32, step16, barIdx, secPer16th);

          const uiDelay = Math.max(0, (this.nextStepTime - this.ctx.currentTime) * 1000);
          setTimeout(() => {
            if (dawState.isPlaying) {
              dawState.currentStep16 = step16;
              updateStepHighlightUI(step16);
            }
          }, uiDelay);

          this.nextStepTime += secPer16th;
          this.stepCounter32++;
        }
      }

      scheduleStep(time, step32, step16, barIdx, secPer16th) {
        const { section, barInSection } = this.getSectionAtBar(barIdx);

        // Apply Section Clip Gating per Track
        dawState.tracks.forEach(tr => {
          const node = this.channelNodes[tr.id];
          if (node) {
            const activeInSec = tr.sectionClips[section.id] !== false;
            node.sectionGate.gain.setTargetAtTime(activeInSec ? 1.0 : 0.0, time, 0.008);
          }
        });

        // 1. Metronome
        if (dawState.metronomeOn && step16 % 4 === 0) {
          synthMetronome(this.ctx, this.masterGain, time, step16 === 0);
        }

        // 2. Kick / Perc Tracks + Sidechain Ducking
        const kickTracks = dawState.tracks.filter(t => t.type === 'kick' || t.id === 'ownKick');
        let anyKickFired = false;
        kickTracks.forEach(ktr => {
          const node = this.channelNodes[ktr.id];
          const kActive = node && ktr.sectionClips[section.id] !== false && !ktr.mute;
          if (!kActive) return;
          if (dawState.seqKick[step16]) {
            anyKickFired = true;
            synthKick(this.ctx, node.input, time, {
              tuneHz: dawState.kickTuneHz,
              punch: dawState.kickPunch,
              decayMs: dawState.kickDecayMs
            });
          }
          if (dawState.seqHat[step16]) {
            synthHatClap(this.ctx, node.input, this.noiseBuffer, time, step16);
          }
        });

        if (anyKickFired) {
          const scBass = dawState.scDepth / 100;
          const scMidi = dawState.synthScAmount / 100;
          const relSec = dawState.scReleaseMs / 1000;

          if (scBass > 0.01) {
            const minG = Math.max(0.05, 1 - scBass * 0.92);
            dawState.tracks
              .filter(t => t.type === 'bass' || ((t.type === 'audio' || t.type === 'stem') && !t.vocalCleanup))
              .forEach(t => {
                const g = this.channelNodes[t.id]?.scGain;
                if (!g) return;
                g.gain.cancelScheduledValues(time);
                g.gain.setValueAtTime(1.0, time);
                g.gain.linearRampToValueAtTime(minG, time + 0.007);
                g.gain.exponentialRampToValueAtTime(1.0, time + 0.012 + relSec);
              });
            dawState.lastDuckTime = performance.now();
            dawState.lastDuckDb = scBass * 18;
          }

          if (scMidi > 0.01) {
            const minG = Math.max(0.05, 1 - scMidi * 0.92);
            dawState.tracks.filter(t => t.type === 'midi').forEach(t => {
              const g = this.channelNodes[t.id]?.scGain;
              if (!g) return;
              g.gain.cancelScheduledValues(time);
              g.gain.setValueAtTime(1.0, time);
              g.gain.linearRampToValueAtTime(minG, time + 0.007);
              g.gain.exponentialRampToValueAtTime(1.0, time + 0.012 + relSec);
            });
          }
        }

        // 3. Bass / 808 Tracks
        dawState.tracks.filter(t => t.type === 'bass' || t.id === 'ownBass').forEach(btr => {
          const node = this.channelNodes[btr.id];
          if (node && btr.sectionClips[section.id] !== false && dawState.seqBass[step16]) {
            const pitchOff = dawState.seqBassPitch[step16] || 0;
            synthBass808(this.ctx, node.input, time, {
              rootNote: dawState.midiRoot,
              pitchOffset: pitchOff,
              mode: dawState.bassMode,
              glide: dawState.bassGlide,
              drive: dawState.bassDrive,
              stepDur: secPer16th
            });
          }
        });

        // 4. MIDI Synth Tracks
        dawState.tracks.filter(t => t.type === 'midi' || t.id === 'midiSynth').forEach(mtr => {
          const node = this.channelNodes[mtr.id];
          if (!node || mtr.sectionClips[section.id] === false) return;
          const notes = mtr.id === dawState.activeMidiTrackId ? dawState.midiNotes : (mtr.midiNotes || []);
          const vels = mtr.id === dawState.activeMidiTrackId ? dawState.stepVelocities : (mtr.stepVelocities || dawState.stepVelocities);
          notes.filter(n => n.start === step32).forEach(note => {
            const vel = (vels[step32] || note.vel || 105) / 127;
            const durSec = Math.max(0.06, note.dur * secPer16th * 0.95);
            synthMidiVoice(this.ctx, node.input, time, midiVoiceOpts(mtr, { midiNote: note.pitch, durationSec: durSec, velocity: vel }));
          });
        });

        // 5. FX & Transitions Tracks
        dawState.tracks.filter(t => t.type === 'fx' || t.id === 'fxTrack').forEach(ftr => {
          const node = this.channelNodes[ftr.id];
          if (!node || ftr.sectionClips[section.id] === false) return;
          if (dawState.seqFx[step16]) {
            if (step16 === 0) synthSubImpact(this.ctx, node.input, this.noiseBuffer, time);
            else if (step16 === 8) synthNoiseRiser(this.ctx, node.input, this.noiseBuffer, time, secPer16th * 8);
            else synthReverseCrash(this.ctx, node.input, this.noiseBuffer, time, secPer16th * 4);
          }
          if (dawState.autoDropFx) {
            if (section.id === 'verse' && barInSection === section.bars - 2 && step16 === 0) {
              synthNoiseRiser(this.ctx, node.input, this.noiseBuffer, time, secPer16th * 32);
            }
            if (section.id === 'drop' && barInSection === 0 && step16 === 0) {
              synthSubImpact(this.ctx, node.input, this.noiseBuffer, time);
            }
          }
        });
      }

      /**
       * Live Microphone Recording for Track 08
       */
      async toggleMicRecording(targetTrackId = null) {
        await this.ensureCtx();
        if (dawState.isRecordingMic) {
          this.stopMicRecording();
          return;
        }
        const micTr = (targetTrackId && dawState.tracks.find(t => t.id === targetTrackId))
          || dawState.tracks.find(t => t.type === 'mic');
        if (!micTr) {
          toast('Bitte zuerst über „+ Neue Spur“ eine Mikrofon-Spur erstellen.', 'warn');
          return;
        }
        dawState.recordingMicTrackId = micTr.id;

        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          });
          this.micChunksL = [];
          this.micChunksR = [];

          this.micSrcNode = this.ctx.createMediaStreamSource(this.micStream);
          this.micAnalyser = this.ctx.createAnalyser();
          this.micAnalyser.fftSize = 256;

          this.micProcNode = this.ctx.createScriptProcessor(2048, 2, 2);
          this.micProcNode.onaudioprocess = (e) => {
            if (!dawState.isRecordingMic) return;
            const inL = e.inputBuffer.getChannelData(0);
            const inR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inL;
            this.micChunksL.push(new Float32Array(inL));
            this.micChunksR.push(new Float32Array(inR));
          };

          const silentZero = this.ctx.createGain();
          silentZero.gain.value = 0;

          this.micSrcNode.connect(this.micAnalyser);
          this.micSrcNode.connect(this.micProcNode);
          this.micProcNode.connect(silentZero);
          silentZero.connect(this.ctx.destination);

          if (dawState.micCountIn && !dawState.isPlaying) {
            const beatSec = 60 / dawState.bpm;
            for (let b = 0; b < 4; b++) {
              synthMetronome(this.ctx, this.masterGain, this.ctx.currentTime + b * beatSec, b === 0);
            }
            toast('Vorzähler (4 Beats)...', 'info');
            setTimeout(() => {
              dawState.isRecordingMic = true;
              dawState.micRecStartTime = performance.now();
              updateMicUI();
              if (!dawState.isPlaying) this.play();
              toast(`Mikrofon-Aufnahme läuft auf ${micTr.num} | ${micTr.name}!`, 'warn');
            }, beatSec * 4 * 1000);
          } else {
            dawState.isRecordingMic = true;
            dawState.micRecStartTime = performance.now();
            updateMicUI();
            if (!dawState.isPlaying) this.play();
            toast(`Mikrofon-Aufnahme läuft auf ${micTr.num} | ${micTr.name}!`, 'warn');
          }
        } catch (err) {
          console.error(err);
          toast('Kein Mikrofon gefunden oder Berechtigung verweigert.', 'error');
        }
      }

      stopMicRecording() {
        if (!dawState.isRecordingMic) return;
        dawState.isRecordingMic = false;

        if (this.micProcNode) { this.micProcNode.disconnect(); this.micProcNode = null; }
        if (this.micSrcNode) { this.micSrcNode.disconnect(); this.micSrcNode = null; }
        if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }

        if (this.micChunksL.length > 0 && this.ctx) {
          const totalLen = this.micChunksL.reduce((s, a) => s + a.length, 0);
          const buf = this.ctx.createBuffer(2, totalLen, this.ctx.sampleRate);
          const outL = buf.getChannelData(0);
          const outR = buf.getChannelData(1);
          let off = 0;
          for (let i = 0; i < this.micChunksL.length; i++) {
            outL.set(this.micChunksL[i], off);
            outR.set(this.micChunksR[i], off);
            off += this.micChunksL[i].length;
          }
          const micTr = dawState.tracks.find(t => t.id === dawState.recordingMicTrackId) || dawState.tracks.find(t => t.type === 'mic');
          if (micTr) {
            dawState.buffers[micTr.id] = buf;
            renderMultiTrackLanes();
            toast(`Vocal-Take auf ${micTr.num} | ${micTr.name} gespeichert!`, 'success');
          }
        }
        updateMicUI();
      }
    }

    const audioEngine = new ProDawAudioEngine();
