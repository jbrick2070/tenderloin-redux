TOOL CHECK: PASS. I read godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs directly. I grepped the tests/*.test.mjs files; none of them reference these thresholds.

VERDICT: yes-with-fixes. The 520..559 wiring in main.gd is internally consistent. That covers the predicates at main.gd:6585-6615, the dock minimum at 6633, the handoff at 14118, the body fit at 13796 and the resize path at 14722-14753. However, no gate has passed yet, and the tests at the exact new seams (entering the band by resize, 559<->560 at short height) are vacuous or missing.

Code wiring I verified, so no action is needed:
- uses_side_block_hub (main.gd:6587) needs x>=520, y<560, a visible hub and mode "hub". panel_uses_side_dock (6595) docks only the block hub in this band. uses_short_side_panels keeps activities at 560 (6592). uses_compact_narrow_hub excludes the side hub (6603).
- show_block_panel sets block_panel.visible (14115) before it reads uses_side_block_hub at 14118. The camera refresh is deferred (14123), so it runs after the synchronous layout (14124). The ordering is correct.
- resize_controls maps the focused button to its page (14726-14729) before update_block_ui and layout run (14749-14752). Page and focus therefore survive the 519/520/559/560 crossings.
- Close from the side hub: once visible=false, uses_short_narrow_walking becomes true (6615), and the deferred update_camera fits the body (13787-13809). This matches godot-browser.mjs:56-57.
- No other code path sets block_panel.visible=true (grep: only 14115 and the init at 14617). All mode changes go through show_block_panel or apply_block_panel_mode.
- External systems: this change makes no third-party calls. PLAYWRIGHT_MODULE and GODOT_PORT are unchanged (godot-browser.mjs:25-26).

MUST-FIX BEFORE BUILD:
1. [Gates / ordering] The document says native preflight 3 and browser preflight 2 are still running, and no gate has passed. Required order: final main.gd edit, then native, then godot:export, then check, then 104 Node, then browser 1100x760/390x667/320x667. Any fix from this review that touches main.gd invalidates the export. The browser suite fails fast on a stale pck (godot-browser.mjs:10-22 compares pck mtime against main.gd), so re-export before re-running it. Report the real pass output and errors/external lists. Verify: the actual preflight 3 / preflight 2 results.

2. [Native hub transitions, study_test.gd:3322-3328] The boundary loop's check "narrow open hub breakpoints keep header and walking targets clear" (3327) cannot fail for side-dock sizes.
   - Why: in the dock, controls.offset_right = -(dock_width+20) (main.gd:6635) and panel.offset_left = -(dock_width+12) (main.gd:6687). The panel and controls are therefore horizontally disjoint by construction, so `not intersects(controls)` always holds.
   - What is missing: the loop has no bottom-edge or Close check after resizing into 520x360, 559x360 or 520x559. The per-size bottom check at 3294 covers only the open-at-size path, not the resize-entry path.
   - Fix: add `study.block_panel.get_global_rect().end.y <= boundary.y - 11 and study.block_panel.get_global_rect().encloses(study.block_close_btn.get_global_rect())` to 3327. Also add `study.uses_side_block_hub() == (boundary.x >= 520 and boundary.y < 560)` so each crossing proves which mode it is in.

SHOULD-FIX:
1. [Browser hub transitions, godot-browser.mjs:148-156] At width 520, the resize sequence 519x360 -> 559x360 -> 520x560 -> 520x360 asserts only camera_pose (154). The only browser open-hub layout rotation (157-163) runs for width===320, and its list (158) has no size with width>=520 and height<560. The browser therefore never checks the panel, Close or focused page when the hub re-enters the new side band by resize. Fix: in the 154 loop, when size.width>=520 && size.height<560, assert block_hub_side, block_hub_page unchanged, encloses(screen, block_panel_control) and encloses(block_panel_control, block_close_control).

2. [559<->560 seam at short height, study_test.gd:3322] Crossing 559->560 with y<560 changes only dock_min (main.gd:6633). Dock width jumps from 290.7 to 312, and the controls' right offset jumps with it.
   - No test crosses this seam directly with the hub open. Native order goes 559x360 -> 520x559, and 560x559 is reached diagonally from 559x568. Browser 158 is also diagonal.
   - Fix: insert Vector2i(560, 360) right after Vector2i(559, 360) in the 3322 list.

3. [Side-dock deferred growth, main.gd:6704 and 6603] queue_compact_panel_layout returns early unless uses_compact_narrow_panels() is true, and the side hub is excluded from that. In the side dock, panel growth after layout is only tested at 320x568 (study_test.gd:3307-3320).
   - At 520 the dock is 288px, so each button is about 136px wide with AUTOWRAP_WORD_SMART (main.gd:14841).
   - A caption change ("Return Gear (2/3)", "Paint w/ Celeste (0/3)") can wrap and grow the panel downward (GROW_DIRECTION_END, main.gd:6689). Nothing clamps the bottom and nothing relayouts.
   - Fix: run the same 3307 growth/shrink probe at 520x360, asserting panel end.y <= vp.y-11 and that Close stays enclosed. If it fails, include the side hub in the queue gate.

4. [Hard-coded / stale thresholds]
   - Stale formulas: study_test.gd:3173 (`x >= 600`) and godot-browser.mjs:1773 (`width >= 560`) predate the 520 rule. They still agree with the code only because their size lists contain no short width in 520..599.
   - Duplicated literals: study_test.gd:3341 and godot-browser.mjs:111-112 repeat 520/560.
   - Fix: native should use study.SMALL_SIDE_HUB_MIN_WIDTH and study.SIDE_HUB_MAX_HEIGHT; constants are already reachable this way (see study.GUIDE_MARKER_LIFT_HIGH at 1758). Update the browser formula at 1773 to 520.

5. [Original titles are not asserted] block_action_snapshots returns the button text (main.gd:11178), but the tests check only text_fits, size and id (study_test.gd:3298, godot-browser.mjs:116). Fix: capture the 12 titles at 1100 width and assert they are equal in the 520..559 band. Otherwise a future narrow-only shortening would pass unnoticed.

6. [Walking manual pan across the 520 seam] Native resizes only to 599x375 (study_test.gd:3428). The browser list at godot-browser.mjs:76 has no width-519 size. Fix: add 519x360 to both. Risk is low because recentering is gated on following_player (main.gd:14750, 8789), but this is the new seam.

7. [Touch Stop at 520, godot-browser.mjs:181-190] The test does not assert the save is unchanged after Stop; the walking matrix does this at line 70. It also does not assert that the hub is still side-docked with Close reachable before Map. Fix: add a save-equality check and a block_close_control enclosure check after `still`.

OPTIONAL / NICE-TO-HAVE:
- One constant, SMALL_SIDE_HUB_MIN_WIDTH, gates both the hub (main.gd:6587) and normal walking (6615). Consider a separate walking alias so later tuning of one doesn't silently move the other. The comment at main.gd:795 ("side panels can fit at560px") is stale.
- Hub dock width does not grow steadily with window width: 288 at 520, 290.7 at 559, 312 at 560. Making the window 1px wider shrinks the scene by about 21px. This is acceptable because >=560 must stay as-is; it is documented here only.
- At 520 the play area is 520-288-20-8 = 204px wide, against a 200px test threshold (study_test.gd:3295, godot-browser.mjs:114). A 4px margin is brittle.
- Black Hawk coordinates are hard-coded three times (godot-browser.mjs:68, 184, 1789), duplicating BLACKHAWK_POS (main.gd:30). Expose them in the snapshot instead.
- The guide-marker assertion (study_test.gd:1758) restates main.gd:6153-6154 (position = target + UP*sin*0.14*s, scale = s). It is fine as a regression guard. Note that the document's "exact XZ" is actually a <0.01 tolerance.

CUT THESE (over-engineering):
1. Nothing needs cutting for correctness. Optional runtime trim: study_test.gd:3322 runs all 11 boundaries from each of 12 hub sizes, which is 132 resizes at 4 frames each. Running it from one origin per mode (compact <520, side 520..559, side 560..599, tall compact) would keep coverage of every crossing direction that matters. It is safe only if must-fix 2 adds the per-boundary mode, bottom and Close assertions, so the shorter list stays meaningful.
