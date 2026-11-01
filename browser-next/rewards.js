// Godot's reward chimes and the progress cues that trigger them (godot/main.gd trigger_progress_cue,
// make_reward_sound, play_reward_sound). Pure except RewardPlayer, which needs a Web Audio context.
// tests/next-music.test.mjs parses main.gd at test time, so a changed arm, frequency or rule fails there.
//
// A chime plays only when all of these hold (play_reward_sound):
// - the Sounds setting is on (the fork's own settings key, rewardSounds, default true);
// - reward audio is unlocked by a first real key, mouse or touch press (unlocksRewardAudio);
// - the cue is not suppressed (a repeat visit, a repeat soundcheck, Celeste's later talks);
// - the cue has a burst title, or is surprise_discovery / surprise_finale / eatery_order.
// A new chime stops the previous one; chimes never stack or queue. Their gain is fixed: no music
// volume, and they play with the music off. Loading a save never replays a cue.
import { NEIGHBOR_NAMES } from './story.js';
import { SURPRISE_IDS } from './godot-save.js';
import { L } from './i18n.js';

export const REWARD_RATE = 22050;
// trigger_progress_cue's first match, arm by arm. reasons: the surprise_discovery / rook_soundcheck arm.
export const CUE_ARPEGGIOS = [
  { ids: ['mural_complete', 'block_opened', 'hosting_complete', 'civic_complete', 'film_complete'], freqs: [523.25, 659.25, 1046.50], duration: 0.56 },
  { ids: ['surprise_finale', 'tour_complete'], freqs: [523.25, 659.25, 783.99, 1046.50], duration: 0.68 },
  { ids: ['history_comptons'], freqs: [523.25, 659.25, 880.00], duration: 0.50 },
  { ids: ['history_blackhawk', 'so_what_egg'], freqs: [440.00, 523.25, 659.25, 783.99], duration: 0.54 },
  { ids: ['museum_portal', 'boeddeker_park'], freqs: [523.25, 659.25, 783.99, 987.77], duration: 0.52 },
  { ids: ['rook_soundcheck', 'surprise_discovery'], reasons: [
    { reason: 'mayor_pomp_event', freqs: [392.00, 493.88, 587.33], duration: 0.62 },
    { reason: 'clown_horn_walker', freqs: [440.00, 554.37, 659.25], duration: 0.42 },
    { reason: null, freqs: [659.25, 830.61, 987.77], duration: 0.48 },
  ] },
  { ids: ['mural_motif', 'keepsake_photo', 'programme_published', 'film_shot', 'eatery_order'], freqs: [587.33, 739.99, 880.00], duration: 0.44 },
];
export const DEFAULT_ARPEGGIO = { freqs: [523.25, 659.25, 783.99], duration: 0.40 };
// The second match: cues with a burst title. Every other cue is silent unless it is in EXTRA_SOUND_CUES.
export const AUDIBLE_CUES = ['neighbor_visit', 'celeste_talk', 'mural_motif', 'mural_complete', 'rook_soundcheck', 'block_opened', 'keepsake_photo', 'loan_returned', 'programme_published', 'hosting_segment', 'hosting_complete', 'civic_complete', 'film_shot', 'film_complete', 'history_comptons', 'history_blackhawk', 'museum_portal', 'tour_complete', 'boeddeker_park', 'so_what_egg'];
export const EXTRA_SOUND_CUES = ['surprise_discovery', 'surprise_finale', 'eatery_order'];
// Cues Godot raises that never chime (no burst title).
export const SILENT_CUES = ['epilogue_packing', 'hosting_started', 'civic_planning', 'civic_meeting', 'film_planning', 'film_shooting', 'mural_palette', 'local_audition', 'browser_save_import'];
export const cueSounds = id => AUDIBLE_CUES.includes(id) || EXTRA_SOUND_CUES.includes(id);

