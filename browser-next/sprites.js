// Map sprites for the side stories (the VisitsScene of visits-ui.js scene()), drawn into the World
// through its optional layers hook: ground under the walking path and the people, actors
// ({ y, draw }) y-sorted with the people, overlay over the people and under the name chips.
// Colours, sizes and labels follow Godot: GODOT_COLORS is drift-tested against godot/*.gd and every
// label is a visits/text.js text. Canvas calls only: no DOM, no SVG or data URI, no clock. Motion
// comes only from world.time, held at its time-0 pose under reduced motion. Static geometry and
// the actors of a scene part are built once per part object (spec risk R9).
import { distanceToSegment } from './core.js';
import { NEIGHBORS } from './world.js';
import { gatheringScene } from './gathering.js';
import { GODOT_TEXT, MAIN, web } from './visits/text.js';
import { gdf } from './visits/format.js';
import { PIXELS_PER_METRE as M, MAP_ANGLE, godotToMap } from './visits/positions.js';
import { PAIRS, darken } from './visits/surprises.js';
import { DOG_LOOKS } from './visits/dogs.js';
import { TABLE_SLOTS } from './visits/meal.js';

// Godot colours (hex without '#'), by the file and function that set them.
export const GODOT_COLORS = {
  'main.gd': {
    build_boeddeker_park: { lawn: '5b8f55', path: 'cdbf9b', iron: '2b3a33', gate: '3f6b52', bench: '8a6544', play: 'b46a4f', playPost: '2f6e8e', playDeck: 'e2b33f', playRoof: 'd9573f', label: 'c9f5c4' },
    ensure_tree_resources: { trunk: '5a402d', leaf0: '4e7d5c', leaf1: '5c8d67', leaf2: '6a9a5a' },
    build_street_life_decor: {
      lampPole: '384649', soWhatCanopy: '1c2842', chordHorn: 'f3c458', chord: '5ec2c6', soWhatLabel: 'ffe699', floorWindow: 'ffe082', balcony: '2b3648', turntableLamp: 'ff9e5e', floorLabel: 'ffe8a3',
      marquee: 'f4d06f', blade: '4fc3c7', gallery0: 'ffe699', gallery1: '8de4e8', docentCoat: '3b6e75', docentSkin: 'c68b63', docentHair: '2a2623', kiosk: 'e6b35a',
      ring0: 'f3c458', ring1: 'd884b8', ring2: '5ec2c6', museumLabel: 'ffe8a3', portalLabel: '8de4e8',
    },
    build_eatery_counters: { counter: '6e4b33', stool: '2d3532', board: '203238', skin0: 'c38c65', skin1: '8b5b3f', skin2: '704b37', skin3: 'b67f5d', skin4: '966345', skin5: 'a97650', hair0: '2a2623', hair1: '383c32', hair2: '1e2224', hair3: '454236', hair4: 'dad7c6', hair5: '3f352c' },
    // The beacon's base material, then each label's tint by surprise id.
    build_neighborhood_surprises: { beacon: '8a7964', jeffrey_record: 'ffe699', hidden_mural_145: '9ef5e5', impromptu_drag_show: 'f5c2ff', viking_dirt_biker: 'ffd27d', cutesy_dino: '9ef5e5', magic_carpet_chef: 'ffb3d1', bite_size_nachos: 'ffd45e', good_donut_and_bagel: 'ffb3d1', clown_horn_walker: 'ff9e9e', mayor_pomp_event: 'ffe394' },
    build_guide_marker: { gold: 'ffd25a' },
    attach_neighbor_signature_prop: { rosette: 'd93848', seal: 'ffd45e', tray: 'f5d6df', donut: 'ff9ec4', bagel: 'c9935b', cream: 'f7f2e4', vikingDome: 'c8cfd8', vikingBand: 'ffb35c', vikingHorn: 'fff0cc', carpet: 'c42b4b', medallion: 'ffd45e', wok: 'b87344', fanPink: 'f5a3d0', fanTeal: '5fd4ba', tiara: 'ffd45e', nachoBag: 'ffb84d', nachoChip: 'ffe07d', salsa: '5fd475' },
    build_mural_board: { sketchBack: '4a3228', sketchCanvas: '283e56', sketchHound: 'f5d57a', sketchSax: '5fd4ba', dinoLedge: '6a4f3b', dino: '7ce8b0', dinoCrest: 'ff8fa3' },
    build_rook_speaker: { plinth: '5c3d28', vinyl: '16181c', vinylLabel: 'f8cc58', sleeve: '225588', hornCone: 'ffd45e', hornBulb: 'ff5252' },
  },
  'power_place.gd': { setup: { wall: '738492', roof: 'a4b6bc' } },
  'power_story.gd': { setup: { relay: '4f7076', dark: '283c4b', warm: 'ffe8a3', battery: '407b83' }, apply_lighting: { night: '101b2b' } },
  'dog_story.gd': { setup: { ownerSkin: 'aa7b5b', ownerHair: '353334' }, make_dog: { nose: '283839', tag: 'f4c45e' } },
  'lantern_procession.gd': { setup: { visitorSkin: 'ae805f', visitorHair: '343343' } },
  'voting_story.gd': { update_art: { warm: 'eee0bf', cool: 'dce8e3', ink: '476961', street: '8aa9ac' } },
  'shared_meal.gd': { build_world: { cloth: 'd5bd8f' }, artwork: { rim: '23434b', plate: 'fff5df', food0: 'ad7c46', food1: 'ad773c', food2: '79513b', food3: 'c87339' } },
};
// make_label_3d outline_modulate Color(0.05, 0.09, 0.12, 0.98): the chip under a label's tinted text.
export const GODOT_LABEL_OUTLINE = '#0d171ffa';
// build_light_pools: each street lamp's pool, Color(1.0, 0.86, 0.58) at 0.5 over 3.3 m.
export const GODOT_POOL = { color: '#ffdb94', alpha: 0.5, radius: 3.3 * M };
// world.js objectLabel shows neighbor names from this zoom; the Label3D chips follow it (decision D3).
export const CHIP_ZOOM = 0.22;

