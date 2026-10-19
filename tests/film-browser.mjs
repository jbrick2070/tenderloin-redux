// Real UI from rules-generated civic-complete fixtures, not a runtime quest bypass.
import assert from 'node:assert/strict';
import { mkdir,writeFile,rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { filmFixture } from './film-fixture.mjs';
import { serializeSave } from '../public/core.js';
import { FILM_SHOTS } from '../public/film.js';
import { buildInfo } from '../scripts/build-fingerprint.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
await mkdir('artifacts',{recursive:true});await rm('artifacts/film-browser-results.json',{force:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
process.on('exit',()=>server.kill());let browser;
const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('QA server timeout: '+output)),10000);server.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});server.stderr.on('data',chunk=>output+=chunk);server.on('error',reject);server.on('exit',code=>{clearTimeout(timer);reject(Error(`QA server exit ${code}: ${output}`));});});
const snap=p=>p.evaluate(()=>window.tenderloin.snapshot());
const other=s=>{const {film,...rest}=s;return rest;};
async function start(p){await p.goto(base);await p.locator('#begin').click();await p.waitForFunction(()=>!!window.tenderloin);assert.equal(await p.evaluate(()=>window.tenderloin.version),(await buildInfo()).version);}
async function reload(p){await p.reload();await p.locator('#begin').click();await p.waitForFunction(()=>!!window.tenderloin);}
async function bounds(p){
 assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok((await p.locator('#film-view button').evaluateAll(nodes=>nodes.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})))).every(r=>r.width>=44&&r.height>=44));
 assert.equal(await p.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return document.querySelector('#modal').contains(e)&&r.top>=0&&r.bottom<=innerHeight;}),true,'focused control/heading visible');
}
async function returned(p){await p.waitForFunction(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return e.id==='film-shoot'&&r.top>=0&&r.bottom<=innerHeight;});}
const permutations=ids=>ids.length?ids.flatMap(id=>permutations(ids.filter(x=>x!==id)).map(rest=>[id,...rest])):[[]];
const all=['close','wide'].flatMap(framing=>['quiet','later'].flatMap(plan=>permutations(Object.keys(FILM_SHOTS)).map(order=>({framing,plan,order}))));
const selected=[0,3,7,10,13,16,20,23].map(i=>all[i]);const results=[];
try{
 assert.deepEqual(await(await fetch(base+'/__build')).json(),await buildInfo());browser=await chromium.launch({channel:'chrome',headless:true});
 const earlyContext=await browser.newContext(),early=await earlyContext.newPage();await start(early);assert.equal(await early.locator('#film-shoot').count(),0);await early.locator('#journal-button').click();assert.equal(await early.locator('#journal-film').count(),0);await earlyContext.close();
 for(const [i,choice]of selected.entries()){
  const viewport=[{width:320,height:844},{width:390,height:667},{width:1440,height:844}][i%3],layout=i%2?'floor':'table';
  const c=await browser.newContext({viewport,reducedMotion:'reduce'}),p=await c.newPage(),errors=[],external=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  await c.addInitScript(raw=>{if(!localStorage.getItem('tenderloin-redux.save.v1'))localStorage.setItem('tenderloin-redux.save.v1',raw);},serializeSave(filmFixture(layout)));
  await start(p);const before=await snap(p);await p.locator('#journal-button').click();await p.locator('#journal-film').click();await bounds(p);assert.equal((await snap(p)).film.phase,'idle');
  await p.locator('#film-start').dblclick();await p.locator('#film-framing-wide').dispatchEvent('click',{detail:2});assert.equal((await snap(p)).film.draft.framing,'close');
  const original=await p.locator('.film-picture img').getAttribute('src');
  for(const [key,value]of Object.entries({framing:choice.framing,plan:choice.plan})){const target=p.locator(`#film-${key}-${value}`),label=await target.textContent();await target.focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#modal-status').textContent(),`${label} selected.`);assert.equal(await p.locator('#film-view [role=status]').count(),0);await bounds(p);}
  if(choice.framing==='wide')assert.notEqual(await p.locator('.film-picture img').getAttribute('src'),original);
  for(let j=0;j<3;j++)while((await snap(p)).film.draft.order.indexOf(choice.order[j])>j){await p.locator(`#film-up-${choice.order[j]}`).focus();await p.keyboard.press('Enter');await bounds(p);}
  await p.locator('#film-back').click();await returned(p);await reload(p);assert.deepEqual((await snap(p)).film.draft,choice);await p.locator('#film-shoot').click();
  await p.locator('#film-roll').dblclick();assert.equal((await snap(p)).film.phase,'hold');assert.equal(await p.locator('#film-capture').count(),0);assert.match(await p.locator('#film-hold').textContent(),/Thanh.*through-route/);await bounds(p);
  await p.locator('#film-back').dispatchEvent('click',{detail:2});assert.equal(await p.locator('#modal').evaluate(e=>e.open),true);await p.keyboard.press('Escape');await returned(p);await reload(p);assert.equal((await snap(p)).film.phase,'hold');await p.locator('#film-shoot').click();
  await p.locator('#film-clear').dblclick();assert.equal((await snap(p)).film.captured.length,0,'clear continuation cannot capture');
  for(let frame=0;frame<3;frame++){
   assert.match(await p.locator('#film-view').textContent(),new RegExp(FILM_SHOTS[choice.order[frame]].label));await bounds(p);await p.locator('#film-capture').dblclick();assert.equal((await snap(p)).film.captured.length,frame+1,'capture continuation cannot advance twice');assert.equal(await p.locator('#modal-status').textContent(),frame===2?'All three shots kept. Your screening is ready.':`Shot ${frame+1} kept. Next: shot ${frame+2} of 3.`);
   if(frame===0){await p.locator('#film-back').click();await returned(p);await reload(p);assert.deepEqual((await snap(p)).film.captured,[choice.order[0]]);await p.locator('#film-shoot').click();}
  }
  assert.equal((await snap(p)).film.phase,'done');await p.locator('#film-back').dispatchEvent('click',{detail:2});assert.equal(await p.locator('#modal').evaluate(e=>e.open),true);await bounds(p);
  const finished=await snap(p),images=[];for(let frame=0;frame<3;frame++){await p.locator(`#film-frame-${frame}`).focus();await p.keyboard.press('Enter');await bounds(p);images.push(await p.locator('.film-picture img').getAttribute('src'));assert.equal(await p.locator('#modal-status').textContent(),`Frame ${frame+1} of 3.`);}
  assert.equal(new Set(images).size,3);assert.deepEqual(await snap(p),finished,'screening is read-only');assert.deepEqual(other(finished),other(before));assert.equal(await p.locator('#film-view input,#film-view video,#film-view audio,#film-view canvas').count(),0);
  await p.screenshot({path:`artifacts/film-screening-${i}-${viewport.width}.png`});await p.locator('#close-modal').click();await returned(p);await reload(p);assert.equal((await snap(p)).film.phase,'done');await p.locator('#journal-button').click();await p.locator('#journal-film').click();await p.locator('#film-memory').waitFor();await bounds(p);await p.locator('#film-back').click();await returned(p);
  if(i===0){await p.locator('#neighbors-button').click();await p.locator('#neighbor-rook').click();await p.waitForFunction(()=>document.querySelector('#modal-title')?.textContent==='Rook');assert.match(await p.locator('.programme-response').textContent(),/stayed out of the picture/);await p.locator('#close-modal').click();await p.locator('#settings-button').click();await p.locator('#restart').click();await p.locator('#confirm-restart').click();assert.equal((await snap(p)).film.phase,'idle');assert.equal(await p.locator('#film-shoot').count(),0);}
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({...choice,viewport,layout,stages:'planning/hold/partial capture/done reload pass',focus:'native keyboard edits/order/screening, persistent status, visible Back/Escape/x return',doubleClick:'phase/capture plus deterministic replacement controls rejected',preservation:'other state unchanged; viewer read-only; Rook consent enforced in original frames',errors,external});await c.close();
 }
 const output={at:new Date().toISOString(),source:await buildInfo(),browser:await browser.version(),coverage:'8 representative plans covering all6orders/all4framing-plan pairs, distributed across320x844/390x667/1440x844 and both layouts; unit tests cover all24plans in both layouts',fixtures:'rules-generated civic-complete state; civic suite separately completes actual civic UI and verifies film unlock',results,limits:'No physical phone/full screen-reader/human pacing, actual movie recording, real production consent/permit or current surveyed access certification'};
 await writeFile('artifacts/film-browser-results.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
}finally{await browser?.close();server.kill();}
