// browser-next/sprites.js and the world.js layers hook, on a recording stand-in for
// CanvasRenderingContext2D (no browser). The browser proof of the drawing is a later package.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gdFunc, gdSource, gdStrings, jsStrings } from './gd-literal.mjs';
import { visitsHost } from './next-fixtures.mjs';
import { createKit, freshSession } from '../browser-next/visits-kit.js';
import { createWorldVisits } from '../browser-next/visits-world.js';
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
// A canvas that shows the whole side-story map (Larkin to Mason, Boeddeker Park to 145 Leavenworth) at every zoom these tests
// set with zoom(): sprites.js draws only what is on screen.
const WHOLE = { width: 10400, height: 3000 };
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

test('world.js: a layer object marked tapOnly is a tap target only: hit() finds it, nearest() (E/Enter and the Nearby hint) never does', () => {
  // A beacon's own object at its foot and two tap-only copies of it up its pole, as game.js's beacon objects add them.
  const foot = { id: 'surprise:x', kind: 'visit', name: 'A visit object', x: 760, y: 100 };
  const half = { ...foot, y: 81, tapOnly: true }, globe = { ...foot, y: 62, tapOnly: true };
  const w = makeWorld({ layers: { objects: () => [foot, half, globe] } }), bare = makeWorld({ layers: { objects: () => [foot] } });
  assert.deepEqual(w.world.objects().slice(-3), [foot, half, globe], 'objects() keeps the tap-only copies');
  assert.equal(w.world.hit({ x: 761, y: 61 }), globe, 'a tap on the globe finds its copy');
  assert.equal(w.world.hit({ x: 761, y: 82 }), half, 'half way up');
  assert.equal(w.world.hit({ x: 761, y: 101 }), foot, 'the foot');
  assert.equal(w.world.hit({ x: 760, y: 100 + Math.max(28, 22 / w.world.scale) + 6 }), undefined, 'empty ground below it walks');
  // The player all around the pole: the same nearest object as with the foot alone, never a tap-only copy.
  for (let y = 0; y <= 160; y += 2) for (const x of [720, 745, 760, 775, 800]) {
    for (const holder of [w.holder, bare.holder]) holder.state = { ...holder.state, player: { x, y } };
    const near = w.world.nearest();
    assert.deepEqual(near, bare.world.nearest(), `the player at (${x}, ${y})`);
    assert.ok(!near?.tapOnly, `the player at (${x}, ${y}): never a tap-only copy`);
  }
  // Within 40 px of the globe and beyond 40 px of the foot: nothing is nearby. Nearer the globe than the foot: the foot, from the foot.
  w.holder.state = { ...w.holder.state, player: { x: 760, y: 50 } };
  assert.equal(w.world.nearest(), undefined);
  w.holder.state = { ...w.holder.state, player: { x: 760, y: 70 } };
  assert.deepEqual(w.world.nearest(), { ...foot, distance: 30 });
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
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED(), ...WHOLE });
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
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED(), ...WHOLE });
  zoom(w.world, 1);
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
  at(moving, 0); at(still, 0); // a sprite set's first frame also measures the chip texts, once (the declutter needs their widths)
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
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED(), ...WHOLE });
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
  // Below world.js's neighbor-name zoom no label chip is drawn; at it and above, every beacon's label, and the rest unless the
  // declutter dropped a landmark or menu chip that had no free row (far out, the chips are large next to the map).
  const bea = NEIGHBORS[0];
  for (const scale of [0.2199, 0.22, 0.6]) {
    zoom(w.world, scale);
    const drawn = texts(layerCalls(sprites, w, scene).overlay);
    if (!objectLabel(bea, scale)) { assert.equal(drawn.length, 0, String(scale)); continue; }
    assert.ok(drawn.length <= want.size && SURPRISE_IDS.every(id => drawn.some(s => s.text === web('main.gd', T.build_neighborhood_surprises[id]))), String(scale));
  }
});

