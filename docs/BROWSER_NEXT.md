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
- `scripts/build-fingerprint-next.mjs`: hashes `browser-next/`. `scripts/serve.mjs` serves the fork at `/browser-next/` (a bare `/browser-next` gets a 302 to the trailing slash) and its build info at `/browser-next/__build`. The classic routes are unchanged.
- Tests: `tests/next-*.test.mjs` run under `npm test`, `npm run next:check` (chained onto `npm run check`) checks the fork's syntax, and `tests/next-browser.mjs` runs locally as `npm run next:browser`. Fixtures stay under `tests/`, never in the published folder.

## The shared save

Godot reads the save once at startup and has no recovery hold: an invalid core field resets the 3D edition and its next action overwrites the stored save. `godot/main.gd` `build_save_envelope` (around 12457) and `apply_save_envelope` (around 13087) define the format. The fork follows these rules:

1. **Load.** `parseGodotSave(raw)` ports `apply_save_envelope` rule for rule:
   - the required, optional-but-strict and lenient field classes;
   - the opening cascade: `block_opened` holds only with 5 neighbors met, 3 motifs placed and the soundcheck done; the later sections need their own gates.
   - It returns the validated envelope and the fork's state. An invalid save is held: the fork starts fresh in memory and does not write until the player chooses to start over.
2. **Write by read-modify-write.** The fork overwrites only the fields it owns and keeps every other key exactly as it was loaded: Godot-only progress (`discovered_surprises`, `mural_scenes`, `district_boundary_visible`) and any key a later Godot adds. The one exception is "Keep this tab's progress" (rule 6), which also brings back known surprise ids and mural scenes from this tab's own last write.
   - Fork-only data goes in `optional['browser-next']`: furniture for the current layout. The player position and litter stay session-only.
   - The output is canonical JSON: compact, keys sorted recursively.
   - `save_seq` is one more than the stored value.
   - Writes stay within Godot's 4,096-byte UTF-8 budget, with room left for Godot's own next write of the same state: `save_seq` gaining a digit, the keys `build_save_envelope` always writes that an older save lacks, `optional`'s floats, the values Godot cleans on load to longer defaults (`active_motif`, `discovered_surprises`), and a non-taken keepsake's palette, which Godot reloads as the mural palette. Over budget, nothing is written and a "Visit-only: save full" notice is shown.
3. **Self-check.** Every envelope is parsed again by the fork's own Godot-rules loader before it is written. A write that Godot would reset or demote is refused. So is a write that would move Godot's forward-only progress backwards, such as meetings, the opening or reading history, from a stale or reset state.
4. **Write only on change.** A write happens only when a reducer returns new state, never while walking or on page hide.
5. **Another tab wrote first.** Before writing, the fork re-reads the key. If the stored string differs from the last one it loaded or wrote, it rebases the action onto the stored save and applies it again on top. If the action no longer changes anything, nothing is written and a notice says the change no longer applies: a toast, or, while a dialog is open, a status line at the top of that dialog. No success message is shown for an action that did not happen. A `storage` event, `pageshow` and becoming visible also re-read the key.
6. **Progress went back.** When a re-read save holds less forward-only progress than this tab had, the fork does not adopt it silently. A "Some progress went back" dialog offers "Keep this tab's progress", which `combineSaves` writes by Godot's upward-import rules (how far each part got is unioned, a taken photo and returned loans survive, and this tab's records win where both reached the same point), and "Use the shared save as it is". Until the player chooses, the tab keeps its own progress and writes nothing. Escape or × puts the choice off, and the next action that saves asks again. If Keep cannot be written, the offer stays with the reason. The offer is withdrawn if a later save covers the lost progress again, or if another tab starts over.
7. **Known limit.** A 3D tab that was already open overwrites newer fork progress on its next action, because Godot only reads at startup. Fixing that needs a `godot/` change, which is out of scope. The fork tells the player to reload the other edition after switching, and the dialog above recovers what it can.
8. **Restart** says that it also resets the 3D edition, including surprises and mural scenes found only in 3D. "Keep my afternoon" has focus, and repeated Enter keys on "Start fresh" are ignored.

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
  - Tests switch the guard off with `window.__tenderloinPressSettleMs = 0`; the held-key rule stays on.
- **Drift test.** It parses `STORY_CHAPTERS`, `PROGRAMME_TITLES`, `LOAN_TITLES`, `GATHERING_LAYOUT_TITLES` and the objective templates from `godot/main.gd`, and compares them with the fork's copies.

## Proof

- **Unit tests.**
  - Loader parity: Godot-written saves load, and Godot's own rejection cases in `godot/tests/study_test.gd` are rejected.
  - Round-trip: Godot-only fields survive.
  - Budget, chapters and the objective.
  - The guard, on an injected clock.
  - The classic fingerprint is pinned.
  - The copied data is identical to classic's.
- **Browser tests** at 320, 390 and 1440 px:
  - the chapter line, chapter card and Next line;
  - one double click, double tap or map double tap acting once, and a `[data-rapid]` zoom double press acting twice;
  - no overflow and 44 px targets, including the layout choice, the furniture grid and its scroll cue, Settings, Music, Field notes, the history notes, Living district, programme, second-gathering and film dialogs, and no dialog text under the close button;
  - two tabs rebasing on each other, and recovering progress after a third page writes a stale save (found by an action, put off with Escape or ×, declined, withdrawn by a restart elsewhere, kept when Keep cannot be written);
  - restart safety with held and repeated Enter;
  - a held unreadable save, and a refused save at the budget;
  - classic's keys left untouched;
  - no external requests.
  - `NEXT_BROWSER_WIDTHS` and `NEXT_BROWSER_SUITES` (journey, guard, tabs, restart, seeded) run a subset while debugging.
- **Cross-edition check.** A save the fork writes on the local server's origin opens in the Godot build served at `/godot/`, with the fork's progress intact and no reset.
