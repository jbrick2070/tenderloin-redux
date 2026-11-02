// The ending chain's localization (docs/I18N_PLAN.md I2d): English stays byte-identical, every composed sentence is one
// whole-sentence composite (ending/compose.js) equal to Godot's concatenation, ids reach the screen through display tables, the
// paper's alt no longer splits a rendered sentence, and under the pseudo-locale every string the views and ending/ui.js produce is
// looked up: no English run reaches the screen, and no lookup misses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gdStrings, gdSource } from './gd-lex.mjs';
import { GODOT, GODOT_CONSTS, gdf, gdfRaw, capitalize, web } from '../browser-next/ending/text.js';
import { ENDING_COMPOSE, ENDING_DISPLAY, ENDING_UI, compose, midSentence } from '../browser-next/ending/compose.js';
import { setLocale, readCatalog, pseudo, pseudoCatalog, diagnostics, isEnglish, signature, onMiss } from '../browser-next/i18n.js';
import { FILM_SHOTS, FILM_TEXT } from '../browser-next/film.js';
import { HOSTING_TEXT } from '../browser-next/hosting.js';
import { readSource, isHumanText } from '../scripts/i18n.mjs';
import { parseGodotSave } from '../browser-next/godot-save.js';
import { initialState } from '../browser-next/core.js';
import { GODOT_WRITTEN, PUBLISHED, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope, raw, fakeDialog } from './next-fixtures.mjs';
import * as H from '../browser-next/ending/hosted.js';
import * as GA from '../browser-next/ending/gather-again.js';
import * as SC from '../browser-next/ending/screening.js';
import * as B from '../browser-next/ending/bench.js';
import * as R from '../browser-next/ending/habitat.js';
import * as O from '../browser-next/ending/orbital.js';
import * as MU from '../browser-next/ending/mural.js';
import { createEnding } from '../browser-next/ending/ui.js';

const G = GODOT, C = GODOT_CONSTS;
const stateOf = env => { const r = parseGodotSave(raw(env), { initialState }); assert.equal(r.status, 'loaded', r.reason); return r.state; };
const full = () => parseGodotSave(GODOT_WRITTEN.fullRun, { initialState }).state;
const flat = (value, out = []) => { if (typeof value === 'string') out.push(value); else if (value && typeof value === 'object') for (const v of Object.values(value)) flat(v, out); return out; };
const entries = (value, path = '', out = []) => { if (typeof value === 'string') out.push([path, value]); else for (const [k, v] of Object.entries(value)) entries(v, path ? `${path}.${k}` : k, out); return out; };
const english = fn => { setLocale('en'); try { return fn(); } finally { setLocale('en'); } };
// Every msgid of i18n/source.json (the catalogs test keeps it fresh), read once before the tests run.
const sourceMsgids = readSource().entries.filter(e => !e.ctx).map(e => e.msgid);

// ---------- The composites ----------
// Godot's text as pieces: each fragment whole, and each part of a template between its % slots.
const PIECES = new Set(flat(G).flatMap(text => [text, web(text), ...web(text).split(/%[sdf]/)]).filter(Boolean));
// The structural joiners Godot's own concatenations put between values ('+' sites of the ported functions), and the one fork
// word the port already had (hosted.js cards: " selected").
const JOINERS = new Set([': "', '"\n', '\n', ': ', '. ', ', ', '+ ', ' ', '.', '"', 'Bea: "', ' selected', '; ']);
// A literal run is a sequence of whole pieces and joiners (memoized partition).
function godotRun(run) {
  const memo = new Map(), ok = at => {
    if (at === run.length) return true;
    if (memo.has(at)) return memo.get(at);
    let found = false;
    for (let end = run.length; end > at && !found; end--) { const part = run.slice(at, end); if ((PIECES.has(part) || JOINERS.has(part)) && ok(end)) found = true; }
    memo.set(at, found); return found;
  };
  return ok(0);
}
test('every composite is Godot fragments and joiners around named placeholders: no invented English, no printf, not a Godot literal', () => {
  const godotLiterals = new Set(Object.keys(G).flatMap(file => gdStrings(gdSource(file))));
  for (const [path, template] of entries(ENDING_COMPOSE)) {
    assert.ok(!godotLiterals.has(template), `${path} is a Godot literal; it belongs in GODOT`);
    assert.doesNotMatch(template, /%/, `${path}: composites use {named} placeholders only`);
    // A composite without placeholders joins two Godot fragments into one msgid (Music:\nOn).
    if (!signature(template).named.length) assert.ok(!godotLiterals.has(template) && !PIECES.has(template), `${path} joins fragments`);
    // Each literal run is Godot's own text: whole fragments and template parts, with joiners between them.
    for (const run of template.split(/\{[A-Za-z_][A-Za-z0-9_]*\}/)) assert.ok(godotRun(run), `${path}: ${JSON.stringify(run)} is not Godot's text`);
    assert.ok(isHumanText(template), `${path}: the extractor reads it as text`);
  }
});
test('composites fill in English exactly as the concatenation, and in a locale they are looked up whole', () => {
  english(() => {
    assert.equal(compose(ENDING_COMPOSE.hostedDetail, { owner: 'Bea', reply: 'R', heading: 'H', result: 'X' }), 'Bea' + ': "' + 'R' + '"' + '\n' + 'H' + '\n' + 'X');
    assert.equal(compose(ENDING_COMPOSE.storiesResult, { title: 'T' }), G['hosted_afternoon.gd'].detail.storiesResult + 'T' + '.');
    assert.throws(() => compose(ENDING_COMPOSE.storiesResult, {}), /Missing value \{title\}/, 'a missing value fails loudly, never prints {title}');
    // A value is never read as a template: braces and percents in it stay as they are.
    assert.equal(compose(ENDING_COMPOSE.storiesResult, { title: '{title} 100%' }), 'Copied invitation: {title} 100%.');
  });
  const template = ENDING_COMPOSE.youReached, msgid = template;
  const read = readCatalog(JSON.stringify({ format: 1, locale: 'es', messages: { [msgid]: 'Llegaste a {place}. Invita a Thanh.' } }), 'es');
  setLocale('es', read.catalog);
  try { assert.equal(compose(template, { place: 'Arte' }), 'Llegaste a Arte. Invita a Thanh.', 'the translator reorders the whole sentence'); }
  finally { setLocale('en'); }
});

