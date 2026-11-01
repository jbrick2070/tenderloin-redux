// The shared speech bubble, ported from godot/main.gd ensure_speech_bubble, bubble_shape_mesh,
// speech_bubble_screen_scale, speech_bubble_width_px, refresh_speech_bubble_wrap,
// spoken_text_from_line, show_speech_bubble, announce_speech_location, update_speech_bubble and
// fit_overlay_around_player. Pure: no DOM, canvas, timers or storage. The caller measures text
// (a canvas measureText at BUBBLE.font label pixels, or the default estimate) and draws the
// outline this module returns. Godot's numbers and text are pinned by tests/next-characters.test.mjs.
//
// Units: "label px" are Godot's bubble units (24 px font, 3 px border); multiply by screenScale()
// for CSS pixels. Godot builds the bubble with y up and its tail tip at the anchor; layout() returns
// screen points with y down.
import { L, isEnglish } from './i18n.js';
import { NEIGHBOR_NAMES } from './story.js';

export const BUBBLE = {
  pixel: 0.0024, // SPEECH_BUBBLE_PIXEL: metres per label px in 3D, kept for the record
  font: 24, // SPEECH_BUBBLE_FONT, label px
  heightM: 5.0, // SPEECH_BUBBLE_HEIGHT_M above the speaker
  hideDistM: 45.0, // SPEECH_BUBBLE_HIDE_TARGET_DIST_M from the camera target
  border: 3.0, // bubble_shape_mesh grow for the border
  padX: 28.0, padY: 12.0, tail: 10.0, // speech_bubble_box = text + (28, 12), tail height 10
  tailHalf: 11.0, // tw in bubble_shape_mesh
  chamferMax: 10.0, chamferRatio: 0.3,
  hold: { base: 4.5, perChar: 0.055, min: 6.0, max: 14.0 },
  scale: { divisor: 900.0, min: 0.68, max: 0.84 },
  wrap: { inset: 12.0, chrome: 34.0, min: 120.0, max: 440.0 },
  pop: { seconds: 0.2, from: 0.6 },
  bob: { rate: 2.1, metres: 0.06 },
  areaInset: 2.0, rewardGrow: 3.0, playerGrow: 2.0,
  // Color(0.11, 0.23, 0.25, 0.95), Color(1.0, 0.973, 0.91, 0.97) and Color("1d2b2f") as CSS.
  colors: { border: 'rgba(28, 59, 64, 0.95)', fill: 'rgba(255, 248, 232, 0.97)', text: '#1d2b2f' },
};
// Fork additions, not Godot numbers. 2D is a top-down map, so "5 m above the speaker" becomes a lift
// above the neighbor's name chip, in screen px; lineHeight is the wrapped line step in label px.
export const FORK_BUBBLE = { anchorLiftPx: 52, lineHeight: 1.25, charWidth: 0.52 };
export const BUBBLE_TEXT = { notice: 'Full dialogue in %s.', panel: 'the conversation panel', activity: 'the activity instructions', info: 'Info' };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
// Godot String.length() counts code points, not UTF-16 units.
export const textLength = text => [...String(text ?? '')].length;

// Godot strips a speaker envelope only when the name before ': "' is at most 12 UTF-16 code units, which every English speaker
// name fits. A locale's names can be longer (an Arabic or Thai transliteration), so there the limit is the longest of the speakers'
// names in that language, never under 12. names: the English speaker names (the five neighbors by default). English is 12.
export const SPEAKER_LIMIT = 12;
const SPEAKERS = Object.values(NEIGHBOR_NAMES);
export function speakerLimit(names = SPEAKERS) {
  if (isEnglish()) return SPEAKER_LIMIT;
  let limit = SPEAKER_LIMIT;
  for (const name of names) limit = Math.max(limit, String(L(String(name))).length);
  return limit;
}
// 'Bea: "Welcome..."' -> 'Welcome...' (the nameplate already says who is talking).
export function spokenText(line, names = SPEAKERS) {
  const s = String(line ?? ''), at = s.indexOf(': "');
  if (at >= 0 && at <= speakerLimit(names) && s.endsWith('"') && s.length > at + 4) return s.substr(at + 3, s.length - at - 4);
  return s;
}
export const holdSeconds = text => clamp(BUBBLE.hold.base + textLength(String(text ?? '').trim()) * BUBBLE.hold.perChar, BUBBLE.hold.min, BUBBLE.hold.max);
// CSS px per label px: about 18 px text on a 760 px-tall window, about 16 px on phones.
export const screenScale = viewportHeight => clamp(num(viewportHeight, 760) / BUBBLE.scale.divisor, BUBBLE.scale.min, BUBBLE.scale.max);
// Wrap width in label px: padding and border fit a phone without shrinking the font.
export const wrapWidth = (playAreaWidth, scale) => clamp((num(playAreaWidth) - BUBBLE.wrap.inset) / (scale > 0 ? scale : BUBBLE.scale.min) - BUBBLE.wrap.chrome, BUBBLE.wrap.min, BUBBLE.wrap.max);
export const defaultMeasure = text => textLength(text) * BUBBLE.font * FORK_BUBBLE.charWidth;
export const popScale = (age, reducedMotion = false) => reducedMotion ? 1 : BUBBLE.pop.from + (1 - BUBBLE.pop.from) * (1 - Math.pow(1 - clamp(num(age) / BUBBLE.pop.seconds, 0, 1), 3));
export const bobMetres = (age, reducedMotion = false) => reducedMotion ? 0 : Math.sin(num(age) * BUBBLE.bob.rate) * BUBBLE.bob.metres;

