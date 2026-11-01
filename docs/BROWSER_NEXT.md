# Browser Next: the 2D fork

The creator's decisions of October 31, 2026:
- A 2D fork ports the Godot story into a 2D edition. It lives in `browser-next/`, beside the frozen classic `public/` (0.12.0, served at `/browser/`).
- It is published on GitHub Pages at `/browser-next/`.
- It shares Godot's save format and key, `tenderloin-redux.godot.save.v1`, so a player can move between the 2D and 3D editions on the same site.
- It uses Godot's meet-five-neighbors opening.
- It copies story text from Godot, and a Node test fails when the copy drifts.

Classic stays frozen:
- No file under `public/` changes.
- `scripts/build-fingerprint.mjs` does not change.
- The package `version` stays `0.12.0`, and classic's `/__build` keeps reporting `{version: '0.12.0', fingerprint: '2a9641a8…f84567'}`.
- The fork never writes classic's `tenderloin-redux.save.v1` or `tenderloin-redux.settings.v1`. Its sound, motion and experiment preferences use its own key, `tenderloin-redux.browser-next.settings.v1`.

## Layout

- `browser-next/`: a copy of `public/` without the 4.2 MB of provenance OSM XML. It adds:
  - `version.js`, the fork's own version;
  - `godot-save.js`, which reads and writes the shared save;
  - `story.js`, with chapters and the Next objective;
  - `press-settle.js`, the one-gesture guard.
- Phase 2 adds:
  - `sketch-core.js`, `sketch-worklet.js` and `sketch-player.js`, Godot's music sketch, which `audio.js` plays;
  - `rewards.js`, the reward chimes;
  - `rhythm.js` and `rhythm-ui.js`, the Rhythm Circle;
  - `characters.js` and `bubble.js`, the neighbors' conversations and the speech bubble;
  - `hosted-text.js`, Bea's invitation, Thanh's seats, the loan homecoming and the hosting completion line;
  - `ending/`, the ending chain: `rules.js`, `text.js`, `art.js`, `visit.js`, a view module per stage (`hosted.js`, `gather-again.js`, `screening.js`, `bench.js`, `habitat.js`, `orbital.js`, `mural.js`) and `ui.js`, which draws them.
- Phase 3 adds:
  - `visits/`, twelve pure modules with the side stories' rules and Godot's text (listed under Phase 3);
  - `visits-kit.js`, `visits-ui.js`, `visits-episodes.js` and `visits-world.js`, the side-story screens and the neighborhood visits;
  - `sprites.js`, their map sprites, drawn through `world.js`'s `layers` hook;
  - `data/power_place.json` and `data/voting_places.json`, byte copies of `godot/data/`, fetched only when a story needs them.
