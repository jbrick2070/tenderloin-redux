import { BOUNDS, LITTER, project, streetDistance, progress, SIGNS } from './core.js';
import { Camera } from './camera.js';
import { BLACK_HAWK, WEST_INTERSECTIONS, WEST_FACADES } from './history.js';
import { drawDistrict } from './district.js';
import { gatheringScene, guestMotion, visitorPoint, hostingVisitorCells } from './gathering.js';
import { programmeIssue, segment } from './programme.js';
import { currentActivity, hostedResult, hostingGuests, TILE_PALETTES } from './hosting.js';

export const NEIGHBORS = [
  { id: 'bea', name: 'Bea', role: 'The one with the plan', x: 117, y: -49, coat: '#c5874f', skin: '#966345', hair: '#dad7c6', rollator: true },
  { id: 'celeste', name: 'Celeste', role: 'Signs, paint & possibility', x: 360, y: -50, coat: '#c87d82', skin: '#8b5b3f', hair: '#383c32' },
  { id: 'rook', name: 'Rook', role: 'Good ears. Better stories.', x: 578, y: 18, coat: '#547a79', skin: '#a97650', hair: '#3f352c', hat: true },
  { id: 'dez', name: 'Dez', role: 'Always making a beat', x: 647, y: -47, coat: '#978aaf', skin: '#704b37', hair: '#292f2b', headphones: true },
  { id: 'thanh', name: 'Thanh', role: 'Neighbor & supply lender', x: 44, y: 131, coat: '#b59b5d', skin: '#c38c65', hair: '#454236' },
];
export const PLACES = [
  { id: 'layout', name: 'Gathering layout', x: 258, y: -18, icon: '↔' },
  { id: 'mural', name: 'Neighbor-made mural', x: 449, y: -49, icon: '✳' },
  BLACK_HAWK,
  { id: 'history', name: 'A corner with a history', x: -48, y: -49, icon: 'i' },
];
export const PALETTE_COLORS = { garden: ['#c37e71', '#276a5a', '#d6a449'], sunset: ['#cb7752', '#975a7c', '#dfb75f'], ocean: ['#508a9b', '#28665f', '#d3ab77'] };
export const makeWays = data => data.ways.map(way => ({ ...way, points: way.geometry.map(project) }));

// Rendering and hit testing share the same label geometry, including the tiny
// overview's shortened history label. The geographic marker never moves.
export function objectLabel(object, scale) {
  const size = Math.max(1, 1 / scale);
  if (object.id === 'blackhawk') return { text: scale < .22 ? 'Black Hawk' : 'Black Hawk · history stop', x: object.x + (scale < .22 ? 250 : 0), y: object.y - 44 * size };
  if (scale >= .22 && NEIGHBORS.some(n => n.id === object.id)) return { text: object.name, x: object.x, y: object.y - 43 * size };
  return null;
}