// Every colour as a '#rrggbb' string, built once.
const hexes = table => Object.fromEntries(Object.entries(table).map(([key, value]) => [key, '#' + value]));
const G = GODOT_COLORS['main.gd'];
const PARK = hexes(G.build_boeddeker_park), DECOR = hexes(G.build_street_life_decor), COUNTER = hexes(G.build_eatery_counters), SURPRISE = hexes(G.build_neighborhood_surprises);
const PROP = hexes({ ...G.attach_neighbor_signature_prop, ...G.build_mural_board, ...G.build_rook_speaker });
const TREE = hexes(G.ensure_tree_resources), LEAVES = [TREE.leaf0, TREE.leaf1, TREE.leaf2];
const LARKIN = hexes(GODOT_COLORS['power_place.gd'].setup), POWER = hexes(GODOT_COLORS['power_story.gd'].setup), NIGHT = '#' + GODOT_COLORS['power_story.gd'].apply_lighting.night;
const DOG = { ...hexes(GODOT_COLORS['dog_story.gd'].setup), ...hexes(GODOT_COLORS['dog_story.gd'].make_dog) }, PARADE = hexes(GODOT_COLORS['lantern_procession.gd'].setup);
const FOLIO = hexes(GODOT_COLORS['voting_story.gd'].update_art), MEAL = { ...hexes(GODOT_COLORS['shared_meal.gd'].build_world), ...hexes(GODOT_COLORS['shared_meal.gd'].artwork) };
const FOOD = [MEAL.food0, MEAL.food1, MEAL.food2, MEAL.food3];
const HOSTS = [0, 1, 2, 3, 4, 5].map(i => ({ skin: COUNTER['skin' + i], hair: COUNTER['hair' + i] }));
const RINGS = [[1.55, DECOR.ring0], [1.22, DECOR.ring1], [0.88, DECOR.ring2]];
const GOLD = '#' + G.build_guide_marker.gold, GOLD_LOW = darken(GOLD, 0.15);
const SHADOW = '#304b3e2a', BUILDING_SHADOW = '#5b665728'; // the fork's own 2D shadows (world.js person and building)
const FONT = '11px "Segoe UI", sans-serif'; // world.js chip()
const T = GODOT_TEXT['main.gd'], EATERIES = MAIN.NEIGHBORHOOD_EATERIES;
const EATERY = EATERIES.map(rec => {
  const canopy = '#' + rec.canopy_color;
  return { canopy, label: '#' + rec.label_color, host: lighten(canopy, 0.15), top: lighten(canopy, 0.25), seat: lighten(canopy, 0.1) };
});
const TAU = Math.PI * 2, COS = Math.cos(MAP_ANGLE), SIN = Math.sin(MAP_ANGLE);

// Sizes. Godot's metres where Godot has them (at the map's 5 px per metre); the fork's 2D sprite
// scale (px) for things that stand beside its people.
const SO_WHAT_CHORDS = [0.42, 0.56, 0.72, 0.64, 0.96, 0.82, 1.08, 0.92]; // main.gd so_what_heights
const PLAY = godotToMap(-146, -112);                                      // build_boeddeker_park play_c
const MUSEUM_SCALE = 1.75 * M, COUNTER_SCALE = 1.4 * M;                    // museum_root and counter props scale
const TABLE_PX = 75 / 9.2;                   // the 2D Long Table top is 75 px; Godot's is 9.2 m (half extent 4.6)
const CLOTH = { x: 24, y: 1, w: 26, h: 12 }; // the 2.6 x 1.2 m serving cloth at 10 px/m, beside the floor table
const BEACON = { lift: 38, radius: 5 };      // the 0.18 m beacon at 1.95 m: just above a 2D person's head (px)
const POLE = 38;                             // a street lamp pole, about a 2D tree's height (px)
const ACTOR = 20;                            // px per metre for dogs (a 2D neighbor is about 37 px tall)

const ok = v => typeof v === 'number' && Number.isFinite(v);
const point = p => !!p && typeof p === 'object' && ok(p.x) && ok(p.y);
const list = v => (Array.isArray(v) ? v : []);
// Godot Color.lightened(amount): each channel moves `amount` of the way to white.
function lighten(color, amount) {
  const n = parseInt(color.slice(1, 7), 16);
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0')).join('');
}
// The world.js primitives, on the context passed in.
function rect(c, x, y, w, h, color, radius = 0) { c.fillStyle = color; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, radius); else c.rect(x, y, w, h); c.fill(); }
function circle(c, x, y, r, color) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = color; c.fill(); }
function ellipse(c, x, y, rx, ry, color) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = color; c.fill(); }
function shape(c, points, color) { c.beginPath(); points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = color; c.fill(); }
function polygon(c, points, color) { c.beginPath(); points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fillStyle = color; c.fill(); }
function stroke(c, points, color, width) { c.beginPath(); points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
function star(c, x, y, r, color) { shape(c, Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.45 : r; return [x + Math.cos(a) * d, y + Math.sin(a) * d]; }), color); }
// A Godot-axis offset in the map frame (godotToMap's turn, no scale).
const turn = (x, y) => ({ x: x * COS - y * SIN, y: x * SIN + y * COS });
const PORTAL = turn(2.3 * MUSEUM_SCALE, 0.8 * MUSEUM_SCALE); // ArchiveTimePortal at museum-local (2.3, 0.8)
const neighbor = id => NEIGHBORS.find(n => n.id === id);

// world.js chip() geometry and zoom scaling, in Godot's Label3D look: the tint on the outline colour.
function chip(c, world, text, x, y, ink) {
  const k = Math.max(1, 1 / world.scale);
  c.save(); c.translate(x, y); c.scale(k, k);
  c.font = FONT; const w = c.measureText(text).width + 20;
  rect(c, 0 - w / 2 + 1, 0 - 17, w, 23, '#233d3812', 4); rect(c, 0 - w / 2, 0 - 19, w, 23, GODOT_LABEL_OUTLINE, 4);
  c.font = FONT; c.fillStyle = ink; c.textAlign = 'center'; c.fillText(text, 0, 0 - 3);
  c.restore();
}

