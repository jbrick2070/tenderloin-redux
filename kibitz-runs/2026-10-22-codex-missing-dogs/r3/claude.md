TOOL CHECK: PASS (read godot/dog_story.gd, godot/main.gd, godot/power_story.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, tests/godot-data.test.mjs, docs/ASSETS.md, docs/EPISODE_LOCATION_RESEARCH.md, godot/export_presets.cfg, package.json). No commands run.

VERDICT: yes-with-fixes. Most of the wiring holds up: setup order, the modal gate, Stop/generation ownership, reset/import/reload hooks and the zero-save checks all trace correctly in the source. Two things need to change before acceptance. First, the reunion figures stand on or outside the closure barricades, while the docs and the test both say they are inside the closure. Second, no test drives the dog flow from the keyboard, and the focus handling has gaps that only a keyboard user hits.

VERIFIED (traced, no defect found)
- Init order: main.gd:1992 power_place, then :2011 build_gathering_layouts, then :2018 camera, then :2023 make_ui (dog_story setup at main.gd:15421-15423, after power_story at :15418-15420), then :2026 load_godot_state. So when dog_story.gd:92-113 runs, history_stop_xz, is_walkable_point, gathering_layouts_node and camera all exist. All walkability inputs are constants (main.gd:7524, 7558; power_place.gd:95), so setup-time goal checks do not go stale after a save loads.
- Arrival intent: walk_to_point calls dog_story.cancel_intent() before dog_story.gd:272 assigns traveling (main.gd:8524), so the order is right. Every route starter (main.gd:6418, 8038, 8137, 8190, 8233, 8276, 8524, 13567, 14435, 14498, 14557) bumps generation. Replan failure calls blocked_route (main.gd:13495). open_from_walking is generation-guarded and waits for release (dog_story.gd:280-286).
- Modal gate: _unhandled_input swallows input while the dog modal is visible, and that check runs before the F6/F7/F8 and G hotkeys (main.gd:14131-14134 vs 14182, 14282). _physics_process stops while it is visible (main.gd:13874). Chapter cards are suppressed (main.gd:7483). Power open redirects to an active dog (power_story.gd:239). The two stories exclude each other: dog_story.gd:207, 234 and power_story.gd:129, 479.
- Reset coverage: the only block_opened=false write (main.gd:12251) is inside reset_mural_state_to_defaults, which closes and resets the dog first (main.gd:12202-12204). apply_save_envelope (:12691) and import_browser_save_json (:13255) do the same.
- gathering_layouts_node is built once (main.gd:7255-7388) and only shown/hidden afterwards (:7391-7398), so goals[2] stays valid across table/floor switches.

MUST-FIX BEFORE BUILD
1. [dog_story.gd:110, 309; study_test.gd:5931; ASSETS.md:101] The reunion figures stand on or outside the closure's sawhorse line, but the docs and the test say "inside".
   - Barricade rails: centered at local x=±6.3, half-thickness 0.04 (colored_box takes half extents, main.gd:994), height y 0.83-1.01, running the full z -1.15 to 1.155 (main.gd:7268-7274).
   - Light poles: local (±5.9, ±1.25) (main.gd:7365-7367).
   - Owners: local x=±6.5, z=-0.3. Their GroundRing radius is 0.55 (main.gd:3371), so the ring spans |x| 5.95-7.05 and straddles the rail. The torso is at rail height.
   - Dogs at the reunion: local x=±6.5, z=0.7. The body is 0.85 long on x, so it spans |x| 6.075-6.925 and crosses the rail plane while standing between the sawhorse legs.
   - ASSETS.md:101 says the owners "stand inside the existing temporary curb-lane closure". Since 6.5 > 6.3, they are past the barricade end, not inside.
   - The native check "fit inside existing fictional curb-lane closure" uses |x|<7.4, |z|<1.55 (study_test.gd:5931). That bound is looser than the barricade line, so it cannot catch this.
   - Inside the closure there is no free spot: in the floor layout the riser runs to x 5.5 (main.gd:7331) and the lettering panel sits at -5.3 (main.gd:7335). That leaves about 0.4-0.55 m before the poles, less than one 0.55 m owner ring.
   - Fix: move owners and dogs outboard to about |x|>=7.0 (rail 6.34 + ring 0.55 + margin). Turn Junebug to face inward. Change ASSETS.md:101 to say "beside the closure end". Replace the 7.4 containment check with explicit clearance checks against the rail band (|x|=6.3±0.6, |z|<1.2) and the four pole cylinders. Keep the existing building-footprint corner check (study_test.gd:5929).
   - [ASSUMPTION] I did not inspect any render, so the exact visual overlap is unconfirmed. The coordinate overlap above can be checked from the source.

