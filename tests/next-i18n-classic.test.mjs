// I2c (docs/I18N_PLAN.md section 6): the modules derived from classic put their text through the catalog.
// - English identity: with no locale, every output equals the classic module's (public/, the frozen source these were copied
//   from) or, where the fork changed the code (gathering.js, soundtrack.js, core.js), a digest of the bd865bc output.
// - Pseudo coverage: under qps-ploc every string these modules show is looked up, is declared in a table or the extractor's
//   source, passes the validator, and nothing English reaches the output.
// - The SVG images take a locale's font families and direction; the defaults are today's bytes.
// - Logic never reads shown text: programmeIssue stays truthy, and the reducers act the same in a locale.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as I from '../browser-next/i18n.js';
import * as core from '../browser-next/core.js';
import * as keepsake from '../browser-next/keepsake.js';
import * as gathering from '../browser-next/gathering.js';
import * as programme from '../browser-next/programme.js';
import * as hosting from '../browser-next/hosting.js';
import * as civic from '../browser-next/civic.js';
import * as film from '../browser-next/film.js';
import * as voices from '../browser-next/experiments/neighborhood-voices.js';
import { Soundtrack, SOUNDTRACK_TEXT } from '../browser-next/soundtrack.js';
import { parseGodotSave } from '../browser-next/godot-save.js';
import * as classicKeepsake from '../public/keepsake.js';
import * as classicGathering from '../public/gathering.js';
import * as classicProgramme from '../public/programme.js';
import * as classicHosting from '../public/hosting.js';
import * as classicCivic from '../public/civic.js';
import * as classicFilm from '../public/film.js';
import * as classicVoices from '../public/experiments/neighborhood-voices.js';
import { Soundtrack as ClassicSoundtrack } from '../public/soundtrack.js';
import { godotEnvelope, openedEnvelope, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope, EDITED_PARTIAL_ART, GODOT_WRITTEN, FULL_MURAL, PUBLISHED, raw } from './next-fixtures.mjs';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const permutations = items => items.length <= 1 ? [items] : items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [x, ...rest]));
const subsets = items => items.reduce((all, x) => [...all, ...all.map(s => [...s, x])], [[]]);
const product = (...lists) => lists.reduce((acc, list) => acc.flatMap(a => list.map(b => [...a, b])), [[]]);

// ---------------------------------------------------------------------------------------------------------------------------
// The input matrices: every enum the functions branch on, plus real fork states parsed from the Godot fixtures.
const ORDERS = [...permutations(['stories', 'beats', 'art', 'pause']), [], ['stories'], ['stories', 'beats', 'art'], ['stories', 'stories', 'beats', 'art'], ['stories', 'beats', 'art', 'zzz'], null, 'stories'];
const PEOPLE = ['bea', 'dez', 'celeste', 'thanh', 'rook', 'imani', ''];
const FIXTURE_STATES = [godotEnvelope(), openedEnvelope(), openedEnvelope({ gathering_layout: 'floor' }), hostedEnvelope(), civicDoneEnvelope(), filmDoneEnvelope(), JSON.parse(EDITED_PARTIAL_ART), JSON.parse(GODOT_WRITTEN.fullRun)]
  .map(envelope => parseGodotSave(raw(envelope), { initialState: core.initialState }).state);
for (const s of FIXTURE_STATES) assert.ok(s && s.programme, 'every fixture parses');

