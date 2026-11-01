// browser-next/bursts.js, Godot's reward banner (godot/main.gd trigger_progress_cue's burst arms, trigger_feel_good_burst,
// update_celebration_burst, layout_reward_banner and build_reward_banner), and its wiring: game.js, visits-world.js, index.html
// and style.css. main.gd is parsed at test time, so a changed title, detail format, accent, timing or rule fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as B from '../browser-next/bursts.js';
import { AUDIBLE_CUES, progressCues, visitCue, CUE_REASONS, HISTORY_REASONS } from '../browser-next/rewards.js';
import { initialState, applyAction } from '../browser-next/core.js';
import { CHARACTER_PEOPLE } from '../browser-next/characters.js';
import { FILM_SHOTS } from '../browser-next/film.js';
import { GATHERING_LAYOUT_TITLES } from '../browser-next/story.js';
import { gdf } from '../browser-next/visits/format.js';
import { GODOT_TEXT } from '../browser-next/visits/text.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MAIN = read('godot/main.gd');
function funcBody(name) {
  const start = MAIN.search(new RegExp(`^(?:static )?func ${name}\\(`, 'm'));
  assert.ok(start >= 0, `func ${name} is missing from main.gd`);
  const end = MAIN.slice(start + 1).search(/^(?:static )?func /m);
  return MAIN.slice(start, end < 0 ? MAIN.length : start + 1 + end);
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
// A GDScript string literal: JSON escapes the same characters GDScript does for these strings (", \ and the newline).
const gd = s => JSON.stringify(s);
const gdNum = n => (Number.isInteger(n) ? n.toFixed(1) : String(n));
const hex = h => h.replace(/^#/, '').toLowerCase();

// --- Drift: trigger_progress_cue's burst arms. ---
const cueBody = funcBody('trigger_progress_cue');
const burstPart = cueBody.split('\tif not suppress_feel_good_burst:')[1];
function arms() {
  const heads = [...burstPart.matchAll(/^\t\t\t((?:"[a-z_]+"(?:, )?)+):$/gm)];
  return heads.map((m, i) => ({ ids: [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]), body: burstPart.slice(m.index + m[0].length, heads[i + 1]?.index ?? burstPart.length) }));
}
// The Godot arguments of each arm, which the fork's values stand for (bursts.js cueValues and the visit values).
const ARGS = {
  neighbor_visit: [' % reason', ' % [visited_neighbors.size(), neighbors.size(), active_stem_summary()]'],
  celeste_talk: ['', ' % [visited_neighbors.size(), neighbors.size()]'],
  mural_motif: [' % reason.capitalize()', ' % [mural_placements.size(), active_stem_summary()]'],
  mural_complete: ['', ' % active_stem_summary()'],
  rook_soundcheck: ['', ' % active_stem_summary()'],
  block_opened: ['', ''],
  keepsake_photo: ['', ''],
  loan_returned: [' % reason.capitalize()', ' % epilogue_returned.size()'],
  hosting_segment: [' % reason', ' % hosting_results.size()'],
  hosting_complete: ['', ''],
  civic_complete: ['', ' % spark_count()'],
  film_shot: [' % film_shot_title(reason)', ' % film_captured.size()'],
  film_complete: ['', ' % spark_count()'],
  history_comptons: [' % reason', ' % spark_count()'],
  history_blackhawk: [' % reason', ' % spark_count()'],
  museum_portal: [' % reason', ' % visited_museum_eras.size()'],
  tour_complete: ['', ' % [tour.count, tour.total]'],
  boeddeker_park: ['', ' % boeddeker_tree_points.size()'],
  so_what_egg: ['', ''],
};
test('drift: every burst arm of trigger_progress_cue is BURST_TEXT: title, detail, arguments and accent', () => {
  const parsed = arms();
  assert.deepEqual(Object.keys(B.BURST_TEXT), parsed.flatMap(a => a.ids), 'one BURST_TEXT entry per arm, in Godot order');
  assert.deepEqual(Object.keys(B.BURST_TEXT), AUDIBLE_CUES, 'the cues with a burst title are the chiming ones');
  for (const { ids: [id], body } of parsed) {
    const t = B.BURST_TEXT[id], lines = codeLines(body);
    if (id === 'programme_published') {
      inOrder(lines, [
        `burst_title = ${gd(t.futureTitle)} if not hosting_order.is_empty() else ${gd(t.title)}`,
        `burst_detail = ${gd(t.futureDetail)} if not hosting_order.is_empty() else ${gd(t.detail)}`,
        `burst_accent = Color("${t.accent}")`,
      ], id);
      continue;
    }
    const [titleArgs, detailArgs] = ARGS[id];
    const want = [`burst_title = ${gd(t.title)}${titleArgs}`, ...(id === 'tour_complete' ? ['var tour := landmark_tour_state()'] : []), `burst_detail = ${gd(t.detail)}${detailArgs}`];
    want.push(id === 'neighbor_visit' ? `burst_accent = Color(neighbors[matched_n_idx].coat).lightened(${gdNum(B.BANNER.coatLift)})` : `burst_accent = Color("${t.accent}")`);
    inOrder(lines, want, id);
  }
  // The neighbor's coat is found by the reason, Godot's name; the fallback accent is the cue default.
  inOrder(codeLines(burstPart), [`var burst_accent := Color("${B.CUE_ACCENT}")`, 'if String(neighbors[n_k].get("name", "")) == reason:'], 'the accent defaults');
  assert.equal(B.BURST_TEXT.neighbor_visit.accent, null, 'the coat, not a fixed accent');
});
test('drift: the milestone cues, the play condition and the suppression gate', () => {
  inOrder(codeLines(burstPart), [
    'if not burst_title.is_empty():',
    `trigger_feel_good_burst(burst_title, burst_detail, burst_pos, burst_accent, cue_id in ${JSON.stringify(B.MILESTONE_CUES).replace(/,/g, ', ')})`,
  ], 'the burst call');
  assert.match(cueBody, /^\tif not suppress_feel_good_burst:$/m);
  inOrder(codeLines(funcBody('trigger_feel_good_burst')), ['if suppress_feel_good_burst:', 'return'], 'trigger_feel_good_burst suppression');
});
test('drift: trigger_feel_good_burst, its keep_finale rules, the "* %s" title and the 3.2 s timer', () => {
  const N = B.BANNER;
  assert.match(MAIN, new RegExp(`^func trigger_feel_good_burst\\(title_str: String, detail_str: String, world_pos: Vector3, accent: Color = Color\\("${B.DEFAULT_ACCENT}"\\), milestone := false\\) -> void:$`, 'm'));
  inOrder(codeLines(funcBody('trigger_feel_good_burst')), [
    'reward_burst_count += 1',
    `var keep_finale := last_reward_title.begins_with("${N.finalePrefix}") and reward_banner != null and reward_banner_timer > ${gdNum(N.keepFinale)} and not title_str.begins_with("${N.finalePrefix}")`,
    'keep_finale = keep_finale or (reward_banner != null and reward_banner_timer > 0.0 and not reward_banner.visible and reward_banner_milestone and not milestone)',
    'if not keep_finale:', 'last_reward_title = title_str',
    'if reward_banner != null and not keep_finale:', 'reward_banner_milestone = milestone',
    `reward_banner_style.border_color = accent.lightened(${gdNum(N.borderLift)})`,
    `reward_title_label.text = ${gd(N.titleFormat)} % title_str`, 'reward_body_label.text = detail_str',
    'reward_banner.modulate = Color.WHITE', 'reward_banner.visible = true', `reward_banner_timer = ${gdNum(N.seconds)}`, 'layout_reward_banner()',
  ], 'trigger_feel_good_burst');
});
test('drift: update_celebration_burst counts down only while shown and unfocused, fades over 0.45 s and ends in the overview', () => {
  const f = gdNum(B.BANNER.fade);
  inOrder(codeLines(funcBody('update_celebration_burst')), [
    'if reward_banner != null and reward_banner_timer > 0.0:', 'layout_reward_banner()',
    'if not is_focused_activity_visible() and (reward_banner.visible or (header_details_expanded and not speech_opened_info)):',
    'reward_banner_timer -= delta',
    `if reward_banner_timer <= ${f}:`, `reward_banner.modulate = Color(1.0, 1.0, 1.0, clampf(reward_banner_timer / ${f}, 0.0, 1.0))`,
    'if reward_banner_timer <= 0.0 or in_overview or in_wide_overview:', 'reward_banner.visible = false', 'reward_banner_timer = 0.0',
  ], 'update_celebration_burst');
});
test('drift: layout_reward_banner places it at the top of the play area, around the player, hidden under a focused activity', () => {
  const W = B.BANNER.width;
  inOrder(codeLines(funcBody('layout_reward_banner')), [
    'if is_focused_activity_visible():', 'reward_banner.visible = false', 'return',
    'if reward_banner_timer <= 0.0:', 'reward_banner.visible = false', 'return',
    'var area := play_area_rect()',
    `var w := minf(${gdNum(W.max)}, maxf(${gdNum(W.min)}, area.size.x - ${gdNum(W.inset)}))`,
    `reward_banner.position = Vector2(area.position.x + (area.size.x - w) * 0.5, area.position.y + ${gdNum(B.BANNER.top)})`,
    'var fitted := fit_overlay_around_player(reward_banner.get_global_rect(), area)',
    'reward_banner.visible = not in_overview and not in_wide_overview and fitted.has_area()',
  ], 'layout_reward_banner');
});
test('drift: build_reward_banner colors, sizes and margins are BANNER_STYLE', () => {
  const S = B.BANNER_STYLE, body = codeLines(funcBody('build_reward_banner'));
  const bg = /reward_banner_style\.bg_color = Color\(([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\)/.exec(funcBody('build_reward_banner'));
  assert.ok(bg, 'bg_color');
  assert.equal(S.background, '#' + bg.slice(1).map(v => Math.round(Number(v) * 255).toString(16).padStart(2, '0')).join(''));
  inOrder(body, [
    `reward_banner_style.border_color = Color("${hex(S.border)}")`, `reward_banner_style.set_border_width_all(${S.borderWidth})`, `reward_banner_style.set_corner_radius_all(${S.radius})`,
    `reward_banner_style.content_margin_left = ${S.padX}`, `reward_banner_style.content_margin_right = ${S.padX}`, `reward_banner_style.content_margin_top = ${S.padY}`, `reward_banner_style.content_margin_bottom = ${S.padY}`,
    'reward_banner.mouse_filter = Control.MOUSE_FILTER_IGNORE', 'reward_banner.visible = false', `vbox.add_theme_constant_override("separation", ${S.gap})`,
    'reward_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER', `reward_title_label.add_theme_font_size_override("font_size", ${S.title.size})`, `reward_title_label.add_theme_color_override("font_color", Color("${hex(S.title.color)}"))`,
    'reward_body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER', `reward_body_label.max_lines_visible = ${S.body.lines}`, `reward_body_label.add_theme_font_size_override("font_size", ${S.body.size})`,
    `reward_body_label.add_theme_color_override("font_color", Color("${hex(S.body.color)}"))`,
  ], 'build_reward_banner');
  assert.equal(hex(S.border), B.DEFAULT_ACCENT);
});
test("drift: the side stories' direct bursts: Order Up, a find and the 10/10 finale's 4.5 s, and the gathering layout", () => {
  const E = GODOT_TEXT['main.gd'].eatery_counter_interact, I = GODOT_TEXT['main.gd'].inspect_neighborhood_surprise;
  inOrder(codeLines(funcBody('eatery_counter_interact')), ['if count == 1:', 'trigger_progress_cue("eatery_order", e_id)',
    `trigger_feel_good_burst(${gd(E.burst)} % item.capitalize(), ${gd(E.burstSub)} % [String(rec.get("name", "")), spark_count()], e_pos + Vector3.UP * 2.2, Color(String(rec.get("label_color", "ffe8a3"))))`], 'eatery_counter_interact');
  inOrder(codeLines(funcBody('inspect_neighborhood_surprise')), [
    `var burst_heading := (${gd(I.finale)} % title_str) if all_found else (${gd(I.found)} % title_str)`,
    'trigger_progress_cue("surprise_finale" if all_found else "surprise_discovery", s_id)', 'trigger_feel_good_burst(', 'burst_heading,', 'burst_sub,', 'world_pos + Vector3.UP * 2.2,', 'accent', ')',
    'if all_found and not suppress_feel_good_burst:', `reward_banner_timer = ${gdNum(B.BANNER.finale)}`,
  ], 'inspect_neighborhood_surprise');
  assert.ok(I.finale.startsWith(B.BANNER.finalePrefix), "the finale's heading is what keep_finale protects");
  const L = B.LAYOUT_BURST;
  inOrder(codeLines(funcBody('choose_gathering_layout')), ['if not (layout_id in GATHERING_LAYOUTS) or block_opened:', 'return false', 'gathering_layout = layout_id',
    `trigger_feel_good_burst(${gd(L.title)} % String(GATHERING_LAYOUT_TITLES[layout_id]), ${gd(L.detail)} % spark_count(), lay_pos, Color("${L.accents.table}") if layout_id == "table" else Color("${L.accents.floor}"))`], 'choose_gathering_layout');
  assert.deepEqual(JSON.parse(/^const GATHERING_LAYOUT_TITLES: Dictionary = (\{.*\})$/m.exec(MAIN)[1]), GATHERING_LAYOUT_TITLES);
  // The landmark tour waits for the banner, the 10/10 finale included (update_landmark_tour_completion).
  inOrder(codeLines(funcBody('update_landmark_tour_completion')), ['if reward_banner != null and reward_banner_timer > 0.0:', 'return', 'trigger_progress_cue("tour_complete", "All %d session stops" % int(tour.total))'], 'update_landmark_tour_completion');
  // No other direct call: the three above and the cue's own.
  assert.equal([...MAIN.matchAll(/^\t+trigger_feel_good_burst\(/gm)].length, 4, 'four calls of trigger_feel_good_burst');
});
test('drift: film_shot_title, the neighbors and their coats, and Color.lightened', () => {
  const labels = JSON.parse(/^const FILM_SHOT_LABELS: Dictionary = (\{[^}]*\})$/m.exec(MAIN)[1]);
  assert.deepEqual(Object.fromEntries(Object.entries(FILM_SHOTS).map(([id, s]) => [id, s.label])), labels);
  assert.match(funcBody('film_shot_title'), /return String\(FILM_SHOT_LABELS\.get\(shot_id, shot_id\)\)/);
  const people = [...MAIN.matchAll(/^\t\{"id": "(\w+)", "name": "(\w+)", .*"coat": Color\("([0-9a-f]{6})"\)/gm)].map(m => [m[1], m[2], m[3]]);
  assert.deepEqual(people, CHARACTER_PEOPLE.map(p => [p.id, p.name, hex(p.coat)]));
  // Godot Color.lightened(amount): each channel moves toward 1 by amount, alpha kept.
  assert.equal(B.lightened('#000000', 0.5), '#808080');
  assert.equal(B.lightened('ffffff', 0.3), '#ffffff');
  assert.equal(B.lightened('f8cc58', 0.15), '#f9d471');
  assert.equal(B.lightened('#c5874f', [0.28, 0.15]), '#dcb693', 'two lifts compose on the unrounded channels');
});
test('drift: BURST_WEB_OVERRIDES drop only the key hints 2D does not bind (Shift+Y, Q and the period)', () => {
  const T = B.BURST_TEXT;
  assert.deepEqual(B.BURST_WEB_OVERRIDES, {
    [T.keepsake_photo.detail]: '',
    [T.hosting_complete.detail]: 'Tenant circle and neighborhood short film unlocked',
    [T.civic_complete.detail]: "Every neighbor heard · 'The Open Seat' film short unlocked · Sparks: %d",
  });
  assert.deepEqual([T.keepsake_photo.detail, T.hosting_complete.detail, T.civic_complete.detail], ['Press Shift+Y anytime to export your block keepsake SVG', 'Tenant circle (Q) and neighborhood short film (.) unlocked', "Every neighbor heard · 'The Open Seat' film short (.) unlocked · Sparks: %d"]);
  for (const [from, to] of Object.entries(B.BURST_WEB_OVERRIDES)) if (to) assert.equal(to, from.replace(/ \((?:Q|\.)\)/g, ''), from);
});

// --- cueBurst over real fork cues (progressCues of core.js actions) and visit cues. ---
const run = (s, action) => { const after = applyAction(s, action); return { after, cues: progressCues(s, after, action) }; };
const lift = (accent, ...a) => B.lightened(accent, a);
function walk() {
  let s = initialState();
  const out = {};
  const step = (action, label = action.type) => { const r = run(s, action); out[label] = r.cues.map(c => B.cueBurst(c, B.cueValues(r.after))); s = r.after; return r; };
  step({ type: 'greet' }, 'bea');
  step({ type: 'meet', id: 'bea', talk: true }, 'bea-again');
  step({ type: 'meet', id: 'celeste', talk: true }, 'celeste');
  step({ type: 'mural', id: 'sun', col: 0, row: 0 }, 'sun');
  step({ type: 'mural', id: 'wave', col: 2, row: 1 }, 'wave');
  step({ type: 'mural', id: 'rise', col: 4, row: 0 }, 'rise');
  step({ type: 'soundcheck' }, 'rook');
  step({ type: 'history' }, 'history');
  step({ type: 'discover-blackhawk' }, 'blackhawk');
  return { out, s };
}
test('cueBurst: the opening cues read the fork state after the action, with Godot titles, details, accents and milestones', () => {
  const { out } = walk(), people = Object.fromEntries(CHARACTER_PEOPLE.map(p => [p.id, p.coat]));
  assert.deepEqual(out.bea, [{ title: 'New Neighbor Connected — Bea', detail: 'Neighbors Met: 1/5 · Groove: bass+brush (2/4 stems)', accent: people.bea, lift: [0.28], milestone: false }]);
  const coat = B.createBanner(); coat.trigger(out.bea[0]);
  assert.equal(coat.view().border, lift(people.bea, 0.28, 0.15), 'the coat lifted by 0.28, then by 0.15 for the border, unrounded between');
  assert.equal(coat.view().border, '#dcb693');
  assert.deepEqual(out['bea-again'], [null], 'a repeat visit is suppressed: no banner');
  assert.deepEqual(out.celeste, [{ title: 'Artist Spark — Connected with Celeste', detail: 'Sidewalk easel unlocked (2/5 neighbors met)', accent: '#ffb84d', milestone: false }]);
  assert.deepEqual(out.sun, [{ title: 'Mural Spark — Painted Sun Motif', detail: 'Easel progress: 1/3 motifs · Groove: bass+brush+chords (3/4 stems)', accent: '#ff9e5e', milestone: false }]);
  assert.equal(out.wave[0].detail, 'Easel progress: 2/3 motifs · Groove: bass+brush+chords (3/4 stems)');
  assert.deepEqual(out.rise, [{ title: 'Mural Complete — All 3 Motifs Shining!', detail: 'Harmonic pad stem unlocked · Groove: bass+brush+chords+lead (4/4 stems)', accent: '#ffd45e', milestone: true }]);
  assert.deepEqual(out.rook, [{ title: 'Soundcheck Locked In — Sidewalk Lead Stem Live!', detail: 'Rook dialed in the corner speaker · bass+brush+chords+lead (4/4 stems)', accent: '#6ec6ff', milestone: false }]);
  // Sparks: Bea, Celeste and Rook met, three motifs, the soundcheck and Compton's: 8; then the Black Hawk: 9.
  assert.deepEqual(out.history, [{ title: `Living History — ${HISTORY_REASONS.comptons}`, detail: "1966 Compton's Cafeteria Riot plaque at Turk & Taylor · Sparks: 8", accent: '#f5a3d0', milestone: false }]);
  assert.deepEqual(out.blackhawk, [{ title: `Jazz History — ${HISTORY_REASONS.blackhawk}`, detail: '1949–63 Black Hawk jazz club site at Turk & Hyde · Sparks: 9', accent: '#6ec6ff', milestone: false }]);
});
test('cueBurst: every later cue, its values and the web overrides', () => {
  const v = { met: 5, total: 5, stems: 'bass (1/4 stems)', motifs: 3, returned: 2, futureProgramme: false, hosted: 3, sparks: 21, frames: 2, eras: 3, tourCount: 12, tourTotal: 12, trees: 7 };
  const b = (id, reason, values = v) => B.cueBurst({ id, reason, suppressed: false }, values);
  assert.deepEqual(b('block_opened', CUE_REASONS.block_opened), { title: 'Turk Street Block Gathering Open!', detail: 'String lights, music, and neighbors fill the sidewalk', accent: '#ffe066', milestone: true });
  assert.deepEqual(b('keepsake_photo', '4 guests'), { title: 'Keepsake Moment — Group Photo Captured!', detail: '', accent: '#ff8ad8', milestone: false });
  assert.deepEqual(b('loan_returned', 'paint-case'), { title: 'Neighbor Care — Returned Paint-case', detail: 'Borrowed gear returned (2/3)', accent: '#9ef5e5', milestone: false });
  assert.deepEqual(b('programme_published', '4 segments'), { title: 'Evening Programme Published!', detail: 'All 4 block gathering segments scheduled on the board', accent: '#ffd45e', milestone: false });
  assert.deepEqual(b('programme_published', '4 segments', { ...v, futureProgramme: true }), { title: 'Future Programme Posted', detail: 'Running gathering keeps its copied order', accent: '#ffd45e', milestone: false });
  assert.deepEqual(b('hosting_segment', 'beats'), { title: 'Hosted Block Activity — beats', detail: 'Block hosting progress: 3/4 activities', accent: '#ffb84d', milestone: false }, "Godot's raw activity id, verbatim");
  assert.deepEqual(b('hosting_complete', '4/4 hosted'), { title: 'All 4 Block Gathering Events Hosted!', detail: 'Tenant circle and neighborhood short film unlocked', accent: '#ffe066', milestone: true });
  assert.deepEqual(b('civic_complete', 'x'), { title: 'Tenant Listening Circle Complete!', detail: "Every neighbor heard · 'The Open Seat' film short unlocked · Sparks: 21", accent: '#d9a2b2', milestone: true });
  assert.deepEqual(b('film_shot', 'paint'), { title: 'Film Frame Captured — A shared motif', detail: 'The Open Seat: 2/3 frames captured', accent: '#91bac2', milestone: false });
  assert.deepEqual(b('film_complete', 'x'), { title: 'Short Film Complete — The Open Seat (3/3)!', detail: 'All 3 storyboard frames captured · Sparks: 21', accent: '#ffe066', milestone: true });
  assert.deepEqual(b('museum_portal', 'Era'), { title: 'Archive Time-Portal — Era', detail: '398 Eddy St (Cadillac Hotel, 1907) · Session era 3/4', accent: '#7be0e6', milestone: false });
  assert.deepEqual(b('tour_complete', 'x'), { title: 'Neighborhood Tour Complete!', detail: '12/12 stops · 10 keepsakes\nThanks for exploring!', accent: '#ffe066', milestone: true });
  assert.deepEqual(b('boeddeker_park', 'x'), { title: 'Neighborhood Green — Boeddeker Park', detail: '240 Eddy St at Jones · 7 shade trees, lawn & play area', accent: '#7ce8b0', milestone: false });
  assert.deepEqual(b('so_what_egg', 'x'), { title: "Found 'So What'!", detail: '8th-floor corner bay window & 1961 Miles Davis awning', accent: '#ffd45e', milestone: false });
  // No burst title: no banner (the surprise and eatery cues' banners are their direct bursts).
  for (const id of ['surprise_discovery', 'surprise_finale', 'eatery_order', 'hosting_started', 'mural_palette', 'nope']) assert.equal(b(id, 'x'), null, id);
  assert.equal(B.cueBurst({ id: 'block_opened', reason: '', suppressed: true }, v), null, 'a suppressed cue shows nothing');
  assert.equal(B.cueBurst(null, v), null);
  assert.equal(B.cueBurst(visitCue('museum_portal', 'Era'), { ...v, eras: 1 }).detail, '398 Eddy St (Cadillac Hotel, 1907) · Session era 1/4');
  // A visit value that is missing is never invented: the cue shows no banner.
  assert.equal(b('museum_portal', 'Era', { ...v, eras: undefined }), null);
  assert.equal(b('tour_complete', 'x', { ...v, tourCount: undefined }), null);
  assert.equal(b('boeddeker_park', 'x', { ...v, trees: undefined }), null);
});
test('cueValues: counts from the fork state, the active stems and spark_count', () => {
  const { s } = walk();
  const v = B.cueValues(s);
  assert.deepEqual({ met: v.met, total: v.total, motifs: v.motifs, returned: v.returned, hosted: v.hosted, frames: v.frames, futureProgramme: v.futureProgramme, sparks: v.sparks, stems: v.stems },
    { met: 3, total: 5, motifs: 3, returned: 0, hosted: 0, frames: 0, futureProgramme: false, sparks: 9, stems: 'bass+brush+chords+lead (4/4 stems)' });
  assert.equal(B.cueValues({ ...s, surprises: ['jeffrey_record'] }).sparks, 10, 'surprises in the save count, as spark_count does');
  assert.deepEqual(['eras', 'tourCount', 'tourTotal', 'trees'].map(k => v[k]), [undefined, undefined, undefined, undefined], 'visit-only values come from the visit');
});
test('layoutBurst and directBurst: the gathering layout and the side stories, as Godot calls them', () => {
  assert.deepEqual(B.layoutBurst('table', 4), { title: 'Gathering Layout: Long Table', detail: 'Curb lane set up · Sidewalk route stays clear · Sparks: 4', accent: '#f8cc58', milestone: false });
  assert.deepEqual(B.layoutBurst('floor', 1), { title: 'Gathering Layout: Open Floor', detail: 'Curb lane set up · Sidewalk route stays clear · Sparks: 1', accent: '#5fd4ba', milestone: false });
  assert.equal(B.layoutBurst('nope', 1), null);
  assert.deepEqual(B.directBurst({ title: 'Order Up: Bagel', detail: 'X · Sparks: 3', accent: '#ffe8a3' }), { title: 'Order Up: Bagel', detail: 'X · Sparks: 3', accent: '#ffe8a3', milestone: false });
  assert.deepEqual(B.directBurst({ title: 'T', detail: 'D' }).accent, '#' + B.DEFAULT_ACCENT, "trigger_feel_good_burst's default accent");
  assert.equal(B.directBurst({ title: '', detail: 'D' }), null);
});

// --- The banner: trigger_feel_good_burst, update_celebration_burst and layout_reward_banner, on an injected clock (dt). ---
const SHOWN = { focused: false, overview: false, fits: true };
const tick = (banner, seconds, env = SHOWN, step = 1 / 60, reduced = false) => { let view; for (let t = 0; t < seconds - 1e-9; t += step) view = banner.step(Math.min(step, seconds - t), env, reduced); return view; };
test('banner: "* title", detail and the lifted border for 3.2 s, fading over the last 0.45 s (none under reduced motion)', () => {
  const banner = B.createBanner();
  assert.equal(banner.view().visible, false);
  assert.equal(banner.trigger({ title: 'Hello', detail: 'There', accent: '#ffd45e' }), true);
  banner.layout(SHOWN);
  let v = banner.view();
  assert.deepEqual([v.visible, v.title, v.detail, v.border, v.opacity, v.timer], [true, '* Hello', 'There', B.lightened('ffd45e', 0.15), 1, 3.2]);
  v = tick(banner, 2.7);
  assert.ok(v.visible && v.opacity === 1 && Math.abs(v.timer - 0.5) < 1e-9, `at 2.7 s: ${JSON.stringify(v)}`);
  v = tick(banner, 0.275);
  assert.ok(v.visible && Math.abs(v.opacity - 0.225 / 0.45) < 1e-9, `fading: ${v.opacity}`);
  v = tick(banner, 0.3);
  assert.deepEqual([v.visible, v.timer], [false, 0], 'gone after 3.2 s');
  assert.equal(banner.pending(), false);
  const calm = B.createBanner();
  calm.trigger({ title: 'Calm', detail: '' }); calm.layout(SHOWN);
  v = tick(calm, 3.0, SHOWN, 1 / 60, true);
  assert.deepEqual([v.visible, v.opacity], [true, 1], 'reduced motion: no fade');
  assert.equal(tick(calm, 0.25, SHOWN, 1 / 60, true).visible, false);
});
test('banner: a focused activity or no room holds it (the timer waits); the overview ends it', () => {
  const banner = B.createBanner();
  banner.trigger({ title: 'Held', detail: '' });
  banner.layout({ ...SHOWN, focused: true });
  let v = tick(banner, 10, { ...SHOWN, focused: true });
  assert.deepEqual([v.visible, v.timer], [false, 3.2], 'a dialog open: hidden, its full reading time kept');
  assert.equal(banner.pending(), true);
  v = tick(banner, 10, { ...SHOWN, fits: false });
  assert.deepEqual([v.visible, v.timer], [false, 3.2], 'no room around the player: queued, not spent');
  v = tick(banner, 1);
  assert.ok(v.visible && Math.abs(v.timer - 2.2) < 1e-9, 'it shows once the dialog closes');
  v = banner.step(1 / 60, { ...SHOWN, overview: true });
  assert.deepEqual([v.visible, v.timer], [false, 0], 'the overview ends it');
  banner.trigger({ title: 'Again', detail: '' }); banner.layout(SHOWN);
  banner.reset();
  assert.deepEqual([banner.view().visible, banner.view().timer, banner.pending()], [false, 0, false], 'a load or a restart clears it');
});
test('banner: keep_finale: a 10/10 finale over 1 s left, or a pending milestone, is not replaced by a lesser burst', () => {
  const banner = B.createBanner();
  banner.trigger({ title: '10/10 Surprises: Pip', detail: 'all' }); banner.hold(B.BANNER.finale); banner.layout(SHOWN);
  assert.equal(banner.view().timer, 4.5, 'the finale reads for 4.5 s');
  assert.equal(banner.trigger({ title: 'Order Up: Bagel', detail: 'x' }), false, 'a lesser burst keeps the finale');
  assert.equal(banner.view().title, '* 10/10 Surprises: Pip');
  tick(banner, 3.55);
  assert.equal(banner.trigger({ title: 'Order Up: Bagel', detail: 'x' }), true, 'at 1 s or less the next burst replaces it');
  assert.equal(banner.view().title, '* Order Up: Bagel');
  // A milestone waiting behind a dialog is kept from a lesser burst; another milestone replaces it.
  const m = B.createBanner();
  m.trigger({ title: 'Mural Complete', detail: '', milestone: true }); m.layout({ ...SHOWN, focused: true });
  assert.equal(m.trigger({ title: 'Soundcheck', detail: '' }), false);
  assert.equal(m.view().title, '* Mural Complete');
  assert.equal(m.trigger({ title: 'Open', detail: '', milestone: true }), true);
  m.layout(SHOWN);
  assert.equal(m.trigger({ title: 'Lesser', detail: '' }), true, 'a shown milestone gives way');
  // keep_finale still counts the burst (reward_burst_count).
  assert.equal(m.view().count, 4);
});
test('bannerRect: Godot width and top in the play area', () => {
  assert.deepEqual(B.bannerRect({ x: 8, y: 100, w: 1000, h: 400 }, 60), { x: 8 + (1000 - 460) / 2, y: 104, w: 460, h: 60 });
  assert.deepEqual(B.bannerRect({ x: 8, y: 100, w: 300, h: 400 }, 70), { x: 16, y: 104, w: 284, h: 70 });
  assert.deepEqual(B.bannerRect({ x: 0, y: 0, w: 100, h: 400 }, 70), { x: -40, y: 4, w: 180, h: 70 }, 'never under 180 px (fitAround then refuses it)');
});

// --- The page: index.html, style.css and game.js. ---
const HTML = read('browser-next/index.html'), CSS = read('browser-next/style.css'), GAME = read('browser-next/game.js'), WORLD_VISITS = read('browser-next/visits-world.js');
const rules = selector => [...CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => sel.trim().split(/\s*,\s*/).includes(selector)).map(m => m[2]);
const prop = (selector, name) => rules(selector).map(d => new RegExp(`(?:^|[;\\s])${name}\\s*:\\s*([^;!]+?)\\s*(?:!important)?\\s*(?:;|$)`).exec(d)?.[1]).filter(Boolean).at(-1);
const lum = h => { const c = [0, 2, 4].map(i => parseInt(hex(h).slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (rgba, under) => { const h = hex(rgba), a = parseInt(h.slice(6, 8), 16) / 255; return '#' + [0, 2, 4].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * a + parseInt(hex(under).slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, '0')).join(''); };
test('page: the banner sits in the map panel, aria-hidden, never takes a pointer, and has no CSS animation', () => {
  const panel = HTML.slice(HTML.indexOf('<section class="world-panel"'), HTML.indexOf('</section>', HTML.indexOf('<section class="world-panel"')));
  assert.match(panel, /<div id="reward-banner" class="reward-banner" aria-hidden="true" hidden><p id="reward-title" class="reward-title"><\/p><p id="reward-body" class="reward-body"><\/p><\/div>/);
  assert.equal(prop('.reward-banner', 'pointer-events'), 'none');
  assert.equal(prop('.reward-banner', 'position'), 'absolute');
  assert.equal(prop('.reward-banner[hidden]', 'display'), 'none');
  for (const sel of ['.reward-banner', '.reward-title', '.reward-body']) for (const name of ['transition', 'animation']) assert.equal(prop(sel, name), undefined, `${sel} ${name}`);
  assert.doesNotMatch(panel.slice(panel.indexOf('reward-banner')), /role="status"|aria-live/, 'never a live region: the fork already announces each step');
});
test('page: BANNER_STYLE is the CSS, and its small text is at least 4.5:1 on its own background over any map color', () => {
  const S = B.BANNER_STYLE;
  assert.equal(prop('.reward-banner', 'background'), S.background);
  assert.equal(prop('.reward-banner', 'border'), `${S.borderWidth}px solid ${S.border}`);
  assert.equal(prop('.reward-banner', 'border-radius'), `${S.radius}px`);
  assert.equal(prop('.reward-banner', 'padding'), `${S.padY}px ${S.padX}px`);
  assert.equal(prop('.reward-title', 'color'), S.title.color);
  assert.equal(prop('.reward-title', 'font-size'), `${S.title.size}px`);
  assert.equal(prop('.reward-body', 'color'), S.body.color);
  assert.equal(prop('.reward-body', 'font-size'), `${S.body.size}px`);
  assert.equal(prop('.reward-body', '-webkit-line-clamp'), String(S.body.lines));
  for (const under of ['#ffffff', '#000000', '#d8dac6']) for (const text of [S.title.color, S.body.color]) {
    const bg = over(S.background, under);
    assert.ok(ratio(text, bg) >= 4.5, `${text} on ${bg}: ${ratio(text, bg).toFixed(2)}:1`);
  }
});
test('game.js: a cue that chimes for a burst title shows its banner; loads, restarts and dialogs follow Godot', () => {
  assert.match(GAME, /import \{[^}]*\bcreateBanner\b[^}]*\} from '\.\/bursts\.js';/);
  const act = GAME.slice(GAME.indexOf('function act(action)'), GAME.indexOf('\nfunction show(html)'));
  assert.match(act, /const cues = progressCues\(before, next, action\);/);
  assert.match(act, /rewards\.play\(rewardFor\(cues, /);
  assert.match(act, /for \(const c of cues\) burst\(cueBurst\(c, values\)\);/);
  assert.match(act, /action\.type === 'layout'/);
  assert.match(GAME, /function resetSession\(\) \{[^\n]*banner\.reset\(\);/, 'a load or restart clears the banner');
  assert.match(GAME, /const focused = modal\.open, overview = !!world\?\.camera\.overviewMode;/,'any open dialog is a focused activity');
  assert.match(GAME, /chime: \(id, reason, values\) =>/);
  assert.match(GAME, /burst: spec =>/);
  assert.match(GAME, /rewardPending: \(\) => banner\.pending\(\)/);
  assert.match(GAME, /reward: bannerOnCanvas\(\)/, 'the speech bubble keeps clear of the banner (update_speech_bubble)');
  assert.doesNotMatch(GAME, /reward-banner'\)\.focus|#reward-banner'\)\.focus/);
});
test('visits-world.js: visit cues carry their values, the finds and first orders burst, and the tour waits for the banner', () => {
  assert.match(WORLD_VISITS, /host\.chime\(chime\[0\], chime\[1\], chime\[2\]\)/);
  assert.match(WORLD_VISITS, /host\.burst\?\.\(burst\)/);
  assert.match(WORLD_VISITS, /if \(safely\(\(\) => host\.rewardPending\?\.\(\), false\)\) return false;\n    const r = tourCompletion\(/);
  assert.match(WORLD_VISITS, /const burst = r\.newly \? \{ title: r\.heading, detail: r\.burstSub, accent: r\.accent, finale: r\.allFound \} : null;/);
  assert.match(WORLD_VISITS, /burst: r\.burst && \{ title: r\.burst\.heading, detail: r\.burst\.sub, accent: r\.burst\.color \}/);
});