2. [dog_story.gd:220, 233-242, 230; godot-browser.mjs:1312-1355] Keyboard path: focus defects, and no test covers keyboard use.
   (a) begin() does not move focus. Begin (buttons[6]) becomes disabled while it still has focus (dog_story.gd:327). Power's begin moves focus to actions[1] (power_story.gd:304).
   (b) open_story always focuses buttons[7] (Walk to lead) when active (dog_story.gd:220). That button is disabled when lead<0 (:329). On arrival, the action the player actually needs is Match, buttons[8].
   (c) close_story has no fallback when the return target is gone (dog_story.gd:230). Power falls back to block_close_btn (power_story.gd:283). When the dog opens via F8 with no focus owner, Back leaves focus at null.
   - The driver's acceptance requires real keyboard input. The browser test activates every dog button by mouse or touch tap. Its only keys are End, F8, KeyW and Escape (godot-browser.mjs:1322, 1350, 1351, 1353). The native test sends one ui_accept, on Begin only (study_test.gd:5885-5894).
   - Fix: after begin, grab_focus on a profile or lead button. In open_story, focus buttons[8] when near(), else buttons[7] if lead>=0, else a lead button. Add power's block_close_btn fallback. Add a keyboard-only browser pass at one size: Tab/Enter through Begin, a lead, Walk, then Match on arrival.
   - verify: whether Godot 4.7 keyboard focus navigation skips disabled Buttons. If it does not, (a) and (b) leave keyboard users on a control that does nothing.

SHOULD-FIX
1. [dog_story.gd:98, 112; package.json:21] The two placement asserts are the only safeguard, and the web build uses --export-release, which strips asserts. If geometry ever drifts, the shipped build would silently put a dog at world (0,0) with goal (0,1.8). Today the data is constant and the native debug run covers it, so this is defensive. Fix: replace the asserts with a runtime check that keeps the dog hidden and its lead disabled, plus push_error. Or add a browser assertion that dog_story.goals[0..1] are non-zero.
2. [dog_story.gd:304-310; main.gd:13704, 13720-13722] update_world() never forces game.update_occlusion(true). The occlusion cache skips recomputing until the player moves 0.4 m. So on begin, End and the win teleport, building cutaways for the dogs go stale: they are not applied when dogs appear and not cleared after End. Fix: call game.update_occlusion(true) at the end of update_world() when game.camera is set.
3. [dog_story.gd:266-273] walk_to_lead closes the modal before it knows whether the route exists. If walk_to_point fails (main.gd:8526-8532, 8552-8557), blocked_route only announces, and the player is left on the block. Fix: on the immediate failure branch only, call open_story() after blocked_route() so the message shows in the reader.
4. [study_test.gd:5922-5931; godot-browser.mjs:1341-1349] Neither the "before" nor the "after" world pose is fully checked.
   - Footprint and mesh-corner checks run only on the reunion pose. The search poses (search_positions) have no such check.
   - Pixel proof uses world[0] (Pippin) only, and only at the reunion. Junebug (cream #ead9ad) and both street-corner poses never get a pixel check.
   - The warm-coat heuristic (r-g>15, r-b>25) also matches the orange barricade stripe #e8833a (main.gd:7274) that Pippin straddles (MUST-FIX 1). The changedBody check at :1353 partly guards this, but the colour check alone is weak.
   - Fix: run the same footprint and corner checks on search poses, and add one pixel sample per dog at its search site.
5. [tests/godot-data.test.mjs:238] The no-network regex scans only main.gd. dog_story.gd (which contains an https URL string at :323) and power_story.gd are not scanned. Fix: run the same regex over every godot/*.gd file.
6. [godot-browser.mjs:1318 vs 3162-3164; power_story.gd:479] Hidden order dependency: verifyDogStory taps dogs_entry and asserts it is enabled, which requires power_story to be inactive. It relies on verifyLarkinStory having ended it. A leftover active power story would show up as "dog action not reachable". Fix: assert !power_story.active (or call end) at the top of verifyDogStory with a clear message.

OPTIONAL / NICE-TO-HAVE
- dog_story.gd:334 sets accessibility_name on buttons[10], and the loop at :335-337 overwrites it, so :334 does nothing. Fold the "Independent soundtrack." text into the loop.
- dog_story.gd:226-227 restores sibling visibility as it was at open time. A reward banner whose timer runs out while the modal is open would come back. Power has the same pattern; fixing both together is fine.
- dog_story.gd:390 resets when block_opened goes false but does not close or refresh a visible modal. No current path reaches it (see VERIFIED), so it is harmless.
- The SFACC date and URL are hard-coded in two places (dog_story.gd:323 and EPISODE_LOCATION_RESEARCH.md:9, 13). They are dated deliberately; just note it for the next re-check.

CUT THESE
- None required. The 0.2 s sync_web_a11y_status poll (dog_story.gd:402-405) matches the existing pattern and the browser snapshot depends on it, so it is not safe to remove.

ACCEPTANCE LIMITS / PRIOR ART
- I read the code only and ran no gates. The native DOG_STORY_PASS and the browser results are as the driver reports them; I have not observed them.
- This is an original fictional mini-episode. The matching, phases and either-order reunion follow the project's own Power Story pattern (power_story.gd:238-273), so there is no claim of external novelty.
- SFACC at 1419 Bryant is a remote, dated reference only. The code sends no reports and simulates no intake (dog_story.gd:323), and no network calls appear in the files I read.
- Human recognition, aesthetics, device and assistive-technology acceptance are still unknown.
