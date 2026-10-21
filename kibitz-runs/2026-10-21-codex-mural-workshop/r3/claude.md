TOOL CHECK: PASS (read godot/mural_workshop.gd in full, main.gd workshop integration, study_test.gd verify_mural_workshop, tests/godot-browser.mjs verifyMuralWorkshop, public/game.js muralEditor). No commands executed; no gates run by this reviewer.

VERDICT: yes-with-fixes. The core wiring holds up. Closures are captured per iteration, the save stays zero-based, collision and same-cell writes are rejected before place_mural_motif, physics/unhandled input are gated, the snapshot is read-only, and the workshop is the last child of the only CanvasLayer. Two reachable defects need fixing first: a hidden reward drains while Info is open (and the tests mask it), and the new Compose entry drops focus every frame.

MUST-FIX BEFORE BUILD:
1. [reward/sequencing] Hidden workshop rewards lose their reading time whenever header Info is expanded.
   - main.gd:5766-5769: layout_reward_banner() returns early while the workshop is visible. That also skips the Info-prefix fallback at 5791-5798.
   - main.gd:5831-5832: update_celebration_burst() still decrements reward_banner_timer when `header_details_expanded and not speech_opened_info`.
   - Result: a player who opened Info before composing gets a placement reward (trigger_progress_cue -> trigger_feel_good_burst, main.gd:10622) that appears neither in the banner nor in Info, and it expires unseen after 3.2 s.
   - Both tests are false positives for this case. study_test.gd:3776 forces set_header_details(false,false) before the queue check at 3848-3851. godot-browser.mjs:153 is wrapped in `if(cue.remaining>0)`, so a drained timer simply skips the assertion.
   - Fix: at main.gd:5831, add `not is_mural_workshop_visible() and (...)` before decrementing. Repeat study_test.gd:3848-3851 with set_header_details(true,false). In the browser, assert cue.remaining>0 unconditionally right after a valid placement (for example after godot-browser.mjs:126).

2. [Compose entry / focus / input] layout_mural_compose_entry() toggles visibility every frame.
   - main.gd:11619 sets `mural_compose_btn.visible = false` unconditionally, and 11631 sets it back to true. It runs every frame from _process (main.gd:13439).
   - In Godot 4, hiding the Control that owns keyboard or mouse focus goes through Viewport::_gui_hide_control: it releases key focus, drops mouse focus and drops hover. verify: engine behaviour on the pinned Godot version.
   - Reachable effects:
     (a) close_mural_workshop() sends focus back to the compose button (main.gd:11573-11576; it is the return target after a click or keyboard open), and that focus is lost on the next frame, so the fallback logic is defeated.
     (b) Tab onto Compose cannot keep focus, so keyboard activation of the new entry is unreliable. F2 still works.
     (c) Hover flickers. verify: a mouse press held across frames gets _drop_mouse_focus's synthetic release, which may activate on press rather than release.
   - The tests can't see this. Playwright click/tap is down+up within one frame (godot-browser.mjs:53, 76), and nothing asserts focus after Back (156-157).
   - Fix: compute the chosen position (or none) first, then assign `visible` once, only when it changes. Add a browser assertion that after Back, followed by settle, the focus owner is still the compose or mural button.

SHOULD-FIX:
1. [interface contract: zero-based save vs one-based UI] The workshop shows one-based coordinates: mural_workshop.gd:92 and 158-159 ("col+1,row+1"), and main.gd:11606 ("column %d, row %d" with +1). The same placement is shown zero-based elsewhere:
   - the legacy quick-panel motif buttons, main.gd:14290-14291 (`int(c_dict.col), int(c_dict.row)`), which stay visible after Back;
   - Info and the announcement from place_mural_motif, main.gd:11681-11682.
   So "Placed Sun at column 3, row 2" is followed by "Sun (2,1)" and "Placed Sun motif at (2, 1)". The save is correctly zero-based (main.gd:11672).
   - Fix: add +1 in those four display strings only. No test asserts these strings (grep finds only test descriptions at study_test.gd:742-749).

2. [sequencing: arrival vs open] F2 during the final approach discards arrival side effects.
   - is_near_mural_workshop() accepts ARRIVAL_DISTANCE_M + 0.9 (main.gd:11525), which is wider than the arrival radius.
   - open_mural_workshop() then calls stop_walking() (main.gd:11550-11551). That clears walking_to_mural and pending_celeste_talk (main.gd:13171-13175) before the arrival handler (around main.gd:8639-8641, arrived_mural=true) or the pending Celeste talk can run.
   - show_mural_panel(true) (11553) then forces the panel open, which makes can_interact_with_mural() true (11635) without the arrival or talk having happened.
   - Fix: if walking_to_mural or pending_celeste_talk is set, complete the arrival or talk before opening, or refuse with an "arriving" announcement. [ASSUMPTION] verify: the exact arrival function around main.gd:8630-8665, and whether Celeste's first-talk progress is otherwise recoverable.

