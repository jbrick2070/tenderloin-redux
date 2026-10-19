import { PHOTO_GUESTS, MOTIFS, PALETTES, cleanMural } from './core.js';
import { NEIGHBORS, PALETTE_COLORS } from './world.js';

// Authored responses by fictional characters, not interviews or real-person consent records.
export const PHOTO_RESPONSES = [
  { id: 'bea', name: 'Bea', agrees: true, response: '“Yes, and make sure the mural gets in.”' },
  { id: 'celeste', name: 'Celeste', agrees: true, response: '“Sure. I’m keeping the paint on my hands.”' },
  { id: 'dez', name: 'Dez', agrees: true, response: '“I’m in. No need to make everyone pose.”' },
  { id: 'thanh', name: 'Thanh', agrees: true, response: '“All right. One for the memory.”' },
  { id: 'rook', name: 'Rook', agrees: false, response: '“I’m skipping photos today. Save me a story instead.”' },
];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
export function postcardSVG(photo) {
  if (photo?.status !== 'taken' || !Array.isArray(photo.participants) || !photo.participants.length || photo.participants.some(id => !PHOTO_GUESTS.includes(id)) || !PALETTES.includes(photo.palette) || !['table', 'floor'].includes(photo.layout)) return '';
  const mural = cleanMural(photo.mural);
  if (!MOTIFS.every(id => mural[id])) return '';
  const guests = NEIGHBORS.filter(n => PHOTO_GUESTS.includes(n.id) && photo.participants.includes(n.id));
  const colors = PALETTE_COLORS[photo.palette];
  const motifs = MOTIFS.map((id, i) => {
    const p = mural[id];
    const x = 135 + p.col * 68, y = 155 + p.row * 43;
    if (id === 'sun') return `<g transform="translate(${x} ${y})" stroke="${colors[i]}" stroke-width="5" stroke-linecap="round"><path d="M-15 0h30M0-15v30M-11-11l22 22M-11 11l22-22"/></g>`;
    if (id === 'wave') return `<path d="M${x - 23} ${y}q12-17 24 0t24 0M${x - 23} ${y + 11}q12-17 24 0t24 0" stroke="${colors[i]}" stroke-width="4" fill="none"/>`;
    return `<text x="${x}" y="${y + 6}" text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="${colors[i]}">RISE</text>`;
  }).join('');
  const people = guests.map((guest, i) => {
    const x = 320 + (i - (guests.length - 1) / 2) * 106;
    const walker = guest.rollator ? '<g stroke="#496557" stroke-width="4" fill="none"><path d="M-31 10l-8 39h68l-6-39"/><path d="M-35 33h61"/></g><circle cx="-37" cy="52" r="5" fill="#496557"/><circle cx="29" cy="52" r="5" fill="#496557"/>' : '';
    const headphones = guest.headphones ? '<path d="M-20-50a20 20 0 0 1 40 0" fill="none" stroke="#dfc57f" stroke-width="4"/><rect x="-23" y="-54" width="6" height="17" rx="2" fill="#dfc57f"/><rect x="17" y="-54" width="6" height="17" rx="2" fill="#dfc57f"/>' : '';
    return `<g data-guest="${guest.id}" transform="translate(${x} 321)"><ellipse cx="3" cy="47" rx="34" ry="7" fill="#64735b22"/><path d="M-10 10v33M10 10v33" stroke="#3d5149" stroke-width="10" stroke-linecap="round"/><rect x="-22" y="-30" width="44" height="50" rx="12" fill="${guest.coat}"/><path d="M-25-19v35M25-19v35" stroke="${guest.skin}" stroke-width="8" stroke-linecap="round"/><circle cy="-49" r="18" fill="${guest.skin}"/><path d="M-18-52a18 18 0 0 1 36 0" fill="${guest.hair}"/>${headphones}${walker}<text y="76" text-anchor="middle" font-size="15" fill="#41594e">${escape(guest.name)}</text></g>`;
  }).join('');
  const title = photo.layout === 'table' ? 'Stories around the Long Table' : 'A little room on the Open Floor';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">Fictional gathering keepsake with ${escape(guests.map(g => g.name).join(', '))}. Rook is not pictured. An original illustration, not a photograph of a real place or person.</desc><rect width="640" height="480" rx="8" fill="#faf3df"/><rect x="20" y="20" width="600" height="395" rx="3" fill="#dce2cc"/><path d="M20 105h600M20 282h600" stroke="#c3cdb6" stroke-width="2"/><path d="M45 69Q320 138 595 69" fill="none" stroke="#647b62" stroke-width="2"/>${Array.from({ length: 15 }, (_, i) => `<path d="M${55 + i * 37} ${72 + Math.sin(i / 14 * Math.PI) * 34}h20l-10 22z" fill="${colors[i % 3]}"/>`).join('')}<rect x="91" y="123" width="455" height="145" rx="4" fill="#f4e3ba" stroke="#b58e5d" stroke-width="8"/>${motifs}${people}<text x="320" y="438" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#294f44">${escape(title)}</text><text x="320" y="461" text-anchor="middle" font-family="sans-serif" font-size="9" letter-spacing="1.5" fill="#6b7b68">TENDERLOIN REDUX · FICTIONAL GATHERING · ORIGINAL ILLUSTRATION</text></svg>`;
}
