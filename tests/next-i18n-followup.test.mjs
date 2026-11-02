// The I2 follow-up (docs/I18N_PLAN.md, "I2: built"): a language switch redraws game.js's state-drawn chrome; the speech notice,
// the unticked beat word, the field guide's heading, the loading line and the portrait initials are looked up; the side stories'
// label caches follow the catalog, not just the locale code; homographs carry a context; a ratio stays one left-to-right run in
// RTL; and the extractor classes map chip names as chips. English output is unchanged throughout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as I from '../browser-next/i18n.js';
import { readSource, extract, lengthClass, CONTEXTS, FRAGMENTS, UNSHOWN, resolvePath, excludedTexts, linesText } from '../scripts/i18n.mjs';
import { speechNotice, BUBBLE_TEXT } from '../browser-next/bubble.js';
import { RHYTHM_TEXT, options as rhythmOptions, openCircle } from '../browser-next/rhythm.js';
import { chapterCard } from '../browser-next/story.js';
import { leadName, LEADS } from '../browser-next/visits/dogs.js';
import { PANEL_TEXT, panelHeader, rookMusicDetail, freshTalk, narrowLabel } from '../browser-next/characters.js';
import { createVisits } from '../browser-next/visits-ui.js';
import { createEpisodeScreens } from '../browser-next/visits-episodes.js';
import { createWorldVisits } from '../browser-next/visits-world.js';
import { initialState } from '../browser-next/core.js';
import { parseGodotSave } from '../browser-next/godot-save.js';
import { web as endingWeb } from '../browser-next/ending/text.js';
import { fakeDialog, visitsHost, openedEnvelope } from './next-fixtures.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const GAME = read('browser-next/game.js').replace(/\r\n/g, '\n'), HTML = read('browser-next/index.html').replace(/\r\n/g, '\n');
const ENTRIES = readSource().entries;
const pseudoRead = (code = 'qps-ploc', extra = null) => {
  const json = JSON.parse(I.pseudoCatalog(ENTRIES, code));
  const read_ = I.readCatalog(JSON.stringify(extra ? extra(json) : json), code);
  assert.ok(read_.catalog, read_.error);
  return read_.catalog;
};
const under = (code, catalog, fn) => { I.setLocale(code, catalog, { preview: true }); try { return fn(); } finally { I.setLocale('en'); } };
const stateOf = envelope => parseGodotSave(JSON.stringify(envelope), { initialState }).state;

// ------------------------------------------------------------------------------------------------ 1. a language switch redraws
// A top-level declaration of game.js (as tests/next-game-text.test.mjs reads them).
function declaration(lines, start) {
  const i = lines.findIndex(line => line.startsWith(start));
  assert.ok(i >= 0, start);
  let j = i + 1;
  while (j < lines.length && /^\s+\S/.test(lines[j])) j++;
  if (j < lines.length && /^[}\])]/.test(lines[j])) j++;
  return lines.slice(i, j).join('\n');
}
// game.js's imports, as the module sees them.
async function gameImports() {
  const scope = {};
  for (const m of GAME.matchAll(/^import \{([^}]*)\} from '(\.[^']+)';/gm)) {
    const mod = await import(new URL(m[2], pathToFileURL(fileURLToPath(new URL('../browser-next/game.js', import.meta.url)))).href);
    for (const part of m[1].split(',')) { const [name, alias] = part.trim().split(/\s+as\s+/); if (name) scope[alias ?? name] = mod[name]; }
  }
  return scope;
}
const DRAWN = ['function applyLocale(', 'function applyPageText(', 'function updateUI(', 'function soundUI(', 'function saveUI(', 'function saveText(', 'const saveReason', 'function chapterUI(',
  'function cameraUI(', 'function districtUI(', 'const stemsNow', 'const storyWorld', 'const PLACE_BY_ID', 'const SAVE_TEXT', 'const REFUSED_TEXT', 'const localeInfoPreview', 'const musicView'];
