    /* ===== Instrumente (eingebauter Synth pro MIDI-Spur) ===== */
    const INSTRUMENT_CATALOG = {
      global:     { name: 'Standard (globaler Synth)', group: 'Allgemein' },
      subBass:    { name: 'Sub Bass',   group: 'Bass' },
      acid303:    { name: 'Acid 303',   group: 'Bass' },
      supersaw:   { name: 'Supersaw',   group: 'Lead' },
      sawLead:    { name: 'Saw Lead',   group: 'Lead' },
      squareLead: { name: 'Square Lead', group: 'Lead' },
      pluck:      { name: 'Pluck',      group: 'Lead' },
      rapBell:    { name: 'Rap Bell',   group: 'Keys' },
      epiano:     { name: 'E-Piano',    group: 'Keys' },
      organ:      { name: 'Orgel',      group: 'Keys' },
      pad:        { name: 'Warm Pad',   group: 'Flächen' },
      strings:    { name: 'Strings',    group: 'Flächen' }
    };
    // Klangvorgaben je Instrument (gelten nur, wenn es pro Spur gewählt wurde)
    const INSTRUMENT_DEFAULTS = {
      subBass:    { cutoff: 900,  res: 1,   attackMs: 5,   releaseMs: 180 },
      acid303:    { cutoff: 1800, res: 9,   attackMs: 3,   releaseMs: 90 },
      supersaw:   { cutoff: 4200, res: 1.5, attackMs: 12,  releaseMs: 260, detune: 25 },
      sawLead:    { cutoff: 5000, res: 2,   attackMs: 8,   releaseMs: 160, detune: 8 },
      squareLead: { cutoff: 4500, res: 1.5, attackMs: 5,   releaseMs: 140 },
      pluck:      { cutoff: 3200, res: 3,   attackMs: 3,   releaseMs: 200, detune: 20 },
      rapBell:    { cutoff: 9000, res: 0.7, attackMs: 3,   releaseMs: 500 },
      epiano:     { cutoff: 6000, res: 0.8, attackMs: 4,   releaseMs: 420 },
      organ:      { cutoff: 7000, res: 0.7, attackMs: 12,  releaseMs: 90 },
      pad:        { cutoff: 2600, res: 0.9, attackMs: 380, releaseMs: 900, detune: 14 },
      strings:    { cutoff: 5200, res: 0.8, attackMs: 220, releaseMs: 520, detune: 12 }
    };
    const INSTRUMENT_PEAK = { supersaw: 0.22, pad: 0.14, strings: 0.14, organ: 0.15, epiano: 0.30, sawLead: 0.24, squareLead: 0.18 };
    const INSTRUMENT_VIBRATO_CENTS = { strings: 7 };

    function instrumentOptionsHtml(trackOrId) {
      const track = trackOrId && typeof trackOrId === 'object' ? trackOrId : null;
      const sel = (track ? track.instrument : trackOrId) || 'global';
      const groups = {};
      Object.entries(INSTRUMENT_CATALOG).forEach(([id, m]) => { (groups[m.group] = groups[m.group] || []).push([id, m.name]); });
      const synthHtml = Object.entries(groups).map(([g, items]) =>
        `<optgroup label="${escapeText(g)}">${items.map(([id, n]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${escapeText(n)}</option>`).join('')}</optgroup>`
      ).join('');
      const sfCur = sel === 'sf' && track && track.sf ? `<option value="sf" selected>🎼 ${escapeText(track.sf.name)}</option>` : '';
      return synthHtml + `<optgroup label="SoundFont">${sfCur}<option value="__sf_pick">🎼 SoundFont wählen …</option></optgroup>`;
    }

    /* Optionen für synthMidiVoice: globale Synth-Regler + (falls gewählt) Instrument der Spur */
    function midiVoiceOpts(track, extra) {
      let sfRef = null;
      if (track && track.instrument === 'sf' && track.sf) {
        sfRef = { trackId: track.id, font: track.sf.font, fontName: track.sf.fontName, bank: track.sf.bank, preset: track.sf.preset };
        // Ist SpessaSynth bereit, braucht der einfache Player keine eigene Kopie des SoundFonts im Speicher.
        const sfSrc = SpessaEngine.isReady(track.sf) ? null : sfVoiceSource(track.sf);
        if (sfSrc) return Object.assign({ sfPreset: sfSrc, preset: dawState.synthPreset, spessaRef: sfRef }, extra || {});
      }
      const inst = track && track.instrument && track.instrument !== 'global' && INSTRUMENT_CATALOG[track.instrument] ? track.instrument : null;
      const o = {
        preset: inst || dawState.synthPreset,
        cutoff: dawState.synthCutoff, res: dawState.synthRes, detune: dawState.synthDetune,
        attackMs: dawState.synthAttackMs, releaseMs: dawState.synthReleaseMs
      };
      if (inst && INSTRUMENT_DEFAULTS[inst]) Object.assign(o, INSTRUMENT_DEFAULTS[inst]);
      if (sfRef) o.spessaRef = sfRef;
      return Object.assign(o, extra || {});
    }

    /* Hörprobe einer Note mit dem Instrument der (aktiven) MIDI-Spur */
    function auditionMidiNote(pitch, durSec, vel, track) {
      const tr = track || dawState.tracks.find(t => t.id === dawState.activeMidiTrackId);
      const dest = (tr && audioEngine.channelNodes[tr.id] && audioEngine.channelNodes[tr.id].input) || audioEngine.masterGain;
      if (!audioEngine.ctx || !dest) return;
      synthMidiVoice(audioEngine.ctx, dest, audioEngine.ctx.currentTime, midiVoiceOpts(tr, { midiNote: pitch, durationSec: durSec, velocity: vel }));
    }

    const FX_CATALOG = {
      eq: { name: '3-Band EQ', group: 'Klang', defaults: { low: 0, mid: 0, high: 0 } },
      compressor: { name: 'Compressor', group: 'Dynamik', defaults: { threshold: -18, ratio: 3, attack: 10, release: 120 } },
      reverb: { name: 'Reverb / Hall', group: 'Raum', defaults: { mix: 22 } },
      delay: { name: 'Stereo Delay', group: 'Zeit', defaults: { time: 260, feedback: 28, mix: 20 } },
      filter: { name: 'Filter', group: 'Klang', defaults: { cutoff: 8000, resonance: 1.2, mode: 'lowpass' } },
      saturation: { name: 'Saturation', group: 'Farbe', defaults: { drive: 18, mix: 25 } },
      chorus: { name: 'Chorus', group: 'Modulation', defaults: { rate: 0.8, depth: 12, mix: 25 } },
      deesser: { name: 'De-Esser', group: 'Vocal', defaults: { frequency: 6800, reduction: 5 } },
      phaser: { name: 'Phaser', group: 'Modulation', defaults: { rate: 0.5, depth: 60, mix: 50 } },
      flanger: { name: 'Flanger', group: 'Modulation', defaults: { rate: 0.25, depth: 60, feedback: 40, mix: 50 } },
      tremolo: { name: 'Tremolo', group: 'Modulation', defaults: { rate: 5, depth: 50 } },
      autopan: { name: 'Auto-Pan', group: 'Modulation', defaults: { rate: 0.8, depth: 60 } },
      bitcrusher: { name: 'Bitcrusher', group: 'Farbe', defaults: { bits: 8, mix: 70 } },
      limiter: { name: 'Limiter', group: 'Dynamik', defaults: { threshold: -3, release: 80 } }
    };
    const PARAM_META = {
      low: { label: 'Bass (dB)', min: -12, max: 12, step: 1 }, mid: { label: 'Mitten (dB)', min: -12, max: 12, step: 1 }, high: { label: 'Höhen (dB)', min: -12, max: 12, step: 1 },
      threshold: { label: 'Threshold (dB)', min: -60, max: 0, step: 1 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 1 },
      attack: { label: 'Attack (ms)', min: 1, max: 100, step: 1 }, release: { label: 'Release (ms)', min: 10, max: 1000, step: 1 },
      mix: { label: 'Wet (%)', min: 0, max: 100, step: 1 }, time: { label: 'Zeit (ms)', min: 1, max: 1200, step: 1 },
      feedback: { label: 'Feedback (%)', min: 0, max: 100, step: 1 }, cutoff: { label: 'Cutoff (Hz)', min: 80, max: 18000, step: 1 },
      resonance: { label: 'Resonanz', min: 0.1, max: 18, step: 0.1 }, drive: { label: 'Drive (%)', min: 0, max: 100, step: 1 },
      rate: { label: 'Rate (Hz)', min: 0.1, max: 12, step: 0.1 }, depth: { label: 'Tiefe (%)', min: 0, max: 100, step: 1 },
      frequency: { label: 'Frequenz (Hz)', min: 80, max: 18000, step: 1 }, reduction: { label: 'Absenkung (dB)', min: 0, max: 18, step: 1 },
      bits: { label: 'Bit-Tiefe', min: 2, max: 16, step: 1 }
    };
    function fxOptionsHtml(options) {
      const groups = {};
      options.forEach(k => { const g = FX_CATALOG[k].group; (groups[g] = groups[g] || []).push(k); });
      return Object.entries(groups).map(([g, ks]) => `<optgroup label="${escapeText(g)}">${ks.map(k => `<option value="${k}">${escapeText(FX_CATALOG[k].name)}</option>`).join('')}</optgroup>`).join('');
    }

    function suggestedFxForTrack(track) {
      if (track.type === 'midi') return ['eq','filter','chorus','phaser','flanger','tremolo','autopan','reverb','delay','compressor','saturation','bitcrusher','limiter'];
      if (track.type === 'mic') return ['eq','deesser','compressor','reverb','delay','filter','saturation','limiter'];
      if (track.type === 'audio' || track.type === 'stem') return ['eq','compressor','deesser','filter','chorus','phaser','flanger','tremolo','autopan','reverb','delay','saturation','bitcrusher','limiter'];
      if (track.type === 'kick' || track.type === 'bass') return ['eq','compressor','saturation','filter','delay','bitcrusher','limiter'];
      return ['eq','filter','chorus','phaser','flanger','tremolo','autopan','reverb','delay','saturation','bitcrusher','compressor','limiter'];
    }

    function buildTrackEffect(ctx, effect, reverbTarget) {
      const p = effect.params || {};
      const input = ctx.createGain(), output = ctx.createGain();
      let node = null;
      if (effect.type === 'eq') {
        const low=ctx.createBiquadFilter(), mid=ctx.createBiquadFilter(), high=ctx.createBiquadFilter();
        low.type='lowshelf'; low.frequency.value=180; low.gain.value=p.low||0;
        mid.type='peaking'; mid.frequency.value=1000; mid.Q.value=0.8; mid.gain.value=p.mid||0;
        high.type='highshelf'; high.frequency.value=6500; high.gain.value=p.high||0;
        input.connect(low); low.connect(mid); mid.connect(high); high.connect(output);
        return {input, output, nodes:{low,mid,high}};
      }
      if (effect.type === 'compressor') {
        node=ctx.createDynamicsCompressor(); node.threshold.value=p.threshold ?? -18; node.ratio.value=p.ratio ?? 3; node.attack.value=(p.attack ?? 10)/1000; node.release.value=(p.release ?? 120)/1000; node.knee.value=8;
      } else if (effect.type === 'filter') {
        node=ctx.createBiquadFilter(); node.type=p.mode || 'lowpass'; node.frequency.value=p.cutoff ?? 8000; node.Q.value=p.resonance ?? 1.2;
      } else if (effect.type === 'deesser') {
        node=ctx.createBiquadFilter(); node.type='peaking'; node.frequency.value=p.frequency ?? 6800; node.Q.value=2.2; node.gain.value=-(p.reduction ?? 5);
      } else if (effect.type === 'saturation') {
        node=ctx.createWaveShaper(); const amount=Math.max(1,p.drive ?? 18); const curve=new Float32Array(2048); for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.tanh(x*(1+amount/10))/Math.tanh(1+amount/10);} node.curve=curve; node.oversample='2x';
      } else if (effect.type === 'delay' || effect.type === 'chorus') {
        const delay=ctx.createDelay(2); const feedback=ctx.createGain(); const wet=ctx.createGain(); const dry=ctx.createGain();
        const mix=(p.mix ?? 22)/100; dry.gain.value=1-mix; wet.gain.value=mix;
        delay.delayTime.value=effect.type==='chorus' ? 0.018 : (p.time ?? 260)/1000;
        feedback.gain.value=effect.type==='chorus' ? 0.08 : Math.min(0.78,(p.feedback ?? 28)/100);
        input.connect(dry); dry.connect(output); input.connect(delay); delay.connect(wet); wet.connect(output); delay.connect(feedback); feedback.connect(delay);
        if(effect.type==='chorus') { const lfo=ctx.createOscillator(), depth=ctx.createGain(); lfo.frequency.value=p.rate ?? 0.8; depth.gain.value=(p.depth ?? 12)/1000; lfo.connect(depth); depth.connect(delay.delayTime); lfo.start(); return {input,output,nodes:{delay,feedback,wet,dry,lfo,depth}}; }
        return {input,output,nodes:{delay,feedback,wet,dry}};
      } else if (effect.type === 'tremolo') {
        const depth=Math.min(1,Math.max(0,(p.depth ?? 50)/100));
        const amp=ctx.createGain(); amp.gain.value=1-depth/2;
        const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.type='sine'; lfo.frequency.value=p.rate ?? 5; lg.gain.value=depth/2;
        lfo.connect(lg); lg.connect(amp.gain); lfo.start(); input.connect(amp); amp.connect(output);
        return {input,output,nodes:{amp,lfo,lg}};
      } else if (effect.type === 'autopan') {
        const pan=ctx.createStereoPanner(); pan.pan.value=0;
        const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.type='sine'; lfo.frequency.value=p.rate ?? 0.8; lg.gain.value=Math.min(1,(p.depth ?? 60)/100);
        lfo.connect(lg); lg.connect(pan.pan); lfo.start(); input.connect(pan); pan.connect(output);
        return {input,output,nodes:{pan,lfo,lg}};
      } else if (effect.type === 'phaser') {
        const mix=Math.min(1,Math.max(0,(p.mix ?? 50)/100)); const dry=ctx.createGain(), wet=ctx.createGain(); dry.gain.value=1-mix*0.5; wet.gain.value=mix;
        const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.type='sine'; lfo.frequency.value=p.rate ?? 0.5; lg.gain.value=(p.depth ?? 60)/100*600; lfo.start();
        lfo.connect(lg);
        const stages=[]; let prev=input;
        for(let i=0;i<4;i++){ const ap=ctx.createBiquadFilter(); ap.type='allpass'; ap.frequency.value=700+i*350; ap.Q.value=0.8; lg.connect(ap.frequency); prev.connect(ap); prev=ap; stages.push(ap); }
        prev.connect(wet); input.connect(dry); dry.connect(output); wet.connect(output);
        return {input,output,nodes:{dry,wet,lfo,lg,...Object.fromEntries(stages.map((n,i)=>['ap'+i,n]))}};
      } else if (effect.type === 'flanger') {
        const mix=Math.min(1,Math.max(0,(p.mix ?? 50)/100)); const dry=ctx.createGain(), wet=ctx.createGain(), fb=ctx.createGain(); dry.gain.value=1-mix*0.5; wet.gain.value=mix;
        const delay=ctx.createDelay(0.05); delay.delayTime.value=0.004; fb.gain.value=Math.min(0.85,(p.feedback ?? 40)/100);
        const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.type='sine'; lfo.frequency.value=p.rate ?? 0.25; lg.gain.value=(p.depth ?? 60)/100*0.003; lfo.connect(lg); lg.connect(delay.delayTime); lfo.start();
        input.connect(dry); dry.connect(output); input.connect(delay); delay.connect(wet); wet.connect(output); delay.connect(fb); fb.connect(delay);
        return {input,output,nodes:{dry,wet,fb,delay,lfo,lg}};
      } else if (effect.type === 'bitcrusher') {
        const bits=Math.min(16,Math.max(2,Math.round(p.bits ?? 8))); const levels=Math.pow(2,bits-1);
        const shaper=ctx.createWaveShaper(); const curve=new Float32Array(4096);
        for(let i=0;i<curve.length;i++){ const x=i*2/(curve.length-1)-1; curve[i]=Math.round(x*levels)/levels; }
        shaper.curve=curve;
        const mix=Math.min(1,Math.max(0,(p.mix ?? 70)/100)); const dry=ctx.createGain(), wet=ctx.createGain(); dry.gain.value=1-mix; wet.gain.value=mix;
        input.connect(dry); dry.connect(output); input.connect(shaper); shaper.connect(wet); wet.connect(output);
        return {input,output,nodes:{shaper,dry,wet}};
      } else if (effect.type === 'limiter') {
        node=ctx.createDynamicsCompressor(); node.threshold.value=p.threshold ?? -3; node.ratio.value=20; node.knee.value=0; node.attack.value=0.001; node.release.value=(p.release ?? 80)/1000;
      } else if (effect.type === 'reverb') {
        // Eigener Send in den vorhandenen Stereo-Hallbus; das trockene Signal bleibt erhalten.
        const send=ctx.createGain(); send.gain.value=(p.mix ?? 22)/100; input.connect(output); input.connect(send);
        const rvTarget=reverbTarget || (audioEngine.masterGain ? audioEngine.reverbConvolver : null); if(rvTarget){send.connect(rvTarget);}
        return {input,output,nodes:{send}};
      }
      if (!node) return null;
      input.connect(node); node.connect(output);
      return {input,output,node,nodes:{node}};
    }

    /* Baut NUR die FX-Kette einer Spur neu (fxInput → Effekte → scGain).
       Der Kanal selbst (input, Filter, Fader, Master-Anbindung) bleibt bestehen. Dadurch hängen
       bereits laufende Audio-Quellen weiter am gleichen Eingang und der Ton bleibt beim Ändern
       der FX hörbar. Früher wurde der ganze Kanal ersetzt: laufende Quellen speisten dann einen
       abgetrennten alten Knoten, bis Pause/Play sie neu startete. */
    function rebuildTrackAudioGraph(track) {
      if (!audioEngine.ctx) return;
      const ctx = audioEngine.ctx;
      const ch = audioEngine.channelNodes[track.id];
      if (!ch || !ch.fxInput || !ch.scGain) {
        audioEngine.ensureTrackNode(track);
        audioEngine.syncAudioParams();
        return;
      }
      // 1) alte Effektkette abbauen (inkl. Chorus-LFOs)
      try { ch.fxInput.disconnect(); } catch (_) {}
      (ch.fxNodes || []).forEach(e => {
        try { e.nodes?.lfo?.stop(); } catch (_) {}
        [e.input, e.output, ...Object.values(e.nodes || {})].forEach(n => { try { n?.disconnect(); } catch (_) {} });
      });
      // 2) neue Kette aufbauen und direkt wieder an scGain hängen
      const list = [];
      let tail = ch.fxInput;
      (track.fx || []).forEach(effect => {
        if (!effect.enabled) return;
        let built = null;
        try { built = buildTrackEffect(ctx, effect); } catch (err) { console.error('[FX]', effect.type, err); }
        if (!built) return;
        tail.connect(built.input || built.node);
        tail = built.output || built.node;
        list.push({ id: effect.id, ...built });
      });
      tail.connect(ch.scGain);
      ch.fxNodes = list;
      audioEngine.syncAudioParams();
    }

    function openTrackFxRack(trackId) {
      const track=dawState.tracks.find(t=>t.id===trackId); if(!track) return;
      if(!Array.isArray(track.fx)) track.fx=[];
      document.getElementById('track-fx-modal')?.remove();
      const overlay=document.createElement('div'); overlay.id='track-fx-modal'; overlay.className='fixed inset-0 z-[var(--z-dialog)] bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-5';
      const options=suggestedFxForTrack(track);
      const cards=track.fx.map((fx,i)=>{
        const meta=FX_CATALOG[fx.type]; if(!meta) return '';
        const p=fx.params||{};
        const fields=Object.entries(meta.defaults).map(([key,def])=>{
          if(key==='mode') return `<label class="text-xs text-slate-300">Filtertyp<select data-param="mode" data-index="${i}" class="w-full mt-1 bg-slate-900 border border-slate-600 rounded p-2"><option value="lowpass" ${p.mode==='lowpass'?'selected':''}>Low-pass</option><option value="highpass" ${p.mode==='highpass'?'selected':''}>High-pass</option><option value="bandpass" ${p.mode==='bandpass'?'selected':''}>Band-pass</option></select></label>`;
          const pm=PARAM_META[key]||{}; const min=pm.min ?? -12, max=pm.max ?? 12, step=pm.step ?? 1;
          return `<label class="block text-[11px] text-slate-300">${escapeText((PARAM_META[key]||{}).label||key)}<span class="float-right text-cyan-300" data-value="${i}-${key}">${p[key] ?? def}</span><input data-param="${key}" data-index="${i}" type="range" min="${min}" max="${max}" step="${step}" value="${p[key] ?? def}" class="w-full accent-cyan-400" /></label>`;
        }).join('');
        return `<section class="rounded-xl border border-slate-700 bg-slate-900/80 p-3"><div class="flex items-center gap-2 mb-3"><strong class="text-sm">${meta.name}</strong><label class="ml-auto text-xs"><input data-enabled="${i}" type="checkbox" ${fx.enabled?'checked':''}/> Aktiv</label><button data-remove="${i}" class="text-rose-300 text-xs px-2">Entfernen</button></div><div class="grid grid-cols-2 gap-x-4 gap-y-3">${fields}</div></section>`;
      }).join('');
      overlay.innerHTML=`<div class="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-slate-950 p-4 shadow-2xl"><div class="flex items-center gap-3 mb-1"><div class="text-lg font-black text-white">FX-Rack · ${escapeText(track.name)}</div><button data-close class="ml-auto px-3 py-1 rounded-lg bg-slate-800 text-slate-300">✕</button></div><p class="text-xs text-slate-400 mb-4">${escapeText(String(track.type||'').toUpperCase())} · Effekte werden nur auf diese Spur angewendet.</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">${cards || '<p class="text-xs text-slate-500">Noch keine Effekte eingefügt.</p>'}</div><div class="border-t border-slate-700 pt-3"><label class="text-xs text-slate-300">Effekt hinzufügen</label><div class="flex gap-2 mt-2"><select id="fx-add-select" class="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm">${fxOptionsHtml(options)}</select><button data-add class="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">＋ Hinzufügen</button></div><div class="flex flex-wrap gap-2 mt-3">${options.map(k=>`<button data-quickadd="${k}" class="px-2 py-1 rounded border border-slate-700 text-[10px] text-slate-300">＋ ${FX_CATALOG[k].name}</button>`).join('')}</div></div><div class="flex justify-end mt-4"><button data-close class="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">Fertig</button></div></div>`;
      document.body.appendChild(overlay);
      const redraw=()=>{rebuildTrackAudioGraph(track); document.querySelectorAll('.tr-fx-btn').forEach(b=>{if(b.dataset.fx===track.id)b.textContent=`FX ${track.fx.filter(x=>x.enabled).length}`;});};
      const add=(type)=>{const meta=FX_CATALOG[type]; if(!meta)return; track.fx.push({id:`fx_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,type,enabled:true,params:{...meta.defaults}}); redraw(); openTrackFxRack(track.id);};
      overlay.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>overlay.remove());
      overlay.querySelector('[data-add]').onclick=()=>add(overlay.querySelector('#fx-add-select').value);
      overlay.querySelectorAll('[data-quickadd]').forEach(b=>b.onclick=()=>add(b.dataset.quickadd));
      overlay.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{track.fx.splice(Number(b.dataset.remove),1);redraw();openTrackFxRack(track.id);});
      overlay.querySelectorAll('[data-enabled]').forEach(b=>b.onchange=()=>{track.fx[Number(b.dataset.enabled)].enabled=b.checked;redraw();});
      overlay.querySelectorAll('[data-param]').forEach(el=>{
        const update=()=>{const fx=track.fx[Number(el.dataset.index)]; if(!fx)return; fx.params[el.dataset.param]=el.tagName==='SELECT'?el.value:Number(el.value); const val=overlay.querySelector(`[data-value="${el.dataset.index}-${el.dataset.param}"]`);if(val)val.textContent=el.value;redraw();};
        el.addEventListener('change',update);
      });
    }

    /* Öffnet das FX-Rack und meldet Fehler sichtbar (Toast + Konsole) statt still zu scheitern. */
    function safeOpenTrackFxRack(trackId) {
      try {
        if (!trackId) throw new Error('Keine Spur-ID am FX-Button gefunden.');
        if (!dawState.tracks.some(t => t.id === trackId)) throw new Error(`Spur „${trackId}“ existiert nicht mehr.`);
        openTrackFxRack(trackId);
        if (!document.getElementById('track-fx-modal')) throw new Error('Das Fenster wurde nicht eingehängt.');
      } catch (err) {
        console.error('[FX-Rack]', err);
        try { toast(`FX-Rack konnte nicht geöffnet werden: ${err && err.message ? err.message : err}`, 'error'); }
        catch (_) { alert(`FX-Rack konnte nicht geöffnet werden: ${err && err.message ? err.message : err}`); }
      }
    }

    /* Zentrale Klick-Behandlung für alle FX-Buttons (überlebt jeden dynamischen Neuaufbau der Spuren).
       - Capture-Phase am document: unabhängig davon, wann/wie oft renderMultiTrackLanes() die Buttons neu erzeugt.
       - pointerup für Touch/Stift (Android) + click für Maus/Tastatur, mit Doppelauslösungs-Schutz.
       - Scroll-Gesten in der Spurliste (Finger bewegt sich > 10 px) öffnen nichts.
       - preventDefault/stopPropagation: keine andere Aktion (Seek, Edit, Mute …) wird mitausgelöst. */
    (function installFxButtonDelegation() {
      if (window.__fxDelegationInstalled) return;
      window.__fxDelegationInstalled = true;
      const SEL = '.tr-fx-btn[data-fx]';
      let down = null, lastOpenAt = 0;
      const findBtn = e => (e.target instanceof Element ? e.target.closest(SEL) : null);

      document.addEventListener('pointerdown', e => {
        const btn = findBtn(e);
        down = btn ? { id: btn.dataset.fx, x: e.clientX, y: e.clientY, type: e.pointerType } : null;
        if (btn) e.stopPropagation();
      }, true);

      document.addEventListener('pointerup', e => {
        const btn = findBtn(e);
        if (!btn || !down || e.pointerType === 'mouse') { return; }
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10;
        const id = btn.dataset.fx || down.id;
        down = null;
        e.preventDefault(); e.stopPropagation();
        if (moved) return;
        lastOpenAt = Date.now();
        safeOpenTrackFxRack(id);
      }, true);

      document.addEventListener('click', e => {
        const btn = findBtn(e);
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        if (Date.now() - lastOpenAt < 600) return; // wurde bereits per pointerup behandelt
        lastOpenAt = Date.now();
        safeOpenTrackFxRack(btn.dataset.fx);
      }, true);
    })();
