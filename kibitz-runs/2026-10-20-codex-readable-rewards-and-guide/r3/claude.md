TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot, godot/export_presets.cfg)

VERDICT: yes-with-fixes. Per-frame ordering is right: in _process, the final update_guide_arrow at main.gd:12728 runs after the reward layout (12742/12745) and after Talk/captions are resolved. But the browser So What fixture reads reward-title line counts from a snapshot published in the same frame as the trigger, before the container has re-laid out its children. The title measurement also does not use the Label's actual break flags.

MUST-FIX BEFORE BUILD

1. [Browser: "actual So What inspection" / snapshot added to readonly overlays] The snapshot can be stale.
   - Shift+H runs inspect_so_what_easter_egg (main.gd:7850), then trigger_feel_good_burst (5722), then layout_reward_banner (5694). That sets reward_banner.size directly, but the RewardTitle Label's width and height are only updated when PanelContainer/VBox sorts their children. That sort is deferred.
   - announce_a11y_status (10879) also sets a11y_sync_pending. flush_web_a11y_status (12747) then publishes get_a11y_status_snapshot in this same _process, before the deferred sort runs.
   - godot-browser.mjs:886 waits only for camera_view_size===84. frame_landmark_view sets that value synchronously at 7858, so the snapshot it gets is that same-frame one. As a result, overlays.reward_title.lines and visible_lines (main.gd:10760-10761) and the reward_title rect are computed at the label's previous width and height. If no reward has been laid out at this viewport since the reload at godot-browser.mjs:833, the label width is stale or zero.
   - The native fixture avoids this by awaiting two process_frames (study_test.gd:1946-1947). The browser fixture does not, so assertion 890 can pass or fail by coincidence.
   - Fix (test only, smallest): after line 887, wait for a later published snapshot, `s.ui_frame > inspection.ui_frame && s.overlays.reward_title.visible`. Assert lines and visible_lines on that snapshot. Snapshots republish on the 0.5 s objective_refresh cadence (main.gd:6990-6993), which is well inside the 3.2 s reward timer.
   - [ASSUMPTION] Godot 4.7 still sorts containers via a deferred queue_sort. verify: print reward_title_label.size.x in the Shift+H frame.

2. [Reward title: "smart word wrap ... measure its full multiline height"] The measurement and the rendered Label break text differently.
   - main.gd:5704 calls Font.get_multiline_string_size with its default brk_flags (BREAK_MANDATORY | BREAK_WORD_BOUND).
   - The Label uses AUTOWRAP_WORD_SMART (5676), which also breaks with BREAK_ADAPTIVE. Any token wider than w-24 (264 px at 320x667, because w = 288) is split across extra lines by the Label but not by the measurement.
   - The Label's own minimum height is ~1 px when autowrap and clip_text are both on (clip_text=true, 5677). So custom_minimum_size.y is the only height source, and the extra lines are silently clipped. That is exactly the "not ellipsized/shrunk" failure the doc rules out.
   - Fix: pass explicit flags: `get_multiline_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, w - 24.0, title_size, -1, TextServer.BREAK_MANDATORY | TextServer.BREAK_WORD_BOUND | TextServer.BREAK_ADAPTIVE)`.
   - Add one native fixture with a single unbroken token of about 40 characters at 320.

SHOULD-FIX

1. [Reward title min height] Round the height up: `reward_title_label.custom_minimum_size.y = ceil(title_measure.y + (title_lines - 1) * line_spacing)` (main.gd:5706).
   - Label.get_visible_line_count drops the last line when the summed line height exceeds the assigned height by any epsilon.
   - [ASSUMPTION] BoxContainer min-size and resort maths truncate to int, so a fractional measure (fallback-glyph line heights) would lose the last line. verify: box_container min-size caching in 4.7.
   - Native passes today with the default font. Fallback glyph coverage is a hard invariant, which makes this cheap insurance.

2. [Reward title width contract] `w - 24.0` (main.gd:5704) hard-codes content_margin_left/right = 12 (5659-5660). If either margin changes, the measurement silently diverges from the real label width. Use `w - reward_banner_style.get_margin(SIDE_LEFT) - reward_banner_style.get_margin(SIDE_RIGHT)`.