test('sprites: a chip has world.chip\'s geometry and zoom scaling, with Godot\'s label colours', async () => {
  const { createSprites } = await loadSprites();
  const sprites = createSprites({ reducedMotion: () => false }), w = makeWorld({ state: OPENED(), ...WHOLE });
  const park = fullScene().park;
  for (const scale of [0.4, 1, 1.6]) {
    zoom(w.world, scale);
    layerCalls(sprites, w, { ...emptyScene(), park }); // a sprite set's first frame also measures the chip text, once
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

// ---------------------------------------------------------------- the beacon's drawn height and the chip declutter
// The world part of the VisitsScene as visits-world.js builds it (scenePart), over the stand-in host: the ten beacons with the
// given finds, the museum, the park, So What and the eateries. Visit Eateries guides Bowl & Basil at 361 Turk and opens its counter.
function realScene({ found = [], eateries = false, player = { x: 95, y: -47 } } = {}) {
  const { host, io } = visitsHost();
  io.state = { opened: true, surprises: [...found] };
  const part = createWorldVisits(createKit(host, freshSession()));
  if (eateries) assert.equal(part.openNotes('eateries'), true);
  return { ...part.scenePart(), player };
}
// The map box, text and body fill of every chip a call list draws (world.js chip() and sprites.js chip(): save, translate, scale,
// the shadow, the body rect at -19, the text), in the coordinates of the list's own transform.
function drawnChips(calls) {
  const out = [], stack = [];
  let m = [1, 0, 0, 1, 0, 0], body = null, fill = null;
  for (const call of calls) {
    const [name] = call;
    if (name === 'save') stack.push(m);
    else if (name === 'restore') m = stack.pop() ?? m;
    else if (name === 'setTransform') m = call.slice(1);
    else if (name === 'translate') m = multiply(m, [1, 0, 0, 1, call[1], call[2]]);
    else if (name === 'scale') m = multiply(m, [call[1], 0, 0, call[2], 0, 0]);
    else if (name === 'rotate') { const c = Math.cos(call[1]), s = Math.sin(call[1]); m = multiply(m, [c, s, -s, c, 0, 0]); }
    else if (name === 'set' && call[1] === 'fillStyle') fill = call[2];
    else if ((name === 'roundRect' || name === 'rect') && call[2] === -19) body = { left: m[4] + call[1] * m[0], top: m[5] + call[2] * m[3], right: m[4] + (call[1] + call[3]) * m[0], bottom: m[5] + (call[2] + call[4]) * m[3], fill };
    else if (name === 'fillText' && body) { out.push({ text: call[1], ...body }); body = null; }
  }
  return out;
}
// The box of everything a call list draws (rects, arcs, ellipses, path points), in its own transform's coordinates.
function drawnBounds(calls) {
  const stack = [], b = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  let m = [1, 0, 0, 1, 0, 0];
  const add = (x, y) => { const X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5]; b.left = Math.min(b.left, X); b.right = Math.max(b.right, X); b.top = Math.min(b.top, Y); b.bottom = Math.max(b.bottom, Y); };
  for (const call of calls) {
    const [name] = call;
    if (name === 'save') stack.push(m);
    else if (name === 'restore') m = stack.pop() ?? m;
    else if (name === 'translate') m = multiply(m, [1, 0, 0, 1, call[1], call[2]]);
    else if (name === 'scale') m = multiply(m, [call[1], 0, 0, call[2], 0, 0]);
    else if (name === 'rect' || name === 'roundRect') { add(call[1], call[2]); add(call[1] + call[3], call[2] + call[4]); }
    else if (name === 'arc') { add(call[1] - call[3], call[2] - call[3]); add(call[1] + call[3], call[2] + call[3]); }
    else if (name === 'ellipse') { add(call[1] - call[3], call[2] - call[4]); add(call[1] + call[3], call[2] + call[4]); }
    else if (name === 'moveTo' || name === 'lineTo') add(call[1], call[2]);
  }
  return b;
}
// What no visits chip may cover in a scene: each beacon's globe as drawn, and every person as world.js person() draws one at its
// largest (the player's ring, a hat, headphones and a rollator): the player, the neighbors, the docent and an open counter's host.
function mustShow(w, scene, sprites) {
  const out = [];
  // Each globe where a canvas showing the whole map draws it (sprites.js draws a beacon only on screen).
  const whole = makeWorld({ state: OPENED(), ...WHOLE });
  zoom(whole.world, 1);
  const actors = sprites.actors(whole.world, { surprises: scene.surprises });
  for (const [i, m] of list(scene.surprises).entries()) {
    whole.ctx.calls.length = 0; actors[i].draw(whole.ctx, whole.world);
    const globe = shapes(whole.ctx.calls.splice(0)).find(s => s.kind === 'fill' && s.path[0]?.[0] === 'arc' && s.color === (m.found ? m.accent : darken(m.accent, 0.28)));
    const [, x, y, r] = globe.path[0];
    out.push({ what: `the globe of ${m.id}`, id: m.id, left: x - r, right: x + r, top: y - r, bottom: y + r });
  }
  w.ctx.calls.length = 0; w.world.person({ x: 0, y: 0, rollator: true, hat: true, headphones: true }, true);
  const body = drawnBounds(w.ctx.calls.splice(0)), person = (what, p) => out.push({ what, left: p.x + body.left, right: p.x + body.right, top: p.y + body.top, bottom: p.y + body.bottom });
  person('the player', w.holder.state.player);
  for (const n of NEIGHBORS) person(n.name, n);
  if (scene.museum?.docent) person('the docent', scene.museum.docent);
  for (const e of list(scene.eateries)) if (e?.counter) person(`the host of ${e.name}`, { x: e.counter.x, y: e.counter.y - 3 });
  return out;
}
const list = v => (Array.isArray(v) ? v : []);
const overlayChips = (sprites, w, scene) => { w.ctx.calls.length = 0; sprites.overlay(w.ctx, w.world, scene); return drawnChips(w.ctx.calls.splice(0)); };
const viewOf = world => ({ left: -world.offset.x / world.scale, right: (world.width - world.offset.x) / world.scale, top: -world.offset.y / world.scale, bottom: (world.height - world.offset.y) / world.scale });
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const surpriseLabel = id => web('main.gd', T.build_neighborhood_surprises[id]);
const eateryLabel = i => gdf(T.build_street_life_decor.eatery, [EATERIES[i].name]);
const menuLabel = i => gdf(T.build_eatery_counters.menu, [MAIN.EATERY_MENU_ITEMS[EATERIES[i].id][0]]);
// The camera looking at a point at a scale (Camera.lookAt: centred 25 px above it).
const lookAt = (w, p, scale) => { w.world.camera.lookAt(p, scale); return viewOf(w.world); };

test("sprites: BEACON_LIFT is the drawn globe's height above its beacon's foot, found or not, at every zoom; the foot, half way and the globe cover the drawing", async () => {
  const { createSprites, BEACON_LIFT } = await loadSprites();
  assert.equal(typeof BEACON_LIFT, 'number');
  const sprites = createSprites({ reducedMotion: () => true }), w = makeWorld({ state: OPENED(), ...WHOLE });
  const list = markers(['jeffrey_record']);
  for (const scale of [0.3, 0.85, 1.6]) {
    zoom(w.world, scale);
    const calls = layerCalls(sprites, w, { ...emptyScene(), surprises: list }).actorCalls, drawn = shapes(calls);
    for (const m of list) {
      const globe = drawn.find(s => s.kind === 'fill' && s.path[0]?.[0] === 'arc' && s.path[0][1] === m.x && s.color === (m.found ? m.accent : darken(m.accent, 0.28)));
      assert.ok(globe, `${m.id} has its globe`);
      assert.ok(Math.abs(globe.path[0][2] - (m.y - BEACON_LIFT)) < 1e-9, `${m.id}: the globe is BEACON_LIFT above the foot at ${scale}`);
      const pole = drawn.find(s => s.kind === 'stroke' && s.path.some(p => p[0] === 'moveTo' && p[1] === m.x && p[2] === m.y));
      assert.deepEqual(pole.path.map(p => p.slice(1)), [[m.x, m.y], [m.x, m.y - BEACON_LIFT]], `${m.id}: the pole runs from the foot to the globe`);
      // game.js's three hit points (the foot, half way, the globe): every drawn part of this beacon (the fills and strokes at its
      // x: arcs by centre and radius, ellipses by centre and the larger radius, the pole by its ends) is within 28 px of one.
      const samples = [0, BEACON_LIFT / 2, BEACON_LIFT].map(lift => ({ x: m.x, y: m.y - lift }));
      const far = (x, y, r = 0) => Math.min(...samples.map(s => Math.hypot(x - s.x, y - s.y))) + r;
      const parts = drawn.filter(s => s.path[0] && Math.abs(s.path[0][1] - m.x) < 2);
      assert.ok(parts.length >= 3 && parts.includes(globe) && parts.includes(pole), `${m.id}: shadow, pole and globe`);
      const reach = Math.max(...parts.flatMap(s => s.path.map(p => p[0] === 'arc' ? far(p[1], p[2], p[3]) : p[0] === 'ellipse' ? far(p[1], p[2], Math.max(p[3], p[4])) : far(p[1], p[2]))));
      assert.ok(reach < 28, `${m.id} (${m.found ? 'found' : 'unfound'}): the farthest drawn point is ${reach.toFixed(2)} px from a hit point at ${scale}`);
    }
  }
});

test('sprites: the chip declutter keeps the museum corner and the 361 Turk cluster readable: no two drawn chips overlap, none clips at the map edge', async () => {
  const { createSprites } = await loadSprites();
  const D = T.build_street_life_decor;
  const fixtures = [
    ['the museum corner', realScene(), P.MUSEUM, [surpriseLabel('mayor_pomp_event'), surpriseLabel('magic_carpet_chef'), D.museum, D.portal, eateryLabel(2)]],
    ['361 Turk', realScene({ found: ['jeffrey_record'], eateries: true }), P.EATERY_AWNINGS[0], [surpriseLabel('jeffrey_record'), eateryLabel(0), menuLabel(0), D.soWhatAwning]],
  ];
  // The smoke test's map canvases: 1440 px wide (1036 x 608) and 390 px wide (358 x 518); and the harness's 1.6 zoom. A whole
  // World frame with the sprites as game.js layers them, so world.js's own name chips and people are in it too.
  const { GODOT_LABEL_OUTLINE: LABEL } = await loadSprites(); // a visits chip's body (world.js chips are light)
  for (const [name, scene, at, cluster] of fixtures) {
    for (const [width, height] of [[1036, 608], [358, 518]]) {
      for (const scale of [0.85, 0.5, 1.25, 1.6]) {
        const sprites = createSprites({ reducedMotion: () => true });
        const w = makeWorld({ state: OPENED(), width, height, layers: { ground: (c, world) => sprites.ground(c, world, scene), actors: world => sprites.actors(world, scene), overlay: (c, world) => sprites.overlay(c, world, scene) } });
        const view = lookAt(w, at, scale), k = Math.max(1, 1 / scale), where = `${name}, ${width} px, scale ${scale}`;
        // The frame draws in canvas px (device ratio 1 here): back to map px.
        const o = w.world.offset, map = c => ({ ...c, left: (c.left - o.x) / scale, right: (c.right - o.x) / scale, top: (c.top - o.y) / scale, bottom: (c.bottom - o.y) / scale });
        const all = drawnChips(frame(w, 0, true)).map(map), chips = all.filter(c => c.fill === LABEL);
        const near = chips.filter(c => c.right > view.left && c.left < view.right && c.bottom > view.top && c.top < view.bottom);
        assert.ok(near.length >= 2, `${where}: chips on screen`);
        // No two chips overlap, the World's own name chips included.
        for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(!overlaps(all[i], all[j]), `${where}: ${all[i].text} and ${all[j].text} do not overlap`);
        // No visits chip covers a beacon's globe or a person; a beacon's own label sits above its globe, clear of it by the gap.
        for (const thing of mustShow(w, scene, sprites)) for (const c of chips) assert.ok(!overlaps(c, thing), `${where}: ${c.text} covers ${thing.what}`);
        for (const globe of mustShow(w, scene, sprites).filter(t => t.id)) {
          const own = chips.find(c => c.text === surpriseLabel(globe.id));
          if (own) assert.ok(own.bottom <= globe.top - 3 * k + 1e-6, `${where}: ${globe.id}'s label is above its globe`);
        }
        const margin = 6 / scale - 1e-9;
        for (const c of near) if (c.right - c.left <= view.right - view.left - 2 * margin) assert.ok(c.left >= view.left + margin && c.right <= view.right - margin, `${where}: ${c.text} is inside the map`);
        // Every beacon label in view is laid out (a beacon label is never dropped) and drawn when on screen (one pushed up past the
        // map's top edge is not); each chip text at most once.
        const laidOut = sprites.chips(w.world, scene);
        for (const m of scene.surprises) {
          if (!(m.x > view.left && m.x < view.right && m.y > view.top && m.y < view.bottom)) continue;
          const own = laidOut.find(c => c.id === `surprise:${m.id}`);
          assert.ok(own, `${where}: ${m.id}'s label is laid out`);
          if (own.right + own.k > view.left && own.left < view.right && own.bottom + 2 * own.k > view.top && own.top < view.bottom) assert.ok(chips.some(c => c.text === surpriseLabel(m.id)), `${where}: ${m.id}'s label`);
        }
        assert.equal(new Set(chips.map(c => c.text)).size, chips.length);
        // Every beacon label of the cluster is drawn at every width and zoom (a landmark or a menu with no room is dropped).
        for (const text of cluster.filter(t => t.startsWith('[*]'))) assert.ok(chips.some(c => c.text === text), `${where}: ${text}`);
      }
    }
  }
  // Before the declutter the museum corner's five chips overlapped: their natural boxes, measured as the chips are.
  const w = makeWorld({ state: OPENED(), width: 1036, height: 608 }), sprites = createSprites({ reducedMotion: () => true }), scene = fixtures[0][1];
  lookAt(w, P.MUSEUM, 0.85);
  const placed = sprites.chips(w.world, scene).filter(c => ['surprise:mayor_pomp_event', 'surprise:magic_carpet_chef', 'museum', 'portal', 'eatery:2'].includes(c.id));
  assert.deepEqual(placed.filter(c => c.id.startsWith('surprise:')).map(c => c.id).sort(), ['surprise:magic_carpet_chef', 'surprise:mayor_pomp_event'], 'both beacon labels');
  assert.ok(placed.some(c => c.shift !== 0), 'some of them moved off their natural place');
  // What the overlay draws is chips() on screen: the layout game.js's beacon label hit points come from (chip text width + 20,
  // 23 tall). A chip off the map is not drawn; one within a few pixels of its edge (anti-aliasing) may be.
  const box = c => [c.text, ...[c.left, c.top, c.right, c.bottom].map(v => Math.round(v * 1e6))].join(' ');
  const view = viewOf(w.world), drawn = overlayChips(sprites, w, scene).map(box), laidOut = sprites.chips(w.world, scene);
  const within = d => c => c.right + c.k > view.left - d && c.left < view.right + d && c.bottom + 2 * c.k > view.top - d && c.top < view.bottom + d;
  assert.ok(laidOut.filter(within(0)).length >= 5, 'the museum corner is on screen');
  for (const c of laidOut.filter(within(0))) assert.ok(drawn.includes(box(c)), `${c.id} is on screen and drawn`);
  for (const d of drawn) assert.ok(laidOut.filter(within(24 / 0.85)).map(box).includes(d), `${d} is a chip of the layout at the map`);
});

test('sprites: a chip that reaches into the map is clamped inside it with a small margin; one wholly outside it is neither moved into it, drawn nor laid out', async () => {
  const { createSprites } = await loadSprites();
  const park = { ...emptyScene(), park: fullScene().park }, at = P.PARK_ENTRANCE, label = T.build_boeddeker_park.label;
  const sprites = createSprites({ reducedMotion: () => true });
  for (const scale of [0.5, 0.85, 1.6]) {
    const w = makeWorld({ state: OPENED(), width: 600, height: 500 }), half = 600 / 2 / scale, margin = 6 / scale;
    // The entrance 20 map px inside the left edge, then inside the right edge: its chip (centred on it) would clip.
    for (const side of [-1, 1]) {
      const view = lookAt(w, { x: at.x - side * (half - 20), y: at.y + 25 }, scale);
      const [chip] = overlayChips(sprites, w, park).filter(c => c.text === label);
      assert.ok(chip, `drawn at ${scale}`);
      if (side < 0) assert.ok(Math.abs(chip.left - (view.left + margin)) < 1e-6, `clamped to the left margin at ${scale}`);
      else assert.ok(Math.abs(chip.right - (view.right - margin)) < 1e-6, `clamped to the right margin at ${scale}`);
    }
    // Wholly outside the map (400 screen px past its left edge): never pulled into view; not drawn, and not laid out at all.
    lookAt(w, { x: at.x + half + 400 / scale, y: at.y + 25 }, scale);
    assert.deepEqual(overlayChips(sprites, w, park).filter(c => c.text === label), [], `not drawn at ${scale}`);
    assert.deepEqual(sprites.chips(w.world, park).map(c => c.id), [], `not laid out at ${scale}`);
  }
  // A chip wider than the map is centred on it.
  const narrow = makeWorld({ state: OPENED(), width: 120, height: 500 }), view = lookAt(narrow, at, 1.6);
  const [wide] = overlayChips(sprites, narrow, park).filter(c => c.text === label);
  assert.ok(Math.abs((wide.left + wide.right) / 2 - (view.left + view.right) / 2) < 1e-6);
});

test('sprites: the declutter is deterministic and stable: the same scene and view give the same layout, a one-pixel player move keeps every chip in its slot', async () => {
  const { createSprites } = await loadSprites();
  const scene = realScene(), w = makeWorld({ state: OPENED(), width: 1036, height: 608 });
  lookAt(w, P.MUSEUM, 0.85);
  const a = createSprites({ reducedMotion: () => true }), b = createSprites({ reducedMotion: () => false });
  assert.deepEqual(overlayChips(a, w, scene), overlayChips(b, w, scene), 'two sprite sets, with and without reduced motion');
  assert.deepEqual(a.chips(w.world, scene), b.chips(w.world, scene));
  w.world.time = 9.5;
  assert.deepEqual(overlayChips(b, w, scene), overlayChips(a, w, scene), 'world.time moves no chip');
  // Memoized: the same inputs give the same array, and a frame measures nothing beyond what chip() itself measures.
  const first = a.chips(w.world, scene);
  assert.equal(a.chips(w.world, scene), first);
  w.ctx.calls.length = 0;
  a.overlay(w.ctx, w.world, scene);
  const calls = w.ctx.calls.splice(0);
  assert.equal(calls.filter(c => c[0] === 'measureText').length, drawnChips(calls).length, 'one measure per drawn chip, as world.chip');
  // The player walks one pixel at a time past the museum, the camera following: every chip keeps its slot and its row.
  const state = { ...OPENED(), player: { x: P.MUSEUM.x + 120, y: P.MUSEUM.y + 60 } }, v = makeWorld({ state, width: 1036, height: 608 });
  v.world.camera.follow(state.player);
  const sprites = createSprites({ reducedMotion: () => true });
  const slots = () => sprites.chips(v.world, { ...scene, player: v.holder.state.player }).map(c => [c.id, Math.round(c.shift * 1000), Math.round(c.y * 1000)].join(' '));
  const before = slots();
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const p = v.holder.state.player;
    v.holder.state = { ...v.holder.state, player: { x: p.x + dx, y: p.y + dy } };
    v.world.camera.track(v.holder.state.player);
    assert.deepEqual(slots(), before, `a one-pixel move (${dx}, ${dy})`);
  }
});

// ---------------------------------------------------------------- only what is on screen
// A layer's calls split into its parts: each balanced save ... restore at the top level (every sprites.js part is one).
function topParts(calls) {
  const out = [];
  let depth = 0, start = 0;
  calls.forEach((call, i) => {
    if (call[0] === 'save') { if (depth++ === 0) start = i; }
    else if (call[0] === 'restore' && --depth === 0) out.push(calls.slice(start, i + 1));
  });
  assert.equal(depth, 0, 'save and restore balance');
  assert.equal(out.flat().length, calls.length, 'every call is inside a part');
  return out;
}
// The map box of everything a call list paints, through its transforms: rectangle corners, arcs and ellipses by their radii (as
// discs of the larger one under a rotation), path points, and half the line width around what a stroke paints (no cap or join
// reaches further).
function extent(calls) {
  const b = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }, stack = [];
  let m = [1, 0, 0, 1, 0, 0], width = 1, path = [];
  const scaleOf = () => Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
  const add = (x, y, rx = 0, ry = rx) => {
    const turned = m[1] !== 0 || m[2] !== 0, r = Math.max(rx, ry) * scaleOf();
    path.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5], turned ? r : rx * Math.abs(m[0]), turned ? r : ry * Math.abs(m[3])]);
  };
  const corners = (x, y, w, h) => { add(x, y); add(x + w, y); add(x, y + h); add(x + w, y + h); };
  const paint = pad => { for (const [x, y, rx, ry] of path) { b.left = Math.min(b.left, x - rx - pad); b.right = Math.max(b.right, x + rx + pad); b.top = Math.min(b.top, y - ry - pad); b.bottom = Math.max(b.bottom, y + ry + pad); } };
  for (const call of calls) {
    const [name] = call;
    if (name === 'save') stack.push([m, width]);
    else if (name === 'restore') [m, width] = stack.pop() ?? [m, width];
    else if (name === 'translate') m = multiply(m, [1, 0, 0, 1, call[1], call[2]]);
    else if (name === 'scale') m = multiply(m, [call[1], 0, 0, call[2], 0, 0]);
    else if (name === 'rotate') { const c = Math.cos(call[1]), s = Math.sin(call[1]); m = multiply(m, [c, s, -s, c, 0, 0]); }
    else if (name === 'set' && call[1] === 'lineWidth') width = call[2];
    else if (name === 'beginPath') path = [];
    else if (name === 'rect' || name === 'roundRect') corners(call[1], call[2], call[3], call[4]);
    else if (name === 'arc') add(call[1], call[2], call[3]);
    else if (name === 'ellipse') { assert.equal(call[5], 0, 'an ellipse turned by its own rotation'); add(call[1], call[2], call[3], call[4]); }
    else if (name === 'moveTo' || name === 'lineTo') add(call[1], call[2]);
    else if (name === 'fill') paint(0);
    else if (name === 'stroke') paint(width / 2 * scaleOf());
    else if (name === 'strokeRect') { const kept = path; path = []; corners(call[1], call[2], call[3], call[4]); paint(width / 2 * scaleOf()); path = kept; }
    else assert.ok(!['fillRect', 'fillText', 'strokeText', 'drawImage', 'setTransform'].includes(name), `${name} in a map part`);
  }
  return b;
}
// The camera at a map point (the view's top-left corner) and a zoom, unclamped.
const setView = (w, left, top, scale) => { w.world.camera.scale = scale; w.world.camera.offset = { x: -left * scale, y: -top * scale }; return viewOf(w.world); };
const reaches = (b, v, d = 0) => b.right > v.left - d && b.left < v.right + d && b.bottom > v.top - d && b.top < v.bottom + d;
const chipBox = c => ({ left: c.left, right: c.right + c.k, top: c.top, bottom: c.bottom + 2 * c.k }); // the body and its shadow

