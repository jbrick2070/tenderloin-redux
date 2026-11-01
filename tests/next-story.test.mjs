import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState, project, ORIGIN } from '../browser-next/core.js';
import { NEIGHBORS, PLACES } from '../browser-next/world.js';
import * as story from '../browser-next/story.js';
import {
  STORY_CHAPTERS, MURAL_MOTIFS, LOAN_IDS, LOAN_OWNERS, LOAN_TITLES, GATHERING_LAYOUTS, GATHERING_LAYOUT_TITLES, PROGRAMME_SEGMENTS, PROGRAMME_TITLES,
  NEIGHBOR_IDS, NEIGHBOR_NAMES, NARROW_WIDTH, COMPASS_SECTORS, OBJECTIVE_IDS, GODOT_TEMPLATES, WEB_OVERRIDES, FORK_TEXT,
  fmt, webText, segmentTitle, isNarrow, compassPhrase, currentChapter, storyChapter, chapterLine, chapterCard, chapterCardDue, chapterAnnouncement,
  nextObjective, hintFor, whatsNextLine,
} from '../browser-next/story.js';
import { SURPRISE_IDS } from '../browser-next/godot-save.js';
import { MAIN } from '../browser-next/visits/text.js';
import { MUSEUM, SURPRISE_SITES } from '../browser-next/visits/positions.js';
import { neighborHint } from '../browser-next/visits/surprises.js';
import { initialTour } from '../browser-next/visits/landmarks.js';
import * as picker from '../browser-next/visits/picker.js';

