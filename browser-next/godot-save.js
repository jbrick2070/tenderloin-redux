// The save shared with the Godot edition. parseGodotSave ports godot/main.gd apply_save_envelope
// rule for rule; buildGodotSave rewrites only fork-owned fields and refuses what Godot would reset or lose.
export const GODOT_SAVE_KEY = 'tenderloin-redux.godot.save.v1';
export const GODOT_SAVE_SCHEMA = 'tenderloin-redux.godot.save';
export const GODOT_SAVE_VERSION = 1;
export const SAVE_BUDGET = 4096;
export const OPTIONAL_MAX_CHARS = 8192;
// Deeper saves are held unread. Godot's JSON parser has its own depth limit (an engine constant this
// repo does not pin); 512 is a conservative bound, and real saves nest six levels.
export const MAX_JSON_DEPTH = 512;
export const FORK_OPTIONAL_KEY = 'browser-next';
export const NEIGHBOR_IDS = ['bea', 'celeste', 'rook', 'dez', 'thanh'];
export const FORK_FIELDS = ['greeted', 'visited', 'celesteTalks', 'layout', 'furniture', 'mural', 'palette', 'soundcheck', 'opened', 'history', 'blackhawk', 'epilogue', 'programme', 'hosting', 'civic', 'film', 'muralScenes'];
export const MURAL_COLS = 6, MURAL_ROWS = 3;
export const MOTIFS = ['sun', 'wave', 'rise'];
export const PALETTES = ['garden', 'sunset', 'ocean'];
export const LAYOUTS = ['table', 'floor'];
export const FURNITURE = ['table', 'seats', 'speaker'];
// The classic and Godot furniture grid: 8 columns by 5 rows, and row 2 is the through-route.
export const FURNITURE_GRID = { cols: 8, rows: 5, route: 2 };
export const PHOTO_GUESTS = ['bea', 'celeste', 'dez', 'thanh'];
export const PHOTO_STATUSES = ['unasked', 'taken', 'skipped'];
export const LOAN_IDS = ['table', 'paint-case', 'speaker'];
export const SEGMENTS = ['stories', 'beats', 'art', 'pause'];
export const STORIES = ['memory', 'future'], TILE_PALETTES = ['warm', 'cool'], QUIETS = ['arc', 'pairs'];
export const CIVIC_FIELDS = { topic: ['repairs', 'access'], format: ['circle', 'dropin'], notes: ['themes', 'none'] };
export const CIVIC_PHASES = ['idle', 'planning', 'meeting', 'done'];
export const FILM_SHOTS = ['seat', 'paint', 'welcome'], FILM_FRAMING = ['close', 'wide'], FILM_PLANS = ['quiet', 'later'];
export const FILM_PHASES = ['idle', 'planning', 'hold', 'shooting', 'done'];
export const FLAGS = [['rook_soundcheck_done', false], ['block_opened', false], ['history_read', false], ['blackhawk_discovered', false], ['district_boundary_visible', true]];
// Godot-only: the neighborhood surprises it finds in 3D (NEIGHBORHOOD_SURPRISE_IDS). The fork only carries them.
// Godot mural_stories.gd IDS and SLOTS: the Living Mural scenes, which the fork paints too.
export const MURAL_SCENE_IDS = ['cooking', 'sharing', 'painting', 'music', 'garden'], MURAL_SCENE_SLOTS = ['left', 'right'];
export const SURPRISE_IDS = ['jeffrey_record', 'hidden_mural_145', 'impromptu_drag_show', 'viking_dirt_biker', 'cutesy_dino', 'magic_carpet_chef', 'bite_size_nachos', 'good_donut_and_bagel', 'clown_horn_walker', 'mayor_pomp_event'];
const LOADED = 'Your afternoon is right where you left it.';
const HELD = 'The shared save could not be read. A fresh afternoon is ready; the stored save is kept until you choose to start over.';

const isDict = v => v !== null && typeof v === 'object' && !Array.isArray(v);
// Godot mural_stories.gd clean(raw), as apply_save_envelope applies it: slots in order, a known id at most once,
// anything else dropped. It never resets a save.
export function cleanMuralScenes(raw) {
  const out = {};
  if (!isDict(raw)) return out;
  for (const slot of MURAL_SCENE_SLOTS) {
    const id = Object.hasOwn(raw, slot) ? raw[slot] : '';
    if (typeof id === 'string' && MURAL_SCENE_IDS.includes(id) && !Object.values(out).includes(id)) out[slot] = id;
  }
  return out;
}
const get = (o, key, fallback) => Object.hasOwn(o, key) ? o[key] : fallback;
const isIn = (list, v) => typeof v === 'string' && list.includes(v);
const copy = v => structuredClone(v);
const roundAway = v => Math.sign(v) * Math.round(Math.abs(v));
const toInt = v => roundAway(v) || 0;
const defaultPhoto = () => ({ status: 'unasked', participants: [], mural: {}, palette: 'garden', layout: 'table' });
const defaultDraft = () => ({ story: 'memory', pattern: 85, tiles: [0, 1, 2, 2, 1, 0], palette: 'warm', quiet: 'arc' });
const defaultCivic = () => ({ phase: 'idle', draft: { topic: 'repairs', format: 'circle', notes: 'themes' }, result: null });
const defaultFilm = () => ({ phase: 'idle', draft: { framing: 'close', plan: 'quiet', order: [...FILM_SHOTS] }, result: null, captured: [] });

