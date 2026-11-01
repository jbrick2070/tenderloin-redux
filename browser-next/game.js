import { SAVE_KEY, SETTINGS_KEY, PIXELS_PER_METRE, LITTER, MOTIFS, FURNITURE, PALETTES, SIGNS, LOANS, PHOTO_GUESTS, BLOCK_TEXT, initialState, applyAction, progress, ready, arranged, metCount, blockMissing, musicLayers, canPlaceFurniture, occupiedCells, walkable, findPath } from './core.js';
import { parseGodotSave, buildGodotSave, freshEnvelope, utf8Bytes, isWholeNumber, lostProgress, combineSaves, sceneAdmission, FORK_FIELDS } from './godot-save.js';
import { currentChapter, chapterLine, chapterCard, chapterCardDue, chapterAnnouncement, storyChapter, nextObjective, isNarrow, fmt, GATHERING_LAYOUT_TITLES } from './story.js';
import { installPressSettle } from './press-settle.js';
import { World, makeWays, objectLabel, NEIGHBORS, PLACES, PALETTE_COLORS } from './world.js';
import { BLACK_HAWK } from './history.js';
import { districtGeometry } from './district.js';
import { Soundtrack } from './soundtrack.js';
import { stemMask, stemSummary, cleanVolume, nextVolume, volumeAnnouncement, playingAnnouncement, switchedAnnouncement, MUSIC_TEXT, MAX_VOLUME } from './sketch-core.js';
import { RewardPlayer, progressCues, rewardFor, visitCue, soundsLabel, soundsAnnouncement, cleanRewardSounds, SOUNDS_TEXT } from './rewards.js';
import { PHOTO_RESPONSES, postcardSVG } from './keepsake.js';
import { gatheringScene, gatheringPlanSVG } from './gathering.js';
import { SEGMENTS, segment, programmeIssue, programmeTitle, programmeSVG, programmeResponse } from './programme.js';
import { currentActivity, tilePanelSVG, STORY_CHOICES, QUIET_CHOICES } from './hosting.js';
import { freshTalk, arriveTalk, chatTalk, confirmLoan, conversationView, arrivalCaption, talkAnnouncement, goodbyeLines, whatsNext, whatsNextAnnouncement, rookMusicDetail, narrowLabel, sparkCount, ACTION_LABELS, BUTTON_TEXT, HUB_LABELS, gdFormat } from './characters.js';
import { showBubble, stepBubble, spokenText, speechNotice, BUBBLE, BUBBLE_TEXT, FORK_BUBBLE } from './bubble.js';
import { HOSTING_FORK_TEXT, invitationHubText, invitationSVG, quietHubText, loanReply, loanRefusal, loanReturnAnnouncement, LOAN_COMPLETION_NOTICE, hostedCompletion } from './hosted-text.js';
import { ExperimentHost } from './experimental-host.js';
import { VERSION, EDITION } from './version.js';
import { CIVIC_TOPICS, CIVIC_FORMATS, CIVIC_NOTES, civicAvailable, civicConversation, civicPlanSVG } from './civic.js';
import { FILM_SHOTS, FILM_FRAMING, FILM_PLANS, filmAvailable, filmCaption, filmFrameSVG } from './film.js';
import { createEnding } from './ending/ui.js';
import { GODOT, FORK_TEXT, gdf } from './ending/text.js';
import { sceneReceipt } from './ending/mural.js';
import { hostedDetail, postedGatherLine } from './ending/hosted.js';
import { createRhythm } from './rhythm-ui.js';
import { createVisits } from './visits-ui.js';
import { createEpisodeScreens } from './visits-episodes.js';
import { createWorldVisits } from './visits-world.js';
import { VISITS_FORK_TEXT } from './visits-kit.js';
import { createSprites, tourMarkerLift, BEACON_LIFT } from './sprites.js';

const $ = selector => document.querySelector(selector);
const modal = $('#modal'), body = $('#modal-body'), canvas = $('#world');
let modalReturnTarget = canvas;
const music = new Soundtrack({ onChange: soundUI });
// Godot's RewardAudioPlayer: one chime at a time on the sketch's shared context, at a fixed gain, with music on or off.
const rewards = new RewardPlayer(() => music.sketch.ensureContext());
// envelope is the write base: the Godot save as last loaded or written. An unreadable save is held: no writes until Start over.
// recovery: the write base this tab had when a stored save lost some of its progress (envelope), with the mural scenes it had
// last read (scenes). Until the player keeps it or declines,
// state stays this tab's own progress, envelope is the stored save and nothing is written.
// loadedScenes: the mural scenes this tab last read from the shared save; its own writes do not change it, so scenes it
// painted or lifted stay its own choices when a recovery offer combines saves.
let state = initialState(), held = false, storageAvailable = true, savedMessage = '', envelope = freshEnvelope(), lastRaw = null, saveInfo = { status: 'fresh', reason: null, bytes: 0 }, recovery = null, loadedScenes = {};
let settings = { volume: cleanVolume(undefined), rewardSounds: true, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, experimental: { neighborhoodVoices: false } };
try { const raw = localStorage.getItem(SAVE_KEY), loaded = parseGodotSave(raw, { initialState }); adoptSave(loaded, raw); savedMessage = loaded.message; }
catch { storageAvailable = false; }
try {
  const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const stored = parsed && typeof parsed === 'object' ? parsed : {};
  if (typeof stored.reducedMotion === 'boolean') settings.reducedMotion = stored.reducedMotion;
  // Godot's music_volume: 0.70 for a new player, range 0-1.0; a stored preference is kept (clamped). Reward Sounds default on.
  settings.volume = cleanVolume(stored.volume);
  settings.rewardSounds = cleanRewardSounds(stored.rewardSounds);
  settings.experimental.neighborhoodVoices = stored.experimental?.neighborhoodVoices === true;
} catch { /* Invalid preferences do not make a valid game save unavailable. */ }
music.setVolume(settings.volume); rewards.setEnabled(settings.rewardSounds);
document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
const settle = installPressSettle(document, window);
let world, ways, toastTimeout, activeTool = 'table', activeMotif = 'sun', lastFrame = 0, lastHint = 0;
// walkOwner is 'visit' while a side story owns the walk (its arrival goes to visits.walkEnded); walkName is where the walk goes.
let walkTarget = null, walkPath = [], walkOwner = null, walkName = '', keys = new Set(), arrivedAt = null, nearAt = null, lastChapter = -1, cardQueued = false;
let districtStatus = 'idle', districtPromise;
// startupContinue: the open startup card's continue; walkOnClose: the movement key that dismissed it, walking once it closes.
let startupContinue = null, walkOnClose = null;
const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
// The ending chain (ending/ui.js) and Dez's Rhythm Circle (rhythm-ui.js): visit-only screens over the saved state.
// Godot save_receipt's reason in Godot's words, '' when the last write went through. A held save or a pending recovery
// offer writes nothing, so its receipt is visit-only too.
const saveReason = () => held || recovery ? 'not saved' : saveInfo.status === 'refused' ? saveInfo.reason === 'full' ? 'save full' : saveInfo.reason === 'storage' ? 'storage unavailable' : 'not saved' : !storageAvailable && !held ? 'storage unavailable' : '';
// Godot consume_chapter_announcement: Follow takes a due chapter announcement, with the Rhythm Circle's completion notice.
let chapterNotice = '';
const chapterText = () => { if (!chapterCardDue(lastChapter, state)) return ''; lastChapter = storyChapter(state).num; const text = chapterAnnouncement(state, chapterNotice) + ' '; chapterNotice = ''; return text; };
const modalStatus = text => { $('#modal-status').textContent = text; }, STUDIO = GODOT['programme_studio.gd'].refresh;
const ending = createEnding({ doc: document, win: window, modal, settle, getState: () => state, show, close: target => close(target), status: modalStatus, toast, stopWalk, reducedMotion: () => settings.reducedMotion, chapterText, act,
  sceneAdmission: next => sceneAdmission(envelope ?? recovery?.envelope, state, next), saveReason, music: { label: () => music.enabled || music.starting ? STUDIO.musicOn : STUDIO.musicOff, on: () => music.enabled || music.starting, toggle: toggleMusic },
  filmButtonLabel: () => $('#film-shoot')?.textContent.replace(/\s*↗\s*$/, '') ?? '', openDraft: () => programmeEditor(), openPosted: () => programmePoster(), openMural: () => muralEditor() });
// Leaving the circle returns focus to the button that opened it: the hosting dialog's (its title once the circle's Complete
// hosted the beats) or the afterglow's.
const rhythm = createRhythm({ doc: document, win: window, modal, getState: () => state, show, status: modalStatus, toast, act, music, volume: () => settings.volume, unlocked: () => rewards.unlocked, toggleMusic, stopWalk,
  receipt: () => sceneReceipt(saveReason()), objective: () => nextObjective(state, storyWorld()).text, sparks: () => sparkCount(state, talkExtras()), lastChapter: () => !chapterCardDue(lastChapter, state),
  afterClose: (origin, text, notice = '') => { if (notice) chapterNotice = notice; if (origin === 'hosting' && state.hosting.order.length) return hostingScreen(text, 'host-rhythm'); close($('#rhythm-circle') || canvas); if (text) toast(text); } });
// The side stories (visits-ui.js with the episode screens and the neighborhood part): one visit-only session over the saved state,
// never saved itself; the one saved field, state.surprises, changes through act(). Their host is spec 3.2's.
const visitsHost = {
  doc: document, win: window, modal, settle, show, close: target => close(typeof target === 'string' ? document.getElementById(target) || canvas : target),
  returnTo: id => { modalReturnTarget = document.getElementById(id) || canvas; }, status: modalStatus, announce, toast, getState: () => state, act, saveReason,
  chime: (id, reason) => { try { rewards.play(rewardFor([visitCue(id, reason)], { enabled: settings.rewardSounds, unlocked: rewards.unlocked })); } catch { /* a chime never holds up a visit */ } },
  walk: (goal, options) => visitWalk(goal, options), stopWalk: () => stopWalk(), walking: () => walkPath.length > 0, player: () => ({ ...state.player }),
  lookAt: point => { if (!world) return; world.camera.lookAt(point); cameraUI(); }, speak: (id, text, name) => speak(id, text, name),
  music: { label: () => music.enabled || music.starting ? STUDIO.musicOn : STUDIO.musicOff, on: () => music.enabled || music.starting, toggle: toggleMusic },
  reducedMotion: () => settings.reducedMotion, sparks: () => sparkCount(state, talkExtras()), objective: () => nextObjective(state, storyWorld()), openNeighborId: () => openConversation(),
  cards: () => { const card = chapterCardOpen(); return { startup: card && !!body.querySelector('[data-chapter-card] #begin'), story: card }; }, dialogOpen: () => modal.open,
  hostingInProgress: () => state.hosting.order.length > 0 && state.hosting.results.length < 4, restoreStartupCard: text => showChapterCard(true, { announce: text }), load: name => loadVisitData(name),
};
const visits = createVisits(visitsHost, { createEpisodeScreens, createWorldVisits });
const sprites = createSprites({ reducedMotion: () => settings.reducedMotion });
// The side stories on the map: their objects for hit tests where sprites.js draws them (the tour marker at its diamond; a surprise
// beacon at its foot, half way up and at its globe, and along its label chip where this frame placed it), and their ground, actors
// and overlay layers, all drawn from visits.scene().
const mapLayers = {
  objects: w => {
    let scene = null;
    return visits.objects(w).flatMap(o => o.id === 'tour-marker' ? [{ ...o, y: o.y - tourMarkerLift(w.scale) }] : o.id.startsWith('surprise:') ? [o, { ...o, y: o.y - BEACON_LIFT / 2 }, { ...o, y: o.y - BEACON_LIFT }, ...sprites.chipTargets(w, scene ??= visits.scene(), o)] : [o]);
  },
  ground: (c, w) => sprites.ground(c, w, visits.scene()), actors: w => sprites.actors(w, visits.scene()), overlay: (c, w) => sprites.overlay(c, w, visits.scene()),
};
// Godot's session-only talk counters (characters.js freshTalk; Celeste's is the saved celesteTalks) and the one shared
// speech bubble with its live-region mirror (routeSpeech, read by hint()).
let talks = freshTalk(), bubble = null, routeSpeech = null;
// This visit's session-only state: talk turns, the last arrival, a pending chapter notice, the speech bubble and the side stories
// (visits-ui.js). Start fresh starts it over, and so does a stored save that replaces this tab's state (from another tab or
// edition, or Use the shared save), as Godot's load does. An action rebased onto a newer save keeps it. Returns the side
// stories' sync: closed when one of their screens held the dialog.
function resetSession() { talks = freshTalk(); arrivedAt = nearAt = null; chapterNotice = ''; bubble = null; routeSpeech = null; return visits.sync({ adopted: true }); }
let voicesModulePromise, voicesImportAttempt = 0;
const voicesHost = new ExperimentHost({
  load: async scope => {
    if (!voicesModulePromise) {
      const suffix = voicesImportAttempt++ ? `?retry=${voicesImportAttempt}` : '';
      voicesModulePromise = import(`./experiments/neighborhood-voices.js${suffix}`).catch(error => { voicesModulePromise = null; throw error; });
    }
    const module = await voicesModulePromise;
    if (typeof module.activate !== 'function') { voicesModulePromise = null; throw Error('Optional module unavailable'); }
    return scope.active() ? module.activate(scope) : null;
  },
  onChange: voicesUI,
  onDisable: () => {
    if (settings.experimental.neighborhoodVoices) { settings.experimental.neighborhoodVoices = false; saveSettings(); }
    if (body.querySelector('[data-neighborhood-voices]')) { showSettings(); modalReturnTarget = $('#settings-button'); $('#voices-enabled').focus({ preventScroll: true }); $('#voices-enabled').scrollIntoView({ block: 'nearest' }); }
  },
  present: html => { show(html); modalReturnTarget = $('#voices-button'); $('#modal-title').focus({ preventScroll: true }); },
  closeView: () => close($('#voices-button')),
});
function voicesUI() {
  $('#voices-button').hidden = !voicesHost.enabled;
  if ($('#voices-enabled')) $('#voices-enabled').checked = voicesHost.enabled;
  const status = voicesHost.status === 'ready' ? 'Ready. Read the organization cards whenever you like.' : voicesHost.status === 'error' ? 'The experiment could not load. Core play is ready; retry or turn it off.' : voicesHost.status === 'paused' ? 'Paused while away. Open Neighborhood Voices to resume.' : voicesHost.enabled ? 'Loading the optional organization cards…' : 'Off. No optional cards or recordings are active.';
  if ($('#voices-settings-status')) $('#voices-settings-status').textContent = status;
  if (!$('#voices-load-state')) return;
  $('#voices-load-state').textContent = status;
  const retry = $('#voices-retry');
  if (document.activeElement === retry && voicesHost.status !== 'error') $('#modal-title').focus({ preventScroll: true });
  retry.hidden = voicesHost.status !== 'error';
  $('#voices-read').hidden = voicesHost.status !== 'ready';
}
function setVoicesEnabled(enabled) { settings.experimental.neighborhoodVoices = enabled; saveSettings(); voicesHost.setEnabled(enabled); }
function openVoices() {
  if (!voicesHost.enabled) return;
  if (voicesHost.status === 'paused') voicesHost.resume();
  if (voicesHost.status === 'ready' && voicesHost.open()) return;
  show(`<section data-neighborhood-voices><span class="eyebrow">EXPERIMENTAL · OPTIONAL</span><h2 id="modal-title" tabindex="-1">Neighborhood Voices</h2><p>Three dated organization cards, text only. Your gathering does not depend on this experiment.</p><p id="voices-load-state" role="status"></p><div class="button-row"><button id="voices-read" class="primary-button" hidden>Read the organization cards</button><button id="voices-retry" class="secondary-button" hidden>Retry the experiment</button>${button('voices-off', 'Turn off Neighborhood Voices')}${button('voices-back', 'Back to the block')}</div></section>`);
  modalReturnTarget = $('#voices-button'); $('#modal-title').focus({ preventScroll: true });
  bind('voices-read', openVoices); bind('voices-retry', () => voicesHost.retry()); bind('voices-off', () => setVoicesEnabled(false)); bind('voices-back', () => close($('#voices-button'))); voicesUI();
}

