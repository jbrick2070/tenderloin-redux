TOOL CHECK: PASS (Read/Grep/Glob over godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs succeeded; Bash unavailable, so no git diff — baseline-vs-candidate attribution below is marked "verify" where it matters.)

VERDICT: yes-with-fixes. Choice/dispatch/Stop wiring is coherent, but the named label overrides the narrow side-dock "Walk" caption, which very likely fails existing text_fits contracts. Failed or blocked resident routes also now latch a dishonest "Resume X".

MUST-FIX BEFORE BUILD

1. [P3 named label / P5 layout, existing geometry contracts] The named caption overrides the compact side-dock text.
   - Where: godot/main.gd:13883 still picks "Walk" when `bubble_viewport_size().x < SIDE_HUB_MIN_WIDTH and has_side_panel_dock()`. Lines 13885-13889 then unconditionally replace it with `kind.capitalize()+" "+name`, e.g. "Resume Celeste", "Meet Thanh".
   - Button width: walk_control has clip_text=true (main.gd:15987). In layout_walking_controls_and_hub (main.gd:6904-6915) a 520px viewport gives dock_width=280 and controls width ≈ 520-12-300 = 208. With 3 columns and 8px separation that is ≈ 64px per button at font 12. At 559px it is ≈ 73px.
   - [ASSUMPTION: glyph width ~6-7px at 12pt.] "Resume Celeste" (~14 chars) cannot fit in 64-73px. "Walk" was chosen precisely for this branch.
   - Contracts this breaks:
     - godot/tests/study_test.gd:3571 ("native compact walking labels fit beside small activities", 520-559 x <560 with show_conversation open).
     - tests/godot-browser.mjs:968 (all visible walking_controls text_fits when side_panel_dock).
   - Both are "required existing" coverage under P4/P5. This is a true regression, not a newly declared contract. Clipping also hides the name visually on exactly the layouts the doc says "follow action".
   - Fix: in update_walk_control, keep the compact short text in the `vp.x < SIDE_HUB_MIN_WIDTH and has_side_panel_dock()` branch. Still assign the full named string to tooltip_text and accessibility_name.
   - Also verify the 600+ side-dock "Walk / Talk" branch (≈80px buttons at 600-667 wide; study_test.gd:3549 non-small sizes; browser 968 runs when `!small`). Apply the same rule if "Resume Celeste" does not fit there.
   - guided_caption (study_test.gd:6543) needs no change for the short-walking check at 3468, because no side dock is open there.

2. [P5 "malformed/failedroute honesty"] Failed or blocked resident routes latch "Resume X" and re-fail forever.
   - No-route case: walk_to_neighbor sets selected_neighbor=index and arrived_neighbor=-1 (main.gd:8339-8340), then returns false with an empty path (main.gd:8371-8376).
   - Mid-route block: advance_walk clears arrived_neighbor and the path but keeps selected_neighbor (main.gd:13816-13833).
   - Effect: primary_walk_choice (main.gd:13864-13866) then reports kind "resume" for a route that never existed or is known blocked. The caption says "Resume Thanh" and each press repeats the same failed A*.
   - The baseline primary advanced selected+1, so this is a true regression in the stuck case. On phone the only escape is manual walking, map, or N/B, and N/B are keyboard-only.
   - Fix (smallest): set `selected_neighbor = -1` in both failure branches, before their update_route_ribbon(true) call. Primary then falls back to the meet/visit suggestion, with no new state.
   - Add one native case: reuse the isolated-A* fixture already at study_test.gd:518-534, call walk_to_neighbor instead of walk_to_point, and assert `primary_walk_choice().kind != "resume"` and that no save changed.
   - No test currently exercises a resident no-route (no matches for "No walkable route"/"Route blocked" in either test file).

SHOULD-FIX

3. [P3 vs P4] P3 says save apply, reset and successful import all clear navigation. verify_guided_walk only checks apply_save_envelope (study_test.gd:6589-6590).
   - The reset_mural_state_to_defaults path (main.gd:12441-12443) and the import_browser_save_json path (main.gd:13641-13643) are untested for the "cannot resurrect a paused neighbor" claim.
   - Fix: inside verify_guided_walk, repeat `walk_to_neighbor(4); stop_walking()` and then:
     - call reset_mural_state_to_defaults("fresh");
     - call import_browser_save_json(<valid v1 fixture already used elsewhere>).
   - After each, assert `primary_walk_choice().kind != "resume"`. Restore the formal profile afterwards.

4. [P4 browser oracle] namedWalkCaption (tests/godot-browser.mjs:139) is a self-oracle, not independent.
   - It rebuilds the caption from walk_target_kind/walk_target_name. get_a11y_status_snapshot computes those from the same primary_walk_choice() that produced the label (main.gd:11744, 11784-11786).
   - So the asserts at godot-browser.mjs:758 and :2440 only prove the label matches itself (modulo the ≤0.5s refresh). They say nothing about which resident was chosen.
   - Fix: when walk_target_kind !== 'resume', also assert walk_target_neighbor === objective_neighbor whenever objective_id === 'meet'. Both fields already exist (main.gd:11896-11897). This mirrors the native guided_caption independence.

