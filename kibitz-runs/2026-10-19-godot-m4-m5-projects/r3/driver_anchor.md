# Driver Pre-Fanout Anchor — Godot Round 8 (`2026-10-19-godot-m4-m5-projects`, r3)

- **Driver**: `AGY 4` (`Gemini 4 Argon` High)
- **Independent Reviewer**: `Claude Opus 5.5` High (`--driver agy --only claude`, `KIBITZ_CLAUDE_MODEL=claude-opus-5-5`, `KIBITZ_CLAUDE_EFFORT=high`)
- **Pre-Fanout Assessment**:
  1. `godot/main.gd` carries forward M4 Peaceful Tenant Listening Hour (`civic`), M4 Illustrated Three-Shot Film Short (`The Open Seat`, `film`), neighbor remembered project lines (`neighbor_project_memory_line`), and M5 Default-Off Experimental Neighborhood Voices (`voices_*` + isolated settings store `tenderloin-redux.godot.settings.v1`) into the 3D Godot neighborhood.
  2. Areas where independent scrutiny is highest value:
     - Exact parity between `public/civic.js` (`restoreCivic`), `public/film.js` (`restoreFilm`, including downgrading `done` with `< 3` captured shots to `shooting` and requiring `result` in `shooting`/`done`), and `godot/main.gd` (`validate_godot_civic`, `validate_godot_film`, `inspect_browser_save_json`, `import_browser_save_json`).
     - Strict separation between game saves (`user://godot_block_save_v1.json` / `tenderloin-redux.godot.save.v1`) and M5 Voices settings (`user://godot_block_settings_v1.json` / `tenderloin-redux.godot.settings.v1`), ensuring game saves and browser save imports never toggle `voices_enabled`.
     - 3D node visibility and material synchronization for `CivicListeningSetup` and `FilmStoryboardEasel` across `update_block_3d()`, `reset_mural_state_to_defaults()`, `apply_save_envelope()`, and `import_browser_save_json()`.
