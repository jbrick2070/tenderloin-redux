// browser-next/visits-ui.js, the visits shell (Phase 3 wiring spec 3.3 and WP2a): the session, the ctx, the entries, Before These
// Streets, Cook & Share and the story picker, the walk protocol through the kit, normalize() and the held-state rules, scene() and
// snapshot(), on the stand-in dialog and host of next-fixtures.mjs. The episode screens are a small stand-in part below
// (visits-episodes.js belongs to another package); the neighborhood part is left inert or recorded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gdSource, gdStrings, jsStrings } from './gd-literal.mjs';
import { fakeDialog, visitsHost } from './next-fixtures.mjs';
import * as K from '../browser-next/visits-kit.js';
import { createVisits } from '../browser-next/visits-ui.js';
import { GODOT_TEXT, web } from '../browser-next/visits/text.js';
import * as before from '../browser-next/visits/before-streets.js';
import * as meal from '../browser-next/visits/meal.js';
import * as picker from '../browser-next/visits/picker.js';
import * as dogs from '../browser-next/visits/dogs.js';
import * as lantern from '../browser-next/visits/lantern.js';
import * as power from '../browser-next/visits/power.js';
import * as election from '../browser-next/visits/election.js';
import * as surprises from '../browser-next/visits/surprises.js';
import * as landmarks from '../browser-next/visits/landmarks.js';
import { DOG_GOALS } from '../browser-next/visits/positions.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const UI = read('browser-next/visits-ui.js'), KIT = read('browser-next/visits-kit.js');
const POWER_PLACE = JSON.parse(read('godot/data/power_place.json')), VOTING = JSON.parse(read('godot/data/voting_places.json'));
const GD_FILES = readdirSync(new URL('../godot/', import.meta.url)).filter(name => name.endsWith('.gd'));
const GD_LITERALS = new Set(GD_FILES.flatMap(name => gdStrings(gdSource(name))));
const MAIN = GODOT_TEXT['main.gd'], BT = GODOT_TEXT['before_streets.gd'], MT = GODOT_TEXT['shared_meal.gd'], PT = GODOT_TEXT['story_picker.gd'];
const HUB = MAIN.apply_hub_guidance, WALK = MAIN.update_walk_control;
const API = ['open', 'entries', 'entryHTML', 'bindEntry', 'conversationAction', 'objects', 'interact', 'scene', 'anchor', 'objectiveInputs', 'hinted', 'walkEnded', 'walkCancelled', 'tick', 'sync', 'reset', 'holds', 'snapshot'];
const flush = async () => { for (let i = 0; i < 20; i++) await null; };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

// Screens game.js and other modules draw into the same dialog.
const STARTUP = '<section data-chapter-card><span class="eyebrow">WELCOME</span><h2 id="modal-title">Chapter 1</h2><div class="button-row"><button id="begin" class="primary-button">Start</button></div></section>';
const NOTES = '<span class="eyebrow">YOUR FIELD NOTES</span><h2 id="modal-title">Field notes</h2><button id="journal-history" class="secondary-button">History</button>';
const RECOVERY = '<section data-recovery><h2 id="modal-title">Some progress went back.</h2><button id="recover-save">Keep</button></section>';
const SETTINGS = '<h2 id="modal-title">Settings</h2><button id="restart" class="secondary-button">Start fresh</button>';