- `browser-next/index.html` opens its `<head>` with a Content-Security-Policy meta: `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
  - Scripts, modules and the sketch worklet load only from the fork, never inline or through eval.
  - Inline styles stay allowed: the dialogs draw style attributes and `<style>` blocks.
  - `data:` images are the SVG illustrations, and `blob:` media is Load Local Track.
  - A meta policy cannot set `frame-ancestors`.
- `scripts/build-fingerprint-next.mjs`: hashes `browser-next/`. `scripts/serve.mjs` serves the fork at `/browser-next/` (a bare `/browser-next` gets a 302 to the trailing slash) and its build info at `/browser-next/__build`. The classic routes are unchanged.
- Tests: `tests/next-*.test.mjs` run under `npm test`, and `npm run next:check` (chained onto `npm run check`) checks the fork's syntax, every Phase 3 module and the visits harness included. Three browser runners run locally:
  - `tests/next-browser.mjs` (`npm run next:browser`) has ten suites: `journey`, `guard`, `ending`, `phase2`, `visits`, `tabs`, `restart`, `seeded`, `music` and `characters`.
  - `tests/next-ending-browser.mjs` (`npm run next:ending`) checks `ending/ui.js` on a harness page, with no server.
  - `tests/next-visits-browser.mjs` (`npm run next:visits`) checks the side-story screens and their map sprites on a harness page, with no server.
  - Fixtures stay under `tests/`, never in the published folder.

## The shared save

Godot reads the save once at startup and has no recovery hold: an invalid core field resets the 3D edition and its next action overwrites the stored save. `godot/main.gd` `build_save_envelope` (around 12457) and `apply_save_envelope` (around 13053) define the format. The fork follows these rules:

1. **Load.** `parseGodotSave(raw)` ports `apply_save_envelope` rule for rule:
   - the required, optional-but-strict and lenient field classes;
   - the opening cascade: `block_opened` holds only with 5 neighbors met, 3 motifs placed and the soundcheck done; the later sections need their own gates.
   - It returns the validated envelope and the fork's state. An invalid save is held: the fork starts fresh in memory and does not write until the player chooses to start over.
2. **Write by read-modify-write.** The fork overwrites only the fields it owns and keeps every other key exactly as it was loaded: Godot-only progress (`district_boundary_visible`) and any key a later Godot adds. Keys that no Godot writes are dropped only when they alone would make a write full, largest first, as Godot's own next write drops them. It writes `mural_scenes` by Godot's rules when the player paints or lifts a scene in Mural Stories, and `discovered_surprises` only when the player finds a new surprise (Phase 3): the sorted union of the found ids and the stored strings that are not known ids, so a later Godot's ids survive. "Keep this tab's progress" (rule 6) and the full-save retry, below, are the exceptions:
   - Keep unions this tab's found surprises with the stored save's like its other progress. It also brings back a newer Godot's surprise ids (strings that are not known ids) that only this tab's write base, the save it last read or wrote, still held, where they fit: never at the cost of a key no Godot writes, or of cleaning the stored save's own values.
   - Mural scenes are decided slot by slot. A slot this tab painted or lifted, judged against the scenes it last read from the shared save, wins over the stored save. A slot it only adopted follows the stored save. When the stored save has no scene that Godot's clean keeps, this tab's last write supplies the slots it left alone.
   - Fork-only data goes in `optional['browser-next']`: furniture for the current layout. The player position, the litter and the side stories' visit stay session-only.
   - The output is canonical JSON: compact, keys sorted recursively.
   - `save_seq` is one more than the stored value.
   - Writes stay within Godot's 4,096-byte UTF-8 budget, with room left for Godot's own next write of the same state: `save_seq` gaining a digit, the keys `build_save_envelope` always writes that an older save lacks, `optional`'s floats, the values Godot cleans on load to longer defaults (`active_motif`, `discovered_surprises`), and a non-taken keepsake's palette, which Godot reloads as the mural palette.
   - A write still full without the keys that no Godot writes is retried once over the save as Godot's own next write would hold it: those keys gone, and `active_motif`, `mural_scenes` and `discovered_surprises` cleaned as Godot's load cleans them (`godot-save.js` `cleanLenient`). So junk in the values Godot cleans can no longer lock the fork out of saving on its own. Over budget even then, nothing is written and a "Visit-only: save full" notice is shown. A write that fits as it is, or once keys no Godot writes are dropped, keeps those values to the byte.
   - A Mural Stories edit is admitted by Godot's own rule (`main.gd` `edit_mural_scene`: refused only when the next save would be over the budget and larger than the current one), sized over the save as Godot holds it once loaded (`godot-save.js` `sceneAdmission`). A paint Godot would refuse gets Godot's own line and changes nothing, instead of going visit-only. The fork's stricter budget then decides between saving and visit-only.
3. **Self-check.** Every envelope is parsed again by the fork's own Godot-rules loader before it is written, including one that dropped keys no Godot writes or was cleaned for the retry. A write that Godot would reset or demote is refused. So is a write that would move Godot's forward-only progress backwards, such as meetings, the opening, found surprises or reading history, from a stale or reset state.
4. **Write only on change.** A write happens only when a reducer returns new state, never while walking or on page hide.
5. **Another tab wrote first.** Before writing, the fork re-reads the key. If the stored string differs from the last one it loaded or wrote, it rebases the action onto the stored save and applies it again on top. If the action no longer changes anything, nothing is written and a notice says the change no longer applies: a toast, or, while a dialog is open, a status line at the top of that dialog. No success message is shown for an action that did not happen. A `storage` event, `pageshow` and becoming visible also re-read the key. A stored save that replaces this tab's state starts the visit's session over, as Godot's load does: talk turns, the last arrival, the speech bubble, a waiting chapter notice and the side stories' visit, whose open screen closes with a notice (Phase 3). An action rebased onto it keeps them.
6. **Progress went back.** When a re-read save holds less forward-only progress than this tab had, the fork does not adopt it silently. A "Some progress went back" dialog offers "Keep this tab's progress", which `combineSaves` writes by Godot's upward-import rules (how far each part got is unioned, found surprises too, a taken photo and returned loans survive, and this tab's records win where both reached the same point), and "Use the shared save as it is", which adopts it as a load does: the session starts over (rule 5), and so do the ending's visit-only copies when the shared save's differ. Until the player chooses, the tab keeps its own progress and writes nothing. Escape or × puts the choice off, and the next action that saves asks again. If Keep cannot be written, the offer stays with the reason. The offer is withdrawn if a later save covers the lost progress again, or if another tab starts over.
7. **Known limit.** A 3D tab that was already open overwrites newer fork progress on its next action, because Godot only reads at startup. Fixing that needs a `godot/` change, which is out of scope. The fork tells the player to reload the other edition after switching, and the dialog above recovers what it can.
8. **Restart** says that it also resets the 3D edition, including the mural scenes both editions paint and the neighborhood surprises both editions find. It also starts the side stories' visit over. "Keep my afternoon" has focus, and repeated Enter keys on "Start fresh" are ignored.
9. **Switching editions.** "Play the 3D edition" (`edition.js`), under the save line and in a Settings row of its own, is a plain link to `../godot/`, the Godot build beside the fork on Pages and on the local server. It opens in the same tab, where the 3D edition starts and reads the shared save; a modifier or middle click keeps the browser's new tab. A click reads the key again first (rule 5), then `swapAction` lets the link go unless leaving could lose progress: with a recovery offer pending (rule 6) the offer comes back and says why, and with a held save (rule 1) a dialog asks first, since the 3D edition would start fresh and replace it with its first change ("Stay here" has the focus and goes back to the link). A save refused as full, or unavailable storage, goes: its receipt already said that change was visit-only. `tests/next-edition.test.mjs` and `next-wiring.test.mjs` check the guard and its wiring; the `journey` suite clicks the link and has Godot read the save, and the `tabs` suite holds the swap for an offer and a held save.

## Phase 1 slice

- **Meet-five opening.** A `meet` action fires on arrival or when the player talks to a neighbor. Talking to Rook is the soundcheck. Ready means 5 met, 3 motifs and the soundcheck. Open sets the layout to the Long Table when none was chosen. The task list and captions follow Godot's.
- **Chapters.** `currentChapter(state)` ports `current_chapter()` over the fork state (Godot fields mapped by `godot-save.js`).
  - The chapter line reads "Chapter N: Title · Next: …" on wide screens and "Ch. N · Next: …" on narrow ones.
  - A chapter card shows on load and whenever the chapter number changes. It waits while a dialog is open.
- **Next.** `nextObjective(state, world)` ports `current_objective()` through the film, then Compton's and Black Hawk.
  - Godot's keyboard hints come out through a declared override map.
  - Since Phase 3, chapter 6 is Godot's explore tail (the next surprise, the landmark tour, then its last line), and an active story episode's objective comes before every chapter's.
- **One-gesture guard.**
  - A capture-phase document listener arms after a pointer-activated click on a button, checkbox, summary or download link.
  - A map tap that opens something under the finger, such as a neighbor's dialog, also arms, and swallows the tap's own click. Blink sends a touch click after `touchend` to whatever is under the finger by then, so without this one tap on Bea also chose the layout button that her dialog put there.
  - Within 450 ms and 32 px (36 px for touch), any further click is swallowed. The exception is a `[data-rapid]` button that is still under the pointer.
  - The clock runs on frame time, capped at 50 ms per frame.
  - Keyboard activation is never gated by the press window, but a held key's repeats never press a control, as Godot's buttons ignore echo events.
  - While a dialog is open, a held Escape closes only that dialog, not the screen under it.
  - A movement key held while a dialog closes does not walk until it is pressed again, like Godot's `release_pending`.
  - A movement key on the startup card closes the card and starts the music, like Godot's `continue_story()`.
  - Tests switch the guard off with `window.__tenderloinPressSettleMs = 0`; the held-key rule stays on.
- **Drift test.** It parses `STORY_CHAPTERS`, `PROGRAMME_TITLES`, `LOAN_TITLES`, `GATHERING_LAYOUT_TITLES` and the objective templates from `godot/main.gd`, and compares them with the fork's copies.

## Phase 2: music, neighbors and the ending

- **Music.** The Godot sketch is now the 2D sketch.
  - `sketch-core.js` ports `advance_music_clock` exactly to the sample at 22,050 Hz.
  - `sketch-worklet.js` plays it as an AudioWorklet, and `sketch-player.js` keeps `MusicSketch`'s old interface for `audio.js`.
  - Stems follow progress as in Godot.
  - Volume defaults to 70% and the slider goes to 100%.
  - The opening card's button starts the music.
  - Reward chimes (`rewards.js`) play on Godot's progress cues with Godot's suppression rules. A Sounds On/Off setting is stored only in the fork's settings key. Godot's tooltip is its description, not only a hover title.
  - The music says Godot's announcements, as `announce_a11y_status` does: "Music playing: 80 BPM Sketch (stems)." or "Music playing: Local: file." and "Music paused." from Music, Rook's Play/Pause Groove and the Music buttons of the Rhythm Circle and the ending; "Switched Rook's Speaker to 80 BPM Synth Sketch (stems)." from Rook's sketch button; "Music volume n%." from his Volume.
  - They go to the open dialog's status line, or with no dialog open to the page's live region. A dialog that redraws after the toggle says the line again, last, as Godot's redraw leaves it.
  - When audio cannot start, the fork shows its toast and announces nothing, because Godot's `start_music_playback` has no failure path: it says "Music playing: …" even on the dummy audio driver.
  - The Load Local Track panel's status line says the playing line itself and is the panel's one live line, so a pause there says only "Music paused." Its Return to synth sketch keeps the panel's own line: Godot calls `use_synth_sketch` only from Rook's sketch button and the U key.
  - Rook's sketch button keeps the music playing, as `use_synth_sketch` does: a playing local track gives way to the sketch, which plays on.
- **Rhythm Circle.** `rhythm.js` and `rhythm-ui.js` port the Play Bar drum, the step clock and the pads. Practice is never saved. In hosting, the beats save as `host-beat` and `host-complete` actions. The hosting dialog's beats summary has no Godot source and is declared fork text in `hosted-text.js`. Back or Escape returns focus to the button that opened the circle.
- **Neighbors.** `characters.js` copies the neighbor lines from `godot/main.gd`; only the declared web overrides below differ. That includes:
  - rotating lines and memory tails;
  - Keep Chatting, What's Next? (which walks to the objective) and context buttons;
  - the Turn n/5 header, story badges, arrival captions and goodbyes;
  - Rook's music panel, in Godot's button order.
  - Keep Chatting, Rook's Volume and the Mural Stories Palette are rapid, as in Godot, so a double press acts twice. A Node test pins every rapid mark on both sides.
  - Bea's Long Table and Open Floor buttons and every pressed choice on an ending screen (hosted cards, screening frames, bench forms, room items and places, Mural Stories scenes) show the hosting choices' selected look, as Godot draws its pressed toggles. On an ending screen the thicker border takes from the padding, so a pressed choice keeps its size. A pressed choice that is locked (a bench form once a support is fitted, a room item in the departure) keeps the look, where Godot draws its disabled style.
  - `bubble.js` draws speech bubbles on the map and mirrors them into the live region.
  - `hosted-text.js` holds Bea's invitation, Thanh's quiet seats, the loan homecoming and the hosting completion line. The hosted afternoon's review and Bea's offer have one port, `ending/hosted.js`, which the hosting dialog's What we shared also reads.
- **Web overrides.** Copied text differs from Godot only through declared tables, each drift-tested: these four, and Phase 3's `WEB_OVERRIDES` (`visits/text.js`):
  - `CHARACTER_WEB_OVERRIDES` (`characters.js`): 11 lines and 2 labels that name Godot's 3D-only keys and controls (Shift+D surprises, T, Shift Motif, Pack Borrowed Gear);
  - `HOSTED_WEB_OVERRIDES` (`hosted-text.js`): 2 hub lines, without the Z key 2D does not bind;
  - `RHYTHM_WEB_OVERRIDES` (`rhythm.js`): 3 entries, the View Circle and street-drag lines, and Play Bar's accessible name, which starts with its visible label and keeps Godot's phrase (WCAG 2.5.3);
  - `ENDING_WEB_OVERRIDES` (`ending/text.js`): 11 lines that name the save import, F5 or Godot storage. The F5 line drops only its key hint.
  - Declared fork text, where Godot has no matching moment: `HOSTING_FORK_TEXT` (`hosted-text.js`) and the two `FORK_TEXT` tables (`story.js`, `ending/text.js`).
- **Ending chain.** `ending/` ports the rest of the ending, all as visit-only steps that save nothing until a step Godot also saves:
  - the hosted review and Bea's offer;
  - Dez's film offer, the screening and the helper workshop;
  - Gather again, the helper bench and the habitat room;
  - the departure, and the orbital commons with its recap and Home now;
  - Chapter 6;
  - Mural Stories with Palette and Music buttons, writing `mural_scenes`.
  - Text is copied verbatim into `ending/text.js`.
  - Once all four parts are hosted, the posted programme also shows Godot's Gather again line.
  - When another tab's or edition's save changes the copies an open ending screen shows, the screen closes and a notice says this visit's ending started fresh (`FORK_TEXT.copiesChanged`).
- **Drift tests.** `tests/next-music.test.mjs`, `next-characters.test.mjs` and `next-ending.test.mjs` parse the Godot sources at test time and fail when a copied line, constant or cue drifts. `next-press-settle.test.mjs` pins the rapid marks on both sides.

## Phase 3: the side stories, surprises and landmarks

Godot's side stories, its ten neighborhood surprises and its landmark tour now play in 2D. Their rules and Godot's text are pure modules in `browser-next/visits/`, drift-tested against the Godot sources (`tests/next-visits.test.mjs`, with `tests/gd-lex.mjs` and `tests/gd-literal.mjs`). New top-level files draw them, and `game.js` wires them in. Only the found surprises are saved; everything else is one visit-only session, as in Godot.

- **Design spec.** `docs/PHASE3_SPEC.md` keeps the Phase 3 wiring spec as the historical design record: code comments cite its sections (spec 3.10, WP2a, risk R9, lesson 6), and where it differs from the code, this section and the code win.
- **Modules.**
  - Stories (`visits/`): `before-streets.js` (Before These Streets), `meal.js` (Cook & Share), `dogs.js` (Two Dogs Home), `lantern.js` (Lantern Procession), `power.js` (Power Story and the Larkin place), `election.js` (Election Walk) and `picker.js` (the stories hub, the picker and the four episodes' visit-only session).
  - World (`visits/`): `surprises.js`, `landmarks.js` (the landmark tour, the museum's Time-Portal, Boeddeker Park, the "So What" awning, six fictional eateries and chapter 6's objective) and `positions.js` (2D positions from Godot's constants).
  - Text (`visits/`): `text.js` holds Godot's text with its `WEB_OVERRIDES`; `format.js` ports GDScript formatting.
  - Screens: `visits-kit.js` (the HTML helpers, `STYLE`, `VISITS_FORK_TEXT`, the visit session and `createKit`), `visits-ui.js` (the shell: the entries, Before These Streets, Cook & Share and the picker), `visits-episodes.js` (the four episodes) and `visits-world.js` (the map objects, the surprises, the landmarks, the tour and the visit card). The map: `sprites.js`.
  - `core.js` and `godot-save.js` never import `visits/`: `positions.js` loads `history.js`, which calls `core.js` `project()` at load.
- **Ways in.**
  - Before These Streets: a button on the startup card above Start Exploring, which keeps the focus. Its accessible name is its label, "Before These Streets"; Godot's accessibility name, "Optional opening: Before These Streets", does not start with that label, so it is the button's description (`visits-ui.js`; the unit tests and the `visits` suite check both). Field notes offers it again while no story visit is active and the player is not walking.
  - Story and Cook & Share, in the afterglow after the Rhythm Circle, while the block is open. Story opens Neighborhood Stories, Power Story's hub, or the active episode it delegates to, as Godot's `open_story` does. Each has Godot's tooltip (Story's without its F8 keys) as its description and title.
  - `#story-resume`, before Stop walking: Godot's walk control while an episode is active and the player is not walking, labelled Power Story, Dog search, Parade or Election map, with Godot's tip.
  - Field notes' "Neighborhood surprises and stops": Godot's progress line and five buttons. Spot Surprise (n/10), Visit the Museum and Visit Eateries stand for Godot's Shift+D, Shift+M and Shift+E. Visit the Park and See 'So What', the labels Godot's landmark tour gives those two visits, are declared 2D controls for Godot's tap on the park's label and Shift+H, so keyboard and touch players reach both without a map tap or the finished tour. Each opens its card in Field notes' place, and Back on the card returns to the Field notes button.
  - Conversations: Godot's full `conversation_actions`, with Spot Surprise, Visit the Museum, Visit Eateries and the landmark tour's next stop (`talk-surprise`, `talk-museum`, `talk-eateries`, `talk-landmark-tour`). `FORK_OMITTED_ACTIONS` is gone. An action the list names twice is one control (Other adaptations).
  - The map: a tap on a surprise beacon (not in an overview), the museum, Boeddeker Park, the "So What" awning or its 8th floor, an eatery's awning or its open counter, or the gold tour marker opens it where it stands and never walks (`settle.tap` claims the tap's click). E/Enter opens the nearest one, as it does a neighbor.
  - What's Next on chapter 6 walks to the next surprise or tour stop and opens it on arrival. An active episode's objective comes before every chapter's, as in Godot's `current_objective`.
