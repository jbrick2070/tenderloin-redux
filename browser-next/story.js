// Chapters, the chapter card and the Next objective, ported from godot/main.gd current_chapter,
// current_objective, ask_whats_next, update_objective_ui, show_story_card,
// consume_chapter_announcement and compass_phrase. Godot text is copied verbatim
// (tests/next-story.test.mjs fails on drift); WEB_OVERRIDES drops Godot's key hints and names the
// mural where Godot names Celeste's easel, which 2D does not have.
//
// state: the fork state (classic initialState() shape plus visited, celesteTalks and surprises),
// never the Godot envelope: pass the state parseGodotSave returns. world: { player: {x, y}, neighbors:
// [{id, name, x, y}], places: {mural, history, blackhawk} }, in 2D map pixels: neighbors is world.js
// NEIGHBORS, places is PLACES keyed by id (an array works too). The visit-only side stories add
// episode (the active episode's objective, visits/picker.js activeObjective, or null), tour
// (visits/landmarks.js), lastHinted and openNeighborId (Godot last_hinted_surprise_id and the
// open conversation). Missing pieces fall back to state.player, the fork's start, Godot's names,
// a fresh tour and a null target.
import { ORIGIN, PIXELS_PER_METRE, project, initialState } from './core.js';
import { exploreObjective, initialTour } from './visits/landmarks.js';
import { SURPRISE_IDS, neighborHint } from './visits/surprises.js';

export const STORY_CHAPTERS = [
  { num: 1, title: 'Get the Block Ready', intro: 'An afternoon at Turk & Taylor. You live on this block, and your neighbors have already started planning a small gathering. Bea has a plan, Celeste brought paint, Rook knows sound, Dez has a beat, and Thanh is lending supplies. Help them get the block ready. The gathering and the neighbors are fictional; the streets and the history are real.' },
  { num: 2, title: 'The Gathering', intro: 'The block is open. Take a group photo with whoever wants to be in it, then help give back what was borrowed.' },
  { num: 3, title: 'Another Afternoon', intro: 'Your neighbors want to do it again. Plan the schedule together, then host it: stories, rhythm, shared art, and a quiet pause.' },
  { num: 4, title: 'A Listening Hour', intro: 'Some neighbors want to talk about repairs and shared space. Help set up a peaceful listening circle where everyone gets heard.' },
  { num: 5, title: 'The Open Seat', intro: 'Celeste and Dez want to make a tiny three-shot film about keeping a seat open for someone new.' },
  { num: 6, title: 'Your Block', intro: 'Everything you started is part of the block now. Wander, revisit the history stops, or just stop and say hi.' },
];
export const MURAL_MOTIFS = ['sun', 'wave', 'rise'];
export const LOAN_IDS = ['table', 'paint-case', 'speaker'];
export const LOAN_OWNERS = { table: 'thanh', 'paint-case': 'celeste', speaker: 'rook' };
export const LOAN_TITLES = { table: "Thanh's folding table", 'paint-case': "Celeste's paint case", speaker: "Rook's speaker" };
export const GATHERING_LAYOUTS = ['table', 'floor'];
export const GATHERING_LAYOUT_TITLES = { table: 'Long Table', floor: 'Open Floor' };
export const PROGRAMME_SEGMENTS = ['stories', 'beats', 'art', 'pause'];
export const PROGRAMME_TITLES = { stories: 'Story circle', beats: 'Rhythm workshop', art: 'Shared art panel', pause: 'Quiet interval' };
export const NEIGHBOR_IDS = ['bea', 'celeste', 'rook', 'dez', 'thanh'];
export const NEIGHBOR_NAMES = { bea: 'Bea', celeste: 'Celeste', rook: 'Rook', dez: 'Dez', thanh: 'Thanh' };
export const NARROW_WIDTH = 600; // Godot SIDE_HUB_MIN_WIDTH: the chapter line is narrow below it.
export const COMPASS_SECTORS = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
export const OBJECTIVE_IDS = ['meet', 'layout', 'mural', 'soundcheck', 'open', 'photo', 'pack', 'return', 'programme', 'civic', 'film', 'comptons', 'blackhawk', 'explore'];