// Godot AUTOWRAP_WORD_SMART: break at spaces; a word wider than the line breaks between letters.
// Explicit newlines are kept. measure(text) returns label px at BUBBLE.font.
export function wrapLines(text, width, measure = defaultMeasure) {
  const lines = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const word of para.split(' ').filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (measure(tryLine) <= width) { line = tryLine; continue; }
      if (line) lines.push(line);
      line = '';
      let rest = word;
      while (measure(rest) > width && textLength(rest) > 1) {
        const chars = [...rest];
        let n = chars.length - 1;
        while (n > 1 && measure(chars.slice(0, n).join('')) > width) n--;
        lines.push(chars.slice(0, n).join(''));
        rest = chars.slice(n).join('');
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}
// speech_bubble_box: {w, h, tail} in label px.
export function bubbleBox(lines, width, measure = defaultMeasure) {
  const textW = Math.max(0, ...lines.map(line => measure(line)));
  return { w: Math.min(width, textW) + BUBBLE.padX, h: lines.length * BUBBLE.font * FORK_BUBBLE.lineHeight + BUBBLE.padY, tail: BUBBLE.tail };
}
// bubble_shape_mesh: the chamfered outline (8 points) and the tail triangle, y up, tail tip at 0.
export function bubbleShape(w, h, tailH, grow = 0, shift = 0) {
  const x0 = shift - w * 0.5 - grow, x1 = shift + w * 0.5 + grow, y0 = tailH - grow, y1 = tailH + h + grow;
  const c = Math.min(BUBBLE.chamferMax, h * BUBBLE.chamferRatio) + grow * 0.5, tw = BUBBLE.tailHalf + grow;
  return {
    outline: [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]].map(([x, y]) => ({ x, y })),
    tail: [{ x: -tw, y: y0 + 1 }, { x: tw, y: y0 + 1 }, { x: 0, y: -grow * 1.4 }],
  };
}

// Rects are {x, y, w, h} in screen px.
const hasArea = r => !!r && r.w > 0 && r.h > 0;
const grow = (r, by) => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 });
const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const encloses = (a, b) => b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;
function intersection(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
}
// fit_overlay_around_player: the least-moved placement of wanted inside area that avoids the
// player and an extra blocked rect (the reward banner), or null when nothing fits.
export function fitAround(wanted, area, player = null, extra = null) {
  if (!hasArea(area) || wanted.w > area.w || wanted.h > area.h) return null;
  const blocked = hasArea(player) ? grow(player, BUBBLE.playerGrow) : null;
  let regions = [area];
  for (const obstacle of [blocked, extra]) {
    if (!hasArea(obstacle)) continue;
    const remaining = [];
    for (const region of regions) {
      if (!intersects(region, obstacle)) { remaining.push(region); continue; }
      const cut = intersection(region, obstacle);
      remaining.push({ x: region.x, y: region.y, w: region.w, h: cut.y - region.y });
      remaining.push({ x: region.x, y: cut.y + cut.h, w: region.w, h: region.y + region.h - (cut.y + cut.h) });
      remaining.push({ x: region.x, y: region.y, w: cut.x - region.x, h: region.h });
      remaining.push({ x: cut.x + cut.w, y: region.y, w: region.x + region.w - (cut.x + cut.w), h: region.h });
    }
    regions = remaining;
  }
  let best = null, distance = Infinity;
  for (const region of regions) {
    if (region.w < wanted.w || region.h < wanted.h) continue;
    const x = clamp(wanted.x, region.x, region.x + region.w - wanted.w), y = clamp(wanted.y, region.y, region.y + region.h - wanted.h);
    const candidate = { x, y, w: wanted.w, h: wanted.h }, movement = (x - wanted.x) ** 2 + (y - wanted.y) ** 2;
    if (encloses(area, candidate) && !(blocked && intersects(candidate, blocked)) && !(hasArea(extra) && intersects(candidate, extra)) && movement < distance) { best = candidate; distance = movement; }
  }
  return best;
}

// A new bubble (show_speech_bubble). Empty text gives null. hold overrides the computed time.
export function showBubble(id, text, hold = -1) {
  const body = String(text ?? '').trim();
  if (!body) return null;
  return { id: String(id ?? ''), text: body, age: 0, timer: hold > 0 ? hold : holdSeconds(body), deferred: false, inActivity: false, matched: false };
}

