import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialEpilogue, applyAction as act, progress, ready, LITTER, MOTIFS, LOANS, PHOTO_GUESTS, serializeSave, loadSave } from '../public/core.js';
import { postcardSVG, PHOTO_RESPONSES } from '../public/keepsake.js';

function opened(layout = 'table') {
  let state = act(initialState(), { type: 'greet' }); state = act(state, { type: 'layout', value: layout });
  for (const [id, col, row] of [['table', 0, 3], ['seats', 2, 0], ['speaker', 5, 0]]) state = act(state, { type: 'furniture', id, col, row });
  for (const item of LITTER) state = act(state, { type: 'tidy', id: item.id });
  MOTIFS.forEach((id, col) => { state = act(state, { type: 'mural', id, col, row: 0 }); });
  return act(act(state, { type: 'soundcheck' }), { type: 'open' });
}
test('the ending is optional: skip photo, pack and return loans without changing core completion', () => {
  for (const layout of ['table', 'floor']) {
    let state = opened(layout); const before = progress(state);
    assert.equal(ready(state), true); assert.deepEqual(state.epilogue, initialEpilogue());
    state = act(state, { type: 'skip-photo' }); state = act(state, { type: 'pack' });
    for (const loan of [...LOANS].reverse()) state = act(state, { type: 'return-loan', id: loan.id });
    assert.equal(state.epilogue.returned.length, 3); assert.equal(state.epilogue.photo.status, 'skipped');
    assert.deepEqual(progress(state), before); assert.equal(state.opened, true);
    const restored = loadSave(serializeSave(state)).state;
    assert.equal(restored.opened, true); assert.equal(restored.epilogue.returned.length, 3); assert.equal(restored.epilogue.photo.status, 'skipped');
  }
});
test('packing and keepsakes cannot be created before the gathering, and returns need packing', () => {
  const before = initialState();
  for (const action of [{ type: 'pack' }, { type: 'photo', participants: ['bea'] }, { type: 'return-loan', id: 'table' }, { type: 'skip-photo' }]) assert.equal(act(before, action), before);
  const live = opened(); assert.equal(act(live, { type: 'return-loan', id: 'table' }), live);
  const packed = act(live, { type: 'pack' }); assert.equal(act(packed, { type: 'photo', participants: ['bea'] }), packed);
});
test('returns are whitelisted and idempotent, and a partial lap survives reload', () => {
  let state = act(opened(), { type: 'pack' }); assert.equal(act(state, { type: 'return-loan', id: 'personal-bag' }), state);
  state = act(state, { type: 'return-loan', id: 'speaker' }); state = act(state, { type: 'return-loan', id: 'speaker' });
  assert.deepEqual(state.epilogue.returned, ['speaker']);
  state = loadSave(serializeSave(state)).state; assert.deepEqual(state.epilogue.returned, ['speaker']);
  assert.equal(state.epilogue.packing, true); assert.equal(state.opened, true);
});
test('only consenting guests can be pictured; a skipped keepsake can be reconsidered before packing', () => {
  let state = opened();
  assert.equal(PHOTO_RESPONSES.find(person => person.id === 'rook').agrees, false);
  assert.deepEqual(PHOTO_RESPONSES.filter(person => person.agrees).map(person => person.id).sort(), [...PHOTO_GUESTS].sort());
  for (const participants of [[], ['rook'], ['bea', 'rook'], ['unknown'], null, 'bea']) assert.equal(act(state, { type: 'photo', participants }), state);
  state = act(state, { type: 'skip-photo' }); state = act(state, { type: 'photo', participants: ['bea', 'bea', 'dez'] });
  assert.deepEqual(state.epilogue.photo.participants, ['bea', 'dez']);
  assert.equal(act(state, { type: 'photo', participants: ['thanh'] }), state, 'a saved memory is not silently replaced');
});
test('keepsake freezes mural/palette/layout and preserves that snapshot after later edits and reload', () => {
  let state = act(opened('floor'), { type: 'photo', participants: ['bea', 'celeste'] }); const memory = structuredClone(state.epilogue.photo);
  state = act(state, { type: 'palette', value: 'ocean' }); state = act(state, { type: 'mural', id: 'sun', col: 5, row: 2 });
  assert.notDeepEqual(state.mural, memory.mural); assert.deepEqual(state.epilogue.photo, memory);
  state = loadSave(serializeSave(state)).state; assert.deepEqual(state.epilogue.photo, memory);
  const svg = postcardSVG(state.epilogue.photo); assert.match(svg, /data-guest="bea"/); assert.match(svg, /data-guest="celeste"/);
  assert.doesNotMatch(svg, /data-guest="rook"|data-guest="dez"|data-guest="thanh"/);
  assert.doesNotMatch(svg, /<script|<image|\s(?:href|src)=/);
});
test('old saves gain empty optional ending state; malformed ending data cannot undo valid main progress', () => {
  const legacy = JSON.parse(serializeSave(opened())); delete legacy.core.epilogue;
  assert.deepEqual(loadSave(JSON.stringify(legacy)).state.epilogue, initialEpilogue());
  for (const epilogue of [null, 'broken', { packing: true, returned: ['speaker', 'speaker', 'not-a-loan'], photo: { status: 'taken', participants: ['rook'] } }]) {
    legacy.core.epilogue = epilogue; const result = loadSave(JSON.stringify(legacy));
    assert.equal(result.state.opened, true); assert.equal(ready(result.state), true); assert.ok(!result.recovery);
    assert.notEqual(result.state.epilogue.photo.status, 'taken'); assert.ok(result.state.epilogue.returned.length <= 1);
  }
  legacy.core.opened = false; legacy.core.epilogue = { packing: true, returned: ['table'] };
  assert.deepEqual(loadSave(JSON.stringify(legacy)).state.epilogue, initialEpilogue());
});
test('renderer refuses a fabricated non-consenting participant or unsafe palette', () => {
  const memory = act(opened(), { type: 'photo', participants: ['bea'] }).epilogue.photo;
  assert.equal(postcardSVG({ ...memory, participants: ['rook'] }), '');
  assert.equal(postcardSVG({ ...memory, palette: '<script>' }), '');
  assert.equal(postcardSVG({ ...memory, mural: { sun: memory.mural.sun } }), '');
  assert.equal(postcardSVG({ ...memory, mural: { ...memory.mural, wave: memory.mural.sun } }), '');
});
test('loan completion has a stable canonical representation before and after reload', () => {
  let state = act(opened(), { type: 'pack' });
  for (const id of ['speaker', 'table', 'paint-case']) {
    state = act(state, { type: 'return-loan', id });
    assert.deepEqual(loadSave(serializeSave(state)).state.epilogue, state.epilogue);
  }
});
