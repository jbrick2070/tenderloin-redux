// Dez's Rhythm Circle, ported from godot/rhythm_circle.gd and godot/rhythm_bar.gd. Pure: no DOM, no Web Audio.
// The circle shows the hosted beats. Hosting mode edits hosting.draft.pattern through the existing
// core.js host-beat / host-complete actions, which save as Godot does on every toggle. Practice mode
// is a copy held by the caller's session object only: it is never saved and is gone on reload.
// tests/next-music.test.mjs parses both .gd files at test time, so changed text or synthesis fails there.
// No Rhythm Circle button is marked rapid in Godot, so every one keeps the press-settle guard.
import { currentActivity, hostedResult } from './hosting.js';
import { segmentTitle } from './story.js';
import { auditionStep, stepAt } from './sketch-core.js';

// rhythm_bar.gd
export const RATE = 22050;
export const STEP = 0.375;
export const BAR_FRAMES = Math.trunc(RATE * STEP * 8); // 66150, 3.0 s, finite and non-looping
export const DEFAULT_PATTERN = 85; // hosting.js draft and Godot hosting_draft: steps 1, 3, 5, 7
export const COLORS = { hit: '#ffd076', rest: '#4a6873', lit: '#fff0ba', litScale: 1.25 };

// Godot's literals, verbatim. Templates use %s / %d like story.js fmt.
export const RHYTHM_TEXT = {
  heading: "Dez's Rhythm Circle",
  headingMode: "Dez's Rhythm Circle - ",
  practice: 'Practice', hosting: 'Hosting',
  credit: 'Fictional visiting players | City: DataSF/PDDL | Streets: OSM/ODbL',
  objective: '%s | Sparks: %d', objectiveFallback: 'Explore the block',
  entry: 'Rhythm\nCircle',
  listen: 'Listen', music: 'Music', viewCircle: 'View\nCircle', complete: 'Complete', stepCuesOff: 'Step cues\nOff', back: 'Back', playBar: 'Play\nBar',
  pad: '%d\n%s', padHit: 'Hit', padRest: 'Rest', padName: 'Step %d, %s', hit: 'hit', rest: 'rest',
  musicLabel: 'Music\n', on: 'On', off: 'Off', resetPractice: 'Reset\nPractice', stepCues: 'Step cues\n', stopBar: 'Stop\nBar',
  stopBarName: 'Stop bar audition', playBarName: 'Play one bar of this rhythm',
  blocked: 'Finish arriving and continue any chapter card before opening Rhythm Circle.',
  practiceOpen: 'Practice copy only. Your hosted result is unchanged.',
  hostingOpen: 'Dez: Choose hits or rests. Listening is welcome too. Complete when you are ready.',
  openAnnounce: 'Rhythm Circle. ',
  openAnnounceTail: " View Circle frames the visitors. Play Bar optionally auditions your hits and rests. Music must be On; set volume at Rook's speaker.",
  closePractice: 'Back to the block. Hosted rhythm restored; practice was not saved.',
  closeHosting: 'Back to the block. ', closeHostingTail: ' Return when ready to complete it.',
  toggled: 'Step %d: %s. %s', practiceOnly: 'Practice only; hosted result unchanged.',
  listened: 'Listening round. No performance needed; this is an equally complete choice.',
  restored: 'Hosted rhythm restored. Practice never changes your hosted result.',
  chapterDone: 'Second Afternoon Complete! 4/4 activities hosted. ',
  completed: 'Rhythm Circle complete (%d/4 hosted). %s is next.',
  localTail: ' Local track: %s. Bar audition is unavailable with local files; step cues stay still.',
  sketchTail: " Play Bar: one original drum bar, then the sketch returns. Music must be On; set volume at Rook's speaker. Reward Sounds is separate.",
  dragTail: ' Drag the street to inspect.',
  barEnded: 'Your bar is complete. The original sketch continues.',
  barStoppedSettings: 'Bar stopped. Music follows your current On/Off and volume settings.',
  barStopped: 'Bar stopped. The original sketch continues.',
  locked: 'Use a key, mouse or touch first to enable audio. Silent play is always welcome.',
  muted: 'Music is off or muted. Turn Music On with audible volume to audition; silent play is always welcome.',
  local: 'Local music stays independent. Return to the original sketch before auditioning a bar.',
  allRests: 'All rests: a listening round. Nothing to play, and it is an equally complete choice.',
  playing: 'Playing one drum bar. The sketch is quiet until it ends. Edit a pad to stop; Play Bar auditions your new choice.',
  saved: 'Saved to Godot storage.', // main.gd save_receipt with no notice
};
// Godot lines that name 3D-only controls (the View Circle camera and dragging the street). Everything
// else is shown verbatim; the drift test checks both.
export const RHYTHM_WEB_OVERRIDES = {
  [RHYTHM_TEXT.openAnnounceTail]: " Play Bar optionally auditions your hits and rests. Music must be On; set volume at Rook's speaker.",
  [RHYTHM_TEXT.dragTail]: '',
};
export const rhythmText = key => { const t = RHYTHM_TEXT[key]; return Object.hasOwn(RHYTHM_WEB_OVERRIDES, t) ? RHYTHM_WEB_OVERRIDES[t] : t; };
const fill = (template, ...args) => { let i = 0; return template.replace(/%[sd]/g, m => { const v = args[i++]; return m === '%d' ? String(Math.trunc(Number(v))) : String(v); }); };
const has = (pattern, i) => (pattern & (1 << i)) !== 0;

