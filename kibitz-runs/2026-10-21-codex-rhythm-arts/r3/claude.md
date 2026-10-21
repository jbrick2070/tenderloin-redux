TOOL CHECK: PASS (read input.md, godot/rhythm_circle.gd, godot/mural_signature.gd, godot/main.gd, godot/mural_workshop.gd, godot/tests/study_test.gd, tests/godot-browser.mjs)

VERDICT: yes-with-fixes. The startup order, save isolation, hosting setter use and modal gating all check out. But the 3D banner texture contract is broken by BoxMesh UVs, the final-segment completion announcement is wrong, and touch-tap jitter silently drops the View Circle "Back restores" contract.

MUST-FIX BEFORE BUILD

1. [Mural border -> MuralCompletionBanner, "SAME texture on existing banner material, no geometry changes"]
   Defect: main.gd:3261-3263 puts the 288x32 four-icon strip from mural_signature.gd:16-21 onto mural_banner_mesh, which is a BoxMesh (main.gd:2635-2637). Godot's BoxMesh UVs use a 3x2 atlas: each face samples only 1/3 of the width and 1/2 of the height. So the street-facing face shows about brass plus a third of drum, cropped to the top half. Tea and heart never appear.
   The probe cannot catch this. tests/godot-browser.mjs:96-97 sums ink/paper across the whole face (ink>=12, paper>=30), so one partial icon passes. The doc's claim that "realzoom streetbanner pixels" prove the border is not shown by this probe.
   Fix (smallest): in main.gd:3261-3262 add `border_material.uv1_scale = Vector3(3, 2, 1)`. Texture repeat is on by default, so every face then shows the full strip. Then change the street probe to bin u into 4 quarters and require ink>=3 in each bin.

