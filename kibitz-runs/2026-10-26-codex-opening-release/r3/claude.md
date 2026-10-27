TOOL CHECK: PASS (read input.md, r1 final.md and claude.md, godot/before_streets.gd, godot/main.gd at 7447-7491, 11809-11852, 12008-12023, 12115-12116, 12545-12559, 13051-13064, 13755-13764, 14312-14371 and 14627-14699, godot/helper_bench.gd:95-117, godot/tests/before_streets_checks.gd, godot/tests/study_test.gd:6381-6387, tests/before-streets-browser.mjs, godot/export_presets.cfg)

Note: input.md has no section ids, so "para N" means its line or paragraph number. I had no shell, so I read the diff from 20041ad as working-tree source, not as `git diff`. Every line cited below is current working-tree code.

VERDICT: yes-with-fixes. The capture, the guard and the hidden-reset preservation work on the revisit path. One real ordering defect on the startup path breaks the "only keys held at close" contract (para 5). The committed tests use a mutating oracle and never prove that movement resumes.

MUST-FIX BEFORE BUILD

1. [para 5 contract "tracks only movement keys held at close" / startup] Definite, traced from code. A captured key goes stale while the startup card is up, so a deliberate fresh press of that same key is treated as the original hold.
   - Wiring: the only pruning call is main.gd:14318, which sits after the early return at main.gd:14313 (`startup_story_pending and is_story_card_visible()`). A grep for `release_pending` finds nothing else that prunes the opening latch.
   - Trigger: at startup, open the opening (story_before_btn) and hold W. Escape calls close_opening, which captures W at before_streets.gd:104-106 and returns to the card. Release W while the card is up; no pruning happens because physics returns at 14313. Press W again, which is the designed "movement key starts the walk" affordance at main.gd:14677-14678. continue_story hides the card synchronously (main.gd:7454-7456). On the next tick release_pending finds W pressed, keeps it captured and returns true, so the whole step is blocked.
   - Result: the card dismisses but the player stays frozen until W is released and pressed a second time. Arrows behave the same way, since Up/Down/Left/Right also trigger continue_story at 14677 when the reader is not focused.
   - The private lifecycle-dev2 evidence (para 7) covers "D waiting for W", a different key, so it cannot catch this.
   - Fix (smallest): evaluate the opening latch before the visibility/startup guard and use the result after it:
       `var opening_held: bool = before_streets != null and before_streets.release_pending()` as the first line of _physics_process;
       replace main.gd:14318 with `if opening_held: return`.
     Pruning only reads the Input singleton, so running it while the card or another activity is visible is side-effect free. The exception is the one-shot sync_web_a11y_status at before_streets.gd:128, which is the desired effect.
   - The same change fixes SHOULD-FIX 2, because the release transition is now published during the startup card and is no longer short-circuited by 14315-14317.
   - Add a native regression case: at startup, Escape with W held, release W, await process frames with the card still visible, press W fresh, await physics frames, assert the position changed, then release W.
   - Byte note: see SHOULD-FIX 6.

SHOULD-FIX

2. [para 5 "Challenge any stale accessibility snapshot"] before_streets.gd:247 publishes `"release_pending": not held_on_exit.is_empty()`. That is a raw read of an array that only main.gd:14318 prunes. The flag goes stale (true after every captured key is up) in two cases:
   (a) the whole time the startup card is visible (MUST-FIX 1 root cause);
   (b) any tick where programme_studio, habitat_room or helper_bench returns true first at main.gd:14315-14317. Those calls short-circuit, so the opening is never polled and its transition sync at before_streets.gd:128 never fires.
   The opening's own _process sync (before_streets.gd:249-253) stops once the opening is hidden.
   - Fix: MUST-FIX 1 resolves both cases. If the driver rejects MUST-FIX 1, at least make the snapshot non-mutating and live: `held_on_exit.any(func(k): return Input.is_key_pressed(k) or Input.is_physical_key_pressed(k))`.

3. [para 7 evidence vs committed gate; tests] The native oracle mutates the state it is checking. before_streets_checks.gd:96, 99, 102, 122, 124 and 127 call `opening.release_pending()`, which prunes the array itself.
   - Line 102 ("all captured keys released restore original physics") would pass even if main.gd:14318 never ran after the release. It asserts that the array is empty, not that physics resumed.
   - No committed native or browser assertion shows that movement resumes after release.
   - No committed assertion shows that a fresh, uncaptured key (for example S pressed while captured W is held) is blocked and then moves. Line 99 only re-checks the captured D.
   - Fix: assert through `opening.snapshot().release_pending` (after SHOULD-FIX 2) or `opening.held_on_exit.is_empty()` instead of calling release_pending().
   - Add after line 99: press S, await physics frames, assert the position is unchanged.
   - Add after line 102: with S still held, await physics frames, assert the position changed, then release S. This gives the gate a liveness check that does not depend on the private probe4 or dev2 runs.

