// AudioWorklet processor for the Godot sketch. Loaded by sketch-player.js with audioWorklet.addModule.
// It keeps Godot's global sample counter n: silence while paused does not advance it, so Play resumes
// mid-bar exactly as Godot's stop_music_playback leaves sketch_frames_pushed alone.
// Port messages in: {mask}, {playing}, {position}. Out: {n} about every 50 ms while playing.
import { renderSketch } from './sketch-core.js';

class TenderloinSketch extends AudioWorkletProcessor {
  // processorOptions takes the same fields as a port message, applied before the first quantum.
  constructor(options) {
    super();
    this.n = 0; this.mask = 1; this.playing = false; this.since = 0;
    this.apply(options?.processorOptions);
    this.port.onmessage = ({ data }) => { this.apply(data); this.port.postMessage({ n: this.n }); };
  }
  apply(data) {
    if (!data || typeof data !== 'object') return;
    if (Number.isInteger(data.mask)) this.mask = (data.mask & 15) | 1;
    if (typeof data.playing === 'boolean') this.playing = data.playing;
    if (Number.isInteger(data.position) && data.position >= 0) this.n = data.position;
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || !out.length) return true;
    const first = out[0];
    if (!this.playing) { for (const channel of out) channel.fill(0); return true; }
    // sampleRate is the AudioWorkletGlobalScope's context rate; 22050 is sample-exact with Godot.
    this.n = renderSketch(first, this.n, this.mask, sampleRate);
    for (let c = 1; c < out.length; c++) out[c].set(first);
    this.since += first.length;
    if (this.since >= sampleRate * 0.05) { this.since = 0; this.port.postMessage({ n: this.n }); }
    return true;
  }
}
registerProcessor('tenderloin-sketch', TenderloinSketch);
