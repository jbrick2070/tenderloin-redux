import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyAction as act, progress, LITTER, MOTIFS, loadSave, serializeSave, canPlaceFurniture } from '../public/core.js';
import { programmeIssue } from '../public/programme.js';
import { currentActivity, initialHosting, hostingResponse, hostingGuests, tilePanelSVG } from '../public/hosting.js';
import { hostingVisitorCells, visitorPoint } from '../public/gathering.js';
import { NEIGHBORS, PLACES } from '../public/world.js';
import { postcardSVG } from '../public/keepsake.js';
function opened(layout = 'table') {
  let s = act(act(initialState(), { type: 'greet' }), { type: 'layout', value: layout });
  for (const [id, col, row] of [['table', 0, 3], ['seats', 2, 0], ['speaker', 5, 0]]) s = act(s, { type: 'furniture', id, col, row });
  for (const item of LITTER) s = act(s, { type: 'tidy', id: item.id });
  MOTIFS.forEach((id, col) => { s = act(s, { type: 'mural', id, col, row: 0 }); });
  return act(act(s, { type: 'soundcheck' }), { type: 'open' });
}
function published(s, order = ['beats', 'pause', 'art', 'stories']) {
  for (const id of [...s.programme.order]) s = act(s, { type: 'programme-remove', id });
  for (const id of order) s = act(s, { type: 'programme-add', id });
  return act(s, { type: 'programme-publish' });
}
const begin = s => act(published(s), { type: 'host-start' });
function permutations(ids) { return ids.length ? ids.flatMap(id => permutations(ids.filter(other => other !== id)).map(rest => [id, ...rest])) : [[]]; }

