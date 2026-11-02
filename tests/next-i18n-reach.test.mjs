// Every msgid of i18n/source.json is one a player can reach (docs/I18N_PLAN.md 2.12, I2 follow-up): this file runs the pseudo-locale
// playthroughs of the other i18n test files in its own process, records every catalog lookup the fork's code makes (lookups a test
// makes itself do not count), and fails on an extracted msgid that nothing looked up. Translators pay for each msgid, and
// `scripts/i18n.mjs check` refuses to ship a locale while any is untranslated, so a fragment that only builds a composite must not
// be extracted (scripts/i18n.mjs FRAGMENTS).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as I from '../browser-next/i18n.js';
import { readSource, FRAGMENTS } from '../scripts/i18n.mjs';
import * as F from './next-fixtures.mjs';
import { parseGodotSave } from '../browser-next/godot-save.js';
import { initialState } from '../browser-next/core.js';
import { nextObjective, chapterLine, chapterCard, compassPhrase } from '../browser-next/story.js';
import { NEIGHBORS, PLACES } from '../browser-next/world.js';
import { conversationView, arrivalCaption, talkAnnouncement, goodbyeLines, whatsNext, freshTalk, programmeLabel, civicLabel, filmLabel } from '../browser-next/characters.js';
import { cueBurst, layoutBurst, BURST_TEXT } from '../browser-next/bursts.js';
import { MENU_TITLES, menuTitle } from '../browser-next/visits/compose.js';
import { playBarGate, options as rhythmOptions, openCircle, afterComplete } from '../browser-next/rhythm.js';

const keyOf = (msgid, ctx) => ctx ? `${ctx}\u0004${msgid}` : msgid;
const looked = new Set();
// The first frame outside i18n.js and this file: the fork's code (a module under browser-next/, or game.js declarations a test
// evaluates with new Function), or a test's own call.
const SELF = import.meta.url.split('/').pop();
const fromFork = () => {
  const limit = Error.stackTraceLimit; Error.stackTraceLimit = 40;
  const frames = new Error().stack.split('\n').slice(1); Error.stackTraceLimit = limit;
  const frame = frames.find(line => !/browser-next[\\/]i18n\.js/.test(line) && !line.includes(SELF)) ?? '';
  return /browser-next[\\/]/.test(frame) || /\beval at\b/.test(frame);
};
I.onLookup((english, ctx) => { if (fromFork()) looked.add(keyOf(english, ctx)); });
// The playthroughs: the dialogue, ending, side-story, classic-module and game.js screen tests, and the integration seams.
for (const file of ['next-i18n-dialogue', 'next-i18n-ending', 'next-i18n-visits', 'next-i18n-classic', 'next-i18n-integration', 'next-game-text', 'next-i18n-followup']) await import(`./${file}.test.mjs`);

