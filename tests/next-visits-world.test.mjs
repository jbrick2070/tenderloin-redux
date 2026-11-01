// browser-next/visits-world.js, the neighborhood world of the side stories (Phase 3 wiring spec WP2c, 1.2 features 8 and 9):
// the surprise beacons, the landmark tour and its gold marker, the museum's Time-Portal, Boeddeker Park, "So What" and the six
// fictional eateries, driven through a real visits kit on the recording stand-in host of next-fixtures.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gdSource, gdFunc, gdStrings, jsStrings } from './gd-literal.mjs';
import { visitsHost } from './next-fixtures.mjs';
import * as K from '../browser-next/visits-kit.js';
import { createWorldVisits } from '../browser-next/visits-world.js';
import { createVisits } from '../browser-next/visits-ui.js';
import { initialState } from '../browser-next/core.js';
import { nextObjective, LOAN_IDS, NEIGHBOR_IDS } from '../browser-next/story.js';
import { sceneReceipt } from '../browser-next/ending/mural.js';
import { GODOT_TEXT, MAIN, web } from '../browser-next/visits/text.js';
import { gdf } from '../browser-next/visits/format.js';
import * as S from '../browser-next/visits/surprises.js';
import * as L from '../browser-next/visits/landmarks.js';
import * as P from '../browser-next/visits/positions.js';

const SOURCE = readFileSync(new URL('../browser-next/visits-world.js', import.meta.url), 'utf8');
const GD_FILES = readdirSync(new URL('../godot/', import.meta.url)).filter(name => name.endsWith('.gd'));
const GD_LITERALS = new Set(GD_FILES.flatMap(name => gdStrings(gdSource(name))));
const T = GODOT_TEXT['main.gd'], D = T.build_street_life_decor, I = T.inspect_neighborhood_surprise;
const say = text => web('main.gd', text);
const list = value => (Array.isArray(value) ? value : []);
const lines = text => String(text).split('\n');
const xy = p => ({ x: p.x, y: p.y });
const ALL = [...S.SURPRISE_IDS].sort();
const EATERY_LABEL = i => gdf(say(D.eatery), [L.EATERIES[i].name]);
const MENU_LABEL = i => gdf(say(T.build_eatery_counters.menu), [L.EATERY_MENU_ITEMS[L.EATERIES[i].id][0]]);
const TOURED = () => ({ ...L.initialTour(), eras: [...L.TOUR_MUSEUM_ERAS], park: true, soWhat: true, orders: Object.fromEntries(L.EATERIES.map(e => [e.id, 1])) });
const RECOVERY = '<section data-recovery><h2 id="modal-title">Some progress went back.</h2><button id="recover-save">Keep</button></section>';
const boom = () => { throw Error('boom'); };

// A fork state on Godot's chapter 6 (after Black Hawk), where the objective is 'explore', with the finds given.
const MURAL = { sun: { col: 0, row: 0 }, wave: { col: 1, row: 0 }, rise: { col: 2, row: 0 } }, ORDER = ['stories', 'beats', 'pause', 'art'];
const RESULT = id => ({ id, value: { stories: 'memory', beats: 85, art: { tiles: [0, 1, 2, 2, 1, 0], palette: 'warm' }, pause: 'arc' }[id] });
function exploring(surprises = []) {
  const s = initialState();
  return {
    ...s, visited: [...NEIGHBOR_IDS].sort(), layout: 'table', mural: structuredClone(MURAL), soundcheck: true, opened: true,
    epilogue: { packing: true, returned: [...LOAN_IDS], photo: { status: 'skipped' } }, programme: { order: [...ORDER], published: [...ORDER] },
    hosting: { order: [...ORDER], results: ORDER.map(RESULT), draft: s.hosting.draft },
    civic: { ...s.civic, phase: 'done', result: { topic: 'repairs', format: 'circle', notes: 'themes' } }, film: { ...s.film, phase: 'done' },
    history: true, blackhawk: true, surprises: [...surprises].sort(),
  };
}
// Before Black Hawk the objective is never 'explore'.
const touring = (surprises = []) => ({ ...exploring(surprises), blackhawk: false });

// Reading a visit card: the eyebrow, the heading, the reader's paragraphs and the tray's buttons.
const decode = text => text.replace(/<br>/g, '\n').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function cardOf(html) {
  const reader = /<div id="visits-reader"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m => ({ id: /\bid="([^"]+)"/.exec(m[1])?.[1], label: decode(m[2]), primary: /primary-button/.test(m[1]) }));
  return {
    kind: /<section class="visits" data-visits="([^"]*)">/.exec(html)?.[1],
    credit: decode(/<p class="eyebrow visits-credit">([^<]*)<\/p>/.exec(html)?.[1] ?? ''),
    title: decode(/<h2 id="modal-title"[^>]*>([^<]*)<\/h2>/.exec(html)?.[1] ?? ''),
    reader: [...reader.matchAll(/<p>([^<]*)<\/p>/g)].map(m => decode(m[1])),
    buttons, ids: buttons.map(b => b.id), label: id => buttons.find(b => b.id === id)?.label,
  };
}

// The stand-in host over a real kit: the objective is story.js nextObjective with the visit inputs, as game.js storyWorld()
// gives it; sparks read the post-act finds. instrument logs every read of the host's getters as ['read', name]. shell: the part
// inside the real visits shell (visits-ui.js createVisits) on the shell's own kit, as game.js builds them; the shell binds Field
// notes' five buttons (visits.bindEntry('notes')).
function setup({ over = {}, state = exploring(), instrument = false, routes, shell = false } = {}) {
  const { host, log, io, dialog } = visitsHost(undefined, over);
  io.state = state;
  if (!Object.hasOwn(over, 'sparks')) host.sparks = () => 5 + list(io.state?.surprises).length;
  let kit = null, world = null, visits = null;
  if (shell) visits = createVisits(host, { createWorldVisits: k => (world = createWorldVisits(kit = k)) });
  else { kit = K.createKit(host, K.freshSession(), routes ?? { openResume: () => { log.push(['openResume']); return true; } }); world = createWorldVisits(kit); }
  const session = kit.session;
  if (!Object.hasOwn(over, 'objective')) host.objective = () => nextObjective(io.state, { player: io.player, ...world.objectiveInputs(), openNeighborId: io.neighbor });
  if (instrument) for (const name of ['sparks', 'saveReason', 'openNeighborId', 'objective']) { const read = host[name]; host[name] = (...args) => { log.push(['read', name]); return read(...args); }; }
  const view = (overviewMode = false) => ({ camera: { overviewMode }, scale: 1, getState: () => io.state });
  const object = id => world.objects(view()).find(o => o.id === id) ?? assert.fail(`no ${id} object`);
  return {
    host, log, io, dialog, session, kit, world, visits, view, object,
    card: () => cardOf(io.html), status: () => log.filter(e => e[0] === 'status').at(-1)?.[1],
    chimes: () => log.filter(e => e[0] === 'chime').map(e => e.slice(1)), shows: () => log.filter(e => e[0] === 'show').length,
    tour: () => session.world.tour,
  };
}

// ---------------------------------------------------------------- the module and its contract
test('the module imports in Node without a DOM and createWorldVisits returns the spec 3.10 contract', async () => {
  assert.equal(typeof globalThis.document, 'undefined');
  const mod = await import('../browser-next/visits-world.js');
  assert.equal(typeof mod.createWorldVisits, 'function');
  const { world } = setup();
  const CONTRACT = ['objects', 'interact', 'conversationAction', 'openNotes', 'cancel', 'silentClose', 'scenePart', 'anchor', 'parkTrees', 'objectiveInputs', 'hinted', 'tick', 'reset', 'snapshot', 'notesHTML'];
  for (const name of CONTRACT) assert.equal(typeof world[name], 'function', name);
  // Field notes' five buttons are the shell's to bind (visits-ui.js bindEntry('notes')): the part draws them and opens their cards.
  assert.deepEqual(Object.keys(world).sort(), [...CONTRACT].sort(), 'the contract and nothing else');
  assert.doesNotMatch(SOURCE, /\bbindNotes\b/, 'no second binding of Field notes');
  const code = SOURCE.replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g, "''");
  assert.doesNotMatch(code, /\b(document|window|localStorage|sessionStorage|setTimeout|requestAnimationFrame|fetch|Math\.random|Date\.now|performance)\b/);
  assert.doesNotMatch(SOURCE.replace(/^\s*\/\/.*$/gm, ''), /querySelector|innerHTML|fetch\(|localStorage|\son[a-z]+=/, 'the spec grep for UI files');
  assert.ok(!SOURCE.includes('\r'), 'visits-world.js is LF');
  assert.ok(!/data-rapid|\brapid:/.test(SOURCE), 'no control here is rapid (Godot marks none of them)');
  // The state chapter 6 of these tests is on the explore objective; touring() is one step before it.
  assert.equal(nextObjective(exploring(), {}).id, 'explore');
  assert.notEqual(nextObjective(touring(), {}).id, 'explore');
});

