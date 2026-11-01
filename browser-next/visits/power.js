// Power Story (godot/power_story.gd) and the Larkin place (godot/power_place.gd), pure.
// Visit-only. Shared episode context `ctx` (see picker.js): { opened, busy, walking, player,
// activeId, musicPlaying, powerPlace (parsed power_place.json or null), sites: { larkin } }.
import { POWER, GODOT_TEXT, web } from './text.js';
import { gdf, gdFloat, f32 } from './format.js';
import { RELAY_GOALS, RELAY_GODOT_GOALS, LARKIN_JUNCTION, LARKIN_JUNCTION_XZ, RELAY_LAMPS, BATTERY_STAND, PIXELS_PER_METRE } from './positions.js';

export const { NAMES, VOICES, CLUES, SOURCES, SINKS, DIRECTIONS, ARRIVAL_M } = POWER;
const T = GODOT_TEXT['power_story.gd'];
export const TEXT = T;
export const ID = 'power';
export const INITIAL_TURNS = () => [[0, 0, 1, 1], [2, 0, 3, 1], [3, 0, 1, 2]];
// Brute force over all 256 turn sets (tests/next-visits.test.mjs): each relay has exactly one.
export const SOLUTIONS = ['2103', '0213', '1230'];
export const ARRIVAL = ARRIVAL_M * PIXELS_PER_METRE;
// The connector pads are DOM buttons over the diagram cells (360x240 viewBox, 88 px cells),
// so they always fit; Godot's connector_room message stays copied but never shows by default.
export const PAD_CELLS = [0, 1, 2, 3].map(i => ({ x: 82 + (i % 2) * 96, y: 20 + Math.trunc(i / 2) * 96, size: 88 }));
export const MAP_LABEL_POINTS = [[18, 184], [285, 219], [323, 1], [160, 165]];