// --- Drift: godot/main.gd is read at test time, so a Godot text or logic change fails here. ---
const gd = readFileSync(new URL('../godot/main.gd', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function balanced(text, start) {
  let depth = 0, quoted = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '\\') i++; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if (ch === '[' || ch === '{') depth++;
    else if ((ch === ']' || ch === '}') && --depth === 0) return text.slice(start, i + 1);
  }
  throw Error('Unbalanced literal');
}
function declared(kind, name) {
  const m = new RegExp(`^${kind} ${name}: [^=\\n]+= (?=[\\[{])`, 'm').exec(gd);
  assert.ok(m, `${kind} ${name} is missing from godot/main.gd`);
  return balanced(gd, m.index + m[0].length);
}
const godotConst = name => JSON.parse(declared('const', name));
function funcBody(name) {
  const start = gd.search(new RegExp(`^func ${name}\\(`, 'm'));
  assert.ok(start >= 0, `func ${name} is missing from godot/main.gd`);
  const end = gd.slice(start + 1).search(/^func /m);
  return gd.slice(start, end < 0 ? gd.length : start + 1 + end);
}
const unescape = s => s.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t' })[c] ?? c);
const literals = body => [...body.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map(m => unescape(m[1]));
const codeLines = body => body.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
// Each expected line must appear, in this order, among the code lines.
function inOrder(lines, expected, label) {
  let at = -1;
  for (const want of expected) {
    const i = lines.findIndex((line, j) => j > at && line === want);
    assert.ok(i > at, `${label} moved or changed: ${want}`);
    at = i;
  }
}
// Split a GDScript dictionary literal at its top-level commas into {key: expression}.
function gdDict(literal) {
  const inner = literal.slice(1, -1), parts = [];
  let depth = 0, quoted = false, from = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quoted) { if (ch === '\\') i++; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) { parts.push(inner.slice(from, i)); from = i + 1; }
  }
  parts.push(inner.slice(from));
  return Object.fromEntries(parts.map(part => part.trim()).filter(Boolean).map(entry => {
    const m = /^"([a-z_]+)":\s*([\s\S]+)$/.exec(entry);
    assert.ok(m, `unparsed dictionary entry: ${entry}`);
    return [m[1], m[2].trim()];
  }));
}
// '"Meet %s" % [a, b]' -> {template: 'Meet %s', args: '[a, b]'}; anything else stays as {code}.
function gdFormat(expr) {
  const m = /^"((?:[^"\\]|\\.)*)"(?:\s*%\s*([\s\S]+))?$/.exec(expr);
  return m ? { template: unescape(m[1]), args: m[2]?.trim() ?? null } : { code: expr };
}
const objectiveDicts = () => { const body = funcBody('current_objective'); return [...body.matchAll(/return \{/g)].map(m => gdDict(balanced(body, m.index + 7))); };
const pattern = template => new RegExp(`^${template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%s/g, '.+').replace(/%d/g, '-?\\d+')}$`);
const SHORTCUT = /\s\((?:[A-Z]|\.)\)|Shift\+|Ctrl\+/;
const T = GODOT_TEMPLATES.current_objective, A = GODOT_TEMPLATES.ask_whats_next;

// current_objective by id: Godot's helper and target expressions, then the template key and format
// arguments of its text and hint. Programme text is the prog_text variable, pinned line by line.
const PORT = {
  meet: ['best', 'n.pos', ['meet', '[n.name, met, total]'], ['meetHint', '[n.name, compass_phrase(p, neighbor_xz(best))]']],
  layout: ['0', 'bea_pos', ['layout'], ['layoutHint']],
  mural: ['celeste_index', 'MURAL_POS', ['mural', 'mural_placements.size()'], ['muralHint', 'compass_phrase(p, mural_xz())']],
  soundcheck: ['rook_index', 'ROOK_SPEAKER_POS', ['soundcheck'], ['soundcheckHint', 'compass_phrase(p, speaker_xz())']],
  open: ['0', 'bea_pos', ['open'], ['openHint']],
  photo: ['0', 'bea_pos', ['photo'], ['photoHint']],
  pack: ['neighbor_index_for_id("thanh")', 'neighbors[maxi(0, neighbor_index_for_id("thanh"))].pos', ['pack'], ['packHint']],
  return: ['owner_i', 'neighbors[owner_i].pos', ['return', '[loan_title, epilogue_returned.size()]'], ['returnHint', '[loan_title, neighbors[owner_i].name, compass_phrase(p, neighbor_xz(owner_i))]']],
  programme: ['0', 'bea_pos', null, ['programmeHint']],
  civic: ['0', 'bea_pos', ['civic'], ['civicHint']],
  film: ['neighbor_index_for_id("dez")', 'neighbors[maxi(0, neighbor_index_for_id("dez"))].pos', ['film'], ['filmHint']],
  comptons: ['-1', 'COMPTONS_POS', ['comptons'], ['comptonsHint', 'compass_phrase(p, comptons_xz())']],
  blackhawk: ['-1', 'BLACKHAWK_POS', ['blackhawk'], ['blackhawkHint', 'compass_phrase(p, blackhawk_xz())']],
};
// The fork's stand-in for each Godot helper and target. Rook stands in for his speaker marker;
// best and owner_i resolve to Bea and Thanh in the sample states below.
const STAND_IN = {
  0: 'bea', bea_pos: 'bea', best: 'bea', 'n.pos': 'bea', celeste_index: 'celeste', MURAL_POS: 'mural', rook_index: 'rook', ROOK_SPEAKER_POS: 'rook',
  'neighbor_index_for_id("thanh")': 'thanh', 'neighbors[maxi(0, neighbor_index_for_id("thanh"))].pos': 'thanh', owner_i: 'thanh', 'neighbors[owner_i].pos': 'thanh',
  'neighbor_index_for_id("dez")': 'dez', 'neighbors[maxi(0, neighbor_index_for_id("dez"))].pos': 'dez', '-1': null, COMPTONS_POS: 'history', BLACKHAWK_POS: 'blackhawk',
};

test('drift: copied consts deep-equal godot/main.gd', () => {
  assert.deepEqual(STORY_CHAPTERS, godotConst('STORY_CHAPTERS'));
  assert.equal(STORY_CHAPTERS.length, 6);
  assert.deepEqual(PROGRAMME_TITLES, godotConst('PROGRAMME_TITLES'));
  assert.deepEqual(LOAN_TITLES, godotConst('LOAN_TITLES'));
  assert.deepEqual(GATHERING_LAYOUT_TITLES, godotConst('GATHERING_LAYOUT_TITLES'));
  assert.deepEqual(LOAN_IDS, godotConst('LOAN_IDS'));
  assert.deepEqual(LOAN_OWNERS, godotConst('LOAN_OWNERS'));
  assert.deepEqual(GATHERING_LAYOUTS, godotConst('GATHERING_LAYOUTS'));
  assert.deepEqual(PROGRAMME_SEGMENTS, godotConst('PROGRAMME_SEGMENTS'));
  assert.deepEqual(MURAL_MOTIFS, godotConst('MURAL_MOTIFS'));
  const people = [...declared('var', 'neighbors').matchAll(/\{"id": "([^"]+)", "name": "([^"]+)"/g)];
  assert.deepEqual(people.map(m => m[1]), NEIGHBOR_IDS);
  assert.deepEqual(Object.fromEntries(people.map(m => [m[1], m[2]])), NEIGHBOR_NAMES);
  assert.equal(Number(/^const SIDE_HUB_MIN_WIDTH := ([\d.]+)/m.exec(gd)?.[1]), NARROW_WIDTH);
  assert.deepEqual(codeLines(funcBody('is_narrow_layout')).slice(1), ['return bubble_viewport_size().x < SIDE_HUB_MIN_WIDTH']);
});

test('drift: every copied template is a string literal in its Godot function', () => {
  for (const [name, templates] of Object.entries(GODOT_TEMPLATES)) {
    const found = new Set(literals(funcBody(name)));
    for (const [key, template] of Object.entries(templates)) assert.ok(found.has(template), `${name}.${key} drifted from godot/main.gd: ${template}`);
  }
  const sectors = /var sectors: Array\[String\] = (\[[^\]\n]*\])/.exec(funcBody('compass_phrase'));
  assert.deepEqual(JSON.parse(sectors[1]), COMPASS_SECTORS);
});

test('drift: WEB_OVERRIDES covers exactly the key hints and the easel, and changes nothing else', () => {
  const forWeb = t => t.replace(/ \((?:[A-Z]|\.)\)/, '').replace(/^Celeste's easel/, 'The mural').replace(/Celeste's easel/, 'the mural');
  const copied = Object.values(GODOT_TEMPLATES).flatMap(Object.values);
  assert.deepEqual(Object.keys(WEB_OVERRIDES).sort(), [...new Set(copied.filter(t => forWeb(t) !== t))].sort());
  for (const [godot, web] of Object.entries(WEB_OVERRIDES)) {
    assert.equal(web, forWeb(godot));
    assert.equal(webText(godot), web);
  }
  for (const t of copied) assert.ok(!SHORTCUT.test(webText(t)) && !/easel/i.test(webText(t)), t);
  assert.equal(webText('Run a soundcheck with Rook'), 'Run a soundcheck with Rook');
});

test('drift: each objective id keeps its Godot text, hint, helper, target and counts', () => {
  const dicts = objectiveDicts(), byId = new Map(dicts.filter(d => d.id !== '"explore"').map(d => [JSON.parse(d.id), d]));
  assert.deepEqual(dicts.map(d => JSON.parse(d.id)), [...OBJECTIVE_IDS, 'explore', 'explore']);
  assert.deepEqual([...byId.keys()], Object.keys(PORT));
  for (const [id, [neighbor, target, text, hint]] of Object.entries(PORT)) {
    const d = byId.get(id);
    assert.equal(d.neighbor, neighbor, `${id} helper`);
    assert.equal(d.target, target, `${id} target`);
    assert.equal(d.has_target, 'true', `${id} has a target`);
    for (const [field, want] of [['text', text], ['hint', hint]]) {
      if (!want) { assert.deepEqual(gdFormat(d[field]), { code: 'prog_text' }); continue; }
      assert.deepEqual(gdFormat(d[field]), { template: T[want[0]], args: want[1] ?? null }, `${id} ${field}`);
    }
  }
  inOrder(codeLines(funcBody('current_objective')), [
    'var p := player_xz() if player != null else Vector2(PLAYER_START.x, PLAYER_START.z)', 'var met := visited_neighbors.size()', 'var total := neighbors.size()',
    'var bea_pos: Vector3 = neighbors[0].pos if total > 0 else PLAYER_START', 'if not block_opened:',
    'if not visited_neighbors.has(String(neighbors[i].get("id", ""))):', 'var d := p.distance_to(neighbor_xz(i))', 'if d < best_d:', 'var n: Dictionary = neighbors[best]',
    'if not (gathering_layout in GATHERING_LAYOUTS):', 'if mural_placements.size() < MURAL_MOTIFS.size():', 'if not rook_soundcheck_done:',
    'var kp := String(keepsake_photo.get("status", "unasked"))', 'if kp == "unasked" and not epilogue_packing:', 'if not is_epilogue_done():', 'if not epilogue_packing:',
    'for lid in LOAN_IDS:', 'if not epilogue_returned.has(lid):', 'var owner_i := maxi(0, neighbor_index_for_id(String(LOAN_OWNERS.get(lid, "thanh"))))',
    'var loan_title := String(LOAN_TITLES.get(lid, lid))', 'if not is_hosting_done():', `var prog_text := "${T.plan}"`,
    'if programme_published.size() == PROGRAMME_SEGMENTS.size() and hosting_order.is_empty():', `prog_text = "${T.startHosting}"`,
    'elif not hosting_order.is_empty():', `prog_text = "${T.hostNext}" % [programme_title(current_hosting_activity()), hosting_results.size()]`,
    'if civic_phase != "done":', 'if film_phase != "done":', 'if not history_read:', 'if not blackhawk_discovered:',
  ], 'current_objective');
  assert.equal(/^const CELESTE_ID := "(\w+)"/m.exec(gd)?.[1], 'celeste');
  assert.equal(/^const ROOK_ID := "(\w+)"/m.exec(gd)?.[1], 'rook');
  inOrder(codeLines(gd), ['if n_id == CELESTE_ID:', 'celeste_index = i', 'elif n_id == ROOK_ID:', 'rook_index = i'], 'the helper indices');
});

test('drift: chapters, the chapter card, its trigger and the compass still match Godot', () => {
  assert.deepEqual(codeLines(funcBody('current_chapter')), [
    'func current_chapter() -> Dictionary:', 'var idx := 0', 'if block_opened:', 'idx = 1',
    'if is_epilogue_done() or not programme_published.is_empty() or not hosting_order.is_empty():', 'idx = 2',
    'if is_hosting_done():', 'idx = 3', 'if civic_phase == "done":', 'idx = 4', 'if film_phase == "done":', 'idx = 5', 'return STORY_CHAPTERS[idx]',
  ]);
  assert.deepEqual(codeLines(funcBody('is_epilogue_done')).slice(1), ['return block_opened and epilogue_packing and epilogue_returned.size() == LOAN_IDS.size()']);
  assert.deepEqual(codeLines(funcBody('is_hosting_done')).slice(1), ['return hosting_order.size() == PROGRAMME_SEGMENTS.size() and hosting_results.size() == PROGRAMME_SEGMENTS.size()']);
  assert.deepEqual(codeLines(funcBody('current_hosting_activity')).slice(1), ['if hosting_order.size() != PROGRAMME_SEGMENTS.size() or hosting_results.size() >= hosting_order.size():', 'return ""', 'return hosting_order[hosting_results.size()]']);
  assert.deepEqual(codeLines(funcBody('programme_title')).slice(1), ['return String(PROGRAMME_TITLES.get(segment_id, segment_id))']);
  const ui = codeLines(funcBody('update_objective_ui'));
  assert.ok(ui.includes('objective_label.text = "Ch. %d · Next: %s" % [int(ch.num), next_text]'));
  assert.ok(ui.includes('objective_label.text = "Chapter %d: %s · Next: %s" % [int(ch.num), String(ch.title), next_text]'));
  const card = codeLines(funcBody('show_story_card'));
  assert.ok(card.includes('story_title_label.text = "Chapter %d · %s" % [int(chapter.num), String(chapter.title)]'));
  assert.ok(card.includes('story_body_label.text = String(chapter.intro)'));
  assert.ok(card.includes('story_continue_btn.text = "Start Exploring" if startup else "Continue"'));
  assert.deepEqual(codeLines(funcBody('consume_chapter_announcement')), [
    'func consume_chapter_announcement(chapter: Dictionary,startup := false) -> String:',
    'var chapter_announcement := "Chapter %d: %s. %s" % [int(chapter.num), String(chapter.title), String(chapter.intro)]',
    'if rhythm_circle != null and not rhythm_circle.chapter_completion_notice.is_empty():', 'chapter_announcement = rhythm_circle.chapter_completion_notice+chapter_announcement',
    'rhythm_circle.chapter_completion_notice = ""', 'if loan_homecoming != null:', 'if not startup: chapter_announcement=loan_homecoming.chapter_completion_notice+chapter_announcement',
    'loan_homecoming.chapter_completion_notice=""', 'return chapter_announcement',
  ]);
  assert.ok(codeLines(gd).includes('var last_story_chapter := -1'));
  inOrder(codeLines(funcBody('_ready')), ['var start_chapter := current_chapter()', 'last_story_chapter = int(start_chapter.num)', 'show_story_card(start_chapter, true)'], 'the startup card');
  inOrder(codeLines(funcBody('update_conversation_ui')), [
    'var chapter := current_chapter()',
    'if last_story_chapter >= 0 and int(chapter.num) != last_story_chapter and not is_mural_workshop_visible() and not is_rhythm_circle_visible():',
    'last_story_chapter = int(chapter.num)', 'show_story_card(chapter)',
  ], 'the chapter card trigger');
  const compass = codeLines(funcBody('compass_phrase'));
  for (const line of ['if dist < 10.0:', 'var dir: String = sectors[posmod(int(round(atan2(-d.y, d.x) / (PI / 4.0))), 8)]', 'if dist < 100.0:',
    'return "about %d m %s" % [int(round(dist / 10.0)) * 10, dir]', 'var blocks := int(round(dist / 145.0))', 'return "about a block %s" % dir if blocks <= 1 else "about %d blocks %s" % [blocks, dir]']) {
    assert.ok(compass.includes(line), `compass_phrase changed: ${line}`);
  }
});

test('drift: ask_whats_next picks the speaker and rewrites the layout pitch per speaker', () => {
  inOrder(codeLines(funcBody('ask_whats_next')), [
    'var obj := current_objective()', 'var speaker := active_panel_neighbor_idx()', 'if speaker < 0:', 'if talk_partner >= 0 and talk_partner < neighbors.size():',
    'speaker = talk_partner', 'else:', 'speaker = nearest_neighbor_within(TALK_PROMPT_RADIUS_M)', 'var hint := String(obj.get("hint", ""))',
    'if String(obj.get("id", "")) == "layout" and speaker >= 0:', 'match String(neighbors[speaker].get("id", "")):',
    '"bea":', `hint = "${A.layoutBea}"`, '"dez", "celeste":', `hint = "${A.layoutOpenFloor}"`, 'elif String(obj.get("id", "")) == "explore" and speaker >= 0:',
    'var line := conversation_partner_line(speaker, hint) if speaker >= 0 else hint',
  ], 'ask_whats_next');
  assert.deepEqual(codeLines(funcBody('conversation_partner_line')).slice(1), ['if index < 0 or index >= neighbors.size():', 'return body', 'return "%s: \\"%s\\"" % [String(neighbors[index].name), body]']);
});

// --- Units over fork states. ---
const world = { player: { x: 95, y: -47 }, neighbors: NEIGHBORS, places: Object.fromEntries(PLACES.map(p => [p.id, p])) };
const at = id => ({ x: NEIGHBORS.find(n => n.id === id).x, y: NEIGHBORS.find(n => n.id === id).y });
const fresh = () => ({ ...initialState(), visited: [], celesteTalks: 0 });
const mural = { sun: { col: 0, row: 0 }, wave: { col: 1, row: 0 }, rise: { col: 2, row: 0 } };
function opened(changes = {}) {
  return { ...fresh(), visited: [...NEIGHBOR_IDS].sort(), layout: 'table', mural: structuredClone(mural), soundcheck: true, opened: true, ...changes };
}
const result = id => ({ id, value: { stories: 'memory', beats: 85, art: { tiles: [0, 1, 2, 2, 1, 0], palette: 'warm' }, pause: 'arc' }[id] });
const order = ['stories', 'beats', 'pause', 'art'];
const packed = (returned = LOAN_IDS) => ({ packing: true, returned: [...returned], photo: { status: 'skipped' } });
const hosted = (n = 4) => ({ order: [...order], results: order.slice(0, n).map(result), draft: initialState().hosting.draft });
const afternoon = (changes = {}) => opened({ epilogue: packed(), programme: { order: [...order], published: [...order] }, hosting: hosted(), ...changes });
const civicDone = { ...initialState().civic, phase: 'done', result: { topic: 'repairs', format: 'circle', notes: 'themes' } };
const filmDone = { ...initialState().film, phase: 'done' };
// One state per objective id, in OBJECTIVE_IDS order.
const SAMPLES = [
  fresh(), { ...fresh(), visited: [...NEIGHBOR_IDS] }, { ...fresh(), visited: [...NEIGHBOR_IDS], layout: 'table' },
  { ...fresh(), visited: [...NEIGHBOR_IDS], layout: 'table', mural }, { ...fresh(), visited: [...NEIGHBOR_IDS], layout: 'table', mural, soundcheck: true },
  opened(), opened({ epilogue: { packing: false, returned: [], photo: { status: 'taken' } } }), opened({ epilogue: packed([]) }), opened({ epilogue: packed() }),
  afternoon(), afternoon({ civic: civicDone }), afternoon({ civic: civicDone, film: filmDone }), { ...afternoon({ civic: civicDone, film: filmDone }), history: true },
  { ...afternoon({ civic: civicDone, film: filmDone }), history: true, blackhawk: true },
];

test('each fork objective pairs the text, hint, helper and target of its Godot id', () => {
  const byId = new Map(objectiveDicts().filter(d => d.id !== '"explore"').map(d => [JSON.parse(d.id), d]));
  const progText = [T.plan, T.startHosting, T.hostNext];
  for (const state of SAMPLES.slice(0, -1)) {
    const goal = nextObjective(state, world), d = byId.get(goal.id), text = gdFormat(d.text), hint = gdFormat(d.hint);
    assert.ok((text.template ? [text.template] : progText).some(t => pattern(webText(t)).test(goal.text)), `${goal.id} text: ${goal.text}`);
    assert.match(goal.hint, pattern(webText(hint.template)), `${goal.id} hint`);
    assert.equal(goal.neighbor, STAND_IN[d.neighbor], `${goal.id} helper`);
    assert.equal(goal.target?.id ?? null, STAND_IN[d.target], `${goal.id} target`);
  }
});

test('currentChapter follows the furthest Godot gate reached', () => {
  assert.equal(currentChapter(fresh()), 0);
  assert.equal(currentChapter(undefined), 0);
  assert.equal(currentChapter({ ...fresh(), visited: [...NEIGHBOR_IDS], mural, soundcheck: true }), 0, 'ready but not opened');
  assert.equal(currentChapter({ ...fresh(), hosting: hosted(), civic: civicDone, film: filmDone }), 0, 'nothing counts before opening');
  assert.equal(currentChapter(opened()), 1);
  assert.equal(currentChapter(opened({ epilogue: packed(['table', 'speaker']) })), 1, 'two of three loans');
  assert.equal(currentChapter(opened({ epilogue: { packing: false, returned: [...LOAN_IDS], photo: { status: 'taken' } } })), 1, 'returned without packing');
  assert.equal(currentChapter(opened({ epilogue: packed() })), 2, 'epilogue done');
  assert.equal(currentChapter(opened({ programme: { order: [...order], published: [...order] } })), 2, 'programme published');
  assert.equal(currentChapter(opened({ programme: { order: [...order], published: [] } })), 1, 'draft order alone');
  assert.equal(currentChapter(opened({ hosting: hosted(0) })), 2, 'hosting started');
  assert.equal(currentChapter(opened({ hosting: hosted(3) })), 2, 'three of four hosted');
  assert.equal(currentChapter(opened({ hosting: hosted() })), 3, 'hosting done, even with the loans out');
  assert.equal(currentChapter(afternoon()), 3);
  assert.equal(currentChapter(afternoon({ civic: { ...civicDone, phase: 'meeting' } })), 3);
  assert.equal(currentChapter(afternoon({ civic: civicDone })), 4);
  assert.equal(currentChapter(afternoon({ civic: civicDone, film: { ...filmDone, phase: 'shooting' } })), 4);
  assert.equal(currentChapter(afternoon({ civic: civicDone, film: filmDone })), 5);
  assert.equal(currentChapter(opened({ film: filmDone })), 5, 'later gates win, as in Godot');
  assert.deepEqual(storyChapter(afternoon({ civic: civicDone, film: filmDone })), STORY_CHAPTERS[5]);
});

test('the module reads fork state and refuses a Godot envelope instead of quietly starting over', () => {
  const envelope = { block_opened: true, epilogue: packed(), hosting: hosted(), civic: { phase: 'done' }, film: { phase: 'done' }, visited_neighbors: [...NEIGHBOR_IDS] };
  for (const call of [() => currentChapter(envelope), () => nextObjective(envelope, world), () => storyChapter({ block_opened: false }),
    () => chapterLine({ visited_neighbors: [] }), () => chapterCard(envelope)]) {
    assert.throws(call, { name: 'TypeError', message: /fork state, not a Godot save envelope/ });
  }
  assert.equal(currentChapter(afternoon({ civic: civicDone, film: filmDone })), 5, 'the same progress as fork state');
});

test('chapterLine is wide by default and short below NARROW_WIDTH', () => {
  assert.equal(chapterLine(fresh(), { world }), 'Chapter 1: Get the Block Ready · Next: Meet Bea (0/5 neighbors met)');
  assert.equal(chapterLine(fresh(), { narrow: true, world }), 'Ch. 1 · Next: Meet Bea (0/5 neighbors met)');
  assert.equal(chapterLine(fresh()), 'Chapter 1: Get the Block Ready · Next: Meet Bea (0/5 neighbors met)');
  assert.equal(chapterLine(fresh(), null), chapterLine(fresh()), 'null options are the defaults');
  assert.equal(chapterLine(opened(), { world }), 'Chapter 2: The Gathering · Next: Take the group keepsake photo');
  assert.equal(chapterLine(opened({ epilogue: packed() }), { narrow: true }), 'Ch. 3 · Next: Plan the party schedule with Bea');
  const done = { ...afternoon({ civic: civicDone, film: filmDone }), history: true, blackhawk: true }, spot = "Spot Jeffrey's Lost 1961 Record (0/10 surprises) · Museum";
  assert.equal(chapterLine(done), `Chapter 6: Your Block · Next: ${spot}`);
  assert.equal(chapterLine(done, { narrow: true }), `Ch. 6 · Next: ${spot}`);
  assert.equal(chapterLine(done, { width: 599 }), `Ch. 6 · Next: ${spot}`);
  assert.equal(chapterLine(done, { width: 600 }), `Chapter 6: Your Block · Next: ${spot}`);
  assert.equal(chapterLine(done, { width: 320, narrow: false }), `Chapter 6: Your Block · Next: ${spot}`, 'a boolean narrow wins');
});

test('isNarrow is Godot\'s strict viewport.x < 600', () => {
  assert.equal(isNarrow(599), true);
  assert.equal(isNarrow(599.5), true);
  assert.equal(isNarrow(NARROW_WIDTH), false);
  assert.equal(isNarrow(1440), false);
  for (const width of [undefined, null, NaN, '320']) assert.equal(isNarrow(width), false, String(width));
});

test('chapterCard copies show_story_card and the chapter announcement', () => {
  assert.deepEqual(chapterCard(fresh(), { startup: true }), {
    num: 1, title: 'Chapter 1 · Get the Block Ready', body: STORY_CHAPTERS[0].intro, button: 'Start Exploring',
    announcement: `Chapter 1: Get the Block Ready. ${STORY_CHAPTERS[0].intro}`,
  });
  const card = chapterCard(afternoon({ civic: civicDone }));
  assert.equal(card.num, 5); assert.equal(card.title, 'Chapter 5 · The Open Seat'); assert.equal(card.button, 'Continue');
  assert.equal(card.body, STORY_CHAPTERS[4].intro); assert.equal(card.announcement, `Chapter 5: The Open Seat. ${STORY_CHAPTERS[4].intro}`);
  assert.equal(chapterCard(opened()).button, 'Continue');
  assert.deepEqual(chapterCard(opened(), null), chapterCard(opened()), 'null options are the defaults');
  const notice = 'Returned all three neighbor loans (3/3). ', ready = opened({ epilogue: packed() });
  assert.equal(chapterCard(ready, { notice }).announcement, `${notice}Chapter 3: Another Afternoon. ${STORY_CHAPTERS[2].intro}`);
  assert.equal(chapterAnnouncement(ready, notice), chapterCard(ready, { notice }).announcement);
  assert.equal(chapterAnnouncement(ready), `Chapter 3: Another Afternoon. ${STORY_CHAPTERS[2].intro}`);
  assert.equal(chapterAnnouncement(ready, 7), chapterAnnouncement(ready), 'only a string notice is prefixed');
});

test('chapterCardDue shows a card on any chapter change after the startup card', () => {
  assert.equal(chapterCardDue(1, fresh()), false, 'same chapter');
  assert.equal(chapterCardDue(1, opened()), true, 'a step forward');
  assert.equal(chapterCardDue(2, opened()), false);
  assert.equal(chapterCardDue(3, opened()), true, 'a drop after a restart or an import shows too (!=, not >)');
  assert.equal(chapterCardDue(6, fresh()), true);
  for (const before of [-1, null, undefined, NaN, '1']) assert.equal(chapterCardDue(before, opened()), false, `no startup card yet: ${before}`);
});

test('meet targets the nearest unmet neighbor from the player, in Godot order on ties', () => {
  let goal = nextObjective(fresh(), world);
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'meet', text: 'Meet Bea (0/5 neighbors met)', hint: 'Bea is right here. Go say hello!', target: 'bea', neighbor: 'bea' });
  assert.equal(goal.target, NEIGHBORS[0], 'the target is the world object, ready for goTo');
  goal = nextObjective({ ...fresh(), visited: ['bea'] }, world);
  assert.equal(goal.text, 'Meet Thanh (1/5 neighbors met)'); assert.equal(goal.hint, 'Thanh is about 40 m south. Go say hello!');
  goal = nextObjective({ ...fresh(), visited: ['bea'] }, { ...world, player: at('rook') });
  assert.equal(goal.text, 'Meet Rook (1/5 neighbors met)'); assert.equal(goal.neighbor, 'rook'); assert.match(goal.hint, /^Rook is right here\./);
  goal = nextObjective({ ...fresh(), visited: ['bea', 'rook', 'thanh'] }, { ...world, player: at('dez') });
  assert.equal(goal.text, 'Meet Dez (3/5 neighbors met)');
  assert.equal(nextObjective({ ...fresh(), visited: ['bea'], player: at('dez') }, { neighbors: NEIGHBORS }).target.id, 'dez', 'state.player stands in for world.player');
  goal = nextObjective({ ...fresh(), visited: ['bea'], player: null }, { neighbors: NEIGHBORS });
  assert.equal(goal.hint, 'Thanh is about 40 m south. Go say hello!', 'with no player at all, the fork core start is used');
  const twins = [{ id: 'celeste', name: 'Celeste', x: 0, y: 0 }, { id: 'bea', name: 'Bea', x: 0, y: 0 }];
  assert.equal(nextObjective(fresh(), { player: { x: 50, y: 0 }, neighbors: twins }).neighbor, 'bea', 'ties go to the earlier Godot neighbor');
  assert.deepEqual(nextObjective({ ...fresh(), visited: ['bea', 'celeste'] }, {}), { id: 'meet', text: 'Meet Rook (2/5 neighbors met)', hint: 'Rook is nearby. Go say hello!', target: null, neighbor: 'rook' });
  assert.equal(nextObjective({ ...fresh(), visited: ['bea', 'celeste'] }, null).hint, 'Rook is nearby. Go say hello!', 'a null world');
  assert.equal(nextObjective({ ...fresh(), visited: ['bea', 'bea', 'ghost'] }, world).text, 'Meet Thanh (1/5 neighbors met)', 'unknown and repeated ids do not count');
});

