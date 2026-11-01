// Gather again: godot/programme_gathering.gd. A second afternoon for this visit only; nothing here is saved.
// Every function returns a new gathering object and leaves its input unchanged.
import { G, C, gdf, web } from './text.js';
import { copied, isHostingDone, programmeIssueOf } from './rules.js';
import { orderText } from './hosted.js';
import { beaInvitationSVG, tilePanelSVG, gatherBoardSVG } from './art.js';

const T = G['programme_gathering.gd'], H = C['hosted_afternoon.gd'], K = C['programme_gathering.gd'];
const BEA_TITLES = C['bea_invitation.gd'].TITLES;
export const freshGather = () => ({ order: [], copies: {}, gestures: [], completed: false, step: 0, notice: '' });
const clone = g => structuredClone(g);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const gatherTitle = g => !g.order.length ? T.title.gather : g.completed ? T.title.revisit : T.title.resume;

// prepare(): a fresh copy of the posted order and the four hosted contributions, or the unchanged gathering and a notice.
export function prepare(g, state) {
  const refuse = notice => ({ ok: false, gather: { ...clone(g), notice }, notice });
  if (!isHostingDone(state) || programmeIssueOf(state.programme.published) !== '') return refuse(T.prepare.plan);
  const prepared = {};
  for (const id of H.IDS) {
    const result = copied(state, id);
    if (!result.valid) return refuse(T.prepare.copy);
    prepared[id] = result.value;
  }
  if (!beaInvitationSVG(prepared.stories) || !tilePanelSVG(prepared.art)) return refuse(T.prepare.pictures);
  return { ok: true, gather: { order: [...state.programme.published], copies: structuredClone(prepared), gestures: [], completed: false, step: 0, notice: '' }, notice: '' };
}

function contribution(g, id) {
  const c = T.contribution;
  if (id === 'stories') return gdf(c.stories, BEA_TITLES[g.copies.stories]);
  if (id === 'beats') {
    const slots = [];
    for (let i = 0; i < 8; i++) if (g.copies.beats & (1 << i)) slots.push(String(i + 1));
    return slots.length ? gdf(c.beatsSome, slots.join(', ')) : c.beatsNone;
  }
  if (id === 'art') return gdf(c.art, g.copies.art.palette);
  if (id === 'pause') return gdf(c.pause, g.copies.pause === 'arc' ? c.arc : c.pairs);
  return '';
}
export function response(g) {
  if (!g.order.length) return '';
  const text = g.step === 0 ? K.OPENINGS[g.order[0]] : K.HANDOFFS[g.order[g.step - 1] + '>' + g.order[g.step]][g.gestures[g.step - 1]];
  return text + '\n' + contribution(g, g.order[g.step]);
}
export const closure = () => T.closure.text;

// open_gathering(): prepares on first open. Returns the gathering, whether it opened, and the announcement.
export function openGather(g, state) {
  let next = clone(g);
  if (!next.order.length) {
    const p = prepare(next, state);
    if (!p.ok) return { gather: p.gather, opened: false, announce: p.notice };
    next = p.gather;
  }
  next.notice = '';
  return { gather: next, opened: true, announce: gatherTitle(next) + '. ' + response(next), focus: 'reader' };
}
// handoff(gesture): 0 is Invite (or New visit once complete), 1 is Make room.
export function handoff(g, gesture, state) {
  if (g.order.length && g.completed && g.step === g.gestures.length && gesture === 0) {
    const p = prepare(g, state);
    if (!p.ok) return { gather: p.gather, announce: p.notice, focus: 'reader' };
    return { gather: p.gather, announce: T.handoff.copied + response(p.gather), focus: 'reader' };
  }
  if (!g.order.length || g.completed || gesture < 0 || gesture > 1 || g.gestures.length >= 3 || g.step !== g.gestures.length) return { gather: g, announce: null };
  const next = clone(g);
  next.gestures.push(gesture); next.step = next.gestures.length; next.notice = '';
  return { gather: next, announce: response(next), focus: 'reader' };
}
export function review(g, direction) {
  if (!g.order.length) return { gather: g, announce: null };
  const next = clone(g);
  next.step = Math.min(Math.max(next.step + direction, 0), next.gestures.length);
  return { gather: next, announce: response(next), focus: 'reader' };
}
export function advance(g) {
  if (g.step < g.gestures.length) return review(g, 1);
  if (!g.completed && g.gestures.length === 3) {
    const next = clone(g); next.completed = true;
    return { gather: next, announce: T.advance.complete + closure(), focus: 'reader' };
  }
  return { gather: g, announce: null };
}
export const backToPosted = g => T.back_to_studio.back + gatherTitle(g) + T.back_to_studio.tail;
// programme_studio.gd close_studio(true) while the gathering is showing.
export const gatherClose = g => G['programme_studio.gd'].close_studio.back + G['programme_studio.gd'].close_studio.gathering + gatherTitle(g) + web(G['programme_studio.gd'].close_studio.gatheringTail);

export function gatherDescription(g, state) {
  const d = T.description;
  let text = response(g);
  if (g.completed) text += '\n' + closure();
  else if (g.step === g.gestures.length) text += g.gestures.length < 3 ? d.choose : d.all;
  text += d.order + orderText(g.order) + '. ' + (same(g.order, state.hosting.order) ? d.same : d.different);
  text += web(d.help);
  if (g.notice) text = g.notice + '\n' + text;
  return text;
}
// refresh(): the reader, the heading and the tray buttons. Hidden buttons are left out of `buttons`.
export function gatherView(g, state) {
  const r = T.refresh;
  const heading = r.heading + (g.completed ? r.revisited : r.four) + r.credit;
  const choosing = !g.completed && g.step === g.gestures.length && g.gestures.length < 3;
  const restart = g.completed && g.step === g.gestures.length;
  const invite = { id: 'gather-choice-0', label: r.invite + H.OWNERS[H.IDS.indexOf(g.order[Math.min(3, g.step + 1)])], hidden: !choosing, disabled: !choosing };
  const room = { id: 'gather-choice-1', label: r.room, hidden: !choosing, disabled: !choosing };
  if (restart) Object.assign(invite, { label: same(g.order, state.programme.published) ? r.newVisit : r.newPlan, hidden: false, disabled: false });
  const previous = { id: 'gather-previous', label: T.setup.previous, hidden: g.step <= 0, disabled: g.step === 0 };
  const next = { id: 'gather-next', label: g.step < g.gestures.length ? r.next : g.completed ? r.complete : r.finish, hidden: choosing, disabled: choosing || restart };
  const back = { id: 'gather-back', label: T.setup.back }, keep = { id: 'gather-keep', label: T.setup.keep };
  const text = gatherDescription(g, state);
  const desc = g.order.map((id, i) => `${i + 1}. ${H.OWNERS[H.IDS.indexOf(id)]}, ${i === 0 ? T._draw.opening : i <= g.gestures.length ? (g.gestures[i - 1] === 0 ? T._draw.invite : T._draw.room) : T._draw.notYet}`).join('; ');
  const board = gatherBoardSVG(g, { title: heading.split('\n')[0], desc, marks: { opening: T._draw.opening, invite: T._draw.invite, room: T._draw.room, notYet: T._draw.notYet } });
  return { heading, text, board, buttons: [invite, room, previous, next, back, keep], announce: g.notice || response(g) };
}
