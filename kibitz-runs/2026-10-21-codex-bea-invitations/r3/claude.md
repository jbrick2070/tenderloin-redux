TOOL CHECK: PASS (Read/Grep/Glob on godot/bea_invitation.gd, godot/quiet_seats.gd, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, docs/ASSETS.md all returned real contents). Bash is disabled in this session, so I could not run `git diff`. I reviewed the current working-tree files rather than the diff against 17358a8. I ran nothing: no Godot, no browser suite, no export.

VERDICT: yes-with-fixes. The wiring order, shared-row handoff, save/import sanitizing and no-write paths hold up. However, the world art does not stand the way the code and docs say it does, and the browser "rendered pixel" assertion passes on background colours alone, so it does not prove the art rendered.

MUST-FIX BEFORE BUILD

1. [tests/godot-browser.mjs:1017-1018, verifyBeaInvitation worldProof] The rendered-pixel proof does not show that the art rendered.
   - `paperPixels` (R>200,G>180,B>140) and `inkPixels` (B>R and G>R) are counted on the memory screenshot only. Both are met by existing scenery inside the projected rect:
     - The Long Table cloth `efe3c4` (main.gd:7244) is (239,227,196), which passes the paper test.
     - The Open Floor `2f4f57` (main.gd:7281) is (47,79,87) and teal tiles/stools `5fb8a6` (main.gd:7256/7282) pass the ink test.
     - The quiet cushion stripe `f4e2ad` (quiet_seats.gd:96) passes the paper test.
   - `changed>=15` is the only differential check. 15 pixels is a tiny share of a ≥10x10 rect and can come from any unrelated animation inside the rect. verify: whether anything animates in that rect between the two screenshots.
   - Fix:
     a. Add `paper_samples` to `bea_invitation.snapshot()`: unproject `paper.to_global(Vector3((u-0.5)*1.05,(0.5-v)*0.70,0))` for 2–3 fixed UVs. Use UVs already checked natively, e.g. memory (300/720,430/480) = `29525e` and future (320/720,250/480) = `6a9a8c` (study_test.gd:4692).
     b. In the browser, assert those screen points match the expected texel colour within a tolerance in the matching screenshot. The material is unshaded (bea_invitation.gd:100), so output should be close to texel colour.
     c. Raise `changed` to a fraction of the rect area (e.g. ≥20%).

2. [godot/bea_invitation.gd:24-39] The "folded-paper tent" is a V that floats above the surface and leans away from the camera.
   - Godot rotates +Y toward +Z for a positive `rotation.x`. So:
     - Paper (z +0.10, rot +0.35): top edge at z≈+0.22, bottom at z≈-0.02.
     - Backing (z -0.14, rot -0.35): top at z≈-0.26, bottom at z≈-0.02.
   - The bottoms meet and the tops splay apart, so it reads as an open book, not a tent.
   - Both bottom edges sit at local y = 0.39-0.35·cos(0.35) ≈ 0.061. That is ~6 cm above the table surface (root y 0.812 vs cloth top 0.806+0.006, main.gd:7244) and ~7 cm above the floor (root y 0.056 vs floor top ~0.043, main.gd:7281).
   - The art's normal is (0,-0.34,0.94), tilted down. With the default camera direction (1,1,1) (main.gd:20, :14184) and tangent.x≥0 (main.gd:7204), the foreshortening factor is ~0.34. Leaning back would give ~0.74, roughly half the visible area lost. This is likely why worldProof needs 4× zoom to reach 10 px (godot-browser.mjs:1006,1014).
   - Smallest fix (also update the comment at line 22):
     - paper: `rotation.x=-0.35`, `position=Vector3(0,0.329,0.12)`
     - back: `rotation.x=+0.35`, `position=Vector3(0,0.329,-0.12)`
   - This gives an A-frame resting on its edges with the art tilted toward the overhead camera.
   - Then re-run the bounds and cup checks. Table paper z range becomes about [-0.15,+0.09] with root z -0.15, which still clears the cups at z 0.155-0.245 (study_test.gd:4747).

