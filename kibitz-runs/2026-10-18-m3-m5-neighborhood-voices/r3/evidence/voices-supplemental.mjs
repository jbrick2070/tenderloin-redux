import {chromium} from 'file:///C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {initialState,applyAction as act,LITTER,MOTIFS,serializeSave} from '../public/core.js';
import {buildInfo} from '../scripts/build-fingerprint.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
let s=act(act(initialState(),{type:'greet'}),{type:'layout',value:'floor'});
for(const [id,col,row] of [['table',0,3],['seats',2,0],['speaker',5,0]])s=act(s,{type:'furniture',id,col,row});
for(const item of LITTER)s=act(s,{type:'tidy',id:item.id});MOTIFS.forEach((id,col)=>s=act(s,{type:'mural',id,col,row:0}));s=act(act(s,{type:'soundcheck'}),{type:'open'});
for(const id of ['art','stories','beats','pause'])s=act(s,{type:'programme-add',id});s=act(act(s,{type:'programme-publish'}),{type:'host-start'});s.optional={future:{unrecognized:'preserve'}};
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const width of [320,390,1440]){
 const c=await browser.newContext({viewport:{width,height:844},isMobile:width<400,hasTouch:width<400,reducedMotion:'reduce'});
 await c.addInitScript(raw=>{if(!localStorage.getItem('tenderloin-redux.save.v1'))localStorage.setItem('tenderloin-redux.save.v1',raw)},serializeSave(s));
 const p=await c.newPage(),errors=[],external=[],optional=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/experiments/'))optional.push(r.url());if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:4173/'))external.push(r.url())});
 await p.goto('http://127.0.0.1:4173/');await p.locator('#begin').click();const before=await p.evaluate(()=>window.tenderloin.snapshot());assert.equal(optional.length,0);
 await p.locator('#settings-button').click();await p.locator('#voices-enabled').check();await p.waitForFunction(()=>window.tenderloin.experiment().status==='ready');await p.locator('#close-modal').click();await p.locator('#voices-button').click();
 assert.equal(await p.evaluate(()=>document.activeElement.id),'modal-title');assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.screenshot({path:`artifacts/voices-${width}-top.png`,fullPage:true});
 await p.locator('.voices-cards a').last().focus();await p.locator('.voices-cards a').last().scrollIntoViewIfNeeded();const box=await p.locator('.voices-cards a').last().boundingBox();assert.ok(box.height>=44);
 await p.screenshot({path:`artifacts/voices-${width}-sources.png`,fullPage:true});
 if(width===1440){
  await p.evaluate(()=>{window.qaRestored=null;addEventListener('pageshow',event=>{window.qaRestored=event.persisted})});
  await p.goto('http://127.0.0.1:4173/icon.svg');await p.goBack({waitUntil:'domcontentloaded'});if(await p.locator('#begin').isVisible())await p.locator('#begin').click();await p.waitForFunction(()=>window.tenderloin.experiment().status==='ready');
  results.push({navigationRestore:await p.evaluate(()=>window.qaRestored===true?'observed BFCache pageshow persisted=true':'full-reload navigation path'),preference:'on remains on; module returns ready'});
  if(await p.locator('#modal').evaluate(e=>e.open))await p.locator('#close-modal').click();await p.locator('#voices-button').click();
 }
 await p.locator('#voices-disable').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'voices-enabled');assert.equal(await p.locator('#voices-enabled').isChecked(),false);assert.deepEqual(await p.evaluate(()=>window.tenderloin.snapshot()),before);
 assert.deepEqual(await p.evaluate(()=>window.tenderloin.experiment()),{enabled:false,status:'off',resources:0,audio:0,cleanupErrors:0});assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 results.push({width,height:844,fixture:'rules-generated open-floor/partial second gathering and bounded unknown optional JSON',overflow:false,offRequests:0,sourceLinks:3,sourceControlHeight:box.height,offCleanup:'zero resources/audio; core+optional unchanged',errors,external});await c.close();
}await writeFile('artifacts/voices-supplemental.json',JSON.stringify({at:new Date().toISOString(),source:await buildInfo(),browser:await browser.version(),results,limits:'Chrome/touch emulation, not physical phone, screen-reader/human feedback, current service availability, actual voice or acoustic latency.'},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