// Godot is_whole_json_number: finite and is_equal_approx(v, roundf(v)), a relative 1e-5 tolerance.
export function isWholeNumber(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  const r = roundAway(v);
  return v === r || Math.abs(v - r) < Math.max(1e-5, 1e-5 * Math.abs(v));
}
const wholeIn = (v, lo, hi) => isWholeNumber(v) && toInt(v) >= lo && toInt(v) <= hi ? toInt(v) : null;

export function utf8Bytes(text) {
  return new TextEncoder().encode(text).length;
}
const codePoints = text => { let n = 0; for (const _ of text) n++; return n; };
function byCodePoint(a, b) {
  const x = [...a], y = [...b];
  for (let i = 0; i < x.length && i < y.length; i++) if (x[i] !== y[i]) return x[i].codePointAt(0) - y[i].codePointAt(0);
  return x.length - y.length;
}
// Godot JSON.stringify(v, "", sort_keys=true): compact, keys in code-point order, non-ASCII raw.
// Strings match Godot except control characters other than \b \f \n \r \t, which JSON escapes as \u00XX.
export function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(item => item === undefined || typeof item === 'function' ? 'null' : canonicalStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter(key => value[key] !== undefined && typeof value[key] !== 'function').sort(byCodePoint);
    return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'bigint') return String(value);
  return JSON.stringify(value) ?? 'null';
}

// Godot strip_edges: every character up to U+0020 at either end.
function stripEdges(text) {
  let a = 0, b = text.length;
  while (a < b && text.charCodeAt(a) <= 32) a++;
  while (b > a && text.charCodeAt(b - 1) <= 32) b--;
  return text.slice(a, b);
}
// The deepest bracket nesting of JSON text, counted without recursion.
function nestingDepth(text) {
  let depth = 0, most = 0, quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '\\') i++; else if (ch === '"') quoted = false; }
    else if (ch === '"') quoted = true;
    else if (ch === '{' || ch === '[') most = Math.max(most, ++depth);
    else if (ch === '}' || ch === ']') depth--;
  }
  return most;
}
// Godot keeps optional as parsed, every number a float (hence is_whole_json_number), and writes 0 as "0.0"
// and floats without an exponent, so its next write of the same optional can be longer than ours. This
// bounds the extra bytes; it over-counts if a Godot build keeps whole numbers as ints.
function godotFloatGrowth(value) {
  let extra = 0;
  const stack = [value];
  while (stack.length) {
    const v = stack.pop();
    if (v && typeof v === 'object') { for (const item of Object.values(v)) stack.push(item); continue; }
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const text = JSON.stringify(v), power = Math.floor(Math.log10(Math.abs(v)));
    const godot = v === 0 ? 3 : !text.includes('e') ? text.length : (v < 0 ? 1 : 0) + (power >= 0 ? power + 1 : 16 - power);
    extra += Math.max(0, godot - text.length);
  }
  return extra;
}
// Godot's next write of the same state, as save_godot_state builds it: save_seq one higher, the keys build_save_envelope
// always writes (an older-shape save gains them), optional's floats, and the values apply_save_envelope rewrites on load:
// a lenient active_motif or discovered_surprises cleaned to its default, and a non-taken keepsake of an open block rebuilt
// with the mural palette (validate_godot_epilogue's fallback; set_mural_palette never touches the keepsake, so the fork keeps
// the older palette). A write leaves room for it, so Godot can save again after it reloads.
const GODOT_ALWAYS = { active_motif: 'sun', discovered_surprises: [], district_boundary_visible: true };
const longer = (from, to) => Math.max(0, utf8Bytes(canonicalStringify(to)) - utf8Bytes(canonicalStringify(from)));
function godotGrowth(envelope) {
  const seq = envelope.save_seq, missing = Object.entries(GODOT_ALWAYS).filter(([key]) => !Object.hasOwn(envelope, key)), photo = envelope.epilogue?.photo;
  let cleaned = 0;
  if (Object.hasOwn(envelope, 'active_motif') && !isIn(MOTIFS, envelope.active_motif)) cleaned += longer(envelope.active_motif, GODOT_ALWAYS.active_motif);
  if (Object.hasOwn(envelope, 'discovered_surprises') && !Array.isArray(envelope.discovered_surprises)) cleaned += longer(envelope.discovered_surprises, GODOT_ALWAYS.discovered_surprises);
  if (envelope.block_opened === true && isDict(photo) && photo.status !== 'taken') cleaned += longer(photo.palette, envelope.mural_palette);
  return String(seq + 1).length - String(seq).length + missing.reduce((n, [key, v]) => n + utf8Bytes(`,${JSON.stringify(key)}:${canonicalStringify(v)}`), 0) + godotFloatGrowth(envelope.optional) + cleaned;
}

export function freshEnvelope() {
  return {
    schema: GODOT_SAVE_SCHEMA, version: GODOT_SAVE_VERSION, save_seq: 0, celeste_talk_count: 0, mural_palette: 'garden', active_motif: 'sun', mural_placements: {},
    rook_soundcheck_done: false, visited_neighbors: [], discovered_surprises: [], block_opened: false, gathering_layout: '', history_read: false,
    blackhawk_discovered: false, district_boundary_visible: true, epilogue: { photo: defaultPhoto(), packing: false, returned: [] },
    programme: { order: [], published: [] }, hosting: { order: [], results: [], draft: defaultDraft() }, civic: defaultCivic(), film: defaultFilm(), optional: {},
  };
}
// The top-level keys build_save_envelope writes (tests/next-save.test.mjs checks them against main.gd). Godot's own next write
// drops every other key.
const GODOT_KEYS = new Set([...Object.keys(freshEnvelope()), 'mural_scenes']);
export function freshState() {
  return {
    greeted: false, layout: null, furniture: {}, litter: [], mural: {}, palette: 'garden', soundcheck: false, opened: false, history: false, blackhawk: false,
    player: { x: 95, y: -47 }, epilogue: { packing: false, returned: [], photo: { status: 'unasked' } }, programme: { order: [], published: [] },
    hosting: { order: [], results: [], draft: defaultDraft() }, civic: defaultCivic(), film: defaultFilm(), optional: {}, visited: [], celesteTalks: 0, muralScenes: {},
  };
}

