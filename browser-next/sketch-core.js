// The original 80 BPM sketch, ported sample for sample from godot/main.gd advance_music_clock.
// Pure: no DOM, no Web Audio. sketch-worklet.js and sketch-player.js play it; tests/next-music.test.mjs
// parses main.gd at test time, so a changed Godot constant, note or gain fails there.
//
// Fidelity notes (all Godot's own behaviour):
// - every oscillator reads the global time t = n / 22050, not a per-note phase, so bass, chord and
//   lead changes at a step boundary jump in phase and click slightly;
// - only the brush has an envelope, re-struck every step;
// - pausing never resets the clock (stop_music_playback leaves sketch_frames_pushed alone);
// - the peak pre-gain sum is 0.72, so the 0.95 clamp never engages.
import { format, FLAVORS } from './i18n.js';

// Godot MUSIC_STEM_ORDER, MUSIC_VOL_STEPS, MUSIC_MIX_RATE, MUSIC_STEP_SEC (main.gd 168-171).
export const STEM_ORDER = ['bass', 'brush', 'chords', 'lead'];
export const VOL_STEPS = [0.70, 1.0, 0.35, 0.0];
export const MIX_RATE = 22050;
export const STEP_SEC = 0.375;
// advance_music_clock: maxi(1, int(round(MUSIC_STEP_SEC * MUSIC_MIX_RATE))) = 8269 samples (0.3750113 s).
export const SAMPLES_PER_STEP = Math.max(1, Math.round(STEP_SEC * MIX_RATE));
export const STEPS = 8;
export const BAR_SAMPLES = SAMPLES_PER_STEP * STEPS;
// The Rhythm Circle highlight clock divides by the exact product, 8268.75 (rhythm_circle.gd update_world).
export const STEP_FRAMES = STEP_SEC * MIX_RATE;
// The AudioStreamGenerator buffer (build_audio_players): 0.25 s of queued, not yet heard, frames.
export const BUFFER_SEC = 0.25;
export const QUEUED_FRAMES = BUFFER_SEC * MIX_RATE;

// Godot music_volume default 0.70 (main.gd 606); the fork's slider reaches 1.0 like Godot's steps.
export const DEFAULT_VOLUME = 0.70;
export const MAX_VOLUME = 1.0;

// advance_music_clock locals, in Godot's order: A minor, Am | G each half bar.
export const BASS = [110.0, 110.0, 130.81, 98.0, 123.47, 123.47, 146.83, 98.0];
export const LEAD = [440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 392.0];
export const CHORD_A = [220.0, 261.63, 329.63];
export const CHORD_G = [196.0, 246.94, 293.66];
// Gains and partials, as written in advance_music_clock.
export const SKETCH_GAINS = { bass: 0.24, bassOctave: 0.08, brushA: 910.0, brushB: 1430.0, brushDecay: 14.0, brush: 0.10, chords: 0.16, vibratoHz: 5.0, vibratoDepth: 0.25, lead: 0.14, clamp: 0.95 };

// Godot text around the music engine (main.gd active_stem_summary, start/toggle/cycle announcements, use_synth_sketch).
export const MUSIC_TEXT = {
  stemSummary: '%s (%d/%d stems)',
  playing: 'Music playing: %s.',
  sketchTag: '80 BPM Sketch (',
  localTag: 'Local: ',
  paused: 'Music paused.',
  volume: 'Music volume %d%%.',
  switched: "Switched Rook's Speaker to 80 BPM Synth Sketch (%s).",
};
// Fork composites (docs/I18N_PLAN.md 2.7): Godot's "Music playing: %s." with its tag joined in, one sentence per mode. Each
// equals playing filled with sketchTag + summary + ')' or localTag + name (tests/next-i18n-dialogue.test.mjs).
export const MUSIC_COMPOSE = { playingSketch: 'Music playing: 80 BPM Sketch (%s).', playingLocal: 'Music playing: Local: %s.' };
// The text below is looked up in a locale before it is filled (i18n.js format); English is each function's own replace chain.
// Values are inserted with a function replacement, so a file name's "$&" stays "$&".
const one = (template, args) => template.replace('%s', () => args[0]);
const ONE = { ...FLAVORS.story, legacy: one };

const TAU = Math.PI * 2;
const INV_RATE = 1.0 / MIX_RATE;
const posmod = (a, b) => ((a % b) + b) % b;

// Godot recompute_music_stems, from the fork state (visited, celesteTalks, mural, soundcheck).
// The lead's mural_completed is all three motifs placed (core.js progress().mural).
export function stemMaskOf(state) {
  let mask = 1;
  const visited = Array.isArray(state?.visited) ? state.visited.length : 0, talks = Number(state?.celesteTalks) || 0;
  const placed = state?.mural && typeof state.mural === 'object' ? Object.keys(state.mural).length : 0;
  const done = state?.soundcheck === true;
  if (visited >= 1 || talks > 0 || done) mask |= 2;
  if (placed >= 1 || talks > 0) mask |= 4;
  if (placed >= 3 || done) mask |= 8;
  return mask;
}
// From core.js musicLayers(state): layout = bass, tidy = brush, mural = chords, opened = lead.
export const stemMask = layers => 1 | (layers?.tidy ? 2 : 0) | (layers?.mural ? 4 : 0) | (layers?.opened ? 8 : 0);
// Godot unlocked_stems / active_stem_summary: "bass+brush+lead (3/4 stems)".
export const unlockedStems = mask => STEM_ORDER.filter((_, i) => (mask & (1 << i)) !== 0);
export function stemSummary(mask) {
  const stems = unlockedStems(mask);
  return format(MUSIC_TEXT.stemSummary, [stems.join('+'), stems.length, STEM_ORDER.length], { ...FLAVORS.story, legacy: (template, [list, count, total]) => template.replace('%s', list).replace('%d', count).replace('%d', total) });
}

