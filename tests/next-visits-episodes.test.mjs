// browser-next/visits-episodes.js, the four episode screens of the side stories (Phase 3 wiring spec WP2b): Two Dogs Home, the
// Lantern Procession, Power Story with the Larkin place and the Election Walk, drawn on the visits kit (visits-kit.js) over the
// recording stand-in host of next-fixtures.mjs. Every run drives the pure modules through clicks and stubbed walks only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gdSource, gdStrings, jsStrings } from './gd-literal.mjs';
import { visitsHost } from './next-fixtures.mjs';
import * as K from '../browser-next/visits-kit.js';
import * as picker from '../browser-next/visits/picker.js';
import * as dogs from '../browser-next/visits/dogs.js';
import * as lantern from '../browser-next/visits/lantern.js';
import * as power from '../browser-next/visits/power.js';
import * as election from '../browser-next/visits/election.js';
import * as P from '../browser-next/visits/positions.js';
import { createEpisodeScreens, createPictures } from '../browser-next/visits-episodes.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const SRC = read('browser-next/visits-episodes.js');
const POWER_PLACE = JSON.parse(read('godot/data/power_place.json'));
const VOTING = JSON.parse(read('godot/data/voting_places.json'));
const GD_LITERALS = new Set(readdirSync(new URL('../godot/', import.meta.url)).filter(name => name.endsWith('.gd')).flatMap(name => gdStrings(gdSource(name))));
// A macrotask: every microtask queued before it, and every one those queue in turn, has run by then (the episode screens set no
// timer), so "draws nothing" means nothing, however long the promise chain before the draw.
const flush = () => new Promise(resolve => setImmediate(resolve));
// n microtask ticks: the old flush was ticks(20), kept only to show what it missed.
const ticks = async n => { for (let i = 0; i < n; i++) await null; };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const RECOVERY = '<section data-recovery><h2 id="modal-title">Some progress went back.</h2><button id="recover-save">Keep this tab’s progress</button></section>';
const IDS = ['dogs', 'lantern', 'power', 'election'];
// Godot's chained controls: each press advances the story a stage, so a held key must not press them again.
const CHAINED = { dogs: ['dogs-walk', 'dogs-match'], lantern: ['lantern-walk', 'lantern-advance'], power: ['power-check'], election: ['election-walk', 'election-record', 'election-make', 'election-share'] };

// ---------------------------------------------------------------- reading generated HTML (as tests/next-visits-kit.test.mjs reads it)
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
// WCAG 2.5.3: the accessible name starts with the visible label, or, for a label of one or two characters that are no word (the
// Election Walk's pins), holds it as a token of its own; Godot's own name is the name or the description.
const token = (name, label) => /^[^\p{L}]{1,2}$/u.test(label) && [...name.matchAll(/[^\p{L}\p{N}\s]+|[\p{L}\p{N}]+/gu)].some(m => m[0] === label);
function assertLabelInName(b, view = {}) {
  assert.ok(b.name.startsWith(b.shown) || token(b.name, b.shown), `#${b.id}: the name ${JSON.stringify(b.name)} starts with the visible label ${JSON.stringify(b.shown)}`);
  if (view.name != null && spoken(view.name) !== b.shown) assert.ok(b.name === spoken(view.name) || b.description?.includes(spoken(view.name)), `#${b.id}: Godot's name is the accessible name or its description`);
}
const spans = html => [...html.matchAll(/<span class="visits-label" style="([^"]*)">([^<]*)<\/span>/g)].map(m => ({ style: decode(m[1]), text: decode(m[2]) }));
const pct = (value, total) => `${+(value / total * 100).toFixed(4)}%`;
const styleOf = text => Object.fromEntries(String(text).split(';').filter(Boolean).map(rule => { const at = rule.indexOf(':'); return [rule.slice(0, at), rule.slice(at + 1)]; }));

// ---------------------------------------------------------------- the stand-in shell
// The kit on a fresh session over the recording host, the episode screens as the shell's renderEpisode route, and the shell's
// open: picker.openEpisode (Power delegates to another active episode), then the screen of whichever episode opened.
function setup({ over = {}, data = true } = {}) {
  const { host, log, io, dialog } = visitsHost(undefined, over), session = K.freshSession(), routes = {}, picked = [];
  const kit = K.createKit(host, session, routes), screens = createEpisodeScreens(kit);
  routes.renderEpisode = (id, opts) => screens.render(id, opts);
  routes.openPicker = () => { picked.push(picker.openEpisodeId(session.stories)); return true; };
  io.files = { 'power_place.json': POWER_PLACE, 'voting_places.json': VOTING };
  if (data) Object.assign(session.data, { power_place: { status: 'ready', value: POWER_PLACE }, voting_places: { status: 'ready', value: VOTING } });
  const s = { host, log, io, dialog, session, kit, screens, routes, picked };
  s.open = (id, extra) => {
    const out = picker.changeEpisode(session.stories, id, { type: 'open' }, kit.ctx(extra));
    session.stories = out.stories;
    const shown = picker.openEpisodeId(session.stories);
    if (!out.refused && shown) assert.equal(screens.render(shown, { announce: out.announce }), true);
    return out;
  };
  s.click = id => dialog.click(id);
  s.status = () => log.filter(e => e[0] === 'status').at(-1)?.[1];
  s.said = () => log.filter(e => e[0] === 'status' || e[0] === 'toast');
  s.walks = () => log.filter(e => e[0] === 'walk');
  s.shows = () => log.filter(e => e[0] === 'show').length;
  s.arrive = at => { io.player = { x: at.x, y: at.y }; return kit.walkEnded(); };
  s.state = id => session.stories[id];
  s.view = id => picker.episodeView(session.stories, id, kit.ctx());
  s.announce = id => picker.episodeModule(id).announce(session.stories[id], { ...kit.ctx(), activeId: picker.activeEpisode(session.stories) });
  return s;
}

