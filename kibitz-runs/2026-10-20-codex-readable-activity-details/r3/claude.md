TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs directly). I had no shell, so I could not run git diff; findings are against the working-tree source, and baseline-vs-candidate deltas are inferred from the code plus the brief.

VERDICT: yes-with-fixes. The runtime wiring is sound: plain-text RTL, change-gated scroll reset, wheel/arrow isolation, and hidden-panel framing order all hold. But the one behavioural camera change is never asserted, and the native fixture runs it in the opposite order from production. The phone touch-scroll path, which is the headline 320/390 problem, is also unexercised.

MUST-FIX BEFORE BUILD

1. [§Phone labels / "Activity focus helpers ... including calls immediately before a hidden panel becomes visible"] The claimed order is never tested, and the result is never asserted.
   - Production order is focus first, then show: talk_with_celeste calls focus_mural_camera() at main.gd:8499 and show_mural_panel(true) at main.gd:8505. check_sound_with_rook calls focus_speaker_camera() at main.gd:8540 and show_music_panel(true) at main.gd:8546.
   - frame_activity_camera (main.gd:8468-8474) reads panel.get_global_rect() while the panel is still hidden.
   - The native fixture uses the opposite order. It calls show_mural_panel(true) and then focus_mural_camera() (study_test.gd:2677-2680), and the same for music (study_test.gd:2686-2687).
   - Nothing in the activity loop (study_test.gd:2668-2728) checks camera.unproject_position(target) against play_area_rect(). The only related check is play_area_rect().size.y >= 140 at study_test.gd:2695, which is independent of where the camera points. Grep shows no unproject call in the loop.
   - The hidden-rect read is also only correct if the VBox content's minimum height stays within the 224/220 px offsets. [ASSUMPTION] Godot does not push minimum-size growth to hidden containers. Verify: the Control::update_minimum_size visibility early-out in Godot 4.7.
   - Smallest fix, per width:
     a. show_mural_panel(false), then focus_mural_camera(), then show_mural_panel(true). Same pattern for music.
     b. Wait one frame.
     c. require(study.play_area_rect().has_point(study.camera.unproject_position(study.target))).
     d. require(the panel rect captured before showing == activity_panel.get_global_rect() after showing).
   - Do not use talk_with_celeste()/check_sound_with_rook() for this: they call save_godot_state (main.gd:8500, 8541) and would break the save-equality check at study_test.gd:2733.

2. [§Coverage "320/390" + §Invariants "physical phones ... unverified"] Phones have no tested way to scroll the description.
   - The browser reads the description only with mouse.wheel (godot-browser.mjs:95) and PageUp/PageDown after a mouse click (godot-browser.mjs:97-103). A phone has neither.
   - [ASSUMPTION] Godot RichTextLabel does not drag-scroll content on touch. Touch-emulated mouse drag goes to selection, which is off here. If so, the only phone path is the default VScrollBar, which is far narrower than the 44 px target the same suite enforces for buttons (godot-browser.mjs:78, 91).
   - Verify: Godot 4.7 RichTextLabel handling of InputEventScreenDrag, or of emulated MouseMotion with button held.
   - Smallest fix if unsupported: in make_activity_detail (main.gd:13795-13803), connect gui_input. On InputEventScreenDrag, do get_v_scroll_bar().value -= event.relative.y, then accept_event().
   - In either case, add one touch check (Playwright hasTouch + page.touchscreen, or a native InputEventScreenDrag) at 320 for the mural stage.

SHOULD-FIX

1. [§Coverage "music error final-line access" (browser)] The audio-error stage is not tied to the error text, and it never scrolls.
   - godot-browser.mjs:366-368 waits a fixed 220 ms and then calls readActivityDetail. That function snapshots whatever text is current (godot-browser.mjs:86) and never asserts it is MUSIC_DECODE_ERROR.
   - MUSIC_DECODE_ERROR is 54 characters (main.gd:173). It fits in two lines at every width, so the d.scroll_max > d.scroll_page guard (godot-browser.mjs:92) skips all scrolling for this stage.
   - Final-line access for errors is therefore proven natively only, using a synthetic 16x error (study_test.gd:2685). The brief's browser claim overstates coverage.
   - Fix: before the read, add `await page.waitForFunction(() => window.__tenderloinGodotA11ySnapshot?.music_detail.text === 'Could not decode audio file. Sketch remains available.')`. Reword the brief so it does not claim browser scroll coverage for errors.

2. [§Coverage "if browser checks truly require long reading on narrow views"] They do not.
   - readActivityDetail silently skips the whole scroll/PageUp/PageDown block whenever the text fits (godot-browser.mjs:92). No stage asserts that scrolling actually happened.
   - Fix: at 320 and 390, for the 'mural' stage only, add `assert.ok(d.scroll_max > d.scroll_page, 'narrow mural description exercises scrolling')`. If real Celeste text sometimes fits, pick a turn known to overflow.