- **Screens.** All in the one dialog, framed by `visits-kit.js` `frameHTML`: the credit first (clear of ×), the heading, a `data:` SVG picture from the pure module, the reader (`#visits-reader`), then the controls.
  - The shell (`visits-ui.js`): Before These Streets (three views, Send a gust, Changing shapes and Passing time, Sources, and Back to start or Back to block); Cook & Share (four cooks with five preparations each, serving and placement, Share this dish or Follow this invitation, Keep exploring); the picker, "Your story visits" (two entries a page, Earlier and Later, Follow this invitation, Keep exploring, Back to stories).
  - The episodes (`visits-episodes.js`): Two Dogs Home, the Lantern Procession, Power Story with the Larkin place, and the Election Walk, with Godot's controls in Godot's order, Music: On/Off, and Other stories (in Power: Missing dogs and More stories). Power's four connector pads and the Election Walk's two map pins are buttons over the picture, at least 44 px; Power's case-map labels sit on their points.
    - The pins are named with Godot's "Map pin 1: city address point" and "Map pin 2: city address point". A visible label of one or two characters that are not letters is named by the Godot name that holds it as a whole word (`visits-kit.js` `btn()`), which keeps label in name and lets a screen reader say the pin rather than "1".
    - While Power is active, its relay tab on show is pressed (Other adaptations).
  - The visit card (`visits-world.js`), for an inspected surprise, the museum, the park, So What or an eatery: Godot's heading and eyebrow, a burst line for a new find or a first order, Godot's info lines, a neighbor's memory line or the docent's or host's words, and the "Visit-only: …" receipt when a find was not saved. Its tray has the card's own next step (Spot Surprise, Next era, or Order at the counter with Visit Eateries), the tour's next stop while the tour is the objective, and Back to exploring. Back and Escape close it without a toast: its status line already said Godot's announcement.
  - An inspect saves first and reads after: a find's `host.act({ type: 'surprise', id })`, whose action plays the find's chime, then the camera, the card, the speech bubble at the site and a landmark's visit-only chime. The camera, the bubble and the chime are each wrapped, so a throw neither undoes nor blocks the find. Every count, spark and receipt on the card is read after the save.
  - The card comes before the bubble, so the speaker's line is announced once, in the card's status line: `game.js` `speak()` also says a line in the page's live region only while no dialog is open.
