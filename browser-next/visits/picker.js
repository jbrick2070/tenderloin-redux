// Story visits picker (godot/story_picker.gd) and the visit-only session of the four episodes.
// Pure: `stories` is a plain object passed in and returned; nothing here is saved.
//
// Shared episode context `ctx`, built by game.js each call:
//   opened        state.opened (Godot block_opened)
//   busy          a startup or story card, or a focused activity, is showing
//   startupCard, storyCard   the two card flags separately (open_picker needs them)
//   walking       walkPath.length > 0 (Godot current_path not empty)
//   player        the player's 2D position
//   musicPlaying  for the Music: On/Off labels
//   powerPlace    parsed browser-next/data/power_place.json once validSource() passed, else null
//   voting        parsed browser-next/data/voting_places.json once validSource() passed, else null
//   sites         { dogs, lantern, larkin, election }: false when a site check failed (default true)
// activeId is filled in here from `stories`.
import * as dogs from './dogs.js';
import * as lantern from './lantern.js';
import * as power from './power.js';
import * as election from './election.js';
import { PICKER, GODOT_TEXT, web } from './text.js';

export const { TITLES } = PICKER;
const T = GODOT_TEXT['story_picker.gd'];
export const TEXT = T;
// Godot episodes() order: the picker's entries, two per page.
export const EPISODES = ['lantern', 'election', 'power', 'dogs'];
// Godot active_story_episode() search order.
export const ACTIVE_ORDER = ['election', 'lantern', 'dogs', 'power'];
const MODULES = {
  lantern: { mod: lantern, change: lantern.changeLantern, view: lantern.lanternView },
  election: { mod: election, change: election.changeElection, view: election.electionView },
  power: { mod: power, change: power.changePower, view: power.powerView },
  dogs: { mod: dogs, change: dogs.changeDogs, view: dogs.dogsView },
};
export const episodeModule = id => MODULES[id]?.mod;

export function initialPicker() {
  return { open: false, page: 0, suspended: [], completed: {}, lanternInvited: false, invitationFollowed: false, returnStory: null, openedFromReader: false };
}
export function initialStories() {
  return { picker: initialPicker(), lantern: lantern.initialLantern(), election: election.initialElection(), power: power.initialPower(), dogs: dogs.initialDogs() };
}
export const activeEpisode = stories => ACTIVE_ORDER.find(id => stories[id]?.active) ?? null;
export const openEpisodeId = stories => EPISODES.find(id => stories[id]?.open) ?? null;
const withActive = (stories, ctx) => ({ ...ctx, activeId: activeEpisode(stories) });
const clone = stories => ({ ...stories, picker: { ...stories.picker, suspended: [...stories.picker.suspended], completed: { ...stories.picker.completed } } });
export const isAvailable = (id, ctx = {}) => MODULES[id].mod.available(ctx);

// Godot remember_completed().
export function rememberCompleted(stories) {
  const s = clone(stories);
  EPISODES.forEach((id, i) => {
    if (s[id].won) s.picker.completed[i] = id === 'power' ? (s.power.historical ? T.remember_completed.larkin : T.remember_completed.festival) : TITLES[i];
  });
  return s;
}
// Godot offer_lantern(): only the genuine reunion calls it.
function offerLantern(stories) {
  if (stories.picker.lanternInvited) return stories;
  const s = clone(stories);
  s.picker.lanternInvited = true; s.picker.completed[EPISODES.indexOf('dogs')] = GODOT_TEXT['story_picker.gd'].offer_lantern.dogs;
  return s;
}
// Godot suspend_story(): cancel intent, inactive, remembered as paused. Power's lighting returns.
export function suspendStory(stories, id) {
  if (!id || !stories[id]?.active) return stories;
  const s = rememberCompleted(stories);
  s[id] = { ...MODULES[id].mod.cancelIntent(s[id]), active: false };
  if (!s.picker.suspended.includes(id)) s.picker.suspended.push(id);
  return s;
}
// Godot resume_existing(): no Begin/reset, route, timer, save or camera.
export function resumeExisting(stories, id, ctx = {}) {
  if (!stories.picker.suspended.includes(id) || activeEpisode(stories) != null || !isAvailable(id, ctx)) return stories;
  const s = clone(stories);
  s.picker.suspended = s.picker.suspended.filter(v => v !== id);
  s[id] = { ...MODULES[id].mod.cancelIntent(s[id]), active: true };
  return s;
}