5. [P3 sequencing: reset/apply/import] stop_walking() runs before navigation and profile state are cleared.
   - stop_walking() is called at main.gd:12441 (reset), 13162 (apply) and 13641 (import). The selected/arrived clear only happens on the following lines.
   - stop_walking → update_route_ribbon → update_walk_control (main.gd:8189) therefore computes primary_walk_choice from the old selected_neighbor. In reset, it also sees the still-active stories and old visited_neighbors, because stories close at 12445-12456 and visits clear at 12481.
   - stop_walking also overwrites info.text via update_walking_status (main.gd:13852). If a route was active, it announces "Walking stopped. Choose the named walking action…" (main.gd:13855).
   - The label self-heals because update_block_ui → update_objective_ui → update_walk_control runs at the end (12550, 13174, 13650 → 15493).
   - The a11y announcement does not self-heal on reset: reset ends with sync_web_a11y_status only (12551) and makes no new announce. A profile reset mid-walk therefore leaves a misleading "Walking stopped…" status. Import re-announces at 13652; apply does not.
   - Fix (smallest): in all three sites, set `selected_neighbor = -1; arrived_neighbor = -1` before stop_walking(). For reset/apply, either clear current_path before calling stop_walking (so was_walking=false and nothing is announced) or announce the restore/reset status afterwards.
   - verify: whether stop_walking() in apply_save_envelope/reset_mural_state_to_defaults is new in this candidate (git diff unavailable to this reviewer). If it is new, check that no existing test asserts info.text/announcement right after apply_save_envelope.

6. [P3 copy / touch] Tooltip text is wrong on touch and reads oddly for "visit".
   - main.gd:13888 sets the tooltip to "...N/B still cycle residents." on every layout, including touch-only phone contexts where N/B do not exist.
   - It also says "Walk to this resident" for kind "visit", where cycling is the declared behavior.
   - Fix: drop the N/B clause when uses_phone_disclosure().

7. [P5 label vs dispatch timing] The label and the dispatch use separately computed choices.
   - The label refreshes on the 0.5s objective timer (main.gd:7692-7695) and on update_route_ribbon. activate_walk_control recomputes primary_walk_choice() at press time (main.gd:13919). The snapshot also recomputes (11744).
   - Player position and visits only change through paths that already refresh the label: walk_step → update_route_ribbon; finish_neighbor_arrival:8924; import/apply → update_block_ui.
   - verify: that every story close/end path (power/dog/lantern/voting close_story) calls update_objective_ui or update_walk_control. Otherwise, for up to 0.5s the caption can show a story label while the press dispatches walk_to_neighbor, or the reverse.

OPTIONAL / NICE-TO-HAVE
- [P3 hub] block_next_btn still reads "Meet Next (N left)" (main.gd:15437), but its callback now targets the nearest goal (visit_suggested_neighbor, main.gd:9291-9295). Naming it "Meet <name>" would match the header and primary.
- [P3] primary_walk_choice has no guard for neighbors.size()==0: posmod by 0 and neighbors[index] at main.gd:13872/13874. Today the neighbor table is the hard-coded literal at main.gd:500-504, so this is not reachable from malformed save data. Only worth a one-line early return if the table ever becomes data-driven.
- [P4] Native: after a Celeste or Rook Stop → Resume, add one assertion that arrival opens the mural/music panel and does not fire the cancelled talk/soundcheck. This pins the declared "not canceled extra callback" contract (pending flags cleared in stop_walking, main.gd:13849-13850; consumed at main.gd:8931, 8952).
- Confirmed unchanged and consistent with P3:
  - N/B → choose_next_neighbor (main.gd:14784-14785);
  - digit/E/T paths;
  - walk_step/walk_to_point/overview/wide_overview/choose_next clear selected_neighbor (main.gd:8238, 8739, 14956, 15018, 14879);
  - finish_neighbor_arrival sets arrived before refreshing the label (main.gd:8901, 8914, 8924);
  - immediate within-radius arrival goes through the same finish_neighbor_arrival (main.gd:8364-8366).

CUT THESE
1. Duplicate `walk_control.accessibility_name = walk_control.text` at main.gd:13889. Line 13905 assigns the same value unconditionally after the story overrides, so 13889 is dead.
2. The `for layout in ["table","floor"]` outer loop in verify_guided_walk (study_test.gd:6552). The fixture forces block_opened=false with only Bea visited, so current_objective returns "meet" before gathering_layout is ever consulted (main.gd:6100-6112). The second pass re-runs identical logic and doubles runtime. One layout x 3 sizes keeps all the coverage. (Better: spend the saved time on items 2 and 3 above.)