- **Story walks.** An episode's walk closes its screen and walks a route the side stories own (`game.js` `startWalk`, owner `'visit'`). Arriving reopens the screen; a refused route reopens it with Godot's blocked line; any stop (Stop walking, a movement key, a new route, Start fresh, an adopted save or "Use the shared save as it is") cancels the trip without a word, as Godot's `cancel_intent` does. `game.js` `resetSession()` stops a walk the side stories own before it starts the visit over, and `visits.sync()` stops an episode's walk when the episode ends as no longer available, so no story walk outlives its visit or its episode. An arrival never draws over another open dialog: the episode stays closed and its line is a toast. The lantern march and the election walk keep a camera that was not following, as Godot's do. Each frame, `visits.tick` moves the lantern only while its trip travels, then checks the tour's completion.
- **The bigger map** (`core.js`, `camera.js`).
  - `BOUNDS`, the walkable window, now reaches Eddy to the north and 145 Leavenworth to the south: left -2400, right 850, top -600, bottom 280.
  - West of it only the Eddy corridor walks, out to the Larkin junction less 10 m (`WALK_EXTENT`, left -2980), as Godot's `power_place.gd` admits. The corridor is static: `EDDY_XZ` is the `eddy.points` of `godot/data/power_place.json`, projected as `project()` projects (`EDDY_WEST`), and a point within 60 px of it walks (`STREET_CORRIDOR`).
  - `ROUTE_BOUNDS`, the old window, keeps the route overview and the zoom-out minimum. The camera's center is clamped to `VIEW_BOUNDS` (left -2980, right 850, top -800, bottom 280), so the park, Larkin and "So What" can be viewed.
  - `findPath` searches up to the 34,176 cells of `WALK_EXTENT` and caches `walkable()` per grid cell for each streets array, under integer cell keys; the paths are the ones it finds without the cache.
  - `streetDistance` reads each streets array once into a grid of 64 px buckets of the segments that cross them, then measures only the segments near the point; it returns the same distance as a scan of every segment. The paths are byte-identical to the old router's (`tests/next-router.test.mjs`). The stability review measured the first long route at about 15 ms in Node, and the first tap that routes it at 88-90 ms in Chrome at 6x CPU slowdown.
  - `Camera.lookAt(point)` is Godot's inspect view: it leaves the overview and following, centers just above the point and keeps at least the follow scale (0.85).
- **Saved: the found surprises** (`godot-save.js`, `core.js`). `surprises` is a fork-owned field (`FORK_FIELDS`), Godot's `discovered_surprises`.
  - Load: lenient and ungated, never a reset (`cleanSurprises`). A value that is not an Array is none; string entries naming a known id count once, sorted by code point.
  - The `{ type: 'surprise', id }` action adds a known id once and keeps the list sorted, before or after the block opens, as Godot's `inspect_neighborhood_surprise` does. Only `visits-world.js` dispatches it.
  - Write: only on a new find. While this tab holds the ids the stored value holds, that value stays as it is, duplicates and a later Godot's ids included, unless a write would not fit otherwise: then rule 2's retry writes it as Godot's next write would, its known ids sorted. A new find writes the sorted union of the found ids and the stored strings that are not known ids.
  - Forward-only: a write that would drop a found id is refused (rule 3), a re-read save that lost one offers recovery (rule 6), and "Keep this tab's progress" unions both lists, with a later Godot's ids that only this tab's write base held where they fit (rule 2).
  - Budget: unchanged, with no new reserve: Godot's next write of the list is never longer than the fork's write of a find. A find on a full save is refused and stays visit-only, and the card says Godot's "Visit-only: save full; reload may lose changes."
  - Chimes (`rewards.js`): a new find plays `surprise_discovery`, the tenth `surprise_finale`. Godot's visit-only cues, which no saved action raises, play through `visitCue`: the museum's new era, the park and So What once, an eatery's first order and the finished tour.