// The Label3D texts (visits/text.js, as the 2D edition shows them), formatted once. A text that
// text.js lacks draws no chip; nothing here is ever typed by hand.
function labelTexts() {
  const D = T.build_street_life_decor ?? {}, S = T.build_neighborhood_surprises ?? {}, menu = T.build_eatery_counters?.menu;
  const say = text => (typeof text === 'string' ? web('main.gd', text) : '');
  return {
    surprise: Object.fromEntries(Object.entries(S).map(([id, text]) => [id, say(text)])),
    eatery: EATERIES.map(rec => (D.eatery ? gdf(say(D.eatery), [rec.name]) : '')),
    menu: EATERIES.map(rec => (menu ? gdf(say(menu), [String((MAIN.EATERY_MENU_ITEMS[rec.id] ?? [T.eatery_counter_interact.special])[0])]) : '')),
    park: say(T.build_boeddeker_park?.label), soWhatAwning: say(D.soWhatAwning), soWhatFloor: say(D.soWhatFloor), museum: say(D.museum), portal: say(D.portal),
  };
}

// --- ground ---
// Boeddeker Park (build_boeddeker_park): fence runs open at the gate, gate posts, benches and the
// play structure, from the ring and path the scene gives (2D pixels; ratios match Godot's metres).
function parkGeometry(park) {
  const ring = park.ring, n = ring.length, entrance = point(park.entrance) ? park.entrance : null, runs = [];
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const inside = p => { let hit = false; for (let i = 0, j = n - 1; i < n; j = i++) { const a = ring[i], b = ring[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit; } return hit; };
  const clearance = p => { let best = Infinity; for (let i = 0; i < n; i++) best = Math.min(best, distanceToSegment(p, ring[i], ring[(i + 1) % n])); return best; };
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 0.05 * M) continue;
    const pickets = Math.max(1, Math.trunc(length / (0.5 * M)));
    let start = -1;
    for (let k = 0; k <= pickets; k++) {
      const p = lerp(a, b, k / pickets), gate = !!entrance && Math.hypot(p.x - entrance.x, p.y - entrance.y) < 2.8 * M;
      if (!gate && start < 0) start = k;
      if ((gate || k === pickets) && start >= 0) {
        const end = gate ? k - 1 : k;
        if (end > start) runs.push([lerp(a, b, start / pickets), lerp(a, b, end / pickets)]);
        start = -1;
      }
    }
  }
  let gate = null;
  if (entrance && n > 6) {
    const dx = ring[6].x - ring[5].x, dy = ring[6].y - ring[5].y, d = Math.hypot(dx, dy) || 1, u = { x: dx / d * 2.6 * M, y: dy / d * 2.6 * M };
    gate = [{ x: entrance.x - u.x, y: entrance.y - u.y }, { x: entrance.x + u.x, y: entrance.y + u.y }];
  }
  const path = list(park.path).filter(point), benches = [];
  for (let i = 1; i < path.length - 1; i++) {
    const p = path[i], tx = path[i + 1].x - path[i - 1].x, ty = path[i + 1].y - path[i - 1].y, d = Math.hypot(tx, ty) || 1, t = { x: tx / d, y: ty / d }, nrm = { x: -t.y, y: t.x };
    let at = { x: p.x + nrm.x * 2.3 * M, y: p.y + nrm.y * 2.3 * M };
    if (!inside(at) || clearance(at) < 1.2 * M) at = { x: p.x - nrm.x * 2.3 * M, y: p.y - nrm.y * 2.3 * M };
    if (!inside(at) || clearance(at) < 1.2 * M) continue;
    benches.push([{ x: at.x - t.x * 0.95 * M, y: at.y - t.y * 0.95 * M }, { x: at.x + t.x * 0.95 * M, y: at.y + t.y * 0.95 * M }]);
  }
  return { runs, gate, path, benches, play: inside(PLAY) && clearance(PLAY) >= 3 * M };
}
// Park trees (make_tree_node, update_tree_sway): canopy radius 1.45 m x scale, Godot's leaf variants.
function treeGeometry(trees) {
  return list(trees).filter(point).map((t, i) => {
    const seed = ok(t.seed) ? Math.abs(Math.trunc(t.seed)) : i, scale = ok(t.scale) ? t.scale : 1.4 + (seed % 6) * 0.1, r = 1.45 * scale * M;
    return { x: t.x, y: t.y, r, trunk: 2.2 * scale * M, lower: LEAVES[seed % 3], upper: LEAVES[(seed + 1) % 3], phase: i * 1.37, scale };
  });
}
function drawPark(c, park, geometry, trees, t) {
  c.save();
  polygon(c, park.ring, PARK.lawn);
  if (geometry.path.length > 1) { c.lineCap = 'round'; c.lineJoin = 'round'; stroke(c, geometry.path, PARK.path, 2.4 * M); }
  if (geometry.runs.length) {
    c.beginPath();
    for (const [a, b] of geometry.runs) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    c.strokeStyle = PARK.iron; c.lineWidth = 1.2; c.stroke();
  }
  if (geometry.gate) {
    c.lineCap = 'butt'; stroke(c, geometry.gate, PARK.gate, 1.6);
    for (const p of geometry.gate) rect(c, p.x - 1.2, p.y - 1.2, 2.4, 2.4, PARK.iron);
  }
  c.lineCap = 'round';
  for (const bench of geometry.benches) stroke(c, bench, PARK.bench, 2.4);
  if (geometry.play) {
    c.save(); c.translate(PLAY.x, PLAY.y); c.rotate(MAP_ANGLE);
    rect(c, -3.4 * M, -3 * M, 6.8 * M, 6 * M, PARK.play);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) circle(c, sx * 1.1 * M, sz * 1.1 * M, 0.6, PARK.playPost);
    rect(c, -1.25 * M, -1.25 * M, 2.5 * M, 2.5 * M, PARK.playDeck);
    shape(c, [[0, -1.7 * M], [1.7 * M, 0], [0, 1.7 * M], [-1.7 * M, 0]], PARK.playRoof);
    rect(c, 1.25 * M, -0.25 * M, 1.95 * M, 0.5 * M, PARK.playRoof);
    c.restore();
  }
  const gust = 0.75 + 0.25 * Math.sin(t * 0.37);
  for (const tree of trees) {
    const sway = Math.sin(t * 0.95 + tree.phase * 1.7) * 0.045 * gust, top = tree.y - tree.trunk * 0.9;
    ellipse(c, tree.x + tree.r * 0.3, tree.y + 1, tree.r, tree.r * 0.45, SHADOW);
    rect(c, tree.x - 0.8, top, 1.6, tree.y - top, TREE.trunk);
    circle(c, tree.x + 0.85 * tree.scale * M * sway, top - 0.85 * tree.scale * M * 0.9, tree.r * 0.95, tree.lower);
    circle(c, tree.x + 0.28 * tree.scale * M + 1.75 * tree.scale * M * sway, top - 1.75 * tree.scale * M, tree.r * 0.66, tree.upper);
  }
  c.restore();
}
// The Larkin place (power_place.gd setup): #738492 walls under the #a4b6bc roof, in the 2D building look.
function drawLarkin(c, ring) {
  c.save();
  c.save(); c.translate(12, 19); polygon(c, ring, BUILDING_SHADOW); c.restore();
  c.save(); c.translate(0, 9); polygon(c, ring, LARKIN.wall); c.restore();
  polygon(c, ring, LARKIN.roof);
  c.restore();
}
// The museum at the Cadillac Hotel (build_street_life_decor, scale 1.75): gallery windows under
// the marquee, the blade sign and the kiosk.
function drawMuseum(c, m) {
  c.save(); c.translate(m.x, m.y); c.rotate(MAP_ANGLE);
  const K = MUSEUM_SCALE, box = (x, y, w, h, color) => rect(c, (x - w / 2) * K, (y - h / 2) * K, w * K, h * K, color, 1);
  box(-1.3, 1.1, 1.9, 0.4, DECOR.gallery0); box(1.3, 1.1, 1.9, 0.4, DECOR.gallery1);
  box(0, 0, 5.8, 1.8, DECOR.marquee);
  box(-2.6, 0.6, 0.45, 0.95, DECOR.blade);
  box(-0.35, 1.2, 0.75, 0.55, DECOR.kiosk);
  c.restore();
}
// The "So What" pieces: the 361 Turk canopy (6.4 x 1.8 m) with its eight chord bars, and the
// 145 Leavenworth canopy (1.6 x 4.2 m) under the creator's lit 8th-floor window.
function drawSoWhat(c, s) {
  c.save();
  if (point(s.awning)) {
    const { x, y } = s.awning;
    SO_WHAT_CHORDS.forEach((h, b) => { const horn = b === 4 || b === 6, w = (horn ? 0.54 : 0.34) * M, bx = x + (-2.45 + b * 0.7) * M; rect(c, bx - w / 2, y - 4.5 - h * 2 * M, w, h * 2 * M, horn ? DECOR.chordHorn : DECOR.chord); });
    rect(c, x - 3.2 * M, y - 0.9 * M, 6.4 * M, 1.8 * M, DECOR.soWhatCanopy, 1);
  }
  if (point(s.floor)) {
    const { x, y } = s.floor;
    rect(c, x - 0.8 * M, y - 2.1 * M, 1.6 * M, 4.2 * M, DECOR.soWhatCanopy, 1);
    rect(c, x + 0.74 * M, y - 0.83 * M, 0.16 * M, 0.56 * M, DECOR.chord); rect(c, x + 0.74 * M, y + 0.27 * M, 0.16 * M, 0.56 * M, DECOR.chordHorn);
    rect(c, x - 3, y - 2.1 * M - 20, 6, 9, DECOR.floorWindow, 1); rect(c, x - 3.5, y - 2.1 * M - 11, 7, 2, DECOR.balcony); circle(c, x + 1.5, y - 2.1 * M - 13.5, 1, DECOR.turntableLamp);
  }
  c.restore();
}
// An eatery front (build_street_life_decor): canopy_color awning over the label_color window glow.
function drawAwning(c, at, colors) {
  c.save(); c.translate(at.x, at.y); c.rotate(MAP_ANGLE);
  rect(c, -1.4 * M, -1.3 * M, 2.8 * M, 0.6 * M, colors.label, 1);
  rect(c, -1.9 * M, -0.7 * M, 3.8 * M, 1.4 * M, colors.canopy, 1);
  c.restore();
}
// Shared dishes (shared_meal.gd update_world) on the 2D gathering table: the Long Table slots, or a
// 2 x 2 grid on the serving cloth beside the Open Floor table; the far edge shifts as Godot's does.
function drawDishes(c, items, table) {
  const tx = 166 + table.cell.col * 53, ty = -28 + table.cell.row * 12; // world.js gathering item placement
  c.save();
  if (table.floor) rect(c, tx + CLOTH.x, ty + CLOTH.y, CLOTH.w, CLOTH.h, MEAL.cloth, 1);
  for (const d of items) {
    const slot = ok(d.slot) ? d.slot : TABLE_SLOTS[d.index];
    const x = table.floor ? tx + CLOTH.x + (-2.7 + (d.index % 2) * 1.4 + (d.other ? 0.2 : 0) + 3.2) * 10 : tx + 37.5 + (slot + (d.other ? 0.11 : 0)) * TABLE_PX;
    const y = table.floor ? ty + CLOTH.y + (0.3 + Math.trunc(d.index / 2) * 0.6 + (d.other ? -0.07 : 0) + 0.05) * 10 : ty + 4 + (d.other ? 0.15 : -0.18) * 12 / 0.9;
    const food = FOOD[d.index];
    if (d.serving === 1) for (const dx of [-1.6, 1.6]) { ellipse(c, x + dx, y, 1.6, 1.2, MEAL.rim); ellipse(c, x + dx, y, 1.2, 0.85, MEAL.plate); ellipse(c, x + dx, y - 0.1, 0.7, 0.45, food); }
    else { ellipse(c, x, y, 3, 2, MEAL.rim); ellipse(c, x, y, 2.3, 1.4, MEAL.plate); ellipse(c, x, y - 0.2, 1.4, 0.8, food); }
  }
  c.restore();
}

