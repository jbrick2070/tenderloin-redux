TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, public/core.js, scripts/serve-godot.mjs, scripts/serve.mjs, package.json, docs/GODOT_APPROACH.md, godot/export_presets.cfg)

VERDICT: no. The browser-save adapter [S2] can never see the browser save in the documented deployment because the two apps run on different origins. On top of that, a valid import overwrites Godot progress and persists the result. Both problems are hidden by tests that seed the key on the Godot origin and assert the overwrite.

MUST-FIX BEFORE BUILD

1. [S2] The cross-origin storage wiring is broken, so import is dead code in real use.
   - docs/GODOT_APPROACH.md:40 says "Study: http://127.0.0.1:4174/ . Existing game: http://127.0.0.1:4173/".
   - scripts/serve-godot.mjs:20 listens on GODOT_PORT||4174. scripts/serve.mjs:8 listens on PORT||4173.
   - localStorage is scoped per origin (scheme + host + port). So `import_browser_save_from_web_storage()` (godot/main.gd:2605-2612) reads `tenderloin-redux.save.v1` from :4174's storage. The browser game never writes there.
   - Every real KeyI press therefore takes the "invalid or absent" error branch (main.gd:2560-2566).
   - tests/godot-browser.mjs:24-28 and :254 only pass because they write the browser key directly into the Godot origin's own storage.
   - Fix (smallest): serve artifacts/godot-web under the same origin as public/. For example, add a `/godot/` prefix route in scripts/serve.mjs that resolves into artifacts/godot-web. That is safe because export_presets.cfg:12 has `variant/thread_support=false`, so no COOP/COEP headers are needed. Then point godot-browser.mjs `base` at that path. In the test, seed the browser key by driving the 4173 game (or at least by navigating to the shared origin), not by writing into the Godot page.
   - Alternative: add a paste/file import path through the existing `__tenderloinOpenAudioPicker`-style file input bridge (main.gd:1963-1992). Accept JSON only and keep the 65536 limit.

2. [S2] A valid import replaces Godot state wholesale and immediately persists it, which loses progress.
   - `import_browser_save_json()` (main.gd:2567-2596) assigns `mural_palette`, `mural_placements`, `rook_soundcheck_done`, `visited_neighbors` and `block_opened` from the browser save. It then calls `save_godot_state()` with no confirmation and no merge.
   - A single KeyI press (main.gd:2982-2983) with a less-advanced or nearly empty v1 save wipes 5/5 neighbors, 3/3 mural, soundcheck and block_opened, and writes that to `tenderloin-redux.godot.save.v1`. There is no backup.
   - godot/tests/study_test.gd:442-445 actually asserts this regression. Before the import, the Godot state had 3 placements (asserted at :434) and soundcheck true (loaded at :428). After the import the test requires 2 placements and soundcheck false.
   - This contradicts the packet's "preserving existing Godot progress" intent and the "Validate the block before wider migration" goal in docs/GODOT_APPROACH.md:19.
   - Fix (smallest): make the import a monotonic merge.
     - Union `visited_neighbors`.
     - `rook_soundcheck_done = rook_soundcheck_done or res.soundcheck`.
     - Take the browser mural only if `res.mural_count > mural_placements.size()`, and take its palette only in that case.
     - `block_opened = (block_opened or res.opened) and is_block_ready()`.
   - Then update study_test.gd:444-445 to assert that progress was not lost.
   - Alternative: keep replace semantics but make it two-step. The first KeyI calls `inspect_browser_save_json()` and announces a summary; a second explicit confirm applies it.