// The paths the playthroughs leave out, driven here over a ladder of afternoon states: every objective and its hint, the
// chapter line and card, each neighbor's conversation (sketch, local and paused music, wide and narrow), the compass phrase in
// every direction and distance, every reward banner and every menu title.
const parse = envelope => parseGodotSave(JSON.stringify(envelope), { initialState }).state;
function ladder() {
  const base = initialState(), all = [...F.NEIGHBORS], full = F.FULL_MURAL, opened = parse(F.openedEnvelope()), film = parse(F.filmDoneEnvelope());
  const at = (state, over) => ({ ...state, ...over });
  const out = [base, at(base, { visited: ['bea'] }), at(base, { visited: all }), at(base, { visited: all, layout: 'floor' }), at(base, { visited: all, layout: 'table', mural: { sun: full.sun } }),
    at(base, { visited: all, layout: 'table', mural: full }), at(base, { visited: all, layout: 'floor', mural: full, soundcheck: true }), opened, at(opened, { layout: 'floor' })];
  const photo = { status: 'taken', participants: ['bea'], layout: 'table', palette: 'garden', mural: full };
  for (const returned of [[], ['table'], ['table', 'paint-case'], ['table', 'paint-case', 'speaker']]) out.push(at(opened, { epilogue: { packing: true, returned, photo } }));
  out.push(at(opened, { epilogue: { packing: false, returned: [], photo } }));
  const packed = at(opened, { epilogue: { packing: true, returned: ['table', 'paint-case', 'speaker'], photo } });
  out.push(at(packed, { programme: { order: ['stories', 'beats'], published: [] } }), at(packed, { programme: { order: F.PUBLISHED, published: F.PUBLISHED } }));
  for (let n = 0; n <= 4; n++) out.push(at(packed, { programme: { order: F.PUBLISHED, published: F.PUBLISHED }, hosting: { ...film.hosting, results: film.hosting.results.slice(0, n) } }));
  const hosted = at(packed, { programme: film.programme, hosting: film.hosting });
  for (const phase of ['planning', 'meeting', 'done']) out.push(at(hosted, { civic: { ...film.civic, phase } }));
  for (const [phase, captured] of [['planning', []], ['hold', []], ['shooting', ['welcome']], ['shooting', ['welcome', 'seat']], ['done', film.film.captured]]) out.push(at(hosted, { civic: film.civic, film: { ...film.film, phase, captured } }));
  out.push(film, at(film, { history: true }), at(film, { history: true, blackhawk: true }), at(film, { history: true, blackhawk: true, surprises: F.SURPRISES.slice(0, 3) }), at(film, { history: true, blackhawk: true, surprises: [...F.SURPRISES] }));
  return out;
}
test('the paths the playthroughs leave out: objectives, conversations, compass phrases, banners and menu titles', () => {
  const read = I.readCatalog(I.pseudoCatalog(readSource().entries, 'qps-ploc'), 'qps-ploc');
  assert.ok(read.catalog, read.error);
  I.setLocale('qps-ploc', read.catalog, { preview: true });
  try {
    const places = Object.fromEntries(PLACES.map(place => [place.id, place])), shown = [];
    for (const state of ladder()) {
      const world = { player: state.player, neighbors: NEIGHBORS, places }, goal = nextObjective(state, world);
      shown.push(goal.text, goal.hint, chapterLine(state, { narrow: false, world }), chapterLine(state, { narrow: true, world }), JSON.stringify(chapterCard(state, { startup: true })), JSON.stringify(chapterCard(state, {})));
      shown.push(programmeLabel(state), civicLabel(state), filmLabel(state), filmLabel(state, 2));
      for (const id of F.NEIGHBORS) for (const count of [1, 2, 6]) for (const music of [{ playing: true, mode: 'sketch', volume: 0.7 }, { playing: false, mode: 'local', localName: 'a.mp3', volume: 0 }]) for (const narrow of [false, true]) {
        const talk = { ...freshTalk(), [id]: count };
        shown.push(JSON.stringify(conversationView(state, {}, talk, id, goal, { music, narrow })), arrivalCaption(state, {}, talk, id, music), talkAnnouncement(state, {}, talk, id, music), JSON.stringify(goodbyeLines(id, goal)), whatsNext(goal, id));
      }
    }
    for (let d = 0; d < 32; d++) for (const r of [5, 40, 90, 130, 170, 400, 900, 2000]) { const a = d * Math.PI / 16; shown.push(compassPhrase({ x: 0, y: 0 }, { x: Math.cos(a) * r, y: Math.sin(a) * r })); }
    // The Rhythm Circle's Play Bar gates, its options while a bar plays, and the hosting circle's opening and completion.
    for (const auditioning of [false, true]) for (const unlocked of [false, true]) for (const musicPlaying of [false, true]) for (const mode of ['sketch', 'local']) for (const pattern of [0, 85]) shown.push(playBarGate({ auditioning, unlocked, musicPlaying, volume: 0.7, mode, pattern }).message);
    for (const auditioning of [false, true]) shown.push(JSON.stringify(rhythmOptions({ practice: false, stepCues: true }, { musicPlaying: true, auditioning })));
    for (const state of ladder()) { shown.push(JSON.stringify(openCircle(state)), JSON.stringify(afterComplete(state))); }
    const v = { met: 2, total: 5, stems: 3, motifs: 2, returned: 1, hosted: 2, sparks: 4, frames: 2, eras: 1, tourCount: 2, tourTotal: 5, trees: 3, futureProgramme: false };
    for (const id of Object.keys(BURST_TEXT)) for (const reason of ['bea', 'sun', 'table', 'stories', 'welcome', "Compton's"]) shown.push(JSON.stringify(cueBurst({ id, reason, suppressed: false }, v)), JSON.stringify(cueBurst({ id, reason, suppressed: false }, { ...v, futureProgramme: true })));
    for (const layout of ['table', 'floor']) shown.push(JSON.stringify(layoutBurst(layout, 3)));
    for (const item of Object.keys(MENU_TITLES)) shown.push(menuTitle(item));
    assert.ok(shown.join('\n').split('⟦').length > 2000, 'the sweep drew pseudo text');
  } finally { I.setLocale('en'); }
});

