TOOL CHECK: PASS (read godot/main.gd, godot/export_presets.cfg, godot/data/neighborhood_voices.json, public/*.js, tests/*)

VERDICT: yes-with-fixes. Init order and the import's hosting->civic->film merge order are correct, but there are four problems. (1) Optional (M5) data can wipe M1-M4 progress on load. (2) The M5 suspend/resume API has no lifecycle caller, and its semantics differ from ExperimentHost. (3) Voices records are loaded but never shown. (4) The film state machine does not match public/film.js, even though the brief claims "matching".

MUST-FIX BEFORE BUILD

1. [Scope 4 / Persistence] Optional data can trigger a full-save reset.
   Defect: godot/main.gd:4951-4956. If validate_godot_optional fails, apply_save_envelope calls reset_mural_state_to_defaults("recovered"), which wipes block_opened, epilogue, programme, hosting, civic and film. Optional data is supposed to be isolated from core. The browser treats it that way: public/core.js:173 drops a bad optional blob and keeps core. The Godot inspect path does the same: godot/main.gd:5292-5296.
   Trigger: the Godot cap is measured on Godot's own JSON.stringify output (4832-4833). After a save/load round trip, JSON.parse turns ints into floats, so the re-stringified length can grow past 8192 even though the blob passed at import time (5439).
   [ASSUMPTION] verify: what Godot 4.7.2 JSON.stringify emits for whole-number floats.
   Fix (smallest): at 4951-4956, if validation fails, set opt_res = {"ok": true, "optional": {}} and do not reset.

2. [Scope 3 / M5 suspend-resume] The API exists but nothing calls it.
   Defect: suspend_voices / resume_voices (godot/main.gd:3569-3590) are only called from godot/tests/study_test.gd:835. main.gd has no _notification handler: grep finds no NOTIFICATION_ anywhere in the file. There is also no JS pagehide/pageshow/visibilitychange bridge.
   The browser wires all three: public/game.js:609 (pagehide -> suspend), 610 (pageshow persisted -> resume), 611 (visibilitychange -> silence).
   Fix: add _notification(what) to main.gd. NOTIFICATION_APPLICATION_PAUSED and NOTIFICATION_WM_WINDOW_FOCUS_OUT should call suspend_voices(). NOTIFICATION_APPLICATION_RESUMED should call resume_voices(). On Web, add a JavaScriptBridge.create_callback for pagehide/pageshow in setup_web_a11y_bridge. The alternative is to remove "suspend/resume" from the claimed scope.

3. [Scope 3 / ExperimentHost contract] Suspend/resume/retry behave differently from public/experimental-host.js.
   (a) No generation bump or release on suspend. JS suspend() does ++generation, release() and pending=null (experimental-host.js:25). Godot only stops audio and keeps the old generation and its resources (3569-3579).
   (b) Error state is lost. JS keeps status 'error' through suspend. Godot overwrites it with "suspended" (3576).
   (c) Status names differ. JS uses 'paused'; Godot uses "suspended". This string is exported in the a11y snapshot (4114) and asserted in study_test.gd:835.
   (d) Resume does not reload. JS resume() calls activate(), which reloads (line 26). Godot resume reuses the cached records without revalidating (3585-3589).
   (e) Retry leaves a stale flag. retry_voices_load (3554-3567) never clears voices_suspended, so after a retry status can be "ready" while voices_suspended is still true.
   Fix:
   - suspend: voices_generation += 1; voices_release_resources(); voices_status = "error" if voices_error != "" else "paused".
   - resume: only when status == "paused"; call retry_voices_load().
   - retry_voices_load: set voices_suspended = false.
   - Update study_test.gd:835 to the new behaviour.

4. [Scope 3 / Voices presentation] The data is loaded but never displayed.
   Defect: the only reads of voices_records are .size() (godot/main.gd:4115, 6245) and the count in the toggle message (3541). Name, topic, summary, sourceTitle and url are validated (3428-3451) and then dropped.
   The browser renders the cards plus a required disclaimer (public/experiments/neighborhood-voices.js:45): "dated introduction, not a current service or emergency directory ... No organization endorses ..." Godot shows neither.
   Fix: add a "read" action (for example KEY_SLASH when status == "ready", or a panel button). It should write each record's name, topic, summary, sourceTitle and url plus the same disclaimer text to info.text and announce_a11y_status. Also add a godot-browser.mjs assertion that the disclaimer string reaches the a11y DOM.

5. [Scope 2 / Film state machine] Godot's film flow does not match film.js, despite the claim.
   - JS requires planning -(film-roll)-> hold -(film-clear)-> shooting (public/film.js:46-47). There is no direct planning->shooting step and no hold->planning step.
   - Godot advance_film_step goes from planning straight to shooting (godot/main.gd:3296-3297; film_begin_shooting accepts "planning" at 3207-3209).
   - Godot adds a reverse step, film_resume (hold->planning, 3189-3204).
   - Godot gives "hold" a different meaning. It says "Saved The Open Seat storyboard for another day" (3184), but in JS hold means the crew holds the take while the route clears (film.js:62, Thanh's line).
   Fix:
   - advance_film_step: planning -> film_hold(); hold -> film_begin_shooting().
   - Restrict film_begin_shooting to phase "hold".
   - Delete film_resume, or keep it test-only.
   - Reword the hold message.
   - Update tests/godot-browser.mjs:229-238 from 5 to 6 Period presses and study_test.gd:741-742.
   Browser->Godot import mapping (5256-5291) already matches restoreFilm, so no import change is needed.

SHOULD-FIX

1. [Scope 1-2 / UI -> API wiring] Most civic and film plans cannot be reached from the keyboard or panel.
   - Civic: cycle_civic_choice flips topic, format and notes together (godot/main.gd:3022-3027). Only 2 of the 8 civic plans are reachable.
   - Film: cycle_film_choice_or_frame flips framing and plan together and only moves "seat" (3272-3277). It alternates between exactly 2 of the 24 film plans.
   - Panel: block_civic_btn and block_film_btn only call advance_* (6448, 6452).
   - civic_set_choice, film_set_choice and film_move_shot have no per-field UI caller.
   The browser exposes per-field choices.
   Fix: make Shift+Q / Shift+. step a field cursor (one field per press, then the per-shot move), or add per-field buttons.

2. [Scope 2 / Neighbor memory contract] neighbor_project_memory_line (godot/main.gd:3307-3339) does not match civicResponse/filmResponse (public/civic.js:39-47, public/film.js:58-65). Precedence (film > civic) matches game.js:100, but the inputs and text differ:
   - Bea, civic: Godot keys on notes; JS keys on topic.
   - Celeste, civic: Godot keys on format/topic; JS keys on notes.
   - Dez, film: Godot ignores the plan; JS keys on result.order[2].
   - Celeste, film: Godot keys on order[0]; JS keys on framing.
   - Bea, film, plan=="later": Godot says "Saving the storyboard for next time", which confuses the plan with the hold phase.
   Fix: port the JS strings and keys verbatim.

3. [Scope 4 / Validator failure mode] validate_godot_civic and validate_godot_film reject the whole envelope when gated (4749-4751, 4823-4825) or inconsistent (4743-4748, 4800-4822). The result is a full reset (4940-4950; asserted at study_test.gd:776-778).
   The sibling validators handle the gated case by returning ok with defaults (epilogue 4572-4573, programme 4602-4603, hosting 4707-4708). JS restoreCivic/restoreFilm fall back to idle or planning rather than discarding the save.
   Fix: when gated or inconsistent, return ok with phase "idle" and default draft/result.

4. [Scope 4 / Optional cap units] The brief says "8192-byte cap", but the code uses String.length(), which counts code points (4833, 5295, 5439). The browser uses UTF-16 length (core.js:173). The voices payload correctly uses to_utf8_buffer().size() (3410).
   The same blob can be measured differently on each side, depending on stringify formatting [verify: Godot float/escape formatting].
   Fix: pick one unit, document it, and have the godot-data test assert parity on a numeric-heavy and a non-ASCII blob. MUST-FIX 1 makes a mismatch non-fatal.

5. [Scope 3 / Web settings propagation] On Web, save_godot_settings writes both user:// and localStorage (3362-3371), but load_godot_settings reads only localStorage (3376-3381; the file read is in the elif).
   If localStorage throws (private mode or quota), the preference is written to user:// but never read back, so it silently resets to off on every reload.
   Fix: in Web, fall back to the user:// file when localStorage returns ''. Otherwise stop writing user:// on Web.

6. [Scope 2 / Neighbor arrival] The memory line is dropped on the pending-talk paths. finish_neighbor_arrival computes mem_line (2204), then returns early for Celeste (2210-2212) and Rook (2228-2230) before using it.
   Fix: append mem_a11y inside talk_with_celeste / check_sound_with_rook, or announce it before returning.

OPTIONAL / NICE-TO-HAVE

- The dataset date is hard-coded in three places: godot/main.gd:3423 ("2026-10-18"), public/experiments/neighborhood-voices.js:4, and tests/godot-data.test.mjs:148. Hoist it to a const VOICES_CHECKED_AT and have the data test compare the Godot const to the JS literal, so a dataset refresh can't update only one side.
- Shift+Q writes the save three times (each civic_set_choice calls save_godot_state at 2979; 3025-3027), and Shift+. writes it up to three times. Batch these into one save per keypress.
- When voices_status is "error" or "suspended", block_detail shows "Voices:On" (6245). Show the actual status.

CUT THESE (over-engineering)

1. voices_own_audio, voices_owned_audio and the audio loops in voices_release_resources / suspend_voices (3460-3475, 3573-3575). No AudioStreamPlayer is ever created for Voices outside study_test.gd:831-834, and the feature is text-only ("this version contains no recorded voices", neighborhood-voices.js:45). Safe to cut along with those test lines.

2. Generation-scoped ownership in Godot (voices_owned_resources, the gen checks in voices_own_resource and load_voices_for_generation). The load is a synchronous res:// FileAccess read (3489-3494), so there is no async window in which a stale generation could land. Keep voices_generation only as a snapshot counter. If MUST-FIX 2 adds an async Web bridge later, reintroduce it then.

3. Dead state and aliases with no readers:
   - film_view_index: written at 1226, never read.
   - voices_active_index and voices_cleanup_errors: declared only (328, 331).
   - FILM_SHOT_IDS duplicates FILM_SHOTS; FILM_FRAMINGS duplicates FILM_FRAMING (92-93, 110-111).
   - CIVIC_*_TITLES alias CIVIC_*_LABELS (74, 84, 90).
   Removing them changes no behaviour.

4. voices_custom_json_override and voices_simulate_error are test hooks shipped in the production script (332, 323, 3481, 3491). Gate them behind the --test-suite path that resolve_settings_path already detects, or move them into study_test.gd.
