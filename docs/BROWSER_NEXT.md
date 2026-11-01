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
- `browser-next/index.html` opens its `<head>` with a Content-Security-Policy meta: `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
  - Scripts, modules and the sketch worklet load only from the fork, never inline or through eval.
  - Inline styles stay allowed: the dialogs draw style attributes and `<style>` blocks.
  - `data:` images are the SVG illustrations, and `blob:` media is Load Local Track.
  - A meta policy cannot set `frame-ancestors`.
- `scripts/build-fingerprint-next.mjs`: hashes `browser-next/`. `scripts/serve.mjs` serves the fork at `/browser-next/` (a bare `/browser-next` gets a 302 to the trailing slash) and its build info at `/browser-next/__build`. The classic routes are unchanged.
- Tests: `tests/next-*.test.mjs` run under `npm test`, and `npm run next:check` (chained onto `npm run check`) checks the fork's syntax. Two browser runners run locally:
  - `tests/next-browser.mjs` (`npm run next:browser`) has nine suites: `journey`, `guard`, `tabs`, `restart`, `seeded`, `ending`, `phase2`, `music` and `characters`.
  - `tests/next-ending-browser.mjs` (`npm run next:ending`) checks `ending/ui.js` on a harness page, with no server.
  - Fixtures stay under `tests/`, never in the published folder.

## The shared save

Godot reads the save once at startup and has no recovery hold: an invalid core field resets the 3D edition and its next action overwrites the stored save. `godot/main.gd` `build_save_envelope` (around 12457) and `apply_save_envelope` (around 13053) define the format. The fork follows these rules:

1. **Load.** `parseGodotSave(raw)` ports `apply_save_envelope` rule for rule:
   - the required, optional-but-strict and lenient field classes;
   - the opening cascade: `block_opened` holds only with 5 neighbors met, 3 motifs placed and the soundcheck done; the later sections need their own gates.
   - It returns the validated envelope and the fork's state. An invalid save is held: the fork starts fresh in memory and does not write until the player chooses to start over.
2. **Write by read-modify-write.** The fork overwrites only the fields it owns and keeps every other key exactly as it was loaded: Godot-only progress (`discovered_surprises`, `district_boundary_visible`) and any key a later Godot adds. Keys that no Godot writes are dropped only when they alone would make a write full, largest first, as Godot's own next write drops them. It writes `mural_scenes` by Godot's rules when the player paints or lifts a scene in Mural Stories. The one exception is "Keep this tab's progress" (rule 6):
   - Known surprise ids come back from this tab's own last write.
   - Mural scenes are decided slot by slot. A slot this tab painted or lifted, judged against the scenes it last read from the shared save, wins over the stored save. A slot it only adopted follows the stored save. When the stored save has no scene that Godot's clean keeps, this tab's last write supplies the slots it left alone.
   - Fork-only data goes in `optional['browser-next']`: furniture for the current layout. The player position and litter stay session-only.
   - The output is canonical JSON: compact, keys sorted recursively.
   - `save_seq` is one more than the stored value.
   - Writes stay within Godot's 4,096-byte UTF-8 budget, with room left for Godot's own next write of the same state: `save_seq` gaining a digit, the keys `build_save_envelope` always writes that an older save lacks, `optional`'s floats, the values Godot cleans on load to longer defaults (`active_motif`, `discovered_surprises`), and a non-taken keepsake's palette, which Godot reloads as the mural palette. Over budget even without keys that no Godot writes, nothing is written and a "Visit-only: save full" notice is shown.
3. **Self-check.** Every envelope is parsed again by the fork's own Godot-rules loader before it is written, including one that dropped keys no Godot writes. A write that Godot would reset or demote is refused. So is a write that would move Godot's forward-only progress backwards, such as meetings, the opening or reading history, from a stale or reset state.
4. **Write only on change.** A write happens only when a reducer returns new state, never while walking or on page hide.
5. **Another tab wrote first.** Before writing, the fork re-reads the key. If the stored string differs from the last one it loaded or wrote, it rebases the action onto the stored save and applies it again on top. If the action no longer changes anything, nothing is written and a notice says the change no longer applies: a toast, or, while a dialog is open, a status line at the top of that dialog. No success message is shown for an action that did not happen. A `storage` event, `pageshow` and becoming visible also re-read the key. A stored save that replaces this tab's state starts the visit's session over, as Godot's load does: talk turns, the last arrival, the speech bubble and a waiting chapter notice. An action rebased onto it keeps them.
6. **Progress went back.** When a re-read save holds less forward-only progress than this tab had, the fork does not adopt it silently. A "Some progress went back" dialog offers "Keep this tab's progress", which `combineSaves` writes by Godot's upward-import rules (how far each part got is unioned, a taken photo and returned loans survive, and this tab's records win where both reached the same point), and "Use the shared save as it is", which adopts it as a load does: the session starts over (rule 5), and so do the ending's visit-only copies when the shared save's differ. Until the player chooses, the tab keeps its own progress and writes nothing. Escape or × puts the choice off, and the next action that saves asks again. If Keep cannot be written, the offer stays with the reason. The offer is withdrawn if a later save covers the lost progress again, or if another tab starts over.
7. **Known limit.** A 3D tab that was already open overwrites newer fork progress on its next action, because Godot only reads at startup. Fixing that needs a `godot/` change, which is out of scope. The fork tells the player to reload the other edition after switching, and the dialog above recovers what it can.
8. **Restart** says that it also resets the 3D edition, including the mural scenes both editions paint and the neighborhood surprises found only in 3D. "Keep my afternoon" has focus, and repeated Enter keys on "Start fresh" are ignored.

## Phase 1 slice

- **Meet-five opening.** A `meet` action fires on arrival or when the player talks to a neighbor. Talking to Rook is the soundcheck. Ready means 5 met, 3 motifs and the soundcheck. Open sets the layout to the Long Table when none was chosen. The task list and captions follow Godot's.
- **Chapters.** `currentChapter(state)` ports `current_chapter()` over the fork state (Godot fields mapped by `godot-save.js`).
  - The chapter line reads "Chapter N: Title · Next: …" on wide screens and "Ch. N · Next: …" on narrow ones.
  - A chapter card shows on load and whenever the chapter number changes. It waits while a dialog is open.
- **Next.** `nextObjective(state)` ports `current_objective()` through the film, then Compton's and Black Hawk.
  - Godot's keyboard hints come out through a declared override map.
  - Chapter 6 falls back to "Wander freely". It never names a place 2D lacks.
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
- **Web overrides.** Copied text differs from Godot only through four declared tables, each drift-tested:
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
- **Not ported yet.**
  - Godot's visual feel-good bursts, including the film capture's burst cue and info panel (`main.gd` `film_capture_shot`);
  - a street tap on the startup card, and movement keys on a later chapter card;
  - Godot's surprise, landmark-tour, museum and eateries actions (`characters.js` `FORK_OMITTED_ACTIONS`, beside `CHARACTER_WEB_OVERRIDES`);
  - the Rhythm Circle's View Circle camera (`rhythm.js`);
  - the Listening Hour's one remembered turn with its neighbor tabs (`civic_listening.gd` refresh); 2D's done Listening Hour shows every turn at once.
- **Known limits.** The Rhythm Circle's step lamp divides the sketch's cumulative frames by Godot's 8,268.75-frame step, exactly as `godot/rhythm_circle.gd` line 228 does, while the sketch plays 8,269-sample steps. After tens of minutes of continuous play the lamp drifts off the audible step. It is kept for parity: a fix would be a deliberate deviation from Godot.
- **Known debt.** Recorded, not yet fixed:
  - Constants and rules live in more than one module, each pinned to Godot: `cleanMuralScenes` (`godot-save.js`, `characters.js`), the mural scene ids and slots, `STEM_ORDER`, 22050, 0.375, the bare 8-step count, two exports named `FORK_TEXT` and three `capitalize` helpers.
  - Dead exports: `SKETCH_GAINS`, `RHYTHM_TEXT.stepCuesOff`, `BUBBLE_TEXT.activity` and `.info`, `BUBBLE.pixel` and `.heightM`, `benchAvailable`, `hostedReplies`, `invitationChoice` and `talkingSubline`.
  - `fmt` (`story.js`) and `fill` (`rhythm.js`) ignore `%%`, while `gdFormat` and `gdf` handle it; no live template needs it.
  - `RHYTHM_TEXT.saved` is a default receipt the game never reaches: `rhythm-ui.js` always passes the write's own.

## Phase 3 modules (not wired yet)

`browser-next/visits/` holds the side stories as pure, DOM-free modules with their own drift tests (`tests/next-visits.test.mjs`, helpers in `tests/gd-lex.mjs` and `tests/gd-literal.mjs`). Nothing in the game imports them yet, so the published fork does not show them.
- **Stories:** `before-streets.js` (Before These Streets), `meal.js` (Cook & Share), `dogs.js` (Two Dogs Home), `lantern.js` (Lantern Procession), `power.js` (Power Story and the Larkin place), `election.js` (Election Walk), and `picker.js` (the stories hub and the visit-only session of the four episodes).
- **World:** `surprises.js` (neighborhood surprises), `landmarks.js` (landmark tour, museum Time-Portal, Boeddeker Park, the "So What" awning, six fictional eateries), and `positions.js` (2D positions from Godot's constants, with the proposed bounds, the Eddy corridor and a router that uses them).
- **Text:** `text.js` holds Godot's own text, with `WEB_OVERRIDES` for key and control hints 2D does not bind; `format.js` ports GDScript number formatting.

Wiring checklist, in order:
- **`core.js`** (CRLF): adopt the proposed bounds (`BOUNDS` left -2400, right 850, top -600, bottom 280, plus `ROUTE_BOUNDS`, `WALK_EXTENT` and the Eddy corridor) and the `findPath` cell limit; add `surprises: []` to `initialState` and an ungated `case 'surprise'` that adds a known id and keeps the list sorted. The two position tests that pin ten out-of-bounds targets as unroutable must then use the new bounds.
- **`camera.js`** (CRLF): clamp the centre to the view bounds; keep the zoom-out minimum and the route overview on `ROUTE_BOUNDS`.
- **`godot-save.js`:** `surprises` in `freshState` and `readEnvelope` (through `readDiscovered`), in `FORK_FIELDS`, written as `discovered_surprises` only on a new find (sorted union, unknown string ids kept), a forward-only check in `regression()`, and `mergeState` unions the lists.
- **`game.js`** (CRLF): a module-level visit object, never saved and reset on restart; a shared context built on each call; `walk` goes through `goTo`, then `arrived` or `blocked` (with `reopen: true` when no route was found); a lantern `tick` in `renderFrame`; the JSON files fetched lazily and validated; the entry buttons (the startup card and Field notes for Before These Streets, the afterglow for the stories hub and Cook & Share, the talk "Spot Surprise" action); `act({ type: 'surprise', id })` on a find.
- **New files:** `visits-ui.js` (the DOM screens) and `sprites.js`; `power_place.json` and `voting_places.json` copied into `browser-next/data/`; the `story.js` Next objective change; the 12 visits files in `next:check`.
- **Known limits of the modules:** `findPath` cannot take bounds, so it reads core's `BOUNDS`; the lantern route is 179.9 px; there is no sparks count yet; the park's tree count is a parameter.
- Then browser tests at 320, 390 and 1440 px, an independent QA, an adversarial review, and a commit.

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
  - an open ending screen that another tab's new copies close, saying why.
  - `NEXT_BROWSER_WIDTHS` and `NEXT_BROWSER_SUITES` (journey, guard, tabs, restart, seeded, ending, phase2, music, characters) run a subset while debugging. The receipt names the suites and widths that ran.
- **Ending harness.** `npm run next:ending` checks `ending/ui.js` at 320, 390 and 1440 px on a stand-in host: the whole chain, and one pointer gesture as one press.
- **Cross-edition check.** A save the fork writes on the local server's origin opens in the Godot build served at `/godot/`, with the fork's progress intact and no reset.