test('the opening chain: layout, mural, soundcheck, then open', () => {
  const met = changes => ({ ...fresh(), visited: [...NEIGHBOR_IDS].sort(), ...changes });
  let goal = nextObjective(met(), world);
  assert.equal(goal.id, 'layout'); assert.equal(goal.target.id, 'bea'); assert.equal(goal.neighbor, 'bea');
  assert.equal(goal.text, "Choose the gathering: Bea's Long Table or Dez & Celeste's Open Floor");
  assert.equal(goal.hint, GODOT_TEMPLATES.current_objective.layoutHint);
  goal = nextObjective(met({ layout: 'floor' }), world);
  assert.equal(goal.id, 'mural'); assert.equal(goal.text, 'Paint Sun, Wave and Rise on the mural (0/3)'); assert.equal(goal.target.id, 'mural'); assert.equal(goal.neighbor, 'celeste');
  assert.equal(goal.hint, 'The mural is about 70 m east. Add all three motifs.');
  assert.equal(nextObjective(met({ layout: 'table', mural: { sun: mural.sun, rise: mural.rise } }), world).text, 'Paint Sun, Wave and Rise on the mural (2/3)');
  assert.equal(nextObjective(met({ layout: 'table', mural, soundcheck: true, opened: false }), world).id, 'open');
  goal = nextObjective(met({ layout: 'table', mural }), { ...world, player: at('rook') });
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'soundcheck', text: 'Run a soundcheck with Rook', hint: "Rook's speaker is right here. One soundcheck and we're ready.", target: 'rook', neighbor: 'rook' });
  goal = nextObjective(met({ layout: 'table', mural, soundcheck: true }), world);
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'open', text: 'Open the block party with Bea', hint: "Everyone has met, the mural is painted, and the sound is checked. Let's open the block party!", target: 'bea', neighbor: 'bea' });
  assert.equal(nextObjective(met({ layout: 'table', soundcheck: true }), world).id, 'mural', 'the soundcheck does not skip the mural');
  assert.equal(nextObjective({ ...fresh(), layout: 'table', mural, soundcheck: true }, world).id, 'meet', 'meeting comes first');
});

