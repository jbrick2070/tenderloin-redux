// Landmark tour, museum Time-Portal, Boeddeker Park, the "So What" awning and six fictional
// eateries (godot/main.gd 184-265, 700-773, 4583-4602, 5285-5318, 6025-6104, 6159-6193,
// 8666-8778), pure. The tour is visit-only (Godot clears it on reset and on loading a save).
// Every word a player reads goes through the active catalog (L, gdfText, menuTitle); English is unchanged. Street addresses
// are passed as they are (D8); the eatery burst's title is the MENU_TITLES table, so a locale never title-cases.
import { MAIN, GODOT_TEXT, web } from './text.js';
import { gdfText } from './format.js';
import { L, menuTitle } from './compose.js';
import { MUSEUM, PARK_ENTRANCE, SO_WHAT_AWNING, EATERY_COUNTERS, EATERY_AWNINGS, SURPRISE_SITES } from './positions.js';
import { SURPRISE_IDS, SURPRISES, nextSurpriseId } from './surprises.js';

export const { TOUR_MUSEUM_ERAS, TOUR_MUSEUM_TITLES, MUSEUM_DOCENT_LINES, NEIGHBORHOOD_EATERIES: EATERIES, EATERY_HOST_LINES, EATERY_MENU_ITEMS, BOEDDEKER_PARK_OSM_WAY } = MAIN;
const T = GODOT_TEXT['main.gd'];
const W = literal => web('main.gd', literal);

export function initialTour() {
  return { museumStep: 0, era: 'present', eras: [], park: false, soWhat: false, orders: {}, eateryGuide: -1, counters: [], celebrated: false };
}
const copy = t => ({ ...t, eras: [...t.eras], orders: { ...t.orders }, counters: [...t.counters] });

// Godot landmark_tour_state(): 12 stops in order; `next` is the first not done.
export function tourState(tour) {
  const S = T.landmark_tour_state, stops = [];
  TOUR_MUSEUM_ERAS.forEach((era, i) => stops.push({ id: `museum:${i}`, name: L(TOUR_MUSEUM_TITLES[i]), target: MUSEUM, done: tour.eras.includes(era), action: L(S.museumAction) }));
  stops.push({ id: 'park', name: L(S.park), target: PARK_ENTRANCE, done: tour.park, action: L(S.parkAction) });
  stops.push({ id: 'so_what', name: L(S.soWhat), target: SO_WHAT_AWNING, done: tour.soWhat, action: L(S.soWhatAction) });
  EATERIES.forEach((rec, i) => stops.push({ id: `eatery:${i}`, name: gdfText(S.eatery, [L(rec.name)]), target: EATERY_COUNTERS[i] ?? EATERY_AWNINGS[i], done: (tour.orders[rec.id] ?? 0) > 0, action: L(S.eateryAction) }));
  const count = stops.filter(s => s.done).length;
  return { count, total: stops.length, next: stops.find(s => !s.done) ?? null, stops };
}

const LENS = { present: T.update_museum_portal_3d.present, '1961_jazz': T.update_museum_portal_3d.jazz, '1966_comptons': T.update_museum_portal_3d.comptons, '1907_cadillac': T.update_museum_portal_3d.cadillac };
export const lensColor = era => '#' + (LENS[era] ?? LENS.present);
// Godot portal ring i: rotation museum_hub_step * 30 + i * 25 degrees.
export const ringAngle = (tour, i) => tour.museumStep * 30 + i * 25;

