// The fork's local browser test: node tests/next-browser.mjs. QA tooling, not a game dependency: PLAYWRIGHT_MODULE points at a local
// Playwright, BROWSER_CHANNEL selects chrome (default), msedge, bundled or firefox, BASE_URL tests a running server and
// NEXT_BROWSER_WIDTHS (for example 1440) or NEXT_BROWSER_SUITES (journey,guard,tabs,restart,seeded) runs a subset while debugging.
// Screenshots and the receipt go to artifacts/browser-next/.
import assert from 'node:assert/strict';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { nextBuildInfo } from '../scripts/build-fingerprint-next.mjs';
import { GODOT_SAVE_KEY, SAVE_BUDGET, parseGodotSave, canonicalStringify, utf8Bytes, combineSaves } from '../browser-next/godot-save.js';
import { STORY_CHAPTERS, GODOT_TEMPLATES, currentChapter, nextObjective, chapterCard, isNarrow, fmt } from '../browser-next/story.js';
import { NEIGHBORS, PLACES } from '../browser-next/world.js';
import { GODOT_WRITTEN, FULL_MURAL, PUBLISHED, godotEnvelope, readyEnvelope, openedEnvelope, hostedEnvelope, civicDoneEnvelope } from './next-fixtures.mjs';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');

const CLASSIC = { version: '0.12.0', fingerprint: '2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567' };
const CLASSIC_KEYS = ['tenderloin-redux.save.v1', 'tenderloin-redux.settings.v1'];
const root = new URL('../', import.meta.url), out = fileURLToPath(new URL('artifacts/browser-next/', root)), file = name => path.join(out, name);
const WIDTHS = [{ name: '320', viewport: { width: 320, height: 667 }, touch: true }, { name: '390', viewport: { width: 390, height: 844 }, touch: true }, { name: '1440', viewport: { width: 1440, height: 1000 }, touch: false }]
  .filter(w => !process.env.NEXT_BROWSER_WIDTHS || process.env.NEXT_BROWSER_WIDTHS.split(',').includes(w.name));
const MET = NEIGHBORS.map(n => n.id).sort(), MURAL = { sun: { col: 0, row: 0 }, wave: { col: 2, row: 1 }, rise: { col: 4, row: 0 } };
const WORLD = snap => ({ player: snap.player, neighbors: NEIGHBORS, places: PLACES });
const SUITES = (process.env.NEXT_BROWSER_SUITES || 'journey,guard,tabs,restart,seeded').split(',');
const channel = process.env.BROWSER_CHANNEL || 'chrome', isFirefox = channel === 'firefox';
let ownedServer, browser, base, next, activePage, current = 'server start', failure = null;
const evidence = [], logs = [], undersized = [], underClose = [], started = Date.now();

async function startServer() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  ownedServer = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: process.env.PORT || '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
async function step(label, fn) {
  current = label; const t = Date.now();
  try { const detail = await fn(); evidence.push({ step: label, ms: Date.now() - t, ...detail }); }
  catch (error) { error.message = `${label}: ${error.message}`; throw error; }
}
const bucket = () => ({ pageErrors: [], consoleErrors: [], failedResponses: [], external: [] });
async function newContext(w, { gate = false } = {}) {
  const context = await browser.newContext({ viewport: w.viewport, reducedMotion: 'reduce', ...(w.touch ? { hasTouch: true, ...(isFirefox ? {} : { isMobile: true }) } : {}) });
  context.setDefaultTimeout(15000);
  if (!gate) await context.addInitScript(() => { window.__tenderloinPressSettleMs = 0; });
  return context;
}
async function newPage(context, label) {
  const page = await context.newPage(), log = { label, fork: bucket(), godot: bucket(), on: 'fork' };
  page.on('pageerror', error => log[log.on].pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') log[log.on].consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) log[log.on].failedResponses.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (!request.url().startsWith(base + '/') && !/^(data|blob):/.test(request.url())) log[log.on].external.push(request.url()); });
  logs.push(log); activePage = page; return { page, log };
}
function clean(log) {
  assert.deepEqual(log.fork, bucket(), `${log.label}: no page errors, console errors, failed responses or external requests in the fork`);
  assert.deepEqual([log.godot.pageErrors, log.godot.external], [[], []], `${log.label}: no page errors or external requests in Godot`);
}
const call = (page, name) => page.evaluate(name => window.tenderloin[name](), name);
const pick = (o, keys) => Object.fromEntries(keys.map(key => [key, o?.[key]]));
const squash = text => String(text).replace(/\s+/g, '').toLowerCase();
async function until(page, fn, arg, message, timeout = 5000) {
  try { await page.waitForFunction(fn, arg, { timeout }); } catch (error) { assert.fail(`${message} (${error.message.split('\n')[0]})`); }
}
async function press(page, target, touch) { const locator = typeof target === 'string' ? page.locator(target) : target; if (touch) await locator.tap(); else await locator.click(); }
const closed = page => until(page, () => !document.querySelector('dialog[open]'), null, 'the dialog closes');
const talkOpen = (page, name, timeout = 30000) => until(page, name => document.querySelector('#modal').open && document.querySelector('#modal-title')?.textContent.trim() === name, name, `${name}'s dialog opens`, timeout);
async function walkTo(page, w, id) { await press(page, '#neighbors-button', w.touch); await press(page, `#neighbor-${id}`, w.touch); await talkOpen(page, NEIGHBORS.find(n => n.id === id).name); }

// A same-origin page with no script (and no favicon request), so nothing writes while a save is seeded.
async function seed(page, raw) {
  await page.route(base + '/__next-seed', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Seed</title><link rel="icon" href="data:,">' }));
  await page.goto(base + '/__next-seed'); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, raw]);
}
async function boot(page) {
  await page.goto(base + '/browser-next/'); await until(page, () => !!window.tenderloin, null, 'the fork starts and sets window.tenderloin', 15000);
  assert.deepEqual(await page.evaluate(() => ['snapshot', 'location', 'story', 'save', 'pressSettle'].map(key => typeof window.tenderloin[key])), Array(5).fill('function'), 'window.tenderloin keeps snapshot() and location() and adds story(), save() and pressSettle()');
  assert.equal(await page.evaluate(() => window.tenderloin.version), next.version, 'the debug handle reports browser-next/version.js');
}
async function stored(page) {
  const [raw, ...classic] = await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [GODOT_SAVE_KEY, ...CLASSIC_KEYS]);
  assert.deepEqual(classic, [null, null], "classic's tenderloin-redux.save.v1 and tenderloin-redux.settings.v1 stay null");
  return raw;
}
async function envelope(page, expected = {}) {
  const raw = await stored(page); assert.equal(typeof raw, 'string', `${GODOT_SAVE_KEY} is stored`);
  const parsed = parseGodotSave(raw), bytes = utf8Bytes(raw), env = JSON.parse(raw);
  assert.equal(parsed.status, 'loaded', `the stored save loads under Godot's rules (reason: ${parsed.reason})`);
  assert.ok(bytes <= SAVE_BUDGET, `the stored save fits Godot's ${SAVE_BUDGET}-byte budget (${bytes} B)`);
  assert.equal(raw, canonicalStringify(env), 'the stored save is canonical JSON');
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(env[key], value, `stored ${key}`);
  return { raw, env, bytes, state: parsed.state };
}
async function written(page, prev, expected) {
  await page.waitForFunction(prev => window.tenderloin.save().seq > prev, prev, { timeout: 5000 }).catch(() => {});
  const s = await envelope(page, expected), info = await call(page, 'save');
  assert.ok(s.env.save_seq > prev, `the action wrote a newer save (save_seq ${s.env.save_seq}, before ${prev})`);
  assert.deepEqual(pick(info, ['status', 'reason', 'bytes', 'seq']), { status: 'saved', reason: null, bytes: s.bytes, seq: s.env.save_seq }, 'save() reports the write');
  return s;
}
async function cardCheck(page, startup) {
  await until(page, () => window.tenderloin.story().card === true, null, 'story().card reports an open chapter card', 10000);
  const [s, snap, dialog] = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return [window.tenderloin.story(), window.tenderloin.snapshot(), d && { modal: d.matches(':modal'), focus: d !== document.activeElement && d.contains(document.activeElement), text: d.innerText }]; });
  const idx = currentChapter(snap), chapter = STORY_CHAPTERS[idx], label = chapterCard(snap, { startup }).button;
  assert.equal(s.chapter, idx, 'story().chapter is currentChapter of the page state');
  assert.ok(dialog?.modal, 'the chapter card is an open modal dialog'); assert.ok(dialog.focus, 'focus is inside the chapter card');
  assert.ok(squash(dialog.text).includes(squash(chapter.title)) && squash(dialog.text).includes(squash(chapter.intro)), `the card shows Chapter ${chapter.num}, ${chapter.title}, and its intro`);
  const button = page.locator('dialog[open]').getByRole('button', { name: new RegExp(`^${label}`, 'i') });
  assert.equal(await button.count(), 1, `the card offers ${label}`);
  return { num: chapter.num, label, button };
}
async function dismissCard(page, w, card) {
  const keyboard = !w.touch && await card.button.evaluate(b => b === document.activeElement);
  if (keyboard) await page.keyboard.press('Enter'); else await press(page, card.button, w.touch);
  await until(page, () => !document.querySelector('dialog[open]') && !window.tenderloin.story().card, null, `${card.label} closes the chapter card`);
  return keyboard ? 'Enter on the focused button' : w.touch ? 'tap' : 'click';
}
async function chapterCheck(page) {
  const [s, snap, width, text] = await page.evaluate(() => [window.tenderloin.story(), window.tenderloin.snapshot(), innerWidth, document.body.innerText]);
  const idx = currentChapter(snap), chapter = STORY_CHAPTERS[idx], goal = nextObjective(snap, WORLD(snap)), U = GODOT_TEMPLATES.update_objective_ui;
  assert.deepEqual([s.chapter, s.card], [idx, false], 'story() reports currentChapter of the page state and no open card');
  assert.equal(s.objective?.id, goal.id, 'the Next objective follows story.js nextObjective');
  if (goal.id === 'meet') {
    const [, name, count] = s.objective.text.match(/^Meet (\w+) \((\d)\/5 neighbors met\)$/) ?? [], n = NEIGHBORS.find(n => n.name === name);
    assert.ok(n && !snap.visited.includes(n.id) && Number(count) === snap.visited.length, `the meet objective names an unmet neighbor and the met count (${s.objective.text})`);
  } else assert.equal(s.objective.text, goal.text, 'the Next objective text');
  const narrow = isNarrow(width);
  assert.equal(s.line, narrow ? fmt(U.narrow, chapter.num, s.objective.text) : fmt(U.wide, chapter.num, chapter.title, s.objective.text), `the ${narrow ? 'narrow' : 'wide'} chapter line`);
  assert.ok(squash(text).includes(squash(s.line)), `the chapter line is shown on the page (${s.line})`);
  return { ...s, expected: goal };
}
// Overflow fails at once. Targets (inside an open modal dialog only, since the rest is inert; a link inside running text is exempt)
// are collected on every screen and asserted at the end of each width's journey, so one run lists every undersized control.
async function layoutCheck(page, w, label) {
  const r = await page.evaluate(() => {
    const open = document.querySelector('dialog[open]'), scope = open?.matches(':modal') ? open : document;
    const controls = [...scope.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [tabindex]:not([tabindex="-1"])')].filter(e => {
      if (e.disabled || e.closest('[hidden], [inert]') || (!open && e.closest('dialog'))) return false;
      const style = getComputedStyle(e);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      return !(e.tagName === 'A' && [...e.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
    });
    // A label is a hit box only for the checkbox or radio it toggles; a range or file input needs its own 44 px box.
    const small = controls.map(e => ({ e, boxes: [e, ...(e.matches('input[type=checkbox], input[type=radio]') ? e.labels || [] : [])].map(n => n.getBoundingClientRect()).filter(b => b.width && b.height) }))
      .filter(({ boxes }) => boxes.length && !boxes.some(b => b.width >= 43.99 && b.height >= 43.99))
      .map(({ e, boxes: [b] }) => `${e.id ? '#' + e.id : `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 24)}"`} ${Math.round(b.width)}x${Math.round(b.height)}`);
    // Text drawn under the dialog's × would close the dialog when tapped.
    const close = open?.matches(':modal') ? open.querySelector('#close-modal') : null, under = [];
    if (close) {
      const c = close.getBoundingClientRect(), walker = document.createTreeWalker(open, NodeFilter.SHOW_TEXT), range = document.createRange();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || close.contains(n) || n.parentElement.closest('.sr-only, [hidden]')) continue;
        range.selectNodeContents(n);
        if ([...range.getClientRects()].some(b => b.width && b.right > c.left + .5 && b.left < c.right - .5 && b.bottom > c.top + .5 && b.top < c.bottom - .5)) under.push(`"${n.textContent.trim().slice(0, 40)}"`);
      }
    }
    return { checked: controls.length, small, under, page: [document.documentElement.scrollWidth, innerWidth], dialog: open ? [open.scrollWidth, open.clientWidth] : null };
  });
  await page.screenshot({ path: file(`${w.name}-${label}.png`), fullPage: true });
  assert.ok(r.page[0] <= r.page[1], `${label}: no horizontal page overflow (scrollWidth ${r.page[0]} > ${r.page[1]})`);
  if (r.dialog) assert.ok(r.dialog[0] <= r.dialog[1], `${label}: no horizontal dialog overflow (scrollWidth ${r.dialog[0]} > ${r.dialog[1]})`);
  if (r.small.length) undersized.push(`${w.name} ${label}: ${r.small.join(', ')}`);
  if (r.under.length) underClose.push(`${w.name} ${label}: ${r.under.join(', ')}`);
  return r.checked;
}
const toastText = page => page.locator('#toast').textContent();
// Holding Enter: one press, then three key repeats.
async function holdEnter(page) { for (let i = 0; i < 4; i++) { await page.keyboard.down('Enter'); await page.waitForTimeout(40); } await page.keyboard.up('Enter'); await page.waitForTimeout(300); }

