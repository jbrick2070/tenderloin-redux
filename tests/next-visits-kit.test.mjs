// browser-next/visits-kit.js, the shared kit of the visits screens (Phase 3 wiring spec 3.10): the pure HTML helpers, STYLE,
// the declared fork text, the visit session and createKit(host, session), on the stand-in dialog and host of next-fixtures.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gdSource, gdStrings, jsStrings } from './gd-literal.mjs';
import { visitsHost } from './next-fixtures.mjs';
import * as K from '../browser-next/visits-kit.js';
import { WEB_OVERRIDES } from '../browser-next/visits/text.js';
import { DOG_GOALS } from '../browser-next/visits/positions.js';
import * as before from '../browser-next/visits/before-streets.js';
import * as meal from '../browser-next/visits/meal.js';
import * as picker from '../browser-next/visits/picker.js';
import * as dogs from '../browser-next/visits/dogs.js';
import * as lantern from '../browser-next/visits/lantern.js';
import * as power from '../browser-next/visits/power.js';
import * as election from '../browser-next/visits/election.js';
import * as landmarks from '../browser-next/visits/landmarks.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const KIT = read('browser-next/visits-kit.js');
const CSS = read('browser-next/style.css');
const POWER_PLACE = JSON.parse(read('godot/data/power_place.json'));
const VOTING = JSON.parse(read('godot/data/voting_places.json'));
const GD_FILES = readdirSync(new URL('../godot/', import.meta.url)).filter(name => name.endsWith('.gd'));
const GD_SOURCE = GD_FILES.map(name => gdSource(name)).join('\n');
const GD_LITERALS = new Set(GD_FILES.flatMap(name => gdStrings(gdSource(name))));
const flush = async () => { for (let i = 0; i < 20; i++) await null; };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const RECOVERY = '<section data-recovery><h2 id="modal-title">Some progress went back.</h2><button id="recover-save">Keep this tab’s progress</button></section>';
const CONTRACT = ['$', 'bind', 'on', 'focus', 'show', 'holds', 'leave', 'say', 'ctx', 'musicButton', 'bindMusic', 'startWalk', 'readerEntry', 'bindReaderEntry', 'openPicker', 'openResume', 'data', 'ensureData', 'sparks', 'objective', 'noRepeat', 'bump'];

// Reading generated HTML: tags with decoded attributes, and buttons with their visible label, accessible name and description.
const decode = text => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const spoken = text => String(text).replace(/\s+/g, ' ').trim();
const attrsOf = text => Object.fromEntries([...text.matchAll(/\s([a-zA-Z][\w-]*)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] === undefined ? '' : decode(m[2])]));
const tagsOf = html => [...html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)].map(m => ({ name: m[1].toLowerCase(), attrs: attrsOf(m[2]) }));
function buttonsOf(html) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m => {
    const attrs = attrsOf(m[1]), shown = spoken(decode(m[2].replace(/<br>/g, ' ').replace(/<[^>]+>/g, '')));
    const ref = attrs['aria-describedby'], desc = ref ? new RegExp(`<span id="${ref}" class="sr-only">([^<]*)</span>`).exec(html)?.[1] : undefined;
    return { id: attrs.id, attrs, shown, name: attrs['aria-label'] ?? shown, description: desc === undefined ? undefined : decode(desc) };
  });
}
// WCAG 2.5.3: the accessible name starts with the visible label; Godot's own name is the name or the description.
function assertLabelInName(b, view = {}) {
  assert.ok(b.name.startsWith(b.shown), `#${b.id}: the name ${JSON.stringify(b.name)} starts with the visible label ${JSON.stringify(b.shown)}`);
  if (view.name != null && spoken(view.name) !== b.shown) assert.ok(b.name === spoken(view.name) || b.description?.includes(spoken(view.name)), `#${b.id}: Godot's name is the accessible name or its description`);
}
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// The visits host stand-in with a kit on a fresh session; routes are the shell's (visits-ui.js) draw calls.
function setup({ over = {}, routes } = {}) {
  const { host, log, io, dialog } = visitsHost(undefined, over), session = K.freshSession(), drawn = [];
  const kit = K.createKit(host, session, routes ?? { renderEpisode: (id, { announce } = {}) => { drawn.push([id, announce]); kit.show(id, K.frameHTML({ kind: id, title: id })); kit.say(announce); } });
  const step = (id, action, extra) => { const r = picker.changeEpisode(session.stories, id, action, kit.ctx(extra)); session.stories = r.stories; return r; };
  const draw = (kind, tray = '') => kit.show(kind, K.frameHTML({ kind, title: kind, tray }));
  return { host, log, io, dialog, session, kit, drawn, step, draw, said: () => log.filter(e => e[0] === 'status' || e[0] === 'toast') };
}

// ---------------------------------------------------------------- the module and its contract
test('the kit imports in Node without a DOM and exports the spec 3.10 contract', async () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
  const mod = await import('../browser-next/visits-kit.js');
  for (const name of ['esc', 'paragraphs', 'dataURI', 'figure', 'btn', 'frameHTML', 'sourceLinesHTML', 'injectStyle', 'freshSession', 'createKit']) assert.equal(typeof mod[name], 'function', name);
  assert.equal(typeof mod.STYLE, 'string');
  assert.equal(typeof mod.VISITS_FORK_TEXT, 'object');
  const { host } = visitsHost(), session = mod.freshSession(), kit = mod.createKit(host, session);
  assert.equal(kit.host, host);
  assert.equal(kit.session, session);
  for (const name of CONTRACT) assert.equal(typeof kit[name], 'function', `kit.${name}`);
  // Pure at import: no browser global anywhere in the code (strings and comments aside); the DOM is reached only through host.
  const code = KIT.replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g, "''");
  assert.doesNotMatch(code, /\b(document|window|localStorage|sessionStorage|setTimeout|requestAnimationFrame|fetch|Math\.random|Date\.now|performance)\b/);
  assert.doesNotMatch(code, /\binnerHTML\b|\bquerySelector/, 'only getElementById and addEventListener (the stand-in dialog supports nothing else)');
  assert.ok(!KIT.includes('\r'), 'visits-kit.js is LF');
  // core.js and godot-save.js never import the visits side (history.js calls project() at load).
  for (const name of ['core.js', 'godot-save.js']) assert.doesNotMatch(read(`browser-next/${name}`), /from '\.\/visits/);
});

test('freshSession: the visit-only session of spec 3.4, nothing shared between sessions', () => {
  const a = K.freshSession(), b = K.freshSession();
  assert.deepEqual(Object.keys(a).sort(), ['before', 'data', 'from', 'meal', 'screen', 'stories', 'trip', 'version', 'world']);
  assert.deepEqual(a, {
    screen: null, from: null, before: before.initialBefore(), meal: meal.initialMeal(), stories: picker.initialStories(),
    world: { tour: landmarks.initialTour(), guideIdx: -1, lastHinted: '', card: null }, trip: null,
    data: { power_place: { status: 'idle', value: null }, voting_places: { status: 'idle', value: null } }, version: 0,
  });
  for (const key of ['before', 'meal', 'stories', 'world', 'data']) assert.notEqual(a[key], b[key], key);
  assert.notEqual(a.data.power_place, b.data.power_place);
  assert.deepEqual(structuredClone(a), a, 'plain data: the shell snapshot can clone it');
});

