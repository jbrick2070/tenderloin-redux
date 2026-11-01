// The orbital commons, its finale recap and the return home: godot/orbital_commons.gd. Visit-only.
// Movement is a pure step(orbit, dtMs, reducedMotion); the DOM loop lives in ui.js.
import { G, C } from './text.js';
import { compose, midSentence, display, ENDING_COMPOSE as K, ENDING_DISPLAY } from './compose.js';
import { L } from '../i18n.js';
import { filmShotTitle } from './rules.js';
import { moduleSVG, svgBody, PAPER_COLORS, escapeXML } from './art.js';
import { ITEMS, TITLES, NAMES, sparePlace, invitation, habitatCopies } from './habitat.js';

const T = G['orbital_commons.gd'], K0 = C['orbital_commons.gd'], M = C['main.gd'];
const { DESTINATIONS, DISPLAY_RECTS, JUNCTION, ENTRY, GATHERED } = K0;
const BEA_TITLES = C['bea_invitation.gd'].TITLES, QUIET_TITLES = C['quiet_seats.gd'].TITLES;
export const SPEED = 135, THANH_SPEED = 0.8, MAX_FRAME_MS = 50, HOP_MS = 250, THANH_START = [432, 350];
export { DESTINATIONS, JUNCTION, ENTRY };
export const freshOrbit = () => ({
  visible: false, started: false, copies: null, invitationTitle: '', invitationColors: [],
  player: [...ENTRY], thanh: [...THANH_START], playerPath: [], thanhPath: [], target: -1, reached: -1, sharing: -1, shared: -1, notice: '',
  phase: 'walk', gathering: -1, completed: false, returned: false, returnPanel: 0, memory: 0, hop: [0, 0],
});
const clone = o => structuredClone(o);
// halt(o) as a fresh copy to change further.
const halted = o => { const h = halt(o).orbit; return h === o ? clone(o) : h; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
// Geometry2D.get_closest_point_to_segment
function closest(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1]], len = ab[0] * ab[0] + ab[1] * ab[1];
  if (len === 0) return [...a];
  const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / len));
  return [a[0] + ab[0] * t, a[1] + ab[1] * t];
}
// route(from, to): direct along one spoke from the junction, otherwise through it. A destination is never a teleport.
export function route(from, to) {
  if (dist(from, to) < 1) return [];
  const ends = [ENTRY, ...DESTINATIONS, add(DESTINATIONS[0], [42, 10]), add(DESTINATIONS[1], [42, 10]), add(DESTINATIONS[2], [42, 10]), [432, 350]];
  for (const end of ends) if (dist(closest(from, JUNCTION, end), from) < 1 && dist(closest(to, JUNCTION, end), to) < 1) return [[...to]];
  const out = [];
  if (dist(from, JUNCTION) > 1) out.push([...JUNCTION]);
  if (dist(to, JUNCTION) > 1) out.push([...to]);
  return out;
}
export const moving = o => o.playerPath.length > 0 || o.thanhPath.length > 0;
export const canGather = o => o.phase === 'walk' && o.reached >= 0 && o.shared === o.reached && !moving(o) && o.sharing < 0;

