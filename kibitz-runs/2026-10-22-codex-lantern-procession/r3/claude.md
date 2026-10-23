TOOL CHECK: PASS (read godot/lantern_procession.gd, godot/story_picker.gd, godot/main.gd, godot/power_story.gd, godot/dog_story.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, tests/godot-data.test.mjs, docs/ASSETS.md). I did not run any tests. Everything below comes from reading the source.

VERDICT: yes-with-fixes. The startup order, the setup/reset/cancel hooks, and the modal exclusion all match the Dog pattern line for line. But the Phase-1 finish does not check route progress, and the progress projection can jump. Both break the stated "actor progress follows actual player movement" contract, and neither the native test nor the browser test covers it.

Wiring I checked and found sound (not defects):
- make_ui runs at main.gd:2025. That is after build_streets, buildings/walk_bounds, power_place, build_neighbors_and_player (player_visual), mural, speaker and gathering (main.gd:1955-2013). So build_route and player_visual.add_child in lantern_procession.gd:88,98 have everything they need.
- power_story's more_entry lambda (power_story.gd:134-138) looks up game.story_picker lazily, so creating the picker later (main.gd:15479) is fine.
- cancel_intent call sites match dog_story exactly: main.gd:6422, 8043, 8143, 8197, 8241, 8285, 8534, 13601, 14485, 14549, 14609. The blocked-route hook is at 13527. Reset/close runs in all three teardown paths (12225, 12718, 13286).
- walk_to_point (main.gd:8531-8534) calls cancel_intent before lantern sets traveling again (lantern_procession.gd:266). That ordering is correct and also invalidates any pending open_from_walking generation.
- _physics_process returns early while the lantern panel or the picker is visible (main.gd:13917 via 11801), so walking cannot advance under the modal.

MUST-FIX BEFORE BUILD

1. [lantern_procession.gd:273-282 advance(), :150 near(), :323 buttons[6] gating] Welcome can be won without the group ever marching.
   - Phase-1 completion only checks near(), i.e. the player is within 1 m of route_point(LENGTH). It never checks progress.
   - progress only advances inside `if traveling` (:347-355). Every other way of moving clears traveling through cancel_intent:
     - WASD: walk_step, main.gd:8040-8046 (it also clears current_path)
     - street tap: walk_to_point, main.gd:8531-8534
     - neighbor hotkeys: walk_to_neighbor, main.gd:8143
   - Repro: Gather → WASD or tap to the finish → the walk control shows "Parade" (main.gd:13632-13634) → activate_walk_control → open_from_walking (main.gd:13639-13640) → open_story focuses buttons[6] because near() is true (lantern_procession.gd:226) → advance() sets won=true. The crew are still at route_point(4)/route_point(0), about 28 m behind.
   - Tests miss it: the native and browser asserts "progress>35" (study_test.gd:6063, godot-browser.mjs:1340) only run the March path.
   - Fix (smallest): in phase 1, require progress>=LENGTH-1.0 both in advance() and in `buttons[6].disabled`. Otherwise set message to "Choose March so the lanterns follow". Add one native case: teleport the player to goal() in phase 1 with progress==8, call advance(), and require `not won`.

