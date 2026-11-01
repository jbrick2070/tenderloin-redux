# Phase 3 wiring spec: the side stories in browser-next

> **Status: implemented; kept as the historical design record.** Section numbers cited in code comments (for example "Phase 3 wiring spec 3.10", "WP2a", "spec risk R9", "lesson 6") refer to this file. Where the code and this spec differ, the code and `docs/BROWSER_NEXT.md` win; the main differences are listed here:
>
> - `createWorldVisits(kit)` no longer returns `bindNotes()` (section 3.10 lists it): the shell's `bindEntry('notes')` binds Field notes' five buttons, with the held-Enter guard.
> - `VISITS_FORK_TEXT.back` is "Back to exploring", not "Back to the block", which is `film_screening.gd`'s own Back label (1.4, `visits-kit.js`).
> - `createVisits(host, parts)` takes the episode screens and the neighborhood part as injected factories: `game.js` passes `{ createEpisodeScreens, createWorldVisits }` (3.1 and WP2a have `createVisits(host)`). `createKit(host, session, routes)` also takes the shell's routes (3.10 has `createKit(host, session)`).
> - Beacon tap points (3.8): a surprise beacon is hit at its foot (its own object), half way up its pole, at its globe and along its label chip where the frame draws it. Every point but the foot is `tapOnly`, so `world.js` `nearest()` (E/Enter and the Nearby hint) still measures a beacon from its foot. The gold tour marker is one object, at its drawn diamond.
> - Cook & Share (feature 2): Previous and Next cook sit in a two-column pager row under the credit, above the heading, picture and text they change.
> - The quiet prefetch (3.4): opening Story fetches `power_place.json` with no loading line, no redraw and no error line (`ensureData(names, onReady, { quiet: true })`); the next screen that needs a file that failed loads it again, out loud.
> - The 256 KB data cap (3.2 `load`, 3.4): `game.js` refuses a place file over 256 KB, which counts as a load error, and the kit checks the files' field types and sizes (`visits-kit.js` `inBounds`) before Godot's `valid_source`; a file that fails either check is invalid for the visit.
> - The 2D sidewalk: `visits/positions.js` `SIDEWALK_SITES` stands 21 sites 48 px from their street's centerline (the ten beacons, the six counters, the Blue Valve's front, the museum and the three relay lamps), a declared adaptation of where Godot's converted points land in the wider 2D roadway.
> - The chip declutter (D3): the label chips are laid out in priority order on free rows, clear of the beacons' globes, the people and `world.js`'s name chips (`sprites.js`), not only drawn from the neighbor-name zoom.
> - Field notes (3.7) has five entries: Spot Surprise, Visit the Museum, Visit Eateries, then Visit the Park and See 'So What', declared 2D controls for Godot's tap on the park's label and Shift+H.
> - Inspect order (feature 8, lesson 1): after a find's `host.act` (whose action plays the find's chime), the camera, then the card, then the speech bubble and a landmark's chime, so the speaker's line is said once, in the card's status line.
> - Walks and focus (3.6, 3.9): `resetSession()` also stops a walk a side story owns, so an adopted save or "Use the shared save as it is" cancels the trip, and `visits.sync()` stops an episode's walk when the episode ends as unavailable. Focus falls back to the map when its return target is hidden or disabled.
> - Names (3.11): the Election Walk's pins are named Godot's "Map pin n: city address point", which holds the visible "1" or "2" as a whole word. Power's relay tab on show is `aria-pressed` while the story is active, a declared 2D addition: Godot's tabs are plain buttons.
> - Conversations (WP3c): Godot's list, except that an action it names twice is one control, the first kept (`game.js` `uniqueById`), a declared deviation.
> - The save (WP1 item 3): a write still full after dropping keys no Godot writes is retried once over the save as Godot's next write would hold it, with `active_motif`, `mural_scenes` and `discovered_surprises` cleaned as Godot's load cleans them. Keep brings back a newer Godot's surprise ids that only this tab's write base held, where they fit, and the Mural Stories admission sizes the save as Godot holds it.
> - Cost (R2, R9): besides the cell cache, street distance uses a bucket grid built once per streets array and cells have integer keys, with byte-identical paths. Sprite parts and chips off screen are skipped, and the chip layout is kept while the view and the player's 8 px cell are unchanged.
> - Tests: "web overrides only drop 3D key hints" became "web overrides are their Godot literal with only the listed key-hint rewrites, letter for letter" (`KEY_HINT_REWRITES` in `tests/next-visits.test.mjs`), and `tests/next-router.test.mjs` is a test file the spec does not list.

Status: implementation spec, October 31, 2026. Read-only review of the working tree (branch `main`, uncommitted Phase 2 polish present). Nothing under `C:\tenderloin-redux` was edited. All "verified" claims below come from reading the named file and function; the test-impact lists come from running `node --test tests/next-*.test.mjs` on a scratch copy of the tree with the proposed changes applied (section 2.1, "Verification log").

Conventions used throughout:
- Code is named by file and function, never by line, for every file that is moving: `browser-next/game.js`, `style.css`, `hosted-text.js`, `characters.js`, `tests/next-browser.mjs`. Godot sources are quoted as `file:line` (they are not moving).
- "Dirty" means modified in the working tree today but not on the moving list: `package.json`, `browser-next/ending/text.js`, `docs/BROWSER_NEXT.md`, `docs/BUILD_STATUS.md`, `tests/next-music.test.mjs`, `tests/next-press-settle.test.mjs`, `tests/next-scaffold.test.mjs`. Treat them like moving files: no package edits them before the Phase 2 polish is committed.
- CRLF files (keep CRLF, `tests/next-scaffold.test.mjs` pins it): `game.js`, `core.js`, `world.js`, `camera.js`, `index.html`, `style.css`, `data/streets.osm.json`. Every other fork file is LF; every new file in this spec is LF.
- Untracked today: `browser-next/visits/` (12 files), `tests/next-visits.test.mjs`, `tests/gd-literal.mjs`. `tests/gd-lex.mjs` is tracked.
- Commit hygiene for every package: stage only the package's own paths (`git add <paths>`), never `git add -A`; other agents' work is in the same tree. Commit and push verified work with `[skip ci]`; a Pages deploy still needs the creator's explicit OK.

Two hard constraints found while reading (they shape the package cut):
- **No import cycle into the save or core modules.** `browser-next/visits/positions.js` imports `../core.js` and `../history.js`, and `history.js` calls `core.js` `project()` at module top level (`WEST_INTERSECTIONS`). So `core.js` and `godot-save.js` (which `core.js` imports) must never import anything under `visits/`; doing so throws a TDZ ReferenceError on `ORIGIN` at load. `story.js` may import `visits/landmarks.js` and `visits/surprises.js` (verified on the scratch copy: the module graph loads, `game.js` fails only at `document`).
- **The rapid-mark pin scans every top-level fork file.** `tests/next-press-settle.test.mjs` "the rapid set" walks every `.js`/`.html` under `browser-next/` except the `visits/` and `data/` folders, requires each `data-rapid` to be either a literal `id="…" data-rapid` tag or the renderer form `${x.rapid ? ' data-rapid' : ''}`, requires view marks to be the literal `rapid: true`/`rapid: false`, and pins the renderer files (conduits) to exactly `['ending/ui.js', 'game.js']`. New UI files live at the top level, so they are scanned (section 2, WP3 updates the table).

---

## 1. Scope and parity table

### 1.1 Rules common to all nine features