test('whatsNextLine: the helper is not always the speaker, and the layout pitch follows the speaker', () => {
  const layout = nextObjective({ ...fresh(), visited: [...NEIGHBOR_IDS] }, world);
  assert.ok(whatsNextLine(layout, 'bea').startsWith('Bea: "I\'d love a Long Table'), 'Bea pitches her own Long Table in the first person');
  assert.equal(whatsNextLine(layout, 'bea'), `Bea: "${GODOT_TEMPLATES.ask_whats_next.layoutBea}"`);
  for (const [id, name] of [['dez', 'Dez'], ['celeste', 'Celeste']]) {
    assert.equal(whatsNextLine(layout, id), `${name}: "Bea wants a Long Table for stories and conversation. We'd love an Open Floor for art and music. Both keep the sidewalk clear. Your call!"`);
  }
  assert.equal(whatsNextLine(layout, 'rook'), `Rook: "${layout.hint}"`, 'anyone else gives the plain pitch');
  assert.equal(whatsNextLine(layout), layout.hint, 'nobody in reach: the bare hint');
  assert.equal(hintFor(layout, 'thanh'), layout.hint);
  const film = nextObjective(afternoon({ civic: civicDone }), world);
  assert.equal(film.neighbor, 'dez');
  assert.equal(whatsNextLine(film, 'bea'), `Bea: "${film.hint}"`, 'only the layout pitch changes per speaker');
  assert.equal(hintFor(film, 'bea'), film.hint);
  assert.equal(whatsNextLine(film, 'ghost'), film.hint);
  assert.equal(whatsNextLine(film, 'constructor'), film.hint);
  assert.equal(hintFor(null, 'bea'), '');
});