// Open an episode screen as Godot <episode>.open_story() does. Power delegates to another
// active episode. Returns { stories, announce, refused? }.
export function openEpisode(stories, id, ctx = {}) {
  const current = activeEpisode(stories);
  if (id === 'power' && current && current !== 'power') return openEpisode(stories, current, ctx);
  if (stories[id].open) return { stories, announce: '' };
  const refusal = MODULES[id].mod.openRefusal(stories[id], withActive(stories, ctx));
  if (refusal) return { stories, announce: refusal, refused: true };
  const s = resumeExisting(stories, id, ctx);
  const r = MODULES[id].change(s[id], { type: 'open' }, withActive(s, ctx));
  return { stories: { ...s, [id]: r.state }, announce: r.announce, refused: !!r.refused };
}

// One episode action, with the picker-side effects Godot attaches to it: End remembers the win
// and forgets the pause; the dogs' reunion offers the lantern invitation. Returns
// { stories, announce, walk? } (walk: route the player there, then send 'arrived' / 'blocked').
export function changeEpisode(stories, id, action, ctx = {}) {
  if (action?.type === 'open') return openEpisode(stories, id, ctx);
  let s = stories;
  const ending = action?.type === 'end' || action?.type === 'unavailable' || action?.type === 'reset';
  if (ending && action.type === 'end' && stories[id].open) s = rememberCompleted(s);
  const r = MODULES[id].change(s[id], action, withActive(s, ctx));
  s = { ...s, [id]: r.state };
  if (ending) { s = clone(s); s.picker.suspended = s.picker.suspended.filter(v => v !== id); }
  if (r.reunited) s = offerLantern(s);
  // A refused route reopens the episode in Godot through open_story, which also resumes it.
  return { stories: s, announce: r.announce, walk: r.walk ?? null, refused: !!r.refused };
}