2. [Rhythm Complete -> "exact callback/UI progression"]
   Defect: rhythm_circle.gd:294-296 runs host_complete_current(), then close_circle(), then announces `"Rhythm Circle complete. "+programme_title(current_hosting_activity())+" is next."`.
   - Beats can legally be the last segment. programme_issue (main.gd:9376-9388) accepts e.g. [stories,pause,art,beats]. In that case current_hosting_activity() is "" and programme_title("") returns "" (main.gd:9358-9359). The announcement becomes "Rhythm Circle complete.  is next."
   - It also overwrites host_complete_current's "Second Afternoon Complete!" (main.gd:9560-9562). announce_a11y_status keeps only the last message per flush (main.gd:11464-11470, 11478-11487).
   - close_circle (rhythm_circle.gd:266) also announces "return when ready to complete it" right after completion. That is false, though it is overwritten in the same frame.
   Fix:
   - Store `var next := game.current_hosting_activity()` after host_complete_current.
   - If next is "", do not announce (let main's summary stand). Otherwise announce next.
   - Give close_circle an `announce := true` parameter and pass false from complete().
   - Add a native case with hosting_order ["stories","pause","art","beats"]. study_test.gd:3946-3947 only covers beats-first.

3. [View Circle ownership -> "Back restores unless actual scene drag claims ownership"; duplicate touch/mouse]
   Defect: the mouse path waits for a 3px move before releasing ownership (rhythm_circle.gd:369-372). The touch path at rhythm_circle.gd:376-378 sets owns_view=false on the first InputEventScreenDrag, with no threshold. A 1-2px drag from finger jitter during a phone tap on the stage permanently drops the Back restore and pans the camera.
   The native test does not exercise scene_input: study_test.gd:4018 sets `circle.owns_view = false` by hand. The browser test only uses a 20px CDP drag (godot-browser.mjs:160).
   Fix: guard the ScreenDrag branch with the same check, `event.position.distance_to(drag_start) > 3`.

SHOULD-FIX

4. [Modal vs. state reset -> "Back/Escape/reload resets", "hidden timers/overlay safety"]
   Defect: nothing that rewrites state closes the circle. That includes reset_mural_state_to_defaults (main.gd:11895-11977), apply_save_envelope (main.gd:12365+) and the web import path. poll_web_audio runs every _process and applies `__tenderloinWebSavePending` whether or not the modal is open (main.gd:11509-11522).
   - If an import lands while the circle is open (Import Web Save pressed, then F3 before the async read resolves), hosting_results is cleared under the modal.
   - available() turns false, but tick() (rhythm_circle.gd:380-394) never closes the circle.
   - complete() in practice then does `int(game.get_hosted_segment_value("beats"))` on null (rhythm_circle.gd:290), which is a runtime error. pattern() guards this case; complete() does not.
   Fix:
   - Call `if rhythm_circle != null: rhythm_circle.close_circle()` at the top of reset_mural_state_to_defaults. Do the same for close_mural_workshop.
   - Reuse pattern()'s null guard at rhythm_circle.gd:290.
   - Optionally, in tick(), call close_circle() when `visible and not available()`.

5. [Step cues -> "cue clock uses sketch_tick", clock domain]
   Defect: sketch_tick counts frames *pushed* into the generator (main.gd:10755-10757), not frames heard. The generator buffer is 0.25s (main.gd:3166) and is pre-filled (main.gd:10666), while a step is 0.375s (main.gd:171). So the lantern lights up to about 2/3 of a step before the audible sketch step. This is the "music/visual" mismatch the reader text implies does not exist.
   Fix: in rhythm_circle.gd:200, use an audible tick: `int(max(0, sketch_frames_pushed - sketch_generator.buffer_length*MUSIC_MIX_RATE) / samples_per_step)`. [ASSUMPTION] Web output latency adds more; AudioServer.get_output_latency() can be added if that is measured. The native test (study_test.gd:3990-3992) sets sketch_tick directly, so it cannot detect drift.

6. [Keyboard/focus -> "reader/keyboard/native controls"]
   Defect: close_circle focuses the entry only if it is visible (rhythm_circle.gd:265). When the circle is opened with F3 from outside the hub (main.gd:13760-13761), or from talk mode where the nav is hidden (main.gd:6559-6560), the pad that had focus gets hidden. Godot drops focus, so the next arrow keys walk the player (main.gd:13509-13523).
   Fix: record `get_viewport().gui_get_focus_owner()` in open_circle and restore it on close if it is still visible, the same way main.gd:11580 and 11607-11612 do for the mural workshop.

7. [Resize while open -> "resize", layout sequencing]
   Defect: while the modal is open, tick() forces block_panel and the other docks hidden (rhythm_circle.gd:391-393). On a resize or rotation while open, resize_controls defers refresh_hub_camera when following_player (main.gd:14983-14984). It runs while play_area_rect ignores the hidden docks (main.gd:6857-6862), so it frames for a dock-less screen. close_circle restores visibility (rhythm_circle.gd:250-251) but never re-runs layout_walking_controls_and_hub or a hub refit, so after an in-modal rotation the player can end up under the restored dock.
   Fix: set a `resized_while_open` flag in queue_layout. In close_circle, after restoring visibility, call game.layout_walking_controls_and_hub() and, if game.following_player, game.refresh_hub_camera(). Verify: no current test resizes while the circle is open and then checks the dock or player rects after Back.

8. [Banner material -> streetbanner pixel probe]
   Defect: mural_material(Color.WHITE) (main.gd:2580-2585, used at 3261) turns on an untextured white emission at 0.35. That brightens the ink strokes (#294f44) toward the paper colour and squeezes the probe's `sum<480` ink threshold (godot-browser.mjs:96). [ASSUMPTION] The exact lit value depends on scene lighting.
   Fix: either `border_material.emission_texture = border_material.albedo_texture` or set emission_enabled=false for the banner.

9. [Workshop border placement -> "originalcanvasminima", 44px controls]
   Defect: the 24px strip is added inside canvas_sheet (mural_workshop.gd:118-120, 225-227). Content height grows by 24px, but scroll.custom_minimum_size is still capped at vp.y-24-fixed (mural_workshop.gd:231-232). On short viewports the palette/music options can now need scrolling. ink_snapshot (mural_signature.gd:44-49) reports global rects even when the ScrollContainer clips them, so verifyMuralSignaturePixels (godot-browser.mjs:82-87) can sample covered pixels.
   Fix: include `get_global_rect().intersection(scroll.get_global_rect())` in the snapshot, or assert the strip is unclipped. Verify the 320x568 and 520x360 workshop cases still show every option button in full.

10. [Hub entry -> "visible hub-nav RhythmCircle"]
    Defect: a 76px entry plus 4px separation is inserted into the existing Prev/Next/Close HBox (rhythm_circle.gd:83-91; main.gd:14871-14880). The native test never uses the entry (study_test.gd:3961 calls open_circle() directly). Verify: the browser runs at 320 width tap `rhythm_circle.entry` (godot-browser.mjs:111) and assert block_panel's width stays within the viewport.

11. [Test non-vacuity]
    - study_test.gd:3977 asserts only `lamps[0]` (the table world) while its message claims "both layouts". Also assert lamps[1].
    - study_test.gd:4018 hand-sets owns_view, as noted in item 3.
    - Neither suite covers the beats-last order, as noted in item 2.

OPTIONAL / NICE-TO-HAVE
- Active-mode listen() (rhythm_circle.gd:281-283) calls host_toggle_beat up to 8 times. Each call runs save_godot_state (a localStorage eval on web) and update_block_ui (main.gd:9484-9494). Clearing the pattern in one call would make one write.
- open_mural_workshop (main.gd:11567) has no is_rhythm_circle_visible() guard. It is unreachable today because of _unhandled_input main.gd:13739-13743; add the guard for symmetry.
- Hide the saved siblings inside open_circle itself rather than waiting for the first tick (rhythm_circle.gd:391-393), so the modal does not depend on the order of _process calls.
- The focus ring maps left/top to previous and right/bottom to next (rhythm_circle.gd:81-82), so Down in the 4-column pad grid moves to the next pad, not the pad below.
- Verify: F3 (browser find bar) gets preventDefault in the web shell. F2 already sets the precedent.
- Verify: this is the first runtime use of Image.load_svg_from_string (mural_signature.gd:27), so the web export template needs the SVG module. If it is missing, make_texture returns null and the banner silently renders blank.
- The strike pose rotates the arm about its own midpoint without moving it (rhythm_circle.gd:215-218), unlike animate_person_node (main.gd:3473-3475). Visual only.

CUT THESE
1. The `(visible or game.current_hosting_activity()=="beats")` term in rhythm_circle.gd:199 can go. close_circle always resets step_cues to false (rhythm_circle.gd:249), so the second half of the condition can never make `stepping` true.
2. The entry-rect clause in is_screen_point_in_ui (main.gd:13539) can go. The entry is inside block_panel, which main.gd:13553-13554 already covers.