const PLANS = product(['repairs', 'access'], ['circle', 'dropin'], ['themes', 'none']).map(([topic, format, notes]) => ({ topic, format, notes }));
const FILM_PLANS = product(['close', 'wide'], ['quiet', 'later'], permutations(['seat', 'paint', 'welcome'])).map(([framing, plan, order]) => ({ framing, plan, order }));
const ART = product(['warm', 'cool'], [[0, 1, 2, 2, 1, 0], [2, 2, 2, 0, 0, 0]]).map(([palette, tiles]) => ({ palette, tiles }));
const RESULTS = [
  ...['memory', 'future'].map(value => ({ id: 'stories', value })),
  ...Array.from({ length: 256 }, (_, value) => ({ id: 'beats', value })),
  ...ART.map(value => ({ id: 'art', value })),
  ...['arc', 'pairs'].map(value => ({ id: 'pause', value })),
];
const VALUES = { stories: ['memory', 'future'], beats: [0, 85], art: ART.slice(0, 2), pause: ['arc', 'pairs'] };
function hosts() {
  const out = [{ order: [], results: [] }, null];
  for (const order of [PUBLISHED, ['beats', 'pause', 'stories', 'art']]) for (let k = 0; k <= 4; k++) for (const pick of product(...order.slice(0, k).map(id => VALUES[id].map(v => [id, v])))) out.push({ order, results: pick.map(([id, value]) => ({ id, value })) });
  return [...out, ...FIXTURE_STATES.map(s => s.hosting)];
}
const SPOTS = { table: { table: { col: 3, row: 3 }, seats: { col: 3, row: 1 }, speaker: { col: 6, row: 0 } }, floor: { table: { col: 0, row: 3 }, seats: { col: 0, row: 0 }, speaker: { col: 6, row: 0 } } };
// The same matrix produced the golden digest from the bd865bc modules.
function gatheringStates() {
  const states = [];
  const returns = [[], ['table'], ['speaker'], ['table', 'speaker'], ['paint-case'], ['table', 'speaker', 'paint-case'], ['table', 'seats', 'speaker', 'paint-case']];
  for (const layout of [null, 'table', 'floor']) {
    const spots = SPOTS[layout ?? 'table'];
    const furnitures = [{}, { table: spots.table }, { seats: spots.seats }, { speaker: spots.speaker }, { ...spots }, { table: { col: 9, row: 9 } }];
    for (const furniture of furnitures) for (const opened of [false, true]) {
      states.push({ layout, furniture, opened, epilogue: { packing: false, returned: [] } });
      if (opened) for (const returned of returns) states.push({ layout, furniture, opened, epilogue: { packing: true, returned } });
    }
  }
  return states;
}
const PHOTOS = [
  ...product(['table', 'floor'], subsets(core.PHOTO_GUESTS).filter(s => s.length), core.PALETTES).map(([layout, participants, palette]) => ({ status: 'taken', layout, participants, palette, mural: FULL_MURAL })),
  { status: 'unasked' }, { status: 'taken', layout: 'table', participants: ['rook'], palette: 'garden', mural: FULL_MURAL }, { status: 'taken', layout: 'table', participants: ['bea'], palette: 'garden', mural: {} },
  ...FIXTURE_STATES.map(s => s.epilogue.photo),
];

// Each module's shown text over its matrix. M is the module (this fork's, or classic's); opts are SVG options.
const render = {
  keepsake: (M, opts) => PHOTOS.map(p => M.postcardSVG(p, opts)),
  programme: (M, opts) => [...ORDERS, ...FIXTURE_STATES.map(s => s.programme.published)].flatMap(order => [M.programmeIssue(order), M.programmeTitle(order), M.programmeSVG(order, opts), ...PEOPLE.map(id => M.programmeResponse(id, order))]),
  hosting: (M, opts) => [...RESULTS.map(r => M.activitySummary(r)), ...hosts().flatMap(host => PEOPLE.map(id => M.hostingResponse(id, host))), ...ART.map(art => M.tilePanelSVG(art, opts)), M.tilePanelSVG({ palette: 'warm', tiles: [9] }, opts)],
  civic: (M, opts) => [...PLANS, { topic: 'x' }, null].flatMap(plan => [M.civicConversation(plan).map(v => `${v.name}: ${v.text}`).join('\n'), M.civicPlanSVG(plan, opts), ...(plan?.format ? PEOPLE.map(id => M.civicResponse(id, { phase: 'done', result: plan })) : []), M.civicResponse('bea', { phase: 'meeting', result: plan })])
    .concat(FIXTURE_STATES.flatMap(s => PEOPLE.map(id => M.civicResponse(id, s.civic)))),
  film: (M, opts) => [...FILM_PLANS, { framing: 'x' }].flatMap(plan => ['seat', 'paint', 'welcome', 'zzz'].flatMap(id => [M.filmCaption(plan, id), M.filmFrameSVG(plan, id, opts)]).concat(PEOPLE.map(id => plan.framing === 'x' ? '' : M.filmResponse(id, { phase: 'done', result: plan }))))
    .concat(FIXTURE_STATES.flatMap(s => PEOPLE.map(id => M.filmResponse(id, s.film)))),
  gathering: (M, opts) => [...gatheringStates(), ...FIXTURE_STATES].map(s => { const sc = gathering.gatheringScene(s); return [sc.title, sc.caption, sc.items.map(i => i.label).join('|'), M.gatheringPlanSVG(sc, opts)].join('\n'); }),
};
const FORK = { keepsake, programme, hosting, civic, film, gathering };
const CLASSIC = { keepsake: classicKeepsake, programme: classicProgramme, hosting: classicHosting, civic: classicCivic, film: classicFilm, gathering: classicGathering };

