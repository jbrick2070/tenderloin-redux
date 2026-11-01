// The Phase 3 wiring of the side stories into browser-next/game.js (spec WP3): the visits host, the points where the visit starts
// over, the map layers, the conversation actions and the fork text. game.js reaches the DOM when it loads, so these read its text,
// as tests/next-characters.test.mjs does. Its map layers, its action ids and its one-control-per-id rule are its own code evaluated
// here over stand-ins, and the tour marker's tap runs on a real World over a stub canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { visitsHost, filmDoneEnvelope } from './next-fixtures.mjs';
import { initialState } from '../browser-next/core.js';
import { parseGodotSave, canonicalStringify } from '../browser-next/godot-save.js';
import { World, NEIGHBORS, PLACES, makeWays } from '../browser-next/world.js';
import { nextObjective } from '../browser-next/story.js';
import { conversationActions, freshTalk } from '../browser-next/characters.js';
import { VISITS_FORK_TEXT } from '../browser-next/visits-kit.js';
import { GODOT_TEXT, WEB_OVERRIDES, web } from '../browser-next/visits/text.js';
import { conversationLabel, progressLabel, SURPRISE_IDS } from '../browser-next/visits/surprises.js';
import { entryTooltip } from '../browser-next/visits/power.js';
import * as sprites from '../browser-next/sprites.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
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
  assert.match(block, /chime: \(id, reason\) => \{ try \{ rewards\.play\(rewardFor\(\[visitCue\(id, reason\)\], \{ enabled: settings\.rewardSounds, unlocked: rewards\.unlocked \}\)\); \} catch/, 'a chime is the visit cue under the Sounds setting, and can never throw');
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
