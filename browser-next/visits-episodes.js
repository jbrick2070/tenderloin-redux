// The four episode screens of the side stories (Phase 3 wiring spec WP2b): Two Dogs Home (godot/dog_story.gd), the Lantern
// Procession (lantern_procession.gd), Power Story with the Larkin place (power_story.gd, power_place.gd) and the Election Walk
// (voting_story.gd). Each screen is drawn from picker.episodeView(stories, id, ctx) through the visits kit (visits-kit.js): every
// word comes from the pure modules (visits/text.js); this file lays Godot's controls out in Godot's order, wires each to its
// pure action and moves focus as Godot's grab_focus does after it. The visit lives in kit.session.stories and nothing here is
// saved; the page is reached only through kit members.
//
// createEpisodeScreens(kit) -> { render(id, { announce }), cancel(id), silentClose(id) }, for the shell (visits-ui.js):
//   render(id, { announce })   draw an open episode's screen, focused as Godot's open_story focuses it, and say announce in its
//                              status line; false (nothing drawn) unless the episode is open. The kit's walk protocol reopens
//                              a screen through it (kit.routes.renderEpisode).
//   cancel(id)                 Escape on the episode's screen, which is its Back (Godot close_story, main.gd:14820-14836)
//   silentClose(id)            the episode's open flag cleared without a word (× and the shell's normalize); the dialog is left
// Back and Escape return focus to kit.session.from, the id of the control the shell opened the screen from. A walk clears it,
// so a screen that a walk reopens returns to the canvas, as × does then (spec 3.7).
//
// Godot marks only Power's four connector pads rapid (power_story.gd setup): here they are literal buttons over the diagram, the
// one rapid mark of this file. Every other control is drawn by the kit's btn() from a view that is not marked rapid.
import { esc, dataURI, btn, figure, frameHTML } from './visits-kit.js';
import { changeEpisode, episodeView, episodeModule, activeEpisode } from './visits/picker.js';
import { illustration } from './visits/dogs.js';
import { artwork } from './visits/lantern.js';
import { diagram, mapSVG } from './visits/power.js';
import { paperSVG, paperKey } from './visits/election.js';

// ---------- Pictures ----------
// The pure SVG builders do not cache, so each data: URI is kept by Godot's own key: dog_story.gd one texture per profile,
// lantern_procession.gd update_art "costume:lantern", voting_story.gd update_art "palette:observed:placed" (per loaded list),
// power_place.gd one case map per loaded place (and the empty frame until it loads), and power_story.gd's diagram, which Godot
// redraws on every refresh, by what it draws: the station, its four turns and the restored relays. A connector puzzle has 256
// turn sets per relay, so a cache that grows past KEEP starts over.
const BUILD = { dogs: illustration, lantern: artwork, diagram, map: mapSVG, paper: paperSVG };
const KEEP = 64;
function remember(cache, key, make) {
  if (!cache.has(key)) { if (cache.size >= KEEP) cache.clear(); cache.set(key, dataURI(make())); }
  return cache.get(key);
}
const loaded = value => !!value && typeof value === 'object';
export function createPictures(build = BUILD) {
  const dogs = new Map(), lanterns = new Map(), diagrams = new Map(), maps = new WeakMap(), papers = new WeakMap(), unloaded = new Map();
  let emptyMap = '';
  const papersOf = source => {
    if (!loaded(source)) return unloaded;
    if (!papers.has(source)) papers.set(source, new Map());
    return papers.get(source);
  };
  return {
    dogs: profile => remember(dogs, profile, () => build.dogs(profile)),
    lantern: (costume, lantern) => remember(lanterns, `${costume}:${lantern}`, () => build.lantern(costume, lantern)),
    diagram: p => remember(diagrams, `${p.station}:${p.turns[p.station].join('')}:${p.restored}`, () => build.diagram(p)),
    map(source) {
      if (!loaded(source)) return (emptyMap ||= dataURI(build.map(null)));
      if (!maps.has(source)) maps.set(source, dataURI(build.map(source)));
      return maps.get(source);
    },
    paper: (e, source) => remember(papersOf(source), paperKey(e), () => build.paper(e, loaded(source) ? source : null)),
  };
}

