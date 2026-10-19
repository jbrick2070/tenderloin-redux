TOOL CHECK: PASS (read scripts/build-godot-data.mjs, godot/main.gd, godot/tests/study_test.gd, tests/godot-data.test.mjs, tests/godot-browser.mjs, godot/data/buildings.json, godot/data/source_receipt.json, godot/data/SOURCES.md, public/core.js, public/history.js)

Section ids used below: [S1] = Scope item 1 (data pipeline), [S2] = Scope item 2 (Godot runtime), [S3] = Scope item 3 (tests).

VERDICT: yes-with-fixes. The code mostly wires together. But the packet describes an interface the code does not have (names, ids, keys, save path, schema fields, height invariant). History-stop positions also come from three separate copies, and the data and runtime records use different keys.

MUST-FIX BEFORE BUILD

1. [S2]/[S3] The packet's interface does not match the code. Anything built from the packet will fail to connect.
   - `walk_to_comptons_corner()` and `walk_to_black_hawk()` do not exist. Only `walk_to_history_stop()` (godot/main.gd:1514) and `walk_to_or_read_history_stop()` (main.gd:1624) exist, and no test calls the two named functions.
   - Stop ids are `comptons` and `blackhawk`, not `comptons_corner` and `black_hawk` (scripts/build-godot-data.mjs:26,34; main.gd:28).
   - KEY_T is already bound to talking with Celeste (main.gd:3505). The district toggle is KEY_C (main.gd:3538), and that is the key both tests use (study_test.gd:546-551; tests/godot-browser.mjs:187).
   - There is no "Wide Map" button. The control row has exactly 6 buttons (main.gd:4022-4027) and study_test.gd:62 asserts 6.
   - The save path is `user://godot_block_save_v1.json` (main.gd:31), not `user://tenderloin_godot_study_save_v1.json`.
   - The boundary is exported as `cultural_district.polygons[].rings` (build-godot-data.mjs:139-149; main.gd:404-410), not `district_boundary.rings`.
   - Buildings have no `scope` or `height_source` field. Scope is implied by the separate `buildings` and `wider_buildings` arrays (build-godot-data.mjs:73-74,169).
   Fix: change the packet to match the code. Do not rebind KEY_T: that breaks the existing Celeste shortcut.

2. [S1] The claim "all with height_source == measured and height_m >= 5.0" is false.
   - `wider_buildings` includes 201006.0033969 at 0.18 m (godot/data/buildings.json:40753-40754), plus footprints at 4.99 m (buildings.json:22005) and 4.68 m (buildings.json:34422).
   - `derive()` only enforces 0 < h <= 300 (build-godot-data.mjs:56).
   - Duplicates are removed by city ID `sf16_bldgid` (build-godot-data.mjs:83-88), not "OSM ID" as the packet says.
   - The 0.18 m footprint is a full solid: `is_walkable_point()` rejects any point inside any footprint regardless of height (main.gd:1142).
   Fix (smallest): drop the >= 5.0 / height_source wording from the packet and scope_receipt.md. Alternatively, if the threshold is real, filter in `deriveWiderBuildings()` and assert it in tests/godot-data.test.mjs; the count then drops below 130 and every 130/188 assertion must change together (godot-data.test.mjs:90, study_test.gd:46-47, godot-browser.mjs:219-220, source_receipt.json:4-5).

3. [S2] History-stop positions have three sources of truth.
   - The plaque is drawn from the data's `history_stops[].pos` (build-godot-data.mjs:29,36 → main.gd:480-483).
   - The walk goal, arrival radius, tap hit-test and camera focus all use the hard-coded `COMPTONS_POS` / `BLACKHAWK_POS` constants (main.gd:26-27, 1008-1015, 1587, 3454-3463).
   - A third copy sits in the `get_history_stop_record()` fallback (main.gd:1027,1035).
   - If the data changes, the plaque moves but walking still targets the old spot. study_test.gd:57-61 only checks the constants, so the drift would not be caught.
   Fix: `history_stop_xz()` should read `pos` from `get_history_stop_record()` and use the constants only when the data is missing, or add a test that the data pos equals the constants.

