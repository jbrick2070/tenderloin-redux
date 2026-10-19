// Optional-module lifecycle QA. Uses real UI; synthetic audio is a nonshipped fixture.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { buildInfo } from '../scripts/build-fingerprint.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
await mkdir('artifacts', { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
process.on('exit', () => server.kill());
const evidence = [], records = await readFile('public/experiments/neighborhood-voices.json', 'utf8');
const base = await new Promise((resolve, reject) => {
  let output = ''; const timer = setTimeout(() => reject(Error('QA server timeout')), 10000);
  server.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
  server.on('error', reject); server.on('exit', code => { clearTimeout(timer); reject(Error(`QA server exit ${code}`)); });
});
async function start(page) { await page.goto(base); await page.locator('#begin').click(); await page.waitForFunction(() => !!window.tenderloin); }
async function ready(page) { await page.waitForFunction(() => window.tenderloin.experiment().status === 'ready'); }
const snapshot = page => page.evaluate(() => window.tenderloin.snapshot());
async function setting(page, enabled) { await page.locator('#settings-button').click(); await page.locator('#voices-enabled').setChecked(enabled); }
async function cards(page) { await ready(page); await page.locator('#voices-button').click(); await page.locator('.voices-cards article').first().waitFor(); }
async function coreJourney(page) {
  await page.locator('#task-layout').click(); await page.locator('#choose-table').click();
  for (const id of ['cell-0-3', 'cell-2-0', 'cell-5-0']) await page.locator('#' + id).click();
  await page.locator('#layout-done').click();
  for (let i = 0; i < 3; i++) { await page.locator('#task-tidy').click(); await page.locator('#collect-litter').click(); }
  await page.locator('#task-mural').click();
  for (let i = 0; i < 3; i++) await page.locator(`#mcell-${i}-0`).click();
  await page.locator('#mural-done').click(); await page.locator('#task-sound').click(); await page.locator('#soundcheck').click();
  await page.locator('#open-gathering').click(); await page.locator('#stay-block').click();
  await page.locator('#next-afternoon').click();
  for (const id of ['stories', 'beats', 'art', 'pause']) await page.locator(`#programme-add-${id}`).click();
  await page.locator('#programme-publish').click(); await page.locator('#programme-host').click(); await page.locator('#host-begin').click();
  await page.locator('#host-story-future').click(); await page.locator('#host-complete').click();
  await page.locator('#host-beat-1').click(); await page.locator('#host-complete').click();
  await page.locator('#host-tile-0').click(); await page.locator('#host-palette-cool').click(); await page.locator('#host-complete').click();
  await page.locator('#host-quiet-pairs').click(); await page.locator('#host-complete').click(); await page.locator('#host-close').click();
  await page.locator('#civic-hour').click(); for (const id of ['civic-start','civic-open','civic-close','civic-back']) await page.locator('#'+id).click();
  await page.locator('#film-shoot').click(); for (const id of ['film-start','film-roll','film-clear','film-capture','film-capture','film-capture','film-back']) await page.locator('#'+id).click();
  const state = await snapshot(page); assert.equal(state.hosting.results.length, 4); assert.equal(state.civic.phase,'done'); assert.equal(state.film.phase,'done'); delete state.player; return state;
}
async function restart(page) { await page.locator('#settings-button').click(); await page.locator('#restart').click(); await page.locator('#confirm-restart').click(); }
function wav() {
  const rate = 8000, samples = rate * 4, data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF'); data.writeUInt32LE(36 + samples * 2, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / rate) * 500), 44 + i * 2);
  return data;
}
try {
  assert.deepEqual(await (await fetch(base + '/__build')).json(), await buildInfo());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.url().includes('/experiments/')) requests.push(r.url()); });
  await start(page); const initial = await snapshot(page);
  await page.locator('#journal-button').click(); assert.equal(await page.locator('#journal-voices').count(), 0); await page.locator('#close-modal').click();
  await setting(page, false); assert.equal(requests.length, 0); assert.equal(await page.locator('#voices-button').isVisible(), false); await page.locator('#close-modal').click();
  const hash = async () => { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); return createHash('sha256').update(await page.locator('#world').evaluate(c => c.toDataURL())).digest('hex'); };
  const off = await hash(); await setting(page, true); await ready(page); await page.locator('#close-modal').click(); await cards(page);
  assert.equal(await page.locator('.voices-cards article').count(), 3); assert.equal(await page.evaluate(() => document.activeElement.id), 'modal-title');
  assert.deepEqual(await page.locator('.voices-cards a').evaluateAll(nodes => nodes.map(a => a.href)), JSON.parse(records).records.map(r => r.url));
  assert.equal(await page.locator('.voices-cards img,.voices-cards audio').count(), 0);
  assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await page.screenshot({ path: 'artifacts/voices-cards-390.png', fullPage: true });
  const counts = [];
  for (let i = 0; i < 3; i++) { counts.push(await page.evaluate(() => window.tenderloin.experiment().resources)); await page.keyboard.press('Escape'); await page.locator('#voices-button').click(); }
  assert.equal(new Set(counts).size, 1, 'reopening does not accumulate listeners');
  // Synthetic lifecycle integration, separate from actual navigation evidence.
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.evaluate(() => window.tenderloin.experiment().status), 'paused');
  assert.equal(await page.evaluate(() => window.tenderloin.experiment().resources), 0);
  assert.equal(await page.locator('#modal').evaluate(e => e.open), false);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await ready(page); assert.equal(await page.locator('#modal').evaluate(e => e.open), false);
  await cards(page);
  await page.locator('#voices-disable').click();
  assert.equal(await page.locator('#voices-enabled').isChecked(), false); assert.equal(await page.evaluate(() => document.activeElement.id), 'voices-enabled');
  assert.deepEqual(await snapshot(page), initial); assert.deepEqual(await page.evaluate(() => window.tenderloin.experiment()), { enabled: false, status: 'off', resources: 0, audio: 0, cleanupErrors: 0 });
  await page.keyboard.press('Escape'); await page.waitForFunction(() => document.activeElement.id === 'settings-button'); assert.equal(await hash(), off); assert.equal(await page.locator('#voices-button').isVisible(), false);
  const requestCount = requests.length; await page.reload(); await page.locator('#begin').click(); assert.equal(requests.length, requestCount);
  // Complete both gatherings, civic event and film off/on/off through explicit restart.
  const first = await coreJourney(page); await setting(page, true); await ready(page); await page.locator('#close-modal').click(); await page.reload(); await page.locator('#begin').click(); await ready(page);
  await restart(page); const second = await coreJourney(page); assert.deepEqual(second, first);
  await setting(page, false); await page.locator('#close-modal').click(); await restart(page); const third = await coreJourney(page); assert.deepEqual(third, first);
  const saved = await page.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1'));
  assert.equal(await page.evaluate(() => window.tenderloin.experiment().resources), 0); assert.deepEqual(errors, []);
  evidence.push({ defaultOff: 'no optional import/data request or cards; save/state/canvas unchanged by enable/off', repeatedViews: 'stable owned-resource count over3 Escape/reopen cycles', lifecycle: 'synthetic persisted pagehide closes cards/releases all resources; pageshow restores ready without opening cards', focus: 'disable to Settings then Escape returns to visible Settings button', preferences: 'explicit on persists reload; off persists reload', fullCoreOffOnOff: 'actual opening, second gathering, civic event and film complete3times; relevant outcomes exactly equal, player coordinates excluded' });
  await context.close();
  const retryContext = await browser.newContext({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' }); const retryPage = await retryContext.newPage(); let attempts = 0;
  await retryContext.route('**/experiments/neighborhood-voices.json', route => route.fulfill({ contentType: 'application/json', body: ++attempts === 1 ? '{"version":99}' : records }));
  await start(retryPage); await setting(retryPage, true); await retryPage.waitForFunction(() => window.tenderloin.experiment().status === 'error'); await retryPage.locator('#close-modal').click(); await retryPage.locator('#voices-button').click();
  await retryPage.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  assert.equal(await retryPage.evaluate(() => window.tenderloin.experiment().status), 'error'); assert.equal(attempts, 1);
  await retryPage.locator('#voices-button').click(); await retryPage.locator('#voices-off').click(); await retryPage.locator('#close-modal').click();
  await retryPage.waitForFunction(() => document.activeElement.id === 'settings-button');
  await setting(retryPage, true); await ready(retryPage); await retryPage.locator('#close-modal').click();
  // A fresh malformed response checks explicit retry independently of toggle-on.
  attempts = 0; await setting(retryPage, false); await retryPage.locator('#voices-enabled').check(); await retryPage.waitForFunction(() => window.tenderloin.experiment().status === 'error'); await retryPage.locator('#close-modal').click(); await retryPage.locator('#voices-button').click();
  await retryPage.locator('#voices-back').click(); await retryPage.locator('#voices-button').click(); assert.equal(attempts, 1);
  await retryPage.locator('#voices-retry').click(); await ready(retryPage); assert.equal(attempts, 2); assert.equal(await retryPage.evaluate(() => document.activeElement.id), 'modal-title');
  await retryPage.locator('#voices-read').click(); assert.equal(await retryPage.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth), true); await retryPage.screenshot({ path: 'artifacts/voices-cards-320.png', fullPage: true });
  await retryPage.locator('#voices-disable').click(); await retryContext.close();
  evidence.push({ malformedNotes: 'contained error, no automatic retry on reopen, explicit retry succeeds and preserves visible heading;320px no overflow' });
  const lateContext = await browser.newContext(); const latePage = await lateContext.newPage(); let release, seen;
  const held = new Promise(resolve => { seen = resolve; });
  await lateContext.route('**/experiments/neighborhood-voices.json', async route => { seen(); await new Promise(done => { release = done; }); await route.fulfill({ contentType: 'application/json', body: records }).catch(() => {}); });
  await start(latePage); await setting(latePage, true); await held; await latePage.locator('#close-modal').click(); await latePage.locator('#neighbors-button').click(); const focus = await latePage.evaluate(() => document.activeElement.id);
  release(); await ready(latePage); assert.equal(await latePage.locator('#modal-title').textContent(), 'Meet the neighbors'); assert.equal(await latePage.evaluate(() => document.activeElement.id), focus);
  await latePage.locator('#close-modal').click(); await cards(latePage); await latePage.locator('#voices-disable').click(); await lateContext.close();
  const offContext = await browser.newContext(); const offPage = await offContext.newPage(); let releaseOff, seenOff;
  const offHeld = new Promise(resolve => { seenOff = resolve; });
  await offContext.route('**/experiments/neighborhood-voices.json', async route => { seenOff(); await new Promise(done => { releaseOff = done; }); await route.fulfill({ contentType: 'application/json', body: records }).catch(() => {}); });
  await start(offPage); const offBefore = await snapshot(offPage); await setting(offPage, true); await offHeld; await offPage.locator('#voices-enabled').uncheck(); releaseOff(); await offPage.waitForTimeout(100);
  assert.equal(await offPage.evaluate(() => window.tenderloin.experiment().status), 'off'); assert.equal(await offPage.locator('.voices-cards').count(), 0); assert.deepEqual(await snapshot(offPage), offBefore); await offContext.close();
  evidence.push({ lateLoads: 'completion under Neighbors cannot replace dialog/focus; disabling pending fetch leaves no cards/resources/core change' });
  const missingContext = await browser.newContext(); let imports = 0; const missingPage = await missingContext.newPage();
  await missingContext.addInitScript(raw => { const data = JSON.parse(raw); data.optional = { neighborhoodVoices: { enabled: true, unknown: 'preserve me' } }; localStorage.setItem('tenderloin-redux.save.v1', JSON.stringify(data)); }, saved);
  await missingContext.route(/\/experiments\/neighborhood-voices\.js(?:\?.*)?$/,  route => { imports++; return route.abort(); });
  await start(missingPage); assert.equal(imports, 0); assert.equal((await snapshot(missingPage)).hosting.results.length, 4); assert.equal((await snapshot(missingPage)).optional.neighborhoodVoices.unknown, 'preserve me');
  await setting(missingPage, true); await missingPage.waitForFunction(() => window.tenderloin.experiment().status === 'error'); await missingPage.locator('#close-modal').click();
  await restart(missingPage); await coreJourney(missingPage); assert.equal(imports, 1, 'module failure never retries during ordinary core play'); await missingContext.close();
  const importContext = await browser.newContext(); const importPage = await importContext.newPage(); let importAttempts = 0;
  const moduleText = await readFile('public/experiments/neighborhood-voices.js', 'utf8');
  await importContext.route(/\/experiments\/neighborhood-voices\.js(?:\?.*)?$/,  route => ++importAttempts === 1 ? route.abort() : route.fulfill({ contentType: 'text/javascript', body: moduleText }));
  await start(importPage); await setting(importPage, true); await importPage.waitForFunction(() => window.tenderloin.experiment().status === 'error'); await importPage.locator('#close-modal').click(); await importPage.locator('#voices-button').click(); await importPage.locator('#voices-retry').click(); await ready(importPage); assert.equal(importAttempts, 2); await importContext.close();
  evidence.push({ absentModule: 'save with optional data loads with flag off and makes no optional request; enabling missing module fails safely while both gatherings/civic/film remain completable; explicit module retry uses fresh failed-import URL and succeeds' });
  const exportContext = await browser.newContext(); const exportPage = await exportContext.newPage(); let exportAttempts = 0;
  await exportContext.route(/\/experiments\/neighborhood-voices\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'text/javascript', body: ++exportAttempts === 1 ? 'export const unavailable = true;' : moduleText }));
  await start(exportPage); await setting(exportPage, true); await exportPage.waitForFunction(() => window.tenderloin.experiment().status === 'error'); await exportPage.locator('#close-modal').click(); await exportPage.locator('#voices-button').click(); await exportPage.locator('#voices-retry').click(); await ready(exportPage); assert.equal(exportAttempts, 2); await exportContext.close();
  evidence.push({ lifecycleFailure: 'synthetic persisted pagehide/pageshow preserves error without new request; error-stub disable then close focuses Settings', badExport: 'missing activate export is contained; explicit retry imports fresh URL and succeeds' });
  const stallContext = await browser.newContext(); const stallPage = await stallContext.newPage(); await stallContext.route('**/experiments/neighborhood-voices.json', () => {});
  await start(stallPage); const startTime = Date.now(); await setting(stallPage, true); await stallPage.waitForFunction(() => window.tenderloin.experiment().status === 'error', null, { timeout: 15000 });
  assert.ok(Date.now() - startTime >= 9000); assert.equal(await stallPage.evaluate(() => window.tenderloin.experiment().resources), 0); await stallPage.locator('#voices-enabled').uncheck(); await stallContext.close();
  evidence.push({ stalledLoad: '10second host deadline aborts load, releases resources, and allows explicit off' });
  const textContext = await browser.newContext(); const textPage = await textContext.newPage(), externalText = [];
  const unsafeText = JSON.parse(records); unsafeText.records[0].summary = '<img src="https://invalid.example/track" onerror="window.qaInjected=true">';
  textPage.on('request', r => { if (!r.url().startsWith(base) && /^https?:/.test(r.url())) externalText.push(r.url()); });
  await textContext.route('**/experiments/neighborhood-voices.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(unsafeText) }));
  await start(textPage); await setting(textPage, true); await ready(textPage); await textPage.locator('#close-modal').click(); await cards(textPage);
  assert.equal(await textPage.locator('.voices-cards img').count(), 0); assert.match(await textPage.locator('.voices-cards').textContent(), /<img/); assert.equal(await textPage.evaluate(() => window.qaInjected), undefined); assert.deepEqual(externalText, []); await textContext.close();
  evidence.push({ syntheticMarkup: 'organization text is rendered literally, no image/script/event executes and no external resource request' });
  const audioContext = await browser.newContext(); const audioPage = await audioContext.newPage(); await start(audioPage); const tone = wav();
  await audioPage.locator('#music-button').click(); await audioPage.locator('#soundtrack-file').setInputFiles({ name: 'qa-main-tone.wav', mimeType: 'audio/wav', buffer: tone }); await audioPage.locator('#track-play').click(); await audioPage.waitForFunction(() => window.tenderloin.sound().position > 0); await audioPage.locator('#music-close').click();
  await setting(audioPage, true); await ready(audioPage); await audioPage.locator('#close-modal').click(); await cards(audioPage); await audioPage.locator('#voices-disable').click();
  assert.equal(await audioPage.evaluate(() => window.tenderloin.sound().enabled), true); await audioPage.locator('#close-modal').click();
  await audioPage.evaluate(async url => {
    const { ExperimentHost } = await import('./experimental-host.js'); const sound = new Audio(url); sound.loop = true;
    const host = new ExperimentHost({ load: async scope => { scope.ownAudio(sound); scope.own(() => { throw Error('test-only cleanup failure'); }); return { open() {} }; } });
    await host.setEnabled(true); const button = document.createElement('button'); button.id = 'qa-optional-tone'; button.textContent = 'Play QA tone'; button.addEventListener('click', () => sound.play().catch(() => {})); document.body.append(button); window.qaTone = { host, sound };
  }, 'data:audio/wav;base64,' + tone.toString('base64'));
  await audioPage.locator('#qa-optional-tone').click(); await audioPage.waitForFunction(() => window.qaTone.sound.currentTime > 0);
  const timing = await audioPage.evaluate(() => { const main = window.tenderloin.sound().position, start = performance.now(); window.qaTone.host.setEnabled(false); return { ms: performance.now() - start, paused: window.qaTone.sound.paused, host: window.qaTone.host.snapshot(), main, mainEnabled: window.tenderloin.sound().enabled }; });
  assert.equal(timing.paused, true); assert.ok(timing.ms <= 100); assert.equal(timing.host.cleanupErrors, 1); assert.equal(timing.host.resources, 0); assert.equal(timing.mainEnabled, true); await audioPage.waitForFunction(before => window.tenderloin.sound().position > before + .02, timing.main);
  evidence.push({ optionalAudioFixture: timing, measurement: 'HTMLAudio pause command/state within100ms with throwing cleanup; main local audio continues. Synthetic QA tone only, not shipped voices or acoustic speaker latency certification.' }); await audioContext.close();
  await writeFile('artifacts/voices-browser-results.json', JSON.stringify({ at: new Date().toISOString(), source: await buildInfo(), browser: await browser.version(), evidence, limits: 'Automated Chrome/touch emulation; no physical phone, full screen reader, human pacing, real service availability, actual voice recording or acoustic-latency certification.' }, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); server.kill(); }