// --- Drum bar PCM (rhythm_bar.gd prepare_template, make_bar). ---
let template = null;
// The hit template over the whole bar, in Godot's 16-bit steps (round(v * 32767)), as floats.
export function hitTemplate() {
  if (template) return template;
  const out = new Float32Array(BAR_FRAMES), TAU = Math.PI * 2;
  for (let i = 0; i < BAR_FRAMES; i++) {
    const step = Math.trunc(i / (RATE * STEP));
    const t = i / RATE - step * STEP;
    const attack = Math.min(t / 0.005, 1.0);
    const tail = Math.max(0.0, 1.0 - t / 0.22);
    const phase = TAU * (125.0 * t + 2.4 * (1.0 - Math.exp(-t * 35.0)));
    const value = attack * tail * tail * (Math.sin(phase) * 0.36 + Math.sin(TAU * 430.0 * t) * Math.exp(-t * 60.0) * 0.06);
    out[i] = Math.round(value * 32767.0) / 32767;
  }
  return (template = out);
}
// Step boundaries at ceil(step * 8268.75) frames.
export const stepStart = step => Math.ceil(step * RATE * STEP);
// One bar: hit steps copy the template, rest steps are silent.
export function barSamples(mask) {
  const hit = hitTemplate(), out = new Float32Array(BAR_FRAMES), pattern = mask & 255;
  for (let step = 0; step < 8; step++) if (has(pattern, step)) out.set(hit.subarray(stepStart(step), stepStart(step + 1)), stepStart(step));
  return out;
}

// --- Availability and mode (rhythm_circle.gd available, open_circle, pattern). ---
export const hostedBeats = state => hostedResult(state?.hosting, 'beats');
export const circleAvailable = state => !!state?.opened && (currentActivity(state.hosting) === 'beats' || hostedBeats(state) !== undefined);
// Practice whenever the current activity is not beats.
export const circleMode = state => currentActivity(state?.hosting) === 'beats' ? 'hosting' : 'practice';
const savedPattern = state => { const v = hostedBeats(state); return Number.isInteger(v) ? v : 0; };
export function circlePattern(state, session) {
  if (session?.visible && session.practice) return session.practicePattern;
  if (currentActivity(state?.hosting) === 'beats') { const p = state.hosting.draft?.pattern; return Number.isInteger(p) ? p : DEFAULT_PATTERN; }
  return savedPattern(state);
}

