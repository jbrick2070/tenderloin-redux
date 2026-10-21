TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs from the working tree; uncommitted state, not e5cd816).

VERDICT: yes-with-fixes. The show -> layout -> refit order is correct for conversation, mural and music. But the width/height predicates leave an untested band that still uses the old broken bottom layout, right next to the tested 520x568. Height-only Close/label restoration and content-change refits are also not proven.

MUST-FIX BEFORE BUILD

1. [Demonstrated issue / bounded change; godot/main.gd:6584-6593, 793-795] Hole between the two gates. The side dock needs x>=560 AND y<560 (uses_short_side_panels, SIDE_HUB_MAX_HEIGHT=560). Compact narrow needs x<560 AND y<640 (uses_compact_narrow_activities, COMPACT_ACTIVITY_MAX_HEIGHT=640). So 560<=x<600 with 560<=y<640 (e.g. 560x568, 599x600) gets neither. layout_walking_controls_and_hub (main.gd:6672-6676) then uses the legacy narrow geometry: block panel offset_top -368 / offset_bottom -176, controls offset_top -174, 2 columns x 50px. That is the same geometry the prior probe showed leaving a 1px scene at 320x568. At 560x568 the scene is bounded by header end .. y=192 (568-368-8). [ASSUMPTION] With a two-line objective header, that is under the plan's own scene.size.y>=100 bar (study_test.gd:3332). verify: probe 560x568 and 599x600 conversation/mural/music.
   Smallest fix: change the width test in uses_compact_narrow_activities from `vp.x < SIDE_ACTIVITY_MIN_WIDTH` to `vp.x < SIDE_HUB_MIN_WIDTH and not uses_short_side_panels()`. This leaves >=600 untouched. Then add 560x568 and 599x639 to the native sizes (study_test.gd:3267). Update the width-only expectations so they stay correct: study_test.gd:3387 (`anchor_left == 1.0 if x >= SIDE_ACTIVITY_MIN_WIDTH`) and godot-browser.mjs:69 (`side = !small || width >= 560`). Both assume width alone decides dock vs compact; that is false at y>=560.

2. [Guardrails "restoring offsets/labels after Close and across 560/600-width and 640-height thresholds"; godot/tests/study_test.gd:3398, tests/godot-browser.mjs:150] The Close assertions are too weak to show the claimed restoration.
   - Native only checks controls.offset_right == -12 and map_control.text. Browser only checks controls_control.width == width-24. Neither checks walk_control text ("Walk / Talk" -> "Walk & Talk (Next)", main.gd:12999-13001), next_hint_control text ("Next Step"/"Next" -> "What's Next?", main.gd:6622), zoom captions, controls.columns (3 -> 2 at x<600, main.gd:6614), controls.offset_top (-104 -> -174), button min height (44 -> 50) or panel grow_vertical (BEGIN -> END, main.gd:6666).
   - At 560..599 only offset_right differs. A regression in any of these would still pass.
   Fix: after Close, assert the snapshot's walk_control_text and walking_controls[*].text against the non-compact captions for each small size. Natively, also assert controls.columns, controls.offset_top and the grow_vertical of all three panels.
   - The native test also closes with show_*_panel(false) directly (study_test.gd:3395-3397), not end_conversation (main.gd:6341). So the native "Close" bypasses the real path that sets block_panel_mode="hub" while the panel is still visible. The browser does use the real Close button.

3. [Inspect source: godot/tests/study_test.gd; godot/main.gd:6667-6671] The native compact case never checks that the panel sits above the walking controls.
   - The short_phone branch anchors offset_bottom = controls.offset_top - 8 and grows upward from content height. Native only asserts dock.end.y <= vp.y-12 (study_test.gd:3331), which still passes if the panel overlaps the controls by 100px.
   - The browser's controls-below-panel check (godot-browser.mjs:80) only runs at 320x568 and 390x568 for compact. 360x600 and 520x568 are native-only, so overlap at those sizes is untested.
   Fix: in verify_short_activity_panels, when compact_narrow_activity is true, require `study.controls.get_global_rect().position.y >= dock.end.y`.

SHOULD-FIX

1. [godot/main.gd:6667-6671] The content height is computed once, at layout time. The branch sets panel.size, then reads panel.get_combined_minimum_size().y in the same call.
   - The same function also flips conv_buttons to AUTOWRAP_WORD_SMART (main.gd:6637) and changes font sizes. Container re-sort is deferred, so the minimum height read here can be stale. verify: Godot 4 container sort timing for autowrapped Button minimum height.
   - GROW_DIRECTION_BEGIN fixes the too-small case by growing upward. The too-tall case never shrinks, so the panel keeps covering scene space.
   - Re-layout only happens on viewport size_changed (main.gd:14675), header resized (main.gd:14676) or update_block_ui -> apply_block_panel_mode (main.gd:14310 -> 6571, conversation only).
   - Mural and music have no re-layout on content change: update_mural_ui/update_music_ui do not call layout (main.gd:14156-14170).
   Fix: in the short_phone branch, follow up with `layout_walking_controls_and_hub.call_deferred()` once per change (guarded against re-entry), or connect each panel's minimum_size_changed to a deferred re-layout while uses_compact_narrow_activities() is true.

