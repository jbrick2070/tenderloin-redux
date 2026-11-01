// The Phase 3 wiring of the side stories into browser-next/game.js (spec WP3): the visits host, the points where the visit starts
// over, the map layers, the conversation actions and the fork text. game.js reaches the DOM when it loads, so these read its text,
// as tests/next-characters.test.mjs does. Its map layers, its action ids and its one-control-per-id rule are its own code evaluated
// here over stand-ins, and the tour marker's tap runs on a real World over a stub canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { visitsHost, filmDoneEnvelope } from './next-fixtures.mjs';
import { initialState } from '../browser-next/core.js';
import { parseGodotSave, canonicalStringify } from '../browser-next/godot-save.js';
import { World, NEIGHBORS, PLACES, makeWays } from '../browser-next/world.js';
import { nextObjective } from '../browser-next/story.js';
import { conversationActions, freshTalk } from '../browser-next/characters.js';
import { VISITS_FORK_TEXT } from '../browser-next/visits-kit.js';
import { GODOT_TEXT, WEB_OVERRIDES, web } from '../browser-next/visits/text.js';
import { conversationLabel, progressLabel, SURPRISE_IDS, SURPRISES, markers } from '../browser-next/visits/surprises.js';
import { entryTooltip } from '../browser-next/visits/power.js';
import { SURPRISE_SITES, MUSEUM } from '../browser-next/visits/positions.js';
import { createVisits } from '../browser-next/visits-ui.js';
import { createEpisodeScreens } from '../browser-next/visits-episodes.js';
import { createWorldVisits } from '../browser-next/visits-world.js';
import { showBubble, spokenText } from '../browser-next/bubble.js';
import * as sprites from '../browser-next/sprites.js';
import { EDITION_URL, EDITION_TEXT, swapAction } from '../browser-next/edition.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// A macrotask: every promise the stand-in host settled, and everything queued after it, has run by then (nothing here sets a timer).
const flush = () => new Promise(resolve => setImmediate(resolve));
const GAME = read('browser-next/game.js'), LINES = GAME.split('\n');
// A top-level declaration of game.js, from the line that starts with `start` to the column-0 line that closes it; a one-line
// declaration is its line alone. game.js keeps its top level at column 0 and indents everything inside.
function declaration(start) {
  const i = LINES.findIndex(line => line.startsWith(start));
  assert.ok(i >= 0, `game.js has ${JSON.stringify(start)}`);
  let j = i + 1;
  while (j < LINES.length && /^\s+\S/.test(LINES[j])) j++;
  if (j < LINES.length && /^[}\])]/.test(LINES[j])) j++;
  return LINES.slice(i, j).join('\n');
}
// The top-level members of an object literal's text (between its outer braces): `name:`, `name(` and a shorthand `name`.
function members(literal) {
  const code = literal.split('\n').filter(line => !/^\s*\/\//.test(line)).join('\n').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { parts.push(code.slice(start, i)); start = i + 1; }
  }
  parts.push(code.slice(start));
  return parts.map(part => /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:[:(]|$)/.exec(part)?.[1]).filter(Boolean);
}
// game.js's own text for a value it must not copy: a 24-character prefix of a long one (the HOSTING_FORK_TEXT pattern), a quoted
// literal of a short one.
const inline = value => (value.length >= 24 ? GAME.includes(value.slice(0, 24)) : ["'", '"', '`'].some(q => GAME.includes(q + value + q)));
const strings = value => (typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []);

// ---------------------------------------------------------------- the visit starts over where Godot's does
test('resetSession starts the visit over, and only restart, an adopted reread and declining recovery call it (never a rebase)', () => {
  const reset = declaration('function resetSession(');
  assert.match(reset, /return visits\.sync\(\{ adopted: true \}\)/, 'resetSession resets the visits and returns what that closed');
  assert.match(declaration('function restart('), /\bresetSession\(\)/);
  assert.match(declaration('function declineRecovery('), /\bresetSession\(\)/);
  const reread = declaration('function reread(');
  assert.match(reread, /else if \(state !== before && !rebase\) visitsClosed = resetSession\(\)\.closed/, "reread's non-rebase branch resets and keeps whether a visits screen closed");
  assert.match(reread, /return \{[^}]*\bvisitsClosed\b[^}]*\}/, 'reread reports it');
  assert.equal([...GAME.matchAll(/(?<!function )\bresetSession\(\)/g)].length, 3, 'three callers: restart, reread and declineRecovery');
  // An adopted save that closed a visits screen says why, unless an ending screen closed too (its own notice).
  const notice = declaration('const syncNotice');
  assert.match(notice, /changed\.closed \? FORK_TEXT\.copiesChanged : changed\.visitsClosed \? VISITS_FORK_TEXT\.adopted : /);
});

test('updateUI syncs the visits after every state change, beside the ending and the Rhythm Circle', () => {
  assert.match(declaration('function updateUI('), /ending\.sync\(\); rhythm\.sync\(\); visits\.sync\(\);/);
});

