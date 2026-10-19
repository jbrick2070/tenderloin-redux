# Final Synthesis & Disposition — `2026-10-18-godot-neighbor-mural` (`r3`)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High reasoning)
- **Independent Reviewer**: `Claude Opus 5.5` (`claude-opus-5-5`, `effort=high`) via Kibitz CLI (`--driver agy --only claude --allow-single-reviewer`, `rc=0`, `duration_s=131.651`)
- **Zero-Edit Audit**: Verified (`source_after_review.json` matches `source_before.json` across all 17 tracked files)

## Disposition of Findings (`claude.md` + Driver Visual Inspection)

1. **Visual Inspection (Driver) — `MuralBoard` 180° Orientation**:
   - **Finding**: Turk Street's OSM centerline runs east-to-west (`street_t.x < 0`), causing `atan2(-street_t.y, street_t.x)` to face the `MuralBoard`'s `+Z` front away from the street/camera (`180°` rotated).
   - **Fix**: Added `mural_tangent()` normalizing `st` so `st.x >= 0.0` (`-st if st.x < 0.0 else st`), orienting the `+Z` front of `MuralBoard` south-southwest toward the street and camera so `MotifSun`, `MotifWave`, `MotifRise`, and `MuralCompletionBanner` face the viewer.
2. **MUST-FIX 1 (`tests/godot-browser.mjs` reload verification)**:
   - **Finding**: `window.localStorage` persists across `page.reload()` naturally; asserting `localStorage` immediately after `page.reload()` did not prove `load_godot_state()` restored the save into Godot's in-memory state.
   - **Fix**: Added monotonic `save_seq` to `build_save_envelope()`. After `page.reload()` in `tests/godot-browser.mjs`, the test presses `KeyE` to walk to Celeste and talk, waiting for `save_seq > parsedSave.save_seq` and asserting `postReloadSave.celeste_talk_count === parsedSave.celeste_talk_count + 1`, `postReloadSave.mural_palette === 'sunset'`, and `postReloadSave.mural_placements` matches all 3 restored motifs.
3. **MUST-FIX 2 (`tests/godot-browser.mjs` `tenderloin-redux.save.v1` sentinel)**:
   - **Finding**: Asserting `localStorage.getItem('tenderloin-redux.save.v1') === null` in a fresh context would not detect if Godot cleared or overwrote an existing browser-game save.
   - **Fix**: Pre-seeded `tenderloin-redux.save.v1` with `BROWSER_SAVE_SENTINEL` via `context.addInitScript()` before `page.goto()` and asserted that exact sentinel string is preserved both before and after reload.
4. **MUST-FIX 3 (`godot/main.gd` `KEY_E`/`KEY_T` talk timing)**:
   - **Finding**: Pressing `KEY_E`/`KEY_T` while away from Celeste called `walk_to_neighbor(1)` and immediately executed `talk_with_celeste()` on the same frame, hijacking the camera target 53 m away while the player body was still at `PLAYER_START`.
   - **Fix**: Added `pending_celeste_talk`. Pressing `KEY_E`/`KEY_T` when not yet at Celeste or the mural board starts `walk_to_neighbor(celeste_index)` and sets `pending_celeste_talk = true`, consuming `pending_celeste_talk` inside `finish_neighbor_arrival(celeste_index)` / `finish_mural_arrival()` so `talk_with_celeste()` and `focus_mural_camera()` run upon arrival. Verified in both `godot/tests/study_test.gd` and `tests/godot-browser.mjs`.
5. **MUST-FIX 4 (`godot/main.gd` board walkability, `StaticBody3D`, & stand point)**:
   - **Finding**: `MuralBoard` is a physical 3.56 m × 0.36 m sidewalk easel, so its footprint should be solid/non-walkable (`StaticBody3D` + `is_point_in_mural_footprint()`), and `walk_to_mural()` should route to a stand point in front of the board (`mural_stand_xz()`).
   - **Fix**: Added `StaticBody3D` (`BoxShape3D(3.56, 2.66, 0.36)`) to `MuralBoard`, rejected `is_point_in_mural_footprint(pt, PLAYER_RADIUS_M)` in `is_walkable_point()`, routed `walk_to_mural()` and `advance_walk()` to `mural_stand_xz()`, and verified in `study_test.gd` that `not study.is_walkable_point(m_xz)`, `study.is_walkable_point(study.mural_stand_xz())`, all 4 `mural_corner_points()` are outside all 58 footprints with `>= 2.35 m` wall clearance, and `nearest_building_info(m_xz).id == "201006.0003465"` with `min_wall_distance(m_xz) >= 3.40`.
6. **SHOULD-FIX 1–6 & NITs (`resolve_save_path`, strict integer JSON checks, shortcut gating, 3-line dialogue header non-overlap at `320×667`, `pck` freshness)**:
   - Added `resolve_save_path()` (`GODOT_TEST_SAVE_PATH = "user://godot_block_save_test_v1.json"` when running `study_test.gd`), `is_whole_json_number()` in `apply_save_envelope()`, `can_interact_with_mural()` gating on `KEY_6..KEY_0` (`KEY_KP_6..KEY_KP_0`) and `KEY_P`, responsive narrow header font sizing (`18 px` title / `13 px` info when `< 600 px`) so the 3-line Celeste dialogue header never overlaps `MuralPanel` at `320×667`, and expanded `tests/godot-browser.mjs` `index.pck` mtime checks.
