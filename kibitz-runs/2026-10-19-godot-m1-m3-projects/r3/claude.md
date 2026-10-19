TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, public/core.js, public/programme.js, public/hosting.js, public/world.js)

VERDICT: no. The browser-to-Godot interface contract for M3 hosting is broken: the two sides use different value sets, so real browser saves lose hosting progress on import. The test fixture uses Godot-only values, which hides this. Several M1/M3 actions the brief lists as player flows have no input binding.

MUST-FIX BEFORE BUILD

1. [Scope §2 + §3 "matching public/hosting.js" / import_browser_save_json] The hosting value sets do not match between the two sides.
   - Browser (public/hosting.js:3-5, :12):
     - STORY_CHOICES = {memory, future}
     - TILE_PALETTES = {warm, cool}
     - QUIET_CHOICES = {arc, pairs}
     - beats value 0..255. 0 is a designed "listening round" (hosting.js:55, :65).
   - Godot (godot/main.gd:62-64):
     - HOSTING_STORIES = [welcome, memory, thanks]
     - HOSTING_PALETTES = [warm, sea, dusk]
     - HOSTING_QUIETS = [tea, stretch, listen, arc]
     - beats must be 1..255 (main.gd:3645, :4038, :4059). host_toggle_beat refuses to reach 0 (main.gd:2543). host_complete_current changes 0 to 85 (main.gd:2589).
   - Consequences on import:
     - A real browser save containing "future", "cool", "pairs" or beats 0 hits the prefix `break` in inspect_browser_save_json (main.gd:4036-4054), and hosting results are silently truncated. Example: a browser game with 4/4 hosted and story "future" in slot 1 imports as 0/4.
     - main.gd:4164-4166 still adopts hosting_order, so Godot shows "Host: 0/4".
     - Draft fields fall back silently (main.gd:4057-4064).
   - Fix: replace the HOSTING_* constants with the browser sets: stories [memory, future], palettes [warm, cool], quiets [arc, pairs]. Allow beats 0..255:
     - remove the `next_pat == 0` guard at :2543;
     - change `pat > 0 else 85` at :2589 to `pat`;
     - change `< 1` to `< 0` at :3645, :3684, :4038 and :4059;
     - add a "cool" case to hosting_tile_color at :792.
   - Strict v1 Godot saves already written with welcome/thanks/sea/dusk/tea/stretch/listen will then fail validation (validate_godot_hosting :3638, :3654, :3666, :3676-3694). Either map those values once on load, or accept a reset. GODOT_SAVE_VERSION is still 1 (main.gd:39), so there is no version bump to branch on. Verify whether any shipped Godot saves contain the old values.

2. [study_test.gd:657-663] The "browser v1 save" fixture is not a browser save.
   - It uses story "welcome", draft palette "dusk" and quiet "listen". public/hosting.js can never produce any of these.
   - tests/godot-browser.mjs:312-326 seeds a browser save with no epilogue/programme/hosting at all.
   - So no test runs a real browser-produced M1/M3 save through inspect/import, and defects #1 and #4 pass CI.
   - Fix: in tests/godot-browser.mjs, build the fixture with `applyAction`/`serializeSave` from public/core.js. Drive actions such as photo, pack, return-loan, programme-*, host-story "future", host-beat down to 0, host-palette "cool", host-quiet "pairs" and host-complete. Then feed the result through `__tenderloinQueueBrowserSaveJson` and assert hosting_results.size()==4. Replace the hand-written fixture in study_test.gd:635-666 with that serialized output, checked in as a JSON file.

3. [Scope §2 3D props / world.js parity] The ProgrammeSignboard reads the wrong field.
   - Godot update_block_3d colors and orders the bars from `programme_published` (main.gd:967-973).
   - The browser board renders `hosting.order` when hosting has started, otherwise `published` (public/world.js:221).
   - study_test.gd:613 asserts that re-publishing during hosting is allowed and that it diverges: published becomes [beats,pause,art,stories] while hosting stays [beats,pause,stories,art]. In that state the Godot board shows a running order the player is not hosting, and the "hosted" highlight (main.gd:972) lands on the wrong bar positions.
   - The board is also hidden when hosting_order exists but programme_published is empty. Import can create that state at main.gd:4164-4166.
   - Fix (one line): at main.gd:967, use `var board_order := hosting_order if not hosting_order.is_empty() else programme_published`, iterate board_order, and set visibility to `block_opened and board_order.size()==4`. Also add `hosting_order` to get_a11y_status_snapshot (main.gd:3150) so assistive output names the order actually being hosted.

4. [Scope §3 inspect_browser_save_json epilogue] Godot accepts keepsake photos that core.js rejects, and fills in the missing data itself.
   - core.js restoreEpilogue (public/core.js:136-138) accepts "taken" only if all of these hold:
     - every participant is in PHOTO_GUESTS;
     - layout is table or floor;
     - palette is valid;
     - the photo mural has all 3 motifs.
     Otherwise status stays unasked/skipped.
   - Godot (main.gd:3966-3991) marks it "taken" if any one valid participant exists (it filters out the invalid ones rather than rejecting). When fields are missing or invalid it fills them in:
     - ph_mural defaults to the browser's live mural (`clean_mural.duplicate`, :3968);
     - palette and layout default to the live values (:3969-3970).
   - The result is a "frozen" keepsake that never existed, and it then overrides Godot's skipped photo (main.gd:4137).
   - Fix: at :3987-3989, require ALL of the following before setting "taken": every raw participant valid, raw palette in MURAL_PALETTES, raw layout in [table, floor], and `m_chk.ok` from validate_mural_dict(...,true). Drop the clean_mural/pal_id/layout_id fallbacks for the taken case.