// Every Godot literal this module copies, grouped by the Godot function that holds it.
export const GODOT_TEMPLATES = {
  current_objective: {
    meet: 'Meet %s (%d/%d neighbors met)',
    meetHint: '%s is %s. Go say hello!',
    layout: "Choose the gathering: Bea's Long Table or Dez & Celeste's Open Floor",
    layoutHint: 'Bea wants a Long Table for stories and conversation. Dez and Celeste want an Open Floor for art and music. Both keep the sidewalk clear. Which should we set up?',
    mural: "Paint Sun, Wave and Rise on Celeste's easel (%d/3)",
    muralHint: "Celeste's easel is %s. Add all three motifs.",
    soundcheck: 'Run a soundcheck with Rook',
    soundcheckHint: "Rook's speaker is %s. One soundcheck and we're ready.",
    open: 'Open the block party with Bea (O)',
    openHint: "Everyone has met, the mural is painted, and the sound is checked. Let's open the block party!",
    photo: 'Take the group keepsake photo (Y)',
    photoHint: "Let's take a group photo by the mural. Rook would rather stay off camera.",
    pack: 'Pack up the borrowed gear (Y)',
    packHint: 'Time to pack up and give back what we borrowed.',
    return: 'Return %s (Y) · %d/3 returned',
    returnHint: 'Next, return %s. %s is %s.',
    plan: 'Plan the party schedule with Bea (Z)',
    startHosting: 'Start hosting the afternoon (Z)',
    hostNext: 'Host the next activity: %s (Z) · %d/4',
    programmeHint: "Let's line up the afternoon: stories, rhythm, shared art, and a quiet pause.",
    civic: 'Hold the tenant listening circle (Q)',
    civicHint: "Let's hold a peaceful tenant listening circle so every neighbor is heard.",
    film: 'Make the short film The Open Seat (.)',
    filmHint: 'Celeste and I want to make a little three-shot film. Want to help?',
    comptons: "Read the Compton's Cafeteria plaque at Turk & Taylor (J)",
    comptonsHint: "The Compton's Cafeteria plaque at Turk & Taylor is %s.",
    blackhawk: 'Visit the former Black Hawk jazz club at Turk & Hyde (H)',
    blackhawkHint: 'The Black Hawk site at Turk & Hyde is %s.',
  },
  ask_whats_next: {
    layoutBea: "I'd love a Long Table for stories and conversation. Dez and Celeste want an Open Floor for art and music. Both keep the sidewalk clear. What do you think?",
    layoutOpenFloor: "Bea wants a Long Table for stories and conversation. We'd love an Open Floor for art and music. Both keep the sidewalk clear. Your call!",
  },
  conversation_partner_line: { line: '%s: "%s"' },
  update_objective_ui: { narrow: 'Ch. %d · Next: %s', wide: 'Chapter %d: %s · Next: %s' },
  show_story_card: { title: 'Chapter %d · %s', startup: 'Start Exploring', resume: 'Continue' },
  consume_chapter_announcement: { announcement: 'Chapter %d: %s. %s' },
  compass_phrase: { here: 'right here', metres: 'about %d m %s', block: 'about a block %s', blocks: 'about %d blocks %s' },
};
// Godot template -> 2D text. 2D binds none of Godot's keys, so each key hint is dropped, and 2D
// paints on the mural where Godot has Celeste's easel.
export const WEB_OVERRIDES = {
  "Paint Sun, Wave and Rise on Celeste's easel (%d/3)": 'Paint Sun, Wave and Rise on the mural (%d/3)',
  "Celeste's easel is %s. Add all three motifs.": 'The mural is %s. Add all three motifs.',
  'Open the block party with Bea (O)': 'Open the block party with Bea',
  'Take the group keepsake photo (Y)': 'Take the group keepsake photo',
  'Pack up the borrowed gear (Y)': 'Pack up the borrowed gear',
  'Return %s (Y) · %d/3 returned': 'Return %s · %d/3 returned',
  'Plan the party schedule with Bea (Z)': 'Plan the party schedule with Bea',
  'Start hosting the afternoon (Z)': 'Start hosting the afternoon',
  'Host the next activity: %s (Z) · %d/4': 'Host the next activity: %s · %d/4',
  'Hold the tenant listening circle (Q)': 'Hold the tenant listening circle',
  'Make the short film The Open Seat (.)': 'Make the short film The Open Seat',
  "Read the Compton's Cafeteria plaque at Turk & Taylor (J)": "Read the Compton's Cafeteria plaque at Turk & Taylor",
  'Visit the former Black Hawk jazz club at Turk & Hyde (H)': 'Visit the former Black Hawk jazz club at Turk & Hyde',
};
// Fork-only text: the compass phrase when a point is missing.
export const FORK_TEXT = { nearby: 'nearby' };

