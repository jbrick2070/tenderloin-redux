import { chromium } from 'file:///C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {civicFixture} from '../tests/civic-fixture.mjs';
import {serializeSave} from '../public/core.js';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();await c.addInitScript(raw=>localStorage.setItem('tenderloin-redux.save.v1',raw),serializeSave(civicFixture('floor')));
await p.goto('http://127.0.0.1:4173/');await p.locator('#begin').click();await p.locator('#journal-button').click();await p.locator('#journal-civic').click();await p.locator('#civic-start').dblclick();await p.locator('#civic-topic-access').dispatchEvent('click',{detail:2});
for(const id of ['civic-topic-repairs','civic-format-circle','civic-notes-none']){await p.locator('#'+id).focus();await p.keyboard.press('Enter');}
const results=[];const snap=()=>p.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),t=document.querySelector('#civic-hour'),q=t.getBoundingClientRect();return {active:e.id,rect:{top:r.top,bottom:r.bottom},target:{top:q.top,bottom:q.bottom,height:q.height},scrollY,viewport:innerHeight,modal:document.querySelector('#modal').open}});
results.push({before:await snap()});await p.locator('#civic-back').click();results.push({immediate:await snap()});await p.waitForTimeout(1000);results.push({after:await snap()});await p.screenshot({path:'artifacts/civic-focus-diagnosis.png'});await writeFile('artifacts/civic-focus-diagnosis.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close()}
