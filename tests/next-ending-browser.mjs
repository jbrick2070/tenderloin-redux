// Browser check of browser-next/ending/ui.js on a stand-alone harness page: the host below stands in for game.js, which opens the
// same screens (tests/next-browser.mjs drives them through the game). npm run next:ending, with PLAYWRIGHT_MODULE as for
// tests/next-browser.mjs. Files are served from this repository through page.route on http://ending.test/, so the page makes no
// other request and needs no server.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url)), out = path.join(root, 'artifacts', 'next-ending');
await mkdir(out, { recursive: true });
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
const HARNESS = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/browser-next/style.css"></head>
<body><main><button id="host-afternoon" class="secondary-button">Remember our second gathering</button><button id="civic-hour" class="secondary-button">Remember our listening hour</button><button id="film-shoot" class="secondary-button">Screen our little film ↗</button><p id="toast" role="status"></p></main>
<dialog id="modal" aria-labelledby="modal-title"><div id="modal-body"></div><div id="modal-status" class="sr-only" role="status" aria-live="polite"></div><button class="modal-close" id="close-modal" aria-label="Close dialog">×</button></dialog>
<script type="module">
import { parseGodotSave, buildGodotSave, sceneAdmission } from '/browser-next/godot-save.js';
import { initialState, applyAction } from '/browser-next/core.js';
import { installPressSettle } from '/browser-next/press-settle.js';
import { createEnding } from '/browser-next/ending/ui.js';
import { filmDoneEnvelope } from '/tests/next-fixtures.mjs';
const seed = parseGodotSave(JSON.stringify(filmDoneEnvelope({ mural_scenes: { left: 'music' } })), { initialState });
let state = seed.state, envelope = seed.envelope, music = false;
const modal = document.getElementById('modal'), body = document.getElementById('modal-body');
const settle = installPressSettle(document, window);
window.writes = [];
const host = {
  doc: document, win: window, modal, settle, getState: () => state,
  show(html) { body.innerHTML = html; if (!modal.open) modal.showModal(); },
  close(target) { modal.close(); (target || document.body).focus?.({ preventScroll: true }); },
  status(text) { document.getElementById('modal-status').textContent = text; }, toast(text) { document.getElementById('toast').textContent = text; },
  stopWalk() {}, reducedMotion: () => window.reduced === true, chapterText: () => '',
  act(action) { const next = applyAction(state, action); if (next === state) return false; const outcome = buildGodotSave(envelope, next); state = next; if (outcome.ok) { envelope = outcome.envelope; window.writes.push(outcome.raw); } return true; },
  sceneAdmission: next => sceneAdmission(envelope, state, next), saveReason: () => '',
  music: { label: () => music ? 'Music: On' : 'Music: Off', on: () => music, toggle: async () => { music = !music; return music ? 'Music playing: 80 BPM Sketch (bass (1/4 stems)).' : 'Music paused.'; } },
  filmButtonLabel: () => 'Screen our little film', openDraft() {}, openPosted() { modal.close(); }, openMural() { modal.close(); },
};
window.ending = createEnding(host);
window.settle = settle;
window.envelopeRaw = () => JSON.stringify(envelope);
window.ready = true;
</script></body></html>`;

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
const failures = [];
async function check(name, fn) { try { await fn(); console.log(`ok ${name}`); } catch (error) { failures.push(name); console.log(`not ok ${name}\n${error.stack}`); } }
async function newPage(viewport, touch = false) {
  const context = await browser.newContext({ viewport, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const page = await context.newPage(), external = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.host !== 'ending.test') { external.push(url.href); return route.abort(); }
    if (url.pathname === '/') return route.fulfill({ body: HARNESS, contentType: 'text/html' });
    try { route.fulfill({ body: await readFile(path.join(root, decodeURIComponent(url.pathname))), contentType: TYPES[path.extname(url.pathname)] || 'application/octet-stream' }); }
    catch { route.fulfill({ status: 404, body: '' }); }
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.__tenderloinPressSettleMs = 0; });
  await page.goto('http://ending.test/'); await page.waitForFunction(() => window.ready === true);
  return { page, context, external, errors };
}
const text = (page, sel) => page.locator(sel).innerText();
const click = (page, id) => page.locator(`#${id}`).click();
async function layout(page, label) {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('#modal button')) { const r = b.getBoundingClientRect(); if (r.width && r.height && (r.width < 44 - 0.5 || r.height < 44 - 0.5)) out.push(`${b.id || b.textContent} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`); }
    const m = document.getElementById('modal'), d = document.documentElement;
    if (m.scrollWidth > m.clientWidth + 1) out.push(`dialog overflow ${m.scrollWidth} > ${m.clientWidth}`);
    if (d.scrollWidth > window.innerWidth + 1) out.push(`page overflow ${d.scrollWidth}`);
    return out;
  });
  assert.deepEqual(bad, [], `${label}: 44 px targets and no horizontal overflow`);
}

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const w = viewport.width;
  await check(`${w} the whole ending chain`, async () => {
    const { page, context, external, errors } = await newPage(viewport, w < 600);
    const before = await page.evaluate(() => window.envelopeRaw());
    // 1. Hosted review: four cards, and Follow is "Listening complete" once the Listening Hour is done.
    await page.evaluate(() => window.ending.open('hosted'));
    assert.equal(await page.locator('#modal .ending-cards button').count(), 4);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'hosted-card-stories');
    await click(page, 'hosted-card-beats');
    assert.match(await text(page, '#ending-reader'), /^Dez: "You gave us 4 taps in eight slots/);
    assert.equal(await page.locator('#hosted-follow').isDisabled(), true);
    assert.equal(await text(page, '#hosted-follow'), 'Listening complete');
    await layout(page, 'hosted'); await page.screenshot({ path: path.join(out, `${w}-1-hosted.png`), fullPage: true });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.getElementById('modal').open), false);
    assert.equal(await text(page, '#toast'), 'Back to the block. Your completed gathering and Listening Hour remain available.');
    // 2. Gather again: three handoffs, finish, Escape keeps the visit.
    await page.evaluate(() => window.ending.open('gather'));
    for (const id of ['gather-choice-0', 'gather-choice-1', 'gather-choice-0']) await click(page, id);
    await click(page, 'gather-previous'); await click(page, 'gather-next');
    assert.equal(await text(page, '#gather-next'), 'Finish gathering');
    await click(page, 'gather-next');
    assert.equal(await page.locator('#gather-next').isDisabled(), true);
    assert.equal(await text(page, '#gather-choice-0'), 'New visit');
    await layout(page, 'gather'); await page.screenshot({ path: path.join(out, `${w}-2-gather.png`), fullPage: true });
    await page.keyboard.press('Escape');
    assert.match(await text(page, '#toast'), /then Revisit gathering\. Reload clears this visit/);
    assert.equal(await page.evaluate(() => window.ending.gatherLabel()), 'Revisit gathering');
    // 4. Screening: frame 3 is kept for the visit across close and reopen.
    await page.evaluate(() => window.ending.open('screening'));
    await click(page, 'screen-frame-2'); await click(page, 'screen-back');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'film-shoot');
    await page.evaluate(() => window.ending.open('screening'));
    assert.equal(await page.locator('#screen-frame-2').getAttribute('aria-pressed'), 'true');
    assert.equal(await text(page, '#modal-title'), 'The Open Seat | 3 / 3');
    await layout(page, 'screening'); await page.screenshot({ path: path.join(out, `${w}-4-screening.png`), fullPage: true });
    // 5. Bench: right, then left, then lift.
    await click(page, 'screen-helper');
    for (const id of ['bench-support-1', 'bench-support-0', 'bench-assist']) await click(page, id);
    assert.match(await text(page, '#ending-reader'), /^Dez: Your low display holds all three pictures/);
    await layout(page, 'bench'); await page.screenshot({ path: path.join(out, `${w}-5-bench.png`), fullPage: true });
    await click(page, 'bench-habitat');
    // 6-7. Room and departure.
    for (const [item, place] of [[0, 0], [2, 1], [1, 2]]) { await click(page, `room-item-${item}`); await click(page, `room-place-${place}`); await click(page, 'room-assist'); }
    assert.equal(await text(page, '#room-assist'), 'Welcome Thanh'); await click(page, 'room-assist');
    assert.equal(await text(page, '#room-assist'), 'Prepare together'); await click(page, 'room-assist');
    await layout(page, 'room'); await page.screenshot({ path: path.join(out, `${w}-6-room.png`), fullPage: true });
    await click(page, 'room-item-0'); await click(page, 'room-place-2'); await click(page, 'room-assist');
    assert.match(await text(page, '#ending-reader'), /Celeste: My link faces our art by entry\./);
    await click(page, 'room-place-0'); await click(page, 'room-assist');
    for (const [item, rel] of [[2, 1], [1, 2]]) { await click(page, `room-item-${item}`); await click(page, `room-place-${rel}`); await click(page, 'room-assist'); }
    assert.equal(await text(page, '#room-assist'), 'Ready together'); await click(page, 'room-assist');
    assert.equal(await text(page, '#room-assist'), 'Depart'); await click(page, 'room-assist');
    await click(page, 'room-place-0'); await click(page, 'room-place-1');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'room-detail');
    await layout(page, 'departure'); await page.screenshot({ path: path.join(out, `${w}-7-departure.png`), fullPage: true });
    await click(page, 'room-assist');
    // 8. The commons: walk (reduced motion hops), invite, gather, finale, memories and the return home.
    assert.equal(await page.locator('#orbit-figure > svg').count(), 1);
    const target = await page.locator('rect[data-target="1"]').boundingBox();
    assert.ok(target.width >= 43.5 && target.height >= 43.5, `floor target ${target.width}x${target.height}`);
    await page.evaluate(() => { window.reduced = true; });
    await click(page, 'orbit-1');
    const hop1 = await page.locator('[data-walker="player"]').getAttribute('transform');
    await page.waitForFunction(() => /You reached Film/.test(document.getElementById('ending-reader')?.innerText || ''), null, { timeout: 5000 });
    const seen = await page.locator('[data-walker="player"]').getAttribute('transform');
    assert.equal(seen, 'translate(562.00 330.00)'); assert.equal(hop1, 'translate(360.00 438.00)');
    await click(page, 'orbit-3');
    await page.waitForFunction(() => /Thanh has joined you/.test(document.getElementById('ending-reader')?.innerText || ''), null, { timeout: 5000 });
    assert.equal(await text(page, '#orbit-4'), 'Gather here');
    await layout(page, 'orbital'); await page.screenshot({ path: path.join(out, `${w}-8-orbital.png`), fullPage: true });
    await click(page, 'orbit-4'); await click(page, 'orbit-0');
    await click(page, 'orbit-2'); await click(page, 'orbit-1'); assert.match(await text(page, '#ending-reader'), /^Memories of this visit \| Film/);
    await click(page, 'orbit-3'); await click(page, 'orbit-0'); await click(page, 'orbit-1'); await click(page, 'orbit-1');
    assert.equal(await text(page, '#orbit-1'), 'Home now'); await click(page, 'orbit-1');
    assert.equal(await page.evaluate(() => document.getElementById('modal').open), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'film-shoot');
    assert.match(await text(page, '#toast'), /^You finished the imagined orbital afternoon/);
    // Reopening through the bench says Revisit finale, and the room opens straight into the commons.
    await page.evaluate(() => window.ending.open('bench'));
    assert.equal(await text(page, '#bench-habitat'), 'Revisit finale'); await click(page, 'bench-habitat');
    assert.equal(await page.locator('#orbit-figure').count(), 1);
    // Escape mid-walk stops movement and pauses the chapter.
    await page.evaluate(() => { window.reduced = false; }); await click(page, 'orbit-1'); await click(page, 'orbit-0');
    assert.equal(await page.evaluate(() => window.ending.snapshot().moving), true);
    await page.evaluate(() => dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(() => window.ending.snapshot().moving), false, 'window blur halts the walk');
    await click(page, 'orbit-2'); await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.ending.snapshot().moving), false);
    assert.match(await text(page, '#toast'), /^Future chapter paused\. Your return home is already complete this visit\./);
    // 9. Mural Stories: paint garden on the right, lift left; the only save writes are mural_scenes.
    await page.evaluate(() => window.ending.open('stories'));
    await click(page, 'scene-page'); await click(page, 'scene-choice-1'); await click(page, 'scene-target-1'); await click(page, 'scene-lift-0');
    assert.match(await text(page, '#ending-reader'), /^Saved in this browser\. Lifted the left scene\. Celeste: Growing Together on the right\./);
    await layout(page, 'stories'); await page.screenshot({ path: path.join(out, `${w}-9-stories.png`), fullPage: true });
    const after = JSON.parse(await page.evaluate(() => window.envelopeRaw())), was = JSON.parse(before);
    assert.deepEqual(after.mural_scenes, { right: 'garden' });
    assert.equal(await page.evaluate(() => window.writes.length), 2, 'two scene edits, two writes; nothing else in the chain wrote');
    for (const e of [after, was]) { delete e.mural_scenes; delete e.save_seq; }
    assert.equal(JSON.stringify(after), JSON.stringify(was));
    assert.deepEqual([external, errors], [[], []]);
    await context.close();
  });
  await check(`${w} one pointer gesture is one press`, async () => {
    const { page, context } = await newPage(viewport, w < 600);
    await page.evaluate(() => { delete window.__tenderloinPressSettleMs; });
    // The guard's window runs on frame time, so a press waits for it to close rather than for a stretch of real time.
    const settled = () => page.waitForFunction(() => !window.settle.snapshot().open, null, { timeout: 10000 });
    const dbl = async id => { await page.locator(`#${id}`).scrollIntoViewIfNeeded(); const b = await page.locator(`#${id}`).boundingBox(); await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await settled(); };
    await page.evaluate(() => window.ending.open('gather'));
    await dbl('gather-choice-0');
    assert.equal(await page.evaluate(() => window.ending.snapshot().visit.gather.gestures.length), 1, 'G3: one handoff');
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.ending.open('screening')); await dbl('screen-helper');
    assert.deepEqual(await page.evaluate(() => window.ending.snapshot().visit.bench), { selected: 0, fitted: [false, false], complete: false }, 'G7');
    await dbl('bench-support-0');
    assert.deepEqual(await page.evaluate(() => window.ending.snapshot().visit.bench.fitted), [true, false], 'G8');
    await page.locator('#bench-support-1').click(); await settled(); await dbl('bench-assist');
    await dbl('bench-habitat');
    assert.deepEqual(await page.evaluate(() => window.ending.snapshot().visit.room.assigned), {}, 'G9');
    for (const [item, place] of [[0, 0], [2, 1], [1, 2]]) { for (const id of [`room-item-${item}`, `room-place-${place}`]) { await page.locator(`#${id}`).click(); await settled(); } await dbl('room-assist'); }
    const r = await page.evaluate(() => window.ending.snapshot().visit.room);
    assert.deepEqual([Object.keys(r.assigned).length, r.complete], [3, false], 'G10: the third carry does not also welcome');
    await dbl('room-assist');
    assert.deepEqual(await page.evaluate(() => window.ending.snapshot().visit.room.mode), 'room', 'welcome does not also prepare');
    await context.close();
  });
}
await browser.close();
if (failures.length) { console.log(`${failures.length} failed: ${failures.join(', ')}`); process.exit(1); }
console.log('all ending browser checks passed');