// open_chapter(): the room must be welcomed, departed, at panel 3 and ready, with a valid invitation.
export function openChapter(o, room, state) {
  const inv = invitation(state), c = habitatCopies(state);
  if (!c || !room.complete || room.mode !== 'depart' || room.panel !== 2 || !room.ready || !inv.valid) return { orbit: o, opened: false };
  let next = clone(o);
  if (!next.started) Object.assign(next, { copies: c, invitationTitle: BEA_TITLES[inv.value], invitationColors: [...PAPER_COLORS[inv.value]], started: true });
  next = halted(next); next.visible = true;
  return { orbit: next, opened: true, focus: 'reader' };
}
// halt(): stops both walkers and says so when either was moving.
export function halt(o) {
  const was = moving(o), resident = o.thanhPath.length > 0;
  if (!was && o.sharing < 0) return { orbit: o, halted: false };
  const next = clone(o);
  next.playerPath = []; next.thanhPath = []; next.sharing = -1;
  if (was) next.notice = L(resident ? T.halt.thanh : T.halt.stopped);
  return { orbit: next, halted: was };
}
export function walkTo(o, index) {
  if (!o.started || o.phase !== 'walk' || index < 0 || index > 2) return { orbit: o };
  if (o.target === index && o.playerPath.length) return { orbit: o };
  const next = halted(o);
  next.target = index;
  if (dist(next.player, DESTINATIONS[index]) < 1) { next.reached = index; next.notice = compose(K.youAreBy, { place: L(TITLES[index]) }); }
  else { next.reached = -1; next.playerPath = route(next.player, DESTINATIONS[index]); next.hop[0] = 0; next.notice = compose(K.walkingTo, { place: L(TITLES[index]) }); }
  return { orbit: next, changed: true };
}
export function inviteThanh(o) {
  if (o.phase !== 'walk' || o.reached < 0 || moving(o) || o.shared === o.reached) return { orbit: o };
  const next = clone(o);
  next.sharing = next.reached; next.shared = -1;
  next.thanhPath = route(next.thanh, add(DESTINATIONS[next.reached], [42, 10])); next.hop[1] = 0;
  next.notice = compose(K.thanhJoins, { place: L(TITLES[next.reached]) });
  if (!next.thanhPath.length) { next.shared = next.sharing; next.sharing = -1; next.notice = L(T.invite_thanh.beside); }
  return { orbit: next, changed: true };
}
const moveToward = (p, to, d) => { const l = dist(p, to); return l <= d || l === 0 ? [...to] : [p[0] + (to[0] - p[0]) / l * d, p[1] + (to[1] - p[1]) / l * d]; };
// _process(delta): frame time capped at 50 ms, 135 px/s for the player and 0.8x for Thanh. With reduced motion each walker
// hops one route vertex at a time, 250 ms apart, so a destination is still reached through every waypoint.
export function step(o, dtMs, reducedMotion = false) {
  if (!o.started || !o.visible || !moving(o)) return { orbit: o, events: [] };
  const next = clone(o), events = [], dt = Math.min(Math.max(0, dtMs), MAX_FRAME_MS) / 1000, distance = dt * SPEED;
  const advanceWalker = (key, pathKey, scale, hopIndex) => {
    if (!next[pathKey].length) return false;
    if (reducedMotion) {
      next.hop[hopIndex] += dt * 1000;
      if (next.hop[hopIndex] < HOP_MS) return false;
      next.hop[hopIndex] = 0; next[key] = next[pathKey].shift();
    } else {
      next[key] = moveToward(next[key], next[pathKey][0], distance * scale);
      if (dist(next[key], next[pathKey][0]) < 0.1) next[pathKey].shift();
    }
    return next[pathKey].length === 0;
  };
  if (advanceWalker('player', 'playerPath', 1, 0)) { next.reached = next.target; next.notice = compose(K.youReached, { place: L(TITLES[next.reached]) }); events.push('arrived'); }
  if (advanceWalker('thanh', 'thanhPath', THANH_SPEED, 1)) { next.shared = next.sharing; next.sharing = -1; next.notice = L(T._process.joined); events.push('joined'); }
  return { orbit: next, events };
}