3. [S1] The spec contract "BlockPanel opens when tapping Bea when already at Bea" is not implemented. The code does the opposite.
   - A tap on Bea goes `handle_scene_tap()` → `walk_to_neighbor(0)` (main.gd:2915-2916). Within ARRIVAL_DISTANCE_M that calls `finish_neighbor_arrival(0)` (main.gd:1164-1166).
   - Index 0 falls into the final `else` branch, which calls `show_block_panel(false)` (main.gd:1373-1380).
   - Knock-on effect: once all 5 neighbors are visited, the BlockPanel "Cycle Neighbor" button runs `visit_next_unvisited_neighbor()` → `walk_to_neighbor(0)` (main.gd:1578). On arrival at Bea this closes the very panel the user pressed, at the exact spot where the banner appears (BLOCK_BANNER_POS == Bea's pos, main.gd:24 vs :71).
   - Fix: change `elif index >= 3:` (main.gd:1364) to `elif index == 0 or index >= 3:`. Add a study_test step that walks to Bea, calls walk_to_neighbor(0) again, and asserts `block_panel.visible`.

SHOULD-FIX

1. [S3] The aria-live bridge drops repeated identical announcements.
   - `__tenderloinUpdateA11yDOM` writes only `if (l.textContent !== data.announcement)` (main.gd:2032-2034).
   - Godot increments `a11y_announcement_seq` on every call (main.gd:2080), but `data-seq` is an attribute and does not trigger speech.
   - So a second "O" press on an incomplete block, or reopening with "G" when nothing has changed, produces no speech. That is the exact moment a nonvisual user is retrying.
   - Fix: when seq has changed but the text is the same, set `textContent=''` and then assign the text in `requestAnimationFrame`/`setTimeout(…,50)`.

2. [S3] An unthrottled Godot→JS sync runs every physics tick while the player walks with WASD.
   - `walk_step()` → `update_walking_status()` → `sync_web_a11y_status()` (main.gd:1122, 1125-1130). That means JSON.stringify of the full snapshot, a `JavaScriptBridge.eval`, and a DOM rewrite of `#godot-a11y-summary`, about 60 times per second.
   - Fix: only sync when the summary-relevant fields change (cache the last payload string in GDScript and skip if equal), or throttle to around 4 Hz.

3. [S1] The render helper secretly mutates persistent state, and the block can be silently un-opened.
   - `update_block_3d()` sets `block_opened = false` whenever `!is_block_ready()` (main.gd:579-581). It is called from `update_mural_3d()` (main.gd:628), which every mural edit runs through.
   - `clear_mural_board()` also sets `block_opened = false` directly and then saves (main.gd:2228-2230).
   - Result: KEY_0 or "Reset" after opening silently revokes the gathering, hides the banner and persists that, with no announcement. In core.js `opened` is terminal: no reducer path resets it (public/core.js:46-117).
   - Fix (pick one):
     - Gate `clear_mural_board()` on `not block_opened`, announcing "Block is open; board locked". Or:
     - Make `update_block_3d()` view-only (no assignment), keep the clamp only in `apply_save_envelope()` (main.gd:2434) and import (main.gd:2589), and announce any revocation.

4. [S2/S3] An import error permanently hides the readiness checklist.
   - `update_block_ui()` prefers `browser_import_message` over `get_block_missing_summary()` whenever the message is non-empty (main.gd:3218-3221).
   - The message is only cleared in `reset_mural_state_to_defaults()` (main.gd:2305).
   - So after one failed KeyI, BlockPanel never again shows what is missing, even though the spec says BlockPanel presents the missing summary.
   - Fix: clear `browser_import_message` on the next progress mutation, or render `"%s · %s" % [missing, import_msg]`.

5. [S2] The browser-progress → Godot-neighbor mapping is invented and undocumented.
   - The mapping in main.gd:2574-2586 is: greeted→bea, mural→celeste, soundcheck→rook, tidy_count>0→dez, layout/furniture→thanh, opened→all five.
   - core.js has no "visited neighbor" concept (public/core.js:26-45).
   - [ASSUMPTION] The Dez↔litter link is arbitrary. Thanh↔layout is loosely supported by LOANS (core.js:19).
   - Fix: write the mapping table into docs/GODOT_APPROACH.md Round 5. Under the merge in MUST-FIX 2, it only ever adds visits.

6. [S1] `open_block_gathering()` is not idempotent.
   - A repeat O, or pressing the "Block Opened" button, re-runs the success path: `save_seq++`, `save_godot_state()`, and another `cue_history` append (main.gd:1595-1605).
   - Fix: `if block_opened: show_block_panel(true); announce_a11y_status("Block gathering already open."); return true` before line 1595.

7. [S2] Tests have a race and a weak assertion around the rejected import.
   - tests/godot-browser.mjs:190-191 uses a fixed `waitForTimeout(200)` before reading `__tenderloinGodotA11ySnapshot.browser_import_status`. Use `waitForFunction(... === 'error')` as :256 already does.
   - The "preserves Godot progress" claim at :199 only checks `block_opened`. Capture the `tenderloin-redux.godot.save.v1` string before the KeyI press and assert it is byte-identical afterwards. That also proves no save_seq bump happened on the error path.

8. [S2] A test-only hook sits in the production path.
   - On non-web builds, KeyI and the button read `test_browser_save_raw` (main.gd:174, 2607).
   - Fix: on non-web, short-circuit with an explicit "Browser save import is only available in the Web build" message. Have study_test.gd:447-448 call `import_browser_save_json(complete_browser_json)` directly.

9. [S3] Test gaps against the claimed contracts:
   - KEY_G toggle, KEY_O and KEY_I are never exercised in study_test.gd. The keys are only pressed in the browser test, and only O and I.
   - There is no test for Bea-tap → BlockPanel (MUST-FIX 3).
   - There is no test for clear-after-open (SHOULD-FIX 3).
   - There is no test for duplicate announcements (SHOULD-FIX 1).
   - study_test.gd:580-583 opens the block by writing `visited_neighbors` and `block_opened` directly, which bypasses the walk/arrival path at each viewport.

OPTIONAL / NICE-TO-HAVE

- [S1] BLOCK_BANNER_POS (main.gd:24) is a hand-copied literal of Bea's `pos` (main.gd:71). Derive it from `neighbors[0].pos` (plus an offset off her standing point) so the banner cannot drift if Bea's position changes. The arch also currently sits centred on Bea's model.
- [S2] The packet says "> 65536 bytes". Both implementations actually count characters: core.js `raw.length` counts UTF-16 units (public/core.js:149) and Godot `String.length()` counts code points (main.gd:2470). Change the packet wording to "characters (parity with core.js)" rather than changing code.
- [S2] Minor strictness divergences from core.js, both safe: Godot rejects an array-valued `core` (main.gd:2481), while core.js accepts it via `typeof === 'object'` (core.js:151); and Godot returns "error" for an empty string, while core.js returns a fresh state. Note both in the docs.
- [S3] The "Route blocked" path (main.gd:2745) updates `info.text` but never announces.
- [S2] Verify: browser mural row-0 orientation matches Godot's row 0 at the top (main.gd:623). I could not find the browser mural renderer, so this is unverified.
- Verified matches (no action): furniture grid 0..7 × 0..4, row 2 excluded (main.gd:2455 vs core.js:36); vertical table in floor layout (main.gd:2444 vs core.js:30); mural 6×3 bounds (main.gd:19-20, 2121 vs core.js:123); soundcheck gated on layout (main.gd:2536 vs core.js:162); opened gated on ready (main.gd:2537 vs core.js:165); a11y bridge set up before `load_godot_state()` (main.gd:284-285).

CUT THESE (over-engineering)

1. `browser_save_summary` (main.gd:173, 2306, 2592) is written but never read anywhere in godot/. It is safe to delete.
2. `history` and `blackhawk` parsing in `inspect_browser_save_json()` (main.gd:2538-2539, 2554-2555) is never consumed by the import or the UI. Safe to delete until a Godot feature uses it.
3. The `seq`/`data-seq` channel (main.gd:2031, 2061) is redundant as a speech trigger. Once SHOULD-FIX 1 is in place, keep seq only as the JS-side dedupe key and drop the DOM attribute. The tests read it at godot-browser.mjs:177, so update that assertion to use the snapshot `seq` instead.
