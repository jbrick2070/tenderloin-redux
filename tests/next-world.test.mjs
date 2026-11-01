// The Phase 3 world foundation of browser-next: core.js's walkable window, the Eddy corridor and the routing cache,
// camera.js's view bounds and lookAt, and the reward cues of a find and of the visit-only stops (rewards.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as core from '../browser-next/core.js';
import { Camera } from '../browser-next/camera.js';
import * as rewards from '../browser-next/rewards.js';
import { SURPRISE_IDS } from '../browser-next/godot-save.js';
import * as P from '../browser-next/visits/positions.js';
import { gdFunc } from './gd-literal.mjs';

const json = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const POWER_PLACE = json('browser-next/data/power_place.json');
const WAYS = json('browser-next/data/streets.osm.json').ways.map(w => ({ ...w, points: w.geometry.map(core.project) }));
const text = value => JSON.stringify(value);
// Godot metres (x east, z south) as a latitude and longitude around core.js ORIGIN, so core.project() maps them.
const godotLatLon = ([x, z]) => ({ lat: core.ORIGIN.lat - z / 111320, lon: core.ORIGIN.lon + x / (111320 * Math.cos(core.ORIGIN.lat * Math.PI / 180)) });
const closeTo = (p, q, eps, label) => assert.ok(Math.abs(p.x - q.x) <= eps && Math.abs(p.y - q.y) <= eps, `${label}: (${p.x}, ${p.y}) vs (${q.x}, ${q.y})`);

// ---------------------------------------------------------------- bounds and the Eddy corridor
test('core.js bounds: the opening window, the route overview, the walkable window, the Larkin extent and the view clamp', () => {
  assert.deepEqual(core.OPENING_BOUNDS, { left: -300, right: 850, top: -460, bottom: 220 });
  assert.deepEqual(core.ROUTE_BOUNDS, { left: -2400, right: 850, top: -460, bottom: 220 }, 'Turk west to Hyde, as before Phase 3');
  assert.deepEqual(core.BOUNDS, { left: -2400, right: 850, top: -600, bottom: 280 }, 'Eddy to the north, 145 Leavenworth to the south');
  assert.deepEqual(core.WALK_EXTENT, { left: -2980, right: 850, top: -600, bottom: 280 });
  assert.deepEqual(core.VIEW_BOUNDS, { left: -2980, right: 850, top: -800, bottom: 280 });
  assert.equal(core.STREET_CORRIDOR, 60);
  // power_place.gd: the walk bounds reach the Larkin junction minus 10 m, on the 10 px routing grid.
  const junction = core.project(godotLatLon(POWER_PLACE.junction.xz));
  closeTo(junction, P.LARKIN_JUNCTION, 1e-6, 'junction');
  assert.equal(core.WALK_EXTENT.left, Math.floor((junction.x - 10 * core.PIXELS_PER_METRE) / 10) * 10);
  const within = (b, outer) => b.left >= outer.left && b.right <= outer.right && b.top >= outer.top && b.bottom <= outer.bottom;
  assert.ok(within(core.OPENING_BOUNDS, core.ROUTE_BOUNDS) && within(core.ROUTE_BOUNDS, core.BOUNDS) && within(core.BOUNDS, core.WALK_EXTENT) && within(core.WALK_EXTENT, core.VIEW_BOUNDS));
});

test('the Eddy corridor is godot/data/power_place.json eddy.points through project()', () => {
  assert.deepEqual(core.EDDY_XZ, POWER_PLACE.eddy.points);
  assert.equal(core.EDDY_WEST.length, core.EDDY_XZ.length);
  core.EDDY_XZ.forEach((xz, i) => closeTo(core.EDDY_WEST[i], core.project(godotLatLon(xz)), 1e-6, `EDDY_WEST[${i}]`));
  assert.ok(core.EDDY_WEST[0].x < core.WALK_EXTENT.left + core.STREET_CORRIDOR, 'it starts at the Larkin junction');
  assert.ok(core.EDDY_WEST.at(-1).x > core.BOUNDS.left, 'and reaches into the walkable window');
  const mid = core.EDDY_WEST[3];
  assert.equal(core.eddyDistance(mid), 0);
  assert.ok(Math.abs(core.eddyDistance({ x: mid.x, y: mid.y - 30 }) - 30) < 0.5, 'Eddy runs across the screen, like Turk');
});

