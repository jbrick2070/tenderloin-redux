TOOL CHECK: PASS (read godot/quiet_seats.gd, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, artifacts/quiet-seats-preflight.mjs, godot/rhythm_circle.gd, public/hosting.js)

Section ids below cite input.md lines: [P5] implementation, [P7] UI/memory, [P9] checks, [P11] tests/evidence, [P13] boundaries.

VERDICT: yes-with-fixes. The runtime wiring is in the right order and the save contract holds. Init order is build_gathering_layouts main.gd:2000, then camera 2007, then make_ui 2012 (rhythm_circle.build_world 15152, then quiet_seats.setup 15157), then load_godot_state 2015, which runs apply_save_envelope, then update_block_3d 12737, then quiet_seats.update_world. host_set_quiet only writes the existing hosting.draft.quiet key, and both validators accept it (main.gd:12384-12387, 12961-12962). But there are three problems. (a) The committed gate does not include the evidence the doc relies on. (b) The stool extraction changes the stools' neutral look. (c) The world-pixel proof cannot tell the guests apart from the furniture.

MUST-FIX BEFORE BUILD

1. [P11] The copied-result, reload, world-pixel, short-landscape and both-layout coverage exists only in an ignored file, and that file depends on output from an earlier run.
   - verifyQuietSeats(page,touch,size,complete,worldProof) runs with complete=true and worldProof=true only from artifacts/quiet-seats-preflight.mjs:1084-1089. `artifacts/` is gitignored (.gitignore:2).
   - The committed suite calls it once, at tests/godot-browser.mjs:1700, with complete=false and worldProof=false. That call runs only at the main-flow sizes 1100x760, 390x667 and 320x667 (godot-browser.mjs:1084), so the 520x360, 559x360 and 640x360 Close/44px reachability cases are never gated.
   - The preflight seeds its fixture from artifacts/living-mural-late-390x667-finger.json (preflight:1080). That file was written by an earlier godot-browser run, and nothing checks that it is newer than artifacts/godot-web/index.pck. A failed or partial browser run therefore leaves a stale fixture from an older build that is silently reused.
   - Fix: copy the six-case loop into tests/godot-browser.mjs right after rhythmFixtureSave is captured (godot-browser.mjs:2568). Follow the existing beats-last private-fixture block (2572-2585): order ['stories','beats','pause','art'], results sliced to the first 2, civic/film rewound to idle and null. Call verifyQuietSeats(...,true,true). Then delete the preflight (see CUT 1).

2. [P5] "Original neutral shape/colors" is not true. The extracted stools lost their flat shading.
   - The new per-stool SurfaceTools never call set_smooth_group(-1) before generate_normals (main.gd:7243-7247 and 7285-7289).
   - Every surrounding baked surface does call it: t_st 7233, f_st 7270, closure_st 7214.
   - In Godot 4 the default smooth group is 0, which gives smooth normals. So all 16 table stools and 3 floor stools now shade differently in every state, including the neutral state before the pause.
   - Fix: add `stool_surface.set_smooth_group(-1)` right after `begin()` at 7244 and 7286.
   - verify: `git diff HEAD -- godot/main.gd` should show the stools were previously emitted into t_st and f_st. The r1 review (resident-world-ideas/r1/claude.md:18-19) places them at the old lines 7236-7240 and 7270-7272.

3. [P11] The "coat-pixel" world proof does not discriminate.
   - The classifier at tests/godot-browser.mjs:1016 counts a pixel as coat if r>b*1.15 && r>100, or b>r*1.12 && b>100.
   - Inside the guest bounding rects that also matches: stool c37e71, table wood 8a6544, and tiles e8c35a, d9746a and 5fb8a6 (main.gd:7234, 7239, 7272, 7288).
   - So `colored>=10` passes even if the guests never render.
   - Smallest fix that stays within the doc's real-input rule: take the world screenshot once for 'pairs' and once for 'arc' (real taps that already exist at 989-997, with the panel closed via Close). Then require a pixel difference above a threshold inside both the vacated and the newly occupied guest bounds. This needs no new hooks.

SHOULD-FIX

1. [P5 / P13 config] Neutral-restore positions are duplicated as magic numbers.
   - quiet_seats.gd:117-118 hard-codes z=0.95, x=[-3.6,-1.2,1.2] and z=-1.05.
   - The authored values live separately at main.gd:7241-7242, 7250, 7284 and 7292.
   - Any change to the authored layout silently moves stools on every update_world. The native assertion at study_test.gd:4624 also hard-codes -3.6.
   - Fix: in setup() cache `seat.position` for each entry in table_seats and floor_seats, and restore from that cache. Express the arc/pairs targets as indices plus offsets from the cached positions.

2. [P9 hidden UI/focus] Keyboard focus is lost when the row hides.
   - update_ui (quiet_seats.gd:107-109) sets row.visible=false after Z completes the pause.
   - If a choice button had focus (keyboard Space, then Z), Godot drops focus and nothing gets it back.
   - Neither test checks focus.
   - Fix: before hiding, `if choices.any(func(b): return b.has_focus()): game.block_programme_btn.grab_focus()`. Add a native assertion for it.

