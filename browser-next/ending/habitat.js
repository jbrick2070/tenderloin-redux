// The habitat room and the departure (godot/habitat_room.gd): room, links and depart modes in one visit-only object.
// Each action returns { room, focus?, resetOrbit?, openOrbit? } and never changes its input.
import { G, C, gdf, gdfRaw, web } from './text.js';
import { compose, midSentence, ENDING_COMPOSE as K } from './compose.js';
import { L } from '../i18n.js';
import { copied, filmDone, filmShotTitle, validCivicPlan } from './rules.js';
import { GODOT_ART, PAPER_COLORS, moduleSVG, svgBody } from './art.js';

const T = G['habitat_room.gd'], K0 = C['habitat_room.gd'], M = C['main.gd'];
const { ITEMS, TITLES, PLACES, NAMES, SPOTS, OWNERS, RELATIONS } = K0;
const BEA_TITLES = C['bea_invitation.gd'].TITLES, QUIET_TITLES = C['quiet_seats.gd'].TITLES;
export { ITEMS, TITLES, PLACES, NAMES, SPOTS };
export const freshRoom = () => ({ assigned: {}, selected: 0, destination: 0, complete: false, inspecting: false, lastPlace: -1, mode: 'room', links: [], relation: 0, ready: false, panel: -1, notice: '' });
const clone = r => structuredClone(r);

// copies(): the art, pause and beats copies, the film and the Listening Hour, or null.
export function habitatCopies(state) {
  const out = {};
  for (const id of ['art', 'pause', 'beats']) { const c = copied(state, id); if (!c.valid) return null; out[id] = c.value; }
  if (!filmDone(state) || state.civic.phase !== 'done' || !validCivicPlan(state.civic.result)) return null;
  out.film = structuredClone(state.film.result); out.civic = structuredClone(state.civic.result);
  return out;
}
export const habitatAvailable = state => habitatCopies(state) !== null;
export const invitation = state => copied(state, 'stories');

export function placeOf(r, id) { for (let i = 0; i < 4; i++) if (r.assigned[PLACES[i]] === id) return i; return -1; }
export function sparePlace(r) { for (let i = 0; i < 4; i++) if (!Object.hasOwn(r.assigned, PLACES[i])) return i; return -1; }
// facing(index): Across (same row), Along (same column) or Corner, from the copy's bay to the spare bay.
export function facing(r, index) {
  const a = SPOTS[placeOf(r, ITEMS[index])], b = SPOTS[sparePlace(r)], dx = a[0] - b[0], dy = a[1] - b[1];
  return dy === 0 ? 0 : dx === 0 ? 1 : 2;
}
const canCarry = r => !Object.hasOwn(r.assigned, PLACES[r.destination]);
function resetDeparture(r) { Object.assign(r, { mode: 'room', links: [], relation: 0, ready: false, panel: -1, notice: '' }); return r; }
// refresh(): a departure needs a welcomed room and a valid invitation, or it starts over.
export function normalizeRoom(r, state) {
  if (r.mode !== 'room' && (!r.complete || !invitation(state).valid)) return { room: resetDeparture(clone(r)), resetOrbit: true };
  return { room: r, resetOrbit: false };
}

