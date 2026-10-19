import { initialState, applyAction as act, LITTER, MOTIFS } from '../public/core.js';
export function civicFixture(layout = 'table') {
  let s = act(act(initialState(), { type: 'greet' }), { type: 'layout', value: layout });
  for (const [id,col,row] of [['table',0,3],['seats',2,0],['speaker',5,0]]) s = act(s, { type: 'furniture', id,col,row });
  for (const item of LITTER) s = act(s, { type: 'tidy', id: item.id });
  for (const [col,id] of MOTIFS.entries()) s = act(s, { type: 'mural', id,col,row:0 });
  s = act(act(s, { type: 'soundcheck' }), { type: 'open' });
  for (const id of ['stories','beats','art','pause']) s = act(s, { type: 'programme-add', id });
  s = act(act(s, { type: 'programme-publish' }), { type: 'host-start' });
  for (const id of s.hosting.order) s = act(s, { type: 'host-complete', id });
  s.optional = { future: { preserved: [true,'bounded optional data'] } };
  return s;
}
