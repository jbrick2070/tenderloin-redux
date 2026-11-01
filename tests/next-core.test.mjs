import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  SAVE_KEY, SETTINGS_KEY, NEIGHBOR_IDS, LITTER, MOTIFS, PALETTES, FURNITURE, PHOTO_GUESTS, LOANS, BLOCK_TEXT,
  initialState, applyAction, progress, ready, arranged, metCount, blockMissing, musicLayers, canPlaceFurniture,
} from '../browser-next/core.js';
import { GODOT_SAVE_KEY, FORK_FIELDS, SAVE_BUDGET, SURPRISE_IDS, parseGodotSave, buildGodotSave, freshEnvelope, freshState, lostProgress, combineSaves, cleanSurprises } from '../browser-next/godot-save.js';
import { currentChapter } from '../browser-next/story.js';
import { gatheringScene, sceneFurniture, DEFAULT_FURNITURE } from '../browser-next/gathering.js';
import { GODOT_WRITTEN, PUBLISHED, godotEnvelope, readyEnvelope, openedEnvelope, raw } from './next-fixtures.mjs';

const gd = readFileSync(new URL('../godot/main.gd', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const body = name => { const start = gd.indexOf(`\nfunc ${name}(`); assert.ok(start >= 0, `godot/main.gd has func ${name}`); const end = gd.indexOf('\nfunc ', start + 1); return gd.slice(start, end < 0 ? undefined : end); };
const literals = text => [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1].replace(/\\(.)/g, '$1'));
const act = (state, ...actions) => actions.reduce(applyAction, state);
const meetAll = state => act(state, ...NEIGHBOR_IDS.map(id => ({ type: 'meet', id })));
const paint = state => act(state, ...MOTIFS.map((id, col) => ({ type: 'mural', id, col, row: 0 })));
const readyState = () => act(paint(meetAll(initialState())), { type: 'soundcheck' });

test('the fork keeps the Godot save key and its own preference key, never classic\'s', () => {
  assert.equal(SAVE_KEY, GODOT_SAVE_KEY);
  assert.equal(SETTINGS_KEY, 'tenderloin-redux.browser-next.settings.v1');
  const dir = new URL('../browser-next/', import.meta.url), names = readdirSync(dir, { recursive: true }).map(name => name.replace(/\\/g, '/')).filter(name => /\.(js|html|json)$/.test(name));
  assert.ok(names.includes('experiments/neighborhood-voices.js') && names.includes('data/streets.osm.json'), 'the scan walks subdirectories');
  for (const name of names) assert.doesNotMatch(readFileSync(new URL(name, dir), 'utf8'), /tenderloin-redux\.(save|settings)\.v1/, name);
  assert.deepEqual(initialState(), freshState(), 'the reducers start from the state godot-save.js expects');
  assert.deepEqual(Object.keys(initialState()).filter(key => !['player', 'litter', 'optional'].includes(key)).sort(), [...FORK_FIELDS].sort());
});

test('meet ports Godot arrival and talk: visited sorted, greeted from Bea, Celeste counted, Rook soundchecks', () => {
  let s = act(initialState(), { type: 'meet', id: 'thanh' }, { type: 'meet', id: 'bea' });
  assert.deepEqual(s.visited, ['bea', 'thanh']); assert.equal(s.greeted, true);
  s = act(s, { type: 'meet', id: 'celeste' });
  assert.equal(s.celesteTalks, 1, 'finish_neighbor_arrival: a first arrival counts Celeste once');
  assert.equal(act(s, { type: 'meet', id: 'celeste' }), s, 'a repeat arrival changes nothing and returns the same state');
  s = act(s, { type: 'meet', id: 'celeste', talk: true }, { type: 'meet', id: 'celeste', talk: true });
  assert.equal(s.celesteTalks, 3, 'talk_with_celeste counts every talk');
  s = act(s, { type: 'meet', id: 'rook' });
  assert.equal(s.soundcheck, false, 'arriving beside Rook is not the soundcheck');
  s = act(s, { type: 'meet', id: 'rook', talk: true });
  assert.equal(s.soundcheck, true, 'check_sound_with_rook: talking with Rook is the soundcheck, with no layout or supplies');
  assert.deepEqual(act(initialState(), { type: 'soundcheck' }).visited, ['rook']);
  assert.deepEqual(s.visited, ['bea', 'celeste', 'rook', 'thanh']);
  assert.equal(act(initialState(), { type: 'greet' }).greeted, true, 'classic greet is meeting Bea');
  assert.equal(act(s, { type: 'meet', id: 'lulu' }), s, 'only the five neighbor ids');
  assert.equal(act(s, { type: 'meet', id: 'dez', talk: true }).celesteTalks, 3);
});

test("mural-scene ports edit_mural_scene: '' lifts a slot, and an action without a string id changes nothing", () => {
  const s = act(initialState(), { type: 'mural-scene', id: 'cooking', slot: 'left' }, { type: 'mural-scene', id: 'music', slot: 'right' });
  assert.deepEqual(s.muralScenes, { left: 'cooking', right: 'music' });
  assert.deepEqual(act(s, { type: 'mural-scene', id: '', slot: 'left' }).muralScenes, { right: 'music' }, 'the empty id is the lift');
  for (const id of [undefined, null, 7, {}, ['cooking'], true]) {
    const action = id === undefined ? { type: 'mural-scene', slot: 'left' } : { type: 'mural-scene', id, slot: 'left' };
    assert.equal(applyAction(s, action), s, `id ${JSON.stringify(id)} is not a lift`);
  }
});

test('surprise ports inspect_neighborhood_surprise: a known id once, kept sorted, before or after opening', () => {
  // Godot marks a surprise found wherever it is inspected, with no chapter or block gate, and saves only a new one.
  assert.match(body('inspect_neighborhood_surprise'), /\tvar newly_discovered := not discovered_surprises\.has\(s_id\)\n\tdiscovered_surprises\[s_id\] = true\n/);
  assert.doesNotMatch(body('inspect_neighborhood_surprise').split('var newly_discovered')[0], /block_opened|current_chapter|is_block_ready/, 'no gate before the find');
  const fresh = initialState();
  assert.deepEqual(fresh.surprises, []);
  for (const id of ['nope', '', undefined, null, 7, ['cutesy_dino'], 'constructor', 'Cutesy_Dino']) assert.equal(applyAction(fresh, { type: 'surprise', id }), fresh, `id ${JSON.stringify(id)} is not a surprise`);
  let s = applyAction(fresh, { type: 'surprise', id: 'jeffrey_record' });
  assert.deepEqual(s.surprises, ['jeffrey_record']);
  assert.equal(s.opened, false, 'found before the block opens');
  assert.equal(applyAction(s, { type: 'surprise', id: 'jeffrey_record' }), s, 'a repeat find returns the same state');
  s = act(s, { type: 'surprise', id: 'cutesy_dino' }, { type: 'surprise', id: 'bite_size_nachos' });
  assert.deepEqual(s.surprises, ['bite_size_nachos', 'cutesy_dino', 'jeffrey_record'], 'sorted, as build_save_envelope writes them');
  assert.deepEqual(fresh.surprises, [], 'the earlier state is untouched');
  assert.deepEqual(act(fresh, ...[...SURPRISE_IDS].reverse().map(id => ({ type: 'surprise', id }))).surprises, [...SURPRISE_IDS].sort());
  const open = act(readyState(), { type: 'open' }), found = applyAction(open, { type: 'surprise', id: 'mayor_pomp_event' });
  assert.deepEqual([found.opened, found.surprises], [true, ['mayor_pomp_event']], 'and after it opens');
  assert.equal(currentChapter(found), currentChapter(open), 'a find is not a chapter step');
});

test('progress and ready are Godot is_block_ready; layout and tidying are not gates', () => {
  let s = initialState();
  assert.deepEqual(progress(s), { neighbors: false, mural: false, sound: false });
  s = meetAll(s); assert.equal(metCount(s), 5); assert.equal(ready(s), false);
  s = paint(s); assert.equal(ready(s), false);
  assert.equal(blockMissing(s), 'Rook soundcheck');
  s = act(s, { type: 'soundcheck' });
  assert.equal(ready(s), true, 'no layout, no supplies, no tidying');
  assert.equal(blockMissing(s), 'Ready to open');
  assert.equal(blockMissing(act(initialState(), { type: 'meet', id: 'bea' }, { type: 'mural', id: 'sun', col: 0, row: 0 })), '1/5 neighbors, 1/3 mural motifs, Rook soundcheck');
  const tidied = act(initialState(), ...LITTER.map(item => ({ type: 'tidy', id: item.id })));
  assert.equal(tidied.litter.length, 3); assert.deepEqual(progress(tidied), progress(initialState()));
});

test('layout and furniture follow Godot: any layout before opening, and the soundcheck survives both', () => {
  let s = act(initialState(), { type: 'layout', value: 'floor' });
  assert.equal(s.layout, 'floor', 'choose_gathering_layout needs no greeting');
  s = act(s, { type: 'soundcheck' }, { type: 'furniture', id: 'table', col: 0, row: 3 });
  assert.equal(s.soundcheck, true); assert.deepEqual(s.furniture, { table: { col: 0, row: 3 } });
  s = act(s, { type: 'layout', value: 'table' });
  assert.equal(s.soundcheck, true, 'no soundcheck reset on a layout change');
  assert.deepEqual(s.furniture, {}, 'supplies are placed per layout');
  assert.equal(act(s, { type: 'layout', value: 'table' }), s);
  assert.equal(act(s, { type: 'layout', value: 'stage' }), s);
  for (const [id, col, row] of [['table', 0, 3], ['seats', 2, 0], ['speaker', 5, 0]]) s = act(s, { type: 'furniture', id, col, row });
  assert.equal(arranged(s), true); assert.equal(s.soundcheck, true, 'no soundcheck reset on a furniture change');
  const open = act(readyState(), { type: 'open' });
  assert.equal(act(open, { type: 'layout', value: 'floor' }), open, 'the layout is fixed once open');
  assert.equal(act(open, { type: 'furniture', id: 'table', col: 0, row: 0 }), open);
});

test('open sets the Long Table when no layout was chosen and keeps a chosen one', () => {
  assert.equal(act(paint(meetAll(initialState())), { type: 'open' }).opened, false, 'not ready without the soundcheck');
  const open = act(readyState(), { type: 'open' });
  assert.equal(open.opened, true); assert.equal(open.layout, 'table');
  assert.equal(act(readyState(), { type: 'layout', value: 'floor' }, { type: 'open' }).layout, 'floor');
  assert.equal(act(open, { type: 'open' }), open);
  assert.equal(currentChapter(open), 1);
});

test('photo, skip and pack follow Godot take_keepsake_photo, skip_keepsake_photo and start_packing_epilogue', () => {
  const open = act(readyState(), { type: 'layout', value: 'floor' }, { type: 'open' });
  const photo = act(open, { type: 'photo', participants: ['thanh', 'bea', 'rook'] });
  assert.equal(photo, open, 'Rook is not a photo guest');
  const taken = act(open, { type: 'photo', participants: ['thanh', 'bea'] });
  assert.deepEqual(taken.epilogue.photo, { status: 'taken', participants: ['bea', 'thanh'], layout: 'floor', palette: 'garden', mural: open.mural });
  assert.equal(act(open, { type: 'photo', participants: ['bea'], layout: 'table' }).epilogue.photo.layout, 'table', 'the keepsake layout Godot holds wins');
  const skipped = act(open, { type: 'skip-photo' });
  assert.deepEqual(skipped.epilogue.photo, { status: 'skipped' });
  assert.equal(act(skipped, { type: 'skip-photo' }), skipped, 'skip only from unasked');
  assert.equal(act(skipped, { type: 'photo', participants: ['dez'] }).epilogue.photo.status, 'taken', 'a skipped photo can still be taken before packing');
  const packed = act(open, { type: 'pack' });
  assert.deepEqual(packed.epilogue, { packing: true, returned: [], photo: { status: 'skipped' } });
  assert.equal(act(packed, { type: 'skip-photo' }), packed); assert.equal(act(packed, { type: 'photo', participants: ['bea'] }), packed);
  const home = act(packed, ...LOANS.map(loan => ({ type: 'return-loan', id: loan.id })).reverse());
  assert.deepEqual(home.epilogue.returned, ['table', 'paint-case', 'speaker']);
  assert.equal(currentChapter(home), 2);
});

test('the music stems follow Godot recompute_music_stems', () => {
  assert.deepEqual(musicLayers(initialState()), { layout: true, tidy: false, mural: false, opened: false });
  assert.deepEqual(musicLayers(act(initialState(), { type: 'meet', id: 'dez' })), { layout: true, tidy: true, mural: false, opened: false });
  assert.deepEqual(musicLayers(act(initialState(), { type: 'meet', id: 'celeste' })), { layout: true, tidy: true, mural: true, opened: false });
  assert.deepEqual(musicLayers(act(initialState(), { type: 'soundcheck' })), { layout: true, tidy: true, mural: false, opened: true });
  assert.deepEqual(musicLayers(paint(initialState())), { layout: true, tidy: false, mural: true, opened: true });
});

test('the Godot rules and text the reducers copy have not drifted', () => {
  const missing = literals(body('get_block_missing_summary')), opening = literals(body('open_block_gathering'));
  for (const key of ['neighbors', 'mural', 'sound', 'ready']) assert.ok(missing.includes(BLOCK_TEXT[key]), key);
  assert.ok(opening.includes(BLOCK_TEXT.almost), 'almost'); assert.ok(opening.includes(BLOCK_TEXT.opened), 'opened');
  assert.match(body('is_block_ready'), /return visited_neighbors\.size\(\) >= neighbors\.size\(\) and mural_placements\.size\(\) == MURAL_MOTIFS\.size\(\) and rook_soundcheck_done\n/);
  assert.match(body('open_block_gathering'), /\tif not \(gathering_layout in GATHERING_LAYOUTS\):\n\t\tgathering_layout = "table"\n/);
  assert.match(body('finish_neighbor_arrival'), /\t\tif celeste_talk_count == 0:\n\t\t\tceleste_talk_count = 1\n/);
  assert.match(body('talk_with_celeste'), /\tceleste_talk_count \+= 1\n\tvisited_neighbors\[CELESTE_ID\] = true\n/);
  assert.match(body('check_sound_with_rook'), /\tvisited_neighbors\[ROOK_ID\] = true\n\trook_soundcheck_done = true\n/);
  assert.doesNotMatch(body('check_sound_with_rook'), /\n\tif |return false/, 'the soundcheck has no gate');
  assert.match(body('choose_gathering_layout'), /\tif not \(layout_id in GATHERING_LAYOUTS\) or block_opened:\n\t\treturn false\n/);
  assert.doesNotMatch(body('choose_gathering_layout'), /rook_soundcheck_done/, 'a layout change keeps the soundcheck');
  assert.match(body('skip_keepsake_photo'), /if not block_opened or epilogue_packing or String\(keepsake_photo\.get\("status", "unasked"\)\) != "unasked":/);
  assert.match(body('take_keepsake_photo'), /if mural_placements\.size\(\) < MURAL_MOTIFS\.size\(\) or participants\.is_empty\(\):/);
  assert.match(body('recompute_music_stems'), /if visited_neighbors\.size\(\) >= 1 or celeste_talk_count > 0 or rook_soundcheck_done:\n\t\tmask \|= 2[\s\S]*if mural_placements\.size\(\) >= 1 or celeste_talk_count > 0:\n\t\tmask \|= 4[\s\S]*if mural_completed or rook_soundcheck_done:\n\t\tmask \|= 8/);
});

// Every action the fork can dispatch, with arguments drawn so that a long walk reaches every chapter.
function randomAction(s, rand) {
  const pick = list => list[Math.floor(rand() * list.length)], int = n => Math.floor(rand() * n);
  const shot = s.film.result?.order[s.film.captured.length] ?? pick(['seat', 'paint', 'welcome']);
  const host = s.hosting.order[s.hosting.results.length] ?? pick(['stories', 'beats', 'art', 'pause']);
  return pick([
    () => ({ type: 'meet', id: pick(NEIGHBOR_IDS), talk: rand() < .5 }), () => ({ type: 'soundcheck' }), () => ({ type: 'greet' }),
    () => ({ type: 'layout', value: pick(['table', 'floor']) }), () => ({ type: 'furniture', id: pick(FURNITURE), col: int(8), row: int(5) }),
    () => ({ type: 'tidy', id: pick(LITTER).id }), () => ({ type: 'mural', id: pick(MOTIFS), col: int(6), row: int(3) }), () => ({ type: 'palette', value: pick(PALETTES) }),
    () => ({ type: 'open' }), () => ({ type: 'open' }), () => ({ type: 'history' }), () => ({ type: 'discover-blackhawk' }),
    () => ({ type: 'photo', participants: PHOTO_GUESTS.filter(() => rand() < .6), ...(rand() < .3 ? { layout: pick(['table', 'floor']) } : {}) }),
    () => ({ type: 'skip-photo' }), () => ({ type: 'pack' }), () => ({ type: 'return-loan', id: pick(LOANS).id }),
    () => ({ type: pick(['programme-add', 'programme-add', 'programme-remove', 'programme-move']), id: pick(['stories', 'beats', 'art', 'pause']), direction: pick([-1, 1]) }),
    () => ({ type: 'programme-publish' }), () => ({ type: 'host-start' }), () => ({ type: 'host-complete', id: host }), () => ({ type: 'host-complete', id: host }),
    () => ({ type: 'host-story', value: pick(['memory', 'future']) }), () => ({ type: 'host-beat', step: int(8) }), () => ({ type: 'host-tile', cell: int(6) }),
    () => ({ type: 'host-palette', value: pick(['warm', 'cool']) }), () => ({ type: 'host-quiet', value: pick(['arc', 'pairs']) }),
    () => ({ type: 'civic-start' }), () => ({ type: 'civic-choice', key: pick(['topic', 'format', 'notes']), value: pick(['repairs', 'access', 'circle', 'dropin', 'themes', 'none']) }),
    () => ({ type: 'civic-open' }), () => ({ type: 'civic-close' }), () => ({ type: 'film-start' }), () => ({ type: 'film-choice', key: pick(['framing', 'plan']), value: pick(['close', 'wide', 'quiet', 'later']) }),
    () => ({ type: 'film-move', id: pick(['seat', 'paint', 'welcome']), direction: pick([-1, 1]) }), () => ({ type: 'film-roll' }), () => ({ type: 'film-clear' }),
    () => ({ type: 'film-capture', id: shot }), () => ({ type: 'film-capture', id: shot }), () => ({ type: 'move', x: int(600), y: -int(60) }),
    () => ({ type: 'surprise', id: pick([...SURPRISE_IDS, 'nope']) }),
  ])();
}
function mulberry(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// The game writes from the last envelope it loaded or wrote; each write must load back to the same fork state.
function walk(start, base, seed, steps) {
  const rand = mulberry(seed), chapters = new Set();
  let s = start, env = base, writes = 0; const kept = JSON.stringify([env.mural_scenes, env.district_boundary_visible, env.active_motif]);
  for (let i = 0; i < steps; i++) {
    const action = randomAction(s, rand), next = applyAction(s, action);
    if (next === s) continue;
    assert.notEqual(JSON.stringify(next), JSON.stringify(s), `${action.type} returned a new object without a change`);
    s = next; chapters.add(currentChapter(s));
    const out = buildGodotSave(env, s);
    assert.equal(out.ok, true, `seed ${seed} step ${i} ${JSON.stringify(action)}: ${out.reason} ${out.detail}`);
    assert.ok(out.bytes <= SAVE_BUDGET);
    const back = parseGodotSave(out.raw);
    assert.equal(back.status, 'loaded', back.reason);
    for (const key of FORK_FIELDS) assert.deepEqual(back.state[key], s[key], `seed ${seed} step ${i} ${action.type}: ${key}`);
    assert.equal(JSON.stringify([out.envelope.mural_scenes, out.envelope.district_boundary_visible, out.envelope.active_motif]), kept, 'Godot-only fields survive');
    const had = cleanSurprises(env.discovered_surprises), has = cleanSurprises(out.envelope.discovered_surprises);
    assert.ok(had.every(id => has.includes(id)), `seed ${seed} step ${i}: a write keeps every surprise its base had`);
    env = out.envelope; writes++;
  }
  return { chapters, writes, state: s };
}

test('every state the reducers reach round-trips through buildGodotSave and parseGodotSave without refusal', () => {
  const chapters = new Set();
  let writes = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const run = walk(initialState(), freshEnvelope(), seed, 900);
    run.chapters.forEach(n => chapters.add(n)); writes += run.writes;
  }
  assert.deepEqual([...chapters].sort(), [0, 1, 2, 3, 4, 5], 'the walks reach every chapter');
  assert.ok(writes > 3000, `${writes} writes checked`);
});

test('reducers continue a Godot-written save, and the walks keep its Godot-only progress', () => {
  for (const [name, text] of Object.entries(GODOT_WRITTEN)) {
    const loaded = parseGodotSave(text, { initialState });
    assert.equal(loaded.status, 'loaded', name);
    for (let seed = 1; seed <= 8; seed++) walk(loaded.state, loaded.envelope, seed * 101, 400);
  }
  const ready = parseGodotSave(raw(readyEnvelope()), { initialState });
  const open = applyAction(ready.state, { type: 'open' });
  assert.equal(open.layout, 'table');
  const out = buildGodotSave(ready.envelope, open);
  assert.equal(out.ok, true, out.reason);
  assert.equal(JSON.parse(out.raw).block_opened, true); assert.equal(JSON.parse(out.raw).gathering_layout, 'table');
  assert.equal(JSON.parse(out.raw).epilogue.photo.layout, 'table');
});

test('an open block without saved furniture gets a default arrangement, so visitors render', () => {
  for (const layout of ['table', 'floor']) {
    for (const [id, p] of Object.entries(DEFAULT_FURNITURE[layout])) assert.equal(canPlaceFurniture({ layout, furniture: Object.fromEntries(Object.entries(DEFAULT_FURNITURE[layout]).filter(([other]) => other !== id)) }, id, p.col, p.row), true, `${layout} ${id}`);
    const open = act(readyState(), { type: 'layout', value: layout }, { type: 'open' });
    const scene = gatheringScene(open);
    assert.equal(scene.phase, 'open'); assert.equal(scene.items.length, 3); assert.equal(scene.guests.length, 3);
    assert.deepEqual(sceneFurniture(open), DEFAULT_FURNITURE[layout]);
    assert.deepEqual(open.furniture, {}, 'presentation only: nothing is added to the saved state');
    const partial = act(readyState(), { type: 'layout', value: layout }, { type: 'furniture', id: 'speaker', col: 2, row: 3 }, { type: 'open' });
    const placed = sceneFurniture(partial);
    assert.deepEqual(placed.speaker, { col: 2, row: 3 }, 'a placed supply stays where it is');
    assert.equal(Object.keys(placed).length, 3);
    assert.equal(gatheringScene(act(readyState(), { type: 'layout', value: layout })).phase, 'preparing', 'before opening nothing is filled in');
  }
  const fromGodot = parseGodotSave(GODOT_WRITTEN.fullRun, { initialState }).state;
  assert.deepEqual(fromGodot.furniture, {});
  assert.equal(gatheringScene({ ...fromGodot, epilogue: { ...fromGodot.epilogue, packing: false } }).guests.length, 3);
});

test('the opened caption says "you placed" only when the player placed the table', () => {
  const plain = gatheringScene(act(readyState(), { type: 'open' }));
  assert.equal(plain.phase, 'open'); assert.doesNotMatch(plain.caption, /you placed|your arrangement/i, 'the default arrangement was not placed by the player');
  assert.match(plain.caption, /Long Table/);
  const seats = gatheringScene(act(readyState(), { type: 'layout', value: 'table' }, { type: 'furniture', id: 'seats', col: 0, row: 0 }, { type: 'open' }));
  assert.doesNotMatch(seats.caption, /table you placed/, 'placing only the seats leaves the table a default');
  const placed = gatheringScene(act(readyState(), { type: 'layout', value: 'table' }, { type: 'furniture', id: 'table', col: 3, row: 3 }, { type: 'open' }));
  assert.match(placed.caption, /the table you placed/);
  const godot = parseGodotSave(GODOT_WRITTEN.fullRun, { initialState }).state;
  assert.doesNotMatch(gatheringScene({ ...godot, epilogue: { ...godot.epilogue, packing: false } }).caption, /you placed/, 'a block opened in Godot has no 2D placement');
});

test('a stored save that lost progress is detected, and combining keeps what either side reached', () => {
  const start = parseGodotSave(raw(godotEnvelope({ visited_neighbors: ['bea'], save_seq: 3 })), { initialState });
  const mine = act(start.state, { type: 'meet', id: 'celeste' }, { type: 'palette', value: 'ocean' });
  const wrote = buildGodotSave(start.envelope, mine);
  assert.equal(wrote.ok, true);
  assert.equal(lostProgress(start.envelope, wrote.envelope), '', 'a forward write loses nothing');
  // A 3D tab opened at save_seq 3 saves over it: Bea only, plus Dez and a surprise it found.
  const stale = parseGodotSave(raw(godotEnvelope({ visited_neighbors: ['bea', 'dez'], discovered_surprises: ['jeffrey_record'], save_seq: 4 })), { initialState });
  assert.equal(lostProgress(wrote.envelope, stale.envelope), 'visited_neighbors');
  assert.equal(lostProgress(wrote.envelope, freshEnvelope()), 'visited_neighbors', 'a restart there also counts');
  assert.deepEqual([lostProgress(null, stale.envelope), lostProgress(wrote.envelope, { schema: 'x' })], ['', ''], 'nothing to compare is no loss');
  const out = combineSaves(stale.envelope, mine);
  assert.equal(out.ok, true, `${out.reason} ${out.detail}`);
  const env = JSON.parse(out.raw);
  assert.deepEqual([env.visited_neighbors, env.discovered_surprises, env.mural_palette, env.celeste_talk_count, env.save_seq], [['bea', 'celeste', 'dez'], ['jeffrey_record'], 'ocean', 1, 5]);
  assert.deepEqual(out.state.visited, ['bea', 'celeste', 'dez']); assert.equal(parseGodotSave(out.raw).status, 'loaded');
  assert.equal(lostProgress(stale.envelope, out.envelope), '', 'the combined save keeps the stored progress');
  assert.equal(lostProgress(wrote.envelope, out.envelope), '', "and this tab's");
  // Whole chapters: whichever side is further along keeps them.
  const full = parseGodotSave(GODOT_WRITTEN.fullRun, { initialState }), opened = parseGodotSave(raw(openedEnvelope({ save_seq: 200 })), { initialState });
  for (const [stored, own] of [[opened, full], [full, opened]]) {
    const both = combineSaves(stored.envelope, own.state);
    assert.equal(both.ok, true, `${both.reason} ${both.detail}`);
    assert.equal(currentChapter(both.state), 5, 'the full run survives either way');
    assert.equal(lostProgress(full.envelope, both.envelope), '');
  }
  assert.equal(combineSaves(stale.envelope, null).ok, false, 'bad input is refused, not thrown');
  assert.equal(combineSaves(null, mine).ok, true, 'no stored save combines onto a fresh one');
});

// Two tabs start from one save. This tab writes its branch; a tab opened earlier then saves its own branch over it.
const loadEnv = env => parseGodotSave(typeof env === 'string' ? env : raw(env), { initialState });
function wrote(base, state) { const out = buildGodotSave(base.envelope, state); assert.equal(out.ok, true, `${out.reason} ${out.detail}`); return out; }
function branches(env, mineActions, theirActions) {
  const base = loadEnv(env), mine = act(base.state, ...mineActions), theirs = act(base.state, ...theirActions);
  const myWrite = wrote(base, mine), stored = loadEnv({ ...JSON.parse(wrote(base, theirs).raw), save_seq: myWrite.envelope.save_seq + 1 });
  return { mine, myWrite, stored };
}
function combined({ mine, myWrite, stored }, lost) {
  assert.equal(lostProgress(myWrite.envelope, stored.envelope), lost, "the stored save lost some of this tab's progress");
  const out = combineSaves(stored.envelope, mine, myWrite.envelope);
  assert.equal(out.ok, true, `${out.reason} ${out.detail}`);
  assert.equal(lostProgress(myWrite.envelope, out.envelope), '', 'nothing this tab reached is lost');
  assert.equal(out.envelope.save_seq, stored.envelope.save_seq + 1);
  assert.equal(parseGodotSave(out.raw).status, 'loaded');
  return out;
}
const packUp = (...loans) => [{ type: 'pack' }, ...loans.map(id => ({ type: 'return-loan', id }))];
const photo = (...participants) => ({ type: 'photo', participants, layout: 'table' });
const hostSteps = (n, story = 'memory') => [{ type: 'host-start' }, { type: 'host-story', value: story }, ...PUBLISHED.slice(0, n).map(id => ({ type: 'host-complete', id }))];

test('combining unions the epilogue as Godot imports it: loans, packing and a taken keepsake all stay', () => {
  const opened = openedEnvelope({ save_seq: 40 });
  // godot/main.gd import merge: returned is the union over LOAN_IDS, packing is ORed and a taken photo wins.
  let b = branches(opened, packUp('table'), packUp('paint-case')), out = combined(b, 'epilogue');
  assert.deepEqual(out.state.epilogue.returned, ['table', 'paint-case']); assert.deepEqual(JSON.parse(out.raw).epilogue.returned, ['table', 'paint-case']);
  assert.equal(lostProgress(b.stored.envelope, out.envelope), '', 'and nothing the stored save reached');
  // The keepsake cannot be retaken once packing has begun, so losing it would be for good.
  b = branches(opened, [photo('bea'), ...packUp('table')], packUp('paint-case')); out = combined(b, 'epilogue');
  assert.deepEqual([out.state.epilogue.photo.status, out.state.epilogue.photo.participants, out.state.epilogue.packing, out.state.epilogue.returned], ['taken', ['bea'], true, ['table', 'paint-case']]);
  assert.equal(lostProgress(b.stored.envelope, out.envelope), '');
  b = branches(opened, [photo('bea'), ...packUp('table')], [{ type: 'skip-photo' }]); out = combined(b, 'epilogue');
  assert.deepEqual([out.state.epilogue.photo.status, out.state.epilogue.packing, out.state.epilogue.returned], ['taken', true, ['table']]);
  // Two different keepsakes: this tab's wins, as the dialog promises, and its packing and returns stay beside it.
  b = branches(opened, [photo('bea', 'celeste', 'dez', 'thanh'), ...packUp('table', 'speaker')], [photo('bea')]); out = combined(b, 'epilogue');
  assert.deepEqual([out.state.epilogue.photo.participants, out.state.epilogue.packing, out.state.epilogue.returned], [['bea', 'celeste', 'dez', 'thanh'], true, ['table', 'speaker']]);
  // A stored keepsake this tab lacks comes back with this tab's packing.
  b = branches(opened, packUp('speaker'), [photo('dez')]); out = combined(b, 'epilogue');
  assert.deepEqual([out.state.epilogue.photo.participants, out.state.epilogue.packing, out.state.epilogue.returned], [['dez'], true, ['speaker']]);
  assert.equal(lostProgress(b.stored.envelope, out.envelope), '');
});

test('combining keeps the further second gathering, this tab’s choices where both hosted, and a listening hour that needs it', () => {
  const posted = openedEnvelope({ save_seq: 40, programme: { order: [...PUBLISHED], published: [...PUBLISHED] } });
  // This tab hosted three activities, the stale tab one with a different opening question.
  let b = branches(posted, hostSteps(3, 'future'), hostSteps(1)), out = combined(b, 'hosting');
  assert.deepEqual(out.state.hosting.results.map(r => r.value), ['future', 85, 'arc']);
  // The stale tab got further: its later results stay, and this tab's choice stays where both hosted.
  b = branches(posted, hostSteps(1, 'future'), hostSteps(3)); out = combined(b, 'hosting');
  assert.deepEqual(out.state.hosting.results.map(r => r.value), ['future', 85, 'arc']);
  // A republished programme in the other tab: hosting follows a different order, so the side with more results is kept.
  const republish = [{ type: 'programme-move', id: 'art', direction: -1 }, { type: 'programme-publish' }];
  b = branches(posted, hostSteps(3, 'future'), [...republish, { type: 'host-start' }, { type: 'host-complete', id: 'stories' }]); out = combined(b, 'hosting');
  assert.deepEqual(out.state.hosting.order, PUBLISHED); assert.equal(out.state.hosting.results.length, 3);
  // This tab finished hosting and the listening hour; a stale tab hosted one activity differently. Copying the stored
  // hosting would leave the listening hour without its gathering, and Keep was refused (self-check civic).
  const civic = [{ type: 'civic-start' }, { type: 'civic-open' }, { type: 'civic-close' }];
  b = branches(posted, [...hostSteps(4, 'future'), ...civic], hostSteps(1)); out = combined(b, 'hosting');
  assert.deepEqual([out.state.hosting.results.length, out.state.civic.phase], [4, 'done']);
  assert.equal(currentChapter(out.state), currentChapter(b.mine), 'the chapter this tab reached stays');
});

test("combining brings back the neighborhood surprises and mural scenes in this tab's own write base", () => {
  // A second 3D tab found two surprises and painted two scenes; this tab adopted that save and wrote over it.
  const found = loadEnv(godotEnvelope({ save_seq: 8, visited_neighbors: ['bea', 'dez'], discovered_surprises: ['hidden_mural_145', 'jeffrey_record'], mural_scenes: { left: 'music', right: 'garden' } }));
  const mine = act(found.state, { type: 'meet', id: 'celeste' }), myWrite = wrote(found, mine);
  assert.deepEqual([myWrite.envelope.discovered_surprises, myWrite.envelope.mural_scenes], [['hidden_mural_145', 'jeffrey_record'], { left: 'music', right: 'garden' }]);
  // A 3D tab opened before them saves an older state with neither.
  const stale = loadEnv(godotEnvelope({ save_seq: 10, visited_neighbors: ['bea', 'thanh'], discovered_surprises: ['cutesy_dino'] }));
  assert.equal(lostProgress(myWrite.envelope, stale.envelope), 'visited_neighbors');
  const out = combineSaves(stale.envelope, mine, myWrite.envelope), env = JSON.parse(out.raw);
  assert.equal(out.ok, true, `${out.reason} ${out.detail}`);
  assert.deepEqual([env.visited_neighbors, env.discovered_surprises, env.mural_scenes], [['bea', 'celeste', 'dez', 'thanh'], ['cutesy_dino', 'hidden_mural_145', 'jeffrey_record'], { left: 'music', right: 'garden' }]);
  // Scenes the stored save has are kept. This tab's state carries its surprises, so they come back whatever its write base
  // holds; only known ids are written, in place of a stored value Godot would clean.
  const painted = loadEnv(godotEnvelope({ save_seq: 10, visited_neighbors: ['bea'], discovered_surprises: 7, mural_scenes: { left: 'cooking' } }));
  const kept = JSON.parse(combineSaves(painted.envelope, mine, { ...myWrite.envelope, discovered_surprises: ['not_a_surprise'] }).raw);
  assert.deepEqual([kept.discovered_surprises, kept.mural_scenes], [['hidden_mural_145', 'jeffrey_record'], { left: 'cooking' }]);
  assert.equal(JSON.parse(combineSaves(stale.envelope, mine).raw).discovered_surprises.length, 3, 'without a write base too');
  // Scenes this tab painted or lifted and saved itself are its choices: an older stored save with scenes does not undo them.
  // The fourth argument is the scenes this tab last read from the shared save (its own writes do not change it).
  const loaded = { left: 'music', right: 'garden' };
  const lifted = act(mine, { type: 'mural-scene', id: '', slot: 'right' }), liftWrite = wrote(myWrite, lifted);
  assert.deepEqual(liftWrite.envelope.mural_scenes, { left: 'music' });
  const older = loadEnv(godotEnvelope({ save_seq: 11, visited_neighbors: ['bea'], mural_scenes: { left: 'music', right: 'garden' } }));
  assert.equal(lostProgress(liftWrite.envelope, older.envelope), 'visited_neighbors');
  let keep = combineSaves(older.envelope, lifted, liftWrite.envelope, loaded);
  assert.deepEqual([keep.ok, keep.state.muralScenes, JSON.parse(keep.raw).mural_scenes], [true, { left: 'music' }, { left: 'music' }], 'a saved lift stays lifted');
  const repainted = act(mine, { type: 'mural-scene', id: 'cooking', slot: 'right' }), paintWrite = wrote(myWrite, repainted);
  const sharing = loadEnv(godotEnvelope({ save_seq: 11, visited_neighbors: ['bea'], mural_scenes: { left: 'sharing' } }));
  keep = combineSaves(sharing.envelope, repainted, paintWrite.envelope, loaded);
  assert.deepEqual([keep.state.muralScenes, JSON.parse(keep.raw).mural_scenes], [{ left: 'sharing', right: 'cooking' }, { left: 'sharing', right: 'cooking' }], 'a saved paint stays painted; the slot this tab only adopted follows the stored save');
  // Scenes this tab only adopted still follow the stored save, as above.
  assert.deepEqual(JSON.parse(combineSaves(painted.envelope, mine, myWrite.envelope, loaded).raw).mural_scenes, { left: 'cooking' });
  // A stored value Godot would clean to nothing counts as no scenes, so the write base's scenes come back.
  for (const junk of [{ junk: 1 }, { left: 'bogus' }, ['music']]) {
    const bad = loadEnv(godotEnvelope({ save_seq: 10, visited_neighbors: ['bea'], mural_scenes: junk }));
    const out = combineSaves(bad.envelope, mine, myWrite.envelope, loaded);
    assert.deepEqual([out.ok, out.state.muralScenes, JSON.parse(out.raw).mural_scenes], [true, loaded, loaded], `stored ${JSON.stringify(junk)}`);
  }
  // The merged fields count toward the budget. This tab's finds ride on its state, so they cost the same with or without its
  // write base, and without them the stored save fits exactly their bytes more.
  const padded = n => loadEnv(godotEnvelope({ save_seq: 10, visited_neighbors: ['bea'], optional: { pad: 'x'.repeat(n) } }));
  let n = 0, hi = SAVE_BUDGET;
  while (n < hi) { const mid = (n + hi + 1) >> 1; if (combineSaves(padded(mid).envelope, mine).ok) n = mid; else hi = mid - 1; }
  assert.ok(n > 2000); assert.equal(combineSaves(padded(n).envelope, mine).ok, true);
  assert.deepEqual([combineSaves(padded(n).envelope, mine, myWrite.envelope).ok, combineSaves(padded(n + 1).envelope, mine, myWrite.envelope).reason], [true, 'full'], 'the same budget with the write base');
  const finds = JSON.stringify(mine.surprises).length - 2, none = { ...mine, surprises: [] };
  assert.deepEqual([combineSaves(padded(n + finds).envelope, none).ok, combineSaves(padded(n + finds + 1).envelope, none).reason], [true, 'full'], "this tab's finds are budgeted");
});

test('combining decides mural scenes slot by slot: a slot this tab painted wins, a slot it only adopted follows the stored save', () => {
  // The 3D edition saved the left scene and this tab adopted it; this tab posted a programme and painted only the right.
  const adopted = loadEnv(openedEnvelope({ save_seq: 10, mural_scenes: { left: 'cooking' } })), loaded = adopted.state.muralScenes;
  const mine = act(adopted.state, ...PUBLISHED.map(id => ({ type: 'programme-add', id })), { type: 'programme-publish' }, { type: 'mural-scene', id: 'music', slot: 'right' });
  const myWrite = wrote(adopted, mine);
  assert.deepEqual(myWrite.envelope.mural_scenes, { left: 'cooking', right: 'music' });
  // A 3D tab opened earlier, without the programme, then saved a repainted left.
  const stale = loadEnv(openedEnvelope({ save_seq: 99, mural_scenes: { left: 'garden' } }));
  assert.equal(lostProgress(myWrite.envelope, stale.envelope), 'programme');
  const out = combineSaves(stale.envelope, mine, myWrite.envelope, loaded);
  assert.equal(out.ok, true, `${out.reason} ${out.detail}`);
  assert.deepEqual([out.state.muralScenes, JSON.parse(out.raw).mural_scenes], [{ left: 'garden', right: 'music' }, { left: 'garden', right: 'music' }], 'the adopted left follows the stored save; the painted right stays');
  assert.deepEqual(out.state.programme.published, PUBLISHED, "this tab's programme comes back too");
  // What this tab now counts as read: the left from the combined save; the right stays its own paint for the next combine.
  assert.deepEqual(out.loadedScenes, { left: 'garden' });
  const again = loadEnv(openedEnvelope({ save_seq: 120, mural_scenes: { left: 'sharing' } }));
  assert.deepEqual(combineSaves(again.envelope, out.state, out.envelope, out.loadedScenes).state.muralScenes, { left: 'sharing', right: 'music' }, 'a second stale save is followed on the left again');
});
