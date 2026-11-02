// Two Dogs Home (godot/dog_story.gd), pure. Visit-only; no real lost-pet records.
// Shared episode context `ctx` (see picker.js): { opened, busy, walking, player, activeId,
// musicPlaying, sites: { dogs } }. Distances are 2D pixels (5 px = 1 m).
// Every word a player reads goes through the active catalog (L, gdfText, compose; English is unchanged); ids, logic and the
// state's message stay as they were (a message composed before a language switch keeps its language, plan R9).
import { DOGS, GODOT_TEXT } from './text.js';
import { gdfText } from './format.js';
import { L, compose, COMPOSE_TEXT } from './compose.js';
import { DOG_GOALS, DOG_SEARCH, DOG_OWNERS, PIXELS_PER_METRE } from './positions.js';

export const { NAMES, DESCRIPTIONS, LEADS, NOTES } = DOGS;
const T = GODOT_TEXT['dog_story.gd'], C = COMPOSE_TEXT.dogs, J = COMPOSE_TEXT.joiners;
export const TEXT = T;
export const ID = 'dogs';
export const ARRIVAL = 2.0 * PIXELS_PER_METRE; // near(): within 2 m of the lead's goal

export function initialDogs() {
  return { open: false, active: false, won: false, found: 0, profile: 0, lead: -1, traveling: false, infoView: false, message: '' };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const available = (ctx = {}) => !!ctx.opened && ctx.sites?.dogs !== false;
export const goals = (ctx = {}) => ctx.goals?.dogs ?? DOG_GOALS;
export const near = (d, ctx = {}) => d.lead >= 0 && !ctx.walking && !!ctx.player && dist(ctx.player, goals(ctx)[d.lead]) <= ARRIVAL;
const otherActive = ctx => ctx.activeId != null && ctx.activeId !== ID;
const matchedCount = d => ((d.found & 1) !== 0 ? 1 : 0) + ((d.found & 2) !== 0 ? 1 : 0);

// Godot open_story's refusal ('' when it may open).
export function openRefusal(d, ctx = {}) {
  if (d.open) return '';
  return !available(ctx) || otherActive(ctx) || ctx.busy || ctx.walking ? L(T.open_story.refuse) : '';
}
export const cancelIntent = d => ({ ...d, traveling: false });
export const resetSession = d => ({ ...initialDogs(), open: d.open });

// The reducer: { state, announce, walk?, reunited? }. `walk` asks game.js to route to that point;
// it then sends {type:'arrived'} or {type:'blocked'}.
export function changeDogs(d, action, ctx = {}) {
  const none = { state: d, announce: '' };
  const out = s => ({ state: s, announce: announce(s, ctx) });
  switch (action?.type) {
    case 'open': {
      const refused = openRefusal(d, ctx);
      if (refused) return { state: d, announce: refused, refused: true };
      return out({ ...d, open: true });
    }
    case 'close':
      if (!d.open) return none;
      return { state: { ...d, open: false }, announce: action.announce === false ? '' : L(T.close_story.announce) };
    case 'profile': {
      const i = action.index;
      if (!d.open || (i !== 0 && i !== 1)) return none;
      return out({ ...d, profile: i, infoView: false, message: '' });
    }
    case 'info':
      if (!d.open) return none;
      return out({ ...d, infoView: !d.infoView });
    case 'lead': {
      const i = action.index;
      if (!d.open || !d.active || !Number.isInteger(i) || i < 0 || i > 2) return none;
      return out({ ...d, lead: i, infoView: false, message: compose(C.chose, { lead: L(LEADS[i]) }) });
    }
    case 'begin':
      if (!d.open || d.active || otherActive(ctx) || !available(ctx)) return none;
      return out({ ...d, active: true, won: false, found: 0, lead: -1, message: L(T.begin.begun) });
    case 'end':
      if (!d.open) return none;
      return out({ ...resetSession(d), message: L(T.end_session.ended) });
    case 'walk': {
      if (!d.open || !d.active || d.lead < 0) return none;
      if (near(d, ctx)) return out(d);
      return { state: { ...d, open: false, traveling: true }, announce: '', walk: goals(ctx)[d.lead] };
    }
    case 'blocked': {
      // A refused route (walk_to_point false) reopens the screen; a stopped walk does not.
      const s = { ...cancelIntent(d), message: L(T.blocked_route.blocked) };
      return { state: action.reopen ? { ...s, open: true } : s, announce: s.message };
    }
    case 'arrived': {
      // Godot _process: arrival within 2 m of the trip goal reopens the screen (open_from_walking).
      if (!d.traveling) return none;
      const goal = goals(ctx)[d.lead];
      if (!ctx.player || !goal || dist(ctx.player, goal) > ARRIVAL) return changeDogs(d, { type: 'blocked' }, ctx);
      const s = { ...d, traveling: false };
      return s.active ? changeDogs(s, { type: 'open' }, ctx) : { state: s, announce: '' };
    }
    case 'cancel': return { state: cancelIntent(d), announce: '' };
    case 'match': {
      if (!d.open || !d.active || !near(d, ctx) || d.won) return none;
      const s = { ...d }; let reunited = false;
      const M = T.match_dog, name = L(NAMES[d.profile]);
      if (d.lead === 2) {
        if (d.found !== 3) s.message = L(M.noDog);
        else { s.won = true; reunited = true; s.message = L(M.reunion); }
      } else if (d.lead !== d.profile) s.message = compose(C.differs, { observed: L(DESCRIPTIONS[d.lead]), name });
      else if ((d.found & (1 << d.profile)) !== 0) s.message = compose(C.already, { name });
      else {
        s.found = d.found | (1 << d.profile);
        s.message = compose(s.found === 3 ? C.matchedBoth : C.matchedNext, { name });
      }
      return { ...out(s), reunited };
    }
    case 'unavailable': return { state: resetSession(d), announce: '' };
    default: return none;
  }
}

// Godot refresh(): heading, reader and the 11 buttons in Godot's grid order.
export function dogsView(d, ctx = {}) {
  const R = T.refresh, S = T.setup;
  const heading = gdfText(R.heading, [matchedCount(d), d.won ? L(R.headingWon) : '']);
  let text = L(R.intro);
  if (d.active) {
    text = compose(C.profile, { note: L(NOTES[d.profile]), name: L(NAMES[d.profile]), description: L(DESCRIPTIONS[d.profile]) }) + '\n';
    text += compose(C.lead, { lead: d.lead >= 0 ? L(LEADS[d.lead]) : L(R.none) }) + ' ';
    if (near(d, ctx)) text += d.lead === 2 && d.found !== 3 ? L(R.noDog) : (d.lead === 2 ? L(R.ready) : compose(C.observed, { description: L(DESCRIPTIONS[d.lead]) }));
    else text += L(R.walk);
  }
  if (d.infoView) text = L(R.info);
  if (d.message) text = d.message + '\n' + text;
  text += L(R.visitOnly);
  const labels = [NAMES[0], NAMES[1], S.info, LEADS[0], LEADS[1], LEADS[2], S.begin, S.walk, d.found === 3 && d.lead === 2 ? R.reunite : R.match, S.end, ctx.musicPlaying ? R.musicOn : R.musicOff, S.back].map(label => L(label));
  const disabled = [false, false, false, !d.active, !d.active, !d.active, d.active || otherActive(ctx) || ctx.sites?.dogs === false, !d.active || d.lead < 0, !d.active || !near(d, ctx) || d.won, !d.active, false, false];
  const ids = ['pippin', 'junebug', 'info', 'lead0', 'lead1', 'lead2', 'begin', 'walk', 'match', 'end', 'music', 'back'];
  const nameOf = (label, i) => (i < 2 ? compose(J.labelDescription, { label, description: L(DESCRIPTIONS[i]) }) : (i === 10 ? compose(C.music, { label }) : label));
  const buttons = labels.map((label, i) => ({ id: ids[i], label, disabled: disabled[i], name: nameOf(label, i) }));
  return { heading, credit: L(S.credit), text, buttons, focus: !d.active ? 'begin' : (near(d, ctx) && !d.won ? 'match' : (d.lead >= 0 ? 'walk' : 'lead0')), description: L(DESCRIPTIONS[d.profile]) };
}
export const announce = (d, ctx) => { const v = dogsView(d, ctx); return compose(J.sentence, { heading: v.heading, text: v.text }); };

export function objective(d, ctx = {}) {
  const O = T.objective, g = goals(ctx);
  const status = d.won ? L(O.reunited) : gdfText(O.count, [matchedCount(d), d.lead >= 0 ? L(LEADS[d.lead]) : L(O.chooseLower)]);
  return { id: 'dog_story', hasTarget: d.lead >= 0 && !d.won, target: d.lead >= 0 ? g[d.lead] : null, targetName: d.lead >= 0 ? L(LEADS[d.lead]) : L(O.chooseLead), text: compose(C.objective, { status }), hint: L(O.hint) };
}
// Map sprites (Godot update_world): dogs at their search sites while active; with owners at the gathering when won.
export function dogsScene(d, ctx = {}) {
  if (!d.active) return { dogs: [], owners: [] };
  if (!d.won) return { dogs: (ctx.searchSites ?? DOG_SEARCH).map((p, index) => ({ index, x: p.x, y: p.y })), owners: [] };
  // Godot: owners at the closure's local x -/+7.4 m, z -0.3; each dog 1 m south of its owner.
  return { dogs: DOG_OWNERS.map((p, index) => ({ index, x: p.x, y: p.y + PIXELS_PER_METRE })), owners: DOG_OWNERS.map((p, index) => ({ index, x: p.x, y: p.y, coat: index === 0 ? '#587c83' : '#b26b61' })) };
}
export const DOG_LOOKS = [
  { coat: '#bb6d3e', collar: '#467cb5', tag: 'round', ears: 'floppy', height: 0.38 },
  { coat: '#ead9ad', collar: '#467a51', tag: 'triangle', ears: 'upright', height: 0.58 },
];

// Godot illustration(i), verbatim.
export function illustration(index) {
  const coat = index === 0 ? '#bb6d3e' : '#ead9ad';
  const collar = index === 0 ? '#467cb5' : '#467a51';
  const ears = index === 0 ? '<path d="M233 75l-25 50-18-50M267 75l25 50 18-50" fill="#884c34"/>' : '<path d="M222 78l-6-55 29 48M266 78l20-55 10 66" fill="#b9a47d"/>';
  const tag = index === 0 ? '<circle cx="220" cy="151" r="12" fill="#f4c45e"/>' : '<path d="M220 139l15 24h-30z" fill="#f4c45e"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 360 240"><rect x="2" y="2" width="356" height="236" rx="20" fill="#f3e7cb" stroke="#d1a46c" stroke-width="3"/><ellipse cx="170" cy="207" rx="122" ry="11" fill="#d6cfb3"/><path d="M75 148q-48-55-39-72" fill="none" stroke="' + coat + '" stroke-width="14" stroke-linecap="round"/><rect x="78" y="150" width="19" height="53" rx="8" fill="' + coat + '"/><rect x="185" y="150" width="19" height="53" rx="8" fill="' + coat + '"/><ellipse cx="143" cy="142" rx="78" ry="44" fill="' + coat + '"/><circle cx="244" cy="109" r="43" fill="' + coat + '"/>' + ears + '<path d="M208 136l49 17" stroke="' + collar + '" stroke-width="17"/>' + tag + '<ellipse cx="277" cy="124" rx="27" ry="18" fill="' + coat + '"/><circle cx="298" cy="119" r="7" fill="#283839"/><circle cx="254" cy="101" r="5" fill="#283839"/><path d="M275 139q-12 9-20 0" fill="none" stroke="#283839" stroke-width="3"/></svg>';
}
