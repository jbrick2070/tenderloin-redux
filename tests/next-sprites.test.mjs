// browser-next/sprites.js and the world.js layers hook, on a recording stand-in for
// CanvasRenderingContext2D (no browser). The browser proof of the drawing is a later package.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gdFunc, gdSource, gdStrings, jsStrings } from './gd-literal.mjs';
import { initialState } from '../browser-next/core.js';
import { gatheringScene } from '../browser-next/gathering.js';
import { World, NEIGHBORS, makeWays, objectLabel } from '../browser-next/world.js';
import { GODOT_TEXT, MAIN, web } from '../browser-next/visits/text.js';
import { gdf } from '../browser-next/visits/format.js';
import * as P from '../browser-next/visits/positions.js';
import { markers, keepsakes, darken, SURPRISE_IDS } from '../browser-next/visits/surprises.js';
import { initialTour, inspectMuseum, cycleEatery, lensColor, ringAngle, EATERIES } from '../browser-next/visits/landmarks.js';
import { initialMeal, changeMeal, worldDishes, TABLE_SLOTS } from '../browser-next/visits/meal.js';
import { initialDogs, dogsScene } from '../browser-next/visits/dogs.js';
import { initialLantern, lanternScene } from '../browser-next/visits/lantern.js';
import { initialPower, powerScene, fixtureLit } from '../browser-next/visits/power.js';
import { initialElection, electionScene } from '../browser-next/visits/election.js';

const loadSprites = () => import('../browser-next/sprites.js');
const SPRITES_SOURCE = new URL('../browser-next/sprites.js', import.meta.url);
const WAYS = makeWays(JSON.parse(readFileSync(new URL('../browser-next/data/streets.osm.json', import.meta.url), 'utf8')));
const T = GODOT_TEXT['main.gd'];
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- a recording 2D context
const STATE_KEYS = ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline', 'globalAlpha', 'globalCompositeOperation', 'lineCap', 'lineJoin'];
const DEFAULTS = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1, globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter' };
const PATH_METHODS = ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo'];
const DRAW_METHODS = ['fill', 'stroke', 'clip', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage', 'putImageData'];
const multiply = ([a, b, c, d, e, f], [A, B, C, D, E, F]) => [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
function recorder() {
  const calls = [], stack = [];
  let state = { ...DEFAULTS, dash: [], matrix: [1, 0, 0, 1, 0, 0] };
  const ctx = { calls, get depth() { return stack.length; }, snapshot: () => JSON.stringify(state) };
  for (const key of STATE_KEYS) Object.defineProperty(ctx, key, { get: () => state[key], set: value => { calls.push(['set', key, value]); state[key] = value; } });
  for (const name of [...PATH_METHODS, ...DRAW_METHODS]) ctx[name] = (...args) => { calls.push([name, ...args]); };
  ctx.save = () => { calls.push(['save']); stack.push(structuredClone(state)); };
  ctx.restore = () => { calls.push(['restore']); if (stack.length) state = stack.pop(); };
  ctx.setTransform = (...m) => { calls.push(['setTransform', ...m]); state.matrix = m; };
  ctx.translate = (x, y) => { calls.push(['translate', x, y]); state.matrix = multiply(state.matrix, [1, 0, 0, 1, x, y]); };
  ctx.scale = (x, y) => { calls.push(['scale', x, y]); state.matrix = multiply(state.matrix, [x, 0, 0, y, 0, 0]); };
  ctx.rotate = angle => { calls.push(['rotate', angle]); const c = Math.cos(angle), s = Math.sin(angle); state.matrix = multiply(state.matrix, [c, s, -s, c, 0, 0]); };
  ctx.setLineDash = dash => { calls.push(['setLineDash', dash]); state.dash = [...dash]; };
  ctx.getLineDash = () => [...state.dash];
  ctx.measureText = text => { calls.push(['measureText', text]); return { width: String(text).length * 6 }; };
  ctx.createLinearGradient = ctx.createRadialGradient = (...args) => { calls.push(['gradient', ...args]); return { addColorStop() {} }; };
  return ctx;
}
// Every fill, stroke, rectangle and text of a call list with the style it used.
function shapes(calls) {
  const out = [], stack = [];
  let style = { ...DEFAULTS }, path = [];
  for (const call of calls) {
    const [name] = call;
    if (name === 'set') style[call[1]] = call[2];
    else if (name === 'save') stack.push({ ...style });
    else if (name === 'restore') style = stack.pop() ?? style;
    else if (name === 'beginPath') path = [];
    else if (PATH_METHODS.includes(name)) path.push(call);
    else if (name === 'fill') out.push({ kind: 'fill', color: style.fillStyle, alpha: style.globalAlpha, path: [...path] });
    else if (name === 'stroke') out.push({ kind: 'stroke', color: style.strokeStyle, alpha: style.globalAlpha, path: [...path] });
    else if (name === 'fillRect') out.push({ kind: 'fillRect', color: style.fillStyle, alpha: style.globalAlpha, path: [call] });
    else if (name === 'fillText') out.push({ kind: 'text', color: style.fillStyle, text: call[1], path: [call] });
  }
  return out;
}
const texts = calls => shapes(calls).filter(s => s.kind === 'text');

// ---------------------------------------------------------------- a real World on a stub canvas
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };
globalThis.window ??= { devicePixelRatio: 1 };
const OPENED = () => ({ ...initialState(), opened: true, layout: 'table' });
function makeWorld({ layers, state = initialState(), width = 1024, height = 768 } = {}) {
  const ctx = recorder();
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width, height }), setPointerCapture() {}, focus() {} };
  const callbacks = { click() {}, reducedMotion: true };
  if (layers !== undefined) callbacks.layers = layers;
  const holder = { state };
  const world = new World(canvas, WAYS, () => holder.state, callbacks);
  return { world, ctx, holder };
}
function frame(w, time = 0, reduced = false) {
  w.ctx.calls.length = 0;
  w.world.draw(time, reduced);
  return w.ctx.calls.splice(0);
}
const zoom = (world, scale) => { world.camera.scale = scale; world.camera.update(); };