// ---------------------------------------------------------------- objects (spec 3.8)
test('objects: the beacons, landmarks and eateries as visit objects with Godot names; no beacons in an overview', () => {
  const s = setup(), near = s.world.objects(s.view(false)), far = s.world.objects(s.view(true));
  for (const o of near) {
    assert.equal(o.kind, 'visit', o.id);
    assert.ok(typeof o.name === 'string' && o.name.length > 0, o.id);
    assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), o.id);
  }
  const named = objects => Object.fromEntries(objects.map(o => [o.id, { name: o.name, x: o.x, y: o.y }]));
  const expected = {
    ...Object.fromEntries(S.SURPRISE_IDS.map(id => [`surprise:${id}`, { name: S.SURPRISES[id].title, ...xy(P.SURPRISE_SITES[id]) }])),
    museum: { name: say(D.museum), ...xy(P.MUSEUM) }, park: { name: say(T.build_boeddeker_park.label), ...xy(P.PARK_ENTRANCE) },
    so_what: { name: say(D.soWhatAwning), ...xy(P.SO_WHAT_AWNING) }, so_what_floor: { name: say(D.soWhatFloor), ...xy(P.SO_WHAT_LEAVENWORTH) },
    ...Object.fromEntries(L.EATERIES.map((rec, i) => [`eatery:${i}`, { name: EATERY_LABEL(i), ...xy(P.EATERY_AWNINGS[i]) }])),
  };
  assert.deepEqual(named(near), expected, 'no counter is open and no tour stop is the objective yet');
  // Godot taps a beacon only out of the overviews (main.gd:14484); the landmarks stay tappable.
  assert.deepEqual(named(far), Object.fromEntries(Object.entries(expected).filter(([id]) => !id.startsWith('surprise:'))));
  assert.deepEqual(named(s.world.objects()), expected, 'without a World, as zoomed in');
  // A counter is a target once its guide opened it (the counter's Today chip is drawn then).
  s.world.interact(s.object('eatery:2'), 'tap');
  assert.deepEqual(named(s.world.objects(s.view()))['counter:2'], { name: EATERY_LABEL(2), ...xy(P.EATERY_COUNTERS[2]) });
  assert.equal(s.world.objects(s.view()).filter(o => o.id.startsWith('counter:')).length, 1);
  // With all ten found, the explore objective's tour stop: the gold marker (decision D9) first, so it wins a tie with the
  // landmark it stands on; an eatery stop's counter is a target before it opens (main.gd:14509-14519).
  const t = setup({ state: exploring(ALL) }), goal = t.host.objective();
  assert.equal(goal.tourId, 'museum:0');
  let objects = t.world.objects(t.view(true));
  assert.deepEqual({ ...objects[0] }, { id: 'tour-marker', kind: 'visit', name: L.TOUR_MUSEUM_TITLES[0], ...xy(P.MUSEUM) });
  t.session.world.tour = { ...TOURED(), orders: Object.fromEntries(L.EATERIES.slice(0, 4).map(e => [e.id, 1])) }; t.kit.bump();
  assert.equal(t.host.objective().tourId, 'eatery:4');
  objects = t.world.objects(t.view());
  assert.deepEqual([objects[0].id, objects[0].x, objects[0].y], ['tour-marker', P.EATERY_COUNTERS[4].x, P.EATERY_COUNTERS[4].y]);
  assert.deepEqual(objects.filter(o => o.id.startsWith('counter:')).map(o => o.id), ['counter:4']);
  t.session.world.tour = TOURED(); t.kit.bump();
  assert.ok(!t.world.objects(t.view()).some(o => o.id === 'tour-marker' || o.id.startsWith('counter:')), 'the tour is done: no marker');
  // Surprises left, or another objective: no marker.
  for (const state of [exploring(ALL.slice(1)), touring(ALL)]) assert.ok(!setup({ state }).world.objects().some(o => o.id === 'tour-marker'));
});

// ---------------------------------------------------------------- the surprise inspect (1.2 feature 8)
test('a first find: host.act first, then the camera, the card and the bubble, every text built from the post-act state', () => {
  const s = setup({ instrument: true }), id = 'jeffrey_record', rec = S.SURPRISES[id];
  assert.equal(s.world.interact(s.object(`surprise:${id}`), 'tap'), true);
  const order = s.log.map(e => (e[0] === 'read' ? `read:${e[1]}` : e[0])), at = name => order.indexOf(name);
  assert.deepEqual(s.log.find(e => e[0] === 'act'), ['act', { type: 'surprise', id }]);
  assert.ok(order.slice(0, at('act')).every(name => !name.startsWith('read:')), `nothing is read before the find: ${order.join(' ')}`);
  for (const read of ['read:sparks', 'read:saveReason', 'read:openNeighborId', 'read:objective']) assert.ok(at(read) > at('act'), read);
  // The camera, then the card with its status line, then the bubble: game.js speak() leaves the line to the open card.
  assert.ok(at('act') < at('lookAt') && at('lookAt') < at('show') && at('show') < at('status') && at('status') < at('speak'), order.join(' '));
  assert.deepEqual(s.io.state.surprises, [id], 'the stand-in act saved it');
  assert.deepEqual(s.chimes(), [], "the find's chime is act's own (progressCues), never host.chime");
  assert.deepEqual(s.log.find(e => e[0] === 'lookAt'), ['lookAt', xy(P.SURPRISE_SITES[id])]);
  assert.deepEqual(s.log.find(e => e[0] === 'speak'), ['speak', `surprise:${id}`, rec.speech, rec.speaker]);
  // The card: sparks and counts after the find (5 + one find), Godot's burst sub, info lines and announcement.
  const r = S.inspect([], id, { sparks: 6 }), card = s.card();
  assert.ok(r.burstSub.includes('Sparks: 6') && r.burstSub.startsWith(gdf(I.tag, [1, 10])), r.burstSub);
  assert.deepEqual([card.kind, card.credit, card.title], ['card', rec.badge, gdf(I.found, [rec.title])]);
  assert.deepEqual(card.reader, [r.burstSub, ...lines(r.info)]);
  assert.deepEqual(card.ids, ['card-spot', 'card-back']);
  assert.deepEqual([card.label('card-spot'), card.label('card-back')], [S.conversationLabel([id]), K.VISITS_FORK_TEXT.back]);
  assert.equal(s.status(), r.announce, "the status line is Godot's announcement");
  assert.deepEqual([s.session.screen, s.kit.holds('card'), s.session.world.guideIdx], ['card', true, S.SURPRISE_IDS.indexOf(id)]);
  assert.equal(s.session.world.card.kind, 'surprise');
  // E/Enter near it and a What's Next arrival inspect the same way.
  for (const how of ['talk', 'walk']) {
    const t = setup();
    assert.equal(t.world.interact(t.object('surprise:cutesy_dino'), how), true);
    assert.equal(t.card().title, gdf(I.found, [S.SURPRISES.cutesy_dino.title]));
  }
});

// A map tap opens the card from the street: were the bubble raised first, game.js speak() would say the speaker's words in the
// page's live region while the card's status line said them again in the same task. So every inspect draws its card first.
test('every inspect draws its card before it raises the bubble or the chime: the speaker speaks into an open card', () => {
  const s = setup({ state: exploring(ALL.slice(1)) }), at = [];
  const record = name => (...args) => at.push([name, args[0], s.dialog.modal.open && s.kit.holds('card')]);
  Object.assign(s.host, { speak: record('speak'), chime: record('chime') });
  s.world.interact(s.object('surprise:jeffrey_record'), 'tap');
  s.world.interact(s.object('museum'), 'tap');
  s.dialog.close();
  s.world.interact(s.object('eatery:2'), 'tap');
  s.dialog.close();
  s.world.interact(s.object('counter:2'), 'tap');
  s.dialog.close();
  s.world.interact(s.object('park'), 'tap');
  s.world.interact(s.object('so_what_floor'), 'tap');
  s.world.conversationAction('surprise', 'bea');
  s.dialog.close();
  s.world.openNotes('museum');
  const eatery = `eatery:${L.EATERIES[2].id}`, last = `surprise:${ALL[0]}`;
  assert.deepEqual(at.map(e => e.slice(0, 2)), [['speak', 'surprise:jeffrey_record'], ['speak', 'museum_docent'], ['chime', 'museum_portal'], ['speak', eatery], ['speak', eatery], ['chime', 'eatery_order'],
    ['chime', 'boeddeker_park'], ['chime', 'so_what_egg'], ['speak', last], ['speak', 'museum_docent'], ['chime', 'museum_portal']], 'the bubble, then the chime, as Godot raises them');
  for (const [name, id, open] of at) assert.equal(open, true, `${name} ${id}: the card holds the dialog`);
});

