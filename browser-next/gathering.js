import { FURNITURE, canPlaceFurniture, occupiedCells } from './core.js';
import { t, format, fillNamed, FLAVORS } from './i18n.js';

// The gathering's own text (fork-authored): supply labels, the scene's title and caption, and the plan picture.
export const GATHERING_TEXT = {
  labels: { table: 'Table', seats: 'Seats', speaker: 'Speaker' },
  titles: { table: 'Long Table · Stories across the table', floor: 'Open Floor · A little room to move' },
  captions: {
    packedSome: 'The gathering has wound down. Seats are folded; the remaining table and speaker positions are shown.',
    paintCase: 'The table and speaker are home. Celeste’s paint case still needs returning beside the mural.',
    packedAll: 'The supplies are home. The shared afternoon stays in your field notes.',
    placed: 'Visitors gather near the table you placed, making room for conversation.',
    table: 'Visitors gather around the Long Table, making room for conversation.',
    floor: 'Visitors spread through free spots at the edges, leaving room for a little movement.',
    preparing: 'Your arrangement is taking shape. Visitors arrive when the gathering opens.',
  },
  plan: {
    desc: 'Current fictional gathering plan, 8 columns by 5 rows. Row 3 is the clear through-route. {caption} Activity markers represent anonymous fictional visitors, not a photograph.',
    heading: 'YOUR GATHERING · CURRENT PLAN',
    route: 'KEEP THIS ROUTE CLEAR',
    table: '···  Conversation by the table',
    floor: '♪  Movement at the edges',
    packing: 'Packed supplies leave the plan as you return them',
    preparing: 'Visitors join after opening',
    footer: 'Authored event plan · not a street survey or a keepsake picture',
  },
};
const LABELS = GATHERING_TEXT.labels;
const NAMED = { ...FLAVORS.named, legacy: (template, [values]) => fillNamed(template, values) };
const fill = (template, values) => format(template, [values], NAMED);
// An image SVG does not inherit the page's fonts or direction, so a locale passes its own (I3). The defaults are today's bytes.
const svgDir = dir => dir === 'rtl' || dir === 'ltr' ? ` direction="${dir}"` : '';
const COLORS = { table: '#bd9665', seats: '#75907c', speaker: '#526d65' };
const distance = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row) * 1.5;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
// Authored clearances for the fixed resident/marker anchors and Rook's label.
// Ten outer cells remain, so even six occupied supply cells leave at least four spots.
const RESERVED = new Set(['1,0', '3,0', '5,0', '7,0', '1,4', '7,4']);
export const visitorPoint = guest => ({ x: 166 + (guest.col + .5) * 53, y: -32 + guest.row * 12 });
export function freeVisitorCells(items) {
  const occupied = new Set(items.flatMap(item => item.cells.map(p => `${p.col},${p.row}`)));
  return [0, 4].flatMap(row => Array.from({ length: 8 }, (_, col) => ({ col, row }))).filter(p => !occupied.has(`${p.col},${p.row}`) && !RESERVED.has(`${p.col},${p.row}`));
}
export function hostingVisitorCells(state) {
  // Retain the opening supply footprints while loans are packed/returned, so a quiet
  // gathering does not move people when another chapter's supplies disappear.
  return freeVisitorCells(gatheringScene({ ...state, epilogue: { ...state.epilogue, packing: false, returned: [] } }).items);
}

// A block opened in Godot (or opened before every supply was placed) has no 2D arrangement: it gets this default.
export const DEFAULT_FURNITURE = { table: { table: { col: 3, row: 3 }, seats: { col: 3, row: 1 }, speaker: { col: 6, row: 0 } }, floor: { table: { col: 0, row: 3 }, seats: { col: 0, row: 0 }, speaker: { col: 6, row: 0 } } };
const GRID = Array.from({ length: 40 }, (_, i) => ({ col: i % 8, row: Math.floor(i / 8) }));
export function sceneFurniture(state) {
  const layout = state.layout === 'floor' ? 'floor' : 'table', accepted = {}, fits = (id, p) => canPlaceFurniture({ layout, furniture: accepted }, id, p.col, p.row);
  for (const id of FURNITURE) {
    const p = state.furniture?.[id];
    if (p && fits(id, p)) accepted[id] = { col: p.col, row: p.row };
  }
  if (state.opened) for (const id of FURNITURE) {
    const p = accepted[id] ? null : [DEFAULT_FURNITURE[layout][id], ...GRID].find(cell => fits(id, cell));
    if (p) accepted[id] = { col: p.col, row: p.row };
  }
  return accepted;
}

