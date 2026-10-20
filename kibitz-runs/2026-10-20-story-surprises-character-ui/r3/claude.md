TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs directly). Note: no shell available, so `git diff HEAD` was not run; I could not separate new lines from pre-existing ones. Findings cite current line numbers. Where I say "new", verify against the diff.

VERDICT: yes-with-fixes. Nothing crashes and the save/load round-trip is wired correctly, but the reward-burst event wiring fires on repeat actions, the Turn counter and the dialogue index use different formulas, and Sparks is computed from state that isn't saved.

MUST-FIX BEFORE BUILD

1. [Feel-good bursts / trigger_progress_cue] Bursts fire on every repeat interaction, not only on progress.
   - The burst match in godot/main.gd:9137-9194 maps "neighbor_visit", "celeste_talk" and "rook_soundcheck" to "New Neighbor Connected", "Artist Spark — Connected with Celeste" and "Soundcheck Locked In".
   - Every caller of these cues fires unconditionally:
     - talk_with_neighbor at main.gd:7302, on every talk.
     - finish_neighbor_arrival at main.gd:7347. This one runs even when newly_visited is false (7339-7342).
     - talk_with_celeste at main.gd:7552.
     - check_sound_with_rook at main.gd:7588, which runs on every Rook chat.
   - Effects:
     - Talking to Bea a 6th time shows "New Neighbor Connected — Bea" again.
     - Arriving and then talking emits two bursts back to back, and the second overwrites the first.
     - The same applies to "mural_palette" (main.gd:9984 → 9159), which bursts on every palette cycle.
   - Fix (smallest): capture the first-time state before mutating it, and wrap each cue in the existing suppress flag:
     - talk_with_neighbor: `var first := not visited_neighbors.has(n_id)` before line 7296.
     - finish_neighbor_arrival: use the `newly_visited` value it already computes.
     - Celeste: `celeste_talk_count == 1` after the increment.
     - Rook: `var was_done := rook_soundcheck_done` before line 7579.
     - Then `suppress_feel_good_burst = not first`, call trigger_progress_cue, and restore the flag. This leaves the music stem/chime path (9093-9131) unchanged.

2. [Character Talk UI / Turn X/5] The Turn counter and the dialogue line that is actually shown use different formulas.
   - The labels clamp:
     - main.gd:12230 `clampi(maxi(1, celeste_talk_count), 1, 5)`
     - main.gd:12249 (rook)
     - main.gd:12281 (neighbors)
   - The dialogue wraps:
     - main.gd:7476 and 7490 `posmod(maxi(1, count) - 1, options.size())`
     - main.gd:7284 (neighbors)
   - From the 6th talk on, the label stays at "Turn 5/5" while the line shown is option 1 again.
   - The "/5" is also hard-coded. It only matches because every options array currently has 5 entries (7229-7273, 7469-7475, 7483-7489).
   - Fix: compute `posmod(maxi(1, count) - 1, 5) + 1` in all three labels, or better, a shared helper used by both the label and the dialogue functions.
   - Related: mural_completed (7467, 7481) and Rook's local-music mode (7479) bypass the options array, but the label still shows a Turn number. Suppress "Turn" in those branches.

3. [Sparks: N / spark_count vs save envelope] Sparks goes down after a reload.
   - spark_count() at main.gd:5179 adds `eatery_visited.size()`.
   - eatery_visited (main.gd:810, set at 7153) is not written by build_save_envelope (main.gd:10039-10092) and not restored by apply_save_envelope (10686-10725).
   - Every other input of spark_count is persisted, so the HUD count is not stable across reloads: a player with N sparks reloads and sees N minus the number of eateries visited.
   - Fix (pick one):
     - (a) Persist `eatery_visited` as a sorted id list, using the same lax-filter pattern as discovered_surprises (10044-10049 / 10693-10698), filtered against NEIGHBORHOOD_EATERIES ids.
     - (b) Remove eatery_visited from spark_count.
   - Either way, re-check the 4096-byte budget (see SHOULD-FIX 6).

