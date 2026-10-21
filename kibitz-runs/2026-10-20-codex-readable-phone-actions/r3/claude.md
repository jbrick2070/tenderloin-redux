TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot, driver_anchor.md).

VERDICT: yes-with-fixes. The paging, callback order, Close handling and conversation hiding are wired as described. Two problems need fixing first. (1) "Reopen resets to page 0" hides the existing gold suggested-step highlight on phones for 5 of 9 objectives. (2) The native overlap/enclosure checks can pass on pages 1-2 even when those pages overflow.

MUST-FIX BEFORE BUILD

1. [Hub "Reopen resets to page0"] This conflicts with the existing apply_hub_guidance highlight.
   - Defect: show_block_panel() sets block_hub_page = 0 whenever the panel opens from hidden (main.gd:13555-13557). apply_hub_guidance() still puts the gold "Suggested next step" style on hub_button_for_objective() (main.gd:6661-6680, 6637-6657). On narrow layouts only indices 0-3 are visible on page 0 (main.gd:6512-6513).
   - The suggested buttons for the "mural" and "soundcheck" objectives (indices 4 and 5, main.gd:14066-14067), "blackhawk" and "civic" (6 and 7, main.gd:14068-14069), and "film" (8, main.gd:14070) sit on pages 1-2. So on phone the main guidance cue is hidden when the hub opens.
   - The same gap affects hotkey and other entry points that open the hub from hidden and act on a later-page button. advance_civic_step (main.gd:9364), advance_film_step (main.gd:9633), toggle_voices_enabled (main.gd:9989) and import_browser_save_from_web_storage (main.gd:12393) all call show_block_panel(true). The panel then lands on page 0 while the action that just changed is on page 1 or 2.
   - Under the baseline layout (all 12 visible in rows, per driver_anchor.md) this was not hidden, so this is a regression.
   - Fix (smallest change): in show_block_panel(), on the "not was_vis" branch, replace "block_hub_page = 0" with the page of the suggested button: `var s := hub_button_for_objective(String(current_objective().get("id",""))); block_hub_page = maxi(0, block_buttons.find(s)) / BLOCK_ACTIONS_PER_PAGE`. find() returns -1 for null, so the fallback is page 0.
   - Update input.md and the tests from "reopen resets to page0" to "reopen opens on the suggested action's page". The browser reopen flow (godot-browser.mjs:1027-1033) waits for page 1 after a single Next click. That still holds only if the objective at that point maps to page 0, so it needs a fixed expected page; verify the objective at that moment.

2. [Tests "all12 IDs/title bounds"] The native panel-bounds checks use a stale rectangle and run only on page 0.
   - Defect: blk_rect is captured once before the page loop (study_test.gd:2383). It is reused for `blk_rect.encloses(bkr)` on every page (study_test.gd:2404). The header/panel/controls no-overlap assertion runs only once, also before paging (study_test.gd:2386).
   - The narrow vertical budget is very tight. The panel is 368-176 = 192 px (main.gd:14182-14183) with zero top/bottom content margin (main.gd:13835-13836). Contents are roughly: label (13 px font) ~18, plus 2 + detail 30, plus 2 + grid 2x44 + 4, plus 2 + nav 44 (main.gd:14081, 14263) ≈ 190 px. That leaves about 2 px of slack.
   - Any page whose wrapped titles need a third line makes its grid row taller than 44 px. The panel's minimum size then exceeds its rect. [ASSUMPTION] With grow_vertical left at its default (END), the panel grows downward over the walking controls at controls.offset_top -174 (main.gd:14170). Verify: grow_vertical of block_panel after set_anchors_and_offsets_preset (main.gd:14015).
   - The browser test does check per page (godot-browser.mjs:1000). The native test does not, so native "passes" on pages 1-2 are not evidence.
   - Fix: move the `blk_rect` / `blk_controls_pos_y` reads and the no-overlap require() inside the `for hub_page` loop (study_test.gd:2390), after the two process_frame awaits.

3. [Tests "actual font measurements assert full titles fit"] Only the labels for the state at test time are measured.
   - Defect: update_block_ui() rewrites every action title by state (main.gd:13723-13787). block_action_snapshots() measures whatever text is current (main.gd:10778-10791).
   - The native run sets all neighbors visited and block_opened=false (study_test.gd:2374-2377). So longer variants are never measured: "Soundcheck w/ Rook (OK)", "Black Hawk Site (OK)", "District Border: Off", "Tenant Circle (Done)", "Roll Camera (Clear)", "Hosted All 4 Events", "Gear Returned (3/3)", "Local Stories: Err", "Web Save Loaded". These are what would trip the overflow in item 2.
   - Fix: in study_test.gd, at 320 px only, for each button assign the longest variant listed above (restore afterward). Re-run layout_block_action_pages() plus two frames, then assert text_fits and panel.end.y <= controls.position.y. No production change.

SHOULD-FIX

1. [Accessibility/focus; "resize clamps/remembers pages"] A focused control can be hidden, which drops keyboard focus and re-enables arrow-key walking.
   - Case A: resizing desktop to narrow while a button on another page has focus. layout_block_action_pages() hides it (main.gd:6512-6513) and focus is released.
   - Case B: switching talk to hub through the conversation "hub" action. apply_block_panel_mode() hides conv_rows, which contain the focused conv button (main.gd:6472-6478, 6463-6465), and nothing re-grabs focus.
   - _physics_process lets arrow keys move the player only when gui_get_focus_owner() == null (main.gd:12859-12862). So in both cases arrow keys start walking the player while the panel is open.
   - Fix: in layout_block_action_pages(), before the visibility loop, if `get_viewport().gui_get_focus_owner()` is in block_buttons[0..11] and narrow, set block_hub_page to that button's index / 4. In apply_block_panel_mode(), when moving from talk to hub, grab_focus on the first visible action if focus is null.
   - Also note: block_action_page_count() is constant at 3 (13 buttons; main.gd:6503), so the clamp at main.gd:6510 never changes anything. "Remembers" only means a stale page carried over from before the window was widened.

