// The neighborhood world of the side stories (Phase 3 wiring spec 3.10, WP2c; 1.2 features 8 and 9): the ten surprise beacons,
// the landmark tour and its gold marker (decision D9), the museum's Time-Portal, Boeddeker Park, the "So What" awning and the six
// fictional eateries. Godot inspects them from a distance and fills its non-modal Info panel; here each inspect shows the same
// lines on a visit card (decision D1), opened by a map tap, E/Enter, a What's Next arrival, a conversation action or Field notes.
// Every word comes from visits/text.js through the pure modules, or is the kit's declared fork text.
//
// Only the finds are saved, and only through host.act({ type: 'surprise', id }), which runs before anything else: the camera, the
// card, the bubble and a chime come after it (the three host calls each wrapped), and every count, spark and receipt is read after
// it returns (spec 4, lessons 1 and 4). The tour, the surprise guide index and the last hint are the visit session's
// (session.world), never saved.
//
// createWorldVisits(kit) -> {
//   objects(world)                     hit-test objects { id, kind: 'visit', name, x, y }; no beacons while the camera is in an overview
//   interact(object, how)              a tap, E/Enter ('talk') or an arrival ('walk') on one of them or on an objective target
//                                      (tour:<stop>, episode)
//   conversationAction(kind, partner)  'surprise' | 'museum' | 'eateries' | 'landmark_tour' (Godot run_conversation_action_id)
//   openNotes(kind)                    Field notes' 'spot' | 'museum' | 'eateries' | 'park' | 'so-what' (or 'notes-spot'...): Godot's
//                                      Shift+D, M and E, then the 2D controls for its park label tap and Shift+H
//   cancel(), silentClose()            Escape on the card; forget the card when the dialog closed or was replaced
//   scenePart()                        the world part of the VisitsScene (spec 3.8) that sprites.js draws
//   anchor(id), parkTrees()            a speech bubble's { x, y, name }; Boeddeker Park's trees
//   objectiveInputs(), hinted(id)      story.js's { tour, lastHinted }; Godot last_hinted_surprise_id
//   tick(now, world)                   the tour's completion (update_landmark_tour_completion); world defaults to the last objects() one
//   reset(), snapshot()
//   notesHTML()                        Field notes' neighborhood entry; the shell binds its five buttons to openNotes (visits-ui.js)
// }
import { VISITS_FORK_TEXT, btn, esc, frameHTML, freshSession } from './visits-kit.js';
import { GODOT_TEXT, MAIN, web } from './visits/text.js';
import { gdf } from './visits/format.js';
import { SURPRISE_IDS, SURPRISES, inspect, cycleTarget, nextIndexForNeighbor, conversationLabel, progressLabel, markers, keepsakes } from './visits/surprises.js';
import { EATERIES, EATERY_MENU_ITEMS, initialTour, tourState, lensColor, ringAngle, inspectMuseum, inspectPark, inspectSoWhat, cycleEatery, activateEatery, visitStop, tourCompletion } from './visits/landmarks.js';
import {
  godotToMap, SURPRISE_SITES, EATERY_AWNINGS, EATERY_COUNTERS, MUSEUM, MUSEUM_DOCENT, PARK_ENTRANCE, PARK_VIEW, PARK_RING, PARK_PATH,
  SO_WHAT_AWNING, SO_WHAT_LEAVENWORTH, SO_WHAT_VIEW, LARKIN_EXTERIOR, LARKIN_JUNCTION,
} from './visits/positions.js';
import { sceneReceipt } from './ending/mural.js';

const T = GODOT_TEXT['main.gd'];
const say = text => web('main.gd', text);
const list = value => (Array.isArray(value) ? value : []);
const point = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const xy = p => ({ x: p.x, y: p.y });
// A host call that throws (a refused AudioContext, the camera before the map loads) never stops what comes after it.
function safely(fn, fallback) { try { return fn(); } catch { return fallback; } }

