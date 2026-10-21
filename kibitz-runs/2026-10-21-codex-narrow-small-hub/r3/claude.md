TOOL CHECK: PASS (read r3/input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs). No Bash/git available in this lane, so the baseline diff vs 562514d was NOT read directly; "previous behaviour" claims below are marked verify where they depend on it.

- VERDICT: yes-with-fixes. The predicate partition and deferred-call ordering hold up. But the conversation-to-hub camera handoff fires more widely than stated (every short side dock, including >=600), the claimed hub growth/shrink path has no test, and three coverage claims are larger than what the tests exercise.

MUST-FIX BEFORE BUILD

1. [show_block_panel / handoff scope] godot/main.gd:14081 gates the handoff on `uses_compact_activity_controls()`. That is `has_side_panel_dock() or uses_compact_narrow_panels()` (main.gd:6605-6606), and `has_side_panel_dock()` is true at ANY width >=560 with height <560 (main.gd:6587-6592). So 640x360, 844x390 and 1100x480 conversation -> All Actions now also flip `following_player = true` and recentre on the player. The doc says "for compact hubs", and lists >=600 short hub as complete. None of the existing >=600 suites exercise this transition: the short-hub suite opens the hub with KeyG and has no conversation (tests/godot-browser.mjs:1614), verifyShortActivities never taps All Actions (godot-browser.mjs:146-156), and every verify_narrow_hub size is <600 wide (godot/tests/study_test.gd:3268). So an accepted layout changed behaviour with no test. Fix, smallest first:
   (a) Narrow the gate to `uses_compact_narrow_hub() or (uses_side_block_hub() and is_narrow_layout())`, so >=600 keeps its baseline framing. Or
   (b) If the >=600 change is intended, add one >=600 row (e.g. 640x360) to verifyNarrowHub / verify_narrow_hub. Assert following_player, play_area enclosing overlays.player, and the manual-pose survival case (study_test.gd:3326-3334 pattern).
   verify: baseline show_block_panel had no handoff at >=600.

2. [finish_compact_panel_layout / "shared deferred compact growth/shrink path now includes hub"] The hub growth/shrink path is claimed but never exercised. verify_narrow_hub (study_test.gd:3261-3341) does no content-growth injection. The activity suite does (study_test.gd:3443-3454: four-line caption, 6 frames, shrink back, `not compact_panel_layout_pending`). The browser verifyNarrowHub only waits for `!compact_panel_layout_pending` in `settle` (godot-browser.mjs:37) and never forces growth. So nothing tests that main.gd:6711-6712 (`update_camera()` inside finish) keeps the full player in the scene after a deferred hub resize. Fix: copy the 3443-3454 block into verify_narrow_hub at 320x568 with hub open and following_player. Mutate `block_buttons[block_hub_page*4].text` to multi-line, wait 6 frames, and assert:
   - panel.end.y + 7 <= controls.y
   - panel.y >= header.end.y + 7
   - `play_area_rect().grow(1).encloses(player_overlay_rect())`
   - no pending flag
   Then restore the text and assert the same plus a size restore within 1px.

SHOULD-FIX

1. [tests/godot-browser.mjs:1708 stale oracle] The rotation assertion still encodes the old hub breakpoint: `block_hub_side == boundary.width >= 600 && boundary.height < 560`. The code now uses 560 (main.gd:6584-6589 via SIDE_ACTIVITY_MIN_WIDTH=560). It passes only because no boundary in that list is 560-599 wide. Change 600 to 560 so the two browser suites (line 64 uses 560) share one contract.

2. [uses_side_block_hub at 560-599 wide, heights <360 untested] Moving the side hub down to 560px routes 568x320 (common phone landscape) to a side hub. Dock width there is clamp(295, 312, 440) = 312 (main.gd:6622), leaving ~228px of scene. The only 560-599 short sizes tested are 560x360 and 599x360 (study_test.gd:3268; godot-browser.mjs:47). Native requires panel.end.y <= h-11 and scene height >=100 (study_test.gd:3292-3293), and the 568x320 side dock is unverified for both. Add 568x320 to both size lists, or state explicitly that heights <360 are not accepted.

