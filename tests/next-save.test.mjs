import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GODOT_SAVE_KEY, GODOT_SAVE_SCHEMA, GODOT_SAVE_VERSION, SAVE_BUDGET, OPTIONAL_MAX_CHARS, MAX_JSON_DEPTH, FORK_FIELDS, FORK_OPTIONAL_KEY, NEIGHBOR_IDS,
  MURAL_COLS, MURAL_ROWS, MOTIFS, PALETTES, LAYOUTS, FURNITURE, FURNITURE_GRID, PHOTO_GUESTS, PHOTO_STATUSES, LOAN_IDS, SEGMENTS, STORIES, TILE_PALETTES,
  QUIETS, CIVIC_FIELDS, CIVIC_PHASES, FILM_SHOTS, FILM_FRAMING, FILM_PLANS, FILM_PHASES, FLAGS, SURPRISE_IDS,
  parseGodotSave, buildGodotSave, canonicalStringify, freshEnvelope, freshState, isWholeNumber, utf8Bytes, cleanSurprises, lostProgress,
} from '../browser-next/godot-save.js';
import { readDiscovered } from '../browser-next/visits/surprises.js';
import {
  GODOT_WRITTEN, EDITED_PARTIAL_ART, EDITED_PARTIAL_ART_GODOT_BYTES, SURPRISES, FULL_MURAL, NEIGHBORS, HOSTED_RESULTS, parseRaw, raw,
  godotEnvelope, minimalEnvelope, readyEnvelope, openedEnvelope, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope,
} from './next-fixtures.mjs';

const load = text => parseGodotSave(text);
const loaded = text => { const result = load(text); assert.equal(result.status, 'loaded', result.reason); return result; };
const rejected = (text, label) => assert.equal(load(text).status, 'invalid', label);
const edit = (text, change) => { const env = parseRaw(text); change(env); return raw(env); };
const withSeq = (text, seq) => canonicalStringify({ ...parseRaw(text), save_seq: seq });
const save = (base, state, options) => { const result = buildGodotSave(base, state, options); assert.equal(result.ok, true, `${result.reason}: ${result.detail}`); return result; };
const refusal = (base, state) => { const result = buildGodotSave(base, state); assert.equal(result.ok, false); assert.equal(result.raw, null); return result; };
const why = (base, state) => { const result = refusal(base, state); return [result.reason, result.detail]; };
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

// --- Drift: godot/main.gd is read at test time, so a change to Godot's save format fails here. ---
const gd = readFileSync(new URL('../godot/main.gd', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function balanced(text, start) {
  let depth = 0, quoted = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '\\') i++; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch) && --depth === 0) return text.slice(start, i + 1);
  }
  throw Error('Unbalanced literal');
}
function gdConst(name) {
  const m = new RegExp(`^const ${name}\\b[^=\\n]*= `, 'm').exec(gd);
  assert.ok(m, `const ${name} is missing from godot/main.gd`);
  const at = m.index + m[0].length;
  const literal = '[{'.includes(gd[at]) ? balanced(gd, at) : gd.slice(at, gd.indexOf('\n', at)).replace(/\s+#.*$/, '');
  return JSON.parse(literal.replace(/,(\s*[\]}])/g, '$1'));
}
function funcBody(name) {
  const start = gd.search(new RegExp(`^func ${name}\\(`, 'm'));
  assert.ok(start >= 0, `func ${name} is missing from godot/main.gd`);
  const end = gd.slice(start + 1).search(/^func /m);
  return gd.slice(start, end < 0 ? gd.length : start + 1 + end);
}
// The keys of a GDScript dictionary literal, and each key's expression.
function gdDict(literal) {
  const inner = literal.slice(1, -1), out = {};
  let depth = 0, quoted = false, from = 0;
  const take = to => { const part = inner.slice(from, to).trim(); if (part) { const at = part.indexOf(':'); out[JSON.parse(part.slice(0, at))] = part.slice(at + 1).trim(); } };
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quoted) { if (ch === '\\') i++; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) { take(i); from = i + 1; }
  }
  take(inner.length);
  return out;
}
const sorted = list => [...list].sort();

test('save constants and enums match godot/main.gd', () => {
  assert.equal(gdConst('GODOT_WEB_STORAGE_KEY'), GODOT_SAVE_KEY);
  assert.equal(gdConst('GODOT_SAVE_VERSION'), GODOT_SAVE_VERSION);
  assert.equal(gdConst('SAVE_BUDGET_MAX_BYTES'), SAVE_BUDGET);
  assert.equal(gdConst('OPTIONAL_SAVE_MAX_BYTES'), OPTIONAL_MAX_CHARS);
  assert.equal(gdConst('MURAL_BOARD_COLS'), MURAL_COLS); assert.equal(gdConst('MURAL_BOARD_ROWS'), MURAL_ROWS);
  const enums = {
    MURAL_PALETTES: PALETTES, MURAL_MOTIFS: MOTIFS, PHOTO_GUESTS, LOAN_IDS, GATHERING_LAYOUTS: LAYOUTS, PROGRAMME_SEGMENTS: SEGMENTS, HOSTING_STORIES: STORIES,
    HOSTING_PALETTES: TILE_PALETTES, HOSTING_QUIETS: QUIETS, CIVIC_TOPICS: CIVIC_FIELDS.topic, CIVIC_FORMATS: CIVIC_FIELDS.format, CIVIC_NOTES: CIVIC_FIELDS.notes,
    CIVIC_PHASES, FILM_SHOTS, FILM_FRAMING, FILM_PLANS, FILM_PHASES, BROWSER_FURNITURE_IDS: FURNITURE, HOSTING_DEFAULT_TILES: freshEnvelope().hosting.draft.tiles,
    NEIGHBORHOOD_SURPRISE_IDS: SURPRISE_IDS,
  };
  assert.deepEqual(SURPRISE_IDS, SURPRISES, 'the fixtures use the same surprise ids');
  for (const [name, value] of Object.entries(enums)) assert.deepEqual(gdConst(name), value, name);
  const rosterAt = gd.search(/^var neighbors: [^=\n]+= \[/m);
  assert.ok(rosterAt >= 0, 'var neighbors is missing from godot/main.gd');
  const ids = [...balanced(gd, gd.indexOf('= [', rosterAt) + 2).matchAll(/\{"id": "([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, NEIGHBOR_IDS, 'valid_neighbor_ids() reads the neighbors roster in order');
  assert.deepEqual(sorted(ids), NEIGHBORS);
  const literal = (body, pattern) => JSON.parse(body.match(pattern)[1]);
  assert.deepEqual(sorted(literal(funcBody('validate_godot_epilogue'), /String\(st_val\) in (\[[^\]]*\])/)), sorted(PHOTO_STATUSES));
  assert.deepEqual(literal(funcBody('validate_godot_epilogue'), /String\(lay_val\) in (\[[^\]]*\])/), LAYOUTS);
  assert.deepEqual(literal(funcBody('validate_godot_civic'), /String\(ph_val\) in (\[[^\]]*\])/), CIVIC_PHASES);
  assert.deepEqual(literal(funcBody('validate_godot_film'), /String\(ph_val\) in (\[[^\]]*\])/), FILM_PHASES);
  const grid = funcBody('can_place_browser_furniture').match(/c\.x < 0 or c\.x > (\d+) or c\.y < 0 or c\.y > (\d+) or c\.y == (\d+)/).slice(1).map(Number);
  assert.deepEqual(grid, [FURNITURE_GRID.cols - 1, FURNITURE_GRID.rows - 1, FURNITURE_GRID.route]);
  const apply = funcBody('apply_save_envelope');
  assert.equal(apply.match(/String\(env\.get\("schema", ""\)\) != "([^"]+)"/)[1], GODOT_SAVE_SCHEMA);
  const flags = [...apply.matchAll(/var \w+ := (true|false)\n\tif env\.has\("(\w+)"\):\n\t\tvar \w+: Variant = env\.get\("\2"\)\n\t\tif not \(\w+ is bool\):/g)].map(m => [m[2], m[1] === 'true']);
  assert.deepEqual(flags, FLAGS);
});

test('the envelope keys and defaults match build_save_envelope', () => {
  const body = funcBody('build_save_envelope'), at = body.indexOf('var envelope := {');
  const keys = gdDict(balanced(body, at + 'var envelope := '.length));
  assert.equal(JSON.parse(keys.schema), GODOT_SAVE_SCHEMA);
  assert.deepEqual(sorted(Object.keys(keys)), sorted(Object.keys(freshEnvelope())));
  assert.match(body, /if not mural_scenes\.is_empty\(\): envelope\["mural_scenes"\] = /, 'mural_scenes is written only when set, so the fresh envelope has none');
  for (const key of ['epilogue', 'programme', 'hosting', 'civic', 'film']) assert.deepEqual(sorted(Object.keys(gdDict(keys[key]))), sorted(Object.keys(freshEnvelope()[key])), key);
  const returned = name => JSON.parse(funcBody(name).match(/return (\{.*\})/)[1].replace(/: ord\}$/, `: ${JSON.stringify(gdConst('FILM_SHOTS'))}}`));
  assert.deepEqual(returned('default_keepsake_photo'), freshEnvelope().epilogue.photo);
  assert.deepEqual(returned('default_hosting_draft'), freshEnvelope().hosting.draft);
  assert.deepEqual(returned('default_civic_draft'), freshEnvelope().civic.draft);
  assert.deepEqual(returned('default_film_draft'), freshEnvelope().film.draft);
});

