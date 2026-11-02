// Localization tooling for browser-next (docs/I18N_PLAN.md 2.3, 2.13, 4.1). English stays in the JavaScript tables it lives in;
// this script reads them, it never edits them.
//
//   node scripts/i18n.mjs extract          write i18n/source.json: every msgid, with table paths, placeholder signature,
//                                          length class, speaker, addressee and sensitivity tags
//   node scripts/i18n.mjs check [code]     validate browser-next/locales/<code>.json (every locale when omitted) and the manifest
//   node scripts/i18n.mjs init <code>      start a locale: an empty catalog and i18n/review/<code>.json with batches
//   node scripts/i18n.mjs manifest         write browser-next/locales/index.json from the catalogs and their review status
//   node scripts/i18n.mjs pseudo [code]    print a pseudo catalog (qps-ploc or qps-rtl) to stdout; it is never written to the fork
//
// The table registry (REGISTRY) lists every exported text table and the override map that turns its Godot text into what the
// 2D edition shows (webLine, web, webText). EXCLUDED lists the exports that look like text but are not msgids, with reasons; a
// test fails on any text-like export that is in neither list.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALES, readCatalog, readManifest, signature, pseudoCatalog } from '../browser-next/i18n.js';

const ROOT = new URL('../', import.meta.url);
const FORK = new URL('browser-next/', ROOT);
export const SOURCE_PATH = new URL('i18n/source.json', ROOT);
export const LOCALES_DIR = new URL('browser-next/locales/', ROOT);
export const MANIFEST_PATH = new URL('index.json', LOCALES_DIR);