// A session is the circle's visit-only state: {visible, practice, practicePattern, stepCues, message}.
export const closedSession = () => ({ visible: false, practice: false, practicePattern: 0, stepCues: false, message: '' });
// busy: an arrival, a chapter card or another activity dialog is in the way (Godot's open_circle guards).
export function openCircle(state, { busy = false } = {}) {
  if (!circleAvailable(state) || busy) return { session: closedSession(), announce: rhythmText('blocked'), opened: false };
  const practice = circleMode(state) === 'practice';
  const session = { visible: true, practice, practicePattern: 0, stepCues: false, message: practice ? RHYTHM_TEXT.practiceOpen : RHYTHM_TEXT.hostingOpen };
  session.practicePattern = circlePattern(state, { visible: false });
  return { session, opened: true, announce: rhythmText('openAnnounce') + session.message + rhythmText('openAnnounceTail') };
}
export function closeCircle(session, { receipt = RHYTHM_TEXT.saved } = {}) {
  return { session: closedSession(), announce: session?.practice ? RHYTHM_TEXT.closePractice : RHYTHM_TEXT.closeHosting + receipt + RHYTHM_TEXT.closeHostingTail };
}
// Each edit returns {session, actions, message}: actions are core.js actions for the caller's act().
export function toggleStep(state, session, index, { receipt = RHYTHM_TEXT.saved } = {}) {
  if (!session?.visible || !Number.isInteger(index) || index < 0 || index > 7) return { session, actions: [], message: session?.message || '' };
  const next = { ...session }, actions = [];
  let pattern;
  if (next.practice) { next.practicePattern = (next.practicePattern ^ (1 << index)) & 255; pattern = next.practicePattern; }
  else {
    if (currentActivity(state?.hosting) !== 'beats') return { session, actions: [], message: session.message };
    actions.push({ type: 'host-beat', step: index });
    pattern = (circlePattern(state, session) ^ (1 << index)) & 255;
  }
  next.message = fill(RHYTHM_TEXT.toggled, index + 1, has(pattern, index) ? RHYTHM_TEXT.hit : RHYTHM_TEXT.rest, next.practice ? RHYTHM_TEXT.practiceOnly : receipt);
  return { session: next, actions, message: next.message };
}
export function listen(state, session, { receipt = RHYTHM_TEXT.saved } = {}) {
  if (!session?.visible) return { session, actions: [], message: session?.message || '' };
  const next = { ...session }, actions = [];
  if (next.practice) next.practicePattern = 0;
  else { const p = circlePattern(state, session); for (let i = 0; i < 8; i++) if (has(p, i)) actions.push({ type: 'host-beat', step: i }); }
  next.message = RHYTHM_TEXT.listened + (next.practice ? '' : ' ' + receipt);
  return { session: next, actions, message: next.message };
}
// Practice: Reset Practice restores the saved pattern. Hosting: complete the beats activity, close the
// circle, then call afterComplete with the new state.
export function complete(state, session) {
  if (session?.practice) {
    const next = { ...session, practicePattern: savedPattern(state), message: RHYTHM_TEXT.restored };
    return { session: next, actions: [], message: next.message, close: false };
  }
  if (!session?.visible || currentActivity(state?.hosting) !== 'beats') return { session, actions: [], message: session?.message || '', close: false };
  return { session, actions: [{ type: 'host-complete', id: 'beats' }], close: true, message: session.message };
}
// After the host-complete action: Godot's chapter notice and the "is next" announcement.
// lastChapter: the current chapter is the story's last.
export function afterComplete(state, { lastChapter = false } = {}) {
  const next = currentActivity(state?.hosting), count = state?.hosting?.results?.length || 0;
  return { notice: !next && !lastChapter ? RHYTHM_TEXT.chapterDone : '', announce: next ? fill(RHYTHM_TEXT.completed, count, segmentTitle(next)) : '' };
}

