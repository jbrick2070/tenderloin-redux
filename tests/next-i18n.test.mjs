// browser-next/i18n.js (docs/I18N_PLAN.md I1, 2.12): English is the identity, catalogs are validated as hostile input, a stale
// load never applies, settings accept only known values, and movement keys map by position (D13). Pure: injected fetch,
// digest and timers, no sleeps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as I from '../browser-next/i18n.js';
import { gdFormat } from '../browser-next/characters.js';
import { gdf as endingGdf } from '../browser-next/ending/text.js';
import { fmt } from '../browser-next/story.js';
import { gdf as visitsGdf } from '../browser-next/visits/format.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const GAME = read('browser-next/game.js');
// rhythm.js keeps fill private: evaluate its one-line declaration as it stands.
const fillLine = /^const fill = (.*);$/m.exec(read('browser-next/rhythm.js'))[1];
const rhythmFill = new Function(`return ${fillLine};`)();
const LEGACY = {
  characters: (template, args) => gdFormat(template, ...args),
  ending: (template, args) => endingGdf(template, ...args),
  story: (template, args) => fmt(template, ...args),
  rhythm: (template, args) => rhythmFill(template, ...args),
  visits: (template, args) => visitsGdf(template, args),
};
const flavor = name => ({ ...I.FLAVORS[name], legacy: LEGACY[name] });
const catalogJSON = (code, messages, extra = {}) => JSON.stringify({ format: 1, locale: code, messages, ...extra });
const catalogOf = (code, messages, extra) => { const read = I.readCatalog(catalogJSON(code, messages, extra), code); assert.ok(read.catalog, read.error); return read; };
const english = () => I.setLocale('en');
// A seeded generator, so the matrix is the same on every run.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

// ------------------------------------------------------------------------------------------------- English identity
test('English is the identity for all five formatter flavors, over a seeded template and argument matrix', () => {
  english();
  const random = rng(20261101), pick = list => list[Math.floor(random() * list.length)];
  const pieces = ['Talking with ', '%s', '%d', ' · ', '%%', 'Turn ', '/5', '%f', '%.2f', ' taps', ': "', '"', '\n', '—', 'Mural ', ''];
  const values = [0, 1, -1.5, 2.75, 1961, 'Bea', '', 'x%sy', NaN, null, undefined, true, '٣', 'ไทย'];
  let compared = 0;
  for (let n = 0; n < 600; n++) {
    const template = Array.from({ length: 1 + Math.floor(random() * 6) }, () => pick(pieces)).join('');
    const args = Array.from({ length: Math.floor(random() * 5) }, () => pick(values));
    for (const name of Object.keys(LEGACY)) {
      let want, wantError = null;
      try { want = LEGACY[name](template, args); } catch (error) { wantError = error.message; }
      if (wantError) assert.throws(() => I.format(template, args, flavor(name)), { message: wantError }, `${name} ${JSON.stringify(template)}`);
      else assert.equal(I.format(template, args, flavor(name)), want, `${name} ${JSON.stringify(template)} ${JSON.stringify(args)}`);
      compared++;
    }
  }
  assert.equal(compared, 3000);
  assert.equal(I.diagnostics().missCount, 0, 'English looks nothing up and records no miss');
});

test('English: L, t, html, list, num, isolate, canvasFont and narrow return today\'s values', () => {
  english();
  for (const value of ['Field notes', '', 'A & <b>', '%s: %s', 42, null]) { assert.equal(I.L(value), value); assert.equal(I.t(value, 'ctx'), value); }
  const esc = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  for (const text of ['Field notes', 'Tom & "Jerry" <3', '']) assert.equal(I.html(text), esc(text), 'html() escapes exactly like game.js esc()');
  assert.equal(I.html('Press %s to talk', '<kbd>E</kbd>'), 'Press <kbd>E</kbd> to talk');
  const join = items => items.join(' and ');
  assert.equal(I.list(['Bea', 'Dez'], join), 'Bea and Dez');
  for (const value of [1.5, 1961, -0, 'x', NaN]) assert.equal(I.num(value), String(value));
  assert.equal(I.isolate('361 Turk'), '361 Turk');
  assert.equal(I.canvasFont('600 11px "Segoe UI", sans-serif'), '600 11px "Segoe UI", sans-serif');
  assert.equal(I.narrow('Go Meet %s'), undefined);
  assert.equal(I.locale(), 'en'); assert.equal(I.isRTL(), false);
  assert.deepEqual(I.diagnostics().misses, [], 'English records no misses');
});

// ------------------------------------------------------------------------------------------------- readCatalog, hostile input
test('readCatalog rejects a bad envelope whole: non-JSON, wrong locale or format, arrays, wrong sections, too large', () => {
  const cases = [
    ['not json', '{', 'json'], ['array', '[]', 'envelope'], ['null', 'null', 'envelope'],
    ['format 2', JSON.stringify({ format: 2, locale: 'es', messages: {} }), 'format'],
    ['wrong locale', catalogJSON('vi', {}), 'locale'],
    ['messages array', JSON.stringify({ format: 1, locale: 'es', messages: [] }), 'messages'],
    ['context string', JSON.stringify({ format: 1, locale: 'es', messages: {}, context: 'x' }), 'context'],
    ['too large', ' '.repeat(I.MAX_CATALOG_BYTES + 1), 'too-large'],
  ];
  for (const [name, text, error] of cases) assert.deepEqual(I.readCatalog(text, 'es'), { catalog: null, rejected: [], error }, name);
  assert.equal(I.readCatalog(catalogJSON('en', {}), 'en').error, 'unknown-locale', 'English never has a catalog');
  assert.equal(I.readCatalog(catalogJSON('zz', {}), 'zz').error, 'unknown-locale');
  assert.equal(I.readCatalog(42, 'es').error, 'not-text');
  const many = Object.fromEntries(Array.from({ length: I.MAX_ENTRIES + 1 }, (_, i) => [`Line ${i}`, `Línea ${i}`]));
  assert.equal(I.readCatalog(catalogJSON('es', many), 'es').error, 'too-many');
});