- **Visit-only, and what starts over.** Everything else lives in one session (`visits-kit.js` `freshSession`): the open screen, Before These Streets, the meal, the picker and the four episodes, the tour, the surprise guide and the last hinted surprise, the visit card, a story walk's trip and the two place files' load status. It is never saved; `window.tenderloin.visits()` shows it to the browser tests.
  - `game.js` `resetSession()` starts it over with the talk turns, the bubble and a waiting chapter notice, through `visits.sync({ adopted: true })`, once it has stopped a walk a side story owns (which cancels the trip without a word): on Start fresh, when a re-read save replaces this tab's state (never on a rebase), and on "Use the shared save as it is". While a recovery offer waits, the session is kept.
  - An open side-story screen then closes and the notice says "The shared save changed, so this visit's side stories started fresh. Your neighborhood surprises are kept." (`VISITS_FORK_TEXT.adopted`), unless another tab cleared the save, which has its own notice.
  - After every state change, `visits.sync()` ends an episode that is no longer available, stopping its walk and trip, and closes Cook & Share once the block is not open, as Godot's `_process` does.
- **Lazy data.** `power_place.json` and `voting_places.json` are byte copies of `godot/data/` in `browser-next/data/`. `game.js` `loadVisitData` fetches one from the fork's own `data/` (10 s, `response.ok`) only when a screen needs it: Power's Larkin tab, the Election Walk, and the picker, whose Election entry needs both.
  - A response over 256 KB is refused (the real files are about 5 and 12 KB): unread when its `Content-Length` says so, unparsed when it does not.
  - Each file is checked first by the fork's own bounds (`visits-kit.js` `inBounds`: every string a screen prints from it is a string, no list is longer than four times the real file's, no coordinate lies over 100 km out), then by Godot's `valid_source` rules (`validSource` in `power.js` and `election.js`). A file that fails either is invalid, final for the visit, so a tampered same-origin file can neither throw nor build a huge picture.
  - A network error or an oversized response is a load error: the screen says the error line below, and the next screen that needs the file tries again.
  - While a file loads, the screen says "Loading the story's local map data…"; when one cannot load, "The story's local map data could not load. You can keep playing and try again." A screen redraws after a load only while it still holds the dialog.
  - Opening Story prefetches the place file quietly when no fetch has started or the last one failed: no loading line and no redraw, so Power's opening line stays. A quiet fetch that fails says nothing; the next screen that needs the file loads it again, out loud.
- **Sprites** (`sprites.js`) draw `visits.scene()` through `world.js`'s optional `layers` hook; without it the World draws as before.
  - `ground`, after the litter and before the walking path: the Larkin place, Boeddeker Park (lawn, path, a fence open at the gate, benches, the play structure and trees), the museum's front, the "So What" awnings, the eateries' awnings and the shared dishes on the 2D gathering table.
  - `actors`, y-sorted with the people, each drawing itself: the beacons, the keepsakes beside their neighbors, the Time-Portal's rings and the docent, open counters with their hosts, the dogs and owners, the lantern visitors, the relay lamps, kits and battery stand, and the player's cape, lantern and election folio.
  - `overlay`, after the people and before the name chips: the festival's after-dark tint (Godot's `#101b2b` at 0.45) with warm pools once all three relays are back, the label chips and the gold tour marker.
  - `objects`, appended to the World's own for `hit()` and `nearest()`.
  - Colors are Godot's, each drift-tested in the Godot function it names (`GODOT_COLORS`). Motion comes only from `world.time` and holds still under reduced motion. `visits-ui.js` rebuilds a scene part only when its own visit state changes, and `sprites.js` builds each part's drawing once.
  - Off-screen work is skipped: each part has a box (all it can paint, its shadow and sway), and a part whose box misses the view draws nothing, while one partly in view draws whole, exactly as before. A chip off the map is not drawn either.
- **Beacon tap points.** A beacon is hit-tested at its foot (its own object), half way up its pole, at its globe (`BEACON_LIFT`, 38 px up) and along its label chip where this frame draws it (`sprites.js` `chipTargets`). Every point but the foot is `tapOnly`: `world.js` `hit()` finds it, `nearest()` (E/Enter and the Nearby hint) never does, so a beacon is still measured from its foot. In an overview no beacon or label is a target. The gold tour marker is one object, at its drawn diamond (`sprites.js` `tourMarkerLift`).
- **Chips** (decision D3). The Label3D labels show from the neighbor-name zoom (`CHIP_ZOOM`, 0.22), laid out in priority order: what the player stands at and the stop under the gold marker, then the beacons' labels, then the landmarks (the museum, the Time-Portal, the park, So What and the eateries' names), then the counters' menus.
  - A chip that would overlap one placed before it moves to the nearest free row above or below. No chip covers a beacon's globe, the player, a neighbor, the docent, a counter's host or `world.js`'s name chips, and a beacon's label stays above its own globe.
  - A landmark or menu chip with no free row near its point is left out of that frame; a beacon's label, or the chip the player stands at, takes the nearest free row further off. A chip that reaches into the visible map is kept inside it.
  - Only the chips that can reach the view are laid out. The layout is made afresh, exactly, when the scene's chips, the zoom, the view (to the whole CSS pixel), the player's 8 map px cell or the tour stop change, and is kept otherwise. So during a slow pan a chip clamped to the map's edge can lag the exact clamp by under 1 CSS px, The player's block is the drawn person grown by the cell size on every side, so a kept layout covers the player nowhere in its cell; the declutter's own 40 px clearance between a beacon label and the player is measured where the player stood when the layout was made. A fresh layout of the same scene and view is always the same.
- **The 2D sidewalk**, a declared adaptation of where sites stand, not of Godot's constants. `world.js` draws a 76 px roadway inside a 116 px sidewalk, so the sites Godot stands on its narrower sidewalk (6.2 and 6.6 m out), the museum (5.4 m) and the fork's relay lamps would land in the 2D roadway.
  - `visits/positions.js` `SIDEWALK_SITES` stands 21 of them 48 px from their street's centerline, on the side they were: the ten beacons, the six counters, the Blue Valve's front, the museum (its docent moves with it) and the three relay lamps (their goals too). The converted Godot points stay as `RAW_*`.
  - `tests/next-visits.test.mjs` recomputes the table, and what it leaves alone, from `data/streets.osm.json`.
  - Left where Godot puts them: the Bowl & Basil, Saffron and Morning Star fronts, which Godot itself puts in its roadway; Open Seat's front, which would stand 7 px from Thanh; Copper Cue's front, already 59 px out; the Larkin battery stand; the dogs' search sites and their owners.