test('FORK_FIELDS is every saved field of the fork state', () => {
  assert.deepEqual(sorted(FORK_FIELDS), sorted(Object.keys(freshState()).filter(key => !['player', 'litter', 'optional'].includes(key))));
  assert.equal(new Set(FORK_FIELDS).size, FORK_FIELDS.length);
});

test('canonical JSON is compact with keys sorted recursively in code-point order', () => {
  assert.equal(canonicalStringify({ b: 1, a: [{ z: true, y: null }, 'x'], c: { e: 'é', d: '"q"' } }), '{"a":[{"y":null,"z":true},"x"],"b":1,"c":{"d":"\\"q\\"","e":"é"}}');
  assert.equal(canonicalStringify({ keep: 1, gone: undefined }), '{"keep":1}');
  assert.equal(canonicalStringify({ '\u{1F600}': 1, '～': 2 }), '{"～":2,"\u{1F600}":1}', 'U+FF5E sorts before U+1F600 as Godot compares code points');
  assert.equal(canonicalStringify({ B: 1, a: 2, _: 3 }), '{"B":1,"_":3,"a":2}');
  for (const text of Object.values(GODOT_WRITTEN)) assert.equal(canonicalStringify(parseRaw(text)), text, 'Godot JSON.stringify output is already canonical');
});

test('Godot-written saves load and re-serialize byte-identically except save_seq', () => {
  for (const [name, text] of Object.entries(GODOT_WRITTEN)) {
    const { envelope, state } = loaded(text);
    assert.equal(canonicalStringify(envelope), text, `${name} validated envelope is the stored envelope`);
    const result = save(envelope, state);
    assert.equal(result.raw, withSeq(text, parseRaw(text).save_seq + 1), name);
    assert.equal(result.bytes, Buffer.byteLength(result.raw));
  }
});

test('a first fork write matches Godot first write byte for byte', () => {
  const state = freshState();
  state.visited = ['bea']; state.greeted = true;
  assert.equal(save(null, state).raw, GODOT_WRITTEN.firstMeeting);
  assert.equal(save(freshEnvelope(), state).raw, GODOT_WRITTEN.firstMeeting);
});

test('a JavaScript-edited save normalizes exactly as Godot does on load', () => {
  const { state, envelope } = loaded(EDITED_PARTIAL_ART);
  assert.equal(state.hosting.results.length, 3);
  assert.deepEqual(state.civic, { phase: 'idle', draft: { topic: 'repairs', format: 'circle', notes: 'themes' }, result: null });
  assert.deepEqual(envelope.film.draft, { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] });
  assert.equal(save(envelope, state).bytes, EDITED_PARTIAL_ART_GODOT_BYTES);
});

test('the full Godot run maps onto the fork state contract', () => {
  const { state } = loaded(GODOT_WRITTEN.fullRun);
  assert.deepEqual(state.visited, ['bea', 'celeste', 'dez', 'rook', 'thanh']);
  assert.equal(state.greeted, true); assert.equal(state.celesteTalks, 17); assert.equal(state.layout, 'table');
  assert.equal(state.opened, true); assert.equal(state.soundcheck, true); assert.equal(state.history, true); assert.equal(state.blackhawk, true);
  assert.equal(state.palette, 'ocean');
  assert.deepEqual(state.mural, { rise: { col: 0, row: 0 }, sun: { col: 1, row: 0 }, wave: { col: 3, row: 0 } });
  assert.deepEqual(state.epilogue, { packing: true, returned: ['table', 'paint-case', 'speaker'], photo: { status: 'taken', participants: ['bea', 'dez'], layout: 'table', palette: 'ocean', mural: { rise: { col: 4, row: 2 }, sun: { col: 0, row: 0 }, wave: { col: 2, row: 1 } } } });
  assert.deepEqual(state.programme.published, ['beats', 'pause', 'stories', 'art']);
  assert.equal(state.hosting.results.length, 4); assert.equal(state.civic.phase, 'done'); assert.equal(state.film.phase, 'done');
  assert.deepEqual(state.furniture, {}); assert.deepEqual(state.litter, []); assert.deepEqual(state.player, { x: 95, y: -47 });
  const custom = parseGodotSave(GODOT_WRITTEN.fullRun, { initialState: () => ({ ...freshState(), player: { x: 1, y: 2 } }) }).state;
  assert.deepEqual(custom.player, { x: 1, y: 2 }, 'session-only fields come from the caller initial state');
});

test('absent, blank and invalid saves', () => {
  for (const text of [null, undefined, '', ' \n\t ']) {
    const result = load(text);
    assert.equal(result.status, 'fresh');
    assert.deepEqual(result.envelope, freshEnvelope());
    assert.deepEqual(result.state, freshState());
  }
  for (const text of ['bad', 'not json', '{}', '[]', '{corrupt-json', '"text"', '{"schema":"tenderloin-redux.godot.save"']) rejected(text, text);
  const held = load('{}');
  assert.equal(held.envelope, null); assert.deepEqual(held.state, freshState()); assert.match(held.message, /kept/);
  assert.equal(load({ schema: GODOT_SAVE_SCHEMA }).status, 'invalid', 'only stored text is accepted');
  assert.equal(load(`\u0001 ${GODOT_WRITTEN.firstMeeting} \u0007`).status, 'loaded', 'Godot strip_edges trims every control character');
});

test('study_test.gd lines 959-974 reject cleanly', () => {
  const cases = [
    '{corrupt-json',
    '{"schema":"wrong","version":1}',
    '{"schema":"tenderloin-redux.godot.save","version":2,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1.5,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":[]}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":{"moon":{"col":0,"row":0}}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":{"sun":{"col":1.7,"row":0}}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":{"sun":{"col":1,"row":0},"wave":{"col":1,"row":0}}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"mural_placements":{"sun":{"col":99,"row":0}}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"rook_soundcheck_done":"yes","mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"block_opened":"yes","mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"history_read":"yes","mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"blackhawk_discovered":"yes","mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"district_boundary_visible":"no","mural_placements":{}}',
    '{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"visited_neighbors":["unknown"],"mural_placements":{}}',
  ];
  cases.forEach(text => rejected(text, text));
});

test('study_test.gd line 975: a forged block_opened loads as a valid partial state', () => {
  const { state, envelope } = loaded('{"schema":"tenderloin-redux.godot.save","version":1,"mural_palette":"garden","celeste_talk_count":1,"rook_soundcheck_done":true,"block_opened":true,"visited_neighbors":["bea","celeste"],"mural_placements":{"sun":{"col":1,"row":0},"wave":{"col":3,"row":1},"rise":{"col":5,"row":2}}}');
  assert.equal(state.opened, false); assert.equal(envelope.block_opened, false);
  assert.deepEqual(state.visited, ['bea', 'celeste']); assert.equal(Object.keys(state.mural).length, 3); assert.equal(state.soundcheck, true);
  assert.equal(save(envelope, state).envelope.block_opened, false);
});

test('study_test.gd lines 1107-1125: corrupt epilogue, programme and hosting reject', () => {
  const full = GODOT_WRITTEN.fullRun;
  loaded(full);
  rejected(edit(full, env => { env.epilogue.photo.participants = ['bea', 'rook']; }), 'Rook never consents to the photo');
  rejected(edit(full, env => { delete env.epilogue.photo; }), 'packing needs a photo key');
  rejected(edit(full, env => { env.epilogue.photo.status = 'skipped'; env.epilogue.photo.participants = 'bea'; }), 'non-array participants on a skipped photo');
  rejected(edit(full, env => { env.programme.published = ['beats', 'stories', 'pause', 'art']; }), 'published programme breaks the Quiet interval rule');
  rejected(edit(full, env => { env.hosting.results[0].id = 'stories'; }), 'out-of-order hosting result');
});

test('study_test.gd lines 1254-1266: civic, film and optional', () => {
  const full = GODOT_WRITTEN.fullRun;
  rejected(edit(full, env => { env.civic.result = null; }), 'civic done without a result');
  rejected(edit(full, env => { env.hosting.results = []; }), 'active civic before 4/4 hosting');
  rejected(edit(full, env => { env.film.captured = ['welcome', 'seat']; }), 'film done with two shots');
  rejected(edit(full, env => { env.film.phase = 'hold'; }), 'film hold with captured shots');
  const big = loaded(edit(full, env => { env.optional = { oversized: 'x'.repeat(8300) }; }));
  assert.deepEqual(big.envelope.optional, {}); assert.equal(big.state.civic.phase, 'done'); assert.equal(big.state.film.phase, 'done');
});

