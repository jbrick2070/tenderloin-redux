// browser-next/game-text.js (docs/I18N_PLAN.md I2a): game.js's own text, moved out of game.js into GAME_TEXT. English stays the
// source of truth: no entry is a Godot literal, every entry is a msgid the extractor keeps, every entry is drawn, the composed
// sentences equal what game.js composed before, game.js's screens render the same English bytes as before (pinned by hash), and
// under the pseudo-locale every moved string is looked up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gdSource, gdStrings } from './gd-literal.mjs';
import { filmDoneEnvelope, openedEnvelope } from './next-fixtures.mjs';
import { GAME_TEXT, tf } from '../browser-next/game-text.js';
import * as I from '../browser-next/i18n.js';
import { isHumanText } from '../scripts/i18n.mjs';
import { initialState, FURNITURE, MOTIFS, PALETTES, LOANS, LITTER, PHOTO_GUESTS, BLOCK_TEXT, ready, blockMissing, blockMissingItems } from '../browser-next/core.js';
import { parseGodotSave, canonicalStringify } from '../browser-next/godot-save.js';
import { FILM_SHOTS } from '../browser-next/film.js';
import { NEIGHBORS, PLACES } from '../browser-next/world.js';
import { fmt, GATHERING_LAYOUT_TITLES, STORY_CHAPTERS } from '../browser-next/story.js';
import { GODOT, FORK_TEXT } from '../browser-next/ending/text.js';
import { GODOT_TEXT as VISIT_TEXT } from '../browser-next/visits/text.js';
import { PHOTO_RESPONSES } from '../browser-next/keepsake.js';
import { EDITION_TEXT, EDITION_URL } from '../browser-next/edition.js';
import { SOUNDS_TEXT, soundsLabel } from '../browser-next/rewards.js';
import { MAX_VOLUME } from '../browser-next/sketch-core.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const GAME = read('browser-next/game.js').replace(/\r\n/g, '\n'), HTML = read('browser-next/index.html').replace(/\r\n/g, '\n');
const LINES = GAME.split('\n');
// Every string leaf of GAME_TEXT, with its path.
const leaves = (value, path = 'GAME_TEXT') => typeof value === 'string' ? [[path, value]] : Object.entries(value).flatMap(([k, v]) => leaves(v, Array.isArray(value) ? `${path}[${k}]` : `${path}.${k}`));
const ALL = leaves(GAME_TEXT);
// Single lower-case words that scripts/i18n.mjs isHumanText does not extract (none in GAME_TEXT).
const NOT_EXTRACTED = [];

test('GAME_TEXT holds no Godot literal: Godot words come from the drift-tested tables', () => {
  const godot = new Set(readdirSync(new URL('../godot/', import.meta.url)).filter(n => n.endsWith('.gd')).flatMap(n => gdStrings(gdSource(n))));
  assert.ok(godot.has('Back to the block') && godot.has('Keep exploring'), 'the premise: the scan reads Godot');
  assert.deepEqual(ALL.filter(([, v]) => godot.has(v)), []);
  assert.ok(ALL.length > 500, `${ALL.length} entries`);
});

test('every GAME_TEXT entry is a msgid the extractor keeps, frozen, and ASCII-quoted placeholders only', () => {
  assert.deepEqual(ALL.filter(([, v]) => !isHumanText(v) && !NOT_EXTRACTED.includes(v)).map(([p]) => p), []);
  assert.ok(Object.isFrozen(GAME_TEXT) && Object.isFrozen(GAME_TEXT.filmScreen) && Object.isFrozen(GAME_TEXT.hostingScreen.tileShapes));
  for (const [path, v] of ALL) assert.doesNotMatch(v.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, ''), /[{}]/, `${path}: a brace is a placeholder or nothing`);
});

