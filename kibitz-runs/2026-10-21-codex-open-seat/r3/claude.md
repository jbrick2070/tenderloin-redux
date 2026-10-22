TOOL CHECK: PASS (read godot/film_screening.gd, godot/main.gd, godot/rhythm_circle.gd, godot/tests/study_test.gd, tests/godot-browser.mjs).

VERDICT: yes-with-fixes. The native modal, persistence and close-before-replace wiring hold up when checked against the source. One web-bridge wiring defect will stall the pending browser gate: no a11y snapshot is published while the reader is open.

MUST-FIX BEFORE BUILD:

1. [Web a11y bridge / browser gate] While the screening is open, nothing republishes the snapshot unless something announces.
   - The only periodic publisher is main.gd:7419-7423 (every 0.5 s). It is skipped because update_conversation_ui returns early when is_film_screening_visible() is true (main.gd:7404).
   - Rhythm Circle covers the same gap with its own 0.2 s sync (rhythm_circle.gd:503-506). film_screening.gd has nothing equivalent.
   - The JS snapshot only updates when Godot pushes it (main.gd:11057-11060, flushed from main.gd:11549-11558).
   - tests/godot-browser.mjs:978 settle() waits for ui_frame to advance by more than 3 and for film_screening.layout_pending to be false. These steps never announce, so settle() can only time out:
     - tap(reader) and End at :1004
     - the viewport resize loop at :1009
   - The Tab loop at :1007 reads a stale snapshot, so its focus_within assertion passes without testing anything.
   - Second hazard: refresh() announces at film_screening.gd:149 before queue_layout() sets layout_pending=true at :150. The only publish after a frame or music tap may therefore carry layout_pending:true, and no later publish clears it. [ASSUMPTION: this depends on whether the deferred fit_layout runs before main._process calls flush_web_a11y_status in the same frame. Verify.]
   - Fix:
     - call game.sync_web_a11y_status() at the end of fit_layout() (film_screening.gd:173);
     - add a throttled sync while visible, copying rhythm_circle.gd:503-506 (for example a _process in film_screening.gd).

2. [Sequencing of gates] input.md line 6 says the native 24x8 pass ran before the final import-close edit (main.gd:13056). That edit changes close order on a valid import (close, then replace models). Re-run the native suite on the final tree before the browser gate. Do not carry the earlier pass forward.

SHOULD-FIX:

1. [Reward banner / stale visibility restore] The pause list at main.gd:5866 covers the mural workshop and Rhythm Circle but not the film screening.
   - While the reader is open, layout_reward_banner hides the banner (main.gd:5801-5803). If Info is expanded (header_details_expanded and not speech_opened_info), the timer keeps draining while hidden.
   - When it hits 0: visible=false, timer=0, modulate alpha 0 (main.gd:5869-5872).
   - close_screening then restores the visibility saved at open, which is true (film_screening.gd:110-111). Nothing re-hides it, because both paths are gated on timer > 0 (main.gd:13625, :5864).
   - Result: a transparent banner that still counts as visible.
     - It swallows world taps through is_screen_point_in_ui (main.gd:13693).
     - It still reserves layout space (main.gd:4754, 11787, 13550).
   - Fix: add `and not is_film_screening_visible()` to the condition at main.gd:5866.

2. [Focus restoration after rotating while open] Focus can be lost if the layout becomes paged while the reader is open.
   - resize_controls only recomputes block_hub_page when block_panel.visible (main.gd:15125). The block panel is hidden while the reader is open.
   - Watch Film is block button index 8 (main.gd:15019-15030), so it sits on page 2 at 4 buttons per page (main.gd:802, 6782).
   - Open on a wide layout, rotate to a paged layout, then close: the film button can be on a hidden page. Both focus targets fail is_visible_in_tree() (film_screening.gd:113-114), so nothing gets focus.
   - The browser loop at :1009 ends back on the original size, so it never closes in a rotated state.
   - Fix: in close_screening, if game.uses_paged_block_actions() and block_film_btn is hidden:
     - set game.block_hub_page = game.block_buttons.find(game.block_film_btn) / game.BLOCK_ACTIONS_PER_PAGE;
     - call game.layout_block_action_pages() before grab_focus.
   - Add one browser close at 320x568 after opening at the wide size.

3. [Native held-key gate proves nothing] study_test.gd:4475-4480 calls study._unhandled_input(key) directly, then _physics_process. Walking reads Input.is_key_pressed / is_physical_key_pressed (main.gd:13653-13660), and a direct method call never sets those. The "focused film blocks world walking" check passes whether or not the guard works.
   - The guard itself is real (main.gd:13634). Only browser :1008 actually exercises it.
   - Fix: use Input.parse_input_event(key), then Input.flush_buffered_events(), before _physics_process, and release afterwards. Or rename the check so it doesn't claim to cover held keys.

