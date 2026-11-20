# ---------- Schritt 5: Automation, Lautheit, Export-Umbau ----------
h=once(h,"      masterGainVal: 0.95,\n","      masterGainVal: 0.95,\n      masterTrimDb: 0,\n      limiterDb: -1,\n",'mx-state')
h=once(h,"        this.masterGain.gain.value = dawState.masterGainVal;","        this.masterGain.gain.value = dawState.masterGainVal * Math.pow(10, (dawState.masterTrimDb || 0) / 20);",'mx-mg')
h=once(h,"        this.masterLimiter.threshold.value = -1.0;","        this.masterLimiter.threshold.value = dawState.limiterDb == null ? -1.0 : dawState.limiterDb;",'mx-lim')
h=once(h,"          this.masterGain.gain.setTargetAtTime(dawState.masterGainVal, now, 0.015);","          this.masterGain.gain.setTargetAtTime(dawState.masterGainVal * Math.pow(10, (dawState.masterTrimDb || 0) / 20), now, 0.015);\n          if (this.masterLimiter) this.masterLimiter.threshold.setTargetAtTime(dawState.limiterDb == null ? -1.0 : dawState.limiterDb, now, 0.02);",'mx-sync')
# Spurkette: Automations-Knoten
h=once(h,"        const analyser = ctx.createAnalyser();\n        analyser.fftSize = 128;\n","        const analyser = ctx.createAnalyser();\n        analyser.fftSize = 128;\n        /* Automation: Pegel (Multiplikator), Pan- und Filter-Versatz als Zusatzsignal auf die Parameter */\n        const autoGain = ctx.createGain(); autoGain.gain.value = 1;\n        const panAuto = ctx.createConstantSource(); panAuto.offset.value = 0; panAuto.connect(panner.pan); panAuto.start();\n        const filtAuto = ctx.createConstantSource(); filtAuto.offset.value = 0; filtAuto.connect(lowCut.frequency); filtAuto.start();\n",'mx-nodes')
h=once(h,"        fader.connect(analyser);\n","        fader.connect(autoGain);\n        autoGain.connect(analyser);\n",'mx-wire1')
h=once(h,"          fader.connect(revSend);","          autoGain.connect(revSend);",'mx-wire2')
h=once(h,"          input, lowCut, scGain, sectionGate, panner, fader, analyser, vocalChain, revSend, fxInput, fxNodes\n","          input, lowCut, scGain, sectionGate, panner, fader, analyser, vocalChain, revSend, fxInput, fxNodes, autoGain, panAuto, filtAuto\n",'mx-obj')
h=once(h,"      scheduleStemPass(when, offsetSec, stopAt) {\n","      scheduleStemPass(when, offsetSec, stopAt) {\n        if (window.AutoModel) { try { AutoModel.schedule(this, when, offsetSec, stopAt); } catch (e) { console.warn('[Automation]', e); } }\n",'mx-sched')
h=once(h,"        this.activeStemSources = [];\n      }\n\n      schedulerLoop() {","        this.activeStemSources = [];\n        if (window.AutoModel) { try { AutoModel.reset(this); } catch (e) {} }\n      }\n\n      schedulerLoop() {",'mx-stop')
# Export-Umbau
h=once(h,"""    async function exportMasterWav() {
      const btn = document.getElementById('btn-export-wav');
      const lbl = document.getElementById('lbl-export-wav');
""","""    async function exportMasterWav(opts) {
      if (!opts || opts.type) opts = {};
      const stubEl = () => ({ classList: { add() {}, remove() {} }, textContent: '' });
      const btn = opts.returnBuffer ? stubEl() : document.getElementById('btn-export-wav');
      const lbl = opts.returnBuffer ? stubEl() : document.getElementById('lbl-export-wav');
""",'mx-ex1')
h=once(h,"        const totalSec = totalBars * 16 * secPer16th;\n","        const fullSec = totalBars * 16 * secPer16th;\n        const totalSec = opts.endSec ? Math.min(fullSec, Math.max(0.5, opts.endSec)) : fullSec;\n",'mx-ex2')
h=once(h,"        const masterGain = offCtx.createGain();\n        masterGain.gain.value = dawState.masterGainVal;\n","        const masterGain = offCtx.createGain();\n        masterGain.gain.value = dawState.masterGainVal * Math.pow(10, (dawState.masterTrimDb || 0) / 20);\n",'mx-ex3')
h=once(h,"        const limiter = offCtx.createDynamicsCompressor();\n        limiter.threshold.value = -1.0;","        const limiter = offCtx.createDynamicsCompressor();\n        limiter.threshold.value = dawState.limiterDb == null ? -1.0 : dawState.limiterDb;",'mx-ex4')
h=once(h,"        dawState.tracks.forEach(tr => {\n          const audible = anySolo ? tr.solo : !tr.mute;\n          const input = offCtx.createGain();","        dawState.tracks.forEach(tr => {\n          const audible = (anySolo ? tr.solo : !tr.mute) && (!opts.onlyIds || opts.onlyIds.indexOf(tr.id) >= 0);\n          const input = offCtx.createGain();",'mx-ex5')
h=once(h,"          fader.connect(masterGain);\n          if ((tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') && vcOn) fader.connect(revConv);\n\n          offNodes[tr.id] = { input, scGain, secGate };","""          const autoGain = offCtx.createGain(); fader.connect(autoGain); autoGain.connect(masterGain);
          const panAuto = offCtx.createConstantSource(); panAuto.offset.value = 0; panAuto.connect(panner.pan); panAuto.start();
          const filtAuto = offCtx.createConstantSource(); filtAuto.offset.value = 0; filtAuto.connect(lowCut.frequency); filtAuto.start();
          if ((tr.type === 'audio' || tr.type === 'stem' || tr.type === 'mic') && vcOn) autoGain.connect(revConv);

          offNodes[tr.id] = { input, scGain, secGate, autoGain, panAuto, filtAuto };
          try { AutoModel.scheduleOffline(tr, offNodes[tr.id], totalSec); } catch (aerr) { console.warn('[Export-Automation]', aerr); }""",'mx-ex6')
