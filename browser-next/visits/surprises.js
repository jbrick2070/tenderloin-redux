// Neighborhood surprises (godot/main.gd 266-405, 5683-5771, 6006-6020, 6604-6617, 10560-10598), pure.
// `found` is the saved list of discovered ids (Godot discovered_surprises); this module never
// writes the save. Guide index and the last hinted id are visit-only (game.js keeps them).
// Every word a player reads goes through the active catalog (L, gdfText); English is unchanged. The memory lines stay English
// literals (characters.js SURPRISE_MEMORY holds the same msgids) and are looked up where they are shown.
import { MAIN, GODOT_TEXT, web } from './text.js';
import { gdfText, gdCapitalize } from './format.js';
import { L, unquote } from './compose.js';
import { SURPRISE_SITES } from './positions.js';

export const SURPRISE_IDS = MAIN.NEIGHBORHOOD_SURPRISE_IDS;
export const SURPRISES = MAIN.NEIGHBORHOOD_SURPRISES;
export const PAIRS = MAIN.NEIGHBOR_SURPRISE_PAIRS;
export const KEEPSAKES = MAIN.SURPRISE_KEEPSAKE_META;
export const STORY_BADGES = MAIN.NEIGHBOR_STORY_BADGES;
const T = GODOT_TEXT['main.gd'];
const W = literal => web('main.gd', literal);
const has = (found, id) => found.includes(id);
const NAMES = { bea: 'Bea', celeste: 'Celeste', rook: 'Rook', dez: 'Dez', thanh: 'Thanh' };

// --- The exact discovered_surprises normalization Godot applies ---
// Load (apply_save_envelope main.gd:13238-13244): lenient and ungated. Absent or not an Array ->
// empty, with no other field touched; each entry kept only if it is a String naming a known id;
// duplicates collapse (Godot fills a Dictionary, so first-seen order is kept).
export function readDiscovered(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const v of raw) if (typeof v === 'string' && SURPRISE_IDS.includes(v) && !out.includes(v)) out.push(v);
  return out;
}
// Write (build_save_envelope main.gd:12462-12467): only known ids, sorted ascending by code point, always present.
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function writeDiscovered(found) {
  return [...new Set(found.filter(id => typeof id === 'string' && SURPRISE_IDS.includes(id)))].sort(byCodePoint);
}
// Godot's in-memory dictionary after one discovery (ungated: no chapter or block check).
export function discover(found, id) {
  if (!SURPRISE_IDS.includes(id) || has(found, id)) return found;
  return [...found, id];
}

// Godot next_explore_surprise_id(): the open neighbor's pair first, then the last hint, then id order.
export function nextSurpriseId(found, openNeighborId = null, lastHinted = '') {
  if (openNeighborId) for (const id of PAIRS[openNeighborId] ?? []) if (!has(found, id) && SURPRISE_IDS.includes(id)) return id;
  if (lastHinted && !has(found, lastHinted)) return lastHinted;
  return SURPRISE_IDS.find(id => !has(found, id)) ?? '';
}
// Godot next_undiscovered_surprise_for_neighbor(): an index, or -1.
export function nextIndexForNeighbor(found, neighborId = null) {
  if (neighborId) for (const id of PAIRS[neighborId] ?? []) if (!has(found, id)) { const i = SURPRISE_IDS.indexOf(id); if (i >= 0) return i; }
  return SURPRISE_IDS.findIndex(id => !has(found, id));
}
// Godot cycle_neighborhood_surprise(target): the guide index to inspect next. objectiveSurpriseId is
// the explore objective's surprise_id when the objective is 'explore', else ''.
export function cycleTarget(guideIdx, found, { target = -1, objectiveSurpriseId = '', lastHinted = '' } = {}) {
  let t = target;
  if (t < 0) {
    if (objectiveSurpriseId) t = SURPRISE_IDS.indexOf(objectiveSurpriseId);
    else if (lastHinted && !has(found, lastHinted)) t = SURPRISE_IDS.indexOf(lastHinted);
  }
  return t >= 0 && t < SURPRISE_IDS.length ? t : (guideIdx + 1) % SURPRISE_IDS.length;
}