test('walkable: streets inside BOUNDS, and west of it only the Eddy corridor up to WALK_EXTENT', () => {
  const W = p => core.walkable(p, WAYS);
  assert.equal(W(P.START), true);
  // The window grew north to Eddy and south to 145 Leavenworth, where the old one (top -460, bottom 220) refused.
  for (const id of ['magic_carpet_chef', 'mayor_pomp_event', 'hidden_mural_145']) {
    const p = P.SURPRISE_SITES[id];
    assert.ok(p.y < core.ROUTE_BOUNDS.top || p.y > core.ROUTE_BOUNDS.bottom, `${id} is outside the old window`);
    assert.equal(W(p), true, id);
  }
  // Inside BOUNDS a block interior is not walkable.
  const block = { x: -350, y: -250 };
  assert.ok(core.streetDistance(block, WAYS) >= core.STREET_CORRIDOR);
  assert.equal(W(block), false);
  // West of BOUNDS: on Eddy, yes; off it, no; past WALK_EXTENT, no.
  assert.equal(W(P.LARKIN_JUNCTION), true);
  const eddy = core.EDDY_WEST[2];
  assert.ok(eddy.x < core.BOUNDS.left);
  assert.equal(W(eddy), true);
  assert.equal(W({ x: eddy.x, y: eddy.y - 61 }), false, 'off the corridor');
  const end = core.EDDY_WEST[0];
  assert.equal(W({ x: core.WALK_EXTENT.left, y: end.y }), true, 'WALK_EXTENT.left is in');
  assert.equal(W({ x: core.WALK_EXTENT.left - 1, y: end.y }), false, 'one pixel past it is out');
  assert.equal(W({ x: core.BOUNDS.left - 1, y: -300 }), false, 'west of BOUNDS, away from Eddy');
  for (const p of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: -Infinity, y: end.y }, { x: 5000, y: 0 }, { x: 95, y: -900 }]) assert.equal(W(p), false, text(p));
});

// ---------------------------------------------------------------- routing
test('findPath: every walkTargets() entry routes, and the per-ways cell cache gives byte-identical paths', () => {
  assert.equal(core.findPath.length, 3, 'the signature is unchanged');
  const targets = Object.entries(P.walkTargets());
  assert.equal(targets.length, 34);
  // The router before the cache: positions.js proposedFindPath is the same search with cells of its own on every call.
  const uncached = targets.map(([, p]) => P.proposedFindPath(P.START, p, WAYS, core.walkable));
  const ways = [...WAYS]; // a new array is a new cache key, so the first pass starts cold
  const cold = targets.map(([, p]) => core.findPath(P.START, p, ways)), warm = targets.map(([, p]) => core.findPath(P.START, p, ways));
  targets.forEach(([id], i) => {
    assert.ok(uncached[i].length > 0, `${id} routes`);
    assert.equal(text(cold[i]), text(uncached[i]), `${id}: first pass`);
    assert.equal(text(warm[i]), text(uncached[i]), `${id}: warm cache`);
  });
  // Cells cached by routes from the start serve a route from elsewhere unchanged.
  assert.equal(text(core.findPath(P.LARKIN_JUNCTION, P.START, ways)), text(P.proposedFindPath(P.LARKIN_JUNCTION, P.START, WAYS, core.walkable)));
  assert.deepEqual(core.findPath(P.START, { x: -350, y: -250 }, ways), [], 'an unwalkable goal');
});

