# Driver Judgment — `2026-10-20-neighbor-surprise-payoffs` (Round r3)

## Reviewer Panel
- **Driver**: `agy` (Gemini 4 Argon High)
- **Independent CLI Reviewer**: `claude` (`claude-opus-5-5`, effort `high`, `rc=0`)
- **Reviewer Verdict**: `yes-with-fixes`

## Item-by-Item Disposition

### Accepted & Applied Fixes
1. **MUST-FIX 1 (`run_conversation_action` camera framing)**:
   - **Action**: Accepted. Removed `"surprise"` from the `act_id in [...]` list in `run_conversation_action()` so `show_conversation(partner)` -> `frame_conversation(partner)` does not overwrite the surprise camera target set by `inspect_neighborhood_surprise()`. Added a test assertion verifying `study.play_area_rect().has_point(first_surp_screen)` after `run_conversation_action(0)`.
2. **MUST-FIX 2 (`run_conversation_action_id("surprise")` targets first undiscovered surprise)**:
   - **Action**: Accepted. In `run_conversation_action_id("surprise")`, searched `NEIGHBORHOOD_SURPRISE_IDS` for the first index `next_u` not in `discovered_surprises` and passed `next_u` to `cycle_neighborhood_surprise(next_u)`. Added a test case restoring a save with 1 discovered surprise (`surprise_guide_idx == -1`), tapping `Spot Surprise (1/10)`, and verifying `discovered_surprises.size() == 2`.
3. **MUST-FIX 3 (`study_test.gd` explicit `history_read` and `blackhawk_discovered` preconditions)**:
   - **Action**: Accepted. Explicitly set `study.history_read = true` and `study.blackhawk_discovered = true` before asserting `study.conv_action_ids[0] == "surprise"`.
4. **SHOULD-FIX 4 (`build_rook_speaker` `SpeakerBeacon` and `JeffreyRecordTurntable` clearance)**:
   - **Action**: Accepted. Adjusted `JeffreyRecordTurntable` to `Vector3(0.0, 1.20, 0.08)` with plinth `Vector3(0.42, 0.05, 0.32)` (within `SPEAKER_HALF_EXTENTS.y = 0.28`), and in `update_neighborhood_surprises_3d()` raised `speaker_beacon_mesh.position` to `Vector3(0.0, 1.54, -0.06)` when `jeffrey_record` is discovered (`1.30` otherwise) so `SpeakerBeacon` sits cleanly above `ProppedRecordSleeve`.
5. **SHOULD-FIX 5 (`update_block_ui` 2-line display budget on phones)**:
   - **Action**: Accepted. In `update_block_ui()`, alternated between M4 project memory and `neighbor_surprise_memory_line(n_id)` by `neighbor_talk_counts` parity when both are present so neither is clipped by `max_lines_visible = 2`, while keeping the combined string in `neighbor_project_memory_line()` for `info.text` and `announce_a11y_status()`.
6. **SHOULD-FIX 6 (Narrow 320 px phone label for `"Spot Surprise (%d/10)"`)**:
   - **Action**: Accepted. Mapped `"Spot Surprise ("` -> `"Find "` and `"/10)"` -> `"/10"` (`"Find 9/10"`) on narrow `< 600 px` viewports and added a font string width check in `study_test.gd` at `390x667` and `320x667`.
7. **SHOULD-FIX 7, OPTIONAL & CUT 1**:
   - **Action**: Accepted. Documented forward-only v1 save compatibility next to `discovered_surprises` in `apply_save_envelope()`, added an assertion that `jeffrey_turntable_disc_mesh` does not spin while `jeffrey_turntable_node.visible == false`, and removed the duplicate `hidden_mural_sketch_node.visible` / `jeffrey_turntable_node.visible` assignments from `update_mural_3d()` and `update_speaker_3d()`, keeping `update_neighborhood_surprises_3d()` as the single owner.