async function journey(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `journey-${w.name}`), narrow = isNarrow(w.viewport.width), targets = {};
  let card, s, seq = 0;
  await step(`${w.name} fresh start shows the chapter card`, async () => {
    await boot(page); assert.equal(await stored(page), null, 'a fresh context has no shared save');
    assert.deepEqual(pick(await call(page, 'save'), ['status', 'reason']), { status: 'fresh', reason: null }, 'save() starts fresh');
    card = await cardCheck(page, true); assert.equal(card.num, 1);
    targets.startCard = await layoutCheck(page, w, 'start-card');
    return { card: card.label, targets: targets.startCard };
  });
  await step(`${w.name} chapter 1 line and Next objective`, async () => {
    const dismissed = await dismissCard(page, w, card), c = await chapterCheck(page);
    assert.equal(c.objective.id, 'meet', 'the first Next objective is the meet step'); assert.equal(c.objective.text, c.expected.text);
    assert.ok(c.line.startsWith(narrow ? 'Ch. 1 · Next: ' : 'Chapter 1: Get the Block Ready · Next: '), `chapter 1 line (${c.line})`);
    targets.chapter1 = await layoutCheck(page, w, 'chapter-1');
    return { dismissed, line: c.line };
  });
  await step(`${w.name} meet all five neighbors`, async () => {
    for (const n of NEIGHBORS) {
      await press(page, '#neighbors-button', w.touch); if (n.id === 'bea') targets.neighbors = await layoutCheck(page, w, 'neighbors');
      await press(page, `#neighbor-${n.id}`, w.touch); await talkOpen(page, n.name);
      s = await written(page, seq); seq = s.env.save_seq; assert.ok(s.env.visited_neighbors.includes(n.id), `meeting ${n.name} is saved`);
      if (n.id === 'rook') targets.rook = await layoutCheck(page, w, 'talk-rook');
      await press(page, '#close-modal', w.touch); await closed(page); await chapterCheck(page);
    }
    s = await envelope(page, { visited_neighbors: MET, mural_placements: {}, rook_soundcheck_done: false, block_opened: false });
    return { seq, bytes: s.bytes, next: (await call(page, 'story')).objective.id };
  });
  // The touch widths choose a layout and arrange a supply; 1440 leaves the layout to Open's Long Table default.
  if (w.touch) await step(`${w.name} choose the Long Table and arrange the table`, async () => {
    await walkTo(page, w, 'bea'); targets.layoutChoice = await layoutCheck(page, w, 'layout-choice');
    await press(page, '#choose-table', w.touch); await page.locator('.placement-grid').waitFor();
    // Where all eight columns do not fit, the grid says it scrolls: a line of text and a fade on the hidden side.
    const cue = () => page.evaluate(() => { const box = document.querySelector('.placement-scroll'), hint = document.querySelector('#grid-scroll-hint'); return { overflow: box.scrollWidth > box.clientWidth + 1, left: box.classList.contains('more-left'), right: box.classList.contains('more-right'), hint: !!hint && !hint.hidden && hint.getBoundingClientRect().height > 0 && hint.textContent }; });
    const before = await cue();
    assert.ok(before.overflow, `eight 44 px columns do not fit at ${w.name}`);
    assert.deepEqual([before.left, before.right, !!before.hint], [false, true, true], 'the grid shows that more columns are to the right');
    targets.layoutEditor = await layoutCheck(page, w, 'layout-editor');
    await press(page, '#cell-6-0', w.touch);
    await until(page, () => window.tenderloin.snapshot().furniture.table?.col === 6, null, 'the table is placed at column 7, row 1');
    s = await written(page, seq, { gathering_layout: 'table', optional: { 'browser-next': { v: 1, layout: 'table', furniture: { table: { col: 6, row: 0 } } } } }); seq = s.env.save_seq;
    const view = await page.evaluate(() => { const cell = document.querySelector('#cell-6-0').getBoundingClientRect(), box = document.querySelector('#cell-6-0').parentElement.parentElement.getBoundingClientRect(); return { inside: cell.left >= box.left - 1 && cell.right <= box.right + 1, cell: [Math.round(cell.width), Math.round(cell.height)] }; });
    assert.ok(view.inside, 'the redrawn grid keeps the placed cell in view');
    const end = await page.evaluate(() => { const box = document.querySelector('.placement-scroll'); box.scrollLeft = box.scrollWidth; return box.scrollLeft; });
    await until(page, () => document.querySelector('.placement-scroll').classList.contains('more-left') && !document.querySelector('.placement-scroll').classList.contains('more-right'), null, 'scrolled to the end, the fade moves to the left');
    await press(page, '#preview-layout', w.touch); await page.locator('#gathering-plan-close').waitFor(); await press(page, '#gathering-plan-close', w.touch); await page.locator('.placement-grid').waitFor();
    assert.equal(Math.round(await page.evaluate(() => document.querySelector('.placement-scroll').scrollLeft)), Math.round(end), 'Preview, then Back to arranging, keeps the grid where it was');
    targets.layoutPlaced = await layoutCheck(page, w, 'layout-placed');
    await press(page, '#layout-done', w.touch); await closed(page);
    return { seq, cell: view.cell, cue: before.hint, scrolled: end, next: (await chapterCheck(page)).objective.id };
  });
  await step(`${w.name} place the three motifs`, async () => {
    await walkTo(page, w, 'celeste'); await press(page, '#start-mural', w.touch);
    for (const [i, [id, { col, row }]] of Object.entries(MURAL).entries()) {
      const cell = page.locator(`#mcell-${col}-${row}`);
      if (!w.touch && i === 1) { await cell.focus(); await page.keyboard.press('Enter'); } else await press(page, cell, w.touch);
      await until(page, ([id, col, row]) => { const m = window.tenderloin.snapshot().mural[id]; return m?.col === col && m?.row === row; }, [id, col, row], `${id} is placed at ${col},${row}`);
    }
    targets.mural = await layoutCheck(page, w, 'mural');
    s = await written(page, seq, { visited_neighbors: MET, mural_placements: MURAL, rook_soundcheck_done: false, block_opened: false }); seq = s.env.save_seq;
    await press(page, '#mural-done', w.touch); await closed(page);
    return { seq, bytes: s.bytes, next: (await chapterCheck(page)).objective.id, keyboardCell: !w.touch };
  });
  await step(`${w.name} soundcheck with Rook`, async () => {
    await walkTo(page, w, 'rook'); await press(page, '#soundcheck', w.touch);
    s = await written(page, seq, { visited_neighbors: MET, mural_placements: MURAL, rook_soundcheck_done: true, block_opened: false }); seq = s.env.save_seq;
    if (await page.evaluate(() => document.querySelector('#modal').open)) { await press(page, '#close-modal', w.touch); await closed(page); }
    return { seq, bytes: s.bytes, next: (await chapterCheck(page)).objective.id };
  });
  await step(`${w.name} open the block`, async () => {
    assert.equal(await page.locator('#open-gathering').isEnabled(), true, 'five met, three motifs and the soundcheck enable Open');
    await press(page, '#open-gathering', w.touch);
    s = await written(page, seq, { visited_neighbors: MET, mural_placements: MURAL, rook_soundcheck_done: true, block_opened: true, gathering_layout: 'table' }); seq = s.env.save_seq;
    assert.equal(s.state.opened, true, 'Godot rules keep the opening');
    await until(page, () => window.tenderloin.story().card || !!document.querySelector('#stay-block'), null, 'opening shows its dialog or the chapter card');
    const finale = await page.locator('#stay-block').count() > 0;
    if (finale) {
      assert.equal((await call(page, 'story')).card, false, 'the chapter card waits while the opening dialog is open');
      targets.finale = await layoutCheck(page, w, 'opened'); await press(page, '#stay-block', w.touch);
    }
    card = await cardCheck(page, false); assert.equal(card.num, 2, 'opening moves the story to Chapter 2');
    targets.chapter2Card = await layoutCheck(page, w, 'chapter-2-card');
    await dismissCard(page, w, card); const c = await chapterCheck(page);
    assert.ok(c.line.startsWith(narrow ? 'Ch. 2 · Next: ' : 'Chapter 2: The Gathering · Next: '), `chapter 2 line (${c.line})`);
    const caption = await page.locator('#afterglow .gathering-caption').textContent();
    if (w.touch) assert.match(caption, /the table you placed/, 'the caption credits the table the player placed');
    else assert.doesNotMatch(caption, /you placed/, 'the default Long Table is not called the player’s arrangement');
    targets.chapter2 = await layoutCheck(page, w, 'chapter-2');
    return { seq, bytes: s.bytes, finaleFirst: finale, card: card.label, line: c.line, caption };
  });
  await step(`${w.name} settings, music and field notes`, async () => {
    for (const [open, ready, label] of [['#settings-button', '#volume', 'settings'], ['#music-button', '#soundtrack-volume', 'music'], ['#journal-button', '#journal-history', 'journal']]) {
      await press(page, open, w.touch); await page.locator(ready).waitFor(); targets[label] = await layoutCheck(page, w, label);
      await press(page, '#close-modal', w.touch); await closed(page);
    }
    return { screens: ['settings', 'music', 'journal'] };
  });
  await step(`${w.name} reload keeps progress`, async () => {
    const before = await stored(page); await page.reload(); await until(page, () => !!window.tenderloin, null, 'the fork starts again', 15000);
    card = await cardCheck(page, true); assert.equal(card.num, 2, 'the startup card is Chapter 2');
    assert.equal(await stored(page), before, 'page hide and loading leave the stored save alone');
    s = await envelope(page, { visited_neighbors: MET, block_opened: true });
    assert.deepEqual(pick(await call(page, 'save'), ['status', 'reason', 'bytes', 'seq']), { status: 'loaded', reason: null, bytes: s.bytes, seq: s.env.save_seq }, 'save() reports the loaded save');
    assert.deepEqual([...(await call(page, 'snapshot')).visited].sort(), MET);
    await dismissCard(page, w, card); const c = await chapterCheck(page); targets.reload = await layoutCheck(page, w, 'reload');
    return { card: card.label, line: c.line, targets };
  });
  await notes(w, targets);
  if (!w.touch) await crossEdition(page, log, w);
  await step(`${w.name} interactive targets are at least 44 px`, async () => {
    assert.deepEqual(undersized.filter(line => line.startsWith(w.name + ' ')), [], 'every checked screen keeps its interactive targets at least 44 px');
    assert.deepEqual(underClose.filter(line => line.startsWith(w.name + ' ')), [], "no text is drawn under a dialog's close button");
    return { screens: Object.keys(targets).length, controls: Object.values(targets).reduce((a, b) => a + b, 0) };
  });
  clean(log); await context.close();
}

