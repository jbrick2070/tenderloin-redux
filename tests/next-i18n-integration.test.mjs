// The seams between the I2 packages (docs/I18N_PLAN.md I2a-I2e), checked after they merged:
// - Named templates (game-text.js tf, ending/compose.js, visits/compose.js) select plural forms: $count names a placeholder,
//   else {count}. English and the %d templates are unchanged.
// - Already-localized values are never looked up again: under a catalog that also translates every pseudo string (to "‼" and
//   the pseudo text), a second lookup would show "‼"; it never does, for the producers other modules hand to game.js, and
//   game.js wraps none of them in t() or L().
// - The music label game.js hands to the ending and visit hosts is localized once, by game.js; the hosts show it as given.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as I from '../browser-next/i18n.js';
import { readSource } from '../scripts/i18n.mjs';
import { tf, GAME_TEXT } from '../browser-next/game-text.js';
import { compose } from '../browser-next/ending/compose.js';
import { parseGodotSave } from '../browser-next/godot-save.js';
import { initialState } from '../browser-next/core.js';
import { gatheringScene } from '../browser-next/gathering.js';
import { programmeIssue, programmeTitle, programmeResponse } from '../browser-next/programme.js';
import { civicConversation } from '../browser-next/civic.js';
import { filmCaption, FILM_SHOTS } from '../browser-next/film.js';
import { hostedDetail, postedGatherLine } from '../browser-next/ending/hosted.js';
import { sceneReceipt } from '../browser-next/ending/mural.js';
import { gdf } from '../browser-next/ending/text.js';
import { narrowLabel, HUB_LABELS, ACTION_LABELS } from '../browser-next/characters.js';
import { GODOT_WRITTEN, openedEnvelope, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope } from './next-fixtures.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const catalog = (code, messages) => { const r = I.readCatalog(JSON.stringify({ format: 1, locale: code, messages }), code); assert.ok(r.catalog, r.error); assert.deepEqual(r.rejected, []); return r.catalog; };
const under = (code, messages, fn) => { I.setLocale(code, catalog(code, messages), { preview: true }); try { return fn(); } finally { I.setLocale('en'); } };

// ------------------------------------------------------------------------------------------------ named plurals
test('named templates select plural forms: $count names the placeholder, else {count}; English and %d templates unchanged', () => {
  const tpl = GAME_TEXT.soundUI.preparationsMadeTheMusic;
  assert.equal(tpl, '{count} preparations made. The music is taking shape.');
  I.setLocale('en');
  assert.equal(tf(tpl, { count: 1 }), '1 preparations made. The music is taking shape.', 'English is the template as it is');
  const es = { [tpl]: { one: '{count} preparación hecha. La música toma forma.', other: '{count} preparaciones hechas. La música toma forma.' } };
  under('es', es, () => {
    assert.equal(tf(tpl, { count: 1 }), '1 preparación hecha. La música toma forma.');
    assert.equal(tf(tpl, { count: 3 }), '3 preparaciones hechas. La música toma forma.');
  });
  // $count names another placeholder; an unknown name, or a named template with no {count} and no $count, is rejected.
  const two = '{name} made {n} cards';
  under('es', { [two]: { $count: 'n', one: '{name} hizo {n} tarjeta', other: '{name} hizo {n} tarjetas' } }, () => {
    assert.equal(compose(two, { name: 'Bea', n: 1 }), 'Bea hizo 1 tarjeta');
    assert.equal(compose(two, { name: 'Bea', n: 2 }), 'Bea hizo 2 tarjetas');
  });
  const reasons = messages => I.readCatalog(JSON.stringify({ format: 1, locale: 'es', messages }), 'es').rejected.map(r => r.reason);
  assert.deepEqual(reasons({ [two]: { $count: 'x', one: '{name} {n}', other: '{name} {n}' } }), ['plural-index']);
  assert.deepEqual(reasons({ [two]: { one: '{name} {n}', other: '{name} {n}' } }), ['plural-selector']);
  assert.deepEqual(reasons({ [two]: { $count: 'n', one: '{name}', other: '{name} {n}' } }), ['named'], 'a form keeps every named placeholder');
  // A %d template still counts by its first %d or a numeric $count.
  under('es', { '%s has %d cards': { one: '%s tiene %d tarjeta', other: '%s tiene %d tarjetas' } }, () => {
    assert.equal(gdf('%s has %d cards', 'Bea', 1), 'Bea tiene 1 tarjeta');
    assert.equal(gdf('%s has %d cards', 'Bea', 4), 'Bea tiene 4 tarjetas');
  });
});