3. [layout_walking_controls_and_hub compact branch / no overflow fallback for hub] main.gd:6680 applies the separation-0 overflow fallback only to `panel != block_panel`. For the compact hub, main.gd:6682 sets offset_top = offset_bottom - min height with no clamp to the header. In the compact-hub band the input itself says is unaccepted (x<560, y<560; uses_compact_narrow_hub main.gd:6598-6600 is still true there), the hub can sit under the header or leave a scene too short for the player, and no assertion or flag reports it. Smallest fix: export a snapshot boolean, e.g. `compact_narrow_hub_fits` (vp.y + offset_bottom - min.y >= header.end.y + 8), so out-of-scope sizes fail visibly instead of silently. Do not widen the predicate.

4. [verifyNarrowHub Info coverage weaker than the >=600 suite] The narrow Info checks only assert `info_reader.control.height >= 24` (godot-browser.mjs:92; study_test.gd:3319). That echoes the constant at main.gd:6658, so it can't fail. The >=600 suite also proves Info scrolls to its final line (godot-browser.mjs:1675-1679), and neither narrow test does. Neither checks that the player stays inside play_area while Info is expanded. Add the 1675-1679 scroll-to-end check, plus `encloses(play_area, overlays.player)` in the expanded state. Or keep the doc's caveat and drop the "Info keeps full font line" wording at study_test.gd:3319.

5. [Coverage claim "actual Start/Bea/hub paths"] verifyNarrowHub never taps start_control. It uses KeyF + Digit1 (godot-browser.mjs:49-53). Real Start taps only happen at 640x360 (godot-browser.mjs:469-485). The bug report names "actual Start/Bea/All Actions at 320x568". Either reload and tap Start at 320x568 before the first Digit1, or reword the claim to "Find Me + Bea walk/talk + All Actions".

6. [show_block_panel handoff side effects vs follow_player()] follow_player() (main.gd:13059-13071) pairs `following_player = true` with `update_occlusion(true)` and `update_walking_status()`. The handoff at main.gd:14082-14086 sets the flag and target and defers update_camera, but calls neither. Cutaway and the Info walking line may stay on the conversation state until the next walk step. verify: whether the camera move leaves stale occluded buildings. Fix: add `update_occlusion(true)` after the deferred camera (e.g. call_deferred), or route through the same steps follow_player uses, without its view_size clamp (the tests rely on zoom staying the same).

7. [Open-boundary player coverage] The boundary loops (study_test.gd:3306-3311; godot-browser.mjs:95-99) check only page, focus, header and controls clearance. They don't check the player. At 599x640 the hub leaves compact layout for the fixed -368/-176 offsets (main.gd:6684-6688) while following_player stays true, and "full player/YOU" is not asserted there. Add `play_area.grow(1).encloses(player_overlay_rect())` to the boundary loop.

OPTIONAL / NICE-TO-HAVE

- [queue_compact_panel_layout dedupe] The signature (main.gd:6693-6698) is never cleared when compact mode ends (early return at 6691). It remembers only the last state, so an A<->B two-state cycle would not be caught. Also, `compact_panel_layout_busy` only suppresses synchronous `resized`; minimum_size_changed is delivered after busy is cleared, so the signature is what actually stops repeats. [ASSUMPTION: Godot 4 emits minimum_size_changed deferred.] Clear the signature on the early-return path, and consider a one-pass-per-frame cap.
- [Naming] SIDE_HUB_MIN_WIDTH (600) now means "narrow layout" (is_narrow_layout main.gd:6958-6959; compact predicates 6596/6600). The actual side-hub minimum is SIDE_ACTIVITY_MIN_WIDTH (560). A comment or rename would stop the next breakpoint change from repeating mistake #1 in SHOULD-FIX.
- [Untracked dir] kibitz-runs/2026-10-20-landmark-discovery-bursts-and-conversation-tour/ is untracked and unrelated. Keep it out of this commit.
- Hard invariants (public/ fingerprint 2a9641a8..., save size <=4096, fallback-font coverage of non-ASCII in main.gd): verify by running the existing gates. I could not hash or run anything in this lane. The new main.gd lines I read (6584-6713, 14062-14087) add no non-ASCII.

CUT THESE

1. [verifyNarrowHub per-page artifacts] godot-browser.mjs:73-74 write a PNG and a full-snapshot JSON for every page × size × input mode (about 24 files). One page-1 artifact per size, as the >=600 suite does (godot-browser.mjs:1642-1645), keeps driver inspection without the bloat. Safe: no assertion reads these files.
2. [apply_block_panel_mode duplicate guard] main.gd:6546-6549 has two back-to-back `if not talk:` blocks. Merging them is cosmetic and changes no behaviour. Safe because nothing runs between them.
