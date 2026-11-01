// Browser check of the Phase 3 side stories on a stand-alone harness page: browser-next/visits-ui.js with its real parts
// (visits-episodes.js, visits-world.js) over a stand-in host for game.js, and sprites.js drawn into a real World (world.js and its
// layers hook) built from data/streets.osm.json the way game.js init builds it. tests/next-browser.mjs drives the same screens
// through the game once game.js wires them.
// Run: PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/next-visits-browser.mjs (BROWSER_CHANNEL as for tests/next-browser.mjs).
// NEXT_VISITS_WIDTHS=320,390,1440 and NEXT_VISITS_FLOWS=screens,gestures,replace,scenes run a subset; NEXT_VISITS_ROOT serves the
// product from another copy of this repository (a scratch mutation); NEXT_VISITS_OUT moves the screenshots and results.json from
// artifacts/next-visits. Files are served through page.route on http://visits.test/ under browser-next/index.html's own
// Content-Security-Policy, so the page makes no other request and needs no server.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { GODOT_TEXT, MAIN, DOGS } from '../browser-next/visits/text.js';
import { FRAME } from '../browser-next/visits/before-streets.js';
import { SOLUTIONS } from '../browser-next/visits/power.js';
import { SURPRISE_IDS, SURPRISES, darken } from '../browser-next/visits/surprises.js';
import { VISITS_FORK_TEXT } from '../browser-next/visits-kit.js';
import * as P from '../browser-next/visits/positions.js';
import { project, streetDistance } from '../browser-next/core.js';
import { openedEnvelope, filmDoneEnvelope } from './next-fixtures.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');

const repo = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(process.env.NEXT_VISITS_ROOT || repo), out = path.resolve(process.env.NEXT_VISITS_OUT || path.join(repo, 'artifacts', 'next-visits'));
await mkdir(out, { recursive: true });
const HOST = 'visits.test', ORIGIN = `http://${HOST}`;
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
const WIDTHS = [
  { name: '320', viewport: { width: 320, height: 640 }, touch: true }, { name: '390', viewport: { width: 390, height: 844 }, touch: true, scenes: true },
  { name: '1440', viewport: { width: 1440, height: 900 }, touch: false, scenes: true },
].filter(w => !process.env.NEXT_VISITS_WIDTHS || process.env.NEXT_VISITS_WIDTHS.split(',').includes(w.name));
const CSP = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(await readFile(path.join(root, 'browser-next', 'index.html'), 'utf8'))?.[1];
if (!CSP) throw Error('browser-next/index.html has no Content-Security-Policy meta tag to serve the harness under');

// Godot's words the checks compare (visits/text.js), and the selected look of a pressed choice (tests/next-browser.mjs SELECTED).
const BEFORE_CLOSED = FRAME + GODOT_TEXT['before_streets.gd'].close_opening.closed;
const DOG_ALREADY = DOGS.NAMES[0] + GODOT_TEXT['dog_story.gd'].match_dog.already;
const SELECTED = { background: 'rgb(213, 229, 202)', border: '2px solid rgb(35, 103, 92)', color: 'rgb(35, 61, 56)' };
// Every aria-pressed pair a visits screen draws; each must be audited once with one of them pressed.
const PRESSED_PAIRS = [['before-shapes', 'before-time'], ['meal-serving-0', 'meal-serving-1'], ['meal-placement-0', 'meal-placement-1'], ['lantern-bat', 'lantern-star'], ['lantern-moon', 'lantern-starLantern'], ['election-cadillac', 'election-boeddeker'], ['election-warm', 'election-cool']];
const VISITS = '#modal[open] #modal-body section.visits';
// The saves the flows start from: an open block with four surprises found, and the tour after all ten (chapter 6, explore).
const SCENE_FOUND = ['bite_size_nachos', 'impromptu_drag_show', 'jeffrey_record', 'mayor_pomp_event'];
const SCENE_SAVE = JSON.stringify(openedEnvelope({ discovered_surprises: SCENE_FOUND }));
const TOUR_SAVE = JSON.stringify(filmDoneEnvelope({ history_read: true, blackhawk_discovered: true, discovered_surprises: [...SURPRISE_IDS].sort() }));

