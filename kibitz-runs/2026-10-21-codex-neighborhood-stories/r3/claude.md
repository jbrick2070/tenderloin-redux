TOOL CHECK: PASS (read godot/mural_stories.gd, godot/mural_workshop.gd, godot/main.gd seams, godot/tests/study_test.gd verify_mural_stories, tests/godot-browser.mjs verifyMuralStories/verifyStoryStreet, docs/ASSETS.md).

VERDICT: yes-with-fixes. The wiring holds together: the submode, the modal guard, startup order, the import/load filter and the 3D texture path all work. But the save-budget guard can permanently lock scenes in place, held Escape skips a level, and the world pixel proof can't detect a mirrored or swapped left/right layout.

MUST-FIX BEFORE BUILD

1. [main.gd:11608-11616 edit_mural_scene budget guard] Demonstrated logic bug: a scene that can't be lifted (a trapped state).
   - The guard rejects any candidate envelope larger than 4096 bytes. It does this even when the edit keeps the size the same or makes it smaller.
   - Lift erases a key, so it always shrinks the envelope. Move keeps the same bytes.
   - Once other state pushes the envelope past 4096, every lift and move is refused with "Your existing save is full; this scene was not changed." The player has no way to recover.
   - That other state already exists. Import merges an optional bag of up to OPTIONAL_SAVE_MAX_BYTES=8192 (main.gd:162, 13081-13087). Note that line 13086 also measures characters with .length(), not bytes.
   - The guard also protects nothing. The next ordinary save writes the oversized envelope without any check. Examples: place_mural_motif main.gd:11771, and set_mural_palette main.gd:11827, which is reachable from the stories footer's own Palette button (mural_stories.gd:176).
   - The native test locks this behavior in. study_test.gd:4216-4218 asserts that edit_mural_scene("cooking","left") is refused while {left:"sharing"} is present. "cooking" and "sharing" are both 7 bytes, so this is a size-neutral replace.
   - Fix (smallest): measure the current envelope size with the next save_seq once. Reject only when candidate_size > SAVE_BUDGET_MAX_BYTES and candidate_size > current_size.
   - Test change: update study_test.gd:4218 so that, with the oversized bag present, it asserts:
     - a growing edit (adding a second scene) is refused and the bytes are unchanged;
     - art.lifts[i] succeeds;
     - a same-size move succeeds.

2. [main.gd:13825-13829 _unhandled_input, Escape one level] Demonstrated sequencing bug.
   - The branch checks `event.pressed and event.keycode == KEY_ESCAPE` but has no `not event.echo` check.
   - Holding Escape: the first press calls close_stories(). OS key-repeat echoes then reach the same branch, now with stories hidden, and call close_mural_workshop().
   - Result: both levels close. This contradicts the "Back/Escape one level" acceptance claim.
   - The non-modal key path a few lines below (main.gd:13831) already filters echo, so the omission is local.
   - Fix: add `and not event.echo` to the Escape condition at 13826.
   - Test: in verify_mural_stories, send a pressed Escape followed by a pressed+echo Escape InputEventKey. Assert that the stories submode is closed and the Workshop root is still visible. The browser test (godot-browser.mjs:289) only uses discrete keyboard.press, so it can't catch this.

3. [main.gd:3248-3254 update_mural_3d with uv1_scale (3,2,1); tests godot-browser.mjs:232-234, study_test.gd:4184-4185] Acceptance gap; not shown to be a bug.
   - The world proof uses {left:"sharing", right:"painting"}. Both halves contain people, so the "both halves have ink/paper/skin" bins pass whether the BoxMesh front face shows the texture correctly, mirrored horizontally, or swapped.
   - The native check only asserts metadata: albedo_texture != null, uv1_scale, emission.
   - The player-facing text claims a direction ("Cooking Together on the left", main.gd:11596). The stated goal is "meaningful actual pixel proof versus metadata". The current tests can't distinguish correct from mirrored.
   - Fix (test only): in verifyStoryStreet, run one pass with a single scene (lift the right half, so {left:X} only).
     - Assert that the left-half bin has skin/ink above threshold.
     - Assert that the right-half bin has roughly zero skin and is mostly paper.
     - The corners from mural_scenes_snapshot (main.gd:11318-11323) are already ordered TL, TR, BL, BR in mesh-local space, so the u<.5 split is meaningful once the content is asymmetric.
   - verify: the UV orientation of the +Z face of Godot 4 BoxMesh in the pinned engine version. Also verify that the camera views the +Z side.

