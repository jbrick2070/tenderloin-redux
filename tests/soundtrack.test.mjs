import test from 'node:test';
import assert from 'node:assert/strict';
import { Soundtrack } from '../public/soundtrack.js';

function fixture() {
  const created = [], revoked = [], audios = [];
  const sketch = { enabled: false, starting: false, start() { this.enabled = true; return Promise.resolve(true); }, stop() { this.enabled = false; this.starting = false; }, setVolume(value) { this.volume = value; }, update() {}, dispose() { this.stop(); } };
  const music = new Soundtrack({ sketch, urls: { createObjectURL(file) { const url = `blob:${file.name}`; created.push(url); return url; }, revokeObjectURL(url) { revoked.push(url); } }, makeAudio() {
    const audio = { paused: true, currentTime: 0, handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; }, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; }, removeAttribute() {}, load() {} };
    audios.push(audio); return audio;
  }, hidden: () => false });
  return { music, sketch, audios, created, revoked };
}
const file = name => ({ name, size: 1024 });
test('local audio waits for Play, loops, uses shared volume and excludes sketch playback', async () => {
  const { music, sketch, audios } = fixture();
  await music.start(); assert.equal(sketch.enabled, true);
  music.setVolume(.2); music.loadFile(file('afternoon.wav'));
  assert.equal(sketch.enabled, false); assert.equal(music.enabled, false); assert.equal(audios[0].paused, true);
  assert.equal(audios[0].loop, true); assert.equal(audios[0].volume, .2);
  assert.equal(await music.start(), true); assert.equal(music.enabled, true); assert.equal(sketch.enabled, false);
  music.stop(); assert.equal(audios[0].paused, true); assert.equal(music.enabled, false);
});
test('replace/return releases old audio URLs; invalid files preserve current selection', () => {
  const { music, audios, revoked } = fixture();
  music.loadFile(file('one.mp3'));
  for (const invalid of [file('movie.mp4'), { name: 'empty.wav', size: 0 }, { name: 'huge.wav', size: 101 * 1024 * 1024 }]) assert.throws(() => music.loadFile(invalid), /MP3 or WAV/);
  assert.equal(music.fileName, 'one.mp3'); assert.deepEqual(revoked, []);
  music.loadFile(file('two.wav')); assert.equal(audios[0].paused, true); assert.deepEqual(revoked, ['blob:one.mp3']);
  music.useSketch(); assert.deepEqual(revoked, ['blob:one.mp3', 'blob:two.wav']); assert.equal(music.fileName, '');
  music.dispose(); assert.equal(revoked.length, 2);
});
test('stop during pending play prevents late audio restart', async () => {
  const { music, audios } = fixture(); music.loadFile(file('one.mp3'));
  let finish; audios[0].play = () => new Promise(resolve => { finish = () => { audios[0].paused = false; resolve(); }; });
  const starting = music.start(); music.stop(); finish();
  assert.equal(await starting, null); assert.equal(music.enabled, false); assert.equal(audios[0].paused, true);
});
test('replacing a pending track cannot pause or enable its replacement', async () => {
  const { music, audios } = fixture(); music.loadFile(file('one.mp3'));
  let finish; audios[0].play = () => new Promise(resolve => { finish = resolve; });
  const starting = music.start(); music.loadFile(file('two.wav')); await music.start(); finish(); await starting;
  assert.equal(audios[0].paused, true); assert.equal(audios[1].paused, false); assert.equal(music.enabled, true);
});
test('hidden completion, failed playback and decode errors remain silent and recoverable', async () => {
  const { music, audios } = fixture(); music.loadFile(file('one.wav'));
  music.hidden = () => true; assert.equal(await music.start(), null); assert.equal(audios[0].paused, true);
  music.hidden = () => false; audios[0].play = () => Promise.reject(Error('unsupported'));
  assert.equal(await music.start(), false); assert.equal(music.enabled, false); assert.match(music.error, /Playback/);
  audios[0].handlers.error(); assert.match(music.error, /could not play/); assert.equal(music.starting, false);
  music.useSketch(); assert.equal(await music.start(), true);
});
test('decode error during play returns failure and cannot be retried into a misleading status', async () => {
  const { music, audios } = fixture(); music.loadFile(file('bad.wav'));
  let fail, calls = 0;
  audios[0].play = () => { calls++; return new Promise((resolve, reject) => { fail = () => { audios[0].error = { code: 3 }; audios[0].handlers.error(); reject(Error('decode')); }; }); };
  const starting = music.start(); fail();
  assert.equal(await starting, false); assert.match(music.error, /could not play/);
  assert.equal(await music.start(), false); assert.equal(calls, 1); assert.match(music.error, /could not play/);
});
test('file replacement and fallback publish one coherent selection each', () => {
  const { music } = fixture(), selections = []; music.onChange = () => selections.push(music.fileName);
  music.loadFile(file('one.wav')); music.loadFile(file('two.wav')); music.useSketch();
  assert.deepEqual(selections, ['one.wav', 'two.wav', '']);
});
test('external pause updates enabled while a stale pause event cannot stop resumed UI', async () => {
  const { music, audios } = fixture(); music.loadFile(file('one.wav')); await music.start();
  audios[0].paused = true; audios[0].handlers.pause(); assert.equal(music.enabled, false);
  await music.start(); audios[0].handlers.pause(); assert.equal(music.enabled, true);
});
test('sketch startup notifies pending/failure and honors a late host hidden predicate', async () => {
  const { music, sketch } = fixture(); let finish;
  sketch.start = () => { sketch.starting = true; return new Promise(resolve => { finish = result => { sketch.starting = false; sketch.enabled = result; resolve(result); }; }); };
  const states = []; music.onChange = () => states.push(music.starting);
  const first = music.start(); assert.equal(states[0], true); finish(false);
  assert.equal(await first, false); assert.match(music.error, /unavailable/);
  const second = music.start(); music.hidden = () => true; finish(true);
  assert.equal(await second, null); assert.equal(music.enabled, false);
});
