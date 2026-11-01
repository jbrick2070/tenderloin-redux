// The shared kit of the visits screens (Phase 3 wiring spec 3.10): pure HTML helpers, the visits STYLE, the declared fork
// text, the visit-only session and createKit(host, session, routes), which the shell (visits-ui.js), the episode screens
// (visits-episodes.js) and the neighborhood visits (visits-world.js) draw through. Nothing here runs at import; createKit
// reaches the page only through host, and the document only through getElementById and addEventListener.
//
// host = the visits host of spec 3.2, which game.js provides:
//   doc, win, modal,                 the document, its window and the <dialog id="modal">
//   show(html), close(target), returnTo(id),   game.js show/close; returnTo sets the dialog's return target (after show)
//   status(text), announce(text), toast(text), settle,   #modal-status, game.js announce/toast, the press-settle handle
//   getState(), act(action), saveReason(),     the fork state, reducer dispatch, '' or why the last write was not saved
//   chime(id, reason), walk(goal, opts), stopWalk(), walking(), player(), lookAt(point), speak(id, text, name),
//   music: { label(), on(), toggle() },        toggle() resolves to Godot's music line
//   reducedMotion(), sparks(), objective(), openNeighborId(), cards(), dialogOpen(), hostingInProgress(),
//   restoreStartupCard(text), load(name)       load resolves the parsed same-origin ./data/<name>
// routes = what only the shell draws, given to createKit or filled in on kit.routes afterwards:
//   openPicker(), openResume(),      the picker and the active episode (open('picker'), open('resume'))
//   renderEpisode(id, { announce })  draw an episode screen and say announce in its status line (createEpisodeScreens(kit).render)
//
// btn() is the one renderer of a view's rapid: true (data-rapid, the press-settle opt-in). Godot marks only Cook & Share's
// Previous/Next cook, the picker's Earlier/Later and Power's connector pads rapid, and the kit itself marks nothing.
import { initialBefore } from './visits/before-streets.js';
import { initialMeal } from './visits/meal.js';
import { EPISODES, initialStories, activeEpisode, changeEpisode, readerEntry as pickerEntry } from './visits/picker.js';
import { initialTour } from './visits/landmarks.js';
import { validSource as validPowerPlace } from './visits/power.js';
import { validSource as validVoting } from './visits/election.js';

// ---------- Pure helpers ----------
// & < > " as &amp; &lt; &gt; &quot; (the ending's esc), keyed by character code so no Godot-looking token is a literal here.
const ENTITY = { 34: 'quot', 38: 'amp', 60: 'lt', 62: 'gt' };
export const esc = text => String(text ?? '').replace(/[&<>\x22]/g, ch => `&${ENTITY[ch.charCodeAt(0)]};`);
// Godot's "\n"-separated reader text, one paragraph per line (an empty line keeps its gap).
export const paragraphs = text => (text == null || text === '' ? '' : String(text).split('\n').map(line => `<p>${esc(line)}</p>`).join(''));
export const dataURI = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svg));
const IMAGE_DATA = /^data:image\/[a-z0-9.+-]+[;,]/i;
// The size of a data: SVG, from its root tag's width and height (else its viewBox), or null: only a plain positive number up to
// four digits (px allowed) is taken. With it the <img> box is reserved before the image decodes, so a redraw never collapses
// the screen for a moment and moves the controls below the picture.
const SIZE = /^(\d{1,4}(?:\.\d{1,3})?)(?:px)?$/, VIEW_BOX = /^\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+(\d{1,4}(?:\.\d{1,3})?)[\s,]+(\d{1,4}(?:\.\d{1,3})?)\s*$/;
function svgSize(src) {
  const at = src.search(/,/), end = src.indexOf('%3E', at);
  if (at < 0 || end < 0) return null;
  let tag;
  try { tag = decodeURIComponent(src.slice(at + 1, end)); } catch { return null; }
  if (!/^\s*<svg\b/.test(tag)) return null;
  const attr = name => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? '';
  let width = SIZE.exec(attr('width'))?.[1], height = SIZE.exec(attr('height'))?.[1];
  if (!width || !height) [, width, height] = VIEW_BOX.exec(attr('viewBox')) ?? [];
  return +width > 0 && +height > 0 ? { width: +width, height: +height } : null;
}
// A click from a pointer (mouse, touch, pen) has a detail of 1 or more; Enter, Space and assistive activation give 0.
export const pointerPress = event => Number(event?.detail) > 0;
// The picture, only ever a data: image (img-src allows no other origin), with its own width and height when the SVG says them.
// overlay is HTML over it: buttons and labels placed in percentages of the picture, which is drawn at full width without
// letterboxing so they stay on their marks.
export function figure({ src, alt = '', overlay = '' } = {}) {
  const data = typeof src === 'string' && IMAGE_DATA.test(src), size = data ? svgSize(src) : null;
  const img = data ? `<img alt="${esc(alt)}" src="${esc(src)}"${size ? ` width="${size.width}" height="${size.height}"` : ''}>` : '';
  return `<figure class="visits-picture${overlay ? ' visits-overlaid' : ''}">${img}${overlay ? `<div class="visits-overlay">${overlay}</div>` : ''}</figure>`;
}
// The Sources reader: reading references are links that open in a new tab with no referrer; nothing is fetched.
const HTTPS = /^https:\/\/[^\s<>\x22\x27\x60]+$/;
export function sourceLinesHTML(lines) {
  return (lines ?? []).map(line => {
    const text = typeof line === 'string' ? line : String(line?.text ?? ''), url = typeof line === 'string' ? line : line?.url;
    return typeof url === 'string' && HTTPS.test(url) ? `<p><a class="source-link" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(text || url)}</a></p>` : `<p>${esc(text)}</p>`;
  }).join('');
}