export function chooseItem(r, index) {
  if (index < 0 || index >= 3) return { room: r };
  const next = clone(r); next.selected = index;
  if (next.mode !== 'room') { next.notice = next.links.includes(index) ? gdf(T.choose_item.linked, L(OWNERS[index])) : ''; return { room: next }; }
  const at = placeOf(next, ITEMS[index]);
  if (at >= 0) next.destination = at;
  else for (let i = 0; i < 4; i++) if (!Object.hasOwn(next.assigned, PLACES[i])) { next.destination = i; break; }
  return { room: next };
}
export function choosePlace(r, index) {
  if (index < 0 || index >= 4) return { room: r };
  const next = clone(r);
  if (next.mode === 'depart') {
    if ([0, 1].includes(index) && next.panel < 2) { next.panel = index === 0 ? Math.min(2, next.panel + 1) : 2; return { room: next, focus: next.panel === 2 ? 'room-detail' : 'room-place-0' }; }
    return { room: r };
  }
  if (next.mode === 'links') {
    if (index < 3 && !next.ready) { next.relation = index; if (!next.links.includes(next.selected)) next.notice = ''; return { room: next }; }
    return { room: r };
  }
  if (Object.hasOwn(next.assigned, PLACES[index]) && next.assigned[PLACES[index]] !== ITEMS[next.selected]) return { room: r };
  next.destination = index;
  return { room: next };
}
// focus_step(): where focus goes when the room shows or a mode changes.
export function roomFocus(r) {
  if (r.mode === 'depart') return r.panel < 2 ? 'room-place-0' : 'room-detail';
  if (r.mode === 'links' && (r.ready || r.links.length === 3)) return 'room-assist';
  return `room-item-${r.selected}`;
}
function departureAction(r, state) {
  const next = clone(r);
  if (!next.complete || !invitation(state).valid || next.mode !== 'links') return { room: r };
  if (next.ready) { next.notice = ''; next.mode = 'depart'; next.panel = 0; }
  else if (next.links.length === 3) { next.notice = ''; next.ready = true; }
  else if (!next.links.includes(next.selected)) {
    const words = [L(OWNERS[next.selected]), midSentence(L(TITLES[next.selected])), midSentence(L(NAMES[placeOf(next, ITEMS[next.selected])]))];
    if (next.relation !== facing(next, next.selected)) { next.notice = gdf(T.departure_action.wrong, ...words); return { room: next }; }
    next.links.push(next.selected); next.notice = gdf(T.departure_action.right, ...words);
    for (let i = 0; i < 3; i++) if (!next.links.includes(i)) { next.selected = i; break; }
  }
  return { room: next, focus: next.mode === 'depart' ? 'room-place-0' : next.ready ? 'reader' : next.links.length === 3 ? 'room-assist' : `room-item-${next.selected}` };
}
// carry_or_welcome(): carry, then Welcome Thanh, then Prepare together; in links mode Fit link, Ready together and
// Depart; at departure panel 3, Walk orbital.
export function assist(r, state) {
  if (r.mode === 'depart' && r.panel === 2) return { room: r, openOrbit: true };
  if (r.mode !== 'room') return departureAction(r, state);
  if (r.complete && !canCarry(r)) {
    if (!invitation(state).valid) return { room: r };
    const next = clone(r); next.mode = 'links'; next.inspecting = false; next.notice = '';
    return { room: next, focus: roomFocus(next) };
  }
  const next = clone(r);
  let resetOrbit = false;
  if (canCarry(next)) {
    resetDeparture(next); resetOrbit = true;
    const old = placeOf(next, ITEMS[next.selected]);
    if (old >= 0) delete next.assigned[PLACES[old]];
    next.assigned[PLACES[next.destination]] = ITEMS[next.selected]; next.complete = false; next.lastPlace = next.destination; next.inspecting = false;
  } else if (Object.keys(next.assigned).length === 3 && !next.complete) { next.complete = true; next.inspecting = false; }
  else return { room: r };
  const placed = Object.keys(next.assigned).length;
  return { room: next, resetOrbit, focus: placed < 3 ? `room-item-${(next.selected + 1) % 3}` : !next.complete ? 'room-assist' : 'room-keep' };
}
export function toggleDetail(r) {
  const next = clone(r);
  if (next.mode !== 'room') {
    next.mode = 'room'; next.inspecting = false; next.notice = ''; next.destination = placeOf(next, ITEMS[next.selected]);
    return { room: next, focus: `room-item-${next.selected}` };
  }
  next.inspecting = !next.inspecting;
  return { room: next };
}

