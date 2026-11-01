// 2D map positions for the side stories, surprises and landmarks, from Godot's constants. Where Godot's
// narrower street puts a site in the 2D roadway, its export stands it on the 2D sidewalk instead
// (SIDEWALK_SITES, a declared adaptation) and RAW_* keeps the converted Godot point.
// Godot: X east, Z south, metres. 2D: the fork's map pixels (core.js project, 5 px per metre,
// Turk rotated to the screen). Pure; no DOM, no fetch. core.js is not changed: the proposed
// bounds, the Eddy corridor and a router that uses them are data and functions here, for the
// next agent to move into core.js (tests/next-visits.test.mjs checks them against core.js).
import { streetDistance, distanceToSegment } from '../core.js';
import { BLACK_HAWK } from '../history.js';
import { MAIN } from './text.js';

export const PIXELS_PER_METRE = 5;
export const ORIGIN_LAT = 37.7832203; // core.js ORIGIN.lat
// The same angle as core.js project(): Turk's bearing at the origin.
export const MAP_ANGLE = Math.atan2(0.0002089 * 111320, 0.0016441 * 111320 * Math.cos(ORIGIN_LAT * Math.PI / 180));
const C = Math.cos(MAP_ANGLE), S = Math.sin(MAP_ANGLE);
export function godotToMap(x, z) {
  return { x: PIXELS_PER_METRE * (x * C - z * S), y: PIXELS_PER_METRE * (x * S + z * C) };
}
export function mapToGodot(p) {
  const u = p.x / PIXELS_PER_METRE, v = p.y / PIXELS_PER_METRE;
  return { x: u * C + v * S, z: -u * S + v * C };
}
const xz = ([x, z]) => godotToMap(x, z);
const xyz = ([x, , z]) => godotToMap(x, z);
// A Godot offset in metres (no translation) as a 2D pixel delta.
export const metresToMap = (dx, dz) => godotToMap(dx, dz);
const add = (p, d) => ({ x: p.x + d.x, y: p.y + d.y });

// --- Bounds (proposed; core.js still has OPENING_BOUNDS/BOUNDS of today) ---
export const OPENING_BOUNDS = { left: -300, right: 850, top: -460, bottom: 220 }; // core.js OPENING_BOUNDS
export const ROUTE_BOUNDS = { ...OPENING_BOUNDS, left: -2400 };                   // core.js BOUNDS today
export const BOUNDS = { left: -2400, right: 850, top: -600, bottom: 280 };         // Eddy north, 145 Leavenworth south
export const WALK_EXTENT = { ...BOUNDS, left: -2980 };                             // Larkin junction - 10 m (power_place.gd:52)
export const VIEW_BOUNDS = { left: -2980, right: 850, top: -800, bottom: 280 };    // camera centre clamp (park ring, Larkin)
export const STREET_CORRIDOR = 60;                                                  // core.js walkable: streetDistance < 60

// --- Larkin 2017 (godot/data/power_place.json, copied; the test compares with the file) ---
export const LARKIN_JUNCTION_XZ = [-593.4053562742787, -10.084478799913654];
export const LARKIN_ADDRESS_XZ = [-583.700910879757, -42.10925074712236];
export const TAYLOR_EDDY_XZ = [-16.531448344396075, -103.6611839996192];
export const EDDY_XZ = [[-595.0969483830913, -10.553135999932692], [-585.4895286962443, -11.98916399931278], [-566.1515172750908, -15.206311999732804], [-494.83490190474566, -26.67227199925918], [-458.0328537816451, -32.60562799978203], [-450.3961868504012, -33.84127999998441]];
export const LARKIN_RING_XZ = [[-514.9647336302822, -63.83088799925247], [-513.0907589110758, -51.74153599955986], [-510.53053992923765, -35.277307999364496], [-587.2403313679912, -23.3549359992503], [-593.636479823035, -64.53220399953835], [-510.92645008017894, -77.37853199937632], [-508.96449532743, -64.76597599989731]];
export const LARKIN_JUNCTION = xz(LARKIN_JUNCTION_XZ);      // ≈ (-2921.4, -520.7)
export const LARKIN_ADDRESS = xz(LARKIN_ADDRESS_XZ);        // art only, never a goal
export const TAYLOR_EDDY = xz(TAYLOR_EDDY_XZ);              // Godot's via junction; the 2D router needs none
export const EDDY_WEST = EDDY_XZ.map(xz);                   // ≈ (-2929.4,-524.4) … (-2196.6,-524.5)
export const LARKIN_EXTERIOR = LARKIN_RING_XZ.map(xz);      // plain #738492 footprint
export const BATTERY_STAND = godotToMap(LARKIN_JUNCTION_XZ[0], LARKIN_JUNCTION_XZ[1] + 2.2); // power_story.gd:175

