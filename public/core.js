import { restoreProgramme, changeProgramme } from './programme.js';
import { initialHosting, restoreHosting, changeHosting } from './hosting.js';
import { initialCivic, restoreCivic, changeCivic, civicAvailable } from './civic.js';
import { initialFilm, restoreFilm, changeFilm, filmAvailable } from './film.js';

export const SAVE_KEY = 'tenderloin-redux.save.v1';
export const SETTINGS_KEY = 'tenderloin-redux.settings.v1';
export const LITTER = [
  { id: 'cup', label: 'Empty paper cup', x: 185, y: 14, kind: 'cup' },
  { id: 'offcuts', label: 'Craft-paper offcuts', x: 420, y: 21, kind: 'paper' },
  { id: 'wrapper', label: 'Discarded snack wrapper', x: 564, y: -26, kind: 'wrapper' },
];
export const FURNITURE = ['table', 'seats', 'speaker'];
export const MOTIFS = ['sun', 'wave', 'rise'];
export const PALETTES = ['garden', 'sunset', 'ocean'];
export const SIGNS = { sun: '✳', wave: '≈', rise: 'RISE' };
export const PHOTO_GUESTS = ['bea', 'celeste', 'dez', 'thanh'];
export const LOANS = [
  { id: 'table', owner: 'thanh', label: 'Thanh’s folding table' },
  { id: 'paint-case', owner: 'celeste', label: 'Celeste’s paint case' },
  { id: 'speaker', owner: 'rook', label: 'Rook’s speaker' },
];
export function initialEpilogue() {
  return { packing: false, returned: [], photo: { status: 'unasked' } };
}
export function initialState() {
  return { greeted: false, layout: null, furniture: {}, litter: [], mural: {}, palette: 'garden', soundcheck: false, opened: false, history: false, blackhawk: false, player: { x: 95, y: -47 }, epilogue: initialEpilogue(), programme: restoreProgramme(null, false), hosting: initialHosting(), civic: initialCivic(), film: initialFilm(), optional: {} };
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
export const progress = state => ({
  layout: FURNITURE.every(id => state.furniture[id]) && !!state.layout,
  tidy: LITTER.every(item => state.litter.includes(item.id)),
  mural: MOTIFS.every(id => state.mural[id]),
  sound: state.soundcheck,
});
export const ready = state => Object.values(progress(state)).every(Boolean);
export function applyAction(state, action) {
  const next = structuredClone(state);
  switch (action.type) {
    case 'greet': next.greeted = true; break;
    case 'layout':
      if (!next.greeted || !['table', 'floor'].includes(action.value) || next.opened) return state;
      if (next.layout !== action.value) { next.layout = action.value; next.furniture = {}; next.soundcheck = false; }
      break;
    case 'furniture':
      if (next.opened || !canPlaceFurniture(next, action.id, action.col, action.row)) return state;
      next.furniture[action.id] = { col: action.col, row: action.row }; next.soundcheck = false; break;
    case 'tidy':
      if (!LITTER.some(item => item.id === action.id)) return state;
      if (!next.litter.includes(action.id)) next.litter.push(action.id); break;
    case 'mural':
      if (!MOTIFS.includes(action.id) || !Number.isInteger(action.col) || !Number.isInteger(action.row) || action.col < 0 || action.col > 5 || action.row < 0 || action.row > 2) return state;
      if (Object.entries(next.mural).some(([id, p]) => id !== action.id && p.col === action.col && p.row === action.row)) return state;
      next.mural[action.id] = { col: action.col, row: action.row }; break;
    case 'palette': if (!PALETTES.includes(action.value)) return state; next.palette = action.value; break;
    case 'soundcheck': if (!progress(next).layout) return state; next.soundcheck = true; break;
    case 'discover-blackhawk': next.blackhawk = true; break;
    case 'history': next.history = true; break;
    case 'open': if (!ready(next)) return state; next.opened = true; break;
    case 'photo': {
      if (!next.opened || next.epilogue.packing || next.epilogue.photo.status === 'taken') return state;
      if (!Array.isArray(action.participants) || !action.participants.length || action.participants.some(id => !PHOTO_GUESTS.includes(id))) return state;
      next.epilogue.photo = { status: 'taken', participants: PHOTO_GUESTS.filter(id => action.participants.includes(id)), layout: next.layout, palette: next.palette, mural: structuredClone(next.mural) };
      break;
    }
    case 'skip-photo':
      if (!next.opened || next.epilogue.photo.status === 'taken') return state;
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
  return next;
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
function restoreEpilogue(raw, opened) {
  const result = initialEpilogue();
  if (!opened || !raw || typeof raw !== 'object') return result;
  result.packing = raw.packing === true;
  if (result.packing && Array.isArray(raw.returned)) result.returned = LOANS.filter(loan => raw.returned.includes(loan.id)).map(loan => loan.id);
  if (raw.photo?.status === 'skipped') result.photo.status = 'skipped';
  const photo = raw.photo;
  if (photo?.status === 'taken' && Array.isArray(photo.participants) && photo.participants.length && photo.participants.every(id => PHOTO_GUESTS.includes(id)) && ['table', 'floor'].includes(photo.layout) && PALETTES.includes(photo.palette)) {
    const mural = cleanMural(photo.mural);
    if (MOTIFS.every(id => mural[id])) result.photo = { status: 'taken', participants: PHOTO_GUESTS.filter(id => photo.participants.includes(id)), layout: photo.layout, palette: photo.palette, mural };
  }
  if (result.packing && result.photo.status === 'unasked') result.photo.status = 'skipped';
  return result;
}

// Optional JSON is preserved without importing an optional module. It never enables settings.
export function loadSave(raw) {
  const state = initialState();
  if (!raw) return { state, message: '' };
  try {
    if (raw.length > 65536) throw Error('Save too large');
    const envelope = JSON.parse(raw);
    if (envelope.version !== 1 || !envelope.core || typeof envelope.core !== 'object') throw Error('Unsupported save');
    const saved = envelope.core;
    state.greeted = saved.greeted === true;
    if (state.greeted && ['table', 'floor'].includes(saved.layout)) state.layout = saved.layout;
    for (const id of FURNITURE) {
      const p = saved.furniture?.[id];
      if (p && canPlaceFurniture(state, id, p.col, p.row)) state.furniture[id] = { col: p.col, row: p.row };
    }
    state.litter = LITTER.filter(item => Array.isArray(saved.litter) && saved.litter.includes(item.id)).map(item => item.id);
    state.mural = cleanMural(saved.mural);
    if (PALETTES.includes(saved.palette)) state.palette = saved.palette;
    state.soundcheck = saved.soundcheck === true && progress(state).layout;
    state.history = saved.history === true;
    state.blackhawk = saved.blackhawk === true;
    state.opened = saved.opened === true && ready(state);
    state.epilogue = restoreEpilogue(saved.epilogue, state.opened);
    state.programme = restoreProgramme(saved.programme, state.opened);
    state.hosting = restoreHosting(saved.hosting, state.opened);
    state.civic = restoreCivic(saved.civic, civicAvailable(state));
    state.film = restoreFilm(saved.film, filmAvailable(state));
    const p = saved.player;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < 3000 && Math.abs(p.y) < 3000) state.player = { x: p.x, y: p.y };
    if (envelope.optional && typeof envelope.optional === 'object' && !Array.isArray(envelope.optional) && JSON.stringify(envelope.optional).length <= 8192) state.optional = envelope.optional;
    return { state, message: 'Your afternoon is right where you left it.' };
  } catch {
    return { state, message: 'This save could not be read. A fresh afternoon is ready; the unreadable save is kept until you choose to replace it.' , recovery: true };
  }
}
export function serializeSave(state) {
  const { optional, ...core } = state;
  return JSON.stringify({ version: 1, core, optional });
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
