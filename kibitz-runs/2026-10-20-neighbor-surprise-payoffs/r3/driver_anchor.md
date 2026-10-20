# Driver Anchor — `2026-10-20-neighbor-surprise-payoffs` (Round r3)

## Summary of Changes
1. **3D Surprise Keepsake Payoffs (`godot/main.gd`)**:
   - `build_mural_board()` adds `HiddenMuralSketchCard` (`hidden_mural_sketch_node`) on the right leg of Celeste's portable easel, revealed when `discovered_surprises.has("hidden_mural_145")`.
   - `build_rook_speaker()` adds `JeffreyRecordTurntable` (`jeffrey_turntable_node` and `jeffrey_turntable_disc_mesh`) on top of Rook's sidewalk speaker cabinet, revealed when `discovered_surprises.has("jeffrey_record")` and spinning in `update_people_animation(delta)`.
2. **Neighbor Surprise Story Reflections (`neighbor_surprise_memory_line`)**:
   - Pairs all 10 neighborhood surprises across the 5 neighbors (`Bea`: `mayor_pomp_event`, `good_donut_and_bagel`; `Celeste`: `hidden_mural_145`, `cutesy_dino`; `Rook`: `jeffrey_record`, `clown_horn_walker`; `Dez`: `viking_dirt_biker`, `magic_carpet_chef`; `Thanh`: `impromptu_drag_show`, `bite_size_nachos`) and surfaces them in `neighbor_project_memory_line()` while preserving verbatim M4 `film` and `civic` memories.
3. **Conversation Action `"surprise"` (`conversation_actions`, `run_conversation_action_id`)**:
   - Offers `"Spot Surprise (%d/%d)"` (`"Surprise (%d/%d)"` on narrow screens `< 600 px`) in `conversation_actions()` when surprises remain undiscovered in the explore phase or secondary action slot, allowing touch/mobile players to cycle surprises without `Shift+D`.