const T = GODOT_TEMPLATES.current_objective;
const list = value => Array.isArray(value) ? value : [];
const isPoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const roundHalfAway = v => Math.sign(v) * Math.round(Math.abs(v));
// The 2D map frame comes from the fork's core.js: project() turns Turk to the screen at
// PIXELS_PER_METRE. It is read on first use. core.js must not import this module: its visits
// modules load history.js, which calls project() at load.
let frame = null;
function mapFrame() {
  if (!frame) {
    const o = project(ORIGIN), e = project({ lat: ORIGIN.lat, lon: ORIGIN.lon + 0.001 });
    frame = { rotation: Math.atan2(e.y - o.y, e.x - o.x), scale: PIXELS_PER_METRE, start: { ...initialState().player } };
  }
  return frame;
}
// A save envelope has Godot's field names; reading it as fork state would quietly give Chapter 1.
function forkState(state) {
  if (state && typeof state === 'object' && (Object.hasOwn(state, 'block_opened') || Object.hasOwn(state, 'visited_neighbors'))) {
    throw new TypeError('story.js reads fork state, not a Godot save envelope: pass the state parseGodotSave returns');
  }
  return state ?? {};
}

export function fmt(template, ...args) {
  let i = 0;
  return template.replace(/%[sd]/g, spec => { const v = args[i++]; return spec === '%d' ? String(Math.trunc(Number(v))) : String(v); });
}
export const webText = template => Object.hasOwn(WEB_OVERRIDES, template) ? WEB_OVERRIDES[template] : template;
const say = (template, ...args) => fmt(webText(template), ...args);
// Godot programme_title: a segment's name. programme.js programmeTitle(order) is the poster headline.
export const segmentTitle = id => Object.hasOwn(PROGRAMME_TITLES, id) ? PROGRAMME_TITLES[id] : String(id);
export const isNarrow = width => Number.isFinite(width) && width < NARROW_WIDTH;

// Godot's plain-language direction, from 2D pixels: undo the map rotation, then +x east, -y north.
export function compassPhrase(from, to) {
  const C = GODOT_TEMPLATES.compass_phrase;
  if (!isPoint(from) || !isPoint(to)) return FORK_TEXT.nearby;
  const { rotation, scale } = mapFrame(), dx = to.x - from.x, dy = to.y - from.y, c = Math.cos(rotation), s = Math.sin(rotation);
  const east = (dx * c + dy * s) / scale, north = (dx * s - dy * c) / scale, dist = Math.hypot(east, north);
  if (!Number.isFinite(dist)) return FORK_TEXT.nearby;
  if (dist < 10) return C.here;
  const dir = COMPASS_SECTORS[((roundHalfAway(Math.atan2(north, east) / (Math.PI / 4)) % 8) + 8) % 8];
  if (dist < 100) return fmt(C.metres, Math.round(dist / 10) * 10, dir);
  const blocks = Math.round(dist / 145);
  return blocks <= 1 ? fmt(C.block, dir) : fmt(C.blocks, blocks, dir);
}

export const isEpilogueDone = state => state?.opened === true && state.epilogue?.packing === true && LOAN_IDS.every(id => list(state.epilogue.returned).includes(id));
export const isHostingDone = state => list(state?.hosting?.order).length === PROGRAMME_SEGMENTS.length && list(state?.hosting?.results).length === PROGRAMME_SEGMENTS.length;
export function currentHostingActivity(hosting) {
  const order = list(hosting?.order), results = list(hosting?.results);
  return order.length !== PROGRAMME_SEGMENTS.length || results.length >= order.length ? '' : order[results.length];
}

// The furthest gate reached wins: projects may be done in any order after opening.
export function currentChapter(state) {
  const s = forkState(state);
  let idx = 0;
  if (s.opened === true) {
    idx = 1;
    if (isEpilogueDone(s) || list(s.programme?.published).length || list(s.hosting?.order).length) idx = 2;
    if (isHostingDone(s)) idx = 3;
    if (s.civic?.phase === 'done') idx = 4;
    if (s.film?.phase === 'done') idx = 5;
  }
  return idx;
}
export const storyChapter = state => STORY_CHAPTERS[currentChapter(state)];