4. [S2] The data record and the runtime use different key names. The data stops have `id`, `name`, `intersection`, `pos`, `source_note` and nothing else (buildings.json:45125-45143). The runtime expects `title`, `note`, `point`, `year`.
   - When a route is blocked, the message uses `.get("title", id)` (main.gd:3252), so the player sees "Route blocked to blackhawk".
   - `read_history_stop()` displays `source_note`, which is a citation, as the narrative text. The narrative only exists in the fallback `note` (main.gd:1601 vs 1029/1037).
   - `year` is always the hard-coded default (main.gd:1619).
   Fix: at main.gd:3252 use `rec.get("name", rec.get("title", id))`, the same chain as main.gd:1518/1600. Then either add `year` and `note` to `HISTORY_STOPS` in the build script or remove them from the fallback.

SHOULD-FIX

5. [S2] The 448 m walk is not at real walking speed.
   - `WALK_CORRIDOR_SPEED_M_PER_S = 24.0` (main.gd:10) is 5× normal speed. It applies whenever the target is blackhawk, or the player or goal is at x < -50 (main.gd:3169). The -50 is an undocumented geographic constant.
   - This contradicts "actual-metre walking" (main.gd:2) and the packet's "walking ~448m".
   - The Black Hawk test loop (study_test.gd:421-429) skips the no-teleport step check used elsewhere (study_test.gd:160-165).
   - Ordering hazard: the browser test's 40 s timeout for KeyH (godot-browser.mjs:182) only passes because of this speed. At 4.8 m/s the walk takes about 93 s, so removing the speed-up breaks the browser test.
   Fix: either name it as a fast-travel mode in the packet and status text and assert a corridor-speed step bound in the test, or keep 4.8 m/s and raise the browser timeout and test guards together.

6. [S2] Route planning to Hyde is a synchronous, unweighted search over the whole enlarged walk area.
   - The search is breadth-first on a 2 m grid with no distance heuristic (main.gd:1191-1262).
   - The walk area is now all 188 footprints plus 14 m (main.gd:316-320), so the search expands most walkable street cells within ~450 m before it reaches the goal.
   - Each cell calls `is_walkable_point()`, which runs `min_wall_distance()` over all 188 buildings (main.gd:1061-1076).
   - It runs inside the key handler and again inside the physics step when a route is re-planned (main.gd:3198, 3239), so it can stall a frame.
   - verify: time `find_path(PLAYER_START → BLACKHAWK_POS)` in the Web export.
   Fix: switch to A* with a straight-line-distance heuristic, a local change inside `find_path()`.

7. [S1]/[S3] The exported `signpost` coordinates are unused and make the crossing test too loose.
   - The build script exports `signpost` (build-godot-data.mjs:20-22,158), but main.gd never reads it. Posts are placed at `point` + (4.2, -4.2) (main.gd:446,460).
   - The test's "crossed Jones/Leavenworth" thresholds use the signpost x values, -136.5 and -281.1 (study_test.gd:425-428). The real street centrelines are at x = -144.5 and -289.1 (buildings.json:45090,45103), so the test passes about 8 m before the player actually crosses.
   - The Black Hawk stop position equals the Hyde signpost value (build-godot-data.mjs:22 vs 36), which is how the copied constant in item 3 arose.
   Fix: compare against `data.west_intersections[i].point[0]` in the test, and either drop `signpost` or use it in `build_west_intersections()`.

8. [S1] Golden Gate is claimed but not exported.
   - SOURCES.md:11 and the scope text both say "along Eddy, Turk, and Golden Gate".
   - public/data/streets.osm.json has zero Golden Gate ways, and `WIDER_STREET_NAMES` excludes it (build-godot-data.mjs:10-18).
   - Any footprint frontage on Golden Gate is more than 12 m from every street centreline, so it cannot be reached on foot (main.gd:14,1140).
   Fix: remove the Golden Gate claim. Adding it would require a new OSM fetch, which violates the "no network" rule.