test('findPath caches cells per ways array: a repeat route reads no street geometry, another array starts cold', () => {
  let scans = 0;
  // Street points that count every read of their coordinates: whether streetDistance scans every segment or indexes them
  // (tests/next-router.test.mjs), each cell a route measures reads some, and a cell it has cached reads none.
  const counted = () => WAYS.map(way => ({ ...way, points: way.points.map(p => new Proxy(p, { get(target, key, receiver) { if (key === 'x' || key === 'y') scans++; return Reflect.get(target, key, receiver); } })) }));
  const ways = counted();
  const first = core.findPath(P.START, P.MUSEUM, ways), cold = scans;
  assert.ok(first.length > 0 && cold > 1000 * 8, `${cold} street coordinate reads for the first route`);
  scans = 0;
  core.walkable(P.MUSEUM, ways);
  const goal = scans;
  scans = 0;
  assert.equal(text(core.findPath(P.START, P.MUSEUM, ways)), text(first));
  assert.equal(scans, goal, 'a repeat route reads the streets only for its own goal');
  scans = 0;
  assert.ok(core.findPath(P.START, P.LARKIN_JUNCTION, ways).length > 0);
  assert.ok(scans < cold, 'a longer route reuses the cells the first one computed');
  scans = 0;
  assert.equal(text(core.findPath(P.START, P.MUSEUM, counted())), text(first));
  assert.equal(scans, cold, 'another ways array, even with the same streets, has cells of its own');
  assert.deepEqual(core.findPath(P.START, P.MUSEUM, []), [], 'no streets, nothing walkable inside BOUNDS');
});

test('findPath searches up to the cells of WALK_EXTENT (34,176), past the old window\'s 22,494', () => {
  // A street every 100 px across the window makes every cell inside BOUNDS walkable: 326 x 89 = 29,014 cells.
  const sheet = [];
  for (let y = core.BOUNDS.top; y <= core.BOUNDS.bottom + 20; y += 100) sheet.push({ name: 'test', points: [{ x: core.WALK_EXTENT.left, y }, { x: core.BOUNDS.right + 100, y }] });
  const far = { x: core.BOUNDS.left, y: core.BOUNDS.bottom };
  const path = core.findPath(P.START, far, sheet);
  assert.ok(path.length > 0, 'the far corner of a fully walkable window is reached');
  assert.deepEqual(path.at(-1), far);
  // Breadth-first order as findPath searches: the corner is reached only after more cells than the old limit allowed.
  const snap = p => ({ x: Math.round(p.x / 10) * 10, y: Math.round(p.y / 10) * 10 }), key = p => `${p.x},${p.y}`;
  const s = snap(P.START), g = snap(far), queue = [s], seen = new Set([key(s)]);
  let i = 0;
  for (; i < queue.length && Math.hypot(queue[i].x - g.x, queue[i].y - g.y) >= 12; i++) {
    for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const p = { x: queue[i].x + dx, y: queue[i].y + dy };
      if (!seen.has(key(p)) && core.walkable(p, sheet)) { seen.add(key(p)); queue.push(p); }
    }
  }
  const old = Math.ceil((850 + 2400) / 10 + 1) * Math.ceil((220 + 460) / 10 + 1), limit = Math.ceil((850 + 2980) / 10 + 1) * Math.ceil((280 + 600) / 10 + 1);
  assert.deepEqual([old, limit], [22494, 34176]);
  assert.ok(i >= old && i < limit, `the corner is cell ${i} of the search`);
});

// ---------------------------------------------------------------- camera.js
// camera.js fit(): the scale at which bounds fill the canvas less its margins and the hint panel.
const fitOf = (camera, b) => Math.max(.05, Math.min((camera.width - 28) / (b.right - b.left), (camera.height - 245) / (b.bottom - b.top)));
const midpoint = b => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
test('camera.js: the zoom-out minimum and the route overview stay on ROUTE_BOUNDS; the centre is clamped to VIEW_BOUNDS', () => {
  const V = core.VIEW_BOUNDS;
  for (const [w, h] of [[320, 568], [390, 844], [1440, 900], [2560, 600]]) {
    const c = new Camera(w, h, { ...P.START });
    assert.equal(c.fit, fitOf(c, core.OPENING_BOUNDS), `${w}x${h} fit`);
    assert.equal(c.minimum, fitOf(c, core.ROUTE_BOUNDS), `${w}x${h} minimum`);
    c.overview(true);
    assert.deepEqual([c.overviewMode, c.routeOverview, c.following, c.scale], [true, true, false, c.minimum]);
    assert.deepEqual(c.center, midpoint(core.ROUTE_BOUNDS), 'the route overview centres on Turk, Taylor to Hyde');
    c.overview();
    assert.deepEqual([c.routeOverview, c.scale], [false, c.fit]);
    assert.deepEqual(c.center, midpoint(core.OPENING_BOUNDS));
    c.pan(1e7, 1e7);
    assert.deepEqual(c.center, { x: V.left, y: V.top }, `${w}x${h}: dragged to the north-west corner of the view bounds`);
    c.pan(-1e7, -1e7);
    assert.deepEqual(c.center, { x: V.right, y: V.bottom });
    c.zoom(1e-6);
    assert.equal(c.scale, c.minimum, 'zooming out stops at the route overview');
  }
  // The wide, short screen is where the walkable window's height would have lowered the minimum.
  const wide = new Camera(2560, 600, { ...P.START });
  assert.ok(fitOf(wide, core.BOUNDS) < wide.minimum);
});

