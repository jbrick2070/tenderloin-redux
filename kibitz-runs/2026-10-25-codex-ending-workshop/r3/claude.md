TOOL CHECK: PASS
Real reads performed: godot/helper_bench.gd (full), godot/film_screening.gd (full), godot/tests/helper_bench_checks.gd (full), tests/helper-bench-browser.mjs (full), godot/main.gd (7499-7650, 7720-7740, 7844-7857, 9749-9776, 10257-10261, 10415-10449, 12081-12108, 12180-12199, 12510-12534, 13010-13098, 13598-13773, 14072-14187, 14290-14362, 14590-14920, 15990-16047, plus greps), godot/shared_meal.gd 325-364, godot/quiet_seats.gd greps, tests/godot-browser.mjs 20-79, 2100-2153, 2825-2849, godot/tests/study_test.gd 22-25, 3285-3309, 6373-6379.
Not read: artifacts/ending-workshop-20261025 (likely gitignored; ripgrep found nothing there). Every claim about focused2-6 evidence is therefore "verify".

VERDICT: yes-with-fixes. The wiring itself (entry, modal ownership, input guards, reset/import hooks, per-face materials, cache keys) holds up against source. But the one open acceptance item is an observation-contract error for the "paint" face, the post-sample half of the browser journey has never run, and two native checks can't fail when they should.

------------------------------------------------------------------
CONFIRMED (checked against source)
C1. Deliberate entry only. helper_entry is appended after the existing controls (film_screening.gd:70, :172, :224). open_helper does close_screening(false) and then open_bench, falling back to open_screening on refusal (film_screening.gd:125-128). Nothing opens the bench automatically and it has no F-key. Existing index-based viewer tests stay valid because buttons[3] is still Music and buttons[4] is still Back (godot-browser.mjs:2115, :2136).
C2. The helper never writes a save. helper_bench.gd has no save_godot_state or settings call. Its only durable signal is film_phase plus a valid film_result (helper_bench.gd:67-68).
C3. Save semantics differ, as claimed. Native apply_save_envelope resets the bench before parsing (main.gd:13029) and again on every failure path through reset_mural_state_to_defaults (main.gd:12526, :13061-13098). A failed browser import returns before any reset (main.gd:13599-13606; tested at helper_bench_checks.gd:58). A successful browser import replaces film only when the incoming phase rank is higher (main.gd:13713), then resets the visit (main.gd:13729; tested at checks:86, with the bench visible, so "import while modal" is covered).
C4. The world texture cache key "framing:id" (film_screening.gd:206) is sufficient. build_film_frame_svg depends only on framing and shot id (main.gd:9763-9770), so changing the plan cannot leave a stale texture.
C5. No shared-material aliasing. game.material() returns a new StandardMaterial3D on every call (main.gd:7844-7849), so the six faces carry independent albedo_texture.
C6. The camera is orthographic (main.gd:2055). The test's screen-space bilinear corner interpolation (helper-bench-browser.mjs:58) is therefore exact. A perspective sampling error is ruled out as the cause of the ink failure.
C7. Setup order. helper_bench.setup (main.gd:16038-16040) parents to layout_table_node/layout_floor_node, which build_gathering_layouts creates (main.gd:2047, :7526, :7564). shared_meal uses the same nodes with the same ordering (main.gd:16035-16037), which is precedent.
C8. Geometry, computed from source. Table root at x=-5.35: foot spans -5.80..-4.90, rails -5.78..-4.92 (z -0.746..+0.676 at the low 60deg tilt), helper body x -5.50..-5.20, z 0.81..1.09. The table top ends at x=-4.6 (colored_box half-extent 4.6, main.gd:7531). Barricade inner edge is -6.15 (main.gd:7512-7515). Light poles sit at (-5.9, +-1.25) (main.gd:7609-7611). All clear. Floor root at (2.9, 0.06, -0.1): x 2.45..3.35; riser starts at 3.9 (main.gd:7575); meal cloth runs x -3.2..-0.6 (shared_meal.gd:338-339); quiet seats reach at most x 1.4 (quiet_seats.gd:143). All clear.
C9. The held-exit guard sits after the focused-activity guard and before both WASD and Shift+arrow handling (main.gd:14307-14334). WASD movement ignores GUI focus (main.gd:14327-14334), so the native and browser held-W checks (checks:59-62, helper-bench-browser.mjs:54) are not vacuous.