2. [godot/main.gd:6667-6671 vs 6658-6662] The compact branch has no overflow fallback. The side-dock branch drops separation to 0 when the panel would hit the header (6660-6662). The compact branch does not, and does not clamp offset_top to header end + 8. When Info is open, the objective is long and there are 3 conversation action rows, the panel can climb over the header. play_area_rect (main.gd:6799) then quietly returns height 1.
   - Native only catches this at the six tested sizes.
   Fix: copy the separation-0 fallback, using the bound `vp.y + panel.offset_top < header end + 8`.

3. [godot/main.gd:6741-6759, 8733-8739] There is no camera refit after an in-place panel height change. Conversation re-layout via update_block_ui -> apply_block_panel_mode (6571) can change the panel top, for example when conversation_actions() adds an action row after a Chat turn. No refit_panel_camera or refit_panel_after_layout follows, so the subject can end up under the panel.
   - The test makes this unreachable by setting objective_refresh_timer=1000 (study_test.gd:3321).
   Fix: in layout_walking_controls_and_hub, record the short_phone panel top. If it changed and panel_frame_control is visible, call refit_panel_after_layout(). That function already respects manual intent through panel_frame_pose.

4. [Bounded change "existing hub keeps its 600px minimum"; godot/main.gd:6589, 6672, 6524-6528] Conversation hands off to a hub that is still broken. At 560..599 x <560, the newly fixed side-dock conversation offers the "hub" action (6524-6528). show_block_panel(true) in hub mode then takes the legacy narrow path: offset_top -368, so at 599x360 the top is at y=-8, above the screen and over the header.
   - Nothing tests the hub at 560..599 short.
   Fix: either clamp the legacy hub offset_top to header end + 8, or record this as a known-unfixed path in the round notes, and add one browser assertion that documents the current behavior.

5. [godot/main.gd:6261, 8741-8757] The conversation framing subject depends on the mode at open time. frame_conversation picks focus y=1.0 in compact and 2.2 otherwise, and stores it once via remember_panel_framing (6271).
   - If you rotate from compact into a non-compact layout with the conversation open, refit then frames the 1.0 m point at 0.66 of the area height (8747-8748). That is not the framing a fresh open at that size would give, and the reverse direction has the same problem.
   - The native rotation checks use a fixed y=2.2 subject (study_test.gd:3303), so they don't detect this.
   Fix: in refit_panel_camera, recompute panel_frame_subject.y for block_panel from uses_compact_activity_controls(), or accept the drift and say so.

6. [Inspect source: tests/godot-browser.mjs:45] The browser narrow cases skip 360x600 and 520x568. 360x600 is the only compact case with y>=560, which is the band where fix MUST-1 applies. Add 360x600 to the mouse list. The 12-mouse/6-finger count assertion at godot-browser.mjs:1647 must then change; it is currently hard-coded to 18.

7. [Guardrails "matching actual panel layout to play_area_rect"; godot-browser.mjs:130-135, study_test.gd:3372-3387] The rotation and boundary checks only test that the subject is inside play_area. They never re-check, at the boundary sizes, that the panel clears the header, that the scene is at least 100px tall, or that the controls are not overlapped. For example, 600x560 and 599x667 both drop to legacy layouts. Add the same three geometry asserts used at the base size.

OPTIONAL / NICE-TO-HAVE
- main.gd:6604-6676 re-applies roughly 30 theme overrides on every call. It runs on every update_block_ui during conversation (6571). Each override sends a theme-changed notification and re-queues sorts. It's harmless but noisy; guard it on a (size, mode) signature.
- main.gd:13001: the 560..599 "Walk/Stop" caption depends on has_side_panel_dock(), but update_walk_control is also called outside layout. verify: that walk start/stop with a side dock open still yields "Stop" (the label is correct only if the dock state matches at call time; it should).
- The doc's claim that native preflight3 passes with no script errors cannot be checked from source. verify: the attached log.

CUT THESE
1. [study_test.gd:3372-3394] Running the boundary/rotation/manual-pan sequence for every kind x every size (6 sizes x 3 kinds x 5 resizes plus a pan) is redundant. Layout is a pure function of (viewport, visible panel, mode). Running it once per kind at one small size and one >=600 size keeps the same coverage at much lower native runtime. Safe because the per-size geometry is already asserted before the rotation block.
2. [godot-browser.mjs:98-101] The 32-step wheel loop plus the waitForFunction at :102 checks the same end-of-reader condition twice. Keep the waitForFunction with a bounded wheel count (8). Safe because PageUp/PageDown at :105-109 re-proves scrolling.
