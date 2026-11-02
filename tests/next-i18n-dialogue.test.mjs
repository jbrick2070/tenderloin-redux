// Localization of the dialogue and music modules (docs/I18N_PLAN.md I2b): characters.js, story.js, hosted-text.js, rewards.js,
// sketch-core.js, rhythm.js, rhythm-ui.js, bursts.js, and bubble.js spokenText's envelope rule.
// - Composition parity: every fork composite (CHARACTER_COMPOSE, COMPASS_TEXT, HOSTED_COMPOSE, SOUNDS_COMPOSE, MUSIC_COMPOSE,
//   RHYTHM_COMPOSE, BURST_DISPLAY) is, in English, exactly the text Godot builds from its fragments or ids.
// - Pseudo coverage: under qps-ploc, built from every msgid the extractor finds plus these tables, the modules' output carries
//   no run of plain English words, and no English text is looked up that the catalog lacks.
// - Logic keyed by text (2.10) no longer depends on the English wording: narrow labels, the memory tail, quotes, the speech
//   envelope, the art tail, the 10/10 finale and the compass plural.
// English identity itself is pinned by the drift tests (next-characters, next-story, next-music, next-bursts), which are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as I from '../browser-next/i18n.js';
import * as C from '../browser-next/characters.js';
import * as S from '../browser-next/story.js';
import * as H from '../browser-next/hosted-text.js';
import * as R from '../browser-next/rewards.js';
import * as K from '../browser-next/sketch-core.js';
import * as Y from '../browser-next/rhythm.js';
import * as B from '../browser-next/bursts.js';
import * as U from '../browser-next/bubble.js';
import { createRhythm } from '../browser-next/rhythm-ui.js';
import { PALETTES, PIXELS_PER_METRE, initialState } from '../browser-next/core.js';
import { FILM_SHOTS } from '../browser-next/film.js';
import { NEIGHBORS as WORLD_NEIGHBORS, PLACES } from '../browser-next/world.js';
import { parseGodotSave } from '../browser-next/godot-save.js';
import { gdCapitalize } from '../browser-next/visits/format.js';
import { readSource, isHumanText } from '../scripts/i18n.mjs';
import { GODOT_WRITTEN, godotEnvelope, readyEnvelope, openedEnvelope, hostedEnvelope, civicDoneEnvelope, filmDoneEnvelope, fakeDialog, SURPRISES } from './next-fixtures.mjs';