test('study_test.gd lines 1885-1888: an invalid layout is dropped without a reset', () => {
  const before = loaded(raw(readyEnvelope({ gathering_layout: 'roof' }))).state;
  assert.equal(before.layout, null); assert.equal(before.visited.length, 5);
  assert.equal(loaded(edit(GODOT_WRITTEN.fullRun, env => { env.gathering_layout = 'roof'; })).state.layout, 'table');
  const floor = openedEnvelope({ gathering_layout: '' });
  floor.epilogue.photo.layout = 'floor';
  assert.equal(loaded(raw(floor)).state.layout, 'floor', 'an opened block falls back to the photo layout');
  assert.equal(loaded(raw(openedEnvelope({ gathering_layout: 7 }))).state.layout, 'table');
  rejected(raw(openedEnvelope({ epilogue: { photo: { layout: 'roof' } } })), 'a photo layout is strict');
});

// Godot cleans mural_scenes on its own load (study_test.gd 4214-4219). The fork never resets on them
// and keeps them verbatim, so a newer Godot's scene ids survive a fork write.
test('study_test.gd lines 4214-4219: malformed mural_scenes never reset; the fork keeps them verbatim for Godot to clean', () => {
  const old = edit(GODOT_WRITTEN.fullRun, env => { delete env.mural_scenes; });
  const plain = loaded(old);
  assert.equal(Object.hasOwn(plain.envelope, 'mural_scenes'), false);
  assert.equal(Object.hasOwn(parseRaw(save(plain.envelope, plain.state).raw), 'mural_scenes'), false, 'no story field is added');
  for (const malformed of [null, [], 'cooking', { left: 'unknown', right: 9 }, { left: 'cooking', right: 'cooking', third: 'painting' }]) {
    const result = loaded(edit(old, env => { env.mural_scenes = malformed; }));
    assert.deepEqual(result.envelope.mural_scenes, malformed);
    assert.deepEqual(parseRaw(save(result.envelope, result.state).raw).mural_scenes, malformed);
  }
});

test('whole numbers follow Godot is_equal_approx', () => {
  assert.equal(isWholeNumber(3), true); assert.equal(isWholeNumber(3.000001), true); assert.equal(isWholeNumber(2.999999), true);
  assert.equal(isWholeNumber(3.0001), false); assert.equal(isWholeNumber(1.5), false); assert.equal(isWholeNumber('3'), false);
  assert.equal(isWholeNumber(1000000.5), true, 'the tolerance is relative above 1');
  assert.equal(isWholeNumber(Infinity), false); assert.equal(isWholeNumber(NaN), false);
  assert.equal(loaded(raw(minimalEnvelope({ version: 1.0000001 }))).envelope.version, 1);
  rejected(raw(minimalEnvelope({ version: 1.001 })), 'version 1.001');
  assert.equal(loaded(raw(minimalEnvelope({ celeste_talk_count: 2.999999 }))).state.celesteTalks, 3);
  assert.equal(loaded(raw(minimalEnvelope({ celeste_talk_count: 1000000.5 }))).state.celesteTalks, 1000001);
  assert.equal(loaded(raw(minimalEnvelope({ celeste_talk_count: -0.000001 }))).state.celesteTalks, 0);
  rejected(raw(minimalEnvelope({ celeste_talk_count: -1 })), 'negative talk count');
  rejected(raw(minimalEnvelope({ celeste_talk_count: '2' })), 'string talk count');
  rejected(raw(minimalEnvelope({ celeste_talk_count: null })), 'null talk count');
  assert.equal(loaded(raw(minimalEnvelope({ celeste_talk_count: undefined }))).state.celesteTalks, 0, 'absent talk count defaults');
  const mural = loaded(raw(minimalEnvelope({ mural_placements: { sun: { col: 4.000001, row: -0, extra: 'ignored' } } }))).state.mural;
  assert.deepEqual(mural, { sun: { col: 4, row: 0 } });
  assert.ok(Object.is(mural.sun.row, 0));
  assert.equal(loaded(raw(hostedEnvelope({ hosting: { ...hostedEnvelope().hosting, draft: { pattern: 84.9999999, tiles: [0, 1, 2, 2, 1, 1.0000001] } } }))).state.hosting.draft.pattern, 85);
});

test('required fields', () => {
  rejected(raw({ version: 1, mural_palette: 'garden', mural_placements: {} }), 'schema missing');
  rejected(raw(minimalEnvelope({ version: undefined })), 'version missing');
  rejected(raw(minimalEnvelope({ version: '1' })), 'version text');
  rejected(raw(minimalEnvelope({ mural_palette: undefined })), 'palette missing');
  rejected(raw(minimalEnvelope({ mural_palette: 'neon' })), 'palette unknown');
  rejected(raw(minimalEnvelope({ mural_placements: undefined })), 'placements missing');
  rejected(raw(minimalEnvelope({ mural_placements: { sun: [1, 0] } })), 'cell not a dictionary');
  rejected(raw(minimalEnvelope({ mural_placements: { sun: { col: 1 } } })), 'row missing');
  rejected(raw(minimalEnvelope({ mural_placements: { sun: { col: 0, row: 3 } } })), 'row out of bounds');
  rejected(raw(minimalEnvelope({ mural_placements: { sun: { col: -1, row: 0 } } })), 'col negative');
  assert.equal(loaded(raw(minimalEnvelope({ mural_placements: { sun: { col: 5, row: 2 } } }))).state.mural.sun.col, 5);
});

test('optional-but-strict fields', () => {
  for (const key of ['rook_soundcheck_done', 'block_opened', 'history_read', 'blackhawk_discovered', 'district_boundary_visible']) {
    rejected(raw(minimalEnvelope({ [key]: null })), `${key} null`);
    rejected(raw(minimalEnvelope({ [key]: 1 })), `${key} number`);
  }
  rejected(raw(minimalEnvelope({ visited_neighbors: 'bea' })), 'visited not an array');
  rejected(raw(minimalEnvelope({ visited_neighbors: ['bea', 3] })), 'visited non-string');
  rejected(raw(minimalEnvelope({ visited_neighbors: ['Bea'] })), 'visited ids are case-sensitive');
  assert.deepEqual(loaded(raw(minimalEnvelope({ visited_neighbors: ['thanh', 'bea', 'bea'] }))).state.visited, ['bea', 'thanh'], 'duplicates tolerated, output sorted');
  for (const key of ['epilogue', 'programme', 'hosting', 'civic', 'film']) {
    rejected(raw(minimalEnvelope({ [key]: null })), `${key} null`);
    rejected(raw(minimalEnvelope({ [key]: [] })), `${key} array`);
    loaded(raw(minimalEnvelope({ [key]: {} })));
  }
  rejected(raw(minimalEnvelope({ epilogue: { packing: 'yes' } })), 'packing not bool');
  rejected(raw(minimalEnvelope({ epilogue: { returned: ['table'] } })), 'returns without packing');
  rejected(raw(minimalEnvelope({ epilogue: { packing: true, photo: { status: 'unasked' } } })), 'packing with an unasked photo');
  rejected(raw(minimalEnvelope({ epilogue: { packing: true, returned: ['table', 'table'], photo: { status: 'skipped' } } })), 'duplicate return');
  rejected(raw(minimalEnvelope({ epilogue: { photo: { status: 'taken', participants: ['bea'], palette: 'garden', mural: { sun: { col: 0, row: 0 } } } } })), 'taken photo needs the full mural');
  rejected(raw(minimalEnvelope({ epilogue: { photo: { status: 'taken', participants: [], palette: 'garden', mural: FULL_MURAL } } })), 'taken photo needs a guest');
  rejected(raw(minimalEnvelope({ epilogue: { photo: { status: 'skipped', participants: ['bea'] } } })), 'skipped photo with guests');
  rejected(raw(minimalEnvelope({ epilogue: { photo: { status: 'lost' } } })), 'unknown photo status');
  rejected(raw(minimalEnvelope({ programme: { order: ['stories', 'stories'] } })), 'duplicate programme segment');
  rejected(raw(minimalEnvelope({ programme: { order: ['stories', 'beats', 'art', 'pause', 'pause'] } })), 'programme order too long');
  rejected(raw(minimalEnvelope({ programme: { published: ['stories'] } })), 'partial published programme');
  rejected(raw(minimalEnvelope({ hosting: { results: [{ id: 'stories', value: 'memory' }] } })), 'results without an order');
  rejected(raw(minimalEnvelope({ hosting: { order: ['beats', 'stories', 'pause', 'art'] } })), 'hosting order breaks the Quiet rule');
  rejected(raw(minimalEnvelope({ hosting: { draft: { pattern: 256 } } })), 'beat pattern over 255');
  rejected(raw(minimalEnvelope({ hosting: { draft: { tiles: [0, 1, 2] } } })), 'tile count');
  rejected(raw(minimalEnvelope({ hosting: { draft: null } })), 'draft null');
  rejected(raw(minimalEnvelope({ civic: { phase: 'over' } })), 'unknown civic phase');
  rejected(raw(minimalEnvelope({ civic: { draft: { topic: 'rent' } } })), 'unknown civic topic');
  rejected(raw(minimalEnvelope({ civic: { result: { topic: 'repairs', format: 'circle', notes: 'themes' } } })), 'idle civic with a result');
  rejected(raw(minimalEnvelope({ film: { draft: { order: ['seat', 'seat', 'paint'] } } })), 'duplicate film shot');
  rejected(raw(minimalEnvelope({ film: { captured: ['seat'] } })), 'idle film with a capture');
});

