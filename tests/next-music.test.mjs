import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as sketch from '../browser-next/sketch-core.js';
import * as rewards from '../browser-next/rewards.js';
import * as rhythm from '../browser-next/rhythm.js';
import { SketchPlayer } from '../browser-next/sketch-player.js';
import { Soundtrack } from '../browser-next/soundtrack.js';
import { createRhythm } from '../browser-next/rhythm-ui.js';
import { initialState, applyAction, musicLayers } from '../browser-next/core.js';
import { segmentTitle } from '../browser-next/story.js';
import { buildGodotSave, freshEnvelope } from '../browser-next/godot-save.js';
import { sceneReceipt } from '../browser-next/ending/mural.js';
import { fakeDialog } from './next-fixtures.mjs';

// --- Godot sources, read at test time: a changed Godot number, line or string fails here. ---
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const GD = { main: read('godot/main.gd'), bar: read('godot/rhythm_bar.gd'), circle: read('godot/rhythm_circle.gd') };
function funcBody(file, name) {
  const src = GD[file], start = src.search(new RegExp(`^(?:static )?func ${name}\\(`, 'm'));
  assert.ok(start >= 0, `func ${name} is missing from ${file}`);
  const end = src.slice(start + 1).search(/^(?:static )?func /m);
  return src.slice(start, end < 0 ? src.length : start + 1 + end);
}
const unescape = s => s.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t' })[c] ?? c);
const literals = body => [...body.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map(m => unescape(m[1]));
const codeLines = body => body.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
function inOrder(lines, expected, label) {
  let at = -1;
  for (const want of expected) {
    const i = lines.findIndex((line, j) => j > at && line === want);
    assert.ok(i > at, `${label} moved or changed: ${want}`);
    at = i;
  }
}
const num = (src, re, label) => { const m = re.exec(src); assert.ok(m, `${label} is missing`); return Number(m[1]); };
const arrayLiteral = (src, re, label) => { const m = re.exec(src); assert.ok(m, `${label} is missing`); return JSON.parse(m[1]); };
const near = (a, b, eps, label) => assert.ok(Math.abs(a - b) <= eps, `${label}: ${a} vs ${b}`);
const TAU = Math.PI * 2;

// --- Drift: sketch constants and the per-sample formula. ---
test('drift: MUSIC_* constants and the 0.70 default volume match godot/main.gd', () => {
  assert.deepEqual(sketch.STEM_ORDER, arrayLiteral(GD.main, /^const MUSIC_STEM_ORDER: Array\[String\] = (\[.*\])$/m, 'MUSIC_STEM_ORDER'));
  assert.deepEqual(sketch.VOL_STEPS, arrayLiteral(GD.main, /^const MUSIC_VOL_STEPS: Array\[float\] = (\[.*\])$/m, 'MUSIC_VOL_STEPS'));
  assert.equal(sketch.MIX_RATE, num(GD.main, /^const MUSIC_MIX_RATE := ([\d.]+)$/m, 'MUSIC_MIX_RATE'));
  assert.equal(sketch.STEP_SEC, num(GD.main, /^const MUSIC_STEP_SEC := ([\d.]+)$/m, 'MUSIC_STEP_SEC'));
  assert.equal(sketch.DEFAULT_VOLUME, num(GD.main, /^var music_volume := ([\d.]+)$/m, 'music_volume'));
  assert.equal(sketch.BUFFER_SEC, num(funcBody('main', 'build_audio_players'), /sketch_generator\.buffer_length = ([\d.]+)/, 'buffer_length'));
  assert.equal(sketch.SAMPLES_PER_STEP, 8269);
  assert.equal(sketch.STEP_FRAMES, 8268.75);
  assert.equal(sketch.MAX_VOLUME, Math.max(...sketch.VOL_STEPS));
});

const clock = funcBody('main', 'advance_music_clock');
const CLOCK_LINES = [
  'var inv_rate := 1.0 / MUSIC_MIX_RATE',
  'var samples_per_step := maxi(1, int(round(MUSIC_STEP_SEC * MUSIC_MIX_RATE)))',
  'var sample_idx := sketch_frames_pushed + i',
  'var t := float(sample_idx) * inv_rate',
  'var step_total := int(sample_idx / samples_per_step)',
  'var step_idx := posmod(step_total, 8)',
  'var step_t := float(sample_idx % samples_per_step) * inv_rate',
  'var c0 := 220.0 if step_idx < 4 else 196.0',
  'var c1 := 261.63 if step_idx < 4 else 246.94',
  'var c2 := 329.63 if step_idx < 4 else 293.66',
  'var bass_f: float = bass_freqs[step_idx]',
  'var lead_f: float = lead_freqs[step_idx]',
  'var sig := sin(TAU * bass_f * t) * 0.24 + sin(TAU * bass_f * 2.0 * t) * 0.08',
  'if (unlocked_stem_mask & 2) != 0:',
  'var env := exp(-step_t * 14.0)',
  'sig += sin(TAU * 910.0 * t) * cos(TAU * 1430.0 * t) * env * 0.10',
  'if (unlocked_stem_mask & 4) != 0:',
  'var c_sig := (sin(TAU * c0 * t) + sin(TAU * c1 * t) + sin(TAU * c2 * t)) / 3.0',
  'sig += c_sig * 0.16',
  'if (unlocked_stem_mask & 8) != 0:',
  'sig += sin(TAU * lead_f * t + sin(TAU * 5.0 * t) * 0.25) * 0.14',
  'var sample := clampf(sig, -0.95, 0.95)',
];
test('drift: advance_music_clock lines, notes and gains are the ones sketch-core.js plays', () => {
  inOrder(codeLines(clock), CLOCK_LINES, 'advance_music_clock');
  assert.deepEqual(sketch.BASS, arrayLiteral(clock, /var bass_freqs: Array\[float\] = (\[.*\])/, 'bass_freqs'));
  assert.deepEqual(sketch.LEAD, arrayLiteral(clock, /var lead_freqs: Array\[float\] = (\[.*\])/, 'lead_freqs'));
  const chord = n => { const m = new RegExp(`var c${n} := ([\\d.]+) if step_idx < 4 else ([\\d.]+)`).exec(clock); return [Number(m[1]), Number(m[2])]; };
  const [c0, c1, c2] = [0, 1, 2].map(chord);
  assert.deepEqual(sketch.CHORD_A, [c0[0], c1[0], c2[0]]);
  assert.deepEqual(sketch.CHORD_G, [c0[1], c1[1], c2[1]]);
  const g = sketch.SKETCH_GAINS;
  assert.deepEqual([g.bass, g.bassOctave], [...clock.matchAll(/\* ([\d.]+)(?= \+| *$)/gm)].slice(0, 2).map(m => Number(m[1])));
  assert.equal(g.brushDecay, num(clock, /exp\(-step_t \* ([\d.]+)\)/, 'brush decay'));
  assert.deepEqual([g.brushA, g.brushB, g.brush], /sin\(TAU \* ([\d.]+) \* t\) \* cos\(TAU \* ([\d.]+) \* t\) \* env \* ([\d.]+)/.exec(clock).slice(1).map(Number));
  assert.equal(g.chords, num(clock, /sig \+= c_sig \* ([\d.]+)/, 'chord gain'));
  assert.deepEqual([g.vibratoHz, g.vibratoDepth, g.lead], /sin\(TAU \* lead_f \* t \+ sin\(TAU \* ([\d.]+) \* t\) \* ([\d.]+)\) \* ([\d.]+)/.exec(clock).slice(1).map(Number));
  assert.equal(g.clamp, num(clock, /clampf\(sig, -([\d.]+), [\d.]+\)/, 'clamp'));
});

// An independent evaluator built only from the numbers parsed out of main.gd.
function godotSketch() {
  const p = n => Number(n);
  const bass = arrayLiteral(clock, /var bass_freqs: Array\[float\] = (\[.*\])/, 'bass'), lead = arrayLiteral(clock, /var lead_freqs: Array\[float\] = (\[.*\])/, 'lead');
  const ch = [0, 1, 2].map(n => new RegExp(`var c${n} := ([\\d.]+) if step_idx < 4 else ([\\d.]+)`).exec(clock).slice(1).map(p));
  const [, b1, b2] = /sin\(TAU \* bass_f \* t\) \* ([\d.]+) \+ sin\(TAU \* bass_f \* 2\.0 \* t\) \* ([\d.]+)/.exec(clock).map(p);
  const decay = num(clock, /exp\(-step_t \* ([\d.]+)\)/, 'decay');
  const [, fa, fb, gb] = /sin\(TAU \* ([\d.]+) \* t\) \* cos\(TAU \* ([\d.]+) \* t\) \* env \* ([\d.]+)/.exec(clock).map(p);
  const gc = num(clock, /sig \+= c_sig \* ([\d.]+)/, 'gc');
  const [, vh, vd, gl] = /sin\(TAU \* lead_f \* t \+ sin\(TAU \* ([\d.]+) \* t\) \* ([\d.]+)\) \* ([\d.]+)/.exec(clock).map(p);
  const lim = num(clock, /clampf\(sig, -([\d.]+), [\d.]+\)/, 'lim');
  const rate = num(GD.main, /^const MUSIC_MIX_RATE := ([\d.]+)$/m, 'rate'), per = Math.max(1, Math.round(num(GD.main, /^const MUSIC_STEP_SEC := ([\d.]+)$/m, 'step') * rate));
  return (n, mask) => {
    const t = n * (1 / rate), step = Math.floor(n / per) % 8, st = (n % per) * (1 / rate), k = step < 4 ? 0 : 1;
    let sig = Math.sin(TAU * bass[step] * t) * b1 + Math.sin(TAU * bass[step] * 2 * t) * b2;
    if (mask & 2) sig += Math.sin(TAU * fa * t) * Math.cos(TAU * fb * t) * Math.exp(-st * decay) * gb;
    if (mask & 4) sig += (Math.sin(TAU * ch[0][k] * t) + Math.sin(TAU * ch[1][k] * t) + Math.sin(TAU * ch[2][k] * t)) / 3 * gc;
    if (mask & 8) sig += Math.sin(TAU * lead[step] * t + Math.sin(TAU * vh * t) * vd) * gl;
    return Math.min(lim, Math.max(-lim, sig));
  };
}
test('drift: sketchSample equals an evaluator built from the parsed main.gd numbers', () => {
  const ref = godotSketch();
  for (const mask of [1, 3, 5, 7, 9, 11, 13, 15]) for (let n = 0; n < 2 * sketch.BAR_SAMPLES + 500; n += 37) near(sketch.sketchSample(n, mask), ref(n, mask), 1e-12, `n=${n} mask=${mask}`);
  for (const n of [8268, 8269, 66151, 22050 * 600 + 3]) near(sketch.sketchSample(n, 15), ref(n, 15), 1e-12, `n=${n}`);
});

test('drift: recompute_music_stems rules and active_stem_summary text', () => {
  inOrder(codeLines(funcBody('main', 'recompute_music_stems')), [
    'var mask := 1 # "bass" always active',
    'if visited_neighbors.size() >= 1 or celeste_talk_count > 0 or rook_soundcheck_done:',
    'mask |= 2 # "brush"',
    'if mural_placements.size() >= 1 or celeste_talk_count > 0:',
    'mask |= 4 # "chords"',
    'if mural_completed or rook_soundcheck_done:',
    'mask |= 8 # "lead"',
  ], 'recompute_music_stems');
  assert.ok(funcBody('main', 'active_stem_summary').includes(`return "${sketch.MUSIC_TEXT.stemSummary}" % ["+".join(stems), stems.size(), MUSIC_STEM_ORDER.size()]`));
  const start = literals(funcBody('main', 'start_music_playback'));
  for (const key of ['playing', 'sketchTag', 'localTag']) assert.ok(start.includes(sketch.MUSIC_TEXT[key]), key);
  assert.ok(literals(funcBody('main', 'toggle_music_playback')).includes(sketch.MUSIC_TEXT.paused));
  assert.ok(literals(funcBody('main', 'cycle_music_volume')).includes(sketch.MUSIC_TEXT.volume));
  assert.ok(literals(funcBody('main', 'use_synth_sketch')).includes(sketch.MUSIC_TEXT.switched));
  // How Godot announces them (announce_a11y_status), which the fork's announcements build the same way.
  const M = sketch.MUSIC_TEXT, gd = s => `"${s.replace(/"/g, '\\"')}"`;
  inOrder(codeLines(funcBody('main', 'start_music_playback')), [
    `var mode_tag := (${gd(M.localTag)} + local_music_name) if music_mode == "local" else (${gd(M.sketchTag)} + active_stem_summary() + ")")`,
    `announce_a11y_status(${gd(M.playing)} % mode_tag)`,
  ], 'start_music_playback');
  inOrder(codeLines(funcBody('main', 'toggle_music_playback')), ['if music_playing:', 'stop_music_playback()', `announce_a11y_status(${gd(M.paused)})`, 'return start_music_playback()'], 'toggle_music_playback');
  inOrder(codeLines(funcBody('main', 'use_synth_sketch')), [`announce_a11y_status(${gd(M.switched)} % active_stem_summary())`], 'use_synth_sketch');
  inOrder(codeLines(funcBody('main', 'cycle_music_volume')), [`announce_a11y_status(${gd(M.volume)} % int(round(music_volume * 100.0)))`], 'cycle_music_volume');
  // Rook's panel calls them: Play Groove toggles, the sketch button switches (make_ui).
  inOrder(codeLines(funcBody('main', 'make_ui')), ['music_play_btn = music_button(m_row1, "Play Groove", func(): toggle_music_playback())', 'music_sketch_btn = music_button(m_row3, "80 BPM Sketch (Active)", func(): use_synth_sketch())'], 'make_ui music buttons');
});
test("music announcements: Godot's lines for the sketch, a local track, a pause and the switch back to the sketch", () => {
  assert.equal(sketch.playingAnnouncement({ mode: 'sketch', summary: sketch.stemSummary(3) }), 'Music playing: 80 BPM Sketch (bass+brush (2/4 stems)).');
  assert.equal(sketch.playingAnnouncement({ summary: sketch.stemSummary(1) }), 'Music playing: 80 BPM Sketch (bass (1/4 stems)).', 'the sketch is the default mode');
  assert.equal(sketch.playingAnnouncement({ mode: 'local', localName: 'neighbors $& $1.wav', summary: sketch.stemSummary(15) }), 'Music playing: Local: neighbors $& $1.wav.', 'a local track is named as chosen, without the stems');
  assert.equal(sketch.MUSIC_TEXT.paused, 'Music paused.');
  assert.equal(sketch.switchedAnnouncement(sketch.stemSummary(15)), "Switched Rook's Speaker to 80 BPM Synth Sketch (bass+brush+chords+lead (4/4 stems)).");
  assert.equal(sketch.switchedAnnouncement('$&'), "Switched Rook's Speaker to 80 BPM Synth Sketch ($&).");
});

test('drift: cycle_music_volume and the volume gain rule', () => {
  inOrder(codeLines(funcBody('main', 'cycle_music_volume')), [
    'var d := absf(MUSIC_VOL_STEPS[i] - music_volume)', 'if d < best_diff:',
    'music_volume = MUSIC_VOL_STEPS[posmod(best_idx + 1, MUSIC_VOL_STEPS.size())]',
  ], 'cycle_music_volume');
  inOrder(codeLines(funcBody('main', 'apply_music_volume_db')), ['var db := -80.0 if music_volume <= 0.0001 else linear_to_db(music_volume)'], 'apply_music_volume_db');
});

// --- Drift: reward cues. ---
const cueBody = funcBody('main', 'trigger_progress_cue');
const [arpPart, burstPart] = cueBody.split('\tif not suppress_feel_good_burst:');
function matchArms(part, indent) {
  const re = new RegExp(`^${indent}((?:"[a-z_]+"(?:, )?)+|_):$`, 'gm'), heads = [...part.matchAll(re)];
  return heads.map((m, i) => ({ ids: m[1] === '_' ? null : [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]), body: part.slice(m.index + m[0].length, heads[i + 1]?.index ?? part.length) }));
}
test('drift: every trigger_progress_cue arpeggio arm is CUE_ARPEGGIOS', () => {
  const arms = matchArms(arpPart, '\t\t');
  const freqs = body => [...body.matchAll(/cue_arpeggio_freqs = (\[.*\])/g)].map(m => JSON.parse(m[1]));
  const durs = body => [...body.matchAll(/cue_arpeggio_duration = ([\d.]+)/g)].map(m => Number(m[1]));
  const parsed = arms.filter(a => a.ids).map(a => {
    const f = freqs(a.body), d = durs(a.body);
    if (f.length === 1) return { ids: a.ids, freqs: f[0], duration: d[0] };
    const reasons = [...a.body.matchAll(/reason == "([a-z_]+)"/g)].map(m => m[1]);
    assert.equal(f.length, reasons.length + 1, 'one else arm');
    return { ids: a.ids, reasons: f.map((fr, i) => ({ reason: reasons[i] ?? null, freqs: fr, duration: d[i] })) };
  });
  assert.deepEqual(rewards.CUE_ARPEGGIOS, parsed);
  const fallback = arms.find(a => !a.ids);
  assert.deepEqual(rewards.DEFAULT_ARPEGGIO, { freqs: freqs(fallback.body)[0], duration: durs(fallback.body)[0] });
});
test('drift: AUDIBLE_CUES are the burst-title arms, EXTRA_SOUND_CUES the play condition, SILENT_CUES the rest', () => {
  const arms = matchArms(burstPart, '\t\t\t').filter(a => a.ids && /burst_title = /.test(a.body));
  assert.deepEqual(rewards.AUDIBLE_CUES, arms.flatMap(a => a.ids));
  inOrder(codeLines(burstPart), [
    `if not burst_title.is_empty() or cue_id in ${JSON.stringify(rewards.EXTRA_SOUND_CUES).replace(/,/g, ', ')}:`,
    'play_reward_sound(cue_id)',
  ], 'reward play condition');
  const raised = new Set();
  for (const m of GD.main.matchAll(/trigger_progress_cue\(("[a-z_]+")(?=,| if )(?: if [^"]+ else ("[a-z_]+"))?/g)) { raised.add(JSON.parse(m[1])); if (m[2]) raised.add(JSON.parse(m[2])); }
  assert.match(GD.main, /trigger_progress_cue\("history_" \+ stop_id, title_str\)/);
  assert.deepEqual(JSON.parse(/^const HISTORY_STOP_IDS: Array\[String\] = (\[.*\])$/m.exec(GD.main)[1]), Object.keys(rewards.HISTORY_REASONS));
  for (const id of Object.keys(rewards.HISTORY_REASONS)) raised.add(`history_${id}`);
  const sounding = new Set([...rewards.AUDIBLE_CUES, ...rewards.EXTRA_SOUND_CUES]);
  assert.deepEqual([...raised].filter(id => !sounding.has(id)).sort(), [...rewards.SILENT_CUES].sort());
  for (const id of rewards.SILENT_CUES) assert.equal(rewards.cueSounds(id), false, id);
});
test('drift: make_reward_sound and play_reward_sound', () => {
  inOrder(codeLines(funcBody('main', 'make_reward_sound')), [
    `var rate := ${rewards.REWARD_RATE}`,
    'var duration := clampf(cue_arpeggio_duration, 0.1, 0.75)',
    'var frames := int(ceil(duration * rate))',
    'var notes := maxi(1, cue_arpeggio_freqs.size())',
    'var note_duration := duration / notes',
    'var t := float(i) / rate',
    'var note := mini(int(t / note_duration), notes - 1)',
    'var local_t := t - note * note_duration',
    'var freq := cue_arpeggio_freqs[note] if not cue_arpeggio_freqs.is_empty() else 523.25',
    'var envelope := minf(local_t / 0.012, 1.0) * minf(maxf(0.0, note_duration - local_t) / 0.035, 1.0)',
    'var sample := (sin(TAU * freq * local_t) + 0.15 * sin(TAU * freq * 2.0 * local_t)) * envelope * 0.12',
    'pcm.encode_s16(i * 2, int(round(sample * 32767.0)))',
    'stream.loop_mode = AudioStreamWAV.LOOP_DISABLED',
  ], 'make_reward_sound');
  inOrder(codeLines(funcBody('main', 'play_reward_sound')), [
    'if not reward_sounds_enabled or not reward_audio_unlocked or suppress_feel_good_burst or reward_audio_player == null:',
    'reward_audio_player.stop()', 'reward_sound_count += 1', 'reward_sound_last_cue = cue_id',
  ], 'play_reward_sound');
  assert.match(funcBody('main', 'build_audio_players'), /reward_audio_player\.max_polyphony = 1/);
  assert.match(GD.main, /^var reward_sounds_enabled := true$/m);
  assert.match(GD.main, /^var reward_audio_unlocked := false$/m);
});
test('drift: Godot suppression rules for visits, Celeste and the soundcheck', () => {
  inOrder(codeLines(funcBody('main', 'talk_with_neighbor')), ['return check_sound_with_rook()', 'var first_visit := not visited_neighbors.has(n_id)', 'suppress_feel_good_burst = prev_sup or (not first_visit)', 'trigger_progress_cue("neighbor_visit", n.name)'], 'talk_with_neighbor');
  inOrder(codeLines(funcBody('main', 'finish_neighbor_arrival')), ['suppress_feel_good_burst = prev_sup_arr or (not newly_visited)', 'trigger_progress_cue("neighbor_visit", n.name)', 'if celeste_talk_count == 0:', 'celeste_talk_count = 1'], 'finish_neighbor_arrival');
  inOrder(codeLines(funcBody('main', 'talk_with_celeste')), ['celeste_talk_count += 1', 'suppress_feel_good_burst = prev_sup_cel or (celeste_talk_count != 1)', 'trigger_progress_cue("celeste_talk", "Celeste talk")'], 'talk_with_celeste');
  inOrder(codeLines(funcBody('main', 'check_sound_with_rook')), ['var was_sc_done := rook_soundcheck_done', 'suppress_feel_good_burst = prev_sup_rook or was_sc_done', 'trigger_progress_cue("rook_soundcheck", "Rook soundcheck")'], 'check_sound_with_rook');
  inOrder(codeLines(funcBody('main', 'place_mural_motif')), ['if mural_completed and not was_completed:', 'trigger_progress_cue("mural_complete", "3/3 motifs")', 'else:', 'trigger_progress_cue("mural_motif", motif_id)'], 'place_mural_motif');
  inOrder(codeLines(funcBody('main', 'read_history_stop')), ['if newly_discovered:', 'trigger_progress_cue("history_" + stop_id, title_str)'], 'read_history_stop');
  inOrder(codeLines(funcBody('main', 'host_complete_current')), ['if is_hosting_done():', 'trigger_progress_cue("hosting_complete", "4/4 hosted")', 'else:', 'trigger_progress_cue("hosting_segment", active)'], 'host_complete_current');
});
test('drift: fixed cue reasons and the history record names', () => {
  for (const [id, reason] of Object.entries(rewards.CUE_REASONS)) assert.ok(GD.main.includes(`trigger_progress_cue("${id}", "${reason}"`), `${id}: ${reason}`);
  const data = JSON.parse(read('godot/data/buildings.json'));
  for (const [id, reason] of Object.entries(rewards.HISTORY_REASONS)) assert.equal(data.history_stops.find(s => s.id === id).name, reason);
});
test('drift: the Sounds toggle text and the unlock rule', () => {
  const t = rewards.SOUNDS_TEXT;
  assert.ok(funcBody('main', 'set_reward_sounds_enabled').includes(`sounds_btn.text = "${t.on}" if enabled else "${t.off}"`));
  assert.ok(GD.main.includes(`sounds_btn.tooltip_text = "${t.tooltip}"`));
  assert.ok(funcBody('main', 'toggle_reward_sounds').includes(`announce_a11y_status("${t.announce}" % ("on" if reward_sounds_enabled else "off"))`));
  assert.ok(GD.main.includes('var sounds_val: Variant = env.get("reward_sounds", true)'));
  const lines = codeLines(GD.main);
  inOrder(lines, [
    'var key_activation: bool = event is InputEventKey and event.pressed and not event.echo and event.keycode not in [KEY_ESCAPE, KEY_SHIFT, KEY_CTRL, KEY_ALT, KEY_META]',
    'var mouse_activation: bool = event is InputEventMouseButton and event.pressed and event.button_index in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE]',
    'if key_activation or mouse_activation or (event is InputEventScreenTouch and not event.pressed):',
    'reward_audio_unlocked = true',
  ], 'reward unlock');
});
// An independent chime evaluator from the parsed make_reward_sound numbers.
test('drift: rewardSamples equals make_reward_sound for every arpeggio', () => {
  const body = funcBody('main', 'make_reward_sound');
  const [, lo, hi] = /clampf\(cue_arpeggio_duration, ([\d.]+), ([\d.]+)\)/.exec(body).map(Number);
  const [, att, rel] = /local_t \/ ([\d.]+), 1\.0\) \* minf\(maxf\(0\.0, note_duration - local_t\) \/ ([\d.]+)/.exec(body).map(Number);
  const [, harm, gain] = /\+ ([\d.]+) \* sin\(TAU \* freq \* 2\.0 \* local_t\)\) \* envelope \* ([\d.]+)/.exec(body).map(Number);
  const rate = num(body, /var rate := (\d+)/, 'rate');
  const ref = (freqs, dur) => {
    const d = Math.min(hi, Math.max(lo, dur)), frames = Math.ceil(d * rate), nd = d / freqs.length, out = [];
    for (let i = 0; i < frames; i++) { const t = i / rate, k = Math.min(Math.trunc(t / nd), freqs.length - 1), lt = t - k * nd, f = freqs[k];
      out.push((Math.sin(TAU * f * lt) + harm * Math.sin(TAU * f * 2 * lt)) * Math.min(lt / att, 1) * Math.min(Math.max(0, nd - lt) / rel, 1) * gain); }
    return out;
  };
  const all = [...rewards.CUE_ARPEGGIOS.flatMap(a => a.reasons || [a]), rewards.DEFAULT_ARPEGGIO, { freqs: [523.25], duration: 2 }, { freqs: [523.25, 659.25], duration: 0.01 }];
  for (const a of all) {
    const got = rewards.rewardSamples(a.freqs, a.duration), want = ref(a.freqs, a.duration);
    assert.equal(got.length, want.length);
    for (let i = 0; i < got.length; i++) near(got[i], want[i], 1e-7, `${a.freqs} @${i}`);
    const q = rewards.rewardSamples(a.freqs, a.duration, 22050, { quantize: true });
    for (let i = 0; i < q.length; i += 7) assert.equal(Math.round(q[i] * 32767), Math.round(want[i] * 32767));
  }
});

// --- Drift: the drum bar and the Rhythm Circle. ---
const BAR_LINES = [
  'var frames := int(RATE * STEP * 8)',
  'var step := int(float(i) / (RATE * STEP))',
  'var t := float(i) / RATE - step * STEP',
  'var attack := minf(t / 0.005, 1.0)',
  'var tail := maxf(0.0, 1.0 - t / 0.22)',
  'var phase := TAU * (125.0 * t + 2.4 * (1.0 - exp(-t * 35.0)))',
  'var value := attack * tail * tail * (sin(phase) * 0.36 + sin(TAU * 430.0 * t) * exp(-t * 60.0) * 0.06)',
  'data.encode_s16(i * 2, int(round(value * 32767.0)))',
];
test('drift: rhythm_bar.gd constants, template and step boundaries', () => {
  assert.equal(rhythm.RATE, num(GD.bar, /^const RATE := (\d+)$/m, 'RATE'));
  assert.equal(rhythm.STEP, num(GD.bar, /^const STEP := ([\d.]+)$/m, 'STEP'));
  inOrder(codeLines(funcBody('bar', 'prepare_template')), BAR_LINES, 'prepare_template');
  inOrder(codeLines(funcBody('bar', 'make_bar')), [
    'for step in range(8):', 'var first := int(ceil(step * RATE * STEP)) * 2', 'var last := int(ceil((step + 1) * RATE * STEP)) * 2',
    'data.append_array((hit_template if mask & (1 << step) else rest_template).slice(first,last))', 'wav.loop_mode = AudioStreamWAV.LOOP_DISABLED',
  ], 'make_bar');
  assert.equal(rhythm.BAR_FRAMES, 66150);
  assert.equal(rhythm.BAR_SECONDS, 3);
  const body = funcBody('bar', 'prepare_template');
  const p = re => Number(re.exec(body)[1]);
  const att = p(/t \/ ([\d.]+), 1\.0\)/), tl = p(/1\.0 - t \/ ([\d.]+)\)/), base = p(/TAU \* \(([\d.]+) \* t/), drop = p(/\+ ([\d.]+) \* \(1\.0 - exp/), k = p(/exp\(-t \* ([\d.]+)\)\)\)/);
  const [, g1, ping, pk, g2] = /sin\(phase\) \* ([\d.]+) \+ sin\(TAU \* ([\d.]+) \* t\) \* exp\(-t \* ([\d.]+)\) \* ([\d.]+)/.exec(body).map(Number);
  const hit = rhythm.hitTemplate();
  for (let i = 0; i < rhythm.BAR_FRAMES; i += 13) {
    const step = Math.trunc(i / (rhythm.RATE * rhythm.STEP)), t = i / rhythm.RATE - step * rhythm.STEP;
    const v = Math.min(t / att, 1) * Math.max(0, 1 - t / tl) ** 2 * (Math.sin(TAU * (base * t + drop * (1 - Math.exp(-t * k)))) * g1 + Math.sin(TAU * ping * t) * Math.exp(-t * pk) * g2);
    assert.equal(Math.round(hit[i] * 32767), Math.round(v * 32767), `frame ${i}`);
  }
});
test('drift: Rhythm Circle rules, colours and the step clock', () => {
  assert.ok(funcBody('circle', 'available').includes('return game.block_opened and (game.current_hosting_activity()=="beats" or game.has_hosted_segment("beats"))'));
  assert.ok(funcBody('circle', 'open_circle').includes('practice = game.current_hosting_activity()!="beats"'));
  assert.equal(rhythm.COLORS.hit, '#' + /^const HIT := Color\("([0-9a-f]+)"\)$/m.exec(GD.circle)[1]);
  assert.equal(rhythm.COLORS.rest, '#' + /^const REST := Color\("([0-9a-f]+)"\)$/m.exec(GD.circle)[1]);
  const world = codeLines(funcBody('circle', 'update_world'));
  inOrder(world, [
    'var stepping: bool = enabled and visible and step_cues and p!=0 and game.music_playing and game.music_volume>0.0 and game.music_mode=="sketch"',
    'var played_frames := maxf(0.0,float(game.sketch_frames_pushed)-queued_frames)',
    'var step: int = posmod(int(played_frames/(game.MUSIC_STEP_SEC*game.MUSIC_MIX_RATE)),8) if stepping else -1',
    'if audition_active(): step = clampi(int(audition.get_playback_position()/audition.STEP),0,7)',
    `if i==step and hit: col = Color("${rhythm.COLORS.lit.slice(1)}")`,
    `lamps[li][i].scale = Vector3.ONE * (${rhythm.COLORS.litScale} if i==step and hit else 1.0)`,
  ], 'update_world');
  inOrder(codeLines(funcBody('circle', 'play_bar')), [
    'if audition_active():', 'elif not game.reward_audio_unlocked:', 'elif not game.music_playing or game.music_volume<=0.0:', 'elif game.music_mode!="sketch":', 'elif pattern()==0:', 'game.sketch_player.volume_db = -80.0', 'audition.start_bar(pattern())',
  ], 'play_bar');
  assert.ok(funcBody('circle', 'tick').includes('if audition_active() and (not visible or not game.music_playing or game.music_volume<=0.0 or game.music_mode!="sketch"):'));
  assert.equal(rhythm.DEFAULT_PATTERN, num(funcBody('circle', 'pattern'), /get\("pattern",(\d+)\)/, 'pattern default'));
  assert.ok(funcBody('main', 'host_toggle_beat').includes('var pat := clampi(int(hosting_draft.get("pattern", 85)), 0, 255)'));
});
// Code-only literals in the ported functions (ids, node names, keys), never shown to a player.
const CODE_LITERALS = new Set(['', ' ', 'res://rhythm_bar.gd', 'beats', 'sketch', 'local', 'text', 'title', 'num', 'pattern', 'left', 'right', 'top', 'bottom', 'focus_neighbor_', 'normal', 'hover', 'pressed', 'hover_pressed', 'disabled', 'font_size', 'separation', 'h_separation', 'v_separation', 'normal_font_size', 'panel', 'RhythmCircle', '172c32', 'c29e66']);
const PORTED = ['setup', 'open_circle', 'close_circle', 'toggle_step', 'listen', 'complete', 'refresh', 'stop_audition', 'play_bar'];
test('drift: RHYTHM_TEXT is every player-facing literal of the ported rhythm_circle.gd functions', () => {
  const values = new Set(Object.values(rhythm.RHYTHM_TEXT));
  const godot = new Set(literals(GD.circle));
  for (const [key, value] of Object.entries(rhythm.RHYTHM_TEXT)) {
    if (key === 'saved') { assert.ok(funcBody('main', 'save_receipt').includes(`"${value}"`), 'save_receipt'); continue; }
    assert.ok(godot.has(value), `${key} is not a rhythm_circle.gd literal: ${JSON.stringify(value)}`);
  }
  for (const name of PORTED) for (const lit of literals(funcBody('circle', name))) {
    if (CODE_LITERALS.has(lit) && !values.has(lit)) continue;
    assert.ok(values.has(lit), `${name}: ${JSON.stringify(lit)} is missing from RHYTHM_TEXT`);
  }
  assert.ok(funcBody('circle', 'refresh').includes('"Explore the block"'));
});
test("drift: RHYTHM_WEB_OVERRIDES rewrites only the 3D View Circle and street-drag lines, and gives Play Bar a name that starts with its label", () => {
  const values = Object.values(rhythm.RHYTHM_TEXT), T = rhythm.RHYTHM_TEXT;
  assert.deepEqual(Object.keys(rhythm.RHYTHM_WEB_OVERRIDES).sort(), [T.openAnnounceTail, T.dragTail, T.playBarName].sort());
  for (const [godot, web] of Object.entries(rhythm.RHYTHM_WEB_OVERRIDES)) {
    assert.ok(values.includes(godot));
    if (godot === T.playBarName) continue;
    assert.match(godot, /View Circle|Drag the street/);
    assert.doesNotMatch(web, /View Circle|Drag the street/);
  }
  assert.equal(rhythm.RHYTHM_WEB_OVERRIDES[T.openAnnounceTail], T.openAnnounceTail.replace(' View Circle frames the visitors.', ''));
  // WCAG 2.5.3 label in name: Godot's accessibility_name "Play one bar of this rhythm" does not contain the visible "Play Bar",
  // so the fork's name is the visible label, then Godot's phrase unchanged. Stop Bar's "Stop bar audition" already starts with it.
  assert.equal(rhythm.rhythmText('playBarName'), `${T.playBar.replace('\n', ' ')}: ${T.playBarName}`);
  assert.ok(T.stopBarName.toLowerCase().startsWith(T.stopBar.replace('\n', ' ').toLowerCase()));
  for (const key of Object.keys(rhythm.RHYTHM_TEXT)) if (!Object.hasOwn(rhythm.RHYTHM_WEB_OVERRIDES, rhythm.RHYTHM_TEXT[key])) assert.equal(rhythm.rhythmText(key), rhythm.RHYTHM_TEXT[key]);
  assert.ok(!/rapid/.test(GD.circle), 'Godot marks no Rhythm Circle button rapid');
});

// --- Units: the sketch. ---
const GOLDEN = { 1: [0, 0.24369366198645448, 0.2387388951478807, 0.2706941768738811], 3: [0, 0.24384864443087034, 0.22859084247537617, 0.29423573219508614], 7: [0, 0.2469788969815129, 0.22756079580946512, 0.32144180199069616], 15: [0, 0.2095016462023418, 0.35974192770955016, 0.34036609295685333] };
const RMS = { 1: 0.17877279594302958, 3: 0.17939843977012376, 5: 0.19987445309557975, 7: 0.20043443264316554, 9: 0.2043506321536129, 11: 0.20499433300427028, 13: 0.22305556694304612, 15: 0.22364560986666313 };
test('sketchSample golden values and one-bar RMS per mask', () => {
  for (const [mask, values] of Object.entries(GOLDEN)) [0, 8268, 8269, 33076].forEach((n, i) => near(sketch.sketchSample(n, Number(mask)), values[i], 1e-9, `n=${n} mask=${mask}`));
  for (const [mask, rms] of Object.entries(RMS)) near(sketch.sketchRms(Number(mask)), rms, 1e-9, `rms mask=${mask}`);
  let peak = 0;
  for (let n = 0; n < sketch.BAR_SAMPLES * 2; n++) peak = Math.max(peak, Math.abs(sketch.sketchSample(n, 15)));
  assert.ok(peak <= 0.72, `the clamp never engages (${peak})`);
});
test('renderSketch is sample-exact at 22050 and resumes mid-bar', () => {
  const a = new Float32Array(1000), next = sketch.renderSketch(a, 5000, 15);
  assert.equal(next, 6000);
  for (let i = 0; i < a.length; i++) assert.equal(a[i], Math.fround(sketch.sketchSample(5000 + i, 15)));
  const b = new Float32Array(300); sketch.renderSketch(b, 5700, 15);
  assert.deepEqual([...b], [...a.slice(700)]);
  const c = new Float32Array(480); sketch.renderSketch(c, 48000, 15, 48000); // one second in at 48 kHz
  near(c[0], sketch.sketchSampleAt(22050, 1, 15), 1e-6, 'fallback rate');
});
test('stem mask: Godot rule over a state matrix, from the state and from musicLayers', () => {
  for (const visited of [[], ['bea']]) for (const celesteTalks of [0, 1]) for (const soundcheck of [false, true]) for (const motifs of [0, 1, 3]) {
    const s = { ...initialState(), visited, celesteTalks, soundcheck, mural: Object.fromEntries(['sun', 'wave', 'rise'].slice(0, motifs).map((id, i) => [id, { col: i, row: 0 }])) };
    const want = 1 | (visited.length >= 1 || celesteTalks > 0 || soundcheck ? 2 : 0) | (motifs >= 1 || celesteTalks > 0 ? 4 : 0) | (motifs === 3 || soundcheck ? 8 : 0);
    assert.equal(sketch.stemMaskOf(s), want);
    assert.equal(sketch.stemMask(musicLayers(s)), want);
  }
  assert.equal(sketch.stemSummary(1), 'bass (1/4 stems)');
  assert.equal(sketch.stemSummary(11), 'bass+brush+lead (3/4 stems)');
  assert.equal(sketch.stemSummary(15), 'bass+brush+chords+lead (4/4 stems)');
});
test('volume: Godot cycle, the 0.70 default, kept preferences, dB and the announcement', () => {
  let v = 0.70; const seen = [];
  for (let i = 0; i < 5; i++) { v = sketch.nextVolume(v); seen.push(v); }
  assert.deepEqual(seen, [1.0, 0.35, 0.0, 0.70, 1.0]);
  assert.equal(sketch.nextVolume(0.5), 0.0); // nearest is 0.35, so the step after it
  assert.equal(sketch.nextVolume(0.8), 1.0);
  assert.equal(sketch.cleanVolume(undefined), 0.70);
  assert.equal(sketch.cleanVolume('0.4'), 0.70);
  assert.equal(sketch.cleanVolume(0.35), 0.35);
  assert.equal(sketch.cleanVolume(0.8), 0.8);
  assert.equal(sketch.cleanVolume(4), 1.0);
  assert.equal(sketch.cleanVolume(-1), 0);
  assert.equal(sketch.volumeDb(0), -80);
  near(sketch.volumeDb(0.5), -6.0206, 1e-4, 'dB');
  // Godot "Music volume %d%%." % int(round(music_volume * 100.0)), at every step and between them. 0.57 * 100 is
  // 56.99999999999999 and 0.995 * 100 is 99.5, so only rounding (not floor or trunc) says 57% and 100%.
  assert.deepEqual([0, 0.05, 0.35, 0.57, 0.7, 0.995, 1].map(sketch.volumeAnnouncement), ['Music volume 0%.', 'Music volume 5%.', 'Music volume 35%.', 'Music volume 57%.', 'Music volume 70%.', 'Music volume 100%.', 'Music volume 100%.']);
});
test('step clock: queued frames, 8268.75-frame steps and the audition step', () => {
  assert.equal(sketch.stepAt(0, sketch.QUEUED_FRAMES), 0);
  assert.equal(sketch.stepAt(8268, 0), 0);
  assert.equal(sketch.stepAt(8269, 0), 1);
  assert.equal(sketch.stepAt(8 * 8268.75, 0), 0);
  assert.equal(sketch.stepAt(5512.5 + 8268.75 * 3, 5512.5), 3);
  assert.equal(sketch.auditionStep(0), 0);
  assert.equal(sketch.auditionStep(0.374), 0);
  assert.equal(sketch.auditionStep(0.375), 1);
  assert.equal(sketch.auditionStep(9), 7);
});

// --- Units: the worklet and the player, with stand-in Web Audio objects. ---
test('worklet: renders renderSketch, holds its clock while paused and follows the mask', async () => {
  let Processor = null;
  globalThis.AudioWorkletProcessor = class { constructor() { this.port = { posted: [], postMessage(m) { this.posted.push(m); } }; } };
  globalThis.registerProcessor = (name, cls) => { assert.equal(name, 'tenderloin-sketch'); Processor = cls; };
  globalThis.sampleRate = 22050;
  try {
    await import('../browser-next/sketch-worklet.js');
    const p = new Processor(), out = () => [[new Float32Array(128)]];
    let o = out(); p.process([], o); assert.ok(o[0][0].every(x => x === 0)); assert.equal(p.n, 0);
    p.port.onmessage({ data: { mask: 15, playing: true } });
    for (let q = 0; q < 3; q++) { o = out(); p.process([], o); const want = new Float32Array(128); sketch.renderSketch(want, q * 128, 15); assert.deepEqual(o[0][0], want); }
    p.port.onmessage({ data: { playing: false } }); o = out(); p.process([], o); assert.equal(p.n, 384);
    p.port.onmessage({ data: { playing: true, mask: 0 } }); assert.equal(p.mask, 1, 'bass is always on');
    o = out(); p.process([], o); const want = new Float32Array(128); sketch.renderSketch(want, 384, 1); assert.deepEqual(o[0][0], want);
    const q = new Processor({ processorOptions: { mask: 7, playing: true, position: 8200 } });
    o = out(); q.process([], o); const from = new Float32Array(128); sketch.renderSketch(from, 8200, 7); assert.deepEqual(o[0][0], from, 'options apply before the first quantum');
  } finally { delete globalThis.AudioWorkletProcessor; delete globalThis.registerProcessor; delete globalThis.sampleRate; }
});
function fakeContext(sampleRate = 22050) {
  const ctx = { sampleRate, currentTime: 0, state: 'running', outputLatency: 0, baseLatency: 0, destination: {}, started: [], resume: async () => {}, close() {},
    createGain: () => ({ gain: { value: 1, setTargetAtTime(v) { this.value = v; } }, connect() {}, disconnect() {} }),
    createBuffer: (ch, len, rate) => ({ len, rate, data: null, copyToChannel(d) { this.data = d; } }),
    createBufferSource: () => { const s = { connect() {}, disconnect() {}, stopped: false, start() { ctx.started.push(s); }, stop() { s.stopped = true; } }; return s; },
  };
  return ctx;
}
test('SketchPlayer: linear gain to 1.0, mute for the drum bar, mask and position', () => {
  const player = new SketchPlayer();
  assert.equal(player.volume, 0.70);
  player.context = fakeContext(); player.master = player.context.createGain();
  player.enabled = true; player.setVolume(1.4); assert.equal(player.volume, 1.0); assert.equal(player.master.gain.value, 1.0);
  player.setVolume(0.5); assert.equal(player.master.gain.value, 0.5);
  player.mute(true); assert.equal(player.master.gain.value, 0); player.mute(false); assert.equal(player.master.gain.value, 0.5);
  player.update({ layout: true, tidy: true, opened: true }); assert.equal(player.mask, 11);
  player.reported = { n: 10000, at: 0 }; player.context.currentTime = 0.1; player.context.outputLatency = 0.02;
  assert.equal(player.position(), Math.floor(10000 + 0.1 * 22050 - 0.02 * 22050));
  player.context.sampleRate = 44100; player.reported = { n: 44100, at: 0.1 }; player.context.outputLatency = 0;
  assert.equal(player.position(), 22050);
  player.enabled = false; player.applyGain(); assert.equal(player.master.gain.value, 0);
});
// Swaps the Web Audio globals for one test and restores them after.
async function withAudio(globals, fn) {
  const saved = Object.fromEntries(Object.keys(globals).map(key => [key, globalThis[key]]));
  Object.assign(globalThis, globals);
  try { await fn(); } finally { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
}
const flush = async () => { for (let i = 0; i < 20; i++) await null; };
// Chrome refuses a context past its hardware limit, and a context can fail half-built: either way the music stays off, a chime
// is counted silently as Godot counts it without an audio device, and Play Bar does nothing instead of throwing.
test('a refused AudioContext never aborts an action: no context, no music, a silent chime, a quiet Play Bar', async () => {
  const made = [], closed = [];
  class Refused { constructor() { throw new DOMException('The number of hardware contexts provided (6) is greater than or equal to the maximum bound (6).', 'NotSupportedError'); } }
  class NoGain { constructor() { this.destination = {}; made.push(this); } createGain() { throw new DOMException('No gain', 'InvalidStateError'); } close() { closed.push(this); return Promise.resolve(); } }
  const practice = hostedState(3), refusing = new rewards.RewardPlayer(() => { throw new DOMException('Refused', 'NotSupportedError'); });
  refusing.unlock({ type: 'keydown', key: 'e', repeat: false, isTrusted: true });
  assert.equal(refusing.play({ id: 'mural_motif', reason: 'sun', sounds: true }), true, 'a context getter that throws is a silent chime');
  assert.deepEqual([refusing.count, refusing.lastCue], [1, 'mural_motif']);
  for (const Context of [Refused, NoGain]) await withAudio({ AudioContext: Context }, async () => {
    const player = new SketchPlayer();
    assert.equal(player.ensureContext(), null, `${Context.name}: ensureContext returns null`);
    assert.deepEqual([player.context, player.master], [null, null], `${Context.name}: nothing half-built is kept`);
    assert.equal(await player.start(), false, `${Context.name}: the music does not start`);
    const music = new Soundtrack({ sketch: player, hidden: () => false });
    assert.deepEqual([await music.start(), music.error], [false, 'Audio is unavailable in this browser. All activities still work.']);
    const chimes = new rewards.RewardPlayer(() => player.ensureContext());
    chimes.unlock({ type: 'keydown', key: 'e', repeat: false, isTrusted: true });
    assert.equal(chimes.play({ id: 'neighbor_visit', reason: 'Bea', sounds: true }), true, `${Context.name}: the chime does not throw`);
    assert.deepEqual([chimes.count, chimes.lastCue], [1, 'neighbor_visit'], `${Context.name}: the count and last cue still advance`);
    const dialog = fakeDialog(), statuses = [];
    const circle = createRhythm({ ...dialog, getState: () => practice, show: dialog.show, status: text => statuses.push(text), toast() {}, act: () => true, music: { enabled: true, starting: false, fileName: '', sketch: player },
      volume: () => 0.7, unlocked: () => true, toggleMusic: async () => {}, receipt: () => 'Saved in this browser.', objective: () => '', sparks: () => 0, stopWalk() {}, lastChapter: () => false, afterClose: () => dialog.close() });
    assert.equal(circle.open('block'), true);
    dialog.click('rhythm-play-bar');
    assert.deepEqual([circle.auditioning, player.muted], [false, false], `${Context.name}: Play Bar plays nothing and leaves the sketch unmuted`);
  });
  assert.ok(made.length > 0 && closed.length === made.length, 'every half-built context is closed');
});
test('SketchPlayer builds one node when start, stop and start overlap while the worklet module loads', async () => {
  for (const loads of [true, false]) {
    const nodes = [], modules = [];
    class Node { constructor() { this.connected = 0; this.port = { postMessage() {} }; nodes.push(this); } connect() { this.connected++; } disconnect() { this.connected = 0; } }
    class Context {
      constructor() { this.sampleRate = 22050; this.currentTime = 0; this.destination = {}; this.audioWorklet = { addModule: () => new Promise((resolve, reject) => modules.push({ resolve, reject })) }; }
      createGain() { return { gain: { value: 0, setTargetAtTime(v) { this.value = v; } }, connect() {} }; }
      createScriptProcessor() { return new Node(); }
      resume() { return Promise.resolve(); }
    }
    await withAudio({ AudioContext: Context, AudioWorkletNode: Node }, async () => {
      const player = new SketchPlayer(), first = player.start();
      await flush(); player.stop();
      const second = player.start();
      await flush();
      assert.equal(modules.length, 1, 'the second start waits for the module the first is loading');
      if (loads) modules[0].resolve(); else modules[0].reject(Error('network'));
      assert.deepEqual(await Promise.all([first, second]), [null, true], 'the stopped start gives way to the second');
      assert.deepEqual([nodes.length, nodes[0].connected, player.node === nodes[0], player.engine], [1, 1, true, loads ? 'worklet' : 'script'], `one node (${loads ? 'worklet' : 'ScriptProcessor fallback'})`);
      if (!loads) { nodes[0].onaudioprocess({ outputBuffer: { getChannelData: () => new Float32Array(1024) } }); assert.equal(player.k, 1024, 'one quantum advances the sketch by 1024 samples'); }
    });
  }
});

// --- Units: rewards. ---
test('rewardSamples: length, the 0.138 peak bound and the arpeggio lookup', () => {
  for (const a of [...rewards.CUE_ARPEGGIOS.flatMap(x => x.reasons || [x]), rewards.DEFAULT_ARPEGGIO]) {
    const pcm = rewards.rewardSamples(a.freqs, a.duration);
    assert.equal(pcm.length, Math.ceil(a.duration * 22050));
    assert.ok(Math.max(...pcm.map(Math.abs)) <= 0.138);
    assert.equal(pcm[0], 0);
  }
  assert.equal(rewards.rewardSamples([440], 5).length, Math.ceil(0.75 * 22050));
  assert.equal(rewards.rewardSamples([440], 0).length, Math.ceil(0.1 * 22050));
  assert.deepEqual(rewards.cueArpeggio('neighbor_visit', 'Bea'), { freqs: [523.25, 659.25, 783.99], duration: 0.40 });
  assert.deepEqual(rewards.cueArpeggio('rook_soundcheck', 'Rook soundcheck'), { freqs: [659.25, 830.61, 987.77], duration: 0.48 });
  assert.deepEqual(rewards.cueArpeggio('surprise_discovery', 'mayor_pomp_event'), { freqs: [392.00, 493.88, 587.33], duration: 0.62 });
  assert.deepEqual(rewards.cueArpeggio('surprise_discovery', 'clown_horn_walker'), { freqs: [440.00, 554.37, 659.25], duration: 0.42 });
  assert.deepEqual(rewards.cueArpeggio('mural_complete'), { freqs: [523.25, 659.25, 1046.50], duration: 0.56 });
});
const step = (s, action) => { const after = applyAction(s, action); return { after, cues: rewards.progressCues(s, after, action) }; };
const ids = cues => cues.map(c => `${c.id}${c.sounds ? '' : ':quiet'}`);
test('progressCues: visits, Celeste and the soundcheck follow Godot suppression', () => {
  let s = initialState(), r;
  r = step(s, { type: 'meet', id: 'bea' }); assert.deepEqual(ids(r.cues), ['neighbor_visit']); assert.equal(r.cues[0].reason, 'Bea'); s = r.after;
  r = step(s, { type: 'meet', id: 'bea' }); assert.deepEqual(ids(r.cues), ['neighbor_visit:quiet']);
  r = step(s, { type: 'meet', id: 'bea', talk: true }); assert.deepEqual(ids(r.cues), ['neighbor_visit:quiet']);
  // Celeste: an arrival sets the count to 1 without a talk cue, so the later talk stays quiet.
  r = step(s, { type: 'meet', id: 'celeste' }); assert.deepEqual(ids(r.cues), ['neighbor_visit']); const arrived = r.after;
  r = step(arrived, { type: 'meet', id: 'celeste', talk: true }); assert.deepEqual(ids(r.cues), ['celeste_talk:quiet']); assert.equal(r.after.celesteTalks, 2);
  // Talking first sounds the talk, not a visit.
  r = step(s, { type: 'meet', id: 'celeste', talk: true }); assert.deepEqual(ids(r.cues), ['celeste_talk']); assert.equal(r.cues[0].reason, 'Celeste talk');
  r = step(r.after, { type: 'meet', id: 'celeste', talk: true }); assert.deepEqual(ids(r.cues), ['celeste_talk:quiet']);
  // Rook: arriving is a visit; the first soundcheck chimes once; talking to Rook is the soundcheck.
  r = step(s, { type: 'meet', id: 'rook' }); assert.deepEqual(ids(r.cues), ['neighbor_visit']);
  r = step(r.after, { type: 'soundcheck' }); assert.deepEqual(ids(r.cues), ['rook_soundcheck']);
  r = step(r.after, { type: 'soundcheck' }); assert.deepEqual(ids(r.cues), ['rook_soundcheck:quiet']);
  r = step(s, { type: 'meet', id: 'rook', talk: true }); assert.deepEqual(ids(r.cues), ['rook_soundcheck']);
  assert.deepEqual(rewards.progressCues(s, s, { type: 'meet', id: 'nobody' }), []);
});
test('progressCues: mural motifs, moves and completion; silent palette', () => {
  let s = initialState(), r;
  r = step(s, { type: 'mural', id: 'sun', col: 0, row: 0 }); assert.deepEqual(ids(r.cues), ['mural_motif']); assert.equal(r.cues[0].reason, 'sun'); s = r.after;
  r = step(s, { type: 'mural', id: 'sun', col: 1, row: 0 }); assert.deepEqual(ids(r.cues), ['mural_motif'], 'a move chimes'); s = r.after;
  r = step(s, { type: 'mural', id: 'sun', col: 1, row: 0 }); assert.deepEqual(ids(r.cues), ['mural_motif'], 'Godot re-places in place too');
  r = step(s, { type: 'mural', id: 'wave', col: 1, row: 0 }); assert.deepEqual(r.cues, [], 'an occupied cell is refused');
  r = step(s, { type: 'mural', id: 'wave', col: 2, row: 0 }); s = r.after;
  r = step(s, { type: 'mural', id: 'rise', col: 3, row: 0 }); assert.deepEqual(ids(r.cues), ['mural_complete']); s = r.after;
  r = step(s, { type: 'mural', id: 'rise', col: 4, row: 0 }); assert.deepEqual(ids(r.cues), ['mural_motif'], 'after completion a move is a motif again');
  r = step(s, { type: 'palette', value: 'ocean' }); assert.deepEqual(ids(r.cues), ['mural_palette:quiet']);
  r = step(s, { type: 'palette', value: 'nope' }); assert.deepEqual(r.cues, []);
});
function readyState() {
  let s = initialState();
  for (const id of ['bea', 'celeste', 'rook', 'dez', 'thanh']) s = applyAction(s, { type: 'meet', id });
  s = applyAction(s, { type: 'soundcheck' });
  ['sun', 'wave', 'rise'].forEach((id, col) => { s = applyAction(s, { type: 'mural', id, col, row: 0 }); });
  return s;
}
function hostedState(until = 4) {
  let s = applyAction(readyState(), { type: 'open' });
  for (const id of ['stories', 'pause', 'beats', 'art']) s = applyAction(s, { type: 'programme-add', id });
  s = applyAction(s, { type: 'programme-publish' });
  s = applyAction(s, { type: 'host-start' });
  for (let i = 0; i < until; i++) s = applyAction(s, { type: 'host-complete', id: s.hosting.order[i] });
  return s;
}
test('progressCues: the ending chain, history and loans', () => {
  let s = readyState(), r;
  r = step(s, { type: 'history' }); assert.deepEqual(ids(r.cues), ['history_comptons']); assert.equal(r.cues[0].reason, "Compton's Corner (Turk & Taylor)");
  r = step(r.after, { type: 'history' }); assert.deepEqual(r.cues, [], 'only when newly discovered');
  r = step(s, { type: 'discover-blackhawk' }); assert.deepEqual(ids(r.cues), ['history_blackhawk']);
  r = step(s, { type: 'open' }); assert.deepEqual(ids(r.cues), ['block_opened']); s = r.after;
  r = step(s, { type: 'photo', participants: ['bea', 'dez'] }); assert.deepEqual(ids(r.cues), ['keepsake_photo']); assert.equal(r.cues[0].reason, '2 guests');
  r = step(s, { type: 'programme-add', id: 'stories' }); assert.deepEqual(r.cues, []);
  let h = s; for (const id of ['stories', 'pause', 'beats', 'art']) h = applyAction(h, { type: 'programme-add', id });
  r = step(h, { type: 'programme-publish' }); assert.deepEqual(ids(r.cues), ['programme_published']); h = r.after;
  r = step(h, { type: 'programme-publish' }); assert.deepEqual(r.cues, [], 'an unchanged programme does not publish');
  r = step(h, { type: 'host-start' }); assert.deepEqual(ids(r.cues), ['hosting_started:quiet']); assert.equal(r.cues[0].reason, 'stories'); h = r.after;
  for (let i = 0; i < 3; i++) { r = step(h, { type: 'host-complete', id: h.hosting.order[i] }); assert.deepEqual(ids(r.cues), ['hosting_segment']); assert.equal(r.cues[0].reason, h.hosting.order[i]); h = r.after; }
  r = step(h, { type: 'host-complete', id: 'art' }); assert.deepEqual(ids(r.cues), ['hosting_complete']); h = r.after;
  r = step(h, { type: 'civic-start' }); assert.deepEqual(ids(r.cues), ['civic_planning:quiet']); h = r.after;
  r = step(h, { type: 'civic-open' }); assert.deepEqual(ids(r.cues), ['civic_meeting:quiet']); assert.equal(r.cues[0].reason, 'repairs'); h = r.after;
  r = step(h, { type: 'civic-close' }); assert.deepEqual(ids(r.cues), ['civic_complete']); h = r.after;
  r = step(h, { type: 'film-start' }); assert.deepEqual(ids(r.cues), ['film_planning:quiet']); h = r.after;
  r = step(h, { type: 'film-roll' }); assert.deepEqual(r.cues, []); h = r.after;
  r = step(h, { type: 'film-clear' }); assert.deepEqual(ids(r.cues), ['film_shooting:quiet']); assert.equal(r.cues[0].reason, 'seat'); h = r.after;
  for (const id of ['seat', 'paint']) { r = step(h, { type: 'film-capture', id }); assert.deepEqual(ids(r.cues), ['film_shot']); assert.equal(r.cues[0].reason, id); h = r.after; }
  r = step(h, { type: 'film-capture', id: 'welcome' }); assert.deepEqual(ids(r.cues), ['film_complete']);
  r = step(s, { type: 'pack' }); assert.deepEqual(ids(r.cues), ['epilogue_packing:quiet']); const packed = r.after;
  r = step(packed, { type: 'return-loan', id: 'speaker' }); assert.deepEqual(ids(r.cues), ['loan_returned']); assert.equal(r.cues[0].reason, 'speaker');
  r = step(r.after, { type: 'return-loan', id: 'speaker' }); assert.deepEqual(r.cues, []);
});
test('progressCues: a load, a move or an unknown action raises nothing', () => {
  const s = readyState(), loaded = structuredClone(s);
  assert.deepEqual(rewards.progressCues(initialState(), loaded, { type: 'load' }), []);
  assert.deepEqual(rewards.progressCues(s, applyAction(s, { type: 'move', x: 10, y: 10 }), { type: 'move', x: 10, y: 10 }), []);
  assert.deepEqual(rewards.progressCues(s, s, null), []);
});
test('rewardFor and RewardPlayer: Sounds, the unlock gate, one chime at a time, fixed gain', () => {
  const visit = { id: 'neighbor_visit', reason: 'Bea', suppressed: false, sounds: true }, quiet = { ...visit, suppressed: true, sounds: false };
  assert.equal(rewards.rewardFor([visit], { enabled: true, unlocked: false }), null);
  assert.equal(rewards.rewardFor([visit], { enabled: false, unlocked: true }), null);
  assert.equal(rewards.rewardFor([quiet], { enabled: true, unlocked: true }), null);
  assert.equal(rewards.rewardFor([visit], { enabled: true, unlocked: true }), visit);
  const ctx = fakeContext(48000), player = new rewards.RewardPlayer(() => ctx);
  assert.equal(player.play(visit), false, 'locked until a real press');
  assert.equal(player.unlock({ type: 'keydown', key: 'Shift', isTrusted: true }), false);
  assert.equal(player.unlock({ type: 'keydown', key: 'e', repeat: false, isTrusted: true }), true);
  assert.equal(player.play(quiet), false);
  assert.equal(player.play(visit), true);
  assert.equal(player.play({ id: 'mural_motif', reason: 'sun', sounds: true }), true);
  assert.equal(player.count, 2); assert.equal(player.lastCue, 'mural_motif');
  assert.equal(ctx.started.length, 2); assert.equal(ctx.started[0].stopped, true, 'the new chime stops the old one');
  assert.equal(ctx.started[1].buffer.rate, 22050); assert.equal(ctx.started[1].buffer.len, Math.ceil(0.44 * 22050));
  player.setEnabled(false); assert.equal(ctx.started[1].stopped, true); assert.equal(player.play(visit), false); assert.equal(player.count, 2);
  assert.equal(rewards.soundsLabel(true), 'Sounds: On'); assert.equal(rewards.soundsAnnouncement(false), 'Reward sounds off. Music has its own controls.');
  assert.equal(rewards.cleanRewardSounds(undefined), true); assert.equal(rewards.cleanRewardSounds(false), false); assert.equal(rewards.cleanRewardSounds('false'), true);
});
test('unlocksRewardAudio follows Godot: keys but not Escape or modifiers, mouse presses, touch releases', () => {
  const u = rewards.unlocksRewardAudio;
  assert.equal(u({ type: 'keydown', key: 'a' }), true);
  assert.equal(u({ type: 'keydown', key: 'a', repeat: true }), false);
  for (const key of ['Escape', 'Shift', 'Control', 'Alt', 'Meta']) assert.equal(u({ type: 'keydown', key }), false, key);
  assert.equal(u({ type: 'pointerdown', pointerType: 'mouse', button: 0 }), true);
  assert.equal(u({ type: 'pointerdown', pointerType: 'mouse', button: 3 }), false);
  assert.equal(u({ type: 'pointerdown', pointerType: 'touch', button: 0 }), false);
  assert.equal(u({ type: 'pointerup', pointerType: 'touch' }), true);
  assert.equal(u({ type: 'touchend' }), true);
  assert.equal(u({ type: 'keydown', key: 'a', isTrusted: false }), false);
});

// --- Units: the drum bar and the circle. ---
test('barSamples: hits on the set steps, silence on rests, ceil boundaries', () => {
  const bar = rhythm.barSamples(85), peakOf = s => { let p = 0; for (let i = rhythm.stepStart(s); i < rhythm.stepStart(s + 1); i++) p = Math.max(p, Math.abs(bar[i])); return p; };
  assert.equal(bar.length, 66150);
  for (const s of [1, 3, 5, 7]) assert.equal(peakOf(s), 0, `step ${s + 1} rests`);
  for (const s of [0, 2, 4, 6]) assert.ok(peakOf(s) > 0.2 && peakOf(s) <= 0.42, `step ${s + 1} hits`);
  assert.deepEqual([0, 1, 2, 3, 8].map(rhythm.stepStart), [0, 8269, 16538, 24807, 66150]);
  assert.ok(rhythm.barSamples(0).every(x => x === 0));
  const all = rhythm.barSamples(255), hit = rhythm.hitTemplate();
  assert.deepEqual(all, hit);
  assert.equal(rhythm.barSamples(256 + 1)[0], all[0], 'only 8 bits');
});
test('Play Bar gates in Godot order', () => {
  const ok = { auditioning: false, unlocked: true, musicPlaying: true, volume: 0.7, mode: 'sketch', pattern: 85 };
  const key = over => rhythm.playBarGate({ ...ok, ...over }).key;
  assert.equal(key({ auditioning: true, unlocked: false }), 'barStopped');
  assert.equal(key({ unlocked: false, musicPlaying: false }), 'locked');
  assert.equal(key({ musicPlaying: false, mode: 'local' }), 'muted');
  assert.equal(key({ volume: 0, mode: 'local' }), 'muted');
  assert.equal(key({ mode: 'local', pattern: 0 }), 'local');
  assert.equal(key({ pattern: 0 }), 'allRests');
  const play = rhythm.playBarGate(ok);
  assert.equal(play.key, 'playing'); assert.equal(play.start, true); assert.match(play.message, /^Playing one drum bar\./);
  assert.equal(rhythm.playBarGate({ ...ok, auditioning: true }).stop, true);
  assert.equal(rhythm.auditionMustStop({ visible: true, musicPlaying: true, volume: 0.7, mode: 'sketch' }), false);
  for (const over of [{ visible: false }, { musicPlaying: false }, { volume: 0 }, { mode: 'local' }]) assert.equal(rhythm.auditionMustStop({ visible: true, musicPlaying: true, volume: 0.7, mode: 'sketch', ...over }), true);
});
test('Rhythm Circle: availability and mode; practice never produces a save action', () => {
  assert.equal(rhythm.circleAvailable(readyState()), false);
  const beatsNow = hostedState(2); // stories, pause done; beats is current
  assert.equal(rhythm.circleAvailable(beatsNow), true); assert.equal(rhythm.circleMode(beatsNow), 'hosting');
  assert.equal(rhythm.circleAvailable(hostedState(1)), false);
  const after = hostedState(3); assert.equal(rhythm.circleAvailable(after), true); assert.equal(rhythm.circleMode(after), 'practice');
  assert.equal(rhythm.openCircle(after, { busy: true }).opened, false);
  const open = rhythm.openCircle(after);
  assert.equal(open.session.practice, true); assert.equal(open.session.practicePattern, 85);
  assert.equal(open.announce, 'Rhythm Circle. Practice copy only. Your hosted result is unchanged. Play Bar optionally auditions your hits and rests. Music must be On; set volume at Rook\'s speaker.');
  let r = rhythm.toggleStep(after, open.session, 1);
  assert.deepEqual(r.actions, []); assert.equal(r.session.practicePattern, 87); assert.equal(r.message, 'Step 2: hit. Practice only; hosted result unchanged.');
  assert.equal(rhythm.circlePattern(after, r.session), 87); assert.equal(rhythm.circlePattern(after, rhythm.closedSession()), 85);
  r = rhythm.listen(after, r.session); assert.deepEqual(r.actions, []); assert.equal(r.session.practicePattern, 0);
  r = rhythm.complete(after, r.session); assert.equal(r.session.practicePattern, 85); assert.equal(r.message, 'Hosted rhythm restored. Practice never changes your hosted result.');
  assert.equal(rhythm.closeCircle(r.session).announce, 'Back to the block. Hosted rhythm restored; practice was not saved.');
  assert.equal(rhythm.heading(r.session), "Dez's Rhythm Circle - Practice");
});
test('Rhythm Circle hosting: toggles and Listen are host-beat actions; Complete hosts beats', () => {
  let s = hostedState(2);
  const open = rhythm.openCircle(s); assert.equal(open.session.practice, false); assert.equal(open.session.message, 'Dez: Choose hits or rests. Listening is welcome too. Complete when you are ready.');
  let r = rhythm.toggleStep(s, open.session, 0);
  assert.deepEqual(r.actions, [{ type: 'host-beat', step: 0 }]); assert.equal(r.message, 'Step 1: rest. Saved to Godot storage.');
  for (const a of r.actions) s = applyAction(s, a);
  assert.equal(s.hosting.draft.pattern, 84);
  assert.equal(r.done?.(s, 'Visit-only: test; reload may lose changes.').message, 'Step 1: rest. Visit-only: test; reload may lose changes.', "done() builds Godot's message from the state and the receipt after the write");
  assert.equal(rhythm.listen(s, r.session).done?.(s, 'Saved in this browser.').message, 'Listening round. No performance needed; this is an equally complete choice. Saved in this browser.');
  r = rhythm.listen(s, r.session, { receipt: 'Visit-only: test; reload may lose changes.' });
  assert.deepEqual(r.actions.map(a => a.step), [2, 4, 6]); assert.equal(r.message, 'Listening round. No performance needed; this is an equally complete choice. Visit-only: test; reload may lose changes.');
  for (const a of r.actions) s = applyAction(s, a);
  assert.equal(s.hosting.draft.pattern, 0);
  assert.equal(rhythm.closeCircle(r.session).announce, 'Back to the block. Saved to Godot storage. Return when ready to complete it.');
  r = rhythm.complete(s, r.session); assert.deepEqual(r.actions, [{ type: 'host-complete', id: 'beats' }]); assert.equal(r.close, true);
  const done = applyAction(s, r.actions[0]);
  assert.deepEqual(done.hosting.results[2], { id: 'beats', value: 0 });
  assert.deepEqual(rhythm.afterComplete(done), { notice: '', announce: `Rhythm Circle complete (3/4 hosted). ${segmentTitle('art')} is next.` });
  const last = applyAction(done, { type: 'host-complete', id: 'art' });
  assert.deepEqual(rhythm.afterComplete(last), { notice: 'Second Afternoon Complete! 4/4 activities hosted. ', announce: '' });
  assert.deepEqual(rhythm.afterComplete(last, { lastChapter: true }), { notice: '', announce: '' });
});
// The Rhythm Circle's DOM side on a stand-in dialog: host is game.js's, with these defaults.
function circleHost(dialog, over = {}) {
  const statuses = [], toasts = [];
  const host = { ...dialog, show: dialog.show, getState: () => hostedState(2), status: text => statuses.push(text), toast: text => toasts.push(text), act: () => true,
    music: { enabled: false, starting: false, fileName: '', sketch: { ensureContext: () => null, mute() {}, position: () => 0 } }, volume: () => 0.7, unlocked: () => true,
    toggleMusic: async () => {}, receipt: () => 'Saved in this browser.', objective: () => '', sparks: () => 0, stopWalk() {}, lastChapter: () => false, afterClose: () => dialog.close(), ...over };
  return { host, statuses, toasts, circle: createRhythm(host) };
}
const RECOVERY = '<section data-recovery><h2 id="modal-title">Some progress went back.</h2><button id="recover-save">Keep this tab’s progress</button></section>';
test('Rhythm Circle: a redraw that waits draws nothing once the circle is closed or covered', async t => {
  let settle;
  const pending = () => new Promise(resolve => { settle = resolve; });
  await t.test('Music, then Back before the music has started: the circle is not drawn again with a Back that does nothing', async () => {
    const dialog = fakeDialog(), c = circleHost(dialog, { toggleMusic: pending });
    c.circle.open('hosting'); dialog.click('rhythm-music'); dialog.click('rhythm-back');
    settle(); await flush();
    assert.deepEqual([dialog.modal.open, c.circle.isOpen], [false, false]);
  });
  await t.test("Music: Godot's music announcement is said after the redraw, as rhythm_circle.gd's refresh() leaves it", async () => {
    const dialog = fakeDialog(), c = circleHost(dialog, { toggleMusic: async () => 'Music paused.' });
    c.circle.open('hosting'); const said = c.statuses.length; dialog.click('rhythm-music');
    await flush();
    assert.deepEqual([dialog.has('rhythm-music'), c.statuses.slice(said)], [true, ['Music paused.']]);
  });
  await t.test('Music, then the recovery offer covers the circle before the music has started: the offer stays on top', async () => {
    const dialog = fakeDialog(), c = circleHost(dialog, { toggleMusic: pending });
    c.circle.open('hosting'); dialog.click('rhythm-music'); dialog.show(RECOVERY);
    settle(); await flush();
    assert.deepEqual([dialog.heading(), dialog.has('recover-save')], ['Some progress went back.', true]);
  });
  await t.test("a pad whose act() closed the circle (sync: another tab's save has no Rhythm Circle) draws nothing after it", () => {
    const dialog = fakeDialog();
    let s = hostedState(2), c;
    c = circleHost(dialog, { getState: () => s, act: () => { s = initialState(); c.circle.sync(); return true; } });
    c.circle.open('hosting'); dialog.click('rhythm-pad-2');
    assert.deepEqual([dialog.modal.open, c.circle.isOpen, c.statuses.some(line => line.startsWith('Step 3'))], [false, false, false]);
  });
  await t.test('a drum bar that ends under the recovery offer unmutes the sketch and draws nothing', () => {
    const sources = [], muted = [], ctx = { currentTime: 0, destination: {}, createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }), createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }), createBufferSource: () => { const source = { connect() {}, disconnect() {}, start() {}, stop() {} }; sources.push(source); return source; } };
    const dialog = fakeDialog(), c = circleHost(dialog, { music: { enabled: true, starting: false, fileName: '', sketch: { ensureContext: () => ctx, mute: on => muted.push(on), position: () => 0 } } });
    c.circle.open('hosting'); dialog.click('rhythm-play-bar');
    assert.deepEqual([c.circle.auditioning, sources.length, muted], [true, 1, [true]], 'the bar plays with the sketch muted');
    dialog.show(RECOVERY); sources[0].onended();
    assert.deepEqual([dialog.heading(), dialog.has('recover-save'), c.circle.auditioning, muted], ['Some progress went back.', true, false, [true, false]]);
  });
});
// Chrome closes a <dialog> at once but delivers its close event as a later task. When a screen opens the dialog again in the frame
// between (an automated tester, a held key, a hand-off in code), that late event reaches every close listener while the dialog
// shows the new screen. modalEvents(dialog), called before the module adds its listeners, keeps them: closeLater() closes the
// stand-in without its event and returns the late delivery; escape() is the browser's Escape: the cancel event, then the close
// unless a listener prevented it.
function modalEvents(dialog) {
  const listeners = { close: [], cancel: [] }, add = dialog.modal.addEventListener;
  dialog.modal.addEventListener = (type, fn) => { listeners[type]?.push(fn); add(type, fn); };
  return {
    closeLater() { dialog.modal.open = false; return () => { for (const fn of listeners.close) fn({ type: 'close' }); }; },
    escape() {
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const fn of listeners.cancel) fn(event);
      if (!event.defaultPrevented) dialog.close();
      return event.defaultPrevented;
    },
  };
}
test("Rhythm Circle: an earlier dialog's late close event leaves the circle opened since alone; a real close still ends it", async t => {
  const CLOSED = { open: false, practice: false, pattern: null, stepCues: false, auditioning: false, message: '' };
  const BACK = 'Back to the block. Hosted rhythm restored; practice was not saved.';
  // The circle in practice (beats hosted) with a drum bar that can play; left records where Back, Escape or sync() leave to.
  function practiceCircle() {
    const dialog = fakeDialog(), events = modalEvents(dialog), sources = [], muted = [], left = [], io = { state: hostedState(3) };
    const ctx = { currentTime: 0, destination: {}, createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }), createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
      createBufferSource: () => { const source = { stopped: false, connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; } }; sources.push(source); return source; } };
    const c = circleHost(dialog, { getState: () => io.state, music: { enabled: true, starting: false, fileName: '', sketch: { ensureContext: () => ctx, mute: on => muted.push(on), position: () => 0 } },
      afterClose: (origin, text) => { left.push([origin, text]); dialog.close(); } });
    return { ...c, dialog, events, sources, muted, left, io };
  }
  await t.test('closed and opened again in one frame: the late close keeps the circle, its practice copy, its pads and its Back', () => {
    const c = practiceCircle();
    assert.equal(c.circle.open('block'), true);
    const deliver = c.events.closeLater(); // ×: the dialog closes at once, its close event a task later
    assert.equal(c.circle.open('block'), true); // and the circle opens again before that event arrives
    const opened = c.circle.snapshot();
    deliver();
    assert.deepEqual([c.circle.snapshot(), c.dialog.modal.open, c.dialog.has('rhythm-reader')], [opened, true, true], 'the late close changes nothing');
    c.dialog.click('rhythm-pad-1');
    assert.equal(c.circle.snapshot().pattern, 87, 'the practice pads still answer');
    c.dialog.click('rhythm-back');
    assert.deepEqual(c.left, [['block', BACK]], "Back still leaves with Godot's words");
  });
  await t.test("opened over another dialog's close in the same frame: the late close keeps the circle and its Escape", () => {
    const c = practiceCircle();
    c.dialog.show(RECOVERY);
    const deliver = c.events.closeLater();
    assert.equal(c.circle.open('block'), true);
    const opened = c.circle.snapshot();
    deliver();
    assert.deepEqual(c.circle.snapshot(), opened, 'the late close changes nothing');
    assert.equal(c.events.escape(), true, "Escape still runs the circle's Back");
    assert.deepEqual([c.left, c.dialog.modal.open], [[['block', BACK]], false]);
  });
  await t.test('a real close afterwards still ends the circle as before: practice gone, the bar stopped, the sketch unmuted', () => {
    const c = practiceCircle();
    c.circle.open('block');
    const deliver = c.events.closeLater();
    c.circle.open('block'); c.dialog.click('rhythm-pad-1'); c.dialog.click('rhythm-play-bar');
    deliver();
    assert.deepEqual([c.circle.auditioning, c.sources[0].stopped, c.muted], [true, false, [true]], 'the late close leaves the bar playing');
    c.dialog.close(); // ×, its close event on time
    assert.deepEqual([c.circle.snapshot(), c.sources[0].stopped, c.muted, c.left], [CLOSED, true, [true, false], []], 'practice is gone, the bar stopped, the sketch back, nothing said');
  });
  await t.test('a late close that arrives under another screen still ends the circle, as on time: nothing is left half open behind it', () => {
    const c = practiceCircle();
    c.circle.open('block'); c.dialog.click('rhythm-pad-1'); c.dialog.click('rhythm-play-bar');
    const deliver = c.events.closeLater(); // × closes the circle
    c.dialog.show(RECOVERY); // and the recovery offer opens the dialog before the close event arrives
    deliver();
    assert.deepEqual([c.circle.snapshot(), c.sources[0].stopped, c.muted, c.dialog.heading()], [CLOSED, true, [true, false], 'Some progress went back.']);
    c.io.state = initialState(); c.circle.sync();
    assert.deepEqual([c.left, c.dialog.heading()], [[], 'Some progress went back.'], 'so a later sync() cannot take the offer away for a circle that is gone');
  });
});
test("Rhythm Circle: a pad's message is Godot's, built after the write: that write's receipt, and none for a press act() refused", () => {
  // tests/next-save: a save padded so that a two-digit beats pattern fits Godot's budget and a three-digit one does not.
  let state = hostedState(2);
  const withPattern = pattern => ({ ...state, hosting: { ...state.hosting, draft: { ...state.hosting.draft, pattern } } });
  const padded = pad => ({ ...buildGodotSave(freshEnvelope(), state).envelope, optional: { pad: 'x'.repeat(pad) } });
  let lo = 0, hi = 4096;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (buildGodotSave(padded(mid), withPattern(127)).ok) lo = mid; else hi = mid - 1; }
  let envelope = padded(lo + 1), reason = '';
  assert.deepEqual([buildGodotSave(envelope, withPattern(95)).ok, buildGodotSave(envelope, withPattern(127)).reason], [true, 'full']);
  // game.js act() and commit(): the reducer, then the write; a refused write leaves the reason sceneReceipt reports.
  const act = action => { const next = applyAction(state, action); if (next === state) return false; state = next; const out = buildGodotSave(envelope, state); if (out.ok) { envelope = out.envelope; reason = ''; } else reason = out.reason === 'full' ? 'save full' : 'not saved'; return true; };
  const dialog = fakeDialog(), t = circleHost(dialog, { getState: () => state, act: action => act(action), receipt: () => sceneReceipt(reason) });
  t.circle.open('hosting');
  for (const step of [1, 3, 5]) dialog.click(`rhythm-pad-${step}`);
  assert.deepEqual(t.statuses.slice(-3), ['Step 2: hit. Saved in this browser.', 'Step 4: hit. Saved in this browser.', 'Step 6: hit. Visit-only: save full; reload may lose changes.'], 'the refused write says so on the press that made it');
  assert.equal(t.circle.snapshot().message, 'Step 6: hit. Visit-only: save full; reload may lose changes.');
  // A press another tab's newer save took back (game.js persist: "Your last change no longer applies"): its notice stands alone.
  t.host.act = () => { t.host.toast('The shared save was cleared in another tab. A fresh afternoon is ready. Your last change no longer applies, so it was not saved.'); return false; };
  const said = t.statuses.length;
  dialog.click('rhythm-pad-7');
  assert.deepEqual([t.statuses.length, t.circle.snapshot().message, t.toasts.length], [said, 'Step 6: hit. Visit-only: save full; reload may lose changes.', 1], 'no hit and no receipt for a press that did not happen');
  // A press rebased onto another tab's pattern reads the step as the save now holds it, as Godot reads pattern() after the toggle.
  for (const [mine, theirs, word] of [[87, 85, 'hit'], [85, 87, 'rest']]) {
    state = withPattern(mine); envelope = buildGodotSave(freshEnvelope(), state).envelope;
    const stored = withPattern(theirs);
    t.host.act = action => { state = stored; return act(action); };
    dialog.click('rhythm-pad-1');
    assert.deepEqual([state.hosting.draft.pattern, t.statuses.at(-1)], [theirs ^ 2, `Step 2: ${word}. Saved in this browser.`], `this tab ${mine}, the stored save ${theirs}`);
  }
});
test('Rhythm Circle labels, reader text, lamps and the step highlight', () => {
  const s = hostedState(3), session = { ...rhythm.openCircle(s).session, stepCues: true };
  assert.deepEqual(rhythm.pads(5).slice(0, 2), [{ step: 0, hit: true, label: '1\nHit', name: 'Step 1, hit' }, { step: 1, hit: false, label: '2\nRest', name: 'Step 2, rest' }]);
  assert.deepEqual(rhythm.options(session, { musicPlaying: true, auditioning: true }).map(o => o.label), ['Listen', 'Music\nOn', 'Reset\nPractice', 'Step cues\nOn', 'Back', 'Stop\nBar']);
  assert.equal(rhythm.options(session).at(-1).name, 'Play Bar: Play one bar of this rhythm');
  assert.equal(rhythm.options(session, { auditioning: true }).at(-1).name, 'Stop bar audition');
  assert.equal(rhythm.readerText('Hi.'), "Hi. Play Bar: one original drum bar, then the sketch returns. Music must be On; set volume at Rook's speaker. Reward Sounds is separate.");
  assert.equal(rhythm.readerText('Hi.', { mode: 'local', localName: 'a.mp3' }), 'Hi. Local track: a.mp3. Bar audition is unavailable with local files; step cues stay still.');
  assert.equal(rhythm.objectiveLine('', 3), 'Explore the block | Sparks: 3');
  const lit = rhythm.lamps(85, 2);
  assert.deepEqual(lit[2], { step: 2, hit: true, color: '#fff0ba', scale: 1.25 });
  assert.deepEqual(lit[1], { step: 1, hit: false, color: '#4a6873', scale: 1 });
  assert.deepEqual(lit[0], { step: 0, hit: true, color: '#ffd076', scale: 1 });
  const on = { musicPlaying: true, volume: 0.7, mode: 'sketch', frames: 8268.75 * 2 + 10, queued: 0 };
  assert.equal(rhythm.activeStep(s, session, on), 2);
  assert.equal(rhythm.activeStep(s, { ...session, stepCues: false }, on), -1);
  assert.equal(rhythm.activeStep(s, session, { ...on, volume: 0 }), -1);
  assert.equal(rhythm.activeStep(s, session, { ...on, mode: 'local' }), -1);
  assert.equal(rhythm.activeStep(s, { ...session, practicePattern: 0 }, on), -1);
  assert.equal(rhythm.activeStep(s, session, { ...on, auditionSeconds: 1.2 }), 3);
});

// --- New files are LF. ---
test('new music files are LF only', () => {
  for (const path of ['browser-next/sketch-core.js', 'browser-next/sketch-worklet.js', 'browser-next/sketch-player.js', 'browser-next/rewards.js', 'browser-next/rhythm.js', 'tests/next-music.test.mjs']) {
    const raw = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.equal(raw.split('\r\n').length - 1, 0, `${path} has CRLF`);
  }
});