test('after opening: photo, pack and each loan in Godot order', () => {
  let goal = nextObjective(opened(), world);
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'photo', text: 'Take the group keepsake photo', hint: "Let's take a group photo by the mural. Rook would rather stay off camera.", target: 'bea', neighbor: 'bea' });
  for (const status of ['taken', 'skipped']) {
    goal = nextObjective(opened({ epilogue: { packing: false, returned: [], photo: { status } } }), world);
    assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'pack', text: 'Pack up the borrowed gear', hint: 'Time to pack up and give back what we borrowed.', target: 'thanh', neighbor: 'thanh' });
  }
  goal = nextObjective(opened({ epilogue: { packing: true, returned: [], photo: { status: 'unasked' } } }), { ...world, player: at('thanh') });
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'return', text: "Return Thanh's folding table · 0/3 returned", hint: "Next, return Thanh's folding table. Thanh is right here.", target: 'thanh', neighbor: 'thanh' });
  goal = nextObjective(opened({ epilogue: packed(['table']) }), { ...world, player: at('celeste') });
  assert.equal(goal.text, "Return Celeste's paint case · 1/3 returned"); assert.equal(goal.hint, "Next, return Celeste's paint case. Celeste is right here."); assert.equal(goal.target.id, 'celeste');
  goal = nextObjective(opened({ epilogue: packed(['paint-case', 'table']) }), world);
  assert.equal(goal.text, "Return Rook's speaker · 2/3 returned"); assert.equal(goal.neighbor, 'rook');
  assert.equal(nextObjective(opened({ epilogue: packed(['speaker']) }), world).text, "Return Thanh's folding table · 1/3 returned", 'the first unreturned loan is next');
});

