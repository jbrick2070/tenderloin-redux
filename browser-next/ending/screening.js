// The film screening and Dez's Helper workshop invitation (godot/film_screening.gd), and Dez's film offer at the end
// of the Listening Hour (civic_listening.gd refresh, follow_invitation, close_hour; main.gd civic_completion_acknowledgment).
import { G, C, gdf } from './text.js';
import { compose, midSentence, ENDING_COMPOSE as K } from './compose.js';
import { L } from '../i18n.js';
import { filmDone, filmShotTitle, validCivicPlan, isFilmAvailable } from './rules.js';
import { filmFrameSVG } from './art.js';

const T = G['film_screening.gd'], M = C['main.gd'];
export const screeningAvailable = filmDone;
const clampFrame = frame => Number.isInteger(frame) && frame >= 0 && frame <= 2 ? frame : 0;

function caption(result, id) {
  const table = result.plan === 'later' ? M.FILM_SHOT_LATER_CAPTIONS : M.FILM_SHOT_QUIET_CAPTIONS;
  return Object.hasOwn(table, id) ? L(table[id]) : '';
}
// refresh(): frame is the visit's screen frame (Godot film_screen_frame, never saved).
export function screeningView(state, frame = 0) {
  if (!screeningAvailable(state)) return null;
  const index = clampFrame(frame), r = state.film.result, t = T.refresh, id = r.order[index];
  const description = compose(r.framing === 'wide' ? K.screenWide : K.screenClose, { shot: filmShotTitle(id) });
  const ending = midSentence(filmShotTitle(r.order[2]));
  const text = gdf(t.text, caption(r, id), description, L(M.FILM_FRAMING_LABELS[r.framing]), L(M.FILM_PLAN_LABELS[r.plan]), ending, ending) + L(t.helper);
  const frames = r.order.map((shot, i) => ({ id: `screen-frame-${i}`, label: filmShotTitle(shot), name: compose(i === index ? K.frameSelected : K.frameName, { number: i + 1, shot: filmShotTitle(shot) }), pressed: i === index }));
  return {
    title: gdf(t.title, index + 1), credit: L(T.setup.credit), text, frames, frame: index,
    picture: { svg: filmFrameSVG(r, id), alt: description },
    back: { label: L(T.setup.back) }, helper: { label: L(T.setup.helper) },
    announce: gdf(t.announce, index + 1, description, caption(r, id)),
  };
}
export const screeningClose = () => L(T.close_screening.back);
export const screeningRefusal = () => L(T.open_screening.refuse);

// main.gd civic_completion_acknowledgment().
export function civicAcknowledgment(state) {
  const c = state.civic, t = G['main.gd'].civic_completion_acknowledgment;
  if (c.phase !== 'done' || !validCivicPlan(c.result)) return '';
  const note = L(c.result.notes === 'themes' ? t.themes : t.none), film = L(state.film.phase === 'done' ? t.filmDone : t.filmLater);
  return gdf(t.line, midSentence(L(M.CIVIC_FORMAT_LABELS[c.result.format])), midSentence(L(M.CIVIC_TOPIC_LABELS[c.result.topic])), note, film);
}
// civic_listening.gd invitation_available().
export const civicOfferAvailable = state => state.civic.phase === 'done' && validCivicPlan(state.civic.result) && isFilmAvailable(state);
// civic_listening.gd refresh(), done branch: the offer that leads the remembered turn, plus the request and closing lines.
// filmButton is the label of the film button Follow focuses (Godot block_film_btn.text; 2D's #film-shoot).
export function civicOffer(state, filmButton) {
  if (!civicOfferAvailable(state)) return null;
  const r = G['civic_listening.gd'].refresh, q = G['civic_listening.gd'].request_text, p = state.civic.result;
  let offer = civicAcknowledgment(state);
  offer += L(state.film.phase === 'done' ? r.ready : r.standing);
  offer += compose(K.civicFollow, { button: filmButton });
  return {
    text: offer, request: p.notes === 'themes' ? compose(K.civicRequest, { request: L(M.CIVIC_TOPIC_REQUESTS[p.topic]) }) : L(q.none), beginning: L(r.beginning).replace(/^\n/, ''),
    primary: { label: L(state.film.phase === 'done' ? r.revisit : r.followButton) }, back: { label: L(r.keep) },
  };
}
// civic_listening.gd follow_invitation(): chapterText is the consumed chapter announcement plus a space, or ''.
export const civicFollow = (state, filmButton, chapterText = '') => civicOfferAvailable(state) ? chapterText + compose(K.civicInvitation, { button: filmButton }) : null;
export const civicClose = () => L(G['civic_listening.gd'].close_hour.offer);
