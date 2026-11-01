// The helper bench: godot/helper_bench.gd. Visit-only stages; returns new bench objects.
import { G, C, gdf, web } from './text.js';
import { filmDone, filmShotTitle } from './rules.js';
import { GODOT_ART, filmFrameSVG } from './art.js';

const T = G['helper_bench.gd'], FORMS = C['helper_bench.gd'].FORMS, M = C['main.gd'];
export const freshBench = () => ({ selected: 0, fitted: [false, false], complete: false });
export const benchAvailable = filmDone;
const clone = b => structuredClone(b);

// choose_form, fit_support and finish. Each returns { bench, focus } or the same bench when Godot ignores the press.
export function chooseForm(b, index) {
  if (index < 0 || index > 1 || !b.complete && (b.fitted[0] || b.fitted[1])) return { bench: b, changed: false };
  return { bench: { ...clone(b), selected: index }, changed: true, focus: `bench-form-${index}` };
}
export function fitSupport(b, index) {
  if (b.complete || index < 0 || index > 1 || b.fitted[index]) return { bench: b, changed: false };
  const next = clone(b); next.fitted[index] = true;
  return { bench: next, changed: true, focus: next.fitted[0] && next.fitted[1] ? 'bench-assist' : `bench-support-${1 - index}` };
}
export function finish(b) {
  if (b.complete || !b.fitted[0] || !b.fitted[1]) return { bench: b, changed: false };
  return { bench: { ...clone(b), complete: true }, changed: true, focus: `bench-form-${b.selected}` };
}
// open_bench() initial focus.
export const benchFocus = b => b.complete || !b.fitted[0] && !b.fitted[1] ? `bench-form-${b.selected}` : b.fitted[0] && b.fitted[1] ? 'bench-assist' : `bench-support-${b.fitted[0] ? 1 : 0}`;

export function benchDescription(b) {
  const d = T.description;
  return gdf(d.line, FORMS[b.selected], b.fitted[0] ? d.fitted : d.empty, b.fitted[1] ? d.fitted : d.empty, b.complete ? d.done : d.waits) + (b.complete && b.selected === 0 ? d.low : '');
}
// refresh(). recognition is the orbital's recognition() while its gathering is completed, else ''.
export function benchView(b, state, { habitatAvailable = false, orbitCompleted = false, recognition = '' } = {}) {
  const r = T.refresh, film = state.film.result, ending = filmShotTitle(film.order[2]).toLowerCase();
  let body = r.intro;
  if (b.fitted[0] || b.fitted[1]) body = gdf(r.partial, FORMS[b.selected].toLowerCase(), b.fitted[0] && b.fitted[1] ? r.both : r.one);
  if (b.complete) body = gdf(r.complete, FORMS[b.selected].toLowerCase(), ending);
  body += gdf(web(r.copied), film.order.map(filmShotTitle).join(r.join), M.FILM_FRAMING_LABELS[film.framing], M.FILM_PLAN_LABELS[film.plan]);
  body += r.habitat;
  if (orbitCompleted) body = recognition + '\n' + body;
  const lock = !b.complete && (b.fitted[0] || b.fitted[1]);
  const buttons = [
    ...FORMS.map((label, i) => ({ id: `bench-form-${i}`, label, pressed: b.selected === i, disabled: lock })),
    { id: 'bench-support-0', label: T.setup.left, disabled: b.fitted[0] || b.complete },
    { id: 'bench-support-1', label: T.setup.right, disabled: b.fitted[1] || b.complete },
    { id: 'bench-assist', label: b.complete ? r.parked : r.lift, disabled: b.complete || !b.fitted[0] || !b.fitted[1] },
    { id: 'bench-keep', label: T.setup.keep },
    { id: 'bench-habitat', label: orbitCompleted ? r.revisit : r.habitatLabel, disabled: !habitatAvailable },
  ];
  const description = benchDescription(b);
  return { title: T.setup.title, credit: T.setup.credit, text: body, buttons, picture: { svg: helperBenchSVG(b, film), alt: description }, announce: description + ' ' + body };
}
export const benchClose = () => web(T.close_bench.back);
export const benchRefusal = () => T.open_bench.refuse;
export const habitatRefusal = () => T.open_habitat.refuse;

// texture(): the 720x480 bench with its supports, three film frames and the parked helper.
export function helperBenchSVG(b, film) {
  const H = GODOT_ART['helper_bench.gd'].texture;
  let svg = H[1];
  const upper = b.selected === 0 ? 142 : 34;
  for (let i = 0; i < 2; i++) {
    const x = 140 + i * 230;
    svg += b.fitted[i] ? gdf(H[2], x - 20, x - 7, upper, x + 14, upper, x + 26) : gdf(H[3], x - 20, upper, 420 - upper);
  }
  for (let i = 0; i < 3; i++) {
    const px = b.complete ? 160 : 45 + i * 140;
    const py = b.complete ? upper + i * (b.selected === 0 ? 80 : 115) : 20;
    const sx = b.complete ? 0.46 : 0.30, sy = b.complete ? (b.selected === 0 ? 0.32 : 0.46) : 0.30;
    svg += gdf(H[4], px - 3, py - 3, 420 * sx + 6, 236 * sy + 6);
    svg += gdf(H[5], px, py, sx, sy, filmFrameSVG(film, film.order[i]));
  }
  const rx = b.complete ? 580 : 540, raised = b.complete ? 0 : 55;
  svg += gdf(H[6], rx - 23, rx + 32, rx - 43, rx - 33, rx - 13, rx + 13);
  svg += gdf(H[7], rx - 38, rx - 64, 398 - raised, rx - 72, 412 - raised);
  return H[8] + svg + H[9];
}
