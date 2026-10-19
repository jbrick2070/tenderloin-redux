import { chromium } from 'file:///C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { civicFixture } from '../tests/civic-fixture.mjs';
import { serializeSave } from '../public/core.js';
import { buildInfo } from '../scripts/build-fingerprint.mjs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext({viewport:{width:390,height:667},reducedMotion:'reduce'}),page=await context.newPage();
  await context.addInitScript(raw=>localStorage.setItem('tenderloin-redux.save.v1',raw),serializeSave(civicFixture('floor')));
  await page.goto('http://127.0.0.1:4173/');await page.locator('#begin').click();await page.locator('#civic-hour').click();await page.locator('#civic-start').click();
  const results=[];
  for(const id of ['civic-topic-access','civic-format-dropin','civic-notes-none']) {
    await page.locator('#'+id).click();const check=await page.evaluate(()=>{const r=document.activeElement.getBoundingClientRect();return {id:document.activeElement.id,visible:r.top>=0&&r.bottom<=innerHeight,overflow:document.querySelector('#modal').scrollWidth>document.querySelector('#modal').clientWidth};});
    assert.equal(check.visible,true);assert.equal(check.overflow,false);results.push(check);
  }
  await page.locator('#civic-open').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'modal-title');await page.screenshot({path:'artifacts/civic-short-meeting-390.png'});
  await page.locator('#civic-close').click();await page.screenshot({path:'artifacts/civic-short-memory-390.png'});
  await page.locator('#civic-back').click();await page.waitForFunction(()=>document.activeElement.id==='civic-hour');
  const receipt={source:await buildInfo(),browser:await browser.version(),viewport:{width:390,height:667},results,completion:true,focusReturn:true,scope:'Rules-generated completed second-gathering fixture, real UI; short viewport emulation, not physical phone'};
  await writeFile('artifacts/civic-short-viewport.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
} finally {await browser.close();}