// The Neighborhood Voices cards, rendered through a stand-in scope, fetch and document.
const VOICES_JSON = readFileSync(new URL('../browser-next/experiments/neighborhood-voices.json', import.meta.url));
async function voicesHTML(module) {
  const saved = { fetch: globalThis.fetch, document: globalThis.document };
  globalThis.fetch = async () => new Response(VOICES_JSON);
  globalThis.document = { getElementById: () => ({ addEventListener() {}, removeEventListener() {} }) };
  try {
    let html = '';
    const scope = { signal: new AbortController().signal, active: () => true, own: () => () => {}, listen: () => () => {}, present: h => { html = h; }, close() {}, disable() {} };
    (await module.activate(scope)).open();
    return html;
  } finally { globalThis.fetch = saved.fetch; globalThis.document = saved.document; }
}

// The soundtrack's four messages, provoked through stand-ins.
async function soundtrackMessages(Kind) {
  const audio = (play = () => Promise.resolve()) => ({ paused: true, handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; }, play, pause() { this.paused = true; }, removeAttribute() {}, load() {} });
  const sketch = start => ({ enabled: false, starting: false, start, stop() {}, setVolume() {}, update() {}, dispose() {} });
  const urls = { createObjectURL: f => `blob:${f.name}`, revokeObjectURL() {} };
  const out = [];
  const a = new Kind({ sketch: sketch(() => Promise.resolve(true)), urls, makeAudio: () => audio(), hidden: () => false });
  try { a.loadFile({ name: 'film.mp4', size: 10 }); } catch (error) { out.push(error.message); }
  const b = new Kind({ sketch: sketch(() => Promise.resolve(false)), urls, makeAudio: () => audio(), hidden: () => false });
  await b.start(); out.push(b.error);
  const c = new Kind({ sketch: sketch(() => Promise.resolve(true)), urls, makeAudio: () => audio(), hidden: () => false });
  c.loadFile({ name: 'a.mp3', size: 10 }); c.audio.handlers.error(); out.push(c.error);
  const d = new Kind({ sketch: sketch(() => Promise.resolve(true)), urls, makeAudio: () => audio(() => Promise.reject(Error('blocked'))), hidden: () => false });
  d.loadFile({ name: 'a.mp3', size: 10 }); await d.start(); out.push(d.error);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------
test('English: every output equals the classic module it was copied from, over the whole matrix', async () => {
  I.setLocale('en');
  for (const name of Object.keys(render)) {
    const fork = render[name](FORK[name], undefined), classic = render[name](CLASSIC[name], undefined);
    assert.ok(fork.length > 20, name);
    assert.equal(fork.length, classic.length, name);
    for (let i = 0; i < fork.length; i++) assert.equal(fork[i], classic[i], `${name} #${i}`);
  }
  assert.equal(await voicesHTML(voices), await voicesHTML(classicVoices));
  assert.deepEqual(await soundtrackMessages(Soundtrack), await soundtrackMessages(ClassicSoundtrack));
  assert.deepEqual(await soundtrackMessages(Soundtrack), [SOUNDTRACK_TEXT.choose, SOUNDTRACK_TEXT.unavailable, SOUNDTRACK_TEXT.decode, SOUNDTRACK_TEXT.playback]);
  // The prototype ids classic answered with a function now answer with nothing.
  assert.equal(programme.programmeResponse('constructor', PUBLISHED), '');
});