const beats = o => o.copies.beats;
// The palette id as the commons says it mid-sentence ("warm").
const palette = c => midSentence(display(ENDING_DISPLAY.artPalettes, c.art.palette));
export function response(o) {
  const r = T.response, c = o.copies;
  if (o.shared < 0) return L(r.waits);
  if (o.shared === 0) return compose(K.responseArt, { palette: palette(c) });
  if (o.shared === 1) return compose(K.responseFilm, { ending: midSentence(filmShotTitle(c.film.order[2])), beats: L(beats(o) === 0 ? r.beatsNone : r.beatsSome) });
  return compose(K.responseSeats, { seats: L(QUIET_TITLES[c.pause]), format: L(M.CIVIC_FORMAT_LABELS[c.civic.format]) });
}
export const recognition = o => o.returned ? L(T.recognition.returned) : o.completed ? L(T.recognition.completed) : '';
function acknowledgments(o, room) {
  const a = T.acknowledgments, c = o.copies;
  return compose(K.acknowledgments, {
    place: L(TITLES[o.gathering]), palette: palette(c), spare: midSentence(L(NAMES[sparePlace(room)])), framing: midSentence(L(M.FILM_FRAMING_LABELS[c.film.framing])),
    plan: midSentence(L(M.FILM_PLAN_LABELS[c.film.plan])), beats: L(beats(o) === 0 ? a.beatsNone : a.beatsSome), seats: L(QUIET_TITLES[c.pause]),
    format: L(M.CIVIC_FORMAT_LABELS[c.civic.format]), title: L(o.invitationTitle),
  });
}
function finaleText(o, room) {
  const f = T.finale_text, c = o.copies, place = L(TITLES[o.gathering]), answer = L([f.answer0, f.answer1, f.answer2][o.gathering]);
  let body = acknowledgments(o, room);
  if (o.phase === 'gathered') body += compose(K.yourResponse, { answer }) + L(o.completed ? f.gatheredDone : f.gatheredOpen);
  else if (o.phase === 'menu') body = recognition(o) + compose(K.youAnswer, { answer }) + L(f.menu);
  else if (o.phase === 'recap') body = compose(K.memories, { memory: L(TITLES[o.memory]) }) + '\n' + [
    () => compose(K.recapArt, { palette: palette(c), spare: L(NAMES[sparePlace(room)]) }),
    () => compose(K.recapFilm, { first: filmShotTitle(c.film.order[0]), second: filmShotTitle(c.film.order[1]), third: filmShotTitle(c.film.order[2]), framing: L(M.FILM_FRAMING_LABELS[c.film.framing]) }),
    () => compose(K.recapSeats, { seats: L(QUIET_TITLES[c.pause]), format: L(M.CIVIC_FORMAT_LABELS[c.civic.format]) }),
  ][o.memory]() + '\n' + acknowledgments(o, room);
  else if (o.phase === 'return') {
    const panel = o.returnPanel === 0 ? compose(K.returnFold, { title: L(o.invitationTitle), place }) : L([f.return1, f.return2][o.returnPanel - 1]);
    body = compose(K.returnPanel, { number: o.returnPanel + 1, panel });
  }
  return body + compose(K.speculative, { beats: L(beats(o) === 0 ? f.beatsNone : f.beatsSome) });
}
const HEADINGS = () => ({ walk: T.refresh.walk, gathered: T.refresh.gathered, menu: T.refresh.menu, return: T.refresh.return, recap: T.refresh.recap });
// The heading's first line is the title, its second the credit (ending/ui.js splits it at the newline).
export const orbitHeading = o => compose(K.starsHeading, { view: L(HEADINGS()[o.phase]) }) + L(T.refresh.credit);
function labels(o) {
  const t = T.refresh;
  if (o.phase === 'gathered') return [o.completed ? t.backChoices : t.keepOpen, t.backCommons, '', '', '', t.back, t.pause];
  if (o.phase === 'menu') return [t.returnHome, t.explore, t.memories, t.gathering, '', t.back, t.pause];
  if (o.phase === 'return') return [t.previous, o.returnPanel < 2 ? t.next : t.home, o.returnPanel < 2 ? t.skip : '', '', '', t.backChoices, t.pause];
  if (o.phase === 'recap') return [t.artMemory, t.filmMemory, t.seatsMemory, t.backChoices, '', t.back, t.pause];
  const out = [t.walkArt, t.walkFilm, t.walkSeats, t.invite, t.stop, t.back, t.pause];
  if (!moving(o)) out[4] = o.completed ? t.finale : canGather(o) ? t.gather : t.stop;
  return out;
}
export function orbitButtons(o) {
  const texts = labels(o).map(label => label && L(label)), out = texts.map((label, i) => ({ id: `orbit-${i}`, label, name: label, hidden: !label, disabled: false }));
  if (o.phase === 'walk') {
    out[3].disabled = o.reached < 0 || moving(o) || o.shared === o.reached;
    out[4].disabled = !moving(o) && !canGather(o) && !o.completed;
    for (let i = 0; i < 3; i++) out[i].name = o.reached === i ? compose(K.walkHere, { label: texts[i] }) : texts[i];
  }
  return out;
}
export function orbitText(o, room) {
  const t = T.refresh;
  if (o.phase !== 'walk') return finaleText(o, room);
  let body = L(t.intro) + o.notice + '\n' + response(o);
  if (o.shared >= 0) body = response(o) + '\n' + o.notice + L(t.another);
  body += compose(K.commonsInvitation, { title: L(o.invitationTitle), beats: L(beats(o) === 0 ? t.beatsNone : t.beatsSome) });
  if (o.gathering >= 0 && !o.completed) body = L(t.still) + body;
  if (o.completed) body = recognition(o) + '\n' + body;
  return body;
}
export const orbitAnnounce = o => o.phase !== 'walk' ? compose(K.titled, { title: orbitHeading(o).split('\n')[0], text: recognition(o) }) : o.shared >= 0 && !moving(o) ? response(o) : o.notice;
export function orbitalView(o, room) {
  return { heading: orbitHeading(o), text: orbitText(o, room), buttons: orbitButtons(o), announce: orbitAnnounce(o), svg: orbitalSVG(o, room) };
}