// Mirrors power_place.gd admits(): west of the window, only the Eddy approach to Larkin is walkable.
export function eddyDistance(p) {
  let best = Infinity;
  for (let i = 1; i < EDDY_WEST.length; i++) best = Math.min(best, distanceToSegment(p, EDDY_WEST[i - 1], EDDY_WEST[i]));
  return best;
}
export const inside = (p, b) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
export function proposedWalkable(p, ways) {
  if (inside(p, BOUNDS)) return streetDistance(p, ways) < STREET_CORRIDOR;
  return p.x >= WALK_EXTENT.left && p.x < BOUNDS.left && p.y >= BOUNDS.top && p.y <= BOUNDS.bottom && eddyDistance(p) < STREET_CORRIDOR;
}
// core.js findPath with the proposed walkable test and a cell limit from WALK_EXTENT
// (core.js findPath reads its module BOUNDS and takes no bounds argument).
export function proposedFindPath(start, goal, ways, walk = proposedWalkable) {
  if (!walk(goal, ways)) return [];
  const step = 10, key = p => `${p.x},${p.y}`, E = WALK_EXTENT;
  const limit = Math.ceil((E.right - E.left) / step + 1) * Math.ceil((E.bottom - E.top) / step + 1);
  const cells = new Map();
  const passable = p => { const id = key(p); if (!cells.has(id)) cells.set(id, walk(p, ways)); return cells.get(id); };
  const snap = p => ({ x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step });
  const s = snap(start), g = snap(goal), queue = [s], seen = new Map([[key(s), null]]);
  for (let i = 0; i < queue.length && i < limit; i++) {
    const current = queue[i];
    if (Math.hypot(current.x - g.x, current.y - g.y) < 12) {
      const path = [{ x: goal.x, y: goal.y }]; let cursor = current;
      while (cursor) { path.unshift(cursor); cursor = seen.get(key(cursor)); }
      return path;
    }
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const p = { x: current.x + dx, y: current.y + dy };
      if (!seen.has(key(p)) && passable(p)) { seen.set(key(p), current); queue.push(p); }
    }
  }
  return [];
}

// --- Fork anchors (opening block uses the fork's own positions, not converted Godot ones) ---
export const START = { x: 95, y: -47 };                      // core.js initialState().player
export const HISTORY_STOP = { x: -48, y: -49 };              // world.js PLACES 'history'
export const BEA = { x: 117, y: -49 };                       // world.js NEIGHBORS bea
export const BLACK_HAWK_STOP = { x: BLACK_HAWK.x, y: BLACK_HAWK.y };

