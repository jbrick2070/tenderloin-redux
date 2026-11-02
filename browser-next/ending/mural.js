// Mural Stories and the signature border: godot/mural_stories.gd (clean, the stories screen) and main.gd
// edit_mural_scene, mural_scene_reply and mural_neighbor_reply. mural_scenes is the one ending field Godot saves;
// the fork writes it by these rules through godot-save.js (muralScenes in the fork state).
import { G, C, gdf, web, capitalize } from './text.js';
import { compose, joined, midSentence, display, ENDING_COMPOSE as K, ENDING_DISPLAY } from './compose.js';
import { L } from '../i18n.js';
import { KEEPSAKE_PALETTE_HEX, muralScenesSVG, sceneThumbnailSVG, signatureSVG } from './art.js';
import { cleanMuralScenes } from '../godot-save.js';

const K2 = C['mural_stories.gd'], T = G['mural_stories.gd'], E = G['main.gd'];
export const SCENE_IDS = K2.IDS, SCENE_SLOTS = K2.SLOTS, SCENE_NAMES = K2.NAMES, SCENE_LABELS = K2.LABELS, SCENE_PAGES = K2.PAGES;
export const SIGNATURE_CREDIT = C['mural_signature.gd'].CREDIT;
const sceneName = id => L(SCENE_NAMES[id]);
// A slot's display name ("Left"); Godot's own templates take the slot id itself ("on the left"), which a locale words by $select.
const slotName = slot => display(ENDING_DISPLAY.slots, slot, id => id[0].toUpperCase() + id.slice(1));

// mural_stories.gd clean(raw): slots in order, a known id at most once; anything else is dropped. Never a reset.
export const cleanScenes = cleanMuralScenes;
// main.gd edit_mural_scene(id, slot) without the save: '' lifts the slot. Returns { scenes, changed, message }.
// Godot's budget admission and receipt are the host's (godot-save.js sceneAdmission and the save status).
export function editScene(scenes, id, slot) {
  const current = cleanScenes(scenes);
  if (!SCENE_SLOTS.includes(slot) || id !== '' && !SCENE_IDS.includes(id)) return { scenes: current, changed: false, message: '' };
  if (id === '' && !Object.hasOwn(current, slot)) return { scenes: current, changed: false, message: '' };
  if ((Object.hasOwn(current, slot) ? current[slot] : '') === id) return { scenes: current, changed: false, message: gdf(E.edit_mural_scene.already, sceneName(id), slot) };
  const next = { ...current };
  for (const old of Object.keys(next)) if (next[old] === id) delete next[old];
  if (id === '') delete next[slot]; else next[slot] = id;
  const ordered = {};
  for (const s of SCENE_SLOTS) if (Object.hasOwn(next, s)) ordered[s] = next[s];
  return { scenes: ordered, changed: true, message: id === '' ? gdf(E.edit_mural_scene.lifted, slot) : gdf(E.edit_mural_scene.painted, sceneName(id), slot) };
}
export const sceneRefusal = () => L(E.edit_mural_scene.full);
// The receipt Godot puts in front of a scene message: saved, or the visit-only reason (save_receipt). The reason is the host's
// saveReason() phrase, which the host localizes.
export const sceneReceipt = (reason = '') => reason ? gdf(E.save_receipt.visit, reason) : L(web(E.save_receipt.saved));
// mural_scene_reply: each painted scene "on the left", as a list.
export function sceneReply(scenes) {
  const r = E.mural_scene_reply, s = cleanScenes(scenes);
  if (!Object.keys(s).length) return L(r.empty);
  return compose(K.sceneReply, { scenes: joined(SCENE_SLOTS.filter(slot => Object.hasOwn(s, slot)).map(slot => gdf(r.on, sceneName(s[slot]), slot)), r.join) });
}
// The announcement after a successful edit: the message, then Celeste's reply.
export const sceneAnnouncement = (message, scenes) => compose(K.celesteSays, { message, reply: sceneReply(scenes) });
// main.gd mural_neighbor_reply(id): the tail Dez or Thanh adds when their scene is painted.
export function neighborTail(id, scenes) {
  const values = Object.values(cleanScenes(scenes));
  if (id === 'dez' && values.includes('music')) return L(E.mural_neighbor_reply.dez);
  if (id === 'thanh' && values.includes('garden')) return L(E.mural_neighbor_reply.thanh);
  return '';
}