// module: the file under browser-next/; tables: its exported text tables; overrides: the exported map whose values replace
// Godot text in 2D (the function that applies it is named in `via`); a grouped map is keyed by Godot file first, like the tables'
// own first level (visits/text.js web(file, literal)), and a table value takes the override of its own file only.
export const REGISTRY = Object.freeze([
  { module: 'characters.js', tables: ['PANEL_TEXT', 'BUTTON_TEXT', 'CAPTION_TEXT', 'ACTION_LABELS', 'HUB_LABELS', 'NEIGHBOR_LINES', 'CELESTE_LINES', 'ROOK_LINES', 'PROJECT_MEMORY', 'SURPRISE_MEMORY', 'LAYOUT_MEMORY', 'COMPOSITION', 'MURAL_REPLY', 'MURAL_SCENE_NAMES', 'NEIGHBOR_BADGES', 'BOEDDEKER_FROM_BEA', 'CHARACTER_PEOPLE', 'CHARACTER_COMPOSE'], overrides: 'CHARACTER_WEB_OVERRIDES', via: 'webLine' },
  { module: 'bubble.js', tables: ['BUBBLE_TEXT'] },
  { module: 'bursts.js', tables: ['BURST_TEXT', 'LAYOUT_BURST', 'BURST_DISPLAY'], overrides: 'BURST_WEB_OVERRIDES', via: 'web (module-private)' },
  { module: 'civic.js', tables: ['CIVIC_FORMATS', 'CIVIC_NOTES', 'CIVIC_TEXT', 'CIVIC_TOPICS'] },
  { module: 'core.js', tables: ['BLOCK_TEXT', 'LITTER', 'LOANS'] },
  { module: 'edition.js', tables: ['EDITION_TEXT'] },
  { module: 'ending/compose.js', tables: ['ENDING_COMPOSE', 'ENDING_DISPLAY', 'ENDING_UI'] },
  { module: 'ending/habitat.js', tables: ['NAMES', 'TITLES'] },
  { module: 'ending/mural.js', tables: ['SCENE_LABELS', 'SCENE_NAMES', 'SIGNATURE_CREDIT'] },
  { module: 'ending/text.js', tables: ['GODOT', 'GODOT_CONSTS', 'FORK_TEXT'], overrides: 'ENDING_WEB_OVERRIDES', via: 'web' },
  { module: 'experiments/neighborhood-voices.js', tables: ['VOICES_TEXT'] },
  { module: 'film.js', tables: ['FILM_FRAMING', 'FILM_PLANS', 'FILM_SHOTS', 'FILM_TEXT'] },
  { module: 'game-text.js', tables: ['GAME_TEXT'] },
  { module: 'gathering.js', tables: ['GATHERING_TEXT'] },
  { module: 'history.js', tables: ['BLACK_HAWK'] },
  { module: 'hosted-text.js', tables: ['HOSTED_GODOT_TEXT', 'HOSTING_FORK_TEXT', 'INVITATION_EXAMPLES', 'INVITATION_TITLES', 'LOAN_COMPLETION_NOTICE', 'LOAN_REPLIES', 'QUIET_TITLES', 'HOSTED_COMPOSE'], overrides: 'HOSTED_WEB_OVERRIDES', via: 'hostedText (module-private)' },
  { module: 'hosting.js', tables: ['HOSTING_TEXT', 'QUIET_CHOICES', 'STORY_CHOICES'] },
  { module: 'keepsake.js', tables: ['KEEPSAKE_TEXT', 'PHOTO_RESPONSES'] },
  { module: 'programme.js', tables: ['PROGRAMME_TEXT', 'SEGMENTS'] },
  { module: 'rewards.js', tables: ['CUE_REASONS', 'HISTORY_REASONS', 'SOUNDS_TEXT', 'SOUNDS_COMPOSE'] },
  { module: 'rhythm.js', tables: ['RHYTHM_TEXT', 'RHYTHM_COMPOSE'], overrides: 'RHYTHM_WEB_OVERRIDES', via: 'rhythm-ui.js' },
  { module: 'sketch-core.js', tables: ['MUSIC_TEXT', 'MUSIC_COMPOSE'] },
  { module: 'soundtrack.js', tables: ['SOUNDTRACK_TEXT'] },
  { module: 'story.js', tables: ['GATHERING_LAYOUT_TITLES', 'GODOT_TEMPLATES', 'LOAN_TITLES', 'NEIGHBOR_NAMES', 'PROGRAMME_TITLES', 'STORY_CHAPTERS', 'COMPASS_TEXT', 'FORK_TEXT'], overrides: 'WEB_OVERRIDES', via: 'webText' },
  { module: 'visits-kit.js', tables: ['VISITS_FORK_TEXT'] },
  { module: 'visits/before-streets.js', tables: ['FRAME', 'REPLIES', 'SOURCES', 'TEXT', 'VIEWS'] },
  { module: 'visits/compose.js', tables: ['COMPOSE_TEXT', 'MENU_TITLES'] },
  { module: 'visits/dogs.js', tables: ['DESCRIPTIONS', 'LEADS', 'NAMES', 'NOTES', 'TEXT'] },
  { module: 'visits/election.js', tables: ['TEXT'] },
  { module: 'visits/landmarks.js', tables: ['EATERIES', 'EATERY_HOST_LINES', 'EATERY_MENU_ITEMS', 'MUSEUM_DOCENT_LINES', 'TOUR_MUSEUM_TITLES'] },
  { module: 'visits/lantern.js', tables: ['TEXT'] },
  { module: 'visits/meal.js', tables: ['RECIPES', 'SERVING', 'TEXT'] },
  { module: 'visits/picker.js', tables: ['TEXT', 'TITLES'] },
  { module: 'visits/positions.js', tables: ['EATERY_COUNTERS', 'SURPRISE_SITES'] },
  { module: 'visits/power.js', tables: ['CLUES', 'DIRECTIONS', 'NAMES', 'TEXT', 'VOICES'] },
  { module: 'visits/surprises.js', tables: ['KEEPSAKES', 'SURPRISES'] },
  { module: 'visits/text.js', tables: ['GODOT_TEXT', 'GODOT_CONSTANTS'], overrides: 'WEB_OVERRIDES', grouped: true, via: 'web(file, literal)' },
  { module: 'world.js', tables: ['NEIGHBORS', 'PLACES'] },
]);
// Exports that hold text but are not msgids.
export const EXCLUDED = Object.freeze({
  'characters.js': { CHARACTER_WEB_OVERRIDES: 'override map (its values are extracted through the tables)', NARROW_LABEL_REWRITES: 'English substring rewrites; locales use the catalog narrow section' },
  'bursts.js': { BURST_WEB_OVERRIDES: 'override map', BANNER: 'banner timing and the "* %s" title mark, drawn around the looked-up title' },
  'core.js': { SIGNS: 'the mural signs, drawn as they are (RISE is not translated, D8)' },
  'ending/art.js': { GODOT_ART: 'SVG drawing data' },
  'ending/text.js': { ENDING_WEB_OVERRIDES: 'override map', C: 'alias of GODOT_CONSTS', G: 'alias of GODOT' },
  'history.js': { WEST_INTERSECTIONS: 'street names, not translated (D8)' },
  'hosted-text.js': { HOSTED_WEB_OVERRIDES: 'override map' },
  'rhythm.js': { RHYTHM_WEB_OVERRIDES: 'override map' },
  'story.js': { WEB_OVERRIDES: 'override map' },
  'visits-kit.js': { STYLE: 'CSS' },
  'version.js': { VERSION: 'build version', EDITION: 'edition id' },
  'visits/positions.js': { RAW_EATERY_COUNTERS: 'Godot coordinates of EATERY_COUNTERS', RAW_SURPRISE_SITES: 'Godot coordinates of SURPRISE_SITES' },
  'visits/surprises.js': { STORY_BADGES: 'dead export (BROWSER_NEXT.md Known debt)' },
  'visits/text.js': { WEB_OVERRIDES: 'override map', BEFORE: 'part of GODOT_CONSTANTS', DOGS: 'part of GODOT_CONSTANTS', MAIN: 'part of GODOT_CONSTANTS', MEAL: 'part of GODOT_CONSTANTS', MEAL_DATA: 'part of GODOT_CONSTANTS', PICKER: 'part of GODOT_CONSTANTS', POWER: 'part of GODOT_CONSTANTS' },
});
// Displayed fields of data files (2.6): looked up by their English value, which stays in the file.
export const DATA_FIELDS = Object.freeze([
  { file: 'experiments/neighborhood-voices.json', records: data => data?.records ?? [], fields: ['topic', 'summary'] },
  { file: 'data/voting_places.json', records: data => data?.sites ?? [], fields: ['room', 'listed_description'] },
]);
// Object keys whose values are ids, colours or geometry, never text. Not `art`, `kind` or `cue`: Godot keys shown text by them
// (hosted_picture_description.art, OPENINGS.art, the eateries' kind "Corner Bar", the tour's cue "All %d session stops"), and the
// ids under those keys (art, cup, visit) are not human text anyway.
const SKIP_KEYS = new Set(['id', 'ids', 'color', 'colour', 'coat', 'skin', 'hair', 'sprite', 'icon', 'url', 'href', 'src', 'svg', 'path', 'shape', 'slot', 'palette', 'x', 'y', 'key', 'type', 'tint', 'fill', 'stroke']);
// Shown table values that isHumanText rejects (one lowercase word, a measure, a compass letter), each looked up where it is
// shown. A value here is a msgid wherever a registered table holds it; a test fails on an entry the extractor no longer finds.
export const SHORT_TEXT = Object.freeze({
  nearby: 'story.js FORK_TEXT.nearby: the compass phrase when a position is unknown',
  restored: 'visits/power.js TEXT.refresh.restoredWord: the restored-lights word',
  rest: 'rhythm.js RHYTHM_TEXT.rest: a rest step of a Rhythm Circle pattern',
  '40 m': 'visits/power.js TEXT.setup.map1: the case map scale',
  N: 'visits/power.js TEXT.setup.map2: the case map north letter',
});
const PLACEHOLDERS = /%%|%(?:\d+\$)?(?:s|d|f|\.\d+f)|\{[A-Za-z_]\w*\}/g;

