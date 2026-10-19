import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../public/camera.js';
import { BOUNDS } from '../public/core.js';
import { World, NEIGHBORS } from '../public/world.js';
import { LITTER, findPath } from '../public/core.js';

test('phone starts close to player while desktop offers full block', () => {
  const mobile = new Camera(358, 520, { x: 117, y: -49 });
  assert.equal(mobile.following, true); assert.ok(mobile.scale >= .85);
  assert.equal(mobile.center.x, 117);
  const desktop = new Camera(940, 680, { x: 117, y: -49 });
  assert.equal(desktop.overviewMode, true); assert.equal(desktop.scale, desktop.fit);
});
test('view changes preserve coordinate round trips and actual world positions', () => {
  const camera = new Camera(358, 520, { x: 117, y: -49 });
  for (const operation of [() => camera.zoom(1.35), () => camera.pan(-85, 20), () => camera.resize(600, 590), () => camera.overview()]) {
    operation();
    const point = { x: 647, y: -47 }, result = camera.toWorld(camera.offset.x + point.x * camera.scale, camera.offset.y + point.y * camera.scale);
    assert.ok(Math.abs(result.x - point.x) < 1e-9); assert.ok(Math.abs(result.y - point.y) < 1e-9);
  }
});
test('drag stops following, stays bounded, explicit follow restores tracking', () => {
  const camera = new Camera(358, 520, { x: 117, y: -49 });
  camera.pan(-100000, 100000); assert.equal(camera.following, false);
  assert.deepEqual(camera.center, { x: BOUNDS.right, y: BOUNDS.top });
  camera.track({ x: 300, y: 10 }); assert.equal(camera.center.x, BOUNDS.right);
  camera.follow({ x: 300, y: 10 }); assert.deepEqual(camera.center, { x: 300, y: -15 });
  camera.track({ x: 400, y: 20 }); assert.equal(camera.center.x, 400);
});
test('zoom clamps and resize keeps full block or a chosen close view', () => {
  const camera = new Camera(358, 520, { x: 117, y: -49 });
  camera.zoom(100); assert.equal(camera.scale, camera.maximum);
  camera.zoom(.00001); assert.equal(camera.scale, camera.minimum);
  camera.overview(); camera.resize(940, 680); assert.equal(camera.scale, camera.fit);
  camera.follow({ x: 117, y: -49 }); camera.zoom(1.35);
  const scale = camera.scale; camera.resize(358, 520); assert.equal(camera.scale, scale);
});
test('collapsed viewport cannot poison the camera before becoming visible again', () => {
  const camera = new Camera(358, 520, { x: 117, y: -49 });
  camera.overview(); camera.resize(0, 0); camera.pan(0, 0); camera.zoom(2);
  assert.ok(camera.scale > 0); assert.ok(Number.isFinite(camera.toWorld(0, 0).x));
  camera.resize(358, 520); camera.follow({ x: 117, y: -49 });
  assert.equal(camera.center.x, 117); assert.ok(Number.isFinite(camera.offset.y));
});
test('visible Rook label has priority over the wrapper beneath it at every zoom', () => {
  for (const scale of [.28, .85, 1, 1.6]) {
    const labelScale = Math.max(1, 1 / scale);
    const hit = World.prototype.hit.call({ scale, objects: () => [...NEIGHBORS, ...LITTER] }, { x: 578, y: 18 - (43 + 7.5) * labelScale });
    assert.equal(hit.id, 'rook');
    assert.equal(World.prototype.hit.call({ scale, objects: () => [...NEIGHBORS, ...LITTER] }, { x: 647, y: -47 }).id, 'dez', 'Rook label must not obscure Dez at overview scale');
  }
});
test('route waypoints carry coordinates only, never a neighbor appearance or ID', () => {
  const ways = [{ points: [{ x: -300, y: 0 }, { x: 850, y: 0 }] }];
  const path = findPath({ x: 95, y: -47 }, NEIGHBORS[0], ways);
  assert.ok(path.length); for (const point of path) assert.deepEqual(Object.keys(point).sort(), ['x', 'y']);
});