// A point an objective walks to that is no neighbor or place: a visits object ({id, kind: 'visit', name, x, y}).
const visitTarget = (id, name, point) => isPoint(point) ? { id, kind: 'visit', name, x: point.x, y: point.y } : null;
// An active story episode's objective (visits/picker.js activeObjective), as the fork's goal shape.
const episodeGoal = o => ({ id: o.id, text: o.text, hint: o.hint, target: o.hasTarget ? visitTarget('episode', o.targetName, o.target) : null, neighbor: null });
// Godot current_objective's chapter 6 tail (visits/landmarks.js exploreObjective): the next surprise, the landmark tour, then
// the final line. While surprises remain, speakerHints holds each neighbor's ask_whats_next hint ({hint, lastHinted}).
function exploreGoal(found, world, p) {
  const o = exploreObjective(found, world?.tour ?? initialTour(), { player: p, openNeighborId: world?.openNeighborId ?? null, lastHinted: world?.lastHinted ?? '', compass: compassPhrase });
  const target = o.hasTarget ? visitTarget(o.surpriseId ? `surprise:${o.surpriseId}` : `tour:${o.tourId}`, o.targetName, o.target) : null;
  const speakerHints = found.length < SURPRISE_IDS.length ? Object.fromEntries(NEIGHBOR_IDS.map(id => [id, neighborHint(found, id, { player: p, compass: compassPhrase })])) : null;
  return { id: 'explore', text: o.text, hint: o.hint, target, neighbor: null, surpriseId: o.surpriseId ?? '', tourId: o.tourId ?? '', tourAction: o.tourAction ?? '', speakerHints };
}

// {id, text, hint, target, neighbor}: target is the world object to walk to (or null). As in
// Godot, neighbor is the id of who can help (or null), not who says the hint: see whatsNextLine.
// An active episode comes first. The explore goal adds surpriseId, tourId, tourAction and speakerHints.
export function nextObjective(state, world = {}) {
  const s = forkState(state), p = isPoint(world?.player) ? world.player : isPoint(s.player) ? s.player : mapFrame().start;
  const person = id => list(world?.neighbors).find(n => n?.id === id) ?? null;
  const nameOf = id => person(id)?.name ?? NEIGHBOR_NAMES[id];
  const place = id => (Array.isArray(world?.places) ? world.places.find(item => item?.id === id) : world?.places?.[id]) ?? null;
  const where = target => compassPhrase(p, target);
  const goal = (id, text, hint, target, neighbor = null) => ({ id, text, hint, target: target ?? null, neighbor });
  if (world?.episode && typeof world.episode === 'object') return episodeGoal(world.episode);
  if (s.opened !== true) {
    const visited = new Set(list(s.visited).filter(id => NEIGHBOR_IDS.includes(id)));
    let best = null, bestD = Infinity;
    for (const id of NEIGHBOR_IDS) {
      if (visited.has(id)) continue;
      const n = person(id), d = isPoint(n) ? Math.hypot(n.x - p.x, n.y - p.y) : Infinity;
      if (best === null || d < bestD) { best = id; bestD = d; }
    }
    if (best) return goal('meet', say(T.meet, nameOf(best), visited.size, NEIGHBOR_IDS.length), say(T.meetHint, nameOf(best), where(person(best))), person(best), best);
    if (!GATHERING_LAYOUTS.includes(s.layout)) return goal('layout', say(T.layout), say(T.layoutHint), person('bea'), 'bea');
    const placed = MURAL_MOTIFS.filter(id => s.mural?.[id]).length;
    if (placed < MURAL_MOTIFS.length) return goal('mural', say(T.mural, placed), say(T.muralHint, where(place('mural'))), place('mural'), 'celeste');
    // Talking to Rook is the soundcheck in the fork, so Rook stands in for Godot's speaker marker.
    if (s.soundcheck !== true) return goal('soundcheck', say(T.soundcheck), say(T.soundcheckHint, where(person('rook'))), person('rook'), 'rook');
    return goal('open', say(T.open), say(T.openHint), person('bea'), 'bea');
  }
  const epilogue = s.epilogue ?? {}, returned = LOAN_IDS.filter(id => list(epilogue.returned).includes(id));
  if ((epilogue.photo?.status ?? 'unasked') === 'unasked' && epilogue.packing !== true) return goal('photo', say(T.photo), say(T.photoHint), person('bea'), 'bea');
  if (!isEpilogueDone(s)) {
    if (epilogue.packing !== true) return goal('pack', say(T.pack), say(T.packHint), person('thanh'), 'thanh');
    const loan = LOAN_IDS.find(id => !returned.includes(id)), owner = LOAN_OWNERS[loan];
    return goal('return', say(T.return, LOAN_TITLES[loan], returned.length), say(T.returnHint, LOAN_TITLES[loan], nameOf(owner), where(person(owner))), person(owner), owner);
  }
  if (!isHostingDone(s)) {
    const published = list(s.programme?.published), order = list(s.hosting?.order);
    const text = published.length === PROGRAMME_SEGMENTS.length && !order.length ? say(T.startHosting)
      : order.length ? say(T.hostNext, segmentTitle(currentHostingActivity(s.hosting)), list(s.hosting?.results).length) : say(T.plan);
    return goal('programme', text, say(T.programmeHint), person('bea'), 'bea');
  }
  if (s.civic?.phase !== 'done') return goal('civic', say(T.civic), say(T.civicHint), person('bea'), 'bea');
  if (s.film?.phase !== 'done') return goal('film', say(T.film), say(T.filmHint), person('dez'), 'dez');
  if (s.history !== true) return goal('comptons', say(T.comptons), say(T.comptonsHint, where(place('history'))), place('history'));
  if (s.blackhawk !== true) return goal('blackhawk', say(T.blackhawk), say(T.blackhawkHint, where(place('blackhawk'))), place('blackhawk'));
  return exploreGoal(list(s.surprises), world, p);
}

