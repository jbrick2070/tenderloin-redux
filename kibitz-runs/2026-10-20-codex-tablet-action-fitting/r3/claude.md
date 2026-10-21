TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot directly; no Bash/git available to me, so "git diff" was not run -- findings are against the current working-tree file contents, and "pre-existing vs new" is marked verify where it matters).

VERDICT: yes-with-fixes. The resize/focus/paging order works for the paths it tests. But one gap in the long-label fit tests matches the exact overflow that caused this bug, and several test and snapshot checks still key off the 600px phone breakpoint instead of the new paging flag.

MUST-FIX BEFORE BUILD

1. [Coverage and scrutiny / "long-state fit"] Long completed-state labels are only tested at 320px (godot/tests/study_test.gd:2517-2535, `if size.x == 320`). Neither the 600-1049 tablet pages nor the narrowest six-column width (1050) is tested with them. Why it matters:
   - BlockPanel is PRESET_BOTTOM_WIDE with offsets -336/-130 for widths >= 600 (main.gd:14059, 14230-14231). That gives a nominal 206px box.
   - block_button uses AUTOWRAP_WORD_SMART (main.gd:14310), so a wrapped title makes its row taller.
   - Any extra minimum height makes the panel grow, and by default it grows downward into the walking controls. That is the same mechanism as the original 43px/21px overlap. [ASSUMPTION: grow_vertical is the default GROW_DIRECTION_END; verify: nothing sets block_panel.grow_vertical.]
   - At 1050, six columns get roughly (1050-24)/6 ~ 165px each at 15px font (main.gd:14204, 14213). Titles like "Soundcheck w/ Rook (OK)" and "Paint w/ Celeste (0/3)" will probably wrap to two lines. The default-state sweep (study_test.gd:2669-2698) does not test this.
   - Fix (test only, smallest change): in the tablet sweep loop at study_test.gd:2669, also run the existing `long_titles` fixture block (2518-2535) when tablet_width is 600 or 1050. Assert tablet_rect.end.y <= controls.position.y and text_fits for every page. If 1050 fails, the smallest code fix is moving the breakpoint (e.g. 1100 or 1180) in uses_paged_block_actions (main.gd:6518). Do not change panel offsets, which are walking-geometry policy.

SHOULD-FIX

1. [Snapshot contract, main.gd:10917-10919] `block_hub_page` and `block_hub_pages` are reported whether or not paging is active:
   - show_block_panel always sets block_hub_page from the suggested action (main.gd:13601), and block_action_page_count() always returns 3 (main.gd:6514).
   - So at 1100 the snapshot can say page 2 of 3, paged=false, with 12 actions visible. Any consumer that doesn't gate on block_hub_paged misreads it. The browser sweep happens to gate correctly (tests/godot-browser.mjs:1069); others may not.
   - Fix: `"block_hub_page": block_hub_page if uses_paged_block_actions() else 0` and `"block_hub_pages": block_action_page_count() if uses_paged_block_actions() else 1`. This is read-only and doesn't touch save/state.

2. [Tests still key off the phone breakpoint, contradicting "independent 1050 breakpoint"] The main hub flows decide paging with `< 600` instead of the new flag:
   - Browser: tests/godot-browser.mjs:983, 992, 997, 1009, 1013, 1039.
   - Native: godot/tests/study_test.gd:2447, 2476, 2483, 2495, 2512.
   - Today this only works because the required sizes (1100/390/320; godot-browser.mjs:32, study_test.gd:2278) never land in 600-1049. Add any tablet size to those lists and the 4-vs-12 asserts fail.
   - Fix: replace them with `openedHub.block_hub_paged` / `hub.block_hub_paged` (browser) and `study.uses_paged_block_actions()` (native). The phone-only blocks (long-detail scroll, final-page district click) can stay `< 600` if that is intended.