// An open dialog makes the page behind it inert, so the toast would be covered and silent: while one is open, the text goes
// to a status line inside it, and moves to the toast when the dialog closes.
const notice = document.createElement('p');
notice.id = 'modal-notice'; notice.className = 'modal-notice'; notice.setAttribute('role', 'status'); modal.prepend(notice);
function toast(text) {
  clearTimeout(toastTimeout);
  if (modal.open) { notice.textContent = text; $('#toast').classList.remove('show'); toastTimeout = setTimeout(() => { notice.textContent = ''; }, 4300); return; }
  $('#toast').textContent = text; $('#toast').classList.add('show'); toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 4300);
}
function releaseNotice() { const text = notice.textContent; if (!text || modal.open) return; notice.textContent = ''; toast(text); }
// Save notices wait for the current handler to draw its dialog, or close it, and then go where the player is looking.
const notify = text => queueMicrotask(() => toast(text));
// Adopt a parsed Godot save, keeping this visit's walk and tidying when `keep` is the current state; hold an unreadable one.
function adoptSave(result, raw, keep) {
  lastRaw = raw; loadedScenes = result.state.muralScenes;
  if (result.status === 'invalid') { held = true; envelope = null; saveInfo = { status: 'held', reason: result.reason, bytes: utf8Bytes(raw ?? '') }; if (!keep) state = result.state; return false; }
  held = false; envelope = result.envelope; saveInfo = { status: result.status, reason: null, bytes: raw ? utf8Bytes(raw) : 0 };
  state = keep ? { ...result.state, player: keep.player, litter: keep.litter } : result.state;
  return true;
}
// Another tab or the 3D edition may have written since the last load or write. Returns the stored save when it changed.
// A save that lost forward-only progress (a 3D tab opened earlier, or a restart there) is offered back: this tab keeps showing
// its own progress until the player chooses. The offer is withdrawn when the stored save is cleared (someone started over),
// becomes unreadable, or holds this tab's progress again. A stored save that replaces this tab's state starts the session
// over, unless an action is about to be rebased onto it (rebase). closed: an open ending screen the stored save's new copies closed;
// visitsClosed: a side-story screen that starting the session over closed.
function reread({ rebase = false } = {}) {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { storageAvailable = false; return null; }
  if (raw === lastRaw) return null;
  const result = parseGodotSave(raw, { initialState }), before = state, base = envelope, loaded = result.status === 'loaded', scenes = loadedScenes;
  adoptSave(result, raw, before);
  if (recovery && (!loaded || !lostProgress(ownEnvelope(before), result.envelope))) { recovery = null; if (modal.open && body.querySelector('[data-recovery]')) close(); }
  else if (!recovery && loaded && lostProgress(base, result.envelope)) recovery = { envelope: base, scenes };
  let visitsClosed = false;
  if (recovery) state = before;
  else if (state !== before && !rebase) visitsClosed = resetSession().closed;
  const closed = ending.sync({ adopted: true }).closed;
  return { result, before, closed, visitsClosed };
}
// This tab's progress as a save over its own write base, for comparing with a newer stored save.
const ownEnvelope = s => buildGodotSave(recovery.envelope, s, { reset: true }).envelope || recovery.envelope;
// An ending screen the new copies closed says why: this visit's ending started fresh, and the saved progress stays (FORK_TEXT).
// Otherwise a side-story screen the restarted session closed says the visit's side stories started fresh (VISITS_FORK_TEXT).
const syncNotice = changed => held ? SAVE_TEXT.held : changed.result.status === 'fresh' ? 'The shared save was cleared in another tab. A fresh afternoon is ready.' : changed.closed ? FORK_TEXT.copiesChanged : changed.visitsClosed ? VISITS_FORK_TEXT.adopted : 'Progress saved in another tab or edition is here now.';
function syncStored() {
  const changed = reread();
  if (!changed) return;
  updateUI(); if (recovery) offerRecovery(); else notify(syncNotice(changed));
}
const savedFields = s => JSON.stringify(FORK_FIELDS.map(key => s[key]));
// The keepsake layout Godot holds for this tab's progress (take_keepsake_photo keeps it).
const photoLayout = () => (recovery ? recovery.envelope : envelope)?.epilogue?.photo?.layout;
// False when the action no longer applies to a save another tab or edition wrote first, so nothing was written for it.
function persist(action) {
  const changed = reread({ rebase: true });
  if (recovery) { updateUI(); offerRecovery(); return true; }
  if (changed && !held) {
    // Rebase: the same action on the stored progress. Nothing to write when it changes nothing there.
    const base = state, redo = action.type === 'photo' ? { ...action, layout: photoLayout() } : action;
    state = applyAction(base, redo); updateUI();
    if (savedFields(state) === savedFields(base)) {
      const gone = savedFields(base) !== savedFields(changed.before);
      notify(gone ? `${syncNotice(changed)} Your last change no longer applies, so it was not saved.` : syncNotice(changed)); return !gone;
    }
  }
  if (held) { saveUI(); if (changed) notify(SAVE_TEXT.held); return true; }
  commit(buildGodotSave(envelope, state)); return true;
}
function commit(out) {
  if (!out.ok) { saveInfo = { status: 'refused', reason: out.reason, bytes: out.bytes }; saveUI(); notify(saveText()); return false; }
  try { localStorage.setItem(SAVE_KEY, out.raw); storageAvailable = true; }
  catch { storageAvailable = false; saveInfo = { status: 'refused', reason: 'storage', bytes: out.bytes }; saveUI(); notify(saveText()); return false; }
  envelope = out.envelope; lastRaw = out.raw; saveInfo = { status: 'saved', reason: null, bytes: out.bytes }; saveUI(); return true;
}
// Shown after the current handler's own dialog, so the offer is not drawn over. Escape or × puts the choice off: the offer
// returns with the next action to save.
function offerRecovery(message = '') {
  queueMicrotask(() => {
    if (!recovery) return;
    show(`<section data-recovery><span class="eyebrow">ONE SAVE, TWO EDITIONS</span><h2 id="modal-title">Some progress went back.</h2><p>The shared save now holds less than this tab did. A 3D edition that was already open, or another tab, saved older progress over it, or someone started over there.</p><p>Keep this tab’s progress to combine the two: what either one reached stays, and this tab’s choices win where they differ. Reload the other edition before you play it again.</p>${message ? `<p class="grid-message">${message}</p>` : ''}<div class="button-row">${button('recover-save', 'Keep this tab’s progress', true)}${button('recover-skip', 'Use the shared save as it is')}</div></section>`);
    bind('recover-save', recover); bind('recover-skip', declineRecovery);
  });
}
const KEEP_REFUSED = { full: 'Together they would not fit in the shared save, so nothing was written. This tab’s progress waits here until you choose.', storage: 'Browser storage is unavailable, so nothing was written. This tab’s progress waits here until you choose.', other: 'They could not be combined safely, so nothing was written. This tab’s progress waits here until you choose.' };
// This tab's progress is dropped only once the combined save is written.
function recover() {
  const changed = reread();
  if (!recovery) { if (changed) notify(syncNotice(changed)); return; }
  const out = combineSaves(envelope, state, recovery.envelope, recovery.scenes);
  if (!out.ok || !commit(out)) { offerRecovery(KEEP_REFUSED[out.ok ? 'storage' : out.reason] || KEEP_REFUSED.other); return; }
  // Slots this tab had only adopted now follow the combined save; slots it painted or lifted stay its own (combineSaves).
  loadedScenes = out.loadedScenes;
  recovery = null; state = { ...out.state, player: state.player, litter: state.litter }; close(); updateUI();
  notify('This tab’s progress is back, combined with the shared save. Reload the other edition before you play it again.');
}
function declineRecovery() {
  const changed = reread();
  if (!recovery) { if (changed) notify(syncNotice(changed)); return; }
  recovery = null; adoptSave(parseGodotSave(lastRaw, { initialState }), lastRaw, state); close();
  // The shared save replaces this tab's progress as a load does: this visit's session and the ending's copies start over.
  resetSession(); ending.sync({ adopted: true }); updateUI();
  notify('The shared save stays as it is. Reload the other edition after switching.');
}
const SAVE_TEXT = { fresh: 'Progress saves in this browser, shared with the 3D edition.', loaded: 'Your afternoon is saved in this browser, shared with the 3D edition.', saved: 'Saved in this browser. Your afternoon can wait.', held: 'The shared save could not be read, so it is kept as it is and nothing is saved. Start over to replace it; that also resets the 3D edition.', pending: 'Some progress went back. This tab’s progress is not saved until you choose to keep it or use the shared save.' };
const REFUSED_TEXT = { full: 'Visit-only: save full; reload may lose changes.', storage: 'Visit-only: storage unavailable; reload may lose changes.', other: 'Visit-only: this change could not be saved safely; the shared save is unchanged.' };
function saveText() { return recovery ? SAVE_TEXT.pending : saveInfo.status === 'refused' ? REFUSED_TEXT[saveInfo.reason] || REFUSED_TEXT.other : !storageAvailable && !held ? REFUSED_TEXT.storage : SAVE_TEXT[saveInfo.status]; }
function saveUI() { $('#save-status').textContent = saveText(); $('#save-start-over').hidden = !held; }
const saveSeq = () => envelope && isWholeNumber(envelope.save_seq) ? Math.round(envelope.save_seq) : 0;
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { toast('Settings will last for this visit; browser storage is unavailable.'); } }
// Only a reducer's new state is persisted, and only when it changes what the shared save holds. False when the action
// changed nothing, or no longer applied to a save another tab or edition wrote first.
function act(action) {
  const before = state, next = applyAction(state, action);
  // Godot trigger_progress_cue: this action's chime, under the Sounds setting and the first-press unlock. Loads never chime.
  rewards.play(rewardFor(progressCues(before, next, action), { enabled: settings.rewardSounds, unlocked: rewards.unlocked }));
  if (next === state) return false;
  state = next; updateUI();
  return savedFields(next) === savedFields(before) || persist(action);
}
function show(html) {
  voicesHost.dismiss();
  const focused = modal.open ? document.activeElement?.id : null;
  body.innerHTML = html;
  if (!modal.open) { modalReturnTarget = canvas; keys.clear(); modal.showModal(); }
  const previous = focused ? document.getElementById(focused) : null;
  if (!previous || !modal.contains(previous)) modal.scrollTop = 0;
  const focusTarget = previous && modal.contains(previous) && !previous.disabled ? previous : body.querySelector('button:not([disabled]):not([hidden]),a[href]:not([hidden]),input:not([disabled]):not([hidden])') || $('#close-modal');
  focusTarget.focus({ preventScroll: true });
  $('#modal-status').textContent = body.querySelector('.grid-message')?.textContent || '';
}
function returnFocus() { return modalReturnTarget.isConnected ? modalReturnTarget : document.getElementById(modalReturnTarget.id) || canvas; }
function focusReturn() { const target = returnFocus(); target.focus({ preventScroll: true }); if (['civic-hour', 'film-shoot'].includes(target.id)) target.scrollIntoView({ block: 'nearest' }); }
function close(target = canvas) { voicesHost.dismiss(); modalReturnTarget = target instanceof HTMLElement ? target : canvas; modal.close(); focusReturn(); releaseNotice(); }
function bind(id, callback) { document.getElementById(id)?.addEventListener('click', callback); }
function button(id, label, primary = false, disabled = false) { return `<button id="${id}" class="${primary ? 'primary-button' : 'secondary-button'}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function updateUI() {
  const p = progress(state), count = Object.values(p).filter(Boolean).length, met = metCount(state), placed = MOTIFS.filter(id => state.mural[id]).length;
  $('#progress-label').textContent = `${count} of 3 preparations`; $('#progress-percent').textContent = `${Math.round(count / 3 * 100)}%`; $('#progress-fill').style.width = `${count / 3 * 100}%`;
  const unmet = NEIGHBORS.filter(n => !state.visited.includes(n.id)).map(n => n.name), layoutName = GATHERING_LAYOUT_TITLES[state.layout];
  // Godot's opening: meet all five, paint three motifs, soundcheck with Rook. The layout is an optional step.
  const tasks = [
    { id: 'neighbors', title: `Meet the neighbors ${met}/5`, done: p.neighbors, detail: p.neighbors ? 'Everyone on the block has said hello.' : `Say hello to ${unmet.length > 1 ? `${unmet.slice(0, -1).join(', ')} and ${unmet.at(-1)}` : unmet[0]}.` },
    { id: 'mural', title: `Mural ${placed}/3`, done: p.mural, detail: p.mural ? 'Three neighbors’ ideas, one original panel.' : 'Paint Sun, Wave and Rise with Celeste.' },
    { id: 'sound', title: 'Soundcheck with Rook', done: p.sound, detail: p.sound ? state.epilogue.packing ? 'Rook helped the gathering find its rhythm.' : 'Rook has the mix ready to go.' : 'Talk with Rook to check the sound.' },
    { id: 'layout', title: 'Choose the gathering', done: !!state.layout, detail: state.layout ? `${layoutName}${state.opened ? '' : arranged(state) ? ' · route stays clear' : ` · ${Object.keys(state.furniture).length}/3 supplies arranged`}` : 'Optional · Bea’s Long Table or Dez & Celeste’s Open Floor. The Long Table if you don’t choose.' },
  ];
  $('#tasks').innerHTML = tasks.map((task, i) => `<li class="task ${task.done ? 'done' : ''} ${task.id === 'layout' ? 'optional' : ''}"><button id="task-${task.id}" aria-label="${task.title}. ${task.detail}"><span class="task-number">${task.done ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="task-content"><span class="task-title">${task.title}</span><span class="task-detail">${task.detail}</span></span><span class="task-arrow">↗</span></button></li>`).join('');
  bind('task-neighbors', () => { const goal = nextObjective(state, storyWorld()); if (goal.id === 'meet') goTo(goal.target); else neighbors(); });
  bind('task-layout', () => goTo(NEIGHBORS[0]));
  bind('task-mural', () => goTo(PLACES.find(p => p.id === 'mural')));
  bind('task-sound', () => goTo(NEIGHBORS.find(n => n.id === 'rook')));
  $('#open-gathering').disabled = !ready(state); $('#open-gathering').innerHTML = state.opened ? 'Enjoy the gathering <span>↗</span>' : 'Open the gathering <span>↗</span>';
  // Godot's MUSIC_STEM_ORDER names: bass, brush, chords, lead.
  const stems = [['layout', 'Bass'], ['tidy', 'Brush'], ['mural', 'Chords'], ['opened', 'Lead']], layers = musicLayers(state);
  $('#stems').innerHTML = stems.map(([key, label]) => `<span class="stem ${layers[key] ? 'active' : ''}"><i></i>${label}</span>`).join('');
  music.update(layers);
  if (state.layout === 'floor') { $('#neighbor-quote').textContent = state.opened ? '“Turns out a little room was all we needed to find the rhythm.”' : '“Leave a little open space. You never know who might start dancing.”'; $('#neighbor-credit').textContent = '— Dez, your neighbor'; }
  else { $('#neighbor-quote').textContent = state.opened ? '“See? We already had what mattered. Each other.”' : '“A long table, a few good stories. That’s my kind of afternoon.”'; $('#neighbor-credit').textContent = '— Bea, your neighbor'; }
  saveUI(); chapterUI();
  updateAfterglow(); ending.sync(); rhythm.sync(); visits.sync();
  soundUI();
  queueChapterCard();
}
const PLACE_BY_ID = Object.fromEntries(PLACES.map(place => [place.id, place]));
// The objective's world: the map, the side stories' active episode, tour and last hint, and the open conversation.
const storyWorld = () => ({ player: state.player, neighbors: NEIGHBORS, places: PLACE_BY_ID, ...visits.objectiveInputs(), openNeighborId: openConversation() });
function chapterUI() {
  const text = chapterLine(state, { narrow: isNarrow(innerWidth), world: storyWorld() });
  if ($('#chapter-text').textContent !== text) $('#chapter-text').textContent = text;
}
const chapterCardOpen = () => modal.open && !!body.querySelector('[data-chapter-card]');
// Godot show_story_card: on every load, then whenever the chapter number differs from the last card, once no dialog is open.
// announce: the status line in place of the chapter's announcement (Before These Streets' close line when it comes back here).
function showChapterCard(startup = false, { announce } = {}) {
  const card = chapterCard(state, { startup, notice: chapterNotice }), id = startup ? 'begin' : 'chapter-continue';
  chapterNotice = '';
  lastChapter = card.num;
  show(`<section data-chapter-card>${startup ? '<div class="welcome-art" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' : ''}<span class="eyebrow">${startup ? 'WELCOME TO YOUR AFTERNOON' : 'A NEW CHAPTER ON THE BLOCK'}</span><h2 id="modal-title">${card.title}</h2><p>${card.body}</p>${startup ? `<div class="button-row">${visits.entryHTML('before')}</div>` : ''}<div class="button-row">${button(id, card.button, true)}</div>${startup ? '<div class="dialog-controls"><span><kbd>WASD</kbd> or arrows to walk</span><span><kbd>E</kbd> to talk / help</span></div><p class="footnote">Tap people or objects, choose a preparation, or use Meet the neighbors to walk over. Use + / − to zoom, drag to look around, and Follow me to find yourself. A fictional gathering on real street centerlines; scenery is an early approximation. Music is optional.</p>' : ''}</section>`);
  $('#modal-status').textContent = announce ?? card.announcement;
  const returning = state.visited.length || Object.keys(state.mural).length;
  // Godot continue_story(true): the startup card's button, or W/A/S/D or an arrow key on it, starts the music unless it is
  // playing. Escape and × stay silent.
  const go = () => { close(); if (startup && !music.enabled && !music.starting) music.start(); if (startup) toast(held ? savedMessage : returning && savedMessage ? savedMessage : 'Bea is just ahead. Tap her, or choose Meet the neighbors.'); };
  bind(id, go); startupContinue = startup ? go : null;
  // Godot's optional opening sits above Start Exploring, which keeps the focus (story_continue_btn.grab_focus).
  if (startup) { visits.bindEntry('before'); $('#begin').focus({ preventScroll: true }); }
}
function queueChapterCard() {
  if (cardQueued) return;
  cardQueued = true;
  queueMicrotask(() => { cardQueued = false; if (world && !modal.open && !recovery && chapterCardDue(lastChapter, state)) showChapterCard(); });
}

// Godot active_stem_summary, for example "bass+brush (2/4 stems)".
const stemsNow = () => stemSummary(stemMask(musicLayers(state)));
function soundUI() {
  const local = !!music.fileName;
  $('#sound-toggle').setAttribute('aria-pressed', String(music.enabled));
  $('#sound-toggle').setAttribute('aria-label', local ? music.enabled || music.starting ? 'Pause local track' : 'Play local track' : music.enabled || music.starting ? 'Mute music sketch' : 'Enable music sketch');
  $('#sound-toggle').textContent = local ? music.enabled || music.starting ? 'Ⅱ' : '▶' : '♫';
  $('#stems').hidden = local;
  $('#sound-heading').textContent = local ? 'YOUR NEIGHBORHOOD MIX' : 'THE BLOCK FINDS ITS RHYTHM';
  $('#sound-disclosure').textContent = local ? 'Local audio · this tab only' : 'Original synth sketch\nRecorded jazz to come';
  if (local) $('#sound-caption').textContent = music.error || `${music.enabled ? 'Playing' : music.starting ? 'Starting' : 'Ready'}: ${music.fileName}`;
  else {
    const count = Object.values(progress(state)).filter(Boolean).length, line = state.epilogue.packing ? 'A shared afternoon, kept in your field notes.' : state.opened ? 'All four parts are ready. Stay a little longer.' : count ? `${count} preparations made. The music is taking shape.` : 'A quiet beginning. Each contribution adds a layer.';
    $('#sound-caption').textContent = `${line} · ${stemsNow()}`;
  }
  if (music.error) $('#sound-caption').textContent = music.error;
  // Rook's open music panel follows the player's play and pause.
  rhythm.musicChanged();
  if ($('#talk-play')) $('#talk-play').textContent = music.enabled || music.starting ? BUTTON_TEXT.pause : BUTTON_TEXT.play;
  if ($('#soundtrack-status')) {
    // Playing, the panel's status line says Godot's start_music_playback line; starting or waiting for Play, its own.
    const playing = music.enabled ? playingAnnouncement({ ...musicView(), summary: stemsNow() }) : '';
    const sketchStatus = music.starting ? 'Starting the synth sketch…' : playing || 'Original synth sketch selected. Press Play to listen.';
    $('#soundtrack-status').textContent = music.error || (local ? playing || `${music.fileName} — ${music.starting ? 'starting' : 'ready; press Play'}.` : sketchStatus);
    $('#track-play').textContent = music.enabled || music.starting ? 'Pause music' : 'Play music';
    const wasFocused = document.activeElement === $('#use-sketch');
    $('#use-sketch').disabled = !local;
    if (wasFocused && !local) $('#track-play').focus({ preventScroll: true });
  }
}
// Godot toggle_music_playback: "Music paused.", or start_music_playback's "Music playing: …" once the music plays. The line is
// announced as Godot announces it and returned, so a dialog that redraws after the toggle can say it again, last.
async function toggleMusic() {
  let said = '';
  if (music.enabled || music.starting) { music.stop(); said = MUSIC_TEXT.paused; }
  else {
    const started = await music.start();
    if (started === false) toast(music.error || 'Audio is unavailable in this browser. All activities still work.');
    else if (started) said = playingAnnouncement({ ...musicView(), summary: stemsNow() });
  }
  soundUI(); announce(said);
  return said;
}
// Godot use_synth_sketch (Rook's sketch button): a loaded local track gives way to the sketch, which plays on if the music was
// playing or starting; already on the sketch, nothing audible changes. The switch is announced, and returned once a start has
// settled, so Rook's panel redraws in the real state and says it again, last.
async function useSynthSketch() {
  const playing = !!music.fileName && (music.enabled || music.starting);
  if (music.fileName) music.useSketch();
  const said = switchedAnnouncement(stemsNow());
  announce(said);
  if (playing && await music.start() === false) toast(music.error || 'Audio is unavailable in this browser. All activities still work.');
  return said;
}
function showMusic() {
  show(`<span class="eyebrow">SET THE MOOD</span><h2 id="modal-title">Your block. Your music.</h2><p>Bring a jazz track you made in Suno, or any MP3/WAV you want to try here. It plays on repeat while you explore.</p><label class="file-picker" for="soundtrack-file">Choose an MP3 or WAV<input id="soundtrack-file" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav"></label><p id="soundtrack-status" class="track-status" role="status" aria-live="polite"></p><label class="settings-row" for="soundtrack-volume"><span>Music volume <span id="track-volume-number">${Math.round(settings.volume * 100)}%</span></span><input id="soundtrack-volume" data-rapid type="range" min="0" max="${MAX_VOLUME * 100}" value="${Math.round(settings.volume * 100)}"></label><div class="button-row">${button('track-play', 'Play music', true)}${button('use-sketch', 'Return to synth sketch')}${button('music-close', 'Back to the block')}</div><p class="footnote">The file stays on your device and is not uploaded or saved with your game. Choose it again after a reload. Up to 100 MB. Sound is always optional.</p>`);
  $('#soundtrack-file').addEventListener('change', event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { music.loadFile(file); } catch (error) { music.error = error.message; soundUI(); }
    event.target.value = '';
  });
  $('#soundtrack-volume').addEventListener('input', event => { settings.volume = Number(event.target.value) / 100; music.setVolume(settings.volume); $('#track-volume-number').textContent = `${Math.round(settings.volume * 100)}%`; saveSettings(); });
  bind('track-play', toggleMusic); bind('use-sketch', () => music.useSketch()); bind('music-close', close); soundUI();
}

