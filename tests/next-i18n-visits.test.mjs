// Localization of the side stories (docs/I18N_PLAN.md I2e): the pure visits modules, visits/compose.js, visits/format.js gdfText
// and the four visits UI files. English stays the source of truth: every composite in compose.js, filled in English, is the
// legacy concatenation of Godot's fragments (composition parity, over an input matrix), and with no locale chosen nothing a
// player sees changes (the existing next-visits suites pin that English). Under the pseudo-locale every word the side stories
// return or draw is looked up: a full playthrough of every story and a random walk over the visits screens leave no plain
// English, beyond the place names, addresses and links that are not translated (D8). Text-keyed logic is gone: Power's "repair
// surface" swap, the memory line's quotes, the eatery burst's title-casing, the label-in-name rule, and the case map's "N".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gdStrings, gdSource } from './gd-literal.mjs';
import { fakeDialog, visitsHost } from './next-fixtures.mjs';
import { readCatalog, setLocale, pseudo, pseudoCatalog, locale, diagnostics, onMiss } from '../browser-next/i18n.js';
import { GODOT_TEXT, GODOT_CONSTANTS, MAIN, web } from '../browser-next/visits/text.js';
import { gdf, gdfText, gdCapitalize } from '../browser-next/visits/format.js';
import { COMPOSE_TEXT, MENU_TITLES, compose, menuTitle, unquote, compassNorth } from '../browser-next/visits/compose.js';
import * as P from '../browser-next/visits/positions.js';
import * as before from '../browser-next/visits/before-streets.js';
import * as meal from '../browser-next/visits/meal.js';
import * as lantern from '../browser-next/visits/lantern.js';
import * as power from '../browser-next/visits/power.js';
import * as election from '../browser-next/visits/election.js';
import * as picker from '../browser-next/visits/picker.js';
import * as surprises from '../browser-next/visits/surprises.js';
import * as landmarks from '../browser-next/visits/landmarks.js';
import { VISITS_FORK_TEXT, btn, frameHTML } from '../browser-next/visits-kit.js';
import { createVisits } from '../browser-next/visits-ui.js';
import { createEpisodeScreens } from '../browser-next/visits-episodes.js';
import { createWorldVisits } from '../browser-next/visits-world.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const POWER_PLACE = JSON.parse(read('godot/data/power_place.json'));
const VOTING = JSON.parse(read('godot/data/voting_places.json'));
const GD_FILES = readdirSync(new URL('../godot/', import.meta.url)).filter(name => name.endsWith('.gd'));
const GD_LITERALS = new Set(GD_FILES.flatMap(name => gdStrings(gdSource(name))));
const english = () => setLocale('en');