test('lenient fields never reset, and Godot-owned values stay verbatim for Godot to clean on load', () => {
  const result = loaded(raw(minimalEnvelope({ active_motif: 'moon', discovered_surprises: 'x', save_seq: 'abc', optional: [], mural_scenes: 5 })));
  assert.equal(result.envelope.active_motif, 'moon'); assert.equal(result.envelope.discovered_surprises, 'x'); assert.equal(result.envelope.mural_scenes, 5);
  assert.deepEqual(result.envelope.optional, {});
  assert.equal(save(result.envelope, result.state).envelope.save_seq, 1);
  for (const [seq, next] of [[4.5, 1], [-3, 1], [41, 42], [41.000001, 42]]) {
    const r = loaded(raw(minimalEnvelope({ save_seq: seq })));
    assert.equal(save(r.envelope, r.state).envelope.save_seq, next, `save_seq ${seq}`);
  }
  assert.deepEqual(loaded(raw(minimalEnvelope({ optional: 'text' }))).envelope.optional, {});
});

test('the opening cascade', () => {
  const ready = loaded(raw(readyEnvelope())).state;
  assert.equal(ready.opened, false); assert.equal(ready.layout, null);
  const opened = loaded(raw(openedEnvelope({ gathering_layout: '' }))).state;
  assert.equal(opened.opened, true); assert.equal(opened.layout, 'table', 'opening without a layout means the Long Table');
  for (const missing of [{ visited_neighbors: ['bea', 'celeste', 'dez', 'rook'] }, { mural_placements: { sun: { col: 0, row: 0 }, wave: { col: 1, row: 0 } } }, { rook_soundcheck_done: false }]) {
    const { state, envelope } = loaded(raw(hostedEnvelope({ ...missing, civic: undefined })));
    assert.equal(state.opened, false);
    assert.deepEqual(state.epilogue, { packing: false, returned: [], photo: { status: 'unasked' } });
    assert.deepEqual(state.programme, { order: [], published: [] });
    assert.deepEqual(state.hosting, freshState().hosting);
    assert.deepEqual(envelope.epilogue.photo, { status: 'unasked', participants: [], mural: {}, palette: 'garden', layout: 'table' });
  }
  rejected(raw(readyEnvelope({ epilogue: { packing: 'no' } })), 'structure is checked before the gate');
  rejected(raw(readyEnvelope({ programme: { published: ['beats', 'stories', 'pause', 'art'] } })), 'programme structure before the gate');
  rejected(raw(openedEnvelope({ civic: { phase: 'planning' } })), 'civic before 4/4 hosting resets everything');
  const idle = loaded(raw(openedEnvelope({ civic: { phase: 'idle', draft: { topic: 'access', format: 'dropin', notes: 'none' }, result: null } }))).state;
  assert.deepEqual(idle.civic, freshState().civic, 'an idle civic before its gate is emptied');
  loaded(raw(hostedEnvelope({ civic: { phase: 'planning', draft: { topic: 'access' } } })));
  rejected(raw(hostedEnvelope({ film: { phase: 'planning' } })), 'film before civic is done resets everything');
  rejected(raw(hostedEnvelope({ hosting: { ...hostedEnvelope().hosting, results: hostedEnvelope().hosting.results.slice(0, 3) }, civic: civicDoneEnvelope().civic })), 'civic done with 3/4 hosted');
  const film = loaded(raw(civicDoneEnvelope({ film: { phase: 'shooting', result: { framing: 'close', plan: 'quiet', order: ['paint', 'seat', 'welcome'] }, captured: ['paint'], draft: { framing: 'wide' } } }))).state.film;
  assert.deepEqual(film, { phase: 'shooting', draft: { framing: 'close', plan: 'quiet', order: ['paint', 'seat', 'welcome'] }, result: { framing: 'close', plan: 'quiet', order: ['paint', 'seat', 'welcome'] }, captured: ['paint'] });
  rejected(raw(civicDoneEnvelope({ film: { phase: 'shooting', result: { framing: 'close', plan: 'quiet', order: ['paint', 'seat', 'welcome'] }, captured: ['seat'] } })), 'captured shots follow the plan');
  rejected(raw(civicDoneEnvelope({ film: { phase: 'shooting', result: { framing: 'close', plan: 'quiet', order: ['paint', 'seat', 'welcome'] }, captured: ['paint', 'seat', 'welcome'] } })), 'three shots means done');
  const done = loaded(raw(filmDoneEnvelope())).state;
  assert.equal(done.film.phase, 'done'); assert.equal(done.civic.phase, 'done');
  const meeting = loaded(raw(hostedEnvelope({ civic: { phase: 'meeting', draft: { topic: 'repairs' }, result: { topic: 'access', format: 'circle', notes: 'none' } } }))).state.civic;
  assert.deepEqual(meeting.draft, meeting.result, 'a meeting draft is the agreed plan');
});

test('Godot-only and unknown keys survive a fork write unchanged', () => {
  const extras = { discovered_surprises: [...SURPRISES], district_boundary_visible: false, active_motif: 'wave', mural_scenes: { left: 'garden', right: 'painting' }, future_key: { nested: [1, 'é', { z: null, a: false }] } };
  const text = canonicalStringify({ ...parseRaw(GODOT_WRITTEN.fullRun), ...extras, optional: { voices_bookmark: 'glide', later: { n: 2 } } });
  const { envelope, state } = loaded(text);
  for (const [key, value] of Object.entries(extras)) assert.deepEqual(envelope[key], value, key);
  state.celesteTalks += 1;
  const written = parseRaw(save(envelope, state).raw);
  for (const [key, value] of Object.entries(extras)) assert.deepEqual(written[key], value, key);
  assert.deepEqual(written.optional, { voices_bookmark: 'glide', later: { n: 2 } });
  assert.equal(written.celeste_talk_count, 18);
  assert.equal(written.save_seq, 114);
});

test('a fork journey writes what Godot accepts at every step', () => {
  let base = null, state = freshState();
  const step = change => {
    change(state);
    const result = save(base, state);
    const back = loaded(result.raw);
    for (const key of FORK_FIELDS) assert.deepEqual(back.state[key], state[key], key);
    base = result.envelope;
    return result;
  };
  step(s => { s.visited = ['bea']; s.greeted = true; });
  for (const id of ['celeste', 'dez', 'rook', 'thanh']) step(s => { s.visited = [...s.visited, id].sort(); if (id === 'celeste') s.celesteTalks = 1; });
  step(s => { s.layout = 'floor'; });
  assert.equal(base.epilogue.photo.layout, 'floor', 'choosing a layout moves an unasked photo, as in Godot');
  step(s => { s.furniture = { table: { col: 0, row: 0 }, seats: { col: 2, row: 0 } }; });
  assert.deepEqual(base.optional[FORK_OPTIONAL_KEY], { v: 1, layout: 'floor', furniture: { table: { col: 0, row: 0 }, seats: { col: 2, row: 0 } } });
  step(s => { s.mural = structuredClone(FULL_MURAL); s.palette = 'sunset'; });
  step(s => { s.soundcheck = true; });
  const open = step(s => { s.opened = true; });
  assert.equal(parseRaw(open.raw).block_opened, true);
  assert.equal(open.envelope.save_seq, 10);
  step(s => { s.epilogue.photo = { status: 'skipped' }; });
  assert.deepEqual(base.epilogue.photo, { status: 'skipped', participants: [], mural: {}, palette: 'sunset', layout: 'floor' });
  step(s => { s.epilogue.packing = true; s.epilogue.returned = ['table']; });
  step(s => { s.programme = { order: ['stories', 'beats', 'pause', 'art'], published: ['stories', 'beats', 'pause', 'art'] }; });
  step(s => { s.hosting.order = ['stories', 'beats', 'pause', 'art']; s.hosting.results = [{ id: 'stories', value: 'future' }]; });
  step(s => { s.hosting.results.push({ id: 'beats', value: 0 }, { id: 'pause', value: 'pairs' }, { id: 'art', value: { tiles: [2, 2, 2, 0, 0, 0], palette: 'cool' } }); });
  step(s => { s.civic = { phase: 'planning', draft: { topic: 'access', format: 'circle', notes: 'themes' }, result: null }; });
  step(s => { s.civic = { phase: 'done', draft: { topic: 'access', format: 'circle', notes: 'themes' }, result: { topic: 'access', format: 'circle', notes: 'themes' } }; });
  const last = step(s => { s.film = { phase: 'hold', draft: { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] }, result: { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] }, captured: [] }; });
  assert.equal(last.envelope.save_seq, 18);
  assert.ok(last.bytes < SAVE_BUDGET);
});