test('readCatalog drops a bad entry and keeps the rest; each rule names its reason', () => {
  const entries = {
    'Field notes': 'Notas de campo',
    'Talking with %s (%s · %s · Turn %d/5)': 'Hablando con %1$s (%2$s · %3$s · Turno %4$d/5)',
    'Bea: "Hi there."': 'Bea: "Hola."',
    'Press E to talk': 'Pulsa E para hablar',
    'Lost %s': 'Perdido', // placeholders
    'Walk %d blocks': 'Camina %s cuadras', // placeholder kind
    'A %s and %s': 'Un %1$s y %1$s', // positional must use every argument
    'B %s and %d': 'B %1$s y %d', // mixed
    'C %s': 'C %2$s', // out of range
    'Two\nlines': 'Dos líneas', // newlines
    'Plain text': 'Texto <b>plano</b>', // markup
    'See the map': 'Ve a evil.example.com', // a domain absent from the source
    'Look here': 'Mira https://example.org', // a URL absent from the source
    'Control': 'Contr\u0007ol',
    'Override': 'Over\u202Eride', // bidi override
    'Lone': 'Lo\uD800ne',
    'Short': 'x'.repeat(4 * 'Short'.length + 121), // too long
    'Rook: "Groove."': 'Rook dice: Groove.', // envelope
    '“Quoted”': 'Citado', // curly quotes
    'Press Enter': 'Pulsa Intro', // protected key name
    'Tenderloin Redux — A little room for good': 'Un pequeño espacio para algo bueno', // brand
    '100%% sure': '100% seguro', // %% parity
    'Empty': '',
    'Number': 7,
    'Array': ['x'],
    'constructor': 'Constructor',
    ...JSON.parse('{"__proto__":"polluted"}'), // an own "__proto__" key, as JSON.parse makes one
  };
  const read = I.readCatalog(catalogJSON('es', entries), 'es');
  assert.ok(read.catalog);
  const reasons = Object.fromEntries(read.rejected.map(r => [r.key, r.reason]));
  assert.deepEqual(reasons, {
    'Lost %s': 'placeholders', 'Walk %d blocks': 'placeholders', 'A %s and %s': 'placeholders', 'B %s and %d': 'mixed-placeholders', 'C %s': 'placeholders',
    'Two\nlines': 'newlines', 'Plain text': 'markup', 'See the map': 'url', 'Look here': 'url', Control: 'control', Override: 'control', Lone: 'control', Short: 'too-long',
    'Rook: "Groove."': 'envelope', '“Quoted”': 'quotes', 'Press Enter': 'protected', 'Tenderloin Redux — A little room for good': 'protected', '100%% sure': 'percent',
    Empty: 'empty', Number: 'value-type', Array: 'value-type',
  });
  const c = read.catalog;
  assert.equal(c.message('Field notes'), 'Notas de campo');
  assert.equal(c.message('Talking with %s (%s · %s · Turn %d/5)'), 'Hablando con %1$s (%2$s · %3$s · Turno %4$d/5)');
  assert.equal(c.message('Press E to talk'), 'Pulsa E para hablar');
  assert.equal(c.message('Lost %s'), undefined);
  // Prototype keys are plain map keys: nothing is polluted and lookups of other names see nothing inherited.
  assert.equal(c.message('__proto__'), 'polluted');
  assert.equal(({}).polluted, undefined); assert.equal(Object.prototype.polluted, undefined);
  assert.equal(c.message('toString'), undefined); assert.equal(c.message('hasOwnProperty'), undefined);
  assert.ok(Object.isFrozen(c) && Object.isFrozen(read.rejected));
  assert.throws(() => { c.message = () => 'x'; }, TypeError);
});

test('readCatalog: plural objects use only the locale\'s CLDR categories and need `other`; select objects an id argument and `other`', () => {
  const read = I.readCatalog(catalogJSON('es', {
    'Copied rhythm: %d taps': { one: 'Ritmo: %d golpe', many: 'Ritmo: %d de golpes', other: 'Ritmo: %d golpes' },
    'Copied: %d taps': { one: 'Copiado: %d golpe', other: 'Copiado: %d golpes' }, // es also lists many (millions): { one, other } is valid
    'Taps: %d': { one: '%d', few: '%d', other: '%d' }, // few is not a Spanish category
    'Beats: %d': { one: '%d', many: '%d' }, // no other
    '%s and %d': { one: '%s %d', many: '%s %d', other: '%s %d', $count: 3 }, // index out of range
    'No count %s': { one: 'a %s', many: 'b %s', other: 'c %s' }, // nothing to count
    '%s added': { $select: 1, table: 'Mesa añadida', seats: 'Asientos añadidos', other: '%s añadido' },
    '%s gone': { $select: 1, table: 'Mesa' }, // no other
    '%s here': { $select: 2, other: 'x' }, // index
    '%s there': { $select: 1, 'Bad Id': 'x', other: '%s allí' },
    'Lift %s scene from %s': { $select: 1, sun: 'Levanta la escena del sol de %2$s', other: 'Levanta %1$s de %2$s' }, // a variant may drop the selector, positionally
    'Lift %s for %s': { $select: 1, sun: 'Levanta para %s', other: '%s para %s' }, // but not the first argument sequentially
    'Copied %d of %s': { one: 'Una de %2$s', many: '%1$d de %2$s', other: '%1$d de %2$s' }, // a plural form may drop its count
  }), 'es');
  assert.deepEqual(Object.fromEntries(read.rejected.map(r => [r.key, r.reason])), {
    'Taps: %d': 'plural-categories', 'Beats: %d': 'plural-other', '%s and %d': 'plural-index', 'No count %s': 'plural-selector', 'Lift %s for %s': 'placeholders', '%s gone': 'select-other', '%s here': 'select-index', '%s there': 'select-id',
  });
  const vi = I.readCatalog(catalogJSON('vi', { 'Copied rhythm: %d taps': { other: 'Đã chép: %d nhịp' }, 'Copied: %d taps': { one: '%d', other: '%d' } }), 'vi');
  assert.deepEqual(vi.rejected.map(r => r.reason), ['plural-categories'], 'one is not a Vietnamese category');
  assert.equal(read.catalog.message('Copied: %d taps').one, 'Copiado: %d golpe');
  I.setLocale('es', read.catalog);
  try {
    assert.equal(I.format('Copied: %d taps', [2000000], flavor('rhythm')), 'Copiado: 2000000 golpes', 'a missing many falls back to other');
    assert.equal(I.format('Copied: %d taps', [1], flavor('rhythm')), 'Copiado: 1 golpe');
  } finally { english(); }
  const ar = I.readCatalog(catalogJSON('ar', { 'Copied: %d taps': Object.fromEntries(['zero', 'one', 'two', 'few', 'many', 'other'].map(k => [k, `${k} %d`])) }), 'ar');
  assert.deepEqual(ar.rejected, []);
});

test('readCatalog: unknown keys against a source index, context entries, narrow labels and the Arabic address forms', () => {
  const index = new Set(['Ready', 'Field notes', 'Go Meet %s', 'characters.PANEL_TEXT.scReady\u0004Ready']);
  const read = I.readCatalog(catalogJSON('ar', { 'Field notes': 'ملاحظات', 'Not in source': 'x' }, {
    context: { 'characters.PANEL_TEXT.scReady': { Ready: 'جاهزة', Unknown: 'x' }, broken: 'x' },
    narrow: { 'Go Meet %s': 'قابل %s', 'Field notes': 7 },
    address: { m: { 'Field notes': 'ملاحظاتك' }, f: { 'Field notes': 'ملاحظاتكِ' }, x: {} },
  }), 'ar', index);
  assert.deepEqual(read.rejected.map(r => [r.section, r.key, r.reason]), [
    ['messages', 'Not in source', 'unknown-key'], ['context', 'Unknown', 'unknown-key'], ['context', 'broken', 'context-shape'],
    ['narrow', 'Field notes', 'not-string'], ['address', 'x', 'address-form'],
  ]);
  assert.equal(read.catalog.context('characters.PANEL_TEXT.scReady', 'Ready'), 'جاهزة');
  assert.equal(read.catalog.narrow('Go Meet %s'), 'قابل %s');
  assert.equal(read.catalog.address('f', 'Field notes'), 'ملاحظاتكِ');
  const es = I.readCatalog(catalogJSON('es', {}, { address: { m: {} } }), 'es');
  assert.deepEqual(es.rejected.map(r => r.reason), ['address-unsupported'], 'only Arabic has address forms (D5)');
});