test('a throwing chime, lookAt or speak never undoes a change or blocks its card', () => {
  const s = setup({ over: { lookAt: boom, speak: boom, chime: boom, toast: boom } });
  assert.equal(s.world.interact(s.object('surprise:cutesy_dino'), 'tap'), true);
  assert.deepEqual(s.io.state.surprises, ['cutesy_dino']);
  assert.ok(s.kit.holds('card'));
  assert.equal(s.card().title, gdf(I.found, [S.SURPRISES.cutesy_dino.title]));
  for (const [id, done] of [['museum', t => t.eras.includes('present')], ['park', t => t.park], ['so_what', t => t.soWhat]]) {
    assert.equal(s.world.interact(s.object(id), 'tap'), true, id);
    assert.ok(done(s.tour()), id);
    assert.ok(s.kit.holds('card'), id);
  }
  s.world.interact(s.object('eatery:0'), 'tap');
  s.dialog.click('card-order');
  assert.equal(s.tour().orders.bowl_basil_pho, 1);
  assert.equal(s.card().title, L.orderEatery(L.cycleEatery(L.initialTour(), 0).tour, 0).burst.heading);
  // Getters that throw read as nothing, and an act that throws after it saved still shows its find.
  const g = setup({ over: { sparks: boom, saveReason: boom, openNeighborId: boom, objective: boom } });
  assert.equal(g.world.interact(g.object('surprise:jeffrey_record'), 'tap'), true);
  assert.deepEqual(g.card().reader[0], S.inspect([], 'jeffrey_record', { sparks: 0 }).burstSub);
  const a = setup();
  a.host.act = action => { a.io.state = { ...a.io.state, surprises: [action.id] }; throw Error('after the write'); };
  assert.equal(a.world.interact(a.object('surprise:viking_dirt_biker'), 'tap'), true);
  assert.equal(a.card().title, gdf(I.found, [S.SURPRISES.viking_dirt_biker.title]));
  assert.ok(a.card().reader[0].includes('Sparks: 6'));
});

test('a repeat inspection is not new: no heading, burst or memory line, and nothing chimes', () => {
  const s = setup(), id = 'clown_horn_walker';
  s.world.interact(s.object(`surprise:${id}`), 'tap');
  s.io.neighbor = 'rook';
  s.dialog.close();
  assert.equal(s.world.interact(s.object(`surprise:${id}`), 'tap'), true);
  assert.equal(s.log.filter(e => e[0] === 'act').length, 2, 'act runs again; the reducer keeps the state');
  assert.deepEqual(s.io.state.surprises, [id]);
  const r = S.inspect([id], id, { sparks: 6, openNeighborId: 'rook' }), card = s.card();
  assert.deepEqual([r.newly, r.memory], [false, null]);
  assert.deepEqual([card.title, card.reader], [S.SURPRISES[id].title, lines(r.info)]);
  assert.equal(s.session.world.card.memory, null);
  assert.deepEqual(s.chimes(), []);
});

test('the tenth find is the finale heading, with every keepsake in the burst', () => {
  const nine = S.SURPRISE_IDS.filter(id => id !== 'mayor_pomp_event'), s = setup({ state: exploring(nine) });
  assert.equal(s.world.interact(s.object('surprise:mayor_pomp_event'), 'tap'), true);
  const card = s.card(), r = S.inspect(nine, 'mayor_pomp_event', { sparks: 15 });
  assert.equal(card.title, gdf(I.finale, [S.SURPRISES.mayor_pomp_event.title]));
  assert.ok(card.reader[0].startsWith(I.all), card.reader[0]);
  assert.deepEqual(card.reader, [r.burstSub, ...lines(r.info)]);
  assert.equal(card.label('card-spot'), S.conversationLabel(ALL));
  assert.deepEqual(s.io.state.surprises, ALL);
});

test("the paired neighbor's memory line shows only while that neighbor's conversation is open", () => {
  const id = 'jeffrey_record', line = S.inspect([], id, { openNeighborId: 'rook' }).memory;
  assert.ok(line.startsWith('Rook: "'), line);
  for (const [neighbor, memory] of [['rook', line], ['bea', ''], [null, '']]) {
    const s = setup();
    s.io.neighbor = neighbor;
    s.world.interact(s.object(`surprise:${id}`), 'tap');
    assert.equal(s.session.world.card.memory, memory, String(neighbor));
    assert.equal(s.card().reader.includes(line), memory !== '', String(neighbor));
  }
  // The pair line names both finds once both are in.
  const s = setup({ state: exploring(['clown_horn_walker']) });
  s.io.neighbor = 'rook';
  s.world.conversationAction('surprise', 'rook');
  assert.equal(s.session.world.card.id, id);
  assert.equal(s.session.world.card.memory, S.inspect(['clown_horn_walker'], id, { openNeighborId: 'rook' }).memory);
  assert.ok(s.card().reader.at(-1) === s.session.world.card.memory);
});

test("the save receipt shows on a surprise card only when the write was not saved, in Godot's words", () => {
  const s = setup();
  s.io.saveReason = 'save full';
  s.world.interact(s.object('surprise:bite_size_nachos'), 'tap');
  assert.equal(s.card().reader.at(-1), sceneReceipt('save full'));
  const t = setup();
  t.world.interact(t.object('surprise:bite_size_nachos'), 'tap');
  assert.deepEqual(t.card().reader, [S.inspect([], 'bite_size_nachos', { sparks: 6 }).burstSub, ...lines(S.inspect([], 'bite_size_nachos').info)]);
});

test('Spot Surprise cycles as Shift+D: the explore objective\'s surprise, then the last hint, then the next id', () => {
  // On the explore objective: its surprise (the open neighbor's pair first), whatever the guide index.
  const s = setup();
  assert.equal(s.world.openNotes('spot'), true);
  assert.equal(s.session.world.card.id, 'jeffrey_record');
  s.dialog.click('card-spot');
  assert.equal(s.session.world.card.id, 'hidden_mural_145', "the objective's next surprise");
  assert.equal(s.card().label('card-spot'), S.conversationLabel(['hidden_mural_145', 'jeffrey_record']));
  // Off it: the last hint while unfound, then the guide index onward, found ones included (Godot cycles them all).
  const t = setup({ state: touring() });
  t.world.hinted('cutesy_dino');
  t.world.openNotes('notes-spot');
  assert.deepEqual([t.session.world.card.id, t.session.world.lastHinted], ['cutesy_dino', ''], 'the find clears its own hint');
  t.dialog.click('card-spot');
  assert.equal(t.session.world.card.id, 'magic_carpet_chef');
  const seen = [];
  for (let i = 0; i < 10; i++) { t.dialog.click('card-spot'); seen.push(t.session.world.card.id); }
  assert.deepEqual(seen, [...S.SURPRISE_IDS.slice(6), ...S.SURPRISE_IDS.slice(0, 6)]);
  assert.equal(t.io.state.surprises.length, 10);
  assert.equal(t.session.world.guideIdx, 5);
});

// ---------------------------------------------------------------- landmarks (1.2 feature 9)
test('the museum cycles its four eras, chimes once per era, and the docent speaks', () => {
  const s = setup();
  let tour = L.initialTour();
  for (let press = 0; press < 6; press++) {
    if (press === 0) assert.equal(s.world.interact(s.object('museum'), 'tap'), true);
    else s.dialog.click('card-next-era');
    const r = L.inspectMuseum(tour); tour = r.tour;
    const card = s.card();
    assert.deepEqual([card.credit, card.title, card.reader], [say(D.museum), r.eraTitle, [...lines(r.info), r.docent]], `press ${press}`);
    assert.deepEqual(card.ids, ['card-next-era', 'card-back']);
    assert.equal(card.label('card-next-era'), K.VISITS_FORK_TEXT.nextEra);
    assert.equal(s.status(), r.announce);
    assert.deepEqual(s.log.filter(e => e[0] === 'speak').at(-1), ['speak', 'museum_docent', MAIN.MUSEUM_DOCENT_LINES[press % 4], say(D.museum)]);
    assert.deepEqual(s.log.filter(e => e[0] === 'lookAt').at(-1), ['lookAt', xy(P.MUSEUM)]);
  }
  assert.deepEqual(s.tour(), tour);
  assert.deepEqual(s.chimes(), [0, 1, 2, 3].map(step => ['museum_portal', L.inspectMuseum({ ...L.initialTour(), museumStep: step }).eraTitle]), 'one chime per new era');
  assert.equal(s.world.conversationAction('museum', 'bea'), true);
  assert.equal(s.chimes().length, 4);
});

