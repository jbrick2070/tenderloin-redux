import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ExperimentHost } from '../public/experimental-host.js';
import { readRecords, readBounded } from '../public/experiments/neighborhood-voices.js';

const turn = () => new Promise(resolve => setTimeout(resolve, 0));
const gate = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const audio = () => ({ paused: false, removed: false, loaded: false, pause() { this.paused = true; }, removeAttribute() { this.removed = true; }, load() { this.loaded = true; } });

test('default off never calls loader, and repeated enable shares its pending activation', async () => {
  let calls = 0; const ready = gate();
  const host = new ExperimentHost({ load: async () => { calls++; return ready.promise; } });
  assert.deepEqual(host.snapshot(), { enabled: false, status: 'off', resources: 0, audio: 0, cleanupErrors: 0 });
  await host.setEnabled(false); assert.equal(calls, 0);
  await host.activate(); await host.setEnabled('true'); assert.equal(calls, 0, 'direct activation and nonboolean flags fail closed');
  const first = host.setEnabled(true), second = host.setEnabled(true); assert.equal(first, second);
  await turn(); assert.equal(calls, 1); ready.resolve({ open() {} }); await first;
  assert.equal(host.status, 'ready'); await host.setEnabled(false); assert.equal(host.snapshot().resources, 0);
});
test('off aborts pending loads; late resources and results dispose without presentation or activation', async () => {
  const ready = gate(); let scope, disposed = 0, presented = 0, disabled = 0;
  const host = new ExperimentHost({ load: async context => { scope = context; await ready.promise; context.own(() => disposed++); context.present('late'); return { open() {}, dispose() { disposed++; } }; }, present: () => presented++, onDisable: () => disabled++ });
  const pending = host.setEnabled(true); await turn(); await host.setEnabled(false);
  assert.equal(scope.signal.aborted, true); ready.resolve(); await pending; await turn();
  assert.equal(disposed, 2); assert.equal(presented, 0); assert.equal(disabled, 1);
  assert.equal(host.status, 'off'); assert.equal(host.snapshot().resources, 0);
});
test('off/on rejects the old generation while the new instance stays active', async () => {
  const old = gate(); let calls = 0, opened = '', staleDispose = 0;
  const host = new ExperimentHost({ load: async () => { if (++calls === 1) { await old.promise; return { open() { opened = 'old'; }, dispose() { staleDispose++; } }; } return { open() { opened = 'new'; } }; } });
  const pending = host.setEnabled(true); await turn(); await host.setEnabled(false); await host.setEnabled(true);
  old.resolve(); await pending; await turn(); host.open();
  assert.equal(opened, 'new'); assert.equal(staleDispose, 1); assert.equal(host.status, 'ready'); await host.setEnabled(false);
});
test('audio pauses before other cleanup, errors cannot skip remaining cleanup, and repeated off is harmless', async () => {
  const first = audio(), second = audio(), order = [];
  const host = new ExperimentHost({ load: async scope => {
    scope.ownAudio(first); scope.ownAudio(second);
    scope.own(() => { assert.equal(first.paused && second.paused, true); order.push('last'); });
    scope.own(() => { order.push('throw'); throw Error('test-only cleanup failure'); });
    scope.own(() => order.push('first'));
    return { open() {}, dispose() { order.push('instance'); } };
  } });
  await host.setEnabled(true); const start = performance.now(); await host.setEnabled(false);
  assert.ok(performance.now() - start < 100, 'test-double pause command meets target; not acoustic latency proof');
  assert.deepEqual(order, ['instance', 'first', 'throw', 'last']); assert.ok(first.removed && first.loaded && second.removed && second.loaded);
  assert.equal(host.snapshot().cleanupErrors, 1); assert.equal(host.snapshot().resources, 0); assert.equal(host.snapshot().audio, 0);
  await host.setEnabled(false); assert.equal(order.length, 4);
});
test('failed load/open stay contained and retry is explicit, not repeated by opening or enabling', async () => {
  let calls = 0;
  const host = new ExperimentHost({ load: async () => { if (++calls === 1) throw Error('test-only missing module'); return { open() { if (calls === 2) throw Error('test-only bad view'); } }; } });
  await host.setEnabled(true); assert.equal(host.status, 'error'); await host.setEnabled(true); host.open(); assert.equal(calls, 1);
  host.suspend(); await host.resume(); assert.equal(host.status, 'error'); assert.equal(calls, 1, 'back navigation cannot retry a failure');
  await host.retry(); assert.equal(host.status, 'ready'); assert.equal(host.open(), false); assert.equal(host.status, 'error');
  await host.retry(); assert.equal(calls, 3); assert.equal(host.open(), true); await host.setEnabled(false); await host.retry(); assert.equal(calls, 3);
});
test('bounded deadline aborts stalled work, and a late result is cleaned up', async () => {
  const ready = gate(); let signal, disposed = 0;
  const host = new ExperimentHost({ timeout: 20, load: async scope => { signal = scope.signal; await ready.promise; return { open() {}, dispose() { disposed++; } }; } });
  await host.setEnabled(true); assert.equal(host.status, 'error'); assert.equal(signal.aborted, true); assert.equal(host.snapshot().resources, 0);
  ready.resolve(); await turn(); assert.equal(disposed, 1); assert.equal(host.status, 'error'); await host.setEnabled(false);
});
test('suspend/resume cleans resources without clearing enabled preference; silence affects only registered audio', async () => {
  const optional = audio(), main = audio(); let calls = 0, disabled = 0;
  const host = new ExperimentHost({ load: async scope => { calls++; scope.ownAudio(optional); return { open() {} }; }, onDisable: () => disabled++ });
  await host.setEnabled(true); host.silence(); assert.equal(optional.paused, true); assert.equal(main.paused, false);
  host.suspend(); assert.equal(host.enabled, true); assert.equal(host.status, 'paused'); assert.equal(disabled, 0); assert.equal(host.snapshot().audio, 0);
  await host.resume(); assert.equal(host.status, 'ready'); assert.equal(calls, 2); await host.setEnabled(false); assert.equal(disabled, 1);
});
test('resource releases are idempotent and repeated toggles remove every registered listener', async () => {
  const target = new EventTarget(); let events = 0;
  const host = new ExperimentHost({ load: async scope => {
    const release = scope.listen(target, 'ping', () => events++);
    scope.own(() => { release(); release(); });
    return { open() {} };
  } });
  for (let i = 0; i < 30; i++) {
    await host.setEnabled(true); target.dispatchEvent(new Event('ping')); assert.equal(events, i + 1);
    await host.setEnabled(false); target.dispatchEvent(new Event('ping')); assert.equal(events, i + 1); assert.equal(host.snapshot().resources, 0);
  }
});
test('three pinned organization sources accept only bounded text and exact official links', async () => {
  const data = JSON.parse(await readFile('public/experiments/neighborhood-voices.json', 'utf8'));
  const result = readRecords(data); assert.equal(result.records.length, 3); assert.equal(result.checkedAt, '2026-10-18');
  for (const mutate of [d => d.records.push(d.records[0]), d => d.records[1] = d.records[0], d => d.checkedAt = 'tomorrow', d => d.records[0].id = { toString: 3 }, d => d.records[0].url += '?redirect=evil', d => d.records[0].url = 'javascript:alert(1)', d => d.records[0].summary = 'x'.repeat(451), d => d.records[0].name = null]) {
    const bad = structuredClone(data); mutate(bad); assert.throws(() => readRecords(bad));
  }
  data.records[0].extra = 'ignored'; assert.equal(readRecords(data).records[0].extra, undefined);
});
test('organization JSON body is bounded by bytes before complete parsing, including split UTF8 chunks', async () => {
  const text = 'A neighbor’s note'; const bytes = new TextEncoder().encode(text);
  const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 11)); controller.enqueue(bytes.slice(11)); controller.close(); } }));
  assert.equal(await readBounded(response), text);
  let cancelled = false;
  const huge = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(9000)); }, cancel() { cancelled = true; } }));
  await assert.rejects(readBounded(huge), /too large/); assert.equal(cancelled, true);
});
