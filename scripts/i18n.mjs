// Localization tooling for browser-next (docs/I18N_PLAN.md 2.3, 2.13, 4.1). English stays in the JavaScript tables it lives in;
// this script reads them, it never edits them.
//
//   node scripts/i18n.mjs extract          write i18n/source.json: every msgid, with table paths, placeholder signature,
//                                          length class, speaker, addressee and sensitivity tags
//   node scripts/i18n.mjs check [code]     validate browser-next/locales/<code>.json (every locale when omitted) and the manifest
//   node scripts/i18n.mjs init <code>      start a locale: an empty catalog and i18n/review/<code>.json with batches
//   node scripts/i18n.mjs manifest         write browser-next/locales/index.json from the catalogs and their review status
//   node scripts/i18n.mjs pseudo [code]    print a pseudo catalog (qps-ploc or qps-rtl) to stdout; it is never written to the fork
//
// The table registry (REGISTRY) lists every exported text table and the override map that turns its Godot text into what the
// 2D edition shows (webLine, web, webText). EXCLUDED lists the exports that look like text but are not msgids, with reasons; a
// test fails on any text-like export that is in neither list. Inside registered tables, FRAGMENTS (composite inputs) and UNSHOWN
// (never shown) are skipped, and CONTEXTS gives a homograph its context (tests/next-i18n-reach.test.mjs, -followup.test.mjs).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALES, readCatalog, readManifest, signature, pseudoCatalog } from '../browser-next/i18n.js';

const ROOT = new URL('../', import.meta.url);
const FORK = new URL('browser-next/', ROOT);
export const SOURCE_PATH = new URL('i18n/source.json', ROOT);
export const LOCALES_DIR = new URL('browser-next/locales/', ROOT);
export const MANIFEST_PATH = new URL('index.json', LOCALES_DIR);