// --- actors ---
const actor = (y, draw) => ({ y, draw: (c, world) => { c.save(); draw(c, world); c.restore(); } });
const person = (world, x, y, coat, skin, hair) => world.person?.({ x, y, coat, skin, hair }, false);
// A surprise beacon (update_neighborhood_surprises_3d): the accent at 1.25x when found, else darkened 28%.
function beaconActors(markers) {
  return list(markers).filter(m => point(m) && typeof m.accent === 'string').map(m => {
    const r = m.found ? BEACON.radius * 1.25 : BEACON.radius, color = m.found ? m.accent : darken(m.accent, 0.28), shine = lighten(color, 0.55);
    return actor(m.y, c => {
      ellipse(c, m.x + 1, m.y + 1.5, 5, 2, SHADOW);
      stroke(c, [{ x: m.x, y: m.y }, { x: m.x, y: m.y - BEACON.lift }], SURPRISE.beacon, 1.2);
      circle(c, m.x, m.y - BEACON.lift, r, color);
      circle(c, m.x - r * 0.35, m.y - BEACON.lift - r * 0.35, r * 0.28, shine);
    });
  });
}
// Keepsakes on the paired neighbor (attach_neighbor_signature_prop, build_mural_board, build_rook_speaker), as small icons at the neighbor's side.
const ICONS = {
  mayor_pomp_event: (c, x, y) => { rect(c, x - 1.8, y, 1.4, 4, PROP.rosette); rect(c, x + 0.4, y, 1.4, 4, PROP.seal); circle(c, x, y, 3, PROP.rosette); circle(c, x, y, 1.7, PROP.seal); },
  good_donut_and_bagel: (c, x, y) => { rect(c, x - 4.5, y - 1, 9, 3.4, PROP.tray, 1); circle(c, x - 2.1, y - 1.2, 1.8, PROP.donut); circle(c, x - 2.1, y - 1.2, 0.6, PROP.tray); circle(c, x + 2.1, y - 1.2, 1.8, PROP.bagel); circle(c, x + 2.1, y - 1.2, 0.8, PROP.cream); },
  hidden_mural_145: (c, x, y) => { rect(c, x - 3.4, y - 4, 6.8, 8, PROP.sketchBack, 1); rect(c, x - 2.8, y - 3.4, 5.6, 6.8, PROP.sketchCanvas, 1); circle(c, x - 1, y - 0.6, 1.3, PROP.sketchHound); rect(c, x + 0.9, y - 1.6, 1.2, 3.6, PROP.sketchSax); },
  cutesy_dino: (c, x, y) => { rect(c, x - 3.5, y + 2, 7, 1.4, PROP.dinoLedge); shape(c, [[x - 1.2, y - 1], [x - 4.6, y + 1.4], [x - 1, y + 1.2]], PROP.dino); circle(c, x, y, 2.3, PROP.dino); circle(c, x + 1.6, y - 2.6, 1.7, PROP.dino); shape(c, [[x - 0.4, y - 3.6], [x + 0.6, y - 5.4], [x + 1.4, y - 3.6]], PROP.dinoCrest); },
  jeffrey_record: (c, x, y) => { rect(c, x - 1.6, y - 4.6, 4.4, 4.4, PROP.sleeve); rect(c, x - 4.2, y + 0.8, 8.4, 1.8, PROP.plinth); circle(c, x - 0.6, y - 0.4, 2.8, PROP.vinyl); circle(c, x - 0.6, y - 0.4, 1, PROP.vinylLabel); },
  clown_horn_walker: (c, x, y) => { shape(c, [[x - 1, y - 0.8], [x + 3.6, y - 2.6], [x + 3.6, y + 1.8], [x - 1, y + 0.6]], PROP.hornCone); circle(c, x - 1.8, y, 1.8, PROP.hornBulb); },
  viking_dirt_biker: (c, x, y) => { shape(c, [[x - 2, y - 0.6], [x - 3.8, y - 3.8], [x - 1.2, y - 1.4]], PROP.vikingHorn); shape(c, [[x + 2, y - 0.6], [x + 3.8, y - 3.8], [x + 1.2, y - 1.4]], PROP.vikingHorn); circle(c, x, y, 2.1, PROP.vikingDome); rect(c, x - 2.3, y + 0.2, 4.6, 1.2, PROP.vikingBand); },
  magic_carpet_chef: (c, x, y) => { rect(c, x - 4.2, y, 8.4, 2.4, PROP.carpet, 0.6); rect(c, x - 3.1, y + 0.5, 6.2, 1.4, PROP.medallion); shape(c, [[x - 1.8, y - 0.2], [x + 1.8, y - 0.2], [x + 1, y - 1.8], [x - 1, y - 1.8]], PROP.wok); },
  impromptu_drag_show: (c, x, y) => { for (let i = -2; i <= 2; i++) shape(c, [[x, y + 1.6], [x + i * 1.5 - 0.7, y - 3], [x + i * 1.5 + 0.7, y - 3]], ((i % 2) + 2) % 2 === 0 ? PROP.fanPink : PROP.fanTeal); rect(c, x - 1.6, y + 1.4, 3.2, 1.2, PROP.tiara); },
  bite_size_nachos: (c, x, y) => { rect(c, x - 3.2, y - 1.6, 3.4, 4.2, PROP.nachoBag, 0.6); shape(c, [[x - 2.6, y - 1.6], [x - 1.4, y - 4], [x - 0.2, y - 1.6]], PROP.nachoChip); rect(c, x + 1, y + 0.2, 2.4, 2.4, PROP.salsa, 0.6); },
};
function keepsakeActors(items) {
  return list(items).flatMap(k => {
    const n = neighbor(k?.neighbor), icon = ICONS[k?.id];
    if (!n || !icon) return [];
    const slot = Math.max(0, (PAIRS[n.id] ?? []).indexOf(k.id));
    return [actor(n.y + 0.01 + slot * 0.001, c => icon(c, n.x + 17, n.y - 21 + slot * 12))];
  });
}
// The docent, and the Time-Portal standing at museum-local (2.3, 0.8): three discs that turn
// edge-on with ringAngle (rotation_degrees.y), the lens in the era's colour in front.
function museumActors(m) {
  if (!point(m)) return [];
  const out = [], rings = list(m.rings), lens = typeof m.lens === 'string' ? m.lens : RINGS[0][1], x = m.x + PORTAL.x, base = m.y + PORTAL.y, y = base - 1.75 * MUSEUM_SCALE;
  const widths = RINGS.map(([r], i) => r * MUSEUM_SCALE * Math.max(Math.abs(Math.cos((ok(rings[i]) ? rings[i] : 0) * Math.PI / 180)), 0.06));
  out.push(actor(base, c => {
    RINGS.forEach(([r, color], i) => ellipse(c, x, y, widths[i], r * MUSEUM_SCALE, color));
    circle(c, x, y, 0.72 * MUSEUM_SCALE, lens);
  }));
  if (point(m.docent)) { const { x: dx, y: dy } = m.docent; out.push(actor(dy, (c, world) => person(world, dx, dy, DECOR.docentCoat, DECOR.docentSkin, DECOR.docentHair))); }
  return out;
}
// An open counter (build_eatery_counters, scale 1.4): the menu board on its posts and the host
// behind the counter, then the counter and its three stools in front.
function counterActors(eateries) {
  return list(eateries).flatMap(e => {
    const colors = EATERY[e?.index];
    if (!colors || !point(e.counter)) return [];
    const { x, y } = e.counter, host = HOSTS[e.index % HOSTS.length], K = COUNTER_SCALE;
    return [
      actor(y - 3, (c, world) => {
        for (const px of [-0.95, 0.95]) rect(c, x + px * K - 0.5, y - 44, 1, 38, COUNTER.stool);
        rect(c, x - 1.05 * K, y - 47, 2.1 * K, 6, COUNTER.board, 1);
        person(world, x, y - 3, colors.host, host.skin, host.hair);
      }),
      actor(y, c => {
        rect(c, x - 1.3 * K, y - 7, 2.6 * K, 7, COUNTER.counter, 1);
        rect(c, x - 1.42 * K, y - 8.2, 2.84 * K, 2, colors.top, 1);
        rect(c, x - 1.3 * K, y - 3, 2.6 * K, 1.4, colors.canopy);
        for (const sx of [-0.8, 0, 0.8]) circle(c, x + sx * K, y + 2.5, 1.4, colors.seat);
      }),
    ];
  });
}
// A dog (dog_story.gd make_dog), side on, in the 2D people's scale: DOG_LOOKS coat, collar, tag, ears and height.
function drawDog(c, x, y, look, colors, facing) {
  const A = ACTOR, h = look.height, part = (px, py, w, hh, color) => rect(c, (px - w / 2) * A, -(py + hh / 2) * A, w * A, hh * A, color, 1);
  c.translate(x, y); c.scale(facing, 1);
  ellipse(c, 0, 1, 10, 2.6, SHADOW);
  for (const lx of [-0.27, 0.27]) part(lx, h / 2 - 0.04, 0.13, h - 0.08, look.coat);
  part(-0.48, h + 0.14, 0.12, 0.35, look.coat);
  part(0, h, 0.85, 0.4, look.coat);
  part(0.25, h + 0.03, 0.1, 0.35, look.collar);
  if (look.tag === 'triangle') shape(c, [[0.26 * A, -(h - 0.04) * A], [0.19 * A, -(h - 0.17) * A], [0.33 * A, -(h - 0.17) * A]], DOG.tag);
  else circle(c, 0.26 * A, -(h - 0.12) * A, 0.06 * A, DOG.tag);
  circle(c, 0.4 * A, -(h + 0.22) * A, 0.17 * A, look.coat);
  part(0.59, h + 0.16, 0.25, 0.17, colors.muzzle);
  part(0.71, h + 0.18, 0.07, 0.07, DOG.nose);
  part(0.35, h + (look.ears === 'floppy' ? 0.13 : 0.45), 0.13, 0.29, colors.ear);
  circle(c, 0.49 * A, -(h + 0.28) * A, 0.03 * A, DOG.nose);
}
const DOG_COLORS = DOG_LOOKS.map(look => ({ muzzle: lighten(look.coat, 0.15), ear: darken(look.coat, 0.2) }));
function dogActors(part) {
  const owners = list(part?.owners).filter(o => point(o) && typeof o.coat === 'string');
  const dogs = list(part?.dogs).filter(d => point(d) && DOG_LOOKS[d.index]).map(d => actor(d.y, c => drawDog(c, d.x, d.y, DOG_LOOKS[d.index], DOG_COLORS[d.index], owners.length && d.index === 1 ? -1 : 1)));
  return [...dogs, ...owners.map(o => actor(o.y, (c, world) => person(world, o.x, o.y, o.coat, DOG.ownerSkin, DOG.ownerHair)))];
}
// The paper costume (lantern_procession.gd build_costumes): a cape behind the 2D person (Godot's
// shoulders 1.35 m, hem 0.64 m bat / 0.72 m star, centre 0.83 m), a paper lantern at the right hand.
const height = m => 4 - m * 23 / 1.35; // Godot heights on a 2D person: feet at +4, shoulders at -19
function drawCape(c, x, y, cape) {
  const hem = height(cape.star ? 0.72 : 0.64);
  c.translate(x, y);
  shape(c, [[-10, -19], [10, -19], [14, hem], [0, height(0.83)], [-14, hem]], cape.color);
  if (typeof cape.star === 'string') star(c, 11, hem - 4, 2.4, cape.star);
}
function drawLantern(c, x, y, lantern) {
  c.translate(x, y);
  stroke(c, [{ x: 12, y: height(1.05) - 2 }, { x: 12, y: height(0.82) - 3 }], lantern.handle, 1);
  rect(c, 9.5, height(0.82) - 3, 5, 6, lantern.paper, 1.2);
  if (lantern.mark === 'star') star(c, 12, height(0.82), 1.6, lantern.markColor);
  else circle(c, 12, height(0.82), 1.3, lantern.markColor);
}
function visitorActors(part) {
  if (!part?.cape || !part.lantern) return [];
  return list(part.visitors).filter(point).map(v => actor(v.y, (c, world) => {
    c.save(); drawCape(c, v.x, v.y, part.cape); c.restore();
    person(world, v.x, v.y, typeof v.coat === 'string' ? v.coat : part.cape.color, PARADE.visitorSkin, PARADE.visitorHair);
    c.save(); drawLantern(c, v.x, v.y, part.lantern); c.restore();
    if (typeof v.boat === 'string') { c.translate(v.x, v.y); shape(c, [[-8, height(0.78)], [3.2, height(0.78)], [1, height(0.62)], [-5.8, height(0.62)]], v.boat); }
  }));
}
// The player's costume and the election folio (voting_story.gd: 0.32 x 0.23 m at the chest), at
// the position the World draws the player.
function playerActors(world, scene) {
  const p = world.getState?.()?.player ?? scene.player;
  if (!point(p)) return [];
  const out = [], lantern = scene.lantern, election = scene.election;
  if (lantern?.cape && lantern.lantern) {
    out.push(actor(p.y - 0.001, c => drawCape(c, p.x, p.y, lantern.cape)));
    out.push(actor(p.y + 0.001, c => drawLantern(c, p.x, p.y, lantern.lantern)));
  }
  if (election?.folio) out.push(actor(p.y + 0.002, c => {
    c.translate(p.x, p.y);
    rect(c, -2.5, -17.5, 9, 6.5, election.palette === 1 ? FOLIO.cool : FOLIO.warm, 0.8);
    c.strokeStyle = FOLIO.ink; c.lineWidth = 0.8; c.strokeRect(-2.5, -17.5, 9, 6.5);
    stroke(c, [{ x: -1.5, y: -13 }, { x: 2, y: -15.5 }, { x: 5.5, y: -14.5 }], FOLIO.street, 1);
  }));
  return out;
}
// Power Story (power_story.gd setup, update_world): each relay's street lamp with its portable kit,
// and the Larkin battery stand. A lamp globe is lit by fixtureLit; a kit indicator by its relay.
function fixtures(power) {
  const given = list(power.fixtures);
  return i => (given.length > i ? !!(given[i]?.lit ?? given[i]) : !!(power.larkin || power.pools || power.relays?.[i]?.lit));
}
function powerActors(power) {
  if (!power || typeof power !== 'object') return [];
  const lit = fixtures(power), out = [];
  list(power.relays).forEach((r, i) => {
    if (!point(r)) return;
    const globe = lit(ok(r.index) ? r.index : i) ? POWER.warm : POWER.dark, kit = r.visible === false ? null : (r.lit ? POWER.warm : POWER.dark);
    out.push(actor(r.y, c => {
      ellipse(c, r.x + 2, r.y + 1.5, 5, 2, SHADOW);
      rect(c, r.x - 1, r.y - POLE, 2, POLE, DECOR.lampPole);
      circle(c, r.x, r.y - POLE - 3, 3.5, globe);
      if (kit) { rect(c, r.x - 3.5, r.y - 26, 7, 9, POWER.relay, 1.5); circle(c, r.x, r.y - 22.5, 1.8, kit); }
    }));
  });
  const stand = power.batteryStand;
  if (point(stand)) out.push(actor(stand.y, c => {
    ellipse(c, stand.x + 2, stand.y + 1.5, 9, 2.6, SHADOW);
    rect(c, stand.x - 8, stand.y - 1.5, 16, 3, POWER.battery, 1);
    rect(c, stand.x - 1, stand.y - 20, 2, 19, POWER.battery);
    rect(c, stand.x - 6, stand.y - 28, 12, 8, POWER.battery, 1.5);
    circle(c, stand.x, stand.y - 34, 5, stand.lit ? POWER.warm : POWER.dark);
  }));
  return out;
}