test('sprites: only what is on screen draws, each part whole and exactly as before; a part off screen records nothing', async () => {
  const { createSprites } = await loadSprites();
  const scene = { ...fullScene(), ...realScene({ found: [...SURPRISE_IDS], eateries: true }), power: powerPart(LARKIN) };
  const sprites = createSprites({ reducedMotion: () => false });
  const far = scale => 24 + 12 / scale; // map px: a part this far off the view never draws (past every anti-aliasing margin)
  const key = c => `${c.text} ${Math.round(c.left * 1e6)} ${Math.round(c.top * 1e6)}`;
  for (const time of [0, 2.6]) {
    // The reference: each part as a canvas showing the whole map records it, which is what every frame drew of it before.
    const whole = makeWorld({ state: OPENED(), ...WHOLE });
    zoom(whole.world, 1); whole.world.time = time;
    const ref = layerCalls(sprites, whole, scene), grounds = topParts(ref.ground);
    const actorCalls = ref.actors.map(a => { whole.ctx.calls.length = 0; a.draw(whole.ctx, whole.world); return whole.ctx.calls.splice(0); });
    const groundBoxes = grounds.map(extent), actorBoxes = actorCalls.map(extent);
    assert.ok(grounds.length >= 10 && actorCalls.length >= 30, `${grounds.length} ground parts and ${actorCalls.length} actors`);
    assert.ok(actorCalls.every(calls => calls.length), 'the whole map draws every actor');
    const tally = { ground: 0, actors: 0, chips: 0, frames: 0 };
    // One frame: each ground part and each actor draws whole and as before, or records nothing. One that reaches into the view
    // draws; none farther than far() off it does. The chips drawn are the layout's on screen, lowest priority first.
    const check = (w, where) => {
      const v = viewOf(w.world), d = far(w.world.scale), r = layerCalls(sprites, w, scene), got = topParts(r.ground);
      let j = 0;
      grounds.forEach((g, i) => {
        if (j < got.length && JSON.stringify(got[j]) === JSON.stringify(g)) { assert.ok(reaches(groundBoxes[i], v, d), `${where}: ground part ${i} drawn off screen`); j++; }
        else assert.ok(!reaches(groundBoxes[i], v), `${where}: ground part ${i} reaches into the view and is not drawn whole`);
      });
      assert.equal(j, got.length, `${where}: the ground is whole parts, in order`);
      assert.equal(r.actors.length, actorCalls.length, `${where}: the same actors`);
      r.actors.forEach((a, i) => {
        w.ctx.calls.length = 0; a.draw(w.ctx, w.world);
        const calls = w.ctx.calls.splice(0);
        if (calls.length) { assert.equal(JSON.stringify(calls), JSON.stringify(actorCalls[i]), `${where}: actor ${i} as before`); assert.ok(reaches(actorBoxes[i], v, d), `${where}: actor ${i} drawn off screen`); tally.actors++; }
        else assert.ok(!reaches(actorBoxes[i], v), `${where}: actor ${i} reaches into the view and is not drawn`);
      });
      const placed = sprites.chips(w.world, scene), drawn = drawnChips(r.overlay).map(key);
      for (const c of placed.filter(c => reaches(chipBox(c), v))) assert.ok(drawn.includes(key(c)), `${where}: ${c.id} on screen is drawn`);
      const allowed = placed.filter(c => reaches(chipBox(c), v, d)).map(key);
      for (const c of drawn) assert.ok(allowed.includes(c), `${where}: ${c} is drawn off screen`);
      assert.deepEqual(drawn, placed.map(key).filter(c => drawn.includes(c)).reverse(), `${where}: lowest priority first`);
      tally.ground += got.length; tally.chips += drawn.length; tally.frames++;
    };
    // Cameras over the side-story map on a phone and a desk, from below the chip zoom to the closest.
    for (const [width, height] of [[358, 518], [1036, 608]]) {
      const w = makeWorld({ state: OPENED(), width, height });
      w.world.time = time;
      for (const scale of [0.2, 0.5, 0.85, 1.6]) {
        for (const c of [P.START, P.MUSEUM, P.PARK_ENTRANCE, P.LARKIN_JUNCTION, P.SO_WHAT_AWNING, P.SO_WHAT_LEAVENWORTH, P.EATERY_AWNINGS[1], { x: -1000, y: -300 }, { x: -2200, y: -420 }, { x: 420, y: 120 }]) {
          setView(w, c.x - width / 2 / scale, c.y - height / 2 / scale, scale);
          check(w, `${width} px at ${scale} on (${Math.round(c.x)}, ${Math.round(c.y)}) at ${time}`);
        }
      }
    }
    // Each part at each edge of a phone's view: reaching half a map pixel into it (drawn whole), or just past far() (nothing).
    const w = makeWorld({ state: OPENED(), width: 358, height: 518 }), scale = 0.85, W = 358 / scale, H = 518 / scale;
    w.world.time = time;
    [...groundBoxes, ...actorBoxes].forEach((b, n) => {
      const cx = (b.left + b.right - W) / 2, cy = (b.top + b.bottom - H) / 2;
      for (const d of [-0.5, far(scale) + 0.5]) {
        for (const [left, top, side] of [[b.right + d, cy, 'left'], [b.left - W - d, cy, 'right'], [cx, b.bottom + d, 'top'], [cx, b.top - H - d, 'bottom']]) {
          setView(w, left, top, scale);
          check(w, `part ${n} ${d < 0 ? 'half a pixel inside' : 'just past far() off'} the ${side} edge at ${time}`);
        }
      }
    });
    // Off-screen parts were skipped, on-screen ones drawn.
    assert.ok(tally.ground > 0 && tally.ground < tally.frames * grounds.length / 2, JSON.stringify(tally));
    assert.ok(tally.actors > 0 && tally.actors < tally.frames * actorCalls.length / 2, JSON.stringify(tally));
    assert.ok(tally.chips > 0, JSON.stringify(tally));
  }
});

