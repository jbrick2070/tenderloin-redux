TOOL CHECK: PASS (Read/Grep on godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs all returned content). Limitation: this lane had no shell, so I could not run `git diff 1cd1eb1`. Every claim below is about the CURRENT working-tree lines. Wherever "new vs baseline" matters, it is marked verify.

VERDICT: yes-with-fixes. The resolver, reset and save-isolation wiring hold up. One target/tap contract break (eatery counters) contradicts section B. The "delayed finale" coverage claimed in section C is weaker than stated.

MUST-FIX BEFORE BUILD:

1. [B "Markers use actual interactive anchors, including sidewalk counters" / D target-tap mismatch] The eatery tour marker points at a counter that cannot be tapped.
   - godot/main.gd:5656-5658 sets each eatery stop's target to eatery_counter_points[i].
   - The counter props are built hidden (godot/main.gd:4907 `props.visible = false`). Only cycle_eatery_guide makes them visible (godot/main.gd:7653).
   - handle_scene_tap only lets you tap a counter when it is visible (godot/main.gd:12435-12443: `counter_open := ... eatery_counter_nodes[e_i].visible`; otherwise counter_screen_d = INF).
   - update_guide_marker hides the marker once the player is within 3.5 m of the target (godot/main.gd:5862-5866), so the marker-tap path at godot/main.gd:12373-12377 also disappears.
   - Result: a player who follows the gold marker on foot to an unopened cafe arrives and loses the marker. Tapping the counter spot hits nothing and falls through to walk_to_point (godot/main.gd:12456). They have to discover that tapping the building label first "opens" the counter.
   - Museum, park and So What do not have this problem: their tap anchors exist whether or not the player is near (godot/main.gd:12422-12431).
   - Smallest fix, in the eatery loop at godot/main.gd:12432: compute `var is_tour_counter := String(obj.get("tour_id","")) == "eatery:%d" % e_i`. Treat `counter_open or is_tour_counter` as tappable using the eatery_counter_points[e_i] screen distance, and route is_tour_counter to visit_next_landmark(), which already calls cycle_eatery_guide and then eatery_counter_interact (godot/main.gd:5682-5685).
   - Add a native tap test like the park one at godot/tests/study_test.gd:1690-1706, with the player placed within 3.5 m of an unopened tour counter.

SHOULD-FIX:

1. [C "delayed finale"] The native test does not exercise the frame-driven ordering it claims to cover.
   - godot/tests/study_test.gd:1668-1674 forces `reward_banner.visible = false` by hand. It never runs update_celebration_burst, so the real path is untested: the timer counts down and hides the banner (godot/main.gd:5556-5561), then update_landmark_tour_completion runs at godot/main.gd:12259-12260.
   - The browser run cannot cover this ordering either. The tour only starts after 10/10 (godot/main.gd:5771 gates it), and every stop is visited after the finale has already expired (tests/godot-browser.mjs:376-415).
   - Fix (native): replace line 1673 with `study.update_celebration_burst(4.6)` and assert the banner is hidden and `landmark_tour_celebrated` is still false. Then call update_landmark_tour_completion and assert it celebrated.
   - Optional fix (browser): visit the 12 stops before the 10th Shift+D, using Shift+M ×4 plus canvas taps, and assert last_reward_title still matches /^10\/10/ right after the finale.

2. [B "Tapping the active marker can activate that stop" / C browser canvas clicks] Marker taps are only tested natively.
   - The only marker-tap coverage is native (godot/tests/study_test.gd:1704-1706, which computes the tap point with camera.unproject_position).
   - tests/godot-browser.mjs never clicks the marker. All 12 tour activations go through clickConversationAction('landmark_tour') (tests/godot-browser.mjs:413-415).
   - The snapshot exposes no marker screen position (godot/main.gd:10461-10516), so the browser cannot target it.
   - Fix: add a read-only `guide_marker_screen` {x, y, visible} to get_a11y_status_snapshot, computed the same way as godot/main.gd:12374. Then do at least one page.mouse.click on it for one stop per viewport size.

3. [B resolver / interface contract] The museum stop order and the museum's era order are two separate lists that must stay in step.
   - visit_next_landmark sets `museum_hub_step = int(stop_id.get_slice(":", 1))` (godot/main.gd:5676). This assumes TOUR_MUSEUM_ERAS[i] (godot/main.gd:716) is the same era as the `match step` branch i in inspect_tenderloin_museum_hub (godot/main.gd:7599-7619).
   - They match today, but nothing enforces it. If either list is reordered, the guided action visits the wrong era, the stop never completes, and the tour gets stuck.
   - The `% 4` at godot/main.gd:7594-7595 also hard-codes the count.
   - Fix: add `require(TOUR_MUSEUM_ERAS[i] == active_time_era)` after a guided visit for each i in study_test, or have inspect_tenderloin_museum_hub map step to era through TOUR_MUSEUM_ERAS.

