Review the changes in `C:\tenderloin-redux\godot\main.gd` and `C:\tenderloin-redux\godot\tests\study_test.gd` for the `2026-10-20-story-surprises-character-ui` round (`git diff HEAD -- godot/main.gd godot/tests/study_test.gd`).
 DO NOT edit any files in the repository (read-only review).

Focus on:
1. The 10 neighborhood surprise discoveries (`NEIGHBORHOOD_SURPRISE_IDS`, `NEIGHBORHOOD_SURPRISES`, `build_neighborhood_surprises()`, `inspect_neighborhood_surprise()`, `cycle_neighborhood_surprise()` via `Shift+D`, and `handle_scene_tap()`).
2. Character Talk UI (`apply_character_panel_theme()`, `NEIGHBOR_STORY_BADGES`, turn counters `Turn X/5`, and `Sparks: N` in `update_mural_ui()`, `update_music_ui()`, and `update_block_ui()`).
3. Feel-good engagement bursts (`RewardBanner`, `CelebrationBurst`, `trigger_feel_good_burst()`, `update_celebration_burst()`, `spark_count()`, and 3-note rising arpeggio chimes in `trigger_progress_cue()` / `advance_music_clock()`).
4. Save/reload persistence of `discovered_surprises` in `build_save_envelope()`, `apply_save_envelope()`, and `reset_mural_state_to_defaults()`.

Report any Must-Fix, Should-Fix, or Cut items with exact file and line numbers.