test('every GAME_TEXT entry is drawn by game.js (index.html copies and the godot-save.js copies aside)', () => {
  const unused = [];
  const walk = (value, path) => {
    if (typeof value === 'string') return;
    for (const [k, v] of Object.entries(value)) {
      const here = `${path}.${k}`;
      if (['GAME_TEXT.indexHTML', 'GAME_TEXT.loadMessages'].includes(here)) continue;
      // A table read by key (GAME_TEXT.save, GAME_TEXT.layoutEditor.cell[…]) is drawn as a whole.
      if (GAME.includes(here.replace(/^GAME_TEXT/, 'GAME_TEXT'))) continue;
      if (typeof v === 'string') unused.push(here); else walk(v, here);
    }
  };
  walk(GAME_TEXT, 'GAME_TEXT');
  assert.deepEqual(unused, []);
});

test("game.js holds no inline English: no text node of its markup and no quoted sentence, apart from Godot's words drawn through t() and errors it throws", () => {
  // Text nodes of the markup game.js writes: between > and <, outside interpolations.
  const nodes = [...GAME.matchAll(/>([^<>${}`'"\n]+)</g)].map(m => m[1].trim()).filter(s => /[A-Za-z]{2,}/.test(s) && /^[A-Za-z“‘—©]/.test(s) && !/[&()=]|\w\.\w/.test(s));
  assert.deepEqual([...new Set(nodes)].filter(s => !['WASD', 'E'].includes(s)), []);
  // Quoted literals with a capitalized word or two words, outside t() and L().
  const quoted = [...GAME.matchAll(/(?<![\w$.])(t\(|L\(|)'([^'\n]*)'/g)].filter(m => !m[1]).map(m => m[2])
    .filter(s => /^[A-Z][a-z]+\b|[A-Za-z]{2,} [A-Za-z]{2,}/.test(s) && !/[<>=#[]|^\.|\.js$|^\(/.test(s));
  const ALLOWED = ['not saved', 'save full', 'storage unavailable', 'Optional module unavailable', 'City data unavailable', 'Not a story data file', 'Story data unavailable', 'Story data too large', 'Escape', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'TAYLOR', 'HYDE'];
  assert.deepEqual([...new Set(quoted)].filter(s => !ALLOWED.includes(s)), []);
  assert.ok(quoted.includes('save full'), 'the premise: the scan reads quoted literals');
  // Godot's words without a drift table to read them from stay t() literals, which the extractor finds.
  assert.deepEqual([...new Set([...GAME.matchAll(/(?<![\w$.])t\('([^'\n]*)'\)/g)].map(m => m[1]))].sort(), ['Circle', 'Palette', 'Remove', 'Seats', 'Sound', 'Wave']);
  // Godot's beat word for an unticked step is rhythm.js RHYTHM_TEXT.rest (a SHORT_TEXT msgid), looked up like the tap word.
  assert.match(GAME, /t\(GAME_TEXT\.hostingScreen\.tap\) : t\(RHYTHM_TEXT\.rest\)\}<\/small>/);
});

test('text-keyed logic is gone: no label is lowercased, and the film label is read from its table', () => {
  assert.doesNotMatch(GAME, /label\.toLowerCase\(\)|labels\[id\]\.toLowerCase\(\)/);
  assert.doesNotMatch(GAME, /textContent\.replace\(\/\\s\*↗/);
  assert.match(GAME, /filmButtonLabel: \(\) => \(\$\('#film-shoot'\) \? filmButtonText\(\) : ''\),/);
  for (const id of Object.keys(FILM_SHOTS)) assert.equal(GAME_TEXT.filmEndings[id], FILM_SHOTS[id].label.toLowerCase(), id);
  assert.deepEqual(Object.keys(GAME_TEXT.filmEndings).sort(), Object.keys(FILM_SHOTS).sort());
  const labels = { sun: GAME_TEXT.muralEditor.lulusSun, wave: GAME_TEXT.muralEditor.dezsRhythm, rise: GAME_TEXT.muralEditor.celestesLetters };
  for (const id of MOTIFS) assert.equal(GAME_TEXT.muralEditor.place[id], `Place ${labels[id].toLowerCase()} anywhere on the panel. Move it as often as you like.`, id);
});

test('composition parity: each whole-sentence template is, in English, what game.js composed from pieces before', () => {
  const G = GAME_TEXT;
  for (let col = 0; col < 8; col++) for (let row = 0; row < 5; row++) for (const item of [null, ...FURNITURE]) for (const route of [false, true]) {
    const key = route ? 'route' : item ?? 'empty';
    assert.equal(tf(G.layoutEditor.cell[key], { col: col + 1, row: row + 1 }), `Column ${col + 1}, row ${row + 1}: ${route ? 'clear route, keep free' : item ? item : 'empty'}`);
  }
  for (const id of FURNITURE) assert.equal(G.layoutEditor.placing[id], `Placing ${id}. Choose an empty pair of spaces away from the clear route.`);
  for (const item of [null, ...MOTIFS]) assert.equal(tf(G.muralEditor.cell[item ?? 'empty'], { col: 3, row: 2 }), `Panel column 3, row 2: ${item ? item : 'empty'}`);
  for (const id of PALETTES) assert.equal(G.muralEditor.paletteNames[id], `${id} palette`);
  ['circle', 'wave', 'triangle'].forEach((shape, tile) => assert.equal(tf(G.hostingScreen.tileShapes[tile], { tile: 4 }), `Tile 4: ${shape}. Change shape.`));
  for (const on of [true, false]) assert.equal(tf(on ? G.hostingScreen.stepTap : G.hostingScreen.stepRest, { step: 5 }), `Step 5: ${on ? 'tap' : 'rest'}`);
  for (const key of ['warm', 'cool']) assert.equal(key === 'warm' ? G.hostingScreen.warmPalette : G.hostingScreen.coolPalette, `${key === 'warm' ? 'Warm' : 'Cool'} palette`);
  for (const n of [1, 2]) { const names = n === 1 ? 'Bea' : 'Bea, Dez'; assert.equal(tf(n === 1 ? G.viewKeepsake.saidYes : G.viewKeepsake.allSaidYes, { names }), `${names} ${n === 1 ? 'said' : 'all said'} yes. Rook chose to stay out of the picture. Everyone remains part of the afternoon.`); }
  const scenes = [['open', 'table', 'gather for conversation by the table.'], ['open', 'floor', 'make room for movement at the edges.'], ['packing', 'table', 'have finished this gathering.'], ['draft', 'table', 'join after the gathering opens.']];
  for (const [phase, layout, words] of scenes) assert.equal(`${G.showGatheringPlan.schematic} ${G.showGatheringPlan.visitors[phase === 'open' ? layout === 'table' ? 'table' : 'floor' : phase === 'packing' ? 'packing' : 'waiting']} ${G.showGatheringPlan.soundOff}`,
    `A schematic of your first fictional event, not a street survey or a group keepsake. The original map distances stay the same. Visitors ${words} The scene works with sound off; Reduce ambient motion in Settings stills the movement.`);
  const cells = ['column 1, row 2', 'column 2, row 2'];
  assert.equal(tf(G.showGatheringPlan.supplyCells, { label: 'Table', cells: I.list(cells, c => c.join(' and ')) }), `Table: ${cells.join(' and ')}.`);
  for (const name of ['', 'Bea']) assert.equal(name ? tf(G.hint.walkingTo, { name }) : G.hint.walking, `Walking${name ? ` to ${name}` : ''}…`);
  for (const layout of ['Long Table', 'Open Floor']) {
    assert.equal(tf(G.updateUI.layoutClear, { layout }), `${layout} · route stays clear`);
    assert.equal(tf(G.updateUI.layoutArranged, { layout, count: 2 }), `${layout} · 2/3 supplies arranged`);
  }
  for (const unmet of [['Bea'], ['Bea', 'Dez'], ['Bea', 'Celeste', 'Dez', 'Rook', 'Thanh']]) assert.equal(tf(G.updateUI.sayHelloTo, { names: I.list(unmet, n => n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n.at(-1)}` : n[0]) }), `Say hello to ${unmet.length > 1 ? `${unmet.slice(0, -1).join(', ')} and ${unmet.at(-1)}` : unmet[0]}.`);
  for (const [state, word] of [[G.soundUI.playingFile, 'Playing'], [G.soundUI.startingFile, 'Starting'], [G.soundUI.readyFile, 'Ready']]) assert.equal(tf(state, { file: 'jazz.mp3' }), `${word}: jazz.mp3`);
  for (const starting of [true, false]) assert.equal(tf(starting ? G.soundUI.fileStarting : G.soundUI.fileReady, { file: 'jazz.mp3' }), `jazz.mp3 — ${starting ? 'starting' : 'ready; press Play'}.`);
  for (const wide of [true, false]) assert.equal(tf(wide ? G.filmScreen.altWide : G.filmScreen.altClose, { label: 'An empty seat' }), `An empty seat. Original illustrated props${wide ? ' and Celeste and Dez’s volunteered fictional hands' : ', with no people pictured'}.`);
  assert.equal(tf(G.updateAfterglow.openingChapter, { caption: 'A long table.' }), 'Opening chapter: ' + 'A long table.');
  assert.equal(tf(G.speech.line, { name: 'Bea', text: 'Hi.' }), 'Bea: Hi.');
  assert.equal(tf(G.filmScreen.selected, { label: 'Wide' }), 'Wide selected.');
  assert.equal(tf(G.programmeEditor.added, { name: 'Stories' }), 'Stories added');
  assert.equal(tf(G.programmeEditor.addedNotice, { name: 'Stories' }), 'Stories added.');
  assert.equal(tf(G.showChapterCard.walkKeys, { keys: '<kbd>WASD</kbd>' }), '<kbd>WASD</kbd> or arrows to walk');
  assert.equal(tf(G.showChapterCard.talkKey, { key: '<kbd>E</kbd>' }), '<kbd>E</kbd> to talk / help');
  // The Godot words game.js now reads from their tables are the words it inlined.
  assert.deepEqual([GODOT['film_screening.gd'].setup.back, GODOT['programme_studio.gd'].refresh.keep, VISIT_TEXT['story_picker.gd'].setup.earlier, VISIT_TEXT['story_picker.gd'].setup.later, GATHERING_LAYOUT_TITLES.table, GATHERING_LAYOUT_TITLES.floor, STORY_CHAPTERS[4].title],
    ['Back to the block', 'Keep exploring', 'Earlier', 'Later', 'Long Table', 'Open Floor', 'The Open Seat']);
});