// module: the file under browser-next/; tables: its exported text tables; overrides: the exported map whose values replace
// Godot text in 2D (the function that applies it is named in `via`); a grouped map is keyed by Godot file first, like the tables'
// own first level (visits/text.js web(file, literal)), and a table value takes the override of its own file only.
export const REGISTRY = Object.freeze([
  { module: 'characters.js', tables: ['PANEL_TEXT', 'BUTTON_TEXT', 'CAPTION_TEXT', 'ACTION_LABELS', 'HUB_LABELS', 'NEIGHBOR_LINES', 'CELESTE_LINES', 'ROOK_LINES', 'PROJECT_MEMORY', 'SURPRISE_MEMORY', 'LAYOUT_MEMORY', 'COMPOSITION', 'MURAL_REPLY', 'MURAL_SCENE_NAMES', 'NEIGHBOR_BADGES', 'BOEDDEKER_FROM_BEA', 'CHARACTER_PEOPLE', 'CHARACTER_COMPOSE'], overrides: 'CHARACTER_WEB_OVERRIDES', via: 'webLine' },
  { module: 'bubble.js', tables: ['BUBBLE_TEXT'] },
  { module: 'bursts.js', tables: ['BURST_TEXT', 'LAYOUT_BURST', 'BURST_DISPLAY'], overrides: 'BURST_WEB_OVERRIDES', via: 'web (module-private)' },
  { module: 'civic.js', tables: ['CIVIC_FORMATS', 'CIVIC_NOTES', 'CIVIC_TEXT', 'CIVIC_TOPICS'] },
  { module: 'core.js', tables: ['BLOCK_TEXT', 'LITTER', 'LOANS'] },
  { module: 'edition.js', tables: ['EDITION_TEXT'] },
  { module: 'ending/compose.js', tables: ['ENDING_COMPOSE', 'ENDING_DISPLAY', 'ENDING_UI'] },
  { module: 'ending/habitat.js', tables: ['NAMES', 'TITLES'] },
  { module: 'ending/mural.js', tables: ['SCENE_LABELS', 'SCENE_NAMES', 'SIGNATURE_CREDIT'] },
  { module: 'ending/text.js', tables: ['GODOT', 'GODOT_CONSTS', 'FORK_TEXT'], overrides: 'ENDING_WEB_OVERRIDES', via: 'web' },
  { module: 'experiments/neighborhood-voices.js', tables: ['VOICES_TEXT'] },
  { module: 'film.js', tables: ['FILM_FRAMING', 'FILM_PLANS', 'FILM_SHOTS', 'FILM_TEXT'] },
  { module: 'game-text.js', tables: ['GAME_TEXT'] },
  { module: 'gathering.js', tables: ['GATHERING_TEXT'] },
  { module: 'history.js', tables: ['BLACK_HAWK'] },
  { module: 'hosted-text.js', tables: ['HOSTED_GODOT_TEXT', 'HOSTING_FORK_TEXT', 'INVITATION_EXAMPLES', 'INVITATION_TITLES', 'LOAN_COMPLETION_NOTICE', 'LOAN_REPLIES', 'QUIET_TITLES', 'HOSTED_COMPOSE'], overrides: 'HOSTED_WEB_OVERRIDES', via: 'hostedText (module-private)' },
  { module: 'hosting.js', tables: ['HOSTING_TEXT', 'QUIET_CHOICES', 'STORY_CHOICES'] },
  { module: 'keepsake.js', tables: ['KEEPSAKE_TEXT', 'PHOTO_RESPONSES'] },
  { module: 'programme.js', tables: ['PROGRAMME_TEXT', 'SEGMENTS'] },
  { module: 'rewards.js', tables: ['HISTORY_REASONS', 'SOUNDS_TEXT', 'SOUNDS_COMPOSE'] },
  { module: 'rhythm.js', tables: ['RHYTHM_TEXT', 'RHYTHM_COMPOSE'], overrides: 'RHYTHM_WEB_OVERRIDES', via: 'rhythm-ui.js' },
  { module: 'sketch-core.js', tables: ['MUSIC_TEXT', 'MUSIC_COMPOSE'] },
  { module: 'soundtrack.js', tables: ['SOUNDTRACK_TEXT'] },
  { module: 'story.js', tables: ['GATHERING_LAYOUT_TITLES', 'GODOT_TEMPLATES', 'LOAN_TITLES', 'NEIGHBOR_NAMES', 'PROGRAMME_TITLES', 'STORY_CHAPTERS', 'COMPASS_TEXT', 'FORK_TEXT'], overrides: 'WEB_OVERRIDES', via: 'webText' },
  { module: 'visits-kit.js', tables: ['VISITS_FORK_TEXT'] },
  { module: 'visits/before-streets.js', tables: ['FRAME', 'REPLIES', 'SOURCES', 'TEXT', 'VIEWS'] },
  { module: 'visits/compose.js', tables: ['COMPOSE_TEXT', 'MENU_TITLES'] },
  { module: 'visits/dogs.js', tables: ['DESCRIPTIONS', 'LEADS', 'NAMES', 'NOTES', 'TEXT'] },
  { module: 'visits/election.js', tables: ['TEXT'] },
  { module: 'visits/landmarks.js', tables: ['EATERIES', 'EATERY_HOST_LINES', 'EATERY_MENU_ITEMS', 'MUSEUM_DOCENT_LINES', 'TOUR_MUSEUM_TITLES'] },
  { module: 'visits/lantern.js', tables: ['TEXT'] },
  { module: 'visits/meal.js', tables: ['RECIPES', 'SERVING', 'TEXT'] },
  { module: 'visits/picker.js', tables: ['TEXT', 'TITLES'] },
  { module: 'visits/power.js', tables: ['CLUES', 'DIRECTIONS', 'NAMES', 'TEXT', 'VOICES'] },
  { module: 'visits/surprises.js', tables: ['KEEPSAKES', 'SURPRISES'] },
  { module: 'visits/text.js', tables: ['GODOT_TEXT', 'GODOT_CONSTANTS'], overrides: 'WEB_OVERRIDES', grouped: true, via: 'web(file, literal)' },
  { module: 'world.js', tables: ['NEIGHBORS', 'PLACES'] },
]);
// Exports that hold text but are not msgids.
export const EXCLUDED = Object.freeze({
  'characters.js': { CHARACTER_WEB_OVERRIDES: 'override map (its values are extracted through the tables)', NARROW_LABEL_REWRITES: 'English substring rewrites; locales use the catalog narrow section' },
  'bursts.js': { BURST_WEB_OVERRIDES: 'override map', BANNER: 'banner timing and the "* %s" title mark, drawn around the looked-up title' },
  'core.js': { SIGNS: 'the mural signs, drawn as they are (RISE is not translated, D8)' },
  'ending/art.js': { GODOT_ART: 'SVG drawing data' },
  'rewards.js': { CUE_REASONS: "Godot's cue reasons, data the reward chime keys on; the 2D banner shows BURST_TEXT, never a reason" },
  'ending/text.js': { ENDING_WEB_OVERRIDES: 'override map', C: 'alias of GODOT_CONSTS', G: 'alias of GODOT' },
  'history.js': { WEST_INTERSECTIONS: 'street names, not translated (D8)' },
  'hosted-text.js': { HOSTED_WEB_OVERRIDES: 'override map' },
  'rhythm.js': { RHYTHM_WEB_OVERRIDES: 'override map' },
  'story.js': { WEB_OVERRIDES: 'override map' },
  'visits-kit.js': { STYLE: 'CSS' },
  'version.js': { VERSION: 'build version', EDITION: 'edition id' },
  'visits/positions.js': { RAW_EATERY_COUNTERS: 'Godot coordinates of EATERY_COUNTERS', RAW_SURPRISE_SITES: 'Godot coordinates of SURPRISE_SITES', EATERY_COUNTERS: 'map positions and the street each stands on (for the sidewalk fit), never shown; the shown street is visits/landmarks.js EATERIES', SURPRISE_SITES: 'map positions and the street each stands on, never shown; the shown street is visits/surprises.js SURPRISES' },
  'visits/surprises.js': { STORY_BADGES: 'dead export (BROWSER_NEXT.md Known debt)' },
  'visits/text.js': { WEB_OVERRIDES: 'override map', BEFORE: 'part of GODOT_CONSTANTS', DOGS: 'part of GODOT_CONSTANTS', MAIN: 'part of GODOT_CONSTANTS', MEAL: 'part of GODOT_CONSTANTS', MEAL_DATA: 'part of GODOT_CONSTANTS', PICKER: 'part of GODOT_CONSTANTS', POWER: 'part of GODOT_CONSTANTS' },
});
// Displayed fields of data files (2.6): looked up by their English value, which stays in the file.
export const DATA_FIELDS = Object.freeze([
  { file: 'experiments/neighborhood-voices.json', records: data => data?.records ?? [], fields: ['topic', 'summary'] },
  { file: 'data/voting_places.json', records: data => data?.sites ?? [], fields: ['room', 'listed_description'] },
]);
// Object keys whose values are ids, colours or geometry, never text. Not `art`, `kind` or `cue`: Godot keys shown text by them
// (hosted_picture_description.art, OPENINGS.art, the eateries' kind "Corner Bar", the tour's cue "All %d session stops"), and the
// ids under those keys (art, cup, visit) are not human text anyway.
const SKIP_KEYS = new Set(['id', 'ids', 'color', 'colour', 'coat', 'skin', 'hair', 'sprite', 'icon', 'url', 'href', 'src', 'svg', 'path', 'shape', 'slot', 'palette', 'x', 'y', 'key', 'type', 'tint', 'fill', 'stroke']);
// Shown table values that isHumanText rejects (one lowercase word, a measure, a compass letter), each looked up where it is
// shown. A value here is a msgid wherever a registered table holds it; a test fails on an entry the extractor no longer finds.
export const SHORT_TEXT = Object.freeze({
  nearby: 'story.js FORK_TEXT.nearby: the compass phrase when a position is unknown',
  restored: 'visits/power.js TEXT.refresh.restoredWord: the restored-lights word',
  rest: 'rhythm.js RHYTHM_TEXT.rest: a rest step of a Rhythm Circle pattern',
  '40 m': 'visits/power.js TEXT.setup.map1: the case map scale',
});
// Table values that are inputs of a fork composite only (docs/I18N_PLAN.md 2.7): Godot joins them with +, the 2D edition shows the
// whole composite, so the fragment is never looked up on its own and is not a msgid (tests/next-i18n-reach.test.mjs). Keyed by
// the path the extractor prints; the value is excluded wherever its table object is re-exported. The tables keep them: they are
// Godot's text, and the drift tests and the composites' parity tests read them.
export const FRAGMENTS = Object.freeze([
  // ending/compose.js ENDING_COMPOSE (Godot builds these with +; the composites hold the whole sentences)
  'ending.text.GODOT["civic_listening.gd"].follow_invitation.invitation',
  'ending.text.GODOT["civic_listening.gd"].follow_invitation.tail', 'ending.text.GODOT["civic_listening.gd"].refresh.follow',
  'ending.text.GODOT["civic_listening.gd"].refresh.followTail', 'ending.text.GODOT["civic_listening.gd"].request_text.themes',
  'ending.text.GODOT["film_screening.gd"].description.close', 'ending.text.GODOT["film_screening.gd"].description.line',
  'ending.text.GODOT["film_screening.gd"].description.wide', 'ending.text.GODOT["film_screening.gd"].refresh.frame',
  'ending.text.GODOT["film_screening.gd"].refresh.selected', 'ending.text.GODOT["habitat_room.gd"].departure_text.all',
  'ending.text.GODOT["habitat_room.gd"].departure_text.allTail', 'ending.text.GODOT["habitat_room.gd"].departure_text.links',
  'ending.text.GODOT["habitat_room.gd"].departure_text.open', 'ending.text.GODOT["habitat_room.gd"].departure_text.tail',
  'ending.text.GODOT["habitat_room.gd"].departure_text.title', 'ending.text.GODOT["habitat_room.gd"].description.tail',
  'ending.text.GODOT["habitat_room.gd"].refresh.credit', 'ending.text.GODOT["habitat_room.gd"].refresh.detailOf',
  'ending.text.GODOT["habitat_room.gd"].refresh.frame', 'ending.text.GODOT["habitat_room.gd"].refresh.roomModel',
  'ending.text.GODOT["habitat_room.gd"].refresh.selected', 'ending.text.GODOT["habitat_room.gd"].refresh.selectedTail',
  'ending.text.GODOT["helper_bench.gd"].description.line', 'ending.text.GODOT["hosted_afternoon.gd"].detail.pauseResult',
  'ending.text.GODOT["hosted_afternoon.gd"].detail.storiesResult', 'ending.text.GODOT["main.gd"].edit_mural_scene.celeste',
  'ending.text.GODOT["mural_stories.gd"].present.celeste', 'ending.text.GODOT["mural_stories.gd"].present.musicLabel',
  'ending.text.GODOT["mural_stories.gd"].present.off', 'ending.text.GODOT["mural_stories.gd"].present.on',
  'ending.text.GODOT["mural_stories.gd"].present.paletteLabel', 'ending.text.GODOT["mural_stories.gd"].present.street',
  'ending.text.GODOT["mural_stories.gd"].select_scene.brush', 'ending.text.GODOT["mural_stories.gd"].setup.tooltip',
  'ending.text.GODOT["orbital_commons.gd"]._process.reached', 'ending.text.GODOT["orbital_commons.gd"]._process.reachedTail',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.gathered',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.gatheredTail',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.looked',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.never',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.open',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.pause',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.plan',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.shapes',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.tail',
  'ending.text.GODOT["orbital_commons.gd"].acknowledgments.thanh',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.memories', 'ending.text.GODOT["orbital_commons.gd"].finale_text.of3',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.recapArt',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.recapArtMid',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.recapFilm',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.recapSeats',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.recapSeatsMid',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.response', 'ending.text.GODOT["orbital_commons.gd"].finale_text.return0',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.return0Mid',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.return0Tail',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.returnHome',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.returnTail',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.speculative', 'ending.text.GODOT["orbital_commons.gd"].finale_text.tail',
  'ending.text.GODOT["orbital_commons.gd"].finale_text.you', 'ending.text.GODOT["orbital_commons.gd"].invite_thanh.join',
  'ending.text.GODOT["orbital_commons.gd"].invite_thanh.joinTail', 'ending.text.GODOT["orbital_commons.gd"].refresh.copies',
  'ending.text.GODOT["orbital_commons.gd"].refresh.heading', 'ending.text.GODOT["orbital_commons.gd"].refresh.here',
  'ending.text.GODOT["orbital_commons.gd"].refresh.invitation', 'ending.text.GODOT["orbital_commons.gd"].refresh.tail',
  'ending.text.GODOT["orbital_commons.gd"].response.art', 'ending.text.GODOT["orbital_commons.gd"].response.artTail',
  'ending.text.GODOT["orbital_commons.gd"].response.film', 'ending.text.GODOT["orbital_commons.gd"].response.filmTail',
  'ending.text.GODOT["orbital_commons.gd"].response.seats', 'ending.text.GODOT["orbital_commons.gd"].response.seatsMid',
  'ending.text.GODOT["orbital_commons.gd"].response.seatsTail', 'ending.text.GODOT["orbital_commons.gd"].walk_to.here',
  'ending.text.GODOT["orbital_commons.gd"].walk_to.hereTail', 'ending.text.GODOT["orbital_commons.gd"].walk_to.walking',
  'ending.text.GODOT["orbital_commons.gd"].walk_to.walkingTail',
  'ending.text.GODOT["programme_gathering.gd"].back_to_studio.back',
  'ending.text.GODOT["programme_gathering.gd"].back_to_studio.tail',
  'ending.text.GODOT["programme_gathering.gd"].description.order', 'ending.text.GODOT["programme_gathering.gd"].refresh.heading',
  'ending.text.GODOT["programme_gathering.gd"].refresh.invite',
  'ending.text.GODOT["programme_studio.gd"].close_studio.gathering',
  'ending.text.GODOT["programme_studio.gd"].close_studio.gatheringTail',
  'ending.text.GODOT["programme_studio.gd"].description.copiedOrder',
  'ending.text.GODOT["programme_studio.gd"].description.picture',
  'ending.text.GODOT["programme_studio.gd"].description.pictureTail', 'ending.text.GODOT["programme_studio.gd"].refresh.heading',
  // visits/compose.js COMPOSE_TEXT
  'visits.text.GODOT_TEXT["before_streets.gd"].close_opening.closed',
  'visits.text.GODOT_TEXT["before_streets.gd"].refresh.announce', 'visits.text.GODOT_TEXT["dog_story.gd"].choose_lead.chose',
  'visits.text.GODOT_TEXT["dog_story.gd"].choose_lead.choseTail', 'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.already',
  'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.both', 'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.differs',
  'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.differs2', 'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.differs3',
  'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.matched', 'visits.text.GODOT_TEXT["dog_story.gd"].match_dog.next',
  'visits.text.GODOT_TEXT["dog_story.gd"].objective.prefix', 'visits.text.GODOT_TEXT["dog_story.gd"].refresh.compare',
  'visits.text.GODOT_TEXT["dog_story.gd"].refresh.lead', 'visits.text.GODOT_TEXT["dog_story.gd"].refresh.observed',
  'visits.text.GODOT_TEXT["dog_story.gd"].refresh.soundtrack',
  'visits.text.GODOT_TEXT["lantern_procession.gd"].objective.prefix',
  'visits.text.GODOT_TEXT["lantern_procession.gd"].refresh.heading',
  'visits.text.GODOT_TEXT["lantern_procession.gd"].refresh.route',
    'visits.text.GODOT_TEXT["power_story.gd"]._process.soundtrack', 'visits.text.GODOT_TEXT["power_story.gd"].check_path.backOn',
  'visits.text.GODOT_TEXT["power_story.gd"].check_path.portable', 'visits.text.GODOT_TEXT["power_story.gd"].check_path.there',
  'visits.text.GODOT_TEXT["power_story.gd"].close_story.active', 'visits.text.GODOT_TEXT["power_story.gd"].close_story.idle',
  'visits.text.GODOT_TEXT["power_story.gd"].objective.clue', 'visits.text.GODOT_TEXT["power_story.gd"].objective.hint',
  'visits.text.GODOT_TEXT["power_story.gd"].objective.hintEnd', 'visits.text.GODOT_TEXT["power_story.gd"].refresh.inspired',
  'visits.text.GODOT_TEXT["power_story.gd"].refresh.repairSurface',
  'visits.text.GODOT_TEXT["shared_meal.gd"].art_description.prefix',
  'visits.text.GODOT_TEXT["shared_meal.gd"].art_description.template', 'visits.text.GODOT_TEXT["shared_meal.gd"].refresh.follow',
  'visits.text.GODOT_TEXT["shared_meal.gd"].refresh.nextName', 'visits.text.GODOT_TEXT["shared_meal.gd"].refresh.previousName',
  'visits.text.GODOT_TEXT["shared_meal.gd"].refresh.retains', 'visits.text.GODOT_TEXT["story_picker.gd"].open_picker.announce',
  'visits.text.GODOT_TEXT["story_picker.gd"].refresh.completed', 'visits.text.GODOT_TEXT["story_picker.gd"].refresh.entrySuffix',
  'visits.text.GODOT_TEXT["voting_story.gd"].choose.selected', 'visits.text.GODOT_TEXT["voting_story.gd"].objective.observe',
  'visits.text.GODOT_TEXT["voting_story.gd"].objective.prefix', 'visits.text.GODOT_TEXT["voting_story.gd"].place_label.belongs',
  'visits.text.GODOT_TEXT["voting_story.gd"].place_label.fit', 'visits.text.GODOT_TEXT["voting_story.gd"].place_label.nothing',
  'visits.text.GODOT_TEXT["voting_story.gd"].place_label.onPin', 'visits.text.GODOT_TEXT["voting_story.gd"].place_label.placed',
  'visits.text.GODOT_TEXT["voting_story.gd"].place_label.selected', 'visits.text.GODOT_TEXT["voting_story.gd"].record_site.both',
  'visits.text.GODOT_TEXT["voting_story.gd"].record_site.list', 'visits.text.GODOT_TEXT["voting_story.gd"].record_site.recorded',
  'visits.text.GODOT_TEXT["voting_story.gd"].refresh.heading', 'visits.text.GODOT_TEXT["voting_story.gd"].source_text.eas',
  'visits.text.GODOT_TEXT["voting_story.gd"].source_text.head', 'visits.text.GODOT_TEXT["voting_story.gd"].source_text.tail',
  // hosted-text.js HOSTED_COMPOSE: invitation and quiet are explanation.open + title + close; the summaries host_complete_current's
  'hosted-text.HOSTED_GODOT_TEXT["bea_invitation.gd"].explanation.open', 'hosted-text.HOSTED_GODOT_TEXT["bea_invitation.gd"].explanation.close',
  'hosted-text.HOSTED_GODOT_TEXT["quiet_seats.gd"].explanation.open', 'hosted-text.HOSTED_GODOT_TEXT["quiet_seats.gd"].explanation.close',
  'hosted-text.HOSTED_GODOT_TEXT["main.gd"].host_complete_current.summary', 'hosted-text.HOSTED_GODOT_TEXT["main.gd"].host_complete_current.next',
  'hosted-text.HOSTED_GODOT_TEXT["main.gd"].host_complete_current.last',
  // rhythm.js RHYTHM_COMPOSE: the heading with its mode, the pad names and toggles with hit or rest, the two On/Off labels
  'rhythm.RHYTHM_TEXT.heading', 'rhythm.RHYTHM_TEXT.headingMode', 'rhythm.RHYTHM_TEXT.practice', 'rhythm.RHYTHM_TEXT.hosting',
  'rhythm.RHYTHM_TEXT.padName', 'rhythm.RHYTHM_TEXT.toggled', 'rhythm.RHYTHM_TEXT.music', 'rhythm.RHYTHM_TEXT.musicLabel', 'rhythm.RHYTHM_TEXT.stepCues',
  'rhythm.RHYTHM_TEXT.on', 'rhythm.RHYTHM_TEXT.off',
  // sketch-core.js MUSIC_COMPOSE, rewards.js SOUNDS_COMPOSE, characters.js CHARACTER_COMPOSE (Return %s, Returned %s)
  'sketch-core.MUSIC_TEXT.playing', 'sketch-core.MUSIC_TEXT.sketchTag', 'sketch-core.MUSIC_TEXT.localTag', 'rewards.SOUNDS_TEXT.announce',
  'characters.ACTION_LABELS.return', 'characters.ACTION_LABELS.returned',
  // story.js COMPASS_TEXT: compass_phrase's templates with each direction written in (here stays its own msgid)
  'story.GODOT_TEMPLATES.compass_phrase.metres', 'story.GODOT_TEMPLATES.compass_phrase.block', 'story.GODOT_TEMPLATES.compass_phrase.blocks',
]);
// Table values the 2D edition never shows, with the reason; not msgids either.
export const UNSHOWN = Object.freeze({
  'bubble.BUBBLE_TEXT.activity': "announce_speech_location's activity panel: the 2D bubble only ever names the conversation panel",
  'bubble.BUBBLE_TEXT.info': "announce_speech_location's Info: the 2D bubble only ever names the conversation panel",
  'rhythm.RHYTHM_TEXT.viewCircle': "Godot's View Circle button, which the 2D Rhythm Circle has no counterpart for",
  'hosted-text.HOSTED_GODOT_TEXT["bea_invitation.gd"].update_choices.selected': "Godot's ' , selected' choice suffix; the 2D choices mark the selection with aria-pressed",
  'hosted-text.HOSTED_GODOT_TEXT["quiet_seats.gd"].update_ui.selected': "Godot's ' , selected' choice suffix; the 2D choices mark the selection with aria-pressed",
  'core.BLOCK_TEXT.ready': "blockMissing's English-only answer when nothing is missing; the finale shows its notice only when something is",
  'visits.text.GODOT_TEXT["voting_story.gd"].valid_source.address0': "valid_source's expected address, compared with the place file, never shown",
  'visits.text.GODOT_TEXT["voting_story.gd"].valid_source.address1': "valid_source's expected address, compared with the place file, never shown",
  // Godot's _ready labels that refresh() replaces before anything is shown; the 2D views draw refresh()'s.
  'visits.text.GODOT_TEXT["lantern_procession.gd"].setup.walk': 'replaced by refresh() before it shows',
  'visits.text.GODOT_TEXT["lantern_procession.gd"].setup.gather': 'replaced by refresh() before it shows',
  'visits.text.GODOT_TEXT["voting_story.gd"].setup.walk': 'replaced by refresh() before it shows',
  'visits.text.GODOT_TEXT["before_streets.gd"].setup.return': 'replaced by refresh() before it shows',
  'visits.text.GODOT_TEXT["power_story.gd"].setup.relay': 'replaced by refresh() (its tab label) before it shows',
  'ending.text.GODOT["orbital_commons.gd"].setup.walk': 'replaced by refresh() before it shows',
  'ending.text.GODOT["orbital_commons.gd"].setup.heading': 'replaced by refresh() before it shows',
  'ending.text.GODOT["habitat_room.gd"].setup.credit': 'replaced by refresh() before it shows',
});
// Msgids that need a context (plan 2.2): the same English with another meaning elsewhere, or a status word that agrees with its
// noun. The context is the path, and the call site passes it to L(); a test checks each one is passed.
export const CONTEXTS = Object.freeze([
  'rhythm.RHYTHM_TEXT.complete', // the Rhythm Circle's Complete button; "Complete" is also the gathering's status
  'visits.dogs.LEADS[2]', // a place in the dog story; "Gathering" is also the orbital commons' tab
  'story.GODOT_TEMPLATES.show_story_card.resume', // the chapter card's Continue; "Continue" is also the story picker's status
  'ending.text.GODOT["programme_gathering.gd"].setup.previous', // Previous turn; "Previous" is also the orbital commons' panel
  'characters.PANEL_TEXT.scReady', 'characters.PANEL_TEXT.scPending', // Rook's soundcheck status (agrees with the soundcheck)
  'characters.PANEL_TEXT.playing', 'characters.PANEL_TEXT.paused', // Rook's music status (agrees with the music)
]);
const PLACEHOLDERS = /%%|%(?:\d+\$)?(?:s|d|f|\.\d+f)|\{[A-Za-z_]\w*\}/g;