2. [lantern_procession.gd:350-355 off-route projection] progress can jump forward in one frame, teleporting both visitors.
   - The code projects the player onto the route line and accepts any point within 1.0 m of the line: `next=clampf(distance,progress,LENGTH)`. There is no limit tied to how far the player actually moved.
   - Case A: the player walks with WASD along the street to about 30 m (progress stays frozen, see #1), then chooses March. The first _process tick sets progress from 8 to 30, and the crew jump 22 m.
   - Case B: the player is off-route when choosing March. find_path's A* or smoothed path (main.gd:7875-7996) can join the line well ahead of progress, with the same jump.
   - The native "without teleport" check (study_test.gd:6061) covers only the player, and only on-route.
   - Fix (smallest): store last_player_xz while traveling and cap `next` at `progress + last_player_xz.distance_to(player_xz()) + 0.05`. Or, in phase 1 when the player is more than 1 m off the line or ahead of progress, have walk_route target route_point(progress) first.

3. [lantern_procession.gd:129-143 build_route vs main.gd:7817-7832 is_walkable_point] The ".85 m clearance" claim covers buildings only, not props. The MUST CHECK item "group mesh clearance including existing props" is unproven.
   - What is_walkable_point actually tests: walk_bounds, power_place.admits, street corridor, building containment, mural/speaker footprints (with PLAYER_RADIUS_M, not CLEARANCE), and building-wall distance.
   - Not tested at all:
     - street lamp poles and relay kits (power_story.gd:145-169, game.street_lamp_points)
     - street trees (main.gd:2010)
     - neighbor NPC positions (Celeste is staged at the mural, and the route's assembly point is route_point(8)=mural_stand_xz() when the first candidate validates)
     - the activity props whose cutaway_points() main already collects (rhythm_circle, quiet_seats, bea_invitation, loan_homecoming, shared_panel; main.gd:13750-13759)
   - The native geometry test (study_test.gd:6030-6036) only checks that crew mesh corners are outside building_containing_point. It does not check wall clearance or props, and it does not check the player.
   - [ASSUMPTION] The gathering barricade/table set is centered near x≈38 (main.gd:7249-7257), while the mural is at x=76.5 (main.gd:22). So if Turk's tangent runs roughly along x, the closure set probably does not overlap.
   - verify: whether any street_lamp_points, tree points or neighbor_xz(i) fall within 0.85 m of the selected segment.
   - Fix: in build_route's sample loop, reject samples within CLEARANCE of street_lamp_points, tree points, neighbor_xz(i) and the five modules' cutaway_points(). Add the same check as a native assert. Otherwise, scope the claim down to "building clearance only".

SHOULD-FIX

1. [tests/godot-browser.mjs:1329-1330] Hidden dependency on where the previous test leaves the player.
   - Leg 0 always waits for player_grounding.path_active after tapping March.
   - But walk_route returns without starting a path when near() is already true (lantern_procession.gd:260). Assembly is route_point(8), which equals mural_stand_xz() when offset 0 / sign +1 validates (:133-141).
   - If verifyDogStory (called right before, godot-browser.mjs:3202-3203) leaves the player within 1 m of the mural stand, the 10 s wait times out.
   - verify: the player's position at the end of verifyDogStory.
   - Fix: on leg 0, skip the path wait when snap().lantern_procession.near is true.

2. [tests/godot-browser.mjs:3301-3305] The lantern evidence is not counted, and the "PRIVATE" claim does not match the code.
   - Dog and Power assert check counts (dogStoryChecks.length==6, genuine==3). lanternProcessionChecks has no count assertion, so a skipped size iteration would pass silently.
   - verifyLanternProcession is only called at :3203, with privateFixture=false. No call uses a private fixture, so the anchor's "preflight copies PRIVATE prior completed profiles" does not apply to this episode.
   - Fix: add `assert.equal(lanternProcessionChecks.length,<genuine sizes>)` and correct the anchor wording.

3. [lantern_procession.gd:226 + :321] When the story is won, open_story focuses buttons[5]. refresh has disabled that button (`not active or won`), so keyboard and AT users land on a dead control. Fix: when won, focus index 9 (Back) or 7 (End), matching advance() at :282.

4. [story_picker.gd:32, :71-80; lantern_procession.gd:149, :215-216] The picker entry stays enabled when lantern_procession.available() is false (sites_valid false, or block not opened). Tapping it closes the picker, then fails with the unrelated message "Open the gathering … End the other story". Fix: in picker refresh(), set entries[0].disabled = not game.lantern_procession.available(). Give the route-invalid case its own message in open_story.

5. [story_picker.gd:53-69; main.gd:14174-14175; power_story.gd:134-138] Picker focus and restoration contract.
   - The picker is only reachable from Power's "More stories", which closes Power first.
   - Escape (main.gd:14175) and close_picker always send focus to block_close_btn (story_picker.gd:69). Unlike "Back to stories" (:38), they never return to Power. No return_focus is captured.
   - If open_picker refuses (:54), it returns silently after Power has already closed: no announcement, and focus is lost.
   - Paging: Later/Earlier keep focus after they disable themselves (:36-37, :75-76), and no entry on the new page gets focus.
   - Fix: give the picker a single exit path that reopens Power (reuse the Back callback for Escape). Announce on refusal. After a page change, grab_focus on entries[page*3].

6. [lantern_procession.gd:133] Candidate offsets are world-axis Vector2(0,±3/±6), not perpendicular to `tangent`. If the nearest street tangent is not roughly along x, the "lateral" retries slide along the street instead of across it. Fix: use `tangent.orthogonal()*k`.

7. [lantern_procession.gd:249-251 reset_session; main.gd:12718-12720, 13286-13288] reset_session does not reset costume or lantern. After apply_save_envelope or import_browser_save_json (a profile switch), the previous visit's cape and lantern choices carry into the new profile. That contradicts "End or reload clears it" (:237, :317). Fix: in reset_session set costume=0, lantern=0 and call build_costumes().

8. [lantern_procession.gd:263-270; main.gd:13550-13552] Keeping a manual camera means advance_walk never moves `target`, so a 28 m march can leave the frame. Camera pose is only asserted right after Begin (study_test.gd:6027, godot-browser.mjs:1326), never after March. Fix: add a manual-mode pose and visibility assert after walk_route, or decide deliberately to follow during March.

9. [lantern_procession.gd:346] When `active and not available()`, reset_session runs but does not hide or refresh a visible panel, so the buttons and reader go stale. Fix: call close_story(false) or refresh(true) after the reset.

OPTIONAL / NICE-TO-HAVE
- main.gd:14174-14179: the picker and lantern branches return without get_viewport().set_input_as_handled(). Every sibling modal branch calls it (e.g. :14182, :14187). Today the impact is low because main.gd:14173 is the only _unhandled_input in godot/. Add it for consistency.
- Label mismatch: the button says "Star cape" (lantern_procession.gd:79) while the reader says "Stargazer cape" (:315). Pick one, because AT users hear both.
- The Story nav tooltip (power_story.gd:141) still reads "power cases and Two Dogs Home (F8)" and gives no hint that Halloween is reachable from there.

CUT THESE (over-engineering)
1. [story_picker.gd:34-37, :73-76] Cut the Earlier/Later paging row. It adds two always-disabled 44 px buttons to a list with one entry, a page-size-3 grid, page state, and the focus defect in SHOULD-FIX 5. Cutting is safe because entries.size()==1 and no caller reads `page` except snapshot() (:83) and the native fit check (study_test.gd:6016), which checks only the panel rect. Add paging back when there is a fourth entry.