// --- Labels and the reader (rhythm_circle.gd refresh). ---
export const heading = session => RHYTHM_TEXT.headingMode + (session?.practice ? RHYTHM_TEXT.practice : RHYTHM_TEXT.hosting);
export const objectiveLine = (objective, sparks) => fill(RHYTHM_TEXT.objective, objective || RHYTHM_TEXT.objectiveFallback, sparks);
export function readerText(message, { mode = 'sketch', localName = '' } = {}) {
  return (message + (mode === 'local' ? fill(RHYTHM_TEXT.localTail, localName) : RHYTHM_TEXT.sketchTail) + rhythmText('dragTail')).trim();
}
export function pads(pattern) {
  return Array.from({ length: 8 }, (_, i) => {
    const hit = has(pattern, i);
    return { step: i, hit, label: fill(RHYTHM_TEXT.pad, i + 1, hit ? RHYTHM_TEXT.padHit : RHYTHM_TEXT.padRest), name: fill(RHYTHM_TEXT.padName, i + 1, hit ? RHYTHM_TEXT.hit : RHYTHM_TEXT.rest) };
  });
}
// The option row, in Godot's order. View Circle frames the 3D visitors, so the fork leaves it out.
export function options(session, { musicPlaying = false, auditioning = false } = {}) {
  return [
    { id: 'listen', label: RHYTHM_TEXT.listen },
    { id: 'music', label: RHYTHM_TEXT.musicLabel + (musicPlaying ? RHYTHM_TEXT.on : RHYTHM_TEXT.off) },
    { id: 'complete', label: session?.practice ? RHYTHM_TEXT.resetPractice : RHYTHM_TEXT.complete },
    { id: 'step-cues', label: RHYTHM_TEXT.stepCues + (session?.stepCues ? RHYTHM_TEXT.on : RHYTHM_TEXT.off) },
    { id: 'back', label: RHYTHM_TEXT.back },
    { id: 'play-bar', label: auditioning ? RHYTHM_TEXT.stopBar : RHYTHM_TEXT.playBar, name: auditioning ? RHYTHM_TEXT.stopBarName : RHYTHM_TEXT.playBarName },
  ];
}

// --- Play Bar (rhythm_circle.gd play_bar), the gates in Godot's order. ---
// Returns {key, message, start, stop}: start means mute the sketch and play barSamples(pattern) at the
// music volume; stop means end the audition and restore the sketch gain.
export function playBarGate({ auditioning = false, unlocked = false, musicPlaying = false, volume = 0, mode = 'sketch', pattern = 0 } = {}) {
  const key = auditioning ? 'barStopped' : !unlocked ? 'locked' : !musicPlaying || volume <= 0 ? 'muted' : mode !== 'sketch' ? 'local' : pattern === 0 ? 'allRests' : 'playing';
  return { key, message: RHYTHM_TEXT[key], start: key === 'playing', stop: key === 'barStopped' };
}
// rhythm_circle.gd tick: an audition stops when the circle closes, music stops, volume is 0 or a local file plays.
export const auditionMustStop = ({ visible = false, musicPlaying = false, volume = 0, mode = 'sketch' } = {}) => !visible || !musicPlaying || volume <= 0 || mode !== 'sketch';

// --- Step highlight (rhythm_circle.gd update_world). ---
// frames: the sketch position in Godot frames; queued: frames not yet heard. auditionSeconds: the bar's
// playback position while it auditions, else null. Returns the lit step or -1.
export function activeStep(state, session, { musicPlaying = false, volume = 0, mode = 'sketch', frames = 0, queued = 0, auditionSeconds = null } = {}) {
  if (auditionSeconds !== null && auditionSeconds !== undefined) return auditionStep(auditionSeconds);
  const p = circlePattern(state, session);
  const stepping = circleAvailable(state) && !!session?.visible && !!session.stepCues && p !== 0 && musicPlaying && volume > 0 && mode === 'sketch';
  return stepping ? stepAt(frames, queued) : -1;
}
// Godot changes a lamp in one step (colour and 1.25x scale, no tween), so reduced motion needs nothing else.
export function lamps(pattern, step) {
  return Array.from({ length: 8 }, (_, i) => {
    const hit = has(pattern, i), lit = i === step && hit;
    return { step: i, hit, color: lit ? COLORS.lit : hit ? COLORS.hit : COLORS.rest, scale: lit ? COLORS.litScale : 1 };
  });
}
export const BAR_SECONDS = BAR_FRAMES / RATE;