// --- overlay ---
// The festival's after-dark scene (apply_lighting: background #101b2b) as a translucent tint over
// the whole view, the warm pools once all three relays are back (light_pool_material alpha 1 when
// restored is 7), then the lit lamps and kits glowing through it.
function drawAfterDark(c, world, power) {
  c.save(); c.setTransform(world.ratio, 0, 0, world.ratio, 0, 0); c.globalAlpha = 0.45; c.fillStyle = NIGHT; c.fillRect(0, 0, world.width, world.height); c.restore();
  const lit = fixtures(power), relays = list(power.relays);
  if (power.pools) { c.save(); c.globalAlpha = GODOT_POOL.alpha; for (const r of relays) if (point(r)) ellipse(c, r.x, r.y + 1, GODOT_POOL.radius, GODOT_POOL.radius, GODOT_POOL.color); c.restore(); }
  const glow = (x, y, radius) => { c.save(); c.globalAlpha = 0.35; circle(c, x, y, radius * 2.6, POWER.warm); c.globalAlpha = 1; circle(c, x, y, radius, POWER.warm); c.restore(); };
  relays.forEach((r, i) => {
    if (!point(r)) return;
    if (lit(ok(r.index) ? r.index : i)) glow(r.x, r.y - POLE - 3, 3.5);
    if (r.lit && r.visible !== false) glow(r.x, r.y - 22.5, 1.8);
  });
}
// The guide marker (build_guide_marker, update_guide_marker): a gold diamond 30 screen px tall,
// bobbing and turning on world.time, hidden within 3.5 m of the player.
function drawTourMarker(c, world, m, t) {
  const p = world.getState?.()?.player;
  if (point(p) && Math.hypot(p.x - m.x, p.y - m.y) < 3.5 * M) return;
  const s = 30 / world.scale, k = Math.max(1, 1 / world.scale), spin = t * 1.4;
  const y = m.y - 70 * k - 0.5 * s + Math.sin(t * 2.6) * 0.14 * s, w = 0.36 * s * Math.max(Math.abs(Math.cos(spin)), Math.abs(Math.sin(spin)));
  c.save();
  shape(c, [[m.x, y - 0.5 * s], [m.x + w, y], [m.x - w, y]], GOLD);
  shape(c, [[m.x - w, y], [m.x + w, y], [m.x, y + 0.5 * s]], GOLD_LOW);
  c.restore();
}