test('after the loans: programme, hosting, civic, film, then the history stops and the neighborhood', () => {
  const ready = opened({ epilogue: packed() }), published = { order: [...order], published: [...order] };
  let goal = nextObjective(ready, world);
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'programme', text: 'Plan the party schedule with Bea', hint: "Let's line up the afternoon: stories, rhythm, shared art, and a quiet pause.", target: 'bea', neighbor: 'bea' });
  assert.equal(nextObjective({ ...ready, programme: { order: ['beats'], published: [] } }, world).text, 'Plan the party schedule with Bea');
  assert.equal(nextObjective({ ...ready, programme: published }, world).text, 'Start hosting the afternoon');
  assert.equal(nextObjective({ ...ready, programme: published, hosting: hosted(0) }, world).text, 'Host the next activity: Story circle · 0/4');
  assert.equal(nextObjective({ ...ready, programme: published, hosting: hosted(2) }, world).text, 'Host the next activity: Quiet interval · 2/4');
  assert.equal(nextObjective({ ...ready, programme: published, hosting: hosted(3) }, world).text, 'Host the next activity: Shared art panel · 3/4');
  assert.equal(nextObjective(opened({ programme: published, hosting: hosted() }), world).id, 'photo', 'the epilogue still comes first');
  goal = nextObjective(afternoon(), world);
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'civic', text: 'Hold the tenant listening circle', hint: "Let's hold a peaceful tenant listening circle so every neighbor is heard.", target: 'bea', neighbor: 'bea' });
  goal = nextObjective(afternoon({ civic: civicDone }), world);
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'film', text: 'Make the short film The Open Seat', hint: 'Celeste and I want to make a little three-shot film. Want to help?', target: 'dez', neighbor: 'dez' });
  const filmed = afternoon({ civic: civicDone, film: filmDone });
  goal = nextObjective(filmed, { ...world, player: world.places.history });
  assert.deepEqual({ ...goal, target: goal.target.id }, { id: 'comptons', text: "Read the Compton's Cafeteria plaque at Turk & Taylor", hint: "The Compton's Cafeteria plaque at Turk & Taylor is right here.", target: 'history', neighbor: null });
  goal = nextObjective({ ...filmed, history: true }, world);
  assert.equal(goal.id, 'blackhawk'); assert.equal(goal.text, 'Visit the former Black Hawk jazz club at Turk & Hyde'); assert.equal(goal.target, world.places.blackhawk); assert.equal(goal.neighbor, null);
  assert.match(goal.hint, /^The Black Hawk site at Turk & Hyde is about \d+ blocks west\.$/);
  assert.equal(nextObjective({ ...filmed, blackhawk: true }, world).id, 'comptons', 'Compton\'s comes before Black Hawk');
  assert.equal(nextObjective({ ...afternoon({ civic: civicDone, film: filmDone }), history: true }, { places: PLACES }).target.id, 'blackhawk', 'places may be an array');
  assert.equal(nextObjective({ ...afternoon(), history: true, blackhawk: true }, world).id, 'civic', 'history stops never skip the afternoon projects');
  // Godot's chapter 6 tail: the next surprise, then the landmark tour, then the final line (current_objective).
  const done = { ...filmed, history: true, blackhawk: true }, site = SURPRISE_SITES.jeffrey_record;
  goal = nextObjective(done, world);
  assert.deepEqual({ ...goal, speakerHints: Object.keys(goal.speakerHints) }, {
    id: 'explore', text: "Spot Jeffrey's Lost 1961 Record (0/10 surprises) · Museum",
    hint: "Take your time. Spot the 10 neighborhood surprises (0/10 found)—next is Jeffrey's Lost 1961 Record (about 3 blocks west at 361 Turk St sidewalk (beside the 'So What' awning))—or try the museum's Time-Portal on Eddy and the eateries along Turk.",
    target: { id: 'surprise:jeffrey_record', kind: 'visit', name: "Jeffrey's Lost 1961 Record", x: site.x, y: site.y }, neighbor: null,
    surpriseId: 'jeffrey_record', tourId: '', tourAction: '', speakerHints: NEIGHBOR_IDS,
  });
  assert.equal(nextObjective(done, { ...world, openNeighborId: 'dez' }).surpriseId, 'viking_dirt_biker', "the open neighbor's pair first");
  assert.equal(nextObjective(done, { ...world, lastHinted: 'cutesy_dino' }).target.id, 'surprise:cutesy_dino', 'then the last hint');
  assert.equal(nextObjective({ ...done, surprises: ['jeffrey_record'] }, world).text, 'Spot The Hidden Mural at 145 Leavenworth (1/10 surprises) · Museum');
  const all = [...SURPRISE_IDS].sort();
  assert.deepEqual(nextObjective({ ...done, surprises: all }, world), {
    id: 'explore', text: 'Tour 0/12 this session: Museum: Present Day',
    hint: 'All 10 keepsakes are yours! Optional tour: Museum: Present Day, about 2 blocks west. 0/12 stops this session; tour progress starts fresh on reload. Ask a neighbor to show you the stop, or follow the gold marker.',
    target: { id: 'tour:museum:0', kind: 'visit', name: 'Museum: Present Day', x: MUSEUM.x, y: MUSEUM.y }, neighbor: null,
    surpriseId: '', tourId: 'museum:0', tourAction: 'Visit the Museum', speakerHints: null,
  });
  const toured = { ...initialTour(), eras: [...MAIN.TOUR_MUSEUM_ERAS], park: true, soWhat: true, orders: Object.fromEntries(MAIN.NEIGHBORHOOD_EATERIES.map(e => [e.id, 1])) };
  assert.deepEqual(nextObjective({ ...done, surprises: all }, { ...world, tour: toured }), {
    id: 'explore', text: 'All 10 keepsakes found! Tour 12/12 this session complete!',
    hint: "You've visited all 12 tour stops this session and found every keepsake! Wander freely, revisit the museum, or switch to evening lights. The optional tour starts fresh on reload.",
    target: null, neighbor: null, surpriseId: '', tourId: '', tourAction: '', speakerHints: null,
  });
});

