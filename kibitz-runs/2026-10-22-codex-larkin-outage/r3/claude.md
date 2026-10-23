TOOL CHECK: PASS (read godot/power_place.gd, godot/power_story.gd, godot/main.gd, godot/data/power_place.json, godot/data/buildings.json, scripts/build-power-place.mjs, godot/export_presets.cfg, godot/tests/study_test.gd, tests/godot-browser.mjs, tests/godot-data.test.mjs, docs/POWER_STORY_SOURCES.md, r3/driver_anchor.md, r3/scope_receipt.md). No commands, tests, native or git run.

VERDICT: yes-with-fixes. The startup order, export inclusion and data derivation hold together. The bounds extension has side effects beyond the stated scope. The via-routing rule is a magic-number heuristic that backtracks after Stop. The tests do not prove the route followed the Eddy approach.

MUST-FIX BEFORE BUILD

1. [power_place.gd:44 + main.gd:1991-2004, 4266, 7811] The walk-bounds extension is global. It is not limited to the Eddy approach, which contradicts docs/POWER_STORY_SOURCES.md:18 ("Only a short western walking-bound extension along this already sourced Eddy approach").
   - Defect: `game.walk_bounds = walk_bounds.expand(goal+(-10,0))` moves the west edge of the whole rectangle to x = -603.4 across its full z span. Before this change, the edge was roughly x = -547, from the westmost wider building at about -533.2 (buildings.json:15015) plus `grow(14)` at main.gd:1990.
     - Effect (a): is_walkable_point (main.gd:7811-7823) only requires walk_bounds plus being within 12 m of any street way. Wider Turk Street way 686250332 (buildings.json:44605-44639) runs west to (-578.6, 93.05), so about 30-40 m of Turk west of the last measured building becomes walkable. That stretch has no wall records, so the walkable corridor there is 24 m wide over unmodeled lots.
     - Effect (b), sequencing: build_muni_overhead_lines (main.gd:2004) runs after power_place.setup (main.gd:1993) and derives `area := walk_bounds.grow(-6.0)` (main.gd:4266). Trolley wires and poles are therefore now generated on Eddy (way 30832489) and Turk (way 686250332) out to x ≈ -597.
     - The only trolley test uses thresholds (study_test.gd:1565: >= 40 poles, >= 20 runs), so it cannot catch this.
   - Smallest fix:
     - In power_place.setup, record `legacy_west := game.walk_bounds.position.x` before expanding, and add `func admits(pt) -> bool: return pt.x >= legacy_west or <distance from pt to source.eddy.points polyline> <= game.MAX_STREET_CORRIDOR_M`.
     - In main.is_walkable_point, after the walk_bounds check, add `if power_place != null and not power_place.admits(pt): return false`.
     - For the trolleys, save the pre-extension rect in main before line 1991 (e.g. `var legacy_walk_bounds := walk_bounds`) and use it at main.gd:4266. Do not move power_place.setup later: the trolley builder needs the substation footprint for its building_containing_point pole rejection (main.gd:4314).
   - Add a regression check, e.g. `not study.is_walkable_point(Vector2(-570, 91))` (Turk west of the old bound).

2. [power_story.gd:333] The via routing condition is wrong in both directions. This is the audit item "Stop/inactive-state behavior; real route reaches corner AND returns".
   - (a) For `station==0` the code always routes via Taylor/Eddy (return_junction xz -16.53, -103.66). Say a player Stops partway along Eddy (e.g. x = -300), or is already at x = -560 after a blocked route, and presses Walk again. walk_to_point(via) sends them east to Taylor and then back west: a detour of up to about 1.1 km.
   - (b) The return rule `player_xz().x < -500` is a hard-coded magic number not derived from data. A player between x = -500 and the Hyde/Eddy junction (x = -450.4, power_place.json eddy.points[-1]) takes the unrestricted path. That is the path the code comment at power_story.gd:334-335 says grazes the Turk/Hyde wall [ASSUMPTION: the graze is reachable from starts west of Hyde; verify with the candidate4 diagnostic].
   - Also: if near() is already true for station 0, Walk still triggers the full detour.
   - Smallest fix:
     - Guard first: `if near(): open_story(); return`.
     - For station 0, go direct when the chord is clear: `if historical and station==0 and game.segment_walkable(game.player_xz(), trip_goal)` → direct walk_to_point. Eddy is nearly straight; the chord from Taylor/Eddy to Larkin/Eddy deviates under 1 m from the OSM polyline (buildings.json:43957-43984, 44169-44200, 44683, 44969).
     - Replace -500 with `game.power_place.source.eddy.points[-1][0]` (Hyde/Eddy), or with return_junction x.

