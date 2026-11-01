// The fork's local browser test: node tests/next-browser.mjs. QA tooling, not a game dependency: PLAYWRIGHT_MODULE points at a local
// Playwright, BROWSER_CHANNEL selects chrome (default), msedge, bundled or firefox, BASE_URL tests a running server and
// NEXT_BROWSER_WIDTHS (for example 1440) or NEXT_BROWSER_SUITES (journey,guard,ending,phase2,visits,tabs,restart,seeded,music,characters) runs a subset while debugging.
// Screenshots and the receipt go to artifacts/browser-next/.
import assert from 'node:assert/strict';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { nextBuildInfo } from '../scripts/build-fingerprint-next.mjs';
import { GODOT_SAVE_KEY, SAVE_BUDGET, parseGodotSave, canonicalStringify, utf8Bytes, combineSaves } from '../browser-next/godot-save.js';
import { STORY_CHAPTERS, GODOT_TEMPLATES, currentChapter, nextObjective, chapterCard, isNarrow, fmt } from '../browser-next/story.js';
import { NEIGHBORS, PLACES } from '../browser-next/world.js';
import { SETTINGS_KEY } from '../browser-next/core.js';
import { NEIGHBOR_LINES, NEIGHBOR_BADGES, SURPRISE_MEMORY, MURAL_REPLY, BUTTON_TEXT, neighborLines, webLine, whatsNext, whatsNextAnnouncement, goodbyeLines, spokenText } from '../browser-next/characters.js';
import { nextVolume, volumeAnnouncement, playingAnnouncement, switchedAnnouncement, MUSIC_TEXT } from '../browser-next/sketch-core.js';
import { GODOT, FORK_TEXT } from '../browser-next/ending/text.js';
import { soundsLabel, soundsAnnouncement } from '../browser-next/rewards.js';
import { cueBurst, cueValues } from '../browser-next/bursts.js';
import { LOAN_REPLIES, loanReply, loanReturnAnnouncement } from '../browser-next/hosted-text.js';
import { LOAN_TITLES } from '../browser-next/story.js';
import { VISITS_FORK_TEXT, freshSession } from '../browser-next/visits-kit.js';
import { EDITION_URL, EDITION_TEXT } from '../browser-next/edition.js';
import { GODOT_TEXT as VISITS_TEXT, web } from '../browser-next/visits/text.js';
import { gdf } from '../browser-next/visits/format.js';
import { initialBefore, changeBefore, TEXT as BEFORE_TEXT } from '../browser-next/visits/before-streets.js';
import { initialMeal, changeMeal, mealView, TEXT as MEAL_TEXT } from '../browser-next/visits/meal.js';
import { activeEpisode, activeObjective, TEXT as PICKER_TEXT } from '../browser-next/visits/picker.js';
import { initialDogs, dogsView, NAMES as DOG_NAMES, TEXT as DOGS_TEXT } from '../browser-next/visits/dogs.js';
import { initialLantern, lanternView, LENGTH as LANTERN_LENGTH, TEXT as LANTERN_TEXT } from '../browser-next/visits/lantern.js';
import { initialPower, changePower, SOLUTIONS, VOICES, ARRIVAL as RELAY_ARRIVAL, TEXT as POWER_TEXT } from '../browser-next/visits/power.js';
import { initialElection, electionView, TEXT as ELECTION_TEXT } from '../browser-next/visits/election.js';
import { SURPRISE_IDS, inspect, conversationLabel } from '../browser-next/visits/surprises.js';
import { EATERIES, initialTour, tourState, visitStop, inspectMuseum, cycleEatery, activateEatery } from '../browser-next/visits/landmarks.js';
import { GODOT_WRITTEN, FULL_MURAL, PUBLISHED, godotEnvelope, readyEnvelope, openedEnvelope, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope } from './next-fixtures.mjs';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');

const CLASSIC = { version: '0.12.0', fingerprint: '2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567' };
const CLASSIC_KEYS = ['tenderloin-redux.save.v1', 'tenderloin-redux.settings.v1'];
const root = new URL('../', import.meta.url), out = fileURLToPath(new URL('artifacts/browser-next/', root)), file = name => path.join(out, name);
const WIDTHS = [{ name: '320', viewport: { width: 320, height: 667 }, touch: true }, { name: '390', viewport: { width: 390, height: 844 }, touch: true }, { name: '1440', viewport: { width: 1440, height: 1000 }, touch: false }]
  .filter(w => !process.env.NEXT_BROWSER_WIDTHS || process.env.NEXT_BROWSER_WIDTHS.split(',').includes(w.name));