export function initialPower() {
  return { open: false, active: false, won: false, historical: false, mapView: false, restored: 0, station: 0, turns: INITIAL_TURNS(), traveling: false, tripGoal: null, message: '' };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const bit = (p, i) => (p.restored & (1 << i)) !== 0;
const count = p => (bit(p, 0) ? 1 : 0) + (bit(p, 1) ? 1 : 0) + (bit(p, 2) ? 1 : 0);
const copy = p => ({ ...p, turns: p.turns.map(r => [...r]) });
export const available = (ctx = {}) => !!ctx.opened;
// Godot site_valid: data loaded and the junction on the walkable network.
export const siteValid = (ctx = {}) => !!ctx.powerPlace && ctx.sites?.larkin !== false;
export function relayGoal(p, index, ctx = {}) {
  if (p.historical && index === 0) return ctx.larkinGoal ?? LARKIN_JUNCTION;
  return (ctx.relayGoals ?? RELAY_GOALS)[index] ?? null;
}
export const near = (p, ctx = {}) => !ctx.walking && !!ctx.player && dist(ctx.player, relayGoal(p, p.station, ctx)) <= ARRIVAL;
export function phaseName(p, index) {
  const P = T.phase_name;
  return p.historical ? [P.larkin0, P.larkin1, P.larkin2][index] : NAMES[index];
}
const room = ctx => ctx.connectorRoom !== false;
const canTurn = (p, ctx) => p.open && p.active && room(ctx) && !p.mapView && near(p, ctx) && !bit(p, p.station);

// Godot connected(), exact: follow the inlet through all four elbows to the sink.
export function connected(turns, station) {
  let at = SOURCES[station][0], incoming = SOURCES[station][1];
  const visited = [], step = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  while (!visited.includes(at)) {
    visited.push(at);
    const a = turns[station][at], b = (a + 1) % 4;
    if (incoming !== a && incoming !== b) return false;
    const outgoing = incoming === a ? b : a;
    if (at === SINKS[station][0] && outgoing === SINKS[station][1]) return visited.length === 4;
    const nx = at % 2 + step[outgoing][0], ny = Math.trunc(at / 2) + step[outgoing][1];
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return false;
    at = ny * 2 + nx; incoming = (outgoing + 2) % 4;
  }
  return false;
}

// Godot open_story's own refusal (delegation to another active episode is picker.js openEpisode).
export function openRefusal(p, ctx = {}) {
  if (p.open) return '';
  return !available(ctx) || ctx.busy || ctx.walking ? T.open_story.refuse : '';
}
export const cancelIntent = p => ({ ...p, traveling: false });
export function endSession(p) {
  return { ...cancelIntent(p), active: false, message: T.end_session.ended };
}
export const resetSession = p => ({ ...initialPower(), open: p.open });

// The reducer: { state, announce, walk? }.
export function changePower(p, action, ctx = {}) {
  const none = { state: p, announce: '' };
  const out = s => ({ state: s, announce: announce(s, ctx) });
  switch (action?.type) {
    case 'open': {
      const refused = openRefusal(p, ctx);
      if (refused) return { state: p, announce: refused, refused: true };
      return out({ ...p, open: true });
    }
    case 'close':
      if (!p.open) return none;
      return { state: { ...p, open: false }, announce: action.announce === false ? '' : T.close_story.back + (p.active ? T.close_story.active : T.close_story.idle) };
    case 'begin': {
      if (p.active) return p.historical && p.open ? out({ ...p, mapView: !p.mapView }) : none;
      if (!p.open || !available(ctx) || (p.historical && !siteValid(ctx))) return none;
      return out({ ...p, active: true, mapView: false, won: false, restored: 0, station: 0, turns: INITIAL_TURNS(), message: p.historical ? T.begin.larkin : T.begin.festival });
    }
    case 'end': {
      const s = endSession(p);
      return { state: s, announce: p.open && action.announce !== false ? announce(s, ctx) : '' };
    }
    case 'choose': {
      const i = action.index;
      if (!Number.isInteger(i) || i < 0 || i > 2) return none;
      const s = copy(p);
      if (!p.active) {
        if (i < 2) { s.historical = i === 1; s.won = false; s.restored = 0; s.station = 0; }
        s.mapView = s.historical; s.message = '';
        return out(s);
      }
      s.station = i; s.mapView = false; s.message = '';
      return out(s);
    }
    case 'walk': {
      if (!p.active || !p.open) return none;
      const s = { ...p, mapView: false };
      if (p.historical && near(p, ctx)) return out({ ...s, message: T.walk_to_relay.already });
      const tripGoal = relayGoal(p, p.station, ctx);
      return { state: { ...s, open: false, traveling: true, tripGoal }, announce: gdf(T.walk_to_relay.walking, [phaseName(p, p.station), p.historical ? T.walk_to_relay.battery : T.walk_to_relay.repair]), walk: tripGoal };
    }
    case 'blocked': {
      // reopen: walk_to_point refused the route (walk_to_relay); otherwise the walk stopped (blocked_route).
      if (action.reopen) {
        const s = { ...cancelIntent(p), message: T.walk_to_relay.closed };
        return changePower(s, { type: 'open' }, { ...ctx, walking: false });
      }
      const s = { ...cancelIntent(p), message: gdf(T.blocked_route.blocked, [p.station + 1]) };
      return { state: s, announce: s.message };
    }
    case 'arrived': {
      if (!p.traveling) return none;
      if (!ctx.player || !p.tripGoal || dist(ctx.player, p.tripGoal) > ARRIVAL) return changePower(p, { type: 'blocked' }, ctx);
      return changePower({ ...p, traveling: false }, { type: 'open' }, { ...ctx, walking: false });
    }
    case 'cancel': return { state: cancelIntent(p), announce: '' };
    case 'rotate': {
      const i = action.index;
      if (!canTurn(p, ctx) || !Number.isInteger(i) || i < 0 || i > 3) return none;
      const s = copy(p);
      s.turns[p.station][i] = (s.turns[p.station][i] + 1) % 4;
      const r = s.turns[p.station][i];
      s.message = gdf(T.rotate.linked, [i + 1, DIRECTIONS[r], DIRECTIONS[(r + 1) % 4]]);
      return out(s);
    }
    case 'check': {
      if (!canTurn(p, ctx)) return none;
      const s = copy(p), C = T.check_path, st = p.station;
      if (!connected(p.turns, st)) s.message = C.notYet;
      else {
        s.restored = p.restored | (1 << st);
        s.message = VOICES[st] + C.there + NAMES[st] + C.backOn;
        if (s.restored === 7) { s.won = true; s.message = C.won; }
        if (p.historical) {
          s.message = VOICES[st] + C.portable;
          if (s.restored === 7) s.message = C.larkinWon;
        }
      }
      return out(s);
    }
    case 'unavailable': return { state: endSession(p), announce: '' };
    case 'reset': return { state: resetSession(p), announce: '' };
    default: return none;
  }
}

// Godot objective().
export function objective(p, ctx = {}) {
  const O = T.objective;
  let next = p.station;
  if (bit(p, next)) for (let i = 0; i < 3; i++) if (!bit(p, i)) { next = i; break; }
  return {
    id: 'power_story', hasTarget: p.restored !== 7, target: relayGoal(p, next, ctx), targetName: phaseName(p, next),
    text: gdf(O.text, [p.restored !== 7 ? phaseName(p, next) : (p.historical ? O.connected : O.back), count(p)]),
    hint: O.hint + (p.restored === 7 ? O.hintEnd : VOICES[next] + O.clue + phaseName(p, next) + '.'),
  };
}

// Godot source_text().
export const sourceText = () => T.source_text.text;
// Straight-line Godot metres from a festival station to the Larkin junction (Godot relay_goal
// distance_to power_place.goal), so the "%.0f m" number matches the 3D edition.
export function stationMetres(index, ctx = {}) {
  const j = ctx.powerPlace?.junction?.xz ?? LARKIN_JUNCTION_XZ, g = RELAY_GODOT_GOALS[index];
  return Math.hypot(g[0] - j[0], g[1] - j[1]);
}

// Godot refresh(): heading, credit, reader, pads, tabs and actions.
export function powerView(p, ctx = {}) {
  const R = T.refresh, S = T.setup, c = count(p), valid = siteValid(ctx), nearNow = near(p, ctx);
  let heading = p.historical ? gdf(R.headingLarkin, [c]) : gdf(R.heading, [c]);
  let credit = p.historical ? R.creditLarkin : R.credit;
  if (p.won && !p.active) heading = R.ended;
  if (!p.active && !p.historical && !p.won) { heading = R.hub; credit = R.hubCredit; }
  let text = R.intro;
  if (p.active) {
    const st = p.station;
    text = gdf(R.relay, [st + 1, phaseName(p, st), VOICES[st], CLUES[st], DIRECTIONS[SOURCES[st][1]], SOURCES[st][0] + 1, DIRECTIONS[SINKS[st][1]], SINKS[st][0] + 1]);
    text += bit(p, st) ? R.restored : (nearNow ? R.atRelay : R.walkFirst);
    text += R.backKeeps;
  }
  if (p.historical) {
    if (!p.active || p.mapView) text = (p.active ? R.battery : R.beginLarkin) + sourceText();
    else {
      text = R.inspired + phaseName(p, p.station) + '.\n' + text;
      if (p.station > 0) text += gdf(R.distance, [stationMetres(p.station, ctx)]);
      text += R.restoredReal;
    }
    if (p.active) text = text.replaceAll(R.repairSurface, R.batteryView);
    if (!valid) text = R.unavailable + text;
  }
  if (p.message) text = p.message + '\n' + text;
  if (!room(ctx)) text = R.room + text;
  const padsDisabled = !p.active || !room(ctx) || p.mapView || !nearNow || bit(p, p.station);
  const pads = [0, 1, 2, 3].map(i => {
    const r = p.turns[p.station][i];
    return { index: i, ...PAD_CELLS[i], disabled: padsDisabled, name: gdf(R.pad, [i + 1, DIRECTIONS[r], DIRECTIONS[(r + 1) % 4]]), visible: !(p.historical && (!p.active || p.mapView)) };
  });
  const tabs = [0, 1, 2].map(i => p.active
    ? { index: i, label: gdf(R.tab, [i + 1, bit(p, i) ? R.ok : '']), name: gdf(R.tabName, [i + 1, phaseName(p, i), bit(p, i) ? R.restoredWord : R.notRestored]), disabled: false }
    : { index: i, label: [R.festival, R.larkin, R.placeMap][i], name: [R.festivalName, R.larkinName, R.placeName][i], disabled: i === 2 && !p.historical });
  const actions = [
    { id: 'begin', label: p.active && p.historical ? (p.mapView ? R.batteryButton : R.caseMap) : (p.won ? R.replay : R.begin), disabled: (p.active && !p.historical) || (p.historical && !valid) },
    { id: 'walk', label: S.walk, disabled: !p.active },
    { id: 'check', label: S.check, disabled: padsDisabled },
    { id: 'end', label: S.end, disabled: !p.active },
    { id: 'music', label: ctx.musicPlaying ? R.musicOn : R.musicOff, disabled: false },
    { id: 'back', label: S.back, disabled: false },
  ].map(a => ({ ...a, name: a.label.replace(/\n/g, ' ') + (a.id === 'music' ? T._process.soundtrack : '') }));
  const showMap = p.historical && (!p.active || p.mapView);
  return {
    heading, credit, text, pads, tabs, actions,
    dogs: { label: S.dogs, name: R.dogsName, disabled: p.active }, more: { label: S.more, name: R.moreName, disabled: false },
    picture: showMap ? 'map' : 'diagram',
    mapLabels: [S.map0, S.map1, S.map2, S.map3].map((text, i) => ({ text, x: MAP_LABEL_POINTS[i][0], y: MAP_LABEL_POINTS[i][1], visible: showMap && !!ctx.powerPlace })),
    focus: !p.active ? 'begin' : (nearNow && !bit(p, p.station) && pads[0].visible ? 'pad0' : 'walk'),
  };
}
export const announce = (p, ctx) => { const v = powerView(p, ctx); return v.heading + '. ' + v.text; };
// The hub "Story" button: tooltip without Godot's F8 / Shift F8 hint.
export const entryTooltip = () => web('power_story.gd', T.setup.storyTip);

// Map drawing (Godot apply_lighting / update_world): after dark for the festival while active,
// daytime for Larkin; relay boxes, the battery stand and lit bits.
export function powerScene(p) {
  if (!p.active) return { afterDark: false, pools: false, relays: [], batteryStand: null, larkin: false };
  return {
    afterDark: !p.historical, pools: !p.historical && p.restored === 7, larkin: p.historical,
    relays: RELAY_LAMPS.map((lamp, i) => ({ index: i, ...lamp, lit: bit(p, i), visible: !(p.historical && i === 0) })),
    batteryStand: p.historical ? { ...BATTERY_STAND, lit: bit(p, 0) } : null,
  };
}
// Godot update_world fixtures 0-9 (7 street lamps then 3 gathering lanterns): lit or dark.
export function fixtureLit(p, i) {
  if (!p.active) return true;
  return (p.historical && i < 7) || p.restored === 7 || (i < 3 && bit(p, i)) || (i >= 7 && bit(p, i - 7));
}

// Godot diagram(), verbatim; Vector2 components print as Godot floats ("126.0").
export function diagram(p) {
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect x="2" y="2" width="356" height="236" rx="20" fill="#16313c" stroke="#d9b978" stroke-width="3"/>';
  const D = [[0, -44], [44, 0], [0, 44], [-44, 0]], U = [[0, -1], [1, 0], [0, 1], [-1, 0]], F = v => gdFloat(f32(v));
  for (let i = 0; i < 4; i++) {
    const x = 82 + (i % 2) * 96, y = 20 + Math.trunc(i / 2) * 96, center = [x + 44, y + 44], r = p.turns[p.station][i];
    const a = [center[0] + D[r][0], center[1] + D[r][1]], b = [center[0] + D[(r + 1) % 4][0], center[1] + D[(r + 1) % 4][1]];
    svg += gdf('<rect x="%d" y="%d" width="88" height="88" rx="12" fill="#35515c" stroke="#75949c" stroke-width="2"/><path d="M %s %s L %s %s L %s %s" fill="none" stroke="%s" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="%s" cy="%s" r="5" fill="#d29060"/>', [x, y, F(a[0]), F(a[1]), F(center[0]), F(center[1]), F(b[0]), F(b[1]), bit(p, p.station) ? '#87dbca' : '#ffe1a0', F(center[0]), F(center[1])]);
  }
  for (const endpoint of [SOURCES[p.station], SINKS[p.station]]) {
    const q = [126 + (endpoint[0] % 2) * 96, 64 + Math.trunc(endpoint[0] / 2) * 96], d = U[endpoint[1]];
    const a = [q[0] + d[0] * 44, q[1] + d[1] * 44], b = [q[0] + d[0] * 62, q[1] + d[1] * 62];
    const input = endpoint === SOURCES[p.station];
    svg += gdf('<path d="M %s %s L %s %s" stroke="%s" stroke-width="10"/><circle cx="%s" cy="%s" r="9" fill="%s"/>', [F(a[0]), F(a[1]), F(b[0]), F(b[1]), input ? '#87dbca' : '#ffc765', F(b[0]), F(b[1]), input ? '#87dbca' : '#ffc765']);
    if (input) {
      const side = [-d[1] * 9, d[0] * 9], tip = [q[0] + d[0] * 38, q[1] + d[1] * 38], base = [q[0] + d[0] * 58, q[1] + d[1] * 58];
      svg += gdf('<polygon points="%s,%s %s,%s %s,%s" fill="#16313c"/>', [F(tip[0]), F(tip[1]), F(base[0] + side[0]), F(base[1] + side[1]), F(base[0] - side[0]), F(base[1] - side[1])]);
    }
  }
  svg += '<path d="M 18 222 L 342 222" stroke="#78909a" stroke-width="2"/>';
  return svg + '</svg>';
}

// --- godot/power_place.gd ---
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isDict = v => !!v && typeof v === 'object' && !Array.isArray(v);
export const validPoint = p => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]);
// Godot valid_source(), rule for rule.
export function validSource(value) {
  if (!isDict(value)) return false;
  for (const key of ['junction', 'address_point', 'return_junction', 'exterior', 'eddy']) if (!isDict(value[key])) return false;
  for (const key of ['junction', 'address_point', 'return_junction']) if (!validPoint(value[key].xz)) return false;
  if (!Array.isArray(value.eddy.points) || value.eddy.points.length < 2) return false;
  if (!value.eddy.points.every(validPoint)) return false;
  if (!Array.isArray(value.exterior.polygons) || !value.exterior.polygons.length) return false;
  const polygon = value.exterior.polygons[0];
  if (!isDict(polygon) || !Array.isArray(polygon.rings) || polygon.rings.length !== 1) return false;
  if (!Array.isArray(polygon.rings[0]) || polygon.rings[0].length < 3 || !Array.isArray(polygon.triangles)) return false;
  if (!polygon.rings[0].every(validPoint)) return false;
  if (!polygon.triangles.length || polygon.triangles.length % 3 !== 0) return false;
  for (const index of polygon.triangles) if (!isNum(index) || !Number.isInteger(index) || index < 0 || index >= polygon.rings[0].length) return false;
  const height = value.exterior.height_m;
  return isNum(height) && height > 0;
}
// Godot map_point(xz): uniform metric scale, north up, in the 360x240 case map.
export const mapPoint = xz => ({ x: f32(28 + (Number(xz[0]) + 620) * 1.35), y: f32(24 + (Number(xz[1]) + 100) * 1.35) });
// Godot map_svg(), verbatim. `source` is the parsed power_place.json, or null when not loaded.
export function mapSVG(source) {
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="#18323b"/>';
  if (!source) return svg + '</svg>';
  let points = '';
  for (const pt of source.exterior.polygons[0].rings[0]) { const q = mapPoint(pt); points += gdf('%s,%s ', [gdFloat(q.x), gdFloat(q.y)]); }
  svg += gdf('<polygon points="%s" fill="#738492" stroke="#d8e3dc" stroke-width="2"/>', points);
  points = '';
  for (const pt of source.eddy.points) { const q = mapPoint(pt); points += gdf('%s,%s ', [gdFloat(q.x), gdFloat(q.y)]); }
  svg += gdf('<polyline points="%s" fill="none" stroke="#758b90" stroke-width="14"/>', points);
  const junction = mapPoint(source.junction.xz), address = mapPoint(source.address_point.xz);
  svg += gdf('<circle cx="%s" cy="%s" r="7" fill="#ffcf77"/><circle cx="%s" cy="%s" r="5" fill="#d8e3dc"/><path d="M 290 215 h 54 m -54 -4 v 8 m 54 -8 v 8 M 328 42 v -22 l -5 9 m 5 -9 l 5 9" fill="none" stroke="#d8e3dc" stroke-width="2"/>', [gdFloat(junction.x), gdFloat(junction.y), gdFloat(address.x), gdFloat(address.y)]);
  return svg + '</svg>';
}
