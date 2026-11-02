// Localization for the 2D edition (docs/I18N_PLAN.md, I1). English is the identity: with no catalog every function returns
// today's value through today's code path. Catalogs are same-origin JSON under ./locales/, keyed by the exact English text the
// 2D edition shows (after webLine, web or webText), with an optional context. Pure apart from the active locale it holds; the
// DOM helpers take the document they act on.

export const MAX_CATALOG_BYTES = 1024 * 1024;
export const MAX_MANIFEST_BYTES = 64 * 1024;
export const MAX_ENTRIES = 20000;
export const MAX_KEY_LENGTH = 4000;
export const LOAD_TIMEOUT_MS = 10000;

const PLURALS = (...forms) => Object.freeze(forms);
// The locales the architecture knows. A locale reaches players only when the manifest (./locales/index.json) lists it as
// shipped; until each locale's review its bootstrap strings are English (BOOT).
export const LOCALES = Object.freeze({
  en: Object.freeze({ code: 'en', endonym: 'English', english: 'English', html: 'en', intl: 'en-US', dir: 'ltr', plurals: PLURALS('one', 'other') }),
  es: Object.freeze({ code: 'es', endonym: 'Español', english: 'Spanish', html: 'es', intl: 'es-US', dir: 'ltr', plurals: PLURALS('one', 'many', 'other') }),
  vi: Object.freeze({ code: 'vi', endonym: 'Tiếng Việt', english: 'Vietnamese', html: 'vi', intl: 'vi-VN', dir: 'ltr', plurals: PLURALS('other') }),
  ar: Object.freeze({ code: 'ar', endonym: 'العربية', english: 'Arabic', html: 'ar', intl: 'ar-u-nu-latn', dir: 'rtl', plurals: PLURALS('zero', 'one', 'two', 'few', 'many', 'other'), address: true }),
  th: Object.freeze({ code: 'th', endonym: 'ไทย', english: 'Thai', html: 'th', intl: 'th-TH-u-ca-gregory', dir: 'ltr', plurals: PLURALS('other'), canvasFamilies: Object.freeze(['Leelawadee UI', 'Tahoma', 'Noto Sans Thai']) }),
});
// Test-only pseudo-locales: reachable only with ?lang=…&preview=1 and only when the manifest lists them, which production
// manifests never do. Never stored in settings.
export const PSEUDO_LOCALES = Object.freeze({
  'qps-ploc': Object.freeze({ code: 'qps-ploc', endonym: 'Pseudo', english: 'Pseudo', html: 'en', intl: 'en-US', dir: 'ltr', plurals: PLURALS('one', 'other'), pseudo: true }),
  'qps-rtl': Object.freeze({ code: 'qps-rtl', endonym: 'Pseudo RTL', english: 'Pseudo RTL', html: 'ar', intl: 'en-US', dir: 'rtl', plurals: PLURALS('one', 'other'), pseudo: true }),
});
// The codes a player's settings may hold.
export const STORABLE = Object.freeze(['en', 'es', 'vi', 'ar', 'th']);
const STORABLE_SET = new Set(STORABLE);
const ADDRESS_FORMS = new Set(['m', 'f']);
const metaOf = code => typeof code !== 'string' ? null : Object.hasOwn(LOCALES, code) ? LOCALES[code] : Object.hasOwn(PSEUDO_LOCALES, code) ? PSEUDO_LOCALES[code] : null;
export const localeMeta = code => metaOf(code);