// ---------------------------------------------------------------- a side story's walk ends with the visit
// game.js's own walk bookkeeping (startWalk, visitWalk, stopWalk), resetSession and renderFrame's arrival line, evaluated over
// stand-ins: a route of `length` points (none when blocked(goal)), one route point a frame while no dialog is open, and hint(), the
// camera and the toast as no-ops. They drive the real visits shell with its real parts on the stand-in host, whose walk, stopWalk,
// walking and player are game.js's, as its visitsHost wires them.
const PLACE_FILES = { 'power_place.json': JSON.parse(read('browser-next/data/power_place.json')), 'voting_places.json': JSON.parse(read('browser-next/data/voting_places.json')) };
function walkGame({ blocked = () => false, length = 2 } = {}) {
  const { host, io, log, dialog } = visitsHost();
  io.files = { ...PLACE_FILES };
  const state = { player: { x: 0, y: 0 } }, world = { path: [], camera: { following: true, follow() { this.following = true; } } };
  let shell = null;
  const visits = new Proxy({}, { get: (_, name) => (...args) => shell[name](...args) });
  const findPath = (from, goal) => (blocked(goal) ? [] : Array.from({ length }, (_, i) => ({ x: from.x + (goal.x - from.x) * (i + 1) / length, y: from.y + (goal.y - from.y) * (i + 1) / length })));
  const arrival = LINES.find(line => /^\s+if \(!walkPath\.length\) \{ hint\(\); if \(walkOwner === 'visit'\) \{ walkOwner = null; visits\.walkEnded\(\); \}/.test(line));
  assert.ok(arrival, "renderFrame's arrival line");
  const game = new Function('visits', 'world', 'state', 'modal', 'ways', 'findPath', 'freshTalk', 'cameraUI', 'hint', 'toast', 'interact', [
    "let talks = null, arrivedAt = null, nearAt = null, chapterNotice = '', bubble = null, routeSpeech = null;",
    "let walkTarget = null, walkPath = [], walkOwner = null, walkName = '';",
    'const banner = { reset() {} };',
    declaration('function resetSession('), declaration('function startWalk('), declaration('function visitWalk('), declaration('function stopWalk('),
    `function frame() {\n  if (!modal.open && walkPath.length) {\n    state.player = walkPath.shift();\n${arrival}\n  }\n  visits.tick(0, null);\n}`,
    "function goTo(goal) { return startWalk(goal, { target: { id: 'bea' }, name: 'Bea' }); }",
    'return { resetSession, stopWalk, visitWalk, frame, goTo, walk: () => ({ owner: walkOwner, steps: walkPath.length, name: walkName }) };',
  ].join('\n'))(visits, world, state, dialog.modal, null, findPath, () => ({}), () => {}, () => {}, () => {}, () => {});
  Object.assign(host, { walk: (goal, options) => game.visitWalk(goal, options), stopWalk: () => game.stopWalk(), walking: () => game.walk().steps > 0, player: () => ({ ...state.player }) });
  shell = createVisits(host, { createEpisodeScreens, createWorldVisits });
  return { host, io, log, dialog, state, game, visits: shell };
}

test("resetSession ends a side story's walk with the visit: after an adopted save or Start fresh no visit-owned walk goes on", async () => {
  const g = walkGame(), { visits, dialog, game } = g;
  assert.equal(visits.open('story'), true);
  await flush();
  dialog.click('power-begin'); dialog.click('power-walk');
  assert.deepEqual([visits.snapshot().trip, game.walk().owner, game.walk().steps > 0, dialog.modal.open], ['power', 'visit', true, false], 'the premise: Power walks to its relay');
  // Another tab's save is adopted (reread), or the player uses the shared save as it is (declineRecovery).
  assert.deepEqual(game.resetSession(), { reset: true, closed: false });
  assert.deepEqual(game.walk(), { owner: null, steps: 0, name: '' }, 'the walk stops: Stop walking is off and the hint no longer says "Walking to"');
  assert.deepEqual([visits.snapshot().trip, visits.snapshot().stories.power.active, g.host.walking()], [null, false, false]);
  // Nothing walks on to the relay, so nothing opens there.
  for (let i = 0; i < 4; i++) game.frame();
  assert.deepEqual([dialog.modal.open, visits.snapshot().screen], [false, null]);
  // A walk of the player's own (a neighbor, a street tap) is not the visit's: it goes on.
  assert.equal(game.goTo({ x: 30, y: 4 }), true);
  game.resetSession();
  assert.deepEqual([game.walk().owner, game.walk().steps], [null, 2]);
  assert.match(declaration('function resetSession('), /if \(walkOwner === 'visit'\) stopWalk\(\); return visits\.sync\(\{ adopted: true \}\);/, 'the walk stops before the visit starts over');
});

test("a seeded fuzz of the walk protocol on game.js's own bookkeeping: a visit-owned walk always has its trip, and none outlives resetSession or its episode", async () => {
  let seed = 0x5eed;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32, pick = list => list[Math.floor(rnd() * list.length)];
  const reached = { checks: 0, trips: 0, resetsWhileTheStoryWalks: 0, blockClosesWhileTheStoryWalks: 0 }, broken = [];
  for (let run = 0; run < 12; run++) {
    const g = walkGame({ blocked: () => rnd() < 0.15, length: 6 }), { visits, dialog, game, io } = g;
    const enabled = () => [...io.html.matchAll(/<button\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]).filter(id => dialog.has(id) && !dialog.doc.getElementById(id).disabled);
    const press = id => { if (dialog.has(id) && !dialog.doc.getElementById(id).disabled) dialog.click(id); };
    const check = where => {
      const s = visits.snapshot(), { owner, steps } = game.walk(), active = ['power', 'dogs', 'lantern', 'election'].filter(id => s.stories[id].active);
      reached.checks++; if (s.trip) reached.trips++;
      if ((s.trip !== null) !== (owner === 'visit')) broken.push(`${where}: trip ${s.trip}, walk owner ${owner}`);
      if (s.trip && !s.stories[s.trip].traveling) broken.push(`${where}: the trip's episode ${s.trip} is not traveling`);
      if (owner === 'visit' && !steps) broken.push(`${where}: a visit-owned walk with no route`);
      if (active.length > 1) broken.push(`${where}: two active episodes ${active}`);
    };
    const OPS = {
      open: () => visits.open(pick(['story', 'meal', 'picker', 'resume', 'notes-spot', 'notes-museum'])),
      click: () => { const ids = enabled(); if (ids.length) dialog.click(pick(ids)); },
      storyWalk: async () => { visits.open('story'); await flush(); press('power-begin'); press('power-walk'); },
      episodeWalk: async () => { visits.open('resume'); await flush(); const ids = enabled().filter(id => /-(begin|walk|lead1)$/.test(id)); if (ids.length) dialog.click(pick(ids)); },
      frames: () => { for (let i = 0; i < 1 + Math.floor(rnd() * 4); i++) game.frame(); },
      stop: () => game.stopWalk(), goTo: () => game.goTo({ x: 9, y: 9 }), close: () => dialog.close(),
      adopt: () => {
        if (game.walk().owner === 'visit') reached.resetsWhileTheStoryWalks++;
        game.resetSession();
        if (game.walk().owner === 'visit' || visits.snapshot().trip) broken.push(`run ${run}: a story walk outlived resetSession`);
      },
      restart: () => { game.resetSession(); game.stopWalk(); dialog.close(); },
      blockCloses: () => { if (visits.snapshot().trip) reached.blockClosesWhileTheStoryWalks++; io.state = { ...io.state, opened: false }; visits.sync(); },
      blockOpens: () => { io.state = { ...io.state, opened: true }; visits.sync(); },
    };
    // The walks, the adoption and the block closing are drawn twice as often as the rest, so they meet often.
    const names = [...Object.keys(OPS), 'storyWalk', 'episodeWalk', 'adopt', 'blockCloses'];
    for (let step = 0; step < 160; step++) {
      const name = pick(names);
      await OPS[name]();
      await flush();
      check(`run ${run} step ${step} after ${name}`);
    }
  }
  assert.deepEqual(broken.slice(0, 6), [], `${broken.length} broken checks`);
  // The premise: the fuzz walks stories and starts the visit over, or closes the block, while they walk.
  assert.ok(reached.trips >= 60 && reached.resetsWhileTheStoryWalks >= 5 && reached.blockClosesWhileTheStoryWalks >= 5, JSON.stringify(reached));
});

// ---------------------------------------------------------------- focus back where the dialog was opened
// game.js's returnFocus and focusReturn over a stand-in page: elements with hidden, disabled, isConnected and a parent chain.
function focusPage() {
  const focused = [], page = new Map();
  const element = (id, { hidden = false, disabled = false, parent = null, connected = true } = {}) => {
    const el = { id, hidden, disabled, parent, isConnected: connected, focus() { focused.push(id); }, scrollIntoView() {},
      closest(selector) { assert.equal(selector, '[hidden]'); for (let at = this; at; at = at.parent) if (at.hidden) return at; return null; } };
    if (connected) page.set(id, el);
    return el;
  };
  const canvas = element('world');
  const made = new Function('canvas', 'document', `let modalReturnTarget = canvas;\n${declaration('function returnFocus(')}\n${declaration('function focusReturn(')}\nreturn { focusReturn, to(target) { modalReturnTarget = target; } };`)(canvas, { getElementById: id => page.get(id) ?? null });
  const returns = target => { focused.length = 0; made.to(target); made.focusReturn(); return focused.join(' '); };
  return { element, canvas, returns };
}

test("focus returns to the control a dialog came from, or to the map when that control is hidden (the resume control once its story ended) or disabled", () => {
  const { element, canvas, returns } = focusPage();
  assert.equal(returns(element('story-entry')), 'story-entry');
  assert.equal(returns(canvas), 'world');
  // End story hides #story-resume (storyResumeUI) while its episode's screen is open; Back then returns there.
  assert.equal(returns(element('story-resume', { hidden: true })), 'world', 'never a hidden control, whose focus would fall to the page body');
  const afterglow = element('afterglow', { hidden: true });
  assert.equal(returns(element('meal-entry', { parent: afterglow })), 'world', 'nor one in a hidden panel');
  assert.equal(returns(element('stop-walking', { disabled: true })), 'world', 'nor a disabled one');
  // A control the page drew again since is found by its id, unless that one is hidden too; a gone one is the map.
  element('journal-button');
  assert.equal(returns(element('journal-button', { connected: false })), 'journal-button');
  element('rhythm-circle', { hidden: true });
  assert.equal(returns(element('rhythm-circle', { connected: false })), 'world');
  assert.equal(returns(element('civic-hour', { connected: false })), 'world');
  // The three ways a dialog closes all end there: close(), the dialog's close event and ×.
  assert.match(declaration('function close('), /modal\.close\(\); focusReturn\(\);/);
  assert.match(GAME, /modal\.addEventListener\('close', \(\) => \{[^\n]*focusReturn\(\);/);
  assert.match(GAME, /\$\('#close-modal'\)\.addEventListener\('click', \(\) => close\(returnFocus\(\)\)\);/);
});

// game.js's visitsHost literal itself, over stand-ins for what it reads when it is built.
function hostLiteral(page, canvas, closed) {
  const doc = { getElementById: id => page.get(id) ?? null }, none = () => {};
  return new Function('document', 'window', 'modal', 'settle', 'show', 'modalStatus', 'announce', 'toast', 'act', 'saveReason', 'toggleMusic', 'canvas', 'close',
    `let modalReturnTarget = null;\n${declaration('const visitsHost = {')}\nreturn { host: visitsHost, target: () => modalReturnTarget };`)(doc, {}, { open: false }, {}, none, none, none, none, () => true, () => '', async () => '', canvas, target => closed.push(target));
}
test("host.returnTo and host.close take a control's id to that control, and only an id the page lacks to the map", () => {
  const page = new Map(['journal-button', 'story-resume', 'meal-entry'].map(id => [id, { id }])), canvas = { id: 'world' }, closed = [];
  const { host, target } = hostLiteral(page, canvas, closed);
  for (const id of ['journal-button', 'story-resume', 'meal-entry']) { host.returnTo(id); assert.equal(target(), page.get(id), id); }
  host.returnTo('nope');
  assert.equal(target(), canvas);
  host.close('journal-button'); host.close('nope'); host.close(page.get('story-resume')); host.close(undefined);
  assert.deepEqual(closed, [page.get('journal-button'), canvas, page.get('story-resume'), undefined], "an element as it is, and nothing for close()'s own default, the map");
});

test("the resume control follows the active story, and a resume control hidden under focus gives the focus to the map", () => {
  const WALK = GODOT_TEXT['main.gd'].update_walk_control, focused = [];
  const el = id => ({ id, textContent: '', title: '', hidden: true, focus() { focused.push(id); } });
  const control = el('story-resume'), tip = el('story-resume-tip'), canvas = el('world'), doc = { activeElement: null };
  let resume = { id: 'story-resume', label: WALK.dogs, description: WALK.dogsTip, visible: true };
  const ui = new Function('$', 'visits', 'document', 'canvas', `${declaration('function storyResumeUI(')}\nreturn storyResumeUI;`)(selector => ({ '#story-resume': control, '#story-resume-tip': tip })[selector] ?? null, { entries: () => ({ resume }) }, doc, canvas);
  ui();
  assert.deepEqual([control.hidden, control.textContent, control.title, tip.textContent, focused], [false, WALK.dogs, WALK.dogsTip, WALK.dogsTip, []]);
  // The story ends (or the player walks) while the control has the focus: it hides and the map takes the focus.
  doc.activeElement = control;
  resume = { ...resume, visible: false };
  ui();
  assert.deepEqual([control.hidden, focused], [true, ['world']]);
  // Hidden while the focus is elsewhere (a dialog's control): the focus stays where it is.
  resume = { ...resume, visible: true }; ui();
  doc.activeElement = { id: 'power-end' };
  resume = { ...resume, visible: false }; ui();
  assert.deepEqual([control.hidden, focused], [true, ['world']]);
  resume = { id: 'story-resume', label: WALK.power, description: WALK.powerTip, visible: true }; ui();
  assert.deepEqual([control.hidden, control.textContent, control.title], [false, WALK.power, WALK.powerTip]);
});

// ---------------------------------------------------------------- the place files' size
test('host.load refuses a place file over 256 kB: unread when the response says its length, unparsed when it does not', async () => {
  const LIMIT = 256 * 1024, reads = [];
  const respond = (text, { ok = true, length = null } = {}) => ({ ok, headers: { get: name => (name.toLowerCase() === 'content-length' && length != null ? String(length) : null) }, text: async () => { reads.push(text.length); return text; } });
  let next = null;
  const load = new Function('fetch', 'setTimeout', 'clearTimeout', 'AbortController', `${declaration('const VISIT_DATA_LIMIT')}\n${declaration('async function loadVisitData(')}\nreturn loadVisitData;`)(
    async (url, { signal }) => { assert.equal(url, './data/power_place.json'); assert.ok(signal); return next; }, () => 1, () => {}, class { constructor() { this.signal = {}; } abort() { this.aborted = true; } });
  const real = read('browser-next/data/power_place.json');
  next = respond(real, { length: real.length });
  assert.deepEqual(await load('power_place.json'), JSON.parse(real), 'the real file');
  next = respond(' '.repeat(LIMIT - 2) + '{}');
  assert.deepEqual(await load('power_place.json'), {}, '256 kB is still a place file');
  reads.length = 0;
  next = respond('{}', { length: LIMIT + 1 });
  await assert.rejects(load('power_place.json'), /too large/);
  assert.deepEqual(reads, [], 'a length over the limit is refused before the body is read');
  next = respond(' '.repeat(LIMIT) + '{}');
  await assert.rejects(load('power_place.json'), /too large/, 'and a body over it before it is parsed');
  next = respond(real, { ok: false });
  await assert.rejects(load('power_place.json'), /unavailable/);
  await assert.rejects(load('streets.osm.json'), /Not a story data file/);
});

test('host.load reads a place file as a stream and stops a chunk past 256 kB, whatever the response says of its length: a compressed or chunked bomb is never read whole', async () => {
  const LIMIT = 256 * 1024, real = read('browser-next/data/power_place.json'), aborted = [];
  let next = null;
  const load = new Function('fetch', 'setTimeout', 'clearTimeout', 'AbortController', `${declaration('const VISIT_DATA_LIMIT')}\n${declaration('async function loadVisitData(')}\nreturn loadVisitData;`)(
    async () => next, () => 1, () => {}, class { constructor() { this.signal = {}; } abort() { aborted.push(true); } });
  // A response whose body streams `bytes` (a length past them: endlessly) in chunks of `size`, pulled only as they are read; its
  // header says `length` (a gzip body's own, compressed size) or nothing, as a chunked one does. It counts what was pulled and
  // whether the reader was cancelled; its text() is never the way a readable body is read.
  const streamed = (bytes, { size = 16384, length = null } = {}) => {
    const s = { pulled: 0, cancelled: false }, chunk = typeof bytes === 'number' ? null : bytes, total = chunk ? chunk.length : bytes;
    s.response = { ok: true, headers: { get: name => (name.toLowerCase() === 'content-length' && length != null ? String(length) : null) }, text: async () => assert.fail('a readable body is read as a stream'),
      body: new ReadableStream({
        pull(c) { const n = Math.min(size, total - s.pulled); if (n <= 0) { c.close(); return; } c.enqueue(chunk ? chunk.slice(s.pulled, s.pulled + n) : new Uint8Array(n).fill(0x20)); s.pulled += n; },
        cancel() { s.cancelled = true; },
      }, { highWaterMark: 0 }) };
    return s;
  };
  const bytes = text => new TextEncoder().encode(text);
  // An endless body, and one of 10 MB said to be 40 kB (its compressed size): refused a chunk past the limit, the reader cancelled.
  for (const [what, s, size] of [['an endless body', streamed(Infinity), 16384], ['10 MB said to be 40 kB', streamed(10 * 1024 * 1024, { size: 65536, length: 40000 }), 65536], ['an endless body in odd chunks', streamed(Infinity, { size: 1000 }), 1000]]) {
    next = s.response;
    await assert.rejects(load('power_place.json'), /too large/, what);
    assert.ok(s.pulled > LIMIT && s.pulled <= LIMIT + size, `${what}: ${s.pulled} bytes read, at most one chunk past the limit`);
    assert.equal(s.cancelled, true, `${what}: the reader is cancelled`);
  }
  // 256 kB exactly is still a place file; the real file parses, in chunks of any size.
  for (const [what, s] of [['256 kB', streamed(bytes(' '.repeat(LIMIT - 2) + '{}'), { size: 65536 })], ['the real file', streamed(bytes(real), { size: 1000 })], ['the real file a byte at a time', streamed(bytes(real), { size: 1 })]]) {
    next = s.response;
    assert.deepEqual(await load('power_place.json'), JSON.parse(what === '256 kB' ? '{}' : real), what);
    assert.equal(s.cancelled, false, `${what}: read to its end`);
  }
  // Multi-byte characters split across chunks decode whole; a truncated sequence is U+FFFD (the decoder never throws), so a file
  // with one in a string parses and one cut off at its end fails as JSON, not as UTF-8.
  const words = '{"name":"café ✓ 🌉 Tenderloin"}';
  for (const size of [1, 2, 3]) { next = streamed(bytes(words), { size }).response; assert.deepEqual(await load('power_place.json'), JSON.parse(words), `chunks of ${size} bytes`); }
  next = streamed(new Uint8Array([...bytes('{"a":"x'), 0xe2, 0x9c, ...bytes('"}')]), { size: 1 }).response;
  assert.deepEqual(await load('power_place.json'), { a: 'x�' }, 'a truncated sequence in a string');
  next = streamed(new Uint8Array([...bytes('{"a":1}'), 0xf0, 0x9f, 0x8c])).response;
  await assert.rejects(load('power_place.json'), SyntaxError, 'a truncated sequence at the end');
  // A response with no readable body is read whole, as before.
  const plain = { ok: true, headers: { get: () => null }, body: null, text: async () => real };
  next = plain;
  assert.deepEqual(await load('power_place.json'), JSON.parse(real), 'no body stream: text()');
  next = { ...plain, text: async () => ' '.repeat(LIMIT) + '{}' };
  await assert.rejects(load('power_place.json'), /too large/, 'and measured');
  assert.deepEqual(aborted, [], 'only a length said to be over the limit aborts the fetch itself');
});

// ---------------------------------------------------------------- one line, said once
test("a map tap on a beacon says its line once: the card's status line, never also the page's live region (the card is up before the bubble)", () => {
  const { host, io, log, dialog } = visitsHost(), live = [];
  io.state = { opened: true, surprises: [] };
  // game.js speak(): the bubble, and the page's live region only while no dialog shows the line.
  const speak = new Function('showBubble', 'spokenText', 'modal', 'routeSay', `let bubble = null;\n${declaration('function speak(')}\nreturn speak;`)(showBubble, spokenText, dialog.modal, text => live.push(text));
  host.speak = (id, text, name) => { log.push(['speak', id, text, name]); speak(id, text, name); };
  const visits = createVisits(host, { createWorldVisits }), rec = SURPRISES.jeffrey_record;
  assert.equal(visits.interact({ id: 'surprise:jeffrey_record', kind: 'visit', name: rec.title, ...SURPRISE_SITES.jeffrey_record }, 'tap'), true);
  assert.deepEqual(log.find(e => e[0] === 'speak'), ['speak', 'surprise:jeffrey_record', rec.speech, rec.speaker], 'the bubble is raised');
  assert.deepEqual(live, [], 'nothing in the page live region');
  const status = log.filter(e => e[0] === 'status').map(e => e[1]);
  assert.equal(status.length, 1);
  assert.ok(status[0].includes(rec.speech), "the card's one status line says the speaker's words");
});

// ---------------------------------------------------------------- the visits host
test("game.js gives createVisits every host member of spec 3.2 that the visits packages read, and the shell its two parts", () => {
  const block = declaration('const visitsHost = {');
  assert.ok(!block.includes('`'), 'the host literal has no template literal (the member scan below reads it as plain code)');
  const keys = members(block.replace(/^const visitsHost = \{/, '').replace(/\};\s*$/, ''));
  const stand = Object.keys(visitsHost().host);
  assert.deepEqual([...keys].sort(), [...stand].sort(), "the members are the stand-in host's, which the packages' tests run on (spec 3.2)");
  assert.equal(new Set(keys).size, keys.length, 'each member once');
  const sources = ['visits-ui.js', 'visits-kit.js', 'visits-world.js', 'visits-episodes.js'].map(name => read(`browser-next/${name}`)).join('\n');
  const used = new Set([...sources.matchAll(/\bhost\.(\w+)/g)].map(m => m[1]));
  for (const [, names] of sources.matchAll(/const \{([^}]+)\} = host\b/g)) for (const name of names.split(',')) used.add(name.trim());
  assert.ok(used.size > 20, `the packages read the host (${used.size} members)`);
  for (const name of used) assert.ok(keys.includes(name), `game.js's host gives ${name}`);
  assert.match(block, /music: \{ label: [^}]+, on: [^}]+, toggle: toggleMusic \}/, 'music: label(), on() and toggle(), which resolves to Godot\'s music line');
  assert.match(block, /chime: \(id, reason, values\) => \{\n    try \{ rewards\.play\(rewardFor\(\[visitCue\(id, reason\)\], \{ enabled: settings\.rewardSounds, unlocked: rewards\.unlocked \}\)\); \} catch/, 'a chime is the visit cue under the Sounds setting, and can never throw');
  assert.match(block, /\n    try \{ burst\(cueBurst\(visitCue\(id, reason\), \{ \.\.\.cueValues\(state\), \.\.\.values \}\)\); \} catch/, "and its banner, with the visit's values, never throws either");
  assert.match(block, /burst: spec => \{ try \{ burst\(directBurst\(spec\), spec\?\.finale \? BANNER\.finale : 0\); \} catch/, "a side story's direct burst; the 10/10 finale holds 4.5 s");
  assert.match(block, /walk: \(goal, options\) => visitWalk\(goal, options\)/);
  assert.match(block, /restoreStartupCard: text => showChapterCard\(true, \{ announce: text \}\)/);
  assert.match(GAME, /const visits = createVisits\(visitsHost, \{ createEpisodeScreens, createWorldVisits \}\);/);
  assert.match(GAME, /const sprites = createSprites\(\{ reducedMotion: \(\) => settings\.reducedMotion \}\);/);
  // host.walk: any walk stops first, a refused route says nothing and the walk is the visits' own.
  const walk = declaration('function visitWalk(');
  assert.match(walk, /stopWalk\(\);[\s\S]*startWalk\(goal, \{ name, announce, owner: 'visit', keepCamera \}\) \? 'walking' : 'blocked'/);
  assert.doesNotMatch(walk, /toast|show\(|close\(/, 'host.walk never toasts a refusal, shows or closes a dialog');
  // host.load: one of the two place files, same-origin, within 10 s, response.ok required.
  const load = declaration('async function loadVisitData(');
  assert.match(load, /\['power_place\.json', 'voting_places\.json'\]\.includes\(name\)/);
  assert.match(load, /fetch\('\.\/data\/' \+ name, \{ signal: controller\.signal \}\)/);
  assert.match(load, /setTimeout\(\(\) => controller\.abort\(\), 10000\)/);
  assert.match(load, /if \(!response\.ok\) throw/);
});

test("the walk protocol: a visits walk ends in walkEnded, any stop of it is walkCancelled, and each frame ticks the visits", () => {
  const frame = declaration('function renderFrame(');
  assert.match(frame, /if \(walkOwner === 'visit'\) \{ walkOwner = null; visits\.walkEnded\(\); \} else if \(walkTarget\)/, 'a visits-owned path that ends reports its arrival');
  assert.match(frame, /visits\.tick\(ms, world\);/);
  const stop = declaration('function stopWalk(');
  assert.match(stop, /const visit = walkOwner === 'visit';[\s\S]*walkOwner = null;[\s\S]*if \(visit\) visits\.walkCancelled\(\);/, 'the walk is cleared before the visits hear of it');
  assert.match(declaration('function startWalk('), /stopWalk\(\);/, 'a new walk stops the one before it');
  assert.match(declaration('function moveTo('), /stopWalk\(\);/, 'a street tap stops the walk before it');
  assert.match(declaration('function startWalk('), /if \(!keepCamera \|\| world\.camera\.following\) world\.camera\.follow\(state\.player\);/, "a story walk keeps a camera that was not following (Godot's walk_route)");
});

// ---------------------------------------------------------------- the map
// game.js's mapLayers, evaluated over stand-ins for the visits shell and the sprites.
function layers({ objects = [], scene = { id: 'scene' } } = {}) {
  const calls = [], visits = { objects: w => { calls.push(['objects', w]); return objects; }, scene: () => scene };
  const draw = name => (...args) => { calls.push([name, ...args]); return name === 'actors' ? [{ y: 0, draw() {} }] : undefined; };
  const stand = { ground: draw('ground'), actors: draw('actors'), overlay: draw('overlay') };
  const made = new Function('visits', 'sprites', 'tourMarkerLift', `${declaration('const mapLayers = {')}\nreturn mapLayers;`)(visits, stand, sprites.tourMarkerLift);
  return { made, calls };
}
test('the World draws the visits scene through sprites.js in its three layers, and hit-tests the visit objects', () => {
  assert.match(declaration('async function init('), /new World\(canvas, ways, \(\) => state, \{[^\n]*\blayers: mapLayers\b/, 'the World is built with the layers hook');
  const scene = { id: 'scene' }, marker = { id: 'tour-marker', kind: 'visit', name: 'Visit the Museum', x: 10, y: 20 }, museum = { id: 'museum', kind: 'visit', name: 'Museum', x: 1, y: 2 };
  const { made, calls } = layers({ objects: [museum, marker], scene });
  assert.deepEqual(Object.keys(made), ['objects', 'ground', 'actors', 'overlay']);
  const w = { scale: 1 }, c = {};
  made.ground(c, w); made.overlay(c, w);
  assert.deepEqual(made.actors(w).length, 1);
  assert.deepEqual(calls.filter(call => call[0] !== 'objects'), [['ground', c, w, scene], ['overlay', c, w, scene], ['actors', w, scene]], 'each layer draws visits.scene() at the World');
  const hit = made.objects(w);
  assert.equal(hit[0], museum, 'every other object is the shell\'s own');
  assert.equal(typeof sprites.tourMarkerLift, 'function', 'sprites.js exports the guide marker\'s lift');
  assert.deepEqual(hit[1], { ...marker, y: marker.y - sprites.tourMarkerLift(1) }, 'the tour marker is hit-tested where its diamond is drawn');
  assert.deepEqual(marker, { id: 'tour-marker', kind: 'visit', name: 'Visit the Museum', x: 10, y: 20 }, "the shell's frozen object is never changed");
});

// A recording 2D context: every path point in canvas pixels.
function recorder() {
  const points = [], stack = [];
  let m = [1, 0, 0, 1, 0, 0];
  const apply = (x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const multiply = ([a, b, c, d, e, f], [A, B, C, D, E, F]) => [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
  const ctx = new Proxy({}, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === 'measureText') return text => ({ width: String(text).length * 6 });
      if (name === 'moveTo' || name === 'lineTo') return (x, y) => points.push(apply(x, y));
      if (name === 'save') return () => stack.push(m);
      if (name === 'restore') return () => { m = stack.pop() ?? m; };
      if (name === 'setTransform') return (...next) => { m = next; };
      if (name === 'translate') return (x, y) => { m = multiply(m, [1, 0, 0, 1, x, y]); };
      if (name === 'scale') return (x, y) => { m = multiply(m, [x, 0, 0, y, 0, 0]); };
      if (name === 'rotate') return a => { m = multiply(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); };
      return () => {};
    },
    set(target, name, value) { target[name] = value; return true; },
  });
  return { ctx, points };
}
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };
globalThis.window ??= { devicePixelRatio: 1 };
const WAYS = makeWays(JSON.parse(read('browser-next/data/streets.osm.json')));
function makeWorld(objects) {
  const { ctx } = recorder(), state = initialState();
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 1000 }), setPointerCapture() {}, focus() {} };
  return new World(canvas, WAYS, () => state, { click() {}, reducedMotion: true, layers: { objects } });
}
const zoom = (world, scale) => { world.camera.scale = scale; world.camera.update(); };

test("a tap on the gold diamond finds the tour marker: sprites.js's lift is where it draws the diamond, inside the World's hit radius", () => {
  // A stop on Turk west, clear of every neighbor, place and litter object and their labels.
  const stop = { x: -700, y: -40 }, far = { x: 400, y: 0 }, draw = sprites.createSprites({ reducedMotion: () => true });
  for (const scale of [0.3, 0.5, 0.85, 1, 1.25, 1.6]) {
    // The diamond as drawn (time 0, no bob): its top and bottom apex in map px.
    const { ctx, points } = recorder();
    draw.overlay(ctx, { scale, time: 0, ratio: 1, width: 1440, height: 1000, getState: () => ({ player: far }) }, { tourMarker: stop });
    assert.ok(points.length >= 6, `the marker is drawn at ${scale}`);
    const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y)), centre = (top + bottom) / 2;
    assert.ok(Math.abs(centre - (stop.y - sprites.tourMarkerLift(scale))) < 1e-9, `the lift is the drawn diamond's centre at ${scale}`);
    assert.ok(points.every(p => Math.abs(p.x - stop.x) * scale <= 0.36 * 30 + 1e-9), 'the diamond stands over the stop, at most 0.36 of its 30 screen px to each side');
    // A real World with game.js's layers: the drawn diamond, its apexes and its bob (0.14 of its 30 screen px) are hits.
    const raw = { id: 'tour-marker', kind: 'visit', name: 'Tour', ...stop };
    const lifted = makeWorld(w => layers({ objects: [raw] }).made.objects(w)), unlifted = makeWorld(() => [raw]);
    for (const world of [lifted, unlifted]) zoom(world, scale);
    const bob = 0.14 * 30 / scale;
    for (const y of [centre, top + 1, bottom - 1, centre - bob, centre + bob]) assert.equal(lifted.hit({ x: stop.x, y })?.id, 'tour-marker', `a tap at ${y.toFixed(1)} (scale ${scale}) finds the marker`);
    assert.equal(unlifted.hit({ x: stop.x, y: centre }), undefined, `without the lift the drawn diamond is not a hit (scale ${scale})`);
  }
});