// ---------------------------------------------------------------- pure helpers
test('esc, paragraphs, dataURI and figure: escaped text, Godot paragraphs, and data: images only', () => {
  assert.equal(K.esc('<a href="x">Rook & Dez\'s</a>'), '&lt;a href=&quot;x&quot;&gt;Rook &amp; Dez\'s&lt;/a&gt;');
  assert.equal(K.esc(null), '');
  assert.equal(K.esc(7), '7');
  assert.equal(K.paragraphs('One\n\nTwo <b>'), '<p>One</p><p></p><p>Two &lt;b&gt;</p>');
  assert.equal(K.paragraphs(''), '');
  assert.equal(K.paragraphs(undefined), '');
  const svg = before.artwork(1, 0);
  assert.equal(K.dataURI(svg), before.artworkDataURI(1, 0), 'the same data: URI the pure modules cache');
  assert.equal(decodeURIComponent(K.dataURI(svg).slice('data:image/svg+xml;charset=utf-8,'.length)), svg);
  const src = K.dataURI('<svg xmlns="http://www.w3.org/2000/svg"/>');
  assert.equal(K.figure({ src, alt: 'A "quoted" view' }), `<figure class="visits-picture"><img alt="A &quot;quoted&quot; view" src="${src}"></figure>`);
  assert.equal(K.figure({ src, alt: '', overlay: '<span class="visits-label">N</span>' }), `<figure class="visits-picture visits-overlaid"><img alt="" src="${src}"><div class="visits-overlay"><span class="visits-label">N</span></div></figure>`);
  for (const bad of ['https://example.test/x.svg', '/browser-next/icon.svg', 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '', null, undefined, 42]) {
    assert.doesNotMatch(K.figure({ src: bad, alt: 'x' }), /<img|src=/, `${String(bad)} is not drawn`);
  }
});

test('frameHTML: the eyebrow credit first (clear of ×), the heading, the reader region and the tray', () => {
  const src = K.dataURI('<svg/>');
  const html = K.frameHTML({ kind: 'meal', credit: 'Credit line', title: 'Title | Sub', headingEntry: K.btn({ id: 'meal-stories', label: 'Other' }), picture: K.figure({ src, alt: 'Alt' }),
    reader: 'One\nTwo <b>', tray: K.btn({ id: 'meal-back', label: 'Back' }), extra: '<div id="meal-extra"></div>' });
  assert.equal(html, '<section class="visits" data-visits="meal"><p class="eyebrow visits-credit">Credit line</p><h2 id="modal-title" tabindex="-1">Title | Sub</h2>'
    + '<div class="visits-heading-entry"><button id="meal-stories" class="secondary-button">Other</button></div>'
    + `<figure class="visits-picture"><img alt="Alt" src="${src}"></figure>`
    + '<div id="visits-reader" class="visits-reader" tabindex="0" role="region" aria-label="Story text"><p>One</p><p>Two &lt;b&gt;</p></div>'
    + '<div id="meal-extra"></div><div class="visits-tray"><button id="meal-back" class="secondary-button">Back</button></div></section>');
  // Built HTML for the reader (the Sources view's links) replaces the paragraphs; an empty heading entry adds nothing.
  const sources = K.sourceLinesHTML(before.sourceLines());
  const view = K.frameHTML({ kind: 'before', title: 'T', reader: 'ignored', readerHTML: sources });
  assert.ok(view.includes(`aria-label="Story text">${sources}</div>`));
  assert.ok(!view.includes('visits-heading-entry') && !view.includes('ignored'));
  assert.match(K.frameHTML({ kind: '"><x' }), /^<section class="visits" data-visits="&quot;&gt;&lt;x">/);
});

test('sourceLinesHTML: the reading-reference URLs are links (new tab, no referrer), never fetched; other lines are text', () => {
  const lines = before.sourceLines(), html = K.sourceLinesHTML(lines), links = tagsOf(html).filter(t => t.name === 'a');
  assert.ok(lines.some(l => l.url) && lines.some(l => !l.url), 'the Sources text has both kinds of line');
  assert.deepEqual(links.map(a => a.attrs.href), lines.filter(l => l.url).map(l => l.url));
  for (const a of links) assert.deepEqual([a.attrs.class, a.attrs.target, a.attrs.rel], ['source-link', '_blank', 'noreferrer']);
  assert.equal((html.match(/<p>/g) || []).length, lines.length, 'one paragraph per line');
  assert.equal(K.sourceLinesHTML(['Plain line', 'https://example.test/a', 'http://example.test/b']),
    '<p>Plain line</p><p><a class="source-link" href="https://example.test/a" target="_blank" rel="noreferrer">https://example.test/a</a></p><p>http://example.test/b</p>');
  for (const url of ['javascript:alert(1)', 'https://example.test/"onmouseover="x', 'data:text/html,x']) assert.doesNotMatch(K.sourceLinesHTML([{ text: 'x', url }]), /<a\b/, url);
  assert.equal(K.sourceLinesHTML(null), '');
});

// ---------------------------------------------------------------- btn()
test('btn: the accessible name starts with the visible label; a Godot name that does not becomes an sr-only description', () => {
  let [b] = buttonsOf(K.btn({ id: 'x-alpha', label: 'Alpha', name: 'Alpha: the first letter' }));
  assert.deepEqual([b.attrs['aria-label'], b.attrs['aria-describedby']], ['Alpha: the first letter', undefined], 'a name that starts with the label is the name');
  const html = K.btn({ id: 'x-beta', label: 'Beta', name: 'The second letter: beta' });
  [b] = buttonsOf(html);
  assert.deepEqual([b.attrs['aria-label'], b.attrs['aria-describedby'], b.description], ['Beta', 'visits-desc-x-beta', 'The second letter: beta']);
  assert.match(html, /<\/button><span id="visits-desc-x-beta" class="sr-only">The second letter: beta<\/span>$/, 'the description follows its button, as #reward-sounds-help');
  // Godot's "\n" in a label is a line break on screen and a space in the name.
  [b] = buttonsOf(K.btn({ id: 'x-two', label: 'Two\nlines', name: 'Two lines and more' }));
  assert.deepEqual([b.shown, b.attrs['aria-label']], ['Two lines', 'Two lines and more']);
  assert.match(K.btn({ id: 'x-two', label: 'Two\nlines' }), /aria-label="Two lines">Two<br>lines</);
  // A label that is only part of the name's first word is not its start: "Relay 1" is not "Relay 10".
  [b] = buttonsOf(K.btn({ id: 'x-relay', label: 'Relay 1', name: 'Relay 10: north' }));
  assert.deepEqual([b.attrs['aria-label'], b.description], ['Relay 1', 'Relay 10: north']);
  // No name, or the same words: the content names it. A control with no visible label is named by Godot's name.
  assert.equal(K.btn({ id: 'x-plain', label: 'Plain' }), '<button id="x-plain" class="secondary-button">Plain</button>');
  assert.equal(K.btn({ id: 'x-same', label: 'Same  words', name: 'Same words' }), '<button id="x-same" class="secondary-button">Same  words</button>');
  [b] = buttonsOf(K.btn({ id: 'x-pad', label: '', name: 'Turn connector 1' }));
  assert.deepEqual([b.attrs['aria-label'], b.attrs['aria-describedby']], ['Turn connector 1', undefined]);
  // A description (Godot's tooltip) is the sr-only description; a tooltip is also the hover title.
  [b] = buttonsOf(K.btn({ id: 'x-tip', label: 'Tip', tooltip: 'Hover text' }));
  assert.deepEqual([b.attrs.title, b.description], ['Hover text', 'Hover text']);
  [b] = buttonsOf(K.btn({ id: 'x-desc', label: 'Desc', description: 'Only described' }));
  assert.deepEqual([b.attrs.title, b.description], [undefined, 'Only described']);
  [b] = buttonsOf(K.btn({ id: 'x-both', label: 'Both', name: 'Named otherwise', description: 'and described' }));
  assert.deepEqual([b.attrs['aria-label'], b.description], ['Both', 'Named otherwise and described']);
  [b] = buttonsOf(K.btn({ id: 'x-title', label: 'Title', title: 'Just a title' }));
  assert.deepEqual([b.attrs.title, b.attrs['aria-describedby']], ['Just a title', undefined]);
});