test('sprites: the chip layout is kept while the view moves less than a whole pixel and the player stays in its 8 px cell; laid out afresh, exactly, when either moves on', async () => {
  const { createSprites } = await loadSprites();
  const scene = realScene({ found: ['jeffrey_record', 'mayor_pomp_event'], eateries: true });
  // The player 2.5 px into an 8 px cell below the museum, the camera a tenth of a pixel past a whole one.
  const player = { x: Math.floor(P.MUSEUM.x / 8) * 8 + 2.5, y: Math.floor(P.MUSEUM.y / 8) * 8 + 64 + 2.5 };
  const w = makeWorld({ state: { ...OPENED(), player }, width: 1036, height: 608 });
  const sprites = createSprites({ reducedMotion: () => true }), fresh = (s = scene) => createSprites({ reducedMotion: () => true }).chips(w.world, s);
  const at = (ox, oy, scale = 0.85) => { w.world.camera.scale = scale; w.world.camera.offset = { x: ox, y: oy }; };
  const walk = (dx, dy) => { const p = w.holder.state.player; w.holder.state = { ...w.holder.state, player: { x: p.x + dx, y: p.y + dy } }; };
  const ox = Math.round(518 - P.MUSEUM.x * 0.85) + 0.1, oy = Math.round(281.5 - P.MUSEUM.y * 0.85) + 0.1;
  at(ox, oy);
  const first = sprites.chips(w.world, scene);
  assert.ok(first.length >= 5, String(first.length));
  assert.deepEqual(first, fresh());
  // Less than a whole pixel of pan, and steps within the player's cell: the very same layout, not laid out again.
  for (const [dx, dy] of [[0.3, 0], [0, 0.35], [-0.55, -0.55]]) { at(ox + dx, oy + dy); assert.equal(sprites.chips(w.world, scene), first, `a pan of (${dx}, ${dy})`); }
  at(ox, oy);
  for (const [dx, dy] of [[3, 0], [0, 4], [-5.5, -6]]) { walk(dx, dy); assert.equal(sprites.chips(w.world, scene), first, `a step of (${dx}, ${dy}) within the cell`); }
  // A whole pixel of pan: laid out again, exactly as a fresh sprite set lays out this frame; then kept while it stays.
  at(ox + 1, oy);
  const panned = sprites.chips(w.world, scene);
  assert.notEqual(panned, first);
  assert.deepEqual(panned, fresh());
  assert.equal(sprites.chips(w.world, scene), panned);
  // The player into the next cell, another zoom, another canvas size and a tour stop: each laid out afresh, exactly.
  let last = panned;
  const changed = (what, s = scene) => { const now = sprites.chips(w.world, s); assert.notEqual(now, last, what); assert.deepEqual(now, fresh(s), what); assert.equal(sprites.chips(w.world, s), now, what); last = now; };
  walk(8, 0); changed('the next cell');
  at(ox + 1, oy, 0.9); changed('a zoom');
  w.world.width = 1000; changed('a narrower canvas');
  changed('a tour stop', { ...scene, tourMarker: { x: P.MUSEUM.x, y: P.MUSEUM.y } });
  // And what the overlay draws and the beacon labels' hit points follow the layout of the frame.
  const object = { id: 'surprise:mayor_pomp_event', kind: 'visit', name: 'Mayor', x: P.SURPRISE_SITES.mayor_pomp_event.x, y: P.SURPRISE_SITES.mayor_pomp_event.y };
  const targets = sprites.chipTargets(w.world, scene, object);
  assert.ok(targets.length >= 2);
  assert.deepEqual(targets, createSprites({ reducedMotion: () => true }).chipTargets(w.world, scene, object));
});

