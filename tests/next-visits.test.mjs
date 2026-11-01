// browser-next/visits/: drift against godot/*.gd, per-feature logic, and 2D positions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gdConst, gdFunc, gdStrings, gdSource, jsStrings, firstMissingInOrder } from './gd-literal.mjs';
import * as core from '../browser-next/core.js';
import { compassPhrase } from '../browser-next/story.js';
import { GODOT_CONSTANTS, GODOT_TEXT, WEB_OVERRIDES, web, MAIN, MEAL_DATA } from '../browser-next/visits/text.js';
import { gdf, gdFloat, gdCapitalize, f32 } from '../browser-next/visits/format.js';
import * as P from '../browser-next/visits/positions.js';
import * as before from '../browser-next/visits/before-streets.js';
import * as meal from '../browser-next/visits/meal.js';
import * as dogs from '../browser-next/visits/dogs.js';
import * as lantern from '../browser-next/visits/lantern.js';
import * as power from '../browser-next/visits/power.js';
import * as election from '../browser-next/visits/election.js';
import * as picker from '../browser-next/visits/picker.js';
import * as surprises from '../browser-next/visits/surprises.js';
import * as landmarks from '../browser-next/visits/landmarks.js';

const json = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const POWER_PLACE = json('godot/data/power_place.json');
const VOTING = json('godot/data/voting_places.json');
const WAYS = json('browser-next/data/streets.osm.json').ways.map(w => ({ ...w, points: w.geometry.map(core.project) }));
const near = (a, b, eps = 0.051) => Math.abs(a - b) <= eps;
const close = (p, q, eps = 0.051, label = '') => assert.ok(near(p.x, q.x, eps) && near(p.y, q.y, eps), `${label} (${p.x}, ${p.y}) vs (${q.x}, ${q.y})`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------------------------------------------------------------- drift
test('every copied constant deep-equals Godot', () => {
  for (const [file, consts] of Object.entries(GODOT_CONSTANTS)) {
    for (const [name, value] of Object.entries(consts)) assert.deepEqual(value, gdConst(file, name), `${file} ${name}`);
  }
});

test('every copied template occurs, in order, among its Godot function literals', () => {
  for (const [file, fns] of Object.entries(GODOT_TEXT)) {
    for (const [fn, entry] of Object.entries(fns)) {
      const miss = firstMissingInOrder(gdStrings(gdFunc(file, fn)), Object.values(entry));
      assert.equal(miss, null, `${file} ${fn}: ${JSON.stringify(miss)}`);
    }
  }
});

test('web overrides only drop 3D key hints, and each Godot literal still exists', () => {
  for (const [file, map] of Object.entries(WEB_OVERRIDES)) {
    const lits = gdStrings(gdSource(file));
    for (const [godot, fork] of Object.entries(map)) {
      assert.ok(lits.includes(godot), `${file}: override key no longer in Godot: ${godot}`);
      assert.match(godot, /F8|Shift/, 'an override must be about a key hint');
      assert.doesNotMatch(fork, /F8|Shift\+?[A-Z]/, 'the 2D wording names no 3D key');
      assert.equal(web(file, godot), fork);
    }
  }
  assert.equal(web('main.gd', 'unchanged text'), 'unchanged text');
  // The meal cue's missing space is Godot's own; it is copied, not overridden.
  assert.equal(GODOT_TEXT['shared_meal.gd'].refresh.cueStep, 'Step %d of5: %s. %s');
});

// Each ported artwork/text function contains Godot's literals in Godot's order.
const PORTS = [
  ['before_streets.gd', 'artwork', before.artwork, s => /[<#]/.test(s)],
  ['shared_meal.gd', 'artwork', meal.artwork, s => /</.test(s) || /^#?[0-9a-f]{6}$/.test(s)],
  ['dog_story.gd', 'illustration', dogs.illustration, () => true],
  ['lantern_procession.gd', 'update_art', lantern.artwork, s => /[<#]/.test(s)],
  ['power_story.gd', 'diagram', power.diagram, () => true],
  ['power_place.gd', 'map_svg', power.mapSVG, () => true],
  ['voting_story.gd', 'update_art', election.paperSVG, s => /[<#]/.test(s) || s === 'M' || s === 'L' || s === '%.2f %.2f '],
  ['main.gd', 'neighbor_surprise_memory_line', surprises.memoryLine, () => true],
];
test('ported SVG and text builders keep every Godot literal in order', () => {
  for (const [file, fn, js, keep] of PORTS) {
    const want = gdStrings(gdFunc(file, fn)).filter(s => s !== '' && keep(s));
    assert.ok(want.length > 0, `${file} ${fn} has literals`);
    assert.equal(firstMissingInOrder(jsStrings(js.toString()), want), null, `${file} ${fn}`);
  }
});

test('inline Godot values copied into code still match', () => {
  const lines = file => gdSource(file).split('\n').map(l => l.trim());
  assert.ok(lines('power_story.gd').includes('var turns := [[0,0,1,1],[2,0,3,1],[3,0,1,2]]'));
  assert.ok(lines('power_story.gd').includes('turns=[[0,0,1,1],[2,0,3,1],[3,0,1,2]]'));
  assert.deepEqual(power.INITIAL_TURNS(), [[0, 0, 1, 1], [2, 0, 3, 1], [3, 0, 1, 2]]);
  assert.match(gdFunc('dog_story.gd', 'setup'), /for offset in \[Vector2\(0,4\),Vector2\(-3,1\),Vector2\(3,-3\),Vector2\(-4,0\)\]:/);
  assert.deepEqual(P.DOG_OFFSETS, [[0, 4], [-3, 1], [3, -3], [-4, 0]]);
  assert.match(gdFunc('dog_story.gd', 'setup'), /goals\.append\(chosen\+Vector2\(0,1\.8\)\)/);
  assert.match(gdFunc('dog_story.gd', 'near'), /<=2\.0/);
  assert.match(gdFunc('lantern_procession.gd', 'goal'), /route_point\(8\.0 if phase==0 else LENGTH\)/);
  assert.match(gdFunc('lantern_procession.gd', 'begin'), /progress=8\.0/);
  assert.match(gdFunc('power_place.gd', 'map_point'), /Vector2\(28\+\(float\(xz\[0\]\)\+620\)\*1\.35,24\+\(float\(xz\[1\]\)\+100\)\*1\.35\)/);
  assert.match(gdFunc('voting_story.gd', 'map_point'), /Vector2\(20\+\(float\(xz\[0\]\)\+320\)\*0\.9,18\+\(float\(xz\[1\]\)\+140\)\*0\.9\)/);
  assert.match(gdFunc('voting_story.gd', 'near'), /\(1\.0 if phase>=3 else 2\.0\)/);
  assert.match(gdFunc('power_story.gd', 'setup'), /site_kit\.position=Vector3\(game\.power_place\.goal\.x,0,game\.power_place\.goal\.y\+2\.2\)/);
  assert.match(gdSource('main.gd'), /var leav_ee_screen := camera\.unproject_position\(Vector3\(-290\.8, 24\.6, 99\.4\)\)/);
  assert.deepEqual(P.SO_WHAT_LEAVENWORTH_XZ, [-290.8, 99.4]);
  assert.match(gdFunc('main.gd', 'inspect_tenderloin_museum_hub'), /var docent_world := MUSEUM_HUB_POS \+ Vector3\(-1\.4, 0\.0, 1\.15\) \* 1\.75/);
  assert.match(gdFunc('main.gd', 'update_museum_portal_3d'), /float\(museum_hub_step \* 30 \+ r_i \* 25\)/);
  // The save rules surprises.js mirrors.
  assert.match(gdFunc('main.gd', 'build_save_envelope'), /if s_id in NEIGHBORHOOD_SURPRISE_IDS:\n\t+s_list\.append\(s_id\)\n\ts_list\.sort\(\)/);
  assert.match(gdFunc('main.gd', 'apply_save_envelope'), /var raw_surprises: Variant = env\.get\("discovered_surprises", \[\]\)\n\tif raw_surprises is Array:\n\t\tfor s_entry in raw_surprises:\n\t\t\tif s_entry is String and String\(s_entry\) in NEIGHBORHOOD_SURPRISE_IDS:/);
  // The fork's own id list equals Godot's.
  return import('../browser-next/godot-save.js').then(save => assert.deepEqual(save.SURPRISE_IDS, MAIN.NEIGHBORHOOD_SURPRISE_IDS));
});

test('data copied into positions.js equals godot/data', () => {
  assert.deepEqual(P.LARKIN_JUNCTION_XZ, POWER_PLACE.junction.xz);
  assert.deepEqual(P.LARKIN_ADDRESS_XZ, POWER_PLACE.address_point.xz);
  assert.deepEqual(P.TAYLOR_EDDY_XZ, POWER_PLACE.return_junction.xz);
  assert.deepEqual(P.EDDY_XZ, POWER_PLACE.eddy.points);
  assert.deepEqual(P.LARKIN_RING_XZ, POWER_PLACE.exterior.polygons[0].rings[0]);
  assert.deepEqual(P.ELECTION_OBSERVATION_XZ, VOTING.sites.map(s => s.observation));
  assert.deepEqual(P.ELECTION_PIN_XZ, VOTING.sites.map(s => s.xz));
  assert.deepEqual(election.sourceGoals(VOTING), P.ELECTION_GOALS);
  // The fork serves byte copies of both files from its own data folder (same-origin ./data/<name>).
  const bytes = path => readFileSync(new URL(`../${path}`, import.meta.url));
  for (const name of ['power_place.json', 'voting_places.json']) assert.ok(bytes(`browser-next/data/${name}`).equals(bytes(`godot/data/${name}`)), `browser-next/data/${name} is a byte copy of godot/data/${name}`);
});

// ---------------------------------------------------------------- format
test('GDScript formatting helpers', () => {
  assert.equal(gdf('a %d b %s c %.0f d %.2f %%', [2.9, 'x', 3.5, 1.005 + 1]), 'a 2 b x c 4 d 2.00 %');
  assert.equal(gdf('<x %d>', 7), '<x 7>');
  assert.throws(() => gdf('%d %d', [1]));
  assert.equal(gdFloat(126), '126.0');
  assert.equal(gdFloat(-44), '-44.0');
  assert.equal(gdFloat(0.5), '0.5');
  assert.equal(gdFloat(f32(132.48)), '132.479995727539', 'a float32 Vector2 component prints its float32 digits');
  assert.equal(gdCapitalize('lemongrass beef pho'), 'Lemongrass Beef Pho');
  assert.equal(gdCapitalize('1961 live jazz LP'), '1961 Live Jazz Lp');
  assert.equal(gdCapitalize('condensed-milk iced coffee'), 'Condensed-milk Iced Coffee');
  assert.equal(gdCapitalize('soul 45 on the jukebox'), 'Soul 45 On The Jukebox');
});

// ---------------------------------------------------------------- Before These Streets
test('Before These Streets: gate, bounds, observations and sources', () => {
  const B = before;
  assert.equal(B.changeBefore(B.initialBefore(), { type: 'open' }, { walking: true }).announce, GODOT_TEXT['before_streets.gd'].open_opening.refuse);
  assert.equal(B.changeBefore(B.initialBefore(), { type: 'open' }, { storyCard: true }).refused, true, 'a non-startup card refuses');
  let r = B.changeBefore(B.initialBefore(), { type: 'open' }, { storyCard: true, startupCard: true });
  let b = r.state;
  assert.equal(b.open, true); assert.equal(b.fromStartup, true);
  assert.equal(B.beforeView(b).buttons.at(-1).label, 'Back to start');
  assert.equal(B.beforeView(b).buttons[0].disabled, true, 'Previous is disabled on the first view');
  for (const i of [-1, 3, 1.5]) assert.equal(B.changeBefore(b, { type: 'view', index: i }).state, b);
  b = B.changeBefore(b, { type: 'view', index: 2 }).state;
  assert.equal(B.beforeView(b).buttons[1].disabled, true, 'Send a gust is disabled on the last view');
  assert.equal(B.changeBefore(b, { type: 'observe', index: 2 }).state, b, 'only two observations');
  b = B.changeBefore(b, { type: 'observe', index: 1 }).state;
  assert.ok(B.readerText(b).startsWith(B.REPLIES[1] + '\n\n' + B.FRAME));
  assert.ok(B.readerText(b).endsWith(GODOT_TEXT['before_streets.gd'].refresh.observed));
  assert.deepEqual(B.beforeView(b).buttons.filter(x => 'pressed' in x).map(x => x.pressed), [false, true]);
  b = B.changeBefore(b, { type: 'sources' }).state;
  assert.equal(B.readerText(b), B.FRAME + '\n\n' + B.SOURCES);
  assert.equal(B.beforeView(b).buttons[4].label, 'Back to scene');
  assert.equal(B.artDescription(0, -1), 'Schematic regional illustration, view 1 of 3: low sand ridges. No mapped settlement or cultural scene.');
  assert.equal(B.changeBefore(b, { type: 'close' }).announce, B.FRAME + GODOT_TEXT['before_streets.gd'].close_opening.closed);
  assert.deepEqual(B.sourceLines().filter(l => l.url).map(l => l.url), ['https://www.nps.gov/places/000/dune-habitat-a-once-common-now-rare-commodity.htm', 'https://www.ramaytush.org/', 'https://www.ramaytushtribe.org/research.html']);
});

test('Before These Streets artwork: well-formed SVG for every view and card', () => {
  for (const view of [0, 1, 2]) for (const choice of [-1, 0, 1]) {
    const svg = before.artwork(view, choice);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="720" height="440" viewBox="0 0 720 440">.*<\/svg>$/);
    assert.equal((svg.match(/"/g) || []).length % 2, 0);
    assert.equal(svg.includes('<rect x="450" y="247"'), choice >= 0, 'the speech card only with a choice');
    assert.equal(svg.includes('r="3" fill="#f3dcb0"'), view > 0, 'grains only after a gust');
    assert.doesNotMatch(svg, /NaN|undefined|\.\d/);
  }
  // Integer division as Godot: view 1 shifts the strokes by 64/3 -> 21.
  assert.ok(before.artwork(1, -1).includes('<path d="M70 365Q116 345 146 361"'));
  assert.ok(before.artworkDataURI(0, -1).startsWith('data:image/svg+xml;charset=utf-8,%3Csvg'));
});

// ---------------------------------------------------------------- Cook & Share
test('Cook & Share: refusals in Godot order', () => {
  const O = GODOT_TEXT['shared_meal.gd'].open_meal;
  assert.equal(meal.mealRefusal({ opened: false, storyActive: true }), O.closed);
  assert.equal(meal.mealRefusal({ opened: true, storyActive: true, walking: true }), O.story);
  assert.equal(meal.mealRefusal({ opened: true, walking: true, hostingInProgress: true }), O.busy);
  assert.equal(meal.mealRefusal({ opened: true, hostingInProgress: true }), O.hosting);
  assert.equal(meal.mealRefusal({ opened: true }), '');
});

test('Cook & Share: reveal order, invitations and re-preparation', () => {
  let m = meal.changeMeal(meal.initialMeal(), { type: 'open' }, { opened: true }).state;
  const cooks = [];
  const cook = () => { for (let i = 0; i < 5; i++) m = meal.changeMeal(m, { type: 'advance' }).state; };
  for (let i = 0; i < 4; i++) {
    cooks.push(meal.RECIPES[m.selected].cook);
    assert.equal(meal.mealView(m).share.disabled, true);
    cook();
    assert.equal(meal.mealView(m).share.disabled, false);
    m = meal.changeMeal(m, { type: 'serving', index: i % 2 }).state;
    m = meal.changeMeal(m, { type: 'shareOrFollow' }).state;
    assert.equal(m.message, meal.RECIPES[i].recognition[i % 2]);
    assert.equal(m.invitation, i < 3 ? i + 1 : 0);
    assert.equal(m.revealed, Math.min(4, i + 2));
    if (i < 3) {
      assert.equal(meal.mealView(m).share.label, 'Follow this invitation');
      m = meal.changeMeal(m, { type: 'shareOrFollow' }).state; // follows
      assert.equal(m.selected, i + 1);
    }
  }
  assert.deepEqual(cooks, ['Nura', 'Mei', 'Mali', 'Grace'].slice(0, 4).map((_, i) => meal.RECIPES[i].cook));
  assert.equal(meal.sharedCount(m), 4);
  assert.equal(meal.followTarget(m), 0, 'the last cook invites back to Nura');
  // A new preparation keeps the shared dish until shared again.
  m = meal.changeMeal(m, { type: 'advance' }).state;
  assert.equal(m.steps[3], 0); assert.equal(m.generations[3], 1);
  assert.equal(m.message, GODOT_TEXT['shared_meal.gd'].advance.again);
  assert.ok(meal.worldDishes(m, { opened: true }).some(d => d.index === 3));
  assert.equal(meal.currentPreparationShared(m), false);
  assert.deepEqual(meal.worldDishes(m, { opened: true, storyActive: true }), []);
  assert.equal(meal.changeMeal(m, { type: 'previous' }).state.selected, 2);
  assert.equal(meal.changeMeal(m, { type: 'next' }).state.selected, 0);
});

test('Cook & Share: text, cue and art', () => {
  const m = meal.changeMeal(meal.initialMeal(), { type: 'open' }, { opened: true }).state;
  const v = meal.mealView(m), r = meal.RECIPES[0];
  assert.equal(v.heading, `${r.cook} | ${r.title}`);
  assert.ok(v.text.includes(`\nStep 1/5: ${r.steps[0][1]}`));
  assert.equal(v.prepare, r.steps[0][0]);
  assert.equal(meal.cue(m), `${r.cook} | ${r.title}. Step 1 of5: ${r.steps[0][0]}. ${r.steps[0][1]}`);
  assert.equal(meal.artDescription(1, 5, 1), 'Original illustration: pale rectangular daikon cakes with browned faces. Preparation 5/5. Tasting plates.');
  for (let i = 0; i < 4; i++) for (let stage = 0; stage <= 5; stage++) for (const style of [0, 1]) for (const world of [false, true]) {
    const svg = meal.artwork(i, stage, style, world);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 720 480">.*<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined/);
    assert.equal(svg.includes('translate(320 135) scale(0.5)'), style === 1 && (stage >= 5 || world));
  }
});

// ---------------------------------------------------------------- episodes: shared context
const at = p => ({ x: p.x, y: p.y });
const baseCtx = (extra = {}) => ({ opened: true, player: at(P.START), powerPlace: POWER_PLACE, voting: VOTING, ...extra });

test('Two Dogs Home: leads, wrong profile, repeat match, reunion and invitation', () => {
  let s = picker.initialStories();
  const ctx = baseCtx();
  const act = (action, extra = {}) => { const r = picker.changeEpisode(s, 'dogs', action, { ...ctx, ...extra }); s = r.stories; return r; };
  act({ type: 'open' });
  assert.equal(s.dogs.open, true);
  act({ type: 'lead', index: 0 });
  assert.equal(s.dogs.lead, -1, 'leads need Begin');
  act({ type: 'begin' });
  assert.equal(s.dogs.active, true);
  act({ type: 'lead', index: 1 });
  let r = act({ type: 'walk' });
  assert.deepEqual(r.walk, P.DOG_GOALS[1]);
  assert.equal(s.dogs.open, false);
  act({ type: 'arrived' }, { player: at(P.DOG_GOALS[1]) });
  assert.equal(s.dogs.open, true, 'arrival reopens the screen');
  const here = { player: at(P.DOG_GOALS[1]) };
  act({ type: 'match' }, here);
  assert.equal(s.dogs.message, 'This is tall cream dog, upright ears, green collar and TRIANGLE tag. That differs from Pippin\'s note. Try the other profile; there is no penalty.');
  act({ type: 'profile', index: 1 }, here);
  act({ type: 'match' }, here);
  assert.equal(s.dogs.found, 2);
  act({ type: 'match' }, here);
  assert.equal(s.dogs.message, 'Junebug is already matched. Find the other dog, then meet both owners at the gathering.');
  // The gathering before both are found.
  act({ type: 'lead', index: 2 });
  const home = { player: at(P.DOG_GOALS[2]) };
  assert.equal(dogs.dogsView(s.dogs, { ...ctx, ...home }).buttons[8].label, 'Match dog');
  act({ type: 'match' }, home);
  assert.equal(s.dogs.message, GODOT_TEXT['dog_story.gd'].match_dog.noDog);
  assert.equal(s.picker.lanternInvited, false);
  act({ type: 'lead', index: 0 }); act({ type: 'profile', index: 0 });
  act({ type: 'match' }, { player: at(P.DOG_GOALS[0]) });
  assert.equal(s.dogs.found, 3);
  act({ type: 'lead', index: 2 });
  assert.equal(dogs.dogsView(s.dogs, { ...ctx, ...home }).buttons[8].label, 'Reunite');
  act({ type: 'match' }, home);
  assert.equal(s.dogs.won, true);
  assert.equal(s.picker.lanternInvited, true);
  assert.equal(s.picker.completed[3], 'Two Dogs Home');
  assert.equal(dogs.objective(s.dogs).text, 'Two Dogs Home: Reunited!');
  assert.equal(dogs.dogsScene(s.dogs).owners.length, 2);
  // Ending clears play state; the invitation stays for the visit.
  act({ type: 'end' });
  assert.equal(s.dogs.active, false); assert.equal(s.dogs.found, 0);
  assert.equal(s.picker.lanternInvited, true);
  assert.equal(dogs.objective(dogs.initialDogs()).text, 'Two Dogs Home: 0/2 matched - choose a lead');
});

test('Two Dogs Home: refusals, blocked walks and art', () => {
  assert.equal(dogs.openRefusal(dogs.initialDogs(), { opened: true, activeId: 'power' }), GODOT_TEXT['dog_story.gd'].open_story.refuse);
  assert.equal(dogs.openRefusal(dogs.initialDogs(), { opened: true, activeId: 'dogs' }), '');
  assert.equal(dogs.openRefusal(dogs.initialDogs(), { opened: true, walking: true }), GODOT_TEXT['dog_story.gd'].open_story.refuse);
  let d = { ...dogs.initialDogs(), open: true, active: true, lead: 0, traveling: true };
  const r = dogs.changeDogs(d, { type: 'arrived' }, { opened: true, player: { x: 0, y: 0 } });
  assert.equal(r.state.traveling, false);
  assert.equal(r.announce, GODOT_TEXT['dog_story.gd'].blocked_route.blocked);
  for (const i of [0, 1]) assert.match(dogs.illustration(i), /^<svg[^>]*viewBox="0 0 360 240">.*<\/svg>$/);
});

test('Lantern Procession: progress is monotonic, capped and only on the route', () => {
  let l = lantern.changeLantern(lantern.initialLantern(), { type: 'open' }, baseCtx()).state;
  l = lantern.changeLantern(l, { type: 'begin' }, baseCtx()).state;
  let r = lantern.changeLantern(l, { type: 'walk' }, baseCtx());
  close(r.walk, lantern.routePoint(8), 1e-9, 'assembly');
  l = lantern.changeLantern(r.state, { type: 'arrived' }, baseCtx({ player: r.walk })).state;
  assert.equal(l.open, true);
  // Costume locks after Gather.
  l = lantern.changeLantern(l, { type: 'costume', value: 1 }).state;
  assert.equal(l.costume, 1);
  l = lantern.changeLantern(l, { type: 'advance' }, baseCtx({ player: r.walk })).state;
  assert.equal(l.phase, 1);
  assert.equal(lantern.changeLantern(l, { type: 'costume', value: 0 }).state.costume, 1);
  // Welcome is refused before LENGTH - 1.
  assert.equal(lantern.lanternView(l, baseCtx({ player: lantern.routePoint(36) })).buttons[6].disabled, true);
  r = lantern.changeLantern(l, { type: 'walk' }, baseCtx({ player: lantern.routePoint(8) }));
  close(r.walk, lantern.routePoint(36), 1e-9, 'finish');
  l = r.state;
  let last = l.progress;
  // Off the route (5 m north): nothing counts.
  for (let m = 9; m < 14; m++) {
    const p = lantern.routePoint(m);
    l = lantern.changeLantern(l, { type: 'tick' }, { player: { x: p.x, y: p.y - 25 } }).state;
    assert.equal(l.progress, last);
  }
  // Walking along the route, metre by metre, then beyond the end and backwards.
  for (let m = 8; m <= 40; m++) {
    l = lantern.changeLantern(l, { type: 'tick' }, { player: lantern.routePoint(Math.min(m, 36)) }).state;
    assert.ok(l.progress >= last, 'never decreases'); last = l.progress;
  }
  assert.ok(l.progress <= 36 && near(l.progress, 36, 1e-9), 'capped at LENGTH');
  const top = l.progress;
  l = lantern.changeLantern(l, { type: 'tick' }, { player: lantern.routePoint(10) }).state;
  assert.equal(l.progress, top, 'walking back never lowers it');
  l = lantern.changeLantern(l, { type: 'arrived' }, baseCtx({ player: lantern.routePoint(36) })).state;
  assert.equal(l.open, true);
  assert.equal(lantern.objective(l).text, 'Lantern Procession: Lead the lanterns - 0 m left');
  l = lantern.changeLantern(l, { type: 'advance' }, { player: lantern.routePoint(36) }).state;
  assert.equal(l.won, true);
  assert.equal(lantern.objective(l).text, 'Lantern Procession: Welcome home!');
  assert.equal(lantern.lanternScene(l).visitors.length, 2);
  assert.equal(lantern.objective({ ...l, won: false, progress: 8.4 }).text, 'Lantern Procession: Lead the lanterns - 28 m left');
});

test('Lantern Procession: a far-off group means a return trip first, and refusals', () => {
  const l = { ...lantern.initialLantern(), open: true, active: true, phase: 1, progress: 20 };
  const r = lantern.changeLantern(l, { type: 'walk' }, { player: lantern.routePoint(8) });
  assert.equal(r.state.returning, true);
  close(r.walk, lantern.routePoint(20), 1e-9);
  const back = lantern.changeLantern(r.state, { type: 'arrived' }, { player: lantern.routePoint(20) });
  assert.equal(back.state.message, GODOT_TEXT['lantern_procession.gd']._process.back);
  assert.equal(lantern.openRefusal(lantern.initialLantern(), { opened: true, sites: { lantern: false } }), GODOT_TEXT['lantern_procession.gd'].open_story.noRoute);
  assert.equal(lantern.openRefusal(lantern.initialLantern(), { opened: true, activeId: 'dogs' }), GODOT_TEXT['lantern_procession.gd'].open_story.refuse);
  for (const c of [0, 1]) for (const k of [0, 1]) assert.match(lantern.artwork(c, k), /^<svg.*<\/svg>$/);
});

test('Power Story: exactly one solution per relay, pinned', () => {
  for (let st = 0; st < 3; st++) {
    const sols = [];
    for (let i = 0; i < 256; i++) {
      const t = [i & 3, (i >> 2) & 3, (i >> 4) & 3, (i >> 6) & 3], turns = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      turns[st] = t;
      if (power.connected(turns, st)) sols.push(t.join(''));
    }
    assert.deepEqual(sols, [power.SOLUTIONS[st]], `relay ${st}`);
    assert.equal(power.connected(power.INITIAL_TURNS(), st), false, 'the initial turns do not connect');
  }
});

function solve(p, ctx) {
  const target = power.SOLUTIONS[p.station].split('').map(Number);
  for (let i = 0; i < 4; i++) while (p.turns[p.station][i] !== target[i]) p = power.changePower(p, { type: 'rotate', index: i }, ctx).state;
  return power.changePower(p, { type: 'check' }, ctx).state;
}
test('Power Story: festival run restores three relays', () => {
  let p = power.changePower(power.initialPower(), { type: 'open' }, baseCtx()).state;
  assert.equal(power.powerView(p, baseCtx()).heading, 'Neighborhood Stories');
  p = power.changePower(p, { type: 'begin' }, baseCtx()).state;
  assert.equal(p.message, GODOT_TEXT['power_story.gd'].begin.festival);
  for (let st = 0; st < 3; st++) {
    p = power.changePower(p, { type: 'choose', index: st }, baseCtx()).state;
    const r = power.changePower(p, { type: 'walk' }, baseCtx());
    assert.deepEqual(r.walk, P.RELAY_GOALS[st]);
    assert.equal(r.announce, `Walking to ${power.NAMES[st]}. Stop Walking cancels. Its repair view opens after arrival.`);
    const here = baseCtx({ player: at(P.RELAY_GOALS[st]) });
    p = power.changePower(r.state, { type: 'arrived' }, here).state;
    assert.equal(p.open, true);
    const before = power.changePower(p, { type: 'check' }, here).state;
    assert.equal(before.message, GODOT_TEXT['power_story.gd'].check_path.notYet);
    p = solve(p, here);
    assert.ok((p.restored & (1 << st)) !== 0);
    assert.equal(power.powerView(p, here).tabs[st].label, `Relay ${st + 1} OK`);
  }
  assert.equal(p.won, true);
  assert.equal(p.message, GODOT_TEXT['power_story.gd'].check_path.won);
  assert.equal(power.objective(p).text, 'Power Story: You brought the lights back! (3/3 lights restored)');
  assert.equal(power.powerScene(p).pools, true);
  p = power.changePower(p, { type: 'end' }, baseCtx()).state;
  assert.equal(power.powerView(p, baseCtx()).heading, 'Lights Back On | Story ended');
  assert.equal(power.powerView(p, baseCtx()).actions[0].label, 'Replay\nstory');
  assert.equal(power.powerScene(p).afterDark, false, 'End story restores drawing');
});

test('Power Story: Larkin 2017 goal, distances, refusals and map', () => {
  const ctx = baseCtx();
  let p = power.changePower(power.initialPower(), { type: 'open' }, ctx).state;
  p = power.changePower(p, { type: 'choose', index: 1 }, ctx).state;
  assert.equal(p.historical, true); assert.equal(p.mapView, true);
  assert.equal(power.powerView(p, ctx).picture, 'map');
  assert.equal(power.changePower(p, { type: 'begin' }, { ...ctx, powerPlace: null }).state.active, false, 'no data, no Begin');
  assert.ok(power.powerView(p, { ...ctx, powerPlace: null }).text.startsWith(GODOT_TEXT['power_story.gd'].refresh.unavailable));
  p = power.changePower(p, { type: 'begin' }, ctx).state;
  assert.equal(p.active, true);
  assert.equal(power.objective(p).target, P.LARKIN_JUNCTION);
  const r = power.changePower(p, { type: 'walk' }, ctx);
  assert.equal(r.walk, P.LARKIN_JUNCTION);
  const here = baseCtx({ player: at(P.LARKIN_JUNCTION) });
  p = power.changePower(r.state, { type: 'arrived' }, here).state;
  const away = power.powerView(p, ctx).text;
  assert.ok(away.includes('The battery view opens when you arrive') && !away.includes('repair surface'), 'Larkin says battery view');
  assert.ok(power.powerView(p, here).text.includes('\nApril 21, 2017 inspired fiction | Larkin / Eddy battery light.\n'));
  p = solve(p, here);
  assert.equal(p.message, 'Bea: "Our portable light is ready. Thanks for looking after your neighbors."');
  p = power.changePower(p, { type: 'choose', index: 1 }, here).state;
  const text = power.powerView(p, here).text;
  assert.match(text, /This imagined gathering station is (\d+) m from Larkin\/Eddy/);
  assert.equal(Number(/station is (\d+) m/.exec(text)[1]), Math.round(Math.hypot(62 - P.LARKIN_JUNCTION_XZ[0], 5.6 - P.LARKIN_JUNCTION_XZ[1])));
  assert.equal(power.powerScene(p).batteryStand.lit, true);
  assert.equal(power.powerScene(p).relays[0].visible, false);
  assert.equal(power.openRefusal(power.initialPower(), { opened: false }), GODOT_TEXT['power_story.gd'].open_story.refuse);
  assert.equal(power.entryTooltip(), 'Neighborhood Stories');
  // Map and diagram SVGs: numbers parse and stay inside the 360 x 240 view.
  const map = power.mapSVG(POWER_PLACE);
  const nums = [...map.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
  assert.ok(nums.every(Number.isFinite));
  assert.match(map, /<polygon points="([\d.]+,[\d.]+ ){7}"/);
  assert.equal(power.mapSVG(null), '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="#18323b"/></svg>');
  const j = power.mapPoint(POWER_PLACE.junction.xz);
  assert.ok(j.x > 0 && j.x < 360 && j.y > 0 && j.y < 240);
  const d = power.diagram(power.initialPower());
  assert.equal((d.match(/<rect x="\d+" y="\d+" width="88"/g) || []).length, 4);
  assert.ok(d.includes('<circle cx="126.0" cy="64.0" r="5" fill="#d29060"/>'), 'Godot float formatting');
});

test('Power Story: valid_source accepts the file and rejects broken data', () => {
  assert.equal(power.validSource(POWER_PLACE), true);
  const broken = [
    v => { delete v.eddy; }, v => { v.junction.xz = [1]; }, v => { v.eddy.points = [[0, 0]]; }, v => { v.exterior.polygons = []; },
    v => { v.exterior.polygons[0].rings.push([]); }, v => { v.exterior.polygons[0].triangles = [0, 1]; }, v => { v.exterior.polygons[0].triangles[0] = 99; },
    v => { v.exterior.polygons[0].triangles[0] = 0.5; }, v => { v.exterior.height_m = 0; }, v => { v.address_point.xz = [0, Infinity]; },
  ];
  for (const f of broken) { const v = structuredClone(POWER_PLACE); f(v); assert.equal(power.validSource(v), false, f.toString()); }
  assert.equal(power.validSource(null), false); assert.equal(power.validSource([]), false);
});

test('Election Walk: valid_source pins every field', () => {
  assert.equal(election.validSource(VOTING), true);
  const pinned = [['format', 2], ['election', '2024-11-06'], ['published', '2024-10-04']];
  for (const [k, v] of pinned) assert.equal(election.validSource({ ...VOTING, [k]: v }), false, k);
  for (const i of [0, 1]) for (const k of ['id', 'eas_id', 'address', 'room']) {
    const v = structuredClone(VOTING); v.sites[i][k] += 'x';
    assert.equal(election.validSource(v), false, `site ${i} ${k}`);
  }
  for (const k of ['xz', 'observation', 'lonlat', 'centerline']) { const v = structuredClone(VOTING); v.sites[0][k] = [1]; assert.equal(election.validSource(v), false, k); }
  const v = structuredClone(VOTING); v.streets[0].points[0] = [0, 'x'];
  assert.equal(election.validSource(v), false);
  assert.equal(election.validSource({ ...VOTING, sites: [VOTING.sites[0]] }), false);
});

test('Election Walk: the phase machine from Begin to Share', () => {
  const ctx = baseCtx();
  let s = picker.initialStories();
  const act = (action, extra = {}) => { const r = picker.changeEpisode(s, 'election', action, { ...ctx, ...extra }); s = r.stories; return r; };
  act({ type: 'open' });
  assert.equal(s.election.open, true);
  assert.equal(election.available({ ...ctx, powerPlace: null }), false, 'needs the Larkin data');
  act({ type: 'begin' });
  assert.equal(s.election.phase, 1);
  for (const i of [0, 1]) {
    act({ type: 'choose', index: i });
    assert.equal(s.election.message, `Selected ${VOTING.sites[i].address}.`);
    const r = act({ type: 'walk' });
    assert.deepEqual(r.walk, P.ELECTION_GOALS[i]);
    const here = { player: at(P.ELECTION_GOALS[i]) };
    act({ type: 'arrived' }, here);
    assert.equal(s.election.open, true);
    act({ type: 'record' }, here);
    assert.ok(s.election.message.startsWith(`Recorded ${VOTING.sites[i].listed_description}, ${VOTING.sites[i].address}`));
  }
  assert.ok(s.election.message.endsWith(' Both records found! Choose Make map.'));
  act({ type: 'make' });
  assert.equal(s.election.phase, 2);
  assert.ok(election.electionView(s.election, ctx).pins.every(p => p.visible && p.x > 0 && p.x < 360 && p.y > 0 && p.y < 240));
  act({ type: 'place', index: 0 });
  assert.equal(s.election.placed, 0, 'a mismatch is harmless');
  assert.ok(s.election.message.startsWith('That pin belongs to 380 Eddy St.'));
  act({ type: 'place', index: 1 });
  act({ type: 'choose', index: 0 }); act({ type: 'place', index: 0 });
  assert.equal(s.election.phase, 3);
  assert.equal(election.objective(s.election, ctx).text, 'Election Walk: Return and share your map');
  const r = act({ type: 'walk' });
  assert.deepEqual(r.walk, P.ELECTION_HOME);
  act({ type: 'arrived' }, { player: at(P.ELECTION_HOME) });
  act({ type: 'share' }, { player: at(P.ELECTION_HOME) });
  assert.equal(s.election.won, true);
  assert.equal(election.electionView(s.election, ctx).heading, 'Election Walk 2024 | Shared!');
  const svg = election.paperSVG(s.election, VOTING);
  assert.equal((svg.match(/fill="#276a5a"/g) || []).length, 2);
  assert.equal((svg.match(/l4 4 8-10/g) || []).length, 2);
  assert.match(svg, /^<svg[^>]*>.*<\/svg>$/);
  assert.ok(election.sourceText(s.election, ctx).includes('SELECTED: Cadillac Hotel - 380 Eddy St - Lobby. City EAS 490999'));
});

// ---------------------------------------------------------------- picker
test('Picker: suspend and resume keep each episode, refused selection restores the owner', () => {
  const ctx = baseCtx();
  let s = picker.initialStories();
  s = picker.changeEpisode(s, 'dogs', { type: 'open' }, ctx).stories;
  s = picker.changeEpisode(s, 'dogs', { type: 'begin' }, ctx).stories;
  s = picker.changeEpisode(s, 'dogs', { type: 'lead', index: 1 }, ctx).stories;
  assert.equal(picker.activeEpisode(s), 'dogs');
  let r = picker.openPicker(s, ctx);
  assert.equal(r.stories.dogs.open, false, 'the episode screen closes behind the picker');
  assert.equal(r.stories.picker.openedFromReader, true);
  assert.equal(picker.pickerView(r.stories, ctx).entries[3].label, 'Continue: Two Dogs Home');
  // Select Power: dogs pause with their lead kept.
  r = picker.selectStory(r.stories, 2, ctx);
  assert.equal(r.ok, true);
  s = r.stories;
  assert.equal(s.dogs.active, false); assert.equal(s.dogs.lead, 1);
  assert.deepEqual(s.picker.suspended, ['dogs']);
  assert.equal(s.power.open, true);
  assert.equal(picker.pickerView(s, ctx).entries[3].label, 'Resume: Two Dogs Home');
  // Back to dogs: resumed, no reset.
  s = picker.changeEpisode(s, 'power', { type: 'close' }, ctx).stories;
  s = picker.openPicker(s, ctx).stories;
  r = picker.selectStory(s, 3, ctx);
  assert.equal(r.ok, true);
  assert.equal(r.stories.dogs.active, true); assert.equal(r.stories.dogs.lead, 1);
  assert.deepEqual(r.stories.picker.suspended, []);
  // A refused open (lantern route invalid) keeps the previous owner and the picker.
  s = picker.openPicker(picker.changeEpisode(r.stories, 'dogs', { type: 'close' }, ctx).stories, ctx).stories;
  assert.equal(picker.selectStory(s, 0, { ...ctx, route: [] }).ok, false, 'an unavailable entry does nothing');
  const refused = picker.selectStory(s, 0, { ...ctx, busy: true });
  assert.equal(refused.ok, false);
  assert.equal(picker.activeEpisode(refused.stories), 'dogs');
  assert.equal(refused.announce, GODOT_TEXT['story_picker.gd'].select_story.refused);
  // Keep exploring pauses the active story.
  const k = picker.keepExploring(s);
  assert.equal(picker.activeEpisode(k.stories), null);
  assert.deepEqual(k.stories.picker.suspended, ['dogs']);
  assert.equal(k.announce, GODOT_TEXT['story_picker.gd'].keep_exploring.announce);
});

test('Picker: pages, completed labels, the invitation and its text', () => {
  const ctx = baseCtx();
  let s = picker.openPicker(picker.initialStories(), ctx).stories;
  let v = picker.pickerView(s, ctx);
  assert.deepEqual(v.entries.map(e => e.visible), [true, true, false, false]);
  assert.equal(v.earlier.disabled, true); assert.equal(v.earlier.rapid, true);
  assert.ok(!v.text.includes('F8'), 'no 3D key hint');
  assert.equal(v.follow.visible, false);
  s = picker.changePage(picker.changePage(s, 1), 1);
  assert.equal(s.picker.page, 1);
  assert.deepEqual(picker.pickerView(s, ctx).entries.map(e => e.visible), [false, false, true, true]);
  // Completed labels follow `historical`.
  const won = { ...s, power: { ...s.power, won: true, historical: true } };
  assert.equal(picker.rememberCompleted(won).picker.completed[2], 'Larkin 2017');
  assert.equal(picker.rememberCompleted({ ...won, power: { ...won.power, historical: false } }).picker.completed[2], 'Lights Back On');
  // The invitation exists only after the reunion.
  const invited = { ...s, picker: { ...s.picker, lanternInvited: true, completed: { 3: 'Two Dogs Home' } } };
  v = picker.pickerView(invited, ctx);
  assert.ok(v.text.startsWith('Imani: "Pippin and Junebug are home.'));
  assert.ok(v.text.includes('Completed this visit: Two Dogs Home.\n'));
  assert.equal(v.focus, 'follow');
  const f = picker.followInvitation(invited, ctx);
  assert.equal(f.ok, true);
  assert.equal(f.stories.picker.invitationFollowed, true);
  assert.equal(f.stories.lantern.open, true);
  assert.equal(picker.followInvitation(s, ctx).ok, false, 'no invitation, nothing to follow');
  assert.equal(picker.openPicker(picker.initialStories(), { ...ctx, opened: false }).refused, true);
  assert.equal(picker.openPicker(picker.initialStories(), { ...ctx, busy: true }).announce, GODOT_TEXT['story_picker.gd'].open_picker.refuse);
  assert.equal(picker.readerEntry().name, "Other story visits. Keep this visit's progress.");
  assert.equal(picker.backToStories(s, ctx).announce, GODOT_TEXT['story_picker.gd'].back_to_stories.announce);
});

test('Picker: Power delegates to another active episode', () => {
  const ctx = baseCtx();
  let s = picker.changeEpisode(picker.initialStories(), 'lantern', { type: 'open' }, ctx).stories;
  s = picker.changeEpisode(s, 'lantern', { type: 'begin' }, ctx).stories;
  s = picker.changeEpisode(s, 'lantern', { type: 'close', announce: false }, ctx).stories;
  const r = picker.openEpisode(s, 'power', ctx);
  assert.equal(r.stories.lantern.open, true);
  assert.equal(r.stories.power.open, false);
  assert.equal(picker.activeObjective(r.stories, ctx).id, 'lantern_procession');
});

// ---------------------------------------------------------------- surprises
test('Surprises: Godot load and write normalization of discovered_surprises', () => {
  assert.deepEqual(surprises.readDiscovered(undefined), []);
  assert.deepEqual(surprises.readDiscovered('cutesy_dino'), [], 'not an Array: empty');
  assert.deepEqual(surprises.readDiscovered({ 0: 'cutesy_dino' }), []);
  assert.deepEqual(surprises.readDiscovered(['mayor_pomp_event', 7, null, 'mayor_pomp_event', 'future_id', 'cutesy_dino', ['x']]), ['mayor_pomp_event', 'cutesy_dino']);
  assert.deepEqual(surprises.writeDiscovered(['mayor_pomp_event', 'cutesy_dino', 'future_id', 'cutesy_dino']), ['cutesy_dino', 'mayor_pomp_event']);
  assert.deepEqual(surprises.writeDiscovered([...surprises.SURPRISE_IDS].reverse()), [...surprises.SURPRISE_IDS].sort());
  assert.equal(JSON.stringify(surprises.writeDiscovered(surprises.SURPRISE_IDS)).length, 194, 'all ten ids sorted: 194 bytes of JSON');
  assert.deepEqual(surprises.discover([], 'nope'), []);
  const one = surprises.discover([], 'cutesy_dino');
  assert.equal(surprises.discover(one, 'cutesy_dino'), one);
});

test('Surprises: next id, cycling, inspect texts, finale and memory lines', () => {
  assert.equal(surprises.nextSurpriseId([]), 'jeffrey_record');
  assert.equal(surprises.nextSurpriseId([], 'bea'), 'mayor_pomp_event');
  assert.equal(surprises.nextSurpriseId(['mayor_pomp_event'], 'bea'), 'good_donut_and_bagel');
  assert.equal(surprises.nextSurpriseId(['mayor_pomp_event', 'good_donut_and_bagel'], 'bea', 'cutesy_dino'), 'cutesy_dino');
  assert.equal(surprises.nextSurpriseId(['jeffrey_record'], null, 'jeffrey_record'), 'hidden_mural_145');
  assert.equal(surprises.nextSurpriseId(surprises.SURPRISE_IDS), '');
  assert.equal(surprises.cycleTarget(-1, []), 0);
  assert.equal(surprises.cycleTarget(9, []), 0);
  assert.equal(surprises.cycleTarget(2, [], { objectiveSurpriseId: 'cutesy_dino' }), 4);
  assert.equal(surprises.cycleTarget(2, [], { lastHinted: 'mayor_pomp_event' }), 9);
  assert.equal(surprises.cycleTarget(2, [], { target: 7 }), 7);
  // First find, with Rook's dialog open.
  let r = surprises.inspect([], 'jeffrey_record', { openNeighborId: 'rook', lastHinted: 'jeffrey_record' });
  assert.equal(r.newly, true); assert.equal(r.finale, false);
  assert.equal(r.heading, "Surprise Found: Jeffrey's Lost 1961 Record");
  assert.equal(r.burstSub, "1/10 Surprises · Sparks: 0 · Keepsake: Jeffrey's 1961 LP on Rook's speaker");
  assert.equal(r.line, "Jeffrey's Lost 1961 Record — 361 Turk St sidewalk (beside the 'So What' awning) (1/10 Surprises Found)");
  assert.ok(!r.sub.includes('Shift'));
  assert.ok(r.memory.startsWith('Rook: "You brought Jeffrey'));
  assert.equal(r.lastHinted, '');
  assert.equal(r.guideIdx, 0);
  // Inspecting again is not new; another neighbor's dialog clears the memory line.
  assert.equal(surprises.inspect(r.found, 'jeffrey_record').newly, false);
  assert.equal(surprises.inspect([], 'cutesy_dino', { openNeighborId: 'rook' }).memory, '');
  // The tenth new find is the finale; a repeat of the tenth is not.
  const nine = surprises.SURPRISE_IDS.slice(0, 9);
  r = surprises.inspect(nine, 'mayor_pomp_event');
  assert.equal(r.finale, true);
  assert.equal(r.heading, "10/10 Surprises: Impromptu 'Mayor Public Event' & Ribbon Cutting");
  assert.ok(r.burstSub.startsWith('All 10/10 Keepsakes!'));
  assert.equal(surprises.inspect(r.found, 'mayor_pomp_event').finale, false);
  // Memory lines.
  assert.equal(surprises.memoryLine('bea', []), '');
  assert.ok(surprises.memoryLine('bea', ['good_donut_and_bagel']).startsWith('“Baker Mae'));
  assert.ok(surprises.memoryLine('bea', ['good_donut_and_bagel', 'mayor_pomp_event']).startsWith('“The Block Mayor cut'));
  assert.equal(surprises.conversationLabel(['a']), 'Spot Surprise (1/10)');
  assert.equal(surprises.progressLabel(['a', 'b'], 5), 'Sparks: 5 · Keepsakes: 2/10');
  const h = surprises.neighborHint([], 'celeste', { player: P.START, compass: compassPhrase });
  assert.equal(h.lastHinted, 'hidden_mural_145');
  assert.match(h.hint, /^Have you spotted The Hidden Mural at 145 Leavenworth yet\? Look .+ at 145 Leavenworth St frontage \(below the 8th-floor bay\) \(0\/10 surprises found\)\.$/);
  assert.ok(surprises.neighborHint(['hidden_mural_145', 'cutesy_dino'], 'celeste', { player: P.START, compass: compassPhrase }).hint.startsWith('You found both of my favorite block surprises! Next, check out'));
  assert.deepEqual(surprises.keepsakes(['cutesy_dino']), [{ id: 'cutesy_dino', neighbor: 'celeste', label: "Pip the Tiny Dino on Celeste's easel" }]);
  assert.equal(surprises.markers([]).length, 10);
  assert.equal(surprises.darken('#ffffff'), '#b8b8b8');
});

// ---------------------------------------------------------------- landmarks
test('Landmarks: tour order, museum cycle, eateries and completion', () => {
  let tour = landmarks.initialTour();
  let state = landmarks.tourState(tour);
  assert.equal(state.total, 12); assert.equal(state.count, 0);
  assert.deepEqual(state.stops.map(s => s.id), ['museum:0', 'museum:1', 'museum:2', 'museum:3', 'park', 'so_what', 'eatery:0', 'eatery:1', 'eatery:2', 'eatery:3', 'eatery:4', 'eatery:5']);
  assert.equal(state.stops[6].name, 'Bowl & Basil Pho Counter (fictional)');
  assert.deepEqual(state.stops[6].target, P.EATERY_COUNTERS[0]);
  // Museum: present -> 1961 -> 1966 -> 1907 -> present.
  const eras = [];
  for (let i = 0; i < 5; i++) { const m = landmarks.inspectMuseum(tour); eras.push(m.era); tour = m.tour; }
  assert.deepEqual(eras, ['present', '1961_jazz', '1966_comptons', '1907_cadillac', 'present']);
  assert.equal(landmarks.tourState(tour).count, 4);
  const m0 = landmarks.inspectMuseum(landmarks.initialTour());
  assert.ok(m0.sub.includes('(choose Next era to channel past eras!)'));
  assert.equal(m0.docent, MAIN.MUSEUM_DOCENT_LINES[0]);
  assert.equal(m0.lens, '#7be0e6');
  assert.equal(landmarks.ringAngle(m0.tour, 2), 80);
  assert.equal(landmarks.visitStop(landmarks.initialTour(), 'museum:2').era, '1966_comptons');
  // Park and So What.
  const park = landmarks.inspectPark(tour, 14);
  assert.equal(park.line, 'Boeddeker Park — 240 Eddy St at Jones (OpenStreetMap way 33619301)');
  assert.ok(park.sub.startsWith('Fenced neighborhood park: lawn, 14 shade trees'));
  tour = landmarks.inspectSoWhat(park.tour).tour;
  // Eateries: guide, then order; host line count % 3, item (count - 1) % 3; the first order bursts once.
  let g = landmarks.activateEatery(tour, 2);
  assert.equal(g.kind, 'guide');
  assert.ok(!g.sub.includes('Shift'));
  assert.equal(g.speech, `The Blue Valve Vinyl & Hi-Fi Bar (fictional)\n${MAIN.EATERY_HOST_LINES.blue_valve_hifi[0]}`);
  tour = g.tour;
  const orders = [];
  for (let i = 0; i < 4; i++) { const o = landmarks.activateEatery(tour, 2); assert.equal(o.kind, 'order'); orders.push(o); tour = o.tour; }
  assert.deepEqual(orders.map(o => o.line), [1, 2, 0, 1].map(k => MAIN.EATERY_HOST_LINES.blue_valve_hifi[k]));
  assert.deepEqual(orders.map(o => o.item), [0, 1, 2, 0].map(k => MAIN.EATERY_MENU_ITEMS.blue_valve_hifi[k]));
  assert.deepEqual(orders.map(o => !!o.burst), [true, false, false, false]);
  assert.equal(orders[0].burst.heading, 'Order Up: Botanical Highball');
  assert.equal(orders[0].message, 'Ordering at The Blue Valve Vinyl & Hi-Fi Bar: botanical highball (tap the counter again for more)');
  // The rest of the tour, via the objective's tour stop.
  const all = surprises.SURPRISE_IDS;
  for (let guard = 0; guard < 20; guard++) {
    const o = landmarks.exploreObjective(all, tour, { player: P.START, compass: compassPhrase });
    if (!o.tourId) break;
    tour = landmarks.visitStop(tour, o.tourId).tour;
  }
  state = landmarks.tourState(tour);
  assert.equal(state.count, 12);
  const done = landmarks.tourCompletion(tour, { foundCount: 10, objectiveId: 'explore' });
  assert.equal(done.announce, 'Neighborhood Tour Complete! All 12 stops visited this session. You found all 10 keepsakes; the optional tour starts fresh next session.');
  assert.equal(landmarks.tourCompletion(done.tour, { foundCount: 10, objectiveId: 'explore' }), null, 'celebrates once per visit');
  assert.equal(landmarks.tourCompletion(tour, { foundCount: 9, objectiveId: 'explore' }), null);
  assert.equal(landmarks.tourCompletion(tour, { foundCount: 10, objectiveId: 'explore', blocked: true }), null);
});

test('Landmarks: the chapter 6 objective at 0/10, 10/10 with 0/12, and 12/12', () => {
  const ctx = { player: P.START, compass: compassPhrase };
  let o = landmarks.exploreObjective([], landmarks.initialTour(), ctx);
  assert.equal(o.text, "Spot Jeffrey's Lost 1961 Record (0/10 surprises) · Museum");
  assert.equal(o.surpriseId, 'jeffrey_record');
  assert.deepEqual(o.target, P.SURPRISE_SITES.jeffrey_record);
  assert.match(o.hint, /^Take your time\. Spot the 10 neighborhood surprises \(0\/10 found\)—next is Jeffrey's Lost 1961 Record \(.+ at 361 Turk St sidewalk/);
  assert.equal(landmarks.exploreObjective([], landmarks.initialTour(), { ...ctx, openNeighborId: 'dez' }).surpriseId, 'viking_dirt_biker');
  o = landmarks.exploreObjective(surprises.SURPRISE_IDS, landmarks.initialTour(), ctx);
  assert.equal(o.text, 'Tour 0/12 this session: Museum: Present Day');
  assert.equal(o.tourId, 'museum:0'); assert.equal(o.tourAction, 'Visit the Museum');
  const tour = { ...landmarks.initialTour(), eras: [...MAIN.TOUR_MUSEUM_ERAS], park: true, soWhat: true, orders: Object.fromEntries(MAIN.NEIGHBORHOOD_EATERIES.map(e => [e.id, 1])) };
  o = landmarks.exploreObjective(surprises.SURPRISE_IDS, tour, ctx);
  assert.equal(o.text, 'All 10 keepsakes found! Tour 12/12 this session complete!');
  assert.equal(o.hasTarget, false);
  assert.ok(!o.hint.includes('Shift'));
});

// ---------------------------------------------------------------- positions
test('Positions: the conversion formula matches core.js and Godot anchors', () => {
  const o = core.project(core.ORIGIN), e = core.project({ lat: core.ORIGIN.lat, lon: core.ORIGIN.lon + 0.001 });
  assert.ok(Math.abs(Math.atan2(e.y - o.y, e.x - o.x) - P.MAP_ANGLE) < 1e-12, 'same angle as core.js project');
  assert.equal(P.ORIGIN_LAT, core.ORIGIN.lat);
  assert.equal(P.PIXELS_PER_METRE, core.PIXELS_PER_METRE);
  close(P.godotToMap(-424.5, 62.5), { x: -2145.2, y: -28.4 }, 0.06, 'BLACKHAWK_POS');
  close(P.godotToMap(22.09, -10.03), { x: 117.0, y: -32.0 }, 0.06, 'Bea');
  close(P.godotToMap(114.71, -14.79), { x: 578, y: 18 }, 0.1, 'Rook');
  const back = P.mapToGodot(P.godotToMap(-593.4, -10.08));
  assert.ok(near(back.x, -593.4, 1e-9) && near(back.z, -10.08, 1e-9));
  close(P.LARKIN_JUNCTION, { x: -2921.4, y: -520.7 }, 0.06, 'junction');
  close(P.MUSEUM, { x: -1397.7, y: -551.3 }, 0.06, 'museum');
  close(P.PARK_ENTRANCE, { x: -544.5, y: -582.3 }, 0.06, 'park');
  close(P.SO_WHAT_AWNING, { x: -1780.0, y: 47.1 }, 0.06, 'So What');
  close(P.SO_WHAT_LEAVENWORTH, { x: -1514.5, y: 259.9 }, 0.06, '145 Leavenworth');
  close(P.ELECTION_GOALS[0], { x: -1298.4, y: -554.7 }, 0.06); close(P.ELECTION_GOALS[1], { x: -433.4, y: -564.8 }, 0.06);
  close(P.DOG_SEARCH[0], { x: -51.2, y: -29.3 }, 0.06, 'Pippin'); close(P.DOG_GOALS[0], { x: -52.6, y: -20.4 }, 0.06, 'Pippin goal');
  close(P.EDDY_WEST[0], { x: -2929.4, y: -524.4 }, 0.06); close(P.EDDY_WEST.at(-1), { x: -2196.6, y: -524.5 }, 0.06);
  // core.js keeps its own copy of the bounds and the corridor: it cannot import positions.js (history.js projects at load).
  for (const name of ['OPENING_BOUNDS', 'ROUTE_BOUNDS', 'BOUNDS', 'WALK_EXTENT', 'VIEW_BOUNDS', 'STREET_CORRIDOR', 'EDDY_XZ']) assert.deepEqual(core[name], P[name], name);
  assert.equal(core.EDDY_WEST.length, P.EDDY_WEST.length);
  core.EDDY_WEST.forEach((p, i) => close(p, P.EDDY_WEST[i], 1e-9, `EDDY_WEST[${i}]`));
  assert.equal(P.WALK_EXTENT.left, Math.floor((P.LARKIN_JUNCTION.x - 50) / 10) * 10);
});

test('Positions: fork anchors equal the fork\'s own markers', async () => {
  const { NEIGHBORS, PLACES } = await import('../browser-next/world.js');
  assert.deepEqual({ x: NEIGHBORS[0].x, y: NEIGHBORS[0].y }, P.BEA);
  const history = PLACES.find(p => p.id === 'history');
  assert.deepEqual({ x: history.x, y: history.y }, P.HISTORY_STOP);
  const hawk = PLACES.find(p => p.id === 'blackhawk');
  assert.deepEqual({ x: hawk.x, y: hawk.y }, P.BLACK_HAWK_STOP);
  assert.deepEqual(core.initialState().player, P.START);
});

// The spec's sidewalk construction on street centrelines (scratchpad sites.mjs), re-run to check the pins.
function nearestStreet(p) {
  let best;
  for (const w of WAYS) for (let i = 1; i < w.points.length; i++) {
    const A = w.points[i - 1], B = w.points[i], dx = B.x - A.x, dy = B.y - A.y;
    const t = Math.max(0, Math.min(1, ((p.x - A.x) * dx + (p.y - A.y) * dy) / (dx * dx + dy * dy || 1)));
    const q = { x: A.x + t * dx, y: A.y + t * dy }, d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!best || d < best.d) best = { q, d, name: w.name };
  }
  return best;
}
function sidewalkSite(raw, offsets, shifts, clash, avoid) {
  const n = nearestStreet(raw);
  let ax = raw.x - n.q.x, ay = raw.y - n.q.y, L = Math.hypot(ax, ay);
  if (L < 1e-6) { ax = 0; ay = 1; L = 1; }
  ax /= L; ay /= L;
  const tx = -ay, ty = ax;
  for (const sh of shifts) for (const d of offsets) {
    const p = { x: n.q.x + ax * d + tx * sh, y: n.q.y + ay * d + ty * sh };
    if (!P.proposedWalkable(p, WAYS) || avoid.some(v => Math.hypot(v.x - p.x, v.y - p.y) < clash)) continue;
    return { ...p, street: n.name };
  }
  return null;
}
test('Positions: pinned surprise sites and eatery counters reproduce the construction', async () => {
  const { NEIGHBORS, PLACES } = await import('../browser-next/world.js');
  const avoid = [...NEIGHBORS.map(n => ({ x: n.x, y: n.y })), ...PLACES.map(p => ({ x: p.x, y: p.y })), P.START];
  const counters = MAIN.NEIGHBORHOOD_EATERIES.map((rec, i) => {
    const site = sidewalkSite(P.EATERY_AWNINGS[i], [33], [0, 15, -15, 27.5, -27.5, 40, -40], 14, avoid);
    close(site, P.EATERY_COUNTERS[i], 0.051, rec.id);
    assert.equal(site.street, P.EATERY_COUNTERS[i].street);
    return site;
  });
  const placed = [];
  for (const id of MAIN.NEIGHBORHOOD_SURPRISE_IDS) {
    const site = sidewalkSite(P.SURPRISE_RAW[id], [31, 28, 34], [0, 12.5, -12.5, 25, -25, 37.5, -37.5, 50, -50], 13, [...avoid, ...counters, ...placed]);
    close(site, P.SURPRISE_SITES[id], 0.051, id);
    assert.equal(site.street, P.SURPRISE_SITES[id].street);
    placed.push(site);
  }
});

// positions.js proposedFindPath from the start, once per target (the uncached router both routing tests compare with).
const proposedPaths = new Map();
const proposedPath = (id, p) => { if (!proposedPaths.has(id)) proposedPaths.set(id, P.proposedFindPath(P.START, p, WAYS)); return proposedPaths.get(id); };
test('Positions: every target is inside the proposed bounds and walkable, and routes from the start', () => {
  const targets = P.walkTargets();
  assert.equal(Object.keys(targets).length, 34);
  const outsideToday = [];
  for (const [id, p] of Object.entries(targets)) {
    assert.ok(P.inside(p, P.WALK_EXTENT), `${id} inside WALK_EXTENT`);
    assert.ok(p.x >= P.BOUNDS.left || P.eddyDistance(p) < P.STREET_CORRIDOR, `${id}: west of BOUNDS only on the Eddy corridor`);
    assert.ok(Math.abs(p.x) < 3000 && Math.abs(p.y) < 3000, `${id} within core.js move cap`);
    assert.ok(P.proposedWalkable(p, WAYS), `${id} walkable under the proposed rules`);
    assert.ok(proposedPath(id, p).length > 0, `${id} routable under the proposed rules`);
    assert.equal(core.walkable(p, WAYS), P.proposedWalkable(p, WAYS), id);
    if (!core.walkable(p, WAYS)) outsideToday.push(id);
  }
  assert.deepEqual(outsideToday, [], 'core.js walks to every target');
  // core.js walkable is the positions.js rule at every point of a 7 px grid over the camera's view bounds (and 20 px
  // beyond), and along each bounds edge, where < and <= differ.
  const V = P.VIEW_BOUNDS, grid = [];
  for (let x = V.left - 20; x <= V.right + 20; x += 7) for (let y = V.top - 20; y <= V.bottom + 20; y += 7) grid.push({ x, y });
  for (const x of [P.WALK_EXTENT.left, P.BOUNDS.left, P.BOUNDS.right]) for (let y = V.top; y <= V.bottom; y += 5) grid.push({ x, y });
  for (const y of [P.BOUNDS.top, P.BOUNDS.bottom]) for (let x = V.left; x <= V.right; x += 5) grid.push({ x, y });
  const differ = grid.filter(p => core.walkable(p, WAYS) !== P.proposedWalkable(p, WAYS));
  assert.deepEqual(differ, [], `core.js walkable agrees with proposedWalkable on ${grid.length} points`);
  assert.ok(grid.length > 85000);
});

test('Positions: every target routes with core.js findPath, on the same path as proposedFindPath', () => {
  // core.js findPath(start, goal, ways) keeps its signature: the bounds, the Eddy corridor and the cell limit are its own.
  assert.equal(core.findPath.length, 3);
  for (const [id, p] of Object.entries(P.walkTargets())) {
    const path = core.findPath(P.START, p, WAYS);
    assert.ok(path.length > 0, `${id} routes with core.js`);
    assert.equal(JSON.stringify(path), JSON.stringify(proposedPath(id, p)), id);
  }
});

test('Positions: story sites clear of their obstacles (lantern, election, dogs, relays)', async () => {
  const { NEIGHBORS } = await import('../browser-next/world.js');
  const M = P.PIXELS_PER_METRE;
  for (let i = 0; i <= 144; i++) {
    const p = lantern.routePoint(36 * i / 144);
    assert.ok(core.walkable(p, WAYS), `lantern sample ${i} walkable`);
    assert.ok(p.y - P.GATHERING_BAND.bottom >= lantern.CLEARANCE * M, 'clear of the gathering band');
    for (const n of NEIGHBORS) assert.ok(dist(p, n) >= (lantern.CLEARANCE + 1.4) * M, `clear of ${n.id}`);
    for (const t of P.AUTHORED_TREES) assert.ok(dist(p, t) >= (lantern.CLEARANCE + 0.5) * M, 'clear of trees');
  }
  assert.ok(near(dist(P.LANTERN_ROUTE[0], P.LANTERN_ROUTE[1]), lantern.LENGTH * M, 0.2), '180 px = 36 m');
  assert.ok(P.LANTERN_ROUTE[1].x < P.LANTERN_ROUTE[0].x, 'westward like Godot');
  for (const g of P.ELECTION_GOALS) for (const n of NEIGHBORS) assert.ok(dist(g, n) >= 1.6 * M);
  assert.ok(dist(P.ELECTION_GOALS[0], P.MUSEUM) >= 14 * M, 'Cadillac stop clear of the museum');
  assert.ok(dist(P.ELECTION_GOALS[1], P.PARK_ENTRANCE) >= 12 * M, 'Boeddeker stop clear of the park entrance');
  assert.ok(core.walkable(P.ELECTION_HOME, WAYS));
  for (const p of [...P.DOG_SEARCH, ...P.DOG_GOALS, ...P.RELAY_GOALS]) assert.ok(core.walkable(p, WAYS), `(${p.x}, ${p.y})`);
  for (const p of P.RELAY_GOALS) assert.ok(p.y > P.GATHERING_BAND.bottom, 'relays south of the gathering band');
  assert.ok(!P.proposedWalkable(P.ELECTION_PINS[0], WAYS) && !P.proposedWalkable(P.ELECTION_PINS[1], WAYS), 'address pins are art, never goals');
  const centre = pts => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
  for (const p of [P.PARK_VIEW, centre(P.PARK_RING), centre(P.LARKIN_EXTERIOR), P.LARKIN_JUNCTION, P.SO_WHAT_VIEW]) assert.ok(P.inside(p, P.VIEW_BOUNDS), 'the camera centre can reach the park, Larkin and So What');
});
