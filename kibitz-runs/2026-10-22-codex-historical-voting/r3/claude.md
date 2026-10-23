TOOL CHECK: PASS (read godot/voting_story.gd, godot/main.gd, godot/power_story.gd, godot/power_place.gd, godot/story_picker.gd, godot/data/voting_places.json, godot/data/power_place.json, scripts/build-voting-places.mjs, godot/tests/study_test.gd, tests/godot-browser.mjs, tests/godot-data.test.mjs, godot/export_presets.cfg, the source TSV). No gates were run.

Section ids: input.md has no numbers, so I cite its paragraphs as [Candidate] (¶2), [Hooks] (¶3), [Evidence] (¶4) and [Inspect] (¶5).

- VERDICT: yes-with-fixes. The episode contract hooks match every power_story site in main.gd, and the data-to-map coordinate contract is consistent. But there is one hidden cross-component dependency that can crash, two focus/sequence defects, and several evidence claims that the shown assertions do not actually back.

MUST-FIX BEFORE BUILD

1. [Hooks, "Own Taylor/Eddy via leg"] Hidden dependency on power_place data: a crash path when that data is degraded.
   godot/voting_story.gd:203 always reads `game.power_place.source.return_junction.xz`. godot/power_place.gd:18-21 returns early with `source` left as `{}` and `loaded=false` when power_place.json fails validation ("historical story disabled"). power_story only touches return_junction behind `historical`, which requires `site_valid`, which requires `power_place.loaded` (godot/power_story.gd:194, 363-364).
   voting_story's `sites_valid` (godot/voting_story.gd:93-103) never checks `power_place.loaded`. Also, `power_place.admits()` returns true when not loaded (power_place.gd:96), so the walkability checks still pass.
   Result: when power data is bad, Election Walk stays available, and pressing Walk raises a Dictionary key error at :203.
   Fix (smallest): in setup, `sites_valid = goals.size()==2 and game.power_place.loaded`. Alternatively, compute `use_via` only when `game.power_place.loaded`.

2. [Inspect, "focus/keyboard"] Reopening during label placement puts focus on a disabled control.
   godot/voting_story.gd:142 picks `buttons[...(8 if phase>=3 and near() else 5)]`, so phase 2 grabs buttons[5]. godot/voting_story.gd:238 disables buttons[5] when `phase==2`.
   The same line sends focus to Walk (5), not Record site (6), after an arrival in phase 1 (open_from_walking at :226 calls open_story). Arrival is exactly when Record is the next action, so a keyboard user needs extra Tab presses and can trigger "Already at this outdoor stop" (:201).
   end_session (:195-197) also leaves focus on buttons[9]. refresh (:243) has just disabled it.
   power_story focuses the actionable pad when near (godot/power_story.gd:261-263).
   Fix:
   - phase 2: focus `buttons[selected]`.
   - phase 1, near, selected site not yet recorded: focus buttons[6].
   - end_session: `buttons[4].grab_focus()`.
   Add one native assertion of `has_focus()` after the arrival reopen in the walk loop (godot/tests/study_test.gd:6148-6150).

3. [Inspect, "nonvacuous assertions"] The data test's offset check is one-sided, so it passes vacuously.
   tests/godot-data.test.mjs:379: `hypot(observation-centerline) - offset_m < 1e-7` has no `Math.abs`. An observation equal to the centerline (hypot 0) passes.
   Fix: `assert.ok(Math.abs(hypot - site.offset_m) < 1e-7)`.
   Related: `source_sha256` is stripped before deepEqual (:376) and never recomputed. The provenance hashes in godot/data/voting_places.json:803-807 are therefore unverified. Either hash the three inputs in the test and compare, or drop the field (see CUT 1).

SHOULD-FIX

1. [Hooks, "via mirrors power_story"] The via condition sends between-site legs on a detour.
   godot/voting_story.gd:205: `use_via = not segment_walkable(player, goal) and (phase<3 or player.x<via.x)`.
   The via is Taylor/Eddy at x=-16.53 (godot/data/power_place.json:24-27). Both observation stops are west of it: x=-273.99 and x=-103.50 (voting_places.json:26-29, 54-57). So any Boeddeker-to-Cadillac or Cadillac-to-Boeddeker leg that fails the straight segment test goes east to Taylor first, about 2x87 m extra.
   The native walk order [1,0,2] (study_test.gd:6137) runs exactly this leg, and nothing asserts route length.
   power_story's analog makes sense only because its goal is far west of the via.
   Fix: `use_via = not segment_walkable(...) and ((player.x > via.x) != (trip_goal.x > via.x))`. The existing native walk loop re-verifies it.
   [ASSUMPTION] The 170 m chord between the stops fails segment_walkable (main.gd:7837-7852). verify by logging via_pending on that leg.

