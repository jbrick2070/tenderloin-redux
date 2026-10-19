# Final Implementation Plan & Verification Summary — `2026-10-19-godot-m4-m5-projects` (`r3`)

## Scope Completed in Godot Round 8 (`2026-10-19-godot-m4-m5-projects`)
1. **M4 Peaceful Tenant Listening Hour (`civic`) in 3D Godot (`godot/main.gd`)**:
   - Unlocks after all 4 M3 hosted afternoon segments complete (`is_hosting_done()`).
   - Phases: `idle -> planning -> meeting -> done` (`advance_civic_step()` via `Q` or `Civic (Q)` button; `cycle_civic_choice()` via `Shift+Q` or `Civ Pick` button steps through all 8 `2 × 2 × 2` combinations of `topic`, `format`, and `notes` with a single save).
   - 3D `CivicListeningSetup` node on the sidewalk outside the protected mobility lane with `CircleGroup` (`format == "circle"`) and `DropinGroup` (`format == "dropin"`), plus shared request card and theme/unrecorded note indicator.
2. **M4 Illustrated Three-Shot Film Short (`The Open Seat`, `film`) in 3D Godot (`godot/main.gd`)**:
   - Unlocks after `civic_phase == "done"`.
   - Phases match `public/film.js`: `idle -> planning -> hold -> shooting -> done` (`advance_film_step()` via `.` or `Film (.)` button; `cycle_film_choice_or_frame()` via `Shift+.` or `Shot/Frm` button steps through all 24 `2 × 2 × 6` combinations of `framing`, `plan`, and 3-shot order in `planning`, or cycles viewer frames `0..2` in `done` without mutating save state).
   - 3D `FilmStoryboardEasel` node displaying 3 shot cards (`seat`, `paint`, `welcome`) in planned order, capture badges, close/wide framing border, and active viewer highlight.
   - Verbatim neighbor remembered responses from `public/civic.js` and `public/film.js` surfaced in `finish_neighbor_arrival()`, `talk_with_celeste()`, and `check_sound_with_rook()`.
3. **M5 Default-Off Experimental Neighborhood Voices (`voices`) in Godot (`godot/main.gd`, `godot/data/neighborhood_voices.json`)**:
   - Default-off optional shelf (`/` or `Voices (/)` button toggles on/off; `Shift+/` retries on error or re-presents the organization profiles when ready).
   - Preference persisted exclusively in `user://godot_block_settings_v1.json` / `tenderloin-redux.godot.settings.v1` (`schema: "tenderloin-redux.godot.settings.v1"`), never in game saves.
   - Lazy-loads `res://data/neighborhood_voices.json` only when enabled, validates exact `version: 1`, `checkedAt: "2026-10-18"`, and allowlisted `tndc`, `glide`, and `larkin` URLs/bounds, and presents all 3 organization profiles plus `"Independent study; not affiliated with or endorsed by listed organizations."` in `info.text` and `announce_a11y_status()`.
   - Generation-scoped lifecycle (`voices_generation`, `suspend_voices()` -> `"paused"`, `resume_voices()` -> `"ready"`, `_notification` + Web `pagehide`/`pageshow` hooks) and non-destructive `optional` save envelope validation (`<= 8192` bytes; invalid/oversized `optional` drops to `{}` without wiping core/M1-M4 progress).
4. **Read-Only Browser Save v1 Adapter (`inspect_browser_save_json`, `merge_browser_save_inspection`)**:
   - Maps `core.civic`, `core.film` (including downgrading `done` with `<3` valid prefix captures to `shooting`), and `optional` (`<= 8192` bytes) from `tenderloin-redux.save.v1` without mutating `tenderloin-redux.save.v1` or auto-enabling M5 Voices.