5. [Scope §1/§2 vs input wiring] Several APIs the brief describes as player flows have no key or button binding. They can only be reached from tests or not at all.
   - Unbound:
     - skip_keepsake_photo
     - participant choice for take_keepsake_photo (KEY_Y and the BlockPanel always pass all of PHOTO_GUESTS, main.gd:2373)
     - programme_add, programme_remove, programme_move, set_programme_draft
     - host_set_story, host_toggle_beat, host_cycle_tile, host_set_palette, host_set_quiet
   - Verified by grep of main.gd. Only KEY_Y, KEY_Z and block_button at :5117-5118 route into M1/M3.
   - In the shipped build every player gets the same photo (all four guests), PROGRAMME_DEFAULT_ORDER, and default hosting values.
   - Fix: either (a) amend the brief to say these are headless/test-only APIs and that KEY_Y/KEY_Z are the only player path, or (b) add minimal BlockPanel controls. Decide before build, because #1's value sets only matter to players if (b).

SHOULD-FIX

1. [advance_programme_and_hosting_step, main.gd:2626-2629] KEY_Z silently overwrites any non-empty, invalid user draft with PROGRAMME_DEFAULT_ORDER, then publishes it. If #5(b) is done, this destroys player work. Fix: replace only when `programme_order.is_empty()`. Otherwise announce `programme_issue(programme_order)` and return "programme_blocked".

2. [advance_epilogue_step :2372-2374, advance_programme_and_hosting_step :2632-2633] Both ignore the bool returned by take_keepsake_photo and host_start, and report "photo_taken" or "hosting_started" even on failure. Fix: `return "photo_taken" if take_keepsake_photo(PHOTO_GUESTS) else "photo_blocked"`, and do the same for host_start.

3. [validate_godot_epilogue, main.gd:3517-3527] The `packing && status=="unasked"` rejection only runs when the "photo" key exists. A save with `{"packing":true}` and no "photo" loads as packing=true with status "unasked". core.js:140 converts that case to "skipped". Fix: after building clean_photo, add `if packing and clean_photo.status == "unasked": clean_photo.status = "skipped"`, or reject the save.

4. [validate_godot_epilogue, main.gd:3564] For non-taken photos, a non-Array `participants` value (for example a string) is accepted, because the check is guarded by `is Array`. Fix: reject the save if `ph.has("participants") and not (ph.participants is Array and is_empty())`.

5. [import_browser_save_json, main.gd:4026-4027] If the browser hosting.order is invalid but results exist, Godot builds a hosting_order from programme.published. Browser restoreHosting (hosting.js:19) throws away all hosting state in that case. Godot therefore imports progress the browser itself would not load. Fix: delete :4026-4027.

6. [import_browser_save_from_web_storage, main.gd:4202-4204] Sequencing bug: when localStorage is empty it opens the file picker and then immediately calls import_browser_save_json(""). That sets browser_import_status="error" and announces "invalid or absent" to the aria-live region while the picker is still open. Fix: `return false` right after opening the picker, without calling import. Set status to "picker" if a state is needed.

7. [poll_web_audio, main.gd:3191-3193] Picker errors ("size", "read") are reduced to "" and reported with the generic invalid-save message, so the error detail is lost. Fix: return the err code to the import message.

8. [apply_save_envelope :3843-3844, import_browser_save_json :4130-4131] update_mural_3d() runs before block_opened is assigned. It calls update_block_3d, update_block_ui and recompute_music_stems (main.gd:1029-1031) with the old block_opened value. Later calls (:3846, :4175) correct the state, so the effect is transient. Fix: assign block_opened before calling update_mural_3d, to remove the ordering dependency.

9. [resolve_save_path, main.gd:3341-3343] Test isolation depends on the hard-coded check `arg.ends_with("study_test.gd")`. If the test is renamed or wrapped, it writes to the real user save. Fix: have the test harness pass `--godot-save-path=` explicitly. Verify how godot/tests are launched (runner script not inspected).

10. [update_block_ui, main.gd:4965-4968] When status is "skipped" and packing has not started, the button reads "Keepsake" but the action starts packing (:2375-2377). Fix: label it "Pack Loans" whenever status != "unasked".

OPTIONAL / NICE-TO-HAVE
- The 65536 save-size limit is duplicated as a literal in the JS picker (main.gd:3098) and in BROWSER_SAVE_MAX_BYTES (:36). Interpolate the constant.
- Size units are inconsistent: the picker checks bytes (f.size, :3098); GDScript checks characters (:3882), the same as core.js:149.
- The `#godot-a11y-summary` text (:3073) omits programme published/draft state and the current hosting activity, although the snapshot already has `hosting_current`.
- Programme segment colors (:781-790) and hosting tile colors (:792-803) differ from programme.js SEGMENTS[].color and hosting.js TILE_PALETTES. This is cosmetic only.
- Verify: `saveInput.click()` reached through JavaScriptBridge.eval from Godot's deferred input handling may not count as a user gesture in some browsers, in which case the picker silently does not open [ASSUMPTION].
- External systems, auth, rate limits and retries: not applicable. There is no network I/O. The only external interfaces are localStorage and the file picker.

CUT THESE
1. set_programme_draft (main.gd:2452) and programme_remove (:2428). Nothing calls them in main.gd, study_test.gd or godot-browser.mjs (grep-verified). They are safe to delete unless #5(b) wires them.
2. The hosting-order fallback in import (main.gd:4026-4027). It has no browser equivalent; see SHOULD-FIX 5.