3. [study_test.gd:5628-5637, godot-browser.mjs:1263-1266] The route tests can pass without the via being used, so they do not prove "historical routes now use the source-backed Eddy approach".
   - Both tests only assert the endpoint (near() / within 2 m). advance_walk replans with an unrestricted `find_path(cur, goal_xz)` where goal_xz = current_path.back() (main.gd:13428, 13466). A silent replan, or a direct route, that happened to reach the goal would still pass.
   - Fix (native):
     - Sample player_xz each advance_walk step.
     - Require that every sample with x < eddy.points[-1].x (west of Hyde) lies within MAX_STREET_CORRIDOR_M of the eddy polyline.
     - Require that the first path after walk_to_relay contains return_junction xz.
     - Add station 2 starting from Larkin (currently only station 0 → 1 is walked).
     - Add a Stop-mid-route-then-Walk case that asserts no eastward backtrack. This depends on #2.

SHOULD-FIX

4. [power_story.gd:338-343 vs main.gd:13425-13473] The combined path loses its via on any replan.
   - walk_to_relay appends the tail into game.current_path. advance_walk's replan then targets current_path.back() (Larkin, or a Turk station) without the via. That is exactly the unrestricted route the via exists to avoid. If that route then fails, blocked_route() fires (main.gd:13471).
   - The risk is low on the straight Eddy legs but nonzero on the A* leg from via to a Turk station.
   - Smallest fix: walk the two legs separately.
     - Store `pending_tail_goal` in power_story instead of appending.
     - In _process, when traveling, the path is empty and the player is within ARRIVAL_M of the via, call `game.walk_to_point(trip_goal)` and then set `traveling=true` again (walk_to_point calls cancel_intent at main.gd:8513).
     - Each leg's replan then has the correct goal.

5. [power_place.gd:14-16 + power_story.gd:156,173,209] The JSON load has no null guard.
   - If power_place.json is missing or malformed (it is in include_filter, export_presets.cfg:6, so this is a packaging regression risk, not a current fault), `source.exterior` errors inside main._ready at main.gd:1993, before make_ui and load_godot_state. The whole game breaks.
   - A partial guard is also dangerous: `goal` defaults to Vector2.ZERO, and site_valid (power_story.gd:173) could accept a walkable origin. That would silently "move the location", which the anchor says must be refused.
   - Fix:
     - Mirror load_street_tree_data (main.gd:4937-4941): push_warning and set `loaded=false`, then return before mesh/nav/bounds mutation.
     - Make site_valid `game.power_place.loaded and ...`.
     - Guard cutaway (main.gd:13599, 13737) on `power_place.mesh != null`.

6. [scripts/build-power-place.mjs:21] `return_junction` is a hard-coded lon/lat that the builder never cross-checks against the street it claims to come from.
   - The `source` string says "Existing OSM Eddy way 277480424 endpoint at Taylor", but the builder never looks up way 277480424. The data test (godot-data.test.mjs:27-29) compares runtime against the same builder, so it is self-referential.
   - The value currently matches buildings.json:44197-44198 exactly.
   - Fix:
     - Derive it as `streets.ways.find(w=>w.id===277480424)`, take its last geometry node, and add it to the existing identity `throw` at line 13.
     - Emit `lonlat` like junction/address_point.
     - In godot-data.test.mjs, assert that `runtime.eddy.points` deep-equals buildings.json wider_streets way 30832489, and that return_junction.xz equals the last point of way 277480424 there. Walking uses buildings.json (main.gd:2042), while the map uses the power_place.json copy, and nothing ties the two together today.

