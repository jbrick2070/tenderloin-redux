# Consolidated r3 Judgment — `2026-10-20-all-neighbor-surprise-keepsakes`

## Reviewer Receipt
- **Reviewer**: Native Claude CLI (`--driver agy --only claude`, `model=claude-opus-5-5`, `effort=high`, `rc=0`)
- **Output file**: `kibitz-runs/2026-10-20-all-neighbor-surprise-keepsakes/r3/claude.md`
- **Verdict**: `yes-with-fixes`

## Source-Verified Findings & Dispositions
1. **[MUST-FIX 1] `inspect_neighborhood_surprise()` clearing stale `last_panel_dialogue` when newly discovered surprise is paired with a different neighbor (`godot/main.gd:5363-5372`)**:
   - **Verified**: Confirmed. When a neighbor's both paired surprises were already found (`2/10`), `ask_whats_next()` set `last_panel_dialogue` to point to the next overall undiscovered surprise (`jeffrey_record`, paired with `"rook"`), and clicking `"Spot Surprise"` discovered `jeffrey_record` without clearing `last_panel_dialogue` on Bea's open panel.
   - **Action**: Added `else: last_panel_dialogue = ""` inside `if newly_discovered:` when `active_panel_n_id != paired_n_id`, and added a regression assertion in `godot/tests/study_test.gd` verifying `last_panel_dialogue == ""` and `not study.block_detail_label.text.contains("Next, check out Jeffrey")` after clicking `"Spot Surprise"` on Bea's fallback hint.
2. **[SHOULD-FIX 1] Shared `block_panel_neighbor_idx()` and `active_panel_neighbor_idx()` helpers (`godot/main.gd:5301-5317`)**:
   - **Verified**: Confirmed. Extracted `block_panel_neighbor_idx()` and `active_panel_neighbor_idx()` and used them across `inspect_neighborhood_surprise()`, `ask_whats_next()`, and `update_block_ui()` so the active speaker resolution cannot diverge.
3. **[SHOULD-FIX 2] Reset `last_panel_dialogue = ""` in `apply_save_envelope()` (`godot/main.gd:11098`)**:
   - **Verified**: Confirmed. Added `last_panel_dialogue = ""` alongside `discovered_surprises.clear()` in `apply_save_envelope()` so save restoration clears any pre-restore panel hint.
4. **[SHOULD-FIX 3] Include `keepsake_suffix` in `announce_a11y_status()` (`godot/main.gd:5382`)**:
   - **Verified**: Confirmed. Added `keepsake_suffix` to `announce_a11y_status()` in `inspect_neighborhood_surprise()` so screen-reader announcements include the unlocked keepsake payoff.
5. **[SHOULD-FIX 4] Reuse `next_undiscovered_surprise_for_neighbor(speaker)` in `ask_whats_next()` (`godot/main.gd:5849-5853`)**:
   - **Verified**: Confirmed. Replaced the inline duplicate loop in `ask_whats_next()` with `next_undiscovered_surprise_for_neighbor(speaker)` so the spoken hint and `"Spot Surprise"` button always target the exact same surprise.
6. **[SHOULD-FIX 5] Test `MuralPanel`-open discovery of `hidden_mural_145` (`godot/tests/study_test.gd:1545-1546`)**:
   - **Verified**: Confirmed. Added test coverage opening `MuralPanel` and calling `inspect_neighborhood_surprise("hidden_mural_145")`, verifying `hidden_mural_sketch_node.visible`, `last_panel_dialogue.begins_with("Celeste: \"")`, and `mural_detail_label.text.contains("145 Leavenworth")`.