// ---------------------------------------------------------------- scenes from the pure modules
const allFixtures = p => Array.from({ length: 10 }, (_, i) => fixtureLit(p, i));
const powerPart = p => ({ ...powerScene(p), fixtures: allFixtures(p) });
const FESTIVAL = { ...initialPower(), active: true, restored: 1 };
const LARKIN = { ...initialPower(), active: true, historical: true };
function mealWith(count, placement = 0) {
  let m = changeMeal(initialMeal(), { type: 'open' }, { opened: true }).state;
  for (let i = 0; i < count; i++) {
    m = changeMeal(m, { type: 'select', index: i }).state;
    if (placement) m = changeMeal(m, { type: 'placement', index: placement }).state;
    for (let k = 0; k < 5; k++) m = changeMeal(m, { type: 'advance' }).state;
    m = changeMeal(m, { type: 'share' }).state;
  }
  return m;
}
const eateriesPart = tour => EATERIES.map((rec, index) => ({ index, id: rec.id, name: rec.name, awning: P.EATERY_AWNINGS[index], counter: tour.counters.includes(index) ? P.EATERY_COUNTERS[index] : null, canopy: '#' + rec.canopy_color, label: '#' + rec.label_color, menu: MAIN.EATERY_MENU_ITEMS[rec.id][0] }));
const museumPart = tour => ({ x: P.MUSEUM.x, y: P.MUSEUM.y, docent: P.MUSEUM_DOCENT, lens: lensColor(tour.era), rings: [0, 1, 2].map(i => ringAngle(tour, i)) });
const PARK_TREES = [{ x: -520, y: -690 }, { x: -420, y: -760 }, { x: -600, y: -650 }];
function emptyScene() {
  return {
    surprises: [], keepsakes: [], eateries: [], museum: null, park: null, soWhat: null, larkin: null,
    dishes: [], dogs: dogsScene(initialDogs()), lantern: lanternScene(initialLantern()), power: powerPart(initialPower()),
    election: electionScene(initialElection()), player: { x: 95, y: -47 }, tourMarker: null,
  };
}
function fullScene() {
  const found = ['jeffrey_record', 'good_donut_and_bagel'];
  const tour = cycleEatery(inspectMuseum(initialTour()).tour, 0).tour;
  return {
    surprises: markers(found), keepsakes: keepsakes(found), eateries: eateriesPart(tour), museum: museumPart(tour),
    park: { ring: P.PARK_RING, path: P.PARK_PATH, entrance: P.PARK_ENTRANCE, trees: PARK_TREES, label: T.build_boeddeker_park.label },
    soWhat: { awning: P.SO_WHAT_AWNING, floor: P.SO_WHAT_LEAVENWORTH, labels: [T.build_street_life_decor.soWhatAwning, T.build_street_life_decor.soWhatFloor] },
    larkin: { exterior: P.LARKIN_EXTERIOR, junction: P.LARKIN_JUNCTION },
    dishes: worldDishes(mealWith(2), { opened: true, storyActive: false }),
    dogs: dogsScene({ ...initialDogs(), active: true }), lantern: lanternScene({ ...initialLantern(), active: true, progress: 20 }),
    power: powerPart(FESTIVAL), election: electionScene({ ...initialElection(), active: true, palette: 1 }),
    player: { x: 95, y: -47 }, tourMarker: { x: P.SO_WHAT_AWNING.x, y: P.SO_WHAT_AWNING.y },
  };
}
// The three layers of one scene, called as the World calls them.
function layerCalls(sprites, w, scene) {
  const { world, ctx } = w;
  ctx.calls.length = 0;
  sprites.ground(ctx, world, scene);
  const ground = ctx.calls.splice(0);
  const actors = sprites.actors(world, scene);
  for (const actor of actors) actor.draw(ctx, world);
  const actorCalls = ctx.calls.splice(0);
  sprites.overlay(ctx, world, scene);
  const overlay = ctx.calls.splice(0);
  return { ground, actors, actorCalls, overlay };
}