// ------------------------------------------------------------------------------------------------- lookups and fallback
test('per-string fallback, whole-sentence fallback, context, plural and select under a locale', () => {
  const { catalog } = catalogOf('es', {
    'Field notes': 'Notas de campo',
    'Talking with %s, turn %d/5': 'Turno %2$d/5 con %1$s',
    'Copied rhythm: %d taps': { one: 'Ritmo copiado: %d golpe', many: 'Ritmo copiado: %d de golpes', other: 'Ritmo copiado: %d golpes' },
    '%s added': { $select: 1, table: 'Mesa añadida', other: '%s añadido' },
    'Step %.1f': 'Paso %.1f',
  }, { context: { 'panel.ready': { Ready: 'Lista' } }, narrow: { 'Go Meet %s': 'Conocer a %s' } });
  I.setLocale('es', catalog);
  try {
    assert.equal(I.t('Field notes'), 'Notas de campo');
    assert.equal(I.t('Settings'), 'Settings', 'an untranslated string falls back to its English');
    assert.equal(I.t('Ready', 'panel.ready'), 'Lista'); assert.equal(I.t('Ready'), 'Ready', 'context entries are separate msgids');
    assert.equal(I.format('Talking with %s, turn %d/5', ['Bea', 3.9], flavor('characters')), 'Turno 3/5 con Bea');
    assert.equal(I.format('Talking with %s, turn %d/6', ['Bea', 3], flavor('characters')), 'Talking with Bea, turn 3/6', 'an untranslated sentence is English whole');
    assert.equal(I.format('Copied rhythm: %d taps', [1], flavor('rhythm')), 'Ritmo copiado: 1 golpe');
    assert.equal(I.format('Copied rhythm: %d taps', [5], flavor('rhythm')), 'Ritmo copiado: 5 golpes');
    assert.equal(I.format('Copied rhythm: %d taps', [1000000], flavor('rhythm')), 'Ritmo copiado: 1000000 de golpes', 'es "many"');
    assert.equal(I.format('%s added', ['table'], flavor('ending')), 'Mesa añadida');
    assert.equal(I.format('%s added', ['seats'], flavor('ending')), 'seats añadido');
    assert.equal(I.format('Step %.1f', [1.25], flavor('visits')), 'Paso 1.3', 'es-US decimals');
    assert.throws(() => I.format('Step %.1f', [], flavor('visits')), /Not enough arguments/, 'the visits flavor still throws on a missing argument');
    assert.equal(I.narrow('Go Meet %s'), 'Conocer a %s');
    assert.equal(I.html('Field notes'), 'Notas de campo');
    assert.equal(I.html('Map & notes'), '<span lang="en" dir="ltr">Map &amp; notes</span>', 'fallback English is marked lang="en"');
    assert.equal(I.list(['Bea', 'Dez', 'Thanh'], () => 'unused'), 'Bea, Dez y Thanh');
    assert.deepEqual(I.diagnostics().misses.sort(), ['Map & notes', 'Ready', 'Settings', 'Talking with %s, turn %d/6'].sort());
    const seen = []; I.onMiss((text, ctx) => seen.push([text, ctx ?? null]));
    I.t('Nope'); I.t('Ready', 'other.ctx'); I.onMiss(null);
    assert.deepEqual(seen, [['Nope', null], ['Ready', 'other.ctx']]);
  } finally { english(); }
  assert.equal(I.t('Field notes'), 'Field notes', 'back to English');
});

test('RTL isolates arguments and list items; Vietnamese and Arabic numbers; the Thai canvas font; the address form', () => {
  const ar = catalogOf('ar', { 'At %s': 'عند %s', 'Field notes': 'ملاحظات' }, { address: { f: { 'Field notes': 'ملاحظاتكِ' } } }).catalog;
  I.setLocale('ar', ar);
  try {
    assert.equal(I.isRTL(), true);
    assert.equal(I.format('At %s', ['361 Turk'], flavor('characters')), 'عند \u2068361 Turk\u2069');
    assert.equal(I.isolate('WASD / ↑↓←→'), '\u2068WASD / ↑↓←→\u2069');
    assert.equal(I.num(1234.5), '1234.5', 'ar-u-nu-latn: Western digits, no grouping');
    assert.equal(I.t('Field notes'), 'ملاحظات');
    I.setAddressForm('f'); assert.equal(I.t('Field notes'), 'ملاحظاتكِ');
    I.setAddressForm('x'); assert.equal(I.t('Field notes'), 'ملاحظات', 'an unknown form is no form');
    assert.match(I.list(['Bea', 'Dez'], () => ''), /\u2068Bea\u2069.*\u2068Dez\u2069/);
  } finally { english(); }
  I.setLocale('vi', catalogOf('vi', {}).catalog);
  try { assert.equal(I.num(1.5, { decimals: 1 }), '1,5'); assert.equal(I.num(1961), '1961'); assert.equal(I.isolate('x'), 'x'); } finally { english(); }
  I.setLocale('th', catalogOf('th', {}).catalog);
  try { assert.equal(I.canvasFont('600 11px "Segoe UI", sans-serif'), '600 11px "Segoe UI", "Leelawadee UI", "Tahoma", "Noto Sans Thai", sans-serif'); } finally { english(); }
});

test('setLocale refuses a catalog for another locale and an unknown code, falling back to English', () => {
  const es = catalogOf('es', { 'Field notes': 'Notas de campo' }).catalog;
  assert.equal(I.setLocale('vi', es), 'en');
  assert.equal(I.setLocale('zz', es), 'en');
  assert.equal(I.setLocale('es', es), 'es'); english();
});

// ------------------------------------------------------------------------------------------------- pseudo
test('pseudo is deterministic and keeps placeholders, markup, URLs, protected tokens, newlines, quotes and the envelope', () => {
  const samples = ['Field notes', 'Talking with %s (Turn %d/5) · %%', 'Bea: "Press E to talk, or Enter."', 'Two\nlines', '<kbd>WASD</kbd> or arrows', 'See https://example.org/x and datasf.org', '“A memory.”', 'Tenderloin Redux — A little room for good', '{name} arrives'];
  for (const text of samples) {
    const a = I.pseudo(text), b = I.pseudo(text), rtl = I.pseudo(text, { rtl: true });
    assert.equal(a, b, 'deterministic');
    assert.notEqual(a, text);
    assert.equal(I.checkText(text, a), null, `${text} -> ${a}`);
    assert.equal(I.checkText(text, rtl), null, `rtl ${text} -> ${rtl}`);
    assert.doesNotMatch(rtl.replace(/^Bea: /, '').replace(/%(\d+\$)?[sdf]|https?:\S+|[a-z.]+\.org|<[^>]+>|\{name\}|Tenderloin Redux|WASD|Enter|\bE\b/g, ''), /[A-Za-z]/, 'rtl leaves no Latin letter outside kept tokens');
  }
  assert.equal(I.pseudo('Bea: "Hi."'), 'Bea: "⟦Ĥí.··⟧"', 'the envelope stays; two letters expand ×2.0');
  assert.equal(I.pseudo('%s · %d'), '%s · %d', 'no letters: unchanged');
  const long = 'a'.repeat(40);
  assert.equal(I.pseudo(long).length, 40 + Math.ceil(40 * 0.4) + 2, '×1.4 beyond 30 letters');
  const json = I.pseudoCatalog(['Field notes', { msgid: 'Ready', ctx: 'panel.ready' }], 'qps-rtl'), data = JSON.parse(json);
  assert.equal(data.locale, 'qps-rtl'); assert.ok(data.context['panel.ready'].Ready);
  assert.deepEqual(I.readCatalog(json, 'qps-rtl').rejected, []);
});

// ------------------------------------------------------------------------------------------------- loading
const bytesOf = text => new TextEncoder().encode(text);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// A fake same-origin fetch over a map of path -> body (string, Uint8Array, or a function of the call count).
function fakeFetch(files, { type = 'basic', streamed = true } = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, ...options, signal: undefined });
    const base = url.split('?')[0], entry = files[base];
    if (entry === undefined) return { ok: false, status: 404, headers: { get: () => null } };
    const n = calls.filter(c => c.url.split('?')[0] === base).length, body = typeof entry === 'function' ? entry(n) : entry;
    if (body instanceof Error) throw body;
    const bytes = typeof body === 'string' ? bytesOf(body) : body;
    const response = { ok: true, status: 200, type, headers: { get: name => name === 'content-length' ? String(bytes.byteLength) : null } };
    if (streamed) { let done = false; response.body = { getReader: () => ({ read: async () => done ? { done: true } : (done = true, { done: false, value: bytes }), cancel: async () => {}, releaseLock() {} }) }; }
    else response.arrayBuffer = async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return response;
  };
  return { fetch, calls };
}
const ES = catalogJSON('es', { 'Field notes': 'Notas de campo' });
const manifestWith = (entries) => JSON.stringify({ format: 1, locales: entries });
const shippedEs = (body = ES, status = 'shipped') => manifestWith([{ code: 'es', endonym: 'Español', dir: 'ltr', status, coverage: 0.5, sha256: sha(bytesOf(body)) }]);

