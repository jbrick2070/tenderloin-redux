// Cook & Share (godot/shared_meal.gd, shared_meal_data.gd), pure. Visit-only; nothing is saved.
// Every word a player reads goes through the active catalog (L, gdfText, compose); English is unchanged. gdf stays for the SVG.
import { MEAL, MEAL_DATA, GODOT_TEXT } from './text.js';
import { gdf, gdfText } from './format.js';
import { L, compose, COMPOSE_TEXT } from './compose.js';

export const { SERVING, TABLE_SLOTS } = MEAL;
export const { RECIPES } = MEAL_DATA;
const T = GODOT_TEXT['shared_meal.gd'], C = COMPOSE_TEXT.meal, J = COMPOSE_TEXT.joiners;
export const TEXT = T;

export function initialMeal() {
  return { open: false, selected: 0, revealed: 1, invitation: -1, steps: [0, 0, 0, 0], servings: [0, 0, 0, 0], placements: [0, 0, 0, 0], generations: [0, 0, 0, 0], shared: {}, message: '' };
}
const copy = m => ({ ...m, steps: [...m.steps], servings: [...m.servings], placements: [...m.placements], generations: [...m.generations], shared: { ...m.shared } });
const has = (m, i) => Object.hasOwn(m.shared, i);
export const sharedCount = m => Object.keys(m.shared).length;

// Godot open_meal refusals, in order. ctx = { opened, storyActive, busy, walking, hostingInProgress }
// (busy: startup card, story card or a focused activity; hostingInProgress: hosting order chosen
// and fewer than 4 results). Returns the refusal text or ''.
export function mealRefusal(ctx = {}) {
  const O = T.open_meal;
  if (!ctx.opened) return L(O.closed);
  if (ctx.storyActive) return L(O.story);
  if (ctx.busy || ctx.walking) return L(O.busy);
  if (ctx.hostingInProgress) return L(O.hosting);
  return '';
}
export const currentPreparationShared = m => has(m, m.selected) && m.shared[m.selected].generation === m.generations[m.selected];
export function followTarget(m) {
  if (!has(m, m.selected)) return -1;
  const s = m.selected;
  return s < 3 && s + 1 < m.revealed ? s + 1 : (s === 3 ? 0 : -1);
}
const posmod = (a, n) => ((a % n) + n) % n;
export const previousCook = m => posmod(m.selected - 1, m.revealed);
export const nextCook = m => (m.selected + 1) % m.revealed;

// The reducer: returns { state, announce }.
export function changeMeal(m, action, ctx = {}) {
  const none = { state: m, announce: '' };
  switch (action?.type) {
    case 'open': {
      if (m.open) return none;
      const refused = mealRefusal(ctx);
      if (refused) return { state: m, announce: refused, refused: true };
      const s = copy(m); s.open = true;
      return { state: s, announce: cue(s) };
    }
    case 'close': {
      if (!m.open) return none;
      const s = copy(m); s.open = false;
      return { state: s, announce: action.announce === false ? '' : L(T.close_meal.announce) };
    }
    case 'select': {
      const i = action.index;
      if (!m.open || !Number.isInteger(i) || i < 0 || i >= m.revealed) return none;
      const s = copy(m); s.selected = i; s.message = '';
      return { state: s, announce: cue(s) };
    }
    case 'previous': return changeMeal(m, { type: 'select', index: previousCook(m) }, ctx);
    case 'next': return changeMeal(m, { type: 'select', index: nextCook(m) }, ctx);
    case 'serving': case 'placement': {
      const i = action.index;
      if (!m.open || (i !== 0 && i !== 1)) return none;
      const s = copy(m); s[action.type === 'serving' ? 'servings' : 'placements'][m.selected] = i;
      return { state: s, announce: cue(s) };
    }
    case 'advance': {
      if (!m.open) return none;
      const s = copy(m), i = m.selected;
      if (s.steps[i] >= 5) { s.steps[i] = 0; s.generations[i] += 1; s.message = L(T.advance.again); }
      else { s.steps[i] += 1; s.message = ''; }
      return { state: s, announce: cue(s) };
    }
    case 'shareOrFollow': {
      if (!m.open || m.steps[m.selected] < 5) return none;
      if (currentPreparationShared(m) && followTarget(m) >= 0) return changeMeal(m, { type: 'select', index: followTarget(m) }, ctx);
      return changeMeal(m, { type: 'share' }, ctx);
    }
    case 'share': {
      const i = m.selected;
      if (!m.open || m.steps[i] !== 5) return none;
      const s = copy(m), first = !has(m, i);
      s.shared[i] = { serving: m.servings[i], placement: m.placements[i], generation: m.generations[i] };
      if (first && i + 1 < 4) { s.revealed = Math.max(s.revealed, i + 2); s.invitation = i + 1; }
      else if (first && sharedCount(s) === 4) s.invitation = 0;
      s.message = L(RECIPES[i].recognition[m.servings[i]]);
      return { state: s, announce: cue(s) };
    }
    case 'reset': return { state: initialMeal(), announce: '' };
    default: return none;
  }
}