// Msgids shown only on paths no node test drives, by reason: game.js's page (a pattern), and table paths named one by one, so a
// new dead msgid in the same table still fails. Drive a path rather than adding to it; a listed path that a test starts to reach
// fails until it is taken off.
const G = '["programme_gathering.gd"]', HANDOFFS = [['art>beats', 1], ['art>pause', 0], ['art>pause', 1], ['art>stories', 0], ['art>stories', 1], ['beats>art', 0], ['beats>art', 1], ['pause>art', 1], ['pause>beats', 0], ['pause>beats', 1], ['stories>art', 1], ['stories>beats', 1], ['stories>pause', 0], ['stories>pause', 1]];
export const UNREACHED = Object.freeze([
  ["game.js's own text and index.html's: game.js draws the page in a browser and node runs eleven of its screens; tests/next-game-text.test.mjs proves every GAME_TEXT entry is drawn and every index.html string marked",
    /^(game-text\.GAME_TEXT\.|game\.js:|index\.html:)/],
  ["table text that only game.js's screens show (the film, civic, programme, hosting, litter, loan and edition screens, the music toggle, the speech notice's panel name, the map's place names), which node does not run",
    ['bubble.BUBBLE_TEXT.panel', 'characters.BUTTON_TEXT.compose', 'characters.BUTTON_TEXT.load', 'core.BLOCK_TEXT.opened', ...[0, 1, 2].flatMap(i => [`core.LITTER[${i}].label`, `core.LOANS[${i}].label`]),
      ...['confirm', 'eyebrow', 'open', 'recover', 'stay', 'title'].map(k => `edition.EDITION_TEXT.${k}`), 'film.FILM_FRAMING.close.detail', 'film.FILM_FRAMING.wide.detail', 'film.FILM_PLANS.later.detail', 'film.FILM_PLANS.quiet.detail',
      'civic.CIVIC_FORMATS.circle.detail', 'civic.CIVIC_FORMATS.dropin.detail', 'civic.CIVIC_NOTES.none.detail', 'civic.CIVIC_NOTES.themes.detail', 'civic.CIVIC_NOTES.none.label', 'civic.CIVIC_NOTES.themes.label', 'civic.CIVIC_TOPICS.access.request',
      'ending.text.GODOT_CONSTS["main.gd"].CIVIC_NOTE_LABELS.none', 'ending.text.GODOT_CONSTS["main.gd"].CIVIC_NOTE_LABELS.themes', 'ending.text.GODOT_CONSTS["main.gd"].CIVIC_TOPIC_REQUESTS.access',
      ...['complete', 'cue', 'info', 'invitation', 'summary'].map(k => `ending.text.GODOT["main.gd"].film_capture_shot.${k}`), 'ending.text.GODOT["main.gd"].set_mural_palette.info',
      'hosted-text.HOSTED_COMPOSE.summaryNext', 'hosted-text.HOSTED_GODOT_TEXT["loan_homecoming.gd"].note_completion.notice', 'hosted-text.LOAN_COMPLETION_NOTICE',
      ...['intro', 'quiet', 'tail', 'traced'].map(k => `hosted-text.HOSTING_FORK_TEXT.beats.${k}`), ...[0, 1, 2, 3].map(i => `programme.SEGMENTS[${i}].pitch`), 'rhythm.RHYTHM_TEXT.rest', 'sketch-core.MUSIC_TEXT.paused',
      'world.PLACES[0].name', 'world.PLACES[1].name', 'world.PLACES[2].name', 'world.PLACES[3].name', 'history.BLACK_HAWK.name',
      ...['dogs', 'dogsTip', 'election', 'electionTip', 'lantern', 'lanternTip', 'power', 'powerTip'].map(k => `visits.text.GODOT_TEXT["main.gd"].update_walk_control.${k}`)]],
  ["rhythm-ui.js's audio callbacks (a bar that ends, or stops as the music settings change), which need a running AudioContext",
    ['rhythm.RHYTHM_TEXT.barEnded', 'rhythm.RHYTHM_TEXT.barStoppedSettings']],
  ['fallbacks no shipped id reaches: a goodbye with no partner, a neighbor without lines, an eatery without a menu, a surprise without its own badge or speaker',
    ['characters.CAPTION_TEXT.goodbyeNobody', 'characters.PANEL_TEXT.fallback', 'visits.text.GODOT_TEXT["main.gd"].eatery_counter_interact.special',
      'visits.text.GODOT_TEXT["main.gd"].inspect_neighborhood_surprise.badge', 'visits.text.GODOT_TEXT["main.gd"].inspect_neighborhood_surprise.speaker']],
  ['error paths: a shared save that changes under an open visit, a story whose place file fails, a story that cannot open, a parade with no clear route, pictures that cannot be prepared',
    ['ending.text.FORK_TEXT.copiesChanged', 'visits-kit.VISITS_FORK_TEXT.adopted', 'visits-kit.VISITS_FORK_TEXT.dataError', 'visits.picker.TEXT.select_story.refused', 'visits.text.GODOT_TEXT["story_picker.gd"].select_story.refused',
      'visits.lantern.TEXT.open_story.noRoute', 'visits.text.GODOT_TEXT["lantern_procession.gd"].open_story.noRoute', `ending.text.GODOT${G}.prepare.pictures`]],
  ['branches the seeded ending and side-story playthroughs do not take: the other programme orders, a halted walk or a second invitation in the commons, a beat result without rests, the conversation memories of states the ladder skips, a suspended story, the other recipes, an eatery guide, the portal and a surprise banner',
    [...HANDOFFS.map(([h, i]) => `ending.text.GODOT_CONSTS${G}.HANDOFFS["${h}"][${i}]`), `ending.text.GODOT_CONSTS${G}.OPENINGS.pause`,
      `ending.text.GODOT${G}.description.different`, `ending.text.GODOT${G}.refresh.newPlan`, `ending.text.GODOT${G}.title.gather`, 'ending.text.GODOT["civic_listening.gd"].refresh.remembered',
      'ending.text.GODOT["habitat_room.gd"].departure_text.beatsSome', ...['finale_text.gatheredDone', 'halt.stopped', 'halt.thanh', 'invite_thanh.beside', 'refresh.still'].map(k => `ending.text.GODOT["orbital_commons.gd"].${k}`),
      'ending.compose.ENDING_COMPOSE.cardOpen', 'ending.compose.ENDING_COMPOSE.youAreBy', 'characters.COMPOSITION.riseLinks', 'characters.COMPOSITION.waveAbove',
      'characters.PROJECT_MEMORY.film.dez', 'characters.PROJECT_MEMORY.pause.pairs', 'characters.PROJECT_MEMORY.stories.future', 'visits.compose.COMPOSE_TEXT.power.closeActive', 'visits.compose.COMPOSE_TEXT.power.closeIdle',
      ...[[0, 1], [1, 0], [2, 1], [3, 0]].flatMap(([r, i]) => [`visits.meal.RECIPES[${r}].recognition[${i}]`, `visits.text.GODOT_CONSTANTS["shared_meal_data.gd"].RECIPES[${r}].recognition[${i}]`]),
      'visits.picker.TEXT.refresh.resume', 'visits.text.GODOT_TEXT["story_picker.gd"].refresh.resume', 'visits.text.GODOT_TEXT["main.gd"].apply_hub_guidance.locked', 'visits.text.GODOT_TEXT["main.gd"].build_street_life_decor.portal',
      'visits.text.GODOT_TEXT["main.gd"].cycle_eatery_guide.welcome', 'visits.text.GODOT_TEXT["main.gd"].eatery_counter_interact.welcome', 'visits.text.GODOT_TEXT["main.gd"].inspect_neighborhood_surprise.burst']],
]);
const listed = path => UNREACHED.some(([, match]) => match instanceof RegExp ? match.test(path) : match.includes(path));