const MET = NEIGHBORS.map(n => n.id).sort(), MURAL = { sun: { col: 0, row: 0 }, wave: { col: 2, row: 1 }, rise: { col: 4, row: 0 } };
const WORLD = snap => ({ player: snap.player, neighbors: NEIGHBORS, places: PLACES });
const SUITES = (process.env.NEXT_BROWSER_SUITES || 'journey,guard,ending,phase2,visits,tabs,restart,seeded,music,characters').split(',');
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
const bucket = () => ({ pageErrors: [], consoleErrors: [], failedResponses: [], external: [], csp: [] });
async function newContext(w, { gate = false } = {}) {
  const context = await browser.newContext({ viewport: w.viewport, reducedMotion: 'reduce', ...(w.touch ? { hasTouch: true, ...(isFirefox ? {} : { isMobile: true }) } : {}) });
  context.setDefaultTimeout(15000);
  if (!gate) await context.addInitScript(() => { window.__tenderloinPressSettleMs = 0; });
  // Every Content-Security-Policy violation reaches the page's log by name: the directive, what it blocked and where.
  await context.addInitScript(() => addEventListener('securitypolicyviolation', event => window.__nextCspViolation?.(`${event.effectiveDirective} blocked ${event.blockedURI || 'an inline resource'} (${event.sourceFile || document.URL}:${event.lineNumber})`), true));
  return context;
}
async function newPage(context, label) {
  const page = await context.newPage(), log = { label, fork: bucket(), godot: bucket(), on: 'fork' };
  page.on('pageerror', error => log[log.on].pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') log[log.on].consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) log[log.on].failedResponses.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (!request.url().startsWith(base + '/') && !/^(data|blob):/.test(request.url())) log[log.on].external.push(request.url()); });
  await page.exposeBinding('__nextCspViolation', (source, text) => log[log.on].csp.push(text));
  logs.push(log); activePage = page; return { page, log };
}
function clean(log) {
  assert.deepEqual(log.fork.csp, [], `${log.label}: no Content-Security-Policy violations in the fork`);
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
// What a guarded double press let through, read once it is in. Nothing in touchscreen.tap() promises that the page has had the
// tap's pointer events and click when it returns (Chrome 156 and Edge 157 happen to deliver them first): wait (up to 10 s) until
// at least the events that must reach the page have, and for a gated press the guard has armed and swallowed, then give anything
// that must not arrive the same 300 ms as before. The caller's exact counts are the verdict.
async function letThrough(page, before, want, gated) {
  await page.waitForFunction(([before, want, gated]) => { const s = window.tenderloin.pressSettle(), p = window.__nextPassed; return Object.keys(want).every(type => p[type] >= want[type]) && (!gated || (s.armed > before.armed && s.swallowed > before.swallowed)); }, [before, want, gated], { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  return [await call(page, 'pressSettle'), await page.evaluate(() => window.__nextPassed)];
}
const closed = page => until(page, () => !document.querySelector('dialog[open]'), null, 'the dialog closes');
const talkOpen = (page, name, timeout = 30000) => until(page, name => document.querySelector('#modal').open && document.querySelector('#modal-title')?.textContent.trim() === name, name, `${name}'s dialog opens`, timeout);
async function walkTo(page, w, id) { await press(page, '#neighbors-button', w.touch); await press(page, `#neighbor-${id}`, w.touch); await talkOpen(page, NEIGHBORS.find(n => n.id === id).name); }
// The dialog's close event comes after the task that closed it (Chrome dispatches it with the next frame), and game.js's close
// handler then moves focus to the dialog's return target again. A key pressed on a button focused before then can land wherever
// that handler puts focus. settledClose runs close and resolves once that event has run: the listener it adds runs after game.js's.
async function settledClose(page, close, what) {
  await page.evaluate(() => { window.__nextCloseRan = false; document.querySelector('#modal').addEventListener('close', () => { window.__nextCloseRan = true; }, { once: true }); });
  await close();
  await until(page, () => window.__nextCloseRan, null, `${what}: the dialog's close event runs`, 8000);
}
// A held Escape: one press, two repeats, the release. Nothing in keyboard.down() promises that the page has had a key when it
// returns, so what the hold did is counted in the page from its press on: the key events that reached it, the dialog's cancel
// events (one a close request) and every close of the dialog, seen as its open attribute goes (when the close happens, so a close
// whose close event would come a frame later, or one a redraw undoes at once, still counts). delivered() polls until all four key
// events are in; only then has a repeat had its chance, and the caller gives it a short grace before reading counts().
async function heldEscape(page) {
  await page.evaluate(() => {
    const modal = document.querySelector('#modal');
    window.__nextEscape = { down: 0, repeats: 0, up: 0, cancel: 0, closes: 0 };
    if (window.__nextEscapeWatch) return;
    window.__nextEscapeWatch = true;
    addEventListener('keydown', event => { if (event.key === 'Escape') { window.__nextEscape.down++; if (event.repeat) window.__nextEscape.repeats++; } }, true);
    addEventListener('keyup', event => { if (event.key === 'Escape') window.__nextEscape.up++; }, true);
    modal.addEventListener('cancel', () => { window.__nextEscape.cancel++; });
    new MutationObserver(records => { window.__nextEscape.closes += records.filter(r => r.oldValue !== null).length; }).observe(modal, { attributes: true, attributeFilter: ['open'], attributeOldValue: true });
  });
  await page.keyboard.down('Escape'); await page.keyboard.down('Escape'); await page.keyboard.down('Escape'); await page.keyboard.up('Escape');
  return {
    delivered: () => until(page, () => { const n = window.__nextEscape; return n.down >= 3 && n.repeats >= 2 && n.up >= 1; }, null, "the held Escape's press, two repeats and release reach the page", 8000),
    counts: () => page.evaluate(() => ({ ...window.__nextEscape, open: document.querySelector('#modal').open })),
  };
}
// Two animation frames in the page from now. The game loop asks for its next frame before either, so it has run in both since.
async function afterFrames(page, what) {
  await page.evaluate(() => { window.__nextFrames = 0; requestAnimationFrame(function count() { if (++window.__nextFrames < 2) requestAnimationFrame(count); }); });
  await until(page, () => window.__nextFrames >= 2, null, `${what}: two animation frames run`, 8000);
}

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
// WCAG contrast of two computed rgb() colors.
const luminance = rgb => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(v => Number(v) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Play the 3D edition (edition.js): the page's link (#swap-edition) or the open Settings dialog's (#swap-edition-settings). It leads
// to the Godot build beside the fork in the same tab; its accessible name is its label (the arrow is hidden); Tab from the control
// before it reaches it with the shared focus ring; it is a 44 px target inside the view that clips nothing, at 4.5:1 or more.
async function editionLinkCheck(page, id) {
  const link = page.locator(`#${id}`), scope = page.locator(id === 'swap-edition' ? 'main' : 'dialog[open]');
  await link.scrollIntoViewIfNeeded();
  assert.deepEqual(await link.evaluate(a => [a.tagName, a.getAttribute('href'), a.href, a.target]), ['A', EDITION_URL, base + '/godot/', ''], `#${id} links to the Godot build beside the fork, in the same tab`);
  assert.equal(await scope.getByRole('link', { name: EDITION_TEXT.link, exact: true }).evaluate(a => a.id), id, `#${id}'s accessible name is its label, ${EDITION_TEXT.link}`);
  assert.ok((await link.innerText()).startsWith(EDITION_TEXT.link), `#${id} shows its label`);
  const from = await link.evaluate(a => {
    const open = document.querySelector('dialog[open]'), order = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
      .filter(e => e.tabIndex >= 0 && !e.disabled && !e.closest('[hidden], [inert]') && e.getClientRects().length && (!open || open.contains(e)));
    const previous = order[order.indexOf(a) - 1]; previous.focus(); return previous.id || previous.tagName;
  });
  await page.keyboard.press('Tab');
  const r = await link.evaluate(a => {
    const s = getComputedStyle(a), b = a.getBoundingClientRect(), open = document.querySelector('dialog[open]');
    let bg = 'rgba(0, 0, 0, 0)';
    for (let n = a; n && bg === 'rgba(0, 0, 0, 0)'; n = n.parentElement) bg = getComputedStyle(n).backgroundColor;
    return { focused: document.activeElement === a, visible: a.matches(':focus-visible'), ring: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, box: [b.left, b.top, b.width, b.height], clipped: a.scrollWidth > a.clientWidth, color: s.color, bg, page: [document.documentElement.scrollWidth, innerWidth], dialog: open && [open.scrollWidth, open.clientWidth] };
  });
  assert.ok(r.focused && r.visible, `Tab from ${from} focuses #${id} with :focus-visible`);
  assert.equal(r.ring, '3px solid rgb(163, 94, 39)', `#${id} draws the shared focus ring`);
  assert.ok(r.box[2] >= 43.99 && r.box[3] >= 43.99, `#${id} is a 44 px target (${r.box[2]}x${r.box[3]})`);
  assert.ok(r.box[0] >= 0 && r.box[0] + r.box[2] <= r.page[1] + .5 && !r.clipped, `#${id} lies inside the view and shows its whole label`);
  assert.ok(r.page[0] <= r.page[1], `no horizontal page overflow (scrollWidth ${r.page[0]} > ${r.page[1]})`);
  if (r.dialog) assert.ok(r.dialog[0] <= r.dialog[1], `no horizontal dialog overflow (scrollWidth ${r.dialog[0]} > ${r.dialog[1]})`);
  const ratio = contrast(r.color, r.bg);
  assert.ok(ratio >= 4.5, `#${id} is ${r.color} on ${r.bg}, ${ratio.toFixed(2)}:1`);
  return { tabFrom: from, box: r.box.map(Math.round), contrast: Number(ratio.toFixed(2)) };
}
const toastText = page => page.locator('#toast').textContent();
// The selected look of a pressed choice (style.css, as the hosting choices draw it), and the computed look of a pressed control
// and an unpressed sibling.
const SELECTED = { pressed: 'true', background: 'rgb(213, 229, 202)', border: '2px solid rgb(35, 103, 92)', color: 'rgb(35, 61, 56)' };
async function pressedLook(page, pressed, other) {
  const [on, off] = await page.evaluate(ids => ids.map(id => { const e = document.querySelector(id), s = getComputedStyle(e); return { pressed: e.getAttribute('aria-pressed'), background: s.backgroundColor, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, color: s.color, height: e.getBoundingClientRect().height }; }), [pressed, other]);
  assert.deepEqual(pick(on, Object.keys(SELECTED)), SELECTED, `${pressed} shows the selected look`);
  assert.equal(off.pressed, 'false', `${other} is not pressed`);
  assert.ok(off.background !== on.background && off.border !== on.border, `${pressed} looks different from ${other} (${off.background}, ${off.border})`);
  assert.ok(on.height >= 43.99, `${pressed} keeps its 44 px target (${on.height})`);
  return { on, off };
}
// Half a second of silence as a WAV (16-bit mono PCM at 22,050 Hz), for Load Local Track.
function silentWav(seconds = 0.5, rate = 22050) {
  const bytes = Math.round(seconds * rate) * 2, out = Buffer.alloc(44 + bytes);
  out.write('RIFF', 0); out.writeUInt32LE(36 + bytes, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(bytes, 40);
  return out;
}
// Holding Enter: one press, then three key repeats. The page counts the key events that reach it: once all five are in (polled),
// 300 ms lets whatever a repeat set off land before the caller reads what the hold did.
async function holdEnter(page) {
  await page.evaluate(() => {
    window.__nextEnter = { down: 0, repeats: 0, up: 0 };
    if (window.__nextEnterWatch) return;
    window.__nextEnterWatch = true;
    addEventListener('keydown', event => { if (event.key === 'Enter') { window.__nextEnter.down++; if (event.repeat) window.__nextEnter.repeats++; } }, true);
    addEventListener('keyup', event => { if (event.key === 'Enter') window.__nextEnter.up++; }, true);
  });
  for (let i = 0; i < 4; i++) { await page.keyboard.down('Enter'); await page.waitForTimeout(40); }
  await page.keyboard.up('Enter');
  await until(page, () => { const n = window.__nextEnter; return n.down >= 4 && n.repeats >= 3 && n.up >= 1; }, null, "the held Enter's press, three repeats and release reach the page", 8000);
  await page.waitForTimeout(300);
}
// The presses of the phase 2 and visits suites. once: one gesture of two presses on a new button, with the guard at its production
// window: only the first press reaches the page, except on a [data-rapid] control (Keep Chatting, Rook's Volume, Godot's rapid
// story controls), where both do. use: the first use of a button is a guarded double press; later uses are one ordinary press.
// held: a held Enter (one press, three repeats). tapAt: one guarded tap or click on the map, which acts on its pointerup; the click
// that follows is claimed when a dialog opened under it (press-settle tap). guarded can be shared by the pages of one suite.
function presses(page, w, guarded = []) {
  const settled = () => until(page, () => !window.tenderloin.pressSettle().open, null, 'the press-settle window closes', 10000);
  const counting = () => page.evaluate(() => { delete window.__tenderloinPressSettleMs; window.__nextPassed = { pointerdown: 0, pointerup: 0, click: 0 }; if (!window.__nextCounting) { window.__nextCounting = true; for (const type of Object.keys(window.__nextPassed)) window.addEventListener(type, () => window.__nextPassed[type]++); } });
  async function once(selector, { rapid = false } = {}) {
    const locator = typeof selector === 'string' ? page.locator(selector) : selector; selector = typeof selector === 'string' ? selector : 'the startup card button'; await locator.waitFor(); await locator.scrollIntoViewIfNeeded();
    await counting();
    const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2, before = await call(page, 'pressSettle');
    if (w.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y); } else await page.mouse.dblclick(x, y, { delay: 40 });
    const want = rapid ? { pointerdown: 2, pointerup: 2, click: 2 } : { pointerdown: 1, pointerup: 1, click: 1 }, [after, passed] = await letThrough(page, before, want, !rapid);
    if (rapid) { assert.equal(after.swallowed, before.swallowed, `${selector}: a [data-rapid] control is not gated`); assert.deepEqual(passed, want, `${selector}: both presses of a rapid control reach the page`); }
    else {
      assert.equal(after.armed - before.armed, 1, `${selector}: one press armed the guard`);
      assert.ok(after.swallowed > before.swallowed, `${selector}: the second press was swallowed (${before.swallowed} -> ${after.swallowed})`);
      assert.deepEqual(passed, want, `${selector}: only the first press reached the page`);
    }
    await settled(); await page.evaluate(() => { window.__tenderloinPressSettleMs = 0; });
    guarded.push(selector);
  }
  const use = (selector, opts) => guarded.includes(selector) ? press(page, selector, w.touch) : once(selector, opts);
  const held = async selector => { await page.locator(selector).focus(); await holdEnter(page); };
  async function tapAt({ x, y }, what) {
    await counting(); const before = await call(page, 'pressSettle');
    if (w.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    const want = { pointerdown: 1, pointerup: 1, click: 0 }, [after, passed] = await letThrough(page, before, want, true);
    assert.equal(after.armed - before.armed, 1, `${what}: the dialog the tap opened under the pointer armed the guard`);
    assert.deepEqual(passed, want, `${what}: the tap's pointerup reached the page; its click went to the new dialog and was claimed`);
    await settled(); await page.evaluate(() => { window.__tenderloinPressSettleMs = 0; });
    return { armed: after.armed - before.armed, swallowed: after.swallowed - before.swallowed };
  }
  return { once, use, held, tapAt, guarded };
}

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
  await step(`${w.name} Play the 3D edition: the page's link and its own Settings row`, async () => {
    const saved = await stored(page), onPage = await editionLinkCheck(page, 'swap-edition');
    targets.editionLink = await layoutCheck(page, w, 'edition-link');
    await press(page, '#settings-button', w.touch); await page.locator('#swap-edition-settings').waitFor();
    const inSettings = await editionLinkCheck(page, 'swap-edition-settings');
    const help = await page.evaluate(() => { const a = document.querySelector('#swap-edition-settings'), p = document.getElementById(a.getAttribute('aria-describedby')); return [p?.textContent, p?.parentElement === a.parentElement && a.parentElement.classList.contains('edition-row')]; });
    assert.deepEqual(help, [EDITION_TEXT.help, true], 'its row has the one-sentence help, which describes the link');
    targets.settingsEdition = await layoutCheck(page, w, 'settings-edition');
    await press(page, '#close-modal', w.touch); await closed(page);
    assert.equal(await stored(page), saved, 'looking at the links writes nothing');
    return { page: onPage, settings: inSettings };
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
      ['host-finished', '#host-afternoon', null, 'Programme Studio | Afternoon hosted'], ['film', '#film-shoot', null, 'A little film on the block.'],
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
  // As a player switches: a real click on Play the 3D edition loads the Godot build in this tab, and it reads the fork's save.
  await step(`${w.name} Play the 3D edition opens Godot, which reads the fork's save`, async () => {
    await stat(new URL('artifacts/godot-web/index.pck', root)).catch(() => assert.fail('artifacts/godot-web/index.pck is missing; run npm run godot:export'));
    const forkRaw = await stored(page);
    assert.equal(await page.evaluate(() => !!document.querySelector('dialog[open]')), false, 'no dialog covers the link');
    log.on = 'godot';
    await Promise.all([page.waitForURL(base + '/godot/', { waitUntil: 'commit', timeout: 30000 }), page.locator('#swap-edition').click()]);
    assert.equal(page.context().pages().length, 1, 'the 3D edition opened in this tab');
    const g = await godotReady(page);
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
    const want = mode === 'rapid' ? { pointerdown: 2, pointerup: 2, click: 2 } : { pointerdown: 1, pointerup: 1, click: mode === 'map' ? 0 : 1 }, [after, passed] = await letThrough(page, before, want, mode !== 'rapid');
    if (mode === 'rapid') { assert.equal(after.swallowed, before.swallowed, 'a [data-rapid] control still under the pointer is not gated'); assert.deepEqual(passed, want); }
    else {
      assert.equal(after.armed - before.armed, 1, 'one press armed the guard');
      assert.ok(after.swallowed > before.swallowed, `pressSettle().swallowed increased (${before.swallowed} -> ${after.swallowed})`);
      assert.deepEqual(passed, want, mode === 'map' ? "only the first tap's pointerup reached the page; its click went to the new dialog and was claimed" : 'only the first press reached the page');
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
  await step('recovery: another tab starting over withdraws a pending offer, and this visit’s conversations start over', async () => {
    await walkTo(page, w, 'bea'); await press(page, '#talk-chat', w.touch); await press(page, '#talk-chat', w.touch);
    await until(page, () => window.tenderloin.conversation().header.includes('Turn 3/5'), null, 'Bea is on her third turn');
    await press(page, '#close-modal', w.touch); await closed(page);
    await stale(godotEnvelope({ save_seq: 24, visited_neighbors: ['bea'] })); await offered('a stale save is offered back');
    await S.page.evaluate(key => localStorage.removeItem(key), GODOT_SAVE_KEY); // Start fresh in another tab
    await until(page, () => !document.querySelector('dialog[open]') && /cleared in another tab/.test(document.querySelector('#toast').textContent), null, 'the offer is withdrawn and the restart is reported');
    assert.deepEqual((await call(page, 'snapshot')).visited, [], 'this tab takes the fresh afternoon');
    assert.deepEqual(Object.values((await call(page, 'conversation')).talks).filter(n => typeof n === 'number' && n > 0), [], 'and its conversation turns start over, as a restart here does');
    await walkTo(page, w, 'bea'); const s = await written(page, 0, { save_seq: 1, visited_neighbors: ['bea'] });
    const talk = await call(page, 'conversation');
    assert.ok(talk.header.includes('Turn 1/5'), `Bea's next panel reads Turn 1/5 (${talk.header})`);
    assert.equal(talk.line, webLine(neighborLines({ opened: false }, 'bea')[0]), 'and says her first line');
    await press(page, '#close-modal', w.touch); await closed(page);
    return { seq: s.env.save_seq };
  });
  await step('recovery: Use the shared save adopts it as a load does, so the ending visit starts over', async () => {
    await start(filmDoneEnvelope({ save_seq: 30 }));
    await press(page, '#film-shoot', w.touch); await until(page, () => window.tenderloin.ending().stage === 'screening', null, 'the screening opens');
    await press(page, '#screen-frame-2', w.touch); assert.equal((await call(page, 'ending')).visit.screenFrame, 2, 'a visit-only choice in the ending');
    await page.keyboard.press('Escape'); await closed(page);
    await stale(civicDoneEnvelope({ save_seq: 31 })); await offered('a save without the film is offered back');
    await press(page, '#recover-skip', w.touch); await dismissCard(page, w, await cardCheck(page, false));
    const [visit, snap] = await Promise.all([call(page, 'ending'), call(page, 'snapshot')]);
    assert.deepEqual([snap.film.phase, visit.visit.screenFrame], ['idle', 0], "the ending's visit-only copies start over with the shared save");
    return { screenFrame: visit.visit.screenFrame };
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
  await step("recovery: another tab's save with new film copies closes the open screening and says the ending started fresh", async () => {
    await start(filmDoneEnvelope({ save_seq: 60 }));
    await press(page, '#film-shoot', w.touch); await until(page, () => window.tenderloin.ending().stage === 'screening', null, 'the screening opens');
    const { film } = filmDoneEnvelope(), framing = film.result.framing === 'wide' ? 'close' : 'wide';
    await stale(filmDoneEnvelope({ save_seq: 61, film: { ...film, draft: { ...film.draft, framing }, result: { ...film.result, framing } } }));
    await until(page, () => !document.querySelector('dialog[open]'), null, "the new copies close the screening (nothing was lost, so nothing is offered back)");
    await until(page, text => document.querySelector('#toast').textContent === text, FORK_TEXT.copiesChanged, 'the toast says why the screen closed');
    // The storage event's task closes the dialog, then redraws the afterglow and so replaces the button close() focused. The dialog's
    // close event comes after that task (Chrome dispatches it with the next frame) and focuses the new #film-shoot: wait for it.
    await until(page, () => document.activeElement?.id === 'film-shoot', null, "focus returns to the film button once the dialog's close event has run", 8000);
    assert.deepEqual([(await call(page, 'ending')).stage, (await call(page, 'snapshot')).film.result.framing, await page.evaluate(() => document.activeElement?.id)], [null, framing, 'film-shoot']);
    return { toast: FORK_TEXT.copiesChanged };
  });
  for (const tab of [{ log }, S]) clean(tab.log);
  await context.close();
}

// Play the 3D edition where leaving could lose progress (edition.js swapAction): a pending recovery offer comes back and says why,
// and a held save asks first. Until the player chooses, nothing opens the 3D edition and nothing is written. With nothing pending,
// a middle click or a Ctrl+click keeps the browser's new tab (a stand-in /godot/ page); the last step opens the real build. Page S
// stands in for a 3D tab that was opened earlier. A navigation is counted in Playwright: a /godot/ request from this tab's main frame,
// or a new page. Nothing in a click promises that a navigation it starts has begun when it returns, so a check that none happened
// first waits for what the press must show, then gives a navigation 400 ms.
async function editionSwap(w) {
  const context = await newContext(w), { page, log } = await newPage(context, 'edition-swap'), S = await newPage(context, 'edition-swap-3d-tab');
  const sameTab = [], newTabs = [], link = page.locator('#swap-edition');
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame() && new URL(r.url()).pathname === '/godot/') sameTab.push(r.url()); });
  context.on('page', p => newTabs.push(p));
  const start = async raw => { await page.bringToFront(); await seed(page, raw); await boot(page); await dismissCard(page, w, await cardCheck(page, true)); await page.evaluate(() => { window.__nextStayed = true; }); };
  const offered = what => until(page, () => !!document.querySelector('dialog[open] [data-recovery] #recover-save'), null, what, 30000);
  const why = () => until(page, text => document.querySelector('dialog[open] [data-recovery] .grid-message')?.textContent === text && document.querySelector('#modal-status').textContent === text, EDITION_TEXT.recover, 'the offer says why the swap waits, in its text and its status line');
  const asked = what => until(page, title => document.querySelector('dialog[open] #modal-title')?.textContent === title && document.activeElement?.id === 'swap-stay', EDITION_TEXT.title, `${what} asks first, with Stay here focused`);
  const backOn = (id, what) => until(page, id => document.activeElement?.id === id, id, `${what} returns focus to #${id}`);
  async function stayed(what) {
    await page.waitForTimeout(400);
    assert.deepEqual([sameTab, newTabs.length], [[], 0], `${what}: nothing opened the 3D edition`);
    assert.equal(await page.evaluate(() => window.__nextStayed), true, `${what}: this tab is the same page`);
  }
  async function middle() { await link.scrollIntoViewIfNeeded(); const b = await link.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'middle' }); }
  await step('edition swap: with nothing pending, a middle click and a Ctrl+click open the 3D edition in a new tab, and this tab stays', async () => {
    const text = canonicalStringify(readyEnvelope({ save_seq: 5 }));
    await start(text);
    await context.route(base + '/godot/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>3D edition stand-in</title><link rel="icon" href="data:,">' }));
    try {
      for (const [how, open] of [['middle click', middle], ['Ctrl+click', () => link.click({ modifiers: ['Control'] })]]) {
        const tab = context.waitForEvent('page', { timeout: 10000 }); await open(); const opened = await tab;
        await opened.waitForURL(base + '/godot/', { waitUntil: 'commit', timeout: 10000 }).catch(() => assert.fail(`a ${how} opens the 3D edition in a new tab (it opened ${opened.url()})`));
        await opened.close();
      }
    } finally { await context.unroute(base + '/godot/'); }
    assert.equal(newTabs.length, 2, 'two new tabs'); newTabs.length = 0;
    assert.deepEqual(sameTab, [], 'this tab stays on the fork');
    assert.deepEqual(await page.evaluate(() => [window.__nextStayed, !!document.querySelector('dialog[open]')]), [true, false], 'the same page, with no dialog');
    assert.equal(await stored(page), text, 'and nothing is written');
    return { newTabs: ['middle click', 'Ctrl+click'] };
  });
  await step('edition swap: a pending recovery offer comes back and says why; a click, a middle click or a Ctrl+click opens nothing', async () => {
    await start(canonicalStringify(readyEnvelope({ save_seq: 10 })));
    const stale = canonicalStringify(godotEnvelope({ save_seq: 11, visited_neighbors: ['bea'] }));
    await seed(S.page, stale); await page.bringToFront(); await offered('a stale save from another tab is offered back');
    await settledClose(page, () => page.keyboard.press('Escape'), 'Escape puts the choice off');
    for (const [how, act] of [['click', () => link.click()], ['middle click', middle], ['Ctrl+click', () => link.click({ modifiers: ['Control'] })]]) {
      await act(); await offered(`a ${how} on the link brings the offer back`); await why(); await stayed(`a ${how}`);
      if (how !== 'Ctrl+click') await settledClose(page, () => page.keyboard.press('Escape'), `Escape after the ${how}`);
    }
    assert.deepEqual([await stored(page), (await call(page, 'snapshot')).visited], [stale, MET], "nothing is written, and this tab keeps its own progress");
    await press(page, '#recover-save'); await closed(page);
    const s = await written(page, 11, { save_seq: 12, visited_neighbors: MET });
    return { seq: s.env.save_seq };
  });
  await step('edition swap: the link reads the shared save again first, so a stale save no event reported is offered back too', async () => {
    const was = await envelope(page), stale = canonicalStringify(godotEnvelope({ save_seq: was.env.save_seq + 1, visited_neighbors: ['bea'] }));
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, stale]); // as another tab whose storage event has not reached this one
    assert.deepEqual((await call(page, 'snapshot')).visited, MET, 'nothing has told this tab yet');
    await link.click(); await offered("the swap finds the stale save and offers this tab's progress back"); await why(); await stayed('the click');
    assert.equal(await stored(page), stale, 'nothing is written while the offer waits');
    await press(page, '#recover-save'); await closed(page);
    const s = await written(page, was.env.save_seq + 1, { visited_neighbors: MET });
    return { seq: s.env.save_seq };
  });
  let bad;
  await step('edition swap: an unreadable save asks first; Stay here, Escape and a held Enter stay, back on the link; Settings asks too', async () => {
    bad = canonicalStringify({ ...JSON.parse(GODOT_WRITTEN.firstMeeting), mural_palette: 'neon' });
    assert.equal(parseGodotSave(bad).status, 'invalid');
    await start(bad); assert.equal((await call(page, 'save')).status, 'held');
    await link.click(); await asked('a click on the link');
    const dialog = await page.evaluate(() => ({ text: document.querySelector('dialog[open]').innerText, buttons: [...document.querySelectorAll('dialog[open] .button-row button')].map(b => [b.id, b.textContent]) }));
    assert.ok(dialog.text.includes(EDITION_TEXT.confirm), 'the question says the 3D edition would start fresh and replace the save');
    assert.deepEqual(dialog.buttons, [['swap-open', EDITION_TEXT.open], ['swap-stay', EDITION_TEXT.stay]]);
    const targets = await layoutCheck(page, w, 'swap-confirm'); await stayed('the click');
    await settledClose(page, () => page.locator('#swap-stay').click(), 'Stay here'); await backOn('swap-edition', 'Stay here');
    await link.click(); await asked('the link again');
    await settledClose(page, () => page.keyboard.press('Escape'), 'Escape'); await backOn('swap-edition', 'Escape');
    // A held Enter on the link opens the question once, and its repeats never press a button in it.
    await link.focus(); await holdEnter(page); await asked('a held Enter'); await stayed('a held Enter');
    await settledClose(page, () => page.keyboard.press('Enter'), 'a fresh Enter on Stay here'); await backOn('swap-edition', 'Enter on Stay here');
    // Settings' link asks too, and Stay here draws Settings again on its link.
    await page.locator('#settings-button').click(); await page.locator('#swap-edition-settings').click(); await asked("Settings' link");
    await page.locator('#swap-stay').click();
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Your afternoon.' && document.activeElement?.id === 'swap-edition-settings', null, 'Stay here goes back to Settings, on its link');
    await stayed("Settings' Stay here");
    assert.equal(await stored(page), bad, 'the unreadable save is kept as it is');
    return { targets };
  });
  await step('edition swap: Open the 3D edition goes in this tab, and Godot starts fresh without writing over the unreadable save yet', async () => {
    await stat(new URL('artifacts/godot-web/index.pck', root)).catch(() => assert.fail('artifacts/godot-web/index.pck is missing; run npm run godot:export'));
    await page.locator('#swap-edition-settings').click(); await asked("Settings' link");
    log.on = 'godot';
    await Promise.all([page.waitForURL(base + '/godot/', { waitUntil: 'commit', timeout: 30000 }), page.locator('#swap-open').click()]);
    assert.equal(newTabs.length, 0, 'in this tab');
    const g = await godotReady(page);
    assert.equal(g.visited_count, 0, 'the 3D edition starts fresh, as the question said');
    assert.equal(await stored(page), bad, 'and has not written over the unreadable save: its first change will');
    await page.screenshot({ path: file(`${w.name}-godot-held-save.png`) });
    return { godot: pick(g, ['visited_count', 'mural_count', 'block_opened']) };
  });
  for (const tab of [{ log }, S]) clean(tab.log);
  await context.close();
}

// Restart clears the shared save, so a held or repeated Enter must never confirm it. The guard runs as in production.
async function restartSafety(w) {
  const context = await newContext(w, { gate: true }), { page, log } = await newPage(context, `restart-${w.name}`);
  // The guard's window runs on frame time, so the previous press on Settings may still hold it after 500 ms of real time; a
  // deliberate new press waits for it to close.
  const settings = async () => {
    if (await page.evaluate(() => document.querySelector('#modal').open)) { await page.keyboard.press('Escape'); await closed(page); }
    await until(page, () => !window.tenderloin.pressSettle().open, null, 'the press-settle window of the last press closes');
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
    // A scene painted over a held save is not saved, and its receipt says so (Godot save_receipt with a visit-only reason).
    await walkTo(page, w, 'celeste'); await press(page, '#start-mural'); await press(page, '#mural-scenes');
    await until(page, () => window.tenderloin.ending().stage === 'stories', null, 'Mural Stories opens over a held save');
    await press(page, '#scene-target-0');
    const receipt = 'Visit-only: not saved; reload may lose changes. Cooking Together painted on the left.';
    assert.ok((await page.locator('#ending-reader').innerText()).startsWith(receipt), 'the reader gives the visit-only receipt');
    assert.ok((await page.evaluate(() => document.querySelector('#modal-status').textContent)).startsWith(receipt), 'the announcement gives the visit-only receipt');
    assert.deepEqual((await call(page, 'snapshot')).muralScenes, { left: 'cooking' }, 'the scene shows for this visit');
    await press(page, '#close-modal'); await closed(page);
    assert.equal(await stored(page), bad, 'the held save is left byte-identical');
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
  // Godot release_pending: a movement key held while a dialog closes does not walk until it is released and pressed again.
  await step(`${w.name} a movement key held while a dialog closes does not walk; a fresh press does`, async () => {
    await start(GODOT_WRITTEN.firstMeeting);
    const x = async () => (await call(page, 'snapshot')).player.x;
    await press(page, '#journal-button'); await page.locator('dialog[open] #close-modal').focus();
    await page.keyboard.down('ArrowRight'); await press(page, '#close-modal'); await closed(page);
    const before = await x();
    for (let i = 0; i < 6; i++) { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(50); }
    await page.waitForTimeout(200);
    // Two animation frames in the page after the repeats, so at least one game frame has run with the key as the repeats left it.
    await page.evaluate(() => { window.__nextFrames = 0; requestAnimationFrame(function count() { if (++window.__nextFrames < 2) requestAnimationFrame(count); }); });
    await until(page, () => window.__nextFrames >= 2, null, 'two animation frames run after the repeats', 8000);
    assert.equal(await x(), before, 'repeats of the key held through the close do not walk');
    // Walking runs on animation frames, which a loaded machine slows to a few a second: hold the fresh press until it walks.
    await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowRight');
    try { await until(page, before => window.tenderloin.snapshot().player.x > before, before, 'a fresh press walks', 8000); } finally { await page.keyboard.up('ArrowRight'); }
    assert.ok(await x() > before, 'a fresh press walks');
    return { walked: Math.round(await x() - before) };
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
    await walkTo(page, w, 'bea');
    // The chosen layout shows as chosen, as the classic choice cards did: the hosting choices' selected look, not only aria-pressed.
    await pressedLook(page, '#choose-table', '#choose-floor');
    await press(page, '#choose-table'); await page.locator('.placement-grid').waitFor();
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
    // Each held Enter starts on a button focused once the dialog before it has finished closing: while its close event is still
    // pending, that event could move focus to the map, where Enter talks to Bea instead.
    await seed(page, canonicalStringify(readyEnvelope({ save_seq: 12 }))); await boot(page);
    const startCard = await cardCheck(page, true); await settledClose(page, () => dismissCard(page, w, startCard), 'the startup card');
    await until(page, () => document.querySelector('#world-prompt span').textContent === 'Talk with Bea', null, 'the map prompt offers Bea, who stands by the start');
    await page.locator('#world-prompt').focus(); await holdEnter(page);
    assert.deepEqual(await page.evaluate(() => [document.querySelector('dialog[open] #modal-title')?.textContent, !!document.querySelector('#choose-table'), !!document.querySelector('.placement-grid')]), ['Bea', true, false], "Bea's dialog opens and nothing in it is chosen");
    assert.equal((await call(page, 'snapshot')).layout, null); assert.equal((await envelope(page)).env.gathering_layout, '');
    await settledClose(page, async () => { await page.keyboard.press('Escape'); await closed(page); }, "Escape on Bea's dialog");
    await page.locator('#open-gathering').focus(); await holdEnter(page);
    assert.equal(await page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent), 'You made a little room.', 'the opening dialog stays up to be read');
    await written(page, 12, { block_opened: true });
    await page.keyboard.press('Escape'); const card = await cardCheck(page, false); await settledClose(page, () => dismissCard(page, w, card), 'the chapter card');
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
// The ending chain and Dez's Rhythm Circle in the real page, from the entry points Godot offers: the hosted view, Follow to
// the Listening Hour, Gather again from Posted, Dez's film offer, the screening, the helper bench and the habitat room,
// Mural Stories from the mural, and the circle in practice and hosting modes. Ending steps and practice are visit-only, so
// the stored save stays byte-identical; hosting toggles and Complete save, and a painted scene writes mural_scenes.
async function endingSuite(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `ending-${w.name}`);
  const start = async raw => { await seed(page, raw); await boot(page); await dismissCard(page, w, await cardCheck(page, true)); };
  const title = () => page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent);
  const stage = async () => (await call(page, 'ending')).stage;
  const focused = () => page.evaluate(() => document.activeElement?.id);
  const toastText = () => page.evaluate(() => document.querySelector('#toast').textContent);
  const targets = {};
  await step(`${w.name} ending: the hosted view, Follow to the Listening Hour and Gather again from Posted keep the save`, async () => {
    const raw = canonicalStringify(hostedEnvelope({ save_seq: 80 })); await start(raw);
    await press(page, '#host-afternoon', w.touch);
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Programme Studio | Afternoon hosted', null, 'the hosted view opens');
    assert.equal(await stage(), 'hosted'); assert.equal(await focused(), 'hosted-card-stories', "Godot's first card has focus");
    targets.hosted = await layoutCheck(page, w, 'ending-hosted');
    await press(page, '#hosted-card-art', w.touch); assert.equal(await page.locator('#hosted-card-art').getAttribute('aria-pressed'), 'true');
    await pressedLook(page, '#hosted-card-art', '#hosted-card-stories');
    // A chapter card would open from the dialog's close event (game.js queueChapterCard), so these are read once it has run.
    await settledClose(page, async () => { await press(page, '#hosted-follow', w.touch); await closed(page); }, 'Follow');
    assert.equal(await focused(), 'civic-hour', 'Follow focuses the Listening Hour button');
    assert.match(await toastText(), /Listening Hour is focused\. Open that button when you are ready; your plan and conversation are unchanged\.$/);
    assert.equal(await call(page, 'story').then(s => s.card), false, 'no chapter card steals focus');
    await press(page, '#next-afternoon', w.touch); await press(page, '#programme-view', w.touch);
    await page.locator('#programme-gather').waitFor(); assert.equal(await page.locator('#programme-gather').textContent(), 'Gather again');
    // programme_studio.gd description(): the posted view, once all four are hosted, says what Gather again is.
    assert.equal(await page.locator('#posted-gather').textContent(), GODOT['programme_studio.gd'].description.postedGather, "the poster shows Godot's Gather again line");
    await press(page, '#programme-gather', w.touch); await until(page, () => window.tenderloin.ending().stage === 'gather', null, 'Gather again opens');
    targets.gather = await layoutCheck(page, w, 'ending-gather');
    await press(page, '#gather-choice-0', w.touch); await page.keyboard.press('Escape'); await closed(page);
    assert.equal(await focused(), 'host-afternoon', 'Escape returns to the second gathering');
    await press(page, '#next-afternoon', w.touch); await press(page, '#programme-view', w.touch);
    assert.equal(await page.locator('#programme-gather').textContent(), 'Resume gathering', 'the visit is kept');
    await press(page, '#close-modal', w.touch); await closed(page);
    assert.equal(await stored(page), raw, 'the hosted view and Gather again write nothing');
    return { targets: targets.hosted + targets.gather };
  });
  await step(`${w.name} ending: Dez's offer, the screening, the helper bench and the habitat room keep the save`, async () => {
    const raw = canonicalStringify(filmDoneEnvelope({ save_seq: 81 })); await start(raw);
    await press(page, '#civic-hour', w.touch); await page.locator('#civic-follow').waitFor();
    targets.civic = await layoutCheck(page, w, 'ending-civic');
    await press(page, '#civic-follow', w.touch); await closed(page);
    assert.equal(await focused(), 'film-shoot', "Follow focuses Dez's film button");
    assert.match(await toastText(), /^Dez's invitation: Screen our little film\. Choose this film action when you are ready; your film is unchanged\.$/);
    await press(page, '#film-shoot', w.touch);
    await until(page, () => /^The Open Seat \| 1 \/ 3/.test(document.querySelector('dialog[open] #modal-title')?.textContent), null, 'the screening opens on frame 1');
    assert.equal(await focused(), 'screen-frame-0');
    targets.screening = await layoutCheck(page, w, 'ending-screening');
    // Godot draws the screening frames, the bench forms and the room's places as toggles: the pressed one looks chosen.
    await pressedLook(page, '#screen-frame-0', '#screen-frame-1');
    await press(page, '#screen-frame-2', w.touch); await page.keyboard.press('Escape'); await closed(page);
    assert.equal(await focused(), 'film-shoot');
    await press(page, '#film-shoot', w.touch); await until(page, () => /^The Open Seat \| 3 \/ 3/.test(document.querySelector('dialog[open] #modal-title')?.textContent), null, 'the frame is kept for the visit');
    await press(page, '#screen-helper', w.touch); await until(page, () => window.tenderloin.ending().stage === 'bench', null, 'Helper workshop opens the bench');
    targets.bench = await layoutCheck(page, w, 'ending-bench'); await pressedLook(page, '#bench-form-0', '#bench-form-1');
    await press(page, '#bench-support-1', w.touch); await press(page, '#bench-support-0', w.touch); await press(page, '#bench-assist', w.touch);
    assert.equal((await call(page, 'ending')).visit.bench.complete, true, 'the helper lifts the stand');
    await press(page, '#bench-habitat', w.touch); await until(page, () => window.tenderloin.ending().stage === 'room', null, 'Habitat room opens');
    targets.room = await layoutCheck(page, w, 'ending-room'); await pressedLook(page, '#room-place-0', '#room-place-1');
    await page.keyboard.press('Escape'); await closed(page); assert.equal(await focused(), 'film-shoot');
    assert.equal(await stored(page), raw, 'every ending step is visit-only');
    await page.reload(); await until(page, () => !!window.tenderloin, null, 'the fork restarts', 15000);
    assert.equal((await call(page, 'ending')).visit.bench.complete, false, 'a reload clears the visit');
    await dismissCard(page, w, await cardCheck(page, true));
    assert.equal(await stored(page), raw);
    return { targets: targets.civic + targets.screening + targets.bench + targets.room };
  });
  await step(`${w.name} ending: Paint Scenes opens Mural Stories, which writes mural_scenes by Godot's rules`, async () => {
    const before = await envelope(page);
    await walkTo(page, w, 'celeste'); await press(page, '#start-mural', w.touch); await page.locator('#mural-scenes').waitFor();
    assert.equal(await page.locator('#mural-scenes').textContent(), 'Paint Scenes');
    await press(page, '#mural-scenes', w.touch); await until(page, () => window.tenderloin.ending().stage === 'stories', null, 'Mural Stories opens');
    targets.stories = await layoutCheck(page, w, 'ending-stories');
    await pressedLook(page, '#scene-choice-0', '#scene-choice-1');
    await press(page, '#scene-target-0', w.touch);
    const s = await written(page, before.env.save_seq, { mural_scenes: { left: 'cooking' } });
    // Godot's footer: Palette:\n<Name>, Music:\nOn/Off, Back to\nMural, then the page button.
    const on = (await call(page, 'sound')).enabled;
    assert.equal(await page.locator('#ending-music').innerText(), on ? 'Music:\nOn' : 'Music:\nOff', "Godot's two-line Music label");
    const PAL = ['garden', 'sunset', 'ocean'], snap = await call(page, 'snapshot'), nextPal = PAL[(PAL.indexOf(snap.palette) + 1) % 3], Cap = p => p[0].toUpperCase() + p.slice(1);
    assert.equal(await page.locator('#scene-palette').innerText(), `Palette:\n${Cap(snap.palette)}`);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-ending="stories"] .ending-tray > button')].map(b => b.id)), ['scene-lift-0', 'scene-lift-1', 'scene-palette', 'ending-music', 'scene-back', 'scene-page'], "the footer follows Godot's order");
    await press(page, '#scene-palette', w.touch);
    const p = await written(page, s.env.save_seq, { mural_palette: nextPal, mural_scenes: { left: 'cooking' } });
    assert.equal(await page.locator('#scene-palette').innerText(), `Palette:\n${Cap(nextPal)}`);
    assert.equal(await page.evaluate(() => document.querySelector('#modal-status').textContent), `Portable Mural Board palette set to ${Cap(nextPal)} (${Object.keys(snap.mural).length}/3 motifs).`, "Godot's palette announcement");
    assert.equal(await page.evaluate(() => window.tenderloin.ending().stage), 'stories', 'the palette changes inside Mural Stories');
    // A held Escape goes back to the workshop only (Godot checks not event.echo), with Paint Scenes focused (close_stories). The return
    // and the whole hold reaching the page are polled; then 300 ms for a repeat's close to land.
    const hold = await heldEscape(page);
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Many hands. One mural.' && document.activeElement?.id === 'mural-scenes', null, 'a held Escape returns to the mural, and Back to the workshop focuses Paint Scenes');
    await hold.delivered(); await page.waitForTimeout(300);
    assert.deepEqual({ ...pick(await hold.counts(), ['open', 'cancel', 'closes']), title: await title(), focus: await focused() }, { open: true, cancel: 1, closes: 0, title: 'Many hands. One mural.', focus: 'mural-scenes' }, 'a held Escape stays at the mural: its first press is the one close request, and the dialog never closed');
    await press(page, '#mural-scenes', w.touch); await until(page, () => window.tenderloin.ending().stage === 'stories', null, 'Mural Stories opens again');
    await press(page, '#scene-back', w.touch); await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Many hands. One mural.', null, 'Back returns to the mural');
    assert.equal(await focused(), 'mural-scenes', 'Back to Mural focuses Paint Scenes');
    await press(page, '#close-modal', w.touch); await closed(page);
    return { seq: p.env.save_seq, targets: targets.stories };
  });
  await step(`${w.name} rhythm: the afterglow's Rhythm Circle practises without saving; hosting toggles and Complete save`, async () => {
    const raw = canonicalStringify(filmDoneEnvelope({ save_seq: 82 })); await start(raw);
    await press(page, '#rhythm-circle', w.touch);
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === "Dez's Rhythm Circle - Practice", null, 'the circle opens in practice');
    assert.equal(await focused(), 'rhythm-pad-0');
    assert.equal(await page.evaluate(() => document.querySelector('#modal-status').textContent), "Rhythm Circle. Practice copy only. Your hosted result is unchanged. Play Bar optionally auditions your hits and rests. Music must be On; set volume at Rook's speaker.");
    targets.rhythm = await layoutCheck(page, w, 'rhythm-practice');
    // WCAG 2.5.3 label in name: Play Bar's accessible name starts with its visible label, then Godot's phrase.
    assert.deepEqual(await page.locator('#rhythm-play-bar').evaluate(b => [b.innerText.replace(/\s+/g, ' ').trim(), b.getAttribute('aria-label')]), ['Play Bar', 'Play Bar: Play one bar of this rhythm']);
    await press(page, '#rhythm-pad-1', w.touch);
    assert.deepEqual(pick(await call(page, 'rhythm'), ['open', 'practice', 'pattern']), { open: true, practice: true, pattern: 87 }, 'practice toggles a copy of the hosted 85');
    // The startup card's button started the sketch, so Play Bar auditions one bar with the sketch muted, and stops it again.
    await until(page, () => window.tenderloin.sound().enabled, null, 'the sketch plays', 10000);
    await press(page, '#rhythm-play-bar', w.touch);
    assert.match(await page.evaluate(() => document.querySelector('#modal-status').textContent), /^Playing one drum bar\. The sketch is quiet until it ends\./);
    assert.deepEqual(pick(await call(page, 'sound'), ['audition', 'muted']), { audition: true, muted: true }, 'the bar plays while the sketch is muted');
    assert.equal(await page.locator('#rhythm-play-bar').getAttribute('aria-label'), 'Stop bar audition');
    await press(page, '#rhythm-play-bar', w.touch);
    assert.equal(await page.evaluate(() => document.querySelector('#modal-status').textContent), 'Bar stopped. The original sketch continues.');
    assert.deepEqual(pick(await call(page, 'sound'), ['audition', 'muted']), { audition: false, muted: false }, 'stopping the bar restores the sketch');
    await press(page, '#rhythm-back', w.touch); await closed(page);
    assert.equal(await focused(), 'rhythm-circle');
    assert.equal(await toastText(), 'Back to the block. Hosted rhythm restored; practice was not saved.');
    assert.equal(await stored(page), raw, 'practice is never saved');
    const hosting = canonicalStringify(hostedEnvelope({ save_seq: 83, hosting: { ...hostedEnvelope().hosting, results: [{ id: 'stories', value: 'memory' }] } }));
    await start(hosting); await press(page, '#host-afternoon', w.touch);
    // What we shared: the copied result line of ending/hosted.js's hosted_afternoon.gd detail(), one per hosted part.
    assert.deepEqual(await page.locator('.host-memories li').allTextContents(), ['Copied invitation: A small moment you want to keep.']);
    await press(page, '#host-rhythm', w.touch);
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === "Dez's Rhythm Circle - Hosting", null, 'the hosting beats open the circle');
    await press(page, '#rhythm-pad-0', w.touch);
    await written(page, 83, {}); assert.equal((await call(page, 'snapshot')).hosting.draft.pattern, 84, 'a hosting toggle saves the draft, as Godot does');
    // A held Escape leaves the circle for the hosting dialog it came from, and does not close that too. The return and the whole
    // hold reaching the page are polled; then 300 ms for a repeat's close to land.
    const hold = await heldEscape(page);
    await until(page, () => !!document.querySelector('dialog[open] #host-rhythm') && document.activeElement?.id === 'host-rhythm', null, 'a held Escape returns to the hosting dialog, with focus on the Rhythm Circle button, as on the afterglow one');
    await hold.delivered(); await page.waitForTimeout(300);
    assert.deepEqual({ ...pick(await hold.counts(), ['open', 'cancel', 'closes']), hosting: await page.evaluate(() => !!document.querySelector('dialog[open] #host-rhythm')), focus: await focused() }, { open: true, cancel: 1, closes: 0, hosting: true, focus: 'host-rhythm' }, 'a held Escape stops at the hosting dialog: its first press is the one close request, and the dialog never closed');
    await press(page, '#host-rhythm', w.touch);
    await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === "Dez's Rhythm Circle - Hosting", null, 'the hosting beats open the circle again');
    await press(page, '#rhythm-complete', w.touch);
    await until(page, () => window.tenderloin.snapshot().hosting.results.length === 2 && !window.tenderloin.rhythm().open, null, 'Complete records the beats');
    assert.deepEqual((await call(page, 'snapshot')).hosting.results[1], { id: 'beats', value: 84 });
    assert.match(await page.evaluate(() => document.querySelector('dialog[open]')?.innerText ?? ''), /Rhythm Circle complete \(2\/4 hosted\)\. .+ is next\./, 'the hosting dialog shows what is next');
    await press(page, '#close-modal', w.touch); await closed(page);
    return { targets: targets.rhythm };
  });
  clean(log); await context.close();
}
// Music: Godot's sketch on the worklet, started by the startup card's button, and reward chimes on progress cues.
async function musicSuite(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `music-${w.name}`);
  const sound = () => call(page, 'sound');
  await step(`${w.name} music: Escape on the startup card stays silent; its button starts Godot's sketch`, async () => {
    await boot(page); let card = await cardCheck(page, true);
    const fresh = pick(await sound(), ['enabled', 'volume', 'mask', 'summary', 'rewardsEnabled', 'rewardCount']);
    assert.deepEqual(fresh, { enabled: false, volume: 0.7, mask: 1, summary: 'bass (1/4 stems)', rewardsEnabled: true, rewardCount: 0 }, 'a new player starts at Godot volume 0.70, bass only, Sounds on, nothing played');
    await page.keyboard.press('Escape'); await closed(page);
    await page.waitForTimeout(300); assert.equal((await sound()).enabled, false, 'Escape dismisses the card without audio');
    // Godot continue_story(): a movement key on the startup card dismisses it, starts the music and walks while held.
    // A page of its own, so the walk leaves this suite's save and first visits alone.
    const keyContext = await newContext(w), key = await newPage(keyContext, `music-start-key-${w.name}`);
    await boot(key.page); await cardCheck(key.page, true); const x0 = (await call(key.page, 'snapshot')).player.x;
    await key.page.keyboard.down('ArrowRight'); await closed(key.page);
    await until(key.page, () => window.tenderloin.sound().enabled, null, 'a movement key on the startup card starts the music', 10000);
    // Walking runs on animation frames, which a loaded machine slows to a few a second: hold the key until it walks.
    try { await until(key.page, x0 => window.tenderloin.snapshot().player.x > x0, x0, 'and the held key walks', 8000); } finally { await key.page.keyboard.up('ArrowRight'); }
    assert.ok((await call(key.page, 'snapshot')).player.x > x0, 'and the held key walks');
    assert.equal((await call(key.page, 'story')).card, false);
    clean(key.log); await keyContext.close(); activePage = page;
    await page.reload(); await until(page, () => !!window.tenderloin, null, 'the fork restarts', 15000);
    card = await cardCheck(page, true); await press(page, card.button, w.touch); await closed(page);
    await until(page, () => window.tenderloin.sound().enabled, null, "the startup card's button starts the music", 10000);
    const on = await sound();
    assert.deepEqual(pick(on, ['engine', 'rate', 'muted']), { engine: 'worklet', rate: 22050, muted: false }, 'the sketch plays on the AudioWorklet at 22050 Hz');
    await until(page, () => window.tenderloin.sound().frames > 2205, null, 'the sketch clock advances', 10000);
    return pick(on, ['engine', 'rate', 'summary']);
  });
  await step(`${w.name} music: the worklet renders sketch-core.js sample for sample`, async () => {
    const diff = await page.evaluate(async () => {
      const { renderSketch } = await import('./sketch-core.js');
      const ctx = new OfflineAudioContext(1, 66150, 22050); await ctx.audioWorklet.addModule('./sketch-worklet.js');
      const node = new AudioWorkletNode(ctx, 'tenderloin-sketch', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { mask: 15, playing: true } });
      node.connect(ctx.destination);
      const got = (await ctx.startRendering()).getChannelData(0), want = new Float32Array(66150); renderSketch(want, 0, 15);
      let max = 0; for (let i = 0; i < want.length; i++) max = Math.max(max, Math.abs(got[i] - want[i]));
      return max;
    });
    assert.ok(diff < 1e-5, `worklet output matches renderSketch at mask 15 (max abs diff ${diff})`);
    return { diff };
  });
  await step(`${w.name} music: pausing keeps the clock, as Godot does`, async () => {
    await until(page, () => window.tenderloin.sound().frames > 22050, null, 'a second of the sketch has played', 10000);
    // With no dialog open, Godot's music announcements go to the page's live region, as its other announcements do.
    const said = (text, message) => until(page, text => document.querySelector('#route-status').textContent === text, text, `${message}: "${text}"`);
    // The sketch clock in frames and the page's clock in seconds, read together, so a bound can follow the time that really passed.
    const clock = () => page.evaluate(() => [window.tenderloin.sound().frames, performance.now() / 1000]);
    await press(page, '#sound-toggle', w.touch); await until(page, () => !window.tenderloin.sound().enabled, null, 'the toggle pauses');
    await said(MUSIC_TEXT.paused, "Music announces Godot's pause");
    await page.waitForTimeout(300); const [paused, pausedAt] = await clock();
    // Paused, the clock holds however slow the machine is: one still running would gain at least 0.3 s (6615 frames) by the next read.
    await page.waitForTimeout(300); const [held, heldAt] = await clock();
    assert.ok(paused > 22050 - 4410 && Math.abs(held - paused) < 2205, `the paused clock holds (${paused} -> ${held} over ${(heldAt - pausedAt).toFixed(2)} s)`);
    await press(page, '#sound-toggle', w.touch); await until(page, () => window.tenderloin.sound().enabled, null, 'the toggle plays again');
    const [resumed, resumedAt] = await clock();
    await said(playingAnnouncement({ mode: 'sketch', summary: (await sound()).summary }), "Music announces Godot's playing line");
    // Play continues from the held position, not from 0, and gains no more than the time since the last paused read (+0.1 s), however long.
    assert.ok(resumed >= held && resumed - held < (resumedAt - heldAt) * 22050 + 2205, `play resumes from the paused position (${held} -> ${resumed} over ${(resumedAt - heldAt).toFixed(2)} s)`);
    return { paused, held, resumed };
  });
  await step(`${w.name} music: a first visit chimes once; a repeat visit and Sounds Off stay quiet`, async () => {
    await walkTo(page, w, 'bea');
    await until(page, () => window.tenderloin.sound().rewardCount === 1, null, 'meeting Bea plays one chime');
    assert.deepEqual(pick(await sound(), ['rewardLastCue', 'rewardsUnlocked', 'mask']), { rewardLastCue: 'neighbor_visit', rewardsUnlocked: true, mask: 3 }, "Godot's neighbor_visit cue; brush joins the bass");
    await press(page, '#close-modal', w.touch); await closed(page);
    await walkTo(page, w, 'bea'); await page.waitForTimeout(300);
    assert.equal((await sound()).rewardCount, 1, 'a repeat visit is silent'); await press(page, '#close-modal', w.touch); await closed(page);
    await press(page, '#settings-button', w.touch); await page.locator('#reward-sounds').waitFor();
    assert.deepEqual(await page.locator('#reward-sounds').evaluate(b => [b.textContent, b.getAttribute('aria-pressed'), b.title]), ['Sounds: On', 'true', 'Gentle reward sounds. Music has separate controls with Rook.']);
    // Godot's tooltip is also the button's description, in a visually hidden element, so it is not reachable by hover alone.
    assert.deepEqual(await page.locator('#reward-sounds').evaluate(b => { const d = document.getElementById(b.getAttribute('aria-describedby')); return [d?.textContent, d?.classList.contains('sr-only')]; }), ['Gentle reward sounds. Music has separate controls with Rook.', true]);
    assert.deepEqual(await page.locator('#volume').evaluate(i => [i.min, i.max, i.value]), ['0', '100', '70'], "the volume slider runs to Godot's 100%");
    await press(page, '#reward-sounds', w.touch);
    assert.deepEqual(await page.evaluate(() => [document.querySelector('#reward-sounds').textContent, document.querySelector('#reward-sounds').getAttribute('aria-pressed'), document.querySelector('#modal-status').textContent]), ['Sounds: Off', 'false', 'Reward sounds off. Music has its own controls.']);
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SETTINGS_KEY);
    assert.equal(saved.rewardSounds, false, `Sounds Off is kept in ${SETTINGS_KEY}`); await stored(page);
    await press(page, '#close-modal', w.touch); await closed(page);
    await walkTo(page, w, 'dez'); await page.waitForTimeout(300);
    assert.equal((await sound()).rewardCount, 1, 'with Sounds Off a first visit is silent');
    await press(page, '#close-modal', w.touch); await closed(page);
    return { count: 1 };
  });
  // Godot's reward banner (bursts.js): with Sounds Off still on, a first visit's banner waits behind the dialog with its full
  // 3.2 s, shows Godot's title and detail once the dialog closes, covers no map control, takes no pointer, and ends.
  await step(`${w.name} banner: a first visit's reward banner waits behind its dialog, then shows Godot's text and ends`, async () => {
    await walkTo(page, w, 'thanh');
    const snap = await call(page, 'snapshot'), want = cueBurst({ id: 'neighbor_visit', reason: 'Thanh', suppressed: false }, cueValues(snap));
    assert.equal(want.title, 'New Neighbor Connected — Thanh');
    await until(page, () => window.tenderloin.banner().pending, null, "meeting Thanh raises Godot's banner");
    assert.deepEqual(pick(await call(page, 'banner'), ['title', 'detail', 'shown', 'timer']), { title: `* ${want.title}`, detail: want.detail, shown: false, timer: 3.2 }, 'it waits behind the dialog, its time kept');
    await press(page, '#close-modal', w.touch); await closed(page);
    await until(page, () => window.tenderloin.banner().shown, null, 'the banner shows once the dialog closes');
    const shownAt = Date.now();
    const seen = await page.evaluate(() => {
      const el = document.querySelector('#reward-banner'), r = el.getBoundingClientRect(), box = e => e.getBoundingClientRect();
      const controls = [...document.querySelectorAll('.world-panel button, .world-panel a, .map-compass')].filter(e => e.getClientRects().length && !el.contains(e));
      const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { title: document.querySelector('#reward-title').textContent, body: document.querySelector('#reward-body').textContent, hidden: el.getAttribute('aria-hidden'), pointer: getComputedStyle(el).pointerEvents,
        covered: controls.filter(c => { const b = box(c); return b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top; }).map(c => c.id || c.className), under: under?.id ?? '' };
    });
    assert.deepEqual(seen, { title: `* ${want.title}`, body: want.detail, hidden: 'true', pointer: 'none', covered: [], under: 'world' }, 'Godot text, aria-hidden, over the map and clear of every map control');
    await until(page, () => !window.tenderloin.banner().shown && document.querySelector('#reward-banner').hidden, null, 'the banner ends', 8000);
    const lasted = (Date.now() - shownAt) / 1000;
    assert.ok(lasted > 2.8, `it read for about 3.2 s (${lasted} s)`);
    return { lasted };
  });
  await step(`${w.name} music: a stored volume and Sounds choice are kept on reload`, async () => {
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), volume: 0.5 })), SETTINGS_KEY);
    await page.reload(); await until(page, () => !!window.tenderloin, null, 'the fork restarts', 15000);
    assert.deepEqual(pick(await sound(), ['volume', 'rewardsEnabled', 'rewardCount', 'enabled']), { volume: 0.5, rewardsEnabled: false, rewardCount: 0, enabled: false }, 'a stored 50% and Sounds Off are kept; loading plays no chime and no music');
    await page.keyboard.press('Escape'); await closed(page);
    return { volume: 0.5 };
  });
  clean(log); await context.close();
}
// Characters: Godot's conversations (characters.js), the speech bubble on the frame clock and the loan homecoming (hosted-text.js).
async function charactersSuite(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `characters-${w.name}`);
  const talkView = () => call(page, 'conversation'), bubbleView = () => call(page, 'bubble');
  const start = async raw => { if (raw) await seed(page, raw); await boot(page); await dismissCard(page, w, await cardCheck(page, true)); };
  await step(`${w.name} characters: Keep Chatting turns Bea's five lines, Turn 1/5 to 5/5, then wraps`, async () => {
    await start(); await walkTo(page, w, 'bea');
    const expected = neighborLines({ opened: false }, 'bea').map(webLine), seen = [];
    for (let turn = 1; turn <= 6; turn++) {
      if (turn > 1) await press(page, '#talk-chat', w.touch);
      await until(page, turn => window.tenderloin.conversation().header.includes(`Turn ${turn}/5`), (turn - 1) % 5 + 1, `the header reads Turn ${(turn - 1) % 5 + 1}/5`);
      const v = await talkView(); seen.push(v.line);
      assert.equal(v.partner, 'bea'); assert.ok(v.header.includes(NEIGHBOR_BADGES.bea), "the header carries Bea's badge");
      assert.equal(v.line, expected[(turn - 1) % 5], `turn ${turn} is Godot's line ${(turn - 1) % 5 + 1}`);
      await until(page, () => window.tenderloin.bubble()?.matched === true, null, 'the next frame finds the bubble line in the open dialog');
      assert.deepEqual(pick(await bubbleView(), ['id', 'text', 'matched']), { id: 'bea', text: spokenText(expected[(turn - 1) % 5]), matched: true }, 'the bubble says the line the open dialog shows');
    }
    assert.equal(new Set(seen.slice(0, 5)).size, 5, 'five distinct lines');
    assert.ok(!seen.some(line => /Shift\+D/.test(line)), 'no line names a 3D-only key');
    assert.deepEqual(await page.evaluate(() => ['#talk-chat', '#talk-next', '#talk-bye'].map(s => document.querySelector(s)?.hasAttribute('data-rapid'))), [true, false, false], 'only Keep Chatting is rapid, as in Godot');
    await layoutCheck(page, w, 'talk-bea');
    return { lines: seen.length };
  });
  await step(`${w.name} characters: What's Next? walks to the objective and the bubble follows the frame clock`, async () => {
    const snap = await call(page, 'snapshot'), goal = nextObjective(snap, WORLD(snap));
    await press(page, '#talk-next', w.touch); await closed(page);
    assert.deepEqual(pick(await bubbleView(), ['id', 'text', 'matched']), { id: 'bea', text: spokenText(whatsNext(goal, 'bea')), matched: false }, "Bea says Godot's What's Next? line");
    const name = NEIGHBORS.find(n => n.id === goal.neighbor).name; await talkOpen(page, name);
    assert.equal((await bubbleView())?.id, goal.neighbor, 'arriving, the neighbor speaks');
    await press(page, '#talk-bye', w.touch); await closed(page);
    assert.equal(await toastText(page), `You said goodbye to ${name}.`);
    await until(page, () => window.tenderloin.bubble() === null, null, 'a line the closed dialog showed leaves with it');
    return { walkedTo: goal.neighbor };
  });
  await step(`${w.name} characters: surprise memories and mural scenes from the save; a write keeps them`, async () => {
    const raw = canonicalStringify(openedEnvelope({ save_seq: 90, discovered_surprises: ['jeffrey_record'], mural_scenes: { left: 'music' } }));
    assert.equal(parseGodotSave(raw).status, 'loaded'); await start(raw);
    await walkTo(page, w, 'dez');
    assert.equal((await talkView()).line, webLine(NEIGHBOR_LINES.dez.open[0]).slice(0, -1) + MURAL_REPLY.dez.text + '"', "Dez's line ends with the painted guitar");
    await press(page, '#close-modal', w.touch); await closed(page);
    await walkTo(page, w, 'rook');
    // Godot leaves rook_talk_count at 0 on arrival, so the first soundcheck is still turn 1.
    for (let i = 0; i < 5; i++) await press(page, '#soundcheck', w.touch);
    await until(page, () => window.tenderloin.conversation().header.includes('Turn 5/5'), null, "Rook's fifth turn");
    assert.ok((await talkView()).line.includes(SURPRISE_MEMORY.rook.first.slice(1, -1)), "Rook's fifth line is the record he was given");
    await press(page, '#close-modal', w.touch); await closed(page);
    await walkTo(page, w, 'celeste'); await press(page, '#talk-chat', w.touch);
    const s = await written(page, 90, { celeste_talk_count: 3 });
    for (const key of ['discovered_surprises', 'mural_scenes']) assert.ok(s.raw.includes(`${JSON.stringify(key)}:${canonicalStringify(JSON.parse(raw)[key])}`), `${key} is kept byte for byte`);
    await press(page, '#close-modal', w.touch); await closed(page);
    return { seq: s.env.save_seq };
  });
  await step(`${w.name} characters: returning a loan in conversation, Godot's reply in the bubble until its timer ends`, async () => {
    await start(canonicalStringify(openedEnvelope({ save_seq: 95, epilogue: { photo: { status: 'skipped', participants: [], mural: {}, palette: 'garden', layout: 'table' }, packing: true, returned: [] } })));
    await walkTo(page, w, 'thanh');
    assert.equal(await page.locator('#return-event-loan').textContent(), `Return ${LOAN_TITLES.table}`);
    await press(page, '#return-event-loan', w.touch); await closed(page);
    assert.equal(await toastText(page), loanReturnAnnouncement('table', 1));
    assert.deepEqual(pick(await bubbleView(), ['id', 'text', 'visible', 'matched']), { id: 'thanh', text: spokenText(loanReply('table')), visible: true, matched: false }, "Thanh's reply is drawn over him");
    await page.screenshot({ path: file(`${w.name}-bubble.png`) });
    await written(page, 95, {});
    // The hold runs on the game clock (at most 45 ms a frame), which a slow headless frame rate stretches in real time.
    await until(page, () => window.tenderloin.bubble() === null, null, 'the bubble hides when its hold time ends', 40000);
    await walkTo(page, w, 'thanh');
    assert.equal(await page.locator('#loan-receipt').textContent(), `Returned ${LOAN_TITLES.table}`, 'the conversation keeps a receipt for this visit');
    assert.ok((await talkView()).line.includes(LOAN_REPLIES.table), "Thanh remembers the return in his memory tail");
    await layoutCheck(page, w, 'talk-thanh-loan');
    await press(page, '#close-modal', w.touch); await closed(page);
    return { returned: 'table' };
  });
  clean(log); await context.close();
}
// Phase 2 at every width, through real taps and clicks. Each new button is pressed twice in one gesture the first time it is
// used (the press-settle guard turned on for that press only), so the chain itself proves that a double press acts once; chained
// buttons also take a held Enter. Visit-only steps leave the stored save byte-identical, and a reload clears them.
async function phase2Suite(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `phase2-${w.name}`), narrow = isNarrow(w.viewport.width), targets = {};
  const sound = () => call(page, 'sound'), view = () => call(page, 'ending'), talkView = () => call(page, 'conversation');
  const title = () => page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent);
  const focused = () => page.evaluate(() => document.activeElement?.id);
  const status = () => page.evaluate(() => document.querySelector('#modal-status').textContent);
  const route = () => page.evaluate(() => document.querySelector('#route-status').textContent);
  const { once, use, held, guarded } = presses(page, w);
  const start = async raw => { await seed(page, raw); await boot(page); await dismissCard(page, w, await cardCheck(page, true)); return raw; };

  await step(`${w.name} phase 2: the opening card's button starts the music; volume 70% of 100 and the Sounds toggle`, async () => {
    await boot(page);
    assert.deepEqual(pick(await sound(), ['enabled', 'volume', 'rewardsEnabled', 'rewardCount']), { enabled: false, volume: 0.7, rewardsEnabled: true, rewardCount: 0 }, 'a new player: no music yet, Godot volume 0.70, Sounds on');
    const card = await cardCheck(page, true); await once(card.button);
    await closed(page); await until(page, () => window.tenderloin.sound().enabled, null, "the card's button starts the music once (a second press would stop it)", 10000);
    assert.equal((await call(page, 'story')).card, false);
    await page.waitForTimeout(300); assert.equal((await sound()).enabled, true, 'the swallowed second press did not reach the music toggle');
    await press(page, '#settings-button', w.touch); await page.locator('#reward-sounds').waitFor();
    assert.deepEqual(await page.locator('#volume').evaluate(i => [i.min, i.max, i.value]), ['0', '100', '70']);
    await once('#reward-sounds');
    assert.deepEqual([await page.locator('#reward-sounds').textContent(), await page.locator('#reward-sounds').getAttribute('aria-pressed'), await status()], [soundsLabel(false), 'false', soundsAnnouncement(false)], 'one gesture turns Sounds off once');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rewardSounds, SETTINGS_KEY), false);
    await use('#reward-sounds');
    assert.deepEqual([await page.locator('#reward-sounds').textContent(), await status()], [soundsLabel(true), soundsAnnouncement(true)]);
    targets.settings = await layoutCheck(page, w, 'p2-settings');
    await press(page, '#close-modal', w.touch); await closed(page);
    assert.equal(await stored(page), null, 'settings and music write nothing to the shared save');
    return { card: card.label, music: pick(await sound(), ['engine', 'rate']) };
  });
  let raw;
  await step(`${w.name} phase 2: a conversation turns, says What's Next? while walking and mirrors the bubble to the live region`, async () => {
    await walkTo(page, w, 'bea'); raw = (await envelope(page, { visited_neighbors: ['bea'] })).raw;
    await until(page, () => window.tenderloin.sound().rewardCount === 1, null, 'meeting Bea plays one reward chime');
    assert.equal((await sound()).rewardLastCue, 'neighbor_visit');
    const lines = neighborLines({ opened: false }, 'bea').map(webLine);
    let v = await talkView();
    assert.ok(narrow ? /^Bea · Turn 1\/5 · Sparks: \d+$/.test(v.header) : v.header.startsWith('Talking with Bea (') && v.header.includes(`${NEIGHBOR_BADGES.bea} · Turn 1/5)`), `the ${narrow ? 'narrow' : 'wide'} header (${v.header})`);
    assert.ok(v.line.startsWith(lines[0].slice(0, 20)), "Bea's first line");
    assert.deepEqual(await page.evaluate(() => ['#choose-table', '#choose-floor'].map(s => document.querySelector(s)?.getAttribute('aria-pressed'))), ['false', 'false'], "Bea's context buttons offer the layout");
    targets.talk = await layoutCheck(page, w, 'p2-talk-bea');
    await once('#talk-chat', { rapid: true });
    await until(page, () => window.tenderloin.conversation().header.includes('Turn 3/5'), null, 'Keep Chatting is rapid: two presses, two turns');
    v = await talkView(); assert.ok(v.line.startsWith(lines[2].slice(0, 20)), "Bea's third line");
    assert.equal(await stored(page), raw, 'chatting with Bea writes nothing');
    const snap = await call(page, 'snapshot'), goal = nextObjective(snap, WORLD(snap)), name = NEIGHBORS.find(n => n.id === goal.neighbor).name;
    await once('#talk-next'); await closed(page);
    assert.deepEqual(pick(await call(page, 'bubble'), ['id', 'text', 'matched']), { id: 'bea', text: spokenText(whatsNext(goal, 'bea')), matched: false }, "Bea says Godot's What's Next? line in the bubble");
    assert.equal(await route(), whatsNextAnnouncement(goal, 'bea'), "the live region gets Godot's What's Next? announcement");
    await talkOpen(page, name);
    const there = await call(page, 'snapshot'), after = nextObjective(there, WORLD(there));
    await once('#talk-bye'); await closed(page);
    assert.equal(await toastText(page), goodbyeLines(goal.neighbor, after).text);
    assert.equal(await route(), goodbyeLines(goal.neighbor, after).announcement, 'Goodbye sends the next step to the live region');
    // A context action: Long Table opens the layout editor, and the swallowed second press places nothing on its grid.
    await walkTo(page, w, 'bea'); const seq = (await call(page, 'save')).seq;
    await once('#choose-table'); await page.locator('.placement-grid').waitFor();
    await written(page, seq, { gathering_layout: 'table' });
    assert.deepEqual((await call(page, 'snapshot')).furniture, {}, 'Long Table acts once');
    await press(page, '#close-modal', w.touch); await closed(page);
    return { walkedTo: goal.neighbor };
  });
  await step(`${w.name} phase 2: Rook's music panel plays, steps the volume, returns to the sketch and loads a local track`, async () => {
    await walkTo(page, w, 'rook');
    // Godot's toggle_music_playback and start_music_playback announce through the open dialog's status line.
    const said = (text, message) => until(page, text => document.querySelector('#modal-status').textContent === text, text, `${message}: "${text}"`);
    await once('#talk-play'); await until(page, () => !window.tenderloin.sound().enabled, null, 'Play/Pause Groove pauses the music once');
    await said(MUSIC_TEXT.paused, "Pause Groove announces Godot's pause");
    await use('#talk-play'); await until(page, () => window.tenderloin.sound().enabled, null, 'and plays it again');
    await said(playingAnnouncement({ mode: 'sketch', summary: (await sound()).summary }), "Play Groove announces Godot's playing line with the stems");
    const v0 = (await sound()).volume, v2 = nextVolume(nextVolume(v0));
    await once('#talk-volume', { rapid: true });
    await until(page, v => Math.abs(window.tenderloin.sound().volume - v) < 1e-9, v2, 'Volume is rapid: two presses, two steps');
    assert.equal(await status(), volumeAnnouncement(v2));
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).volume, SETTINGS_KEY), v2, 'the volume is kept in the fork settings');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.talk-controls button')].map(b => b.id)), ['talk-play', 'talk-volume', 'soundcheck', 'talk-load', 'talk-sketch', 'talk-next', 'talk-bye'], "Rook's music buttons in Godot's order");
    // Godot use_synth_sketch: on the sketch already, the music plays on (start_music_playback), so nothing audible changes.
    await once('#talk-sketch'); assert.deepEqual(pick(await sound(), ['mode', 'enabled']), { mode: 'sketch', enabled: true }, 'the sketch button keeps the playing sketch playing');
    await said(switchedAnnouncement((await sound()).summary), "the sketch button announces Godot's use_synth_sketch line");
    assert.equal(await page.locator('#talk-play').textContent(), BUTTON_TEXT.pause, 'and the redrawn panel still offers Pause Groove');
    targets.rook = await layoutCheck(page, w, 'p2-talk-rook');
    await once('#talk-load'); await page.locator('#soundtrack-volume').waitFor();
    assert.equal(await page.locator('#soundtrack-volume').getAttribute('max'), '100');
    // Load Local Track under the fork's Content-Security-Policy: the chosen file plays from a blob: URL (media-src blob:).
    const playLocal = async () => {
      await page.setInputFiles('#soundtrack-file', { name: 'neighbors.wav', mimeType: 'audio/wav', buffer: silentWav() });
      await until(page, () => window.tenderloin.sound().mode === 'local', null, 'the local track is chosen');
      await press(page, '#track-play', w.touch); await until(page, () => window.tenderloin.sound().enabled, null, 'the local track plays', 10000);
    };
    const statusLines = () => page.evaluate(() => ['#soundtrack-status', '#modal-status'].map(id => document.querySelector(id).textContent));
    await playLocal();
    assert.deepEqual(pick(await sound(), ['mode', 'fileName', 'error']), { mode: 'local', fileName: 'neighbors.wav', error: '' });
    // The panel's status line says Godot's playing line, and the dialog's own status line does not say it again.
    assert.deepEqual(await statusLines(), [playingAnnouncement({ mode: 'local', localName: 'neighbors.wav' }), ''], "the panel's status line says Godot's local playing line, once");
    await press(page, '#track-play', w.touch); await until(page, () => !window.tenderloin.sound().enabled, null, 'Pause music pauses the local track');
    assert.deepEqual(await statusLines(), [MUSIC_TEXT.paused, ''], "a pause says only Godot's line, in the panel's status line");
    await press(page, '#track-play', w.touch); await until(page, () => window.tenderloin.sound().enabled, null, 'and plays it again', 10000);
    await press(page, '#use-sketch', w.touch); await until(page, () => window.tenderloin.sound().mode === 'sketch', null, 'Return to synth sketch leaves the local track');
    // With a local track, Play Groove says start_music_playback's local line; then Godot use_synth_sketch: Rook's sketch button
    // swaps the playing local track for the sketch, which keeps playing.
    await playLocal(); await press(page, '#close-modal', w.touch); await closed(page); await walkTo(page, w, 'rook');
    await use('#talk-play'); await said(MUSIC_TEXT.paused, 'Pause Groove pauses the local track');
    await use('#talk-play'); await said(playingAnnouncement({ mode: 'local', localName: 'neighbors.wav' }), "Play Groove announces Godot's local playing line");
    await use('#talk-sketch');
    await until(page, () => { const s = window.tenderloin.sound(); return s.mode === 'sketch' && s.enabled && /^Original 80 BPM sketch/.test(window.tenderloin.conversation().line); }, null, "Rook's sketch button swaps the playing local track for the sketch, still playing");
    assert.deepEqual([await page.locator('#talk-play').textContent(), await status()], [BUTTON_TEXT.pause, switchedAnnouncement((await sound()).summary)], "Rook's redrawn panel plays on and says Godot's switch");
    await press(page, '#close-modal', w.touch); await closed(page); await stored(page);
    return { volume: v2, local: 'neighbors.wav' };
  });
  await step(`${w.name} phase 2: memory tails, and a loan reply in the bubble and the live region`, async () => {
    raw = await start(canonicalStringify(openedEnvelope({ save_seq: 95, mural_scenes: { left: 'music' }, epilogue: { photo: { status: 'skipped', participants: [], mural: {}, palette: 'garden', layout: 'table' }, packing: true, returned: [] } })));
    await walkTo(page, w, 'dez');
    assert.ok((await talkView()).line.includes(MURAL_REPLY.dez.text), "Dez's memory tail names the painted scene");
    await press(page, '#close-modal', w.touch); await closed(page);
    const count = (await sound()).rewardCount;
    await walkTo(page, w, 'thanh'); await once('#return-event-loan'); await closed(page);
    await written(page, 95, {});
    assert.equal(await toastText(page), loanReturnAnnouncement('table', 1));
    assert.equal(await route(), `Thanh: ${spokenText(loanReply('table'))}`, 'the bubble line is mirrored to the live region while no dialog shows it');
    assert.equal((await call(page, 'bubble'))?.id, 'thanh');
    await until(page, c => window.tenderloin.sound().rewardCount === c + 1 && window.tenderloin.sound().rewardLastCue === 'loan_returned', count, 'a returned loan plays its chime once');
    return { reply: loanReply('table') };
  });
  await step(`${w.name} phase 2: the third shot finishes the film and shows Chapter 6`, async () => {
    const plan = { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] };
    raw = await start(canonicalStringify(civicDoneEnvelope({ save_seq: 70, film: { phase: 'shooting', draft: plan, result: plan, captured: ['seat', 'paint'] } })));
    await press(page, '#film-shoot', w.touch); await once('#film-capture');
    const s = await written(page, 70, {}); assert.equal(s.env.film.phase, 'done'); assert.deepEqual(s.env.film.captured, ['seat', 'paint', 'welcome']);
    await press(page, '#close-modal', w.touch);
    const card = await cardCheck(page, false); assert.equal(card.num, 6, 'the finished film moves the story to Chapter 6');
    targets.chapter6 = await layoutCheck(page, w, 'p2-chapter-6-card');
    await dismissCard(page, w, card); const c = await chapterCheck(page);
    assert.ok(c.line.startsWith(narrow ? 'Ch. 6 · Next: ' : 'Chapter 6: Your Block · Next: '), `chapter 6 line (${c.line})`);
    raw = s.raw;
    return { line: c.line };
  });
  await step(`${w.name} phase 2: Dez's offer, the screening, the bench, the room and the departure, guarded and visit-only`, async () => {
    await press(page, '#civic-hour', w.touch); await once('#civic-follow'); await closed(page);
    assert.equal(await focused(), 'film-shoot');
    await once('#film-shoot'); await until(page, () => /^The Open Seat \| 1 \/ 3/.test(document.querySelector('dialog[open] #modal-title')?.textContent), null, 'the screening opens on frame 1');
    await once('#screen-frame-1'); assert.match(await title(), /^The Open Seat \| 2 \/ 3/);
    await held('#screen-helper');
    await until(page, () => window.tenderloin.ending().stage === 'bench', null, 'a held Enter on Helper workshop opens the bench');
    assert.deepEqual((await view()).visit.bench, { selected: 0, fitted: [false, false], complete: false }, 'and presses nothing on the bench');
    await use('#bench-support-1'); await use('#bench-support-0');
    await held('#bench-assist');
    assert.deepEqual([(await view()).visit.bench.complete, (await view()).stage], [true, 'bench'], 'a held Enter on the lift lifts once and stays on the bench');
    targets.bench = await layoutCheck(page, w, 'p2-bench');
    await once('#bench-habitat'); await until(page, () => window.tenderloin.ending().stage === 'room', null, 'Habitat room opens');
    assert.deepEqual((await view()).visit.room.assigned, {}, 'the second press placed nothing');
    for (const [item, place, n] of [[0, 0, 1], [2, 1, 2], [1, 2, 3]]) {
      await use(`#room-item-${item}`); await use(`#room-place-${place}`); await held('#room-assist');
      const r = (await view()).visit.room; assert.deepEqual([Object.keys(r.assigned).length, r.complete], [n, false], `a held Enter on carry ${n} carries once and does not welcome`);
    }
    await once('#room-detail'); assert.equal((await view()).visit.room.inspecting, true, 'one gesture opens the detail view once'); await use('#room-detail');
    assert.equal(await page.locator('#room-assist').textContent(), 'Welcome Thanh'); await use('#room-assist');
    assert.equal(await page.locator('#room-assist').textContent(), 'Prepare together'); await use('#room-assist');
    targets.room = await layoutCheck(page, w, 'p2-room');
    await use('#room-item-0'); await use('#room-place-2'); await use('#room-assist');
    assert.match(await page.locator('#ending-reader').innerText(), /Celeste: My link faces our art by entry\./);
    await use('#room-place-0'); await use('#room-assist');
    for (const [item, rel] of [[2, 1], [1, 2]]) { await use(`#room-item-${item}`); await use(`#room-place-${rel}`); await use('#room-assist'); }
    assert.equal(await page.locator('#room-assist').textContent(), 'Ready together'); await use('#room-assist');
    assert.equal(await page.locator('#room-assist').textContent(), 'Depart'); await use('#room-assist');
    assert.equal((await view()).visit.room.mode, 'depart');
    await held('#room-place-0'); assert.equal((await view()).visit.room.panel, 1, 'a held Enter turns one departure panel');
    await use('#room-place-1'); assert.equal(await focused(), 'room-detail');
    targets.departure = await layoutCheck(page, w, 'p2-departure');
    assert.equal(await stored(page), raw, 'the screening, bench, room and departure write nothing');
    return { guarded: guarded.length };
  });
  await step(`${w.name} phase 2: the orbital commons by floor taps and DOM buttons, and the return home`, async () => {
    await use('#room-assist'); await until(page, () => window.tenderloin.ending().stage === 'orbit', null, 'the commons opens');
    const floor = async i => {
      const rect = page.locator(`#orbit-figure rect[data-target="${i}"]`); await rect.scrollIntoViewIfNeeded(); const b = await rect.boundingBox();
      assert.ok(b.width >= 43.5 && b.height >= 43.5, `floor target ${i} is at least 44 px (${Math.round(b.width)}x${Math.round(b.height)})`);
      if (w.touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    };
    const reached = (i, how) => until(page, i => { const s = window.tenderloin.ending(); return s.visit.orbit.reached === i && !s.moving; }, i, `${how} reaches destination ${i}`, 10000);
    await floor(0); await reached(0, w.touch ? 'a floor tap' : 'a floor click');
    targets.orbit = await layoutCheck(page, w, 'p2-orbital');
    await once('#orbit-1'); await reached(1, 'Walk to Film');
    assert.match(await page.locator('#ending-reader').innerText(), /You reached Film/);
    await once('#orbit-3'); await until(page, () => /Thanh has joined you/.test(document.querySelector('#ending-reader')?.innerText || ''), null, 'Thanh joins', 10000);
    assert.equal(await page.locator('#orbit-4').textContent(), 'Gather here');
    await held('#orbit-4'); assert.equal((await view()).visit.orbit.phase, 'gathered', 'a held Enter gathers once');
    await once('#orbit-0'); assert.equal((await view()).visit.orbit.phase, 'menu');
    await once('#orbit-2'); await use('#orbit-1'); assert.match(await page.locator('#ending-reader').innerText(), /^Memories of this visit \| Film/);
    await use('#orbit-3'); await use('#orbit-0'); assert.equal((await view()).visit.orbit.phase, 'return');
    await held('#orbit-1'); assert.equal((await view()).visit.orbit.returnPanel, 1, 'a held Enter turns one return panel');
    await use('#orbit-1'); assert.equal(await page.locator('#orbit-1').textContent(), 'Home now');
    await held('#orbit-1'); await closed(page);
    assert.equal(await focused(), 'film-shoot');
    assert.match(await toastText(page), /^You finished the imagined orbital afternoon/);
    assert.equal((await view()).visit.orbit.returned, true);
    assert.equal(await page.evaluate(() => !!document.querySelector('dialog[open]')), false, 'the held Enter that went home opened nothing after it');
    assert.equal(await stored(page), raw, 'the whole chain is visit-only');
    return { orbit: pick((await view()).visit.orbit, ['phase', 'returned']) };
  });
  await step(`${w.name} phase 2: Rhythm Circle practice by guarded presses; a reload clears every visit`, async () => {
    await once('#rhythm-circle'); await until(page, () => window.tenderloin.rhythm().open, null, 'the circle opens');
    await once('#rhythm-pad-1'); assert.equal((await call(page, 'rhythm')).pattern, 87, 'one gesture toggles one pad');
    await once('#rhythm-step-cues'); assert.equal((await call(page, 'rhythm')).stepCues, true);
    await once('#rhythm-play-bar'); assert.deepEqual(pick(await sound(), ['audition', 'muted']), { audition: true, muted: true });
    await use('#rhythm-play-bar'); assert.equal((await sound()).audition, false);
    await once('#rhythm-listen'); assert.equal((await call(page, 'rhythm')).pattern, 0, 'in practice, Listen clears the copy once (rhythm.js listen)');
    await once('#rhythm-complete'); assert.equal((await call(page, 'rhythm')).pattern, 85, 'Reset Practice restores the hosted 85 once');
    await once('#rhythm-music'); await until(page, () => !window.tenderloin.sound().enabled, null, 'Music: Off stops the sketch once');
    await use('#rhythm-music'); await until(page, () => window.tenderloin.sound().enabled, null, 'Music: On plays it again');
    targets.rhythm = await layoutCheck(page, w, 'p2-rhythm');
    await once('#rhythm-back'); await closed(page); assert.equal(await focused(), 'rhythm-circle');
    assert.equal(await stored(page), raw, 'practice is visit-only');
    await page.reload(); await until(page, () => !!window.tenderloin, null, 'the fork restarts', 15000);
    const v = await view();
    assert.deepEqual([v.visit.orbit.returned, v.visit.room.complete, v.visit.bench.complete, v.visit.room.mode], [false, false, false, 'room'], 'a reload clears the ending visit');
    assert.deepEqual(Object.values((await talkView()).talks).filter(n => typeof n === 'number' && n > 0), [], 'a reload clears the conversation turns');
    await dismissCard(page, w, await cardCheck(page, true));
    await once('#rhythm-circle'); assert.deepEqual(pick(await call(page, 'rhythm'), ['practice', 'pattern', 'stepCues']), { practice: true, pattern: 85, stepCues: false }, 'a reload clears the practice copy');
    await press(page, '#rhythm-back', w.touch); await closed(page);
    assert.equal(await stored(page), raw, 'reloading writes nothing');
    return { guarded: guarded.length };
  });
  await step(`${w.name} phase 2: the hosted view, Bea's offer and Gather again, guarded`, async () => {
    raw = await start(canonicalStringify(hostedEnvelope({ save_seq: 80 })));
    await once('#host-afternoon'); await until(page, () => window.tenderloin.ending().stage === 'hosted', null, 'the hosted view opens');
    await once('#hosted-card-beats'); assert.equal(await page.locator('#hosted-card-beats').getAttribute('aria-pressed'), 'true');
    await once('#hosted-follow'); await closed(page); assert.equal(await focused(), 'civic-hour');
    await press(page, '#next-afternoon', w.touch); await press(page, '#programme-view', w.touch);
    await once('#programme-gather'); await until(page, () => window.tenderloin.ending().stage === 'gather', null, 'Gather again opens');
    await held('#gather-choice-0'); assert.equal((await view()).visit.gather.gestures.length, 1, 'a held Enter hands off once');
    await once('#gather-choice-1'); assert.equal((await view()).visit.gather.gestures.length, 2, 'one gesture, one handoff');
    const at = (await view()).visit.gather.step;
    await once('#gather-previous'); assert.equal((await view()).visit.gather.step, at - 1, 'Previous steps back once');
    await once('#gather-next'); assert.equal((await view()).visit.gather.step, at, 'Next steps forward once');
    targets.gather = await layoutCheck(page, w, 'p2-gather');
    await page.keyboard.press('Escape'); await closed(page);
    assert.equal(await stored(page), raw, 'the hosted view and Gather again are visit-only');
    return { guarded: guarded.length };
  });
  if (!w.touch) await step(`${w.name} phase 2: Mural Stories writes mural_scenes, and the real Godot build loads them intact`, async () => {
    await stat(new URL('artifacts/godot-web/index.pck', root)).catch(() => assert.fail('artifacts/godot-web/index.pck is missing; run npm run godot:export'));
    const before = await envelope(page);
    await walkTo(page, w, 'celeste'); await press(page, '#start-mural', w.touch);
    await once('#mural-scenes'); await until(page, () => window.tenderloin.ending().stage === 'stories', null, 'Mural Stories opens');
    await once('#scene-target-0'); await written(page, before.env.save_seq, { mural_scenes: { left: 'cooking' } });
    await once('#scene-page'); await once('#scene-choice-1'); await use('#scene-target-1');
    const s = await written(page, before.env.save_seq + 1, { mural_scenes: { left: 'cooking', right: 'garden' } });
    targets.stories = await layoutCheck(page, w, 'p2-stories');
    for (const key of Object.keys(before.env)) if (!['mural_scenes', 'save_seq'].includes(key)) assert.equal(canonicalStringify(s.env[key]), canonicalStringify(before.env[key]), `${key} is unchanged by a scene edit`);
    // Godot marks the Stories Palette button rapid: both presses of one gesture cycle it.
    const PAL = ['garden', 'sunset', 'ocean'], twice = PAL[(PAL.indexOf(s.env.mural_palette) + 2) % 3];
    await once('#scene-palette', { rapid: true });
    await until(page, p => window.tenderloin.snapshot().palette === p, twice, 'two presses, two palette steps');
    const pal = await written(page, s.env.save_seq + 1, { mural_palette: twice, mural_scenes: { left: 'cooking', right: 'garden' } });
    await once('#scene-back'); await until(page, () => document.querySelector('dialog[open] #modal-title')?.textContent === 'Many hands. One mural.', null, 'Back returns to the mural');
    await press(page, '#close-modal'); await closed(page);
    log.on = 'godot'; await page.goto(base + '/godot/'); const g = await godotReady(page);
    assert.deepEqual(g.mural_scenes_world?.scenes, { left: 'cooking', right: 'garden' }, "Godot shows the fork's mural scenes");
    assert.equal(await stored(page), pal.raw, 'Godot loaded the scenes without resetting or rewriting the save');
    await page.screenshot({ path: file(`${w.name}-godot-mural-scenes.png`) }); log.on = 'fork';
    return { seq: s.env.save_seq, scenes: g.mural_scenes_world.scenes };
  });
  await step(`${w.name} phase 2: every new button checked keeps 44 px targets and its close button clear`, async () => {
    assert.deepEqual(undersized.filter(line => / p2-/.test(line) && line.startsWith(w.name + ' ')), [], 'every phase 2 screen keeps its targets at least 44 px');
    assert.deepEqual(underClose.filter(line => / p2-/.test(line) && line.startsWith(w.name + ' ')), [], "no phase 2 text is drawn under a dialog's close button");
    return { guarded, screens: Object.keys(targets).length };
  });
  clean(log); await context.close();
}
// ---------------------------------------------------------------- Phase 3: the side stories
const MAIN_TEXT = VISITS_TEXT['main.gd'], STORY_CARD = MAIN_TEXT.build_story_card, WALK_CONTROL = MAIN_TEXT.update_walk_control;
const plain = value => JSON.parse(JSON.stringify(value));
// window.tenderloin.visits() of a fresh visit (visits-kit.js freshSession through visits-ui.js snapshot): every story, the meal, the
// picker and the tour at their start, no trip, and neither place file loaded.
const FRESH_VISITS = (() => { const s = freshSession(); return plain({ screen: null, before: s.before, meal: s.meal, stories: s.stories, world: { tour: s.world.tour, guideIdx: s.world.guideIdx, lastHinted: s.world.lastHinted }, trip: null, data: { power_place: 'idle', voting_places: 'idle' } }); })();
// The side stories' two place files (browser-next/data), for an active episode's objective.
const PLACE_FILES = Object.fromEntries(['power_place', 'voting_places'].map(name => [name, JSON.parse(readFileSync(new URL(`browser-next/data/${name}.json`, root), 'utf8'))]));
// story.js reads the active episode, the tour and the last hint from the side stories (game.js storyWorld): WORLD with them.
function visitsWorld(snap, v) {
  const ctx = { opened: snap.opened === true, player: snap.player, walking: false, busy: false, sites: {}, powerPlace: v.data.power_place === 'ready' ? PLACE_FILES.power_place : null, voting: v.data.voting_places === 'ready' ? PLACE_FILES.voting_places : null };
  return { ...WORLD(snap), episode: activeEpisode(v.stories) ? activeObjective(v.stories, ctx) : null, tour: v.world.tour, lastHinted: v.world.lastHinted };
}
// chapterCheck for a visit with an active episode or a tour under way, which chapterCheck's WORLD leaves out.
async function visitsChapterCheck(page) {
  const [s, snap, v, width, text] = await page.evaluate(() => [window.tenderloin.story(), window.tenderloin.snapshot(), window.tenderloin.visits(), innerWidth, document.body.innerText]);
  const idx = currentChapter(snap), chapter = STORY_CHAPTERS[idx], goal = nextObjective(snap, visitsWorld(snap, v)), U = GODOT_TEMPLATES.update_objective_ui;
  assert.deepEqual([s.chapter, s.card], [idx, false], 'story() reports currentChapter of the page state and no open card');
  assert.deepEqual([s.objective?.id, s.objective?.text], [goal.id, goal.text], "the Next objective follows story.js nextObjective with the visit's episode, tour and last hint");
  assert.equal(s.line, isNarrow(width) ? fmt(U.narrow, chapter.num, s.objective.text) : fmt(U.wide, chapter.num, chapter.title, s.objective.text), 'the chapter line');
  assert.ok(squash(text).includes(squash(s.line)), `the chapter line is shown on the page (${s.line})`);
  return { ...s, expected: goal };
}
// The side-story screen that holds the open dialog (visits().screen with its reader in the dialog).
const onScreen = (page, screen, what, timeout = 10000) => until(page, screen => document.querySelector('#modal').open && window.tenderloin.visits().screen === screen && !!document.querySelector('dialog[open] #visits-reader'), screen, `${what} shows the ${screen} screen`, timeout);
// A story's walk: its screen closes and the trip is the visit's own while the player walks. The arrival reopens the story on the game
// clock (at most 45 ms a frame), which a loaded machine stretches, so a long walk gets minutes.
const walking = (page, id, what) => until(page, id => !document.querySelector('#modal').open && window.tenderloin.visits().trip === id && !document.querySelector('#stop-walking').disabled, id, `${what}: the story walks`, 10000);
const arrives = (page, id, what, timeout = 180000) => until(page, id => document.querySelector('#modal').open && window.tenderloin.visits().screen === id && window.tenderloin.visits().trip === null, id, `${what}: arriving reopens the story`, timeout);
// A map point in page px (the canvas, the camera's offset and scale), and whether it is on screen.
const mapPoint = (page, p) => page.evaluate(([x, y]) => { const r = document.querySelector('#world').getBoundingClientRect(), l = window.tenderloin.location(), px = r.left + l.x + x * l.scale, py = r.top + l.y + y * l.scale; return { x: px, y: py, scale: l.scale, visible: px > Math.max(0, r.left) && px < Math.min(innerWidth, r.right) && py > Math.max(0, r.top) && py < Math.min(innerHeight, r.bottom) }; }, [p.x, p.y]);
const near = (a, b, distance) => Math.hypot(a.x - b.x, a.y - b.y) <= distance;
// A position as the page has it (browser-next/visits/positions.js, the module its stories walk to and its map draws from), so the
// checks follow the streets wherever the sites sit.
const placed = (page, name) => page.evaluate(async name => (await import('./visits/positions.js'))[name], name);