test('furniture lives in optional browser-next and is checked like classic canPlaceFurniture', () => {
  const at = (layout, furniture, v = 1) => raw(openedEnvelope({ gathering_layout: layout, optional: { other: 'kept', [FORK_OPTIONAL_KEY]: { v, layout, furniture } } }));
  assert.deepEqual(loaded(at('table', { table: { col: 0, row: 0 }, seats: { col: 2, row: 3 }, speaker: { col: 6, row: 4 } })).state.furniture, { table: { col: 0, row: 0 }, seats: { col: 2, row: 3 }, speaker: { col: 6, row: 4 } });
  assert.deepEqual(loaded(at('table', { table: { col: 0, row: 0 }, seats: { col: 1, row: 0 } })).state.furniture, { table: { col: 0, row: 0 } }, 'an overlapping piece is dropped');
  assert.deepEqual(loaded(at('table', { table: { col: 0, row: 2 } })).state.furniture, {}, 'the through-route row stays clear');
  assert.deepEqual(loaded(at('floor', { table: { col: 0, row: 1 } })).state.furniture, {}, 'a vertical table cannot reach the route');
  assert.deepEqual(loaded(at('floor', { table: { col: 7, row: 0 } })).state.furniture, { table: { col: 7, row: 0 } }, 'the floor table stands vertically');
  assert.deepEqual(loaded(at('table', { table: { col: 7, row: 0 } })).state.furniture, {});
  assert.deepEqual(loaded(at('table', { table: { col: 0.5, row: 0 } })).state.furniture, {});
  assert.deepEqual(loaded(at('table', { table: { col: 0, row: 0 } }, 2)).state.furniture, {}, 'unknown version');
  const moved = edit(at('table', { table: { col: 0, row: 0 } }), env => { env.gathering_layout = 'floor'; });
  assert.deepEqual(loaded(moved).state.furniture, {}, 'furniture placed for another layout is dropped');
  const godotFloats = at('table', { table: { col: 0, row: 0 } }).replace('"col":0,"row":0', '"col":0.0,"row":0.0');
  assert.deepEqual(loaded(godotFloats).state.furniture, { table: { col: 0, row: 0 } }, 'a whole number written as 0.0 still loads');
  const { envelope, state } = loaded(at('table', { table: { col: 0, row: 0 } }));
  state.furniture = {};
  assert.deepEqual(parseRaw(save(envelope, state).raw).optional, { other: 'kept' }, 'no furniture removes only the fork key');
});

test('self-check refuses writes Godot would reset or demote', () => {
  const ready = loaded(raw(readyEnvelope({ visited_neighbors: ['bea', 'celeste', 'dez', 'rook'] })));
  const forged = { ...structuredClone(ready.state), opened: true };
  assert.deepEqual([refusal(ready.envelope, forged).reason, refusal(ready.envelope, forged).detail], ['self-check', 'opened'], 'block_opened is never written without the gate');
  const opened = loaded(raw(openedEnvelope()));
  const cases = [
    [s => { s.civic.phase = 'planning'; }, 'civic', opened],
    [s => { s.film.phase = 'planning'; }, 'film', opened],
    [s => { s.programme.order = ['stories']; s.opened = false; }, 'programme', opened],
    [s => { s.programme.order = ['stories']; }, 'programme', ready],
    [s => { s.visited = [...s.visited, 'zed']; }, 'visited_neighbors', opened],
    [s => { s.visited = ['thanh', 'bea', 'celeste', 'dez', 'rook']; }, 'visited', opened],
    [s => { s.greeted = false; }, 'greeted', opened],
    [s => { s.celesteTalks = -1; }, 'celeste_talk_count', opened],
    [s => { s.celesteTalks = 1.5; }, 'celeste_talk_count', opened],
    [s => { s.history = 'yes'; }, 'history_read', opened],
    [s => { s.palette = 'neon'; }, 'mural_palette', opened],
    [s => { s.mural.sun = { col: 3, row: 1 }; }, 'mural_placements', opened],
    [s => { s.epilogue.photo = { status: 'taken', participants: ['bea', 'rook'], layout: 'table', palette: 'garden', mural: structuredClone(FULL_MURAL) }; }, 'epilogue', opened],
    [s => { s.epilogue.returned = ['table']; }, 'epilogue', opened],
    [s => { s.layout = null; }, 'layout', opened],
    [s => { s.furniture = { table: { col: 0, row: 0 }, seats: { col: 1, row: 0 } }; }, 'furniture', opened],
    [s => { s.furniture = { table: { col: 0, row: 0 } }; }, 'furniture', ready],
    [s => { s.hosting.extra = true; }, 'hosting', opened],
    [s => { s.surprises = ['not_a_surprise']; }, 'surprises', opened],
    [s => { s.surprises = ['jeffrey_record', 'cutesy_dino']; }, 'surprises', opened],
    [s => { s.surprises = 'cutesy_dino'; }, 'surprises', opened],
    [s => { delete s.epilogue; }, 'state', opened],
  ];
  for (const [change, detail, from] of cases) {
    const state = structuredClone(from.state);
    change(state);
    const result = refusal(from.envelope, state);
    assert.deepEqual([result.reason, result.detail], ['self-check', detail], String(change));
  }
  assert.equal(refusal({ ...opened.envelope, district_boundary_visible: 'no' }, opened.state).detail, 'district_boundary_visible', 'a bad base field is not written either');
  assert.equal(refusal(opened.envelope, null).detail, 'state');
});

test('writes never mutate their inputs', () => {
  const { envelope, state } = loaded(GODOT_WRITTEN.fullRun);
  const before = canonicalStringify([envelope, state]);
  deepFreeze(envelope); deepFreeze(state);
  const result = save(envelope, state);
  assert.equal(canonicalStringify([envelope, state]), before);
  assert.notEqual(result.envelope, envelope);
  assert.equal(result.envelope.save_seq, 114);
});

// Godot's next write of the same state (save_godot_state): save_seq one higher, and build_save_envelope always writes these keys.
const godotNextBytes = env => utf8Bytes(canonicalStringify({ active_motif: 'sun', discovered_surprises: [], district_boundary_visible: true, ...env, save_seq: env.save_seq + 1 }));
test('the 4096-byte budget leaves Godot room to write the same save again', () => {
  for (const seq of [7, 8, 9, 98, 99]) {
    const base = { ...freshEnvelope(), save_seq: seq, optional: { padding: '' } }, digit = String(seq + 2).length - String(seq + 1).length;
    const padding = SAVE_BUDGET - digit - buildGodotSave(base, freshState()).bytes;
    const exact = save({ ...base, optional: { padding: 'a'.repeat(padding) } }, freshState());
    assert.equal(exact.bytes, SAVE_BUDGET - digit, `save_seq ${seq + 1}`); assert.equal(exact.envelope.save_seq, seq + 1);
    assert.equal(godotNextBytes(exact.envelope), SAVE_BUDGET, `Godot's write at save_seq ${seq + 2} fits exactly`);
    const over = refusal({ ...base, optional: { padding: 'a'.repeat(padding + 1) } }, freshState());
    assert.deepEqual([over.reason, over.bytes, over.envelope], ['full', SAVE_BUDGET - digit + 1, null], `save_seq ${seq + 1}`);
  }
  const old = { ...freshEnvelope(), save_seq: 20, optional: { padding: '' } };
  for (const key of ['active_motif', 'discovered_surprises', 'district_boundary_visible']) delete old[key];
  assert.equal(load(canonicalStringify(old)).status, 'loaded', 'an older Godot shape without these keys loads');
  const room = SAVE_BUDGET - 80 - buildGodotSave(old, freshState()).bytes;
  const fits = save({ ...old, optional: { padding: 'a'.repeat(room) } }, freshState());
  assert.equal(['active_motif', 'discovered_surprises', 'district_boundary_visible'].filter(key => Object.hasOwn(fits.envelope, key)).length, 0, 'the fork does not invent Godot-owned keys');
  assert.equal(godotNextBytes(fits.envelope), SAVE_BUDGET, "Godot's next write adds the 80 bytes of keys it always writes");
  assert.equal(refusal({ ...old, optional: { padding: 'a'.repeat(room + 1) } }, freshState()).reason, 'full');
  const full = loaded(edit(GODOT_WRITTEN.fullRun, env => { env.optional.budget_probe = 'x'.repeat(5000); }));
  assert.equal(full.envelope.optional.budget_probe.length, 5000, 'an envelope over budget still loads');
  assert.equal(refusal(full.envelope, full.state).reason, 'full');
  const roomy = edit(GODOT_WRITTEN.fullRun, env => { env.discovered_surprises = [...SURPRISES]; env.mural_scenes = { left: 'sharing', right: 'painting' }; env.optional.story_test_bookmark = 'x'.repeat(512); });
  const r = loaded(roomy);
  assert.ok(save(r.envelope, r.state).bytes <= SAVE_BUDGET, 'study_test.gd 4348: full profile, both scenes, all surprises and 512 bytes of metadata fit');
});