// Legacy concatenations, copied from the functions before I2d, over the fixture states: the module output equals them.
const H_C = C['hosted_afternoon.gd'], BEA = C['bea_invitation.gd'].TITLES, QUIET = C['quiet_seats.gd'].TITLES, M = C['main.gd'];
function legacyHostedDetail(state, id) {
  const d = G['hosted_afternoon.gd'].detail, index = H_C.IDS.indexOf(id), position = state.hosting.order.indexOf(id);
  const heading = gdfRaw(d.heading, M.PROGRAMME_TITLES[id], H_C.POSITIONS[position]);
  const value = state.hosting.results.find(r => r.id === id).value;
  let result, reply;
  if (id === 'stories') { result = d.storiesResult + BEA[value] + '.'; reply = value === 'memory' ? d.storiesMemory : d.storiesFuture; }
  else if (id === 'beats') { const slots = []; for (let i = 0; i < 8; i++) if (value & (1 << i)) slots.push(String(i + 1)); result = slots.length ? gdfRaw(d.beatsSome, slots.length, slots.join(', ')) : d.beatsNone; reply = slots.length ? gdfRaw(d.beatsSomeReply, slots.length) : d.beatsNoneReply; }
  else if (id === 'art') { result = gdfRaw(d.artResult, value.palette[0].toUpperCase() + value.palette.slice(1)); reply = value.palette === 'warm' ? d.artWarm : d.artCool; }
  else { result = d.pauseResult + QUIET[value] + '.'; reply = value === 'arc' ? d.pauseArc : d.pausePairs; }
  return H_C.OWNERS[index] + ': "' + reply + '"' + '\n' + heading + '\n' + result;
}
const hostedStates = () => {
  const out = [];
  for (const story of ['memory', 'future']) for (const beats of [0, 1, 85, 255]) for (const palette of ['warm', 'cool']) for (const quiet of ['arc', 'pairs']) for (const order of [PUBLISHED, ['art', 'beats', 'pause', 'stories']]) {
    const all = { stories: story, beats, pause: quiet, art: { palette, tiles: [0, 1, 2, 2, 1, 0] } };
    out.push(stateOf(hostedEnvelope({ programme: { order: [...order], published: [...order] }, hosting: { ...hostedEnvelope().hosting, order: [...order], results: order.map(id => ({ id, value: all[id] })) } })));
  }
  return out;
};
test('hostedDetail is the legacy concatenation for every contribution, position and value', () => english(() => {
  let n = 0;
  for (const s of hostedStates()) for (const id of H.HOSTED_IDS) { assert.equal(H.hostedDetail(s, id), legacyHostedDetail(s, id), `${id} ${JSON.stringify(s.hosting.results)}`); n++; }
  assert.equal(n, 256);
  const s = stateOf(hostedEnvelope());
  assert.equal(H.invitation({ ...s, civic: { ...s.civic, phase: 'idle' } }), 'Bea: "' + gdfRaw(G['hosted_afternoon.gd'].invitation.opening, 'Story circle', 'Shared art panel') + ' ' + G['hosted_afternoon.gd'].invitation.idle + '"');
}));