// game.js's page chrome over stand-in elements: applyLocale and everything it may draw run as game.js has them.
async function chrome() {
  const lines = GAME.split('\n'), els = new Map(), cards = [];
  const element = id => ({ id, textContent: '', innerHTML: '', hidden: false, disabled: false, style: {}, dataset: {}, attrs: {}, classList: { toggle() {}, add() {}, remove() {} },
    setAttribute(name, value) { this.attrs[name] = String(value); }, getAttribute(name) { return this.attrs[name] ?? null; }, hasAttribute(name) { return name in this.attrs; }, focus() {}, append() {}, remove() {}, closest: () => null, querySelectorAll: () => [] });
  const $ = selector => { if (!els.has(selector)) els.set(selector, element(selector)); return els.get(selector); };
  const music = { enabled: false, starting: false, fileName: '', error: '', update() {}, sketch: { mask: 0 } };
  const scope = {
    ...await gameImports(), $, music, state: stateOf(openedEnvelope({ save_seq: 2 })), held: false, storageAvailable: true, recovery: null, saveInfo: { status: 'loaded', reason: null, bytes: 0 },
    localeBooted: true, districtStatus: 'ready', world: { districtVisible: false, camera: { scale: 1, minimum: .5, maximum: 2, following: true, overviewMode: false }, bubble: null },
    document: { documentElement: { setAttribute() {}, removeAttribute() {} }, querySelectorAll: () => [], activeElement: null, title: '' }, PAGE_TITLE: 'Tenderloin Redux — A little room for good',
    body: { querySelector: selector => scope.cardOpen && selector === '[data-chapter-card] #begin' ? {} : null, insertAdjacentHTML() {} }, modal: { get open() { return scope.cardOpen; } }, cardOpen: false,
    notice: { textContent: '' }, toastTimeout: 0, chapterNotice: '', bubble: null, routeSpeech: null, innerWidth: 1200, Node: { TEXT_NODE: 3 },
    ending: { sync() {} }, rhythm: { sync() {}, musicChanged() {} }, visits: { sync() {}, entryHTML: () => '', bindEntry() {}, objectiveInputs: () => ({}) }, openConversation: () => null,
    bind() {}, goTo() {}, neighbors() {}, updateAfterglow() {}, queueChapterCard() {}, programmeEditor() {}, hostingScreen() {}, viewKeepsake() {}, clearTimeout() {},
    showChapterCard: startup => cards.push(startup),
  };
  const code = `${DRAWN.map(start => declaration(lines, start)).join('\n')}\nreturn { applyLocale, updateUI, cameraUI, districtUI };`;
  const fns = new Function('scope', `with (scope) { return (() => { ${code} })(); }`)(new Proxy(scope, { has: (target, key) => key in target, get: (target, key) => target[key], set: (target, key, value) => { target[key] = value; return true; } }));
  const shown = () => Object.fromEntries(['#tasks', '#progress-label', '#save-status', '#sound-heading', '#sound-caption', '#sound-disclosure', '#camera-status', '#district-state', '#chapter-text', '#open-gathering', '#neighbor-quote'].map(id => [id, $(id).textContent || $(id).innerHTML]));
  return { ...fns, shown, cards, scope };
}

test('a language switch redraws the field guide, the sound strip, the save line, the chapter line and the map controls', async () => {
  const page = await chrome();
  I.setLocale('en'); page.updateUI(); page.cameraUI(); page.districtUI();
  const english = page.shown();
  assert.match(english['#progress-label'], /^\d of 3 preparations$/);
  for (const [id, text] of Object.entries(english)) assert.ok(text, `${id} drawn in English`);
  const catalog = pseudoRead();
  try {
    I.setLocale('qps-ploc', catalog, { preview: true }); page.applyLocale();
    const pseudo = page.shown();
    for (const [id, text] of Object.entries(pseudo)) { assert.notEqual(text, english[id], `${id} redrawn`); assert.ok(text.includes('⟦'), `${id}: ${text.slice(0, 80)}`); }
    assert.deepEqual(page.cards, [], 'no startup card is open, so none is drawn');
    page.scope.cardOpen = true; page.applyLocale();
    assert.deepEqual(page.cards, [true], 'the open startup card is drawn again in the new language');
  } finally { I.setLocale('en'); }
  page.scope.cardOpen = false; page.applyLocale();
  assert.deepEqual(page.shown(), english, 'back in English: the same bytes as before the switch');
});
test('before the startup card, applyLocale redraws nothing (init draws the page once the locale is in)', async () => {
  const page = await chrome();
  page.scope.localeBooted = false;
  I.setLocale('en'); page.updateUI(); page.cameraUI(); page.districtUI();
  const english = page.shown();
  try { I.setLocale('qps-ploc', pseudoRead(), { preview: true }); page.applyLocale(); assert.deepEqual(page.shown(), english); } finally { I.setLocale('en'); }
});