// The field notes, district and later-chapter dialogs, from a seeded later save: their standalone source links and the long
// eyebrows the close button sits beside.
async function notes(w, targets) {
  const context = await newContext(w), { page, log } = await newPage(context, `notes-${w.name}`);
  await step(`${w.name} field notes, district and later-chapter dialogs`, async () => {
    await seed(page, canonicalStringify(civicDoneEnvelope({ save_seq: 60, history_read: true, blackhawk_discovered: true }))); await boot(page); await dismissCard(page, w, await cardCheck(page, true));
    const screens = [
      ['history-compton', '#history-walk-button', '#read-comptons', 'A corner that remembers.'], ['history-blackhawk', '#history-walk-button', '#read-blackhawk', 'A room full of sound.'],
      ['living-district', '#district-button', null, 'More than a line on a map.'], ['programme', '#next-afternoon', null, 'Make room for next time.'],
      ['host-finished', '#host-afternoon', null, 'We made room for another afternoon.'], ['film', '#film-shoot', null, 'A little film on the block.'],
    ];
    for (const [label, open, then, title] of screens) {
      await press(page, open, w.touch); if (then) await press(page, then, w.touch);
      await until(page, title => document.querySelector('dialog[open] #modal-title')?.textContent === title, title, `${label} opens`);
      if (label === 'living-district') await until(page, () => /ready/.test(document.querySelector('#district-state')?.textContent), null, 'the city boundary loads');
      targets[label] = await layoutCheck(page, w, label);
      await press(page, '#close-modal', w.touch); await closed(page);
    }
    return { screens: screens.map(s => s[0]) };
  });
  clean(log); await context.close();
}