// The screen on show is exactly the view's: heading, credit, reader, picture, every control in Godot's order with the view's
// disabled and pressed states and names, the overlay, and nothing else; no inline handler; every image a data: URI.
function assertScreen(s, id) {
  const { session, kit, io, dialog } = s, ctx = kit.ctx(), v = picker.episodeView(session.stories, id, ctx), html = io.html, st = session.stories[id];
  assert.equal(session.screen, id, `the session's screen is ${id}`);
  assert.ok(kit.holds(id), `${id} holds the dialog`);
  assert.ok(html.startsWith(`<section class="visits" data-visits="${id}"><p class="eyebrow visits-credit">${K.esc(v.credit)}</p>`), 'the credit eyebrow first');
  assert.equal(decode(dialog.heading()), v.heading);
  assert.ok(html.includes(`aria-label="Story text">${K.paragraphs(v.text)}</div>`), 'the reader is the view text');
  const expected = [];
  if (id === 'power') {
    for (const p of v.pads) expected.push([`power-pad-${p.index}`, p, p.visible]);
    for (const t of v.tabs) expected.push([`power-tab-${t.index}`, t, true]);
    expected.push(['power-dogs', v.dogs, true], ['power-more', v.more, true]);
    for (const a of v.actions) expected.push([`power-${a.id}`, a, true]);
  } else {
    expected.push([`${id}-stories`, picker.readerEntry(), true]);
    if (id === 'election') for (const p of v.pins) expected.push([`election-pin-${p.index}`, p, p.visible]);
    for (const b of v.buttons) expected.push([`${id}-${b.id}`, b, true]);
  }
  const all = buttonsOf(html), by = new Map(all.map(b => [b.id, b]));
  assert.deepEqual(all.map(b => b.id), expected.filter(e => e[2]).map(e => e[0]), 'every control in Godot\'s order, and no other');
  // Power's relay tabs, while its story is active, are pressed for the relay on show (a declared 2D addition; Godot's are plain).
  const pressed = (dom, item) => (dom.startsWith('power-tab-') ? (st.active ? item.index === st.station : undefined) : item.pressed);
  for (const [dom, item, visible] of expected) {
    const b = by.get(dom);
    if (!visible) { assert.equal(b, undefined, `#${dom} is not drawn`); continue; }
    assert.equal('disabled' in b.attrs, !!item.disabled, `#${dom} is disabled exactly when the view says so`);
    assert.equal(b.attrs['aria-pressed'], pressed(dom, item) === undefined ? undefined : String(!!pressed(dom, item)), `#${dom} aria-pressed`);
    assert.equal(b.shown, spoken(item.label ?? ''), `#${dom} shows Godot's label`);
    assertLabelInName(b, item);
    assert.equal('data-rapid' in b.attrs, dom.startsWith('power-pad-'), `#${dom}: only the connector pads are rapid`);
  }
  const imgs = tagsOf(html).filter(t => t.name === 'img');
  assert.equal(imgs.length, 1, 'one picture');
  const picture = {
    dogs: () => dogs.illustration(st.profile), lantern: () => lantern.artwork(st.costume, st.lantern),
    power: () => (v.picture === 'map' ? power.mapSVG(ctx.powerPlace) : power.diagram(st)), election: () => election.paperSVG(st, ctx.voting),
  }[id]();
  assert.equal(imgs[0].attrs.src, K.dataURI(picture), 'the picture is the pure module SVG as a data: URI');
  assert.equal(imgs[0].attrs.alt, id === 'dogs' ? v.description : '');
  for (const tag of tagsOf(html)) {
    for (const attr of Object.keys(tag.attrs)) assert.doesNotMatch(attr, /^on/i, `no inline handler (${attr} on <${tag.name}>)`);
    if ('src' in tag.attrs) assert.match(tag.attrs.src, /^data:image\/svg\+xml;/);
  }
  assert.doesNotMatch(html, /\son[a-z]+=|<script/i);
  const labels = spans(html);
  if (id === 'power') assert.deepEqual(labels.map(l => l.text), v.mapLabels.filter(l => l.visible).map(l => l.text));
  else if (id === 'election') assert.deepEqual(labels.map(l => l.text), v.labels.filter(l => l.visible).map(l => l.text));
  else assert.deepEqual(labels, []);
  return v;
}
const focused = s => s.io.focused;

// ---------------------------------------------------------------- the module
test('the module imports in Node without a DOM, exports createEpisodeScreens(kit), and reaches the page only through the kit', async () => {
  assert.equal(typeof globalThis.document, 'undefined');
  const mod = await import('../browser-next/visits-episodes.js');
  assert.equal(typeof mod.createEpisodeScreens, 'function');
  assert.equal(typeof mod.createPictures, 'function');
  const { screens } = setup();
  assert.deepEqual(Object.keys(screens).sort(), ['cancel', 'render', 'silentClose']);
  const code = SRC.replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g, "''");
  assert.doesNotMatch(code, /\b(document|window|localStorage|sessionStorage|setTimeout|requestAnimationFrame|fetch|Math\.random|Date\.now|performance)\b/);
  assert.doesNotMatch(code, /\binnerHTML\b|\bquerySelector/, 'only getElementById and addEventListener, through the kit');
  assert.doesNotMatch(code, /\bhost\b/, 'every host call goes through a kit member');
  assert.ok(!SRC.includes('\r'), 'visits-episodes.js is LF');
  for (const name of ['core.js', 'godot-save.js']) assert.doesNotMatch(read(`browser-next/${name}`), /visits-episodes/);
});

test('render draws only an open episode, and only the four episodes', () => {
  const s = setup();
  for (const id of [...IDS, 'meal', 'picker', 'nope']) assert.equal(s.screens.render(id, { announce: 'x' }), false, id);
  assert.equal(s.shows(), 0);
  assert.equal(s.dialog.modal.open, false);
  for (const id of IDS) {
    const out = s.open(id);
    assert.equal(out.refused, false, id);
    assertScreen(s, id);
    assert.deepEqual(s.log.at(-1), ['status', out.announce], `${id}: Godot's open announcement is the status line, said last`);
    assert.equal(s.screens.cancel(id), true);
  }
});