// ---------------------------------------------------------------- the world.js hook
test('world.js: an absent or empty layers hook leaves every canvas call unchanged', () => {
  const plain = makeWorld(), empty = makeWorld({ layers: {} }), idle = makeWorld({ layers: { objects: () => [], ground() {}, actors: () => [], overlay() {} } });
  for (const w of [plain, empty, idle]) { w.world.path = [{ x: 150, y: -40 }, { x: 220, y: -40 }]; w.world.hover = NEIGHBORS[1]; }
  for (const [time, reduced] of [[0, true], [3.7, false], [12.25, false]]) {
    const base = JSON.stringify(frame(plain, time, reduced));
    assert.ok(base.length > 10000, 'the frame records the whole map');
    assert.equal(JSON.stringify(frame(empty, time, reduced)), base, `layers: {} at ${time}`);
    assert.equal(JSON.stringify(frame(idle, time, reduced)), base, `idle layers at ${time}`);
  }
  for (const w of [empty, idle]) {
    assert.deepEqual(w.world.objects(), plain.world.objects());
    for (const p of [{ x: 117, y: -49 }, { x: 185, y: 14 }, { x: 800, y: 200 }]) assert.equal(w.world.hit(p)?.id, plain.world.hit(p)?.id);
    assert.equal(w.world.nearest()?.id, plain.world.nearest()?.id);
  }
  // Without layers the hook adds no call even unconditionally: the walking path follows the last
  // litter item's rectangle at once, and Bea's name chip follows Thanh, the last person, at once.
  const calls = frame(plain, 0, true), player = plain.holder.state.player, thanh = NEIGHBORS.find(n => n.id === 'thanh');
  const wrapper = calls.findLastIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#e3c870');
  assert.deepEqual(calls.slice(wrapper + 1, wrapper + 7), [['beginPath'], ['roundRect', -6, -3, 12, 6, 1], ['fill'], ['restore'], ['beginPath'], ['moveTo', player.x, player.y]]);
  const bea = calls.findIndex(c => c[0] === 'fillText' && c[1] === 'Bea');
  assert.deepEqual(calls.slice(bea - 19, bea - 15), [['set', 'fillStyle', thanh.hair], ['fill'], ['restore'], ['save']]);
});

test('world.js: layers.objects joins hit testing and nearest after the built-in objects', () => {
  const visit = { id: 'surprise:x', kind: 'visit', name: 'A visit object', x: 760, y: 100 };
  let given = null;
  const w = makeWorld({ layers: { objects: world => { given = world; return [visit]; } } });
  const objects = w.world.objects();
  assert.equal(given, w.world);
  assert.equal(objects.at(-1), visit);
  assert.deepEqual(objects.slice(0, -1), makeWorld().world.objects());
  assert.equal(w.world.hit({ x: 765, y: 104 }), visit);
  w.holder.state = { ...w.holder.state, player: { x: 750, y: 100 } };
  assert.equal(w.world.nearest()?.id, 'surprise:x');
});