4. [Camera claim not checked after resize] Browser :1008 compares camera_pose before the resize loop at :1009.
   - While the reader is open, resize_controls can still reach:
     - refresh_hub_camera.call_deferred() via the `or uses_short_narrow_walking()` branch (main.gd:15149-15150);
     - refit_after_layout() when in overview (main.gd:15154-15155).
   - Rhythm Circle handles this with return_pose / resized_while_open (rhythm_circle.gd:258, 262). The screening has neither.
   - Fix: assert camera_pose after the :1009 loop as well. If it drifts, skip those two calls while is_film_screening_visible().
   - [ASSUMPTION] Whether the pose actually changes depends on update_camera being idempotent for a static target. Verify.

5. [Stale UI contract] main.gd:10124 still says "Tap 'Watch Film' to cycle frames." The hub button now opens the reader instead (main.gd:15027-15030). Update the line; cycling now belongs to Period/Shift+Period.

6. [Reload test precondition] Browser :1020 presses F4 after a reload plus a single Escape.
   - open_screening refuses if any chapter card is visible (film_screening.gd:91).
   - The hidden snapshot has no `frame` key (film_screening.gd:191-192), so the assertion would fail with undefined rather than with a clear reason.
   - Fix: assert film_screening.visible before checking frame, or dismiss any chapter card first.

OPTIONAL / NICE-TO-HAVE:
- No self-close: if film_result stops being valid while the reader is open, refresh() returns early (film_screening.gd:132) and leaves an overlay with every sibling hidden. Every current mutator closes the reader first (main.gd:12027, 12504, 13056; film_start requires idle at 9907), so this is latent. A one-line self-close like rhythm_circle.gd:496 would guard against regressions.
- snapshot() sends the full SVG string and the reader text in every production a11y publish while the reader is open (film_screening.gd:200 → main.gd:11447, 11553-11558). It also rebuilds the SVG through game.build_film_frame_svg instead of using the cached rasterized source, so the parity assertion at browser :994 compares the builder with itself, not with the displayed texture. Consider gating the svg field to test mode.
- The 420/236 aspect is hard-coded in film_screening.gd:169-170 and :183 (271.25 / 17.625) and duplicated from main.gd:9394. Derive it from one constant, or from the Image size, so the letterbox can't drift from the SVG.
- verify: whether a focused RichTextLabel handles End by itself. The story reader scrolls Home/End/PageUp/PageDown manually (main.gd:13870-13885), which suggests the native handling wasn't relied on there. Browser :1004 depends on it.
- verify: front-face orientation of the BoxMesh with uv1_scale (3,2,1) (main.gd:3049-3051, 3175). The ink/paper pixel counts at browser :1017 can't detect a mirrored image. Look at the open-seat-world-*.png artifact.
- Each frame tap runs update_block_3d and update_block_ui (main.gd:10032-10033), which allocates new materials for every block prop. It works, but it's churn.
- The double announcement from select_frame (main.gd:10038, then film_screening.gd:149) is harmless because the last announcement in a frame wins (main.gd:11540).

CUT THESE (over-engineering):
1. The extra deferred layout pass in open_screening: refresh(true) queues a deferred fit_layout at film_screening.gd:150, then open_screening calls fit_layout() directly at :103. Either one is enough. Safe to cut because fit_layout is idempotent. Note this only applies once MUST-FIX 1 publishes from fit_layout.
2. Nothing else qualifies. The two six-entry caches (film_screening.gd:175-188) are already bounded by framing × shot, and the native test checks that (study_test.gd:4492).

Confirmed sound (checked, no action needed):
- Build order: make_ui creates film_screening at main.gd:15111-15113, before load_godot_state (main.gd:2009 → 2012). The world texture lookup at main.gd:3170 is null-guarded for the earlier build_film_storyboard call at main.gd:3080.
- Cache key: framing:id covers every input to build_film_frame_svg (main.gd:9380-9393).
- Letterbox math: 420 × 0.62 / 0.96 = 271.25 and (271.25 − 236) / 2 = 17.625 (film_screening.gd:183).
- Modal guards:
  - _unhandled_input returns early (main.gd:13891-13895);
  - _physics_process returns early (main.gd:13634);
  - Rhythm Circle, the mural workshop and the screening block each other at open (film_screening.gd:91, rhythm_circle.gd:254, main.gd:11688).
- Close-before-replace order: reset (main.gd:12027), envelope (main.gd:12504), and valid import, only after validation (main.gd:13049-13056).
- No save or sequence writes on the screening path: film_set_screen_frame does not save (main.gd:10028-10039).