test('camera.js lookAt: leaves the overview and following, centres above the point, keeps a readable scale', () => {
  const c = new Camera(390, 844, { ...P.START });
  assert.equal(c.following, true, 'a phone follows the player');
  c.lookAt(P.SURPRISE_SITES.jeffrey_record);
  assert.deepEqual([c.overviewMode, c.following], [false, false]);
  assert.deepEqual(c.center, { x: P.SURPRISE_SITES.jeffrey_record.x, y: P.SURPRISE_SITES.jeffrey_record.y - 25 });
  assert.ok(c.scale >= .85);
  const before = { ...c.center };
  c.track({ x: 400, y: 20 });
  assert.deepEqual(c.center, before, 'the player no longer moves the view');
  // Larkin and the park are reachable centres; a point past the view bounds is clamped.
  c.lookAt(P.LARKIN_JUNCTION);
  assert.deepEqual(c.center, { x: P.LARKIN_JUNCTION.x, y: P.LARKIN_JUNCTION.y - 25 });
  c.lookAt({ x: -5000, y: -5000 });
  assert.deepEqual(c.center, { x: core.VIEW_BOUNDS.left, y: core.VIEW_BOUNDS.top });
  // The scale: at least .85 by default, never below the minimum or above the maximum.
  const desk = new Camera(1440, 900, { ...P.START });
  assert.equal(desk.overviewMode, true);
  desk.lookAt(P.MUSEUM);
  assert.equal(desk.scale, Math.max(desk.fit, .85));
  desk.zoom(1.5); const zoomed = desk.scale;
  desk.lookAt(P.PARK_ENTRANCE);
  assert.equal(desk.scale, zoomed, 'a closer view is kept');
  desk.lookAt(P.MUSEUM, 99); assert.equal(desk.scale, desk.maximum);
  desk.lookAt(P.MUSEUM, 0); assert.equal(desk.scale, desk.minimum);
  // A point that is not a finite position changes nothing.
  const kept = { center: { ...desk.center }, scale: desk.scale };
  for (const bad of [null, {}, { x: NaN, y: 0 }, { x: 0, y: Infinity }]) {
    desk.lookAt(bad);
    assert.deepEqual({ center: desk.center, scale: desk.scale }, kept, text(bad));
  }
  desk.follow(P.START);
  assert.deepEqual([desk.following, desk.center], [true, { x: P.START.x, y: P.START.y - 25 }], 'follow takes the view back');
});

// ---------------------------------------------------------------- reward cues
const find = (s, id) => { const after = core.applyAction(s, { type: 'surprise', id }); return { after, cues: rewards.progressCues(s, after, { type: 'surprise', id }) }; };
test('a find raises surprise_discovery, the tenth surprise_finale, a repeat nothing (inspect_neighborhood_surprise)', () => {
  assert.match(gdFunc('main.gd', 'inspect_neighborhood_surprise'), /\tif newly_discovered:\n\t\tvar burst_heading := [^\n]+\n\t\ttrigger_progress_cue\("surprise_finale" if all_found else "surprise_discovery", s_id\)\n/);
  assert.match(gdFunc('main.gd', 'inspect_neighborhood_surprise'), /var all_found := discovered_surprises\.size\(\) >= NEIGHBORHOOD_SURPRISE_IDS\.size\(\)/);
  let s = core.initialState(), r = find(s, 'cutesy_dino');
  assert.deepEqual(r.cues, [{ id: 'surprise_discovery', reason: 'cutesy_dino', suppressed: false, sounds: true }]);
  assert.equal(s.opened, false, 'before the block opens, as in Godot');
  assert.deepEqual(find(r.after, 'cutesy_dino').cues, [], 'a repeat raises nothing');
  assert.deepEqual(find(s, 'nope').cues, [], 'an unknown id raises nothing');
  assert.deepEqual(rewards.progressCues(s, s, { type: 'surprise', id: 'cutesy_dino' }), [], 'an action that changed nothing raises nothing');
  for (const id of SURPRISE_IDS.slice(0, 8)) s = core.applyAction(s, { type: 'surprise', id });
  r = find(s, 'clown_horn_walker');
  assert.deepEqual(r.cues.map(c => [c.id, c.reason]), [['surprise_discovery', 'clown_horn_walker']], 'the ninth');
  r = find(r.after, 'mayor_pomp_event');
  assert.deepEqual(r.cues, [{ id: 'surprise_finale', reason: 'mayor_pomp_event', suppressed: false, sounds: true }], 'the tenth');
  assert.equal(rewards.rewardFor(r.cues, { enabled: true, unlocked: true }), r.cues[0]);
  assert.equal(rewards.rewardFor(r.cues, { enabled: false, unlocked: true }), null);
});