// Godot open_picker(). Closes a visible episode (remembered for Back to stories).
export function openPicker(stories, ctx = {}) {
  if (stories.picker.open) return { stories, announce: '' };
  if (!ctx.opened || ctx.startupCard || ctx.storyCard) return { stories, announce: '', refused: true };
  const visible = openEpisodeId(stories);
  if (ctx.busy && !visible) return { stories, announce: T.open_picker.refuse, refused: true };
  let s = clone(stories);
  const previous = visible ?? activeEpisode(stories);
  s.picker.returnStory = previous; s.picker.openedFromReader = !!visible;
  if (visible) s[visible] = { ...s[visible], open: false };
  s = rememberCompleted(s);
  s.picker.open = true;
  return { stories: s, announce: T.open_picker.announce + pickerView(s, ctx).text };
}
export function closePicker(stories) {
  if (!stories.picker.open) return stories;
  return { ...stories, picker: { ...stories.picker, open: false } };
}
// Godot back_to_stories().
export function backToStories(stories, ctx = {}) {
  const { returnStory, openedFromReader } = stories.picker;
  const s = closePicker(stories);
  if (openedFromReader && returnStory) return openEpisode(s, returnStory, ctx);
  return { stories: s, announce: T.back_to_stories.announce };
}
export function changePage(stories, delta) {
  const page = Math.max(0, Math.min(1, stories.picker.page + delta));
  return { ...stories, picker: { ...stories.picker, page } };
}
// Godot select_story(index): suspend the current owner, resume and open the chosen one; a refused
// open restores both and keeps the picker. Returns { stories, announce, ok }.
export function selectStory(stories, index, ctx = {}) {
  if (!stories.picker.open || !Number.isInteger(index) || index < 0 || index >= EPISODES.length) return { stories, announce: '', ok: false };
  const id = EPISODES[index];
  if (!isAvailable(id, ctx)) return { stories, announce: '', ok: false };
  const walkFree = { ...ctx, walking: false }; // Godot stop_walking() first
  const current = activeEpisode(stories);
  const prior = { returnStory: stories.picker.returnStory, openedFromReader: stories.picker.openedFromReader };
  let s = stories;
  if (current !== id) s = suspendStory(s, current);
  s = closePicker(s);
  s = resumeExisting(s, id, walkFree);
  const r = openEpisode(s, id, walkFree);
  if (!r.refused) return { stories: r.stories, announce: r.announce, ok: true };
  if (id !== current) s = suspendStory(s, id);
  if (current) s = resumeExisting(s, current, walkFree);
  s = openPicker(s, walkFree).stories;
  s = { ...s, picker: { ...s.picker, ...prior } };
  return { stories: s, announce: T.select_story.refused, ok: false };
}
// Godot follow_invitation().
export function followInvitation(stories, ctx = {}) {
  if (!stories.picker.open || !stories.picker.lanternInvited || !isAvailable('lantern', ctx)) return { stories, announce: '', ok: false };
  const r = selectStory(stories, EPISODES.indexOf('lantern'), ctx);
  if (r.ok) r.stories = { ...r.stories, picker: { ...r.stories.picker, invitationFollowed: true } };
  return r;
}
// Godot keep_exploring().
export function keepExploring(stories) {
  if (!stories.picker.open) return { stories, announce: '' };
  return { stories: closePicker(suspendStory(stories, activeEpisode(stories))), announce: T.keep_exploring.announce };
}
// Godot reset_visit(): restart or a loaded save clears every visit and invitation.
export const resetStories = () => initialStories();

// Godot refresh(): entries (two per page), the reader and the footer.
export function pickerView(stories, ctx = {}) {
  const P = stories.picker, R = T.refresh, page = Math.max(0, Math.min(1, P.page));
  const s = rememberCompleted(stories);
  const entries = EPISODES.map((id, i) => {
    const status = s[id].active ? R.continue : (P.suspended.includes(id) ? R.resume : R.visit);
    const label = status + ': ' + TITLES[i];
    return { index: i, id, label, name: label + R.entrySuffix, visible: Math.trunc(i / 2) === page, disabled: !isAvailable(id, ctx) };
  });
  const done = EPISODES.map((_, i) => s.picker.completed[i]).filter(v => v != null);
  let text = '';
  if (P.lanternInvited) text += R.invitation;
  if (done.length) text += R.completed + done.join(', ') + '.\n';
  text += web('story_picker.gd', R.detail);
  const follow = { label: T.setup.follow, name: T.setup.followName, visible: P.lanternInvited, disabled: !isAvailable('lantern', ctx) };
  const focus = follow.visible && !follow.disabled ? 'follow' : (!entries[page * 2].disabled ? `entry${page * 2}` : 'back');
  return {
    title: T.setup.title, text, entries, follow, focus,
    earlier: { label: T.setup.earlier, disabled: page === 0, rapid: true },
    later: { label: T.setup.later, disabled: page === 1, rapid: true },
    explore: { label: T.setup.explore }, back: { label: T.setup.back },
  };
}
// The "Other stories" button in every episode heading (Godot add_reader_entry), without Shift F8.
export const readerEntry = () => ({ label: T.add_reader_entry.label, name: web('story_picker.gd', T.add_reader_entry.name) });
// The one view function for whichever episode screen is open.
export function episodeView(stories, id, ctx = {}) {
  return MODULES[id].view(stories[id], withActive(stories, ctx));
}
// The objective of the active episode (Godot current_objective prefers it), or null.
export function activeObjective(stories, ctx = {}) {
  const id = activeEpisode(stories);
  return id ? MODULES[id].mod.objective(stories[id], withActive(stories, ctx)) : null;
}
