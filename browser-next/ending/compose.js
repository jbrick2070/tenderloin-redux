// Whole-sentence composites over the ending's Godot fragments (docs/I18N_PLAN.md 2.7), and the display tables for ids the
// ending shows. Godot builds these sentences with `+`; each composite here is that concatenation with the inserted values as
// named {placeholders}, so a translator can reorder them. Every composite is assembled from the drift-tested GODOT fragments
// (with web() where the port applies it), so English stays Godot's words; tests/next-i18n-ending.test.mjs proves each one
// equals the legacy concatenation and that none is a Godot literal. Pure apart from the active locale i18n.js holds.
import { G, web } from './text.js';
import { L, format, fillNamed, FLAVORS, list, isEnglish, localeInfo } from '../i18n.js';

const NAMED = Object.freeze({ ...FLAVORS.named, legacy: (template, args) => fillNamed(template, Array.isArray(args) ? args[0] : args) });
// compose(template, values): the composite looked up and filled. English is fillNamed, which equals the concatenation.
export const compose = (template, values = {}) => format(template, [values], NAMED);
// A label as Godot puts it mid-sentence: English lowercases it (String.to_lower, today's code); a locale lowercases its own
// translation by its own rules. Only common nouns go through here (place, copy, film shot, display and plan labels), never names.
export const midSentence = text => isEnglish() ? String(text).toLowerCase() : String(text).toLocaleLowerCase(localeInfo().intl);
// A list of display texts: English joins as Godot does; a locale uses Intl.ListFormat.
export const joined = (items, separator) => list(items, xs => xs.join(separator));
// A table value by id, localized; an unknown id is shown as Godot shows it (fallback(id)).
export const display = (table, id, fallback = String) => Object.hasOwn(table, id) ? L(table[id]) : fallback(id);

// Godot % slots of a template filled with placeholders or fixed fragments, in order (for composites over printf templates).
const fill = (template, ...parts) => { let i = 0; return template.replace(/%[sd]/g, () => parts[i++]); };

const HA = G['hosted_afternoon.gd'], PS = G['programme_studio.gd'], PG = G['programme_gathering.gd'], CL = G['civic_listening.gd'];
const FS = G['film_screening.gd'], HB = G['helper_bench.gd'], HR = G['habitat_room.gd'], OC = G['orbital_commons.gd'];
const MA = G['main.gd'], MS = G['mural_stories.gd'];
const AC = OC.acknowledgments, FT = OC.finale_text, D = HR.departure_text, R = HR.refresh;

