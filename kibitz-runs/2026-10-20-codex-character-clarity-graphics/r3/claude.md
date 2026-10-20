TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, docs/STREET_VIEW_ASSESSMENT.md, godot/project.godot). I had no shell, so I did not run git diff, the public/ fingerprint hash or any gate. Every claim below comes from reading the current working-tree source.

VERDICT: yes-with-fixes. The wiring is mostly sound: the build order is safe, there is no new collision, the save is unaffected and the shadow is parented to the root. Three things have to happen before "complete" can be claimed: a render check of the ring's pixel width (without MSAA), a fix for the evening transparent-sort order against the light pools, and a fix for the grounding-height test bound, which checks against the wrong surface. The full browser run is still outstanding.

MUST-FIX BEFORE BUILD

1. [Input §2 "thin hollow rings"; main.gd:3246-3248, main.gd:18, main.gd:1956-1957, main.gd:13138; project.godot]
   Defect: the rings are likely too thin to render at the zoom levels the game actually uses.
   - Ring band width in local units: neighbors 0.035 and player 0.055 (main.gd:3248).
   - After the 2.15 scale (main.gd:2508, main.gd:2528) that is about 7.5 cm and 11.8 cm in world units.
   - The camera is orthographic with keep-height. camera.size = view_size, which ranges from 45 up to 250/400 (main.gd:461, :467, :6712).
   - CAMERA_OFFSET (180,180,180) gives roughly 35 degrees of elevation, so the front and back of each ring are foreshortened by about 0.58.
   - project.godot has no MSAA/FXAA setting.
   - At the browser test's 390x667 size and view_size 45: about 6.7 cm per pixel. Neighbor ring sides come to about 1.1 px and the front/back to about 0.65 px. The player ring is about 1.75 px / 1.0 px. At the startup and overview sizes the rings are far below one pixel.
   - Without anti-aliasing, a sub-pixel opaque band breaks up into a dotted line or disappears, and it shimmers while walking.
   - The filled disc it replaces was the neighbors' locator at overview zoom.
   - The pixel numbers are arithmetic from source. Whether it actually looks broken needs a render.
   Fix:
   - Before sign-off, inspect the 320, 390 and 1100 width screenshots at view_size 45 and at overview (godot-browser.mjs:79, :104, :139, :151).
   - If the rings break up, widen the band in add_character_grounding. Keeping the inner radius at 0.50 or more still satisfies the hollow test at study_test.gd:105; for example, use outer 0.62 / inner 0.52 for neighbors. Alternatively, keep a faint fill for neighbors only in overview.
   - Do not claim "thinner rings show pavement" from a single local-preview zoom.

2. [Input §2 "soft, depth-tested contact shadow" plus Shift+L; main.gd:3260-3262 vs main.gd:4751-4758, main.gd:4682]
   Defect: in evening mode the shadow-over-light-pool look depends on where the camera happens to be.
   - ContactShadow uses TRANSPARENCY_ALPHA.
   - StorefrontLightPools is also transparent, with BLEND_MODE_ADD, at y 0.045. It is one map-wide MeshInstance, and its alpha is 1.0 in evening mode (main.gd:4773).
   - Neither writes depth, so draw order is decided only by transparent depth sorting of each object's AABB.
   - The pools' AABB center is fixed while the shadow moves with the player, so the order flips across the map:
     - shadow drawn first, then the additive pool: the shadow looks washed out.
     - pool drawn first, then the shadow: the glow looks darkened.
   - Pools sit 5-11 m from the street (main.gd:4732), which is where neighbors stand and the player walks.
   Fix: one line in add_character_grounding: `contact_material.render_priority = 1`, so shadows always sort after the pools. Then re-screenshot evening at a pool (godot-browser.mjs:90 currently captures only the start position). Whether the flip is visible needs a render.