// A surprise beacon is hit where sprites.js draws it: at its foot, half way up its pole and at its globe (BEACON_LIFT above the
// foot), and along its label chip where the frame's declutter placed it. A real World with game.js's mapLayers over the real shell and
// neighborhood part (on the stand-in host) or over stand-in objects and scene, the real sprites measuring on its stub context.
function beaconMap({ found = [], objects = null, scene = null, player = { x: 95, y: -47 }, width = 1440, height = 1000 } = {}) {
  const { host, io } = visitsHost();
  io.state = { opened: true, surprises: [...found] };
  const real = createVisits(host, { createWorldVisits });
  const visits = objects ? { objects: () => objects, scene: () => scene } : real, drawn = sprites.createSprites({ reducedMotion: () => true });
  const made = new Function('visits', 'sprites', 'tourMarkerLift', 'BEACON_LIFT', `${declaration('const mapLayers = {')}\nreturn mapLayers;`)(visits, drawn, sprites.tourMarkerLift, sprites.BEACON_LIFT);
  const { ctx } = recorder(), state = { ...initialState(), opened: true, surprises: io.state.surprises, player };
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width, height }), setPointerCapture() {}, focus() {} };
  const world = new World(canvas, WAYS, () => state, { click() {}, reducedMotion: true, layers: { objects: made.objects } });
  const marker = id => visits.scene().surprises.find(m => m.id === id);
  // The globe as sprites.js draws it: the top of the pole the beacon's actor strokes from its foot.
  const globe = id => { const r = recorder(); drawn.actors(world, { surprises: [marker(id)] })[0].draw(r.ctx, world); return r.points.at(-1); };
  return { world, visits, drawn, state, marker, globe, label: id => drawn.chips(world, visits.scene()).find(c => c.id === id) };
}
const R = world => Math.max(28, 22 / world.scale); // the World's hit radius (world.js hit), map px
// The beacon farthest from every other thing a tap could find (neighbors, places, litter, landmarks, other beacons), wherever
// visits/positions.js puts the sites, with that distance.
function clearBeacon() {
  const { world, visits } = beaconMap(), others = id => [...visits.objects(world).filter(o => o.id !== `surprise:${id}`), ...world.objects().filter(o => o.kind !== 'visit')];
  return SURPRISE_IDS.map(id => ({ id, room: Math.min(...others(id).map(o => Math.hypot(o.x - SURPRISE_SITES[id].x, o.y - SURPRISE_SITES[id].y))) })).sort((a, b) => b.room - a.room)[0];
}