// A string that a player reads: letters in words, not an id, a path, a colour, CSS, a selector or markup-only.
export function isHumanText(value) {
  const s = String(value).trim();
  // A letterless template ("%s: %s", "%s: \"%s\" · %s%s", "%d/3", "%s %s"): its separators, quote marks and order are a
  // translator's to change. A lone placeholder ("%s") is not: it has nothing to translate.
  const bare = s.replace(PLACEHOLDERS, '');
  if (bare !== s && !/[A-Za-z]/.test(bare) && (/\S/.test(bare) || s.match(PLACEHOLDERS).length >= 2)) return true;
  if (!s || !/[A-Za-z]/.test(s)) return false;
  if (/^(https?:|mailto:|\.\.?\/|data:|blob:)/i.test(s)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(s) || /^(rgba?|hsla?)\(/i.test(s)) return false;
  if (/^<[^>]+>/.test(s) && !/>[^<]*[A-Za-z]{2,}[^<]*</.test(s)) return false;
  if (/^[a-z][\w$.:\-/]*$/.test(s)) return false; // ids, events, kebab and snake case
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(s) || /^[A-Z][a-z]+([A-Z][a-z0-9]*){2,}$/.test(s)) return false; // camelCase, PascalCase ids
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(s) || /^[0-9a-f]{6,8}$/i.test(s)) return false; // snake ids, bare hex colours
  if (/^[A-Z][A-Z0-9_]+$/.test(s) && s.includes('_')) return false;
  if (/^\w+\.(js|mjs|json|svg|css|html|gd|png|wav|ogg|mp3)$/i.test(s)) return false;
  if ((s.match(/[a-z-]+\s*:\s*[^;{}]+;/g) ?? []).length >= 2) return false; // CSS declarations
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(s) && /\d/.test(s)) return false; // SVG path data
  return /[A-Za-z]{2,}/.test(s);
}
const SENSITIVE = Object.freeze({
  civic: /\b(vot(e|es|ed|ing|er|ers)|ballot|poll(s|ing)?|election|precinct|registrar|candidate|civic|tenant circle|listening hour|city hall|supervisor|mayor)\b/i,
  housing: /\b(housing|tenants?|rent|evict\w*|landlord|homeless\w*|shelter|SRO|affordable|low incomes?)\b/i,
  power: /\b(outage|blackout|power (story|cut|is out|went out)|lights? (out|went)|battery|relay|generator|PG&E|grid|substation)\b/i,
  pets: /\b(dogs?|lost|missing|owner|leash|sighting|reunite\w*)\b/i,
  emergency: /\b(emergenc\w*|911|safety|police|harass\w*|fire|injur\w*|medical|danger\w*|hazard)\b/i,
  identity: /\b(transgender|trans\b|drag|uprising|Compton|queer|LGBT\w*|GLBT|homeland|Ramaytush|Yelamu|Ohlone|Indigenous|plaque)\b/i,
  save: /\b(saved?|save file|storage|progress|start over|restart|unsaved|recover\w*)\b/i,
  keys: /\b(press|key|keys|Esc|Enter|WASD|arrow|Shift\+|F5)\b/,
});
const ENVELOPE = /^([^\n:"]{1,40}): "([\s\S]*)"$/;
// The names drawn as canvas chips over the map (world.js objectLabel and the hover chip): the neighbors, the places and Black Hawk.
const CHIP = /^(?:(?:world\.(?:NEIGHBORS|PLACES)|characters\.CHARACTER_PEOPLE)\[\d+\]\.name|history\.BLACK_HAWK\.name)$/;
export function lengthClass(msgid, paths) {
  if (paths.some(p => /BUTTON|ACTION_LABELS|button/i.test(p))) return 'button';
  if (paths.some(p => CHIP.test(p))) return 'chip';
  const words = msgid.split(/\s+/).filter(Boolean).length, sentences = (msgid.match(/[.!?…](\s|$)/g) ?? []).length;
  if (words <= 4 && sentences === 0) return 'label';
  if (sentences <= 1 && msgid.length <= 160) return 'sentence';
  return 'paragraph';
}

// A msgid: human text, or a short shown value listed in SHORT_TEXT.
export const isMsgid = value => isHumanText(value) || Object.hasOwn(SHORT_TEXT, String(value));
// Walk a table, calling visit(text, path, own) for every string leaf; the caller checks the text after its override map `own`.
// An object that belongs to a file of a grouped override map (owners) takes that file's map, wherever a module re-exports it.
// marks: a table object's string leaves that FRAGMENTS or UNSHOWN skip ({ skip }) or that CONTEXTS key ({ ctx }), by object and key.
function walk(value, path, visit, own = null, owners = new WeakMap(), seen = new Set(), marks = new WeakMap(), mark = null) {
  if (typeof value === 'string') { if (!mark?.skip) visit(value, path, own, mark?.ctx ?? null); return; }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (owners.has(value)) own = owners.get(value);
  const marked = key => marks.get(value)?.get(String(key)) ?? null;
  if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${path}[${i}]`, visit, own, owners, seen, marks, marked(i)));
  else for (const [key, item] of Object.entries(value)) { if (SKIP_KEYS.has(key) && typeof item === 'string') continue; walk(item, /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`, visit, own, owners, seen, marks, marked(key)); }
}
// A printed table path (characters.PANEL_TEXT.scReady, visits.dogs.LEADS[2], ending.text.GODOT["main.gd"].x) as the object that
// holds its string and the key, or null.
export async function resolvePath(printed, load) {
  for (const { module, tables } of REGISTRY) {
    const base = module.replace(/\.js$/, '').replace(/\//g, '.');
    for (const table of tables) {
      const head = `${base}.${table}`;
      if (!printed.startsWith(head) || !/^[.[]/.test(printed.slice(head.length))) continue;
      const keys = [...printed.slice(head.length).matchAll(/\.([A-Za-z_$][\w$]*)|\[(\d+)\]|\[("(?:[^"\\]|\\.)*")\]/g)].map(m => m[1] ?? m[2] ?? JSON.parse(m[3]));
      let parent = (await load(module))[table];
      for (const key of keys.slice(0, -1)) parent = parent?.[key];
      const key = String(keys.at(-1));
      if (parent && typeof parent === 'object' && typeof parent[key] === 'string') return { parent, key };
    }
  }
  return null;
}
// Every object under each file of a grouped table, mapped to that file's override map: visits/power.js TEXT is visits/text.js
// GODOT_TEXT['power_story.gd'], so it shows web('power_story.gd', …) too.
function ownersOf(table, map, owners) {
  for (const [file, part] of Object.entries(table)) {
    const own = Object.hasOwn(map, file) ? map[file] : null;
    const mark = v => { if (v && typeof v === 'object' && !owners.has(v)) { owners.set(v, own); Object.values(v).forEach(mark); } };
    mark(part);
  }
}
// t('…') and L('…', 'ctx') literal calls in modules that import them from i18n.js; [data-i18n] nodes in index.html.
const LITERAL = /(?<![\w$.])([tL])\(\s*'((?:[^'\\\n]|\\.)*)'\s*(?:,\s*'((?:[^'\\\n]|\\.)*)')?\s*\)/g;
const unquote = body => JSON.parse(`"${body.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`);
function forkFiles() {
  return readdirSync(FORK, { recursive: true }).map(name => String(name).split('\\').join('/')).filter(name => name.endsWith('.js') && !name.startsWith('data/')).sort();
}
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' };
const decodeEntities = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m);

// The table strings FRAGMENTS and UNSHOWN keep out of the source (for tests that walk a whole table).
export async function excludedTexts() {
  const load = module => import(pathToFileURL(fileURLToPath(new URL(module, FORK))).href), out = new Set();
  for (const printed of [...FRAGMENTS, ...Object.keys(UNSHOWN)]) { const at = await resolvePath(printed, load); if (at) out.add(at.parent[at.key]); }
  return out;
}
export const linesText = text => String(text).replace(/\s+/g, ' ').trim();

export async function extract() {
  const entries = new Map();
  const add = (msgid, ctx, where) => {
    const key = ctx ? `${ctx}\u0004${msgid}` : msgid;
    if (!entries.has(key)) entries.set(key, { msgid, ctx: ctx ?? null, paths: new Set() });
    entries.get(key).paths.add(where);
  };
  const load = module => import(pathToFileURL(fileURLToPath(new URL(module, FORK))).href), owners = new WeakMap();
  for (const { module, tables, overrides, grouped } of REGISTRY) {
    if (!grouped) continue;
    const m = await load(module);
    for (const table of tables) ownersOf(m[table], m[overrides], owners);
  }
  const marks = new WeakMap(), markAt = async (printed, mark) => {
    const at = await resolvePath(printed, load); if (!at) throw Error(`no table string at ${printed}`);
    if (!marks.has(at.parent)) marks.set(at.parent, new Map());
    marks.get(at.parent).set(at.key, mark);
  };
  for (const printed of [...FRAGMENTS, ...Object.keys(UNSHOWN)]) await markAt(printed, { skip: true });
  for (const printed of CONTEXTS) await markAt(printed, { ctx: printed });
  const visit = (text, path, own, ctx) => { const value = own && Object.hasOwn(own, text) ? own[text] : text; if (isMsgid(value)) add(value, ctx, path); };
  for (const { module, tables, overrides, grouped } of REGISTRY) {
    const m = await load(module);
    const map = overrides ? m[overrides] : null;
    if (overrides && (!map || typeof map !== 'object')) throw Error(`${module}: no override map ${overrides}`);
    const base = module.replace(/\.js$/, '').replace(/\//g, '.');
    for (const table of tables) {
      if (!(table in m)) throw Error(`${module}: no export ${table}`);
      walk(m[table], `${base}.${table}`, visit, grouped ? null : map, owners, new Set(), marks);
    }
  }
  for (const { file, records, fields } of DATA_FIELDS) {
    const data = JSON.parse(readFileSync(new URL(file, FORK), 'utf8'));
    records(data).forEach((record, i) => { for (const field of fields) if (typeof record?.[field] === 'string' && isHumanText(record[field])) add(record[field], null, `${file}.records[${i}].${field}`); });
  }
  for (const file of forkFiles()) {
    const text = readFileSync(new URL(file, FORK), 'utf8');
    if (!/from '(\.\.?\/)+i18n\.js'/.test(text) || file === 'i18n.js') continue;
    const imported = /import\s*\{([^}]*)\}\s*from\s*'(?:\.\.?\/)+i18n\.js'/.exec(text)?.[1] ?? '';
    const names = new Set(imported.split(',').map(part => part.trim().split(/\s+as\s+/).pop()));
    for (const m of text.matchAll(LITERAL)) if (names.has(m[1])) add(unquote(m[2]), m[3] ? unquote(m[3]) : null, `${file}:${text.slice(0, m.index).split('\n').length}`);
  }
  const html = readFileSync(new URL('index.html', FORK), 'utf8');
  for (const m of html.matchAll(/<(\w+)\b[^>]*\sdata-i18n(?=[\s>=])[^>]*>([^<]*)<\/\1>/g)) add(decodeEntities(m[2]), null, `index.html:${html.slice(0, m.index).split('\n').length}`);
  // [data-i18n-lines]: a heading whose English breaks with <br>; its msgid is the text with the tags out and spaces collapsed.
  for (const m of html.matchAll(/<(\w+)\b[^>]*\sdata-i18n-lines(?=[\s>])[^>]*>([\s\S]*?)<\/\1>/g)) add(linesText(decodeEntities(m[2].replace(/<[^>]*>/g, ''))), null, `index.html:${html.slice(0, m.index).split('\n').length}`);
  const out = [...entries.values()].map(({ msgid, ctx, paths }) => {
    const sig = signature(msgid), list = [...paths].sort(), speaker = /%|{/.test(ENVELOPE.exec(msgid)?.[1] ?? '%') ? null : ENVELOPE.exec(msgid)[1];
    const entry = { msgid };
    if (ctx) entry.ctx = ctx;
    entry.paths = list;
    entry.placeholders = sig.specs.map(s => `%${s.kind}`).join(' ') + (sig.named.length ? `${sig.specs.length ? ' ' : ''}${sig.named.map(n => `{${n}}`).join(' ')}` : '');
    entry.length = lengthClass(msgid, list);
    if (speaker) entry.speaker = speaker;
    if (/\b(you|your|yours|yourself)\b/i.test(msgid)) entry.addressee = 'player';
    const tags = Object.entries(SENSITIVE).filter(([, re]) => re.test(msgid)).map(([tag]) => tag);
    if (tags.length) entry.tags = tags;
    return entry;
  });
  out.sort((a, b) => a.msgid < b.msgid ? -1 : a.msgid > b.msgid ? 1 : (a.ctx ?? '') < (b.ctx ?? '') ? -1 : (a.ctx ?? '') > (b.ctx ?? '') ? 1 : 0);
  return { format: 1, generatedBy: 'node scripts/i18n.mjs extract', count: out.length, entries: out };
}
export const stableJSON = value => `${JSON.stringify(value, null, 2)}\n`;
export const sourceIndex = source => new Set(source.entries.map(e => e.ctx ? `${e.ctx}\u0004${e.msgid}` : e.msgid));
export const readSource = () => JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const catalogCodes = () => existsSync(LOCALES_DIR) ? readdirSync(LOCALES_DIR).filter(name => name.endsWith('.json') && name !== 'index.json').map(name => name.slice(0, -5)).sort() : [];

// The manifest from the catalogs on disk. A locale's status comes from i18n/review/<code>.json ("draft" without one); coverage
// is the share of source msgids its catalog translates.
export function buildManifest(source = readSource()) {
  const total = source.entries.length || 1, locales = [];
  for (const code of catalogCodes()) {
    if (!Object.hasOwn(LOCALES, code) || code === 'en') throw Error(`locales/${code}.json is not a known locale`);
    const bytes = readFileSync(new URL(`${code}.json`, LOCALES_DIR)), review = new URL(`i18n/review/${code}.json`, ROOT);
    const data = JSON.parse(bytes.toString('utf8')), status = existsSync(review) ? JSON.parse(readFileSync(review, 'utf8')).status ?? 'draft' : 'draft';
    const own = (e) => e.ctx ? Object.hasOwn(data.context?.[e.ctx] ?? {}, e.msgid) : Object.hasOwn(data.messages ?? {}, e.msgid);
    const translated = source.entries.filter(own).length;
    locales.push({ code, endonym: LOCALES[code].endonym, dir: LOCALES[code].dir, status, coverage: Math.round((translated / total) * 10000) / 10000, sha256: sha(bytes) });
  }
  return { format: 1, locales };
}
// Every catalog on disk (or one) against the source index and the manifest. Returns a list of problems.
export function checkLocales(codes = catalogCodes(), source = readSource()) {
  const problems = [], index = sourceIndex(source);
  const manifest = existsSync(MANIFEST_PATH) ? readManifest(readFileSync(MANIFEST_PATH, 'utf8')) : null;
  if (!manifest) problems.push('browser-next/locales/index.json is missing or invalid');
  for (const code of codes) {
    const text = readFileSync(new URL(`${code}.json`, LOCALES_DIR), 'utf8'), read = readCatalog(text, code, index);
    if (!read.catalog) { problems.push(`${code}: rejected (${read.error})`); continue; }
    for (const r of read.rejected) problems.push(`${code}: ${r.section} ${JSON.stringify(r.key)}: ${r.reason}`);
    const entry = manifest?.locales.find(e => e.code === code);
    if (!entry) problems.push(`${code}: not in the manifest`);
    else if (entry.sha256 !== sha(readFileSync(new URL(`${code}.json`, LOCALES_DIR)))) problems.push(`${code}: manifest hash is stale (run manifest)`);
    if (entry?.status === 'shipped') {
      const missing = source.entries.filter(e => (e.ctx ? read.catalog.context(e.ctx, e.msgid) : read.catalog.message(e.msgid)) === undefined).length;
      if (missing) problems.push(`${code}: shipped but ${missing} msgids are untranslated`);
    }
  }
  for (const entry of manifest?.locales ?? []) if (!codes.includes(entry.code) && !catalogCodes().includes(entry.code)) problems.push(`manifest lists ${entry.code}, which has no catalog`);
  return problems;
}

async function main([command, arg]) {
  if (command === 'extract') {
    const source = await extract();
    mkdirSync(new URL('i18n/', ROOT), { recursive: true });
    writeFileSync(SOURCE_PATH, stableJSON(source));
    console.log(`i18n/source.json: ${source.count} msgids`);
  } else if (command === 'check') {
    const problems = checkLocales(arg ? [arg] : catalogCodes());
    for (const p of problems) console.error(p);
    console.log(problems.length ? `${problems.length} problem(s)` : `ok: ${(arg ? [arg] : catalogCodes()).length} locale(s)`);
    process.exitCode = problems.length ? 1 : 0;
  } else if (command === 'init') {
    if (!arg || !Object.hasOwn(LOCALES, arg) || arg === 'en') throw Error(`init needs a known locale: ${Object.keys(LOCALES).filter(c => c !== 'en').join(', ')}`);
    const catalog = new URL(`${arg}.json`, LOCALES_DIR), review = new URL(`i18n/review/${arg}.json`, ROOT);
    if (existsSync(catalog) || existsSync(review)) throw Error(`${arg} already exists`);
    const source = readSource(), batches = {};
    for (const e of source.entries) { const batch = e.paths[0].split(/[.[:]/)[0]; (batches[batch] ??= { status: 'todo', reviewers: [], msgids: 0 }).msgids++; }
    mkdirSync(LOCALES_DIR, { recursive: true }); mkdirSync(new URL('i18n/review/', ROOT), { recursive: true });
    writeFileSync(catalog, stableJSON({ format: 1, locale: arg, messages: {} }));
    writeFileSync(review, stableJSON({ locale: arg, status: 'draft', batches }));
    console.log(`wrote browser-next/locales/${arg}.json and i18n/review/${arg}.json; run manifest next`);
  } else if (command === 'manifest') {
    mkdirSync(LOCALES_DIR, { recursive: true });
    const manifest = buildManifest();
    writeFileSync(MANIFEST_PATH, stableJSON(manifest));
    console.log(`browser-next/locales/index.json: ${manifest.locales.length} locale(s)`);
  } else if (command === 'pseudo') {
    const code = arg ?? 'qps-ploc';
    if (!['qps-ploc', 'qps-rtl'].includes(code)) throw Error('pseudo takes qps-ploc or qps-rtl');
    process.stdout.write(`${pseudoCatalog(readSource().entries, code)}\n`);
  } else {
    console.error('usage: node scripts/i18n.mjs extract | check [code] | init <code> | manifest | pseudo [qps-ploc|qps-rtl]');
    process.exitCode = 2;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main(process.argv.slice(2));
