// Election Walk (godot/voting_story.gd), pure. Visit-only; no real ballot or assigned site.
// Shared episode context `ctx` (see picker.js): { opened, busy, walking, player, activeId,
// musicPlaying, voting (parsed voting_places.json or null), powerPlace, sites: { election } }.
// Every word a player reads goes through the active catalog (L, gdfText, compose); English is unchanged. The source's names,
// addresses and EAS ids are not translated (D8); its room and listed description are looked up by their English.
import { GODOT_TEXT } from './text.js';
import { gdf, gdfText, f32 } from './format.js';
import { L, compose, COMPOSE_TEXT } from './compose.js';
import { ELECTION_HOME, PIXELS_PER_METRE as M, godotToMap } from './positions.js';

const T = GODOT_TEXT['voting_story.gd'], C = COMPOSE_TEXT.election, J = COMPOSE_TEXT.joiners;
export const TEXT = T;
export const ID = 'election';

export function initialElection() {
  return { open: false, active: false, won: false, phase: 0, selected: 0, palette: 0, observed: 0, placed: 0, traveling: false, tripGoal: null, message: '' };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const bit = (v, i) => (v & (1 << i)) !== 0;
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isDict = v => !!v && typeof v === 'object' && !Array.isArray(v);
const numberPair = v => Array.isArray(v) && v.length === 2 && v.every(isNum);

// Godot valid_source(), rule for rule: the format, the election and publication dates, and each
// site's id, EAS id, address and room are pinned.
export function validSource(value) {
  const V = T.valid_source;
  if (!isDict(value) || value.format !== 1 || value.election !== V.election || value.published !== V.published) return false;
  if (!Array.isArray(value.sites) || value.sites.length !== 2) return false;
  for (let i = 0; i < 2; i++) {
    const site = value.sites[i];
    if (!isDict(site)) return false;
    if (site.id !== [V.id0, V.id1][i] || site.eas_id !== [V.eas0, V.eas1][i] || site.address !== [V.address0, V.address1][i] || site.room !== [V.room0, V.room1][i]) return false;
    for (const key of ['xz', 'observation', 'lonlat', 'centerline']) if (!numberPair(site[key])) return false;
  }
  if (!Array.isArray(value.streets)) return false;
  for (const street of value.streets) {
    if (!isDict(street) || !Array.isArray(street.points)) return false;
    for (const point of street.points) if (!numberPair(point)) return false;
  }
  return true;
}
// The two observation goals in 2D, from the source (Godot goals[]).
export const sourceGoals = source => (source?.sites ?? []).filter(s => numberPair(s.observation)).map(s => godotToMap(s.observation[0], s.observation[1]));
export const goals = (ctx = {}) => ctx.goals?.election ?? sourceGoals(ctx.voting);
export const sitesValid = (ctx = {}) => !!ctx.voting && goals(ctx).length === 2 && !!ctx.powerPlace && ctx.sites?.election !== false;
export const available = (ctx = {}) => !!ctx.opened && sitesValid(ctx) && !!ctx.powerPlace;
export const goal = (e, ctx = {}) => e.phase >= 3 ? (ctx.home ?? ELECTION_HOME) : (sitesValid(ctx) ? goals(ctx)[e.selected] : null);
export function near(e, ctx = {}) {
  const g = goal(e, ctx);
  return !ctx.walking && !!ctx.player && !!g && dist(ctx.player, g) <= (e.phase >= 3 ? 1.0 : 2.0) * M;
}
const otherActive = ctx => ctx.activeId != null && ctx.activeId !== ID;
const site = (ctx, i) => ctx.voting?.sites?.[i] ?? {};

export function openRefusal(e, ctx = {}) {
  if (e.open) return '';
  return !available(ctx) || otherActive(ctx) || ctx.busy || ctx.walking ? L(T.open_story.refuse) : '';
}
export const cancelIntent = e => ({ ...e, traveling: false });
export const resetSession = e => ({ ...initialElection(), open: e.open });

// The reducer: { state, announce, walk? }.
export function changeElection(e, action, ctx = {}) {
  const none = { state: e, announce: '' };
  const out = s => ({ state: s, announce: announce(s) });
  switch (action?.type) {
    case 'open': {
      const refused = openRefusal(e, ctx);
      if (refused) return { state: e, announce: refused, refused: true };
      return out({ ...e, open: true });
    }
    case 'close':
      if (!e.open) return none;
      return { state: { ...e, open: false }, announce: action.announce === false ? '' : L(T.close_story.announce) };
    case 'begin':
      if (!e.open || e.active || !available(ctx) || ctx.activeId != null) return none;
      return out({ ...e, active: true, won: false, phase: 1, observed: 0, placed: 0, message: L(T.begin.begun) });
    case 'choose': {
      const i = action.index;
      if (!e.open || (i !== 0 && i !== 1)) return none;
      return out({ ...e, selected: i, message: compose(C.selected, { address: String(site(ctx, i).address) }) });
    }
    case 'palette': {
      if (!e.open || (action.value !== 0 && action.value !== 1)) return none;
      return out({ ...e, palette: action.value });
    }
    case 'record': {
      if (!e.open || !e.active || e.phase !== 1 || !near(e, ctx) || bit(e.observed, e.selected)) return none;
      const s = { ...e, observed: e.observed | (1 << e.selected) }, here = site(ctx, e.selected);
      s.message = compose(s.observed === 3 ? C.recordedBoth : C.recorded, { description: L(String(here.listed_description)), address: String(here.address) });
      return out(s);
    }
    case 'make':
      if (!e.open || !e.active || e.observed !== 3 || e.phase !== 1) return none;
      return out({ ...e, phase: 2, message: L(T.make_map.make) });
    case 'place': {
      const i = action.index;
      if (!e.open || !e.active || e.phase !== 2 || (i !== 0 && i !== 1)) return none;
      const s = { ...e }, address = String(site(ctx, i).address);
      if (i !== e.selected) s.message = compose(C.belongs, { address, selected: String(site(ctx, e.selected).address) });
      else {
        s.placed = e.placed | (1 << i);
        if (s.placed === 3) s.phase = 3;
        s.message = compose(s.placed === 3 ? C.placedFit : C.placed, { address });
      }
      return out(s);
    }
    case 'share':
      if (!e.open || !e.active || e.phase !== 3 || e.placed !== 3 || !near(e, ctx) || e.won) return none;
      return out({ ...e, won: true, message: L(T.share_map.won) });
    case 'end':
      if (!e.open) return none;
      return out({ ...resetSession(e), message: L(T.end_session.ended) });
    case 'walk': {
      if (!e.open || !e.active || e.won || e.phase === 2) return none;
      if (near(e, ctx)) return out({ ...e, message: L(T.walk_route.already) });
      const tripGoal = goal(e, ctx);
      return { state: { ...e, open: false, traveling: true, tripGoal }, announce: '', walk: tripGoal };
    }
    case 'blocked': {
      // Godot blocked_route() always reopens through open_from_walking.
      const s = { ...cancelIntent(e), message: L(T.blocked_route.blocked) };
      const opened = s.active ? changeElection(s, { type: 'open' }, { ...ctx, walking: false }).state : s;
      return { state: opened, announce: s.message };
    }
    case 'arrived': {
      if (!e.traveling) return none;
      if (!ctx.player || !e.tripGoal || dist(ctx.player, e.tripGoal) > 2 * M) return changeElection(e, { type: 'blocked' }, ctx);
      const s = { ...e, traveling: false };
      return s.active ? changeElection(s, { type: 'open' }, { ...ctx, walking: false }) : { state: s, announce: '' };
    }
    case 'cancel': return { state: cancelIntent(e), announce: '' };
    case 'unavailable': return { state: { ...resetSession(e), open: false }, announce: '' };
    default: return none;
  }
}

export function sourceText(e, ctx = {}) {
  const S = T.source_text;
  if (!ctx.voting) return L(S.unavailable);
  const s = site(ctx, e.selected);
  return compose(C.source, { name: String(s.name), address: String(s.address), room: L(String(s.room)), eas: String(s.eas_id) });
}
const observedCount = e => (bit(e.observed, 0) ? 1 : 0) + (bit(e.observed, 1) ? 1 : 0);
export function electionView(e, ctx = {}) {
  const R = T.refresh, S = T.setup, nearNow = near(e, ctx);
  const heading = compose(C.heading, { status: e.won ? L(R.shared) : (e.phase === 2 ? L(R.place) : (e.phase >= 3 ? L(R.shareBea) : gdfText(R.observed, [observedCount(e)]))) });
  const text = e.message + '\n' + sourceText(e, ctx);
  const buttons = [
    { id: 'cadillac', label: S.cadillac, disabled: false, pressed: e.selected === 0 },
    { id: 'boeddeker', label: S.boeddeker, disabled: false, pressed: e.selected === 1 },
    { id: 'warm', label: S.warm, disabled: false, pressed: e.palette === 0 },
    { id: 'cool', label: S.cool, disabled: false, pressed: e.palette === 1 },
    { id: 'begin', label: S.begin, disabled: e.active || !available(ctx) },
    { id: 'walk', label: e.phase >= 3 ? R.returnBea : R.walkSite, disabled: !e.active || e.won || e.phase === 2 },
    { id: 'record', label: S.record, disabled: !e.active || e.phase !== 1 || !nearNow || bit(e.observed, e.selected) },
    { id: 'make', label: S.make, disabled: !e.active || e.observed !== 3 || e.phase !== 1 },
    { id: 'share', label: S.share, disabled: !e.active || e.phase !== 3 || !nearNow || e.won },
    { id: 'end', label: S.end, disabled: !e.active },
    { id: 'music', label: ctx.musicPlaying ? R.musicOn : R.musicOff, disabled: false },
    { id: 'back', label: S.back, disabled: false },
  ].map(b => { const label = L(b.label); return { ...b, label, name: label.replace(/\n/g, ' ') }; });
  const pins = [0, 1].map(i => ({ index: i, label: String(i + 1), name: gdfText(R.pin, [i + 1]), visible: e.phase === 2, ...(ctx.voting ? mapPoint(site(ctx, i).xz) : { x: 0, y: 0 }) }));
  const labels = [S.label0, S.label1].map((text, i) => ({ text: L(text), visible: bit(e.placed, i) }));
  const focus = e.won ? 'back' : (!e.active ? 'begin' : (e.phase === 2 ? ['cadillac', 'boeddeker'][e.selected] : (e.phase >= 3 && nearNow ? 'share' : (e.phase === 1 && nearNow && !bit(e.observed, e.selected) ? 'record' : 'walk'))));
  return { heading, credit: L(S.credit), text, buttons, pins, labels, focus };
}
export const announce = e => { const v = electionView(e); return compose(J.sentence, { heading: v.heading, text: e.message }); };

export function objective(e, ctx = {}) {
  const O = T.objective, address = String(site(ctx, e.selected).address);
  const status = e.won ? L(O.won) : (e.phase === 2 ? L(O.place) : (e.phase >= 3 ? L(O.return) : compose(C.observe, { address })));
  return { id: 'election_walk', hasTarget: !e.won && e.phase !== 2, target: goal(e, ctx), targetName: e.phase >= 3 ? L(O.home) : address, text: compose(C.objective, { status }), hint: L(O.hint) };
}
// The paper folio at the player's hand while active (Godot `paper`).
export const electionScene = e => (e.active ? { folio: true, palette: e.palette } : null);

// Godot map_point(xz) for the 360x240 paper map.
export const mapPoint = xz => ({ x: f32(20 + (Number(xz[0]) + 320) * 0.9), y: f32(18 + (Number(xz[1]) + 140) * 0.9) });
// Godot update_art(), verbatim (cache key "palette:observed:placed").
export function paperSVG(e, source) {
  const bg = e.palette === 0 ? '#eee0bf' : '#dce8e3';
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 360 240"><rect x="1" y="1" width="358" height="238" rx="8" fill="' + bg + '" stroke="#476961" stroke-width="2"/>';
  for (const street of source?.streets ?? []) {
    let path = '';
    for (const point of street.points) { const p = mapPoint(point); path += (path === '' ? 'M' : 'L') + gdf('%.2f %.2f ', [p.x, p.y]); }
    svg += '<path d="' + path + '" fill="none" stroke="#8aa9ac" stroke-width="8"/>';
  }
  const sites = source?.sites ?? [];
  for (let i = 0; i < sites.length; i++) {
    const p = mapPoint(sites[i].xz), o = mapPoint(sites[i].observation);
    const ink = bit(e.placed, i) ? '#276a5a' : '#75549b';
    svg += gdf('<path d="M%.2f %.2fL%.2f %.2f" stroke="#9c7644" stroke-dasharray="2 2"/>', [p.x, p.y, o.x, o.y]);
    svg += gdf('<rect x="%.2f" y="%.2f" width="6" height="6" fill="#c47d43"/>', [o.x - 3, o.y - 3]);
    svg += gdf('<circle cx="%.2f" cy="%.2f" r="10" fill="%s" stroke="#fffaf0" stroke-width="2"/>', [p.x, p.y, ink]);
    if (bit(e.observed, i)) svg += gdf('<path d="M%.2f %.2fl4 4 8-10" fill="none" stroke="#fffaf0" stroke-width="2"/>', [p.x - 6, p.y]);
  }
  svg += '<rect x="1" y="1" width="358" height="238" rx="8" fill="none" stroke="#476961" stroke-width="2"/><path d="M330 45V18l-6 10m6-10 6 10M25 215h36m-36-4v8m36-8v8" fill="none" stroke="#294b47" stroke-width="2"/></svg>';
  return svg;
}
export const paperKey = e => `${e.palette}:${e.observed}:${e.placed}`;