test("game.js hit-tests a surprise beacon where sprites.js draws it: the globe, the pole, the foot and its label chip open it; empty ground beside it walks", () => {
  assert.match(GAME, /import \{ createSprites, tourMarkerLift, BEACON_LIFT \} from '\.\/sprites\.js';/);
  assert.match(declaration('const mapLayers = {'), /o\.id\.startsWith\('surprise:'\) \? \[o, \{ \.\.\.o, y: o\.y - BEACON_LIFT \/ 2 \}, \{ \.\.\.o, y: o\.y - BEACON_LIFT \}, \.\.\.sprites\.chipTargets\(w, scene \?\?= visits\.scene\(\), o\)\]/);
  const { id, room } = clearBeacon(), site = SURPRISE_SITES[id], at = `surprise:${id}`;
  assert.ok(room > 110, `the premise: ${id} stands ${room.toFixed(0)} px from anything else a tap could find`);
  for (const found of [[], [id]]) {
    for (const scale of [0.5, 0.85, 1, 1.6]) {
      const { world, label, globe } = beaconMap({ found });
      world.camera.lookAt(site, scale);
      const where = `${found.length ? 'found' : 'unfound'}, scale ${scale}`, r = found.length ? 6.25 : 5, g = globe(id), middle = site.y - sprites.BEACON_LIFT / 2;
      const hits = (p, what) => assert.equal(world.hit(p)?.id, at, `${what} (${p.x.toFixed(1)}, ${p.y.toFixed(1)}), ${where}`);
      // The globe as drawn and its edges, the pole from the foot up, the foot and its shadow.
      assert.ok(g.y < site.y - 30, 'the globe stands above the foot');
      for (const [dx, dy] of [[0, 0], [0, -r + 0.5], [0, r - 0.5], [-r + 0.5, 0], [r - 0.5, 0]]) hits({ x: g.x + dx, y: g.y + dy }, 'the globe');
      for (const t of [0, 0.25, 0.5, 0.75, 0.97]) hits({ x: site.x, y: site.y + (g.y - site.y) * t }, 'the pole');
      hits({ x: site.x + 5, y: site.y + 1.5 }, 'the shadow');
      // The label chip as the frame placed it: its middle, its four corners and its "(Tap)" end.
      const chip = label(at);
      assert.ok(chip, `the label is placed, ${where}`);
      const inset = 1, k = chip.k;
      for (const [x, y, what] of [[chip.x, (chip.top + chip.bottom) / 2, 'the label'], [chip.left + inset, chip.top + inset, 'its top-left'], [chip.right - inset, chip.top + inset, 'its top-right'],
        [chip.left + inset, chip.bottom - inset, 'its bottom-left'], [chip.right - inset, chip.bottom - inset, 'its bottom-right'], [chip.right - 14 * k, chip.y - 8 * k, 'its (Tap)']]) hits({ x, y }, what);
      // Empty ground beside the beacon and below it, beyond the World's hit radius from what is drawn: a walk (no object).
      const radius = R(world);
      for (const p of [{ x: site.x - radius - 12, y: middle }, { x: site.x + radius + 12, y: middle }, { x: site.x, y: site.y + radius + 8 }, { x: site.x + radius + 20, y: site.y + 10 }]) {
        assert.equal(world.hit(p), undefined, `empty ground (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) walks, ${where}`);
      }
    }
  }
  // E/Enter: a player at the foot has the beacon nearby.
  const { world } = beaconMap({ player: { ...site } });
  world.camera.lookAt(site, 0.85);
  assert.equal(world.nearest()?.id, at);
});

