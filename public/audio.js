export class MusicSketch {
  constructor() { this.context = null; this.enabled = false; this.starting = false; this.generation = 0; this.volume = .35; this.layers = {}; this.timer = null; this.tick = 0; }
  async start() {
    const generation = ++this.generation; this.starting = true;
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return false;
        this.context = new Context(); this.master = this.context.createGain(); this.master.connect(this.context.destination);
      }
      await this.context.resume();
      if (generation !== this.generation) return null;
      if (document.hidden) { this.stop(); return null; }
      this.enabled = true; this.setVolume(this.volume);
      this.next = this.context.currentTime + .07;
      clearInterval(this.timer); this.timer = setInterval(() => this.schedule(), 100); this.schedule(); return true;
    } catch { if (generation === this.generation) this.enabled = false; return false; }
    finally { if (generation === this.generation) this.starting = false; }
  }
  stop() { this.generation++; this.starting = false; this.enabled = false; clearInterval(this.timer); this.timer = null; if (this.master) this.master.gain.setTargetAtTime(0, this.context.currentTime, .02); }
  setVolume(value) { this.volume = Math.min(.8, Math.max(0, value)); if (this.master) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.context.currentTime, .03); }
  update(layers) { this.layers = layers; }
  note(midi, time, duration, gain, type = 'sine') {
    const osc = this.context.createOscillator(), amp = this.context.createGain();
    osc.type = type; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    amp.gain.setValueAtTime(0, time); amp.gain.linearRampToValueAtTime(gain, time + .025); amp.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(amp); amp.connect(this.master); osc.start(time); osc.stop(time + duration + .02);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  }
  brush(time) {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * .08, this.context.sampleRate);
    const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .08;
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 4000; gain.gain.setValueAtTime(.32, time); gain.gain.exponentialRampToValueAtTime(.001, time + .08);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(time); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  schedule() {
    if (!this.enabled || this.context.state !== 'running') return;
    if (this.next < this.context.currentTime) this.next = this.context.currentTime + .05;
    while (this.next < this.context.currentTime + .25) {
      const beat = this.tick % 16, time = this.next;
      if (this.layers.layout && beat % 2 === 0) this.note([38, 45, 48, 45, 43, 50, 45, 41][beat / 2], time, .48, .25, 'triangle');
      if (this.layers.tidy && beat % 2 === 1) this.brush(time);
      if (this.layers.mural && beat % 4 === 0) for (const midi of (beat < 8 ? [62, 65, 69, 72] : [60, 64, 67, 71])) this.note(midi, time, 1.2, .043);
      if (this.layers.opened && [2, 5, 8, 12].includes(beat)) this.note({ 2: 69, 5: 72, 8: 67, 12: 65 }[beat], time, .65, .10, 'triangle');
      this.tick++; this.next += .375; // 80 BPM, eighth notes on one shared clock.
    }
  }
  dispose() { this.stop(); this.context?.close(); }
}