test("godot-save.js's two load messages, localized at display (t(savedMessage)), are the copies the extractor finds", () => {
  const loaded = parseGodotSave(canonicalStringify(openedEnvelope({ save_seq: 2 })), { initialState });
  const held = parseGodotSave('{not json', { initialState });
  assert.deepEqual([loaded.status, held.status], ['loaded', 'invalid']);
  assert.deepEqual([loaded.message, held.message], [GAME_TEXT.loadMessages.loaded, GAME_TEXT.loadMessages.held]);
  assert.equal((GAME.match(/t\(savedMessage\)/g) || []).length, 2);
});

test("index.html: markers on its static text, its copies in GAME_TEXT.indexHTML, the brand, street names and attributions kept English", () => {
  const attrs = [...HTML.matchAll(/<[^>]*\sdata-i18n-attr="aria-label"[^>]*>/g)].map(m => /aria-label="([^"]*)"/.exec(m[0])[1]);
  assert.deepEqual(attrs, GAME_TEXT.indexHTML.labels);
  const leads = [...HTML.matchAll(/<\w+\b([^>]*)>([^<]*)/g)].filter(m => /\sdata-i18n-lead(?=[\s>]|$)|^ id="swap-edition"/.test(m[1])).map(m => m[2].trim());
  assert.equal(/id="edition-note">([^<]*)</.exec(HTML)[1], GAME_TEXT.indexHTML.editionNote);
  assert.deepEqual(leads, GAME_TEXT.indexHTML.leads);
  assert.equal(/<title>([^<]*)<\/title>/.exec(HTML)[1], GAME_TEXT.indexHTML.title);
  assert.match(HTML, /<span class="map-label" translate="no">TURK STREET <span data-i18n-route>TAYLOR TO HYDE<\/span><\/span>/);
  assert.equal(tf(GAME_TEXT.indexHTML.route, { from: 'TAYLOR', to: 'HYDE' }), 'TAYLOR TO HYDE');
  const keys = /<span class="pointer-hint" data-i18n-keys>(.*?)<\/span><\/span>/.exec(HTML)[1];
  assert.equal(I.html(GAME_TEXT.indexHTML.keys, ...keys.match(/<kbd>[^<]*<\/kbd>/g)), keys, 'the key hint is one sentence around its keys');
  for (const kept of ['<span translate="no" lang="en">tenderloin<span class="brand-redux">redux</span></span>', 'translate="no" lang="en">© OpenStreetMap contributors · ODbL</a>', '<strong translate="no" lang="en">Transgender Cultural District</strong>', '<small translate="no" lang="en">San Francisco Planning Department']) assert.ok(HTML.includes(kept), kept);
  // A [data-i18n] node is text only: applyDocument replaces its textContent.
  for (const m of HTML.matchAll(/<(\w+)\b[^>]*\sdata-i18n(?=[\s>])[^>]*>([\s\S]*?)<\/\1>/g)) assert.doesNotMatch(m[2], /</, m[0]);
  // 14 at I2a, and the loading line and the district legend's note since (the I2 follow-up).
  assert.equal([...HTML.matchAll(/\sdata-i18n(?=[\s>])/g)].length, 16);
  // Nothing sits between an id and its data-rapid (tests/next-press-settle.test.mjs reads them adjacent).
  assert.match(HTML, /id="zoom-out" data-rapid /); assert.match(HTML, /id="zoom-in" data-rapid /);
});

