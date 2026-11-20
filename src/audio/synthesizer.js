    /**
     * ============================================================================
     * DETERMINISTIC WEB AUDIO SYNTHESIZERS (LIVE & OFFLINE WAV EXPORT)
     * ============================================================================
     */
    function midiToFreq(m) {
      return 440 * Math.pow(2, (m - 69) / 12);
    }

    function createStereoImpulse(ctx, durSec, decay) {
      const len = Math.floor(ctx.sampleRate * durSec);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * 0.55;
        }
      }
      return buf;
    }

    function createWhiteNoiseBuffer(ctx, durSec) {
      const len = Math.floor(ctx.sampleRate * durSec);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    function synthKick(ctx, dest, time, opts) {
      const decaySec = (opts.decayMs || 240) / 1000;
      const punch = (opts.punch || 80) / 100;
      const bodyHz = opts.tuneHz || 52;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160 + punch * 75, time);
      osc.frequency.exponentialRampToValueAtTime(bodyHz, time + 0.038);
      osc.frequency.exponentialRampToValueAtTime(Math.max(32, bodyHz * 0.72), time + decaySec);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(1.0, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, time + decaySec);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + decaySec + 0.02);

      if (punch > 0.15) {
        const click = ctx.createOscillator();
        const cGain = ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1350, time);
        click.frequency.exponentialRampToValueAtTime(150, time + 0.016);
        cGain.gain.setValueAtTime(punch * 0.45, time);
        cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);
        click.connect(cGain);
        cGain.connect(dest);
        click.start(time);
        click.stop(time + 0.022);
      }
    }

    function synthBass808(ctx, dest, time, opts) {
      const is808 = opts.mode === '808';
      const dur = is808 ? Math.max(0.42, opts.stepDur * 3.6) : Math.max(0.14, opts.stepDur * 0.92);
      const midi = 36 + opts.rootNote + (opts.pitchOffset || 0);
      const freq = midiToFreq(midi);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const shaper = ctx.createWaveShaper();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = is808 ? 'triangle' : 'sawtooth';

      const startFreq = opts.glide ? freq * 0.75 : (is808 ? freq * 1.4 : freq);
      osc1.frequency.setValueAtTime(startFreq, time);
      osc1.frequency.exponentialRampToValueAtTime(freq, time + (opts.glide ? 0.09 : 0.03));
      osc2.frequency.setValueAtTime(startFreq, time);
      osc2.frequency.exponentialRampToValueAtTime(freq, time + (opts.glide ? 0.09 : 0.03));

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(is808 ? 240 + opts.drive * 3.5 : 460 + opts.drive * 7, time);
      filter.frequency.exponentialRampToValueAtTime(115, time + dur);
      filter.Q.value = is808 ? 1.6 : 3.5;

      const amt = 1 + (opts.drive / 100) * 14;
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * amt);
      }
      shaper.curve = curve;

      const subMix = ctx.createGain();
      subMix.gain.value = is808 ? 0.35 : 0.55;

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.88, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc1.connect(filter);
      osc2.connect(subMix);
      subMix.connect(filter);
      filter.connect(shaper);
      shaper.connect(gain);
      gain.connect(dest);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + dur + 0.02);
      osc2.stop(time + dur + 0.02);
    }

    function synthHatClap(ctx, dest, noiseBuf, time, step16) {
      const isClap = (step16 === 4 || step16 === 12);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      if (isClap) {
        filter.type = 'bandpass';
        filter.frequency.value = 1750;
        filter.Q.value = 1.2;
        gain.gain.setValueAtTime(0.42, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      } else {
        filter.type = 'highpass';
        filter.frequency.value = 7200;
        const isOpen = (step16 % 4 === 2);
        gain.gain.setValueAtTime(isOpen ? 0.28 : 0.14, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (isOpen ? 0.12 : 0.045));
      }

      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(time);
      src.stop(time + 0.18);
    }

    // Polyphonic Multi-Preset MIDI Voice Synthesizer
    function synthMidiVoice(ctx, dest, time, opts) {
      if (opts.spessaRef) {
        try { if (SpessaEngine.play(ctx, dest, time, opts)) return; }
        catch (err) { console.warn('[SpessaSynth] Fehler, einfacher Player springt ein:', err); }
      }
      if (opts.sfPreset) {
        try { sfPlay(ctx, dest, time, opts); return; }
        catch (err) { console.warn('[SoundFont] Wiedergabe fehlgeschlagen, Standard-Synth springt ein:', err); }
      }
      const freq = midiToFreq(opts.midiNote);
      const dur = opts.durationSec || 0.25;
      const vel = opts.velocity || 0.85;
      const relSec = Math.max(0.03, (opts.releaseMs || 220) / 1000);
      const attSec = Math.min(Math.max(0.003, (opts.attackMs || 10) / 1000), Math.max(0.003, dur * 0.8));

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = opts.res || 2.8;

      const baseCutoff = opts.cutoff || 3200;
      if (opts.preset === 'pluck' || opts.preset === 'acid303') {
        filter.frequency.setValueAtTime(Math.min(14000, baseCutoff * 1.9), time);
        filter.frequency.exponentialRampToValueAtTime(Math.max(140, baseCutoff * 0.25), time + dur + relSec * 0.5);
      } else {
        filter.frequency.setValueAtTime(baseCutoff, time);
      }

      const env = ctx.createGain();
      const peak = vel * (INSTRUMENT_PEAK[opts.preset] ?? 0.34);
      env.gain.setValueAtTime(0.0008, time);
      env.gain.linearRampToValueAtTime(peak, time + attSec);
      env.gain.setValueAtTime(peak * 0.85, time + Math.max(dur, attSec));
      env.gain.exponentialRampToValueAtTime(0.0008, time + Math.max(dur, attSec) + relSec);

      filter.connect(env);
      env.connect(dest);

      let oscConfigs = [];
      const dt = opts.detune || 25;

      if (opts.preset === 'supersaw') {
        oscConfigs = [
          { type: 'sawtooth', detune: -dt, mult: 1 },
          { type: 'sawtooth', detune: -dt * 0.4, mult: 1 },
          { type: 'sawtooth', detune: 0, mult: 1 },
          { type: 'sawtooth', detune: dt * 0.4, mult: 1 },
          { type: 'sawtooth', detune: dt, mult: 1 }
        ];
      } else if (opts.preset === 'acid303') {
        oscConfigs = [{ type: 'sawtooth', detune: 0, mult: 1 }];
      } else if (opts.preset === 'pluck') {
        oscConfigs = [
          { type: 'sawtooth', detune: -dt * 0.5, mult: 1 },
          { type: 'square',   detune: dt * 0.5,  mult: 1 }
        ];
      } else if (opts.preset === 'rapBell') {
        oscConfigs = [
          { type: 'sine',     detune: 0,  mult: 1 },
          { type: 'triangle', detune: 6,  mult: 2 },
          { type: 'sine',     detune: -6, mult: 3 }
        ];
      } else if (opts.preset === 'sawLead') {
        oscConfigs = [
          { type: 'sawtooth', detune: -dt, mult: 1 },
          { type: 'sawtooth', detune: dt, mult: 1 },
          { type: 'square',   detune: 0, mult: 0.5, gain: 0.4 }
        ];
      } else if (opts.preset === 'squareLead') {
        oscConfigs = [
          { type: 'square', detune: 0, mult: 1 },
          { type: 'square', detune: 7, mult: 1, gain: 0.7 }
        ];
      } else if (opts.preset === 'epiano') {
        oscConfigs = [
          { type: 'sine',     detune: 0, mult: 1 },
          { type: 'triangle', detune: 3, mult: 1, gain: 0.4 },
          { type: 'sine',     detune: 0, mult: 2, gain: 0.25, decay: 0.5 },
          { type: 'sine',     detune: 0, mult: 4, gain: 0.25, decay: 0.18 }
        ];
      } else if (opts.preset === 'organ') {
        oscConfigs = [
          { type: 'sine', detune: 0, mult: 0.5, gain: 0.5 },
          { type: 'sine', detune: 0, mult: 1,   gain: 0.9 },
          { type: 'sine', detune: 0, mult: 2,   gain: 0.55 },
          { type: 'sine', detune: 0, mult: 3,   gain: 0.3 }
        ];
      } else if (opts.preset === 'pad') {
        oscConfigs = [
          { type: 'sawtooth', detune: -dt, mult: 1, gain: 0.6 },
          { type: 'sawtooth', detune: dt,  mult: 1, gain: 0.6 },
          { type: 'triangle', detune: 0,   mult: 1, gain: 0.8 },
          { type: 'sine',     detune: 0,   mult: 0.5, gain: 0.5 }
        ];
      } else if (opts.preset === 'strings') {
        oscConfigs = [
          { type: 'sawtooth', detune: -dt, mult: 1, gain: 0.55 },
          { type: 'sawtooth', detune: -dt * 0.4, mult: 1, gain: 0.55 },
          { type: 'sawtooth', detune: dt * 0.4, mult: 1, gain: 0.55 },
          { type: 'sawtooth', detune: dt, mult: 1, gain: 0.55 }
        ];
      } else {
        // subBass
        oscConfigs = [
          { type: 'sine',     detune: 0, mult: 0.5 },
          { type: 'triangle', detune: 4, mult: 1 }
        ];
      }

      const endTime = time + Math.max(dur, attSec) + relSec + 0.03;
      let vibGain = null;
      const vibCents = INSTRUMENT_VIBRATO_CENTS[opts.preset];
      if (vibCents) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.4;
        vibGain = ctx.createGain();
        vibGain.gain.value = vibCents;
        lfo.connect(vibGain);
        lfo.start(time);
        lfo.stop(endTime);
      }

      oscConfigs.forEach(cfg => {
        const osc = ctx.createOscillator();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(freq * cfg.mult, time);
        osc.detune.setValueAtTime(cfg.detune, time);
        if (vibGain) vibGain.connect(osc.detune);
        if (cfg.gain != null || cfg.decay) {
          const g = ctx.createGain();
          const g0 = cfg.gain ?? 1;
          g.gain.setValueAtTime(g0, time);
          if (cfg.decay) g.gain.exponentialRampToValueAtTime(Math.max(0.001, g0 * 0.05), time + cfg.decay);
          osc.connect(g);
          g.connect(filter);
        } else {
          osc.connect(filter);
        }
        osc.start(time);
        osc.stop(endTime);
      });
    }

    function synthNoiseRiser(ctx, dest, noiseBuf, time, durSec = 2.5) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3.8;
      bp.frequency.setValueAtTime(160, time);
      bp.frequency.exponentialRampToValueAtTime(7200, time + durSec);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, time);
      g.gain.exponentialRampToValueAtTime(0.42, time + durSec * 0.92);
      g.gain.linearRampToValueAtTime(0.001, time + durSec);

      src.connect(bp);
      bp.connect(g);
      g.connect(dest);
      src.start(time);
      src.stop(time + durSec + 0.02);
    }

    function synthSubImpact(ctx, dest, noiseBuf, time) {
      const osc = ctx.createOscillator();
      const sg = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, time);
      osc.frequency.exponentialRampToValueAtTime(28, time + 1.4);
      sg.gain.setValueAtTime(0.9, time);
      sg.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
      osc.connect(sg);
      sg.connect(dest);
      osc.start(time);
      osc.stop(time + 1.55);

      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 950;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.45, time);
      ng.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(dest);
      src.start(time);
      src.stop(time + 1.25);
    }

    function synthReverseCrash(ctx, dest, noiseBuf, time, durSec = 0.8) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, time);
      g.gain.exponentialRampToValueAtTime(0.45, time + durSec * 0.95);
      g.gain.linearRampToValueAtTime(0.001, time + durSec);
      src.connect(hp);
      hp.connect(g);
      g.connect(dest);
      src.start(time);
      src.stop(time + durSec + 0.02);
    }

    function synthMetronome(ctx, dest, time, downbeat) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(downbeat ? 1500 : 1000, time);
      g.gain.setValueAtTime(0.24, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
      osc.connect(g);
      g.connect(dest);
      osc.start(time);
      osc.stop(time + 0.04);
    }
