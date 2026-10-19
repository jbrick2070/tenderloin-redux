# Round 9 Judgment — Godot M6 Release Quality (`2026-10-19-godot-m6-release-quality`)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High)
- **Independent Reviewer**: `Claude Opus 5.5` (High) via Kibitz CLI (`--driver agy --only claude`, `rc=0`, `TOOL CHECK: PASS`)

## Confirmed Review Findings & Applied Fixes

### Must-Fix Items
1. **Path mismatches in `docs/ASSETS.md` (`earcut.js`, `metadata.json`, `method.pdf`)**:
   - **Verdict**: Confirmed.
   - **Fix**: Updated `docs/ASSETS.md` to reference the exact on-disk paths (`scripts/vendor/earcut.js`, `godot/data/source/metadata.json`, `godot/data/source/method.pdf`) and added a disk-existence assertion in `tests/godot-data.test.mjs` for every backticked `godot/` and `scripts/` path in the Godot asset table.
2. **Undocumented Godot files in `docs/ASSETS.md`**:
   - **Verdict**: Confirmed.
   - **Fix**: Added `godot/data/SOURCES.md`, `godot/data/source_receipt.json`, `godot/tests/study_test.gd`, `godot/main.gd.uid`, `godot/tests/study_test.gd.uid`, and the 4 Web export files (`index.html`, `index.js`, `index.pck`, `index.wasm`) to `docs/ASSETS.md`.
3. **Keepsake SVG bunting `y` coordinate (`86` vs `87` in `public/keepsake.js`)**:
   - **Verdict**: Confirmed.
   - **Fix**: Added `KEEPSAKE_BUNTING_Y := [84, 87, 83, 88, 84, 86]` in `godot/main.gd` (`build_keepsake_svg()`) and added byte-for-byte parity assertions against `postcardSVG()`, `programmeSVG()`, `tilePanelSVG()`, `civicPlanSVG()`, and `filmFrameSVG()` in `tests/godot-browser.mjs`.
4. **`measure_local_performance()` pathfinding benchmark hit warm/straight-line shortcut**:
   - **Verdict**: Confirmed.
   - **Fix**: Updated `measure_local_performance()` to save and clear `cell_walkable_cache`, measure cold-cache A* pathfinding from Thanh on Taylor Street (`neighbor_xz(4)`) around the Turk & Taylor corner to the Black Hawk on Turk & Hyde (`blackhawk_xz()`), restore `cell_walkable_cache`, and assert `pathfind_cold_cache == true`, `astar_used == true`, and `astar_expanded_cells > 0`.
5. **Redundant `segment_walkable` calls on collinear grid steps in `find_path()`**:
   - **Verdict**: Confirmed.
   - **Fix**: Collapsed collinear grid steps into corner waypoints (`d0.dot(d1) < 0.999`) before string-pulling in `find_path()`.

### Should-Fix Items
1. **`build_keepsake_svg()` duplicate participant validation**:
   - **Verdict**: Confirmed & fixed (`seen_parts` duplicate check + unit test in `godot/tests/study_test.gd`).
2. **`Shift+Y` (`KEY_Y` with `shift_pressed`) when keepsake is `"skipped"` or `epilogue_packing == true`**:
   - **Verdict**: Confirmed & fixed (`skip_keepsake_photo()` requires `not epilogue_packing and status == "unasked"`; `Shift+Y` announces `"No keepsake photo to export."` without mutating state when `status == "skipped"` or `epilogue_packing == true`).
3. **Real browser download verification + `pagehide` blob URL cleanup + UTF-8 byte count**:
   - **Verdict**: Confirmed & fixed (`page.waitForEvent('download')` tested at `1100×760` in `tests/godot-browser.mjs`, `URL.revokeObjectURL` added on `pagehide`, and `TextEncoder().encode(cleanSvg).length` used for `bytes`).
4. **Reset `last_exported_keepsake_svg` on `reset_mural_state_to_defaults()` and `apply_save_envelope()`**:
   - **Verdict**: Confirmed & fixed.
5. **Remove per-announcement `build_keepsake_svg` call in `get_a11y_status_snapshot()`**:
   - **Verdict**: Confirmed & fixed.
6. **Add `stat('godot/ENGINE_LICENSE.txt')` to `tests/godot-browser.mjs` pck freshness check**:
   - **Verdict**: Confirmed & fixed.
7. **Remove synthetic `temp_arr.clear()` fallback and Web-unsupported `MEMORY_STATIC` from `measure_local_performance()`**:
   - **Verdict**: Confirmed & fixed.
8. **Expand network-call regex check in `tests/godot-data.test.mjs`**:
   - **Verdict**: Confirmed & fixed.
9. **Fix `min_street_distance()` early-exit condition (`cutoff < INF and best <= cutoff`)**:
   - **Verdict**: Confirmed & fixed.