test('Boeddeker Park and "So What" each chime once, and the park names the 2D tree count', () => {
  const s = setup(), trees = s.world.parkTrees().length;
  for (let i = 0; i < 2; i++) {
    s.dialog.close();
    assert.equal(s.world.interact(s.object('park'), 'tap'), true);
    const r = L.inspectPark(i ? { ...L.initialTour(), park: true } : L.initialTour(), trees), card = s.card();
    assert.deepEqual([card.credit, card.title, card.reader, card.ids], [say(T.build_boeddeker_park.label), r.title, lines(r.info), ['card-back']]);
    assert.ok(card.reader[1].includes(String(trees)), card.reader[1]);
    assert.equal(s.status(), r.announce);
  }
  assert.deepEqual(s.chimes(), [['boeddeker_park', T.inspect_boeddeker_park.title]]);
  assert.deepEqual(s.log.filter(e => e[0] === 'lookAt').map(e => e[1]), [xy(P.PARK_VIEW), xy(P.PARK_VIEW)]);
  for (const [id, label] of [['so_what', D.soWhatAwning], ['so_what_floor', D.soWhatFloor]]) {
    assert.equal(s.world.interact(s.object(id), 'tap'), true);
    const r = L.inspectSoWhat(L.initialTour());
    assert.deepEqual([s.card().credit, s.card().title, s.card().reader], [say(label), r.title, lines(r.info)]);
    assert.deepEqual(s.log.filter(e => e[0] === 'lookAt').at(-1), ['lookAt', xy(P.SO_WHAT_VIEW)]);
  }
  assert.deepEqual(s.chimes(), [['boeddeker_park', T.inspect_boeddeker_park.title], ['so_what_egg', T.inspect_so_what_easter_egg.title]]);
  // Those reasons are the literals Godot raises them with (main.gd:4595, 8678).
  assert.ok(gdFunc('main.gd', 'inspect_boeddeker_park').includes(`trigger_progress_cue("boeddeker_park", "${T.inspect_boeddeker_park.title}")`));
  assert.ok(gdFunc('main.gd', 'inspect_so_what_easter_egg').includes(`trigger_progress_cue("so_what_egg", "${T.inspect_so_what_easter_egg.title}")`));
  assert.equal(s.log.filter(e => e[0] === 'speak').length, 0, 'no bubble at the park or the awning');
  assert.deepEqual([s.tour().park, s.tour().soWhat], [true, true]);
});

test('eateries: the guide opens the counter and greets, the counter orders, and the first order bursts and chimes once', () => {
  const s = setup(), rec = L.EATERIES[0];
  assert.equal(s.world.interact(s.object('eatery:0'), 'tap'), true);
  const guide = L.cycleEatery(L.initialTour(), 0);
  let card = s.card();
  assert.deepEqual([card.credit, card.title, card.reader], [MENU_LABEL(0), EATERY_LABEL(0), [...lines(guide.info), ...lines(guide.speech)]]);
  assert.deepEqual(card.ids, ['card-order', 'card-eateries', 'card-back']);
  assert.deepEqual([card.label('card-order'), card.label('card-eateries')], [K.VISITS_FORK_TEXT.order, T.conversation_actions.eateries]);
  assert.deepEqual([s.tour().counters, s.tour().eateryGuide, s.chimes()], [[0], 0, []]);
  assert.deepEqual(s.log.filter(e => e[0] === 'speak').at(-1), ['speak', `eatery:${rec.id}`, guide.speech, rec.name]);
  assert.deepEqual(s.log.filter(e => e[0] === 'lookAt').at(-1), ['lookAt', xy(P.EATERY_AWNINGS[0])]);
  // The open counter orders (activate_eatery): the first order is the Order Up burst and the chime; the camera stays.
  const looks = s.log.filter(e => e[0] === 'lookAt').length;
  s.dialog.close();
  assert.equal(s.world.interact(s.object('counter:0'), 'tap'), true);
  const first = L.orderEatery(guide.tour, 0, { sparks: 5 });
  card = s.card();
  assert.deepEqual([card.credit, card.title, card.reader], [EATERY_LABEL(0), first.burst.heading, [first.burst.sub, ...lines(first.info)]]);
  assert.deepEqual(s.chimes(), [['eatery_order', rec.id]]);
  assert.equal(s.status(), first.announce);
  assert.deepEqual(s.log.filter(e => e[0] === 'speak').at(-1), ['speak', `eatery:${rec.id}`, first.speech, rec.name]);
  assert.equal(s.log.filter(e => e[0] === 'lookAt').length, looks);
  // Order at the counter again: no burst, no chime; the awning taps the same counter.
  s.dialog.click('card-order');
  const second = L.orderEatery(first.tour, 0, { sparks: 5 });
  assert.deepEqual([s.card().credit, s.card().title, s.card().reader], [MENU_LABEL(0), EATERY_LABEL(0), lines(second.info)]);
  s.dialog.close();
  s.world.interact(s.object('eatery:0'), 'tap');
  assert.equal(s.tour().orders[rec.id], 3);
  assert.equal(s.chimes().length, 1);
  // Visit Eateries: the next eatery's guide; a tap on another eatery guides there.
  s.dialog.click('card-eateries');
  assert.deepEqual([s.tour().eateryGuide, s.card().title], [1, EATERY_LABEL(1)]);
  s.world.interact(s.object('eatery:4'), 'tap');
  assert.deepEqual([s.tour().eateryGuide, s.tour().counters], [4, [0, 1, 4]]);
});

test('the landmark tour: the gold marker, card-tour, a What\'s Next arrival and the talk action visit the objective\'s stop', () => {
  const s = setup({ state: exploring(ALL) });
  assert.equal(s.world.interact(s.object('tour-marker'), 'tap'), true);
  assert.deepEqual([s.card().title, s.chimes()], [L.inspectMuseum(L.initialTour()).eraTitle, [['museum_portal', L.inspectMuseum(L.initialTour()).eraTitle]]]);
  // The next stop is museum:1; the card offers it under Godot's tour_action label.
  assert.equal(s.host.objective().tourId, 'museum:1');
  assert.deepEqual(s.card().ids, ['card-next-era', 'card-tour', 'card-back']);
  assert.equal(s.card().label('card-tour'), T.landmark_tour_state.museumAction);
  s.dialog.click('card-tour');
  assert.deepEqual(s.tour().eras, ['present', '1961_jazz']);
  // A What's Next arrival on tour:<stop> and the talk action landmark_tour.
  s.dialog.close();
  assert.equal(s.world.interact({ id: 'tour:park', kind: 'visit' }, 'walk'), true);
  assert.equal(s.card().title, T.inspect_boeddeker_park.title);
  assert.equal(s.tour().park, true);
  s.session.world.tour = { ...TOURED(), soWhat: false }; s.kit.bump();
  assert.equal(s.world.conversationAction('landmark_tour', 'thanh'), true);
  assert.deepEqual([s.card().title, s.tour().soWhat], [T.inspect_so_what_easter_egg.title, true]);
  // An eatery stop: the counter (open or not) runs the stop: guide, then the first order, its chime and the camera.
  s.session.world.tour = { ...TOURED(), orders: {} }; s.kit.bump();
  assert.equal(s.host.objective().tourId, 'eatery:0');
  s.dialog.close();
  assert.equal(s.world.interact(s.object('counter:0'), 'tap'), true);
  const r = L.visitStop({ ...TOURED(), orders: {} }, 'eatery:0', { sparks: 15 });
  assert.deepEqual([s.card().title, s.card().reader], [r.burst.heading, [r.burst.sub, ...lines(r.info)]]);
  assert.deepEqual(s.chimes().at(-1), ['eatery_order', L.EATERIES[0].id]);
  assert.deepEqual(s.log.filter(e => e[0] === 'lookAt').at(-1), ['lookAt', xy(P.EATERY_AWNINGS[0])]);
  // No stop, no visit.
  const t = setup();
  assert.equal(t.world.conversationAction('landmark_tour', 'bea'), false);
  assert.equal(t.world.interact({ id: 'tour-marker' }, 'tap'), false);
  assert.equal(t.shows(), 0);
});

