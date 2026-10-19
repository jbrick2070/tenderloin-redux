import { FURNITURE, canPlaceFurniture, occupiedCells } from './core.js';

const LABELS = { table: 'Table', seats: 'Seats', speaker: 'Speaker' };
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

// Presentation derived from existing choices. No new progress, save fields or street coordinates.
export function gatheringScene(state) {
  const layout = state.layout === 'floor' ? 'floor' : 'table';
  const packing = !!state.epilogue?.packing, returned = state.epilogue?.returned || [];
  const accepted = {};
  for (const id of FURNITURE) {
    const p = state.furniture?.[id];
    if (p && canPlaceFurniture({ layout, furniture: accepted }, id, p.col, p.row)) accepted[id] = { col: p.col, row: p.row };
  }
  const items = FURNITURE.filter(id => accepted[id] && !(packing && (id === 'seats' || returned.includes(id)))).map(id => ({ id, label: LABELS[id], cells: occupiedCells(id, accepted[id], layout).map(p => ({ ...p })) }));
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
  const title = layout === 'table' ? 'Long Table · Stories across the table' : 'Open Floor · A little room to move';
  const caption = packing ? items.length ? 'The gathering has wound down. Seats are folded; the remaining table and speaker positions are shown.' : !returned.includes('paint-case') ? 'The table and speaker are home. Celeste’s paint case still needs returning beside the mural.' : 'The supplies are home. The shared afternoon stays in your field notes.' : active ? layout === 'table' ? 'Visitors gather near the table you placed, making room for conversation.' : 'Visitors spread through free spots at the edges, leaving room for a little movement.' : 'Your arrangement is taking shape. Visitors arrive when the gathering opens.';
  return { layout, title, caption, phase: packing ? 'packing' : active ? 'open' : 'preparing', items, guests };
}

export function guestMotion(guest, time, reducedMotion) {
  return !reducedMotion && guest.pose === 'dance' ? Math.sin(time * 2.4 + guest.col) : 0;
}

export function gatheringPlanSVG(scene) {
  const x = col => 24 + col * 64, y = row => 48 + row * 48;
  const route = Array.from({ length: 8 }, (_, col) => `<rect x="${x(col)}" y="${y(2)}" width="64" height="48" fill="url(#route)"/>`).join('');
  const cells = Array.from({ length: 5 }, (_, row) => Array.from({ length: 8 }, (_, col) => `<rect x="${x(col)}" y="${y(row)}" width="64" height="48" fill="none" stroke="#bbc9b5" stroke-width="1"/>`).join('')).join('');
  const supplies = scene.items.map(item => {
    const p = item.cells[0], vertical = item.cells[1].row !== p.row, w = vertical ? 64 : 128, h = vertical ? 96 : 48;
    return `<g data-supply="${escape(item.id)}"><rect x="${x(p.col) + 5}" y="${y(p.row) + 5}" width="${w - 10}" height="${h - 10}" rx="6" fill="${COLORS[item.id]}"/><text x="${x(p.col) + w / 2}" y="${y(p.row) + h / 2 + 5}" text-anchor="middle" fill="#fff9ea" font-family="sans-serif" font-size="14">${escape(item.label)}</text></g>`;
  }).join('');
  const guests = scene.guests.map(g => `<g data-pose="${escape(g.pose)}" transform="translate(${x(g.col) + 32} ${y(g.row) + 24})"><circle r="14" fill="${g.pose === 'talk' ? '#a16d54' : '#866e9b'}"/><text y="5" text-anchor="middle" fill="#fff9ea" font-family="sans-serif" font-size="15">${g.pose === 'talk' ? '···' : '♪'}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360" role="img" aria-labelledby="title desc"><title id="title">${escape(scene.title)}</title><desc id="desc">Current fictional gathering plan, 8 columns by 5 rows. Row 3 is the clear through-route. ${escape(scene.caption)} Activity markers represent anonymous fictional visitors, not a photograph.</desc><defs><pattern id="route" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="12" height="12" fill="#e7e7c9"/><rect width="5" height="12" fill="#cdd7b7"/></pattern></defs><rect width="560" height="360" rx="8" fill="#f8f1df"/><text x="24" y="28" fill="#365d4b" font-family="sans-serif" font-size="12" letter-spacing="1.5">YOUR GATHERING · CURRENT PLAN</text>${route}${cells}${supplies}${guests}<rect x="179" y="157" width="202" height="24" rx="4" fill="#f8f4e4"/><text x="280" y="174" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#375c49">KEEP THIS ROUTE CLEAR</text><text x="24" y="317" font-family="sans-serif" font-size="12" fill="#4f6857">${scene.phase === 'open' ? scene.layout === 'table' ? '···  Conversation by the table' : '♪  Movement at the edges' : scene.phase === 'packing' ? 'Packed supplies leave the plan as you return them' : 'Visitors join after opening'}</text><text x="24" y="341" font-family="sans-serif" font-size="11" fill="#64725d">Authored event plan · not a street survey or a keepsake picture</text></svg>`;
}