// ------------------------------------------------------------------------------------------------ 2-4. strings now looked up
test('the speech notice is looked up and filled as one sentence; English is the old replace', () => {
  const panel = BUBBLE_TEXT.panel;
  assert.equal(speechNotice('', 'Hi there.', panel), 'Full dialogue in the conversation panel. Hi there.');
  assert.equal(speechNotice('Hi there. Full dialogue in the conversation panel.', 'Hi there.', panel), null);
  assert.equal(speechNotice('Bea: Hi there.', 'Hi there.', panel), 'Bea: Hi there. Full dialogue in the conversation panel.');
  const catalog = pseudoRead();
  under('qps-ploc', catalog, () => {
    const notice = I.pseudo(BUBBLE_TEXT.notice).replace('%s', I.L(panel));
    assert.equal(speechNotice('', 'Hi.', I.L(panel)), `${notice} Hi.`);
    assert.equal(speechNotice(`Hi. ${notice}`, 'Hi.', I.L(panel)), null, 'the localized notice is recognized as already said');
  });
});
test("hosting's unticked beat says the catalog's rest word, and Rhythm Circle's own rest is the same msgid", () => {
  const line = GAME.split('\n').find(l => l.includes("id === 'beats') activity ="));
  assert.ok(line.includes('t(RHYTHM_TEXT.rest)') && !line.includes("'rest'"), 'no inline rest');
  assert.equal(RHYTHM_TEXT.rest, 'rest');
  assert.ok(ENTRIES.some(e => e.msgid === 'rest' && !e.ctx));
});
test("index.html: the loading line, the field guide's heading and the district note are marked and extracted; English keeps its <br>", async () => {
  assert.match(HTML, /<span class="loading-star">✳<\/span> <span data-i18n>Finding our corner…<\/span><\/div>/);
  assert.match(HTML, /<h1 data-i18n-lines>Good things <br>start small\.<\/h1>/);
  assert.match(HTML, /<br><span data-i18n>City boundary · only part of the district is in this game\.<\/span><br>/);
  const msgids = new Set(ENTRIES.map(e => e.msgid));
  for (const text of ['Finding our corner…', 'Good things start small.', 'City boundary · only part of the district is in this game.']) assert.ok(msgids.has(text), text);
  assert.equal(linesText('Good things \nstart small.'), 'Good things start small.');
  // game.js: the heading is restored from its own markup in English and set as text in a locale, keyed as the extractor keys it.
  const page = GAME.slice(GAME.indexOf('function applyPageText('));
  assert.match(page, /node\.dataset\.i18nLinesEn \?\?= node\.innerHTML; node\.dataset\.i18nLinesText \?\?= node\.textContent\.replace\(\/\\s\+\/g, ' '\)\.trim\(\);/);
  assert.match(page, /if \(activeLocale\(\) === 'en'\) node\.innerHTML = node\.dataset\.i18nLinesEn; else node\.textContent = t\(node\.dataset\.i18nLinesText\);/);
});
test("a portrait's initial is the first grapheme of the name as shown; English is name[0]", async () => {
  const lines = GAME.split('\n');
  const initial = new Function('t', 'escapeHTML', `${declaration(lines, 'const GRAPHEMES')}\n${declaration(lines, 'function initial(')}\nreturn initial;`)(I.t, I.escapeHTML);
  for (const name of ['Bea', 'Celeste', 'Dez', 'Rook', 'Thanh']) assert.equal(initial(name), name[0]);
  assert.equal((GAME.match(/\$\{initial\(n\.name\)\}/g) || []).length, 2);
  assert.doesNotMatch(GAME, /n\.name\[0\]/);
  const catalog = I.readCatalog(JSON.stringify({ format: 1, locale: 'th', messages: { Thanh: 'ถั่นห์', Bea: 'บี', Dez: 'เดซ' } }), 'th').catalog;
  under('th', catalog, () => {
    assert.equal(initial('Thanh'), 'ถั่', 'a Thai base letter keeps its marks (one grapheme)');
    assert.equal(initial('Bea'), 'บี');
    assert.equal(initial('Dez'), 'เ', 'a leading vowel is its own grapheme');
    assert.equal(initial('Rook'), 'R', 'an untranslated name keeps its letter');
  });
});