SHOULD-FIX

3. [tests/godot-browser.mjs:1008-1009, 1014, 1017] Coordinate-space mismatch.
   - `tap()` (line 984) scales Godot viewport coordinates by `s.viewport_width/height`, which is the correct contract.
   - The drag and pixel-scan code scale the same snapshot coordinates by `size.width/height` (CSS viewport). These only agree while the Godot viewport equals the CSS viewport at DPR 1.
   - Fix: use `a.viewport_width`/`a.viewport_height` (or `s.`) everywhere the snapshot rect is mapped to canvas or screenshot pixels.

4. [godot/tests/study_test.gd:4698] Only the pause→stories handoff of the shared row is tested live.
   - The reverse, stories→pause with a story button focused while the row stays visible, is never driven:
     - quiet tests at study_test.gd:4106 and :4563 preload a completed stories result;
     - the browser 640 fixture (godot-browser.mjs:2637) prefills results up to pause.
   - In that transition, quiet_seats.gd:116-124 enters only on the meta flip. It must relabel the focused button, reset tooltip and accessibility_name (lines 125-130), and set Thanh's dialogue, all without the focus rescue (line 119 needs `not show_choices`).
   - Fix: add a native case with order `["stories","pause","beats","art"]` (legal under programme_issue, main.gd:9466). Focus choices[1], call `host_complete_current()`, then assert:
     - row visible;
     - focus retained;
     - `accessibility_name` == QUIET TITLES;
     - detail contains "woven green cushion";
     - `hosting_draft.quiet` unchanged.

5. [godot/quiet_seats.gd:41 + godot/bea_invitation.gd:68-73] Hidden index contract.
   - Story selection is routed through `HOSTING_QUIETS.find(id)`, and `update_choices` indexes `HOSTING_STORIES[i]` for every quiet button. This assumes both arrays have equal length and order (main.gd:96, :102).
   - A third quiet option would crash `update_choices` with an out-of-range index.
   - Fix: in `bea_invitation.setup`, `assert(game.HOSTING_STORIES.size()==game.HOSTING_QUIETS.size())`, or capture the loop index `i` in the quiet button closure instead of `find(id)`.

6. [godot/quiet_seats.gd:170-176 / bea_invitation.gd:70 / godot-browser.mjs:984] The two-line story labels are never checked to fit.
   - The labels are hard-wrapped ("Something you hope\nto make together") at font 12 in two `SIZE_EXPAND_FILL` buttons.
   - Neither `quiet_seats.snapshot().buttons` nor the Bea browser `tap()` reports or asserts `text_fits`. Other features do (e.g. godot-browser.mjs:416, main.gd:11333).
   - Fix: add `text_fits` using `get_multiline_string_size` per button in `quiet_seats.snapshot()`, and assert it in `verifyBeaInvitation` at 320x667 and 520x360.

7. [godot/bea_invitation.gd:46, 93-103] `choice()` returns the raw draft during stories without checking `in TITLES`.
   - With an invalid draft, `update_world` shows the worlds with `texture(id)==null`, i.e. a blank paper. `explanation()` and the buttons, by contrast, treat the state as empty.
   - Load and import already sanitize the draft (main.gd:12975, :13177 goes through the same sanitized `res`), so only direct mutation reaches this today.
   - Fix: in `choice()`, return "" unless the draft value is in TITLES, matching the copied-result branch on line 48.

OPTIONAL / NICE-TO-HAVE