// ------------------------------------------------------------------------------------------------ no double lookup
const fork = envelope => parseGodotSave(typeof envelope === 'string' ? envelope : JSON.stringify(envelope), { initialState }).state;
const STATES = [initialState(), fork(openedEnvelope()), fork(hostedEnvelope()), fork(civicDoneEnvelope()), fork(filmDoneEnvelope()), fork(GODOT_WRITTEN.fullRun)];
const ORDERS = [[], ['stories'], ['beats', 'stories', 'art', 'pause'], ['art', 'pause', 'beats', 'stories']];
function produced() {
  const out = [];
  for (const state of STATES) {
    const scene = gatheringScene(state);
    out.push(scene.title, scene.caption, ...scene.items.map(item => item.label), postedGatherLine(state));
    for (const id of ['stories', 'beats', 'art', 'pause']) out.push(hostedDetail(state, id));
    if (state.civic?.result) out.push(civicConversation(state.civic.result));
    if (state.film?.result) for (const id of Object.keys(FILM_SHOTS)) out.push(filmCaption(state.film.result, id));
  }
  for (const order of ORDERS) { out.push(programmeIssue(order), programmeTitle(order)); for (const id of order) out.push(programmeResponse(id, order)); }
  out.push(sceneReceipt(''), sceneReceipt(I.t('Story text')));
  for (const text of [...Object.values(HUB_LABELS), ...Object.values(ACTION_LABELS)].filter(v => typeof v === 'string')) out.push(narrowLabel(I.t(text), text));
  return out.filter(text => typeof text === 'string' && text !== '');
}
test('no value is looked up twice: a second lookup of any pseudo string would show, and none does', () => {
  const msgids = readSource().entries.filter(e => !e.ctx).map(e => e.msgid), messages = {};
  for (const msgid of msgids) { messages[msgid] = I.pseudo(msgid); messages[I.pseudo(msgid)] ??= `‼${I.pseudo(msgid)}`; }
  const read = I.readCatalog(JSON.stringify({ format: 1, locale: 'qps-ploc', messages }), 'qps-ploc');
  assert.ok(read.catalog, read.error);
  I.setLocale('qps-ploc', read.catalog, { preview: true });
  try {
    assert.equal(I.t(I.t('Story text')), `‼${I.pseudo('Story text')}`, 'the premise: a double lookup shows');
    const texts = produced();
    assert.ok(texts.length > 80 && texts.filter(text => text.includes('⟦')).length > texts.length * 0.9, `${texts.length} texts, pseudo`);
    assert.deepEqual(texts.filter(text => text.includes('‼')), [], 'looked up twice');
  } finally { I.setLocale('en'); }
});
test("game.js never wraps an already-localized value in t() or L(); narrowLabel gets t(text) and the English template", () => {
  const game = read('browser-next/game.js');
  const twice = /(?<![\w$.])[tL]\(\s*(?:scene\.(?:title|caption)|item\.cells|programme(?:Issue|Title|Response)\(|civicConversation\(|filmCaption\(|hostedDetail\(|postedGatherLine\(|sceneReceipt\(|gdf\(|music\.error|narrowLabel\()/g;
  assert.deepEqual(game.match(twice), null);
  assert.ok(game.includes('narrowLabel(t(text), text)'));
});

// ------------------------------------------------------------------------------------------------ the music label
test('the music label is localized once, by game.js: both host objects wrap it in t(), the ending and visit hosts show it as given', () => {
  const game = read('browser-next/game.js');
  const labels = game.match(/music: \{ label: \(\) => [^,]*,/g);
  assert.deepEqual(labels, Array(2).fill('music: { label: () => t(music.enabled || music.starting ? STUDIO.musicOn : STUDIO.musicOff),'));
  for (const file of ['browser-next/ending/ui.js', 'browser-next/visits-kit.js']) {
    const source = read(file);
    assert.match(source, /label: host\.music\.label\(\) \}/, file);
    assert.doesNotMatch(source, /[tL]\(\s*host\.music\.label\(\)/, `${file} does not look it up again`);
  }
  // The Rhythm Circle takes no label from game.js: rhythm.js options() looks up its own music button.
  assert.match(read('browser-next/rhythm.js'), /label: L\(musicPlaying \? RHYTHM_COMPOSE\.musicOn : RHYTHM_COMPOSE\.musicOff\)/);
});

test('the new test file is LF', () => {
  assert.ok(!read('tests/next-i18n-integration.test.mjs').includes('\r'));
});
