// The ending's DOM renderer. It turns the pure view models of this folder into dialog screens and binds their buttons.
// It never touches game.js state: everything comes through `host`, and the visit lives in one in-memory object here.
//
// host = {
//   doc, win, modal,                 the document, its window and the <dialog id="modal">
//   getState(),                      the fork state (parseGodotSave's shape)
//   show(html), close(target), status(text), toast(text),   game.js show/close, #modal-status and the toast
//   stopWalk(), reducedMotion(),     stop the street walk before a surface opens; the Settings motion choice
//   chapterText(),                   the pending chapter announcement plus a space, consumed (story.js), or ''
//   act(action), sceneAdmission(nextState), saveReason(),   reducer dispatch; Godot's scene budget admission; '' or 'save full'
//   music: { label(), on(), toggle() },   Godot's Music: On/Off buttons inside ending dialogs; on() is playing or starting;
//                                    toggle() resolves to Godot's music announcement ('' when there is none)
//   settle,                          press-settle.js installPressSettle's result (tap)
//   filmButtonLabel(),               the text of #film-shoot without its arrow
//   openDraft(), openPosted(), openMural(),   the studio draft editor, the posted poster and the mural editor
// }
// Only Mural Stories' Palette is marked data-rapid, as Godot marks it (mural_stories.gd setup); press-settle.js guards the rest.
import { freshVisit, syncVisit } from './visit.js';
import { hostedView, followHosted, hostedClose } from './hosted.js';
import { gatherView, openGather, handoff, review, advance, backToPosted, gatherClose, gatherTitle } from './gather-again.js';
import { screeningView, screeningAvailable, screeningClose, screeningRefusal, civicOffer, civicFollow, civicClose } from './screening.js';
import { benchView, benchFocus, chooseForm, fitSupport, finish, benchClose, benchRefusal, habitatRefusal } from './bench.js';
import { roomView, normalizeRoom, chooseItem, choosePlace, assist, toggleDetail, roomFocus, roomClose, roomRefusal, orbitFailed, habitatAvailable } from './habitat.js';
import { orbitalView, openChapter, orbitAction, step, halt, moving, walkTo, recognition, depictedPlayer, depictedThanh, freshOrbit } from './orbital.js';
import { storiesView, selectScene, changePage, editScene, sceneRefusal, sceneReceipt, sceneAnnouncement, openStoriesAnnouncement, closeStoriesAnnouncement, freshStories, paintScenesLabel, nextPalette, paletteAnnouncement } from './mural.js';

const esc = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const lines = text => String(text).split('\n').map(line => `<p>${esc(line)}</p>`).join('');
const dataSVG = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
// Button label lines (Godot's "\n" in labels) become line breaks; the accessible name, when different, is aria-label. A view's
// rapid: true becomes data-rapid.
function btn(b) {
  if (!b || b.hidden) return '';
  const label = esc(b.label).replace(/\n/g, '<br>'), name = b.name && b.name !== b.label ? ` aria-label="${esc(b.name)}"` : '';
  const pressed = b.pressed === undefined ? '' : ` aria-pressed="${!!b.pressed}"`;
  return `<button id="${b.id}" class="${b.primary ? 'primary-button' : 'secondary-button'}"${pressed}${name}${b.disabled ? ' disabled' : ''}${b.title ? ` title="${esc(b.title)}"` : ''}${b.rapid ? ' data-rapid' : ''}>${label}</button>`;
}
const STYLE = `
.ending{display:grid;gap:10px;min-width:0}
.ending h2{white-space:pre-line}
.ending-credit{font-size:.8rem;margin:0}
.ending-picture{margin:0;min-width:0}
.ending-picture img,.ending-picture svg{display:block;width:100%;height:auto;max-height:52vh;object-fit:contain;border-radius:10px}
.ending-reader{max-height:34vh;overflow:auto;overscroll-behavior:contain;padding:6px 8px;border-radius:8px;outline-offset:2px}
.ending-reader p{margin:.35em 0}
.ending-tray{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:6px}
.ending-tray button{min-height:44px;min-width:44px;white-space:normal;overflow-wrap:anywhere}
.ending-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ending-cards button{min-height:44px}
.ending-labels{position:relative}
.ending-labels span{position:absolute;font-size:12px;color:#fff2d7;pointer-events:none;transform:translateY(2px)}
.ending-thumb{display:block;width:42px;height:44px;margin:0 auto}
.ending-paper{position:relative}
.ending-paper .ending-targets{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr}
.ending-paper .ending-targets button{min-height:44px;background:transparent;border:2px solid transparent;border-radius:8px;color:transparent}
.ending-paper .ending-targets button:focus-visible,.ending-paper .ending-targets button:hover{border-color:#294f44}
.ending-signature{display:block;width:100%;height:auto;max-height:32px}
@media (max-width:360px){.ending-cards{grid-template-columns:1fr}.ending-tray{grid-template-columns:1fr 1fr}}
`;

