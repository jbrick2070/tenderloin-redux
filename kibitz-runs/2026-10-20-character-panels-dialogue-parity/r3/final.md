# Final Summary — Round 4 (`2026-10-20-character-panels-dialogue-parity`, r3)

All MUST-FIX, SHOULD-FIX, and NIT items from the Claude CLI (`claude-opus-5-5`, effort `high`) review have been implemented and verified in `godot/main.gd` and `godot/tests/study_test.gd`:
- `NEIGHBOR_SURPRISE_PAIRS` and `next_undiscovered_surprise_for_neighbor()` pair each of the 5 Turk Street neighbors with their 2 thematic neighborhood surprises before falling back to `NEIGHBORHOOD_SURPRISE_IDS`.
- `celeste_dialogue_text()` and `rook_dialogue_text()` now have 5 distinct post-mural conversation turns and `layout_memory_line()` coverage for all 5 neighbors (`bea`, `celeste`, `rook`, `dez`, `thanh`).
- `MuralPanel` (`mural_detail_label`), `MusicPanel` (`music_stem_label`), and `BlockPanel` (`block_detail_label`) share `neighbor_memory_tail()` for non-duplicating project/surprise memories, clear stale `last_panel_dialogue` on panel open, and attribute `"What's Next?"` and `"Goodbye (Esc)"` to the active panel's neighbor while cleanly canceling any in-flight walk state.
