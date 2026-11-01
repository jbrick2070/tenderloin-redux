// The visits shell (Phase 3 wiring spec 3.3, WP2a): the one visit-only session of the side stories, their entries, and the screens
// of Before These Streets (godot/before_streets.gd), Cook & Share (shared_meal.gd) and the story picker (story_picker.gd). The four
// episode screens and the neighborhood visits are parts game.js passes in, createEpisodeScreens(kit) and createWorldVisits(kit)
// (visits-episodes.js, visits-world.js); without them inert parts stand in, so the shell also runs alone. Every word is a pure
// module's Godot text (visits/text.js). Nothing here is saved: the one saved field, state.surprises, changes only through host.act
// in the neighborhood part, and an adopted save or a restart starts the visit over through sync({ adopted: true }).
//
// host = the visits host of spec 3.2 (visits-kit.js lists it). Beside what the kit calls, this file uses modal (its cancel and close
// listeners, and where Field notes' buttons are), getState(), player(), walking(), stopWalk(), returnTo(id), close(), objective(),
// sparks(), hostingInProgress() and restoreStartupCard(text). The parts (missing members fall back to the inert ones):
//   createEpisodeScreens(kit) -> { render(id, { announce }), cancel(id), silentClose(id) }
//   createWorldVisits(kit) -> { objects, interact, conversationAction, openNotes, cancel, silentClose, scenePart, anchor, parkTrees,
//                               objectiveInputs, hinted, tick, reset, snapshot, notesHTML, bindNotes }
// session.from is the id of the control that opened the visits screens now in the dialog, where their Back, Escape and × return
// focus (null: the canvas, as after a walk, a map tap or an arrival). An episode opened from the picker keeps the control that
// opened the visit, as Godot's close_story falls back to the hub when the picker entry it came from is hidden.
import { createKit, btn, figure, frameHTML, sourceLinesHTML, pointerPress } from './visits-kit.js';
import { GODOT_TEXT, web } from './visits/text.js';
import { changeBefore, beforeView, readerText, artworkDataURI as beforeArt, idleEntryAvailable } from './visits/before-streets.js';
import { changeMeal, mealView, artworkDataURI as mealArt, worldDishes, sharedCount } from './visits/meal.js';
import * as picker from './visits/picker.js';
import { entryTooltip, powerScene, fixtureLit } from './visits/power.js';
import { dogsScene } from './visits/dogs.js';
import { lanternScene } from './visits/lantern.js';
import { electionScene } from './visits/election.js';
import { conversationLabel, progressLabel } from './visits/surprises.js';

const MAIN = GODOT_TEXT['main.gd'], CARD = MAIN.build_story_card, MAKE = MAIN.make_ui, HUB = MAIN.apply_hub_guidance, WALK = MAIN.update_walk_control;
const STORY = GODOT_TEXT['power_story.gd'].setup;
// Godot update_walk_control: the walk control's label and tooltip while an episode is active.
const RESUME = { power: [WALK.power, WALK.powerTip], dogs: [WALK.dogs, WALK.dogsTip], lantern: [WALK.lantern, WALK.lanternTip], election: [WALK.election, WALK.electionTip] };
// The entries of spec 3.7 in entries() order; Field notes' five neighborhood buttons (Godot's Shift+D, Shift+M and Shift+E, then
// the 2D controls for its park label tap and Shift+H, visits-world.js) and the control focus returns to from it.
const ENTRY = { before: 'before-entry', revisit: 'before-revisit', story: 'story-entry', meal: 'meal-entry', resume: 'story-resume', notes: 'notes-spot' };
const NOTES = ['notes-spot', 'notes-museum', 'notes-eateries', 'notes-park', 'notes-so-what'], JOURNAL = 'journal-button';
const PLACE = 'power_place', VOTING = 'voting_places';
const SILENT = { type: 'close', announce: false };
// power_story.gd update_world: seven street lamps, then three gathering lanterns.
const FIXTURES = Array.from({ length: 10 }, (_, i) => i);
const off = (view, id) => !!view.buttons.find(b => b.id === id)?.disabled;