async function godotReady(page) {
  await page.locator('#status').waitFor({ state: 'hidden', timeout: 90000 });
  await until(page, () => window.__tenderloinGodotA11ySnapshot?.startup_pending, null, "Godot's startup card is up", 60000);
  return page.evaluate(() => window.__tenderloinGodotA11ySnapshot);
}
async function crossEdition(page, log, w) {
  let forkWrite;
  await step(`${w.name} Godot opens the fork's save`, async () => {
    await stat(new URL('artifacts/godot-web/index.pck', root)).catch(() => assert.fail('artifacts/godot-web/index.pck is missing; run npm run godot:export'));
    const forkRaw = await stored(page); log.on = 'godot';
    await page.goto(base + '/godot/'); const g = await godotReady(page);
    assert.deepEqual(pick(g, ['visited_count', 'mural_count', 'soundcheck_done', 'block_opened']), { visited_count: 5, mural_count: 3, soundcheck_done: true, block_opened: true }, "Godot shows the fork's progress");
    assert.equal(g.story_detail?.text, STORY_CHAPTERS[1].intro, "Godot's startup card is Chapter 2");
    assert.equal(await stored(page), forkRaw, 'Godot loaded the save without resetting or rewriting it');
    await page.keyboard.press('Escape');
    await until(page, () => /^(Chapter 2: The Gathering|Ch\. 2) · Next: /.test(window.__tenderloinGodotA11ySnapshot.objective_control_text), null, "Godot's chapter line reads Chapter 2", 10000);
    const objective = await page.evaluate(() => window.__tenderloinGodotA11ySnapshot.objective_control_text);
    await page.screenshot({ path: file(`${w.name}-godot-fork-save.png`) });
    const after = await envelope(page, { visited_neighbors: MET, block_opened: true });
    return { godotObjective: objective, afterGodot: after.raw === forkRaw ? 'unchanged' : `rewritten by Godot (save_seq ${after.env.save_seq})` };
  });
  await step(`${w.name} the fork shows a Godot-written save`, async () => {
    await seed(page, GODOT_WRITTEN.fullRun); log.on = 'fork';
    await boot(page); const expected = parseGodotSave(GODOT_WRITTEN.fullRun), card = await cardCheck(page, true);
    assert.equal((await call(page, 'story')).chapter, currentChapter(expected.state), "the fork shows the Godot save's chapter");
    assert.deepEqual(pick(await call(page, 'save'), ['status', 'reason', 'bytes', 'seq']), { status: 'loaded', reason: null, bytes: utf8Bytes(GODOT_WRITTEN.fullRun), seq: 113 });
    await dismissCard(page, w, card); const c = await chapterCheck(page);
    assert.equal(await stored(page), GODOT_WRITTEN.fullRun, 'loading leaves the Godot save alone');
    await page.screenshot({ path: file(`${w.name}-fork-godot-save.png`), fullPage: true });
    return { chapter: c.chapter, line: c.line };
  });
  await step(`${w.name} a fork write keeps Godot-only fields`, async () => {
    const old = JSON.parse(GODOT_WRITTEN.fullRun);
    await walkTo(page, w, 'dez'); await press(page, '#dez-panel'); await page.locator('#palette-garden').waitFor({ timeout: 30000 }); await press(page, '#palette-garden');
    forkWrite = await written(page, old.save_seq, { mural_palette: 'garden', save_seq: old.save_seq + 1 });
    for (const key of ['discovered_surprises', 'mural_scenes', 'active_motif', 'district_boundary_visible']) {
      const text = `${JSON.stringify(key)}:${canonicalStringify(old[key])}`;
      assert.ok(GODOT_WRITTEN.fullRun.includes(text) && forkWrite.raw.includes(text), `${key} is kept byte for byte`);
    }
    for (const key of Object.keys(old)) if (!['mural_palette', 'save_seq', 'optional'].includes(key)) assert.equal(canonicalStringify(forkWrite.env[key]), canonicalStringify(old[key]), `${key} is unchanged`);
    assert.deepEqual(Object.keys(forkWrite.env.optional).filter(key => key !== 'browser-next'), Object.keys(old.optional), 'optional keeps its Godot keys');
    for (const key of Object.keys(old.optional)) assert.equal(canonicalStringify(forkWrite.env.optional[key]), canonicalStringify(old.optional[key]), `optional.${key} is unchanged`);
    await press(page, '#mural-done'); await closed(page);
    return { seq: forkWrite.env.save_seq, bytes: forkWrite.bytes };
  });
  await step(`${w.name} Godot opens the fork's write of its save`, async () => {
    log.on = 'godot'; await page.goto(base + '/godot/'); const g = await godotReady(page);
    assert.deepEqual(pick(g, ['visited_count', 'block_opened', 'epilogue_done', 'hosting_done', 'civic_done', 'film_done', 'mural_palette']), { visited_count: 5, block_opened: true, epilogue_done: true, hosting_done: true, civic_done: true, film_done: true, mural_palette: 'garden' }, 'Godot keeps the whole run and the fork palette');
    assert.equal(g.story_detail?.text, STORY_CHAPTERS[5].intro, "Godot's startup card is Chapter 6");
    assert.equal(await stored(page), forkWrite.raw, 'Godot loaded the fork write without resetting or rewriting it');
    await page.screenshot({ path: file(`${w.name}-godot-fork-write.png`) });
    return { godotSnapshot: pick(g, ['visited_count', 'film_done', 'mural_palette', 'surprises_found']) };
  });
}

async function guard(w) {
  const context = await newContext(w, { gate: true }), { page, log } = await newPage(context, `guard-${w.name}`), how = w.touch ? 'double tap' : 'double click';
  const rest = async () => { await page.waitForTimeout(650); await until(page, () => !window.tenderloin.pressSettle().open, null, 'the press-settle window closes', 10000); };
  async function double(locator) {
    await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate(() => { window.__nextPassed = { pointerdown: 0, pointerup: 0, click: 0 }; if (!window.__nextCounting) { window.__nextCounting = true; for (const type of Object.keys(window.__nextPassed)) window.addEventListener(type, () => window.__nextPassed[type]++); } });
    const before = await call(page, 'pressSettle');
    if (w.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y); } else await page.mouse.dblclick(x, y, { delay: 40 });
    return finish(before);
  }
  // mode: 'rapid' lets a [data-rapid] repeat through; 'map' is a canvas tap, which acts on pointerup and whose own click the guard claims.
  async function finish(before, mode = '') {
    await page.waitForTimeout(300);
    const after = await call(page, 'pressSettle'), passed = await page.evaluate(() => window.__nextPassed);
    if (mode === 'rapid') { assert.equal(after.swallowed, before.swallowed, 'a [data-rapid] control still under the pointer is not gated'); assert.deepEqual(passed, { pointerdown: 2, pointerup: 2, click: 2 }); }
    else {
      assert.equal(after.armed - before.armed, 1, 'one press armed the guard');
      assert.ok(after.swallowed > before.swallowed, `pressSettle().swallowed increased (${before.swallowed} -> ${after.swallowed})`);
      assert.deepEqual(passed, { pointerdown: 1, pointerup: 1, click: mode === 'map' ? 0 : 1 }, mode === 'map' ? "only the first tap's pointerup reached the page; its click went to the new dialog and was claimed" : 'only the first press reached the page');
    }
    return { armed: after.armed - before.armed, swallowed: after.swallowed - before.swallowed };
  }
  async function doubleAt({ x, y }, mode) {
    await page.evaluate(() => { window.__nextPassed = { pointerdown: 0, pointerup: 0, click: 0 }; if (!window.__nextCounting) { window.__nextCounting = true; for (const type of Object.keys(window.__nextPassed)) window.addEventListener(type, () => window.__nextPassed[type]++); } });
    const before = await call(page, 'pressSettle');
    if (w.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y); } else await page.mouse.dblclick(x, y, { delay: 40 });
    return finish(before, mode);
  }
  const centre = async locator => { await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  await step(`${w.name} guard: a ${how} on the chapter card acts once`, async () => {
    await boot(page); assert.equal(await page.evaluate(() => window.__tenderloinPressSettleMs), undefined, 'the guard runs at its default');
    const card = await cardCheck(page, true), player = (await call(page, 'snapshot')).player, counts = await double(card.button);
    assert.deepEqual([(await call(page, 'story')).card, await page.evaluate(() => !!document.querySelector('dialog[open]'))], [false, false], 'the card closed and nothing else opened');
    assert.deepEqual((await call(page, 'snapshot')).player, player, 'the second press did not walk'); assert.equal(await page.locator('#stop-walking').isDisabled(), true);
    assert.equal(await stored(page), null, 'nothing was saved');
    await rest(); return counts;
  });
  await step(`${w.name} guard: a ${how} on a neighbor button acts once`, async () => {
    await press(page, '#neighbors-button', w.touch); await page.locator('#neighbor-bea').waitFor(); await rest();
    const counts = await double(page.locator('#neighbor-bea')); await talkOpen(page, 'Bea', 20000);
    const snap = await call(page, 'snapshot');
    assert.deepEqual([snap.layout, snap.furniture, await page.locator('.placement-grid').count()], [null, {}, 0], "the second press chose nothing in Bea's dialog");
    const s = await envelope(page, { visited_neighbors: ['bea'], gathering_layout: '' });
    await page.screenshot({ path: file(`${w.name}-guard-bea.png`), fullPage: true });
    await rest(); await press(page, '#close-modal', w.touch); await closed(page);
    return { ...counts, seq: s.env.save_seq, afterRest: 'a deliberate press acts' };
  });
  await step(`${w.name} guard: a ${how} on Bea on the map acts once`, async () => {
    await rest(); await page.evaluate(() => document.querySelector('#world').scrollIntoView({ block: 'center' }));
    const at = await page.evaluate(([bx, by]) => { const r = document.querySelector('#world').getBoundingClientRect(), l = window.tenderloin.location(), x = r.left + l.x + bx * l.scale, y = r.top + l.y + by * l.scale; return { x, y, visible: x > Math.max(0, r.left) && x < Math.min(innerWidth, r.right) && y > Math.max(0, r.top) && y < Math.min(innerHeight, r.bottom) }; }, [NEIGHBORS[0].x, NEIGHBORS[0].y]);
    assert.ok(at.visible, `Bea is on screen to tap (${Math.round(at.x)}, ${Math.round(at.y)})`);
    const counts = await doubleAt(at, 'map'); await talkOpen(page, 'Bea', 20000);
    assert.deepEqual([(await call(page, 'snapshot')).layout, await page.locator('.placement-grid').count()], [null, 0], 'the second tap chose nothing in the dialog that opened under it');
    await rest(); await press(page, '#close-modal', w.touch); await closed(page);
    return counts;
  });
  await step(`${w.name} guard: a ${how} on a [data-rapid] zoom button zooms twice`, async () => {
    await rest(); const zoom = page.locator('#zoom-out'), scale = (await call(page, 'location')).scale;
    const counts = await doubleAt(await centre(zoom), 'rapid'), after = (await call(page, 'location')).scale;
    assert.ok(Math.abs(after - scale / 1.35 / 1.35) < 1e-6 || await zoom.isDisabled(), `two zoom steps (${scale} -> ${after})`);
    await rest(); return { ...counts, scale: [scale, after] };
  });
  clean(log); await context.close();
}