// Presentation derived from existing choices. No new progress, save fields or street coordinates.
export function gatheringScene(state) {
  const layout = state.layout === 'floor' ? 'floor' : 'table';
  const packing = !!state.epilogue?.packing, returned = state.epilogue?.returned || [];
  const accepted = sceneFurniture(state);
  const items = FURNITURE.filter(id => accepted[id] && !(packing && (id === 'seats' || returned.includes(id)))).map(id => ({ id, label: t(LABELS[id]), cells: occupiedCells(id, accepted[id], layout).map(p => ({ ...p })) }));
  const active = !!state.opened && !packing && FURNITURE.every(id => accepted[id]);
  // Visitors stay along the outer edges: the through-route and bike edge remain clear.
  const free = freeVisitorCells(items);
  const guests = [];
  if (active) {
    const table = accepted.table;
    const anchor = { col: table.col + .5, row: table.row };
    while (guests.length < 3 && free.length) {
      free.sort((a, b) => {
        const score = p => layout === 'table' ? -distance(p, anchor) : guests.length ? Math.min(...guests.map(g => distance(p, g))) : -distance(p, { col: 3.5, row: 4 });
        return score(b) - score(a) || a.row - b.row || a.col - b.col;
      });
      guests.push({ ...free.shift(), id: `visitor-${guests.length + 1}`, pose: layout === 'table' ? 'talk' : 'dance' });
    }
  }
  const title = t(GATHERING_TEXT.titles[layout]);
  // "You placed" only for the player's own table; a default or Godot-opened arrangement was not placed by anyone.
  const placed = !!sceneFurniture({ ...state, opened: false }).table;
  const C = GATHERING_TEXT.captions;
  const caption = t(packing ? items.length ? C.packedSome : !returned.includes('paint-case') ? C.paintCase : C.packedAll : active ? layout === 'table' ? placed ? C.placed : C.table : C.floor : C.preparing);
  return { layout, title, caption, phase: packing ? 'packing' : active ? 'open' : 'preparing', items, guests };
}

export function guestMotion(guest, time, reducedMotion) {
  return !reducedMotion && guest.pose === 'dance' ? Math.sin(time * 2.4 + guest.col) : 0;
}

// scene: gatheringScene's result (its text is already localized); options: { sans, dir }, the font family and the direction.
export function gatheringPlanSVG(scene, { sans = 'sans-serif', dir = null } = {}) {
  const P = GATHERING_TEXT.plan, font = escape(sans);
  const x = col => 24 + col * 64, y = row => 48 + row * 48;
  const route = Array.from({ length: 8 }, (_, col) => `<rect x="${x(col)}" y="${y(2)}" width="64" height="48" fill="url(#route)"/>`).join('');
  const cells = Array.from({ length: 5 }, (_, row) => Array.from({ length: 8 }, (_, col) => `<rect x="${x(col)}" y="${y(row)}" width="64" height="48" fill="none" stroke="#bbc9b5" stroke-width="1"/>`).join('')).join('');
  const supplies = scene.items.map(item => {
    const p = item.cells[0], vertical = item.cells[1].row !== p.row, w = vertical ? 64 : 128, h = vertical ? 96 : 48;
    return `<g data-supply="${escape(item.id)}"><rect x="${x(p.col) + 5}" y="${y(p.row) + 5}" width="${w - 10}" height="${h - 10}" rx="6" fill="${COLORS[item.id]}"/><text x="${x(p.col) + w / 2}" y="${y(p.row) + h / 2 + 5}" text-anchor="middle" fill="#fff9ea" font-family="${font}" font-size="14">${escape(item.label)}</text></g>`;
  }).join('');
  const guests = scene.guests.map(g => `<g data-pose="${escape(g.pose)}" transform="translate(${x(g.col) + 32} ${y(g.row) + 24})"><circle r="14" fill="${g.pose === 'talk' ? '#a16d54' : '#866e9b'}"/><text y="5" text-anchor="middle" fill="#fff9ea" font-family="${font}" font-size="15">${g.pose === 'talk' ? '···' : '♪'}</text></g>`).join('');
  const legend = scene.phase === 'open' ? scene.layout === 'table' ? P.table : P.floor : scene.phase === 'packing' ? P.packing : P.preparing;
  return `<svg xmlns="http://www.w3.org/2000/svg"${svgDir(dir)} viewBox="0 0 560 360" role="img" aria-labelledby="title desc"><title id="title">${escape(scene.title)}</title><desc id="desc">${escape(fill(P.desc, { caption: scene.caption }))}</desc><defs><pattern id="route" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="12" height="12" fill="#e7e7c9"/><rect width="5" height="12" fill="#cdd7b7"/></pattern></defs><rect width="560" height="360" rx="8" fill="#f8f1df"/><text x="24" y="28" fill="#365d4b" font-family="${font}" font-size="12" letter-spacing="1.5">${escape(t(P.heading))}</text>${route}${cells}${supplies}${guests}<rect x="179" y="157" width="202" height="24" rx="4" fill="#f8f4e4"/><text x="280" y="174" text-anchor="middle" font-family="${font}" font-size="13" fill="#375c49">${escape(t(P.route))}</text><text x="24" y="317" font-family="${font}" font-size="12" fill="#4f6857">${escape(t(legend))}</text><text x="24" y="341" font-family="${font}" font-size="11" fill="#64725d">${escape(t(P.footer))}</text></svg>`;
}