test('world.js: ground draws after the litter and before the walking path; overlay after the people and before the name chips', () => {
  const marks = [];
  const w = makeWorld({ layers: { ground: (c, world) => marks.push(['ground', c.calls.length, c, world]), overlay: (c, world) => marks.push(['overlay', c.calls.length, c, world]) } });
  w.world.path = [{ x: 150, y: -40 }];
  marks.length = 0;
  const calls = frame(w, 0, true);
  assert.deepEqual(marks.map(m => m[0]), ['ground', 'overlay']);
  assert.ok(marks.every(m => m[2] === w.ctx && m[3] === w.world), 'called with the World context and the World');
  const set = (key, value) => call => call[0] === 'set' && call[1] === key && call[2] === value;
  const [ground, overlay] = marks.map(m => m[1]);
  assert.ok(calls.findLastIndex(set('fillStyle', '#faf0d866')) < ground, 'after the last litter halo');
  assert.ok(ground <= calls.findIndex(set('strokeStyle', '#456e5a85')), 'before the walking path');
  assert.ok(calls.findLastIndex(set('fillStyle', '#b59b5d')) < overlay, 'after Thanh, the last person by y');
  assert.ok(overlay <= calls.findIndex(call => call[0] === 'fillText' && call[1] === 'Bea'), 'before the neighbor name chips');
});

test('world.js: layers.actors join the people y-sort and draw themselves', () => {
  const coats = new Map([...NEIGHBORS.map(n => [n.coat, n.id]), ['#f0ce77', 'player']]);
  const drawn = [];
  const actor = y => ({ y, draw: (c, world) => { drawn.push(c === world.ctx); c.fillText(`actor ${y}`, 0, 0); } });
  const w = makeWorld({ layers: { actors: () => [actor(140), actor(-60), actor(0)] } });
  drawn.length = 0;
  const calls = frame(w, 0, true);
  const order = calls.filter(c => (c[0] === 'fillText' && String(c[1]).startsWith('actor ')) || (c[0] === 'set' && c[1] === 'fillStyle' && coats.has(c[2]))).map(c => c[0] === 'fillText' ? c[1] : coats.get(c[2]));
  assert.deepEqual(order, ['actor -60', 'celeste', 'bea', 'dez', 'player', 'actor 0', 'rook', 'thanh', 'actor 140']);
  assert.deepEqual(drawn, [true, true, true]);
});

// ---------------------------------------------------------------- sprites.js
test('sprites: an empty scene draws nothing, and broken parts never throw', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  for (const scene of [undefined, null, {}, emptyScene()]) {
    const r = layerCalls(sprites, w, scene);
    assert.deepEqual([r.ground, r.actors, r.overlay], [[], [], []], JSON.stringify(scene));
  }
  const broken = { surprises: [{}, null, { id: 'nope', x: NaN, y: 1 }], keepsakes: [{ id: 'x' }, null], eateries: [{}, null, { index: 99 }], museum: {}, park: { ring: [] }, soWhat: {}, larkin: { exterior: [] }, dishes: [{}, null], dogs: { dogs: [null], owners: [{}] }, lantern: {}, power: { afterDark: true, relays: [null, {}] }, election: {}, player: null, tourMarker: { x: 'a' } };
  for (const scene of [broken, { ...fullScene(), player: undefined }, { dogs: null, power: null, eateries: 'x', surprises: 3 }]) {
    const depth = w.ctx.depth, before = w.ctx.snapshot();
    assert.doesNotThrow(() => layerCalls(sprites, w, scene));
    assert.equal(w.ctx.depth, depth); assert.equal(w.ctx.snapshot(), before);
  }
});

test('sprites: each scene part draws in its own layer, and every layer leaves the context as it found it', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  zoom(w.world, 1);
  const full = fullScene();
  const expected = {
    surprises: ['actors', 'overlay'], keepsakes: ['actors'], eateries: ['ground', 'actors', 'overlay'], museum: ['ground', 'actors', 'overlay'],
    park: ['ground', 'overlay'], soWhat: ['ground', 'overlay'], larkin: ['ground'], dishes: ['ground'],
    dogs: ['actors'], lantern: ['actors'], power: ['actors', 'overlay'], election: ['actors'], tourMarker: ['overlay'],
  };
  for (const [part, layers] of Object.entries(expected)) {
    const scene = { ...emptyScene(), [part]: full[part] };
    const depth = w.ctx.depth, before = w.ctx.snapshot();
    const r = layerCalls(sprites, w, scene);
    assert.deepEqual(['ground', 'actors', 'overlay'].filter(l => (l === 'actors' ? r.actorCalls : r[l]).length), layers, part);
    assert.equal(w.ctx.depth, depth, `${part}: save/restore balanced`);
    assert.equal(w.ctx.snapshot(), before, `${part}: context state restored`);
    for (const call of [...r.ground, ...r.actorCalls, ...r.overlay]) assert.notEqual(call[0], 'drawImage', part);
    for (const actor of r.actors) assert.ok(Number.isFinite(actor.y) && typeof actor.draw === 'function', part);
  }
  // Larkin 2017 is daytime: relay kits and the battery stand, no after-dark overlay.
  const r = layerCalls(sprites, w, { ...emptyScene(), power: powerPart(LARKIN) });
  assert.ok(r.actors.length > 0);
  assert.deepEqual(r.overlay, []);
});