3. [§Coverage, wheel] The bottom-of-scroll check may depend on how Godot web converts a single wheel event.
   - godot-browser.mjs:95-96 sends one wheel(0, 10000) and then requires scroll_value == max - page within 1 px.
   - RichTextLabel scrolls by page * factor * 0.5 / 8 per wheel event. If Godot web clamps the factor for a single DOM wheel event, that call scrolls only a fraction of a page and the wait times out.
   - Verify: the DisplayServerWeb wheel factor in 4.7. Robust smallest fix: loop wheel(0, 400) until the value stops changing (at most N times), then assert the bottom.

4. [§Coverage "state restoration in native fixtures"] Restoration is partial.
   - The Close step calls end_conversation (main.gd:6286-6314). That clears arrived_neighbor, arrived_mural, arrived_speaker, selected_neighbor, talk_partner and current_path.
   - focus_*_camera also leaves following_player=false and changes view_size/target (main.gd:8440-8452).
   - The fixture restores only last_panel_dialogue and music_error (study_test.gd:2729-2732) and leaves root.size at 1100x667.
   - Later blocks pass today only because study_test.gd:2736 calls frame_player_for_walking() first, so the next block depends on that call.
   - Fix: snapshot and restore arrived_neighbor, selected_neighbor, following_player, view_size, target and root.size around the loop. Or document the dependency at 2734.

5. [§Phone labels / framing scope] Desktop framing changed, not just phone framing.
   - frame_activity_camera is now called unconditionally (main.gd:8451, 8465), so 1100 px mural/music framing also moves. The old 4.2 m offset applied only below 600 px; that phone-only pattern is still visible in focus_history_stop_camera main.gd:7905-7906 and focus_block_camera main.gd:8487-8488.
   - Earlier 1100 px receipts and screenshots will differ.
   - Fix: state this in the receipt. Or, if desktop framing must be preserved, gate it with `if is_narrow_layout()`. That matches the brief's own "phone-only" wording.

6. [§Interface contract: browser vs native height bound] The two suites check the description height differently.
   - Native compares against the real font metric (study_test.gd:2696-2698).
   - Browser hard-codes 34..50 px (godot-browser.mjs:88). At 12 px, 2*font_height+2 sits about 1 px above 34 [ASSUMPTION: default font metrics], so a font or DPR change breaks only the browser.
   - Fix: add "min_height": detail.custom_minimum_size.y to activity_detail_snapshot (main.gd:10862). In the browser, assert d.control.height >= d.min_height - 1 && <= 50.

OPTIONAL / NICE-TO-HAVE

- Resizing while a mural/music panel is open re-applies offsets and text (main.gd:14294-14303) but does not re-frame. Going from 600 to 599 grows the panel by 38 px, and the subject can end up behind it. This is not a regression: the old 4.2 m offset was also only applied when focusing. Leave it alone unless a "framed since focus, not panned" flag already exists. Do not override a manual pan.
- activity_detail_snapshot (main.gd:10861-10862) dereferences detail without a null check, unlike the block_detail fields at main.gd:10947-10951. This is harmless today because the snapshot only runs after build, but `if detail == null: return {}` would match the neighbouring code.
- Short phone labels rely on tooltips ("Move the selected mural motif", main.gd:13719). Tooltips never appear on touch and are not mirrored into the web a11y DOM (main.gd:10639-10655). On the devices that get the short labels, the full meaning is effectively unavailable.
- make_activity_detail measures the font before add_child (main.gd:13802). That is fine because no custom Theme exists (no `.theme =` in main.gd, no gui/theme/custom in project.godot). Note that a future project theme would make the first measurement stale until resize_controls runs (main.gd:14266, 14270, 14328).

CUT THESE (over-engineering)

1. Browser 800 and 1000 px resize reads (godot-browser.mjs:301 and 326, loop values 800 and 1000). The native sweep already covers 320/390/600/800/1000/1100 against the same geometry (study_test.gd:2668). Layout changes only at the 600 px breakpoint (main.gd:6704, 14246), so keeping 600 alone covers the breakpoint in the browser. This removes four full readActivityDetail passes and their screenshots from the gate.
2. Reassigning constant tooltip_text on every update_mural_ui/update_music_ui call (main.gd:13719-13721, 13779-13781). The values never change, so set them once where the buttons are created (main.gd:14086-14089, 14126-14128). The "What's Next?" tooltip duplicates the wide label and can go entirely. This is safe because the callbacks and button order are unaffected.
3. Computing per-button text_fits for both activity panels on every 0.5 s publish while they are hidden (main.gd:10953-10954, cadence from main.gd:7065-7068). The browser only reads the visible panel (godot-browser.mjs:76-78, 86-91), so returning a minimal dict when !panel.visible is safe. The native fixture calls activity_detail_snapshot directly on visible panels (study_test.gd:2699), so it is unaffected.