3. [Browser evidence doesn't test "resize preserves focused page"] tests/godot-browser.mjs:1062-1097 pages back to 0 after every resize (1069-1072) and never checks the page that survived the resize:
   - At the end of each paged width, the last Next click (1091-1093) leaves focus on action 8 via change_block_action_page (main.gd:6548).
   - So for each paged-to-paged step (1000→900→…→600→599→1049) the expected value is resized.block_hub_page === 2.
   - Fix: add `if (prevPaged && resized.block_hub_paged) assert.equal(resized.block_hub_page, 2, 'resize keeps focused page')` before the Previous loop. As written, the browser sweep proves bounds and reachability but not the claimed focus behaviour; only native tests that (study_test.gd:2559, 2699-2703).

4. [Focus loss when crossing 1049→1050 with keyboard focus on Previous/Next] layout_block_action_pages hides the nav buttons when not paged (main.gd:6529-6530):
   - In Godot, hiding the focused control drops focus, and nothing takes it back. resize_controls only remaps focus when the new size is paged (main.gd:14172).
   - apply_block_panel_mode only re-grabs focus when prior_focus is null or a conversation button (main.gd:6492). prior_focus here is the nav button, so it doesn't fire.
   - Fix (in layout_block_action_pages, before hiding): `if not narrow and (block_page_prev.has_focus() or block_page_next.has_focus()): block_buttons[block_hub_page * BLOCK_ACTIONS_PER_PAGE].grab_focus()`. Add one native assert: focus Next at 1049, resize to 1050, check has_focus on an action.

5. [Viewport source/unit mismatch, main.gd:6518 vs 4555-4558 and 6698] uses_paged_block_actions reads get_viewport().get_visible_rect() directly. is_narrow_layout uses bubble_viewport_size(), which is null-safe and falls back to 1100x760.
   - get_a11y_status_snapshot calls uses_paged_block_actions (main.gd:10919), so publishing a snapshot outside the tree would error, while the 600 helper would not.
   - Fix: `return bubble_viewport_size().x < 1050.0`. Units are the same today because window/stretch/mode="disabled" (godot/project.godot:14). [ASSUMPTION: no hiDPI scaling of the web canvas; verify: display/window/dpi/allow_hidpi and the export canvas policy.] Both breakpoints use physical viewport pixels, so they stay consistent either way.

6. [Short-height fit not covered] Every new sweep runs at height 667 (study_test.gd:2670; godot-browser.mjs:1063). Panel offsets are fixed pixels from the bottom (main.gd:14231), so the gap to the header shrinks as height drops:
   - 1024x600 landscape tablet: panel top at y=264. The 180px scene-gap rule (study_test.gd:2683; godot-browser.mjs:1081) needs a header of 84px or less. verify: header_control.height at widths >= 600.
   - 844x390 landscape phone (width >= 600, so desktop controls and tablet paging): panel top at y=54, which very likely overlaps the header.
   - This predates the slice (all widths >= 600 behaved this way before), but the doc asks about it.
   - Fix: either add one native probe at 1024x600 (assert only, no geometry change), or add "short landscape heights (<667) unverified" to the Invariants and limits section so the gate isn't read as covering them.

7. [Test name overclaims the focus contract, study_test.gd:2462] "conversation-to-hub ... focuses the actual suggested later-page action" passes only because block_mural_btn is index 4, the first button on page 1.
   - apply_block_panel_mode focuses the first action of the page (main.gd:6493), not the suggested one (hub_button_for_objective, main.gd:6652).
   - With the "soundcheck" objective (block_rook_btn, index 5), focus lands on the mural button. Tablets (600-1049) now go through the same path.
   - Fix: either focus `suggested` when it is visible (one line at 6493), or rename the assert to "focuses first action of the suggested page". verify: whether this assert came from d59c58b or this delta.

OPTIONAL / NICE-TO-HAVE
- In hub mode at 600-1049, layout_block_action_pages (main.gd:6537-6538) overwrites the header that update_block_ui set (13739-13746). That header held the readiness readout ("x/5 Met · Mural · Soundcheck") and "Talking with X" when arrived/selected_neighbor >= 0 (block_panel_neighbor_idx, main.gd:5507-5514). The panel keeps that neighbour's border theme (13736), so header and theme now disagree. Also, snapshot `conversation_header` (10914) changes in this band. Confirm this is intended.
- text_fits (main.gd:10829-10830) is weak evidence. Autowrap buttons grow to fit their text, and BREAK_ADAPTIVE allows mid-word splits, so it is nearly always true. The panel-enclosure and controls-overlap asserts are the real guard. For a stronger check, measure with BREAK_MANDATORY|BREAK_WORD_BOUND only, or cap button height at 2 lines.
- The 1050 literal is duplicated in main.gd:6518, study_test.gd:2673 and godot-browser.mjs:1068. A `const BLOCK_HUB_PAGED_MAX_WIDTH := 1050` exposed in the snapshot would let the browser test read it rather than hard-code it.
- "Next %d/%d" (main.gd:6534) shows the target page while the header shows the current page ("1/3" next to "Next 2/3"). That is fine visually but ambiguous for assistive tech. Consider "Next page" plus the existing announce.
- Gate order after any fix: native → export → check → node → browser. The browser gate's mtime guard (godot-browser.mjs:10-22) already refuses a stale pck after a main.gd edit. Test-only edits (study_test.gd, godot-browser.mjs) don't need a re-export.

CUT THESE (over-engineering)
1. `block_page_prev.text = "Previous"` on every layout (main.gd:6533). It is already set at creation (main.gd:14122) and never changes, so this is safe to delete.
2. Browser sweep width list (godot-browser.mjs:1062). Native already runs all nine widths × 3 pages with the same layout code (study_test.gd:2669). The browser-only risks (canvas resize propagation, click-coordinate mapping, wait-for-frame timing) don't depend on width. Cutting to [700, 600, 599, 1049, 1050, 1100] keeps the original failure width, both breakpoint edges and the round-trip, and saves about 3 widths × 3 pages of frame waits and clicks in a gate that is already long. Keep the new focus-page assert (SHOULD-FIX 3) on those widths.
