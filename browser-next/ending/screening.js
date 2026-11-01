// The film screening and Dez's Helper workshop invitation (godot/film_screening.gd), and Dez's film offer at the end
// of the Listening Hour (civic_listening.gd refresh, follow_invitation, close_hour; main.gd civic_completion_acknowledgment).
import { G, C, gdf } from './text.js';
import { filmDone, filmShotTitle, validCivicPlan, isFilmAvailable } from './rules.js';
import { filmFrameSVG } from './art.js';

const T = G['film_screening.gd'], M = C['main.gd'];
export const screeningAvailable = filmDone;
const clampFrame = frame => Number.isInteger(frame) && frame >= 0 && frame <= 2 ? frame : 0;

function caption(result, id) {
  const table = result.plan === 'later' ? M.FILM_SHOT_LATER_CAPTIONS : M.FILM_SHOT_QUIET_CAPTIONS;
  return Object.hasOwn(table, id) ? table[id] : '';
}
// refresh(): frame is the visit's screen frame (Godot film_screen_frame, never saved).
export function screeningView(state, frame = 0) {
  if (!screeningAvailable(state)) return null;
  const index = clampFrame(frame), r = state.film.result, t = T.refresh, id = r.order[index];
  const description = gdf(T.description.line, filmShotTitle(id), r.framing === 'wide' ? T.description.wide : T.description.close);
  const ending = filmShotTitle(r.order[2]).toLowerCase();
  const text = gdf(t.text, caption(r, id), description, M.FILM_FRAMING_LABELS[r.framing], M.FILM_PLAN_LABELS[r.plan], ending, ending) + t.helper;
  const frames = r.order.map((shot, i) => ({ id: `screen-frame-${i}`, label: filmShotTitle(shot), name: gdf(t.frame, i + 1, filmShotTitle(shot), i === index ? t.selected : ''), pressed: i === index }));
  return {
    title: gdf(t.title, index + 1), credit: T.setup.credit, text, frames, frame: index,
    picture: { svg: filmFrameSVG(r, id), alt: description },
    back: { label: T.setup.back }, helper: { label: T.setup.helper },
    announce: gdf(t.announce, index + 1, description, caption(r, id)),
  };
}
export const screeningClose = () => T.close_screening.back;
export const screeningRefusal = () => T.open_screening.refuse;

// main.gd civic_completion_acknowledgment().
export function civicAcknowledgment(state) {
  const c = state.civic, t = G['main.gd'].civic_completion_acknowledgment;
  if (c.phase !== 'done' || !validCivicPlan(c.result)) return '';
  const note = c.result.notes === 'themes' ? t.themes : t.none, film = state.film.phase === 'done' ? t.filmDone : t.filmLater;
  return gdf(t.line, M.CIVIC_FORMAT_LABELS[c.result.format].toLowerCase(), M.CIVIC_TOPIC_LABELS[c.result.topic].toLowerCase(), note, film);
}
// civic_listening.gd invitation_available().
export const civicOfferAvailable = state => state.civic.phase === 'done' && validCivicPlan(state.civic.result) && isFilmAvailable(state);
// civic_listening.gd refresh(), done branch: the offer that leads the remembered turn, plus the request and closing lines.
// filmButton is the label of the film button Follow focuses (Godot block_film_btn.text; 2D's #film-shoot).
export function civicOffer(state, filmButton) {
  if (!civicOfferAvailable(state)) return null;
  const r = G['civic_listening.gd'].refresh, q = G['civic_listening.gd'].request_text, p = state.civic.result;
  let offer = civicAcknowledgment(state);
  offer += state.film.phase === 'done' ? r.ready : r.standing;
  offer += r.follow + filmButton + r.followTail;
  return {
    text: offer, request: p.notes === 'themes' ? q.themes + M.CIVIC_TOPIC_REQUESTS[p.topic] : q.none, beginning: r.beginning.slice(1),
    primary: { label: state.film.phase === 'done' ? r.revisit : r.followButton }, back: { label: r.keep },
  };
}
// civic_listening.gd follow_invitation(): chapterText is the consumed chapter announcement plus a space, or ''.
export const civicFollow = (state, filmButton, chapterText = '') => civicOfferAvailable(state) ? chapterText + G['civic_listening.gd'].follow_invitation.invitation + filmButton + G['civic_listening.gd'].follow_invitation.tail : null;
export const civicClose = () => G['civic_listening.gd'].close_hour.offer;