test('every objective id is reachable and no output names a key hint or a place 2D lacks', () => {
  const goals = SAMPLES.map(s => nextObjective(s, world));
  assert.deepEqual(goals.map(g => g.id), OBJECTIVE_IDS);
  // Chapter 6's tour and final line too, and the surprise hunt with a pair half found.
  const done = SAMPLES.at(-1), toured = { ...initialTour(), eras: [...MAIN.TOUR_MUSEUM_ERAS], park: true, soWhat: true, orders: Object.fromEntries(MAIN.NEIGHBORHOOD_EATERIES.map(e => [e.id, 1])) };
  const more = [[{ ...done, surprises: ['cutesy_dino', 'hidden_mural_145'] }, world], [{ ...done, surprises: [...SURPRISE_IDS] }, world], [{ ...done, surprises: [...SURPRISE_IDS] }, { ...world, tour: toured }]];
  for (const [i, [state, w]] of [...SAMPLES.map(s => [s, world]), ...more].entries()) {
    const goal = nextObjective(state, w), speakers = [null, ...NEIGHBOR_IDS].map(id => whatsNextLine(goal, id));
    for (const text of [goal.text, goal.hint, ...speakers, chapterLine(state, { world: w }), chapterLine(state, { narrow: true, world: w })]) {
      assert.ok(!SHORTCUT.test(text), `${i}: ${text}`);
      assert.ok(!/easel/i.test(text), `${i}: ${text}`);
      assert.ok(!/%[sd]/.test(text), `${i}: ${text}`);
    }
  }
});

test('an active story episode is the objective over every chapter, as in current_objective', () => {
  inOrder(codeLines(funcBody('current_objective')), [
    'if voting_story != null and voting_story.active: return voting_story.objective()', 'if lantern_procession != null and lantern_procession.active: return lantern_procession.objective()',
    'if dog_story != null and dog_story.active: return dog_story.objective()', 'if power_story != null and power_story.active: return power_story.objective()',
    'var p := player_xz() if player != null else Vector2(PLAYER_START.x, PLAYER_START.z)',
  ], 'current_objective');
  const ctx = { opened: true, player: { ...world.player }, powerPlace: null, voting: null };
  let stories = picker.changeEpisode(picker.initialStories(), 'dogs', { type: 'open' }, ctx).stories;
  stories = picker.changeEpisode(stories, 'dogs', { type: 'begin' }, ctx).stories;
  const choosing = picker.activeObjective(stories, ctx);
  stories = picker.changeEpisode(stories, 'dogs', { type: 'lead', index: 1 }, ctx).stories;
  const lead = picker.activeObjective(stories, ctx);
  assert.deepEqual([choosing.hasTarget, lead.hasTarget], [false, true]);
  for (const state of SAMPLES) {
    assert.deepEqual(nextObjective(state, { ...world, episode: lead }), { id: 'dog_story', text: lead.text, hint: lead.hint, target: { id: 'episode', kind: 'visit', name: lead.targetName, x: lead.target.x, y: lead.target.y }, neighbor: null });
    assert.deepEqual(nextObjective(state, { ...world, episode: choosing }), { id: 'dog_story', text: choosing.text, hint: choosing.hint, target: null, neighbor: null });
  }
  assert.equal(chapterLine(SAMPLES[0], { world: { ...world, episode: lead } }), `Chapter 1: Get the Block Ready · Next: ${lead.text}`);
  assert.equal(whatsNextLine(nextObjective(SAMPLES.at(-1), { ...world, episode: lead }), 'bea'), `Bea: "${lead.hint}"`, 'an episode hint is said plainly');
  assert.equal(nextObjective(SAMPLES[0], { ...world, episode: null }).id, 'meet', 'no episode, the chapter objective');
  assert.throws(() => nextObjective({ block_opened: true }, { episode: lead }), { name: 'TypeError' }, 'an envelope is still refused');
});

