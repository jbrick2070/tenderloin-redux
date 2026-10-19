TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, scripts/build-godot-data.mjs, godot/project.godot, godot/export_presets.cfg, docs/GODOT_APPROACH.md, godot/data/buildings.json street section, package.json, scripts/serve-godot.mjs)

VERDICT: yes-with-fixes. The 2D walk/path/cutaway pipeline is wired end to end. But arrival can teleport the player to a neighbor from any distance, a touch tap fires twice on web, the documented contracts (0.45 m clearance, 1.35 m arrival, 2.39 m, TANGENT_DIRS) don't match the code, and the tests cannot catch any of this.

MUST-FIX BEFORE BUILD

1. [G3 find_path / arrival] Silent teleport on a blocked or failed route.
   - In godot/main.gd:706-708, advance_walk clears current_path when the next micro-step fails is_walkable_point.
   - Then godot/main.gd:719 treats `current_path.is_empty()` as arrival and calls finish_neighbor_arrival. godot/main.gd:681 sets player.position to the neighbor's coordinates, however far away the player is.
   - godot/main.gd:649 does the same in walk_to_neighbor.
   - The mismatch has two sources:
     - BFS cells are checked at 0.80 m clearance (main.gd:470), while string-pulled segments are checked at 0.65 m with 0.25 m samples (main.gd:423-430).
     - advance_walk steps from an arbitrary current position (main.gd:704-706), so its probe points do not line up with the points segment_walkable sampled. A probe can fall between samples and fail.
   - Fix: only call finish_neighbor_arrival when `distance_to(goal) <= ARRIVAL_DISTANCE_M`. If the path empties while still far away, call find_path again once from player_xz(). If that also fails, leave arrived_neighbor = -1 and show "route blocked" in info.