test("a save full only of keys no Godot writes drops them, largest first, as Godot's own next write would", () => {
  // A readable save carrying 2 MB under an unknown key (a non-Godot writer or a corrupt save): the write goes through without it.
  const junk = loaded(canonicalStringify({ ...freshEnvelope(), junk: 'x'.repeat(2_000_000) }));
  const met = { ...structuredClone(junk.state), visited: ['bea'], greeted: true }, out = save(junk.envelope, met);
  assert.deepEqual([Object.hasOwn(parseRaw(out.raw), 'junk'), Object.hasOwn(out.envelope, 'junk')], [false, false], 'the junk is dropped');
  assert.ok(out.bytes <= SAVE_BUDGET); assert.deepEqual(loaded(out.raw).state.visited, ['bea'], "the write loads under the fork's Godot rules");
  // Only as many as it takes, largest first: a small unknown key that fits stays, as rule 2 keeps it.
  const base = { ...freshEnvelope(), save_seq: 7 }, room = SAVE_BUDGET - buildGodotSave(base, freshState()).bytes;
  const two = save({ ...base, future: 1, later: 'b'.repeat(room) }, freshState());
  assert.deepEqual([Object.hasOwn(two.envelope, 'later'), parseRaw(two.raw).future], [false, 1]);
  assert.equal(parseRaw(save({ ...base, future: 1 }, freshState()).raw).future, 1, '{"future":1} beside a normal save is kept');
  // A save that cannot fit even once every unknown key is gone stays full.
  assert.deepEqual(why({ ...base, future: 1, optional: { pad: 'x'.repeat(room) } }, freshState()), ['full', '']);
});

test('UTF-8 bytes, not UTF-16 length, decide the budget', () => {
  assert.equal(utf8Bytes('aé😀'), 1 + 2 + 4);
  const unicode = loaded(raw(godotEnvelope({ visited_neighbors: ['bea'], optional: { unicode: 'é'.repeat(2200) } })));
  assert.equal(unicode.envelope.optional.unicode.length, 2200, 'multibyte text under the character cap is kept');
  const refused = refusal(unicode.envelope, unicode.state);
  assert.equal(refused.reason, 'full');
  assert.ok(canonicalStringify({ ...unicode.envelope, save_seq: 1 }).length < SAVE_BUDGET, 'the UTF-16 length alone would have fit');
  const base = { ...freshEnvelope(), optional: { padding: '' } };
  const room = SAVE_BUDGET - buildGodotSave(base, freshState()).bytes;
  const exact = save({ ...base, optional: { padding: 'é'.repeat(room / 2) } }, freshState());
  assert.equal(exact.bytes, SAVE_BUDGET); assert.equal(Buffer.byteLength(exact.raw), SAVE_BUDGET);
  assert.equal(refusal({ ...base, optional: { padding: `${'é'.repeat(room / 2 - 1)}😀` } }, freshState()).bytes, SAVE_BUDGET + 2);
  const emoji = loaded(raw(godotEnvelope({ optional: { e: '😀'.repeat(4090) } })));
  assert.equal(emoji.envelope.optional.e.length, 8180, 'Godot counts code points for the optional cap');
  assert.equal(loaded(raw(godotEnvelope({ optional: { e: '😀'.repeat(4100) } }))).envelope.optional.e.length, 8200, '8200 UTF-16 units are 4100 code points');
  assert.deepEqual(loaded(raw(godotEnvelope({ optional: { e: 'x'.repeat(8190) } }))).envelope.optional, {}, 'over 8192 code points drops optional');
});

test('fresh envelope and fresh state agree', () => {
  const first = save(null, freshState());
  assert.equal(first.envelope.save_seq, 1);
  const back = loaded(first.raw);
  for (const key of FORK_FIELDS) assert.deepEqual(back.state[key], freshState()[key], key);
  assert.deepEqual(loaded(canonicalStringify(freshEnvelope())).envelope, freshEnvelope());
});

test('more strict-field cases that make Godot reset', () => {
  for (const [key, bad] of [['story', 'past'], ['palette', 'hot'], ['quiet', 'loud'], ['story', 5]]) rejected(raw(minimalEnvelope({ hosting: { draft: { [key]: bad } } })), `hosting draft ${key} ${bad}`);
  const beats = value => raw(hostedEnvelope({ hosting: { ...hostedEnvelope().hosting, results: HOSTED_RESULTS.map(r => r.id === 'beats' ? { id: 'beats', value } : r) } }));
  rejected(beats(256), 'beats result over 255');
  assert.equal(loaded(beats(255)).state.hosting.results[1].value, 255);
  const plan = { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] };
  rejected(raw(civicDoneEnvelope({ film: { phase: 'idle', result: plan } })), 'idle film with a result');
  rejected(raw(civicDoneEnvelope({ film: { phase: 'planning', captured: ['seat'] } })), 'planning film with a capture');
  rejected(raw(civicDoneEnvelope({ film: { phase: 'hold', result: plan, captured: ['seat'] } })), 'film hold with one captured shot');
  rejected(raw(civicDoneEnvelope({ film: { phase: 'hold' } })), 'film hold without a plan');
  assert.equal(loaded(raw(civicDoneEnvelope({ film: { phase: 'hold', result: plan } }))).state.film.phase, 'hold');
});

test('Godot canonical order, and greeted means Bea was met', () => {
  const env = hostedEnvelope();
  env.epilogue.returned = ['speaker', 'table', 'paint-case']; env.epilogue.photo.participants = ['thanh', 'bea'];
  const { state, envelope } = loaded(raw(env));
  assert.deepEqual(state.epilogue.returned, LOAN_IDS); assert.deepEqual(envelope.epilogue.returned, LOAN_IDS);
  assert.deepEqual(state.epilogue.photo.participants, ['bea', 'thanh']); assert.deepEqual(envelope.epilogue.photo.participants, ['bea', 'thanh']);
  const backwards = structuredClone(state);
  backwards.epilogue.returned = ['speaker', 'table', 'paint-case'];
  assert.deepEqual(why(envelope, backwards), ['self-check', 'epilogue'], 'a non-canonical return order would not survive a reload');
  const met = loaded(raw(minimalEnvelope({ visited_neighbors: ['dez', 'celeste'] })));
  assert.equal(met.state.greeted, false); assert.deepEqual(met.state.visited, ['celeste', 'dez']);
  assert.deepEqual(parseRaw(save(met.envelope, met.state).raw).visited_neighbors, ['celeste', 'dez']);
  assert.deepEqual(why(met.envelope, { ...met.state, greeted: true }), ['self-check', 'greeted']);
});

test('furniture grid edges and the optional character cap', () => {
  const at = (furniture, layout = 'table') => raw(openedEnvelope({ gathering_layout: layout, optional: { [FORK_OPTIONAL_KEY]: { v: 1, layout, furniture } } }));
  assert.deepEqual(loaded(at({ seats: { col: 6, row: 4 }, speaker: { col: 0, row: 5 } })).state.furniture, { seats: { col: 6, row: 4 } }, 'row 5 is off the grid');
  assert.deepEqual(loaded(at({ seats: { col: 7, row: 4 } })).state.furniture, {}, 'a two-cell piece cannot start in the last column');
  assert.deepEqual(loaded(at({ seats: { col: -1, row: 0 } })).state.furniture, {});
  assert.deepEqual(loaded(at({ table: { col: 0, row: 3 } }, 'floor')).state.furniture, { table: { col: 0, row: 3 } });
  assert.deepEqual(loaded(at({ table: { col: 0, row: 4 } }, 'floor')).state.furniture, {}, 'a vertical table cannot hang off the last row');
  const kept = n => loaded(raw(godotEnvelope({ optional: { e: 'x'.repeat(n) } }))).envelope.optional;
  assert.equal(canonicalStringify({ e: 'x'.repeat(OPTIONAL_MAX_CHARS - 8) }).length, OPTIONAL_MAX_CHARS);
  assert.equal(kept(OPTIONAL_MAX_CHARS - 8).e.length, OPTIONAL_MAX_CHARS - 8, '8192 serialized characters are kept');
  assert.deepEqual(kept(OPTIONAL_MAX_CHARS - 7), {}, '8193 drop optional');
});

test('a non-taken photo keeps the layout and palette Godot would hold', () => {
  // Godot chose the Open Floor, then reloaded before opening: the unopened photo is back at the default.
  const before = loaded(raw(readyEnvelope({ gathering_layout: 'floor', epilogue: { photo: { status: 'unasked', layout: 'floor' }, packing: false, returned: [] } })));
  assert.equal(before.envelope.epilogue.photo.layout, 'table');
  const open = save(before.envelope, { ...structuredClone(before.state), opened: true });
  assert.deepEqual([open.envelope.gathering_layout, open.envelope.epilogue.photo.layout], ['floor', 'table'], 'open_block_gathering keeps the photo layout once a layout was chosen');
  const reopened = loaded(open.raw);
  const skip = save(reopened.envelope, { ...structuredClone(reopened.state), epilogue: { packing: false, returned: [], photo: { status: 'skipped' } } });
  assert.equal(skip.envelope.epilogue.photo.layout, 'table', 'skip_keepsake_photo keeps the photo layout');
  // set_mural_palette never touches the photo; skip and pack take the current mural palette.
  const sunset = loaded(raw(openedEnvelope({ mural_palette: 'sunset' })));
  assert.equal(sunset.envelope.epilogue.photo.palette, 'sunset');
  const ocean = { ...structuredClone(sunset.state), palette: 'ocean' };
  const repainted = save(sunset.envelope, ocean);
  assert.equal(repainted.envelope.epilogue.photo.palette, 'sunset', 'an unasked photo keeps its palette');
  const skipped = { ...ocean, epilogue: { packing: false, returned: [], photo: { status: 'skipped' } } };
  const skipNow = save(repainted.envelope, skipped);
  assert.equal(skipNow.envelope.epilogue.photo.palette, 'ocean');
  assert.equal(save(skipNow.envelope, { ...skipped, palette: 'garden' }).envelope.epilogue.photo.palette, 'ocean', 'a skipped photo keeps its palette');
  assert.equal(save(skipNow.envelope, { ...skipped, layout: 'floor' }).envelope.epilogue.photo.layout, 'table', 'only an unasked photo follows the layout');
});