test('English: gatheringScene and blockMissing equal the bd865bc output (digests), and every caption branch is covered', () => {
  I.setLocale('en');
  const scenes = gatheringStates().map(s => { const sc = gathering.gatheringScene(s); return [sc.title, sc.caption, sc.phase, sc.items.map(i => [i.id, i.label]), gathering.gatheringPlanSVG(sc)]; });
  assert.equal(scenes.length, 162);
  assert.equal(sha(scenes), '30b7c1e459c187e08128b9712ff1b72f0c0b24be15d2aee4f5479de1c06215cd');
  assert.deepEqual(new Set(scenes.map(s => s[1])), new Set(Object.values(gathering.GATHERING_TEXT.captions)), 'all seven captions');
  const blocks = [];
  for (let met = 0; met <= 5; met++) for (let placed = 0; placed <= 3; placed++) for (const soundcheck of [false, true]) blocks.push(core.blockMissing({ visited: ['bea', 'celeste', 'dez', 'rook', 'thanh'].slice(0, met), mural: Object.fromEntries(core.MOTIFS.slice(0, placed).map(id => [id, { col: 0, row: 0 }])), soundcheck }));
  assert.equal(sha(blocks), 'fa3eb1691672832d9f0bcf041483a255c86afaacf5202d07c4c5573c8c3dc7d0');
});

test('blockMissingItems: the parts of blockMissing as data, joined they are blockMissing', () => {
  for (let met = 0; met <= 5; met++) for (let placed = 0; placed <= 3; placed++) for (const soundcheck of [false, true]) {
    const state = { visited: ['bea', 'celeste', 'dez', 'rook', 'thanh'].slice(0, met), mural: Object.fromEntries(core.MOTIFS.slice(0, placed).map(id => [id, { col: 0, row: 0 }])), soundcheck };
    const items = core.blockMissingItems(state);
    const english = items.map(item => 'count' in item ? item.template.replace('%d', item.count) : item.template);
    assert.equal(english.length ? english.join(', ') : core.BLOCK_TEXT.ready, core.blockMissing(state), `${met} ${placed} ${soundcheck}`);
    assert.equal(items.length === 0, met === 5 && placed === 3 && soundcheck);
    assert.deepEqual(items.map(i => i.id), [met < 5 && 'neighbors', placed < 3 && 'mural', !soundcheck && 'sound'].filter(Boolean));
    for (const item of items) assert.ok(Object.values(core.BLOCK_TEXT).includes(item.template));
  }
});

test('English: the whole-sentence entries equal the sentences classic composed', () => {
  // The cases that once lowercased a label, inserted a palette id or an ordinal, or joined an opening to a shared tail.
  const P = programme.PROGRAMME_TEXT.responses, H = hosting.HOSTING_TEXT, F = film.FILM_TEXT.responses.dez;
  ['first', 'second', 'third', 'fourth'].forEach((ordinal, i) => {
    assert.equal(P.celeste[i], `“Our panel is ${ordinal}. I’ll bring shapes people can arrange together. The programme is something we made together too.”`);
    assert.equal(P.thanh[i], `“The quiet interval is ${ordinal}. I like seeing a pause treated as part of the afternoon.”`);
  });
  for (const s of programme.SEGMENTS) assert.equal(H.responses.waiting[s.id], `“Our ${s.name.toLowerCase()} is in the running order. Come back to the gathering whenever you’re ready.”`);
  for (const [id, label] of Object.entries(hosting.QUIET_CHOICES)) assert.equal(H.summaries.pause[id], `Thanh arranged ${label.toLowerCase()}, keeping the through-route open. People could sit, stay standing or leave.`);
  for (const palette of Object.keys(hosting.TILE_PALETTES)) {
    assert.equal(H.summaries.art[palette], `Celeste’s six-tile portable panel uses the ${palette} palette. The six neighbor-prepared tiles became something shared.`);
    assert.equal(H.responses.art[palette], `“Our ${palette} panel came out of everyone’s shapes. Look for it beside our first mural.”`);
    assert.equal(H.panel.desc[palette], `Original abstract neighbor-made panel, ${palette} palette. Tiles numbered left to right, top to bottom.`);
  }
  for (const [id, shot] of Object.entries(film.FILM_SHOTS)) assert.equal(F[id], `“We ended on ${shot.label.toLowerCase()}. A different order would tell a different little story.”`);
});

