// Echter Browser-Test (Chromium + AudioWorklet) für die SpessaSynth-Integration.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const WORK = process.argv[2];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const srv = http.createServer((req, res) => {
  const f = path.join(WORK, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index_ueberarbeitet.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(d); });
});

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext();
  await ctx.addInitScript(()=>{try{localStorage.setItem('sunshine.home','off')}catch(_){}});
  const page = await ctx.newPage();
  const errors = [], logs = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { const t = m.text(); logs.push(`[${m.type()}] ${t}`); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(`http://127.0.0.1:${port}/index_ueberarbeitet.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const pageErrs0 = errors.filter(e => !/tailwind|JSZip|is not defined.*tailwind/i.test(e));
  check('Seite lädt ohne Skriptfehler', pageErrs0.length === 0, pageErrs0.join(' | ').slice(0, 300));

  const has = await page.evaluate(() => ({
    core: !!document.getElementById('spessa-core-src') && document.getElementById('spessa-core-src').textContent.length > 100000,
    runner: !!document.getElementById('spessa-runner-src'), worklet: !!document.getElementById('spessa-worklet-src'),
    eng: typeof SpessaEngine === 'object', wl: !!(window.AudioContext && AudioContext.prototype.hasOwnProperty('audioWorklet'))
  }));
  check('Bundle-Blöcke und Engine vorhanden', has.core && has.runner && has.worklet && has.eng, JSON.stringify(has));

  // SoundFont importieren (echter Importpfad → IndexedDB)
  const setup = await page.evaluate(async (port) => {
    const bytes = await (await fetch(`http://127.0.0.1:${port}/test.sf2`)).arrayBuffer();
    const id = await sfImportFile(new File([bytes], 'test.sf2'));
    await audioEngine.ensureCtx();
    const tr = createTrack('midi', 'SF Piano');
    tr.instrument = 'sf'; tr.sf = { font: id, fontName: 'test', bank: 0, preset: 0, name: 'TestPiano' };
    const dr = createTrack('midi', 'SF Drums');
    dr.instrument = 'sf'; dr.sf = { font: id, fontName: 'test', bank: 128, preset: 0, name: 'TestDrums' };
    audioEngine.ensureTrackNode(tr); audioEngine.ensureTrackNode(dr);
    const an = audioEngine.ctx.createAnalyser(); an.fftSize = 2048; audioEngine.masterGain.connect(an);
    window.__an = an; window.__tr = tr; window.__dr = dr;
    return { id, ctxState: audioEngine.ctx.state, sr: audioEngine.ctx.sampleRate };
  }, port);
  check('SoundFont-Import + AudioContext', !!setup.id && setup.ctxState === 'running', JSON.stringify(setup));

  const ready = await page.evaluate(async () => {
    const ok = await SpessaEngine.whenReady(window.__tr.sf, 15000);
    return { ok, status: SpessaEngine.status(window.__tr.sf), isReady: SpessaEngine.isReady(window.__tr.sf) };
  });
  check('SpessaSynth-Host im AudioWorklet geladen', ready.ok && ready.isReady, JSON.stringify(ready.status));

  // Pegel messen: Note abspielen, Analyser pollen
  const measure = (fnBody, ms) => page.evaluate(async ({ fnBody, ms }) => {
    const an = window.__an, buf = new Float32Array(an.fftSize); let peak = 0; const t0 = performance.now();
    (new Function('tr', 'dr', fnBody))(window.__tr, window.__dr);
    while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); await new Promise(r => setTimeout(r, 8)); }
    return peak;
  }, { fnBody, ms });

  const pPiano = await measure(`auditionMidiNote(69, 0.5, 0.9, tr)`, 900);
  check('Melodische Spur klingt (Preset 0:0)', pPiano > 0.01, 'Peak ' + pPiano.toFixed(3));
  const pDrum = await measure(`auditionMidiNote(36, 0.5, 0.9, dr)`, 1200);
  check('Drum-Spur klingt (Bank 128, Key 36)', pDrum > 0.01, 'Peak ' + pDrum.toFixed(3));
  const pDrumMiss = await measure(`auditionMidiNote(40, 0.3, 0.9, dr)`, 500);
  // Nachklang von Key 36 (0,6 s lang gepitcht) kann noch laufen – daher kurz warten & separat prüfen
  await page.waitForTimeout(1200);
  const pMiss2 = await measure(`auditionMidiNote(40, 0.3, 0.9, dr)`, 500);
  check('Drum-Key ohne Zone bleibt still', pMiss2 < 0.002, 'Peak ' + pMiss2.toFixed(5));

  // Routing durch die Spur: Mute der Spur muss das Signal unterdrücken
  const muted = await page.evaluate(async () => { window.__tr.mute = true; audioEngine.syncAudioParams(); await new Promise(r => setTimeout(r, 120)); return true; });
  const pMute = await measure(`auditionMidiNote(69, 0.5, 0.9, tr)`, 700);
  check('Spur-Mute greift (Signal läuft durch Spur-Kanal)', pMute < 0.002, 'Peak ' + pMute.toFixed(5));
  await page.evaluate(() => { window.__tr.mute = false; audioEngine.syncAudioParams(); });
  await page.waitForTimeout(150);

  // Spur-FX-Kette wirkt auf Spessa-Signal: Filter Cutoff 80 Hz (Lowpass) drückt Pegel stark
  const pBase = await measure(`auditionMidiNote(69, 0.5, 0.9, tr)`, 700);
  await page.evaluate(() => { window.__tr.fx.push({ id: 'f1', type: 'filter', enabled: true, params: { cutoff: 80, resonance: 0.7, mode: 'lowpass' } }); rebuildTrackAudioGraph(window.__tr); });
  await page.waitForTimeout(150);
  const pFx = await measure(`auditionMidiNote(69, 0.5, 0.9, tr)`, 700);
  check('FX-Rack der Spur wirkt auf SpessaSynth-Signal', pFx < pBase * 0.3, `ohne FX ${pBase.toFixed(3)} → Lowpass 80 Hz ${pFx.toFixed(3)}`);
  await page.evaluate(() => { window.__tr.fx.length = 0; rebuildTrackAudioGraph(window.__tr); });

  // Zeitgenauigkeit: Note in 0,40 s einplanen → Einsatz per Analyser erkennen
  const onset = await page.evaluate(async () => {
    const an = window.__an, ctx = audioEngine.ctx, buf = new Float32Array(an.fftSize);
    await new Promise(r => setTimeout(r, 1500));
    const target = ctx.currentTime + 0.40;
    const dest = audioEngine.channelNodes[window.__tr.id].input;
    synthMidiVoice(ctx, dest, target, midiVoiceOpts(window.__tr, { midiNote: 69, durationSec: 0.3, velocity: 0.9 }));
    let hit = null; const t0 = performance.now();
    while (performance.now() - t0 < 1200 && hit === null) { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); if (p > 0.01) hit = ctx.currentTime; await new Promise(r => setTimeout(r, 2)); }
    return { target, hit, delta: hit === null ? null : hit - target };
  });
  check('Geplante Note setzt zum Zielzeitpunkt ein (±60 ms)', onset.hit !== null && Math.abs(onset.delta) < 0.06, `Abweichung ${onset.delta === null ? 'kein Einsatz' : (onset.delta * 1000).toFixed(0) + ' ms'}`);

  // Stop-Panic: hängende Note wird beendet
  const afterStop = await page.evaluate(async () => {
    const an = window.__an, buf = new Float32Array(an.fftSize);
    synthMidiVoice(audioEngine.ctx, audioEngine.channelNodes[window.__tr.id].input, audioEngine.ctx.currentTime, midiVoiceOpts(window.__tr, { midiNote: 60, durationSec: 8, velocity: 0.9 }));
    await new Promise(r => setTimeout(r, 400)); audioEngine.stop(true); await new Promise(r => setTimeout(r, 900));
    let p = 0; an.getFloatTimeDomainData(buf); for (const v of buf) p = Math.max(p, Math.abs(v)); return p;
  });
  check('Stop beendet laufende SoundFont-Noten', afterStop < 0.002, 'Peak ' + afterStop.toFixed(5));

  // Export (WAV) mit SpessaSynth-Offline-Renderer
  const exp = await page.evaluate(async () => {
    window.__wav = null; window.saveOrShareBlob = async (blob) => { window.__wav = blob; return 'saved-documents'; };
    const tr = window.__tr;
    tr.midiNotes = [{ id: 1, pitch: 69, start: 0, dur: 4, vel: 110 }, { id: 2, pitch: 69, start: 16, dur: 4, vel: 110 }];
    tr.stepVelocities = new Array(32).fill(110);
    dawState.tracks.forEach(t => { if (t !== tr) t.mute = true; }); // nur die Piano-Spur hörbar
    await exportMasterWav();
    if (!window.__wav) return { err: 'kein WAV erzeugt' };
    const ab = await window.__wav.arrayBuffer(); const dv = new DataView(ab);
    const ch = dv.getUint16(22, true), sr = dv.getUint32(24, true), dataOff = 44; const n = (ab.byteLength - dataOff) / 2 / ch;
    let peak = 0, firstIdx = -1; const win = Math.floor(sr * 0.01);
    for (let i = 0; i < n; i++) { const v = Math.abs(dv.getInt16(dataOff + i * ch * 2, true)) / 32768; if (v > peak) peak = v; if (firstIdx < 0 && v > 0.01) firstIdx = i; }
    return { sr, ch, seconds: n / sr, peak, firstSec: firstIdx / sr };
  });
  check('WAV-Export enthält SoundFont-Spur', !exp.err && exp.peak > 0.01, JSON.stringify(exp));

  // Fallback: Engine aus → eigener Player spielt weiter
  const pFallback = await (async () => {
    await page.evaluate(() => { SpessaEngine.setEnabled(false); });
    const p = await measure(`auditionMidiNote(69, 0.5, 0.9, tr)`, 900);
    await page.evaluate(() => { SpessaEngine.setEnabled(true); });
    return p;
  })();
  check('Fallback bei ausgeschalteter Engine (einfacher Player)', pFallback > 0.01, 'Peak ' + pFallback.toFixed(3));

  const fatal = errors.filter(e => !/tailwind|JSZip/i.test(e));
  check('Keine Skriptfehler während des Tests', fatal.length === 0, fatal.join(' | ').slice(0, 400));
  const bad = logs.filter(l => /^\[error\]/.test(l) && !/Failed to load resource|net::ERR|tailwind|cdn/i.test(l));
  if (bad.length) console.log('Konsole (Fehler):\n  ' + bad.slice(0, 8).join('\n  '));

  await browser.close(); srv.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} Prüfungen bestanden`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TESTLAUF-FEHLER', e); process.exit(2); });