export function createEnding(host) {
  const { doc, win, modal } = host;
  let visit = freshVisit(host.getState()), stage = null, frame = 0, last = null, pointer = null;
  if (!doc.getElementById('ending-style')) { const style = doc.createElement('style'); style.id = 'ending-style'; style.textContent = STYLE; doc.head.append(style); }
  const $ = id => doc.getElementById(id);
  const state = () => host.getState();
  const bind = (id, fn) => $(id)?.addEventListener('click', fn);
  const focus = id => { const target = id === 'reader' ? $('ending-reader') : $(id); target?.focus({ preventScroll: true }); target?.scrollIntoView?.({ block: 'nearest' }); };
  const say = text => { if (text) host.status(text); };
  const target = id => $(id) || undefined;
  // A redraw that waits (for the music to start, for the next walk frame) only for the stage still on screen: the player may have
  // left it, or another screen, such as the recovery offer, may have replaced it in the same dialog.
  const holds = kind => stage === kind && modal.open && modal.contains($('ending-reader'));
  const musicButton = () => ({ id: 'ending-music', label: host.music.label() });
  // Godot toggle_music_playback announces, then refresh(false) redraws without announcing: the music line is the last word.
  const bindMusic = rerender => bind('ending-music', async () => { const kind = stage, said = await host.music.toggle(); if (!holds(kind)) return; rerender(); focus('ending-music'); say(said); });
  function frameHTML({ kind, title, credit, picture = '', reader, tray, extra = '' }) {
    return `<section class="ending" data-ending="${kind}"><p class="eyebrow ending-credit">${esc(credit)}</p><h2 id="modal-title" tabindex="-1">${esc(title)}</h2>${picture}<div id="ending-reader" class="ending-reader" tabindex="0" role="region" aria-label="Story text">${lines(reader)}</div>${extra}<div class="ending-tray">${tray}</div></section>`;
  }
  const img = (svg, alt, labels = '') => `<figure class="ending-picture${labels ? ' ending-labels' : ''}"><img alt="${esc(alt)}" src="${dataSVG(svg)}">${labels}</figure>`;
  // A repeated Enter or Space on the chained buttons never advances a second stage (spec §0.5; press-settle covers Enter).
  function noRepeat(ids) { for (const id of ids) $(id)?.addEventListener('keydown', e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }); }
  function leave(text, returnId) { stopLoop(); stage = null; host.close(target(returnId)); host.toast(text); }

  // ---------- 1. Hosted review and Bea's offer ----------
  function hosted(announce = true) {
    const s = state(), v = hostedView(s, visit.hostedSelected);
    stage = 'hosted';
    const cards = `<div class="ending-cards" role="group" aria-label="Hosted contributions">${v.cards.map(c => btn({ id: `hosted-card-${c.id}`, label: c.label, name: c.name, pressed: c.pressed })).join('')}</div>`;
    host.show(frameHTML({ kind: 'hosted', title: v.heading, credit: v.credit, picture: img(v.picture.svg, v.picture.alt), reader: v.text, extra: cards,
      tray: btn({ id: 'hosted-follow', label: v.primary.label, disabled: v.primary.disabled, primary: true }) + btn({ id: 'hosted-draft', label: v.view.label }) + btn(musicButton()) + btn({ id: 'hosted-back', label: v.back.label }) }));
    for (const c of v.cards) bind(`hosted-card-${c.id}`, () => { visit.hostedSelected = c.id; hosted(); focus(`hosted-card-${c.id}`); });
    bind('hosted-follow', () => {
      const out = followHosted(state(), host.chapterText());
      if (!out) return;
      leave(out.announce, 'civic-hour');
    });
    bind('hosted-draft', () => { stage = null; host.openDraft(); });
    bind('hosted-back', () => leave(hostedClose(state()), 'host-afternoon'));
    bindMusic(() => hosted(false));
    if (announce) say(v.announce);
  }
  // ---------- 2. Gather again ----------
  function gather(announce = null) {
    const s = state(), v = gatherView(visit.gather, s);
    stage = 'gather';
    host.show(frameHTML({ kind: 'gather', title: v.heading.split('\n')[0], credit: v.heading.split('\n')[1] || '', picture: `<figure class="ending-picture">${v.board}</figure>`, reader: v.text, tray: v.buttons.map(b => btn(b)).join('') }));
    const run = (fn) => () => { const out = fn(); visit.gather = out.gather; if (out.announce !== null) { gather(out.announce); focus(out.focus || 'reader'); } };
    bind('gather-choice-0', run(() => handoff(visit.gather, 0, state())));
    bind('gather-choice-1', run(() => handoff(visit.gather, 1, state())));
    bind('gather-previous', run(() => review(visit.gather, -1)));
    bind('gather-next', run(() => advance(visit.gather)));
    bind('gather-back', () => { const text = backToPosted(visit.gather); stage = null; host.openPosted(); say(text); });
    bind('gather-keep', () => leave(gatherClose(visit.gather), 'host-afternoon'));
    noRepeat(['gather-choice-0', 'gather-next']);
    say(announce ?? v.announce);
  }
  // ---------- 4. Screening ----------
  function screening(announce = true) {
    const s = state(), v = screeningView(s, visit.screenFrame);
    if (!v) return false;
    stage = 'screening';
    host.show(frameHTML({ kind: 'screening', title: v.title, credit: v.credit, picture: img(v.picture.svg, v.picture.alt), reader: v.text,
      tray: `<div class="ending-tray" role="group" aria-label="Screening frames">${v.frames.map(f => btn(f)).join('')}</div>` + btn(musicButton()) + btn({ id: 'screen-back', label: v.back.label }) + btn({ id: 'screen-helper', label: v.helper.label, primary: true }) }));
    v.frames.forEach((f, i) => bind(f.id, () => { visit.screenFrame = i; screening(); focus(f.id); }));
    bind('screen-back', () => leave(screeningClose(), 'film-shoot'));
    bind('screen-helper', () => { if (!bench()) screening(); });
    bindMusic(() => screening(false));
    if (announce) say(v.announce);
    return true;
  }
  // ---------- 5. Helper bench ----------
  function benchExtras() { return { habitatAvailable: habitatAvailable(state()), orbitCompleted: visit.orbit.completed, recognition: recognition(visit.orbit) }; }
  function bench(focusId = null) {
    const s = state();
    if (!screeningAvailable(s)) { say(benchRefusal()); return false; }
    const v = benchView(visit.bench, s, benchExtras());
    stage = 'bench';
    host.show(frameHTML({ kind: 'bench', title: v.title, credit: v.credit, picture: img(v.picture.svg, v.picture.alt), reader: v.text, tray: v.buttons.map(b => btn({ ...b, primary: b.id === 'bench-assist' })).join('') }));
    const run = fn => () => { const out = fn(); if (!out.changed) return; visit.bench = out.bench; bench(out.focus); };
    [0, 1].forEach(i => { bind(`bench-form-${i}`, run(() => chooseForm(visit.bench, i))); bind(`bench-support-${i}`, run(() => fitSupport(visit.bench, i))); });
    bind('bench-assist', run(() => finish(visit.bench)));
    bind('bench-keep', () => leave(benchClose(), 'film-shoot'));
    bind('bench-habitat', () => { if (!habitatAvailable(state())) { say(habitatRefusal()); return; } if (!room()) bench(); });
    noRepeat(['bench-assist']);
    focus(focusId || benchFocus(visit.bench));
    say(v.announce);
    return true;
  }
  // ---------- 6-8. Habitat room, departure and the orbital commons ----------
  function room(focusId = null) {
    const s = state();
    if (!habitatAvailable(s)) { say(roomRefusal()); return false; }
    const norm = normalizeRoom(visit.room, s);
    if (norm.resetOrbit && norm.room !== visit.room) visit.orbit = freshOrbit();
    visit.room = norm.room;
    if (visit.orbit.visible) return orbit(focusId);
    const v = roomView(visit.room, s);
    stage = 'room';
    const labels = v.picture.labels ? ['Entry', 'Window', 'Far wall', 'Side nook'].map((name, i) => `<span style="left:${[42, 422, 42, 422][i] / 7.2 + 0.6}%;top:${[258, 30, 30, 258][i] / 4.8 + 0.6}%">${esc(name)}</span>`).join('') : '';
    host.show(frameHTML({ kind: 'room', title: v.title, credit: v.credit, picture: img(v.picture.svg, v.picture.alt, labels), reader: v.text, tray: v.buttons.map(b => btn({ ...b, primary: b.id === 'room-assist' })).join('') }));
    const run = fn => () => {
      const out = fn();
      if (out.room === visit.room && !out.openOrbit) return;
      visit.room = out.room;
      if (out.resetOrbit) visit.orbit = freshOrbit();
      if (out.openOrbit) {
        const o = openChapter(visit.orbit, visit.room, state());
        if (!o.opened) { visit.room = { ...visit.room, notice: orbitFailed() }; room(); return; }
        visit.orbit = o.orbit; orbit('reader'); return;
      }
      room(out.focus || null);
    };
    for (let i = 0; i < 3; i++) bind(`room-item-${i}`, run(() => chooseItem(visit.room, i)));
    for (let i = 0; i < 4; i++) bind(`room-place-${i}`, run(() => choosePlace(visit.room, i)));
    bind('room-assist', run(() => assist(visit.room, state())));
    bind('room-detail', run(() => toggleDetail(visit.room)));
    bind('room-keep', () => closeRoom());
    noRepeat(['room-assist', 'room-place-0']);
    focus(focusId || roomFocus(visit.room));
    say(v.announce);
    return true;
  }
  function closeRoom(announce = true) {
    const paused = visit.orbit.visible, returned = visit.orbit.returned;
    visit.orbit = halt(visit.orbit).orbit;
    stopLoop(); stage = null; host.close(target('film-shoot'));
    if (announce) host.toast(roomClose(paused, returned));
  }
  function orbit(focusId = null, announce = true) {
    const v = orbitalView(visit.orbit, visit.room);
    stage = 'orbit';
    host.show(frameHTML({ kind: 'orbit', title: v.heading.split('\n')[0], credit: v.heading.split('\n')[1], picture: `<figure class="ending-picture" id="orbit-figure">${v.svg}</figure>`, reader: v.text, tray: v.buttons.map(b => btn(b)).join('') }));
    for (let i = 0; i < 7; i++) bind(`orbit-${i}`, () => orbitPress(i));
    const reader = $('ending-reader');
    reader?.addEventListener('focus', () => orbitHalt(false));
    reader?.addEventListener('pointerdown', () => orbitHalt(false));
    bindFloor();
    noRepeat(['orbit-0', 'orbit-1', 'orbit-4']);
    if (focusId) focus(focusId);
    if (announce) say(v.announce);
    if (moving(visit.orbit)) startLoop();
    return true;
  }
  function orbitPress(index) {
    const before = visit.orbit, focused = doc.activeElement?.id, out = orbitAction(visit.orbit, index);
    if (out.orbit === before && !out.effect) return;
    visit.orbit = out.orbit;
    if (out.effect === 'pause') return closeRoom();
    if (out.effect === 'departure') { stopLoop(); return room(); }
    if (out.effect === 'home') { stopLoop(); stage = null; host.close(target('film-shoot')); host.toast(out.announce); return; }
    orbit(out.focus || null);
    if (!out.focus) refocusWalk(focused);
  }
  // refresh(): focus that sat on Invite or Stop moves on when the button no longer applies.
  function refocusWalk(focused) {
    const o = visit.orbit;
    if (o.phase !== 'walk') { if (focused && $(focused) && !$(focused).disabled) focus(focused); return; }
    const invite = $('orbit-3');
    if (focused === 'orbit-3' && invite?.disabled || focused === 'orbit-4' && !moving(o)) focus(moving(o) ? 'orbit-4' : invite && !invite.disabled ? 'orbit-3' : `orbit-${Math.max(0, o.reached)}`);
    else if (focused && $(focused) && !$(focused).disabled) focus(focused);
  }
  function orbitHalt(announce) {
    if (!holds('orbit')) { visit.orbit = halt(visit.orbit).orbit; stopLoop(); return; }
    const out = halt(visit.orbit);
    visit.orbit = out.orbit; stopLoop();
    if (out.halted) { const focused = doc.activeElement?.id, scroll = $('ending-reader')?.scrollTop ?? 0; orbit(null, announce); if (focused) focus(focused); const r = $('ending-reader'); if (r) r.scrollTop = scroll; }
  }
  // Floor taps: invisible 44x44 CSS px targets round each destination; a press and release within 8 px walks there.
  function bindFloor() {
    const svg = $('orbit-figure')?.querySelector('svg');
    if (!svg) return;
    const scale = svg.getBoundingClientRect().width / 720 || 1, size = 44 / scale;
    for (const rect of svg.querySelectorAll('rect[data-target]')) {
      const i = Number(rect.dataset.target), d = [[154, 310], [562, 330], [360, 390]][i];
      rect.setAttribute('x', d[0] - size / 2); rect.setAttribute('y', d[1] - size / 2); rect.setAttribute('width', size); rect.setAttribute('height', size);
      rect.addEventListener('pointerdown', e => { if (e.button > 0) return; pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, target: i }; });
      rect.addEventListener('pointercancel', () => { pointer = null; });
      rect.addEventListener('pointerup', e => {
        const p = pointer; pointer = null;
        if (!p || p.id !== e.pointerId || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8 || visit.orbit.phase !== 'walk') return;
        const out = walkTo(visit.orbit, p.target);
        if (out.orbit === visit.orbit) return;
        visit.orbit = out.orbit; orbit(); focus(`orbit-${p.target}`); host.settle?.tap?.(e);
      });
    }
  }
  function startLoop() { if (frame) return; last = null; frame = win.requestAnimationFrame(tick); }
  function stopLoop() { if (frame) win.cancelAnimationFrame(frame); frame = 0; last = null; }
  function tick(now) {
    frame = 0;
    if (!holds('orbit')) { visit.orbit = halt(visit.orbit).orbit; return; }
    const dt = last === null ? 0 : now - last; last = now;
    const out = step(visit.orbit, dt, host.reducedMotion());
    visit.orbit = out.orbit;
    if (out.events.length) { const focused = doc.activeElement?.id; orbit(null); if (focused === 'orbit-4' || focused === 'orbit-3') refocusWalk(focused); else if (focused && $(focused)) focus(focused); }
    else {
      const svg = $('orbit-figure');
      const set = (who, p) => svg?.querySelector(`[data-walker="${who}"]`)?.setAttribute('transform', `translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`);
      set('player', depictedPlayer(visit.orbit)); set('thanh', depictedThanh(visit.orbit));
    }
    if (moving(visit.orbit)) frame = win.requestAnimationFrame(tick);
  }
  const lifecycle = () => { if (moving(visit.orbit)) orbitHalt(false); };
  win.addEventListener('blur', lifecycle); win.addEventListener('pagehide', lifecycle);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) lifecycle(); });

  // ---------- 9. Mural Stories ----------
  function stories(announce = null) {
    const s = state(), marks = Object.keys(s.mural || {}).length, v = storiesView(visit.stories, s.muralScenes || {}, { palette: s.palette, marks, music: host.music.on() });
    stage = 'stories';
    const choices = `<div class="ending-cards" role="group" aria-label="Scenes">${v.choices.map(c => `<button id="${c.id}" class="secondary-button" aria-pressed="${c.pressed}" aria-label="${esc(c.name)}" title="${esc(c.title)}"><img class="ending-thumb" alt="" src="${dataSVG(c.thumbnail)}">${esc(c.label).replace(/\n/g, '<br>')}</button>`).join('')}</div>`;
    const paper = `<figure class="ending-picture ending-paper"><img alt="${esc(v.targets.map(t => t.name.split('. Paint')[0]).join('; '))}" src="${dataSVG(v.paper)}"><div class="ending-targets">${v.targets.map(t => `<button id="${t.id}" aria-label="${esc(t.name)}" title="${esc(t.name)}">${esc(t.slot)}</button>`).join('')}</div></figure><img class="ending-signature" alt="${esc(v.signatureCredit)}" src="${dataSVG(v.signature)}">`;
    host.show(frameHTML({ kind: 'stories', title: v.title, credit: v.attribution, picture: choices + paper, reader: v.text,
      tray: v.lifts.map(b => btn(b)).join('') + btn(v.palette) + btn(v.music) + btn(v.back) + btn(v.page) }));
    v.choices.forEach(c => bind(c.id, () => { const out = selectScene(visit.stories, c.scene); visit.stories = out.stories; stories(out.announce); focus(c.id); }));
    v.targets.forEach(t => bind(t.id, () => paint(visit.stories.selected, t.slot, t.id)));
    v.lifts.forEach(l => bind(l.id, () => paint('', l.slot, l.id)));
    bind('scene-page', () => { const out = changePage(visit.stories); visit.stories = out.stories; stories(out.announce); focus('scene-page'); });
    // Godot cycle_mural_palette: saved like the workshop's swatches, announced, and the screen stays open.
    bind('scene-palette', () => { const next = nextPalette(state().palette); host.act({ type: 'palette', value: next }); if (stage !== 'stories' || !modal.open) return; stories(paletteAnnouncement(state().palette, Object.keys(state().mural || {}).length)); focus('scene-palette'); });
    bind('scene-back', closeStories);
    bindMusic(() => stories(''));
    say(announce ?? '');
  }
  // mural_workshop.gd close_stories: back to the workshop with Paint Scenes focused.
  function closeStories() { const text = closeStoriesAnnouncement(state().muralScenes || {}); stage = null; host.openMural(); focus('mural-scenes'); say(text); }
  function paint(id, slot, focusId) {
    const s = state(), out = editScene(s.muralScenes || {}, id, slot);
    if (!out.changed) { if (out.message) { visit.stories = { ...visit.stories, message: out.message }; stories(out.message); focus(focusId); } return; }
    if (!host.sceneAdmission({ ...s, muralScenes: out.scenes })) { const m = sceneRefusal(); visit.stories = { ...visit.stories, message: m }; stories(m); focus(focusId); return; }
    host.act({ type: 'mural-scene', id, slot });
    const message = sceneReceipt(host.saveReason()) + ' ' + out.message;
    visit.stories = { ...visit.stories, message };
    stories(sceneAnnouncement(message, state().muralScenes || {}));
    focus($(focusId)?.disabled ? 'ending-reader' : focusId);
  }

  // Escape: the dialog's cancel event runs the stage's own Escape action and keeps the visit.
  modal.addEventListener('cancel', event => {
    if (!stage || !modal.contains(doc.getElementById('ending-reader'))) return;
    event.preventDefault();
    if (stage === 'hosted') leave(hostedClose(state()), 'host-afternoon');
    else if (stage === 'gather') leave(gatherClose(visit.gather), 'host-afternoon');
    else if (stage === 'screening') leave(screeningClose(), 'film-shoot');
    else if (stage === 'bench') leave(benchClose(), 'film-shoot');
    else if (stage === 'room' || stage === 'orbit') closeRoom();
    else if (stage === 'stories') closeStories();
  });
  modal.addEventListener('close', () => { stopLoop(); if (stage === 'orbit' || stage === 'room') visit.orbit = halt(visit.orbit).orbit; stage = null; });

  return {
    // Opens a stage from its entry point; returns false (with Godot's refusal announced) when it is not available.
    open(kind) {
      host.stopWalk();
      const s = state();
      if (kind === 'hosted') { if (s.hosting.results.length !== 4) return false; visit.hostedSelected = 'stories'; hosted(); focus('hosted-card-stories'); return true; }
      if (kind === 'gather') { const out = openGather(visit.gather, s); visit.gather = out.gather; if (!out.opened) { say(out.announce); return false; } gather(out.announce); focus('reader'); return true; }
      if (kind === 'screening') { if (!screeningAvailable(s)) { host.toast(screeningRefusal()); return false; } screening(); focus(`screen-frame-${visit.screenFrame}`); return true; }
      if (kind === 'bench') return bench();
      if (kind === 'room') return room();
      if (kind === 'stories') { visit.stories = freshStories(); stories(openStoriesAnnouncement()); focus('scene-choice-0'); return true; }
      return false;
    },
    // Labels for the entry buttons the host draws.
    gatherLabel: () => gatherTitle(visit.gather), paintScenesLabel,
    // The Listening Hour's done view: Dez's offer, Follow and Keep exploring, as HTML for civicScreen, and their binding.
    civicOfferHTML() {
      const offer = civicOffer(state(), host.filmButtonLabel());
      if (!offer) return '';
      return `<div class="ending-offer" id="civic-offer">${lines(offer.text)}<p>${esc(offer.request)}</p><p>${esc(offer.beginning)}</p><div class="button-row">${btn({ id: 'civic-follow', label: offer.primary.label, primary: true })}${btn({ id: 'civic-keep', label: offer.back.label })}</div></div>`;
    },
    bindCivicOffer() {
      bind('civic-follow', () => { const text = civicFollow(state(), host.filmButtonLabel(), host.chapterText()); if (text) leave(text, 'film-shoot'); });
      bind('civic-keep', () => leave(civicClose(), 'civic-hour'));
    },
    // After every state change; adopted is true when the state came from another tab or edition's save. Returns reset (the visit
    // started over) and closed (an open ending screen closed), so the host can say why the screen went away.
    sync({ adopted = false } = {}) {
      const out = syncVisit(visit, state(), { adopted });
      visit = out.visit;
      if (!stage || !modal.open) return { reset: out.reset, closed: false };
      const s = state(), still = { hosted: s.hosting.results.length === 4, gather: visit.gather.order.length > 0, screening: screeningAvailable(s), bench: screeningAvailable(s), room: habitatAvailable(s), orbit: habitatAvailable(s), stories: true }[stage];
      if (!still || out.reset && stage !== 'stories') { const back = ['hosted', 'gather'].includes(stage) ? 'host-afternoon' : 'film-shoot'; stopLoop(); stage = null; host.close(target(back)); return { reset: out.reset, closed: true }; }
      return { reset: out.reset, closed: false };
    },
    // Start fresh: Godot reset_visit.
    reset() { stopLoop(); visit = freshVisit(state()); stage = null; },
    get stage() { return stage; },
    snapshot: () => ({ stage, moving: moving(visit.orbit), visit: structuredClone(visit) }),
  };
}