test('tour completion fires once, only on the explore objective, with no dialog or overview in the way', () => {
  const C = T.update_landmark_tour_completion;
  const ready = (state = exploring(ALL), tour = TOURED()) => { const s = setup({ state }); s.session.world.tour = tour; s.kit.bump(); return s; };
  const s = ready();
  assert.equal(s.world.tick(16), true);
  assert.deepEqual(s.chimes(), [['tour_complete', gdf(C.cue, [12])]]);
  assert.deepEqual(s.log.filter(e => e[0] === 'toast'), [['toast', gdf(C.announce, [12])]]);
  assert.equal(s.tour().celebrated, true);
  assert.equal(s.shows(), 0, 'a toast, never a screen');
  assert.equal(s.world.tick(32), false);
  assert.equal(s.chimes().length, 1, 'once per visit');
  // Each gate holds it back; once it opens, the completion fires (previsited landmarks celebrate on reaching chapter 6).
  const held = ready(touring(ALL));
  assert.equal(held.world.tick(16), false);
  held.io.state = { ...held.io.state, blackhawk: true };
  assert.equal(held.world.tick(32), true);
  const open = ready();
  open.dialog.show(RECOVERY);
  assert.equal(open.world.tick(16), false);
  open.dialog.close();
  assert.equal(open.world.tick(32), true);
  const wide = ready();
  assert.equal(wide.world.tick(16, wide.view(true)), false);
  wide.world.objects(wide.view(true));
  assert.equal(wide.world.tick(32), false, 'the World of the last objects() call is in its overview');
  wide.world.objects(wide.view(false));
  assert.equal(wide.world.tick(48), true);
  for (const s2 of [ready(exploring(ALL.slice(1))), ready(exploring(ALL), { ...TOURED(), park: false }), ready(exploring(ALL), { ...TOURED(), celebrated: true })]) {
    assert.equal(s2.world.tick(16), false);
    assert.deepEqual(s2.chimes(), []);
  }
  // A throwing chime still celebrates once.
  const loud = setup({ state: exploring(ALL), over: { chime: boom } });
  loud.session.world.tour = TOURED(); loud.kit.bump();
  assert.equal(loud.world.tick(16), true);
  assert.equal(loud.tour().celebrated, true);
});

// ---------------------------------------------------------------- conversation actions (main.gd run_conversation_action_id)
test('conversationAction maps surprise, museum, eateries and landmark_tour as Godot run_conversation_action_id does', () => {
  // surprise on the explore objective: the objective's surprise, which is the open neighbor's pair first.
  let s = setup();
  s.io.neighbor = 'dez';
  assert.equal(s.world.conversationAction('surprise', 'dez'), true);
  assert.equal(s.session.world.card.id, 'viking_dirt_biker');
  // Off it: the partner's next unfound surprise of their pair, else the next unfound one.
  for (const [partner, id] of [['rook', 'jeffrey_record'], ['celeste', 'hidden_mural_145'], [{ id: 'thanh' }, 'impromptu_drag_show'], [null, 'jeffrey_record']]) {
    s = setup({ state: touring() });
    assert.equal(s.world.conversationAction('surprise', partner), true);
    assert.equal(s.session.world.card.id, id, JSON.stringify(partner));
  }
  s = setup({ state: touring(['impromptu_drag_show']) });
  s.world.conversationAction('surprise', 'thanh');
  assert.equal(s.session.world.card.id, 'bite_size_nachos', "Thanh's other pair surprise");
  // museum, eateries (the next guide each time), landmark_tour.
  s = setup();
  assert.equal(s.world.conversationAction('museum', 'bea'), true);
  assert.equal(s.card().title, L.inspectMuseum(L.initialTour()).eraTitle);
  assert.equal(s.world.conversationAction('eateries', 'bea'), true);
  assert.equal(s.tour().eateryGuide, 0);
  s.world.conversationAction('eateries', 'bea');
  assert.deepEqual([s.tour().eateryGuide, s.card().title], [1, EATERY_LABEL(1)]);
  assert.equal(s.world.conversationAction('landmark_tour', 'bea'), false, 'no tour stop while surprises remain');
  const t = setup({ state: exploring(ALL) });
  assert.equal(t.world.conversationAction('landmark_tour', 'bea'), true);
  assert.deepEqual(t.tour().eras, ['present']);
  for (const kind of ['hub', 'open', '', undefined]) assert.equal(t.world.conversationAction(kind, 'bea'), false, String(kind));
});

// ---------------------------------------------------------------- Boeddeker Park's trees (main.gd build_boeddeker_park)
test("parkTrees: Godot's jittered 6.5 m grid inside the ring, clear of the fence, path and play area, 12 to 24 trees", () => {
  const { world } = setup(), trees = world.parkTrees(), M = P.PIXELS_PER_METRE;
  assert.equal(world.parkTrees(), trees, 'computed once');
  assert.ok(trees.length >= 12 && trees.length <= 24, `${trees.length} trees (godot/tests/study_test.gd:1597 asks for at least 12; Godot stops at 24)`);
  const inside = (p, ring) => { let hit = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit; } return hit; };
  const segment = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  const ring = P.PARK_RING, play = P.godotToMap(-146, -112);
  for (const t of trees) {
    assert.deepEqual(Object.keys(t).sort(), ['scale', 'seed', 'x', 'y']);
    assert.ok(Number.isFinite(t.x) && Number.isFinite(t.y));
    assert.ok(inside(t, ring), `(${t.x}, ${t.y}) is inside the park`);
    assert.ok(Math.min(...ring.map((a, i) => segment(t, a, ring[(i + 1) % ring.length]))) >= 2.6 * M - 1e-9, 'fence clearance');
    assert.ok(Math.min(...P.PARK_PATH.slice(1).map((b, i) => segment(t, P.PARK_PATH[i], b))) >= 2.6 * M - 1e-9, 'path clearance');
    assert.ok(Math.hypot(t.x - play.x, t.y - play.y) >= 5.2 * M - 1e-9, 'play area clearance');
    assert.ok(Number.isInteger(t.seed) && t.seed >= 0 && t.seed < 2 ** 32);
    assert.ok(Math.abs(t.scale - (1.4 + (t.seed % 6) * 0.1)) < 1e-12);
  }
  assert.equal(new Set(trees.map(t => `${t.x} ${t.y}`)).size, trees.length, 'no two trees on one spot');
  assert.equal(setup().world.parkTrees(), trees, 'the park is the same for every visit');
});

// ---------------------------------------------------------------- bubble anchors (spec 3.8)
test('anchors: surprise sites, eatery counters and the museum docent, each with its speaker', () => {
  const { world } = setup();
  for (const id of S.SURPRISE_IDS) assert.deepEqual(world.anchor(`surprise:${id}`), { ...xy(P.SURPRISE_SITES[id]), name: S.SURPRISES[id].speaker });
  L.EATERIES.forEach((rec, i) => assert.deepEqual(world.anchor(`eatery:${rec.id}`), { ...xy(P.EATERY_COUNTERS[i]), name: rec.name }));
  assert.deepEqual(world.anchor('museum_docent'), { ...xy(P.MUSEUM_DOCENT), name: say(D.museum) });
  for (const id of ['bea', 'surprise:nope', 'eatery:nope', 'eatery:', 'surprise:constructor', 'museum', '', null, undefined, 7]) assert.equal(world.anchor(id), null, String(id));
  // Every bubble a run raises resolves.
  const s = setup();
  s.world.interact(s.object('surprise:magic_carpet_chef'), 'tap'); s.world.interact(s.object('museum'), 'tap'); s.world.interact(s.object('eatery:5'), 'tap');
  const speaks = s.log.filter(e => e[0] === 'speak');
  assert.equal(speaks.length, 3);
  for (const [, id, , name] of speaks) assert.equal(s.world.anchor(id)?.name, name, id);
});