// ---------------------------------------------------------------- the rapid set
test('the four connector pads are the one rapid mark: literal data-rapid tags, as the rapid-set test reads them', () => {
  // tests/next-press-settle.test.mjs "the rapid set": whole-line // comments only describe marks.
  const code = SRC.split(/\r?\n/).filter(line => !/^\s*\/\//.test(line)).join('\n');
  assert.deepEqual([...code.matchAll(/\bid="([^"]+)" data-rapid\b/g)].map(m => m[1]), ['power-pad-${i}']);
  assert.equal((code.match(/data-rapid/g) || []).length, 1, 'data-rapid appears only in the pad tag');
  assert.deepEqual([...code.matchAll(/\$\{(\w+)\.rapid \? ' data-rapid' : ''\}/g)], [], 'not a conduit: the kit\'s btn() is');
  assert.deepEqual([...code.matchAll(/\{ id: '([^']+)'[^{}\n]*\brapid: true\b/g)], [], 'no view marked rapid here');
  assert.equal(code.match(/\brapid: (?!true\b|false\b)[^,}]+/g), null, 'no computed mark');
  // Rendered: the pads over the diagram carry it, and nothing else on any episode screen does.
  const s = setup();
  s.open('power');
  const rapid = html => tagsOf(html).filter(t => 'data-rapid' in t.attrs).map(t => t.attrs.id);
  assert.deepEqual(rapid(s.io.html), ['power-pad-0', 'power-pad-1', 'power-pad-2', 'power-pad-3']);
  s.click('power-tab-1');
  assert.deepEqual(rapid(s.io.html), [], 'the case map has no pads');
  for (const id of ['dogs', 'lantern', 'election']) { s.screens.cancel(s.session.screen); s.open(id); assert.deepEqual(rapid(s.io.html), [], id); }
});

// ---------------------------------------------------------------- names
test("names: the label stays first; Godot's names that do not start with it are descriptions", () => {
  const s = setup();
  const described = (id, name) => { const b = buttonsOf(s.io.html).find(x => x.id === id); assert.ok(b, id); assert.deepEqual([b.attrs['aria-label'], b.description], [b.shown, spoken(name)], id); };
  const named = (id, name) => { const b = buttonsOf(s.io.html).find(x => x.id === id); assert.ok(b, id); assert.equal(b.name, spoken(name), id); };
  s.open('power');
  let v = s.view('power');
  v.tabs.forEach(t => described(`power-tab-${t.index}`, t.name));
  described('power-dogs', power.TEXT.refresh.dogsName);
  described('power-more', power.TEXT.refresh.moreName);
  v.pads.forEach(p => named(`power-pad-${p.index}`, p.name));
  named('power-music', v.actions[4].name);
  assert.ok(v.actions[4].name.endsWith(power.TEXT._process.soundtrack), 'Music names the independent soundtrack');
  s.click('power-begin');
  s.view('power').tabs.forEach(t => named(`power-tab-${t.index}`, t.name));
  s.click('power-end');
  for (const id of ['dogs', 'lantern', 'election']) {
    s.screens.cancel(s.session.screen);
    s.open(id);
    described(`${id}-stories`, picker.readerEntry().name);
    assert.match(s.io.html, />Other<br>stories<\/button>/);
  }
  named('election-music', s.view('election').buttons[10].name);
  s.click('election-begin');
  s.session.stories = { ...s.session.stories, election: { ...s.state('election'), observed: 3 } };
  s.click('election-make');
  assert.equal(s.state('election').phase, 2);
  // The pins show "1" and "2", which Godot's "Map pin n: city address point" holds: that is their name, not a description.
  for (const pin of s.view('election').pins) {
    named(`election-pin-${pin.index}`, pin.name);
    const b = buttonsOf(s.io.html).find(x => x.id === `election-pin-${pin.index}`);
    assert.deepEqual([b.shown, b.attrs['aria-describedby'], b.attrs.title], [String(pin.index + 1), undefined, pin.name]);
  }
  s.click('election-end');
  s.screens.cancel('election');
  s.open('dogs');
  const dv = s.view('dogs');
  named('dogs-pippin', dv.buttons[0].name);
  named('dogs-music', dv.buttons[10].name);
  // Godot's tooltips that say more than the label are the hover title too.
  const title = id => buttonsOf(s.io.html).find(x => x.id === id).attrs.title;
  assert.deepEqual([title('dogs-pippin'), title('dogs-junebug'), title('dogs-music'), title('dogs-begin')], [dv.buttons[0].name, dv.buttons[1].name, dv.buttons[10].name, undefined]);
});

// ---------------------------------------------------------------- Two Dogs Home
test('Two Dogs Home: the whole search through clicks and stubbed walks, with Godot\'s focus after each press', () => {
  const s = setup();
  s.session.from = 'story-resume';
  s.open('dogs');
  assertScreen(s, 'dogs');
  assert.equal(focused(s), 'dogs-begin');
  s.click('dogs-begin');
  assertScreen(s, 'dogs');
  assert.equal(focused(s), 'dogs-lead0', 'Godot begin: the first lead');
  assert.ok(s.status().includes(dogs.TEXT.begin.begun));
  s.click('dogs-lead1');
  assert.equal(focused(s), 'dogs-lead1');
  assert.ok(s.status().includes(`. ${dogs.TEXT.choose_lead.chose}${dogs.LEADS[1]}`));
  // Walk to lead: the screen closes, the walk is the episode's own, toward the lead, with the objective's name.
  s.click('dogs-walk');
  assert.deepEqual(s.walks().at(-1), ['walk', { ...P.DOG_GOALS[1] }, { name: dogs.LEADS[1], announce: '', keepCamera: false }]);
  assert.deepEqual([s.dialog.modal.open, s.session.screen, s.session.trip, s.state('dogs').traveling], [false, null, 'dogs', true]);
  assert.equal(s.session.from, null, 'a walk is not an entry: its reopened screen returns to the canvas');
  // Arrival within 2 m reopens the screen (Godot open_from_walking), Match focused.
  assert.equal(s.arrive(P.DOG_GOALS[1]), true);
  assertScreen(s, 'dogs');
  assert.equal(focused(s), 'dogs-match');
  s.click('dogs-match');
  assert.equal(s.state('dogs').message, dogs.TEXT.match_dog.differs + dogs.DESCRIPTIONS[1] + dogs.TEXT.match_dog.differs2 + dogs.NAMES[0] + dogs.TEXT.match_dog.differs3);
  assert.equal(focused(s), 'dogs-match');
  s.click('dogs-junebug');
  assert.equal(focused(s), 'dogs-junebug');
  assert.equal(s.state('dogs').profile, 1);
  s.click('dogs-match');
  assert.equal(s.state('dogs').found, 2);
  assertScreen(s, 'dogs');
  // SFACC info toggles the reader; the button keeps focus.
  s.click('dogs-info');
  assert.ok(s.status().includes(dogs.TEXT.refresh.info));
  s.click('dogs-info');
  assert.equal(focused(s), 'dogs-info');
  // Pippin at Turk / Taylor.
  s.click('dogs-lead0'); s.click('dogs-pippin'); s.click('dogs-walk');
  assert.deepEqual(s.walks().at(-1)[1], { ...P.DOG_GOALS[0] });
  s.arrive(P.DOG_GOALS[0]);
  s.click('dogs-match');
  assert.equal(s.state('dogs').found, 3);
  // The gathering: Reunite, and the lantern invitation (the picker's effect of the genuine reunion).
  s.click('dogs-lead2'); s.click('dogs-walk');
  assert.deepEqual(s.walks().at(-1)[2], { name: dogs.LEADS[2], announce: '', keepCamera: false });
  s.arrive(P.DOG_GOALS[2]);
  const v = assertScreen(s, 'dogs');
  assert.equal(v.buttons[8].label, dogs.TEXT.refresh.reunite);
  assert.equal(focused(s), 'dogs-match');
  s.click('dogs-match');
  assert.deepEqual([s.state('dogs').won, s.session.stories.picker.lanternInvited], [true, true]);
  assert.ok(s.status().includes(dogs.TEXT.match_dog.reunion));
  assertScreen(s, 'dogs');
  assert.equal(focused(s), 'dogs-walk', 'Reunite is spent: focus goes where Godot opens the screen');
  // Walk to lead at the lead you stand on only redraws (Godot walk_to_lead near()).
  const walks = s.walks().length;
  s.click('dogs-walk');
  assert.deepEqual([s.walks().length, s.dialog.modal.open, focused(s)], [walks, true, 'dogs-walk']);
  // End search: the search resets; End is disabled, so focus goes to Begin.
  s.click('dogs-end');
  assertScreen(s, 'dogs');
  assert.deepEqual([s.state('dogs').active, focused(s)], [false, 'dogs-begin']);
  assert.ok(s.status().includes(dogs.TEXT.end_session.ended));
  // Back: Godot close_story's line as the toast after the dialog closes, focus to the control it was opened from.
  s.click('dogs-back');
  assert.deepEqual(s.log.slice(-2), [['close', undefined], ['toast', dogs.TEXT.close_story.announce]]);
  assert.deepEqual([s.state('dogs').open, s.session.screen, s.dialog.modal.open], [false, null, false]);
});

test('Two Dogs Home: a refused route reopens with the blocked line, a short arrival says it, a stop is silent', () => {
  const s = setup({ over: { walk: () => 'blocked' } });
  s.open('dogs'); s.click('dogs-begin'); s.click('dogs-lead0');
  s.click('dogs-walk');
  assertScreen(s, 'dogs');
  assert.deepEqual([s.status(), s.session.trip, s.state('dogs').traveling], [dogs.TEXT.blocked_route.blocked, null, false]);
  assert.ok(s.io.html.includes(`<p>${K.esc(dogs.TEXT.blocked_route.blocked)}</p>`), 'the blocked line heads the reader');
  assert.equal(focused(s), 'dogs-walk');
  // A walk that ends short of the lead: the blocked line as a toast, the screen stays closed (Godot _process blocked_route).
  const t = setup();
  t.open('dogs'); t.click('dogs-begin'); t.click('dogs-lead0'); t.click('dogs-walk');
  t.arrive({ x: P.DOG_GOALS[0].x + 40, y: P.DOG_GOALS[0].y });
  assert.deepEqual([t.dialog.modal.open, t.state('dogs').open, t.log.at(-1)], [false, false, ['toast', dogs.TEXT.blocked_route.blocked]]);
  // Stop walking (Godot stop_walking -> cancel_intent): silent.
  const u = setup();
  u.open('dogs'); u.click('dogs-begin'); u.click('dogs-lead0'); u.click('dogs-walk');
  const count = u.log.length;
  assert.equal(u.kit.walkCancelled(), true);
  assert.deepEqual([u.log.length, u.state('dogs').traveling, u.session.trip, u.dialog.modal.open], [count, false, null, false]);
});

test('a press that Godot\'s own guard ignores draws nothing and says nothing', () => {
  const s = setup();
  // The stand-in dialog calls a disabled control's listeners anyway, as a stale or scripted press would.
  const nothing = (id, control) => {
    const shows = s.shows(), said = s.said().length, before = s.state(id);
    s.click(control);
    assert.deepEqual([s.shows(), s.said().length, s.state(id) === before], [shows, said, true], control);
  };
  s.open('dogs');
  nothing('dogs', 'dogs-match');
  nothing('dogs', 'dogs-lead0');
  s.screens.cancel('dogs'); s.open('power');
  nothing('power', 'power-check');
  nothing('power', 'power-pad-0');
  s.screens.cancel('power'); s.open('lantern');
  nothing('lantern', 'lantern-advance');
  s.screens.cancel('lantern'); s.open('election');
  nothing('election', 'election-record');
  nothing('election', 'election-make');
});

// ---------------------------------------------------------------- Lantern Procession
test('Lantern Procession: costumes, assembly, the march with per-frame ticks, a return trip and the welcome', () => {
  const s = setup();
  s.open('lantern');
  assertScreen(s, 'lantern');
  assert.equal(focused(s), 'lantern-begin');
  s.click('lantern-star');
  assertScreen(s, 'lantern');
  assert.deepEqual([s.state('lantern').costume, focused(s)], [1, 'lantern-star']);
  s.click('lantern-starLantern');
  assert.equal(s.state('lantern').lantern, 1);
  s.click('lantern-begin');
  assert.equal(focused(s), 'lantern-walk');
  // Walk to assembly keeps a manual camera (Godot walk_route).
  s.click('lantern-walk');
  const assembly = lantern.routePoint(8);
  assert.deepEqual(s.walks().at(-1), ['walk', { ...assembly }, { name: lantern.TEXT.objective.assembly, announce: '', keepCamera: true }]);
  s.arrive(assembly);
  assertScreen(s, 'lantern');
  assert.equal(focused(s), 'lantern-advance');
  s.click('lantern-advance');
  assertScreen(s, 'lantern');
  assert.deepEqual([s.state('lantern').phase, focused(s)], [1, 'lantern-walk']);
  assert.ok(s.status().includes(lantern.TEXT.advance.ready));
  assert.ok(['lantern-bat', 'lantern-star', 'lantern-moon', 'lantern-starLantern'].every(id => 'disabled' in buttonsOf(s.io.html).find(b => b.id === id).attrs), 'paper choices lock after Gather');
  // March: progress grows per frame only while the lantern trip travels along the route.
  s.click('lantern-walk');
  const finish = lantern.routePoint(lantern.LENGTH);
  assert.deepEqual(s.walks().at(-1), ['walk', { ...finish }, { name: lantern.TEXT.objective.finish, announce: '', keepCamera: true }]);
  for (let m = 9; m <= 20; m++) { s.io.player = lantern.routePoint(m); assert.equal(s.kit.tickTrip(), true, `metre ${m}`); }
  assert.ok(Math.abs(s.state('lantern').progress - 20) < 1e-9, String(s.state('lantern').progress));
  // Stop: silent; the group waits at 20 m. A Resume from elsewhere is a return trip to the group first.
  s.kit.walkCancelled();
  s.io.player = lantern.routePoint(30);
  assert.equal(s.kit.tickTrip(), false, 'no trip, no progress');
  s.open('lantern');
  s.click('lantern-walk');
  assert.deepEqual(s.walks().at(-1)[1], { ...lantern.routePoint(20) });
  assert.equal(s.state('lantern').returning, true);
  s.arrive(lantern.routePoint(20));
  assert.ok(s.status().includes(lantern.TEXT._process.back));
  assert.equal(focused(s), 'lantern-walk');
  s.click('lantern-walk');
  for (let m = 21; m <= 36; m++) { s.io.player = lantern.routePoint(m); s.kit.tickTrip(); }
  s.arrive(finish);
  assertScreen(s, 'lantern');
  assert.equal(focused(s), 'lantern-advance', 'Welcome, now that the group reached the finish');
  s.click('lantern-advance');
  assertScreen(s, 'lantern');
  assert.deepEqual([s.state('lantern').won, focused(s)], [true, 'lantern-back']);
  assert.ok(s.status().includes(lantern.TEXT.advance.won));
  s.click('lantern-end');
  assert.deepEqual([s.state('lantern').active, focused(s)], [false, 'lantern-begin']);
  s.click('lantern-back');
  assert.deepEqual(s.log.at(-1), ['toast', lantern.TEXT.close_story.announce]);
});

test('Lantern Procession: a refused march reopens with the paused line', () => {
  const s = setup({ over: { walk: () => 'blocked' } });
  s.open('lantern'); s.click('lantern-begin'); s.click('lantern-walk');
  assertScreen(s, 'lantern');
  assert.deepEqual([s.status(), s.session.trip], [lantern.TEXT.blocked_route.blocked, null]);
});

// ---------------------------------------------------------------- Power Story
function solveByClicks(s) {
  const target = power.SOLUTIONS[s.state('power').station].split('').map(Number);
  for (let i = 0; i < 4; i++) {
    while (s.state('power').turns[s.state('power').station][i] !== target[i]) {
      s.click(`power-pad-${i}`);
      assert.equal(focused(s), `power-pad-${i}`, 'Godot rotate: the pad keeps focus');
      assert.ok(s.status().includes(power.TEXT.rotate.linked.split('%d')[0]));
    }
  }
}
test('Power Story: the festival through the pads, Check path and Godot\'s focus rules', () => {
  const s = setup();
  s.session.from = 'story-entry';
  s.open('power');
  let v = assertScreen(s, 'power');
  assert.deepEqual([v.heading, focused(s)], [power.TEXT.refresh.hub, 'power-begin']);
  assert.ok(v.pads.every(p => p.visible && p.disabled), 'the hub shows the diagram with idle pads');
  s.click('power-begin');
  assertScreen(s, 'power');
  assert.deepEqual([s.state('power').active, focused(s)], [true, 'power-walk']);
  for (let st = 0; st < 3; st++) {
    s.click(`power-tab-${st}`);
    assert.equal(focused(s), `power-tab-${st}`);
    s.click('power-walk');
    const objective = power.objective(s.state('power'));
    assert.deepEqual(s.walks().at(-1), ['walk', { ...P.RELAY_GOALS[st] }, { name: objective.targetName, announce: `Walking to ${power.NAMES[st]}. Stop Walking cancels. Its repair view opens after arrival.`, keepCamera: false }]);
    s.arrive(P.RELAY_GOALS[st]);
    v = assertScreen(s, 'power');
    assert.equal(focused(s), 'power-pad-0', 'arrived at an unrestored relay: the first connector');
    assert.ok(v.pads.every(p => !p.disabled));
    if (st === 0) {
      // Not connected yet: Godot still moves focus to the next relay.
      s.click('power-check');
      assert.equal(s.state('power').message, power.TEXT.check_path.notYet);
      assert.equal(focused(s), 'power-tab-1');
    }
    solveByClicks(s);
    s.click('power-check');
    v = assertScreen(s, 'power');
    assert.ok((s.state('power').restored & (1 << st)) !== 0);
    assert.equal(focused(s), st < 2 ? `power-tab-${(st + 1) % 3}` : 'power-back', 'Godot check_path focus');
    assert.ok(v.pads.every(p => p.disabled), 'a restored relay locks its connectors');
  }
  assert.deepEqual([s.state('power').won, s.state('power').message], [true, power.TEXT.check_path.won]);
  s.click('power-end');
  v = assertScreen(s, 'power');
  assert.deepEqual([v.heading, focused(s)], [power.TEXT.refresh.ended, 'power-begin']);
  assert.equal(v.actions[0].label, power.TEXT.refresh.replay);
  // The relays' walks reopened the screen, so Back returns to the canvas, as × does after a walk.
  assert.equal(s.session.from, null);
  s.click('power-back');
  assert.deepEqual(s.log.slice(-2), [['close', undefined], ['toast', power.TEXT.close_story.back + power.TEXT.close_story.idle]]);
});

test('Power Story: a refused route reopens through open with Godot\'s closed line; a walk to a Larkin kit you stand at only redraws', () => {
  const s = setup({ over: { walk: () => 'blocked' } });
  s.open('power'); s.click('power-begin'); s.click('power-walk');
  assertScreen(s, 'power');
  assert.ok(s.status().startsWith(`${s.view('power').heading}. ${power.TEXT.walk_to_relay.closed}
`), s.status());
  assert.equal(s.session.trip, null);
});

test('Power Story: Larkin 2017 loads the place lazily, draws the case map with its labels, and runs to the end', async () => {
  const s = setup({ data: false }), pending = {};
  s.host.load = name => { s.log.push(['load', name]); return (pending[name] = deferred()).promise; };
  s.open('power');
  assertScreen(s, 'power');
  assert.deepEqual(s.log.filter(e => e[0] === 'load'), [], 'the festival hub needs no file');
  s.click('power-tab-1');
  let v = assertScreen(s, 'power');
  assert.deepEqual([s.state('power').historical, v.picture, focused(s)], [true, 'map', 'power-tab-1']);
  assert.deepEqual(s.log.filter(e => e[0] === 'load'), [['load', 'power_place.json']]);
  assert.equal(s.status(), K.VISITS_FORK_TEXT.loading, 'the loading line while the place loads');
  assert.ok(v.text.startsWith(power.TEXT.refresh.unavailable));
  assert.equal(v.actions[0].disabled, true, 'no Larkin Begin before the place is valid');
  assert.deepEqual(spans(s.io.html), [], 'the empty case map has no labels');
  pending['power_place.json'].resolve(POWER_PLACE); await flush();
  v = assertScreen(s, 'power');
  assert.equal(s.status(), s.announce('power'), 'redrawn with the screen\'s line once the place loads');
  assert.equal(focused(s), 'power-tab-1', 'the redraw leaves focus where the player is');
  assert.equal(v.actions[0].disabled, false);
  // The case map's labels at Godot's points, kept inside the picture, in the kit's 12 px label style.
  const labels = spans(s.io.html);
  assert.deepEqual(labels.map(l => l.text), [power.TEXT.setup.map0, power.TEXT.setup.map1, power.TEXT.setup.map2, power.TEXT.setup.map3]);
  labels.forEach((l, i) => {
    const [x, y] = power.MAP_LABEL_POINTS[i], style = styleOf(l.style);
    assert.equal(style.left, `min(${pct(x, 360)}, calc(100% - ${[...l.text].length}ch - 11px))`);
    assert.equal(style.top, `min(${pct(y, 240)}, calc(100% - 1.3em - 4px))`);
    assert.ok(!('font-size' in style));
  });
  assert.ok(parseFloat(/\.visits-overlay \.visits-label\{[^}]*font-size:(\d+)px/.exec(K.STYLE)[1]) >= 12, 'labels are at least 12 px');
  s.click('power-begin');
  v = assertScreen(s, 'power');
  assert.deepEqual([s.state('power').active, v.picture, v.heading, focused(s)], [true, 'diagram', power.TEXT.refresh.headingLarkin.replace('%d', '0'), 'power-walk']);
  // Case map / Battery view toggle the picture in place (Godot begin while active).
  s.click('power-begin');
  v = assertScreen(s, 'power');
  assert.deepEqual([v.picture, v.actions[0].label, focused(s)], ['map', power.TEXT.refresh.batteryButton, 'power-begin']);
  s.click('power-begin');
  assert.equal(s.view('power').picture, 'diagram');
  for (let st = 0; st < 3; st++) {
    if (st) s.click(`power-tab-${st}`);
    s.click('power-walk');
    const goal = st === 0 ? P.LARKIN_JUNCTION : P.RELAY_GOALS[st];
    assert.deepEqual(s.walks().at(-1)[1], { ...goal });
    assert.equal(s.walks().at(-1)[2].announce, `Walking to ${power.phaseName(s.state('power'), st)}. Stop Walking cancels. Its battery view opens after arrival.`);
    s.arrive(goal);
    assertScreen(s, 'power');
    solveByClicks(s);
    s.click('power-check');
    assertScreen(s, 'power');
  }
  assert.deepEqual([s.state('power').won, s.state('power').message, focused(s)], [true, power.TEXT.check_path.larkinWon, 'power-back']);
  // Walk again at the junction you stand on: Godot's "already" line, no walk.
  s.click('power-tab-0');
  s.io.player = { ...P.LARKIN_JUNCTION };
  const walks = s.walks().length;
  s.click('power-walk');
  assert.deepEqual([s.walks().length, s.state('power').message, focused(s)], [walks, power.TEXT.walk_to_relay.already, 'power-walk']);
});

test('Power Story: a place file that fails says the fork\'s error line after the redraw; an invalid one leaves Godot\'s unavailable line', async () => {
  const s = setup({ data: false }), pending = {};
  let loads = 0;
  s.host.load = name => { loads++; return (pending[name] = deferred()).promise; };
  s.open('power'); s.click('power-tab-1');
  pending['power_place.json'].reject(Error('offline')); await flush();
  assertScreen(s, 'power');
  assert.equal(s.status(), K.VISITS_FORK_TEXT.dataError, 'the error line is the last word');
  assert.equal(loads, 1, 'a failed load is not retried by its own redraw');
  // Other presses on the Larkin view do not fetch; the next Larkin choice tries again.
  s.click('power-music'); await flush();
  assert.equal(loads, 1);
  s.click('power-tab-0'); s.click('power-tab-1');
  assert.equal(loads, 2, 'loaded again');
  pending['power_place.json'].resolve({ ...POWER_PLACE, exterior: {} }); await flush();
  const v = assertScreen(s, 'power');
  assert.equal(s.session.data.power_place.status, 'invalid');
  assert.ok(v.text.startsWith(power.TEXT.refresh.unavailable));
  assert.equal(s.status(), s.announce('power'));
});

test('Power Story: Missing dogs opens Two Dogs Home in place; More stories opens the picker', () => {
  const s = setup();
  s.session.from = 'story-entry';
  s.open('power');
  s.click('power-dogs');
  assertScreen(s, 'dogs');
  assert.deepEqual([s.state('power').open, s.state('dogs').open, s.dialog.modal.open, focused(s)], [false, true, true, 'dogs-begin']);
  assert.ok(!s.log.some(e => e[0] === 'close'), 'one dialog: Godot closes Power silently and opens the dogs');
  assert.equal(s.status(), s.announce('dogs'));
  s.click('dogs-back');
  assert.deepEqual(s.log.at(-2), ['close', 'story-entry']);
  s.open('power'); s.click('power-more');
  assert.deepEqual(s.picked, ['power']);
  // While Power is active its Missing dogs is disabled, and a press anyway does nothing.
  s.click('power-begin');
  const shows = s.shows();
  assert.ok('disabled' in buttonsOf(s.io.html).find(b => b.id === 'power-dogs').attrs);
  s.click('power-dogs');
  assert.deepEqual([s.shows(), s.state('power').open], [shows, true]);
});

// Godot's relay tabs are plain buttons (power_story.gd setup). In 2D the relay on show is pressed: aria-pressed and the kit's
// selected look tell a screen reader and the eye which relay the reader, the pads and Check path are about. A declared 2D
// accessibility addition; the hub's Festival, Larkin 2017 and Place map stay plain, as their reader says which one is on show.
test("Power's relay tabs: the relay on show is pressed while the story is active (a declared 2D addition); the hub's tabs are plain", () => {
  const s = setup();
  const tabs = () => buttonsOf(s.io.html).filter(b => b.id.startsWith('power-tab-')).map(b => b.attrs['aria-pressed']);
  s.open('power');
  assert.deepEqual(tabs(), [undefined, undefined, undefined], 'Festival, Larkin 2017 and Place map');
  s.click('power-begin');
  assert.deepEqual(tabs(), ['true', 'false', 'false'], 'Relay 1 is on show');
  for (const st of [2, 1, 0]) {
    s.click(`power-tab-${st}`);
    assert.deepEqual(tabs(), [0, 1, 2].map(i => String(i === st)), `Relay ${st + 1}`);
    assert.equal(focused(s), `power-tab-${st}`, 'the pressed tab keeps the focus (Godot choose)');
    assertScreen(s, 'power');
  }
  // The look is the kit's selected look (tests/next-visits-kit.test.mjs pins it to the hosting choices'); the names are Godot's.
  assert.match(K.STYLE, /\.visits \[aria-pressed=true\]\{background:#d5e5ca;border:2px solid #23675c;/);
  const v = s.view('power');
  for (const t of v.tabs) assert.equal(buttonsOf(s.io.html).find(b => b.id === `power-tab-${t.index}`).name, spoken(t.name));
  s.click('power-end');
  assert.deepEqual(tabs(), [undefined, undefined, undefined], 'the story ended: the hub again');
});

// ---------------------------------------------------------------- Election Walk
test('Election Walk: both sites, the paper map with its pins and placed labels, and Share with Bea', () => {
  const s = setup();
  s.open('election');
  assertScreen(s, 'election');
  assert.equal(focused(s), 'election-begin');
  s.click('election-cool');
  assertScreen(s, 'election');
  assert.deepEqual([s.state('election').palette, focused(s)], [1, 'election-cool']);
  s.click('election-begin');
  assert.equal(focused(s), 'election-walk');
  for (const i of [0, 1]) {
    if (i) { s.click('election-boeddeker'); assert.equal(focused(s), 'election-boeddeker'); }
    s.click('election-walk');
    assert.deepEqual(s.walks().at(-1), ['walk', { ...P.ELECTION_GOALS[i] }, { name: VOTING.sites[i].address, announce: '', keepCamera: true }]);
    s.arrive(P.ELECTION_GOALS[i]);
    assertScreen(s, 'election');
    assert.equal(focused(s), 'election-record');
    s.click('election-record');
    assertScreen(s, 'election');
    assert.equal(focused(s), i === 0 ? 'election-boeddeker' : 'election-make', 'Godot record_site focus');
  }
  s.click('election-make');
  let v = assertScreen(s, 'election');
  assert.deepEqual([s.state('election').phase, focused(s)], [2, 'election-cadillac']);
  assert.ok(v.pins.every(p => p.visible));
  // Pins: 44 x 44 CSS px centred on their map point.
  const pins = tagsOf(s.io.html).filter(t => t.name === 'button' && /^election-pin-/.test(t.attrs.id));
  pins.forEach((pin, i) => {
    assert.equal(pin.attrs.class, 'secondary-button visits-pin');
    assert.deepEqual(styleOf(pin.attrs.style), { left: pct(v.pins[i].x, 360), top: pct(v.pins[i].y, 240) });
    assert.equal(pin.attrs.title, v.pins[i].name);
  });
  assert.match(K.STYLE, /\.visits-overlay \.visits-pin\{width:44px;height:44px;margin:-22px 0 0 -22px;/);
  // Boeddeker is still the selected label: pin 1 is a harmless mismatch, then its own pin.
  s.click('election-pin-0');
  assert.ok(s.state('election').message.startsWith(election.TEXT.place_label.belongs + VOTING.sites[0].address));
  assert.equal(focused(s), 'election-boeddeker');
  s.click('election-pin-1');
  v = assertScreen(s, 'election');
  assert.deepEqual([s.state('election').placed, focused(s)], [2, 'election-cadillac']);
  // Placed labels sit 26 px below their pin, centred and kept in their half of the map (voting_story.gd fit_layout).
  const W = 'min(160px, calc(50% - 10px))', [label] = spans(s.io.html);
  assert.equal(label.text, election.TEXT.setup.label1);
  assert.deepEqual(styleOf(label.style), { left: `clamp(calc(50% + 5px), calc(${pct(v.pins[1].x, 360)} - ${W} / 2), calc(100% - ${W} - 5px))`, top: `calc(${pct(v.pins[1].y, 240)} + 26px)`, 'max-width': W });
  s.click('election-cadillac'); s.click('election-pin-0');
  v = assertScreen(s, 'election');
  assert.deepEqual([s.state('election').phase, focused(s)], [3, 'election-walk']);
  assert.equal(styleOf(spans(s.io.html)[0].style).left, `clamp(calc(0% + 5px), calc(${pct(v.pins[0].x, 360)} - ${W} / 2), calc(50% - ${W} - 5px))`);
  assert.ok(v.pins.every(p => !p.visible), 'the pins leave with the labels placed');
  s.click('election-walk');
  assert.deepEqual(s.walks().at(-1), ['walk', { ...P.ELECTION_HOME }, { name: election.TEXT.objective.home, announce: '', keepCamera: true }]);
  s.arrive(P.ELECTION_HOME);
  assertScreen(s, 'election');
  assert.equal(focused(s), 'election-share');
  s.click('election-share');
  assertScreen(s, 'election');
  assert.deepEqual([s.state('election').won, focused(s)], [true, 'election-back']);
  assert.equal(s.status(), `${election.TEXT.refresh.heading}${election.TEXT.refresh.shared}. ${election.TEXT.share_map.won}`);
  s.click('election-end');
  assert.deepEqual([s.state('election').active, focused(s)], [false, 'election-begin']);
  s.click('election-stories');
  assert.deepEqual(s.picked, ['election']);
});

test('Election Walk: a refused walk always reopens with the paused line', () => {
  const s = setup({ over: { walk: () => 'blocked' } });
  s.open('election'); s.click('election-begin'); s.click('election-walk');
  assertScreen(s, 'election');
  assert.deepEqual([s.status(), s.session.trip], [election.TEXT.blocked_route.blocked, null]);
});

// ---------------------------------------------------------------- Back, Escape and ×
test('cancel is Escape, which is Back; silentClose clears the open flag without a word and leaves the dialog alone', () => {
  for (const id of IDS) {
    const s = setup();
    s.session.from = 'story-entry';
    s.open(id);
    const announce = picker.changeEpisode(s.session.stories, id, { type: 'close' }, s.kit.ctx()).announce;
    assert.equal(s.screens.cancel('nope'), false);
    assert.equal(s.screens.cancel(IDS.find(x => x !== id)), false, 'only the screen on show');
    assert.equal(s.screens.cancel(id), true);
    assert.deepEqual(s.log.slice(-2), [['close', 'story-entry'], ['toast', announce]], id);
    assert.deepEqual([s.state(id).open, s.session.screen, s.dialog.modal.open], [false, null, false]);
    assert.equal(s.screens.cancel(id), false, 'nothing held');
    const t = setup();
    t.open(id);
    const count = t.log.length;
    assert.equal(t.screens.silentClose(id), true);
    assert.deepEqual([t.state(id).open, t.session.screen, t.dialog.modal.open, t.log.length], [false, null, true, count], `${id}: silent`);
    assert.equal(t.screens.silentClose(id), false);
    assert.equal(t.screens.silentClose('nope'), false);
  }
});

// ---------------------------------------------------------------- awaits
test('flush() waits out a promise chain longer than 20 microtasks, which the old 20-tick flush returned before', async () => {
  const s = setup();
  s.host.music.toggle = async () => { await ticks(30); return 'Music playing.'; };
  s.open('lantern');
  const shows = s.shows();
  s.click('lantern-music');
  await ticks(20);
  assert.equal(s.shows(), shows, 'after 20 ticks the screen that still holds the dialog is not redrawn yet: a "draws nothing" check would pass vacuously');
  await flush();
  assert.equal(s.shows(), shows + 1, 'flush() waits for it');
  assert.deepEqual(s.log.at(-1), ['status', 'Music playing.']);
});

test('Music: Godot\'s line last after the redraw; a toggle that resolves after Back or under another screen draws nothing', async () => {
  for (const id of IDS) {
    const s = setup();
    let settle = null;
    s.host.music.toggle = () => new Promise(resolve => { settle = resolve; });
    s.open(id);
    s.click(`${id}-music`); s.io.music = true; settle('Music playing: 80 BPM Sketch (stems).'); await flush();
    const v = assertScreen(s, id);
    assert.deepEqual(s.log.slice(s.log.findLastIndex(e => e[0] === 'show') + 1), [['focus', `${id}-music`], ['status', 'Music playing: 80 BPM Sketch (stems).']], 'the redraw moves no focus of its own');
    assert.equal((id === 'power' ? v.actions[4] : v.buttons.find(b => b.id === 'music')).label, 'Music: On');
    // Back before the music answers.
    s.click(`${id}-music`); s.click(`${id}-back`);
    let count = s.log.length;
    settle('Music paused.'); await flush();
    assert.equal(s.log.length, count, `${id}: nothing after Back`);
    // The recovery offer replaced the screen in the same dialog (holds() false).
    s.open(id); s.click(`${id}-music`); s.dialog.show(RECOVERY); count = s.log.length;
    settle('Music paused.'); await flush();
    assert.equal(s.log.length, count, `${id}: nothing over the recovery offer`);
  }
});

test('a place file that loads after the recovery offer replaced the screen draws nothing', async () => {
  const s = setup({ data: false }), pending = {};
  s.host.load = name => (pending[name] = deferred()).promise;
  s.open('power'); s.click('power-tab-1');
  s.dialog.show(RECOVERY);
  const count = s.log.length;
  pending['power_place.json'].resolve(POWER_PLACE); await flush();
  assert.deepEqual([s.log.length, s.session.data.power_place.status], [count, 'ready']);
});

// ---------------------------------------------------------------- keys
test('held Enter or Space never presses a chained control again; the other controls are left to the global rule', () => {
  const s = setup();
  const keydown = (id, init) => { const event = { ...init, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const fn of s.dialog.doc.getElementById(id).listeners.keydown || []) fn(event); return event.defaultPrevented; };
  for (const id of IDS) {
    if (s.session.screen) s.screens.cancel(s.session.screen);
    s.open(id);
    for (const chained of CHAINED[id]) {
      assert.ok(s.dialog.has(chained), chained);
      assert.equal(keydown(chained, { key: 'Enter', repeat: false }), false, `${chained}: the first Enter presses`);
      assert.equal(keydown(chained, { key: 'Enter', repeat: true }), true, `${chained}: its repeats do not`);
      assert.equal(keydown(chained, { key: ' ', repeat: true }), true);
    }
    const others = buttonsOf(s.io.html).map(b => b.id).filter(b => !CHAINED[id].includes(b));
    for (const other of others) assert.equal((s.dialog.doc.getElementById(other).listeners.keydown || []).length, 0, other);
  }
  // A redraw binds them again.
  s.click('election-begin');
  assert.equal(keydown('election-walk', { key: 'Enter', repeat: true }), true);
});

// ---------------------------------------------------------------- pictures
test('pictures: one data: URI per Godot key (profile, costume:lantern, station:turns:restored, place, palette:observed:placed)', () => {
  const calls = [];
  const builder = name => (...args) => { calls.push(name); return `<svg data-${name}="${calls.length}"/>`; };
  const pics = createPictures({ dogs: builder('dogs'), lantern: builder('lantern'), diagram: builder('diagram'), map: builder('map'), paper: builder('paper') });
  const count = name => calls.filter(c => c === name).length;
  assert.equal(pics.dogs(0), pics.dogs(0));
  pics.dogs(1);
  assert.equal(count('dogs'), 2);
  assert.match(pics.dogs(1), /^data:image\/svg\+xml;charset=utf-8,/);
  pics.lantern(0, 1); pics.lantern(0, 1); pics.lantern(1, 1);
  assert.equal(count('lantern'), 2);
  let p = power.initialPower();
  const first = pics.diagram(p);
  assert.equal(pics.diagram({ ...p, turns: p.turns.map(r => [...r]) }), first, 'the same station, turns and restored');
  assert.equal(pics.diagram({ ...p, turns: [p.turns[0], [0, 0, 0, 0], p.turns[2]] }), first, 'only the shown station\'s turns draw');
  pics.diagram({ ...p, station: 1 }); pics.diagram({ ...p, restored: 1 }); pics.diagram({ ...p, turns: [[1, 0, 1, 1], p.turns[1], p.turns[2]] });
  assert.equal(count('diagram'), 4);
  const other = structuredClone(POWER_PLACE);
  pics.map(POWER_PLACE); pics.map(null); pics.map(POWER_PLACE); pics.map(null); pics.map(other);
  assert.equal(count('map'), 3, 'once per place, and once for the empty frame');
  const e = election.initialElection();
  pics.paper(e, VOTING); pics.paper({ ...e }, VOTING); pics.paper({ ...e, placed: 1 }, VOTING); pics.paper(e, null); pics.paper(e, VOTING);
  assert.equal(count('paper'), 3);
  // The real builders by default.
  const real = createPictures();
  assert.equal(real.dogs(1), K.dataURI(dogs.illustration(1)));
  assert.equal(real.lantern(1, 0), K.dataURI(lantern.artwork(1, 0)));
  assert.equal(real.diagram(p), K.dataURI(power.diagram(p)));
  assert.equal(real.map(POWER_PLACE), K.dataURI(power.mapSVG(POWER_PLACE)));
  assert.equal(real.map(null), K.dataURI(power.mapSVG(null)));
  p = { ...election.initialElection(), observed: 3, placed: 2 };
  assert.equal(real.paper(p, VOTING), K.dataURI(election.paperSVG(p, VOTING)));
});

test('the connector pads sit on their diagram cells, 88 of 360 by 88 of 240, at least 44 CSS px', () => {
  const s = setup();
  s.open('power');
  const v = s.view('power'), pads = tagsOf(s.io.html).filter(t => t.name === 'button' && /^power-pad-/.test(t.attrs.id));
  assert.equal(pads.length, 4);
  pads.forEach((pad, i) => {
    const cell = power.PAD_CELLS[i];
    assert.deepEqual(styleOf(pad.attrs.style), { left: pct(cell.x, 360), top: pct(cell.y, 240), width: pct(88, 360), height: pct(88, 240) });
    assert.deepEqual([pad.attrs['aria-label'], pad.attrs.title], [v.pads[i].name, v.pads[i].name]);
    assert.equal(pad.attrs.class, undefined, 'styled by .visits-overlay button');
  });
  assert.match(s.io.html, /<figure class="visits-picture visits-overlaid"><img [^>]*><div class="visits-overlay"><button id="power-pad-0" data-rapid /);
  // 24.4% of a picture at least 230 px wide is at least 56 px; the kit's overlay rule keeps 44 px regardless.
  assert.ok(88 / 360 * 230 >= 44);
  assert.match(K.STYLE, /\.visits-overlay button\{position:absolute;min-width:44px;min-height:44px;/);
});

// ---------------------------------------------------------------- the drift scan
test('the episode screens hand-type no Godot text: shared literals are structural or protocol identifiers', () => {
  const STRUCTURAL = ['', ' ', '\n', ': ', '. '];
  const shared = [...new Set(jsStrings(SRC))].filter(text => GD_LITERALS.has(text));
  assert.deepEqual(shared.filter(text => !STRUCTURAL.includes(text) && !/^[a-z][a-z_]*$/.test(text)), [], 'a Godot line or label comes from visits/text.js');
  assert.ok(GD_LITERALS.has('Back') && !jsStrings(SRC).includes('Back'), 'premise: the scan sees Godot labels');
});