// ------------------------------------------------------------------------------------------------- game.js's screens
// A top-level declaration of game.js (as tests/next-wiring.test.mjs reads them).
function declaration(lines, start) {
  const i = lines.findIndex(line => line.startsWith(start));
  assert.ok(i >= 0, start);
  let j = i + 1;
  while (j < lines.length && /^\s+\S/.test(lines[j])) j++;
  if (j < lines.length && /^[}\])]/.test(lines[j])) j++;
  return lines.slice(i, j).join('\n');
}
const SCREENS = ['mapInfo', 'history', 'blackhawk', 'historyWalk', 'neighbors', 'confirmRestart', 'journal', 'finale', 'photoConsent', 'packingChoice', 'showSettings'];
// game.js's screens over stand-ins, for one state; returns every HTML they drew (show, insertAdjacentHTML).
export function renderScreens(source, state, { held = false, storageAvailable = true } = {}) {
  const lines = source.replace(/\r\n/g, '\n').split('\n'), drawn = [];
  const el = () => ({ addEventListener() {}, focus() {}, scrollIntoView() {}, setAttribute() {}, textContent: '', checked: false });
  const scope = {
    show: html => drawn.push(html), body: { insertAdjacentHTML: (where, html) => drawn.push(html) }, bind() {}, act() {}, close() {}, goTo() {}, toast: text => drawn.push(`toast:${text}`), stopWalk() {}, cameraUI() {},
    $: el, document: { documentElement: { classList: { toggle() {} } } }, world: { camera: { overview() {} } }, state, held, storageAvailable, settings: { volume: 0.7, rewardSounds: true, reducedMotion: false, experimental: { neighborhoodVoices: true } },
    visits: { entryHTML: id => `[${id}]`, bindEntry() {} }, voicesHost: { enabled: true }, civicAvailable: () => true, filmAvailable: () => true, programmeTitle: () => 'TITLE',
    livingDistrict() {}, viewKeepsake() {}, programmeEditor() {}, hostingScreen() {}, civicScreen() {}, filmScreen() {}, openVoices() {}, restart() {}, photoLayout() {}, languageRowHTML: () => '', rewards: { setEnabled() {} }, saveSettings() {},
    soundsAnnouncement: () => '', music: { setVolume() {} }, setVoicesEnabled() {}, voicesUI() {}, bindSwap() {}, chooseLanguage() {},
    NEIGHBORS, PLACES, LOANS, LITTER, PHOTO_GUESTS, PHOTO_RESPONSES, BLOCK_TEXT, BLACK_HAWK: { id: 'blackhawk' }, ready, blockMissingItems, list: I.list, fmt, GATHERING_LAYOUT_TITLES, STORY_CHAPTERS, FORK_TEXT, EDITION_TEXT, EDITION_URL, SOUNDS_TEXT, soundsLabel, MAX_VOLUME,
    SAVE_TEXT: GAME_TEXT.save, GAME_TEXT, t: I.t, L: I.L, tf, escapeHTML: I.escapeHTML, BACK: GODOT['film_screening.gd'].setup.back, STUDIO: GODOT['programme_studio.gd'].refresh, ORDER: VISIT_TEXT['story_picker.gd'].setup,
  };
  const code = [declaration(lines, 'const GRAPHEMES'), declaration(lines, 'function initial('), declaration(lines, 'function button('), ...SCREENS.map(name => declaration(lines, `function ${name}(`)), `return { ${SCREENS.join(', ')} };`].join('\n');
  const screens = new Function(...Object.keys(scope), code)(...Object.values(scope));
  for (const name of SCREENS) screens[name](() => {});
  return drawn;
}
const stateOf = envelope => parseGodotSave(canonicalStringify(envelope), { initialState }).state;
const CASES = [
  ['a new afternoon', () => initialState(), {}],
  ['an opened block, held save', () => stateOf(openedEnvelope({ save_seq: 3 })), { held: true }],
  ['the film done, no storage', () => stateOf(filmDoneEnvelope({ save_seq: 9, history_read: true, blackhawk_discovered: true })), { storageAvailable: false }],
  ['packing up', () => { const s = stateOf(filmDoneEnvelope({ save_seq: 9 })); return { ...s, epilogue: { ...s.epilogue, packing: true, returned: ['table'] } }; }, {}],
];
// sha256 of each case's drawn English, from game.js at bd865bc (before I2a), over the same stand-ins.
const BEFORE = {
  'a new afternoon': 'f6a05d4fec33c22a3e23dfef00f576153ba06ec9209001f83465fd4f42266e8a',
  'an opened block, held save': '5836f13c530efc93f922dc20496c6c1d2a323c2cc4ac41e31dddf9e5a7d238dd',
  'the film done, no storage': '29cea83a35ddc706f287a6c3a7c2a09def06b9083a21c934a8fba4086644bd4f',
  'packing up': '9241565f2129dad25e59214901fbe05cde0b731f8457102301f06b5670c38afe',
};
const sha = text => createHash('sha256').update(text).digest('hex');