// ---------------------------------------------------------------------------------------------------------------------------
// The pseudo-locale. Pass 1, with an empty catalog, records every key the modules look up; pass 2 renders with the pseudo
// catalog of those keys.
const RECORDS = JSON.parse(VOICES_JSON).records;
async function renderAll() {
  const out = [];
  for (const name of Object.keys(render)) out.push(...render[name](FORK[name], undefined).map(text => [name, text]));
  out.push(['voices', await voicesHTML(voices)]);
  out.push(...(await soundtrackMessages(Soundtrack)).map(text => ['soundtrack', text]));
  for (const id of ['stories', 'beats', 'art', 'pause']) out.push(['hosting', hosting.activitySummary({ id, value: id === 'beats' ? 0 : id === 'art' ? ART[0] : id === 'stories' ? 'memory' : 'arc' })]);
  return out;
}
const catalogOf = (code, json) => { const read = I.readCatalog(json, code); assert.ok(read.catalog, read.error); return read; };
async function underLocale(code, catalog, fn) {
  const misses = [];
  I.setLocale(code, catalog, { preview: true }); I.onMiss((english, ctx) => misses.push(ctx ? `${ctx}\u0004${english}` : english));
  try { return { value: await fn(), misses }; } finally { I.onMiss(null); I.setLocale('en'); }
}
// Every string leaf of a table.
const leaves = (value, out = []) => { if (typeof value === 'string') out.push(value); else if (value && typeof value === 'object') Object.values(value).forEach(v => leaves(v, out)); return out; };
const TABLES = [keepsake.KEEPSAKE_TEXT, gathering.GATHERING_TEXT, programme.PROGRAMME_TEXT, hosting.HOSTING_TEXT, civic.CIVIC_TEXT, film.FILM_TEXT, SOUNDTRACK_TEXT, voices.VOICES_TEXT];
// Text that stays English in every locale: organization names, source titles, the mural sign, the checked date and URLs.
const KEPT = [...RECORDS.flatMap(r => [r.name, r.sourceTitle, r.url]), 'RISE', '2026-10-18'].sort((a, b) => b.length - a.length);
// The pseudo-locales format lists with en-US Intl.ListFormat ("a, b, and c"); a real locale's list is in its own language.
const LIST_WORD = / and (?=⁨|\S)/g;
const visible = text => text.replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|apos|#39);/g, ' ');

test('pseudo-locale: every shown string is looked up, declared, valid, and nothing English reaches the output', async () => {
  const empty = catalogOf('qps-ploc', JSON.stringify({ format: 1, locale: 'qps-ploc', messages: {} })).catalog;
  const first = await underLocale('qps-ploc', empty, renderAll);
  const keys = [...new Set(first.misses)];
  // Declared: a msgid of the extractor's source, which registers these modules' tables (classic tables, names, the
  // Neighborhood Voices records), so a translator sees every looked-up key.
  const declared = new Set(JSON.parse(readFileSync(new URL('../i18n/source.json', import.meta.url), 'utf8')).entries.map(e => e.msgid));
  assert.deepEqual(keys.filter(key => !declared.has(key)), [], 'every looked-up key is declared');
  // Every string of the new tables is looked up somewhere in the matrix (no dead entries).
  assert.deepEqual(TABLES.flatMap(table => leaves(table)).filter(s => !keys.includes(s)), [], 'every table entry is shown');
  assert.ok(keys.length > 120, `${keys.length} keys`);
  const read = catalogOf('qps-ploc', I.pseudoCatalog(keys, 'qps-ploc'));
  assert.deepEqual(read.rejected, [], 'the validator accepts the pseudo translation of every key');
  const second = await underLocale('qps-ploc', read.catalog, renderAll);
  assert.deepEqual(second.misses, [], 'nothing falls back');
  const leaks = [];
  for (const [name, text] of second.value) {
    let rest = visible(text).replace(LIST_WORD, ' ');
    for (const kept of KEPT) rest = rest.split(kept).join(' ');
    const english = rest.match(/[A-Za-z]{2,}/g);
    if (english) leaks.push(`${name}: ${english.slice(0, 6).join(' ')} in ${text.slice(0, 120)}`);
  }
  assert.deepEqual(leaks.slice(0, 10), [], 'no English outside the kept proper nouns');
  // Back in English, the output is the English again.
  const again = await renderAll(), before = (await underLocale('en', null, renderAll)).value;
  assert.deepEqual(again, before);
});

