// browser-next/core.js streetDistance, walkable and findPath against the scan and the router they replaced (copied below as
// they were before the street segment index and the number cell keys): the same distances, the same walkable cells and
// byte-identical paths, on the real streets and on made-up ones, for points anywhere (bucket borders, far away, not finite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as core from '../browser-next/core.js';
import * as P from '../browser-next/visits/positions.js';

const WAYS = JSON.parse(readFileSync(new URL('../browser-next/data/streets.osm.json', import.meta.url), 'utf8')).ways.map(w => ({ ...w, points: w.geometry.map(core.project) }));

// ---------------------------------------------------------------- the previous implementation, as it was
function oldStreetDistance(point, ways) {
  let best = Infinity;
  for (const way of ways) for (let i = 1; i < way.points.length; i++) best = Math.min(best, core.distanceToSegment(point, way.points[i - 1], way.points[i]));
  return best;
}
const oldInside = (point, b) => point.x >= b.left && point.x <= b.right && point.y >= b.top && point.y <= b.bottom;
const oldWalkable = (point, ways) => oldInside(point, core.BOUNDS) ? oldStreetDistance(point, ways) < core.STREET_CORRIDOR
  : point.x >= core.WALK_EXTENT.left && point.x < core.BOUNDS.left && point.y >= core.BOUNDS.top && point.y <= core.BOUNDS.bottom && core.eddyDistance(point) < core.STREET_CORRIDOR;
const oldCellCache = new WeakMap();
function oldCellsFor(ways) {
  if (ways === null || typeof ways !== 'object') return new Map();
  let cells = oldCellCache.get(ways);
  if (!cells) oldCellCache.set(ways, cells = new Map());
  return cells;
}
function oldFindPath(start, goal, ways) {
  if (!oldWalkable(goal, ways)) return [];
  const step = 10, key = p => `${p.x},${p.y}`;
  const limit = Math.ceil((core.WALK_EXTENT.right - core.WALK_EXTENT.left) / step + 1) * Math.ceil((core.WALK_EXTENT.bottom - core.WALK_EXTENT.top) / step + 1);
  const cells = oldCellsFor(ways);
  const passable = p => {
    const id = key(p);
    if (!cells.has(id)) cells.set(id, oldWalkable(p, ways));
    return cells.get(id);
  };
  const snap = p => ({ x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step });
  const s = snap(start), g = snap(goal), queue = [s], seen = new Map([[key(s), null]]);
  for (let i = 0; i < queue.length && i < limit; i++) {
    const current = queue[i];
    if (Math.hypot(current.x - g.x, current.y - g.y) < 12) {
      const path = [{ x: goal.x, y: goal.y }]; let cursor = current;
      while (cursor) { path.unshift(cursor); cursor = seen.get(key(cursor)); }
      return path;
    }
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const p = { x: current.x + dx, y: current.y + dy };
      if (!seen.has(key(p)) && passable(p)) { seen.set(key(p), current); queue.push(p); }
    }
  }
  return [];
}

