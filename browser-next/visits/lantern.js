// Lantern Procession (godot/lantern_procession.gd), pure. Visit-only. Godot works in metres; the
// route here is 2D pixels (LANTERN_ROUTE, 180 px = 36 m) and every distance is converted.
// Shared episode context `ctx` (see picker.js): { opened, busy, walking, player, activeId,
// musicPlaying, sites: { lantern } }.
// Every word a player reads goes through the active catalog (L, gdfText, compose); English is unchanged.
import { LANTERN, GODOT_TEXT } from './text.js';
import { gdfText } from './format.js';
import { L, compose, COMPOSE_TEXT } from './compose.js';
import { LANTERN_ROUTE, PIXELS_PER_METRE as M } from './positions.js';

export const { LENGTH, GAP, CLEARANCE } = LANTERN;
const T = GODOT_TEXT['lantern_procession.gd'], C = COMPOSE_TEXT.lantern, J = COMPOSE_TEXT.joiners;
export const TEXT = T;
export const ID = 'lantern';

export function initialLantern() {
  return { open: false, active: false, won: false, phase: 0, costume: 0, lantern: 0, progress: 8.0, traveling: false, returning: false, tripGoal: null, lastPlayer: null, message: '' };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const route = ctx => ctx.route ?? LANTERN_ROUTE;
export const sitesValid = (ctx = {}) => ctx.sites?.lantern !== false && route(ctx).length === 2;
export const available = (ctx = {}) => !!ctx.opened && sitesValid(ctx);
// Godot route_point(distance m): a 2D point along the route, clamped to [0, LENGTH].
export function routePoint(distance, ctx = {}) {
  const [a, b] = route(ctx), t = Math.max(0, Math.min(1, distance / LENGTH));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
export const goal = (l, ctx = {}) => routePoint(l.phase === 0 ? 8.0 : LENGTH, ctx);
export const near = (l, ctx = {}) => !ctx.walking && !!ctx.player && dist(ctx.player, goal(l, ctx)) <= 1.0 * M;
const otherActive = ctx => ctx.activeId != null && ctx.activeId !== ID;

export function openRefusal(l, ctx = {}) {
  if (l.open) return '';
  if (!sitesValid(ctx)) return L(T.open_story.noRoute);
  return !available(ctx) || otherActive(ctx) || ctx.busy || ctx.walking ? L(T.open_story.refuse) : '';
}
export const cancelIntent = l => ({ ...l, traveling: false, returning: false });
export const resetSession = l => ({ ...initialLantern(), open: l.open });

// The reducer: { state, announce, walk? }. game.js routes to `walk`, then sends 'tick' every frame
// while traveling (progress), and 'arrived' / 'blocked' when the path ends.
export function changeLantern(l, action, ctx = {}) {
  const none = { state: l, announce: '' };
  const out = s => ({ state: s, announce: announce(s, ctx) });
  switch (action?.type) {
    case 'open': {
      const refused = openRefusal(l, ctx);
      if (refused) return { state: l, announce: refused, refused: true };
      return out({ ...l, open: true });
    }
    case 'close':
      if (!l.open) return none;
      return { state: { ...l, open: false }, announce: action.announce === false ? '' : L(T.close_story.announce) };
    case 'costume': case 'lantern': {
      const v = action.value;
      if (!l.open || (l.active && l.phase > 0) || (v !== 0 && v !== 1)) return none;
      return out({ ...l, [action.type]: v });
    }
    case 'begin':
      if (!l.open || l.active || !available(ctx) || ctx.activeId != null) return none;
      return out({ ...l, active: true, won: false, phase: 0, progress: 8.0, message: L(T.begin.begun) });
    case 'end':
      if (!l.open) return none;
      return out({ ...resetSession(l), message: L(T.end_session.ended) });
    case 'walk': {
      if (!l.open || !l.active || l.won) return none;
      if (near(l, ctx) && (l.phase === 0 || l.progress >= LENGTH - 1)) return out(l);
      const back = routePoint(l.progress, ctx);
      const returnTrip = l.phase === 1 && !!ctx.player && dist(ctx.player, back) > 0.25 * M;
      const tripGoal = returnTrip ? back : goal(l, ctx);
      return { state: { ...l, open: false, traveling: true, returning: returnTrip, tripGoal, lastPlayer: ctx.player ? { ...ctx.player } : null }, announce: '', walk: tripGoal };
    }
    case 'advance': {
      if (!l.open || !l.active || !near(l, ctx) || l.won) return none;
      if (l.phase === 1 && l.progress < LENGTH - 1) return out({ ...l, message: L(T.advance.paused) });
      if (l.phase === 0) return out({ ...l, phase: 1, message: L(T.advance.ready) });
      return out({ ...l, phase: 2, won: true, message: L(T.advance.won) });
    }
    case 'tick': return { state: tick(l, ctx), announce: '' };
    case 'blocked': {
      const s = { ...cancelIntent(l), message: L(T.blocked_route.blocked) };
      return { state: action.reopen ? { ...s, open: true } : s, announce: s.message };
    }
    case 'arrived': {
      if (!l.traveling) return none;
      const s0 = tick(l, ctx);
      if (!ctx.player || !l.tripGoal || dist(ctx.player, l.tripGoal) > 1 * M) return changeLantern(s0, { type: 'blocked' }, ctx);
      const s = { ...s0, traveling: false, returning: false, message: l.returning ? L(T._process.back) : s0.message };
      return s.active ? changeLantern(s, { type: 'open' }, { ...ctx, walking: false }) : { state: s, announce: '' };
    }
    case 'cancel': return { state: cancelIntent(l), announce: '' };
    case 'unavailable': return { state: { ...resetSession(l), open: false }, announce: '' };
    default: return none;
  }
}

// Godot _process progress (lantern_procession.gd:392-399), once per frame while traveling in
// phase 1 and not returning. Progress never decreases and is capped at LENGTH; keyboard
// walking along the route counts as well as click routes.
export function tick(l, ctx = {}) {
  if (!l.traveling || !ctx.player) return l;
  let progress = l.progress;
  if (l.phase === 1 && !l.returning) {
    // Distance along the route in route-length units: the 2D route is Godot's 36 m (to 0.1 px).
    const [a, b] = route(ctx), len = dist(a, b), dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    const distance = ((ctx.player.x - a.x) * dir.x + (ctx.player.y - a.y) * dir.y) / len * LENGTH;
    if (dist(ctx.player, routePoint(distance, ctx)) <= 1.0 * M) {
      const moved = l.lastPlayer ? dist(ctx.player, l.lastPlayer) / len * LENGTH : 0;
      const next = Math.max(progress, Math.min(LENGTH, Math.min(distance, progress + moved)));
      if (next > progress) progress = next;
    }
  }
  return { ...l, progress, lastPlayer: { x: ctx.player.x, y: ctx.player.y } };
}

export function lanternView(l, ctx = {}) {
  const R = T.refresh, S = T.setup;
  const heading = compose(C.heading, { status: L(l.won ? R.welcome : (l.phase === 0 ? R.makers : R.lead)) });
  let text = l.message + compose(C.route, { costume: L(l.costume === 0 ? R.bat : R.star), lantern: L(l.lantern === 0 ? R.moon : R.starLantern) }) + ' ';
  text += L(l.phase === 0 ? R.phase0 : (l.won ? R.won : R.phase1));
  text += L(R.source);
  const nearNow = near(l, ctx);
  const locked = l.active && l.phase > 0;
  const buttons = [
    { id: 'bat', label: S.bat, disabled: locked, pressed: l.costume === 0 },
    { id: 'star', label: S.star, disabled: locked, pressed: l.costume === 1 },
    { id: 'moon', label: S.moon, disabled: locked, pressed: l.lantern === 0 },
    { id: 'starLantern', label: S.starLantern, disabled: locked, pressed: l.lantern === 1 },
    { id: 'begin', label: S.begin, disabled: l.active || !available(ctx) },
    { id: 'walk', label: l.phase === 0 ? R.walkLabel : R.march, disabled: !l.active || l.won },
    { id: 'advance', label: l.phase === 0 ? R.gather : R.welcomeLabel, disabled: !l.active || !nearNow || l.won || (l.phase === 1 && l.progress < LENGTH - 1) },
    { id: 'end', label: S.end, disabled: !l.active },
    { id: 'music', label: ctx.musicPlaying ? R.musicOn : R.musicOff, disabled: false },
    { id: 'back', label: S.back, disabled: false },
  ].map(b => ({ ...b, label: L(b.label), name: L(b.label) }));
  const focus = !l.active ? 'begin' : (l.won ? 'back' : (nearNow && (l.phase === 0 || l.progress >= LENGTH - 1) ? 'advance' : 'walk'));
  return { heading, credit: L(S.credit), text, buttons, focus, art: { costume: l.costume, lantern: l.lantern } };
}
export const announce = (l, ctx) => { const v = lanternView(l, ctx); return compose(J.sentence, { heading: v.heading, text: v.text }); };

export function objective(l, ctx = {}) {
  const O = T.objective;
  const status = l.won ? L(O.won) : (l.phase === 0 ? L(O.meet) : gdfText(O.left, [LENGTH - l.progress]));
  return { id: 'lantern_procession', hasTarget: !l.won, target: goal(l, ctx), targetName: L(l.phase === 0 ? O.assembly : O.finish), text: compose(C.objective, { status }), hint: L(O.hint) };
}
// Map sprites while active (Godot update_world): the player's cape and lantern, and two visitors
// GAP metres apart behind the progress point, the first carrying the paper boat.
export function lanternScene(l, ctx = {}) {
  if (!l.active) return null;
  return {
    cape: l.costume === 0 ? { color: '#563b83', star: null } : { color: '#315b91', star: '#f6db8c' },
    lantern: { paper: '#f4d28c', handle: '#604d61', mark: l.lantern === 0 ? 'moon' : 'star', markColor: '#75549b' },
    visitors: [0, 1].map(i => ({ ...routePoint(l.progress - (i + 1) * GAP, ctx), coat: '#69559a', boat: i === 0 ? '#c96682' : null })),
  };
}

// Godot update_art(), verbatim (4 combinations).
export function artwork(costume, lantern) {
  const cape = costume === 0 ? '#563b83' : '#315b91';
  const mark = lantern === 0 ? '<circle cx="263" cy="155" r="14" fill="#75549b"/>' : '<path d="M263 137l6 12 14 2-10 10 2 14-12-7-13 7 3-14-10-10 14-2z" fill="#75549b"/>';
  const star = costume === 1 ? '<path d="M160 105l9 21 23 2-18 15 5 23-19-12-20 12 5-23-18-15 24-2z" fill="#f6db8c"/>' : '<path d="M118 125l15 8 12-17 15 17 15-17 12 17 15-8-9 28-33-7-33 7z" fill="#b69bc9"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="#eee0bf"/><ellipse cx="179" cy="218" rx="135" ry="9" fill="#bdb59d"/><path d="M120 71h80l37 126-77-20-77 20z" fill="' + cape + '"/>' + star + '<circle cx="160" cy="47" r="27" fill="#b98963"/><path d="M136 43q24-36 49 0" fill="#353143"/><rect x="239" y="128" width="49" height="59" rx="6" fill="#f4d28c" stroke="#604d61" stroke-width="3"/><path d="M247 128v-18q16-17 32 0v18" fill="none" stroke="#604d61" stroke-width="4"/>' + mark + '<path d="M31 182h78l-18 24H48z" fill="#c96682"/><path d="M69 141v40H39z" fill="#f6db8c"/></svg>';
}