test('btn: pressed, disabled, primary, class, position, rapid and hidden', () => {
  const attrs = b => tagsOf(K.btn({ id: 'x', label: 'X', ...b }))[0]?.attrs;
  assert.equal(attrs({ pressed: true })['aria-pressed'], 'true');
  assert.equal(attrs({ pressed: false })['aria-pressed'], 'false');
  assert.ok(!('aria-pressed' in attrs({})) && !('aria-pressed' in attrs({ pressed: null })), 'aria-pressed only when pressed is defined');
  assert.ok('disabled' in attrs({ disabled: true }) && !('disabled' in attrs({ disabled: false })));
  assert.equal(attrs({ primary: true }).class, 'primary-button');
  assert.equal(attrs({}).class, 'secondary-button');
  assert.equal(attrs({ className: 'visits-pin' }).class, 'secondary-button visits-pin');
  assert.equal(attrs({ style: 'left:10.5%;top:20%' }).style, 'left:10.5%;top:20%');
  for (const style of ['background:url(https://example.test/x)', 'left:1%" onclick="x', 'width:expression(1)', '@import x', 'a:\\75 rl(x)']) assert.ok(!('style' in attrs({ style })), style);
  assert.ok('data-rapid' in attrs({ rapid: true }) && !('data-rapid' in attrs({ rapid: false })) && !('data-rapid' in attrs({})));
  for (const b of [{ hidden: true }, { visible: false }]) assert.equal(K.btn({ id: 'x', label: 'X', ...b }), '');
  assert.equal(K.btn(null), '');
  assert.ok('id' in attrs({ visible: true }));
  assert.equal(K.btn({ id: 'x', label: 'A <b> & "c"' }), '<button id="x" class="secondary-button">A &lt;b&gt; &amp; &quot;c&quot;</button>');
});

