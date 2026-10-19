import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicSketch } from '../public/audio.js';

async function delayedResume(hidden, callback) {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  let finish;
  class FakeContext {
    currentTime = 0;
    destination = {};
    createGain() { return { connect() {}, gain: { setTargetAtTime() {} } }; }
    resume() { return new Promise(resolve => { finish = resolve; }); }
  }
  globalThis.window = { AudioContext: FakeContext }; globalThis.document = { hidden };
  try { await callback(new MusicSketch(), () => finish()); }
  finally { globalThis.window = previousWindow; globalThis.document = previousDocument; }
}
test('stopping during an asynchronous audio resume cannot re-enable playback', async () => {
  await delayedResume(false, async (music, finish) => {
    const starting = music.start(); assert.equal(music.starting, true); music.stop(); finish();
    assert.equal(await starting, null); assert.equal(music.enabled, false); assert.equal(music.starting, false); assert.equal(music.timer, null);
  });
});
test('audio startup that finishes while hidden never schedules sound', async () => {
  await delayedResume(true, async (music, finish) => {
    const starting = music.start(); finish(); assert.equal(await starting, null);
    assert.equal(music.enabled, false); assert.equal(music.starting, false); assert.equal(music.timer, null);
  });
});
