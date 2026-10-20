TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot directly)

VERDICT: yes-with-fixes. The control wiring is sound: the label comes only from current_path, every route start/clear path goes through update_route_ribbon, press-mode dispatch is correct, and a button release can't reach handle_scene_tap. But Stop leaves selected_neighbor pointing at the cancelled target. That makes E, T, R and "Soundcheck w/ Rook" silently do nothing after a Stop, and no test checks what happens after a Stop.

MUST-FIX BEFORE BUILD:

1. [Implementation: "Existing selected_neighbor semantics remain"] Stale selected_neighbor turns the deferred-talk gates into dead input after Stop.
   - stop_walking (godot/main.gd:12458-12469) clears current_path, walking_to_*, and pending_* but not selected_neighbor.
   - Three gates still treat `selected_neighbor == X` as "a route to X is in progress":
     - request_rook_soundcheck, main.gd:8390: `if selected_neighbor == rook_index or walking_to_speaker: pending_rook_talk = true; return true`
     - KEY_E, main.gd:13009: `elif selected_neighbor == celeste_index or walking_to_mural: pending_celeste_talk = true`
     - KEY_T, main.gd:13024: same check as KEY_E.
   - Repro, from the doc's own Native fixture "rook": request_rook_soundcheck() → Stop → request_rook_soundcheck() again. It sets pending_rook_talk = true and returns true, but there is no route, no movement and no message. The same happens through the "Soundcheck w/ Rook" block button (main.gd:13928), and for E/T after Stop on a Celeste route started via walk_to_neighbor(celeste_index) (main.gd:13012).
   - Escape could already cause this, but the permanent one-tap control makes it a common touch path. The doc keeps selected_neighbor on purpose so Walk & Talk keeps cycling (choose_next_neighbor, main.gd:7549-7554), so don't clear it.
   - Smallest fix: add `not current_path.is_empty() and` to the selected_neighbor test in all three gates (8390, 13009, 13024). Walking cycles stay as they are. This also fixes the same dead state after a mid-route "Route blocked" (main.gd:12443-12452 also leaves selected_neighbor set).

2. [Native checks] The stop-case loop (godot/tests/study_test.gd:215-235) only checks that things stopped. It never checks that the next action works.
   - Add a post-stop re-request to the "rook" case: after activate_walk_control(), call request_rook_soundcheck() and require `not current_path.is_empty() or arrived_neighbor == rook_index`.
   - Add the same for Celeste using a walk_to_neighbor(celeste_index) fixture followed by `_unhandled_input(KEY_E)`.
   - Without these, MUST-FIX 1 ships with a green suite.
   - The doc's "deferred Rook soundcheck ... no later advance" result is accurate, but it doesn't cover this.

SHOULD-FIX:

1. [Implementation: "retained walk_control reference"] main.gd:13960-13961 finds the control by position: `walk_control = controls.get_child(5) as Button`.
   - If a button is added before it, action_mode = ACTION_MODE_BUTTON_PRESS and the label switching land on the wrong control, and nothing fails at runtime.
   - Fix: make button() (main.gd:14074) return the Button, as mural_button and music_button already do (main.gd:14086, 14100), and assign the return value.
   - The tests have the same coupling: study_test.gd:2093 (get_child(5)) and godot-browser.mjs:126 (hard-coded `.75/.83, height-38` click). At least the native test should use study.walk_control.

2. [Native checks: "Real ui_accept press/hold/release"] The test (study_test.gd:2116-2128) uses synthetic InputEventAction, holds for one frame, and sends no echo.
   - A held Enter/Space on real hardware produces echo InputEventKey presses. Press-mode depends on echo presses not re-firing `pressed` after the label has flipped to Walk & Talk.
   - verify: Godot 4.7.2 BaseButton::gui_input excludes is_echo() from ui_accept dispatch (version from godot/project.godot:7 and scripts/run-godot.mjs:5).
   - Add one InputEventKey(KEY_ENTER, pressed=true, echo=true) between press and release, then require current_path is still empty. Otherwise drop "hold" from the claim.