async function twoTabs(w) {
  const context = await newContext(w), A = await newPage(context, 'tab-a'), B = await newPage(context, 'tab-b');
  await step('two tabs: tab A adopts the newer save tab B wrote', async () => {
    for (const { page } of [A, B]) { await boot(page); await dismissCard(page, w, await cardCheck(page, true)); }
    await walkTo(B.page, w, 'bea'); const b = await written(B.page, 0, { visited_neighbors: ['bea'] }); await press(B.page, '#close-modal'); await closed(B.page);
    await until(A.page, seq => window.tenderloin.save().seq === seq && window.tenderloin.snapshot().visited.includes('bea'), b.env.save_seq, 'tab A adopts the save tab B wrote (storage event)');
    assert.match((await chapterCheck(A.page)).objective.text, /\(1\/5 neighbors met\)$/, "tab A's Next line counts tab B's meeting");
    await walkTo(A.page, w, 'celeste'); const a = await written(A.page, b.env.save_seq, { visited_neighbors: ['bea', 'celeste'] }); await press(A.page, '#close-modal'); await closed(A.page);
    return { tabB: b.env.save_seq, tabA: a.env.save_seq };
  });
  await step('two tabs: tab A rebases its next action instead of overwriting', async () => {
    const was = await envelope(A.page), env = { ...was.env, visited_neighbors: [...was.env.visited_neighbors, 'dez'].sort(), save_seq: was.env.save_seq + 1 }, raw = canonicalStringify(env);
    assert.equal(parseGodotSave(raw).status, 'loaded');
    await A.page.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, raw]); // as another tab whose storage event has not reached A
    const adoptedEarly = (await call(A.page, 'snapshot')).visited.includes('dez');
    await walkTo(A.page, w, 'celeste'); await press(A.page, '#start-mural'); await press(A.page, '#mcell-0-0');
    const a = await written(A.page, env.save_seq, { visited_neighbors: ['bea', 'celeste', 'dez'], mural_placements: { sun: { col: 0, row: 0 } } });
    await until(B.page, () => { const s = window.tenderloin.snapshot(); return s.visited.includes('dez') && !!s.mural.sun; }, null, "tab B adopts tab A's rebased write");
    await press(A.page, '#mural-done'); await closed(A.page);
    assert.equal(adoptedEarly, false, 'tab A had not seen the change before it acted, so the write was a rebase');
    return { seq: a.env.save_seq, rebasedOnWrite: true };
  });
  await step('two tabs: becoming visible adopts a save changed without a storage event', async () => {
    const was = await envelope(A.page), env = { ...was.env, visited_neighbors: [...was.env.visited_neighbors, 'thanh'].sort(), save_seq: was.env.save_seq + 1 };
    await A.page.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, canonicalStringify(env)]);
    assert.equal((await call(A.page, 'snapshot')).visited.includes('thanh'), false, 'nothing has told tab A yet');
    await A.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await until(A.page, seq => window.tenderloin.save().seq === seq && window.tenderloin.snapshot().visited.includes('thanh'), env.save_seq, 'tab A adopts the save when it becomes visible');
    await until(B.page, seq => window.tenderloin.save().seq === seq, env.save_seq, 'tab B adopts it from the storage event');
    return { seq: env.save_seq };
  });
  await step('two tabs: a 3D tab opened earlier saves over newer progress, and the fork brings it back', async () => {
    const was = await envelope(A.page), S = await newPage(context, 'stale-3d-tab');
    const stale = canonicalStringify({ ...was.env, visited_neighbors: ['bea'], mural_placements: {}, discovered_surprises: ['jeffrey_record'], optional: {}, save_seq: was.env.save_seq + 1 });
    assert.equal(parseGodotSave(stale).status, 'loaded');
    await A.page.evaluate(() => { document.querySelector('#toast').textContent = ''; });
    await seed(S.page, stale);
    for (const tab of [A, B]) await until(tab.page, () => !!document.querySelector('dialog[open] #recover-save'), null, 'each fork tab offers to bring back its progress instead of reporting it as progress');
    assert.notEqual(await A.page.locator('#toast').textContent(), 'Progress saved in another tab or edition is here now.');
    const offer = await layoutCheck(A.page, w, 'recovery');
    await press(A.page, '#recover-save'); await closed(A.page);
    const a = await written(A.page, was.env.save_seq + 1, { visited_neighbors: was.env.visited_neighbors, mural_placements: was.env.mural_placements, discovered_surprises: ['jeffrey_record'], save_seq: was.env.save_seq + 2 });
    await until(B.page, seq => !document.querySelector('dialog[open]') && window.tenderloin.save().seq === seq, a.env.save_seq, "tab B adopts tab A's combined save and drops its own offer");
    for (const tab of [A, B, S]) clean(tab.log);
    return { stale: was.env.save_seq + 1, combined: a.env.save_seq, targets: offer };
  });
  await context.close();
}

