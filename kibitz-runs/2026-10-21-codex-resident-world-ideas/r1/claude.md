TOOL CHECK: PASS (read input.md, godot/main.gd, godot/rhythm_circle.gd, public/hosting.js, tests/godot-browser.mjs successfully)

VERDICT: yes-with-fixes. The direction (give the Quiet interval a place in the world) is sound and grounded. But the brief leaves "story and/or quiet" open, ignores browser prior art that already places people according to the Quiet choice, and does not account for how full the 12.6 x 2.5 m curb-lane strip already is. Each of those can sink the slice.

MUST-FIX BEFORE BUILD:

1. [Driver opportunity, "neither has a specific world scene"; Prior-art requirement] The brief misses that the frozen browser already gives the Quiet choice a spatial form. public/hosting.js:74-87 `hostingGuests()` reads `hostedResult(host,'pause') || host.draft.quiet`. `pairs` spreads three visitors toward the ends (`spread` sort), and `arc` clusters them around column 3.5. It also keeps two frontage cells free under the board/panel (line 78). The resident-voiced consequence already exists too: hosting.js:57 ("Thanh arranged ... keeping the through-route open. People could sit, stay standing or leave") and hosting.js:67 (Thanh's "open arc" / "open seat someone could join" lines). The Story choice has no comparable world prior art.
   Fix: the brief should name hostingGuests as the source-local prior art. Godot should port its semantics (clustered vs spread-with-an-open-seat, draft-then-result precedence, through-route kept clear) instead of inventing a new scene vocabulary. Originality is limited to the 3D rendering, not the concept.

2. [Driver opportunity "story invitation and/or quiet interval"] The "and/or" leaves the scope unresolved, and the two halves are not equivalent.
   - Story `memory`/`future` (main.gd:96, 9520-9526) has no browser spatial precedent.
   - Any "memory story" scene risks running into the hard boundary against invented real organizations or current facts.
   - It is also the first default segment (PROGRAMME_DEFAULT_ORDER, main.gd:83), so it competes with the opening layout moment.
   Fix: lock the slice to Quiet interval only and list Story as a rejected or next alternative. See CUT 1.

3. [Hard boundaries "inside the actual authored gathering footprint ... prevent overlaps"] The footprint is nearly full, and the brief offers no placement budget.
   - Bounds: barricades at x=±6.3 (main.gd:7211) and light poles at z=±1.25 (main.gd:7287).
   - Long Table: top spans x≈±4.6 (7230); 16 stools at z=±0.95, x -3.85..3.85 (7236-7240).
   - Open Floor: riser/mic at x≈4.6-5.5 (7263-7266), lettering panel at x=-5.3 (7267), stools at z=-1.05 (7270-7272).
   - Rhythm Circle adds, per layout, a percussionist at x=5.05, listeners at x=±2.2 / z=-1.25 (table) or -0.7 (floor), a drum at x=4.75, and 8 lanterns at y=2.56 / z=1.25 (rhythm_circle.gd:166-205).
   Those Rhythm visitors stay visible for the rest of the afternoon once beats is hosted (`available()` rhythm_circle.gd:212; visibility set at :235). In the default order beats comes before pause (main.gd:83), and programme_issue() forces pause between them whenever beats precedes stories (main.gd:9431). So the Quiet scene will almost always share the strip with the Rhythm visitors. There is no room left for a new "open arc of seats" next to the Long Table.
   Fix: before coding, the brief must list per-layout free rectangles in gathering-local coordinates, plus a test that asserts no AABB overlap with LongTableSet, OpenFloorSet, RhythmVisitors and the barricades. If no rectangle of about 2 x 1 m exists, re-pose or re-use existing stools instead of adding props.

4. [Hard boundaries "copied completed result vs active draft"; "Completed saves should visibly reflect"] The brief does not specify all three world states. Rhythm already defines the pattern (rhythm_circle.gd:214-220: draft while active, otherwise the copied hosted value), and the browser uses `hostedResult || draft` (hosting.js:76).
   Fix: specify exactly:
   - (a) pause not yet reached: hidden, or a neutral state.
   - (b) pause active: draft, refreshed from host_set_quiet. Today host_set_quiet (main.gd:9561-9567) only calls save_godot_state/update_block_ui. Unlike host_toggle_beat (main.gd:9534), it never touches the world.
   - (c) pause hosted: render only the copied `hosting_results` value via get_hosted_segment_value("pause").
   This must also cover browser-imported partial/complete saves (import path main.gd:12906-12933), which have to render with zero writes.

5. [Goal "ambitious, visible ... tangible neighborhood consequences" vs method] The goal and the method pull apart. The creator asks for big, visible consequences. The proposed method swaps between two seating arrangements for a segment that is defined by having nothing to do (public/programme.js:6, "no activity to finish"). Seen from the default orbit camera, the arc-vs-pairs difference may be a few metres of stool shuffling.
   Fix: add a perceptibility acceptance criterion. Native and browser screenshots of arc vs pairs at the default pose, in both layouts, must differ in a region the brief names. The "pairs" branch should show a visibly empty open seat, which is the resident meaning stated in hosting.js:67. If the delta cannot pass that bar, the slice is too small for the stated goal and should say so.

6. [Acceptance "native plus actual mouse/finger/browser"] Actual-input coverage for these branches does not exist. host_set_story and host_set_quiet appear only in godot/main.gd and godot/tests/study_test.gd. tests/godot-browser.mjs has Rhythm coverage but no story/quiet choice coverage. The only native choice control found is the keyboard path cycle_programme_or_hosting_choice (main.gd:9609-9643).
   verify: whether update_block_ui exposes tappable quiet/story buttons in the Godot panel, and where Shift+Z is bound.
   Fix: if there is no tappable control, the slice must include one, inside the existing block panel and with no new hub. The godot-browser.mjs test must tap it, assert the 3D branch difference from the a11y snapshot, and assert byte-identical saves on reload.

SHOULD-FIX:

1. [Scope: visual coherence with later scenes] Civic "circle" format already builds a 4-stool seating group (CivicCircleGroup, main.gd:2974-2999) near Bea (neighbors[0].pos + (3.40,0,-0.45), main.gd:2972). A Quiet "arc of seats" will read as the same prop language one chapter earlier, which weakens both.
   Fix: give the Quiet scene a different visual signature, such as the unoccupied open seat and the kept-clear gap. verify: whether the civic node overlaps the gathering site from compute_gathering_layout_site (main.gd:7188-7196); I did not compute Bea's world position.

2. [Named-resident boundary] The copy credits Thanh with the arrangement (programme.js:6 owner Thanh; hosting.js:57). The 3D scene must not add a second Thanh body. State that attribution comes through existing Thanh speech or the panel line only, and that any seated figures are anonymous visitors (rhythm_circle.gd:171 shows the established "VisitingListener" pattern).

3. [Sound independence boundary] Rhythm visuals read music state (rhythm_circle.gd:225 gates on music_playing, music_volume, music_mode). State that the Quiet scene reads none of these, never ducks or mutes, and has no timer or breathing animation, so the boundary can be tested directly.

4. [A11y] cycle_programme_or_hosting_choice announces raw ids ("Quiet interval seating set to pairs.", main.gd:9633). If the slice touches this path, reuse the human labels from the browser's QUIET_CHOICES (hosting.js:5), and announce the world change rather than the id.

5. [Persistence across segments] The brief should say whether the Quiet scene stays after pause is hosted, as the art panel (main.gd:3130-3140) and Rhythm visitors do. If it stays, the strip accumulates Rhythm plus Quiet plus the layout props for the rest of the session. That makes must-fix 3 binding for every later segment and for the civic and film chapters too.

OPTIONAL / NICE-TO-HAVE:
- The film is titled "The Open Seat" (public/game.js:451). A persistent open seat in the curb lane could pay that off later. Do not build any link now; just avoid contradicting it.
- Once the pause is hosted, a single Thanh memory line (on the model of layout_memory_line, main.gd:7366-7381) gives a resident consequence without adding geometry.

CUT THESE:

1. Story-invitation world scene. It has no browser prior art, carries a fact-invention risk, and halves the budget. The status text is already accurate. It can be cut safely because nothing currently depends on it.
2. The optional camera focus. Rhythm's View Circle and restore logic (rhythm_circle.gd:314, 431-461) is the only proven pattern, and duplicating it adds pose-restore and manual-intent test surface for a static scene. A seating scene in a strip the player already frames does not need it. Cutting it removes a whole class of boundary risk ("no camera takeover").
3. New visiting bodies, if re-posing existing stools plus the empty open seat makes the delta visible. Every new body adds overlap tests against RhythmVisitors in both layouts. [ASSUMPTION] Re-using or re-posing props is cheaper than new bodies; verify against the free-rectangle audit in must-fix 3.
4. Asking for "2-3 concrete enhancements" in a single-pass brief. Keep one alternative per rejected direction, at a paragraph each. Fully grounding three alternatives inflates the report without changing the pick.