// Godot text for the Sounds toggle (set_reward_sounds_enabled, toggle_reward_sounds, the button tooltip).
export const SOUNDS_TEXT = { on: 'Sounds: On', off: 'Sounds: Off', tooltip: 'Gentle reward sounds. Music has separate controls with Rook.', announce: 'Reward sounds %s. Music has its own controls.' };
// Fork composites (docs/I18N_PLAN.md 2.7): Godot fills announce with the word on or off; each whole sentence equals that
// (tests/next-i18n-dialogue.test.mjs), so a translator writes both.
export const SOUNDS_COMPOSE = { announceOn: 'Reward sounds on. Music has its own controls.', announceOff: 'Reward sounds off. Music has its own controls.' };
export const soundsLabel = enabled => L(enabled ? SOUNDS_TEXT.on : SOUNDS_TEXT.off);
export const soundsAnnouncement = enabled => L(enabled ? SOUNDS_COMPOSE.announceOn : SOUNDS_COMPOSE.announceOff);
// The fork settings field (tenderloin-redux.browser-next.settings.v1): a stored boolean is kept, else on.
export const cleanRewardSounds = stored => typeof stored === 'boolean' ? stored : true;

// The history record names godot/data/buildings.json gives read_history_stop's reason.
export const HISTORY_REASONS = { comptons: "Compton's Corner (Turk & Taylor)", blackhawk: 'Former Black Hawk Jazz Club (Turk & Hyde)' };
// Godot reasons for the fixed-reason cues (the second argument of each trigger_progress_cue call).
export const CUE_REASONS = { celeste_talk: 'Celeste talk', rook_soundcheck: 'Rook soundcheck', block_opened: 'Turk St Gathering', mural_complete: '3/3 motifs', epilogue_packing: 'Packing loans', programme_published: '4 segments', hosting_complete: '4/4 hosted', civic_planning: 'Listening hour', civic_complete: 'Listening hour complete', film_planning: 'The Open Seat', film_complete: 'The Open Seat 3/3', keepsake_photo: '%d guests' };

export function cueArpeggio(id, reason = '') {
  const arm = CUE_ARPEGGIOS.find(item => item.ids.includes(id));
  if (!arm) return { freqs: [...DEFAULT_ARPEGGIO.freqs], duration: DEFAULT_ARPEGGIO.duration };
  const pick = arm.reasons ? arm.reasons.find(r => r.reason === reason) || arm.reasons.find(r => r.reason === null) : arm;
  return { freqs: [...pick.freqs], duration: pick.duration };
}

// make_reward_sound: duration clamped to 0.1-0.75 s, split into equal notes, a 12 ms attack and a
// 35 ms release per note. quantize: Godot's 16-bit PCM, round(sample * 32767) / 32767.
export function rewardSamples(freqs, duration, rate = REWARD_RATE, { quantize = false } = {}) {
  const d = Math.min(0.75, Math.max(0.1, duration));
  const frames = Math.ceil(d * rate), out = new Float32Array(frames);
  const notes = Math.max(1, freqs.length), noteDuration = d / notes, TAU = Math.PI * 2;
  for (let i = 0; i < frames; i++) {
    const t = i / rate;
    const note = Math.min(Math.trunc(t / noteDuration), notes - 1);
    const lt = t - note * noteDuration;
    const f = freqs.length ? freqs[note] : 523.25;
    const env = Math.min(lt / 0.012, 1.0) * Math.min(Math.max(0.0, noteDuration - lt) / 0.035, 1.0);
    const s = (Math.sin(TAU * f * lt) + 0.15 * Math.sin(TAU * f * 2.0 * lt)) * env * 0.12;
    out[i] = quantize ? Math.round(s * 32767) / 32767 : s;
  }
  return out;
}
export const cueSamples = (id, reason, rate, options) => { const a = cueArpeggio(id, reason); return rewardSamples(a.freqs, a.duration, rate, options); };

// Godot's reward_audio_unlocked rule (_input): a key press that is not a repeat and not Escape or a
// lone modifier; a left, middle or right mouse press; or a touch release. Takes DOM events.
const MODIFIER_KEYS = ['Escape', 'Shift', 'Control', 'Alt', 'Meta'];
export function unlocksRewardAudio(event) {
  if (!event || event.isTrusted === false) return false;
  if (event.type === 'keydown') return !event.repeat && !MODIFIER_KEYS.includes(event.key);
  if (event.type === 'mousedown' || (event.type === 'pointerdown' && event.pointerType === 'mouse')) return [0, 1, 2].includes(event.button);
  return event.type === 'touchend' || (event.type === 'pointerup' && event.pointerType === 'touch');
}