- [bea_invitation.gd:86-88] The 720x480 ImageTexture has no mipmaps, but the StandardMaterial3D default filter is linear-with-mipmaps. At overview/orthographic distance this aliases. Call `image.generate_mipmaps()` before `create_from_image`. The native 720x480 size check is unaffected. The film world texture uses scale 1.0 (film_screening.gd:204); 2.0 here is probably more than the on-screen size needs.
- [bea_invitation.gd:19 / study_test.gd:4745-4747] The anchor heights 0.812/0.056 and the test's cup AABBs and ±1.15 curb strip copy literals from main.gd:7243-7267 and :7281. They will drift silently if the layout mesh changes. Expose the table-top/floor-top/cup constants from main.gd and reference them.
- [quiet_seats.gd:39-46 vs main.gd:9559] After any selection, the dialogue drops the "Choose the invitation, then Host Activity (Z)… Nothing is timed." suffix that row entry sets (bea_invitation.gd:66). `update_block_ui`'s fallback (main.gd:14739) includes it, but `last_panel_dialogue` takes precedence (main.gd:14728). Quiet behaves the same way, so this is cosmetic.
- [main.gd:13514-13539] Cutaway points are only recomputed on camera or occlusion updates. Bea's world becoming visible when stories starts does not force `update_occlusion(true)`. Quiet behaves the same; fine unless a building stays un-cut until the next camera move.

CUT THESE

1. [bea_invitation.gd:30] `backing.cull_mode = CULL_DISABLED` is redundant: `mural_material()` → `material()` already sets it (main.gd:7552, :2587). Safe to delete.
2. [bea_invitation.gd:112 "buttons"] `game.quiet_seats.snapshot().buttons` re-runs the whole quiet snapshot, including per-part 8-corner unprojection of the visitors, on every a11y snapshot. That data is already in the same payload under "quiet_seats" (main.gd:11496). Have the browser test read `snapshot.quiet_seats.buttons` (same physical row) and drop the field. This is safe because `buttons` is only read while stories is active (godot-browser.mjs:990, 1001, 1016).
3. [bea_invitation.gd:112 "texture_cache"] Nothing in tests/godot-browser.mjs reads it, and the native test checks `invitation.textures.size()` directly (study_test.gd:4774). Safe to drop.

VERIFIED OK (rejected misreads)

- Init order: `build_gathering_layouts()` (main.gd:2001) runs before `make_ui()` (main.gd:2013), and `make_ui` sets up quiet_seats (15182-15186) before bea_invitation (15187-15189). So `layout_*_node` and `quiet_seats.row` exist when bea's setup and `update_choices` run. `load_godot_state()` (2016) comes after setup and ends in `update_block_3d()` (main.gd:12757), which calls `bea_invitation.update_world()` (main.gd:3107).
- Every hosting mutation calls `update_block_3d()`: host_start 9545, host_set_story 9560, host_complete_current 9635, browser import 13209. The copied result (bea_invitation.gd:47-48) wins over a stale draft once stories is no longer current.
- Viewing paths do not write. `update_world`, `snapshot` and `cutaway_points` call no save. `select()` writes only through `host_set_story` (main.gd:9555-9563), which refuses outside the stories activity.
- The shared row is handed off cleanly when stories completes (to beats/art/none): the pause branch's focus rescue (quiet_seats.gd:119-122) handles it.
- Strings match the browser: TITLES == `public/hosting.js:4` STORY_CHOICES. Bea's copied memory line is subordinate to film/civic (main.gd:10221-10253).

RESIDUAL / UNTRACED

- I could not diff against 17358a8 (Bash disabled). verify: whether any pre-existing quiet_seats.gd or main.gd behaviour was removed rather than added.
- "Exact all-12 hub titles/pages/original callbacks", public fingerprint, save4096 and fallback-font invariants: UNTRACED. I did not follow those code paths in this pass.
- verify: whether godot-browser.mjs:1759 (`zStep<2`) matches the genuine progression state before `verifyBeaInvitation`, i.e. publish plus start lands on stories in all three genuine viewports.
- No final browser, native or export results were examined. Preliminary runs are not acceptance. Human aesthetic, recognition and accessibility-tool evidence remains absent.