export class World {
  constructor(canvas, ways, getState, callbacks) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.ways = ways; this.getState = getState; this.callbacks = callbacks;
    this.hover = null; this.target = null; this.path = []; this.time = 0; this.motion = false; this.reducedMotion = callbacks.reducedMotion ?? true;
    this.districtVisible = false; this.districtPolygons = [];
    this.resize = new ResizeObserver(() => this.measure()); this.resize.observe(canvas);
    this.pointers = new Set();
    canvas.addEventListener('pointermove', event => {
      if (this.drag?.id === event.pointerId) {
        if (Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 8) this.drag.moved = true;
        if (this.drag.moved) { this.camera.pan(event.clientX - this.drag.x, event.clientY - this.drag.y); callbacks.camera?.(); }
        this.drag.x = event.clientX; this.drag.y = event.clientY;
      }
      this.hover = this.drag?.moved || event.pointerType === 'touch' ? null : this.hit(this.toWorld(event));
      canvas.style.cursor = this.drag?.moved ? 'grabbing' : this.hover ? 'pointer' : 'grab';
    });
    canvas.addEventListener('pointerleave', () => { this.hover = null; });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); canvas.focus({ preventScroll: true });
      try { canvas.setPointerCapture(event.pointerId); } catch { return; }
      this.pointers.add(event.pointerId);
      this.drag = this.pointers.size === 1 ? { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false } : null;
    });
    const release = event => {
      if (!this.pointers.has(event.pointerId) || (event.type === 'pointerup' && event.button !== 0)) return;
      const tap = event.type === 'pointerup' && this.pointers.size === 1 && this.drag?.id === event.pointerId && !this.drag.moved;
      this.pointers.delete(event.pointerId); this.drag = null;
      if (event.pointerType !== 'mouse') this.hover = null;
      if (tap) { const p = this.toWorld(event); callbacks.click(p, this.hit(p)); }
    };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', event => { if (!this.pointers.has(event.pointerId)) return; this.pointers.delete(event.pointerId); this.drag = null; if (event.pointerType !== 'mouse') this.hover = null; });
    this.measure();
  }
  measure() {
    const rect = this.canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width; this.height = rect.height; this.ratio = ratio;
    const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    if (this.camera) this.camera.resize(rect.width, rect.height);
    else this.camera = new Camera(rect.width, rect.height, this.getState().player);
    this.callbacks.camera?.();
    this.draw(this.time, this.reducedMotion ?? true);
  }
  get scale() { return this.camera.scale; }
  get offset() { return this.camera.offset; }
  toWorld(event) { const r = this.canvas.getBoundingClientRect(); return this.camera.toWorld(event.clientX - r.left, event.clientY - r.top); }
  objects() {
    const state = this.getState();
    return [...NEIGHBORS, ...PLACES, ...LITTER.filter(item => !state.litter.includes(item.id)).map(item => ({ ...item, name: item.label }))];
  }
  hit(p) {
    const radius = Math.max(28, 22 / this.scale), labelScale = Math.max(1, 1 / this.scale);
    const hits = this.objects().map(o => {
      const chip = objectLabel(o, this.scale);
      const label = !!chip && Math.abs(p.x - chip.x) < (chip.text.length * 7 + 20) / 2 * labelScale && p.y > chip.y - 19 * labelScale && p.y < chip.y + 4 * labelScale;
      return { object: o, label, distance: label ? Math.hypot(p.x - chip.x, p.y - (chip.y - 7.5 * labelScale)) : Math.hypot(p.x - o.x, p.y - o.y) };
    }).filter(hit => hit.label || hit.distance < radius);
    return hits.sort((a, b) => Number(b.label) - Number(a.label) || a.distance - b.distance)[0]?.object;
  }
  nearest() { const p = this.getState().player; return this.objects().map(o => ({ ...o, distance: Math.hypot(p.x - o.x, p.y - o.y) })).filter(o => o.distance < 40).sort((a, b) => a.distance - b.distance)[0]; }
  rect(x, y, w, h, color, radius = 0) { const c = this.ctx; c.fillStyle = color; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, radius); else c.rect(x, y, w, h); c.fill(); }
  line(points, color, width, dash = []) {
    const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
  }
  text(text, x, y, size = 12, color = '#334d43', family = 'sans-serif', align = 'left') { const c = this.ctx; c.font = `${size}px ${family}`; c.fillStyle = color; c.textAlign = align; c.fillText(text, x, y); }
  circle(x, y, r, color) { const c = this.ctx; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
  building(x, y, w, h, roof, face, seed) {
    const c = this.ctx;
    this.rect(x + 12, y + 19, w, h, '#5b665728', 2);
    this.rect(x, y + 9, w, h, face, 2);
    this.rect(x, y, w, h - 18, roof, 2);
    this.rect(x + 7, y + 7, w - 14, h - 33, '#ffffff0c', 1);
    c.strokeStyle = '#4e534b30'; c.lineWidth = 2; c.strokeRect(x + 8, y + 8, w - 16, h - 34);
    for (let wx = x + 14; wx < x + w - 9; wx += 23) {
      this.rect(wx, y + h - 16, 12, 17, '#3e5c5660', 1); this.rect(wx + 2, y + h - 14, 3, 6, '#dfd5b180');
    }
    const count = Math.floor(w / 65);
    for (let i = 0; i < count; i++) {
      const sx = x + 22 + i * 61, sy = y + 30 + (seed % 3) * 11;
      this.rect(sx + 3, sy + 4, 29, 39, '#334e3e18', 2);
      this.rect(sx, sy, 29, 39, '#a2b0a1', 2);
      this.rect(sx + 3, sy + 3, 23, 30, '#c9d4c8', 1);
      this.line([{ x: sx + 14, y: sy + 3 }, { x: sx + 14, y: sy + 34 }], '#879e91', 2);
      this.line([{ x: sx + 3, y: sy + 18 }, { x: sx + 26, y: sy + 18 }], '#879e91', 2);
    }
    if (h > 200) {
      this.rect(x + w - 50, y + h - 100, 28, 33, '#7c84735c', 2);
      for (let i = 0; i < 5; i++) this.rect(x + w - 47, y + h - 96 + i * 5, 22, 2, '#d1d1b67a');
    }
  }
  tree(x, y, size = 20) {
    this.circle(x + 8, y + 7, size, '#324f3a18');
    this.rect(x - 2, y - 5, 4, 21, '#7f6b4e', 1);
    this.circle(x, y - 12, size, '#617e5c'); this.circle(x - size / 2, y - 11, size * .7, '#7b9569'); this.circle(x + size / 3, y - 21, size * .66, '#8fa577');
    this.circle(x - 5, y - 21, 3, '#b7b87d'); this.circle(x + 9, y - 13, 2, '#bdc190');
  }
  person(person, player = false) {
    const c = this.ctx, { x, y } = person;
    const dance = guestMotion(person, this.time, this.reducedMotion);
    const walk = player && this.motion ? Math.sin(this.time * 12) * 2 : dance * 1.5;
    c.save(); c.translate(x, y);
    c.fillStyle = '#304b3e2a'; c.beginPath(); c.ellipse(3, 4, 11, 5, 0, 0, Math.PI * 2); c.fill();
    if (player) { c.strokeStyle = '#f8f0d5'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 4, 13, 6, 0, 0, Math.PI * 2); c.stroke(); }
    this.rect(-6, -4 + walk, 4, 8, '#34463f', 1); this.rect(2, -4 - walk, 4, 8, '#34463f', 1);
    this.rect(-9, -19, 18, 18, person.coat || '#f0ce77', 5);
    this.rect(-11, -16 - dance * 3, 4, 14, person.skin || '#b67f5d', 2); this.rect(7, -16 + dance * 3, 4, 14, person.skin || '#b67f5d', 2);
    this.circle(0, -25, 8, person.skin || '#b67f5d');
    c.beginPath(); c.arc(0, -27, 8, Math.PI, Math.PI * 2); c.fillStyle = person.hair || '#34392f'; c.fill();
    if (person.hat) { this.rect(-10, -32, 20, 4, '#c1aa7c', 2); this.rect(-6, -37, 12, 6, '#b5986c', 2); }
    if (person.headphones) { c.strokeStyle = '#dfc57f'; c.lineWidth = 3; c.beginPath(); c.arc(0, -26, 9, Math.PI, Math.PI * 2); c.stroke(); this.rect(-10, -28, 3, 8, '#dfc57f', 1); this.rect(7, -28, 3, 8, '#dfc57f', 1); }
    if (person.rollator) {
      this.line([{ x: -12, y: -8 }, { x: -16, y: 5 }, { x: 7, y: 5 }, { x: 5, y: -8 }], '#51685b', 3); this.rect(-13, -2, 16, 6, '#7e947d', 2); this.circle(-14, 7, 3, '#4d5348'); this.circle(6, 7, 3, '#4d5348');
    }
    c.restore();
  }
  chip(text, x, y, color = '#fcf5df') {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(Math.max(1, 1 / this.scale), Math.max(1, 1 / this.scale)); x = 0; y = 0;
    c.font = '11px "Segoe UI", sans-serif'; const w = c.measureText(text).width + 20;
    this.rect(x - w / 2 + 1, y - 17, w, 23, '#233d3812', 4); this.rect(x - w / 2, y - 19, w, 23, color, 4); this.text(text, x, y - 3, 11, '#344e40', '"Segoe UI", sans-serif', 'center');
    c.restore();
  }
  draw(time, reducedMotion) {
    this.reducedMotion = reducedMotion;
    this.time = reducedMotion ? 0 : time;
    this.camera.track(this.getState().player);
    const c = this.ctx, state = this.getState(), p = progress(state), s = this.scale;
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); c.clearRect(0, 0, this.width, this.height); c.fillStyle = '#d9ddc9'; c.fillRect(0, 0, this.width, this.height);
    c.translate(this.offset.x, this.offset.y); c.scale(s, s);
    // Street centerlines are projected OSM data; all widths and decorations are authored approximations.
    for (const way of this.ways) this.line(way.points, '#afb9a0', 121);
    for (const way of this.ways) this.line(way.points, '#e6deca', 116);
    for (const way of this.ways) this.line(way.points, '#b6bba6', 76);
    for (const way of this.ways) this.line(way.points, '#e3e0c766', 2, [14, 18]);
    for (const way of this.ways.filter(w => w.name === 'Turk Street')) this.line(way.points.map(p => ({ x: p.x, y: p.y + 32 })), '#8dafa1', 9);
    // Original schematic scenery, not a reconstruction of current tenants or the club.
    for (const { x, width } of WEST_FACADES) {
      this.building(x, -455, width, 373, '#bac2b0', '#8e9f89', 2);
      this.building(x, 88, width, 180, '#ceb698', '#aa9077', 1);
    }
    this.building(-305, -455, 223, 373, '#d0ba97', '#b09d7e', 1);
    this.building(83, -455, 152, 374, '#b5c3b5', '#889b8b', 2);
    this.building(239, -455, 142, 374, '#c6b897', '#a78f70', 3);
    this.building(385, -455, 159, 374, '#c8a595', '#ac897c', 2);
    this.building(548, -455, 110, 374, '#c7c5ac', '#aaab90', 4);
    this.building(-305, 88, 223, 180, '#afc1b2', '#869d8b', 2);
    this.building(83, 88, 176, 184, '#d5b991', '#b39169', 1);
    this.building(263, 88, 220, 184, '#bac2b7', '#8d9d8c', 3);
    this.building(487, 88, 174, 184, '#cab3a1', '#aa8d78', 2);
    this.building(817, -455, 150, 371, '#c2b999', '#9e9879', 1);
    // Original, schematic awnings and rooftop details; no real shop or facade is reproduced.
    for (const [x, w, color] of [[93, 113, '#58776a'], [253, 104, '#a27d56'], [402, 116, '#a77777'], [560, 80, '#697d68']]) {
      this.rect(x, -94, w, 13, color, 1); for (let j = x + 4; j < x + w; j += 16) this.rect(j, -94, 6, 13, '#f7e6bc44', 0);
    }
    if (this.districtVisible) drawDistrict(c, this.districtPolygons, s, BOUNDS);
    for (const cross of WEST_INTERSECTIONS) {
      c.save(); c.translate(cross.x + 8, -230); c.rotate(-Math.PI / 2);
      this.text(cross.name.toUpperCase(), 0, 0, 12 * Math.max(1, 1 / this.scale), '#4d6558', 'sans-serif', 'center'); c.restore();
    }
    this.text('TURK STREET · HISTORY WALK', -1100, 6, 12, '#4d6558', 'sans-serif', 'center');
    this.text('THE TRANSGENDER', 365, -258, 15, '#4e696466', 'Georgia,serif', 'center'); this.text('DISTRICT', 365, -236, 23, '#4e696466', 'Georgia,serif', 'center');
    this.text('A NEIGHBORHOOD OF MANY STORIES', 365, -211, 7.7, '#4e696466', 'sans-serif', 'center');
    this.tree(-59, -139, 21); this.tree(-60, -326, 19); this.tree(61, -335, 20); this.tree(61, -196, 18); this.tree(253, -60, 19); this.tree(562, -59, 18); this.tree(675, -203, 22);
    this.tree(185, 62, 20); this.tree(402, 62, 19); this.tree(-141, 62, 22); this.tree(675, 133, 20);
    for (const x of [-67, 62]) for (let yy = -34; yy < 40; yy += 14) this.rect(x - 7, yy, 14, 6, '#f6f0dd', 1);
    for (const y of [-58, 53]) for (let xx = -30; xx < 37; xx += 13) this.rect(xx, y - 6, 6, 13, '#f6f0dd', 1);
    this.text('T U R K   S T R E E T', -240, 5, 10, '#4d655865');
    c.save(); c.translate(6, -314); c.rotate(-Math.PI / 2); this.text('T A Y L O R   S T R E E T', 0, 0, 10, '#4d655865', 'sans-serif', 'center'); c.restore();
    c.save(); c.translate(745, -295); c.rotate(-Math.PI / 2); this.text('M A S O N   S T', 0, 0, 10, '#4d655865', 'sans-serif', 'center'); c.restore();
    // Fictional portable closure, east of the Compton's corner. Bike edge stays clear.
    this.rect(143, -34, 480, 58, state.opened ? '#dbc69b66' : '#d4c6a14d', 9);
    this.line([{ x: 150, y: -2 }, { x: 617, y: -2 }], '#e5efd080', 10, [8, 6]);
    for (const x of [139, 628]) { this.rect(x - 3, -23, 6, 38, '#bd8761', 2); this.rect(x - 7, 9, 14, 5, '#647a62', 1); this.rect(x - 7, -27, 14, 5, '#647a62', 1); }
    const hostedArt = hostedResult(state.hosting, 'art') || (currentActivity(state.hosting) === 'art' ? state.hosting.draft : null);
    if (hostedArt) {
      this.rect(275, -81, 51, 31, '#735b46', 1);
      hostedArt.tiles.forEach((tile, i) => {
        const x = 278 + i % 3 * 15, y = -78 + Math.floor(i / 3) * 13;
        this.rect(x, y, 13, 11, TILE_PALETTES[hostedArt.palette][tile], 1);
        if (tile === 0) this.circle(x + 6, y + 5, 3, '#f8ecd9');
        else if (tile === 1) this.line([{ x: x + 2, y: y + 7 }, { x: x + 6, y: y + 3 }, { x: x + 11, y: y + 6 }], '#f8ecd9', 1.5);
        else { c.fillStyle = '#f8ecd9'; c.beginPath(); c.moveTo(x + 3, y + 8); c.lineTo(x + 6, y + 2); c.lineTo(x + 10, y + 8); c.fill(); }
      });
      this.rect(278, -50, 3, 9, '#735b46'); this.rect(320, -50, 3, 9, '#735b46');
    }
    const boardOrder = state.hosting.order.length ? state.hosting.order : state.programme.published;
    if (!programmeIssue(boardOrder)) {
      // An original portable board beside the fictional panel, above the walking corridor.
      this.rect(506, -85, 31, 32, '#735b46', 2); this.rect(509, -82, 25, 26, '#f8ecd9', 1);
      boardOrder.forEach((id, i) => this.rect(511, -80 + i * 6, 21, 4, segment(id).color, 1));
      this.rect(509, -53, 3, 7, '#735b46'); this.rect(531, -53, 3, 7, '#735b46');
    }
    const flagColors = ['#87c5d4', '#dfa3af', '#f8ecd9', '#dfa3af', '#87c5d4', '#d9b65b'];
    this.line([{ x: 152, y: -74 }, { x: 376, y: -57 }, { x: 620, y: -73 }], '#596d5c', 1.5);
    for (let i = 0; i < 21; i++) {
      const x = 160 + i * 22, y = -73 + Math.sin(i / 20 * Math.PI) * 16, sway = reducedMotion ? 0 : Math.sin(time * 1.1 + i) * 1.2;
      c.fillStyle = flagColors[i % flagColors.length]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 12, y + sway); c.lineTo(x + 6, y + 14 + sway); c.fill();
    }
    this.rect(435, -80, 37, 22, '#b38a5f', 1); this.rect(438, -78, 31, 17, '#f4e2b6', 1);
    for (const [id, cell] of Object.entries(state.mural)) this.text(SIGNS[id], 440 + cell.col * 4, -73 + cell.row * 5, id === 'rise' ? 4 : 7, PALETTE_COLORS[state.palette][['sun', 'wave', 'rise'].indexOf(id)]);
    this.rect(437, -57, 3, 9, '#916f49'); this.rect(467, -57, 3, 9, '#916f49');
    if (!state.epilogue.returned.includes('paint-case')) { this.rect(479, -55, 14, 9, '#a87856', 2); this.rect(483, -58, 6, 3, '#765e43', 1); }

    if (this.sceneState !== state) { this.sceneState = state; this.scene = gatheringScene(state); this.hostCells = state.hosting.order.length ? hostingVisitorCells(state) : []; }
    const scene = this.scene;
    for (const item of scene.items) {
      const id = item.id, pos = item.cells[0];
      const x = 166 + pos.col * 53, y = -28 + pos.row * 12;
      if (id === 'table') {
        this.rect(x + 1, y + (state.layout === 'floor' ? -4 : 7), state.layout === 'floor' ? 20 : 72, state.layout === 'floor' ? 20 : 10, '#5a634a25', 3); this.rect(x, y - 2, state.layout === 'floor' ? 20 : 75, state.layout === 'floor' ? 22 : 12, '#b98a58', 2); this.rect(x + 4, y - 1, state.layout === 'floor' ? 12 : 67, 3, '#d6af76');
        for (let k = 0; k < 3; k++) this.circle(x + 9 + k * (state.layout === 'floor' ? 0 : 24), y + 5 + k * (state.layout === 'floor' ? 6 : 0), 2, '#e8d7ab');
      } else if (id === 'seats') for (let k = 0; k < 4; k++) { this.rect(x + k * 18, y, 12, 9, '#6b8b72', 2); this.rect(x + k * 18, y - 3, 12, 3, '#94ac87', 1); }
      else { this.rect(x, y - 10, 14, 22, '#46574d', 2); this.circle(x + 7, y + 4, 4, '#2f3c34'); this.circle(x + 7, y - 5, 2, '#9eac8d'); this.rect(x + 20, y + 4, 30, 5, '#596e5b', 1); }
    }
    for (const item of LITTER.filter(item => !state.litter.includes(item.id))) {
      this.circle(item.x, item.y, 10, '#faf0d866');
      if (item.kind === 'cup') { this.rect(item.x - 3, item.y - 5, 6, 10, '#f4eedb', 1); this.rect(item.x - 4, item.y - 5, 8, 2, '#b7aa87', 1); }
      else { c.save(); c.translate(item.x, item.y); c.rotate(.4); this.rect(-6, -3, 12, 6, item.kind === 'paper' ? '#e0b2a0' : '#e3c870', 1); c.restore(); }
    }
    if (this.path.length) {
      this.line([state.player, ...this.path], '#456e5a85', 2, [3, 7]); const last = this.path.at(-1); this.circle(last.x, last.y, 4, '#467c65');
    }
    const visitorStyles = [{ coat: '#b16d67', skin: '#be8b60', hair: '#4a4239' }, { coat: '#7f9776', skin: '#a27353', hair: '#666251' }, { coat: '#987b9e', skin: '#b88668', hair: '#373d34' }];
    const visitors = (hostingGuests(state.hosting, this.hostCells) || scene.guests).map((guest, i) => ({ ...guest, ...visitorStyles[i], ...visitorPoint(guest) }));
    if (state.hosting.order.length && (!currentActivity(state.hosting) || currentActivity(state.hosting) === 'pause')) for (const guest of visitors) this.rect(guest.x - 7, guest.y + 4, 14, 4, '#75907c', 1);
    const people = [...NEIGHBORS, ...visitors, { ...state.player, id: 'player' }].sort((a, b) => a.y - b.y);
    people.forEach(person => this.person(person, person.id === 'player'));
    for (const person of NEIGHBORS) {
      const label = objectLabel(person, this.scale);
      if (label) this.chip(label.text, label.x, label.y, this.hover?.id === person.id ? '#f2d28f' : '#f7f0db');
    }
    for (const place of PLACES) {
      this.circle(place.x, place.y - (place.id === 'history' ? 14 : 2), 11, '#f8f2d8'); this.text(place.icon, place.x, place.y + (place.id === 'history' ? -10 : 2), 13, '#3c6c56', 'sans-serif', 'center');
    }
    const historyLabel = objectLabel(BLACK_HAWK, this.scale);
    this.chip(historyLabel.text, historyLabel.x, historyLabel.y, '#f7f0db');
    this.chip(state.hosting.order.length ? currentActivity(state.hosting) ? `Second afternoon · ${segment(currentActivity(state.hosting)).name}` : 'A programme shared' : state.epilogue.packing ? 'An afternoon well spent' : state.opened ? state.layout === 'table' ? 'The Long Table' : 'The Open Floor' : 'The gathering', 314, 64, state.opened ? '#d5e5ca' : '#f4e4bb');
    if (this.hover) this.chip(this.hover.name, this.hover.x, this.hover.y + 37, '#fff5d9');
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
  }
}