// The recovery offer, one stale save at a time: found by an action, put off with Escape or ×, declined, withdrawn by a restart
// in another tab, and kept when Keep cannot be written. Page S stands in for a 3D tab that was opened earlier.
async function recoveryCases(w) {
  const context = await newContext(w), { page, log } = await newPage(context, 'recovery'), S = await newPage(context, 'recovery-3d-tab');
  // A page opened later sends the first one to the background, where Chrome throttles its frames, and with them walking.
  const start = async env => { await page.bringToFront(); await seed(page, canonicalStringify(env)); await boot(page); await dismissCard(page, w, await cardCheck(page, true)); };
  const offered = message => until(page, () => !!document.querySelector('dialog[open] [data-recovery] #recover-save'), null, message, 30000);
  async function stale(env, sameTab = false) {
    const text = canonicalStringify(env); assert.equal(parseGodotSave(text).status, 'loaded');
    if (sameTab) await page.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, text]); else { await seed(S.page, text); await page.bringToFront(); }
    return text;
  }
  const later = /until you keep it or use the shared save/;
  await step('recovery: a stale save an action finds is offered back, and nothing is written before Keep', async () => {
    await start(readyEnvelope({ save_seq: 10, visited_neighbors: ['bea', 'celeste', 'dez', 'rook'] }));
    const old = await stale(godotEnvelope({ save_seq: 11, visited_neighbors: ['bea'] }), true); // its storage event never reaches this tab
    assert.equal((await call(page, 'snapshot')).visited.length, 4, 'nothing has told this tab yet');
    await press(page, '#neighbors-button', w.touch); await press(page, '#neighbor-thanh', w.touch);
    await offered('meeting Thanh finds the stale save and offers this tab’s progress back');
    assert.equal(await stored(page), old, 'nothing is written while the offer is open');
    assert.deepEqual((await call(page, 'snapshot')).visited, MET, 'this tab keeps showing its own progress, Thanh included');
    await press(page, '#recover-save', w.touch); await closed(page);
    const s = await written(page, 11, { save_seq: 12, visited_neighbors: MET, rook_soundcheck_done: true, mural_placements: FULL_MURAL });
    return { seq: s.env.save_seq };
  });
  let staleText;
  await step('recovery: Escape and × put the choice off; the next saving action asks again and Keep includes it', async () => {
    await start(readyEnvelope({ save_seq: 20 }));
    staleText = await stale(godotEnvelope({ save_seq: 21, visited_neighbors: ['bea'] }));
    await offered('a stale save from another tab is offered back');
    await page.keyboard.press('Escape'); await closed(page);
    await until(page, re => new RegExp(re).test(document.querySelector('#toast').textContent), later.source, 'a toast says the choice can wait');
    assert.match(await page.locator('#save-status').textContent(), /not saved until you choose/);
    assert.deepEqual([(await call(page, 'snapshot')).visited, await stored(page)], [MET, staleText], 'this tab keeps its progress and nothing is written');
    await press(page, '#open-gathering', w.touch); await offered('opening the block asks again');
    await page.evaluate(() => { document.querySelector('#toast').textContent = ''; });
    await press(page, '#close-modal', w.touch); await closed(page);
    await until(page, re => new RegExp(re).test(document.querySelector('#toast').textContent), later.source, '× puts it off too');
    await page.waitForTimeout(400);
    assert.equal((await call(page, 'story')).card, false, 'the Chapter 2 card waits for the choice');
    assert.equal(await stored(page), staleText);
    await press(page, '#next-afternoon', w.touch); await press(page, '#programme-add-stories', w.touch); await offered('a programme draft asks again');
    await press(page, '#recover-save', w.touch);
    const s = await written(page, 21, { save_seq: 22, block_opened: true, visited_neighbors: MET });
    assert.deepEqual(s.env.programme.order, ['stories'], 'what this tab did while deciding is kept');
    const card = await cardCheck(page, false); assert.equal(card.num, 2, 'the Chapter 2 card follows the choice'); await dismissCard(page, w, card);
    return { seq: s.env.save_seq };
  });
  await step('recovery: Use the shared save shows the lower chapter card and writes nothing', async () => {
    const text = await stale(readyEnvelope({ save_seq: 23 }));
    await offered('a save without the opening is offered back'); await press(page, '#recover-skip', w.touch);
    const card = await cardCheck(page, false); assert.equal(card.num, 1, 'back in Chapter 1 with the shared save'); await dismissCard(page, w, card);
    assert.deepEqual([(await call(page, 'snapshot')).opened, await stored(page)], [false, text]);
    return { card: card.label };
  });
  await step('recovery: another tab starting over withdraws a pending offer', async () => {
    await stale(godotEnvelope({ save_seq: 24, visited_neighbors: ['bea'] })); await offered('a stale save is offered back');
    await S.page.evaluate(key => localStorage.removeItem(key), GODOT_SAVE_KEY); // Start fresh in another tab
    await until(page, () => !document.querySelector('dialog[open]') && /cleared in another tab/.test(document.querySelector('#toast').textContent), null, 'the offer is withdrawn and the restart is reported');
    assert.deepEqual((await call(page, 'snapshot')).visited, [], 'this tab takes the fresh afternoon');
    await walkTo(page, w, 'bea'); const s = await written(page, 0, { save_seq: 1, visited_neighbors: ['bea'] });
    await press(page, '#close-modal', w.touch); await closed(page);
    return { seq: s.env.save_seq };
  });
  await step('recovery: a Keep that cannot be written keeps the offer and this tab’s progress', async () => {
    const mine = openedEnvelope({ save_seq: 50 }), thin = godotEnvelope({ save_seq: 51, visited_neighbors: ['bea'], optional: { pad: '' } });
    thin.optional.pad = 'x'.repeat(SAVE_BUDGET - 60 - utf8Bytes(canonicalStringify(thin)));
    assert.equal(combineSaves(thin, parseGodotSave(canonicalStringify(mine)).state).reason, 'full', 'together they would not fit');
    await start(mine); const text = await stale(thin); await offered('the thin stale save is offered back');
    for (let i = 0; i < 2; i++) {
      await press(page, '#recover-save', w.touch);
      await until(page, () => /would not fit/.test(document.querySelector('dialog[open] [data-recovery]')?.textContent || ''), null, 'the offer stays open and says why');
      assert.deepEqual([await stored(page), (await call(page, 'snapshot')).opened], [text, true], "nothing is written and this tab's progress is still here");
    }
    const targets = await layoutCheck(page, w, 'recovery-refused');
    await press(page, '#recover-skip', w.touch); await dismissCard(page, w, await cardCheck(page, false));
    assert.deepEqual([(await call(page, 'snapshot')).opened, await stored(page)], [false, text]);
    return { bytes: utf8Bytes(text), targets };
  });
  for (const tab of [{ log }, S]) clean(tab.log);
  await context.close();
}

// Restart clears the shared save, so a held or repeated Enter must never confirm it. The guard runs as in production.
async function restartSafety(w) {
  const context = await newContext(w, { gate: true }), { page, log } = await newPage(context, `restart-${w.name}`);
  const settings = async () => {
    if (await page.evaluate(() => document.querySelector('#modal').open)) { await page.keyboard.press('Escape'); await closed(page); }
    await page.locator('#settings-button').click(); await page.locator('#restart').waitFor(); await page.waitForTimeout(500); await page.locator('#restart').focus();
  };
  await step(`${w.name} holding or repeating Enter on Start a new afternoon keeps the shared save`, async () => {
    await seed(page, GODOT_WRITTEN.fullRun); await boot(page); await dismissCard(page, w, await cardCheck(page, true));
    await settings(); for (let i = 0; i < 4; i++) { await page.keyboard.down('Enter'); await page.waitForTimeout(40); } await page.keyboard.up('Enter'); await page.waitForTimeout(300);
    assert.equal(await stored(page), GODOT_WRITTEN.fullRun, 'a held Enter (one press, three repeats) does not restart');
    await settings(); await page.keyboard.press('Enter');
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Another afternoon?', null, 'Enter opens the confirmation');
    const confirm = await page.evaluate(() => [document.activeElement?.id, document.querySelector('dialog[open]').innerText]);
    assert.equal(confirm[0], 'cancel-restart', 'Keep my afternoon has focus');
    assert.match(confirm[1], /neighborhood surprises/); assert.match(confirm[1], /mural scenes/);
    const targets = await layoutCheck(page, w, 'restart-confirm');
    await page.waitForTimeout(150); await page.keyboard.press('Enter');
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Your afternoon.', null, 'a second Enter keeps the afternoon');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'restart', 'focus returns to the restart button');
    assert.equal(await stored(page), GODOT_WRITTEN.fullRun, 'pressing Enter twice does not restart');
    assert.equal((await call(page, 'save')).seq, 113);
    return { targets };
  });
  await step(`${w.name} on a short window, Keep my afternoon brings focus back to a visible restart button`, async () => {
    const sizes = [{ width: 1280, height: 600 }, { width: 390, height: 600 }], seen = [];
    for (const size of sizes) {
      await page.setViewportSize(size); await settings();
      await page.keyboard.press('Enter'); await until(page, () => document.activeElement?.id === 'cancel-restart', null, 'the confirmation opens on Keep');
      await page.keyboard.press('Enter'); await until(page, () => document.activeElement?.id === 'restart', null, 'Keep returns focus to the restart button');
      const at = await page.evaluate(() => { const d = document.querySelector('dialog[open]').getBoundingClientRect(), b = document.activeElement.getBoundingClientRect(), dialog = document.querySelector('dialog[open]'); return { visible: b.top >= d.top - .5 && b.bottom <= d.bottom + .5 && b.bottom <= innerHeight, scrolls: dialog.scrollHeight > dialog.clientHeight, button: [Math.round(b.top), Math.round(b.bottom)], dialog: [Math.round(d.top), Math.round(d.bottom)] }; });
      assert.ok(at.scrolls, `the Settings dialog scrolls at ${size.width}x${size.height}`);
      assert.ok(at.visible, `the focused restart button is inside the dialog's visible area at ${size.width}x${size.height} (button ${at.button}, dialog ${at.dialog})`);
      seen.push({ size, ...at });
    }
    await page.setViewportSize(w.viewport); assert.equal(await stored(page), GODOT_WRITTEN.fullRun);
    await settings();
    return { seen };
  });
  await step(`${w.name} a held Enter that reaches Start fresh is ignored, and a held Tab still moves focus`, async () => {
    await settings(); await page.keyboard.down('Enter');
    await until(page, () => document.activeElement?.id === 'cancel-restart', null, 'the first press opens the confirmation on Keep');
    await page.evaluate(() => document.querySelector('#confirm-restart').focus());
    for (let i = 0; i < 3; i++) { await page.keyboard.down('Enter'); await page.waitForTimeout(40); }
    await page.keyboard.up('Enter'); await page.waitForTimeout(300);
    assert.equal(await stored(page), GODOT_WRITTEN.fullRun, 'repeats of a held Enter never press Start fresh');
    assert.equal(await page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent), 'Another afternoon?');
    await page.evaluate(() => document.querySelector('#cancel-restart').focus());
    const trail = []; await page.keyboard.down('Shift');
    for (let i = 0; i < 5; i++) { await page.keyboard.down('Tab'); await page.waitForTimeout(30); trail.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)); }
    await page.keyboard.up('Tab'); await page.keyboard.up('Shift');
    assert.ok(new Set(trail).size > 1, `a held Shift+Tab keeps moving focus instead of parking on Start fresh (${trail.join(', ')})`);
    assert.equal(await stored(page), GODOT_WRITTEN.fullRun);
    await settings();
    return { trail };
  });
  await step(`${w.name} a deliberate keyboard restart still works`, async () => {
    await page.keyboard.press('Enter'); await until(page, () => document.activeElement?.id === 'cancel-restart', null, 'the confirmation opens on Keep');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement?.id), 'confirm-restart');
    await page.keyboard.press('Enter');
    await until(page, () => window.tenderloin.save().status === 'fresh', null, 'Start fresh restarts');
    assert.equal(await stored(page), null);
    return { save: await call(page, 'save') };
  });
  clean(log); await context.close();
}

