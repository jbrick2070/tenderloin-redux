VERDICT: yes-with-fixes. The lifecycle seams are wired and ordered as the document says: reset at main.gd:12532, native load clears before validation at main.gd:13036, failed browser import returns early at main.gd:13608-13614 before any reset, successful browser import clears at main.gd:13737, input at main.gd:14630/14683, held keys at main.gd:14319. One focus-contract defect remains, plus one test-leakage gap behind the "quiet / caller restoration" claim. The first-15 caller trace and the study_test execution order are partly unverified (see the [verify] notes).

MUST-FIX BEFORE BUILD

1. [Current source bullet 2: "focus_step points to the appropriate enabled action after reentry"]
   Defect: habitat_room.gd:65 sends focus to assist only when `departure_ready` is true. Consider re-entry (Keep/Escape, then open_room at habitat_room.gd:163, or Back to room then Prepare together at habitat_room.gd:59) with 3 links fitted but not yet ready. Focus lands on items[selected], an owner button. The enabled next action is "Ready together" (assist, habitat_room.gd:283). departure_action already treats this state differently: habitat_room.gd:84 moves focus to assist when links.size()==3. So the same state gets different focus depending on the path.
   Neither suite covers this state. Native re-entry is checked only for "ready" (departure_checks.gd:51) and "mid-panel" (departure_checks.gd:55). Browser re-entry is checked at 1 link (departure-browser.mjs:24, 'partial Keep') and when ready (departure-browser.mjs:34).
   Fix: at habitat_room.gd:65 use `elif mode=="links" and (departure_ready or links.size()==3): assist.grab_focus()`. Then add one assertion: Keep/re-entry after the third fit has assist focus. Put it in departure_checks.gd after `fit()` (line 47), before the Ready press at line 48.

2. [Current source bullet 5 / test claim "save/quiet/camera/route and caller restoration"]
   Defect: departure_checks.gd:83 runs a successful import_browser_save_json. That reaches main.gd:13752-13758: save_godot_state(), trigger_progress_cue("browser_save_import") and update_music_ui().
   - trigger_progress_cue (main.gd:10947-10957) changes last_music_cue and appends to cue_history. It may also start the feel-good burst / reward banner (main.gd:10990+). If reward_audio_unlocked is true, play_reward_sound increments reward_sound_count (main.gd:3287-3293).
   - None of these are in the `state` capture at departure_checks.gd:30.
   - The quiet assertion (departure_checks.gd:72) runs before line 83 and is never repeated.
   - The final restore check (departure_checks.gd:95) compares only the save envelope and motion.
   - The failed import at departure_checks.gd:66 also rewrites `info.text` (main.gd:13612), which is never restored.
   The printed token ("...load/quiet", departure_checks.gd:97) therefore claims more than the code proves.
   The same pattern exists before this change (helper_bench_checks.gd:119, habitat_room_checks.gd:129), so departure stacks a third unrestored cue. [verify: whether any assertion after study_test.gd:3304 reads last_music_cue, cue_history size, reward banner visibility or info.text. Every grep hit for last_music_cue/cue_history is at a study_test.gd line below 2200, but the execution order of those functions was not traced.]
   Fix (smallest):
   - Add "last_music_cue", "reward_sound_count" and "suppress_feel_good_burst" to the key list at departure_checks.gd:30.
   - Capture cue_history.size() and info.text, and restore them after line 84.
   - Or set game.suppress_feel_good_burst=true around line 83 (it gates both the burst and the sound, main.gd:3288/10990) and restore it, and re-run the quiet tuple assertion after line 83.

SHOULD-FIX

1. [Current source bullet 4: "ready white check lies near helper header" — now confirmed from geometry]
   Defect: links_svg draws the ready check at habitat_room.gd:356 (polyline 338,27 -> 353,41 -> 382,14; stroke 7; bounding box about x334.5-385.5, y10.5-44.5). It is appended after the helper glyph (habitat_room.gd:328, then 330), so it paints on top of the helper.
   The helper head rect spans anchor+(-18..18, -17..4) (habitat_room.gd:328). With last_place==2 (Far wall), the anchor is (331,45) (habitat_room.gd:246), so the head covers x313-349, y28-49. The first segment of the check runs through it: about x338-349, y27-37.
   With last_place 0 or 1 the stroke touches the head edge by about 1px. With last_place 3 it is clear.
   Readiness is already shown by the spare frame turning gold at stroke 8 (habitat_room.gd:343), so the check adds no new information.
   Fix: delete line 356 (see CUT 1), or draw the check inside the spare frame (around p+(214,44)), where the meaning already sits.

2. [Section 1: "deliberate Ready together ... separate Depart"]
   Defect: assist goes from "Fit link" (third fit) to "Ready together" to "Depart" on the same control, and focus stays on it each time (habitat_room.gd:84 after both the fit and the Ready branch). A double tap or repeated Enter can therefore move from the last fit through the four-resident acknowledgment into Depart without the user ever reaching the acknowledgment text.
   The original room avoids this for Welcome: focus goes to `back` at habitat_room.gd:233. [verify: whether Godot 4.7 BaseButton ignores echo for ui_accept. If it does, only touch double-tap and deliberate repeated presses remain.]
   Fix: in departure_action, after the Ready branch (habitat_room.gd:74), focus `reader` instead of assist. Keep focus_step's re-entry choice of assist unchanged, so departure-browser.mjs:35 and departure_checks.gd:51 still hold.