test("game.js's screens draw the same English bytes as before I2a (Field notes, the history stops, Settings, the finale, the keepsake and more)", () => {
  I.setLocale('en');
  for (const [name, make, options] of CASES) {
    const drawn = renderScreens(GAME, make(), options);
    assert.ok(drawn.length >= SCREENS.length, name);
    assert.equal(sha(drawn.join('\n\u0000\n')), BEFORE[name], name);
  }
});

test('under the pseudo-locale every moved string is looked up: the screens show no GAME_TEXT English, and tf() fills translated templates', () => {
  const entries = [...new Set(ALL.map(([, v]) => v))].filter(isHumanText);
  // With the table text of the other modules too (i18n/source.json), so a table value game.js shows unwrapped would show English.
  const tables = JSON.parse(read('i18n/source.json')).entries.map(e => e.msgid);
  const loaded = I.readCatalog(I.pseudoCatalog([...new Set([...entries, ...tables])], 'qps-ploc'), 'qps-ploc');
  assert.ok(loaded.catalog, loaded.error); assert.deepEqual(loaded.rejected, []);
  I.setLocale('qps-ploc', loaded.catalog, { preview: true });
  try {
    for (const [, v] of ALL) if (isHumanText(v) && /[A-Za-z]/.test(v.replace(/\{\w+\}/g, ''))) assert.notEqual(I.t(v), v, v);
    assert.equal(tf(GAME_TEXT.speech.line, { name: 'Bea', text: 'Hi.' }), I.pseudo('{name}: {text}').replace('{name}', 'Bea').replace('{text}', 'Hi.'));
    const long = [...new Set([...entries, ...tables])].filter(v => v.length > 12 && !/[{}%]/.test(v) && /\s/.test(v));
    // Every lookup the screens make is a msgid of the catalog: none is missing, and none is already pseudo text (looked up twice).
    const misses = new Set();
    I.onMiss((english, ctx) => misses.add(ctx ? `${ctx}\u0004${english}` : english));
    for (const [name, make, options] of CASES) {
      const drawn = renderScreens(GAME, make(), options).join('\n');
      assert.ok(drawn.includes('⟦'), name);
      const english = long.filter(v => drawn.includes(v));
      assert.deepEqual(english, [], `${name}: English that reached the screen`);
    }
    assert.deepEqual([...misses], [], 'a lookup the catalog lacks, or a second lookup of localized text');
  } finally { I.onMiss(null); I.setLocale('en'); }
});