function updateAfterglow() {
  const panel = $('#afterglow'); panel.hidden = !state.opened;
  if (!state.opened) { panel.innerHTML = ''; return; }
  const { packing, returned, photo } = state.epilogue;
  const allReturned = LOANS.every(loan => returned.includes(loan.id)), scene = gatheringScene(state);
  panel.innerHTML = `<div class="afterglow-heading"><span class="eyebrow">${packing ? 'BORROWED WITH CARE' : 'THE AFTERNOON CONTINUES'}</span><h2>${packing ? allReturned ? 'Ready for another afternoon.' : 'A little thank-you lap.' : 'Stay a little longer.'}</h2><p>${packing ? allReturned ? 'The three loans are back with their neighbors. The mural and your memories stay. You can keep exploring.' : 'Bea folds her seats while you return three event loans. Take your time; the gathering is already complete.' : 'Make a keepsake, keep talking, or simply enjoy the block. When you’re ready, help pack up together.'}</p><p class="gathering-caption">${scene.caption}</p></div><div class="afterglow-actions">${button('see-gathering-plan', 'See your gathering plan ↗')}${photo.status === 'taken' ? button('view-keepsake', 'View your illustrated keepsake ↗') : !packing ? button('make-keepsake', photo.status === 'skipped' ? 'Changed your mind about a keepsake?' : 'Ask about a keepsake ↗') : '<p class="footnote">You kept this afternoon as a story. No picture was needed.</p>'}${!packing ? button('start-pack', 'When you’re ready, pack up') : `<div class="loan-list" aria-label="Optional event loans">${LOANS.map(loan => `<button id="visit-${loan.id}" class="loan-button ${returned.includes(loan.id) ? 'returned' : ''}" ${returned.includes(loan.id) ? 'disabled' : ''}><span>${returned.includes(loan.id) ? '✓' : '↗'}</span>${loan.label}<small>${returned.includes(loan.id) ? 'Returned · thank you' : `Return to ${NEIGHBORS.find(n => n.id === loan.owner).name}`}</small></button>`).join('')}</div>`}</div>`;
  bind('make-keepsake', () => photoConsent()); bind('view-keepsake', viewKeepsake); bind('start-pack', packingChoice);
  bind('see-gathering-plan', showGatheringPlan);
  panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', button('next-afternoon', state.programme.published.length ? 'Revisit our next afternoon ↗' : 'Plan another afternoon ↗'));
  bind('next-afternoon', () => programmeEditor());
  if (state.programme.published.length || state.hosting.order.length) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', button('host-afternoon', state.hosting.results.length === 4 ? 'Remember our second gathering ↗' : state.hosting.order.length ? 'Continue our second gathering ↗' : 'Host the posted programme ↗', true));
    bind('host-afternoon', () => hostingScreen());
  }
  if (rhythm.available()) { panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<button id="rhythm-circle" class="secondary-button" aria-label="${esc(rhythm.entryLabel().replace(/\n/g, ' '))}">${esc(rhythm.entryLabel()).replace(/\n/g, '<br>')}</button>`); bind('rhythm-circle', () => rhythm.open('block')); }
  // The side stories on the block (visits-ui.js): Neighborhood Stories and Cook & Share.
  panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', visits.entryHTML('story') + visits.entryHTML('meal')); visits.bindEntry('story'); visits.bindEntry('meal');
  if (civicAvailable(state)) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<div class="civic-invitation"><p>${state.civic.phase === 'done' ? 'Later on the block: a tenant listening hour, kept as a shared memory.' : 'A later afternoon: the neighbors want to talk about staying and thriving here. A peaceful tenant listening hour is ready whenever you are.'}</p>${button('civic-hour', state.civic.phase === 'done' ? 'Remember our listening hour ↗' : state.civic.phase === 'idle' ? 'A tenant listening hour ↗' : 'Continue our listening hour ↗')}</div>`);
    bind('civic-hour', () => civicScreen());
  }
  if (filmAvailable(state)) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<div class="civic-invitation"><p>A later fictional day: Celeste and Dez propose a tiny illustrated film, made around the neighbors’ needs.</p>${button('film-shoot', state.film.phase === 'done' ? 'Screen our little film ↗' : state.film.phase === 'idle' ? 'A little film on the block ↗' : 'Continue our little film ↗')}</div>`);
    bind('film-shoot', () => filmScreen());
  }
  LOANS.forEach(loan => bind(`visit-${loan.id}`, () => goTo(NEIGHBORS.find(n => n.id === loan.owner))));
  if (packing) { $('#open-gathering').innerHTML = 'Your afternoon <span>↗</span>'; $('#neighbor-quote').textContent = allReturned ? '“Everything borrowed is back. That makes next time easier.”' : '“I’ll fold the seats. You catch up with the others.”'; $('#neighbor-credit').textContent = '— Bea, your neighbor'; }
  if (state.hosting.order.length) { if (!packing) panel.querySelector('.afterglow-heading h2').textContent = 'Your opening afternoon.'; panel.querySelector('.gathering-caption').textContent = 'Opening chapter: ' + scene.caption; $('#open-gathering').innerHTML = 'Remember the opening <span>↗</span>'; }
}
const FILM_DONE = GODOT['main.gd'].film_capture_shot;
function filmScreen(message = '', focusId = '', viewIndex = 0) {
  if (!filmAvailable(state)) return;
  if (state.film.phase === 'done') { if (ending.open('screening')) { modalReturnTarget = $('#film-shoot'); if (message) toast(message); } return; }
  const film = state.film, plan = film.result || film.draft;
  const index = Math.max(0, Math.min(2, viewIndex)), id = film.phase === 'shooting' ? plan.order[film.captured.length] : plan.order[index];
  const scroll = modal.open && !!$('#film-view') ? modal.scrollTop : 0;
  const picture = `<figure class="film-picture"><img alt="${FILM_SHOTS[id].label}. Original illustrated props${plan.framing === 'wide' ? ' and Celeste and Dez’s volunteered fictional hands' : ', with no people pictured'}." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(filmFrameSVG(plan, id))}"><figcaption id="film-caption">${filmCaption(plan, id)}</figcaption></figure>`;
  let content;
  if (film.phase === 'idle') content = `<p>On a later fictional day, Celeste and Dez want to make <em>The Open Seat</em>, an original illustrated three-shot short. Arrange the shots, agree how the crew works and hold a take when someone needs the route. The finished sequence is yours to revisit.</p><div class="civic-voices"><p><strong>Celeste:</strong> “Our portable props are ours to film. Dez and I can offer our hands for a wider drawing.”</p><p><strong>Rook:</strong> “I’ll help cue the take, but keep me out of the picture.”</p><p><strong>Thanh:</strong> “I still need to get through. The crew can wait for a neighbor.”</p></div><p>The production accepts these terms: only the agreed props/volunteer hands, no other people, a clear route and a pause whenever it is needed.</p>${button('film-start', 'Help with the agreed shoot', true)}`;
  else if (film.phase === 'planning') content = `<p>Make the story by arranging three shots. Any order is welcome; the last image gives the ending a different feeling. All props and drawings are original, separate from real public art.</p>${[['framing','Agree the frame',FILM_FRAMING],['plan','Work around the neighbors',FILM_PLANS]].map(([key,label,options]) => `<fieldset class="civic-options"><legend>${label}</legend><div class="button-row">${Object.entries(options).map(([value,item]) => `<button id="film-${key}-${value}" class="secondary-button" aria-pressed="${plan[key] === value}">${item.label}</button>`).join('')}</div><p>${options[plan[key]].detail}</p></fieldset>`).join('')}${picture}<h3>Your shot order</h3><ol class="programme-order">${plan.order.map((shot,i) => `<li><strong>${FILM_SHOTS[shot].label}</strong><div class="button-row"><button id="film-up-${shot}" data-rapid class="secondary-button" aria-label="Move ${FILM_SHOTS[shot].label} earlier" ${i===0?'disabled':''}>Earlier</button><button id="film-down-${shot}" data-rapid class="secondary-button" aria-label="Move ${FILM_SHOTS[shot].label} later" ${i===2?'disabled':''}>Later</button></div></li>`).join('')}</ol><p>Rook stays off camera in either frame. Both setups keep the kit beside the route; the wider view needs a little more agreed prop space.</p>${button('film-roll','Agree this plan & prepare the take',true)}`;
  else if (film.phase === 'hold') content = `<p id="film-hold"><strong>Hold the take. Neighbors first.</strong> Thanh needs the through-route to carry a stool back. The crew leaves its kit beside the route and lets him pass.</p><p>${plan.plan === 'later' ? 'Rook waits until the conversation ends, then gives the agreed cue. There is no countdown; you can return later.' : 'Rook keeps the crew quiet while the conversation continues. Only soft props are used; the route stays available.'}</p><p>Thanh: “Thanks for waiting. I’m through; the route is clear for anyone else too.”</p>${button('film-clear','Thanh is through · take the first shot',true)}`;
  else if (film.phase === 'shooting') content = `<p><strong>Shot ${film.captured.length+1} of 3 · ${FILM_SHOTS[id].label}</strong></p>${picture}<p>${FILM_FRAMING[plan.framing].detail}</p><p>${FILM_PLANS[plan.plan].detail}</p><p>This captures an authored drawing in the game. It does not access a camera or microphone.</p>${button('film-capture',`Keep shot ${film.captured.length+1} · ${FILM_SHOTS[id].label}`,true)}`;
  else content = `<p>The crew clears its fictional kit and thanks the neighbors. The route remained available, Rook stayed off camera and no one had to take part. Your three captured drawings form this little screening.</p><p><strong>Frame ${index+1} of 3 · ${FILM_SHOTS[id].label}</strong></p>${picture}<div class="button-row" role="group" aria-label="Screening frames">${plan.order.map((shot,i) => `<button id="film-frame-${i}" class="secondary-button" aria-pressed="${i===index}">${i+1} · ${FILM_SHOTS[shot].label}</button>`).join('')}</div><p id="film-memory">Your ending is <strong>${FILM_SHOTS[plan.order[2]].label.toLowerCase()}</strong>. The shot order, frame and production choice are remembered. This is a silent illustrated sequence with captions, not a recorded movie or a real production announcement. The main music is unchanged.</p>`;
  show(`<section id="film-view"><span class="eyebrow">THE OPEN SEAT · FICTIONAL FILM PROJECT</span><h2 id="modal-title" tabindex="-1">${film.phase==='done'?'Our little film, together.':film.phase==='hold'?'A good take can wait.':'A little film on the block.'}</h2>${content}<p id="film-message" class="grid-message">${message}</p><div class="button-row">${button('film-back',['idle','done'].includes(film.phase)?'Back to the block':'Keep our place & return')}</div><p class="footnote">Original fictional storyboard/props and volunteered fictional hands. No real camera, microphone, film media, permit or current access-width claim. Map coordinates, other projects and soundtrack stay unchanged. Real historical film references are not part of this project.</p></section>`);
  modalReturnTarget = $('#film-shoot');
  const step = (type,extra={}) => () => { act({type,...extra}); filmScreen(); };
  for(const type of ['start','roll','clear'])bind(`film-${type}`,step(`film-${type}`));
  bind('film-capture',()=>{const before=state.film.captured.length;act({type:'film-capture',id});filmScreen(state.film.captured.length===before?'This shot is already kept. Here is the current take.':state.film.phase==='done'?gdf(FILM_DONE.summary,FILM_SHOTS[id].label,3,FILM_DONE.complete)+' '+FILM_DONE.invitation:`Shot ${state.film.captured.length} kept. Next: shot ${state.film.captured.length+1} of 3.`);});
  for(const [key,options] of [['framing',FILM_FRAMING],['plan',FILM_PLANS]])for(const [value,item] of Object.entries(options))bind(`film-${key}-${value}`,()=>{act({type:'film-choice',key,value});filmScreen(`${item.label} selected.`,`film-${key}-${value}`);});
  for(const shot of plan.order)for(const [direction,delta] of [['up',-1],['down',1]])bind(`film-${direction}-${shot}`,()=>{act({type:'film-move',id:shot,direction:delta});const pos=state.film.draft.order.indexOf(shot),canRepeat=direction==='up'?pos>0:pos<2;filmScreen(`${FILM_SHOTS[shot].label} is now ${pos+1} of 3.`,`film-${canRepeat?direction:direction==='up'?'down':'up'}-${shot}`);});
  for(let i=0;i<3;i++)bind(`film-frame-${i}`,()=>{filmScreen(`Frame ${i+1} of 3.`,`film-frame-${i}`,i);});
  bind('film-back',()=>close($('#film-shoot')));
  if(focusId){modal.scrollTop=scroll;const target=document.getElementById(focusId);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});}
  else{modal.scrollTop=0;$('#modal-title').focus({preventScroll:true});}
}
function civicScreen(message = '', focusId = '') {
  if (!civicAvailable(state)) return;
  const c = state.civic, plan = c.result || c.draft;
  const scroll = modal.open && !!$('#civic-view') ? modal.scrollTop : 0;
  let content;
  if (c.phase === 'idle') content = `<p>On a later fictional afternoon, Bea proposes a tenant listening hour: how can neighbors stay and thrive here? This is a peaceful organizing conversation, not a real scheduled event or an organization’s campaign.</p><div class="civic-voices"><p><strong>Bea:</strong> “I want repairs and staying put on the agenda.”</p><p><strong>Thanh:</strong> “I want people to come and go without blocking anyone’s way. Not everyone can stay for a whole meeting.”</p><p><strong>Celeste:</strong> “No one owes us a personal story or a signature.”</p><p><strong>Dez:</strong> “We can disagree and still make room to listen.”</p></div><p>Choose a focus, a quiet setup and whether to keep anonymous themes. Host when ready; you can leave and resume at any point. Packing and loan returns from the opening remain optional.</p>${button('civic-start', 'Help host the listening hour', true)}`;
  else if (c.phase === 'planning') {
    const groups = [['topic', 'A shared question', CIVIC_TOPICS], ['format', 'Make room for the conversation', CIVIC_FORMATS], ['notes', 'Agree what to keep', CIVIC_NOTES]];
    content = `<p>Choose where this conversation begins. The other priority stays part of what neighbors want to discuss next time. Both setups preserve a through-route without a microphone.</p>${groups.map(([key, label, options]) => `<fieldset class="civic-options"><legend>${label}</legend><div class="button-row">${Object.entries(options).map(([value, item]) => `<button id="civic-${key}-${value}" class="secondary-button" aria-pressed="${plan[key] === value}">${item.label}</button>`).join('')}</div><p>${key === 'topic' ? CIVIC_TOPICS[plan.topic].request : options[plan[key]].detail}</p></fieldset>`).join('')}<img class="civic-plan" alt="Schematic plan: seats and notice table stay beside an uninterrupted through-route. The selected format is described above." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(civicPlanSVG(plan))}"><p class="footnote">Original fictional event setup, not a real street closure, permit or surveyed access plan. No map coordinates, main supplies or soundtrack are changed.</p>${button('civic-open', 'Welcome the listening hour', true)}`;
  } else {
    content = `<p><strong>${CIVIC_TOPICS[plan.topic].label}</strong> · ${CIVIC_FORMATS[plan.format].label} · ${CIVIC_NOTES[plan.notes].label}</p><img class="civic-plan" alt="The agreed fictional shared-space plan, with a clear through-route." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(civicPlanSVG(plan))}"><p>${CIVIC_FORMATS[plan.format].detail}</p><div class="civic-voices">${civicConversation(plan).map(v => `<p><strong>${v.name}:</strong> ${v.text}</p>`).join('')}</div><p>${CIVIC_NOTES[plan.notes].detail}</p>${plan.notes === 'themes' ? `<div class="history-entry"><h3>Our shared request</h3><p>${CIVIC_TOPICS[plan.topic].request}</p><p>This authored draft stays in the game. It has not been sent to anyone.</p></div>` : '<p>No shared-request note was kept. The scripted scene can be revisited as a fictional game memory, not a transcript of real people.</p>'}${c.phase === 'meeting' ? `<p>The neighbors hold the conversation with your agreed setup. A disagreement stays open; no chore or meeting solves housing insecurity. Listening, passing and leaving are welcome.</p>${button('civic-close', 'Close the listening hour together', true)}` : '<p id="civic-memory">The listening hour is complete. Your setup and the neighbors’ differing responses are remembered; the other priority remains for another day. You can still explore and revisit either gathering.</p>' + ending.civicOfferHTML()}`;
  }
  show(`<section id="civic-view"><span class="eyebrow">TENANT LISTENING HOUR · FICTIONAL</span><h2 id="modal-title" tabindex="-1">${c.phase === 'done' ? 'We made room to be heard.' : c.phase === 'meeting' ? 'A conversation, held together.' : 'Neighbors staying and thriving.'}</h2>${content}<p id="civic-message" class="grid-message">${message}</p><div class="button-row">${button('civic-back', ['idle', 'done'].includes(c.phase) ? 'Back to the block' : 'Keep our place & return')}</div><p class="footnote">All speakers and dialogue are fictional. No personal input, attendee list, recording, sign-up, real organization position or outbound message. The game remembers setup choices locally.</p></section>`);
  modalReturnTarget = $('#civic-hour');
  const step = type => () => { act({ type }); civicScreen(); };
  bind('civic-start', step('civic-start')); bind('civic-open', step('civic-open')); bind('civic-close', step('civic-close'));
  for (const [key, options] of [['topic', CIVIC_TOPICS], ['format', CIVIC_FORMATS], ['notes', CIVIC_NOTES]]) for (const [value, item] of Object.entries(options)) bind(`civic-${key}-${value}`, () => { act({ type: 'civic-choice', key, value }); civicScreen(`${item.label} selected.`, `civic-${key}-${value}`); });
  bind('civic-back', () => close($('#civic-hour'))); ending.bindCivicOffer();
  if (focusId) { modal.scrollTop = scroll; const target = document.getElementById(focusId); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' }); }
  else { modal.scrollTop = 0; $('#modal-title').focus({ preventScroll: true }); }
}
function hostingScreen(message = '', focusId = '') {
  if (!state.opened) return;
  const host = state.hosting, id = currentActivity(host), draft = host.draft;
  if (!host.order.length) {
    if (programmeIssue(state.programme.published)) return programmeEditor();
    show(`<span class="eyebrow">A SECOND AFTERNOON · FICTIONAL</span><h2 id="modal-title">Let’s bring the programme to life.</h2><p>Bea has the invitations, Dez has a rhythm in mind, Celeste has prepared six tiles, and Thanh brings three stools. This gathering uses your posted running order.</p><ol>${state.programme.published.map(key => `<li>${segment(key).name} · ${segment(key).owner}</li>`).join('')}</ol><p>You decide when to begin and move on. Listening counts as taking part. You can leave, explore or close the game between activities. Your opening keepsake and optional returns remain in the opening chapter.</p><p class="footnote">Starting keeps a copy of this order for this gathering. Later programme revisions are future plans; they do not change the gathering you have started. This is an original fictional event with no real date or partnership.</p><div class="button-row">${button('host-begin', 'Begin our second afternoon ↗', true)}${button('host-close', 'Another time')}</div>`);
    modalReturnTarget = $('#host-afternoon');
    $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true });
    bind('host-begin', () => { stopWalk(); act({ type: 'host-start' }); hostingScreen('The neighbors are here. Take your time.'); });
    bind('host-close', () => close($('#host-afternoon'))); return;
  }
  // All four hosted: there is no current activity, and the review is the ending's hosted view, which opens exactly then.
  if (!id) { if (ending.open('hosted')) { modalReturnTarget = $('#host-afternoon'); if (message) toast(message); } return; }
  const previousScroll = $('#hosting-order') ? modal.scrollTop : 0;
  let activity = '';
  if (id === 'stories') activity = `<p>${esc(invitationHubText(draft.story))}</p><img class="host-art" alt="Original folded-paper invitation for ${esc(STORY_CHOICES[draft.story])}." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(invitationSVG(draft.story))}"><div class="host-choices">${Object.entries(STORY_CHOICES).map(([key, label]) => `<button id="host-story-${key}" class="secondary-button" aria-pressed="${draft.story === key}">${label}</button>`).join('')}</div>`;
  const BEATS = HOSTING_FORK_TEXT.beats;
  if (id === 'beats') activity = `<p>${esc(BEATS.intro)}</p><div class="host-beats" aria-label="Eight-step visual rhythm">${Array.from({ length: 8 }, (_, i) => `<button id="host-beat-${i}" aria-label="Step ${i + 1}: ${draft.pattern & 1 << i ? 'tap' : 'rest'}" aria-pressed="${!!(draft.pattern & 1 << i)}">${i + 1}<small>${draft.pattern & 1 << i ? 'TAP' : 'rest'}</small></button>`).join('')}</div><p>${esc(BEATS.tail)} ${esc(draft.pattern ? BEATS.traced : BEATS.quiet)}</p>${button('host-rhythm', esc(rhythm.entryLabel()).replace(/\n/g, '<br>'))}`;
  if (id === 'art') activity = `<p>Celeste brings six prepared tiles: circles, waves and rising triangles. Change each tile with a tap, or keep her starting arrangement. These are original portable panels, away from real buildings and existing art.</p><img class="host-art" alt="Your original six-tile panel; matching numbered controls are below." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(tilePanelSVG(draft))}"><div class="host-tiles" aria-label="Six tiles, left to right, top to bottom">${draft.tiles.map((tile, i) => `<button id="host-tile-${i}" data-rapid aria-label="Tile ${i + 1}: ${['circle', 'wave', 'triangle'][tile]}. Change shape." class="secondary-button">${i + 1} · ${['Circle', 'Wave', 'Triangle'][tile]}</button>`).join('')}</div><div class="host-choices">${['warm', 'cool'].map(key => `<button id="host-palette-${key}" class="secondary-button" aria-pressed="${draft.palette === key}">${key === 'warm' ? 'Warm' : 'Cool'} palette</button>`).join('')}</div>`;
  if (id === 'pause') activity = `<p>${esc(quietHubText(draft.quiet))}</p><div class="host-choices">${Object.entries(QUIET_CHOICES).map(([key, label]) => `<button id="host-quiet-${key}" class="secondary-button" aria-pressed="${draft.quiet === key}">${label}</button>`).join('')}</div>`;
  show(`<span class="eyebrow">OUR SECOND AFTERNOON · ${host.results.length + 1} OF 4</span><h2 id="modal-title">${segment(id).name} · ${segment(id).owner}</h2><ol id="hosting-order">${host.order.map((key, i) => `<li ${i === host.results.length ? 'aria-current="step"' : ''}>${i < host.results.length ? '✓ ' : ''}${segment(key).name}</li>`).join('')}</ol>${message ? `<p class="grid-message">${message}</p>` : ''}${activity}<div class="button-row">${button('host-complete', gdFormat(HUB_LABELS.programmeHost, host.results.length), true)}${button('host-close', 'Save & explore the block')}</div>${host.results.length ? `<details class="host-memories"><summary>What we shared</summary><ol>${host.results.map(result => `<li>${esc(hostedDetail(state, result.id).split('\n').at(-1))}</li>`).join('')}</ol></details>` : ''}<p class="footnote">This gathering keeps the running order you began with. Future programme edits stay separate. Original fictional neighbors and portable event art; no real event or performance is reproduced.</p>`);
  modalReturnTarget = $('#host-afternoon');
  const edit = (action, control) => { act(action); hostingScreen('', control); };
  for (const key of Object.keys(STORY_CHOICES)) bind(`host-story-${key}`, () => edit({ type: 'host-story', value: key }, `host-story-${key}`));
  for (let step = 0; step < 8; step++) bind(`host-beat-${step}`, () => edit({ type: 'host-beat', step }, `host-beat-${step}`));
  for (let cell = 0; cell < 6; cell++) bind(`host-tile-${cell}`, () => edit({ type: 'host-tile', cell }, `host-tile-${cell}`));
  for (const value of ['warm', 'cool']) bind(`host-palette-${value}`, () => edit({ type: 'host-palette', value }, `host-palette-${value}`));
  for (const value of Object.keys(QUIET_CHOICES)) bind(`host-quiet-${value}`, () => edit({ type: 'host-quiet', value }, `host-quiet-${value}`));
  bind('host-complete', () => {
    const previousCount = state.hosting.results.length;
    act({ type: 'host-complete', id });
    hostingScreen(state.hosting.results.length > previousCount ? hostedCompletion(state, id) : 'This part is already recorded. Here is where the gathering is now.');
  });
  bind('host-close', () => close($('#host-afternoon')));
  bind('host-rhythm', () => rhythm.open('hosting'));
  // A focus target the redraw no longer has (the circle's Complete hosted the beats) falls back to the title.
  const target = focusId && document.getElementById(focusId);
  if (target) { modal.scrollTop = previousScroll; target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'nearest' }); }
  else { modal.scrollTop = 0; $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true }); }
}
function programmeEditor(message = '', focusId = '') {
  if (!state.opened) return;
  const { order, published } = state.programme, issue = programmeIssue(order);
  const same = JSON.stringify(order) === JSON.stringify(published);
  const scroll = modal.open && !!$('#programme-order') ? modal.scrollTop : 0;
  show(`<span class="eyebrow">A NEIGHBOR-LED PROJECT · FICTIONAL</span><h2 id="modal-title">Make room for next time.</h2><p>Bea and Dez want to bring both ideas back. Arrange four proposals into a future afternoon. There is no date, deadline or new preparation list. You can come back to your draft.</p><div class="programme-proposals">${SEGMENTS.map(item => `<article><h3>${item.name} · ${item.owner}</h3><p>${item.pitch}</p>${button(`programme-add-${item.id}`, order.includes(item.id) ? `${item.name} added` : `Add ${item.name}`, false, order.includes(item.id))}</article>`).join('')}</div><h3 id="programme-order-heading" tabindex="-1">Your running order</h3><ol id="programme-order" class="programme-order">${order.map((id, i) => `<li><strong>${segment(id).name}</strong><div class="button-row"><button id="programme-up-${id}" data-rapid class="secondary-button" aria-label="Move ${segment(id).name} earlier" ${i === 0 ? 'disabled' : ''}>Earlier</button><button id="programme-down-${id}" data-rapid class="secondary-button" aria-label="Move ${segment(id).name} later" ${i === order.length - 1 ? 'disabled' : ''}>Later</button><button id="programme-remove-${id}" class="secondary-button" aria-label="Remove ${segment(id).name}">Remove</button></div></li>`).join('')}</ol>${!order.length ? '<p>Choose a proposal above to start your order.</p>' : ''}<p id="programme-message" class="grid-message">${[message, issue || (same ? 'Your posted programme matches this draft.' : 'Everyone has a place. This draft is ready to post.')].filter(Boolean).join(' ')}</p><p class="footnote">A rhythm workshop before the stories needs a quiet interval between them. Art can go anywhere. You can also begin with the stories. Editing a draft keeps the last posted programme and the neighbors’ responses until you post again.</p><div class="button-row">${button('programme-publish', published.length ? 'Post this revision ↗' : 'Post our programme ↗', true, !!issue || same)}${published.length ? button('programme-view', 'See the posted programme') : ''}${button('programme-close', 'Keep this draft & return')}</div>${published.length ? `<p>Posted: ${programmeTitle(published)}. ${same ? 'The draft matches.' : 'You have an unposted draft.'}</p>` : '<p>No programme is posted yet. Your first gathering remains complete.</p>'}`);
  modalReturnTarget = $('#next-afternoon');
  for (const item of SEGMENTS) {
    bind(`programme-add-${item.id}`, () => { act({ type: 'programme-add', id: item.id }); programmeEditor(`${item.name} added.`, `programme-remove-${item.id}`); });
    bind(`programme-remove-${item.id}`, () => { act({ type: 'programme-remove', id: item.id }); programmeEditor(`${item.name} removed from the draft.`, `programme-add-${item.id}`); });
    for (const [direction, delta] of [['up', -1], ['down', 1]]) bind(`programme-${direction}-${item.id}`, () => {
      act({ type: 'programme-move', id: item.id, direction: delta });
      const index = state.programme.order.indexOf(item.id), canRepeat = direction === 'up' ? index > 0 : index < state.programme.order.length - 1;
      programmeEditor(`${item.name} is now ${index + 1} of ${state.programme.order.length}.`, `programme-${canRepeat ? direction : direction === 'up' ? 'down' : 'up'}-${item.id}`);
    });
  }
  bind('programme-publish', () => { act({ type: 'programme-publish' }); programmePoster(); });
  bind('programme-view', programmePoster); bind('programme-close', () => close($('#next-afternoon')));
  if (focusId) { const target = document.getElementById(focusId); target?.focus({ preventScroll: true }); modal.scrollTop = scroll; target?.scrollIntoView({ block: 'nearest' }); }
}
// The posted programme. Once all four are hosted it also says what Gather again is, as programme_studio.gd description() does.
function programmePoster() {
  const { published, order } = state.programme, svg = programmeSVG(published);
  if (!svg) return programmeEditor();
  show(`<span class="eyebrow">OUR POSTED PROGRAMME · FICTIONAL FUTURE GATHERING</span><h2 id="modal-title">${programmeTitle(published)}</h2><img class="programme-poster" alt="Original programme poster. The same running order is listed below." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><ol id="posted-programme">${published.map(id => `<li>${segment(id).name} · proposed by ${segment(id).owner}</li>`).join('')}</ol><p>No real festival, date or performance is announced. ${state.hosting.order.length ? "This is a future plan. The gathering you began keeps its own running order, shown on the portable board. Revisions here do not rewrite it." : "This poster is ready to host as a fictional second afternoon. The portable board beside the mural shows this order."} Your optional soundtrack remains yours to choose.</p>${postedGatherLine(state) ? `<p id="posted-gather">${esc(postedGatherLine(state))}</p>` : ''}<div class="programme-response"><h3>The neighbors answer</h3>${['bea', 'dez', 'celeste', 'thanh'].map(id => `<p><strong>${NEIGHBORS.find(n => n.id === id).name}:</strong> ${programmeResponse(id, published)}</p>`).join('')}</div><p>${JSON.stringify(order) === JSON.stringify(published) ? 'Your draft matches this poster. You can still revise it.' : 'You have an unposted draft. This poster keeps the last programme everyone agreed on.'}</p><div class="button-row">${button('programme-edit', 'Revise the running order', true)}${state.hosting.results.length === 4 ? button('programme-gather', ending.gatherLabel(), false, !!programmeIssue(published) && !ending.snapshot().visit.gather.order.length) : ''}${button('programme-host', state.hosting.order.length ? 'Visit our second gathering' : 'Host the programme')}${button('programme-poster-close', 'Back to the block')}</div><p class="footnote">Original abstract art, no photos or real musician likenesses. Separate from your gathering keepsake and from real history in Field notes.</p>`);
  bind('programme-edit', () => programmeEditor('', 'programme-order-heading'));
  bind('programme-host', () => hostingScreen()); bind('programme-gather', () => { if (ending.open('gather')) modalReturnTarget = $('#host-afternoon'); });
  modalReturnTarget = $('#next-afternoon');
  $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true });
  bind('programme-poster-close', () => close($('#next-afternoon')));
}
function showGatheringPlan() {
  const scene = gatheringScene(state), svg = gatheringPlanSVG(scene);
  const previousTool = activeTool, editorMessage = body.querySelector('.grid-message')?.textContent, gridScroll = body.querySelector('.placement-scroll')?.scrollLeft || 0;
  show(`<span class="eyebrow">THE SPACE YOU MADE TOGETHER</span><h2 id="modal-title">${scene.title}</h2><p>${scene.caption}</p><img class="gathering-plan" alt="Current gathering plan. The striped third row stays clear; supply positions are described below." src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><p class="plan-route">Through-route: the striped third row stays clear.</p><ul class="plan-supplies">${scene.items.map(item => `<li>${item.label}: ${item.cells.map(p => `column ${p.col + 1}, row ${p.row + 1}`).join(' and ')}.</li>`).join('') || (scene.phase === 'packing' ? '<li>No table, seats or speaker remain in this plan.</li>' : '<li>No supplies placed yet.</li>')}</ul><p class="footnote">${state.hosting.order.length ? "Your opening-chapter supply plan; the second gathering has its own activity and new stools/panel. " : ""}A schematic of your first fictional event, not a street survey or a group keepsake. The original map distances stay the same. Visitors ${scene.phase === 'open' ? scene.layout === 'table' ? 'gather for conversation by the table.' : 'make room for movement at the edges.' : scene.phase === 'packing' ? 'have finished this gathering.' : 'join after the gathering opens.'} The scene works with sound off; Reduce ambient motion in Settings stills the movement.</p><div class="button-row">${button('gathering-plan-close', state.opened ? 'Back to the block' : 'Back to arranging', true)}</div>`);
  bind('gathering-plan-close', () => {
    if (state.opened) return close();
    activeTool = previousTool; layoutEditor(editorMessage || 'Choose a supply, then choose a space. You can move it again.', gridScroll);
    $('#preview-layout').focus({ preventScroll: true });
  });
}
function photoConsent() {
  if (!state.opened || state.epilogue.packing) return;
  if (state.epilogue.photo.status === 'taken') return viewKeepsake();
  show(`<span class="eyebrow">AN OPTIONAL KEEPSAKE</span><h2 id="modal-title">Ask before the picture.</h2><p>One illustrated memory of the afternoon? Everyone gets a say. Choose among the neighbors who said yes; Rook’s answer is respected.</p><div class="consent-list">${PHOTO_RESPONSES.map(person => person.agrees ? `<label class="consent-row"><input type="checkbox" id="photo-${person.id}" value="${person.id}" checked><span><strong>${person.name}</strong><small>${person.response}</small></span></label>` : `<div class="consent-row declined"><span class="consent-decline">—</span><span><strong>${person.name} · not pictured</strong><small>${person.response}</small></span></div>`).join('')}</div><p class="footnote">This creates original artwork of fictional characters. It does not use a camera, capture the map, or upload anything. It keeps a snapshot of your current mural and layout.</p><p id="photo-message" role="status"></p><div class="button-row">${button('take-keepsake', 'Make this keepsake ↗', true)}${button('skip-keepsake', 'Keep it as a story')}${button('photo-later', 'Decide later')}</div>`);
  bind('take-keepsake', () => {
    const participants = PHOTO_GUESTS.filter(id => $(`#photo-${id}`).checked);
    if (!participants.length) { $('#photo-message').textContent = 'Choose at least one neighbor who said yes, or keep the afternoon as a story.'; return; }
    act({ type: 'photo', participants, layout: photoLayout() }); viewKeepsake();
  });
  bind('skip-keepsake', () => { const done = act({ type: 'skip-photo' }) && state.epilogue.photo.status === 'skipped'; close(); if (done) toast('An afternoon can be remembered without a picture. Everyone still has a place.'); });
  bind('photo-later', close);
}
function viewKeepsake() {
  const photo = state.epilogue.photo, svg = postcardSVG(photo);
  if (!svg) return;
  const names = PHOTO_GUESTS.filter(id => photo.participants.includes(id)).map(id => NEIGHBORS.find(n => n.id === id).name).join(', ');
  const data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  show(`<span class="eyebrow">YOUR AFTERNOON, KEPT</span><h2 id="modal-title">A little room to remember.</h2><img class="keepsake-image" src="${data}" alt="Original illustrated keepsake with ${names}, your saved mural, and the ${photo.layout === 'table' ? 'Long Table' : 'Open Floor'} memory. Rook is not pictured."><p>${names} ${photo.participants.length === 1 ? 'said' : 'all said'} yes. Rook chose to stay out of the picture. Everyone remains part of the afternoon.</p><p class="footnote">This is original artwork of fictional characters, not a real photograph. Your keepsake stays as it was, even if you change the mural later.</p><div class="button-row"><a id="download-keepsake" class="primary-button download-link" href="${data}" download="tenderloin-redux-afternoon.svg">Save the illustration ↗</a>${button('keepsake-close', 'Back to the block')}</div>`);
  bind('keepsake-close', close);
}
function packingChoice() {
  if (!state.opened || state.epilogue.packing) return;
  show(`<span class="eyebrow">WHENEVER YOU’RE READY</span><h2 id="modal-title">An afternoon winds down.</h2><p>“I’ll fold the seats,” says Bea. “Would you bring the table to Thanh, the paint case to Celeste, and the speaker to Rook?”</p><p>You can still explore afterward. This ends the active gathering. ${state.epilogue.photo.status === 'taken' ? 'Your illustrated keepsake is already saved in your field notes.' : 'If you want an illustrated keepsake, make it before packing; you can also leave the afternoon as a story.'}</p><div class="button-row">${button('confirm-pack', 'Let’s pack up together ↗', true)}${button('pack-later', 'Stay a little longer')}</div>`);
  bind('confirm-pack', () => { const done = act({ type: 'pack' }) && state.epilogue.packing; close(); if (done) toast('Bea folds the seats. Return the three borrowed supplies in any order, or take a walk first.'); }); bind('pack-later', close);
}
// Conversations, ported from Godot (characters.js): one dialog for every neighbor with Godot's rotating lines and memory
// tails, Keep Chatting, What's Next?, Goodbye and up to three context actions that reuse the fork's own screens and walks.
const esc = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const neighborById = id => NEIGHBORS.find(n => n.id === id);
const muralPlace = () => PLACES.find(p => p.id === 'mural');
// The neighborhood surprises and the mural scenes, the fork's own (written as Godot's discovered_surprises and mural_scenes).
const talkExtras = () => ({ surprises: state.surprises, muralScenes: state.muralScenes ?? {} });
const musicView = () => ({ playing: music.enabled || music.starting, mode: music.fileName ? 'local' : 'sketch', localName: music.fileName, volume: settings.volume });
const openConversation = () => modal.open ? body.querySelector('[data-conversation]')?.dataset.conversation ?? null : null;
// The ids the fork's screens and tests already use for these actions; the rest are talk-<Godot action id>.
const ACTION_DOM = { layout_table: 'choose-table', layout_floor: 'choose-floor', shared_panel: 'dez-panel' };
function actionDom(action) {
  if (ACTION_DOM[action.id]) return ACTION_DOM[action.id];
  if (action.id.startsWith('return_owner:')) return state.epilogue.returned.includes(action.id.slice('return_owner:'.length)) ? 'loan-receipt' : 'return-event-loan';
  return `talk-${action.id.replace(/[^a-z0-9]+/gi, '-')}`;
}
// One control per id: Godot's chain can name an action twice (Rook in chapter 6 after his speaker's return: Spot Surprise for the
// goal, then again as the someone-else step), and a page has one element per id, so the first stays.
const uniqueById = controls => { const seen = new Set(); return controls.filter(control => !seen.has(control.dom) && seen.add(control.dom)); };
// The live region for speech and conversation steps while no dialog shows them (hint() keeps it until it expires).
function routeSay(text, seconds = 6) { routeSpeech = { text, until: performance.now() + seconds * 1000 }; $('#route-status').textContent = text; }
// Godot announce_a11y_status: the open dialog's status line (the music panel's own, so the panel speaks one line), else the
// page's live region. A live line of the dialog that already says it is not repeated.
function announce(text) {
  if (!text) return;
  if (!modal.open) { routeSay(text); return; }
  if ([...body.querySelectorAll('[role=status]')].some(line => line.textContent === text)) return;
  ($('#soundtrack-status') ?? $('#modal-status')).textContent = text;
}
// Godot show_neighbor_speech: the shared bubble over the speaker. An open dialog already shows the line, so it is not repeated.
function say(id, line) {
  const text = spokenText(line);
  bubble = showBubble(id, text);
  if (bubble && !modal.open) routeSay(`${neighborById(id)?.name ?? ''}: ${text}`, bubble.timer);
}
// The side stories' speakers (host.speak): the same bubble at a visits anchor (a surprise, an eatery counter, the museum docent).
function speak(id, line, name = '') {
  const text = spokenText(line);
  bubble = showBubble(id, text);
  if (bubble && !modal.open) routeSay(name ? `${name}: ${text}` : text, bubble.timer);
}
// custom is Godot's last_panel_dialogue (a What's Next? line, a loan reply or refusal); announce is the a11y line.
function conversation(id, { custom = '', announce = '', speak = true } = {}) {
  const n = neighborById(id);
  if (!n) return;
  const narrow = isNarrow(innerWidth), m = musicView(), goal = nextObjective(state, storyWorld());
  const view = conversationView(state, talkExtras(), talks, id, goal, { narrow, music: m, custom });
  const label = text => narrow ? narrowLabel(text) : text;
  const listed = view.actions.map(a => ({ ...a, dom: actionDom(a), pressed: a.id === 'layout_table' ? state.layout === 'table' : a.id === 'layout_floor' ? state.layout === 'floor' : null }));
  // Bea holds the layout until the block opens, so its choice stays in her conversation (Godot keeps it in the block hub).
  if (id === 'bea' && !state.opened && !listed.some(a => a.id === 'layout_table')) for (const [aid, text, value] of [['layout_table', ACTION_LABELS.layoutTable, 'table'], ['layout_floor', ACTION_LABELS.layoutFloor, 'floor']]) listed.push({ id: aid, label: label(text), dom: ACTION_DOM[aid], pressed: state.layout === value });
  // Celeste's easel panel opens the mural (Godot's two-line Compose Mural button).
  if (id === 'celeste') listed.push({ id: 'compose', label: BUTTON_TEXT.compose, dom: 'start-mural', pressed: null });
  const actions = uniqueById(listed);
  // Rook's panel in Godot's order, Load Local Track after the soundcheck; rookButtons marks Volume rapid, as Godot does.
  const controls = id === 'rook'
    ? view.music.flatMap(b => [{ ...b, dom: b.id === 'soundcheck' ? 'soundcheck' : `talk-${b.id}` }, ...b.id === 'soundcheck' ? [{ id: 'load', label: BUTTON_TEXT.load, dom: 'talk-load', rapid: false }] : []])
    : view.buttons.map(b => ({ ...b, dom: `talk-${b.id}` }));
  const detail = id === 'rook' ? rookMusicDetail(state, view.detail, m) : view.detail;
  // A two-line Godot label keeps its line break; its accessible name reads it as one line, as the Rhythm Circle entry's does.
  const actionHTML = actions.map((a, i) => `<button id="${a.dom}" class="${i === 0 ? 'primary-button' : 'secondary-button'}"${a.pressed === null ? '' : ` aria-pressed="${a.pressed}"`}${a.label.includes('\n') ? ` aria-label="${esc(a.label.replace(/\n/g, ' '))}"` : ''}>${esc(a.label).replace(/\n/g, '<br>')}</button>`).join('');
  const controlHTML = controls.map(b => `<button id="${b.dom}" class="secondary-button"${b.rapid ? ' data-rapid' : ''}>${esc(b.label)}</button>`).join('');
  show(`<section class="conversation" data-conversation="${id}" style="--talk-border:${view.border}"><div class="character-heading"><span class="portrait" style="background:${n.coat}55" aria-hidden="true">${n.name[0]}</span><div><h2 id="modal-title">${n.name}</h2><span class="eyebrow">${esc(n.role.toUpperCase())}</span></div></div><p class="talk-badge">${esc(view.badge)}</p><p id="talk-header" class="talk-header">${esc(view.header)}</p><p id="talk-line" class="talk-line">${esc(detail)}</p>${actionHTML ? `<div class="button-row talk-actions" role="group" aria-label="Things to do with ${n.name}">${actionHTML}</div>` : ''}<div class="button-row talk-controls" role="group" aria-label="${id === 'rook' ? 'Music and conversation' : 'Conversation'}">${controlHTML}</div></section>`);
  if (announce) $('#modal-status').textContent = announce;
  if (speak) say(id, custom || view.line);
  for (const a of actions) bind(a.dom, () => runConversationAction(id, a));
  bind('talk-chat', () => talk(id, 'talk'));
  bind('talk-next', () => askWhatsNext(id));
  bind('talk-bye', () => goodbye(id));
  if (id !== 'rook') return;
  bind('soundcheck', () => talk('rook', 'talk'));
  bind('talk-play', async () => { const said = await toggleMusic(); if (openConversation() === 'rook') conversation('rook', { speak: false, announce: said }); });
  bind('talk-volume', () => { settings.volume = nextVolume(settings.volume); music.setVolume(settings.volume); saveSettings(); conversation('rook', { speak: false, announce: volumeAnnouncement(settings.volume) }); });
  bind('talk-sketch', async () => { const said = await useSynthSketch(); if (openConversation() === 'rook') conversation('rook', { speak: false, announce: said }); });
  bind('talk-load', showMusic);
}
// Godot run_conversation_action_id, onto the fork's own screens and walking routes.
function runConversationAction(partner, action) {
  const [kind, arg] = action.id.split(':');
  switch (kind) {
    case 'return_owner': return state.epilogue.returned.includes(arg) ? conversation(partner, { custom: loanReply(arg), announce: loanReply(arg) }) : returnLoan(arg, partner);
    case 'walk_neighbor': return goTo(neighborById(arg));
    case 'layout_table': case 'layout_floor': act({ type: 'layout', value: kind === 'layout_table' ? 'table' : 'floor' }); return layoutEditor();
    case 'compose': return muralEditor();
    case 'mural': return partner === 'celeste' ? muralEditor() : goTo(muralPlace());
    case 'soundcheck': return partner === 'rook' ? talk('rook', 'talk') : goTo(neighborById('rook'));
    case 'open': return finale();
    case 'epilogue': { const goal = nextObjective(state, storyWorld()); return goal.id === 'photo' ? photoConsent() : goal.id === 'pack' ? packingChoice() : goal.target ? goTo(goal.target) : undefined; }
    case 'programme': return state.hosting.order.length || state.programme.published.length === SEGMENTS.length ? hostingScreen() : programmeEditor();
    case 'civic': return civicScreen();
    case 'film': return filmScreen();
    case 'comptons': return state.history ? history() : goTo(PLACES.find(p => p.id === 'history'));
    case 'blackhawk': return state.blackhawk ? blackhawk() : goTo(BLACK_HAWK);
    case 'shared_panel': close(); return goTo(muralPlace());
    case 'hub': return neighbors();
    // The side stories (visits-world.js): Spot Surprise, Visit the Museum, Visit Eateries and the landmark tour's next stop.
    case 'surprise': case 'museum': case 'eateries': case 'landmark_tour': return visits.conversationAction(kind, partner);
  }
}
// Godot ask_whats_next: the partner says the hint. With somewhere to go, the fork walks there (Godot's gold marker);
// otherwise the line stays in the conversation.
function askWhatsNext(id) {
  const goal = nextObjective(state, storyWorld()), line = whatsNext(goal, id);
  let after = goal, announce = whatsNextAnnouncement(goal, id);
  // On the explore objective the neighbor's hint names a surprise, which Godot remembers (last_hinted_surprise_id) before it works
  // out the objective again for its announcement and its marker.
  if (goal.id === 'explore') { visits.hinted(goal.speakerHints?.[id]?.lastHinted ?? ''); after = nextObjective(state, storyWorld()); announce = whatsNextAnnouncement({ ...goal, text: after.text }, id); }
  const target = goal.id === 'blackhawk' ? goal.target || BLACK_HAWK : after.target;
  if (target && target.id !== id && Math.hypot(state.player.x - target.x, state.player.y - target.y) >= 35) { goTo(target); say(id, line); routeSay(announce); return; }
  conversation(id, { custom: line, announce });
}
// Godot end_conversation: "You said goodbye to %s." on screen, and the next step for screen readers.
function goodbye(id) { const lines = goodbyeLines(id, nextObjective(state, storyWorld())); close(); toast(lines.text); routeSay(lines.announcement); }
// loan_homecoming.gd return_to_owner: refused, with nothing changed, when the save has no room; otherwise the owner's
// reply goes in the bubble and the announcement, and the conversation keeps a "Returned" receipt for this visit.
function returnLoan(id, partner) {
  if (!state.opened || !state.epilogue.packing || state.epilogue.returned.includes(id)) return;
  const action = { type: 'return-loan', id };
  if (!held && !recovery && envelope) {
    const trial = buildGodotSave(envelope, applyAction(state, action));
    if (!trial.ok && trial.reason === 'full') { const line = loanRefusal(id); conversation(partner, { custom: line, announce: line }); return; }
  }
  const done = act(action) && state.epilogue.returned.includes(id);
  close();
  if (!done) return;
  talks = confirmLoan(talks, id);
  const count = state.epilogue.returned.length;
  toast(count === LOANS.length ? LOAN_COMPLETION_NOTICE + loanReply(id) : loanReturnAnnouncement(id, count));
  say(partner, loanReply(id));
}
// Bea's conversation carries the layout choice until the block opens.
function layoutChoice() { conversation('bea'); }
function layoutEditor(message = null, scrollLeft = null) {
  if (!state.layout || state.opened) return layoutChoice();
  if (message === null) { activeTool = FURNITURE.find(id => !state.furniture[id]) || activeTool; message = 'Choose a supply, then choose a space. You can move it again.'; }
  const cells = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) {
    const item = Object.entries(state.furniture).find(([id, pos]) => occupiedCells(id, pos, state.layout).some(cell => cell.row === row && cell.col === col));
    const route = row === 2;
    cells.push(`<button id="cell-${col}-${row}" class="grid-cell ${route ? 'route' : ''} ${item ? `occupied ${item[0]}` : ''}" data-col="${col}" data-row="${row}" aria-label="Column ${col + 1}, row ${row + 1}: ${route ? 'clear route, keep free' : item ? item[0] : 'empty'}" ${state.opened ? 'disabled' : ''}>${route ? (col === 0 ? '→' : col === 7 ? '→' : '·') : item ? ({ table: 'Table', seats: 'Seats', speaker: 'Sound' }[item[0]]) : '+'}</button>`);
  }
  const scrolled = scrollLeft ?? body.querySelector('.placement-scroll')?.scrollLeft ?? 0;
  show(`<span class="eyebrow">MAKE ROOM FOR EVERYONE</span><h2 id="modal-title">${state.layout === 'table' ? 'The Long Table' : 'An Open Floor'}</h2><p>Arrange the borrowed supplies inside the fictional gathering space. Keep the striped route clear from one end to the other.</p><div class="tool-picker">${FURNITURE.map(id => `<button id="tool-${id}" aria-pressed="${activeTool === id}">${({ table: '▰ Table', seats: '▥ Seats', speaker: '▣ Speaker' }[id])}${state.furniture[id] ? ' ✓' : ''}</button>`).join('')}</div><div class="placement-scroll"><div class="placement-grid" aria-label="Gathering arrangement, 8 columns by 5 rows">${cells.join('')}</div></div><p id="grid-scroll-hint" class="grid-scroll-hint" hidden>Swipe or scroll the grid sideways to see all eight columns.</p><div class="grid-legend"><i></i> Clear route · supplies need two spaces · each layout welcomes everyone</div><p class="grid-message" role="status">${message}</p><div class="button-row">${button('change-plan', 'Hear both ideas again')}${button('preview-layout', 'Preview your arrangement ↗')}${button('layout-done', arranged(state) ? 'Looks good. Back to the block ↗' : 'Keep this arrangement ↗', true)}</div><p class="footnote">The grid is a play abstraction, not a measured accessibility assessment.</p>`);
  // Where the eight columns do not fit, a line says the grid scrolls and the hidden side fades (mobile scrollbars stay hidden).
  const box = body.querySelector('.placement-scroll'), edges = () => {
    const more = box.scrollWidth - box.clientWidth;
    box.classList.toggle('more-left', more > 1 && box.scrollLeft > 1); box.classList.toggle('more-right', more > 1 && box.scrollLeft < more - 1); $('#grid-scroll-hint').hidden = more <= 1;
  };
  box.scrollLeft = scrolled; box.addEventListener('scroll', edges, { passive: true }); edges();
  for (const id of FURNITURE) bind(`tool-${id}`, () => { activeTool = id; layoutEditor(`Placing ${id}. Choose an empty pair of spaces away from the clear route.`); });
  body.querySelectorAll('.grid-cell').forEach(cell => cell.addEventListener('click', () => {
    const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
    if (!canPlaceFurniture(state, activeTool, col, row)) { layoutEditor('That spot would overlap a supply, the clear route, or the edge. Try another pair of spaces.'); return; }
    act({ type: 'furniture', id: activeTool, col, row });
    const next = FURNITURE.find(id => !state.furniture[id]); if (next) activeTool = next;
    layoutEditor(arranged(state) ? '✓ Everyone has room, and the route stays clear. The gathering is ready for company.' : 'That fits. Place the next supply, or move this one.');
  }));
  bind('change-plan', layoutChoice); bind('layout-done', close);
  bind('preview-layout', showGatheringPlan);
}
function muralEditor(message = null) {
  if (message === null) { activeMotif = MOTIFS.find(id => !state.mural[id]) || activeMotif; message = 'Choose a neighbor’s idea, then a space on the portable panel.'; }
  const cells = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const item = Object.entries(state.mural).find(([, p]) => p.col === col && p.row === row);
    cells.push(`<button id="mcell-${col}-${row}" class="grid-cell" data-col="${col}" data-row="${row}" style="color:${item ? PALETTE_COLORS[state.palette][MOTIFS.indexOf(item[0])] : '#b79e77'}" aria-label="Panel column ${col + 1}, row ${row + 1}: ${item ? item[0] : 'empty'}">${item ? SIGNS[item[0]] : '·'}</button>`);
  }
  const labels = { sun: 'Lulu’s sun', wave: 'Dez’s rhythm', rise: 'Celeste’s letters' };
  show(`<span class="eyebrow">ART WITH THE NEIGHBORS</span><h2 id="modal-title">Many hands. One mural.</h2><p>“Lulu brought a sun, Dez brought a rhythm, and I brought some letters,” says Celeste. “Let’s see what they look like together.”</p><div class="tool-picker">${MOTIFS.map(id => `<button id="motif-${id}" aria-pressed="${activeMotif === id}">${labels[id]}${state.mural[id] ? ' ✓' : ''}</button>`).join('')}</div><div class="placement-grid mural-grid" aria-label="Portable mural panel, 6 columns by 3 rows">${cells.join('')}</div><div class="palette">Palette ${PALETTES.map(id => `<button id="palette-${id}" data-rapid class="swatch ${state.palette === id ? 'selected' : ''}" style="background:${PALETTE_COLORS[id][0]}" aria-label="${id} palette" aria-pressed="${state.palette === id}"></button>`).join('')}</div><p class="grid-message" role="status">${message}</p><div class="button-row">${button('mural-done', progress(state).mural ? 'Our panel is ready ↗' : 'Keep working later ↗', true)}${button('mural-scenes', ending.paintScenesLabel())}</div><p class="footnote">Original motifs on a fictional, permissioned portable panel. Existing public art stays untouched.</p>`);
  MOTIFS.forEach(id => bind(`motif-${id}`, () => { activeMotif = id; muralEditor(`Place ${labels[id].toLowerCase()} anywhere on the panel. Move it as often as you like.`); }));
  PALETTES.forEach(id => bind(`palette-${id}`, () => { act({ type: 'palette', value: id }); muralEditor('A new palette, the same shared ideas.'); }));
  body.querySelectorAll('.grid-cell').forEach(cell => cell.addEventListener('click', () => {
    const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
    if (Object.entries(state.mural).some(([id, p]) => id !== activeMotif && p.col === col && p.row === row)) { muralEditor('Another neighbor’s idea is there. Choose a free space, or move that idea first.'); return; }
    act({ type: 'mural', id: activeMotif, col, row }); const next = MOTIFS.find(id => !state.mural[id]); if (next) activeMotif = next;
    muralEditor(progress(state).mural ? '✓ The whole neighborhood has a hand in this one. You can still rearrange it.' : 'That looks good. Add another neighbor’s idea.');
  })); bind('mural-done', close); bind('mural-scenes', () => ending.open('stories'));
}
function tidy(item) {
  if (state.litter.includes(item.id)) return;
  show(`<span class="eyebrow">A LITTLE TIDYING</span><h2 id="modal-title">${item.label}</h2><p>Bea pointed out this discarded litter before setting up. You check that it isn’t something a neighbor is using, then put it in the gathering’s cleanup bag.</p><div class="button-row">${button('collect-litter', 'Pick it up ↗', true)}${button('leave-litter', 'Come back later')}</div><p class="footnote">Only the three marked litter objects can be collected. Nobody’s belongings are cleanup targets.</p>`);
  bind('collect-litter', () => { const done = act({ type: 'tidy', id: item.id }); close(); if (done) toast(state.litter.length === LITTER.length ? 'A little tidier. Bea has already set out the cleanup bag for the next gathering.' : 'One small thing taken care of.'); }); bind('leave-litter', close);
}
// Godot: the first contact is an arrival (finish_neighbor_arrival); talking to someone you have arrived beside, or E nearby, is a
// talk (talk_with_neighbor), which turns to the next line. Talking to Rook is the soundcheck (check_sound_with_rook).
function talk(id, how = 'tap') {
  const talking = how === 'talk' || how === 'tap' && arrivedAt === id;
  arrivedAt = id; talks = talking ? chatTalk(talks, id) : arriveTalk(talks, id);
  act({ type: 'meet', id, talk: talking });
  const extras = talkExtras(), m = musicView();
  conversation(id, { announce: talking ? talkAnnouncement(state, extras, talks, id, m) : arrivalCaption(state, extras, talks, id, m) });
}
// The speech bubble, one frame on the frame clock (bubble.js stepBubble), drawn by world.js in screen px.
const measureContext = document.createElement('canvas').getContext('2d');
function measureText(text) { measureContext.font = `${BUBBLE.font}px "Segoe UI", sans-serif`; return measureContext.measureText(text).width; }
function stepSpeech(dt) {
  if (!world) return;
  // A neighbor, or a side story's speaker at its map anchor (visits.anchor: a surprise, an eatery counter, the museum docent).
  const n = bubble && (neighborById(bubble.id) ?? visits.anchor(bubble.id));
  if (!n) { bubble = null; world.bubble = null; return; }
  const s = world.scale, size = Math.max(1, 1 / s), o = world.offset, chip = objectLabel(n, s), k = Math.max(1, s), p = state.player;
  // The tail tip sits just above the name chip (Godot: 5 m above the speaker); without a chip, a fixed lift.
  const anchor = chip ? { x: o.x + chip.x * s, y: o.y + (chip.y - 19 * size) * s - 4 } : { x: o.x + n.x * s, y: o.y + n.y * s - FORK_BUBBLE.anchorLiftPx };
  const out = stepBubble(bubble, {
    dt, viewport: { w: innerWidth, h: innerHeight }, playArea: { x: 0, y: 0, w: world.width, h: world.height }, anchor,
    player: { x: o.x + p.x * s - 12 * k, y: o.y + p.y * s - 34 * k, w: 24 * k, h: 40 * k }, reward: null,
    overview: world.camera.overviewMode, targetDist: Math.hypot(world.camera.center.x - n.x, world.camera.center.y - n.y), pxPerMetre: PIXELS_PER_METRE,
    activityText: modal.open ? body.textContent : '', reducedMotion: settings.reducedMotion, measure: measureText,
  });
  const text = bubble.text;
  bubble = out.bubble; world.bubble = out.layout;
  if (out.announce === 'panel') { const line = speechNotice($('#modal-status').textContent, text, BUBBLE_TEXT.panel); if (line) $('#modal-status').textContent = line; }
  // 2D has no Info panel: a line that cannot be drawn is shown as a notice instead.
  else if (out.announce === 'info') toast(`${n.name}: ${text}`);
}
function history() {
  act({ type: 'history' });
  show(`<span class="eyebrow">FIELD NOTE 01 · REAL PLACE</span><h2 id="modal-title">A corner that remembers.</h2><p>The northwest corner of Turk and Taylor is the site of Compton’s Cafeteria, associated with the 1966 uprising by transgender people and other patrons resisting police harassment.</p><p>This is living history in the Transgender District. Our fictional gathering takes place along the neighboring block face, away from this entrance.</p><p class="footnote">The building’s later use has been publicly contested. This prototype does not reproduce a present-day business, current plaque, or exact facade.</p><div class="history-entry"><span class="eyebrow">CHECK THE SOURCE</span><p>San Francisco Historic Preservation Commission agenda, March 18, 2026: 101–121 Taylor, northwest corner of Turk and Taylor.</p><a class="source-link" href="https://sfplanning.org/sites/default/files/agendas/2026-03/20260318_hpc%20(ID%201559597).pdf" target="_blank" rel="noreferrer">Read the city’s document ↗</a></div><div class="button-row">${button('history-close', 'Keep this in my field notes ↗', true)}</div>`); bind('history-close', close);
}
function blackhawk() {
  act({ type: 'discover-blackhawk' });
  show(`<span class="eyebrow">FIELD NOTE 02 · REAL PLACE</span><h2 id="modal-title">A room full of sound.</h2><p>At Turk and Hyde, the Black Hawk was a meeting place for jazz. SFJAZZ documents performances here by Billie Holiday, John Coltrane and Miles Davis, among many others. The club closed in 1963.</p><p>Miles Davis’s official catalog dates the recording of his Friday-night Black Hawk live album to April 1961. A neighborhood room could hold music that traveled far beyond it.</p><p class="footnote">This reading point marks the intersection area. The former club is not operating in this scene; today’s site use, entrance and appearance have not been verified. The scenery is original and schematic. No historic recording or musician likeness is reproduced.</p><div class="history-entry"><span class="eyebrow">FOLLOW THE SOURCES · CHECKED OCTOBER 18, 2026</span><p><a class="source-link" href="https://www.sfjazz.org/athome/jazz-minute/history-of-the-black-hawk/" target="_blank" rel="noreferrer">SFJAZZ: History of the Black Hawk ↗</a></p><p><a class="source-link" href="https://www.milesdavis.com/albums/friday-night-miles-davis-in-person-at-the-blackhawk-san-francisco/" target="_blank" rel="noreferrer">Miles Davis: official album catalog ↗</a></p><p>Tenderloin Museum identifies the former club as 200 Hyde at Turk. Its archived Blackhawk Block Party took place August 13, 2022 at Dodge Place, Turk and Larkin, farther west—not at this stop. That past festival is not a current event in our game.</p><a class="source-link" href="https://www.tenderloinmuseum.org/public-programs-2022-1/2022/7/23/blackhawkblockparty" target="_blank" rel="noreferrer">Museum: 2022 block-party archive ↗</a></div><p>A thought to bring back: what makes a small gathering worth remembering?</p><div class="button-row">${button('blackhawk-close', 'Keep this in my field notes ↗', true)}${button('blackhawk-return', 'Walk back to Bea')}${button('blackhawk-notes', 'History walk & notes')}</div>`);
  bind('blackhawk-close', close); bind('blackhawk-return', () => goTo(NEIGHBORS[0])); bind('blackhawk-notes', historyWalk);
}
function historyWalk() {
  if (!world) { toast('The street scene is still loading.'); return; }
  show(`<span class="eyebrow">AN OPTIONAL WALK · NO HURRY</span><h2 id="modal-title">Two corners, many stories.</h2><p>Follow Turk west from Taylor, through Jones and Leavenworth, to Hyde. The intersections stay about 440 metres apart from end to end. Follow me keeps you close; Stop walking cancels the route; choose a stop again to continue. The gathering can wait.</p><ol class="history-route"><li><h3>Turk & Taylor · Compton’s corner</h3><p>A history of transgender resistance and community. ${state.history ? 'Kept in your field notes.' : 'An optional reading stop beside the gathering.'}</p>${button('walk-comptons', 'Walk to the Compton’s history stop')}${state.history ? button('read-comptons', 'Read saved note') : ''}</li><li><h3>Turk & Hyde · the former Black Hawk</h3><p>Three blocks west: Jones → Leavenworth → Hyde. ${state.blackhawk ? 'Kept in your field notes.' : 'Discover a room in the neighborhood’s jazz history.'}</p>${button('walk-blackhawk', 'Walk to the Black Hawk stop')}${state.blackhawk ? button('read-blackhawk', 'Read saved note') : ''}</li></ol><p class="footnote">Real street centerlines; schematic scenery and walking corridor. This is a bounded game route, not real-world accessibility or crossing guidance. The history stops do not gate preparations or the ending.</p><div class="button-row">${button('walk-return', 'Walk back to Bea')}${button('walk-map', 'Show the whole route')}${button('walk-close', 'Keep exploring')}</div>`);
  bind('walk-comptons', () => goTo(PLACES.find(p => p.id === 'history'))); bind('read-comptons', history);
  bind('walk-blackhawk', () => goTo(BLACK_HAWK)); bind('read-blackhawk', blackhawk);
  bind('walk-return', () => goTo(NEIGHBORS[0])); bind('walk-close', close);
  bind('walk-map', () => { const walking = walkPath.length > 0; stopWalk(); close(); world.camera.overview(true); cameraUI(); if (walking) toast('Stopped walking. Choose a history stop to start a new route.'); });
}
function journal() {
  const programme = state.opened ? `<div class="history-entry"><span class="eyebrow">OUR NEXT AFTERNOON · FICTIONAL PLAN</span><h3>${programmeTitle(state.programme.published)}</h3><p>Arrange stories, rhythm, shared art and a quiet interval with the neighbors. ${state.programme.published.length ? 'The posted order and their responses are remembered.' : 'Your first gathering is complete. This next project is here whenever you want it.'}</p>${button('journal-programme', state.programme.published.length ? 'Revisit our next afternoon' : 'Plan another afternoon')}${state.programme.published.length || state.hosting.order.length ? button('journal-host', state.hosting.order.length ? 'Our second gathering' : 'Host the posted programme') : ''}</div>` : '';
  const keepsake = state.opened ? `<div class="history-entry"><span class="eyebrow">THE AFTERNOON AFTERWARD · OPTIONAL</span><h3>${state.epilogue.photo.status === 'taken' ? 'An illustrated keepsake' : 'An afternoon can be a story'}</h3><p>${state.epilogue.photo.status === 'taken' ? 'Your chosen neighbors and the mural are kept as they were. Rook chose not to be pictured; his choice is respected.' : 'A picture is optional. The gathering is complete either way.'}</p>${state.epilogue.photo.status === 'taken' ? button('journal-keepsake', 'View your keepsake') : ''}<p>${state.epilogue.packing ? `${state.epilogue.returned.length} of 3 borrowed event supplies returned. Your gathering remains complete.` : 'When you are ready, the optional packing-up choice is below the map.'}</p></div>` : '';
  show(`<span class="eyebrow">YOUR FIELD NOTES</span><h2 id="modal-title">An afternoon to remember.</h2><div class="history-entry"><span class="eyebrow">OUR GATHERING · FICTIONAL</span><h3>${state.layout === 'table' ? 'The Long Table' : state.layout === 'floor' ? 'An Open Floor' : 'Still taking shape'}</h3><p>${state.layout ? `You chose ${state.layout === 'table' ? 'Bea’s conversation-centered Long Table' : 'Dez and Celeste’s art-and-music-centered Open Floor'}. The other idea is saved as a possibility for another afternoon.` : 'Bea, Celeste, Dez, Rook, and Thanh have already started organizing. Stop by and hear their ideas.'}</p><p>${state.epilogue.packing ? 'The gathering has wound down. You can still explore, talk, and revisit the mural.' : state.opened ? 'The gathering is open. Everyone has a place. You can keep exploring, talking, and rearranging the mural.' : 'The preparations list remembers your contributions. You can take your time.'}</p></div>${keepsake}${programme}<div class="history-entry"><span class="eyebrow">REAL PLACE · DATED HISTORY</span><h3>The Compton’s corner</h3><p>${state.history ? 'You discovered the historic site at Turk and Taylor. It is part of a neighborhood with a long history of transgender resistance and community.' : 'There’s a history stop on the northwest side of Turk and Taylor. Take a walk over when you feel like it.'}</p>${button('journal-history', state.history ? 'Read the history note' : 'Walk to the history stop')}</div><div class="history-entry"><span class="eyebrow">WHAT’S REAL, WHAT’S IMAGINED</span><p>Street centerlines: OpenStreetMap data. Neighbors, gathering, litter, portable mural, and borrowed supplies: fictional. Buildings, sidewalks, trees, crosswalks, and bike-lane widths: schematic, awaiting current visual verification.</p>${button('journal-district', 'The living Transgender District')} ${button('journal-walk', 'Explore the Turk history walk')} ${button('journal-map', 'Map & source notes')}</div>`);
  if (voicesHost.enabled) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">EXPERIMENTAL · OPTIONAL</span><h3>Neighborhood Voices</h3><p>Three dated organization introductions, separate from our fictional neighbors and projects.</p>${button('journal-voices', 'Open Neighborhood Voices')}</div>`); bind('journal-voices', openVoices); }
  bind('journal-history', () => { if (state.history) history(); else { close(); goTo(PLACES.find(p => p.id === 'history')); } }); bind('journal-map', mapInfo); bind('journal-district', livingDistrict); bind('journal-walk', historyWalk);
  if (civicAvailable(state)) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">A LATER AFTERNOON · FICTIONAL CIVIC EVENT</span><h3>A tenant listening hour</h3><p>Neighbors bring different priorities about repairs, staying put and shared-space access. ${state.civic.phase === 'done' ? 'Your agreed setup and their responses are remembered.' : 'The conversation can wait for you.'}</p>${button('journal-civic', state.civic.phase === 'done' ? 'Remember our listening hour' : 'Visit the listening hour')}</div>`); bind('journal-civic', () => civicScreen()); }
  if (filmAvailable(state)) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">A LATER DAY · FICTIONAL FILM PROJECT</span><h3>The Open Seat</h3><p>An original three-shot illustrated short, made around neighbors’ permission, quiet and access.</p>${button('journal-film', state.film.phase === 'done' ? 'Screen our little film' : 'Visit our little film project')}</div>`); bind('journal-film', () => filmScreen()); }
  // The side stories in the 2D Info column (visits-ui.js): Before These Streets while it can be revisited, then the neighborhood
  // surprises and stops.
  const revisit = visits.entryHTML('revisit');
  body.insertAdjacentHTML('beforeend', (revisit ? `<div class="history-entry">${revisit}</div>` : '') + visits.entryHTML('notes')); visits.bindEntry('revisit'); visits.bindEntry('notes');
  bind('journal-programme', () => programmeEditor());
  bind('journal-host', () => hostingScreen());
  bind('journal-keepsake', viewKeepsake);
}
function districtUI() {
  const visible = !!world?.districtVisible;
  $('#district-legend').hidden = !visible;
  const toggle = $('#district-layer');
  if (!toggle) return;
  toggle.disabled = districtStatus !== 'ready';
  toggle.textContent = visible ? 'Hide the city boundary' : 'Show the city boundary';
  $('#district-state').textContent = districtStatus === 'ready' ? 'City boundary ready. It extends beyond the game’s walkable area.' : districtStatus === 'error' ? 'The city layer could not load. You can keep playing and try again.' : 'Loading the local city boundary…';
  const retry = $('#district-retry');
  if (districtStatus !== 'error' && document.activeElement === retry) $('#modal-title').focus({ preventScroll: true });
  retry.hidden = districtStatus !== 'error';
}
async function requestDistrict() {
  if (!world || districtStatus === 'ready') { districtUI(); return; }
  if (!districtPromise) {
    districtStatus = 'loading';
    districtPromise = (async () => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('./data/transgender-district.geojson', { signal: controller.signal });
        if (!response.ok) throw Error('City data unavailable');
        world.districtPolygons = districtGeometry(await response.json()); districtStatus = 'ready';
      } catch { districtStatus = 'error'; }
      finally { clearTimeout(timeout); districtPromise = null; }
    })();
  }
  districtUI(); await districtPromise; districtUI();
}
// host.load of the side stories: one of their two place files, same-origin and parsed, within 10 s (as requestDistrict).
async function loadVisitData(name) {
  if (!['power_place.json', 'voting_places.json'].includes(name)) throw Error('Not a story data file');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('./data/' + name, { signal: controller.signal });
    if (!response.ok) throw Error('Story data unavailable');
    return await response.json();
  } finally { clearTimeout(timeout); }
}
function livingDistrict() {
  if (!world) { toast('The street scene is still loading.'); return; }
  show(`<span class="eyebrow">LIVING CULTURE · REAL COMMUNITY</span><h2 id="modal-title" tabindex="-1">More than a line on a map.</h2><p>The Transgender District describes its work as sustaining transgender history, culture and economic opportunity in the southeastern Tenderloin. Honey Mahogany, Janetta Johnson and Aria Sa’id founded the organization in 2017.</p><p>Its community reaches beyond the small area you can walk here. A city boundary records a designation; it does not decide who belongs or where transgender people live.</p><div class="history-entry"><h3>A city map, with its limits</h3><p>The dashed violet line and light tint show the city-published cultural-district polygon, using the same geographic projection as our streets. Only part fits inside this game. It does not mark surveyed doors, crosswalks, murals, or a permission to hold an event.</p><p id="district-state" role="status">Loading the local city boundary…</p><div class="button-row">${button('district-layer', 'Show the city boundary', true, districtStatus !== 'ready')}<button id="district-retry" class="secondary-button" ${districtStatus === 'error' ? '' : 'hidden'}>Try the layer again</button></div></div><div class="history-entry"><h3>Streets change, too</h3><p>SFMTA reported the Turk protected bikeway between Mason and Polk in April 2018. Its Safer Taylor project page reports substantial completion in 2024, including wider sidewalks and crossing changes. These dated records do not verify today’s paint, poles, doorways or crossing condition. Our street widths and decorations remain schematic.</p><p><a href="https://www.sfmta.com/blog/turk-street-gets-new-protected-bike-lane" target="_blank" rel="noreferrer">SFMTA: Turk, April 2018 ↗</a> · <a href="https://www.sfmta.com/projects/safer-taylor-street" target="_blank" rel="noreferrer">SFMTA: Safer Taylor ↗</a></p></div><div class="history-entry"><span class="eyebrow">PRIMARY SOURCES · CHECKED OCTOBER 18, 2026</span><p><a class="source-link" href="https://transgenderdistrictsf.com/about" target="_blank" rel="noreferrer">The Transgender District: about its community and work ↗</a></p><p><a href="https://data.sf.gov/d/5xmc-5bjj" target="_blank" rel="noreferrer">DataSF: Cultural Districts ↗</a> · <a href="./data/transgender-district.geojson" target="_blank">Download the city feature ↗</a> · <a href="./data/cultural-district-source.json" target="_blank">Provenance & PDDL license ↗</a></p><p><a class="source-link" href="https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-59534" target="_blank" rel="noreferrer">City code, §107.3(d): designation description ↗</a></p><p class="footnote">Boundary data: San Francisco Planning Department, DataSF, PDDL. Street data: OpenStreetMap contributors, ODbL. No logos, photos or source artwork reproduced; no organizational partnership is implied.</p></div><div class="button-row">${button('district-close', 'Back to exploring ↗', true)}</div>`);
  bind('district-layer', () => { if (districtStatus !== 'ready') return; world.districtVisible = !world.districtVisible; districtUI(); close(world.districtVisible ? canvas : $('#district-button')); toast(world.districtVisible ? 'City cultural-district boundary shown. The legend has source notes and a Hide control.' : 'City boundary hidden.'); });
  bind('district-close', close); bind('district-retry', requestDistrict);
  districtUI(); if (districtStatus === 'idle' || districtStatus === 'loading') requestDistrict();
  (districtStatus === 'ready' ? $('#district-layer') : districtStatus === 'error' ? $('#district-retry') : $('#modal-title')).focus({ preventScroll: true });
}
function mapInfo() {
  show(`<span class="eyebrow">A REAL CORNER, CAREFULLY DRAWN</span><h2 id="modal-title">Turk: Taylor to Hyde.</h2><p>The streets use actual OpenStreetMap centerline coordinates, projected at one uniform scale and rotated so Turk runs across the screen. The block lengths and relative intersections are retained.</p><p>The optional history walk follows Turk west through Jones and Leavenworth to Hyde, about 440 metres from Taylor. This is a first playable, not a surveyed recreation. Facades, doorways, sidewalk widths, trees, crossing designs, bike-lane dimensions, and gathering permissions still need local visual checks. The portable decorations belong to our fictional event.</p><div class="history-entry"><span class="eyebrow">MAP DATA · ODbL 1.0</span><p>© OpenStreetMap contributors. API extract downloaded October 18, 2026. The data remains available separately under the Open Database License, independently of the game’s MIT-licensed code and original graphics.</p><p><a href="./data/streets.osm.json" target="_blank">Street geometry & provenance ↗</a> · <a href="https://github.com/jbrick2070/tenderloin-redux/blob/main/public/data/source-turk-west.osm.xml" target="_blank">Turk-west OSM extract ↗</a> · <a href="https://github.com/jbrick2070/tenderloin-redux/blob/main/public/data/source.osm.xml" target="_blank">Earlier opening-block extract ↗</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">License & attribution ↗</a></p></div><div class="button-row">${button('map-close', 'Back to our corner ↗', true)}</div>`); bind('map-close', close);
}
function finale() {
  if (!ready(state)) { toast(fmt(BLOCK_TEXT.almost, blockMissing(state))); return; }
  const wasOpen = state.opened;
  if (!wasOpen) { act({ type: 'open' }); if (!state.opened) return; }
  if (state.epilogue.packing) {
    show(`<span class="success-stamp">AN AFTERNOON WELL SPENT</span><h2 id="modal-title">The good things stay.</h2><p>The gathering has wound down. ${state.epilogue.returned.length === LOANS.length ? 'The three loans are home with their neighbors.' : 'The neighbors are packing up together; you can return the remaining loans whenever you like.'}</p><p>You can still explore, talk, discover the corner’s history, or revisit the mural. Your gathering remains complete.</p><div class="button-row">${button('stay-block', 'Back to the block ↗', true)}${button('finale-notes', 'Open your field notes')}</div>`); bind('stay-block', close); bind('finale-notes', journal); return;
  }
  show(`<span class="success-stamp">THE BLOCK IS OPEN</span><h2 id="modal-title">You made a little room.</h2>${wasOpen ? '' : `<p>${fmt(BLOCK_TEXT.opened, GATHERING_LAYOUT_TITLES[state.layout])}</p>`}<p>${state.layout === 'table' ? 'The long table fills with conversation. Bea leaves an extra chair at the end, and Dez keeps the rhythm easy enough to hear each other.' : 'The open floor fills with movement. Dez taps out a rhythm, Celeste starts a small dance, and Bea finds a seat with a good view.'}</p><p>Rook has the sound just right. The neighbor-made panel catches the afternoon light. Thanh smiles when the trumpet part comes in.</p><p>It’s one afternoon. The neighborhood’s bigger stories continue. For now, there’s room to be together.</p><div class="button-row">${button('stay-block', 'Stay a little longer ↗', true)}${button('finale-notes', 'Remember this afternoon')}</div><p class="footnote">First playable complete. You can keep walking, meet the other neighbors, discover the history stop, and revisit the mural. Your progress is saved in this browser, shared with the 3D edition.</p>`);
  bind('stay-block', close); bind('finale-notes', journal);
}
function showSettings() {
  show(`<span class="eyebrow">MAKE YOURSELF COMFORTABLE</span><h2 id="modal-title">Your afternoon.</h2><label class="settings-row" for="volume"><span>Music volume <span id="volume-number">${Math.round(settings.volume * 100)}%</span></span><input id="volume" data-rapid type="range" min="0" max="${MAX_VOLUME * 100}" value="${Math.round(settings.volume * 100)}"></label><div class="settings-row"><span id="reward-sounds-label">Reward sounds</span><button id="reward-sounds" class="secondary-button" aria-pressed="${settings.rewardSounds}" aria-describedby="reward-sounds-help" title="${SOUNDS_TEXT.tooltip}">${soundsLabel(settings.rewardSounds)}</button><span id="reward-sounds-help" class="sr-only">${SOUNDS_TEXT.tooltip}</span></div><label class="settings-row" for="motion"><span>Reduce ambient motion</span><input type="checkbox" id="motion" ${settings.reducedMotion ? 'checked' : ''}></label><p>Music is optional. Every preparation, conversation, and completion message works without sound.</p><fieldset class="experiment-settings"><legend>Experimental</legend><label class="settings-row" for="voices-enabled"><span>Neighborhood Voices · text only</span><input id="voices-enabled" type="checkbox" ${settings.experimental.neighborhoodVoices ? 'checked' : ''}></label><p>Three dated organization cards with official links. Off by default. You can turn this off at any time; your gathering stays the same. No TenderVoice code, recordings or interviews are included.</p><p id="voices-settings-status" role="status"></p></fieldset><div class="history-entry"><span class="eyebrow">YOUR SAVED AFTERNOON</span><p>${held ? SAVE_TEXT.held : storageAvailable ? 'Your progress stays in this browser, shared with the 3D edition of this site. After switching editions, reload the other one.' : 'Browser storage is unavailable. Progress will last in this tab.'}</p><button id="restart" class="danger-button">${held ? 'Start over…' : 'Start a new afternoon…'}</button></div>`);
  $('#volume').addEventListener('input', event => { settings.volume = Number(event.target.value) / 100; music.setVolume(settings.volume); $('#volume-number').textContent = `${Math.round(settings.volume * 100)}%`; saveSettings(); });
  // Godot toggle_reward_sounds: Sounds On/Off in the fork's settings key; turning it off stops a chime at once. Godot's tooltip
  // is the button's description too (#reward-sounds-help), so it is not reachable by hover alone.
  bind('reward-sounds', () => { settings.rewardSounds = !settings.rewardSounds; rewards.setEnabled(settings.rewardSounds); saveSettings(); const control = $('#reward-sounds'); control.textContent = soundsLabel(settings.rewardSounds); control.setAttribute('aria-pressed', String(settings.rewardSounds)); $('#modal-status').textContent = soundsAnnouncement(settings.rewardSounds); });
  $('#motion').addEventListener('change', event => { settings.reducedMotion = event.target.checked; document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion); saveSettings(); });
  $('#voices-enabled').addEventListener('change', event => setVoicesEnabled(event.target.checked)); voicesUI();
  bind('restart', () => confirmRestart(() => { showSettings(); const restartButton = $('#restart'); restartButton.focus({ preventScroll: true }); restartButton.scrollIntoView({ block: 'nearest' }); }));
}
// Restart clears the shared key, so it resets the 3D edition too; Godot reads an absent save as a fresh one.
// Keep has focus, and a held Enter never reaches Start fresh: press-settle.js drops every repeated Enter on a control.
// back returns to wherever the confirmation was opened from.
function confirmRestart(back) {
  show(`<span class="eyebrow">A FRESH START</span><h2 id="modal-title">Another afternoon?</h2><p>${FORK_TEXT.restart}${held ? ' The unreadable save is replaced too.' : ''} Reload the 3D edition before you play it again.</p><p>Your sound, motion and experiment settings stay as they are.</p><div class="button-row">${button('confirm-restart', 'Start fresh', true)}${button('cancel-restart', 'Keep my afternoon')}</div>`);
  bind('confirm-restart', restart); bind('cancel-restart', back);
  $('#cancel-restart').focus({ preventScroll: true });
}
function restart() {
  try { localStorage.removeItem(SAVE_KEY); storageAvailable = true; } catch { storageAvailable = false; }
  state = initialState(); held = false; envelope = freshEnvelope(); lastRaw = null; loadedScenes = {}; savedMessage = ''; recovery = null; saveInfo = { status: 'fresh', reason: null, bytes: 0 };
  resetSession(); ending.reset(); rhythm.stop();
  stopWalk(); if (world) { world.camera.overview(); if (world.width < 600) world.camera.follow(state.player); cameraUI(); }
  updateUI(); close(); toast('A fresh afternoon. Bea is ready when you are.');
}
function interact(object, how = 'tap') {
  if (!object) return;
  if (object.kind === 'visit') return visits.interact(object, how);
  if (NEIGHBORS.some(n => n.id === object.id)) return talk(object.id, how);
  if (LITTER.some(n => n.id === object.id)) return tidy(LITTER.find(n => n.id === object.id));
  if (object.id === 'layout') return layoutEditor();
  if (object.id === 'mural') return muralEditor();
  if (object.id === 'history') return history();
  if (object.id === 'blackhawk') return blackhawk();
}
// A walking route from the player to goal, once the walk before it stops: target is interacted with on arrival, and owner 'visit'
// hands the arrival to the side stories instead (visits.walkEnded). keepCamera keeps a camera that was not following, as Godot's
// story walks keep a manual camera (lantern_procession.gd and voting_story.gd walk_route). False, changing nothing, when no route
// reaches goal.
function startWalk(goal, { target = null, name = '', announce = '', owner = null, keepCamera = false } = {}) {
  const path = findPath(state.player, goal, ways);
  if (!path.length) return false;
  stopWalk();
  arrivedAt = null; walkPath = path; world.path = path; walkTarget = target; walkOwner = owner; walkName = name;
  if (!keepCamera || world.camera.following) world.camera.follow(state.player);
  cameraUI(); hint(); toast(announce || (name ? `Walking to ${name}. Choose Stop walking to cancel.` : 'Walking to your stop. Choose Stop walking to cancel.'));
  return true;
}
function goTo(object) {
  if (!world) { toast('The street scene is still loading. Try again when the map is ready.'); return; }
  if (Math.hypot(state.player.x - object.x, state.player.y - object.y) < 35) { stopWalk(); world.camera.follow(state.player); cameraUI(); interact(object); return; }
  if (!startWalk(object, { target: object, name: object.name || object.label })) { closeIfOpen(); toast('A route to that stop is unavailable in this scene. Try a nearby neighbor.'); return; }
  closeIfOpen(); canvas.focus({ preventScroll: true });
}
// host.walk of the side stories (visits-kit.js startWalk): any walk stops first, then a route they own. A refused route says
// nothing here (the story says Godot's blocked line), and no dialog opens or closes.
function visitWalk(goal, { name = '', announce = '', keepCamera = false } = {}) {
  stopWalk();
  return world && startWalk(goal, { name, announce, owner: 'visit', keepCamera }) ? 'walking' : 'blocked';
}
// A side story's walk hears that it stopped (visits.walkCancelled) once the walk is gone.
function stopWalk() { const visit = walkOwner === 'visit'; walkPath = []; walkTarget = null; walkOwner = null; walkName = ''; if (world) { world.path = []; hint(); } if (visit) visits.walkCancelled(); }
function closeIfOpen() { if (modal.open) close(); }
function neighbors() {
  if (!world) { toast('The street scene is still loading.'); return; }
  show(`<span class="eyebrow">A FEW FAMILIAR FACES</span><h2 id="modal-title">Meet the neighbors</h2><p>Choose someone and walk over to talk. You can stop along the way. These are fictional neighbors on a real street map.</p><ul class="neighbor-directory">${NEIGHBORS.map(n => `<li><button class="secondary-button" id="neighbor-${n.id}" aria-label="Walk to ${n.name}. ${n.role}"><span class="portrait" style="background:${n.coat}55" aria-hidden="true">${n.name[0]}</span><span class="neighbor-description"><strong>${n.name}</strong><small>${n.role}</small></span><span class="walk-label">Walk over ↗</span></button></li>`).join('')}</ul>${button('neighbors-close', 'Keep exploring')}`);
  for (const n of NEIGHBORS) bind(`neighbor-${n.id}`, () => goTo(n));
  bind('neighbors-close', close);
}
function cameraUI() {
  if (!world) return;
  const c = world.camera;
  const focused = document.activeElement;
  $('#zoom-out').disabled = c.scale <= c.minimum + .001;
  $('#zoom-in').disabled = c.scale >= c.maximum - .001;
  if (focused === $('#zoom-in') && focused.disabled) $('#zoom-out').focus({ preventScroll: true });
  if (focused === $('#zoom-out') && focused.disabled) $('#zoom-in').focus({ preventScroll: true });
  $('#recenter').setAttribute('aria-pressed', String(c.following));
  $('#camera-status').textContent = c.overviewMode ? c.routeOverview ? 'Turk history walk' : 'Full block' : c.following ? 'Following you' : 'Looking around';
}
function moveTo(point) {
  const path = findPath(state.player, point, ways);
  if (!path.length) { toast('Keep to the streets and sidewalks. Click a neighbor to find a route over.'); return; }
  stopWalk(); arrivedAt = null; walkPath = path; world.path = path; world.camera.follow(state.player); cameraUI(); hint();
}
const distanceTo = id => { const n = NEIGHBORS.find(n => n.id === id); return Math.hypot(n.x - state.player.x, n.y - state.player.y); };
// Godot's key-walk arrival: within ARRIVAL_DISTANCE_M (1.35 m) of a neighbor, again only after leaving by 0.75 m more.
function arriveNearby() {
  if (nearAt && distanceTo(nearAt) > 2.1 * PIXELS_PER_METRE) nearAt = null;
  const n = NEIGHBORS.find(n => distanceTo(n.id) <= 1.35 * PIXELS_PER_METRE);
  if (!n || n.id === nearAt) return;
  nearAt = arrivedAt = n.id; talks = arriveTalk(talks, n.id);
  // Godot finish_neighbor_arrival's caption, with the neighbor's memory tail.
  if (act({ type: 'meet', id: n.id })) toast(arrivalCaption(state, talkExtras(), talks, n.id, musicView()));
}
function hint() {
  const nearest = world.nearest(), text = walkPath.length ? `Walking${walkName ? ` to ${walkName}` : ''}…` : nearest ? NEIGHBORS.some(n => n.id === nearest.id) ? `Talk with ${nearest.name}` : nearest.name : 'Explore the block';
  $('#world-prompt span').textContent = text; $('#world-prompt kbd').textContent = walkPath.length ? '↑↓←→' : 'E';
  $('#stop-walking').disabled = !walkPath.length; storyResumeUI();
  if (routeSpeech && performance.now() > routeSpeech.until) routeSpeech = null;
  const status = routeSpeech ? routeSpeech.text : walkPath.length ? `${text} Choose Stop walking to cancel.` : nearest ? `Nearby: ${nearest.name}. Use Talk / help or choose a neighbor.` : 'Choose a neighbor for a walking route.';
  if ($('#route-status').textContent !== status) $('#route-status').textContent = status;
}
// The walk control of an active side story (Godot update_walk_control): its label, its tip as the title and the description, shown
// while the player is not walking. Hidden under focus, it gives the focus to the map.
function storyResumeUI() {
  const control = $('#story-resume'), entry = visits.entries().resume;
  if (!control || !entry) return;
  if (control.textContent !== entry.label) control.textContent = entry.label;
  if (control.title !== entry.description) { control.title = entry.description; $('#story-resume-tip').textContent = entry.description; }
  if (control.hidden !== !entry.visible) { control.hidden = !entry.visible; if (control.hidden && document.activeElement === control) canvas.focus({ preventScroll: true }); }
}
function renderFrame(ms) {
  const delta = Math.min((ms - lastFrame) / 1000 || 0, .045); lastFrame = ms;
  let moving = false;
  if (!modal.open) {
    let dx = 0, dy = 0;
    if (keys.has('arrowleft') || keys.has('a')) dx--;
    if (keys.has('arrowright') || keys.has('d')) dx++;
    if (keys.has('arrowup') || keys.has('w')) dy--;
    if (keys.has('arrowdown') || keys.has('s')) dy++;
    if (dx || dy) {
      if (walkPath.length) stopWalk();
      const length = Math.hypot(dx, dy), speed = 150 * delta;
      const x = state.player.x + dx / length * speed, y = state.player.y + dy / length * speed;
      if (walkable({ x, y: state.player.y }, ways)) state.player.x = x;
      if (walkable({ x: state.player.x, y }, ways)) state.player.y = y;
      moving = true; arriveNearby();
    } else if (walkPath.length) {
      const next = walkPath[0], distance = Math.hypot(next.x - state.player.x, next.y - state.player.y), speed = 160 * delta;
      if (distance <= speed + .1) { state.player = { x: next.x, y: next.y }; walkPath.shift(); }
      else { state.player.x += (next.x - state.player.x) / distance * speed; state.player.y += (next.y - state.player.y) / distance * speed; }
      moving = true;
      if (!walkPath.length) { hint(); if (walkOwner === 'visit') { walkOwner = null; visits.walkEnded(); } else if (walkTarget) { const target = walkTarget; walkTarget = null; interact(target, 'walk'); } }
    }
  }
  // The side stories each frame: the lantern march while it travels, then the landmark tour's completion.
  visits.tick(ms, world);
  stepSpeech(delta); world.motion = moving; world.draw(ms / 1000, settings.reducedMotion);
  if (ms - lastHint > 150) { if (arrivedAt && distanceTo(arrivedAt) > 40) arrivedAt = null; hint(); chapterUI(); lastHint = ms; }
  requestAnimationFrame(frame);
}
function frame(ms) {
  try { renderFrame(ms); }
  catch (error) {
    keys.clear(); console.error(error);
    show('<span class="eyebrow">A PAUSE ON THE BLOCK</span><h2 id="modal-title">The scene needs a reload.</h2><p>Your saved preparations are kept. Reload to return to this afternoon. A current browser with Canvas support is required.</p><div class="button-row"><button id="reload-scene" class="primary-button">Reload the scene</button></div>');
    bind('reload-scene', () => location.reload());
  }
}