test("a beacon label's hit points are tap targets alone: nearest() (E/Enter and the Nearby hint) never finds one, however near the player stands, and a tap on the label opens the beacon", () => {
  const { id } = clearBeacon(), site = SURPRISE_SITES[id], at = `surprise:${id}`;
  const own = (near, where) => assert.ok(!near?.tapOnly && (near?.id !== at || near.y === site.y), `${where}: the beacon is nearby by its own object at its foot, never by its label (${JSON.stringify(near)})`);
  // The player all around the beacon and its label, the camera following as game.js's does.
  for (const [dx, dy] of [[0, 0], [0, -30], [0, -60], [0, -80], [-60, -70], [70, -60], [-120, -55], [120, -40], [0, 30], [40, 10]]) {
    const player = { x: site.x + dx, y: site.y + dy }, { world, label, drawn, visits } = beaconMap({ player });
    world.camera.follow(player);
    const points = drawn.chipTargets(world, visits.scene(), visits.objects(world).find(o => o.id === at));
    assert.ok(points.length >= 2, `the label has its points at (${dx}, ${dy})`);
    own(world.nearest(), `at (${dx}, ${dy})`);
    const chip = label(at);
    if (chip) assert.ok(chip.bottom < player.y - 38 || chip.top > player.y + 11 || chip.right < player.x - 18 || chip.left > player.x + 18, `the label keeps off the player at (${dx}, ${dy})`);
  }
  // The camera held still while the player walks within its 8 px cell: the layout and the label's points are kept (the very same
  // array), so a point can come nearer the player than the World's 40 px nearby radius. It is still never what nearest() finds,
  // and a tap on it opens the beacon.
  const tally = { kept: 0, near: 0 };
  for (const scale of [0.85, 1.6]) {
    const { world, drawn, visits, state } = beaconMap({ player: { x: site.x + 400, y: site.y + 400 } });
    world.camera.lookAt(site, scale);
    const object = visits.objects(world).find(o => o.id === at), points = () => drawn.chipTargets(world, visits.scene(), object), chip = () => drawn.chips(world, visits.scene()).find(c => c.id === at);
    const { left, right, top, bottom } = chip();
    for (let y = top - 60; y <= bottom + 60; y += 8) for (let x = left - 60; x <= right + 60; x += 8) {
      const cx = Math.floor(x / 8) * 8, cy = Math.floor(y / 8) * 8;
      // Laid out (drawn) with the player in the cell's middle; its points first asked for (a tap) once it walked to a corner.
      state.player = { x: cx + 4, y: cy + 4 };
      const c = chip(), middle = (c.top + c.bottom) / 2;
      let first = null;
      for (const [ox, oy] of [[0, 0], [7.999, 0], [0, 7.999], [7.999, 7.999]]) {
        const p = state.player = { x: cx + ox, y: cy + oy }, where = `the player at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}), scale ${scale}`;
        if (!first) {
          first = points();
          // End to end along the label, however near the player: no gap where it stands.
          const xs = first.map(t => t.x);
          assert.deepEqual([Math.min(...xs), Math.max(...xs)], [c.left, c.right], `${where}: the label's points run end to end`);
          for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] <= 16 * c.k + 1e-9, `${where}: no gap in the label's points`);
        }
        assert.equal(points(), first, `${where}: the same points while the layout is kept`);
        assert.equal(chip(), c, `${where}: the layout is kept`);
        own(world.nearest(), where);
        for (const t of first) if (Math.hypot(t.x - p.x, t.y - p.y) < 40) { tally.near++; assert.equal(world.hit(t)?.id, at, `${where}: a tap on the label point at (${t.x.toFixed(1)}, ${t.y.toFixed(1)}) opens the beacon`); }
        for (let x = c.left; x <= c.right; x += 4) if (Math.hypot(x - p.x, middle - p.y) < 40) assert.equal(world.hit({ x, y: middle })?.id, at, `${where}: a tap on the label at (${x.toFixed(1)}, ${middle.toFixed(1)}) opens the beacon`);
        tally.kept++;
      }
    }
  }
  assert.ok(tally.kept > 1000 && tally.near > 20, `the premise: label points within 40 px of the player (${JSON.stringify(tally)})`);
});

// Real Worlds over one visits shell and one state: `now` with game.js's mapLayers; `then` with the objects game.js gave before a
// beacon had tap points past its foot (its earlier wrapper: each shell object once, the tour marker at its diamond), so what `then`
// finds is what E/Enter and the Nearby hint found; `flat` with game.js's objects with every tapOnly mark taken off (the defect).
// stand(p, scale) puts the player at p with every camera following at scale, as game.js's does.
function nearbyPair({ found = [], objective = null } = {}) {
  const { host, io } = visitsHost();
  io.state = { opened: true, surprises: [...found] };
  if (objective) io.objective = objective;
  const visits = createVisits(host, { createWorldVisits }), drawn = sprites.createSprites({ reducedMotion: () => true });
  const made = new Function('visits', 'sprites', 'tourMarkerLift', 'BEACON_LIFT', `${declaration('const mapLayers = {')}\nreturn mapLayers;`)(visits, drawn, sprites.tourMarkerLift, sprites.BEACON_LIFT);
  const state = { ...initialState(), opened: true, surprises: io.state.surprises, player: { x: 95, y: -47 } };
  const build = objects => {
    const { ctx } = recorder(), canvas = { width: 0, height: 0, style: {}, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 1000 }), setPointerCapture() {}, focus() {} };
    return new World(canvas, WAYS, () => state, { click() {}, reducedMotion: true, layers: { objects } });
  };
  const now = build(made.objects), then = build(w => visits.objects(w).map(o => (o.id === 'tour-marker' ? { ...o, y: o.y - sprites.tourMarkerLift(w.scale) } : o)));
  const flat = build(w => made.objects(w).map(({ tapOnly, ...o }) => o));
  const stand = (p, scale) => { state.player = p; for (const world of [now, then, flat]) { world.camera.follow(p); world.camera.scale = scale; world.camera.track(p); } };
  return { now, then, flat, stand, visits };
}
// Player positions every 10 px up to 80 px from each centre, both ways.
const around = centres => centres.flatMap(c => Array.from({ length: 17 * 17 }, (_, i) => ({ x: c.x + (i % 17) * 10 - 80, y: c.y + Math.floor(i / 17) * 10 - 80 })));
// Each position where nearest() on `now` differs from `then` or is tapOnly; how many differ on `flat`; how many find a beacon or the marker.
function compareNearby(pair, points, scale) {
  const differ = [], name = o => (o ? `${o.id} (${o.x.toFixed(1)}, ${o.y.toFixed(1)})${o.tapOnly ? ' tapOnly' : ''}` : 'nothing');
  let flat = 0, beacons = 0, marker = 0;
  for (const p of points) {
    pair.stand(p, scale);
    const now = pair.now.nearest(), then = pair.then.nearest();
    if (!isDeepStrictEqual(now, then) || now?.tapOnly) differ.push(`(${p.x.toFixed(1)}, ${p.y.toFixed(1)}): ${name(then)} before, ${name(now)} now`);
    if (!isDeepStrictEqual(pair.flat.nearest(), then)) flat++;
    if (then?.id.startsWith('surprise:')) beacons++;
    if (then?.id === 'tour-marker') marker++;
  }
  return { differ, flat, beacons, marker };
}