test('a write never loses progress the base envelope holds', () => {
  const full = loaded(GODOT_WRITTEN.fullRun);
  assert.deepEqual(why(full.envelope, freshState()), ['regress', 'visited_neighbors'], 'a fresh state over a full run');
  const skippedPhoto = { status: 'skipped', participants: [], mural: {}, palette: 'garden', layout: 'table' };
  const packed = openedEnvelope({ epilogue: { photo: skippedPhoto, packing: true, returned: ['table'] } });
  const plan = { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] };
  const cases = [
    [minimalEnvelope({ visited_neighbors: ['bea', 'celeste'] }), s => { s.visited = ['bea']; }, 'visited_neighbors'],
    [minimalEnvelope({ celeste_talk_count: 3 }), s => { s.celesteTalks = 2; }, 'celeste_talk_count'],
    [readyEnvelope(), s => { s.soundcheck = false; }, 'rook_soundcheck_done'],
    [openedEnvelope(), s => { s.opened = false; }, 'block_opened'],
    [openedEnvelope({ history_read: true }), s => { s.history = false; }, 'history_read'],
    [openedEnvelope({ blackhawk_discovered: true }), s => { s.blackhawk = false; }, 'blackhawk_discovered'],
    [readyEnvelope({ gathering_layout: 'floor' }), s => { s.layout = null; }, 'gathering_layout'],
    [packed, s => { s.epilogue.packing = false; s.epilogue.returned = []; }, 'epilogue'],
    [packed, s => { s.epilogue.returned = []; }, 'epilogue'],
    [openedEnvelope({ epilogue: { photo: skippedPhoto, packing: false, returned: [] } }), s => { s.epilogue.photo = { status: 'unasked' }; }, 'epilogue'],
    [hostedEnvelope(), s => { s.epilogue.photo = { status: 'skipped' }; }, 'epilogue'],
    [hostedEnvelope(), s => { s.epilogue.photo.participants = ['bea']; }, 'epilogue'],
    [hostedEnvelope(), s => { s.programme.published = []; }, 'programme'],
    [hostedEnvelope(), s => { s.hosting.results.pop(); }, 'hosting'],
    [hostedEnvelope(), s => { s.hosting.results[0].value = 'future'; }, 'hosting'],
    [hostedEnvelope(), s => { s.hosting.order = ['beats', 'pause', 'stories', 'art']; s.hosting.results = []; }, 'hosting'],
    [civicDoneEnvelope(), s => { s.civic = { phase: 'planning', draft: { topic: 'access', format: 'dropin', notes: 'none' }, result: null }; }, 'civic'],
    [filmDoneEnvelope(), s => { s.film.phase = 'shooting'; s.film.captured.pop(); }, 'film'],
    [civicDoneEnvelope({ film: { phase: 'shooting', result: plan, captured: ['seat', 'paint'] } }), s => { s.film.captured.pop(); }, 'film'],
    [godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: ['cutesy_dino', 'jeffrey_record'] }), s => { s.surprises = ['cutesy_dino']; }, 'discovered_surprises'],
    [godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: ['future_id', 'jeffrey_record'] }), s => { s.surprises = []; }, 'discovered_surprises'],
  ];
  for (const [env, change, detail] of cases) {
    const { envelope, state } = loaded(raw(env));
    const next = structuredClone(state);
    change(next);
    assert.deepEqual(why(envelope, next), ['regress', detail], String(change));
    assert.equal(save(envelope, next, { reset: true }).ok, true, 'Restart may move progress back');
  }
  assert.equal(save(null, freshState()).ok, true, 'a fresh envelope holds nothing to lose');
  assert.equal(save({ ...full.envelope, version: 2 }, freshState()).ok, true, 'a base Godot would reset holds no progress to protect');
});

test('deeply nested saves are held as unreadable instead of throwing', () => {
  const extra = value => `${raw(minimalEnvelope()).slice(0, -1)},"extra":${value}}`;
  const arrays = n => `${'['.repeat(n)}${']'.repeat(n)}`;
  for (const n of [5000, 20000, 100000]) {
    const result = load(extra(arrays(n)));
    assert.deepEqual([result.status, result.reason], ['invalid', 'json'], `${n} nested arrays`);
    assert.equal(load(`${raw(minimalEnvelope()).slice(0, -1)},"optional":${'{"a":'.repeat(n)}1${'}'.repeat(n)}}`).status, 'invalid', `${n} nested objects in optional`);
  }
  assert.equal(load(extra(arrays(MAX_JSON_DEPTH - 1))).status, 'loaded', 'the envelope and 511 arrays are 512 levels');
  assert.equal(load(extra(arrays(MAX_JSON_DEPTH))).status, 'invalid');
  const text = loaded(raw(minimalEnvelope({ optional: { text: `\\"${'['.repeat(600)}` } }))).envelope.optional.text;
  assert.equal(text.length, 602, 'brackets inside strings do not count');
});

test('the budget counts optional numbers as Godot writes them back', () => {
  // Godot re-serializes optional's parsed floats: 0 as "0.0" and 1e21 as 22 digits; whole and plain decimals are unchanged.
  for (const [optional, growth] of [[{ n: 7 }, 0], [{ part: 0.5 }, 0], [{ n: 0 }, 2], [{ zeros: [0, 0, 0] }, 6], [{ big: 1e21 }, 17]]) {
    const base = { ...freshEnvelope(), optional: { ...optional, padding: '' } };
    const free = SAVE_BUDGET - buildGodotSave(base, freshState()).bytes;
    const padded = n => buildGodotSave({ ...base, optional: { ...optional, padding: 'a'.repeat(n) } }, freshState());
    assert.equal(padded(free - growth).ok, true, JSON.stringify(optional));
    const over = padded(free - growth + 1);
    assert.deepEqual([over.ok, over.reason, over.bytes], [false, 'full', SAVE_BUDGET - growth + 1], JSON.stringify(optional));
  }
});

// Godot's next write after it reloads a fork write: apply_save_envelope cleans each lenient value to its default and rebuilds a
// non-taken photo with the mural palette (validate_godot_epilogue's fallback_palette), and save_godot_state adds one to save_seq.
function godotReloadBytes(text) {
  const env = { active_motif: 'sun', discovered_surprises: [], district_boundary_visible: true, ...loaded(text).envelope };
  if (!MOTIFS.includes(env.active_motif)) env.active_motif = 'sun';
  if (!Array.isArray(env.discovered_surprises)) env.discovered_surprises = [];
  return utf8Bytes(canonicalStringify({ ...env, save_seq: env.save_seq + 1 }));
}
test('the budget leaves room for the values Godot rewrites longer when it reloads a fork write', () => {
  const largest = (base, state) => {
    const at = n => buildGodotSave({ ...base, optional: { pad: 'x'.repeat(n) } }, state);
    let lo = 0, hi = SAVE_BUDGET;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (at(mid).ok) lo = mid; else hi = mid - 1; }
    return at(lo);
  };
  const skipped = { photo: { status: 'skipped', participants: [], mural: {}, palette: 'ocean', layout: 'table' }, packing: false, returned: [] };
  const cases = [
    // set_mural_palette never touches the keepsake, so the fork keeps the photo's palette; Godot reloads it as the mural's.
    ['a skipped photo, then a longer mural palette', openedEnvelope({ mural_palette: 'ocean', epilogue: skipped }), s => ({ ...s, palette: 'sunset' })],
    ['an unasked photo, then a longer mural palette', openedEnvelope({ mural_palette: 'ocean' }), s => ({ ...s, palette: 'garden' })],
    ['lenient values Godot rewrites longer', godotEnvelope({ visited_neighbors: ['bea'], active_motif: '', discovered_surprises: 0 }), s => ({ ...s, palette: 'ocean' })],
  ];
  for (const [label, env, change] of cases) {
    const start = loaded(raw(env)), out = largest(start.envelope, change(structuredClone(start.state)));
    assert.equal(out.ok, true, label); assert.ok(out.bytes > SAVE_BUDGET - 40, `${label}: padded to the budget (${out.bytes} B)`);
    assert.ok(godotReloadBytes(out.raw) <= SAVE_BUDGET, `${label}: Godot can write it again after reloading it (${godotReloadBytes(out.raw)} B)`);
    const again = loaded(out.raw), rewrite = buildGodotSave(again.envelope, again.state);
    assert.equal(rewrite.ok, true, `${label}: so can the fork after a reload (${rewrite.reason} ${rewrite.bytes} B)`);
  }
});

