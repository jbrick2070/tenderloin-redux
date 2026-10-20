TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot, godot/export_presets.cfg). I had no shell, so I did not run git diff. Every claim below comes from reading the current working-tree files. I ran no gates.

VERDICT: yes-with-fixes. Two wiring defects. (1) Most of the user-visible "reward" moments never call the sound path, so the browser gate's own assertion should fail. (2) The startup Start-to-zoom contract is silently cancelled by a viewport resize. Everything else is sequencing and focus hardening.

MUST-FIX BEFORE BUILD

1. [trigger_progress_cue -> play_reward_sound] The sound is only reachable from inside the burst-title guard.
   Evidence:
   - godot/main.gd:9963-9964 calls play_reward_sound(cue_id) only `if not burst_title.is_empty()`.
   - The burst_title match at godot/main.gd:9859-9962 has no branch for "surprise_discovery", "surprise_finale" or "eatery_order". Those cues raise their banners by calling trigger_feel_good_burst directly, at godot/main.gd:5444 (surprise) and godot/main.gd:5030 (eatery "Order Up").
   - trigger_feel_good_burst (godot/main.gd:5592-5616) never plays a sound.
   Result:
   - All ten keepsake discoveries, the 10/10 finale and first eatery orders are silent.
   - The arpeggio table entries for those cues are dead config: godot/main.gd:9826-9828, 9838-9847 (including the reason-specific "mayor_pomp_event"/"clown_horn_walker" variants, keyed on the s_id that 5443 passes as reason) and 9848.
   - tests/godot-browser.mjs:415 asserts reward_sound_count == before + 1 after each Shift+D discovery (except found==2). Per current code the count stays flat, so I expect that gate to fail. Verify against the driver's gate output.
   - The native suite cannot catch this: it only exercises "mural_motif" (godot/tests/study_test.gd:304-331, 386).
   Smallest fix: right after the burst_title match, play when `not suppress_feel_good_burst and (not burst_title.is_empty() or cue_id in ["surprise_discovery", "surprise_finale", "eatery_order"])`, and remove the call from inside the guard. Add a native assertion that inspect_neighborhood_surprise on a new id increments reward_sound_count and a repeat id does not.

2. [_ready / continue_story vs resize_controls -> refit_after_layout -> overview] A viewport resize while the startup card is up kills the orientation path.
   Chain:
   - resize_controls calls refit_after_layout() whenever in_overview (godot/main.gd:13652-13653). The startup state is in_overview, because _ready calls overview() at 1951 before showing the card at 1955.
   - refit_after_layout awaits 2 frames and then calls overview() (godot/main.gd:13036-13040).
   - overview() calls hide_story_card() (godot/main.gd:12887), which sets startup_story_pending = false (godot/main.gd:6551).
   Result: any size_changed during the startup card dismisses it, and "Start Exploring" can no longer frame the player. Triggers include mobile rotation, address-bar collapse, desktop window resize, or a late web canvas resize near load.
   - If size_changed fires within the two frames _ready awaits (1949-1950), refit's own 2-frame await can land just after show_story_card. That would hide the card at boot. [ASSUMPTION: web canvas resize timing. Verify on a real mobile browser.]
   - The native test hides this: godot/tests/study_test.gd:1986-1992 resizes, re-runs overview(), awaits, then calls show_story_card and sets startup_story_pending = true by hand.
   Smallest fix: in refit_after_layout, capture `var card_up := is_story_card_visible()` and `var pending := startup_story_pending` before overview()/wide_overview(). Afterwards restore story_card.visible, startup_story_pending and layout_story_card().
   Test: on a freshly instantiated main.tscn, change root.size while the card is up, await 3 frames, assert the card is visible and pending is still true, then press and assert oriented.

SHOULD-FIX