// tests/next-press-settle.test.mjs "the rapid set" reads btn() as a conduit: the exact renderer form, once, and no other mark.
test('btn is the one rapid conduit, in the form the rapid-set test reads, and the kit marks no control itself', () => {
  const code = KIT.split(/\r?\n/).filter(line => !/^\s*\/\//.test(line)).join('\n');
  const renders = [...code.matchAll(/\$\{(\w+)\.rapid \? ' data-rapid' : ''\}/g)];
  assert.equal(renders.length, 1);
  assert.equal((code.match(/data-rapid/g) || []).length, 1, 'data-rapid appears only in the renderer (comments that mention it are whole-line // comments)');
  assert.deepEqual([...code.matchAll(/\bid="([^"]+)" data-rapid\b/g)], []);
  assert.deepEqual([...code.matchAll(/\{ id: '([^']+)'[^{}\n]*\brapid: true\b/g)], []);
  assert.equal(code.match(/\brapid: (?!true\b|false\b)[^,}]+/g), null);
});

// Every Godot view the visits screens draw: the four rapid buttons, toggles, picker entries, Other stories, power tabs,
// Missing dogs and More stories, election pins and Before's Back with its tooltip.
function viewCorpus() {
  const ctx = { opened: true, player: { x: 0, y: 0 }, musicPlaying: false, powerPlace: POWER_PLACE, voting: VOTING }, out = [];
  const add = (view, html, tag = '') => out.push({ view, html, tag });
  for (const b of before.beforeView({ ...before.initialBefore(), open: true }).buttons) add(b, K.btn({ ...b, id: `before-${b.id}` }));
  const m = meal.mealView({ ...meal.initialMeal(), open: true, revealed: 2 });
  add(m.previous, K.btn({ id: 'meal-previous', label: m.previous.label, name: m.previous.name, disabled: m.previous.disabled, rapid: true }));
  add(m.next, K.btn({ id: 'meal-next', label: m.next.label, name: m.next.name, disabled: m.next.disabled, rapid: true }));
  m.servings.forEach((s, i) => add(s, K.btn({ ...s, id: `meal-serving-${i}` })));
  m.placements.forEach((s, i) => add(s, K.btn({ ...s, id: `meal-placement-${i}` })));
  add(m.share, K.btn({ ...m.share, id: 'meal-share', primary: true }));
  const initial = picker.initialStories(), stories = { ...initial, picker: { ...initial.picker, open: true, lanternInvited: true } }, pv = picker.pickerView(stories, ctx);
  pv.entries.forEach(e => add(e, K.btn({ ...e, id: `picker-entry-${e.index}` })));
  add(pv.follow, K.btn({ ...pv.follow, id: 'picker-follow' }));
  add(pv.earlier, K.btn({ ...pv.earlier, id: 'picker-earlier' }));
  add(pv.later, K.btn({ ...pv.later, id: 'picker-later' }));
  const entry = picker.readerEntry();
  add(entry, K.btn({ ...entry, id: 'dogs-stories' }));
  for (const b of dogs.dogsView(dogs.initialDogs(), ctx).buttons) add(b, K.btn({ ...b, id: `dogs-${b.id}` }));
  for (const b of lantern.lanternView(lantern.initialLantern(), ctx).buttons) add(b, K.btn({ ...b, id: `lantern-${b.id}` }));
  for (const [p, tag] of [[power.initialPower(), 'hub'], [{ ...power.initialPower(), active: true }, 'active']]) {
    const v = power.powerView(p, ctx);
    v.tabs.forEach(tab => add(tab, K.btn({ ...tab, id: `power-tab-${tab.index}` }), tag));
    v.actions.forEach(a => add(a, K.btn({ ...a, id: `power-${a.id}` }), tag));
    add(v.dogs, K.btn({ ...v.dogs, id: 'power-dogs' }), tag);
    add(v.more, K.btn({ ...v.more, id: 'power-more' }), tag);
  }
  const ev = election.electionView({ ...election.initialElection(), open: true, active: true, phase: 2 }, ctx);
  ev.buttons.forEach(b => add(b, K.btn({ ...b, id: `election-${b.id}` })));
  ev.pins.forEach(p => add(p, K.btn({ ...p, id: `election-pin-${p.index}`, className: 'visits-pin', style: `left:${(p.x / 3.6).toFixed(2)}%;top:${(p.y / 2.4).toFixed(2)}%` })));
  return out;
}

test("btn: every Godot view the visits screens draw keeps the label in the name, with Godot's name kept", () => {
  const all = [];
  for (const { view, html, tag } of viewCorpus()) for (const b of buttonsOf(html)) { assertLabelInName(b, view); all.push({ b, view, tag }); }
  assert.ok(all.length >= 60, `${all.length} buttons`);
  const get = (id, tag = '') => { const found = all.find(e => e.b.id === id && e.tag === tag); assert.ok(found, `${id} ${tag}`); return found; };
  const described = (id, tag) => { const { b, view } = get(id, tag); assert.ok(!spoken(view.name).startsWith(b.shown), `${id}: Godot's name does not start with the label`); assert.deepEqual([b.attrs['aria-label'], b.description], [b.shown, spoken(view.name)], id); };
  for (const id of ['meal-previous', 'meal-next', 'picker-follow', 'dogs-stories', 'election-pin-0', 'election-pin-1']) described(id);
  for (const id of ['power-dogs', 'power-more', 'power-tab-0', 'power-tab-1', 'power-tab-2']) described(id, 'hub');
  const named = (id, tag) => { const { b, view } = get(id, tag); assert.equal(b.attrs['aria-label'], spoken(view.name), id); };
  for (const id of ['picker-entry-0', 'dogs-pippin', 'dogs-music']) named(id);
  for (const id of ['power-tab-0', 'power-music', 'power-begin']) named(id, 'active');
  const back = get('before-back');
  assert.deepEqual([back.b.attrs.title, back.b.description], [back.view.tooltip, back.view.tooltip], "Before's Back: Godot's tooltip is its title and its description");
  assert.deepEqual(all.filter(({ b }) => 'data-rapid' in b.attrs).map(({ b }) => b.id).sort(), ['meal-next', 'meal-previous', 'picker-earlier', 'picker-later'], 'only the views marked rapid');
  assert.ok(!all.some(({ b }) => b.id === 'picker-entry-2' || b.id === 'picker-entry-3'), 'entries of the other page are not drawn (visible: false)');
});

// ---------------------------------------------------------------- generated HTML and the CSP
test('generated HTML: no inline handler or script, every image a data: URI, every link https with no referrer', () => {
  const ctx = { opened: true, player: { x: 0, y: 0 }, powerPlace: POWER_PLACE, voting: VOTING };
  const bv = before.beforeView({ ...before.initialBefore(), open: true }), mv = meal.mealView(meal.initialMeal()), dv = dogs.dogsView(dogs.initialDogs(), ctx);
  const pv = power.powerView({ ...power.initialPower(), historical: true, mapView: true }, ctx), ev = election.electionView({ ...election.initialElection(), phase: 2, placed: 1 }, ctx);
  const labels = pv.mapLabels.map(l => `<span class="visits-label" style="left:${l.x / 3.6}%;top:${l.y / 2.4}%">${K.esc(l.text)}</span>`).join('');
  const real = [
    K.frameHTML({ kind: 'before', credit: bv.subtitle, title: bv.title, picture: K.figure({ src: before.artworkDataURI(0, -1), alt: bv.description }), reader: bv.text, tray: bv.buttons.map(b => K.btn({ ...b, id: `before-${b.id}` })).join('') }),
    K.frameHTML({ kind: 'before', credit: bv.subtitle, title: bv.title, readerHTML: K.sourceLinesHTML(before.sourceLines()) }),
    K.frameHTML({ kind: 'meal', credit: mv.credit, title: mv.heading, picture: K.figure({ src: meal.artworkDataURI(mv.art.index, mv.art.stage, mv.art.style), alt: mv.description }), reader: mv.text }),
    K.frameHTML({ kind: 'dogs', credit: dv.credit, title: dv.heading, headingEntry: K.btn({ ...picker.readerEntry(), id: 'dogs-stories' }), picture: K.figure({ src: K.dataURI(dogs.illustration(0)), alt: dv.description }), reader: dv.text, tray: dv.buttons.map(b => K.btn({ ...b, id: `dogs-${b.id}` })).join('') }),
    K.frameHTML({ kind: 'power', credit: pv.credit, title: pv.heading, picture: K.figure({ src: K.dataURI(power.mapSVG(POWER_PLACE)), alt: pv.heading, overlay: labels }), reader: pv.text }),
    K.frameHTML({ kind: 'election', title: ev.heading, picture: K.figure({ src: K.dataURI(election.paperSVG(election.initialElection(), VOTING)), alt: ev.heading, overlay: ev.pins.map(p => K.btn({ ...p, id: `election-pin-${p.index}`, className: 'visits-pin', style: `left:${p.x / 3.6}%;top:${p.y / 2.4}%` })).join('') }), reader: ev.text }),
    K.frameHTML({ kind: 'lantern', picture: K.figure({ src: K.dataURI(lantern.artwork(1, 1)), alt: '' }), reader: lantern.lanternView(lantern.initialLantern(), ctx).text }),
  ];
  const evil = '"><script>alert(1)</script><img src=x onerror=alert(1)> onclick="x" \'onmouseover=\'y';
  const hostile = [
    K.frameHTML({ kind: evil, credit: evil, title: evil, headingEntry: K.btn({ id: evil, label: evil, name: evil }), reader: evil, extra: K.paragraphs(evil),
      picture: K.figure({ src: 'javascript:alert(1)', alt: evil }) + K.figure({ src: evil, alt: evil }) + K.figure({ src: K.dataURI(evil), alt: evil, overlay: K.btn({ id: 'x', label: evil, name: evil, description: evil, title: evil, tooltip: evil, className: evil, style: evil }) }),
      tray: K.btn({ id: 'y', label: evil, name: `${evil} longer`, description: evil, style: 'background:url(https://example.test/x)' }) }),
    K.sourceLinesHTML([{ text: evil, url: 'javascript:alert(1)' }, evil, { text: evil, url: `https://example.test/${evil}` }, 'https://example.test/ok']),
  ];
  let images = 0, links = 0;
  for (const html of [...real, ...hostile]) {
    for (const tag of tagsOf(html)) {
      assert.notEqual(tag.name, 'script', 'no inline script');
      for (const attr of Object.keys(tag.attrs)) assert.doesNotMatch(attr, /^on/i, `no inline handler (${attr} on <${tag.name}>)`);
      if ('src' in tag.attrs) { assert.equal(tag.name, 'img'); assert.match(tag.attrs.src, /^data:image\//, 'every image is a data: URI'); images++; }
      if ('href' in tag.attrs) { assert.match(tag.attrs.href, /^https:\/\/[^\s"<>]+$/); assert.deepEqual([tag.attrs.target, tag.attrs.rel], ['_blank', 'noreferrer']); links++; }
      if ('style' in tag.attrs) assert.doesNotMatch(tag.attrs.style, /url\s*\(|expression|@import/i);
    }
  }
  for (const html of real) assert.doesNotMatch(html, /\son[a-z]+=/, 'the spec grep: no handler attribute in any generated screen');
  assert.ok(images >= 7 && links >= 2, `${images} images, ${links} links`);
  assert.equal(tagsOf(hostile[0]).filter(t => t.name === 'img').length, 1, 'only the data: figure draws an image');
});

// ---------------------------------------------------------------- STYLE
test('STYLE: small text is at least 11 px and 4.5:1 on its background, the pressed look is the selected look, and overlay focus shows on every picture', () => {
  const root = /(?:^|\n):root\s*\{([^}]*)\}/.exec(CSS)[1];
  const prop = (decls, name) => new RegExp(`(?:^|[;{\\s])${name}\\s*:\\s*([^;!]+?)\\s*(?:!important)?\\s*(?:;|$)`).exec(decls)?.[1];
  const color = value => { const v = /^var\((--[\w-]+)(?:,\s*(#[0-9a-f]{6}))?\)$/i.exec(value ?? ''); return v ? prop(root, v[1]) ?? v[2] : value; };
  const paper = color('var(--paper)');
  assert.match(paper, /^#[0-9a-f]{6}$/i);
  assert.equal(color(prop(/(?:^|\n)dialog\s*\{([^}]*)\}/.exec(CSS)[1], 'background')), paper, 'dialogs are drawn on --paper');
  const rules = [...K.STYLE.replace(/@media[^{]*\{/g, '').replace(/\}\s*\}/g, '}').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selectors: m[1].trim().split(',').map(s => s.trim()), decls: m[2] }));
  const rule = selector => { const found = rules.filter(r => r.selectors.includes(selector)); assert.ok(found.length, `STYLE has ${selector}`); return found.map(r => r.decls).join(';'); };
  let checked = 0;
  for (const { selectors, decls } of rules) {
    const size = prop(decls, 'font-size');
    if (size) { assert.match(size, /^\d+(?:\.\d+)?px$/, `${selectors} font-size ${size}`); assert.ok(parseFloat(size) >= 11, `${selectors}: ${size} is at least 11 px`); }
    const text = color(prop(decls, 'color'));
    if (!text || text === 'transparent') continue;
    const back = color(prop(decls, 'background') ?? prop(decls, 'background-color'));
    const ground = /^#[0-9a-f]{6}$/i.test(back ?? '') ? back : paper;
    assert.match(text, /^#[0-9a-f]{6}$/i, `${selectors} color ${text}`);
    assert.ok(ratio(text, ground) >= 4.5, `${selectors}: ${text} on ${ground} is ${ratio(text, ground).toFixed(2)}:1`);
    checked++;
  }
  assert.ok(checked >= 6, `${checked} text colours checked`);
  // The credit eyebrow overrides dialog .eyebrow (9 px in #7a7254, under 4.5:1 on the paper).
  assert.ok(ratio('#7a7254', paper) < 4.5, 'premise: the dialog eyebrow alone would fail');
  assert.equal(prop(rule('.visits .visits-credit'), 'font-size'), '11px');
  assert.equal(color(prop(rule('.visits .visits-credit'), 'color')), '#5a685f');
  // The pressed look is the hosting choices' selected look that tests/next-browser.mjs SELECTED pins.
  const SELECTED = /const SELECTED = (\{[^}]*\});/.exec(read('tests/next-browser.mjs'))[1];
  const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
  const pressed = rule('.visits [aria-pressed=true]');
  assert.ok(SELECTED.includes(`background: '${rgb(prop(pressed, 'background'))}'`), SELECTED);
  assert.ok(SELECTED.includes(`border: '${prop(pressed, 'border').replace(/#[0-9a-f]{6}/i, rgb)}'`), SELECTED);
  assert.ok(SELECTED.includes(`color: '${rgb(color(prop(pressed, 'color')))}'`), SELECTED);
  assert.equal(prop(pressed, 'padding'), '11px 14px', 'the 2 px border takes 1 px of the secondary button padding');
  // 44 px targets.
  assert.deepEqual([prop(rule('.visits button'), 'min-height'), prop(rule('.visits button'), 'min-width')], ['44px', '44px']);
  assert.deepEqual([prop(rule('.visits-overlay button'), 'min-height'), prop(rule('.visits-overlay button'), 'min-width'), prop(rule('.visits-overlay button'), 'position')], ['44px', '44px', 'absolute']);
  assert.equal(prop(rule('.visits a.source-link'), 'min-height'), '44px');
  assert.deepEqual([prop(rule('.visits-overlay .visits-pin'), 'width'), prop(rule('.visits-overlay .visits-pin'), 'height')], ['44px', '44px']);
  assert.match(prop(rule('.visits-tray'), 'grid-template-columns'), /^repeat\(auto-fit,\s*minmax\(min\(100%,\s*140px\),\s*1fr\)\)$/);
  assert.match(K.STYLE, /@media \(max-width:360px\)\{\.visits-tray\{grid-template-columns:1fr 1fr\}\}/);
  // Overlay focus: style.css's ring outside, a light edge inside, so one of them shows on the dark diagram and map and on the papers.
  const focusRule = rule('.visits-overlay button:focus-visible'), ring = /#[0-9a-f]{6}/i.exec(prop(focusRule, 'outline'))[0], edge = color(prop(focusRule, 'border-color'));
  assert.equal(/button:focus-visible[^{]*\{\s*outline:3px solid (#[0-9a-f]{6})/.exec(CSS)[1], ring, "the overlay ring is style.css's focus ring");
  const grounds = [power.diagram(power.initialPower()), power.mapSVG(null), power.mapSVG(POWER_PLACE), election.paperSVG(election.initialElection(), VOTING), election.paperSVG({ ...election.initialElection(), palette: 1 }, VOTING)]
    .map(svg => /fill="(#[0-9a-f]{6})"/i.exec(svg)[1]);
  for (const ground of [...grounds, paper]) assert.ok(Math.max(ratio(ring, ground), ratio(edge, ground)) >= 3, `focus on ${ground}: ring ${ratio(ring, ground).toFixed(2)}, edge ${ratio(edge, ground).toFixed(2)}`);
});

test('injectStyle: one <style id="visits-style"> per document, also from createKit', () => {
  const appended = [], byId = new Map();
  const doc = { head: { append(el) { appended.push(el); byId.set(el.id, el); } }, createElement: tag => ({ tag }), getElementById: id => byId.get(id) ?? null };
  const style = K.injectStyle(doc);
  assert.deepEqual([style.tag, style.id, style.textContent], ['style', 'visits-style', K.STYLE]);
  assert.equal(K.injectStyle(doc), style);
  K.createKit({ ...visitsHost().host, doc }, K.freshSession());
  K.createKit({ ...visitsHost().host, doc }, K.freshSession());
  assert.equal(appended.length, 1);
});

// ---------------------------------------------------------------- declared fork text and the drift scan
test('VISITS_FORK_TEXT is declared fork text: the eight keys, each a non-empty line that no Godot source has', () => {
  const F = K.VISITS_FORK_TEXT;
  assert.deepEqual(Object.keys(F), ['back', 'nextEra', 'order', 'notesEyebrow', 'notesTitle', 'adopted', 'loading', 'dataError']);
  for (const [key, value] of Object.entries(F)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(value.length > 0 && value === value.trim(), key);
    assert.ok(!GD_LITERALS.has(value), `${key} is not a Godot literal: ${value}`);
    assert.ok(!GD_SOURCE.includes(value.slice(0, 24)), `${key} is not a Godot line: ${value}`);
  }
  // Premise of the one value that differs from the spec's proposal: "Back to the block" is film_screening.gd's own Back label.
  assert.ok(GD_LITERALS.has('Back to the block'));
  // The museum's declared web override names the fork's Next era button.
  assert.ok(Object.values(WEB_OVERRIDES['main.gd']).some(line => line.includes(`choose ${F.nextEra} `)));
});

test('the kit hand-types no Godot text: string literals it shares with Godot are structural or protocol identifiers', () => {
  const STRUCTURAL = ['', ' ', '\n', ': ', '. '];
  const shared = [...new Set(jsStrings(KIT))].filter(text => GD_LITERALS.has(text));
  assert.deepEqual(shared.filter(text => !STRUCTURAL.includes(text) && !/^[a-z][a-z_]*$/.test(text)), [], 'a Godot line or label comes from visits/text.js or is declared fork text');
});

test('every VISITS_FORK_TEXT key is drawn somewhere in browser-next', { todo: 'the screens (visits-ui.js, visits-episodes.js, visits-world.js) and game.js draw them; make this a plain test once they land' }, () => {
  const text = ['visits-kit.js', 'visits-ui.js', 'visits-episodes.js', 'visits-world.js', 'game.js'].map(name => { try { return read(`browser-next/${name}`); } catch { return ''; } }).join('\n');
  for (const key of Object.keys(K.VISITS_FORK_TEXT)) assert.ok(text.includes(`VISITS_FORK_TEXT.${key}`), key);
});

// ---------------------------------------------------------------- createKit: screens, routing and the ctx
test('show, holds, say and leave: a visits screen holds the dialog until Back, × or another screen ends it', () => {
  const s = setup(), { kit, log, dialog, session } = s;
  assert.equal(kit.holds(), false);
  kit.say('Nothing holds the dialog');
  assert.deepEqual(log.at(-1), ['toast', 'Nothing holds the dialog']);
  const version = session.version;
  s.draw('meal');
  assert.deepEqual([session.screen, kit.holds(), kit.holds('meal'), kit.holds('dogs')], ['meal', true, true, false]);
  assert.ok(session.version > version, 'show bumps the session version');
  kit.say('A line for the screen');
  assert.deepEqual(log.at(-1), ['status', 'A line for the screen']);
  const count = log.length;
  kit.say(''); kit.say(undefined);
  assert.equal(log.length, count, 'nothing to say says nothing');
  // Another screen in the same dialog (the recovery offer) ends the hold without a close event.
  dialog.show(RECOVERY);
  assert.equal(kit.holds(), false);
  kit.say('Under the offer');
  assert.deepEqual(log.at(-1), ['toast', 'Under the offer']);
  // Back: the screen is cleared before the dialog closes (so the shell's close listener sees no screen), then the toast.
  s.draw('meal');
  let screenAtClose = 'unset';
  dialog.modal.addEventListener('close', () => { screenAtClose = session.screen; });
  kit.leave('Back to the street.', 'meal-entry');
  assert.deepEqual(log.slice(-2), [['close', 'meal-entry'], ['toast', 'Back to the street.']]);
  assert.deepEqual([screenAtClose, session.screen, dialog.modal.open, kit.holds()], [null, null, false, false]);
  // Leaving when nothing holds closes nothing (a screen another module drew stays).
  dialog.show(RECOVERY);
  kit.leave('', 'x');
  assert.equal(dialog.modal.open, true);
  assert.notDeepEqual(log.at(-1)[0], 'close');
  // ×: the dialog closes under the screen.
  s.draw('picker'); dialog.close();
  assert.equal(kit.holds('picker'), false);
});

test('$, bind, on, focus, bump, sparks and objective', () => {
  const s = setup(), { kit, log, io, dialog, session } = s;
  s.draw('dogs', K.btn({ id: 'dogs-back', label: 'Back' }));
  assert.equal(kit.$('dogs-back'), dialog.doc.getElementById('dogs-back'));
  let clicks = 0, keys = 0;
  assert.equal(kit.bind('dogs-back', () => clicks++), true);
  assert.equal(kit.bind('missing', () => clicks++), false);
  assert.equal(kit.on('dogs-back', 'keydown', () => keys++), true);
  dialog.click('dogs-back');
  dialog.doc.getElementById('dogs-back').listeners.keydown[0]({});
  assert.deepEqual([clicks, keys], [1, 1]);
  assert.equal(kit.focus('dogs-back'), true);
  assert.equal(kit.focus('reader'), true);
  assert.equal(kit.focus('missing'), false);
  assert.deepEqual(log.filter(e => e[0] === 'focus'), [['focus', 'dogs-back'], ['focus', 'visits-reader']]);
  const v = session.version;
  assert.equal(kit.bump(), v + 1);
  assert.equal(session.version, v + 1);
  io.sparks = 7; io.objective = { id: 'explore', text: 'Spot it' };
  assert.equal(kit.sparks(), 7);
  assert.equal(kit.objective(), io.objective);
});

test('ctx(extra): the shared episode context of spec 3.5', () => {
  const s = setup(), { kit, io, dialog, session } = s;
  assert.deepEqual(kit.ctx(), { opened: true, busy: false, startupCard: false, storyCard: false, walking: false, player: { x: 0, y: 0 }, musicPlaying: false, powerPlace: null, voting: null, sites: {}, storyActive: false, hostingInProgress: false, sidePanel: false });
  Object.assign(io, { walking: true, player: { x: 3, y: 4 }, music: true, neighbor: 'bea', hosting: true });
  assert.deepEqual(kit.ctx(), { opened: true, busy: false, startupCard: false, storyCard: false, walking: true, player: { x: 3, y: 4 }, musicPlaying: true, powerPlace: null, voting: null, sites: {}, storyActive: false, hostingInProgress: true, sidePanel: true });
  assert.notEqual(kit.ctx().player, kit.ctx().player, "the host's copy of the player");
  io.state = { opened: 'yes' };
  assert.equal(kit.ctx().opened, false, 'opened only when state.opened === true');
  io.state = { opened: true };
  // busy: another screen holds the dialog; never a visits screen, the story card, or an open from Field notes.
  dialog.show('<h2 id="modal-title">Field notes</h2>');
  assert.equal(kit.ctx().busy, true);
  assert.equal(kit.ctx({ from: 'notes' }).busy, false);
  io.cards = { startup: true, story: true };
  assert.deepEqual([kit.ctx().busy, kit.ctx().startupCard, kit.ctx().storyCard], [false, true, true]);
  io.cards = { startup: false, story: false };
  s.draw('meal');
  assert.equal(kit.ctx().busy, false);
  // storyActive comes from the session's episodes; extra wins over everything.
  io.walking = false;
  s.step('dogs', { type: 'open' }); s.step('dogs', { type: 'begin' });
  assert.equal(session.stories.dogs.active, true);
  assert.equal(kit.ctx().storyActive, true);
  assert.deepEqual([kit.ctx({ walking: false }).walking, kit.ctx({ sites: { larkin: false } }).sites], [false, { larkin: false }]);
});

test('bindMusic: the redraw waits for the music only while its screen holds the dialog, and Godot\'s music line is said last', async () => {
  const s = setup(), { kit, log, dialog, host } = s;
  let settle = null, draws = 0;
  host.music.toggle = () => new Promise(resolve => { settle = resolve; });
  const draw = () => { draws++; s.draw('dogs', K.btn(kit.musicButton('dogs')) + K.btn({ id: 'dogs-back', label: 'Back' })); kit.bindMusic('dogs', draw); };
  assert.deepEqual(kit.musicButton('dogs'), { id: 'dogs-music', label: host.music.label() });
  // Held: redraw, focus Music, then the line.
  draw(); draws = 0;
  dialog.click('dogs-music'); settle('Music playing: 80 BPM Sketch (stems).'); await flush();
  assert.equal(draws, 1);
  assert.deepEqual(log.slice(-2), [['focus', 'dogs-music'], ['status', 'Music playing: 80 BPM Sketch (stems).']]);
  // Back before the music answers: nothing is drawn or said afterwards.
  dialog.click('dogs-music'); kit.leave('', undefined);
  let count = log.length;
  settle('Music paused.'); await flush();
  assert.deepEqual([draws, log.length], [1, count]);
  // Another screen in the same dialog, or another visits screen: nothing is drawn over it.
  for (const replace of [() => dialog.show(RECOVERY), () => s.draw('picker')]) {
    draw(); draws = 0;
    dialog.click('dogs-music'); replace(); count = log.length;
    settle('Music paused.'); await flush();
    assert.deepEqual([draws, log.length], [0, count]);
  }
  // A toggle that fails still redraws its screen and says nothing (the host already showed why).
  host.music.toggle = () => Promise.reject(Error('no audio'));
  draw(); draws = 0;
  dialog.click('dogs-music'); await flush();
  assert.equal(draws, 1);
  assert.notEqual(log.at(-1)[0], 'status');
});

test('noRepeat: a held Enter or Space never presses a chained control again', () => {
  const s = setup(), { kit, dialog } = s;
  s.draw('lantern', K.btn({ id: 'lantern-advance', label: 'Gather' }) + K.btn({ id: 'lantern-walk', label: 'Walk' }));
  kit.noRepeat(['lantern-advance', 'lantern-walk', 'not-on-screen']);
  const key = (id, init) => { const event = { ...init, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const fn of dialog.doc.getElementById(id).listeners.keydown || []) fn(event); return event.defaultPrevented; };
  for (const id of ['lantern-advance', 'lantern-walk']) {
    assert.equal(key(id, { key: 'Enter', repeat: false }), false, 'the first Enter presses');
    assert.equal(key(id, { key: 'Enter', repeat: true }), true, 'its repeats do not');
    assert.equal(key(id, { key: ' ', repeat: true }), true);
    assert.equal(key(id, { key: 'ArrowDown', repeat: true }), false);
    // A held Enter: one keydown, then repeats; a keydown whose default is not prevented presses the button.
    assert.equal([false, true, true, true].filter(repeat => !key(id, { key: 'Enter', repeat })).length, 1, 'a held Enter presses once');
  }
});

test('readerEntry, bindReaderEntry, openPicker and openResume go through the shell routes', () => {
  const opened = [];
  const s = setup({ routes: { openPicker: () => { opened.push('picker'); return true; }, openResume: () => { opened.push('resume'); return true; } } });
  const html = s.kit.readerEntry('dogs'), [b] = buttonsOf(html), entry = picker.readerEntry();
  assert.equal(b.id, 'dogs-stories');
  assert.match(html, />Other<br>stories<\/button>/);
  assertLabelInName(b, entry);
  assert.deepEqual([b.attrs['aria-label'], b.description], ['Other stories', entry.name]);
  s.kit.show('dogs', K.frameHTML({ kind: 'dogs', title: 'dogs', headingEntry: html }));
  assert.equal(s.kit.bindReaderEntry('dogs'), true);
  s.dialog.click('dogs-stories');
  assert.equal(s.kit.openResume(), true);
  assert.deepEqual(opened, ['picker', 'resume']);
  const bare = setup({ routes: {} });
  assert.deepEqual([bare.kit.openPicker(), bare.kit.openResume()], [false, false]);
  bare.kit.routes.openPicker = () => 'late';
  assert.equal(bare.kit.openPicker(), 'late', 'the shell may fill the routes after createKit');
});

// ---------------------------------------------------------------- lazy data (spec 3.4)
test('ensureData: idle, loading, ready; invalid is final for the visit; a network error is retried on the next open', async t => {
  const loader = () => {
    const s = setup(), pending = {};
    s.host.load = name => { s.log.push(['load', name]); return (pending[name] = deferred()).promise; };
    return { ...s, pending, loads: () => s.log.filter(e => e[0] === 'load').map(e => e[1]) };
  };
  await t.test('idle to ready: one load in flight, the loading line, one redraw per waiting screen, then the data in ctx', async () => {
    const s = loader(), { kit, session, log } = s;
    let redraws = 0, joined = 0;
    s.draw('power');
    assert.equal(session.data.power_place.status, 'idle');
    assert.equal(kit.ensureData(['power_place.json'], () => { redraws++; s.draw('power'); }), false);
    assert.equal(session.data.power_place.status, 'loading');
    assert.deepEqual(log.at(-1), ['status', K.VISITS_FORK_TEXT.loading]);
    assert.equal(kit.ensureData(['power_place'], () => joined++), false, 'a second open while loading waits for the same load');
    assert.deepEqual(s.loads(), ['power_place.json']);
    assert.equal(kit.data('power_place'), null);
    s.pending['power_place.json'].resolve(POWER_PLACE); await flush();
    assert.deepEqual([session.data.power_place.status, redraws, joined], ['ready', 1, 1]);
    assert.equal(kit.data('power_place.json'), POWER_PLACE);
    assert.equal(kit.data('power_place'), POWER_PLACE);
    assert.equal(kit.ctx().powerPlace, POWER_PLACE);
    assert.equal(kit.ensureData(['power_place.json'], () => redraws++), true, 'ready: nothing to wait for');
    assert.deepEqual([s.loads(), redraws], [['power_place.json'], 1]);
  });
  await t.test('both files at once: the redraw waits for both', async () => {
    const s = loader();
    let redraws = 0;
    s.draw('picker');
    assert.equal(s.kit.ensureData(['power_place.json', 'voting_places.json'], () => redraws++), false);
    assert.deepEqual(s.loads(), ['power_place.json', 'voting_places.json']);
    s.pending['voting_places.json'].resolve(VOTING); await flush();
    assert.equal(redraws, 0);
    s.pending['power_place.json'].resolve(POWER_PLACE); await flush();
    assert.equal(redraws, 1);
    assert.deepEqual([s.kit.ctx().powerPlace, s.kit.ctx().voting], [POWER_PLACE, VOTING]);
  });
  await t.test('invalid bytes are final for the visit, and a validator that throws reads as invalid', async () => {
    const s = loader();
    s.draw('election');
    s.kit.ensureData(['voting_places.json'], () => {});
    s.pending['voting_places.json'].resolve({ ...VOTING, format: 2 }); await flush();
    assert.deepEqual(s.session.data.voting_places, { status: 'invalid', value: null });
    assert.equal(s.kit.ctx().voting, null);
    assert.equal(s.kit.ensureData(['voting_places.json'], () => {}), true, 'invalid is settled');
    assert.deepEqual(s.loads(), ['voting_places.json'], 'and never loaded again this visit');
    assert.notDeepEqual(s.log.at(-1), ['status', K.VISITS_FORK_TEXT.dataError], 'a bad file is not a network error');
    s.kit.ensureData(['power_place.json'], () => {});
    s.pending['power_place.json'].resolve({ get junction() { throw Error('hostile'); }, address_point: {}, return_junction: {}, exterior: {}, eddy: {} }); await flush();
    assert.equal(s.session.data.power_place.status, 'invalid');
  });
  await t.test('a network error redraws the waiting screen, says so, and is retried on the next open', async () => {
    const s = loader();
    let redraws = 0;
    s.draw('power');
    s.kit.ensureData(['power_place.json'], () => { redraws++; s.draw('power'); });
    s.pending['power_place.json'].reject(Error('offline')); await flush();
    assert.deepEqual([s.session.data.power_place, redraws], [{ status: 'error', value: null }, 1]);
    assert.deepEqual(s.log.at(-1), ['status', K.VISITS_FORK_TEXT.dataError], 'said after the redraw');
    assert.equal(s.kit.ensureData(['power_place.json'], () => redraws++), false);
    assert.deepEqual(s.loads(), ['power_place.json', 'power_place.json']);
    s.pending['power_place.json'].resolve(POWER_PLACE); await flush();
    assert.deepEqual([s.session.data.power_place.status, redraws], ['ready', 2]);
    // A host.load that throws at once is a network error too.
    const t2 = setup({ over: { load: () => { throw Error('no fetch'); } } });
    t2.draw('power');
    assert.equal(t2.kit.ensureData(['power_place.json'], () => {}), false);
    await flush();
    assert.equal(t2.session.data.power_place.status, 'error');
  });
  await t.test('a load that settles after its screen was left or replaced draws nothing', async () => {
    for (const leave of [s => s.kit.leave('', undefined), s => s.dialog.show(RECOVERY), s => s.draw('meal'), s => s.dialog.close()]) {
      const s = loader();
      let redraws = 0;
      s.draw('power');
      s.kit.ensureData(['power_place.json'], () => redraws++);
      leave(s);
      const count = s.log.length;
      s.pending['power_place.json'].reject(Error('offline')); await flush();
      assert.deepEqual([redraws, s.log.length], [0, count]);
    }
    // Opened with no visits screen on show: it loads, says nothing and draws nothing.
    const s = loader();
    let redraws = 0;
    assert.equal(s.kit.ensureData(['power_place.json'], () => redraws++), false);
    assert.equal(s.log.filter(e => e[0] === 'status' || e[0] === 'toast').length, 0);
    s.pending['power_place.json'].resolve(POWER_PLACE); await flush();
    assert.deepEqual([redraws, s.session.data.power_place.status], [0, 'ready']);
  });
  await t.test('a fresh session drops a load the session before it started', async () => {
    const s = loader();
    let redraws = 0;
    s.draw('power');
    s.kit.ensureData(['power_place.json'], () => redraws++);
    const session = s.session, version = session.version;
    s.kit.resetSession();
    assert.equal(s.kit.session, session, 'the kit keeps its session object');
    assert.ok(session.version > version, 'and its version keeps rising');
    assert.deepEqual(session.data.power_place, { status: 'idle', value: null });
    s.pending['power_place.json'].resolve(POWER_PLACE); await flush();
    assert.deepEqual([session.data.power_place, redraws], [{ status: 'idle', value: null }, 0]);
    assert.equal(s.kit.ensureData(['power_place.json'], () => {}), false);
    assert.deepEqual(s.loads(), ['power_place.json', 'power_place.json']);
  });
  await t.test('names it does not know are ignored', () => {
    const s = loader();
    assert.equal(s.kit.ensureData(['streets.osm.json'], () => {}), true);
    assert.equal(s.kit.ensureData([], () => {}), true);
    assert.deepEqual(s.loads(), []);
  });
});

// ---------------------------------------------------------------- the walk protocol (spec 3.6)
test('startWalk and the trip: the walk protocol of spec 3.6', async t => {
  const dogsWalk = s => {
    s.step('dogs', { type: 'open' }); s.step('dogs', { type: 'begin' }); s.step('dogs', { type: 'lead', index: 1 });
    s.draw('dogs');
    return s.step('dogs', { type: 'walk' });
  };
  await t.test("one host.walk stub answering 'walking', then 'blocked'", () => {
    const answers = ['walking', 'blocked'], s = setup();
    s.host.walk = (goal, opts) => { s.log.push(['walk', goal, opts]); return answers.shift(); };
    let r = dogsWalk(s);
    assert.equal(s.kit.startWalk('dogs', r.walk, { name: 'Lead' }), 'walking');
    assert.deepEqual([s.session.trip, s.dialog.modal.open, s.drawn], ['dogs', false, []]);
    s.io.player = { ...DOG_GOALS[1] };
    s.kit.walkEnded();
    assert.deepEqual([s.session.trip, s.session.stories.dogs.open, s.drawn.length], [null, true, 1]);
    s.io.player = { x: 0, y: 0 };
    r = s.step('dogs', { type: 'walk' });
    assert.ok(r.walk, 'the reopened screen walks again');
    assert.equal(s.kit.startWalk('dogs', r.walk, { name: 'Lead' }), 'blocked');
    assert.deepEqual([s.session.trip, s.session.stories.dogs.open, s.session.stories.dogs.traveling, s.drawn.at(-1)], [null, true, false, ['dogs', dogs.TEXT.blocked_route.blocked]]);
    assert.equal(s.log.filter(e => e[0] === 'walk').length, 2);
    assert.deepEqual(s.log.at(-1), ['status', dogs.TEXT.blocked_route.blocked]);
  });
  await t.test("walking: the screen closes first, host.walk routes, and the trip is set only once it says 'walking'", () => {
    const s = setup();
    const r = dogsWalk(s);
    assert.deepEqual([r.walk, s.session.stories.dogs.open, s.session.stories.dogs.traveling], [DOG_GOALS[1], false, true]);
    let during = null;
    s.host.walk = (goal, opts) => { s.log.push(['walk', goal, opts]); during = { trip: s.session.trip, open: s.dialog.modal.open, screen: s.session.screen }; return 'walking'; };
    assert.equal(s.kit.startWalk('dogs', r.walk, { name: 'Lead', announce: '', keepCamera: false }), 'walking');
    assert.deepEqual(during, { trip: null, open: false, screen: null });
    assert.deepEqual(s.log.filter(e => e[0] === 'close' || e[0] === 'walk'), [['close', undefined], ['walk', { ...DOG_GOALS[1] }, { name: 'Lead', announce: '', keepCamera: false }]]);
    assert.deepEqual([s.session.trip, s.session.screen, s.said()], ['dogs', null, []]);
    // Arrival within 2 m reopens the screen (Godot open_from_walking); the trip is over.
    s.io.player = { ...DOG_GOALS[1] };
    assert.equal(s.kit.walkEnded(), true);
    assert.deepEqual([s.session.trip, s.session.stories.dogs.open, s.session.stories.dogs.traveling], [null, true, false]);
    assert.deepEqual(s.drawn.map(d => d[0]), ['dogs']);
    assert.equal(s.drawn[0][1], dogs.announce(s.session.stories.dogs, s.kit.ctx()));
    assert.equal(s.kit.walkEnded(), false, 'no trip, nothing to end');
  });
  await t.test("blocked: Godot's blocked line reopens the episode and goes to its status line; no trip", () => {
    const s = setup({ over: { walk: () => 'blocked' } });
    const r = dogsWalk(s);
    assert.equal(s.kit.startWalk('dogs', r.walk, { name: 'Lead' }), 'blocked');
    const blocked = dogs.TEXT.blocked_route.blocked;
    assert.deepEqual([s.session.trip, s.session.stories.dogs.open, s.session.stories.dogs.message], [null, true, blocked]);
    assert.deepEqual(s.drawn, [['dogs', blocked]]);
    assert.deepEqual(s.log.at(-1), ['status', blocked]);
    // Power reopens through its own open (walk_to_relay's closed line first in the reader).
    const p = setup({ over: { walk: () => 'blocked' } });
    p.step('power', { type: 'open' }); p.step('power', { type: 'begin' }); p.draw('power');
    const w = p.step('power', { type: 'walk' });
    assert.ok(w.walk);
    p.kit.startWalk('power', w.walk, { name: 'Relay', announce: w.announce });
    assert.equal(p.session.stories.power.open, true);
    assert.ok(p.drawn[0][1].includes(power.TEXT.walk_to_relay.closed), p.drawn[0][1]);
  });
  await t.test('with no episode renderer, or another dialog open, the episode stays closed and the line is a toast', () => {
    const s = setup({ over: { walk: () => 'blocked' }, routes: {} });
    const r = dogsWalk(s);
    s.kit.startWalk('dogs', r.walk);
    assert.deepEqual([s.session.stories.dogs.open, s.log.at(-1)], [false, ['toast', dogs.TEXT.blocked_route.blocked]]);
    const o = setup();
    const w = dogsWalk(o);
    o.kit.startWalk('dogs', w.walk);
    o.dialog.show('<h2 id="modal-title">Settings</h2>');
    o.io.player = { ...DOG_GOALS[1] };
    assert.equal(o.kit.walkEnded(), true);
    assert.deepEqual([o.session.stories.dogs.open, o.session.stories.dogs.traveling, o.drawn], [false, false, []]);
    assert.equal(o.log.at(-1)[0], 'toast');
    assert.ok(o.log.at(-1)[1].startsWith(dogs.dogsView(o.session.stories.dogs, o.kit.ctx()).heading), 'the arrival line, not a refusal');
    // A refused route under another dialog: Power's own reopen line is a toast and the other dialog stays.
    const q = setup({ over: { walk: () => 'blocked' } });
    q.step('power', { type: 'open' }); q.step('power', { type: 'begin' });
    const pw = q.step('power', { type: 'walk' });
    q.dialog.show('<h2 id="modal-title">Settings</h2>');
    q.kit.startWalk('power', pw.walk);
    assert.deepEqual([q.session.stories.power.open, q.drawn, q.dialog.modal.open, q.log.at(-1)[0]], [false, [], true, 'toast']);
    assert.ok(q.log.at(-1)[1].includes(power.TEXT.walk_to_relay.closed), q.log.at(-1)[1]);
  });
  await t.test("a stop cancels the trip silently; host.walk's own stopWalk cancels an earlier trip, never the new one", () => {
    const s = setup();
    const r = dogsWalk(s);
    // game.js host.walk calls stopWalk() first, which reports walkCancelled() for a visits-owned walk.
    s.host.walk = () => { s.kit.walkCancelled(); return 'walking'; };
    s.kit.startWalk('dogs', r.walk);
    assert.equal(s.session.trip, 'dogs');
    const count = s.log.length;
    assert.equal(s.kit.walkCancelled(), true);
    assert.deepEqual([s.session.trip, s.session.stories.dogs.traveling, s.log.length], [null, false, count], 'silent');
    assert.equal(s.kit.walkCancelled(), false);
    // An earlier trip is cancelled by the new walk's stopWalk; the new trip is set after it.
    s.session.stories = { ...s.session.stories, lantern: { ...s.session.stories.lantern, traveling: true } };
    s.session.trip = 'lantern';
    s.kit.startWalk('dogs', r.walk);
    assert.deepEqual([s.session.trip, s.session.stories.lantern.traveling], ['dogs', false]);
    // An earlier trip of the same episode is superseded, not cancelled: the intent its new walk action just set survives.
    const same = setup();
    const w = dogsWalk(same);
    same.session.trip = 'dogs';
    same.host.walk = () => { same.kit.walkCancelled(); return 'walking'; };
    same.kit.startWalk('dogs', w.walk);
    assert.deepEqual([same.session.trip, same.session.stories.dogs.traveling], ['dogs', true]);
    same.io.player = { ...DOG_GOALS[1] };
    same.kit.walkEnded();
    assert.equal(same.session.stories.dogs.open, true, 'so the arrival still reopens the screen');
  });
  await t.test('a goal that is not a finite point never reaches host.walk, and host.walk that throws is blocked', () => {
    for (const goal of [null, undefined, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: '1', y: 2 }]) {
      const s = setup();
      const r = dogsWalk(s);
      assert.ok(r.walk);
      assert.equal(s.kit.startWalk('dogs', goal), 'blocked');
      assert.deepEqual([s.log.filter(e => e[0] === 'walk'), s.session.trip, s.session.stories.dogs.open], [[], null, true]);
    }
    const s = setup({ over: { walk: () => { throw Error('router'); } } });
    const r = dogsWalk(s);
    assert.equal(s.kit.startWalk('dogs', r.walk), 'blocked');
    assert.equal(s.session.trip, null);
    // Only an episode walks through the protocol; anything else is a caller's mistake, refused before the screen closes.
    s.draw('meal');
    assert.throws(() => s.kit.startWalk('meal', { x: 0, y: 0 }), TypeError);
    assert.deepEqual([s.session.screen, s.dialog.modal.open], ['meal', true]);
  });
  await t.test('tickTrip moves the lantern only while the lantern trip travels', () => {
    const s = setup();
    s.session.stories = { ...s.session.stories, lantern: { ...lantern.initialLantern(), active: true, phase: 1, progress: 8, traveling: true, tripGoal: lantern.routePoint(36), lastPlayer: lantern.routePoint(8) } };
    s.io.player = lantern.routePoint(12);
    assert.equal(s.kit.tickTrip(), false, 'no trip');
    assert.equal(s.session.stories.lantern.progress, 8);
    s.io.player = lantern.routePoint(8);
    assert.equal(s.kit.startWalk('lantern', lantern.routePoint(36), { name: 'Finish', keepCamera: true }), 'walking');
    assert.deepEqual(s.log.find(e => e[0] === 'walk')[2], { name: 'Finish', announce: '', keepCamera: true });
    s.io.player = lantern.routePoint(12);
    const version = s.session.version;
    assert.equal(s.kit.tickTrip(), true);
    assert.ok(Math.abs(s.session.stories.lantern.progress - 12) < 1e-9, String(s.session.stories.lantern.progress));
    assert.ok(s.session.version > version);
    const still = s.session.version, stories = s.session.stories;
    assert.equal(s.kit.tickTrip(), false, 'standing still changes nothing');
    assert.deepEqual([s.session.version, s.session.stories], [still, stories]);
    s.kit.walkCancelled();
    s.io.player = lantern.routePoint(20);
    assert.equal(s.kit.tickTrip(), false);
    assert.ok(Math.abs(s.session.stories.lantern.progress - 12) < 1e-9);
  });
});