test('loadCatalog: same-origin requests, the manifest hash, one reload on a mismatch, then English', async () => {
  const { fetch, calls } = fakeFetch({ './locales/index.json': shippedEs(), './locales/es.json': ES });
  const ok = await I.loadCatalog('es', { fetch });
  assert.equal(ok.ok, true); assert.equal(ok.catalog.message('Field notes'), 'Notas de campo'); assert.equal(ok.preview, false);
  assert.deepEqual(calls.map(c => [c.url, c.cache, c.mode, c.credentials, c.redirect]), [
    ['./locales/index.json', 'no-cache', 'same-origin', 'same-origin', 'error'],
    [`./locales/es.json?h=${sha(bytesOf(ES)).slice(0, 12)}`, 'default', 'same-origin', 'same-origin', 'error'],
  ]);
  const stale = fakeFetch({ './locales/index.json': shippedEs(), './locales/es.json': n => n === 1 ? catalogJSON('es', {}) : ES });
  const healed = await I.loadCatalog('es', { fetch: stale.fetch });
  assert.equal(healed.ok, true); assert.deepEqual(stale.calls.map(c => c.cache), ['no-cache', 'default', 'reload']);
  const bad = fakeFetch({ './locales/index.json': shippedEs(), './locales/es.json': catalogJSON('es', {}) });
  assert.deepEqual([(await I.loadCatalog('es', { fetch: bad.fetch })).reason, bad.calls.length], ['hash', 3]);
  const unstreamed = fakeFetch({ './locales/index.json': shippedEs(), './locales/es.json': ES }, { streamed: false });
  assert.equal((await I.loadCatalog('es', { fetch: unstreamed.fetch })).ok, true);
});

test('loadCatalog never throws: every failure is a reason, and English stays', async () => {
  const reason = async (code, files, options = {}) => (await I.loadCatalog(code, { fetch: fakeFetch(files, options).fetch, ...(options.load ?? {}) })).reason;
  assert.equal(await reason('es', {}), 'fetch', 'no manifest');
  assert.equal(await reason('es', { './locales/index.json': '{' }), 'manifest');
  assert.equal(await reason('es', { './locales/index.json': manifestWith([]) }), 'not-listed');
  assert.equal(await reason('es', { './locales/index.json': shippedEs(ES, 'preview'), './locales/es.json': ES }), 'not-shipped');
  assert.equal(await reason('es', { './locales/index.json': shippedEs(), './locales/es.json': new Error('offline') }), 'fetch');
  assert.equal(await reason('es', { './locales/index.json': shippedEs(), './locales/es.json': ES }, { type: 'cors' }), 'fetch', 'a cross-origin response is refused');
  const invalid = new Uint8Array([0x7b, 0xff, 0x7d]);
  assert.equal(await reason('es', { './locales/index.json': manifestWith([{ code: 'es', status: 'shipped', sha256: sha(invalid) }]), './locales/es.json': invalid }), 'fetch', 'invalid UTF-8');
  const huge = 'x'.repeat(I.MAX_CATALOG_BYTES + 1);
  assert.equal(await reason('es', { './locales/index.json': shippedEs(huge), './locales/es.json': huge }), 'too-large');
  assert.equal(await reason('es', { './locales/index.json': shippedEs(huge), './locales/es.json': huge }, { streamed: false }), 'too-large');
  const wrong = catalogJSON('vi', {});
  assert.equal(await reason('es', { './locales/index.json': shippedEs(wrong), './locales/es.json': wrong }), 'locale');
  assert.equal(await reason('zz', {}), 'unknown-locale'); assert.equal(await reason('en', {}), 'unknown-locale');
  assert.equal(await reason('qps-ploc', {}), 'not-shipped', 'a pseudo-locale needs preview');
  assert.equal((await I.loadCatalog('es', { fetch: null })).reason, 'no-fetch');
  assert.equal(I.locale(), 'en');
});

test('loadCatalog: preview admits a listed locale that is not shipped, and pseudo-locales only then', async () => {
  const P = I.pseudoCatalog(['Field notes'], 'qps-ploc');
  const files = { './locales/index.json': manifestWith([{ code: 'qps-ploc', status: 'preview', sha256: sha(bytesOf(P)) }, { code: 'es', status: 'draft', sha256: sha(bytesOf(ES)) }]), './locales/qps-ploc.json': P, './locales/es.json': ES };
  const p = await I.loadCatalog('qps-ploc', { fetch: fakeFetch(files).fetch, preview: true });
  assert.equal(p.ok, true); assert.equal(p.preview, true);
  assert.equal((await I.loadCatalog('es', { fetch: fakeFetch(files).fetch, preview: true })).ok, true);
  assert.equal((await I.loadCatalog('es', { fetch: fakeFetch(files).fetch })).reason, 'not-shipped');
});

test('loadCatalog and loadManifest time out on an injected timer; a hung fetch never blocks', async () => {
  let fire = null, cleared = 0, aborted = false;
  const setTimer = (fn, ms) => { assert.equal(ms, I.LOAD_TIMEOUT_MS); fire = fn; return 7; }, clearTimer = id => { assert.equal(id, 7); cleared++; };
  const hung = (url, options) => new Promise(() => { options.signal?.addEventListener('abort', () => { aborted = true; }); });
  const pending = I.loadCatalog('es', { fetch: hung, setTimer, clearTimer });
  await Promise.resolve(); fire();
  assert.deepEqual(await pending, { ok: false, code: 'es', reason: 'timeout' });
  assert.equal(aborted, true); assert.equal(cleared, 1);
  const manifest = I.loadManifest({ fetch: hung, setTimer, clearTimer });
  await Promise.resolve(); fire();
  assert.equal(await manifest, null);
  assert.deepEqual((await I.loadManifest({ fetch: fakeFetch({ './locales/index.json': shippedEs() }).fetch })).locales.map(l => [l.code, l.status]), [['es', 'shipped']]);
  assert.equal(await I.loadManifest({ fetch: fakeFetch({}).fetch }), null);
});

test('readManifest keeps only valid, known, unique entries; shippedLocales lists the shipped real locales', () => {
  const good = sha(bytesOf('x'));
  const m = I.readManifest(manifestWith([
    { code: 'es', status: 'shipped', sha256: good, coverage: 1 }, { code: 'es', status: 'draft', sha256: good },
    { code: 'en', status: 'shipped', sha256: good }, { code: 'zz', status: 'shipped', sha256: good }, { code: 'vi', status: 'live', sha256: good },
    { code: 'ar', status: 'shipped', sha256: 'abc' }, { code: '__proto__', status: 'shipped', sha256: good }, { code: 'th', status: 'preview', sha256: good, coverage: 7 },
    { code: 'qps-rtl', status: 'shipped', sha256: good },
  ]));
  assert.deepEqual(m.locales.map(l => [l.code, l.status, l.coverage]), [['es', 'shipped', 1], ['th', 'preview', 0], ['qps-rtl', 'shipped', 0]]);
  assert.deepEqual(I.shippedLocales(m), ['es'], 'a pseudo-locale is never offered');
  assert.equal(I.readManifest('[]'), null); assert.equal(I.readManifest(' '.repeat(I.MAX_MANIFEST_BYTES + 1)), null);
  assert.deepEqual(I.shippedLocales(null), []);
});