test("the finale's not-ready notice: core.js blockMissingItems, each part through its template; English is blockMissing's join", () => {
  const base = initialState(), states = [base, { ...base, visited: ['bea', 'dez'] }, { ...base, visited: NEIGHBORS.map(n => n.id), celesteTalks: 1 },
    { ...base, mural: { [MOTIFS[0]]: 1 }, soundcheck: true }, { ...base, visited: NEIGHBORS.map(n => n.id), mural: Object.fromEntries(MOTIFS.map(id => [id, 1])) }];
  const toasts = state => renderScreens(GAME, state).filter(html => html.startsWith('toast:'));
  I.setLocale('en');
  for (const state of states) {
    assert.ok(!ready(state) && blockMissingItems(state).length > 0);
    assert.deepEqual(toasts(state), [`toast:${fmt(BLOCK_TEXT.almost, blockMissing(state))}`]);
  }
  const loaded = I.readCatalog(I.pseudoCatalog([BLOCK_TEXT.almost, BLOCK_TEXT.neighbors, BLOCK_TEXT.mural, BLOCK_TEXT.sound], 'qps-ploc'), 'qps-ploc');
  I.setLocale('qps-ploc', loaded.catalog, { preview: true });
  try {
    const [toast] = toasts(states[0]), parts = [I.pseudo(BLOCK_TEXT.neighbors).replace('%d', '0'), I.pseudo(BLOCK_TEXT.mural).replace('%d', '0'), I.pseudo(BLOCK_TEXT.sound)];
    assert.equal(toast, `toast:${I.pseudo(BLOCK_TEXT.almost).replace('%s', new Intl.ListFormat('en-US', { type: 'conjunction' }).format(parts))}`);
  } finally { I.setLocale('en'); }
});