// Godot inspect_tenderloin_museum_hub(): show the current step's era, then advance the step.
export function inspectMuseum(tour) {
  const M = T.inspect_tenderloin_museum_hub, step = tour.museumStep % 4, t = copy(tour);
  t.museumStep = (tour.museumStep + 1) % 4;
  const eras = [[M.era0, M.title0b, M.line0, W(M.sub0)], [M.era1, M.title1, M.line1, M.sub1], [M.era2, M.title2, M.line2, M.sub2], [M.era3, M.title3, M.line3, M.sub3]];
  const [era, title, english, englishSub] = eras[step], eraTitle = L(title), line = L(english), sub = L(englishSub);
  t.era = era;
  const newStop = !t.eras.includes(era);
  if (newStop) t.eras.push(era);
  return { tour: t, step, era, eraTitle, line, sub, docent: L(MUSEUM_DOCENT_LINES[step % MUSEUM_DOCENT_LINES.length]), lens: lensColor(era), newStop, info: gdfText(M.info, [line, sub]), announce: gdfText(M.announce, [line, sub]) };
}
// Godot inspect_boeddeker_park(). treeCount: the number of park trees the 2D map draws (Godot
// prints its own boeddeker_tree_points.size(), computed at runtime from footprints).
export function inspectPark(tour, treeCount) {
  const P = T.inspect_boeddeker_park, t = copy(tour), newStop = !tour.park;
  t.park = true;
  const line = gdfText(P.line, [BOEDDEKER_PARK_OSM_WAY]), sub = gdfText(P.sub, [treeCount]);
  return { tour: t, newStop, title: L(P.title), line, sub, info: gdfText(P.info, [line, sub]), announce: gdfText(P.announce, [line, sub]) };
}
// Godot inspect_so_what_easter_egg().
export function inspectSoWhat(tour) {
  const S = T.inspect_so_what_easter_egg, t = copy(tour), newStop = !tour.soWhat;
  t.soWhat = true;
  const line = L(S.line), sub = L(S.sub);
  return { tour: t, newStop, title: L(S.title), line, sub, info: gdfText(S.info, [line, sub]), announce: gdfText(S.announce, [line, sub]) };
}
// Godot show_eatery_host_speech(): the bubble text.
export const hostSpeech = (index, line) => gdfText(T.show_eatery_host_speech.speech, [L(EATERIES[index].name), line]);
// Godot cycle_eatery_guide(target): guide to an eatery, open its counter and greet.
export function cycleEatery(tour, target = -1) {
  const E = T.cycle_eatery_guide, t = copy(tour);
  t.eateryGuide = target >= 0 && target < EATERIES.length ? target : (tour.eateryGuide + 1) % EATERIES.length;
  const i = t.eateryGuide, rec = EATERIES[i];
  if (!t.counters.includes(i)) t.counters.push(i);
  const greeting = L((EATERY_HOST_LINES[rec.id] ?? [E.welcome])[0]);
  const line = gdfText(E.line, [L(rec.name), L(rec.kind)]);
  const sub = gdfText(W(E.sub), [L(rec.street), L(rec.specialty), i + 1, EATERIES.length]);
  return { tour: t, index: i, line, sub, speech: hostSpeech(i, greeting), info: gdfText(E.info, [line, sub]), announce: gdfText(E.announce, [line, sub]) };
}
// Godot eatery_counter_interact(target): order once more. The first order is a tour stop with
// an "Order Up" burst. sparks: Godot spark_count() (the fork may pass 0).
export function orderEatery(tour, target = -1, { sparks = 0 } = {}) {
  const idx = target < 0 ? tour.eateryGuide : target;
  if (idx < 0 || idx >= EATERIES.length) return null;
  const O = T.eatery_counter_interact;
  let t = tour, guided = null;
  if (idx !== tour.eateryGuide) { guided = cycleEatery(tour, idx); t = guided.tour; }
  t = copy(t);
  const rec = EATERIES[idx], count = (t.orders[rec.id] ?? 0) + 1;
  t.orders[rec.id] = count;
  const lines = EATERY_HOST_LINES[rec.id] ?? [O.welcome], items = EATERY_MENU_ITEMS[rec.id] ?? [O.special];
  const line = L(lines[count % lines.length]), item = L(items[(count - 1) % items.length]), english = items[(count - 1) % items.length];
  const message = gdfText(O.message, [L(rec.name), item]);
  return {
    tour: t, index: idx, count, item, line, message, guided, speech: hostSpeech(idx, line), newStop: count === 1,
    burst: count === 1 ? { heading: gdfText(O.burst, [menuTitle(english)]), sub: gdfText(O.burstSub, [L(rec.name), sparks]), color: '#' + (rec.label_color ?? 'ffe8a3') } : null,
    info: gdfText(O.info, [message, line]), announce: gdfText(O.announce, [message, line]),
  };
}
// Godot activate_eatery(index): the tour stop, else order at an open guided counter, else guide.
export function activateEatery(tour, index, { tourId = '', sparks = 0 } = {}) {
  if (tourId === `eatery:${index}`) return { kind: 'tour', ...visitStop(tour, tourId, { sparks }) };
  if (tour.counters.includes(index) && index === tour.eateryGuide) return { kind: 'order', ...orderEatery(tour, index, { sparks }) };
  return { kind: 'guide', ...cycleEatery(tour, index) };
}
// Godot visit_next_landmark() for a tour stop id ("museum:2", "park", "so_what", "eatery:4").
export function visitStop(tour, stopId, { treeCount = 0, sparks = 0 } = {}) {
  if (!stopId) return null;
  if (stopId.startsWith('museum:')) return { kind: 'museum', ...inspectMuseum({ ...copy(tour), museumStep: Number(stopId.split(':')[1]) }) };
  if (stopId === 'park') return { kind: 'park', ...inspectPark(tour, treeCount) };
  if (stopId === 'so_what') return { kind: 'so_what', ...inspectSoWhat(tour) };
  if (stopId.startsWith('eatery:')) {
    const i = Number(stopId.split(':')[1]);
    return { kind: 'eatery', ...orderEatery(cycleEatery(tour, i).tour, i, { sparks }) };
  }
  return null;
}
// Godot update_landmark_tour_completion(): once per visit, after all 10 surprises, all 12 stops,
// on the explore objective, with no discovery banner or overview in the way.
export function tourCompletion(tour, { foundCount, objectiveId, blocked = false } = {}) {
  if (tour.celebrated || blocked || foundCount < SURPRISE_IDS.length) return null;
  const state = tourState(tour);
  if (state.count !== state.total || objectiveId !== 'explore') return null;
  const C = T.update_landmark_tour_completion;
  return { tour: { ...copy(tour), celebrated: true }, cue: gdfText(C.cue, [state.total]), announce: gdfText(C.announce, [state.total]) };
}