function readMural(raw, full) {
  if (!isDict(raw)) return null;
  const cells = {}, used = new Set();
  for (const [id, cell] of Object.entries(raw)) {
    if (!MOTIFS.includes(id) || !isDict(cell)) return null;
    const col = wholeIn(get(cell, 'col', null), 0, MURAL_COLS - 1), row = wholeIn(get(cell, 'row', null), 0, MURAL_ROWS - 1);
    if (col === null || row === null || used.has(`${col},${row}`)) return null;
    used.add(`${col},${row}`); cells[id] = { col, row };
  }
  return full && Object.keys(cells).length !== MOTIFS.length ? null : cells;
}
function uniqueFrom(list, allowed) {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  for (const id of list) { if (!isIn(allowed, id) || seen.has(id)) return null; seen.add(id); }
  return seen;
}
// Godot programme_issue() for a four-item order: the Quiet interval sits between Beats and a later Stories.
function fullOrder(list) {
  if (!Array.isArray(list) || list.length !== SEGMENTS.length || !uniqueFrom(list, SEGMENTS)) return false;
  const beats = list.indexOf('beats'), stories = list.indexOf('stories'), pause = list.indexOf('pause');
  return !(beats < stories && !(beats < pause && pause < stories));
}
function readEpilogue(raw, open, palette) {
  if (!isDict(raw)) return null;
  const packing = get(raw, 'packing', false);
  if (typeof packing !== 'boolean') return null;
  let returned = [];
  if (Object.hasOwn(raw, 'returned')) {
    const seen = uniqueFrom(raw.returned, LOAN_IDS);
    if (!seen || !packing && seen.size) return null;
    returned = LOAN_IDS.filter(id => seen.has(id));
  }
  if (packing && !Object.hasOwn(raw, 'photo')) return null;
  let photo = { ...defaultPhoto(), palette };
  if (Object.hasOwn(raw, 'photo')) {
    const p = raw.photo;
    if (!isDict(p)) return null;
    const status = get(p, 'status', 'unasked'), layout = get(p, 'layout', 'table');
    if (!isIn(PHOTO_STATUSES, status) || packing && status === 'unasked' || !isIn(LAYOUTS, layout)) return null;
    if (status === 'taken') {
      const seen = uniqueFrom(get(p, 'participants', null), PHOTO_GUESTS), shot = get(p, 'palette', ''), mural = readMural(get(p, 'mural', null), true);
      if (!seen || !seen.size || !isIn(PALETTES, shot) || !mural) return null;
      photo = { status, participants: PHOTO_GUESTS.filter(id => seen.has(id)), mural, palette: shot, layout };
    } else {
      if (Object.hasOwn(p, 'participants') && !(Array.isArray(p.participants) && !p.participants.length)) return null;
      photo = { status, participants: [], mural: {}, palette, layout };
    }
  }
  return open ? { photo, packing, returned } : { photo: defaultPhoto(), packing: false, returned: [] };
}
function readProgramme(raw, open) {
  if (!isDict(raw)) return null;
  const order = get(raw, 'order', []), published = get(raw, 'published', []);
  if (!Array.isArray(order) || order.length > SEGMENTS.length || !uniqueFrom(order, SEGMENTS)) return null;
  if (!Array.isArray(published) || published.length && !fullOrder(published)) return null;
  return open ? { order: [...order], published: [...published] } : { order: [], published: [] };
}
function readTiles(list) {
  if (!Array.isArray(list) || list.length !== 6) return null;
  const tiles = list.map(v => wholeIn(v, 0, 2));
  return tiles.includes(null) ? null : tiles;
}
function readHostValue(id, v) {
  if (id === 'stories') return isIn(STORIES, v) ? v : null;
  if (id === 'beats') return wholeIn(v, 0, 255);
  if (id === 'pause') return isIn(QUIETS, v) ? v : null;
  if (!isDict(v)) return null;
  const palette = get(v, 'palette', ''), tiles = isIn(TILE_PALETTES, palette) ? readTiles(get(v, 'tiles', null)) : null;
  return tiles ? { palette, tiles } : null;
}
function readHosting(raw, open) {
  if (!isDict(raw)) return null;
  const order = get(raw, 'order', []), list = get(raw, 'results', []), d = get(raw, 'draft', {});
  if (!Array.isArray(order) || order.length && !fullOrder(order)) return null;
  if (!Array.isArray(list) || list.length > SEGMENTS.length || !order.length && list.length) return null;
  const results = [];
  for (let i = 0; i < list.length; i++) {
    const entry = list[i], id = order[i];
    if (!isDict(entry) || get(entry, 'id', '') !== id) return null;
    const value = readHostValue(id, get(entry, 'value', null));
    if (value === null) return null;
    results.push({ id, value });
  }
  if (!isDict(d)) return null;
  const draft = defaultDraft();
  for (const [key, allowed] of [['story', STORIES], ['palette', TILE_PALETTES], ['quiet', QUIETS]]) {
    if (!Object.hasOwn(d, key)) continue;
    if (!isIn(allowed, d[key])) return null;
    draft[key] = d[key];
  }
  if (Object.hasOwn(d, 'pattern')) { draft.pattern = wholeIn(d.pattern, 0, 255); if (draft.pattern === null) return null; }
  if (Object.hasOwn(d, 'tiles')) { draft.tiles = readTiles(d.tiles); if (!draft.tiles) return null; }
  return open ? { order: [...order], results, draft } : { order: [], results: [], draft: defaultDraft() };
}
const civicPlan = v => isDict(v) && Object.keys(CIVIC_FIELDS).every(key => isIn(CIVIC_FIELDS[key], get(v, key, null)));
const copyCivic = v => ({ topic: v.topic, format: v.format, notes: v.notes });
function readCivic(raw, allowed) {
  if (!isDict(raw)) return null;
  const phase = get(raw, 'phase', 'idle'), d = get(raw, 'draft', {}), r = get(raw, 'result', null);
  if (!isIn(CIVIC_PHASES, phase) || !isDict(d)) return null;
  let draft = defaultCivic().draft;
  for (const key of Object.keys(CIVIC_FIELDS)) {
    if (!Object.hasOwn(d, key)) continue;
    if (!isIn(CIVIC_FIELDS[key], d[key])) return null;
    draft[key] = d[key];
  }
  if (r !== null && !civicPlan(r)) return null;
  const result = r === null ? null : copyCivic(r);
  if (['meeting', 'done'].includes(phase)) { if (!result) return null; draft = copyCivic(result); }
  else if (result) return null;
  if (!allowed) return phase === 'idle' ? defaultCivic() : null;
  return { phase, draft, result };
}
const filmOrder = v => Array.isArray(v) && v.length === FILM_SHOTS.length && uniqueFrom(v, FILM_SHOTS) !== null;
const filmPlan = v => isDict(v) && isIn(FILM_FRAMING, get(v, 'framing', null)) && isIn(FILM_PLANS, get(v, 'plan', null)) && filmOrder(get(v, 'order', null));
const copyFilm = v => ({ framing: v.framing, plan: v.plan, order: [...v.order] });
function readFilm(raw, allowed) {
  if (!isDict(raw)) return null;
  const phase = get(raw, 'phase', 'idle'), d = get(raw, 'draft', {}), r = get(raw, 'result', null), captured = get(raw, 'captured', []);
  if (!isIn(FILM_PHASES, phase) || !isDict(d)) return null;
  let draft = defaultFilm().draft;
  for (const [key, allowed] of [['framing', FILM_FRAMING], ['plan', FILM_PLANS]]) {
    if (!Object.hasOwn(d, key)) continue;
    if (!isIn(allowed, d[key])) return null;
    draft[key] = d[key];
  }
  if (Object.hasOwn(d, 'order')) { if (!filmOrder(d.order)) return null; draft.order = [...d.order]; }
  if (r !== null && !filmPlan(r)) return null;
  const result = r === null ? null : copyFilm(r);
  if (!Array.isArray(captured) || captured.length > FILM_SHOTS.length || !captured.every(id => isIn(FILM_SHOTS, id))) return null;
  if (['idle', 'planning'].includes(phase)) { if (result || captured.length) return null; }
  else {
    const size = { hold: [0, 0], shooting: [0, 2], done: [3, 3] }[phase];
    if (!result || captured.length < size[0] || captured.length > size[1] || captured.some((id, i) => id !== result.order[i])) return null;
    draft = copyFilm(result);
  }
  if (!allowed) return phase === 'idle' ? defaultFilm() : null;
  return { phase, draft, result, captured: [...captured] };
}

