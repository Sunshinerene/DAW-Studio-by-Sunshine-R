
/* ===== Sunshine@R · SpessaHost (AudioWorkletProcessor) – nutzt SpessaRunner =====
   16 Stereo-Ausgänge: MIDI-Kanal k → Ausgang k (trocken; Effekte macht das DAW-FX-Rack). */
class SpessaHost extends AudioWorkletProcessor {
  constructor() {
    super();
    this.runner = null;
    this.failed = false;
    try { this.runner = new SpessaRunner(sampleRate, currentTime); }
    catch (e) { this.fail('SpessaSynth konnte nicht gestartet werden: ' + (e && e.message ? e.message : e)); }
    this.port.onmessage = ev => this.onMsg(ev.data);
  }
  fail(msg, id) { this.failed = true; this.port.postMessage({ type: 'error', message: msg, id }); }
  async onMsg(m) {
    if (!m || !this.runner) return;
    try {
      if (m.type === 'load') { await this.runner.loadFont(m.buffer); this.port.postMessage({ type: 'loaded', id: m.id }); }
      else if (m.type === 'ev') this.runner.insert(m);
      else if (m.type === 'panic') this.runner.panic();
      else if (m.type === 'gain') this.runner.gain = Math.max(0, Math.min(8, Number(m.value) || 0));
    } catch (e) {
      this.fail((m.type === 'load' ? 'SoundFont konnte nicht geladen werden: ' : 'SpessaSynth: ') + (e && e.message ? e.message : e), m.id);
    }
  }
  process(_inputs, outputs) {
    const r = this.runner;
    if (!r || this.failed || !r.fontReady || r.idle) return true; // Leerlauf: Ausgänge bleiben still
    try { r.render(currentTime, outputs, outputs[0][0].length); }
    catch (e) { this.fail('SpessaSynth-Fehler im Audio-Thread: ' + (e && e.message ? e.message : e)); }
    return true;
  }
}
registerProcessor('spessa-host', SpessaHost);
