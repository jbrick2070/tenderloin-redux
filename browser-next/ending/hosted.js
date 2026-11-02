// The hosted afternoon review and Bea's Listening Hour offer: godot/hosted_afternoon.gd and the hosted view of
// programme_studio.gd (description, refresh, follow_hosted_invitation, close_studio). Pure: state in, view out.
import { G, C, gdf, web } from './text.js';
import { compose, joined, display, ENDING_COMPOSE as K, ENDING_DISPLAY } from './compose.js';
import { L } from '../i18n.js';
import { copied, programmeTitle, isHostingDone, isCivicAvailable } from './rules.js';
import { beaInvitationSVG, pinboardSVG, tilePanelSVG } from './art.js';

const T = G['hosted_afternoon.gd'], S = G['programme_studio.gd'], H = C['hosted_afternoon.gd'];
const BEA_TITLES = C['bea_invitation.gd'].TITLES, QUIET_TITLES = C['quiet_seats.gd'].TITLES;
export const HOSTED_IDS = H.IDS;

// hosted_afternoon.gd detail(game, id). POSITIONS reach Godot's heading template as ids: a locale picks its ordinal by $select.
export function hostedDetail(state, id) {
  const d = T.detail, index = H.IDS.indexOf(id), position = state.hosting.order.indexOf(id);
  if (index < 0 || position < 0 || position >= H.POSITIONS.length) return L(d.none);
  const heading = gdf(d.heading, programmeTitle(id), H.POSITIONS[position]);
  const copy = copied(state, id);
  if (!copy.valid) return heading + L(d.unavailable);
  const value = copy.value;
  let result = '', reply = '';
  if (id === 'stories') { result = compose(K.storiesResult, { title: L(BEA_TITLES[value]) }); reply = L(value === 'memory' ? d.storiesMemory : d.storiesFuture); }
  else if (id === 'beats') {
    const slots = [];
    for (let i = 0; i < 8; i++) if (value & (1 << i)) slots.push(String(i + 1));
    result = slots.length ? gdf(d.beatsSome, slots.length, joined(slots, ', ')) : L(d.beatsNone);
    reply = slots.length ? gdf(d.beatsSomeReply, slots.length) : L(d.beatsNoneReply);
  } else if (id === 'art') { result = gdf(d.artResult, display(ENDING_DISPLAY.artPalettes, value.palette)); reply = L(value.palette === 'warm' ? d.artWarm : d.artCool); }
  else if (id === 'pause') { result = compose(K.pauseResult, { title: L(QUIET_TITLES[value]) }); reply = L(value === 'arc' ? d.pauseArc : d.pausePairs); }
  return compose(K.hostedDetail, { owner: L(H.OWNERS[index]), reply, heading, result });
}
export const hostedReplies = state => H.IDS.map(id => hostedDetail(state, id));

// hosted_afternoon.gd invitation_available and invitation.
export const invitationAvailable = state => isHostingDone(state) && isCivicAvailable(state) && ['idle', 'planning', 'meeting'].includes(state.civic.phase);
export function invitation(state) {
  const t = T.invitation;
  if (!isHostingDone(state)) return '';
  if (state.civic.phase === 'done') return L(web(t.done));
  const opening = gdf(t.opening, programmeTitle(state.hosting.order[0]), programmeTitle(state.hosting.order[3]));
  const offer = L(state.civic.phase === 'planning' ? t.planning : state.civic.phase === 'meeting' ? t.meeting : t.idle);
  return compose(K.invitation, { opening, offer });
}

export const orderText = order => order.length ? order.map(programmeTitle).join(S.order_text.join) : L(S.order_text.none);
// programme_studio.gd hosted_picture_description and hosted_picture, as SVG.
export function hostedPicture(state, selected) {
  const copy = copied(state, selected), p = S.hosted_picture_description;
  if (selected === 'stories' && copy.valid) return { alt: L(p.stories), svg: beaInvitationSVG(copy.value) };
  if (selected === 'art' && copy.valid) return { alt: L(p.art), svg: tilePanelSVG(copy.value) };
  return { alt: L(p.order), svg: pinboardSVG(state.hosting.order) };
}

// programme_studio.gd refresh(announce) and description() with hosted_view true. The studio's edit buttons are
// disabled in this view, so 2D does not draw them.
export function hostedView(state, selected = 'stories') {
  const d = S.description, r = S.refresh, offer = invitationAvailable(state), picture = hostedPicture(state, selected);
  let text = hostedDetail(state, selected) + '\n' + invitation(state) + compose(K.copiedOrder, { order: orderText(state.hosting.order) });
  if (offer) text += L(d.follow);
  text += compose(K.picture, { picture: picture.alt });
  const heading = compose(K.studioHeading, { view: L(r.hosted) });
  const cards = H.IDS.map((id, i) => {
    const at = state.hosting.order.indexOf(id), label = compose(at >= 0 ? K.cardPlaced : K.cardOpen, { number: at + 1, title: programmeTitle(id), owner: L(H.OWNERS[i]) });
    return { id, label, name: selected === id ? compose(K.cardSelected, { card: label }) : label, pressed: selected === id };
  });
  return {
    heading, credit: L(r.credit), text, picture, cards, selected,
    primary: { label: L(offer ? r.follow : r.complete), disabled: !offer }, view: { label: L(r.draft) }, back: { label: L(offer ? r.keep : r.back) },
    announce: compose(K.titled, { title: heading, text }),
  };
}
// programme_studio.gd follow_hosted_invitation: chapterText is the consumed chapter announcement plus a space, or ''.
export function followHosted(state, chapterText = '') {
  if (!invitationAvailable(state)) return null;
  return { announce: chapterText + invitation(state) + L(S.follow_hosted_invitation.focused), panel: invitation(state) };
}
// programme_studio.gd close_studio(true) from the hosted view.
export const hostedClose = state => L(S.close_studio.back) + L(invitationAvailable(state) ? S.close_studio.offer : S.close_studio.remain);
// programme_studio.gd description(), posted view: the Gather again line 2D's poster adds once hosting is done.
export const postedGatherLine = state => isHostingDone(state) ? L(S.description.postedGather) : '';