// The accessible name keeps the visible label first (WCAG 2.5.3, spec 3.11): Godot's name is aria-label when it starts with the
// label (a whole word); otherwise the label is the name and Godot's name is the description, an sr-only span after the button
// (the #reward-sounds-help precedent). description is Godot's tooltip text; tooltip is both that description and the title.
// A label of one or two characters that are no word (the Election Walk's pins "1" and "2") says nothing as a name of its own:
// there Godot's name is the name when it holds the label as a token ("Map pin 1: city address point"), which is what WCAG 2.5.3
// asks (the name contains the visible label), and a screen reader says the pin rather than "1".
const spoken = text => String(text ?? '').replace(/\s+/g, ' ').trim();
const startsWithLabel = (name, label) => name.startsWith(label) && (name.length === label.length || /^[^\p{L}\p{N}]/u.test(name.slice(label.length)));
const SHORT_LABEL = /^[^\p{L}]{1,2}$/u, TOKENS = /[\p{L}\p{N}]+|[^\p{L}\p{N}\s]+/gu;
const holdsLabel = (name, label) => SHORT_LABEL.test(label) && (name.match(TOKENS) ?? []).includes(label);
const UNSAFE_STYLE = /url\s*\(|expression\s*\(|@import|[<>\x22\x27\\]/i;
// b = { id, label, name, description, tooltip, title, pressed, disabled, primary, className, style, rapid, hidden, visible }.
// Godot's "\n" in a label is a line break; pressed renders aria-pressed when it is set; className adds classes (visits-pin);
// style places an overlay control (left/top/width/height); hidden or visible: false draws nothing.
export function btn(b) {
  if (!b || b.hidden || b.visible === false) return '';
  const id = esc(b.id), label = spoken(b.label), name = spoken(b.name), notes = [];
  let aria = '';
  if (name && name !== label) {
    if (!label || startsWithLabel(name, label) || holdsLabel(name, label)) aria = name;
    else { aria = label; notes.push(name); }
  } else if (String(b.label ?? '').includes('\n')) aria = label;
  const description = b.description ?? b.tooltip, title = b.title ?? b.tooltip;
  if (description) notes.push(spoken(description));
  const desc = notes.length ? `visits-desc-${id}` : '', style = typeof b.style === 'string' && b.style && !UNSAFE_STYLE.test(b.style) ? b.style : '';
  const cls = (b.primary ? 'primary-button' : 'secondary-button') + (b.className ? ` ${esc(b.className)}` : '');
  return `<button id="${id}" class="${cls}"${b.pressed == null ? '' : ` aria-pressed="${!!b.pressed}"`}${aria ? ` aria-label="${esc(aria)}"` : ''}${desc ? ` aria-describedby="${desc}"` : ''}`
    + `${b.disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}${style ? ` style="${esc(style)}"` : ''}${b.rapid ? ' data-rapid' : ''}>${esc(b.label).replace(/\n/g, '<br>')}</button>`
    + (desc ? `<span id="${desc}" class="sr-only">${esc(notes.join(' '))}</span>` : '');
}

// One visits screen. The eyebrow comes first so its text keeps clear of × (style.css #modal-body > section > .eyebrow:first-child);
// #visits-reader is how holds() knows the screen is still in the dialog. reader is Godot's text (paragraphs); readerHTML,
// when given, is built HTML for the reader instead (sourceLinesHTML). pager, headingEntry, picture, extra and tray are HTML.
// pager is a row of rapid controls that redraw this same screen (Cook & Share's Previous/Next cook): it sits right under the
// eyebrow, above the heading, picture and text its press changes, so the second press of a fast double press finds it in place.
export function frameHTML({ kind = '', credit = '', title = '', pager = '', headingEntry = '', picture = '', reader = '', readerHTML, tray = '', extra = '' } = {}) {
  return `<section class="visits" data-visits="${esc(kind)}"><p class="eyebrow visits-credit">${esc(credit)}</p>${pager ? `<div class="visits-pager">${pager}</div>` : ''}<h2 id="modal-title" tabindex="-1">${esc(title)}</h2>`
    + `${headingEntry ? `<div class="visits-heading-entry">${headingEntry}</div>` : ''}${picture}`
    + `<div id="visits-reader" class="visits-reader" tabindex="0" role="region" aria-label="Story text">${readerHTML ?? paragraphs(reader)}</div>${extra}<div class="visits-tray">${tray}</div></section>`;
}

// ---------- STYLE ----------
// Small text is at least 11 px in #5a685f or var(--ink) on the paper, or light on its own dark chip (4.5:1, tests/next-visits-kit);
// the pressed look is the hosting choices' selected look; every control is at least 44 px; overlay controls are transparent
// targets over the picture whose focus shows style.css's ring outside and a light edge inside, for dark and light pictures.
export const STYLE = `
.visits{display:grid;gap:10px;min-width:0}
.visits h2{white-space:pre-line;overflow-wrap:anywhere}
.visits p{color:var(--ink)}
.visits .visits-credit,.eyebrow.visits-eyebrow{font-size:11px;line-height:1.5;margin:0;color:#5a685f;white-space:pre-line}
.visits-heading-entry{display:flex;flex-wrap:wrap;gap:6px}
.visits-picture{position:relative;margin:0;min-width:0}
.visits-picture img{display:block;width:100%;height:auto;max-height:52vh;object-fit:contain;border-radius:10px}
.visits-picture.visits-overlaid img{max-height:none}
.visits-reader{max-height:34vh;overflow:auto;overscroll-behavior:contain;padding:6px 8px;border-radius:8px;outline-offset:2px}
.visits-reader:focus-visible{outline:3px solid #a35e27}
.visits-reader p{margin:.35em 0;font-size:13px;line-height:1.6;color:var(--ink);overflow-wrap:anywhere}
.visits-tray{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:6px}
.visits-pager{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.visits button{min-height:44px;min-width:44px;white-space:normal;overflow-wrap:anywhere}
.visits [aria-pressed=true]{background:#d5e5ca;border:2px solid #23675c;color:var(--ink);padding:11px 14px}
.visits a.source-link{display:inline-flex;align-items:center;min-height:44px;overflow-wrap:anywhere}
.visits-overlay{position:absolute;inset:0}
.visits-overlay button{position:absolute;min-width:44px;min-height:44px;margin:0;padding:0;background:transparent;border:2px solid transparent;border-radius:8px;color:transparent}
.visits-overlay button:hover:not(:disabled){border-color:#fff2d7}
.visits-overlay button:focus-visible{outline:3px solid #a35e27;outline-offset:0;border-color:#fff2d7}
.visits-overlay .visits-pin{width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border-color:#fff9e9;background:#23675c;color:#fff9e9;font-size:13px;font-weight:700}
.visits-overlay .visits-label{position:absolute;padding:1px 4px;border-radius:4px;background:#18323b;color:#fff2d7;font-size:12px;line-height:1.3;white-space:pre-line;pointer-events:none}
@media (max-width:360px){.visits-tray{grid-template-columns:1fr 1fr}}
`;
export function injectStyle(doc) {
  const existing = doc.getElementById('visits-style');
  if (existing) return existing;
  const style = doc.createElement('style');
  style.id = 'visits-style'; style.textContent = STYLE;
  doc.head.append(style);
  return style;
}

// ---------- Declared fork text (no Godot source has these; tests/next-visits-kit.test.mjs) ----------
// back: the visit card's Back. The spec proposed "Back to the block", but that is film_screening.gd's own Back label, so it
// would be hand-copied Godot text; "Back to exploring" is the fork's own close wording (the Living district dialog).
export const VISITS_FORK_TEXT = {
  back: 'Back to exploring',
  nextEra: 'Next era',
  order: 'Order at the counter',
  notesEyebrow: 'AROUND THE BLOCK · OPTIONAL',
  notesTitle: 'Neighborhood surprises and stops',
  adopted: "The shared save changed, so this visit's side stories started fresh. Your neighborhood surprises are kept.",
  loading: "Loading the story's local map data…",
  dataError: "The story's local map data could not load. You can keep playing and try again.",
};

// ---------- The visit session (spec 3.4): visit-only, never saved ----------
export function freshSession() {
  return {
    screen: null, from: null, before: initialBefore(), meal: initialMeal(), stories: initialStories(),
    world: { tour: initialTour(), guideIdx: -1, lastHinted: '', card: null }, trip: null,
    data: { power_place: { status: 'idle', value: null }, voting_places: { status: 'idle', value: null } }, version: 0,
  };
}
// The two lazily loaded files and Godot's valid_source for each (power_place.gd, voting_story.gd).
const VALIDATE = { power_place: validPowerPlace, voting_places: validVoting };
const dataKey = name => String(name ?? '').replace(/\.json$/, '');
// The fork's own bounds on a fetched place file, checked before Godot's valid_source, which pins the files rule for rule but checks
// no Election Walk name or listed description and bounds no list. Every string a screen prints from the file must be a string, no
// list may be longer than four times the real file's (browser-next/data: 2 sites, 20 streets with 95 points in all, one exterior
// polygon whose ring has 7 points and 15 triangle indices, 6 Eddy points) and no coordinate may lie over 100 km out (the real
// ones stay within 600 m). A tampered same-origin file is then invalid, final for the visit, never a TypeError in election.js
// sourceText or a picture of millions of points (game.js host.load already refuses a file over 256 kB). A value valid_source
// will refuse anyway (a missing list, a pair that is not two numbers) is left to it.
const BOUNDS = { sites: 8, streets: 80, streetPoints: 380, polygons: 4, ring: 28, triangles: 60, eddy: 24, coordinate: 1e5 };
const SITE_TEXT = ['id', 'name', 'address', 'room', 'eas_id', 'listed_description'], SITE_POINTS = ['xz', 'observation', 'lonlat', 'centerline'];
const within = (list, max) => !Array.isArray(list) || list.length <= max;
const plain = p => !Array.isArray(p) || (p.length <= 2 && p.every(n => typeof n !== 'number' || Math.abs(n) <= BOUNDS.coordinate));
function inBounds(key, v) {
  if (!v || typeof v !== 'object') return true;
  if (key === 'voting_places') {
    const sites = Array.isArray(v.sites) ? v.sites : [], streets = Array.isArray(v.streets) ? v.streets : [];
    if (sites.length > BOUNDS.sites || streets.length > BOUNDS.streets) return false;
    for (const site of sites) if (!site || typeof site !== 'object' || !SITE_TEXT.every(name => typeof site[name] === 'string') || !SITE_POINTS.every(name => plain(site[name]))) return false;
    let points = 0;
    for (const street of streets) {
      const list = street?.points;
      if (!Array.isArray(list)) continue;
      if ((points += list.length) > BOUNDS.streetPoints || !list.every(plain)) return false;
    }
    return true;
  }
  const polygons = v.exterior?.polygons, polygon = Array.isArray(polygons) ? polygons[0] : null, ring = Array.isArray(polygon?.rings) ? polygon.rings[0] : null, eddy = v.eddy?.points;
  if (!within(polygons, BOUNDS.polygons) || !within(ring, BOUNDS.ring) || !within(polygon?.triangles, BOUNDS.triangles) || !within(eddy, BOUNDS.eddy)) return false;
  return ['junction', 'address_point', 'return_junction'].every(name => plain(v[name]?.xz)) && [ring, eddy].every(list => !Array.isArray(list) || list.every(plain));
}
const finite = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
// One level deep: the lantern's per-frame tick returns a new object even when the player stood still.
const sameState = (a, b) => a === b || (!!a && !!b && Object.keys(a).length === Object.keys(b).length
  && Object.keys(b).every(k => a[k] === b[k] || (!!b[k] && typeof b[k] === 'object' && JSON.stringify(a[k]) === JSON.stringify(b[k]))));

// ---------- createKit ----------
export function createKit(host, session = freshSession(), routes = {}) {
  const { doc, modal } = host;
  injectStyle(doc);
  const $ = id => doc.getElementById(id);
  function on(id, type, fn) { const el = $(id); if (!el) return false; el.addEventListener(type, fn); return true; }
  const bind = (id, fn) => on(id, 'click', fn);
  // { scroll: false } moves the focus without scrolling the dialog: after a pointer press on a rapid control, which must stay
  // under the pointer for the gesture's second press (keyboard use keeps the scroll that shows the focused control).
  function focus(id, { scroll = true } = {}) {
    const el = id === 'reader' ? $('visits-reader') : $(id);
    if (!el) return false;
    el.focus?.({ preventScroll: true });
    if (scroll) el.scrollIntoView?.({ block: 'nearest' });
    return true;
  }
  const bump = () => (session.version = (session.version || 0) + 1);
  // A visits screen holds the dialog while it is the session's screen and its reader is in the open dialog: Back, ×, or another
  // screen in the same dialog (the recovery offer, the ending) ends that. With no kind, any visits screen.
  function holds(kind) {
    const screen = session.screen;
    if (!screen || (kind != null && kind !== screen)) return false;
    return !!modal.open && modal.contains($('visits-reader'));
  }
  // A screen drawn again in place keeps the dialog's scroll position (game.js show() puts it back to the top when focus was not
  // in the new content), so a press that redraws its own screen never moves the controls under the pointer.
  function show(kind, html) {
    const again = holds(kind), top = again ? modal.scrollTop : undefined;
    session.screen = kind; bump(); host.show(html);
    if (again && Number.isFinite(top) && modal.scrollTop !== top) modal.scrollTop = top;
  }
  // Close the screen with a toast; the screen is cleared first, so a close listener sees none (Godot's announcement goes last).
  function leave(text, returnTarget) {
    const held = holds();
    session.screen = null; bump();
    if (held) host.close(returnTarget);
    if (text) host.toast(text);
  }
  // A held screen's own status line, else the toast.
  function say(text) { if (!text) return; if (holds()) host.status(text); else host.toast(text); }
  // The shared episode context (spec 3.5), built on every call. Field notes is the 2D Info column, not a focused activity, so
  // an open requested from it is never busy: pass { from: 'notes' }. extra wins over everything.
  function ctx(extra = {}) {
    const state = host.getState() || {}, cards = host.cards() || {}, storyCard = !!cards.story;
    return {
      opened: state.opened === true, busy: extra.from === 'notes' ? false : !!host.dialogOpen() && !holds() && !storyCard,
      startupCard: !!cards.startup, storyCard, walking: !!host.walking(), player: host.player(), musicPlaying: !!host.music.on(),
      powerPlace: data('power_place'), voting: data('voting_places'), sites: {}, storyActive: activeEpisode(session.stories) != null,
      hostingInProgress: !!host.hostingInProgress(), sidePanel: !!host.openNeighborId(), ...extra,
    };
  }

  // Godot's Music: On/Off button in an episode: toggle_music_playback announces, then refresh(false) redraws without
  // announcing, so the music line is the last word, and only on a screen that still holds the dialog after the wait.
  const musicButton = prefix => ({ id: `${prefix}-music`, label: host.music.label() });
  function bindMusic(prefix, rerender) {
    return bind(`${prefix}-music`, async () => {
      const kind = session.screen;
      let said = '';
      try { said = await host.music.toggle(); } catch { /* the host already said why the music did not start */ }
      if (!kind || !holds(kind)) return;
      rerender(); focus(`${prefix}-music`); say(said);
    });
  }
  // A repeated Enter or Space on a chained control (Walk, Match, March, Check, Record...) never presses it again.
  function noRepeat(ids) {
    for (const id of ids) on(id, 'keydown', event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); });
  }

  // The "Other stories" heading entry of an episode (Godot add_reader_entry) and the shell's own screens.
  const readerEntry = prefix => { const entry = pickerEntry(); return btn({ id: `${prefix}-stories`, label: entry.label, name: entry.name }); };
  const openPicker = () => (typeof routes.openPicker === 'function' ? routes.openPicker() : false);
  const openResume = () => (typeof routes.openResume === 'function' ? routes.openResume() : false);
  const bindReaderEntry = prefix => bind(`${prefix}-stories`, () => openPicker());

  // ---------- Lazy data (spec 3.4): idle, loading, ready; invalid is final for the visit; error is retried on the next open ----------
  const loads = new Map();
  function data(name) { const entry = session.data?.[dataKey(name)]; return entry?.status === 'ready' ? entry.value : null; }
  function load(key) {
    const entry = { status: 'loading', value: null };
    session.data[key] = entry; bump();
    let request;
    try { request = Promise.resolve(host.load(`${key}.json`)); } catch (error) { request = Promise.reject(error); }
    const settled = request.then(value => {
      let valid = false;
      try { valid = inBounds(key, value) && !!VALIDATE[key](value); } catch { valid = false; }
      return valid ? { status: 'ready', value } : { status: 'invalid', value: null };
    }, () => ({ status: 'error', value: null })).then(next => {
      if (loads.get(key)?.entry === entry) loads.delete(key);
      if (session.data?.[key] !== entry) return; // the session started over meanwhile
      session.data[key] = next; bump();
    });
    loads.set(key, { entry, settled });
    return settled;
  }
  // Call when a screen that needs the files has been drawn. Returns true when nothing is waiting (every named file ready or
  // invalid); otherwise the screen's status line says the fork's loading line, and once the files settle, onReady() redraws
  // it only if it still holds the dialog, followed by the fork's error line when one could not load.
  // { quiet: true } is a prefetch that no visible control waits on: it loads (or joins a load) and says nothing, neither the
  // loading line nor the error line, and never calls onReady. A file it failed to load is loaded again, out loud, by the next
  // screen that needs it (error is retried, as above).
  function ensureData(names, onReady, { quiet = false } = {}) {
    const kind = session.screen, waits = [];
    for (const name of names ?? []) {
      const key = dataKey(name), entry = session.data?.[key];
      if (!Object.hasOwn(VALIDATE, key) || !entry || entry.status === 'ready' || entry.status === 'invalid') continue;
      const inFlight = loads.get(key);
      waits.push(entry.status === 'loading' && inFlight?.entry === entry ? inFlight.settled : load(key));
    }
    if (!waits.length) return true;
    if (quiet) return false;
    if (kind && holds(kind)) host.status(VISITS_FORK_TEXT.loading);
    Promise.all(waits).then(() => {
      if (!kind || !holds(kind)) return;
      onReady?.();
      if ((names ?? []).some(name => session.data?.[dataKey(name)]?.status === 'error')) say(VISITS_FORK_TEXT.dataError);
    });
    return false;
  }

  // ---------- The walk protocol (spec 3.6) ----------
  // An episode opened again by the protocol draws its screen with Godot's line in its status line, but never over another open
  // dialog (or without the shell's renderer): then it closes again, silently, and the line is a toast.
  function reopen(id, announce) {
    if (!session.stories[id]?.open) { say(announce); return false; }
    if (host.dialogOpen() || typeof routes.renderEpisode !== 'function') {
      session.stories = changeEpisode(session.stories, id, { type: 'close', announce: false }, ctx()).stories; bump();
      say(announce);
      return false;
    }
    routes.renderEpisode(id, { announce });
    return true;
  }
  // 1. The episode's walk action already closed it (open: false, traveling: true): the screen goes, host.walk routes, and the
  // trip is this episode only once it walks. An earlier trip of another episode is cancelled first (Godot stop_walking; host.walk's
  // own stopWalk() then finds none); one of this episode is superseded by the walk its action just set up, so it is not cancelled.
  // 2. 'blocked' (no route, or no finite goal): { type: 'blocked', reopen: true } and the episode's screen or a toast.
  function startWalk(id, goal, { name = '', announce = '', keepCamera = false } = {}) {
    if (!EPISODES.includes(id)) throw TypeError(`startWalk: ${id} is not an episode`);
    const held = holds();
    session.screen = null; bump();
    if (held) host.close();
    if (session.trip && session.trip !== id) walkCancelled();
    session.trip = null;
    let result = 'blocked';
    if (finite(goal)) {
      try { result = host.walk({ x: goal.x, y: goal.y }, { name, announce, keepCamera }) === 'walking' ? 'walking' : 'blocked'; } catch { result = 'blocked'; }
    }
    if (result === 'walking') { session.trip = id; bump(); return result; }
    const out = changeEpisode(session.stories, id, { type: 'blocked', reopen: true }, ctx({ busy: false }));
    session.stories = out.stories; bump();
    reopen(id, out.announce);
    return result;
  }
  // 4. The path ended (game.js renderFrame, owner 'visit'): { type: 'arrived' } with walking false, then the screen or a toast.
  function walkEnded() {
    const id = session.trip;
    if (!id) return false;
    session.trip = null;
    const out = changeEpisode(session.stories, id, { type: 'arrived' }, ctx({ walking: false, busy: false }));
    session.stories = out.stories; bump();
    reopen(id, out.announce);
    return true;
  }
  // 5. Any stop (Stop walking, a movement key, a new route, restart): { type: 'cancel' }, silent (Godot cancel_intent).
  function walkCancelled() {
    const id = session.trip;
    if (!id) return false;
    session.trip = null;
    session.stories = changeEpisode(session.stories, id, { type: 'cancel' }, ctx()).stories; bump();
    return true;
  }
  // 3. Each frame: while the lantern trip travels, { type: 'tick' } with the current player. Returns whether progress moved.
  function tickTrip() {
    if (session.trip !== 'lantern') return false;
    const now = changeEpisode(session.stories, 'lantern', { type: 'tick' }, ctx()).stories;
    if (sameState(session.stories.lantern, now.lantern)) return false;
    session.stories = now; bump();
    return true;
  }
  // Restart or an adopted save: a fresh session in this same object (every part of the UI holds it), its version still rising,
  // and any load from the session before it dropped when it settles. The dialog is not touched.
  function resetSession() { const version = session.version || 0; Object.assign(session, freshSession()); session.version = version + 1; }

  return {
    host, session, routes, $, bind, on, focus, show, holds, leave, say, ctx, musicButton, bindMusic, startWalk, readerEntry, bindReaderEntry,
    openPicker, openResume, data, ensureData, sparks: () => host.sparks(), objective: () => host.objective(), noRepeat, bump,
    walkEnded, walkCancelled, tickTrip, resetSession,
  };
}
