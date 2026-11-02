import { SAVE_KEY, SETTINGS_KEY, PIXELS_PER_METRE, LITTER, MOTIFS, FURNITURE, PALETTES, SIGNS, LOANS, PHOTO_GUESTS, BLOCK_TEXT, initialState, applyAction, progress, ready, arranged, metCount, blockMissingItems, musicLayers, canPlaceFurniture, occupiedCells, walkable, findPath } from './core.js';
import { parseGodotSave, buildGodotSave, freshEnvelope, utf8Bytes, isWholeNumber, lostProgress, combineSaves, sceneAdmission, FORK_FIELDS } from './godot-save.js';
import { STORY_CHAPTERS, currentChapter, chapterLine, chapterCard, chapterCardDue, chapterAnnouncement, storyChapter, nextObjective, isNarrow, fmt, GATHERING_LAYOUT_TITLES } from './story.js';
import { installPressSettle } from './press-settle.js';
import { World, makeWays, objectLabel, NEIGHBORS, PLACES, PALETTE_COLORS } from './world.js';
import { BLACK_HAWK } from './history.js';
import { districtGeometry } from './district.js';
import { Soundtrack } from './soundtrack.js';
import { stemMask, stemSummary, cleanVolume, nextVolume, volumeAnnouncement, playingAnnouncement, switchedAnnouncement, MUSIC_TEXT, MAX_VOLUME } from './sketch-core.js';
import { RewardPlayer, progressCues, rewardFor, visitCue, soundsLabel, soundsAnnouncement, cleanRewardSounds, SOUNDS_TEXT } from './rewards.js';
import { createBanner, cueBurst, cueValues, layoutBurst, directBurst, bannerRect, BANNER } from './bursts.js';
import { PHOTO_RESPONSES, postcardSVG } from './keepsake.js';
import { gatheringScene, gatheringPlanSVG } from './gathering.js';
import { SEGMENTS, segment, programmeIssue, programmeTitle, programmeSVG, programmeResponse } from './programme.js';
import { currentActivity, tilePanelSVG, STORY_CHOICES, QUIET_CHOICES } from './hosting.js';
import { freshTalk, arriveTalk, chatTalk, confirmLoan, conversationView, arrivalCaption, talkAnnouncement, goodbyeLines, whatsNext, whatsNextAnnouncement, rookMusicDetail, narrowLabel, sparkCount, ACTION_LABELS, BUTTON_TEXT, HUB_LABELS, gdFormat } from './characters.js';
import { showBubble, stepBubble, spokenText, speechNotice, fitAround, BUBBLE, BUBBLE_TEXT, FORK_BUBBLE } from './bubble.js';
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
import { RHYTHM_TEXT } from './rhythm.js';
import { createVisits } from './visits-ui.js';
import { createEpisodeScreens } from './visits-episodes.js';
import { createWorldVisits } from './visits-world.js';
import { VISITS_FORK_TEXT } from './visits-kit.js';
import { GODOT_TEXT as VISIT_TEXT } from './visits/text.js';
import { createSprites, tourMarkerLift, BEACON_LIFT } from './sprites.js';
import { EDITION_URL, EDITION_TEXT, swapAction } from './edition.js';
import { inputKey, readLanguageSettings, resolveStartup, loadCatalog, loadManifest, shippedLocales, setLocale, applyDocument, createSwitcher, diagnostics as i18nDiagnostics, localeMeta, offerParts, offerFor, languageChoices, languageLabel, boot, locale as activeLocale, escapeHTML, STORABLE, storedLanguageAfter, LOAD_TIMEOUT_MS, t, L, list, html as htmlParts } from './i18n.js';
import { GAME_TEXT, tf } from './game-text.js';

