# Review Brief — Godot Round 8 (`2026-10-19-godot-m4-m5-projects`)

## Scope
Audit the Godot 4.7.2 Round 8 implementation (`godot/main.gd`, `godot/data/neighborhood_voices.json`, `godot/export_presets.cfg`, `godot/tests/study_test.gd`, `tests/godot-data.test.mjs`, `tests/godot-browser.mjs`), which carries forward:
1. **M4 Peaceful Tenant Listening Hour** (`civic`, matching `public/civic.js`):
   - Available once `is_hosting_done() == true` (`hosting_results.size() == 4`), never gated on M1 packing/keepsake or M5 experimental data.
   - `CIVIC_TOPICS = ["repairs", "access"]`, `CIVIC_FORMATS = ["circle", "dropin"]`, `CIVIC_NOTES = ["themes", "none"]`, `CIVIC_PHASES = ["idle", "planning", "meeting", "done"]`.
   - `civic_start()` transitions `idle -> planning`; `civic_set_choice(field, value)` updates `civic_draft` only during `planning`; `civic_convene()` transitions `planning -> meeting`; `civic_complete()` freezes `civic_result = copy_civic_plan(civic_draft)` and transitions `meeting -> done`.
   - `cycle_civic_choice()` (`Shift+KEY_Q`) cycles `(topic, format, notes)` in `planning`; `advance_civic_step()` (`KEY_Q` / `BlockPanel` button) advances `idle -> planning -> meeting -> done`.
   - 3D props: `CivicListeningSetup` (`civic_setup_node`, `civic_circle_group`, `civic_dropin_group`, `civic_done_beacon`).
2. **M4 Illustrated Three-Shot Film Short (`The Open Seat`)** (`film`, matching `public/film.js`):
   - Available once `civic_phase == "done"` and `is_valid_civic_plan(civic_result)`, never gated on M1 packing/keepsake or M5 experimental data.
   - `FILM_SHOT_IDS = ["seat", "paint", "welcome"]`, `FILM_FRAMINGS = ["close", "wide"]`, `FILM_PLANS = ["quiet", "later"]`, `FILM_PHASES = ["idle", "planning", "hold", "shooting", "done"]`.
   - `film_start()`, `film_set_choice()`, `film_move_shot()`, `film_hold()`, `film_resume()`, `film_begin_shooting()`, `film_capture_shot()`, `film_set_screen_frame()`, `cycle_film_choice_or_frame()` (`Shift+KEY_PERIOD`), and `advance_film_step()` (`KEY_PERIOD` / `BlockPanel` button).
   - 3D props: `FilmStoryboardEasel` (`film_storyboard_node`, `film_frame_canvas`, `film_wide_border`, `film_shot_pips`).
   - Neighbor remembered responses (`neighbor_project_memory_line(nid)`) surfaced on neighbor arrival (`finish_neighbor_arrival()`).
3. **M5 Default-Off Experimental Neighborhood Voices & Isolated Settings** (`voices_*`, matching `public/experiments/neighborhood-voices.js` and `public/experimental-host.js`):
   - `godot/data/neighborhood_voices.json` matches `public/experiments/neighborhood-voices.json` (`version: 1`, `checkedAt: "2026-10-18"`, 3 verified records `tndc`, `glide`, `larkin`).
   - Starts default-off (`voices_enabled == false`, `voices_status == "off"`).
   - Preference stored in a separate settings store (`user://godot_block_settings_v1.json` / `user://godot_block_settings_test_v1.json` and Web `localStorage['tenderloin-redux.godot.settings.v1']`), NEVER inside game saves (`tenderloin-redux.godot.save.v1`), and importing a browser save (`tenderloin-redux.save.v1`) with `optional` data never auto-enables Voices.
   - Generation-scoped resource ownership (`voices_own_resource`, `voices_own_audio`, `voices_release_resources`), error containment (`voices_simulate_error`, `retry_voices_load`), and suspend/resume (`suspend_voices`, `resume_voices`).
4. **Persistence & Browser Save Adapter**:
   - Strict Godot v1 save validation (`validate_godot_civic`, `validate_godot_film`, `validate_godot_optional` with 8192-byte cap).
   - Read-only browser v1 save (`tenderloin-redux.save.v1`) inspection and monotonic merge of `civic`, `film`, and `optional` in `inspect_browser_save_json()` / `import_browser_save_json()`.

## Files to Inspect
- `godot/main.gd`
- `godot/data/neighborhood_voices.json`
- `godot/export_presets.cfg`
- `godot/tests/study_test.gd`
- `tests/godot-data.test.mjs`
- `tests/godot-browser.mjs`

## Questions for Reviewer
1. Are there any logic bugs, state-leak edge cases, or discrepancies between `public/civic.js` / `public/film.js` / `public/experiments/neighborhood-voices.js` / `public/experimental-host.js` and `godot/main.gd`?
2. Are there any bypasses or type-confusion bugs in `validate_godot_civic`, `validate_godot_film`, `validate_godot_optional`, `validate_voices_payload`, `inspect_browser_save_json`, or `import_browser_save_json`?
3. Are all 3D visual nodes (`civic_setup_node`, `film_storyboard_node`), neighbor project memories, and UI controls properly synchronized across resets, reloads, and imports?
