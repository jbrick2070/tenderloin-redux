# Driver Pre-Fanout Anchor — Godot Round 9 (`2026-10-19-godot-m6-release-quality`, r3)

- **Driver**: `AGY 4` (`Gemini 4 Argon` High)
- **Independent Reviewer**: `Claude Opus 5.5` High (`--driver agy --only claude`, `KIBITZ_CLAUDE_MODEL=claude-opus-5-5`, `KIBITZ_CLAUDE_EFFORT=high`)
- **Pre-Fanout Assessment**:
  1. `godot/main.gd` implements M6 original SVG generation and export parity (`xml_escape`, `build_keepsake_svg`, `export_keepsake_svg`, `build_programme_svg`, `build_tile_panel_svg`, `build_civic_plan_svg`, `build_film_frame_svg`), measured local performance budgets (`measure_local_performance()`, `last_voices_teardown_usec`, `window.__tenderloinRequestPerfSnapshot()`, plus `min_wall_distance`/`min_street_distance` cutoff and `find_path` collinear grid collapse), and Web SVG export (`window.__tenderloinExportKeepsakeSvg` bound to `Shift+KEY_Y` once `keepsake_photo.status == "taken"`).
  2. `docs/ASSETS.md` and `tests/godot-data.test.mjs` document and verify the complete `godot/` shipped asset, data, vendor, and license inventory (`ENGINE_LICENSE.txt` MIT, `earcut.LICENSE` ISC, DataSF PDDL 1.0, OpenStreetMap ODbL 1.0) with zero external network URLs or legacy media.
  3. Areas where independent scrutiny is highest value:
     - Exact structural and validation parity between `public/keepsake.js`, `public/programme.js`, `public/hosting.js`, `public/civic.js`, and `public/film.js` SVG builders and `godot/main.gd` (`build_keepsake_svg`, `build_programme_svg`, `build_tile_panel_svg`, `build_civic_plan_svg`, `build_film_frame_svg`), including XML escaping, consent checks (refusing `"rook"`), and palette/layout/motif validation.
     - Correctness of `min_wall_distance(pt, cutoff)` and `min_street_distance(pt, cutoff)` early-out cutoffs and `find_path()` collinear corner collapse across all walkable corridors and building footprints.
     - Completeness and accuracy of `docs/ASSETS.md` and `tests/godot-data.test.mjs` against `godot/export_presets.cfg` and `godot/data/source_receipt.json`.