// Seeded saves: a held save, a save at the budget, the Chapter 3 card from the last loan, and Open after another tab cleared the save.
async function seeded(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `seeded-${w.name}`);
  const start = async raw => { await seed(page, raw); await boot(page); await dismissCard(page, w, await cardCheck(page, true)); };
  await step(`${w.name} a held save is kept until Start over replaces it`, async () => {
    const bad = canonicalStringify({ ...JSON.parse(GODOT_WRITTEN.firstMeeting), mural_palette: 'neon' }), parsed = parseGodotSave(bad);
    assert.equal(parsed.status, 'invalid'); await start(bad);
    assert.deepEqual(pick(await call(page, 'save'), ['status', 'reason']), { status: 'held', reason: parsed.reason });
    await walkTo(page, w, 'celeste'); await press(page, '#close-modal'); await closed(page);
    assert.equal(await stored(page), bad, 'nothing is written while the save is held');
    await press(page, '#save-start-over');
    await until(page, () => document.activeElement?.id === 'cancel-restart', null, 'Start over asks first, with Keep focused');
    await page.keyboard.press('Enter'); await closed(page);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'save-start-over', 'Keep my afternoon returns focus to Start over, which is still shown');
    assert.equal(await stored(page), bad);
    await press(page, '#save-start-over'); await until(page, () => document.activeElement?.id === 'cancel-restart', null, 'Start over asks again');
    await press(page, '#confirm-restart'); await until(page, () => window.tenderloin.save().status === 'fresh', null, 'Start over clears the held save');
    assert.equal(await stored(page), null); assert.equal(await page.locator('#save-start-over').isHidden(), true);
    return { reason: parsed.reason };
  });
  await step(`${w.name} a save at the budget is refused and kept`, async () => {
    const env = JSON.parse(GODOT_WRITTEN.fullRun), big = canonicalStringify({ ...env, optional: { ...env.optional, budget_probe: 'x'.repeat(5000) } });
    await start(big);
    await walkTo(page, w, 'dez'); await press(page, '#dez-panel'); await page.locator('#palette-sunset').waitFor({ timeout: 30000 }); await press(page, '#palette-sunset');
    await until(page, () => window.tenderloin.save().status === 'refused', null, 'the write is refused');
    assert.deepEqual(pick(await call(page, 'save'), ['status', 'reason']), { status: 'refused', reason: 'full' });
    assert.equal(await stored(page), big, 'the stored save is unchanged');
    assert.match(await page.locator('#save-status').textContent(), /save full/);
    await press(page, '#mural-done'); await closed(page);
    return { bytes: utf8Bytes(big) };
  });
  await step(`${w.name} returning the last loan shows the Chapter 3 card`, async () => {
    await start(canonicalStringify(openedEnvelope({ save_seq: 40, epilogue: { photo: { status: 'skipped', participants: [], mural: {}, palette: 'garden', layout: 'table' }, packing: true, returned: ['table', 'paint-case'] } })));
    assert.equal((await call(page, 'story')).chapter, 1);
    await walkTo(page, w, 'rook'); await press(page, '#return-event-loan');
    const card = await cardCheck(page, false); assert.equal(card.num, 3, 'the third loan home moves the story to Chapter 3');
    const s = await written(page, 40, { save_seq: 41 }); assert.deepEqual(s.env.epilogue.returned, ['table', 'paint-case', 'speaker']);
    await dismissCard(page, w, card); const c = await chapterCheck(page);
    assert.ok(c.line.startsWith('Chapter 3: Another Afternoon · Next: '), c.line);
    return { line: c.line };
  });
  await step(`${w.name} Open after another tab cleared the save opens nothing`, async () => {
    await start(canonicalStringify(readyEnvelope({ save_seq: 5 })));
    await page.evaluate(key => localStorage.removeItem(key), GODOT_SAVE_KEY); // as another tab whose storage event has not arrived
    await press(page, '#open-gathering');
    await until(page, () => /cleared in another tab/.test(document.querySelector('#toast').textContent), null, 'a toast says the save was cleared elsewhere');
    assert.equal(await toastText(page), CLEARED_NOT_SAVED, 'and that the opening no longer applies');
    assert.equal(await page.evaluate(() => !!document.querySelector('dialog[open]')), false, 'no opening dialog for an unopened block');
    assert.equal((await call(page, 'snapshot')).opened, false); assert.equal(await stored(page), null, 'nothing was written');
    return { toast: await toastText(page) };
  });
  await step(`${w.name} a change that no longer applies says so inside the open dialog`, async () => {
    await start(canonicalStringify(readyEnvelope({ save_seq: 7, gathering_layout: 'table' })));
    await walkTo(page, w, 'bea'); await press(page, '#choose-table'); await page.locator('.placement-grid').waitFor();
    const opened = canonicalStringify(openedEnvelope({ save_seq: 8 }));
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, opened]); // another edition opened the block
    await press(page, '#cell-0-0');
    const expected = 'Progress saved in another tab or edition is here now. Your last change no longer applies, so it was not saved.';
    await until(page, text => document.querySelector('dialog[open] #modal-notice')?.textContent === text, expected, 'the open dialog shows why the placement was not saved');
    const seen = await page.evaluate(() => { const n = document.querySelector('#modal-notice'), r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { uncovered: n.contains(hit), role: n.getAttribute('role'), inDialog: !!n.closest('dialog[open]'), title: document.querySelector('#modal-title')?.textContent }; });
    assert.deepEqual(seen, { uncovered: true, role: 'status', inDialog: true, title: 'Bea' }, 'the notice is a status line inside the modal dialog, where it can be seen and read out');
    assert.equal(await stored(page), opened, 'nothing was written');
    await press(page, '#close-modal'); await closed(page);
    assert.equal(await toastText(page), expected, 'closing the dialog carries the notice to the toast');
    return { notice: expected };
  });
  await step(`${w.name} pack up, Keep it as a story and a loan return claim nothing when another tab cleared the save`, async () => {
    const skipped = { photo: { status: 'skipped', participants: [], mural: {}, palette: 'garden', layout: 'table' }, packing: true, returned: [] }, results = [];
    for (const [env, open, confirm] of [[openedEnvelope({ save_seq: 30 }), '#start-pack', '#confirm-pack'], [openedEnvelope({ save_seq: 31 }), '#make-keepsake', '#skip-keepsake'], [openedEnvelope({ save_seq: 32, epilogue: skipped }), '#visit-table', '#return-event-loan']]) {
      await start(canonicalStringify(env));
      await press(page, open); await page.locator(confirm).waitFor({ timeout: 30000 });
      await page.evaluate(key => localStorage.removeItem(key), GODOT_SAVE_KEY); // as another tab whose storage event has not arrived
      await press(page, confirm);
      // The fresh save is back in Chapter 1, so its card may open at once and carry the message as its status line.
      await until(page, text => (document.querySelector('dialog[open] #modal-notice')?.textContent || document.querySelector('#toast').textContent) === text, CLEARED_NOT_SAVED, `${confirm}: the message says the change no longer applies, with no success message over it`);
      if ((await call(page, 'story')).card) { const card = await cardCheck(page, false); assert.equal(card.num, 1); await dismissCard(page, w, card); }
      await closed(page);
      const snap = await call(page, 'snapshot');
      assert.deepEqual([snap.opened, snap.epilogue.packing, snap.epilogue.photo.status, await stored(page)], [false, false, 'unasked', null], `${confirm}: nothing was packed, skipped or returned`);
      results.push(confirm);
    }
    // The clear reaches this tab as a storage event while the confirmation is still open: pressing it changes nothing.
    const other = await page.context().newPage();
    await other.route(base + '/__next-seed', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Other tab</title><link rel="icon" href="data:,">' }));
    await other.goto(base + '/__next-seed');
    await page.bringToFront(); await start(canonicalStringify(openedEnvelope({ save_seq: 33 })));
    await press(page, '#start-pack'); await page.locator('#confirm-pack').waitFor();
    await other.evaluate(key => localStorage.removeItem(key), GODOT_SAVE_KEY);
    await until(page, () => !window.tenderloin.snapshot().opened, null, 'the storage event brings the cleared save');
    await press(page, '#confirm-pack'); await until(page, () => !document.querySelector('#confirm-pack'), null, 'the confirmation closes');
    await page.waitForTimeout(200);
    const said = await page.evaluate(() => [document.querySelector('#toast').textContent, document.querySelector('#modal-notice').textContent]);
    assert.ok(!said.some(text => /Bea folds/.test(text)), `no success message for a pack that did not happen (${said})`);
    assert.deepEqual([(await call(page, 'snapshot')).epilogue.packing, await stored(page)], [false, null]);
    if ((await call(page, 'story')).card) await dismissCard(page, w, await cardCheck(page, false));
    await other.close();
    return { results: [...results, 'storage event'] };
  });
  await step(`${w.name} a held Enter presses only the button it started on`, async () => {
    await start(canonicalStringify(readyEnvelope({ save_seq: 12 })));
    await until(page, () => document.querySelector('#world-prompt span').textContent === 'Talk with Bea', null, 'the map prompt offers Bea, who stands by the start');
    await page.locator('#world-prompt').focus(); await holdEnter(page);
    assert.deepEqual(await page.evaluate(() => [document.querySelector('dialog[open] #modal-title')?.textContent, !!document.querySelector('#choose-table'), !!document.querySelector('.placement-grid')]), ['Bea', true, false], "Bea's dialog opens and nothing in it is chosen");
    assert.equal((await call(page, 'snapshot')).layout, null); assert.equal((await envelope(page)).env.gathering_layout, '');
    await page.keyboard.press('Escape'); await closed(page);
    await page.locator('#open-gathering').focus(); await holdEnter(page);
    assert.equal(await page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent), 'You made a little room.', 'the opening dialog stays up to be read');
    await written(page, 12, { block_opened: true });
    await page.keyboard.press('Escape'); await dismissCard(page, w, await cardCheck(page, false));
    const seq = (await call(page, 'save')).seq;
    await page.locator('#start-pack').focus(); await holdEnter(page);
    assert.equal(await page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent), 'An afternoon winds down.', 'the pack-up confirmation stays up');
    assert.deepEqual([(await call(page, 'snapshot')).epilogue.packing, (await call(page, 'save')).seq], [false, seq], 'nothing was packed');
    await page.keyboard.press('Escape'); await closed(page);
    return { seq };
  });
  await step(`${w.name} a deliberate press with a double-click count still acts`, async () => {
    // A slow second click of a pair reaches the page with detail 2 once the one-gesture window has closed.
    const plan = { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] }, acted = [];
    const cases = [
      [civicDoneEnvelope({ save_seq: 70, film: { phase: 'shooting', draft: plan, result: plan, captured: [] } }), '#film-shoot', '#film-capture', s => s.film.captured.length === 1],
      [hostedEnvelope({ save_seq: 71 }), '#civic-hour', '#civic-start', s => s.civic.phase === 'planning'],
      [hostedEnvelope({ save_seq: 72, hosting: { ...hostedEnvelope().hosting, order: [...PUBLISHED], results: [] } }), '#host-afternoon', '#host-complete', s => s.hosting.results.length === 1],
    ];
    for (const [env, open, control, done] of cases) {
      await start(canonicalStringify(env)); await press(page, open); await page.locator(control).waitFor();
      await page.locator(control).dispatchEvent('click', { detail: 2 });
      for (const deadline = Date.now() + 5000; !done(await call(page, 'snapshot'));) { assert.ok(Date.now() < deadline, `${control} acts on a click with detail 2`); await page.waitForTimeout(50); }
      await press(page, '#close-modal'); await closed(page); acted.push(control);
    }
    return { acted };
  });
  clean(log); await context.close();
}
const CLEARED_NOT_SAVED = 'The shared save was cleared in another tab. A fresh afternoon is ready. Your last change no longer applies, so it was not saved.';

