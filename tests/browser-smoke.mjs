// Run with a local Playwright installation; it is QA tooling, not a game runtime dependency. BROWSER_CHANNEL selects chrome (default), msedge, bundled Chromium, or firefox (the installed Firefox through Playwright's BiDi channel).
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildInfo } from '../scripts/build-fingerprint.mjs';
import { initialState } from '../public/core.js';
import { BLACK_HAWK } from '../public/history.js';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
let ownedServer, browser, base;
async function startServer() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  ownedServer = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: process.env.PORT || '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('QA server did not become ready')), 10000);
    let output = '';
    ownedServer.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timeout); resolve(match[0]); } });
    ownedServer.on('error', error => { clearTimeout(timeout); reject(error); });
    ownedServer.on('exit', code => { clearTimeout(timeout); reject(Error(`QA server exited (${code}): ${output}`)); });
    ownedServer.stderr.on('data', chunk => { output += chunk; });
  });
}
process.on('exit', () => ownedServer?.kill());
await mkdir('artifacts', { recursive: true });
const evidence = [];
async function dialogFocus(page) {
  assert.equal(await page.evaluate(() => document.querySelector('#modal').contains(document.activeElement)), true, 'focus must remain inside the active dialog');
}
async function clickWorldObject(page, x, y) {
  await page.locator('#map-overview').click();
  const view = await page.evaluate(() => window.tenderloin.location());
  await page.locator('#world').click({ position: { x: view.x + x * view.scale, y: view.y + y * view.scale } });
}
async function closedLayoutMarker(page) {
  await clickWorldObject(page, 258, -18); await page.locator('#back-block').waitFor();
  assert.equal(await page.locator('.placement-grid').count(), 0, 'completed layout marker must not open placement controls');
  await dialogFocus(page); await page.locator('#back-block').click();
}
async function start(page) {
  await page.goto(base); await page.locator('#begin').click();
  await page.waitForFunction(() => !!window.tenderloin);
  assert.equal(await page.evaluate(() => window.tenderloin.version), (await buildInfo()).version);
}
async function livingDistrictCheck(page) {
  const before = await page.evaluate(() => window.tenderloin.snapshot());
  const canvasHash = async () => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); return createHash('sha256').update(await page.locator('#world').evaluate(c => c.toDataURL())).digest('hex'); };
  const canvasBefore = await canvasHash();
  await page.locator('#district-button').click(); await dialogFocus(page);
  await page.waitForFunction(() => !document.querySelector('#district-layer').disabled);
  assert.match(await page.locator('#modal-body').textContent(), /Honey Mahogany, Janetta Johnson and Aria Sa’id/);
  assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await page.screenshot({ path: 'artifacts/living-district-note.png', fullPage: true });
  await page.locator('#district-layer').click();
  assert.equal(await page.locator('#district-legend').isVisible(), true);
  await page.waitForTimeout(70);
  const shown = await canvasHash(); assert.notEqual(shown, canvasBefore, 'boundary must visibly change the canvas');
  await page.screenshot({ path: 'artifacts/living-district-layer.png', fullPage: true });
  await page.locator('#district-hide').click(); await page.waitForTimeout(70);
  assert.equal(await page.locator('#district-legend').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'district-button');
  assert.equal(await canvasHash(), canvasBefore, 'off/on/off restores the exact reduced-motion canvas pixels');
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot()), before, 'view cannot alter progress, ending or optional JSON');
  await page.locator('#journal-button').click(); await page.locator('#journal-district').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'district-layer'); await page.locator('#district-layer').click();
  await page.locator('#district-notes').click(); await page.locator('#district-layer').click(); await page.waitForTimeout(30);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'district-button', 'both hide paths return nav focus');
  await page.locator('#district-button').click(); await page.locator('#district-layer').click();
  await page.reload(); await page.locator('#begin').click();
  assert.equal(await page.locator('#district-legend').isVisible(), false, 'view is tab-local, never restored by game save');
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot()), before);
  evidence.push({ livingDistrict: 'source note, real canvas change, bit-identical off/on/off, focus, snapshot/save isolation, journal access and reload off pass' });
}
async function historyWalkCheck(page) {
  const before = await page.evaluate(() => window.tenderloin.snapshot());
  await page.locator('#history-walk-button').click(); await dialogFocus(page);
  assert.match(await page.locator('#modal-body').textContent(), /Jones → Leavenworth → Hyde/);
  assert.equal(await page.locator('#read-blackhawk').count(), 0);
  await page.locator('#walk-map').click();
  assert.equal(await page.locator('#camera-status').textContent(), 'Turk history walk');
  await page.screenshot({ path: 'artifacts/history-route-mobile.png', fullPage: true });
  await page.locator('#history-walk-button').click(); await page.locator('#walk-blackhawk').click();
  await page.waitForFunction(() => window.tenderloin.snapshot().player.x < -400);
  await page.locator('#stop-walking').click();
  const stopped = await page.evaluate(() => window.tenderloin.snapshot().player);
  await page.waitForTimeout(180); assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot().player), stopped);
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().blackhawk), false);
  await page.locator('#history-walk-button').click(); await page.locator('#walk-blackhawk').click();
  await page.locator('#blackhawk-close').waitFor({ timeout: 25000 }); await dialogFocus(page);
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().blackhawk), true);
  assert.match(await page.locator('#modal-body').textContent(), /April 1961/);
  assert.match(await page.locator('#modal-body').textContent(), /August 13, 2022 at Dodge Place/);
  assert.equal(await page.locator('#stop-walking').isDisabled(), true);
  assert.equal(await page.locator('#modal-body a').count(), 3);
  const after = await page.evaluate(() => window.tenderloin.snapshot());
  assert.deepEqual({ ...after, player: before.player, blackhawk: before.blackhawk }, before, 'optional walk cannot change preparations or ending');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/blackhawk-note-mobile.png', fullPage: true });
  await page.locator('#blackhawk-close').click();
  const chipView = await page.evaluate(() => window.tenderloin.location());
  await page.locator('#world').click({ position: { x: chipView.x + BLACK_HAWK.x * chipView.scale, y: chipView.y + BLACK_HAWK.y * chipView.scale - 51.5 * Math.max(1, chipView.scale) } });
  await page.locator('#blackhawk-close').waitFor(); await dialogFocus(page);
  await page.locator('#blackhawk-close').click();
  await page.screenshot({ path: 'artifacts/blackhawk-stop-mobile.png', fullPage: true });
  await page.reload(); await page.locator('#begin').click();
  const view = await page.evaluate(() => ({ player: window.tenderloin.snapshot().player, ...window.tenderloin.location() }));
  assert.ok(view.player.x < -2100); assert.ok(view.scale >= .85);
  await page.locator('#journal-button').click(); await page.locator('#journal-walk').click();
  await page.locator('#read-blackhawk').click(); await page.locator('#blackhawk-return').click();
  await page.locator('#choose-table').waitFor({ timeout: 25000 }); await dialogFocus(page);
  await page.locator('#close-modal').click();
  await page.locator('#map-overview').click();
  assert.equal(await page.locator('#camera-status').textContent(), 'Full block');
  evidence.push({ historyWalk: 'real-control westward route, cancel/reselect, arrival note, tappable close-view label, source links, optional state isolation, v1 discovery/player reload, saved-note reread, actual return to Bea, opening overview and phone overflow pass' });
}
async function localSoundtrack(page) {
  const wave = Buffer.alloc(44 + 32000);
  wave.write('RIFF', 0); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(16000, 24); wave.writeUInt32LE(32000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(32000, 40);
  for (let i = 0; i < 16000; i++) wave.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 220 / 16000) * 300), 44 + i * 2);
  await page.locator('#music-button').click(); await dialogFocus(page);
  const name = '<img src=x onerror=alert(1)>.wav';
  await page.locator('#soundtrack-file').setInputFiles({ name, mimeType: 'audio/wav', buffer: wave });
  assert.match(await page.locator('#soundtrack-status').textContent(), /ready; press Play/);
  assert.equal(await page.locator('#modal-body img').count(), 0, 'filename must remain text');
  assert.equal(await page.evaluate(() => window.tenderloin.sound().enabled), false);
  await page.locator('#track-play').click(); await page.waitForFunction(() => window.tenderloin.sound().enabled);
  await page.waitForFunction(() => window.tenderloin.sound().position > 0, null, { timeout: 5000 });
  await page.locator('#soundtrack-volume').fill('20');
  assert.equal(await page.evaluate(() => window.tenderloin.sound().volume), .2);
  await page.locator('#track-play').click(); assert.equal(await page.evaluate(() => window.tenderloin.sound().enabled), false);
  await page.screenshot({ path: 'artifacts/local-soundtrack-mobile.png', fullPage: true });
  await page.locator('#soundtrack-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not audio') });
  assert.match(await page.locator('#soundtrack-status').textContent(), /MP3 or WAV/); assert.equal(await page.evaluate(() => window.tenderloin.sound().fileName), name);
  await page.locator('#soundtrack-file').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('broken') });
  await page.waitForFunction(() => document.querySelector('#soundtrack-status').textContent.includes('could not play'));
  await page.locator('#track-play').click(); assert.match(await page.locator('#soundtrack-status').textContent(), /could not play/);
  assert.match(await page.evaluate(() => window.tenderloin.sound().error), /could not play/);
  await page.locator('#soundtrack-file').setInputFiles({ name: 'test-tone.wav', mimeType: 'audio/wav', buffer: wave });
  await page.locator('#track-play').click(); await page.waitForFunction(() => window.tenderloin.sound().enabled);
  await page.locator('#use-sketch').click(); assert.equal(await page.evaluate(() => window.tenderloin.sound().mode), 'sketch');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'track-play');
  await page.locator('#soundtrack-file').setInputFiles({ name: 'test-tone.wav', mimeType: 'audio/wav', buffer: wave });
  await page.locator('#music-close').click();
  await page.reload(); await page.locator('#begin').click();
  assert.equal(await page.evaluate(() => window.tenderloin.sound().mode), 'sketch');
  assert.equal(await page.evaluate(() => window.tenderloin.sound().enabled), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1')?.includes('test-tone.wav') || false), false);
  evidence.push({ localSoundtrack: 'native WAV decode/play position, pause, volume, safe filename, file validation, corrupt-audio recovery, replacement, synth fallback, focus and reload without autoplay pass', audioFixture: 'synthetic quiet tone, not final music or Suno quality evidence' });
}
async function layout(page, choice) {
  await page.locator('#task-layout').click(); await page.locator(`#choose-${choice}`).click();
  await dialogFocus(page);
  await page.locator('#tool-speaker').click(); const toolMessage = await page.locator('.grid-message').textContent();
  await page.locator('#preview-layout').click(); assert.match(await page.locator('.plan-supplies').textContent(), /No supplies placed yet/);
  await page.locator('#gathering-plan-close').click();
  assert.equal(await page.locator('#tool-speaker').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.grid-message').textContent(), toolMessage);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'preview-layout');
  await page.locator('#tool-table').click();
  await page.locator('.grid-cell[data-col="0"][data-row="2"]').click();
  assert.match(await page.locator('.grid-message').textContent(), /overlap/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cell-0-2');
  for (const [col, row] of [[0, 3], [2, 0], [5, 0]]) {
    await page.locator(`#cell-${col}-${row}`).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), `cell-${col}-${row}`);
  }
  const arranged = await page.evaluate(() => window.tenderloin.snapshot().furniture);
  const readyMessage = await page.locator('.grid-message').textContent();
  await page.locator('#preview-layout').click(); await dialogFocus(page);
  await page.waitForFunction(() => document.querySelector('.gathering-plan')?.naturalWidth > 0);
  assert.equal(await page.locator('.placement-grid').count(), 0, 'plan is read-only');
  assert.match(await page.locator('#modal-body').textContent(), /Visitors arrive when the gathering opens/);
  await page.locator('#gathering-plan-close').click(); await dialogFocus(page);
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot().furniture), arranged);
  assert.equal(await page.locator('.grid-message').textContent(), readyMessage);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'preview-layout');
  await page.locator('#layout-done').click();
}
async function gatheringPlan(page, choice, packing = false) {
  const before = await page.evaluate(() => window.tenderloin.snapshot());
  await page.locator('#see-gathering-plan').click(); await dialogFocus(page);
  await page.waitForFunction(() => document.querySelector('.gathering-plan')?.naturalWidth > 0);
  assert.match(await page.locator('#modal-title').textContent(), choice === 'table' ? /Long Table/ : /Open Floor/);
  const src = await page.locator('.gathering-plan').getAttribute('src'), svg = decodeURIComponent(src.split(',').slice(1).join(','));
  assert.equal((svg.match(/data-pose=/g) || []).length, packing ? 0 : 3);
  if (!packing) assert.match(svg, new RegExp(`data-pose="${choice === 'table' ? 'talk' : 'dance'}"`));
  const remaining = before.epilogue.packing ? ['table', 'speaker'].filter(id => !before.epilogue.returned.includes(id)).length : 3;
  assert.equal((svg.match(/data-supply=/g) || []).length, remaining);
  assert.match(await page.locator('.plan-route').textContent(), /third row stays clear/);
  assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await page.screenshot({ path: `artifacts/gathering-plan-${choice}${packing ? '-packed' : ''}.png`, fullPage: true });
  await page.locator('#gathering-plan-close').click();
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot()), before, 'inspection cannot change quests, consent or saves');
  evidence.push({ gatheringPlan: choice, packing, remainingSupplies: remaining, visitors: packing ? 0 : 3, svgDecode: 'pass', readOnlySnapshot: 'pass', dialogFocus: 'pass', viewportOverflow: 'none' });
}
async function finish(page, choice) {
  await layout(page, choice);
  for (let i = 0; i < 3; i++) { await page.locator('#task-tidy').click(); await page.locator('#collect-litter').click(); }
  await page.locator('#task-mural').click();
  for (const [col, row] of [[0, 0], [2, 1], [4, 0]]) {
    await page.locator(`#mcell-${col}-${row}`).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), `mcell-${col}-${row}`);
  }
  await page.locator('#mural-done').click();
  await page.locator('#task-sound').click(); await page.locator('#soundcheck').click();
  assert.equal(await page.locator('#open-gathering').isEnabled(), true);
  await page.locator('#open-gathering').click(); assert.match(await page.locator('#modal-title').textContent(), /little room/);
  await page.locator('#stay-block').click();
  const snapshot = await page.evaluate(() => window.tenderloin.snapshot()); assert.equal(snapshot.opened, true); assert.equal(snapshot.layout, choice);
  assert.equal(snapshot.litter.length, 3); assert.equal(Object.keys(snapshot.mural).length, 3);
  await page.screenshot({ path: `artifacts/complete-${choice}.png`, fullPage: true });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.save.v1')));
  assert.equal(saved.core.opened, true);
  await page.reload();
  // The dialog's close event is queued after close(); a key pressed before it runs is cleared by the game's own close handler.
  await page.evaluate(() => { window.__welcomeClosed = new Promise(resolve => document.querySelector('#modal').addEventListener('close', resolve, { once: true })); });
  await page.locator('#begin').click(); await page.evaluate(() => window.__welcomeClosed);
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().opened), true);
  assert.equal(await page.locator('#progress-percent').textContent(), '100%');
  const x = await page.evaluate(() => window.tenderloin.snapshot().player.x);
  await page.locator('#world').focus(); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(260); await page.keyboard.up('ArrowLeft');
  assert.ok(await page.evaluate(() => window.tenderloin.snapshot().player.x) < x, 'keyboard movement must change position');
}
async function epilogue(page, choice) {
  assert.equal(await page.locator('#afterglow').isVisible(), true);
  await gatheringPlan(page, choice);
  await page.locator('#neighbors-button').click(); await page.locator('#neighbor-celeste').click();
  await page.locator('#start-mural').waitFor();
  assert.match(await page.locator('#modal-body').textContent(), choice === 'table' ? /letters have started a conversation/ : /room we left matters/);
  await page.locator('#close-modal').click();
  await closedLayoutMarker(page);
  await page.locator('#make-keepsake').click();
  assert.equal(await page.locator('#photo-rook').count(), 0);
  if (choice === 'table') {
    for (const id of ['bea', 'celeste', 'dez', 'thanh']) await page.locator(`#photo-${id}`).uncheck();
    await page.locator('#take-keepsake').click(); assert.match(await page.locator('#photo-message').textContent(), /at least one/);
    for (const id of ['bea', 'celeste', 'thanh']) await page.locator(`#photo-${id}`).check();
    await page.locator('#take-keepsake').click();
    await dialogFocus(page);
    await page.waitForFunction(() => document.querySelector('.keepsake-image')?.naturalWidth > 0);
    const image = await page.locator('.keepsake-image').getAttribute('src');
    const downloadReady = page.waitForEvent('download'); await page.locator('#download-keepsake').click(); const download = await downloadReady;
    const file = `artifacts/afternoon-${choice}.svg`; await download.saveAs(file);
    const svg = await readFile(file, 'utf8'); assert.match(svg, /data-guest="bea"/); assert.doesNotMatch(svg, /data-guest="rook"|data-guest="dez"/);
    await page.screenshot({ path: 'artifacts/keepsake-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => { const modal = document.querySelector('#modal'); return modal.scrollWidth <= modal.clientWidth; }), true);
    await page.screenshot({ path: 'artifacts/keepsake-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#keepsake-close').click();
    await page.locator('#task-mural').click(); await page.locator('#motif-sun').click(); await page.locator('#mcell-5-2').click(); await page.locator('#palette-ocean').click(); await page.locator('#mural-done').click();
    await page.locator('#view-keepsake').click(); assert.equal(await page.locator('.keepsake-image').getAttribute('src'), image); await page.locator('#keepsake-close').click();
  } else {
    await page.locator('#skip-keepsake').click(); assert.equal(await page.evaluate(() => window.tenderloin.snapshot().epilogue.photo.status), 'skipped');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#make-keepsake').click();
    assert.equal(await page.evaluate(() => { const modal = document.querySelector('#modal'); return modal.scrollWidth <= modal.clientWidth; }), true);
    await page.screenshot({ path: 'artifacts/keepsake-consent-mobile.png', fullPage: true });
    await page.locator('#photo-later').click();
    assert.equal(await page.evaluate(() => window.tenderloin.snapshot().epilogue.photo.status), 'skipped');
  }
  await page.locator('#start-pack').click(); await page.locator('#pack-later').click();
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().epilogue.packing), false);
  await page.locator('#start-pack').click(); await page.locator('#confirm-pack').click();
  await gatheringPlan(page, choice, true);
  await closedLayoutMarker(page);
  for (const [index, id] of ['speaker', 'table', 'paint-case'].entries()) {
    await page.locator(`#visit-${id}`).click(); await page.locator('#return-event-loan').click();
    assert.equal(await page.locator(`#visit-${id}`).isDisabled(), true);
    if (index === 0) { await page.reload(); await page.locator('#begin').click(); assert.equal(await page.evaluate(() => window.tenderloin.snapshot().epilogue.returned.length), 1); }
  }
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().opened), true); assert.equal(await page.locator('#progress-percent').textContent(), '100%');
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().epilogue.returned.length), 3);
  await gatheringPlan(page, choice, true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#journal-button').click();
  assert.match(await page.locator('#modal-body').textContent(), /3 of 3 borrowed event supplies returned/);
  if (choice === 'table') { await page.locator('#journal-keepsake').click(); await dialogFocus(page); await page.waitForFunction(() => document.querySelector('.keepsake-image')?.naturalWidth > 0); await page.locator('#keepsake-close').click(); }
  else { assert.equal(await page.locator('#journal-keepsake').count(), 0); await page.locator('#close-modal').click(); }
  await page.screenshot({ path: `artifacts/afterglow-${choice}.png`, fullPage: true });
  await clickWorldObject(page, 647, -47); await page.locator('#talk-close').waitFor();
  assert.equal(await page.locator('#talk-close').textContent(), 'See you around'); assert.match(await page.locator('#modal-body').textContent(), /That was a good rhythm/); await page.locator('#close-modal').click();
  evidence.push({ epilogue: choice, photo: choice === 'table' ? 'consent subset, local SVG export and frozen snapshot pass' : 'skipped without penalty; narrow consent dialog can be revisited and deferred', returnLoans: 'all three, arbitrary order', partialLapReload: 'pass', completedCorePreserved: 'pass', completedLayoutMarkerGuard: 'before and after packing pass', modalTransitionFocus: 'pass', postPackingDezDialogue: 'pass', narrowEnding: choice === 'floor' ? '390px no overflow' : 'desktop plus 390px keepsake view' });
}
async function programmeCheck(page, choice) {
  const focusVisible = async () => assert.equal(await page.evaluate(() => {
    const a = document.activeElement.getBoundingClientRect(), m = document.querySelector('#modal').getBoundingClientRect();
    return a.top >= m.top && a.bottom <= m.bottom && a.left >= m.left && a.right <= m.right;
  }), true, 'focused programme control must be visible within dialog');
  const before = await page.evaluate(() => window.tenderloin.snapshot());
  await page.locator('#map-overview').click();
  const canvasHash = async () => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); return createHash('sha256').update(await page.locator('#world').evaluate(c => c.toDataURL())).digest('hex'); };
  const emptyBoard = await canvasHash();
  await page.locator('#next-afternoon').click();
  for (const id of ['beats', 'stories', 'art', 'pause']) await page.locator(`#programme-add-${id}`).click();
  await focusVisible();
  assert.equal(await page.locator('#programme-publish').isDisabled(), true);
  // Invalid draft is explained when reopened; a mutation's live status describes the action itself.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement.id === 'next-afternoon');
  await page.locator('#next-afternoon').click();
  assert.match(await page.locator('#programme-message').textContent(), /quiet interval between/);
  await page.locator('#programme-up-pause').focus(); await page.keyboard.press('Enter');
  await page.locator('#programme-up-pause').click();
  await focusVisible();
  assert.equal(await page.locator('#programme-publish').isDisabled(), false);
  await page.locator('#programme-publish').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'modal-title'); await focusVisible();
  await page.waitForFunction(() => document.querySelector('.programme-poster')?.naturalWidth === 640);
  assert.deepEqual(await page.locator('#posted-programme li').allTextContents(), ['Rhythm workshop · proposed by Dez', 'Quiet interval · proposed by Thanh', 'Story circle · proposed by Bea', 'Shared art panel · proposed by Celeste']);
  assert.match(await page.locator('#modal-title').textContent(), /A rhythm, a pause, a story/);
  assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await page.screenshot({ path: `artifacts/programme-${choice}-poster.png`, fullPage: true });
  await page.locator('#close-modal').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'next-afternoon');
  assert.notEqual(await canvasHash(), emptyBoard, 'posting visibly adds the portable board');
  if (choice === 'table') {
    await page.locator('#recenter').click(); await page.locator('#zoom-in').click(); await page.locator('#zoom-in').click();
    await canvasHash();
    const strips = await page.evaluate(() => {
      const canvas = document.querySelector('#world'), ctx = canvas.getContext('2d'), box = canvas.getBoundingClientRect();
      const { x, y, scale } = window.tenderloin.location(), ratio = canvas.width / box.width;
      const colors = [[145,186,194], [163,180,140], [229,182,109], [217,162,178]];
      return colors.map((color, i) => {
        const left = Math.round((x + 513 * scale) * ratio), top = Math.round((y + (-80 + i * 6) * scale) * ratio);
        const data = ctx.getImageData(left, top, Math.ceil(14 * scale * ratio), Math.ceil(4 * scale * ratio)).data;
        for (let j = 0; j < data.length; j += 4) if (color.every((value, k) => Math.abs(data[j + k] - value) <= 5)) return true;
        return false;
      });
    });
    assert.deepEqual(strips, [true, true, true, true], 'board strips actually use the posted order at the authored board location');
    await page.locator('#map-overview').click();
  }
  await page.locator('#next-afternoon').click(); await page.locator('#programme-remove-art').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'programme-add-art');
  assert.equal(await page.locator('#programme-publish').isDisabled(), true);
  await page.locator('#programme-view').click(); assert.equal(await page.locator('#posted-programme li').count(), 4);
  await page.locator('#programme-poster-close').click();
  await page.reload(); await page.locator('#begin').click();
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot().programme), { order: ['beats', 'pause', 'stories'], published: ['beats', 'pause', 'stories', 'art'] });
  await page.locator('#neighbors-button').click(); await page.locator('#neighbor-dez').click();
  await page.locator('#dez-panel').waitFor();
  assert.match(await page.locator('.programme-response').textContent(), /start with a rhythm/);
  await page.locator('#close-modal').click();
  await page.locator('#journal-button').click(); await page.locator('#journal-programme').click();
  await page.locator('#programme-add-art').click();
  await page.locator('#programme-up-stories').click(); await page.locator('#programme-up-stories').click();
  await focusVisible();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'programme-down-stories');
  await page.screenshot({ path: `artifacts/programme-${choice}-editor.png`, fullPage: true });
  await page.locator('#programme-publish').click(); assert.match(await page.locator('#modal-title').textContent(), /Stories open/);
  await page.locator('#programme-poster-close').click();
  const after = await page.evaluate(() => window.tenderloin.snapshot());
  assert.deepEqual(after.epilogue, before.epilogue); assert.equal(after.opened, true); assert.deepEqual(after.optional, before.optional);
  for (const field of ['layout', 'furniture', 'litter', 'mural', 'soundcheck', 'history', 'blackhawk']) assert.deepEqual(after[field], before[field]);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  evidence.push({ programme: choice, draftAndPublishedReload: 'pass; partial draft preserves prior poster/responses', quietIntervalConstraint: 'blocked order, keyboard reorder, successful post', revision: 'stories-first replaces posted order; core/keepsake/optional unchanged', visibleWorldBoard: 'backing-store hash changed on publication', neighbourDialogue: 'actual walk to Dez uses published snapshot', responsive: `${await page.evaluate(() => innerWidth)}px no horizontal/modal overflow` });
}
async function hostingCheck(page, choice) {
  const before = await page.evaluate(() => window.tenderloin.snapshot());
  // The narrow branch starts art first, testing a different valid programme from the desktop branch.
  if (choice === 'floor') {
    await page.locator('#next-afternoon').click();
    for (let i = 0; i < 3; i++) await page.locator('#programme-up-art').click();
    await page.locator('#programme-publish').click(); await page.locator('#programme-poster-close').click();
  }
  const order = await page.evaluate(() => window.tenderloin.snapshot().programme.published);
  await page.locator('#host-afternoon').click(); assert.equal(await page.evaluate(() => document.activeElement.id), 'modal-title');
  await page.locator('#host-begin').click();
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot().hosting.order), order);
  const focusVisible = async () => assert.equal(await page.evaluate(() => {
    const a = document.activeElement.getBoundingClientRect(), m = document.querySelector('#modal').getBoundingClientRect();
    return a.top >= m.top && a.bottom <= m.bottom && a.left >= m.left && a.right <= m.right;
  }), true);
  await focusVisible();
  for (const id of order) {
    assert.match(await page.locator('#modal-title').textContent(), new RegExp(({ stories: 'Story circle', beats: 'Rhythm workshop', pause: 'Quiet interval', art: 'Shared art panel' })[id]));
    if (id === 'stories') await page.locator(`#host-story-${choice === 'table' ? 'future' : 'memory'}`).click();
    if (id === 'beats') {
      if (choice === 'table') { for (const i of [0, 2, 4, 6]) await page.locator(`#host-beat-${i}`).click(); assert.match(await page.locator('#host-complete').textContent(), /listening round/); }
      else { await page.locator('#host-beat-1').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('#host-beat-1').getAttribute('aria-pressed'), 'true'); }
    }
    if (id === 'pause') {
      await page.locator(`#host-quiet-${choice === 'table' ? 'pairs' : 'arc'}`).click();
      await page.locator('#host-close').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'host-afternoon');
      await page.locator('#map-overview').click(); await page.screenshot({ path: `artifacts/hosting-${choice}-quiet-world.png`, fullPage: true });
      await page.locator('#host-afternoon').click();
    }
    if (id === 'art') {
      await page.locator('#host-tile-0').focus(); await page.keyboard.press('Enter');
      await page.locator('#host-palette-cool').click(); await focusVisible();
      await page.waitForFunction(() => document.querySelector('.host-art')?.naturalWidth === 360);
      const artBefore = await page.locator('.host-art').getAttribute('src');
      await page.screenshot({ path: `artifacts/hosting-${choice}-art.png`, fullPage: true });
      await page.keyboard.press('Escape'); await page.waitForFunction(() => document.activeElement.id === 'host-afternoon');
      await page.reload(); await page.locator('#begin').click();
      await page.locator('#journal-button').click(); await page.locator('#journal-host').click();
      assert.equal(await page.locator('.host-art').getAttribute('src'), artBefore); assert.equal(await page.locator('#host-palette-cool').getAttribute('aria-pressed'), 'true');
    }
    assert.equal(await page.locator('#modal').evaluate(e => e.scrollWidth <= e.clientWidth), true);
    await page.locator('#host-complete').click(); assert.equal(await page.evaluate(() => document.activeElement.id), 'modal-title'); await focusVisible();
    if (id === order[0]) {
      // A later published revision is allowed, but cannot change this event's copied order/progress.
      await page.locator('#host-close').click(); await page.locator('#next-afternoon').click();
      await page.locator('#programme-remove-art').click(); await page.locator('#programme-add-art').click();
      if (!await page.locator('#programme-publish').isDisabled()) { await page.locator('#programme-publish').click(); await page.locator('#programme-poster-close').click(); }
      else await page.locator('#programme-close').click();
      await page.locator('#host-afternoon').click();
      assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot().hosting.order), order);
      assert.equal(await page.evaluate(() => window.tenderloin.snapshot().hosting.results.length), 1);
    }
  }
  assert.match(await page.locator('#modal-title').textContent(), /We made room for another afternoon/);
  assert.equal(await page.locator('.host-memories li').count(), 4);
  await page.screenshot({ path: `artifacts/hosting-${choice}-finished.png`, fullPage: true });
  await page.locator('#close-modal').click(); assert.equal(await page.evaluate(() => document.activeElement.id), 'host-afternoon');
  await page.reload(); await page.locator('#begin').click(); await page.locator('#host-afternoon').click();
  assert.equal(await page.locator('#host-begin').count(), 0); assert.equal(await page.locator('#host-complete').count(), 0);
  await page.locator('#host-close').click();
  const after = await page.evaluate(() => window.tenderloin.snapshot());
  for (const field of ['opened', 'epilogue', 'furniture', 'litter', 'mural', 'layout', 'soundcheck', 'history', 'blackhawk', 'optional']) assert.deepEqual(after[field], before[field]);
  assert.equal(after.hosting.results.length, 4);
  assert.equal(await page.locator('#civic-hour').isVisible(), true, 'finishing the actual second gathering unlocks the later civic event');
  await page.locator('#neighbors-button').click(); await page.locator('#neighbor-celeste').click(); await page.locator('#return-chat-close').waitFor();
  assert.match(await page.locator('.programme-response').textContent(), /cool panel/); await page.locator('#close-modal').click();
  evidence.push({ hosting: choice, width: await page.evaluate(() => innerWidth), order, completionAndReload: 'four activities, no forced performance, saved art draft/palette and result memory', isolation: 'first preparations/ending/keepsake/optional/history retained; later programme does not rewrite event', keyboardFocus: 'Enter edits, Escape/x/explicit close return to event entry; visible controls/headings', neighbourResponse: 'Celeste remembers the completed cool panel in actual walk-to conversation' });
}
async function hostingWithPendingLoans(page) {
  await start(page); await finish(page, 'table');
  await page.locator('#next-afternoon').click();
  for (const id of ['beats', 'pause', 'art', 'stories']) await page.locator(`#programme-add-${id}`).click();
  await page.locator('#programme-publish').click(); await page.locator('#programme-host').click(); await page.locator('#host-begin').click();
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().epilogue.packing), false);
  await page.locator('#host-complete').dblclick();
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().hosting.results.length), 1, 'double-click may commit only its original activity');
  await page.locator('#host-complete').dispatchEvent('click', { detail: 2 });
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().hosting.results.length), 1, 'a second click delivered to the replacement button is ignored');
  await page.locator('#host-quiet-pairs').click(); await page.locator('#host-close').click();
  await page.locator('#map-overview').click(); await page.screenshot({ path: 'artifacts/hosting-pending-loans-live-world.png', fullPage: true });
  await page.locator('#start-pack').click(); await page.locator('#confirm-pack').click();
  assert.match(await page.locator('.afterglow-heading h2').textContent(), /thank-you lap/);
  for (const id of ['table', 'paint-case']) {
    await page.locator(`#visit-${id}`).click(); await page.locator('#return-event-loan').waitFor();
    assert.equal(await page.locator('.programme-response').count(), 1);
    await page.locator('#return-event-loan').click(); assert.equal(await page.locator(`#visit-${id}`).isDisabled(), true);
  }
  const expectedEpilogue = await page.evaluate(() => window.tenderloin.snapshot().epilogue);
  await page.locator('#host-afternoon').click();
  assert.match(await page.locator('#modal-title').textContent(), /Quiet interval/);
  assert.equal(await page.locator('#host-quiet-pairs').getAttribute('aria-pressed'), 'true');
  await page.locator('#host-complete').click(); await page.locator('#host-palette-cool').click(); await page.locator('#host-complete').click();
  await page.locator('#host-story-future').click(); await page.locator('#host-complete').click(); await page.locator('#host-close').click();
  assert.deepEqual(await page.evaluate(() => window.tenderloin.snapshot().epilogue), expectedEpilogue);
  assert.equal(await page.locator('#visit-speaker').isDisabled(), false, 'pending original speaker remains returnable after new gathering');
  assert.equal(await page.evaluate(() => window.tenderloin.snapshot().hosting.results.length), 4);
  evidence.push({ hostingWithPendingLoans: 'actual opening, start new event before packing, real double-click and replacement detail2 do not skip; pack and return table/paint case during quiet interval, original actions/headline stay reachable, resume and finish without returning speaker' });
}
try {
  base = await startServer();
  const identity = await fetch(base + '/__build'); assert.equal(identity.status, 200);
  assert.deepEqual(await identity.json(), await buildInfo(), 'The browser must test the source in this checkout');
  const channel = process.env.BROWSER_CHANNEL || 'chrome', isFirefox = channel === 'firefox';
  // Playwright's BiDi Firefox ignores the reducedMotion context option, so the preference supplies it.
  browser = isFirefox ? await firefox.launch({ channel: 'moz-firefox', headless: true, firefoxUserPrefs: { 'ui.prefersReducedMotion': 1 } }) : await chromium.launch({ ...(channel === 'bundled' ? {} : { channel }), headless: true });
  for (const choice of ['table', 'floor']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await start(page);
    await page.locator('#world').focus(); await page.keyboard.press('e'); assert.equal(await page.locator('#choose-table').isVisible(), true); await page.locator('#close-modal').click();
    await finish(page, choice);
    await page.locator('#sound-toggle').click(); await page.waitForFunction(() => document.querySelector('#sound-toggle').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
    await page.locator('#sound-toggle').click(); await page.waitForFunction(() => document.querySelector('#sound-toggle').getAttribute('aria-pressed') === 'false', null, { timeout: 5000 });
    const before = await page.evaluate(() => window.tenderloin.snapshot().player.x);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200); await page.keyboard.up('ArrowLeft');
    assert.ok(await page.evaluate(() => window.tenderloin.snapshot().player.x) < before, 'movement after music-button focus');
    assert.deepEqual(errors, []); evidence.push({ layout: choice, completion: 'pass', saveReload: 'pass', blockedRoute: 'pass', keyboardMovement: 'pass', eKeyInteraction: 'pass', enterGridPlacementAndFocus: 'pass', audioToggle: 'pass', movementAfterAudioButton: 'pass', pageErrors: errors });
    await epilogue(page, choice); assert.deepEqual(errors, []);
    await programmeCheck(page, choice); assert.deepEqual(errors, []);
    await hostingCheck(page, choice); assert.deepEqual(errors, []);
    await context.close();
  }
  const pendingContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const pendingPage = await pendingContext.newPage(), pendingErrors = [];
  pendingPage.on('pageerror', e => pendingErrors.push(e.message)); await hostingWithPendingLoans(pendingPage); assert.deepEqual(pendingErrors, []); await pendingContext.close();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...(isFirefox ? {} : { isMobile: true }), hasTouch: true, reducedMotion: 'reduce' });
  const mobile = await context.newPage(); await start(mobile);
  const mobileErrors = []; mobile.on('pageerror', e => mobileErrors.push(e.message));
  const initialView = await mobile.evaluate(() => window.tenderloin.location());
  const toastBox = await mobile.locator('#toast').boundingBox(), toolbarBox = await mobile.locator('.camera-controls').boundingBox();
  assert.ok(toastBox.y >= toolbarBox.y + toolbarBox.height, 'toast must not obscure camera controls');
  assert.ok(initialView.scale >= .85, 'phone starts with a legible close view');
  await mobile.locator('#zoom-in').click();
  assert.ok(await mobile.evaluate(() => window.tenderloin.location().scale) > initialView.scale);
  await mobile.locator('#map-overview').click();
  const fullView = await mobile.evaluate(() => window.tenderloin.location()); assert.ok(fullView.scale < initialView.scale);
  await mobile.locator('#recenter').click();
  assert.equal(await mobile.locator('#recenter').getAttribute('aria-pressed'), 'true');
  const mapBox = await mobile.locator('#world').boundingBox();
  const beforeDrag = await mobile.evaluate(() => window.tenderloin.snapshot().player);
  await mobile.mouse.move(mapBox.x + 170, mapBox.y + 290); await mobile.mouse.down();
  await mobile.mouse.move(mapBox.x + 240, mapBox.y + 310, { steps: 8 }); await mobile.mouse.up();
  assert.equal(await mobile.locator('#recenter').getAttribute('aria-pressed'), 'false');
  await mobile.waitForTimeout(250);
  assert.deepEqual(await mobile.evaluate(() => window.tenderloin.snapshot().player), beforeDrag, 'drag pans without starting a walk');
  assert.equal(await mobile.locator('#modal').evaluate(n => n.open), false);
  // Multi-touch and touchCancel need the Chromium DevTools Protocol; Firefox runs skip this block and say so in the evidence.
  if (!isFirefox) { const touch = await context.newCDPSession(mobile);
  const touchPoint = { x: Math.round(mapBox.x + 150), y: Math.round(mapBox.y + 290), id: 1 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touchPoint, x: touchPoint.x + 60 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForTimeout(200);
  assert.deepEqual(await mobile.evaluate(() => window.tenderloin.snapshot().player), beforeDrag, 'touch drag does not start a walk');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint, { ...touchPoint, id: 2, x: touchPoint.x + 40 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await mobile.waitForTimeout(200);
  assert.deepEqual(await mobile.evaluate(() => window.tenderloin.snapshot().player), beforeDrag, 'multi-touch and cancelled touch do not activate the map');
  await touch.detach(); }
  await mobile.locator('#neighbors-button').click(); await dialogFocus(mobile);
  assert.equal(await mobile.locator('.neighbor-directory button').count(), 5);
  for (const id of ['neighbor-bea', 'neighbor-celeste', 'neighbor-rook', 'neighbor-dez', 'neighbor-thanh', 'neighbors-close']) {
    assert.equal(await mobile.evaluate(() => document.activeElement.id), id); await mobile.keyboard.press('Tab');
  }
  await mobile.keyboard.press('Escape'); await mobile.waitForFunction(() => !document.querySelector('#modal').open && document.activeElement.id === 'world');
  await mobile.locator('#neighbors-button').click();
  await mobile.locator('#neighbor-dez').focus(); await mobile.keyboard.press('Enter');
  await mobile.locator('#stop-walking').waitFor({ state: 'visible' });
  assert.equal(await mobile.locator('#stop-walking').isEnabled(), true);
  assert.match(await mobile.locator('#route-status').textContent(), /Walking to Dez/);
  assert.equal(await mobile.locator('#recenter').getAttribute('aria-pressed'), 'true');
  await mobile.locator('#world-prompt').click();
  assert.equal(await mobile.locator('#modal').evaluate(e => e.open), false, 'walking prompt must not open a passing neighbor');
  assert.equal(await mobile.locator('#stop-walking').isEnabled(), true);
  await mobile.locator('#stop-walking').click();
  const stopped = await mobile.evaluate(() => window.tenderloin.snapshot().player);
  await mobile.waitForTimeout(250);
  assert.deepEqual(await mobile.evaluate(() => window.tenderloin.snapshot().player), stopped, 'stopping cancels route');
  await mobile.locator('#neighbors-button').click(); await mobile.locator('#neighbor-thanh').click();
  await mobile.locator('#talk-close').waitFor(); await dialogFocus(mobile);
  assert.equal(await mobile.locator('#modal-title').textContent(), 'Thanh');
  assert.deepEqual(await mobile.evaluate(() => Object.keys(window.tenderloin.snapshot().player).sort()), ['x', 'y']);
  assert.equal(await mobile.locator('#stop-walking').isDisabled(), true, 'arrival immediately clears route controls');
  await mobile.locator('#close-modal').click();
  await mobile.locator('#neighbors-button').click(); await mobile.locator('#neighbor-bea').click();
  await mobile.locator('#choose-table').waitFor(); await mobile.locator('#close-modal').click();
  await mobile.locator('#map-overview').click();
  const rookView = await mobile.evaluate(() => window.tenderloin.location());
  await mobile.locator('#world').click({ position: { x: rookView.x + 578 * rookView.scale, y: rookView.y + 18 * rookView.scale - 50.5 * Math.max(1, rookView.scale) } });
  await mobile.waitForFunction(() => document.querySelector('#modal').open && document.querySelector('#modal-title')?.textContent === 'Rook');
  await dialogFocus(mobile); await mobile.locator('#close-modal').click();
  for (let i = 0; i < 15 && await mobile.locator('#zoom-in').isEnabled(); i++) await mobile.locator('#zoom-in').click();
  assert.equal(await mobile.evaluate(() => document.activeElement.id), 'zoom-out');
  for (let i = 0; i < 15 && await mobile.locator('#zoom-out').isEnabled(); i++) await mobile.locator('#zoom-out').click();
  assert.equal(await mobile.evaluate(() => document.activeElement.id), 'zoom-in');
  await mobile.locator('#neighbors-button').click(); await mobile.locator('#neighbor-bea').click();
  await mobile.locator('#choose-table').waitFor(); await mobile.locator('#close-modal').click();
  await mobile.locator('#recenter').click();
  evidence.push({ mobileNavigation: 'close view, zoom, full block, follow, mouse/touch drag without movement, ' + (isFirefox ? 'multi-touch and cancelled touch suppression skipped (Chromium only), ' : 'multi-touch and cancelled touch suppression, ') + 'five named neighbor buttons, keyboard route selection, stop, arrival dialog focus pass', pageErrors: mobileErrors });
  assert.deepEqual(mobileErrors, []);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.screenshot({ path: 'artifacts/first-playable-mobile.png', fullPage: true });
  await mobile.locator('#world-prompt').click(); assert.equal(await mobile.locator('#choose-table').isVisible(), true); await mobile.locator('#close-modal').click();
  await layout(mobile, 'floor'); assert.equal(await mobile.evaluate(() => window.tenderloin.snapshot().layout), 'floor');
  await mobile.locator('#settings-button').click(); await mobile.locator('#restart').click(); await mobile.locator('#cancel-restart').click();
  assert.equal(await mobile.evaluate(() => window.tenderloin.snapshot().layout), 'floor');
  await mobile.locator('#close-modal').click();
  await localSoundtrack(mobile); assert.deepEqual(mobileErrors, []);
  await historyWalkCheck(mobile); assert.deepEqual(mobileErrors, []);
  await livingDistrictCheck(mobile); assert.deepEqual(mobileErrors, []);
  // Corrupt saves are preserved until an explicit recovery action.
  // Seed before startup; injecting just before reload is replaced by the old page's normal pagehide save.
  await mobile.addInitScript(() => localStorage.setItem('tenderloin-redux.save.v1', '{broken'));
  await mobile.reload(); await mobile.locator('#begin').click(); await mobile.locator('#task-layout').click(); await mobile.locator('#choose-table').click();
  assert.equal(await mobile.evaluate(() => localStorage.getItem('tenderloin-redux.save.v1')), '{broken');
  await mobile.locator('#close-modal').click(); await mobile.locator('#settings-button').click(); await mobile.locator('#recover-save').click();
  assert.equal(await mobile.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.save.v1')).core.layout), 'table');
  evidence.push({ mobile390: 'no horizontal overflow', touchInteractionPrompt: 'pass', touchLayout: 'pass', restartCancellation: 'pass', corruptSaveRecovery: 'pass' });
  await context.close();
  const westContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const westSave = initialState(); westSave.player = { x: BLACK_HAWK.x, y: BLACK_HAWK.y };
  await westContext.addInitScript(save => localStorage.setItem('tenderloin-redux.save.v1', JSON.stringify({ version: 1, core: save, optional: {} })), westSave);
  const westPage = await westContext.newPage(); await start(westPage);
  assert.equal(await westPage.locator('#camera-status').textContent(), 'Following you');
  assert.ok(await westPage.evaluate(() => window.tenderloin.snapshot().player.x) < -2100);
  await westPage.locator('#world').focus(); await westPage.keyboard.press('e'); await westPage.locator('#blackhawk-close').waitFor();
  await westPage.locator('#blackhawk-return').click(); await westPage.waitForFunction(() => window.tenderloin.snapshot().player.x > -2000);
  await westPage.locator('#history-walk-button').click(); await westPage.locator('#walk-map').click();
  assert.match(await westPage.locator('#toast').textContent(), /Stopped walking/);
  assert.equal(await westPage.locator('#stop-walking').isDisabled(), true);
  const routeView = await westPage.evaluate(() => window.tenderloin.location());
  await westPage.locator('#world').click({ position: { x: routeView.x + BLACK_HAWK.x * routeView.scale, y: routeView.y + BLACK_HAWK.y * routeView.scale - 51.5 * Math.max(1, routeView.scale) } });
  await westPage.locator('#blackhawk-close').waitFor();
  evidence.push({ desktopWesternSave: 'World/init follows saved player, E opens note, whole-route cancel announces stop, route-overview chip walks to note' });
  await westContext.close();
  const routeFailureContext = await browser.newContext(), routeFailurePage = await routeFailureContext.newPage();
  const missingWest = JSON.parse(await readFile('public/data/streets.osm.json', 'utf8'));
  missingWest.ways = missingWest.ways.filter(w => w.geometry.every(p => p.lon > -122.4142));
  await routeFailureContext.route('**/data/streets.osm.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(missingWest) }));
  await start(routeFailurePage); await routeFailurePage.locator('#history-walk-button').click(); await routeFailurePage.locator('#walk-blackhawk').click();
  assert.equal(await routeFailurePage.locator('#modal').evaluate(e => e.open), false);
  assert.match(await routeFailurePage.locator('#toast').textContent(), /route to that stop is unavailable/);
  assert.equal(await routeFailurePage.locator('#toast').evaluate(e => e.classList.contains('show')), true);
  evidence.push({ syntheticMissingWestRoute: 'failed route closes modal and exposes visible feedback; synthetic incomplete QA data, not the shipped street network' });
  await routeFailureContext.close();
  const cityContext = await browser.newContext({ viewport: { width: 320, height: 1000 }, reducedMotion: 'reduce' });
  const cityPage = await cityContext.newPage(); let cityAttempts = 0;
  const cityFeature = await readFile('public/data/transgender-district.geojson', 'utf8');
  await cityContext.route('**/data/transgender-district.geojson', route => {
    cityAttempts++;
    return route.fulfill({ contentType: 'application/json', body: cityAttempts === 1 ? '{"type":"FeatureCollection","features":[]}' : cityFeature });
  });
  await start(cityPage); await cityPage.locator('#district-button').click();
  await cityPage.locator('#district-retry').waitFor({ state: 'visible' });
  assert.match(await cityPage.locator('#district-state').textContent(), /could not load/);
  assert.equal(await cityPage.locator('#district-layer').isDisabled(), true);
  await cityPage.locator('#district-close').click(); await cityPage.locator('#district-button').click();
  assert.equal(cityAttempts, 1, 'reopening an error does not silently retry');
  assert.equal(await cityPage.evaluate(() => document.activeElement.id), 'district-retry');
  await cityPage.locator('#district-retry').click(); await cityPage.waitForFunction(() => !document.querySelector('#district-layer').disabled);
  assert.equal(cityAttempts, 2); assert.equal(await cityPage.evaluate(() => document.activeElement.id), 'modal-title');
  await cityPage.locator('#district-layer').click(); assert.equal(await cityPage.locator('#district-legend').isVisible(), true);
  assert.equal(await cityPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await cityPage.screenshot({ path: 'artifacts/living-district-layer-320.png', fullPage: true });
  await cityContext.close();
  const lateCityContext = await browser.newContext(); const lateCityPage = await lateCityContext.newPage();
  let releaseCity; const cityHeld = new Promise(resolve => {
    lateCityContext.route('**/data/transgender-district.geojson', async route => {
      await new Promise(release => { releaseCity = release; resolve(); });
      await route.fulfill({ contentType: 'application/json', body: cityFeature });
    });
  });
  await start(lateCityPage); await lateCityPage.locator('#district-button').click(); await cityHeld;
  await lateCityPage.locator('#close-modal').click(); await lateCityPage.locator('#neighbors-button').click();
  const lateFocus = await lateCityPage.evaluate(() => document.activeElement.id);
  const lateResponse = lateCityPage.waitForResponse('**/data/transgender-district.geojson'); releaseCity(); await lateResponse;
  await lateCityPage.waitForTimeout(100);
  assert.equal(await lateCityPage.locator('#modal-title').textContent(), 'Meet the neighbors');
  assert.equal(await lateCityPage.evaluate(() => document.activeElement.id), lateFocus);
  assert.equal(await lateCityPage.locator('#district-legend').isVisible(), false);
  await lateCityContext.close();
  const failedCityContext = await browser.newContext(), failedCityPage = await failedCityContext.newPage();
  await failedCityContext.route('**/data/transgender-district.geojson', route => route.abort());
  await start(failedCityPage); await failedCityPage.locator('#district-button').click(); await failedCityPage.locator('#district-retry').waitFor({ state: 'visible' });
  await failedCityPage.locator('#district-close').click(); await failedCityPage.locator('#task-layout').click(); await failedCityPage.locator('#choose-floor').click();
  assert.equal(await failedCityPage.evaluate(() => window.tenderloin.snapshot().layout), 'floor');
  await failedCityContext.close();
  const stalledCityContext = await browser.newContext(), stalledCityPage = await stalledCityContext.newPage();
  await stalledCityContext.route('**/data/transgender-district.geojson', () => {});
  await start(stalledCityPage); const cityStart = Date.now(); await stalledCityPage.locator('#district-button').click();
  await stalledCityPage.locator('#district-retry').waitFor({ state: 'visible', timeout: 15000 });
  assert.ok(Date.now() - cityStart >= 9000); assert.match(await stalledCityPage.locator('#district-state').textContent(), /could not load/);
  assert.equal(await stalledCityPage.locator('#district-layer').isDisabled(), true); await stalledCityContext.close();
  evidence.push({ cityLayerFailure: 'malformed data rejected, one explicit retry succeeds, error reopening does not refetch, focused Retry removal returns to heading, 320px no overflow, late response cannot replace neighbor dialog/focus or enable layer, aborted city request leaves core playable; stalled request times out and exposes Retry' });
  const failedContext = await browser.newContext(), failedPage = await failedContext.newPage(), failedPageErrors = [];
  failedPage.on('pageerror', e => failedPageErrors.push(e.message));
  await failedContext.route('**/data/streets.osm.json', route => route.abort()); await failedPage.goto(base); await failedPage.locator('#retry-load').waitFor();
  await failedPage.locator('#settings-button').click(); await failedPage.locator('#restart').click(); await failedPage.locator('#confirm-restart').click();
  assert.equal(await failedPage.evaluate(() => JSON.parse(localStorage.getItem('tenderloin-redux.save.v1')).core.opened), false); assert.deepEqual(failedPageErrors, []);
  evidence.push({ failedMapLoadRestart: 'pass', unhandledPageErrors: failedPageErrors }); await failedContext.close();
  const settingsContext = await browser.newContext(); await settingsContext.addInitScript(() => localStorage.setItem('tenderloin-redux.settings.v1', 'null'));
  const settingsPage = await settingsContext.newPage(); await start(settingsPage); assert.doesNotMatch(await settingsPage.locator('#save-status').textContent(), /unavailable/);
  evidence.push({ nullSettingsPreserveSaveAvailability: 'pass' }); await settingsContext.close();
  const partialContext = await browser.newContext(), partialPage = await partialContext.newPage(); await start(partialPage);
  await partialPage.locator('#task-layout').click(); await partialPage.locator('#choose-table').click(); await partialPage.locator('#cell-0-3').click(); await partialPage.locator('#layout-done').click();
  await partialPage.reload(); await partialPage.locator('#begin').click(); await partialPage.locator('#task-layout').click(); await partialPage.locator('#choose-table').click();
  assert.equal(await partialPage.locator('#tool-seats').getAttribute('aria-pressed'), 'true'); await partialPage.locator('#close-modal').click();
  await partialPage.locator('#task-mural').click(); await partialPage.locator('#mcell-0-0').click(); await partialPage.locator('#mural-done').click();
  await partialPage.reload(); await partialPage.locator('#begin').click(); await partialPage.locator('#task-mural').click();
  assert.equal(await partialPage.locator('#motif-wave').getAttribute('aria-pressed'), 'true');
  evidence.push({ partialLayoutResumeSelectsMissingSupply: 'pass', partialMuralResumeSelectsMissingMotif: 'pass' }); await partialContext.close();
  const privateResponse = await fetch(base + '/package.json'); assert.equal(privateResponse.status, 404);
  await writeFile('artifacts/browser-results.json', JSON.stringify({ testedAt: new Date().toISOString(), browser: await browser.version(), channel, source: await buildInfo(), isolatedServer: !process.env.BASE_URL, evidence, staticRootIsolation: 'pass', limits: 'Automated ' + (channel === 'chrome' ? 'Chrome' : channel) + ' checks' + (isFirefox ? ' (Chromium-only multi-touch suppression skipped)' : '') + '; not a full keyboard-only completion audit, human playtest, screen reader audit, audible musical-quality assessment or surveyed street verification.' }, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); ownedServer?.kill(); }