// ---------- Godot's labels (build_street_life_decor, build_boeddeker_park, build_eatery_counters, build_neighborhood_surprises) ----------
const DECOR = T.build_street_life_decor;
const MUSEUM_LABEL = say(DECOR.museum), PARK_LABEL = say(T.build_boeddeker_park.label), AWNING_LABEL = say(DECOR.soWhatAwning), FLOOR_LABEL = say(DECOR.soWhatFloor);
const EATERY_LABELS = EATERIES.map(rec => gdf(say(DECOR.eatery), [rec.name]));
// The counter's menu board always shows the first item (build_eatery_counters).
const MENU_LABELS = EATERIES.map(rec => gdf(say(T.build_eatery_counters.menu), [String((EATERY_MENU_ITEMS[rec.id] ?? [T.eatery_counter_interact.special])[0])]));
const SURPRISE_LABELS = Object.fromEntries(SURPRISE_IDS.map(id => [id, say(T.build_neighborhood_surprises[id])]));
const JOURNAL = 'journal-button';

// ---------- Hit-test objects (spec 3.8): the same frozen objects on every call ----------
const visit = (id, name, p) => Object.freeze({ id, kind: 'visit', name, x: p.x, y: p.y });
const BEACONS = SURPRISE_IDS.map(id => visit(`surprise:${id}`, SURPRISES[id].title ?? id, SURPRISE_SITES[id]));
const COUNTERS = EATERIES.map((rec, i) => visit(`counter:${i}`, EATERY_LABELS[i], EATERY_COUNTERS[i]));
const LANDMARKS = [
  visit('museum', MUSEUM_LABEL, MUSEUM), visit('park', PARK_LABEL, PARK_ENTRANCE), visit('so_what', AWNING_LABEL, SO_WHAT_AWNING), visit('so_what_floor', FLOOR_LABEL, SO_WHAT_LEAVENWORTH),
  ...EATERIES.map((rec, i) => visit(`eatery:${i}`, EATERY_LABELS[i], EATERY_AWNINGS[i])),
];
const STOP_TOTAL = tourState(initialTour()).total;

// ---------- Boeddeker Park's trees (main.gd build_boeddeker_park) ----------
// Godot String.hash(): djb2 over the code points, unsigned 32-bit. That is Godot 4's String::hash as far as I know the engine;
// no Godot run checked it, so the tests pin the park's bounds, not these exact points.
const hash = text => { let h = 5381; for (const ch of text) h = (h * 33 + ch.codePointAt(0)) >>> 0; return h; };
// Godot dist_to_segment_2d on [x, z] pairs, in metres.
function segment([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, d = dx * dx + dz * dz, t = d < 1e-12 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / d));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
// Shade trees on a 6.5 m grid from the ring's bounding box, each jittered by "park:%d:%d", kept inside the ring at least 2.6 m
// from the fence and the path and 5.2 m from the play structure, at most 24. The 2D map has no building footprints, so Godot's
// footprint and wall checks are left out (decision D5: the count may differ from Godot's). Map pixels, with Godot's seed and scale.
let TREES = null;
function boeddekerTrees() {
  if (TREES) return TREES;
  const ring = MAIN.BOEDDEKER_PARK_RING, path = MAIN.BOEDDEKER_PATH_POINTS, play = [-146, -112], out = [];
  const inside = ([x, z]) => { let hit = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [ax, az] = ring[i], [bx, bz] = ring[j]; if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) hit = !hit; } return hit; };
  const fence = p => Math.min(...ring.map((a, i) => segment(p, a, ring[(i + 1) % ring.length])));
  const walkway = p => Math.min(...path.slice(1).map((b, i) => segment(p, path[i], b)));
  const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]), right = Math.max(...xs), bottom = Math.max(...zs);
  for (let gx = Math.min(...xs) + 3; gx < right && out.length < 24; gx += 6.5) {
    for (let gz = Math.min(...zs) + 3; gz < bottom && out.length < 24; gz += 6.5) {
      const seed = hash(`park:${Math.trunc(gx)}:${Math.trunc(gz)}`), tp = [gx + (seed % 21) / 10 - 1, gz + (Math.trunc(seed / 21) % 21) / 10 - 1];
      if (!inside(tp) || fence(tp) < 2.6 || walkway(tp) < 2.6 || Math.hypot(tp[0] - play[0], tp[1] - play[1]) < 5.2) continue;
      out.push({ ...godotToMap(tp[0], tp[1]), seed, scale: 1.4 + (seed % 6) * 0.1 });
    }
  }
  return (TREES = out);
}

