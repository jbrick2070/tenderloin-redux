# Scope Receipt — `2026-10-20-neighbor-surprise-payoffs` (Round r3)

- **Driver**: `agy` (Gemini 4 Argon High)
- **Target Lane**: `claude` (`claude-opus-5-5`, effort `high`, single-round `r3`)
- **Files in Scope**:
  - `godot/main.gd`
  - `godot/tests/study_test.gd`
- **Out of Scope**:
  - `public/` (browser 0.12.0 track untouched, SHA256 `2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567`)
- **Review Focus**:
  1. 3D surprise keepsake payoffs on `RookSpeaker` (`JeffreyRecordTurntable` with spinning `SpinningVinylLP` when `jeffrey_record` is discovered) and `MuralBoard` (`HiddenMuralSketchCard` when `hidden_mural_145` is discovered).
  2. `neighbor_surprise_memory_line(neighbor_id: String)` and integration with `neighbor_project_memory_line(neighbor_id: String)` so all 5 neighbors voice personal reflections on their paired Tenderloin surprises while keeping M4 `film` and `civic` memories verbatim.
  3. Touch/mobile & desktop conversation action `"surprise"` (`"Spot Surprise (%d/%d)"` / `"Surprise (%d/%d)"` on narrow screens) in `conversation_actions()` and `run_conversation_action_id()`.
