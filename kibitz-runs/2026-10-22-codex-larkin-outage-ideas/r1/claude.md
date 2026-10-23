TOOL CHECK: PASS. Read godot/power_story.gd (481 lines), godot/main.gd, scripts/build-godot-data.mjs, godot/data/source/osm_buildings.json, public/data/streets.osm.json, artifacts/utility-research-2026-10-22/research.md, tests/godot-browser.mjs, tests/godot-data.test.mjs, plus driver_anchor.md and scope_receipt.md. Nothing was run, edited, tested or committed.

Section ids used below: input ¶1 to ¶4 are the four paragraphs of r1/input.md (lines 3, 5, 7, 9). anchor:<HEADING> is a heading in r1/driver_anchor.md.

VERDICT: yes-with-fixes. The research is honest and the guardrails are good. But the brief never says what layer carries the "real substance" the creator wants. Three things are left unresolved: the brief keeps a fictional elbow puzzle, its after-dark lighting payoff, and a "you restored the power" win line. None of these fits a daytime breaker fire that PG&E fixed. Option (a) is presented as "bounded" when it isn't.

MUST-FIX BEFORE BUILD

1. [input ¶2/¶3 vs godot/power_story.gd:327-338, 252-260] The time of day is wrong for the main event.
   - apply_lighting() forces a "fictional after-dark scene override": background 101b2b, sun 0.36, and night_glow/pool only when restored==7.
   - research.md says the 2017 Larkin event began about 9:06 a.m., with full restoration by 4:46 p.m.
   - So a "realistic" 2017 case shown at night is a factual contradiction. And the payoff (night glow coming back) doesn't read in daylight.
   - The 2014 SFFD entry has a date but no time (research.md, "Larkin/Eddy transformer report"). Night lighting is unsupported there too.
   - Fix: each case needs a sourced or explicitly "time not recorded" lighting stance. For 2017, use a daytime scene, and make the payoff something other than night_glow. If any lighting is invented, label it as fiction on screen.

2. [input ¶2, anchor:MUST-FIX vs power_story.gd:246, 317-320, 377] The win text gives the player the wrong role.
   - The current lines are "You brought our lights back!" / "You made the connection", and the reader text says "Three portable transformer relays".
   - Tied to a real 88,000-customer outage, this tells players that residents or the player restored grid power. Per research.md, PG&E restored it.
   - "Transformer" is now a loaded word, because the 2014 record is literally "blown transformers".
   - Fix: reframe the puzzle as something the community does while the grid is down, e.g. linking battery lanterns or charging points at a gathering, under an explicit "original fiction" label. Remove "transformer" from all player-facing text. The end text must not say the player restored utility service.

3. [input ¶3 option (a), anchor:CONFIRMED] Option (a) is called a "bounded actual street/footprint extension". The data pipeline says it is not bounded.
   - Larkin Street has zero ways in public/data/streets.osm.json. Eddy's westmost node is lon -122.4159033, about x≈-450 m in project(). The substation's east wall is at lon -122.4165690, about x≈-509 m (osm_buildings.json way 71209428). That leaves a gap of about 47-59 m with no street. MAX_STREET_CORRIDOR_M is 12 (main.gd:17).
   - widerBbox (scripts/build-godot-data.mjs:9) is imported by scripts/build-lidar-2023.mjs:40. Widening it pulls in new 2010 footprints.
   - Those footprints would break tests/godot-data.test.mjs:275 ("all 188 footprints have a LiDAR roof record") unless the EPT/Roofer LiDAR pipeline is re-run. It would also change wider_source_sha256 and streets_sha256, and the receipt counts checked at test lines 32-33.
   - It also needs a new source fetch at build time (Overpass, DataSF). The brief only bans network access at runtime.
   - Fix: state these costs in the brief and classify (a) as a data-pipeline project, not a slice. If (a) stays an option, it needs its own source-acquisition step and a re-baseline of the 188-footprint/LiDAR invariant. Otherwise drop it from this cycle.

4. [input ¶2 "do not silently treat nearest_walkable_point fallback as arrival"] The silent-fallback hazard is worse than the brief says.
   - power_story.gd:144 caches its goals with game.nearest_walkable_point() and has no distance guard.
   - nearest_walkable_point (main.gd:7838-7860) clamps to walk_bounds and searches up to 28 m. If it finds nothing, it returns PLAYER_START, the spawn on the opening block.
   - walk_to_point's 28.5 m guard (main.gd:8511) only compares the already-cached goal with its own snap, so it passes.
   - Result: a goal placed at Larkin would cache as the spawn point. "Walk to relay" would walk there and open the repair view at the spawn, as if the player had arrived.
   - Fix: acceptance must require every scenario goal to satisfy is_walkable_point(goal) and |goal - intended source point| <= ARRIVAL_M, checked at setup. The snapshot must expose the source coordinate and the snapped coordinate separately.

5. [input ¶4] The first clause has two opposite readings.
   - "Retain no savedkey/version/award/timer, original three-stage restoration framework unless justified" can mean "keep the no-save/no-timer rules AND the three-stage framework", or "retain NO … three-stage framework".
   - Meanwhile anchor:SHOULD-FIX says the cases "should differ meaningfully in task/visual rhythm, not just a title". That is in tension with reusing the same 2×2 elbow puzzle with different SOURCES/SINKS (power_story.gd:10-11).
   - Fix: restate it as a list. Keep: no save keys, no version bump, no awards, no timer. Then say explicitly whether the three-relay elbow puzzle is kept for both cases, or replaced/varied for one, and give the reason.

