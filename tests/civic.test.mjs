import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyAction as act, loadSave, serializeSave } from '../public/core.js';
import { civicFixture } from './civic-fixture.mjs';
import { initialCivic, restoreCivic, CIVIC_TOPICS, CIVIC_FORMATS, CIVIC_NOTES, civicAvailable, civicResponse, civicConversation, civicPlanSVG } from '../public/civic.js';
const roundtrip = s => loadSave(serializeSave(s)).state;
const withoutCivic = s => { const { civic, ...rest } = s; return rest; };

test('all eight civic choices run and resume every stage in both layouts without changing other progress', () => {
  for (const layout of ['table','floor']) for (const topic of Object.keys(CIVIC_TOPICS)) for (const format of Object.keys(CIVIC_FORMATS)) for (const notes of Object.keys(CIVIC_NOTES)) {
    let s = civicFixture(layout); const before = withoutCivic(s);
    s = roundtrip(act(s, {type:'civic-start'})); assert.equal(s.civic.phase, 'planning');
    for (const [key,value] of Object.entries({topic,format,notes})) s = roundtrip(act(s,{type:'civic-choice',key,value}));
    assert.deepEqual(s.civic.draft,{topic,format,notes});
    s = roundtrip(act(s,{type:'civic-open'})); assert.equal(s.civic.phase,'meeting'); assert.deepEqual(s.civic.result,{topic,format,notes});
    assert.equal(act(s,{type:'civic-choice',key:'topic',value:topic==='repairs'?'access':'repairs'}),s);
    s = roundtrip(act(s,{type:'civic-close'})); assert.equal(s.civic.phase,'done'); assert.deepEqual(withoutCivic(s),before);
    for(const type of ['civic-start','civic-open','civic-close']) assert.equal(act(s,{type}),s,'stale commit cannot reset or advance event');
  }
});
test('civic unlock requires both gatherings, not optional photo, packing or module data', () => {
  const complete = civicFixture(); assert.ok(civicAvailable(complete)); assert.equal(complete.epilogue.packing,false); assert.equal(complete.epilogue.photo.status,'unasked');
  for(const s of [initialState(),{...complete,opened:false},{...complete,hosting:{...complete.hosting,results:complete.hosting.results.slice(0,3)}}]) {
    assert.equal(civicAvailable(s),false);
    for(const type of ['civic-start','civic-choice','civic-open','civic-close']) assert.equal(act(s,{type,key:'topic',value:'access'}),s);
  }
  assert.ok(civicAvailable(roundtrip(act(complete,{type:'pack'}))));
});
test('phase guards, unchanged selection and strict whitelist reject malformed and prototype-key actions', () => {
  const s = act(civicFixture(),{type:'civic-start'});
  for(const action of [{type:'civic-close'},{type:'civic-start'},{type:'civic-choice',key:'topic',value:'repairs'},...['__proto__','constructor','toString',{},null,0].flatMap(value=>[{type:'civic-choice',key:value,value:'repairs'},{type:'civic-choice',key:'topic',value}])]) assert.equal(act(s,action),s);
  const meeting = act(s,{type:'civic-open'}); assert.equal(act(meeting,{type:'civic-open'}),meeting); assert.notEqual(meeting.civic.draft,meeting.civic.result);
});
test('old and corrupt civic saves preserve core/optional data and bound the event to its prerequisite', () => {
  const base = civicFixture(), raw = JSON.parse(serializeSave(base)); delete raw.core.civic;
  assert.deepEqual(loadSave(JSON.stringify(raw)).state.civic,initialCivic());
  for(const civic of [null,{},[],{phase:'__proto__'},{phase:'done',result:{topic:'constructor',format:'circle',notes:'none'}},{phase:'meeting',draft:{topic:{},format:'dropin',notes:'none'},result:{}}]) {
    raw.core.civic=civic; const restored=loadSave(JSON.stringify(raw)); assert.equal(restored.recovery,undefined); assert.deepEqual(withoutCivic(restored.state),withoutCivic(base)); assert.notEqual(restored.state.civic.phase,'done');
  }
  const valid={phase:'done',draft:{topic:'access'},result:{topic:'repairs',format:'dropin',notes:'none',extra:'discard'}};
  assert.deepEqual(restoreCivic(valid,true).result,{topic:'repairs',format:'dropin',notes:'none'}); assert.deepEqual(restoreCivic(valid,true).draft,{topic:'repairs',format:'dropin',notes:'none'});
  assert.deepEqual(restoreCivic(valid,false),initialCivic());
  assert.equal(restoreCivic({...valid,phase:'planning'},true).result,null,'planning drops an unexpected result');
  assert.deepEqual(restoreCivic({...valid,phase:'meeting',draft:{topic:'constructor',format:[],notes:null}},true).draft,{topic:'repairs',format:'dropin',notes:'none'},'committed result replaces corrupt draft');
});
test('committed civic memory survives returns, mural edits and future programme revisions; restart clears it', () => {
  let s=civicFixture(); s=act(s,{type:'photo',participants:['bea']}); const photo=structuredClone(s.epilogue.photo);
  s=act(act(act(s,{type:'civic-start'}),{type:'civic-open'}),{type:'civic-close'}); const memory=structuredClone(s.civic);
  s=act(s,{type:'pack'}); for(const id of ['table','paint-case','speaker']) s=act(s,{type:'return-loan',id});
  s=act(s,{type:'palette',value:'sunset'}); s=act(s,{type:'programme-remove',id:'art'}); s=roundtrip(s);
  assert.deepEqual(s.civic,memory); assert.deepEqual(s.epilogue.photo,photo); assert.deepEqual(initialState().civic,initialCivic());
});
test('fictional conversation, remembered disagreement and original plan reflect committed choices safely', () => {
  let s=act(civicFixture(),{type:'civic-start'}); for(const [key,value] of Object.entries({topic:'access',format:'dropin',notes:'none'}))s=act(s,{type:'civic-choice',key,value}); s=act(act(s,{type:'civic-open'}),{type:'civic-close'});
  assert.match(civicResponse('bea',s.civic),/still want.*repairs/); assert.match(civicResponse('thanh',s.civic),/few minutes/); assert.match(civicResponse('celeste',s.civic),/no meeting notes/); assert.equal(civicResponse('bea',initialCivic()),'');
  assert.equal(civicConversation(s.civic.result).length,4); assert.match(civicConversation(s.civic.result).map(v=>v.text).join(' '),/no sign-up/);
  const svg=civicPlanSVG(s.civic.result); assert.match(svg,/Clear route/); assert.match(svg,/not surveyed/); assert.doesNotMatch(svg,/<script|href=|foreignObject|onload/);
  assert.notEqual(svg,civicPlanSVG({...s.civic.result,format:'circle'})); assert.equal(civicPlanSVG({...s.civic.result,format:'<script>'}),'');
});
