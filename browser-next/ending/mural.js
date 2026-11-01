// Mural Stories and the signature border: godot/mural_stories.gd (clean, the stories screen) and main.gd
// edit_mural_scene, mural_scene_reply and mural_neighbor_reply. mural_scenes is the one ending field Godot saves;
// the fork writes it by these rules through godot-save.js (muralScenes in the fork state).
import { G, C, gdf, web, capitalize } from './text.js';
import { KEEPSAKE_PALETTE_HEX, muralScenesSVG, sceneThumbnailSVG, signatureSVG } from './art.js';
import { cleanMuralScenes } from '../godot-save.js';

const K = C['mural_stories.gd'], T = G['mural_stories.gd'], E = G['main.gd'];
export const SCENE_IDS = K.IDS, SCENE_SLOTS = K.SLOTS, SCENE_NAMES = K.NAMES, SCENE_LABELS = K.LABELS, SCENE_PAGES = K.PAGES;
export const SIGNATURE_CREDIT = C['mural_signature.gd'].CREDIT;

// mural_stories.gd clean(raw): slots in order, a known id at most once; anything else is dropped. Never a reset.
export const cleanScenes = cleanMuralScenes;
// main.gd edit_mural_scene(id, slot) without the save: '' lifts the slot. Returns { scenes, changed, message }.
// Godot's budget admission and receipt are the host's (godot-save.js sceneAdmission and the save status).
export function editScene(scenes, id, slot) {
  const current = cleanScenes(scenes);
  if (!SCENE_SLOTS.includes(slot) || id !== '' && !SCENE_IDS.includes(id)) return { scenes: current, changed: false, message: '' };
  if (id === '' && !Object.hasOwn(current, slot)) return { scenes: current, changed: false, message: '' };
  if ((Object.hasOwn(current, slot) ? current[slot] : '') === id) return { scenes: current, changed: false, message: gdf(E.edit_mural_scene.already, SCENE_NAMES[id], slot) };
  const next = { ...current };
  for (const old of Object.keys(next)) if (next[old] === id) delete next[old];
  if (id === '') delete next[slot]; else next[slot] = id;
  const ordered = {};
  for (const s of SCENE_SLOTS) if (Object.hasOwn(next, s)) ordered[s] = next[s];
  return { scenes: ordered, changed: true, message: id === '' ? gdf(E.edit_mural_scene.lifted, slot) : gdf(E.edit_mural_scene.painted, SCENE_NAMES[id], slot) };
}
export const sceneRefusal = () => E.edit_mural_scene.full;
// The receipt Godot puts in front of a scene message: saved, or the visit-only reason (save_receipt).
export const sceneReceipt = (reason = '') => reason ? gdf(E.save_receipt.visit, reason) : web(E.save_receipt.saved);
export function sceneReply(scenes) {
  const r = E.mural_scene_reply, s = cleanScenes(scenes);
  if (!Object.keys(s).length) return r.empty;
  return SCENE_SLOTS.filter(slot => Object.hasOwn(s, slot)).map(slot => gdf(r.on, SCENE_NAMES[s[slot]], slot)).join(r.join) + r.tail;
}
// The announcement after a successful edit: the message, then Celeste's reply.
export const sceneAnnouncement = (message, scenes) => message + E.edit_mural_scene.celeste + sceneReply(scenes);
// main.gd mural_neighbor_reply(id): the tail Dez or Thanh adds when their scene is painted.
export function neighborTail(id, scenes) {
  const values = Object.values(cleanScenes(scenes));
  if (id === 'dez' && values.includes('music')) return E.mural_neighbor_reply.dez;
  if (id === 'thanh' && values.includes('garden')) return E.mural_neighbor_reply.thanh;
  return '';
}

export const freshStories = () => ({ page: 0, selected: 'cooking', message: G['mural_workshop.gd'].open_stories.message });
export const openStoriesAnnouncement = () => G['mural_workshop.gd'].open_stories.announce;
export const closeStoriesAnnouncement = scenes => G['mural_workshop.gd'].close_stories.back + sceneReply(scenes);
export const paintScenesLabel = () => G['mural_workshop.gd'].setup.paint;
export function selectScene(st, id) {
  if (!SCENE_IDS.includes(id)) return { stories: st };
  const message = SCENE_NAMES[id] + T.select_scene.brush;
  return { stories: { ...st, selected: id, message }, announce: message };
}
export function changePage(st) {
  const page = 1 - st.page, message = T.change_page.choose + (page === 1 ? T.change_page.music : T.change_page.food);
  return { stories: { ...st, page, selected: SCENE_PAGES[page][0], message }, announce: message };
}
// present(): the screen for the current scenes. marks is how many of the three mural marks are placed.
export function storiesView(st, scenes, { palette = 'garden', marks = 0, music = false } = {}) {
  const p = T.present, s = cleanScenes(scenes), pal = KEEPSAKE_PALETTE_HEX[palette] || KEEPSAKE_PALETTE_HEX.garden;
  let text = st.message + p.celeste + sceneReply(s) + p.street;
  if (st.selected === 'music' || Object.values(s).includes('music')) text += p.music;
  const choices = SCENE_PAGES[st.page].map((id, i) => ({ id: `scene-choice-${i}`, scene: id, label: SCENE_LABELS[id], name: SCENE_NAMES[id], title: SCENE_NAMES[id] + T.setup.tooltip, pressed: st.selected === id, thumbnail: sceneThumbnailSVG(id, pal) }));
  const targets = SCENE_SLOTS.map((slot, i) => {
    const id = Object.hasOwn(s, slot) ? s[slot] : '';
    return { id: `scene-target-${i}`, slot, name: gdf(p.target, slot[0].toUpperCase() + slot.slice(1), id ? SCENE_NAMES[id] : p.open, SCENE_NAMES[st.selected]) };
  });
  const lifts = SCENE_SLOTS.map((slot, i) => ({ id: `scene-lift-${i}`, slot, label: gdf(T.setup.lift, slot), disabled: !Object.hasOwn(s, slot) }));
  return {
    title: gdf(p.title, marks), attribution: T.setup.attribution, text, choices, targets, lifts,
    page: { id: 'scene-page', label: st.page === 0 ? p.pageMusic : p.pageFood, name: st.page === 0 ? p.pageMusicName : p.pageFoodName },
    // The footer, in Godot's order: Palette (marked rapid), Music, Back to Mural, then page.
    palette: { id: 'scene-palette', label: p.paletteLabel + capitalize(palette), rapid: true },
    music: { id: 'ending-music', label: p.musicLabel + (music ? p.on : p.off) },
    back: { id: 'scene-back', label: T.setup.back },
    paper: muralScenesSVG(s, pal), signature: signatureSVG(pal, false), signatureCredit: SIGNATURE_CREDIT,
  };
}
// main.gd cycle_mural_palette: the next of MURAL_PALETTES (an unknown palette starts over at garden), and set_mural_palette's line.
const MURAL_PALETTES = C['main.gd'].MURAL_PALETTES;
export const nextPalette = palette => MURAL_PALETTES[(MURAL_PALETTES.indexOf(palette) + 1) % MURAL_PALETTES.length];
export const paletteAnnouncement = (palette, marks) => gdf(E.set_mural_palette.announce, capitalize(palette), marks);
