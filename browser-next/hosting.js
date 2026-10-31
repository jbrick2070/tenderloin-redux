import { programmeIssue, segment } from './programme.js';

export const TILE_PALETTES = { warm: ['#e5b66d', '#d9a2b2', '#75907c'], cool: ['#91bac2', '#a3b48c', '#987b9e'] };
export const STORY_CHOICES = { memory: 'A small moment you want to keep', future: 'Something you hope to make together' };
export const QUIET_CHOICES = { arc: 'An open arc of seats', pairs: 'A pair and an open seat' };
const defaults = () => ({ story: 'memory', pattern: 85, tiles: [0, 1, 2, 2, 1, 0], palette: 'warm', quiet: 'arc' });
export const initialHosting = () => ({ order: [], results: [], draft: defaults() });
export const currentActivity = host => host?.order?.[host.results.length] || null;
export const hostedResult = (host, id) => host?.results?.find(result => result.id === id)?.value;
function validValue(id, value) {
  if (id === 'stories') return typeof value === 'string' && Object.hasOwn(STORY_CHOICES, value);
  if (id === 'beats') return Number.isInteger(value) && value >= 0 && value <= 255;
  if (id === 'pause') return typeof value === 'string' && Object.hasOwn(QUIET_CHOICES, value);
  return id === 'art' && value && Array.isArray(value.tiles) && value.tiles.length === 6 && value.tiles.every(n => Number.isInteger(n) && n >= 0 && n <= 2) && typeof value.palette === 'string' && Object.hasOwn(TILE_PALETTES, value.palette);
}
const copyValue = (id, value) => id === 'art' ? { tiles: [...value.tiles], palette: value.palette } : value;
export function restoreHosting(raw, opened) {
  const host = initialHosting();
  if (!opened || programmeIssue(raw?.order)) return host;
  host.order = [...raw.order];
  // Only a valid prefix of the frozen running order can be completed. Never skip a corrupt slot.
  for (let i = 0; i < 4; i++) {
    const result = Array.isArray(raw.results) ? raw.results[i] : null, id = host.order[i];
    if (!result || result.id !== id || !validValue(id, result.value)) break;
    host.results.push({ id, value: copyValue(id, result.value) });
  }
  const d = raw.draft;
  if (validValue('stories', d?.story)) host.draft.story = d.story;
  if (validValue('beats', d?.pattern)) host.draft.pattern = d.pattern;
  if (validValue('art', d)) { host.draft.tiles = [...d.tiles]; host.draft.palette = d.palette; }
  if (validValue('pause', d?.quiet)) host.draft.quiet = d.quiet;
  return host;
}
export function changeHosting(current, action, published) {
  const host = restoreHosting(current, true);
  if (action.type === 'host-start') {
    if (host.order.length || programmeIssue(published)) return null;
    host.order = [...published]; return host;
  }
  const id = currentActivity(host), draft = host.draft;
  if (!id) return null;
  if (action.type === 'host-story' && id === 'stories' && validValue(id, action.value)) draft.story = action.value;
  else if (action.type === 'host-beat' && id === 'beats' && Number.isInteger(action.step) && action.step >= 0 && action.step < 8) draft.pattern ^= 1 << action.step;
  else if (action.type === 'host-tile' && id === 'art' && Number.isInteger(action.cell) && action.cell >= 0 && action.cell < 6) draft.tiles[action.cell] = (draft.tiles[action.cell] + 1) % 3;
  else if (action.type === 'host-palette' && id === 'art' && typeof action.value === 'string' && Object.hasOwn(TILE_PALETTES, action.value)) draft.palette = action.value;
  else if (action.type === 'host-quiet' && id === 'pause' && validValue(id, action.value)) draft.quiet = action.value;
  else if (action.type === 'host-complete' && action.id === id) {
    const value = ({ stories: draft.story, beats: draft.pattern, art: { tiles: draft.tiles, palette: draft.palette }, pause: draft.quiet })[id];
    host.results.push({ id, value: copyValue(id, value) });
  } else return null;
  return host;
}
export function activitySummary(result) {
  if (result.id === 'stories') return `Bea invited: ${STORY_CHOICES[result.value]}. Telling a story and listening were equally welcome.`;
  if (result.id === 'beats') return result.value ? `Dez shared an eight-step visual rhythm with taps on ${Array.from({ length: 8 }, (_, i) => i + 1).filter(i => result.value & 1 << (i - 1)).join(', ')}. Joining in was optional.` : 'Dez made space for a listening round. Nobody had to perform.';
  if (result.id === 'art') return `Celeste’s six-tile portable panel uses the ${result.value.palette} palette. The six neighbor-prepared tiles became something shared.`;
  return `Thanh arranged ${QUIET_CHOICES[result.value].toLowerCase()}, keeping the through-route open. People could sit, stay standing or leave.`;
}
export function hostingResponse(id, host) {
  if (!host?.order?.length) return '';
  const key = ({ bea: 'stories', dez: 'beats', celeste: 'art', thanh: 'pause' })[id], result = host.results.find(r => r.id === key);
  if (id === 'rook') return '“Nobody has to perform to belong. I like how we keep room for people to come and go.”';
  if (!result) return `“Our ${segment(key)?.name.toLowerCase() || 'gathering'} is in the running order. Come back to the gathering whenever you’re ready.”`;
  if (key === 'stories') return result.value === 'memory' ? '“That small-moment invitation brought out a story I hadn’t told in years. Listening was enough too.”' : '“Someone imagined a garden in a box. Someone else offered seeds. I’m keeping that hopeful invitation.”';
  if (key === 'beats') return result.value ? '“You left your own spaces in that rhythm. That’s a pattern I’ll remember.”' : '“We tried a listening round. Being quiet together can be a choice too.”';
  if (key === 'art') return `“Our ${result.value.palette} panel came out of everyone’s shapes. Look for it beside our first mural.”`;
  return result.value === 'arc' ? '“That open arc left room for someone to join without asking everyone to move. I’d use that again.”' : '“A pair for a quiet conversation, and an open seat someone could join. A little space can make joining easier.”';
}
export function tilePanelSVG(art) {
  if (!validValue('art', art)) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240" role="img" aria-labelledby="title desc"><title id="title">Our six-tile portable panel</title><desc id="desc">Original abstract neighbor-made panel, ${art.palette} palette. Tiles numbered left to right, top to bottom.</desc><rect width="360" height="240" rx="14" fill="#f8ecd9"/>${art.tiles.map((tile, i) => `<g transform="translate(${24 + i % 3 * 106} ${20 + Math.floor(i / 3) * 106})"><rect width="98" height="98" rx="7" fill="${TILE_PALETTES[art.palette][tile]}"/>${tile === 0 ? '<circle cx="49" cy="49" r="24" fill="#f8ecd9"/>' : tile === 1 ? '<path d="M12 64 Q32 20 50 50 T86 36" stroke="#f8ecd9" stroke-width="10" fill="none"/>' : '<path d="M20 76 L49 22 L78 76Z" fill="#f8ecd9"/>'}</g>`).join('')}</svg>`;
}
// World receives existing validated free event cells. No street or target moves.
export function hostingGuests(host, free) {
  if (!host?.order?.length) return null;
  const activity = currentActivity(host) || 'pause', quiet = hostedResult(host, 'pause') || host.draft.quiet;
  // Two frontage cells stay empty beneath the new tile panel and programme board.
  const cells = free.filter(p => !(p.row === 0 && [2, 6].includes(p.col))).map(p => ({ ...p }));
  const spread = activity === 'pause' ? quiet === 'pairs' : activity === 'beats';
  cells.sort((a, b) => spread ? b.col - a.col || a.row - b.row : Math.abs(a.col - 3.5) - Math.abs(b.col - 3.5) || a.row - b.row);
  const chosen = [];
  while (cells.length && chosen.length < 3) {
    const index = spread && chosen.length % 2 ? cells.length - 1 : 0;
    chosen.push({ ...cells.splice(index, 1)[0], id: `host-visitor-${chosen.length + 1}`, pose: activity === 'beats' && host.draft.pattern ? 'dance' : 'talk' });
  }
  return chosen;
}
