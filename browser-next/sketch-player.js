// Main-thread player for the Godot sketch (sketch-core.js) on an AudioWorklet (sketch-worklet.js).
// Same public surface as audio.js MusicSketch (start, stop, setVolume, update, dispose, enabled, starting,
// volume), so audio.js can adopt it without soundtrack.js changing; plus position(), mute(), mask and
// ensureContext() for rewards.js and the Rhythm Circle. Not wired into game.js yet.
//
// The context asks for 22050 Hz, which makes the output sample-exact with Godot's generator. If that
// constructor throws, the default rate is used and sketch-core evaluates the same formula at t = k / rate.
// Without audioWorklet a ScriptProcessorNode runs the same core on the main thread.
import { renderSketch, stemMask, MIX_RATE, DEFAULT_VOLUME, MAX_VOLUME, cleanVolume } from './sketch-core.js';

const WORKLET_URL = new URL('./sketch-worklet.js', import.meta.url).href;

export class SketchPlayer {
  constructor({ volume = DEFAULT_VOLUME } = {}) {
    this.context = null; this.master = null; this.node = null; this.engine = ''; this.building = null;
    this.enabled = false; this.starting = false; this.generation = 0; this.muted = false;
    this.volume = cleanVolume(volume); this.layers = {}; this.currentMask = 1;
    this.reported = { n: 0, at: 0 }; this.k = 0; // k: the fallback engine's own counter
  }
  get mask() { return this.currentMask; }
  get rate() { return this.context?.sampleRate || MIX_RATE; }
  // One shared context for the sketch, the reward chimes and the drum bar. Null when the browser has no Web Audio or refuses a
  // context (Chrome caps open contexts): every caller then goes on silently. A context is kept only once its master is wired.
  ensureContext() {
    if (this.context) return this.context;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return null;
    let context = null;
    try {
      try { context = new Context({ sampleRate: MIX_RATE, latencyHint: 'interactive' }); }
      catch { context = new Context(); }
      const master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      this.context = context; this.master = master;
      return context;
    } catch {
      try { context?.close()?.catch?.(() => {}); } catch { /* a half-built context may refuse even close */ }
      return null;
    }
  }
  // One node however start() calls overlap: a start, stop and start while the worklet module loads waits for the first build.
  buildNode() {
    if (this.node) return Promise.resolve();
    this.building ??= this.makeNode().finally(() => { this.building = null; });
    return this.building;
  }
  async makeNode() {
    const ctx = this.context;
    let node = null;
    if (ctx.audioWorklet && globalThis.AudioWorkletNode) {
      try {
        await ctx.audioWorklet.addModule(WORKLET_URL);
        node = new AudioWorkletNode(ctx, 'tenderloin-sketch', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { mask: this.currentMask, playing: false } });
        node.port.onmessage = ({ data }) => { if (Number.isInteger(data?.n)) this.reported = { n: data.n, at: ctx.currentTime }; };
        this.engine = 'worklet';
      } catch { node = null; }
    }
    if (!node) {
      node = ctx.createScriptProcessor(1024, 0, 1);
      node.onaudioprocess = event => {
        const out = event.outputBuffer.getChannelData(0);
        if (!this.enabled) { out.fill(0); return; }
        this.k = renderSketch(out, this.k, this.currentMask, ctx.sampleRate);
        this.reported = { n: this.k, at: ctx.currentTime };
      };
      this.engine = 'script';
    }
    node.connect(this.master);
    this.node = node;
  }
  async start() {
    const generation = ++this.generation; this.starting = true;
    try {
      if (!this.ensureContext()) return false;
      await this.context.resume();
      await this.buildNode();
      if (generation !== this.generation) return null;
      if (globalThis.document?.hidden) { this.stop(); return null; }
      // The counter did not move while paused, so position() counts ahead from now, not from the pause.
      this.reported = { n: this.engine === 'script' ? this.k : this.reported.n, at: this.context.currentTime };
      this.enabled = true;
      this.node.port?.postMessage({ mask: this.currentMask, playing: true });
      this.applyGain();
      return true;
    } catch { if (generation === this.generation) this.enabled = false; return false; }
    finally { if (generation === this.generation) this.starting = false; }
  }
  // Pause: the position is kept, as in Godot.
  stop() {
    this.generation++; this.starting = false; this.enabled = false;
    this.node?.port?.postMessage({ playing: false });
    this.applyGain();
  }
  applyGain() {
    if (!this.master) return;
    const gain = this.enabled && !this.muted ? this.volume : 0;
    this.master.gain.setTargetAtTime(gain, this.context.currentTime, .02);
  }
  setVolume(value) { this.volume = Math.min(MAX_VOLUME, Math.max(0, Number(value) || 0)); this.applyGain(); }
  // The sketch goes quiet (Godot -80 dB) while a Rhythm Circle bar auditions; its clock keeps running.
  mute(on) { this.muted = !!on; this.applyGain(); }
  update(layers) {
    this.layers = layers || {}; this.currentMask = stemMask(this.layers);
    this.node?.port?.postMessage({ mask: this.currentMask });
  }
  // Godot frames heard so far: the reported position, advanced to now, minus the output latency.
  position() {
    const ctx = this.context;
    if (!ctx) return 0;
    const sr = ctx.sampleRate, ahead = this.enabled ? Math.max(0, ctx.currentTime - this.reported.at) * sr : 0;
    const latency = ((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * sr;
    const frames = Math.max(0, this.reported.n + ahead - latency);
    return sr === MIX_RATE ? Math.floor(frames) : Math.floor(frames * MIX_RATE / sr);
  }
  dispose() { this.stop(); this.node?.disconnect(); this.node = null; this.context?.close(); this.context = null; this.master = null; }
}