// ---------------------------------------------------------------- closing the card, Field notes
test('Back and Escape close the card without a toast; focus returns to the canvas, or to Field notes\' button', () => {
  const s = setup();
  assert.equal(s.world.cancel(), false, 'no card, nothing to cancel');
  s.world.interact(s.object('museum'), 'tap');
  const toasts = s.log.filter(e => e[0] === 'toast').length;
  s.dialog.click('card-back');
  assert.deepEqual(s.log.at(-1), ['close', undefined]);
  assert.deepEqual([s.session.screen, s.session.world.card, s.kit.holds(), s.dialog.modal.open], [null, null, false, false]);
  s.world.interact(s.object('park'), 'tap');
  assert.equal(s.world.cancel(), true, 'Escape is Back');
  assert.deepEqual(s.log.at(-1), ['close', undefined]);
  assert.equal(s.log.filter(e => e[0] === 'toast').length, toasts, 'no toast: the status line said the announcement');
  // From Field notes: the return target is the Field notes button, after show and on Back, through the card's own redraws.
  s.world.openNotes('museum');
  const shown = s.log.findLastIndex(e => e[0] === 'show');
  assert.deepEqual(s.log[shown + 1], ['returnTo', 'journal-button']);
  s.dialog.click('card-next-era');
  s.dialog.click('card-back');
  assert.deepEqual(s.log.at(-1), ['close', 'journal-button']);
  // Another visits screen or dialog over the card: Escape is not the card's.
  s.world.interact(s.object('park'), 'tap');
  s.dialog.show(RECOVERY);
  assert.equal(s.world.cancel(), false);
});

test('Field notes: the neighborhood entry, its five buttons, and openNotes', () => {
  const s = setup({ state: exploring(['cutesy_dino']), shell: true });
  const html = s.world.notesHTML();
  assert.match(html, /^<div class="history-entry"/);
  assert.ok(html.includes(`<span class="eyebrow visits-eyebrow">${K.esc(K.VISITS_FORK_TEXT.notesEyebrow)}</span>`));
  assert.ok(html.includes(`<h3>${K.esc(K.VISITS_FORK_TEXT.notesTitle)}</h3>`));
  assert.ok(html.includes(`<p>${K.esc(S.progressLabel(['cutesy_dino'], 6))}</p>`), 'the progress line with this visit\'s sparks');
  // Godot's Shift+D, Shift+M and Shift+E, then the park and "So What": Godot inspects those from a tap on the park's label and
  // Shift+H, with the labels its landmark tour gives the same two visits.
  const buttons = cardOf(html).buttons, TOUR = T.landmark_tour_state;
  assert.deepEqual(buttons.map(b => [b.id, b.label]), [['notes-spot', S.conversationLabel(['cutesy_dino'])], ['notes-museum', T.conversation_actions.museum], ['notes-eateries', T.conversation_actions.eateries],
    ['notes-park', TOUR.parkAction], ['notes-so-what', TOUR.soWhatAction]]);
  // Field notes is game.js's dialog; the shell binds the entry's buttons in it and each opens its card with the return to Field notes.
  s.host.show(`<span class="eyebrow">FIELD NOTES</span><h2 id="modal-title">Notes</h2>${html}`);
  assert.equal(s.visits.entryHTML('notes'), html, "the shell's Field notes entry is the part's");
  assert.equal(s.visits.bindEntry('notes'), true);
  // Each replaces Field notes with a card, so a held Enter or Space never presses one again (kit.noRepeat).
  const keydown = (id, init) => { const event = { ...init, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const fn of s.dialog.doc.getElementById(id).listeners.keydown || []) fn(event); return event.defaultPrevented; };
  for (const { id } of buttons) assert.deepEqual([keydown(id, { key: 'Enter', repeat: false }), keydown(id, { key: 'Enter', repeat: true }), keydown(id, { key: ' ', repeat: true })], [false, true, true], id);
  s.dialog.click('notes-eateries');
  assert.deepEqual([s.card().title, s.tour().eateryGuide], [EATERY_LABEL(0), 0]);
  assert.ok(s.log.some(e => e[0] === 'returnTo' && e[1] === 'journal-button'));
  for (const kind of ['notes-museum', 'museum']) { s.dialog.close(); assert.equal(s.world.openNotes(kind), true); assert.equal(s.session.world.card.kind, 'museum'); }
  s.dialog.close();
  assert.equal(s.world.openNotes('notes-spot'), true);
  assert.equal(s.session.world.card.id, 'jeffrey_record');
  for (const kind of ['nope', '', undefined, 'notes-', 'soWhat', 'notes-so_what']) assert.equal(s.world.openNotes(kind), false, String(kind));
  assert.equal(setup({ shell: true }).visits.bindEntry('notes'), false, 'no entry on screen, nothing bound');
});

test("Field notes: the five buttons wrap three to a row on a wide dialog and two on a phone, never four abreast (style.css)", () => {
  // The entry's hooks: the five buttons alone in a .button-row inside [data-visits-notes].
  assert.match(setup().world.notesHTML(), /^<div class="history-entry" data-visits-notes>[\s\S]*<div class="button-row">(?:<button id="notes-[a-z-]+" class="secondary-button">[^<]+<\/button>){5}<\/div><\/div>$/);
  const css = readFileSync(new URL('../browser-next/style.css', import.meta.url), 'utf8');
  const rule = selector => { const m = new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css); assert.ok(m, `style.css has ${selector}`); return m[1]; };
  const prop = (decls, name) => new RegExp(`(?:^|[;{\\s])${name}\\s*:\\s*([^;!]+?)\\s*(?:!important)?\\s*(?:;|$)`).exec(decls)?.[1];
  // Dialog button rows wrap with a 10 px gap and share each row (flex:1), which squeezed four of these abreast on a phone.
  const row = rule('dialog .button-row');
  assert.deepEqual([prop(row, 'display'), prop(row, 'flex-wrap'), prop(row, 'gap'), prop(rule('dialog .button-row button'), 'flex')], ['flex', 'wrap', '10px', '1']);
  // Here (a more specific selector) each takes 30% of the row, at least 7rem but never more than the row: four never fit (4 x 30%
  // is over the row), three do once 30% is 7rem or more (with the two gaps they take 90% and 20 px), else two or one, each as wide.
  const own = rule('[data-visits-notes] .button-row button');
  assert.deepEqual([prop(own, 'flex'), prop(own, 'min-width')], ['1 1 30%', 'min(100%,7rem)']);
});

test('Field notes: Visit the Park and See "So What" open their cards as a tap on the park or the awning does, chime once, and Back returns to Field notes', () => {
  const s = setup({ shell: true }), trees = s.world.parkTrees().length;
  s.host.show(`<h2 id="modal-title">Notes</h2>${s.world.notesHTML()}`);
  s.visits.bindEntry('notes');
  s.dialog.click('notes-park');
  const park = L.inspectPark(L.initialTour(), trees);
  assert.deepEqual([s.card().credit, s.card().title, s.card().reader, s.card().ids], [say(T.build_boeddeker_park.label), park.title, lines(park.info), ['card-back']]);
  assert.equal(s.status(), park.announce);
  assert.deepEqual([s.chimes(), s.tour().park, s.log.filter(e => e[0] === 'lookAt').at(-1)], [[['boeddeker_park', T.inspect_boeddeker_park.title]], true, ['lookAt', xy(P.PARK_VIEW)]]);
  assert.deepEqual(s.log[s.log.findLastIndex(e => e[0] === 'show') + 1], ['returnTo', 'journal-button']);
  s.dialog.click('card-back');
  assert.deepEqual(s.log.at(-1), ['close', 'journal-button']);
  // "So What" from Field notes is Godot's Shift+H: the awning's card.
  assert.equal(s.world.openNotes('notes-so-what'), true);
  const soWhat = L.inspectSoWhat(L.initialTour());
  assert.deepEqual([s.card().credit, s.card().title, s.card().reader], [say(D.soWhatAwning), soWhat.title, lines(soWhat.info)]);
  assert.deepEqual(s.chimes().at(-1), ['so_what_egg', T.inspect_so_what_easter_egg.title]);
  assert.ok(s.world.cancel(), 'Escape is Back');
  assert.deepEqual(s.log.at(-1), ['close', 'journal-button']);
  // Again: no chime, the stop is already visited (Godot chimes once a visit).
  s.world.openNotes('park'); s.world.openNotes('so-what');
  assert.equal(s.chimes().length, 2);
  assert.deepEqual([s.tour().park, s.tour().soWhat], [true, true]);
});