test('sprites: surprise markers are the accent at 1.25x when found and darkened 28% otherwise', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  const list = markers(['jeffrey_record', 'cutesy_dino']);
  const r = layerCalls(sprites, w, { ...emptyScene(), surprises: list });
  const fills = shapes(r.actorCalls).filter(s => s.kind === 'fill' && s.path.length === 1 && s.path[0][0] === 'arc');
  const beacon = m => fills.find(s => s.path[0][1] === m.x && s.color === (m.found ? m.accent : darken(m.accent, 0.28)));
  const found = list.filter(m => m.found).map(beacon), unfound = list.filter(m => !m.found).map(beacon);
  assert.equal(found.length + unfound.length, 10);
  assert.ok([...found, ...unfound].every(Boolean), 'one beacon per marker in its colour');
  assert.ok(found.some(s => s.color === '#f8cc58') && unfound.some(s => s.color === darken('#5fd4ba', 0.28)));
  const radius = s => s.path[0][3];
  for (const s of found) assert.ok(Math.abs(radius(s) - radius(unfound[0]) * 1.25) < 1e-9);
  for (const s of unfound) assert.equal(radius(s), radius(unfound[0]));
  assert.equal(r.actors.length, 10);
  for (const m of list) assert.ok(r.actors.some(a => a.y === m.y), m.id);
});

test('sprites: the after-dark overlay is only for an active festival, over the whole view', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  const tinted = calls => shapes(calls).filter(s => s.kind === 'fillRect' && s.color === '#101b2b');
  for (const [p, dark] of [[FESTIVAL, true], [{ ...FESTIVAL, restored: 7, won: true }, true], [LARKIN, false], [initialPower(), false], [{ ...initialPower(), won: true }, false]]) {
    const r = layerCalls(sprites, w, { ...emptyScene(), power: powerPart(p) });
    const tint = tinted(r.overlay);
    assert.equal(tint.length, dark ? 1 : 0, JSON.stringify(p));
    if (!dark) continue;
    assert.equal(tint[0].alpha, 0.45);
    assert.deepEqual(tint[0].path[0].slice(1), [0, 0, w.world.width, w.world.height]);
    const at = r.overlay.findIndex(c => c[0] === 'fillRect');
    assert.deepEqual(r.overlay.slice(0, at).filter(c => c[0] === 'setTransform').at(-1), ['setTransform', w.world.ratio, 0, 0, w.world.ratio, 0, 0]);
  }
  // Warm pools only once all three relays are back.
  const warm = p => shapes(layerCalls(sprites, w, { ...emptyScene(), power: powerPart(p) }).overlay).filter(s => s.kind === 'fill' && s.path[0]?.[0] === 'ellipse').length;
  assert.equal(warm(FESTIVAL), 0);
  assert.equal(warm({ ...FESTIVAL, restored: 7, won: true }), 3);
});

test('sprites: no clock is read; motion comes only from world.time', async () => {
  const { createSprites } = await loadSprites();
  const code = jsCode(readFileSync(SPRITES_SOURCE, 'utf8'));
  for (const banned of ['Date', 'performance', 'requestAnimationFrame', 'setTimeout', 'setInterval']) assert.doesNotMatch(code, new RegExp(`\\b${banned}\\b`), banned);
  const realNow = Date.now, perf = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  let reads = 0;
  Date.now = () => { reads++; return realNow(); };
  Object.defineProperty(globalThis, 'performance', { configurable: true, get() { reads++; return perf.get ? perf.get.call(globalThis) : perf.value; } });
  try {
    const sprites = createSprites({ reducedMotion: () => false }), scene = fullScene();
    const w = makeWorld({ state: OPENED(), layers: { objects: () => [], ground: (c, world) => sprites.ground(c, world, scene), actors: world => sprites.actors(world, scene), overlay: (c, world) => sprites.overlay(c, world, scene) } });
    for (const time of [0, 1.5, 40]) frame(w, time, false);
    layerCalls(sprites, w, scene);
  } finally {
    Date.now = realNow;
    Object.defineProperty(globalThis, 'performance', perf);
  }
  assert.equal(reads, 0);
});

