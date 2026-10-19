# Driver Judgment — `2026-10-19-godot-m4-m5-projects` (`r3`)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High)
- **Independent Reviewer**: `Claude Opus 5.5` (High, `rc=0`, `kibitz-runs/2026-10-19-godot-m4-m5-projects/r3/claude.md`)
- **Source Verification**: Every finding in `claude.md` was checked directly against `godot/main.gd`, `godot/tests/study_test.gd`, `tests/godot-browser.mjs`, `public/civic.js`, `public/film.js`, `public/experimental-host.js`, and `public/experiments/neighborhood-voices.js`.

## Disposition of Reviewer Findings

### MUST-FIX (5/5 Accepted and Applied)
1. **MUST-FIX 1 (`apply_save_envelope()` rejecting entire save on invalid `optional` data)**:
   - **Verified**: `godot/main.gd:4990-4995` previously called `reset_mural_state_to_defaults("recovered")` if `validate_godot_optional()` failed, whereas `public/core.js:173` drops invalid/oversized `optional` data to `{}` without wiping core/M1-M4 progress.
   - **Action**: Updated `apply_save_envelope()` so that when `validate_godot_optional()` returns `ok == false`, `opt_res` falls back to `{"ok": true, "optional": {}}`, preserving all validated core and M1-M4 state. Added explicit regression assertion in `godot/tests/study_test.gd`.
2. **MUST-FIX 2 (`suspend_voices()` / `resume_voices()` status naming and resource release)**:
   - **Verified**: `public/experimental-host.js:76-89` sets `status = "paused"` on suspend (unless in `"error"`), increments generation + runs cleanup on suspend, and reloads on resume.
   - **Action**: Updated `suspend_voices()` to increment `voices_generation`, call `voices_release_resources()`, and set `voices_status = "error" if had_error else "paused"`. Updated `resume_voices()` to require `voices_status == "paused"` and call `retry_voices_load()`.
3. **MUST-FIX 3 (`suspend_voices()` / `resume_voices()` lifecycle wiring)**:
   - **Verified**: Neither `_notification` nor Web `pagehide`/`pageshow` was wired to `suspend_voices()` / `resume_voices()`.
   - **Action**: Added `_notification(what)` handling `NOTIFICATION_APPLICATION_PAUSED`, `NOTIFICATION_WM_WINDOW_FOCUS_OUT`, `NOTIFICATION_APPLICATION_FOCUS_OUT`, `NOTIFICATION_APPLICATION_RESUMED`, `NOTIFICATION_WM_WINDOW_FOCUS_IN`, and `NOTIFICATION_APPLICATION_FOCUS_IN`, plus Web `pagehide` / `pageshow` (`e.persisted`) hooks in `setup_web_a11y_bridge()` polled in `poll_web_audio()`. Verified in both `godot/tests/study_test.gd` and `tests/godot-browser.mjs`.
4. **MUST-FIX 4 (Presenting M5 Neighborhood Voices organization profiles and non-affiliation disclaimer)**:
   - **Verified**: Enabling Voices previously only announced a count summary without rendering the 3 organization profiles (`name`, `topic`, `summary`, `sourceTitle`, `url`) or the non-affiliation disclaimer (`"Independent study; not affiliated with or endorsed by listed organizations."`).
   - **Action**: Added `VOICES_DISCLAIMER` and `present_voices_summary()` in `godot/main.gd`, called on enable/retry and via `Shift+/` when ready, rendering all 3 organization profiles and `VOICES_DISCLAIMER` in `info.text` and `announce_a11y_status()`. Verified in `godot/tests/study_test.gd` and `tests/godot-browser.mjs`.
5. **MUST-FIX 5 (`film_begin_shooting()` bypassing `"hold"` phase)**:
   - **Verified**: `public/film.js:35-48` requires `planning -> film-roll ("hold") -> film-clear ("shooting") -> done`.
   - **Action**: Restricted `film_begin_shooting()` to `film_phase == "hold"`, updated `film_hold()` and `advance_film_step()` so `planning -> hold -> shooting -> done` is enforced, and removed `film_resume()`.

### SHOULD-FIX (6/6 Accepted and Applied)
1. **SHOULD-FIX 1 (`talk_with_celeste()` and `check_sound_with_rook()` missing `neighbor_project_memory_line`)**:
   - **Action**: Included `neighbor_project_memory_line("celeste")` in `talk_with_celeste()` and `neighbor_project_memory_line("rook")` in `check_sound_with_rook()`, and verified both in `study_test.gd`.
2. **SHOULD-FIX 2 (`cycle_civic_choice()` and `cycle_film_choice_or_frame()` unreachable combinations and triple save)**:
   - **Action**: Updated `cycle_civic_choice()` (`Shift+Q`) to step through all 8 (`2 × 2 × 2`) civic plans with a single `save_godot_state()` call, and updated `cycle_film_choice_or_frame()` (`Shift+.`) in `planning` to step through all 24 (`2 × 2 × 6`) film plans with a single `save_godot_state()` call.
3. **SHOULD-FIX 3 (Verbatim `neighbor_project_memory_line` strings)**:
   - **Action**: Ported `civicResponse` (`public/civic.js:39-47`) and `filmResponse` (`public/film.js:58-65`) verbatim into `neighbor_project_memory_line()`.
4. **SHOULD-FIX 4 (`retry_voices_load()` clearing `voices_suspended`)**:
   - **Action**: Set `voices_suspended = false` in `retry_voices_load()`.
5. **SHOULD-FIX 5 (`update_block_ui()` showing `"Voices:Err"` / `"Voices:Paused"`)**:
   - **Action**: Updated `update_block_ui()` to display `"Voices:Err"` when `voices_status == "error"` and `"Voices:Paused"` when `voices_status == "paused"`.
6. **SHOULD-FIX 6 (Gate test-only Voices error/override hooks behind `is_test_suite_mode()`)**:
   - **Action**: Gated `voices_simulate_error` and `voices_custom_json_override` behind `is_test_suite_mode()` in `load_voices_for_generation()`.

### OPTIONAL & CUT THESE
- **Accepted & Applied**:
  - **OPTIONAL 2**: Added `const VOICES_CHECKED_AT = "2026-10-18"` and used it in `validate_voices_payload()`.
  - **OPTIONAL 3**: Updated `save_godot_state()` to write to `window.localStorage` first on Web and fall back to `FileAccess` only if not written, matching `save_godot_settings()`.
  - **CUT 1, 2, 3, 4**: Removed duplicate `CIVIC_*_TITLES`, `FILM_SHOT_IDS`, `FILM_SHOT_TITLES`, `FILM_FRAMINGS`, dead `film_view_index` / `voices_active_index`, unused `voices_owned_resources` / `voices_owned_audio` / `voices_cleanup_errors`, and `film_resume()`.
- **Kept by Design**:
  - **OPTIONAL 1 (`validate_godot_civic` / `validate_godot_film` when `not allow_civic` / `not allow_film`)**: Kept strict tamper rejection when `ph != "idle"` and `not allow_civic` / `not allow_film` in `validate_godot_civic()` and `validate_godot_film()` (tested in `study_test.gd:770-772`), because rejecting tampered Godot save envelopes that inject `civic.phase = "done"` before `hosting` is completed provides stronger integrity guarantees while still allowing `ph == "idle"`.