// The card's own next step and the tour's next stop each move the visit on a stage: a held key must not press them twice.
test("held Enter or Space never presses a card's own step or the tour's next stop again (kit.noRepeat); Back is left to the global rule", () => {
  const keydown = (s, id, init) => { const event = { ...init, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const fn of s.dialog.doc.getElementById(id).listeners.keydown || []) fn(event); return event.defaultPrevented; };
  const held = (s, id) => [keydown(s, id, { key: 'Enter', repeat: false }), keydown(s, id, { key: 'Enter', repeat: true }), keydown(s, id, { key: ' ', repeat: true }), keydown(s, id, { key: 'ArrowDown', repeat: true })];
  const cards = [
    [exploring(), s => s.world.interact(s.object('surprise:cutesy_dino'), 'tap'), ['card-spot']],
    [exploring(), s => s.world.interact(s.object('eatery:1'), 'tap'), ['card-order', 'card-eateries']],
    // All ten found: the museum's tour stop under the gold marker, with Next era and the tour's next stop.
    [exploring(ALL), s => s.world.interact(s.object('tour-marker'), 'tap'), ['card-next-era', 'card-tour']],
  ];
  for (const [state, open, chained] of cards) {
    const s = setup({ state });
    open(s);
    assert.deepEqual(s.card().ids, [...chained, 'card-back']);
    for (const id of chained) assert.deepEqual(held(s, id), [false, true, true, false], id);
    assert.equal((s.dialog.doc.getElementById('card-back').listeners.keydown || []).length, 0, 'card-back');
    // A redraw by its own button binds them again.
    s.dialog.click(chained[0]);
    for (const id of s.card().ids.filter(id => id !== 'card-back')) assert.deepEqual(held(s, id).slice(1, 3), [true, true], `${id} after a redraw`);
  }
});

// ---------------------------------------------------------------- stale screens (spec 4, lesson 2)
test('stale screens: a press, a tick or a notes click after the card closed or was replaced draws nothing', () => {
  const stale = (s, id) => { const el = s.dialog.doc.getElementById(id); assert.ok(el, id); return () => { for (const fn of el.listeners.click || []) fn({ preventDefault() {} }); }; };
  for (const replace of [s => s.dialog.click('card-back'), s => s.dialog.show(RECOVERY), s => s.kit.show('meal', K.frameHTML({ kind: 'meal', title: 'meal' })), s => s.dialog.close(), s => s.world.silentClose()]) {
    const s = setup();
    s.world.interact(s.object('surprise:jeffrey_record'), 'tap');
    const presses = ['card-spot', 'card-back'].map(id => stale(s, id));
    replace(s);
    const shows = s.shows(), acts = s.log.filter(e => e[0] === 'act').length, count = s.log.length;
    for (const press of presses) press();
    s.world.tick(16);
    assert.deepEqual([s.shows(), s.log.filter(e => e[0] === 'act').length], [shows, acts]);
    assert.ok(s.log.slice(count).every(e => e[0] !== 'close' && e[0] !== 'status'), JSON.stringify(s.log.slice(count)));
  }
  // A card redrawn by its own button: the old card's buttons are dead, the new one's live.
  const s = setup();
  s.world.interact(s.object('museum'), 'tap');
  const old = stale(s, 'card-next-era');
  s.dialog.click('card-next-era');
  const eras = s.tour().eras.length;
  old();
  assert.equal(s.tour().eras.length, eras);
  s.dialog.click('card-next-era');
  assert.equal(s.tour().eras.length, eras + 1);
  // Field notes replaced before its button is pressed.
  const n = setup({ shell: true });
  n.host.show(`<h2 id="modal-title">Notes</h2>${n.world.notesHTML()}`);
  n.visits.bindEntry('notes');
  const spot = stale(n, 'notes-spot');
  n.dialog.show(RECOVERY);
  spot();
  assert.deepEqual([n.shows(), n.log.filter(e => e[0] === 'act').length], [1, 0]);
});

// ---------------------------------------------------------------- the scene part (spec 3.8, risk R9)
test('scenePart: the world part of the VisitsScene, its static parts kept as the same objects', () => {
  const s = setup();
  const part = s.world.scenePart();
  assert.deepEqual(Object.keys(part).sort(), ['eateries', 'keepsakes', 'larkin', 'museum', 'park', 'soWhat', 'surprises', 'tourMarker']);
  assert.deepEqual(part.surprises, S.markers([]).map(m => ({ ...m, label: say(T.build_neighborhood_surprises[m.id]) })));
  assert.deepEqual(part.keepsakes, []);
  assert.deepEqual(part.eateries.map(e => ({ ...e })), L.EATERIES.map((rec, i) => ({ index: i, id: rec.id, name: rec.name, awning: P.EATERY_AWNINGS[i], counter: null, canopy: `#${rec.canopy_color}`, label: `#${rec.label_color}`, menu: MENU_LABEL(i) })));
  assert.deepEqual(part.museum, { x: P.MUSEUM.x, y: P.MUSEUM.y, docent: P.MUSEUM_DOCENT, lens: L.lensColor('present'), rings: [0, 25, 50] });
  assert.deepEqual(part.park, { ring: P.PARK_RING, path: P.PARK_PATH, entrance: P.PARK_ENTRANCE, trees: s.world.parkTrees(), label: say(T.build_boeddeker_park.label) });
  assert.deepEqual(part.soWhat, { awning: P.SO_WHAT_AWNING, floor: P.SO_WHAT_LEAVENWORTH, labels: { awning: say(D.soWhatAwning), floor: say(D.soWhatFloor) } });
  assert.deepEqual(part.larkin, { exterior: P.LARKIN_EXTERIOR, junction: P.LARKIN_JUNCTION });
  assert.equal(part.tourMarker, null);
  const json = JSON.stringify(part);
  assert.ok(!json.includes('data:') && !json.includes('<svg'), 'never an SVG or a data URI');
  // Nothing changed: the same objects, whatever the session version (the lantern's march bumps it every frame).
  assert.equal(s.world.scenePart(), part);
  s.kit.bump(); s.kit.bump();
  const same = s.world.scenePart(), keys = ['surprises', 'keepsakes', 'eateries', 'museum', 'park', 'soWhat', 'larkin'];
  for (const key of keys) assert.equal(same[key], part[key], key);
  // A find rebuilds the beacons and keepsakes only; the museum's era its portal only; a guide the eateries only.
  s.world.interact(s.object('surprise:cutesy_dino'), 'tap');
  let next = s.world.scenePart();
  assert.deepEqual(next.surprises.filter(m => m.found).map(m => m.id), ['cutesy_dino']);
  assert.deepEqual(next.keepsakes, S.keepsakes(['cutesy_dino']));
  for (const key of ['eateries', 'museum', 'park', 'soWhat', 'larkin']) assert.equal(next[key], part[key], key);
  const found = next;
  s.world.interact(s.object('museum'), 'tap');
  next = s.world.scenePart();
  assert.deepEqual([next.museum.lens, next.museum.rings], [L.lensColor('present'), [30, 55, 80]]);
  s.dialog.click('card-next-era');
  next = s.world.scenePart();
  assert.deepEqual([next.museum.lens, next.museum.rings], [L.lensColor('1961_jazz'), [60, 85, 110]]);
  for (const key of ['surprises', 'keepsakes', 'eateries', 'park', 'soWhat', 'larkin']) assert.equal(next[key], found[key], key);
  s.world.interact(s.object('eatery:1'), 'tap');
  next = s.world.scenePart();
  assert.deepEqual(next.eateries.map(e => e.counter), [null, P.EATERY_COUNTERS[1], null, null, null, null]);
  assert.equal(next.surprises, found.surprises);
  // The tour's gold marker at the objective's stop (decision D9).
  const t = setup({ state: exploring(ALL) });
  assert.deepEqual(xy(t.world.scenePart().tourMarker), xy(P.MUSEUM));
  t.session.world.tour = { ...TOURED(), park: false }; t.kit.bump();
  assert.deepEqual(xy(t.world.scenePart().tourMarker), xy(P.PARK_ENTRANCE));
  t.session.world.tour = TOURED(); t.kit.bump();
  assert.equal(t.world.scenePart().tourMarker, null);
});

// ---------------------------------------------------------------- the objective inputs and the session
test('objectiveInputs, hinted, snapshot, reset and silentClose', () => {
  const s = setup();
  assert.deepEqual(s.world.objectiveInputs(), { tour: L.initialTour(), lastHinted: '' });
  assert.equal(s.world.objectiveInputs().tour, s.session.world.tour, "story.js reads the session's own tour");
  s.world.hinted('cutesy_dino');
  assert.equal(s.world.objectiveInputs().lastHinted, 'cutesy_dino');
  assert.equal(s.host.objective().surpriseId, 'cutesy_dino', 'the last hint leads the explore objective (Godot next_explore_surprise_id)');
  for (const id of ['nope', '', null, 7]) { s.world.hinted(id); assert.equal(s.session.world.lastHinted, '', String(id)); }
  s.world.interact(s.object('museum'), 'tap');
  s.world.interact(s.object('surprise:cutesy_dino'), 'tap');
  const snap = s.world.snapshot();
  assert.deepEqual(snap, { tour: s.session.world.tour, guideIdx: S.SURPRISE_IDS.indexOf('cutesy_dino'), lastHinted: '' });
  assert.notEqual(snap.tour, s.session.world.tour, 'a copy');
  assert.deepEqual(structuredClone(snap), snap);
  // silentClose forgets the card without touching the dialog; reset starts the visit over, dialog untouched too.
  assert.equal(s.world.silentClose(), true);
  assert.deepEqual([s.session.world.card, s.session.screen, s.dialog.modal.open], [null, null, true]);
  assert.equal(s.world.silentClose(), false);
  const version = s.session.version;
  s.world.reset();
  assert.deepEqual(s.session.world, K.freshSession().world);
  assert.ok(s.session.version > version);
  assert.equal(s.dialog.modal.open, true);
  assert.deepEqual(s.io.state.surprises, ['cutesy_dino'], 'the finds are saved, never reset');
});