const phaseChange = (o, phase) => { const next = halted(o); next.phase = phase; return next; };
// action(index): the seven tray controls, whose meaning changes by phase. effect: 'pause' closes the room
// (pause_chapter), 'departure' shows the room at panel 3 (back_to_departure), 'home' completes the return.
export function orbitAction(o, index) {
  if (!o.started || !o.visible) return { orbit: o };
  const b = orbitButtons(o)[index];
  if (!b || b.hidden || b.disabled) return { orbit: o };
  if (index === 6) return { orbit: halted(o), effect: 'pause' };
  if (index === 5) {
    if (o.phase === 'return') return { orbit: phaseChange(o, 'menu'), focus: 'reader' };
    const next = halted(o); next.visible = false;
    return { orbit: next, effect: 'departure' };
  }
  if (o.phase === 'walk') {
    if (index < 3) return walkTo(o, index);
    if (index === 3) return inviteThanh(o);
    if (moving(o)) return { ...halt(o), announce: true };
    if (o.completed) return { orbit: phaseChange(o, 'menu'), focus: 'reader' };
    if (canGather(o)) { const next = phaseChange(o, 'gathered'); next.gathering = o.shared; return { orbit: next, focus: 'reader' }; }
    return { orbit: o };
  }
  if (o.phase === 'gathered') {
    if (index === 0) { const next = phaseChange(o, 'menu'); next.completed = true; return { orbit: next, focus: 'reader' }; }
    if (index === 1) return { orbit: phaseChange(o, 'walk'), focus: 'reader' };
  }
  if (o.phase === 'menu') {
    if (index === 0) { const next = phaseChange(o, 'return'); next.returnPanel = 0; return { orbit: next, focus: 'reader' }; }
    return { orbit: phaseChange(o, ['walk', 'recap', 'gathered'][index - 1]), focus: 'reader' };
  }
  if (o.phase === 'return') {
    if (index === 0) { if (o.returnPanel === 0) return { orbit: phaseChange(o, 'menu'), focus: 'reader' }; const next = phaseChange(o, 'return'); next.returnPanel--; return { orbit: next, focus: 'reader' }; }
    if (index === 1) { if (o.returnPanel < 2) { const next = phaseChange(o, 'return'); next.returnPanel++; return { orbit: next, focus: 'reader' }; } return returnHome(o); }
    if (index === 2) { const next = phaseChange(o, 'return'); next.returnPanel = 2; return { orbit: next, focus: 'reader' }; }
  }
  if (o.phase === 'recap') {
    if (index < 3) { const next = phaseChange(o, 'recap'); next.memory = index; return { orbit: next, focus: 'reader' }; }
    if (index === 3) return { orbit: phaseChange(o, 'menu'), focus: 'reader' };
  }
  return { orbit: o };
}
// return_home(): only from the third still panel after the gathering finished.
export function returnHome(o) {
  if (o.phase !== 'return' || o.returnPanel !== 2 || !o.completed) return { orbit: o };
  const next = halted(o);
  next.returned = true; next.phase = 'menu';
  return { orbit: next, effect: 'home', announce: recognition(next) + L(T.return_home.tail) };
}

