import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLACK_HAWK, WEST_INTERSECTIONS, WEST_FACADES } from '../public/history.js';
import { Camera } from '../public/camera.js';
import { makeWays, NEIGHBORS, PLACES, World, objectLabel } from '../public/world.js';
import { initialState, applyAction, loadSave, serializeSave, progress, findPath, walkable, project } from '../public/core.js';
const data = JSON.parse(readFileSync(new URL('../public/data/streets.osm.json', import.meta.url)));
const ways = makeWays(data);

test('western intersections retain actual shared OSM nodes and uncompressed distances', () => {
  for (const cross of WEST_INTERSECTIONS) {
    const shared = data.ways.filter(w => w.nodes.includes(cross.node));
    assert.ok(shared.some(w => w.name === 'Turk Street'));
    const street = shared.find(w => w.name === cross.name); assert.ok(street);
    assert.deepEqual(project(street.geometry[street.nodes.indexOf(cross.node)]), { x: cross.x, y: cross.y });
  }
  assert.ok(Math.abs(WEST_INTERSECTIONS[2].x / 5) > 439 && Math.abs(WEST_INTERSECTIONS[2].x / 5) < 441);
  assert.ok(WEST_INTERSECTIONS[0].x > WEST_INTERSECTIONS[1].x && WEST_INTERSECTIONS[1].x > BLACK_HAWK.x);
});

test('long walk and return from western bounds reach every neighbor and history stop', () => {
  for (const start of [initialState().player, { x: -2390, y: 0 }, BLACK_HAWK]) {
    for (const target of [...NEIGHBORS, ...PLACES]) {
      const path = findPath(start, target, ways); assert.ok(path.length, `${start.x} -> ${target.id}`);
      path.forEach(p => { assert.ok(walkable(p, ways)); assert.deepEqual(Object.keys(p).sort(), ['x', 'y']); });
    }
  }
  assert.deepEqual(findPath(initialState().player, { x: -2450, y: 0 }, ways), []);
  assert.deepEqual(findPath(initialState().player, { x: -1200, y: -200 }, ways), []);
});

test('discovery is additive v1, bounded and independent of gathering and unknown optional JSON', () => {
  const state = initialState(); state.optional = { future: { untouched: true } };
  const seen = applyAction(state, { type: 'discover-blackhawk' });
  assert.equal(state.blackhawk, false); assert.equal(seen.blackhawk, true);
  assert.deepEqual(progress(seen), progress(state)); assert.deepEqual(seen.optional, state.optional);
  seen.player = { x: BLACK_HAWK.x, y: BLACK_HAWK.y };
  assert.deepEqual(loadSave(serializeSave(seen)).state, seen);
  const envelope = JSON.parse(serializeSave(state)); delete envelope.core.blackhawk;
  assert.equal(loadSave(JSON.stringify(envelope)).state.blackhawk, false);
  envelope.core.blackhawk = { forged: true }; assert.equal(loadSave(JSON.stringify(envelope)).state.blackhawk, false);
});

test('route overview leaves opening view readable and western reload follows saved player', () => {
  for (const width of [320, 940]) {
    const camera = new Camera(width, 520, BLACK_HAWK);
    assert.equal(camera.following, true); assert.equal(camera.center.x, BLACK_HAWK.x);
    camera.overview(true); assert.equal(camera.scale, camera.minimum); assert.equal(camera.routeOverview, true);
    for (const p of [BLACK_HAWK, NEIGHBORS[3]]) {
      const x = camera.offset.x + p.x * camera.scale; assert.ok(x > 0 && x < width);
    }
    camera.resize(width, 640); assert.equal(camera.scale, camera.minimum);
    camera.overview(); assert.equal(camera.scale, camera.fit); assert.ok(camera.fit > camera.minimum);
    assert.equal(camera.routeOverview, false);
  }
});

test('visible Black Hawk label selects its stop at route, block and follow zooms', () => {
  for (const scale of [.1, .111, .28, .85, 1, 1.6]) {
    const label = objectLabel(BLACK_HAWK, scale);
    const hit = World.prototype.hit.call({ scale, objects: () => [...NEIGHBORS, ...PLACES] }, { x: label.x, y: label.y - 7.5 * Math.max(1, 1 / scale) });
    assert.equal(hit?.id, 'blackhawk');
    assert.equal(World.prototype.hit.call({ scale, objects: () => PLACES }, BLACK_HAWK)?.id, 'blackhawk');
  }
  assert.equal(objectLabel(NEIGHBORS[0], .1), null, 'hidden overview labels cannot have label hits');
});

test('schematic west facades leave the authored road edges clear at each actual intersection', () => {
  for (const facade of WEST_FACADES) {
    assert.ok(facade.width > 0);
    for (const cross of [...WEST_INTERSECTIONS, { x: 0 }]) {
      assert.ok(facade.x >= cross.x + 61 || facade.x + facade.width <= cross.x - 61);
    }
  }
});

test('bounded search can traverse more than the old budget and exhaust a disconnected route', () => {
  const open = [-460, -360, -260, -160, -60, 40, 140, 220].map(y => ({ points: [{ x: -2400, y }, { x: 850, y }] }));
  const path = findPath({ x: 840, y: -450 }, { x: -2390, y: 210 }, open);
  assert.ok(path.length > 380, 'a distant walkable goal cannot fail because the old 12000-node cap was reached');
  const disconnected = [{ points: [{ x: 0, y: 0 }, { x: 700, y: 0 }] }, { points: [{ x: -2390, y: 0 }, { x: -2100, y: 0 }] }];
  assert.equal(walkable(BLACK_HAWK, disconnected), true);
  assert.deepEqual(findPath(initialState().player, BLACK_HAWK, disconnected), []);
});