const english = () => I.setLocale('en');
const strings = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
// The new fork tables of this package. scripts/i18n.mjs REGISTRY lists them once merged; until then the pseudo catalog adds them.
const COMPOSITES = { 'characters.js': C.CHARACTER_COMPOSE, 'story.js': S.COMPASS_TEXT, 'hosted-text.js': H.HOSTED_COMPOSE, 'rewards.js': R.SOUNDS_COMPOSE, 'sketch-core.js': K.MUSIC_COMPOSE, 'rhythm.js': Y.RHYTHM_COMPOSE, 'bursts.js': B.BURST_DISPLAY };
const godotCapitalize = word => String(word).split(/[_\s]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');

// Fork states over the shared fixtures (Godot-written saves and the hand-built stages), with surprises and mural scenes.
const fork = envelope => parseGodotSave(JSON.stringify(envelope)).state;
const ENVELOPES = [
  godotEnvelope(), godotEnvelope({ visited_neighbors: ['bea', 'dez'], discovered_surprises: ['mayor_pomp_event'] }), readyEnvelope(), readyEnvelope({ discovered_surprises: [...SURPRISES] }),
  openedEnvelope({ mural_scenes: { left: 'music', right: 'garden' } }), openedEnvelope({ epilogue: { photo: { status: 'unasked', participants: [], mural: {}, palette: 'garden', layout: 'table' }, packing: true, returned: ['table'] } }),
  hostedEnvelope({ discovered_surprises: ['hidden_mural_145', 'cutesy_dino', 'jeffrey_record'] }), civicDoneEnvelope(), filmDoneEnvelope({ discovered_surprises: ['good_donut_and_bagel'] }),
  JSON.parse(GODOT_WRITTEN.firstMeeting), JSON.parse(GODOT_WRITTEN.fullRun), JSON.parse(GODOT_WRITTEN.fullRunScenes),
];
const CASES = ENVELOPES.map(env => ({ state: fork(env), extras: C.godotExtras(env) }));
const WORLD = { neighbors: WORLD_NEIGHBORS, places: PLACES };
const TALKS = [C.freshTalk(), { bea: 2, dez: 3, thanh: 4, rook: 5, confirmedLoan: 'table' }, { bea: 5, dez: 1, thanh: 2, rook: 2, confirmedLoan: '' }];

// ------------------------------------------------------------------------------------------------ composition parity (English)
test('composition parity: each composite is, in English, the text Godot builds from its fragments or ids', () => {
  english();
  const A = C.ACTION_LABELS, X = C.CHARACTER_COMPOSE;
  for (const title of Object.values(S.LOAN_TITLES)) {
    assert.equal(C.gdFormat(X.returned, title), A.returned + title);
    assert.equal(C.gdFormat(X.return, title), A.return + title);
  }
  assert.deepEqual(Object.keys(X.sceneAt), C.MURAL_SCENE_SLOTS);
  for (const slot of C.MURAL_SCENE_SLOTS) for (const name of Object.values(C.MURAL_SCENE_NAMES)) assert.equal(C.gdFormat(X.sceneAt[slot], name), C.gdFormat(C.COMPOSITION.scene, name, slot));
  assert.deepEqual(Object.keys(X.filmEnded).sort(), Object.keys(FILM_SHOTS).sort());
  for (const [id, shot] of Object.entries(FILM_SHOTS)) assert.equal(X.filmEnded[id], C.gdFormat(C.PROJECT_MEMORY.film.dez, shot.label.toLowerCase()), id);
  assert.deepEqual(Object.keys(X.palettes), PALETTES);
  for (const id of PALETTES) assert.equal(X.palettes[id], godotCapitalize(id));

  const G = S.GODOT_TEMPLATES.compass_phrase, P = S.COMPASS_TEXT;
  for (const section of ['metres', 'block', 'blocks']) assert.deepEqual(Object.keys(P[section]), S.COMPASS_SECTORS, section);
  for (const dir of S.COMPASS_SECTORS) {
    for (const d of [10, 50, 90]) assert.equal(S.fmt(P.metres[dir], d), S.fmt(G.metres, d, dir));
    assert.equal(P.block[dir], S.fmt(G.block, dir));
    for (const n of [2, 3, 12]) assert.equal(S.fmt(P.blocks[dir], n), S.fmt(G.blocks, n, dir));
  }
  assert.equal(C.BOEDDEKER_FROM_BEA, P.block.northwest, "Bea's Boeddeker phrase is the compass phrase's own msgid");

  const HG = H.HOSTED_GODOT_TEXT, E = HG['bea_invitation.gd'].explanation, Q = HG['quiet_seats.gd'].explanation, M = HG['main.gd'].host_complete_current;
  for (const id of Object.keys(H.INVITATION_TITLES)) assert.equal(S.fmt(H.HOSTED_COMPOSE.invitation, H.INVITATION_TITLES[id], H.INVITATION_EXAMPLES[id]), E.open + H.INVITATION_TITLES[id] + E.sep + H.INVITATION_EXAMPLES[id] + E.close);
  for (const id of Object.keys(H.QUIET_TITLES)) assert.equal(S.fmt(H.HOSTED_COMPOSE.quiet, H.QUIET_TITLES[id]), Q.open + H.QUIET_TITLES[id] + Q.close);
  for (const done of Object.values(S.PROGRAMME_TITLES)) for (const n of [1, 3, 4]) {
    for (const next of Object.values(S.PROGRAMME_TITLES)) assert.equal(S.fmt(H.HOSTED_COMPOSE.summaryNext, done, n, next), S.fmt(M.summary, done, n, M.next + next));
    assert.equal(S.fmt(H.HOSTED_COMPOSE.summaryLast, done, n), S.fmt(M.summary, done, n, M.last));
  }

  assert.equal(R.SOUNDS_COMPOSE.announceOn, R.SOUNDS_TEXT.announce.replace('%s', 'on'));
  assert.equal(R.SOUNDS_COMPOSE.announceOff, R.SOUNDS_TEXT.announce.replace('%s', 'off'));
  const T = K.MUSIC_TEXT;
  for (const v of ['bass (1/4 stems)', 'x$&y', '']) {
    assert.equal(K.MUSIC_COMPOSE.playingSketch.replace('%s', () => v), T.playing.replace('%s', () => T.sketchTag + v + ')'));
    assert.equal(K.MUSIC_COMPOSE.playingLocal.replace('%s', () => v), T.playing.replace('%s', () => T.localTag + v));
  }

  const RT = Y.RHYTHM_TEXT, RC = Y.RHYTHM_COMPOSE, sub = (template, ...args) => { let i = 0; return template.replace(/%[sd]/g, () => String(args[i++])); };
  assert.equal(RC.headingPractice, RT.headingMode + RT.practice);
  assert.equal(RC.headingHosting, RT.headingMode + RT.hosting);
  for (const n of [1, 8]) {
    assert.equal(sub(RC.padNameHit, n), sub(RT.padName, n, RT.hit));
    assert.equal(sub(RC.padNameRest, n), sub(RT.padName, n, RT.rest));
    assert.equal(sub(RC.toggledHit, n, 'Saved.'), sub(RT.toggled, n, RT.hit, 'Saved.'));
    assert.equal(sub(RC.toggledRest, n, 'Saved.'), sub(RT.toggled, n, RT.rest, 'Saved.'));
    assert.equal(sub(RC.lampHit, n), `${n} ${RT.hit}`);
    assert.equal(sub(RC.lampRest, n), `${n} ${RT.rest}`);
  }
  assert.deepEqual([RC.musicOn, RC.musicOff, RC.stepCuesOn, RC.stepCuesOff], [RT.musicLabel + RT.on, RT.musicLabel + RT.off, RT.stepCues + RT.on, RT.stepCues + RT.off]);

  assert.deepEqual(Object.keys(B.BURST_DISPLAY.motifs), S.MURAL_MOTIFS);
  for (const [id, name] of Object.entries(B.BURST_DISPLAY.motifs)) assert.equal(name, gdCapitalize(id));

  // Every composite is human text the extractor keeps, so it reaches translators once its table is registered.
  for (const [file, table] of Object.entries(COMPOSITES)) for (const text of strings(table)) assert.ok(isHumanText(text), `${file}: ${JSON.stringify(text)}`);
});

// ------------------------------------------------------------------------------------------------ English stays as it was
test('English: narrowLabel ignores a template, spokenText keeps the 12-unit limit, directBurst and the banner keep the title rule', () => {
  english();
  assert.equal(C.narrowLabel('Go Meet Bea', C.ACTION_LABELS.meet, ['Bea']), 'Meet Bea');
  assert.equal(C.narrowLabel('Spot Surprise (3/10)'), 'Find 3/10');
  assert.equal(U.speakerLimit(), U.SPEAKER_LIMIT);
  assert.equal(U.SPEAKER_LIMIT, 12);
  assert.equal(U.spokenText('Twelve units: "x"'), 'x', 'a 12-unit name is stripped');
  assert.equal(U.spokenText('Starlight V: "Hi"'), 'Hi', 'an 11-unit name is stripped');
  assert.equal(U.spokenText('Starlight Vee: "Hi"'), 'Starlight Vee: "Hi"', 'a 13-unit name is not');
  assert.deepEqual(B.directBurst({ title: 'Order Up: Bagel', detail: 'X', accent: '#ffe8a3' }), { title: 'Order Up: Bagel', detail: 'X', accent: '#ffe8a3', milestone: false });
  assert.equal(B.directBurst({ title: '10/10 Surprises: Pip', finale: true }).finale, true);
  const banner = B.createBanner(), SHOWN = { focused: false, overview: false, fits: true };
  banner.trigger({ title: '10/10 Surprises: Pip', detail: 'all' }); banner.hold(B.BANNER.finale); banner.layout(SHOWN);
  assert.equal(banner.trigger({ title: 'Order Up: Bagel', detail: 'x' }), false, 'a flagless finale is still read from its title');
});

// ------------------------------------------------------------------------------------------------ pseudo coverage
// The catalog is i18n/source.json alone (the registry lists these tables), so a miss is a msgid the extractor does not find.
const source = readSource();
const MSGIDS = source.entries; // with the context entries (scripts/i18n.mjs CONTEXTS)
const PSEUDO = I.readCatalog(I.pseudoCatalog(MSGIDS, 'qps-ploc'), 'qps-ploc');
const pseudoOn = () => { assert.ok(PSEUDO.catalog, PSEUDO.error); assert.deepEqual(PSEUDO.rejected, []); I.setLocale('qps-ploc', PSEUDO.catalog, { preview: true }); };
// A run of two plain English words: what a missed string looks like among pseudo text (whose letters are all accented).
// Pseudo text keeps only the protected tokens (BPM, WASD, Enter…) in plain letters, so any other word of plain letters is
// English that was not looked up: a whole string, or a word Godot joins in (hit, rest, on, off). The stem ids (bass+brush) and
// the stand-in file name are data, not text; "and" is the pseudo-locale's Intl.ListFormat (en-US), which a real locale's Intl
// replaces. A speech envelope keeps its speaker's name, as the pseudo transform does.
const ALLOWED = new Set(['BPM', 'WASD', 'Enter', 'Esc', 'Shift', 'Tenderloin', 'Redux', 'bass', 'brush', 'chords', 'lead', 'and']);
const SPEAKER = new RegExp(`(?:^|(?<=[\\s·]))(?:${C.CHARACTER_PEOPLE.map(p => p.name).join('|')}): "`, 'g');
const englishRuns = text => (String(text).replace(SPEAKER, ' ').replace(/cut\.mp3/g, ' ').match(/[A-Za-z]{2,}/g) ?? []).filter(word => !ALLOWED.has(word));
// Visible text and the accessible names of HTML.
const textOf = html => [String(html).replace(/<[^>]*>/g, ' '), ...[...String(html).matchAll(/aria-label="([^"]*)"/g)].map(m => m[1])].join(' \n ');

function everything(push) {
  for (const [n, { state, extras }] of CASES.entries()) {
    const talk = TALKS[n % TALKS.length], goal = S.nextObjective(state, WORLD);
    // The explore goal and an episode are visits text (I2e); every earlier goal is story.js's.
    const own = goal.id !== 'explore';
    if (own) push(`goal ${n}`, [goal.text, goal.hint, S.chapterLine(state, { world: WORLD }), S.chapterLine(state, { narrow: true, world: WORLD })]);
    push(`chapter ${n}`, [...Object.values(S.chapterCard(state, { startup: n % 2 === 0 })).filter(v => typeof v === 'string'), S.chapterAnnouncement(state)]);
    for (const id of C.CHARACTER_PEOPLE.map(p => p.id)) {
      for (const narrow of [false, true]) for (const music of [{ mode: 'sketch', playing: true, volume: 0.7 }, { mode: 'local', localName: 'cut.mp3', playing: false, volume: 0.35 }]) {
        const view = C.conversationView(state, extras, talk, id, own ? goal : { ...goal, tourId: '' }, { narrow, music, screenFrame: 1 });
        const actions = own ? view.actions : view.actions.filter(a => a.id !== 'landmark_tour');
        push(`view ${n} ${id} ${narrow}`, [view.name, view.role, view.badge, view.header, view.line, view.tail, view.detail, view.spoken, ...view.buttons.map(b => b.label), ...actions.map(a => a.label), ...(view.music ?? []).map(b => b.label), C.rookMusicDetail(state, view.detail, music)]);
      }
      push(`captions ${n} ${id}`, [C.arrivalCaption(state, extras, talk, id), C.talkAnnouncement(state, extras, talk, id), ...Object.values(C.goodbyeLines(id, own ? goal : { text: '' })), C.talkingSubline(id), ...(own ? [C.whatsNext(goal, id), C.whatsNextAnnouncement(goal, id)] : [])]);
    }
    push(`hosted ${n}`, [...['stories', 'beats', 'pause', 'art'].map(id => H.hostedCompletion(state, id)), C.muralCompositionReply(state, extras), C.muralSceneReply(extras)]);
    const session = Y.openCircle(state).session;
    push(`rhythm ${n}`, [Y.openCircle(state).announce, Y.closeCircle(session).announce, Y.heading(session), Y.objectiveLine('', 3), Y.readerText(session.message), Y.readerText(session.message, { mode: 'local', localName: 'cut.mp3' }), ...Y.pads(n * 37).flatMap(p => [p.label, p.name]), ...Y.options(session, { musicPlaying: n % 2 === 0 }).flatMap(o => [o.label, o.name ?? '']), Y.afterComplete(state).announce, Y.afterComplete(state).notice, Y.lampsName(Y.lamps(n * 37, -1)), Y.toggleStep(state, session, n % 8).message, Y.listen(state, session).message, Y.complete(state, session).message]);
    const v = { ...B.cueValues(state), eras: 2, tourCount: 3, tourTotal: 12, trees: 7 };
    const reasons = { neighbor_visit: 'Thanh', mural_motif: 'wave', loan_returned: 'paint-case', hosting_segment: 'beats', film_shot: 'seat', history_comptons: R.HISTORY_REASONS.comptons, history_blackhawk: R.HISTORY_REASONS.blackhawk, museum_portal: S.PROGRAMME_TITLES.stories };
    for (const id of Object.keys(B.BURST_TEXT)) { const b = B.cueBurst({ id, reason: reasons[id] ?? '', suppressed: false }, v); if (b) push(`burst ${n} ${id}`, [b.title, b.detail]); }
  }
  push('layout', ['table', 'floor'].flatMap(id => { const b = B.layoutBurst(id, 4); return [b.title, b.detail]; }));
  push('hosted ids', ['memory', 'future', 'arc', 'pairs'].flatMap(id => [H.invitationExplanation(id), H.invitationHubText(id), H.invitationButtonLabel(id), H.quietExplanation(id), H.quietHubText(id), H.quietButtonLabel(id)]));
  push('loans', ['table', 'paint-case', 'speaker'].flatMap(id => [H.loanReply(id), H.loanRefusal(id), H.loanReturnAnnouncement(id, 2), H.loanMemory({ epilogue: { returned: [id] } }, S.LOAN_OWNERS[id])]));
  push('sounds', [R.soundsLabel(true), R.soundsLabel(false), R.soundsAnnouncement(true), R.soundsAnnouncement(false)]);
  push('music', [K.stemSummary(15), K.volumeAnnouncement(0.7), K.playingAnnouncement({ summary: K.stemSummary(3) }), K.playingAnnouncement({ mode: 'local', localName: 'cut.mp3' }), K.switchedAnnouncement(K.stemSummary(7))]);
  push('compass', [S.compassPhrase(null, null), S.compassPhrase({ x: 0, y: 0 }, { x: 1, y: 1 }), S.compassPhrase({ x: 0, y: 0 }, { x: 300, y: 0 }), S.compassPhrase({ x: 0, y: 0 }, { x: 0, y: 900 }), S.compassPhrase({ x: 0, y: 0 }, { x: 4000, y: -3000 })]);
  // rhythm-ui's dialog markup, through the fake dialog game.js's host stands in for.
  const opened = CASES.find(c => c.state.opened && c.state.hosting?.results?.length === 4)?.state;
  const dialog = fakeDialog(), shown = [];
  const host = { ...dialog, show: html => { shown.push(textOf(html)); dialog.show(html); }, getState: () => opened, status: t => shown.push(t), toast: t => shown.push(t), act: () => true, music: { enabled: true, starting: false, fileName: '', sketch: { ensureContext: () => null, mute() {}, position: () => 0 } }, volume: () => 0.7, unlocked: () => true, toggleMusic: async () => '', receipt: () => I.L(Y.RHYTHM_TEXT.saved), objective: () => I.L(S.STORY_CHAPTERS[0].title), sparks: () => 4, stopWalk() {}, lastChapter: () => false, afterClose: (origin, text, notice) => shown.push(text ?? '', notice ?? '') };
  const ui = createRhythm(host);
  ui.open('block');
  for (const id of ['rhythm-pad-0', 'rhythm-listen', 'rhythm-step-cues', 'rhythm-play-bar', 'rhythm-back']) { try { dialog.click(id); } catch { /* closed */ } }
  push('rhythm-ui', [...shown, ui.entryLabel()]);
}

test('pseudo-locale: every string these modules show is looked up, and no plain English reaches their output', () => {
  pseudoOn();
  try {
    const leaks = [], seen = [], misses = new Set();
    // characters.js shows PANEL_TEXT.detail as a lone '%s' (CHARACTER_WEB_OVERRIDES), a template with nothing to translate.
    I.onMiss(key => { if (key !== '%s') misses.add(key); });
    everything((label, texts) => { for (const text of texts) { if (String(text ?? '') !== '') seen.push(String(text)); for (const run of englishRuns(text)) leaks.push(`${label}: ${JSON.stringify(run)} in ${JSON.stringify(String(text).slice(0, 160))}`); } });
    assert.ok(seen.length > 3000, `a broad matrix (${seen.length} texts)`);
    assert.deepEqual(leaks, [], 'English reached the output under the pseudo-locale');
    // Every miss is structure (a joiner or a bare placeholder), never English text that no table declares.
    assert.deepEqual([...misses], [], 'English looked up that the extractor does not find');
    assert.ok(seen.filter(text => text.includes('⟦')).length > seen.length * 0.95, 'nearly every text is pseudo text');
  } finally { I.onMiss(null); english(); }
});

// ------------------------------------------------------------------------------------------------ logic keyed by text
const catalog = (code, messages, extra = {}) => { const read = I.readCatalog(JSON.stringify({ format: 1, locale: code, messages, ...extra }), code); assert.ok(read.catalog, read.error); assert.deepEqual(read.rejected, []); return read.catalog; };

test('narrow labels: a locale shows the catalog variant of the wide template with the same arguments, never an English rewrite', () => {
  const met = { ...initialState(), visited: ['bea'] }, extras = C.godotExtras({});
  I.setLocale('es', catalog('es', { 'Go Meet %s': 'Ir a conocer a %s', 'All Block Actions': 'Todas las acciones', 'Celeste': 'Celeste', 'Spot Surprise (%d/%d)': 'Buscar sorpresa (%d/%d)' }, { narrow: { 'Go Meet %s': 'Conocer a %s', 'Spot Surprise (%d/%d)': 'Buscar %1$d de %2$d' } }));
  try {
    const goal = S.nextObjective(met, WORLD), wide = C.conversationActions(met, extras, C.freshTalk(), 'bea', goal), slim = C.conversationActions(met, extras, C.freshTalk(), 'bea', goal, { narrow: true });
    assert.equal(goal.id, 'meet');
    const meet = wide.findIndex(a => a.id.startsWith('walk_neighbor:'));
    assert.match(wide[meet].label, /^Ir a conocer a /);
    assert.match(slim[meet].label, /^Conocer a /, 'the narrow variant, filled with the same name');
    assert.equal(slim.at(-1).label, 'Todas las acciones', 'no variant: the wide translation, not the English "All Actions" rewrite');
    assert.equal(C.narrowLabel('Buscar sorpresa (3/10)', C.ACTION_LABELS.surprise, [3, 10]), 'Buscar 3 de 10', 'positional placeholders');
    assert.equal(C.narrowLabel('All Block Actions'), 'Todas las acciones', 'a label given alone is its own template');
    assert.deepEqual(Object.keys(slim[0]), ['id', 'label'], 'actions carry only id and label');
  } finally { english(); }
});

test('memory tail and quotes: the dedup reads the parts, not the joined English, and a translation may use other quote marks', () => {
  const env = hostedEnvelope({ discovered_surprises: ['hidden_mural_145'] }), state = fork(env), extras = C.godotExtras(env);
  const memory = C.SURPRISE_MEMORY.celeste.first;
  I.setLocale('es', catalog('es', { [memory]: '«Encontraste mi alcoba secreta en el 145 de Leavenworth.»', [H.LOAN_REPLIES['paint-case']]: 'El estuche volvió.' }));
  try {
    // Celeste's fifth turn says the surprise memory itself; the tail must not repeat it.
    const talks = { ...state, celesteTalks: 5 }, line = C.celesteLine(talks, extras);
    assert.equal(line, 'Celeste: "Encontraste mi alcoba secreta en el 145 de Leavenworth."', 'the « » pair comes off inside the envelope');
    const tail = C.memoryTail(talks, extras, 'celeste', line, 5);
    assert.ok(!tail.includes('alcoba'), `the spoken surprise is not repeated: ${tail}`);
    assert.equal(tail, '“El estuche volvió.”', "the project part alone: Celeste's paint case memory");
    assert.equal(C.projectMemory(talks, extras, 'celeste'), '“El estuche volvió.” · «Encontraste mi alcoba secreta en el 145 de Leavenworth.»');
    // Even and odd turns alternate between the two parts, whatever the joined text looks like.
    const other = 'nothing said';
    assert.ok(C.memoryTail(talks, extras, 'celeste', other, 2).includes('alcoba'));
    assert.ok(!C.memoryTail(talks, extras, 'celeste', other, 3).includes('alcoba'));
  } finally { english(); }
});

test('speech envelope: a locale strips its own longer speaker names; the art tail stays inside the closing quote', () => {
  english();
  const ar = catalog('ar', { Bea: 'بياتريس (جارة خيالية)', Rook: 'روك' });
  const long = 'بياتريس (جارة خيالية): "شكرًا لحضورك."';
  assert.equal(U.spokenText(long), long, 'English keeps 12 code units, so this name is not stripped');
  I.setLocale('ar', ar);
  try {
    assert.equal(U.speakerLimit(), 'بياتريس (جارة خيالية)'.length);
    assert.equal(U.spokenText(long), 'شكرًا لحضورك.', 'the localized name fits the locale limit');
    assert.equal(U.spokenText('A much longer speaker name than any: "x"'), 'A much longer speaker name than any: "x"');
  } finally { english(); }
  // The art tail: Dez's line in pseudo, with the painted guitar reply said before the closing quote.
  const env = openedEnvelope({ mural_scenes: { left: 'music' } }), state = fork(env), extras = C.godotExtras(env);
  pseudoOn();
  try {
    const line = C.greetingLine(state, extras, { ...C.freshTalk(), dez: 1 }, 'dez');
    assert.match(line, /^Dez: ".*"$/s, 'still one speech line');
    assert.ok(line.includes(I.L(C.MURAL_REPLY.dez.text)), 'the pseudo art tail is inside it');
    assert.ok(line.indexOf(I.L(C.MURAL_REPLY.dez.text)) + I.L(C.MURAL_REPLY.dez.text).length === line.length - 1);
    // Celeste's narrow detail drops the line's own speaker envelope, not the English name.
    I.setLocale('es', catalog('es', { Celeste: 'Selest', [C.CELESTE_LINES.before[0]]: 'Selest: "Bienvenida a mi caballete."', [C.SURPRISE_MEMORY.celeste.first]: '“Mi alcoba.”' }));
    const env2 = godotEnvelope({ discovered_surprises: ['hidden_mural_145'], celeste_talk_count: 1 }), s2 = fork(env2);
    assert.equal(C.panelDetail(s2, C.godotExtras(env2), C.freshTalk(), 'celeste', { narrow: true }), 'Celeste: “Mi alcoba.” · "Bienvenida a mi caballete."');
  } finally { english(); }
});

test('the compass plural: a locale picks the plural form of the whole direction phrase; Godot\'s one-block phrase stays', () => {
  // Every direction's phrase, so the test does not depend on the map's rotation: the plural object for 'about %d blocks …' and
  // the single block's own phrase.
  const forms = { zero: 'صفر %d', one: 'واحد %d', two: 'كتلتان', few: 'نحو %d كتل', many: 'نحو %d كتلة', other: 'نحو %d من الكتل' };
  const messages = Object.fromEntries(S.COMPASS_SECTORS.flatMap(dir => [[S.COMPASS_TEXT.blocks[dir], forms], [S.COMPASS_TEXT.block[dir], 'نحو كتلة']]));
  I.setLocale('ar', catalog('ar', messages));
  try {
    const at = blocks => S.compassPhrase({ x: 0, y: 0 }, { x: blocks * 145 * PIXELS_PER_METRE, y: 0 });
    assert.equal(at(2), 'كتلتان', 'two');
    assert.equal(at(3), 'نحو \u20683\u2069 كتل', 'few, the number isolated in RTL');
    assert.equal(at(11), 'نحو \u206811\u2069 كتلة', 'many');
    assert.equal(at(100), 'نحو \u2068100\u2069 من الكتل', 'other');
    assert.equal(at(1), 'نحو كتلة', "one block keeps Godot's own phrase");
  } finally { english(); }
  assert.match(S.compassPhrase({ x: 0, y: 0 }, { x: 3 * 145 * PIXELS_PER_METRE, y: 0 }), /^about 3 blocks [a-z]+$/, 'English is the template');
});

test('bursts: the finale is read from the burst, the segment and loan get titles, ids are never title-cased in a locale', () => {
  pseudoOn();
  try {
    const banner = B.createBanner(), SHOWN = { focused: false, overview: false, fits: true };
    // A translated finale title need not start with "10/10".
    banner.trigger(B.directBurst({ title: 'Diez de diez: Pip', detail: 'x', finale: true })); banner.hold(B.BANNER.finale); banner.layout(SHOWN);
    assert.equal(banner.trigger(B.directBurst({ title: '10/10 is a lesser burst here', finale: false })), false, 'the flagged finale is kept');
    const v = B.cueValues(initialState());
    const seg = B.cueBurst({ id: 'hosting_segment', reason: 'beats', suppressed: false }, v);
    assert.ok(seg.title.includes(I.L(S.PROGRAMME_TITLES.beats)), seg.title);
    const loan = B.cueBurst({ id: 'loan_returned', reason: 'paint-case', suppressed: false }, v);
    assert.ok(loan.title.includes(I.L(S.LOAN_TITLES['paint-case'])) && !loan.title.includes('Paint-case'), loan.title);
    assert.ok(B.cueBurst({ id: 'mural_motif', reason: 'rise', suppressed: false }, v).title.includes(I.L('Rise')));
    assert.ok(B.cueBurst({ id: 'mural_motif', reason: 'odd_id', suppressed: false }, v).title.includes('odd_id'), 'an unknown id as it is');
  } finally { english(); }
});

test('the new test file is LF', () => {
  assert.ok(!readFileSync(new URL('./next-i18n-dialogue.test.mjs', import.meta.url), 'utf8').includes('\r'));
});