3. [Input §5 "clearance above existing curbs"; main.gd:3259; study_test.gd:99; godot-browser.mjs:83]
   Defect: the comment and both tests treat the curb (0.052, main.gd:2022) as the highest ground layer. It isn't:
   - RouteRibbon is opaque at world y 0.06 and starts exactly at the player's xz while walking (main.gd:7431, :7439).
   - The ADA pads are at 0.058 (main.gd:2073 + :2092).
   - The shadow sits at 0.029 x 2.15 = 0.06235. It clears the ribbon by only 2.35 mm.
   - A future change to 0.027 (world 0.058) still passes both `> 0.052` assertions, but the shadow would sink under the route ribbon, which is the moving-frame case this round claims to verify.
   Fix:
   - Raise the lower bound in study_test.gd:99 and godot-browser.mjs:83 to `> 0.06` (or to the ribbon height plus a margin).
   - Correct the comment at main.gd:3259 to name the route ribbon.
   - Optionally, share one constant between update_route_ribbon and the test.

SHOULD-FIX

1. [Input §4 "read-only snapshot fields"; main.gd:10751, main.gd:10777]
   Defect: `player_visual.get_node("ContactShadow")` is unguarded inside get_a11y_status_snapshot. If the node is missing or renamed, or the function is called before build, the null `.global_position` throws. That aborts the whole a11y payload (main.gd:10857), which also feeds the screen-reader DOM bridge and every browser assertion.
   Fix: use `get_node_or_null` and emit null shadow fields when it is missing.

2. [Input §4 "stride/walking"; main.gd:10777 vs main.gd:3439 and main.gd:7453]
   Defect: `walking` is `not current_path.is_empty()`. walk_step (keyboard/WASD walking) clears current_path, so a player walking by keyboard reports walking=false. Meanwhile the animation's is_moving (main.gd:3439) is true and stride rises. The field name promises more than the contract delivers.
   Fix: rename it to `path_active`, or publish the same is_moving value the animation uses.

3. [Input §5 "moving/turning grounding"; study_test.gd:1571-1575]
   Defect: the turning check is vacuous.
   - Every step is `walk_step(Vector2(1.0, 0.0), ...)`, so the heading never changes.
   - `global_basis.y == UP` is always true for a Y-only rotation with uniform scale (main.gd:7476).
   - The y-equality check is also true by construction: animate_person_node only touches limb children (main.gd:3403-3431), and walk_step always writes y 0.0 (main.gd:7485).
   Fix:
   - Alternate directions, e.g. (1,0), (0,1), (-1,0), and assert the player's yaw actually changed between steps.
   - Assert `contact.position == Vector3(0, 0.029, 0)` after animate_person_node. That is the real invariant.

4. [study_test.gd:1570-1579]
   Defect: the walking probe leaks state into later tests. walk_step sets the following (main.gd:7453-7473), and the probe restores only position and rotation:
   - in_overview / in_wide_overview = false
   - following_player = true
   - selected_neighbor / arrived_* = -1 or false
   - selection is cleared
   - panels are closed
   - the route ribbon is rebuilt
   The later tests (from study_test.gd:1581) currently pass, but they now depend on the order this probe runs in.
   Fix: snapshot and restore those flags, or run the probe at a point where they are reset anyway.

5. [godot-browser.mjs:126-138]
   Defect: the line 138 check "walking evidence comes from a moved player" compares against `oriented` (the start position). The player has already walked via "Walk to neighbor" (line 126), so the check passes even if Digit5 never moved them. Also, `walking && stride > 0.5` (line 134) can be satisfied by the still-running Walk-to-neighbor path before Digit5 takes effect.
   Fix: capture player_grounding immediately before pressing Digit5 and compare against that.

6. [godot-browser.mjs:132-151 vs main.gd:6950-6954, main.gd:10853]
   Defect: the snapshot is published at most every 0.5 s (objective_refresh_timer) unless an event triggers it. The asserted snapshot and the following `page.screenshot` can be up to about 0.5 s apart, so the "walking" and "arrived" PNGs are not proven to be the frames that were asserted.
   Fix: either note that the PNGs are visual-only, or wait for `ui_frame` to advance before each screenshot (the pattern already used at lines 51-52).

