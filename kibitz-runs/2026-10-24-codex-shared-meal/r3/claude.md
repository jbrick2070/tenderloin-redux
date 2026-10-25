TOOL CHECK: PASS (read godot/shared_meal.gd, godot/main.gd, godot/shared_meal_data.gd, godot/tests/shared_meal_checks.gd, godot/tests/study_test.gd, tests/shared-meal-browser.mjs, tests/godot-browser.mjs, package.json directly).

VERDICT: yes-with-fixes. The product wiring is mostly sound and closely copies the existing shared_panel modal pattern. But one generalized native test now indexes past the end of an array, which will break the pending full native gate. Several contracts are also only weakly checked: placement, occlusion, and the world-pixel check.

Grounded wiring checks that hold (no action needed):
- Startup order. build_gathering_layouts runs at main.gd:2042, the camera is created at 2049, and make_ui at 2054. The meal's setup and build_world then run at main.gd:15938-15940, so layout_table_node and layout_floor_node exist.
- The Cook & Share button is created at main.gd:15813, before shared_meal exists, but its lambda looks up shared_meal only when pressed. update_block_ui at 15825 and hub_button_for_objective at 7245 both null-guard it.
- Input. Only main.gd has _input/_unhandled_input, and no Button.shortcut exists anywhere in godot/*.gd. The meal guard at main.gd:14582 runs before every other modal. Shift+F8 is checked earlier (14578), but story_picker.gd:88 refuses when is_focused_activity_visible() is true, and that now includes the meal (main.gd:12038).
- There is only one CanvasLayer (main.gd:15574), so the saved_visibility sibling-hiding covers the whole HUD.
- configure_phone_disclosure keeps phone_explore_control hidden while blocked (main.gd:6822, 6827).
- Every failure branch in apply_save_envelope calls reset_mural_state_to_defaults, which runs reset_visit first (main.gd:12456).
- The snapshot button order [prev, next, prepare, serve0, serve1, place0, place1, share, explore] (shared_meal.gd:372-374) matches the indexes used in shared-meal-browser.mjs:71, 74, 80 and 84.
- No network or external calls. The source URLs are plain RichTextLabel text, and make_activity_detail does not enable bbcode (main.gd:15387-15399).
- No persisted state. build_save_envelope is untouched and the meal never calls save_godot_state.

MUST-FIX BEFORE BUILD:
1. [Source map: godot/tests/study_test.gd "generalized to 13"] The array index goes out of bounds in the 320px hub branch.
   study_test.gd:2698 defines long_titles with 12 entries. The loop at 2699-2701 runs `for action_id in range(study.BLOCK_ACTION_COUNT)` (13) and does `study.block_buttons[action_id].text = long_titles[action_id]`, so long_titles[12] is a GDScript runtime error. This branch runs because `if size.x == 320` sits inside the loop at study_test.gd:2454, whose sizes include Vector2i(320, 667).
   The error aborts the coroutine, so the full native gate cannot pass. This fits the evidence that native7 was only a component replay.
   Fix: append a 13th entry such as "Cook & Share" to long_titles at 2698. Do not loop over range(long_titles.size()), because the restore loop at 2711-2712 still needs all 13 entries. The tablet branch at 3097-3111 correctly keeps range(12) and needs no change.

SHOULD-FIX:
1. [Source map: shared_meal.gd world330-369 / main.gd cutaway 14058] Newly shared food never forces an occlusion refresh.
   update_occlusion returns early unless the player moved 0.4 m or the occluder tag changed (main.gd:14046). Neither share_dish (shared_meal.gd:188), close_meal (124-133) nor reset_visit (135-139) calls game.update_occlusion(true). So cutaway_points (364-369) are not used until the player walks, and food behind a facade can stay hidden after Keep exploring or Escape.
   Other modules do refresh: rhythm_circle.gd:304/306/463, dog_story.gd:321, lantern_procession.gd:341.
   Fix: call `if game.camera != null: game.update_occlusion(true)` at the end of close_meal, and in update_world after rendered_world changes.

2. [Accepted scope "serving/placement choices"] The placement choice is barely visible and untested.
   Placement 1 shifts the dish by only -0.02 m on the table and -0.07 m on the cloth (shared_meal.gd:362), which is roughly sub-pixel at gameplay zoom. Despite that, the buttons are labelled "Near edge" and "Other edge" (shared_meal.gd:77).
   No test checks that placement changes anything. check_world (shared_meal_checks.gd:114-123) only checks that the dish stays inside the support area, and the browser test only checks the serving value (shared-meal-browser.mjs:81).
   Fix: use a visible offset that stays in bounds. On the table, about ±0.15 about z=-0.18 keeps the dish inside the ±0.45 half-depth and clear of the cups at z=0.2 (main.gd:7512-7513). On the cloth, about ±0.1. Then add `food.position.z` differs-by-placement assertions to check_world.

3. [Source map: tests/shared-meal-browser.mjs world pixel differences] The world-pixel check can pass for the wrong reason, and it mixes coordinate spaces.
   (a) Lines 99-106 count before/after differences in a 24x18 window around each dish. Neighbor animation and tree sway run every frame (main.gd:14207-14208), so motion near the gathering can meet count>=4 without any food drawn. Fix: also compute the same count in an empty control window and require the food count to be clearly larger, or compare the sampled hue to the dish texture.
   (b) These lines and the framing loop (45, 49-56) treat Godot viewport coordinates as CSS pixels using size.width. tap() (line 18) and the existing verifyPaintedMuralPixels oracle (godot-browser.mjs:110) convert with canvas.x + x*canvas.width/s.viewport_width. The picture clip at line 77 does the same raw mapping. Fix: reuse that conversion. [ASSUMPTION] The two spaces happen to be identical at the 390 and 1100 sizes tested so far, so this is a latent defect rather than a current failure.

4. [Source map: main.gd block UI optional discoverability] Hub guidance contradicts the meal button.
   apply_hub_guidance (main.gd:7251-7270) dims locked actions with "Unlocks later", but never adds block_meal_btn to `locked` while block_opened is false. The button shows as available from the start of the game (it is on its own fourth page when the hub is paged), and pressing it only refuses (shared_meal.gd:103).
   main.gd:7270 also overwrites every block button's tooltip_text, so the descriptive tooltip set at main.gd:15814 is lost the first time guidance runs.
   Fix: add `if not block_opened or (not hosting_order.is_empty() and not is_hosting_done()): locked.append(block_meal_btn)` next to main.gd:7254-7262. Delete 15814 or move its text into the "Unlocks later" tooltip branch.

5. [Source map: main.gd reset/successful load] Closing the meal is ordered differently from every other focused activity on load and import.
   apply_save_envelope closes all other modals before parsing (main.gd:12957-12981). The meal is only closed at 13179, after the loaded state is assigned. close_meal then runs update_block_ui, layout_walking_controls_and_hub and return_focus.grab_focus (shared_meal.gd:130-132) against half-applied state, before update_block_3d and update_block_ui at 13186/13193.
   Import calls update_block_3d at 13657, which renders the previous visit's food, and only then calls reset_visit at 13660.
   Fix: move `if shared_meal != null: shared_meal.reset_visit()` up next to main.gd:12957. Every failure path also resets, so behavior does not change. In import, move the call before 13655.

6. [Source map: godot/tests/shared_meal_checks.gd] The native helper never resizes the viewport while the meal is open.
   Every root.size change (line 10) happens before open_meal. The mid-visit path is never exercised: Control.resized → queue_layout → deferred fit_layout (shared_meal.gd:82-84, 237-257), plus main's resize_controls (main.gd:15942+) calling close_phone_disclosure and layout_walking_controls_and_hub, which shared_meal._process (386-391) then re-hides. This includes crossing the side-layout threshold (vp.x>=520 and vp.y<500, shared_meal.gd:245) and the phone-disclosure reparent (main.gd:6805-6817).
   Fix: inside the cook loop, change root.size once, e.g. 390x667 → 559x360 → 390x667. After each change, re-run check_layout and require snapshot().focus_within.

7. [Source map: main.gd optional exploration hub suggestion 7225] One clause is redundant and the side effect needs explicit sign-off.
   current_objective returns "explore" only after is_hosting_done() (main.gd:6133-6148), so `(hosting_order.is_empty() or is_hosting_done())` at 7245 is always true there.
   Side effect: show_block_panel (main.gd:15225-15226) and run_conversation_action_id("hub") (main.gd:6654-6655) now open paged hubs on the last page, which holds only Cook & Share. This happens on every end-game session until four dishes are shared, and again after each reload because the meal does not persist.
   Fix: drop the redundant clause. Confirm in the plan that landing on that page is intended for phone and short layouts. findHubAction already rewinds to page 0 (godot-browser.mjs:18); other callers that assume page 0 at "explore": verify.

OPTIONAL / NICE-TO-HAVE:
- The credit line, which carries the "Original fictional neighbors | ... | This visit only" disclosure, uses font size 10 (shared_meal.gd:55). That is below the 12-16px floor used elsewhere. Raise it to at least 12.
- fit_layout has no floor for small portrait heights. Below about 430px tall with width under 520 (not side mode), the tray overlaps the top panel and the picture shrinks to 1px (shared_meal.gd:253-255). This is outside the current matrix. Consider adding 320x568 to the meal matrix, since other suites use it (study_test.gd:6415).
- World textures are rasterized at 720x480 with mipmaps for a 0.7 m quad, and the FIFO cache of 8 (shared_meal.gd:319-328) evicts often during step presses. A smaller world raster would reduce work on mobile.
- mural_material(Color.WHITE) (shared_meal.gd:345, main.gd:2627-2632) adds uniform white emission at 0.35 energy, which washes out the dish textures.
- The helper leaves following_player=false, in_overview=false and the block panel open before verify_map_pinch (study_test.gd:3297). verify_map_pinch partly resets (6226-6232); verify it does not depend on the hub being closed.
- Verification gaps, separate from the bugs above: the late hub text (main.gd:15451-15452) and the third desktop grid row (13 actions = 6+6+1 at columns=6, main.gd:7028) are covered only by the five pending FINAL gates. The source URLs and the attributions to the named authors (shared_meal_data.gd:9, 25, 41, 57) were not checked against the live pages: verify.

CUT THESE (over-engineering):
1. shared_meal.gd:114 `game.pointer_active=false; game.orbit_dragging=false`. cancel_map_pinch, called on line 113, already clears both (main.gd:14459-14461).
2. main.gd:7245 clause `(hosting_order.is_empty() or is_hosting_done())`. It is always true when obj_id=="explore" (see SHOULD-FIX 7).
3. shared_meal.gd:215-216 sets the row visibility inside the `for i in range(2)` loop, so each row parent is set twice. Hoisting it is cosmetic only.
4. [ASSUMPTION; verify before cutting] The per-frame update_world in shared_meal.gd:387 duplicates the call from update_block_3d (main.gd:3149). Keep it only if a story episode can toggle `.active` without any update_block_3d call. Otherwise call it on share, reset and story transitions only.