test('explore: each neighbor names the next surprise of their own pair, then the next one anywhere (ask_whats_next)', () => {
  const done = SAMPLES.at(-1);
  let goal = nextObjective(done, world);
  assert.deepEqual(Object.keys(goal.speakerHints), NEIGHBOR_IDS);
  for (const id of NEIGHBOR_IDS) assert.deepEqual(goal.speakerHints[id], neighborHint([], id, { player: world.player, compass: compassPhrase }), id);
  assert.deepEqual(goal.speakerHints.celeste, { hint: 'Have you spotted The Hidden Mural at 145 Leavenworth yet? Look about 2 blocks west at 145 Leavenworth St frontage (below the 8th-floor bay) (0/10 surprises found).', lastHinted: 'hidden_mural_145' });
  assert.equal(whatsNextLine(goal, 'celeste'), `Celeste: "${goal.speakerHints.celeste.hint}"`);
  assert.equal(hintFor(goal, 'rook'), goal.speakerHints.rook.hint);
  goal = nextObjective({ ...done, surprises: ['cutesy_dino', 'hidden_mural_145'] }, world);
  assert.equal(whatsNextLine(goal, 'celeste'), `Celeste: "You found both of my favorite block surprises! Next, check out Jeffrey's Lost 1961 Record about 3 blocks west at 361 Turk St sidewalk (beside the 'So What' awning) (2/10 found)."`);
  assert.equal(goal.speakerHints.celeste.lastHinted, 'jeffrey_record');
  for (const speaker of [null, undefined, 'ghost', 'constructor', '__proto__']) assert.equal(hintFor(goal, speaker), goal.hint, String(speaker));
  assert.equal(whatsNextLine(goal), goal.hint);
  // All ten found: no pair hint is left, so every neighbor gives the tour hint (Godot clears last_hinted_surprise_id).
  const tour = nextObjective({ ...done, surprises: [...SURPRISE_IDS] }, world);
  assert.equal(tour.speakerHints, null);
  for (const id of NEIGHBOR_IDS) assert.equal(hintFor(tour, id), tour.hint, id);
  assert.equal(hintFor({ id: 'film', hint: 'Film hint', speakerHints: { bea: { hint: 'not this' } } }, 'bea'), 'Film hint', 'only explore reads speaker hints');
});

test('FORK_TEXT keeps only the compass fallback: chapter 6 is Godot\'s now', () => {
  assert.deepEqual(FORK_TEXT, { nearby: 'nearby' });
});

test('compassPhrase uses the fork core.js map frame and keeps Godot\'s distance bands', () => {
  const metre = 1 / 111320, east = Math.cos(ORIGIN.lat * Math.PI / 180);
  const from = project(ORIGIN), to = (e, n) => project({ lat: ORIGIN.lat + n * metre, lon: ORIGIN.lon + e * metre / east });
  const bearing = deg => to(50 * Math.cos(deg * Math.PI / 180), 50 * Math.sin(deg * Math.PI / 180));
  assert.equal(compassPhrase(from, to(3, 4)), 'right here');
  assert.equal(compassPhrase(from, to(50, 0)), 'about 50 m east');
  assert.equal(compassPhrase(from, to(0, 64)), 'about 60 m north');
  assert.equal(compassPhrase(from, to(40, 40)), 'about 60 m northeast');
  assert.equal(compassPhrase(from, to(-60, -60)), 'about 80 m southwest');
  assert.equal(compassPhrase(from, to(96, 0)), 'about 100 m east');
  assert.equal(compassPhrase(from, to(101, 0)), 'about a block east');
  assert.equal(compassPhrase(from, to(-150, 0)), 'about a block west');
  assert.equal(compassPhrase(from, to(0, 300)), 'about 2 blocks north');
  assert.equal(compassPhrase(from, to(0, -500)), 'about 3 blocks south');
  assert.equal(compassPhrase(from, to(120, -120)), 'about a block southeast');
  assert.equal(compassPhrase(from, to(-160, 160)), 'about 2 blocks northwest');
  // Bearings a few degrees from each sector edge: the 9.13 degree map rotation, dropped or flipped, moves them.
  const edges = { 15: 'east', 20: 'east', 25: 'northeast', 30: 'northeast', 65: 'northeast', 70: 'north', 110: 'north', 115: 'northwest', 200: 'west', 205: 'southwest', 290: 'south', 295: 'southeast' };
  for (const [deg, dir] of Object.entries(edges)) assert.equal(compassPhrase(from, bearing(Number(deg))), `about 50 m ${dir}`, `${deg} degrees`);
  const shift = { x: 400, y: -120 };
  assert.equal(compassPhrase(shift, { x: shift.x + bearing(70).x, y: shift.y + bearing(70).y }), 'about 50 m north', 'only the offset counts');
  assert.equal(fmt('%s · %d/%d', 'a', 2.9, 4), 'a · 2/4');
});

test('compassPhrase and the helpers take bad input without throwing or printing NaN', () => {
  for (const [a, b] of [[{ x: 0, y: 0 }, { x: NaN, y: 0 }], [{ x: 0, y: 0 }, { x: 0, y: Infinity }], [{ x: '1', y: 2 }, { x: 0, y: 0 }], [null, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, undefined], [{ x: -1e308, y: 0 }, { x: 1e308, y: 0 }]]) {
    assert.equal(compassPhrase(a, b), FORK_TEXT.nearby, JSON.stringify([a, b]));
  }
  assert.equal(nextObjective(fresh(), { ...world, neighbors: [{ id: 'bea', name: 'Bea', x: NaN, y: 0 }] }).hint, 'Bea is nearby. Go say hello!');
});

test('exports do not shadow fork core.js or programme.js names', () => {
  assert.equal(segmentTitle('stories'), 'Story circle');
  assert.equal(segmentTitle('pause'), 'Quiet interval');
  assert.equal(segmentTitle('picnic'), 'picnic');
  assert.equal(segmentTitle('constructor'), 'constructor');
  assert.equal(story.programmeTitle, undefined, 'programme.js programmeTitle(order) is the poster headline');
  assert.equal(story.PIXELS_PER_METRE, undefined, 'core.js owns the map scale');
});
