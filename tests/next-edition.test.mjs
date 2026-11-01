// browser-next/edition.js: the fork's link to the 3D edition (the Godot web build) and the guard that decides whether a click may
// follow it. Both editions share one save and the 3D edition reads it only when it starts, so the link is a plain page load. The
// text is fork-authored: Godot has no such link, so no drift test applies, and none of it may be a Godot line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gdSource, gdStrings } from './gd-literal.mjs';
import * as E from '../browser-next/edition.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const GAME = read('browser-next/game.js');
const GD_FILES = readdirSync(new URL('../godot/', import.meta.url)).filter(name => name.endsWith('.gd'));
const GD_SOURCE = GD_FILES.map(name => gdSource(name)).join('\n');
const GD_LITERALS = new Set(GD_FILES.flatMap(name => gdStrings(gdSource(name))));
const KEYS = ['link', 'help', 'recover', 'eyebrow', 'title', 'confirm', 'open', 'stay'];

test('edition.js imports in Node without a DOM and exports the link, the guard and its text', () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
  assert.deepEqual(Object.keys(E).sort(), ['EDITION_TEXT', 'EDITION_URL', 'swapAction']);
  assert.equal(typeof E.swapAction, 'function');
  assert.ok(Object.isFrozen(E.EDITION_TEXT), 'the text cannot be changed at run time');
});

test('EDITION_URL is the 3D edition beside the fork, relative so it works on Pages and on the local server', () => {
  assert.equal(E.EDITION_URL, '../godot/');
  const from = page => new URL(E.EDITION_URL, page).href;
  assert.equal(from('https://jbrick2070.github.io/tenderloin-redux/browser-next/'), 'https://jbrick2070.github.io/tenderloin-redux/godot/');
  assert.equal(from('https://jbrick2070.github.io/tenderloin-redux/browser-next/?seed=1#map'), 'https://jbrick2070.github.io/tenderloin-redux/godot/');
  assert.equal(from('http://127.0.0.1:4174/browser-next/'), 'http://127.0.0.1:4174/godot/');
  // Where those are: the Pages deploy puts the Godot build in godot/ beside browser-next/, and the local server serves /godot/
  // from the same build. A bare /browser-next gets a 302 to its slash, so the link always resolves against the folder.
  const deploy = read('.github/workflows/deploy-pages.yml'), serve = read('scripts/serve.mjs');
  assert.match(deploy, /cp -r artifacts\/godot-web\/\* _site\/godot\//);
  assert.match(deploy, /cp -r browser-next\/\* _site\/browser-next\//);
  assert.match(serve, /const godotRoot = fileURLToPath\(new URL\('\.\.\/artifacts\/godot-web\/', import\.meta\.url\)\);/);
  assert.match(serve, /const isGodot = pathname === '\/godot' \|\| pathname\.startsWith\('\/godot\/'\);/);
});

test('swapAction: every combination of a pending recovery offer and a held save', () => {
  const table = [
    [{ recovery: false, held: false }, 'go'],
    [{ recovery: true, held: false }, 'recover'],
    [{ recovery: false, held: true }, 'confirm'],
    // game.js never has both (a held save withdraws the offer, and an offer needs a readable save); the offer would come first.
    [{ recovery: true, held: true }, 'recover'],
  ];
  for (const [input, want] of table) assert.equal(E.swapAction(Object.freeze({ ...input })), want, JSON.stringify(input));
  // game.js passes its own values: recovery is null or the offer's record, held a boolean.
  assert.equal(E.swapAction({ recovery: null, held: false }), 'go');
  assert.equal(E.swapAction({ recovery: { envelope: { save_seq: 3 }, scenes: {} }, held: false }), 'recover');
  assert.equal(E.swapAction({ recovery: null, held: true }), 'confirm');
  // Nothing pending: a normal state, a refused-full save and unavailable storage all go, since the fork writes on every change.
  assert.equal(E.swapAction({}), 'go');
  assert.equal(E.swapAction(), 'go');
});

test('EDITION_TEXT is declared fork text: the eight keys, each a plain line that no Godot source has', () => {
  assert.deepEqual(Object.keys(E.EDITION_TEXT), KEYS);
  for (const [key, value] of Object.entries(E.EDITION_TEXT)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(value.length > 0 && value === value.trim(), key);
    assert.doesNotMatch(value, /[<>&"]/, `${key} needs no escaping in the HTML game.js draws`);
    assert.ok(!GD_LITERALS.has(value), `${key} is not a Godot literal: ${value}`);
    assert.ok(!GD_SOURCE.includes(value.slice(0, 24)), `${key} is not a Godot line: ${value}`);
  }
  const T = E.EDITION_TEXT;
  assert.deepEqual([T.link, T.open, T.stay], ['Play the 3D edition', 'Open the 3D edition', 'Stay here']);
  assert.equal(T.recover, 'Choose what to keep before switching editions: the 3D edition would load the shared save as it is.');
  assert.equal(T.confirm, 'The shared save could not be read. The 3D edition will start fresh and replace it with its first change.');
  assert.match(T.help, /^[^.!?]+\.$/, "the Settings row's help is one sentence");
});

test('every EDITION_TEXT key is drawn by game.js through the module, never as an inline copy', () => {
  for (const key of KEYS) assert.ok(GAME.includes(`EDITION_TEXT.${key}`), key);
  // A long line whole (SAVE_TEXT.held shares the confirmation's first words), a short one as a quoted literal.
  const inline = value => (value.length >= 24 ? GAME.includes(value) : ["'", '"', '`'].some(q => GAME.includes(q + value + q)));
  for (const [key, value] of Object.entries(E.EDITION_TEXT)) assert.ok(!inline(value), `game.js uses EDITION_TEXT.${key}, not an inline copy: ${value}`);
  // The page's own link is static HTML, so it carries the same label.
  assert.match(read('browser-next/index.html'), new RegExp(`<a id="swap-edition" class="edition-link" href="${E.EDITION_URL.replace(/[./]/g, '\\$&')}">${E.EDITION_TEXT.link}<span aria-hidden="true">↗</span></a>`));
});

test('npm run next:check checks edition.js', () => {
  const { scripts } = JSON.parse(read('package.json'));
  assert.match(scripts['next:check'], /(^| )node --check browser-next\/edition\.js( |$)/);
});
