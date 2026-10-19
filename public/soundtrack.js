import { MusicSketch } from './audio.js';
const DECODE_ERROR = 'This file could not play. Try another MP3/WAV or return to the sketch.';

// User-selected audio stays in a browser object URL for this tab, never in game saves.
export class Soundtrack {
  constructor({ sketch = new MusicSketch(), makeAudio = () => new Audio(), urls = URL, hidden = () => document.hidden, onChange = () => {} } = {}) {
    this.sketch = sketch; this.makeAudio = makeAudio; this.urls = urls; this.hidden = hidden; this.onChange = onChange;
    this.audio = null; this.url = null; this.fileName = ''; this.error = ''; this.volume = .35;
    this.localEnabled = false; this.localStarting = false; this.generation = 0; this.failed = false;
  }
  get enabled() { return this.audio ? this.localEnabled : this.sketch.enabled; }
  get starting() { return this.audio ? this.localStarting : this.sketch.starting; }
  get position() { return this.audio?.currentTime ?? null; }
  loadFile(file) {
    if (!file || !/\.(mp3|wav)$/i.test(file.name) || file.size <= 0 || file.size > 100 * 1024 * 1024) throw Error('Choose an MP3 or WAV file up to 100 MB.');
    const url = this.urls.createObjectURL(file);
    let audio;
    try { audio = this.makeAudio(); audio.preload = 'metadata'; audio.loop = true; audio.volume = this.volume; }
    catch (error) { this.urls.revokeObjectURL(url); throw error; }
    this.halt(); this.releaseLocal();
    this.audio = audio; this.url = url; this.fileName = file.name; this.error = '';
    audio.addEventListener('error', () => { if (this.audio !== audio) return; this.failed = true; this.error = DECODE_ERROR; this.stop(); });
    audio.addEventListener('pause', () => { if (this.audio !== audio || !audio.paused || this.localStarting || !this.localEnabled) return; this.localEnabled = false; this.onChange(); });
    audio.src = url;
    this.onChange();
  }
  async start() {
    if (this.hidden()) { this.stop(); return null; }
    const audio = this.audio;
    if (!audio) {
      const generation = ++this.generation; this.error = '';
      const pending = this.sketch.start(); this.onChange();
      const result = await pending;
      if (generation !== this.generation) return null;
      if (this.hidden()) { this.stop(); return null; }
      if (result === false) this.error = 'Audio is unavailable in this browser. All activities still work.';
      this.onChange(); return result;
    }
    if (this.failed || audio.error) { this.failed = true; this.error = DECODE_ERROR; this.onChange(); return false; }
    const generation = ++this.generation; this.sketch.stop(); this.localStarting = true; this.error = ''; this.onChange();
    try {
      await audio.play();
      if (generation !== this.generation) {
        if (this.audio !== audio || (!this.localEnabled && !this.localStarting)) audio.pause();
        return null;
      }
      if (this.hidden()) { this.stop(); return null; }
      if (audio.paused) return null;
      this.localEnabled = true; return true;
    } catch {
      if (this.audio === audio && (this.failed || audio.error)) { this.error = DECODE_ERROR; return false; }
      if (generation === this.generation) { audio.pause(); this.localEnabled = false; this.error = 'Playback could not start. Try Play again, or choose another file.'; }
      return generation === this.generation ? false : null;
    } finally { if (generation === this.generation) this.localStarting = false; this.onChange(); }
  }
  halt() { this.generation++; this.localStarting = false; this.localEnabled = false; this.audio?.pause(); this.sketch.stop(); }
  stop() { this.halt(); this.onChange(); }
  setVolume(value) { this.volume = Math.max(0, Math.min(.8, Number.isFinite(value) ? value : 0)); this.sketch.setVolume(this.volume); if (this.audio) this.audio.volume = this.volume; }
  update(layers) { this.sketch.update(layers); }
  releaseLocal() {
    const audio = this.audio, url = this.url;
    this.audio = null; this.url = null; this.fileName = ''; this.failed = false;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    if (url) this.urls.revokeObjectURL(url);
  }
  useSketch() { this.halt(); this.releaseLocal(); this.error = ''; this.onChange(); }
  dispose() { this.useSketch(); this.sketch.dispose(); }
}