test('sprites: reduced motion freezes every animation at its world.time 0 pose', async () => {
  const { createSprites } = await loadSprites();
  const w = makeWorld({ state: OPENED() }), scene = fullScene();
  zoom(w.world, 1);
  const at = (sprites, time) => { w.world.time = time; const r = layerCalls(sprites, w, scene); return JSON.stringify([r.ground, r.actorCalls, r.overlay]); };
  const moving = createSprites({ reducedMotion: () => false }), still = createSprites({ reducedMotion: () => true });
  assert.notEqual(at(moving, 0), at(moving, 2.5), 'the park trees and the tour marker move with world.time');
  assert.equal(at(still, 2.5), at(still, 0));
  assert.equal(at(still, 7.75), at(moving, 0));
  // Through the World: draw() zeroes world.time under reduced motion, so the frame is the same at any time.
  const sprites = createSprites({ reducedMotion: () => true });
  const v = makeWorld({ state: OPENED(), layers: { ground: (c, world) => sprites.ground(c, world, scene), actors: world => sprites.actors(world, scene), overlay: (c, world) => sprites.overlay(c, world, scene) } });
  assert.equal(JSON.stringify(frame(v, 9.5, true)), JSON.stringify(frame(v, 0, true)));
});

test('sprites through the hook: visit actors join the people y-sort, and the scene draws between the World layers', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false });
  const won = dogsScene({ ...initialDogs(), active: true, won: true });
  const scene = { ...emptyScene(), dogs: won, park: fullScene().park };
  const w = makeWorld({ layers: { objects: () => [], ground: (c, world) => sprites.ground(c, world, scene), actors: world => sprites.actors(world, scene), overlay: (c, world) => sprites.overlay(c, world, scene) } });
  const calls = frame(w, 0, true);
  const coats = new Map([...NEIGHBORS.map(n => [n.coat, n.id]), ['#f0ce77', 'player'], ['#587c83', 'owner0'], ['#b26b61', 'owner1']]);
  const order = calls.filter(c => c[0] === 'set' && c[1] === 'fillStyle' && coats.has(c[2])).map(c => coats.get(c[2]));
  // Owners stand at y -8, between the player (-47) and Rook (18).
  assert.deepEqual(order, ['celeste', 'bea', 'dez', 'player', 'owner0', 'owner1', 'rook', 'thanh']);
  const lawn = calls.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#5b8f55');
  assert.ok(lawn > calls.findLastIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#faf0d866'), 'the park lawn is ground, after the litter');
  assert.ok(lawn < calls.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#c87d82'), 'and under the people');
});

// The Label3D tints of godot/main.gd: make_label_3d("Name", "text", Vector3(…), Color("hex")).
function labelTints(fn) {
  const out = new Map();
  for (const m of gdFunc('main.gd', fn).matchAll(/make_label_3d\("[^"]*", "((?:[^"\\]|\\.)*)", Vector3\([^)]*\), Color\("([0-9a-f]{6})"\)/g)) out.set(m[1], '#' + m[2]);
  return out;
}
const luminance = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('sprites: Label3D chips say visits/text.js text in Godot\'s tint, at the neighbor-name zoom', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  const scene = fullScene();
  zoom(w.world, 1);
  const chips = texts(layerCalls(sprites, w, scene).overlay);
  const D = T.build_street_life_decor, tints = new Map([...labelTints('build_street_life_decor'), ...labelTints('build_boeddeker_park'), ...labelTints('build_neighborhood_surprises')]);
  const want = new Map();
  for (const id of SURPRISE_IDS) want.set(web('main.gd', T.build_neighborhood_surprises[id]), tints.get(T.build_neighborhood_surprises[id]));
  EATERIES.forEach((rec, i) => {
    want.set(gdf(D.eatery, [rec.name]), '#' + rec.label_color);
    if (scene.eateries[i].counter) want.set(gdf(T.build_eatery_counters.menu, [MAIN.EATERY_MENU_ITEMS[rec.id][0]]), '#' + rec.label_color);
  });
  for (const text of [D.soWhatAwning, D.soWhatFloor, D.museum, D.portal, T.build_boeddeker_park.label]) want.set(text, tints.get(text));
  assert.equal(want.size, 10 + 6 + 1 + 5);
  assert.ok([...want.values()].every(v => /^#[0-9a-f]{6}$/.test(v)), 'every label has a Godot tint');
  assert.deepEqual(new Map(chips.map(s => [s.text, s.color])), want);
  assert.equal(chips.length, want.size);
  for (const s of chips) assert.doesNotMatch(s.text, /Shift|\bF8\b/, s.text);
  // The chip is Godot's label outline colour; every tint reads at 4.5:1 or better on it.
  const { GODOT_LABEL_OUTLINE } = await loadSprites();
  const [r, g, b, a] = /outline_modulate = Color\(([^)]*)\)/.exec(gdFunc('main.gd', 'make_label_3d'))[1].split(',').map(Number);
  assert.equal(GODOT_LABEL_OUTLINE, '#' + [r, g, b, a].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''));
  for (const color of want.values()) assert.ok(contrast(color, GODOT_LABEL_OUTLINE.slice(0, 7)) >= 4.5, color);
  // Below world.js's neighbor-name zoom no label chip is drawn; at it, all of them.
  const bea = NEIGHBORS[0];
  for (const scale of [0.2199, 0.22, 0.6]) {
    zoom(w.world, scale);
    assert.equal(texts(layerCalls(sprites, w, scene).overlay).length, objectLabel(bea, scale) ? want.size : 0, String(scale));
  }
});

test('sprites: a chip has world.chip\'s geometry and zoom scaling, with Godot\'s label colours', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  const park = fullScene().park;
  for (const scale of [0.4, 1, 1.6]) {
    zoom(w.world, scale);
    const calls = layerCalls(sprites, w, { ...emptyScene(), park }).overlay;
    const k = Math.max(1, 1 / scale);
    const [, x, y] = calls.find(c => c[0] === 'translate');
    assert.deepEqual(calls.find(c => c[0] === 'scale'), ['scale', k, k]);
    w.ctx.calls.length = 0;
    w.world.chip(T.build_boeddeker_park.label, x, y, '#fcf5df');
    const chip = w.ctx.calls.splice(0);
    const shape = list => list.map(c => (c[0] === 'set' && c[1] === 'fillStyle' ? ['set', 'fillStyle', '*'] : c));
    assert.deepEqual(shape(calls), shape(chip), String(scale));
  }
});