// _draw() and person(), flattened to one 720x480 inline SVG. Figures are their own <g> so ui.js can move them per frame.
function person(id, coat, skin, hair, kind = '') {
  let s = `<g id="${id}" data-figure><circle cx="0" cy="2" r="13" fill="#29434a"/><path d="M-5 -4L-6 3M5 -4L6 3" stroke="#29434a" stroke-width="5"/><circle cx="0" cy="-20" r="11" fill="#${coat}"/><rect x="-11" y="-20" width="22" height="18" fill="#${coat}"/><circle cx="0" cy="-34" r="10" fill="#${skin}"/><path d="M-9 -36A9 9 0 0 1 9 -36" fill="none" stroke="#${hair}" stroke-width="5"/>`;
  if (kind === 'headphones') s += '<path d="M-13 -34A13 13 0 0 1 13 -34" fill="none" stroke="#182c38" stroke-width="4"/><circle cx="-12" cy="-33" r="4" fill="#182c38"/><circle cx="12" cy="-33" r="4" fill="#182c38"/>';
  if (kind === 'rollator') s += '<path d="M-19 -12V13H19V-12M-19 -10H19" fill="none" stroke="#c7ded6" stroke-width="4"/><circle cx="-19" cy="15" r="5" fill="#182c38"/><circle cx="19" cy="15" r="5" fill="#182c38"/>';
  return s + '</g>';
}
const at = p => `translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`;
export const depictedPlayer = o => o.gathering >= 0 && o.phase !== 'walk' ? DESTINATIONS[o.gathering] : o.player;
export const depictedThanh = o => o.gathering >= 0 && o.phase !== 'walk' ? add(DESTINATIONS[o.gathering], [42, 10]) : o.thanh;
const tri = (p, dx, dy) => `${p[0] - dx} ${p[1] + dy}L${p[0]} ${p[1] - dy}L${p[0] + dx} ${p[1] + dy}Z`;
const nested = (svg, x, y, w, h, box) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${box}" preserveAspectRatio="none">${svgBody(svg)}</svg>`;
const BOXES = ['0 0 360 240', '0 0 222 372', '0 0 360 240'];
export function orbitalSVG(o, room) {
  if (!o.started) return '';
  const c = o.copies, colors = o.invitationColors, mods = ITEMS.map(id => moduleSVG(id, c));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" role="img" aria-labelledby="orbit-title orbit-desc" class="orbit-svg"><title id="orbit-title">${escapeXML(orbitHeading(o).split('\n')[0])}</title><desc id="orbit-desc">${escapeXML(orbitAnnounce(o) || '')}</desc>`;
  s += '<rect width="720" height="480" fill="#182c38"/><path d="M18 68H702V458L670 478H50L18 458Z" fill="#d5d5bb"/><rect x="26" y="14" width="668" height="55" fill="#29434a"/><circle cx="370" cy="150" r="105" fill="#7eb8bc"/><circle cx="390" cy="180" r="92" fill="#548b84"/><rect x="26" y="69" width="668" height="407" fill="#d5d5bb"/>';
  for (const p of [[90, 33], [210, 24], [560, 35], [632, 25]]) s += `<circle cx="${p[0]}" cy="${p[1]}" r="2" fill="#fff2d7"/>`;
  s += `<path d="M154 310L${JUNCTION[0]} ${JUNCTION[1]}L562 330M${JUNCTION[0]} ${JUNCTION[1]}L${ENTRY[0]} ${ENTRY[1]}" fill="none" stroke="#f4ebce" stroke-width="42" stroke-linejoin="round"/>`;
  for (let i = 0; i < 3; i++) {
    const [x, y, w, h] = DISPLAY_RECTS[i];
    s += `<rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" fill="#29434a"/>` + nested(mods[i], x, y, w, h, BOXES[i]);
    s += `<circle cx="${DESTINATIONS[i][0]}" cy="${DESTINATIONS[i][1]}" r="20" fill="none" stroke="#487c74" stroke-width="3"/>`;
  }
  for (let i = 0; i < 8; i++) s += `<rect x="${253 + i * 27}" y="456" width="18" height="7" fill="${c.beats & (1 << i) ? '#29434a' : '#c9bea5'}"/>`;
  s += `<path d="M58 421L82 393L106 421Z" fill="#${colors[1]}"/><path d="M58 421H106" stroke="#${colors[0]}" stroke-width="3"/>`;
  if (o.phase !== 'return') {
    const places = o.gathering >= 0 ? GATHERED[o.gathering] : [[88, 382], [82, 326], [640, 326]];
    s += `<g transform="${at(places[0])}">${person('orbit-bea', 'c5874f', '966345', 'dad7c6', 'rollator')}</g><g transform="${at(places[1])}">${person('orbit-celeste', 'c87d82', '8b5b3f', '383c32')}</g><g transform="${at(places[2])}">${person('orbit-dez', '978aaf', '704b37', '292f2b', 'headphones')}</g>`;
    if (o.gathering >= 0) {
      const paper = [[185, 432], [560, 438], [550, 438]][o.gathering];
      s += `<path d="M${tri(paper, 23, 14)}" fill="#${colors[1]}"/><circle cx="${paper[0]}" cy="${paper[1]}" r="30" fill="none" stroke="#c88436" stroke-width="4"/>`;
      if (o.completed) s += `<path d="M${paper[0] - 7} ${paper[1]}L${paper[0] - 1} ${paper[1] + 7}L${paper[0] + 12} ${paper[1] - 8}" fill="none" stroke="#29434a" stroke-width="4"/>`;
    }
    if (o.shared >= 0) { const d = add(DESTINATIONS[o.shared], [21, 5]); s += `<circle cx="${d[0]}" cy="${d[1]}" r="38" fill="none" stroke="#c88436" stroke-width="5"/>`; }
    s += `<g data-walker="thanh" transform="${at(depictedThanh(o))}">${person('orbit-thanh', 'b59b5d', 'c38c65', '454236')}</g>`;
    s += `<g data-walker="player" transform="${at(depictedPlayer(o))}">${person('orbit-player', 'e8b861', 'e7c39b', '29434a')}<circle cx="0" cy="-51" r="4" fill="#fff2d7"/></g>`;
  }
  if (o.phase === 'recap') { const [x, y, w, h] = DISPLAY_RECTS[o.memory]; s += `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="none" stroke="#c88436" stroke-width="5"/>`; }
  if (o.phase === 'return') {
    s += '<rect x="26" y="290" width="668" height="162" fill="#f4ebce"/>';
    if (o.returnPanel === 0) s += '<circle cx="160" cy="370" r="55" fill="#7eb8bc"/><circle cx="160" cy="370" r="70" fill="none" stroke="#548b84" stroke-width="4"/>';
    else if (o.returnPanel === 1) for (let i = 0; i < 3; i++) {
      const extent = i === 1 ? [222, 372] : [360, 240], fit = Math.min(100 / extent[0], 104 / extent[1]), drawn = [extent[0] * fit, extent[1] * fit];
      s += nested(mods[i], 66 + i * 126 + (100 - drawn[0]) / 2, 316 + (104 - drawn[1]) / 2, drawn[0], drawn[1], BOXES[i]);
    }
    else s += '<rect x="110" y="309" width="106" height="128" fill="none" stroke="#29434a" stroke-width="8"/><path d="M110 309L180 332V437" fill="none" stroke="#548b84" stroke-width="5"/>';
    s += `<path d="M${tri([550, 370], 52, 35)}" fill="#${colors[1]}"/><path d="M498 405H602" stroke="#${colors[0]}" stroke-width="6"/>`;
  }
  if (o.phase !== 'return') for (let i = 0; i < 3; i++) s += `<text x="${DESTINATIONS[i][0]}" y="${DESTINATIONS[i][1] + 34}" text-anchor="middle" font-size="14" fill="#182c38" font-family="sans-serif">${escapeXML(L(TITLES[i]))}</text>`;
  // Floor destinations: invisible hit areas, sized to 44 CSS px by ui.js. The Walk buttons are the accessible path.
  if (o.phase === 'walk') for (let i = 0; i < 3; i++) s += `<rect data-target="${i}" x="${DESTINATIONS[i][0] - 22}" y="${DESTINATIONS[i][1] - 22}" width="44" height="44" fill="transparent" pointer-events="all" aria-hidden="true"/>`;
  return s + '</svg>';
}