// The orbital recap: orbital_commons.gd acknowledgments() and finale_text() as Godot concatenates them, before I2d.
const OT = G['orbital_commons.gd'], NAMES = C['habitat_room.gd'].NAMES, TITLES = C['habitat_room.gd'].TITLES;
function legacyAcknowledgments(o, room) {
  const a = OT.acknowledgments, c = o.copies, place = TITLES[o.gathering];
  return a.gathered + place + a.gatheredTail + c.art.palette + a.shapes + NAMES[R.sparePlace(room)].toLowerCase() + a.open + M.FILM_FRAMING_LABELS[c.film.framing].toLowerCase()
    + a.plan + M.FILM_PLAN_LABELS[c.film.plan].toLowerCase() + a.looked + (c.beats === 0 ? a.beatsNone : a.beatsSome)
    + a.thanh + QUIET[c.pause] + a.and + M.CIVIC_FORMAT_LABELS[c.civic.format] + a.pause + o.invitationTitle + a.never + place + a.tail;
}
function legacyFinale(o, room) {
  const f = OT.finale_text, c = o.copies, place = TITLES[o.gathering], answer = [f.answer0, f.answer1, f.answer2][o.gathering], shot = id => M.FILM_SHOT_LABELS[id];
  let body = legacyAcknowledgments(o, room);
  if (o.phase === 'gathered') body += f.response + answer + (o.completed ? f.gatheredDone : f.gatheredOpen);
  else if (o.phase === 'menu') body = (o.returned ? OT.recognition.returned : o.completed ? OT.recognition.completed : '') + f.you + answer + f.menu;
  else if (o.phase === 'recap') body = f.memories + TITLES[o.memory] + '\n' + [
    f.recapArt + c.art.palette + f.recapArtMid + NAMES[R.sparePlace(room)] + '.',
    f.recapFilm + shot(c.film.order[0]) + ', ' + shot(c.film.order[1]) + ', ' + shot(c.film.order[2]) + '. ' + M.FILM_FRAMING_LABELS[c.film.framing] + '.',
    f.recapSeats + QUIET[c.pause] + f.recapSeatsMid + M.CIVIC_FORMAT_LABELS[c.civic.format] + '.',
  ][o.memory] + '\n' + legacyAcknowledgments(o, room);
  else if (o.phase === 'return') body = f.returnHome + String(o.returnPanel + 1) + f.of3 + [f.return0 + o.invitationTitle + f.return0Mid + place + f.return0Tail, f.return1, f.return2][o.returnPanel] + f.returnTail;
  return body + f.speculative + (c.beats === 0 ? f.beatsNone : f.beatsSome) + web(f.tail);
}
function legacyWalkText(o) {
  const t = OT.refresh, r = OT.response, c = o.copies;
  const response = o.shared < 0 ? r.waits : o.shared === 0 ? r.art + c.art.palette + r.artTail
    : o.shared === 1 ? r.film + M.FILM_SHOT_LABELS[c.film.order[2]].toLowerCase() + r.filmTail + (c.beats === 0 ? r.beatsNone : r.beatsSome)
      : r.seats + QUIET[c.pause] + r.seatsMid + M.CIVIC_FORMAT_LABELS[c.civic.format] + r.seatsTail;
  let body = t.intro + o.notice + '\n' + response;
  if (o.shared >= 0) body = response + '\n' + o.notice + t.another;
  body += t.invitation + o.invitationTitle + t.copies + (c.beats === 0 ? t.beatsNone : t.beatsSome) + web(t.tail);
  if (o.gathering >= 0 && !o.completed) body = t.still + body;
  if (o.completed) body = (o.returned ? OT.recognition.returned : OT.recognition.completed) + '\n' + body;
  return body;
}
// The room to the commons for a film plan, Listening Hour and contributions, then every phase of the commons.
function commonsRun(s, arrangement, first, visit) {
  let r = R.freshRoom();
  for (const [item, place] of arrangement) { r = R.chooseItem(r, item).room; r = R.choosePlace(r, place).room; r = R.assist(r, s).room; }
  r = R.assist(R.assist(r, s).room, s).room;
  for (let i = 0; i < 3; i++) { r = R.chooseItem(r, i).room; r = R.assist(R.choosePlace(r, R.facing(r, i)).room, s).room; }
  r = R.choosePlace(R.choosePlace(R.assist(R.assist(r, s).room, s).room, 0).room, 0).room;
  let o = O.openChapter(O.freshOrbit(), r, s).orbit;
  const walk = () => { let k = 0; while (O.moving(o) && k++ < 5000) o = O.step(o, 16).orbit; };
  visit(o, r);
  o = O.orbitAction(o, first).orbit; visit(o, r); walk(); visit(o, r);
  o = O.orbitAction(o, 3).orbit; visit(o, r); walk(); visit(o, r);
  o = O.orbitAction(o, 4).orbit; visit(o, r);
  o = O.orbitAction(o, 0).orbit; visit(o, r);
  for (const m of [0, 1, 2]) { const recap = O.orbitAction(O.orbitAction(o, 2).orbit, m).orbit; visit(recap, r); }
  const explored = O.orbitAction(o, 1).orbit; visit(explored, r);
  let back = O.orbitAction(o, 0).orbit;
  for (let p = 0; p < 3; p++) { visit(back, r); if (p < 2) back = O.orbitAction(back, 1).orbit; }
  visit(O.returnHome(back).orbit, r);
  return { o, r };
}
const filmStates = () => {
  const out = [];
  for (const framing of ['wide', 'close']) for (const plan of ['later', 'quiet']) for (const order of [['welcome', 'seat', 'paint'], ['paint', 'welcome', 'seat']]) for (const [civic, beats, palette, quiet] of [[{ topic: 'access', format: 'dropin', notes: 'none' }, 0, 'cool', 'pairs'], [{ topic: 'repairs', format: 'circle', notes: 'themes' }, 85, 'warm', 'arc']]) {
    const film = { framing, plan, order }, all = { stories: 'future', beats, pause: quiet, art: { palette, tiles: [0, 1, 2, 2, 1, 0] } };
    out.push(stateOf(filmDoneEnvelope({ hosting: { ...hostedEnvelope().hosting, results: PUBLISHED.map(id => ({ id, value: all[id] })) }, civic: { phase: 'done', draft: civic, result: civic }, film: { phase: 'done', draft: film, result: film, captured: [...order] } })));
  }
  return out;
};
test('the orbital recap, acknowledgments, return panels and walking text are the legacy concatenation in every phase', () => english(() => {
  let n = 0;
  filmStates().forEach((s, i) => commonsRun(s, [[[0, 0], [2, 1], [1, 2]], [[1, 3], [0, 1], [2, 0]], [[2, 2], [1, 0], [0, 3]]][i % 3], i % 3, (o, r) => {
    assert.equal(O.orbitText(o, r), o.phase === 'walk' ? legacyWalkText(o) : legacyFinale(o, r), `${o.phase} ${o.memory} ${o.returnPanel}`);
    if (o.phase !== 'walk') assert.equal(O.orbitAnnounce(o), (OT.refresh.heading + { gathered: OT.refresh.gathered, menu: OT.refresh.menu, return: OT.refresh.return, recap: OT.refresh.recap }[o.phase]) + '. ' + (o.returned ? OT.recognition.returned : o.completed ? OT.recognition.completed : ''));
    n++;
  }));
  assert.ok(n >= 16 * 14, `${n} commons views`);
}));