- **Cook & Share's pager.** Previous and Next cook, which Godot marks rapid, sit in a two-column pager under the credit, above the heading, picture and text they change. A picture reserves its box before it decodes, a redraw keeps the dialog's scroll, and after a pointer press the focus moves to the preparation without scrolling. So a fast double press lands on the same button twice, as on Godot's rapid buttons.
- **Keys and the guard.**
  - On the side-story screens, `data-rapid` is only on the buttons Godot marks rapid: `meal-previous`, `meal-next`, `picker-earlier` and `picker-later` (through `visits-kit.js` `btn()`) and Power's `power-pad-*` (literal tags). `tests/next-press-settle.test.mjs` pins both sides.
  - A held Enter never presses a control twice (`press-settle.js`). The chained controls (Walk to lead, Match dog, Walk to assembly or March, Gather or Welcome, Check path, Walk to site, Record site, Make map, Share map, the card's own steps and its next tour stop, and Field notes' five buttons) also ignore a repeated Enter or Space (`kit.noRepeat`).
  - Escape runs the screen's own Godot action (Back to start or Back to block, Keep exploring, Back to stories, an episode's Back, the card's Back), and a held Escape closes one screen only.
  - No new key bindings: Story, the resume control, More stories, Other stories, Spot Surprise, Visit the Museum, Visit Eateries, See 'So What' and the map stand in for Godot's F8, Shift+F8, Shift+D, Shift+M, Shift+E and Shift+H. Shift+L, the evening lights, has none (not ported).
  - Focus goes back to the control a dialog came from, or to the map when that control is hidden (the resume control once its story ended, an afterglow button once the block closed) or disabled (`game.js` `focusReturn`).
  - Only the startup card takes a movement key as Start Exploring; on Before These Streets a movement key does nothing. A movement key held while a screen closes does not walk until it is pressed again.