// Godot neighbor_surprise_memory_line(), verbatim (curly quotes included).
export function memoryLine(neighborId, found) {
  const d = id => has(found, id);
  switch (neighborId) {
    case 'bea':
      if (d('mayor_pomp_event') && d('good_donut_and_bagel')) return '“The Block Mayor cut a giant ribbon on Eddy & Leavenworth with pomp and circumstance, and Baker Mae shared warm donuts and everything bagels on Eddy & Taylor!”';
      if (d('mayor_pomp_event')) return '“Did you see the Block Mayor\'s impromptu ribbon cutting on Eddy & Leavenworth? All that pomp and circumstance for Neighbor Appreciation Hour!”';
      if (d('good_donut_and_bagel')) return '“Baker Mae\'s pink-frosted glazed donut and toasted everything bagel on Eddy & Taylor are the warmest treat on the block!”';
      break;
    case 'celeste':
      if (d('hidden_mural_145') && d('cutesy_dino')) return '“You found my hidden mural below the 8th floor at 145 Leavenworth and met Pip the Tiny Dino by Boeddeker Park—I pinned the sketch to my easel!”';
      if (d('hidden_mural_145')) return '“You found my hidden mural alcove at 145 Leavenworth below the 8th-floor bay window! I pinned the golden hound and sax sketch right onto my easel.”';
      if (d('cutesy_dino')) return '“Pip the Tiny Dino by Boeddeker Park wagged that pastel tail while I sketched those mint-and-coral back plates!”';
      break;
    case 'rook':
      if (d('jeffrey_record') && d('clown_horn_walker')) return '“Jeffrey\'s 1961 LP from 361 Turk is spinning on top of my speaker, and Honker Barnaby honked right on the downbeat!”';
      if (d('jeffrey_record')) return '“You brought Jeffrey\'s lost 1961 record from the 361 Turk \'So What\' awning! Look on top of my speaker—that 33 RPM vinyl is spinning for the whole block.”';
      if (d('clown_horn_walker')) return '“Honker Barnaby strolled past Jones & Turk and gave two gentle squeezes on that red-bulb clown horn right in pocket with our groove!”';
      break;
    case 'dez':
      if (d('viking_dirt_biker') && d('magic_carpet_chef')) return '“A Viking-helmet dirt biker on the 200 block of Turk and Chef Zafira flying on a magic carpet over Eddy—this neighborhood has the best rhythm in the city!”';
      if (d('viking_dirt_biker')) return '“That guy idling on a dirt bike in a horned Viking helmet on the 200 block of Turk nodded right in time with our 80 BPM pocket!”';
      if (d('magic_carpet_chef')) return '“Chef Zafira floated above Eddy & Leavenworth on her crimson-and-gold magic carpet tossing star-anise noodles in a flaming copper wok!”';
      break;
    case 'thanh':
      if (d('impromptu_drag_show') && d('bite_size_nachos')) return '“Starlight Vee\'s surprise drag runway at Taylor & Turk and Nacho Captain Rico\'s bite-sized nacho bags made the whole sidewalk glow!”';
      if (d('impromptu_drag_show')) return '“Starlight Vee rolled out a magenta runway near Taylor & Turk for an impromptu drag show right in the Transgender Cultural District!”';
      if (d('bite_size_nachos')) return '“Nacho Captain Rico shared warm bite-sized bags of tortilla chips and roasted salsa verde right down the sidewalk from my tea table!”';
      break;
  }
  return '';
}