// --- The 2D sidewalk: a declared adaptation of where the sites stand, not a change to Godot's constants ---
// world.js strokes every street 76 px wide (a roadway 38 px each side of its centreline) inside a sidewalk to 58 px. Godot's
// road is 5 m (25 px) each side and its sidewalk ends at 8.2 m (41 px), so the sites Godot stands on its sidewalk (6.2 and
// 6.6 m out), the fork's relay lamps (31 px) and the museum (5.4 m) convert into the 2D roadway. Each site keyed below stands
// instead SIDEWALK.at px from its nearest centreline in data/streets.osm.json, on the side it was, moved straight out; a site
// Godot nudges along the curb may take Godot's next step there (the 145 Leavenworth mural, Copper Cue's counter). A point is
// refused that moves more than SIDEWALK.reach px, stands in any roadway, past its own sidewalk, in a drawn building, off the
// walkable streets or out of reach of the start, or nearer than SIDEWALK.clear px to a map object or site it was not already
// that close to (by more than SIDEWALK.slack px); then the site keeps Godot's point. Generated offline, since this module never
// sees the street data; tests/next-visits.test.mjs recomputes every entry, and the sites kept, from the street data.
// Kept where Godot put them: the Bowl & Basil, Saffron and Morning Star fronts, which Godot itself puts in its roadway (2.0, 0.6
// and 2.4 m from the centreline, 36 to 45 px from the 2D sidewalk); Open Seat's front, which would stand 7 px from Thanh;
// Copper Cue's front, 59 px out already; the Larkin battery stand; the dogs' search sites; the dog owners at the gathering.
export const SIDEWALK = Object.freeze({ curb: 38, edge: 58, at: 48, reach: 24, clear: 18, slack: 1 });
const sidewalk = (x, y) => Object.freeze({ x, y });
export const SIDEWALK_SITES = Object.freeze({
  // eatery_counter_site, 6.6 m out (RAW_EATERY_COUNTERS, 33 px): 15 px further out.
  'counter:bowl_basil_pho': sidewalk(-1946.3, 48.1),      // raw (-1946.3, 33.1), Turk
  'counter:saffron_clay_oven': sidewalk(-683.4, -258.9),  // raw (-698.4, -258.9), Jones
  'counter:blue_valve_hifi': sidewalk(-1216.9, -572.7),   // raw (-1216.9, -557.7), Eddy
  'counter:morning_star_banh_mi': sidewalk(-275.3, 48.2), // raw (-275.4, 33.2), Turk
  'counter:copper_cue_tavern': sidewalk(-1511.7, -371.2), // raw (-1496.7, -356.2), Leavenworth; 3 m along the curb, clear of its front
  'counter:open_seat_diner': sidewalk(47.4, 151.8),       // raw (32.4, 151.7), Taylor
  // surprise_sidewalk_site, 6.2 m out (RAW_SURPRISE_SITES, 31 px): 17 px further out.
  'surprise:jeffrey_record': sidewalk(-1906.7, 48.1),      // raw (-1906.7, 31.1), Turk
  'surprise:hidden_mural_145': sidewalk(-1512.5, 234.6),   // raw (-1495.5, 247.1), Leavenworth; 2.5 m along the curb, clear of the 8th floor
  'surprise:impromptu_drag_show': sidewalk(-47.5, -98.3),  // raw (-30.5, -98.1), Taylor
  'surprise:viking_dirt_biker': sidewalk(-1107.3, 48.1),   // raw (-1107.3, 31.1), Turk
  'surprise:cutesy_dino': sidewalk(-683.4, -374.2),        // raw (-700.4, -374.2), Jones
  'surprise:magic_carpet_chef': sidewalk(-1246.7, -476.7), // raw (-1246.7, -493.7), Eddy
  'surprise:bite_size_nachos': sidewalk(-330.2, 48.4),     // raw (-330.3, 31.4), Turk
  'surprise:good_donut_and_bagel': sidewalk(49.8, -262.1), // raw (32.8, -262.1), Taylor
  'surprise:clown_horn_walker': sidewalk(-626.2, -47.9),   // raw (-626.3, -30.9), Turk
  'surprise:mayor_pomp_event': sidewalk(-1420.0, -476.6),  // raw (-1420.0, -493.6), Eddy; 43.5 px from Leavenworth, at the corner
  // NEIGHBORHOOD_EATERIES pos (RAW_EATERY_AWNINGS): the Blue Valve's front, 6.6 m out (33.1 px), stays on its counter as in Godot.
  'awning:blue_valve_hifi': sidewalk(-1216.9, -572.7),     // raw (-1216.9, -557.7), Eddy
  // MUSEUM_HUB_POS, 5.4 m out (RAW_MUSEUM, 26.8 px): 21.3 px further out; the docent keeps Godot's offset from it.
  museum: sidewalk(-1397.7, -572.6),                       // raw (-1397.7, -551.3), Eddy
  // The fork's relay lamps 0-2 (RAW_RELAY_LAMPS, 31 px): 17 px further out; each relay goal stays 7 px south of its lamp.
  'lamp:0': sidewalk(173.3, 48.0),                         // raw (173.3, 31.0), Turk
  'lamp:1': sidewalk(301.6, 48.0),                         // raw (301.6, 31.0), Turk
  'lamp:2': sidewalk(469.5, 48.0),                         // raw (469.5, 31.0), Turk
});
const onSidewalk = (key, raw) => (SIDEWALK_SITES[key] ? { ...raw, ...SIDEWALK_SITES[key] } : raw);