3. [Guide label: "bounded candidates above/below/left/right"] Candidates are thrown away instead of clamped.
   - main.gd:6571-6574 use the unclamped lbl_global.x/.y, or x positions beside the reserved rect, and are discarded if `not area.encloses(rect)` (6578).
   - At 320 the reward banner is 288 of 304 px wide, and the label is ~150-220 px. So left/right-of-reward candidates are always off-area, and the "above/below Talk" candidates often are too. They are rejected instead of being slid inside.
   - Fix: clamp each candidate with the same expressions as 6557-6558 before the encloses/intersects test. This is one loop-local change, and it reduces the "hide label" fallback at 320.

4. [Guide label: "Six-pixel outline clearance"] The clearance is applied twice.
   - The label rect is grown by 6 (6577) and every reserved rect is grown again: reward, Talk and story card by 6 (6562/6564/6566), captions by 4 (6568). The actual gap is 12/10 px.
   - The native contract grows only the guide rect (study_test.gd:2504), so the code is stricter than both the spec and its own test, and hides the label more often on narrow screens.
   - Fix: drop the .grow() on the occupied entries in update_guide_arrow and keep only the label's grow(6.0).

5. [Guide label: "preserve arrow geometry/direction"] Nothing keeps the name near its arrow, or off it.
   - Candidates are not limited by distance from guide_arrow.position. "Right of reserved" at lbl_global.y can put the name across the screen from the arrow.
   - The arrow polygon (Polygon2D, main.gd:14001, about ±18x13 around guide_arrow.position) is not reserved. The above/below candidates at lbl_global.x can therefore draw over the arrow glyph.
   - Fix: append `Rect2(guide_arrow.position - Vector2(20, 20), Vector2(40, 40))` to occupied, for label placement only. Then either reject candidates whose centre is more than ~140 px from guide_arrow.position, or sort candidates by distance before the loop.

6. [Reward banner / burst label] The queued-reward state can show no title at all.
   - When the taller multiline banner fails area.encloses (5712), the banner stays hidden and its timer is frozen (5751-5752).
   - celebration_burst_label is gated on `reward_banner_timer <= 0.0` (5775), so it is also hidden.
   - Multiline titles make this queued state more likely at 320/390 with a panel open. Fix: gate 5775 on `reward_banner == null or not reward_banner.visible`.

OPTIONAL / NICE-TO-HAVE
- [Browser shared overlay assertions] assertReadableOverlays (godot-browser.mjs:567) checks the raw guide_label rect, but native grows it by 6 (study_test.gd:2504). Grow it by 6 in the browser too, so the outline-clearance contract is the same in both harnesses.
- [Guide occupied set] player_nameplate (Label3D, main.gd:12731-12733) is not reserved for the guide label and is not asserted in either harness. verify: whether it can intersect the label at 320.
- [Guide label narrow truncation] main.gd:6550-6551 still ellipsizes names over 22 characters on narrow layouts. That is outside the headings rule, but it is worth stating explicitly in the doc so it isn't treated as a regression.

CUT THESE (over-engineering / redundant)
1. [Sequencing] The update_guide_arrow() call in update_conversation_ui (main.gd:6996).
   - It runs before update_talk_prompt (6997), before the reward layout (12742/12745), and against last frame's visible_scene_captions. Its result is always overwritten by the call at the end of update_readable_scene_labels (12728).
   - update_readable_scene_labels runs unconditionally every _process (12746) and has no early return before 12728, so cutting 6996 only removes a wasted placement pass made from stale inputs.
   - Keep the other call sites (5577, 5904, 6263, 6311): they serve direct, non-_process callers.

Invariant spot-checks:
- The export target is ../artifacts/godot-web (godot/export_presets.cfg:8), not public/, so browser verification does not touch public/.
- Stretch mode is disabled (godot/project.godot:14). Control global rects and camera.unproject_position therefore share one coordinate space, so mixing reward/story rects with Talk/caption rects is valid.
- so_what_visited is reset on reload (main.gd:11788). The page reload at godot-browser.mjs:833 therefore lets Shift+H fire the reward again, even though the tour loop already set it at godot-browser.mjs:595.
