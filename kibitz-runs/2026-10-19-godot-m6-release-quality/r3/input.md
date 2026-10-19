# Review Brief — Godot Round 9 (`2026-10-19-godot-m6-release-quality`)

## Scope
Audit the Godot 4.7.2 Round 9 implementation (`godot/main.gd`, `docs/ASSETS.md`, `tests/godot-data.test.mjs`, `godot/tests/study_test.gd`, `tests/godot-browser.mjs`), which completes **M6 Release Quality, Original SVG Generation/Export Parity, Measured Local Performance & Complete Provenance Inventory** on the `godot/` track:

1. **Original SVG Generation & Consent-Aware Keepsake Export Parity (`godot/main.gd`)**:
   - `xml_escape(raw_val: String) -> String`: escapes `&`, `<`, `>`, `"`, and `'`.
   - `build_keepsake_svg(photo_dict: Dictionary = {}) -> String`: matches `public/keepsake.js` `buildKeepsakeSvg` (`640×480` viewBox, refuses `status != "taken"`, empty/non-String/duplicate/non-consenting `"rook"` participants, invalid `palette` or `layout`, or incomplete 3-motif `mural`, and renders bunting, 3 motifs, consenting guest figures in canonical `PHOTO_GUESTS` order with Bea's rollator and Dez's headphones, `"Rook is not pictured."`, and layout title).
   - `export_keepsake_svg() -> bool`: generates and stores `last_exported_keepsake_svg`, exports `tenderloin-redux-godot-afternoon.svg` on Web via `window.__tenderloinExportKeepsakeSvg`, updates `get_a11y_status_snapshot().keepsake_exported`, and is bound to `Shift+KEY_Y` once `keepsake_photo.status == "taken"` (while keeping `Shift+KEY_Y` bound to `skip_keepsake_photo()` when `status != "taken"`).
   - `build_programme_svg(order: Array = programme_published) -> String`: matches `public/programme.js` `buildProgrammeSvg` (`640×460` poster SVG, rejecting invalid/incomplete/unbalanced orders).
   - `build_tile_panel_svg(art_dict: Dictionary = {}) -> String`: matches `public/hosting.js` `buildTilePanelSvg` (`360×240` 6-tile SVG in `"warm"` or `"cool"` palette, rejecting invalid palettes or out-of-range tiles).
   - `build_civic_plan_svg(plan_dict: Dictionary = {}) -> String`: matches `public/civic.js` `buildCivicPlanSvg` (`420×210` schematic shared-space plan for `"circle"` and `"dropin"`, including `"Clear route"`).
   - `build_film_frame_svg(plan_dict: Dictionary = {}, shot_id: String = "") -> String`: matches `public/film.js` `buildFilmFrameSvg` (`420×236` illustrated storyboard frame for `"seat"`, `"paint"`, and `"welcome"`, showing volunteer hands `#c38c65` only in `"wide"` framing).

2. **Measured Local Performance Harness & Pathfinding Optimization (`godot/main.gd`)**:
   - `measure_local_performance() -> Dictionary`: verifies `58` opening buildings, `130` wider buildings (`188` total), `20` opening / `41` wider OSM street ways, Cultural District boundary mesh, Turk & Taylor -> Black Hawk at Turk & Hyde A* pathfinding latency (`< 250000` usec), full M1–M4 save envelope serialize + parse roundtrip latency (`< 50000` usec) and payload size (`<= 4096` bytes), M5 Voices teardown latency (`< 50000` usec), static memory, node count, and `within_budget == true`.
   - Web bridge `window.__tenderloinRequestPerfSnapshot()` in `setup_web_a11y_bridge()` / `poll_web_audio()` populates `window.__tenderloinLastPerfSnapshot` inside the live Wasm runtime.
   - `min_wall_distance(pt, cutoff)` and `min_street_distance(pt, cutoff)` early-out cutoffs + `segment_walkable` coarse probes + `find_path` collinear grid collapse.

3. **Complete Shipped Asset & License Provenance Inventory (`docs/ASSETS.md`, `tests/godot-data.test.mjs`, `tests/godot-browser.mjs`)**:
   - `docs/ASSETS.md` documents every file in the `godot/` track alongside the untouched `public/` table, including SHA256 hashes from `godot/data/source_receipt.json`, `DataSF` PDDL 1.0, OpenStreetMap ODbL 1.0, `earcut` 3.0.2 ISC, and Godot 4.7.2 MIT (`godot/ENGINE_LICENSE.txt`).
   - `tests/godot-data.test.mjs` verifies the M6 provenance table, license files, `export_presets.cfg` filters, and absence of external network calls or legacy media in `godot/main.gd`.
   - `tests/godot-browser.mjs` verifies `artifacts/godot-web/index.pck <= 2 MB`, `Shift+KeyY` keepsake SVG export, and `window.__tenderloinRequestPerfSnapshot()` across `1100×760`, `390×667`, and `320×667`.

## Files to Inspect
- `godot/main.gd`
- `docs/ASSETS.md`
- `tests/godot-data.test.mjs`
- `godot/tests/study_test.gd`
- `tests/godot-browser.mjs`
- `public/keepsake.js`, `public/programme.js`, `public/hosting.js`, `public/civic.js`, `public/film.js` (for parity reference)

## Questions for Reviewer
1. Are there any SVG output discrepancies, validation bypasses, or XML escaping gaps between `godot/main.gd` (`build_keepsake_svg`, `build_programme_svg`, `build_tile_panel_svg`, `build_civic_plan_svg`, `build_film_frame_svg`) and `public/`?
2. Are there any subtle bugs in `min_wall_distance(pt, cutoff)`, `min_street_distance(pt, cutoff)`, `segment_walkable()`, `find_path()`, or `measure_local_performance()`?
3. Are there any gaps or inaccuracies in `docs/ASSETS.md`, `tests/godot-data.test.mjs`, `godot/tests/study_test.gd`, or `tests/godot-browser.mjs`?
