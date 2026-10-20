Review the hourly improvement round in `C:\tenderloin-redux`:
- `godot/main.gd` (lines 820–836, 2495–2595, 2990–3000, 3218–3228, 5140–5155, 5728–5845, 8820–8910)
- `godot/tests/study_test.gd` (lines 1470–1530)

Check for:
1. State consistency across `reset_mural_state_to_defaults()`, `apply_save_envelope()`, `update_mural_3d()`, `update_speaker_3d()`, and `update_neighborhood_surprises_3d()` for `jeffrey_turntable_node` and `hidden_mural_sketch_node`.
2. Non-interference with existing M4 `film` and `civic` verbatim memory lines in `neighbor_project_memory_line()` and non-interference with existing `conversation_actions()` expectations in `study_test.gd`.
3. Mobile/narrow viewport (`< 600 px`) button fit and Web default font glyph compatibility.
Return a structured Markdown review ending with `VERDICT: yes`, `VERDICT: yes-with-fixes`, or `VERDICT: no`.
