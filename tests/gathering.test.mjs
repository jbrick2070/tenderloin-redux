import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyAction as act, LITTER, MOTIFS, serializeSave, loadSave, occupiedCells, canPlaceFurniture } from '../public/core.js';
import { gatheringScene, gatheringPlanSVG, guestMotion, visitorPoint } from '../public/gathering.js';
import { NEIGHBORS, PLACES } from '../public/world.js';

function prepared(layout, placements = [['table', 0, 3], ['seats', 2, 0], ['speaker', 5, 0]]) {
  let state = act(initialState(), { type: 'greet' }); state = act(state, { type: 'layout', value: layout });
  for (const [id, col, row] of placements) state = act(state, { type: 'furniture', id, col, row });
  for (const item of LITTER) state = act(state, { type: 'tidy', id: item.id });
  MOTIFS.forEach((id, col) => { state = act(state, { type: 'mural', id, col, row: 0 }); });
  return act(state, { type: 'soundcheck' });
}
test('opening visibly distinguishes conversation from movement without changing the save', () => {
  for (const layout of ['table', 'floor']) {
    let state = prepared(layout); assert.equal(gatheringScene(state).guests.length, 0);
    state = act(state, { type: 'open' }); const before = serializeSave(state), scene = gatheringScene(state);
    assert.equal(scene.phase, 'open'); assert.equal(scene.guests.length, 3);
    assert.ok(scene.guests.every(g => g.pose === (layout === 'table' ? 'talk' : 'dance')));
    const svg = gatheringPlanSVG(scene); assert.match(svg, /KEEP THIS ROUTE CLEAR/);
    assert.equal((svg.match(/data-pose=/g) || []).length, 3);
    assert.equal(serializeSave(state), before); assert.deepEqual(gatheringScene(loadSave(before).state), scene);
  }
});
test('visitor footprints avoid supplies, through-route and authored bike edge for representative arrangements', () => {
  for (const layout of ['table', 'floor']) for (const placements of [undefined, [['table', 6, 0], ['seats', 0, 4], ['speaker', 3, 3]], [['table', 0, 0], ['seats', 4, 4], ['speaker', 6, 3]]]) {
    const state = act(prepared(layout, placements), { type: 'open' }), scene = gatheringScene(state);
    assert.equal(state.opened, true); assert.equal(scene.guests.length, 3);
    const occupied = new Set(scene.items.flatMap(i => i.cells.map(p => `${p.col},${p.row}`)));
    assert.equal(new Set(scene.guests.map(g => `${g.col},${g.row}`)).size, 3);
    for (const g of scene.guests) {
      assert.ok([0, 4].includes(g.row)); assert.equal(occupied.has(`${g.col},${g.row}`), false);
      const ground = -32 + g.row * 12;
      assert.ok(ground + 4 + 5 < -10 || ground + 4 - 5 > 2, 'shadow clears the authored through-route');
      assert.ok(ground + 4 + 5 < 27.5, 'shadow stays above the authored bike-edge band');
    }
  }
});
test('moving the table changes conversation positions and plan uses actual two-cell footprints', () => {
  const near = gatheringScene(act(prepared('table'), { type: 'open' }));
  const far = gatheringScene(act(prepared('table', [['table', 6, 4], ['seats', 2, 0], ['speaker', 5, 0]]), { type: 'open' }));
  assert.notDeepEqual(near.guests, far.guests);
  for (const layout of ['table', 'floor']) {
    const state = prepared(layout), scene = gatheringScene(state);
    for (const item of scene.items) assert.deepEqual(item.cells, occupiedCells(item.id, state.furniture[item.id], layout));
  }
});
test('packing removes visitors and folded seats; partial and final returns keep plan truthful', () => {
  let state = act(act(prepared('floor'), { type: 'open' }), { type: 'pack' });
  let scene = gatheringScene(state); assert.equal(scene.guests.length, 0); assert.deepEqual(scene.items.map(i => i.id), ['table', 'speaker']);
  for (const id of ['speaker', 'table']) state = act(state, { type: 'return-loan', id });
  scene = gatheringScene(state); assert.equal(scene.items.length, 0); assert.match(scene.caption, /paint case still needs returning/);
  state = act(state, { type: 'return-loan', id: 'paint-case' }); assert.match(gatheringScene(state).caption, /supplies are home/);
});
test('reduced motion freezes dancing and conversation stays still', () => {
  const dance = { pose: 'dance', col: 3 }, talk = { pose: 'talk', col: 3 };
  assert.notEqual(guestMotion(dance, 1, false), guestMotion(dance, 2, false));
  assert.equal(guestMotion(dance, 1, true), 0); assert.equal(guestMotion(dance, 2, true), 0);
  assert.equal(guestMotion(talk, 1, false), 0);
  assert.deepEqual(gatheringScene(initialState()).guests, []);
});
test('visitors stay clear of named residents and markers for every legal table position', () => {
  const cells = Array.from({ length: 5 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ col, row }))).flat();
  for (const layout of ['table', 'floor']) for (const p of cells) {
    let partial = act(act(initialState(), { type: 'greet' }), { type: 'layout', value: layout });
    if (!canPlaceFurniture(partial, 'table', p.col, p.row)) continue;
    partial = act(partial, { type: 'furniture', id: 'table', ...p }); const placements = [['table', p.col, p.row]];
    for (const id of ['seats', 'speaker']) {
      const cell = cells.find(c => canPlaceFurniture(partial, id, c.col, c.row));
      partial = act(partial, { type: 'furniture', id, ...cell }); placements.push([id, cell.col, cell.row]);
    }
    const scene = gatheringScene(act(prepared(layout, placements), { type: 'open' }));
    assert.equal(scene.guests.length, 3);
    for (const g of scene.guests) {
      const point = visitorPoint(g);
      for (const object of [...NEIGHBORS, ...PLACES]) assert.ok(Math.hypot(point.x - object.x, point.y - object.y) >= 28, `${layout} ${g.col},${g.row} overlaps ${object.id}`);
    }
  }
});
test('SVG text and attribute strings are XML escaped', () => {
  const scene = gatheringScene(prepared('table'));
  scene.title = 'Stories & <ideas>'; scene.caption = 'A "shared" afternoon'; scene.items[0].label = 'Table <&>';
  const svg = gatheringPlanSVG(scene);
  assert.match(svg, /Stories &amp; &lt;ideas&gt;/); assert.match(svg, /&quot;shared&quot;/);
  assert.match(svg, /Table &lt;&amp;&gt;/); assert.doesNotMatch(svg, /<ideas>/);
});