// --- Neighborhood surprises: raw Godot pos, the sidewalk site pinned by the 31 px construction
// (6.2/5.6/6.8 m off the nearest centreline, Godot's shift list x5, clash 13 px), and that site on the 2D sidewalk. ---
export const SURPRISE_RAW = Object.fromEntries(MAIN.NEIGHBORHOOD_SURPRISE_IDS.map(id => [id, xyz(MAIN.NEIGHBORHOOD_SURPRISES[id].pos)]));
export const RAW_SURPRISE_SITES = {
  jeffrey_record: { x: -1906.7, y: 31.1, street: 'Turk Street' },
  hidden_mural_145: { x: -1495.5, y: 247.1, street: 'Leavenworth Street' },
  impromptu_drag_show: { x: -30.5, y: -98.1, street: 'Taylor Street' },
  viking_dirt_biker: { x: -1107.3, y: 31.1, street: 'Turk Street' },
  cutesy_dino: { x: -700.4, y: -374.2, street: 'Jones Street' },
  magic_carpet_chef: { x: -1246.7, y: -493.7, street: 'Eddy Street' },
  bite_size_nachos: { x: -330.3, y: 31.4, street: 'Turk Street' },
  good_donut_and_bagel: { x: 32.8, y: -262.1, street: 'Taylor Street' },
  clown_horn_walker: { x: -626.3, y: -30.9, street: 'Turk Street' },
  mayor_pomp_event: { x: -1420.0, y: -493.6, street: 'Eddy Street' },
};
export const SURPRISE_SITES = Object.fromEntries(Object.entries(RAW_SURPRISE_SITES).map(([id, p]) => [id, onSidewalk(`surprise:${id}`, p)]));

// --- Eateries: awning = raw Godot pos; counter pinned by the 33 px construction (clash 14 px); then the 2D sidewalk. ---
export const RAW_EATERY_AWNINGS = MAIN.NEIGHBORHOOD_EATERIES.map(rec => xyz(rec.pos));
export const RAW_EATERY_COUNTERS = [
  { x: -1946.3, y: 33.1, street: 'Turk Street' },
  { x: -698.4, y: -258.9, street: 'Jones Street' },
  { x: -1216.9, y: -557.7, street: 'Eddy Street' },
  { x: -275.4, y: 33.2, street: 'Turk Street' },
  { x: -1496.7, y: -356.2, street: 'Leavenworth Street' },
  { x: 32.4, y: 151.7, street: 'Taylor Street' },
];
const EATERY_IDS = MAIN.NEIGHBORHOOD_EATERIES.map(rec => rec.id);
export const EATERY_AWNINGS = RAW_EATERY_AWNINGS.map((p, i) => onSidewalk(`awning:${EATERY_IDS[i]}`, p));
export const EATERY_COUNTERS = RAW_EATERY_COUNTERS.map((p, i) => onSidewalk(`counter:${EATERY_IDS[i]}`, p));

// --- Landmarks ---
export const RAW_MUSEUM = xyz(MAIN.MUSEUM_HUB_POS);                                 // ≈ (-1397.7, -551.3)
const DOCENT = metresToMap(-1.4 * 1.75, 1.15 * 1.75);                               // main.gd:8738, from the hub
export const RAW_MUSEUM_DOCENT = add(RAW_MUSEUM, DOCENT);
export const MUSEUM = onSidewalk('museum', RAW_MUSEUM);                             // ≈ (-1397.7, -572.6)
export const MUSEUM_DOCENT = add(MUSEUM, DOCENT);
export const PARK_ENTRANCE = xz(MAIN.BOEDDEKER_PARK_ENTRANCE);                     // ≈ (-544.5, -582.3)
export const PARK_VIEW = xyz(MAIN.BOEDDEKER_VIEW_TARGET);                          // camera only
export const PARK_RING = MAIN.BOEDDEKER_PARK_RING.map(xz);                         // drawing only
export const PARK_PATH = MAIN.BOEDDEKER_PATH_POINTS.map(xz);
export const SO_WHAT_AWNING = xz(MAIN.SO_WHAT_AWNING_XZ);                          // 361 Turk ≈ (-1780, 47.1)
export const SO_WHAT_LEAVENWORTH_XZ = [-290.8, 99.4];                              // main.gd:14501 tap point
export const SO_WHAT_LEAVENWORTH = xz(SO_WHAT_LEAVENWORTH_XZ);                     // ≈ (-1514.5, 259.9)
export const SO_WHAT_VIEW = xyz(MAIN.SO_WHAT_VIEW_TARGET);                         // camera only