// Godot refresh(): every label and the reader.
export function mealView(m) {
  const R = T.refresh, i = m.selected, recipe = RECIPES[i], complete = m.steps[i] >= 5, served = currentPreparationShared(m), target = followTarget(m);
  const cook = L(recipe.cook), heading = compose(J.pipe, { left: cook, right: L(recipe.title) });
  let text = L(recipe.welcome) + '\n' + compose(C.tradition, { tradition: L(recipe.tradition), ingredients: L(recipe.ingredients) });
  if (!complete) text += gdfText(R.step, [m.steps[i] + 1, L(recipe.steps[m.steps[i]][1])]);
  else if (m.message) text += '\n' + compose(C.said, { cook, message: m.message });
  else text += L(R.ready);
  if (served) {
    text += gdfText(R.shared, [sharedCount(m), L(recipe.invite)]);
    if (target >= 0) text += compose(C.follow, { cook: L(RECIPES[target].cook) });
  }
  text += '\n' + L(recipe.source) + '\n' + recipe.url + L(R.condensed);
  const choices = !served || !complete;
  return {
    heading, credit: L(T.setup.credit), text,
    prepare: L(complete ? R.again : recipe.steps[m.steps[i]][0]),
    previous: { label: L(T.setup.previous), disabled: m.revealed < 2, name: compose(C.previousName, { cook }) },
    next: { label: L(T.setup.next), disabled: m.revealed < 2, name: compose(C.nextName, { cook }) },
    servings: SERVING.map((label, k) => ({ label: L(label), pressed: m.servings[i] === k, visible: choices })),
    placements: [T.setup.near, T.setup.other].map((label, k) => ({ label: L(label), pressed: m.placements[i] === k, visible: choices })),
    share: { label: L(complete && served && target >= 0 ? R.followLabel : R.shareLabel), disabled: !complete },
    explore: L(T.setup.explore),
    description: artDescription(i, m.steps[i], m.servings[i]),
    art: { index: i, stage: m.steps[i], style: m.servings[i] },
  };
}
// Godot's announcement cue (refresh(true)). "Step %d of5" is Godot's own wording, copied verbatim.
export function cue(m) {
  const R = T.refresh, i = m.selected, recipe = RECIPES[i], complete = m.steps[i] >= 5, served = currentPreparationShared(m);
  const heading = compose(J.pipe, { left: L(recipe.cook), right: L(recipe.title) });
  let c;
  if (!complete) c = gdfText(R.cueStep, [m.steps[i] + 1, L(recipe.steps[m.steps[i]][0]), L(recipe.steps[m.steps[i]][1])]);
  else if (m.message) c = m.message + (served ? ' ' + L(recipe.invite) : '');
  else c = L(R.cueReady);
  return compose(J.sentence, { heading, text: c });
}
export function artDescription(index, stage, style) {
  const A = T.art_description;
  return compose(C.artDescription, { shape: L([A.shape0, A.shape1, A.shape2, A.shape3][index]), stage: Math.trunc(Number(stage)), serving: L(SERVING[style]) });
}
// Godot update_world(): the dishes on the map, while the block is open, something is shared
// and no story visit is active. `other` is the far-edge placement.
export function worldDishes(m, { opened, storyActive } = {}) {
  if (!opened || storyActive || !sharedCount(m)) return [];
  return Object.keys(m.shared).map(Number).sort((a, b) => a - b).map(index => ({ index, id: RECIPES[index].id, serving: m.shared[index].serving, other: m.shared[index].placement === 1, slot: TABLE_SLOTS[index] }));
}