test('every extracted msgid is looked up by the fork in the playthroughs, apart from the reasoned list', () => {
  const entries = readSource().entries;
  const dead = entries.filter(e => !looked.has(keyOf(e.msgid, e.ctx)) && !e.paths.every(listed));
  assert.ok(looked.size > 1000, `${looked.size} msgids looked up`);
  assert.deepEqual(dead.map(e => `${JSON.stringify(e.msgid).slice(0, 70)}  ${e.paths[0]}`), [], `${dead.length} extracted msgids that nothing looks up`);
});

test('the reasoned list names only extracted paths whose msgid nothing reaches yet', () => {
  const entries = readSource().entries, byPath = new Map(entries.flatMap(e => e.paths.map(path => [path, e])));
  for (const [why, match] of UNREACHED) {
    assert.ok(why.length > 40, why);
    if (match instanceof RegExp) { assert.ok(entries.some(e => e.paths.every(path => match.test(path))), String(match)); continue; }
    assert.equal(new Set(match).size, match.length, `${why.slice(0, 40)}: no duplicate`);
    for (const path of match) {
      const entry = byPath.get(path);
      assert.ok(entry, `${path} is an extracted path`);
      assert.ok(!looked.has(keyOf(entry.msgid, entry.ctx)), `${path} is reached now: take it off the list`);
    }
  }
});

test('the new test file is LF', () => {
  assert.doesNotMatch(readFileSync(new URL(import.meta.url), 'utf8'), /\r/);
});
