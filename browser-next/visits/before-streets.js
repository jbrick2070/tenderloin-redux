// Before These Streets (godot/before_streets.gd), pure. Visit-only state; nothing is saved.
// Every word a player reads goes through the active catalog (L, gdfText, compose); English is unchanged. gdf stays for the SVG.
import { BEFORE, GODOT_TEXT } from './text.js';
import { gdf, gdfText } from './format.js';
import { L, compose, COMPOSE_TEXT } from './compose.js';

export const { FRAME, VIEWS, REPLIES, SOURCES } = BEFORE;
const T = GODOT_TEXT['before_streets.gd'], C = COMPOSE_TEXT.before;
export const TEXT = T;

export function initialBefore() {
  return { open: false, view: 0, observation: -1, sources: false, fromStartup: false };
}

// Godot open_opening's gate: no focused activity, no story visit, not walking, and no story
// card other than the startup one. ctx = { busy, storyActive, walking, startupCard, storyCard }.
export function canOpen(ctx = {}) {
  const startup = !!ctx.storyCard && !!ctx.startupCard;
  return !(ctx.busy || ctx.storyActive || ctx.walking || (ctx.storyCard && !startup));
}
// Godot idle_entry_available: the Info-column revisit button.
export const idleEntryAvailable = (ctx = {}) => !ctx.startupCard && !ctx.storyCard && !ctx.busy && !ctx.sidePanel && !ctx.storyActive && !ctx.walking;

// The reducer. Returns { state, announce } (announce is Godot's announce_a11y_status text or '').
export function changeBefore(b, action, ctx = {}) {
  const s = { ...b };
  switch (action?.type) {
    case 'open': {
      if (b.open) return { state: b, announce: '' };
      if (!canOpen(ctx)) return { state: b, announce: L(T.open_opening.refuse), refused: true };
      s.open = true; s.fromStartup = !!ctx.storyCard && !!ctx.startupCard;
      return { state: s, announce: announcement(s) };
    }
    case 'close':
      if (!b.open) return { state: b, announce: '' };
      s.open = false;
      return { state: s, announce: action.announce === false ? '' : compose(C.close, { frame: L(FRAME) }) };
    case 'view': {
      const i = action.index;
      if (!b.open || !Number.isInteger(i) || i < 0 || i >= VIEWS.length) return { state: b, announce: '' };
      s.view = i; s.sources = false;
      return { state: s, announce: announcement(s) };
    }
    case 'observe': {
      const i = action.index;
      if (!b.open || !Number.isInteger(i) || i < 0 || i >= REPLIES.length) return { state: b, announce: '' };
      s.observation = i; s.sources = false;
      return { state: s, announce: announcement(s) };
    }
    case 'sources':
      if (!b.open) return { state: b, announce: '' };
      s.sources = !b.sources;
      return { state: s, announce: announcement(s) };
    case 'reset':
      return { state: initialBefore(), announce: '' };
    default:
      return { state: b, announce: '' };
  }
}