test('pseudo-locale: Neighborhood Voices marks the English source titles; English has no marks', async () => {
  const keys = [...new Set((await underLocale('qps-ploc', catalogOf('qps-ploc', JSON.stringify({ format: 1, locale: 'qps-ploc', messages: {} })).catalog, () => voicesHTML(voices))).misses)];
  const { value: html } = await underLocale('qps-ploc', catalogOf('qps-ploc', I.pseudoCatalog(keys, 'qps-ploc')).catalog, () => voicesHTML(voices));
  for (const r of RECORDS) {
    assert.ok(html.includes(`<span lang="en">${r.sourceTitle}</span> ${I.pseudo(voices.VOICES_TEXT.inEnglish)} ↗`), r.id);
    assert.ok(html.includes(`<h3>${r.name}</h3>`), 'names stay as they are');
    assert.ok(html.includes(I.pseudo(r.summary)) && html.includes(I.pseudo(r.topic)), 'topic and summary are looked up by their English value');
  }
  assert.equal(html.match(/hreflang="en"/g).length, 3);
  const english = await voicesHTML(voices);
  assert.ok(!english.includes('lang="en"') && !english.includes('hreflang'));
});

test('pseudo-RTL: the arguments of composed sentences are isolated, the sentence stays whole', async () => {
  const keys = ['Bea invited: {invitation}. Telling a story and listening were equally welcome.', hosting.STORY_CHOICES.memory, 'Dez shared an eight-step visual rhythm with taps on {steps}. Joining in was optional.'];
  const { value } = await underLocale('qps-rtl', catalogOf('qps-rtl', I.pseudoCatalog(keys, 'qps-rtl')).catalog, () => [hosting.activitySummary({ id: 'stories', value: 'memory' }), hosting.activitySummary({ id: 'beats', value: 5 })]);
  assert.ok(value[0].includes(`⁨${I.pseudo(hosting.STORY_CHOICES.memory, { rtl: true })}⁩`), value[0]);
  assert.ok(value[1].includes('⁨1⁩') && value[1].includes('⁨3⁩'), 'each step is isolated in the list');
  assert.ok(!/[A-Za-z]{2,}/.test(value.join(' ').replace(LIST_WORD, ' ')), value.join(' '));
});