// Godot's in-memory state after a successful apply_save_envelope, or the name of the failing field.
function readEnvelope(env) {
  if (get(env, 'schema', '') !== GODOT_SAVE_SCHEMA) return 'schema';
  const version = get(env, 'version', -1);
  if (!isWholeNumber(version) || toInt(version) !== GODOT_SAVE_VERSION) return 'version';
  const palette = get(env, 'mural_palette', '');
  if (!isIn(PALETTES, palette)) return 'mural_palette';
  // Stricter than Godot above 2^53, where the fork cannot hold the count and Godot's int cast overflows.
  const talks = get(env, 'celeste_talk_count', 0);
  if (!isWholeNumber(talks) || toInt(talks) < 0 || toInt(talks) > Number.MAX_SAFE_INTEGER) return 'celeste_talk_count';
  const flag = {};
  for (const [key, fallback] of FLAGS) {
    flag[key] = get(env, key, fallback);
    if (typeof flag[key] !== 'boolean') return key;
  }
  const met = get(env, 'visited_neighbors', []);
  if (!Array.isArray(met) || !met.every(id => isIn(NEIGHBOR_IDS, id))) return 'visited_neighbors';
  const visited = new Set(met);
  const placements = readMural(get(env, 'mural_placements', null), false);
  if (!placements) return 'mural_placements';
  const open = flag.block_opened && visited.size >= NEIGHBOR_IDS.length && Object.keys(placements).length === MOTIFS.length && flag.rook_soundcheck_done;
  const epilogue = Object.hasOwn(env, 'epilogue') ? readEpilogue(env.epilogue, open, palette) : { photo: defaultPhoto(), packing: false, returned: [] };
  if (!epilogue) return 'epilogue';
  const programme = Object.hasOwn(env, 'programme') ? readProgramme(env.programme, open) : { order: [], published: [] };
  if (!programme) return 'programme';
  const hosting = Object.hasOwn(env, 'hosting') ? readHosting(env.hosting, open) : { order: [], results: [], draft: defaultDraft() };
  if (!hosting) return 'hosting';
  const hosted = open && hosting.order.length === SEGMENTS.length && hosting.results.length === SEGMENTS.length;
  const civic = Object.hasOwn(env, 'civic') ? readCivic(env.civic, hosted) : defaultCivic();
  if (!civic) return 'civic';
  const film = Object.hasOwn(env, 'film') ? readFilm(env.film, hosted && civic.phase === 'done') : defaultFilm();
  if (!film) return 'film';
  const rawOptional = get(env, 'optional', {});
  const optional = isDict(rawOptional) && codePoints(canonicalStringify(rawOptional)) <= OPTIONAL_MAX_CHARS ? rawOptional : {};
  let layout = isIn(LAYOUTS, get(env, 'gathering_layout', '')) ? env.gathering_layout : '';
  if (open && !layout) layout = isIn(LAYOUTS, epilogue.photo.layout) ? epilogue.photo.layout : 'table';
  return {
    palette, talks: Math.max(0, toInt(talks)), placements, soundcheck: flag.rook_soundcheck_done, visited: [...visited].sort(byCodePoint), opened: open, layout,
    history: flag.history_read, blackhawk: flag.blackhawk_discovered, epilogue, programme, hosting, civic, film, optional,
  };
}
// The fork-owned envelope fields exactly as Godot's build_save_envelope writes them.
const godotFields = m => ({
  celeste_talk_count: m.talks, mural_palette: m.palette, mural_placements: copy(m.placements), rook_soundcheck_done: m.soundcheck, visited_neighbors: [...m.visited],
  block_opened: m.opened, gathering_layout: m.layout, history_read: m.history, blackhawk_discovered: m.blackhawk,
  epilogue: copy(m.epilogue), programme: copy(m.programme), hosting: copy(m.hosting), civic: copy(m.civic), film: copy(m.film),
});

