TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/dog_story.gd; Grep works). Review is from source reads only. I ran no tests or browser, and made no edits apart from this file.

VERDICT: no. Several existing native assertions will fail against this code, and I found three runtime defects (a stale actions latch that swallows Escape, the tray overlapping open panels, and a primary-transition guard that does not consume the event it claims to). All are small fixes, but the gate does not hold as-is.

MUST-FIX BEFORE BUILD

1. [Esc / owner-mode transitions] phone_actions_open survives leaving talk mode, and then Escape gets swallowed.
   - Where it is reset: only on a talk_partner change (godot/main.gd:6814-6816), on a mount flip (6801), or through close_phone_disclosure.
   - The path that breaks: Next Step (actions open) → the "All Actions" conversation action → run_conversation_action_id("hub") (main.gd:6648-6652). That sets block_panel_mode="hub" but leaves talk_partner unchanged, so phone_talking() goes false while phone_actions_open stays true.
   - The phone Escape handler (main.gd:14465) fires on `phone_tray_open or phone_actions_open` and returns. The first Escape in the hub therefore does not reach the original KEY_ESCAPE end_conversation branch (main.gd:14726-14729). Instead it moves focus to Explore and the hub stays open.
   - The same stale flag also beats the story card's Escape (continue_story(false), main.gd:14551-14552). The 14465 guard excludes is_focused_activity_visible() but not is_story_card_visible(), and configure only clears phone_tray_open when blocked (6818).
   - Fix: in configure_phone_disclosure, `if not talking or blocked: phone_actions_open = false`. Add `and not is_story_card_visible()` to the 14465 condition.
   - Acceptance: native test does Next Step → All Actions action → one Escape → require not block_panel.visible.

2. [Hit testing / layout contract] The tray can open over the hub, mural and music panels, and the panel layout ignores it.
   - configure (main.gd:6819) gates the tray on `not talking and not blocked` only, and Explore is always visible when enabled (6820). So with the hub (block_panel_mode "hub"), Celeste's mural_panel or Rook's music_panel open, Explore opens the tray.
   - The panel loop positions panels against controls.offset_top, which is -62 on phone, and never against the tray:
     - short_phone path: offset_bottom = controls.offset_top-8 = -70 (6973). COMPACT_ACTIVITY_MAX_HEIGHT is 640 (main.gd:847), so this path applies at 320x568, 390x568 and 390x639.
     - default narrow path: offset_bottom = -176 (6982).
   - The tray sits from offset_bottom = controls.offset_top-8 upward by its 3-row minimum (6841-6843). It therefore covers the bottom of those panels.
   - The tray is added to `layer` after block_panel (make_phone_disclosure is called at main.gd:15747, after block UI built before 15725), so it draws above the panel and takes its input.
   - play_area_rect does account for the tray (7124), so the camera and the panel layout disagree.
   - Smallest fix: compute `blocked := ... or any_side_panel_visible()` for the tray (6817-6819), or hide Explore while a panel is visible.
   - Acceptance: at 390x667 and 320x568, open the hub and the mural panel, press real Explore, and require that the tray is not visible (or that its rect does not intersect the panel).

3. [Event wiring: phone_primary_transition] As written, the guard cannot consume the event it is described as blocking.
   - main.gd:14458-14464: the first branch matches any release — `InputEventScreenTouch` release, or `InputEventMouseButton` release including DEVICE_ID_EMULATION. It clears the latch and falls through without set_input_as_handled/return.
   - So the emulated MouseButton release is never consumed, whichever of the native and emulated releases arrives first.
   - The `elif` only consumes emulated mouse events that are not releases. For one finger, Godot emits one emulated press per touch, and that press already happened (it is what triggered press_walk_control). In practice only emulated InputEventMouseMotion during the hold gets eaten. [ASSUMPTION: Godot 4 Input emits exactly one emulated MouseButton press per primary touch. verify: engine version and Input::_parse_input_event_impl ordering]
   - Consequence: if the private2 "choicesOpen" clickthrough is release-driven, this guard does not stop it. A green tests/godot-browser.mjs:1396 would not show that the guard works.
   - Fix:
     - Clear on the native ScreenTouch release (or the non-emulated MouseButton release). Also consume the emulated MouseButton release while latched, then clear.
     - Add a counter to the phone_disclosure snapshot (main.gd:11787), e.g. consumed emulated events.
     - In the browser test, assert `!s.phone_disclosure.transition` after every walk tap and that the counter moved.
     - Run a negative control once with the guard disabled to confirm 1396 actually detects the clickthrough. Until then, do not claim the guard is the cause of the fix.
   - Note: wheel button releases (MOUSE_BUTTON_WHEEL_* also emit pressed=false) clear the latch early too. Restrict the release match to MOUSE_BUTTON_LEFT.