test('sprites: dishes sit on the 2D gathering table in Godot\'s slot order, or on a cloth beside the Open Floor table', async () => {
  const { createSprites, GODOT_COLORS } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false });
  const DISH = new Set(['#' + GODOT_COLORS['shared_meal.gd'].artwork.rim, '#' + GODOT_COLORS['shared_meal.gd'].artwork.plate]);
  const centres = calls => shapes(calls).filter(s => s.kind === 'fill' && DISH.has(s.color) && s.path[0]?.[0] === 'ellipse').map(s => ({ x: s.path[0][1], y: s.path[0][2] }));
  for (const [layout, placement] of [['table', 0], ['table', 1], ['floor', 0], ['floor', 1]]) {
    const state = { ...OPENED(), layout }, w = makeWorld({ state });
    const table = gatheringScene(state).items.find(item => item.id === 'table').cells[0];
    const tx = 166 + table.col * 53, ty = -28 + table.row * 12;
    const dishes = worldDishes(mealWith(4, placement), { opened: true, storyActive: false });
    const calls = layerCalls(sprites, w, { ...emptyScene(), dishes }).ground;
    const points = centres(calls);
    assert.ok(points.length >= 4, `${layout} ${placement}`);
    if (layout === 'table') {
      for (const p of points) assert.ok(p.x > tx && p.x < tx + 75 && p.y > ty - 2 && p.y < ty + 10, `${layout} ${placement} (${p.x}, ${p.y}) on the table top`);
      const xs = [...new Set(points.map(p => Math.round(p.x * 100) / 100))];
      assert.equal(xs.length >= 4, true);
      const firsts = [0, 1, 2, 3].map(i => tx + 37.5 + (TABLE_SLOTS[i] + (placement ? 0.11 : 0)) * 75 / 9.2);
      for (const x of firsts) assert.ok(points.some(p => Math.abs(p.x - x) < 1e-9), `slot at ${x}`);
    } else {
      const cloth = shapes(calls).find(s => s.color === '#' + GODOT_COLORS['shared_meal.gd'].build_world.cloth);
      assert.ok(cloth, 'the serving cloth');
      const [, cx, cy, cw, ch] = cloth.path.find(c => c[0] === 'rect' || c[0] === 'roundRect');
      assert.ok(cx >= tx + 20, 'beside the floor table');
      for (const p of points) assert.ok(p.x > cx && p.x < cx + cw && p.y > cy && p.y < cy + ch, `${placement} (${p.x}, ${p.y}) on the cloth`);
    }
  }
  // No dishes while a story is active or nothing is shared: worldDishes is empty and nothing is drawn.
  const w = makeWorld({ state: OPENED() });
  assert.deepEqual(layerCalls(sprites, w, { ...emptyScene(), dishes: worldDishes(mealWith(2), { opened: true, storyActive: true }) }).ground, []);
});