MISREAD / UNVERIFIED
U1. The "PRIVATE browser caller uses a named canonical existing completed profile" from the input's source-contract list. The only caller in tracked source is godot-browser.mjs:2844, which uses the genuine journey with privateFixture=false. verify: where the PRIVATE caller lives (artifacts?) and that its result can't be counted in helperBenchChecks (godot-browser.mjs:3808 requires !privateFixture, which is good).
U2. "New source freshness/hashes." godot-browser.mjs:74-76 compares mtimes only; no hash check is visible in lines 33-77. verify: whether line 81 (an omitted long line) adds hashes.
U3. Player and neighbor standing spots inside the floor or table pocket, and whether walk_step has any furniture collision. Not traced. verify: neighbor gathering positions against the floor root's x 2.45..3.35, z -0.85..0.99.

------------------------------------------------------------------
MUST-FIX BEFORE BUILD

1. [Known unresolved acceptance item; tests/helper-bench-browser.mjs:57-59] The ink check fails because of the test window, not the product.
   Root cause (sample window): the window is u in [.08,.92], v in [.14,.86]. That deliberately excludes the frame's large dark areas. The #253f35 side border covers u<=12/420=.029. The top/bottom border plus letterbox covers v<=(17+17.625)/271.25=.128 (main.gd:9770; film_screening.gd:213).
   Root cause (palette): the ink predicate is r<120 && g<170. Inside the window it matches only #276a5a, because pink #d9a2b2 has r=217, blue #91bac2 has r=145, and paper is #ecebdc / #f3eedf.
   Root cause (paint art): the genuine journey uses close framing and order seat/paint/welcome (main.gd:10261). For shot "paint", the only #276a5a inside the window is the panel outline, stroke-width 3 x 1.2 = 3.6 texels in a 420-texel texture (main.gd:9764, :9769). There is no chair stroke.
   On screen: a 3.6-texel line on a frame W screen-pixels wide is 3.6*W/420 px. Below about 2 px it is bilinearly blended with paper: 50% blend is about (137,170,155), r>120, so it reads as not-ink. Adding mipmaps would blend it further.
   The signature fits: "paint" interior is roughly 90-95% paper (#f3eedf panel inside #ecebdc), which matches the reported 337 paper / 0 ink out of 378 samples.
   No filter, angle or size loop can make ink>3 hold for the paint face at 390/320.
   [ASSUMPTION] that the failing face is "paint". The assert message on line 59 omits face.shot, so focused6 cannot attribute the face.
   Fix (smallest):
   (a) Put face.shot, s.cutaway_additions and the per-face sample histogram in the line-59 message, and push worldInk before asserting, so failing evidence names the face.
   (b) Record this as an observation-contract error. Keep paper>40 and ink>3 unchanged for faces whose source has wide #276a5a strokes ("seat" and "welcome": chair stroke 8x1.2 = 9.6 texels, main.gd:9763).
   (c) For "paint", replace the unattainable ink count with a source-grounded colour check of the same threshold strength. The pink motif circle #d9a2b2 (r 19.2 texels) and the blue stroke #91bac2 (8.4 texels) are both drawn with fill or stroke widths that survive minification.
   (d) Keep the existing distinct-fingerprint idea from godot-browser.mjs:2126 so that three different actual drawings are proven.
   This changes no art, no threshold value and no city geometry.

2. [Sequencing; godot-browser.mjs:2843-2845 and helper-bench-browser.mjs:62-67] The helper journey now sits between verifyFilmScreening and the retained verifyCivicListening, verifySharedPanel and verifyProgrammeStudio. It performs a second real reload (line 64).
   verifyFilmScreening restores the music intent after its own reload (godot-browser.mjs:2151, "test context restores quiet/play intent after the explicit reload"). The helper journey has no equivalent after line 64: quiet is asserted only before the reload (line 55).
   Every run so far aborts at line 59, so lines 61-68 and every downstream retained check have never executed after the new journey, at any size. "Original matrices retained" is unproven.
   Fix: after line 67, add the same restoration as godot-browser.mjs:2151 (compare music_playing with the captured quiet[0] and tap music_toggle_control if they differ). Then require one complete pass beyond line 59 at 1100 before claiming the matrix is retained.

3. [Silent pass; godot/tests/helper_bench_checks.gd:89] HELPER_BENCH_PASS prints unconditionally, with the literal "22layout-size", even when requires have failed. study_test.require only sets failed and push_error (study_test.gd:22-25); it does not abort. cases is printed but never required.
   If the driver gates on the PASS token, a partial or failed run looks green. verify: the driver's gate.
   Fix: add suite.require(cases==22, "all 22 layout-size cases ran"), and print the PASS line only when not suite.failed.

------------------------------------------------------------------
SHOULD-FIX

1. [Footprint check is tautological; helper_bench_checks.gd:68-70] The check compares root.position against hard-coded constants (0.45, 0.746, 1.09). It reads no mesh. If rails, the helper or the upright pose change, it keeps passing. Upright rails at 18deg reach y 1.88 and have a different z extent, and the check never covers them.
   Fix: build the merged AABB from every MeshInstance3D under worlds[li] (get_aabb transformed into layout-node space), once per form (selected 0 and 1). Assert it disjoint from the AABBs of the actual neighbour meshes: LongTableSet/OpenFloorSet sub-boxes, ClosureBarricades, LightPoles, PortableServingCloth, quiet stools after both arrangements.

2. [Held-exit guard can only be shown to block, never to release; helper_bench.gd:103-106, main.gd:14309; checks:59-63; browser :54-55] Neither test proves movement resumes after W is released. A regression that leaves held_on_exit non-empty would freeze walking and still pass.
   Fix: add "release_pending" to snapshot() (helper_bench.gd:283). After key-up, assert it is false, then press W for ~100 ms and assert player_grounding changed.

3. [Browser test can't detect stale frame textures; helper_bench.gd:281 and helper-bench-browser.mjs:45] The snapshot exposes only texture!=null, so the browser test can't see a stale or wrong copied frame. The native test checks identity (checks:66); the browser test cannot.
   Fix: expose the cache key per face ("%s:%s" % [framing, shot], the same key as film_screening.gd:206). Assert it equals `${copied.framing}:${copied.order[i]}` for both layouts.

4. [Helper UI texture memory; helper_bench.gd:172-176] Each entry is 720x480 RGBA with generate_mipmaps, about 1.84 MB, and the cache holds up to 12 (about 22 MB). That is a lot for web/Android. project.godot and main.tscn set no default_texture_filter, so canvas sampling is plain linear and the TextureRect never uses the mipmaps.
   Fix: remove generate_mipmaps on line 174 and cap the cache at 4 (one film needs at most 10 states, and only the current one matters).

5. [Cutaway veil as a secondary ink factor for seat/welcome, only if (1a) shows they also fail] cutaway_material is alpha 0.22 with CULL_DISABLED (main.gd:1940, :7851-7857), so each cut building puts at least 2 veil faces in front of the frame. Starting from #276a5a (r=39) under a lit beige veil (r about 196), r stays under 120 only while 0.78^k > 0.484, i.e. k<=2. Paper stays above 180 at any k. That gives the same "paper high / ink 0" signature.
   Product correction that keeps the occlusion policy (opaque depth is untouched): give the frame materials TRANSPARENCY_ALPHA and a render_priority above the cutaway's, so they composite after the veil. shared_meal dish quads are precedent for transparent unshaded quads (shared_meal.gd:346-348). [ASSUMPTION] Godot 4 sorts the transparent pass by render_priority. Verify with one screenshot, not a loop.

------------------------------------------------------------------
OPTIONAL / NICE-TO-HAVE
- helper_bench.gd:254 swallows every key echo while the bench is open. Holding Tab or an arrow key won't repeat focus traversal or reader scrolling, which film_screening allows. Consume echo only for the keys the bench handles.
- main.gd:14619-14621 returns before the phone_primary_transition release handling (main.gd:14632-14634). If the bench can open mid-transition, the deferred finish is skipped until the next release. verify reachability; if reachable, move the bench branch below that block.
- A successful browser import that leaves film_result unchanged still wipes a finished arrangement (main.gd:13729). This is consistent with shared_meal and before_streets and is tested on purpose (checks:86), but it contradicts the closing copy ("stays this visit", helper_bench.gd:98). Either mention import in that copy or reset only when JSON.stringify(film_result) changed.
- The completed Low UI illustration scales frames non-uniformly (sx .46, sy .32, helper_bench.gd:163-164): 2.56:1 against the natural 1.78:1. If that is meant as tilt foreshortening, say so in description(). Otherwise the "matching UI illustration / natural aspect" claim is false for Low.
- helper_bench.gd:286 runs update_world() every frame even while hidden, including JSON.stringify(film_result) twice. That is cheap, but a cached signature updated by reset/finish/choose_form would be enough. Keep the visibility recheck for active_story_episode toggles.

------------------------------------------------------------------
CUT THESE
1. generate_mipmaps on the UI picture (helper_bench.gd:174). It is unused by the 2D canvas (see SHOULD-4), so removing it changes nothing visible.
2. Snapshot corner unprojection for hidden layout roots (helper_bench.gd:273-282). Six faces and 24 corners are computed on every a11y flush, but the tests read only the visible root (helper-bench-browser.mjs:56). Emit frames only when worlds[li].is_visible_in_tree(), and keep the "visible" flag for both roots so the one-visible-layout assertion (browser :55, checks:65) still holds.
3. The 12-entry UI texture cache, down to 4. It holds more states than one film can produce.

Not cut: the per-layout duplicate world roots. They are cheap, they mirror the shared_meal and quiet_seats precedent, and they are needed for the one-visible-layout check.