// ask_whats_next: the speaker is the neighbor being talked to, else the nearest one in reach; the
// caller picks it (null for nobody). Bea and the Open Floor pair pitch the layout in their own words;
// on the explore objective a neighbor names the next surprise of their own pair first.
export function hintFor(goal, speakerId = null) {
  const A = GODOT_TEMPLATES.ask_whats_next;
  if (goal?.id === 'layout' && speakerId === 'bea') return A.layoutBea;
  if (goal?.id === 'layout' && (speakerId === 'dez' || speakerId === 'celeste')) return A.layoutOpenFloor;
  const hints = goal?.id === 'explore' && Object.hasOwn(NEIGHBOR_NAMES, speakerId) ? goal.speakerHints : null;
  const spoken = hints && Object.hasOwn(hints, speakerId) ? hints[speakerId] : null;
  return typeof spoken?.hint === 'string' ? spoken.hint : String(goal?.hint ?? '');
}
export function whatsNextLine(goal, speakerId = null) {
  const hint = hintFor(goal, speakerId);
  return Object.hasOwn(NEIGHBOR_NAMES, speakerId) ? fmt(GODOT_TEMPLATES.conversation_partner_line.line, NEIGHBOR_NAMES[speakerId], hint) : hint;
}

// 'Chapter N: Title · Next: …' at NARROW_WIDTH and wider, 'Ch. N · Next: …' below it. A boolean
// narrow wins over width; with neither the line is wide.
export function chapterLine(state, opts) {
  const o = opts ?? {}, narrow = typeof o.narrow === 'boolean' ? o.narrow : isNarrow(o.width);
  const chapter = storyChapter(state), next = nextObjective(state, o.world).text, U = GODOT_TEMPLATES.update_objective_ui;
  return narrow ? fmt(U.narrow, chapter.num, next) : fmt(U.wide, chapter.num, chapter.title, next);
}

// The startup card shows on every load. After it, a card is due whenever the chapter number differs
// from the last one shown, a drop after a restart or an import included. Godot waits while a
// focused panel is open, so callers skip the check while a dialog is open. Nothing here is saved.
export const chapterCardDue = (lastShown, state) => Number.isInteger(lastShown) && lastShown >= 0 && storyChapter(state).num !== lastShown;
// Session notices (Godot's loan and rhythm completions) go in front exactly as given. Godot leaves
// the loan notice off the startup card.
export function chapterAnnouncement(state, notice = '') {
  const chapter = storyChapter(state);
  return (typeof notice === 'string' ? notice : '') + fmt(GODOT_TEMPLATES.consume_chapter_announcement.announcement, chapter.num, chapter.title, chapter.intro);
}
export function chapterCard(state, opts) {
  const { startup = false, notice = '' } = opts ?? {}, chapter = storyChapter(state), C = GODOT_TEMPLATES.show_story_card;
  return {
    num: chapter.num,
    title: fmt(C.title, chapter.num, chapter.title),
    body: chapter.intro,
    button: startup === true ? C.startup : C.resume,
    announcement: chapterAnnouncement(state, notice),
  };
}