// ---------- Overlays ----------
// The pure views place pads, pins and labels in Godot's 360 x 240 picture space; the kit draws the picture at full width without
// letterboxing, so a percentage of the figure keeps each on its mark.
const pct = (value, total) => `${+(Number(value) / total * 100).toFixed(4)}%`;
// power_story.gd setup and fit_layout: a transparent pad over each 88 px connector cell, named and titled with Godot's name
// ("Turn connector n: X to Y"); each press turns it one quarter.
function padHTML(pad) {
  const i = pad.index, place = `left:${pct(pad.x, 360)};top:${pct(pad.y, 240)};width:${pct(pad.size, 360)};height:${pct(pad.size, 240)}`;
  return `<button id="power-pad-${i}" data-rapid aria-label="${esc(pad.name)}" title="${esc(pad.name)}" style="${place}"${pad.disabled ? ' disabled' : ''}></button>`;
}
// power_story.gd fit_layout: the case map's labels at their points, moved in to stay 3 px inside the right edge and 2 px inside
// the bottom. The label box is its text in ch plus the kit's 4 px side padding, and one 1.3 em line plus its 1 px padding.
const mapLabelHTML = label => `<span class="visits-label" style="left:min(${pct(label.x, 360)}, calc(100% - ${[...String(label.text)].length}ch - 11px));top:min(${pct(label.y, 240)}, calc(100% - 1.3em - 4px))">${esc(label.text)}</span>`;
// voting_story.gd fit_layout: a pin is 44 x 44 px centred on its city address point (the kit's .visits-pin margin), titled with
// Godot's tooltip; a placed label sits 26 px below its pin, at most 160 px or half the map less 10 px wide, centred on the pin
// and kept inside its own half of the map, 5 px from that half's edges.
const LABEL_WIDTH = 'min(160px, calc(50% - 10px))';
const pinHTML = pin => btn({ id: `election-pin-${pin.index}`, label: pin.label, name: pin.name, title: pin.name, visible: pin.visible, className: 'visits-pin', style: `left:${pct(pin.x, 360)};top:${pct(pin.y, 240)}` });
const placedHTML = (label, pin, i) => `<span class="visits-label" style="left:clamp(calc(${i * 50}% + 5px), calc(${pct(pin.x, 360)} - ${LABEL_WIDTH} / 2), calc(${(i + 1) * 50}% - ${LABEL_WIDTH} - 5px));top:calc(${pct(pin.y, 240)} + 26px);max-width:${LABEL_WIDTH}">${esc(label.text)}</span>`;
// dog_story.gd, lantern_procession.gd and voting_story.gd give every button its accessible name (or text) as the tooltip: the
// hover title here wherever it says more than the label.
const spoken = text => String(text ?? '').replace(/\s+/g, ' ').trim();
const tip = b => (spoken(b.name) !== spoken(b.label) ? b.name : undefined);

// ---------- Controls ----------
// [the id after the episode's prefix, the pure action, the control Godot focuses after it: (after, before) => id]. Without a
// rule the pressed control keeps focus, as a Godot Button does when its handler grabs none.
const SITE = ['election-cadillac', 'election-boeddeker'];
const CONTROLS = {
  // dog_story.gd setup: profiles, SFACC info, the three leads, then begin (focus the first lead), walk_to_lead, match_dog,
  // end_session.
  dogs: [
    ['pippin', { type: 'profile', index: 0 }], ['junebug', { type: 'profile', index: 1 }], ['info', { type: 'info' }],
    ['lead0', { type: 'lead', index: 0 }], ['lead1', { type: 'lead', index: 1 }], ['lead2', { type: 'lead', index: 2 }],
    ['begin', { type: 'begin' }, () => 'dogs-lead0'],
    ['walk', { type: 'walk' }], ['match', { type: 'match' }], ['end', { type: 'end' }],
  ],
  // lantern_procession.gd setup: capes and lanterns, begin (focus Walk), walk_route, advance (Back once won, Walk after Gather;
  // the paused group's line keeps focus), end_session.
  lantern: [
    ['bat', { type: 'costume', value: 0 }], ['star', { type: 'costume', value: 1 }],
    ['moon', { type: 'lantern', value: 0 }], ['starLantern', { type: 'lantern', value: 1 }],
    ['begin', { type: 'begin' }, () => 'lantern-walk'], ['walk', { type: 'walk' }],
    ['advance', { type: 'advance' }, (after, before) => (after.won ? 'lantern-back' : after.phase !== before.phase ? 'lantern-walk' : 'lantern-advance')],
    ['end', { type: 'end' }],
  ],
  // power_story.gd actions: begin (the Larkin case map toggles in place; a new story focuses Walk), walk_to_relay, check_path
  // (Back once all three are lit, else the next relay, connected or not), end_session (Begin). Pads and tabs are bound below.
  power: [
    ['begin', { type: 'begin' }, (after, before) => (before.active ? 'power-begin' : 'power-walk')],
    ['walk', { type: 'walk' }],
    ['check', { type: 'check' }, after => (after.restored === 7 ? 'power-back' : `power-tab-${(after.station + 1) % 3}`)],
    ['end', { type: 'end' }, () => 'power-begin'],
  ],
  // voting_story.gd setup: sites (each keeps focus), papers, begin (Walk), walk_route, record_site (Make map once both are
  // recorded, else the other site), make_map (the first label), share_map (Back), end_session (Begin). Pins are bound below.
  election: [
    ['cadillac', { type: 'choose', index: 0 }], ['boeddeker', { type: 'choose', index: 1 }],
    ['warm', { type: 'palette', value: 0 }], ['cool', { type: 'palette', value: 1 }],
    ['begin', { type: 'begin' }, () => 'election-walk'], ['walk', { type: 'walk' }],
    ['record', { type: 'record' }, after => (after.observed === 3 ? 'election-make' : SITE[1 - after.selected])],
    ['make', { type: 'make' }, () => 'election-cadillac'], ['share', { type: 'share' }, () => 'election-back'],
    ['end', { type: 'end' }, () => 'election-begin'],
  ],
};
// The chained controls: each press moves the story on a stage, so a held Enter or Space never presses them again (kit.noRepeat).
const CHAINED = { dogs: ['dogs-walk', 'dogs-match'], lantern: ['lantern-walk', 'lantern-advance'], power: ['power-check'], election: ['election-walk', 'election-record', 'election-make', 'election-share'] };