test('E/Enter and the Nearby hint find what they found before a beacon had tap points past its foot: nearest() measures a beacon from its foot alone', () => {
  // Around every beacon and landmark of the shell, at the follow zoom, zoomed out and fully in.
  const { now, visits } = nearbyPair();
  now.camera.follow({ x: 95, y: -47 });
  const centres = visits.objects(now);
  assert.deepEqual(centres.filter(o => o.id.startsWith('surprise:')).map(o => o.id).sort(), SURPRISE_IDS.map(id => `surprise:${id}`).sort(), 'every beacon is a centre');
  assert.ok(centres.length >= 20, `and every landmark (${centres.length} centres)`);
  const points = around(centres);
  for (const scale of [0.5, 0.85, 1.6]) {
    const { differ, flat, beacons } = compareNearby(nearbyPair(), points, scale);
    assert.deepEqual(differ.slice(0, 8), [], `${differ.length} of ${points.length} player positions find something else at scale ${scale}`);
    // The premise: the grid reaches the beacons by their feet, and their other points would change answers without the marks.
    assert.ok(beacons > 200, `a beacon is nearby by its foot from ${beacons} positions (scale ${scale})`);
    assert.ok(flat > points.length * 0.02, `without the tapOnly marks ${flat} of ${points.length} answers would change (scale ${scale})`);
  }
});

test("the gold tour marker stays the marker's one object, lifted to its diamond: a tap there finds it and E/Enter finds it from where it did", () => {
  // All ten found and the explore objective on the museum's tour stop, where story.js puts its target: the marker stands there.
  const objective = { id: 'explore', text: '', hint: '', tourId: 'museum:0', tourAction: 'Tour', target: { x: MUSEUM.x, y: MUSEUM.y, name: 'Tour' } };
  for (const scale of [0.5, 0.85, 1.6]) {
    const pair = nearbyPair({ found: SURPRISE_IDS, objective }), lift = sprites.tourMarkerLift(scale);
    pair.stand({ x: MUSEUM.x, y: MUSEUM.y + 60 }, scale);
    assert.deepEqual(pair.now.objects().filter(o => o.id === 'tour-marker'), [{ id: 'tour-marker', kind: 'visit', name: 'Tour', x: MUSEUM.x, y: MUSEUM.y - lift }], `one marker object, at its diamond and not tapOnly (scale ${scale})`);
    assert.equal(pair.now.hit({ x: MUSEUM.x, y: MUSEUM.y - lift })?.id, 'tour-marker', `a tap on the diamond finds it (scale ${scale})`);
    const { differ, marker } = compareNearby(pair, around([MUSEUM, { x: MUSEUM.x, y: MUSEUM.y - lift }]), scale);
    assert.deepEqual(differ.slice(0, 8), [], `${differ.length} player positions find something else at scale ${scale}`);
    assert.ok(marker > 20, `E/Enter finds the marker from ${marker} positions, as before (scale ${scale})`);
  }
});

test("a beacon's tap points past its foot are tapOnly copies of it: the foot, half way up, the globe and the label open the beacon, named for the hover chip", () => {
  const layer = declaration('const mapLayers = {');
  assert.match(layer, /\.\.\.sprites\.chipTargets\(w, scene \?\?= visits\.scene\(\), o\)\]\.map\(p => p === o \? p : \{ \.\.\.p, tapOnly: true \}\) : \[o\]\);/, "every point but the beacon's own object is tapOnly");
  assert.match(layer, /o\.id === 'tour-marker' \? \[\{ \.\.\.o, y: o\.y - tourMarkerLift\(w\.scale\) \}\] : /, "the lifted tour marker is the marker's one object, unmarked");
  const { id } = clearBeacon(), site = SURPRISE_SITES[id], at = `surprise:${id}`, middle = site.y - sprites.BEACON_LIFT / 2;
  const points = { 'the foot': () => ({ x: site.x, y: site.y }), 'half way up': () => ({ x: site.x, y: middle }), 'the globe': m => m.globe(id), 'the label': m => { const c = m.label(at); return { x: c.x, y: (c.top + c.bottom) / 2 }; } };
  for (const scale of [0.5, 0.85, 1.6]) {
    const m = beaconMap(), { world, visits } = m;
    world.camera.lookAt(site, scale);
    const own = visits.objects(world).find(o => o.id === at), mine = world.objects().filter(o => o.id === at), radius = R(world);
    assert.deepEqual(mine.filter(o => !o.tapOnly), [own], `the shell's own object is the beacon's one point for nearest() (scale ${scale})`);
    assert.ok(mine.length > 3 && mine.every(o => o === own || (o.tapOnly === true && o.kind === 'visit' && o.name === own.name)), `the rest are tapOnly copies with its kind and name (${mine.length} points, scale ${scale})`);
    for (const [what, point] of Object.entries(points)) {
      const o = world.hit(point(m));
      assert.equal(o?.id, at, `${what} (scale ${scale})`);
      assert.equal(o === own, what === 'the foot', `${what}: ${what === 'the foot' ? "the beacon's own object" : 'a tapOnly copy'} (scale ${scale})`);
      assert.equal(o.name, own.name, `${what}: the hover chip names the beacon`);
    }
    for (const p of [{ x: site.x - radius - 12, y: middle }, { x: site.x, y: site.y + radius + 8 }]) assert.equal(world.hit(p), undefined, `empty ground (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) walks (scale ${scale})`);
  }
  // Each opens the beacon: game.js's map tap gives a visit object to visits.interact, which reads its id.
  for (const [what, point] of Object.entries(points)) {
    const m = beaconMap();
    m.world.camera.lookAt(site, 0.85);
    const o = m.world.hit(point(m));
    assert.equal(o?.kind, 'visit', what);
    assert.equal(m.visits.interact(o, 'tap'), true, `a tap on ${what} opens ${at}`);
  }
  // E/Enter, the world prompt and the Nearby hint read world.nearest() alone; E/Enter and the prompt interact with what it finds.
  assert.equal([...GAME.matchAll(/\bworld\.nearest\(\)/g)].length, 3);
  assert.equal([...GAME.matchAll(/const nearest = world\.nearest\(\); if \(nearest\) \{ stopWalk\(\); interact\(nearest, 'talk'\); \}/g)].length, 2, 'E/Enter and the world prompt');
  assert.match(declaration('function hint('), /const nearest = world\.nearest\(\), text = [^\n]*nearest\.name/);
});

test("the beacon and its label are no target in an overview (Godot taps no surprise there), nor its label below the chip zoom", () => {
  const { id } = clearBeacon(), site = SURPRISE_SITES[id], at = `surprise:${id}`;
  const { world, label, globe } = beaconMap();
  world.camera.lookAt(site, 0.85);
  const chip = label(at), g = globe(id);
  world.camera.overviewMode = true;
  for (const p of [{ x: site.x, y: site.y }, g, { x: chip.x, y: (chip.top + chip.bottom) / 2 }]) assert.notEqual(world.hit(p)?.id, at, `(${p.x}, ${p.y}) in an overview`);
  assert.ok(!world.objects().some(o => o.id === at), 'no beacon object at all');
  world.camera.overviewMode = false;
  world.camera.scale = sprites.CHIP_ZOOM - 0.01; world.camera.update();
  assert.deepEqual(world.objects().filter(o => o.id === at).map(o => o.y), [0, sprites.BEACON_LIFT / 2, sprites.BEACON_LIFT].map(lift => site.y - lift), 'below the chip zoom: its foot, half way and its globe, no label');
});

test('two beacons close together: a tap resolves to the nearest drawn one, globe, foot or label', () => {
  const [a, b] = markers([]);
  const A = { ...a, x: -700, y: -150 }, B = { ...b, x: -676, y: -162 };
  const object = m => ({ id: `surprise:${m.id}`, kind: 'visit', name: m.id, x: m.x, y: m.y });
  const scene = { surprises: [A, B] };
  for (const scale of [0.85, 1.6]) {
    const { world, label, globe } = beaconMap({ objects: [object(A), object(B)], scene });
    world.camera.lookAt(A, scale);
    for (const m of [A, B]) {
      const at = `surprise:${m.id}`, chip = label(at), g = globe(m.id);
      assert.equal(world.hit(g)?.id, at, `${m.id}'s globe at ${scale}`);
      assert.equal(world.hit({ x: m.x, y: m.y })?.id, at, `${m.id}'s foot at ${scale}`);
      for (const x of [chip.left + 2, chip.x, chip.right - 2]) for (const y of [chip.top + 2, chip.bottom - 2]) assert.equal(world.hit({ x, y })?.id, at, `${m.id}'s label at (${x.toFixed(1)}, ${y.toFixed(1)}), ${scale}`);
    }
    const [ca, cb] = [label(`surprise:${A.id}`), label(`surprise:${B.id}`)];
    assert.ok(ca.bottom <= cb.top || cb.bottom <= ca.top, 'the two labels sit in different rows');
    // Between the two globes, the nearer one.
    const ga = globe(A.id);
    assert.equal(world.hit({ x: ga.x + 8, y: ga.y - 2 })?.id, `surprise:${A.id}`);
  }
});

