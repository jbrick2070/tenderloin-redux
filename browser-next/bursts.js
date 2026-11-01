// Godot's reward banner, the feel-good burst's on-screen half (godot/main.gd trigger_progress_cue's burst arms,
// trigger_feel_good_burst, update_celebration_burst, layout_reward_banner and build_reward_banner). The 3D half (the gems, the
// ring and the floating label at the burst's world position) is not ported. Pure: no DOM, timers or storage. game.js draws the
// banner, measures it and steps it on its frame clock; tests/next-bursts.test.mjs parses main.gd at test time, so a changed
// title, detail format, accent, timing or rule fails there.
//
// One banner at a time, as Godot has one: a new burst replaces it, unless keep_finale holds (a "10/10" finale with more than
// 1 s left, or a milestone banner waiting unseen, is not replaced by a lesser burst). It reads "* title" and the detail for
// 3.2 s and fades over its last 0.45 s (no fade under reduced motion). The time counts only while it is shown: a focused
// activity (in 2D any open dialog) or no room around the player holds it, with its full reading time. The overview ends it.
import { gdf, gdCapitalize } from './visits/format.js';
import { sparkCount, activeStemSummary, CHARACTER_PEOPLE } from './characters.js';
import { NEIGHBOR_IDS, NEIGHBOR_NAMES, MURAL_MOTIFS, GATHERING_LAYOUT_TITLES, LOAN_TITLES, segmentTitle } from './story.js';
import { FILM_SHOTS } from './film.js';
import { format, L, isEnglish, FLAVORS } from './i18n.js';