export function createEpisodeScreens(kit) {
  const { session } = kit, pictures = createPictures();
  const returnTarget = () => (typeof session.from === 'string' && session.from ? session.from : undefined);
  const tray = (id, buttons) => buttons.map(b => btn({ ...b, id: `${id}-${b.id}`, title: tip(b) })).join('');

  // ---------- Drawing (Godot refresh) ----------
  const DRAW = {
    dogs: (v, ctx, d) => frameHTML({
      kind: 'dogs', credit: v.credit, title: v.heading, headingEntry: kit.readerEntry('dogs'),
      picture: figure({ src: pictures.dogs(d.profile), alt: v.description }), reader: v.text, tray: tray('dogs', v.buttons),
    }),
    lantern: v => frameHTML({
      kind: 'lantern', credit: v.credit, title: v.heading, headingEntry: kit.readerEntry('lantern'),
      picture: figure({ src: pictures.lantern(v.art.costume, v.art.lantern), alt: '' }), reader: v.text, tray: tray('lantern', v.buttons),
    }),
    // Godot's tray: the reader, a row of the three tabs with Missing dogs and More stories, then the six actions. Godot's relay tabs
    // are plain buttons; here the relay on show is pressed while the story is active (aria-pressed, the kit's selected look), a
    // declared 2D accessibility addition that says which relay the reader, the pads and Check path are about. The hub's Festival,
    // Larkin 2017 and Place map stay plain.
    power: (v, ctx, p) => frameHTML({
      kind: 'power', credit: v.credit, title: v.heading,
      picture: figure({
        src: v.picture === 'map' ? pictures.map(ctx.powerPlace) : pictures.diagram(p), alt: '',
        overlay: v.pads.filter(pad => pad.visible).map(padHTML).join('') + v.mapLabels.filter(label => label.visible).map(mapLabelHTML).join(''),
      }),
      reader: v.text,
      extra: `<div class="visits-tray">${v.tabs.map(t => btn({ ...t, id: `power-tab-${t.index}`, pressed: p.active ? t.index === p.station : undefined })).join('')}${btn({ ...v.dogs, id: 'power-dogs' })}${btn({ ...v.more, id: 'power-more' })}</div>`,
      tray: v.actions.map(a => btn({ ...a, id: `power-${a.id}` })).join(''),
    }),
    election: (v, ctx, e) => frameHTML({
      kind: 'election', credit: v.credit, title: v.heading, headingEntry: kit.readerEntry('election'),
      picture: figure({
        src: pictures.paper(e, ctx.voting), alt: '',
        overlay: v.pins.map(pinHTML).join('') + v.labels.map((label, i) => (label.visible ? placedHTML(label, v.pins[i], i) : '')).join(''),
      }),
      reader: v.text, tray: tray('election', v.buttons),
    }),
  };
  // focus: a control id (a disabled or missing one falls back to Godot's open-time focus, then the reader), undefined for the
  // open-time focus, or false to leave focus where it is (game.js show keeps the same id).
  function draw(id, { focus, announce } = {}) {
    const ctx = kit.ctx(), view = episodeView(session.stories, id, ctx);
    kit.show(id, DRAW[id](view, ctx, session.stories[id]));
    bindScreen(id, view);
    if (focus !== false) focusFirst(focus, view.focus === 'pad0' ? 'power-pad-0' : `${id}-${view.focus}`);
    if (announce) kit.say(announce);
  }
  function focusFirst(...ids) {
    for (const target of ids) {
      const el = target ? kit.$(target) : null;
      if (el && !el.disabled && kit.focus(target)) return;
    }
    kit.focus('reader');
  }
  function bindScreen(id, view) {
    for (const [name, action, after] of CONTROLS[id]) kit.bind(`${id}-${name}`, () => press(id, action, after ?? (() => `${id}-${name}`)));
    kit.bindMusic(id, () => draw(id, { focus: false }));
    kit.bind(`${id}-back`, () => back(id));
    if (id === 'power') {
      // power_story.gd rotate keeps focus on its pad; choose keeps it on its tab, and the Larkin tab needs the place file.
      for (const pad of view.pads) kit.bind(`power-pad-${pad.index}`, () => press('power', { type: 'rotate', index: pad.index }, () => `power-pad-${pad.index}`));
      for (const tab of view.tabs) kit.bind(`power-tab-${tab.index}`, () => { press('power', { type: 'choose', index: tab.index }, () => `power-tab-${tab.index}`); needData('power'); });
      kit.bind('power-dogs', missingDogs);
      kit.bind('power-more', () => { if (kit.holds('power')) kit.openPicker(); });
    } else {
      kit.bindReaderEntry(id);
      // voting_story.gd place_label: Walk once both labels fit, else the other label's site button.
      if (id === 'election') for (const pin of view.pins) kit.bind(`election-pin-${pin.index}`, () => press('election', { type: 'place', index: pin.index }, after => (after.phase === 3 ? 'election-walk' : SITE[1 - pin.index])));
    }
    kit.noRepeat(CHAINED[id]);
  }

  // ---------- Actions ----------
  function step(id, action) {
    const out = changeEpisode(session.stories, id, action, kit.ctx());
    session.stories = out.stories; kit.bump();
    return out;
  }
  // One press: the pure action, then a walk, or Godot's refresh(true) (redraw, focus, its announcement); a press that Godot's
  // own guard ignores changes nothing and says nothing.
  function press(id, action, focusAfter) {
    if (!kit.holds(id)) return;
    const before = session.stories[id], out = step(id, action), after = session.stories[id];
    if (out.walk) { walk(id, out); return; }
    if (after === before && !out.announce) return;
    if (!after?.open) { kit.leave(out.announce, returnTarget()); return; }
    draw(id, { focus: focusAfter(after, before), announce: out.announce });
  }
  // The walk protocol (spec 3.6) is the kit's: the screen closes, the episode's own walk routes there, and its arrival or a
  // refused route reopens the screen through render. The name is the objective's target, which host.walk says when the episode
  // says nothing (Power says its own line); the lantern march and the election walk keep a manual camera (Godot walk_route).
  function walk(id, out) {
    const goal = episodeModule(id).objective(session.stories[id], kit.ctx());
    session.from = null;
    kit.startWalk(id, out.walk, { name: goal?.targetName ?? '', announce: out.announce || '', keepCamera: id === 'lantern' || id === 'election' });
  }
  // Godot close_story(): its announcement once the dialog has closed.
  function back(id) {
    if (!kit.holds(id)) return false;
    const out = step(id, { type: 'close' });
    kit.leave(out.announce, returnTarget());
    return true;
  }
  // power_story.gd setup "Missing dogs": Power closes without a word and Two Dogs Home opens in its place; a refused open says
  // its refusal once the dialog has closed, as Godot announces it over the block.
  function missingDogs() {
    if (!kit.holds('power') || session.stories.power.active) return;
    step('power', { type: 'close', announce: false });
    const out = step('dogs', { type: 'open' });
    if (out.refused || !render('dogs', { announce: out.announce })) kit.leave(out.announce, returnTarget());
  }
  // Power's Larkin view and the Election Walk read the lazily loaded place files (spec 3.4). The kit loads them, says its
  // loading line, and calls back only while this screen still holds the dialog: the redraw leaves focus where it is and says
  // the screen's line again, as Godot's refresh(true) does when its text changes. Asked on an open and on the Larkin tab only,
  // so a file that failed is tried again on the next of those, never by its own redraw.
  function needData(id) {
    const names = id === 'power' ? (session.stories.power.historical ? ['power_place.json'] : []) : id === 'election' ? ['voting_places.json', 'power_place.json'] : [];
    if (names.length && kit.holds(id)) kit.ensureData(names, () => draw(id, { focus: false, announce: announceNow(id) }));
  }
  const announceNow = id => episodeModule(id).announce(session.stories[id], { ...kit.ctx(), activeId: activeEpisode(session.stories) });

  function render(id, { announce } = {}) {
    if (!Object.hasOwn(DRAW, id) || !session.stories[id]?.open) return false;
    draw(id, { announce });
    needData(id);
    return true;
  }
  function silentClose(id) {
    if (!Object.hasOwn(DRAW, id)) return false;
    const open = !!session.stories[id]?.open;
    if (open) step(id, { type: 'close', announce: false });
    if (session.screen === id) { session.screen = null; kit.bump(); }
    return open;
  }
  return { render, cancel: id => (Object.hasOwn(DRAW, id) ? back(id) : false), silentClose };
}