// Godot refresh(): the reader text.
export function readerText(b) {
  if (b.sources) return L(FRAME) + '\n\n' + L(SOURCES);
  let text = '';
  if (b.observation >= 0) text = L(REPLIES[b.observation]) + '\n\n';
  text += L(FRAME) + '\n\n' + L(VIEWS[b.view]) + '\n\n';
  text += L(b.observation >= 0 ? T.refresh.observed : T.refresh.prompt);
  return text;
}
export function artDescription(view, observation) {
  const A = T.art_description;
  return gdfText(A.template, [view + 1, L([A.view0, A.view1, A.view2][view]), L(observation >= 0 ? A.card : A.none)]);
}
export function announcement(b) {
  return compose(C.announce, { text: b.sources ? L(SOURCES) : artDescription(b.view, b.observation) + ' ' + L(b.observation >= 0 ? REPLIES[b.observation] : VIEWS[b.view]) });
}
// Godot refresh(): button labels, disabled and pressed states, the tooltip.
export function beforeView(b) {
  const S = T.setup, R = T.refresh;
  return {
    title: L(S.title), subtitle: L(S.subtitle), text: readerText(b), description: artDescription(b.view, b.observation),
    buttons: [
      { id: 'previous', label: L(S.previous), disabled: b.view === 0 },
      { id: 'gust', label: L(S.gust), disabled: b.view === VIEWS.length - 1 },
      { id: 'shapes', label: L(S.shapes), pressed: b.observation === 0 },
      { id: 'time', label: L(S.time), pressed: b.observation === 1 },
      { id: 'sources', label: L(b.sources ? R.backToScene : R.sources) },
      { id: 'back', label: L(b.fromStartup ? R.backToStart : R.backToBlock), tooltip: L(R.backTip) },
    ],
  };
}
// The SOURCES text split into lines, with the reading-reference URLs marked (links, never fetched).
export const sourceLines = () => L(SOURCES).split('\n').map(line => ({ text: line, url: /^https:\/\//.test(line) ? line : null }));

// Godot artwork(index, choice), verbatim: finite deterministic views as an SVG string.
export function artwork(index, choice) {
  const shift = index * 64;
  let body = '<rect width="720" height="440" rx="24" fill="#b4d4d0"/><circle cx="590" cy="88" r="46" fill="#f3e3b2"/><path d="M0 180Q130 120 260 185T520 165T720 170V440H0Z" fill="#668e8b"/><path d="M0 225Q150 180 320 225T720 220V440H0Z" fill="#426f79"/>';
  body += gdf('<path d="M0 300Q%d 135 %d 240T720 285V440H0Z" fill="#c8a567"/>', [155 + shift, 340 + shift]);
  body += gdf('<path d="M0 355Q%d 215 %d 315T720 300V440H0Z" fill="#e4c993"/>', [220 + shift, 420 + shift]);
  body += gdf('<path d="M0 411Q%d 275 720 375V440H0Z" fill="#f2ddb0"/>', [450 - shift]);
  for (let n = 0; n < 8; n++) {
    body += gdf('<path d="M%d %dQ%d %d %d %d" stroke="#b99a65" stroke-width="2" fill="none"/>', [70 + n * 61, 365 + n % 3 * 12, 95 + n * 61 + Math.trunc(shift / 3), 345 + n % 3 * 12, 125 + n * 61 + Math.trunc(shift / 3), 361 + n % 3 * 12]);
  }
  if (index > 0) {
    for (let n = 0; n < 3; n++) body += gdf('<path d="M%d %dQ%d %d %d %d" stroke="#fff4d8" stroke-width="7" stroke-linecap="round" fill="none"/>', [40 + n * 32, 100 + n * 39, 170 + shift, 75 + n * 39, 290 + shift, 105 + n * 39]);
    for (let n = 0; n < 30; n++) body += gdf('<circle cx="%d" cy="%d" r="3" fill="#f3dcb0"/>', [180 + (n * 47 + shift) % 380, 150 + (n * 31) % 125]);
  }
  if (choice >= 0) {
    body += '<rect x="450" y="247" width="240" height="167" rx="18" fill="#fff4d8" stroke="#294751" stroke-width="5"/><path d="M458 404Q455 330 500 330Q548 330 548 404Z" fill="#778b6a"/><circle cx="500" cy="302" r="25" fill="#cb976c"/><path d="M476 297Q476 264 505 274Q529 278 525 300L513 286 490 287Z" fill="#eeeece"/>';
    if (choice === 0) body += '<path d="M565 294Q610 260 663 294M565 325Q610 291 663 325M565 355Q610 321 663 355" stroke="#c79855" stroke-width="9" fill="none"/>';
    else body += '<circle cx="611" cy="326" r="47" fill="#dfbd78"/><path d="M611 287V326L640 344" stroke="#294751" stroke-width="9" stroke-linecap="round" fill="none"/>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440">' + body + '</svg>';
}
// Cached SVG data URIs, at most one per Godot texture key (3 views x no card / 2 cards).
const artCache = new Map();
export function artworkDataURI(view, choice) {
  const key = `${view}:${choice}`;
  if (!artCache.has(key)) {
    if (artCache.size >= 9) artCache.delete(artCache.keys().next().value);
    artCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artwork(view, choice)));
  }
  return artCache.get(key);
}
