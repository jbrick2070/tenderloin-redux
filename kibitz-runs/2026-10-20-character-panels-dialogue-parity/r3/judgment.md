# Kibitz Review Judgment — Round 4 (`2026-10-20-character-panels-dialogue-parity`, r3)

## Reviewer
- **Claude CLI** (`claude-opus-5-5`, effort `high`, `rc=0`, `VERDICT: yes-with-fixes`)

## Triage & Resolution of Findings

### MUST-FIX
1. **[ACCEPTED & FIXED] `end_conversation()` leaves in-flight walk / arrival state active when invoked from `MuralPanel`, `MusicPanel`, or `BlockPanel`**:
   - Updated `end_conversation()` in `godot/main.gd` to clear `current_path`, `walking_to_mural`, `walking_to_speaker`, `walking_to_history_stop`, `pending_celeste_talk`, `pending_rook_talk`, and `arrived_history_stop`, and refresh `update_route_ribbon(true)`.
   - Added unit test assertion in `godot/tests/study_test.gd` verifying that `end_conversation()` cancels an in-flight `walk_to_mural()` and clears `current_path`.
2. **[ACCEPTED & FIXED] Mobile visibility of `mural_detail_label` and `music_stem_label` project/surprise memory on narrow viewports (`< 600px`)**:
   - Note on panel geometry: `tests/godot-browser.mjs` clicks hardcoded vertical offsets `row1Y` and `row2Y` inside `MuralPanel`, which requires `mural_detail_label` (like `block_detail_label`) to remain single-line (`clip_text = true`) with panel `offset_top = -368 if narrow else -324`.
   - To make project/surprise memories immediately visible on narrow viewports (`is_narrow_layout()`) without shifting button hitboxes, `update_mural_ui()` and `update_music_ui()` now lead with the project/surprise memory (`"Celeste: %s · %s"` / `"Rook: %s · %s"`) when `is_narrow_layout()` is true and `last_panel_dialogue` is empty, while the full spoken dialogue remains visible in `info.text` (`AUTOWRAP_WORD_SMART`) and the 3D speech bubble.

### SHOULD-FIX
1. **[ACCEPTED & FIXED] `neighbor_greeting_line("celeste")` and `neighbor_greeting_line("rook")` turn indexing**:
   - Removed the redundant `+ 1` inside `neighbor_greeting_line("celeste")` and `neighbor_greeting_line("rook")` so previews use `maxi(1, celeste_talk_count)` / `maxi(1, rook_talk_count)` consistently with `update_mural_ui()` and `update_music_ui()`.
2. **[ACCEPTED & FIXED] Deduplicate surprise/project memory tail logic into `neighbor_memory_tail(n_id, spoken_line, turn_count)` and apply to `info.text` / `announce_a11y_status`**:
   - Extracted `neighbor_memory_tail()` right after `neighbor_project_memory_line()` in `godot/main.gd` and replaced the 3 duplicated inline blocks in `update_mural_ui()`, `update_music_ui()`, and `update_block_ui()`.
   - Updated `talk_with_celeste()`, `check_sound_with_rook()`, `talk_with_neighbor()`, and `finish_neighbor_arrival()` to use `neighbor_memory_tail()` so Turn 5 never duplicates the surprise memory in `info.text` or `announce_a11y_status`.
   - Added assertions in `godot/tests/study_test.gd` verifying `study.info.text.count("145 Leavenworth") == 1` and `study.info.text.count("361 Turk") == 1` on Turn 5.
3. **[ACCEPTED & FIXED] Clear `last_panel_dialogue` when newly opening `MuralPanel`, `MusicPanel`, or `BlockPanel`**:
   - Updated `show_mural_panel(true)`, `show_music_panel(true)`, and `show_block_panel(true)` to clear `last_panel_dialogue = ""` whenever transitioning from hidden to visible.
4. **[ACCEPTED & FIXED] Scope `ask_whats_next()` UI refresh to the currently visible panel**:
   - Updated `ask_whats_next()` so it refreshes only the active visible panel (`MuralPanel`, `MusicPanel`, or `BlockPanel`).
5. **[ACCEPTED & FIXED] `walk_to_neighbor()` already-arrived branch for Celeste and Rook**:
   - Removed the unconditional `show_block_panel(true)` in `walk_to_neighbor()` when already arrived at a neighbor (`show_conversation(index)` handles opening the right character panel for Bea/Dez/Thanh vs Celeste vs Rook), and cleared `pending_celeste_talk` / `pending_rook_talk` when switching to a different neighbor.

### NIT
1. **[ACCEPTED & FIXED] `update_block_ui()` `talk_idx` resolution**:
   - Updated `update_block_ui()` to check `talk_partner` first when `block_panel_mode == "talk"`.
2. **[ACCEPTED & FIXED] Initial font sizes in `make_ui()`**:
   - Standardized initial font sizes in `make_ui()` (`16` for panel headers, `14` for detail labels) to match `resize_controls`.
3. **[ACCEPTED & FIXED] Ordering in `talk_with_celeste()` and `check_sound_with_rook()`**:
   - Standardized both functions so `trigger_progress_cue()` runs before `show_mural_panel(true)` / `show_music_panel(true)`, removing redundant `update_*_ui()` calls.