3. [P7] Shift+Z and the buttons drive the reader text through different paths.
   - The button path sets last_panel_dialogue = explanation() (quiet_seats.gd:37).
   - The Shift+Z path (main.gd:9655-9659) only announces.
   - On entry to the pause, advance_programme_and_hosting_step sets Bea's "up next" line (main.gd:9706). Because a non-empty last_panel_dialogue wins (14701-14702), the scrollable Thanh explanation at 14711-14712 does not appear until the player clicks a choice or reopens the panel.
   - Fix: set `last_panel_dialogue = quiet_seats.explanation()` in the Shift+Z branch. When next_a=="pause" at 9706, append the explanation.

4. [P7 / P9 "all 12 buttons / 3 pages / Close"] Native coverage checks only the two new buttons.
   - study_test.gd:4586-4587 checks only qs.choices.
   - With the row visible it never checks block_close_btn (main.gd:15078), the visible block_buttons, or block_action_page_count().
   - Fix: inside the size loop, assert that block_close_btn and every visible block_buttons[i] are enclosed in the viewport and at least 44px tall, and that the page count is unchanged from before the row appeared.

5. [P9 "use actual parts"] Collision proof is incomplete, and its bounds are hard-coded.
   - The table check tests only the tabletop slab (study_test.gd:4600). It does not test the 8 leg beams (main.gd:7236-7238) or the back-row stools.
   - The floor layout has no part checks against the riser (7277), mic pole (7278-7279), speaker (7280), lettering panel (7281-7283) or barricades (7215-7221).
   - Circle visitors are checked by root center distance >0.7 only (4601-4603), not by part AABBs.
   - The strip bound is a literal ±1.3 (4599), while the authored barricade stripes span z ±1.15 (7220-7221). Floor guests reach about -1.26 (stool z -1.05 minus torso radius 0.21, from make_person_node main.gd:3393).
   - Fix: build AABBs for the leg beams, riser/pole/speaker/lettering and the barricade ends from the same constants used in main.gd. Test them per part. Derive the strip half-width from the closure geometry, not a literal.
   - [ASSUMPTION] -z is the sidewalk side. verify: compute_gathering_layout_site at main.gd:7192-7200 together with the layout rotation at 7209.

6. [P11] The browser settle check misses a pending layout pass.
   - verifyQuietSeats.settle (tests/godot-browser.mjs:981) waits on `layout_refit_pending` only.
   - Toggling the row fires minimum_size_changed, which calls queue_compact_panel_layout (main.gd:15198, 6752-6764) and schedules a deferred pass.
   - The other suites also wait on `compact_panel_layout_pending` (godot-browser.mjs:345, 396). Without it, the 320px and short-landscape geometry can be read before that pass runs.
   - Fix: add `&&!s.compact_panel_layout_pending`.

7. [P11] The native and browser fixtures disagree.
   - study_test.gd:4559 reassigns hosting_order but not programme_order or programme_published.
   - The preflight sets all three to the same order (preflight:1085).
   - Fix: assign programme_order and programme_published to the same order in the native fixture, so it matches a reachable state.

8. [Interface] quiet_seats.gd hard-codes the choice ids.
   - It uses the literal list ["arc","pairs"] at lines 20 and 110, plus the TITLES keys, instead of game.HOSTING_QUIETS (main.gd:102).
   - Fix: iterate over game.HOSTING_QUIETS. Add a native assertion that TITLES.keys() equals HOSTING_QUIETS and matches QUIET_CHOICES in public/hosting.js:5. The labels currently match.

9. [Init guard] main.gd:9658 dereferences quiet_seats without the null guard that every other call site has (3105, 14676, 14711). Add `if quiet_seats != null`.

OPTIONAL / NICE-TO-HAVE
- The cushion center is at seat+0.54 (quiet_seats.gd:133). The seat top is 0.50 (prism at 0.44 with height 0.06, main.gd:7246 and 7288), so the cushion floats 7.5mm. Use 0.5325.
- There is a 17mm gap between shoe and shin (shoe top 0.093 from total_height 1.55*0.06 at main.gd:3363, shin bottom 0.11 from quiet_seats.gd:59-60) and a 30mm gap at the knee (shin top 0.47, thigh bottom 0.50).
- The guests persist through the civic and film phases. verify: their world-space clearance from civic_setup_node (main.gd:2975), keepsake_frame_node (2867) and programme_board_node (2922), which are anchored to Bea rather than to the layout.
- accessibility_name does not include the selected state. film_screening.gd:160 appends ", selected".
- study_test.gd:4595-4596 builds `box` but never uses it.
- verify: whether the Godot 4.7 web export exposes Button.accessibility_name to the DOM. The browser test checks only #godot-a11y-status (godot-browser.mjs:993).

CUT THESE (over-engineering)
1. artifacts/quiet-seats-preflight.mjs. It is a 1093-line copy of tests/godot-browser.mjs that differs only in its final loop (1078-1092). Once MUST-FIX 1 moves that loop into the committed suite, the copy is pure drift risk, so deleting it is safe.
2. The second update_block_ui at quiet_seats.gd:38. host_set_quiet already calls update_block_ui (main.gd:9591). Setting last_panel_dialogue from TITLES[id] before calling host_set_quiet removes one full hub relayout per click with no change in behavior. Low value, but cutting it is safe.