- **Declared deviations from Godot**, the Phase 3 spec's decisions D1-D9 (`docs/PHASE3_SPEC.md` section 5):
  - D1. A visit card dialog shows what Godot puts in its non-modal Info panel. 2D has no Info column, and a toast and a bubble alone would lose the summary and the keepsake text; the camera has already moved behind the card.
  - D2. A movement key stops a story walk and cancels its trip, as Stop walking does. Godot keeps the trip while WASD steers (`main.gd` `_physics_process` leaves `current_path`), but the fork stops every walk on a movement key, and the lantern march is a short auto-walk.
  - D3. The surprise labels end in "(Tap)": ten `WEB_OVERRIDES` drop " / Shift+D", a key 2D does not bind.
  - D4. The nine neighbor lines whose 2D wording had cut a surprise clause keep it: "press Shift+D" becomes "choose Spot Surprise" and "(Shift+D)" is dropped (`CHARACTER_WEB_OVERRIDES`).
  - D5. Boeddeker Park's trees follow Godot's 6.5 m grid and jitter without its building-footprint checks, which 2D has no data for. The park's line prints 2D's count, 24 (the grid's cap), which may differ from Godot's.
  - D6. Before These Streets' source URLs are links that open in a new tab with `rel="noreferrer"`, the fork's history-note convention; Godot shows them as plain reader text. Nothing is fetched.
  - D7. The Eddy corridor is static `core.js` data, where Godot admits it only once `power_place.json` validates: it is OpenStreetMap's Eddy Street, already in `data/streets.osm.json`.
  - D8. Cook & Share's locked button is not dimmed: Godot's 0.55 alpha would fail 4.5:1 contrast. Its description says "Unlocks later", and a press says Godot's refusal.
  - D9. Godot's gold guide marker is drawn for the landmark tour's stop only, so the tour hint's "follow the gold marker" is true in 2D: a gold `#ffd25a` diamond, hidden within 3.5 m of the player, and a tap on it visits the stop. The tour's last hint keeps "or switch to evening lights" verbatim, a known text limit.
- **Other adaptations.**
  - One route over the static corridor, where Godot walks two legs through Taylor and Eddy; a static Lantern Procession route (`LANTERN_ROUTE`, tested clear), where Godot builds one from clearances at runtime.
  - The Power festival's world lighting is a translucent after-dark tint with glows; 2D has no evening mode.
  - Camera flights and cutaways are `Camera.lookAt`.
  - The connector pads are always at least 44 px, where Godot hides them below 44 px.
  - While Power is active, its relay tab on show is pressed (`aria-pressed`, the kit's selected look), a declared 2D accessibility addition that says which relay the reader, the pads and Check path are about. Godot's relay tabs are plain buttons; the hub's Festival, Larkin 2017 and Place map tabs stay plain.
  - An action Godot's `conversation_actions` names twice is one control, the first kept (`game.js` `uniqueById`), a declared deviation. Godot's list can repeat an action (Rook, Celeste or Thanh in chapter 6 after their loan's return: Spot Surprise for the goal, then again as the someone-else step), and the page would otherwise get two buttons with one id.
- **Text.** Every Godot line the side stories show is a `visits/text.js` copy, with one exception: `visits/surprises.js` types out Godot's 15 surprise memory lines (`memoryLine`, Godot's `neighbor_surprise_memory_line`) and the five neighbor names they are said with (`NAMES`). `tests/next-visits.test.mjs` pins both to `godot/main.gd`: the lines branch by branch, the names to its `neighbors` table. The screen files and `sprites.js` hand-type no Godot text, and `game.js` draws their labels only through the shell (scan tests). Declared tables:
  - `WEB_OVERRIDES` (`visits/text.js`): 2 `story_picker.gd`, 1 `power_story.gd` and 18 `main.gd` entries that drop Godot's key hints (the museum's "press Shift+M again" becomes "choose Next era"), ten of them the surprise labels (D3). Each value is its Godot key with the rows of `KEY_HINT_REWRITES` (`tests/next-visits.test.mjs`) applied, letter for letter;
  - `CHARACTER_WEB_OVERRIDES` keeps its 13 entries, with D4's nine surprise lines;
  - `VISITS_FORK_TEXT` (`visits-kit.js`), declared fork text: the card's "Back to exploring" (the spec's "Back to the block" is `film_screening.gd`'s own label), "Next era", "Order at the counter", Field notes' eyebrow and title, the adopted-save notice and the two data lines;
  - `ending/text.js` `FORK_TEXT.restart` names the neighborhood surprises without "found only in 3D", and `story.js` `FORK_TEXT` keeps only `nearby`.
- **Future work.** Localization into Spanish, Vietnamese, Arabic and Thai is proposed, not started: `docs/I18N_PLAN.md`.

## Not ported, known limits and known debt

- **Not ported yet.**
  - Godot's visual feel-good bursts and reward banner, including the film capture's burst cue and info panel (`main.gd` `film_capture_shot`). Of the side stories' bursts, only a surprise's and an eatery's "Order Up" appear, as text lines on the visit card; the museum, the park, So What and the finished tour have their chime and announcement only.
  - Godot's day and evening lights (Shift+L). 2D has no evening mode, so the tour's last hint still says "or switch to evening lights" (D9).
  - a street tap on the startup card, and movement keys on a later chapter card;
  - the Rhythm Circle's View Circle camera (`rhythm.js`);
  - the Listening Hour's one remembered turn with its neighbor tabs (`civic_listening.gd` refresh); 2D's done Listening Hour shows every turn at once.
- **Known limits.**
  - The Rhythm Circle's step lamp divides the sketch's cumulative frames by Godot's 8,268.75-frame step, exactly as `godot/rhythm_circle.gd` line 228 does, while the sketch plays 8,269-sample steps. After tens of minutes of continuous play the lamp drifts off the audible step. It is kept for parity: a fix would be a deliberate deviation from Godot.
  - Shared dishes are drawn only on the 2D gathering table, so once Thanh's folding table goes home during packing up they are no longer drawn. Godot shows them whenever the block is open, a dish is shared and no story is active (`shared_meal.gd` `update_world`).
  - Larkin Street is not in `data/streets.osm.json`, so the map draws none where the Eddy corridor ends at the Larkin place.
  - Some story props are small at the 2D people's scale: a paper lantern is 5 by 6 map px, the election folio 9 by 6.5 and a shared platter 6 by 4.
  - The park's tree jitter assumes Godot 4's `String.hash()` is djb2 over code points. No Godot run checked it, so the tests pin the park's bounds, not the points.
  - Keyboard layouts: movement keys and E read the typed character (`event.key`), not the physical key (`event.code`). On a layout without Latin letters, such as Arabic or Thai, only the arrow keys walk and only Enter interacts; on AZERTY the W, A, S and D letters walk but sit apart. Godot also reads the physical keys (`is_physical_key_pressed`), and `docs/I18N_PLAN.md` proposes `event.code` (its D13).
  - Map & source notes still title the map "Turk: Taylor to Hyde." and do not mention the Eddy corridor, Boeddeker Park or Larkin.
  - Godot source text defects, which the fork copies verbatim and the drift tests keep, for the creator: "Step %d of5: %s. %s" (`godot/shared_meal.gd` line 233, Cook & Share's step cue), "%d taps in eight slots" (`godot/hosted_afternoon.gd` lines 41 and 42, which reads "1 taps" for one beat) and "Surprise Found: Surprise Impromptu Drag Show!" (the drag show's title, `godot/main.gd` line 300, inside the find's heading "Surprise Found: %s", line 5724). After a fix in `godot/`, the drift tests name the fork's copies to update.
  - `npm run next:browser` is slow: a full run takes about 17 minutes, and its slowest steps are the side stories' long walks, most of them at 1440 px.
- **Known debt.** Recorded, not yet fixed:
  - Constants and rules live in more than one module, each pinned to Godot: `cleanMuralScenes` (`godot-save.js`, `characters.js`), the mural scene ids and slots, `STEM_ORDER`, 22050, 0.375, the bare 8-step count, two exports named `FORK_TEXT` and three `capitalize` helpers.
  - Phase 3 adds pairs, each pinned by a test, because `core.js` and `godot-save.js` cannot import `visits/`: the bounds and the Eddy corridor (`core.js`, `visits/positions.js`), and `cleanSurprises` (`godot-save.js`), which is `visits/surprises.js` `readDiscovered` sorted. `positions.js` also keeps `proposedWalkable` and `proposedFindPath` for its tests, and its comments still call the bounds proposed and `core.js` unchanged.
  - `visits/surprises.js` `writeDiscovered`, used only by a test, is Godot's write rule (known ids only); the fork's own write keeps a later Godot's ids (`godot-save.js` `withSurprises`).
  - More helpers with one job: two exports named `gdf` with different calls (`ending/text.js` takes the values as arguments, `visits/format.js` as one array), a fourth port of Godot's `String.capitalize` (`visits/format.js` `gdCapitalize`, which also splits camelCase and digits), and four `esc` helpers (`game.js`, `ending/ui.js`, `rhythm-ui.js`, `visits-kit.js`).
  - Dead exports: `SKETCH_GAINS`, `RHYTHM_TEXT.stepCuesOff`, `BUBBLE_TEXT.activity` and `.info`, `BUBBLE.pixel` and `.heightM`, `benchAvailable`, `hostedReplies`, `invitationChoice` and `talkingSubline`; from Phase 3, `resetStories` (`visits/picker.js`), `STORY_BADGES` (`visits/surprises.js`), `LARKIN_ADDRESS` and `TAYLOR_EDDY` (`visits/positions.js`).
  - `fmt` (`story.js`) and `fill` (`rhythm.js`) ignore `%%`, while `gdFormat` and both `gdf` handle it; no live template needs it.
  - `RHYTHM_TEXT.saved` is a default receipt the game never reaches: `rhythm-ui.js` always passes the write's own.
  - `visits-ui.js` wraps `power.js` `entryTooltip()`, which already applies its override, in `web()` again.
  - Stale comments: `visits/surprises.js` says `game.js` keeps the surprise guide and the last hint (`visits-world.js` does), and `tests/next-visits-browser.mjs` says `game.js` has yet to wire the screens.
  - `lantern-starLantern` (from `visits/lantern.js`'s `starLantern` view id) is the only camelCase DOM id.
  - `sourceLines()` (`visits/before-streets.js`) is used only by tests: the shell re-splits the reader text for the Sources view (`visits-ui.js`, `readerText(b).split('\n')`).
  - The SVG data-URI prefix is pinned in the three visits files that build it, but it is also written as a template string in `ending/ui.js` (`dataSVG`) and in `game.js`, which the pin does not scan.
  - A few steps in `tests/next-browser.mjs` read the focus once right after a dialog closes instead of polling it. They are deterministic today.

## Proof

- **Unit tests.**
  - Loader parity: Godot-written saves load, and Godot's own rejection cases in `godot/tests/study_test.gd` are rejected.
  - Round-trip: Godot-only fields survive.
  - Budget, chapters and the objective.
  - The guard, on an injected clock.
  - Audio on fake contexts: a refused AudioContext never aborts an action, and overlapping music starts build one node.
  - The Rhythm Circle and the ending on a stand-in dialog: a redraw that waits draws only the screen still shown, a Music button says Godot's music line after its redraw, and a pad's receipt is the write it made.
  - Godot's music announcements for the sketch, a local track, a pause and the switch to the sketch, and the volume line at every step and between steps, rounded as Godot rounds.
  - The hosting dialog never needs a finished view of its own: with no current activity, the ending's hosted view always opens.
  - The rapid marks: every fork mark ports a Godot `set_meta("rapid", true)` Button or is declared, and every Godot one is ported or declared not ported.
  - WCAG contrast of the conversation's badge on every neighbor's tint and of its header on the dialog paper, with the colors read from `style.css`.
  - The Content-Security-Policy meta comes first, with no inline script or handler.
  - Line endings: files copied from classic keep classic's line endings (CRLF for `camera.js`, `core.js`, `game.js`, `world.js`, `index.html`, `style.css` and `data/streets.osm.json`); every other fork file is LF; none is mixed.
  - The classic fingerprint is pinned.
  - The copied data is identical to classic's.
  - The side stories against Godot (`tests/next-visits.test.mjs`): every copied constant, template and override, each story's rules, the positions and their routes, and the sidewalk table recomputed from `data/streets.osm.json`.
    - Each `WEB_OVERRIDES` value must equal its Godot key with the rows of `KEY_HINT_REWRITES` applied, letter for letter; a row no override uses fails, and so does an override no row explains.
    - The 15 memory lines are read from `neighbor_surprise_memory_line` branch by branch and checked for every neighbor and combination of finds, and the speakers' names against Godot's `neighbors` table.
    - The one SVG data-URI prefix is pinned in the three visits files that build it.
  - The kit, the shell, the episode screens and the neighborhood visits on a stand-in dialog (`tests/next-visits-kit.test.mjs`, `next-visits-ui.test.mjs`, `next-visits-episodes.test.mjs`, `next-visits-world.test.mjs`): the entries and focus, the walk protocol, a redraw that waits drawing nothing once its screen is gone, the card built after the find, label in name, no inline handler, `data:` images only and no hand-typed Godot text.
    - Also: the card drawn before the bubble and the chime, Field notes' five buttons (the park and So What cards chiming once), a held Enter or Space never pressing a card's step or its tour stop again, the pins' names, Power's pressed relay tab, an episode that ends stopping its walk, a tampered place file that `valid_source` accepts staying invalid, and every `VISITS_FORK_TEXT` key drawn somewhere (a plain test now).
    - The kit, shell and episode tests' `flush()` waits out a macrotask, not a fixed count of microtasks.
  - The sprites and the `layers` hook on a recording canvas (`next-sprites.test.mjs`): the layer order, Godot's colors, motion only from `world.time`, the chip declutter and `tapOnly`. Only what is on screen draws, each part whole and exactly as before; the chip layout is kept within a whole pixel and the player's 8 px cell and laid out afresh, exactly, when either moves on; only chips that can reach the view are laid out.
  - The wiring in `game.js` (`next-wiring.test.mjs`): who calls `resetSession`, `updateUI`'s `visits.sync()`, the host members, the walk protocol, the beacon tap points with `nearest()` measuring from the foot, and only `visits-world.js` dispatching a find.
    - Also: `resetSession` ending a story walk, with a seeded fuzz of the walk protocol on `game.js`'s own bookkeeping; focus to the map when the control it returns to is hidden or disabled; `host.load` refusing a file over 256 KB; a beacon's line said once; and one control per conversation action id.
  - The router (`next-router.test.mjs`, against a copy of the old code): `streetDistance` and `walkable` equal the scan of every segment, on the real streets and made-up ones, and `findPath` gives byte-identical paths for every `walkTargets()` entry and thousands of random start and goal pairs.
  - The bigger map and the visit cues (`next-world.test.mjs`): the bounds, the corridor from `godot/data/power_place.json`, the same paths with the cell cache, the camera clamp and `lookAt`, `surprise_discovery`, `surprise_finale` and `visitCue`.
  - The found surprises in the save (`next-save.test.mjs`, `next-core.test.mjs`): the lenient load, a write only on a find that keeps a later Godot's ids, the forward-only refusal, the union in Keep, all ten within the budget, a find on a full save staying visit-only, and `cleanSurprises` against `readDiscovered`.
    - The full-save retry (`next-save.test.mjs`): a write full only because of values Godot cleans is retried once with them cleaned, and the retry never changes a write that fits. Keep (`next-core.test.mjs`): a newer Godot's ids from this tab's write base come back only where they fit, never at the cost of a key no Godot writes, and Keep near the budget cleans rather than refuses. Mural Stories (`next-ending.test.mjs`): the admission sizes the save as Godot holds it and agrees with the write over random saves.
  - Chapter 6 and the conversations (`next-story.test.mjs`, `next-characters.test.mjs`): Godot's explore tail and the active episode's objective, each neighbor's surprise hint, and every `conversation_actions` arm.
- **Browser tests** at 320, 390 and 1440 px:
  - the chapter line, chapter card and Next line;
  - one double click, double tap or map double tap acting once, and a `[data-rapid]` zoom double press acting twice;
  - no overflow and 44 px targets, including the layout choice, the furniture grid and its scroll cue, Settings, Music, Field notes, the history notes, Living district, programme, second-gathering and film dialogs, and no dialog text under the close button;
  - two tabs rebasing on each other, and recovering progress after a third page writes a stale save (found by an action, put off with Escape or ×, declined, withdrawn by a restart elsewhere, kept when Keep cannot be written), with the session and the ending's visit starting over when a save is adopted;
  - restart safety with held and repeated Enter;
  - a held unreadable save, and a refused save at the budget;
  - classic's keys left untouched;
  - no external requests;
  - no Content-Security-Policy violation (a `securitypolicyviolation` listener names any), with Load Local Track playing under the policy;
  - Godot's music announcements in the live regions, from Music, the Load Local Track panel's one status line and Rook's Play/Pause Groove and sketch buttons, with the sketch button keeping the music playing, from the sketch and from a local track;
  - the selected look of a pressed hosted card, scene, screening frame, bench form, room place and layout button, focus back on the Rhythm Circle button the circle was opened from, Play Bar's name starting with its label, and the Sounds tooltip as the button's description;
  - an open ending screen that another tab's new copies close, saying why;
  - the side stories (the `visits` suite), through real taps, clicks and keys from Godot's entries. At every width: Before These Streets from the startup card and from Field notes, Cook & Share, the stories hub, the picker and Two Dogs Home, a held Escape on the picker, a surprise found by a tap on its beacon (the save, one chime, its card and its bubble), Field notes' five buttons and its museum and eatery cards, another tab's write and Start fresh starting the visit over, and 44 px targets on every screen. At 390 and 1440: the Power festival, Two Dogs Home's reunion and the Lantern Procession. At 1440: Larkin (fetching only the local place file), the Election Walk, Thanh's Spot Surprise with his memory line, the finale, the landmark tour and Godot reading the finds. At 320: a route from the start to Larkin in one click of at most 1.5 s on a cold page; a click over it is measured once more on a fresh page, so one stall on a loaded machine cannot fail the step. Each new button is first pressed twice in one gesture with the guard on, and Godot's rapid controls take both presses.
  - held keys, counted in the page: `holdEnter` (a press and three repeats) and `heldEscape` (a press and two repeats) wait until every key event of the hold has reached the page. `heldEscape` also counts the dialog's cancel events and every close, so "a held Escape closes one screen" is read only after the screen it goes back to is up. `settledClose` resolves once the dialog's close event has run, so the next key cannot land where `game.js`'s close handler moves the focus. The tour's last chime waits two frames and a grace, and a second chime fails with its own message.
  - `NEXT_BROWSER_WIDTHS` and `NEXT_BROWSER_SUITES` (journey, guard, ending, phase2, visits, tabs, restart, seeded, music, characters) run a subset while debugging. The receipt names the suites and widths that ran.
- **Ending harness.** `npm run next:ending` checks `ending/ui.js` at 320, 390 and 1440 px on a stand-in host: the whole chain, and one pointer gesture as one press.
- **Visits harness.** `npm run next:visits` checks `visits-ui.js` with its real parts, and `sprites.js` in a real World, at 320, 390 and 1440 px. Its page is served on `http://visits.test/` under the fork's Content-Security-Policy, with no server.
  - Every screen: overflow, 44 px targets, text under ×, the pressed look, contrast, label in name (Chrome's accessibility tree; a label of one or two characters that are not letters, such as a pin's "1", may stand in its name as a whole word), no inline handler and `data:` images only.
  - One pointer gesture as one press, Godot's rapid controls taking both, and held keys. Every pointer event of a gesture must reach the page, and a wait for the press-settle window that runs out names the window.
  - A screen replaced, or a file arriving after it was, draws nothing; × and the next open.
  - The map with the visits scene, at 390 and 1440.
  - `NEXT_VISITS_WIDTHS` and `NEXT_VISITS_FLOWS` (screens, gestures, replace, scenes) run a subset.
- **Cross-edition check.** A save the fork writes on the local server's origin opens in the Godot build served at `/godot/`, with the fork's progress intact and no reset. The `visits` suite also has Godot read two surprises the fork found (`surprises_found` 2).
