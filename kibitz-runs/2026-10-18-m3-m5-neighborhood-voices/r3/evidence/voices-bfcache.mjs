import {chromium} from 'file:///C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import {buildInfo} from '../scripts/build-fingerprint.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--disable-back-forward-cache']});
try{
 const c=await browser.newContext({reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4173/');await p.locator('#begin').click();await p.locator('#settings-button').click();await p.locator('#voices-enabled').check();await p.waitForFunction(()=>window.tenderloin.experiment().status==='ready');await p.locator('#close-modal').click();await p.locator('#voices-button').click();
 const before=await p.evaluate(()=>window.tenderloin.snapshot());await p.evaluate(()=>{window.qaPersisted=false;addEventListener('pageshow',e=>{window.qaPersisted=e.persisted})});
 await p.goto('http://127.0.0.1:4173/icon.svg');await p.goBack({waitUntil:'commit'});if(await p.locator('#begin').isVisible())await p.locator('#begin').click();await p.waitForFunction(()=>window.tenderloin.experiment().status==='ready');
 const persisted=await p.evaluate(()=>window.qaPersisted===true);assert.deepEqual(await p.evaluate(()=>window.tenderloin.snapshot()),before);assert.deepEqual(errors,[]);
 await p.locator('#voices-button').click();assert.equal(await p.locator('.voices-cards article').count(),3);await p.locator('#voices-disable').click();assert.equal(await p.evaluate(()=>window.tenderloin.experiment().status),'off');
 const result={source:await buildInfo(),browser:await browser.version(),persisted,coreUnchanged:true,reopenedAndDisabled:true,errors,configuration:'Only Playwright default --disable-back-forward-cache omitted; actual navigation/pageshow checked, no synthetic event'};
 await writeFile('artifacts/voices-bfcache.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}