const HARNESS = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
<link rel="stylesheet" href="/browser-next/style.css"><style>
html,body{margin:0;height:100%;overflow:hidden}
#world{position:fixed;left:0;top:0;width:100vw;height:100vh}
#harness-bar{position:fixed;left:0;right:0;top:0;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 8px;background:var(--paper);border-bottom:1px solid #c3c7b5}
#afterglow{display:flex;flex-wrap:wrap;gap:6px}
#harness-toast,#harness-route{flex:1 1 100%;margin:0;font-size:12px;line-height:1.4;color:var(--ink);overflow-wrap:anywhere}
body.scene #harness-bar{display:none}
</style></head><body>
<canvas id="world" tabindex="0" aria-label="Neighborhood map"></canvas>
<div id="harness-bar"><button id="journal-button" class="secondary-button">Field notes</button><section id="afterglow" aria-label="Story entries"></section><p id="harness-toast" role="status"></p><p id="harness-route" role="status"></p></div>
<dialog id="modal" aria-labelledby="modal-title"><div id="modal-body"></div><div id="modal-status" class="sr-only" role="status" aria-live="polite"></div><button class="modal-close" id="close-modal" aria-label="Close dialog">×</button></dialog>
<script src="/__visits/harness.js"></script>
</body></html>`;

// ---------- The page: game.js's side of createVisits (spec 3.2), its dialog rules, and the World with the sprites layers ----------
// Serialized into /__visits/harness.js (a same-origin script, as the page's CSP requires); never run in Node.
async function pageMain() {
  const urls = ['/browser-next/godot-save.js', '/browser-next/core.js', '/browser-next/story.js', '/browser-next/press-settle.js', '/browser-next/world.js',
    '/browser-next/sprites.js', '/browser-next/visits-ui.js', '/browser-next/visits-episodes.js', '/browser-next/visits-world.js', '/tests/next-fixtures.mjs'];
  const [save, core, story, guard, map, spriteKit, shell, episodeKit, worldKit, fixtures] = await Promise.all(urls.map(url => import(url)));
  const $ = id => document.getElementById(id);
  const modal = $('modal'), body = $('modal-body'), statusLine = $('modal-status'), closeButton = $('close-modal'), canvas = $('world');
  const H = window.H = {
    log: [], writes: [], toasts: [], statuses: [], chimes: [], spoken: [], loads: [], walks: [], keys: [], shows: [], frameErrors: [], ticks: [],
    arrivals: 0, musicCalls: 0, musicSettled: 0, music: false, reduced: false, speed: 400, neighbor: null, saveReason: '', passed: null, texts: [], recording: false,
  };
  let state, envelope, visits = null, world = null, ways = [], walkPath = [], walkOwner = null, returnTarget = canvas;
  function seed(raw) {
    const loaded = save.parseGodotSave(raw, { initialState: core.initialState });
    if (loaded.status !== 'loaded') throw Error(`the seed save did not load (${loaded.reason})`);
    state = loaded.state; envelope = loaded.envelope;
  }
  seed(JSON.stringify(fixtures.openedEnvelope()));
  // game.js show() and close(): the same focus, return-target and status rules.
  function show(html) {
    const focused = modal.open ? document.activeElement?.id : null;
    body.innerHTML = html;
    if (!modal.open) { returnTarget = canvas; modal.showModal(); }
    const previous = focused ? $(focused) : null;
    if (!previous || !modal.contains(previous)) modal.scrollTop = 0;
    const target = previous && modal.contains(previous) && !previous.disabled ? previous : body.querySelector('button:not([disabled]):not([hidden]),a[href]:not([hidden]),input:not([disabled]):not([hidden])') || closeButton;
    target.focus({ preventScroll: true });
    statusLine.textContent = body.querySelector('.grid-message')?.textContent || '';
    H.shows.push(body.querySelector('section.visits')?.dataset.visits ?? body.firstElementChild?.dataset.harness ?? '?');
  }
  const returnFocus = () => (returnTarget?.isConnected ? returnTarget : (returnTarget?.id && $(returnTarget.id)) || canvas);
  const focusReturn = () => returnFocus().focus({ preventScroll: true });
  function close(target) { const el = typeof target === 'string' ? $(target) : target; returnTarget = el instanceof HTMLElement ? el : canvas; modal.close(); focusReturn(); }
  const toast = text => { $('harness-toast').textContent = text; H.toasts.push(text); };
  function stopWalk() { const owner = walkOwner; walkPath = []; walkOwner = null; if (world) world.path = []; if (owner === 'visit') visits.walkCancelled(); }
  const storyWorld = () => ({ player: state.player, neighbors: map.NEIGHBORS, places: map.PLACES, ...(visits ? visits.objectiveInputs() : {}), openNeighborId: H.neighbor });
  const gate = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };
  const host = {
    doc: document, win: window, modal, settle: null, show, close,
    returnTo(id) { returnTarget = $(id) || canvas; },
    status(text) { statusLine.textContent = text; H.statuses.push(text); },
    announce(text) { if (modal.open) host.status(text); else $('harness-route').textContent = text; },
    toast, getState: () => state,
    // game.js act(): the reducer, the Godot-shaped write, then updateUI.
    act(action) {
      H.log.push(['act', action]);
      const next = core.applyAction(state, action);
      if (next === state) return false;
      const outcome = save.buildGodotSave(envelope, next);
      state = next;
      if (outcome.ok) { envelope = outcome.envelope; H.writes.push(outcome.raw); }
      updateUI();
      return true;
    },
    saveReason: () => H.saveReason,
    chime(id, reason) { H.chimes.push([id, reason]); },
    // A visits-owned walk over the real streets (core.js findPath), followed by the frame loop below while no dialog is open.
    walk(goal, { name = '', announce = '', keepCamera = false } = {}) {
      stopWalk();
      const route = core.findPath(state.player, goal, ways), result = route.length ? 'walking' : 'blocked';
      H.walks.push({ goal: { x: goal.x, y: goal.y }, name, announce, keepCamera, result, cells: route.length });
      if (!route.length) return 'blocked';
      walkPath = route; walkOwner = 'visit'; world.path = route;
      toast(announce || `Walking to ${name}. Choose Stop walking to cancel.`);
      return 'walking';
    },
    stopWalk, walking: () => walkPath.length > 0, player: () => ({ ...state.player }),
    lookAt(point) { world?.camera.lookAt(point); },
    speak(id, text, name) { H.spoken.push([id, text, name]); },
    music: {
      label: () => (H.music ? 'Music: On' : 'Music: Off'), on: () => H.music,
      async toggle() { H.musicCalls++; if (H.musicGate) await H.musicGate.promise; H.music = !H.music; H.musicSettled++; return H.music ? 'Harness music on.' : 'Harness music off.'; },
    },
    reducedMotion: () => H.reduced,
    // A stand-in for characters.js sparkCount (another package's file); the cards print whatever it returns.
    sparks: () => (state.visited?.length ?? 0) + (state.surprises?.length ?? 0) + (state.opened ? 2 : 0),
    objective: () => story.nextObjective(state, storyWorld()),
    openNeighborId: () => H.neighbor,
    cards: () => ({ startup: modal.open && !!body.querySelector('[data-chapter-card] #begin'), story: modal.open && !!body.querySelector('[data-chapter-card]') }),
    dialogOpen: () => modal.open,
    hostingInProgress: () => state.hosting.order.length > 0 && state.hosting.results.length < 4,
    restoreStartupCard(text) { startup({ announce: text }); },
    // Same-origin JSON with a 10 s abort, as game.js requestDistrict; the files are godot/data's (browser-next/data holds byte copies).
    load(name) {
      H.loads.push(name);
      const get = () => { const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000); return fetch(`/godot/data/${name}`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error(`${name}: HTTP ${r.status}`); return r.json(); }).finally(() => clearTimeout(timer)); };
      return H.loadGate ? H.loadGate.promise.then(get) : get();
    },
  };
  host.settle = guard.installPressSettle(document, window);
  function updateUI() { visits.sync(); entries(); }
  // game.js updateAfterglow's two visits entries.
  function entries() { $('afterglow').innerHTML = visits.entryHTML('story') + visits.entryHTML('meal'); visits.bindEntry('story'); visits.bindEntry('meal'); }
  // Stand-ins for game.js's own screens around the visits entries: the startup chapter card, Field notes and the recovery offer.
  function startup({ announce } = {}) {
    show(`<section data-chapter-card data-harness="startup"><span class="eyebrow">HARNESS · STARTUP CARD</span><h2 id="modal-title">Chapter 1</h2><p>game.js draws its startup chapter card here.</p>${visits.entryHTML('before')}<div class="button-row"><button id="begin" class="primary-button" data-harness="begin">Start exploring</button></div></section>`);
    visits.bindEntry('before');
    $('begin').addEventListener('click', () => close());
    $('begin').focus({ preventScroll: true });
    statusLine.textContent = announce ?? 'Chapter 1.';
  }
  function notes() {
    show(`<section data-harness="notes"><span class="eyebrow">HARNESS · FIELD NOTES</span><h2 id="modal-title">Field notes</h2>${visits.entries().revisit.visible ? `<div class="history-entry">${visits.entryHTML('revisit')}</div>` : ''}${visits.entryHTML('notes')}</section>`);
    visits.bindEntry('revisit'); visits.bindEntry('notes');
  }
  const recovery = () => show('<section data-recovery data-harness="recovery"><span class="eyebrow">HARNESS · RECOVERY OFFER</span><h2 id="modal-title">Some progress went back.</h2><p>game.js offers to keep this tab’s progress here.</p><div class="button-row"><button id="recover-save" class="primary-button" data-harness="keep">Keep</button></div></section>');

  visits = shell.createVisits(host, { createEpisodeScreens: episodeKit.createEpisodeScreens, createWorldVisits: worldKit.createWorldVisits });
  // game.js's dialog rules, added after createVisits as game.js adds them: focus goes back on close, × closes to the return
  // target, and a held Escape is one Escape (its capture rule, copied).
  modal.addEventListener('close', () => { if (!modal.open) { focusReturn(); returnTarget = canvas; } });
  closeButton.addEventListener('click', () => close(returnFocus()));
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && event.repeat && modal.open) event.preventDefault(); }, { capture: true });
  $('journal-button').addEventListener('click', notes);
  // What reached the page: pointer events that got past the press-settle guard, and every key with where it landed.
  for (const type of ['pointerdown', 'pointerup', 'click']) window.addEventListener(type, () => { if (H.passed) H.passed[type]++; });
  window.addEventListener('keydown', event => H.keys.push({ key: event.key, repeat: event.repeat, target: event.target?.id || event.target?.tagName || '', prevented: event.defaultPrevented }));
  // Text drawn on the map, recorded on demand for the chip analysis (H.chips).
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
    if (H.recording && this.canvas === canvas) { const m = this.getTransform(); H.texts.push({ text: String(text), x, y, a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f, font: this.font, align: this.textAlign, fill: String(this.fillStyle), width: this.measureText(String(text)).width }); }
    return fillText.call(this, text, x, y, ...rest);
  };

  // game.js init: the streets, then the World; its layers are game.js's (spec WP3 item 10). A tap on a visit object inspects it.
  const response = await fetch('/browser-next/data/streets.osm.json');
  if (!response.ok) throw Error(`street data: HTTP ${response.status}`);
  ways = map.makeWays(await response.json());
  if (!core.walkable(state.player, ways)) state.player = core.initialState().player;
  const sprites = spriteKit.createSprites({ reducedMotion: () => H.reduced });
  world = new map.World(canvas, ways, () => state, {
    click: (point, object) => { H.log.push(['click', object?.id ?? null]); if (object?.kind === 'visit') visits.interact(object, 'tap'); },
    tap: event => host.settle.tap(event), camera: () => {}, reducedMotion: false,
    // H.hideOverlay holds the overlay back for one measurement (a beacon's own colour under the label chips).
    layers: { objects: w => visits.objects(w), ground: (c, w) => sprites.ground(c, w, visits.scene()), actors: w => sprites.actors(w, visits.scene()), overlay: (c, w) => { if (!H.hideOverlay) sprites.overlay(c, w, visits.scene()); } },
  });
  // game.js renderFrame without movement keys: a path is followed only while no dialog is open; when a visits walk ends,
  // walkEnded() runs, then tick() (spec 3.6). H.speed px per frame.
  function frame(ms) {
    try {
      let moving = false;
      if (!modal.open && walkPath.length) {
        let budget = H.speed;
        while (budget > 0 && walkPath.length) {
          const next = walkPath[0], d = Math.hypot(next.x - state.player.x, next.y - state.player.y);
          if (d <= budget) { state.player = { x: next.x, y: next.y }; walkPath.shift(); budget -= d; }
          else { state.player = { x: state.player.x + (next.x - state.player.x) / d * budget, y: state.player.y + (next.y - state.player.y) / d * budget }; budget = 0; }
        }
        moving = true;
        if (!walkPath.length) { world.path = []; if (walkOwner === 'visit') { walkOwner = null; H.arrivals++; visits.walkEnded(); } }
      }
      if (visits.tick(ms, world)) H.ticks.push(visits.snapshot().stories.lantern.progress);
      world.motion = moving; world.draw(ms / 1000, H.reduced);
    } catch (error) { H.frameErrors.push(String(error?.stack ?? error)); }
    requestAnimationFrame(frame);
  }
  const holdsChip = t => /^11px/.test(t.font) && t.align === 'center' && !t.b && !t.c;
  const channel = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = hex => { const n = parseInt(hex.slice(1, 7), 16); return 0.2126 * channel(n >> 16 & 255) + 0.7152 * channel(n >> 8 & 255) + 0.0722 * channel(n & 255); };
  Object.assign(H, {
    visits, ways, settle: host.settle,
    seed(raw) { stopWalk(); seed(raw); visits.sync({ adopted: true }); entries(); return state.surprises; },
    state: () => structuredClone(state), startup, notes, recovery,
    holdMusic() { H.musicGate = gate(); }, releaseMusic() { const g = H.musicGate; H.musicGate = null; g?.release(); },
    holdLoad() { H.loadGate = gate(); }, releaseLoad() { const g = H.loadGate; H.loadGate = null; g?.release(); },
    interact: (id, how = 'tap') => visits.interact({ id, kind: 'visit' }, how),
    object: id => visits.objects(world).find(o => o.id === id) ?? null,
    scene: () => visits.scene(),
    look(point, scale) { world.camera.lookAt(point, scale); world.draw(performance.now() / 1000, H.reduced); return H.toScreen(point); },
    overview() { world.camera.overview(true); world.draw(0, H.reduced); },
    camera: () => ({ scale: +world.scale.toFixed(3), x: +world.camera.center.x.toFixed(1), y: +world.camera.center.y.toFixed(1), overview: world.camera.overviewMode }),
    toScreen(p) { const r = canvas.getBoundingClientRect(); return { x: r.left + world.offset.x + p.x * world.scale, y: r.top + world.offset.y + p.y * world.scale }; },
    pixel(p) { const s = H.toScreen(p), r = canvas.getBoundingClientRect(), d = world.ctx.getImageData(Math.round((s.x - r.left) * world.ratio), Math.round((s.y - r.top) * world.ratio), 1, 1).data; return [d[0], d[1], d[2]]; },
    luminance() { const d = world.ctx.getImageData(0, 0, canvas.width, canvas.height).data; let sum = 0, n = 0; for (let i = 0; i < d.length; i += 16) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; } return sum / n; },
    // The label chips of one frame (world.js chip() and sprites.js chip() share the geometry: 11 px text at (0, -3) on a
    // (width + 20) x 23 rect from y -19), in CSS px, with the chips that overlap and the sprite chips under 4.5:1 on their dark chip.
    chips() {
      H.texts = []; H.recording = true;
      try { world.draw(0, true); } finally { H.recording = false; }
      const ratio = world.ratio, chips = H.texts.filter(holdsChip).map(t => {
        const w = t.width + 20;
        return { text: t.text, fill: t.fill, left: (t.e + t.a * (t.x - w / 2)) / ratio, right: (t.e + t.a * (t.x + w / 2)) / ratio, top: (t.f + t.d * (t.y - 16)) / ratio, bottom: (t.f + t.d * (t.y + 7)) / ratio };
      }).filter(c => c.right > 0 && c.left < innerWidth && c.bottom > 0 && c.top < innerHeight);
      const overlaps = [];
      for (let i = 0; i < chips.length; i++) for (let j = i + 1; j < chips.length; j++) {
        const a = chips[i], b = chips[j], w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) overlaps.push({ a: a.text, b: b.text, area: Math.round(w * h), height: Math.round(h) });
      }
      // world.js chips write #344e40 on light chips; sprites.js chips write their tint on #0d171f (GODOT_LABEL_OUTLINE).
      const lowContrast = chips.filter(c => /^#[0-9a-f]{6}$/i.test(c.fill) && c.fill.toLowerCase() !== '#344e40').map(c => ({ text: c.text, fill: c.fill, ratio: +((lum(c.fill) + 0.05) / (lum('#0d171f') + 0.05)).toFixed(2) })).filter(c => c.ratio < 4.5);
      return { chips: chips.map(c => ({ text: c.text, fill: c.fill, box: [c.left, c.top, c.right, c.bottom].map(v => Math.round(v)) })), overlaps, lowContrast };
    },
  });
  entries();
  requestAnimationFrame(frame);
  H.ready = true;
}
const PAGE_SCRIPT = `(${pageMain})().catch(error => { window.harnessError = String(error && error.stack || error); console.error(error); });`;

// ---------- One screen's audit, in the page ----------
// roots: the product's own elements to audit (a visits screen, or the visits entries inside a stand-in screen). Returns every
// finding with the offending control named, plus the buttons for the label-in-name pass (tagged data-audit-key).
function auditInPage({ roots: selectors, selected }) {
  const out = { overflow: [], small: [], under: [], clipped: [], images: [], inline: [], pressed: [], contrast: [], exempt: [], buttons: [], groups: [], pressedIds: [], controls: 0, texts: 0, minContrast: null };
  const modal = document.getElementById('modal'), html = document.documentElement;
  const roots = [...new Set(selectors.flatMap(sel => [...document.querySelectorAll(sel)]))];
  if (!roots.length) out.missing = selectors.join(', ');
  const spoken = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const ref = el => (el.id ? `#${el.id}` : `<${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? ` class="${el.className}"` : ''}> "${spoken(el.textContent).slice(0, 40)}"`);
  const shown = el => { if (!el || el.closest('.sr-only, [hidden]') || getComputedStyle(el).visibility === 'hidden') return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const all = roots.flatMap(r => [r, ...r.querySelectorAll('*')]);
  // Sideways overflow of the page, the dialog, and anything inside the screen that scrolls or clips sideways.
  if (html.scrollWidth > innerWidth) out.overflow.push(`the page is ${html.scrollWidth} px wide in a ${innerWidth} px viewport`);
  if (modal.open) {
    if (modal.scrollWidth > modal.clientWidth) out.overflow.push(`the dialog scrolls sideways (${modal.scrollWidth} > ${modal.clientWidth})`);
    const b = modal.getBoundingClientRect();
    if (b.left < -0.5 || b.right > innerWidth + 0.5) out.overflow.push(`the dialog box (${b.left.toFixed(1)} to ${b.right.toFixed(1)}) leaves the viewport`);
  }
  for (const el of all) {
    if (!shown(el)) continue;
    const s = getComputedStyle(el);
    if (s.overflowX === 'visible' || el.scrollWidth <= el.clientWidth + 1) continue;
    (['hidden', 'clip'].includes(s.overflowX) ? out.clipped : out.overflow).push(`${ref(el)} ${['hidden', 'clip'].includes(s.overflowX) ? 'cuts off' : 'scrolls'} its content sideways (${el.scrollWidth} > ${el.clientWidth})`);
  }
  // 44 x 44 CSS px for every control, disabled ones too (a link inside running text is exempt, as tests/next-browser.mjs layoutCheck).
  const CONTROL = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [tabindex]:not([tabindex="-1"])';
  const controls = new Set(all.filter(el => el.matches(CONTROL)));
  if (modal.open) controls.add(document.getElementById('close-modal'));
  for (const el of controls) {
    if (!shown(el)) continue;
    if (el.tagName === 'A' && [...el.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    out.controls++;
    const b = el.getBoundingClientRect();
    if (b.width < 43.99 || b.height < 43.99) out.small.push(`${ref(el)} ${b.width.toFixed(1)}x${b.height.toFixed(1)}${el.disabled ? ' (disabled)' : ''}`);
  }
  // Text: under the ×, cut off or spilling out of its box (an overlay label out of its picture), and its contrast against the colour
  // actually behind it (WCAG 1.4.3: 4.5:1, 3:1 for large text; inactive controls are exempt and listed).
  const texts = [];
  for (const r of roots) { const walker = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim() && shown(n.parentElement)) texts.push(n); }
  out.texts = texts.length;
  const closeBox = modal.open ? document.getElementById('close-modal').getBoundingClientRect() : null, range = document.createRange();
  const blockOf = el => { for (let a = el; a; a = a.parentElement) { const d = getComputedStyle(a).display; if (d !== 'inline' && d !== 'contents') return a; } return document.body; };
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c ?? ''); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const mix = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const channel = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = c => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  for (const n of texts) {
    const el = n.parentElement, label = `${ref(el)} "${spoken(n.textContent).slice(0, 40)}"`;
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(b => b.width > 0 && b.height > 0);
    if (!rects.length) continue;
    if (closeBox && rects.some(b => b.right > closeBox.left + 0.5 && b.left < closeBox.right - 0.5 && b.bottom > closeBox.top + 0.5 && b.top < closeBox.bottom - 0.5)) out.under.push(label);
    const block = blockOf(el), box = block.getBoundingClientRect();
    if (rects.some(b => b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1)) out.clipped.push(`${label} spills out of ${ref(block)}`);
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a), hx = ['hidden', 'clip'].includes(s.overflowX), hy = ['hidden', 'clip'].includes(s.overflowY);
      if (!hx && !hy) continue;
      const c = a.getBoundingClientRect();
      if (rects.some(b => (hx && (b.left < c.left - 1 || b.right > c.right + 1)) || (hy && (b.top < c.top - 1 || b.bottom > c.bottom + 1)))) { out.clipped.push(`${label} is cut off by ${ref(a)} (overflow ${s.overflowX} ${s.overflowY})`); break; }
    }
    if (getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth) out.clipped.push(`${label} ends in an ellipsis`);
    const picture = el.closest('.visits-overlay')?.closest('.visits-picture');
    if (picture) { const p = picture.getBoundingClientRect(); if (rects.some(b => b.left < p.left - 1 || b.right > p.right + 1 || b.top < p.top - 1 || b.bottom > p.bottom + 1)) out.clipped.push(`${label} leaves its picture`); }
    const style = getComputedStyle(el), color = parse(style.color);
    if (!color || color.a === 0) continue;
    const layers = [];
    let base = null, unknown = '';
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage && s.backgroundImage !== 'none') { unknown = `${ref(a)} draws a background image`; break; }
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) { if (bg.a >= 0.999) { base = bg; break; } layers.push(bg); }
    }
    if (unknown) { out.exempt.push(`${label}: not measured, ${unknown}`); continue; }
    let bg = base ?? { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) bg = mix(layer, bg);
    const fg = color.a < 1 ? mix(color, bg) : color, ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
    const size = parseFloat(style.fontSize), weight = Number(style.fontWeight) || 400, large = size >= 24 || (size >= 18.66 && weight >= 700), need = large ? 3 : 4.5;
    if (el.closest('button:disabled, [aria-disabled="true"]')) { if (ratio < need) out.exempt.push(`${label} ${ratio.toFixed(2)}:1 (${hex(fg)} on ${hex(bg)}) on a disabled control`); continue; }
    out.minContrast = out.minContrast == null ? +ratio.toFixed(2) : Math.min(out.minContrast, +ratio.toFixed(2));
    if (ratio < need) out.contrast.push(`${label} ${ratio.toFixed(2)}:1 (${hex(fg)} on ${hex(bg)}, ${size}px${large ? ', large' : ''})`);
  }
  // CSP-relevant markup in the live DOM: images only as data: URIs, no inline handler, inline script or javascript: URL.
  for (const img of document.querySelectorAll('img')) { const src = img.getAttribute('src') ?? ''; if (!/^data:image\//i.test(src)) out.images.push(`${ref(img)} src="${src.slice(0, 60)}"`); }
  for (const el of all) { const b = getComputedStyle(el).backgroundImage; if (/url\(/i.test(b) && !/url\("?data:/i.test(b)) out.images.push(`${ref(el)} background ${b.slice(0, 60)}`); }
  for (const el of document.querySelectorAll('*')) for (const a of el.attributes) if (/^on/i.test(a.name)) out.inline.push(`${ref(el)} ${a.name}="${a.value.slice(0, 30)}"`);
  for (const s of document.scripts) if (!s.src) out.inline.push(`an inline <script> (${spoken(s.textContent).slice(0, 40)})`);
  for (const el of document.querySelectorAll('[href], [src], [action], [formaction]')) for (const name of ['href', 'src', 'action', 'formaction']) if (/^\s*javascript:/i.test(el.getAttribute(name) ?? '')) out.inline.push(`${ref(el)} ${name}="javascript:…"`);
  // Pressed look: every aria-pressed control that is pressed has the selected look, and differs in background and border from each
  // unpressed control beside it.
  const groups = new Map();
  for (const el of all.filter(e => e.hasAttribute('aria-pressed') && shown(e))) { if (!groups.has(el.parentElement)) groups.set(el.parentElement, []); groups.get(el.parentElement).push(el); }
  const look = el => { const s = getComputedStyle(el); return { id: el.id, pressed: el.getAttribute('aria-pressed'), background: s.backgroundColor, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, color: s.color, height: el.getBoundingClientRect().height }; };
  for (const members of groups.values()) {
    const looks = members.map(look), on = looks.filter(l => l.pressed === 'true'), off = looks.filter(l => l.pressed === 'false');
    out.groups.push(looks.map(l => l.id + (l.pressed === 'true' ? '*' : '')).join(' '));
    for (const a of on) {
      out.pressedIds.push(a.id);
      if (a.background !== selected.background || a.border !== selected.border || a.color !== selected.color) out.pressed.push(`#${a.id} is pressed but drawn ${a.background}, ${a.border}, ${a.color}, not the selected look`);
      for (const b of off) if (a.background === b.background || a.border === b.border) out.pressed.push(`#${a.id} (pressed) and #${b.id} (not pressed) look alike: ${a.background} / ${b.background}, ${a.border} / ${b.border}`);
      if (a.height < 43.99) out.pressed.push(`#${a.id} shrinks to ${a.height.toFixed(1)} px when pressed`);
    }
  }
  // The buttons and links for the label-in-name pass: the visible text, and a name computed from aria-labelledby, aria-label and the
  // content in case Chrome's accessibility tree cannot be read.
  let key = 0;
  for (const el of all) {
    if (!el.matches('button, a[href], [role=button], [role=link]') || !shown(el)) continue;
    const labelled = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean).map(id => spoken(document.getElementById(id)?.textContent)).join(' ');
    el.dataset.auditKey = String(key);
    out.buttons.push({ key: String(key++), ref: ref(el), visible: spoken(el.innerText), computed: spoken(labelled || el.getAttribute('aria-label') || el.textContent) });
  }
  return out;
}

// ---------- Node-side helpers ----------
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
const results = {
  ok: false, started: new Date().toISOString(), browser: `${process.env.BROWSER_CHANNEL || 'chrome'} ${browser.version()}`, root, out,
  widths: WIDTHS.map(w => ({ name: w.name, ...w.viewport, input: w.touch ? 'touch' : 'mouse' })), checks: {},
  undersized: [], labelInName: [], contrastExempt: [], findings: [], placement: [], data: {}, screenshots: { dialogs: [], scenes: [] }, failures: [],
};
const GROUPS = ['screens', 'labelInName', 'gestures', 'focus', 'scenes'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const spoken = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const hexRgb = hex => { const n = parseInt(hex.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');

async function serve(route, log) {
  const url = new URL(route.request().url());
  if (url.host !== HOST) { log.external.push(url.href); return route.abort(); }
  if (url.pathname === '/') return route.fulfill({ status: 200, body: HARNESS, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP } });
  if (url.pathname === '/__visits/harness.js') return route.fulfill({ status: 200, body: PAGE_SCRIPT, headers: { 'content-type': 'text/javascript; charset=utf-8' } });
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  let bytes = null;
  if (file.startsWith(root + path.sep)) try { bytes = await readFile(file); } catch { bytes = null; }
  return bytes ? route.fulfill({ status: 200, body: bytes, headers: { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' } }) : route.fulfill({ status: 404, body: '' });
}
async function openPage(w, label) {
  const context = await browser.newContext({ viewport: w.viewport, ...(w.touch ? { hasTouch: true, isMobile: true } : {}) });
  context.setDefaultTimeout(20000);
  // The guard is off (a 0 ms window) except where a check turns it on; every CSP violation is kept for the next audit.
  await context.addInitScript(() => {
    window.__tenderloinPressSettleMs = 0; window.__csp = [];
    addEventListener('securitypolicyviolation', event => window.__csp.push(`${event.effectiveDirective} blocked ${event.blockedURI || 'an inline resource'} (${event.sourceFile || document.URL}:${event.lineNumber})`), true);
  });
  const page = await context.newPage(), log = { pageErrors: [], consoleErrors: [], failed: [], external: [] };
  page.on('pageerror', error => log.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') log.consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) log.failed.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => { if (new URL(request.url()).host === HOST) log.failed.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`); });
  await page.route('**/*', route => serve(route, log));
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => window.H?.ready === true || !!window.harnessError, null, { timeout: 30000 });
  const failed = await page.evaluate(() => window.harnessError ?? null);
  if (failed) throw Error(`the harness page did not start: ${failed}`);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const R = results.checks[w.name];
  return {
    w, label, context, page, log, cdp, pressedSeen: new Set(),
    fail(group, message) { R[group].failures.push(message); console.log(`not ok ${message}`); },
    note(group, item) { R[group].evidence.push(item); },
  };
}
// Run one flow on its own page; a step that cannot go on fails its group with the step named, and the next flow still runs.
async function session(w, label, group, flow) {
  let t = null;
  try { t = await openPage(w, label); await flow(t); console.log(`ok ${w.name} ${label}`); }
  catch (error) {
    results.checks[w.name][group].failures.push(`${w.name} ${label} stopped: ${error.message.split('\n')[0]}`);
    console.log(`not ok ${w.name} ${label} stopped\n${error.stack}`);
    if (t) await t.page.screenshot({ path: path.join(out, `${w.name}-${label}-stopped.png`) }).catch(() => {});
  } finally { await t?.context.close().catch(() => {}); }
}
async function until(page, fn, arg, message, timeout = 15000) {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); }
  catch (error) { throw Error(`${message} (not within ${timeout} ms: ${String(error.message).split('\n')[0]})`); }
}
async function poll(fn, message, timeout = 15000) {
  const end = Date.now() + timeout;
  for (;;) { const value = await fn(); if (value) return value; if (Date.now() > end) throw Error(`${message} (not within ${timeout} ms)`); await sleep(50); }
}
const snap = t => t.page.evaluate(() => window.H.visits.snapshot());
const snapUntil = (t, predicate, message, timeout) => poll(async () => { const s = await snap(t); return predicate(s) ? s : null; }, `${t.w.name}: ${message}`, timeout);
// A screen that waits for a place file redraws when it arrives: let that happen (and two frames pass) before measuring or pressing.
async function settled(t, what) {
  await snapUntil(t, s => !Object.values(s.data).includes('loading'), `${what}: the place files settle`);
  await t.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
const where = t => t.page.evaluate(() => {
  const m = document.getElementById('modal'), section = document.querySelector('#modal-body > section');
  return `${m.open ? `dialog ${section?.dataset.visits ?? section?.dataset.harness ?? '?'} "${document.querySelector('#modal-body #modal-title')?.textContent ?? ''}"` : 'no dialog'}, focus on ${document.activeElement?.id || document.activeElement?.tagName}`;
}).catch(() => 'the page is gone');
async function press(t, id) {
  const { page, w } = t;
  try { await page.waitForFunction(id => { const el = document.getElementById(id); return !!el && !el.disabled && el.getClientRects().length > 0; }, id, { timeout: 15000, polling: 50 }); }
  catch { throw Error(`#${id} is not on screen and enabled (${await where(t)})`); }
  const locator = page.locator(`#${id}`);
  if (w.touch) await locator.tap(); else await locator.click();
}
const screen = (t, kind) => until(t.page, kind => document.querySelector('#modal[open] #modal-body section.visits')?.dataset.visits === kind && window.H.visits.holds(), kind, `${t.w.name}: the ${kind} screen holds the dialog`);
// The dialog's close event runs after the task that closed it, and the host's close rule moves focus then; wait for it to have run
// (tests/next-browser.mjs settledClose) before focusing or pressing anything else.
async function closing(t, fn, what) {
  await t.page.evaluate(() => { window.__closeRan = false; document.getElementById('modal').addEventListener('close', () => { window.__closeRan = true; }, { once: true }); });
  await fn();
  await until(t.page, () => window.__closeRan === true && !document.getElementById('modal').open, null, `${t.w.name} ${what}: the dialog closes`, 10000);
}
async function focusIs(t, id, what) {
  const ok = await t.page.waitForFunction(id => document.activeElement?.id === id, id, { timeout: 5000, polling: 50 }).then(() => true, () => false);
  const actual = await t.page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || 'nothing');
  t.note('focus', { what, expected: id, actual, ok });
  if (!ok) t.fail('focus', `${t.w.name} ${what}: focus is on ${actual}, not #${id}`);
}
async function textIs(t, selector, expected, what, group = 'focus') {
  const ok = await t.page.waitForFunction(([s, e]) => document.querySelector(s)?.textContent === e, [selector, expected], { timeout: 5000, polling: 50 }).then(() => true, () => false);
  const actual = await t.page.evaluate(s => document.querySelector(s)?.textContent ?? null, selector);
  t.note(group, { what, expected, actual, ok });
  if (!ok) t.fail(group, `${t.w.name} ${what}: ${selector} says ${JSON.stringify(actual)}, not ${JSON.stringify(expected)}`);
}
// Errors, failed or external requests and CSP violations since the last look, so each is reported with the screen that caused it.
async function problems(t) {
  const page = await t.page.evaluate(() => ({ csp: window.__csp.splice(0), frame: window.H?.frameErrors.splice(0) ?? [] }));
  const { log } = t;
  return [...log.pageErrors.splice(0).map(m => `page error: ${m}`), ...log.consoleErrors.splice(0).map(m => `console error: ${m}`), ...log.failed.splice(0).map(m => `failed request: ${m}`),
    ...log.external.splice(0).map(m => `external request: ${m}`), ...page.csp.map(m => `CSP violation: ${m}`), ...page.frame.map(m => `frame error: ${m.split('\n')[0]}`)];
}
// Chrome's own accessible names (the accessibility tree through CDP) of the controls auditInPage tagged, by key.
async function accessibleNames(t, count) {
  const names = { source: 'chrome accessibility tree' };
  if (!count) return names;
  try {
    const { result } = await t.cdp.send('Runtime.evaluate', { expression: 'Array.from(document.querySelectorAll("[data-audit-key]")).sort((a, b) => a.dataset.auditKey - b.dataset.auditKey)' });
    const { result: props } = await t.cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
    for (const prop of props) {
      if (!/^\d+$/.test(prop.name) || !prop.value?.objectId) continue;
      const { nodes } = await t.cdp.send('Accessibility.getPartialAXTree', { objectId: prop.value.objectId, fetchRelatives: false });
      const node = nodes.find(n => !n.ignored) ?? nodes[0];
      names[prop.name] = { name: node?.name?.value ?? '', role: node?.role?.value ?? '' };
    }
    await t.cdp.send('Runtime.releaseObject', { objectId: result.objectId }).catch(() => {});
  } catch (error) { names.source = `computed in the page (the accessibility tree failed: ${error.message})`; }
  return names;
}
// One screen: layout, targets, text, CSP markup, pressed looks, contrast, label in name, the page's log, and a screenshot.
async function audit(t, label, { roots = [VISITS] } = {}) {
  const { page, w } = t, at = `${w.name} ${label}`;
  await settled(t, label);
  const r = await page.evaluate(auditInPage, { roots, selected: SELECTED });
  if (r.missing) t.fail('screens', `${at}: nothing to audit, no ${r.missing}`);
  for (const p of r.overflow) t.fail('screens', `${at}: ${p}`);
  for (const p of r.small) { results.undersized.push(`${at}: ${p}`); t.fail('screens', `${at}: a control under 44x44 CSS px: ${p}`); }
  for (const p of r.under) t.fail('screens', `${at}: text under the × close button: ${p}`);
  for (const p of r.clipped) t.fail('screens', `${at}: clipped text: ${p}`);
  for (const p of r.images) t.fail('screens', `${at}: an image that is not a data: URI: ${p}`);
  for (const p of r.inline) t.fail('screens', `${at}: inline script or handler: ${p}`);
  for (const p of r.pressed) t.fail('screens', `${at}: pressed look: ${p}`);
  for (const p of r.contrast) t.fail('screens', `${at}: contrast below the minimum: ${p}`);
  for (const p of r.exempt) results.contrastExempt.push(`${at}: ${p}`);
  for (const id of r.pressedIds) t.pressedSeen.add(id);
  const names = await accessibleNames(t, r.buttons.length);
  const kept = await page.evaluate(n => document.querySelectorAll('[data-audit-key]').length === n, r.buttons.length);
  if (!kept) t.fail('labelInName', `${at}: the screen redrew during the label-in-name pass; its names were not read`);
  for (const b of kept ? r.buttons : []) {
    const name = spoken(names[b.key]?.name ?? b.computed);
    if (!name) { const message = `${at}: ${b.ref} has no accessible name`; results.labelInName.push(message); t.fail('labelInName', message); }
    else if (!name.startsWith(b.visible)) { const message = `${at}: ${b.ref} shows "${b.visible}" but its accessible name is "${name}"`; results.labelInName.push(message); t.fail('labelInName', message); }
  }
  await page.evaluate(() => document.querySelectorAll('[data-audit-key]').forEach(el => el.removeAttribute('data-audit-key')));
  t.note('labelInName', { screen: label, buttons: r.buttons.length, names: names.source });
  for (const p of await problems(t)) t.fail('screens', `${at}: ${p}`);
  const file = path.join(out, `${w.name}-${label}.png`);
  await page.screenshot({ path: file });
  results.screenshots.dialogs.push(file);
  t.note('screens', { screen: label, controls: r.controls, texts: r.texts, minContrast: r.minContrast, toggles: r.groups, screenshot: path.basename(file) });
}

// ---------- Gestures: the guard at its production window, held keys ----------
// One gesture of two presses on a control: a double click, or two taps 80 ms apart. Gated: only the first press reaches the page
// and acts. Rapid ([data-rapid]): both reach it and both act. The positive part is polled; the negative part gets a 300 ms grace.
async function once(t, id, { rapid = false, check, what }) {
  const { page, w } = t, locator = page.locator(`#${id}`);
  await settled(t, `#${id}`);
  await page.waitForFunction(id => { const el = document.getElementById(id); return !!el && !el.disabled; }, id, { timeout: 15000, polling: 50 })
    .catch(async () => { throw Error(`#${id} is not on screen and enabled for the double press (${await where(t)})`); });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2, marked = await locator.evaluate(el => el.hasAttribute('data-rapid'));
  const start = await snap(t), heights = () => page.evaluate(() => ({ ...Object.fromEntries([['title', '#modal-body #modal-title'], ['picture', '#modal-body .visits-picture'], ['reader', '#visits-reader']].map(([k, s]) => [k, Math.round(document.querySelector(s)?.getBoundingClientRect().height ?? 0)])), 'dialog scroll': Math.round(document.getElementById('modal').scrollTop) }));
  const shape = await heights();
  const before = await page.evaluate(() => { delete window.__tenderloinPressSettleMs; window.H.passed = { pointerdown: 0, pointerup: 0, click: 0 }; return window.H.settle.snapshot(); });
  if (w.touch) { await page.touchscreen.tap(x, y); await sleep(80); await page.touchscreen.tap(x, y); } else await page.mouse.dblclick(x, y, { delay: 40 });
  const want = rapid ? 2 : 1;
  await page.waitForFunction(([before, want, gated]) => { const s = window.H.settle.snapshot(), p = window.H.passed; return p.pointerdown >= want && p.pointerup >= want && p.click >= want && (!gated || (s.armed > before.armed && s.swallowed > before.swallowed)); },
    [before, want, !rapid], { timeout: 10000, polling: 50 }).catch(() => {});
  await sleep(300);
  const [after, passed] = await page.evaluate(() => [window.H.settle.snapshot(), { ...window.H.passed }]), s = await snap(t), acted = !!check(s, start);
  // Where the control is now, and what the press point holds: a control that moved after the first press cannot take the second.
  const landed = await page.evaluate(([id, x, y]) => { const b = document.getElementById(id)?.getBoundingClientRect(), hit = document.elementFromPoint(x, y)?.closest('button, a[href], [tabindex]'); return { box: b ? [b.x, b.y, b.width, b.height].map(Math.round) : null, at: hit ? hit.id || hit.tagName : null }; }, [id, x, y]);
  await page.waitForFunction(() => !window.H.settle.snapshot().open, null, { timeout: 10000, polling: 50 }).catch(() => {});
  await page.evaluate(() => { window.__tenderloinPressSettleMs = 0; window.H.passed = null; });
  const item = { gesture: w.touch ? 'two taps' : 'double click', control: id, rapid, marked, armed: after.armed - before.armed, swallowed: after.swallowed - before.swallowed, passed, acted, expected: what,
    box: [box.x, box.y, box.width, box.height].map(Math.round), boxAfter: landed.box, atPressPointAfter: landed.at, heightsBefore: shape, heightsAfter: await heights() };
  t.note('gestures', item);
  const grew = Object.keys(shape).filter(k => shape[k] !== item.heightsAfter[k]).map(k => `${k} ${shape[k]} -> ${item.heightsAfter[k]} px`).join(', ');
  const at = `${w.name} #${id}`, moved = landed.at !== id ? ` (after the first press #${id} moved from ${item.box.join(',')} to ${landed.box?.join(',')} (x,y,w,h)${grew ? ` as the ${grew}` : ''}, so the press point holds ${landed.at ?? 'nothing'})` : '';
  if (rapid) {
    if (!marked) t.fail('gestures', `${at}: a rapid control without data-rapid`);
    if (after.swallowed !== before.swallowed) t.fail('gestures', `${at}: the guard swallowed ${after.swallowed - before.swallowed} event(s) of a [data-rapid] control${moved}`);
    if (passed.pointerdown !== 2 || passed.click !== 2) t.fail('gestures', `${at}: both presses of a [data-rapid] control should reach the page, ${JSON.stringify(passed)} did${moved}`);
  } else {
    if (item.armed !== 1) t.fail('gestures', `${at}: one gesture armed the guard ${item.armed} times`);
    if (item.swallowed < 1) t.fail('gestures', `${at}: the second press was not swallowed`);
    if (passed.pointerdown !== 1 || passed.click !== 1) t.fail('gestures', `${at}: only the first press should reach the page, ${JSON.stringify(passed)} did`);
  }
  if (!acted) t.fail('gestures', `${at}: one ${item.gesture} should act ${rapid ? 'twice' : 'once'} (${what}); the visit shows ${JSON.stringify(brief(s))}${rapid ? moved : ''}`);
  return item;
}
const brief = s => ({ screen: s.screen, before: s.before.view, meal: { selected: s.meal.selected, steps: s.meal.steps }, power: { station: s.stories.power.station, restored: s.stories.power.restored, turns: s.stories.power.turns[s.stories.power.station] }, dogs: { found: s.stories.dogs.found, info: s.stories.dogs.infoView }, lantern: s.stories.lantern.phase, election: { observed: s.stories.election.observed, selected: s.stories.election.selected }, page: s.stories.picker.page, museumStep: s.world.tour.museumStep });
// A held Enter on a focused control: one press, then repeats until a repeat lands on `reach` (the control focus moves to when the
// press chains on, or the control itself), after an arrival when `arrive`, then three more. Only the first press may act.
async function held(t, id, { reach = id, arrive = false, check, what }) {
  const { page, w } = t;
  await settled(t, `#${id}`);
  await page.locator(`#${id}`).focus();
  await until(page, id => document.activeElement?.id === id, id, `${w.name}: #${id} takes focus for the held Enter`);
  const arrivals = await page.evaluate(() => { window.H.keys = []; return window.H.arrivals; });
  await page.keyboard.down('Enter');
  const end = Date.now() + 10000;
  let reached = false;
  while (!reached && Date.now() < end) {
    await sleep(40); await page.keyboard.down('Enter');
    reached = await page.evaluate(([reach, arrivals, arrive]) => window.H.keys.some(k => k.key === 'Enter' && k.repeat && k.target === reach) && (!arrive || window.H.arrivals > arrivals), [reach, arrivals, arrive]);
  }
  for (let i = 0; i < 3; i++) { await sleep(40); await page.keyboard.down('Enter'); }
  await page.keyboard.up('Enter');
  await sleep(300);
  const keys = await page.evaluate(() => window.H.keys.filter(k => k.key === 'Enter')), s = await snap(t), ok = reached && !!check(s);
  t.note('gestures', { held: 'Enter', control: id, reach, repeats: keys.filter(k => k.repeat).length, onReach: keys.filter(k => k.repeat && k.target === reach).length, prevented: keys.filter(k => k.repeat && k.prevented).length, ok, expected: what });
  if (!reached) t.fail('gestures', `${w.name}: the held Enter on #${id} never reached #${reach}${arrive ? ' after the walk arrived' : ''} (repeats landed on ${[...new Set(keys.map(k => k.target))].join(', ')})`);
  else if (!check(s)) t.fail('gestures', `${w.name}: a held Enter on #${id} pressed more than once (${what} expected; the visit shows ${JSON.stringify(brief(s))})`);
}
// A held Escape: one Escape, six repeats; exactly one screen may close (still: what must be on screen after the hold).
async function holdEscape(t, still, what) {
  const { page, w } = t;
  await page.evaluate(() => { window.H.keys = []; });
  await page.keyboard.down('Escape');
  for (let i = 0; i < 6; i++) { await sleep(40); await page.keyboard.down('Escape'); }
  await page.keyboard.up('Escape');
  const ok = await poll(() => still(), `${w.name}: after a held Escape, ${what}`, 5000).then(() => true, () => false);
  await sleep(300);
  const after = ok && await still(), keys = await page.evaluate(() => window.H.keys.filter(k => k.key === 'Escape'));
  t.note('gestures', { held: 'Escape', repeats: keys.filter(k => k.repeat).length, prevented: keys.filter(k => k.repeat && k.prevented).length, ok: !!after, expected: what });
  if (!after) t.fail('gestures', `${w.name}: a held Escape closed more than one screen (${what} expected; ${await where(t)})`);
}
// A walk control: the screen closes, the frame loop walks the real route, and the arrival reopens the screen.
async function walked(t, id, kind) {
  const { page, w } = t;
  const n = await page.evaluate(() => ({ arrivals: window.H.arrivals, walks: window.H.walks.length }));
  await press(t, id);
  await until(page, ([n, kind]) => (window.H.walks.length > n.walks && window.H.walks.at(-1).result === 'blocked')
    || (window.H.arrivals > n.arrivals && window.H.visits.holds() && document.querySelector('#modal[open] section.visits')?.dataset.visits === kind), [n, kind], `${w.name}: #${id} walks and ${kind} reopens on arrival`, 30000);
  const last = await page.evaluate(() => window.H.walks.at(-1));
  if (last?.result === 'blocked') throw Error(`#${id} found no route to (${last.goal.x.toFixed(1)}, ${last.goal.y.toFixed(1)})`);
  return last;
}
// Power Story's connector puzzle at the current relay: each pad turned to its one solution (power.js SOLUTIONS).
async function solve(t) {
  const p = (await snap(t)).stories.power, target = SOLUTIONS[p.station].split('').map(Number);
  for (let i = 0; i < 4; i++) {
    for (let k = (target[i] - p.turns[p.station][i] + 4) % 4; k > 0; k--) {
      const turn = (await snap(t)).stories.power.turns[p.station][i];
      await press(t, `power-pad-${i}`);
      await snapUntil(t, s => s.stories.power.turns[p.station][i] === (turn + 1) % 4, `connector ${i + 1} turns`);
    }
  }
}
// A tap on a visit object on the map, with the guard at its production window so the tap that opens a card claims its own click
// (settle.tap, spec lesson 10): the camera looks at the object first, then the World's own hit test decides what was tapped.
async function tapObject(t, id) {
  const { page, w } = t;
  const at = await page.evaluate(id => { const o = window.H.object(id); return o && window.H.look(o, 1); }, id);
  if (!at) throw Error(`${id} is not among the visit objects the World hit-tests`);
  const before = await page.evaluate(() => { delete window.__tenderloinPressSettleMs; window.H.log = window.H.log.filter(e => e[0] !== 'click'); return window.H.settle.snapshot(); });
  if (w.touch) await page.touchscreen.tap(at.x, at.y); else await page.mouse.click(at.x, at.y);
  await until(page, () => window.H.log.some(e => e[0] === 'click'), null, `${w.name}: the tap on ${id} reaches the World`);
  const hit = await page.evaluate(() => window.H.log.find(e => e[0] === 'click')[1]);
  await page.waitForFunction(() => !window.H.settle.snapshot().open, null, { timeout: 10000, polling: 50 }).catch(() => {});
  const after = await page.evaluate(() => { window.__tenderloinPressSettleMs = 0; return window.H.settle.snapshot(); });
  t.note('gestures', { tap: id, hit, armed: after.armed - before.armed, swallowed: after.swallowed - before.swallowed });
  if (hit !== id) throw Error(`a tap on ${id} hit ${hit ?? 'nothing'}`);
  if (after.armed - before.armed !== 1) t.fail('gestures', `${w.name}: the map tap on ${id} opened a card without arming the press-settle guard (settle.tap)`);
}

// ---------- Flow A: every screen reachable without walking (checks 1, 2 and the focus rules of 4) ----------
async function screensFlow(t) {
  const { page, w } = t;
  await audit(t, 'entries', { roots: ['#story-entry', '#meal-entry'] });
  // Before These Streets from the startup card: every view, both observations and the Sources; Back to start brings the card back
  // with Start exploring focused and Godot's close line in its status line.
  await page.evaluate(() => window.H.startup());
  await until(page, () => !!document.querySelector('#modal[open] [data-chapter-card] #before-entry'), null, `${w.name}: the startup card shows #before-entry`);
  await audit(t, 'startup-card-entry', { roots: ['#before-entry'] });
  await press(t, 'before-entry'); await screen(t, 'before');
  await focusIs(t, 'before-gust', 'Before These Streets opened from the startup card');
  await audit(t, 'before-startup-view-1');
  for (const view of [1, 2]) { await press(t, 'before-gust'); await snapUntil(t, s => s.before.view === view, `Send a gust shows view ${view + 1}`); await audit(t, `before-startup-view-${view + 1}`); }
  await focusIs(t, 'before-shapes', 'the last view (Send a gust disabled)');
  await press(t, 'before-shapes'); await snapUntil(t, s => s.before.observation === 0, 'Changing shapes is chosen'); await audit(t, 'before-startup-changing-shapes');
  await press(t, 'before-time'); await snapUntil(t, s => s.before.observation === 1, 'Passing time is chosen'); await audit(t, 'before-startup-passing-time');
  await press(t, 'before-sources'); await snapUntil(t, s => s.before.sources, 'the Sources view opens');
  await focusIs(t, 'visits-reader', 'the Sources view'); await audit(t, 'before-startup-sources');
  await press(t, 'before-sources'); await snapUntil(t, s => !s.before.sources, 'Back to scene');
  await press(t, 'before-back');
  await until(page, () => !!document.querySelector('#modal[open] [data-chapter-card] #begin'), null, `${w.name}: Back to start restores the startup card`);
  await focusIs(t, 'begin', 'Back to start');
  await textIs(t, '#modal-status', BEFORE_CLOSED, "Back to start: the card's status line");
  await closing(t, () => press(t, 'begin'), 'Start exploring');
  // Field notes: the revisit entry and the neighborhood entry; Before from it returns to the Field notes button.
  await press(t, 'journal-button');
  await until(page, () => !!document.querySelector('#modal[open] [data-harness="notes"] #before-revisit'), null, `${w.name}: Field notes shows #before-revisit`);
  await audit(t, 'field-notes-entries', { roots: ['#before-revisit', '[data-visits-notes]'] });
  await press(t, 'before-revisit'); await screen(t, 'before');
  await focusIs(t, (await snap(t)).before.view === 2 ? 'before-back' : 'before-gust', 'Before These Streets opened from Field notes (Send a gust, else Back)');
  await audit(t, 'before-field-notes');
  await press(t, 'before-sources'); await snapUntil(t, s => s.before.sources, 'the Sources view opens'); await audit(t, 'before-field-notes-sources');
  await closing(t, () => press(t, 'before-back'), 'Back to block');
  await focusIs(t, 'journal-button', 'Back to block from Field notes');
  await textIs(t, '#harness-toast', BEFORE_CLOSED, 'Back to block: the toast');

  // Cook & Share: every step of a preparation, both rows, share, follow the invitation, another preparation, the previous cook.
  await press(t, 'meal-entry'); await screen(t, 'meal');
  await focusIs(t, 'meal-prepare', 'Cook & Share');
  await audit(t, 'meal-cook-1-step-0');
  for (let step = 1; step <= 5; step++) { await press(t, 'meal-prepare'); await snapUntil(t, s => s.meal.steps[0] === step, `preparation step ${step}`); await audit(t, `meal-cook-1-step-${step}`); }
  await focusIs(t, 'meal-share', 'the fifth step');
  await press(t, 'meal-serving-1'); await snapUntil(t, s => s.meal.servings[0] === 1, 'Tasting plates'); await audit(t, 'meal-tasting-plates');
  await press(t, 'meal-placement-1'); await snapUntil(t, s => s.meal.placements[0] === 1, 'Other edge'); await audit(t, 'meal-other-edge');
  await press(t, 'meal-share'); await snapUntil(t, s => !!s.meal.shared[0], 'the first dish is shared'); await audit(t, 'meal-shared');
  await press(t, 'meal-share'); await snapUntil(t, s => s.meal.selected === 1, 'Follow this invitation selects the next cook');
  await focusIs(t, 'meal-prepare', 'Follow this invitation'); await audit(t, 'meal-cook-2');
  for (let step = 1; step <= 5; step++) { await press(t, 'meal-prepare'); await snapUntil(t, s => s.meal.steps[1] === step, `cook 2 step ${step}`); }
  await press(t, 'meal-prepare'); await snapUntil(t, s => s.meal.generations[1] === 1 && s.meal.steps[1] === 0, 'Try another preparation'); await audit(t, 'meal-another-preparation');
  await press(t, 'meal-previous'); await snapUntil(t, s => s.meal.selected === 0, 'Previous cook'); await audit(t, 'meal-previous-cook');
  await closing(t, () => press(t, 'meal-explore'), 'Keep exploring');
  await focusIs(t, 'meal-entry', 'Keep exploring');

  // The stories hub, the Larkin and festival views, the picker's two pages and the three other episodes.
  await press(t, 'story-entry'); await screen(t, 'power');
  await focusIs(t, 'power-begin', 'the stories hub'); await audit(t, 'power-hub');
  await snapUntil(t, s => s.data.power_place === 'ready', 'the first Story open loads power_place.json');
  await press(t, 'power-tab-1'); await snapUntil(t, s => s.stories.power.historical, 'Larkin 2017'); await audit(t, 'power-larkin-case-map');
  await press(t, 'power-begin'); await snapUntil(t, s => s.stories.power.active && s.stories.power.historical && !s.stories.power.mapView, 'the Larkin story begins'); await audit(t, 'power-larkin-active');
  await press(t, 'power-begin'); await snapUntil(t, s => s.stories.power.mapView, 'Case map while the story runs'); await audit(t, 'power-larkin-active-case-map');
  await press(t, 'power-end'); await snapUntil(t, s => !s.stories.power.active, 'End story');
  await press(t, 'power-tab-0'); await snapUntil(t, s => !s.stories.power.historical, 'Festival'); await audit(t, 'power-festival');
  await press(t, 'power-begin'); await snapUntil(t, s => s.stories.power.active, 'the festival story begins');
  await focusIs(t, 'power-walk', 'Begin story'); await audit(t, 'power-festival-active');
  await press(t, 'power-end'); await snapUntil(t, s => !s.stories.power.active, 'End story');
  await press(t, 'power-more'); await screen(t, 'picker');
  await focusIs(t, 'picker-entry-0', 'the story picker'); await audit(t, 'picker-page-1');
  await press(t, 'picker-later'); await snapUntil(t, s => s.stories.picker.page === 1, 'Later');
  await focusIs(t, 'picker-entry-2', 'Later (the page’s first entry)'); await audit(t, 'picker-page-2');
  await press(t, 'picker-entry-3'); await screen(t, 'dogs');
  await focusIs(t, 'dogs-begin', 'Two Dogs Home'); await audit(t, 'dogs');
  await press(t, 'dogs-info'); await snapUntil(t, s => s.stories.dogs.infoView, 'SFACC info'); await audit(t, 'dogs-sfacc-info');
  await press(t, 'dogs-junebug'); await snapUntil(t, s => s.stories.dogs.profile === 1 && !s.stories.dogs.infoView, 'Junebug'); await audit(t, 'dogs-junebug');
  await press(t, 'dogs-pippin'); await snapUntil(t, s => s.stories.dogs.profile === 0, 'Pippin');
  await press(t, 'dogs-begin'); await snapUntil(t, s => s.stories.dogs.active, 'Begin search');
  await focusIs(t, 'dogs-lead0', 'Begin search'); await audit(t, 'dogs-search');
  await press(t, 'dogs-lead0'); await snapUntil(t, s => s.stories.dogs.lead === 0, 'the first lead'); await audit(t, 'dogs-lead');
  await press(t, 'dogs-stories'); await screen(t, 'picker'); await audit(t, 'picker-from-dogs');
  if ((await snap(t)).stories.picker.page !== 0) { await press(t, 'picker-earlier'); await snapUntil(t, s => s.stories.picker.page === 0, 'Earlier'); }
  await press(t, 'picker-entry-0'); await screen(t, 'lantern');
  await focusIs(t, 'lantern-begin', 'the Lantern Procession'); await audit(t, 'lantern');
  await press(t, 'lantern-star'); await snapUntil(t, s => s.stories.lantern.costume === 1, 'Stargazer cape'); await audit(t, 'lantern-stargazer-cape');
  await press(t, 'lantern-starLantern'); await snapUntil(t, s => s.stories.lantern.lantern === 1, 'Star lantern'); await audit(t, 'lantern-star-lantern');
  await press(t, 'lantern-begin'); await snapUntil(t, s => s.stories.lantern.active, 'Begin');
  await focusIs(t, 'lantern-walk', 'Begin (the lanterns)'); await audit(t, 'lantern-active');
  await press(t, 'lantern-stories'); await screen(t, 'picker');
  await snapUntil(t, s => s.data.voting_places === 'ready' && s.data.power_place === 'ready', 'the picker loads both place files');
  await press(t, 'picker-entry-1'); await screen(t, 'election');
  await focusIs(t, 'election-begin', 'the Election Walk'); await audit(t, 'election');
  await press(t, 'election-boeddeker'); await snapUntil(t, s => s.stories.election.selected === 1, 'Boeddeker'); await audit(t, 'election-boeddeker');
  await press(t, 'election-cool'); await snapUntil(t, s => s.stories.election.palette === 1, 'Cool paper'); await audit(t, 'election-cool-paper');
  await press(t, 'election-begin'); await snapUntil(t, s => s.stories.election.active, 'Begin walk');
  await focusIs(t, 'election-walk', 'Begin walk'); await audit(t, 'election-active');
  await closing(t, () => page.keyboard.press('Escape'), 'Escape on the Election Walk');
  await focusIs(t, 'story-entry', 'Escape on an episode (focus back on the entry that opened the chain)');

  // The visit cards: surprises new and found, the museum, the park, So What, an eatery guide and order, and the tour.
  await press(t, 'journal-button'); await until(page, () => !!document.querySelector('#modal[open] #notes-spot'), null, `${w.name}: Field notes shows #notes-spot`);
  const found = (await page.evaluate(() => window.H.state().surprises)).length;
  await press(t, 'notes-spot'); await screen(t, 'card');
  await poll(async () => (await page.evaluate(() => window.H.state().surprises)).length === found + 1, `${w.name}: Spot Surprise finds one surprise`);
  const written = await page.evaluate(() => JSON.parse(window.H.writes.at(-1) ?? '{}').discovered_surprises ?? null);
  t.note('screens', { find: 'notes-spot', discovered_surprises: written });
  if (!Array.isArray(written) || written.length !== found + 1) t.fail('screens', `${w.name}: the find was not written as discovered_surprises (${JSON.stringify(written)})`);
  await focusIs(t, 'card-spot', 'a surprise card'); await audit(t, 'card-surprise-new');
  await press(t, 'card-spot'); await poll(async () => (await page.evaluate(() => window.H.state().surprises)).length === found + 2, `${w.name}: the card's Spot Surprise finds the next`);
  await audit(t, 'card-surprise-new-2');
  await closing(t, () => press(t, 'card-back'), 'Back on a surprise card'); await focusIs(t, 'journal-button', 'Back on a card from Field notes');
  const seen = (await page.evaluate(() => window.H.state().surprises))[0];
  await tapObject(t, `surprise:${seen}`); await screen(t, 'card');
  await textIs(t, '#modal-body #modal-title', SURPRISES[seen].title, `a found surprise's card (${seen}) is titled without the find`, 'screens');
  await audit(t, 'card-surprise-found');
  await closing(t, () => press(t, 'card-back'), 'Back on a card from a map tap'); await focusIs(t, 'world', 'Back on a card opened by a map tap');
  await press(t, 'journal-button'); await until(page, () => !!document.querySelector('#modal[open] #notes-museum'), null, `${w.name}: Field notes shows #notes-museum`);
  await press(t, 'notes-museum'); await screen(t, 'card');
  await focusIs(t, 'card-next-era', 'the museum card'); await audit(t, 'card-museum');
  await press(t, 'card-next-era'); await snapUntil(t, s => s.world.tour.museumStep === 2, 'Next era'); await audit(t, 'card-museum-next-era');
  await closing(t, () => press(t, 'card-back'), 'Back on the museum card');
  for (const [id, label] of [['park', 'card-boeddeker-park'], ['so_what', 'card-so-what-awning'], ['so_what_floor', 'card-so-what-8th-floor']]) {
    await tapObject(t, id); await screen(t, 'card'); await audit(t, label);
    await closing(t, () => press(t, 'card-back'), `Back on ${label}`);
  }
  await press(t, 'journal-button'); await until(page, () => !!document.querySelector('#modal[open] #notes-eateries'), null, `${w.name}: Field notes shows #notes-eateries`);
  await press(t, 'notes-eateries'); await screen(t, 'card');
  await focusIs(t, 'card-order', 'an eatery card'); await audit(t, 'card-eatery-guide');
  const guide = (await snap(t)).world.tour.eateryGuide;
  await press(t, 'card-order'); await snapUntil(t, s => Object.values(s.world.tour.orders).some(n => n > 0), 'the first order'); await audit(t, 'card-eatery-order');
  await press(t, 'card-eateries'); await snapUntil(t, s => s.world.tour.eateryGuide !== guide, 'Visit Eateries guides to the next'); await audit(t, 'card-eatery-next');
  await closing(t, () => press(t, 'card-back'), 'Back on the eatery card');
  await page.evaluate(raw => window.H.seed(raw), TOUR_SAVE);
  await until(page, () => !!window.H.object('tour-marker'), null, `${w.name}: all ten found, the tour's gold marker is a map object`);
  await tapObject(t, 'tour-marker'); await screen(t, 'card'); await audit(t, 'card-tour-stop');
  await press(t, 'card-tour'); await snapUntil(t, s => s.world.tour.eras.length === 2, "the card's tour button visits the next stop"); await audit(t, 'card-tour-next-stop');
  await closing(t, () => press(t, 'card-back'), 'Back on the tour card');
  const missed = PRESSED_PAIRS.filter(pair => !pair.some(id => t.pressedSeen.has(id)));
  for (const pair of missed) t.fail('screens', `${w.name}: no audit saw ${pair.join(' / ')} with one of them pressed`);
}

// ---------- Flow B: one gesture is one press, rapid controls take both, held keys (check 3) ----------
async function gesturesFlow(t) {
  const { page, w } = t;
  await page.evaluate(() => window.H.startup()); await press(t, 'before-entry'); await screen(t, 'before');
  await once(t, 'before-gust', { check: s => s.before.view === 1, what: 'view 2 of 3' });
  await held(t, 'before-gust', { reach: 'before-shapes', check: s => s.before.view === 2 && s.before.observation === -1, what: 'one view more and Changing shapes not chosen' });
  await holdEscape(t, () => page.evaluate(() => !!document.querySelector('#modal[open] [data-chapter-card] #begin')), 'Before closes and the startup card it returns to stays');
  await closing(t, () => press(t, 'begin'), 'Start exploring');
  // Cook & Share: one gesture on the preparation is one step, a held Enter one more; then three cooks revealed for Previous/Next.
  await press(t, 'meal-entry'); await screen(t, 'meal');
  await once(t, 'meal-prepare', { check: s => s.meal.steps[0] === 1, what: 'one preparation step' });
  await held(t, 'meal-prepare', { check: s => s.meal.steps[0] === 2, what: 'one more step' });
  for (let step = 3; step <= 5; step++) { await press(t, 'meal-prepare'); await snapUntil(t, s => s.meal.steps[0] === step, `step ${step}`); }
  await press(t, 'meal-share'); await snapUntil(t, s => !!s.meal.shared[0], 'the first dish shared');
  await press(t, 'meal-share'); await snapUntil(t, s => s.meal.selected === 1, 'the invitation followed');
  for (let step = 1; step <= 5; step++) { await press(t, 'meal-prepare'); await snapUntil(t, s => s.meal.steps[1] === step, `cook 2 step ${step}`); }
  await press(t, 'meal-share'); await snapUntil(t, s => s.meal.revealed === 3 && s.meal.selected === 1, 'three cooks revealed');
  await once(t, 'meal-next', { rapid: true, check: (s, b) => s.meal.selected === (b.meal.selected + 2) % 3, what: 'two cooks on (of three)' });
  await once(t, 'meal-previous', { rapid: true, check: (s, b) => s.meal.selected === (b.meal.selected + 1) % 3, what: 'two cooks back (of three)' });
  await closing(t, () => press(t, 'meal-explore'), 'Keep exploring');
  // Power Story: the pads take both presses; a held Enter on Check path checks once and never presses the next relay's tab.
  await press(t, 'story-entry'); await screen(t, 'power');
  await press(t, 'power-tab-0'); await snapUntil(t, s => !s.stories.power.historical, 'Festival');
  await press(t, 'power-begin'); await snapUntil(t, s => s.stories.power.active, 'the festival story begins');
  await walked(t, 'power-walk', 'power');
  await focusIs(t, 'power-pad-0', 'arriving at the relay'); await audit(t, 'power-at-relay');
  const turn = (await snap(t)).stories.power.turns[0][0];
  await once(t, 'power-pad-0', { rapid: true, check: s => s.stories.power.turns[0][0] === (turn + 2) % 4, what: 'two quarter turns' });
  await solve(t);
  await held(t, 'power-check', { reach: 'power-tab-1', check: s => s.stories.power.restored === 1 && s.stories.power.station === 0, what: 'relay 1 restored once and Relay 2 not chosen' });
  await audit(t, 'power-relay-restored');
  // The picker's Later is marked rapid, but one press reaches the last page and disables it (Godot's two-page picker), so its second
  // press always meets a disabled control, which the guard swallows: one page turn is all a gesture can do.
  await press(t, 'power-more'); await screen(t, 'picker');
  if ((await snap(t)).stories.picker.page !== 0) { await press(t, 'picker-earlier'); await snapUntil(t, s => s.stories.picker.page === 0, 'Earlier'); }
  const later = await once(t, 'picker-later', { check: s => s.stories.picker.page === 1, what: 'one page (Later is disabled on the last page)' });
  if (!later.marked) t.fail('gestures', `${w.name} #picker-later: Godot marks Later rapid, the button has no data-rapid`);
  // Two Dogs Home: one gesture on SFACC info shows it (a second press would hide it); held Enter on Walk to lead and Match dog.
  await press(t, 'picker-entry-3'); await screen(t, 'dogs');
  await once(t, 'dogs-info', { check: s => s.stories.dogs.infoView === true, what: 'the SFACC note shown' });
  await press(t, 'dogs-info'); await snapUntil(t, s => !s.stories.dogs.infoView, 'SFACC info hides');
  await press(t, 'dogs-begin'); await snapUntil(t, s => s.stories.dogs.active, 'Begin search');
  await press(t, 'dogs-lead0'); await snapUntil(t, s => s.stories.dogs.lead === 0, 'the first lead');
  await held(t, 'dogs-walk', { reach: 'dogs-match', arrive: true, check: s => s.stories.dogs.open && s.stories.dogs.found === 0, what: 'the walk arrives and Match dog is not pressed' });
  await audit(t, 'dogs-at-lead');
  await held(t, 'dogs-match', { check: s => s.stories.dogs.found === 1, what: 'Pippin matched once' });
  const reader = await page.locator('#visits-reader').innerText();
  if (reader.includes(DOG_ALREADY)) t.fail('gestures', `${w.name}: a held Enter on #dogs-match matched twice ("${DOG_ALREADY}")`);
  // A music toggle that resolves after Back draws nothing.
  await page.evaluate(() => window.H.holdMusic());
  const calls = await page.evaluate(() => window.H.musicCalls);
  await press(t, 'dogs-music'); await until(page, n => window.H.musicCalls > n, calls, `${w.name}: #dogs-music asks for the music`);
  await closing(t, () => press(t, 'dogs-back'), 'Back on Two Dogs Home while the music toggle waits');
  const quiet = await page.evaluate(() => ({ shows: window.H.shows.length, statuses: window.H.statuses.length, toasts: window.H.toasts.length, settled: window.H.musicSettled }));
  await page.evaluate(() => window.H.releaseMusic());
  await until(page, n => window.H.musicSettled > n, quiet.settled, `${w.name}: the music toggle resolves`);
  await sleep(300);
  const after = await page.evaluate(() => ({ open: document.getElementById('modal').open, shows: window.H.shows.length, statuses: window.H.statuses.length, toasts: window.H.toasts.length }));
  t.note('gestures', { musicAfterBack: 'dogs-music', before: quiet, after });
  if (after.open || after.shows !== quiet.shows || after.statuses !== quiet.statuses || after.toasts !== quiet.toasts) t.fail('gestures', `${w.name}: a music toggle that resolved after Back drew or said something (${JSON.stringify({ quiet, after })})`);
  // The Lantern Procession: a held Enter on Walk to assembly arrives and never presses Gather.
  await press(t, 'story-entry'); await screen(t, 'dogs');
  await press(t, 'dogs-stories'); await screen(t, 'picker');
  if ((await snap(t)).stories.picker.page !== 0) { await press(t, 'picker-earlier'); await snapUntil(t, s => s.stories.picker.page === 0, 'Earlier'); }
  await press(t, 'picker-entry-0'); await screen(t, 'lantern');
  await press(t, 'lantern-begin'); await snapUntil(t, s => s.stories.lantern.active, 'Begin');
  await held(t, 'lantern-walk', { reach: 'lantern-advance', arrive: true, check: s => s.stories.lantern.open && s.stories.lantern.phase === 0, what: 'the walk arrives and Gather is not pressed' });
  await audit(t, 'lantern-at-assembly');
  // The Election Walk: a held Enter on Record site records once and never chooses the other site; then the pins and the labels.
  await press(t, 'lantern-stories'); await screen(t, 'picker');
  await snapUntil(t, s => s.data.voting_places === 'ready' && s.data.power_place === 'ready', 'both place files load');
  await press(t, 'picker-entry-1'); await screen(t, 'election');
  await press(t, 'election-begin'); await snapUntil(t, s => s.stories.election.active, 'Begin walk');
  await walked(t, 'election-walk', 'election');
  await held(t, 'election-record', { reach: 'election-boeddeker', check: s => s.stories.election.observed === 1 && s.stories.election.selected === 0, what: 'Cadillac recorded once and Boeddeker not chosen' });
  await press(t, 'election-boeddeker'); await snapUntil(t, s => s.stories.election.selected === 1, 'Boeddeker');
  await walked(t, 'election-walk', 'election');
  await press(t, 'election-record'); await snapUntil(t, s => s.stories.election.observed === 3, 'both sites recorded');
  await press(t, 'election-make'); await snapUntil(t, s => s.stories.election.phase === 2, 'Make map'); await audit(t, 'election-map-pins');
  await press(t, 'election-cadillac'); await snapUntil(t, s => s.stories.election.selected === 0, 'Cadillac');
  await press(t, 'election-pin-0'); await snapUntil(t, s => s.stories.election.placed === 1, 'the first label');
  await press(t, 'election-boeddeker'); await snapUntil(t, s => s.stories.election.selected === 1, 'Boeddeker');
  await press(t, 'election-pin-1'); await snapUntil(t, s => s.stories.election.placed === 3, 'both labels'); await audit(t, 'election-map-labels');
  // A held Escape on the picker opened from the Election Walk goes back to the walk, and the walk stays.
  await press(t, 'election-stories'); await screen(t, 'picker');
  await holdEscape(t, () => page.evaluate(() => document.querySelector('#modal[open] section.visits')?.dataset.visits === 'election' && window.H.visits.holds()), 'Back to stories reopens the Election Walk, which stays');
  await closing(t, () => page.keyboard.press('Escape'), 'Escape on the Election Walk');
  // The museum card: one gesture on Next era is one era.
  await press(t, 'journal-button'); await until(page, () => !!document.querySelector('#modal[open] #notes-museum'), null, `${w.name}: Field notes shows #notes-museum`);
  await press(t, 'notes-museum'); await screen(t, 'card');
  const step = (await snap(t)).world.tour.museumStep;
  await once(t, 'card-next-era', { check: s => s.world.tour.museumStep === (step + 1) % 4, what: 'one era' });
  await closing(t, () => press(t, 'card-back'), 'Back on the museum card');
  for (const p of await problems(t)) t.fail('gestures', `${w.name} gestures: ${p}`);
}

// ---------- Flow C: replaced screens draw nothing; × and the next open (check 4) ----------
async function replaceFlow(t) {
  const { page, w } = t;
  // A place file that arrives after the recovery offer replaced the picker draws nothing.
  await page.evaluate(() => window.H.holdLoad());
  await press(t, 'story-entry'); await screen(t, 'power');
  await press(t, 'power-more'); await screen(t, 'picker');
  await textIs(t, '#modal-status', VISITS_FORK_TEXT.loading, 'the picker waits for its place files');
  await page.evaluate(() => window.H.recovery());
  await until(page, () => !!document.querySelector('#modal[open] [data-recovery]'), null, `${w.name}: the recovery offer replaces the picker`);
  const shows = await page.evaluate(() => window.H.shows.length);
  await page.evaluate(() => window.H.releaseLoad());
  await snapUntil(t, s => s.data.power_place === 'ready' && s.data.voting_places === 'ready', 'the held place files load');
  await sleep(300);
  let now = await page.evaluate(() => ({ recovery: !!document.querySelector('#modal[open] [data-recovery]'), holds: window.H.visits.holds(), shows: window.H.shows.length }));
  t.note('focus', { replaced: 'picker by the recovery offer, then the place files loaded', ...now, showsBefore: shows });
  if (!now.recovery || now.holds || now.shows !== shows) t.fail('focus', `${w.name}: the place files that loaded after the recovery offer replaced the picker drew over it (${JSON.stringify(now)})`);
  // × on the offer, then Story opens the hub again (the × close cleared the visit's open flags).
  await closing(t, () => press(t, 'close-modal'), '× on the recovery offer');
  await press(t, 'story-entry'); await screen(t, 'power');
  // A music toggle that resolves after the recovery offer replaced the hub draws nothing.
  await page.evaluate(() => window.H.holdMusic());
  const calls = await page.evaluate(() => window.H.musicCalls);
  await press(t, 'power-music'); await until(page, n => window.H.musicCalls > n, calls, `${w.name}: #power-music asks for the music`);
  await page.evaluate(() => window.H.recovery());
  const quiet = await page.evaluate(() => ({ shows: window.H.shows.length, statuses: window.H.statuses.length, settled: window.H.musicSettled }));
  await page.evaluate(() => window.H.releaseMusic());
  await until(page, n => window.H.musicSettled > n, quiet.settled, `${w.name}: the music toggle resolves`);
  await sleep(300);
  now = await page.evaluate(() => ({ recovery: !!document.querySelector('#modal[open] [data-recovery]'), holds: window.H.visits.holds(), shows: window.H.shows.length, statuses: window.H.statuses.length }));
  t.note('focus', { replaced: 'the hub by the recovery offer, then the music toggle resolved', ...now, before: quiet });
  if (!now.recovery || now.holds || now.shows !== quiet.shows || now.statuses !== quiet.statuses) t.fail('focus', `${w.name}: a music toggle that resolved after the recovery offer replaced the hub drew or said something (${JSON.stringify(now)})`);
  await closing(t, () => press(t, 'close-modal'), '× on the recovery offer');
  await press(t, 'story-entry'); await screen(t, 'power');
  await closing(t, () => press(t, 'power-back'), 'Back on the hub');
  await focusIs(t, 'story-entry', 'Back on the stories hub');
  for (const p of await problems(t)) t.fail('focus', `${w.name} replace: ${p}`);
}

// ---------- Flow D: the map with the visits scene (check 5) ----------
async function scenery(t, on) {
  await t.page.evaluate(on => { document.body.classList.toggle('scene', on); window.H.reduced = on; if (on) document.activeElement?.blur?.(); }, on);
}
// One full-viewport screenshot of the map at a point and scale (or the route overview), with that frame's label chips.
async function shot(t, name, at, scale) {
  const { page, w } = t;
  await scenery(t, true);
  const camera = await page.evaluate(([at, scale]) => { if (at === 'overview') window.H.overview(); else window.H.look(at, scale); return window.H.camera(); }, [at, scale]);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const chips = await page.evaluate(() => window.H.chips());
  const file = path.join(out, `${w.name}-scene-${name}.png`);
  await page.screenshot({ path: file });
  results.screenshots.scenes.push(file);
  t.note('scenes', { scene: name, camera, chips: chips.chips.map(c => c.text), overlaps: chips.overlaps, lowContrast: chips.lowContrast, screenshot: path.basename(file) });
  // Chips that only touch (an overlap under 3 px tall) are left in the evidence; the rest are findings for the reviewer.
  for (const o of chips.overlaps.filter(o => o.height >= 3)) results.findings.push(`${w.name} scene ${name}: the chips "${o.a}" and "${o.b}" overlap (${o.area} px², ${o.height} px tall)`);
  for (const c of chips.lowContrast) results.findings.push(`${w.name} scene ${name}: the chip "${c.text}" is ${c.ratio}:1 (${c.fill} on #0d171f)`);
  for (const p of await problems(t)) t.fail('scenes', `${w.name} scene ${name}: ${p}`);
  await scenery(t, false);
  return { camera, chips };
}
async function scenesFlow(t) {
  const { page, w } = t, wide = w.name === '1440';
  await page.evaluate(raw => window.H.seed(raw), SCENE_SAVE);
  // An open block with four surprises found; Cook & Share with four dishes in both servings and placements; three counters open;
  // the museum on its second era.
  await press(t, 'meal-entry'); await screen(t, 'meal');
  for (const [cook, serving, placement] of [[0, 0, 0], [1, 1, 0], [2, 0, 1], [3, 1, 1]]) {
    await snapUntil(t, s => s.meal.selected === cook, `cook ${cook + 1} is selected`);
    if (serving) { await press(t, 'meal-serving-1'); await snapUntil(t, s => s.meal.servings[cook] === 1, 'Tasting plates'); }
    if (placement) { await press(t, 'meal-placement-1'); await snapUntil(t, s => s.meal.placements[cook] === 1, 'Other edge'); }
    for (let step = 1; step <= 5; step++) { await press(t, 'meal-prepare'); await snapUntil(t, s => s.meal.steps[cook] === step, `cook ${cook + 1} step ${step}`); }
    await press(t, 'meal-share'); await snapUntil(t, s => !!s.meal.shared[cook], `cook ${cook + 1} shares`);
    if (cook < 3) await press(t, 'meal-share');
  }
  await closing(t, () => press(t, 'meal-explore'), 'Keep exploring');
  await page.evaluate(() => { for (const i of [1, 2, 4]) window.H.interact(`eatery:${i}`); window.H.interact('museum'); window.H.interact('museum'); });
  await screen(t, 'card'); await closing(t, () => press(t, 'card-back'), 'Back on the visit card');
  await snapUntil(t, s => s.world.tour.counters.length === 3 && s.world.tour.museumStep === 2, 'three counters open and the second era');
  const dishes = (await page.evaluate(() => window.H.scene().dishes)).length;
  if (dishes !== 4) t.fail('scenes', `${w.name}: four shared dishes, the scene has ${dishes}`);
  await shot(t, 'surprises-taylor-turk', { x: -140, y: -110 }, 0.85);
  await shot(t, 'surprises-eddy-leavenworth', { x: -1330, y: -520 }, 0.85);
  await shot(t, 'museum-portal', P.MUSEUM, 1.6);
  await shot(t, 'boeddeker-park', P.PARK_VIEW, wide ? 1 : 0.85);
  await shot(t, 'so-what', P.SO_WHAT_VIEW, 0.85);
  for (let i = 0; i < 6; i++) await shot(t, `eatery-${i + 1}-${MAIN.NEIGHBORHOOD_EATERIES[i].id}`, P.EATERY_COUNTERS[i], 1.2);
  if (wide) await shot(t, 'eateries-overview', { x: -957, y: -212 }, 0.45);
  await shot(t, 'shared-dishes', { x: 362, y: 8 }, 1.6);
  if (wide) await shot(t, 'route-overview', 'overview');
  // The beacons: each found one in its accent, each unfound one darkened 28% (sprites.js beaconActors), read off the canvas at the
  // centre of the beacon's head with the overlay held back; then whatever label chip covers that head is a finding.
  await scenery(t, true);
  for (const m of await page.evaluate(() => window.H.scene().surprises.map(m => ({ id: m.id, x: m.x, y: m.y, accent: m.accent, found: m.found })))) {
    const seen = await page.evaluate(m => {
      const head = { x: m.x, y: m.y - 38 };
      window.H.hideOverlay = true; window.H.look(head, 1.6); const bare = window.H.pixel(head);
      window.H.hideOverlay = false; const p = window.H.look(head, 1.6), shown = window.H.pixel(head);
      const covers = window.H.chips().chips.filter(c => p.x >= c.box[0] && p.x <= c.box[2] && p.y >= c.box[1] && p.y <= c.box[3]).map(c => c.text);
      return { bare, shown, covers };
    }, m);
    const want = hexRgb(m.found ? m.accent : darken(m.accent, 0.28)), off = Math.max(...seen.bare.map((c, i) => Math.abs(c - want[i])));
    t.note('scenes', { beacon: m.id, found: m.found, drawn: rgbHex(seen.bare), expected: rgbHex(want), withLabels: rgbHex(seen.shown), coveredBy: seen.covers });
    if (off > 8) t.fail('scenes', `${w.name}: the ${m.found ? 'found' : 'unfound'} beacon of ${m.id} is drawn ${rgbHex(seen.bare)}, not ${rgbHex(want)}`);
    if (seen.covers.length) results.findings.push(`${w.name}: at the 1.6 zoom the ${m.found ? 'found' : 'unfound'} beacon of ${m.id} is covered by the chip${seen.covers.length > 1 ? 's' : ''} ${seen.covers.map(c => `"${c}"`).join(', ')}`);
  }
  const daylight = await page.evaluate(() => { window.H.look({ x: 320, y: 10 }, 1.1); return window.H.luminance(); });
  await scenery(t, false);
  // Power Story at the festival: two relays back on under the after-dark overlay, then all three with the warm pools.
  await press(t, 'story-entry'); await screen(t, 'power');
  await press(t, 'power-tab-0'); await snapUntil(t, s => !s.stories.power.historical, 'Festival');
  await press(t, 'power-begin'); await snapUntil(t, s => s.stories.power.active, 'the festival story begins');
  for (const station of [0, 1, 2]) {
    if (station) { await press(t, `power-tab-${station}`); await snapUntil(t, s => s.stories.power.station === station, `Relay ${station + 1}`); }
    await walked(t, 'power-walk', 'power'); await solve(t);
    await press(t, 'power-check'); await snapUntil(t, s => (s.stories.power.restored & (1 << station)) !== 0, `relay ${station + 1} restored`);
    if (station === 1) {
      await closing(t, () => press(t, 'power-back'), 'Back on Power Story');
      await shot(t, 'power-festival-two-relays', { x: 320, y: 10 }, 1.1);
      const dark = await page.evaluate(() => { window.H.look({ x: 320, y: 10 }, 1.1); return window.H.luminance(); });
      t.note('scenes', { afterDark: { daylight: +daylight.toFixed(1), festival: +dark.toFixed(1) } });
      if (!(dark < daylight * 0.8)) t.fail('scenes', `${w.name}: the festival's after-dark overlay does not darken the map (mean luminance ${daylight.toFixed(1)} by day, ${dark.toFixed(1)} at the festival)`);
      await press(t, 'story-entry'); await screen(t, 'power');
    }
  }
  await closing(t, () => press(t, 'power-back'), 'Back on Power Story');
  await shot(t, 'power-festival-restored', { x: 320, y: 10 }, 1.1);
  // The Larkin place: its battery stand lit at the junction.
  await press(t, 'story-entry'); await screen(t, 'power');
  await press(t, 'power-end'); await snapUntil(t, s => !s.stories.power.active, 'End story');
  await press(t, 'power-tab-1'); await snapUntil(t, s => s.stories.power.historical && s.data.power_place === 'ready', 'Larkin 2017 with its place file');
  await press(t, 'power-begin'); await snapUntil(t, s => s.stories.power.active, 'the Larkin story begins');
  await walked(t, 'power-walk', 'power'); await solve(t);
  await press(t, 'power-check'); await snapUntil(t, s => (s.stories.power.restored & 1) !== 0, 'the battery stand lit');
  await closing(t, () => press(t, 'power-back'), 'Back on Power Story');
  await shot(t, 'power-larkin-battery', P.LARKIN_JUNCTION, 1.2);
  await press(t, 'story-entry'); await screen(t, 'power');
  await press(t, 'power-end'); await snapUntil(t, s => !s.stories.power.active, 'End story');
  // Two Dogs Home: the dogs at their search sites, then the owners and dogs at the gathering after the reunion.
  await press(t, 'power-more'); await screen(t, 'picker');
  if ((await snap(t)).stories.picker.page !== 1) { await press(t, 'picker-later'); await snapUntil(t, s => s.stories.picker.page === 1, 'Later'); }
  await press(t, 'picker-entry-3'); await screen(t, 'dogs');
  await press(t, 'dogs-begin'); await snapUntil(t, s => s.stories.dogs.active, 'Begin search');
  await closing(t, () => press(t, 'dogs-back'), 'Back on Two Dogs Home');
  await shot(t, 'dogs-search-history-stop', P.DOG_SEARCH[0], 1.4);
  await shot(t, 'dogs-search-hyde', P.DOG_SEARCH[1], 1.4);
  await press(t, 'story-entry'); await screen(t, 'dogs');
  for (const [profile, lead] of [[0, 0], [1, 1], [null, 2]]) {
    if (profile === 1) { await press(t, 'dogs-junebug'); await snapUntil(t, s => s.stories.dogs.profile === 1, 'Junebug'); }
    await press(t, `dogs-lead${lead}`); await snapUntil(t, s => s.stories.dogs.lead === lead, `lead ${lead + 1}`);
    await walked(t, 'dogs-walk', 'dogs');
    await press(t, 'dogs-match'); await snapUntil(t, s => (lead === 2 ? s.stories.dogs.won : (s.stories.dogs.found & (1 << lead)) !== 0), lead === 2 ? 'the reunion' : `dog ${lead + 1} matched`);
  }
  await closing(t, () => press(t, 'dogs-back'), 'Back on Two Dogs Home');
  await shot(t, 'dogs-reunion', { x: 378, y: -8 }, wide ? 1.2 : 0.85);
  // The Lantern Procession, followed from the reunion's invitation: the march ticks its progress frame by frame.
  await press(t, 'story-entry'); await screen(t, 'dogs');
  await press(t, 'dogs-stories'); await screen(t, 'picker');
  await press(t, 'picker-follow'); await screen(t, 'lantern');
  await press(t, 'lantern-begin'); await snapUntil(t, s => s.stories.lantern.active, 'Begin');
  await walked(t, 'lantern-walk', 'lantern');
  await press(t, 'lantern-advance'); await snapUntil(t, s => s.stories.lantern.phase === 1, 'Gather');
  await page.evaluate(() => { window.H.speed = 6; window.H.ticks = []; });
  await walked(t, 'lantern-walk', 'lantern');
  const ticks = await page.evaluate(() => { window.H.speed = 400; return window.H.ticks.slice(); });
  t.note('scenes', { lanternProgress: ticks.map(v => +v.toFixed(2)) });
  if (ticks.length < 2 || !ticks.slice(1).every((v, i) => v >= ticks[i]) || !(ticks[0] < 35)) t.fail('scenes', `${w.name}: the march did not raise the lantern progress frame by frame (${ticks.map(v => v.toFixed(1)).join(', ')})`);
  await press(t, 'lantern-advance'); await snapUntil(t, s => s.stories.lantern.won, 'Welcome');
  await closing(t, () => press(t, 'lantern-back'), 'Back on the Lantern Procession');
  await shot(t, 'lantern-group', { x: 342, y: 25 }, 1.4);
  // The Election Walk to both sites and home: the paper folio at the player.
  await press(t, 'story-entry'); await screen(t, 'lantern');
  await press(t, 'lantern-stories'); await screen(t, 'picker');
  await snapUntil(t, s => s.data.voting_places === 'ready' && s.data.power_place === 'ready', 'both place files load');
  if ((await snap(t)).stories.picker.page !== 0) { await press(t, 'picker-earlier'); await snapUntil(t, s => s.stories.picker.page === 0, 'Earlier'); }
  await press(t, 'picker-entry-1'); await screen(t, 'election');
  await press(t, 'election-begin'); await snapUntil(t, s => s.stories.election.active, 'Begin walk');
  for (const site of [0, 1]) {
    if (site) { await press(t, 'election-boeddeker'); await snapUntil(t, s => s.stories.election.selected === 1, 'Boeddeker'); }
    await walked(t, 'election-walk', 'election');
    await press(t, 'election-record'); await snapUntil(t, s => (s.stories.election.observed & (1 << site)) !== 0, `site ${site + 1} recorded`);
  }
  await press(t, 'election-make'); await snapUntil(t, s => s.stories.election.phase === 2, 'Make map');
  for (const site of [0, 1]) {
    await press(t, site ? 'election-boeddeker' : 'election-cadillac'); await snapUntil(t, s => s.stories.election.selected === site, 'the site');
    await press(t, `election-pin-${site}`); await snapUntil(t, s => (s.stories.election.placed & (1 << site)) !== 0, `label ${site + 1} placed`);
  }
  await walked(t, 'election-walk', 'election');
  await press(t, 'election-share'); await snapUntil(t, s => s.stories.election.won, 'Share map');
  await closing(t, () => press(t, 'election-back'), 'Back on the Election Walk');
  await shot(t, 'election-folio', await page.evaluate(() => window.H.state().player), 1.6);
  // The landmark tour after all ten finds: the four museum eras visited, the gold marker on the next stop (the park).
  await page.evaluate(raw => window.H.seed(raw), TOUR_SAVE);
  await until(page, () => !!window.H.object('tour-marker'), null, `${w.name}: the tour's gold marker`);
  await page.evaluate(() => { window.H.interact('tour-marker'); });
  await screen(t, 'card');
  for (let era = 2; era <= 4; era++) { await press(t, 'card-tour'); await snapUntil(t, s => s.world.tour.eras.length === era, `museum era ${era}`); }
  await closing(t, () => press(t, 'card-back'), 'Back on the tour card');
  const marker = await page.evaluate(() => window.H.scene().tourMarker);
  if (!marker) throw Error('the tour scene has no gold marker');
  await shot(t, 'tour-marker', marker, 1);
  await scenery(t, true);
  const gold = await page.evaluate(m => { window.H.look(m, 1); const s = 30, y = m.y - 70 - 0.5 * s; return window.H.pixel({ x: m.x, y: y - 0.15 * s }); }, marker);
  await scenery(t, false);
  t.note('scenes', { tourMarker: marker, drawn: rgbHex(gold), expected: '#ffd25a' });
  if (Math.max(...gold.map((c, i) => Math.abs(c - hexRgb('#ffd25a')[i]))) > 8) t.fail('scenes', `${w.name}: the tour's gold marker is drawn ${rgbHex(gold)}, not #ffd25a`);
  if (wide) await shot(t, 'route-overview-all-found', 'overview');
}

// ---------- Where each sprite stands against the drawn street (world.js: 76 px carriageway, sidewalk to 58 px) ----------
async function placement() {
  const data = JSON.parse(await readFile(path.join(root, 'browser-next', 'data', 'streets.osm.json'), 'utf8')), ways = data.ways.map(way => ({ ...way, points: way.geometry.map(project) }));
  const nearest = p => ways.reduce((best, way) => { const d = streetDistance(p, [way]); return d < best.d ? { d, street: way.name } : best; }, { d: Infinity, street: '' });
  const E = MAIN.NEIGHBORHOOD_EATERIES;
  const sites = [
    ...SURPRISE_IDS.map(id => [`beacon ${id}`, P.SURPRISE_SITES[id]]), ...E.map((rec, i) => [`awning ${rec.id}`, P.EATERY_AWNINGS[i]]), ...E.map((rec, i) => [`counter ${rec.id}`, P.EATERY_COUNTERS[i]]),
    ['museum', P.MUSEUM], ['museum docent', P.MUSEUM_DOCENT], ['park entrance', P.PARK_ENTRANCE], ['So What awning', P.SO_WHAT_AWNING], ['So What 8th floor', P.SO_WHAT_LEAVENWORTH],
    ...P.RELAY_LAMPS.map((p, i) => [`relay lamp ${i + 1}`, p]), ['battery stand', P.BATTERY_STAND], ...P.DOG_SEARCH.map((p, i) => [`dog ${i + 1} search site`, p]),
    ...P.DOG_OWNERS.map((p, i) => [`dog owner ${i + 1}`, p]), ...P.LANTERN_ROUTE.map((p, i) => [`lantern route ${i ? 'end' : 'start'}`, p]),
  ];
  return sites.map(([site, p]) => { const { d, street } = nearest(p); return { site, x: +p.x.toFixed(1), y: +p.y.toFixed(1), street, offset: +d.toFixed(1), band: d < 38 ? 'carriageway' : d <= 58 ? 'sidewalk' : 'beyond the sidewalk' }; });
}

results.placement = await placement();
for (const name of ['power_place.json', 'voting_places.json']) {
  const [godot, fork] = await Promise.all([readFile(path.join(root, 'godot', 'data', name)), readFile(path.join(root, 'browser-next', 'data', name))]);
  results.data[name] = { served: `godot/data/${name}`, bytes: godot.length, sameAsBrowserNext: godot.equals(fork) };
}
// NEXT_VISITS_FLOWS=screens,gestures,replace,scenes runs a subset of the flows (screens also feeds labelInName and focus).
// A flow also notes into other groups (an audit inside the gestures flow, a map tap inside the screens flow), so every width has
// every group; a group that no selected flow owns and that nothing reached is reported as not run.
const FLOWS = (process.env.NEXT_VISITS_FLOWS || 'screens,gestures,replace,scenes').split(','), OWNS = { screens: ['screens', 'labelInName', 'focus'], gestures: ['gestures'], replace: ['focus'], scenes: ['scenes'] };
const owned = new Set(FLOWS.flatMap(flow => OWNS[flow] ?? []));
for (const w of WIDTHS) {
  results.checks[w.name] = Object.fromEntries(GROUPS.filter(g => g !== 'scenes' || w.scenes).map(g => [g, { ok: false, evidence: [], failures: [] }]));
  if (FLOWS.includes('screens')) await session(w, 'screens', 'screens', screensFlow);
  if (FLOWS.includes('gestures')) await session(w, 'gestures', 'gestures', gesturesFlow);
  if (FLOWS.includes('replace')) await session(w, 'replace', 'focus', replaceFlow);
  if (FLOWS.includes('scenes') && w.scenes) await session(w, 'scenes', 'scenes', scenesFlow);
}
await browser.close();
for (const [width, groups] of Object.entries(results.checks)) for (const [group, check] of Object.entries(groups)) {
  if (!check.evidence.length && !check.failures.length && !owned.has(group)) { check.ok = null; check.run = false; continue; }
  if (!check.evidence.length && !check.failures.length) check.failures.push(`${width} ${group}: no evidence was collected`);
  check.ok = check.failures.length === 0;
  results.failures.push(...check.failures);
}
results.ok = results.failures.length === 0;
results.finished = new Date().toISOString();
await writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(`\n${Object.entries(results.checks).map(([width, groups]) => `${width}: ${Object.entries(groups).map(([g, c]) => `${g} ${c.ok === null ? 'not run' : c.ok ? 'ok' : `FAILED (${c.failures.length})`}`).join(', ')}`).join('\n')}`);
console.log(`${results.screenshots.dialogs.length} screen and ${results.screenshots.scenes.length} scene screenshots, results in ${path.join(out, 'results.json')}`);
if (results.findings.length) console.log(`${results.findings.length} map findings (not failures), first: ${results.findings.slice(0, 3).join(' | ')}`);
if (!results.ok) { console.log(`${results.failures.length} failed:\n${results.failures.join('\n')}`); process.exit(1); }
console.log('all visits browser checks passed');