4. [Objective hint contract] The hint text says there are 4 surprises; the data has 10.
   - main.gd:5430: hint "Spot the 4 neighborhood surprises (Shift+D)".
   - NEIGHBORHOOD_SURPRISE_IDS has 10 entries (main.gd:261-272), and the test asserts 10 (study_test.gd:1468).
   - Fix: `"Spot the %d neighborhood surprises (%d found)" % [NEIGHBORHOOD_SURPRISE_IDS.size(), discovered_surprises.size()]`.

SHOULD-FIX

1. [inspect_neighborhood_surprise] Revisiting a surprise is treated as a new discovery.
   - main.gd:5140-5159 unconditionally:
     - sets discovered,
     - calls save_godot_state() (increments save_seq and writes localStorage/file),
     - plays the surprise_discovery cue,
     - shows the "Surprise Found" banner.
   - Shift+D cycles through all 10 indefinitely (5169-5176), so after the first pass every press re-celebrates an old find and writes to disk.
   - Fix: `var newly := not discovered_surprises.has(s_id)` before line 5140. Only save, cue and burst when `newly`. The camera, bubble and info text can stay unconditional.

2. [Save contract asymmetry: Turn counters] Some talk counters persist and others don't.
   - celeste_talk_count is persisted (main.gd:10054, 10686).
   - rook_talk_count and neighbor_talk_counts are not (declared at 508-509, cleared at 10112-10113, absent from 10039-10092).
   - After a reload Celeste resumes at Turn N while Rook, Bea, Dez and Thanh restart at Turn 1 and repeat line 1.
   - Fix: persist both (small int + dict of 5 ints), or document that only Celeste persists. The visible Turn counter added in this change is what makes this inconsistency noticeable.

3. [Sparks label refresh wiring] Sparks labels go stale after some updates.
   - Sparks is shown in three labels (12231, 12250, 12282/12285), but there is no single refresh point.
   - inspect_neighborhood_surprise refreshes:
     - the block label (5160),
     - the music label, indirectly via trigger_progress_cue → update_music_ui (9197).
   - It never refreshes mural_label, so the mural panel can show a stale Sparks value.
   - cycle_eatery_guide increments a spark input (7153) and calls none of update_mural_ui, update_music_ui or update_block_ui.
   - Fix: call update_mural_ui(), update_music_ui() and update_block_ui() at the end of trigger_feel_good_burst (5276), or add a refresh_spark_labels() and call it wherever a spark input changes.

4. [Web a11y bridge] Surprises and Sparks are missing from the snapshot.
   - get_a11y_status_snapshot (main.gd:9776-9816) has no `surprises_found` or `sparks`.
   - tests/godot-browser.mjs reads only that snapshot and the raw localStorage key. Neither checks discovered_surprises, and parsedSave assertions at 400-421 don't cover it.
   - So Web localStorage persistence of the new key is untested, and screen-reader users have no Sparks state.
   - Fix: add `"surprises_found": discovered_surprises.size(), "sparks": spark_count()` to the snapshot, and add one Shift+D → reload assertion in godot-browser.mjs.

5. [handle_scene_tap priority] The surprise hit-test is ordered and scored differently from every other target.
   - The surprise branch (main.gd:11661-11669) doesn't take part in the `best_screen_d` comparison that the mural, speaker and history branches use (11634, 11639, 11644, 11649).
   - It also runs after the So What easter-egg screen tests (11651-11654), which use only a 28px screen radius and no world-distance gate.
   - hidden_mural_145 has raw pos (-284.5, 95.8), about 7 m in XZ from the leav_ee anchor Vector3(-290.8, 24.6, 99.4). At some yaw/pitch, taps aimed at the surprise may resolve to inspect_so_what_easter_egg instead.
   - verify: on-screen separation at view_size 52 after the sidewalk snap in surprise_sidewalk_site.
   - Fix: score surprises by screen distance in the same best-candidate comparison, before the fixed-radius easter-egg checks.

6. [Save budget test ordering] The 4096-byte budget is not tested in the worst case.
   - The budget check that runs on a full M1-M4 state (study_test.gd:937 via measure_local_performance, main.gd:9703-9707) runs before any surprise is discovered.
   - The new check at study_test.gd:1491 runs after reset_mural_state_to_defaults at 1465, so the state is mostly empty.
   - Full M1-M4 + 10 surprise ids (~230 bytes added) + optional data is never measured against SAVE_BUDGET_MAX_BYTES (main.gd:102).
   - verify: current full-state byte count.
   - Fix: discover all surprises before the line-937 perf check, or build the line-1491 envelope from a full state.