// Godot inspect_neighborhood_surprise(id): discovery at a distance, no walking. Returns the new
// `found` list and every text Godot shows: heading/burst (only when newly found), the info line
// and sub, the speech bubble, the announcement, and the paired neighbor's memory line when that
// neighbor's dialog is open (null: leave the dialog line alone; '' clears it as Godot does).
// sparks: Godot spark_count(), which the fork may not track (default 0).
export function inspect(found, id, { openNeighborId = null, sparks = 0, guideIdx = -1, lastHinted = '' } = {}) {
  if (!Object.hasOwn(SURPRISES, id)) return null;
  const I = T.inspect_neighborhood_surprise, rec = SURPRISES[id], text = value => (value ? L(value) : '');
  const newly = !has(found, id), next = discover(found, id), total = SURPRISE_IDS.length;
  const title = L(rec.title ?? id), badge = L(rec.badge ?? I.badge), speaker = L(rec.speaker ?? I.speaker), speech = text(rec.speech), summary = text(rec.summary);
  const keepsake = text(KEEPSAKES[id]?.label);
  const allFound = next.length >= total;
  const tag = allFound ? L(I.all) : gdfText(I.tag, [next.length, total]);
  const burstSub = keepsake ? gdfText(I.burstKeepsake, [tag, sparks, keepsake]) : gdfText(I.burst, [tag, sparks, badge]);
  let memory = null;
  if (newly) {
    const paired = KEEPSAKES[id]?.neighbor ?? '';
    if (paired && openNeighborId === paired) {
      const english = memoryLine(paired, next), line = english ? unquote(L(english)) : '';
      memory = line ? gdfText(I.memory, [L(NAMES[paired] ?? gdCapitalize(paired)), line]) : '';
    } else memory = '';
  }
  const line = gdfText(I.line, [title, text(rec.street), next.length, total]);
  const keepsakeSuffix = keepsake ? gdfText(I.keepsake, [keepsake]) : '';
  const sub = gdfText(W(I.sub), [speaker, speech, summary, keepsakeSuffix]);
  return {
    found: next, newly, allFound, finale: newly && allFound,
    guideIdx: SURPRISE_IDS.indexOf(id) >= 0 ? SURPRISE_IDS.indexOf(id) : guideIdx,
    lastHinted: lastHinted === id ? '' : lastHinted,
    heading: newly ? gdfText(allFound ? I.finale : I.found, [title]) : null,
    burstSub: newly ? burstSub : null, accent: '#' + (rec.accent ?? 'f8cc58'),
    title, speaker, speech, summary, keepsake, line, sub,
    info: gdfText(I.info, [line, sub]),
    announce: gdfText(I.announce, [line, keepsakeSuffix, speaker, speech]),
    memory, site: SURPRISE_SITES[id],
  };
}

// Text that mentions surprises elsewhere in Godot.
export const conversationLabel = found => gdfText(T.conversation_actions.spot, [found.length, SURPRISE_IDS.length]);
export const progressLabel = (found, sparks = 0) => gdfText(T.update_objective_ui.progress, [sparks, found.length]);
// Godot ask_whats_next's explore hint for a speaking neighbor (main.gd:6420-6438). compass(from, to)
// is story.js compassPhrase. Returns { hint, lastHinted } or null when every surprise is found.
export function neighborHint(found, speakerId, { player, compass }) {
  const i = nextIndexForNeighbor(found, speakerId);
  if (i < 0) return null;
  const id = SURPRISE_IDS[i], rec = SURPRISES[id], A = T.ask_whats_next;
  const dir = compass(player, SURPRISE_SITES[id]);
  const personal = (PAIRS[speakerId] ?? []).includes(id);
  const title = L(rec.title ?? id), street = rec.street ? L(rec.street) : '';
  const hint = personal
    ? gdfText(W(A.pair), [title, dir, street, found.length, SURPRISE_IDS.length])
    : gdfText(W(A.next), [title, dir, street, found.length, SURPRISE_IDS.length]);
  return { hint, lastHinted: id };
}
// Keepsake icons beside their paired neighbors once found (Godot update_neighborhood_surprises_3d).
export const keepsakes = found => SURPRISE_IDS.filter(id => has(found, id)).map(id => ({ id, neighbor: KEEPSAKES[id].neighbor, label: L(KEEPSAKES[id].label) }));
// Map markers: every surprise at its pinned site; found ones in full accent colour (Godot 1.25x),
// unfound ones darkened 28%.
export function markers(found) {
  return SURPRISE_IDS.map(id => ({ id, ...SURPRISE_SITES[id], title: L(SURPRISES[id].title), accent: '#' + SURPRISES[id].accent, found: has(found, id) }));
}
export function darken(hex, amount = 0.28) {
  const n = parseInt(hex.replace('#', ''), 16), f = c => Math.round(c * (1 - amount));
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, '0')).join('');
}
