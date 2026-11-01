// The Godot predicates the ending reads, over the fork state (parseGodotSave's shape). Pure.
import { C } from './text.js';
import { programmeIssue } from '../programme.js';

const M = C['main.gd'];
const isDict = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const list = v => Array.isArray(v) ? v : [];
// Godot is_whole_json_number: finite and within a relative 1e-5 of a whole number.
const whole = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v - Math.round(v)) < Math.max(1e-5, 1e-5 * Math.abs(v));
const round = v => Math.sign(v) * Math.round(Math.abs(v));

export const programmeTitle = id => Object.hasOwn(M.PROGRAMME_TITLES, id) ? M.PROGRAMME_TITLES[id] : String(id);
export const filmShotTitle = id => Object.hasOwn(M.FILM_SHOT_LABELS, id) ? M.FILM_SHOT_LABELS[id] : String(id);
// main.gd is_hosting_done, is_civic_available, is_film_available.
export const isHostingDone = s => list(s?.hosting?.order).length === 4 && list(s?.hosting?.results).length === 4;
export const isCivicAvailable = s => s?.opened === true && isHostingDone(s);
export const isFilmAvailable = s => s?.opened === true && s?.civic?.phase === 'done';
// main.gd programme_issue, by its empty-or-not result (the fork's own wording is programme.js's).
export const programmeIssueOf = order => programmeIssue(order);

// main.gd get_hosted_segment_value: the copied result of a hosted segment, or null.
function hostedValue(s, id) {
  for (const entry of list(s?.hosting?.results)) if (isDict(entry) && entry.id === id) return Object.hasOwn(entry, 'value') ? entry.value : null;
  return null;
}
// hosted_afternoon.gd copied(game, id).
export function copied(s, id) {
  const raw = hostedValue(s, id);
  if (id === 'stories' && typeof raw === 'string' && ['memory', 'future'].includes(raw)) return { valid: true, value: raw };
  if (id === 'pause' && typeof raw === 'string' && ['arc', 'pairs'].includes(raw)) return { valid: true, value: raw };
  if (id === 'beats' && whole(raw) && round(raw) >= 0 && round(raw) <= 255) return { valid: true, value: round(raw) };
  if (id === 'art' && isDict(raw) && typeof raw.palette === 'string' && ['warm', 'cool'].includes(raw.palette) && Array.isArray(raw.tiles) && raw.tiles.length === 6) {
    const tiles = [];
    for (const tile of raw.tiles) { if (!whole(tile) || round(tile) < 0 || round(tile) > 2) return { valid: false }; tiles.push(round(tile)); }
    return { valid: true, value: { palette: raw.palette, tiles } };
  }
  return { valid: false };
}
// main.gd is_valid_film_plan and is_valid_civic_plan.
export function validFilmPlan(p) {
  if (!isDict(p) || !Object.hasOwn(M.FILM_FRAMING_LABELS, p.framing) || !Object.hasOwn(M.FILM_PLAN_LABELS, p.plan)) return false;
  const order = p.order;
  return Array.isArray(order) && order.length === 3 && new Set(order).size === 3 && order.every(id => Object.hasOwn(M.FILM_SHOT_LABELS, id));
}
export const validCivicPlan = p => isDict(p) && Object.hasOwn(M.CIVIC_TOPIC_LABELS, p.topic) && Object.hasOwn(M.CIVIC_FORMAT_LABELS, p.format) && Object.hasOwn(M.CIVIC_NOTE_LABELS, p.notes);
// film_screening.gd and helper_bench.gd available().
export const filmDone = s => s?.film?.phase === 'done' && validFilmPlan(s.film.result);