// trigger_feel_good_burst, update_celebration_burst and layout_reward_banner numbers. coatLift: the neighbor_visit accent.
export const BANNER = { seconds: 3.2, fade: 0.45, finale: 4.5, keepFinale: 1.0, finalePrefix: '10/10', titleFormat: '* %s', borderLift: 0.15, coatLift: 0.28, width: { max: 460, min: 180, inset: 16 }, top: 4 };
// build_reward_banner: Color(0.08, 0.14, 0.18, 0.94) as #rrggbbaa, and the label colors and sizes. style.css draws these.
export const BANNER_STYLE = { background: '#14242ef0', border: '#f8cc58', borderWidth: 2, radius: 8, padX: 12, padY: 5, gap: 1, title: { size: 15, color: '#ffe48f' }, body: { size: 13, color: '#9ef5e5', lines: 2 } };
// trigger_feel_good_burst's default accent, and trigger_progress_cue's.
export const DEFAULT_ACCENT = 'f8cc58';
export const CUE_ACCENT = 'ffd45e';
// trigger_progress_cue's burst arms, in Godot's order: the title and detail templates and the accent (null: the neighbor's coat,
// lifted by BANNER.coatLift, which cueBurst returns as lift). programme_published picks its future text while a gathering is running (hosting_order not empty).
export const BURST_TEXT = {
  neighbor_visit: { title: 'New Neighbor Connected — %s', detail: 'Neighbors Met: %d/%d · Groove: %s', accent: null },
  celeste_talk: { title: 'Artist Spark — Connected with Celeste', detail: 'Sidewalk easel unlocked (%d/%d neighbors met)', accent: 'ffb84d' },
  mural_motif: { title: 'Mural Spark — Painted %s Motif', detail: 'Easel progress: %d/3 motifs · Groove: %s', accent: 'ff9e5e' },
  mural_complete: { title: 'Mural Complete — All 3 Motifs Shining!', detail: 'Harmonic pad stem unlocked · Groove: %s', accent: 'ffd45e' },
  rook_soundcheck: { title: 'Soundcheck Locked In — Sidewalk Lead Stem Live!', detail: 'Rook dialed in the corner speaker · %s', accent: '6ec6ff' },
  block_opened: { title: 'Turk Street Block Gathering Open!', detail: 'String lights, music, and neighbors fill the sidewalk', accent: 'ffe066' },
  keepsake_photo: { title: 'Keepsake Moment — Group Photo Captured!', detail: 'Press Shift+Y anytime to export your block keepsake SVG', accent: 'ff8ad8' },
  loan_returned: { title: 'Neighbor Care — Returned %s', detail: 'Borrowed gear returned (%d/3)', accent: '9ef5e5' },
  programme_published: { title: 'Evening Programme Published!', detail: 'All 4 block gathering segments scheduled on the board', futureTitle: 'Future Programme Posted', futureDetail: 'Running gathering keeps its copied order', accent: 'ffd45e' },
  hosting_segment: { title: 'Hosted Block Activity — %s', detail: 'Block hosting progress: %d/4 activities', accent: 'ffb84d' },
  hosting_complete: { title: 'All 4 Block Gathering Events Hosted!', detail: 'Tenant circle (Q) and neighborhood short film (.) unlocked', accent: 'ffe066' },
  civic_complete: { title: 'Tenant Listening Circle Complete!', detail: "Every neighbor heard · 'The Open Seat' film short (.) unlocked · Sparks: %d", accent: 'd9a2b2' },
  film_shot: { title: 'Film Frame Captured — %s', detail: 'The Open Seat: %d/3 frames captured', accent: '91bac2' },
  film_complete: { title: 'Short Film Complete — The Open Seat (3/3)!', detail: 'All 3 storyboard frames captured · Sparks: %d', accent: 'ffe066' },
  history_comptons: { title: 'Living History — %s', detail: "1966 Compton's Cafeteria Riot plaque at Turk & Taylor · Sparks: %d", accent: 'f5a3d0' },
  history_blackhawk: { title: 'Jazz History — %s', detail: '1949–63 Black Hawk jazz club site at Turk & Hyde · Sparks: %d', accent: '6ec6ff' },
  museum_portal: { title: 'Archive Time-Portal — %s', detail: '398 Eddy St (Cadillac Hotel, 1907) · Session era %d/4', accent: '7be0e6' },
  tour_complete: { title: 'Neighborhood Tour Complete!', detail: '%d/%d stops · 10 keepsakes\nThanks for exploring!', accent: 'ffe066' },
  boeddeker_park: { title: 'Neighborhood Green — Boeddeker Park', detail: '240 Eddy St at Jones · %d shade trees, lawn & play area', accent: '7ce8b0' },
  so_what_egg: { title: "Found 'So What'!", detail: '8th-floor corner bay window & 1961 Miles Davis awning', accent: 'ffd45e' },
};
// The cues trigger_progress_cue passes as milestones (surprise_finale has no burst title, so it never shows one).
export const MILESTONE_CUES = ['mural_complete', 'block_opened', 'hosting_complete', 'civic_complete', 'film_complete', 'surprise_finale', 'tour_complete'];
// Godot detail -> 2D detail: the key hints 2D does not bind are dropped (Shift+Y, Q and the period key), as story.js
// WEB_OVERRIDES drops them. The keepsake detail is nothing but its key hint, so 2D shows the title alone.
export const BURST_WEB_OVERRIDES = {
  'Press Shift+Y anytime to export your block keepsake SVG': '',
  'Tenant circle (Q) and neighborhood short film (.) unlocked': 'Tenant circle and neighborhood short film unlocked',
  "Every neighbor heard · 'The Open Seat' film short (.) unlocked · Sparks: %d": "Every neighbor heard · 'The Open Seat' film short unlocked · Sparks: %d",
};
const web = text => (Object.hasOwn(BURST_WEB_OVERRIDES, text) ? BURST_WEB_OVERRIDES[text] : text);
// A title or detail as the 2D edition shows it, in the active language ('' stays '').
const shown = text => { const w = web(text); return w ? L(w) : w; };
// gdf, with the template looked up in a locale first (i18n.js format); table values passed as arguments are localized here.
const GDF = { ...FLAVORS.visits, legacy: gdf };
const fill = (template, args) => format(web(template), args, GDF);
// Fork display names (docs/I18N_PLAN.md 1.3.12 #11) for the motif ids Godot's String.capitalize turns into mural_motif's title.
// English equals gdCapitalize (tests/next-i18n-dialogue.test.mjs); a locale never title-cases an id.
export const BURST_DISPLAY = { motifs: { sun: 'Sun', wave: 'Wave', rise: 'Rise' } };
const motifName = id => Object.hasOwn(BURST_DISPLAY.motifs, id) ? L(BURST_DISPLAY.motifs[id]) : isEnglish() ? gdCapitalize(id) : id;
// loan_returned's title: Godot capitalizes the loan id ("Paint-case"), which English keeps; a locale names the loan by its title.
const loanName = id => isEnglish() ? gdCapitalize(id) : Object.hasOwn(LOAN_TITLES, id) ? L(LOAN_TITLES[id]) : id;
// hosting_segment's title: Godot shows the raw activity id ("beats"), which English keeps; a locale shows the activity's title.
const segmentName = id => isEnglish() ? id : segmentTitle(id);
// choose_gathering_layout's direct burst.
export const LAYOUT_BURST = { title: 'Gathering Layout: %s', detail: 'Curb lane set up · Sidewalk route stays clear · Sparks: %d', accents: { table: 'f8cc58', floor: '5fd4ba' } };