// ---------------------------------------------------------------------------------------------------------------------------
test('SVG images: a locale passes its font families and direction; the defaults are today\'s bytes', () => {
  I.setLocale('en');
  const photo = PHOTOS[0], order = PUBLISHED, plan = PLANS[0], shot = FILM_PLANS[0], scene = gathering.gatheringScene(gatheringStates().find(s => s.layout === 'table' && s.opened && Object.keys(s.furniture).length === 3 && !s.epilogue.packing));
  const svgs = {
    postcard: o => keepsake.postcardSVG(photo, o), plan: o => gathering.gatheringPlanSVG(scene, o), programme: o => programme.programmeSVG(order, o),
    civic: o => civic.civicPlanSVG(plan, o), film: o => film.filmFrameSVG(shot, 'seat', o), panel: o => hosting.tilePanelSVG(ART[0], o),
  };
  const locale = { serif: '"Noto Naskh Arabic", serif', sans: '"Noto Sans Arabic", Tahoma, sans-serif', dir: 'rtl' };
  for (const [name, svg] of Object.entries(svgs)) {
    const plain = svg();
    assert.ok(plain.startsWith('<svg xmlns="http://www.w3.org/2000/svg" ') && !plain.includes('direction='), name);
    assert.equal(svg({}), plain, `${name}: {} is the default`);
    assert.equal(svg({ dir: 'up' }), plain, `${name}: an unknown direction is ignored`);
    assert.equal(svg({ dir: '"><script>' }), plain, `${name}: never markup`);
    const local = svg(locale);
    assert.ok(local.startsWith('<svg xmlns="http://www.w3.org/2000/svg" direction="rtl" '), name);
    assert.equal(svg({ dir: 'ltr' }).replace(' direction="ltr"', ''), plain, `${name}: only the attribute is added`);
    for (const family of local.match(/font-family="[^"]*"/g) ?? []) assert.ok([locale.serif, locale.sans].map(f => `font-family="${f.replace(/"/g, '&quot;')}"`).includes(family), `${name}: ${family}`);
    assert.ok(!local.includes('Georgia') && !/font-family="sans-serif"/.test(local), name);
  }
  // Today's families by default: Georgia for the postcard's title and RISE, sans-serif for its footer and the other plans.
  assert.equal(svgs.postcard().match(/font-family="Georgia,serif"/g).length, 2);
  assert.equal(svgs.postcard().match(/font-family="sans-serif"/g).length, 1);
  for (const name of ['plan', 'programme', 'civic']) assert.ok(svgs[name]().match(/font-family="sans-serif"/g).length >= 2, name);
});

// ---------------------------------------------------------------------------------------------------------------------------
test('logic never reads shown text: programmeIssue stays truthy, and the reducers act the same in a locale', async () => {
  // A translation can never make an issue empty: the guard keeps the English.
  const json = JSON.stringify({ format: 1, locale: 'qps-ploc', messages: { [programme.PROGRAMME_TEXT.issues.interval]: '' } });
  const read = I.readCatalog(json, 'qps-ploc');
  if (read.catalog && read.catalog.message(programme.PROGRAMME_TEXT.issues.interval) === '') {
    const { value } = await underLocale('qps-ploc', read.catalog, () => programme.programmeIssue(['beats', 'stories', 'art', 'pause']));
    assert.equal(value, programme.PROGRAMME_TEXT.issues.interval);
  } else assert.ok(read.rejected.length, 'the validator refuses an empty translation');
  // The same actions give the same states in English and under the pseudo catalog of every string.
  const keys = [...new Set((await underLocale('qps-ploc', catalogOf('qps-ploc', JSON.stringify({ format: 1, locale: 'qps-ploc', messages: {} })).catalog, renderAll)).misses)];
  const pseudo = catalogOf('qps-ploc', I.pseudoCatalog(keys, 'qps-ploc')).catalog;
  const run = () => {
    const out = [];
    for (const order of ORDERS) {
      out.push(programme.restoreProgramme({ order, published: order }, true), Boolean(programme.programmeIssue(order)));
      out.push(hosting.restoreHosting({ order, results: [] }, true), hosting.changeHosting(hosting.initialHosting(), { type: 'host-start' }, order));
      for (const id of ['stories', 'beats', 'art', 'pause']) for (const type of ['programme-add', 'programme-remove']) out.push(programme.changeProgramme({ order: Array.isArray(order) ? order : [], published: [] }, { type, id }));
      out.push(programme.changeProgramme({ order, published: [] }, { type: 'programme-publish' }));
    }
    for (const s of FIXTURE_STATES) out.push(core.applyAction(s, { type: 'programme-publish' }), core.applyAction(s, { type: 'host-start' }), core.blockMissingItems(s));
    return JSON.stringify(out);
  };
  const english = run();
  assert.equal((await underLocale('qps-ploc', pseudo, run)).value, english);
  for (const order of ORDERS) assert.equal(Boolean((await underLocale('qps-ploc', pseudo, () => programme.programmeIssue(order))).value), Boolean(programme.programmeIssue(order)), JSON.stringify(order));
});