test('a classic-shaped initial state gets the fork-only fields on every path', () => {
  const classic = () => { const s = freshState(); delete s.visited; delete s.celesteTalks; delete s.surprises; return s; };
  const found = raw(godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: ['cutesy_dino', 'bogus'] }));
  for (const [text, visited, surprises] of [[null, [], []], ['', [], []], ['garbage', [], []], ['{}', [], []], [GODOT_WRITTEN.firstMeeting, ['bea'], []], [found, ['bea'], ['cutesy_dino']]]) {
    const result = parseGodotSave(text, { initialState: classic });
    assert.deepEqual([result.state.visited, result.state.celesteTalks, result.state.surprises], [visited, 0, surprises], String(text));
    assert.equal(save(result.envelope, result.state).ok, true, `first write after ${text}`);
  }
});

// --- Neighborhood surprises: found in either edition, held as the fork's state.surprises, written as discovered_surprises. ---
test('discovered_surprises loads as apply_save_envelope reads it: known string ids once, sorted, never a reset', () => {
  assert.match(funcBody('apply_save_envelope'), /var raw_surprises: Variant = env\.get\("discovered_surprises", \[\]\)\n\tif raw_surprises is Array:\n\t\tfor s_entry in raw_surprises:\n\t\t\tif s_entry is String and String\(s_entry\) in NEIGHBORHOOD_SURPRISE_IDS:\n\t\t\t\tdiscovered_surprises\[String\(s_entry\)\] = true\n/);
  assert.match(funcBody('build_save_envelope'), /\tfor sk in discovered_surprises\.keys\(\):\n\t\tvar s_id := String\(sk\)\n\t\tif s_id in NEIGHBORHOOD_SURPRISE_IDS:\n\t\t\ts_list\.append\(s_id\)\n\ts_list\.sort\(\)\n/);
  const at = value => loaded(raw(godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: value })));
  const absent = godotEnvelope({ visited_neighbors: ['bea'] });
  delete absent.discovered_surprises;
  assert.deepEqual(loaded(raw(absent)).state.surprises, [], 'absent');
  for (const value of ['x', 7, null, true, {}, { 0: 'cutesy_dino' }, []]) assert.deepEqual(at(value).state.surprises, [], JSON.stringify(value));
  const mixed = ['mayor_pomp_event', 7, null, 'mayor_pomp_event', 'future_id', 'cutesy_dino', ['cutesy_dino'], 'Cutesy_Dino', { id: 'jeffrey_record' }];
  assert.deepEqual(at(mixed).state.surprises, ['cutesy_dino', 'mayor_pomp_event']);
  assert.deepEqual(at([...SURPRISE_IDS].reverse()).state.surprises, [...SURPRISE_IDS].sort());
  for (const value of ['x', 7, mixed]) assert.deepEqual(at(value).envelope.discovered_surprises, value, 'the envelope keeps the stored value for Godot to clean');
  assert.deepEqual(freshState().surprises, []);
});

test('cleanSurprises is visits/surprises.js readDiscovered, sorted (godot-save.js cannot import it)', () => {
  const inputs = [undefined, null, '', 'cutesy_dino', 7, true, {}, { 0: 'cutesy_dino', length: 1 }, [], ['cutesy_dino'], ['cutesy_dino', 'cutesy_dino'],
    ['mayor_pomp_event', 7, null, 'mayor_pomp_event', 'future_id', 'cutesy_dino', ['x']], [...SURPRISE_IDS].reverse(), [...SURPRISE_IDS, ...SURPRISE_IDS],
    [new String('cutesy_dino'), ' cutesy_dino', 'cutesy_dino ', 'CUTESY_DINO', 'constructor', '__proto__', 'jeffrey_record']];
  for (const value of inputs) assert.deepEqual(cleanSurprises(value), [...readDiscovered(value)].sort(), JSON.stringify(value));
});

test('a find writes the sorted union, keeping stored ids no Godot knows yet and dropping what Godot drops', () => {
  const stored = loaded(raw(godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: ['mayor_pomp_event', 7, null, 'future_id', 'cutesy_dino', 'cutesy_dino', ['x'], 'another_future'] })));
  assert.deepEqual(stored.state.surprises, ['cutesy_dino', 'mayor_pomp_event']);
  const found = { ...structuredClone(stored.state), surprises: ['bite_size_nachos', 'cutesy_dino', 'mayor_pomp_event'] }, out = save(stored.envelope, found);
  assert.deepEqual(parseRaw(out.raw).discovered_surprises, ['another_future', 'bite_size_nachos', 'cutesy_dino', 'future_id', 'mayor_pomp_event']);
  assert.deepEqual(loaded(out.raw).state.surprises, found.surprises);
  // A first find on an older save without the key writes it; the same save without a find gains no key.
  const old = godotEnvelope({ visited_neighbors: ['bea'] });
  delete old.discovered_surprises;
  const first = loaded(raw(old));
  assert.equal(Object.hasOwn(save(first.envelope, first.state).envelope, 'discovered_surprises'), false);
  assert.deepEqual(save(first.envelope, { ...structuredClone(first.state), surprises: ['jeffrey_record'] }).envelope.discovered_surprises, ['jeffrey_record']);
  // A stored value Godot would clean to nothing is replaced by the find.
  const odd = loaded(raw(godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: 'x' })));
  assert.deepEqual(parseRaw(save(odd.envelope, { ...structuredClone(odd.state), surprises: ['jeffrey_record'] }).raw).discovered_surprises, ['jeffrey_record']);
});

test('without a find, any stored discovered_surprises is written back verbatim', () => {
  for (const value of ['x', 7, null, {}, ['cutesy_dino', 'cutesy_dino', 'future_id', 3], [...SURPRISES], [...SURPRISES].reverse(), []]) {
    const r = loaded(raw(godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: value })));
    assert.deepEqual(parseRaw(save(r.envelope, { ...structuredClone(r.state), celesteTalks: 1 }).raw).discovered_surprises, value, JSON.stringify(value));
  }
});

test('found surprises are forward-only: a stale state is refused, Restart writes it, and lostProgress names it', () => {
  const two = godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: ['cutesy_dino', 'jeffrey_record', 'future_id'] }), r = loaded(raw(two));
  const stale = { ...structuredClone(r.state), surprises: ['cutesy_dino'] };
  assert.deepEqual(why(r.envelope, stale), ['regress', 'discovered_surprises']);
  assert.deepEqual(parseRaw(save(r.envelope, stale, { reset: true }).raw).discovered_surprises, ['cutesy_dino', 'future_id'], 'Restart may; ids Godot does not know stay');
  const one = godotEnvelope({ visited_neighbors: ['bea'], discovered_surprises: ['jeffrey_record'] });
  assert.equal(lostProgress(two, one), 'discovered_surprises');
  assert.equal(lostProgress(one, two), '');
  assert.equal(lostProgress(two, { ...two, discovered_surprises: 'x' }), 'discovered_surprises', 'a value Godot cleans to nothing lost them as well');
  assert.equal(lostProgress(two, { ...two, discovered_surprises: [...two.discovered_surprises].reverse() }), '', 'order is not progress');
  assert.equal(lostProgress(two, { ...one, visited_neighbors: [] }), 'visited_neighbors', 'the meetings are named first');
});

test('all ten surprises fit beside the full run and both scenes; on a full save a find stays visit-only', () => {
  const r = loaded(GODOT_WRITTEN.fullRunScenes), all = { ...structuredClone(r.state), surprises: [...SURPRISE_IDS].sort() };
  const without = save(r.envelope, r.state), out = save(r.envelope, all);
  assert.equal(out.bytes - without.bytes, utf8Bytes(JSON.stringify([...SURPRISE_IDS].sort())) - 2, 'the ten sorted ids in place of []');
  assert.ok(out.bytes <= SAVE_BUDGET && godotReloadBytes(out.raw) <= SAVE_BUDGET, `${out.bytes} B; Godot's next write ${godotReloadBytes(out.raw)} B`);
  // Padded until the stored save fills the budget: the find is refused as full, as Godot's own save_godot_state would refuse it.
  const padded = n => loaded(edit(GODOT_WRITTEN.fullRun, env => { env.optional.pad = 'x'.repeat(n); }));
  let lo = 0, hi = SAVE_BUDGET;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1, p = padded(mid); if (buildGodotSave(p.envelope, p.state).ok) lo = mid; else hi = mid - 1; }
  const full = padded(lo);
  assert.equal(buildGodotSave(full.envelope, full.state).ok, true);
  assert.deepEqual(why(full.envelope, { ...structuredClone(full.state), surprises: ['cutesy_dino'] }), ['full', '']);
});

test('celeste_talk_count stays within the whole numbers JavaScript holds exactly', () => {
  const talks = text => raw(minimalEnvelope({ celeste_talk_count: 0 })).replace('"celeste_talk_count":0', `"celeste_talk_count":${text}`);
  for (const text of ['1e300', '9007199254740992', '9007199254740993']) rejected(talks(text), text);
  const max = loaded(talks(String(Number.MAX_SAFE_INTEGER)));
  assert.equal(save(max.envelope, max.state).envelope.celeste_talk_count, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(why(max.envelope, { ...max.state, celesteTalks: 2 ** 53 }), ['self-check', 'celeste_talk_count']);
});