2. [Interface contract: Close counted inside block_buttons] There is an index coupling.
   - Close is created through block_button() (main.gd:14083), so it is appended as block_buttons[12] (main.gd:14270). Paging, visibility and snapshots all assume "the last element is Close": `block_buttons.size() - 1` at main.gd:6503, 6512 and 10780.
   - Any future block_button() call after Close, or a reorder, silently breaks page count, visibility and the browser ids. The only guard is the count assertion of 13 at study_test.gd:2382.
   - Fix: add `const BLOCK_ACTION_COUNT := 12` and use it at those three sites. Optionally, do not append Close to block_buttons and add it explicitly to the font loop at main.gd:14163.

3. [Tests "announce current page"] The announcement is not tested.
   - change_block_action_page() announces "Block actions page %d of %d. …" (main.gd:6534). Neither test file contains "Block actions page". The snapshot already exposes "announcement" and "seq" (main.gd:10902-10903).
   - Fix: after each ui_accept page change (study_test.gd:2417), require that `study.last_a11y_announcement.begins_with("Block actions page %d of 3" % (hub_page + 2))`.

4. [Detail "preserved when unchanged"] The property is not tested.
   - The guard is at main.gd:13720-13722. The native test scrolls (study_test.gd:2432) but never calls update_block_ui() or triggers a resize before asserting, so the claimed preservation is never exercised.
   - resize_controls also re-applies normal_font_size on every size_changed (main.gd:14150-14151). Verify: whether this theme override re-layout resets the RichTextLabel scroll.
   - Fix: after the scroll at study_test.gd:2432, set a real long detail through last_panel_dialogue, call study.update_block_ui() twice, then assert hub_scroll.value is unchanged. Set block_detail_label.text directly only to restore.

5. [Browser test: config propagation] Layout constants are hard-coded in JS instead of read from the snapshot.
   - godot-browser.mjs:985, 990 and 1006 key narrowness, the page count (3) and the action count off `size.width < 600`. Line 1000 hard-codes the controls offset `size.height - (174 : 124)`, which mirrors main.gd:14170.
   - The snapshot already carries block_hub_pages (main.gd:10876) and viewport_width. If Godot's viewport width ever differs from the CSS width (the test already scales by viewport_width at godot-browser.mjs:1015 and 1041), these hard-coded values go out of sync.
   - Fix: add `"controls_control": control_snapshot(controls)` to the snapshot near main.gd:10868. In the test, use `hub.block_hub_pages` and `hub.controls_control.y` instead of the literals.

6. [Browser wheel test vs the driver-anchor "no scroll-to-walk/zoom leakage" requirement] Zoom leakage is not checked.
   - godot-browser.mjs:1016-1020 asserts only that player x/z are unchanged. Wheel zoom lives in _unhandled_input and is guarded by is_screen_point_in_ui (main.gd:13238-13243), so a regression there would not be caught.
   - Fix: capture camera_view_size before the wheel and assert it is unchanged afterward. The field already exists; it is used at godot-browser.mjs:967.

7. [Browser "long real hub details remain scrollable"] The check depends on game state.
   - godot-browser.mjs:1013 requires scroll_max > page for whatever detail string the run happens to be in (main.gd:13704-13719). A shorter state string, such as the block-open line at main.gd:13716 at 390 px, can be two lines or fewer and fail for reasons unrelated to this change.
   - Fix: gate the assertion on the detail text length, or take a deterministic route (for example, trigger the Open action while not ready, which sets the long "Almost ready… We just need" line at main.gd:8536).

8. [Godot version claim "installed Godot4.7.2 autowrap"] This cannot be confirmed from the repo.
   - project.godot:7 pins only `"4.7"`. Verify: the gate scripts print or assert the exact engine patch version used for the native and export runs. The Button autowrap and text-measurement behavior the fit check relies on can differ between patch versions.

OPTIONAL / NICE-TO-HAVE
- text_fits checks only height (main.gd:10788-10789) and includes BREAK_ADAPTIVE, so a title that wraps mid-word still counts as "fitting". Consider also asserting that every word's width is <= text_box.x.
- change_block_action_page() calls grab_focus on mouse/touch paging too (main.gd:6533), so a focus ring appears on phone after a tap. Consider grabbing focus only when Prev/Next had keyboard focus.
- The snapshot "id" is a positional index (main.gd:10784), and the browser test finds District by `id === 10` (godot-browser.mjs:1038). A stable string id would decouple the tests from button order.

CUT THESE (over-engineering)
1. The clamp at layout_block_action_pages main.gd:6510 and the "resize remembers pages" claim. The page count is constant, so the clamp does nothing, and keeping a stale page across a widen is what causes SHOULD-FIX 1. Replacing it with "page of focused/suggested button, else 0" (MUST-FIX 1 / SHOULD-FIX 1) is simpler and removes the dead state.
2. The desktop branch of study_test.gd:2422-2423 (calling change_block_action_page on desktop to show it is a no-op). It only tests the guard at main.gd:6526 and adds nothing beyond the visibility assertions. It is safe to cut, but it costs nothing to keep either.