// Godot current_objective()'s chapter 6 tail (main.gd:6159-6193), after Black Hawk: the next
// surprise, then the tour, then the final line. compass(from, to) is story.js compassPhrase.
export function exploreObjective(found, tour, { player, openNeighborId = null, lastHinted = '', compass }) {
  const O = T.current_objective, total = SURPRISE_IDS.length;
  if (found.length < total) {
    const id = nextSurpriseId(found, openNeighborId, lastHinted), rec = SURPRISES[id] ?? {}, site = SURPRISE_SITES[id];
    const title = L(rec.title ?? id), street = rec.street ? L(rec.street) : '';
    return { id: 'explore', neighbor: -1, hasTarget: true, target: site, targetName: title, surpriseId: id, text: gdfText(W(O.spot), [title, found.length, total]), hint: gdfText(W(O.spotHint), [total, found.length, total, title, compass(player, site), street]) };
  }
  const state = tourState(tour), stop = state.next;
  if (stop) return { id: 'explore', neighbor: -1, hasTarget: true, target: stop.target, targetName: stop.name, tourId: stop.id, tourAction: stop.action, text: gdfText(O.tour, [state.count, state.total, stop.name]), hint: gdfText(O.tourHint, [stop.name, compass(player, stop.target), state.count, state.total]) };
  return { id: 'explore', neighbor: -1, hasTarget: false, target: null, text: gdfText(O.done, [state.count, state.total]), hint: gdfText(W(O.doneHint), [state.total]) };
}