// ------------------------------------------------------------------------------------------------ 6. caches follow the catalog
test('a reload of the same locale with a new catalog redraws the neighborhood labels and the scene', () => {
  const museum = 'Living Archive Museum';
  const { host } = visitsHost(fakeDialog());
  const visits = createVisits(host, { createEpisodeScreens, createWorldVisits });
  const nameOf = () => visits.objects({ camera: {} }).find(o => o.id === 'museum')?.name;
  const first = pseudoRead(), second = pseudoRead('qps-ploc', json => ({ ...json, messages: Object.fromEntries(Object.entries(json.messages).map(([k, v]) => [k, `${v}²`])) }));
  try {
    I.setLocale('qps-ploc', first, { preview: true });
    const a = nameOf(), parkA = visits.scene().park.label;
    assert.ok(a.includes('⟦') && !a.endsWith('²'), a);
    I.setLocale('qps-ploc', second, { preview: true });
    const b = nameOf(), parkB = visits.scene().park.label;
    assert.equal(b, `${a}²`, 'the second catalog of the same code shows');
    assert.equal(parkB, `${parkA}²`, 'the scene part too');
    assert.ok(museum && I.localeKey() !== 'qps-ploc');
  } finally { I.setLocale('en'); }
  assert.equal(I.localeKey(), 'en');
});
test('localeKey: English is "en"; each catalog, and each address form, is its own key', () => {
  I.setLocale('en');
  assert.equal(I.localeKey(), 'en');
  const make = () => I.readCatalog(JSON.stringify({ format: 1, locale: 'ar', messages: {} }), 'ar').catalog, a = make(), b = make();
  try {
    I.setLocale('ar', a); const ka = I.localeKey();
    I.setLocale('ar', b); const kb = I.localeKey();
    assert.notEqual(ka, kb); assert.match(ka, /^ar#\d+$/);
    I.setAddressForm('f'); assert.equal(I.localeKey(), `${kb}/f`);
  } finally { I.setAddressForm(null); I.setLocale('en'); }
});

// ------------------------------------------------------------------------------------------------ 7. contexts for homographs
test('homographs carry their context: extracted as context entries, passed at each call site, English unchanged', async () => {
  const keyed = ENTRIES.filter(e => e.ctx);
  assert.deepEqual(keyed.map(e => e.ctx).sort(), [...CONTEXTS].sort());
  for (const ctx of CONTEXTS) {
    const at = await resolvePath(ctx, module => import(new URL(`../browser-next/${module}`, import.meta.url).href));
    assert.ok(at, ctx);
    assert.ok(keyed.some(e => e.ctx === ctx && e.msgid === at.parent[at.key]), ctx);
  }
  // Each context name is passed at its call site, in the fork's code.
  const code = ['rhythm.js', 'story.js', 'visits/dogs.js', 'ending/gather-again.js', 'characters.js'].map(f => read(`browser-next/${f}`)).join('\n');
  for (const ctx of CONTEXTS) assert.ok(code.includes(`'${ctx}'`), ctx);
  // The plain msgid of the other meaning stays.
  for (const word of ['Complete', 'Gathering', 'Continue', 'Previous']) assert.ok(ENTRIES.some(e => e.msgid === word && !e.ctx), word);
  // English: the same labels.
  const opened = stateOf(openedEnvelope());
  assert.equal(chapterCard(opened, {}).button, 'Continue');
  assert.deepEqual([0, 1, 2].map(leadName), LEADS);
  assert.equal(rhythmOptions(openCircle(opened).session ?? { practice: false }, {}).find(o => o.id === 'complete')?.label, RHYTHM_TEXT.complete);
  // A locale tells them apart.
  const extra = json => ({ ...json, messages: { ...json.messages, Complete: 'Completo', Continue: 'Seguir', Gathering: 'La reunión' }, context: { ...json.context, 'rhythm.RHYTHM_TEXT.complete': { Complete: 'Terminar' }, 'story.GODOT_TEMPLATES.show_story_card.resume': { Continue: 'Continuar' }, 'visits.dogs.LEADS[2]': { Gathering: 'El encuentro' }, 'characters.PANEL_TEXT.scReady': { Ready: 'Lista' }, 'characters.PANEL_TEXT.playing': { Playing: 'Sonando' } } });
  const catalog = I.readCatalog(JSON.stringify(extra(JSON.parse(I.pseudoCatalog(ENTRIES, 'qps-ploc')))), 'qps-ploc').catalog;
  under('qps-ploc', catalog, () => {
    assert.equal(chapterCard(opened, {}).button, 'Continuar');
    assert.equal(I.L('Continue'), 'Seguir');
    assert.equal(leadName(2), 'El encuentro');
    assert.equal(rhythmOptions({ practice: false }, {}).find(o => o.id === 'complete').label, 'Terminar');
    const header = panelHeader({ ...opened, soundcheck: true }, {}, { ...freshTalk(), rook: 1 }, 'rook', { music: { playing: true, mode: 'sketch' } });
    assert.ok(header.includes('Lista') && header.includes('Sonando'), header);
    assert.ok(rookMusicDetail({ ...opened, soundcheck: true }, 'Hi.', {}).includes('Lista'));
  });
});
test('the ship gate and coverage count context entries', async () => {
  const { buildManifest } = await import('../scripts/i18n.mjs');
  assert.equal(typeof buildManifest, 'function');
  const script = read('scripts/i18n.mjs');
  assert.match(script, /const missing = source\.entries\.filter\(e => \(e\.ctx \? read\.catalog\.context\(e\.ctx, e\.msgid\) : read\.catalog\.message\(e\.msgid\)\) === undefined\)/);
  assert.match(script, /const total = source\.entries\.length \|\| 1/);
});

// ------------------------------------------------------------------------------------------------ 8. ratios under RTL
test('under RTL a ratio is one left-to-right isolate with bare numbers, so 1/3 does not read 3/1; other values stay isolated', () => {
  const story = { ...I.FLAVORS.story, legacy: (template, args) => template };
  const named = { ...I.FLAVORS.named, legacy: (template, args) => template };
  const catalog = I.readCatalog(JSON.stringify({ format: 1, locale: 'qps-rtl', messages: { 'Met %d/%d': 'التقى %d/%d', 'Turn %d/5': 'دور %d/5', '%s: %d/%d': '%s: %d/%d', 'Mural {placed}/3': 'جدارية {placed}/3', 'Volume: %d%%': 'الصوت: %d%%', '%d/%d Surprises': '%2$d/%1$d مفاجآت' } }), 'qps-rtl').catalog;
  const LRI = '⁦', FSI = '⁨', PDI = '⁩';
  under('qps-rtl', catalog, () => {
    assert.equal(I.format('Met %d/%d', [1, 3], story), `التقى ${LRI}1/3${PDI}`);
    assert.equal(I.format('Turn %d/5', [2], story), `دور ${LRI}2/5${PDI}`);
    assert.equal(I.format('%s: %d/%d', ['Bea', 1, 2], story), `${FSI}Bea${PDI}: ${LRI}1/2${PDI}`);
    assert.equal(I.format('Mural {placed}/3', [{ placed: 2 }], named), `جدارية ${LRI}2/3${PDI}`);
    assert.equal(I.format('Volume: %d%%', [70], { ...I.FLAVORS.characters, legacy: t => t }), `الصوت: ${FSI}70${PDI}%`);
    assert.equal(I.format('%d/%d Surprises', [1, 4], story), `${LRI}4/1${PDI} مفاجآت`, 'positional arguments keep their positions');
    // UAX #9: the slash is a common separator; between two European numbers with nothing else around it (W4) it joins them,
    // and an LRI run lays them out left to right inside the right-to-left paragraph. No isolate initiator sits beside the slash.
    for (const out of [I.format('Met %d/%d', [1, 3], story), I.format('Turn %d/5', [2], story)]) assert.doesNotMatch(out, /[⁦-⁩]\/|\/[⁦-⁩]/);
  });
  // A left-to-right locale and English are unchanged.
  under('qps-ploc', I.readCatalog(JSON.stringify({ format: 1, locale: 'qps-ploc', messages: { 'Met %d/%d': 'Ḿét %d/%d' } }), 'qps-ploc').catalog, () => assert.equal(I.format('Met %d/%d', [1, 3], story), 'Ḿét 1/3'));
  assert.equal(I.format('Met %d/%d', [1, 3], { ...story, legacy: (t, [a, b]) => `Met ${a}/${b}` }), 'Met 1/3');
});
test("a narrow label's ratio is one run too (characters.js fills narrow variants as format fills a translation)", () => {
  const catalog = I.readCatalog(JSON.stringify({ format: 1, locale: 'qps-rtl', messages: { 'Spot Surprise (%d/%d)': 'ابحث (%d/%d)' }, narrow: { 'Spot Surprise (%d/%d)': 'ابحث %d/%d' } }), 'qps-rtl').catalog;
  under('qps-rtl', catalog, () => assert.equal(narrowLabel('ignored', 'Spot Surprise (%d/%d)', [2, 5]), 'ابحث ⁦2/5⁩'));
});

// ------------------------------------------------------------------------------------------------ 9. the chip length class
test('the extractor classes the names drawn as map chips as chip, and nothing else', async () => {
  assert.equal(lengthClass('Bea', ['characters.CHARACTER_PEOPLE[0].name', 'story.NEIGHBOR_NAMES.bea']), 'chip');
  assert.equal(lengthClass('Neighbor-made mural', ['world.PLACES[1].name']), 'chip');
  assert.equal(lengthClass('Black Hawk history stop', ['history.BLACK_HAWK.name', 'world.PLACES[2].name']), 'chip');
  assert.equal(lengthClass('The one with the plan', ['characters.CHARACTER_PEOPLE[0].role', 'world.NEIGHBORS[0].role']), 'sentence', 'a role is no chip');
  assert.equal(lengthClass('Go Meet %s', ['characters.ACTION_LABELS.meet']), 'button', 'a button stays a button');
  const chips = ENTRIES.filter(e => e.length === 'chip').map(e => e.msgid).sort();
  assert.deepEqual(chips, ['A corner with a history', 'Bea', 'Black Hawk history stop', 'Celeste', 'Dez', 'Gathering layout', 'Neighbor-made mural', 'Rook', 'Thanh']);
});

// ------------------------------------------------------------------------------------------------ 5. fragments
test('FRAGMENTS and UNSHOWN name table strings; a fragment is inside a composite msgid; neither is extracted at its path', async () => {
  const load = module => import(new URL(`../browser-next/${module}`, import.meta.url).href), msgids = ENTRIES.map(e => e.msgid);
  for (const printed of [...FRAGMENTS, ...Object.keys(UNSHOWN)]) assert.ok(await resolvePath(printed, load), printed);
  assert.equal(new Set(FRAGMENTS).size, FRAGMENTS.length, 'no duplicate');
  for (const printed of FRAGMENTS) {
    // As Godot has it, or as the 2D edition words it (ending/text.js web, which a composite may apply to its fragment).
    const at = await resolvePath(printed, load), text = at.parent[at.key];
    const inside = value => value.split(/%[sd]|\n/).map(s => s.trim()).filter(s => s.length > 1).every(piece => msgids.some(m => m.includes(piece)));
    assert.ok(inside(text) || inside(endingWeb(text)), `${printed}: ${JSON.stringify(text).slice(0, 60)} is inside a composite`);
  }
  for (const entry of ENTRIES) for (const path of entry.paths) assert.ok(!FRAGMENTS.includes(path) && !Object.hasOwn(UNSHOWN, path), path);
  assert.ok((await excludedTexts()).size > 150);
  // The extractor on the tree is the source (the catalogs test checks the bytes): FRAGMENTS shrank it.
  assert.equal((await extract()).count, ENTRIES.length);
});

test('the new test file is LF', () => {
  assert.doesNotMatch(readFileSync(new URL(import.meta.url), 'utf8'), /\r/);
});