test('sprites: the declutter lays out only the chips that can reach the view: never one from across the map', async () => {
  const { createSprites } = await loadSprites();
  const scene = realScene({ found: [...SURPRISE_IDS], eateries: true });
  const everything = makeWorld({ state: OPENED(), ...WHOLE });
  zoom(everything.world, 0.85);
  const all = createSprites().chips(everything.world, scene);
  assert.ok(all.length >= 20, `a whole-map view lays out ${all.length} chips`);
  // The phone at the start (the stability review's case) and at the museum corner: of the scene's chips only a few are laid out,
  // every one on screen among them, and none whose span lies hundreds of pixels off the view.
  for (const at of [P.START, P.MUSEUM, P.SO_WHAT_AWNING]) {
    const w = makeWorld({ state: OPENED(), width: 358, height: 518 }), v = lookAt(w, at, 0.85);
    const placed = createSprites().chips(w.world, scene), shown = overlayChips(createSprites(), w, scene);
    assert.ok(placed.length > 0 && placed.length <= all.length / 2, `${placed.length} of ${all.length} chips laid out at (${at.x}, ${at.y})`);
    assert.ok(placed.every(c => c.right > v.left - 600 && c.left < v.right + 600), `none from across the map at (${at.x}, ${at.y})`);
    assert.ok(shown.length >= 1 && shown.every(d => placed.some(c => c.text === d.text)), `what is drawn is laid out at (${at.x}, ${at.y})`);
  }
});