function furnitureCells(id, col, row, layout) {
  const vertical = id === 'table' && layout === 'floor';
  return [[col, row], [col + (vertical ? 0 : 1), row + (vertical ? 1 : 0)]];
}
// public/core.js canPlaceFurniture and Godot can_place_browser_furniture on FURNITURE_GRID.
function canPlaceFurniture(placed, id, col, row, layout) {
  if (!LAYOUTS.includes(layout) || !FURNITURE.includes(id) || !Number.isInteger(col) || !Number.isInteger(row)) return false;
  const cells = furnitureCells(id, col, row, layout), { cols, rows, route } = FURNITURE_GRID;
  if (cells.some(([c, r]) => c < 0 || c >= cols || r < 0 || r >= rows || r === route)) return false;
  return !Object.entries(placed).some(([other, p]) => other !== id && furnitureCells(other, p.col, p.row, layout).some(([c, r]) => cells.some(([c2, r2]) => c === c2 && r === r2)));
}
function readFurniture(optional, layout) {
  const saved = get(optional, FORK_OPTIONAL_KEY, null), furniture = {};
  if (!layout || !isDict(saved) || get(saved, 'v', 0) !== 1 || get(saved, 'layout', '') !== layout || !isDict(get(saved, 'furniture', null))) return furniture;
  for (const id of FURNITURE) {
    const p = get(saved.furniture, id, null);
    if (isDict(p) && canPlaceFurniture(furniture, id, p.col, p.row, layout)) furniture[id] = { col: p.col, row: p.row };
  }
  return furniture;
}
const classicPhoto = p => p.status === 'taken' ? { status: 'taken', participants: [...p.participants], layout: p.layout, palette: p.palette, mural: copy(p.mural) } : { status: p.status };

// initialState may be classic-shaped (public/core.js); the fork-only fields are defaulted on it.
export function parseGodotSave(raw, { initialState = freshState } = {}) {
  const state = initialState();
  state.visited ??= []; state.celesteTalks ??= 0; state.muralScenes ??= {};
  const fresh = { status: 'fresh', envelope: freshEnvelope(), state, message: '', reason: '' };
  const invalid = reason => ({ status: 'invalid', envelope: null, state, message: HELD, reason });
  if (raw === null || raw === undefined) return fresh;
  if (typeof raw !== 'string') return invalid('not-text');
  const text = stripEdges(raw);
  if (!text) return fresh;
  if (!text.startsWith('{') || !text.endsWith('}') || nestingDepth(text) > MAX_JSON_DEPTH) return invalid('json');
  let env, m, envelope, loaded;
  try { env = JSON.parse(text); } catch { return invalid('json'); }
  if (!isDict(env)) return invalid('json');
  try {
    m = readEnvelope(env);
    if (typeof m === 'string') return invalid(m);
    // Lenient Godot-owned values (active_motif, discovered_surprises, mural_scenes) stay verbatim in the envelope:
    // Godot cleans them on its own load, and a newer Godot's ids survive an older fork's write. The fork's own view of
    // mural_scenes is Godot's cleaned one; a write replaces the stored value only when the fork changed that view.
    envelope = { ...copy(env), schema: GODOT_SAVE_SCHEMA, version: GODOT_SAVE_VERSION, ...godotFields(m), optional: copy(m.optional) };
    loaded = {
      greeted: m.visited.includes('bea'), visited: [...m.visited], celesteTalks: m.talks, layout: m.layout || null, palette: m.palette, mural: copy(m.placements),
      soundcheck: m.soundcheck, opened: m.opened, history: m.history, blackhawk: m.blackhawk, furniture: readFurniture(m.optional, m.layout),
      epilogue: { packing: m.epilogue.packing, returned: [...m.epilogue.returned], photo: classicPhoto(m.epilogue.photo) },
      programme: copy(m.programme), hosting: copy(m.hosting), civic: copy(m.civic), film: copy(m.film), muralScenes: cleanMuralScenes(get(env, 'mural_scenes', {})),
    };
  } catch { return invalid('json'); }
  Object.assign(state, loaded);
  return { status: 'loaded', envelope, state, message: LOADED, reason: '' };
}