// Godot Color.lightened(amount), once or several times over the unrounded channels; '#rrggbb'.
export function lightened(color, amounts) {
  const h = String(color).replace(/^#/, '');
  let c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  for (const a of [].concat(amounts)) c = c.map(v => v + (1 - v) * a);
  return '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
const list = value => (Array.isArray(value) ? value : []);
const count = value => (Number.isFinite(value) ? value : null);

// The values trigger_progress_cue reads, from the fork state after the action (Godot recomputes the stems first). The visit-only
// values (eras, tourCount, tourTotal, trees) come from the visit that raises the cue, never from here.
export function cueValues(state) {
  const s = state ?? {};
  return {
    met: list(s.visited).filter(id => NEIGHBOR_IDS.includes(id)).length, total: Object.keys(NEIGHBOR_NAMES).length,
    stems: activeStemSummary(s), motifs: MURAL_MOTIFS.filter(id => s.mural?.[id]).length,
    returned: list(s.epilogue?.returned).length, futureProgramme: list(s.hosting?.order).length > 0, hosted: list(s.hosting?.results).length,
    sparks: sparkCount(s, { surprises: list(s.surprises), muralScenes: s.muralScenes ?? {} }), frames: list(s.film?.captured).length,
  };
}
const coat = name => CHARACTER_PEOPLE.find(p => p.name === name)?.coat ?? null;
const burst = (title, detail, accent, id) => ({ title, detail: web(detail), accent: lightened(accent, []), milestone: MILESTONE_CUES.includes(id) });
// Each arm below builds its title and detail already in the active language: fill() for templates, shown() for fixed text,
// with the reason localized as a name (L), a display name or a title. The cue's reason itself stays Godot's English data.

// A cue's banner {title, detail, accent, milestone}, or null: a suppressed cue, a cue without a burst title, or a visit value
// that is missing (the fork never invents one).
export function cueBurst(cue, v = {}) {
  if (!cue || cue.suppressed || !Object.hasOwn(BURST_TEXT, cue.id)) return null;
  const T = BURST_TEXT[cue.id], id = cue.id, reason = String(cue.reason ?? ''), accent = T.accent ?? CUE_ACCENT;
  const make = (title, detail, a = accent) => burst(title, detail, a, id);
  switch (id) {
    case 'neighbor_visit': {
      // Godot lifts the coat, then the border lifts that again, on unrounded channels: lift keeps the first lift for trigger().
      const c = coat(reason), b = make(fill(T.title, [L(reason)]), fill(T.detail, [v.met, v.total, v.stems]), c ?? CUE_ACCENT);
      return c ? { ...b, lift: [BANNER.coatLift] } : b;
    }
    case 'celeste_talk': return make(shown(T.title), fill(T.detail, [v.met, v.total]));
    case 'mural_motif': return make(fill(T.title, [motifName(reason)]), fill(T.detail, [v.motifs, v.stems]));
    case 'mural_complete': case 'rook_soundcheck': return make(shown(T.title), fill(T.detail, [v.stems]));
    case 'loan_returned': return make(fill(T.title, [loanName(reason)]), fill(T.detail, [v.returned]));
    case 'programme_published': return v.futureProgramme ? make(shown(T.futureTitle), shown(T.futureDetail)) : make(shown(T.title), shown(T.detail));
    case 'hosting_segment': return make(fill(T.title, [segmentName(reason)]), fill(T.detail, [v.hosted]));
    case 'civic_complete': case 'film_complete': return make(shown(T.title), fill(T.detail, [v.sparks]));
    case 'film_shot': return make(fill(T.title, [L(FILM_SHOTS[reason]?.label) ?? reason]), fill(T.detail, [v.frames]));
    case 'history_comptons': case 'history_blackhawk': return make(fill(T.title, [L(reason)]), fill(T.detail, [v.sparks]));
    case 'museum_portal': return count(v.eras) === null ? null : make(fill(T.title, [L(reason)]), fill(T.detail, [v.eras]));
    case 'tour_complete': return count(v.tourCount) === null || count(v.tourTotal) === null ? null : make(shown(T.title), fill(T.detail, [v.tourCount, v.tourTotal]));
    case 'boeddeker_park': return count(v.trees) === null ? null : make(shown(T.title), fill(T.detail, [v.trees]));
    default: return make(shown(T.title), shown(T.detail));
  }
}
// choose_gathering_layout's burst; sparks is spark_count() after the choice.
export function layoutBurst(layoutId, sparks) {
  if (!Object.hasOwn(GATHERING_LAYOUT_TITLES, layoutId)) return null;
  return burst(fill(LAYOUT_BURST.title, [L(GATHERING_LAYOUT_TITLES[layoutId])]), fill(LAYOUT_BURST.detail, [sparks]), LAYOUT_BURST.accents[layoutId], '');
}
// A direct trigger_feel_good_burst whose text a side story already built (a find's heading and burst line, an eatery's Order Up).
// finale (the 10/10 find, visits-world.js) is passed on when given, so keep_finale never reads a translated title.
export function directBurst({ title, detail = '', accent = DEFAULT_ACCENT, finale } = {}) {
  return title ? { title: String(title), detail: String(detail), accent: lightened(accent, []), milestone: false, ...(typeof finale === 'boolean' ? { finale } : {}) } : null;
}
// layout_reward_banner's wanted rect in the play area, for a banner of the given height.
export function bannerRect(area, height) {
  const W = BANNER.width, w = Math.min(W.max, Math.max(W.min, area.w - W.inset));
  return { x: area.x + (area.w - w) * 0.5, y: area.y + BANNER.top, w, h: height };
}

// The banner's state: trigger() is trigger_feel_good_burst's banner half; layout() and step() are layout_reward_banner and
// update_celebration_burst with env = { focused, overview, fits } (fits: fit_overlay_around_player found room). The caller
// lays the banner out right after a trigger, as Godot does, so the next trigger's keep_finale reads where it stands.
export function createBanner() {
  const fresh = () => ({ timer: 0, visible: false, milestone: false, lastTitle: '', lastFinale: false, title: '', detail: '', border: lightened(DEFAULT_ACCENT, BANNER.borderLift), opacity: 1, count: 0 });
  let b = fresh();
  const view = () => ({ visible: b.visible, title: b.title, detail: b.detail, border: b.border, opacity: b.opacity, timer: b.timer, milestone: b.milestone, lastTitle: b.lastTitle, count: b.count });
  function layout({ focused = false, overview = false, fits = true } = {}) {
    b.visible = !focused && b.timer > 0 && !overview && !!fits;
    return b.visible;
  }
  return {
    // finale: the burst is the 10/10 finale. Godot reads that from the title's "10/10" (begins_with); a burst that says so itself
    // (directBurst's finale) is read by its flag, so a translated title cannot change the rule.
    trigger({ title, detail = '', accent = DEFAULT_ACCENT, lift = [], milestone = false, finale }) {
      const t = String(title), isFinale = typeof finale === 'boolean' ? finale : t.startsWith(BANNER.finalePrefix);
      b.count++;
      let keep = b.lastFinale && b.timer > BANNER.keepFinale && !isFinale;
      keep = keep || (b.timer > 0 && !b.visible && b.milestone && !milestone);
      if (keep) return false;
      Object.assign(b, { lastTitle: t, lastFinale: isFinale, milestone: !!milestone, border: lightened(accent, [...[].concat(lift), BANNER.borderLift]), title: gdf(BANNER.titleFormat, [t]), detail: String(detail), opacity: 1, visible: true, timer: BANNER.seconds });
      return true;
    },
    // Godot sets reward_banner_timer itself after the 10/10 finale (4.5 s).
    hold(seconds) { b.timer = seconds; },
    layout,
    step(dt, env = {}, reducedMotion = false) {
      if (b.timer > 0) {
        layout(env);
        if (!env.focused && b.visible) b.timer -= Math.max(0, Number(dt) || 0);
        b.opacity = !reducedMotion && b.timer <= BANNER.fade ? Math.min(1, Math.max(0, b.timer / BANNER.fade)) : 1;
        if (b.timer <= 0 || env.overview) { b.visible = false; b.timer = 0; }
      }
      return view();
    },
    // A banner is up or waiting (update_landmark_tour_completion waits for it).
    pending: () => b.timer > 0,
    // A load or a restart (apply_save_envelope, reset_mural_state_to_defaults).
    reset() { b = { ...fresh(), count: b.count }; },
    view,
  };
}
