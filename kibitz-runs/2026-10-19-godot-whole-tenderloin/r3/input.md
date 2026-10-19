# Review Packet — Godot Round 6 (`2026-10-19-godot-whole-tenderloin`)

## Scope
Implement Godot Round 6 — Wider Tenderloin Neighborhood Expansion, Transgender Cultural District Boundary & Turk-to-Hyde History Walk:
1. **Wider Tenderloin Neighborhood Data Pipeline (`scripts/build-godot-data.mjs`, `godot/data/source/buildings_tenderloin_west.geojson`, `godot/data/buildings.json`, `godot/data/source_receipt.json`, `godot/data/SOURCES.md`)**:
   - Expands the Godot 3D scene beyond the opening Turk/Taylor/Mason block and beyond the Transgender Cultural District boundary to represent the wider Tenderloin neighborhood from Mason across Taylor, Jones, Leavenworth, and Hyde along Eddy, Turk, and Golden Gate (`188` total measured footprints: `58` opening block + `130` wider Tenderloin footprints deduplicated by OSM ID, all with `height_source == "measured"` and `height_m >= 5.0`).
   - Exports all `7` named OSM streets (`Turk Street`, `Taylor Street`, `Mason Street`, `Jones Street`, `Leavenworth Street`, `Hyde Street`, `Eddy Street`) as 3D street ribbons.
   - Exports the official **Transgender Cultural District** boundary (`DataSF Cultural Districts 5xmc-5bjj`, PDDL 1.0, founding year 2017) projected into local scene meters (`district_boundary.rings`) so players can see how the Cultural District sits within the wider Tenderloin.
   - Exports `3` west intersection signposts (`Jones Street` node `65365830`, `Leavenworth Street` node `65362154`, `Hyde Street` node `65360270`) and `2` real-place history stops (`comptons_corner` at Turk & Taylor `[-6.0, -5.5]` and `black_hawk` at the Former Black Hawk Jazz Club site at Turk & Hyde `[-424.5, 62.5]`).
2. **Godot 3D Runtime (`godot/main.gd`)**:
   - Builds all `188` buildings (`scope == "opening"` and `scope == "tenderloin_west"`), all `7` street ribbons, the toggleable 3D `DistrictBoundaryRibbon` (`toggle_district_boundary()`, `KEY_T`), `WestSignposts`, and `HistoryStops` (`Compton's Corner` and `Former Black Hawk Jazz Club`).
   - Adds walkable routing across the wider Tenderloin: `walk_to_history_stop()`, `walk_to_comptons_corner()`, `walk_to_black_hawk()` (`KEY_H`, walking ~448m west along Turk Street across Taylor, Jones, and Leavenworth to Hyde Street and back to Bea), and `read_history_stop()` (auto-triggered on arrival or via plaque/button interaction, sound-independent).
   - Adds `wide_overview()` (`KEY_L` or `"Wide Map"` button) framing the full 650m-wide Tenderloin massing (`camera.far = 4500`, `offset_scale = 2.2` when `in_wide_overview or view_size > 480.0`) without clipping on `1100×760`, `390×667`, or `320×667` viewports, while keeping `overview()` `FIT_CHECK` metrics unchanged.
   - Bounds `handle_scene_tap()` neighbor screen-space selection (`screen_d <= 36.0`) by `world_d <= 8.5` so tapping a street 23m away while zoomed out routes to the street point rather than re-selecting a neighbor.
   - Persists `history_read`, `blackhawk_discovered`, and `district_boundary_visible` in the Godot v1 save (`user://tenderloin_godot_study_save_v1.json`) and maps `core.history` and `core.blackhawk` in the opt-in browser-save adapter (`inspect_browser_save_json()`, `import_browser_save_json()`).
3. **Tests (`tests/godot-data.test.mjs`, `godot/tests/study_test.gd`, `tests/godot-browser.mjs`)**:
   - Node data integrity test verifies 188 buildings (`58 + 130`), 7 streets, `district_boundary`, 3 `west_intersections`, and 2 `history_stops`.
   - Godot headless SceneTree test verifies 188 meshes, wider Tenderloin walk (`walk_to_comptons_corner()`, `walk_to_black_hawk()` ~448m west to Turk & Hyde and return to Bea), `toggle_district_boundary()`, `wide_overview()`, browser-save import of `history`/`blackhawk`, and save/reload round-trip.
   - Playwright browser smoke suite verifies `widerTenderloinVerified: true` and captures `wide` and `blackhawk` screenshots across `1100×760`, `390×667`, and `320×667`.

## Modified Files
- `scripts/build-godot-data.mjs`
- `godot/data/source/buildings_tenderloin_west.geojson`
- `godot/data/source_receipt.json`
- `godot/data/SOURCES.md`
- `godot/data/buildings.json`
- `godot/main.gd`
- `godot/tests/study_test.gd`
- `tests/godot-data.test.mjs`
- `tests/godot-browser.mjs`

## Please Review
Inspect `scripts/build-godot-data.mjs`, `godot/main.gd`, `godot/tests/study_test.gd`, `tests/godot-data.test.mjs`, and `tests/godot-browser.mjs` directly against source for any concrete bugs, edge cases, geometry/collision issues, save/import bugs, or test gaps.