const itemName = (r, place) => L(Object.hasOwn(r.assigned, place) ? TITLES[ITEMS.indexOf(r.assigned[place])] : T.item_name.open);
const placeLine = (r, i) => compose(K.roomPlace, { place: L(NAMES[i]), item: itemName(r, PLACES[i]) });
export function roomDescription(r) {
  const d = T.description, parts = PLACES.map((place, i) => placeLine(r, i));
  return (r.complete ? L(d.welcomed) : gdf(d.placed, Object.keys(r.assigned).length)) + compose(K.roomList, { places: parts.join(d.join) });
}
// Godot's ready template takes the palette as its id: a locale words it by $select.
function departureText(r, c, state) {
  const d = T.departure_text, title = L(BEA_TITLES[invitation(state).value]);
  let body = L(d.intro);
  if (r.links.length === 3) body = compose(K.linksAll, { title });
  if (r.ready) body = gdf(d.ready, title, c.art.palette, midSentence(L(NAMES[placeOf(r, 'art')])), midSentence(filmShotTitle(c.film.order[2])), L(c.beats === 0 ? d.beatsNone : d.beatsSome), L(QUIET_TITLES[c.pause]), L(M.CIVIC_FORMAT_LABELS[c.civic.format]));
  if (r.mode === 'depart') body = L([d.panel0, d.panel1, d.panel2][r.panel]) + '\n' + body;
  return body + '\n' + r.notice + compose(K.departureTail, { place: L(NAMES[sparePlace(r)]), count: r.links.length, ready: r.ready ? L(d.ready2) : '', title });
}
// refresh() for the room and departure views (the orbital view is orbital.js).
export function roomView(r, state) {
  const c = habitatCopies(state), t = T.refresh;
  if (!c) return null;
  let body = L(t.intro);
  const placed = Object.keys(r.assigned).length;
  if (placed) body = gdf(t.partial, roomDescription(r));
  if (placed === 3 && !r.complete) body = L(t.all);
  if (r.complete) {
    let spare = '';
    for (let i = 0; i < 4; i++) if (!Object.hasOwn(r.assigned, PLACES[i])) spare = midSentence(L(NAMES[i]));
    // Godot's complete template takes the palette as its id: a locale words it by $select.
    body = gdf(t.complete, spare, L(c.pause === 'arc' ? t.arc : t.pairs), midSentence(L(NAMES[placeOf(r, 'art')])), c.art.palette, midSentence(L(NAMES[placeOf(r, 'film')])), midSentence(filmShotTitle(c.film.order[2])));
  }
  body += '\n' + roomDescription(r) + compose(K.roomSelected, { item: L(TITLES[r.selected]), place: L(NAMES[r.destination]) });
  body += gdf(t.copies, L(QUIET_TITLES[c.pause]), L(M.CIVIC_FORMAT_LABELS[c.civic.format]), L(c.beats === 0 ? t.beatsNone : t.beatsSome));
  body += L(web(t.model2));
  if (r.mode !== 'room') body = departureText(r, c, state);
  const items = ITEMS.map((id, i) => ({ id: `room-item-${i}`, label: L(TITLES[i]) + (placeOf(r, id) >= 0 ? ' +' : ''), name: compose(placeOf(r, id) >= 0 ? K.itemPlaced : K.itemUnplaced, { item: L(TITLES[i]) }), pressed: r.selected === i, disabled: false }));
  const places = PLACES.map((place, i) => ({ id: `room-place-${i}`, label: L(NAMES[i]), name: placeLine(r, i), pressed: r.destination === i, disabled: Object.hasOwn(r.assigned, place) && r.assigned[place] !== ITEMS[r.selected], hidden: false }));
  const assistButton = { id: 'room-assist', label: L(canCarry(r) || placed < 3 ? t.ask : r.complete ? t.prepare : t.welcome), disabled: !canCarry(r) && (placed !== 3 || r.complete && !invitation(state).valid), hidden: false };
  const detail = { id: 'room-detail', label: L(r.inspecting ? t.show : t.view) };
  let alt = r.inspecting ? compose(K.detailOf, { item: L(TITLES[r.selected]), description: roomDescription(r) }) : compose(K.roomModel, { description: roomDescription(r) });
  if (r.mode !== 'room') {
    for (let i = 0; i < 3; i++) {
      const label = L(OWNERS[i]) + (r.links.includes(i) ? ' +' : '');
      Object.assign(items[i], { label, name: label, disabled: r.ready });
      const pl = L(r.mode === 'links' ? RELATIONS[i] : [t.nextPanel, t.skip, t.still][i]);
      Object.assign(places[i], { label: pl, name: pl, disabled: r.mode === 'links' ? r.ready : r.panel === 2 || i === 2, pressed: r.mode === 'links' && r.relation === i });
    }
    places[3].hidden = true; detail.label = L(t.backRoom);
    if (r.mode === 'depart') { places[2].hidden = true; assistButton.hidden = r.panel !== 2; }
    assistButton.label = L(r.mode === 'depart' ? t.walk : r.ready ? t.depart : r.links.length === 3 ? t.readyTogether : t.fit);
    assistButton.disabled = r.mode === 'depart' ? r.panel !== 2 : r.links.length < 3 && r.links.includes(r.selected);
    alt = compose(K.frameAlt, { description: roomDescription(r), status: r.mode === 'depart' ? gdf(t.panel, r.panel + 1) : gdf(t.linksFitted, r.links.length) });
  }
  return {
    title: L(T.setup.title), credit: compose(K.roomCredit, { chapter: L(r.mode === 'depart' ? t.future : t.model) }), text: body,
    buttons: [...items, ...places, assistButton, detail, { id: 'room-keep', label: L(T.setup.keep) }],
    // names: the bay labels drawn over the picture (habitat_room.gd NAMES), in place order.
    picture: { svg: habitatSVG(r, c, state), alt, labels: !r.inspecting && r.mode !== 'depart', names: NAMES.map(name => L(name)) }, announce: body,
  };
}
// close_room(true): paused tells whether the commons was showing, returned whether its return home is complete.
export const roomClose = (paused, returned) => L(paused ? (returned ? T.close_room.returned : T.close_room.paused) : T.close_room.back) + L(web(T.close_room.tail));
export const roomRefusal = () => L(T.open_room.refuse);
export const orbitFailed = () => L(T.carry_or_welcome.failed);