| Topic | Godot | 2D (this spec) |
|---|---|---|
| What is saved | Only `discovered_surprises` (`main.gd:12462-12467` write, `main.gd:13238-13244` lenient load). Every story, the meal, the picker and the landmark tour are visit-only (`main.gd:764` comment; `shared_meal.gd:2`; `dog_story.gd:2`; `story_picker.gd:2`). | Same. `surprises` becomes a fork-owned field written as `discovered_surprises`; everything else lives in one module-level visit session inside `visits-ui.js`, never saved. |
| Reset | Restart (`reset_mural_state_to_defaults`, `main.gd:12547-12570`, tour and surprise guide `12596-12608`) and every load (`apply_save_envelope`, `main.gd:13058-13072`, `13217-13229`) reset every visit, the tour, `surprise_guide_idx` and `last_hinted_surprise_id`. | game.js `resetSession()` calls `visits.sync({ adopted: true })`; `resetSession()` already runs on restart and on every adoption, never on a rebase. |
| Keys | F8 (`main.gd:14879-14880`), Shift+F8 (`14808-14811`), Shift+D (`15032-15034`), Shift+M (`14933-14935`), Shift+E (`14938-14940`), Shift+H (`15026-15027`), Shift+L (`15036-15037`), Escape per screen (`14812-14836`). | No new key binding (the fork binds none of Godot's letter keys; the declared overrides drop the hints). Escape keeps Godot's per-screen action. Every key has a button equivalent (1.3). |
| Info panel | `info.text` = line, sub, credit; header details expand (`set_header_details`). | A "visit card" dialog that shows the same three lines. |
| Camera | Each inspect flies the camera (`in_overview=false`, `following_player=false`, `target`, `view_size`, `frame_landmark_view` `main.gd:6067-6074`). | New `Camera.lookAt(point)` (WP1): leave overview and following, centre on the point, scale at least 0.85. |
| Feel-good bursts and the reward banner | `trigger_feel_good_burst`, `reward_banner_timer` (`main.gd:5726-5733`, `5311`, `11104-11105`). | Not ported (Phase 2 decision, `docs/BROWSER_NEXT.md` "Not ported yet"). The surprise burst heading and sub and the eatery "Order Up" heading and sub are shown as text lines in the visit card because the pure modules already return them; the museum, park, So What and tour bursts are not shown. |
| Reward chimes | `trigger_progress_cue` arms (`main.gd:10961-10992`), play rule (`11102-11103`), `play_reward_sound` gates (`3290-3299`). | `rewards.js` plays them: `surprise_discovery`/`surprise_finale` from the saved `surprise` action through `progressCues`; `museum_portal`, `boeddeker_park`, `so_what_egg`, `eatery_order`, `tour_complete` through a new visit-only `host.chime(id, reason)`. |
| Speech bubbles | `show_speech_bubble(id, pos, text)` for `surprise:<id>` (`5722`), `eatery:<id>` (`5291`), `museum_docent` (`8739`). | `bubble.js` already takes any id; `game.js` `stepSpeech` learns to resolve non-neighbor anchors through `visits.anchor(id)`. |
| Music | The four episodes have a "Music: On/Off" button that calls `toggle_music_playback()` then `refresh(false)` (`dog_story.gd:87`, `lantern_procession.gd:89`, `power_story.gd:128`, `voting_story.gd:77`). None of the nine features starts or stops music otherwise; Before These Streets says "no progress or audio is started" (`before_streets.gd:158`). | `host.music.toggle()` (game.js `toggleMusic`), redraw only if the screen still holds the dialog, then say Godot's music line last (Phase 2 rule). |

### 1.2 Feature tables

#### Feature 1: Before These Streets (`godot/before_streets.gd`, `browser-next/visits/before-streets.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entries | Startup card button "Before These Streets", accessibility name "Optional opening: Before These Streets" (`main.gd:7359-7367`), visible only on the startup card (`main.gd:7431`). Info column revisit "Before These Streets" (`main.gd:16187-16190`), visible when header details are expanded and `idle_entry_available()` (`before_streets.gd:82-83`; `main.gd:7723-7724`, `7751-7756`). | `#before-entry` inside the startup chapter card (game.js `showChapterCard(true)`), before the `#begin` row; focus stays on `#begin`. `#before-revisit` in Field notes (game.js `journal()`), shown when `before.idleEntryAvailable(ctx)` holds at render time. |
| Screen | Title "Before These Streets", two-line subtitle (`48-52`), picture (`artwork 182-198`, cache `175-180`), reader (`refresh 145-170`), Previous view / Send a gust (`61-62`), Changing shapes / Passing time toggles (`64-66`), Sources/Back to scene (`68`, `156`), Return labelled Back to start or Back to block with tooltip (`69`, `157-158`). | `beforeView(b)` buttons with ids `before-previous`, `before-gust`, `before-shapes`, `before-time` (aria-pressed), `before-sources`, `before-back` (tooltip as description). Picture `artworkDataURI(view, observation)`, alt `artDescription`. Sources view: `sourceLines()`; URL lines are `<a class="source-link" target="_blank" rel="noreferrer">` (reading references, never fetched). |
| Gate | Refuses during a focused activity, an active story, walking, or a non-startup story card (`85-90`). | `changeBefore(b, {type:'open'}, ctx)`. From Field notes the opener's own dialog is not "busy" (3.5). |
| Focus | Gust, else Back (`99`); Gust disabled moves focus to Changing shapes (`134-135`); Sources focuses the reader (`143`). | Same, through `focus()` after each redraw. |
| Close | Restores the startup card with Continue focused when opened from it (`112-113`); announces FRAME + close text (`118`); held movement keys wait for release (`104-106`, `124-129`; `main.gd:14318`, `14324`). | From the startup card: `host.restoreStartupCard(announce)` redraws the card with `#begin` focused and the status line set to the close text. From Field notes: dialog closes, toast says the close text, focus returns to `#journal-button`. The fork's existing `modal` `close` rule (`keys.clear()`) covers held movement keys. |
| Keys | Escape closes (`223-224`), echo ignored (`220-221`), PageUp/Down/Home/End scroll the reader (`225-234`); while it is visible `_input` returns after `handle_input` (`main.gd:14752-14754`), so movement keys never dismiss the startup card. | Escape runs `before-back`'s action (visits `cancel` listener). The fork's capture listener already drops repeated Escape and repeated Enter. Movement keys do nothing on the Before screen: game.js only treats a movement key as "Start Exploring" when `[data-chapter-card] #begin` is in the dialog. |
| Saved | Nothing; `reset_visit` (`121-122`) on restart and load. | Nothing; `visits.sync({ adopted: true })` from `resetSession()`. |
| 3D-only | Hides every sibling Control (`94-98`); layout fitting (`200-216`); a11y snapshot. | Dialog; CSS layout; `window.tenderloin.visits()`. |

#### Feature 2: Cook & Share (`godot/shared_meal.gd`, `shared_meal_data.gd`, `visits/meal.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entry | Block hub button "Cook & Share" (`main.gd:16047`). Locked look when the block is not open or hosting is in progress, tooltip "Unlocks later" / "Suggested next step" + ". " + "Optional shared meal with fictional neighbors; preparation and invitations last for this visit." (`main.gd:7293-7304`); suggested on the explore objective while fewer than 4 dishes are shared (`main.gd:7275-7276`). | `#meal-entry` in the afterglow actions (game.js `updateAfterglow`), always enabled while the block is open; its description (aria-describedby, sr-only, also `title`) is Godot's tooltip text. No dimming (opacity would break 4.5:1 contrast); declared. |
| Screen | Heading cook \| title, credit (`53`), picture, reader, Previous cook / Next cook marked rapid and named "Previous/Next revealed cook. Current: …" (`66-68`, `212-213`), Prepare labelled with the current step or "Try another preparation" (`69`, `210`), Shared platter / Tasting plates toggles (`71-74`), Near edge / Other edge toggles (`76-79`), Share this dish / Follow this invitation (`81`, `219`), Keep exploring (`82`). | `mealView(m)`: `meal-previous` and `meal-next` (`rapid: true`), `meal-prepare`, `meal-serving-0/1`, `meal-placement-0/1` (aria-pressed; hidden when Godot hides the rows, `217-218`), `meal-share`, `meal-explore`. Picture `artworkDataURI(i, stage, style)`. |
| Refusals | In order: closed block, active story, startup/story card/walking/focused activity, hosting in progress (`102-109`). | `mealRefusal(ctx)` said as a toast. |
| Close | Announce "Back to the street. …" (`135`). Escape closes (`main.gd:14812-14815`). `_process` closes when the block is no longer open (`402-405`). | `changeMeal(m, {type:'close'})` → toast; Escape same; `visits.sync()` closes it when `state.opened` is false. |
| World | Four dish quads on the Long Table at `TABLE_SLOTS` or on a cloth on the Open Floor (`332-376`), shown when the block is open, something is shared and no story is active (`357`). | `worldDishes(m, {opened, storyActive})` drawn by `sprites.js` on the 2D gathering table (3.8). |
| Saved / cues | Nothing; no cue (`2`). Reset `137-141`. | Same. |

#### Feature 3: Two Dogs Home (`godot/dog_story.gd`, `visits/dogs.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entries | Power hub "Missing\ndogs" (`power_story.gd:130-134`, name "Two Dogs Home: original missing-dogs search and reunion" `490`); story picker entry; walk control "Dog search" with tooltip when active and idle (`main.gd:14000-14002`). | `power-dogs` in the Power screen; `picker-entry-3`; `#story-resume` nav button (3.7). |
| Screen | Heading "Two Dogs Home \| n/2 matched[ \| Reunited!]" (`327`), credit (`56`), picture (`illustration 376-381`), reader (`328-336`), 12 buttons in Godot's grid order (`80-88`): Pippin, Junebug, SFACC info, Turk / Taylor, Turk / Hyde, Gathering, Begin search, Walk to lead, Match dog (Reunite when both are found and the lead is Gathering, `343`), End search, Music: On/Off, Back; names with descriptions and ". Independent soundtrack." (`346-348`); "Other\nstories" in the heading row (`story_picker.gd:179-189`). | `dogsView(d, ctx)` ids `dogs-<id>` for `pippin, junebug, info, lead0, lead1, lead2, begin, walk, match, end, music, back`; `dogs-stories` for Other stories. Focus from `view.focus`. |
| Walk | Walk to lead closes the screen and walks; a refused route says the blocked line and reopens (`273-282`); arrival within 2 m reopens after the press is released (`289-295`, `402-408`); a new route elsewhere cancels intent (`403`); a short arrival says blocked (`405`). | Walk protocol (3.6): `walk` → `host.walk`; `'blocked'` → `{type:'blocked', reopen:true}`; `walkEnded()` → `{type:'arrived'}`; `walkCancelled()` → `{type:'cancel'}`. |
| World | Dogs at their search sites while active; owners and dogs at the gathering after the reunion (`94-115`, `314-321`). | `dogsScene(d)` drawn by `sprites.js` (actors layer). |
| Picker effects | Reunion offers the lantern invitation (`303`; `story_picker.gd:197-200`). | `changeEpisode` returns `reunited` and calls `offerLantern`. |
| Saved / cues | Nothing; Music only. | Same. |

#### Feature 4: Lantern Procession (`godot/lantern_procession.gd`, `visits/lantern.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entries | Picker entry 0; walk control "Parade" (`main.gd:14004-14006`); "Follow this invitation" in the picker (`story_picker.gd:63-65`, `243-245`). | `picker-entry-0`, `picker-follow`, `#story-resume`. |
| Screen | Heading "Lantern Procession \| Costume makers / Lead the lanterns / Welcome!" (`348`); ten buttons (`81-90`): Bat cape, Stargazer cape, Moon lantern, Star lantern (locked after Gather, `353`), Begin, Walk to assembly / March (`356`), Gather / Welcome (`358`), End parade, Music: On/Off, Back; refresh (`347-363`), focus (`250`), Other stories. | `lanternView(l, ctx)` ids `lantern-bat, lantern-star, lantern-moon, lantern-starLantern` (aria-pressed), `lantern-begin, lantern-walk, lantern-advance, lantern-end, lantern-music, lantern-back`, `lantern-stories`. Picture `lantern.artwork(costume, lantern)` cached by `costume:lantern`. |
| Walk and progress | Walk keeps a manual camera (`291-300`); progress grows only while walking along the route in phase 1 (`392-399`); return trip to a paused group (`288-289`, `404`); route built at runtime from clearances (`133-162`). | `walk` with `keepCamera: true`; `visits.tick()` sends `{type:'tick'}` every frame while the lantern trip travels; static `LANTERN_ROUTE` (tested clear in `tests/next-visits.test.mjs`). |
| World | Two visitors behind the progress point, the player's paper cape and lantern (`92-103`, `196-220`, `331-341`). | `lanternScene(l)` drawn by `sprites.js`. |
| Saved / cues | Nothing; Music only. | Same. |

#### Feature 5: Power Story and the Larkin place (`godot/power_story.gd`, `godot/power_place.gd`, `godot/data/power_place.json`, `visits/power.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entries | Hub "Story" button in the block pager, tooltip and accessibility name "Neighborhood Stories: resume F8; switch story visits Shift F8" (`power_story.gd:136-141`), visible when the block is open, no focused activity or card, hub mode (`606-610`); F8 (`main.gd:14879-14880`); walk control "Power Story" (`main.gd:13996-13998`). `open_story` delegates to another active episode (`241-243`). | `#story-entry` "Story" in the afterglow, description "Neighborhood Stories" = `web('power_story.gd', power.entryTooltip())` (verified defect: `entryTooltip()` returns the Godot text with both F8 hints, although its comment says otherwise; WP1 fixes it, and the UI wraps it in `web()` either way, which is idempotent). `visits.open('story')` = `picker.openEpisode(stories, 'power', ctx)` (delegates). `#story-resume`. |
| Screen | Heading "Neighborhood Stories" (idle hub), "Lights Back On \| n/3", "Larkin 2017 \| n/3 neighbor lights", "Lights Back On \| Story ended"; credit and reader (`486-514`); four transparent connector pads marked rapid, named "Turn connector n: X to Y" (`94-106`, `518`), visible only when 88 px cells reach 44 px (`575-582`); three tabs: Relay 1-3 (with " OK") while active, Festival / Larkin\n2017 / Place\nmap when idle (`118`, `520-529`); six actions: Begin\nstory / Replay\nstory / Case\nmap / Battery\nview, Walk to\nrelay, Check\npath, End\nstory, Music: On/Off, Back (`124-129`, `530-536`); Missing\ndogs and More\nstories (`130-135`, names `487-490`); case map labels Larkin / Eddy, 40 m, N, Eddy Street (`87-93`, `567-574`). | `powerView(p, ctx)`: `power-pad-0..3` (literal `data-rapid`, DOM buttons over the diagram at `PAD_CELLS`), `power-tab-0..2`, `power-begin, power-walk, power-check, power-end, power-music, power-back`, `power-dogs`, `power-more`; map labels absolutely positioned at `MAP_LABEL_POINTS`, font at least 12 px. Picture `diagram(p)` or `mapSVG(ctx.powerPlace)`. |
| Data | `power_place.json` loaded and validated at setup (`power_place.gd:13-24`, `62-81`); walk bounds grow to the junction minus 10 m (`52`); west of the legacy window only the Eddy corridor admits points (`95-96`). | JSON fetched lazily (first `story`, `picker` or `election` open) by `host.load`, validated by `power.validSource`; until ready, Larkin Begin is disabled and the map draws its empty frame (`mapSVG(null)`). The Eddy corridor is static data in `core.js` (WP1). |
| Walk | Larkin and back use a two-leg route through Taylor/Eddy (`352-376`, `612-626`). | One BFS route (`positions.js`: "the 2D router needs none"). |
| Lighting | Festival after-dark world lighting, Larkin daytime (`421-444`); fixtures and relay kits (`142-168`); battery stand (`172-190`); evening-lights interplay (`main.gd:4947-4951`). | `powerScene(p)` and `fixtureLit(p, i)` drive a translucent after-dark overlay, relay boxes and lit dots, the battery stand, and warm pools when all three are restored (`sprites.js`). No evening-lights toggle exists in 2D, so `main.gd:4950-4951` has no counterpart. |
| Saved / cues | Nothing; Music only. | Same. |

#### Feature 6: Election Walk (`godot/voting_story.gd`, `godot/data/voting_places.json`, `visits/election.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entries | Picker entry 1; walk control "Election map" (`main.gd:14008-14010`). Available only with valid voting data and the Larkin data (`148`). | `picker-entry-1`, `#story-resume`; both JSON files fetched lazily; `election.available(ctx)`. |
| Screen | Heading "Election Walk 2024 \| n/2 sites observed / Place the labels / Share with Bea / Shared!" (`261`); twelve buttons (`67-78`): Cadillac\n380 Eddy, Boeddeker\n246 Eddy, Warm paper, Cool paper, Begin walk, Walk to site / Return to Bea (`266`), Record site, Make map, Share map, End walk, Music: On/Off, Back; two pins "1" and "2" named "Map pin n: city address point", 44×44 over the paper (`79-83`, `276`, `347-352`); placed labels "1 380 Eddy St\nCadillac", "2 246 Eddy St\nBoeddeker" (`84-87`, `275`, `350-352`); refresh (`260-279`); paper folio on the player (`107-112`, `282-303`). | `electionView(e, ctx)` ids `election-cadillac, election-boeddeker, election-warm, election-cool` (aria-pressed), `election-begin, election-walk, election-record, election-make, election-share, election-end, election-music, election-back`; `election-pin-0/1` (44×44 CSS px centred on `mapPoint(site.xz)`); `election-stories`. Picture `paperSVG(e, ctx.voting)` cached by `paperKey(e)`. |
| Walk | Keeps a manual camera (`235-241`); two legs through Taylor/Eddy (`229-233`, `317-322`); blocked always reopens (`244-246`). | `keepCamera: true`; one BFS route; `{type:'blocked'}` reopens per `election.js`. |
| Saved / cues | Nothing; Music only. | Same. |

#### Feature 7: the stories hub and picker (`godot/story_picker.gd`, `visits/picker.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Entries | Power's More stories (`power_story.gd:135`), each episode's Other stories (`story_picker.gd:179-189`, added for dogs, lantern, voting at `main.gd:16160-16161`), Shift+F8 (`main.gd:14808-14811`). | `power-more`, `dogs-stories`, `lantern-stories`, `election-stories`. |
| Screen | Title "Your story visits", reader (invitation, "Completed this visit: …", the switch rules), four entries "Visit / Continue / Resume: Halloween: Lantern Procession · Election Walk: November 2024 · Power stories · Two Dogs Home", two per page, named "… . Progress for this visit only." (`53-55`, `137-145`); Earlier/Later marked rapid (`58-60`); Follow this invitation, named "Follow Imani's invitation: Lantern Procession" (`63-65`); Keep exploring; Back to stories (`66-67`). | `pickerView(stories, ctx)`: `picker-entry-0..3` (only the visible page rendered), `picker-earlier`/`picker-later` (`rapid: true`), `picker-follow`, `picker-explore`, `picker-back`; focus from `view.focus`. |
| Behaviour | Opening stops walking and closes a visible episode (`83-108`); Escape is Back to stories (`main.gd:14816-14819`); select suspends the owner and restores it on a refusal (`223-241`). | `openPicker`, `selectStory`, `followInvitation`, `keepExploring`, `backToStories`, `changePage`; `host.stopWalk()` first where Godot calls `stop_walking()`. |
| Saved | Nothing; `reset_visit` (`255-258`). | Same. |

#### Feature 8: neighborhood surprises (`main.gd` 266-405, 5350-5771, 6006-6020, 6604-6617, 10560-10597; `visits/surprises.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Ways in | Tap a beacon when not in an overview (`main.gd:14484-14498`); Shift+D cycles (`5758-5771`, `15032-15034`); conversation action "Spot Surprise (%d/%d)" (`6553-6555`, `6582-6583`, run `6661-6664`); explore objective names the next one (`6159-6174`); What's Next pair hints (`6420-6440`). | Map tap on a marker (World hit, only when `!world.camera.overviewMode`); E/Enter near one; `#notes-spot` in Field notes; `card-spot` in any surprise card; the talk action `talk-surprise` (WP3c enables it); What's Next walks to the explore target and inspects on arrival. |
| Inspect | No walking; camera flies (`5692-5701`); marks discovered and saves when new (`5702-5708`); bubble at the site (`5722`); cue `surprise_discovery`/`surprise_finale` (`5725`); burst (`5726-5733`); the paired neighbor's open panel shows its memory line (`5734-5743`); info text and announcement (`5750-5755`, "(Shift+D for next surprise)" in `sub`). | `act({type:'surprise', id})` first (saved; cue through `progressCues`), then `inspect(foundBefore, id, {openNeighborId, sparks: host.sparks(), guideIdx, lastHinted})`, then `host.lookAt(site)`, `host.speak('surprise:'+id, speech, speaker)`, then the surprise card (heading `r.heading ?? r.title`, eyebrow badge, `r.burstSub` when new, `r.info` lines, `r.memory` when non-empty, `card-spot`, `card-back`); status line `r.announce`. |
| World | Beacons in the accent colour, 1.25× when found, darkened 28% otherwise (`5624-5636`); keepsakes on the paired neighbors (`5637-5653`); always-on labels "[*] … (Tap / Shift+D)" (`5387`…`5615`). | `markers(found)`, `keepsakes(found)`, `darken()`; label chips with the Godot label minus " / Shift+D" (declared override, 1.4), drawn at the neighbor-name zoom threshold. |
| Saved | `discovered_surprises` (forward-only, ungated). | `state.surprises` (WP1). |
| Spark count | `spark_count()` includes surprises (`5773-5775`). | `characters.js` `sparkCount(state, extras)` with `extras.surprises = state.surprises` (WP3). |

#### Feature 9: landmark tour, museum Time-Portal, Boeddeker Park, "So What", six eateries (`main.gd` 186-265, 700-773, 3857-4295, 4459-4602, 5228-5318, 6025-6104, 6175-6193, 8666-8778; `visits/landmarks.js`)

| Aspect | Godot | 2D |
|---|---|---|
| Ways in | Taps on the museum (`14503-14505`), park label (`14506-14508`), So What awning or 8th floor (`14499-14502`), eatery labels and open counters (`14449-14452`, `14509-14519`, `activate_eatery 14534-14539`), the gold tour marker (`14443-14448`); keys Shift+M/E/H (`14933-14940`, `15026-15027`); conversation actions museum, eateries, landmark_tour (`6556-6557`, `6584-6589`, run `6649-6660`). | Map taps on `museum`, `park`, `so_what`, `so_what_floor`, `eatery:<i>`, `counter:<i>` objects; Field notes `#notes-museum`, `#notes-eateries`; card buttons `card-next-era`, `card-eateries`, `card-order`, `card-tour`; talk actions `talk-museum`, `talk-eateries`, `talk-landmark-tour` (WP3c). |
| Museum | Cycles four eras per press, docent bubble, portal rings and lens colour, cue `museum_portal` on a new era (`8702-8748`, `8687-8700`). | `inspectMuseum(tour)`; card with `card-next-era` ("Next era", fork text named by the declared override of `sub0`); `host.chime('museum_portal', eraTitle)` when `newStop`; docent bubble at `MUSEUM_DOCENT`. |
| Park | Camera framing, cue `boeddeker_park` once, tree count from runtime placement (`4583-4602`, trees `4555-4577`). | `inspectPark(tour, trees.length)` with trees from `visits-world.js` `parkTrees()` (Godot's 6.5 m jittered grid without building footprints; count may differ, 5). |
| So What | Cue `so_what_egg` once (`8666-8685`). | `inspectSoWhat(tour)`; chime when `newStop`. |
| Eateries | Guide opens the counter and greets (`8750-8778`); counter orders, first order cues `eatery_order` and bursts (`5293-5317`). | `cycleEatery`, `orderEatery`, `activateEatery`; `card-order` ("Order at the counter", fork text: Godot's only order path is a tap); chime when `newStop`. |
| Tour | 12 stops (`6025-6044`), `visit_next_landmark` (`6046-6064`), completion once per visit from the frame loop (`6089-6103`), explore objective tail (`6175-6193`). | `tourState`, `visitStop`, `tourCompletion` (checked in `visits.tick()`), `exploreObjective` in `story.js` (WP1). |
| Saved | Nothing ("excluded from save envelope", `main.gd:764`). | Nothing. |

### 1.3 Godot-only elements and their 2D equivalents

| Godot element | 2D equivalent |
|---|---|
| F8 (resume active story or paused Power) | `#story-entry` "Story" (delegates like `open_story`) and `#story-resume` |
| Shift+F8 (picker) | More stories / Other stories buttons |
| Shift+D / Shift+M / Shift+E | Field notes "Spot Surprise (n/10)", "Visit the Museum", "Visit Eateries" and the same buttons on cards |
| Shift+H (So What) | Map tap and the tour stop |
| Shift+L (evening lights) | None; 2D has no day/evening mode. The existing override drops only "(Shift+L)", so the done hint still says "or switch to evening lights" (D9) |
| Walk control relabelled per episode (`main.gd:13982-14011`) | `#story-resume` in `.neighbor-navigation`, before `#stop-walking`, shown when an episode is active and the player is not walking |
| Block hub with pager and the "Story" pager button | Afterglow buttons |
| Info panel text | Visit card dialog |
| Camera flights, `frame_landmark_view`, occlusion/cutaway | `Camera.lookAt(point)`; no occlusion |
| 3D meshes and Label3D (dogs, crew, costumes, folio, relay kits, battery stand, portal, park, awnings, counters, beacons, keepsakes, Larkin exterior) | Canvas sprites in `sprites.js` through a `world.js` layer hook |
| Power world lighting | Translucent after-dark overlay plus glows |
| Two-leg Taylor/Eddy routing | One BFS route over the static Eddy corridor |
| `open_from_walking` waiting for the press to release | Arrival happens only on the frame loop with no dialog open, so the reopen is immediate |
| Godot WASD steering during a story walk keeps the trip (`main.gd:14359-14377` never clears `current_path`) | A movement key stops a 2D walk (game.js `renderFrame` calls `stopWalk()`), so it cancels the trip intent like Godot's Stop Walking (declared deviation, 5) |
| `connector_room` hiding pads below 44 px | Pads are always at least 44 CSS px (the 360×240 picture is at least 230 px wide at 320 px) |
| Feel-good bursts / reward banner | Not ported (text-only heading lines on cards as listed in 1.1) |

### 1.4 Declared overrides and fork text

Existing, unchanged: `visits/text.js` `WEB_OVERRIDES` (2 `story_picker.gd`, 1 `power_story.gd`, 8 `main.gd`), `characters.js` `CHARACTER_WEB_OVERRIDES` (13), `story.js` `WEB_OVERRIDES`, `hosted-text.js`, `rhythm.js`, `ending/text.js` overrides.

Proposed additions (each drift-tested by the existing test that owns its table):
1. `visits/text.js` `WEB_OVERRIDES['main.gd']`: the ten surprise labels `"[*] … (Tap / Shift+D)"` → `"[*] … (Tap)"` (only if WP2d draws the labels, decision D3). The existing test "web overrides only drop 3D key hints" accepts them as written.
2. `characters.js` `CHARACTER_WEB_OVERRIDES` (WP3c, decision D4): the nine lines whose 2D wording currently cuts a surprise clause regain the clause; only "press Shift+D" becomes "choose Spot Surprise" and "(Shift+D)" is dropped. Proposed values are in WP3c.
3. New declared fork text `VISITS_FORK_TEXT` in `browser-next/visits-kit.js` (drift test: none of its values is a Godot literal; every key is used): `back` "Back to the block", `nextEra` "Next era", `order` "Order at the counter", `notesEyebrow` "AROUND THE BLOCK · OPTIONAL", `notesTitle` "Neighborhood surprises and stops", `adopted` "The shared save changed, so this visit's side stories started fresh. Your neighborhood surprises are kept.", `loading` "Loading the story's local map data…", `dataError` "The story's local map data could not load. You can keep playing and try again.".
4. `ending/text.js` `FORK_TEXT.restart` (WP3): drop "found only in 3D" (surprises are found in both editions now).
5. `story.js` `FORK_TEXT`: `wander` and `wanderHint` are removed (dead once chapter 6 ports Godot's tail); `nearby` stays.

---

## 2. Work packages

### 2.0 Order and parallelism

```
           ┌── WP1  world, save, objective foundation (pure) ───────────┐
now ───────┼── WP2a visits-kit.js (step 1) ─► visits-ui.js shell ───────┤
           │        └─► WP2b episodes   └─► WP2c world visits ──────────┤
           └── WP2d sprites.js + world.js hook ──────────────────────────┤
                                                                         ▼
Phase 2 polish committed ──────────────────────► WP3 game.js integration ─┐
                                                 WP3c characters.js ──────┤ (parallel, disjoint)
                                                 WP4a harness (after WP2) ┤
                                                                          ▼
                                                 WP4b next-browser 'visits' suite ─► WP5 docs, proof, commit
```

| Package | Starts | Depends on | Runs in parallel with |
|---|---|---|---|
| WP1 | now | nothing (touches no moving or dirty file) | WP2a, WP2d (and WP2b/2c) |
| WP2a | now | nothing for step 1; WP1 only for its runtime assumptions (stubbed in tests) | WP1, WP2d; then WP2b, WP2c |
| WP2b, WP2c | now against 3.10; merge after WP2a step 1 lands | `visits-kit.js` | each other, WP1, WP2d |
| WP2d | now | nothing (scene shape 3.8) | everything in WP1/WP2 |
| WP3 | after the Phase 2 polish is committed and WP1, WP2a-d are merged | all of the above | WP3c, WP4a |
| WP3c | after the Phase 2 polish is committed | WP1 (`story.js` goal fields) | WP3, WP4a |
| WP4a | after WP2a-d | WP2 | WP3, WP3c |
| WP4b | after WP3 and WP3c | everything | nothing |
| WP5 | after WP4b | everything | nothing |

### 2.1 Verification log (what the scratch runs showed)

Scratch copy: `browser-next/`, `tests/`, `scripts/`, `public/`, `package.json`, `godot/*.gd`, `godot/data`, `godot/tests` copied to the scratchpad; `node --test tests/next-*.test.mjs`.
- Baseline (working tree as is): 257 tests, 257 pass.
- New bounds in `core.js` and the clamp in `camera.js` (exactly the WP1 text below): 255 pass, 2 fail:
  - `tests/next-visits.test.mjs` "Positions: the conversion formula matches core.js and Godot anchors" (the `assert.deepEqual(P.ROUTE_BOUNDS, core.BOUNDS, …)` assertion).
  - `tests/next-visits.test.mjs` "Positions: every target is inside the proposed bounds and walkable, and routes from the start" (the `outsideToday` list becomes `[]`).
  - "Positions: targets inside today's bounds also route with core.js findPath unchanged" passes vacuously (every target is now walkable); its premise is obsolete and it is rewritten.
  - The patched `core.walkable` agrees with `positions.proposedWalkable` on all 89,838 points of a 7 px grid over x −3000…900, y −820…300; `core.EDDY_WEST` equals `positions.EDDY_WEST` exactly; every one of the 34 `walkTargets()` routes.
- `surprises` field prototype (WP1 godot-save/core text below): additionally fails `tests/next-core.test.mjs` "combining brings back the neighborhood surprises and mural scenes in this tab's own write base" (the two assertions after "Scenes the stored save has are kept…": the stored `7` now becomes `['hidden_mural_145','jeffrey_record']`, and the "without a write base" length becomes 3). Adding `{type:'surprise'}` to the reducer random walk passed all 60×900 + 4×8×400 steps once the walk's "Godot-only fields survive" check drops `discovered_surprises`.
- `story.js` explore-tail prototype: additionally fails three tests in `tests/next-story.test.mjs`: "chapterLine is wide by default and short below NARROW_WIDTH", "after the loans: programme, hosting, civic, film, then the history stops and wandering", "every objective id is reachable and no output names a key hint or a place 2D lacks". `tests/next-characters.test.mjs`, `next-music`, `next-ending` stayed green.
- Routing cost with `WALK_EXTENT` (Node 26, this machine): START→Larkin junction 74 ms; slowest of 34 targets 67 ms; all 34 together 1,328 ms. A per-`ways` cell cache (WeakMap of `x,y` → walkable) gives 347 ms cold and 156 ms warm for all 34 (≈4.6 ms per route), with identical paths.
- Save size: `GODOT_WRITTEN.fullRunScenes` with all ten surprises writes 1,779 bytes (2,317 bytes under the 4,096 budget); all ten sorted ids are 194 bytes of JSON.

### WP1: world, save and objective foundation (pure, Node-tested)

Files:
- `browser-next/core.js` (CRLF)
- `browser-next/camera.js` (CRLF)
- `browser-next/godot-save.js`
- `browser-next/story.js`
- `browser-next/rewards.js`
- `browser-next/visits/text.js` (additive only; the first commit of `browser-next/visits/`)
- `browser-next/visits/power.js` (the one-line `entryTooltip` fix, deliverable 4b)
- `browser-next/data/power_place.json`, `browser-next/data/voting_places.json` (new, byte copies)
- Tests: `tests/next-visits.test.mjs`, `tests/next-core.test.mjs`, `tests/next-save.test.mjs`, `tests/next-story.test.mjs`, new `tests/next-world.test.mjs`. Also commits `tests/gd-literal.mjs` (untracked today).

Deliverables:
1. `core.js` bounds block (replaces `OPENING_BOUNDS` + `BOUNDS` + `walkable`):
   - keep `OPENING_BOUNDS = { left: -300, right: 850, top: -460, bottom: 220 }`;
   - `ROUTE_BOUNDS = { ...OPENING_BOUNDS, left: -2400 }` (today's `BOUNDS`: route overview and zoom-out minimum);
   - `BOUNDS = { left: -2400, right: 850, top: -600, bottom: 280 }` (the walkable window; `world.js` keeps clipping the district layer to it);
   - `WALK_EXTENT = { ...BOUNDS, left: -2980 }`, `VIEW_BOUNDS = { left: -2980, right: 850, top: -800, bottom: 280 }`, `STREET_CORRIDOR = 60`;
   - `EDDY_XZ` copied from `godot/data/power_place.json` `eddy.points` (the six pairs `positions.js` holds), `EDDY_WEST = EDDY_XZ` mapped with the same rotation `project()` uses (core's `angle` and `PIXELS_PER_METRE`; formula of `positions.js` `godotToMap`), `eddyDistance(point)`;
   - `walkable(point, ways)`: inside `BOUNDS` → `streetDistance < STREET_CORRIDOR`; else `x ≥ WALK_EXTENT.left && x < BOUNDS.left && BOUNDS.top ≤ y ≤ BOUNDS.bottom && eddyDistance < STREET_CORRIDOR` (exactly `positions.js` `proposedWalkable`);
   - `findPath` limit from `WALK_EXTENT` (`ceil((right-left)/10+1) * ceil((bottom-top)/10+1)` = 384 × 89 = 34,176), signature unchanged `(start, goal, ways)`;
   - recommended: cache `walkable` per snapped cell in a `WeakMap` keyed by the `ways` array (paths identical, ~8× faster warm).
   - `initialState()` gains `surprises: []`; `applyAction` gains `case 'surprise'` (import `SURPRISE_IDS` from `godot-save.js`): unknown id or already found → `return state`; else `next.surprises = [...next.surprises, action.id].sort()`. Ungated, as Godot (`main.gd:5702-5703`): no `opened` check.
2. `camera.js`: import `ROUTE_BOUNDS, VIEW_BOUNDS, OPENING_BOUNDS`; `this.minimum = fit(ROUTE_BOUNDS)`; `update()` clamps the centre to `VIEW_BOUNDS`; `overview(route)` centres on `ROUTE_BOUNDS` for the route overview; new `lookAt(point, scale = Math.max(this.scale, .85))`: `overviewMode = false; following = false; center = { x, y: point.y - 25 }; scale` clamped to `[minimum, maximum]`; `update()`.
3. `godot-save.js` (no import from `visits/`; see the cycle constraint):
   - `FORK_FIELDS` gains `'surprises'`; `freshState()` gains `surprises: []`; `parseGodotSave` defaults `state.surprises ??= []` beside `visited`, `celesteTalks`, `muralScenes`.
   - new exported `cleanSurprises(raw)`: not an Array → `[]`; keep string entries naming a known id, once, sorted by code point (Godot's load filter `main.gd:13240-13244`, sorted as `build_save_envelope` writes them `12462-12467`).
   - `readEnvelope` returns `surprises: cleanSurprises(get(env, 'discovered_surprises', []))` (lenient, ungated, never a reset reason); the loaded state copies it.
   - `fromState(s, base)` carries `surprises` so `regression()` can compare.
   - new `withSurprises(envelope, base, state)` called from `assemble` after `withScenes`: when the state's set equals `cleanSurprises(base.discovered_surprises)` the stored value stays verbatim (a lenient non-array, duplicates, a newer Godot's ids); otherwise write `discovered_surprises` = sorted, de-duplicated union of the stored value's string entries that are not known ids and `state.surprises`. Forward (a new find) this keeps every stored id; behind (a stale state) it drops known ids and the write is refused by `regression()` (unless `reset`).
   - `regression()` gains `if (!was.surprises.every(id => now.surprises.includes(id))) return 'discovered_surprises';` after the flags loop (forward-only, as Godot only adds). `lostProgress` therefore offers recovery for lost surprises.
   - `mergeState(c, o)`: first line after `celesteTalks`: `c.surprises` = sorted union of both (ungated, before the `if (!c.opened) return c`).
   - `withGodotOnly(stored, base)` drops its surprise union and returns `copy(stored)` (state now carries the ids; `withScenesFrom` still needs a copy because it mutates `base.mural_scenes`). Known surprise ids now come back from this tab's state, not only its last write.
   - Budget: no new reserve. The fork writes exactly Godot's known sorted ids plus unknown strings Godot drops on its next write (never longer). `GODOT_ALWAYS.discovered_surprises: []` keeps reserving the key for a save that lacks it; the `cleaned` term keeps covering a non-Array value until the fork's first find replaces it. A find on a full save is refused 'full' and stays visit-only, exactly like Godot's `save_godot_state` (`main.gd:12532-12545`) after `discovered_surprises[s_id] = true`.
   - Phase 2 per-slot scenes: unaffected; surprises are a union, scenes stay slot by slot.
4. `story.js`:
   - import `exploreObjective, initialTour` from `./visits/landmarks.js` and `neighborHint` from `./visits/surprises.js`.
   - `nextObjective(state, world)`: when `world.episode` (an episode objective from `picker.activeObjective`, 3.3) is non-null it wins (Godot `current_objective`, `main.gd:6105-6109`) and is adapted to `{ id, text, hint, target, neighbor: null }` with `target = hasTarget && target ? { id: 'episode', kind: 'visit', name: targetName, x, y } : null`.
   - After Black Hawk: `exploreObjective(list(s.surprises), world.tour ?? initialTour(), { player: p, openNeighborId: world.openNeighborId ?? null, lastHinted: world.lastHinted ?? '', compass: compassPhrase })` adapted to `{ id: 'explore', text, hint, target, neighbor: null, surpriseId, tourId, tourAction, speakerHints }` with `target` = `{ id: 'surprise:'+surpriseId | 'tour:'+tourId, kind: 'visit', name: targetName, x, y }` or `null`, and `speakerHints` = `{ bea|celeste|rook|dez|thanh: neighborHint(found, id, {player: p, compass}) }` while surprises remain (each `{hint, lastHinted}` or `null`).
   - `hintFor(goal, speakerId)`: for `explore` with a speaker, `goal.speakerHints?.[speakerId]?.hint ?? goal.hint` (Godot `ask_whats_next`, `main.gd:6420-6440`). `whatsNextLine` follows automatically.
   - `FORK_TEXT` keeps only `nearby`.
4b. `visits/power.js` `entryTooltip()`: return `web('power_story.gd', T.setup.storyTip)` (one-line bug fix: today it returns "Neighborhood Stories: resume F8; switch story visits Shift F8"). Test change: add `assert.equal(power.entryTooltip(), 'Neighborhood Stories')` to `tests/next-visits.test.mjs` "Power Story: Larkin 2017 goal, distances, refusals and map"; no existing assertion changes.
5. `rewards.js`: `progressCues` gains, after the `after === before` guard, `type === 'surprise'` with the id newly in `after.surprises` → `cue(after.surprises.length >= 10 ? 'surprise_finale' : 'surprise_discovery', action.id)` (Godot `main.gd:5725`). New `VISIT_CUES = ['museum_portal', 'boeddeker_park', 'so_what_egg', 'eatery_order', 'tour_complete']` and `visitCue(id, reason)` → `cue(id, reason)` for those ids, `null` otherwise.
6. `visits/text.js` additive entries in `GODOT_TEXT['main.gd']` (each function key in Godot source order, values in source order):
   - `build_story_card`: `before` "Before These Streets", `beforeName` "Optional opening: Before These Streets" (`main.gd:7361-7362`).
   - `apply_hub_guidance`: `suggested` "Suggested next step", `locked` "Unlocks later", `joiner` ". ", `meal` "Optional shared meal with fictional neighbors; preparation and invitations last for this visit." (`7302-7304`).
   - `update_walk_control`: `power` "Power Story", `powerTip` "Resume the relay adventure or End story to return to your afternoon.", `dogs` "Dog search", `dogsTip` "Resume owner notes and your chosen lead. End search returns to your afternoon.", `lantern` "Parade", `lanternTip` "Resume the costume makers and lantern march.", `election` "Election map", `electionTip` "Resume your historical polling-list map walk." (`13996-14010`).
   - `make_ui`: `meal` "Cook & Share" (`16047`), `beforeRevisit` "Before These Streets" (`16187`).
   - `build_street_life_decor`: `soWhatAwning` "361 Turk · 'So What' Awning" (`4105`), `soWhatFloor` "145 Leavenworth · 8th Floor ('So What')" (`4164`), `museum` "Tenderloin Museum & Info Hub · 398 Eddy (Cadillac Hotel)" (`4243`), `portal` "Living Archive Time-Portal · 1961 / 1966 / 1907" (`4245`), `eatery` "%s (fictional)" (`4283`).
   - `build_boeddeker_park`: `label` "Boeddeker Park · 240 Eddy St" (`4579`).
   - `build_eatery_counters`: `menu` "Today: %s" (`5270`).
   - `build_neighborhood_surprises`: the ten labels in id order (`5387`, `5400`, `5418`, `5465`, `5503`, `5533`, `5548`, `5564`, `5577`, `5615`) plus their ten `WEB_OVERRIDES` (only if D3 keeps labels).
   - `conversation_actions`: add `museum` "Visit the Museum" and `eateries` "Visit Eateries" after the existing `spot` (source order 6555, 6557, 6585).
   This is the one edit to a pure module; it is unavoidable because the UI may not hand-type Godot text. No test changes: "every copied template occurs, in order, among its Godot function literals" and "web overrides only drop 3D key hints" cover the additions.
7. Data: `browser-next/data/power_place.json` and `voting_places.json` are byte copies of `godot/data/*` (both LF, 176 and 572 lines).

Tests (WP1):
- `tests/next-visits.test.mjs`:
  - "Positions: the conversion formula…": replace the `P.ROUTE_BOUNDS, core.BOUNDS` assertion with deep-equality of `P.OPENING_BOUNDS/ROUTE_BOUNDS/BOUNDS/WALK_EXTENT/VIEW_BOUNDS/STREET_CORRIDOR/EDDY_XZ` with the `core.js` exports, and `core.EDDY_WEST` within 1e-9 of `P.EDDY_WEST`.
  - "Positions: every target is inside…": `outsideToday` must be `[]`; add the grid agreement `core.walkable === P.proposedWalkable` over a 7 px grid of `VIEW_BOUNDS`.
  - "Positions: targets inside today's bounds also route…": rename "every target routes with core.js findPath, on the same path as proposedFindPath"; keep `core.findPath.length === 3`.
  - "data copied into positions.js equals godot/data": replace the sha256 length placeholder with byte equality of `browser-next/data/power_place.json` and `voting_places.json` against `godot/data/`.
- `tests/next-core.test.mjs`: `randomAction` gains `{ type: 'surprise', id: pick([...SURPRISE_IDS, 'nope']) }`; the walk's "Godot-only fields survive" compares `mural_scenes, district_boundary_visible, active_motif` and asserts `discovered_surprises` known ids ⊇ the base's. The combine test's last two surprise assertions expect `['hidden_mural_145', 'jeffrey_record']` (this tab's state carries them now) and length 3. New: the surprise action (unknown id unchanged, repeat returns the same object, sorted insert, ungated before opening).
- `tests/next-save.test.mjs`: `surprises` load cases (absent, 'x', `7`, mixed list with duplicates, unknown and non-strings → sorted known); a find writes the sorted union keeping unknown strings and dropping non-strings; no find keeps any stored value verbatim (byte test reuses "Godot-only and unknown keys survive"); a first find on a save without the key writes it; a stale state over a base with more surprises is refused `['regress', 'discovered_surprises']` and allowed with `reset: true`; `lostProgress` reports `discovered_surprises`; the classic-shaped state test also deletes `surprises`; `fullRunScenes` + ten surprises writes ≤ 4,096 with Godot growth; a find on a save padded to the budget is refused `'full'`; cross-pin: `cleanSurprises(x)` equals `[...visits/surprises.readDiscovered(x)].sort()` for a matrix of inputs.
- `tests/next-story.test.mjs`: the three tests in 2.1 get Godot's explore outputs ("Spot Jeffrey's Lost 1961 Record (0/10 surprises) · Museum"; the tour at 10/10; the done line at 12/12); the "no output names … a place 2D lacks" regex keeps `easel` and the key-hint check only; new: `world.episode` wins over every chapter; explore `speakerHints` for a paired neighbor and the "both found" line; `FORK_TEXT` has only `nearby`.
- New `tests/next-world.test.mjs`: `core.js` bounds and corridor values, cached and uncached `findPath` identical for every `walkTargets()` entry, `Camera` (fork `camera.js`): `minimum === fit(ROUTE_BOUNDS)`, centre clamped to `VIEW_BOUNDS`, `overview(true)` centre, `lookAt` leaves overview and following; `rewards.progressCues` for a first find, the tenth find (finale), a repeat (nothing), `mayor_pomp_event` and `clown_horn_walker` arpeggios through `cueArpeggio`; `visitCue` accepts only `VISIT_CUES` and each id is raised by Godot in its function (`inspect_tenderloin_museum_hub`, `inspect_boeddeker_park`, `inspect_so_what_easter_egg`, `eatery_counter_interact`, `update_landmark_tour_completion`).

Order constraints: none. WP1 must not touch `tests/next-music.test.mjs` (dirty), hence the new test file.

### WP2a: the visits shell (`visits-kit.js`, `visits-ui.js`), Before These Streets, Cook & Share, the picker

Files (all new, LF): `browser-next/visits-kit.js` (step 1, first deliverable), `browser-next/visits-ui.js`, `tests/next-visits-ui.test.mjs`.

Deliverables:
1. `visits-kit.js` exactly per 3.10: the pure helpers (`esc`, `paragraphs`, `dataURI`, `btn`, `figure`, `frameHTML`, `sourceLinesHTML`), `STYLE` and `injectStyle(doc)` (one `<style id="visits-style">`), `VISITS_FORK_TEXT`, `freshSession()`, `createKit(host, session)`. `btn()` is the single renderer of `rapid: true` (`${b.rapid ? ' data-rapid' : ''}`, the exact form the rapid-set test reads as a conduit). The four rapid views in `visits-ui.js` are written one per line as `{ id: 'meal-previous', label: …, name: …, disabled: …, rapid: true }`: a single-quoted literal id and no `{`/`}` (so no `${…}`) between the id and `rapid: true`, which is what that test's site pattern matches. No other view says `rapid`, and no comment line other than a whole-line `//` comment mentions `data-rapid`.
2. `visits-ui.js` `createVisits(host)` implementing 3.3: session ownership, the ctx (3.5), the walk protocol (3.6), entries (3.7), lazy data loading and validation, `cancel`/`close` listeners, `normalize()` (4, lesson 6), the Before These Streets screen, the Cook & Share screen, the picker screen, delegation to `createEpisodeScreens(kit)` (WP2b) and `createWorldVisits(kit)` (WP2c), `scene()` assembly (merging WP2c's world part with the meal/episode parts), `snapshot()`.
3. STYLE: `.visits` grid layout like `.ending`; buttons `min-height:44px; min-width:44px`; trays `repeat(auto-fit, minmax(min(100%,140px),1fr))`, two columns at `max-width:360px`; pressed look `.visits [aria-pressed=true] { background:#d5e5ca; border:2px solid #23675c; color:var(--ink); padding:11px 14px }` (equals `tests/next-browser.mjs` `SELECTED`); small text at least 11 px in `#5a685f` or `var(--ink)` on `var(--paper)`; `.visits a.source-link { display:inline-flex; align-items:center; min-height:44px }`; overlays (`.visits-overlay button`) absolutely positioned, transparent, 44×44 minimum, focus ring `#a35e27` as `style.css`.
4. Rendering rules: only `doc.getElementById` and `addEventListener` (the `tests/next-fixtures.mjs` `fakeDialog` stand-in supports nothing else); never `innerHTML` outside `host.show`; never an inline handler; every image is a `data:` URI from a pure module SVG; no `fetch` (only `host.load`).

Tests (`tests/next-visits-ui.test.mjs`, Node, `fakeDialog`): the label-in-name rule of `btn` (name that starts with the label → `aria-label`; otherwise `aria-label` = label and Godot's name in a `visits-desc-<id>` sr-only span referenced by `aria-describedby`); STYLE contrast of every small-text colour against `--paper` ≥ 4.5:1 (colours read from `style.css` as the characters test does); generated HTML has no `\son[a-z]+=`, every `src` starts with `data:`; Before from the startup card returns through `restoreStartupCard` with Godot's close text; Before from notes is not refused; meal: five prepares, share, follow, previous/next, refusals in Godot order; picker: pages, select, refused select restores the owner, follow, keep exploring, Escape = back to stories; a music toggle that resolves after Back draws nothing (holds); a `load()` that resolves after the recovery offer replaced the screen draws nothing; × (`close` event) clears open flags so the next `open()` shows the screen; `reset()` keeps the dialog, `sync({ adopted: true })` closes a held visits screen and reports `{ reset: true, closed: true }`; walk protocol with a stub `host.walk` returning `'walking'` then `'blocked'`; `walkEnded()` reopens; `walkCancelled()` is silent; `tick()` raises lantern progress only while the lantern trip travels; "no hand-copied Godot text": `jsStrings(visits-ui.js + visits-kit.js)` ∩ `gdStrings(godot/*.gd)` is limited to structural strings (`''`, `' '`, `'\n'`, `': '`, `'. '`).

Expected red until WP3: `tests/next-press-settle.test.mjs` "the rapid set" (new conduit and sites, 2/WP3). Nothing else.

### WP2b: the four episode screens (`visits-episodes.js`)

Files (new, LF): `browser-next/visits-episodes.js`, `tests/next-visits-episodes.test.mjs`.

Deliverables: `createEpisodeScreens(kit)` per 3.10 rendering dogs, lantern, power, election from `picker.episodeView(stories, id, ctx)`; ids and rules from 1.2 features 3-6; "Other stories" via `kit.readerEntry(prefix)` for dogs, lantern, election; Missing dogs / More stories for power; pads as literal `<button id="power-pad-${i}" data-rapid …>` over the diagram (`left = x/360`, `top = y/240`, `width = 88/360`, `height = 88/240` of the figure); election pins 44×44 CSS px centred on `x/360`, `y/240` and the placed labels below them, clamped into their half as Godot does (`voting_story.gd:350-352`); power map labels at `MAP_LABEL_POINTS`; SVG data URIs cached (dogs by profile, lantern by `costume:lantern`, power diagram by `station:turns:restored`, case map once per `powerPlace`, election by `paperKey`); Music through `kit.bindMusic`; every walk through `kit.startWalk(id, goal, { name: objective targetName, announce, keepCamera: id === 'lantern' || id === 'election' })`; chained controls (`dogs-walk`, `dogs-match`, `lantern-walk`, `lantern-advance`, `power-check`, `election-walk`, `election-record`, `election-make`, `election-share`) through `kit.noRepeat`.

Tests (`tests/next-visits-episodes.test.mjs`, `fakeDialog` + `createKit` with a stub host): every button id renders with the view's disabled state; names follow the label-in-name rule (power tabs, Missing dogs, More stories, pins and Other stories use descriptions); the four pads are literal `data-rapid` tags; the full dogs, lantern (with ticks), power festival and Larkin, election runs drive the pure modules through clicks and stubbed walks; a music toggle after Back draws nothing; the "no hand-copied Godot text" check for this file.

### WP2c: the neighborhood world (`visits-world.js`)

Files (new, LF): `browser-next/visits-world.js`, `tests/next-visits-world.test.mjs`.

Deliverables: `createWorldVisits(kit)` per 3.10:
- objects for hit testing (3.8): `surprise:<id>` at `SURPRISE_SITES` (omitted while `world.camera.overviewMode`, Godot `main.gd:14484`), `museum` at `MUSEUM`, `park` at `PARK_ENTRANCE`, `so_what` at `SO_WHAT_AWNING`, `so_what_floor` at `SO_WHAT_LEAVENWORTH`, `eatery:<i>` at `EATERY_AWNINGS[i]`, `counter:<i>` at `EATERY_COUNTERS[i]` when `tour.counters` includes `i` or the explore objective's `tourId` is `eatery:<i>`; names are Godot titles/labels.
- `interact(object, how)`: surprise → the inspect sequence of 1.2 feature 8 (act first, texts after); museum/park/so_what → `inspectMuseum`/`inspectPark(tour, parkTrees().length)`/`inspectSoWhat`; eatery/counter → `activateEatery(tour, i, { tourId, sparks })`; `tour:<stopId>` (What's Next arrival) → `visitStop(tour, stopId, { treeCount, sparks })`; `episode` → `kit.openResume()`. Chimes on `newStop` (`museum_portal` with `eraTitle`, `boeddeker_park` "Boeddeker Park", `so_what_egg` "So What", `eatery_order` with the eatery id, matching `main.gd:8743`, `4595`, `8678`, `5310`).
- `conversationAction(kind, partner)`: `surprise` → `cycleTarget(guideIdx, found, { target: objective is explore ? -1 : nextIndexForNeighbor(found, partner), objectiveSurpriseId, lastHinted })` then inspect (Godot `6661-6664`); `museum` → `inspectMuseum`; `eateries` → `cycleEatery(tour)`; `landmark_tour` → `visitStop(tour, objective.tourId)`.
- The visit card screen (ids `card-spot`, `card-next-era`, `card-eateries`, `card-order`, `card-tour`, `card-back`; heading, eyebrow, burst line, info lines, memory/docent/host speech quotes), Escape and Back close it (toast-free; the card's status line already said Godot's announcement).
- `parkTrees()`: Godot's 6.5 m grid from the ring's bounding box with the `"park:%d:%d"` jitter (Godot 4 `String.hash()` is, to my knowledge of the engine source, djb2 over the code points: `h = 5381; h = h * 33 + c`, unsigned 32-bit; not verified by a Godot run, so the test pins only the bounds, not Godot's exact points), kept inside the ring with ≥ 2.6 m edge clearance, ≥ 2.6 m from the path and ≥ 5.2 m from the play area `(-146, -112)`, at most 24 (`main.gd:4555-4577`), converted with `godotToMap`; no building-footprint check (5, D5).
- `anchor(id)` for `surprise:<id>` (the site), `eatery:<id>` (the counter), `museum_docent` (`MUSEUM_DOCENT`) with the speaker name (`rec.speaker`, eatery name, the docent).
- `objectiveInputs()` part: `tour`, `lastHinted`; `hinted(id)`; `tick(now)` tour completion: only when `!tour.celebrated`, ten found, the cached stop count is 12, no dialog open and not overview, then `tourCompletion(tour, { foundCount, objectiveId: host.objective().id })` → `host.chime('tour_complete', cue)` and toast `announce`.
- Field notes entries: `#notes-spot`, `#notes-museum`, `#notes-eateries` (3.7) and their open behaviour.
- With D9: the `tour-marker` object while the explore objective has a `tourId`.
- `scenePart()` (3.8): surprises, keepsakes, eateries, museum, park, So What, Larkin exterior.

Tests (`tests/next-visits-world.test.mjs`): objects omit surprises in overview; a first find calls `host.act` before any text is built and the card's counts and sparks are the post-act values (stub `act` mutates the stub state; `sparks` reads it); repeat inspection is not new and does not chime; the tenth find heading "10/10 Surprises: …"; memory line only when the paired neighbor's conversation is open, `''` otherwise; museum cycles eras and chimes once per era; park chimes once; eatery guide then order then the first-order burst; tour completion fires once and only on the explore objective; `parkTrees()` count within Godot's bounds (12 to 24, `godot/tests/study_test.gd:1597`), every tree inside the ring; anchors; `conversationAction` mapping; "no hand-copied Godot text".

### WP2d: map sprites and the world layer hook (`sprites.js`, `world.js`)

Files: `browser-next/sprites.js` (new, LF), `browser-next/world.js` (CRLF), `tests/next-sprites.test.mjs` (new).

Deliverables:
1. `world.js` `World`: an optional `callbacks.layers` = `{ objects(world), ground(ctx, world), actors(world), overlay(ctx, world) }`:
   - `objects()` appends `layers.objects?.(this) ?? []` (hover chip, `hit`, `nearest` work unchanged);
   - `draw()` calls `ground` after the litter loop and before the walking path; merges `actors` (`{ y, draw(ctx, world) }`) into the people y-sort (`people.forEach(p => p.draw ? p.draw(c, this) : this.person(p, p.id === 'player'))`); calls `overlay` after the people and before the neighbor name chips. No other change; `BOUNDS` keeps clipping the district layer.
2. `sprites.js` `createSprites({ reducedMotion })` → `{ ground(ctx, world, scene), actors(world, scene), overlay(ctx, world, scene) }` drawing the `VisitsScene` (3.8): park lawn, fence, path, trees and play structure; Larkin exterior `#738492`; museum with three ring arcs at `ringAngle` and the lens colour; So What awning; eatery awnings in `canopy_color` with "%s (fictional)" chips in `label_color` text over a dark chip; open counters with the "Today: %s" chip; surprise markers (accent, ×1.25 found; `darken(0.28)` unfound) and their label chips (D3); keepsake icons beside their neighbors; dishes on the 2D gathering table (table rect from `gathering.js` `gatheringScene(state)`: Long Table slot `x = tableX + 37.5 + slot * 75/6.4`, Open Floor a 2×2 grid on a cloth beside it); relay boxes, battery stand, after-dark overlay (`#101b2b` at 0.45 alpha over `VIEW_BOUNDS`) and warm pools; dogs and owners; lantern visitors, cape and lantern on the player; election folio. Animation only from `world.time` (zero under reduced motion). Chips scale like `world.chip`.

Tests (`tests/next-sprites.test.mjs`): a recording fake `CanvasRenderingContext2D`; an empty scene draws nothing and never throws; each scene part draws in its layer; found vs unfound marker colours; after-dark only for an active festival; no `Date.now()`/`performance` reads (motion from `world.time`). The `world.js` hook is proven in the browser (WP4).

### WP3: `game.js` integration (after the Phase 2 polish is committed)

Files: `browser-next/game.js` (CRLF), `browser-next/ending/text.js` (`FORK_TEXT.restart` only), `package.json`, `tests/next-press-settle.test.mjs`, `tests/next-scaffold.test.mjs`, new `tests/next-wiring.test.mjs`.

Deliverables in `game.js`, by function:
1. Imports: `createVisits` (`./visits-ui.js`), `createSprites` (`./sprites.js`), `visitCue` (`./rewards.js`), `sceneReceipt` is already imported.
2. Module level, after `rhythm`: `const visits = createVisits({...})` with the host of 3.2; `const sprites = createSprites({ reducedMotion: () => settings.reducedMotion })`; `let walkOwner = null` beside `walkTarget`.
3. `resetSession()`: also `return visits.sync({ adopted: true })` (talk turns, the last arrival, the bubble, the chapter notice and now the visits start over together). Its three callers already cover Godot's reset points: `restart()`, `reread()` when a stored save replaces this tab's state without a rebase, and `declineRecovery()`. `reread()` keeps its `closed` from `ending.sync` and also returns `visitsClosed` from that `resetSession()` call; `syncNotice` says `VISITS_FORK_TEXT.adopted` when a visits screen was closed and no ending screen was.
4. `updateUI()`: `visits.sync()` beside `ending.sync(); rhythm.sync();` (sync never calls back into `act` or `updateUI`).
5. `updateAfterglow()`: insert `visits.entryHTML('story')` and `visits.entryHTML('meal')` after the Rhythm Circle button, then `visits.bindEntry('story'); visits.bindEntry('meal')`.
6. `showChapterCard(startup, { announce } = {})`: on the startup card insert `visits.entryHTML('before')` before the `#begin` row, bind it, focus `#begin` explicitly after `show()` (show focuses the first enabled button otherwise), and set `#modal-status` to `announce ?? card.announcement`. `host.restoreStartupCard(text)` calls `showChapterCard(true, { announce: text })`.
7. `journal()`: append a Before These Streets history-entry when `visits.entries().revisit.visible` and the neighborhood entry (`visits.entryHTML('notes')`), bind both.
8. Walking: extract `startWalk(goal, { target, name, announce, owner, keepCamera })` from `goTo`; `goTo` keeps its 35 px "interact now" shortcut, `host.walk` skips it. `stopWalk()`: if `walkOwner === 'visit'` set it to `null` and call `visits.walkCancelled()`. `goTo`/`moveTo` starting a new walk go through `stopWalk()` first. `renderFrame`: when a path ends, `if (walkOwner === 'visit') { walkOwner = null; visits.walkEnded(); } else if (walkTarget) …`; after movement, `visits.tick(ms)`.
9. `restart()`: unchanged (`resetSession(); ending.reset(); rhythm.stop();`): `resetSession()` resets the visits; restart's own `close()` closes the dialog, and `stopWalk()` there cancels a visits trip first.
10. `interact(object, how)`: `if (object.kind === 'visit') return visits.interact(object, how);`. World `click`: `object ? (object.kind === 'visit' ? interact(object, 'tap') : goTo(object)) : moveTo(point)` (taps on visit objects never walk; `settle.tap` already claims their click). World `layers`: `{ objects: w => visits.objects(w), ground: (c, w) => sprites.ground(c, w, visits.scene()), actors: w => sprites.actors(w, visits.scene()), overlay: (c, w) => sprites.overlay(c, w, visits.scene()) }`.
11. `stepSpeech()`: resolve `bubble.id` through `neighborById` or `visits.anchor(bubble.id)`; a non-neighbor anchor uses the fixed lift and its own name for `routeSay`. `host.speak(id, text, name)` = `bubble = showBubble(id, spokenText(text))` plus `routeSay` when no dialog is open.
12. `talkExtras()`: `surprises: state.surprises` (the fork now owns them; `godotExtras` is no longer called).
13. `conversation()`: nothing new once WP3c removes the omissions (if WP3c keeps a `fork` option, pass `fork: false`). `runConversationAction()`: cases `surprise`, `museum`, `eateries`, `landmark_tour` → `visits.conversationAction(kind, partner)`.
14. `askWhatsNext(id)`: for `goal.id === 'explore'` call `visits.hinted(goal.speakerHints?.[id]?.lastHinted ?? '')`, recompute `after = nextObjective(state, storyWorld())`, announce `whatsNextAnnouncement({ ...goal, text: after.text }, id)`, walk to `after.target` (Godot recomputes `obj` before the guide marker, `main.gd:6440`, `6454`, `6461`).
15. `storyWorld()`: `{ player, neighbors, places, ...visits.objectiveInputs(), openNeighborId: openConversation() }`.
16. `hint()`: create `#story-resume` once (in `init`, inserted before `#stop-walking`) and update it from `visits.entries().resume` (label, description, `hidden`).
17. `window.tenderloin`: add `visits: () => visits.snapshot()`.
18. `ending/text.js` `FORK_TEXT.restart`: "…chapters and history discoveries, and the neighborhood surprises." (the browser test only matches `/neighborhood surprises/`).
19. `package.json` `next:check`: add the 12 `browser-next/visits/*.js`, `visits-kit.js`, `visits-ui.js`, `visits-episodes.js`, `visits-world.js`, `sprites.js`, `tests/gd-literal.mjs`, `tests/next-visits-browser.mjs`; scripts gain `"next:visits": "node tests/next-visits-browser.mjs"`.
20. `tests/next-press-settle.test.mjs` "the rapid set": conduits become `['ending/ui.js', 'game.js', 'visits-kit.js']`; replace the row `'not ported: the visit stories'` with `[['visits-ui.js#meal-previous', 'visits-ui.js#meal-next'], ['shared_meal.gd:previous', 'shared_meal.gd:next'], …]`, `[['visits-ui.js#picker-earlier', 'visits-ui.js#picker-later'], ['story_picker.gd:earlier', 'story_picker.gd:later'], …]`, `[['visits-episodes.js#power-pad-${i}'], ['power_story.gd:pad'], …]`; the walk stops skipping `visits/` (its files carry no site). Update the comment above the table.
21. `tests/next-scaffold.test.mjs`: the line-ending walk stops skipping `visits` (all its files are LF); the comment loses "untracked".
22. `tests/next-wiring.test.mjs` (static, reads `game.js` text like `tests/next-characters.test.mjs` does): `resetSession` calls `visits.sync({ adopted: true })`; `restart`, `reread` (non-rebase branch) and `declineRecovery` call `resetSession()`; `updateUI` calls `visits.sync()`; World is constructed with `layers`; `act({ type: 'surprise'` appears only inside `visits-world.js`; `game.js` contains no 24-character prefix of any `VISITS_FORK_TEXT` value or of the `visits/text.js` entry labels it renders (the existing HOSTING_FORK_TEXT pattern).

### WP3c: conversation actions and character overrides (`characters.js`, after the polish)

Files: `browser-next/characters.js`, `tests/next-characters.test.mjs`.

Deliverables:
- `conversationActions`: Godot's list exactly (`main.gd:6519-6591`): the `default:` arm pushes `surprise` while surprises remain, else `{ id: 'landmark_tour', label: g.tourAction }` when `g.tourId`, else `museum`; the "someone else" chain keeps its `surprise`, `eateries` and `museum` arms unconditionally. Remove `FORK_OMITTED_ACTIONS` and the `fork` option.
- `CHARACTER_WEB_OVERRIDES` (decision D4, recommended): keep the four control overrides (Thanh `open[1]` Pack Gear, Celeste `before[1]` "choose a new space", `PANEL_TEXT.detail`, `BUTTON_TEXT.chat`); rewrite the nine surprise lines to keep Godot's surprise words:
  - Bea `open[4]`: `Bea: "If you lose track of the afternoon, tap What's Next?—or choose Spot Surprise to spot the small cutesy dinosaur by Boeddeker Park and the wild woman chef on a magic carpet!"`
  - Bea `before[4]`: `Bea: "Lost? Tap What's Next? any time—or choose Spot Surprise if you hear rumors of a small cutesy dinosaur or a wild woman chef on a magic carpet!"`
  - Dez `open[4]`: `Dez: "Thanks for keeping the tempo easy—and if you spot that random guy on a dirt bike in a Viking helmet or Jeffrey's lost 1961 record by 361 Turk, choose Spot Surprise!"`
  - Dez `before[4]`: `Dez: "The Black Hawk at Turk & Hyde had jazz from 1949 to 1963—and rumor has it Jeffrey's lost 1961 record and a guy on a dirt bike in a Viking helmet are out along Turk!"`
  - Thanh `open[4]`: `Thanh: "When everyone's ready, we pack up together—and don't miss the surprise drag show, bite-sized bags of nachos, fresh donut & bagel, clown horn walker, or the impromptu Mayor Public Event!"`
  - Thanh `before[4]`: `Thanh: "Bea taught me to keep the sidewalk wide enough for walkers, strollers, bite-sized nachos, a good donut or bagel, a guy with a clown horn, and even an impromptu Mayor Public Event!"`
  - Celeste `completed[4]`: `Celeste: "Have you walked over to 145 Leavenworth or Boeddeker Park yet? Choose Spot Surprise to spot the hidden mural alcove and Pip the Tiny Dino!"`
  - Celeste `before[4]`: `Celeste: "When the board is finished, Rook's groove gets another layer—and if you walk over to 145 Leavenworth, look for the hidden mural alcove below the 8th floor!"`
  - Rook `completed[4]`: `Rook: "If you walk out toward 361 Turk or Jones & Turk, choose Spot Surprise—Jeffrey's lost 1961 LP and Honker Barnaby are right in pocket with our groove!"`
- Tests: replace "The 2D-omitted actions are exactly Godot's…" with "every conversation_actions arm is ported, landmark_tour with tour_action"; replace the fork-omission matrix with Godot's lists for explore (surprises left, tour, done); the override test keeps passing (no trigger in the new values).

### WP4: browser proof

WP4a (after WP2): new `tests/next-visits-browser.mjs`, a harness like `tests/next-ending-browser.mjs` (page routed on `http://visits.test/`, stand-in host with real `godot-save.js`/`core.js`, no server): every visits screen at 320, 390 and 1440 px (44 px, no horizontal overflow, no text under ×, pressed look), one pointer gesture as one press, a `[data-rapid]` double press acting twice on `meal-next`, `picker-later`, `power-pad-0`, label-in-name for every button, CSP-relevant checks (no inline handler attributes in the live DOM, every `img.src` a `data:` URI).

WP4b (after WP3, WP3c; `tests/next-browser.mjs` is moving): suite `visits` added to `SUITES` and the receipt. It follows `phase2Suite`'s pattern: the first use of every new visits button is `once(selector)` (one gesture, two presses, the guard at its production window, only the first press reaching the page), `{ rapid: true }` for `#meal-previous`, `#meal-next`, `#picker-earlier`, `#picker-later` and `#power-pad-0` (both presses reach the page); later uses go through `use()`; chained controls also take `held()` (a held Enter); every screen gets `layoutCheck`; every aria-pressed pair gets `pressedLook`. Lift `once`/`use`/`held` to module scope (or copy them) since they are local to `phase2Suite` today. `chapterCheck` computes `nextObjective(snap, WORLD(snap))` without the visit inputs: call it only with no active episode and a fresh tour, or extend `WORLD` with `episode`, `tour` and `lastHinted` from `window.tenderloin.visits()`.
- All widths: Before from the startup card (layout, gust, held Enter on `before-gust` advances one view, Back to start returns with `#begin` focused, Start Exploring still starts music); Before from Field notes (focus returns to `#journal-button`); Cook & Share full run (focus back to `#meal-entry`, held Enter on `meal-prepare` is one step); stories hub → More stories → picker pages (Earlier/Later) → Two Dogs Home → Other stories → Keep exploring; held Escape on the picker closes one screen (Back to stories reopens the episode, nothing more); a held movement key while closing a card does not walk; a surprise near the start (`impromptu_drag_show`) tapped when zoomed in writes `discovered_surprises` (`written()`), plays one chime (`sound().rewardCount`), shows the card and the bubble.
- 390 and 1440: dogs reunion (walks), lantern march with progress in `visits()`, power festival.
- 1440 only (long walks): Larkin (fetch of `/browser-next/data/power_place.json` only, no external request), Election Walk to both sites and home, the finale (seeded nine found), the landmark tour through `talk-landmark-tour` to completion (chime and toast once), the talk action "Spot Surprise" from Thanh showing the memory line.
- Guard context (press-settle on): a double click on `meal-share` acts once; on `meal-next` twice.
- Restart resets `visits()`; a second tab's write (storage event) resets visits and closes an open visits screen with `VISITS_FORK_TEXT.adopted`.
- Cross-edition (non-touch, artifact required): after the fork finds two surprises, Godot at `/godot/` loads with `surprises_found === 2` (`main.gd:11975`), no reset, save unchanged.
- Every step: `clean(log)` (no CSP violation, no external request, no console error).

### WP5: docs and proof

Files: `docs/BROWSER_NEXT.md` (Phase 3 section replaces "Phase 3 modules (not wired yet)"; rule 2 and rule 6 mention surprises as fork-owned and forward-only; rule 8 text; "Not ported yet" loses surprises/tour/museum/eateries and keeps bursts; Known limits gain the deviations of 5; Known debt gains the duplicated bounds/corridor/readDiscovered copies; Layout gains the new files; Tests list the new suites), `docs/BUILD_STATUS.md`, `session_handoff.md`, `README.md` if it lists the fork's features. Proof receipt: `npm test`, `npm run check`, `npm run next:visits`, `npm run next:ending`, `npm run next:browser` results recorded.

---

## 3. Interface contract (`createVisits(host)` ↔ `game.js`)

### 3.1 Construction and lifetime

`game.js` creates one instance at module load, after `rhythm`: `const visits = createVisits(host)`. The instance lives for the page. It injects `#visits-style` once, adds one `cancel` and one `close` listener to `host.modal`, and never touches DOM outside `#modal-body` except through host calls and the entry markup game.js inserts. It never reads or writes `localStorage`, never fetches, never starts audio.

### 3.2 Host members (game.js provides)

| Member | Type | Semantics |
|---|---|---|
| `doc`, `win`, `modal` | `Document`, `Window`, `HTMLDialogElement` | as the ending host |
| `show(html)` | `(string) → void` | game.js `show()`: replaces `#modal-body`, opens the dialog if closed (then sets the return target to the canvas), keeps focus on the same id if present, else the first enabled control |
| `close(target)` | `(string id \| HTMLElement \| undefined) → void` | game.js `close()` after resolving an id; focus returns to `target` (canvas when absent) |
| `returnTo(id)` | `(string) → void` | sets game.js `modalReturnTarget` to `#id` (for × and dialog close paths); call after `show` |
| `status(text)` | `(string) → void` | `#modal-status` |
| `announce(text)` | `(string) → void` | game.js `announce()`: the open dialog's status line, else `#route-status` |
| `toast(text)` | `(string) → void` | game.js `toast()` (moves into the dialog notice while one is open) |
| `settle` | press-settle handle | `settle.tap(event)` for overlay taps that open something |
| `getState()` | `() → state` | the fork state (with `surprises`) |
| `act(action)` | `(action) → boolean` | game.js `act()`; visits dispatches only `{ type: 'surprise', id }` |
| `saveReason()` | `() → '' \| 'not saved' \| 'save full' \| 'storage unavailable'` | game.js `saveReason`, read after a write; the visits UI turns a non-empty reason into Godot's receipt with `ending/mural.js` `sceneReceipt(reason)` ("Visit-only: %s; reload may lose changes.") and shows it on the surprise card only when non-empty (Godot shows it in the HUD only then, `persistence_text`, `main.gd:12523-12530`) |
| `chime(id, reason)` | `(string, string) → void` | plays `visitCue(id, reason)` through `rewards.play(rewardFor([cue], {enabled, unlocked}))`; never throws (wrapped) |
| `walk(goal, opts)` | `({x,y}, {name, announce, keepCamera}) → 'walking' \| 'blocked'` | `stopWalk()` first, then a visits-owned walk (`startWalk`, owner `'visit'`); `'blocked'` when `findPath` is empty (no toast: the episode says Godot's blocked line); otherwise toasts `announce` or the fork's existing goTo line "Walking to {name}. Choose Stop walking to cancel."; follows the player unless `keepCamera` and the camera was not following (Godot `lantern_procession.gd:291-300`, `voting_story.gd:235-241`); never shows or closes a dialog |
| `stopWalk()` | `() → void` | game.js `stopWalk()` (cancels any walk, and a visits walk through `walkCancelled()`) |
| `walking()` | `() → boolean` | `walkPath.length > 0` |
| `player()` | `() → {x, y}` | a copy of `state.player` |
| `lookAt(point)` | `({x,y}) → void` | `world.camera.lookAt(point); cameraUI()` (no-op before the world loads) |
| `speak(id, text, name)` | `(string, string, string) → void` | speech bubble at a visits anchor (3.8) |
| `music` | `{ label(), on(), toggle() → Promise<string> }` | as the ending host (`toggleMusic` returns Godot's music line) |
| `reducedMotion()` | `() → boolean` | the Settings choice |
| `sparks()` | `() → number` | `sparkCount(state, talkExtras())` now |
| `objective()` | `() → goal` | `nextObjective(state, storyWorld())` now |
| `openNeighborId()` | `() → string \| null` | game.js `openConversation()` |
| `cards()` | `() → { startup, story }` | `story`: a chapter card is the open dialog; `startup`: that card has `#begin` |
| `dialogOpen()` | `() → boolean` | `modal.open` |
| `hostingInProgress()` | `() → boolean` | `hosting.order.length > 0 && hosting.results.length < 4` |
| `restoreStartupCard(text)` | `(string) → void` | `showChapterCard(true, { announce: text })` |
| `load(name)` | `('power_place.json' \| 'voting_places.json') → Promise<any>` | same-origin `fetch('./data/' + name)` with a 10 s `AbortController` (as `requestDistrict`), `response.ok` required, parsed JSON; rejects otherwise |

### 3.3 Returned API

| Member | Semantics |
|---|---|
| `open(kind, { from })` → `boolean` | `kind`: `'before'` (from `'startup'` or `'notes'`), `'meal'`, `'story'` (Godot `power_story.open_story`), `'picker'` (Godot `open_picker`; game.js has no direct caller today, the episode screens use it), `'resume'` (the active episode, `open_from_walking`), `'notes-spot' \| 'notes-museum' \| 'notes-eateries'`. Calls `normalize()` first. Returns `false` when refused; the refusal (Godot text) is toasted. |
| `entries()` | `{ before, revisit, story, meal, resume, notes }`, each `{ id, label, description, visible, locked, suggested }` from Godot text (3.7) |
| `entryHTML(kind)` / `bindEntry(kind)` | button markup for game.js containers (afterglow, startup card, Field notes) and its binding |
| `conversationAction(kind, partner)` → `boolean` | `'surprise' \| 'museum' \| 'eateries' \| 'landmark_tour'` |
| `objects(world)` → `VisitObject[]` | 3.8 |
| `interact(object, how)` → `boolean` | tap, E/Enter, or arrival on a visit object (`how`: `'tap' \| 'talk' \| 'walk'`) |
| `scene()` → `VisitsScene` | 3.8, memoized on the session version, state identity and player position |
| `anchor(id)` → `{ x, y, name } \| null` | bubble anchors |
| `objectiveInputs()` → `{ episode, tour, lastHinted }` | `episode` = `picker.activeObjective(stories, ctx)` (or `null`) |
| `hinted(id)` | sets `lastHinted` (Godot `last_hinted_surprise_id`) |
| `walkEnded()` / `walkCancelled()` | the walk protocol (3.6) |
| `tick(now)` | per frame: lantern progress while its trip travels; tour completion check; O(1) otherwise |
| `sync({ adopted = false } = {})` → `{ reset, closed }` | the `ending.sync` shape. Without `adopted` (game.js `updateUI`, after every state change): closes a meal or episode screen whose gate (`state.opened`) no longer holds; never calls `act`, `updateUI` or `host.show`. With `adopted: true` (game.js `resetSession`, i.e. every adoption and restart): starts the session over as Godot's load does (`reset()`), closes a visits screen that holds the dialog (focus to the canvas) and reports `{ reset: true, closed }` |
| `reset()` | fresh session without touching the dialog (Godot `reset_visit` / `reset_session` for all); used by `sync({ adopted: true })` and tests |
| `holds()` → `boolean` | a visits screen owns the dialog |
| `snapshot()` | `{ screen, before, meal, stories, world: { tour, guideIdx, lastHinted }, trip, data: { power_place, voting_places } (status only) }` |

### 3.4 Visit-only state ownership

`visits-ui.js` owns one session (`freshSession()`): `screen` (`null \| 'before' \| 'meal' \| 'picker' \| 'dogs' \| 'lantern' \| 'power' \| 'election' \| 'card'`), `from`, `before` (`initialBefore()`), `meal` (`initialMeal()`), `stories` (`initialStories()`), `world` (`{ tour: initialTour(), guideIdx: -1, lastHinted: '', card: null }`), `trip` (episode id of the visits-owned walk, or `null`), `data` (per file `{ status: 'idle' \| 'loading' \| 'ready' \| 'invalid' \| 'error', value }`), `version` (bumped on every change, for `scene()` memoization). Nothing in it is saved; game.js never reads it except through `snapshot()`. The saved part is `state.surprises`, changed only through `host.act`.

Data loading: one in-flight promise per file; `ready` after `validSource()`; `invalid` (bad bytes) is final for the visit; `error` (network) is retried on the next open of a screen that needs it. While loading, dependent controls are disabled as the pure views already do (`siteValid`, `available`), and the screen shows `VISITS_FORK_TEXT.loading` in its status line; on resolve the screen is redrawn only if it still holds the dialog.

### 3.5 The shared ctx (built on every call by `kit.ctx(extra)`)

`{ opened: state.opened === true, busy, startupCard, storyCard, walking: host.walking(), player: host.player(), musicPlaying: host.music.on(), powerPlace, voting, sites: {}, storyActive: activeEpisode(stories) != null, hostingInProgress: host.hostingInProgress(), sidePanel: !!host.openNeighborId(), ...extra }` where `startupCard`/`storyCard` come from `host.cards()`, `powerPlace`/`voting` are the validated values or `null`, and `busy = host.dialogOpen() && !holds() && !storyCard`, except `busy: false` for an open requested `from: 'notes'` (Field notes is the 2D Info column, not a focused activity). `sites` stays `{}`: every 2D site is static and tested (`tests/next-visits.test.mjs` "story sites clear of their obstacles").

### 3.6 Walk protocol

1. An episode action returns `walk` (and the module has set `open: false, traveling: true`). The UI clears its screen, calls `host.close()` (focus to the canvas), then `host.walk(goal, { name, announce, keepCamera })`, and sets `session.trip = id` only when that returns `'walking'`. `host.walk` calls `stopWalk()` before routing, so a previous visits trip (there should be none: episodes refuse to open while walking) is cancelled first and never the new one. `name` is the episode objective's `targetName`; `announce` is the module's announce (Power's "Walking to …"), else empty.
2. `'blocked'`: `changeEpisode(stories, id, { type: 'blocked', reopen: true }, ctx)`; if the episode is open again its screen is drawn and the message goes to its status line, else it is toasted; `trip = null`.
3. Each frame (`renderFrame` → `tick`): while `trip === 'lantern'`, `{ type: 'tick' }` with the current player.
4. The path ends (game.js `renderFrame`, owner `'visit'`): `walkEnded()` → `{ type: 'arrived' }` with `walking: false`; an open result draws the screen (never over another open dialog: if one is open, the episode stays closed and the message is toasted); `trip = null`.
5. Any stop (`stopWalk()` from Stop walking, a movement key, a new route, `goTo`'s shortcut, restart, the ending or rhythm opening): `walkCancelled()` → `{ type: 'cancel' }`, silent (Godot `stop_walking` → `cancel_intent`, `main.gd:13944-13948`); `trip = null`.

### 3.7 Entry points and DOM ids (none collides with `index.html` or ids built by `game.js`, `ending/ui.js`, `rhythm-ui.js`, `characters.js`)

| Id | Where (inserted by) | Label (source) | Description | Visible |
|---|---|---|---|---|
| `before-entry` | startup card (game.js `showChapterCard`) | `build_story_card.before` | `build_story_card.beforeName` | startup card only |
| `before-revisit` | Field notes (game.js `journal`) | `make_ui.beforeRevisit` | — | `before.idleEntryAvailable(ctx)` with the Field notes dialog counted as neither busy nor a side panel (it is the 2D Info column); so it hides only while a story is active or the player is walking, as Godot's |
| `story-entry` | afterglow (game.js `updateAfterglow`) | `power_story.gd setup.story` "Story" | `web('power_story.gd', power.entryTooltip())` "Neighborhood Stories" | block open |
| `meal-entry` | afterglow | `make_ui.meal` | `apply_hub_guidance` suggested/locked + joiner + meal | block open |
| `story-resume` | `.neighbor-navigation`, before `#stop-walking` (game.js `init`/`hint`) | `update_walk_control` per active episode | its tip | an episode is active and not walking |
| `notes-spot`, `notes-museum`, `notes-eateries` | Field notes neighborhood entry | `surprises.conversationLabel(found)`, `conversation_actions.museum`, `conversation_actions.eateries` | progress line `surprises.progressLabel(found, sparks)` | always (Godot keys are ungated) |

Screen ids: `visits-reader`, `visits-desc-<id>` (sr-only descriptions), and the per-screen ids of 1.2 (`before-*`, `meal-*`, `picker-*`, `dogs-*`, `lantern-*`, `power-*`, `election-*`, `card-*`). Conversation action ids come from game.js `actionDom()`: `talk-surprise`, `talk-museum`, `talk-eateries`, `talk-landmark-tour`.

Focus return: entries pass their own id to `host.returnTo` after `show`; Before from notes returns to `#journal-button` (the revisit button is gone with the journal); map taps and walks return to the canvas; the resume control returns to `#story-resume`.

### 3.8 Data shapes

`VisitObject = { id, kind: 'visit', name, x, y }` with ids `surprise:<id>`, `museum`, `park`, `so_what`, `so_what_floor`, `eatery:<i>`, `counter:<i>`, `tour-marker` (only with D9: at the explore objective's tour target while `tourId` is set; interact = `visitStop`), and the objective-only targets `tour:<stopId>`, `episode`.

`VisitsScene = { surprises: markers(found) + label chips, keepsakes: keepsakes(found), eateries: [{ index, id, name, awning, counter|null, canopy, label, menu }], museum: { x, y, docent, lens: lensColor(tour.era), rings: [ringAngle(tour,0..2)] }, park: { ring: PARK_RING, path: PARK_PATH, entrance, trees, label }, soWhat: { awning, floor, labels }, larkin: { exterior: LARKIN_EXTERIOR, junction }, dishes: worldDishes(meal, { opened, storyActive }), dogs: dogsScene(dogs), lantern: lanternScene(lantern), power: powerScene(power) + fixtures, election: electionScene(election), player }`.

Anchors: `surprise:<id>` → `SURPRISE_SITES[id]`, name `rec.speaker`; `eatery:<id>` → `EATERY_COUNTERS[i]`, name eatery name; `museum_docent` → `MUSEUM_DOCENT`.

### 3.9 Restart, adoption, recovery

- Restart: `resetSession()` → `visits.sync({ adopted: true })`: fresh session; restart closes the dialog itself (Settings holds it, so visits closes nothing).
- Adoption (another tab or edition wrote; "Use the shared save as it is"): `resetSession()` → `visits.sync({ adopted: true })`; an open visits screen closes and `syncNotice` says `VISITS_FORK_TEXT.adopted`.
- Rebase (`persist` rereads before writing a find): no reset; the find is reapplied by `applyAction`.
- Recovery offer shown over a visits screen: the session is kept (this tab keeps its progress until the player chooses); `holds()` turns false, so pending awaits draw nothing; "Keep" combines and keeps the session; "Use the shared save" is an adoption.

### 3.10 Internal kit contract (WP2a → WP2b, WP2c)

`visits-kit.js` exports pure helpers and `createKit(host, session)`:
- `esc(text)`, `paragraphs(text)`, `dataURI(svg)`, `figure({ src, alt, overlay })`, `sourceLinesHTML(lines)`.
- `btn({ id, label, name, description, title, pressed, disabled, primary, rapid })`: `\n` in labels becomes `<br>`; the accessible-name rule of WP2a tests; `aria-pressed` only when `pressed` is defined; `rapid: true` renders `data-rapid` (the only conduit).
- `frameHTML({ kind, credit, title, headingEntry, picture, reader, tray, extra })` → `<section class="visits" data-visits="kind"><p class="eyebrow visits-credit">credit</p><h2 id="modal-title" tabindex="-1">title</h2>headingEntry…<div id="visits-reader" class="visits-reader" tabindex="0" role="region" aria-label="Story text">…</div>…tray…</section>` (the eyebrow first keeps text clear of ×, `style.css` `#modal-body > section > .eyebrow:first-child`).
- `createKit(host, session)` → `kit = { host, session, $, bind(id, fn), on(id, type, fn), focus(id), show(kind, html), holds(kind), leave(text, returnTarget), say(text), ctx(extra), musicButton(prefix), bindMusic(prefix, rerender), startWalk(id, goal, opts), readerEntry(prefix), bindReaderEntry(prefix), openPicker(), openResume(), data(name), ensureData(names, onReady), sparks(), objective(), noRepeat(ids), bump() }`.
  - `say(text)`: a visits screen holds the dialog → `host.status(text)`; else `host.toast(text)`.
  - `bindMusic(prefix, rerender)`: `const kind = session.screen; let said = ''; try { said = await host.music.toggle(); } catch {} if (!holds(kind)) return; rerender(); focus(prefix + '-music'); say(said);`.
- `visits-episodes.js` exports `createEpisodeScreens(kit)` → `{ render(id, { announce } = {}), cancel(id), silentClose(id) }`.
- `visits-world.js` exports `createWorldVisits(kit)` → `{ objects(world), interact(object, how), conversationAction(kind, partner), openNotes(kind), cancel(), silentClose(), scenePart(), anchor(id), parkTrees(), objectiveInputs(), hinted(id), tick(now), reset(), snapshot(), notesHTML(), bindNotes() }`.

### 3.11 Adapters over awkward pure-module APIs (no pure-module edit)

- Accessible names that do not start with the visible label (`mealView.previous/next.name`, power tabs, `dogs.name`, `more.name`, `pickerView.follow.name`, `readerEntry().name`, election pins, the story card entry): `btn()` keeps the visible label as the name and puts Godot's text in an sr-only description (the Sounds precedent, `#reward-sounds-help`).
- `inspect(found, id, …)` needs the list from before the find and `sparks` from after: the UI captures `before = state.surprises`, calls `act`, then calls `inspect(before, id, { sparks: host.sparks() })`.
- View coordinates in the 360×240 picture space (`PAD_CELLS`, `pins`, `mapLabels`) become percentages of the figure.
- SVG builders that do not cache (`dogs.illustration`, `lantern.artwork`, `power.diagram`, `power.mapSVG`, `election.paperSVG`): the UI caches data URIs by Godot's own keys.
- `meal.worldDishes().slot` is Godot table metres: `sprites.js` maps it onto the 2D table rect.
- `landmarks.inspectPark(tour, treeCount)`: `treeCount = parkTrees().length` from `visits-world.js`.
- `godot-save.js` cannot import `readDiscovered` (cycle): its own `cleanSurprises`, cross-pinned by a test.
- `core.js` cannot import `positions.js` (cycle): `EDDY_XZ` copied and pinned against both `positions.js` and `godot/data/power_place.json`.

---

## 4. Lessons that must be designed in

| # | Phase 2 defect | Phase 3 design rule | Where | Proof |
|---|---|---|---|---|
| 1 | A refused AudioContext or a throw aborted an action | The saved change is `host.act()` first; chimes (`host.chime`, wrapped), camera (`lookAt`), bubbles and the card come after and are each wrapped so a throw cannot undo or block the find. `RewardPlayer.play` already never throws. | visits-world `interact`; game.js `chime` | WP2c test with a throwing `chime`/`lookAt` stub: the find is in state, the card shows |
| 2 | Awaits redrew over another screen | Every await (`music.toggle`, `host.load`) re-checks `holds(kind)` before drawing; walks are not awaited (callbacks), and `walkEnded` never draws over another open dialog | kit `bindMusic`, `ensureData`; shell `walkEnded` | WP2a/WP2b tests: Back during toggle, recovery offer during load |
| 3 | The orbit tick ran under a replacing screen | Visits screens run no rAF loop. The only per-frame work is `visits.tick()` from `renderFrame`, which advances the lantern only while its trip travels (walking itself pauses while any dialog is open) and checks tour completion only with no dialog and no overview | shell `tick` | WP2a tick test; WP4 recovery over a march |
| 4 | Receipts built before the write | Nothing in a card is computed before `act()` returns: counts, sparks, keepsakes and the receipt (`sceneReceipt(host.saveReason())`, shown only when the reason is non-empty) are read after it | visits-world | WP2c post-act test |
| 5 | Session state survived a restart or an adopted save | `resetSession()` calls `visits.sync({ adopted: true })`; it runs on restart and on every adoption, never on a rebase | game.js | WP3 wiring test; WP4 restart/adoption steps |
| 6 | (new) A screen replaced without a `close` event leaves module `open` flags set, and `openEpisode` then returns without drawing | `normalize()` at the start of every entry: when no visits screen holds the dialog, clear every module `open` flag silently (`announce: false`); the `close` listener does the same for × | shell | WP2a × and replace tests |
| 7 | Save budget | Only `discovered_surprises` is new persisted data; written as Godot writes it; budget unchanged; full → visit-only | WP1 godot-save | WP1 budget tests |
| 8 | Hostile stored values | `cleanSurprises` (lenient, never a reset); non-arrays and unknown ids kept verbatim until a find; `validSource` for both JSON files; non-finite player positions never reach `findPath` (existing `move` guard) | WP1, WP2a | WP1 save tests; WP2a invalid JSON test |
| 9 | CSP | No inline script or handler; `<style>` injection is allowed (`style-src 'unsafe-inline'`); images only `data:`; fetch only `./data/*.json` same-origin; source links are links (never fetched, `rel="noreferrer"`) | all UI files | WP2a HTML scan; WP4 `clean(log)` |
| 10 | Press-settle | `data-rapid` only on Godot's rapid buttons (`meal-previous/next`, `picker-earlier/later`, `power-pad-*`); overlay pads and pins are buttons, so the guard sees them; map taps that open a card claim their click through `settle.tap` (the card opens synchronously in the tap handler) | WP2a/b; game.js World callbacks | `tests/next-press-settle.test.mjs`; WP4 guard steps |
| 11 | Keyboard | Held repeats never press (global Enter rule plus `kit.noRepeat` for chained controls); held Escape closes one screen (capture rule) and the visits `cancel` handler runs exactly one Godot action; a held movement key never walks after a card closes (`modal` `close` → `keys.clear()`) | kit, shell | WP4 held-key steps |
| 12 | Label in name, pressed look, contrast, focus return, 44 px, reduced motion | `btn()` rule (3.11); STYLE pressed look equals `SELECTED`; small text ≥ 11 px at ≥ 4.5:1; `host.returnTo` per entry; 44 px minimum on every control and overlay; sprites animate only from `world.time` | kit, sprites | WP2a contrast test; WP4 layout/pressed/focus checks |
| 13 | Announcements | Every line is a pure-module output in Godot's words, through `kit.say`/`host.announce`/`host.toast`; music lines said last after a redraw | kit | WP2 tests assert Godot strings |
| 14 | Drift | All copied text lives in `visits/text.js` (drift-tested) or a declared table; the UI files and `game.js` hand-type none (scan tests in WP2 and WP3) | WP1 text, WP2, WP3 | tests listed |

---

## 5. Risks and open decisions

Decisions (recommendation first):
- D1. **Visit card dialog vs Godot's non-modal Info panel.** Godot inspects without interrupting play and shows text in the Info column. 2D has no Info column; a dialog is the only place for the line, sub and credit. Recommend the card (modal, closes with Back/Escape, camera already moved behind it). Alternative: toast + bubble only, which loses the summary and keepsake text.
- D2. **Movement keys during a story walk.** Godot keeps the trip while WASD steers (`main.gd:14359-14377`); the fork stops every walk on a movement key. Recommend keeping the fork rule and treating it as Stop Walking (cancel intent); the lantern march is a 1-second auto-walk, so keyboard progress is not needed. Declare it.
- D3. **Surprise labels on the map.** Godot draws ten always-on labels with "(Tap / Shift+D)". Recommend drawing them as chips at the neighbor-name zoom threshold with the declared override "(Tap)". Alternative: hover chips with the title only (less clutter, less parity).
- D4. **Character lines that cut surprise clauses.** Recommend restoring the clauses (WP3c values). Alternative: keep today's shortened lines (no behaviour risk, less parity).
- D5. **Park tree count.** Godot's count depends on building footprints the fork does not have. Recommend Godot's grid and jitter without footprints and printing the 2D count (Godot's own sentence says the trees are stylized). The number may differ from Godot's.
- D6. **Before These Streets source URLs.** Godot shows them as plain reader text. Recommend links with `rel="noreferrer"` (the fork's history notes convention; `sourceLines()` was written for it). Alternative: plain text for strict parity.
- D7. **Static Eddy corridor.** Godot admits the corridor only after `power_place.json` validates; 2D's corridor is static `core.js` data. Recommend static (it is real OSM Eddy street and already in `streets.osm.json`).
- D8. **Cook & Share locked look.** Godot dims the button (alpha 0.55); dimming fails 4.5:1. Recommend no dimming, the "Unlocks later" description, and the Godot refusal on press.
- D9. **Godot text that names 3D-only controls without a key.** The tour hint ends "Ask a neighbor to show you the stop, or follow the gold marker." (`main.gd:6184`), and the done hint keeps "or switch to evening lights" after the declared override drops "(Shift+L)". `tests/next-visits.test.mjs` "web overrides only drop 3D key hints" forbids overrides that are not about a key. Recommend porting Godot's gold guide marker for the tour stop only (WP2c adds a `tour-marker` object at the explore objective's tour target, a tap on it is `visit_next_landmark` as `main.gd:14443-14448`; WP2d draws it as Godot's gold diamond `#ffd25a`, `main.gd:6215-6233`), which makes the sentence true in 2D, and leaving the evening-lights clause verbatim (a known text limit). Alternative: override both sentences, which needs that test's `assert.match(godot, /F8|Shift/)` relaxed to `/F8|Shift|gold marker|evening lights/`.

Risks:
- R1. **Moving and dirty files.** WP3, WP3c, WP4b, WP5 edit files under active Phase 2 polish (`game.js`, `characters.js`, `tests/next-browser.mjs`, `package.json`, `ending/text.js`, `docs/*`, `tests/next-press-settle.test.mjs`, `tests/next-scaffold.test.mjs`). They must start from the committed polish and re-read the functions named here; line numbers were deliberately not used.
- R2. **Routing cost.** `WALK_EXTENT` raises the BFS cell limit from 22,494 to 34,176; long routes took up to 74 ms in Node and may take several times that on a phone, on the click that starts a walk. Mitigation: the per-`ways` cell cache (paths identical; ≈5 ms warm). WP4 should time a START→Larkin click at 320 px.
- R3. **Adoption wipes the visit.** Godot's load semantics reset a march in progress when another tab writes. Kept for parity with a notice; players may be surprised.
- R4. **Parallel UI packages share a contract.** WP2b/2c depend on `visits-kit.js` and the session shape; a late change there ripples. WP2a step 1 must land first and freeze 3.10.
- R5. **The rapid-set test is red between WP2 and WP3.** Expected and listed in the WP2 acceptance; WP3 fixes the table.
- R6. **Bursts.** Only the surprise and Order Up burst texts appear (on cards); museum, park, So What and tour bursts are chime + announcement only. Phase 2 "Not ported yet" stays true for bursts.
- R7. **Test duration.** Larkin and the Election Walk need 10-20 s walks each; keep them to 1440 px.
- R8. **Duplicated rules.** Bounds, corridor and `readDiscovered` now exist twice (`positions.js`/`core.js`, `surprises.js`/`godot-save.js`), each pinned by a test; record as Known debt.
- R9. **Per-frame work.** While the lantern trip travels, `visits.tick()` makes one `changeEpisode(…, {type:'tick'})` call per frame, which allocates a new lantern object each frame (`lantern.js` `tick` spreads the state); the march lasts about a second at the fork's 160 px/s, so this is negligible. `scene()` is rebuilt whenever the player moves, i.e. every walking frame: keep its static parts (park ring, path and trees, Larkin exterior, awnings, museum, So What) computed once per tour/found version and rebuild only the actor parts (lantern visitors, folio, dogs) per frame; never build SVG or data URIs in `scene()` or `sprites.js`. The tour-completion check runs its `tourState()` only after the cheap gates (3.3 `tick`).

Could not verify:
- Godot's actual Boeddeker tree count on this data and its `String.hash()` jitter; Godot behaviour beyond reading code (no Godot run); browser rendering, timing and focus behaviour (no Playwright run, by instruction); the cross-edition check needs `artifacts/godot-web/index.pck`; the uncommitted Phase 2 polish may still change `game.js` functions this spec names.

---

## 6. Acceptance checklists (for a QA reviewer)

Common to every package: `git diff --stat` shows only the package's files; CRLF files still CRLF and new files LF (`node --test tests/next-scaffold.test.mjs` after WP3; before that, `file <path>`); `node --check` on every new or edited JS file.

WP1
- `node --test tests/next-visits.test.mjs tests/next-core.test.mjs tests/next-save.test.mjs tests/next-story.test.mjs tests/next-world.test.mjs` → all pass.
- `npm test` → all pass.
- `grep -n "visits/" browser-next/core.js browser-next/godot-save.js` → no import.
- `cmp browser-next/data/power_place.json godot/data/power_place.json` and the same for `voting_places.json` → identical.
- `git status --short browser-next/visits` → tracked (committed).

WP2a
- `node --test tests/next-visits-ui.test.mjs` → pass.
- `npm test` → only "the rapid set" in `tests/next-press-settle.test.mjs` fails, naming `visits-kit.js` as a new conduit and `visits-ui.js#meal-previous`, `#meal-next`, `#picker-earlier`, `#picker-later` as new sites.
- `grep -nE "querySelector|innerHTML|fetch\(|localStorage|\son[a-z]+=" browser-next/visits-ui.js browser-next/visits-kit.js` → no hits outside `//` comments.

WP2b
- `node --test tests/next-visits-episodes.test.mjs` → pass; the rapid-set failure additionally names `visits-episodes.js#power-pad-${i}`.

WP2c
- `node --test tests/next-visits-world.test.mjs` → pass.
- `grep -n "type: 'surprise'" browser-next/*.js` → only `visits-world.js` (and `core.js`'s reducer case).

WP2d
- `node --test tests/next-sprites.test.mjs` → pass.
- `git diff browser-next/world.js` → only the `layers` hook (objects, ground, actors, overlay), CRLF kept.

WP3
- `npm test` and `npm run check` → all pass (including the updated rapid set and scaffold).
- `node --test tests/next-wiring.test.mjs` → pass.
- `node --input-type=module -e "await import('./browser-next/visits-ui.js'); await import('./browser-next/sprites.js'); console.log('ok')"` → prints `ok` (nothing touches the DOM at import; `createVisits` runs only from `game.js`).

WP3c
- `node --test tests/next-characters.test.mjs` → pass; `grep -n FORK_OMITTED_ACTIONS browser-next tests -r` → none.

WP4
- `npm run next:visits` → every check `ok` at 320, 390, 1440.
- `NEXT_BROWSER_SUITES=visits npm run next:browser` → pass; the receipt lists `visits` and three widths; `clean(log)` held for every page.
- Full `npm run next:browser` → all suites pass.

WP5
- `docs/BROWSER_NEXT.md` has no "not wired yet" section; rule 6 names surprises; "Not ported yet" no longer lists surprises, tour, museum or eateries; the proof section lists the new suites and the receipt numbers.