4. [para 5 "startup/revisit", "held-through-actual-Start"] The native startup case at before_streets_checks.gd:69-76 never exercises the latch.
   - W is released at line 76, before Start.
   - The line-75 position check is masked by the story-card early return at main.gd:14313, so it would pass without the latch.
   - Held-through-Start is proven only by private lifecycle-dev2.
   - Fix (one iteration is enough; it need not run per size): keep W held, run `await suite.phone_accept(game.story_continue_btn)` (study_test.gd:6381), await physics frames, assert the position is unchanged and the latch is pending, then release W and assert the latch clears.

5. [para 7 "opening-integrated-dev1 covers six existing opening journeys before the result-only flag addition"]
   - The browser startup path at before-streets-browser.mjs:46-52 also releases W (line 48) before Start and never reads `before_streets.release_pending`.
   - Because of SHOULD-FIX 2(a), it returns with a published `release_pending:true` while the card is still up.
   - The flag addition at before_streets.gd:247 changes the a11y payload, which affects the dedupe at main.gd:12019. The integrated journeys have not been rerun since then.
   - Fix: the full browser rerun the driver already plans is required, not optional. Add `await page.waitForFunction(()=>!window.__tenderloinGodotA11ySnapshot.before_streets.release_pending)` after Start in startup mode. That passes only once MUST-FIX 1 is in.
   - verify: whether any integrated journey deep-compares the before_streets snapshot.

6. [para 7 "Current pack 2096980 bytes against fixed 2097152 cap"] Headroom is 172 bytes.
   - main.gd and before_streets.gd ship in the pack. tests/* is excluded (godot/export_presets.cfg:7), so test fixes cost nothing.
   - MUST-FIX 1 is roughly a one-token-per-line change in main.gd. Measure the pack after it, and do not fold in refactors such as a shared latch helper in this slice.
   - Sequencing: apply the source fix, export and check the cap BEFORE running the 106+ Node suite and the full browser gate, so a cap failure does not invalidate those runs.

OPTIONAL / NICE-TO-HAVE

- [Hypothesis] before_streets.gd:105 captures arrows. Physics only reads arrows when the GUI focus owner is null (main.gd:14344), and close_opening always restores focus (before_streets.gd:113-115). So a Down arrow held while scrolling the reader (handle_input, before_streets.gd:225) and then Escape blocks fresh WASD, Shift rotation and routes, even though it would never have walked.
  This is defensible: a later map click would release focus and the arrow would then walk. It also matches helper_bench.gd:100-101. Keep it, but say so in the result notes.
- [Hypothesis, liveness] If a keyup is lost (browser blur, or focus moving to the web a11y DOM while W is held), the latch now also freezes routes and tap-to-walk (main.gd:14370-14371 is inside the blocked step). Before this change only keyboard walking was affected. helper and habitat already share this risk. verify: whether Godot web releases pressed keys on canvas blur.
- [ASSUMPTION, engine behaviour] The first native import failure (para 7) is consistent with Input.parse_input_event buffering under accumulated input until the next frame's flush. The 3-frame await at before_streets_checks.gd:118 is the right correction. Lines 91-94 are safe only because phone_accept awaits a frame (study_test.gd:6385). This is not an observed engine cause; leave it worded as in para 7.
- Physical-only holds are never exercised natively. Every native event sets only keycode (before_streets_checks.gd:69, 91-92, 117), so the `is_physical_key_pressed` branches at before_streets.gd:106 and 127 are covered only by the browser, where Playwright sends both. One native case with `physical_keycode=KEY_W` and `keycode=KEY_NONE` would close this gap.

CUT THESE

1. Do not add a cross-activity latch coordinator or a shared helper in this slice. A fourth copy (before_streets.gd:104-106, 124-129) duplicates helper_bench.gd:99-117, but it would not fit the 172-byte headroom (SHOULD-FIX 6) and would touch the unrelated guards at main.gd:14315-14317, which para 9 says to preserve. Defer it.
2. Restoring `original_held_on_exit` at before_streets_checks.gd:7 and 179 is harmless but buys nothing. Any restored stale key is pruned on the next poll. It is safe to keep and safe to drop; do not extend the pattern to new cases.