// --- Power Story ---
// Godot street lamps 0-2 (main.gd:3994-4026) and their goals 1.4 m streetward, in Godot metres;
// the "%.0f m from Larkin/Eddy" sentence uses these, not 2D pixels.
export const RELAY_GODOT_GOALS = [[36, 5.6], [62, 5.6], [96, 5.6]];
// Fork rule: nearest Turk point + 31 px south for the lamp, goal 7 px further south; then the lamp on the 2D sidewalk.
export const RAW_RELAY_LAMPS = [{ x: 173.3, y: 31 }, { x: 301.6, y: 31 }, { x: 469.5, y: 31 }];
export const RAW_RELAY_GOALS = RAW_RELAY_LAMPS.map(p => ({ x: p.x, y: p.y + 7 }));
export const RELAY_LAMPS = RAW_RELAY_LAMPS.map((p, i) => onSidewalk(`lamp:${i}`, p));
export const RELAY_GOALS = RELAY_LAMPS.map(p => ({ x: p.x, y: p.y + 7 }));

// --- Two Dogs Home (dog_story.gd:94-115): history stop + the first offset (0,4) m; goal +1.8 m z. ---
export const DOG_OFFSETS = [[0, 4], [-3, 1], [3, -3], [-4, 0]];
export const dogSearch = (anchor, [ox, oz] = DOG_OFFSETS[0]) => add(anchor, metresToMap(ox, oz));
export const DOG_SEARCH = [dogSearch(HISTORY_STOP), dogSearch(BLACK_HAWK_STOP)];
export const DOG_GOALS = [...DOG_SEARCH.map(p => add(p, metresToMap(0, 1.8))), { x: 604, y: 0 }]; // [Pippin, Junebug, Gathering home]
export const DOG_OWNERS = [{ x: 150, y: -8 }, { x: 606, y: -8 }];                                    // when won; dogs beside them

// --- Lantern Procession: Godot's x-extent and direction on the clear south sidewalk (36 m = 180 px). ---
export const LANTERN_ROUTE = [{ x: 432.5, y: 41 }, { x: 252.6, y: 41 }];
export const AUTHORED_TREES = [{ x: 402, y: 62 }, { x: 185, y: 62 }];
export const GATHERING_BAND = { left: 166, right: 590, top: -32, bottom: 22 };

// --- Election Walk (godot/data/voting_places.json observation and address points, copied). ---
export const ELECTION_OBSERVATION_XZ = [[-273.9922586582015, -68.30831842384337], [-103.50264362194144, -97.76495644832877]];
export const ELECTION_PIN_XZ = [[-277.9305866376197, -92.79504510882532], [-104.7178395943787, -105.31239896928355]];
export const ELECTION_GOALS = ELECTION_OBSERVATION_XZ.map(xz);   // ≈ Cadillac (-1298.4,-554.7), Boeddeker (-433.4,-564.8)
export const ELECTION_PINS = ELECTION_PIN_XZ.map(xz);            // art only, never goals
export const ELECTION_HOME = { x: BEA.x + 4 * PIXELS_PER_METRE, y: BEA.y }; // Bea + Turk tangent x 4 m

// Every point a walk, guide marker or tap can target, for the walkability and routing tests.
export function walkTargets() {
  return {
    ...Object.fromEntries(Object.entries(SURPRISE_SITES).map(([id, p]) => [`surprise:${id}`, p])),
    ...Object.fromEntries(EATERY_COUNTERS.map((p, i) => [`counter:${MAIN.NEIGHBORHOOD_EATERIES[i].id}`, p])),
    museum: MUSEUM, park: PARK_ENTRANCE, soWhat: SO_WHAT_AWNING, soWhatLeavenworth: SO_WHAT_LEAVENWORTH,
    larkin: LARKIN_JUNCTION, relay0: RELAY_GOALS[0], relay1: RELAY_GOALS[1], relay2: RELAY_GOALS[2],
    pippin: DOG_GOALS[0], junebug: DOG_GOALS[1], dogHome: DOG_GOALS[2], pippinSearch: DOG_SEARCH[0], junebugSearch: DOG_SEARCH[1],
    lanternStart: LANTERN_ROUTE[0], lanternEnd: LANTERN_ROUTE[1],
    cadillac: ELECTION_GOALS[0], boeddeker: ELECTION_GOALS[1], electionHome: ELECTION_HOME,
  };
}
