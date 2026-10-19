# Driver Judgment — Godot Round 6 (`2026-10-19-godot-whole-tenderloin`, `r3`)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High reasoning)
- **Reviewer**: `Claude Opus 5.5` (`claude-opus-5-5`, effort `high`, via Kibitz `--driver agy --only claude`, `rc=0`, `TOOL CHECK: PASS`)
- **Source Modification Check**: `PASS` (reviewer modified zero repository source files; wrote only `claude.md`).

## Verification of Reviewer Claims Against Source

1. **[MUST-FIX 1 & 2] Review packet / scope receipt alignment with canonical code & data names**:
   - **Verified**: In our pre-fanout `input.md` / `scope_receipt.md`, we wrote function/field names from memory (`walk_to_comptons_corner`, `walk_to_black_hawk`, `comptons_corner`, `black_hawk`, `KEY_T`, `user://tenderloin_godot_study_save_v1.json`, `district_boundary.rings`, `height_m >= 5.0`), whereas the code uses `walk_to_history_stop("comptons")` / `walk_to_history_stop("blackhawk")`, `KEY_C` for `toggle_district_boundary()` (preserving `KEY_T` for talking with Celeste), `user://godot_block_save_v1.json`, `cultural_district.polygons[].rings`, and deduplicates by city ID `sf16_bldgid` (`0 < height_m <= 300`).
   - **Action taken**: Updated `scope_receipt.md` and `final.md` to cite exact canonical identifiers, and also added `walk_to_comptons_corner()` and `walk_to_black_hawk()` helper aliases in `godot/main.gd`.

2. **[MUST-FIX 3 & 4 + CUT 2] Single source of truth and unified schema for `HISTORY_STOPS`**:
   - **Verified**: `scripts/build-godot-data.mjs` exported `id`, `name`, `intersection`, `pos`, `source_note`, whereas `godot/main.gd` had hard-coded `COMPTONS_POS` / `BLACKHAWK_POS` in `history_stop_xz()`, `focus_history_stop_camera()`, and `handle_scene_tap()`, a duplicate fallback dictionary in `get_history_stop_record()`, `.get("title", ...)` at `main.gd:3252`, and `rec.get("source_note", ...)` before `rec.get("note", ...)` in `read_history_stop()`.
   - **Action taken**:
     - Added `title`, `year`, and narrative `note` to `HISTORY_STOPS` in `scripts/build-godot-data.mjs` and regenerated `godot/data/buildings.json`.
     - Made `history_stop_xz()` and `history_stop_pos_3d()` read `pos` from `get_history_stop_record()`, removed the duplicate narrative fallback dictionary in `get_history_stop_record()`, used `rec.get("note", rec.get("source_note", ""))` in `read_history_stop()`, used `stop_rec.get("name", stop_rec.get("title", ...))` at `main.gd:3252`, and added an assertion in `godot/tests/study_test.gd` that `history_stop_xz()` equals `data.history_stops[].pos`.

3. **[SHOULD-FIX 5] Per-frame corridor step bound in `study_test.gd`**:
   - **Verified**: The Black Hawk test loop in `godot/tests/study_test.gd` stepped by `0.25 s` without asserting the per-frame no-teleport step bound.
   - **Action taken**: Updated the Black Hawk test loop in `godot/tests/study_test.gd` to step at `1.0 / 60.0 s` and assert `prev_bh_xz.distance_to(p_xz) <= study.WALK_CORRIDOR_SPEED_M_PER_S * (1.0 / 60.0) + 0.15` on every frame.

4. **[SHOULD-FIX 6] A* straight-line heuristic in `find_path()`**:
   - **Verified**: `find_path()` in `godot/main.gd` used an unweighted FIFO queue over the expanded `188`-building `walk_bounds`.
   - **Action taken**: Upgraded `find_path()` in `godot/main.gd` to A* using `g_score` (`1.0` cardinal, `sqrt(2)` diagonal) plus Euclidean distance to `g_cell` (`f_score`), keeping pathfinding fast along the Turk Street corridor.

5. **[SHOULD-FIX 7 + CUT 3] Unused `signpost` field & crossing test thresholds**:
   - **Verified**: `WEST_INTERSECTIONS` in `scripts/build-godot-data.mjs` had an unused `signpost` array, and `study_test.gd` checked `p_xz.x <= -136.5` and `<= -281.1` instead of the actual street centerlines (`~ -144.5` and `~ -289.1`).
   - **Action taken**: Removed `signpost` from `scripts/build-godot-data.mjs` and updated `godot/tests/study_test.gd` to compare against `float(study.data.west_intersections[0].point[0])` and `float(study.data.west_intersections[1].point[0])`.

6. **[SHOULD-FIX 8] `Golden Gate` wording in `godot/data/SOURCES.md`**:
   - **Verified**: `godot/data/SOURCES.md` line 11 mentioned `"Golden Gate"` even though the street export covers Eddy and Turk Streets across Mason, Taylor, Jones, Leavenworth, and Hyde.
   - **Action taken**: Updated `godot/data/SOURCES.md` line 11 to refer to `"extending west across Mason, Taylor, Jones, Leavenworth, and Hyde along Eddy and Turk Streets"`.

7. **[SHOULD-FIX 9] Unreachable street tap fallback in `walk_to_point()`**:
   - **Verified**: When tapping a point more than `28 m` from any walkable street corridor, `nearest_walkable_point()` fell back to `PLAYER_START`, which would route the player back to Bea's start position.
   - **Action taken**: Guarded `walk_to_point(goal_xz)` in `godot/main.gd` so if `goal_xz.distance_to(safe_goal) > 28.5 or not is_walkable_point(safe_goal, WALK_CLEARANCE_M)`, it clears `current_path`, announces `"No walkable street point here."`, and returns `false`. Added a test in `study_test.gd` (`walk_to_point(Vector2(-350.0, -350.0)) == false`).

8. **[SHOULD-FIX 10, 11, 12 + OPTIONAL / CUT 1] Tests for `wide_overview()` fit at `1100/390/320`, `world_d <= 8.5` tap bound, `source_receipt.json` counts, and `offset_scale` threshold**:
   - **Verified**: All three test additions and the camera threshold refinement (`view_size > 300.0` in `update_camera()`, removing `camera.far = 4500`) are concrete improvements.
   - **Action taken**: Implemented all three test assertions in `godot/tests/study_test.gd` and `tests/godot-data.test.mjs`, updated `update_camera()` to use `view_size > 300.0`, and removed `camera.far = 4500`.