test('every valid programme runs in its frozen order and resumes each prefix in either opening layout', () => {
  for (const layout of ['table', 'floor']) for (const order of permutations(['stories', 'beats', 'art', 'pause']).filter(order => !programmeIssue(order))) {
    let s = act(published(opened(layout), order), { type: 'host-start' });
    const preparations = progress(s), epilogue = structuredClone(s.epilogue);
    for (let i = 0; i < 4; i++) {
      assert.equal(currentActivity(s.hosting), order[i]);
      assert.equal(act(s, { type: 'host-complete', id: order[(i + 1) % 4] }), s, 'cannot skip a slot');
      s = act(s, { type: 'host-complete', id: order[i] });
      assert.equal(act(s, { type: 'host-complete', id: order[i] }), s, 'duplicate/stale completion cannot advance');
      s = loadSave(serializeSave(s)).state;
      assert.deepEqual(s.hosting.results.map(r => r.id), order.slice(0, i + 1));
    }
    assert.equal(currentActivity(s.hosting), null); assert.deepEqual(progress(s), preparations); assert.deepEqual(s.epilogue, epilogue);
    assert.equal(act(s, { type: 'host-start' }), s, 'finished event is not silently reset');
  }
});
test('opening and published-order guards reject early or unrelated controls; optional ending never gates hosting', () => {
  for (const s of [initialState(), opened()]) assert.equal(act(s, { type: 'host-start' }), s);
  let s = begin(opened()); assert.equal(s.epilogue.packing, false); assert.equal(s.epilogue.photo.status, 'unasked');
  for (const a of [{ type: 'host-story', value: 'memory' }, { type: 'host-tile', cell: 0 }, { type: 'host-beat', step: -1 }, { type: 'host-beat', step: 8 }, { type: 'host-beat', step: .5 }, { type: 'host-palette', value: 'cool' }, { type: 'host-quiet', value: 'arc' }]) assert.equal(act(s, a), s);
  s = act(s, { type: 'host-complete', id: 'beats' });
  assert.equal(act(s, { type: 'host-quiet', value: { toString: 3 } }), s);
  const packed = act(opened(), { type: 'pack' }); assert.equal(begin(packed).hosting.order.length, 4);
});
test('rhythm edits, quiet choice and tile composition persist and produce immutable committed outcomes', () => {
  let s = begin(opened());
  for (const step of [0, 2, 4, 6]) s = act(s, { type: 'host-beat', step });
  assert.equal(s.hosting.draft.pattern, 0, 'a listening round is a valid full contribution');
  s = loadSave(serializeSave(s)).state; assert.equal(s.hosting.draft.pattern, 0);
  s = act(s, { type: 'host-complete', id: 'beats' }); s = act(s, { type: 'host-quiet', value: 'pairs' }); s = act(s, { type: 'host-complete', id: 'pause' });
  s = act(s, { type: 'host-tile', cell: 0 }); s = act(s, { type: 'host-palette', value: 'cool' });
  const partial = loadSave(serializeSave(s)).state; assert.equal(partial.hosting.draft.tiles[0], 1); assert.equal(partial.hosting.draft.palette, 'cool');
  s = act(partial, { type: 'host-complete', id: 'art' }); const art = structuredClone(s.hosting.results[2]);
  assert.equal(act(s, { type: 'host-tile', cell: 0 }), s);
  s = act(s, { type: 'host-story', value: 'future' }); s = act(s, { type: 'host-complete', id: 'stories' });
  assert.deepEqual(s.hosting.results[2], art); assert.deepEqual(s.hosting.results.map(r => r.value).slice(0, 2), [0, 'pairs']);
  assert.match(hostingResponse('bea', s.hosting), /seeds/); assert.match(hostingResponse('dez', s.hosting), /listening round/);
  assert.match(hostingResponse('celeste', s.hosting), /cool/); assert.match(hostingResponse('thanh', s.hosting), /open seat/);
});
test('later programme revisions and old keepsakes do not rewrite the active gathering or other core state', () => {
  let s = act(opened(), { type: 'photo', participants: ['bea'] }); s.optional = { future: { keep: true } };
  const photo = postcardSVG(s.epilogue.photo), main = progress(s);
  s = begin(s); const frozen = [...s.hosting.order];
  s = published(s, ['stories', 'art', 'pause', 'beats']);
  assert.deepEqual(s.hosting.order, frozen); assert.notDeepEqual(s.programme.published, frozen);
  s = loadSave(serializeSave(s)).state;
  assert.deepEqual(s.hosting.order, frozen); assert.equal(postcardSVG(s.epilogue.photo), photo); assert.deepEqual(progress(s), main); assert.deepEqual(s.optional, { future: { keep: true } });
});
test('v1 restoration bounds malformed hosting data and never discards good main progress', () => {
  const old = JSON.parse(serializeSave(opened())); delete old.core.hosting;
  assert.deepEqual(loadSave(JSON.stringify(old)).state.hosting, initialHosting());
  old.core.hosting = { order: ['stories', 'art', 'beats', 'pause'], results: [{ id: 'stories', value: 'memory' }, { id: 'art', value: { tiles: [0, 1, 2, 0, 1, 2], palette: { toString: 3 } } }, { id: 'beats', value: 255 }], draft: { story: { toString: 3 }, pattern: 999, tiles: [4], palette: 'evil', quiet: null } };
  const loaded = loadSave(JSON.stringify(old)); assert.equal(loaded.recovery, undefined); assert.equal(loaded.state.opened, true); assert.equal(loaded.state.hosting.results.length, 1); assert.deepEqual(loaded.state.hosting.draft, initialHosting().draft);
  old.core.hosting.results = { 0: { id: 'stories', value: 'future' } }; assert.equal(loadSave(JSON.stringify(old)).state.hosting.results.length, 0);
  old.core.opened = false; assert.deepEqual(loadSave(JSON.stringify(old)).state.hosting, initialHosting());
});
test('hosting visitor choices use free outer cells and preserve people, marker, supply and through-route clearances', () => {
  for (const layout of ['table', 'floor']) for (const packing of [false, true]) {
    let s = begin(opened(layout)); if (packing) s = act(s, { type: 'pack' });
    const free = hostingVisitorCells(s);
    const beats = hostingGuests(s.hosting, free); s = act(s, { type: 'host-complete', id: 'beats' });
    const arc = hostingGuests(s.hosting, free); s = act(s, { type: 'host-quiet', value: 'pairs' }); const pairs = hostingGuests(s.hosting, free);
    assert.notDeepEqual(arc, pairs);
    for (const guests of [beats, arc, pairs]) {
      assert.equal(new Set(guests.map(g => `${g.col},${g.row}`)).size, 3);
      for (const guest of guests) {
        assert.ok([0, 4].includes(guest.row)); assert.ok(free.some(p => p.col === guest.col && p.row === guest.row));
        const point = visitorPoint(guest); assert.ok(point.y < 32);
        const body = { left: point.x - 11, right: point.x + 14, top: point.y - 33, bottom: point.y + 9 };
        for (const prop of [{ left: 275, right: 326, top: -81, bottom: -41 }, { left: 506, right: 537, top: -85, bottom: -46 }, { left: 479, right: 493, top: -58, bottom: -46 }]) assert.ok(body.right <= prop.left || body.left >= prop.right || body.bottom <= prop.top || body.top >= prop.bottom, 'visitor body does not cover panels/board/paint case');
        for (const person of NEIGHBORS) assert.ok(Math.hypot(point.x - person.x, point.y - person.y) > 24);
        for (const place of PLACES) assert.ok(Math.hypot(point.x - place.x, point.y - place.y) > 20);
      }
    }
  }
});
test('hosting people and stools stay put through packing and every opening-loan return', () => {
  let s = begin(opened()); s = act(s, { type: 'host-complete', id: 'beats' }); s = act(s, { type: 'host-quiet', value: 'pairs' });
  const before = hostingGuests(s.hosting, hostingVisitorCells(s));
  for (const action of [{ type: 'pack' }, ...['table', 'speaker', 'paint-case'].map(id => ({ type: 'return-loan', id }))]) {
    s = act(s, action); assert.deepEqual(hostingGuests(s.hosting, hostingVisitorCells(s)), before);
  }
});
test('three hosting visitors fit with both frontage cells reserved for every legal supply arrangement', () => {
  let arrangements = 0;
  for (const layout of ['table', 'floor']) {
    const s = opened(layout); s.hosting.order = ['beats', 'pause', 'art', 'stories'];
    s.furniture = {};
    const positions = id => Array.from({ length: 40 }, (_, i) => ({ col: i % 8, row: Math.floor(i / 8) })).filter(p => canPlaceFurniture(s, id, p.col, p.row));
    for (const table of positions('table')) {
      s.furniture = { table };
      for (const seats of positions('seats')) {
        s.furniture = { table, seats };
        for (const speaker of positions('speaker')) {
          s.furniture = { table, seats, speaker };
          const guests = hostingGuests(s.hosting, hostingVisitorCells(s));
          assert.equal(guests.length, 3); assert.equal(guests.some(g => g.row === 0 && [2, 6].includes(g.col)), false); arrangements++;
        }
        s.furniture = { table };
      }
      s.furniture = {};
    }
  }
  assert.ok(arrangements > 1000);
});
test('original tile SVG refuses unsafe palettes/tiles and displays all contributed shapes without external media', () => {
  assert.equal(tilePanelSVG({ tiles: [0, 1, 2, 0, 1, 2], palette: '<script>' }), '');
  const svg = tilePanelSVG(initialHosting().draft); assert.match(svg, /Our six-tile portable panel/); assert.doesNotMatch(svg, /<script|<image|(?:href|src)=|onload/);
});