6. [input ¶2 "A second scenario can use that same honest site/date distinction"] The 2014 case is too thin for a full scenario.
   - Its evidence is one intersection-level line in an SFFD operations report: storm, date, "blown transformers". It gives no time, scale or customer count.
   - research.md says explicitly: "Do not equate it automatically with the later Larkin Substation incident."
   - Two cases at the same corner, differing only by date and cause, invite exactly that conflation. Everything that makes 2014 "meaningfully different" would have to be invented.
   - Fix: the creator asked for "1-2", so make 2017 the single primary case. Either drop 2014, or make it a short, clearly labelled second case whose difference is the cause (storm vs equipment fire) and a different fictional community task. It must never share relay goals, copy or a win state with 2017.

SHOULD-FIX

1. [input ¶4 "include scenario selection inside" Power, anchor:MUST-PRESERVE] The brief doesn't account for test indices or layout space.
   - tests/godot-browser.mjs:1166-1180 taps power_story.buttons[4+station], [7] and [8] by position. Snapshot order is pads + tabs + actions (power_story.gd:442).
   - Inserting case-choice buttons shifts every index. In side mode the tray is only 280 px wide (power_story.gd:421), and the connector pads hide whenever 88*scale<44 (power_story.gd:431-435). Case buttons take height from the picture area and will push the smallest interior into the "connector_room=false" state.
   - Fix: say where the case choice lives. Recommendation: a pre-Begin step that replaces the relay tabs before the story starts, so it adds no permanent row. Also require the snapshot to list buttons by name.

2. [input ¶3 option (b)] The "case-map" option risks becoming exactly the worksheet/reference card the creator rejected (input ¶3: "not merely copy changes or another worksheet").
   - Fix: require (b) to be joined to an on-foot action at a real, built coordinate. Otherwise it fails the stated goal and should be scored that way.

3. [input ¶3 "(c) another source-feasible approach"] The strongest (c) is already half-built and the brief doesn't mention it. Call it the "edge vantage".
   - Walk to the real western end of built Eddy (OSM way 1193701323, last node lon -122.4159033). That is a sourced street point inside the built world. Show the OSM footprint of way 71209428 as a labelled, non-walkable, non-collidable outline "one half-block west, beyond the map".
   - Plain outline, or extruded only to its OSM-tagged height=9, labelled as an OSM contributor tag. No facade.
   - The local recovery tasks then happen on real, existing blocks.
   - It reuses the sourced history-stop pattern (scripts/build-godot-data.mjs:24-45, main.gd:2313-2362). But note that HISTORY_STOP_IDS (main.gd:31), the hard-coded label ternary (main.gd:2356) and tests/godot-data.test.mjs:120 (history_stops.length == 2) all fix the count at 2. A third stop is not a data-only change. Verify whether it is better as a power_story-owned node.
   - Fix: add (c) as an option and score it against (a)/(b).

4. [input ¶1, ¶3] The existing relay goals are about 500 m away from the site.
   - Relay goals come from street_lamp_points[0..2], i.e. lamp_coords (36,4.2), (62,4.2), (96,4.2) on Turk near Taylor/Mason (main.gd:3947-3950).
   - Larkin/Eddy is about x≈-590, z≈-31. Any wording that places the existing relays "at Larkin" is false.
   - Fix: the brief should require that every in-world label states its true distance and direction from 600 Larkin, or names its own real corner.

5. [anchor:UNVERIFIABLE] The OSM substation outline has its own provenance limits.
   - way 71209428 carries contributor tags (height 9, voltage 115000;12000, substation transmission).
   - Showing voltage or "transmission" text would be putting utility-topology claims on screen, which input ¶3 forbids.
   - Fix: allow only name, footprint and ODbL attribution. Ban the voltage/substation-class tags from the UI.

6. [input ¶1] "Read … current handoff". No file named HANDOFF exists under docs/. The likely candidates are docs/BUILD_STATUS.md and docs/ROADMAP.md. Name the actual file so reviewers don't guess.

OPTIONAL / NICE-TO-HAVE
- For the 2017 case, use the sourced timeline (≈9:06 a.m. start → 4:46 p.m. full restoration) as a turn structure without a clock: the fictional community phases are "morning / midday / late afternoon". This brings history in without a timer.
- Show a "What's real / What's invented" split in the reader for each case, so the provenance rule the anchor demands is visible to players and testable as a snapshot field.

CUT THESE
1. Mission/8th (input ¶2, research.md). It is outside the Tenderloin and outside built geography, and input ¶2 already says it isn't needed. Drop all mention so no build agent picks it up.
2. Grant/Sutter (research.md). The same SFFD line mentions it, but it is outside the modelled area and has no stated role. Safe to cut.
3. "Originality/prior-art where source-supported" (input ¶2). No prior-art source exists in the repo or the research artifact, so any claim would be unsourced. Cut it or require "none researched".
4. The full five-gate native + mouse/finger/keyboard acceptance for every alternative (input ¶4). For an idea pass, require it only for the recommended slice. Per-alternative acceptance is padding.
5. Option (a) as an in-cycle candidate (see MUST-FIX 3). It is safe to defer: the data invariants at tests/godot-data.test.mjs:32-33 and :275, and the LiDAR dependency at build-lidar-2023.mjs:40, make it a separate data project. Options (b) and (c) meet "real place" honestly without it.

[ASSUMPTION] Projected coordinates were computed by hand from project() (scripts/build-godot-data.mjs:48-51) using origin lat 37.7832203 / lon -122.410784. They are approximate to a few metres. The exact western edge of walk_bounds (main.gd:1989) depends on the derived wider footprints, which I did not compute. Verify: the actual walk_bounds.position.x at runtime.