test("a neighbor's name chip, a neighbor and a place keep winning where they did: labels first, then the nearest point", () => {
  const bea = NEIGHBORS.find(n => n.id === 'bea'), history = PLACES.find(p => p.id === 'history');
  const [m] = markers([]);
  // A beacon a step south of Bea: the declutter keeps its label off her name chip and her body; her name chip and her own point
  // are hers, the beacon's globe and label the beacon's.
  const B = { ...m, x: bea.x, y: bea.y + 7 }, object = { id: `surprise:${m.id}`, kind: 'visit', name: m.id, x: B.x, y: B.y };
  const { world, label, globe } = beaconMap({ objects: [object], scene: { surprises: [B] }, player: { x: 300, y: 10 } });
  world.camera.lookAt(bea, 1);
  const chip = label(object.id), name = { x: bea.x, y: bea.y - 43 - 7.5 };
  assert.ok(chip.bottom <= name.y - 11.5 - 3 || chip.top >= name.y + 11.5 + 3 || chip.right <= bea.x - 20 || chip.left >= bea.x + 20, 'the label keeps off her name chip');
  assert.equal(world.hit(name)?.id, 'bea', 'her name chip is hers');
  assert.equal(world.hit({ x: bea.x, y: bea.y })?.id, 'bea', 'and her own point');
  assert.equal(world.hit({ x: chip.x, y: (chip.top + chip.bottom) / 2 })?.id, object.id, "the beacon's label is the beacon's");
  // A beacon beside Bea: her body is hers, the beacon's globe is the beacon's.
  const C = { ...m, x: bea.x + 30, y: bea.y }, near = beaconMap({ objects: [{ ...object, x: C.x, y: C.y }], scene: { surprises: [C] } });
  near.world.camera.lookAt(bea, 1);
  assert.equal(near.world.hit({ x: bea.x - 2, y: bea.y - 4 })?.id, 'bea');
  assert.equal(near.world.hit(near.globe(m.id))?.id, object.id);
  // The real drag show beacon by the history stop: the stop's marker is the stop's, the beacon's globe and label the beacon's.
  const id = 'impromptu_drag_show', site = SURPRISE_SITES[id], real = beaconMap();
  real.world.camera.lookAt(site, 0.85);
  assert.equal(real.world.hit({ x: history.x, y: history.y - 14 })?.id, 'history');
  assert.equal(real.world.hit(real.globe(id))?.id, `surprise:${id}`);
  const drag = real.label(`surprise:${id}`);
  assert.equal(real.world.hit({ x: drag.right - 10 * drag.k, y: drag.y - 8 * drag.k })?.id, `surprise:${id}`, 'its (Tap)');
});

test("a map tap on a visit object opens it there and never walks; E/Enter and arrivals reach the visits too", () => {
  assert.match(declaration('async function init('), /click: \(point, object\) => object \? object\.kind === 'visit' \? interact\(object, 'tap'\) : goTo\(object\) : moveTo\(point\), tap: event => settle\.tap\(event\)/);
  assert.match(declaration('function interact('), /if \(!object\) return;\n\s+if \(object\.kind === 'visit'\) return visits\.interact\(object, how\);/);
});