const placed = state => state?.mural && typeof state.mural === 'object' ? Object.keys(state.mural).length : 0;
const visited = (state, id) => Array.isArray(state?.visited) && state.visited.includes(id);
const cue = (id, reason, suppressed = false) => ({ id, reason: String(reason), suppressed: !!suppressed, sounds: cueSounds(id) && !suppressed });

// The cues Godot raises for one fork action, in Godot's order, from the states before and after
// core.js applyAction. Each is {id, reason, suppressed, sounds}. A rejected action (after === before)
// raises nothing, except the mural re-placement Godot still counts. Never call it for a load or a
// rebase: Godot never replays cues from loading.
export function progressCues(before, after, action) {
  const out = [];
  if (!before || !after || !action || typeof action !== 'object') return out;
  const type = action.type;
  if (type === 'meet' || type === 'greet' || type === 'soundcheck') {
    const id = type === 'greet' ? 'bea' : type === 'soundcheck' ? 'rook' : action.id;
    if (!Object.hasOwn(NEIGHBOR_NAMES, id)) return out;
    const talk = type === 'soundcheck' || action.talk === true, first = !visited(before, id);
    if (id === 'rook' && talk) out.push(cue('rook_soundcheck', CUE_REASONS.rook_soundcheck, before.soundcheck === true)); // check_sound_with_rook
    else if (id === 'celeste' && talk) out.push(cue('celeste_talk', CUE_REASONS.celeste_talk, after.celesteTalks !== 1)); // talk_with_celeste
    else out.push(cue('neighbor_visit', NEIGHBOR_NAMES[id], !first)); // talk_with_neighbor or finish_neighbor_arrival
    return out;
  }
  if (type === 'mural') {
    const cell = after.mural?.[action.id];
    if (!cell || cell.col !== action.col || cell.row !== action.row) return out; // rejected placement
    out.push(placed(after) === 3 && placed(before) < 3 ? cue('mural_complete', CUE_REASONS.mural_complete) : cue('mural_motif', action.id));
    return out;
  }
  if (after === before) return out;
  // inspect_neighborhood_surprise: a new find; the find that completes the set is the finale.
  if (type === 'surprise') {
    const found = after.surprises || [];
    if (found.includes(action.id) && !(before.surprises || []).includes(action.id)) out.push(cue(found.length >= SURPRISE_IDS.length ? 'surprise_finale' : 'surprise_discovery', action.id));
  } else if (type === 'palette') out.push(cue('mural_palette', after.palette));
  else if (type === 'history' && !before.history && after.history) out.push(cue('history_comptons', HISTORY_REASONS.comptons));
  else if (type === 'discover-blackhawk' && !before.blackhawk && after.blackhawk) out.push(cue('history_blackhawk', HISTORY_REASONS.blackhawk));
  else if (type === 'open' && !before.opened && after.opened) out.push(cue('block_opened', CUE_REASONS.block_opened));
  else if (type === 'photo' && after.epilogue?.photo?.status === 'taken') out.push(cue('keepsake_photo', CUE_REASONS.keepsake_photo.replace('%d', after.epilogue.photo.participants.length)));
  else if (type === 'pack' && !before.epilogue?.packing && after.epilogue?.packing) out.push(cue('epilogue_packing', CUE_REASONS.epilogue_packing));
  else if (type === 'return-loan') {
    const fresh = (after.epilogue?.returned || []).filter(id => !(before.epilogue?.returned || []).includes(id));
    for (const id of fresh) out.push(cue('loan_returned', id));
  } else if (type === 'programme-publish' && (after.programme?.published || []).join() !== (before.programme?.published || []).join()) out.push(cue('programme_published', CUE_REASONS.programme_published));
  else if (type === 'host-start' && !before.hosting?.order?.length && after.hosting?.order?.length) out.push(cue('hosting_started', after.hosting.order[0]));
  else if (type === 'host-complete' && after.hosting.results.length > before.hosting.results.length) {
    const done = after.hosting.results.length === 4, active = after.hosting.results[after.hosting.results.length - 1].id;
    out.push(done ? cue('hosting_complete', CUE_REASONS.hosting_complete) : cue('hosting_segment', active));
  } else if (type === 'civic-start' && before.civic?.phase === 'idle' && after.civic?.phase === 'planning') out.push(cue('civic_planning', CUE_REASONS.civic_planning));
  else if (type === 'civic-open' && after.civic?.phase === 'meeting' && before.civic?.phase !== 'meeting') out.push(cue('civic_meeting', after.civic.result?.topic || 'repairs'));
  else if (type === 'civic-close' && after.civic?.phase === 'done' && before.civic?.phase !== 'done') out.push(cue('civic_complete', CUE_REASONS.civic_complete));
  else if (type === 'film-start' && before.film?.phase === 'idle' && after.film?.phase === 'planning') out.push(cue('film_planning', CUE_REASONS.film_planning));
  else if (type === 'film-clear' && after.film?.phase === 'shooting' && before.film?.phase !== 'shooting') out.push(cue('film_shooting', after.film.result.order[after.film.captured.length]));
  else if (type === 'film-capture' && after.film.captured.length > before.film.captured.length) {
    out.push(after.film.captured.length === 3 ? cue('film_complete', CUE_REASONS.film_complete) : cue('film_shot', after.film.captured[after.film.captured.length - 1]));
  }
  return out;
}
// The cues of Godot's visit-only stops, which no saved action raises: the museum's new era (inspect_tenderloin_museum_hub),
// Boeddeker Park and "So What" once a visit, an eatery's first order (eatery_counter_interact) and the completed tour
// (update_landmark_tour_completion). The visits UI raises them; any other id is null.
export const VISIT_CUES = ['museum_portal', 'boeddeker_park', 'so_what_egg', 'eatery_order', 'tour_complete'];
export const visitCue = (id, reason) => VISIT_CUES.includes(id) ? cue(id, reason) : null;
// The cue a chime would sound for, honouring Godot's gates. One action raises at most one Godot
// chime in the fork, but if several sound, the last replaces the earlier ones (max_polyphony 1).
// A null entry (visitCue of an id no visit raises) is no cue.
export function rewardFor(cues, { enabled = true, unlocked = false } = {}) {
  if (!enabled || !unlocked) return null;
  const sounding = (cues || []).filter(c => c?.sounds);
  return sounding.length ? sounding[sounding.length - 1] : null;
}
// Plays chimes on a shared context (SketchPlayer.ensureContext()), straight to the destination at a
// fixed gain of 1.0, never through the music master. A new chime stops the previous one.
export class RewardPlayer {
  constructor(getContext) { this.getContext = getContext; this.source = null; this.count = 0; this.lastCue = ''; this.enabled = true; this.unlocked = false; }
  setEnabled(on) { this.enabled = !!on; if (!this.enabled) this.stop(); }
  unlock(event) { if (!this.unlocked && unlocksRewardAudio(event)) this.unlocked = true; return this.unlocked; }
  stop() { try { this.source?.stop(); } catch {} this.source?.disconnect(); this.source = null; }
  // Godot play_reward_sound: the count and last cue advance even when no audio device exists. A context the browser refuses
  // is the same silence: act() plays the chime before it commits, so nothing here may throw.
  play(c) {
    if (!c || !c.sounds || !this.enabled || !this.unlocked) return false;
    this.stop();
    this.count++; this.lastCue = c.id;
    try {
      const ctx = this.getContext?.();
      if (!ctx) return true;
      const pcm = cueSamples(c.id, c.reason, REWARD_RATE, { quantize: true });
      const buffer = ctx.createBuffer(1, pcm.length, REWARD_RATE);
      buffer.copyToChannel(pcm, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.connect(ctx.destination);
      source.onended = () => { if (this.source === source) this.source = null; source.disconnect(); };
      source.start(); this.source = source;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch {}
    return true;
  }
}
