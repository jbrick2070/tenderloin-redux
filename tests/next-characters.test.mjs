import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState } from '../browser-next/core.js';
import { SURPRISE_IDS } from '../browser-next/godot-save.js';
import { NEIGHBORS } from '../browser-next/world.js';
import { PROGRAMME_TITLES, LOAN_TITLES, nextObjective } from '../browser-next/story.js';
import { filmResponse, FILM_SHOTS } from '../browser-next/film.js';
import { civicResponse } from '../browser-next/civic.js';
import { STORY_CHOICES, QUIET_CHOICES } from '../browser-next/hosting.js';
import * as C from '../browser-next/characters.js';
import * as H from '../browser-next/hosted-text.js';
import * as B from '../browser-next/bubble.js';

// --- Godot sources are read at test time, so a Godot text or logic change fails here. ---
const read = name => readFileSync(new URL(`../godot/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const SRC = Object.fromEntries(['main.gd', 'bea_invitation.gd', 'quiet_seats.gd', 'loan_homecoming.gd', 'hosted_afternoon.gd', 'mural_stories.gd'].map(n => [n, read(n)]));
const gd = SRC['main.gd'];
function balanced(text, start) {
  let depth = 0, quoted = '';
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '\\') i++; else if (ch === quoted) quoted = ''; continue; }
    if (ch === '"') quoted = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if ((ch === ']' || ch === '}') && --depth === 0) return text.slice(start, i + 1);
  }
  throw Error('Unbalanced literal');
}
// const NAME: T = [...] in main.gd, or const NAME := {...} in the helper scripts.
function declared(name, file = 'main.gd', kind = 'const') {
  const src = SRC[file], m = new RegExp(`^${kind} ${name}(?:: [^=\\n]+)? :?= (?=[\\[{])`, 'm').exec(src);
  assert.ok(m, `${kind} ${name} is missing from godot/${file}`);
  return balanced(src, m.index + m[0].length);
}
const godotConst = (name, file) => JSON.parse(declared(name, file));
function funcBody(name, file = 'main.gd') {
  const src = SRC[file], start = src.search(new RegExp(`^(?:static )?func ${name}\\(`, 'm'));
  assert.ok(start >= 0, `func ${name} is missing from godot/${file}`);
  const end = src.slice(start + 1).search(/^(?:static )?func /m);
  return src.slice(start, end < 0 ? src.length : start + 1 + end);
}
// Every string literal in order, double- or single-quoted, skipping comments.
function literals(body) {
  const out = [];
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '#') { const nl = body.indexOf('\n', i); i = nl < 0 ? body.length : nl; continue; }
    if (ch !== '"' && ch !== "'") continue;
    let j = i + 1, s = '';
    while (j < body.length && body[j] !== ch) {
      if (body[j] === '\\') { s += ({ n: '\n', t: '\t' })[body[j + 1]] ?? body[j + 1]; j += 2; } else s += body[j++];
    }
    out.push(s); i = j;
  }
  return out;
}
const codeLines = body => body.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
function inOrder(lines, expected, label) {
  let at = -1;
  for (const want of expected) {
    const i = lines.findIndex((line, j) => j > at && line === want);
    assert.ok(i > at, `${label} moved or changed: ${want}`);
    at = i;
  }
}
const has = (body, values, label) => { const found = new Set(literals(body)); for (const v of values) assert.ok(found.has(v), `${label} drifted: ${JSON.stringify(v)}`); };
// A GDScript double-quoted literal as it is written in the source.
const q = s => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const arrays = (body, opener) => [...body.matchAll(opener)].map(m => literals(balanced(body, m.index + m[0].length - 1)));
const OVERRIDE_TRIGGER = /Shift\+D|Shift Motif|press T\b|\s\((?:[A-Z]|F\d+|\.)\)|Pack Borrowed Gear/;
const strings = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

// --- Fork fixtures. ---
const base = () => initialState();
const extras = (surprises = [], muralScenes = {}) => C.godotExtras({ discovered_surprises: surprises, mural_scenes: muralScenes });
const NONE = extras();
const withMural = (s, placements = { sun: { col: 0, row: 0 }, wave: { col: 2, row: 1 }, rise: { col: 4, row: 2 } }) => ({ ...s, mural: placements });
const opened = (layout = 'table') => ({ ...withMural(base()), visited: ['bea', 'celeste', 'dez', 'rook', 'thanh'], greeted: true, soundcheck: true, layout, opened: true });
const hosted = (results = [['stories', 'memory'], ['beats', 85], ['art', { tiles: [0, 1, 2, 2, 1, 0], palette: 'warm' }], ['pause', 'arc']], order = ['stories', 'beats', 'art', 'pause']) => {
  const s = opened();
  s.epilogue = { packing: true, returned: ['table', 'paint-case', 'speaker'], photo: { status: 'taken', participants: ['bea'] } };
  s.programme = { order: [...order], published: [...order] };
  s.hosting = { order: [...order], results: results.map(([id, value]) => ({ id, value })), draft: { story: 'memory', pattern: 85, tiles: [0, 1, 2, 2, 1, 0], palette: 'warm', quiet: 'arc' } };
  return s;
};
const talkAt = (id, n) => ({ ...C.freshTalk(), [id]: n });

test('drift: neighbor data, badges, surprise pairs, stems and mural scene names', () => {
  assert.deepEqual(C.NEIGHBOR_BADGES, godotConst('NEIGHBOR_STORY_BADGES'));
  assert.deepEqual(C.NEIGHBOR_SURPRISE_PAIRS, godotConst('NEIGHBOR_SURPRISE_PAIRS'));
  assert.deepEqual(SURPRISE_IDS, godotConst('NEIGHBORHOOD_SURPRISE_IDS'));
  assert.deepEqual(C.STEM_ORDER, godotConst('MUSIC_STEM_ORDER'));
  const re = /\{"id": "([^"]+)", "name": "([^"]+)", "role": "([^"]+)", "pos": Vector3\(([-\d.]+), [-\d.]+, ([-\d.]+)\), "coat": Color\("(\w+)"\), "skin": Color\("(\w+)"\), "hair": Color\("(\w+)"\)\}/g;
  const people = [...declared('neighbors', 'main.gd', 'var').matchAll(re)];
  assert.equal(people.length, 5);
  assert.deepEqual(C.CHARACTER_PEOPLE, people.map(m => ({ id: m[1], name: m[2], role: m[3], coat: `#${m[6]}`, skin: `#${m[7]}`, hair: `#${m[8]}` })));
  assert.deepEqual(NEIGHBORS.map(({ id, name, role, coat, skin, hair }) => ({ id, name, role, coat, skin, hair })), C.CHARACTER_PEOPLE);
  assert.deepEqual(C.MURAL_SCENE_IDS, godotConst('IDS', 'mural_stories.gd'));
  assert.deepEqual(C.MURAL_SCENE_SLOTS, godotConst('SLOTS', 'mural_stories.gd'));
  assert.deepEqual(C.MURAL_SCENE_NAMES, godotConst('NAMES', 'mural_stories.gd'));
  inOrder(codeLines(funcBody('clean', 'mural_stories.gd')), ['var out := {}', 'if not raw is Dictionary: return out', 'for slot in SLOTS:', 'var id: Variant = raw.get(slot, "")', 'if id is String and id in IDS and not id in out.values(): out[slot] = id', 'return out'], 'mural_stories.gd clean');
  // Bea's Boeddeker line: Godot's compass_phrase from Bea's spot, recomputed here.
  const bea = people[0], park = /^const BOEDDEKER_PARK_ENTRANCE := Vector2\(([-\d.]+), ([-\d.]+)\)/m.exec(gd);
  const dx = Number(park[1]) - Number(bea[4]), dz = Number(park[2]) - Number(bea[5]), dist = Math.hypot(dx, dz);
  const sectors = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
  const dir = sectors[((Math.round(Math.atan2(-dz, dx) / (Math.PI / 4)) % 8) + 8) % 8], blocks = Math.round(dist / 145);
  assert.ok(dist >= 100);
  assert.equal(blocks <= 1 ? `about a block ${dir}` : `about ${blocks} blocks ${dir}`, C.BOEDDEKER_FROM_BEA);
  inOrder(codeLines(funcBody('compass_phrase')), ['var d := to_xz - from_xz', 'var dist := d.length()', 'var dir: String = sectors[posmod(int(round(atan2(-d.y, d.x) / (PI / 4.0))), 8)]', 'var blocks := int(round(dist / 145.0))', 'return "about a block %s" % dir if blocks <= 1 else "about %d blocks %s" % [blocks, dir]'], 'compass_phrase');
});

test('drift: neighbor_lines, the greeting slot rules and the mural replies', () => {
  const body = funcBody('neighbor_lines'), parts = body.split(/^\t\t"(bea|dez|thanh)":\n/m);
  assert.deepEqual([parts[1], parts[3], parts[5]], ['bea', 'dez', 'thanh']);
  for (const [i, id] of ['bea', 'dez', 'thanh'].entries()) {
    const chunk = parts[2 + i * 2];
    assert.equal(codeLines(chunk)[0], 'if block_opened:', `${id} opens with the chapter test`);
    assert.deepEqual(arrays(chunk, /return \[/g).filter(a => a.length), [C.NEIGHBOR_LINES[id].open, C.NEIGHBOR_LINES[id].before], `${id} lines`);
  }
  assert.ok(body.includes(`${q(C.NEIGHBOR_LINES.bea.before[3])} % compass_phrase(neighbor_xz(0), BOEDDEKER_PARK_ENTRANCE),`));
  assert.equal(codeLines(body).at(-1), 'return []');
  assert.deepEqual(codeLines(funcBody('neighbor_greeting_line')).slice(1), [
    'var options := neighbor_lines(n_id)',
    'var memory := layout_memory_line(n_id) if block_opened else ""',
    'if not memory.is_empty() and options.size() >= 4:',
    'options[3] = memory',
    'var surp_mem := neighbor_surprise_memory_line(n_id)',
    'if not surp_mem.is_empty() and options.size() >= 5:',
    'var speaker_name := n_id.capitalize()',
    'for nb in neighbors:',
    'if String(nb.get("id", "")) == n_id:',
    'speaker_name = String(nb.get("name", speaker_name))',
    'break',
    'options[4] = "%s: \\"%s\\"" % [speaker_name, surp_mem.trim_prefix("“").trim_suffix("”")]',
    'if options.is_empty():',
    `return ${q(C.PANEL_TEXT.fallback)}`,
    'var line := options[posmod(maxi(1, int(neighbor_talk_counts.get(n_id, 1))) - 1, options.size())]',
    'var art_reply := mural_neighbor_reply(n_id)',
    'return line.left(-1)+art_reply+\'"\' if not art_reply.is_empty() and line.ends_with(\'"\') else line+art_reply',
  ]);
  assert.deepEqual(codeLines(funcBody('mural_neighbor_reply')).slice(1), [
    `if n_id == "dez" and ${q(C.MURAL_REPLY.dez.scene)} in mural_scenes.values():`, `return ${q(C.MURAL_REPLY.dez.text)}`,
    `if n_id == "thanh" and ${q(C.MURAL_REPLY.thanh.scene)} in mural_scenes.values():`, `return ${q(C.MURAL_REPLY.thanh.text)}`,
    'return ""',
  ]);
  assert.deepEqual(Object.keys(C.MURAL_REPLY), ['dez', 'thanh']);
  inOrder(codeLines(funcBody('talk_with_neighbor')), ['if index == celeste_index:', 'return talk_with_celeste()', 'if index == rook_index:', 'return check_sound_with_rook()', 'var turn_cnt := int(neighbor_talk_counts.get(n_id, 0)) + 1', 'neighbor_talk_counts[n_id] = turn_cnt'], 'talk_with_neighbor');
  inOrder(codeLines(funcBody('finish_neighbor_arrival')), ['if not n_id.is_empty() and int(neighbor_talk_counts.get(n_id, 0)) == 0:', 'neighbor_talk_counts[n_id] = 1', 'if celeste_talk_count == 0:', 'celeste_talk_count = 1'], 'finish_neighbor_arrival');
});

test('drift: Celeste and Rook lines, their slot rules and the stem summary', () => {
  const cel = funcBody('celeste_dialogue_text');
  assert.deepEqual(arrays(cel, /: Array\[String\] = \[/g), [C.CELESTE_LINES.completed, C.CELESTE_LINES.before]);
  inOrder(codeLines(cel), [
    'var c_surp := neighbor_surprise_memory_line(CELESTE_ID)', 'if mural_completed:', '"Celeste: \\"%s\\"" % mural_composition_reply(),',
    'var c_lay_mem := layout_memory_line(CELESTE_ID) if block_opened else ""', 'if not c_lay_mem.is_empty():', 'completed_options[3] = c_lay_mem',
    'if not c_surp.is_empty():', 'completed_options[4] = "Celeste: \\"%s\\"" % c_surp.trim_prefix("“").trim_suffix("”")',
    'return completed_options[posmod(maxi(1, celeste_talk_count) - 1, completed_options.size())]',
    'if not c_surp.is_empty():', 'options[4] = "Celeste: \\"%s\\"" % c_surp.trim_prefix("“").trim_suffix("”")',
    'return options[posmod(maxi(1, celeste_talk_count) - 1, options.size())]',
  ], 'celeste_dialogue_text');
  const rook = funcBody('rook_dialogue_text');
  assert.deepEqual(arrays(rook, /: Array\[String\] = \[/g), [C.ROOK_LINES.completed, C.ROOK_LINES.before]);
  inOrder(codeLines(rook), [
    'if music_mode == "local" and not local_music_name.is_empty():', `return ${q(C.ROOK_LINES.local)} % local_music_name`,
    'var r_surp := neighbor_surprise_memory_line(ROOK_ID)', 'if mural_completed:',
    'var r_lay_mem := layout_memory_line(ROOK_ID) if block_opened else ""', 'completed_options[3] = r_lay_mem',
    'completed_options[4] = "Rook: \\"%s\\"" % r_surp.trim_prefix("“").trim_suffix("”")',
    'return completed_options[posmod(maxi(1, rook_talk_count) - 1, completed_options.size())]',
    `${q(C.ROOK_LINES.before[0])} % active_stem_summary(),`,
    'options[4] = "Rook: \\"%s\\"" % r_surp.trim_prefix("“").trim_suffix("”")',
    'return options[posmod(maxi(1, rook_talk_count) - 1, options.size())]',
  ], 'rook_dialogue_text');
  assert.deepEqual(codeLines(funcBody('active_stem_summary')).slice(1), ['var stems := unlocked_stems()', `return ${q(C.PANEL_TEXT.stems)} % ["+".join(stems), stems.size(), MUSIC_STEM_ORDER.size()]`]);
  assert.deepEqual(codeLines(funcBody('recompute_music_stems')).slice(1, 9).map(line => line.replace(/ # .*$/, '')), [
    'var mask := 1', 'if visited_neighbors.size() >= 1 or celeste_talk_count > 0 or rook_soundcheck_done:', 'mask |= 2',
    'if mural_placements.size() >= 1 or celeste_talk_count > 0:', 'mask |= 4', 'if mural_completed or rook_soundcheck_done:', 'mask |= 8', 'unlocked_stem_mask = mask',
  ]);
  assert.ok(/^\tmural_completed = mural_placements\.size\(\) == MURAL_MOTIFS\.size\(\)$/m.test(gd));
});

test('drift: layout, surprise and project memories, the tail rule and the composition reply', () => {
  const lay = codeLines(funcBody('layout_memory_line'));
  inOrder(lay, ['if not (gathering_layout in GATHERING_LAYOUTS):', 'return ""', 'var table := gathering_layout == "table"'], 'layout_memory_line');
  for (const id of ['bea', 'celeste', 'rook', 'dez', 'thanh']) inOrder(lay, [`"${id}":`, `return ${q(C.LAYOUT_MEMORY[id].table)} if table else ${q(C.LAYOUT_MEMORY[id].floor)}`], `layout_memory_line ${id}`);
  assert.deepEqual(Object.keys(C.LAYOUT_MEMORY), ['bea', 'celeste', 'rook', 'dez', 'thanh']);
  const surp = codeLines(funcBody('neighbor_surprise_memory_line'));
  for (const id of ['bea', 'celeste', 'rook', 'dez', 'thanh']) {
    const [a, b] = C.NEIGHBOR_SURPRISE_PAIRS[id], m = C.SURPRISE_MEMORY[id];
    inOrder(surp, [`"${id}":`, `if discovered_surprises.has("${a}") and discovered_surprises.has("${b}"):`, `return ${q(m.both)}`, `if discovered_surprises.has("${a}"):`, `return ${q(m.first)}`, `if discovered_surprises.has("${b}"):`, `return ${q(m.second)}`], `surprise memory ${id}`);
  }
  assert.equal(literals(funcBody('neighbor_surprise_memory_line')).length, 5 * (1 + 4 + 3) + 1);
  const F = C.PROJECT_MEMORY.film, V = C.PROJECT_MEMORY.civic, S = C.PROJECT_MEMORY.stories, P = C.PROJECT_MEMORY.pause;
  assert.deepEqual(codeLines(funcBody('neighbor_project_memory_line')).slice(1), [
    'var surp_mem := neighbor_surprise_memory_line(neighbor_id)', 'var base_mem := ""',
    'if film_phase == "done" and is_valid_film_plan(film_result):', 'var ord: Array = film_result.get("order", FILM_SHOTS)',
    'var last_shot := film_shot_title(String(ord[2]) if ord.size() >= 3 else "welcome").to_lower()',
    'var framing := String(film_result.get("framing", "close"))', 'var plan := String(film_result.get("plan", "quiet"))', 'match neighbor_id:',
    '"rook":', `base_mem = ${q(F.rook)}`, '"celeste":', `base_mem = ${q(F.celesteWide)} if framing == "wide" else ${q(F.celesteClose)}`,
    '"thanh":', `base_mem = ${q(F.thanh)}`, '"bea":', `base_mem = ${q(F.beaLater)} if plan == "later" else ${q(F.beaQuiet)}`, '"dez":', `base_mem = ${q(F.dez)} % last_shot`,
    'elif civic_phase == "done" and is_valid_civic_plan(civic_result):', 'var topic := String(civic_result.get("topic", "repairs"))',
    'var fmt := String(civic_result.get("format", "circle"))', 'var notes := String(civic_result.get("notes", "themes"))', 'match neighbor_id:',
    '"bea":', `base_mem = ${q(V.beaRepairs)} if topic == "repairs" else ${q(V.beaAccess)}`, '"thanh":', `base_mem = ${q(V.thanhDropin)} if fmt == "dropin" else ${q(V.thanhCircle)}`,
    '"celeste":', `base_mem = ${q(V.celesteThemes)} if notes == "themes" else ${q(V.celesteNone)}`, '"rook":', `base_mem = ${q(V.rook)}`, '"dez":', `base_mem = ${q(V.dez)}`,
    'if base_mem.is_empty() and neighbor_id=="bea" and has_hosted_segment("stories"):', `base_mem = ${q(S.memory)} if get_hosted_segment_value("stories")=="memory" else ${q(S.future)}`,
    'if base_mem.is_empty() and neighbor_id=="thanh" and has_hosted_segment("pause"):', `base_mem = ${q(P.arc)} if get_hosted_segment_value("pause")=="arc" else ${q(P.pairs)}`,
    'if base_mem.is_empty() and loan_homecoming != null: base_mem=loan_homecoming.memory(neighbor_id)',
    'if not base_mem.is_empty() and not surp_mem.is_empty():', `return ${q(C.PANEL_TEXT.spokenJoin)} % [base_mem, surp_mem]`, 'return base_mem if not base_mem.is_empty() else surp_mem',
  ]);
  assert.deepEqual(codeLines(funcBody('neighbor_memory_tail')).slice(1), [
    'var surp_only := neighbor_surprise_memory_line(n_id)', 'var full_mem := neighbor_project_memory_line(n_id)', 'if full_mem.is_empty():', 'return ""',
    'var clean_surp := surp_only.trim_prefix("“").trim_suffix("”")', 'if not clean_surp.is_empty() and spoken_line.contains(clean_surp):',
    'return full_mem.trim_suffix(" · " + surp_only) if full_mem != surp_only else ""', 'if not surp_only.is_empty() and full_mem != surp_only:',
    'var base_only := full_mem.trim_suffix(" · " + surp_only)', 'return surp_only if (maxi(1, turn_count) % 2 == 0) else base_only', 'return full_mem',
  ]);
  const K = C.COMPOSITION;
  assert.deepEqual(literals(funcBody('mural_composition_reply')), [K.incomplete, K.horizon, K.sunAbove, K.waveAbove, K.riseLeft, K.riseRight, K.riseLinks, K.close, ' ', '']);
  inOrder(codeLines(funcBody('mural_composition_reply')), ['if mural_placements.size() < 3:', 'if int(sun.row) < int(wave.row):', 'elif int(sun.row) > int(wave.row):', 'if int(rise.col) < mini(int(sun.col),int(wave.col)):', 'elif int(rise.col) > maxi(int(sun.col),int(wave.col)):', 'else:'], 'mural_composition_reply');
  assert.deepEqual(literals(funcBody('mural_scene_reply')), [K.noScenes, 'left', 'right', K.scene, 'res://mural_stories.gd', ', ', K.scenesClose]);
});

test('drift: spark_count, panel headers and details, buttons, captions and the hub labels', () => {
  assert.deepEqual(codeLines(funcBody('spark_count')).slice(1), [
    'var count := visited_neighbors.size() + mural_placements.size() + discovered_surprises.size()', 'if rook_soundcheck_done:', 'count += 1',
    'if gathering_layout in GATHERING_LAYOUTS:', 'count += 1', 'if block_opened:', 'count += 2', 'if String(keepsake_photo.get("status", "unasked")) == "taken":', 'count += 1',
    'count += epilogue_returned.size()', 'count += hosting_results.size()', 'if civic_phase == "done":', 'count += 1', 'if film_phase == "done":', 'count += 1',
    'if history_read:', 'count += 1', 'if blackhawk_discovered:', 'count += 1', 'return count',
  ]);
  const P = C.PANEL_TEXT, Bt = C.BUTTON_TEXT;
  has(funcBody('update_block_ui'), [P.header, P.headerNarrow, P.openTag, P.readyTag, P.prepareTag, P.muralReady, P.muralCount, P.detail, P.spokenJoin, ...Object.values(C.HUB_LABELS)], 'update_block_ui');
  inOrder(codeLines(funcBody('update_block_ui')), ['var n_turn := posmod(maxi(1, int(neighbor_talk_counts.get(n_id, 1))) - 1, 5) + 1', 'if not last_panel_dialogue.is_empty():', 'base_detail = last_panel_dialogue', 'if is_narrow_layout():', 'base_detail = spoken'], 'update_block_ui');
  has(funcBody('update_mural_ui'), [P.celesteHeader, P.celesteNarrow, P.easelComplete, P.easelCount, P.celesteNarrowSpoken, P.spokenJoin], 'update_mural_ui');
  has(funcBody('update_music_ui'), [P.rookHeader, P.rookNarrow, P.playing, P.paused, P.sketch, P.local, P.scReady, P.scPending, P.rookNarrowSpoken, P.rookLocalDetail, P.rookSketchDetail, Bt.play, Bt.pause, Bt.volume, Bt.rookDone, Bt.rookCheck, Bt.rookDoneNarrow, Bt.rookCheckNarrow, Bt.sketchActive, Bt.sketchUse, Bt.sketchActiveNarrow, Bt.sketchUseNarrow, Bt.hint, Bt.close, Bt.next, Bt.bye], 'update_music_ui');
  has(funcBody('apply_block_panel_mode'), [Bt.chat, Bt.chatNarrow, Bt.next, Bt.nextNarrow, Bt.bye, Bt.byeNarrow], 'apply_block_panel_mode');
  const ui = funcBody('make_ui');
  assert.ok(ui.includes(`conv_chat_btn = conv_button(c_row1, ${q(Bt.chat)},`) && ui.includes(`conv_next_btn = conv_button(c_row1, ${q(Bt.next)},`) && ui.includes(`conv_bye_btn = conv_button(c_row1, ${q(Bt.bye)},`));
  assert.deepEqual([...ui.matchAll(/(conv_\w+_btn)\.set_meta\("rapid", true\)/g)].map(m => m[1]), ['conv_chat_btn']);
  assert.deepEqual(C.RAPID_BUTTONS, ['chat']);
  assert.deepEqual(C.conversationButtons().filter(b => b.rapid).map(b => b.id), C.RAPID_BUTTONS);
  const T = C.CAPTION_TEXT;
  has(funcBody('finish_neighbor_arrival'), [T.arrived, T.arrivedCeleste, T.arrivedRook, T.soundReady, T.soundTap], 'finish_neighbor_arrival');
  has(funcBody('talk_with_neighbor'), [T.talking, T.spokenWithTail], 'talk_with_neighbor');
  has(funcBody('end_conversation'), [T.goodbyeA11y, T.goodbyeNobody], 'end_conversation');
  assert.ok(literals(funcBody('end_conversation')).some(l => l.startsWith(T.goodbye + '\n')));
  has(funcBody('ask_whats_next'), [T.whatsNextA11y], 'ask_whats_next');
  inOrder(codeLines(funcBody('update_mural_ui')), ['var c_turn := posmod(maxi(1, celeste_talk_count) - 1, 5) + 1', 'if is_narrow_layout() and not has_custom_c:'], 'update_mural_ui');
  inOrder(codeLines(funcBody('update_music_ui')), ['var r_turn := posmod(maxi(1, rook_talk_count) - 1, 5) + 1', 'if is_narrow_layout() and not has_custom_r:'], 'update_music_ui');
});

test('drift: conversation_actions labels, order, narrow rewrites and reopening steps', () => {
  const body = funcBody('conversation_actions'), A = C.ACTION_LABELS;
  has(body, Object.values(A), 'conversation_actions');
  inOrder(codeLines(body), [
    'if String(obj.get("id", "")) == "layout":', 'return acts',
    'var owner_loan: String=loan_homecoming.conversation_loan(talk_partner) if loan_homecoming != null else ""',
    '"meet":', '"mural":', '"soundcheck":', '"open":', '"photo":', '"pack", "return":',
    'if owner_loan.is_empty(): acts.append({"id": "epilogue", "label": "Pack Gear" if String(obj.id) == "pack" else "Return Gear (%d/3)" % epilogue_returned.size()})',
    '"programme":', 'acts.append({"id": "programme", "label": block_programme_btn.text if block_programme_btn != null else "Plan Party Schedule"})',
    '"civic":', 'acts.append({"id": "civic", "label": block_civic_btn.text if block_civic_btn != null else "Hold Tenant Circle"})',
    '"film":', 'acts.append({"id": "film", "label": block_film_btn.text if block_film_btn != null else "Shoot Short Film"})',
    '"comptons":', '"blackhawk":', '_:',
    'if shared_panel != null and has_hosted_segment("art") and talk_partner==neighbor_index_for_id("dez"):',
    'var cand := posmod(talk_partner + 1 + i, neighbors.size())',
    'if cand != talk_partner and not visited_neighbors.has(String(neighbors[cand].get("id", ""))):',
    'someone_else = posmod(talk_partner + 1, maxi(1, neighbors.size()))',
    'if cand2 != talk_partner and "walk_neighbor:%d" % cand2 != String(acts[0].id) and not visited_neighbors.has(String(neighbors[cand2].get("id", ""))):',
    'if String(acts[0].id) != other_id and someone_else != talk_partner and not visited_neighbors.has(String(neighbors[someone_else].get("id", ""))):',
    'elif not history_read and String(acts[0].id) != "comptons":',
    'elif not blackhawk_discovered and String(acts[0].id) != "blackhawk":',
    'elif discovered_surprises.size() < NEIGHBORHOOD_SURPRISE_IDS.size() and String(acts[0].id) != "surprise":',
    'elif String(obj.get("id", "")) == "explore" and discovered_surprises.size() >= NEIGHBORHOOD_SURPRISE_IDS.size():',
    'elif String(acts[0].id) != other_id and someone_else != talk_partner:',
    'else:', 'acts.append({"id": "hub", "label": "All Block Actions"})', 'return acts',
  ], 'conversation_actions');
  const rewrite = codeLines(funcBody('apply_block_panel_mode')).find(line => line.startsWith('lbl = lbl.replace('));
  assert.deepEqual([...rewrite.matchAll(/\.replace\("((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\)/g)].map(m => [m[1], m[2]]), C.NARROW_LABEL_REWRITES);
  const reopen = /act_id in (\[[^\]]+\])/.exec(funcBody('run_conversation_action'));
  assert.deepEqual(JSON.parse(reopen[1]), C.REOPEN_ACTIONS);
  // The 2D-omitted actions are exactly Godot's surprise, tour, museum and eateries ids.
  const ids = new Set([...body.matchAll(/"id": ?"([a-z_]+)/g)].map(m => m[1]));
  for (const id of C.FORK_OMITTED_ACTIONS) assert.ok(ids.has(id), id);
  has(funcBody('run_conversation_action_id'), ['return_owner:', 'walk_neighbor:', 'layout_table', 'layout_floor', 'mural', 'soundcheck', 'open', 'epilogue', 'programme', 'shared_panel', 'civic', 'film', 'comptons', 'blackhawk', ...C.FORK_OMITTED_ACTIONS, 'hub'], 'run_conversation_action_id');
});

test('drift: speech bubble numbers, colours, text and the spoken-text rule', () => {
  const num = name => Number(new RegExp(`^const ${name} := ([\\d.]+)$`, 'm').exec(gd)?.[1]);
  assert.equal(num('SPEECH_BUBBLE_PIXEL'), B.BUBBLE.pixel);
  assert.equal(num('SPEECH_BUBBLE_FONT'), B.BUBBLE.font);
  assert.equal(num('SPEECH_BUBBLE_HEIGHT_M'), B.BUBBLE.heightM);
  assert.equal(num('SPEECH_BUBBLE_HIDE_TARGET_DIST_M'), B.BUBBLE.hideDistM);
  const lines = name => codeLines(funcBody(name));
  const X = B.BUBBLE, f = v => Number.isInteger(v) ? v.toFixed(1) : String(v);
  assert.ok(lines('show_speech_bubble').includes(`speech_bubble_timer = hold_sec if hold_sec > 0.0 else clampf(${f(X.hold.base)} + float(body.length()) * ${X.hold.perChar}, ${f(X.hold.min)}, ${f(X.hold.max)})`));
  assert.ok(lines('show_speech_bubble').includes(`speech_bubble_node.scale = Vector3.ONE * (${X.pop.from} * speech_bubble_base_scale())`));
  assert.ok(lines('speech_bubble_screen_scale').includes(`return clampf(bubble_viewport_size().y / ${f(X.scale.divisor)}, ${X.scale.min}, ${X.scale.max})`));
  assert.ok(lines('speech_bubble_width_px').includes(`return clampf((play_area_rect().size.x - ${f(X.wrap.inset)}) / speech_bubble_screen_scale() - ${f(X.wrap.chrome)}, ${f(X.wrap.min)}, ${f(X.wrap.max)})`));
  assert.ok(lines('refresh_speech_bubble_wrap').includes(`speech_bubble_box = Vector3(minf(width_px, text_size.x) + ${f(X.padX)}, text_size.y + ${f(X.padY)}, ${f(X.tail)})`));
  assert.ok(lines('bubble_shape_mesh').includes(`var c := minf(${f(X.chamferMax)}, h * ${X.chamferRatio}) + grow * 0.5`));
  assert.ok(lines('bubble_shape_mesh').includes(`var tw := ${f(X.tailHalf)} + grow`));
  assert.ok(lines('apply_speech_bubble_shape').includes(`speech_bubble_border.mesh = bubble_shape_mesh(speech_bubble_box.x, speech_bubble_box.y, speech_bubble_box.z, ${f(X.border)}, shift)`));
  const u = lines('update_speech_bubble').map(line => line.replace(/ # [^"]*$/, ''));
  inOrder(u, [
    `var pop := clampf((speech_bubble_age + delta) / ${X.pop.seconds}, 0.0, 1.0)`,
    `speech_bubble_node.scale = Vector3.ONE * ((${X.pop.from} + ${1 - X.pop.from} * (1.0 - pow(1.0 - pop, 3.0))) * speech_bubble_base_scale())`,
    `speech_bubble_node.position = speech_bubble_anchor_pos + Vector3.UP * (sin(speech_bubble_age * ${X.bob.rate}) * ${X.bob.metres})`,
    `var area := play_area_rect().grow(-${f(X.areaInset)})`,
    `var reward_rect := reward_banner.get_global_rect().grow(${f(X.rewardGrow)}) if banner_visible else Rect2()`,
    'var full_size := Vector2(speech_bubble_box.x + 6.0, speech_bubble_box.y + speech_bubble_box.z + 7.2) * speech_bubble_screen_scale()',
    'elif banner_visible:', 'return', 'speech_bubble_age += delta', 'speech_bubble_timer -= delta', 'if speech_bubble_timer <= 0.0:', 'hide_speech_bubble()',
  ], 'update_speech_bubble');
  has(funcBody('update_speech_bubble'), [B.BUBBLE_TEXT.panel, B.BUBBLE_TEXT.activity, B.BUBBLE_TEXT.info], 'update_speech_bubble');
  has(funcBody('announce_speech_location'), [B.BUBBLE_TEXT.notice], 'announce_speech_location');
  assert.ok(lines('fit_overlay_around_player').map(line => line.replace(/ # [^"]*$/, '')).includes(`blocked = blocked.grow(${f(X.playerGrow)})`));
  const css = c => { const [r, g, b, a] = c.split(',').map(Number); return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`; };
  const ens = funcBody('ensure_speech_bubble'), colors = [...ens.matchAll(/speech_bubble_material\(Color\(([\d., ]+)\), \d+\)/g)].map(m => css(m[1]));
  assert.deepEqual(colors, [X.colors.border, X.colors.fill]);
  assert.ok(ens.includes(`speech_bubble_label.modulate = Color("${X.colors.text.slice(1)}")`));
  assert.deepEqual(lines('spoken_text_from_line').slice(1), ['var quote_at := line.find(": \\"")', 'if quote_at >= 0 and quote_at <= 12 and line.ends_with("\\"") and line.length() > quote_at + 4:', 'return line.substr(quote_at + 3, line.length() - quote_at - 4)', 'return line']);
  inOrder(lines('show_neighbor_speech'), ['show_speech_bubble(String(neighbors[index].get("id", "")), n_pos + Vector3.UP * SPEECH_BUBBLE_HEIGHT_M, spoken_text_from_line(line))'], 'show_neighbor_speech');
});

test('drift: CHARACTER_WEB_OVERRIDES covers exactly the lines naming 3D-only keys and controls', () => {
  const copied = [...new Set(strings([C.NEIGHBOR_LINES, C.CELESTE_LINES, C.ROOK_LINES, C.LAYOUT_MEMORY, C.SURPRISE_MEMORY, C.PROJECT_MEMORY, C.MURAL_REPLY, C.COMPOSITION, C.PANEL_TEXT, C.BUTTON_TEXT, C.CAPTION_TEXT, C.ACTION_LABELS, C.HUB_LABELS]))];
  assert.deepEqual(Object.keys(C.CHARACTER_WEB_OVERRIDES).sort(), copied.filter(t => OVERRIDE_TRIGGER.test(t)).sort());
  for (const [godot, web] of Object.entries(C.CHARACTER_WEB_OVERRIDES)) {
    assert.ok(!OVERRIDE_TRIGGER.test(web), web);
    assert.equal(C.webLine(godot), web);
    const speaker = /^([A-Z][a-z]+): "/.exec(godot)?.[1];
    if (speaker) assert.ok(web.startsWith(`${speaker}: "`) && web.endsWith('"'), web);
  }
  // Every line the fork can render is free of them, in every chapter, turn, layout and memory.
  const states = [base(), withMural(base()), opened('table'), opened('floor'), hosted()];
  const ex = [NONE, extras(SURPRISE_IDS, { left: 'music', right: 'garden' }), extras(['jeffrey_record'])];
  for (const s of states) for (const e of ex) for (let n = 0; n <= 6; n++) for (const id of C.CHARACTER_PEOPLE.map(p => p.id)) {
    const st = { ...s, celesteTalks: n }, t = talkAt(id, n);
    for (const narrow of [false, true]) {
      const view = C.conversationView(st, e, t, id, nextObjective(st), { narrow, music: { playing: false, mode: 'sketch', volume: .7 } });
      for (const text of [view.header, view.line, view.tail, view.detail, ...view.buttons.map(b => b.label), ...view.actions.map(a => a.label), ...(view.music ?? []).map(b => b.label)]) assert.ok(!OVERRIDE_TRIGGER.test(text), `${id} ${n}: ${text}`);
    }
    assert.ok(!OVERRIDE_TRIGGER.test(C.arrivalCaption(st, e, t, id)));
  }
});

test('drift: hosted-text copies bea_invitation, quiet_seats, loan_homecoming and hosted_afternoon', () => {
  const bea = 'bea_invitation.gd', quiet = 'quiet_seats.gd', loan = 'loan_homecoming.gd', host = 'hosted_afternoon.gd', G = H.HOSTED_GODOT_TEXT;
  assert.deepEqual(H.INVITATION_TITLES, godotConst('TITLES', bea));
  assert.deepEqual(H.INVITATION_TITLES, STORY_CHOICES);
  assert.deepEqual(H.INVITATION_EXAMPLES, godotConst('EXAMPLES', bea));
  assert.deepEqual(H.INVITATION_PAPER_COLORS, godotConst('PAPER_COLORS', bea));
  const E = G[bea].explanation;
  assert.deepEqual(literals(funcBody('explanation', bea)), ['', E.open, E.sep, E.close]);
  has(funcBody('update_choices', bea), Object.values(G[bea].update_choices), 'bea_invitation.gd update_choices');
  const svg = literals(funcBody('source', bea)).filter(l => l.startsWith('<'));
  assert.equal(svg.length, 4);
  assert.equal(H.invitationSVG('memory'), svg[0] + svg[1] + svg[3]);
  assert.equal(H.invitationSVG('future'), svg[0] + svg[2] + svg[3]);
  inOrder(codeLines(funcBody('source', bea)), ['if not id in TITLES: return ""', 'if id=="memory":', 'else:', "return base+'</svg>'"], 'bea_invitation.gd source');
  assert.deepEqual(H.QUIET_TITLES, godotConst('TITLES', quiet));
  assert.deepEqual(H.QUIET_TITLES, QUIET_CHOICES);
  const Q = G[quiet].explanation;
  assert.deepEqual(literals(funcBody('explanation', quiet)), ['', Q.open, Q.close]);
  has(funcBody('update_ui', quiet), Object.values(G[quiet].update_ui), 'quiet_seats.gd update_ui');
  const setup = funcBody('setup', quiet);
  assert.ok(setup.includes(`game.person_material(Color("${H.QUIET_CUSHION.fill.slice(1)}"))`) && setup.includes(`game.person_material(Color("${H.QUIET_CUSHION.stripe.slice(1)}"))`) && setup.includes(`for i in range(${H.QUIET_CUSHION.stripes}):`));
  assert.deepEqual(H.LOAN_REPLIES, godotConst('REPLIES', loan));
  for (const [fn, texts] of Object.entries(G[loan])) has(funcBody(fn, loan), Object.values(texts), `loan_homecoming.gd ${fn}`);
  inOrder(codeLines(funcBody('memory', loan)), ['for id in game.LOAN_IDS:', "if game.LOAN_OWNERS[id]==neighbor_id and game.epilogue_returned.has(id): return '“'+String(REPLIES[id])+'”'", 'return ""'], 'loan memory');
  inOrder(codeLines(funcBody('pending', loan)), ['if not game.block_opened or not game.epilogue_packing or index<0 or index>=game.neighbors.size(): return ""', 'for id in game.LOAN_IDS:', 'if game.LOAN_OWNERS[id]==game.neighbors[index].id and not game.epilogue_returned.has(id): return id'], 'loan pending');
  inOrder(codeLines(funcBody('conversation_loan', loan)), ['var id := pending(index)', 'if not id.is_empty(): return id', 'if not confirmed_owner.is_empty() and index>=0 and index<game.neighbors.size() and game.LOAN_OWNERS[confirmed_owner]==game.neighbors[index].id:', 'return confirmed_owner'], 'conversation_loan');
  assert.deepEqual(H.HOSTED_IDS, godotConst('IDS', host));
  assert.deepEqual(H.HOSTED_OWNERS, godotConst('OWNERS', host));
  assert.deepEqual(H.HOSTED_POSITIONS, godotConst('POSITIONS', host));
  for (const [fn, texts] of Object.entries(G[host])) has(funcBody(fn, host), Object.values(texts), `hosted_afternoon.gd ${fn}`);
  inOrder(codeLines(funcBody('detail', host)), [
    'var index := IDS.find(id)', 'var position: int=game.hosting_order.find(id)', 'if index<0 or position<0 or position>=POSITIONS.size(): return "No copied contribution is available. The saved gathering stays unchanged."',
    'var heading: String="%s was %s in the afternoon we hosted."%[game.programme_title(id),POSITIONS[position]]',
    'reply="You made room for a small moment, and passing was welcome. No personal story was recorded." if value=="memory" else "You left room for something we hoped to make. Listening counted too. No personal story was recorded."',
    'for i in range(8):', 'if (int(value)&(1<<i))!=0: slots.append(str(i+1))',
    'result="Copied panel: %s colors and six arranged shapes."%String(value.palette).capitalize()',
    'reply="Our six shapes stay in warm colors, just as we hung them." if value.palette=="warm" else "Our six shapes stay in cool colors, just as we hung them."',
    `reply="${G[host].detail.pauseArc}" if value=="arc" else "${G[host].detail.pausePairs}"`,
    `return OWNERS[index]+': "'+reply+'"'+"\\n"+heading+"\\n"+result`,
  ], 'hosted_afternoon.gd detail');
  inOrder(codeLines(funcBody('invitation', host)), ['if not game.is_hosting_done(): return ""', 'if game.civic_phase=="done": return "The Listening Hour is complete. Its remembered voices and Dez\'s offer remain in Listening Hour (F5)."', 'if game.civic_phase=="planning": offer="Your Listening Hour plan is still there. We can return to it at your pace."', 'elif game.civic_phase=="meeting": offer="The Listening Hour is open. We can return to the conversation without closing it."'], 'hosted_afternoon.gd invitation');
  assert.deepEqual(codeLines(funcBody('invitation_available', host)).slice(1), ['return game.is_hosting_done() and game.is_civic_available() and game.civic_phase in ["idle","planning","meeting"]']);
  has(funcBody('host_complete_current'), Object.values(G['main.gd'].host_complete_current), 'host_complete_current');
  assert.deepEqual(godotConst('PROGRAMME_TITLES'), PROGRAMME_TITLES);
  // Overrides: exactly the copied texts with a key hint, each with only the hint dropped.
  const copied = strings(G);
  assert.deepEqual(Object.keys(H.HOSTED_WEB_OVERRIDES).sort(), copied.filter(t => OVERRIDE_TRIGGER.test(t)).sort());
  for (const [godot, web] of Object.entries(H.HOSTED_WEB_OVERRIDES)) assert.equal(web, godot.replace(/ \((?:[A-Z]|F\d+)\)/, ''));
});

// --- Logic. ---
test('rotation: arrival is turn 1, each Keep Chatting moves one line, five lines then wrap', () => {
  const s = { ...base(), visited: ['bea'] }, seen = [];
  let t = C.arriveTalk(C.freshTalk(), 'bea');
  assert.equal(C.talkCount(s, t, 'bea'), 1);
  for (let i = 0; i < 6; i++) {
    const view = C.conversationView(s, NONE, t, 'bea', nextObjective(s));
    seen.push([view.turn, view.line]);
    t = C.chatTalk(t, 'bea');
  }
  assert.deepEqual(seen.map(([turn]) => turn), [1, 2, 3, 4, 5, 1]);
  assert.equal(new Set(seen.slice(0, 5).map(([, line]) => line)).size, 5);
  assert.equal(seen[5][1], seen[0][1]);
  assert.equal(seen[3][1], `Bea: "Boeddeker Park is ${C.BOEDDEKER_FROM_BEA}, if you ever want a bench and some trees."`);
  assert.equal(seen[4][1], C.CHARACTER_WEB_OVERRIDES[C.NEIGHBOR_LINES.bea.before[4]]);
  assert.deepEqual(C.arriveTalk(talkAt('dez', 3), 'dez').dez, 3);
  assert.equal(C.arriveTalk(C.freshTalk(), 'rook').rook, 0, 'Godot keeps rook_talk_count apart from arrivals');
  assert.equal(C.chatTalk(C.freshTalk(), 'celeste').celeste, undefined, 'Celeste counts in the save, through the reducer');
  assert.deepEqual([0, 1, 5, 6, 10, 11].map(C.turnNumber), [1, 1, 5, 1, 5, 1]);
});

test('lines: chapter, layout and surprise slots, mural replies, Celeste and Rook', () => {
  const open = opened('floor');
  assert.equal(C.spokenLine(open, NONE, talkAt('dez', 1), 'dez'), C.NEIGHBOR_LINES.dez.open[0]);
  assert.equal(C.spokenLine(open, NONE, talkAt('dez', 4), 'dez'), C.LAYOUT_MEMORY.dez.floor);
  assert.equal(C.spokenLine(base(), NONE, talkAt('dez', 4), 'dez'), C.NEIGHBOR_LINES.dez.before[3]);
  const both = extras(['viking_dirt_biker', 'magic_carpet_chef']);
  assert.equal(C.spokenLine(open, both, talkAt('dez', 5), 'dez'), `Dez: "${C.SURPRISE_MEMORY.dez.both.slice(1, -1)}"`);
  assert.equal(C.spokenLine(open, NONE, talkAt('dez', 5), 'dez'), 'Dez: "Thanks for keeping the tempo easy."');
  const music = extras([], { left: 'music' }), garden = extras([], { right: 'garden' });
  assert.equal(C.spokenLine(open, music, talkAt('dez', 1), 'dez'), C.NEIGHBOR_LINES.dez.open[0].slice(0, -1) + C.MURAL_REPLY.dez.text + '"');
  assert.equal(C.spokenLine(open, music, talkAt('thanh', 1), 'thanh'), C.NEIGHBOR_LINES.thanh.open[0]);
  assert.ok(C.spokenLine(open, garden, talkAt('thanh', 2), 'thanh').endsWith(C.MURAL_REPLY.thanh.text + '"'));
  assert.ok(C.spokenLine(open, garden, talkAt('thanh', 2), 'thanh').includes("'Pack Gear'"));
  // Celeste: before the board is complete, then the composition reply, then the layout memory.
  assert.equal(C.spokenLine({ ...base(), celesteTalks: 1 }, NONE, C.freshTalk(), 'celeste'), C.CELESTE_LINES.before[0]);
  assert.equal(C.spokenLine({ ...base(), celesteTalks: 2 }, NONE, C.freshTalk(), 'celeste'), C.CHARACTER_WEB_OVERRIDES[C.CELESTE_LINES.before[1]]);
  const done = { ...open, celesteTalks: 1 };
  assert.equal(C.spokenLine(done, NONE, C.freshTalk(), 'celeste'), `Celeste: "${C.muralCompositionReply(done, NONE)}"`);
  assert.equal(C.spokenLine({ ...done, celesteTalks: 4 }, NONE, C.freshTalk(), 'celeste'), C.LAYOUT_MEMORY.celeste.floor);
  assert.equal(C.spokenLine({ ...withMural(base()), celesteTalks: 4 }, NONE, C.freshTalk(), 'celeste'), C.CELESTE_LINES.completed[3]);
  assert.equal(C.spokenLine({ ...done, celesteTalks: 5 }, extras(['cutesy_dino']), C.freshTalk(), 'celeste'), `Celeste: "${C.SURPRISE_MEMORY.celeste.second.slice(1, -1)}"`);
  // Rook: the stem summary, the local track, the completed lines.
  assert.equal(C.spokenLine(base(), NONE, C.freshTalk(), 'rook'), 'Rook: "Speaker\'s set up on the sidewalk and the soundcheck is done (bass (1/4 stems))."');
  assert.equal(C.spokenLine({ ...base(), soundcheck: true, visited: ['rook'] }, NONE, talkAt('rook', 1), 'rook'), 'Rook: "Speaker\'s set up on the sidewalk and the soundcheck is done (bass+brush+lead (3/4 stems))."');
  assert.equal(C.spokenLine(base(), NONE, C.freshTalk(), 'rook', { mode: 'local', localName: 'song.mp3' }), 'Rook: "Spinning your local cut (song.mp3) on the Turk Street speaker. It stays in this tab and is never uploaded."');
  assert.equal(C.spokenLine(open, NONE, talkAt('rook', 2), 'rook'), C.ROOK_LINES.completed[1]);
  assert.equal(C.spokenLine(open, extras(['jeffrey_record']), talkAt('rook', 5), 'rook'), `Rook: "${C.SURPRISE_MEMORY.rook.first.slice(1, -1)}"`);
  assert.equal(C.spokenLine(open, NONE, talkAt('rook', 5), 'rook'), C.CHARACTER_WEB_OVERRIDES[C.ROOK_LINES.completed[4]]);
  assert.throws(() => C.spokenLine({ block_opened: true }, NONE, C.freshTalk(), 'bea'), TypeError);
});

test('composition: every Sun/Wave row and Rise column case, with and without scenes', () => {
  const s = (sun, wave, rise) => withMural(base(), { sun, wave, rise }), K = C.COMPOSITION;
  assert.equal(C.muralCompositionReply(base(), NONE), K.incomplete);
  assert.equal(C.muralCompositionReply(s({ col: 1, row: 0 }, { col: 3, row: 2 }, { col: 0, row: 1 }), NONE), K.sunAbove + K.riseLeft + K.close);
  assert.equal(C.muralCompositionReply(s({ col: 1, row: 2 }, { col: 3, row: 0 }, { col: 5, row: 1 }), NONE), K.waveAbove + K.riseRight + K.close);
  assert.equal(C.muralCompositionReply(s({ col: 1, row: 1 }, { col: 3, row: 1 }, { col: 2, row: 0 }), NONE), K.horizon + K.riseLinks + K.close);
  assert.equal(C.muralCompositionReply(s({ col: 1, row: 1 }, { col: 3, row: 1 }, { col: 3, row: 0 }), NONE), K.horizon + K.riseLinks + K.close);
  const scenes = extras([], { right: 'garden', left: 'music' });
  assert.equal(C.muralSceneReply(scenes), 'Making Music on the left, Growing Together on the right. You made room for everyday creativity.');
  assert.equal(C.muralSceneReply(NONE), K.noScenes);
  assert.ok(C.muralCompositionReply(withMural(base()), scenes).endsWith(K.close + ' ' + C.muralSceneReply(scenes)));
  assert.deepEqual(C.cleanMuralScenes({ left: 'music', right: 'music' }), { left: 'music' });
  assert.deepEqual(C.cleanMuralScenes({ left: 'disco', right: 'garden', middle: 'cooking' }), { right: 'garden' });
  assert.deepEqual(C.cleanMuralScenes(['music']), {});
  assert.deepEqual([...C.godotExtras({ discovered_surprises: ['jeffrey_record', 'nope', 3, 'jeffrey_record'] }).surprises], ['jeffrey_record']);
  assert.deepEqual(C.godotExtras(null), { surprises: new Set(), muralScenes: {} });
});

test('memories: precedence, the tail matrix and the film and civic copies', () => {
  const film = (framing, plan, order = ['seat', 'paint', 'welcome']) => ({ ...hosted(), civic: { phase: 'done', draft: { topic: 'access', format: 'dropin', notes: 'none' }, result: { topic: 'access', format: 'dropin', notes: 'none' } }, film: { phase: 'done', draft: { framing, plan, order }, result: { framing, plan, order }, captured: [...order] } });
  for (const framing of ['close', 'wide']) for (const plan of ['quiet', 'later']) for (const order of [['seat', 'paint', 'welcome'], ['welcome', 'seat', 'paint']]) {
    const s = film(framing, plan, order);
    for (const id of C.CHARACTER_PEOPLE.map(p => p.id)) assert.equal(C.projectMemory(s, NONE, id), filmResponse(id, s.film), `${id} film`);
  }
  assert.equal(C.projectMemory(film('close', 'quiet', ['seat', 'welcome', 'paint']), NONE, 'dez'), `“We ended on ${FILM_SHOTS.paint.label.toLowerCase()}. A different order would tell a different little story.”`);
  for (const topic of ['repairs', 'access']) for (const format of ['circle', 'dropin']) for (const notes of ['themes', 'none']) {
    const s = { ...hosted(), civic: { phase: 'done', draft: { topic, format, notes }, result: { topic, format, notes } } };
    for (const id of C.CHARACTER_PEOPLE.map(p => p.id)) assert.equal(C.projectMemory(s, NONE, id), civicResponse(id, s.civic), `${id} civic`);
  }
  const h = hosted([['stories', 'future'], ['beats', 0], ['art', { tiles: [0, 1, 2, 2, 1, 0], palette: 'cool' }], ['pause', 'pairs']]);
  assert.equal(C.projectMemory(h, NONE, 'bea'), C.PROJECT_MEMORY.stories.future);
  assert.equal(C.projectMemory(h, NONE, 'thanh'), C.PROJECT_MEMORY.pause.pairs);
  assert.equal(C.projectMemory(h, NONE, 'celeste'), `“${H.LOAN_REPLIES['paint-case']}”`);
  assert.equal(C.projectMemory(h, NONE, 'rook'), `“${H.LOAN_REPLIES.speaker}”`);
  assert.equal(C.projectMemory(h, NONE, 'dez'), '');
  assert.equal(C.projectMemory(opened(), NONE, 'bea'), '');
  // Tail matrix: none, base only, surprise only, both by turn parity, and the spoken surprise.
  const surp = extras(['mayor_pomp_event']), S = C.SURPRISE_MEMORY.bea.first, base_ = C.PROJECT_MEMORY.stories.future;
  assert.equal(C.memoryTail(opened(), NONE, 'bea', 'x', 1), '');
  assert.equal(C.memoryTail(h, NONE, 'bea', 'x', 2), base_);
  assert.equal(C.memoryTail(opened(), surp, 'bea', 'x', 1), S);
  assert.equal(C.memoryTail(opened(), surp, 'bea', `Bea: "${S.slice(1, -1)}"`, 5), '');
  assert.equal(C.memoryTail(h, surp, 'bea', 'x', 1), base_);
  assert.equal(C.memoryTail(h, surp, 'bea', 'x', 2), S);
  assert.equal(C.memoryTail(h, surp, 'bea', 'x', 0), base_);
  assert.equal(C.memoryTail(h, surp, 'bea', `Bea: "${S.slice(1, -1)}"`, 2), base_);
  assert.equal(C.projectMemory(h, surp, 'bea'), `${base_} · ${S}`);
  // In the panel and the captions the tail follows the line.
  const t = talkAt('bea', 1), view = C.conversationView(h, surp, t, 'bea', nextObjective(h));
  assert.equal(view.detail, `${view.line} · ${base_}`);
  assert.equal(C.arrivalCaption(h, surp, t, 'bea'), `Arrived at Bea (The one with the plan). Visited 5/5 neighbors. ${base_}`);
  assert.equal(C.talkAnnouncement(h, surp, t, 'bea'), `${view.line} ${base_}`);
  const cel = { ...h, celesteTalks: 2 };
  assert.equal(C.panelDetail(cel, NONE, t, 'celeste', { narrow: true }), `Celeste: “${H.LOAN_REPLIES['paint-case']}” · ${C.spokenLine(cel, NONE, t, 'celeste').replace('Celeste: ', '')}`);
});

test('sparks, headers, buttons, captions and goodbye', () => {
  assert.equal(C.sparkCount(base(), NONE), 0);
  const h = hosted();
  // 5 met + 3 motifs + soundcheck + layout + opened 2 + photo + 3 returns + 4 hosted
  assert.equal(C.sparkCount(h, NONE), 5 + 3 + 1 + 1 + 2 + 1 + 3 + 4);
  assert.equal(C.sparkCount({ ...h, history: true, blackhawk: true, civic: { phase: 'done' }, film: { phase: 'done' } }, extras(['jeffrey_record', 'cutesy_dino'])), 20 + 4 + 2);
  const s = { ...base(), visited: ['bea', 'dez'] };
  assert.equal(C.panelHeader(s, NONE, talkAt('dez', 7), 'dez'), 'Talking with Dez (Always making a beat · 80 BPM Beatmaker · Easygoing Groove · Turn 2/5)  ·  Meet Neighbors & Prepare  ·  2/5 Met  ·  Mural 0/3  ·  Sparks: 2');
  assert.equal(C.panelHeader(s, NONE, talkAt('dez', 7), 'dez', { narrow: true }), 'Dez · Turn 2/5 · Sparks: 2');
  assert.ok(C.panelHeader({ ...withMural(base()), visited: ['bea', 'celeste', 'rook', 'dez', 'thanh'], soundcheck: true }, NONE, talkAt('bea', 1), 'bea').includes('·  Ready to Open!  ·  5/5 Met  ·  Mural 3/3 Ready'));
  assert.equal(C.panelHeader({ ...base(), celesteTalks: 3, palette: 'ocean' }, NONE, C.freshTalk(), 'celeste'), 'Talking with Celeste (Mural Artist · Sidewalk Muralist · Bright & Inviting · Turn 3/5)  ·  Easel: 0/3 Motifs Painted (Ocean Palette)  ·  Sparks: 0');
  assert.equal(C.panelHeader(h, NONE, talkAt('rook', 1), 'rook', { music: { playing: true, mode: 'sketch' } }), `Talking with Rook (Sound & Stories · Sound Keeper · Cool & Observant · Turn 1/5)  ·  Playing  ·  80 BPM Sketch  ·  Soundcheck: Ready  ·  Sparks: ${C.sparkCount(h, NONE)}`);
  assert.deepEqual(C.conversationButtons().map(b => b.label), ['Keep Chatting', "What's Next?", 'Goodbye (Esc)']);
  assert.deepEqual(C.conversationButtons(true).map(b => b.label), ['Chat More', 'Next Step', 'Goodbye']);
  assert.deepEqual(C.rookButtons(base(), { playing: false, mode: 'sketch', volume: 0.7 }).map(b => b.label), ['Play Groove', 'Volume: 70%', 'Soundcheck w/ Rook', '80 BPM Sketch (Active)', "What's Next?", 'Goodbye (Esc)']);
  assert.deepEqual(C.rookButtons(h, { playing: true, mode: 'local', volume: 1 }, true).map(b => b.label), ['Pause Groove', 'Volume: 100%', 'Chat w/ Rook', 'Use Sketch', 'Hint', 'Close']);
  assert.equal(C.arrivalCaption({ ...base(), mural: { sun: { col: 0, row: 0 } } }, NONE, C.freshTalk(), 'celeste'), 'Arrived at Celeste (Signs, paint & possibility). Portable Mural Board 1/3 motifs.');
  assert.equal(C.arrivalCaption(base(), NONE, C.freshTalk(), 'rook'), 'Arrived at Rook (Good ears. Better stories.). Tap Soundcheck below.');
  assert.equal(C.talkingSubline('thanh'), 'Talking with Thanh (Neighbor & supply lender) · Click Thanh again or choose an action below');
  const goal = nextObjective(s);
  assert.deepEqual(C.goodbyeLines('dez', goal), { text: 'You said goodbye to Dez.', announcement: `Said goodbye to Dez. Next: ${goal.text}` });
  assert.equal(C.goodbyeLines(null, goal).text, 'You said goodbye to the block.');
  assert.equal(C.whatsNext(goal, 'dez'), `Dez: "${goal.hint}"`);
  assert.equal(C.whatsNextAnnouncement(goal, 'dez'), `Next: ${goal.text}. ${goal.hint}`);
  assert.equal(C.panelBorder('bea'), '#d3a479');
  assert.equal(C.panelDetail(s, NONE, talkAt('bea', 1), 'bea', { custom: 'Bea: "Custom."' }), 'Bea: "Custom."');
  assert.equal(C.rookMusicDetail(base(), 'x'), 'Original 80 BPM sketch · Soundcheck: Pending · Groove Stems: bass (1/4 stems) — x');
});

test('conversation actions: every objective, loans, Dez after art, narrow labels and the fork omissions', () => {
  const ids = acts => acts.map(a => a.id), labels = acts => acts.map(a => a.label);
  const start = { ...base(), visited: ['bea'] };
  assert.deepEqual(C.conversationActions(start, NONE, C.freshTalk(), 'bea', { id: 'meet', neighbor: 'celeste' }), [
    { id: 'walk_neighbor:celeste', label: 'Go Meet Celeste' }, { id: 'walk_neighbor:rook', label: 'Talk to Rook' }, { id: 'hub', label: 'All Block Actions' },
  ]);
  assert.deepEqual(labels(C.conversationActions(start, NONE, C.freshTalk(), 'bea', { id: 'meet', neighbor: 'celeste' }, { narrow: true })), ['Meet Celeste', 'Talk to Rook', 'All Actions']);
  const met = { ...base(), visited: ['bea', 'celeste', 'rook', 'dez', 'thanh'] };
  assert.deepEqual(labels(C.conversationActions(met, NONE, C.freshTalk(), 'bea', nextObjective(met))), ['Long Table (Bea)', 'Open Floor (Dez & Celeste)', 'All Block Actions']);
  assert.deepEqual(labels(C.conversationActions(met, NONE, C.freshTalk(), 'bea', nextObjective(met), { narrow: true })), ['Long Table', 'Open Floor', 'All Actions']);
  const laid = { ...met, layout: 'table' };
  assert.deepEqual(labels(C.conversationActions(laid, NONE, C.freshTalk(), 'dez', nextObjective(laid))), ['Paint with Celeste', "See Compton's Plaque", 'All Block Actions']);
  assert.deepEqual(labels(C.conversationActions({ ...laid, history: true }, NONE, C.freshTalk(), 'dez', nextObjective(laid), { narrow: true })), ['Paint', 'Walk to Black Hawk', 'All Actions']);
  const ready = withMural(laid);
  assert.deepEqual(labels(C.conversationActions(ready, NONE, C.freshTalk(), 'bea', nextObjective(ready))), ['Soundcheck with Rook', "See Compton's Plaque", 'All Block Actions']);
  assert.deepEqual(labels(C.conversationActions({ ...ready, soundcheck: true }, NONE, C.freshTalk(), 'bea', nextObjective({ ...ready, soundcheck: true }))), ['Open Block Party!', "See Compton's Plaque", 'All Block Actions']);
  const o = opened();
  assert.deepEqual(labels(C.conversationActions(o, NONE, C.freshTalk(), 'bea', nextObjective(o))), ['Take Group Photo', "See Compton's Plaque", 'All Block Actions']);
  const packing = { ...o, epilogue: { packing: true, returned: [], photo: { status: 'skipped' } } };
  assert.deepEqual(labels(C.conversationActions(packing, NONE, C.freshTalk(), 'bea', nextObjective(packing))), ['Return Gear (0/3)', "See Compton's Plaque", 'All Block Actions']);
  assert.deepEqual(C.conversationActions(packing, NONE, C.freshTalk(), 'thanh', nextObjective(packing))[0], { id: 'return_owner:table', label: `Return ${LOAN_TITLES.table}` });
  assert.equal(C.conversationActions(packing, NONE, C.freshTalk(), 'thanh', nextObjective(packing)).length, 3);
  const back = { ...packing, epilogue: { ...packing.epilogue, returned: ['table'] } };
  assert.deepEqual(C.conversationActions(back, NONE, C.confirmLoan(C.freshTalk(), 'table'), 'thanh', nextObjective(back))[0], { id: 'return_owner:table', label: `Returned ${LOAN_TITLES.table}` });
  assert.equal(C.conversationActions(back, NONE, C.freshTalk(), 'thanh', nextObjective(back))[0].id, 'epilogue');
  const unpacked = { ...o, epilogue: { packing: false, returned: [], photo: { status: 'taken' } } };
  assert.equal(C.conversationActions(unpacked, NONE, C.freshTalk(), 'bea', nextObjective(unpacked))[0].label, 'Pack Gear');
  const plan = { ...hosted(), hosting: { order: [], results: [], draft: hosted().hosting.draft }, programme: { order: ['stories'], published: [] } };
  assert.equal(C.conversationActions(plan, NONE, C.freshTalk(), 'bea', nextObjective(plan))[0].label, 'Plan Schedule (1/4)');
  assert.equal(C.programmeLabel({ ...plan, programme: { order: [], published: [] } }), 'Plan Party Schedule');
  assert.equal(C.programmeLabel({ ...plan, programme: { order: ['stories', 'beats', 'art', 'pause'], published: ['stories', 'beats', 'art', 'pause'] } }), 'Start Hosting Party');
  const midway = hosted([['stories', 'memory']]);
  assert.equal(C.programmeLabel(midway), 'Host Activity (1/4)');
  assert.equal(C.programmeLabel(hosted()), 'Hosted All 4 Events');
  const h = hosted();
  assert.deepEqual(labels(C.conversationActions(h, NONE, C.freshTalk(), 'bea', nextObjective(h))), ['Hold Tenant Circle', "See Compton's Plaque", 'All Block Actions']);
  assert.deepEqual(C.conversationActions(h, NONE, C.freshTalk(), 'dez', nextObjective(h)), [{ id: 'civic', label: 'Hold Tenant Circle' }, { id: 'shared_panel', label: "Celeste's Shared Panel" }, { id: 'hub', label: 'All Block Actions' }]);
  assert.deepEqual(['idle', 'planning', 'meeting', 'done'].map(phase => C.civicLabel({ civic: { phase } })), ['Hold Tenant Circle', 'Convene Circle', 'Share Circle Notes', 'Tenant Circle (Done)']);
  assert.deepEqual(['idle', 'planning', 'hold'].map(phase => C.filmLabel({ film: { phase } })), ['Shoot Short Film', 'Set Up Film Shot', 'Roll Camera (Clear)']);
  assert.equal(C.filmLabel({ film: { phase: 'shooting', captured: ['seat'] } }), 'Shoot Frame (1/3)');
  assert.equal(C.filmLabel({ film: { phase: 'done' } }, 2), 'Watch Film (3/3)');
  const civicDone = { ...h, civic: { phase: 'done', result: { topic: 'repairs', format: 'circle', notes: 'themes' } } };
  assert.equal(C.conversationActions(civicDone, NONE, C.freshTalk(), 'bea', nextObjective(civicDone))[0].label, 'Shoot Short Film');
  const filmDone = { ...civicDone, film: { phase: 'done', result: { framing: 'close', plan: 'quiet', order: ['seat', 'paint', 'welcome'] }, captured: ['seat', 'paint', 'welcome'] } };
  assert.deepEqual(labels(C.conversationActions(filmDone, NONE, C.freshTalk(), 'bea', nextObjective(filmDone))), ["Walk to Compton's", 'Walk to Black Hawk', 'All Block Actions']);
  const hist = { ...filmDone, history: true };
  assert.deepEqual(labels(C.conversationActions(hist, NONE, C.freshTalk(), 'bea', nextObjective(hist))), ['Walk to Black Hawk', 'Talk to Celeste', 'All Block Actions']);
  // After every objective the fork offers the next neighbor; Godot's surprise hunt and museum are omitted.
  const all = { ...hist, blackhawk: true }, explore = nextObjective(all);
  assert.equal(explore.id, 'explore');
  assert.deepEqual(C.conversationActions(all, NONE, C.freshTalk(), 'thanh', explore), [{ id: 'walk_neighbor:bea', label: 'Talk to Bea' }, { id: 'hub', label: 'All Block Actions' }]);
  assert.deepEqual(ids(C.conversationActions(all, NONE, C.freshTalk(), 'bea', explore, { fork: false })), ['surprise', 'walk_neighbor:celeste', 'hub']);
  assert.deepEqual(labels(C.conversationActions(all, extras(SURPRISE_IDS), C.freshTalk(), 'bea', explore, { fork: false })), ['Visit the Museum', 'Visit Eateries', 'All Block Actions']);
  for (const s of [start, met, laid, ready, o, packing, back, plan, h, civicDone, filmDone, hist, all]) for (const id of C.CHARACTER_PEOPLE.map(p => p.id)) for (const narrow of [false, true]) {
    const acts = C.conversationActions(s, extras(SURPRISE_IDS.slice(0, 3)), C.freshTalk(), id, nextObjective(s), { narrow });
    assert.ok(acts.length >= 1 && acts.length <= 4 && acts.at(-1).id === 'hub', `${id} ${JSON.stringify(acts)}`);
    for (const a of acts) assert.ok(!C.FORK_OMITTED_ACTIONS.includes(a.id), a.id);
  }
});

test('hosted text: invitation, quiet seats, loan replies and the hosted review', () => {
  assert.equal(H.invitationExplanation('memory'), `Bea: "A small moment you want to keep. ${H.INVITATION_EXAMPLES.memory} That is just my example. Tell something if you want to; listening is equally welcome. No story is recorded." (Original fictional scene.)`);
  assert.equal(H.invitationExplanation('nope'), '');
  assert.ok(H.invitationHubText('future').endsWith('" (Original fictional scene.) Choose the invitation, then Host Activity when ready. Nothing is timed.'));
  assert.equal(H.quietExplanation('pairs'), 'Thanh: "A pair and an open seat. Two fictional visitors can sit together; the woven green cushion marks an open seat. Sit, stand or leave whenever you like. The sidewalk stays clear. Music is your choice; there is no timer."');
  assert.ok(H.quietHubText('arc').endsWith('there is no timer." Choose the seats, then Host Activity when you are ready.'));
  assert.deepEqual([H.invitationButtonLabel('memory'), H.quietButtonLabel('pairs')], ['A small moment\nyou want to keep', 'A pair and\nan open seat']);
  assert.equal(H.invitationSVG('x'), '');
  assert.ok(H.invitationSVG('memory').startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240"') && H.invitationSVG('memory').endsWith('</svg>'));
  const mid = hosted([['stories', 'future']]);
  assert.equal(H.invitationChoice(mid), 'future');
  assert.equal(H.invitationChoice({ ...mid, hosting: { ...mid.hosting, results: [] } }), 'memory');
  assert.equal(H.quietChoice(hosted([['stories', 'memory'], ['beats', 1], ['art', { tiles: [0, 1, 2, 2, 1, 0], palette: 'warm' }]])), 'arc');
  assert.equal(H.invitationChoice(base()), '');
  // Loans.
  assert.equal(H.loanReply('table'), `Thanh: "${H.LOAN_REPLIES.table}"`);
  assert.equal(H.loanReply('speaker'), `Rook: "${H.LOAN_REPLIES.speaker}"`);
  assert.equal(H.loanRefusal('paint-case'), 'Celeste: "The return was not changed: this save has no room. The last stored save stays unchanged."');
  assert.equal(H.loanReturnAnnouncement('paint-case', 2), `Returned Celeste's paint case (2/3). Celeste: "${H.LOAN_REPLIES['paint-case']}"`);
  assert.equal(H.LOAN_COMPLETION_NOTICE, 'Returned all three neighbor loans (3/3). ');
  const packing = { ...opened(), epilogue: { packing: true, returned: ['table'], photo: { status: 'taken' } } };
  assert.equal(H.pendingLoan(packing, 'thanh'), '');
  assert.equal(H.pendingLoan(packing, 'rook'), 'speaker');
  assert.equal(H.pendingLoan({ ...packing, epilogue: { ...packing.epilogue, packing: false } }, 'rook'), '');
  assert.equal(H.conversationLoan(packing, 'thanh', 'table'), 'table');
  assert.equal(H.conversationLoan(packing, 'celeste', 'table'), 'paint-case');
  assert.equal(H.conversationLoan(packing, 'bea', 'table'), '');
  assert.equal(H.loanMemory(packing, 'thanh'), `“${H.LOAN_REPLIES.table}”`);
  assert.equal(H.loanMemory(packing, 'rook'), '');
  // Hosted review, per segment and value, in hosted order.
  const order = ['beats', 'pause', 'stories', 'art'];
  const h = hosted([['beats', 0b1010101], ['pause', 'pairs'], ['stories', 'memory'], ['art', { tiles: [0, 1, 2, 2, 1, 0], palette: 'cool' }]], order);
  assert.equal(H.hostedDetail(h, 'beats'), 'Dez: "You gave us 4 taps in eight slots. I kept the spaces between them too."\nRhythm workshop was first in the afternoon we hosted.\nCopied rhythm: 4 taps in eight slots, at 1, 3, 5, 7.');
  assert.equal(H.hostedDetail(h, 'pause'), 'Thanh: "You kept a pair and an open seat, with the cushion marking a place. Coming and going were welcome."\nQuiet interval was second in the afternoon we hosted.\nCopied seating: A pair and an open seat.');
  assert.equal(H.hostedDetail(h, 'stories'), 'Bea: "You made room for a small moment, and passing was welcome. No personal story was recorded."\nStory circle was third in the afternoon we hosted.\nCopied invitation: A small moment you want to keep.');
  assert.equal(H.hostedDetail(h, 'art'), 'Celeste: "Our six shapes stay in cool colors, just as we hung them."\nShared art panel was fourth in the afternoon we hosted.\nCopied panel: Cool colors and six arranged shapes.');
  const other = hosted([['stories', 'future'], ['beats', 0], ['art', { tiles: [0, 1, 2, 2, 1, 0], palette: 'warm' }], ['pause', 'arc']]);
  assert.deepEqual(H.hostedReplies(other).map(d => d.split('\n')[0]), [
    'Bea: "You left room for something we hoped to make. Listening counted too. No personal story was recorded."',
    'Dez: "You gave listening a place without asking anyone to make a beat."',
    'Celeste: "Our six shapes stay in warm colors, just as we hung them."',
    'Thanh: "You kept an open arc, with the cushion marking a place. Coming and going were welcome."',
  ]);
  assert.equal(H.hostedDetail(other, 'beats').split('\n')[2], 'Copied rhythm: listening only, with no marked beats.');
  assert.deepEqual(H.hostedReview(h).map(r => [r.id, r.owner, r.lines.length]), [['beats', 'Dez', 3], ['pause', 'Thanh', 3], ['stories', 'Bea', 3], ['art', 'Celeste', 3]]);
  const broken = hosted([['stories', 'memory'], ['beats', 2.5], ['art', { tiles: [0, 1, 2, 2, 1, 9], palette: 'warm' }], ['pause', 'arc']]);
  assert.equal(H.hostedDetail(broken, 'beats'), 'Rhythm workshop was second in the afternoon we hosted.\nThe copied choice is unavailable. The saved gathering stays unchanged.');
  assert.equal(H.hostedDetail(broken, 'art').split('\n')[1], 'The copied choice is unavailable. The saved gathering stays unchanged.');
  assert.equal(H.hostedDetail(base(), 'stories'), 'No copied contribution is available. The saved gathering stays unchanged.');
  assert.equal(H.hostedDetail(h, 'nope'), 'No copied contribution is available. The saved gathering stays unchanged.');
  // Bea's Listening Hour offer through every civic phase.
  const phase = p => ({ ...h, civic: { phase: p } });
  assert.equal(H.hostedInvitation(phase('idle')), 'Bea: "Our afternoon began with Rhythm workshop and ended with Shared art panel. I would like to make room for a Listening Hour too, when you are ready."');
  assert.equal(H.hostedInvitation(phase('planning')), 'Bea: "Our afternoon began with Rhythm workshop and ended with Shared art panel. Your Listening Hour plan is still there. We can return to it at your pace."');
  assert.equal(H.hostedInvitation(phase('meeting')), 'Bea: "Our afternoon began with Rhythm workshop and ended with Shared art panel. The Listening Hour is open. We can return to the conversation without closing it."');
  assert.equal(H.hostedInvitation(phase('done')), "The Listening Hour is complete. Its remembered voices and Dez's offer remain in Listening Hour.");
  assert.deepEqual(['idle', 'planning', 'meeting', 'done'].map(p => H.hostedInvitationAvailable(phase(p))), [true, true, true, false]);
  assert.equal(H.hostedInvitation(midwayHost()), '');
  assert.equal(H.hostedInvitationAvailable(midwayHost()), false);
  assert.equal(H.hostedCompletion(hosted([['stories', 'memory']]), 'stories'), 'Completed Story circle (1/4 hosted) · Next: Rhythm workshop');
  assert.equal(H.hostedCompletion(h, 'art'), 'Completed Shared art panel (4/4 hosted) — Second Afternoon Complete!');
});
function midwayHost() { return hosted([['stories', 'memory']]); }

test('bubble: spoken text, timing, scale, wrap, shape, fit and the frame clock', () => {
  assert.equal(B.spokenText('Bea: "Welcome!"'), 'Welcome!');
  assert.equal(B.spokenText('Celeste: "x"'), 'x');
  assert.equal(B.spokenText('Bea: ""'), 'Bea: ""', 'too short to strip');
  assert.equal(B.spokenText('A very long speaker name: "Hi there"'), 'A very long speaker name: "Hi there"');
  assert.equal(B.spokenText('No quotes here'), 'No quotes here');
  assert.equal(C.spokenText, B.spokenText);
  assert.equal(B.holdSeconds('short'), 6);
  assert.equal(B.holdSeconds('x'.repeat(100)), 4.5 + 5.5);
  assert.equal(B.holdSeconds('x'.repeat(1000)), 14);
  assert.equal(B.holdSeconds('🎵'.repeat(100)), 10, 'code points, as Godot counts');
  assert.deepEqual([B.screenScale(500), B.screenScale(700), B.screenScale(760), B.screenScale(1200)], [0.68, 700 / 900, 0.84, 0.84]);
  assert.equal(B.wrapWidth(320, 0.68), Math.max(120, (320 - 12) / 0.68 - 34));
  assert.equal(B.wrapWidth(2000, 0.84), 440);
  assert.equal(B.wrapWidth(50, 0.84), 120);
  const measure = t => [...t].length * 10;
  assert.deepEqual(B.wrapLines('one two three four', 100, measure), ['one two', 'three four']);
  assert.deepEqual(B.wrapLines('one two three four', 90, measure), ['one two', 'three', 'four']);
  assert.deepEqual(B.wrapLines('abcdefghijkl', 50, measure), ['abcde', 'fghij', 'kl']);
  const box = B.bubbleBox(['one two', 'three four'], 120, measure);
  assert.deepEqual([box.w, box.tail], [100 + 28, 10]);
  assert.equal(B.bubbleBox(['one two three four'], 90, measure).w, 90 + 28);
  const shape = B.bubbleShape(100, 40, 10, 0, 0);
  assert.equal(shape.outline.length, 8);
  assert.deepEqual(shape.outline[0], { x: -50 + 10, y: 10 });
  assert.deepEqual(shape.tail, [{ x: -11, y: 11 }, { x: 11, y: 11 }, { x: 0, y: -0 }]);
  assert.equal(B.bubbleShape(100, 20, 10).outline[0].x, -50 + 6);
  assert.deepEqual([B.popScale(0), B.popScale(0.2), B.popScale(0, true)], [0.6, 1, 1]);
  assert.equal(B.bobMetres(1, true), 0);
  const area = { x: 0, y: 0, w: 400, h: 300 };
  assert.deepEqual(B.fitAround({ x: 10, y: 10, w: 100, h: 50 }, area), { x: 10, y: 10, w: 100, h: 50 });
  assert.deepEqual(B.fitAround({ x: -20, y: 10, w: 100, h: 50 }, area), { x: 0, y: 10, w: 100, h: 50 });
  const moved = B.fitAround({ x: 100, y: 100, w: 100, h: 50 }, area, { x: 140, y: 120, w: 20, h: 20 });
  assert.ok(moved && !(moved.x < 162 && moved.x + 100 > 138 && moved.y < 142 && moved.y + 50 > 118));
  assert.equal(B.fitAround({ x: 0, y: 0, w: 500, h: 50 }, area), null);
  // Frame clock: shows, pops, then hides when the timer runs out; hides when far or in overview.
  const view = { dt: 0.125, viewport: { w: 1000, h: 760 }, playArea: { x: 0, y: 0, w: 1000, h: 700 }, anchor: { x: 500, y: 400 }, pxPerMetre: 5, measure };
  const b = B.showBubble('bea', 'Hello there');
  assert.equal(b.timer, 6);
  let step = B.stepBubble(b, view);
  assert.ok(step.layout && step.layout.lines[0].text === 'Hello there' && step.bubble.age > 0);
  assert.ok(step.layout.rect.y + step.layout.rect.h <= 400 + 8, 'the tail ends at the anchor');
  let frames = 1;
  while (step.bubble) { step = B.stepBubble(step.bubble, view); frames++; }
  assert.equal(frames, 6 / 0.125);
  assert.equal(B.stepBubble(B.showBubble('bea', 'Hi'), { ...view, overview: true }).bubble, null);
  assert.equal(B.stepBubble(B.showBubble('bea', 'Hi'), { ...view, targetDist: 45 * 5 + 1 }).bubble, null);
  assert.ok(B.stepBubble(B.showBubble('bea', 'Hi'), { ...view, targetDist: 45 * 5 }).bubble);
  assert.equal(B.showBubble('bea', '   '), null);
  assert.equal(B.showBubble('bea', 'x', 2).timer, 2);
  // No room: the same text in the open dialog is announced once, then the bubble hides with the dialog.
  const cramped = { ...view, playArea: { x: 0, y: 0, w: 60, h: 40 }, activityText: 'Bea: "Hello there"' };
  step = B.stepBubble(B.showBubble('bea', 'Hello there'), cramped);
  assert.deepEqual([step.layout, step.announce, step.bubble.inActivity], [null, 'panel', true]);
  step = B.stepBubble(step.bubble, cramped);
  assert.equal(step.announce, null);
  assert.equal(B.stepBubble(step.bubble, { ...cramped, activityText: '' }).bubble, null);
  // A reward banner in the way holds the reading time until it clears.
  const timer = B.showBubble('bea', 'Hello there').timer, held = B.stepBubble(B.showBubble('bea', 'Hello there'), { ...view, playArea: { x: 0, y: 0, w: 60, h: 40 }, reward: { x: 0, y: 0, w: 10, h: 10 } });
  assert.equal(held.bubble.timer, timer);
  assert.equal(B.speechNotice('', 'Hi there', B.BUBBLE_TEXT.panel), 'Full dialogue in the conversation panel. Hi there');
  assert.equal(B.speechNotice('Arrived. Hi there', 'Hi there', B.BUBBLE_TEXT.panel), 'Arrived. Hi there Full dialogue in the conversation panel.');
  assert.equal(B.speechNotice('Arrived. Hi there Full dialogue in the conversation panel.', 'Hi there', B.BUBBLE_TEXT.panel), null);
});

test('the hosting beats step is declared fork text: no Godot source has it, and game.js draws it from the declaration', () => {
  const F = H.HOSTING_FORK_TEXT, all = strings(F);
  assert.deepEqual(Object.keys(F.beats), ['intro', 'tail', 'traced', 'quiet']);
  const godot = ['main.gd', 'programme_gathering.gd', 'rhythm_circle.gd', 'hosted_afternoon.gd'].map(read).join('\n');
  for (const text of all) assert.ok(!godot.includes(text.slice(0, 24)), `fork text is not a Godot line: ${text}`);
  const game = readFileSync(new URL('../browser-next/game.js', import.meta.url), 'utf8');
  for (const text of all) assert.ok(!game.includes(text.slice(0, 24)), `game.js uses HOSTING_FORK_TEXT, not an inline copy: ${text}`);
  assert.ok(game.includes('HOSTING_FORK_TEXT.beats'));
});

test('new modules are LF, pure and import nothing from the DOM side', () => {
  for (const name of ['characters.js', 'bubble.js', 'hosted-text.js']) {
    const text = readFileSync(new URL(`../browser-next/${name}`, import.meta.url), 'utf8');
    assert.ok(!text.includes('\r'), `${name} is LF`);
    const code = text.replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g, "''");
    assert.ok(!/\b(document|window|localStorage|sessionStorage|setTimeout|requestAnimationFrame|fetch|Math\.random|Date\.now)\b/.test(code), `${name} is pure`);
    assert.ok(!/from '\.\/(game|world|audio|soundtrack|press-settle)\.js'/.test(text), `${name} imports no DOM module`);
  }
  assert.ok(!readFileSync(new URL('../tests/next-characters.test.mjs', import.meta.url), 'utf8').includes('\r'));
});
