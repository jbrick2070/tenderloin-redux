import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState, applyAction as act, canPlaceFurniture, progress, ready, LITTER, MOTIFS, serializeSave, loadSave, project, findPath, walkable, ORIGIN } from '../public/core.js';
import { makeWays, NEIGHBORS, PLACES } from '../public/world.js';
const ways = makeWays(JSON.parse(readFileSync(new URL('../public/data/streets.osm.json', import.meta.url))));
function furnished(layout = 'table') {
  let state = act(initialState(), { type: 'greet' }); state = act(state, { type: 'layout', value: layout });
  for (const [id, col, row] of [['table', 0, 3], ['seats', 2, 0], ['speaker', 5, 0]]) state = act(state, { type: 'furniture', id, col, row });
  return state;
}
function completed(layout) {
  let state = furnished(layout);
  for (const item of LITTER) state = act(state, { type: 'tidy', id: item.id });
  MOTIFS.forEach((id, col) => { state = act(state, { type: 'mural', id, col, row: 0 }); });
  return act(state, { type: 'soundcheck' });
}
test('both layouts can complete without sound playback or optional modules', () => {
  for (const layout of ['table', 'floor']) {
    const state = completed(layout); assert.equal(ready(state), true); assert.equal(act(state, { type: 'open' }).opened, true);
    assert.equal(loadSave(serializeSave(act(state, { type: 'open' }))).state.opened, true);
  }
});
test('blocked route, overlapping supplies, and out-of-grid footprints are rejected', () => {
  const state = furnished(); assert.equal(canPlaceFurniture(state, 'table', 0, 2), false);
  assert.equal(canPlaceFurniture(state, 'table', 2, 0), false); assert.equal(canPlaceFurniture(state, 'seats', 7, 4), false);
  const floor = furnished('floor'); assert.equal(canPlaceFurniture(floor, 'table', 0, 1), false); assert.equal(canPlaceFurniture(floor, 'table', 0, 4), false);
});
test('changing layout resets sound readiness and furniture, and opening locks the layout', () => {
  let state = act(completed('table'), { type: 'layout', value: 'floor' });
  assert.deepEqual(state.furniture, {}); assert.equal(state.soundcheck, false); assert.equal(ready(state), false);
  state = act(completed('table'), { type: 'open' }); assert.equal(act(state, { type: 'layout', value: 'floor' }), state);
});
test('moving a checked speaker requires another soundcheck', () => {
  const state = act(completed('table'), { type: 'furniture', id: 'speaker', col: 5, row: 4 });
  assert.equal(state.soundcheck, false); assert.equal(ready(state), false);
});
test('only authored litter can be collected and collections are idempotent', () => {
  const start = initialState(); assert.equal(act(start, { type: 'tidy', id: 'personal-bag' }), start);
  const once = act(start, { type: 'tidy', id: 'cup' }); assert.deepEqual(act(once, { type: 'tidy', id: 'cup' }).litter, ['cup']);
});
test('mural contributions move, reject overlap, and keep all three identities', () => {
  let state = completed('table'); const before = structuredClone(state.mural);
  state = act(state, { type: 'mural', id: 'sun', col: 1, row: 0 }); assert.deepEqual(state.mural, before);
  state = act(state, { type: 'mural', id: 'sun', col: 4, row: 2 }); assert.equal(Object.keys(state.mural).length, 3); assert.deepEqual(state.mural.sun, { col: 4, row: 2 });
});
test('a forged incomplete finale cannot be restored as complete', () => {
  const saved = { version: 1, core: { ...initialState(), opened: true, soundcheck: true }, optional: {} };
  const state = loadSave(JSON.stringify(saved)).state; assert.equal(state.opened, false); assert.equal(state.soundcheck, false);
});
test('malformed core fields are sanitized and bounded unknown optional JSON survives', () => {
  const original = completed('table'); original.optional = { futureModule: { discoveries: ['one'], enabledInSave: true } };
  const restored = loadSave(serializeSave(original)).state; assert.deepEqual(restored.optional, original.optional); assert.equal(ready(restored), true);
  const envelope = JSON.parse(serializeSave(original)); envelope.core.furniture.table = { col: 0, row: 2 }; envelope.core.player = { x: 'NaN', y: 9 };
  envelope.optional = { huge: 'x'.repeat(9000) }; const bad = loadSave(JSON.stringify(envelope)).state;
  assert.equal(progress(bad).layout, false); assert.deepEqual(bad.player, initialState().player); assert.deepEqual(bad.optional, {});
});
test('whole-file damage and unknown version request recovery, not silent overwrite', () => {
  for (const raw of ['broken', '{"version":99,"core":{}}', 'x'.repeat(70000), 'null']) assert.equal(loadSave(raw).recovery, true);
});
test('actual Turk/Taylor shared OSM node projects to the origin without block compression', () => {
  assert.deepEqual(project(ORIGIN), { x: 0, y: 0 });
  const node = ways.filter(w => w.nodes.includes('65343958'));
  assert.ok(node.some(w => w.name === 'Taylor Street')); assert.ok(node.some(w => w.name === 'Turk Street'));
  const mason = project({ lat: 37.7834292, lon: -122.4091399 }); assert.ok(mason.x > 730 && mason.x < 740); assert.ok(Math.abs(mason.y) < .001);
});
test('every quest target and neighbor is reachable on the street network without crossing a building', () => {
  const start = initialState().player;
  for (const target of [...NEIGHBORS, ...PLACES, ...LITTER]) {
    const path = findPath(start, target, ways); assert.ok(path.length, `no path to ${target.id}`);
    path.forEach(p => assert.ok(walkable(p, ways), `path crosses building to ${target.id}`));
  }
  assert.deepEqual(findPath(start, { x: 350, y: -250 }, ways), []);
});
