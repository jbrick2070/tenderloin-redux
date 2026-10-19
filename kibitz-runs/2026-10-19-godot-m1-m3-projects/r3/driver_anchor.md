# Driver Pre-Fanout Anchor — Godot Round 7 (`2026-10-19-godot-m1-m3-projects`, r3)

- **Driver**: `AGY 4` (`Gemini 4 Argon` High)
- **Independent Reviewer**: `Claude Opus 5.5` High (`--driver agy --only claude`, `KIBITZ_CLAUDE_MODEL=claude-opus-5-5`, `KIBITZ_CLAUDE_EFFORT=high`)
- **Pre-Fanout Assessment**:
  1. `godot/main.gd` carries forward M1 Afternoon Keepsake & Loan Returns (`epilogue`) and M3 Second Afternoon Programme Planning & Hosting (`programme`, `hosting`) into the 3D Godot neighborhood with 3D visual props (`KeepsakePhotoEasel`, `LoanBeacon_*`, `ProgrammeSignboard`, `HostingArtTilePanel`), strict Godot v1 save validation, read-only browser v1 save monotonic merge, and screen-reader DOM summary (`#godot-a11y-summary`).
  2. Areas where independent scrutiny is highest value:
     - Edge cases in `validate_godot_epilogue`, `validate_godot_programme`, `validate_godot_hosting`, `inspect_browser_save_json`, and `import_browser_save_json` (e.g., partial browser saves, monotonic merge interactions between existing Godot state and imported browser state, or float vs int JSON parsing in GDScript `JSON.parse_string`).
     - State synchronization across `reset_mural_state_to_defaults`, `apply_save_envelope`, and `import_browser_save_json`.