// Godot artwork(index, stage, style, world), verbatim.
export function artwork(index, stage, style, world = false) {
  let body = '';
  if (!world) {
    body = '<rect width="720" height="480" rx="24" fill="#f2e5c7"/><path d="M36 407H684" stroke="#ad8865" stroke-width="12"/>';
    const clothes = ['448577', 'aa705a', '637eaa', 'ae8651'];
    const skin = ['c69068', 'd1a078', 'b88461', '81543e'];
    body += '<path d="M35 139Q35 92 77 92Q119 92 119 139" fill="#' + clothes[index] + '"/><circle cx="77" cy="67" r="27" fill="#' + skin[index] + '"/><path d="M51 61Q47 28 80 32Q108 30 105 62L94 48 62 49Z" fill="#34312f"/><path d="M104 119L155 144" stroke="#' + skin[index] + '" stroke-width="15" stroke-linecap="round"/>';
    if (index === 1) body += '<circle cx="103" cy="38" r="13" fill="#34312f"/>';
    if (index === 3) body += '<circle cx="66" cy="67" r="10" fill="none" stroke="#34312f" stroke-width="4"/><circle cx="89" cy="67" r="10" fill="none" stroke="#34312f" stroke-width="4"/>';
  }
  const ready = stage >= 5 || world;
  if (style === 0 || !ready) body += '<ellipse cx="360" cy="280" rx="270" ry="150" fill="#23434b"/><ellipse cx="360" cy="265" rx="248" ry="133" fill="#fff5df"/>';
  else body += '<ellipse cx="220" cy="270" rx="150" ry="112" fill="#fff5df" stroke="#23434b" stroke-width="12"/><ellipse cx="500" cy="270" rx="150" ry="112" fill="#fff5df" stroke="#23434b" stroke-width="12"/>';
  const foodStart = body.length;
  const color = ready ? 'ad7c46' : 'c9a67a';
  switch (index) {
    case 0:
      if (stage === 0) body += '<ellipse cx="360" cy="264" rx="165" ry="76" fill="#d4b881"/><path d="M240 250Q350 190 480 250" fill="none" stroke="#9b8057" stroke-width="12"/>';
      else if (stage === 1) body += '<path d="M195 215Q360 160 525 215L500 328Q360 365 220 328Z" fill="#caa06b"/>';
      else if (stage === 2) body += '<ellipse cx="360" cy="266" rx="174" ry="87" fill="#76513b"/><path d="M225 240L270 217 300 248 335 222 375 245 420 218 488 260" stroke="#c4a476" stroke-width="16" fill="none"/>';
      else {
        body += '<path d="M178 200L480 165 548 325 245 361Z" fill="#684731"/><path d="M178 185L480 150 548 310 245 346Z" fill="#' + color + '"/>';
        if (stage === 3) body += '<path d="M210 220L490 190 520 275 245 309Z" fill="#76513b"/>';
        if (stage >= 4) for (let n = 0; n < 5; n++) body += gdf('<path d="M%d 180L%d 327M200 %dL520 %d" stroke="#6e492c" stroke-width="7"/>', [220 + n * 61, 280 + n * 49, 210 + n * 27, 174 + n * 27]);
      }
      break;
    case 1:
      if (stage < 3) {
        for (let n = 0; n < 12; n++) body += gdf('<path d="M%d %dL%d %d" stroke="#d3dfac" stroke-width="11" stroke-linecap="round"/>', [230 + n * 18, 230 + (n % 3) * 24, 265 + n * 18, 268 + (n % 3) * 24]);
        if (stage === 2) body += '<circle cx="285" cy="240" r="18" fill="#9a5744"/><circle cx="420" cy="267" r="17" fill="#76513b"/>';
      } else if (stage < 5) body += '<rect x="200" y="181" width="320" height="164" rx="14" fill="#dbe0b6"/><path d="M230 202H490M230 224H490" stroke="#fbf6df" stroke-width="10"/>';
      else {
        for (const x of [190, 320, 450]) body += gdf('<path d="M%d 214L%d 195 %d 302 %d 322Z" fill="#ad773c"/><path d="M%d 196L%d 182 %d 287 %d 301Z" fill="#eee2ad"/><path d="M%d 213L%d 279" stroke="#b98943" stroke-width="17"/>', [x, x + 100, x + 116, x + 16, x, x + 100, x + 116, x + 16, x + 38, x + 49]);
      }
      break;
    case 2:
      if (stage < 2) {
        body += '<path d="M250 240Q360 352 470 240L447 320Q360 366 273 320Z" fill="#81746a"/><path d="M385 190L440 140" stroke="#b6a58c" stroke-width="27" stroke-linecap="round"/>';
        for (const x of [296, 350, 402]) body += gdf('<ellipse cx="%d" cy="242" rx="30" ry="15" fill="#c64f36"/>', x);
      } else {
        body += '<ellipse cx="435" cy="267" rx="125" ry="83" fill="#efe6bd"/>';
        for (let n = 0; n < 17; n++) body += gdf('<circle cx="%d" cy="%d" r="19" fill="#79513b"/>', [190 + (n * 43) % 184, 220 + (n * 29) % 112]);
        if (stage >= 3) body += '<path d="M190 255L255 215 280 260 337 234" stroke="#bb5037" stroke-width="14" fill="none"/>';
        if (stage >= 5) {
          for (let n = 0; n < 7; n++) body += gdf('<ellipse cx="%d" cy="%d" rx="23" ry="10" transform="rotate(-25 %d %d)" fill="#50804c"/>', [205 + n * 24, 235 + (n % 3) * 28, 205 + n * 24, 235 + (n % 3) * 28]);
          body += '<path d="M425 210Q462 174 493 214Q532 225 503 254Q481 290 449 260Q408 260 425 210Z" fill="#fff9e3"/><circle cx="467" cy="235" r="23" fill="#dfa42b"/>';
        }
      }
      break;
    case 3:
      body += '<ellipse cx="360" cy="284" rx="190" ry="105" fill="#724c3d"/>';
      for (let n = 0; n < 90; n++) body += gdf('<path d="M%d %dL%d %d" stroke="#%s" stroke-width="7" stroke-linecap="round"/>', [210 + (n * 71) % 300, 220 + (n * 29) % 120, 222 + (n * 71) % 300, 222 + (n * 29) % 120, stage >= 3 ? 'c87339' : 'e7d6a3']);
      if (stage >= 2) for (let n = 0; n < 10; n++) body += gdf('<rect x="%d" y="%d" width="17" height="14" rx="3" fill="#%s"/>', [228 + (n * 37) % 260, 233 + (n * 23) % 98, n % 2 ? '557647' : '824835']);
      if (stage === 4) body += '<ellipse cx="360" cy="236" rx="198" ry="109" fill="#8f9d98" stroke="#485c58" stroke-width="10"/><path d="M320 135H400" stroke="#485c58" stroke-width="18"/>';
      break;
  }
  if (style === 1 && ready) {
    const food = body.slice(foodStart);
    body = body.slice(0, foodStart) + '<g transform="translate(40 135) scale(0.5)">' + food + '</g><g transform="translate(320 135) scale(0.5)">' + food + '</g>';
  }
  if (!world && !ready) for (let n = 0; n < 5; n++) body += gdf('<circle cx="%d" cy="437" r="10" fill="#%s"/>', [288 + n * 36, n < stage ? '4d8b7c' : 'd2bb91']);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">' + body + '</svg>';
}
// An 8-entry cache, as Godot texture() (oldest dropped first).
const artCache = new Map();
export function artworkDataURI(index, stage, style, world = false) {
  const key = `${index}:${stage}:${style}:${world}`;
  if (!artCache.has(key)) {
    if (artCache.size >= 8) artCache.delete(artCache.keys().next().value);
    artCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artwork(index, stage, style, world)));
  }
  return artCache.get(key);
}