// A string that a player reads: letters in words, not an id, a path, a colour, CSS, a selector or markup-only.
export function isHumanText(value) {
  const s = String(value).trim();
  // A letterless template ("%s: %s", "%s: \"%s\" · %s%s", "%d/3", "%s %s"): its separators, quote marks and order are a
  // translator's to change. A lone placeholder ("%s") is not: it has nothing to translate.
  const bare = s.replace(PLACEHOLDERS, '');
  if (bare !== s && !/[A-Za-z]/.test(bare) && (/\S/.test(bare) || s.match(PLACEHOLDERS).length >= 2)) return true;
  if (!s || !/[A-Za-z]/.test(s)) return false;
  if (/^(https?:|mailto:|\.\.?\/|data:|blob:)/i.test(s)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(s) || /^(rgba?|hsla?)\(/i.test(s)) return false;
  if (/^<[^>]+>/.test(s) && !/>[^<]*[A-Za-z]{2,}[^<]*</.test(s)) return false;
  if (/^[a-z][\w$.:\-/]*$/.test(s)) return false; // ids, events, kebab and snake case
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(s) || /^[A-Z][a-z]+([A-Z][a-z0-9]*){2,}$/.test(s)) return false; // camelCase, PascalCase ids
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(s) || /^[0-9a-f]{6,8}$/i.test(s)) return false; // snake ids, bare hex colours
  if (/^[A-Z][A-Z0-9_]+$/.test(s) && s.includes('_')) return false;
  if (/^\w+\.(js|mjs|json|svg|css|html|gd|png|wav|ogg|mp3)$/i.test(s)) return false;
  if ((s.match(/[a-z-]+\s*:\s*[^;{}]+;/g) ?? []).length >= 2) return false; // CSS declarations
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(s) && /\d/.test(s)) return false; // SVG path data
  return /[A-Za-z]{2,}/.test(s);
}
const SENSITIVE = Object.freeze({
  civic: /\b(vot(e|es|ed|ing|er|ers)|ballot|poll(s|ing)?|election|precinct|registrar|candidate|civic|tenant circle|listening hour|city hall|supervisor|mayor)\b/i,
  housing: /\b(housing|tenants?|rent|evict\w*|landlord|homeless\w*|shelter|SRO|affordable|low incomes?)\b/i,
  power: /\b(outage|blackout|power (story|cut|is out|went out)|lights? (out|went)|battery|relay|generator|PG&E|grid|substation)\b/i,
  pets: /\b(dogs?|lost|missing|owner|leash|sighting|reunite\w*)\b/i,
  emergency: /\b(emergenc\w*|911|safety|police|harass\w*|fire|injur\w*|medical|danger\w*|hazard)\b/i,
  identity: /\b(transgender|trans\b|drag|uprising|Compton|queer|LGBT\w*|GLBT|homeland|Ramaytush|Yelamu|Ohlone|Indigenous|plaque)\b/i,
  save: /\b(saved?|save file|storage|progress|start over|restart|unsaved|recover\w*)\b/i,
  keys: /\b(press|key|keys|Esc|Enter|WASD|arrow|Shift\+|F5)\b/,
});
const ENVELOPE = /^([^\n:"]{1,40}): "([\s\S]*)"$/;
function lengthClass(msgid, paths) {
  if (paths.some(p => /BUTTON|ACTION_LABELS|button/i.test(p))) return 'button';
  if (paths.every(p => p.startsWith('world.js'))) return 'chip';
  const words = msgid.split(/\s+/).filter(Boolean).length, sentences = (msgid.match(/[.!?…](\s|$)/g) ?? []).length;
  if (words <= 4 && sentences === 0) return 'label';
  if (sentences <= 1 && msgid.length <= 160) return 'sentence';
  return 'paragraph';
}

// A msgid: human text, or a short shown value listed in SHORT_TEXT.
export const isMsgid = value => isHumanText(value) || Object.hasOwn(SHORT_TEXT, String(value));
// Walk a table, calling visit(text, path, own) for every string leaf; the caller checks the text after its override map `own`.
// An object that belongs to a file of a grouped override map (owners) takes that file's map, wherever a module re-exports it.
function walk(value, path, visit, own = null, owners = new WeakMap(), seen = new Set()) {
  if (typeof value === 'string') { visit(value, path, own); return; }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (owners.has(value)) own = owners.get(value);
  if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${path}[${i}]`, visit, own, owners, seen));
  else for (const [key, item] of Object.entries(value)) { if (SKIP_KEYS.has(key) && typeof item === 'string') continue; walk(item, /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`, visit, own, owners, seen); }
}
// Every object under each file of a grouped table, mapped to that file's override map: visits/power.js TEXT is visits/text.js
// GODOT_TEXT['power_story.gd'], so it shows web('power_story.gd', …) too.
function ownersOf(table, map, owners) {
  for (const [file, part] of Object.entries(table)) {
    const own = Object.hasOwn(map, file) ? map[file] : null;
    const mark = v => { if (v && typeof v === 'object' && !owners.has(v)) { owners.set(v, own); Object.values(v).forEach(mark); } };
    mark(part);
  }
}
// t('…') and L('…', 'ctx') literal calls in modules that import them from i18n.js; [data-i18n] nodes in index.html.
const LITERAL = /(?<![\w$.])([tL])\(\s*'((?:[^'\\\n]|\\.)*)'\s*(?:,\s*'((?:[^'\\\n]|\\.)*)')?\s*\)/g;
const unquote = body => JSON.parse(`"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);
function forkFiles() {
  return readdirSync(FORK, { recursive: true }).map(name => String(name).split('\\').join('/')).filter(name => name.endsWith('.js') && !name.startsWith('data/')).sort();
}
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' };
const decodeEntities = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m);

export async function extract() {
  const entries = new Map();
  const add = (msgid, ctx, where) => {
    const key = ctx ? `${ctx}\u0004${msgid}` : msgid;
    if (!entries.has(key)) entries.set(key, { msgid, ctx: ctx ?? null, paths: new Set() });
    entries.get(key).paths.add(where);
  };
  const load = module => import(pathToFileURL(fileURLToPath(new URL(module, FORK))).href), owners = new WeakMap();
  for (const { module, tables, overrides, grouped } of REGISTRY) {
    if (!grouped) continue;
    const m = await load(module);
    for (const table of tables) ownersOf(m[table], m[overrides], owners);
  }
  const visit = (text, path, own) => { const value = own && Object.hasOwn(own, text) ? own[text] : text; if (isMsgid(value)) add(value, null, path); };
  for (const { module, tables, overrides, grouped } of REGISTRY) {
    const m = await load(module);
    const map = overrides ? m[overrides] : null;
    if (overrides && (!map || typeof map !== 'object')) throw Error(`${module}: no override map ${overrides}`);
    const base = module.replace(/\.js$/, '').replace(/\//g, '.');
    for (const table of tables) {
      if (!(table in m)) throw Error(`${module}: no export ${table}`);
      walk(m[table], `${base}.${table}`, visit, grouped ? null : map, owners);
    }
  }
  for (const { file, records, fields } of DATA_FIELDS) {
    const data = JSON.parse(readFileSync(new URL(file, FORK), 'utf8'));
    records(data).forEach((record, i) => { for (const field of fields) if (typeof record?.[field] === 'string' && isHumanText(record[field])) add(record[field], null, `${file}.records[${i}].${field}`); });
  }
  for (const file of forkFiles()) {
    const text = readFileSync(new URL(file, FORK), 'utf8');
    if (!/from '(\.\.?\/)+i18n\.js'/.test(text) || file === 'i18n.js') continue;
    const imported = /import\s*\{([^}]*)\}\s*from\s*'(?:\.\.?\/)+i18n\.js'/.exec(text)?.[1] ?? '';
    const names = new Set(imported.split(',').map(part => part.trim().split(/\s+as\s+/).pop()));
    for (const m of text.matchAll(LITERAL)) if (names.has(m[1])) add(unquote(m[2]), m[3] ? unquote(m[3]) : null, `${file}:${text.slice(0, m.index).split('\n').length}`);
  }
  const html = readFileSync(new URL('index.html', FORK), 'utf8');
  for (const m of html.matchAll(/<(\w+)\b[^>]*\sdata-i18n(?=[\s>=])[^>]*>([^<]*)<\/\1>/g)) add(decodeEntities(m[2]), null, `index.html:${html.slice(0, m.index).split('\n').length}`);
  const out = [...entries.values()].map(({ msgid, ctx, paths }) => {
    const sig = signature(msgid), list = [...paths].sort(), speaker = /%|{/.test(ENVELOPE.exec(msgid)?.[1] ?? '%') ? null : ENVELOPE.exec(msgid)[1];
    const entry = { msgid };
    if (ctx) entry.ctx = ctx;
    entry.paths = list;
    entry.placeholders = sig.specs.map(s => `%${s.kind}`).join(' ') + (sig.named.length ? `${sig.specs.length ? ' ' : ''}${sig.named.map(n => `{${n}}`).join(' ')}` : '');
    entry.length = lengthClass(msgid, list);
    if (speaker) entry.speaker = speaker;
    if (/\b(you|your|yours|yourself)\b/i.test(msgid)) entry.addressee = 'player';
    const tags = Object.entries(SENSITIVE).filter(([, re]) => re.test(msgid)).map(([tag]) => tag);
    if (tags.length) entry.tags = tags;
    return entry;
  });
  out.sort((a, b) => a.msgid < b.msgid ? -1 : a.msgid > b.msgid ? 1 : (a.ctx ?? '') < (b.ctx ?? '') ? -1 : (a.ctx ?? '') > (b.ctx ?? '') ? 1 : 0);
  return { format: 1, generatedBy: 'node scripts/i18n.mjs extract', count: out.length, entries: out };
}
export const stableJSON = value => `${JSON.stringify(value, null, 2)}\n`;
export const sourceIndex = source => new Set(source.entries.map(e => e.ctx ? `${e.ctx}\u0004${e.msgid}` : e.msgid));
export const readSource = () => JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const catalogCodes = () => existsSync(LOCALES_DIR) ? readdirSync(LOCALES_DIR).filter(name => name.endsWith('.json') && name !== 'index.json').map(name => name.slice(0, -5)).sort() : [];

// The manifest from the catalogs on disk. A locale's status comes from i18n/review/<code>.json ("draft" without one); coverage
// is the share of source msgids its catalog translates.
export function buildManifest(source = readSource()) {
  const total = source.entries.filter(e => !e.ctx).length || 1, locales = [];
  for (const code of catalogCodes()) {
    if (!Object.hasOwn(LOCALES, code) || code === 'en') throw Error(`locales/${code}.json is not a known locale`);
    const bytes = readFileSync(new URL(`${code}.json`, LOCALES_DIR)), review = new URL(`i18n/review/${code}.json`, ROOT);
    const data = JSON.parse(bytes.toString('utf8')), status = existsSync(review) ? JSON.parse(readFileSync(review, 'utf8')).status ?? 'draft' : 'draft';
    const translated = Object.keys(data.messages ?? {}).filter(key => source.entries.some(e => !e.ctx && e.msgid === key)).length;
    locales.push({ code, endonym: LOCALES[code].endonym, dir: LOCALES[code].dir, status, coverage: Math.round((translated / total) * 10000) / 10000, sha256: sha(bytes) });
  }
  return { format: 1, locales };
}
// Every catalog on disk (or one) against the source index and the manifest. Returns a list of problems.
export function checkLocales(codes = catalogCodes(), source = readSource()) {
  const problems = [], index = sourceIndex(source);
  const manifest = existsSync(MANIFEST_PATH) ? readManifest(readFileSync(MANIFEST_PATH, 'utf8')) : null;
  if (!manifest) problems.push('browser-next/locales/index.json is missing or invalid');
  for (const code of codes) {
    const text = readFileSync(new URL(`${code}.json`, LOCALES_DIR), 'utf8'), read = readCatalog(text, code, index);
    if (!read.catalog) { problems.push(`${code}: rejected (${read.error})`); continue; }
    for (const r of read.rejected) problems.push(`${code}: ${r.section} ${JSON.stringify(r.key)}: ${r.reason}`);
    const entry = manifest?.locales.find(e => e.code === code);
    if (!entry) problems.push(`${code}: not in the manifest`);
    else if (entry.sha256 !== sha(readFileSync(new URL(`${code}.json`, LOCALES_DIR)))) problems.push(`${code}: manifest hash is stale (run manifest)`);
    if (entry?.status === 'shipped') {
      const missing = source.entries.filter(e => !e.ctx && read.catalog.message(e.msgid) === undefined).length;
      if (missing) problems.push(`${code}: shipped but ${missing} msgids are untranslated`);
    }
  }
  for (const entry of manifest?.locales ?? []) if (!codes.includes(entry.code) && !catalogCodes().includes(entry.code)) problems.push(`manifest lists ${entry.code}, which has no catalog`);
  return problems;
}

async function main([command, arg]) {
  if (command === 'extract') {
    const source = await extract();
    mkdirSync(new URL('i18n/', ROOT), { recursive: true });
    writeFileSync(SOURCE_PATH, stableJSON(source));
    console.log(`i18n/source.json: ${source.count} msgids`);
  } else if (command === 'check') {
    const problems = checkLocales(arg ? [arg] : catalogCodes());
    for (const p of problems) console.error(p);
    console.log(problems.length ? `${problems.length} problem(s)` : `ok: ${(arg ? [arg] : catalogCodes()).length} locale(s)`);
    process.exitCode = problems.length ? 1 : 0;
  } else if (command === 'init') {
    if (!arg || !Object.hasOwn(LOCALES, arg) || arg === 'en') throw Error(`init needs a known locale: ${Object.keys(LOCALES).filter(c => c !== 'en').join(', ')}`);
    const catalog = new URL(`${arg}.json`, LOCALES_DIR), review = new URL(`i18n/review/${arg}.json`, ROOT);
    if (existsSync(catalog) || existsSync(review)) throw Error(`${arg} already exists`);
    const source = readSource(), batches = {};
    for (const e of source.entries) { const batch = e.paths[0].split(/[.[:]/)[0]; (batches[batch] ??= { status: 'todo', reviewers: [], msgids: 0 }).msgids++; }
    mkdirSync(LOCALES_DIR, { recursive: true }); mkdirSync(new URL('i18n/review/', ROOT), { recursive: true });
    writeFileSync(catalog, stableJSON({ format: 1, locale: arg, messages: {} }));
    writeFileSync(review, stableJSON({ locale: arg, status: 'draft', batches }));
    console.log(`wrote browser-next/locales/${arg}.json and i18n/review/${arg}.json; run manifest next`);
  } else if (command === 'manifest') {
    mkdirSync(LOCALES_DIR, { recursive: true });
    const manifest = buildManifest();
    writeFileSync(MANIFEST_PATH, stableJSON(manifest));
    console.log(`browser-next/locales/index.json: ${manifest.locales.length} locale(s)`);
  } else if (command === 'pseudo') {
    const code = arg ?? 'qps-ploc';
    if (!['qps-ploc', 'qps-rtl'].includes(code)) throw Error('pseudo takes qps-ploc or qps-rtl');
    process.stdout.write(`${pseudoCatalog(readSource().entries, code)}\n`);
  } else {
    console.error('usage: node scripts/i18n.mjs extract | check [code] | init <code> | manifest | pseudo [qps-ploc|qps-rtl]');
    process.exitCode = 2;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main(process.argv.slice(2));