test('sprites: chips go by priority: the tour stop and what the player stands at, then beacons, landmarks, menus; a low chip with no free row is dropped, a beacon never', async () => {
  const { createSprites } = await loadSprites();
  const w = makeWorld({ state: OPENED(), width: 1036, height: 608 });
  const origin = { x: -700, y: -150 };
  lookAt(w, origin, 1);
  const [jeffrey] = markers([]), others = markers([]).slice(1);
  const beacon = (m, x, y) => ({ ...m, x, y });
  const eatery = (awning, counter = null, index = 1) => ({ ...fullScene().eateries[index], awning, counter });
  const chipsOf = (sprites, scene) => sprites.chips(w.world, { ...emptyScene(), ...scene });
  const byId = (chips, id) => chips.find(c => c.id === id);
  // A beacon's label (50 above its foot) and an awning's (10 above it) on the same row: the beacon keeps its place, the awning
  // goes above it (a label never moves below its own beacon's globe, the awning may go either way: above first).
  const foot = { x: origin.x, y: origin.y }, awning = { x: origin.x, y: origin.y - 40 };
  let chips = chipsOf(createSprites(), { surprises: [beacon(jeffrey, foot.x, foot.y)], eateries: [eatery(awning)] });
  assert.equal(byId(chips, 'surprise:jeffrey_record').shift, 0, 'the beacon at its place');
  assert.ok(byId(chips, 'eatery:1').shift < 0, 'the awning above it');
  // The tour stop at the awning (the gold marker's): the awning keeps its place and the beacon's label goes above it.
  chips = chipsOf(createSprites(), { surprises: [beacon(jeffrey, foot.x, foot.y)], eateries: [eatery(awning)], tourMarker: awning });
  assert.deepEqual([byId(chips, 'eatery:1').shift, Math.sign(byId(chips, 'surprise:jeffrey_record').shift)], [0, -1]);
  // A menu and a landmark on a beacon's row: both give way by a row or more, and none of the three overlaps another. (The counter's
  // host stands at the beacon's foot here, so the beacon's label rises the 0.75 px that clears the host's head.)
  const menuAt = { x: origin.x, y: origin.y - 4 };            // its menu sits 46 above it: the beacon's label row
  chips = chipsOf(createSprites(), { surprises: [beacon(jeffrey, foot.x, foot.y)], eateries: [eatery(awning, menuAt)] });
  const trio = ['surprise:jeffrey_record', 'eatery:1', 'counter:1'].map(id => byId(chips, id));
  assert.ok(Math.abs(trio[0].shift) < 0.05 && Math.abs(trio[1].shift) >= 1 && Math.abs(trio[2].shift) >= 1, JSON.stringify(trio.map(c => c.shift)));
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(!overlaps(trio[i], trio[j]), `${trio[i].id} and ${trio[j].id}`);
  // Ten landmark chips on one row (six awnings, So What, the park, the 8th floor, the museum): seven rows within reach are
  // filled in order and the last three are dropped for the frame.
  const spot = { x: origin.x, y: origin.y }, at = dy => ({ x: spot.x, y: spot.y + dy });
  const landmarks = {
    eateries: [0, 1, 2, 3, 4, 5].map(i => eatery(spot, null, i)), soWhat: { awning: at(10), floor: at(10.5 + 16) },
    park: { ...fullScene().park, entrance: at(24) }, museum: { ...fullScene().museum, x: spot.x, y: spot.y + 40 },
  };
  chips = chipsOf(createSprites(), landmarks);
  const ids = ['eatery:0', 'eatery:1', 'eatery:2', 'eatery:3', 'eatery:4', 'eatery:5', 'so_what', 'park', 'so_what_floor', 'museum'];
  assert.deepEqual(ids.filter(id => byId(chips, id)), ids.slice(0, 7), 'the first seven by the stable order, then dropped');
  assert.deepEqual(chips.filter(c => ids.includes(c.id)).map(c => Math.round(c.shift)).sort((a, b) => a - b), [-3, -2, -1, 0, 1, 2, 3]);
  // Eight beacons on one spot: a beacon's label is never dropped and only ever goes up (never under its globe); past the rows
  // within reach it takes the nearest free row beyond, so the eight stack one above another and none covers another.
  const crowd = [jeffrey, ...others].slice(0, 8).map(m => beacon(m, origin.x, origin.y)), sprites = createSprites();
  chips = chipsOf(sprites, { surprises: crowd });
  assert.deepEqual(chips.map(c => Math.round(c.shift)).sort((a, b) => a - b), [-7, -6, -5, -4, -3, -2, -1, 0]);
  for (let i = 0; i < chips.length; i++) for (let j = i + 1; j < chips.length; j++) assert.ok(!overlaps(chips[i], chips[j]), `${chips[i].id} and ${chips[j].id}`);
  const drawn = overlayChips(sprites, w, { ...emptyScene(), surprises: crowd });
  assert.equal(drawn.filter(c => c.text.startsWith('[*]')).length, 8);
});