2. [G3 tests] The arrival test can't tell walking from teleporting.
   - godot/tests/study_test.gd:93-98 only asserts `arrived_neighbor == i`. Because of #1, that is true even when the player never walked there.
   - The doc's "arrival (<= 1.35 m)" (input.md G3) is not asserted anywhere. The code uses ARRIVAL_DISTANCE_M = 1.6 (main.gd:12), not 1.35.
   - Fix (after #1):
     - Record player_xz() on the iteration before arrived_neighbor flips, and assert it is within ARRIVAL_DISTANCE_M of neighbor_xz(i).
     - Assert guard < 400 so a stalled loop fails the test.
     - Change the doc to 1.6 m, or the constant to 1.35. Pick one number.

3. [G3 handle_scene_tap / web touch] One touch fires twice.
   - godot/project.godot doesn't set input_devices/pointing/emulate_mouse_from_touch, so the engine default (true) applies [ASSUMPTION: 4.7 default unchanged — verify].
   - On the Web export, each real touch then produces both InputEventScreenTouch/ScreenDrag and an emulated InputEventMouseButton/MouseMotion.
   - _unhandled_input handles both families separately (main.gd:874-892 and 893-911). Results:
     - A tap calls handle_scene_tap → find_path twice. The export is single-threaded (export_presets.cfg:12 `variant/thread_support=false`), so that compute runs twice in one input frame.
     - A drag calls pan_camera_by_screen_delta twice, so touch pans at 2x speed.
   - Smallest fix: delete the ScreenTouch/ScreenDrag branches and rely on mouse emulation. Or set emulate_mouse_from_touch=false in project.godot and keep both branches.

4. [G2 / G3 doc ↔ code contract] The review document and docs/GODOT_APPROACH.md:7-8 state values that disagree with the source. The judge will check these:
   - "min_wall_distance >= 0.45 m" (input.md G2). The enforced clearance is WALK_CLEARANCE_M = 0.65 (main.gd:10, 412, 419); BFS uses 0.80 (main.gd:470). PLAYER_RADIUS_M = 0.45 is only the radius of the unused CylinderShape3D (main.gd:215).
   - "TANGENT_DIRS" (input.md G2) doesn't exist anywhere in godot/main.gd. The sliding candidates are locals: turk_tangent and taylor_tangent at main.gd:569-570, used at main.gd:580-586.
   - ">= 2.39 m wall clearance" (input.md G3; GODOT_APPROACH.md:8). The test asserts >= 2.0 (study_test.gd:43).
   - Constant names: the doc says PLAYER_HEIGHT / PLAYER_RADIUS / WALK_SPEED; the code has *_M / *_M_PER_S (main.gd:7-9).
   - Fix: change the doc to match the code (0.65 m clearance, local tangents, >= 2.0 m tested), or add the asserts the doc implies.

5. [Docs sequencing] Receipts are claimed before they exist.
   - docs/GODOT_APPROACH.md:16 (modified in this change) says Round 2 is "checked and reviewed; see BUILD_STATUS for receipts".
   - docs/BUILD_STATUS.md is unmodified in git status and has no "cutaway", "Walk to neighbor" or "GODOT_STUDY_PASS" entry.
   - The review is in progress (r3) and the driver hasn't run final tests yet (input.md header).
   - Fix: change line 16 to "under review" until the test and browser receipts are written to BUILD_STATUS. Same rule as the "Do not pay to re-review" line.

SHOULD-FIX

1. [G2 CharacterBody3D / StaticBody3D] Two collision systems, only one active.
   - The player is moved only by setting position directly (main.gd:575, 599, 681, 709). move_and_slide, PhysicsRayQuery and collision layers are never used, and scene taps use plane math (main.gd:823-830), not physics.
   - The 58 ConcavePolygonShape3D bodies (main.gd:129-136) and the player cylinder (main.gd:213-219) have no effect, and their radius (0.45) differs from the real clearance (0.65).
   - input.md G2 says StaticBody3D faces "and" the 2D checks enforce collision. Only the 2D checks do.
   - Fix: say so in the doc ("physics bodies present for future use; 2D polygon test is authoritative"), or see CUT #1.

2. [G3 drag pan ↔ walking] The following_player flag is never read.
   - It is written at main.gd:560, 631, 660, 733, 853, 921 and 943, but nothing reads it.
   - pan_camera_by_screen_delta sets it false (main.gd:853), yet advance_walk re-targets the camera to the player on every physics tick (main.gd:713-714). A drag-pan during a route walk is undone on the next frame.
   - Fix: wrap main.gd:713-714 in `if following_player:` and have F (follow_player) turn it back on. Or delete the flag (CUT #2).

3. [G2 sliding ↔ data contract] Street tangents are hard-coded data literals.
   - Vector2(144.648, -23.255) and Vector2(14.605, 94.800) (main.gd:569-570) are copies of single OSM node coordinates in godot/data/buildings.json: the Turk/Mason node at line 11844 and the Taylor node at line 12112. Each is measured from the origin, so it is the bearing to that node, not the tangent of the segment the player is on.
   - scripts/build-godot-data.mjs:7 (origin) and :61-63 (deriveStreets) can regenerate these coordinates. The literals would then be silently wrong.
   - Fix: derive the tangent from the nearest data.streets segment, using the same loop as min_street_distance at main.gd:400-410.

4. [G2/G3 config] Other world constants are hard-coded and not derived from data.
   - WALK_BOUNDS Rect2(-40,-65,210,140) (main.gd:14), the overview target (65,0,-12) (main.gd:24, 957), the ground plane size and position (main.gd:86-89) and PLAYER_START (main.gd:15) are all literals.
   - find_path's BFS cap `head < 6000` (main.gd:493) is below the 105x70 = 7350 cells of WALK_BOUNDS at step 2.0. The 12 m street corridor makes this probably safe today [ASSUMPTION].
   - Fix: compute the bounds from building_rects and street extents in _ready, and raise the cap or make it bounds-derived.

5. [G2 cutaway ↔ camera] Camera direction is duplicated in two places.
   - The occlusion ray assumes direction (+1, +1, +1) through `focus_xz + Vector2(t, t)` and `max_t = h - focus_y` (main.gd:755-759).
   - The camera offset is a separate literal, Vector3(180,180,180), at main.gd:915.
   - Changing the camera angle would silently break cutaway. Fix: one const CAMERA_OFFSET, with the ray direction derived from it.

6. [G3 failure feedback] A failed route is not reported.
   - walk_to_neighbor sets selected_neighbor = index (main.gd:628) before find_path. On an empty path it returns false (main.gd:637-638) and leaves the info text stale.
   - choose_next_neighbor ignores the return value (main.gd:623). walk_to_point does the same on failure (main.gd:665-666).
   - study_test.gd:178-179 only checks selected_neighbor, so it passes even when no route was built.
   - Fix:
     - On failure, set info.text to "No route to <name>".
     - In the test, also assert that current_path is non-empty or arrived_neighbor == expected.

7. [G3 tests] The input path isn't tested.
   - The doc claims "3D scene tap ... with drag threshold gating" is verified (input.md G3). study_test.gd:112-119 calls handle_scene_tap directly, bypassing _unhandled_input: the press/release pairing, the 8 px threshold (main.gd:888, 907) and is_screen_point_in_ui. tests/godot-browser.mjs never taps the 3D scene.
   - Fix: inject InputEventMouseButton press+release, plus a >8 px InputEventMouseMotion case, through Input.parse_input_event. Or narrow the doc claim.

8. [Build pipeline sequencing] The browser test can run against a stale export.
   - tests/godot-browser.mjs tests whatever export is in artifacts/godot-web (export_presets.cfg:8). It has no freshness check against godot/main.gd.
   - The doc requires running godot:export before godot:browser (GODOT_APPROACH.md:46), but nothing enforces it. A stale pck passes because the assertions only check that pixels changed (godot-browser.mjs:26, 31, 36).
   - Fix: write the main.gd SHA256 into the export, or compare the pck/index mtime with main.gd before launching.

9. [Per-tick cost, single-threaded web] Heavy work runs every physics tick while walking.
   - advance_walk calls update_occlusion (58 buildings × 2 focus points × t-steps × all ring edges) and update_route_ribbon (a new SurfaceTool mesh committed) on every tick (main.gd:715-716). walk_step also calls update_occlusion every tick (main.gd:608).
   - Fix:
     - Rebuild the ribbon only when current_path.size() changes.
     - Throttle occlusion to every N ticks or to >0.5 m of movement.

10. [G3 arrival visual] The player lands inside the neighbor.
    - finish_neighbor_arrival puts the player exactly at neighbors[i].pos (main.gd:680-681), the same position as the neighbor node (main.gd:207). The two models overlap, and the player jumps up to 1.6 m in one step.
    - Fix: stop at the last walked position, or offset by ~0.9 m along the approach direction.

11. [G3 neighbor focus leak] selected_neighbor survives mode changes.
    - choose_next (main.gd:919-939) and overview (main.gd:941-968) don't reset selected_neighbor, and walk_step doesn't either (main.gd:553-563).
    - After a building is selected, zoom() calls update_occlusion (main.gd:989) and cuts away buildings around the off-screen player and neighbor while the camera studies a different building.
    - Fix: in zoom(), skip update_occlusion unless following_player is true, or clear selected_neighbor in choose_next.

OPTIONAL / NICE-TO-HAVE
- Keyboard layouts: Input.is_key_pressed with KEY_W/A/S/D (main.gd:792-799) and KEY_BRACKETLEFT/RIGHT (main.gd:870-871) depend on the layout, so AZERTY users get the wrong keys. Use is_physical_key_pressed and physical_keycode.
- Failed data load: if _ready returns early (main.gd:58-60), player and camera stay null, but _physics_process and _unhandled_input still run. The first keypress then dereferences null. Add set_physics_process(false) and set_process_unhandled_input(false) on that path.
- Transparency: a single shared cutaway_material with TRANSPARENCY_ALPHA and CULL_DISABLED (main.gd:294-300) on several overlapping buildings will sort incorrectly in GL Compatibility. Consider depth_draw_mode = ALWAYS or a lower alpha with no depth sorting.
- study_test.gd:80 calls Vector2(21.55, -13.39) an "interior point" but never asserts that building_containing_point(...) != "" before snapping. verify: that the point is inside a footprint.
- Signal cleanup: verify that the lambda connected to get_viewport().size_changed (main.gd:1040) is disconnected when the study node is freed in the test harness.

CUT THESE (over-engineering)
1. StaticBody3D, ConcavePolygonShape3D and the player CylinderShape3D (main.gd:129-136, 213-219). Nothing reads them (see SHOULD-FIX #1). They cost physics-server setup for 58 concave shapes and invite reviewers to assume physics collision exists.
   - Safe to cut: all movement and tap logic is 2D.
   - Required alongside the cut: change study_test.gd:28 and docs/GODOT_APPROACH.md:7.
   - If they are kept for the future, label them non-authoritative instead.
2. The following_player flag (see SHOULD-FIX #2), unless you take its gating fix. Today it is pure write-only state, so it is safe to delete.
3. Either the mouse branches or the ScreenTouch/ScreenDrag branches in _unhandled_input (main.gd:874-911). They duplicate each other under default mouse emulation (MUST-FIX #3), and one set fully covers both desktop and touch.
4. The two street-specific slide candidates (main.gd:582-583), if SHOULD-FIX #3 derives the tangent from data. With wall_t plus the axis candidates (main.gd:581, 584-585) they would be redundant.
   - verify: study_test.gd:71-76 (Turk east slide > 8 m) still passes without them before cutting.