7. [Input §2 scope statement; main.gd:3841-3847, :4060, :5099, :5391, :5425, :5432]
   Defect: the brief says only elevated performers, the biker and the chef keep the shared person construction. In fact several ground-level characters still get the old broad filled CylinderMesh ring from make_person_node (main.gd:3270-3279): ConcertListener1/2 (y 0.0), MuseumDocent, CounterHost, ClownHornWalker, BlockMayor and FanfareBugler. That is fine if intended, but the scope statement is inaccurate, and the "filled ring = NPC, hollow ring = core" visual language now applies inconsistently to ground-level characters.
   Fix: correct the scope text (smallest change), or apply the grounding to those characters in a later round.

8. [docs/STREET_VIEW_ASSESSMENT.md:19]
   Defect: "`update_camera()` enforces orthographic projection" is false. Projection is set once in _ready (main.gd:1957). update_camera (main.gd:13137-13142) only sets `camera.size` (an ortho-only property), position and look_at.
   Fix: reword to "projection is set once at startup (main.gd _ready); update_camera() drives ortho `size` every frame".
   The other dependency claims check out against source: screen_to_ground_xz `t = -origin.y/normal.y` (main.gd:12769); corridor speed 24 m/s (main.gd:11, :12346) and the web x2.2 multiplier (main.gd:12743); labels with no_depth_test (main.gd:2205, :4500, :6088); collision 1.72 m (main.gd:2521-2522). verify: the Eastshade external link and its wording (not checkable from the repo).

9. [main.gd:2508, :2528, :3259]
   Defect: the 2.15 presentation scale is a literal in two places, and the shadow's local height (0.029) is calibrated against it only in a comment. add_character_grounding runs before the scale is applied (main.gd:2506 then :2508), so it cannot read the scale itself.
   Fix: introduce `const CHARACTER_VISUAL_SCALE := 2.15` and compute the contact y as `GROUND_TOP_Y / CHARACTER_VISUAL_SCALE + margin`. The tests from MUST-FIX 3 then guard it.

OPTIONAL / NICE-TO-HAVE

- [main.gd:3250-3258] The vertex-colored material leaves `vertex_color_is_srgb` at its default. Under GL Compatibility the ring's ink (coat.lightened / ffe866) and the shadow's 0.035 RGB may come out lighter than the same colors through albedo_color on the jacket. This matches the existing light-pool convention (main.gd:4753). Needs a render: check that the shadow reads dark, not grey.
- [main.gd:3251] The ring material is now UNSHADED, where the previous mural_material was lit with emission 0.35 (main.gd:2536-2541). In evening (ambient 0.48, sun 0.42) the yellow player ring and the neighbor rings will look self-lit compared with the scene. Needs a render of godot-*-character-evening.png.
- [ASSUMPTION] Depth precision: the camera has the default near/far (no override found). Orthographic depth with a 24-bit buffer resolves about 0.24 mm, so the 2.35 mm shadow-to-ribbon gap is fine. On a 16-bit depth target, the existing 0.01-0.035 street layers would already z-fight, so this round adds no new risk. verify: the depth format of Godot's WebGL2 render target.
- [main.gd:3238, :3258] With inner_radius 0.0, half of each segment's triangles are zero-area (48 per shadow, times 6). This is harmless; a triangle fan would halve the count.
- [main.gd:3272-3278] For configured characters, make_person_node allocates a CylinderMesh and a mural_material that add_character_grounding immediately throws away (6 of each). This is harmless.
- [study_test.gd:100-101] The shadow-gradient check depends on the vertex emission order inside character_ground_mesh (vertex 0 = inner, vertex 1 = outer). It is fragile if the mesh builder is reordered. Assert min/max alpha over the array instead.

CUT THESE (over-engineering)

1. [study_test.gd:1575] "contact shadow stays flat while the character turns". This is a tautology for a Y-only rotation (see SHOULD-FIX 3). It is safe to cut once the `contact.position` invariant replaces it.
2. [study_test.gd:1574] The per-phase shadow y-equality loop over four animate phases. The root-child relationship makes it constant by construction, so one position assertion after animation gives identical coverage. Keep the xz-follows-player half only if the probe actually turns.

Not verified here (no shell): the public/ fingerprint 2a9641a8..., the five gates, the Godot save size limit of 4096 or less, and non-ASCII font coverage. The lines I read in this round's added code (main.gd:3229-3264, :10751, :10777) are ASCII.