// createSprites({ reducedMotion }) -> { ground(ctx, world, scene), actors(world, scene) -> [{ y, draw(ctx, world) }], overlay(ctx, world, scene) }.
export function createSprites({ reducedMotion = () => false } = {}) {
  const reduced = typeof reducedMotion === 'function' ? reducedMotion : () => !!reducedMotion;
  const motion = world => (reduced() ? 0 : (ok(world.time) ? world.time : 0));
  let labels = null;
  const text = () => (labels ??= labelTexts());
  // One build per scene part object: the producer keeps static parts across versions (R9).
  const caches = new Map();
  const once = (name, part, build) => {
    if (!part || typeof part !== 'object') return build(part);
    if (!caches.has(name)) caches.set(name, new WeakMap());
    const cache = caches.get(name);
    if (!cache.has(part)) cache.set(part, build(part));
    return cache.get(part);
  };
  const tables = new WeakMap();
  const table = state => {
    if (!state || typeof state !== 'object') return null;
    if (!tables.has(state)) {
      const scene = gatheringScene(state), cell = scene.items.find(item => item.id === 'table')?.cells?.[0];
      tables.set(state, cell ? { cell, floor: scene.layout === 'floor' } : null);
    }
    return tables.get(state);
  };
  return {
    ground(c, world, scene) {
      if (!scene || typeof scene !== 'object') return;
      const larkin = list(scene.larkin?.exterior).filter(point);
      if (larkin.length >= 3) drawLarkin(c, larkin);
      const park = scene.park;
      if (park && list(park.ring).length >= 3 && park.ring.every(point)) drawPark(c, park, once('park', park, parkGeometry), once('trees', park.trees, treeGeometry), motion(world));
      if (point(scene.museum)) drawMuseum(c, scene.museum);
      if (scene.soWhat && (point(scene.soWhat.awning) || point(scene.soWhat.floor))) drawSoWhat(c, scene.soWhat);
      for (const e of list(scene.eateries)) if (EATERY[e?.index] && point(e.awning)) drawAwning(c, e.awning, EATERY[e.index]);
      const dishes = list(scene.dishes).filter(d => d && Number.isInteger(d.index) && d.index >= 0 && d.index < FOOD.length);
      if (dishes.length) { const at = table(world.getState?.()); if (at) drawDishes(c, dishes, at); }
    },
    actors(world, scene) {
      if (!scene || typeof scene !== 'object') return [];
      return [
        ...once('beacons', scene.surprises, beaconActors), ...once('keepsakes', scene.keepsakes, keepsakeActors),
        ...once('museum', scene.museum, museumActors), ...once('counters', scene.eateries, counterActors),
        ...once('dogs', scene.dogs, dogActors), ...once('visitors', scene.lantern, visitorActors), ...once('power', scene.power, powerActors),
        ...playerActors(world, scene),
      ];
    },
    overlay(c, world, scene) {
      if (!scene || typeof scene !== 'object') return;
      if (scene.power?.afterDark) drawAfterDark(c, world, scene.power);
      if (world.scale >= CHIP_ZOOM) {
        const L = text(), k = Math.max(1, 1 / world.scale), say = (words, x, y, ink) => { if (words) chip(c, world, words, x, y, ink); };
        for (const m of list(scene.surprises)) if (point(m) && Object.hasOwn(L.surprise, m.id)) say(L.surprise[m.id], m.x, m.y - 50 * k, SURPRISE[m.id]);
        for (const e of list(scene.eateries)) {
          const colors = EATERY[e?.index];
          if (!colors || !point(e.awning)) continue;
          let y = e.awning.y - 10 * k;
          if (point(e.counter)) {
            const menu = e.counter.y - 46 * k;
            say(L.menu[e.index], e.counter.x, menu, colors.label);
            // The awning's own chip steps above an open counter's menu instead of covering it.
            if (Math.abs(e.counter.x - e.awning.x) < 120 * k && Math.abs(y - menu) < 25 * k) y = menu - 25 * k;
          }
          say(L.eatery[e.index], e.awning.x, y, colors.label);
        }
        if (scene.park && point(scene.park.entrance)) say(L.park, scene.park.entrance.x, scene.park.entrance.y - 34 * k, PARK.label);
        if (point(scene.soWhat?.awning)) say(L.soWhatAwning, scene.soWhat.awning.x, scene.soWhat.awning.y - 20 * k, DECOR.soWhatLabel);
        if (point(scene.soWhat?.floor)) say(L.soWhatFloor, scene.soWhat.floor.x, scene.soWhat.floor.y - 2.1 * M - 26 * k, DECOR.floorLabel);
        if (point(scene.museum)) {
          say(L.museum, scene.museum.x, scene.museum.y - 50 * k, DECOR.museumLabel);
          say(L.portal, scene.museum.x + PORTAL.x, scene.museum.y - 23 * k, DECOR.portalLabel);
        }
      }
      if (point(scene.tourMarker)) drawTourMarker(c, world, scene.tourMarker, motion(world));
    },
  };
}