export const ENDING_COMPOSE = {
  // hosted_afternoon.gd detail() and invitation()
  hostedDetail: '{owner}: "{reply}"\n{heading}\n{result}',
  storiesResult: HA.detail.storiesResult + '{title}.',
  pauseResult: HA.detail.pauseResult + '{title}.',
  invitation: 'Bea: "{opening} {offer}"',
  // programme_studio.gd refresh and description, hosted view
  studioHeading: PS.refresh.heading + '{view}',
  copiedOrder: PS.description.copiedOrder + '{order}.',
  picture: PS.description.picture + '{picture}' + PS.description.pictureTail,
  cardPlaced: '{number}. {title}\n{owner}',
  cardOpen: '+ {title}\n{owner}',
  cardSelected: '{card} selected',
  titled: '{title}. {text}',
  // programme_gathering.gd
  gatherHeading: PG.refresh.heading + '{view}',
  gatherOrder: PG.description.order + '{order}.',
  inviteOwner: PG.refresh.invite + '{owner}',
  backToPosted: PG.back_to_studio.back + '{title}' + PG.back_to_studio.tail,
  gatherClose: PS.close_studio.gathering + '{title}' + web(PS.close_studio.gatheringTail),
  boardCard: '{number}. {owner}, {mark}',
  boardOwner: '{number}. {owner}',
  // civic_listening.gd refresh, request_text and follow_invitation
  civicFollow: CL.refresh.follow + '{button}' + CL.refresh.followTail,
  civicRequest: CL.request_text.themes + '{request}',
  civicInvitation: CL.follow_invitation.invitation + '{button}' + CL.follow_invitation.tail,
  // film_screening.gd description and refresh
  screenWide: fill(FS.description.line, '{shot}', FS.description.wide),
  screenClose: fill(FS.description.line, '{shot}', FS.description.close),
  frameName: fill(FS.refresh.frame, '{number}', '{shot}', ''),
  frameSelected: fill(FS.refresh.frame, '{number}', '{shot}', FS.refresh.selected),
  // helper_bench.gd description: the jig line for each pair of supports
  jig: {
    both: fill(HB.description.line, '{form}', HB.description.fitted, HB.description.fitted, '{status}'),
    left: fill(HB.description.line, '{form}', HB.description.fitted, HB.description.empty, '{status}'),
    right: fill(HB.description.line, '{form}', HB.description.empty, HB.description.fitted, '{status}'),
    none: fill(HB.description.line, '{form}', HB.description.empty, HB.description.empty, '{status}'),
  },
  // habitat_room.gd description, departure_text and refresh
  roomPlace: '{place}: {item}',
  roomList: '{places}' + HR.description.tail,
  linksAll: D.all + '{title}' + D.allTail,
  departureTail: D.open + '{place}' + fill(D.links, '{count}') + '{ready}' + D.title + '{title}' + web(D.tail),
  roomSelected: R.selected + '{item}' + R.for + '{place}' + R.selectedTail,
  itemPlaced: '{item}' + R.placedName,
  itemUnplaced: '{item}' + R.unplacedName,
  detailOf: R.detailOf + '{item}. {description}',
  roomModel: R.roomModel + '{description}',
  frameAlt: R.frame + '{description}. {status}',
  roomCredit: '{chapter}' + R.credit,
  // orbital_commons.gd: walking, the response at each view, the acknowledgments and the finale recap
  youAreBy: OC.walk_to.here + '{place}' + OC.walk_to.hereTail,
  walkingTo: OC.walk_to.walking + '{place}' + OC.walk_to.walkingTail,
  thanhJoins: OC.invite_thanh.join + '{place}' + OC.invite_thanh.joinTail,
  youReached: OC._process.reached + '{place}' + OC._process.reachedTail,
  responseArt: OC.response.art + '{palette}' + OC.response.artTail,
  responseFilm: OC.response.film + '{ending}' + OC.response.filmTail + '{beats}',
  responseSeats: OC.response.seats + '{seats}' + OC.response.seatsMid + '{format}' + OC.response.seatsTail,
  acknowledgments: AC.gathered + '{place}' + AC.gatheredTail + '{palette}' + AC.shapes + '{spare}' + AC.open + '{framing}' + AC.plan + '{plan}' + AC.looked
    + '{beats}' + AC.thanh + '{seats}' + AC.and + '{format}' + AC.pause + '{title}' + AC.never + '{place}' + AC.tail,
  yourResponse: FT.response + '{answer}',
  youAnswer: FT.you + '{answer}',
  memories: FT.memories + '{memory}',
  recapArt: FT.recapArt + '{palette}' + FT.recapArtMid + '{spare}.',
  recapFilm: FT.recapFilm + '{first}, {second}, {third}. {framing}.',
  recapSeats: FT.recapSeats + '{seats}' + FT.recapSeatsMid + '{format}.',
  returnPanel: FT.returnHome + '{number}' + FT.of3 + '{panel}' + FT.returnTail,
  returnFold: FT.return0 + '{title}' + FT.return0Mid + '{place}' + FT.return0Tail,
  speculative: FT.speculative + '{beats}' + web(FT.tail),
  starsHeading: OC.refresh.heading + '{view}',
  walkHere: '{label}' + OC.refresh.here,
  commonsInvitation: OC.refresh.invitation + '{title}' + OC.refresh.copies + '{beats}' + web(OC.refresh.tail),
  // main.gd mural_scene_reply and edit_mural_scene; mural_stories.gd select_scene, setup and present
  sceneReply: '{scenes}' + MA.mural_scene_reply.tail,
  celesteSays: '{message}' + MA.edit_mural_scene.celeste + '{reply}',
  storiesText: '{message}' + MS.present.celeste + '{reply}' + MS.present.street,
  onBrush: '{scene}' + MS.select_scene.brush,
  sceneTooltip: '{scene}' + MS.setup.tooltip,
  // The paper's alt names each half and what is painted there: the first clause of present()'s target name.
  targetAlt: '{half} half: {scene}',
  paperAlt: '{left}; {right}',
  paletteButton: MS.present.paletteLabel + '{palette}',
  musicOn: MS.present.musicLabel + MS.present.on,
  musicOff: MS.present.musicLabel + MS.present.off,
};

// Display text for ids, equal to what Godot shows today: String.capitalize of a palette id, and a slot with its first letter
// uppercased. A locale translates these; it never title-cases an id.
export const ENDING_DISPLAY = {
  artPalettes: { warm: 'Warm', cool: 'Cool' },
  muralPalettes: { garden: 'Garden', sunset: 'Sunset', ocean: 'Ocean' },
  slots: { left: 'Left', right: 'Right' },
};

// The ending's own fork labels (ending/ui.js): accessible names Godot has no counterpart for.
export const ENDING_UI = {
  reader: 'Story text',
  hostedCards: 'Hosted contributions',
  screeningFrames: 'Screening frames',
  scenes: 'Scenes',
};