test('the surprise chimes Godot tunes by reason: Mayor Public Event, Clown Horn, and the finale over both', () => {
  const chime = (s, id) => { const [c] = find(s, id).cues; return rewards.cueArpeggio(c.id, c.reason); };
  const fresh = core.initialState();
  assert.deepEqual(chime(fresh, 'mayor_pomp_event'), { freqs: [392.00, 493.88, 587.33], duration: 0.62 });
  assert.deepEqual(chime(fresh, 'clown_horn_walker'), { freqs: [440.00, 554.37, 659.25], duration: 0.42 });
  assert.deepEqual(chime(fresh, 'jeffrey_record'), { freqs: [659.25, 830.61, 987.77], duration: 0.48 });
  const nine = id => SURPRISE_IDS.filter(other => other !== id).reduce((s, other) => core.applyAction(s, { type: 'surprise', id: other }), fresh);
  for (const id of ['mayor_pomp_event', 'clown_horn_walker']) assert.deepEqual(chime(nine(id), id), { freqs: [523.25, 659.25, 783.99, 1046.50], duration: 0.68 }, `${id} last`);
});

test('visitCue raises only Godot\'s five visit-only cues, each from its own Godot function', () => {
  assert.deepEqual(rewards.VISIT_CUES, ['museum_portal', 'boeddeker_park', 'so_what_egg', 'eatery_order', 'tour_complete']);
  const RAISED = {
    museum_portal: ['inspect_tenderloin_museum_hub', 'era_title'], boeddeker_park: ['inspect_boeddeker_park', '"Boeddeker Park"'],
    so_what_egg: ['inspect_so_what_easter_egg', '"So What"'], eatery_order: ['eatery_counter_interact', 'e_id'],
    tour_complete: ['update_landmark_tour_completion', '"All %d session stops" % int(tour.total)'],
  };
  for (const id of rewards.VISIT_CUES) {
    const [fn, reason] = RAISED[id];
    assert.ok(gdFunc('main.gd', fn).includes(`trigger_progress_cue("${id}", ${reason})`), `${fn} raises ${id}`);
    assert.deepEqual(rewards.visitCue(id, 'reason'), { id, reason: 'reason', suppressed: false, sounds: true }, id);
  }
  assert.deepEqual(rewards.cueArpeggio('museum_portal', 'x'), rewards.cueArpeggio('boeddeker_park', 'y'));
  assert.equal(rewards.visitCue('so_what_egg', 7).reason, '7');
  for (const id of ['surprise_discovery', 'surprise_finale', 'neighbor_visit', 'mural_complete', 'history_comptons', '', 'constructor', undefined, null]) assert.equal(rewards.visitCue(id, 'x'), null, String(id));
  // The host plays a visit chime as rewards.play(rewardFor([visitCue(id, reason)], gates)): an unknown id is no chime, not a throw.
  const gates = { enabled: true, unlocked: true };
  assert.equal(rewards.rewardFor([rewards.visitCue('nope', 'x')], gates), null);
  assert.deepEqual(rewards.rewardFor([rewards.visitCue('so_what_egg', 'So What')], gates), rewards.visitCue('so_what_egg', 'So What'));
  assert.equal(rewards.rewardFor([rewards.visitCue('so_what_egg', 'So What')], { enabled: true, unlocked: false }), null, 'the unlock gate holds');
});