4. [D labels/provenance] The total of 12 is computed in one place and hard-coded in five others.
   - landmark_tour_state computes the total as `stops.size()`: 4 eras + 2 + NEIGHBORHOOD_EATERIES.size() (godot/main.gd:5649-5666).
   - Copy hard-codes "12" at godot/main.gd:5718, 5719, 5803, 5804 and 9853. Any change to the eatery list makes the copy wrong while the counter stays right.
   - Fix: format these strings with tour.total, or add a native assert that landmark_tour_state().total == 12.

5. [B So What anchor] The awning coordinates are copied in several places.
   - The tour target literal `Vector3(-350.0, 0.0, 65.8)` (godot/main.gd:5652) duplicates the tap anchor `Vector3(-350.0, 3.6, 65.8)` (godot/main.gd:12422) and the test literal (godot/tests/study_test.gd:1653).
   - Fix: add one const (e.g. SO_WHAT_AWNING_XZ) and use it in all three places.

6. [B "first order at six fictional cafes"] Two of the six stops are bars, not cafes.
   - NEIGHBORHOOD_EATERIES includes "Bar & Lounge" (godot/main.gd:671) and "Corner Bar" (godot/main.gd:691).
   - The action label still says "Order at Next Cafe" (godot/main.gd:5658, narrow form at 6264).
   - Fix: change the label to "Order at Next Stop" / "Order Next", or build it from rec.kind. This is a copy-only change; the measured geometry is untouched.

7. [C browser snapshot freshness] clickConversationAction can click using an old snapshot.
   - The helper's wait passes on any snapshot that already lists the action id (tests/godot-browser.mjs:398). The snapshot is pushed from announce_a11y_status inside the inspect functions (godot/main.gd:7629, 4331, 7565, 4972). That push happens in the same frame update_block_ui → apply_block_panel_mode relabels the buttons (godot/main.gd:13160, 6256-6265). Godot container layout is deferred, so the button rectangles can be one layout pass old. They are otherwise re-synced only every 0.5 s (godot/main.gd:6684-6688).
   - Low risk today: the tour keeps 3 buttons with clip_text on, so the rectangles should be stable ([ASSUMPTION]: HBox/expand-fill layout; I did not trace the row container).
   - Cheap fix: in the helper, also wait for `snap.seq` to be greater than the seq seen at the previous click, plus one requestAnimationFrame, before reading the rectangles.

OPTIONAL / NICE-TO-HAVE:

- reset_mural_state_to_defaults (godot/main.gd:10825-10832) resets eatery_guide_idx to -1 but never hides counters that are already open. After an in-session new game (clear_godot_save, godot/main.gd:11989-11995), earlier counters stay visible. The reset assert at godot/tests/study_test.gd:1716 does not check counter visibility. Fix: loop `eatery_counter_nodes[i].visible = false` in the reset.
- The "tour_complete" banner is not protected the way 10/10 is (godot/main.gd:5532 only keeps titles that start with "10/10"). Any later burst within 3.2 s replaces it. Not a correctness bug.
- The hint "Ask a neighbor to take you there" (godot/main.gd:5796) overstates what happens: visit_next_landmark only moves the camera (e.g. godot/main.gd:7590-7592) and sets following_player = false. The avatar does not move.

CUT THESE (over-engineering):

1. The update_block_ui / update_objective_ui / update_guide_marker / update_guide_arrow calls at godot/main.gd:5686-5689 are redundant. Every branch already ends in refresh_landmark_guidance (godot/main.gd:7626, 4326, 7560, 4969), which makes the same four calls (godot/main.gd:5698-5701), and _process refreshes the marker and arrow every frame anyway (godot/main.gd:6689-6691). Safe to cut: no visible state depends on the second pass. Keep `last_panel_dialogue = ""` at godot/main.gd:5673, because refresh only runs after trigger_progress_cue → update_music_ui (godot/main.gd:9868).
2. In update_landmark_tour_completion, the hand-copied pre-gates at godot/main.gd:5708 (surprises/film/history/blackhawk) are only a partial cheap filter. The `current_objective().id == "explore"` check at godot/main.gd:5715 is what actually guarantees Chapter 6. The copied conditions can drift from current_objective (godot/main.gd:5726-5771). Cut line 5708 or reduce it to the surprise-count check. Behaviour is unchanged because line 5715 subsumes it.