test('a stale response after a newer switch applies nothing (request tokens)', async () => {
  const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
  const loads = {}, applied = [];
  const switcher = I.createSwitcher({ load: code => (loads[code] = deferred()).promise, apply: (result, code) => applied.push(code) });
  const first = switcher.switchTo('es'), second = switcher.switchTo('vi');
  loads.es.resolve({ ok: true, code: 'es' });
  assert.equal((await first).stale, true);
  assert.deepEqual(applied, [], 'the older switch draws nothing');
  loads.vi.resolve({ ok: true, code: 'vi' });
  assert.equal((await second).stale, false);
  assert.deepEqual(applied, ['vi']);
  const third = switcher.switchTo('ar'); switcher.cancel(); loads.ar.resolve({ ok: true });
  assert.equal((await third).stale, true); assert.deepEqual(applied, ['vi']);
  const failing = I.createSwitcher({ load: async () => { throw Error('boom'); }, apply: (result) => applied.push(result.reason) });
  assert.equal((await failing.switchTo('es')).reason, 'error'); assert.deepEqual(applied, ['vi', 'error']);
});

// ------------------------------------------------------------------------------------------------- settings, startup, offer
test('settings: a hostile stored language, offer or address form is absent (English); only own known values are kept', () => {
  const hostile = [42, 'xx', '', 'EN', 'es-MX', '__proto__', 'constructor', 'toString', 'x'.repeat(1e6), null, ['es'], { es: true }, 'qps-ploc', 'qps-rtl'];
  for (const language of hostile) assert.deepEqual(I.readLanguageSettings({ language, languageOffer: 'yes', addressForm: 'n' }), {}, JSON.stringify(language)?.slice(0, 40));
  for (const stored of [null, undefined, 'es', 7, ['es'], Object.create({ language: 'es' })]) assert.deepEqual(I.readLanguageSettings(stored), {});
  assert.deepEqual(I.readLanguageSettings(JSON.parse('{"__proto__":{"language":"es"}}')), {}, 'a JSON __proto__ key is an own key, not a language');
  assert.deepEqual(I.readLanguageSettings({ language: 'ar', languageOffer: 'declined', addressForm: 'f', volume: 0.5 }), { language: 'ar', languageOffer: 'declined', addressForm: 'f' });
  for (const code of I.STORABLE) assert.equal(I.readLanguageSettings({ language: code }).language, code);
});