// ---------- Display tables, mid-sentence labels, the paper alt and the scene list ----------
test("display tables equal Godot's capitalize and slot display for exactly Godot's ids; mid-sentence labels lowercase in English", () => english(() => {
  assert.deepEqual(Object.keys(ENDING_DISPLAY.artPalettes), ['warm', 'cool'], 'hosted_afternoon.gd copied() accepts warm and cool');
  assert.deepEqual(Object.keys(ENDING_DISPLAY.muralPalettes), C['main.gd'].MURAL_PALETTES);
  assert.deepEqual(Object.keys(ENDING_DISPLAY.slots), C['mural_stories.gd'].SLOTS);
  for (const table of [ENDING_DISPLAY.artPalettes, ENDING_DISPLAY.muralPalettes]) for (const [id, text] of Object.entries(table)) assert.equal(text, capitalize(id));
  for (const [id, text] of Object.entries(ENDING_DISPLAY.slots)) assert.equal(text, id[0].toUpperCase() + id.slice(1));
  for (const label of [...NAMES, ...TITLES, ...Object.values(M.FILM_SHOT_LABELS), ...Object.values(M.FILM_FRAMING_LABELS), ...C['helper_bench.gd'].FORMS]) assert.equal(midSentence(label), label.toLowerCase());
  // The palette button and the announcement read the table, an unknown palette as Godot shows it.
  const v = MU.storiesView(MU.freshStories(), {}, { palette: 'sunset' });
  assert.equal(v.palette.label, 'Palette:\nSunset');
  assert.equal(MU.storiesView(MU.freshStories(), {}, { palette: 'teal_blue' }).palette.label, 'Palette:\nTeal Blue');
  assert.equal(MU.paletteAnnouncement('ocean', 2), 'Portable Mural Board palette set to Ocean (2/3 motifs).');
  assert.equal(MU.storiesView(MU.freshStories(), {}, { music: true }).music.label, 'Music:\nOn');
}));
test("the paper's alt comes from each target's own alt field, never by splitting its rendered name", () => {
  const ui = readFileSync(new URL('../browser-next/ending/ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /split\('\. Paint'\)/);
  assert.doesNotMatch(ui, /\.name\.split\(/, 'no accessible text is cut out of another rendered sentence');
  assert.doesNotMatch(ui, /'Entry', 'Window', 'Far wall', 'Side nook'/, 'the bay labels come from habitat_room.gd NAMES');
  english(() => {
    for (const scenes of [{}, { left: 'music' }, { left: 'garden', right: 'cooking' }]) {
      const v = MU.storiesView(MU.freshStories(), scenes);
      for (const t of v.targets) assert.equal(t.alt, t.name.slice(0, t.name.indexOf('. Paint')), 'English equals the clause before " Paint"');
      assert.equal(v.paperAlt, v.targets.map(t => t.alt).join('; '));
      assert.deepEqual(v.targets.map(t => t.label), ['left', 'right'], 'the transparent target text is the slot, as before');
    }
  });
  setLocale('qps-ploc', pseudoCatalogFor());
  try {
    const v = MU.storiesView(MU.freshStories(), { right: 'music' });
    assert.ok(v.targets.every(t => !t.name.startsWith(t.alt)), 'in a locale the alt is its own sentence, not a prefix of the name');
    assert.ok(v.paperAlt.includes(pseudo('Making Music')) && v.paperAlt.includes(pseudo('Right')), v.paperAlt);
  } finally { setLocale('en'); }
});
test('sceneReply joins the painted scenes as a list: English with ", ", a locale with Intl.ListFormat', () => {
  english(() => assert.equal(MU.sceneReply({ left: 'cooking', right: 'music' }), 'Cooking Together on the left, Making Music on the right. You made room for everyday creativity.'));
  setLocale('qps-ploc', pseudoCatalogFor());
  try {
    const on = G['main.gd'].mural_scene_reply.on, p = id => pseudo(C['mural_stories.gd'].NAMES[id]);
    const items = [gdfRaw(pseudo(on), p('cooking'), 'left'), gdfRaw(pseudo(on), p('music'), 'right')];
    assert.equal(MU.sceneReply({ left: 'cooking', right: 'music' }), gdfRaw(pseudo(ENDING_COMPOSE.sceneReply).replace('{scenes}', '%s'), new Intl.ListFormat('en-US', { type: 'conjunction' }).format(items)));
  } finally { setLocale('en'); }
});
test('gdf and capitalize delegate to i18n.js: English unchanged, a locale looks the template up, the SVG formatter never does', () => {
  // Drawing data (GODOT_ART, through gdfRaw) is never looked up: the only lookups while drawing are the accessible names of the
  // nested pictures, from film.js filmFrameSVG and hosting.js tilePanelSVG: each frame's title template and shot label, and the
  // tile panel's title and its palette's description.
  english(() => {
    for (const [template, args] of [['%s was %s.', ['A', 'B']], ['%d of 3', [2.7]], ['x="%f"', [0.46]], ['100%% %s', ['x']]]) assert.equal(gdf(template, ...args), gdfRaw(template, ...args));
    assert.equal(capitalize('teal_blue'), 'Teal Blue');
  });
  const tpl = G['main.gd'].set_mural_palette.announce;
  setLocale('es', readCatalog(JSON.stringify({ format: 1, locale: 'es', messages: { [tpl]: 'Paleta %s (%d/3 motivos).' } }), 'es').catalog);
  try {
    assert.equal(gdf(tpl, 'Jardín', 2.9), 'Paleta Jardín (2/3 motivos).');
    assert.equal(capitalize('garden'), 'garden', 'a locale never title-cases');
    const looked = [], film = filmDoneEnvelope().film.result, copies = R.habitatCopies(full());
    const names = plan => [FILM_TEXT.frameTitle, ...plan.order.map(id => FILM_SHOTS[id].label)].sort();
    const panel = art => [HOSTING_TEXT.panel.title, HOSTING_TEXT.panel.desc[art.palette]];
    const during = draw => { looked.length = 0; onMiss(english => looked.push(english)); try { draw(); } finally { onMiss(null); } return [...new Set(looked)].sort(); };
    assert.deepEqual(during(() => B.helperBenchSVG({ selected: 0, fitted: [true, false], complete: false }, film)), names(film), 'the bench: its three frames');
    assert.deepEqual(during(() => R.habitatSVG(R.freshRoom(), copies, full())), [], 'an empty room: nothing');
    const placed = { ...R.freshRoom(), assigned: { entry: 'art', window: 'film', wall: 'seats' } };
    assert.deepEqual(during(() => R.habitatSVG(placed, copies, full())), [...panel(copies.art), ...names(copies.film)].sort(), 'a placed room: the panel and the frames');
  } finally { setLocale('en'); }
});

// ---------- Pseudo-locale coverage ----------
// Every msgid the extractor finds (the registry lists ending/compose.js and the ending's Godot text as 2D shows it), and nothing
// else: a lookup this catalog lacks is a msgid that i18n/source.json lacks.
let catalogCache = null;
function pseudoCatalogFor(code = 'qps-ploc') {
  if (catalogCache?.code === code) return catalogCache.catalog;
  const godot = [...flat(G), ...flat(C)].map(web).filter(isHumanText);
  for (const text of [...godot, ...flat(ENDING_COMPOSE), ...flat(ENDING_DISPLAY), ...flat(ENDING_UI)]) assert.ok(sourceMsgids.includes(text), `extracted: ${text.slice(0, 60)}`);
  const msgids = sourceMsgids;
  const read = readCatalog(pseudoCatalog(msgids, code), code);
  assert.deepEqual(read.rejected, [], 'every pseudo entry passes the validator');
  catalogCache = { code, catalog: read.catalog };
  return read.catalog;
}
// The values Godot's own printf templates take as ids, which a locale words by $select (never looked up as text).
const ID_WORDS = new Set(['first', 'second', 'third', 'fourth', 'warm', 'cool', 'left', 'right']);
// Intl.ListFormat's own word: the pseudo-locale formats lists as en-US does ("1, 3, 5, and 7"), a real locale in its language.
const LIST_WORDS = new Set(['and']);
// Every string of a view, and the text of the SVGs the ending builds inline (the commons and the Gather again board); ids,
// drawing data and booleans are skipped. Pictures drawn by other modules (hosting.js tilePanelSVG) are not the ending's.
const SKIP = new Set(['id', 'scene', 'slot', 'selected', 'svg', 'paper', 'signature', 'thumbnail', 'effect', 'focus']);
function strings(value, out = [], key = '') {
  if (typeof value === 'string') {
    if (value.startsWith('<svg')) for (const m of value.matchAll(/<(?:title id="(?:orbit|gather)-title"|desc id="(?:orbit|gather)-desc"|text\b[^>]*)>([^<>]*)</g)) out.push(m[1].replace(/&(amp|lt|gt|quot|apos);/g, ' '));
    else if (!SKIP.has(key)) out.push(value);
  } else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, out, Array.isArray(value) ? key : k);
  return out;
}
// English left in a string: a run of two or more ASCII words, or a single word that is not an id word. Pseudo text has no ASCII
// letters, so anything found is English that skipped the catalog.
// A speech envelope's speaker ("Bea: \"…\"") is kept by the pseudo transform, as a locale's validator checks it against the
// localized name.
function leaks(text) {
  const words = String(text).replace(/(^|[\n⟦\u2068 ])(Bea|Dez|Celeste|Thanh): "/g, '$1').match(/(?<![\p{L}\p{M}])[A-Za-z]{2,}(?![\p{L}\p{M}])/gu) ?? [];
  return words.filter(w => !ID_WORDS.has(w) && !LIST_WORDS.has(w));
}
function drive(record) {
  for (const s of hostedStates().slice(0, 12)) for (const phase of ['idle', 'planning', 'meeting', 'done']) {
    const st = { ...s, civic: { ...s.civic, phase, result: ['meeting', 'done'].includes(phase) ? { topic: 'repairs', format: 'circle', notes: 'themes' } : null } };
    record('hosted', [H.hostedReplies(st), H.invitation(st), H.hostedClose(st), H.postedGatherLine(st), H.followHosted(st, ''), ...H.HOSTED_IDS.map(id => H.hostedView(st, id))]);
    let g = GA.openGather(GA.freshGather(), st); record('gather', [g.announce, GA.gatherView(g.gather, st)]);
    for (const gesture of [0, 1, 0]) { g = GA.handoff(g.gather, gesture, st); record('gather', [g.announce, GA.gatherView(g.gather, st)]); }
    g = GA.review(g.gather, -1); g = GA.advance(GA.advance(g.gather).gather);
    record('gather', [g.announce, GA.gatherView(g.gather, st), GA.backToPosted(g.gather), GA.gatherClose(g.gather), GA.handoff(g.gather, 0, st).announce]);
  }
  const s0 = stateOf(hostedEnvelope()), broken = structuredClone(s0); broken.hosting.results[0].value = 'gone'; const unposted = structuredClone(s0); unposted.programme.published = [];
  record('refusals', [H.hostedDetail(s0, 'nothing'), H.hostedReplies(broken), GA.openGather(GA.freshGather(), unposted).announce, GA.openGather(GA.freshGather(), broken).announce, H.orderText([])]);
  const later = stateOf(civicDoneEnvelope()), button = pseudo('A little film on the block');
  record('civic later', [SC.civicAcknowledgment(later), SC.civicOffer(later, button), SC.civicFollow(later, button)]);
  filmStates().forEach((s, i) => {
    for (let f = 0; f < 3; f++) record('screening', SC.screeningView(s, f));
    record('civic', [SC.civicAcknowledgment(s), SC.civicOffer(s, button), SC.civicFollow(s, button, '')]);
    for (const selected of [0, 1]) for (const fitted of [[false, false], [true, false], [false, true], [true, true]]) for (const complete of fitted[0] && fitted[1] ? [false, true] : [false]) {
      record('bench', [B.benchView({ selected, fitted, complete }, s, { habitatAvailable: true, orbitCompleted: complete, recognition: complete ? O.recognition({ completed: true }) : '' })]);
    }
    let r = R.freshRoom(); record('room', R.roomView(r, s));
    for (const [item, place] of [[0, i % 4], [2, (i + 1) % 4], [1, (i + 2) % 4]]) { r = R.chooseItem(r, item).room; record('room', R.roomView(r, s)); r = R.assist(R.choosePlace(r, place).room, s).room; record('room', R.roomView(r, s)); }
    record('room detail', R.roomView(R.toggleDetail(r).room, s));
    r = R.assist(R.assist(r, s).room, s).room; record('links', R.roomView(r, s));
    for (let k = 0; k < 3; k++) { r = R.chooseItem(r, k).room; const right = R.facing(r, k); r = R.assist(R.choosePlace(r, (right + 1) % 3).room, s).room; record('link wrong', R.roomView(r, s)); r = R.assist(R.choosePlace(r, right).room, s).room; record('link', [R.roomView(r, s), R.chooseItem(r, k).room.notice]); }
    commonsRun(s, [[0, 0], [2, 1], [1, 2]], i % 3, (o, room) => record('commons', [O.orbitalView(o, room), O.recognition(o)]));
  });
  record('closes', [SC.screeningClose(), SC.screeningRefusal(), SC.civicClose(), B.benchClose(), B.benchRefusal(), B.habitatRefusal(), R.roomClose(false, false), R.roomClose(true, false), R.roomClose(true, true), R.roomRefusal(), R.orbitFailed()]);
  for (const scenes of [{}, { left: 'cooking' }, { right: 'music' }, { left: 'garden', right: 'painting' }]) {
    record('mural', [MU.sceneReply(scenes), MU.closeStoriesAnnouncement(scenes), MU.neighborTail('dez', { left: 'music' }), MU.neighborTail('thanh', { left: 'garden' })]);
    for (const id of ['', ...MU.SCENE_IDS]) for (const slot of ['left', 'right']) { const e = MU.editScene(scenes, id, slot); record('edit', [e.message, MU.sceneAnnouncement(e.message, e.scenes)]); }
    let st = MU.freshStories();
    for (const step of ['select-garden', 'page', 'select-music', 'page']) {
      const out = step === 'page' ? MU.changePage(st) : MU.selectScene(st, step.slice(7)); st = out.stories;
      for (const palette of ['garden', 'sunset', 'ocean']) record('stories', [out.announce, MU.storiesView(st, scenes, { palette, marks: 2, music: palette === 'ocean' })]);
    }
  }
  record('mural misc', [MU.sceneReceipt(''), MU.sceneReceipt(pseudo('save full')), MU.sceneRefusal(), MU.openStoriesAnnouncement(), MU.paintScenesLabel(), ...['garden', 'sunset', 'ocean'].map(p => MU.paletteAnnouncement(p, 3))]);
}
// ending/ui.js on the stand-in dialog, pressed through every stage; the host's own text (music label, film button) is localized
// by the host, as game.js does.
function driveUI(record) {
  const shown = [], dialog = fakeDialog(), state = full();
  const host = { ...dialog, show: html => { shown.push(html); dialog.show(html); }, close: () => dialog.close(), getState: () => state, status: t => record('status', t), toast: t => record('toast', t), stopWalk() {}, reducedMotion: () => false, chapterText: () => '', act() {},
    sceneAdmission: () => true, saveReason: () => '', settle: { tap() {} }, music: { label: () => pseudo('Music: Off'), on: () => false, toggle: async () => '' }, filmButtonLabel: () => pseudo('A little film on the block'),
    openDraft() {}, openPosted() {}, openMural: () => dialog.show('<h2 id="modal-title">x</h2><button id="mural-scenes">x</button>') };
  const ending = createEnding(host), click = id => { if (dialog.has(id)) dialog.click(id); };
  ending.open('hosted'); for (const id of ['hosted-card-beats', 'hosted-card-art', 'hosted-card-pause', 'hosted-back']) click(id);
  ending.open('gather'); for (const id of ['gather-choice-0', 'gather-choice-1', 'gather-previous', 'gather-next', 'gather-choice-0', 'gather-next', 'gather-next', 'gather-keep']) click(id);
  ending.open('screening'); for (const id of ['screen-frame-1', 'screen-helper', 'bench-form-1', 'bench-support-0', 'bench-support-1', 'bench-assist', 'bench-keep']) click(id);
  ending.open('room');
  for (const id of ['room-item-0', 'room-place-0', 'room-assist', 'room-item-2', 'room-place-1', 'room-assist', 'room-detail', 'room-detail', 'room-item-1', 'room-place-2', 'room-assist', 'room-assist', 'room-assist',
    'room-item-0', 'room-place-1', 'room-assist', 'room-place-0', 'room-assist', 'room-item-2', 'room-place-1', 'room-assist', 'room-item-1', 'room-place-2', 'room-assist', 'room-assist', 'room-assist', 'room-place-0', 'room-place-1', 'room-assist']) click(id);
  for (const id of ['orbit-1', 'frames', 'orbit-3', 'frames', 'orbit-4', 'orbit-0', 'orbit-2', 'orbit-1', 'orbit-3', 'orbit-0', 'orbit-1', 'orbit-1', 'orbit-1']) { if (id === 'frames') dialog.frames(400); else click(id); }
  ending.open('room'); click('orbit-6');
  ending.open('stories'); for (const id of ['scene-choice-1', 'scene-target-0', 'scene-page', 'scene-choice-0', 'scene-target-1', 'scene-lift-0', 'scene-palette', 'scene-back']) click(id);
  record('labels', [ending.gatherLabel(), ending.paintScenesLabel()]);
  // The dialog HTML: every text node and every aria-label, alt and title value (data: URIs are pictures). The tile panel inlined
  // in the Gather again board and the film frames inlined in the commons carry hosting.js's and film.js's own titles (I2c's), which
  // are not the ending's.
  const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  for (const html of [...shown, ending.civicOfferHTML()]) {
    const own = html.replace(/<title(?: id="title")?>[^<]*<\/title>|<desc id="desc">[^<]*<\/desc>/g, '');
    const text = [...own.matchAll(/>([^<>]+)</g)].map(m => m[1]), attrs = [...own.matchAll(/\b(?:aria-label|alt|title)="([^"]*)"/g)].map(m => m[1]);
    record('html', [...text, ...attrs].map(s => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITY[e])));
  }
  return shown.length;
}
test('under the pseudo-locale every string the ending views and ending/ui.js produce is looked up: no English, no misses', () => {
  setLocale('qps-ploc', pseudoCatalogFor(), { preview: true });
  try {
    const found = [], idWords = new Set();
    let checked = 0;
    const record = (label, value) => { for (const s of strings(value)) { checked++; const left = leaks(s); if (left.length) found.push(`${label}: ${JSON.stringify(left)} in ${JSON.stringify(s.slice(0, 160))}`); for (const w of String(s).match(/[A-Za-z]{2,}/g) ?? []) if (ID_WORDS.has(w)) idWords.add(w); } };
    drive(record);
    const screens = driveUI(record);
    assert.deepEqual(found.slice(0, 20), [], `${found.length} strings carry English`);
    assert.deepEqual(diagnostics().misses, [], 'every lookup found its msgid');
    assert.ok(checked > 10000 && screens > 60, `${checked} strings, ${screens} screens`);
    // The id words that do reach the text are exactly Godot's $select arguments: positions, art palettes and slots.
    assert.deepEqual([...idWords].sort(), [...ID_WORDS].sort());
  } finally { setLocale('en'); }
});
test('under the pseudo-locale the structure survives: the same newlines in every reader text, so the ui splits still hold', () => {
  const run = () => { const out = []; drive((label, value) => out.push(...strings(value).map(s => (s.match(/\n/g) ?? []).length))); return out; };
  const en = english(run);
  setLocale('qps-ploc', pseudoCatalogFor(), { preview: true });
  try { assert.deepEqual(run(), en); } finally { setLocale('en'); }
  assert.ok(isEnglish());
});
test('under the RTL pseudo-locale inserted values are bidi-isolated inside the composites', () => {
  catalogCache = null;
  setLocale('qps-rtl', pseudoCatalogFor('qps-rtl'), { preview: true });
  try {
    const s = stateOf(hostedEnvelope()), detail = H.hostedDetail(s, 'stories');
    assert.ok(detail.startsWith('⟦') || detail.startsWith('⁨'), detail);
    assert.equal((detail.match(/⁨/g) ?? []).length, (detail.match(/⁩/g) ?? []).length);
    assert.ok((detail.match(/⁨/g) ?? []).length >= 4, 'owner, reply, heading and result are each isolated');
  } finally { setLocale('en'); catalogCache = null; }
});