// One frame of update_speech_bubble, for a bubble from showBubble. ctx: {dt (s), viewport {w, h},
// playArea rect, anchor {x, y} screen px of the tail tip, player rect, reward rect (or null),
// overview, targetDist (map px from the camera target to the speaker), pxPerMetre, activityText
// (the open dialog's text, or ''), reducedMotion, measure}. Returns {bubble, layout, announce}:
// bubble null means hidden for good; layout null means not drawn this frame; announce is a
// location for speechNotice ('panel'), or null.
export function stepBubble(bubble, ctx = {}) {
  if (!bubble) return { bubble: null, layout: null, announce: null };
  const dt = Math.max(0, num(ctx.dt)), pxPerMetre = num(ctx.pxPerMetre, 5), measure = ctx.measure ?? defaultMeasure;
  const inActivity = typeof ctx.activityText === 'string' && ctx.activityText.includes(bubble.text);
  if (bubble.matched && !inActivity) return { bubble: null, layout: null, announce: null };
  if (ctx.overview === true || num(ctx.targetDist) > BUBBLE.hideDistM * pxPerMetre) return { bubble: null, layout: null, announce: null };
  const next = { ...bubble, matched: bubble.matched || inActivity };
  const scale = screenScale(ctx.viewport?.h), width = wrapWidth(ctx.playArea?.w, scale), lines = wrapLines(next.text, width, measure);
  const box = bubbleBox(lines, width, measure), shift = 0, s = scale;
  const anchor = { x: num(ctx.anchor?.x), y: num(ctx.anchor?.y) - bobMetres(next.age, ctx.reducedMotion) * pxPerMetre };
  const full = { x: anchor.x + (shift - box.w * 0.5 - BUBBLE.border) * s, y: anchor.y - (box.tail + box.h + BUBBLE.border) * s, w: (box.w + BUBBLE.border * 2) * s, h: (box.h + box.tail + 7.2) * s };
  const area = ctx.playArea ? grow(ctx.playArea, -BUBBLE.areaInset) : null, reward = hasArea(ctx.reward) ? grow(ctx.reward, BUBBLE.rewardGrow) : null;
  const fitted = area ? fitAround(full, area, ctx.player, reward) : null;
  let layout = null, announce = null;
  next.deferred = !fitted;
  const wasInActivity = bubble.inActivity;
  next.inActivity = next.deferred && inActivity;
  if (next.deferred) {
    if (next.inActivity) { if (!wasInActivity) announce = 'panel'; }
    else if (reward) return { bubble: next, layout: null, announce: null }; // reading time starts once the reward clears
    else if (!bubble.deferred) announce = 'info';
  } else {
    const dx = fitted.x - full.x, dy = fitted.y - full.y, pop = popScale(next.age + dt, ctx.reducedMotion);
    layout = bubbleLayout(next.text, lines, box, { x: anchor.x, y: anchor.y }, dx, dy, s, pop);
    next.age += dt;
  }
  next.timer -= dt;
  if (next.timer <= 0) return { bubble: null, layout, announce };
  return { bubble: next, layout, announce };
}
// Screen geometry for drawing: border and fill outlines (the tail tip stays on the anchor while the
// box slides by dx), text lines with their centre points, the font size and the line step, in CSS px.
export function bubbleLayout(text, lines, box, anchor, dx, dy, scale, pop = 1) {
  const s = scale * pop, toScreen = p => ({ x: anchor.x + p.x * s, y: anchor.y + dy - p.y * s });
  const shiftLabel = dx / s;
  const fill = bubbleShape(box.w, box.h, box.tail, 0, shiftLabel), border = bubbleShape(box.w, box.h, box.tail, BUBBLE.border, shiftLabel);
  const step = BUBBLE.font * FORK_BUBBLE.lineHeight * s, top = anchor.y + dy - (box.tail + box.h) * s + (BUBBLE.padY / 2) * s;
  return {
    text, scale: s,
    fill: fill.outline.map(toScreen), fillTail: fill.tail.map(toScreen),
    border: border.outline.map(toScreen), borderTail: border.tail.map(toScreen),
    font: BUBBLE.font * s, lineStep: step,
    lines: lines.map((line, i) => ({ text: line, x: anchor.x + dx, y: top + step * (i + 0.5) })),
    rect: { x: anchor.x + dx - (box.w * 0.5 + BUBBLE.border) * s, y: anchor.y + dy - (box.tail + box.h + BUBBLE.border) * s, w: (box.w + BUBBLE.border * 2) * s, h: (box.h + box.tail + 7.2) * s },
    colors: BUBBLE.colors,
  };
}
// announce_speech_location: what to announce when the bubble cannot be drawn. location is
// BUBBLE_TEXT.panel, .activity or .info. Returns null when nothing new needs saying.
export function speechNotice(lastAnnouncement, bubbleText, location) {
  const notice = BUBBLE_TEXT.notice.replace('%s', location), spoken = String(bubbleText ?? '').replace(/\n/g, ' ').trim(), last = String(lastAnnouncement ?? '');
  if (last.includes(spoken)) return last.endsWith(notice) ? null : `${last} ${notice}`;
  return `${notice} ${spoken}`;
}
