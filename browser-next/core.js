import { restoreProgramme, changeProgramme } from './programme.js';
import { initialHosting, changeHosting } from './hosting.js';
import { initialCivic, changeCivic, civicAvailable } from './civic.js';
import { initialFilm, changeFilm, filmAvailable } from './film.js';
import { GODOT_SAVE_KEY, NEIGHBOR_IDS } from './godot-save.js';
import { editScene } from './ending/mural.js';

// The fork shares the Godot edition's save (godot-save.js); classic's two keys are never touched.
export const SAVE_KEY = GODOT_SAVE_KEY;
export const SETTINGS_KEY = 'tenderloin-redux.browser-next.settings.v1';
export { NEIGHBOR_IDS };
export const LITTER = [
  { id: 'cup', label: 'Empty paper cup', x: 185, y: 14, kind: 'cup' },
  { id: 'offcuts', label: 'Craft-paper offcuts', x: 420, y: 21, kind: 'paper' },
  { id: 'wrapper', label: 'Discarded snack wrapper', x: 564, y: -26, kind: 'wrapper' },
];
export const FURNITURE = ['table', 'seats', 'speaker'];
export const LAYOUTS = ['table', 'floor'];
export const MOTIFS = ['sun', 'wave', 'rise'];
export const PALETTES = ['garden', 'sunset', 'ocean'];
export const SIGNS = { sun: '✳', wave: '≈', rise: 'RISE' };
export const PHOTO_GUESTS = ['bea', 'celeste', 'dez', 'thanh'];
export const LOANS = [
  { id: 'table', owner: 'thanh', label: 'Thanh’s folding table' },
  { id: 'paint-case', owner: 'celeste', label: 'Celeste’s paint case' },
  { id: 'speaker', owner: 'rook', label: 'Rook’s speaker' },
];
// Copied from godot/main.gd get_block_missing_summary and open_block_gathering (tests/next-core.test.mjs checks the copy).
export const BLOCK_TEXT = { neighbors: '%d/5 neighbors', mural: '%d/3 mural motifs', sound: 'Rook soundcheck', ready: 'Ready to open', almost: 'Bea: "Almost ready to open the block party! We just need: %s."', opened: 'Bea: "Everyone\'s here, Celeste\'s 3/3 board is glowing, and Rook\'s speaker is set. Our Turk Street block gathering is open, %s style!"' };
export function initialEpilogue() {
  return { packing: false, returned: [], photo: { status: 'unasked' } };
}
// Player and litter are session-only; visited and celesteTalks are Godot's visited_neighbors and celeste_talk_count.
export function initialState() {
  return { greeted: false, layout: null, furniture: {}, litter: [], mural: {}, palette: 'garden', soundcheck: false, opened: false, history: false, blackhawk: false, player: { x: 95, y: -47 }, epilogue: initialEpilogue(), programme: restoreProgramme(null, false), hosting: initialHosting(), civic: initialCivic(), film: initialFilm(), optional: {}, visited: [], celesteTalks: 0, muralScenes: {} };
}
export function occupiedCells(id, position, layout) {
  const vertical = id === 'table' && layout === 'floor';
  return [position, { col: position.col + (vertical ? 0 : 1), row: position.row + (vertical ? 1 : 0) }];
}
export function canPlaceFurniture(state, id, col, row) {
  if (!state.layout || !FURNITURE.includes(id) || !Number.isInteger(col) || !Number.isInteger(row)) return false;
  const cells = occupiedCells(id, { col, row }, state.layout);
  if (cells.some(c => c.col < 0 || c.col > 7 || c.row < 0 || c.row > 4 || c.row === 2)) return false;
  return !Object.entries(state.furniture).some(([other, p]) => other !== id && occupiedCells(other, p, state.layout).some(a => cells.some(b => a.col === b.col && a.row === b.row)));
}
export const metCount = state => NEIGHBOR_IDS.filter(id => state.visited?.includes(id)).length;
// Godot is_block_ready: five neighbors met, three motifs and Rook's soundcheck. The layout is optional.
export const progress = state => ({ neighbors: metCount(state) >= NEIGHBOR_IDS.length, mural: MOTIFS.every(id => state.mural[id]), sound: state.soundcheck === true });
export const ready = state => Object.values(progress(state)).every(Boolean);
export const arranged = state => !!state.layout && FURNITURE.every(id => state.furniture[id]);
export function blockMissing(state) {
  const met = metCount(state), placed = MOTIFS.filter(id => state.mural[id]).length, missing = [];
  if (met < NEIGHBOR_IDS.length) missing.push(BLOCK_TEXT.neighbors.replace('%d', met));
  if (placed < MOTIFS.length) missing.push(BLOCK_TEXT.mural.replace('%d', placed));
  if (!state.soundcheck) missing.push(BLOCK_TEXT.sound);
  return missing.length ? missing.join(', ') : BLOCK_TEXT.ready;
}
// Godot recompute_music_stems on the sketch's layers: bass always, brushes, chords (piano) and lead (trumpet).
export const musicLayers = state => ({ layout: true, tidy: state.visited.length > 0 || state.celesteTalks > 0 || state.soundcheck, mural: Object.keys(state.mural).length > 0 || state.celesteTalks > 0, opened: progress(state).mural || state.soundcheck });
// Pure: an action that changes nothing returns the same state object.
export function applyAction(state, action) {
  const next = structuredClone(state);
  switch (action.type) {
    // Godot finish_neighbor_arrival; with talk, talk_with_neighbor (talk_with_celeste, check_sound_with_rook).
    case 'meet': case 'greet': case 'soundcheck': {
      const id = action.type === 'greet' ? 'bea' : action.type === 'soundcheck' ? 'rook' : action.id, talk = action.type === 'soundcheck' || action.talk === true;
      if (!NEIGHBOR_IDS.includes(id)) return state;
      if (!next.visited.includes(id)) next.visited = [...next.visited, id].sort();
      next.greeted = next.visited.includes('bea');
      if (id === 'celeste') next.celesteTalks = talk ? next.celesteTalks + 1 : Math.max(1, next.celesteTalks);
      if (id === 'rook' && talk) next.soundcheck = true;
      break;
    }
    // Godot choose_gathering_layout. Supplies are placed per layout; the soundcheck stays.
    case 'layout':
      if (!LAYOUTS.includes(action.value) || next.opened) return state;
      if (next.layout !== action.value) { next.layout = action.value; next.furniture = {}; }
      break;
    case 'furniture':
      if (next.opened || !canPlaceFurniture(next, action.id, action.col, action.row)) return state;
      next.furniture[action.id] = { col: action.col, row: action.row }; break;
    case 'tidy':
      if (!LITTER.some(item => item.id === action.id)) return state;
      if (!next.litter.includes(action.id)) next.litter.push(action.id); break;
    case 'mural':
      if (!MOTIFS.includes(action.id) || !Number.isInteger(action.col) || !Number.isInteger(action.row) || action.col < 0 || action.col > 5 || action.row < 0 || action.row > 2) return state;
      if (Object.entries(next.mural).some(([id, p]) => id !== action.id && p.col === action.col && p.row === action.row)) return state;
      next.mural[action.id] = { col: action.col, row: action.row }; break;
    case 'palette': if (!PALETTES.includes(action.value)) return state; next.palette = action.value; break;
    // Godot edit_mural_scene: '' lifts a slot; a scene moves rather than repeats. Budget admission is the host's. An id that is
    // not a string is no edit at all, never a lift.
    case 'mural-scene': { if (typeof action.id !== 'string') return state; const out = editScene(next.muralScenes, action.id, action.slot); if (!out.changed) return state; next.muralScenes = out.scenes; break; }
    case 'discover-blackhawk': next.blackhawk = true; break;
    case 'history': next.history = true; break;
    // Godot open_block_gathering: the Long Table when no layout was chosen.
    case 'open': if (!ready(next)) return state; next.opened = true; next.layout ||= 'table'; break;
    // Godot take_keepsake_photo freezes its keepsake layout; the caller passes the saved one when it has it.
    case 'photo': {
      if (!next.opened || next.epilogue.packing || next.epilogue.photo.status === 'taken' || !progress(next).mural) return state;
      if (!Array.isArray(action.participants) || !action.participants.length || action.participants.some(id => !PHOTO_GUESTS.includes(id))) return state;
      next.epilogue.photo = { status: 'taken', participants: PHOTO_GUESTS.filter(id => action.participants.includes(id)), layout: LAYOUTS.includes(action.layout) ? action.layout : next.layout, palette: next.palette, mural: structuredClone(next.mural) };
      break;
    }
    case 'skip-photo':
      if (!next.opened || next.epilogue.packing || next.epilogue.photo.status !== 'unasked') return state;
      next.epilogue.photo = { status: 'skipped' }; break;
    case 'pack':
      if (!next.opened) return state;
      next.epilogue.packing = true;
      if (next.epilogue.photo.status === 'unasked') next.epilogue.photo = { status: 'skipped' };
      break;
    case 'return-loan':
      if (!next.opened || !next.epilogue.packing || !LOANS.some(loan => loan.id === action.id)) return state;
      next.epilogue.returned = LOANS.filter(loan => loan.id === action.id || next.epilogue.returned.includes(loan.id)).map(loan => loan.id);
      break;
    case 'programme-add': case 'programme-remove': case 'programme-move': case 'programme-publish': {
      if (!next.opened) return state;
      const programme = changeProgramme(next.programme, action);
      if (!programme) return state;
      next.programme = programme; break;
    }
    case 'move':
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y) || Math.abs(action.x) > 3000 || Math.abs(action.y) > 3000) return state;
      next.player = { x: action.x, y: action.y }; break;
    case 'host-start': case 'host-story': case 'host-beat': case 'host-tile': case 'host-palette': case 'host-quiet': case 'host-complete': {
      if (!next.opened) return state;
      const hosting = changeHosting(next.hosting, action, next.programme.published);
      if (!hosting) return state;
      next.hosting = hosting; break;
    }
    case 'civic-start': case 'civic-choice': case 'civic-open': case 'civic-close': {
      if (!civicAvailable(next)) return state;
      const civic = changeCivic(next.civic, action);
      if (!civic) return state;
      next.civic = civic; break;
    }
    case 'film-start': case 'film-choice': case 'film-move': case 'film-roll': case 'film-clear': case 'film-capture': {
      if (!filmAvailable(next)) return state;
      const film = changeFilm(next.film, action);
      if (!film) return state;
      next.film = film; break;
    }
    default: return state;
  }
  return JSON.stringify(next) === JSON.stringify(state) ? state : next;
}