test('sprites: actors of an unchanged scene part are reused, and the costume follows the drawn player', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED() });
  const scene = fullScene();
  const a = sprites.actors(w.world, scene), b = sprites.actors(w.world, { ...scene });
  const beacons = list => list.filter(actor => scene.surprises.some(m => m.y === actor.y));
  assert.equal(beacons(a).length, 10);
  assert.ok(beacons(a).every((actor, i) => actor === beacons(b)[i]), 'the same beacon actors while scene.surprises is the same list');
  const c = sprites.actors(w.world, { ...scene, surprises: markers(['cutesy_dino']) });
  assert.ok(beacons(c).every(actor => !a.includes(actor)), 'a new marker list builds new actors');
  // The cape sits just behind the player and the lantern and folio just in front, wherever the World draws the player.
  w.holder.state = { ...w.holder.state, player: { x: 300, y: 20 } };
  const ys = sprites.actors(w.world, scene).map(actor => actor.y).filter(y => Math.abs(y - 20) < 0.01);
  assert.ok(ys.some(y => y < 20) && ys.some(y => y > 20), JSON.stringify(ys));
});

// ---------------------------------------------------------------- drift and hygiene
// JavaScript source without comments or string contents (for token checks).
function jsCode(source) {
  let out = '';
  for (let i = 0; i < source.length;) {
    if (source.startsWith('//', i)) { while (i < source.length && source[i] !== '\n') i++; continue; }
    if (source.startsWith('/*', i)) { const e = source.indexOf('*/', i + 2); i = e < 0 ? source.length : e + 2; continue; }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') { let j = i + 1; while (j < source.length && source[j] !== ch) j += source[j] === '\\' ? 2 : 1; out += ch + ch; i = j + 1; continue; }
    out += ch; i++;
  }
  return out;
}

test('sprites: every copied colour is in the Godot function it names', async () => {
  const { GODOT_COLORS } = await loadSprites();
  let count = 0;
  for (const [file, fns] of Object.entries(GODOT_COLORS)) {
    for (const [fn, colors] of Object.entries(fns)) {
      const body = gdFunc(file, fn);
      for (const [key, hex] of Object.entries(colors)) {
        assert.match(hex, /^[0-9a-f]{6}$/, `${file} ${fn}.${key}`);
        assert.ok(body.includes(hex), `${file} ${fn}.${key} ${hex}`);
        count++;
      }
    }
  }
  assert.ok(count > 60, String(count));
  // The surprise label tints are keyed by id in Godot's own order.
  const tints = [...labelTints('build_neighborhood_surprises').values()];
  assert.deepEqual(SURPRISE_IDS.map(id => '#' + GODOT_COLORS['main.gd'].build_neighborhood_surprises[id]), tints);
  // The warm pool tint is Godot's numeric street-lamp pool colour.
  const { GODOT_POOL } = await loadSprites();
  const [r, g, b, a] = /add_light_pool\(st, lp, Vector2\.RIGHT, 3\.3, 3\.3, Color\(([^)]*)\), ([\d.]+)\)/.exec(gdFunc('main.gd', 'build_light_pools')).slice(1).flatMap(v => v.split(',')).map(Number);
  assert.deepEqual(GODOT_POOL, { color: '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''), alpha: a, radius: 3.3 * P.PIXELS_PER_METRE });
});

test('sprites: no hand-typed Godot text, no DOM, SVG, data URI or network', () => {
  const source = readFileSync(SPRITES_SOURCE, 'utf8');
  const code = jsCode(source);
  for (const banned of ['document', 'window', 'fetch', 'Image', 'drawImage', 'encodeURIComponent', 'btoa', 'localStorage', 'innerHTML']) assert.doesNotMatch(code, new RegExp(`\\b${banned}\\b`), banned);
  const strings = jsStrings(source);
  assert.ok(!strings.some(s => /<svg|data:/i.test(s)), 'no SVG or data URI');
  const godot = new Set(['main.gd', 'power_story.gd', 'power_place.gd', 'dog_story.gd', 'lantern_procession.gd', 'voting_story.gd', 'shared_meal.gd', 'shared_meal_data.gd', 'story_picker.gd', 'before_streets.gd'].flatMap(file => gdStrings(gdSource(file))));
  const shared = strings.filter(s => godot.has(s) && /\s|[A-Z]/.test(s));
  assert.deepEqual(shared, [], 'Godot text comes from visits/text.js, never a literal here');
  assert.equal(source.includes('\r'), false, 'LF only');
});