4. [Hidden-button test traps: native suite] These existing assertions will fail at portrait sizes below 520 and need adapting. None of the adaptations below weakens a check or taps hidden controls.
   a. godot/tests/study_test.gd:2468-2481 (sizes 390x667 and 320x667 from 2437)
      - Problem: `controls.get_child(2)` is now phone_explore_control. Children become [next_hint, walk, explore] after configure (main.gd:6803-6806), so `next.text == "Find Me"` fails.
      - Adapt: when study.uses_phone_disclosure(), phone_accept(study.phone_explore_control), then phone_accept(study.phone_find_control). Require tray closed and following_player.
   b. study_test.gd:2457-2462
      - Problem: the 44px, in-viewport and focus-ring loop now covers only the 3 primaries. The four tray buttons, All Actions and the tray Close are no longer checked.
      - Adapt: open the tray through real Explore, then iterate phone_original_walk_buttons plus phone_all_actions_control and phone_tray_close.
   c. study_test.gd:2772 and 3689
      - Problem: `conv_rect.end.y <= controls.get_global_rect().position.y` fails. In phone talk with an empty path the panel ends at vp.y-12 (main.gd:6960), and the controls are hidden but still have a rect at -62.
      - Adapt: if phone_talking() and not controls.is_visible_in_tree(), require conv_rect.end.y <= size.y-11. Otherwise keep the original check.
   d. study_test.gd:2756-2760
      - Problem: conv_action_btns[0].size.x is read while the actions are hidden (main.gd:6853).
      - Adapt: phone_accept(conv_next_btn) first, require conv_action_btns[0].is_visible_in_tree(), then measure.
   e. study_test.gd:3379 (hub_size 320x568, 390x568, 360x600) and study_test.gd:3714-3719 (narrow_small sizes 320x568, 390x568, 360x600 from 3520)
      - Problem: these expect columns==2, offset_top==-174 and six children with original labels. Phone gives columns 3, offset -62, 3 children, and next_hint text "Next Step" or "Back to Me" (main.gd:6828-6832).
      - Adapt: branch on uses_phone_disclosure(). Require columns==3, offset_top==-62 and child_count==3. Require walking_control_snapshots() texts for indices 1-4 to equal the original labels via the canonical refs. Require Explore visible.
   f. study_test.gd:3338-3339
      - Problem: walking_control_snapshots() includes the tray buttons with stale rects while hidden, because control_snapshot uses get_global_rect regardless of visibility (main.gd:11613-11614). text_fits and width are therefore measured on hidden controls.
      - Adapt: filter by `visible`, and add a pass with the tray opened through Explore.
   g. Unverified at-risk checks: study_test.gd:2364/2379 (speech in Info and reward placement at 320x667), 2764/2770 (Compton burst and Bea in play_area), 3533/3682/3688/3696 (neighbor or subject in play_area). Phone talk makes block_panel taller (96px reader, 16px font, bottom at -12), and play_area_rect drops the controls term while talking (7122). verify by running. If any fail, the fix is the conversation camera refit, not loosening the assertion.

5. [Sequencing: layout order] layout_walking_controls_and_hub sizes controls' children (main.gd:6905-6908) before configure_phone_disclosure re-mounts them (6943).
   - On phone→desktop, map, Find Me and zoom are reparented back with their phone overrides (font 14, min 50; 6838-6840) after the desktop loop has already run. They stay at font 14 instead of 19 until a second pass.
   - The second pass only happens because close_phone_disclosure clears phone_ui_signature (6758), which forces another layout on the next _process (6790-6795). Any synchronous caller that reads fonts right after one layout gets wrong values. This conflicts with the hard invariant "original fonts/geometry at >=520 unchanged".
   - Fix: run the mount/unmount block (6800-6812) at the top of layout_walking_controls_and_hub, before the sizing loop. Alternatively, iterate phone_original_walk_buttons in the loop.
   - Acceptance: after one resize to 1100x760, require every canonical button's font_size==19 with no wait (study_test.gd:6316-6319 currently checks only parents).

SHOULD-FIX

1. [press_conversation_next contract] "Hide Steps" calls ask_whats_next() again (main.gd:6779-6780). That repeats the spoken/announced hint and mutates last_hinted_surprise_id (main.gd:6408) just to collapse a row. Fix: call ask_whats_next() only when opening.