// helper_anchor(): the parked helper beside the bay it last filled.
const helperAnchor = r => r.lastPlace >= 0 ? [[331, 59], [389, 45], [331, 45], [389, 59]][r.lastPlace] : [360, 46];
// texture(c): the room, the open-place frame, and the depart wrapper; or the selected copy in detail.
export function habitatSVG(r, c, state) {
  const X = GODOT_ART['habitat_room.gd'].texture;
  if (r.inspecting) return moduleSVG(ITEMS[r.selected], c);
  let svg = X[1];
  for (let i = 0; i < 4; i++) {
    const [px, py] = SPOTS[i], id = Object.hasOwn(r.assigned, PLACES[i]) ? r.assigned[PLACES[i]] : X[2];
    svg += gdfRaw(X[3], px, py, i === r.destination ? X[4] : X[5], i === r.destination ? 6 : 2);
    if (id) {
      const scale = id === X[6] ? 0.4 : 0.62, width = id === X[7] ? 222 : 360, height = id === X[8] ? 372 : 240;
      svg += gdfRaw(X[9], px + (256 - width * scale) / 2, py + 30 + (154 - height * scale) / 2, scale, svgBody(moduleSVG(id, c)));
    } else svg += gdfRaw(X[10], px + 98, py + 106, px + 158, px + 128, py + 76, py + 136);
  }
  for (let i = 0; i < 8; i++) svg += gdfRaw(X[11], 45 + i * 28, c.beats & (1 << i) ? X[12] : X[13]);
  const parked = helperAnchor(r);
  svg += gdfRaw(X[14], parked[0], parked[1]);
  if (r.complete) svg += X[15];
  if (r.mode !== X[16]) svg += linksSVG(r, c, state);
  if (r.mode === X[17]) svg = gdfRaw(X[21], [X[18], X[19], X[20]][r.panel], 72 - r.panel * 24) + svg + X[22];
  return X[23] + svg + X[24];
}
// links_svg(c): the dashed frame round the spare bay, each fitted link's copy, and Bea's paper once all three fit.
export function linksSVG(r, c, state) {
  const A = GODOT_ART['habitat_room.gd'].links_svg, p = SPOTS[sparePlace(r)], center = [p[0] + 128, p[1] + 108];
  let svg = gdfRaw(A[0], p[0] + 8, p[1] + 26, r.ready ? A[1] : A[2], r.ready ? 8 : 4);
  for (const i of r.links) {
    const s = SPOTS[placeOf(r, ITEMS[i])], d = [Math.sign(s[0] - p[0]), Math.sign(s[1] - p[1])], at = [center[0] + d[0] * 82, center[1] + d[1] * 46];
    const scale = i === 1 ? 0.11 : 0.14, sz = i === 1 ? [222, 372] : [360, 240];
    svg += gdfRaw(A[3], at[0] - sz[0] * scale / 2, at[1] - sz[1] * scale / 2, scale, svgBody(moduleSVG(ITEMS[i], c)));
  }
  if (r.links.length === 3) {
    const colors = PAPER_COLORS[invitation(state).value], paper = [...center];
    for (let i = 0; i < 3; i++) if (facing(r, i) === 2) { const s = SPOTS[placeOf(r, ITEMS[i])]; paper[0] -= Math.sign(s[0] - p[0]) * 70; paper[1] -= Math.sign(s[1] - p[1]) * 46; }
    svg += gdfRaw(A[4], paper[0] - 22, paper[1] + 20, paper[0], paper[1] - 7, paper[0] + 22, paper[1] + 20, colors[1], colors[0]);
  }
  return svg;
}