const $ = selector => document.querySelector(selector);
const modal = $('#modal'), body = $('#modal-body'), canvas = $('#world');
let modalReturnTarget = canvas;
const music = new Soundtrack({ onChange: soundUI });
// Godot's RewardAudioPlayer: one chime at a time on the sketch's shared context, at a fixed gain, with music on or off.
const rewards = new RewardPlayer(() => music.sketch.ensureContext());
// Godot's reward banner (bursts.js), one at a time on the map. It is aria-hidden, since every step it celebrates is already
// announced, and it never takes a pointer or the focus. Any open dialog is a focused activity: the banner waits behind it.
// bannerBox: where it was last placed, in the map panel's px; bannerMeasure: its height for one width and text.
const banner = createBanner(), bannerEl = $('#reward-banner');
let bannerBox = null, bannerMeasure = { key: '', h: 0 };
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
  // docs/I18N_PLAN.md 2.9: language, languageOffer and addressForm, known values only. Absent means English, not chosen.
  Object.assign(settings, readLanguageSettings(stored));
} catch { /* Invalid preferences do not make a valid game save unavailable. */ }
music.setVolume(settings.volume); rewards.setEnabled(settings.rewardSounds);
document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
// Localization: the page starts in English. The URL (?lang=xx, &preview=1 for a locale not shipped yet) or the stored language
// may name a locale, which init() loads beside the street data; the game never switches on its own (D6). shippedCodes: the
// manifest's shipped locales, once read; localeBooted: the startup card has been drawn.
const PAGE_TITLE = document.title, startupLocale = resolveStartup({ stored: settings, search: location.search, languages: navigator.languages });
let shippedCodes = [], localeBooted = false;
const localeSwitcher = createSwitcher({ load: (code, options) => code === 'en' ? { ok: true, code, catalog: null } : loadCatalog(code, options), apply: (result, code) => adoptLocale(result, code) });
const settle = installPressSettle(document, window);
let world, ways, toastTimeout, activeTool = 'table', activeMotif = 'sun', lastFrame = 0, lastHint = 0;
// walkOwner is 'visit' while a side story owns the walk (its arrival goes to visits.walkEnded); walkName is where the walk goes.
let walkTarget = null, walkPath = [], walkOwner = null, walkName = '', keys = new Set(), arrivedAt = null, nearAt = null, lastChapter = -1, cardQueued = false;
// The movement key each physical key (event.code) went down as, so its keyup releases that key even if the layout changed.
const heldCodes = new Map();
const releaseKeys = () => { keys.clear(); heldCodes.clear(); };
let districtStatus = 'idle', districtPromise;
// startupContinue: the open startup card's continue; walkOnClose: the movement key that dismissed it, walking once it closes.
let startupContinue = null, walkOnClose = null;
const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
// The ending chain (ending/ui.js) and Dez's Rhythm Circle (rhythm-ui.js): visit-only screens over the saved state.
// Godot save_receipt's reason in Godot's words, '' when the last write went through. A held save or a pending recovery
// offer writes nothing, so its receipt is visit-only too. The ending and the visits receive it localized (L), '' as it is.
const saveReason = () => { const reason = held || recovery ? 'not saved' : saveInfo.status === 'refused' ? saveInfo.reason === 'full' ? 'save full' : saveInfo.reason === 'storage' ? 'storage unavailable' : 'not saved' : !storageAvailable && !held ? 'storage unavailable' : ''; return reason && L(reason); };
// Godot consume_chapter_announcement: Follow takes a due chapter announcement, with the Rhythm Circle's completion notice.
let chapterNotice = '';
const chapterText = () => { if (!chapterCardDue(lastChapter, state)) return ''; lastChapter = storyChapter(state).num; const text = chapterAnnouncement(state, chapterNotice) + ' '; chapterNotice = ''; return text; };
const modalStatus = text => { $('#modal-status').textContent = text; }, STUDIO = GODOT['programme_studio.gd'].refresh;
const ending = createEnding({ doc: document, win: window, modal, settle, getState: () => state, show, close: target => close(target), status: modalStatus, toast, stopWalk, reducedMotion: () => settings.reducedMotion, chapterText, act,
  sceneAdmission: next => sceneAdmission(envelope ?? recovery?.envelope, state, next), saveReason, music: { label: () => t(music.enabled || music.starting ? STUDIO.musicOn : STUDIO.musicOff), on: () => music.enabled || music.starting, toggle: toggleMusic },
  filmButtonLabel: () => ($('#film-shoot') ? filmButtonText() : ''), openDraft: () => programmeEditor(), openPosted: () => programmePoster(), openMural: () => muralEditor() });
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
  chime: (id, reason, values) => {
    try { rewards.play(rewardFor([visitCue(id, reason)], { enabled: settings.rewardSounds, unlocked: rewards.unlocked })); } catch { /* a chime never holds up a visit */ }
    try { burst(cueBurst(visitCue(id, reason), { ...cueValues(state), ...values })); } catch { /* nor does its banner */ }
  },
  burst: spec => { try { burst(directBurst(spec), spec?.finale ? BANNER.finale : 0); } catch { /* a banner never holds up a visit */ } }, rewardPending: () => banner.pending(),
  walk: (goal, options) => visitWalk(goal, options), stopWalk: () => stopWalk(), walking: () => walkPath.length > 0, player: () => ({ ...state.player }),
  lookAt: point => { if (!world) return; world.camera.lookAt(point); cameraUI(); }, speak: (id, text, name) => speak(id, text, name),
  music: { label: () => t(music.enabled || music.starting ? STUDIO.musicOn : STUDIO.musicOff), on: () => music.enabled || music.starting, toggle: toggleMusic },
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
    // A beacon's own object stands at its foot and its other tap points are tapOnly, so world.js nearest() (E/Enter and the Nearby
    // hint) measures it from its foot alone. The lifted tour marker is the marker's one object, for a tap and for E/Enter.
    let scene = null;
    return visits.objects(w).flatMap(o => o.id === 'tour-marker' ? [{ ...o, y: o.y - tourMarkerLift(w.scale) }] : o.id.startsWith('surprise:') ? [o, { ...o, y: o.y - BEACON_LIFT / 2 }, { ...o, y: o.y - BEACON_LIFT }, ...sprites.chipTargets(w, scene ??= visits.scene(), o)].map(p => p === o ? p : { ...p, tapOnly: true }) : [o]);
  },
  ground: (c, w) => sprites.ground(c, w, visits.scene()), actors: w => sprites.actors(w, visits.scene()), overlay: (c, w) => sprites.overlay(c, w, visits.scene()),
};
// Godot's session-only talk counters (characters.js freshTalk; Celeste's is the saved celesteTalks) and the one shared
// speech bubble with its live-region mirror (routeSpeech, read by hint()).
let talks = freshTalk(), bubble = null, routeSpeech = null;
// This visit's session-only state: talk turns, the last arrival, a pending chapter notice, the speech bubble and the side stories
// (visits-ui.js). Start fresh starts it over, and so does a stored save that replaces this tab's state (from another tab or
// edition, or Use the shared save), as Godot's load does. An action rebased onto a newer save keeps it. A walk a side story owns
// stops first (its trip is part of the visit; stopWalk cancels it silently), so no story walk goes on to a screen that is gone.
// Returns the side stories' sync: closed when one of their screens held the dialog.
function resetSession() { banner.reset(); talks = freshTalk(); arrivedAt = nearAt = null; chapterNotice = ''; bubble = null; routeSpeech = null; if (walkOwner === 'visit') stopWalk(); return visits.sync({ adopted: true }); }
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
  const status = voicesHost.status === 'ready' ? t(GAME_TEXT.voicesUI.readyReadTheOrganization) : voicesHost.status === 'error' ? t(GAME_TEXT.voicesUI.theExperimentCouldNot) : voicesHost.status === 'paused' ? t(GAME_TEXT.voicesUI.pausedWhileAwayOpen) : voicesHost.enabled ? t(GAME_TEXT.voicesUI.loadingTheOptionalOrganization) : t(GAME_TEXT.voicesUI.offNoOptionalCards);
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
  show(`<section data-neighborhood-voices><span class="eyebrow">${t(GAME_TEXT.openVoices.experimentalOptional)}</span><h2 id="modal-title" tabindex="-1">${t(GAME_TEXT.openVoices.neighborhoodVoices)}</h2><p>${t(GAME_TEXT.openVoices.threeDatedOrganizationCards)}</p><p id="voices-load-state" role="status"></p><div class="button-row"><button id="voices-read" class="primary-button" hidden>${t(GAME_TEXT.openVoices.readTheOrganizationCards)}</button><button id="voices-retry" class="secondary-button" hidden>${t(GAME_TEXT.openVoices.retryTheExperiment)}</button>${button('voices-off', t(GAME_TEXT.openVoices.turnOffNeighborhoodVoices))}${button('voices-back', t(BACK))}</div></section>`);
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
const syncNotice = changed => t(held ? SAVE_TEXT.held : changed.result.status === 'fresh' ? GAME_TEXT.syncNotice.theSharedSaveWas : changed.closed ? FORK_TEXT.copiesChanged : changed.visitsClosed ? VISITS_FORK_TEXT.adopted : GAME_TEXT.syncNotice.progressSavedInAnother);
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
      notify(gone ? `${syncNotice(changed)} ${t(GAME_TEXT.persist.yourLastChangeNo)}` : syncNotice(changed)); return !gone;
    }
  }
  if (held) { saveUI(); if (changed) notify(t(SAVE_TEXT.held)); return true; }
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
    show(`<section data-recovery><span class="eyebrow">${t(GAME_TEXT.offerRecovery.oneSaveTwoEditions)}</span><h2 id="modal-title">${t(GAME_TEXT.offerRecovery.someProgressWentBack)}</h2><p>${t(GAME_TEXT.offerRecovery.theSharedSaveNow)}</p><p>${t(GAME_TEXT.offerRecovery.keepThisTabsProgress)}</p>${message ? `<p class="grid-message">${message}</p>` : ''}<div class="button-row">${button('recover-save', t(GAME_TEXT.offerRecovery.keepThisTabsProgress2), true)}${button('recover-skip', t(GAME_TEXT.offerRecovery.useTheSharedSave))}</div></section>`);
    bind('recover-save', recover); bind('recover-skip', declineRecovery);
  });
}
const KEEP_REFUSED = GAME_TEXT.keepRefused;
// This tab's progress is dropped only once the combined save is written.
function recover() {
  const changed = reread();
  if (!recovery) { if (changed) notify(syncNotice(changed)); return; }
  const out = combineSaves(envelope, state, recovery.envelope, recovery.scenes);
  if (!out.ok || !commit(out)) { offerRecovery(t(KEEP_REFUSED[out.ok ? 'storage' : out.reason] || KEEP_REFUSED.other)); return; }
  // Slots this tab had only adopted now follow the combined save; slots it painted or lifted stay its own (combineSaves).
  loadedScenes = out.loadedScenes;
  recovery = null; state = { ...out.state, player: state.player, litter: state.litter }; close(); updateUI();
  notify(t(GAME_TEXT.recover.thisTabsProgressIs));
}
function declineRecovery() {
  const changed = reread();
  if (!recovery) { if (changed) notify(syncNotice(changed)); return; }
  recovery = null; adoptSave(parseGodotSave(lastRaw, { initialState }), lastRaw, state); close();
  // The shared save replaces this tab's progress as a load does: this visit's session and the ending's copies start over.
  resetSession(); ending.sync({ adopted: true }); updateUI();
  notify(t(GAME_TEXT.declineRecovery.theSharedSaveStays));
}
const SAVE_TEXT = GAME_TEXT.save;
const REFUSED_TEXT = GAME_TEXT.saveRefused;
function saveText() { return t(recovery ? SAVE_TEXT.pending : saveInfo.status === 'refused' ? REFUSED_TEXT[saveInfo.reason] || REFUSED_TEXT.other : !storageAvailable && !held ? REFUSED_TEXT.storage : SAVE_TEXT[saveInfo.status]); }
function saveUI() { $('#save-status').textContent = saveText(); $('#save-start-over').hidden = !held; }
const saveSeq = () => envelope && isWholeNumber(envelope.save_seq) ? Math.round(envelope.save_seq) : 0;
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { toast(t(GAME_TEXT.saveSettings.settingsWillLastFor)); } }
// Only a reducer's new state is persisted, and only when it changes what the shared save holds. False when the action
// changed nothing, or no longer applied to a save another tab or edition wrote first.
function act(action) {
  const before = state, next = applyAction(state, action);
  // Godot trigger_progress_cue: this action's chime, under the Sounds setting and the first-press unlock, and its banner, which
  // reads the state after the action. Loads never chime or burst.
  const cues = progressCues(before, next, action);
  rewards.play(rewardFor(cues, { enabled: settings.rewardSounds, unlocked: rewards.unlocked }));
  try {
    const values = cueValues(next);
    for (const c of cues) burst(cueBurst(c, values));
    // choose_gathering_layout's own burst, for a choice the reducer took (Godot bursts again for the same layout).
    if (action.type === 'layout' && next !== before) burst(layoutBurst(action.value, values.sparks));
  } catch { /* a banner never holds up an action */ }
  if (next === state) return false;
  state = next; updateUI();
  return savedFields(next) === savedFields(before) || persist(action);
}
function show(html) {
  voicesHost.dismiss();
  const focused = modal.open ? document.activeElement?.id : null;
  body.innerHTML = html;
  if (!modal.open) { modalReturnTarget = canvas; releaseKeys(); modal.showModal(); }
  const previous = focused ? document.getElementById(focused) : null;
  if (!previous || !modal.contains(previous)) modal.scrollTop = 0;
  const focusTarget = previous && modal.contains(previous) && !previous.disabled ? previous : body.querySelector('button:not([disabled]):not([hidden]),a[href]:not([hidden]),input:not([disabled]):not([hidden])') || $('#close-modal');
  focusTarget.focus({ preventScroll: true });
  $('#modal-status').textContent = body.querySelector('.grid-message')?.textContent || '';
}
function returnFocus() { return modalReturnTarget.isConnected ? modalReturnTarget : document.getElementById(modalReturnTarget.id) || canvas; }
// A control that is hidden (the resume control once its story ended, an afterglow button once the block closed) or disabled cannot
// take the focus, which would fall to the page body: the map takes it.
function focusReturn() { let target = returnFocus(); if (target.hidden || target.closest?.('[hidden]') || target.disabled) target = canvas; target.focus({ preventScroll: true }); if (['civic-hour', 'film-shoot'].includes(target.id)) target.scrollIntoView({ block: 'nearest' }); }
function close(target = canvas) { voicesHost.dismiss(); modalReturnTarget = target instanceof HTMLElement ? target : canvas; modal.close(); focusReturn(); releaseNotice(); }
function bind(id, callback) { document.getElementById(id)?.addEventListener('click', callback); }
function button(id, label, primary = false, disabled = false) { return `<button id="${id}" class="${primary ? 'primary-button' : 'secondary-button'}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function updateUI() {
  const p = progress(state), count = Object.values(p).filter(Boolean).length, met = metCount(state), placed = MOTIFS.filter(id => state.mural[id]).length;
  $('#progress-label').textContent = tf(GAME_TEXT.updateUI.of3Preparations, { count }); $('#progress-percent').textContent = `${Math.round(count / 3 * 100)}%`; $('#progress-fill').style.width = `${count / 3 * 100}%`;
  const unmet = NEIGHBORS.filter(n => !state.visited.includes(n.id)).map(n => t(n.name)), layoutName = L(GATHERING_LAYOUT_TITLES[state.layout]);
  // Godot's opening: meet all five, paint three motifs, soundcheck with Rook. The layout is an optional step.
  const tasks = [
    { id: 'neighbors', title: tf(GAME_TEXT.updateUI.meetTheNeighbors5, { met }), done: p.neighbors, detail: p.neighbors ? t(GAME_TEXT.updateUI.everyoneOnTheBlock) : tf(GAME_TEXT.updateUI.sayHelloTo, { names: list(unmet, names => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]) }) },
    { id: 'mural', title: tf(GAME_TEXT.updateUI.mural3, { placed }), done: p.mural, detail: p.mural ? t(GAME_TEXT.updateUI.threeNeighborsIdeasOne) : t(GAME_TEXT.updateUI.paintSunWaveAnd) },
    { id: 'sound', title: t(ACTION_LABELS.soundcheck), done: p.sound, detail: p.sound ? state.epilogue.packing ? t(GAME_TEXT.updateUI.rookHelpedTheGathering) : t(GAME_TEXT.updateUI.rookHasTheMix) : t(GAME_TEXT.updateUI.talkWithRookTo) },
    { id: 'layout', title: t(GAME_TEXT.updateUI.chooseTheGathering), done: !!state.layout, detail: state.layout ? state.opened ? layoutName : arranged(state) ? tf(GAME_TEXT.updateUI.layoutClear, { layout: layoutName }) : tf(GAME_TEXT.updateUI.layoutArranged, { layout: layoutName, count: Object.keys(state.furniture).length }) : t(GAME_TEXT.updateUI.optionalBeasLongTable) },
  ];
  $('#tasks').innerHTML = tasks.map((task, i) => `<li class="task ${task.done ? 'done' : ''} ${task.id === 'layout' ? 'optional' : ''}"><button id="task-${task.id}" aria-label="${task.title}. ${task.detail}"><span class="task-number">${task.done ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="task-content"><span class="task-title">${task.title}</span><span class="task-detail">${task.detail}</span></span><span class="task-arrow">↗</span></button></li>`).join('');
  bind('task-neighbors', () => { const goal = nextObjective(state, storyWorld()); if (goal.id === 'meet') goTo(goal.target); else neighbors(); });
  bind('task-layout', () => goTo(NEIGHBORS[0]));
  bind('task-mural', () => goTo(PLACES.find(p => p.id === 'mural')));
  bind('task-sound', () => goTo(NEIGHBORS.find(n => n.id === 'rook')));
  $('#open-gathering').disabled = !ready(state); $('#open-gathering').innerHTML = state.opened ? `${t(GAME_TEXT.updateUI.enjoyTheGathering)} <span>↗</span>` : `${t(GAME_TEXT.updateUI.openTheGathering)} <span>↗</span>`;
  // Godot's MUSIC_STEM_ORDER names: bass, brush, chords, lead.
  const stems = [['layout', t(GAME_TEXT.updateUI.bass)], ['tidy', t(GAME_TEXT.updateUI.brush)], ['mural', t(GAME_TEXT.updateUI.chords)], ['opened', t(GAME_TEXT.updateUI.lead)]], layers = musicLayers(state);
  $('#stems').innerHTML = stems.map(([key, label]) => `<span class="stem ${layers[key] ? 'active' : ''}"><i></i>${label}</span>`).join('');
  music.update(layers);
  if (state.layout === 'floor') { $('#neighbor-quote').textContent = state.opened ? t(GAME_TEXT.updateUI.turnsOutALittle) : t(GAME_TEXT.updateUI.leaveALittleOpen); $('#neighbor-credit').textContent = t(GAME_TEXT.updateUI.dezYourNeighbor); }
  else { $('#neighbor-quote').textContent = state.opened ? t(GAME_TEXT.updateUI.seeWeAlreadyHad) : t(GAME_TEXT.updateUI.aLongTableA); $('#neighbor-credit').textContent = t(GAME_TEXT.updateUI.beaYourNeighbor); }
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
  show(`<section data-chapter-card>${startup ? '<div class="welcome-art" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' : ''}<span class="eyebrow">${startup ? t(GAME_TEXT.showChapterCard.welcomeToYourAfternoon) : t(GAME_TEXT.showChapterCard.aNewChapterOn)}</span><h2 id="modal-title">${card.title}</h2><p>${card.body}</p>${startup ? `<div class="button-row">${visits.entryHTML('before')}</div>` : ''}<div class="button-row">${button(id, card.button, true)}</div>${startup ? languageOfferHTML() : ''}${startup ? `<div class="dialog-controls"><span>${tf(GAME_TEXT.showChapterCard.walkKeys, { keys: '<kbd>WASD</kbd>' })}</span><span>${tf(GAME_TEXT.showChapterCard.talkKey, { key: '<kbd>E</kbd>' })}</span></div><p class="footnote">${t(GAME_TEXT.showChapterCard.tapPeopleOrObjects)}</p>` : ''}</section>`);
  $('#modal-status').textContent = announce ?? card.announcement;
  const returning = state.visited.length || Object.keys(state.mural).length;
  // Godot continue_story(true): the startup card's button, or W/A/S/D or an arrow key on it, starts the music unless it is
  // playing. Escape and × stay silent.
  const go = () => { close(); if (startup && !music.enabled && !music.starting) music.start(); if (startup) toast(held ? t(savedMessage) : returning && savedMessage ? t(savedMessage) : t(GAME_TEXT.showChapterCard.beaIsJustAhead)); };
  bind(id, go); startupContinue = startup ? go : null;
  // Godot's optional opening sits above Start Exploring, which keeps the focus (story_continue_btn.grab_focus).
  if (startup) bindLanguageOffer();
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
  $('#sound-toggle').setAttribute('aria-label', local ? music.enabled || music.starting ? t(GAME_TEXT.soundUI.pauseLocalTrack) : t(GAME_TEXT.soundUI.playLocalTrack) : music.enabled || music.starting ? t(GAME_TEXT.soundUI.muteMusicSketch) : t(GAME_TEXT.soundUI.enableMusicSketch));
  $('#sound-toggle').textContent = local ? music.enabled || music.starting ? 'Ⅱ' : '▶' : '♫';
  $('#stems').hidden = local;
  $('#sound-heading').textContent = local ? t(GAME_TEXT.soundUI.yourNeighborhoodMix) : t(GAME_TEXT.soundUI.theBlockFindsIts);
  $('#sound-disclosure').textContent = local ? t(GAME_TEXT.soundUI.localAudioThisTab) : t(GAME_TEXT.soundUI.originalSynthSketchRecorded);
  if (local) $('#sound-caption').textContent = music.error || tf(music.enabled ? GAME_TEXT.soundUI.playingFile : music.starting ? GAME_TEXT.soundUI.startingFile : GAME_TEXT.soundUI.readyFile, { file: music.fileName });
  else {
    const count = Object.values(progress(state)).filter(Boolean).length, line = state.epilogue.packing ? t(GAME_TEXT.soundUI.aSharedAfternoonKept) : state.opened ? t(GAME_TEXT.soundUI.allFourPartsAre) : count ? tf(GAME_TEXT.soundUI.preparationsMadeTheMusic, { count }) : t(GAME_TEXT.soundUI.aQuietBeginningEach);
    $('#sound-caption').textContent = `${line} · ${stemsNow()}`;
  }
  if (music.error) $('#sound-caption').textContent = music.error;
  // Rook's open music panel follows the player's play and pause.
  rhythm.musicChanged();
  if ($('#talk-play')) $('#talk-play').textContent = t(music.enabled || music.starting ? BUTTON_TEXT.pause : BUTTON_TEXT.play);
  if ($('#soundtrack-status')) {
    // Playing, the panel's status line says Godot's start_music_playback line; starting or waiting for Play, its own.
    const playing = music.enabled ? playingAnnouncement({ ...musicView(), summary: stemsNow() }) : '';
    const sketchStatus = music.starting ? t(GAME_TEXT.soundUI.startingTheSynthSketch) : playing || t(GAME_TEXT.soundUI.originalSynthSketchSelected);
    $('#soundtrack-status').textContent = music.error || (local ? playing || tf(music.starting ? GAME_TEXT.soundUI.fileStarting : GAME_TEXT.soundUI.fileReady, { file: music.fileName }) : sketchStatus);
    $('#track-play').textContent = music.enabled || music.starting ? t(GAME_TEXT.soundUI.pauseMusic) : t(GAME_TEXT.soundUI.playMusic);
    const wasFocused = document.activeElement === $('#use-sketch');
    $('#use-sketch').disabled = !local;
    if (wasFocused && !local) $('#track-play').focus({ preventScroll: true });
  }
}
// Godot toggle_music_playback: "Music paused.", or start_music_playback's "Music playing: …" once the music plays. The line is
// announced as Godot announces it and returned, so a dialog that redraws after the toggle can say it again, last.
async function toggleMusic() {
  let said = '';
  if (music.enabled || music.starting) { music.stop(); said = t(MUSIC_TEXT.paused); }
  else {
    const started = await music.start();
    if (started === false) toast(music.error || t(GAME_TEXT.toggleMusic.audioIsUnavailableIn));
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
  if (playing && await music.start() === false) toast(music.error || t(GAME_TEXT.useSynthSketch.audioIsUnavailableIn));
  return said;
}
function showMusic() {
  show(`<span class="eyebrow">${t(GAME_TEXT.showMusic.setTheMood)}</span><h2 id="modal-title">${t(GAME_TEXT.showMusic.yourBlockYourMusic)}</h2><p>${t(GAME_TEXT.showMusic.bringAJazzTrack)}</p><label class="file-picker" for="soundtrack-file">${t(GAME_TEXT.showMusic.chooseAnMp3Or)}<input id="soundtrack-file" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav"></label><p id="soundtrack-status" class="track-status" role="status" aria-live="polite"></p><label class="settings-row" for="soundtrack-volume"><span>${t(GAME_TEXT.showMusic.musicVolume)} <span id="track-volume-number">${Math.round(settings.volume * 100)}%</span></span><input id="soundtrack-volume" data-rapid type="range" min="0" max="${MAX_VOLUME * 100}" value="${Math.round(settings.volume * 100)}"></label><div class="button-row">${button('track-play', t(GAME_TEXT.showMusic.playMusic), true)}${button('use-sketch', t(GAME_TEXT.showMusic.returnToSynthSketch))}${button('music-close', t(BACK))}</div><p class="footnote">${t(GAME_TEXT.showMusic.theFileStaysOn)}</p>`);
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
  panel.innerHTML = `<div class="afterglow-heading"><span class="eyebrow">${packing ? t(GAME_TEXT.updateAfterglow.borrowedWithCare) : t(GAME_TEXT.updateAfterglow.theAfternoonContinues)}</span><h2>${packing ? allReturned ? t(GAME_TEXT.updateAfterglow.readyForAnotherAfternoon) : t(GAME_TEXT.updateAfterglow.aLittleThankYou) : t(GAME_TEXT.updateAfterglow.stayALittleLonger)}</h2><p>${packing ? allReturned ? t(GAME_TEXT.updateAfterglow.theThreeLoansAre) : t(GAME_TEXT.updateAfterglow.beaFoldsHerSeats) : t(GAME_TEXT.updateAfterglow.makeAKeepsakeKeep)}</p><p class="gathering-caption">${scene.caption}</p></div><div class="afterglow-actions">${button('see-gathering-plan', `${t(GAME_TEXT.updateAfterglow.seeYourGatheringPlan)} ↗`)}${photo.status === 'taken' ? button('view-keepsake', `${t(GAME_TEXT.updateAfterglow.viewYourIllustratedKeepsake)} ↗`) : !packing ? button('make-keepsake', photo.status === 'skipped' ? t(GAME_TEXT.updateAfterglow.changedYourMindAbout) : `${t(GAME_TEXT.updateAfterglow.askAboutAKeepsake)} ↗`) : `<p class="footnote">${t(GAME_TEXT.updateAfterglow.youKeptThisAfternoon)}</p>`}${!packing ? button('start-pack', t(GAME_TEXT.updateAfterglow.whenYoureReadyPack)) : `<div class="loan-list" aria-label="${t(GAME_TEXT.updateAfterglow.optionalEventLoans)}">${LOANS.map(loan => `<button id="visit-${loan.id}" class="loan-button ${returned.includes(loan.id) ? 'returned' : ''}" ${returned.includes(loan.id) ? 'disabled' : ''}><span>${returned.includes(loan.id) ? '✓' : '↗'}</span>${t(loan.label)}<small>${returned.includes(loan.id) ? t(GAME_TEXT.updateAfterglow.returnedThankYou) : tf(GAME_TEXT.updateAfterglow.returnTo, { name: t(NEIGHBORS.find(n => n.id === loan.owner).name) })}</small></button>`).join('')}</div>`}</div>`;
  bind('make-keepsake', () => photoConsent()); bind('view-keepsake', viewKeepsake); bind('start-pack', packingChoice);
  bind('see-gathering-plan', showGatheringPlan);
  panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', button('next-afternoon', state.programme.published.length ? `${t(GAME_TEXT.updateAfterglow.revisitOurNextAfternoon)} ↗` : `${t(GAME_TEXT.updateAfterglow.planAnotherAfternoon)} ↗`));
  bind('next-afternoon', () => programmeEditor());
  if (state.programme.published.length || state.hosting.order.length) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', button('host-afternoon', state.hosting.results.length === 4 ? `${t(GAME_TEXT.updateAfterglow.rememberOurSecondGathering)} ↗` : state.hosting.order.length ? `${t(GAME_TEXT.updateAfterglow.continueOurSecondGathering)} ↗` : `${t(GAME_TEXT.updateAfterglow.hostThePostedProgramme)} ↗`, true));
    bind('host-afternoon', () => hostingScreen());
  }
  if (rhythm.available()) { panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<button id="rhythm-circle" class="secondary-button" aria-label="${esc(rhythm.entryLabel().replace(/\n/g, ' '))}">${esc(rhythm.entryLabel()).replace(/\n/g, '<br>')}</button>`); bind('rhythm-circle', () => rhythm.open('block')); }
  // The side stories on the block (visits-ui.js): Neighborhood Stories and Cook & Share.
  panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', visits.entryHTML('story') + visits.entryHTML('meal')); visits.bindEntry('story'); visits.bindEntry('meal');
  if (civicAvailable(state)) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<div class="civic-invitation"><p>${state.civic.phase === 'done' ? t(GAME_TEXT.updateAfterglow.laterOnTheBlock) : t(GAME_TEXT.updateAfterglow.aLaterAfternoonThe)}</p>${button('civic-hour', state.civic.phase === 'done' ? `${t(GAME_TEXT.updateAfterglow.rememberOurListeningHour)} ↗` : state.civic.phase === 'idle' ? `${t(GAME_TEXT.updateAfterglow.aTenantListeningHour)} ↗` : `${t(GAME_TEXT.updateAfterglow.continueOurListeningHour)} ↗`)}</div>`);
    bind('civic-hour', () => civicScreen());
  }
  if (filmAvailable(state)) {
    panel.querySelector('.afterglow-actions').insertAdjacentHTML('beforeend', `<div class="civic-invitation"><p>${t(GAME_TEXT.updateAfterglow.aLaterFictionalDay)}</p>${button('film-shoot', `${filmButtonText()} ↗`)}</div>`);
    bind('film-shoot', () => filmScreen());
  }
  LOANS.forEach(loan => bind(`visit-${loan.id}`, () => goTo(NEIGHBORS.find(n => n.id === loan.owner))));
  if (packing) { $('#open-gathering').innerHTML = `${t(GAME_TEXT.updateAfterglow.yourAfternoon)} <span>↗</span>`; $('#neighbor-quote').textContent = allReturned ? t(GAME_TEXT.updateAfterglow.everythingBorrowedIsBack) : t(GAME_TEXT.updateAfterglow.illFoldTheSeats); $('#neighbor-credit').textContent = t(GAME_TEXT.updateAfterglow.beaYourNeighbor); }
  if (state.hosting.order.length) { if (!packing) panel.querySelector('.afterglow-heading h2').textContent = t(GAME_TEXT.updateAfterglow.yourOpeningAfternoon); panel.querySelector('.gathering-caption').textContent = tf(GAME_TEXT.updateAfterglow.openingChapter, { caption: scene.caption }); $('#open-gathering').innerHTML = `${t(GAME_TEXT.updateAfterglow.rememberTheOpening)} <span>↗</span>`; }
}
const FILM_DONE = GODOT['main.gd'].film_capture_shot;
// Godot's own labels that the fork's screens share: Back to the block (film_screening.gd) and the move buttons Earlier and Later
// (story_picker.gd, as programme_studio.gd's).
const BACK = GODOT['film_screening.gd'].setup.back, ORDER = VISIT_TEXT['story_picker.gd'].setup;
// The afterglow's film button label, without its arrow (the ending's screening names its way back with it).
const filmButtonText = () => t(state.film.phase === 'done' ? GAME_TEXT.updateAfterglow.screenOurLittleFilm : state.film.phase === 'idle' ? GAME_TEXT.updateAfterglow.aLittleFilmOn : GAME_TEXT.updateAfterglow.continueOurLittleFilm);
function filmScreen(message = '', focusId = '', viewIndex = 0) {
  if (!filmAvailable(state)) return;
  if (state.film.phase === 'done') { if (ending.open('screening')) { modalReturnTarget = $('#film-shoot'); if (message) toast(message); } return; }
  const film = state.film, plan = film.result || film.draft;
  const index = Math.max(0, Math.min(2, viewIndex)), id = film.phase === 'shooting' ? plan.order[film.captured.length] : plan.order[index];
  const scroll = modal.open && !!$('#film-view') ? modal.scrollTop : 0;
  const picture = `<figure class="film-picture"><img alt="${tf(plan.framing === 'wide' ? GAME_TEXT.filmScreen.altWide : GAME_TEXT.filmScreen.altClose, { label: t(FILM_SHOTS[id].label) })}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(filmFrameSVG(plan, id))}"><figcaption id="film-caption">${filmCaption(plan, id)}</figcaption></figure>`;
  let content;
  if (film.phase === 'idle') content = `<p>${t(GAME_TEXT.filmScreen.onALaterFictional)}</p><div class="civic-voices"><p>${t(GAME_TEXT.filmScreen.celesteOurPortableProps)}</p><p>${t(GAME_TEXT.filmScreen.rookIllHelpCue)}</p><p>${t(GAME_TEXT.filmScreen.thanhIStillNeed)}</p></div><p>${t(GAME_TEXT.filmScreen.theProductionAcceptsThese)}</p>${button('film-start', t(GAME_TEXT.filmScreen.helpWithTheAgreed), true)}`;
  else if (film.phase === 'planning') content = `<p>${t(GAME_TEXT.filmScreen.makeTheStoryBy)}</p>${[['framing',t(GAME_TEXT.filmScreen.agreeTheFrame),FILM_FRAMING],['plan',t(GAME_TEXT.filmScreen.workAroundTheNeighbors),FILM_PLANS]].map(([key,label,options]) => `<fieldset class="civic-options"><legend>${label}</legend><div class="button-row">${Object.entries(options).map(([value,item]) => `<button id="film-${key}-${value}" class="secondary-button" aria-pressed="${plan[key] === value}">${t(item.label)}</button>`).join('')}</div><p>${t(options[plan[key]].detail)}</p></fieldset>`).join('')}${picture}<h3>${t(GAME_TEXT.filmScreen.yourShotOrder)}</h3><ol class="programme-order">${plan.order.map((shot,i) => `<li><strong>${t(FILM_SHOTS[shot].label)}</strong><div class="button-row"><button id="film-up-${shot}" data-rapid class="secondary-button" aria-label="${tf(GAME_TEXT.filmScreen.moveEarlier, { label: t(FILM_SHOTS[shot].label) })}" ${i===0?'disabled':''}>${t(ORDER.earlier)}</button><button id="film-down-${shot}" data-rapid class="secondary-button" aria-label="${tf(GAME_TEXT.filmScreen.moveLater, { label: t(FILM_SHOTS[shot].label) })}" ${i===2?'disabled':''}>${t(ORDER.later)}</button></div></li>`).join('')}</ol><p>${t(GAME_TEXT.filmScreen.rookStaysOffCamera)}</p>${button('film-roll',t(GAME_TEXT.filmScreen.agreeThisPlanPrepare),true)}`;
  else if (film.phase === 'hold') content = `<p id="film-hold">${t(GAME_TEXT.filmScreen.holdTheTakeNeighbors)}</p><p>${plan.plan === 'later' ? t(GAME_TEXT.filmScreen.rookWaitsUntilThe) : t(GAME_TEXT.filmScreen.rookKeepsTheCrew)}</p><p>${t(GAME_TEXT.filmScreen.thanhThanksForWaiting)}</p>${button('film-clear',t(GAME_TEXT.filmScreen.thanhIsThroughTake),true)}`;
  else if (film.phase === 'shooting') content = `<p><strong>${tf(GAME_TEXT.filmScreen.shotOf3, { captured: film.captured.length+1, label: t(FILM_SHOTS[id].label) })}</strong></p>${picture}<p>${t(FILM_FRAMING[plan.framing].detail)}</p><p>${t(FILM_PLANS[plan.plan].detail)}</p><p>${t(GAME_TEXT.filmScreen.thisCapturesAnAuthored)}</p>${button('film-capture',tf(GAME_TEXT.filmScreen.keepShot, { captured: film.captured.length+1, label: t(FILM_SHOTS[id].label) }),true)}`;
  else content = `<p>${t(GAME_TEXT.filmScreen.theCrewClearsIts)}</p><p><strong>${tf(GAME_TEXT.filmScreen.frameOf3, { index: index+1, label: t(FILM_SHOTS[id].label) })}</strong></p>${picture}<div class="button-row" role="group" aria-label="${t(GAME_TEXT.filmScreen.screeningFrames)}">${plan.order.map((shot,i) => `<button id="film-frame-${i}" class="secondary-button" aria-pressed="${i===index}">${i+1} · ${t(FILM_SHOTS[shot].label)}</button>`).join('')}</div><p id="film-memory">${tf(GAME_TEXT.filmScreen.yourEndingIsThe, { ending: t(GAME_TEXT.filmEndings[plan.order[2]]) })}</p>`;
  show(`<section id="film-view"><span class="eyebrow">${t(GAME_TEXT.filmScreen.theOpenSeatFictional)}</span><h2 id="modal-title" tabindex="-1">${film.phase==='done'?t(GAME_TEXT.filmScreen.ourLittleFilmTogether):film.phase==='hold'?t(GAME_TEXT.filmScreen.aGoodTakeCan):t(GAME_TEXT.filmScreen.aLittleFilmOn)}</h2>${content}<p id="film-message" class="grid-message">${message}</p><div class="button-row">${button('film-back',['idle','done'].includes(film.phase)?t(BACK):t(GAME_TEXT.filmScreen.keepOurPlaceReturn))}</div><p class="footnote">${t(GAME_TEXT.filmScreen.originalFictionalStoryboardProps)}</p></section>`);
  modalReturnTarget = $('#film-shoot');
  const step = (type,extra={}) => () => { act({type,...extra}); filmScreen(); };
  for(const type of ['start','roll','clear'])bind(`film-${type}`,step(`film-${type}`));
  bind('film-capture',()=>{const before=state.film.captured.length;act({type:'film-capture',id});filmScreen(state.film.captured.length===before?t(GAME_TEXT.filmScreen.thisShotIsAlready):state.film.phase==='done'?gdf(FILM_DONE.summary,L(FILM_SHOTS[id].label),3,L(FILM_DONE.complete))+' '+t(FILM_DONE.invitation):tf(GAME_TEXT.filmScreen.shotKeptNextShot, { captured: state.film.captured.length, captured2: state.film.captured.length+1 }));});
  for(const [key,options] of [['framing',FILM_FRAMING],['plan',FILM_PLANS]])for(const [value,item] of Object.entries(options))bind(`film-${key}-${value}`,()=>{act({type:'film-choice',key,value});filmScreen(tf(GAME_TEXT.filmScreen.selected, { label: t(item.label) }),`film-${key}-${value}`);});
  for(const shot of plan.order)for(const [direction,delta] of [['up',-1],['down',1]])bind(`film-${direction}-${shot}`,()=>{act({type:'film-move',id:shot,direction:delta});const pos=state.film.draft.order.indexOf(shot),canRepeat=direction==='up'?pos>0:pos<2;filmScreen(tf(GAME_TEXT.filmScreen.isNowOf3, { label: t(FILM_SHOTS[shot].label), pos: pos+1 }),`film-${canRepeat?direction:direction==='up'?'down':'up'}-${shot}`);});
  for(let i=0;i<3;i++)bind(`film-frame-${i}`,()=>{filmScreen(tf(GAME_TEXT.filmScreen.frameOf32, { value: i+1 }),`film-frame-${i}`,i);});
  bind('film-back',()=>close($('#film-shoot')));
  if(focusId){modal.scrollTop=scroll;const target=document.getElementById(focusId);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});}
  else{modal.scrollTop=0;$('#modal-title').focus({preventScroll:true});}
}
function civicScreen(message = '', focusId = '') {
  if (!civicAvailable(state)) return;
  const c = state.civic, plan = c.result || c.draft;
  const scroll = modal.open && !!$('#civic-view') ? modal.scrollTop : 0;
  let content;
  if (c.phase === 'idle') content = `<p>${t(GAME_TEXT.civicScreen.onALaterFictional)}</p><div class="civic-voices"><p>${t(GAME_TEXT.civicScreen.beaIWantRepairs)}</p><p>${t(GAME_TEXT.civicScreen.thanhIWantPeople)}</p><p>${t(GAME_TEXT.civicScreen.celesteNoOneOwes)}</p><p>${t(GAME_TEXT.civicScreen.dezWeCanDisagree)}</p></div><p>${t(GAME_TEXT.civicScreen.chooseAFocusA)}</p>${button('civic-start', t(GAME_TEXT.civicScreen.helpHostTheListening), true)}`;
  else if (c.phase === 'planning') {
    const groups = [['topic', t(GAME_TEXT.civicScreen.aSharedQuestion), CIVIC_TOPICS], ['format', t(GAME_TEXT.civicScreen.makeRoomForThe), CIVIC_FORMATS], ['notes', t(GAME_TEXT.civicScreen.agreeWhatToKeep), CIVIC_NOTES]];
    content = `<p>${t(GAME_TEXT.civicScreen.chooseWhereThisConversation)}</p>${groups.map(([key, label, options]) => `<fieldset class="civic-options"><legend>${label}</legend><div class="button-row">${Object.entries(options).map(([value, item]) => `<button id="civic-${key}-${value}" class="secondary-button" aria-pressed="${plan[key] === value}">${t(item.label)}</button>`).join('')}</div><p>${t(key === 'topic' ? CIVIC_TOPICS[plan.topic].request : options[plan[key]].detail)}</p></fieldset>`).join('')}<img class="civic-plan" alt="${t(GAME_TEXT.civicScreen.schematicPlanSeatsAnd)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(civicPlanSVG(plan))}"><p class="footnote">${t(GAME_TEXT.civicScreen.originalFictionalEventSetup)}</p>${button('civic-open', t(GAME_TEXT.civicScreen.welcomeTheListeningHour), true)}`;
  } else {
    content = `<p><strong>${t(CIVIC_TOPICS[plan.topic].label)}</strong> · ${t(CIVIC_FORMATS[plan.format].label)} · ${t(CIVIC_NOTES[plan.notes].label)}</p><img class="civic-plan" alt="${t(GAME_TEXT.civicScreen.theAgreedFictionalShared)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(civicPlanSVG(plan))}"><p>${t(CIVIC_FORMATS[plan.format].detail)}</p><div class="civic-voices">${civicConversation(plan).map(v => `<p><strong>${v.name}:</strong> ${v.text}</p>`).join('')}</div><p>${t(CIVIC_NOTES[plan.notes].detail)}</p>${plan.notes === 'themes' ? `<div class="history-entry"><h3>${t(GAME_TEXT.civicScreen.ourSharedRequest)}</h3><p>${t(CIVIC_TOPICS[plan.topic].request)}</p><p>${t(GAME_TEXT.civicScreen.thisAuthoredDraftStays)}</p></div>` : `<p>${t(GAME_TEXT.civicScreen.noSharedRequestNote)}</p>`}${c.phase === 'meeting' ? `<p>${t(GAME_TEXT.civicScreen.theNeighborsHoldThe)}</p>${button('civic-close', t(GAME_TEXT.civicScreen.closeTheListeningHour), true)}` : `<p id="civic-memory">${t(GAME_TEXT.civicScreen.theListeningHourIs)}</p>` + ending.civicOfferHTML()}`;
  }
  show(`<section id="civic-view"><span class="eyebrow">${t(GAME_TEXT.civicScreen.tenantListeningHourFictional)}</span><h2 id="modal-title" tabindex="-1">${c.phase === 'done' ? t(GAME_TEXT.civicScreen.weMadeRoomTo) : c.phase === 'meeting' ? t(GAME_TEXT.civicScreen.aConversationHeldTogether) : t(GAME_TEXT.civicScreen.neighborsStayingAndThriving)}</h2>${content}<p id="civic-message" class="grid-message">${message}</p><div class="button-row">${button('civic-back', ['idle', 'done'].includes(c.phase) ? t(BACK) : t(GAME_TEXT.civicScreen.keepOurPlaceReturn))}</div><p class="footnote">${t(GAME_TEXT.civicScreen.allSpeakersAndDialogue)}</p></section>`);
  modalReturnTarget = $('#civic-hour');
  const step = type => () => { act({ type }); civicScreen(); };
  bind('civic-start', step('civic-start')); bind('civic-open', step('civic-open')); bind('civic-close', step('civic-close'));
  for (const [key, options] of [['topic', CIVIC_TOPICS], ['format', CIVIC_FORMATS], ['notes', CIVIC_NOTES]]) for (const [value, item] of Object.entries(options)) bind(`civic-${key}-${value}`, () => { act({ type: 'civic-choice', key, value }); civicScreen(tf(GAME_TEXT.filmScreen.selected, { label: t(item.label) }), `civic-${key}-${value}`); });
  bind('civic-back', () => close($('#civic-hour'))); ending.bindCivicOffer();
  if (focusId) { modal.scrollTop = scroll; const target = document.getElementById(focusId); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' }); }
  else { modal.scrollTop = 0; $('#modal-title').focus({ preventScroll: true }); }
}
function hostingScreen(message = '', focusId = '') {
  if (!state.opened) return;
  const host = state.hosting, id = currentActivity(host), draft = host.draft;
  if (!host.order.length) {
    if (programmeIssue(state.programme.published)) return programmeEditor();
    show(`<span class="eyebrow">${t(GAME_TEXT.hostingScreen.aSecondAfternoonFictional)}</span><h2 id="modal-title">${t(GAME_TEXT.hostingScreen.letsBringTheProgramme)}</h2><p>${t(GAME_TEXT.hostingScreen.beaHasTheInvitations)}</p><ol>${state.programme.published.map(key => `<li>${t(segment(key).name)} · ${t(segment(key).owner)}</li>`).join('')}</ol><p>${t(GAME_TEXT.hostingScreen.youDecideWhenTo)}</p><p class="footnote">${t(GAME_TEXT.hostingScreen.startingKeepsACopy)}</p><div class="button-row">${button('host-begin', `${t(GAME_TEXT.hostingScreen.beginOurSecondAfternoon)} ↗`, true)}${button('host-close', t(GAME_TEXT.hostingScreen.anotherTime))}</div>`);
    modalReturnTarget = $('#host-afternoon');
    $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true });
    bind('host-begin', () => { stopWalk(); act({ type: 'host-start' }); hostingScreen(t(GAME_TEXT.hostingScreen.theNeighborsAreHere)); });
    bind('host-close', () => close($('#host-afternoon'))); return;
  }
  // All four hosted: there is no current activity, and the review is the ending's hosted view, which opens exactly then.
  if (!id) { if (ending.open('hosted')) { modalReturnTarget = $('#host-afternoon'); if (message) toast(message); } return; }
  const previousScroll = $('#hosting-order') ? modal.scrollTop : 0;
  let activity = '';
  if (id === 'stories') activity = `<p>${esc(invitationHubText(draft.story))}</p><img class="host-art" alt="${tf(GAME_TEXT.hostingScreen.originalFoldedPaperInvitation, { story: esc(t(STORY_CHOICES[draft.story])) })}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(invitationSVG(draft.story))}"><div class="host-choices">${Object.entries(STORY_CHOICES).map(([key, label]) => `<button id="host-story-${key}" class="secondary-button" aria-pressed="${draft.story === key}">${t(label)}</button>`).join('')}</div>`;
  const BEATS = HOSTING_FORK_TEXT.beats;
  if (id === 'beats') activity = `<p>${esc(t(BEATS.intro))}</p><div class="host-beats" aria-label="${t(GAME_TEXT.hostingScreen.eightStepVisualRhythm)}">${Array.from({ length: 8 }, (_, i) => `<button id="host-beat-${i}" aria-label="${tf(draft.pattern & 1 << i ? GAME_TEXT.hostingScreen.stepTap : GAME_TEXT.hostingScreen.stepRest, { step: i + 1 })}" aria-pressed="${!!(draft.pattern & 1 << i)}">${i + 1}<small>${draft.pattern & 1 << i ? t(GAME_TEXT.hostingScreen.tap) : 'rest'}</small></button>`).join('')}</div><p>${esc(t(BEATS.tail))} ${esc(t(draft.pattern ? BEATS.traced : BEATS.quiet))}</p>${button('host-rhythm', esc(rhythm.entryLabel()).replace(/\n/g, '<br>'))}`;
  if (id === 'art') activity = `<p>${t(GAME_TEXT.hostingScreen.celesteBringsSixPrepared)}</p><img class="host-art" alt="${t(GAME_TEXT.hostingScreen.yourOriginalSixTile)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(tilePanelSVG(draft))}"><div class="host-tiles" aria-label="${t(GAME_TEXT.hostingScreen.sixTilesLeftTo)}">${draft.tiles.map((tile, i) => `<button id="host-tile-${i}" data-rapid aria-label="${tf(GAME_TEXT.hostingScreen.tileShapes[tile], { tile: i + 1 })}" class="secondary-button">${i + 1} · ${[t('Circle'), t('Wave'), t(GAME_TEXT.hostingScreen.triangle)][tile]}</button>`).join('')}</div><div class="host-choices">${['warm', 'cool'].map(key => `<button id="host-palette-${key}" class="secondary-button" aria-pressed="${draft.palette === key}">${t(key === 'warm' ? GAME_TEXT.hostingScreen.warmPalette : GAME_TEXT.hostingScreen.coolPalette)}</button>`).join('')}</div>`;
  if (id === 'pause') activity = `<p>${esc(quietHubText(draft.quiet))}</p><div class="host-choices">${Object.entries(QUIET_CHOICES).map(([key, label]) => `<button id="host-quiet-${key}" class="secondary-button" aria-pressed="${draft.quiet === key}">${t(label)}</button>`).join('')}</div>`;
  show(`<span class="eyebrow">${tf(GAME_TEXT.hostingScreen.ourSecondAfternoonOf, { results: host.results.length + 1 })}</span><h2 id="modal-title">${t(segment(id).name)} · ${t(segment(id).owner)}</h2><ol id="hosting-order">${host.order.map((key, i) => `<li ${i === host.results.length ? 'aria-current="step"' : ''}>${i < host.results.length ? '✓ ' : ''}${t(segment(key).name)}</li>`).join('')}</ol>${message ? `<p class="grid-message">${message}</p>` : ''}${activity}<div class="button-row">${button('host-complete', gdFormat(HUB_LABELS.programmeHost, host.results.length), true)}${button('host-close', t(GAME_TEXT.hostingScreen.saveExploreTheBlock))}</div>${host.results.length ? `<details class="host-memories"><summary>${t(GAME_TEXT.hostingScreen.whatWeShared)}</summary><ol>${host.results.map(result => `<li>${esc(hostedDetail(state, result.id).split('\n').at(-1))}</li>`).join('')}</ol></details>` : ''}<p class="footnote">${t(GAME_TEXT.hostingScreen.thisGatheringKeepsThe)}</p>`);
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
    hostingScreen(state.hosting.results.length > previousCount ? hostedCompletion(state, id) : t(GAME_TEXT.hostingScreen.thisPartIsAlready));
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
  show(`<span class="eyebrow">${t(GAME_TEXT.programmeEditor.aNeighborLedProject)}</span><h2 id="modal-title">${t(GAME_TEXT.programmeEditor.makeRoomForNext)}</h2><p>${t(GAME_TEXT.programmeEditor.beaAndDezWant)}</p><div class="programme-proposals">${SEGMENTS.map(item => `<article><h3>${t(item.name)} · ${t(item.owner)}</h3><p>${t(item.pitch)}</p>${button(`programme-add-${item.id}`, order.includes(item.id) ? tf(GAME_TEXT.programmeEditor.added, { name: t(item.name) }) : tf(GAME_TEXT.programmeEditor.add, { name: t(item.name) }), false, order.includes(item.id))}</article>`).join('')}</div><h3 id="programme-order-heading" tabindex="-1">${t(GAME_TEXT.programmeEditor.yourRunningOrder)}</h3><ol id="programme-order" class="programme-order">${order.map((id, i) => `<li><strong>${t(segment(id).name)}</strong><div class="button-row"><button id="programme-up-${id}" data-rapid class="secondary-button" aria-label="${tf(GAME_TEXT.programmeEditor.moveEarlier, { name: t(segment(id).name) })}" ${i === 0 ? 'disabled' : ''}>${t(ORDER.earlier)}</button><button id="programme-down-${id}" data-rapid class="secondary-button" aria-label="${tf(GAME_TEXT.programmeEditor.moveLater, { name: t(segment(id).name) })}" ${i === order.length - 1 ? 'disabled' : ''}>${t(ORDER.later)}</button><button id="programme-remove-${id}" class="secondary-button" aria-label="${tf(GAME_TEXT.programmeEditor.remove, { name: t(segment(id).name) })}">${t('Remove')}</button></div></li>`).join('')}</ol>${!order.length ? `<p>${t(GAME_TEXT.programmeEditor.chooseAProposalAbove)}</p>` : ''}<p id="programme-message" class="grid-message">${[message, issue || (same ? t(GAME_TEXT.programmeEditor.yourPostedProgrammeMatches) : t(GAME_TEXT.programmeEditor.everyoneHasAPlace))].filter(Boolean).join(' ')}</p><p class="footnote">${t(GAME_TEXT.programmeEditor.aRhythmWorkshopBefore)}</p><div class="button-row">${button('programme-publish', published.length ? `${t(GAME_TEXT.programmeEditor.postThisRevision)} ↗` : `${t(GAME_TEXT.programmeEditor.postOurProgramme)} ↗`, true, !!issue || same)}${published.length ? button('programme-view', t(GAME_TEXT.programmeEditor.seeThePostedProgramme)) : ''}${button('programme-close', t(GAME_TEXT.programmeEditor.keepThisDraftReturn))}</div>${published.length ? `<p>${tf(GAME_TEXT.programmeEditor.posted, { published: programmeTitle(published) })} ${same ? t(GAME_TEXT.programmeEditor.theDraftMatches) : t(GAME_TEXT.programmeEditor.youHaveAnUnposted)}</p>` : `<p>${t(GAME_TEXT.programmeEditor.noProgrammeIsPosted)}</p>`}`);
  modalReturnTarget = $('#next-afternoon');
  for (const item of SEGMENTS) {
    bind(`programme-add-${item.id}`, () => { act({ type: 'programme-add', id: item.id }); programmeEditor(tf(GAME_TEXT.programmeEditor.addedNotice, { name: t(item.name) }), `programme-remove-${item.id}`); });
    bind(`programme-remove-${item.id}`, () => { act({ type: 'programme-remove', id: item.id }); programmeEditor(tf(GAME_TEXT.programmeEditor.removedFromTheDraft, { name: t(item.name) }), `programme-add-${item.id}`); });
    for (const [direction, delta] of [['up', -1], ['down', 1]]) bind(`programme-${direction}-${item.id}`, () => {
      act({ type: 'programme-move', id: item.id, direction: delta });
      const index = state.programme.order.indexOf(item.id), canRepeat = direction === 'up' ? index > 0 : index < state.programme.order.length - 1;
      programmeEditor(tf(GAME_TEXT.programmeEditor.isNowOf, { name: t(item.name), index: index + 1, order: state.programme.order.length }), `programme-${canRepeat ? direction : direction === 'up' ? 'down' : 'up'}-${item.id}`);
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
  show(`<span class="eyebrow">${t(GAME_TEXT.programmePoster.ourPostedProgrammeFictional)}</span><h2 id="modal-title">${programmeTitle(published)}</h2><img class="programme-poster" alt="${t(GAME_TEXT.programmePoster.originalProgrammePosterThe)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><ol id="posted-programme">${published.map(id => `<li>${tf(GAME_TEXT.programmePoster.proposedBy, { name: t(segment(id).name), owner: t(segment(id).owner) })}</li>`).join('')}</ol><p>${t(GAME_TEXT.programmePoster.noRealFestivalDate)} ${state.hosting.order.length ? t(GAME_TEXT.programmePoster.thisIsAFuture) : t(GAME_TEXT.programmePoster.thisPosterIsReady)} ${t(GAME_TEXT.programmePoster.yourOptionalSoundtrackRemains)}</p>${postedGatherLine(state) ? `<p id="posted-gather">${esc(postedGatherLine(state))}</p>` : ''}<div class="programme-response"><h3>${t(GAME_TEXT.programmePoster.theNeighborsAnswer)}</h3>${['bea', 'dez', 'celeste', 'thanh'].map(id => `<p><strong>${t(NEIGHBORS.find(n => n.id === id).name)}:</strong> ${programmeResponse(id, published)}</p>`).join('')}</div><p>${JSON.stringify(order) === JSON.stringify(published) ? t(GAME_TEXT.programmePoster.yourDraftMatchesThis) : t(GAME_TEXT.programmePoster.youHaveAnUnposted)}</p><div class="button-row">${button('programme-edit', t(GAME_TEXT.programmePoster.reviseTheRunningOrder), true)}${state.hosting.results.length === 4 ? button('programme-gather', ending.gatherLabel(), false, !!programmeIssue(published) && !ending.snapshot().visit.gather.order.length) : ''}${button('programme-host', state.hosting.order.length ? t(GAME_TEXT.programmePoster.visitOurSecondGathering) : t(GAME_TEXT.programmePoster.hostTheProgramme))}${button('programme-poster-close', t(BACK))}</div><p class="footnote">${t(GAME_TEXT.programmePoster.originalAbstractArtNo)}</p>`);
  bind('programme-edit', () => programmeEditor('', 'programme-order-heading'));
  bind('programme-host', () => hostingScreen()); bind('programme-gather', () => { if (ending.open('gather')) modalReturnTarget = $('#host-afternoon'); });
  modalReturnTarget = $('#next-afternoon');
  $('#modal-title').setAttribute('tabindex', '-1'); $('#modal-title').focus({ preventScroll: true });
  bind('programme-poster-close', () => close($('#next-afternoon')));
}
function showGatheringPlan() {
  const scene = gatheringScene(state), svg = gatheringPlanSVG(scene);
  const previousTool = activeTool, editorMessage = body.querySelector('.grid-message')?.textContent, gridScroll = body.querySelector('.placement-scroll')?.scrollLeft || 0;
  show(`<span class="eyebrow">${t(GAME_TEXT.showGatheringPlan.theSpaceYouMade)}</span><h2 id="modal-title">${scene.title}</h2><p>${scene.caption}</p><img class="gathering-plan" alt="${t(GAME_TEXT.showGatheringPlan.currentGatheringPlanThe)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><p class="plan-route">${t(GAME_TEXT.showGatheringPlan.throughRouteTheStriped)}</p><ul class="plan-supplies">${scene.items.map(item => `<li>${tf(GAME_TEXT.showGatheringPlan.supplyCells, { label: item.label, cells: list(item.cells.map(p => tf(GAME_TEXT.showGatheringPlan.columnRow, { col: p.col + 1, row: p.row + 1 })), cells => cells.join(' and ')) })}</li>`).join('') || (scene.phase === 'packing' ? `<li>${t(GAME_TEXT.showGatheringPlan.noTableSeatsOr)}</li>` : `<li>${t(GAME_TEXT.showGatheringPlan.noSuppliesPlacedYet)}</li>`)}</ul><p class="footnote">${state.hosting.order.length ? `${t(GAME_TEXT.showGatheringPlan.yourOpeningChapterSupply)} ` : ""}${t(GAME_TEXT.showGatheringPlan.schematic)} ${t(GAME_TEXT.showGatheringPlan.visitors[scene.phase === 'open' ? scene.layout === 'table' ? 'table' : 'floor' : scene.phase === 'packing' ? 'packing' : 'waiting'])} ${t(GAME_TEXT.showGatheringPlan.soundOff)}</p><div class="button-row">${button('gathering-plan-close', state.opened ? t(BACK) : t(GAME_TEXT.showGatheringPlan.backToArranging), true)}</div>`);
  bind('gathering-plan-close', () => {
    if (state.opened) return close();
    activeTool = previousTool; layoutEditor(editorMessage || t(GAME_TEXT.showGatheringPlan.chooseASupplyThen), gridScroll);
    $('#preview-layout').focus({ preventScroll: true });
  });
}
function photoConsent() {
  if (!state.opened || state.epilogue.packing) return;
  if (state.epilogue.photo.status === 'taken') return viewKeepsake();
  show(`<span class="eyebrow">${t(GAME_TEXT.photoConsent.anOptionalKeepsake)}</span><h2 id="modal-title">${t(GAME_TEXT.photoConsent.askBeforeThePicture)}</h2><p>${t(GAME_TEXT.photoConsent.oneIllustratedMemoryOf)}</p><div class="consent-list">${PHOTO_RESPONSES.map(person => person.agrees ? `<label class="consent-row"><input type="checkbox" id="photo-${person.id}" value="${person.id}" checked><span><strong>${t(person.name)}</strong><small>${t(person.response)}</small></span></label>` : `<div class="consent-row declined"><span class="consent-decline">—</span><span><strong>${tf(GAME_TEXT.photoConsent.notPictured, { name: t(person.name) })}</strong><small>${t(person.response)}</small></span></div>`).join('')}</div><p class="footnote">${t(GAME_TEXT.photoConsent.thisCreatesOriginalArtwork)}</p><p id="photo-message" role="status"></p><div class="button-row">${button('take-keepsake', `${t(GAME_TEXT.photoConsent.makeThisKeepsake)} ↗`, true)}${button('skip-keepsake', t(GAME_TEXT.photoConsent.keepItAsA))}${button('photo-later', t(GAME_TEXT.photoConsent.decideLater))}</div>`);
  bind('take-keepsake', () => {
    const participants = PHOTO_GUESTS.filter(id => $(`#photo-${id}`).checked);
    if (!participants.length) { $('#photo-message').textContent = t(GAME_TEXT.photoConsent.chooseAtLeastOne); return; }
    act({ type: 'photo', participants, layout: photoLayout() }); viewKeepsake();
  });
  bind('skip-keepsake', () => { const done = act({ type: 'skip-photo' }) && state.epilogue.photo.status === 'skipped'; close(); if (done) toast(t(GAME_TEXT.photoConsent.anAfternoonCanBe)); });
  bind('photo-later', close);
}
function viewKeepsake() {
  const photo = state.epilogue.photo, svg = postcardSVG(photo);
  if (!svg) return;
  const names = PHOTO_GUESTS.filter(id => photo.participants.includes(id)).map(id => t(NEIGHBORS.find(n => n.id === id).name)).join(', ');
  const data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  show(`<span class="eyebrow">${t(GAME_TEXT.viewKeepsake.yourAfternoonKept)}</span><h2 id="modal-title">${t(GAME_TEXT.viewKeepsake.aLittleRoomTo)}</h2><img class="keepsake-image" src="${data}" alt="${tf(GAME_TEXT.viewKeepsake.originalIllustratedKeepsakeWith, { names, layout: L(GATHERING_LAYOUT_TITLES[photo.layout === 'table' ? 'table' : 'floor']) })}"><p>${tf(photo.participants.length === 1 ? GAME_TEXT.viewKeepsake.saidYes : GAME_TEXT.viewKeepsake.allSaidYes, { names })}</p><p class="footnote">${t(GAME_TEXT.viewKeepsake.thisIsOriginalArtwork)}</p><div class="button-row"><a id="download-keepsake" class="primary-button download-link" href="${data}" download="tenderloin-redux-afternoon.svg">${t(GAME_TEXT.viewKeepsake.saveTheIllustration)} ↗</a>${button('keepsake-close', t(BACK))}</div>`);
  bind('keepsake-close', close);
}
function packingChoice() {
  if (!state.opened || state.epilogue.packing) return;
  show(`<span class="eyebrow">${t(GAME_TEXT.packingChoice.wheneverYoureReady)}</span><h2 id="modal-title">${t(GAME_TEXT.packingChoice.anAfternoonWindsDown)}</h2><p>${t(GAME_TEXT.packingChoice.illFoldTheSeats)}</p><p>${t(GAME_TEXT.packingChoice.youCanStillExplore)} ${state.epilogue.photo.status === 'taken' ? t(GAME_TEXT.packingChoice.yourIllustratedKeepsakeIs) : t(GAME_TEXT.packingChoice.ifYouWantAn)}</p><div class="button-row">${button('confirm-pack', `${t(GAME_TEXT.packingChoice.letsPackUpTogether)} ↗`, true)}${button('pack-later', t(GAME_TEXT.packingChoice.stayALittleLonger))}</div>`);
  bind('confirm-pack', () => { const done = act({ type: 'pack' }) && state.epilogue.packing; close(); if (done) toast(t(GAME_TEXT.packingChoice.beaFoldsTheSeats)); }); bind('pack-later', close);
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
  if (bubble && !modal.open) routeSay(tf(GAME_TEXT.speech.line, { name: t(neighborById(id)?.name ?? ''), text }), bubble.timer);
}
// The side stories' speakers (host.speak): the same bubble at a visits anchor (a surprise, an eatery counter, the museum docent).
function speak(id, line, name = '') {
  const text = spokenText(line);
  bubble = showBubble(id, text);
  if (bubble && !modal.open) routeSay(name ? tf(GAME_TEXT.speech.line, { name, text }) : text, bubble.timer);
}
// custom is Godot's last_panel_dialogue (a What's Next? line, a loan reply or refusal); announce is the a11y line.
function conversation(id, { custom = '', announce = '', speak = true } = {}) {
  const n = neighborById(id);
  if (!n) return;
  const narrow = isNarrow(innerWidth), m = musicView(), goal = nextObjective(state, storyWorld());
  const view = conversationView(state, talkExtras(), talks, id, goal, { narrow, music: m, custom });
  const label = text => narrow ? narrowLabel(t(text), text) : t(text);
  const listed = view.actions.map(a => ({ ...a, dom: actionDom(a), pressed: a.id === 'layout_table' ? state.layout === 'table' : a.id === 'layout_floor' ? state.layout === 'floor' : null }));
  // Bea holds the layout until the block opens, so its choice stays in her conversation (Godot keeps it in the block hub).
  if (id === 'bea' && !state.opened && !listed.some(a => a.id === 'layout_table')) for (const [aid, text, value] of [['layout_table', ACTION_LABELS.layoutTable, 'table'], ['layout_floor', ACTION_LABELS.layoutFloor, 'floor']]) listed.push({ id: aid, label: label(text), dom: ACTION_DOM[aid], pressed: state.layout === value });
  // Celeste's easel panel opens the mural (Godot's two-line Compose Mural button).
  if (id === 'celeste') listed.push({ id: 'compose', label: t(BUTTON_TEXT.compose), dom: 'start-mural', pressed: null });
  const actions = uniqueById(listed);
  // Rook's panel in Godot's order, Load Local Track after the soundcheck; rookButtons marks Volume rapid, as Godot does.
  const controls = id === 'rook'
    ? view.music.flatMap(b => [{ ...b, dom: b.id === 'soundcheck' ? 'soundcheck' : `talk-${b.id}` }, ...b.id === 'soundcheck' ? [{ id: 'load', label: t(BUTTON_TEXT.load), dom: 'talk-load', rapid: false }] : []])
    : view.buttons.map(b => ({ ...b, dom: `talk-${b.id}` }));
  const detail = id === 'rook' ? rookMusicDetail(state, view.detail, m) : view.detail;
  // A two-line Godot label keeps its line break; its accessible name reads it as one line, as the Rhythm Circle entry's does.
  const actionHTML = actions.map((a, i) => `<button id="${a.dom}" class="${i === 0 ? 'primary-button' : 'secondary-button'}"${a.pressed === null ? '' : ` aria-pressed="${a.pressed}"`}${a.label.includes('\n') ? ` aria-label="${esc(a.label.replace(/\n/g, ' '))}"` : ''}>${esc(a.label).replace(/\n/g, '<br>')}</button>`).join('');
  const controlHTML = controls.map(b => `<button id="${b.dom}" class="secondary-button"${b.rapid ? ' data-rapid' : ''}>${esc(b.label)}</button>`).join('');
  show(`<section class="conversation" data-conversation="${id}" style="--talk-border:${view.border}"><div class="character-heading"><span class="portrait" style="background:${n.coat}55" aria-hidden="true">${n.name[0]}</span><div><h2 id="modal-title">${t(n.name)}</h2><span class="eyebrow">${esc(t(n.role).toUpperCase())}</span></div></div><p class="talk-badge">${esc(view.badge)}</p><p id="talk-header" class="talk-header">${esc(view.header)}</p><p id="talk-line" class="talk-line">${esc(detail)}</p>${actionHTML ? `<div class="button-row talk-actions" role="group" aria-label="${tf(GAME_TEXT.conversation.thingsToDoWith, { name: t(n.name) })}">${actionHTML}</div>` : ''}<div class="button-row talk-controls" role="group" aria-label="${id === 'rook' ? t(GAME_TEXT.conversation.musicAndConversation) : t(GAME_TEXT.conversation.conversation)}">${controlHTML}</div></section>`);
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
  toast(count === LOANS.length ? t(LOAN_COMPLETION_NOTICE) + loanReply(id) : loanReturnAnnouncement(id, count));
  say(partner, loanReply(id));
}
// Bea's conversation carries the layout choice until the block opens.
function layoutChoice() { conversation('bea'); }
function layoutEditor(message = null, scrollLeft = null) {
  if (!state.layout || state.opened) return layoutChoice();
  if (message === null) { activeTool = FURNITURE.find(id => !state.furniture[id]) || activeTool; message = t(GAME_TEXT.layoutEditor.chooseASupplyThen); }
  const cells = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) {
    const item = Object.entries(state.furniture).find(([id, pos]) => occupiedCells(id, pos, state.layout).some(cell => cell.row === row && cell.col === col));
    const route = row === 2;
    cells.push(`<button id="cell-${col}-${row}" class="grid-cell ${route ? 'route' : ''} ${item ? `occupied ${item[0]}` : ''}" data-col="${col}" data-row="${row}" aria-label="${tf(GAME_TEXT.layoutEditor.cell[route ? 'route' : item ? item[0] : 'empty'], { col: col + 1, row: row + 1 })}" ${state.opened ? 'disabled' : ''}>${route ? (col === 0 ? '→' : col === 7 ? '→' : '·') : item ? ({ table: t(GAME_TEXT.layoutEditor.table), seats: t('Seats'), speaker: t('Sound') }[item[0]]) : '+'}</button>`);
  }
  const scrolled = scrollLeft ?? body.querySelector('.placement-scroll')?.scrollLeft ?? 0;
  show(`<span class="eyebrow">${t(GAME_TEXT.layoutEditor.makeRoomForEveryone)}</span><h2 id="modal-title">${state.layout === 'table' ? t(GAME_TEXT.layoutEditor.theLongTable) : t(GAME_TEXT.layoutEditor.anOpenFloor)}</h2><p>${t(GAME_TEXT.layoutEditor.arrangeTheBorrowedSupplies)}</p><div class="tool-picker">${FURNITURE.map(id => `<button id="tool-${id}" aria-pressed="${activeTool === id}">${({ table: `▰ ${t(GAME_TEXT.layoutEditor.table)}`, seats: `▥ ${t('Seats')}`, speaker: `▣ ${t(GAME_TEXT.layoutEditor.speaker)}` }[id])}${state.furniture[id] ? ' ✓' : ''}</button>`).join('')}</div><div class="placement-scroll"><div class="placement-grid" aria-label="${t(GAME_TEXT.layoutEditor.gatheringArrangement8Columns)}">${cells.join('')}</div></div><p id="grid-scroll-hint" class="grid-scroll-hint" hidden>${t(GAME_TEXT.layoutEditor.swipeOrScrollThe)}</p><div class="grid-legend"><i></i> ${t(GAME_TEXT.layoutEditor.clearRouteSuppliesNeed)}</div><p class="grid-message" role="status">${message}</p><div class="button-row">${button('change-plan', t(GAME_TEXT.layoutEditor.hearBothIdeasAgain))}${button('preview-layout', `${t(GAME_TEXT.layoutEditor.previewYourArrangement)} ↗`)}${button('layout-done', arranged(state) ? `${t(GAME_TEXT.layoutEditor.looksGoodBackTo)} ↗` : `${t(GAME_TEXT.layoutEditor.keepThisArrangement)} ↗`, true)}</div><p class="footnote">${t(GAME_TEXT.layoutEditor.theGridIsA)}</p>`);
  // Where the eight columns do not fit, a line says the grid scrolls and the hidden side fades (mobile scrollbars stay hidden).
  const box = body.querySelector('.placement-scroll'), edges = () => {
    const more = box.scrollWidth - box.clientWidth;
    box.classList.toggle('more-left', more > 1 && box.scrollLeft > 1); box.classList.toggle('more-right', more > 1 && box.scrollLeft < more - 1); $('#grid-scroll-hint').hidden = more <= 1;
  };
  box.scrollLeft = scrolled; box.addEventListener('scroll', edges, { passive: true }); edges();
  for (const id of FURNITURE) bind(`tool-${id}`, () => { activeTool = id; layoutEditor(t(GAME_TEXT.layoutEditor.placing[id])); });
  body.querySelectorAll('.grid-cell').forEach(cell => cell.addEventListener('click', () => {
    const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
    if (!canPlaceFurniture(state, activeTool, col, row)) { layoutEditor(t(GAME_TEXT.layoutEditor.thatSpotWouldOverlap)); return; }
    act({ type: 'furniture', id: activeTool, col, row });
    const next = FURNITURE.find(id => !state.furniture[id]); if (next) activeTool = next;
    layoutEditor(arranged(state) ? `✓ ${t(GAME_TEXT.layoutEditor.everyoneHasRoomAnd)}` : t(GAME_TEXT.layoutEditor.thatFitsPlaceThe));
  }));
  bind('change-plan', layoutChoice); bind('layout-done', close);
  bind('preview-layout', showGatheringPlan);
}
function muralEditor(message = null) {
  if (message === null) { activeMotif = MOTIFS.find(id => !state.mural[id]) || activeMotif; message = t(GAME_TEXT.muralEditor.chooseANeighborsIdea); }
  const cells = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const item = Object.entries(state.mural).find(([, p]) => p.col === col && p.row === row);
    cells.push(`<button id="mcell-${col}-${row}" class="grid-cell" data-col="${col}" data-row="${row}" style="color:${item ? PALETTE_COLORS[state.palette][MOTIFS.indexOf(item[0])] : '#b79e77'}" aria-label="${tf(GAME_TEXT.muralEditor.cell[item ? item[0] : 'empty'], { col: col + 1, row: row + 1 })}">${item ? SIGNS[item[0]] : '·'}</button>`);
  }
  const labels = { sun: t(GAME_TEXT.muralEditor.lulusSun), wave: t(GAME_TEXT.muralEditor.dezsRhythm), rise: t(GAME_TEXT.muralEditor.celestesLetters) };
  show(`<span class="eyebrow">${t(GAME_TEXT.muralEditor.artWithTheNeighbors)}</span><h2 id="modal-title">${t(GAME_TEXT.muralEditor.manyHandsOneMural)}</h2><p>${t(GAME_TEXT.muralEditor.luluBroughtASun)}</p><div class="tool-picker">${MOTIFS.map(id => `<button id="motif-${id}" aria-pressed="${activeMotif === id}">${labels[id]}${state.mural[id] ? ' ✓' : ''}</button>`).join('')}</div><div class="placement-grid mural-grid" aria-label="${t(GAME_TEXT.muralEditor.portableMuralPanel6)}">${cells.join('')}</div><div class="palette">${t('Palette')} ${PALETTES.map(id => `<button id="palette-${id}" data-rapid class="swatch ${state.palette === id ? 'selected' : ''}" style="background:${PALETTE_COLORS[id][0]}" aria-label="${t(GAME_TEXT.muralEditor.paletteNames[id])}" aria-pressed="${state.palette === id}"></button>`).join('')}</div><p class="grid-message" role="status">${message}</p><div class="button-row">${button('mural-done', progress(state).mural ? `${t(GAME_TEXT.muralEditor.ourPanelIsReady)} ↗` : `${t(GAME_TEXT.muralEditor.keepWorkingLater)} ↗`, true)}${button('mural-scenes', ending.paintScenesLabel())}</div><p class="footnote">${t(GAME_TEXT.muralEditor.originalMotifsOnA)}</p>`);
  MOTIFS.forEach(id => bind(`motif-${id}`, () => { activeMotif = id; muralEditor(t(GAME_TEXT.muralEditor.place[id])); }));
  PALETTES.forEach(id => bind(`palette-${id}`, () => { act({ type: 'palette', value: id }); muralEditor(t(GAME_TEXT.muralEditor.aNewPaletteThe)); }));
  body.querySelectorAll('.grid-cell').forEach(cell => cell.addEventListener('click', () => {
    const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
    if (Object.entries(state.mural).some(([id, p]) => id !== activeMotif && p.col === col && p.row === row)) { muralEditor(t(GAME_TEXT.muralEditor.anotherNeighborsIdeaIs)); return; }
    act({ type: 'mural', id: activeMotif, col, row }); const next = MOTIFS.find(id => !state.mural[id]); if (next) activeMotif = next;
    muralEditor(progress(state).mural ? `✓ ${t(GAME_TEXT.muralEditor.theWholeNeighborhoodHas)}` : t(GAME_TEXT.muralEditor.thatLooksGoodAdd));
  })); bind('mural-done', close); bind('mural-scenes', () => ending.open('stories'));
}
function tidy(item) {
  if (state.litter.includes(item.id)) return;
  show(`<span class="eyebrow">${t(GAME_TEXT.tidy.aLittleTidying)}</span><h2 id="modal-title">${t(item.label)}</h2><p>${t(GAME_TEXT.tidy.beaPointedOutThis)}</p><div class="button-row">${button('collect-litter', `${t(GAME_TEXT.tidy.pickItUp)} ↗`, true)}${button('leave-litter', t(GAME_TEXT.tidy.comeBackLater))}</div><p class="footnote">${t(GAME_TEXT.tidy.onlyTheThreeMarked)}</p>`);
  bind('collect-litter', () => { const done = act({ type: 'tidy', id: item.id }); close(); if (done) toast(state.litter.length === LITTER.length ? t(GAME_TEXT.tidy.aLittleTidierBea) : t(GAME_TEXT.tidy.oneSmallThingTaken)); }); bind('leave-litter', close);
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
// trigger_feel_good_burst's banner half, laid out at once as Godot does; hold is the 10/10 finale's 4.5 s.
function burst(spec, hold = 0) {
  if (!spec) return;
  banner.trigger(spec);
  if (hold) banner.hold(hold);
  drawBanner(banner.layout(bannerEnv()) ? banner.view() : { visible: false });
}
const bannerReduced = () => settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
// layout_reward_banner's inputs: a focused activity (any open dialog), the overview, and room for the banner.
function bannerEnv() {
  const focused = modal.open, overview = !!world?.camera.overviewMode;
  return { focused, overview, fits: !focused && !overview && banner.pending() && placeBanner() };
}
const inPanel = (el, o) => { const r = el.getBoundingClientRect(); return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }; };
const drawn = el => !!el && !el.hidden && el.getClientRects().length > 0;
// play_area_rect and fit_overlay_around_player in the map panel's px: the map 8 px in, below its top controls (the label, the
// camera controls, the compass) and above the prompt and the bottom bar. The banner keeps clear of the player, as in Godot, and
// of a toast on show (2D's notices sit on the map). Where no place clears the player (a phone's short map, whose camera keeps the
// player in the middle), it may cover the player rather than wait for good. No room at all: it waits, its reading time kept.
function placeBanner() {
  if (!world) return false;
  const v = banner.view(), panel = bannerEl.parentElement, p = panel.getBoundingClientRect(), o = { left: p.left + panel.clientLeft, top: p.top + panel.clientTop };
  const map = inPanel(canvas, o), edge = rect => rect.y + rect.h;
  const top = Math.max(map.y, ...['.map-topline', '.camera-controls', '.map-compass'].map(s => $(s)).filter(drawn).map(el => edge(inPanel(el, o)))) + 8;
  const bottom = Math.min(map.y + map.h, ...['#world-prompt', '.map-bottom'].map(s => $(s)).filter(drawn).map(el => inPanel(el, o).y)) - 8;
  const area = { x: map.x + 8, y: top, w: Math.max(map.w - 16, 1), h: Math.max(bottom - top, 1) }, w = bannerRect(area, 0).w, key = `${w}|${v.title}|${v.detail}`;
  if (bannerMeasure.key !== key) {
    bannerEl.style.width = `${w}px`; $('#reward-title').textContent = v.title; $('#reward-body').textContent = v.detail;
    const was = bannerEl.hidden; bannerEl.style.visibility = 'hidden'; bannerEl.hidden = false;
    bannerMeasure = { key, h: bannerEl.offsetHeight };
    bannerEl.hidden = was; bannerEl.style.visibility = '';
  }
  const s = world.scale, k = Math.max(1, s), off = world.offset, pl = state.player, toastEl = $('#toast');
  const player = { x: map.x + off.x + pl.x * s - 12 * k, y: map.y + off.y + pl.y * s - 34 * k, w: 24 * k, h: 40 * k };
  const wanted = bannerRect(area, bannerMeasure.h), toastBox = toastEl.classList.contains('show') ? inPanel(toastEl, o) : null;
  const fitted = fitAround(wanted, area, player, toastBox) ?? fitAround(wanted, area, null, toastBox);
  bannerBox = fitted && { ...fitted, mapX: map.x, mapY: map.y };
  if (fitted) { bannerEl.style.left = `${fitted.x}px`; bannerEl.style.top = `${fitted.y}px`; }
  return !!fitted;
}
function drawBanner(v) {
  if (bannerEl.hidden !== !v.visible) bannerEl.hidden = !v.visible;
  if (!v.visible) { bannerBox = null; return; }
  bannerEl.style.borderColor = v.border; bannerEl.style.opacity = String(v.opacity);
}
// update_celebration_burst, one frame on the frame clock (real seconds, as Godot's delta). A frame after a hidden tab's pause
// spends at most a quarter second, so a waiting banner is still read. A fault resets the banner: it never reaches renderFrame.
function stepBanner(dt) {
  if (!bannerEl || (!banner.pending() && bannerEl.hidden)) { bannerBox = null; return; }
  try { drawBanner(banner.step(Math.min(dt, 0.25), bannerEnv(), bannerReduced())); }
  catch { banner.reset(); bannerBox = null; bannerEl.hidden = true; }
}
// The banner's rect on the canvas, for the speech bubble to keep clear of (update_speech_bubble), or null.
const bannerOnCanvas = () => (bannerBox && !bannerEl.hidden ? { x: bannerBox.x - bannerBox.mapX, y: bannerBox.y - bannerBox.mapY, w: bannerBox.w, h: bannerBox.h } : null);
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
    player: { x: o.x + p.x * s - 12 * k, y: o.y + p.y * s - 34 * k, w: 24 * k, h: 40 * k }, reward: bannerOnCanvas(),
    overview: world.camera.overviewMode, targetDist: Math.hypot(world.camera.center.x - n.x, world.camera.center.y - n.y), pxPerMetre: PIXELS_PER_METRE,
    activityText: modal.open ? body.textContent : '', reducedMotion: settings.reducedMotion, measure: measureText,
  });
  const text = bubble.text;
  bubble = out.bubble; world.bubble = out.layout;
  if (out.announce === 'panel') { const line = speechNotice($('#modal-status').textContent, text, L(BUBBLE_TEXT.panel)); if (line) $('#modal-status').textContent = line; }
  // 2D has no Info panel: a line that cannot be drawn is shown as a notice instead.
  else if (out.announce === 'info') toast(tf(GAME_TEXT.speech.line, { name: t(n.name), text }));
}
function history() {
  act({ type: 'history' });
  show(`<span class="eyebrow">${t(GAME_TEXT.history.fieldNote01Real)}</span><h2 id="modal-title">${t(GAME_TEXT.history.aCornerThatRemembers)}</h2><p>${t(GAME_TEXT.history.theNorthwestCornerOf)}</p><p>${t(GAME_TEXT.history.thisIsLivingHistory)}</p><p class="footnote">${t(GAME_TEXT.history.theBuildingsLaterUse)}</p><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.history.checkTheSource)}</span><p>${t(GAME_TEXT.history.sanFranciscoHistoricPreservation)}</p><a class="source-link" href="https://sfplanning.org/sites/default/files/agendas/2026-03/20260318_hpc%20(ID%201559597).pdf" target="_blank" rel="noreferrer">${t(GAME_TEXT.history.readTheCitysDocument)} ↗</a></div><div class="button-row">${button('history-close', `${t(GAME_TEXT.history.keepThisInMy)} ↗`, true)}</div>`); bind('history-close', close);
}
function blackhawk() {
  act({ type: 'discover-blackhawk' });
  show(`<span class="eyebrow">${t(GAME_TEXT.blackhawk.fieldNote02Real)}</span><h2 id="modal-title">${t(GAME_TEXT.blackhawk.aRoomFullOf)}</h2><p>${t(GAME_TEXT.blackhawk.atTurkAndHyde)}</p><p>${t(GAME_TEXT.blackhawk.milesDavissOfficialCatalog)}</p><p class="footnote">${t(GAME_TEXT.blackhawk.thisReadingPointMarks)}</p><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.blackhawk.followTheSourcesChecked)}</span><p><a class="source-link" href="https://www.sfjazz.org/athome/jazz-minute/history-of-the-black-hawk/" target="_blank" rel="noreferrer">${t(GAME_TEXT.blackhawk.sfjazzHistoryOfThe)} ↗</a></p><p><a class="source-link" href="https://www.milesdavis.com/albums/friday-night-miles-davis-in-person-at-the-blackhawk-san-francisco/" target="_blank" rel="noreferrer">${t(GAME_TEXT.blackhawk.milesDavisOfficialAlbum)} ↗</a></p><p>${t(GAME_TEXT.blackhawk.tenderloinMuseumIdentifiesThe)}</p><a class="source-link" href="https://www.tenderloinmuseum.org/public-programs-2022-1/2022/7/23/blackhawkblockparty" target="_blank" rel="noreferrer">${t(GAME_TEXT.blackhawk.museum2022BlockParty)} ↗</a></div><p>${t(GAME_TEXT.blackhawk.aThoughtToBring)}</p><div class="button-row">${button('blackhawk-close', `${t(GAME_TEXT.blackhawk.keepThisInMy)} ↗`, true)}${button('blackhawk-return', t(GAME_TEXT.blackhawk.walkBackToBea))}${button('blackhawk-notes', t(GAME_TEXT.blackhawk.historyWalkNotes))}</div>`);
  bind('blackhawk-close', close); bind('blackhawk-return', () => goTo(NEIGHBORS[0])); bind('blackhawk-notes', historyWalk);
}
function historyWalk() {
  if (!world) { toast(t(GAME_TEXT.historyWalk.theStreetSceneIs)); return; }
  show(`<span class="eyebrow">${t(GAME_TEXT.historyWalk.anOptionalWalkNo)}</span><h2 id="modal-title">${t(GAME_TEXT.historyWalk.twoCornersManyStories)}</h2><p>${t(GAME_TEXT.historyWalk.followTurkWestFrom)}</p><ol class="history-route"><li><h3>${t(GAME_TEXT.historyWalk.turkTaylorComptonsCorner)}</h3><p>${t(GAME_TEXT.historyWalk.aHistoryOfTransgender)} ${state.history ? t(GAME_TEXT.historyWalk.keptInYourField) : t(GAME_TEXT.historyWalk.anOptionalReadingStop)}</p>${button('walk-comptons', t(GAME_TEXT.historyWalk.walkToTheComptons))}${state.history ? button('read-comptons', t(GAME_TEXT.historyWalk.readSavedNote)) : ''}</li><li><h3>${t(GAME_TEXT.historyWalk.turkHydeTheFormer)}</h3><p>${t(GAME_TEXT.historyWalk.threeBlocksWestJones)} ${state.blackhawk ? t(GAME_TEXT.historyWalk.keptInYourField) : t(GAME_TEXT.historyWalk.discoverARoomIn)}</p>${button('walk-blackhawk', t(GAME_TEXT.historyWalk.walkToTheBlack))}${state.blackhawk ? button('read-blackhawk', t(GAME_TEXT.historyWalk.readSavedNote)) : ''}</li></ol><p class="footnote">${t(GAME_TEXT.historyWalk.realStreetCenterlinesSchematic)}</p><div class="button-row">${button('walk-return', t(GAME_TEXT.historyWalk.walkBackToBea))}${button('walk-map', t(GAME_TEXT.historyWalk.showTheWholeRoute))}${button('walk-close', t(STUDIO.keep))}</div>`);
  bind('walk-comptons', () => goTo(PLACES.find(p => p.id === 'history'))); bind('read-comptons', history);
  bind('walk-blackhawk', () => goTo(BLACK_HAWK)); bind('read-blackhawk', blackhawk);
  bind('walk-return', () => goTo(NEIGHBORS[0])); bind('walk-close', close);
  bind('walk-map', () => { const walking = walkPath.length > 0; stopWalk(); close(); world.camera.overview(true); cameraUI(); if (walking) toast(t(GAME_TEXT.historyWalk.stoppedWalkingChooseA)); });
}
function journal() {
  const programme = state.opened ? `<div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.ourNextAfternoonFictional)}</span><h3>${programmeTitle(state.programme.published)}</h3><p>${t(GAME_TEXT.journal.arrangeStoriesRhythmShared)} ${state.programme.published.length ? t(GAME_TEXT.journal.thePostedOrderAnd) : t(GAME_TEXT.journal.yourFirstGatheringIs)}</p>${button('journal-programme', state.programme.published.length ? t(GAME_TEXT.journal.revisitOurNextAfternoon) : t(GAME_TEXT.journal.planAnotherAfternoon))}${state.programme.published.length || state.hosting.order.length ? button('journal-host', state.hosting.order.length ? t(GAME_TEXT.journal.ourSecondGathering) : t(GAME_TEXT.journal.hostThePostedProgramme)) : ''}</div>` : '';
  const keepsake = state.opened ? `<div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.theAfternoonAfterwardOptional)}</span><h3>${state.epilogue.photo.status === 'taken' ? t(GAME_TEXT.journal.anIllustratedKeepsake) : t(GAME_TEXT.journal.anAfternoonCanBe)}</h3><p>${state.epilogue.photo.status === 'taken' ? t(GAME_TEXT.journal.yourChosenNeighborsAnd) : t(GAME_TEXT.journal.aPictureIsOptional)}</p>${state.epilogue.photo.status === 'taken' ? button('journal-keepsake', t(GAME_TEXT.journal.viewYourKeepsake)) : ''}<p>${state.epilogue.packing ? tf(GAME_TEXT.journal.of3BorrowedEvent, { returned: state.epilogue.returned.length }) : t(GAME_TEXT.journal.whenYouAreReady)}</p></div>` : '';
  show(`<span class="eyebrow">${t(GAME_TEXT.journal.yourFieldNotes)}</span><h2 id="modal-title">${t(GAME_TEXT.journal.anAfternoonToRemember)}</h2><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.ourGatheringFictional)}</span><h3>${state.layout === 'table' ? t(GAME_TEXT.journal.theLongTable) : state.layout === 'floor' ? t(GAME_TEXT.journal.anOpenFloor) : t(GAME_TEXT.journal.stillTakingShape)}</h3><p>${state.layout ? tf(GAME_TEXT.journal.youChoseTheOther, { layout: state.layout === 'table' ? t(GAME_TEXT.journal.beasConversationCenteredLong) : t(GAME_TEXT.journal.dezAndCelestesArt) }) : t(GAME_TEXT.journal.beaCelesteDezRook)}</p><p>${state.epilogue.packing ? t(GAME_TEXT.journal.theGatheringHasWound) : state.opened ? t(GAME_TEXT.journal.theGatheringIsOpen) : t(GAME_TEXT.journal.thePreparationsListRemembers)}</p></div>${keepsake}${programme}<div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.realPlaceDatedHistory)}</span><h3>${t(GAME_TEXT.journal.theComptonsCorner)}</h3><p>${state.history ? t(GAME_TEXT.journal.youDiscoveredTheHistoric) : t(GAME_TEXT.journal.theresAHistoryStop)}</p>${button('journal-history', state.history ? t(GAME_TEXT.journal.readTheHistoryNote) : t(GAME_TEXT.journal.walkToTheHistory))}</div><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.whatsRealWhatsImagined)}</span><p>${t(GAME_TEXT.journal.streetCenterlinesOpenstreetmapData)}</p>${button('journal-district', t(GAME_TEXT.journal.theLivingTransgenderDistrict))} ${button('journal-walk', t(GAME_TEXT.journal.exploreTheTurkHistory))} ${button('journal-map', t(GAME_TEXT.journal.mapSourceNotes))}</div>`);
  if (voicesHost.enabled) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.experimentalOptional)}</span><h3>${t(GAME_TEXT.journal.neighborhoodVoices)}</h3><p>${t(GAME_TEXT.journal.threeDatedOrganizationIntroductions)}</p>${button('journal-voices', t(GAME_TEXT.journal.openNeighborhoodVoices))}</div>`); bind('journal-voices', openVoices); }
  bind('journal-history', () => { if (state.history) history(); else { close(); goTo(PLACES.find(p => p.id === 'history')); } }); bind('journal-map', mapInfo); bind('journal-district', livingDistrict); bind('journal-walk', historyWalk);
  if (civicAvailable(state)) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.aLaterAfternoonFictional)}</span><h3>${t(GAME_TEXT.journal.aTenantListeningHour)}</h3><p>${t(GAME_TEXT.journal.neighborsBringDifferentPriorities)} ${state.civic.phase === 'done' ? t(GAME_TEXT.journal.yourAgreedSetupAnd) : t(GAME_TEXT.journal.theConversationCanWait)}</p>${button('journal-civic', state.civic.phase === 'done' ? t(GAME_TEXT.journal.rememberOurListeningHour) : t(GAME_TEXT.journal.visitTheListeningHour))}</div>`); bind('journal-civic', () => civicScreen()); }
  if (filmAvailable(state)) { body.insertAdjacentHTML('beforeend', `<div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.journal.aLaterDayFictional)}</span><h3>${t(STORY_CHAPTERS[4].title)}</h3><p>${t(GAME_TEXT.journal.anOriginalThreeShot)}</p>${button('journal-film', state.film.phase === 'done' ? t(GAME_TEXT.journal.screenOurLittleFilm) : t(GAME_TEXT.journal.visitOurLittleFilm))}</div>`); bind('journal-film', () => filmScreen()); }
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
  toggle.textContent = visible ? t(GAME_TEXT.districtUI.hideTheCityBoundary) : t(GAME_TEXT.districtUI.showTheCityBoundary);
  $('#district-state').textContent = districtStatus === 'ready' ? t(GAME_TEXT.districtUI.cityBoundaryReadyIt) : districtStatus === 'error' ? t(GAME_TEXT.districtUI.theCityLayerCould) : t(GAME_TEXT.districtUI.loadingTheLocalCity);
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
// host.load of the side stories: one of their two place files, same-origin and parsed, within 10 s (as requestDistrict). The real
// files are 5 and 12 kB: one over 256 kB is refused, unread when the response says its length, else read as it arrives and no
// further than a chunk past the limit (a compressed or chunked body's header is not its size), so it is never held whole; a
// response with no readable body is read whole and measured. The side stories' kit then bounds what it holds (visits-kit.js).
const VISIT_DATA_LIMIT = 256 * 1024;
async function loadVisitData(name) {
  if (!['power_place.json', 'voting_places.json'].includes(name)) throw Error('Not a story data file');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('./data/' + name, { signal: controller.signal });
    if (!response.ok) throw Error('Story data unavailable');
    if (Number(response.headers.get('content-length')) > VISIT_DATA_LIMIT) { controller.abort(); throw Error('Story data too large'); }
    const reader = response.body?.getReader?.();
    if (!reader) {
      const text = await response.text();
      if (text.length > VISIT_DATA_LIMIT) throw Error('Story data too large');
      return JSON.parse(text);
    }
    // UTF-8 decoded as it streams: a character split between chunks is whole, a truncated one U+FFFD.
    const decoder = new TextDecoder('utf-8');
    let bytes = 0, text = '';
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      bytes += chunk.value.byteLength;
      if (bytes > VISIT_DATA_LIMIT) { reader.cancel().catch(() => {}); throw Error('Story data too large'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { clearTimeout(timeout); }
}
function livingDistrict() {
  if (!world) { toast(t(GAME_TEXT.livingDistrict.theStreetSceneIs)); return; }
  show(`<span class="eyebrow">${t(GAME_TEXT.livingDistrict.livingCultureRealCommunity)}</span><h2 id="modal-title" tabindex="-1">${t(GAME_TEXT.livingDistrict.moreThanALine)}</h2><p>${t(GAME_TEXT.livingDistrict.theTransgenderDistrictDescribes)}</p><p>${t(GAME_TEXT.livingDistrict.itsCommunityReachesBeyond)}</p><div class="history-entry"><h3>${t(GAME_TEXT.livingDistrict.aCityMapWith)}</h3><p>${t(GAME_TEXT.livingDistrict.theDashedVioletLine)}</p><p id="district-state" role="status">${t(GAME_TEXT.livingDistrict.loadingTheLocalCity)}</p><div class="button-row">${button('district-layer', t(GAME_TEXT.livingDistrict.showTheCityBoundary), true, districtStatus !== 'ready')}<button id="district-retry" class="secondary-button" ${districtStatus === 'error' ? '' : 'hidden'}>${t(GAME_TEXT.livingDistrict.tryTheLayerAgain)}</button></div></div><div class="history-entry"><h3>${t(GAME_TEXT.livingDistrict.streetsChangeToo)}</h3><p>${t(GAME_TEXT.livingDistrict.sfmtaReportedTheTurk)}</p><p><a href="https://www.sfmta.com/blog/turk-street-gets-new-protected-bike-lane" target="_blank" rel="noreferrer">${t(GAME_TEXT.livingDistrict.sfmtaTurkApril2018)} ↗</a> · <a href="https://www.sfmta.com/projects/safer-taylor-street" target="_blank" rel="noreferrer">${t(GAME_TEXT.livingDistrict.sfmtaSaferTaylor)} ↗</a></p></div><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.livingDistrict.primarySourcesCheckedOctober)}</span><p><a class="source-link" href="https://transgenderdistrictsf.com/about" target="_blank" rel="noreferrer">${t(GAME_TEXT.livingDistrict.theTransgenderDistrictAbout)} ↗</a></p><p><a href="https://data.sf.gov/d/5xmc-5bjj" target="_blank" rel="noreferrer">${t(GAME_TEXT.livingDistrict.datasfCulturalDistricts)} ↗</a> · <a href="./data/transgender-district.geojson" target="_blank">${t(GAME_TEXT.livingDistrict.downloadTheCityFeature)} ↗</a> · <a href="./data/cultural-district-source.json" target="_blank">${t(GAME_TEXT.livingDistrict.provenancePddlLicense)} ↗</a></p><p><a class="source-link" href="https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-59534" target="_blank" rel="noreferrer">${t(GAME_TEXT.livingDistrict.cityCode1073)} ↗</a></p><p class="footnote">${t(GAME_TEXT.livingDistrict.boundaryDataSanFrancisco)}</p></div><div class="button-row">${button('district-close', `${t(GAME_TEXT.livingDistrict.backToExploring)} ↗`, true)}</div>`);
  bind('district-layer', () => { if (districtStatus !== 'ready') return; world.districtVisible = !world.districtVisible; districtUI(); close(world.districtVisible ? canvas : $('#district-button')); toast(world.districtVisible ? t(GAME_TEXT.livingDistrict.cityCulturalDistrictBoundary) : t(GAME_TEXT.livingDistrict.cityBoundaryHidden)); });
  bind('district-close', close); bind('district-retry', requestDistrict);
  districtUI(); if (districtStatus === 'idle' || districtStatus === 'loading') requestDistrict();
  (districtStatus === 'ready' ? $('#district-layer') : districtStatus === 'error' ? $('#district-retry') : $('#modal-title')).focus({ preventScroll: true });
}
function mapInfo() {
  show(`<span class="eyebrow">${t(GAME_TEXT.mapInfo.aRealCornerCarefully)}</span><h2 id="modal-title">${t(GAME_TEXT.mapInfo.turkTaylorToHyde)}</h2><p>${t(GAME_TEXT.mapInfo.theStreetsUseActual)}</p><p>${t(GAME_TEXT.mapInfo.theOptionalHistoryWalk)}</p><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.mapInfo.mapDataOdbl1)}</span><p>${t(GAME_TEXT.mapInfo.openstreetmapContributorsApiExtract)}</p><p><a href="./data/streets.osm.json" target="_blank">${t(GAME_TEXT.mapInfo.streetGeometryProvenance)} ↗</a> · <a href="https://github.com/jbrick2070/tenderloin-redux/blob/main/public/data/source-turk-west.osm.xml" target="_blank">${t(GAME_TEXT.mapInfo.turkWestOsmExtract)} ↗</a> · <a href="https://github.com/jbrick2070/tenderloin-redux/blob/main/public/data/source.osm.xml" target="_blank">${t(GAME_TEXT.mapInfo.earlierOpeningBlockExtract)} ↗</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">${t(GAME_TEXT.mapInfo.licenseAttribution)} ↗</a></p></div><div class="button-row">${button('map-close', `${t(GAME_TEXT.mapInfo.backToOurCorner)} ↗`, true)}</div>`); bind('map-close', close);
}
function finale() {
  // core.js blockMissingItems: each part through its own template, joined as a list (English: blockMissing's ', ' join).
  if (!ready(state)) { const missing = blockMissingItems(state).map(item => item.count === undefined ? t(item.template) : fmt(item.template, item.count)); toast(fmt(BLOCK_TEXT.almost, missing.length ? list(missing, parts => parts.join(', ')) : t(BLOCK_TEXT.ready))); return; }
  const wasOpen = state.opened;
  if (!wasOpen) { act({ type: 'open' }); if (!state.opened) return; }
  if (state.epilogue.packing) {
    show(`<span class="success-stamp">${t(GAME_TEXT.finale.anAfternoonWellSpent)}</span><h2 id="modal-title">${t(GAME_TEXT.finale.theGoodThingsStay)}</h2><p>${t(GAME_TEXT.finale.theGatheringHasWound)} ${state.epilogue.returned.length === LOANS.length ? t(GAME_TEXT.finale.theThreeLoansAre) : t(GAME_TEXT.finale.theNeighborsArePacking)}</p><p>${t(GAME_TEXT.finale.youCanStillExplore)}</p><div class="button-row">${button('stay-block', `${t(BACK)} ↗`, true)}${button('finale-notes', t(GAME_TEXT.finale.openYourFieldNotes))}</div>`); bind('stay-block', close); bind('finale-notes', journal); return;
  }
  show(`<span class="success-stamp">${t(GAME_TEXT.finale.theBlockIsOpen)}</span><h2 id="modal-title">${t(GAME_TEXT.finale.youMadeALittle)}</h2>${wasOpen ? '' : `<p>${fmt(BLOCK_TEXT.opened, L(GATHERING_LAYOUT_TITLES[state.layout]))}</p>`}<p>${state.layout === 'table' ? t(GAME_TEXT.finale.theLongTableFills) : t(GAME_TEXT.finale.theOpenFloorFills)}</p><p>${t(GAME_TEXT.finale.rookHasTheSound)}</p><p>${t(GAME_TEXT.finale.itsOneAfternoonThe)}</p><div class="button-row">${button('stay-block', `${t(GAME_TEXT.finale.stayALittleLonger)} ↗`, true)}${button('finale-notes', t(GAME_TEXT.finale.rememberThisAfternoon))}</div><p class="footnote">${t(GAME_TEXT.finale.firstPlayableCompleteYou)}</p>`);
  bind('stay-block', close); bind('finale-notes', journal);
}
// Localization (docs/I18N_PLAN.md 2.5, 2.9). A failed load keeps English and says so; applying a locale sets <html lang dir>,
// the title and [data-i18n] nodes and, on a switch, clears the transient messages. Only the screen that holds the language
// control ([data-settings]) is drawn again; the startup offer row just goes.
// Only a URL or stored language is awaited at startup (startupWait caps it); the offer's manifest arrives when it does and
// joins the startup card only if it is still open. A stored language the manifest no longer ships is dropped.
function startLocale() {
  if (startupLocale.code !== 'en') return localeSwitcher.switchTo(startupLocale.code, { preview: startupLocale.preview }).then(result => {
    if (result.stale) return;
    const next = storedLanguageAfter(result, { source: startupLocale.source, code: startupLocale.code });
    if (next === null) { delete settings.language; saveSettings(); }
  });
  if (startupLocale.offer) loadManifest().then(manifest => { shippedCodes = shippedLocales(manifest); offerLate(); });
  return null;
}
function startupWait(ready) {
  let timer;
  const cap = new Promise(resolve => { timer = setTimeout(() => { localeSwitcher.cancel(); toast(boot('failed', startupLocale.code, localeMeta(startupLocale.code)?.endonym ?? startupLocale.code)); resolve(); }, LOAD_TIMEOUT_MS + 1000); });
  return Promise.race([ready, cap]).finally(() => clearTimeout(timer));
}
function offerLate() {
  const row = modal.open && !$('[data-language-offer]') ? $('[data-chapter-card] #begin')?.closest('.button-row') : null, html = row ? languageOfferHTML() : '';
  if (!html) return;
  row.insertAdjacentHTML('afterend', html); bindLanguageOffer();
}
function adoptLocale(result, code) {
  if (result.manifest) shippedCodes = shippedLocales(result.manifest);
  const before = activeLocale();
  if (result.ok && code !== 'en') setLocale(code, result.catalog, { preview: result.preview, rejected: result.rejected }); else setLocale('en');
  if (activeLocale() !== before) applyLocale();
  if (!result.ok && code !== 'en') toast(boot('failed', code, localeMeta(code)?.endonym ?? code));
}
function applyLocale() {
  applyDocument(document, { title: PAGE_TITLE }); applyPageText();
  let badge = $('#preview-badge');
  if (localeInfoPreview() && !badge) { badge = document.createElement('span'); badge.id = 'preview-badge'; badge.className = 'prototype-badge'; badge.lang = 'en'; badge.textContent = boot('preview', 'en'); $('#chapter-line').append(badge); }
  else if (!localeInfoPreview() && badge) badge.remove();
  if (!localeBooted) return;
  clearTimeout(toastTimeout); $('#toast').classList.remove('show'); notice.textContent = ''; $('#route-status').textContent = '';
  chapterNotice = ''; bubble = null; routeSpeech = null; if (world) world.bubble = null;
}
const localeInfoPreview = () => i18nDiagnostics().preview;
// index.html's text that applyDocument does not reach, keyed by its English, which is kept the first time and restored in English:
// the text before a child element ([data-i18n-lead]), the route between the map label's street names ([data-i18n-route], the
// street names stay as they are) and the map's key hint ([data-i18n-keys], one sentence around its <kbd> keys). The 3D edition's
// link and note carry no marker (tests pin their tags): they are found by id.
function applyPageText() {
  const note = $('#edition-note');
  if (note) { note.dataset.i18nNoteEn ??= note.textContent; note.textContent = t(note.dataset.i18nNoteEn); }
  for (const node of document.querySelectorAll('[data-i18n-lead], #swap-edition')) {
    const text = node.firstChild; if (!text || text.nodeType !== Node.TEXT_NODE) continue;
    if (!node.hasAttribute('data-i18n-lead-en')) node.setAttribute('data-i18n-lead-en', text.data);
    const english = node.getAttribute('data-i18n-lead-en'), lead = /^\s*/.exec(english)[0], trail = /\s*$/.exec(english)[0];
    text.data = lead + t(english.trim()) + trail;
  }
  const route = $('[data-i18n-route]');
  if (route) { route.dataset.i18nRouteEn ??= route.textContent; route.textContent = activeLocale() === 'en' ? route.dataset.i18nRouteEn : tf(GAME_TEXT.indexHTML.route, { from: 'TAYLOR', to: 'HYDE' }); }
  const keys = $('[data-i18n-keys]');
  if (keys) { keys.dataset.i18nKeysEn ??= keys.innerHTML; keys.innerHTML = activeLocale() === 'en' ? keys.dataset.i18nKeysEn : htmlParts(GAME_TEXT.indexHTML.keys, ...[...keys.querySelectorAll('kbd')].map(kbd => kbd.outerHTML)); }
}
function languageOfferHTML() {
  const code = offerFor({ offer: startupLocale.offer, shipped: shippedCodes, settings, current: activeLocale() }); if (!code) return '';
  const meta = localeMeta(code), parts = offerParts(code), endonym = `<span lang="${meta.html}">${escapeHTML(meta.endonym)}</span>`;
  return `<div class="button-row language-offer" data-language-offer><p>${parts.own ? `<span lang="${meta.html}">${escapeHTML(parts.own)}</span> · ` : ''}${escapeHTML(parts.english)}</p>${button('language-accept', escapeHTML(boot('accept', code, '\u0000')).replace('\u0000', endonym))}${button('language-decline', escapeHTML(boot('decline', code)))}</div>`;
}
function bindLanguageOffer() {
  const code = offerFor({ offer: startupLocale.offer, shipped: shippedCodes, settings, current: activeLocale() }); if (!code) return;
  const done = () => { $('[data-language-offer]')?.remove(); $('#begin')?.focus({ preventScroll: true }); };
  bind('language-accept', () => { done(); chooseLanguage(code); });
  bind('language-decline', () => { settings.languageOffer = 'declined'; saveSettings(); done(); });
}
function languageRowHTML() {
  const now = activeLocale(), codes = languageChoices(shippedCodes, now); if (!codes.length) return '';
  return `<label class="settings-row" for="language" data-settings><span>${escapeHTML(languageLabel(now))}</span><select id="language">${codes.map(code => { const meta = localeMeta(code); return `<option value="${code}" lang="${meta.html}"${code === now ? ' selected' : ''}>${escapeHTML(meta.endonym)}</option>`; }).join('')}</select></label>`;
}
// A shipped locale (or English) is stored once it has loaded; a preview locale from the URL stays this visit's only.
function chooseLanguage(code) {
  if (!languageChoices(shippedCodes, activeLocale()).includes(code) && !(code === startupLocale.offer && shippedCodes.includes(code))) return;
  localeSwitcher.switchTo(code, { preview: startupLocale.preview && code === startupLocale.code }).then(result => {
    if (result.stale) return;
    const stored = storedLanguageAfter(result, { source: 'choice', code, storable: code === 'en' || (STORABLE.includes(code) && shippedCodes.includes(code)) });
    if (stored !== undefined) { settings.language = stored; saveSettings(); }
    if (modal.open && body.querySelector('[data-settings]')) { showSettings(); $('#language')?.focus({ preventScroll: true }); }
    if (result.ok) { const said = boot('switched', code, localeMeta(code).endonym); if (modal.open) modalStatus(said); else toast(said); }
  });
}
function showSettings() {
  show(`<span class="eyebrow">${t(GAME_TEXT.showSettings.makeYourselfComfortable)}</span><h2 id="modal-title">${t(GAME_TEXT.showSettings.yourAfternoon)}</h2>${languageRowHTML()}<label class="settings-row" for="volume"><span>${t(GAME_TEXT.showSettings.musicVolume)} <span id="volume-number">${Math.round(settings.volume * 100)}%</span></span><input id="volume" data-rapid type="range" min="0" max="${MAX_VOLUME * 100}" value="${Math.round(settings.volume * 100)}"></label><div class="settings-row"><span id="reward-sounds-label">${t(GAME_TEXT.showSettings.rewardSounds)}</span><button id="reward-sounds" class="secondary-button" aria-pressed="${settings.rewardSounds}" aria-describedby="reward-sounds-help" title="${t(SOUNDS_TEXT.tooltip)}">${soundsLabel(settings.rewardSounds)}</button><span id="reward-sounds-help" class="sr-only">${t(SOUNDS_TEXT.tooltip)}</span></div><label class="settings-row" for="motion"><span>${t(GAME_TEXT.showSettings.reduceAmbientMotion)}</span><input type="checkbox" id="motion" ${settings.reducedMotion ? 'checked' : ''}></label><p>${t(GAME_TEXT.showSettings.musicIsOptionalEvery)}</p><fieldset class="experiment-settings"><legend>${t(GAME_TEXT.showSettings.experimental)}</legend><label class="settings-row" for="voices-enabled"><span>${t(GAME_TEXT.showSettings.neighborhoodVoicesTextOnly)}</span><input id="voices-enabled" type="checkbox" ${settings.experimental.neighborhoodVoices ? 'checked' : ''}></label><p>${t(GAME_TEXT.showSettings.threeDatedOrganizationCards)}</p><p id="voices-settings-status" role="status"></p></fieldset><div class="history-entry"><span class="eyebrow">${t(GAME_TEXT.showSettings.yourSavedAfternoon)}</span><p>${held ? t(SAVE_TEXT.held) : storageAvailable ? t(GAME_TEXT.showSettings.yourProgressStaysIn) : t(GAME_TEXT.showSettings.browserStorageIsUnavailable)}</p><div class="edition-row"><p id="swap-edition-settings-help">${t(EDITION_TEXT.help)}</p><a id="swap-edition-settings" class="edition-link" href="${EDITION_URL}" aria-describedby="swap-edition-settings-help">${t(EDITION_TEXT.link)}<span aria-hidden="true">↗</span></a></div><button id="restart" class="danger-button">${held ? t(GAME_TEXT.showSettings.startOver) : t(GAME_TEXT.showSettings.startANewAfternoon)}</button></div>`);
  $('#volume').addEventListener('input', event => { settings.volume = Number(event.target.value) / 100; music.setVolume(settings.volume); $('#volume-number').textContent = `${Math.round(settings.volume * 100)}%`; saveSettings(); });
  // Godot toggle_reward_sounds: Sounds On/Off in the fork's settings key; turning it off stops a chime at once. Godot's tooltip
  // is the button's description too (#reward-sounds-help), so it is not reachable by hover alone.
  bind('reward-sounds', () => { settings.rewardSounds = !settings.rewardSounds; rewards.setEnabled(settings.rewardSounds); saveSettings(); const control = $('#reward-sounds'); control.textContent = soundsLabel(settings.rewardSounds); control.setAttribute('aria-pressed', String(settings.rewardSounds)); $('#modal-status').textContent = soundsAnnouncement(settings.rewardSounds); });
  $('#motion').addEventListener('change', event => { settings.reducedMotion = event.target.checked; document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion); saveSettings(); });
  $('#language')?.addEventListener('change', event => chooseLanguage(event.target.value));
  $('#voices-enabled').addEventListener('change', event => setVoicesEnabled(event.target.checked)); voicesUI();
  bind('restart', () => confirmRestart(() => { showSettings(); const restartButton = $('#restart'); restartButton.focus({ preventScroll: true }); restartButton.scrollIntoView({ block: 'nearest' }); }));
  bindSwap($('#swap-edition-settings'), () => { showSettings(); const link = $('#swap-edition-settings'); link.focus({ preventScroll: true }); link.scrollIntoView({ block: 'nearest' }); });
}
// Restart clears the shared key, so it resets the 3D edition too; Godot reads an absent save as a fresh one.
// Keep has focus, and a held Enter never reaches Start fresh: press-settle.js drops every repeated Enter on a control.
// back returns to wherever the confirmation was opened from.
function confirmRestart(back) {
  show(`<span class="eyebrow">${t(GAME_TEXT.confirmRestart.aFreshStart)}</span><h2 id="modal-title">${t(GAME_TEXT.confirmRestart.anotherAfternoon)}</h2><p>${t(FORK_TEXT.restart)}${held ? ` ${t(GAME_TEXT.confirmRestart.theUnreadableSaveIs)}` : ''} ${t(GAME_TEXT.confirmRestart.reloadThe3dEdition)}</p><p>${t(GAME_TEXT.confirmRestart.yourSoundMotionAnd)}</p><div class="button-row">${button('confirm-restart', t(GAME_TEXT.confirmRestart.startFresh), true)}${button('cancel-restart', t(GAME_TEXT.confirmRestart.keepMyAfternoon))}</div>`);
  bind('confirm-restart', restart); bind('cancel-restart', back);
  $('#cancel-restart').focus({ preventScroll: true });
}
function restart() {
  try { localStorage.removeItem(SAVE_KEY); storageAvailable = true; } catch { storageAvailable = false; }
  state = initialState(); held = false; envelope = freshEnvelope(); lastRaw = null; loadedScenes = {}; savedMessage = ''; recovery = null; saveInfo = { status: 'fresh', reason: null, bytes: 0 };
  resetSession(); ending.reset(); rhythm.stop();
  stopWalk(); if (world) { world.camera.overview(); if (world.width < 600) world.camera.follow(state.player); cameraUI(); }
  updateUI(); close(); toast(t(GAME_TEXT.restart.aFreshAfternoonBea));
}
// Play the 3D edition (edition.js), on the page and in Settings. The Godot build reads the shared save when it starts and the fork
// writes on every change, so a click follows the link as it is, and a modifier or middle click keeps the browser's own new tab. The
// stored key is read again first, as before a write; then swapAction holds the swap only where leaving could lose progress: a
// pending recovery offer comes back and says why, and a save that could not be read asks first, since the 3D edition would replace
// it. back: Stay here's way back to the link the swap came from.
function bindSwap(link, back) {
  const guard = event => { if (event.type === 'click' || event.button === 1) swapEdition(event, back); };
  link.addEventListener('click', guard); link.addEventListener('auxclick', guard);
}
function swapEdition(event, back) {
  syncStored();
  const action = swapAction({ recovery, held });
  if (action === 'go') return;
  event.preventDefault();
  if (action === 'recover') offerRecovery(t(EDITION_TEXT.recover)); else confirmSwap(back, event.currentTarget);
}
// Stay here has the focus, as Keep my afternoon does, and a held Enter never reaches Open the 3D edition: press-settle.js drops
// every repeated Enter on a control. Opened from the page, Escape and × return to its link too.
function confirmSwap(back, origin) {
  const fromPage = !modal.open;
  show(`<span class="eyebrow">${t(EDITION_TEXT.eyebrow)}</span><h2 id="modal-title">${t(EDITION_TEXT.title)}</h2><p>${t(EDITION_TEXT.confirm)}</p><div class="button-row">${button('swap-open', t(EDITION_TEXT.open), true)}${button('swap-stay', t(EDITION_TEXT.stay))}</div>`);
  if (fromPage) modalReturnTarget = origin;
  bind('swap-open', () => location.assign(EDITION_URL)); bind('swap-stay', back);
  $('#swap-stay').focus({ preventScroll: true });
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
  cameraUI(); hint(); toast(announce || (name ? tf(GAME_TEXT.startWalk.walkingToChooseStop, { name }) : t(GAME_TEXT.startWalk.walkingToYourStop)));
  return true;
}
function goTo(object) {
  if (!world) { toast(t(GAME_TEXT.goTo.theStreetSceneIs)); return; }
  if (Math.hypot(state.player.x - object.x, state.player.y - object.y) < 35) { stopWalk(); world.camera.follow(state.player); cameraUI(); interact(object); return; }
  if (!startWalk(object, { target: object, name: t(object.name || object.label) })) { closeIfOpen(); toast(t(GAME_TEXT.goTo.aRouteToThat)); return; }
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
  if (!world) { toast(t(GAME_TEXT.neighbors.theStreetSceneIs)); return; }
  show(`<span class="eyebrow">${t(GAME_TEXT.neighbors.aFewFamiliarFaces)}</span><h2 id="modal-title">${t(GAME_TEXT.neighbors.meetTheNeighbors)}</h2><p>${t(GAME_TEXT.neighbors.chooseSomeoneAndWalk)}</p><ul class="neighbor-directory">${NEIGHBORS.map(n => `<li><button class="secondary-button" id="neighbor-${n.id}" aria-label="${tf(GAME_TEXT.neighbors.walkTo, { name: t(n.name) })} ${t(n.role)}"><span class="portrait" style="background:${n.coat}55" aria-hidden="true">${n.name[0]}</span><span class="neighbor-description"><strong>${t(n.name)}</strong><small>${t(n.role)}</small></span><span class="walk-label">${t(GAME_TEXT.neighbors.walkOver)} ↗</span></button></li>`).join('')}</ul>${button('neighbors-close', t(STUDIO.keep))}`);
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
  $('#camera-status').textContent = c.overviewMode ? c.routeOverview ? t(GAME_TEXT.cameraUI.turkHistoryWalk) : t(GAME_TEXT.cameraUI.fullBlock) : c.following ? t(GAME_TEXT.cameraUI.followingYou) : t(GAME_TEXT.cameraUI.lookingAround);
}
function moveTo(point) {
  const path = findPath(state.player, point, ways);
  if (!path.length) { toast(t(GAME_TEXT.moveTo.keepToTheStreets)); return; }
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
  const nearest = world.nearest(), text = walkPath.length ? walkName ? tf(GAME_TEXT.hint.walkingTo, { name: walkName }) : t(GAME_TEXT.hint.walking) : nearest ? NEIGHBORS.some(n => n.id === nearest.id) ? tf(GAME_TEXT.hint.talkWith, { name: t(nearest.name) }) : t(nearest.name) : t(RHYTHM_TEXT.objectiveFallback);
  $('#world-prompt span').textContent = text; $('#world-prompt kbd').textContent = walkPath.length ? '↑↓←→' : 'E';
  $('#stop-walking').disabled = !walkPath.length; storyResumeUI();
  if (routeSpeech && performance.now() > routeSpeech.until) routeSpeech = null;
  const status = routeSpeech ? routeSpeech.text : walkPath.length ? `${text} ${t(GAME_TEXT.hint.chooseStopWalkingTo)}` : nearest ? tf(GAME_TEXT.hint.nearbyUseTalkHelp, { name: t(nearest.name) }) : t(GAME_TEXT.hint.chooseANeighborFor);
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
  const elapsed = Math.max(0, (ms - lastFrame) / 1000 || 0), delta = Math.min((ms - lastFrame) / 1000 || 0, .045); lastFrame = ms;
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
  // The reward banner, then the side stories each frame: the lantern march while it travels, then the landmark tour's completion.
  stepBanner(elapsed);
  visits.tick(ms, world);
  stepSpeech(delta); world.motion = moving; world.draw(ms / 1000, settings.reducedMotion);
  if (ms - lastHint > 150) { if (arrivedAt && distanceTo(arrivedAt) > 40) arrivedAt = null; hint(); chapterUI(); lastHint = ms; }
  requestAnimationFrame(frame);
}
function frame(ms) {
  try { renderFrame(ms); }
  catch (error) {
    releaseKeys(); console.error(error);
    show(`<span class="eyebrow">${t(GAME_TEXT.frame.aPauseOnThe)}</span><h2 id="modal-title">${t(GAME_TEXT.frame.theSceneNeedsA)}</h2><p>${t(GAME_TEXT.frame.yourSavedPreparationsAre)}</p><div class="button-row"><button id="reload-scene" class="primary-button">${t(GAME_TEXT.frame.reloadTheScene)}</button></div>`);
    bind('reload-scene', () => location.reload());
  }
}

$('#close-modal').addEventListener('click', () => close(returnFocus()));
// Godot's Goodbye (Esc): Escape on a conversation says goodbye too.
modal.addEventListener('cancel', () => { const id = openConversation(); if (id) { const lines = goodbyeLines(id, nextObjective(state, storyWorld())); queueMicrotask(() => { toast(lines.text); routeSay(lines.announcement); }); } });
bind('voices-button', openVoices);
// Closing the recovery offer with Escape or × decides nothing: this tab's progress stays, unsaved, and the next action to save asks again.
modal.addEventListener('close', () => { const kept = [...heldCodes].filter(([, key]) => key === walkOnClose); releaseKeys(); if (walkOnClose && !modal.open) { keys.add(walkOnClose); for (const [code, key] of kept) heldCodes.set(code, key); } walkOnClose = null; if (!modal.open) { const later = recovery && body.querySelector('[data-recovery]'); voicesHost.dismiss(); focusReturn(); modalReturnTarget = canvas; releaseNotice(); if (later) toast(t(GAME_TEXT.page.decideWheneverYouLike)); queueChapterCard(); } });
// A held Escape is one Escape: its repeats never close the screen under the one it just left.
window.addEventListener('keydown', event => { if (event.key === 'Escape' && event.repeat && modal.open) event.preventDefault(); }, { capture: true });
window.addEventListener('keydown', event => {
  // D13: KeyW/A/S/D/E and the arrows by position, so non-Latin layouts walk; every other key by its typed identity, as before.
  const key = inputKey(event);
  if (modal.open && world && !event.repeat && MOVE_KEYS.includes(key) && startupContinue && body.querySelector('[data-chapter-card] #begin')) { event.preventDefault(); walkOnClose = key; if (event.code) heldCodes.set(event.code, key); startupContinue(); return; }
  if (modal.open || !world) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
  // A repeat of a key that is not walking is a key held through a dialog: only a fresh press walks.
  if (MOVE_KEYS.includes(key)) { event.preventDefault(); if (!event.repeat || keys.has(key)) { keys.add(key); if (event.code) heldCodes.set(event.code, key); } }
  if ((key === 'e' || key === 'enter') && !event.repeat && !['BUTTON', 'A'].includes(document.activeElement?.tagName)) { event.preventDefault(); const nearest = world.nearest(); if (nearest) { stopWalk(); interact(nearest, 'talk'); } else toast(t(GAME_TEXT.page.walkALittleCloser)); }
});
// A keyup releases its typed or positional identity and whatever its physical key went down as.
window.addEventListener('keyup', event => { const key = inputKey(event), down = heldCodes.get(event.code); heldCodes.delete(event.code); keys.delete(key); if (down) keys.delete(down); if (walkOnClose === key || (down && walkOnClose === down)) walkOnClose = null; });
// Godot reward_audio_unlocked: the first real key, mouse or touch press. Capture, so the press that acts can already chime.
for (const type of ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend']) window.addEventListener(type, event => rewards.unlock(event), { capture: true, passive: true });
window.addEventListener('blur', () => releaseKeys());
window.addEventListener('pagehide', () => { music.stop(); rewards.stop(); if (modal.open && body.querySelector('[data-neighborhood-voices]')) close($('#voices-button')); voicesHost.suspend(); });
window.addEventListener('pageshow', event => { if (event.persisted) { voicesHost.resume(); syncStored(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseKeys(); music.stop(); rewards.stop(); voicesHost.silence(); } else syncStored(); });
window.addEventListener('storage', event => { if (event.key === SAVE_KEY || event.key === null) syncStored(); });
window.addEventListener('resize', chapterUI);
$('#journal-button').addEventListener('click', journal); $('#settings-button').addEventListener('click', showSettings);
$('#map-info').addEventListener('click', mapInfo); $('#about-button').addEventListener('click', mapInfo);
$('#open-gathering').addEventListener('click', finale); $('#save-start-over').addEventListener('click', () => confirmRestart(() => close($('#save-start-over'))));
bindSwap($('#swap-edition'), () => close($('#swap-edition')));
$('#world-prompt').addEventListener('click', () => { if (!world) return; if (walkPath.length) { canvas.focus({ preventScroll: true }); toast(t(GAME_TEXT.page.walkingToYourStop)); return; } const nearest = world.nearest(); if (nearest) { stopWalk(); interact(nearest, 'talk'); } else { toast(t(GAME_TEXT.page.walkALittleCloser2)); canvas.focus({ preventScroll: true }); } });
$('#recenter').addEventListener('click', () => { if (world) { world.camera.follow(state.player); cameraUI(); } });
$('#map-overview').addEventListener('click', () => { if (world) { world.camera.overview(); cameraUI(); } });
for (const [id, factor] of [['zoom-in', 1.35], ['zoom-out', 1 / 1.35]]) $( `#${id}`).addEventListener('click', () => { if (world) { world.camera.zoom(factor); cameraUI(); } });
$('#neighbors-button').addEventListener('click', neighbors);
$('#history-walk-button').addEventListener('click', historyWalk);
$('#district-button').addEventListener('click', livingDistrict); $('#district-notes').addEventListener('click', livingDistrict);
$('#district-hide').addEventListener('click', () => { if (!world) return; world.districtVisible = false; districtUI(); $('#district-button').focus({ preventScroll: true }); toast(t(GAME_TEXT.page.cityBoundaryHidden)); });
$('#stop-walking').addEventListener('click', () => { stopWalk(); canvas.focus({ preventScroll: true }); toast(t(GAME_TEXT.page.stoppedHereChooseA)); });
$('#sound-toggle').addEventListener('click', toggleMusic);
$('#music-button').addEventListener('click', showMusic);
async function init() {
  try {
    // A stored or linked locale loads beside the street data, and never throws; the first-run offer's manifest is not awaited.
    const localeReady = startLocale();
    const response = await fetch('./data/streets.osm.json'); if (!response.ok) throw Error(`Street data: HTTP ${response.status}`);
    const data = await response.json(); ways = makeWays(data);
    if (!walkable(state.player, ways)) state.player = initialState().player;
    // The walk control of an active side story, before Stop walking (Godot update_walk_control relabels its walk control).
    $('#stop-walking').insertAdjacentHTML('beforebegin', '<button id="story-resume" class="secondary-button" aria-describedby="story-resume-tip" hidden></button><span id="story-resume-tip" class="sr-only"></span>'); visits.bindEntry('resume');
    // A tap on a visit object opens it where it stands and never walks there (settle.tap claims the tap that opened its card).
    world = new World(canvas, ways, () => state, { click: (point, object) => object ? object.kind === 'visit' ? interact(object, 'tap') : goTo(object) : moveTo(point), tap: event => settle.tap(event), camera: cameraUI, reducedMotion: settings.reducedMotion, layers: mapLayers });
    cameraUI();
    updateUI();
    if (localeReady) await startupWait(localeReady);
    localeBooted = true;
    showChapterCard(true); $('#loading').remove(); requestAnimationFrame(frame);
    // Read-only inspection for diagnostics; no production bypass for quest actions.
    window.tenderloin = Object.freeze({ snapshot: () => structuredClone(state), location: () => ({ ...world.offset, scale: world.scale }), sound: () => ({ mode: music.fileName ? 'local' : 'sketch', enabled: music.enabled, starting: music.starting, fileName: music.fileName, volume: music.volume, position: music.position, error: music.error, mask: music.sketch.mask, summary: stemSummary(music.sketch.mask), frames: music.sketch.position(), engine: music.sketch.engine, rate: music.sketch.context?.sampleRate ?? null, muted: music.sketch.muted, rewardsEnabled: settings.rewardSounds, rewardsUnlocked: rewards.unlocked, rewardCount: rewards.count, rewardLastCue: rewards.lastCue, audition: rhythm.auditioning }), ending: () => ending.snapshot(), rhythm: () => rhythm.snapshot(), visits: () => visits.snapshot(), experiment: () => voicesHost.snapshot(), version: VERSION, edition: EDITION, i18n: () => i18nDiagnostics(),
      story: () => { chapterUI(); const goal = nextObjective(state, storyWorld()); return { chapter: currentChapter(state), line: $('#chapter-text').textContent, objective: { id: goal.id, text: goal.text }, card: chapterCardOpen() }; },
      save: () => ({ status: saveInfo.status, reason: saveInfo.reason, bytes: saveInfo.bytes, seq: saveSeq() }), pressSettle: () => settle.snapshot(),
      // The open conversation and the speech bubble on the frame clock (visible: drawn this frame).
      conversation: () => ({ partner: openConversation(), talks: { ...talks }, header: openConversation() ? $('#talk-header')?.textContent ?? '' : '', line: openConversation() ? $('#talk-line')?.textContent ?? '' : '' }),
      bubble: () => bubble ? { id: bubble.id, text: bubble.text, visible: !!world.bubble, timer: bubble.timer, deferred: bubble.deferred, matched: bubble.matched } : null,
      // The reward banner (bursts.js): its state, and whether the page shows it.
      banner: () => ({ ...banner.view(), pending: banner.pending(), shown: !bannerEl.hidden }) });
  } catch (error) {
    let loading = $('#loading'); if (!loading) { loading = document.createElement('div'); loading.id = 'loading'; loading.className = 'loading'; $('.world-panel').append(loading); }
    loading.innerHTML = `<div class="error-box"><strong>${t(GAME_TEXT.init.thisCornerCouldNot)}</strong><p>${t(GAME_TEXT.init.runTheLocalServer)}</p><button class="secondary-button" id="retry-load">${t(GAME_TEXT.init.tryAgain)}</button></div>`;
    bind('retry-load', () => location.reload()); console.error(error);
  }
}
voicesHost.setEnabled(settings.experimental.neighborhoodVoices);
saveUI(); chapterUI();
init();
