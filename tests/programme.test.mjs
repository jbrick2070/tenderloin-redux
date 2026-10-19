import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyAction as act, progress, LITTER, MOTIFS, serializeSave, loadSave } from '../public/core.js';
import { programmeIssue, programmeTitle, programmeResponse, programmeSVG, restoreProgramme } from '../public/programme.js';
import { postcardSVG } from '../public/keepsake.js';

function opened() {
  let s = act(act(initialState(), { type: 'greet' }), { type: 'layout', value: 'table' });
  for (const [id, col, row] of [['table', 0, 3], ['seats', 2, 0], ['speaker', 5, 0]]) s = act(s, { type: 'furniture', id, col, row });
  for (const item of LITTER) s = act(s, { type: 'tidy', id: item.id });
  MOTIFS.forEach((id, col) => { s = act(s, { type: 'mural', id, col, row: 0 }); });
  return act(act(s, { type: 'soundcheck' }), { type: 'open' });
}
const add = (s, ids) => ids.reduce((state, id) => act(state, { type: 'programme-add', id }), s);
function permutations(ids) { return ids.length ? ids.flatMap(id => permutations(ids.filter(other => other !== id)).map(rest => [id, ...rest])) : [[]]; }

test('all 24 orders allow stories first or a quiet interval between rhythm and later stories', () => {
  const all = permutations(['stories', 'beats', 'art', 'pause']); let accepted = 0;
  for (const order of all) {
    const s = add(opened(), order), published = act(s, { type: 'programme-publish' });
    const expected = order.indexOf('stories') < order.indexOf('beats') || (order.indexOf('beats') < order.indexOf('pause') && order.indexOf('pause') < order.indexOf('stories'));
    assert.equal(!programmeIssue(order), expected);
    assert.deepEqual(published.programme.published, expected ? order : []);
    if (expected) {
      accepted++;
      assert.equal(/open the afternoon/.test(programmeTitle(order)), order[0] === 'stories');
      assert.equal(/Stories first/.test(programmeResponse('bea', order)), order[0] === 'stories');
      assert.equal(/start with a rhythm/.test(programmeResponse('dez', order)), order[0] === 'beats');
      assert.equal(act(published, { type: 'programme-publish' }), published, 'unchanged publication is a no-op');
    }
  }
  assert.equal(accepted, 16);
});
test('project works immediately after opening without packing, and guards every invalid action', () => {
  const fresh = initialState();
  for (const type of ['programme-add', 'programme-remove', 'programme-move', 'programme-publish']) assert.equal(act(fresh, { type, id: 'stories', direction: 1 }), fresh);
  const s = add(opened(), ['beats', 'stories']);
  for (const action of [{ type: 'programme-add', id: 'beats' }, { type: 'programme-add', id: '<script>' }, { type: 'programme-remove', id: 'pause' }, { type: 'programme-move', id: 'beats', direction: -1 }, { type: 'programme-move', id: 'stories', direction: 1 }, { type: 'programme-move', id: 'beats', direction: 2 }, { type: 'programme-publish' }]) assert.equal(act(s, action), s);
  const moved = act(s, { type: 'programme-move', id: 'stories', direction: -1 });
  assert.deepEqual(moved.programme.order, ['stories', 'beats']); assert.deepEqual(s.programme.order, ['beats', 'stories']);
});
test('drafts and published snapshots survive separately; edits do not silently change promises or keepsakes', () => {
  let s = act(opened(), { type: 'photo', participants: ['bea', 'dez'] });
  const photo = postcardSVG(s.epilogue.photo), preparations = progress(s), before = structuredClone(s);
  s = act(add(s, ['stories', 'art', 'beats', 'pause']), { type: 'programme-publish' });
  const posted = [...s.programme.published], response = programmeResponse('bea', posted), svg = programmeSVG(posted);
  s = act(s, { type: 'programme-remove', id: 'stories' });
  assert.deepEqual(s.programme.published, posted); assert.equal(programmeResponse('bea', s.programme.published), response);
  s = loadSave(serializeSave(s)).state;
  assert.deepEqual(s.programme.order, ['art', 'beats', 'pause']); assert.deepEqual(s.programme.published, posted);
  assert.equal(programmeSVG(s.programme.published), svg); assert.equal(postcardSVG(s.epilogue.photo), photo);
  assert.deepEqual(progress(s), preparations); assert.deepEqual(s.optional, before.optional); assert.deepEqual(s.player, before.player);
  s = act(add(s, ['stories']), { type: 'programme-publish' });
  assert.deepEqual(s.programme.published, ['art', 'beats', 'pause', 'stories']);
  assert.notEqual(programmeResponse('bea', s.programme.published), response);
  assert.equal(s.epilogue.packing, false); assert.equal(s.opened, true);
  assert.notEqual(s.programme.order, s.programme.published);
});
test('v1 restoration is additive, bounded, strict for published snapshots and keeps optional JSON', () => {
  const old = JSON.parse(serializeSave(opened())); delete old.core.programme; old.optional = { later: { value: 4 } };
  assert.deepEqual(loadSave(JSON.stringify(old)).state.programme, { order: [], published: [] });
  old.core.programme = { order: ['art', 'art', null, '<img>', 'pause'], published: ['beats', 'stories', 'art', 'pause'] };
  let s = loadSave(JSON.stringify(old)).state;
  assert.deepEqual(s.programme, { order: ['art', 'pause'], published: [] }); assert.deepEqual(s.optional, old.optional);
  old.core.programme.published = ['stories', 'beats', 'art', 'pause', 'stories'];
  assert.deepEqual(loadSave(JSON.stringify(old)).state.programme.published, []);
  old.core.opened = false; s = loadSave(JSON.stringify(old)).state; assert.deepEqual(s.programme, { order: [], published: [] });
  assert.deepEqual(restoreProgramme({ order: Array(500).fill('art'), published: null }, true).order, ['art']);
});
test('poster and responses use only original fixed proposals and require a valid published order', () => {
  assert.equal(programmeSVG(['<script>']), ''); assert.equal(programmeResponse('bea', []), '');
  const svg = programmeSVG(['beats', 'pause', 'art', 'stories']);
  assert.match(svg, /A rhythm, a pause, a story/); assert.match(svg, /Fictional future gathering/);
  assert.doesNotMatch(svg, /<script|<image|(?:href|src)=|onload/);
  assert.match(programmeResponse('celeste', ['beats', 'pause', 'art', 'stories']), /third/);
});
