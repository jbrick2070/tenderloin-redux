import {chromium} from 'file:///C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {filmFixture} from '../tests/film-fixture.mjs';
import {serializeSave} from '../public/core.js';
import {buildInfo} from '../scripts/build-fingerprint.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),outcomes=[],evidence=[];
try{
 for(const enabled of [false,true,false]){
  const c=await browser.newContext({viewport:{width:390,height:667},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await c.addInitScript(raw=>localStorage.setItem('tenderloin-redux.save.v1',raw),serializeSave(filmFixture('floor')));await p.goto('http://127.0.0.1:4173/');await p.locator('#begin').click();
  await p.locator('#settings-button').click();await p.locator('#voices-enabled').setChecked(enabled);if(enabled)await p.waitForFunction(()=>window.tenderloin.experiment().status==='ready');await p.locator('#close-modal').click();
  await p.locator('#film-shoot').click();for(const id of ['film-start','film-roll','film-clear','film-capture','film-capture','film-capture'])await p.locator('#'+id).click();
  const completed=await p.evaluate(()=>window.tenderloin.snapshot());assert.equal(completed.film.phase,'done');outcomes.push(completed);await p.locator('#film-back').click();
  if(enabled){await p.locator('#voices-button').click();await p.locator('#voices-disable').click();assert.deepEqual(await p.evaluate(()=>window.tenderloin.snapshot()),completed);assert.equal(await p.evaluate(()=>window.tenderloin.experiment().resources),0);}
  assert.deepEqual(errors,[]);evidence.push({enabled,film:'complete with identical actions',stateUnchangedOnDisable:enabled?'verified':'already off',errors});await c.close();
 }
 assert.deepEqual(outcomes[0],outcomes[1]);assert.deepEqual(outcomes[2],outcomes[0]);const output={source:await buildInfo(),browser:await browser.version(),fixture:'rules-generated civic-complete floor state',evidence,comparison:'entire core+optional state exactly equal after film off/on/off; setting is separate',limits:'Not full gameplay-from-start in this supplemental fixture'};await writeFile('artifacts/film-voices-isolation.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output));
}finally{await browser.close()}
