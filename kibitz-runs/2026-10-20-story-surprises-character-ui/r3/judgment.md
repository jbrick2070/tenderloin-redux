# Driver Judgment — `2026-10-20-story-surprises-character-ui` (Round r3)

## Reviewer Panel
- **Driver**: `agy` (Gemini 4 Argon High)
- **Independent CLI Reviewer**: `claude` (`claude-opus-5-5`, effort `high`, `rc=0`)
- **Reviewer Verdict**: `yes-with-fixes`

## Item-by-Item Disposition

### Accepted & Applied Fixes
1. **Re-inspecting an already-discovered surprise (`inspect_neighborhood_surprise`)**:
   - **Action**: Accepted. Added `var newly_discovered := not discovered_surprises.has(s_id)` before `discovered_surprises[s_id] = true`. Guarded `save_seq += 1`, `persist_mural_save()`, and `trigger_progress_cue(s_id)` behind `if newly_discovered:`. Also added `update_mural_ui()` and `update_music_ui()` alongside `update_block_ui()` so whichever Character Talk panel is open immediately reflects the updated `Sparks: %d` count.
2. **Repeated progress bursts on revisiting neighbors / Celeste / Rook / palette cycle**:
   - **Action**: Accepted.
     - `talk_with_neighbor()`: captured `var first_visit := not visited_neighbors.has(n_id)` before setting `visited_neighbors[n_id] = true`, and guarded `trigger_progress_cue("neighbor_visit", ...)` with `if first_visit:`.
     - `finish_neighbor_arrival()`: guarded `trigger_progress_cue("neighbor_visit", ...)` with `if newly_visited:`.
     - `talk_with_celeste()`: guarded `trigger_progress_cue("celeste_talk")` with `if celeste_talk_count == 1:`.
     - `check_sound_with_rook()`: captured `var was_sc_done := rook_soundcheck_done` and guarded `trigger_progress_cue("soundcheck")` with `if not was_sc_done:`.
     - `trigger_progress_cue()`: removed `"mural_palette"` from the match arm so rapid palette cycling does not spam `RewardBanner` / `CelebrationBurst`.
3. **`spark_count()` save/reload invariance**:
   - **Action**: Accepted. Removed `eatery_visited.size()` from `spark_count()` so `spark_count()` depends strictly on persisted save fields (`visited_neighbors`, `mural_placements`, `rook_soundcheck_done`, `history_read`, `blackhawk_discovered`, `block_opened`, `discovered_surprises`, `keepsake_photo`, `programme_published`, `hosting_results`, `civic_phase`, `film_phase`, `epilogue_returned`).
4. **Hardcoded `4` in `current_objective()` `"explore"` hint**:
   - **Action**: Accepted. Changed `discovered_surprises.size() < 4` and `% [discovered_surprises.size()]` (`%d/4`) to `discovered_surprises.size() < NEIGHBORHOOD_SURPRISE_IDS.size()` and `% [discovered_surprises.size(), NEIGHBORHOOD_SURPRISE_IDS.size()]` (`%d/10`).
5. **Conversation `Turn %d/5` wrap-around in `update_mural_ui()`, `update_music_ui()`, and `update_block_ui()`**:
   - **Action**: Accepted. Replaced `clampi(maxi(1, count), 1, 5)` with `posmod(maxi(1, count) - 1, 5) + 1` in all three functions so the displayed turn number wraps 1..5 in exact lockstep with the 5-turn dialogue arrays.
6. **Mutual separation in `surprise_sidewalk_site()`**:
   - **Action**: Accepted. Appended `surprise_points.values()` to the `avoid` list inside `surprise_sidewalk_site()` so sequentially placed surprises also maintain clearance from already-placed surprises.
7. **`neighbor_visit` position & coat lookup by `reason` in `trigger_progress_cue()`**:
   - **Action**: Accepted. Matched `reason` (`String(n.get("name", ""))`) against `neighbors` first before falling back to `arrived_neighbor` / `selected_neighbor`.
8. **Rising 3-note arpeggio for `clown_horn_walker`**:
   - **Action**: Accepted. Changed `cue_notes` for `"clown_horn_walker"` from `[523.25, 392.00, 659.25]` to strictly ascending `[440.00, 554.37, 659.25]` (A4–C#5–E5 major triad).
9. **Dead state cleanup (`reward_banner_age`, `last_reward_detail`, `celebration_burst_origin`)**:
   - **Action**: Accepted. Removed all 3 unused variables and their dead assignments.
10. **Accessibility snapshot (`get_a11y_status_snapshot`) & `apply_save_envelope()` state reset**:
    - **Action**: Accepted. Added `"surprises_found"`, `"sparks"`, `"reward_burst_count"`, and `"last_reward_title"` to `get_a11y_status_snapshot()`, and reset `surprise_guide_idx = -1`, `reward_banner_timer = 0.0` (`reward_banner.visible = false`), and `celebration_burst_timer = 0.0` (`celebration_burst_node.visible = false`) in `apply_save_envelope()`.
11. **`handle_scene_tap()` priority & `best_screen_d` check**:
    - **Action**: Accepted. Moved the `not in_overview and not in_wide_overview` `NEIGHBORHOOD_SURPRISE_IDS` hit-test ahead of `turk_ee_screen`/`leav_ee_screen` and added `and surp_screen_d < best_screen_d`.
12. **Expanded `godot/tests/study_test.gd` assertions**:
    - **Action**: Accepted. Added assertions verifying re-inspection idempotence (`reward_burst_count` and `save_seq` unchanged), `Turn 1/5` wrap-around on the 6th talk, `get_a11y_status_snapshot()` fields, and full M1–M4 + 10-surprises save envelope byte budget (`<= 4096` bytes).