// ---------- Static scene parts (spec 3.8, risk R9): one object each for every visit, so sprites.js builds them once ----------
let PARK_PART = null;
const parkPart = () => (PARK_PART ??= { ring: PARK_RING, path: PARK_PATH, entrance: PARK_ENTRANCE, trees: boeddekerTrees(), label: PARK_LABEL });
const SO_WHAT_PART = { awning: SO_WHAT_AWNING, floor: SO_WHAT_LEAVENWORTH, labels: { awning: AWNING_LABEL, floor: FLOOR_LABEL } };
const LARKIN_PART = { exterior: LARKIN_EXTERIOR, junction: LARKIN_JUNCTION };

export function createWorldVisits(kit) {
  const { host, session } = kit;
  let token = 0;          // the card on screen: a press from an earlier card, or after Back, is stale
  let lastWorld = null;   // the World of the latest objects() call, whose camera tick() checks
  let goalMemo = null;    // the tour objective for one state and session version (objects() and scenePart() run per frame)
  let quiet = null;       // tick: the objective was not 'explore' for this state and session version
  let counted = { tour: null, count: 0 };
  let marker = null;
  const parts = new Map();

  const found = () => list(host.getState()?.surprises);
  const goalNow = () => safely(() => kit.objective(), null) ?? {};
  const sparksNow = () => { const n = safely(() => kit.sparks(), 0); return Number.isFinite(n) ? n : 0; };
  function setTour(tour) { session.world.tour = tour; kit.bump(); }
  // The explore objective while it names a tour stop (all ten found), else null. Cheap before the tenth find.
  function tourGoal() {
    const state = host.getState();
    if (list(state?.surprises).length < SURPRISE_IDS.length) return null;
    if (goalMemo && goalMemo.state === state && goalMemo.version === session.version) return goalMemo.goal;
    const goal = goalNow(), stop = goal.id === 'explore' && typeof goal.tourId === 'string' && goal.tourId !== '' && point(goal.target);
    goalMemo = { state, version: session.version, goal: stop ? goal : null };
    return goalMemo.goal;
  }
  // Godot's gold guide marker on the tour stop (decision D9): an object, and its { x, y } in the scene.
  function markerFor(goal) {
    const t = goal.target;
    if (!marker || marker.stop !== goal.tourId || marker.object.x !== t.x || marker.object.y !== t.y) marker = { stop: goal.tourId, object: visit('tour-marker', String(t.name ?? goal.tourAction ?? ''), t), scene: xy(t) };
    return marker;
  }

  // ---------- The visit card ----------
  // Godot's Info panel lines under a heading: the burst line of a new find or first order, the three info lines, a neighbor's
  // memory or the docent's or host's words, and the receipt of a find that was not saved. The tray holds the card's own "again"
  // control (Shift+D, Shift+M, Shift+E, the counter), the tour's next stop while the tour is the objective, and Back.
  function drawCard(card) {
    const goal = goalNow(), stop = goal.id === 'explore' && typeof goal.tourId === 'string' && goal.tourId && goal.tourAction ? goal : null;
    const own = card.kind === 'surprise' ? [{ id: 'card-spot', label: conversationLabel(found()), primary: true }]
      : card.kind === 'museum' ? [{ id: 'card-next-era', label: VISITS_FORK_TEXT.nextEra, primary: true }]
        : card.kind === 'eatery' ? [{ id: 'card-order', label: VISITS_FORK_TEXT.order, primary: true }, { id: 'card-eateries', label: T.conversation_actions.eateries }] : [];
    const tray = [...own, stop && { id: 'card-tour', label: stop.tourAction }, { id: 'card-back', label: VISITS_FORK_TEXT.back }].filter(Boolean).map(b => btn(b)).join('');
    const reader = [card.burst, card.info, ...card.quotes, card.receipt].filter(Boolean).join('\n');
    session.world.card = card;
    const mine = ++token, back = card.returnTo;
    kit.show('card', frameHTML({ kind: 'card', credit: card.eyebrow, title: card.heading, reader, tray }));
    if (back) safely(() => host.returnTo(back));
    const press = action => () => { if (mine === token && kit.holds('card')) action(); };
    kit.bind('card-spot', press(() => spot(-1, back)));
    kit.bind('card-next-era', press(() => museum(back)));
    kit.bind('card-eateries', press(() => nextEatery(back)));
    kit.bind('card-order', press(() => activate(card.index, back)));
    kit.bind('card-tour', press(() => tourStop(goalNow().tourId, back)));
    kit.bind('card-back', press(closeCard));
    kit.noRepeat(['card-spot', 'card-next-era', 'card-eateries', 'card-order', 'card-tour']);
    kit.say(card.announce);
    return true;
  }
  // Each inspect after its change: the camera, the card, then the bubble and the chime in Godot's order, each host call wrapped. The
  // card comes before the bubble: a map tap opens it from the street, and game.js speak() says a line in the page's live region
  // only while no dialog shows it, so the speaker's words are said once, in the card's status line.
  // chime: [cue id, reason, values], values the visit's counts its banner reads (bursts.js cueBurst). burst: Godot's direct
  // trigger_feel_good_burst after the cue (a find's heading, an eatery's Order Up); finale: true for the 10/10 find, whose
  // banner Godot holds for 4.5 s.
  function present({ look, speech, chime, burst }, card) {
    if (look) safely(() => host.lookAt(xy(look)));
    const drawn = drawCard({ burst: '', quotes: [], receipt: '', ...card });
    if (speech) safely(() => host.speak(speech.id, speech.text, speech.name));
    if (chime) safely(() => host.chime(chime[0], chime[1], chime[2]));
    if (burst) safely(() => host.burst?.(burst));
    return drawn;
  }
  // Back and Escape: no toast, the status line already said Godot's announcement.
  function closeCard() {
    const back = session.world.card?.returnTo;
    session.world.card = null; token++;
    kit.leave('', back);
  }

  // ---------- Neighborhood surprises (main.gd inspect_neighborhood_surprise, cycle_neighborhood_surprise) ----------
  function find(id, returnTo) {
    if (typeof id !== 'string' || !Object.hasOwn(SURPRISES, id)) return false;
    const before = found();
    safely(() => host.act({ type: 'surprise', id }));
    // From here on everything reads the state the find left (spec 3.11): the counts, the sparks, the memory line, the receipt.
    const after = found(), w = session.world, reason = safely(() => host.saveReason(), '');
    const r = inspect(before.includes(id) ? after : after.filter(other => other !== id), id, { openNeighborId: safely(() => host.openNeighborId(), null), sparks: sparksNow(), guideIdx: w.guideIdx, lastHinted: w.lastHinted });
    w.guideIdx = r.guideIdx; w.lastHinted = r.lastHinted; kit.bump();
    const burst = r.newly ? { title: r.heading, detail: r.burstSub, accent: r.accent, finale: r.allFound } : null;
    return present({ look: r.site, speech: { id: `surprise:${id}`, text: r.speech, name: r.speaker }, burst }, {
      kind: 'surprise', id, eyebrow: SURPRISES[id].badge ?? T.inspect_neighborhood_surprise.badge, heading: r.heading ?? r.title,
      burst: r.newly ? r.burstSub : '', info: r.info, quotes: r.memory ? [r.memory] : [], memory: r.memory,
      receipt: typeof reason === 'string' && reason ? sceneReceipt(reason) : '', announce: r.announce, returnTo,
    });
  }
  // Shift+D: the explore objective's surprise, else the last hint while unfound, else the next id (or a target index).
  function spot(target, returnTo) {
    const goal = goalNow(), w = session.world;
    const i = cycleTarget(w.guideIdx, found(), { target, objectiveSurpriseId: goal.id === 'explore' ? String(goal.surpriseId ?? '') : '', lastHinted: w.lastHinted });
    return find(SURPRISE_IDS[i], returnTo);
  }

  // ---------- Landmarks (inspect_tenderloin_museum_hub, inspect_boeddeker_park, inspect_so_what_easter_egg) ----------
  // stop: the visitStop result of a tour stop, already inspected.
  function museum(returnTo, stop) {
    const r = stop ?? inspectMuseum(session.world.tour);
    setTour(r.tour);
    return present({ look: MUSEUM, speech: { id: 'museum_docent', text: r.docent, name: MUSEUM_LABEL }, chime: r.newStop && ['museum_portal', r.eraTitle, { eras: list(r.tour.eras).length }] },
      { kind: 'museum', eyebrow: MUSEUM_LABEL, heading: r.eraTitle, info: r.info, quotes: [r.docent], announce: r.announce, returnTo });
  }
  function park(returnTo, stop) {
    const r = stop ?? inspectPark(session.world.tour, boeddekerTrees().length);
    setTour(r.tour);
    return present({ look: PARK_VIEW, chime: r.newStop && ['boeddeker_park', r.title, { trees: boeddekerTrees().length }] }, { kind: 'park', eyebrow: PARK_LABEL, heading: r.title, info: r.info, announce: r.announce, returnTo });
  }
  function soWhat(returnTo, stop, eyebrow = AWNING_LABEL) {
    const r = stop ?? inspectSoWhat(session.world.tour);
    setTour(r.tour);
    return present({ look: SO_WHAT_VIEW, chime: r.newStop && ['so_what_egg', r.title] }, { kind: 'so_what', eyebrow, heading: r.title, info: r.info, announce: r.announce, returnTo });
  }

  // ---------- Eateries (cycle_eatery_guide, eatery_counter_interact, activate_eatery) ----------
  // r: a guide (cycleEatery), an order at the guided counter (kind 'order'), or a tour stop's guide and order (kind 'eatery').
  // A guide flies the camera to the awning; an order at the counter already in view leaves it (Godot moves it only to guide).
  function eatery(r, returnTo) {
    const i = r?.index, rec = EATERIES[i];
    if (!r?.tour || !rec) return false;
    setTour(r.tour);
    const order = typeof r.count === 'number';
    return present({
      look: r.kind === 'order' && !r.guided ? null : EATERY_AWNINGS[i], speech: { id: `eatery:${rec.id}`, text: r.speech, name: rec.name }, chime: r.newStop && ['eatery_order', rec.id],
      burst: r.burst && { title: r.burst.heading, detail: r.burst.sub, accent: r.burst.color },
    }, {
      kind: 'eatery', index: i, eyebrow: r.burst ? EATERY_LABELS[i] : MENU_LABELS[i], heading: r.burst?.heading ?? EATERY_LABELS[i],
      burst: r.burst?.sub ?? '', info: r.info, quotes: order ? [] : [r.speech], announce: r.announce, returnTo,
    });
  }
  // A tap on an eatery's awning or open counter: its tour stop, else an order at the guided counter, else its guide.
  const activate = (i, returnTo) => eatery(activateEatery(session.world.tour, i, { tourId: String(goalNow().tourId ?? ''), sparks: sparksNow() }), returnTo);
  const nextEatery = returnTo => eatery(cycleEatery(session.world.tour), returnTo);

  // ---------- The landmark tour (visit_next_landmark) ----------
  function tourStop(stopId, returnTo) {
    if (typeof stopId !== 'string' || !stopId) return false;
    const r = visitStop(session.world.tour, stopId, { treeCount: boeddekerTrees().length, sparks: sparksNow() });
    if (!r?.tour) return false;
    if (r.kind === 'museum') return museum(returnTo, r);
    if (r.kind === 'park') return park(returnTo, r);
    if (r.kind === 'so_what') return soWhat(returnTo, r);
    return eatery(r, returnTo);
  }
  // update_landmark_tour_completion, once a visit: the cheap gates first, then the objective (memoized while it says no).
  function tick(now, world = lastWorld) {
    const tour = session.world?.tour;
    if (!tour || tour.celebrated) return false;
    const state = host.getState(), have = list(state?.surprises);
    if (have.length < SURPRISE_IDS.length) return false;
    if (counted.tour !== tour) counted = { tour, count: tourState(tour).count };
    if (counted.count < STOP_TOTAL) return false;
    if (host.dialogOpen() || world?.camera?.overviewMode) return false;
    if (quiet && quiet.state === state && quiet.version === session.version) return false;
    // Godot waits for the discovery banner, the 10/10 finale's included; that wait is not memoized, so the tour fires once it ends.
    if (safely(() => host.rewardPending?.(), false)) return false;
    const r = tourCompletion(tour, { foundCount: have.length, objectiveId: goalNow().id });
    if (!r) { quiet = { state, version: session.version }; return false; }
    setTour(r.tour);
    safely(() => host.chime('tour_complete', r.cue, { tourCount: counted.count, tourTotal: STOP_TOTAL }));
    safely(() => host.toast(r.announce));
    return true;
  }

  // ---------- Ways in ----------
  function objects(world) {
    if (world && typeof world === 'object') lastWorld = world;
    const goal = tourGoal(), stopId = goal?.tourId ?? '', open = list(session.world?.tour?.counters), out = [];
    // The marker comes first, so it wins a tap on the landmark it stands on, as Godot tests it first (main.gd:14443-14448).
    if (goal) out.push(markerFor(goal).object);
    if (!world?.camera?.overviewMode) out.push(...BEACONS);
    COUNTERS.forEach((counter, i) => { if (open.includes(i) || stopId === `eatery:${i}`) out.push(counter); });
    return [...out, ...LANDMARKS];
  }
  // how ('tap' | 'talk' | 'walk') changes nothing: Godot inspects the same from a tap, its keys and an arrival.
  function interact(object, how = 'tap') {
    const id = typeof object === 'string' ? object : object?.id;
    if (typeof id !== 'string') return false;
    if (id === 'episode') return !!kit.openResume();
    if (id === 'museum') return museum();
    if (id === 'park') return park();
    if (id === 'so_what' || id === 'so_what_floor') return soWhat(undefined, null, id === 'so_what' ? AWNING_LABEL : FLOOR_LABEL);
    if (id === 'tour-marker') return tourStop(goalNow().tourId);
    const m = /^(surprise|tour):(.+)$/.exec(id), e = /^(?:eatery|counter):(\d+)$/.exec(id);
    if (m) return m[1] === 'surprise' ? find(m[2]) : tourStop(m[2]);
    return e && Number(e[1]) < EATERIES.length ? activate(Number(e[1])) : false;
  }
  // Godot run_conversation_action_id. partner: the conversation's neighbor id (or { id }).
  function conversationAction(kind, partner) {
    if (kind === 'surprise') {
      const who = typeof partner === 'string' ? partner : typeof partner?.id === 'string' ? partner.id : null;
      return spot(goalNow().id === 'explore' ? -1 : nextIndexForNeighbor(found(), who));
    }
    if (kind === 'museum') return museum();
    if (kind === 'eateries') return nextEatery();
    if (kind === 'landmark_tour') return tourStop(goalNow().tourId);
    return false;
  }
  // Field notes, the 2D Info column: Godot's Shift+D, Shift+M and Shift+E, returning to the Field notes button. Then Boeddeker
  // Park and "So What", which Godot inspects from a tap on the park's label and Shift+H: declared 2D controls for both, so keyboard
  // and touch players reach them without a map tap or the finished tour, under the labels Godot's landmark tour gives the same
  // two visits (landmark_tour_state).
  const TOUR = T.landmark_tour_state;
  const NOTES = { spot: () => spot(-1, JOURNAL), museum: () => museum(JOURNAL), eateries: () => nextEatery(JOURNAL), park: () => park(JOURNAL), 'so-what': () => soWhat(JOURNAL) };
  const NOTES_LABELS = { spot: have => conversationLabel(have), museum: () => T.conversation_actions.museum, eateries: () => T.conversation_actions.eateries, park: () => TOUR.parkAction, 'so-what': () => TOUR.soWhatAction };
  function openNotes(kind) {
    const key = String(kind ?? '').replace(/^notes-/, '');
    return Object.hasOwn(NOTES, key) ? NOTES[key]() : false;
  }
  function notesHTML() {
    const have = found(), buttons = Object.keys(NOTES).map(key => ({ id: `notes-${key}`, label: NOTES_LABELS[key](have) }));
    return `<div class="history-entry" data-visits-notes><span class="eyebrow visits-eyebrow">${esc(VISITS_FORK_TEXT.notesEyebrow)}</span><h3>${esc(VISITS_FORK_TEXT.notesTitle)}</h3>`
      + `<p>${esc(progressLabel(have, sparksNow()))}</p><div class="button-row">${buttons.map(b => btn(b)).join('')}</div></div>`;
  }

  // ---------- The scene part (spec 3.8): each part rebuilt only when what it shows changed ----------
  function keep(name, key, build) {
    const at = parts.get(name);
    if (at && at.key === key) return at.value;
    const value = build();
    parts.set(name, { key, value });
    return value;
  }
  function scenePart() {
    const have = found(), tour = session.world?.tour ?? initialTour(), open = list(tour.counters), goal = tourGoal(), spotAt = goal ? markerFor(goal).scene : null;
    const finds = have.join(), era = `${tour.museumStep} ${tour.era}`, counters = open.join();
    return keep('scene', [finds, era, counters, spotAt ? [spotAt.x, spotAt.y].join(' ') : ''].join(' '), () => ({
      surprises: keep('surprises', finds, () => markers(have).map(m => ({ ...m, label: SURPRISE_LABELS[m.id] }))),
      keepsakes: keep('keepsakes', finds, () => keepsakes(have)),
      eateries: keep('eateries', counters, () => EATERIES.map((rec, i) => ({
        index: i, id: rec.id, name: rec.name, awning: EATERY_AWNINGS[i], counter: open.includes(i) ? EATERY_COUNTERS[i] : null, canopy: `#${rec.canopy_color}`, label: `#${rec.label_color}`, menu: MENU_LABELS[i],
      }))),
      museum: keep('museum', era, () => ({ x: MUSEUM.x, y: MUSEUM.y, docent: MUSEUM_DOCENT, lens: lensColor(tour.era), rings: [0, 1, 2].map(i => ringAngle(tour, i)) })),
      park: parkPart(), soWhat: SO_WHAT_PART, larkin: LARKIN_PART, tourMarker: spotAt,
    }));
  }

  // ---------- Bubbles, the objective's inputs, the session ----------
  function anchor(id) {
    if (id === 'museum_docent') return { ...xy(MUSEUM_DOCENT), name: MUSEUM_LABEL };
    const m = typeof id === 'string' ? /^(surprise|eatery):(.+)$/.exec(id) : null;
    if (!m) return null;
    if (m[1] === 'surprise') return Object.hasOwn(SURPRISES, m[2]) ? { ...xy(SURPRISE_SITES[m[2]]), name: SURPRISES[m[2]].speaker ?? T.inspect_neighborhood_surprise.speaker } : null;
    const i = EATERIES.findIndex(rec => rec.id === m[2]);
    return i >= 0 ? { ...xy(EATERY_COUNTERS[i]), name: EATERIES[i].name } : null;
  }
  const objectiveInputs = () => ({ tour: session.world?.tour ?? initialTour(), lastHinted: session.world?.lastHinted ?? '' });
  // Godot ask_whats_next sets last_hinted_surprise_id to the surprise a neighbor named, or clears it.
  function hinted(id) {
    const next = SURPRISE_IDS.includes(id) ? id : '';
    if (session.world.lastHinted !== next) { session.world.lastHinted = next; kit.bump(); }
    return next;
  }
  const cancel = () => { if (!kit.holds('card')) return false; closeCard(); return true; };
  // The dialog closed under the card (×) or another screen replaced it: forget it, leave the dialog alone.
  function silentClose() {
    const had = !!session.world?.card || session.screen === 'card';
    token++;
    if (session.world) session.world.card = null;
    if (session.screen === 'card') session.screen = null;
    if (had) kit.bump();
    return had;
  }
  // Godot reset_mural_state_to_defaults and apply_save_envelope: the tour, the guide index and the last hint start over.
  function reset() {
    token++; goalMemo = null; quiet = null;
    session.world = freshSession().world;
    kit.bump();
  }
  const snapshot = () => ({ tour: structuredClone(session.world?.tour ?? initialTour()), guideIdx: session.world?.guideIdx ?? -1, lastHinted: session.world?.lastHinted ?? '' });

  return { objects, interact, conversationAction, openNotes, cancel, silentClose, scenePart, anchor, parkTrees: boeddekerTrees, objectiveInputs, hinted, tick, reset, snapshot, notesHTML };
}