7. [Build order / placement contract] Surprise placement doesn't avoid other surprises or later-built props.
   - surprise_sidewalk_site's avoid list (main.gd:4812-4817) covers the mural, speaker, Compton's, Black Hawk, player start, neighbors and eatery counters.
   - It does not include surprise_points already placed in the same loop (4852-5103).
   - build_gathering_layouts runs after it (main.gd:1881), and street trees and light pools run before it (1877-1878); neither is in the avoid list.
   - verify: build_gathering_layouts/street trees avoid surprise_points.
   - Fix: append `surprise_points.values()` to `avoid` inside the loop. The fallback at 4830-4831 also skips the clash check; at least log when it is used.

8. [neighbor_visit burst position] The burst can appear at the wrong position.
   - The burst position and accent come from `arrived_neighbor` (main.gd:9141-9143), but the cue only receives `n.name` as `reason` (7302).
   - talk_to_nearby_neighbor (5567-5586) and the panel paths can talk to a neighbor other than arrived_neighbor. The burst then appears at the player position or at the wrong neighbor.
   - Fix: pass the index, or set arrived_neighbor before the cue.

OPTIONAL / NICE-TO-HAVE
- main.gd:9115: clown_horn_walker's arpeggio [440, 554.37, 440] is not "rising", which contradicts the stated 3-note rising chime. Use [440, 554.37, 659.25] if the spec matters.
- Chime timing:
  - advance_music_clock picks the arpeggio note once per call in wall-clock delta (main.gd:9283-9288), then stamps that frequency on the whole generator chunk (frames_available, 9292-9293, 9324-9325).
  - Note edges are quantized to process frames, about 16 ms at 60 fps, which is acceptable.
  - A per-sample countdown would make them exact, and the timer would then match the sample timeline the audio is actually generated on.
- The chime is only audible when `music_playing and music_mode == "sketch"` (main.gd:9130). With music off, a surprise discovery is silent. This is acceptable but undocumented.
- apply_save_envelope (10686-10745) doesn't reset surprise_guide_idx or hide the banner/burst, while reset_mural_state_to_defaults does (10122-10128). This is harmless at boot because overview() at main.gd:1900 hides both. Mirror it for future mid-session loads.
- The discovered_surprises loader (10694-10698) silently drops a malformed entry, while every other field hard-fails to "recovered". This is the right choice for an additive key under GODOT_SAVE_VERSION 1; add a comment so nobody "tightens" it into a save-wiping failure.
- Visual stacking at a surprise: the speech bubble (5149, SPEECH_BUBBLE_HEIGHT_M+0.35), the CelebrationBurst label (world_pos+2.2, rising to +1.25..2.74 above that; 5157, 5328) and SurpriseLabel (~3.95, e.g. 5098) all sit in the same vertical band. [ASSUMPTION] they overlap on mobile widths. verify with the 390/320 px capture.

CUT THESE
1. The suppress wrapper in inspect_neighborhood_surprise (main.gd:5150-5151, 5153) does nothing. trigger_progress_cue has no "surprise_discovery" branch in its burst match (9137-9194), so there is nothing to suppress, and cutting it changes no behaviour. Keep the `suppress_feel_good_burst` flag itself if you use it for MUST-FIX 1. Otherwise, the cleaner single-path option is a "surprise_discovery" branch in the burst match, which also removes the second trigger_feel_good_burst call at 5154.
2. These variables are written but never read anywhere in main.gd, study_test.gd or tests/ (grep):
   - reward_burst_count (838, 5279)
   - last_reward_title (839, 5280)
   - last_reward_detail (840, 5281)
   - celebration_burst_origin (846, 5293)
   Delete them, or put reward_burst_count/last_reward_title into the a11y snapshot (SHOULD-FIX 4) so they become test hooks.
3. reward_banner_age (837, 5289, 5305) is incremented but never used for anything; the fade uses reward_banner_timer (5308-5309). It is safe to delete.