// One pre-gain sample. n is the Godot sample index (step and brush clock); t defaults to n / 22050.
// The fallback path for a context that is not at 22050 Hz passes its own continuous t.
export function sketchSampleAt(n, t, mask) {
  const stepIdx = posmod(Math.trunc(n / SAMPLES_PER_STEP), STEPS);
  const stepT = posmod(n, SAMPLES_PER_STEP) * INV_RATE;
  const c0 = stepIdx < 4 ? 220.0 : 196.0;
  const c1 = stepIdx < 4 ? 261.63 : 246.94;
  const c2 = stepIdx < 4 ? 329.63 : 293.66;
  const bassF = BASS[stepIdx], leadF = LEAD[stepIdx];
  let sig = Math.sin(TAU * bassF * t) * 0.24 + Math.sin(TAU * bassF * 2.0 * t) * 0.08;
  if ((mask & 2) !== 0) {
    const env = Math.exp(-stepT * 14.0);
    sig += Math.sin(TAU * 910.0 * t) * Math.cos(TAU * 1430.0 * t) * env * 0.10;
  }
  if ((mask & 4) !== 0) {
    const cSig = (Math.sin(TAU * c0 * t) + Math.sin(TAU * c1 * t) + Math.sin(TAU * c2 * t)) / 3.0;
    sig += cSig * 0.16;
  }
  if ((mask & 8) !== 0) sig += Math.sin(TAU * leadF * t + Math.sin(TAU * 5.0 * t) * 0.25) * 0.14;
  return Math.min(0.95, Math.max(-0.95, sig));
}
// Godot: t = float(sample_idx) * inv_rate.
export const sketchSample = (n, mask) => sketchSampleAt(n, n * INV_RATE, mask);

// Fill out (a Float32Array or Array) with the sketch from position start.
// rate === 22050 is sample-exact: out[i] = sketchSample(start + i). Any other rate evaluates the same
// formula at t = k / rate, with the step and brush clocks on n = floor(t * 22050).
// Returns the next position (start + out.length).
export function renderSketch(out, start, mask, rate = MIX_RATE) {
  const len = out.length;
  if (rate === MIX_RATE) for (let i = 0; i < len; i++) out[i] = sketchSample(start + i, mask);
  else for (let i = 0; i < len; i++) { const t = (start + i) / rate; out[i] = sketchSampleAt(Math.floor(t * MIX_RATE), t, mask); }
  return start + len;
}

// Godot last_pre_gain_rms over a span (one bar by default).
export function sketchRms(mask, start = 0, frames = BAR_SAMPLES) {
  let sum = 0;
  for (let i = 0; i < frames; i++) { const s = sketchSample(start + i, mask); sum += s * s; }
  return Math.sqrt(sum / frames);
}

// Godot cycle_music_volume: the step after the nearest step (ties go to the earlier step).
export function nextVolume(volume) {
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < VOL_STEPS.length; i++) {
    const d = Math.abs(VOL_STEPS[i] - volume);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return VOL_STEPS[posmod(best + 1, VOL_STEPS.length)];
}
// A stored preference is kept (clamped to 0-1.0); anything else is a new player's 0.70.
export const cleanVolume = stored => typeof stored === 'number' && Number.isFinite(stored) ? Math.min(MAX_VOLUME, Math.max(0, stored)) : DEFAULT_VOLUME;
// Godot apply_music_volume_db: linear_to_db(v), or -80 dB at (near) zero.
export const volumeDb = v => v <= 0.0001 ? -80.0 : 20 * Math.log10(v);
// Godot "Music volume %d%%.": int(round(v * 100)).
export const volumeAnnouncement = v => format(MUSIC_TEXT.volume, [Math.round(v * 100)], { ...FLAVORS.characters, legacy: (template, [n]) => template.replace('%d', n).replace('%%', '%') });
// Godot start_music_playback: "Music playing: Local: <name>." with a local track, else "Music playing: 80 BPM Sketch (<summary>)."
// with active_stem_summary. A file name is inserted as written (a function replacement, so "$&" stays "$&").
export const playingAnnouncement = ({ mode = 'sketch', localName = '', summary = '' } = {}) => mode === 'local' ? format(MUSIC_COMPOSE.playingLocal, [localName], ONE) : format(MUSIC_COMPOSE.playingSketch, [summary], ONE);
// Godot use_synth_sketch: "Switched Rook's Speaker to 80 BPM Synth Sketch (<active_stem_summary>)."
export const switchedAnnouncement = summary => format(MUSIC_TEXT.switched, [summary], ONE);

// Rhythm Circle step clock (rhythm_circle.gd update_world): the sketch position minus what is still
// queued, in 8268.75-frame steps. The fork passes the worklet position and its output latency in frames.
export function stepAt(frames, queued = 0) {
  const played = Math.max(0, frames - queued);
  return posmod(Math.trunc(played / STEP_FRAMES), STEPS);
}
// While a drum bar auditions: clampi(int(position / STEP), 0, 7).
export const auditionStep = seconds => Math.min(STEPS - 1, Math.max(0, Math.trunc(seconds / STEP_SEC)));