test('sprites: no chip is placed or drawn without a chip part, below the chip zoom, or in an empty scene', async () => {
  const { createSprites, CHIP_ZOOM } = await loadSprites();
  const sprites = createSprites(), w = makeWorld({ state: OPENED() }), scene = realScene();
  lookAt(w, P.MUSEUM, 0.85);
  assert.deepEqual(sprites.chips(w.world, emptyScene()), []);
  assert.deepEqual(overlayChips(sprites, w, emptyScene()), []);
  assert.ok(sprites.chips(w.world, scene).length > 0);
  zoom(w.world, CHIP_ZOOM - 0.0001);
  assert.deepEqual(sprites.chips(w.world, scene), []);
  assert.deepEqual(overlayChips(sprites, w, scene), []);
  for (const broken of [undefined, null, {}, { surprises: 3, eateries: 'x', museum: { x: NaN, y: 0 } }]) assert.deepEqual(sprites.chips(w.world, broken), []);
});

test('sprites: chipTargets puts hit points along a beacon label where the frame draws it, and none where it draws none', async () => {
  const { createSprites } = await loadSprites();
  const scene = realScene(), w = makeWorld({ state: OPENED(), width: 1036, height: 608 });
  const object = { id: 'surprise:mayor_pomp_event', kind: 'visit', name: 'Mayor', x: P.SURPRISE_SITES.mayor_pomp_event.x, y: P.SURPRISE_SITES.mayor_pomp_event.y };
  for (const scale of [0.5, 0.85, 1.6]) {
    lookAt(w, P.MUSEUM, scale);
    const sprites = createSprites(), chip = sprites.chips(w.world, scene).find(c => c.id === object.id), targets = sprites.chipTargets(w.world, scene, object);
    assert.ok(targets.length >= 2, `points along the label at ${scale}`);
    for (const t of targets) assert.deepEqual([t.id, t.kind, t.name], [object.id, 'visit', object.name]);
    assert.deepEqual([Math.min(...targets.map(t => t.x)), Math.max(...targets.map(t => t.x))], [chip.left, chip.right], 'from end to end');
    for (const t of targets) assert.ok(Math.abs(t.y - (chip.top + chip.bottom) / 2) < 1e-9, 'on its middle line');
    const xs = targets.map(t => t.x).sort((p, q) => p - q), k = Math.max(1, 1 / scale);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] <= 16 * k + 1e-9, 'close enough that the World\'s hit radius covers the chip');
    assert.equal(sprites.chipTargets(w.world, scene, object), targets, 'the same points while the frame is the same');
  }
  const sprites = createSprites();
  assert.deepEqual(sprites.chipTargets(w.world, scene, { ...object, id: 'museum' }), [], 'only beacon labels are hit points');
  assert.deepEqual(sprites.chipTargets(w.world, scene, { ...object, id: 'surprise:nope' }), []);
  lookAt(w, { x: 600, y: -40 }, 0.85);
  assert.deepEqual(sprites.chipTargets(w.world, scene, object), [], 'a label out of view has none');
  zoom(w.world, 0.2);
  assert.deepEqual(sprites.chipTargets(w.world, scene, object), [], 'below the chip zoom there is no label');
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
  // actors() lists the beacons first, one per marker (a counter's actor may share a beacon's y on the sidewalk).
  const beacons = list => list.slice(0, scene.surprises.length);
  assert.deepEqual(beacons(a).map(actor => actor.y), scene.surprises.map(m => m.y));
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