// Bootstrap strings: needed before, or without, a catalog. English only until each locale's review adds its own.
export const BOOT = Object.freeze({
  en: Object.freeze({
    language: 'Language',
    offer: 'Play in %s?',
    accept: 'Play in %s',
    decline: 'Keep English',
    loading: 'Loading…',
    failed: '%s could not load; continuing in English.',
    preview: 'Preview translation',
    switched: 'Language: %s',
  }),
});
const sub = (template, ...args) => { let i = 0; return template.replace(/%s/g, () => String(args[i++])); };
// A bootstrap string in the locale, else English.
export function boot(key, code = active.code, ...args) {
  const own = Object.hasOwn(BOOT, code) && Object.hasOwn(BOOT[code], key) ? BOOT[code][key] : null;
  return sub(own ?? BOOT.en[key] ?? '', ...args);
}
// The first-run offer, in the locale (once reviewed) and in English: "¿Jugar en español? · Play in Spanish?". own is '' until
// the locale's bootstrap strings are reviewed.
export function offerParts(code) {
  const meta = metaOf(code); if (!meta || code === 'en' || meta.pseudo) return null;
  return { own: Object.hasOwn(BOOT, code) && BOOT[code].offer ? sub(BOOT[code].offer, meta.endonym) : '', english: sub(BOOT.en.offer, meta.english) };
}
// The locale to offer on the startup card, or null: a candidate from navigator.languages that the manifest ships, while no
// language is stored, the offer was not declined and the page is in English. Offering never switches.
export function offerFor({ offer = null, shipped = [], settings = {}, current = 'en' } = {}) {
  const own = readLanguageSettings(settings);
  if (!offer || !STORABLE_SET.has(offer) || offer === 'en' || current !== 'en' || own.language || own.languageOffer === 'declined') return null;
  return Array.isArray(shipped) && shipped.includes(offer) ? offer : null;
}
// The Settings language choices: English, the shipped locales, and the active locale (a preview) when it is not among them.
// Only English and the shipped locales ([] when none ships and the page is in English, so the row is not drawn).
export function languageChoices(shipped = [], current = 'en') {
  const codes = (Array.isArray(shipped) ? shipped : []).filter(code => code !== 'en' && Object.hasOwn(LOCALES, code));
  if (!codes.length && current === 'en') return [];
  const out = ['en', ...new Set(codes)];
  if (!out.includes(current) && metaOf(current)) out.push(current);
  return out;
}
// "Language" in the active language, plus " (Language)" when that is not English.
export function languageLabel(current = 'en') {
  const own = boot('language', current);
  return current !== 'en' && own !== BOOT.en.language ? `${own} (${BOOT.en.language})` : own;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Settings: the fork settings key holds language, languageOffer and addressForm. Only known values are accepted; anything else
// is absent, which means English and not chosen. The shared save gains nothing.
export function readLanguageSettings(stored) {
  const out = {};
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return out;
  const own = key => Object.hasOwn(stored, key) ? stored[key] : undefined;
  const language = own('language'), offer = own('languageOffer'), address = own('addressForm');
  if (typeof language === 'string' && STORABLE_SET.has(language)) out.language = language;
  if (offer === 'declined') out.languageOffer = 'declined';
  if (typeof address === 'string' && ADDRESS_FORMS.has(address)) out.addressForm = address;
  return out;
}

// What the game starts in. The URL (?lang=xx, &preview=1) is for links and QA and is never stored; then the stored language;
// otherwise English, with an offer candidate when navigator.languages prefers a known locale before any English. The game
// never switches on its own: the candidate is offered only if the manifest lists it as shipped.
export function resolveStartup({ stored = {}, search = '', languages = [] } = {}) {
  let params; try { params = new URLSearchParams(typeof search === 'string' ? search.slice(0, 2048) : ''); } catch { params = new URLSearchParams(); }
  const lang = params.get('lang'), preview = params.get('preview') === '1';
  if (typeof lang === 'string' && lang.length <= 16) {
    // Case-insensitive, and a region tag names its language (es-US and ES give es); pseudo-locales by their whole code.
    const lower = lang.toLowerCase(), code = Object.hasOwn(PSEUDO_LOCALES, lower) ? lower : lower.split(/[-_]/)[0];
    if (code === 'en') return { code: 'en', source: 'url', preview: false, offer: null };
    if ((Object.hasOwn(LOCALES, code) && !Object.hasOwn(PSEUDO_LOCALES, lower)) || (preview && Object.hasOwn(PSEUDO_LOCALES, code))) return { code, source: 'url', preview, offer: null };
  }
  const settings = readLanguageSettings(stored);
  if (settings.language) return { code: settings.language, source: 'stored', preview: false, offer: null };
  let offer = null;
  if (settings.languageOffer !== 'declined') {
    for (const tag of Array.isArray(languages) ? languages.slice(0, 16) : []) {
      if (typeof tag !== 'string') continue;
      const primary = tag.split(/[-_]/)[0].toLowerCase();
      if (primary === 'en') break;
      if (primary !== 'en' && STORABLE_SET.has(primary)) { offer = primary; break; }
    }
  }
  return { code: 'en', source: 'none', preview: false, offer };
}

// What a load result does to settings.language: a code to store, null to delete the field, or undefined to leave it.
// A choice (Settings, the offer) is stored only once its load succeeded, and only when it may be stored (English or a shipped
// locale). A stored language the manifest no longer lists, or no longer ships, is deleted so it does not fail on every start;
// a transient failure (network, timeout, a hash or catalog error) keeps it.
const GONE = new Set(['not-listed', 'not-shipped', 'unknown-locale']);
export function storedLanguageAfter(result, { source, code, storable = false } = {}) {
  if (source === 'choice') return result?.ok && storable && STORABLE_SET.has(code) ? code : undefined;
  if (source === 'stored') return !result?.ok && !result?.stale && GONE.has(result?.reason) ? null : undefined;
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Validation (readCatalog). An invalid envelope rejects the whole catalog; an invalid entry is dropped and that string falls
// back to English.
const PROTECTED = Object.freeze(['Tenderloin Redux', 'WASD', 'Enter', 'Esc', 'Shift', 'F5', 'BPM', 'E']);
const SPEC = /%(?:(\d+)\$)?(s|d|f|\.(\d+)f)/g;
const NAMED = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const URLISH = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|gov|edu|io|dev|app|us|info|ca)\b/gi;
// Cc controls other than \n, bidi embeddings and overrides, line and paragraph separators, BOM and interlinear marks, ALM and
// the deprecated format controls. Isolates (U+2066-2069), LRM and RLM stay allowed, and so do ZWSP, ZWNJ and ZWJ.
const CONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2028\u2029\uFEFF\uFFF9-\uFFFB\u061C\u206A-\u206F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const ENVELOPE = /^([^\n:"]{1,40}): "([\s\S]*)"$/;
const MARKUP_CHARS = Object.freeze(['<', '>', '&', '"', "'"]);
const tagsOf = text => text.match(/<\/?[A-Za-z][^<>]*>/g) ?? [];
const SELECT_ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const count = (text, needle) => text.split(needle).length - 1;
const countRe = (text, re) => (text.match(re) ?? []).length;
const tokenRe = token => new RegExp(`(?<![\\p{L}\\p{N}])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
const TOKEN_RES = new Map(PROTECTED.map(token => [token, tokenRe(token)]));

// The placeholder signature of a template: its sequential kinds (%s, %d, %f, %.2f), %% count and named set.
export function signature(template) {
  const text = String(template), stripped = text.replace(/%%/g, '');
  const specs = [...stripped.matchAll(SPEC)].map(m => ({ pos: m[1] ? Number(m[1]) : null, kind: m[2] }));
  return { specs, percent: count(text, '%%'), named: [...new Set([...text.matchAll(NAMED)].map(m => m[1]))].sort() };
}
// optional: the 1-based argument a select or plural variant may leave out ("Mesa añadida" for "%s added"). Leaving out any
// argument but the last needs positional placeholders, so the others keep their values.
function placeholdersMatch(source, translation, optional = 0) {
  const a = signature(source), b = signature(translation);
  if (a.percent !== b.percent) return 'percent';
  if (a.named.join('\u0000') !== b.named.join('\u0000')) return 'named';
  if (a.specs.some(s => s.pos !== null)) return 'source-positional';
  const kinds = a.specs.map(s => s.kind);
  const positional = b.specs.filter(s => s.pos !== null);
  const seq = b.specs.map(s => s.kind).join(',');
  if (positional.length === 0) return seq === kinds.join(',') || (optional && optional === kinds.length && seq === kinds.slice(0, -1).join(',')) ? null : 'placeholders';
  if (positional.length !== b.specs.length) return 'mixed-placeholders';
  const used = new Set();
  for (const s of b.specs) { if (s.pos < 1 || s.pos > kinds.length || kinds[s.pos - 1] !== s.kind) return 'placeholders'; used.add(s.pos); }
  return used.size === kinds.length || (optional && !used.has(optional) && used.size === kinds.length - 1) ? null : 'placeholders';
}
// Why a translation of `source` is rejected, or null. names: an optional map of English names to their localized form for
// speech envelopes; protect: extra do-not-translate tokens (the glossary's list).
export function checkText(source, translation, { names = null, protect = [], optional = 0 } = {}) {
  if (typeof translation !== 'string') return 'not-string';
  if (translation.length === 0) return 'empty';
  if (translation.length > 4 * source.length + 120) return 'too-long';
  if (CONTROL.test(translation)) return 'control';
  if (count(translation, '\n') !== count(source, '\n')) return 'newlines';
  const placeholders = placeholdersMatch(source, translation, optional); if (placeholders) return placeholders;
  // Markup: a translation adds none of < > & " ' beyond the English's counts, and keeps the English's tags (names and
  // attributes, in order). So a localized string can never inject more than its English already does at the same site.
  for (const ch of MARKUP_CHARS) if (count(translation, ch) > count(source, ch)) return 'markup';
  if (tagsOf(translation).join('\n') !== tagsOf(source).join('\n')) return 'markup';
  const sourceUrls = new Set((source.match(URLISH) ?? []).map(u => u.toLowerCase()));
  if ((translation.match(URLISH) ?? []).some(u => !sourceUrls.has(u.toLowerCase()))) return 'url';
  const envelope = ENVELOPE.exec(source);
  if (envelope) {
    const own = ENVELOPE.exec(translation);
    if (!own) return 'envelope';
    if (names && own[1] !== envelope[1] && !(Object.hasOwn(names, envelope[1]) && names[envelope[1]] === own[1])) return 'envelope-name';
  }
  if (countRe(translation, /[“”«»„]/g) !== countRe(source, /[“”«»„]/g)) return 'quotes';
  for (const token of [...PROTECTED, ...protect]) {
    const re = TOKEN_RES.get(token) ?? tokenRe(token);
    if (re.test(source) && !re.test(translation)) return 'protected';
  }
  return null;
}
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// A value: a string, a plural object (only the locale's CLDR categories, `other` required, optional $count), or a select object ($select and
// an `other`). Returns [cleanValue, null] or [null, reason].
function checkValue(source, value, plurals, options) {
  if (typeof value === 'string') { const why = checkText(source, value, options); return why ? [null, why] : [value, null]; }
  if (!plainObject(value)) return [null, 'value-type'];
  const keys = Object.keys(value), argCount = signature(source).specs.length;
  const clean = Object.create(null);
  if (Object.hasOwn(value, '$select')) {
    const n = value.$select;
    if (!Number.isInteger(n) || n < 1 || n > argCount) return [null, 'select-index'];
    if (!Object.hasOwn(value, 'other')) return [null, 'select-other'];
    clean.$select = n;
    for (const key of keys) {
      if (key === '$select') continue;
      if (key !== 'other' && !SELECT_ID.test(key)) return [null, 'select-id'];
      const why = checkText(source, value[key], key === 'other' ? options : { ...options, optional: n }); if (why) return [null, why];
      clean[key] = value[key];
    }
    return [Object.freeze(clean), null];
  }
  const forms = keys.filter(key => key !== '$count');
  // Every key is one of the locale's CLDR categories and `other` is required; a missing category falls back to `other` at
  // lookup (es lists 'many' for millions, so an ordinary { one, other } entry is valid).
  if (!forms.every(category => plurals.includes(category))) return [null, 'plural-categories'];
  if (!forms.includes('other')) return [null, 'plural-other'];
  // The selector: $count, a 1-based argument or (in a named template) a placeholder's name; else the first %d, or {count}.
  const named = signature(source).named;
  if (Object.hasOwn(value, '$count')) {
    const n = value.$count;
    if (typeof n === 'string' ? !named.includes(n) : !Number.isInteger(n) || n < 1 || n > argCount) return [null, 'plural-index'];
    clean.$count = n;
  } else if (!signature(source).specs.some(s => s.kind === 'd') && !named.includes('count')) return [null, 'plural-selector'];
  const counted = !Object.hasOwn(value, '$count') ? signature(source).specs.findIndex(s => s.kind === 'd') + 1 : typeof value.$count === 'number' ? value.$count : 0;
  for (const key of forms) { const why = checkText(source, value[key], key === 'other' ? options : { ...options, optional: counted }); if (why) return [null, why]; clean[key] = value[key]; }
  return [Object.freeze(clean), null];
}
const keyOf = (msgid, ctx) => ctx ? `${ctx}\u0004${msgid}` : msgid;
const knownBy = sourceIndex => {
  if (!sourceIndex) return () => true;
  if (typeof sourceIndex === 'function') return sourceIndex;
  if (sourceIndex instanceof Set || sourceIndex instanceof Map) return (msgid, ctx) => sourceIndex.has(keyOf(msgid, ctx));
  return () => false;
};

// readCatalog(text, code, sourceIndex?, options?): pure. sourceIndex (a Set of msgids, with `ctx\u0004msgid` for context
// entries, or a function) is the extractor's index; at runtime it is absent and unknown keys are simply never looked up.
// Returns { catalog, rejected, error }: catalog is null when the envelope is invalid.
// Catalogs readCatalog made: setLocale accepts no other, so every active string passed the validator.
const VALIDATED = new WeakSet();
// Each catalog's serial number, for localeKey().
const SERIALS = new WeakMap();
let serial = 0;
export function readCatalog(text, code, sourceIndex = null, options = {}) {
  const fail = error => ({ catalog: null, rejected: [], error });
  const meta = metaOf(code);
  if (!meta || code === 'en') return fail('unknown-locale');
  if (typeof text !== 'string') return fail('not-text');
  if (text.length > MAX_CATALOG_BYTES) return fail('too-large');
  let data; try { data = JSON.parse(text); } catch { return fail('json'); }
  if (!plainObject(data)) return fail('envelope');
  if (data.format !== 1) return fail('format');
  if (data.locale !== code) return fail('locale');
  if (!plainObject(data.messages)) return fail('messages');
  for (const section of ['context', 'narrow', 'address']) if (Object.hasOwn(data, section) && !plainObject(data[section])) return fail(section);
  const known = knownBy(sourceIndex), rejected = [], reject = (section, key, reason) => { if (rejected.length < 500) rejected.push(Object.freeze({ section, key: String(key).slice(0, 200), reason })); };
  let entries = 0;
  const readSection = (section, object, ctx = null) => {
    const map = new Map();
    for (const key of Object.keys(object)) {
      if (++entries > MAX_ENTRIES) return null;
      if (key.length === 0 || key.length > MAX_KEY_LENGTH) { reject(section, key, 'key-length'); continue; }
      if (!known(key, ctx)) { reject(section, key, 'unknown-key'); continue; }
      const [value, why] = section === 'narrow' && typeof object[key] !== 'string' ? [null, 'not-string'] : checkValue(key, object[key], meta.plurals, options);
      if (why) { reject(section, key, why); continue; }
      map.set(key, value);
    }
    return map;
  };
  const messages = readSection('messages', data.messages); if (!messages) return fail('too-many');
  const contexts = new Map();
  if (plainObject(data.context)) for (const ctx of Object.keys(data.context)) {
    if (!plainObject(data.context[ctx]) || ctx.length > 200) { reject('context', ctx, 'context-shape'); continue; }
    const map = readSection('context', data.context[ctx], ctx); if (!map) return fail('too-many');
    contexts.set(ctx, map);
  }
  const narrows = plainObject(data.narrow) ? readSection('narrow', data.narrow) : new Map(); if (!narrows) return fail('too-many');
  const addresses = new Map();
  if (plainObject(data.address)) {
    if (!meta.address) reject('address', '*', 'address-unsupported');
    else for (const form of Object.keys(data.address)) {
      if (!ADDRESS_FORMS.has(form) || !plainObject(data.address[form])) { reject('address', form, 'address-form'); continue; }
      const map = readSection('address', data.address[form]); if (!map) return fail('too-many');
      addresses.set(form, map);
    }
  }
  const catalog = Object.freeze({ __proto__: null,
    locale: code,
    size: messages.size,
    message: key => messages.get(key),
    context: (ctx, key) => contexts.get(ctx)?.get(key),
    narrow: key => narrows.get(key),
    address: (form, key) => addresses.get(form)?.get(key),
    keys: () => [...messages.keys()],
  });
  VALIDATED.add(catalog); SERIALS.set(catalog, ++serial);
  return { catalog, rejected: Object.freeze(rejected), error: null };
}

// The manifest (./locales/index.json): { format: 1, locales: [{ code, endonym, dir, status, coverage, sha256 }] }.
const STATUSES = new Set(['shipped', 'preview', 'draft']);
export function readManifest(text) {
  let data; try { data = typeof text === 'string' && text.length <= MAX_MANIFEST_BYTES ? JSON.parse(text) : null; } catch { data = null; }
  if (!plainObject(data) || data.format !== 1 || !Array.isArray(data.locales)) return null;
  const locales = [];
  for (const entry of data.locales.slice(0, 32)) {
    if (!plainObject(entry) || !metaOf(entry.code) || entry.code === 'en' || !STATUSES.has(entry.status) || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) continue;
    if (locales.some(other => other.code === entry.code)) continue;
    const coverage = typeof entry.coverage === 'number' && entry.coverage >= 0 && entry.coverage <= 1 ? entry.coverage : 0;
    locales.push(Object.freeze({ code: entry.code, status: entry.status, sha256: entry.sha256, coverage }));
  }
  return Object.freeze({ format: 1, locales: Object.freeze(locales) });
}
export const shippedLocales = manifest => (manifest?.locales ?? []).filter(entry => entry.status === 'shipped' && Object.hasOwn(LOCALES, entry.code)).map(entry => entry.code);

// ---------------------------------------------------------------------------------------------------------------------------
// Loading: same-origin only, a 1 MB cap, a SHA-256 check against the manifest (one refetch with cache: 'reload' on a
// mismatch), and a 10 s timeout. Any failure resolves to { ok: false, reason } so the caller keeps English; it never throws.
async function readBytes(response, cap) {
  const length = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(length) && length > cap) throw Error('too-large');
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > cap) throw Error('too-large');
    return buffer;
  }
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > cap) { await reader.cancel().catch(() => {}); throw Error('too-large'); }
      chunks.push(chunk.value);
    }
  } finally { try { reader.releaseLock(); } catch { /* already released */ } }
  const out = new Uint8Array(bytes); let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.byteLength; }
  return out;
}
const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async bytes => hex(await globalThis.crypto.subtle.digest('SHA-256', bytes));
const decodeUtf8 = bytes => new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
const sameOrigin = (response) => response.type === undefined || response.type === 'basic' || response.type === 'default';

export async function loadCatalog(code, { fetch: fetchFn = globalThis.fetch, digest = sha256, base = './locales/', preview = false, timeoutMs = LOAD_TIMEOUT_MS, setTimer = globalThis.setTimeout, clearTimer = globalThis.clearTimeout, sourceIndex = null, manifest: given = null } = {}) {
  const meta = metaOf(code);
  if (!meta || code === 'en') return { ok: false, code, reason: 'unknown-locale' };
  if (meta.pseudo && !preview) return { ok: false, code, reason: 'not-shipped' };
  if (typeof fetchFn !== 'function') return { ok: false, code, reason: 'no-fetch' };
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null, timedOut = false;
  const timeout = new Promise(resolve => { timer = setTimer(() => { timedOut = true; controller?.abort(); resolve({ ok: false, code, reason: 'timeout' }); }, timeoutMs); });
  const options = cache => ({ cache, mode: 'same-origin', credentials: 'same-origin', redirect: 'error', signal: controller?.signal });
  const get = async (url, cache, cap) => {
    const response = await fetchFn(url, options(cache));
    if (!response || !response.ok) throw Error('http');
    if (!sameOrigin(response)) throw Error('cross-origin');
    return readBytes(response, cap);
  };
  const work = (async () => {
    try {
      const manifest = given ?? readManifest(decodeUtf8(await get(`${base}index.json`, 'no-cache', MAX_MANIFEST_BYTES)));
      if (!manifest) return { ok: false, code, reason: 'manifest' };
      const entry = manifest.locales.find(item => item.code === code);
      if (!entry) return { ok: false, code, reason: 'not-listed', manifest };
      if (entry.status !== 'shipped' && !preview) return { ok: false, code, reason: 'not-shipped', manifest };
      const url = `${base}${code}.json?h=${entry.sha256.slice(0, 12)}`;
      let bytes = await get(url, 'default', MAX_CATALOG_BYTES);
      if (await digest(bytes) !== entry.sha256) {
        bytes = await get(url, 'reload', MAX_CATALOG_BYTES);
        if (await digest(bytes) !== entry.sha256) return { ok: false, code, reason: 'hash', manifest };
      }
      const read = readCatalog(decodeUtf8(bytes), code, sourceIndex);
      if (!read.catalog) return { ok: false, code, reason: read.error, manifest };
      return { ok: true, code, catalog: read.catalog, rejected: read.rejected, preview: entry.status !== 'shipped', manifest };
    } catch (error) {
      return { ok: false, code, reason: timedOut ? 'timeout' : error?.message === 'too-large' ? 'too-large' : 'fetch' };
    }
  })();
  try { return await Promise.race([work, timeout]); } finally { clearTimer(timer); }
}
// Only the manifest, for the first-run offer (which locales are shipped). Resolves to null on any failure.
export async function loadManifest({ fetch: fetchFn = globalThis.fetch, base = './locales/', timeoutMs = LOAD_TIMEOUT_MS, setTimer = globalThis.setTimeout, clearTimer = globalThis.clearTimeout } = {}) {
  if (typeof fetchFn !== 'function') return null;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  const timeout = new Promise(resolve => { timer = setTimer(() => { controller?.abort(); resolve(null); }, timeoutMs); });
  const work = (async () => {
    try {
      const response = await fetchFn(`${base}index.json`, { cache: 'no-cache', mode: 'same-origin', credentials: 'same-origin', redirect: 'error', signal: controller?.signal });
      if (!response || !response.ok || !sameOrigin(response)) return null;
      return readManifest(decodeUtf8(await readBytes(response, MAX_MANIFEST_BYTES)));
    } catch { return null; }
  })();
  try { return await Promise.race([work, timeout]); } finally { clearTimer(timer); }
}

// A language switch issues a request token; a response that arrives after a newer switch is ignored (apply is not called).
export function createSwitcher({ load, apply }) {
  let token = 0;
  return {
    get token() { return token; },
    async switchTo(code, options) {
      const mine = ++token;
      let result;
      try { result = await load(code, options); } catch { result = { ok: false, code, reason: 'error' }; }
      if (mine !== token) return { ...result, stale: true };
      apply(result, code);
      return { ...result, stale: false };
    },
    cancel() { token++; },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// The active locale. English (catalog null) is the identity.
let active = { code: 'en', meta: LOCALES.en, catalog: null, preview: false, address: null };
const misses = new Set();
let missHook = null, lookupHook = null, rejectedNow = Object.freeze([]);
const rules = new Map();
const pluralRules = intl => { if (!rules.has(intl)) rules.set(intl, new Intl.PluralRules(intl)); return rules.get(intl); };
const numberFormats = new Map();
const listFormats = new Map();

export function setLocale(code, catalog = null, { preview = false, rejected = [] } = {}) {
  const meta = metaOf(code);
  if (!meta || code === 'en' || (catalog && (catalog.locale !== code || !VALIDATED.has(catalog)))) { active = { code: 'en', meta: LOCALES.en, catalog: null, preview: false, address: active.address }; rejectedNow = Object.freeze([]); }
  else { active = { code, meta, catalog: catalog ?? null, preview: !!preview, address: active.address }; rejectedNow = Object.freeze([...rejected]); }
  misses.clear();
  return active.code;
}
export function setAddressForm(form) { active = { ...active, address: ADDRESS_FORMS.has(form) ? form : null }; }
export const locale = () => active.code;
export const localeInfo = () => ({ code: active.code, html: active.meta.html, intl: active.meta.intl, dir: active.meta.dir, preview: active.preview });
export const isEnglish = () => active.code === 'en';
export const isRTL = () => active.meta.dir === 'rtl';
// A cache key for text built from lookups: the locale code, the active catalog (a reload of the same locale is a new key) and the
// address form. English is 'en'.
export const localeKey = () => active.catalog ? `${active.code}#${SERIALS.get(active.catalog)}${active.address ? `/${active.address}` : ''}` : active.code;
export function onMiss(fn) { missHook = typeof fn === 'function' ? fn : null; }
// onLookup(fn): fn(english, ctx) on every catalog lookup under a locale, found or not (tests record which msgids are reachable).
export function onLookup(fn) { lookupHook = typeof fn === 'function' ? fn : null; }
function miss(english, ctx) {
  if (misses.size < 2000) misses.add(ctx ? `${ctx}\u0004${english}` : english);
  if (missHook) { try { missHook(english, ctx); } catch { /* a diagnostic never breaks the screen */ } }
}
// Diagnostics for window.tenderloin.i18n().
export const diagnostics = () => ({ locale: active.code, preview: active.preview, dir: active.meta.dir, misses: [...misses].slice(0, 200), missCount: misses.size, rejected: rejectedNow.slice(0, 200) });

// The raw catalog value for an English key, or undefined.
function lookup(english, ctx) {
  const c = active.catalog;
  if (typeof english !== 'string') return undefined;
  if (lookupHook) { try { lookupHook(english, ctx ?? null); } catch { /* a diagnostic never breaks the screen */ } }
  if (!c) return undefined;
  if (ctx !== undefined && ctx !== null) return c.context(ctx, english);
  if (active.address) { const own = c.address(active.address, english); if (own !== undefined) return own; }
  return c.message(english);
}
const asString = value => typeof value === 'string' ? value : value.other;
// L: a template or table value looked up before use (composition). English returns its argument unchanged.
export function L(english, ctx) {
  if (active.code === 'en' || typeof english !== 'string') return english;
  const value = lookup(english, ctx);
  if (value === undefined) { miss(english, ctx); return english; }
  return asString(value);
}
// t: a static string at the view boundary. The same lookup; misses are recorded for the pseudo-locale and diagnostics.
export function t(english, ctx) { return L(english, ctx); }
// A narrow-screen label keyed by the wide template, or undefined (English keeps NARROW_LABEL_REWRITES).
export function narrow(template) { return active.code === 'en' || !active.catalog ? undefined : active.catalog.narrow(template); }

// Bidi isolation: in RTL a value is wrapped in FSI…PDI; otherwise unchanged.
export function isolate(text) { return active.meta.dir === 'rtl' ? `\u2068${text}\u2069` : text; }

// num: English String(value), as today. Locales use Intl.NumberFormat without grouping (years and counts stay "1961").
export function num(value, { decimals = null } = {}) {
  if (active.code === 'en') return decimals === null ? String(value) : Number(value).toFixed(decimals);
  const intl = active.meta.intl, key = `${intl}|${decimals}`;
  if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(intl, decimals === null ? { useGrouping: false, maximumFractionDigits: 20 } : { useGrouping: false, minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  const n = Number(value);
  return Number.isFinite(n) ? numberFormats.get(key).format(n) : String(value);
}
// list: English calls today's join; locales use Intl.ListFormat (conjunction), with each item isolated in RTL.
export function list(items, englishJoin) {
  if (active.code === 'en') return englishJoin(items);
  const intl = active.meta.intl;
  if (!listFormats.has(intl)) listFormats.set(intl, new Intl.ListFormat(intl, { type: 'conjunction' }));
  return listFormats.get(intl).format([...items].map(item => isolate(String(item))));
}
// plural(value, n): the form of a plural object for a count, under the active locale; a string is returned as it is.
export function plural(value, n) {
  if (typeof value === 'string' || !plainObject(value)) return value;
  const category = pluralRules(active.meta.intl).select(Number(n));
  return Object.hasOwn(value, category) ? value[category] : value.other;
}
// select(value, id): the variant of a select object for an id, else `other`.
export function select(value, id) {
  if (typeof value === 'string' || !plainObject(value)) return value;
  const key = String(id);
  return key !== '$select' && Object.hasOwn(value, key) ? value[key] : value.other;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The formatter core. Each flavor is one of the five existing formatters: its English path is the legacy function itself, so
// fmt and fill still ignore %%, visits/format.js still throws on a missing argument and %.Nf is still toFixed. A flavor passed
// to format() is { ...FLAVORS.name, legacy(template, args) }.
export const FLAVORS = Object.freeze({
  characters: Object.freeze({ name: 'characters', percent: true, throws: false }), // characters.js gdFormat: %s %d %%
  ending: Object.freeze({ name: 'ending', percent: true, throws: false }), // ending/text.js gdf: %s %d %f %%
  story: Object.freeze({ name: 'story', percent: false, throws: false }), // story.js fmt: %s %d
  rhythm: Object.freeze({ name: 'rhythm', percent: false, throws: false }), // rhythm.js fill: %s %d
  visits: Object.freeze({ name: 'visits', percent: true, throws: true }), // visits/format.js gdf: %s %d %.Nf %%
  named: Object.freeze({ name: 'named', percent: false, throws: true }), // fork templates with {name} placeholders
});
// The legacy-free English of a named template: {name} replaced by String(values[name]); a missing value throws.
export function fillNamed(template, values = {}) {
  return String(template).replace(NAMED, (whole, name) => {
    if (!values || !Object.hasOwn(values, name)) throw Error(`Missing value {${name}} for ${JSON.stringify(template)}`);
    return String(values[name]);
  });
}
// A ratio of counts in a template: %d/%d, %d/5 or 3/%d (and {met}/5 in a named one). In RTL it is one left-to-right isolate (LRI…
// PDI) with its numbers bare: isolating each number would leave the slash, a neutral, between two isolates, and it would take the
// paragraph's direction (UAX #9 W4 needs a number on each side, N1 then resolves it as right-to-left), so 1/3 would read 3/1.
const RATIO = /((?:%(?:\d+\$)?d\/(?:%(?:\d+\$)?d|\d+)|\d+\/%(?:\d+\$)?d))|%%|%(?:(\d+)\$)?(s|d|f|\.(\d+)f)/g;
const NAMED_RATIO = /((?:\{[A-Za-z_][A-Za-z0-9_]*\}\/(?:\{[A-Za-z_][A-Za-z0-9_]*\}|\d+)|\d+\/\{[A-Za-z_][A-Za-z0-9_]*\}))|\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
function substitute(template, args, flavor) {
  const list = Array.isArray(args) ? args : [args], rtl = active.meta.dir === 'rtl';
  let i = 0;
  const arg = index => { if (index >= list.length && flavor.throws) throw Error(`Not enough arguments for ${JSON.stringify(template)}`); return list[index]; };
  const value = (index, kind, decimals) => {
    const v = arg(index);
    if (kind === 'd') return isolate(String(Math.trunc(Number(v))));
    if (kind === 's') return isolate(String(v));
    return isolate(num(v, { decimals: kind === 'f' ? 6 : Number(decimals) }));
  };
  const spec = (whole, pos, kind, decimals) => whole === '%%' ? flavor.percent ? '%' : '%%' : value(pos ? Number(pos) - 1 : i++, kind, decimals);
  const ratio = text => `\u2066${text.replace(/%(?:(\d+)\$)?d/g, (whole, pos) => String(Math.trunc(Number(arg(pos ? Number(pos) - 1 : i++)))))}\u2069`;
  let out = rtl ? String(template).replace(RATIO, (whole, run, pos, kind, decimals) => run ? ratio(run) : spec(whole, pos, kind, decimals))
    : String(template).replace(/%%|%(?:(\d+)\$)?(s|d|f|\.(\d+)f)/g, spec);
  if (flavor.name === 'named') {
    const values = list[0] ?? {};
    const named = name => { if (!Object.hasOwn(values, name)) throw Error(`Missing value {${name}} for ${JSON.stringify(template)}`); return String(values[name]); };
    out = rtl ? out.replace(NAMED_RATIO, (whole, run, name) => run ? `\u2066${run.replace(NAMED, (w, n) => named(n))}\u2069` : isolate(named(name)))
      : out.replace(NAMED, (whole, name) => isolate(named(name)));
  }
  return out;
}
// A translated template filled as format fills it (for a narrow variant, which is no msgid of its own).
export const fillTranslated = (template, args, flavor) => substitute(template, args, flavor);
// The variant of a plural or select object for these arguments. The plural selector is $count, else the template's first %d;
// in a named template ({ name } values) $count names the placeholder, else it is {count}.
function variant(value, template, args) {
  if (typeof value === 'string') return value;
  const list = Array.isArray(args) ? args : [args];
  if (Object.hasOwn(value, '$select')) return select(value, list[value.$select - 1]);
  const specs = signature(template).specs;
  if (typeof value.$count === 'string' || (!Object.hasOwn(value, '$count') && !specs.some(s => s.kind === 'd'))) {
    const values = list[0] ?? {}, name = typeof value.$count === 'string' ? value.$count : 'count';
    return plural(value, Math.trunc(Number(values[name])));
  }
  const index = Object.hasOwn(value, '$count') ? value.$count - 1 : specs.findIndex(s => s.kind === 'd');
  return plural(value, Math.trunc(Number(list[index])));
}
export function format(template, args, flavor, ctx) {
  if (active.code === 'en' || typeof template !== 'string') return flavor.legacy(template, args);
  const value = lookup(template, ctx);
  if (value === undefined) { miss(template, ctx); return flavor.legacy(template, args); }
  // A localized sentence needs at least the arguments the English one takes, or the English path's own error.
  const needed = signature(template).specs.length, given = Array.isArray(args) ? args.length : 1;
  if (flavor.throws && flavor.name !== 'named' && given < needed) return flavor.legacy(template, args);
  return substitute(variant(value, template, args), args, flavor);
}

// Escaping (for I2 authors): t(), L() and format() return text, for textContent, setAttribute and the canvas, and are
// byte-identical to the English. Inside an HTML template they may stand where the code already inserts the same English
// unescaped: a translation can add no < > & " ' or tag beyond its English (checkText), and setLocale accepts only catalogs
// readCatalog validated. Everywhere else, build HTML with html() or tHTML(), which escape.
// tHTML(english, ctx): t() escaped for an HTML template or attribute value.
export const tHTML = (english, ctx) => escapeHTML(t(english, ctx));
// html(english, ...parts): the localized text, escaped, with %s (or %n$s) filled by parts, which are already-escaped HTML.
// In a locale, English that falls back is wrapped in <span lang="en" dir="ltr">.
export const escapeHTML = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function html(english, ...parts) {
  const fallback = active.code !== 'en' && lookup(english) === undefined;
  if (fallback) miss(english);
  const text = active.code === 'en' || fallback ? english : asString(lookup(english));
  let i = 0;
  const out = escapeHTML(text).replace(/%(?:(\d+)\$)?s/g, (spec, pos) => String(parts[pos ? Number(pos) - 1 : i++] ?? ''));
  return fallback ? `<span lang="en" dir="ltr">${out}</span>` : out;
}

// canvasFont(font): English returns the font unchanged; a locale with its own families puts them before the generic family.
export function canvasFont(font) {
  const families = active.meta.canvasFamilies;
  if (active.code === 'en' || !families) return font;
  const match = /^(.*?)((?:serif|sans-serif|monospace|system-ui|cursive|fantasy))\s*$/.exec(font);
  const quoted = families.map(name => `"${name}"`).join(', ');
  return match ? `${match[1]}${quoted}, ${match[2]}` : `${font}, ${quoted}`;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The document: <html lang dir>, the title, and [data-i18n] nodes (text keyed by their own English, kept in data-i18n-en the
// first time). English with nothing applied is never touched; going back to English restores lang="en", no dir and the title.
export function applyDocument(doc, { title } = {}) {
  const root = doc.documentElement, info = localeInfo();
  if (info.code === 'en') { root.setAttribute('lang', 'en'); root.removeAttribute('dir'); }
  else { root.setAttribute('lang', info.html); root.setAttribute('dir', info.dir); }
  if (typeof title === 'string') doc.title = t(title);
  for (const node of doc.querySelectorAll?.('[data-i18n]') ?? []) {
    if (!node.hasAttribute('data-i18n-en')) node.setAttribute('data-i18n-en', node.textContent);
    node.textContent = t(node.getAttribute('data-i18n-en'));
  }
  for (const node of doc.querySelectorAll?.('[data-i18n-attr]') ?? []) {
    for (const attr of node.getAttribute('data-i18n-attr').split(/\s+/).filter(name => /^(aria-label|title|alt|placeholder)$/.test(name))) {
      const keep = `data-i18n-en-${attr}`;
      if (!node.hasAttribute(keep)) node.setAttribute(keep, node.getAttribute(attr) ?? '');
      node.setAttribute(attr, t(node.getAttribute(keep)));
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Movement and interaction keys (D13). A typed basic Latin letter keeps its identity, exactly as before I1, so every Latin
// layout (US, AZERTY, Dvorak, Colemak) is unchanged. Only a key that types no Latin letter at KeyW/A/S/D/E or an arrow maps by
// position, so the D key walks right whether it reports 'd', 'ي' (Arabic 101) or 'ก' (Thai Kedmanee). Godot ORs the typed
// and the physical key (main.gd is_key_pressed(KEY_D) or is_physical_key_pressed(KEY_D)); one DOM event carries one identity,
// and this choice keeps the typed one wherever it is a letter. AltGr, IME input (isComposing, 'Process', keyCode 229) and
// every other key keep their typed identity (lowercased), so Enter, Escape and the arrows on a keypad are unchanged.
const KEY_CODES = Object.freeze({ KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyE: 'e', ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright' });
export function inputKey(event) {
  const key = typeof event?.key === 'string' ? event.key : '', typed = key.toLowerCase(), code = event?.code;
  // A basic Latin letter keeps its typed identity, as before (Dvorak's D is D, Colemak's S is S, AZERTY's Z is Z).
  if (/^[A-Za-z]$/.test(key)) return typed;
  // An IME composition, and AltGr (Polish ą, ś, ę) keep their typed identity too.
  if (event?.isComposing || key === 'Process' || event?.keyCode === 229) return typed;
  if (event?.getModifierState?.('AltGraph') || (event?.ctrlKey && event?.altKey)) return typed;
  if (typeof code === 'string' && Object.hasOwn(KEY_CODES, code)) return KEY_CODES[code];
  return typed;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The pseudo-locale transform (tests and `scripts/i18n.mjs pseudo`): deterministic accents (or Arabic letters for RTL), tiered
// expansion (×2.0 up to 12 letters, ×1.6 up to 30, ×1.4 beyond) and ⟦ ⟧ brackets. Placeholders, markup, entities, URLs,
// protected tokens, newlines and the speech envelope are kept, so every pseudo entry passes readCatalog.
const ACCENTS = { a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ', n: 'ñ', o: 'ó', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ú', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž' };
const ARABIC = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
const KEEP = new RegExp([
  '%%', '%(?:\\d+\\$)?(?:s|d|f|\\.\\d+f)', '\\{[A-Za-z_][A-Za-z0-9_]*\\}', '<[^<>]*>', '&(?:[a-z]+|#\\d+|#x[0-9a-f]+);',
  '(?:https?:\\/\\/|www\\.)[^\\s<>"\']+', '[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|org|net|gov|edu|io|dev|app|us|info|ca)\\b',
  ...PROTECTED.map(token => `(?<![\\p{L}\\p{N}])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`),
].join('|'), 'giu');
function pseudoBody(text, rtl) {
  let letters = 0, out = '', last = 0;
  const mapRun = run => run.replace(/[A-Za-z]/g, ch => {
    letters++;
    const lower = ch.toLowerCase();
    if (rtl) return ARABIC[(lower.charCodeAt(0) - 97) % ARABIC.length];
    const mapped = ACCENTS[lower];
    return ch === lower ? mapped : mapped.toUpperCase();
  });
  for (const m of text.matchAll(KEEP)) {
    // Protected tokens are matched case-sensitively: the regex is case-insensitive for URLs and entities.
    const isToken = PROTECTED.some(token => token.toLowerCase() === m[0].toLowerCase());
    if (isToken && !PROTECTED.includes(m[0])) continue;
    out += mapRun(text.slice(last, m.index)) + m[0]; last = m.index + m[0].length;
  }
  out += mapRun(text.slice(last));
  if (letters === 0) return text;
  const factor = letters <= 12 ? 2.0 : letters <= 30 ? 1.6 : 1.4, pad = (rtl ? 'ـ' : '·').repeat(Math.ceil(letters * (factor - 1)));
  const lead = /^\s*/.exec(out)[0], trail = /\s*$/.exec(out.slice(lead.length))[0];
  const core = out.slice(lead.length, out.length - trail.length);
  // The pad goes before a final newline-free tail so newline parity holds.
  return `${lead}⟦${core}${pad}⟧${trail}`;
}
export function pseudo(text, { rtl = false } = {}) {
  const source = String(text), envelope = ENVELOPE.exec(source);
  if (envelope) return `${envelope[1]}: "${pseudoBody(envelope[2], rtl)}"`;
  return pseudoBody(source, rtl);
}
// A pseudo catalog's JSON text for msgids ([{ msgid, ctx? }] or strings).
export function pseudoCatalog(entries, code = 'qps-ploc') {
  const rtl = PSEUDO_LOCALES[code]?.dir === 'rtl', messages = {}, context = {};
  for (const entry of entries) {
    const msgid = typeof entry === 'string' ? entry : entry.msgid, ctx = typeof entry === 'string' ? null : entry.ctx ?? null;
    if (ctx) (context[ctx] ??= {})[msgid] = pseudo(msgid, { rtl });
    else messages[msgid] = pseudo(msgid, { rtl });
  }
  return JSON.stringify({ format: 1, locale: code, messages, context });
}