3. [Browser checks] Arrival can race the click in godot-browser.mjs:145-155.
   - The snapshot is read at 145, then the test does mouse.move and mouse.down. The web build walks at 2.2x speed (main.gd:12770).
   - If Thanh arrival happens first, the press runs Walk & Talk (Next) and the waitForFunction at 152 times out. That fails safely but is flaky.
   - Fix: before pressing, require that the remaining distance to Thanh is above a margin. Or use a guaranteed-long route, as the native test does with walk_to_black_hawk (study_test.gd:2111).

4. [Implementation] Stale selected_neighbor also feeds non-input consumers after Stop:
   - update_occlusion keeps adding the cancelled neighbor as a focus point (main.gd:12563, 12589-12596). stop_walking also never calls update_occlusion, so the cutaway stays aimed at the old target until the next movement.
   - block_panel_neighbor_idx falls back to selected_neighbor (main.gd:5498-5499).
   - Fix: call update_occlusion(true) inside the `if was_walking` branch of stop_walking. The block-panel fallback can stay if MUST-FIX 1 is accepted.

5. [Implementation: ACTION_MODE_BUTTON_PRESS] The button keeps keyboard focus after a click (focus_mode FOCUS_ALL, main.gd:14080). While it has focus:
   - Arrow-key walking is disabled. It is gated on `gui_get_focus_owner() == null` (main.gd:12743); WASD still works and releases focus (12753-12754).
   - A following Space/Enter goes to the focused control, which is now Walk & Talk, and starts a new route.
   - So "click Stop, then press Enter" starts walking again. This affects other buttons too, but the toggling label makes it confusing here.
   - Fix: after stop_walking runs from activate_walk_control, call walk_control.release_focus() only if the press was a mouse/touch press. Or accept the behaviour and document it.

OPTIONAL / NICE-TO-HAVE:
- The literal "Walk & Talk (Next)" appears both at main.gd:13960 and in update_walk_control (main.gd:12476). Use the update_walk_control() result as the only source; the call at 13964 already overwrites it.
- Press-mode fires on touch-down, so a pan gesture that starts on the control now triggers it and can't be cancelled by sliding off. This is acceptable for Stop; on the Walk & Talk side it can start a route by accident. No phone claims are made, so just note it.

CUT THESE (over-engineering):
1. [Browser checks] godot-browser.mjs:162 adds a `steadyWalk.player_grounding.stride < 0.1` assertion after a 900 ms wait. The position-delta check (165) and path_active=false (163) already prove the player has stopped. player_stride_blend decays at 8/s (main.gd:3445), so the stride check only re-tests animation easing, which the earlier grounding checks already cover. It is safe to drop if it turns out flaky; keep it otherwise.
2. Nothing else. The scope is already minimal: no new row, schema, or reward path.

Checked and found no defect:
- Label sync: every route mutation calls update_route_ribbon. Starts: main.gd:7605, 7649, 7693, 7742. Failures: 7595, 7639, 7683, 7732, 7951, 7979. Arrivals: 8136, 8211, 8245, 7758. Others: walk_step at 7472; advance_walk at 12414, 12433, 12449; end_conversation at 6285; resets at 13189, 13262, 13319.
- update_walk_control is null-guarded (12473), so calls made before the UI is built are safe.
- A button release can't trigger a scene tap. pointer_active is only set on an unconsumed press outside the UI (13134-13143), and handle_scene_tap needs pointer_active (13146-13151).
- Snapshot geometry matches the canvas mapping: control_snapshot uses get_global_rect (10702-10706), and viewport_width comes from get_visible_rect (4541-4543, 10839). godot-browser.mjs:58/150 scale by canvas/viewport.
- Hard boundaries were checked only as far as these three files go: no edits to public/ or the save schema are visible. verify: public/ fingerprint and the Godot save size limit with the real gate scripts.
