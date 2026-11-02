// Whole-sentence composites of the side stories (docs/I18N_PLAN.md 2.7), pure: Godot builds these sentences from fragments with
// `+`, so a translator could not reorder them. Each composite here is ONE template with {name} placeholders, built at import from
// Godot's own fragments in visits/text.js (which stays untouched and drift-tested), so its English is always Godot's: filled in
// English it is byte for byte the legacy concatenation (tests/next-i18n-visits.test.mjs proves it for every template over an input
// matrix). The template is the catalog key; a locale's translation of it is substituted whole, or the whole English falls back.
//
// The structural joiners ('{heading}. {text}', '{label}: {description}', '{left} | {right}') are small catalog entries too, so a
// translator can adjust their punctuation. MENU_TITLES is the id-to-display table of the eatery burst, whose English is
// gdCapitalize(item) as before: a locale translates the title and never title-cases.
//
// The UI files of the side stories may import only ./visits-kit.js and ./visits/ modules (tests/next-visits-ui.test.mjs), so this
// module also passes the i18n lookups through.
import { GODOT_TEXT, POWER, MAIN } from './text.js';
import { gdCapitalize } from './format.js';
import { L, format, FLAVORS, fillNamed, narrow, list } from '../i18n.js';

export { L, t, narrow, list, locale } from '../i18n.js';

const DOG = GODOT_TEXT['dog_story.gd'], LANTERN = GODOT_TEXT['lantern_procession.gd'], POWERT = GODOT_TEXT['power_story.gd'];
const VOTE = GODOT_TEXT['voting_story.gd'], MEAL = GODOT_TEXT['shared_meal.gd'], BEFORE = GODOT_TEXT['before_streets.gd'];
const PICK = GODOT_TEXT['story_picker.gd'], HUB = GODOT_TEXT['main.gd'].apply_hub_guidance;
// Godot's own "%d" and "%s" of one fragment as named placeholders, in order.
const named = (template, ...names) => { let i = 0; return template.replace(/%[ds]/g, () => `{${names[i++]}}`); };