// ---------------------------------------------------------------- composition parity
// The legacy concatenation of each composite, as the module wrote it before (bd865bc), over the same Godot fragments.
const G = file => GODOT_TEXT[file];
const D = G('dog_story.gd'), LT = G('lantern_procession.gd'), PW = G('power_story.gd'), V = G('voting_story.gd'), ML = G('shared_meal.gd'), B = G('before_streets.gd'), PK = G('story_picker.gd'), HUB = G('main.gd').apply_hub_guidance;
const LEGACY = {
  joiners: { sentence: v => v.heading + '. ' + v.text, labelDescription: v => v.label + ': ' + v.description, pipe: v => v.left + ' | ' + v.right },
  dogs: {
    chose: v => D.choose_lead.chose + v.lead + D.choose_lead.choseTail,
    differs: v => D.match_dog.differs + v.observed + D.match_dog.differs2 + v.name + D.match_dog.differs3,
    already: v => v.name + D.match_dog.already,
    matchedBoth: v => v.name + D.match_dog.matched + D.match_dog.both,
    matchedNext: v => v.name + D.match_dog.matched + D.match_dog.next,
    profile: v => v.note + '\n' + v.name + ': ' + v.description + '.',
    lead: v => D.refresh.lead + v.lead + '.',
    observed: v => D.refresh.observed + v.description + D.refresh.compare,
    music: v => v.label + D.refresh.soundtrack,
    objective: v => D.objective.prefix + v.status,
  },
  lantern: { heading: v => LT.refresh.heading + v.status, route: v => LT.refresh.route + v.costume + ' / ' + v.lantern + '.', objective: v => LT.objective.prefix + v.status },
  power: {
    closeActive: () => PW.close_story.back + PW.close_story.active,
    closeIdle: () => PW.close_story.back + PW.close_story.idle,
    there: v => v.voice + PW.check_path.there + v.name + PW.check_path.backOn,
    portable: v => v.voice + PW.check_path.portable,
    hintEnd: () => PW.objective.hint + PW.objective.hintEnd,
    hintClue: v => PW.objective.hint + v.voice + PW.objective.clue + v.phase + '.',
    inspired: v => PW.refresh.inspired + v.phase + '.',
    walkFirstBattery: () => PW.refresh.walkFirst.replaceAll(PW.refresh.repairSurface, PW.refresh.batteryView),
    music: v => v.label + PW._process.soundtrack,
  },
  election: {
    selected: v => V.choose.selected + v.address + '.',
    recorded: v => V.record_site.recorded + v.description + ', ' + v.address + V.record_site.list,
    recordedBoth: v => V.record_site.recorded + v.description + ', ' + v.address + V.record_site.list + V.record_site.both,
    belongs: v => V.place_label.belongs + v.address + V.place_label.selected + v.selected + V.place_label.nothing,
    placed: v => V.place_label.placed + v.address + V.place_label.onPin,
    placedFit: v => V.place_label.placed + v.address + V.place_label.onPin + V.place_label.fit,
    source: v => V.source_text.head + v.name + ' - ' + v.address + ' - ' + v.room + V.source_text.eas + v.eas + V.source_text.tail,
    heading: v => V.refresh.heading + v.status,
    objective: v => V.objective.prefix + v.status,
    observe: v => V.objective.observe + v.address,
  },
  meal: {
    tradition: v => v.tradition + '. ' + v.ingredients,
    said: v => v.cook + ': "' + v.message + '"',
    follow: v => ML.refresh.follow + v.cook + ML.refresh.retains,
    previousName: v => ML.refresh.previousName + v.cook,
    nextName: v => ML.refresh.nextName + v.cook,
    artDescription: v => ML.art_description.prefix + v.shape + gdf(ML.art_description.template, [v.stage, v.serving]),
  },
  before: { close: v => v.frame + B.close_opening.closed, announce: v => B.refresh.announce + v.text },
  picker: { announce: v => PK.open_picker.announce + v.text, entry: v => v.status + ': ' + v.title, entryName: v => v.label + PK.refresh.entrySuffix, completed: v => PK.refresh.completed + v.stories + '.' },
  ui: { mealHint: v => v.hint + HUB.joiner + v.meal },
};
const VALUES = ['', 'Pippin', 'Turk / Taylor', 'a {b} c', '%s %d %%', '$& $1 $$', 'two\nlines', '“quoted”', '380 Eddy St'];
const placeholders = template => [...template.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(m => m[1]);

test('every composite is one whole template over Godot fragments, and its English is the legacy concatenation', () => {
  english();
  assert.deepEqual(Object.keys(COMPOSE_TEXT).sort(), Object.keys(LEGACY).sort());
  let checked = 0;
  for (const [group, entries] of Object.entries(COMPOSE_TEXT)) {
    assert.deepEqual(Object.keys(entries).sort(), Object.keys(LEGACY[group]).sort(), `${group}: a legacy concatenation per composite`);
    for (const [key, template] of Object.entries(entries)) {
      const names = placeholders(template), at = `${group}.${key}`;
      // The fragments between placeholders hold no brace, percent sign or dollar pattern of their own, so the named fill is the
      // concatenation; and each name is used once.
      assert.ok(!/[{}%]/.test(template.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, '')), `${at}: no stray brace or percent`);
      assert.equal(new Set(names).size, names.length, `${at}: each placeholder once`);
      assert.ok(!GD_LITERALS.has(template), `${at} is a fork composite, not a Godot literal: ${template}`);
      const rows = names.length === 0 ? [{}] : VALUES.flatMap((first, i) => VALUES.map((_, j) => Object.fromEntries(names.map((name, k) => [name, k === 0 ? first : VALUES[(i + j + k) % VALUES.length]]))));
      for (const row of rows) {
        const values = key === 'artDescription' ? { ...row, stage: VALUES.indexOf(row.stage) % 6 } : row;
        assert.equal(compose(template, values), LEGACY[group][key](values), `${at} ${JSON.stringify(values)}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 1500, `${checked} fills`);
});

test('a composite with a missing value throws in English, as a concatenation of undefined never could hide', () => {
  english();
  assert.throws(() => compose(COMPOSE_TEXT.dogs.chose, {}), /Missing value \{lead\}/);
});

test('gdfText is gdf in English: same text, same %% and the same error on a missing argument', () => {
  english();
  for (const [template, args] of [['%d/2 matched%s', [1, ' | Reunited!']], ['Lead the lanterns - %.0f m left', [27.6]], ['%s%% x %d', ['a', 3.9]], ['plain', []], ['%s', 'one']]) assert.equal(gdfText(template, args), gdf(template, args));
  assert.throws(() => gdfText('%s and %s', ['one']), /Not enough arguments/);
  assert.throws(() => gdf('%s and %s', ['one']), /Not enough arguments/);
});

// ---------------------------------------------------------------- the pseudo-locale
// Every English key the side stories may look up: their Godot tables as the 2D shows them (with and without the web override),
// the composites, the menu titles, the declared fork text, the kit's region name, the memory lines and the place file's rooms
// and listed descriptions.
function msgids() {
  const out = new Set();
  const walk = (value, file) => {
    if (typeof value === 'string') { out.add(value); if (file) out.add(web(file, value)); return; }
    if (value && typeof value === 'object') for (const item of Object.values(value)) walk(item, file);
  };
  for (const [file, table] of Object.entries(GODOT_TEXT)) walk(table, file);
  for (const [file, table] of Object.entries(GODOT_CONSTANTS)) walk(table, file);
  walk(COMPOSE_TEXT); walk(MENU_TITLES); walk(VISITS_FORK_TEXT);
  out.add('Story text');
  for (const name of ['Bea', 'Celeste', 'Rook', 'Dez', 'Thanh']) out.add(name); // world.js NEIGHBORS: the memory line's speaker
  for (const who of Object.keys(surprises.PAIRS)) { const [a, b] = surprises.PAIRS[who]; for (const found of [[a], [b], [a, b]]) out.add(surprises.memoryLine(who, found)); }
  for (const site of VOTING.sites) { out.add(site.room); out.add(site.listed_description); }
  out.delete('');
  return [...out].filter(text => /[A-Za-z]/.test(text));
}
function pseudoLocale(extra = {}) {
  const json = JSON.parse(pseudoCatalog(msgids(), 'qps-ploc'));
  const read = readCatalog(JSON.stringify({ ...json, ...extra }), 'qps-ploc');
  assert.ok(read.catalog, read.error);
  assert.deepEqual(read.rejected, [], 'every pseudo entry passes the validator');
  assert.equal(setLocale('qps-ploc', read.catalog, { preview: true }), 'qps-ploc');
  return read.catalog;
}

// The words that stay as they are: the place file's names and addresses and its EAS ids (D8), links and domains, and the protected
// tokens the pseudo-locale keeps (i18n.js PROTECTED).
const KEPT = [...VOTING.sites.flatMap(site => [site.name, site.address, site.eas_id]), 'Tenderloin Redux', 'WASD', 'Enter', 'Esc', 'Shift', 'F5', 'BPM'].sort((a, b) => b.length - a.length);
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|gov|edu|io|dev|app|us|info|ca)\b/gi;
// Keys whose strings are ids, colours, geometry metadata (a site's street, never drawn) or the visit state (stories: the picker
// keeps the completed titles in English and looks them up when it draws).
const TEXT_KEYS = new Set(['street', 'target', 'stories', 'id', 'kind', 'focus', 'picture', 'era', 'lens', 'accent', 'color', 'coat', 'collar', 'tag', 'ears', 'canopy', 'paper', 'handle', 'mark', 'markColor', 'boat', 'star', 'cape', 'node', 'neighbor', 'surpriseId', 'tourId', 'style', 'className', 'src', 'url', 'kindId']);
// The pseudo transform keeps a whole line's speech envelope name (Name: "…"), and qps-ploc's Intl tag is en-US, so its lists
// join with "and".
function residue(text) {
  let rest = String(text).replace(URL_RE, ' ').replace(/[^\n:"⟦⟧]{1,40}: "⟦/g, ': "⟦').replace(/⟧,? and ⟦/g, '⟧ ⟦');
  for (const kept of KEPT) rest = rest.split(kept).join(' ');
  return rest.match(/[A-Za-z]{2,}(?:[^A-Za-z\n]{1,3}[A-Za-z]{2,})*/g) ?? [];
}
// The text of an HTML string: its text nodes and its aria-label, title and alt values, entities decoded.
const decode = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function htmlText(html) {
  const parts = [];
  for (const m of html.matchAll(/\s(?:aria-label|title|alt)="([^"]*)"/g)) parts.push(decode(m[1]));
  for (const m of html.replace(/<[^>]*>/g, '\u0000').split('\u0000')) if (m.trim()) parts.push(decode(m));
  return parts;
}
function strings(value, key = '', out = []) {
  if (typeof value === 'string') {
    if (TEXT_KEYS.has(key) || /^[a-z0-9_:#.-]*$/.test(value)) return out;
    if (/^\s*</.test(value)) out.push(...htmlText(value)); else out.push(value);
  } else if (Array.isArray(value)) value.forEach(item => strings(item, key, out));
  else if (value && typeof value === 'object') for (const [k, item] of Object.entries(value)) { if (!TEXT_KEYS.has(k)) strings(item, k, out); }
  return out;
}

// A playthrough of every story (both Power stories), Cook & Share's four dishes, Before These Streets, the picker and the
// landmarks and surprises, returning every view, announcement, objective and result.
function playthrough() {
  const seen = [], rec = value => seen.push(value);
  let s = picker.initialStories();
  const base = { opened: true, musicPlaying: false, powerPlace: POWER_PLACE, voting: VOTING, player: P.START, walking: false, busy: false, sites: {} };
  const look = (id, ctx) => {
    for (const e of picker.EPISODES) rec(picker.episodeView(s, e, { ...ctx, musicPlaying: !ctx.musicPlaying }));
    rec(picker.episodeModule(id).announce(s[id], { ...ctx, activeId: picker.activeEpisode(s) }));
    rec(picker.episodeModule(id).objective(s[id], ctx));
    rec(picker.pickerView(s, ctx));
  };
  const act = (id, action, extra = {}) => { const ctx = { ...base, ...extra }, r = picker.changeEpisode(s, id, action, ctx); s = r.stories; rec(r.announce); look(id, ctx); return r; };
  const travel = (id, extra = {}) => { const to = act(id, { type: 'walk' }, extra).walk; act(id, { type: 'arrived' }, { ...extra, player: to }); return to; };
  act('dogs', { type: 'open' }); act('dogs', { type: 'info' }); act('dogs', { type: 'info' }); act('dogs', { type: 'begin' });
  let at;
  for (const [profile, lead] of [[0, 2], [0, 1], [0, 0], [0, 0], [1, 1], [1, 2]]) { act('dogs', { type: 'profile', index: profile }); act('dogs', { type: 'lead', index: lead }); at = travel('dogs'); act('dogs', { type: 'match' }, { player: at }); }
  act('dogs', { type: 'walk' }); act('dogs', { type: 'blocked', reopen: true }); act('dogs', { type: 'end' }); act('dogs', { type: 'close' });
  rec(picker.openPicker(s, { ...base, busy: true }));
  let r = picker.openPicker(s, base); s = r.stories; rec(r);
  rec(picker.selectStory(s, 0, { ...base, sites: { lantern: false } }));
  r = picker.followInvitation(s, base); s = r.stories; rec(r);
  act('lantern', { type: 'costume', value: 1 }); act('lantern', { type: 'lantern', value: 1 }); act('lantern', { type: 'begin' });
  at = travel('lantern'); act('lantern', { type: 'advance' }, { player: at }); act('lantern', { type: 'advance' }, { player: lantern.routePoint(36) });
  act('lantern', { type: 'walk' }, { player: lantern.routePoint(8) });
  for (let d = 9; d <= 36; d += 1) act('lantern', { type: 'tick' }, { player: lantern.routePoint(d) });
  act('lantern', { type: 'arrived' }, { player: lantern.routePoint(36) }); act('lantern', { type: 'advance' }, { player: lantern.routePoint(36) });
  act('lantern', { type: 'end' }); act('lantern', { type: 'begin' }); at = travel('lantern'); act('lantern', { type: 'advance' }, { player: at });
  act('lantern', { type: 'walk' }, { player: lantern.routePoint(20) }); act('lantern', { type: 'arrived' }, { player: lantern.routePoint(8) });
  act('lantern', { type: 'walk' }, { player: lantern.routePoint(8) }); act('lantern', { type: 'blocked' }); act('lantern', { type: 'open' });
  act('lantern', { type: 'end' }); act('lantern', { type: 'close' });
  const solve = extra => { const want = power.SOLUTIONS[s.power.station]; for (let k = 0; k < 4; k++) for (let n = 0; n < 4 && String(s.power.turns[s.power.station][k]) !== want[k]; n++) act('power', { type: 'rotate', index: k }, extra); };
  act('power', { type: 'open' }); act('power', { type: 'begin' });
  for (const st of [0, 1, 2]) { act('power', { type: 'choose', index: st }); at = travel('power'); act('power', { type: 'check' }, { player: at }); solve({ player: at }); act('power', { type: 'check' }, { player: at }); look('power', { ...base, player: at, connectorRoom: false }); }
  act('power', { type: 'end' }); act('power', { type: 'choose', index: 1 }); look('power', { ...base, powerPlace: null }); act('power', { type: 'begin' }); act('power', { type: 'begin' }); act('power', { type: 'begin' });
  for (const st of [0, 1, 2]) { act('power', { type: 'choose', index: st }); look('power', { ...base }); at = travel('power'); act('power', { type: 'walk' }, { player: at }); solve({ player: at }); act('power', { type: 'check' }, { player: at }); }
  act('power', { type: 'walk' }); act('power', { type: 'blocked', reopen: true }); act('power', { type: 'walk' }); act('power', { type: 'blocked' }); act('power', { type: 'end' }); act('power', { type: 'close' });
  act('election', { type: 'open' }); act('election', { type: 'begin' }); act('election', { type: 'palette', value: 1 });
  for (const i of [0, 1]) { act('election', { type: 'choose', index: i }); at = travel('election'); act('election', { type: 'walk' }, { player: at }); act('election', { type: 'record' }, { player: at }); }
  act('election', { type: 'make' }); act('election', { type: 'choose', index: 0 }); act('election', { type: 'place', index: 1 }); act('election', { type: 'place', index: 0 }); act('election', { type: 'choose', index: 1 }); act('election', { type: 'place', index: 1 });
  at = travel('election'); act('election', { type: 'share' }, { player: at }); act('election', { type: 'walk' }); act('election', { type: 'blocked' }); act('election', { type: 'end' }); act('election', { type: 'close' });
  rec(election.sourceText(s.election, {}));
  for (const id of picker.EPISODES) rec(picker.episodeModule(id).openRefusal(picker.initialStories()[id], { ...base, walking: true }));
  r = picker.openPicker(s, base); s = r.stories; rec(r); rec(picker.pickerView(picker.changePage(s, 1), base)); rec(picker.keepExploring(s)); rec(picker.backToStories(s, base)); rec(picker.readerEntry());
  rec(power.entryTooltip()); rec(power.sourceText());
  let m = meal.initialMeal();
  const step = (action, ctx = { opened: true }) => { const o = meal.changeMeal(m, action, ctx); m = o.state; rec(o.announce); rec(meal.mealView(m)); rec(meal.cue(m)); };
  for (const ctx of [{}, { opened: true, storyActive: true }, { opened: true, busy: true }, { opened: true, hostingInProgress: true }]) step({ type: 'open' }, ctx);
  step({ type: 'open' });
  for (let cook = 0; cook < 4; cook++) {
    step({ type: 'select', index: cook }); for (let k = 0; k < 6; k++) step({ type: 'advance' }); for (let k = 0; k < 5; k++) step({ type: 'advance' });
    step({ type: 'serving', index: cook % 2 }); step({ type: 'placement', index: 1 }); step({ type: 'shareOrFollow' }); step({ type: 'previous' }); step({ type: 'select', index: cook }); step({ type: 'shareOrFollow' });
  }
  step({ type: 'close' });
  let b = before.initialBefore();
  for (const [action, ctx] of [[{ type: 'open' }, { busy: true }], [{ type: 'open' }, { storyCard: true, startupCard: true }], [{ type: 'view', index: 1 }], [{ type: 'view', index: 2 }], [{ type: 'observe', index: 0 }], [{ type: 'observe', index: 1 }], [{ type: 'sources' }], [{ type: 'sources' }], [{ type: 'close' }], [{ type: 'open' }], [{ type: 'close' }]]) {
    const o = before.changeBefore(b, action, ctx ?? {}); b = o.state; rec(o.announce); rec(before.beforeView(b)); rec(before.announcement(b));
  }
  rec(before.sourceLines());
  let tour = landmarks.initialTour(), found = [];
  const compass = () => pseudo('a block north');
  for (const id of surprises.SURPRISE_IDS) for (const who of [null, surprises.KEEPSAKES[id].neighbor]) { rec(surprises.inspect(found, id, { openNeighborId: who, sparks: 3 })); }
  for (const id of surprises.SURPRISE_IDS) { const o = surprises.inspect(found, id, { openNeighborId: surprises.KEEPSAKES[id].neighbor }); found = o.found; rec(o); rec(landmarks.exploreObjective(found, tour, { player: P.START, compass })); for (const who of Object.keys(surprises.PAIRS)) rec(surprises.neighborHint(found, who, { player: P.START, compass })); }
  rec([surprises.conversationLabel(found), surprises.progressLabel(found, 4), surprises.keepsakes(found), surprises.markers(found)]);
  for (const stop of ['museum:0', 'museum:1', 'museum:2', 'museum:3', 'park', 'so_what', 'eatery:0', 'eatery:1', 'eatery:2', 'eatery:3', 'eatery:4', 'eatery:5']) {
    rec(landmarks.exploreObjective(found, tour, { player: P.START, compass }));
    const o = landmarks.visitStop(tour, stop, { treeCount: 9, sparks: 2 }); tour = o.tour; rec(o);
  }
  for (let i = 0; i < 6; i++) { let o = landmarks.cycleEatery(tour, i); tour = o.tour; rec(o); for (let k = 0; k < 4; k++) { o = landmarks.orderEatery(tour, i, { sparks: k }); tour = o.tour; rec(o); } rec(landmarks.activateEatery(tour, i, {})); }
  rec(landmarks.inspectMuseum(tour)); rec(landmarks.inspectPark(tour, 9)); rec(landmarks.inspectSoWhat(tour)); rec(landmarks.tourState(tour));
  rec(landmarks.tourCompletion(tour, { foundCount: found.length, objectiveId: 'explore' })); rec(landmarks.exploreObjective(found, tour, { player: P.START, compass }));
  return seen;
}

// The visits screens over the stand-in host (the shell, the episode screens and the neighborhood part): every entry, then a
// seeded walk that presses enabled controls, opens screens, taps map objects, ends walks and presses Escape.
async function screens({ seed = 7, steps = 400, say = text => text } = {}) {
  let a = seed;
  const random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
  const pick = list => list[Math.floor(random() * list.length)];
  const dialog = fakeDialog(), page = new Map(), cancels = [];
  const inDialog = dialog.doc.getElementById;
  dialog.doc.getElementById = id => inDialog(id) ?? page.get(id) ?? null;
  const addModal = dialog.modal.addEventListener;
  dialog.modal.addEventListener = (type, fn) => { if (type === 'cancel') cancels.push(fn); addModal(type, fn); };
  const music = { on: false };
  const { host, log, io } = visitsHost(dialog, { music: { label: () => say(music.on ? 'Music: On' : 'Music: Off'), on: () => music.on, toggle: async () => { music.on = !music.on; return say('Music changed.'); } } });
  io.files = { 'power_place.json': POWER_PLACE, 'voting_places.json': VOTING };
  io.state = { opened: true, surprises: [] };
  const objectives = [{ id: 'explore', text: '', hint: '', target: null }, { id: 'explore', tourId: 'park', tourAction: say('Visit the Park'), target: { x: 0, y: 0 } }, { id: 'other', text: '', hint: '', target: null }];
  const visits = createVisits(host, { createEpisodeScreens, createWorldVisits });
  const element = id => ({ id, disabled: false, listeners: {}, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }, focus() {}, scrollIntoView() {} });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const seen = [];
  let walkGoal = null;
  for (let i = 0; i < steps; i++) {
    const roll = random(), from = log.length;
    io.objective = pick(objectives);
    if (dialog.modal.open && roll < 0.8) {
      const ids = [...io.html.matchAll(/<button id="([^"]+)"([^>]*)>/g)].filter(m => !/\sdisabled\b/.test(m[2])).map(m => m[1]);
      const el = ids.length ? dialog.doc.getElementById(pick(ids)) : null;
      for (const fn of el?.listeners.click || []) fn({ detail: 0, preventDefault() {} });
    } else if (dialog.modal.open && roll < 0.92) { const event = { preventDefault() { this.done = true; } }; for (const fn of cancels) fn(event); if (!event.done) dialog.close(); }
    else if (dialog.modal.open) dialog.close();
    else if (roll < 0.3) visits.open(pick(['before', 'meal', 'story', 'resume', 'picker', 'notes-spot', 'notes-museum', 'notes-eateries', 'notes-park', 'notes-so-what']), { from: pick(['startup', 'notes', 'map']) });
    else if (roll < 0.6) visits.interact(pick(visits.objects({ camera: { overviewMode: false } })), 'tap');
    else if (roll < 0.75 && walkGoal) { io.player = { ...walkGoal }; visits.walkEnded(); walkGoal = null; }
    else if (roll < 0.8) visits.conversationAction(pick(['surprise', 'museum', 'eateries', 'landmark_tour']), pick(['bea', 'rook']));
    else {
      for (const [kind, id] of [['before', 'before-entry'], ['revisit', 'before-revisit'], ['story', 'story-entry'], ['meal', 'meal-entry'], ['resume', 'story-resume'], ['notes', 'notes-spot']]) {
        const html = visits.entryHTML(kind);
        seen.push(html);
        for (const [, attrs] of html.matchAll(/<\w+\b([^>]*)>/g)) { const at = /\bid="([^"]+)"/.exec(attrs)?.[1]; if (at) page.set(at, element(at)); }
        visits.bindEntry(kind);
        if (roll > 0.9) for (const fn of page.get(id)?.listeners.click || []) fn({ detail: 0 });
      }
    }
    await flush(); await flush();
    for (const entry of log.slice(from)) {
      if (entry[0] === 'walk') walkGoal = entry[1];
      if (['show', 'status', 'toast', 'announce', 'restoreStartupCard'].includes(entry[0])) seen.push(entry[1]);
      if (entry[0] === 'speak') seen.push(entry[2], entry[3]);
      if (entry[0] === 'burst') seen.push(entry[1]);
      if (entry[0] === 'walk') seen.push(entry[2]?.name, entry[2]?.announce);
    }
    seen.push(visits.entries(), visits.objects({ camera: {} }).map(o => o.name), visits.scene());
    if (i === Math.floor(steps / 2)) { io.state = { ...io.state, surprises: [...surprises.SURPRISE_IDS] }; visits.sync(); }
  }
  return seen;
}

test('under the pseudo-locale every story, every screen and every reply is looked up: no plain English reaches the player', async t => {
  t.after(english);
  pseudoLocale();
  const english_ = [];
  onMiss(text => english_.push(text));
  t.after(() => onMiss(null));
  const seen = [...playthrough(), ...await screens({ say: text => pseudo(text) })];
  const leaks = new Map();
  for (const text of strings(seen)) for (const run of residue(text)) if (!leaks.has(run)) leaks.set(run, text);
  assert.deepEqual([...leaks].slice(0, 12).map(([run, text]) => `${run}  <-  ${text.slice(0, 140)}`), [], 'English that reached the player under qps-ploc');
  assert.deepEqual([...new Set(english_)].filter(text => /[A-Za-z]{2,}/.test(text)).slice(0, 12), [], 'a lookup the catalog lacked');
  // The run was long enough to mean something: it showed thousands of pseudo strings, every story's ending among them.
  const all = strings(seen).join('\n');
  for (const key of [D.match_dog.reunion, LT.advance.won, PW.check_path.won, PW.check_path.larkinWon, V.share_map.won, PK.refresh.invitation, G('main.gd').update_landmark_tour_completion.announce]) assert.ok(all.includes(pseudo(key).slice(0, 30)), `reached: ${key.slice(0, 50)}`);
  assert.ok(seen.length > 3000, `${seen.length} values`);
});

test('English is untouched: the same playthrough and screens with no locale give no catalog lookup at all', async () => {
  english();
  assert.equal(locale(), 'en');
  const misses = [];
  onMiss(text => misses.push(text));
  try {
    const a = JSON.stringify(playthrough()), b = JSON.stringify(await screens());
    assert.ok(a.length > 100000 && b.length > 100000);
    // A second run is byte-identical (no state leaks between locales), and nothing was looked up in English.
    assert.equal(JSON.stringify(playthrough()), a);
    assert.deepEqual(misses, []);
    assert.equal(diagnostics().missCount, 0);
  } finally { onMiss(null); }
});

test('a language switch redraws the neighborhood labels; English keeps its own frozen objects', async t => {
  t.after(english);
  english();
  const { host } = visitsHost(fakeDialog());
  const visits = createVisits(host, { createEpisodeScreens, createWorldVisits });
  const before_ = visits.objects({ camera: {} }), scene = visits.scene();
  assert.equal(visits.objects({ camera: {} })[0], before_[0], 'the same frozen objects on every call');
  pseudoLocale();
  const shown = visits.objects({ camera: {} });
  assert.notEqual(shown[0], before_[0]);
  assert.equal(shown.find(o => o.id === 'museum').name, pseudo(web('main.gd', G('main.gd').build_street_life_decor.museum)));
  assert.equal(visits.scene().park.label, pseudo(G('main.gd').build_boeddeker_park.label));
  english();
  const again = visits.objects({ camera: {} });
  assert.deepEqual(again.map(o => o.id), before_.map(o => o.id));
  assert.ok(again.every((o, i) => o === before_[i]), 'back in English, the very objects of before');
  assert.equal(visits.scene().park, scene.park);
});

// ---------------------------------------------------------------- logic that no longer reads English
test('Power\'s Larkin reader swaps "repair surface" by line, not by searching the shown text', t => {
  t.after(english);
  english();
  const R = PW.refresh;
  // The premise: of every line Power's reader can hold, only walkFirst says "repair surface".
  const lines = [];
  const walk = v => { if (typeof v === 'string') lines.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(PW); walk(GODOT_CONSTANTS['power_story.gd']);
  assert.deepEqual(lines.filter(line => line !== R.repairSurface && line.includes(R.repairSurface)), [R.walkFirst]);
  assert.equal(COMPOSE_TEXT.power.walkFirstBattery, R.walkFirst.replaceAll(R.repairSurface, R.batteryView));
  const ctx = { opened: true, powerPlace: POWER_PLACE, player: P.START };
  let p = power.changePower(power.initialPower(), { type: 'open' }, ctx).state;
  p = power.changePower(p, { type: 'choose', index: 1 }, ctx).state;
  p = power.changePower(p, { type: 'begin' }, ctx).state; // Begin story: the relay reader (a second Begin is the case map)
  assert.equal(p.mapView, false);
  assert.ok(power.powerView(p, ctx).text.includes(COMPOSE_TEXT.power.walkFirstBattery));
  assert.ok(!power.powerView(p, ctx).text.includes(R.repairSurface));
  pseudoLocale();
  const text = power.powerView(p, ctx).text;
  assert.ok(text.includes(pseudo(COMPOSE_TEXT.power.walkFirstBattery)), 'the Larkin line is its own msgid');
  assert.ok(!text.includes(pseudo(R.walkFirst)));
  // The festival keeps the repair line.
  const f = power.changePower(power.changePower(power.initialPower(), { type: 'open' }, ctx).state, { type: 'begin' }, ctx).state;
  assert.ok(power.powerView(f, ctx).text.includes(pseudo(R.walkFirst)));
});

test('the memory line loses its quotes by punctuation class: English as before, and a locale\'s « » too', t => {
  t.after(english);
  for (const who of Object.keys(surprises.PAIRS)) {
    const [a, b] = surprises.PAIRS[who];
    for (const found of [[a], [b], [a, b]]) {
      const line = surprises.memoryLine(who, found);
      assert.equal(unquote(line), line.replace(/^“/, '').replace(/”$/, ''), line);
    }
  }
  assert.equal(unquote('« Bonjour »'), ' Bonjour ');
  assert.equal(unquote('「x」'), '「x」', 'brackets are not quotes');
  // In a locale the translated line is stripped, whatever its quotes.
  const id = 'jeffrey_record', who = surprises.KEEPSAKES[id].neighbor, line = surprises.memoryLine(who, [id]);
  const catalog = JSON.parse(pseudoCatalog(msgids(), 'qps-ploc'));
  catalog.messages[line] = `«${pseudo(line.slice(1, -1))}»`;
  const read = readCatalog(JSON.stringify(catalog), 'qps-ploc');
  assert.ok(read.catalog, read.error);
  setLocale('qps-ploc', read.catalog, { preview: true });
  const memory = surprises.inspect([], id, { openNeighborId: who }).memory;
  assert.ok(memory.includes(`"${pseudo(line.slice(1, -1))}"`), memory);
});

test('the eatery burst title is the MENU_TITLES table: English is Godot\'s capitalize(), a locale never title-cases', t => {
  t.after(english);
  english();
  for (const [item, title] of Object.entries(MENU_TITLES)) { assert.equal(title, gdCapitalize(item)); assert.equal(menuTitle(item), gdCapitalize(item)); }
  assert.equal(MENU_TITLES['1961 live jazz LP'], '1961 Live Jazz Lp');
  assert.ok(Object.keys(MENU_TITLES).length >= 19, 'every menu item and the house special');
  const tour = landmarks.cycleEatery(landmarks.initialTour(), 2).tour;
  assert.equal(landmarks.orderEatery(tour, 2).burst.heading, 'Order Up: Botanical Highball');
  const catalog = JSON.parse(pseudoCatalog(msgids(), 'qps-ploc'));
  catalog.messages['Botanical Highball'] = 'cóctel botánico';
  const read = readCatalog(JSON.stringify(catalog), 'qps-ploc');
  setLocale('qps-ploc', read.catalog, { preview: true });
  assert.equal(landmarks.orderEatery(tour, 2).burst.heading, pseudo('Order Up: %s').replace('%s', 'cóctel botánico'), 'the translation as it is, never capitalized');
});

test('the Larkin case map\'s compass letter is a display-time lookup: the narrow form of "North", else Godot\'s "N"', t => {
  t.after(english);
  english();
  const ctx = { opened: true, powerPlace: POWER_PLACE, player: P.START };
  let p = power.changePower(power.initialPower(), { type: 'open' }, ctx).state;
  p = power.changePower(p, { type: 'choose', index: 1 }, ctx).state;
  const label = () => power.powerView(p, ctx).mapLabels[2];
  assert.equal(PW.setup.map2, 'N');
  assert.equal(label().text, 'N');
  assert.equal(label().visible, true);
  assert.equal(compassNorth('N'), 'N');
  // A locale without the narrow entry keeps "N"; with it (Vietnamese Bắc), the map shows its own letter, and the episode screen
  // draws it.
  pseudoLocale();
  assert.equal(label().text, 'N');
  pseudoLocale({ narrow: { North: 'B' } });
  assert.equal(label().text, 'B');
});

test('the episode screen draws the case map\'s compass letter from the active catalog', async t => {
  t.after(english);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const draw = async () => {
    const dialog = fakeDialog(), { host, io } = visitsHost(dialog);
    io.files = { 'power_place.json': POWER_PLACE, 'voting_places.json': VOTING };
    createVisits(host, { createEpisodeScreens, createWorldVisits }).open('story');
    await flush(); await flush();
    for (const fn of dialog.doc.getElementById('power-tab-1').listeners.click) fn({ detail: 0 });
    await flush(); await flush();
    return [...io.html.matchAll(/<span class="visits-label"[^>]*>([^<]*)<\/span>/g)].map(m => m[1]);
  };
  english();
  assert.deepEqual(await draw(), ['Larkin / Eddy', '40 m', 'N', 'Eddy Street']);
  pseudoLocale({ narrow: { North: 'B' } });
  assert.deepEqual(await draw(), [pseudo('Larkin / Eddy'), pseudo('40 m'), 'B', pseudo('Eddy Street')]);
});

test('the label-in-name rule holds per locale: a Thai label ends at a word boundary, not at a space', t => {
  t.after(english);
  english();
  assert.match(btn({ id: 'a', label: 'Back', name: 'Background music' }), /aria-label="Back"/, 'English: Back is not a word of Background');
  assert.match(btn({ id: 'a', label: 'Begin', name: 'Begin search' }), /aria-label="Begin search"/);
  const th = readCatalog(JSON.stringify({ format: 1, locale: 'th', messages: {} }), 'th');
  assert.ok(th.catalog);
  setLocale('th', th.catalog, { preview: true });
  const segments = [...new Intl.Segmenter('th', { granularity: 'word' }).segment('เริ่มค้นหา')].map(s => s.segment);
  assert.deepEqual(segments, ['เริ่ม', 'ค้นหา'], 'premise: Node segments the two Thai words');
  assert.match(btn({ id: 'a', label: 'เริ่ม', name: 'เริ่มค้นหา' }), /aria-label="เริ่มค้นหา"/, 'a whole Thai word at the start: the name is the aria-label');
  const partial = btn({ id: 'a', label: 'เริ', name: 'เริ่มค้นหา' });
  assert.match(partial, /aria-label="เริ"/, 'part of a word: the label is the name');
  assert.match(partial, /class="sr-only">เริ่มค้นหา</, 'and the name the description');
  assert.match(frameHTML({}), /aria-label="Story text"/, 'with no Thai entry the region name falls back whole');
});