// game.js reads settings as below and saveSettings() writes the whole object: with no valid language the bytes written are
// today's, and a valid one rides along with every other preference.
test('settings load and save: the stored JSON is unchanged without a language, and keeps every field with one', () => {
  assert.match(GAME, /\n {2}settings\.experimental\.neighborhoodVoices = stored\.experimental\?\.neighborhoodVoices === true;\n {2}\/\/ [^\n]*\n {2}Object\.assign\(settings, readLanguageSettings\(stored\)\);\n\} catch/);
  assert.match(GAME, /\nfunction saveSettings\(\) \{ try \{ localStorage\.setItem\(SETTINGS_KEY, JSON\.stringify\(settings\)\); \}/, 'saveSettings() is unchanged');
  const load = stored => { const settings = { volume: 0.7, rewardSounds: true, reducedMotion: false, experimental: { neighborhoodVoices: false } }; Object.assign(settings, I.readLanguageSettings(stored)); return JSON.stringify(settings); };
  const today = JSON.stringify({ volume: 0.7, rewardSounds: true, reducedMotion: false, experimental: { neighborhoodVoices: false } });
  for (const language of [undefined, 'xx', 42, '__proto__', 'x'.repeat(1e5)]) assert.equal(load({ language }), today);
  assert.equal(load({ language: 'es', languageOffer: 'declined' }), today.slice(0, -1) + ',"language":"es","languageOffer":"declined"}');
  // Only the fork settings key holds a language: i18n.js touches no storage, and game.js writes only its two keys.
  const I18N = read('browser-next/i18n.js');
  assert.doesNotMatch(I18N, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.deepEqual([...GAME.matchAll(/localStorage\.setItem\((\w+)/g)].map(m => m[1]).sort(), [...new Set([...GAME.matchAll(/localStorage\.setItem\((\w+)/g)].map(m => m[1]))].sort());
  assert.deepEqual([...new Set([...GAME.matchAll(/localStorage\.setItem\((\w+)/g)].map(m => m[1]))].sort(), ['SAVE_KEY', 'SETTINGS_KEY']);
  assert.doesNotMatch(GAME, /settings\.language[^=\n]*buildGodotSave|buildGodotSave\([^)]*settings/, 'the shared save never receives the settings');
});

test('startup: the URL for links and QA (never stored), then the stored language, else English with an offer candidate', () => {
  const S = I.resolveStartup;
  assert.deepEqual(S(), { code: 'en', source: 'none', preview: false, offer: null });
  assert.deepEqual(S({ search: '?lang=es' }), { code: 'es', source: 'url', preview: false, offer: null });
  assert.deepEqual(S({ search: '?lang=ar&preview=1' }), { code: 'ar', source: 'url', preview: true, offer: null });
  assert.deepEqual(S({ search: '?lang=EN', stored: { language: 'es' } }), { code: 'en', source: 'url', preview: false, offer: null });
  for (const search of ['?lang=zz', '?lang=qps-ploc', '?lang=__proto__', `?lang=${'e'.repeat(5000)}`, '?lang=', 42, null]) assert.deepEqual(S({ search }), { code: 'en', source: 'none', preview: false, offer: null }, String(search).slice(0, 30));
  assert.equal(S({ search: '?lang=qps-rtl&preview=1' }).code, 'qps-rtl', 'pseudo-locales only with preview');
  assert.deepEqual(S({ search: '?lang=zz', stored: { language: 'vi' } }), { code: 'vi', source: 'stored', preview: false, offer: null });
  assert.equal(S({ stored: { language: 'xx' }, languages: ['en-US'] }).code, 'en');
  assert.equal(S({ languages: ['es-MX', 'en'] }).offer, 'es');
  assert.equal(S({ languages: ['fr-FR', 'vi'] }).offer, 'vi');
  assert.equal(S({ languages: ['en-US', 'es'] }).offer, null, 'English preferred first: no offer');
  assert.equal(S({ languages: ['es'], stored: { languageOffer: 'declined' } }).offer, null);
  assert.equal(S({ languages: ['es'], stored: { language: 'en' } }).offer, null);
  assert.equal(S({ languages: 'es' }).offer, null); assert.equal(S({ languages: [7, 'th-TH'] }).offer, 'th');
});

test('the first-run offer appears only for a shipped locale with nothing chosen, and choosing is the player\'s', () => {
  const O = I.offerFor;
  assert.equal(O({ offer: 'es', shipped: ['es'] }), 'es');
  assert.equal(O({ offer: 'es', shipped: [] }), null, 'no shipped locale, no offer (today)');
  assert.equal(O({ offer: 'es', shipped: ['vi'] }), null);
  assert.equal(O({ offer: 'es', shipped: ['es'], settings: { language: 'en' } }), null);
  assert.equal(O({ offer: 'es', shipped: ['es'], settings: { languageOffer: 'declined' } }), null);
  assert.equal(O({ offer: 'es', shipped: ['es'], current: 'es' }), null);
  assert.equal(O({ offer: 'qps-ploc', shipped: ['qps-ploc'] }), null);
  assert.equal(O({ offer: null, shipped: ['es'] }), null);
  assert.deepEqual(I.offerParts('es'), { own: '', english: 'Play in Spanish?' }, 'English bootstrap only until review');
  assert.equal(I.offerParts('en'), null); assert.equal(I.offerParts('qps-rtl'), null);
  // game.js: the offer only loads the manifest; the locale changes only from the accept button or the Settings select.
  const start = /\nfunction startLocale\(\) \{\n([\s\S]*?)\n\}\n/.exec(GAME)[1];
  assert.match(start, /if \(startupLocale\.offer\) loadManifest\(\)\.then\(manifest => \{ shippedCodes = shippedLocales\(manifest\); offerLate\(\); \}\);/, 'the offer only reads the manifest');
  assert.equal(start.split('switchTo(').length - 1, 1, 'startLocale switches only for a URL or stored language');
  assert.deepEqual([...GAME.matchAll(/chooseLanguage\(/g)].length, 3, 'chooseLanguage: its declaration, the accept button and the Settings select');
  assert.match(GAME, /bind\('language-accept', \(\) => \{ done\(\); chooseLanguage\(code\); \}\);/);
  assert.match(GAME, /\$\('#language'\)\?\.addEventListener\('change', event => chooseLanguage\(event\.target\.value\)\);/);
  assert.match(GAME, /\$\{button\(id, card\.button, true\)\}<\/div>\$\{startup \? languageOfferHTML\(\) : ''\}/, 'the offer row sits under Start Exploring, which keeps the focus');
});

test('the Settings language row: none while only English exists; English, the shipped locales and an active preview', () => {
  assert.deepEqual(I.languageChoices([], 'en'), [], 'zero shipped locales: no row, so Settings is byte-identical');
  assert.deepEqual(I.languageChoices(['es', 'zz', 'qps-ploc', 'es'], 'en'), ['en', 'es']);
  assert.deepEqual(I.languageChoices([], 'qps-rtl'), ['en', 'qps-rtl'], 'a preview session can go back to English');
  assert.deepEqual(I.languageChoices(['es'], 'vi'), ['en', 'es', 'vi']);
  assert.equal(I.languageLabel('en'), 'Language');
  assert.equal(I.languageLabel('es'), 'Language', 'English bootstrap until review: no doubled label');
  const row = /\nfunction languageRowHTML\(\) \{\n([\s\S]*?)\n\}\n/.exec(GAME)[1];
  assert.match(row, /if \(!codes\.length\) return '';/);
  assert.match(row, /data-settings/, 'the row carries the [data-settings] marker the async re-render checks');
  assert.match(GAME, /if \(modal\.open && body\.querySelector\('\[data-settings\]'\)\) \{ showSettings\(\);/);
  // The title is GAME_TEXT.showSettings.yourAfternoon, "Your afternoon." (docs/I18N_PLAN.md I2a).
  assert.match(GAME, /<h2 id="modal-title">\$\{t\(GAME_TEXT\.showSettings\.yourAfternoon\)\}<\/h2>\$\{languageRowHTML\(\)\}<label class="settings-row" for="volume">/);
});

test('bootstrap strings: English for every key, and a locale without its own falls back to them', () => {
  assert.deepEqual(Object.keys(I.BOOT), ['en'], 'no locale\'s bootstrap strings before its review');
  assert.equal(I.boot('failed', 'es', 'Español'), 'Español could not load; continuing in English.');
  assert.equal(I.boot('switched', 'ar', 'العربية'), 'Language: العربية');
  assert.equal(I.boot('nope', 'es'), '');
  for (const code of Object.keys(I.LOCALES)) {
    const meta = I.LOCALES[code];
    assert.deepEqual(new Intl.PluralRules(meta.intl).resolvedOptions().pluralCategories.slice().sort(), [...meta.plurals].sort(), `${code} plural categories`);
    assert.equal(meta.dir, code === 'ar' ? 'rtl' : 'ltr');
  }
});

// ------------------------------------------------------------------------------------------------- <html lang dir> and the title
function fakeDocument() {
  const attrs = new Map([['lang', 'en']]);
  const node = (text, extra = {}) => { const a = new Map(Object.entries(extra)); return { textContent: text, hasAttribute: k => a.has(k), getAttribute: k => a.get(k) ?? null, setAttribute: (k, v) => a.set(k, String(v)), attrs: a }; };
  const nodes = [node('Field notes', { 'data-i18n': '' }), node('', { 'data-i18n-attr': 'aria-label onclick', 'aria-label': 'Settings', onclick: 'x' })];
  return {
    title: 'Tenderloin Redux — A little room for good', nodes,
    documentElement: { setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k), attrs },
    querySelectorAll: selector => selector === '[data-i18n]' ? [nodes[0]] : [nodes[1]],
  };
}
test('applyDocument sets lang, dir, the title and [data-i18n] nodes, and English restores them', () => {
  const doc = fakeDocument(), title = doc.title;
  const ar = catalogOf('ar', { 'Field notes': 'ملاحظات', Settings: 'الإعدادات', 'Tenderloin Redux — A little room for good': 'Tenderloin Redux — مساحة صغيرة للخير' }).catalog;
  I.setLocale('ar', ar);
  try {
    I.applyDocument(doc, { title });
    assert.deepEqual(Object.fromEntries(doc.documentElement.attrs), { lang: 'ar', dir: 'rtl' });
    assert.equal(doc.title, 'Tenderloin Redux — مساحة صغيرة للخير');
    assert.equal(doc.nodes[0].textContent, 'ملاحظات'); assert.equal(doc.nodes[0].attrs.get('data-i18n-en'), 'Field notes');
    assert.equal(doc.nodes[1].attrs.get('aria-label'), 'الإعدادات'); assert.equal(doc.nodes[1].attrs.get('onclick'), 'x', 'only text attributes');
  } finally { english(); }
  I.applyDocument(doc, { title });
  assert.deepEqual(Object.fromEntries(doc.documentElement.attrs), { lang: 'en' });
  assert.equal(doc.title, title); assert.equal(doc.nodes[0].textContent, 'Field notes'); assert.equal(doc.nodes[1].attrs.get('aria-label'), 'Settings');
  I.setLocale('qps-ploc', null, { preview: true });
  try { I.applyDocument(doc, { title }); assert.deepEqual(Object.fromEntries(doc.documentElement.attrs), { lang: 'en', dir: 'ltr' }); assert.equal(I.diagnostics().preview, true); } finally { english(); }
  // game.js applies the document only through adoptLocale, so an English start never touches <html> or the title.
  assert.equal(GAME.split('applyDocument(').length - 1, 1);
  assert.match(GAME, /if \(activeLocale\(\) !== before\) applyLocale\(\);/);
});

// ------------------------------------------------------------------------------------------------- event.code (D13)
// The probe-keys.mjs cases: the D key as a US, Arabic 101 and Thai Kedmanee layout report it, and the arrow.
test('inputKey: a typed Latin letter keeps its identity; a non-Latin key at KeyW/A/S/D/E or an arrow maps by position', () => {
  const cases = [
    [{ key: 'd', code: 'KeyD' }, 'd'], [{ key: 'ي', code: 'KeyD' }, 'd'], [{ key: 'ก', code: 'KeyD' }, 'd'], [{ key: 'ArrowRight', code: 'ArrowRight' }, 'arrowright'],
    [{ key: 'ص', code: 'KeyW' }, 'w'], [{ key: 'ش', code: 'KeyA' }, 'a'], [{ key: 'س', code: 'KeyS' }, 's'], [{ key: 'ث', code: 'KeyE' }, 'e'], [{ key: 'ไ', code: 'KeyW' }, 'w'],
    [{ key: 'D', code: 'KeyD', shiftKey: true }, 'd'], [{ key: 'W', code: 'KeyW' }, 'w'],
    // Latin layouts keep the letters as typed, as before I1: AZERTY, Dvorak, Colemak.
    [{ key: 'z', code: 'KeyW' }, 'z'], [{ key: 'q', code: 'KeyA' }, 'q'], [{ key: 'a', code: 'KeyQ' }, 'a'], [{ key: 'w', code: 'KeyZ' }, 'w'],
    [{ key: 'd', code: 'KeyH' }, 'd'], [{ key: 'e', code: 'KeyD' }, 'e'], [{ key: 'o', code: 'KeyS' }, 'o'], [{ key: '.', code: 'KeyE' }, 'e'], // Dvorak
    [{ key: 's', code: 'KeyD' }, 's'], [{ key: 'r', code: 'KeyS' }, 'r'], [{ key: 'f', code: 'KeyE' }, 'f'], // Colemak
    // AltGr and IME input keep their typed identity.
    [{ key: 'ą', code: 'KeyA', ctrlKey: true, altKey: true }, 'ą'], [{ key: 'ś', code: 'KeyS', getModifierState: m => m === 'AltGraph' }, 'ś'], [{ key: 'ę', code: 'KeyE', ctrlKey: true, altKey: true }, 'ę'],
    [{ key: 'Process', code: 'KeyW' }, 'process'], [{ key: 'ص', code: 'KeyW', keyCode: 229 }, 'ص'], [{ key: 'Process', code: 'KeyW', isComposing: true }, 'process'],
    [{ key: 'Enter', code: 'Enter' }, 'enter'], [{ key: 'Enter', code: 'NumpadEnter' }, 'enter'], [{ key: 'Escape', code: 'Escape' }, 'escape'],
    [{ key: 'ArrowUp', code: 'Numpad8' }, 'arrowup'], [{ key: 'e', code: '' }, 'e'], [{ key: 'w' }, 'w'],
    [{ key: 'Unidentified', code: 'KeyD' }, 'd'], [{ code: 'KeyD' }, 'd'], [{}, ''], [null, ''],
  ];
  for (const [event, want] of cases) assert.equal(I.inputKey(event), want, JSON.stringify(event));
});

// game.js's keydown and keyup listeners, evaluated as they stand over stand-ins for the page.
function keyboardHarness({ modalOpen = false, focused = 'CANVAS', startupCard = false } = {}) {
  const block = /\nwindow\.addEventListener\('keydown', event => \{\n {2}\/\/ D13[\s\S]*?\nwindow\.addEventListener\('keyup', [^\n]*\n/.exec(GAME)[0];
  const listeners = {}, calls = [], keys = new Set(), heldCodes = new Map();
  const win = { addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn); } };
  const page = { modal: { open: modalOpen }, world: { nearest: () => ({ id: 'bea' }) }, startupContinue: startupCard ? () => calls.push('continue') : null };
  const doc = { activeElement: { tagName: focused, isContentEditable: false } };
  const body = { querySelector: () => startupCard ? {} : null };
  const MOVE_KEYS = /\nconst MOVE_KEYS = (\[[^\n]*\]);/.exec(GAME)[1];
  const run = new Function('window', 'inputKey', 'keys', 'heldCodes', 'page', 'document', 'body', 'stopWalk', 'interact', 'toast',
    `const MOVE_KEYS = ${MOVE_KEYS}; let walkOnClose = null; const modal = page.modal, world = page.world, startupContinue = page.startupContinue;\n${block}\nreturn { get walkOnClose() { return walkOnClose; } };`);
  const state = run(win, I.inputKey, keys, heldCodes, page, doc, body, () => calls.push('stop'), (o, how) => calls.push(`interact ${o.id} ${how}`), text => calls.push(`toast ${text}`));
  const fire = (type, init) => { const event = { repeat: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...init }; for (const fn of listeners[type]) fn(event); return event; };
  return { keys, heldCodes, calls, state, page, doc, down: init => fire('keydown', init), up: init => fire('keyup', init) };
}
test('game.js walks and talks by position: a non-Latin key walks, and the keyup releases it', () => {
  const h = keyboardHarness();
  assert.equal(h.down({ key: 'ي', code: 'KeyD' }).defaultPrevented, true);
  assert.deepEqual([...h.keys], ['d'], 'Arabic D walks right');
  h.up({ key: 'ي', code: 'KeyD' }); assert.deepEqual([...h.keys], []);
  h.down({ key: 'ก', code: 'KeyW' }); h.down({ key: 'ArrowLeft', code: 'ArrowLeft' }); assert.deepEqual([...h.keys].sort(), ['arrowleft', 'w']);
  h.up({ key: 'ArrowLeft', code: 'ArrowLeft' }); h.up({ key: 'ไ', code: 'KeyW' }); assert.deepEqual([...h.keys], []);
  h.down({ key: 'ث', code: 'KeyE' }); assert.deepEqual(h.calls, ['stop', 'interact bea talk'], 'Arabic E talks');
  h.down({ key: 'Enter', code: 'Enter', repeat: true }); assert.deepEqual(h.calls, ['stop', 'interact bea talk'], 'a held Enter talks once');
});
test('game.js: a movement key held while the layout changes is released by its physical key', () => {
  const h = keyboardHarness();
  h.down({ key: 'a', code: 'KeyQ' }); // AZERTY's A walks left by its letter
  assert.deepEqual([...h.keys], ['a']);
  h.up({ key: 'q', code: 'KeyQ' }); // the layout switched to US while it was held
  assert.deepEqual([...h.keys], [], 'no stuck key');
  h.down({ key: 'd', code: 'KeyD' }); h.up({ key: 'ي', code: 'KeyD' }); assert.deepEqual([...h.keys], []);
  assert.equal(h.heldCodes.size, 0);
});
test('game.js on a US layout is unchanged: repeats, typing, dialogs, the startup card and E/Enter', () => {
  const h = keyboardHarness();
  h.down({ key: 'w', code: 'KeyW', repeat: true }); assert.deepEqual([...h.keys], [], 'a repeat of a key not walking does not walk');
  h.down({ key: 'w', code: 'KeyW' }); h.down({ key: 'w', code: 'KeyW', repeat: true }); assert.deepEqual([...h.keys], ['w']);
  h.down({ key: 'W', code: 'KeyW', shiftKey: true }); assert.deepEqual([...h.keys], ['w']);
  h.up({ key: 'W', code: 'KeyW' }); assert.deepEqual([...h.keys], []);
  h.down({ key: 'Enter', code: 'Enter' }); assert.deepEqual(h.calls, ['stop', 'interact bea talk']);
  h.doc.activeElement = { tagName: 'BUTTON' }; h.down({ key: 'e', code: 'KeyE' }); assert.deepEqual(h.calls, ['stop', 'interact bea talk'], 'E on a focused button does not interact');
  const typing = keyboardHarness({ focused: 'INPUT' });
  assert.equal(typing.down({ key: 'ي', code: 'KeyD' }).defaultPrevented, false); assert.deepEqual([...typing.keys], [], 'typing in an input never walks');
  const dialog = keyboardHarness({ modalOpen: true });
  dialog.down({ key: 'd', code: 'KeyD' }); dialog.down({ key: 'e', code: 'KeyE' }); assert.deepEqual([[...dialog.keys], dialog.calls], [[], []], 'a dialog keeps its keys');
  const card = keyboardHarness({ modalOpen: true, startupCard: true });
  assert.equal(card.down({ key: 'ي', code: 'KeyD' }).defaultPrevented, true);
  assert.deepEqual([card.calls, card.state.walkOnClose], [['continue'], 'd'], 'an Arabic D on the startup card starts and walks once it closes');
  card.up({ key: 'd', code: 'KeyD' }); assert.equal(card.state.walkOnClose, null, 'released before the card closed: no walk');
});

// ------------------------------------------------------------------------------------------------- review fixes
test('?lang= is case-insensitive and accepts region tags; pseudo-locales still need preview', () => {
  const S = search => I.resolveStartup({ search });
  for (const [search, code] of [['?lang=ES', 'es'], ['?lang=es-US', 'es'], ['?lang=es_MX', 'es'], ['?lang=Vi-VN', 'vi'], ['?lang=AR', 'ar'], ['?lang=en-GB', 'en'], ['?lang=qps', 'en'], ['?lang=qps-ploc', 'en'], ['?lang=QPS-RTL&preview=1', 'qps-rtl'], ['?lang=zz-ES', 'en']]) assert.equal(S(search).code, code, search);
  assert.equal(S('?lang=es-US').source, 'url');
});

test('a stored language is saved only after a successful load, and dropped only when the manifest no longer ships it', () => {
  const after = I.storedLanguageAfter;
  assert.equal(after({ ok: true }, { source: 'choice', code: 'es', storable: true }), 'es');
  assert.equal(after({ ok: true }, { source: 'choice', code: 'en', storable: true }), 'en');
  for (const reason of ['fetch', 'timeout', 'not-shipped', 'hash']) assert.equal(after({ ok: false, reason }, { source: 'choice', code: 'es', storable: true }), undefined, `a failed choice is not stored (${reason})`);
  assert.equal(after({ ok: true }, { source: 'choice', code: 'qps-rtl', storable: true }), undefined, 'a pseudo-locale is never stored');
  assert.equal(after({ ok: true }, { source: 'choice', code: 'es', storable: false }), undefined, 'a preview locale is not stored');
  for (const reason of ['not-listed', 'not-shipped', 'unknown-locale']) assert.equal(after({ ok: false, reason }, { source: 'stored', code: 'es' }), null, reason);
  for (const reason of ['fetch', 'timeout', 'hash', 'manifest', 'json', 'too-large', 'error']) assert.equal(after({ ok: false, reason }, { source: 'stored', code: 'es' }), undefined, `a transient ${reason} keeps it`);
  assert.equal(after({ ok: false, reason: 'not-shipped', stale: true }, { source: 'stored', code: 'es' }), undefined);
  assert.equal(after({ ok: true }, { source: 'stored', code: 'es' }), undefined);
  assert.equal(after({ ok: false, reason: 'not-shipped' }, { source: 'url', code: 'es' }), undefined, 'a URL language is never stored or cleared');
  // game.js: the choice is saved in the load's then, never before; a stored start applies the same rule.
  const choose = /\nfunction chooseLanguage\(code\) \{\n([\s\S]*?)\n\}\n/.exec(GAME)[1];
  assert.ok(choose.indexOf('saveSettings()') > choose.indexOf('.then(result =>'), 'chooseLanguage saves after the load');
  assert.match(choose, /storedLanguageAfter\(result, \{ source: 'choice', code,/);
  assert.match(GAME, /storedLanguageAfter\(result, \{ source: startupLocale\.source, code: startupLocale\.code \}\)/);
  assert.match(GAME, /if \(next === null\) \{ delete settings\.language; saveSettings\(\); \}/);
});

test('startup awaits only a URL or stored language, capped; the offer manifest never holds the Loading screen', () => {
  const start = /\nfunction startLocale\(\) \{\n([\s\S]*?)\n\}\n/.exec(GAME)[1];
  assert.match(start, /if \(startupLocale\.offer\) loadManifest\(\)\.then\(manifest => \{ shippedCodes = shippedLocales\(manifest\); offerLate\(\); \}\);\n {2}return null;/, 'the offer manifest is not returned, so init does not wait for it');
  assert.match(GAME, /if \(localeReady\) await startupWait\(localeReady\);/);
  const wait = /\nfunction startupWait\(ready\) \{\n([\s\S]*?)\n\}\n/.exec(GAME)[1];
  assert.match(wait, /setTimeout\(\(\) => \{ localeSwitcher\.cancel\(\);/, 'on the cap a late catalog is ignored: startup goes on in English');
  assert.match(wait, /clearTimeout\(timer\)/);
  const late = /\nfunction offerLate\(\) \{\n([\s\S]*?)\n\}\n/.exec(GAME)[1];
  assert.match(late, /\[data-chapter-card\] #begin/, 'a late offer joins only an open startup card');
  assert.match(late, /\[data-language-offer\]/, 'and only once');
});

test('every place that clears the held keys clears their physical keys too', () => {
  assert.doesNotMatch(GAME.replace(/const releaseKeys = \(\) => \{ keys\.clear\(\); heldCodes\.clear\(\); \};/, ''), /keys\.clear\(\)/, 'keys are released only through releaseKeys()');
  for (const site of [/window\.addEventListener\('blur', \(\) => releaseKeys\(\)\);/, /if \(document\.hidden\) \{ releaseKeys\(\);/, /modalReturnTarget = canvas; releaseKeys\(\); modal\.showModal\(\);/, /modal\.addEventListener\('close', \(\) => \{ const kept = \[\.\.\.heldCodes\]\.filter\(\(\[, key\]\) => key === walkOnClose\); releaseKeys\(\);/]) assert.match(GAME, site);
});

test('markup: a translation keeps the English tags exactly and adds none of < > & " \'', () => {
  const ok = (source, translation) => assert.equal(I.checkText(source, translation), null, translation);
  const bad = (source, translation) => assert.equal(I.checkText(source, translation), 'markup', translation);
  ok('Press <kbd>E</kbd> to talk', 'Pulsa <kbd>E</kbd> para hablar');
  ok('Tom & Jerry say "hi"', 'Tom & Jerry dicen "hola"');
  ok("Jeffrey's lost LP", 'El LP perdido de Jeffrey');
  bad('Press <kbd>E</kbd> to talk', 'Pulsa <b>E</b> para hablar');
  bad('Read <a href="./notes">notes</a>', 'Lee <a href="https://evil.example">notas</a>');
  bad('Read <a href="./notes">notes</a>', 'Lee <a href="./notes" onclick="x()">notas</a>');
  bad('<em>A</em> and <strong>B</strong>', '<strong>B</strong> y <em>A</em>');
  bad('Plain', 'Plain <img src=x>');
  bad('Plain text', 'Texto " onmouseover=alert(1) x="');
  bad('Plain text', "Texto ' plano");
  bad('Plain text', 'Texto &lt;script&gt;');
  bad('Fish & chips', 'Pescado & papas & más');
});

test('setLocale takes only a catalog readCatalog made, so no unvalidated text can become active', () => {
  const forged = Object.freeze({ locale: 'es', size: 1, message: () => '<img src=x onerror=alert(1)>', context: () => undefined, narrow: () => undefined, address: () => undefined, keys: () => [] });
  assert.equal(I.setLocale('es', forged), 'en');
  assert.equal(I.t('Field notes'), 'Field notes');
  const real = catalogOf('es', { 'Field notes': 'Notas de campo' }).catalog;
  assert.equal(I.setLocale('es', real), 'es'); english();
});

test('tHTML escapes t(): in English it equals game.js esc(), in a locale it escapes the translation', () => {
  english();
  for (const text of ['Field notes', 'Tom & "Jerry" <3']) assert.equal(I.tHTML(text), I.escapeHTML(text));
  I.setLocale('es', catalogOf('es', { 'Tom & Jerry': 'Tom & Jerry juntos' }).catalog);
  try { assert.equal(I.tHTML('Tom & Jerry'), 'Tom &amp; Jerry juntos'); assert.equal(I.tHTML('A <b>'), 'A &lt;b&gt;'); } finally { english(); }
});