export const freshStories = () => ({ page: 0, selected: 'cooking', message: L(G['mural_workshop.gd'].open_stories.message) });
export const openStoriesAnnouncement = () => L(G['mural_workshop.gd'].open_stories.announce);
export const closeStoriesAnnouncement = scenes => L(G['mural_workshop.gd'].close_stories.back) + sceneReply(scenes);
export const paintScenesLabel = () => L(G['mural_workshop.gd'].setup.paint);
export function selectScene(st, id) {
  if (!SCENE_IDS.includes(id)) return { stories: st };
  const message = compose(K.onBrush, { scene: sceneName(id) });
  return { stories: { ...st, selected: id, message }, announce: message };
}
export function changePage(st) {
  const page = 1 - st.page, message = L(T.change_page.choose) + L(page === 1 ? T.change_page.music : T.change_page.food);
  return { stories: { ...st, page, selected: SCENE_PAGES[page][0], message }, announce: message };
}
// present(): the screen for the current scenes. marks is how many of the three mural marks are placed. Each target carries its
// own alt clause ("Left half: Making Music"), and paperAlt joins them for the paper picture.
export function storiesView(st, scenes, { palette = 'garden', marks = 0, music = false } = {}) {
  const p = T.present, s = cleanScenes(scenes), pal = KEEPSAKE_PALETTE_HEX[palette] || KEEPSAKE_PALETTE_HEX.garden;
  let text = compose(K.storiesText, { message: st.message, reply: sceneReply(s) });
  if (st.selected === 'music' || Object.values(s).includes('music')) text += L(p.music);
  const choices = SCENE_PAGES[st.page].map((id, i) => ({ id: `scene-choice-${i}`, scene: id, label: L(SCENE_LABELS[id]), name: sceneName(id), title: compose(K.sceneTooltip, { scene: sceneName(id) }), pressed: st.selected === id, thumbnail: sceneThumbnailSVG(id, pal) }));
  const targets = SCENE_SLOTS.map((slot, i) => {
    const id = Object.hasOwn(s, slot) ? s[slot] : '', painted = id ? sceneName(id) : L(p.open);
    return { id: `scene-target-${i}`, slot, label: midSentence(slotName(slot)), name: gdf(p.target, slotName(slot), painted, sceneName(st.selected)), alt: compose(K.targetAlt, { half: slotName(slot), scene: painted }) };
  });
  const lifts = SCENE_SLOTS.map((slot, i) => ({ id: `scene-lift-${i}`, slot, label: gdf(T.setup.lift, slot), disabled: !Object.hasOwn(s, slot) }));
  const paletteLabel = compose(K.paletteButton, { palette: paletteName(palette) });
  return {
    title: gdf(p.title, marks), attribution: L(T.setup.attribution), text, choices, targets, lifts,
    paperAlt: compose(K.paperAlt, { left: targets[0].alt, right: targets[1].alt }),
    page: { id: 'scene-page', label: L(st.page === 0 ? p.pageMusic : p.pageFood), name: L(st.page === 0 ? p.pageMusicName : p.pageFoodName) },
    // The footer, in Godot's order: Palette (marked rapid), Music, Back to Mural, then page.
    palette: { id: 'scene-palette', label: paletteLabel, rapid: true },
    music: { id: 'ending-music', label: L(music ? K.musicOn : K.musicOff) },
    back: { id: 'scene-back', label: L(T.setup.back) },
    paper: muralScenesSVG(s, pal), signature: signatureSVG(pal, false), signatureCredit: L(SIGNATURE_CREDIT),
  };
}
// main.gd cycle_mural_palette: the next of MURAL_PALETTES (an unknown palette starts over at garden), and set_mural_palette's line.
const MURAL_PALETTES = C['main.gd'].MURAL_PALETTES;
// A palette's display name (String.capitalize of its id in Godot); an unknown palette is shown as Godot shows it.
const paletteName = palette => display(ENDING_DISPLAY.muralPalettes, palette, capitalize);
export const nextPalette = palette => MURAL_PALETTES[(MURAL_PALETTES.indexOf(palette) + 1) % MURAL_PALETTES.length];
export const paletteAnnouncement = (palette, marks) => gdf(E.set_mural_palette.announce, paletteName(palette), marks);