test('the speech bubble anchors a side-story speaker through visits.anchor, and host.speak shares the one bubble', () => {
  const step = declaration('function stepSpeech(');
  assert.match(step, /const n = bubble && \(neighborById\(bubble\.id\) \?\? visits\.anchor\(bubble\.id\)\);/);
  const speak = declaration('function speak(');
  assert.match(speak, /bubble = showBubble\(id, text\);/);
  assert.match(speak, /if \(bubble && !modal\.open\) routeSay\(/, 'the live region says it while no dialog shows the line');
});

// ---------------------------------------------------------------- entries, the objective and the debug handle
test("the entries sit where spec 3.7 puts them: the startup card, the afterglow, Field notes and the walk control", () => {
  const card = declaration('function showChapterCard(');
  assert.match(card, /function showChapterCard\(startup = false, \{ announce \} = \{\}\)/);
  assert.match(card, /<p>\$\{card\.body\}<\/p>\$\{startup \? `<div class="button-row">\$\{visits\.entryHTML\('before'\)\}<\/div>` : ''\}<div class="button-row">\$\{button\(id, card\.button, true\)\}/, 'Before These Streets sits in its own row above Start Exploring');
  assert.match(card, /\$\('#modal-status'\)\.textContent = announce \?\? card\.announcement;/);
  assert.match(card, /if \(startup\) \{ visits\.bindEntry\('before'\); \$\('#begin'\)\.focus\(\{ preventScroll: true \}\); \}/, 'Start Exploring keeps the focus');
  const glow = declaration('function updateAfterglow(');
  assert.ok(glow.indexOf("visits.entryHTML('story') + visits.entryHTML('meal')") > glow.indexOf("bind('rhythm-circle'"), 'Story and Cook & Share come after the Rhythm Circle');
  assert.match(glow, /visits\.bindEntry\('story'\); visits\.bindEntry\('meal'\);/);
  const notes = declaration('function journal(');
  assert.match(notes, /const revisit = visits\.entryHTML\('revisit'\);/);
  assert.match(notes, /\(revisit \? `<div class="history-entry">\$\{revisit\}<\/div>` : ''\) \+ visits\.entryHTML\('notes'\)/);
  assert.match(notes, /visits\.bindEntry\('revisit'\); visits\.bindEntry\('notes'\);/);
  const init = declaration('async function init(');
  assert.match(init, /\$\('#stop-walking'\)\.insertAdjacentHTML\('beforebegin', '<button id="story-resume" class="secondary-button" aria-describedby="story-resume-tip" hidden><\/button><span id="story-resume-tip" class="sr-only"><\/span>'\);/);
  assert.ok(init.indexOf('#stop-walking') < init.indexOf('new World('), 'the walk control exists before the first hint()');
  assert.match(init, /visits\.bindEntry\('resume'\);/);
  assert.match(declaration('function hint('), /storyResumeUI\(\);/);
  assert.match(declaration('function storyResumeUI('), /visits\.entries\(\)\.resume/);
  assert.match(init, /visits: \(\) => visits\.snapshot\(\)/, 'window.tenderloin.visits()');
});

test("the objective sees the visit: storyWorld carries the episode, the tour and the last hint, and What's Next works it out again", () => {
  assert.match(declaration('const storyWorld'), /\(\{ player: state\.player, neighbors: NEIGHBORS, places: PLACE_BY_ID, \.\.\.visits\.objectiveInputs\(\), openNeighborId: openConversation\(\) \}\)/);
  const ask = declaration('function askWhatsNext(');
  assert.match(ask, /if \(goal\.id === 'explore'\) \{ visits\.hinted\(goal\.speakerHints\?\.\[id\]\?\.lastHinted \?\? ''\); after = nextObjective\(state, storyWorld\(\)\); announce = whatsNextAnnouncement\(\{ \.\.\.goal, text: after\.text \}, id\); \}/);
  assert.match(ask, /: after\.target;/, "the walk goes to the objective Godot works out after the hint (its guide marker)");
  // The surprises are the fork's own now: sparks and memories read the state, not the stored save.
  assert.match(declaration('const talkExtras'), /\(\{ surprises: state\.surprises, muralScenes: state\.muralScenes \?\? \{\} \}\)/);
  assert.doesNotMatch(GAME, /\bgodotExtras\b/);
});

// ---------------------------------------------------------------- conversations
test("the conversation's side-story actions go to the visits, and one action Godot names twice is one control", () => {
  assert.match(declaration('function runConversationAction('), /case 'surprise': case 'museum': case 'eateries': case 'landmark_tour': return visits\.conversationAction\(kind, partner\);/);
  // Godot's chain names an action twice: Rook after his speaker's return in chapter 6 (Spot Surprise from the goal, then again as
  // the someone-else step), and Celeste and Thanh the same way after theirs.
  const { state } = parseGodotSave(canonicalStringify(filmDoneEnvelope({ save_seq: 5, history_read: true, blackhawk_discovered: true })), { initialState });
  const goal = nextObjective(state, { player: state.player, neighbors: NEIGHBORS, places: Object.fromEntries(PLACES.map(p => [p.id, p])) });
  assert.equal(goal.id, 'explore');
  const listed = conversationActions(state, { surprises: state.surprises }, { ...freshTalk(), confirmedLoan: 'speaker' }, 'rook', goal);
  assert.deepEqual(listed.map(a => a.id), ['return_owner:speaker', 'surprise', 'surprise', 'hub'], "the premise: Godot's own list repeats Spot Surprise");
  // game.js's ids and its one-control-per-id rule, evaluated.
  const actionDom = new Function('state', `${declaration('const ACTION_DOM')}\n${declaration('function actionDom(')}\nreturn actionDom;`)(state);
  const uniqueById = new Function(`${declaration('const uniqueById')}\nreturn uniqueById;`)();
  const controls = listed.map(a => ({ ...a, dom: actionDom(a) })), kept = uniqueById(controls);
  assert.deepEqual(kept.map(a => a.dom), ['loan-receipt', 'talk-surprise', 'talk-hub'], 'one control per id, the first kept, nothing capped');
  assert.equal(kept[1], controls[1]);
  assert.deepEqual(uniqueById([{ dom: 'a' }, { dom: 'b' }, { dom: 'c' }, { dom: 'd' }]).length, 4, 'a list without repeats is whole');
  const talk = declaration('function conversation(');
  assert.match(talk, /const actions = uniqueById\(listed\);/, 'the rendered and bound actions are the unique ones');
  assert.match(talk, /for \(const a of actions\) bind\(a\.dom, \(\) => runConversationAction\(id, a\)\);/);
});

// ---------------------------------------------------------------- saving and the fork text
test("only visits-world.js dispatches a find: act({ type: 'surprise' appears nowhere else in the fork", () => {
  const root = new URL('../browser-next/', import.meta.url), found = [];
  const walk = dir => {
    for (const entry of readdirSync(new URL(dir, root), { withFileTypes: true })) {
      const rel = dir + entry.name;
      if (entry.isDirectory()) walk(rel + '/');
      else if (/\.(js|html)$/.test(entry.name) && read(`browser-next/${rel}`).includes("act({ type: 'surprise'")) found.push(rel);
    }
  };
  walk('');
  assert.deepEqual(found, ['visits-world.js']);
});

test('game.js draws the fork text of the visits from VISITS_FORK_TEXT and their Godot labels through the shell, never an inline copy', () => {
  assert.match(GAME, /\bVISITS_FORK_TEXT\.adopted\b/);
  for (const [key, value] of Object.entries(VISITS_FORK_TEXT)) assert.ok(!inline(value), `game.js uses VISITS_FORK_TEXT.${key}, not an inline copy: ${value}`);
  // The entry labels and descriptions game.js places (spec 3.7) come from visits-ui.js entryHTML().
  const MAIN = GODOT_TEXT['main.gd'], CARD = MAIN.build_story_card, MAKE = MAIN.make_ui, HUB = MAIN.apply_hub_guidance, WALK = MAIN.update_walk_control;
  const labels = [CARD.before, CARD.beforeName, MAKE.beforeRevisit, MAKE.meal, HUB.suggested, HUB.locked, HUB.meal, ...Object.values(WALK), GODOT_TEXT['power_story.gd'].setup.story, web('power_story.gd', entryTooltip()),
    MAIN.conversation_actions.museum, MAIN.conversation_actions.eateries, conversationLabel([]), conversationLabel(SURPRISE_IDS), progressLabel([], 0)];
  for (const label of labels) assert.ok(typeof label === 'string' && label.length > 3 && !inline(label), `game.js does not copy ${JSON.stringify(label)}`);
  // Nor any other Godot text of the visits. Two lines are older fork text of game.js that happens to share Godot's words: the
  // second gathering's footnote starts as shared_meal.gd's credit, and Keep exploring is the fork's own close label.
  const OLDER = ['Original fictional neighbors | Stylized, untimed cooking | This visit only', 'Keep exploring'];
  for (const value of new Set([...strings(GODOT_TEXT), ...strings(WEB_OVERRIDES)])) if (value.length > 3 && !OLDER.includes(value)) assert.ok(!inline(value), `game.js does not copy the Godot line ${JSON.stringify(value)}`);
});

// ---------------------------------------------------------------- Play the 3D edition (edition.js)
test('game.js swaps to the 3D edition through edition.js: the page link and a Settings row of its own, both guarded', () => {
  assert.match(GAME, /^import \{ EDITION_URL, EDITION_TEXT, swapAction \} from '\.\/edition\.js';$/m);
  // The page's link (index.html) is guarded, and Stay here returns to it.
  assert.match(GAME, /^bindSwap\(\$\('#swap-edition'\), \(\) => close\(\$\('#swap-edition'\)\)\);$/m);
  // Settings: the same link in its own row, described by its one-sentence help and guarded. Stay here draws Settings again with
  // the link focused, as Keep my afternoon does for the restart button.
  const settings = declaration('function showSettings(');
  assert.ok(settings.includes('<div class="edition-row"><p id="swap-edition-settings-help">${EDITION_TEXT.help}</p><a id="swap-edition-settings" class="edition-link" href="${EDITION_URL}" aria-describedby="swap-edition-settings-help">${EDITION_TEXT.link}<span aria-hidden="true">↗</span></a></div>'), 'the Settings row');
  assert.ok(settings.indexOf('id="swap-edition-settings"') < settings.indexOf('id="restart"'), 'above the restart button');
  assert.match(settings, /bindSwap\(\$\('#swap-edition-settings'\), \(\) => \{ showSettings\(\); const link = \$\('#swap-edition-settings'\); link\.focus\(\{ preventScroll: true \}\); link\.scrollIntoView\(\{ block: 'nearest' \}\); \}\);/);
});

// game.js's swapEdition over stand-ins: syncStored (whose re-read may find a newer save), offerRecovery and confirmSwap record what
// they are asked to do, and the event records whether the browser may still follow the link.
function swapGame({ recovery = null, held = false, sync = () => ({}) } = {}) {
  const log = [];
  const game = new Function('swapAction', 'EDITION_TEXT', 'log', 'sync', [
    'let recovery = null, held = false;',
    "function syncStored() { const next = sync(); log.push(['sync']); if ('recovery' in next) recovery = next.recovery; if ('held' in next) held = next.held; }",
    "function offerRecovery(message) { log.push(['offer', message]); }",
    "function confirmSwap(back, origin) { log.push(['confirm', back, origin.id]); }",
    declaration('function swapEdition('),
    'return { swapEdition, set(r, h) { recovery = r; held = h; } };',
  ].join('\n'))(swapAction, EDITION_TEXT, log, sync);
  game.set(recovery, held);
  const press = (init = {}) => {
    const event = { type: 'click', button: 0, currentTarget: { id: 'swap-edition' }, prevented: 0, preventDefault() { this.prevented++; }, ...init };
    game.swapEdition(event, 'back');
    return event;
  };
  return { log, press };
}

test('swapEdition reads the shared save again, then lets the link go unless leaving could lose progress', () => {
  // Nothing pending: the browser follows the link, and a modifier click keeps its new tab.
  let g = swapGame();
  assert.equal(g.press().prevented, 0); assert.equal(g.press({ ctrlKey: true }).prevented, 0);
  assert.deepEqual(g.log, [['sync'], ['sync']]);
  // A pending recovery offer: no swap; the offer comes back and says why.
  g = swapGame({ recovery: { envelope: {} } });
  assert.equal(g.press().prevented, 1);
  assert.deepEqual(g.log, [['sync'], ['offer', EDITION_TEXT.recover]]);
  // A held save: no swap; the confirmation, which knows the way back and the link it came from.
  g = swapGame({ held: true });
  assert.equal(g.press().prevented, 1);
  assert.deepEqual(g.log, [['sync'], ['confirm', 'back', 'swap-edition']]);
  // The re-read decides: a stale save another tab or edition wrote just now is offered back...
  g = swapGame({ sync: () => ({ recovery: { envelope: {} } }) });
  assert.equal(g.press().prevented, 1); assert.deepEqual(g.log.at(-1), ['offer', EDITION_TEXT.recover]);
  // ...an unreadable one asks first...
  g = swapGame({ sync: () => ({ held: true }) });
  assert.equal(g.press().prevented, 1); assert.deepEqual(g.log.at(-1), ['confirm', 'back', 'swap-edition']);
  // ...and a restart in another tab that withdrew the offer lets the swap go.
  g = swapGame({ recovery: { envelope: {} }, sync: () => ({ recovery: null }) });
  assert.equal(g.press().prevented, 0); assert.deepEqual(g.log, [['sync']]);
  // A middle click that would open a new tab is held the same way.
  g = swapGame({ held: true });
  assert.equal(g.press({ type: 'auxclick', button: 1 }).prevented, 1);
});

test('bindSwap guards a click, a modifier click and a middle click on the link, never a right click', () => {
  const listeners = {}, seen = [];
  const link = { addEventListener(type, fn) { (listeners[type] ??= []).push(fn); } };
  const bindSwap = new Function('swapEdition', `${declaration('function bindSwap(')}\nreturn bindSwap;`)((event, back) => seen.push([event.type, event.button, back]));
  bindSwap(link, 'back');
  assert.deepEqual(Object.keys(listeners).sort(), ['auxclick', 'click']);
  const fire = (type, button, extra = {}) => listeners[type].forEach(fn => fn({ type, button, ...extra }));
  fire('click', 0); fire('click', 0, { ctrlKey: true }); fire('auxclick', 1); fire('auxclick', 2);
  assert.deepEqual(seen, [['click', 0, 'back'], ['click', 0, 'back'], ['auxclick', 1, 'back']]);
});

// game.js's confirmSwap and button over stand-ins for show, bind, $, the dialog and location.
function confirmGame(open) {
  const shown = [], bound = {}, focused = [], assigned = [], modal = { open };
  const el = id => ({ id, focus() { focused.push(id); } }), canvas = el('world'), origin = el('swap-edition');
  const made = new Function('show', 'bind', '$', 'modal', 'location', 'EDITION_URL', 'EDITION_TEXT', 'canvas',
    `let modalReturnTarget = canvas;\n${declaration('function button(')}\n${declaration('function confirmSwap(')}\nreturn { confirmSwap, target: () => modalReturnTarget };`)(
    html => { shown.push(html); modal.open = true; }, (id, fn) => { bound[id] = fn; }, selector => el(selector.slice(1)), modal, { assign: url => assigned.push(url) }, EDITION_URL, EDITION_TEXT, canvas);
  return { made, shown, bound, focused, assigned, origin, canvas };
}

test('confirmSwap asks before the 3D edition replaces an unreadable save: Stay here has the focus, Open the 3D edition goes', () => {
  const back = () => {}, page = confirmGame(false);
  page.made.confirmSwap(back, page.origin);
  assert.equal(page.shown.length, 1);
  const html = page.shown[0], T = EDITION_TEXT;
  assert.ok(html.startsWith(`<span class="eyebrow">${T.eyebrow}</span><h2 id="modal-title">${T.title}</h2><p>${T.confirm}</p><div class="button-row">`), html);
  const buttons = [...html.matchAll(/<button id="([^"]+)" class="([^"]+)"[^>]*>([^<]*)<\/button>/g)].map(m => m.slice(1));
  assert.deepEqual(buttons, [['swap-open', 'primary-button', T.open], ['swap-stay', 'secondary-button', T.stay]], 'Open first, as Start fresh is');
  assert.doesNotMatch(html, /data-rapid/, 'neither is rapid');
  assert.deepEqual(page.focused, ['swap-stay'], 'Stay here has the focus, as Keep my afternoon does, so a held Enter never reaches Open');
  assert.equal(page.bound['swap-stay'], back, 'Stay here goes back to the link the swap came from');
  assert.equal(page.made.target(), page.origin, 'opened from the page, Escape and × return to the link too');
  page.bound['swap-open']();
  assert.deepEqual(page.assigned, [EDITION_URL], 'Open the 3D edition follows the same link');
  // From Settings the dialog was already open: Escape and × close it as they close Settings.
  const settings = confirmGame(true);
  settings.made.confirmSwap(back, { id: 'swap-edition-settings' });
  assert.equal(settings.made.target(), settings.canvas);
});
