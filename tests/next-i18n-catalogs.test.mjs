// The catalogs and their source (docs/I18N_PLAN.md 2.12): i18n/source.json is what the extractor makes of the current tree, the
// registry names every exported text table, the manifest matches the catalogs on disk, every catalog passes the validator, and
// the pseudo catalogs built from the source pass it too. With no locale shipped the per-locale checks pass trivially.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { REGISTRY, EXCLUDED, extract, stableJSON, sourceIndex, readSource, buildManifest, checkLocales, catalogCodes, isHumanText, SOURCE_PATH, MANIFEST_PATH } from '../scripts/i18n.mjs';
import { readCatalog, readManifest, pseudoCatalog, LOCALES, PSEUDO_LOCALES, shippedLocales } from '../browser-next/i18n.js';

const FORK = new URL('../browser-next/', import.meta.url);

test('i18n/source.json is fresh: the extractor on the current tree writes exactly it', async () => {
  assert.equal(stableJSON(await extract()), readFileSync(SOURCE_PATH, 'utf8'), 'run node scripts/i18n.mjs extract');
  const source = readSource();
  assert.equal(source.count, source.entries.length);
  assert.ok(source.count > 1000, 'the tables hold well over a thousand msgids');
  const keys = source.entries.map(e => `${e.ctx ?? ''}\u0004${e.msgid}`);
  assert.equal(new Set(keys).size, keys.length, 'one entry per msgid and context');
  assert.deepEqual(keys, [...keys].sort((a, b) => { const [ca, ma] = a.split('\u0004'), [cb, mb] = b.split('\u0004'); return ma < mb ? -1 : ma > mb ? 1 : ca < cb ? -1 : ca > cb ? 1 : 0; }), 'sorted by msgid');
  for (const e of source.entries) {
    assert.ok(e.paths.length > 0 && ['chip', 'label', 'button', 'sentence', 'paragraph'].includes(e.length), e.msgid);
    assert.ok(isHumanText(e.msgid), e.msgid);
  }
  // Spot checks: an override is applied (the 2D text, not Godot's), and ids and colours are not msgids.
  const msgids = new Set(source.entries.map(e => e.msgid));
  const { CHARACTER_WEB_OVERRIDES } = await import('../browser-next/characters.js');
  for (const [godot, web] of Object.entries(CHARACTER_WEB_OVERRIDES)) { if (isHumanText(web)) assert.ok(msgids.has(web), web); }
  for (const id of ['bea', '#c5874f', '1907_cadillac', 'c5874f', 'PipDinoMascot']) assert.ok(!msgids.has(id), id);
});

test('the registry names every exported text table, or excludes it with a reason', async () => {
  const files = readdirSync(FORK, { recursive: true }).map(name => String(name).split('\\').join('/')).filter(name => name.endsWith('.js') && !name.startsWith('data/')).sort();
  const registered = new Map(REGISTRY.map(r => [r.module, new Set(r.tables)]));
  const unlisted = [];
  for (const file of files) {
    if (['game.js', 'sketch-worklet.js', 'i18n.js'].includes(file)) continue; // the DOM shell (I2a moves its text to game-text.js), the audio worklet, and this module's bootstrap strings
    const m = await import(pathToFileURL(fileURLToPath(new URL(file, FORK))).href);
    for (const [name, value] of Object.entries(m)) {
      if (typeof value === 'function') continue;
      let human = false; const seen = new Set();
      const walk = v => { if (human) return; if (typeof v === 'string') human = isHumanText(v); else if (v && typeof v === 'object' && !seen.has(v)) { seen.add(v); Object.values(v).forEach(walk); } };
      walk(value);
      if (human && !registered.get(file)?.has(name) && !Object.hasOwn(EXCLUDED[file] ?? {}, name)) unlisted.push(`${file} ${name}`);
    }
    for (const name of registered.get(file) ?? []) assert.ok(name in m, `${file} exports ${name}`);
    for (const name of Object.keys(EXCLUDED[file] ?? {})) assert.ok(name in m, `${file} exports excluded ${name}`);
  }
  assert.deepEqual(unlisted, [], 'add these to REGISTRY or EXCLUDED in scripts/i18n.mjs');
  for (const { module, overrides } of REGISTRY) if (overrides) assert.ok(Object.hasOwn(EXCLUDED[module] ?? {}, overrides), `${module}: its override map ${overrides} is excluded as a table`);
});

test('the manifest matches the catalogs on disk; it never lists a pseudo-locale; nothing else lives in locales/', () => {
  const text = readFileSync(MANIFEST_PATH, 'utf8');
  assert.equal(text, stableJSON(buildManifest()), 'run node scripts/i18n.mjs manifest');
  assert.ok(!text.includes('\r'), 'LF');
  const manifest = readManifest(text);
  assert.ok(manifest, 'the game reads it');
  assert.deepEqual(manifest.locales.map(l => l.code), catalogCodes());
  for (const entry of manifest.locales) {
    assert.ok(!Object.hasOwn(PSEUDO_LOCALES, entry.code), `${entry.code}: pseudo-locales stay in the tests`);
    assert.equal(entry.sha256, createHash('sha256').update(readFileSync(new URL(`../browser-next/locales/${entry.code}.json`, import.meta.url))).digest('hex'));
  }
  assert.deepEqual(readdirSync(new URL('locales/', FORK)).sort(), ['index.json', ...catalogCodes().map(c => `${c}.json`)].sort());
  assert.deepEqual(shippedLocales(manifest), [], 'no locale ships before its D10 gates (I5 changes this line)');
});

test('every catalog passes the validator against the source, and a shipped one covers every msgid', () => {
  assert.deepEqual(checkLocales(), []);
  for (const code of catalogCodes()) {
    const read = readCatalog(readFileSync(new URL(`locales/${code}.json`, FORK), 'utf8'), code, sourceIndex(readSource()));
    assert.ok(read.catalog, `${code}: ${read.error}`); assert.deepEqual(read.rejected, [], code);
  }
});

test('the pseudo catalogs of the whole source pass the validator with nothing rejected', () => {
  const source = readSource(), index = sourceIndex(source);
  for (const code of Object.keys(PSEUDO_LOCALES)) {
    const read = readCatalog(pseudoCatalog(source.entries, code), code, index);
    assert.ok(read.catalog, read.error);
    assert.deepEqual(read.rejected.map(r => `${r.reason}: ${r.key}`), [], code);
    assert.equal(read.catalog.size, source.entries.filter(e => !e.ctx).length);
  }
  assert.ok(Object.keys(LOCALES).every(code => !code.startsWith('qps')), 'pseudo-locales are not LOCALES');
});