2. [Focus on desktop→phone rotation while talking] A rotation mounts the phone layout and hides the conv action buttons (6853). If one of them had focus, focus drops to null. This is the talk-mode version of the existing hub contract at study_test.gd:2718. Fix: after mounting with phone_talking() and a focus owner that is no longer visible, call conv_next_btn.grab_focus(). Add the equivalent rotation check to verify_phone_disclosure.

3. [Talk geometry upper bound] The phone talk branch (main.gd:6957-6962) sets offset_top = offset_bottom - combined_min and never clamps to the header end. The short_phone path does have a fallback (6974-6975). At 320x568 with actions open plus a required layout_table/layout_floor or return_owner row (6852), nothing guarantees panel.top >= header end. Add that requirement in verify_phone_disclosure for 320x568 with actions open and with an owner-return row. If it fails, reduce separation the same way as 6974-6975.

4. [Primary row height] Primaries use AUTOWRAP_WORD_SMART at 14px in roughly 1/3 width (6833-6836) inside a fixed 50px band (offset_top -62, bottom -12). Story labels such as "Election map", "Dog search" and "Parade" (main.gd:13840-13850), or "Walk & Talk (Next)" at 320 wide, may wrap to 2 lines and push the grid below the viewport. The in-viewport check at study_test.gd:6302-6303 runs only in the post-Goodbye idle state. Repeat it with a route active (Stop) and with each story label active. Derive offset_top from controls.get_combined_minimum_size() instead of hard-coding -62.

5. [Browser helper coordinate contract]
   - tests/godot-browser.mjs:1392 sends CDP touch points in Godot viewport units (tr.x, tr.y) without the canvas boundingBox scaling used by tap() at 1384. It only holds if the canvas sits at (0,0) at scale 1. Reuse the same conversion.
   - 1397 taps conversation_detail.buttons[3] by index and assumes it is "Meet Thanh". Assert its label/id first; private2 already showed that Walk can revisit Bea and change the action set.
   - 1388/1398: if the fresh profile has no save yet, both getItem calls return null and the equality check proves nothing. Assert that `saved` is non-null, or state explicitly that null-to-null is the expected result.

6. [Escape coverage] verify_phone_disclosure (study_test.gd:6297-6299) tests only the first Escape. Add:
   - a second Escape in talk ends the conversation (original 14726-14729);
   - Escape with the tray open during an active route closes only the tray, and the next Escape stops walking;
   - Escape with stale actions after All Actions (MUST-FIX 1).

7. [Explore while blocked] During mural workshop or a story card, Explore stays visible (6820). press_phone_explore toggles the flag and configure immediately forces it back to false (6818), but the user hears "Explore closed." (6767) for something that never opened. Either hide or disable Explore when blocked, or announce truthfully.

8. [Constants] `520.0` in uses_phone_disclosure (main.gd:6745) duplicates SMALL_SIDE_HUB_MIN_WIDTH (main.gd:846). Use the constant so the docking and disclosure breakpoints cannot drift apart. -62, 50, 14, 16 and 96 are inline magic numbers. At least -62 should be derived from the row (see SHOULD-FIX 4).

OPTIONAL / NICE-TO-HAVE
- phone_find_control = phone_original_walk_buttons[2] (main.gd:6865) relies on creation order. Assign the variable at creation (main.gd:15739) instead.
- Snapshot (main.gd:11787) could also expose phone_hid_walking and phone_talk_owner, so tests can assert the restore latch is false after Goodbye or a module close.
- When a module captured return_focus on a tray button (e.g. dog_story.gd:211), close falls back to block_close_btn (dog_story.gd:231-232) because the tray is closed. Consider falling back to phone_explore_control on phone.
- verify: whether native InputEventScreenTouch reaching controls (touch_focus) contributes to the private2 clickthrough. RichTextLabel handles ScreenDrag in gui_input (main.gd:15307-15309), so touch events do reach controls.

CUT THESE
1. The tray "Close" button (main.gd:6884). Explore already becomes "Close" while the tray is open (6830), and Escape closes the tray. Two adjacent Close controls is redundant for both screen readers and touch users. Safe to remove because Explore toggles via press_phone_explore (6760-6766) and Escape is wired at 14465.
2. `phone_tray.size = Vector2(bubble_viewport_size().x-24.0,0)` (main.gd:6841). The tray is anchored PRESET_BOTTOM_WIDE with offsets ±12 (6869-6870), so width is already defined. Safe to remove because only offset_top/bottom vary.
3. `get_viewport().set_input_as_handled()` inside press_walk_control (main.gd:13874). It runs inside a pressed-signal handler for an event the Button has already accepted. Safe to remove; whatever protection exists comes from the latch in _input.
