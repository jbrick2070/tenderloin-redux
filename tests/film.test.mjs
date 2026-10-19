import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyAction as act, serializeSave, loadSave } from '../public/core.js';
import { filmFixture } from './film-fixture.mjs';
import { filmAvailable, initialFilm, restoreFilm, FILM_SHOTS, FILM_FRAMING, FILM_PLANS, filmCaption, filmResponse, filmFrameSVG } from '../public/film.js';
const roundtrip=s=>loadSave(serializeSave(s)).state;
const other=s=>{const {film,...rest}=s;return rest;};
const orders=ids=>ids.length?ids.flatMap(id=>orders(ids.filter(other=>other!==id)).map(rest=>[id,...rest])):[[]];
function plan(s,framing,production,order) {
  s=act(s,{type:'film-start'});
  for(const [key,value]of Object.entries({framing,plan:production}))s=act(s,{type:'film-choice',key,value});
  for(let i=0;i<3;i++)while(s.film.draft.order.indexOf(order[i])>i)s=act(s,{type:'film-move',id:order[i],direction:-1});
  return s;
}
test('all24 film plans in both layouts preserve other progress and reload every capture prefix',()=>{
  for(const layout of ['table','floor'])for(const framing of Object.keys(FILM_FRAMING))for(const production of Object.keys(FILM_PLANS))for(const order of orders(Object.keys(FILM_SHOTS))){
    let s=filmFixture(layout);const before=other(s);s=roundtrip(plan(s,framing,production,order));assert.deepEqual(s.film.draft,{framing,plan:production,order});
    s=roundtrip(act(s,{type:'film-roll'}));assert.equal(s.film.phase,'hold');assert.equal(act(s,{type:'film-capture',id:order[0]}),s,'cannot film before letting neighbor pass');
    s=roundtrip(act(s,{type:'film-clear'}));assert.equal(s.film.phase,'shooting');
    for(let i=0;i<3;i++){
      assert.equal(act(s,{type:'film-capture',id:order[(i+1)%3]}),s,'cannot skip a frame');
      s=roundtrip(act(s,{type:'film-capture',id:order[i]}));assert.deepEqual(s.film.captured,order.slice(0,i+1));assert.equal(act(s,{type:'film-capture',id:order[i]}),s,'stale frame cannot advance');
    }
    assert.equal(s.film.phase,'done');assert.deepEqual(other(s),before);assert.deepEqual(s.film.result,{framing,plan:production,order});
    for(const type of ['film-start','film-roll','film-clear'])assert.equal(act(s,{type}),s);
  }
});
test('film is gated by restored civic completion and never depends on packing/photo or experimental data',()=>{
  assert.equal(filmAvailable(initialState()),false);const complete=filmFixture();assert.ok(filmAvailable(complete));assert.equal(complete.epilogue.packing,false);assert.equal(complete.epilogue.photo.status,'unasked');
  for(const s of [initialState(),roundtrip({...complete,civic:{...complete.civic,phase:'meeting'}}),roundtrip({...complete,hosting:{...complete.hosting,results:complete.hosting.results.slice(0,3)}})])for(const type of ['film-start','film-roll','film-clear','film-capture'])assert.equal(act(s,{type,id:'seat'}),s);
});
test('strict action and phase guards reject prototype keys, types, reorder bounds, unchanged and post-commit edits',()=>{
  let s=act(filmFixture(),{type:'film-start'});
  for(const a of [{type:'film-choice',key:'framing',value:'close'},{type:'film-clear'},{type:'film-capture',id:'seat'},{type:'film-move',id:'seat',direction:-1},...['__proto__','constructor',null,{},[],3,true].flatMap(value=>[{type:'film-choice',key:'framing',value},{type:'film-choice',key:value,value:'wide'},{type:'film-move',id:value,direction:1},{type:'film-move',id:'seat',direction:value}])])assert.equal(act(s,a),s);
  s=act(s,{type:'film-roll'});assert.notEqual(s.film.draft,s.film.result);assert.notEqual(s.film.draft.order,s.film.result.order);
  for(const type of ['film-choice','film-move','film-roll'])assert.equal(act(s,{type,key:'framing',value:'wide',id:'seat',direction:1}),s);
});
test('old/corrupt saves and forged completion are bounded without resetting other valid state',()=>{
  const s=filmFixture(),raw=JSON.parse(serializeSave(s));delete raw.core.film;assert.deepEqual(loadSave(JSON.stringify(raw)).state.film,initialFilm());
  for(const film of [null,[],{phase:'__proto__'},{phase:'done',result:{framing:'constructor',plan:'quiet',order:['seat','paint','welcome']},captured:['seat','paint','welcome']}]){
    raw.core.film=film;const result=loadSave(JSON.stringify(raw));assert.equal(result.recovery,undefined);assert.deepEqual(other(result.state),other(s));assert.notEqual(result.state.film.phase,'done');
  }
  const result={framing:'wide',plan:'later',order:['paint','welcome','seat'],extra:'strip'};
  const partial=restoreFilm({phase:'done',draft:{framing:'bad'},result,captured:['paint','seat','welcome','paint']},true);
  assert.equal(partial.phase,'shooting');assert.deepEqual(partial.captured,['paint']);assert.deepEqual(partial.draft,{framing:'wide',plan:'later',order:['paint','welcome','seat']});
  assert.deepEqual(restoreFilm({phase:'hold',result,captured:result.order},true).captured,[]);
  assert.equal(restoreFilm({phase:'planning',result,captured:result.order},true).result,null);
  assert.deepEqual(restoreFilm({phase:'done',result,captured:result.order},false),initialFilm());
});
test('completed film memory is copied and survives later mural/returns/programme choices, restart clears it',()=>{
  let s=plan(filmFixture(),'wide','later',['welcome','paint','seat']);s=act(s,{type:'photo',participants:['bea']});const photo=structuredClone(s.epilogue.photo);
  s=act(act(s,{type:'film-roll'}),{type:'film-clear'});for(const id of s.film.result.order)s=act(s,{type:'film-capture',id});const film=structuredClone(s.film);
  s=act(s,{type:'pack'});for(const id of ['table','paint-case','speaker'])s=act(s,{type:'return-loan',id});s=act(s,{type:'palette',value:'sunset'});s=act(s,{type:'programme-remove',id:'art'});s=roundtrip(s);
  assert.deepEqual(s.film,film);assert.deepEqual(s.epilogue.photo,photo);assert.deepEqual(initialState().film,initialFilm());assert.match(filmResponse('rook',film),/out of the picture/);assert.match(filmResponse('bea',film),/waited/);assert.match(filmResponse('dez',film),/empty seat/);
});
test('original static frames, captions and consent responses vary safely without recorded media or input',()=>{
  const p={framing:'close',plan:'quiet',order:['seat','paint','welcome']};
  assert.notEqual(filmFrameSVG(p,'seat'),filmFrameSVG({...p,framing:'wide'},'seat'));assert.notEqual(filmFrameSVG(p,'seat'),filmFrameSVG(p,'paint'));assert.notEqual(filmCaption(p,'seat'),filmCaption({...p,plan:'later'},'seat'));
  for(const id of p.order){const svg=filmFrameSVG(p,id);assert.match(svg,/original illustrated frame/);assert.doesNotMatch(svg,/<script|href=|foreignObject|onload|Rook|<image/);}
  assert.equal(filmFrameSVG({...p,framing:'<img>'},'seat'),'');assert.equal(filmCaption(p,'constructor'),'');assert.equal(filmResponse('rook',initialFilm()),'');
});