2. [Hooks, "return to Bea"] The home goal is Bea's own standing point, not the established arrival point.
   godot/voting_story.gd:92 sets `home=game.neighbor_xz(0)`, which is Bea's exact position (22.09,-10.03; main.gd:486). walk_to_point (main.gd:8544, 8568) routes to `nearest_walkable_point(home)`. Neighbors are not walk obstacles (is_walkable_point, main.gd:7820-7835), so the player ends inside Bea's model.
   The existing Bea arrival convention is `neighbor_xz(0) - nearest_street_tangent(neighbor_xz(0))*0.95` (godot/tests/study_test.gd:3305, 3572).
   Fix: use that offset for `home` and add `game.is_walkable_point(home)` to `sites_valid`.
   Also, Share near home was walked for real in only one layout (study_test.gd:6135-6152 uses full_profile's saved layout). The two-layout loop teleports instead (:6131). verify: home reachable within 2 m in both "table" and "floor" layouts.

3. [Candidate, "selected address label"] The UI hard-codes site identity that the JSON does not validate.
   Button and label text and index meaning are hard-coded (godot/voting_story.gd:66-67, 83), and the museum/park guard assumes goals[0]=Cadillac and goals[1]=Boeddeker (:103). setup only checks election, published and `sites.size()==2` (:88).
   Fix: in setup, require `source.sites[0].id=="750" and source.sites[1].id=="2092"` (ids per voting_places.json:7, 35). Otherwise set sites_valid=false.

4. [Candidate, "retained streets"] The street list is duplicated in the data file.
   scripts/build-voting-places.mjs:24 concatenates `map.streets` and `map.wider_streets` without de-duplicating. godot/data/voting_places.json repeats ids 399138118, 686250326, 686250327, 686250328, 686250329, 686250331, 1039057816, 1053810141, 1053826376 and 1112271465 (e.g. :65 and :427). update_art (voting_story.gd:261-265) then emits each path twice in every rasterized SVG.
   Fix: de-duplicate by id in the build script (`new Map(list.map(s=>[s.id,s])).values()`) and regenerate. The test's deepEqual (godot-data.test.mjs:376) follows automatically.

5. [Hooks, "exact manual camera retained"] No assertion covers the walk path.
   walk_route restores the camera (voting_story.gd:208-214), but no shown assertion checks camera_pose across a Walk. Native checks it only on reader open (study_test.gd:6111). Browser checks it at Begin (tests/godot-browser.mjs:1329) and F8 (:1346), not after walk_route or arrival.
   close_story (:150) calls update_block_ui and layout_walking_controls_and_hub, and show_block_panel can defer refresh_hub_camera (main.gd:14850-14852). verify that no deferred camera write lands after the restore at :213-214.
   Fix: in the native walk loop, assert `panel_camera_pose()` is unchanged after arrival with `following_player=false`.

6. [Hooks, "route via/replan"] The via/replan branch is never shown to run.
   voting_story.gd:290-295 (reach via, then find_path to trip_goal) has no assertion that `via_pending` was ever true. The native loop (study_test.gd:6143-6147) checks only that Stop clears it.
   Fix: record `max(via_pending)` across the first leg from home and require true.

7. [Evidence] One evidence label conflicts with the harness.
   The only call site is `verifyVotingStory(page,size.width<600,size)` (tests/godot-browser.mjs:3253), so 559 px can only run as finger. Input.md lists "559mouse". The privateFixture=true path is never invoked in this file.
   verify: which harness produced the six PRIVATE runs, and relabel them. Those runs cannot count toward the `votingStoryChecks.length===3` / `!privateFixture` gate (:3351).

8. [Inspect, "reader"] The screen reader hears the full source text on every action.
   refresh(true) announces `heading + reader.text` (voting_story.gd:252), and reader.text is the full ~1 KB source_text (:231). That fires on every choose, record or place. Button accessible names keep "\n" (:245), whereas power_story replaces it (power_story.gd:535).
   Fix: announce `heading + message`, and use `b.text.replace("\n"," ")` for names.

9. [Hooks, F8] The F8 tooltip is stale.
   power_story `entry` tooltip still reads "power, missing dogs and Halloween (F8)" (power_story.gd:141). Add "election".

OPTIONAL / NICE-TO-HAVE
- The texture cache is bounded: 14 states are reachable, out of a 32-key ceiling, each 720x480 RGBA plus mipmaps. It persists across End (voting_story.gd:194 does not clear `textures`). Clearing it in reset_session frees roughly 25 MB worst case on web.
- Street strokes overrun the rounded border rect because they are drawn after it (voting_story.gd:260-265). Draw the border last, or add a clipPath.
- Player-facing text says "Current information: sfelections.gov" (voting_story.gd:231), but the dataset URL is sfelections.org (voting_places.json:802). verify the current official domain before ship.
- fit_layout does not call game.sync_web_a11y_status() at its end the way power_story does (power_story.gd:582). The browser `settle()` relies on layout_pending, so this is only a parity issue.

CUT THESE
1. `source_sha256` in voting_places.json (:803-807). It is unverified (MUST-FIX 3) and unused at runtime. It is safe to cut if the test is not extended to check it, because the deepEqual against a fresh derivation already proves the data comes from the inputs.
2. Duplicate street entries (SHOULD-FIX 4). This is pure redundancy: identical geometry is drawn twice.

Checked and found consistent (no action):
- main.gd hooks appear at every site where power_story does: cancel sites 6425, 8047, 8148, 8203, 8248, 8293, 8543, 13625, 14522, 14587, 14648; reset/import 12241, 12737, 13308; blocked route 13549; walk control 13660/13667; Escape 14208; objective 6066; snapshot 11615; mutual exclusion 11797/11814.
- F8 resumes voting via power_story.open_story's redirect (power_story.gd:245-246).
- The picker refuses while any episode is active (story_picker.gd:57).
- WASD cancels intent before clearing the path (main.gd:8047-8050).
- find_path never returns partial paths (main.gd:7965-7966).
- Setup order: power_place (main.gd:1995-1997), lamps/trees/neighbors (2001-2011), then make_ui/voting setup (2026, 15518-15520). The site-validity inputs are populated before use.
- The map projection is north-up with x east, and the 36-unit scale bar equals 40 m at 0.9 units/m (voting_story.gd:254, 273).
- The museum/park separations hold: 19.9 m and 22.5 m against the 14 m and 12 m guards (main.gd:195, 672).
- export_presets.cfg:6 includes data/voting_places.json.
