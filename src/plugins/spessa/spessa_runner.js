
/* ===== Sunshine@R · SpessaRunner: gemeinsame Render-Logik (AudioWorklet + Offline-Export) =====
   Erwartet globalThis.SpessaCore (SpessaSynth-Bundle). Keine Browser-APIs außer reinem JS. */
class SpessaRunner {
  constructor(sampleRate, startTime) {
    const C = globalThis.SpessaCore;
    if (!C) throw new Error('SpessaCore fehlt.');
    C.SpessaLog.setLogLevel(false, true, false);
    this.C = C;
    this.sr = sampleRate;
    this.queue = [];
    this.seq = 0;
    this.gain = 2.0;
    this.fontReady = false;
    this.L = new Float32Array(128);
    this.R = new Float32Array(128);
    this.synth = new C.SpessaSynthProcessor(sampleRate, {
      eventsEnabled: false,
      effectsEnabled: false,
      maxBufferSize: 128,
      initialTime: startTime || 0
    });
    try { this.synth.setSystemParameter('voiceCap', 128); } catch (_) {}
  }

  async loadFont(buffer) {
    const bank = this.C.SoundBankLoader.fromArrayBuffer(buffer);
    this.synth.soundBankManager.addSoundBank(bank, 'font');
    await this.synth.ready;
    this.fontReady = true;
  }

  insert(m) {
    // Reihenfolge bei gleicher Zeit: off < prog < on; danach Eingangsreihenfolge
    const pri = m.k === 'off' ? 0 : m.k === 'prog' ? 1 : 2;
    const ev = { t: m.t, k: m.k, ch: m.ch | 0, note: m.note | 0, vel: m.vel | 0, bank: m.bank | 0, preset: m.preset | 0, drums: !!m.drums, pri, seq: this.seq++ };
    const q = this.queue;
    let i = q.length;
    while (i > 0) {
      const p = q[i - 1];
      if (p.t < ev.t || (p.t === ev.t && (p.pri < ev.pri || (p.pri === ev.pri && p.seq < ev.seq)))) break;
      i--;
    }
    q.splice(i, 0, ev);
  }

  panic() {
    this.queue.length = 0;
    this.synth.stopAll(false);
  }

  apply(ev) {
    const s = this.synth;
    if (ev.ch < 0 || ev.ch > 15) return;
    if (ev.k === 'on') s.noteOn(ev.ch, ev.note, Math.max(1, Math.min(127, ev.vel)));
    else if (ev.k === 'off') s.noteOff(ev.ch, ev.note);
    else if (ev.k === 'prog') {
      if (ev.drums) {
        s.midiChannels[ev.ch].setDrums(true);
        s.programChange(ev.ch, ev.preset);
      } else {
        s.midiChannels[ev.ch].setDrums(false);
        s.controllerChange(ev.ch, 0, ev.bank);
        s.programChange(ev.ch, ev.preset);
      }
    }
  }

  get idle() { return this.queue.length === 0 && this.synth.voiceCount === 0; }

  /* Rendert n (≤128) Frames ab Zeit t0 in outputs[k] = [L, R] (16 Kanäle, werden ADDIERT; vorher nullen).
     Ereignisse werden sample-genau angewendet. */
  render(t0, outputs, n) {
    const s = this.synth, q = this.queue, sr = this.sr;
    const chOut = new Array(outputs.length);
    for (let k = 0; k < outputs.length; k++) chOut[k] = [outputs[k][0], outputs[k][1]];
    this.L.fill(0, 0, n);
    this.R.fill(0, 0, n);
    let pos = 0;
    while (pos < n) {
      const now = t0 + pos / sr;
      while (q.length && q[0].t <= now + 1e-9) this.apply(q.shift());
      let next = n;
      if (q.length) {
        const off = Math.ceil((q[0].t - t0) * sr - 1e-6);
        if (off < n) next = Math.max(off, pos + 1);
      }
      s.process(this.L, this.R, pos, next - pos, chOut);
      pos = next;
    }
    const g = this.gain;
    if (g !== 1) {
      for (let k = 0; k < outputs.length; k++) {
        for (let c = 0; c < 2; c++) { const o = outputs[k][c]; for (let i = 0; i < n; i++) o[i] *= g; }
      }
    }
  }
}