9. [S2] A tap on an unreachable spot can silently send the player to the start point.
   - `nearest_walkable_point()` falls back to `PLAYER_START` when nothing walkable is within 28 m (main.gd:1189).
   - At the new scale, a wide-overview tap on a block interior more than 12 + 28 m from a centreline sends the player toward Bea's start, possibly ~450 m away and at the 5× speed from item 5. [ASSUMPTION: Tenderloin block interiors are more than 40 m from the nearest centreline.]
   Fix: return a not-found result. `walk_to_point()` should then show "No walkable street point here" instead of routing.

10. [S3] The wide-overview "no clipping at 1100/390/320" claim is untested.
   - The FIT_CHECK resize loop only checks `projected_bounds()` after `overview()` (study_test.gd:568-580).
   - `wide_overview()` is checked once, at 1100×760, with a loose size > 100×40 test (study_test.gd:446-449).
   - The browser test compares `wideShot` with `before` (godot-browser.mjs:196), which differ anyway after all the earlier state changes.
   Fix: inside the resize loop, call `wide_overview()`, wait for the refit, and assert `projected_wider_bounds()` lies within [11, size.x-11] horizontally and [top, bottom] vertically.

11. [S3] The `world_d <= 8.5` tap bound (main.gd:3440) has no test, even though the packet lists it as a behaviour change.
   Fix: zoom out to the wide overview, tap a ground point about 23 m from Bea, and assert `selected_neighbor == -1` and that a route to that point started.

12. [S1] Nothing checks `source_receipt.json`'s hand-entered counts. `count`, `widerCount` and `totalCount` (source_receipt.json:3-5) are never asserted; godot-data.test.mjs:27-34 only checks the hashes.
   Fix: assert `widerCount === output.wider_buildings.length` and `totalCount === output.buildings.length + output.wider_buildings.length`.

OPTIONAL / NICE-TO-HAVE

- [S2] Camera distance is tied to the mode flag. `offset_scale` depends on `in_wide_overview`, but pan and zoom clear that flag (main.gd:3470, 3732). In the 1100×760 wide view, where `view_size` is ≤ 480 [ASSUMPTION], the camera distance therefore drops from about 686 m to 311 m in the middle of a view. My estimate leaves about 16 m before the nearest corner reaches the near clipping plane at 1.0×. Fix: base the distance on `view_size` alone, or always use 2.2.
- [S2] Each district toggle writes a save and increments `save_seq` (main.gd:1633). The browser test's `save_seq >= 12` (godot-browser.mjs:243) depends on that. Note it if the toggle later becomes a display-only preference.
- [S2] At startup, `overview()` runs twice: once from `make_ui()` → `resize_controls` → `refit_after_layout()` (main.gd:4061, 4049) and once from `_ready` (main.gd:340). It is harmless, but the double call is easy to miss.
- [S1] The Black Hawk stop is at the north-east corner of Turk & Hyde: 9.4 m east and 7.3 m north of the projected Hyde node (buildings.json:45116-45117 vs 45141-45142). The source note says "200 Hyde at Turk". verify: which corner of Turk & Hyde 200 Hyde Street is on.
- [S2] The browser-save mapping is consistent with the browser game. `core.history` is set by reading Compton's (public/core.js:27,67,163; public/game.js:439), and `core.blackhawk` is set by `discover-blackhawk` (public/core.js:66,164). No change needed. Keep a test that browser `history` stays tied to Compton's.

CUT THESE (over-engineering)

1. [S2] `camera.far = 4500` (main.gd:330). The deepest scene point at the 2.2× camera distance is about 960 m from the camera [ASSUMPTION: my estimate from the wider bounding box], well under Godot's default far plane of 4000 m. Safe to remove.
2. [S2] The hard-coded `get_history_stop_record()` fallback records (main.gd:1022-1038). Once item 3 makes the data authoritative, these are a stale second copy. The data test already guarantees two stops exist (godot-data.test.mjs:115), so they are safe to remove.
3. [S1] The `signpost` field in `WEST_INTERSECTIONS` (build-godot-data.mjs:20-22,158). Nothing at runtime reads it (main.gd:438-472), and it misleads the test (item 7). Safe to remove after fixing the test thresholds.