h=once(h,"        // Schedule all 16th steps across totalBars\n        const totalSteps = totalBars * 16;","        // Schedule all 16th steps across totalBars\n        const totalSteps = Math.min(totalBars * 16, Math.ceil(totalSec / secPer16th - 1e-6));",'mx-ex7')
h=once(h,"        const rendered = await offCtx.startRendering();\n        const blob = encodeWav16Bit(rendered);","        const rendered = await offCtx.startRendering();\n        if (opts.returnBuffer) return (opts.startSec > 0 || opts.endSec) ? window.__sliceBuf(rendered, opts.startSec || 0, opts.endSec) : rendered;\n        const blob = encodeWav16Bit(rendered);",'mx-ex8')
h=once(h,"    async function exportMasterWav(opts) {","    window.__exportMix = (o) => exportMasterWav(o);\n    async function exportMasterWav(opts) {",'mx-ex9')
h=once(h,"        masterGain.gain.value = dawState.masterGainVal * Math.pow(10, (dawState.masterTrimDb || 0) / 20);\n","        masterGain.gain.value = opts.dry ? 1 : dawState.masterGainVal * Math.pow(10, (dawState.masterTrimDb || 0) / 20);\n",'mx-ex10')
h=once(h,"        masterGain.connect(limiter);\n        limiter.connect(offCtx.destination);\n","        if (opts.dry) masterGain.connect(offCtx.destination); else { masterGain.connect(limiter); limiter.connect(offCtx.destination); }\n",'mx-ex11')
h=once(h,"        try { await SpessaEngine.renderOffline(offCtx); }","        if (opts.onlyIds && offCtx.__spessaRec) offCtx.__spessaRec = offCtx.__spessaRec.filter(it => opts.onlyIds.indexOf(it.ref.trackId) >= 0);\n        try { await SpessaEngine.renderOffline(offCtx); }",'mx-ex12')
MIX_CORE_JS=rd('src/audio/mixer/mix_core.js'); MIX_UI_JS=rd('src/audio/mixer/mix_ui.js')+'\n</script>\n<script>\n'+rd('src/audio/export/export_ui.js')
