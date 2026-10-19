# Godot Block Study — Round 3 Review Report: Celeste & Portable Mural Board (`2026-10-18-godot-neighbor-mural`)

## Scope Under Review
1. [`godot/main.gd`](file:///C:/tenderloin-redux/godot/main.gd)
2. [`godot/tests/study_test.gd`](file:///C:/tenderloin-redux/godot/tests/study_test.gd)
3. [`tests/godot-browser.mjs`](file:///C:/tenderloin-redux/tests/godot-browser.mjs)

## Milestone Requirements (`docs/GODOT_APPROACH.md` Round 3)
- **Fictional neighbor interaction (Celeste) + original portable mural board**:
  - Freestanding 3D `MuralBoard` easel (`MURAL_POS = Vector3(76.50, 0.0, -18.70)`) on the north sidewalk of Turk Street beside Celeste (`Vector3(70.07, 0.0, -17.75)`), `3.44 m` clear of measured building `201006.0003465` and outside all 58 building footprints.
  - Never paints or claims permission to paint a real building façade; the board is a freestanding portable sidewalk easel with `StaticBody3D` collision and walkable front stand position (`mural_stand_xz()`).
  - Supports talking with Celeste (`talk_with_celeste()`), cycling 3 palettes (`"garden"`, `"sunset"`, `"ocean"`), placing and moving all 3 neighbor motifs (`"sun"`, `"wave"`, `"rise"`) on the `6×3` board (`col` `0..5`, `row` `0..2`), rejecting invalid/out-of-bounds or overlapping cells, and showing visible 3D consequence on `MuralBoard` (`MotifSun`, `MotifWave`, `MotifRise`, canvas palette color, and `MuralCompletionBanner` when all 3 motifs are placed).
- **Separate Godot save persistence & reload recovery**:
  - Persists in `user://godot_block_save_v1.json` (`user://godot_block_save_test_v1.json` during automated `study_test.gd`) and, on Web export, `window.localStorage['tenderloin-redux.godot.save.v1']` using schema `"tenderloin-redux.godot.save"`, version `1`, with monotonic `save_seq`.
  - Never reads or writes the browser game's `tenderloin-redux.save.v1` (verified via pre-seeded `BROWSER_SAVE_SENTINEL`).
  - Restores saved palette, talk count, active motif, and 3D motif positions on fresh scene load, and recovers cleanly from corrupt/invalid JSON, fractional/wrong version or cell coordinates, unknown motifs, or duplicate/out-of-bounds saved cells without crashing.
- **Keyboard & touch playability across `1100×760`, `390×667`, and `320×667`**:
  - Responsive `MuralPanel` (`8` buttons, all `>= 44×44 px`, fitting cleanly between `header_panel` and bottom `controls` at `1100×760`, `390×667`, and `320×667` even with 3-line Celeste dialogue active), plus keyboard shortcuts (`E`/`T` walk to & talk with Celeste on arrival, `M` walk to mural, `6`/`7`/`8` Sun/Wave/Rise, `9` move tile, `0` reset, `P` palette, `Tab`/`Enter` `ui_accept`) and 3D scene tap on `MuralBoard`.

## Independent CLI Review Receipt (`kibitz-runs/2026-10-18-godot-neighbor-mural/r3/`)
- **Reviewer**: `Claude Opus 5.5` (`claude-opus-5-5`, `effort=high`) via Kibitz CLI (`--driver agy --only claude --allow-single-reviewer`, `rc=0`, `duration_s=131.651`)
- **Zero-Edit Audit**: Verified (`source_after_review.json` matches `source_before.json`)
- **Verified & Fixed Findings**:
  1. **180° `MuralBoard` Orientation (Driver Visual Inspection)**: Normalized `mural_tangent()` so `st.x >= 0.0`, orienting the `+Z` front of `MuralBoard` toward the street and camera so 3D motifs (`MotifSun`, `MotifWave`, `MotifRise`) render visibly on the front canvas.
  2. **M1 (`tests/godot-browser.mjs` reload verification)**: Added `save_seq` and post-reload `KeyE` talk action after `page.reload()` to prove `load_godot_state()` restored `celeste_talk_count`, `mural_palette === "sunset"`, and all 3 `mural_placements` into Godot's live runtime memory before saving `celeste_talk_count + 1`.
  3. **M2 (`tests/godot-browser.mjs` `tenderloin-redux.save.v1` sentinel)**: Pre-seeded `localStorage['tenderloin-redux.save.v1']` with `BROWSER_SAVE_SENTINEL` before `page.goto()` and asserted preservation before and after reload.
  4. **M3 (`godot/main.gd` `KEY_E`/`KEY_T` talk timing)**: Deferred `talk_with_celeste()` via `pending_celeste_talk` when `KEY_E`/`KEY_T` is pressed away from Celeste so walking completes before camera focus and dialogue trigger at `finish_neighbor_arrival(celeste_index)` / `finish_mural_arrival()`.
  5. **M4 (`godot/main.gd` board collision & stand position)**: Added `StaticBody3D` to `MuralBoard`, rejected `is_point_in_mural_footprint()` in `is_walkable_point()`, routed `walk_to_mural()` to `mural_stand_xz()`, and verified all 4 `mural_corner_points()` and `3.44 m` clearance from `201006.0003465` in `study_test.gd`.
  6. **S1–S6 & NITs**: Added `resolve_save_path()` (`GODOT_TEST_SAVE_PATH` isolation), `is_whole_json_number()` validation, `can_interact_with_mural()` shortcut gating, narrow-viewport header font scaling (`18 px` / `13 px` at `< 600 px`) preventing 3-line Celeste dialogue header overlap at `320×667`, and expanded `index.pck` mtime checks.

## Verification Evidence
- `npm run godot:test` -> `GODOT_STUDY_PASS:58 meshes, measured heights, collision/courtyards, walking/sliding, 5 neighbors, Celeste portable mural, save/reload, cutaway, 44px and ui_accept at 1100/390/320`
- Negative sentinel (`-- --force-failure`) -> `GODOT_STUDY_FAIL` (`rc=1`)
- `npm run godot:export && npm run godot:browser` -> Passed at `1100×760`, `390×667`, and `320×667` (`errors: []`, `external: []`, `muralSaveReloadVerified: true`)
- `npm test` -> `94/94` pass
- `npm run check` -> Passed