const gateHolds = s => Array.isArray(s.visited) && NEIGHBOR_IDS.every(id => s.visited.includes(id)) && isDict(s.mural) && MOTIFS.every(id => s.mural[id]) && s.soundcheck === true;
// A non-taken photo keeps Godot's stored palette and layout; changes follow Godot's own actions
// (choose_gathering_layout moves an unasked photo, skip and pack take the current mural palette).
function godotPhoto(p, base, s, baseLayout) {
  if (p.status === 'taken') return { status: 'taken', participants: copy(p.participants), mural: copy(p.mural), palette: p.palette, layout: p.layout };
  const same = base.status === p.status;
  const layout = p.status === 'unasked' && s.layout && s.layout !== baseLayout ? s.layout : isIn(LAYOUTS, base.layout) ? base.layout : 'table';
  const palette = same && typeof base.palette === 'string' ? base.palette : p.status === 'skipped' ? s.palette : 'garden';
  return { status: p.status, participants: [], mural: {}, palette, layout };
}
function fromState(s, base) {
  const basePhoto = isDict(base.epilogue) && isDict(base.epilogue.photo) ? base.epilogue.photo : defaultPhoto();
  return {
    talks: s.celesteTalks, palette: s.palette, placements: s.mural, soundcheck: s.soundcheck, visited: [...s.visited].sort(byCodePoint),
    opened: s.opened === true && gateHolds(s), layout: s.layout || '', history: s.history, blackhawk: s.blackhawk,
    epilogue: { photo: godotPhoto(s.epilogue.photo, basePhoto, s, get(base, 'gathering_layout', '')), packing: s.epilogue.packing, returned: s.epilogue.returned },
    programme: s.programme, hosting: s.hosting, civic: s.civic, film: s.film,
  };
}
function withFurniture(optional, s) {
  const out = isDict(optional) ? copy(optional) : {};
  delete out[FORK_OPTIONAL_KEY];
  if (s.layout && isDict(s.furniture) && Object.keys(s.furniture).length) out[FORK_OPTIONAL_KEY] = { v: 1, layout: s.layout, furniture: copy(s.furniture) };
  return out;
}
function sameValue(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  if (!isDict(a) || !isDict(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameValue(a[key], b[key]));
}

const PHOTO_RANK = { unasked: 0, skipped: 1, taken: 2 };
// Outside a reset, Godot only moves these forward (main.gd's actions set them; only reset, load and
// an upward-merging import replace them), so a write that moves one back loses Godot's progress.
// reach: only how far each part got counts, not which keepsake was taken or what was hosted (combineSaves).
function regression(was, now, reach = false) {
  if (!was.visited.every(id => now.visited.includes(id))) return 'visited_neighbors';
  if (now.talks < was.talks) return 'celeste_talk_count';
  for (const [key, field] of [['soundcheck', 'rook_soundcheck_done'], ['opened', 'block_opened'], ['history', 'history_read'], ['blackhawk', 'blackhawk_discovered'], ['layout', 'gathering_layout']]) {
    if (was[key] && !now[key]) return field;
  }
  const a = was.epilogue, b = now.epilogue;
  if (a.packing && !b.packing || !a.returned.every(id => b.returned.includes(id)) || PHOTO_RANK[b.photo.status] < PHOTO_RANK[a.photo.status]) return 'epilogue';
  if (!reach && a.photo.status === 'taken' && !sameValue(a.photo, b.photo)) return 'epilogue';
  if (was.programme.published.length && !now.programme.published.length) return 'programme';
  const h = was.hosting, g = now.hosting;
  if (reach ? h.order.length && !g.order.length || g.results.length < h.results.length : h.order.length && !sameValue(h.order, g.order) || !sameValue(h.results, g.results.slice(0, h.results.length))) return 'hosting';
  if (CIVIC_PHASES.indexOf(now.civic.phase) < CIVIC_PHASES.indexOf(was.civic.phase)) return 'civic';
  if (FILM_PHASES.indexOf(now.film.phase) < FILM_PHASES.indexOf(was.film.phase) || now.film.captured.length < was.film.captured.length) return 'film';
  return '';
}

// Refusals: 'self-check' (Godot would reset or demote the write), 'regress' (it would lose progress the
// base holds; Restart passes reset: true) and 'full' (Godot could not write it again within budget).
// mural_scenes as Godot's build_save_envelope writes them (only when non-empty, slots in order), once the fork changed
// its cleaned view of the stored value; otherwise the stored value stays verbatim.
function withScenes(envelope, base, s) {
  const scenes = isDict(s.muralScenes) ? s.muralScenes : {};
  if (sameValue(cleanMuralScenes(get(base, 'mural_scenes', {})), scenes)) return envelope;
  delete envelope.mural_scenes;
  const ordered = {};
  for (const slot of MURAL_SCENE_SLOTS) if (Object.hasOwn(scenes, slot)) ordered[slot] = scenes[slot];
  if (Object.keys(ordered).length) envelope.mural_scenes = ordered;
  return envelope;
}
// The envelope buildGodotSave writes for this state over this base, before any check.
function assemble(base, state) {
  const version = isWholeNumber(base.version) && toInt(base.version) === GODOT_SAVE_VERSION ? base.version : GODOT_SAVE_VERSION;
  const envelope = { ...base, schema: GODOT_SAVE_SCHEMA, version, ...godotFields(fromState(state, base)) };
  envelope.save_seq = (isWholeNumber(base.save_seq) ? Math.max(0, toInt(base.save_seq)) : 0) + 1;
  envelope.optional = withFurniture(base.optional, state);
  return withScenes(envelope, base, state);
}
// Keys no Godot writes are kept as they were loaded (rule 2) unless they alone make a write full: then they are dropped, largest
// first and only as many as it takes, as Godot's own next write would drop them all. A write that cannot fit without them stays
// refused as full.
export function buildGodotSave(baseEnvelope, state, { reset = false } = {}) {
  const first = writeOver(baseEnvelope, state, reset);
  if (first.ok || first.reason !== 'full' || !isDict(baseEnvelope)) return first;
  const extra = Object.keys(baseEnvelope).filter(key => !GODOT_KEYS.has(key))
    .map(key => [key, utf8Bytes(JSON.stringify(key)) + utf8Bytes(canonicalStringify(baseEnvelope[key]))]).sort((a, b) => b[1] - a[1] || byCodePoint(a[0], b[0]));
  const without = n => { const base = { ...baseEnvelope }; for (const [key] of extra.slice(0, n)) delete base[key]; return writeOver(base, state, reset); };
  if (!extra.length || !without(extra.length).ok) return first;
  // Dropping more never makes a write longer, so the fewest that fit are found by halving.
  let fewest = 1, most = extra.length;
  while (fewest < most) { const n = (fewest + most) >> 1; if (without(n).ok) most = n; else fewest = n + 1; }
  return without(fewest);
}
function writeOver(baseEnvelope, state, reset) {
  const refuse = (reason, detail, bytes = 0) => ({ ok: false, raw: null, bytes, envelope: null, reason, detail });
  let was, envelope, raw;
  try {
    const base = isDict(baseEnvelope) ? copy(baseEnvelope) : freshEnvelope();
    was = reset ? '' : readEnvelope(base);
    envelope = assemble(base, state);
    raw = canonicalStringify(envelope);
  } catch { return refuse('self-check', 'state'); }
  const bytes = utf8Bytes(raw);
  const check = parseGodotSave(raw);
  if (check.status !== 'loaded') return refuse('self-check', check.reason, bytes);
  const changed = FORK_FIELDS.find(key => !sameValue(check.state[key], state[key]));
  if (changed) return refuse('self-check', changed, bytes);
  const lost = typeof was === 'object' ? regression(was, readEnvelope(check.envelope)) : '';
  if (lost) return refuse('regress', lost, bytes);
  if (bytes + godotGrowth(envelope) > SAVE_BUDGET) return refuse('full', '', bytes);
  return { ok: true, raw, bytes, envelope, reason: '', detail: '' };
}

// main.gd edit_mural_scene's admission: a scene edit is refused only when the next save would exceed Godot's budget and
// grow past the current one, so a lift is allowed on an oversized save. The fork's stricter budget (buildGodotSave 'full',
// which leaves room for Godot's next write) then decides between saving and visit-only.
export function sceneAdmission(baseEnvelope, state, next) {
  try {
    const base = isDict(baseEnvelope) ? copy(baseEnvelope) : freshEnvelope();
    const current = utf8Bytes(canonicalStringify(assemble(base, state))), candidate = utf8Bytes(canonicalStringify(assemble(base, next)));
    return !(candidate > SAVE_BUDGET && candidate > current);
  } catch { return false; }
}

// The forward-only field a stored save lost against an earlier one, or '': a 3D tab opened earlier saved over newer
// progress, or someone started over there.
export function lostProgress(was, now) {
  try { const a = isDict(was) && readEnvelope(was), b = isDict(now) && readEnvelope(now); return isDict(a) && isDict(b) ? regression(a, b) : ''; }
  catch { return ''; }
}
// The forward-only progress of both: c is this tab's state (changed in place), o the stored save's. It follows Godot's
// upward import (main.gd, from `var imported_mural`), with the stored save as Godot's own state and this tab as the import:
// met neighbors and flags are ORed, returned loans are a union over LOAN_IDS, packing is ORed, a taken keepsake beats a
// skipped one, the hosting with more results, and the further civic and film phases are kept. Where both sides got equally
// far with different records (two keepsakes, two hosted choices), this tab's win, as the recovery dialog promises.
function mergeState(c, o) {
  c.visited = [...new Set([...c.visited, ...o.visited])].sort(byCodePoint); c.greeted = c.visited.includes('bea');
  c.celesteTalks = Math.max(c.celesteTalks, o.celesteTalks);
  for (const key of ['soundcheck', 'history', 'blackhawk']) c[key] = c[key] || o[key];
  if (!c.layout && o.layout) { c.layout = o.layout; c.furniture = {}; }
  // A block opened there opened with its layout; this tab's unopened choice does not move it.
  if (o.opened && !c.opened) { c.opened = true; if (c.layout !== o.layout) { c.layout = o.layout; c.furniture = {}; } if (!MOTIFS.every(id => c.mural[id])) c.mural = copy(o.mural); }
  if (!c.opened) return c;
  const a = c.epilogue, b = o.epilogue, packing = a.packing || b.packing;
  const photo = a.photo.status === 'taken' ? a.photo : b.photo.status === 'taken' ? copy(b.photo) : { status: a.photo.status === 'unasked' && b.photo.status === 'unasked' && !packing ? 'unasked' : 'skipped' };
  c.epilogue = { packing, returned: LOAN_IDS.filter(id => a.returned.includes(id) || b.returned.includes(id)), photo };
  if (!c.programme.published.length && o.programme.published.length) c.programme.published = [...o.programme.published];
  if (o.programme.order.length > c.programme.order.length) c.programme.order = [...o.programme.order];
  const h = c.hosting, g = o.hosting;
  if (g.results.length > h.results.length || !h.order.length && g.order.length) {
    // The same running order: this tab's results stand where both hosted, and the stored save's later ones follow.
    const ours = sameValue(h.order, g.order) ? copy(h.results) : [];
    c.hosting = copy(g); c.hosting.results.splice(0, ours.length, ...ours);
  }
  if (CIVIC_PHASES.indexOf(o.civic.phase) > CIVIC_PHASES.indexOf(c.civic.phase)) c.civic = copy(o.civic);
  const f = c.film, e = o.film;
  if (FILM_PHASES.indexOf(e.phase) > FILM_PHASES.indexOf(f.phase) || e.phase === 'shooting' && f.phase === 'shooting' && e.captured.length > f.captured.length) c.film = copy(e);
  return c;
}
// Godot-only discoveries in this tab's write base: the stored save keeps its own and gains the base's known surprise ids
// (sorted, as build_save_envelope writes them). Godot reads them leniently. Mural scenes are fork-owned too (withScenesFrom).
function withGodotOnly(stored, base) {
  const out = copy(stored);
  if (!isDict(base)) return out;
  const have = Array.isArray(out.discovered_surprises) ? out.discovered_surprises : [];
  const extra = Array.isArray(base.discovered_surprises) ? base.discovered_surprises.filter(id => isIn(SURPRISE_IDS, id) && !have.includes(id)) : [];
  if (extra.length) out.discovered_surprises = [...new Set([...have.filter(id => typeof id === 'string'), ...extra])].sort(byCodePoint);
  return out;
}
// Mural scenes are not forward-only. They are decided slot by slot. A slot this tab painted or lifted wins (mergeState keeps
// it), saved or not: "changed" is against loadedScenes, the scenes this tab last read from the shared save (its own writes do
// not move it), or against the write base when the caller has no such record. A slot it left alone follows the stored save,
// or comes back from the write base when the stored save has no scene that Godot's clean() keeps; then clean() as Godot loads.
// Returns the record for the next combine: the combined scene where this tab's own change did not stand, its old one where it did.
function withScenesFrom(state, base, mine, mineBase, stored, loadedScenes) {
  const origin = cleanMuralScenes(loadedScenes === undefined ? get(isDict(mineBase) ? mineBase : {}, 'mural_scenes', {}) : loadedScenes);
  if (!isDict(mineBase)) return origin;
  const painted = v => Object.keys(cleanMuralScenes(v)).length > 0;
  if (!painted(stored.mural_scenes) && painted(mineBase.mural_scenes)) base.mural_scenes = copy(mineBase.mural_scenes);
  const ours = isDict(mine.muralScenes) ? mine.muralScenes : {}, theirs = cleanMuralScenes(get(base, 'mural_scenes', {})), slots = {}, read = {};
  const own = slot => get(ours, slot, undefined) !== origin[slot];
  for (const slot of MURAL_SCENE_SLOTS) { const id = own(slot) ? get(ours, slot, undefined) : theirs[slot]; if (id !== undefined) slots[slot] = id; }
  state.muralScenes = cleanMuralScenes(slots);
  for (const slot of MURAL_SCENE_SLOTS) {
    const id = own(slot) && state.muralScenes[slot] === get(ours, slot, undefined) ? origin[slot] : state.muralScenes[slot];
    if (id !== undefined) read[slot] = id;
  }
  return read;
}
// This tab's state (mine, written over mineBase) combined with a stored save that lost some of it: mergeState's progress on
// the stored save, plus mineBase's Godot-only discoveries. The result passes buildGodotSave's self-check and budget, and is
// refused unless it keeps how far both the stored save and this tab got, so a mix Godot would reset is never written.
// loadedScenes (optional) is the mural scenes this tab last read from the shared save (withScenesFrom); the result's loadedScenes
// is what this tab reads as that record once the combined save is written.
export function combineSaves(storedEnvelope, mine, mineBase = null, loadedScenes = undefined) {
  const refuse = (reason, detail, bytes = 0) => ({ ok: false, raw: null, bytes, envelope: null, reason, detail, state: null });
  const stored = parseGodotSave(isDict(storedEnvelope) ? canonicalStringify(storedEnvelope) : null);
  if (stored.status === 'invalid') return refuse('self-check', stored.reason);
  let state, base, ours, read;
  try {
    state = mergeState(copy(mine), stored.state); base = withGodotOnly(stored.envelope, mineBase);
    read = withScenesFrom(state, base, mine, mineBase, stored.envelope, loadedScenes);
    ours = fromState(mine, isDict(mineBase) ? mineBase : stored.envelope);
  } catch { return refuse('self-check', 'state'); }
  const out = buildGodotSave(base, state, { reset: true });
  if (!out.ok) return { ...out, state: null };
  const now = readEnvelope(out.envelope), lost = regression(readEnvelope(stored.envelope), now, true) || regression(ours, now, true);
  return lost ? refuse('regress', lost, out.bytes) : { ...out, state, loadedScenes: read };
}