$('#close-modal').addEventListener('click', () => close(returnFocus()));
// Godot's Goodbye (Esc): Escape on a conversation says goodbye too.
modal.addEventListener('cancel', () => { const id = openConversation(); if (id) { const lines = goodbyeLines(id, nextObjective(state, storyWorld())); queueMicrotask(() => { toast(lines.text); routeSay(lines.announcement); }); } });
bind('voices-button', openVoices);
// Closing the recovery offer with Escape or × decides nothing: this tab's progress stays, unsaved, and the next action to save asks again.
modal.addEventListener('close', () => { keys.clear(); if (walkOnClose && !modal.open) keys.add(walkOnClose); walkOnClose = null; if (!modal.open) { const later = recovery && body.querySelector('[data-recovery]'); voicesHost.dismiss(); focusReturn(); modalReturnTarget = canvas; releaseNotice(); if (later) toast('Decide whenever you like. This tab’s progress stays here, unsaved, until you keep it or use the shared save.'); queueChapterCard(); } });
// A held Escape is one Escape: its repeats never close the screen under the one it just left.
window.addEventListener('keydown', event => { if (event.key === 'Escape' && event.repeat && modal.open) event.preventDefault(); }, { capture: true });
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (modal.open && world && !event.repeat && MOVE_KEYS.includes(key) && startupContinue && body.querySelector('[data-chapter-card] #begin')) { event.preventDefault(); walkOnClose = key; startupContinue(); return; }
  if (modal.open || !world) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
  // A repeat of a key that is not walking is a key held through a dialog: only a fresh press walks.
  if (MOVE_KEYS.includes(key)) { event.preventDefault(); if (!event.repeat || keys.has(key)) keys.add(key); }
  if ((key === 'e' || key === 'enter') && !event.repeat && !['BUTTON', 'A'].includes(document.activeElement?.tagName)) { event.preventDefault(); const nearest = world.nearest(); if (nearest) { stopWalk(); interact(nearest, 'talk'); } else toast('Walk a little closer to a neighbor or a marked object.'); }
});
window.addEventListener('keyup', event => { const key = event.key.toLowerCase(); keys.delete(key); if (walkOnClose === key) walkOnClose = null; });
// Godot reward_audio_unlocked: the first real key, mouse or touch press. Capture, so the press that acts can already chime.
for (const type of ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend']) window.addEventListener(type, event => rewards.unlock(event), { capture: true, passive: true });
window.addEventListener('blur', () => keys.clear());
window.addEventListener('pagehide', () => { music.stop(); rewards.stop(); if (modal.open && body.querySelector('[data-neighborhood-voices]')) close($('#voices-button')); voicesHost.suspend(); });
window.addEventListener('pageshow', event => { if (event.persisted) { voicesHost.resume(); syncStored(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); music.stop(); rewards.stop(); voicesHost.silence(); } else syncStored(); });
window.addEventListener('storage', event => { if (event.key === SAVE_KEY || event.key === null) syncStored(); });
window.addEventListener('resize', chapterUI);
$('#journal-button').addEventListener('click', journal); $('#settings-button').addEventListener('click', showSettings);
$('#map-info').addEventListener('click', mapInfo); $('#about-button').addEventListener('click', mapInfo);
$('#open-gathering').addEventListener('click', finale); $('#save-start-over').addEventListener('click', () => confirmRestart(() => close($('#save-start-over'))));
$('#world-prompt').addEventListener('click', () => { if (!world) return; if (walkPath.length) { canvas.focus({ preventScroll: true }); toast('Walking to your stop. Choose Stop walking to cancel.'); return; } const nearest = world.nearest(); if (nearest) { stopWalk(); interact(nearest, 'talk'); } else { toast('Walk a little closer, or choose a neighbor from the list.'); canvas.focus({ preventScroll: true }); } });
$('#recenter').addEventListener('click', () => { if (world) { world.camera.follow(state.player); cameraUI(); } });
$('#map-overview').addEventListener('click', () => { if (world) { world.camera.overview(); cameraUI(); } });
for (const [id, factor] of [['zoom-in', 1.35], ['zoom-out', 1 / 1.35]]) $( `#${id}`).addEventListener('click', () => { if (world) { world.camera.zoom(factor); cameraUI(); } });
$('#neighbors-button').addEventListener('click', neighbors);
$('#history-walk-button').addEventListener('click', historyWalk);
$('#district-button').addEventListener('click', livingDistrict); $('#district-notes').addEventListener('click', livingDistrict);
$('#district-hide').addEventListener('click', () => { if (!world) return; world.districtVisible = false; districtUI(); $('#district-button').focus({ preventScroll: true }); toast('City boundary hidden.'); });
$('#stop-walking').addEventListener('click', () => { stopWalk(); canvas.focus({ preventScroll: true }); toast('Stopped here. Choose a neighbor whenever you’re ready.'); });
$('#sound-toggle').addEventListener('click', toggleMusic);
$('#music-button').addEventListener('click', showMusic);
async function init() {
  try {
    const response = await fetch('./data/streets.osm.json'); if (!response.ok) throw Error(`Street data: HTTP ${response.status}`);
    const data = await response.json(); ways = makeWays(data);
    if (!walkable(state.player, ways)) state.player = initialState().player;
    // The walk control of an active side story, before Stop walking (Godot update_walk_control relabels its walk control).
    $('#stop-walking').insertAdjacentHTML('beforebegin', '<button id="story-resume" class="secondary-button" aria-describedby="story-resume-tip" hidden></button><span id="story-resume-tip" class="sr-only"></span>'); visits.bindEntry('resume');
    // A tap on a visit object opens it where it stands and never walks there (settle.tap claims the tap that opened its card).
    world = new World(canvas, ways, () => state, { click: (point, object) => object ? object.kind === 'visit' ? interact(object, 'tap') : goTo(object) : moveTo(point), tap: event => settle.tap(event), camera: cameraUI, reducedMotion: settings.reducedMotion, layers: mapLayers });
    cameraUI();
    updateUI();
    showChapterCard(true); $('#loading').remove(); requestAnimationFrame(frame);
    // Read-only inspection for diagnostics; no production bypass for quest actions.
    window.tenderloin = Object.freeze({ snapshot: () => structuredClone(state), location: () => ({ ...world.offset, scale: world.scale }), sound: () => ({ mode: music.fileName ? 'local' : 'sketch', enabled: music.enabled, starting: music.starting, fileName: music.fileName, volume: music.volume, position: music.position, error: music.error, mask: music.sketch.mask, summary: stemSummary(music.sketch.mask), frames: music.sketch.position(), engine: music.sketch.engine, rate: music.sketch.context?.sampleRate ?? null, muted: music.sketch.muted, rewardsEnabled: settings.rewardSounds, rewardsUnlocked: rewards.unlocked, rewardCount: rewards.count, rewardLastCue: rewards.lastCue, audition: rhythm.auditioning }), ending: () => ending.snapshot(), rhythm: () => rhythm.snapshot(), visits: () => visits.snapshot(), experiment: () => voicesHost.snapshot(), version: VERSION, edition: EDITION,
      story: () => { chapterUI(); const goal = nextObjective(state, storyWorld()); return { chapter: currentChapter(state), line: $('#chapter-text').textContent, objective: { id: goal.id, text: goal.text }, card: chapterCardOpen() }; },
      save: () => ({ status: saveInfo.status, reason: saveInfo.reason, bytes: saveInfo.bytes, seq: saveSeq() }), pressSettle: () => settle.snapshot(),
      // The open conversation and the speech bubble on the frame clock (visible: drawn this frame).
      conversation: () => ({ partner: openConversation(), talks: { ...talks }, header: openConversation() ? $('#talk-header')?.textContent ?? '' : '', line: openConversation() ? $('#talk-line')?.textContent ?? '' : '' }),
      bubble: () => bubble ? { id: bubble.id, text: bubble.text, visible: !!world.bubble, timer: bubble.timer, deferred: bubble.deferred, matched: bubble.matched } : null });
  } catch (error) {
    let loading = $('#loading'); if (!loading) { loading = document.createElement('div'); loading.id = 'loading'; loading.className = 'loading'; $('.world-panel').append(loading); }
    loading.innerHTML = '<div class="error-box"><strong>This corner could not load.</strong><p>Run the local server with <code>npm run dev</code>, then open its printed address. If the server is running, try again.</p><button class="secondary-button" id="retry-load">Try again</button></div>';
    bind('retry-load', () => location.reload()); console.error(error);
  }
}
voicesHost.setEnabled(settings.experimental.neighborhoodVoices);
saveUI(); chapterUI();
init();