// ---------- The inert parts ----------
const INERT_EPISODES = { render: () => false, cancel: () => false, silentClose: () => false };
const inertWorld = session => ({
  objects: () => [], interact: () => false, conversationAction: () => false, openNotes: () => false, cancel: () => false, silentClose: () => false,
  scenePart: () => ({}), anchor: () => null, parkTrees: () => [], objectiveInputs: () => ({ tour: session.world.tour, lastHinted: session.world.lastHinted }),
  hinted() {}, tick: () => false, reset() {}, snapshot: () => undefined, notesHTML: () => '', bindNotes: () => false,
});
// A part's own members, called on the part, over the inert ones.
function withDefaults(part, inert) {
  const out = {};
  for (const name of Object.keys(inert)) out[name] = (...args) => (typeof part?.[name] === 'function' ? part[name](...args) : inert[name](...args));
  return out;
}

export function createVisits(host, parts = {}) {
  const routes = {}, kit = createKit(host, undefined, routes), { session } = kit;
  const make = (factory, inert) => withDefaults(typeof factory === 'function' ? factory(kit) : null, inert);
  const episodes = make(parts.createEpisodeScreens, INERT_EPISODES), neighborhood = make(parts.createWorldVisits, inertWorld(session));
  // The kit's routes: Other stories and More stories open the picker, What's Next arriving at the episode target opens the active
  // episode, and the walk protocol reopens an episode through its own screen, its line in the status line.
  routes.openPicker = () => open('picker');
  routes.openResume = () => open('resume', { from: 'map' });
  routes.renderEpisode = (id, options) => episodes.render(id, options);
  const holds = kind => kit.holds(kind);
  const target = () => session.from ?? undefined;
  // A press acts only while its screen still holds the dialog. fn gets the click (pointerPress tells a pointer's from a key's).
  const press = (id, kind, fn) => kit.bind(id, event => { if (holds(kind)) fn(event); });
  // Where a chain of screens that starts here returns focus: 'map' is the canvas, a control id that control, else the entry.
  const returnFor = (from, entry) => (from === 'map' ? null : typeof from === 'string' && from ? from : entry);
  // Godot's open_meal and open_story also refuse over the startup card and a story card (startup_story_pending,
  // is_story_card_visible), which the shared ctx leaves out of busy (spec 3.5).
  const gateCtx = () => { const ctx = kit.ctx(); return { ...ctx, busy: ctx.busy || ctx.startupCard || ctx.storyCard }; };

  // ---------- Opening (spec 3.3) ----------
  // kind: 'before' (from 'startup' or 'notes'), 'meal', 'story' (Godot power_story.open_story), 'resume' (the active episode,
  // open_from_walking), 'picker', or 'notes-spot' | 'notes-museum' | 'notes-eateries' | 'notes-park' | 'notes-so-what' (the
  // neighborhood part's Field notes ways in).
  function open(kind, { from } = {}) {
    normalize();
    if (kind === 'before') return openBefore(from);
    if (kind === 'meal') return openMeal(returnFor(from, ENTRY.meal));
    if (kind === 'story') return openEpisode('power', returnFor(from, ENTRY.story), true);
    if (kind === 'resume') { const id = picker.activeEpisode(session.stories); return !!id && openEpisode(id, returnFor(from, ENTRY.resume), false); }
    if (kind === 'picker') return openPicker();
    if (NOTES.includes(kind)) return !!neighborhood.openNotes(kind);
    return false;
  }
  // Spec lesson 6: a screen replaced without a close event (the recovery offer, another screen in the same dialog) leaves module open
  // flags set, and the next open would return without drawing. With no visits screen holding the dialog, every flag closes without
  // a word (Godot close_*(false)), each part forgets its screen, and the chain forgets where focus was to return.
  function normalize() {
    if (holds()) return false;
    const card = session.screen === 'card' || session.world?.card != null;
    let changed = session.screen != null || session.from != null;
    session.screen = null; session.from = null;
    if (session.before.open) { session.before = changeBefore(session.before, SILENT).state; changed = true; }
    if (session.meal.open) { session.meal = changeMeal(session.meal, SILENT).state; changed = true; }
    if (session.stories.picker.open) { session.stories = picker.closePicker(session.stories); changed = true; }
    for (const id of picker.EPISODES) {
      if (!session.stories[id]?.open) continue;
      episodes.silentClose(id);
      if (session.stories[id]?.open) session.stories = picker.changeEpisode(session.stories, id, SILENT).stories;
      changed = true;
    }
    if (card) neighborhood.silentClose();
    if (changed) kit.bump();
    return changed;
  }

  // ---------- Before These Streets ----------
  // Godot open_opening: refused during a focused activity, a story visit, walking or a later chapter card. Field notes is the 2D
  // Info column, so its own dialog is not busy (kit.ctx({ from: 'notes' })). Focus: Send a gust, else Back.
  function openBefore(from) {
    const notes = from === 'notes', held = holds();
    const out = changeBefore(session.before, { type: 'open' }, notes ? kit.ctx({ from: 'notes' }) : kit.ctx());
    if (out.refused) { kit.say(out.announce); return false; }
    session.before = out.state; kit.bump();
    if (!held) session.from = notes ? JOURNAL : null;
    kit.focus(off(drawBefore(), 'gust') ? 'before-back' : 'before-gust');
    kit.say(out.announce);
    if (!held && session.from) host.returnTo(session.from);
    return true;
  }
  function drawBefore() {
    const b = session.before, v = beforeView(b);
    // The Sources view is Godot's reader text with its reading-reference URL lines as links (opened in a new tab, never fetched).
    const reader = b.sources ? { readerHTML: sourceLinesHTML(readerText(b).split('\n')) } : { reader: v.text };
    kit.show('before', frameHTML({ kind: 'before', credit: v.subtitle, title: v.title, picture: figure({ src: beforeArt(b.view, b.observation), alt: v.description }), ...reader,
      tray: v.buttons.map(x => btn({ ...x, id: `before-${x.id}` })).join('') }));
    // Godot set_view: Gust disabled focuses Changing shapes; Previous disabled under focus moves it to Gust. Sources focuses the reader.
    press('before-previous', 'before', () => stepBefore({ type: 'view', index: session.before.view - 1 }, w => (off(w, 'gust') ? 'before-shapes' : off(w, 'previous') ? 'before-gust' : 'before-previous')));
    press('before-gust', 'before', () => stepBefore({ type: 'view', index: session.before.view + 1 }, w => (off(w, 'gust') ? 'before-shapes' : 'before-gust')));
    press('before-shapes', 'before', () => stepBefore({ type: 'observe', index: 0 }, () => 'before-shapes'));
    press('before-time', 'before', () => stepBefore({ type: 'observe', index: 1 }, () => 'before-time'));
    press('before-sources', 'before', () => stepBefore({ type: 'sources' }, () => 'reader'));
    press('before-back', 'before', closeBefore);
    return v;
  }
  // One Godot action: the redraw, focus as Godot leaves it, then its refresh(true) announcement in the status line.
  function stepBefore(action, focusFor) {
    const out = changeBefore(session.before, action);
    if (out.state === session.before) return;
    session.before = out.state; kit.bump();
    kit.focus(focusFor(drawBefore()));
    kit.say(out.announce);
  }
  // Godot close_opening: from the startup card the card comes back in this same dialog with Start Exploring focused and the close
  // line in its status line; otherwise the dialog closes (to Field notes' button) and the line is a toast.
  function closeBefore() {
    const fromStartup = session.before.fromStartup, out = changeBefore(session.before, { type: 'close' });
    session.before = out.state;
    if (!fromStartup) { kit.leave(out.announce, target()); return; }
    const held = holds('before');
    session.screen = null; session.from = null; kit.bump();
    if (held) host.restoreStartupCard(out.announce); else kit.say(out.announce);
  }

  // ---------- Cook & Share ----------
  // Godot open_meal refusals in order (meal.js mealRefusal). Focus: the preparation.
  function openMeal(from) {
    const held = holds(), out = changeMeal(session.meal, { type: 'open' }, gateCtx());
    if (out.refused) { kit.say(out.announce); return false; }
    session.meal = out.state; kit.bump();
    if (!held) session.from = from;
    drawMeal();
    kit.focus('meal-prepare');
    kit.say(out.announce);
    if (!held && from) host.returnTo(from);
    return true;
  }
  // Godot's controls in its focus order: Previous and Next cook (rapid, as Godot marks them) in the pager above the heading,
  // picture and text they change (frameHTML), so a fast double press finds them in place; then the tray: the preparation, the
  // serving and placement rows (hidden once this preparation is shared), Share or Follow this invitation, and Keep exploring.
  function drawMeal() {
    const v = mealView(session.meal);
    const pager = [
      btn({ id: 'meal-previous', label: v.previous.label, name: v.previous.name, disabled: v.previous.disabled, rapid: true }),
      btn({ id: 'meal-next', label: v.next.label, name: v.next.name, disabled: v.next.disabled, rapid: true }),
    ].join('');
    const tray = [
      btn({ id: 'meal-prepare', label: v.prepare }),
      ...v.servings.map((choice, i) => btn({ ...choice, id: `meal-serving-${i}` })),
      ...v.placements.map((choice, i) => btn({ ...choice, id: `meal-placement-${i}` })),
      btn({ ...v.share, id: 'meal-share', primary: true }),
      btn({ id: 'meal-explore', label: v.explore }),
    ].join('');
    kit.show('meal', frameHTML({ kind: 'meal', credit: v.credit, title: v.heading, pager, picture: figure({ src: mealArt(v.art.index, v.art.stage, v.art.style), alt: v.description }), reader: v.text, tray }));
    // Godot select_cook focuses the preparation (from a pointer, without scrolling the pager away); advance focuses Share at
    // the fifth step; a choice keeps its own focus.
    press('meal-previous', 'meal', event => stepMeal({ type: 'previous' }, () => 'meal-prepare', pointerPress(event)));
    press('meal-next', 'meal', event => stepMeal({ type: 'next' }, () => 'meal-prepare', pointerPress(event)));
    press('meal-prepare', 'meal', () => stepMeal({ type: 'advance' }, m => (m.steps[m.selected] === 5 ? 'meal-share' : 'meal-prepare')));
    for (const i of [0, 1]) {
      press(`meal-serving-${i}`, 'meal', () => stepMeal({ type: 'serving', index: i }, () => `meal-serving-${i}`));
      press(`meal-placement-${i}`, 'meal', () => stepMeal({ type: 'placement', index: i }, () => `meal-placement-${i}`));
    }
    // share_or_follow: following the invitation selects the next cook (select_cook's focus); sharing keeps focus on Share.
    press('meal-share', 'meal', () => { const cook = session.meal.selected; stepMeal({ type: 'shareOrFollow' }, m => (m.selected === cook ? 'meal-share' : 'meal-prepare')); });
    press('meal-explore', 'meal', closeMeal);
  }
  // pointer: the press came from a pointer, so the focus moves without scrolling the dialog (kit.focus).
  function stepMeal(action, focusFor, pointer = false) {
    const out = changeMeal(session.meal, action);
    if (out.state === session.meal) return;
    session.meal = out.state; kit.bump();
    drawMeal();
    kit.focus(focusFor(session.meal), { scroll: !pointer });
    kit.say(out.announce);
  }
  // Godot close_meal(): Keep exploring and Escape; its line once the dialog has closed.
  function closeMeal() {
    const out = changeMeal(session.meal, { type: 'close' });
    session.meal = out.state;
    kit.leave(out.announce, target());
  }

  // ---------- The episodes (the episode part draws them) ----------
  // Godot <episode>.open_story(): Power delegates to another active episode (picker.openEpisode). The shell opens the episode in
  // the module, then the episode part draws it (render draws only an open episode) and says its line.
  function openEpisode(id, from, prefetch) {
    const held = holds(), out = picker.openEpisode(session.stories, id, gateCtx());
    if (out.refused) { kit.say(out.announce); return false; }
    session.stories = out.stories; kit.bump();
    const shown = picker.openEpisodeId(session.stories);
    if (!shown) return false;
    if (!held) session.from = from;
    if (!drawEpisode(shown, out.announce)) return false;
    if (!held && from) host.returnTo(from);
    // Spec 3.4: the first Story open fetches the place file (Power's Larkin view and the Election Walk read it). The episode screens
    // fetch and redraw what they show, so this starts only a fetch that nobody has started (idle) or that failed (error), quietly:
    // the hub shows nothing that needs the file, so Power's opening line stays and nothing is redrawn; a failure says nothing and
    // the next screen that needs the file loads it again with its own loading line.
    if (prefetch && ['idle', 'error'].includes(session.data[PLACE]?.status)) kit.ensureData([PLACE], null, { quiet: true });
    return true;
  }
  // A screen nothing drew (no episode part) closes again in the module, and its line is a toast, as the kit's walk protocol does.
  function drawEpisode(id, announce = '') {
    episodes.render(id, { announce });
    if (holds(id)) return true;
    if (session.stories[id]?.open) { session.stories = picker.changeEpisode(session.stories, id, SILENT).stories; kit.bump(); }
    kit.leave(announce, target());
    session.from = null;
    return false;
  }

  // ---------- The story picker ----------
  // Godot open_picker: silent without the block or over a card, refused over another activity unless an episode is on screen
  // (it closes that episode and remembers it for Back to stories). It needs both place files for the Election entry.
  function openPicker() {
    if (holds('picker')) return true;
    const check = picker.openPicker(session.stories, kit.ctx());
    if (check.refused) { kit.say(check.announce); return false; }
    host.stopWalk(); // Godot stop_walking(), once it may open; a visits trip is cancelled with it
    const out = picker.openPicker(session.stories, kit.ctx());
    if (out.refused) { kit.say(out.announce); return false; }
    session.stories = out.stories; kit.bump();
    drawPicker('view');
    kit.say(out.announce);
    kit.ensureData([PLACE, VOTING], () => drawPicker());
    return true;
  }
  // focus: 'view' (Godot's open-time focus), a control id, or nothing (game.js show keeps the focused control).
  function drawPicker(focus) {
    const v = picker.pickerView(session.stories, kit.ctx());
    const entries = v.entries.map(e => btn({ id: `picker-entry-${e.index}`, label: e.label, name: e.name, disabled: e.disabled, visible: e.visible })).join('');
    // Godot marks Earlier and Later rapid.
    const pages = btn({ id: 'picker-earlier', label: v.earlier.label, disabled: v.earlier.disabled, rapid: true })
      + btn({ id: 'picker-later', label: v.later.label, disabled: v.later.disabled, rapid: true });
    const footer = btn({ id: 'picker-follow', label: v.follow.label, name: v.follow.name, disabled: v.follow.disabled, visible: v.follow.visible })
      + btn({ id: 'picker-explore', label: v.explore.label }) + btn({ id: 'picker-back', label: v.back.label });
    kit.show('picker', frameHTML({ kind: 'picker', title: v.title, reader: v.text, extra: `<div class="visits-tray">${entries}${pages}</div>`, tray: footer }));
    for (const e of v.entries) if (e.visible) press(`picker-entry-${e.index}`, 'picker', () => select(e.index));
    press('picker-earlier', 'picker', event => turnPage(-1, pointerPress(event)));
    press('picker-later', 'picker', event => turnPage(1, pointerPress(event)));
    press('picker-follow', 'picker', follow);
    press('picker-explore', 'picker', keepExploring);
    press('picker-back', 'picker', backToStories);
    if (focus === 'view') kit.focus(v.focus === 'follow' ? 'picker-follow' : v.focus === 'back' ? 'picker-back' : v.focus.replace('entry', 'picker-entry-'));
    else if (focus) kit.focus(focus);
    return v;
  }
  // After a picker action: draw what the stories now show (an episode, else the picker), or go back to the street with the line.
  function present(announce) {
    const id = picker.openEpisodeId(session.stories);
    if (id) return drawEpisode(id, announce);
    if (session.stories.picker.open) { drawPicker('view'); kit.say(announce); return true; }
    kit.leave(announce, target());
    return false;
  }
  // Godot select_story: stop walking, suspend the owner, open the chosen story; a refused open restores the owner (picker.js).
  function select(index) {
    const id = picker.EPISODES[index];
    if (!id || !picker.isAvailable(id, kit.ctx())) return;
    host.stopWalk();
    const out = picker.selectStory(session.stories, index, kit.ctx());
    session.stories = out.stories; kit.bump();
    present(out.announce);
  }
  function follow() {
    if (!session.stories.picker.lanternInvited || !picker.isAvailable('lantern', kit.ctx())) return;
    host.stopWalk();
    const out = picker.followInvitation(session.stories, kit.ctx());
    session.stories = out.stories; kit.bump();
    present(out.announce);
  }
  // Godot change_page: no announcement; focus on the page's first entry, or Back to stories when it is unavailable (from a
  // pointer, without scrolling the dialog: Earlier and Later are rapid).
  function turnPage(delta, pointer = false) {
    session.stories = picker.changePage(session.stories, delta); kit.bump();
    const first = drawPicker().entries[session.stories.picker.page * 2];
    kit.focus(first && !first.disabled ? `picker-entry-${first.index}` : 'picker-back', { scroll: !pointer });
  }
  function keepExploring() {
    host.stopWalk();
    const out = picker.keepExploring(session.stories);
    session.stories = out.stories; kit.bump();
    present(out.announce);
  }
  // Godot back_to_stories (also Escape): the story the picker was opened from, else the street.
  function backToStories() {
    const out = picker.backToStories(session.stories, kit.ctx());
    session.stories = out.stories; kit.bump();
    present(out.announce);
  }

  // ---------- Escape, ×, and the visit's lifetime ----------
  // Escape: the dialog's cancel event runs the held screen's own Godot action (its default would close the dialog without it). A
  // part that leaves its screen held is closed for it.
  host.modal.addEventListener('cancel', event => {
    const screen = session.screen;
    if (!screen || !holds(screen)) return;
    event.preventDefault();
    if (screen === 'before') closeBefore();
    else if (screen === 'meal') closeMeal();
    else if (screen === 'picker') backToStories();
    else if (screen === 'card') { neighborhood.cancel(); if (holds('card')) { neighborhood.silentClose(); kit.leave('', target()); } }
    else if (picker.EPISODES.includes(screen)) {
      episodes.cancel(screen);
      if (holds(screen)) { const out = picker.changeEpisode(session.stories, screen, { type: 'close' }, kit.ctx()); session.stories = out.stories; kit.leave(out.announce, target()); }
    }
  });
  // × or any other close: the screens are gone, their flags close silently, and the next open() draws them again.
  host.modal.addEventListener('close', () => { normalize(); });

  // After every state change (game.js updateUI), and with adopted: true from game.js resetSession (a restart or an adopted save).
  // Godot _process: an active episode that is no longer available stops (Power ends and the dogs reset in place; the procession and
  // the election walk reset and close), and Cook & Share closes once the block is not open; a meal or episode screen that goes then
  // closes the dialog without a word, focus to the canvas. An episode's walk ends with it: host.stopWalk() stops the game's walk,
  // which cancels the trip without a word (walkCancelled; a cancel is idempotent). Never act, updateUI or a draw.
  function sync({ adopted = false } = {}) {
    if (adopted) { const held = holds(); reset(); if (held) host.close(); return { reset: true, closed: held }; }
    const opened = host.getState()?.opened === true;
    if (opened && !picker.activeEpisode(session.stories)) return { reset: false, closed: false };
    const held = holds(), screen = session.screen, episode = picker.EPISODES.includes(screen), ctx = kit.ctx();
    let changed = false;
    for (const id of picker.EPISODES) {
      if (!session.stories[id].active || picker.isAvailable(id, ctx)) continue;
      session.stories = picker.changeEpisode(session.stories, id, { type: 'unavailable' }, ctx).stories; changed = true;
      if (session.trip === id) host.stopWalk();
    }
    if (!opened && session.meal.open) { session.meal = changeMeal(session.meal, SILENT).state; changed = true; }
    const gone = held && (screen === 'meal' ? !session.meal.open : episode && (!opened || !session.stories[screen].open));
    if (gone) {
      if (episode) { episodes.silentClose(screen); if (session.stories[screen].open) session.stories = picker.changeEpisode(session.stories, screen, SILENT).stories; }
      session.screen = null; session.from = null; changed = true;
    }
    if (changed) kit.bump();
    if (gone) host.close();
    return { reset: false, closed: gone };
  }
  // Godot reset_visit for every side story: a fresh session in this same object, the dialog untouched.
  function reset() { kit.resetSession(); neighborhood.reset(); }

  // ---------- scene() (spec 3.8) ----------
  // The world part keeps its parts' identities; each actor part here is rebuilt only when its own visit state changes, so sprites.js
  // builds each part's drawing once (spec risk R9). The whole scene is kept while the session, the state and the player stand still.
  const kept = new Map();
  function part(name, inputs, build) {
    const last = kept.get(name);
    if (last && inputs.every((value, i) => value === last.inputs[i])) return last.value;
    const value = build();
    kept.set(name, { inputs, value });
    return value;
  }
  let shown = null;
  function scene() {
    const state = host.getState() || {}, at = host.player() || {}, version = session.version;
    if (shown && shown.version === version && shown.state === state && shown.x === at.x && shown.y === at.y) return shown.scene;
    const s = session.stories, opened = state.opened === true, storyActive = picker.activeEpisode(s) != null;
    const value = {
      ...neighborhood.scenePart(),
      dishes: part('dishes', [session.meal, opened, storyActive], () => worldDishes(session.meal, { opened, storyActive })),
      dogs: part('dogs', [s.dogs], () => dogsScene(s.dogs)),
      lantern: part('lantern', [s.lantern], () => lanternScene(s.lantern)),
      power: part('power', [s.power], () => ({ ...powerScene(s.power), fixtures: FIXTURES.map(i => fixtureLit(s.power, i)) })),
      election: part('election', [s.election], () => electionScene(s.election)),
      player: { x: at.x, y: at.y },
    };
    shown = { version, state, x: at.x, y: at.y, scene: value };
    return value;
  }

  // ---------- story.js's inputs and the snapshot ----------
  // Godot current_objective prefers the active episode's objective; the tour and the last hint are the neighborhood part's.
  function objectiveInputs() {
    const episode = picker.activeEpisode(session.stories) ? picker.activeObjective(session.stories, kit.ctx()) : null, inputs = neighborhood.objectiveInputs() ?? {};
    return { episode, tour: inputs.tour, lastHinted: inputs.lastHinted };
  }
  function snapshot() {
    const w = session.world, world = neighborhood.snapshot();
    return {
      screen: session.screen, ...structuredClone({ before: session.before, meal: session.meal, stories: session.stories }),
      world: world && typeof world === 'object' ? world : structuredClone({ tour: w.tour, guideIdx: w.guideIdx, lastHinted: w.lastHinted }),
      trip: session.trip, data: { power_place: session.data[PLACE].status, voting_places: session.data[VOTING].status },
    };
  }

  // ---------- Entries (spec 3.7): game.js places their markup and binds it here ----------
  function entry(kind) {
    const make = (label, description = '', visible = true, extra = {}) => ({ id: ENTRY[kind], label, description, visible, locked: false, suggested: false, ...extra });
    const state = host.getState() || {}, opened = state.opened === true;
    switch (kind) {
      case 'before': return make(CARD.before, CARD.beforeName);
      // Godot idle_entry_available with Field notes counted as neither busy nor a side panel: only a story visit or walking hides it.
      case 'revisit': return make(MAKE.beforeRevisit, '', idleEntryAvailable({ ...kit.ctx({ from: 'notes' }), sidePanel: false, startupCard: false, storyCard: false }));
      case 'story': return make(STORY.story, web('power_story.gd', entryTooltip()), opened);
      case 'meal': {
        // Godot apply_hub_guidance: suggested on the explore objective while fewer than four dishes are shared, locked until the
        // block opens or while hosting is in progress, the hint joined to the meal's own line. 2D never dims it (4.5:1 contrast).
        const suggested = opened && host.objective()?.id === 'explore' && sharedCount(session.meal) < 4, locked = !opened || !!host.hostingInProgress();
        const hint = suggested ? HUB.suggested : locked ? HUB.locked : '';
        return make(MAKE.meal, hint + (hint ? HUB.joiner : '') + HUB.meal, opened, { locked, suggested });
      }
      case 'resume': { const id = picker.activeEpisode(session.stories), [label, tip] = RESUME[id] ?? ['', '']; return make(label, tip, !!id && !host.walking()); }
      case 'notes': { const found = Array.isArray(state.surprises) ? state.surprises : []; return make(conversationLabel(found), progressLabel(found, host.sparks())); }
      default: return null;
    }
  }
  const entries = () => Object.fromEntries(Object.keys(ENTRY).map(kind => [kind, entry(kind)]));
  function entryHTML(kind) {
    if (kind === 'notes') return neighborhood.notesHTML() ?? '';
    const e = Object.hasOwn(ENTRY, kind) ? entry(kind) : null;
    if (!e?.visible) return '';
    // The startup entry's Godot accessibility name; the hub buttons' and the walk control's tooltip (description and title).
    return kind === 'before' ? btn({ id: e.id, label: e.label, name: e.description }) : btn({ id: e.id, label: e.label, tooltip: e.description || undefined });
  }
  const OPENS = { before: () => open('before', { from: 'startup' }), revisit: () => open('before', { from: 'notes' }), story: () => open('story'), meal: () => open('meal'), resume: () => open('resume') };
  const bound = new WeakSet();
  function bindOnce(id, fn) {
    const el = kit.$(id);
    if (!el || bound.has(el)) return false;
    bound.add(el); el.addEventListener('click', fn);
    return true;
  }
  function bindEntry(kind) {
    // Field notes' neighborhood buttons go through open(), so stale flags close first; each acts only while it is in the open
    // dialog (Field notes may have been replaced since it was drawn). Each opens a card in Field notes' place, so a held Enter or
    // Space never presses one again (kit.noRepeat, once per button).
    if (kind === 'notes') {
      return NOTES.map(id => {
        const bound = bindOnce(id, () => { const el = kit.$(id); if (el && host.modal.open && host.modal.contains(el)) open(id, { from: 'notes' }); });
        if (bound) kit.noRepeat([id]);
        return bound;
      }).every(Boolean);
    }
    return Object.hasOwn(OPENS, kind) && bindOnce(ENTRY[kind], OPENS[kind]);
  }

  return {
    open, entries, entryHTML, bindEntry,
    conversationAction: (kind, partner) => !!neighborhood.conversationAction(kind, partner),
    objects: world => neighborhood.objects(world) ?? [],
    interact: (object, how) => !!neighborhood.interact(object, how),
    scene, anchor: id => neighborhood.anchor(id) ?? null, objectiveInputs, hinted: id => neighborhood.hinted(id),
    walkEnded: () => kit.walkEnded(), walkCancelled: () => kit.walkCancelled(),
    // Per frame (game.js renderFrame): the lantern trip, then the tour's completion (world: the World, for its overview check; the
    // neighborhood part keeps the last one objects() saw). True when either changed something.
    tick(now, world) { const moved = kit.tickTrip(), toured = neighborhood.tick(now, world); return !!(moved || toured); },
    sync, reset, holds: () => holds(), snapshot,
  };
}