export function cleanMural(raw) {
  const result = {};
  for (const id of MOTIFS) {
    const p = raw?.[id];
    if (!p || !Number.isInteger(p.col) || !Number.isInteger(p.row) || p.col < 0 || p.col > 5 || p.row < 0 || p.row > 2) continue;
    if (Object.values(result).some(other => p.col === other.col && p.row === other.row)) continue;
    result[id] = { col: p.col, row: p.row };
  }
  return result;
}

export const ORIGIN = { lat: 37.7832203, lon: -122.410784 };
export const PIXELS_PER_METRE = 5;
const angle = Math.atan2(0.0002089 * 111320, 0.0016441 * 111320 * Math.cos(ORIGIN.lat * Math.PI / 180));
// Local equirectangular projection, then rotation to align Turk with the screen.
// Same scale on both axes; no block compression or moved intersections.
export function project({ lat, lon }) {
  const east = (lon - ORIGIN.lon) * 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);
  const north = (lat - ORIGIN.lat) * 111320;
  return { x: (east * Math.cos(angle) + north * Math.sin(angle)) * PIXELS_PER_METRE, y: (east * Math.sin(angle) - north * Math.cos(angle)) * PIXELS_PER_METRE };
}
export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export function streetDistance(point, ways) {
  let best = Infinity;
  for (const way of ways) for (let i = 1; i < way.points.length; i++) best = Math.min(best, distanceToSegment(point, way.points[i - 1], way.points[i]));
  return best;
}
export const OPENING_BOUNDS = { left: -300, right: 850, top: -460, bottom: 220 };
export const BOUNDS = { ...OPENING_BOUNDS, left: -2400 };
export const walkable = (point, ways) => point.x >= BOUNDS.left && point.x <= BOUNDS.right && point.y >= BOUNDS.top && point.y <= BOUNDS.bottom && streetDistance(point, ways) < 60;

// A small grid search routes clicks around blocks rather than through buildings.
export function findPath(start, goal, ways) {
  if (!walkable(goal, ways)) return [];
  const step = 10, key = p => `${p.x},${p.y}`;
  const limit = Math.ceil((BOUNDS.right - BOUNDS.left) / step + 1) * Math.ceil((BOUNDS.bottom - BOUNDS.top) / step + 1);
  const cells = new Map();
  const passable = p => {
    const id = key(p);
    if (!cells.has(id)) cells.set(id, walkable(p, ways));
    return cells.get(id);
  };
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