// The side stories (Phase 3) through real taps, clicks and keys, from the entries Godot offers: at every width Before These Streets on
// the startup card and in Field notes, Cook & Share and the stories hub in the afterglow, the picker, a surprise beacon on the map and
// Field notes' museum and eatery cards; the Power festival, Two Dogs Home and the Lantern Procession at 390 and 1440; Larkin, the
// Election Walk, Thanh's Spot Surprise, the finale, the landmark tour and Godot reading the finds at 1440. As in phase 2, each new
// button is first pressed twice in one gesture with the press-settle guard on (Godot's rapid controls take both presses), chained
// controls also take a held Enter, and every screen is checked for 44 px targets. Only a find writes the save; the rest is visit-only.
async function visitsSuite(w) {
  const context = await newContext(w), { page, log } = await newPage(context, `visits-${w.name}`), targets = {}, how = w.touch ? 'double tap' : 'double click';
  const { once, use, held, tapAt, guarded } = presses(page, w);
  const v = () => call(page, 'visits'), sound = () => call(page, 'sound'), snap = () => call(page, 'snapshot');
  const title = () => page.evaluate(() => document.querySelector('dialog[open] #modal-title')?.textContent);
  const focused = () => page.evaluate(() => document.activeElement?.id);
  const status = () => page.evaluate(() => document.querySelector('#modal-status').textContent);
  const reader = () => page.evaluate(() => document.querySelector('dialog[open] #visits-reader')?.innerText ?? '');
  const focusIs = (id, what) => until(page, id => document.activeElement?.id === id, id, `${what}: focus is on #${id}`, 8000);
  const titled = (text, what) => until(page, text => document.querySelector('dialog[open] #modal-title')?.textContent === text, text, `${what} (${text})`);
  // A field of visits(), by its path ('meal.steps.0'), becomes a value.
  const visitIs = (path, value, what, timeout) => until(page, ([path, value]) => JSON.stringify(path.split('.').reduce((o, k) => o?.[k], window.tenderloin.visits())) === JSON.stringify(value), [path, value], `${what} (visits().${path} becomes ${JSON.stringify(value)})`, timeout);
  const opened = canonicalStringify(openedEnvelope({ save_seq: 10 })), closedBefore = changeBefore({ ...initialBefore(), open: true }, { type: 'close' }).announce;
  // Power's connector pads: each press turns one a quarter (power.js SOLUTIONS solve the relays). A pad's first use is one gesture of
  // two presses, which Godot's rapid mark lets through as two turns.
  async function solve(station) {
    const want = [...SOLUTIONS[station]].map(Number);
    for (let i = 0; i < 4; i++) {
      const pad = `#power-pad-${i}`, turned = t => visitIs(`stories.power.turns.${station}.${i}`, t, `${pad} turns`);
      let t = (await v()).stories.power.turns[station][i];
      if (!guarded.includes(pad)) { await once(pad, { rapid: true }); t = (t + 2) % 4; await turned(t); }
      while (t !== want[i]) { await use(pad); t = (t + 1) % 4; await turned(t); }
    }
  }

  await step(`${w.name} visits: Before These Streets from the startup card, a gust a press, and Back to start keeps the card's button, which starts the music`, async () => {
    await seed(page, opened); await boot(page); await cardCheck(page, true);
    assert.equal(await focused(), 'begin', "Godot's optional opening sits above the startup card's button, which keeps the focus");
    const entry = await page.locator('#before-entry').evaluate(b => [b.innerText.trim(), b.getAttribute('aria-label') ?? b.innerText.trim(), document.getElementById(b.getAttribute('aria-describedby'))?.textContent]);
    assert.deepEqual(entry, [STORY_CARD.before, STORY_CARD.before, STORY_CARD.beforeName], "Godot's label is the name; Godot's accessibility name, which does not start with it, is the description");
    targets.startCard = await layoutCheck(page, w, 'v-startup-card');
    await once('#before-entry'); await onScreen(page, 'before', 'Before These Streets');
    const open = changeBefore(initialBefore(), { type: 'open' }, { startupCard: true, storyCard: true });
    assert.deepEqual([await title(), await focused(), await status()], [BEFORE_TEXT.setup.title, 'before-gust', open.announce], "Godot's title, Send a gust focused and the opening's line");
    targets.before = await layoutCheck(page, w, 'v-before');
    await once('#before-gust'); await visitIs('before.view', 1, 'one gesture sends one gust');
    await once('#before-previous'); await visitIs('before.view', 0, 'Previous view');
    await focusIs('before-gust', 'Previous view at the first view, where it is disabled (Godot set_view)');
    await held('#before-gust'); await visitIs('before.view', 1, 'a held Enter on Send a gust');
    assert.equal((await v()).before.view, 1, 'a held Enter on Send a gust advances one view');
    await once('#before-shapes'); await visitIs('before.observation', 0, 'Changing shapes'); await pressedLook(page, '#before-shapes', '#before-time');
    await once('#before-time'); await visitIs('before.observation', 1, 'Passing time'); await pressedLook(page, '#before-time', '#before-shapes');
    await once('#before-sources'); await visitIs('before.sources', true, 'Sources'); await focusIs('visits-reader', 'Sources');
    const links = await page.evaluate(() => [...document.querySelectorAll('#visits-reader a')].map(a => [a.className, a.target, a.rel, /^https:\/\//.test(a.href)].join()));
    assert.ok(links.length > 0 && links.every(link => link === 'source-link,_blank,noreferrer,true'), `the sources are reading links that open apart with no referrer (${links.length})`);
    targets.sources = await layoutCheck(page, w, 'v-before-sources');
    await use('#before-sources'); await visitIs('before.sources', false, 'Back to scene');
    await once('#before-back');
    await until(page, () => !!document.querySelector('dialog[open] [data-chapter-card] #begin') && document.activeElement?.id === 'begin', null, 'Back to start brings the startup card back with its button focused');
    assert.equal(await status(), closedBefore, "the card's status line says Godot's close line");
    assert.deepEqual([(await v()).screen, (await v()).before.open, (await sound()).enabled], [null, false, false], 'the opening closed, and it started no audio');
    await press(page, '#begin', w.touch); await closed(page);
    await until(page, () => window.tenderloin.sound().enabled, null, "the startup card's button still starts the music", 10000);
    assert.equal(await stored(page), opened, 'the opening is visit-only');
    clean(log);
    return { sources: links.length, targets: targets.startCard + targets.before + targets.sources };
  });
  await step(`${w.name} visits: Before These Streets from Field notes returns focus to Field notes' button`, async () => {
    await press(page, '#journal-button', w.touch); await page.locator('#before-revisit').waitFor();
    const notes = await page.evaluate(() => [...document.querySelectorAll('[data-visits-notes] button')].map(b => [b.id, b.textContent]));
    assert.deepEqual(notes, [['notes-spot', conversationLabel([])], ['notes-museum', MAIN_TEXT.conversation_actions.museum], ['notes-eateries', MAIN_TEXT.conversation_actions.eateries], ['notes-park', MAIN_TEXT.landmark_tour_state.parkAction], ['notes-so-what', MAIN_TEXT.landmark_tour_state.soWhatAction]], "Field notes offer Godot's Spot Surprise, Visit the Museum and Visit Eateries, then Visit the Park and See 'So What' under the labels of Godot's landmark tour");
    targets.notes = await layoutCheck(page, w, 'v-field-notes');
    await once('#before-revisit'); await onScreen(page, 'before', 'Before These Streets from Field notes');
    assert.equal(await page.locator('#before-back').innerText(), BEFORE_TEXT.refresh.backToBlock, 'from Field notes, Back says Back to block');
    await use('#before-back'); await closed(page); await focusIs('journal-button', 'Back to block');
    assert.equal(await toastText(page), closedBefore, "Godot's close line, once the dialog has closed");
    clean(log);
    return { notes: notes.length };
  });
  await step(`${w.name} visits: Cook & Share, two dishes prepared and shared through guarded presses, and Previous and Next cook taking two presses`, async () => {
    const raw = await stored(page), meal = async () => (await v()).meal;
    assert.deepEqual(await page.evaluate(() => ['#story-entry', '#meal-entry'].map(id => document.querySelector(`#afterglow ${id}`)?.innerText)), [VISITS_TEXT['power_story.gd'].setup.story, MAIN_TEXT.make_ui.meal], "the afterglow offers Godot's Story and Cook & Share");
    targets.afterglow = await layoutCheck(page, w, 'v-afterglow');
    await once('#meal-entry'); await onScreen(page, 'meal', 'Cook & Share');
    const open = changeMeal(initialMeal(), { type: 'open' }, { opened: true });
    assert.deepEqual([await title(), await focused(), await status()], [mealView(open.state).heading, 'meal-prepare', open.announce], "the first cook's heading, the preparation focused, Godot's line");
    targets.meal = await layoutCheck(page, w, 'v-meal');
    await once('#meal-serving-1'); await visitIs('meal.servings.0', 1, 'Tasting plates'); await pressedLook(page, '#meal-serving-1', '#meal-serving-0');
    await once('#meal-placement-1'); await visitIs('meal.placements.0', 1, 'Other edge'); await pressedLook(page, '#meal-placement-1', '#meal-placement-0');
    await once('#meal-prepare'); await visitIs('meal.steps.0', 1, 'one gesture, one preparation step');
    await held('#meal-prepare'); await visitIs('meal.steps.0', 2, 'a held Enter on the preparation');
    assert.equal((await meal()).steps[0], 2, 'a held Enter prepares one step');
    for (let n = 3; n <= 5; n++) { await use('#meal-prepare'); await visitIs('meal.steps.0', n, `preparation step ${n}`); }
    await focusIs('meal-share', 'the fifth step');
    await once('#meal-share'); await until(page, () => Object.keys(window.tenderloin.visits().meal.shared).length === 1, null, 'Share this dish');
    assert.equal((await meal()).selected, 0, 'the second press did not follow the invitation');
    assert.equal(await page.locator('#meal-share').innerText(), MEAL_TEXT.refresh.followLabel, 'a shared dish offers its invitation');
    await use('#meal-share'); await visitIs('meal.selected', 1, 'Follow this invitation');
    for (let n = 1; n <= 5; n++) { await use('#meal-prepare'); await visitIs('meal.steps.1', n, `the second cook's step ${n}`); }
    await use('#meal-share'); await visitIs('meal.revealed', 3, 'the second shared dish reveals the third cook');
    // Godot marks Previous and Next cook rapid: one gesture presses twice and moves two cooks. Three gestures each way start from every
    // cook, so each redraw from one cook to the next must keep the row where the gesture's second press lands.
    const moved = [];
    for (const dir of ['next', 'previous']) for (let n = 0; n < 3; n++) {
      const from = (await meal()).selected, to = (from + (dir === 'next' ? 2 : 1)) % 3;
      await once(`#meal-${dir}`, { rapid: true }); await visitIs('meal.selected', to, `one gesture on ${dir === 'next' ? 'Next' : 'Previous'} cook from cook ${from} moves two cooks`);
      moved.push(`${dir} ${from}->${to}`);
    }
    targets.mealCooks = await layoutCheck(page, w, 'v-meal-cooks');
    await once('#meal-explore'); await closed(page); await focusIs('meal-entry', 'Keep exploring');
    assert.equal(await toastText(page), MEAL_TEXT.close_meal.announce, "Godot's close line");
    assert.equal(await stored(page), raw, 'Cook & Share is visit-only');
    clean(log);
    return { moved, targets: targets.meal + targets.mealCooks };
  });
  await step(`${w.name} visits: the stories hub, More stories, the picker's two pages, Two Dogs Home, Other stories and Keep exploring`, async () => {
    const raw = await stored(page);
    await once('#story-entry'); await onScreen(page, 'power', 'Story');
    assert.deepEqual([await title(), await focused()], [POWER_TEXT.refresh.hub, 'power-begin'], "the hub's title, with Begin story focused");
    // The first Story opening loads the Larkin place file quietly: Power's own opening line stays in the status line (spec 3.4).
    await visitIs('data.power_place', 'ready', 'the first Story opening loads the place file', 15000);
    assert.equal(await status(), changePower(initialPower(), { type: 'open' }, { opened: true }).announce, "Power's opening line stays in the status line while its place file loads");
    targets.power = await layoutCheck(page, w, 'v-power-hub');
    await once('#power-more'); await onScreen(page, 'picker', 'More stories');
    assert.deepEqual([await title(), await focused()], [PICKER_TEXT.setup.title, 'picker-entry-0'], "the picker's title, with its first entry focused");
    await until(page, () => window.tenderloin.visits().data.voting_places === 'ready' && document.querySelector('#picker-entry-1')?.disabled === false, null, 'the Election Walk entry opens once both place files load', 15000);
    targets.picker = await layoutCheck(page, w, 'v-picker');
    // Godot marks Earlier and Later rapid, but each press reaches the other of the two pages and disables the button pressed, so a
    // gesture's second press always meets a disabled control, which the guard swallows: one page a gesture.
    assert.deepEqual(await page.evaluate(() => ['#picker-earlier', '#picker-later'].map(id => document.querySelector(id).hasAttribute('data-rapid'))), [true, true], "Earlier and Later carry Godot's rapid mark");
    await once('#picker-later'); await visitIs('stories.picker.page', 1, 'Later'); await focusIs('picker-entry-2', "Later focuses the page's first entry");
    targets.picker2 = await layoutCheck(page, w, 'v-picker-page-2');
    await once('#picker-earlier'); await visitIs('stories.picker.page', 0, 'Earlier'); await focusIs('picker-entry-0', 'Earlier');
    await use('#picker-later'); await visitIs('stories.picker.page', 1, 'Later again');
    await once('#picker-entry-3'); await onScreen(page, 'dogs', 'Two Dogs Home');
    assert.deepEqual([await title(), await focused()], [dogsView(initialDogs(), { opened: true }).heading, 'dogs-begin'], "the search's heading, with Begin search focused");
    targets.dogs = await layoutCheck(page, w, 'v-dogs');
    await once('#dogs-stories'); await onScreen(page, 'picker', 'Other stories');
    assert.deepEqual(pick((await v()).stories.picker, ['returnStory', 'openedFromReader']), { returnStory: 'dogs', openedFromReader: true }, 'the picker remembers the story it was opened from');
    await once('#picker-explore'); await closed(page); await focusIs('story-entry', 'Keep exploring');
    assert.equal(await toastText(page), PICKER_TEXT.keep_exploring.announce, "Godot's Keep exploring line");
    assert.equal(await stored(page), raw, 'the hub and the picker are visit-only');
    clean(log);
    return { targets: targets.power + targets.picker + targets.picker2 + targets.dogs };
  });
  await step(`${w.name} visits: a held Escape on the picker goes back to the story it came from, and no further`, async () => {
    await use('#story-entry'); await onScreen(page, 'power', 'Story');
    await use('#power-more'); await onScreen(page, 'picker', 'More stories');
    if ((await v()).stories.picker.page !== 1) await use('#picker-later');
    await use('#picker-entry-3'); await onScreen(page, 'dogs', 'Two Dogs Home');
    await use('#dogs-stories'); await onScreen(page, 'picker', 'Other stories');
    // The positive part is polled: the first Escape goes Back to stories, and every key event of the hold reaches the page. Only then
    // has each repeat had its chance; 300 ms more lets a close one set off land, and the page's tally says whether one did.
    const hold = await heldEscape(page);
    await onScreen(page, 'dogs', 'a held Escape on the picker (Back to stories)'); await hold.delivered();
    await page.waitForTimeout(300);
    assert.deepEqual({ ...pick(await hold.counts(), ['open', 'cancel', 'closes']), screen: (await v()).screen }, { open: true, cancel: 1, closes: 0, screen: 'dogs' }, "the held Escape's repeats close nothing more: its first press is the one close request, and the dialog never closed");
    await focusIs('dogs-begin', 'Back to stories reopens the story focused as Godot opens it');
    await page.keyboard.press('Escape'); await closed(page); await focusIs('story-entry', 'Escape on Two Dogs Home (its Back)');
    assert.equal(await toastText(page), DOGS_TEXT.close_story.announce, "Godot's close line");
    clean(log);
  });
  await step(`${w.name} visits: a tap on the drag show's beacon finds it there: the save, one chime, its card and its bubble`, async () => {
    // The beacon's site and how high sprites.js draws its globe above it, as the page itself has them.
    const id = 'impromptu_drag_show', site = (await placed(page, 'SURPRISE_SITES'))[id], lift = await page.evaluate(async () => (await import('./sprites.js')).BEACON_LIFT), found = (await snap()).surprises;
    assert.ok(Number.isFinite(lift) && lift > 0, `sprites.js says where it draws a beacon's globe (BEACON_LIFT ${lift})`);
    await press(page, '#recenter', w.touch);
    await until(page, () => document.querySelector('#camera-status').textContent === 'Following you' && window.tenderloin.location().scale >= 0.85 - 1e-9, null, 'Follow me zooms in on the player');
    await page.evaluate(() => document.querySelector('#world').scrollIntoView({ block: 'center' }));
    const at = await mapPoint(page, { x: site.x, y: site.y - lift });
    assert.ok(at.visible, `the beacon's globe is on screen (${Math.round(at.x)}, ${Math.round(at.y)})`);
    const before = { seq: (await call(page, 'save')).seq, chimes: (await sound()).rewardCount, player: (await snap()).player };
    const guardedTap = await tapAt(at, "a tap on the beacon's globe");
    await onScreen(page, 'card', "the tap on the beacon's globe");
    const r = inspect(found, id);
    assert.equal(await title(), r.heading, "the card's heading is Godot's find line");
    const s = await written(page, before.seq, { discovered_surprises: [...found, id].sort() });
    await until(page, n => window.tenderloin.sound().rewardCount === n + 1, before.chimes, 'the find plays one chime');
    assert.equal((await sound()).rewardLastCue, 'surprise_discovery', "Godot's surprise_discovery cue");
    await until(page, id => window.tenderloin.bubble()?.id === `surprise:${id}`, id, 'the surprise speaks in the bubble at its site');
    assert.equal((await call(page, 'bubble')).text, spokenText(r.speech), "the bubble says Godot's line");
    assert.deepEqual([(await snap()).player, await page.locator('#stop-walking').isDisabled()], [before.player, true], 'a tap on a beacon never walks');
    assert.equal(await status(), r.announce, "the card's status line says Godot's announcement");
    targets.surprise = await layoutCheck(page, w, 'v-card-surprise');
    assert.equal((await sound()).rewardCount, before.chimes + 1, 'one chime in all');
    // The card's Spot Surprise (Godot Shift+D) inspects the next id: one gesture finds one, and a held Enter one more.
    const [third, fourth] = [3, 4].map(i => SURPRISE_IDS[i]);
    await once('#card-spot'); let t = await written(page, s.env.save_seq, { discovered_surprises: [...found, id, third].sort() });
    await held('#card-spot'); t = await written(page, t.env.save_seq, { discovered_surprises: [...found, id, third, fourth].sort() });
    await titled(inspect([...found, id, third], fourth).heading, 'a held Enter on Spot Surprise finds one more');
    await once('#card-back'); await closed(page); await focusIs('world', 'Back on a card opened from the map');
    clean(log);
    return { tap: [Math.round(at.x), Math.round(at.y)], scale: at.scale, ...guardedTap, seq: t.env.save_seq };
  });
  await step(`${w.name} visits: Field notes' Visit the Museum and Visit Eateries cards, and a movement key held while a card closes does not walk`, async () => {
    await press(page, '#journal-button', w.touch); await page.locator('#notes-museum').waitFor();
    assert.equal(await page.locator('#notes-spot').textContent(), conversationLabel((await snap()).surprises), "Field notes' Spot Surprise counts the finds");
    const chimes = (await sound()).rewardCount, era0 = inspectMuseum(initialTour()), era1 = inspectMuseum(era0.tour);
    await once('#notes-museum'); await onScreen(page, 'card', 'Visit the Museum'); await titled(era0.eraTitle, "the museum card shows the portal's first era");
    await until(page, n => window.tenderloin.sound().rewardCount === n + 1 && window.tenderloin.sound().rewardLastCue === 'museum_portal', chimes, "a new era plays Godot's museum_portal chime");
    targets.museum = await layoutCheck(page, w, 'v-card-museum');
    await once('#card-next-era'); await titled(era1.eraTitle, 'Next era');
    await use('#card-back'); await closed(page); await focusIs('journal-button', 'Back on a card from Field notes');
    await press(page, '#journal-button', w.touch); await page.locator('#notes-eateries').waitFor();
    const guide = cycleEatery(era1.tour), order = activateEatery(guide.tour, guide.index, { tourId: '' });
    await once('#notes-eateries'); await onScreen(page, 'card', 'Visit Eateries');
    await titled(gdf(web('main.gd', MAIN_TEXT.build_street_life_decor.eatery), [EATERIES[guide.index].name]), "the eatery guide's card");
    targets.eatery = await layoutCheck(page, w, 'v-card-eatery');
    await once('#card-order'); await titled(order.burst.heading, "the counter's first order");
    // Godot release_pending: a movement key held while the card closes does not walk until it is pressed again.
    const x = async () => (await snap()).player.x;
    await page.keyboard.down('ArrowRight'); await settledClose(page, async () => { await use('#card-back'); await closed(page); }, 'Back on the eatery card');
    const before = await x();
    for (let i = 0; i < 6; i++) { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(50); }
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.__nextFrames = 0; requestAnimationFrame(function count() { if (++window.__nextFrames < 2) requestAnimationFrame(count); }); });
    await until(page, () => window.__nextFrames >= 2, null, 'two animation frames run after the repeats', 8000);
    assert.equal(await x(), before, 'repeats of the key held through the close do not walk');
    await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowRight');
    try { await until(page, before => window.tenderloin.snapshot().player.x > before, before, 'a fresh press walks', 8000); } finally { await page.keyboard.up('ArrowRight'); }
    clean(log);
    return { eras: [era0.eraTitle, era1.eraTitle], order: order.burst.heading, walked: Math.round(await x() - before) };
  });
  if (w.name !== '320') {
    await step(`${w.name} visits: the Power Story festival, three relays walked to and solved, its pads rapid and Check path held`, async () => {
      await use('#story-entry'); await onScreen(page, 'power', 'Story');
      await once('#power-begin'); await visitIs('stories.power.active', true, 'Begin story'); await focusIs('power-walk', 'Begin story');
      for (const station of [0, 1, 2]) {
        if (station) { await use(`#power-tab-${station}`); await visitIs('stories.power.station', station, `Relay ${station + 1}`); }
        await use('#power-walk'); await arrives(page, 'power', `the walk to relay ${station + 1}`, 60000);
        assert.ok(near((await snap()).player, (await placed(page, 'RELAY_GOALS'))[station], RELAY_ARRIVAL), `the player stands at relay ${station + 1}`);
        await focusIs('power-pad-0', 'arriving at the relay');
        if (!station) targets.relay = await layoutCheck(page, w, 'v-power-relay');
        await solve(station);
        if (station === 1) await held('#power-check'); else await use('#power-check');
        await visitIs('stories.power.restored', [1, 3, 7][station], `Check path lights relay ${station + 1}`);
        if (station === 1) assert.equal((await v()).stories.power.station, 1, 'a held Enter on Check path lights the relay once and chooses no other');
      }
      assert.deepEqual(pick((await v()).stories.power, ['won', 'message']), { won: true, message: POWER_TEXT.check_path.won }, "all three lights back on: Godot's festival win");
      await focusIs('power-back', 'the last relay');
      targets.powerWon = await layoutCheck(page, w, 'v-power-won');
      await once('#power-end'); await visitIs('stories.power.active', false, 'End story');
      assert.equal(await title(), POWER_TEXT.refresh.ended, "the hub's heading says the story ended");
      clean(log);
    });
    await step(`${w.name} visits: Two Dogs Home from Missing dogs: its walk control, three walks, both dogs matched and the reunion`, async () => {
      await once('#power-dogs'); await onScreen(page, 'dogs', 'Missing dogs');
      await use('#dogs-begin'); await visitIs('stories.dogs.active', true, 'Begin search'); await focusIs('dogs-lead0', 'Begin search');
      await once('#dogs-lead0'); await visitIs('stories.dogs.lead', 0, "Pippin's lead");
      await once('#dogs-back'); await closed(page);
      await until(page, () => !document.querySelector('#story-resume').hidden, null, 'the walk control offers the active search');
      assert.deepEqual(await page.locator('#story-resume').evaluate(b => [b.textContent, b.title, document.getElementById(b.getAttribute('aria-describedby'))?.textContent]), [WALK_CONTROL.dogs, WALK_CONTROL.dogsTip, WALK_CONTROL.dogsTip], "Godot's walk control label and tip");
      targets.resume = await layoutCheck(page, w, 'v-story-resume');
      assert.equal((await visitsChapterCheck(page)).objective.id, 'dog_story', "the Next objective is the search's");
      await once('#story-resume'); await onScreen(page, 'dogs', 'the walk control'); await focusIs('dogs-walk', 'the walk control reopens the search');
      await use('#dogs-walk'); await arrives(page, 'dogs', "the walk to Pippin's lead", 60000); await focusIs('dogs-match', "Pippin's lead");
      assert.ok(near((await snap()).player, (await placed(page, 'DOG_GOALS'))[0], 10), "the player stands at Pippin's lead");
      await once('#dogs-match'); await visitIs('stories.dogs.found', 1, 'Match dog');
      await once('#dogs-junebug'); await visitIs('stories.dogs.profile', 1, "Junebug's notes");
      await once('#dogs-lead1'); await visitIs('stories.dogs.lead', 1, "Junebug's lead");
      await held('#dogs-walk'); await walking(page, 'dogs', 'a held Enter on Walk to lead'); await arrives(page, 'dogs', "the walk to Junebug's lead");
      await held('#dogs-match'); await visitIs('stories.dogs.found', 3, 'a held Enter on Match dog');
      const M = DOGS_TEXT.match_dog;
      assert.equal((await v()).stories.dogs.message, DOG_NAMES[1] + M.matched + M.both, 'one match: a second press would say she is matched already');
      await once('#dogs-lead2'); await visitIs('stories.dogs.lead', 2, 'the gathering');
      await use('#dogs-walk'); await walking(page, 'dogs', 'Walk to lead'); await arrives(page, 'dogs', 'the walk to the gathering');
      assert.equal(await page.locator('#dogs-match').innerText(), DOGS_TEXT.refresh.reunite, 'both found, at the gathering, Match dog is Reunite');
      await use('#dogs-match'); await visitIs('stories.dogs.won', true, 'Reunite');
      assert.equal((await v()).stories.picker.lanternInvited, true, "the reunion offers Imani's lantern invitation");
      assert.equal(await title(), dogsView((await v()).stories.dogs, { opened: true }).heading, 'the heading says the dogs are home');
      targets.dogsWon = await layoutCheck(page, w, 'v-dogs-reunited');
      clean(log);
    });
    await step(`${w.name} visits: the Lantern Procession by Imani's invitation: costumes, the assembly, the march with its progress, and Welcome`, async () => {
      await once('#dogs-stories'); await onScreen(page, 'picker', 'Other stories'); await focusIs('picker-follow', "the reunion's invitation");
      targets.invitation = await layoutCheck(page, w, 'v-picker-invitation');
      assert.deepEqual(await page.locator('#picker-follow').evaluate(b => [b.innerText, b.getAttribute('aria-label') ?? b.innerText, document.getElementById(b.getAttribute('aria-describedby'))?.textContent]), [PICKER_TEXT.setup.follow, PICKER_TEXT.setup.follow, PICKER_TEXT.setup.followName], "Godot's Follow label, with Godot's name as its description");
      await once('#picker-follow'); await onScreen(page, 'lantern', 'Follow this invitation');
      const s0 = (await v()).stories;
      assert.deepEqual([s0.dogs.active, s0.picker.suspended, s0.picker.invitationFollowed], [false, ['dogs'], true], 'the search waits while the procession runs');
      assert.deepEqual([await title(), await focused()], [lanternView(initialLantern(), { opened: true }).heading, 'lantern-begin']);
      targets.lantern = await layoutCheck(page, w, 'v-lantern');
      await pressedLook(page, '#lantern-bat', '#lantern-star');
      await once('#lantern-star'); await visitIs('stories.lantern.costume', 1, 'the Stargazer cape'); await pressedLook(page, '#lantern-star', '#lantern-bat');
      await once('#lantern-starLantern'); await visitIs('stories.lantern.lantern', 1, 'the star lantern'); await pressedLook(page, '#lantern-starLantern', '#lantern-moon');
      await once('#lantern-begin'); await visitIs('stories.lantern.active', true, 'Begin'); await focusIs('lantern-walk', 'Begin');
      await once('#lantern-walk'); await arrives(page, 'lantern', 'the walk to the assembly', 60000); await focusIs('lantern-advance', 'the assembly');
      await once('#lantern-advance'); await visitIs('stories.lantern.phase', 1, 'Gather');
      assert.equal((await v()).stories.lantern.message, LANTERN_TEXT.advance.ready, 'one Gather: a second press would say the group is paused');
      const progress = [(await v()).stories.lantern.progress];
      await use('#lantern-walk');
      await until(page, p => { const v = window.tenderloin.visits(); return v.trip === 'lantern' && v.stories.lantern.progress > p; }, progress[0], 'the march raises the progress while it travels', 30000);
      progress.push((await v()).stories.lantern.progress);
      await arrives(page, 'lantern', 'the march', 60000);
      progress.push((await v()).stories.lantern.progress);
      assert.ok(progress[2] >= LANTERN_LENGTH - 1, `the march reaches the end of the route (${progress.map(p => p.toFixed(1)).join(' -> ')} of ${LANTERN_LENGTH} m)`);
      await focusIs('lantern-advance', 'the end of the march');
      await held('#lantern-advance'); await visitIs('stories.lantern.won', true, 'a held Enter on Welcome');
      assert.equal((await v()).screen, 'lantern', 'the held Enter welcomed once and did not press Back, which has the focus now');
      await focusIs('lantern-back', 'Welcome');
      targets.lanternWon = await layoutCheck(page, w, 'v-lantern-welcome');
      await once('#lantern-end'); await visitIs('stories.lantern.active', false, 'End parade');
      await once('#lantern-back'); await closed(page);
      clean(log);
      return { progress: progress.map(p => Math.round(p * 10) / 10) };
    });
  }
  await step(`${w.name} visits: another tab's write closes the open side story and starts the visit over, keeping the finds; so does Start fresh`, async () => {
    await use('#meal-entry'); await onScreen(page, 'meal', 'Cook & Share');
    await use('#meal-prepare'); await until(page, () => window.tenderloin.visits().meal.steps.some(n => n > 0), null, 'a preparation');
    const was = await envelope(page), newer = canonicalStringify({ ...was.env, celeste_talk_count: was.env.celeste_talk_count + 1, save_seq: was.env.save_seq + 1 });
    assert.equal(parseGodotSave(newer).status, 'loaded');
    const other = await context.newPage();
    try {
      await other.route(base + '/__next-seed', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Other tab</title><link rel="icon" href="data:,">' }));
      await other.goto(base + '/__next-seed'); await other.evaluate(([key, value]) => localStorage.setItem(key, value), [GODOT_SAVE_KEY, newer]);
    } finally { await other.close(); }
    await page.bringToFront();
    await until(page, seq => !document.querySelector('#modal').open && window.tenderloin.save().seq === seq, was.env.save_seq + 1, "this tab adopts the other tab's write (storage event), which closes Cook & Share");
    await until(page, text => document.querySelector('#toast').textContent === text, VISITS_FORK_TEXT.adopted, 'the toast says the side stories started fresh');
    assert.deepEqual(plain(await v()), FRESH_VISITS, 'the visit starts over, as a Godot load does');
    assert.deepEqual((await snap()).surprises, was.state.surprises, 'the saved finds stay');
    await use('#meal-entry'); await onScreen(page, 'meal', 'Cook & Share again'); await use('#meal-prepare'); await visitIs('meal.steps.0', 1, 'a preparation');
    await use('#meal-explore'); await closed(page);
    await press(page, '#settings-button', w.touch); await press(page, '#restart', w.touch); await press(page, '#confirm-restart', w.touch);
    await until(page, () => window.tenderloin.save().status === 'fresh', null, 'Start fresh restarts');
    assert.deepEqual(plain(await v()), FRESH_VISITS, 'Start fresh starts the visit over');
    // The fresh afternoon is Chapter 1 again, so its chapter card follows.
    const card = await cardCheck(page, false); assert.equal(card.num, 1); await dismissCard(page, w, card);
    clean(log);
    return { adopted: was.env.save_seq + 1 };
  });
  if (!w.touch) {
    await step('1440 visits: Larkin 2017: the case map, the walk to Larkin/Eddy and its battery light, fetching only the local place file', async () => {
      await seed(page, opened); await boot(page); await cardCheck(page, true);
      await page.keyboard.press('Escape'); await closed(page); // no music, so nothing else loads while the requests are counted
      const requests = [], heard = request => { if (!/^(data|blob):/.test(request.url())) requests.push(request.url()); };
      page.on('request', heard);
      try {
        await use('#story-entry'); await onScreen(page, 'power', 'Story');
        await use('#power-tab-1'); await visitIs('stories.power.historical', true, 'the Larkin 2017 tab');
        await until(page, () => window.tenderloin.visits().data.power_place === 'ready' && document.querySelectorAll('dialog[open] .visits-label').length === 4 && !document.querySelector('#power-begin').disabled, null, 'the case map draws its four labels once the place file is in', 15000);
        targets.larkinMap = await layoutCheck(page, w, 'v-power-larkin-map');
        await use('#power-begin'); await visitIs('stories.power.active', true, 'Begin story at Larkin');
        assert.equal((await v()).stories.power.message, POWER_TEXT.begin.larkin, "Godot's Larkin opening");
        await use('#power-walk'); await walking(page, 'power', 'Walk to relay'); await arrives(page, 'power', 'the walk to Larkin/Eddy', 300000);
        assert.ok(near((await snap()).player, await placed(page, 'LARKIN_JUNCTION'), RELAY_ARRIVAL), 'the player stands at the Larkin/Eddy junction');
        targets.larkin = await layoutCheck(page, w, 'v-power-larkin');
        await solve(0); await use('#power-check'); await visitIs('stories.power.restored', 1, 'the battery light at Larkin');
        assert.equal((await v()).stories.power.message, VOICES[0] + POWER_TEXT.check_path.portable, "Godot's portable-light line");
        await use('#power-end'); await visitIs('stories.power.active', false, 'End story');
        await use('#power-back'); await closed(page);
      } finally { page.off('request', heard); }
      assert.deepEqual(requests, [`${base}/browser-next/data/power_place.json`], 'Larkin fetches its local place file once, and nothing else');
      clean(log);
      return { requests: requests.map(url => url.slice(base.length)) };
    });
    await step('1440 visits: the Election Walk to both sites and back to Bea: the records, the paper map\'s pins and the shared map', async () => {
      await use('#story-entry'); await onScreen(page, 'power', 'Story');
      await use('#power-more'); await onScreen(page, 'picker', 'More stories');
      if ((await v()).stories.picker.page !== 0) await use('#picker-earlier');
      await until(page, () => document.querySelector('#picker-entry-1')?.disabled === false, null, 'the Election Walk entry opens once both place files load', 15000);
      await once('#picker-entry-1'); await onScreen(page, 'election', 'the Election Walk');
      assert.deepEqual([await title(), await focused()], [electionView(initialElection()).heading, 'election-begin']);
      targets.election = await layoutCheck(page, w, 'v-election');
      await pressedLook(page, '#election-cadillac', '#election-boeddeker'); await pressedLook(page, '#election-warm', '#election-cool');
      await once('#election-cool'); await visitIs('stories.election.palette', 1, 'Cool paper'); await pressedLook(page, '#election-cool', '#election-warm');
      await once('#election-begin'); await visitIs('stories.election.active', true, 'Begin walk'); await focusIs('election-walk', 'Begin walk');
      await once('#election-walk'); await walking(page, 'election', 'Walk to site'); await arrives(page, 'election', 'the walk to 380 Eddy');
      assert.ok(near((await snap()).player, (await v()).stories.election.tripGoal, 10), 'the player stands at the first observation point (the trip goal voting_places.json gives)');
      await focusIs('election-record', 'the first site');
      await once('#election-record'); await visitIs('stories.election.observed', 1, 'Record site'); await focusIs('election-boeddeker', 'the first record');
      await once('#election-boeddeker'); await visitIs('stories.election.selected', 1, 'the second site'); await pressedLook(page, '#election-boeddeker', '#election-cadillac');
      await use('#election-walk'); await walking(page, 'election', 'Walk to site'); await arrives(page, 'election', 'the walk to 246 Eddy');
      assert.ok(near((await snap()).player, (await v()).stories.election.tripGoal, 10), 'the player stands at the second observation point');
      await held('#election-record'); await visitIs('stories.election.observed', 3, 'a held Enter on Record site');
      assert.equal((await v()).stories.election.phase, 1, 'one record: the repeats did not press Make map, which has the focus now');
      await focusIs('election-make', 'both sites recorded');
      await once('#election-make'); await visitIs('stories.election.phase', 2, 'Make map'); await focusIs('election-cadillac', 'Make map');
      targets.pins = await layoutCheck(page, w, 'v-election-pins');
      await use('#election-cadillac'); await visitIs('stories.election.selected', 0, 'the first label');
      await once('#election-pin-0'); await visitIs('stories.election.placed', 1, 'pin 1'); await focusIs('election-boeddeker', 'the first label placed');
      await use('#election-boeddeker'); await visitIs('stories.election.selected', 1, 'the second label');
      await once('#election-pin-1'); await visitIs('stories.election.phase', 3, 'pin 2 places the last label'); await focusIs('election-walk', 'both labels placed');
      assert.equal(await page.locator('#election-walk').innerText(), ELECTION_TEXT.refresh.returnBea, 'the walk control returns to Bea');
      await use('#election-walk'); await walking(page, 'election', 'Return to Bea'); await arrives(page, 'election', 'the walk back to Bea');
      assert.ok(near((await snap()).player, await placed(page, 'ELECTION_HOME'), 5), 'the player stands by Bea');
      await focusIs('election-share', 'back with Bea');
      await once('#election-share'); await visitIs('stories.election.won', true, 'Share map');
      assert.equal(await title(), electionView((await v()).stories.election).heading, 'the heading says the map is shared');
      targets.electionShared = await layoutCheck(page, w, 'v-election-shared');
      await once('#election-end'); await visitIs('stories.election.active', false, 'End walk');
      await once('#election-back'); await closed(page);
      clean(log);
    });
    await step("1440 visits: Thanh's Spot Surprise finds his pair's surprise and shows his memory line", async () => {
      const eight = SURPRISE_IDS.filter(id => !['impromptu_drag_show', 'mayor_pomp_event'].includes(id)).sort();
      await seed(page, canonicalStringify(filmDoneEnvelope({ save_seq: 60, history_read: true, blackhawk_discovered: true, discovered_surprises: eight }))); await boot(page); await dismissCard(page, w, await cardCheck(page, true));
      await walkTo(page, w, 'thanh');
      assert.equal(await page.locator('#talk-surprise').textContent(), conversationLabel(eight), "Thanh offers Godot's Spot Surprise");
      const r = inspect(eight, 'impromptu_drag_show', { openNeighborId: 'thanh' });
      assert.ok(r.memory, 'the premise: the drag show is paired with Thanh');
      await once('#talk-surprise'); await onScreen(page, 'card', "Thanh's Spot Surprise"); await titled(r.heading, "the card names Thanh's pair");
      assert.ok((await reader()).includes(r.memory), `the card says Thanh's memory line (${r.memory})`);
      await written(page, 60, { discovered_surprises: [...eight, 'impromptu_drag_show'].sort() });
      targets.thanh = await layoutCheck(page, w, 'v-card-thanh');
      await use('#card-back'); await closed(page);
      clean(log);
      return { memory: r.memory };
    });
    await step('1440 visits: the tenth find is the finale: its heading and burst line, its chime, all ten saved', async () => {
      const nine = SURPRISE_IDS.filter(id => id !== 'impromptu_drag_show').sort();
      await seed(page, canonicalStringify(filmDoneEnvelope({ save_seq: 70, history_read: true, blackhawk_discovered: true, discovered_surprises: nine }))); await boot(page); await dismissCard(page, w, await cardCheck(page, true));
      assert.equal((await visitsChapterCheck(page)).expected.surpriseId, 'impromptu_drag_show', 'the explore objective names the last surprise');
      const chimes = (await sound()).rewardCount, r = inspect(nine, 'impromptu_drag_show');
      await press(page, '#journal-button'); await use('#notes-spot'); await onScreen(page, 'card', "Field notes' Spot Surprise");
      await titled(r.heading, "the finale's heading");
      assert.ok(r.finale && (await reader()).startsWith(MAIN_TEXT.inspect_neighborhood_surprise.all), 'the burst line says all ten keepsakes');
      await until(page, n => window.tenderloin.sound().rewardCount === n + 1, chimes, 'the tenth find plays one chime');
      assert.equal((await sound()).rewardLastCue, 'surprise_finale', "Godot's surprise_finale cue");
      await written(page, 70, { discovered_surprises: [...SURPRISE_IDS].sort() });
      targets.finale = await layoutCheck(page, w, 'v-card-finale');
      await use('#card-back'); await closed(page); await focusIs('journal-button', 'Back on the finale card');
      clean(log);
      return { heading: r.heading };
    });
    await step("1440 visits: the landmark tour through Bea's talk action and the card's next stop, completed once with its chime and toast", async () => {
      let tour = initialTour(); const stops = [];
      for (let i = 0; i < 12; i++) { const next = tourState(tour).next, r = visitStop(tour, next.id, {}); stops.push({ id: next.id, action: next.action, heading: r.eraTitle ?? r.title ?? r.burst.heading }); tour = r.tour; }
      assert.equal((await visitsChapterCheck(page)).expected.tourId, stops[0].id, 'all ten found, the explore objective is the first tour stop');
      const count = async () => tourState((await v()).world.tour).count;
      await walkTo(page, w, 'bea');
      assert.equal(await page.locator('#talk-landmark-tour').textContent(), stops[0].action, "Bea offers the tour's first stop under Godot's tour action");
      await once('#talk-landmark-tour'); await onScreen(page, 'card', "Bea's tour action"); await titled(stops[0].heading, 'the first stop');
      assert.equal(await count(), 1, 'one stop visited');
      for (let i = 1; i < 11; i++) {
        assert.equal(await page.locator('#card-tour').textContent(), stops[i].action, `the card offers stop ${i + 1}`);
        if (i === 2) await held('#card-tour'); else await use('#card-tour');
        await titled(stops[i].heading, `stop ${i + 1}`);
        assert.equal(await count(), i + 1, i === 2 ? 'a held Enter on the next stop visits one stop' : `${i + 1} stops visited`);
      }
      targets.tour = await layoutCheck(page, w, 'v-card-tour');
      // The completion is the game loop's (visits-world.js tick, every frame once no dialog is open), so the card's close alone says
      // nothing yet: two frames with the dialog closed, then 300 ms, before reading that eleven stops did not complete the tour.
      await use('#card-back'); await closed(page); await afterFrames(page, 'Back on the eleventh stop'); await page.waitForTimeout(300);
      assert.equal((await v()).world.tour.celebrated, false, 'eleven stops do not complete the tour');
      await walkTo(page, w, 'bea');
      assert.equal(await page.locator('#talk-landmark-tour').textContent(), stops[11].action, 'Bea offers the last stop');
      await use('#talk-landmark-tour'); await titled(stops[11].heading, 'the last stop');
      assert.deepEqual([await count(), await page.locator('#card-tour').count()], [12, 0], 'twelve stops, and no next stop to offer');
      const chimes = (await sound()).rewardCount, done = gdf(MAIN_TEXT.update_landmark_tour_completion.announce, [12]);
      await use('#card-back'); await closed(page);
      // The game loop completes the tour on a frame after the card closes, which a loaded machine delays: poll until the count reaches
      // one more (a count that jumps past it still passes here and fails below), then two frames and 300 ms for a second chime.
      await until(page, n => window.tenderloin.sound().rewardCount >= n + 1, chimes, 'the completed tour chimes', 15000);
      assert.equal((await sound()).rewardLastCue, 'tour_complete', "Godot's tour_complete cue");
      await until(page, text => document.querySelector('#toast').textContent === text, done, "the toast says Godot's completion line");
      assert.equal((await v()).world.tour.celebrated, true, 'the tour is celebrated for this visit');
      await afterFrames(page, 'the completion'); await page.waitForTimeout(300);
      assert.equal((await sound()).rewardCount, chimes + 1, 'the completion chimes once');
      assert.equal((await visitsChapterCheck(page)).objective.id, 'explore', "the explore objective's done line");
      clean(log);
      return { stops: stops.length };
    });
    await step("1440 visits: Godot opens the fork's two finds: surprises_found 2, no reset, the save unchanged", async () => {
      await stat(new URL('artifacts/godot-web/index.pck', root)).catch(() => assert.fail('artifacts/godot-web/index.pck is missing; run npm run godot:export'));
      const cross = await newContext(w), c = await newPage(cross, 'visits-godot-1440'), p = c.page, cp = presses(p, w, guarded);
      try {
        await seed(p, canonicalStringify(openedEnvelope({ save_seq: 30 }))); await boot(p); await dismissCard(p, w, await cardCheck(p, true));
        await press(p, '#journal-button'); await cp.use('#notes-spot'); await onScreen(p, 'card', "Field notes' Spot Surprise");
        await written(p, 30, { discovered_surprises: ['jeffrey_record'] });
        await cp.held('#card-spot'); const s = await written(p, 31, { discovered_surprises: ['hidden_mural_145', 'jeffrey_record'] });
        await until(p, t => document.querySelector('dialog[open] #modal-title')?.textContent === t, inspect(['jeffrey_record'], 'hidden_mural_145').heading, 'a held Enter on Spot Surprise finds one more');
        await cp.use('#card-back'); await closed(p);
        assert.equal(await stored(p), s.raw, 'nothing else was written');
        c.log.on = 'godot'; await p.goto(base + '/godot/'); const g = await godotReady(p);
        assert.deepEqual(pick(g, ['surprises_found', 'visited_count', 'block_opened']), { surprises_found: 2, visited_count: 5, block_opened: true }, "Godot counts the fork's two finds and keeps the rest of the afternoon");
        assert.equal(await stored(p), s.raw, 'Godot loaded the finds without resetting or rewriting the save');
        await p.screenshot({ path: file('1440-godot-visits-surprises.png') }); c.log.on = 'fork';
        clean(c.log);
        return { godot: pick(g, ['surprises_found', 'visited_count', 'block_opened']), seq: s.env.save_seq };
      } finally { await cross.close(); activePage = page; }
    });
  }
  await step(`${w.name} visits guard: a ${how} on Share this dish acts once; on Next cook, which Godot marks rapid, twice`, async () => {
    const gate = await newContext(w, { gate: true }), g = await newPage(gate, `visits-guard-${w.name}`), p = g.page, counts = {};
    const rest = async () => { await p.waitForTimeout(650); await until(p, () => !window.tenderloin.pressSettle().open, null, 'the press-settle window closes', 10000); };
    const tap = async selector => { await rest(); await press(p, selector, w.touch); };
    const mealIs = (path, value, what) => until(p, ([path, value]) => JSON.stringify(path.split('.').reduce((o, k) => o?.[k], window.tenderloin.visits().meal)) === JSON.stringify(value), [path, value], what);
    async function double(selector, rapid = false) {
      const locator = p.locator(selector); await locator.scrollIntoViewIfNeeded(); const b = await locator.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      await p.evaluate(() => { window.__nextPassed = { pointerdown: 0, pointerup: 0, click: 0 }; if (!window.__nextCounting) { window.__nextCounting = true; for (const type of Object.keys(window.__nextPassed)) window.addEventListener(type, () => window.__nextPassed[type]++); } });
      const before = await call(p, 'pressSettle');
      if (w.touch) { await p.touchscreen.tap(x, y); await p.waitForTimeout(80); await p.touchscreen.tap(x, y); } else await p.mouse.dblclick(x, y, { delay: 40 });
      const want = rapid ? { pointerdown: 2, pointerup: 2, click: 2 } : { pointerdown: 1, pointerup: 1, click: 1 }, [after, passed] = await letThrough(p, before, want, !rapid);
      if (rapid) { assert.equal(after.swallowed, before.swallowed, `${selector}: a [data-rapid] control still under the pointer is not gated`); assert.deepEqual(passed, want, `${selector}: both presses reach the page`); }
      else {
        assert.equal(after.armed - before.armed, 1, `${selector}: one press armed the guard`);
        assert.ok(after.swallowed > before.swallowed, `${selector}: pressSettle().swallowed increased (${before.swallowed} -> ${after.swallowed})`);
        assert.deepEqual(passed, want, `${selector}: only the first press reached the page`);
      }
      return { armed: after.armed - before.armed, swallowed: after.swallowed - before.swallowed };
    }
    try {
      await seed(p, opened); await boot(p);
      assert.equal(await p.evaluate(() => window.__tenderloinPressSettleMs), undefined, 'the guard runs at its default');
      const card = await cardCheck(p, true); await rest(); await dismissCard(p, w, card);
      await tap('#meal-entry'); await onScreen(p, 'meal', 'Cook & Share');
      for (let n = 1; n <= 5; n++) { await tap('#meal-prepare'); await mealIs('steps.0', n, `preparation step ${n}`); }
      await rest(); counts.share = await double('#meal-share');
      await until(p, () => Object.keys(window.tenderloin.visits().meal.shared).length === 1, null, 'the first press shares the dish');
      assert.equal((await call(p, 'visits')).meal.selected, 0, 'the second press did not follow the invitation');
      await tap('#meal-share'); await mealIs('selected', 1, 'Follow this invitation');
      for (let n = 1; n <= 5; n++) { await tap('#meal-prepare'); await mealIs('steps.1', n, `the second cook's step ${n}`); }
      await tap('#meal-share'); await mealIs('revealed', 3, 'the second dish reveals the third cook');
      await rest(); counts.next = await double('#meal-next', true);
      await mealIs('selected', 0, 'one gesture on Next cook moves two cooks');
      clean(g.log);
    } finally { await gate.close(); activePage = page; }
    return counts;
  });
  // The bound is on the first click's cold cost, so each measurement is a page of its own. A loaded machine can stall one click past
  // it while the route itself is fast (a collection, another process taking the CPU), but a slow route is slow on every page: a click
  // over the bound is measured once more, on a new and equally cold page, and only a second click over it fails the step. Both
  // clicks are in the evidence.
  if (w.name === '320') await step('320 visits: Walk to relay routes START to Larkin/Eddy in one click of at most 1.5 s (spec risk R2)', async () => {
    const before = [...guarded], clicks = [];
    async function measure(pressed) {
      const timing = await newContext(w), t = await newPage(timing, `visits-larkin-click-320${clicks.length ? '-again' : ''}`), p = t.page, tp = presses(p, w, pressed);
      try {
        await seed(p, opened); await boot(p); await dismissCard(p, w, await cardCheck(p, true));
        const start = await placed(p, 'START'), junction = await placed(p, 'LARKIN_JUNCTION');
        assert.deepEqual((await call(p, 'snapshot')).player, start, 'the player stands at the start');
        await tp.use('#story-entry'); await onScreen(p, 'power', 'Story');
        await tp.use('#power-tab-1');
        await until(p, () => { const v = window.tenderloin.visits(); return v.stories.power.historical && v.data.power_place === 'ready' && !document.querySelector('#power-begin').disabled; }, null, 'the Larkin 2017 tab with its place file', 15000);
        await tp.use('#power-begin'); await until(p, () => window.tenderloin.visits().stories.power.active, null, 'Begin story at Larkin');
        // The click's own work, from the window's capture phase to its bubble phase: the route and everything else it does before the
        // page can draw again.
        await p.evaluate(() => { const at = window.__nextWalkClick = {}; addEventListener('click', () => { at.start ??= performance.now(); }, true); addEventListener('click', () => { at.end ??= performance.now(); }); });
        await tp.use('#power-walk'); await walking(p, 'power', 'Walk to relay');
        const ms = await p.evaluate(() => window.__nextWalkClick.end - window.__nextWalkClick.start);
        assert.ok(Number.isFinite(ms), `the click's two listeners timed it (${ms})`);
        await press(p, '#stop-walking', w.touch); await until(p, () => window.tenderloin.visits().trip === null, null, 'Stop walking cancels the trip');
        clean(t.log);
        clicks.push(Math.round(ms * 10) / 10);
        return { ms, from: start, to: { x: Math.round(junction.x), y: Math.round(junction.y) } };
      } finally { await timing.close(); activePage = page; }
    }
    let r = await measure(guarded);
    if (r.ms > 1500) r = await measure([...before]);
    assert.ok(r.ms <= 1500, `the click that routes START to the Larkin junction took ${clicks.join(' ms, then on a new page ')} ms (at most 1500)`);
    return { clickMs: clicks.at(-1), clicks, from: r.from, to: r.to };
  });
  await step(`${w.name} visits: every side-story screen keeps 44 px targets and its close button clear`, async () => {
    assert.deepEqual(undersized.filter(line => / v-/.test(line) && line.startsWith(w.name + ' ')), [], 'every side-story screen keeps its targets at least 44 px');
    assert.deepEqual(underClose.filter(line => / v-/.test(line) && line.startsWith(w.name + ' ')), [], "no side-story text is drawn under a dialog's close button");
    return { guarded: guarded.length, screens: Object.keys(targets).length, controls: Object.values(targets).reduce((a, b) => a + b, 0) };
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
  for (const w of WIDTHS) { if (SUITES.includes('journey')) await journey(w); if (SUITES.includes('guard')) await guard(w); if (SUITES.includes('ending')) await endingSuite(w); if (SUITES.includes('phase2')) await phase2Suite(w); if (SUITES.includes('visits')) await visitsSuite(w); }
  const wide = WIDTHS.find(w => !w.touch);
  if (wide) { if (SUITES.includes('tabs')) { await twoTabs(wide); await recoveryCases(wide); await editionSwap(wide); } if (SUITES.includes('restart')) await restartSafety(wide); if (SUITES.includes('seeded')) await seeded(wide); if (SUITES.includes('music')) await musicSuite(wide); if (SUITES.includes('characters')) await charactersSuite(wide); }
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
  await writeFile(file('next-browser-results.json'), JSON.stringify({ testedAt: new Date().toISOString(), result: failure ? 'fail' : 'pass', failure, browser: await browser?.version(), channel, isolatedServer: !process.env.BASE_URL, widths: WIDTHS.map(w => w.name), suites: SUITES, source: next, classic: CLASSIC, godotBuild: godot && { pckBytes: godot.size, pckModified: godot.mtime }, durationMs: Date.now() - started, evidence, undersized, logs: logs.map(({ label, fork, godot }) => ({ label, fork, godot })), limits: `Automated ${channel} checks of the ${SUITES.join(', ')} suites at ${WIDTHS.map(w => w.name).join(', ')} px through real input; not a human playtest, screen reader audit or full keyboard-only completion.` }, null, 2));
  await browser?.close(); ownedServer?.kill();
  console.log(failure ? `FAIL ${failure.message}` : `PASS ${evidence.length} steps in ${Math.round((Date.now() - started) / 1000)} s`);
}