try {
  await mkdir(out, { recursive: true });
  base = await startServer(); next = await nextBuildInfo();
  await step('build identity and routes', async () => {
    const fork = await fetch(base + '/browser-next/__build'); assert.equal(fork.status, 200);
    assert.deepEqual(await fork.json(), next, '/browser-next/__build is nextBuildInfo() of this checkout');
    assert.deepEqual(await (await fetch(base + '/__build')).json(), CLASSIC, 'classic /__build stays 0.12.0 at its frozen fingerprint');
    const bare = await fetch(base + '/browser-next', { redirect: 'manual' });
    assert.deepEqual([bare.status, bare.headers.get('location')], [302, '/browser-next/'], '/browser-next redirects to its slash');
    return { next };
  });
  // Playwright's BiDi Firefox ignores the reducedMotion context option, so the preference supplies it.
  browser = isFirefox ? await firefox.launch({ channel: 'moz-firefox', headless: true, firefoxUserPrefs: { 'ui.prefersReducedMotion': 1 } }) : await chromium.launch({ ...(channel === 'bundled' ? {} : { channel }), headless: true });
  for (const w of WIDTHS) { if (SUITES.includes('journey')) await journey(w); if (SUITES.includes('guard')) await guard(w); }
  const wide = WIDTHS.find(w => !w.touch);
  if (wide) { if (SUITES.includes('tabs')) { await twoTabs(wide); await recoveryCases(wide); } if (SUITES.includes('restart')) await restartSafety(wide); if (SUITES.includes('seeded')) await seeded(wide); }
  await step('every checked screen outside the journeys keeps 44 px targets and its close button clear', async () => {
    assert.deepEqual(undersized, [], 'every checked screen keeps its interactive targets at least 44 px');
    assert.deepEqual(underClose, [], "no text is drawn under a dialog's close button");
    return { undersized: undersized.length, underClose: underClose.length };
  });
} catch (error) {
  failure = { step: current, message: error.message, stack: String(error.stack) }; process.exitCode = 1;
  await activePage?.screenshot({ path: file('failure.png'), fullPage: true }).catch(() => {});
} finally {
  const godot = await stat(new URL('artifacts/godot-web/index.pck', root)).catch(() => null);
  await writeFile(file('next-browser-results.json'), JSON.stringify({ testedAt: new Date().toISOString(), result: failure ? 'fail' : 'pass', failure, browser: await browser?.version(), channel, isolatedServer: !process.env.BASE_URL, widths: WIDTHS.map(w => w.name), suites: SUITES, source: next, classic: CLASSIC, godotBuild: godot && { pckBytes: godot.size, pckModified: godot.mtime }, durationMs: Date.now() - started, evidence, undersized, logs: logs.map(({ label, fork, godot }) => ({ label, fork, godot })), limits: 'Automated ' + channel + ' checks of the Phase 1 slice through real input; not a human playtest, screen reader audit or full keyboard-only completion.' }, null, 2));
  await browser?.close(); ownedServer?.kill();
  console.log(failure ? `FAIL ${failure.message}` : `PASS ${evidence.length} steps in ${Math.round((Date.now() - started) / 1000)} s`);
}
