# Driver Anchor — `2026-10-20-character-panels-dialogue-parity` (Round r3)

## Summary of Changes
1. **Neighbor-Paired Surprise Discovery (`NEIGHBOR_SURPRISE_PAIRS`, `next_undiscovered_surprise_for_neighbor`)**:
   - When talking with a neighbor (`talk_partner >= 0`), tapping `"Spot Surprise (%d/10)"` (`"Find %d/10"` on `< 600 px` phone screens) prioritizes that neighbor's own 2 paired surprises (`bea`: `mayor_pomp_event`, `good_donut_and_bagel`; `celeste`: `hidden_mural_145`, `cutesy_dino`; `rook`: `jeffrey_record`, `clown_horn_walker`; `dez`: `viking_dirt_biker`, `magic_carpet_chef`; `thanh`: `impromptu_drag_show`, `bite_size_nachos`) before falling back to any remaining undiscovered surprise in `NEIGHBORHOOD_SURPRISE_IDS`.
2. **Full 5-Turn Post-Milestone Dialogue & Layout Memories for Celeste and Rook (`celeste_dialogue_text`, `rook_dialogue_text`, `layout_memory_line`, `neighbor_greeting_line`)**:
   - Extended `layout_memory_line(n_id)` to include `"celeste"` and `"rook"` alongside `"bea"`, `"dez"`, and `"thanh"`.
   - Gave `celeste_dialogue_text()` and `rook_dialogue_text()` 5 distinct post-mural turns when `mural_completed == true`, preserving Turn 1 verbatim, surfacing `layout_memory_line()` on Turn 4 when `block_opened`, and surfacing discovered surprise reflections on Turn 5 wrapped in ASCII quotes so `spoken_text_from_line()` strips the speaker prefix cleanly for 3D speech bubbles.
3. **`MuralPanel` & `MusicPanel` In-Panel Dialogue Parity (`mural_detail_label`, `music_stem_label`, `ask_whats_next`, `end_conversation`)**:
   - Added `mural_detail_label` to `MuralPanel` (`offset_top = -368 if narrow else -324`, `offset_bottom = -176 if narrow else -130`, `separation = 2`) to display Celeste's spoken line, `"What's Next?"` hint, and alternating surprise/M4 reflections.
   - Updated `update_music_ui()` to surface Rook's spoken line, `"What's Next?"` hint, and alternating surprise/M4 reflections in `music_stem_label` while preserving `"Groove Stems: %s — "` and `"Local full track (procedural stems hidden) — "` prefixes.
   - Updated `ask_whats_next()`, `end_conversation()`, `show_mural_panel()`, and `show_music_panel()` so `MuralPanel` and `MusicPanel` resolve the active speaker/partner to `celeste_index` (`1`) or `rook_index` (`2`).