SHOULD-FIX

4. [main.gd:11611] The 4096 limit is a hard-coded literal, but SAVE_BUDGET_MAX_BYTES already exists at main.gd:104. Use the constant so that the guard and the M6 budget can't drift apart. The fix in #1 should use it too.

5. [mural_stories.gd:221-251 queue_layout/finish_layout] Sequencing: re-layouts are dropped while layout_pending stays true across the await.
   - layout_pending stays true until after `await get_tree().process_frame` (line 247-250).
   - Inside that window, the minimum_size_changed signals from title, attribution and content (line 190) hit queue_layout's `layout_pending` guard at line 222 and are thrown away. These fire when the width is applied, the deferred container sort runs and labels rewrap.
   - Afterwards only a viewport-size change re-queues (line 251).
   - The root Workshop clears layout_pending first (mural_workshop.gd:247), so it doesn't have this problem.
   - Effect: scroll.custom_minimum_size and panel.position can be computed from content heights from before the rewrap. [ASSUMPTION: the deferred sort and rewrap flush before the next process_frame; this is standard Godot 4 message-queue order.]
   - Fix: set `layout_dirty = true` when queue_layout is called while pending, and at line 251 re-queue if `layout_dirty or vp changed`.

6. [main.gd:11602 plus mural_stories.gd:215] Silent no-op.
   - Activating a half that already holds the brush's scene returns false with no message and no announce_a11y_status.
   - The target's accessible name still says "Paint <X> here" when X is already there.
   - The root Workshop handles the same case explicitly at main.gd:11694-11697 ("is already here").
   - Fix: on the same-id early return, set stories.message to "<Name> is already on the <slot>.", call present(), and announce. This doesn't write a save, so the "non-write" assertions in godot-browser.mjs:265 and study_test.gd:4172 still hold.

7. [mural_stories.gd:208-212 present()] Performance.
   - Every present() rasterizes three 200x200 SVGs and allocates three ImageTextures.
   - present() runs on every refresh_mural_workshop while the submode is visible (mural_workshop.gd:237). That is reached from update_mural_ui and update_music_ui (main.gd:14448, 14487), including the layout-refit path (main.gd:14319) and every music toggle.
   - Fix: cache the thumbnails by palette key in the existing static `textures` dictionary (lines 72-79), and only reassign when the palette changes.

8. [mural_stories.gd:77, 265; main.gd:3250] texture() returns null if load_svg_from_string fails.
   - draw_paper passes the result to draw_texture_rect without a check, which raises an engine error every redraw.
   - update_mural_3d assigns a null albedo, which leaves a blank white board.
   - Fix: guard for null in both places; skip the draw, or keep the palette material.

9. [main.gd:3247-3254] When any scene exists, scene_material replaces mural_palette_color(mural_palette, mural_completed). The board's brighter canvas tint for a completed 3/3 mural is lost; the banner mesh still shows.
   - verify: whether any test or UX copy relies on the canvas tint.
   - Either document this in docs/ASSETS.md or tint the paper background with the canvas color.

OPTIONAL / NICE-TO-HAVE

- mural_stories.gd:200: the title shows "%d/3" using mural_placements, the core marks, which reads like scene progress. Consider labeling it "Marks %d/3".
- mural_workshop.gd:278-280: stories.snapshot() is computed twice per snapshot. mural_stories.gd:278 and :283 also call activity_detail_snapshot twice.
- godot-browser.mjs:289: the second Escape isn't asserted to close the Workshop.
- docs/ASSETS.md:66: an H1 "# Optional Mural Stories illustrations" directly follows a paragraph with no blank line, while sibling sections use "##". Also "original3D" is missing a space (line 68).
- main.gd:13086 (predates this slice): the optional bag is measured with .length() (characters), while the guard in #1 measures UTF-8 bytes. Unit mismatch between producer and consumer of the same budget.

CUT THESE (over-engineering)

1. mural_stories.gd:73 and :77 build the cache key and the SVG from clean(scenes) twice. Call clean() once. This is safe because clean() is pure and the result is identical.
2. There's no other substantive over-engineering. The three-flag layout state (layout_pending, layout_busy, layout_generation) is justified by the reopen/close race that reset_mode handles (mural_workshop.gd:190-195); don't cut it, fix it per #5.