// ---------------------------------------------------------------- helpers
// A seeded generator (mulberry32), so every run draws the same points.
function random(seed) {
  return () => { seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// A path as text that keeps what JSON drops: -0, NaN and the infinities.
const exact = value => JSON.stringify(value, (key, v) => (typeof v === 'number' && (Object.is(v, -0) || !Number.isFinite(v)) ? `#${Object.is(v, -0) ? '-0' : v}` : v));
const V = core.VIEW_BOUNDS;
// Points where an index could go wrong: exact multiples of the bucket sizes an index might use (core.js buckets by 64 px) and
// the doubles either side of them, the street points and the middles of their segments, the corners of the streets' extent, far
// away, and not finite.
function edgePoints(ways) {
  const out = [];
  const xs = ways.flatMap(w => w.points.map(p => p.x)), ys = ways.flatMap(w => w.points.map(p => p.y));
  const box = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  const near = v => [v, v - 1e-9, v + 1e-9, v - Math.abs(v) * Number.EPSILON, v + Math.abs(v) * Number.EPSILON];
  // The corners of 64 px squares over the streets' extent (at most the real streets' own, and a little more), the doubles either
  // side of each corner, and a point on the border running from it each way.
  const left = Math.max(box.left, -3600), right = Math.min(box.right, 1700), top = Math.max(box.top, -2700), bottom = Math.min(box.bottom, 1400);
  for (let x = Math.floor(left / 64) * 64 - 128; x <= right + 128; x += 64) for (let y = Math.floor(top / 64) * 64 - 128; y <= bottom + 128; y += 64) {
    for (const dx of [0, -1e-9, 1e-9]) for (const dy of [0, -1e-9, 1e-9]) out.push({ x: x + dx, y: y + dy });
    out.push({ x: x + 17.5, y }, { x, y: y + 23.25 });
  }
  for (const w of ways) for (let i = 0; i < w.points.length; i++) {
    const p = w.points[i], q = w.points[i + 1];
    out.push({ x: p.x, y: p.y }, { x: p.x + 60, y: p.y }, { x: p.x, y: p.y - 60 });
    if (q) { const d = Math.hypot(q.x - p.x, q.y - p.y) || 1, n = { x: -(q.y - p.y) / d, y: (q.x - p.x) / d }, m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; for (const k of [0, 59.999999, 60, 60.000001, 64, 128]) out.push({ x: m.x + n.x * k, y: m.y + n.y * k }, { x: m.x - n.x * k, y: m.y - n.y * k }); }
  }
  for (const x of near(box.left).concat(near(box.right))) for (const y of near(box.top).concat(near(box.bottom))) out.push({ x, y });
  for (const v of [1e6, -1e6, 1e15, -1e300, Number.MAX_VALUE, -Number.MAX_VALUE, 5e-324]) out.push({ x: v, y: 0 }, { x: 0, y: v }, { x: v, y: v });
  for (const v of [NaN, Infinity, -Infinity]) out.push({ x: v, y: 0 }, { x: 95, y: v }, { x: v, y: v }, { x: -2000, y: v });
  out.push({ x: -0, y: -0 }, { x: -0, y: -47 }, { x: '95', y: '-47' }, { x: null, y: 0 }, {});
  return out;
}
function samePoints(points, ways, label) {
  let checked = 0;
  for (const p of points) {
    const want = oldStreetDistance(p, ways), got = core.streetDistance(p, ways);
    if (!Object.is(got, want)) assert.fail(`${label}: streetDistance(${exact(p)}) is ${got}, the scan says ${want}`);
    if (core.walkable(p, ways) !== oldWalkable(p, ways)) assert.fail(`${label}: walkable(${exact(p)}) differs`);
    checked++;
  }
  return checked;
}

// ---------------------------------------------------------------- streetDistance and walkable
test('streetDistance and walkable equal the scan of every segment: a grid over the view bounds and beyond, random points, bucket borders, far and not finite points', () => {
  const grid = [];
  for (let x = V.left - 600; x <= V.right + 600; x += 8) for (let y = V.top - 600; y <= V.bottom + 600; y += 8) grid.push({ x, y });
  const rand = random(20261101), wide = Array.from({ length: 20000 }, (_, i) => i % 4 === 0
    ? { x: -6000 + rand() * 10000, y: -4000 + rand() * 7000 }
    : { x: V.left + rand() * (V.right - V.left), y: V.top + rand() * (V.bottom - V.top) });
  const n = samePoints(grid, WAYS, 'grid') + samePoints(wide, WAYS, 'random') + samePoints(edgePoints(WAYS), WAYS, 'edges');
  assert.ok(n > 200000, String(n));
  // Asked again (the index is built by now), and of a fresh array of the same streets: the same answers.
  samePoints(wide.slice(0, 2000), WAYS, 'again');
  samePoints(wide.slice(0, 2000), [...WAYS], 'another array');
});

test('streetDistance equals the scan on made-up street networks: random, on bucket borders, degenerate, tiny, empty, too wide to bucket, malformed', () => {
  const rand = random(7), r = (a, b) => a + rand() * (b - a);
  const network = (count, box, shape = () => null) => [{ name: 'test', points: Array.from({ length: count + 1 }, (_, i) => shape(i) ?? { x: r(box.left, box.right), y: r(box.top, box.bottom) }) }];
  const box = { left: -900, right: 700, top: -500, bottom: 400 };
  const nets = {
    random: network(200, box),
    'many ways': Array.from({ length: 60 }, () => ({ name: 'w', points: Array.from({ length: 2 + Math.floor(rand() * 4) }, () => ({ x: r(-3000, 1000), y: r(-2000, 1000) })) })),
    'on bucket borders': Array.from({ length: 40 }, (_, i) => ({ name: 'grid', points: i % 2 ? [{ x: 64 * (i - 20), y: -640 }, { x: 64 * (i - 20), y: 640 }] : [{ x: -1280, y: 64 * (i - 20) }, { x: 1280, y: 64 * (i - 20) }] })),
    degenerate: network(60, box, i => (i % 3 ? null : { x: 128, y: -64 })),
    'short segments': network(300, { left: -50, right: 50, top: -50, bottom: 50 }),
    'long diagonals': network(30, { left: -5000, right: 5000, top: -4000, bottom: 4000 }),
    tiny: network(3, box),
    empty: [],
    'no points': [{ name: 'none', points: [] }, { name: 'one', points: [{ x: 0, y: 0 }] }],
    'too wide': [...network(40, box), { name: 'far', points: [{ x: 1e9, y: 1e9 }, { x: 1e9 + 10, y: 1e9 }] }],
    'not finite': [...network(40, box), { name: 'nan', points: [{ x: NaN, y: 0 }, { x: 10, y: 10 }] }],
    infinite: [...network(40, box), { name: 'inf', points: [{ x: 0, y: 0 }, { x: Infinity, y: 10 }] }],
    'text coordinates': [...network(40, box), { name: 'text', points: [{ x: '5', y: '7' }, { x: 20, y: 30 }] }],
  };
  for (const [name, ways] of Object.entries(nets)) {
    const points = [...Array.from({ length: 3000 }, () => ({ x: r(box.left - 400, box.right + 400), y: r(box.top - 400, box.bottom + 400) })), ...(ways.some(w => w.points.length) ? edgePoints(ways.filter(w => w.points.length && w.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))) : [])];
    samePoints(points, ways, name);
  }
  // A list that is not an array of ways fails as the scan fails.
  for (const ways of [null, undefined, 3, [null], [{ name: 'x' }]]) {
    let want = null, got = null;
    try { oldStreetDistance({ x: 1, y: 2 }, ways); } catch (error) { want = error; }
    try { core.streetDistance({ x: 1, y: 2 }, ways); } catch (error) { got = error; }
    assert.ok(want, `the scan throws on ${exact(ways)}`);
    assert.deepEqual([got?.constructor, got?.message], [want.constructor, want.message], exact(ways));
  }
});

test('streetDistance reads a ways array\'s streets once, then only the segments near the point it measures', () => {
  // Street points that count every read of their coordinates.
  let reads = 0;
  const counted = () => WAYS.map(way => ({ ...way, points: way.points.map(p => new Proxy(p, { get(target, key, receiver) { if (key === 'x' || key === 'y') reads++; return Reflect.get(target, key, receiver); } })) }));
  const segments = WAYS.reduce((n, w) => n + w.points.length - 1, 0), scan = segments * 8; // distanceToSegment reads 8 coordinates
  const ways = counted(), points = [...Object.values(P.walkTargets()), ...core.findPath(P.START, P.LARKIN_JUNCTION, WAYS)].filter(p => p.x >= core.BOUNDS.left);
  core.streetDistance(P.START, ways);
  reads = 0;
  for (const p of points) core.streetDistance(p, ways);
  const each = reads / points.length;
  assert.ok(points.length > 200, String(points.length));
  assert.ok(each < scan / 10, `${each.toFixed(1)} coordinate reads per point, a scan of all ${segments} segments reads ${scan}`);
});

// ---------------------------------------------------------------- findPath
test('findPath: byte-identical paths for every walkTargets() entry and for thousands of random start and goal pairs', () => {
  assert.equal(core.findPath.length, 3, 'the signature is unchanged');
  const targets = Object.entries(P.walkTargets());
  assert.equal(targets.length, 34);
  const fresh = () => [...WAYS];
  // Each walkTargets() route from the start and back, cold (new arrays) and warm (the same ones).
  const mine = fresh(), theirs = fresh();
  for (const pass of ['cold', 'warm']) for (const [id, p] of targets) {
    const want = exact(oldFindPath(P.START, p, theirs));
    assert.equal(exact(core.findPath(P.START, p, mine)), want, `${id} (${pass})`);
    assert.equal(exact(core.findPath(p, P.START, mine)), exact(oldFindPath(p, P.START, theirs)), `${id} back to the start (${pass})`);
    assert.ok(JSON.parse(want).length > 0, `${id} routes`);
  }
  // Random pairs: anywhere in the walk extent and around it (most refused at once), and walkable cell to walkable cell.
  const rand = random(1101), E = core.WALK_EXTENT, anywhere = () => ({ x: E.left - 200 + rand() * (E.right - E.left + 400), y: E.top - 200 + rand() * (E.bottom - E.top + 400) });
  const walkablePoint = () => { for (;;) { const p = anywhere(); if (oldWalkable(p, WAYS)) return p; } };
  const pairs = [...Array.from({ length: 2400 }, () => [anywhere(), anywhere()]), ...Array.from({ length: 600 }, () => [walkablePoint(), walkablePoint()])];
  let routed = 0;
  const a = fresh(), b = fresh();
  for (const [start, goal] of pairs) {
    const want = exact(oldFindPath(start, goal, b));
    assert.equal(exact(core.findPath(start, goal, a)), want, `${exact(start)} to ${exact(goal)}`);
    if (want !== '[]') routed++;
  }
  assert.ok(routed > 700, `${routed} of ${pairs.length} pairs route`);
});

test('findPath: points that are not finite, far away or on -0 route (or fail) as before', () => {
  const odd = [NaN, Infinity, -Infinity, -0, 1e6, -1e300, Number.MAX_VALUE, 0.4, -0.4, 4.999999, 5, -5, 2 ** 53, 2 ** 60];
  const points = [P.START, P.LARKIN_JUNCTION, P.MUSEUM, ...odd.flatMap(v => [{ x: v, y: -47 }, { x: 95, y: v }, { x: v, y: v }]), { x: -0.3, y: -0.2 }, { x: '95', y: '-47' }, { x: 95 }, {}];
  const a = [...WAYS], b = [...WAYS];
  for (const start of points) for (const goal of points) {
    let want, got;
    try { want = exact(oldFindPath(start, goal, b)); } catch (error) { want = `${error.constructor.name}: ${error.message}`; }
    try { got = exact(core.findPath(start, goal, a)); } catch (error) { got = `${error.constructor.name}: ${error.message}`; }
    assert.equal(got, want, `${exact(start)} to ${exact(goal)}`);
  }
  // Streets that are not a ways array fail as they failed.
  for (const ways of [null, undefined, 7]) {
    let want, got;
    try { want = exact(oldFindPath(P.START, P.MUSEUM, ways)); } catch (error) { want = `${error.constructor.name}: ${error.message}`; }
    try { got = exact(core.findPath(P.START, P.MUSEUM, ways)); } catch (error) { got = `${error.constructor.name}: ${error.message}`; }
    assert.equal(got, want, exact(ways));
  }
});