3. [continue_story vs follow loop: coordinate contract] Start framing and the follow loop use different targets.
   - continue_story sets target = player.position (the player's own y) and then pans so the avatar sits at 60% of the play area (godot/main.gd:6565-6569).
   - Every follow update resets target = Vector3(player.x, 1.0, player.z): advance_walk at godot/main.gd:12187-12189, and 7589, 7965, 8040, 8074.
   Result: the first step after Start throws away the pan and the y offset, and the camera visibly snaps.
   Fix: either drop the pan and use the same Vector3(x, 1.0, z) target, or store a follow screen offset that the follow loop reuses. tests/godot-browser.mjs:70 and godot/tests/study_test.gd:1998 only check "inside the play area", so they still hold. Verify with the 320x667 screenshot.

4. [_unhandled_input / _physics_process vs startup_story_pending] Movement keys on the startup card skip the requested zoom.
   - Any non-accept key hides the card and clears pending (godot/main.gd:12605-12609).
   - _physics_process walks the player from raw key state regardless of the card (godot/main.gd:12403-12427).
   - The camera stays in overview, because the follow at 12187 requires following_player.
   Result: the most natural first input (WASD or arrows) moves the avatar off-screen instead of zooming to it.
   Fix: in the story-card branch of _unhandled_input, if startup_story_pending and k is a movement key, call continue_story() and let the key fall through (don't return).

5. [story card keyboard acceptance vs GUI focus] Enter/Space can land on the wrong button.
   - Nothing calls grab_focus anywhere in godot/main.gd. The only focus call is release_focus at 12424.
   - The new RewardSoundsToggle (godot/main.gd:13373-13382) keeps Button's default focus mode [verify: Godot 4.7 BaseButton default FOCUS_ALL]. Once clicked, it takes ui_accept: Enter/Space re-toggles Sounds instead of reaching the "Start Exploring" handler at 12606-12607.
   - While it has focus, arrow-key walking is also disabled (gated on gui_get_focus_owner() == null at 12413).
   Smallest fix: story_continue_btn.call_deferred("grab_focus") in show_story_card. Hidden buttons drop focus when the card hides.

6. [_input audio unlock vs browser user activation] The unlock fires on events browsers don't count as user activation.
   - godot/main.gd:12599 unlocks on any pressed InputEventMouseButton, which includes wheel buttons (Godot emits these as pressed). It also unlocks on KEY_ESCAPE and on InputEventScreenTouch pressed (touchstart).
   - Chromium does not count wheel, Escape or touchstart as user activation. Result: reward_audio_unlocked = true while the AudioContext may still be suspended.
   - The snapshot's reward_sound_count then increments for sounds nobody heard (godot/main.gd:3142).
   - With PLAYBACK_TYPE_STREAM (godot/main.gd:3105) and thread_support=false (godot/export_presets.cfg:12), the note may be mixed late, when the context resumes. That is a "queued effect". [ASSUMPTION: Godot 4.7 web resume behaviour. Verify.]
   Fix:
   - Mouse: unlock only for button_index LEFT, RIGHT or MIDDLE.
   - Keys: exclude KEY_ESCAPE.
   - Touch: unlock on touch release (pressed == false).
   - Test: add a browser case where a wheel event comes first, then assert reward_audio_unlocked stays false.

7. [save_godot_settings vs load_godot_settings, web branch] Save and load use different storage fallbacks.
   - On web, save falls back to the settings_path file when localStorage.setItem fails (godot/main.gd:9547-9556).
   - Load on web never reads that file, because the file read is in an `elif` (godot/main.gd:9562-9567).
   Result: with storage blocked (e.g. a private window), the Sounds: Off preference reports a successful save but is never restored. This is pre-existing for Voices and now also affects Sounds.
   Fix: change the elif to `if raw_str.is_empty() and not settings_path.is_empty() and FileAccess.file_exists(settings_path)`.

8. [tests: real startup sequencing] The native orientation test never goes through _ready.
   - godot/tests/study_test.gd:1991-1995 sets startup_story_pending by hand and fires the button with emit_signal("pressed"). That skips the real order at godot/main.gd:1947-1957, the keyboard path at 12606, and the focus behaviour.
   - The browser test only covers a click (tests/godot-browser.mjs:65) and Enter after reload (543).
   Add a native fresh-instance check: after 3 frames, assert startup_story_pending and is_story_card_visible(). Then send KEY_SPACE via _unhandled_input and assert oriented, with player.position unchanged and the save envelope unchanged.

OPTIONAL / NICE-TO-HAVE
- Narrow title row: the header's inner width at 320px is about 280px. That is the 12/-12 offsets at godot/main.gd:13358-13359 plus the 8px panel margins at 13348-13349, against the 94px minimum Sounds button and 18pt "TENDERLOIN REDUX" (13600-13601). The title will probably wrap to two lines and shrink the play area. Verify against artifacts/godot-320-start-oriented.png.
- continue_story runs update_occlusion(true) twice: once via follow_player at godot/main.gd:12255 and again at 6571. Harmless, but one call can go.
- tour_complete fires from _process (godot/main.gd:5775-5787), so its sound plays after the banner finishes rather than on input. That is acceptable, but note it as the one reward sound that isn't triggered directly by input.

CUT THESE (over-engineering)
1. The reason-specific surprise arpeggio variants (godot/main.gd:9839-9847). Cut them if MUST-FIX 1 is not taken: today they are unreachable, so removing them changes nothing. If MUST-FIX 1 is taken, keep them, because they become live.
2. The 60% screen-pan in continue_story (godot/main.gd:6567-6569). The follow loop discards it on the first step (SHOULD-FIX 3), and both tests only assert "player inside the play area". It is safe to remove.