3. [Remaining acceptance: "Native load/reset clears before validation"]
   Evidence precision:
   - apply_save_envelope's product caller is load_godot_state, called at startup only (main.gd:2063 -> 13815).
   - The first 15 grep matches for reset_mural_state_to_defaults are all inside apply_save_envelope (main.gd:13069-13139). [verify: remaining matches]
   - So in-session "native load/reset" is reachable only from tests.
   - departure_checks.gd:73 proves only the successful-load clear. The failed-load clear (reset before validation, main.gd:13036) has no departure assertion.
   Fix: either add `not game.apply_save_envelope("bad")` and assert that mode/links/ready/panel cleared, or relabel the claim "startup/test-path load clears; no in-session native load exists". Do not present it as a user-facing asymmetry with failed browser import.

4. [Test claim "actual ui_accept ... 24 complete maps"]
   Defect: departure_checks.gd:81 seeds transient state directly (`room.assigned.clear(); room.complete=false; room.reset_departure()`). It leaves selected, destination, last_place, inspecting and the texture cache from the previous map. The ui_accept presses that follow run on a hand-reset model, not the product reset path.
   Fix: call room.reset_visit() then room.open_room(). That is the real product path (habitat_room.gd:178), and it also clears last_place, textures and focus ownership. If not changed, label the claim "24 maps via direct reset + ui_accept".

5. [Current source bullet 4: "Current top label still says A room for one more / Speculative room model during departure"]
   Defect: both labels are local variables set once in setup (habitat_room.gd:103-104). refresh() cannot change them, so during the three depart panels the credit still reads "Speculative room model | Copies | This visit only", while the picture is the speculative future chapter (habitat_room.gd:331-333).
   Fix: keep `credit` as a member and, in refresh, set it to e.g. "Speculative future chapter | Copies | This visit only" when mode=="depart". The tray height is unaffected, so there is no new layout case.

6. [Current source bullet 2: "Refresh disables completed links/actions"]
   Defect: linked owners stay enabled. habitat_room.gd:279 disables items only when `departure_ready`. Selecting a linked owner disables Fit link (habitat_room.gd:284) without any notice, so the reader gives no reason the action went grey.
   Fix: in choose_item's non-room branch (habitat_room.gd:197), set a one-line notice when `index in links`, e.g. "<Owner>'s link is already fitted; choose another neighbor". Do not disable the items: with 3 links, focus_step/MUST-FIX 1 can still land on items[selected].

OPTIONAL / NICE-TO-HAVE
- Every relation tap, misfit and fit calls refresh(true), which announces the whole body (habitat_room.gd:291). In links mode that is departure_text plus about 700 characters of fixed disclosure (habitat_room.gd:95). Announcing only `notice` plus the "%d of 3" line for relation/fit changes would cut screen-reader repetition. Same pattern as the original room, so not new debt.
- The relation pieces at center±(0,46) (habitat_room.gd:345) overlap the end of the spare-place cross's vertical arm (habitat_room.gd:325, y76-136 within the spot) by about 3-6px. This is cosmetic. Skip the cross when mode!="room" if you want the spare frame clean.
- PCK: the document reports export2 at 2057156B against a 2061028B cap, so post-fix headroom is about 3.9KB. [verify: actual PCK size after fixes; not checkable from source]

CUT THESE (over-engineering)
1. The ready check at habitat_room.gd:356. Safe to cut because the gold, thicker spare frame (habitat_room.gd:343) already encodes readiness, and the check is the source of the occlusion in SHOULD-FIX 1. No test asserts check pixels: departure-browser.mjs:28 measures only inside the spare frame region.
2. The always-disabled pseudo-controls in depart mode:
   - places[2] "Still panels" is disabled for every panel (habitat_room.gd:281, `panel==2 or i==2`).
   - assist "Future chapter" is disabled for every panel (habitat_room.gd:284, `mode=="depart"`).
   Both are status text rendered as unavailable buttons. They take 44px row space at 320px, and screen readers announce them as dimmed controls. Hide them in depart, as places[3] is hidden at habitat_room.gd:282, and move the "still panels" wording into the reader (it is already there, habitat_room.gd:95). This is safe: native checks iterate only visible buttons (departure_checks.gd:61-64), browser checks use only indices 3/4/7/8/9 in depart, and Back/Keep/Next/Skip are unaffected.

[ASSUMPTION] No external services, credentials, environment variables or feature flags are involved. habitat_room.gd has no network, storage or save calls, and departure adds no save field. Checklist items 4 and 5 therefore do not apply beyond the isolated-profile guard at departure_checks.gd:26 and the storage-equality checks at departure-browser.mjs:49/51.
