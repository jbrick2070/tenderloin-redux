// Real UI checks from rules-generated second-gathering fixtures; no quest bypass in runtime.
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildInfo } from '../scripts/build-fingerprint.mjs';
import { civicFixture } from './civic-fixture.mjs';
import { serializeSave } from '../public/core.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
await mkdir('artifacts', { recursive: true });
await rm('artifacts/civic-browser-results.json', { force: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT:'0' }, stdio: ['ignore','pipe','pipe'] });
process.on('exit', () => server.kill());
let browser;
const base = await new Promise((resolve,reject) => {
  let output=''; const timer=setTimeout(()=>reject(Error('QA server timeout')),10000);
  server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
  server.on('error',reject); server.on('exit',code=>{clearTimeout(timer);reject(Error(`QA server exit ${code}`));});
});
const results=[];
const snapshot=page=>page.evaluate(()=>window.tenderloin.snapshot());
const rest=state=>{const {civic,...other}=state;return other;};
async function start(page){await page.goto(base);await page.locator('#begin').click();await page.waitForFunction(()=>!!window.tenderloin);}
async function reload(page){await page.reload();await page.locator('#begin').click();await page.waitForFunction(()=>!!window.tenderloin);}
async function returned(page){await page.waitForFunction(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return e.id==='civic-hour'&&r.top>=0&&r.bottom<=innerHeight;});}
async function bounds(page){
  assert.equal(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const sizes=await page.locator('#civic-view button').evaluateAll(nodes=>nodes.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  assert.ok(sizes.every(s=>s.width>=44&&s.height>=44));
  const visible=await page.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return document.querySelector('#modal').contains(e)&&r.top>=0&&r.bottom<=innerHeight;});
  assert.equal(visible,true,'focused heading/control is visible');
}
try{
  assert.deepEqual(await (await fetch(base+'/__build')).json(),await buildInfo());
  browser=await chromium.launch({channel:'chrome',headless:true});
  const earlyContext=await browser.newContext();const early=await earlyContext.newPage();await start(early);assert.equal(await early.locator('#civic-hour').count(),0);await early.locator('#journal-button').click();assert.equal(await early.locator('#journal-civic').count(),0);await earlyContext.close();
  let index=0;
  for(const topic of ['repairs','access'])for(const format of ['circle','dropin'])for(const notes of ['themes','none']){
    const width=[320,390,1440][index%3], layout=index%2?'floor':'table';
    const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
    await context.addInitScript(raw=>{if(!localStorage.getItem('tenderloin-redux.save.v1'))localStorage.setItem('tenderloin-redux.save.v1',raw);},serializeSave(civicFixture(layout)));
    await start(page);const before=await snapshot(page);assert.equal(before.civic.phase,'idle');
    await page.locator('#journal-button').click();await page.locator('#journal-civic').click();await bounds(page);assert.equal((await snapshot(page)).civic.phase,'idle','reading invitation does not start event');
    await page.locator('#civic-start').dblclick();
    assert.equal(await page.locator('#film-shoot').count(),0,'film remains unavailable during civic planning');
    await page.locator('#civic-topic-access').dispatchEvent('click',{detail:2});assert.equal((await snapshot(page)).civic.draft.topic,'repairs','replacement choices ignore double-click continuation');
    const originalPlan=await page.locator('.civic-plan').getAttribute('src');
    for(const [key,value] of Object.entries({topic,format,notes})){const control=page.locator(`#civic-${key}-${value}`),label=await control.textContent();await control.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),`civic-${key}-${value}`);assert.equal(await page.locator('#modal-status').textContent(),`${label} selected.`);assert.equal(await page.locator('#civic-view [role=status]').count(),0,'only persistent live region announces');await bounds(page);}
    if(format==='dropin')assert.notEqual(await page.locator('.civic-plan').getAttribute('src'),originalPlan);
    await page.locator('#civic-back').click();await returned(page);
    await reload(page);assert.deepEqual((await snapshot(page)).civic.draft,{topic,format,notes});await page.locator('#civic-hour').click();
    // A double-click on the start-of-meeting action must never close the replacement scene.
    await page.locator('#civic-open').dblclick();assert.equal((await snapshot(page)).civic.phase,'meeting');assert.equal(await page.locator('.civic-voices p').count(),4);
    await page.locator('#civic-back').dispatchEvent('click',{detail:2});assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);
    assert.match(await page.locator('#civic-view').textContent(),/fictional|Fictional/);assert.equal(await page.locator('#civic-view input,#civic-view textarea').count(),0);
    assert.equal(await page.locator('#civic-view h3').filter({hasText:'Our shared request'}).count(),notes==='themes'?1:0);
    await bounds(page);await page.screenshot({path:`artifacts/civic-meeting-${index}-${width}.png`,fullPage:true});
    assert.equal(await page.locator('#film-shoot').count(),0,'film remains unavailable during civic meeting');
    await page.keyboard.press('Escape');await returned(page);await page.locator('#journal-button').click();assert.equal(await page.locator('#journal-film').count(),0,'journal film entry waits for civic completion');await page.locator('#close-modal').click();await reload(page);
    assert.equal((await snapshot(page)).civic.phase,'meeting');await page.locator('#civic-hour').click();await page.locator('#civic-close').dblclick();
    await page.locator('#civic-back').dispatchEvent('click',{detail:2});assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);
    assert.equal((await snapshot(page)).civic.phase,'done');assert.deepEqual((await snapshot(page)).civic.result,{topic,format,notes});await bounds(page);assert.equal(await page.locator('#film-shoot').isVisible(),true,'completed civic UI unlocks later film');
    await page.locator('#close-modal').click();await returned(page);
    assert.deepEqual(rest(await snapshot(page)),rest(before));
    await reload(page);await page.locator('#journal-button').click();await page.locator('#journal-civic').click();await page.locator('#civic-memory').waitFor();await bounds(page);
    await page.screenshot({path:`artifacts/civic-memory-${index}-${width}.png`,fullPage:true});await page.locator('#civic-back').click();await returned(page);
    if(index===0){
      await page.locator('#neighbors-button').click();await page.locator('#neighbor-bea').click();await page.waitForFunction(()=>document.querySelector('#modal-title')?.textContent==='Bea');assert.match(await page.locator('.programme-response').textContent(),/AFTER OUR LISTENING HOUR/);await page.locator('#close-modal').click();
      await page.locator('#settings-button').click();await page.locator('#restart').click();await page.locator('#confirm-restart').click();assert.equal((await snapshot(page)).civic.phase,'idle');assert.equal(await page.locator('#civic-hour').count(),0);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({topic,format,notes,width,layout,stagesReload:'planning/meeting/done pass',otherStateUnchanged:true,focus:'keyboard edit, persistent status, Back/Escape/x visible return and visible headings pass',doubleClick:'start/open/close plus deterministic replacement choice/back continuation rejected',targets:'44px minimum',errors,external});await context.close();index++;
  }
  const output={at:new Date().toISOString(),source:await buildInfo(),browser:await browser.version(),coverage:'8 combinations distributed across320/390/1440 and both layouts; not each combination at every width',fixtures:'rules-generated complete second gathering in both opening layouts; core suite separately completes actual gatherings',results,limits:'Chrome automation, no physical phone/full screen reader/human pacing/real event or surveyed access certification'};
  await writeFile('artifacts/civic-browser-results.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
}finally{await browser?.close();server.kill();}