test('interact: objective targets (tour:<stop>, episode), unknown objects and ids', () => {
  const s = setup();
  assert.equal(s.world.interact({ id: 'episode', kind: 'visit' }, 'walk'), true);
  assert.deepEqual(s.log.at(-1), ['openResume']);
  assert.equal(setup({ routes: {} }).world.interact({ id: 'episode' }, 'walk'), false, 'no shell route, nothing opens');
  assert.equal(s.world.interact({ id: 'tour:so_what' }, 'walk'), true);
  assert.equal(s.card().title, T.inspect_so_what_easter_egg.title);
  assert.equal(s.world.interact('tour:eatery:3', 'walk'), true);
  assert.deepEqual([s.tour().orders[L.EATERIES[3].id], s.chimes().at(-1)], [1, ['eatery_order', L.EATERIES[3].id]]);
  assert.equal(s.world.interact({ id: 'tour:museum:2' }, 'walk'), true);
  assert.equal(s.card().title, L.inspectMuseum({ ...L.initialTour(), museumStep: 2 }).eraTitle);
  const acts = s.log.filter(e => e[0] === 'act').length, shows = s.shows();
  for (const object of [null, undefined, {}, { id: 7 }, { id: 'nope' }, { id: 'surprise:nope' }, { id: 'eatery:6' }, { id: 'counter:-1' }, { id: 'eatery:x' }, { id: 'tour:' }, { id: 'bea' }]) {
    assert.equal(s.world.interact(object, 'tap'), false, JSON.stringify(object));
  }
  assert.deepEqual([s.log.filter(e => e[0] === 'act').length, s.shows()], [acts, shows]);
});

// ---------------------------------------------------------------- generated HTML and the drift scan
test('generated HTML: no inline handler or script, and no image that is not a data: URI', () => {
  const s = setup({ state: exploring(ALL.slice(1)) });
  s.io.saveReason = 'storage unavailable'; s.io.neighbor = 'bea';
  s.world.interact(s.object('surprise:jeffrey_record'), 'tap'); s.dialog.click('card-spot');
  s.world.interact(s.object('museum'), 'tap'); s.world.interact(s.object('park'), 'tap'); s.world.interact(s.object('so_what_floor'), 'tap');
  s.world.interact(s.object('eatery:3'), 'tap'); s.dialog.click('card-order'); s.dialog.click('card-order'); s.dialog.click('card-eateries');
  s.world.interact(s.object('tour-marker'), 'tap'); s.dialog.click('card-tour');
  const html = [...s.log.filter(e => e[0] === 'show').map(e => e[1]), s.world.notesHTML()];
  assert.ok(html.length >= 12, `${html.length} screens`);
  for (const text of html) {
    assert.doesNotMatch(text, /\son[a-z]+=/i, 'no handler attribute');
    assert.doesNotMatch(text, /<script|javascript:/i);
    for (const [, src] of text.matchAll(/\ssrc="([^"]*)"/g)) assert.match(src, /^data:image\//);
    for (const [, id] of text.matchAll(/<button id="([^"]+)"/g)) assert.match(id, /^(card|notes)-[a-z-]+$/);
  }
});

test('the file hand-types no Godot text: string literals it shares with Godot are structural or protocol identifiers', () => {
  const STRUCTURAL = ['', ' ', '\n', ': ', '. '];
  const shared = [...new Set(jsStrings(SOURCE))].filter(text => GD_LITERALS.has(text));
  assert.deepEqual(shared.filter(text => !STRUCTURAL.includes(text) && !/^[a-z][a-z_]*$/.test(text)), [], 'a Godot line or label comes from visits/text.js or is declared fork text');
  // The declared fork text it draws is named, so tests/next-visits-kit.test.mjs can find every key in use.
  for (const key of ['back', 'nextEra', 'order', 'notesEyebrow', 'notesTitle']) assert.ok(SOURCE.includes(`VISITS_FORK_TEXT.${key}`), key);
  // The only saved change is the find, dispatched once in the code (spec WP2c acceptance grep: only this file and core.js).
  assert.equal((SOURCE.replace(/\/\/.*$/gm, '').match(/type: 'surprise'/g) || []).length, 1);
  assert.match(SOURCE, /host\.act\(\{ type: 'surprise', id \}\)/);
});

// ---------------------------------------------------------------- the reward banner (bursts.js; main.gd trigger_feel_good_burst)
// The visit-only cues carry the counts their banner reads, Godot's direct bursts go to host.burst after the cue, and the tour's
// completion waits while a banner is up or waiting (update_landmark_tour_completion).
test('banner: a new find and a first order burst after their cue; visit cues carry their values; the tour waits for the banner', () => {
  const bursts = [], chimes = [];
  const s = setup({ over: { burst: spec => bursts.push(spec), chime: (...args) => chimes.push(args) } }), id = 'jeffrey_record';
  s.world.interact(s.object(`surprise:${id}`), 'tap');
  const r = S.inspect([], id, { sparks: 6 });
  assert.deepEqual(bursts, [{ title: r.heading, detail: r.burstSub, accent: r.accent, finale: false }]);
  s.dialog.close();
  s.world.interact(s.object(`surprise:${id}`), 'tap');
  assert.equal(bursts.length, 1, 'a find seen before does not burst');
  // The tenth find: the finale heading, held for 4.5 s by game.js.
  const nine = ALL.filter(other => other !== 'impromptu_drag_show'), t = setup({ state: exploring(nine), over: { burst: spec => bursts.push(spec) } });
  t.world.interact(t.object('surprise:impromptu_drag_show'), 'tap');
  const fin = S.inspect(nine, 'impromptu_drag_show', { sparks: 15 });
  assert.deepEqual(bursts.at(-1), { title: fin.heading, detail: fin.burstSub, accent: fin.accent, finale: true });
  // A first order bursts Order Up after its chime; a second order does not.
  s.dialog.close();
  s.world.interact(s.object('eatery:0'), 'tap'); s.dialog.close();
  s.world.interact(s.object('counter:0'), 'tap');
  const first = L.orderEatery(L.cycleEatery(L.initialTour(), 0).tour, 0, { sparks: 6 });
  assert.deepEqual(bursts.at(-1), { title: first.burst.heading, detail: first.burst.sub, accent: first.burst.color });
  assert.deepEqual(chimes.at(-1), ['eatery_order', L.EATERIES[0].id, undefined]);
  s.dialog.click('card-order');
  assert.equal(bursts.length, 3);
  // The museum's era count and the park's trees after the visit.
  s.dialog.close();
  s.world.interact(s.object('museum'), 'tap');
  assert.deepEqual(chimes.at(-1), ['museum_portal', L.inspectMuseum(L.initialTour()).eraTitle, { eras: 1 }]);
  s.dialog.close();
  s.world.interact(s.object('park'), 'tap');
  assert.deepEqual(chimes.at(-1), ['boeddeker_park', T.inspect_boeddeker_park.title, { trees: s.world.parkTrees().length }]);
  // The tour: held while a banner is pending, then once with its counts.
  let pending = true;
  const u = setup({ state: exploring(ALL), over: { rewardPending: () => pending, chime: (...args) => chimes.push(args) } });
  u.session.world.tour = TOURED(); u.kit.bump();
  assert.equal(u.world.tick(16), false, 'a banner up or waiting holds the completion');
  pending = false;
  assert.equal(u.world.tick(32), true, 'and it fires once the banner is gone');
  assert.deepEqual(chimes.at(-1), ['tour_complete', gdf(T.update_landmark_tour_completion.cue, [12]), { tourCount: 12, tourTotal: 12 }]);
  // A throwing rewardPending or burst never stops a visit.
  const v = setup({ state: exploring(ALL), over: { rewardPending: boom, burst: boom } });
  v.session.world.tour = TOURED(); v.kit.bump();
  assert.equal(v.world.tick(16), true);
  assert.equal(v.world.interact(v.object(`surprise:${id}`), 'tap'), true);
});