export const COMPOSE_TEXT = {
  joiners: {
    sentence: '{heading}. {text}',
    labelDescription: '{label}: {description}',
    pipe: '{left} | {right}',
  },
  dogs: {
    chose: DOG.choose_lead.chose + '{lead}' + DOG.choose_lead.choseTail,
    differs: DOG.match_dog.differs + '{observed}' + DOG.match_dog.differs2 + '{name}' + DOG.match_dog.differs3,
    already: '{name}' + DOG.match_dog.already,
    matchedBoth: '{name}' + DOG.match_dog.matched + DOG.match_dog.both,
    matchedNext: '{name}' + DOG.match_dog.matched + DOG.match_dog.next,
    profile: '{note}\n{name}: {description}.',
    lead: DOG.refresh.lead + '{lead}.',
    observed: DOG.refresh.observed + '{description}' + DOG.refresh.compare,
    music: '{label}' + DOG.refresh.soundtrack,
    objective: DOG.objective.prefix + '{status}',
  },
  lantern: {
    heading: LANTERN.refresh.heading + '{status}',
    route: LANTERN.refresh.route + '{costume} / {lantern}.',
    objective: LANTERN.objective.prefix + '{status}',
  },
  power: {
    closeActive: POWERT.close_story.back + POWERT.close_story.active,
    closeIdle: POWERT.close_story.back + POWERT.close_story.idle,
    there: '{voice}' + POWERT.check_path.there + '{name}' + POWERT.check_path.backOn,
    portable: '{voice}' + POWERT.check_path.portable,
    hintEnd: POWERT.objective.hint + POWERT.objective.hintEnd,
    hintClue: POWERT.objective.hint + '{voice}' + POWERT.objective.clue + '{phase}.',
    inspired: POWERT.refresh.inspired + '{phase}.',
    // Godot's refresh replaces "repair surface" with "battery view" in the whole Larkin reader; only this line holds it, so the
    // replaced line is its own sentence and no translation is searched.
    walkFirstBattery: POWERT.refresh.walkFirst.replaceAll(POWERT.refresh.repairSurface, POWERT.refresh.batteryView),
    music: '{label}' + POWERT._process.soundtrack,
  },
  election: {
    selected: VOTE.choose.selected + '{address}.',
    recorded: VOTE.record_site.recorded + '{description}, {address}' + VOTE.record_site.list,
    recordedBoth: VOTE.record_site.recorded + '{description}, {address}' + VOTE.record_site.list + VOTE.record_site.both,
    belongs: VOTE.place_label.belongs + '{address}' + VOTE.place_label.selected + '{selected}' + VOTE.place_label.nothing,
    placed: VOTE.place_label.placed + '{address}' + VOTE.place_label.onPin,
    placedFit: VOTE.place_label.placed + '{address}' + VOTE.place_label.onPin + VOTE.place_label.fit,
    source: VOTE.source_text.head + '{name} - {address} - {room}' + VOTE.source_text.eas + '{eas}' + VOTE.source_text.tail,
    heading: VOTE.refresh.heading + '{status}',
    objective: VOTE.objective.prefix + '{status}',
    observe: VOTE.objective.observe + '{address}',
  },
  meal: {
    tradition: '{tradition}. {ingredients}',
    said: '{cook}: "{message}"',
    follow: MEAL.refresh.follow + '{cook}' + MEAL.refresh.retains,
    previousName: MEAL.refresh.previousName + '{cook}',
    nextName: MEAL.refresh.nextName + '{cook}',
    artDescription: MEAL.art_description.prefix + '{shape}' + named(MEAL.art_description.template, 'stage', 'serving'),
  },
  before: {
    close: '{frame}' + BEFORE.close_opening.closed,
    announce: BEFORE.refresh.announce + '{text}',
  },
  picker: {
    announce: PICK.open_picker.announce + '{text}',
    entry: '{status}: {title}',
    entryName: '{label}' + PICK.refresh.entrySuffix,
    completed: PICK.refresh.completed + '{stories}.',
  },
  ui: {
    mealHint: '{hint}' + HUB.joiner + '{meal}',
  },
};

// A composite filled with its values. English: fillNamed, which is the concatenation; a locale: the translated template.
const COMPOSITE = { ...FLAVORS.named, legacy: (template, args) => fillNamed(template, args[0]) };
export const compose = (template, values) => format(template, [values], COMPOSITE);

// The eatery burst's "Order Up: %s" title (Godot capitalize()), as a table keyed by the menu item.
const ITEMS = [...new Set([...Object.values(MAIN.EATERY_MENU_ITEMS).flat(), GODOT_TEXT['main.gd'].eatery_counter_interact.special])];
export const MENU_TITLES = Object.freeze(Object.fromEntries(ITEMS.map(item => [item, gdCapitalize(item)])));
export const menuTitle = item => L(Object.hasOwn(MENU_TITLES, item) ? MENU_TITLES[item] : gdCapitalize(item));

// The Larkin case map's compass letter (power_story.gd map2, Godot's "N"), looked up when the map is drawn: it is the catalog's
// narrow entry of Godot's "North" (power_story.gd DIRECTIONS[0]), so Vietnamese can show B (Bắc) where N would read as Nam. A
// one-letter msgid is no text the extractor keeps, and "North" is already one. English, and a locale without the entry, keep "N".
export const compassNorth = short => narrow(POWER.DIRECTIONS[0]) ?? short;

// The memory line's own quotes, stripped as Godot strips “ and ”: by punctuation class, so a locale's « » or “ ” go too.
export const unquote = line => String(line).replace(/^\p{Pi}/u, '').replace(/\p{Pf}$/u, '');
// Godot's ", " list (the picker's completed stories) in English; a locale's conjunction list.
export const commaList = items => list(items, values => values.join(', '));
