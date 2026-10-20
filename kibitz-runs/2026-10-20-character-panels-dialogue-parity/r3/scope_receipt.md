# Scope Receipt — `2026-10-20-character-panels-dialogue-parity` (Round r3)

- **Driver**: `agy` (Gemini 4 Argon High)
- **Target Lane**: `claude` (`claude-opus-5-5`, effort `high`, single-round `r3`)
- **Files in Scope**:
  - `godot/main.gd`
  - `godot/tests/study_test.gd`
- **Out of Scope**:
  - `public/` (browser 0.12.0 track untouched, SHA256 `2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567`)
- **Review Focus**:
  1. Neighbor-paired surprise discovery (`NEIGHBOR_SURPRISE_PAIRS`, `next_undiscovered_surprise_for_neighbor()`, `run_conversation_action_id("surprise")`).
  2. 5-turn post-mural dialogue and layout/surprise memory integration in `layout_memory_line()`, `neighbor_greeting_line()`, `celeste_dialogue_text()`, and `rook_dialogue_text()`.
  3. In-panel dialogue parity in `MuralPanel` (`mural_detail_label`) and `MusicPanel` (`music_stem_label`), plus `ask_whats_next()`, `end_conversation()`, `show_mural_panel()`, and `show_music_panel()` state handling.