// Reading generated HTML: tags with decoded attributes, and buttons with their visible label, accessible name and description.
const decode = text => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const spoken = text => String(text).replace(/\s+/g, ' ').trim();
const attrsOf = text => Object.fromEntries([...text.matchAll(/\s([a-zA-Z][\w-]*)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] === undefined ? '' : decode(m[2])]));
const tagsOf = html => [...html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)].map(m => ({ name: m[1].toLowerCase(), attrs: attrsOf(m[2]) }));
function buttonsOf(html) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m => {
    const attrs = attrsOf(m[1]), shown = spoken(decode(m[2].replace(/<br>/g, ' ').replace(/<[^>]+>/g, '')));
    const ref = attrs['aria-describedby'], desc = ref ? new RegExp(`<span id="${ref}" class="sr-only">([^<]*)</span>`).exec(html)?.[1] : undefined;
    return { id: attrs.id, attrs, shown, name: attrs['aria-label'] ?? shown, description: desc === undefined ? undefined : decode(desc) };
  });
}
const button = (html, id) => { const b = buttonsOf(html).find(x => x.id === id); assert.ok(b, `#${id} is drawn`); return b; };
// WCAG 2.5.3: the accessible name starts with the visible label; Godot's own name is the name or the description.
function assertLabelInName(b, godotName) {
  assert.ok(b.name.startsWith(b.shown), `#${b.id}: the name ${JSON.stringify(b.name)} starts with the visible label ${JSON.stringify(b.shown)}`);
  if (godotName != null && spoken(godotName) !== b.shown) assert.ok(b.name === spoken(godotName) || b.description?.includes(spoken(godotName)), `#${b.id}: Godot's name is the accessible name or its description`);
}
// The reader as Godot's text: one line per paragraph.
const readerOf = html => [.../<div id="visits-reader"[^>]*>([\s\S]*?)<\/div>/.exec(html)[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(p => decode(p[1].replace(/<[^>]+>/g, ''))).join('\n');

// A stand-in for visits-episodes.js (WP2b) with its contract: render draws an episode only once the shell has opened it in the
// module (else false), Back and Escape leave to kit.session.from, a walk clears session.from, and silentClose clears the open flag
// and the screen without touching the dialog. Each screen has Other stories (More stories for Power), Walk, Music and Back; step()
// drives the pure module as a press would.
function fakeEpisodes(kit, log) {
  const { session } = kit;
  const step = (id, action, extra) => { const r = picker.changeEpisode(session.stories, id, action, kit.ctx(extra)); session.stories = r.stories; kit.bump(); return r; };
  const leave = id => { if (!kit.holds(id)) return false; const r = step(id, { type: 'close' }); kit.leave(r.announce, session.from ?? undefined); return true; };
  function render(id, { announce = '' } = {}) {
    if (!session.stories[id]?.open) return false;
    log.push(['render', id, announce]);
    const v = picker.episodeView(session.stories, id, kit.ctx());
    const entry = id === 'power' ? K.btn({ id: 'power-more', label: 'More stories' }) : kit.readerEntry(id);
    kit.show(id, K.frameHTML({ kind: id, title: v.heading, headingEntry: entry, reader: v.text,
      tray: K.btn({ id: `${id}-walk`, label: 'Walk' }) + K.btn(kit.musicButton(id)) + K.btn({ id: `${id}-back`, label: 'Back' }) }));
    if (id === 'power') kit.bind('power-more', () => kit.openPicker()); else kit.bindReaderEntry(id);
    kit.bind(`${id}-back`, () => leave(id));
    kit.bindMusic(id, () => render(id));
    kit.bind(`${id}-walk`, () => { const r = step(id, { type: 'walk' }); if (r.walk) { session.from = null; kit.startWalk(id, r.walk, { name: id, announce: r.announce, keepCamera: id === 'lantern' || id === 'election' }); } });
    kit.say(announce);
    return true;
  }
  return {
    render, step,
    cancel(id) { log.push(['cancel', id]); return leave(id); },
    silentClose(id) {
      log.push(['silentClose', id]);
      const open = !!session.stories[id]?.open;
      if (open) step(id, { type: 'close', announce: false });
      if (session.screen === id) { session.screen = null; kit.bump(); }
      return open;
    },
  };
}

// The shell on the stand-in host. Page controls (the afterglow entries, #story-resume, #journal-button) live outside the dialog;
// escape() is the browser's Escape: the dialog's cancel event, then its close unless a listener prevented it.
function setup({ over = {}, episodes = true, world = null, files = true } = {}) {
  const dialog = fakeDialog(), page = new Map(), modalListeners = {};
  const inDialog = dialog.doc.getElementById;
  dialog.doc.getElementById = id => inDialog(id) ?? page.get(id) ?? null;
  const addModal = dialog.modal.addEventListener;
  dialog.modal.addEventListener = (type, fn) => { (modalListeners[type] ||= []).push(fn); addModal(type, fn); };
  const { host, log, io } = visitsHost(dialog, over);
  if (files) io.files = { 'power_place.json': POWER_PLACE, 'voting_places.json': VOTING };
  const made = [], parts = {};
  let kit = null, part = null;
  if (episodes) parts.createEpisodeScreens = k => { made.push(['episodes', k]); kit = k; return (part = typeof episodes === 'function' ? episodes(k) : fakeEpisodes(k, log)); };
  if (world) parts.createWorldVisits = k => { made.push(['world', k]); kit ??= k; return world(k); };
  const visits = createVisits(host, parts);
  const element = id => ({ id, disabled: false, listeners: {}, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }, focus() { log.push(['focus', id]); }, scrollIntoView() {} });
  const place = html => { for (const [, attrs] of html.matchAll(/<\w+\b([^>]*)>/g)) { const id = /\bid="([^"]+)"/.exec(attrs)?.[1]; if (id) page.set(id, element(id)); } };
  const press = id => {
    const el = dialog.doc.getElementById(id);
    assert.ok(el, `#${id} is on screen`);
    assert.ok(!el.disabled, `#${id} is enabled`);
    for (const fn of el.listeners.click || []) fn({ preventDefault() {} });
  };
  const escape = () => {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const fn of modalListeners.cancel || []) fn(event);
    if (!event.defaultPrevented) dialog.close();
    return event.defaultPrevented;
  };
  const count = type => log.filter(e => e[0] === type).length;
  const lastOf = type => log.filter(e => e[0] === type).at(-1);
  const focused = () => lastOf('focus')?.[1];
  const ids = () => [...io.html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  // Open and begin an episode in the module, as its screen's Begin would (any episode part).
  const begin = id => { for (const type of ['open', 'begin']) kit.session.stories = picker.changeEpisode(kit.session.stories, id, { type }, kit.ctx()).stories; kit.bump(); };
  return { visits, host, log, io, dialog, modalListeners, made, kit: () => kit, part: () => part, place, press, escape, count, lastOf, focused, ids, begin, html: () => io.html, snap: () => visits.snapshot() };
}

// ---------------------------------------------------------------- the module and its contract
test('visits-ui.js imports in Node without a DOM, exports createVisits and returns exactly the spec 3.3 API', async () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
  const mod = await import('../browser-next/visits-ui.js');
  assert.deepEqual(Object.keys(mod), ['createVisits']);
  const { visits } = setup({ episodes: false });
  assert.deepEqual(Object.keys(visits).sort(), [...API].sort());
  for (const name of API) assert.equal(typeof visits[name], 'function', name);
  // The spec grep (WP2a acceptance): no querySelector, innerHTML, fetch, localStorage or inline handler outside // comments, and
  // no browser global: the page is reached only through host and the kit.
  const code = UI.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /querySelector|innerHTML|fetch\(|localStorage|\son[a-z]+=/);
  const bare = code.replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g, "''");
  assert.doesNotMatch(bare, /\b(document|window|localStorage|sessionStorage|setTimeout|requestAnimationFrame|fetch|Math\.random|Date\.now|performance)\b/);
  // The episode screens and the neighborhood visits are parts game.js passes in, never imports of this file.
  assert.doesNotMatch(code, /from\s+'\.\/visits-(episodes|world)\.js'|\bimport\s*\(/);
  assert.deepEqual([...code.matchAll(/from '([^']+)'/g)].map(m => m[1]).filter(path => !path.startsWith('./visits/')), ['./visits-kit.js']);
  assert.ok(!UI.includes('\r'), 'visits-ui.js is LF');
});

test('createVisits: one kit for both parts, made once, the shell routes filled, one cancel and one close listener', () => {
  const s = setup({ world: () => ({}) });
  assert.deepEqual(s.made.map(m => m[0]), ['episodes', 'world']);
  const kit = s.made[0][1];
  assert.equal(s.made[1][1], kit, 'both parts get the same kit');
  for (const name of ['openPicker', 'openResume', 'renderEpisode']) assert.equal(typeof kit.routes[name], 'function', `kit.routes.${name}`);
  assert.equal(kit.session.version >= 0 && kit.session.screen, null);
  assert.deepEqual(Object.keys(s.modalListeners).sort(), ['cancel', 'close']);
  assert.deepEqual([s.modalListeners.cancel.length, s.modalListeners.close.length], [1, 1]);
  // Every visits screen is a kit screen (holds() reads #visits-reader in the open dialog).
  assert.equal(s.visits.holds(), false);
  s.visits.open('meal');
  assert.deepEqual([s.visits.holds(), kit.holds('meal'), kit.session.screen], [true, true, 'meal']);
});

test('without parts the shell runs on inert ones: no objects, nothing to interact with, and an episode no screen draws closes again', () => {
  const s = setup({ episodes: false }), { visits, log } = s;
  assert.deepEqual(visits.objects({ camera: { overviewMode: false } }), []);
  assert.equal(visits.interact({ id: 'museum', kind: 'visit', x: 0, y: 0 }, 'tap'), false);
  assert.equal(visits.conversationAction('surprise', 'bea'), false);
  assert.equal(visits.anchor('museum_docent'), null);
  assert.equal(visits.entryHTML('notes'), '');
  assert.equal(visits.bindEntry('notes'), false);
  assert.equal(visits.open('notes-spot', { from: 'notes' }), false);
  assert.deepEqual(visits.objectiveInputs(), { episode: null, tour: landmarks.initialTour(), lastHinted: '' });
  visits.hinted('cutesy_dino');
  assert.equal(visits.tick(16), false);
  assert.deepEqual(visits.walkEnded(), false);
  assert.deepEqual(visits.walkCancelled(), false);
  // Power opens in the module, nothing draws it: it closes again and its line is a toast.
  assert.equal(visits.open('story'), false);
  assert.deepEqual([s.snap().stories.power.open, s.snap().screen, s.dialog.modal.open], [false, null, false]);
  assert.equal(log.at(-1)[0], 'toast');
  // The shell's own screens need no part.
  assert.equal(visits.open('meal'), true);
  assert.equal(s.escape(), true);
  assert.equal(visits.open('before', { from: 'notes' }), true);
  assert.equal(s.escape(), true);
  assert.equal(visits.open('picker'), true);
});

// ---------------------------------------------------------------- entries (spec 3.7)
test("entries(): Godot's labels and descriptions, and when each entry shows", () => {
  const s = setup(), { visits, io } = s;
  io.state = { opened: false, surprises: [] };
  let e = visits.entries();
  assert.deepEqual(Object.keys(e), ['before', 'revisit', 'story', 'meal', 'resume', 'notes']);
  for (const entry of Object.values(e)) assert.deepEqual(Object.keys(entry), ['id', 'label', 'description', 'visible', 'locked', 'suggested']);
  assert.deepEqual(e.before, { id: 'before-entry', label: MAIN.build_story_card.before, description: MAIN.build_story_card.beforeName, visible: true, locked: false, suggested: false });
  assert.deepEqual(e.revisit, { id: 'before-revisit', label: MAIN.make_ui.beforeRevisit, description: '', visible: true, locked: false, suggested: false });
  const storyTip = web('power_story.gd', GODOT_TEXT['power_story.gd'].setup.storyTip);
  assert.doesNotMatch(storyTip, /F8/, 'the 2D description drops the 3D keys');
  assert.deepEqual(e.story, { id: 'story-entry', label: GODOT_TEXT['power_story.gd'].setup.story, description: storyTip, visible: false, locked: false, suggested: false });
  assert.equal(e.story.description, power.entryTooltip());
  // Godot apply_hub_guidance: locked until the block is open (or while hosting is in progress), suggested on the explore objective
  // while fewer than four dishes are shared; the tooltip joins the hint and the meal's own line with ". ".
  assert.deepEqual(e.meal, { id: 'meal-entry', label: MAIN.make_ui.meal, description: HUB.locked + HUB.joiner + HUB.meal, visible: false, locked: true, suggested: false });
  assert.deepEqual(e.resume, { id: 'story-resume', label: '', description: '', visible: false, locked: false, suggested: false });
  assert.deepEqual(e.notes, { id: 'notes-spot', label: surprises.conversationLabel([]), description: surprises.progressLabel([], 0), visible: true, locked: false, suggested: false });
  assert.equal(visits.entryHTML('story'), '');
  assert.equal(visits.entryHTML('meal'), '');
  io.state = { opened: true, surprises: ['cutesy_dino', 'jeffrey_record'] };
  io.sparks = 9;
  e = visits.entries();
  assert.equal(e.story.visible, true);
  assert.deepEqual([e.meal.visible, e.meal.locked, e.meal.suggested, e.meal.description], [true, false, true, HUB.suggested + HUB.joiner + HUB.meal]);
  assert.deepEqual([e.notes.label, e.notes.description], [surprises.conversationLabel(io.state.surprises), surprises.progressLabel(io.state.surprises, 9)]);
  io.objective = { id: 'film', text: '', hint: '', target: null };
  assert.deepEqual([visits.entries().meal.suggested, visits.entries().meal.description], [false, HUB.meal]);
  io.hosting = true;
  assert.deepEqual([visits.entries().meal.locked, visits.entries().meal.description], [true, HUB.locked + HUB.joiner + HUB.meal]);
  io.hosting = false;
  io.objective = { id: 'explore', text: '', hint: '', target: null };
  const session = s.kit().session;
  session.meal = { ...session.meal, shared: { 0: {}, 1: {}, 2: {}, 3: {} } };
  assert.equal(visits.entries().meal.suggested, false, 'all four dishes shared');
  // The walk control's label and tip per active episode, shown while it is active and the player is not walking.
  s.begin('dogs');
  e = visits.entries();
  assert.deepEqual([e.resume.label, e.resume.description, e.resume.visible], [WALK.dogs, WALK.dogsTip, true]);
  io.walking = true;
  assert.equal(visits.entries().resume.visible, false);
  assert.equal(visits.entries().revisit.visible, false, 'the revisit hides while walking');
  io.walking = false;
  assert.equal(visits.entries().revisit.visible, false, 'and while a story is active');
  session.stories = picker.initialStories();
  s.begin('power');
  assert.deepEqual([visits.entries().resume.label, visits.entries().resume.description], [WALK.power, WALK.powerTip]);
  // Field notes is the 2D Info column: neither the open dialog nor a side panel hides the revisit.
  session.stories = picker.initialStories();
  io.neighbor = 'bea';
  s.dialog.show(NOTES);
  assert.equal(visits.entries().revisit.visible, true);
});

test('entryHTML and bindEntry: label-in-name markup for game.js, each control bound once, opening its screen', () => {
  const s = setup(), { visits, io, log } = s;
  let [b] = buttonsOf(visits.entryHTML('before'));
  assert.deepEqual([b.id, b.shown, b.attrs['aria-label'], b.description], ['before-entry', MAIN.build_story_card.before, MAIN.build_story_card.before, MAIN.build_story_card.beforeName]);
  assertLabelInName(b, MAIN.build_story_card.beforeName);
  [b] = buttonsOf(visits.entryHTML('revisit'));
  assert.deepEqual([b.id, b.shown, b.attrs['aria-label'], b.description], ['before-revisit', MAIN.make_ui.beforeRevisit, undefined, undefined]);
  [b] = buttonsOf(visits.entryHTML('story'));
  assert.deepEqual([b.id, b.shown, b.attrs.title, b.description], ['story-entry', GODOT_TEXT['power_story.gd'].setup.story, power.entryTooltip(), power.entryTooltip()]);
  [b] = buttonsOf(visits.entryHTML('meal'));
  assert.deepEqual([b.id, b.shown, b.attrs.title, b.description], ['meal-entry', MAIN.make_ui.meal, visits.entries().meal.description, visits.entries().meal.description]);
  assert.equal(visits.entryHTML('resume'), '', 'no active episode');
  s.begin('lantern');
  [b] = buttonsOf(visits.entryHTML('resume'));
  assert.deepEqual([b.id, b.shown, b.attrs.title, b.description], ['story-resume', WALK.lantern, WALK.lanternTip, WALK.lanternTip]);
  s.kit().session.stories = picker.initialStories();
  io.walking = true;
  assert.equal(visits.entryHTML('revisit'), '', 'hidden entries draw nothing');
  io.walking = false;
  // The afterglow entries are page controls: bound once per control, and a press opens the screen.
  s.place(visits.entryHTML('meal'));
  assert.equal(visits.bindEntry('meal'), true);
  assert.equal(visits.bindEntry('meal'), false, 'the same control is bound once');
  assert.equal(visits.bindEntry('story'), false, 'no #story-entry on the page');
  assert.equal(visits.bindEntry('nope'), false);
  s.press('meal-entry');
  assert.equal(s.snap().screen, 'meal');
  assert.equal(log.filter(e => e[0] === 'show').length, 1, 'one press, one screen');
  assert.deepEqual(s.lastOf('returnTo'), ['returnTo', 'meal-entry']);
});

// ---------------------------------------------------------------- Before These Streets
test("Before These Streets from the startup card: Gust focused, Back to start, and Back or Escape restores the card with Godot's close line", () => {
  const s = setup(), { visits, io, log, dialog } = s;
  io.cards = { startup: true, story: true };
  dialog.show(STARTUP);
  assert.equal(visits.open('before', { from: 'startup' }), true);
  const b = { ...before.initialBefore(), open: true, fromStartup: true }, v = before.beforeView(b);
  assert.equal(dialog.heading(), v.title);
  assert.deepEqual(log.slice(-2), [['focus', 'before-gust'], ['status', before.announcement(b)]]);
  assert.equal(s.count('returnTo'), 0, 'from the startup card × returns to the canvas');
  assert.ok(!s.ids().includes('begin'), 'the Before screen has no #begin, so game.js never treats a movement key on it as Start Exploring');
  const back = button(s.html(), 'before-back');
  assert.equal(back.shown, BT.refresh.backToStart);
  assert.deepEqual([back.attrs.title, back.description], [BT.refresh.backTip, BT.refresh.backTip]);
  const closed = before.FRAME + BT.close_opening.closed;
  s.press('before-back');
  assert.deepEqual(log.at(-1), ['restoreStartupCard', closed]);
  assert.equal(s.count('close'), 0, 'the dialog stays open for the card');
  assert.deepEqual([s.snap().screen, s.snap().before.open, visits.holds()], [null, false, false]);
  // Escape runs Back's action.
  dialog.show(STARTUP);
  assert.equal(visits.open('before', { from: 'startup' }), true);
  assert.equal(s.escape(), true, 'the visits cancel listener handles Escape');
  assert.deepEqual(log.at(-1), ['restoreStartupCard', closed]);
  assert.equal(dialog.modal.open, true);
  // A dialog Escape over a screen visits does not hold is not visits' to handle.
  dialog.show(SETTINGS);
  assert.equal(s.escape(), false);
});

test('Before These Streets from Field notes: the notes dialog is not busy, Back closes to #journal-button with a toast; Godot\'s gate otherwise', () => {
  const s = setup(), { visits, io, log, dialog } = s;
  dialog.show(NOTES);
  assert.equal(visits.open('before', { from: 'notes' }), true, 'Field notes is the 2D Info column, not a focused activity');
  assert.deepEqual(log.at(-1), ['returnTo', 'journal-button']);
  assert.equal(button(s.html(), 'before-back').shown, BT.refresh.backToBlock);
  s.press('before-back');
  assert.deepEqual(log.slice(-2), [['close', 'journal-button'], ['toast', before.FRAME + BT.close_opening.closed]]);
  assert.equal(dialog.modal.open, false);
  // Escape from notes: the same close.
  dialog.show(NOTES);
  visits.open('before', { from: 'notes' });
  assert.equal(s.escape(), true);
  assert.deepEqual(log.slice(-2), [['close', 'journal-button'], ['toast', before.FRAME + BT.close_opening.closed]]);
  // Godot open_opening refuses during a focused activity, an active story, walking, or a story card other than the startup one.
  const refuse = BT.open_opening.refuse;
  dialog.show(SETTINGS);
  assert.equal(visits.open('before', { from: 'startup' }), false, 'another dialog is a focused activity');
  assert.deepEqual(log.at(-1), ['toast', refuse]);
  io.cards = { startup: false, story: true };
  assert.equal(visits.open('before', { from: 'startup' }), false, 'a later chapter card');
  assert.deepEqual(log.at(-1), ['toast', refuse]);
  io.cards = { startup: false, story: false };
  dialog.close();
  io.walking = true;
  assert.equal(visits.open('before', { from: 'notes' }), false, 'walking');
  assert.deepEqual(log.at(-1), ['toast', refuse]);
  io.walking = false;
  s.begin('dogs');
  assert.equal(visits.open('before', { from: 'notes' }), false, 'an active story');
  assert.deepEqual(log.at(-1), ['toast', refuse]);
  assert.equal(s.snap().before.open, false);
});

test("Before These Streets: Godot's views, observations and focus rules, and the Sources view with reading-reference links", () => {
  const s = setup(), { visits, log } = s;
  const b = () => s.snap().before;
  visits.open('before', { from: 'notes' });
  assert.equal(s.focused(), 'before-gust');
  let html = s.html();
  const img = tagsOf(html).find(t => t.name === 'img');
  assert.deepEqual([img.attrs.src, img.attrs.alt], [before.artworkDataURI(0, -1), before.artDescription(0, -1)]);
  assert.equal(readerOf(html), before.readerText(b()));
  assert.match(html, new RegExp(`<p class="eyebrow visits-credit">${K.esc(before.beforeView(b()).subtitle).replace(/[|()]/g, '\\$&')}</p>`), "Godot's two-line frame label is the credit");
  s.press('before-gust');
  assert.deepEqual([b().view, s.focused()], [1, 'before-gust']);
  assert.deepEqual(log.at(-1), ['status', before.announcement(b())]);
  s.press('before-gust');
  assert.deepEqual([b().view, s.focused()], [2, 'before-shapes'], 'Gust disabled moves focus to Changing shapes');
  assert.ok('disabled' in button(s.html(), 'before-gust').attrs);
  s.press('before-previous');
  assert.deepEqual([b().view, s.focused()], [1, 'before-previous']);
  s.press('before-previous');
  assert.deepEqual([b().view, s.focused()], [0, 'before-gust'], 'Previous disabled under focus moves it to Gust');
  assert.ok('disabled' in button(s.html(), 'before-previous').attrs);
  s.press('before-time');
  assert.deepEqual([b().observation, s.focused()], [1, 'before-time']);
  assert.deepEqual([button(s.html(), 'before-time').attrs['aria-pressed'], button(s.html(), 'before-shapes').attrs['aria-pressed']], ['true', 'false']);
  assert.equal(readerOf(s.html()), before.readerText(b()));
  assert.equal(tagsOf(s.html()).find(t => t.name === 'img').attrs.src, before.artworkDataURI(0, 1));
  s.press('before-shapes');
  assert.deepEqual([b().observation, button(s.html(), 'before-shapes').attrs['aria-pressed']], [0, 'true']);
  // Sources: Godot's frame and sources text, the URL lines as links that open in a new tab with no referrer; the reader is focused.
  s.press('before-sources');
  assert.equal(s.focused(), 'visits-reader');
  html = s.html();
  assert.equal(readerOf(html), before.readerText(b()));
  const links = tagsOf(html).filter(t => t.name === 'a');
  assert.deepEqual(links.map(a => a.attrs.href), before.sourceLines().filter(l => l.url).map(l => l.url));
  for (const a of links) assert.deepEqual([a.attrs.class, a.attrs.target, a.attrs.rel], ['source-link', '_blank', 'noreferrer']);
  assert.equal(button(html, 'before-sources').shown, BT.refresh.backToScene);
  assert.deepEqual(log.at(-1), ['status', before.announcement(b())]);
  s.press('before-sources');
  assert.equal(button(s.html(), 'before-sources').shown, BT.setup.sources);
  assert.ok(!tagsOf(s.html()).some(t => t.name === 'a'));
});

// ---------------------------------------------------------------- Cook & Share
test("Cook & Share refusals, in Godot's order, as toasts", () => {
  const s = setup(), { visits, io, log, dialog } = s, O = MT.open_meal;
  const refusal = () => { assert.equal(visits.open('meal'), false); assert.equal(log.at(-1)[0], 'toast'); return log.at(-1)[1]; };
  s.begin('dogs');
  Object.assign(io, { state: { opened: false, surprises: [] }, walking: true, hosting: true });
  assert.equal(refusal(), O.closed, 'the closed block first');
  io.state = { opened: true, surprises: [] };
  assert.equal(refusal(), O.story, 'then an active story');
  s.kit().session.stories = picker.initialStories();
  assert.equal(refusal(), O.busy, 'then walking');
  io.walking = false;
  io.cards = { startup: true, story: true };
  dialog.show(STARTUP);
  assert.equal(refusal(), O.busy, 'the startup card');
  io.cards = { startup: false, story: true };
  assert.equal(refusal(), O.busy, 'a chapter card');
  io.cards = { startup: false, story: false };
  dialog.show(NOTES);
  assert.equal(refusal(), O.busy, 'another dialog');
  dialog.close();
  assert.equal(refusal(), O.hosting, 'then hosting in progress');
  io.hosting = false;
  assert.equal(visits.open('meal'), true);
  assert.equal(s.snap().meal.open, true);
});

test('Cook & Share: five preparations, serving and placement, Share, Follow this invitation, Previous and Next, and Keep exploring', () => {
  const s = setup(), { visits, log } = s;
  const m = () => s.snap().meal;
  assert.equal(visits.open('meal'), true);
  assert.deepEqual(log.slice(-3), [['focus', 'meal-prepare'], ['status', meal.cue(m())], ['returnTo', 'meal-entry']]);
  let v = meal.mealView(m());
  assert.equal(s.dialog.heading(), K.esc(v.heading));
  assert.equal(readerOf(s.html()), v.text);
  assert.deepEqual(tagsOf(s.html()).filter(t => t.name === 'img').map(t => [t.attrs.src, t.attrs.alt]), [[meal.artworkDataURI(0, 0, 0), v.description]]);
  assert.ok('disabled' in button(s.html(), 'meal-share').attrs, 'nothing to share before the fifth step');
  assert.ok('disabled' in button(s.html(), 'meal-previous').attrs && 'disabled' in button(s.html(), 'meal-next').attrs, 'one cook revealed');
  for (let step = 1; step <= 5; step++) {
    s.press('meal-prepare');
    assert.equal(m().steps[0], step);
    assert.deepEqual(log.at(-1), ['status', meal.cue(m())]);
    assert.equal(s.focused(), step === 5 ? 'meal-share' : 'meal-prepare', 'the fifth step moves focus to Share');
  }
  assert.equal(button(s.html(), 'meal-prepare').shown, MT.refresh.again);
  s.press('meal-serving-1');
  assert.deepEqual([m().servings[0], s.focused(), button(s.html(), 'meal-serving-1').attrs['aria-pressed'], button(s.html(), 'meal-serving-0').attrs['aria-pressed']], [1, 'meal-serving-1', 'true', 'false']);
  s.press('meal-placement-1');
  assert.deepEqual([m().placements[0], s.focused()], [1, 'meal-placement-1']);
  s.press('meal-share');
  assert.deepEqual([m().shared[0], m().revealed, m().invitation, s.focused()], [{ serving: 1, placement: 1, generation: 0 }, 2, 1, 'meal-share']);
  assert.deepEqual(log.at(-1), ['status', meal.cue(m())]);
  assert.equal(button(s.html(), 'meal-share').shown, MT.refresh.followLabel);
  assert.ok(!s.ids().some(id => id.startsWith('meal-serving') || id.startsWith('meal-placement')), 'Godot hides the serving and placement rows once shared');
  v = meal.mealView(m());
  const previous = button(s.html(), 'meal-previous');
  assert.deepEqual([previous.attrs['aria-label'], previous.description, 'disabled' in previous.attrs], [MT.setup.previous, v.previous.name, false]);
  // Follow this invitation visits the next cook; Previous and Next select a revealed cook; each moves focus to the preparation.
  s.press('meal-share');
  assert.deepEqual([m().selected, s.focused()], [1, 'meal-prepare']);
  assert.equal(s.dialog.heading(), K.esc(meal.mealView(m()).heading));
  s.press('meal-previous');
  assert.deepEqual([m().selected, s.focused()], [0, 'meal-prepare']);
  s.press('meal-next');
  assert.deepEqual([m().selected, s.focused()], [1, 'meal-prepare']);
  s.press('meal-explore');
  assert.deepEqual(log.slice(-2), [['close', 'meal-entry'], ['toast', MT.close_meal.announce]]);
  assert.deepEqual([m().open, m().shared[0].serving, s.dialog.modal.open], [false, 1, false]);
  // The visit keeps the meal: it opens again where it was.
  visits.open('meal');
  assert.deepEqual([m().selected, m().revealed], [1, 2]);
});

test("Cook & Share: Escape closes with Godot's line, and sync() closes it silently once the block is no longer open", () => {
  const s = setup(), { visits, io, log } = s;
  visits.open('meal');
  assert.equal(s.escape(), true);
  assert.deepEqual(log.slice(-2), [['close', 'meal-entry'], ['toast', MT.close_meal.announce]]);
  visits.open('meal');
  assert.deepEqual(visits.sync(), { reset: false, closed: false }, 'the block is open');
  assert.equal(s.dialog.modal.open, true);
  io.state = { ...io.state, opened: false };
  const count = log.length;
  assert.deepEqual(visits.sync(), { reset: false, closed: true });
  assert.deepEqual(log.slice(count), [['close', undefined]], 'silent, focus to the canvas (the entry went with the block)');
  assert.deepEqual([s.snap().meal.open, s.snap().screen], [false, null]);
  assert.deepEqual(visits.sync(), { reset: false, closed: false }, 'nothing more to close');
});

// ---------------------------------------------------------------- the episodes, through the shell
test('Story opens Power, or the active episode it delegates to; resume opens the active episode; each returns to its control', async () => {
  const s = setup(), { visits, log } = s;
  const expected = picker.openEpisode(picker.initialStories(), 'power', s.kit().ctx()).announce;
  assert.equal(visits.open('story'), true);
  assert.deepEqual(s.lastOf('render'), ['render', 'power', expected]);
  assert.deepEqual(s.lastOf('returnTo'), ['returnTo', 'story-entry']);
  assert.equal(s.snap().screen, 'power');
  // The first Story open fetches the place file for Power's Larkin view and the Election Walk: Godot's line, then the loading line.
  assert.deepEqual(log.filter(e => e[0] === 'load').map(e => e[1]), ['power_place.json']);
  assert.deepEqual(log.filter(e => e[0] === 'status').slice(-2).map(e => e[1]), [expected, K.VISITS_FORK_TEXT.loading]);
  await flush();
  assert.deepEqual([s.snap().data.power_place, s.count('render')], ['ready', 1], 'the hub shows nothing that needs it, so nothing is redrawn');
  s.press('power-back');
  // A later Story open finds it ready; one that failed is tried again.
  visits.open('story');
  assert.equal(log.filter(e => e[0] === 'load').length, 1);
  s.press('power-back');
  assert.deepEqual(s.lastOf('close'), ['close', 'story-entry']);
  // Godot open_story: another active episode opens instead of Power.
  s.begin('dogs');
  assert.equal(visits.open('story'), true);
  assert.equal(s.lastOf('render')[1], 'dogs');
  s.press('dogs-back');
  // The walk control: the active episode, back to #story-resume.
  assert.equal(visits.open('resume'), true);
  assert.equal(s.lastOf('render')[1], 'dogs');
  assert.deepEqual(log.at(-1), ['returnTo', 'story-resume']);
  s.press('dogs-back');
  assert.deepEqual(s.lastOf('close'), ['close', 'story-resume']);
  // From the map (What's Next arriving at the episode target, kit.openResume): focus returns to the canvas.
  const returns = s.count('returnTo');
  assert.equal(s.kit().openResume(), true);
  assert.equal(s.count('returnTo'), returns);
  s.press('dogs-back');
  assert.deepEqual(s.lastOf('close'), ['close', undefined]);
  // Nothing active: nothing to resume. A refusal is Godot's line.
  s.kit().session.stories = picker.initialStories();
  assert.equal(visits.open('resume'), false);
  s.io.walking = true;
  assert.equal(visits.open('story'), false);
  assert.deepEqual(log.at(-1), ['toast', power.TEXT.open_story.refuse]);
  await flush();
});

test('the picker: opened from an episode, the visible page only, Earlier and Later, and Election once both files are ready', async () => {
  const s = setup(), { visits, log, io } = s;
  visits.open('story');
  await flush();
  s.press('power-more');
  let snap = s.snap();
  assert.deepEqual([snap.screen, snap.stories.power.open, snap.stories.picker.open, snap.stories.picker.returnStory, snap.stories.picker.openedFromReader], ['picker', false, true, 'power', true]);
  const pv = picker.pickerView(snap.stories, s.kit().ctx());
  assert.equal(s.dialog.heading(), pv.title);
  assert.equal(readerOf(s.html()), pv.text);
  const statuses = log.filter(e => e[0] === 'status').map(e => e[1]);
  assert.deepEqual(statuses.slice(-2), [PT.open_picker.announce + pv.text, K.VISITS_FORK_TEXT.loading], "Godot's announcement, then the loading line");
  assert.deepEqual(s.ids().filter(id => id.startsWith('picker-entry')), ['picker-entry-0', 'picker-entry-1'], 'two entries per page');
  assert.ok('disabled' in button(s.html(), 'picker-entry-1').attrs, 'Election waits for both files');
  assert.equal(s.focused(), 'picker-entry-0');
  assert.ok(log.filter(e => e[0] === 'stopWalk').length >= 1, 'Godot open_picker stops walking');
  assert.ok(!s.ids().includes('picker-follow'), 'no invitation yet');
  const focuses = s.count('focus');
  await flush();
  assert.equal(s.snap().data.voting_places, 'ready');
  assert.ok(!('disabled' in button(s.html(), 'picker-entry-1').attrs), 'redrawn with Election available');
  assert.equal(s.count('focus'), focuses, 'the redraw keeps focus where it was');
  // Later and Earlier: the other page's entries, focus on its first entry; Godot announces nothing.
  const said = log.filter(e => e[0] === 'status' || e[0] === 'toast').length;
  s.press('picker-later');
  assert.deepEqual(s.ids().filter(id => id.startsWith('picker-entry')), ['picker-entry-2', 'picker-entry-3']);
  assert.deepEqual([s.snap().stories.picker.page, s.focused()], [1, 'picker-entry-2']);
  assert.deepEqual(['disabled' in button(s.html(), 'picker-earlier').attrs, 'disabled' in button(s.html(), 'picker-later').attrs], [false, true]);
  s.press('picker-earlier');
  assert.deepEqual([s.snap().stories.picker.page, s.focused()], [0, 'picker-entry-0']);
  assert.equal(log.filter(e => e[0] === 'status' || e[0] === 'toast').length, said);
  // A page whose first entry is unavailable focuses Back to stories.
  io.state = { ...io.state, opened: false };
  s.press('picker-later');
  assert.equal(s.focused(), 'picker-back');
  // Entry names keep the label first.
  io.state = { ...io.state, opened: true };
  s.press('picker-earlier');
  const entry = button(s.html(), 'picker-entry-0');
  assert.deepEqual([entry.shown, entry.attrs['aria-label']], [picker.pickerView(s.snap().stories, s.kit().ctx()).entries[0].label, picker.pickerView(s.snap().stories, s.kit().ctx()).entries[0].name]);
  snap = s.snap();
  assert.equal(snap.stories.picker.open, true);
});

test('the picker: select an entry, Back to stories reopens its story, Keep exploring, Follow this invitation and Escape', async () => {
  const s = setup(), { visits, log } = s;
  visits.open('story');
  s.press('power-more');
  s.press('picker-later');
  const ctx = s.kit().ctx(), expected = picker.selectStory(s.kit().session.stories, 3, ctx).announce;
  s.press('picker-entry-3');
  assert.deepEqual(s.lastOf('render'), ['render', 'dogs', expected]);
  assert.deepEqual([s.snap().screen, s.snap().stories.picker.open, s.snap().stories.dogs.open], ['dogs', false, true]);
  // Escape on the picker is Back to stories: it reopens the story it was opened from.
  s.press('dogs-stories');
  assert.equal(s.snap().screen, 'picker');
  assert.equal(s.escape(), true);
  assert.deepEqual([s.snap().screen, s.lastOf('render')[1]], ['dogs', 'dogs']);
  // Keep exploring pauses the active story and goes back to the street, focus to the control that opened the visit.
  s.part().step('dogs', { type: 'begin' });
  s.press('dogs-stories');
  s.press('picker-explore');
  assert.deepEqual(log.slice(-2), [['close', 'story-entry'], ['toast', PT.keep_exploring.announce]]);
  assert.deepEqual([s.snap().stories.dogs.active, s.snap().stories.picker.suspended, s.snap().stories.picker.open], [false, ['dogs'], false]);
  // Back to stories when the picker was not opened from a story: Godot's line, back to the street.
  assert.equal(visits.open('picker'), true);
  s.press('picker-back');
  assert.deepEqual(log.slice(-2), [['close', undefined], ['toast', PT.back_to_stories.announce]]);
  // The reunion's invitation: Follow this invitation (focused) opens the Lantern Procession and is remembered.
  const session = s.kit().session;
  session.stories = { ...session.stories, picker: { ...session.stories.picker, lanternInvited: true } };
  assert.equal(visits.open('picker'), true);
  assert.equal(s.focused(), 'picker-follow');
  const follow = button(s.html(), 'picker-follow');
  assert.deepEqual([follow.attrs['aria-label'], follow.description], [PT.setup.follow, PT.setup.followName]);
  assert.ok(readerOf(s.html()).startsWith(PT.refresh.invitation.trim()));
  s.press('picker-follow');
  assert.equal(s.lastOf('render')[1], 'lantern');
  assert.deepEqual([s.snap().screen, s.snap().stories.picker.invitationFollowed, s.snap().stories.lantern.open], ['lantern', true, true]);
  // The picker opens only over the street or an episode: another activity is Godot's refusal, a closed block or a card says nothing.
  s.press('lantern-back');
  s.dialog.show(SETTINGS);
  assert.equal(visits.open('picker'), false);
  assert.deepEqual(log.at(-1), ['toast', PT.open_picker.refuse]);
  s.dialog.close();
  s.io.state = { ...s.io.state, opened: false };
  const count = log.length;
  assert.equal(visits.open('picker'), false);
  assert.equal(log.length, count, 'silent, as Godot');
  await flush();
});

test("the picker: a refused select restores the owner and says Godot's line", async () => {
  const s = setup(), { visits, log } = s;
  s.begin('dogs');
  visits.open('resume');
  s.press('dogs-stories');
  s.press('picker-later');
  // In 2D the picker holds the dialog while its entries can be pressed, so only a busy context refuses the open (the pure
  // module's own test uses busy too): force one through the kit's ctx.
  const kit = s.kit(), real = kit.ctx;
  kit.ctx = extra => ({ ...real(extra), busy: true });
  s.press('picker-entry-2');
  kit.ctx = real;
  const snap = s.snap();
  assert.deepEqual([snap.stories.dogs.active, snap.stories.picker.suspended, snap.stories.power.open], [true, [], false], 'the owner is restored, unpaused');
  assert.deepEqual(log.at(-1), ['toast', PT.select_story.refused]);
  assert.equal(s.dialog.modal.open, false, 'Godot open_picker refuses too over the activity, so the street shows');
  await flush();
});

// ---------------------------------------------------------------- held screens, ×, replacement, reset and adoption
test('a music toggle that resolves after Back draws nothing; a load that settles after the recovery offer replaced the picker draws nothing', async () => {
  const s = setup(), { visits, log, host } = s;
  let settle = null;
  host.music.toggle = () => new Promise(resolve => { settle = resolve; });
  visits.open('resume');
  s.begin('dogs');
  visits.open('resume');
  s.press('dogs-music');
  s.press('dogs-back');
  const shows = s.count('show'), count = log.length;
  settle('Music paused.'); await flush();
  assert.deepEqual([s.count('show'), log.length], [shows, count]);
  // The picker's files settle under the recovery offer: no redraw, no line.
  const loads = {};
  host.load = name => (loads[name] = deferred()).promise;
  visits.open('resume');
  s.press('dogs-stories');
  assert.ok(loads['voting_places.json'], 'loading');
  s.dialog.show(RECOVERY);
  const counts = [s.count('show'), log.length];
  loads['voting_places.json'].resolve(VOTING); loads['power_place.json'].resolve(POWER_PLACE); await flush();
  assert.deepEqual([s.count('show'), log.length], counts);
  assert.equal(s.snap().data.voting_places, 'ready', 'the data is kept for the next open');
});

test('× (the close event), a close whose event has not fired yet, and a screen replaced without one: the next open() draws the screen', async () => {
  const s = setup(), { visits, dialog } = s;
  visits.open('meal');
  dialog.close();
  assert.deepEqual([s.snap().meal.open, s.snap().screen], [false, null], '× clears the open flags silently');
  let shows = s.count('show');
  assert.equal(visits.open('meal'), true);
  assert.equal(s.count('show'), shows + 1);
  // The browser fires a dialog's close event after close() returns: an open in between normalizes first.
  dialog.modal.open = false;
  assert.equal(s.snap().meal.open, true, 'the module still says open');
  shows = s.count('show');
  assert.equal(visits.open('meal'), true);
  assert.equal(s.count('show'), shows + 1);
  // The same for an episode and the picker: openEpisode would otherwise return without drawing.
  s.escape();
  visits.open('story');
  dialog.modal.open = false;
  const renders = s.count('render');
  assert.equal(visits.open('story'), true);
  assert.equal(s.count('render'), renders + 1);
  assert.ok(s.log.some(e => e[0] === 'silentClose' && e[1] === 'power'), 'the episode part forgets its screen');
  s.press('power-more');
  dialog.modal.open = false;
  assert.equal(s.snap().stories.picker.open, true);
  assert.equal(visits.open('picker'), true);
  assert.equal(s.snap().screen, 'picker');
  // Replaced in the same dialog with no close event (Field notes over Cook & Share): Before These Streets opens from it, and the
  // meal's stale flag is gone with the replaced screen.
  s.escape();
  visits.open('meal');
  dialog.show(NOTES);
  assert.equal(s.snap().meal.open, true);
  assert.equal(visits.open('before', { from: 'notes' }), true);
  assert.equal(s.snap().meal.open, false);
  s.press('before-back');
  // A press on a screen that no longer holds the dialog does nothing.
  visits.open('meal');
  const prepare = dialog.doc.getElementById('meal-prepare');
  dialog.show(RECOVERY);
  shows = s.count('show');
  prepare.listeners.click[0]({});
  assert.equal(s.count('show'), shows);
  assert.equal(s.snap().meal.steps[0], 0);
  await flush();
});

test('reset() starts the visit over in place and keeps the dialog; sync({ adopted: true }) also closes a held visits screen', async () => {
  const s = setup(), { visits, log, dialog } = s, session = s.kit().session;
  visits.open('meal');
  s.press('meal-prepare');
  s.begin('dogs');
  const version = session.version;
  visits.reset();
  assert.equal(s.kit().session, session, 'the same session object');
  assert.ok(session.version > version, 'its version still rising');
  assert.deepEqual(s.snap().meal, meal.initialMeal());
  assert.deepEqual(s.snap().stories, picker.initialStories());
  assert.deepEqual([dialog.modal.open, s.snap().screen, visits.holds()], [true, null, false], 'the dialog is untouched');
  const shows = s.count('show');
  s.press('meal-prepare');
  assert.equal(s.count('show'), shows, 'the old screen no longer acts');
  assert.equal(visits.open('meal'), false, 'and is another activity in the dialog until it closes (restart closes it)');
  dialog.close();
  // Adoption with a visits screen in the dialog: fresh session, the screen closes to the canvas.
  visits.open('meal');
  s.press('meal-prepare');
  assert.deepEqual(visits.sync({ adopted: true }), { reset: true, closed: true });
  assert.deepEqual(s.lastOf('close'), ['close', undefined]);
  assert.deepEqual([dialog.modal.open, s.snap().meal.steps[0], s.snap().meal.open], [false, 0, false]);
  // Adoption under another screen (Settings: restart, or the recovery offer): fresh session, nothing closed.
  visits.open('meal');
  s.press('meal-prepare');
  dialog.show(SETTINGS);
  const closes = s.count('close');
  assert.deepEqual(visits.sync({ adopted: true }), { reset: true, closed: false });
  assert.deepEqual([s.count('close'), dialog.modal.open, s.snap().meal.steps[0]], [closes, true, 0]);
  // A trip and loads of the old session are gone with it.
  dialog.close();
  visits.open('story');
  s.part().step('power', { type: 'begin' });
  s.press('power-walk');
  assert.equal(s.snap().trip, 'power');
  visits.reset();
  assert.equal(s.snap().trip, null);
  assert.equal(visits.walkEnded(), false);
  await flush();
  assert.deepEqual(s.snap().data, { power_place: 'idle', voting_places: 'idle' }, 'a load from before the reset is dropped');
  assert.equal(log.filter(e => e[0] === 'render').length > 0, true);
});

test('sync(): an active episode ends when the block is no longer open (Godot _process), and its held screen closes silently', () => {
  const s = setup(), { visits, io, log } = s;
  s.begin('dogs');
  visits.open('resume');
  assert.deepEqual(visits.sync(), { reset: false, closed: false }, 'every gate holds');
  io.state = { ...io.state, opened: false };
  const count = log.length;
  assert.deepEqual(visits.sync(), { reset: false, closed: true });
  assert.deepEqual(log.slice(count).map(e => e[0]), ['silentClose', 'close'], 'the episode part closes it silently');
  assert.deepEqual([s.snap().stories.dogs.active, s.snap().stories.dogs.open, s.snap().screen, s.dialog.modal.open], [false, false, null, false]);
  // An active episode with no screen: it ends, nothing closes.
  io.state = { ...io.state, opened: true };
  s.begin('lantern');
  io.state = { ...io.state, opened: false };
  assert.deepEqual(visits.sync(), { reset: false, closed: false });
  assert.equal(s.snap().stories.lantern.active, false);
  // The picker and Before These Streets are not gated by the block.
  io.state = { ...io.state, opened: true };
  visits.open('before', { from: 'notes' });
  io.state = { ...io.state, opened: false };
  assert.deepEqual(visits.sync(), { reset: false, closed: false });
  assert.equal(s.snap().screen, 'before');
});

// ---------------------------------------------------------------- the walk protocol and the trip tick (spec 3.6)
test("the walk protocol through the shell: 'walking' then 'blocked', walkEnded() reopens with Godot's line, walkCancelled() is silent", () => {
  const answers = ['walking', 'walking', 'blocked'], s = setup(), { visits, log, io } = s;
  s.host.walk = (goal, opts) => { log.push(['walk', goal, opts]); return answers.shift(); };
  const dogsWalk = () => { s.part().step('dogs', { type: 'lead', index: 1 }); s.press('dogs-walk'); };
  s.begin('dogs');
  visits.open('resume');
  dogsWalk();
  assert.deepEqual([s.snap().trip, s.dialog.modal.open, s.snap().screen], ['dogs', false, null], 'the screen goes, the player walks');
  assert.deepEqual(s.lastOf('walk'), ['walk', { ...DOG_GOALS[1] }, { name: 'dogs', announce: '', keepCamera: false }]);
  // Arrival: the screen reopens through the episode part, Godot's line in its status line, focus back to the canvas on close.
  io.player = { ...DOG_GOALS[1] };
  assert.equal(visits.walkEnded(), true);
  const arrived = s.lastOf('render');
  assert.equal(arrived[1], 'dogs');
  assert.ok(arrived[2].startsWith(dogs.dogsView(s.snap().stories.dogs, s.kit().ctx()).heading), arrived[2]);
  assert.deepEqual(log.at(-1), ['status', arrived[2]]);
  assert.deepEqual([s.snap().trip, s.snap().screen], [null, 'dogs']);
  assert.equal(visits.walkEnded(), false, 'no trip');
  // A stop is silent.
  io.player = { x: 0, y: 0 };
  dogsWalk();
  const count = log.length;
  assert.equal(visits.walkCancelled(), true);
  assert.deepEqual([log.length, s.snap().trip, s.snap().stories.dogs.traveling], [count, null, false]);
  assert.equal(visits.walkCancelled(), false);
  // A refused route reopens the screen with Godot's blocked line.
  visits.open('resume');
  dogsWalk();
  assert.deepEqual(s.lastOf('render'), ['render', 'dogs', dogs.TEXT.blocked_route.blocked]);
  assert.deepEqual(log.at(-1), ['status', dogs.TEXT.blocked_route.blocked]);
  assert.deepEqual([s.snap().trip, s.snap().screen], [null, 'dogs']);
});

test('tick() raises lantern progress only while the lantern trip travels', () => {
  const s = setup(), { visits, io } = s, session = s.kit().session;
  session.stories = { ...session.stories, lantern: { ...lantern.initialLantern(), active: true, phase: 1, progress: 8, traveling: true, tripGoal: lantern.routePoint(36), lastPlayer: lantern.routePoint(8) } };
  io.player = lantern.routePoint(12);
  assert.equal(visits.tick(16), false, 'no trip');
  assert.equal(s.snap().stories.lantern.progress, 8);
  io.player = lantern.routePoint(8);
  assert.equal(s.kit().startWalk('lantern', lantern.routePoint(36), { name: 'lantern', keepCamera: true }), 'walking');
  io.player = lantern.routePoint(12);
  assert.equal(visits.tick(32), true);
  assert.ok(Math.abs(s.snap().stories.lantern.progress - 12) < 1e-9);
  assert.equal(visits.tick(48), false, 'standing still');
  visits.walkCancelled();
  io.player = lantern.routePoint(20);
  assert.equal(visits.tick(64), false);
  assert.ok(Math.abs(s.snap().stories.lantern.progress - 12) < 1e-9);
});

// ---------------------------------------------------------------- scene(), objectiveInputs() and snapshot()
test('scene(): memoized, the world part spread in, each actor part rebuilt only when its own visit state changes', () => {
  const STATIC = { museum: { x: 1, y: 2 }, park: { ring: [] }, tourMarker: null };
  let parts = 0;
  const s = setup({ world: () => ({ scenePart: () => { parts++; return STATIC; } }) }), { visits, io } = s, session = s.kit().session;
  const a = visits.scene();
  assert.equal(visits.scene(), a, 'nothing changed: the same scene');
  assert.equal(parts, 1);
  assert.deepEqual(Object.keys(a).sort(), ['dishes', 'dogs', 'election', 'lantern', 'museum', 'park', 'player', 'power', 'tourMarker']);
  assert.equal(a.museum, STATIC.museum);
  assert.deepEqual(a.dishes, []);
  assert.deepEqual(a.dogs, dogs.dogsScene(dogs.initialDogs()));
  assert.deepEqual([a.lantern, a.election], [lantern.lanternScene(lantern.initialLantern()), election.electionScene(election.initialElection())]);
  assert.deepEqual(a.power, { ...power.powerScene(power.initialPower()), fixtures: Array.from({ length: 10 }, (_, i) => power.fixtureLit(power.initialPower(), i)) });
  assert.deepEqual(a.player, io.player);
  // The player moves: a new scene, the same part objects.
  io.player = { x: 40, y: -10 };
  const b = visits.scene();
  assert.notEqual(b, a);
  for (const key of ['dishes', 'dogs', 'lantern', 'power', 'election']) assert.equal(b[key], a[key], key);
  assert.deepEqual(b.player, { x: 40, y: -10 });
  // A new state object (any act) with the same block: the same parts.
  io.state = { ...io.state };
  const c = visits.scene();
  assert.notEqual(c, b);
  assert.equal(c.dishes, b.dishes);
  // One episode changes: only its part is new.
  s.begin('lantern');
  const d = visits.scene();
  assert.deepEqual(d.lantern, lantern.lanternScene(session.stories.lantern));
  assert.notEqual(d.lantern, null);
  for (const key of ['dogs', 'power', 'election']) assert.equal(d[key], c[key], key);
  assert.deepEqual(d.dishes, [], 'no dishes while a story is active');
  // Power after dark while its festival is active, with its ten fixtures merged in.
  session.stories = picker.initialStories();
  s.begin('power');
  const p = session.stories.power, e = visits.scene();
  assert.deepEqual(e.power, { ...power.powerScene(p), fixtures: Array.from({ length: 10 }, (_, i) => power.fixtureLit(p, i)) });
  assert.equal(e.power.afterDark, true);
  // A shared dish is on the table once no story is active.
  session.stories = picker.initialStories();
  session.meal = meal.changeMeal({ ...meal.initialMeal(), open: true, steps: [5, 0, 0, 0] }, { type: 'share' }).state;
  s.kit().bump();
  assert.deepEqual(visits.scene().dishes, meal.worldDishes(session.meal, { opened: true, storyActive: false }));
  assert.equal(visits.scene().dishes.length, 1);
  io.state = { ...io.state, opened: false };
  assert.deepEqual(visits.scene().dishes, [], 'nor before the block opens');
});

test('objectiveInputs(): the active episode objective (Godot current_objective prefers it), the tour and the last hint', () => {
  const s = setup(), { visits } = s, session = s.kit().session;
  assert.deepEqual(visits.objectiveInputs(), { episode: null, tour: session.world.tour, lastHinted: '' });
  s.begin('dogs');
  const inputs = visits.objectiveInputs();
  assert.deepEqual(Object.keys(inputs), ['episode', 'tour', 'lastHinted']);
  assert.deepEqual(inputs.episode, picker.activeObjective(session.stories, s.kit().ctx()));
  assert.equal(inputs.episode.id, 'dog_story');
  // The world part owns the tour and the last hint.
  const w = setup({ world: () => ({ objectiveInputs: () => ({ tour: 'TOUR', lastHinted: 'cutesy_dino' }) }) });
  assert.deepEqual(w.visits.objectiveInputs(), { episode: null, tour: 'TOUR', lastHinted: 'cutesy_dino' });
});

test('snapshot(): the visit session as data, the files by status only, never the live objects', async () => {
  const s = setup(), { visits } = s;
  let snap = visits.snapshot();
  assert.deepEqual(Object.keys(snap).sort(), ['before', 'data', 'meal', 'screen', 'stories', 'trip', 'world']);
  assert.deepEqual(snap, {
    screen: null, before: before.initialBefore(), meal: meal.initialMeal(), stories: picker.initialStories(),
    world: { tour: landmarks.initialTour(), guideIdx: -1, lastHinted: '' }, trip: null, data: { power_place: 'idle', voting_places: 'idle' },
  });
  snap.meal.steps[0] = 5; snap.stories.dogs.active = true;
  assert.deepEqual([s.snap().meal.steps[0], s.snap().stories.dogs.active], [0, false], 'a copy');
  visits.open('meal');
  s.escape();
  s.begin('power');
  visits.open('picker');
  assert.deepEqual(s.snap().data, { power_place: 'loading', voting_places: 'loading' });
  await flush();
  snap = s.snap();
  assert.deepEqual([snap.screen, snap.data, snap.stories.power.active], ['picker', { power_place: 'ready', voting_places: 'ready' }, true]);
  assert.deepEqual(structuredClone(snap), snap);
});

// ---------------------------------------------------------------- the neighborhood part
test('the neighborhood part: objects, interact, conversation actions, anchors, hints, the tick, the notes entries, the card and the reset', () => {
  const calls = [], made = [];
  const NOTES_HTML = '<div data-visits-notes><button id="notes-spot">Spot</button><button id="notes-museum">Museum</button><button id="notes-eateries">Eateries</button></div>';
  const RET = { objects: [{ id: 'museum', kind: 'visit', name: 'Museum', x: 1, y: 2 }], interact: true, conversationAction: true, openNotes: true, scenePart: { museum: { x: 1, y: 2 } },
    anchor: { x: 3, y: 4, name: 'Docent' }, objectiveInputs: { tour: 'TOUR', lastHinted: 'x' }, notesHTML: NOTES_HTML, bindNotes: true, snapshot: { tour: 'TOUR', guideIdx: 3, lastHinted: 'x' } };
  const world = kit => { made.push(kit); return new Proxy({}, { get: (_, name) => (typeof name === 'string' ? (...args) => { calls.push([name, ...args]); return RET[name]; } : undefined) }); };
  const s = setup({ world }), { visits, dialog } = s;
  const W = { camera: { overviewMode: false } }, object = RET.objects[0];
  const own = () => calls.filter(c => !['objectiveInputs', 'scenePart', 'silentClose', 'snapshot'].includes(c[0]));
  assert.equal(visits.objects(W), RET.objects);
  assert.equal(visits.interact(object, 'tap'), true);
  assert.equal(visits.conversationAction('museum', 'bea'), true);
  assert.equal(visits.anchor('museum_docent'), RET.anchor);
  visits.hinted('cutesy_dino');
  visits.tick(16, W);
  visits.tick(32);
  assert.equal(visits.scene().museum, RET.scenePart.museum);
  assert.deepEqual(visits.objectiveInputs(), { episode: null, tour: 'TOUR', lastHinted: 'x' });
  assert.deepEqual(visits.snapshot().world, RET.snapshot, "the part's own snapshot of the tour, the guide index and the last hint");
  assert.deepEqual(own(), [['objects', W], ['interact', object, 'tap'], ['conversationAction', 'museum', 'bea'], ['anchor', 'museum_docent'], ['hinted', 'cutesy_dino'], ['tick', 16, W], ['tick', 32, undefined]]);
  // Field notes: the part draws the three buttons; the shell binds them through open(), so stale flags close before the part opens.
  calls.length = 0;
  assert.equal(visits.entryHTML('notes'), NOTES_HTML);
  assert.equal(visits.bindEntry('notes'), false, 'not on screen yet');
  dialog.show(NOTES + NOTES_HTML);
  assert.equal(visits.bindEntry('notes'), true);
  assert.equal(visits.bindEntry('notes'), false, 'each button is bound once');
  const stale = s.kit().session;
  stale.meal = { ...stale.meal, open: true };
  s.press('notes-museum');
  assert.equal(s.snap().meal.open, false, 'normalized first');
  assert.equal(visits.open('notes-eateries', { from: 'notes' }), true);
  assert.deepEqual(own(), [['notesHTML'], ['openNotes', 'notes-museum'], ['openNotes', 'notes-eateries']], 'no part bindNotes: the shell binds the buttons');
  // The visit card is the part's screen: Escape runs its cancel; × and a replacement close it silently.
  const kit = made[0];
  calls.length = 0;
  kit.show('card', K.frameHTML({ kind: 'card', title: 'Card' }));
  assert.equal(s.escape(), true);
  assert.deepEqual(calls.map(c => c[0]).slice(0, 1), ['cancel']);
  assert.equal(dialog.modal.open, false, 'a card the part did not close is closed for it');
  calls.length = 0;
  kit.show('card', K.frameHTML({ kind: 'card', title: 'Card' }));
  dialog.close();
  assert.ok(calls.some(c => c[0] === 'silentClose'), '×');
  calls.length = 0;
  kit.show('card', K.frameHTML({ kind: 'card', title: 'Card' }));
  dialog.show(RECOVERY);
  visits.open('meal');
  assert.ok(calls.some(c => c[0] === 'silentClose'), 'replaced, then the next open');
  calls.length = 0;
  visits.reset();
  assert.ok(calls.some(c => c[0] === 'reset'));
});

test('a part that lacks members falls back to the inert ones', () => {
  const s = setup({ episodes: () => ({ render() {} }), world: () => ({ objects: () => ['x'] }) }), { visits } = s, kit = s.kit();
  assert.deepEqual(visits.objects({}), ['x']);
  assert.equal(visits.interact({ id: 'park', kind: 'visit' }, 'tap'), false);
  assert.deepEqual(visits.objectiveInputs(), { episode: null, tour: kit.session.world.tour, lastHinted: '' });
  assert.equal(visits.entryHTML('notes'), '');
  for (const type of ['open', 'begin']) kit.session.stories = picker.changeEpisode(kit.session.stories, 'dogs', { type }, kit.ctx()).stories;
  kit.bump();
  assert.deepEqual(visits.scene().dogs, dogs.dogsScene(kit.session.stories.dogs));
  // This part's render draws nothing: the resumed episode closes again in the module.
  assert.equal(visits.open('resume'), false);
  assert.equal(kit.session.stories.dogs.open, false);
});

test("an episode opens only over the street, as Godot's open_story: a startup or chapter card, another activity or walking refuses it", () => {
  const s = setup(), { visits, io, dialog, log } = s;
  const refuse = power.TEXT.open_story.refuse;
  for (const cards of [{ startup: true, story: true }, { startup: false, story: true }]) {
    io.cards = cards;
    dialog.show(STARTUP);
    assert.equal(visits.open('story'), false, JSON.stringify(cards));
    assert.deepEqual(log.at(-1), ['toast', refuse]);
  }
  io.cards = { startup: false, story: false };
  dialog.show(SETTINGS);
  assert.equal(visits.open('story'), false, 'another activity');
  assert.deepEqual(log.at(-1), ['toast', refuse]);
  dialog.close();
  s.begin('dogs');
  dialog.show(STARTUP);
  io.cards = { startup: true, story: true };
  assert.equal(visits.open('resume'), false);
  assert.deepEqual(log.at(-1), ['toast', dogs.TEXT.open_story.refuse]);
  io.cards = { startup: false, story: false };
  dialog.close();
  io.walking = true;
  assert.equal(visits.open('resume'), false, 'walking');
  io.walking = false;
  assert.equal(visits.open('resume'), true);
});

// ---------------------------------------------------------------- with the real parts (WP2b, WP2c), when they are in the tree
const PARTS = ['browser-next/visits-episodes.js', 'browser-next/visits-world.js'];
test('with the real episode screens and neighborhood visits: the shell opens, routes, walks, closes and resets them by their contracts', { skip: !PARTS.every(path => existsSync(new URL(`../${path}`, import.meta.url))) && 'the parts are not in the tree' }, async () => {
  const [{ createEpisodeScreens }, { createWorldVisits }] = await Promise.all(PARTS.map(path => import(`../${path}`)));
  const s = setup({ episodes: createEpisodeScreens, world: createWorldVisits }), { visits, log, io, dialog } = s;
  // Story: the shell opens Power, the episode part draws it, focus returns to the entry; the shell fetches the place file.
  assert.equal(visits.open('story'), true);
  assert.deepEqual([s.snap().screen, s.lastOf('returnTo')], ['power', ['returnTo', 'story-entry']]);
  assert.deepEqual(log.filter(e => e[0] === 'load').map(e => e[1]), ['power_place.json']);
  await flush();
  // More stories -> the shell's picker -> Two Dogs Home; Back returns focus to the control that opened the visit.
  s.press('power-more');
  assert.equal(s.snap().screen, 'picker');
  await flush();
  s.press('picker-later');
  s.press('picker-entry-3');
  assert.equal(s.snap().screen, 'dogs');
  s.press('dogs-back');
  assert.deepEqual(s.lastOf('close'), ['close', 'story-entry']);
  // Resume through the walk control; Escape is the episode's Back.
  s.begin('dogs');
  visits.open('resume');
  assert.equal(s.escape(), true);
  assert.deepEqual(s.lastOf('close'), ['close', 'story-resume']);
  // A walk: the episode part closes the screen and walks; the arrival reopens it through kit.routes.renderEpisode (its render),
  // its line in the status line, and Back then returns to the canvas.
  visits.open('resume');
  s.press('dogs-lead1');
  s.press('dogs-walk');
  assert.deepEqual([s.snap().trip, dialog.modal.open], ['dogs', false]);
  io.player = { ...DOG_GOALS[1] };
  assert.equal(visits.walkEnded(), true);
  assert.equal(s.snap().screen, 'dogs');
  assert.equal(log.at(-1)[0], 'status');
  s.press('dogs-back');
  assert.deepEqual(s.lastOf('close'), ['close', undefined]);
  // The block closes under the dogs screen: the episode resets, the part forgets its screen, the shell closes the dialog.
  visits.open('resume');
  io.state = { ...io.state, opened: false };
  assert.deepEqual(visits.sync(), { reset: false, closed: true });
  assert.deepEqual([dialog.modal.open, s.snap().screen, s.snap().stories.dogs.active], [false, null, false]);
  io.state = { ...io.state, opened: true };
  // Field notes: the neighborhood part's three buttons, bound by the shell; the museum's visit card; Escape is its Back.
  dialog.show(NOTES + visits.entryHTML('notes'));
  assert.equal(visits.bindEntry('notes'), true);
  s.press('notes-museum');
  assert.equal(s.snap().screen, 'card');
  assert.deepEqual(s.lastOf('returnTo'), ['returnTo', 'journal-button']);
  assert.equal(s.escape(), true);
  assert.deepEqual([s.lastOf('close'), s.kit().session.world.card], [['close', 'journal-button'], null]);
  // × on a card: the part forgets it.
  visits.interact({ id: 'museum', kind: 'visit' }, 'tap');
  assert.equal(s.snap().screen, 'card');
  dialog.close();
  assert.deepEqual([s.kit().session.world.card, s.snap().screen], [null, null]);
  // The scene: the world part's parts (the same objects while nothing they show changes) with the shell's actor parts.
  const a = visits.scene();
  assert.deepEqual(Object.keys(a).sort(), ['dishes', 'dogs', 'eateries', 'election', 'keepsakes', 'lantern', 'larkin', 'museum', 'park', 'player', 'power', 'soWhat', 'surprises', 'tourMarker']);
  io.player = { x: 12, y: -40 };
  const b = visits.scene();
  for (const key of Object.keys(a).filter(key => key !== 'player')) assert.equal(b[key], a[key], key);
  // The snapshot's world is the part's; an adoption with an episode on screen closes it and starts everything over.
  assert.deepEqual(Object.keys(s.snap().world).sort(), ['guideIdx', 'lastHinted', 'tour']);
  visits.open('story');
  assert.deepEqual(visits.sync({ adopted: true }), { reset: true, closed: true });
  assert.deepEqual([s.snap().stories, s.snap().screen, dialog.modal.open], [picker.initialStories(), null, false]);
  await flush();
});

// ---------------------------------------------------------------- the generated HTML, names, text and rapid marks
test('every screen and entry the shell draws: no inline handler or script, data: images only, https links with no referrer, label in name', async () => {
  const s = setup(), { visits, io, dialog, log } = s;
  // Before These Streets in every view, observation and the Sources, from the startup card and from Field notes.
  io.cards = { startup: true, story: true };
  dialog.show(STARTUP);
  visits.open('before', { from: 'startup' });
  for (const id of ['before-gust', 'before-gust', 'before-time', 'before-shapes', 'before-sources', 'before-sources', 'before-previous']) s.press(id);
  s.press('before-back');
  io.cards = { startup: false, story: false };
  dialog.show(NOTES);
  visits.open('before', { from: 'notes' });
  s.press('before-back');
  // Cook & Share through two cooks.
  visits.open('meal');
  for (let i = 0; i < 5; i++) s.press('meal-prepare');
  s.press('meal-serving-1'); s.press('meal-share'); s.press('meal-share');
  for (let i = 0; i < 5; i++) s.press('meal-prepare');
  s.press('meal-share'); s.press('meal-prepare');
  s.press('meal-explore');
  // The picker on both pages, with the invitation.
  const session = s.kit().session;
  session.stories = { ...session.stories, picker: { ...session.stories.picker, lanternInvited: true } };
  visits.open('picker');
  await flush();
  s.press('picker-later'); s.press('picker-earlier');
  const screens = log.filter(e => e[0] === 'show').map(e => e[1]).filter(html => /data-visits="(before|meal|picker)"/.test(html));
  assert.ok(screens.length >= 28, `${screens.length} screens`);
  const entries = ['before', 'revisit', 'story', 'meal'].map(kind => visits.entryHTML(kind));
  s.begin('dogs');
  entries.push(visits.entryHTML('resume'));
  assert.ok(entries.every(Boolean), 'every entry draws');
  const names = {
    'before-entry': MAIN.build_story_card.beforeName, 'story-entry': power.entryTooltip(), 'meal-previous': null, 'meal-next': null, 'picker-follow': PT.setup.followName,
  };
  let images = 0, links = 0, buttons = 0;
  for (const html of [...screens, ...entries]) {
    for (const tag of tagsOf(html)) {
      assert.notEqual(tag.name, 'script', 'no inline script');
      for (const attr of Object.keys(tag.attrs)) assert.doesNotMatch(attr, /^on/i, `no inline handler (${attr} on <${tag.name}>)`);
      if ('src' in tag.attrs) { assert.equal(tag.name, 'img'); assert.match(tag.attrs.src, /^data:image\//); images++; }
      if ('href' in tag.attrs) { assert.match(tag.attrs.href, /^https:\/\/[^\s"<>]+$/); assert.deepEqual([tag.attrs.target, tag.attrs.rel], ['_blank', 'noreferrer']); links++; }
    }
    assert.doesNotMatch(html, /\son[a-z]+=/, 'the spec grep on the generated HTML');
    for (const b of buttonsOf(html)) { assertLabelInName(b, names[b.id]); buttons++; }
  }
  assert.ok(images >= 24 && links >= 3 && buttons >= 150, `${images} images, ${links} links, ${buttons} buttons`);
  // Godot's own names where they differ from the label: Previous/Next name the current cook, the picker entries add the visit note.
  const mealScreen = screens.find(html => html.includes('data-visits="meal"') && !/id="meal-previous"[^>]*disabled/.test(html));
  const prev = button(mealScreen, 'meal-previous');
  assert.ok(prev.description.startsWith(MT.refresh.previousName));
  const pickerScreen = screens.findLast(html => html.includes('data-visits="picker"'));
  for (const b of buttonsOf(pickerScreen).filter(x => x.id.startsWith('picker-entry'))) assert.ok(b.name.endsWith(PT.refresh.entrySuffix), b.name);
});

test('the shell hand-types no Godot text: string literals it shares with Godot are structural or protocol identifiers', () => {
  const STRUCTURAL = ['', ' ', '\n', ': ', '. '];
  const shared = [...new Set(jsStrings(UI + '\n' + KIT))].filter(text => GD_LITERALS.has(text));
  assert.deepEqual(shared.filter(text => !STRUCTURAL.includes(text) && !/^[a-z][a-z_]*$/.test(text)), [], 'a Godot line or label comes from visits/text.js or is declared fork text');
  // Premise: the scan reads this file's strings.
  assert.ok(jsStrings(UI).includes('meal-previous'));
});

test("the rapid marks: Cook & Share's Previous/Next cook and the picker's Earlier/Later, as literal views the rapid-set test reads, rendered by the kit", async () => {
  // tests/next-press-settle.test.mjs "the rapid set" reads top-level fork files with whole-line comments removed.
  const code = UI.split(/\r?\n/).filter(line => !/^\s*\/\//.test(line)).join('\n');
  const views = [...code.matchAll(/\{ id: '([^']+)'[^{}\n]*\brapid: true\b/g)].map(m => m[1]);
  assert.deepEqual(views.sort(), ['meal-next', 'meal-previous', 'picker-earlier', 'picker-later']);
  assert.equal((code.match(/data-rapid/g) || []).length, 0, 'the kit renders data-rapid; this file never writes it');
  assert.deepEqual([...code.matchAll(/\$\{(\w+)\.rapid \? ' data-rapid' : ''\}/g)], [], 'not a conduit');
  assert.equal(code.match(/\brapid: (?!true\b|false\b)[^,}]+/g), null, 'never a computed mark');
  // On screen: exactly those four controls carry the mark.
  const s = setup(), { visits, log } = s;
  visits.open('meal');
  visits.open('picker');
  await flush();
  const marked = log.filter(e => e[0] === 'show').flatMap(e => buttonsOf(e[1]).filter(b => 'data-rapid' in b.attrs).map(b => b.id));
  assert.deepEqual([...new Set(marked)].sort(), ['meal-next', 'meal-previous', 'picker-earlier', 'picker-later']);
});