3. [entry contract inconsistency] The three entry points have different preconditions.
   - Easel tap (main.gd:13585) and Compose (main.gd:11620) require mural_panel.visible plus proximity. F2 (main.gd:13716-13717) needs proximity only.
   - On F2, show_mural_panel(true) (main.gd:14201-14208) silently hides an open Bea hub/talk or Rook panel and resets talk_partner. Back then lands on Celeste's panel, and the captured return focus (11552) is hidden, so the fallback is used.
   - Fix (smallest): give F2 the same guard as 13585, or open the panel only when it is not already showing another activity.

4. [label legibility] Empty cells draw ink #253b42 (mural_workshop.gd:148, 169) on canvas.lightened(0.3) (mural_workshop.gd:161), using mural_palette_color (main.gd:3233-3240), at 12 px (mural_workshop.gd:131).
   - My computed contrast: about 3.4:1 (garden), 3.2:1 (ocean), 2.9:1 (sunset incomplete). That is below the 4.5:1 usually applied to small text, and the "+\ncol,row" labels are the targets players use.
   - Fix: lighten to about 0.6, or use light ink on empty cells only.

5. [prior-art behaviour / false-positive coverage] Selection never advances to an unplaced motif.
   - public/game.js:379 and 392 pick the first unplaced motif when the editor opens and after each placement.
   - The workshop opens on active_motif (main.gd:11554) and keeps the just-placed motif selected (11604-11607). After "Placed Sun", the next tap on an empty square moves Sun instead of adding Wave.
   - The browser test always taps a tool before each cell (godot-browser.mjs:85), so it never exercises this path.
   - Fix: when placements are under 3, select the first unplaced motif at open and after a successful placement.

6. [test ordering] The browser checks camera pose (godot-browser.mjs:123-124) before the Palette tap (139). cycle_mural_palette() calls show_mural_panel(true) (main.gd:11738), which can run focus_mural_camera or refit (main.gd:14214-14218) behind the hidden scene.
   - Native coverage at study_test.gd:3858 is only the manual-pan case, and the followed-camera case after Palette is unchecked.
   - Fix: move or repeat the pose assertion after 139, or before Back at 156.

7. [honest evidence] Native placement, palette and music use `emit_signal("pressed")` (study_test.gd:3810, 3819, 3828, 3840, 3845, 3856). That bypasses GUI input and toggle_mode state, so present native results as callback/contract proof only. The real-input proof is the browser lane, which is still pending a fresh run.

OPTIONAL / NICE-TO-HAVE:
- Arrow keys outside the grid: mural_workshop.gd:117-119 maps left, right, top and bottom all to "next", so Left or Up on Dez moves to Celeste. Grid edges clamp to self (97-100), so arrows cannot leave the grid; only Tab does. Map left/top to previous.
- open_mural_workshop's refusal text (main.gd:11548) says "Walk to Celeste..." even when the player is near and the real cause is startup_story_pending or a visible story card. Branch the message.
- present() replaces only the "normal" stylebox (mural_workshop.gd:168). Hover and pressed keep the generic theme, so a cell's motif colour disappears while hovered, including the touch-hover left after a tap.
- Each placement runs present() three or four times: via update_mural_ui 14320 (from 11675), via update_music_ui 14359 (from trigger_progress_cue 10623), then 11607. Each call allocates 18 StyleBoxFlats and queues a layout. Caching one style per occupant would help.
- verify: a touch drag inside the workshop ScrollContainer that starts on a cell must not place on release. This is only reachable when the scroll actually overflows.
- mural_workshop.gd:188 `panel.size.x = width` is redundant because 191 sets the full size.

CUT THESE (over-engineering):
1. z_index = 100 (mural_workshop.gd:32). The workshop is already the last child of the only CanvasLayer (main.gd:14595, 14890), and main.gd sets no other z_index or top_level, so draw and input order are already topmost. Safe to drop; harmless if kept.
2. The extra refresh_mural_workshop() in the Palette lambda (main.gd:14896). set_mural_palette() always reaches update_mural_ui() (11731), which refreshes first (14320). Keep the Music one: verify whether start_music_playback can return early before update_music_ui (10660).
3. The duplicated credit map (main.gd:11586 and mural_workshop.gd:79). Move it into one const so credits can't drift between the files.