7. [power_story.gd:221, 346, 466, 496; main.gd:4908] Utility-role and copy conflation in historical mode.
   - walk_to_relay announces `NAMES[station]` ("Welcome lights") and "Its repair view opens after arrival" while heading to the real substation corner.
   - Active historical text prefixes Festival `NAMES`/`CLUES`.
   - actions[0] reads "Repair\nview".
   - objective().hint reads "repair the next fictional relay".
   - toggle_evening_lights says "Power Story has its own after-dark lighting", but historical is daylight (power_story.gd:396-407).
   - Fix: use phase_name(station) in the announcement and the active text. In historical mode, replace "repair" with neutral wording ("Battery view" / "light kit"). Branch the toggle message on `power_story.historical`.

8. [power_story.gd:547 snapshot] For historical stations 1 and 2, the `world[i]` snapshot entries track the wrong object.
   - They project fixtures[1..2] (street lamp heads). update_world forces those lamps lit for every i<7 in historical mode (power_story.gd:428), so they never change.
   - The object that actually changes is lamps[i] / boxes[i] (power_story.gd:424-425). Any pixel or "lit" assertion on world[1..2] in historical mode is vacuous; only station 0 (site_lamp) is pixel-tested (godot-browser.mjs:1286).
   - Fix: `fixture = site_lamp if historical and i==0 else (lamps[i] if historical else fixtures[i])`.

9. [study_test.gd:5617-5618] "Exact lighting restoration" after a historical End is not tested.
   - The test checks only site_kit, save, file and quiet state. The Festival test captures the full 9-value tuple (study_test.gd:5384). Code-wise, apply_time_of_day (main.gd:4889-4904) resets every field apply_lighting touches, so this is a proof gap, not a known bug.
   - Fix: capture the same tuple before begin() and require equality after end_session(false), at each size.

10. [godot-browser.mjs:1266] The station-1 endpoint check is only `x > 0`, and station 2's endpoint is never checked.
    - Fix: assert the endpoint is within 2 m of `relay_goal(station)` from the snapshot (`world[i].goal_x/goal_z`) for stations 1 and 2.

OPTIONAL / NICE-TO-HAVE
- [main.gd:8552-8553] walk_to_point(via) sets info.text and announces "Walking to street point (-16.5,-103.7) m · <distance to via>". power_story then announces again. The HUD distance refers to Taylor/Eddy, not the destination. Consider overriding info.text after the append.
- [power_story.gd:172] The label reuses the name "SurpriseLabel" to get into readable_scene_labels (main.gd:2265). It works, but it couples to the surprise naming; add a distinct name to that list instead.
- [power_story.gd:338] walk_to_relay runs segment_walkable over a ~577 m chord (~1,280 is_walkable_point calls) plus walk_to_point's find_path synchronously on button press. verify: frame hitch on the web build at 320x667.
- South side of Eddy west of x ≈ -533 has no wall records, so the 12 m corridor admits unmodeled lots. Mention this in the docs alongside "Larkin Street beyond the junction is not modeled".
- No pixel or test evidence that the OSM exterior renders, or that cutaway (power_place.gd:46-51) triggers at the corner under a rotated yaw. Only the map dot and the battery globe are pixel-checked.

CUT THESE (over-engineering)
1. [power_place.gd:38] `mesh.create_trimesh_collision()`. main.gd has no physics movement (player is a CharacterBody3D moved by direct position assignment at main.gd:13474; no move_and_slide) and no ray picking (no intersect_ray/get_collider). Blocking comes from the 2D record appended at power_place.gd:40-42. Cutting it removes an inert physics body. Keep it only if you want parity with the existing per-building StaticBody3D convention (study_test.gd:289/341 assert that only for measured/wider meshes, not this one).
