TOOL CHECK: PASS (read godot/main.gd, godot/quiet_seats.gd, godot/bea_invitation.gd, public/hosting.js, godot/tests/study_test.gd, tests/godot-browser.mjs, docs/ROADMAP.md, session_handoff.md). No native run, no default user data touched.

VERDICT: yes-with-fixes. The Shared Panel slice is the right size and is grounded in source. But the brief's main promise ("real active draft updates on the EXISTING portable frame" as a tangible world consequence) conflicts with where that frame actually sits and with "no camera takeover", and it packs in a second mode (completed-save practice) that, by design, has no consequence.

MUST-FIX BEFORE BUILD

1. [Tentative opportunity: "real active draft updates on EXISTING portable frame"]: the spatial premise is broken.
   - The frame is HostingArtTilePanel at MURAL_POS + (2.35,0,0) = about (78.85, -18.7) (godot/main.gd:22, 2950).
   - The gathering, where hosting happens and where Bea's invitation and Thanh's quiet seats render, is centred on nearest_street_point(38,-8) + 3.4 north (main.gd:7207-7223). That is roughly 40 m away.
   - Both sibling scenes drop cutaway/inspection support beyond 30 m from the camera target (quiet_seats.gd:186, bea_invitation.gd:138).
   - So a tile click updates a mesh the player almost certainly cannot see from the hosting vantage. Unless the camera moves, the "visible playable" claim fails. A camera move collides with "No camera takeover".
   - Fix: pick ONE before coding.
     (a) Live draft feedback happens on the 2D editing surface. The 3D frame changes only on the copied result. This is the current visibility contract (main.gd:3138-3148).
     (b) An explicit, player-initiated View for the frame becomes in-scope, not "optional". Model it on rhythm_circle.gd:433-444 (owns_view, Back restores).
   - Recommend (a). It removes the camera question entirely.
   - [ASSUMPTION] The camera stays near the gathering during hosting. verify: the camera target after host_start / advance_programme_and_hosting_step.

2. [Tentative opportunity: "six-target surface"]: no host UI is named, and the existing row cannot hold it.
   - The only hosting choice row is quiet_seats.row: two toggle buttons, reused for stories (quiet_seats.gd:20-49, 111-114).
   - bea_invitation.gd:19 asserts equal choice counts for that shared row.
   - Art needs 6 tile targets plus 2 palette targets.
   - The hub already special-cases height when that row is visible (main.gd:6743-6745), and the handoff pins a 264px dock interior (session_handoff.md:16).
   - Fix: state the surface explicitly. Recommend a focused overlay that reuses the native multi-cell canvas precedent in godot/mural_workshop.gd: focus_canvas_cell / active_canvas_cell / draw_motif (lines 321-394). Open it from Host Activity only when current_hosting_activity()=="art". Close back to the hub.
   - Do not add 8 buttons to the hub row.

3. [Tentative opportunity: "real active draft updates" + preserve tests]: the visibility and refresh contract is unspecified.
   - update_block_3d shows the panel only when art_done (main.gd:3139-3141).
   - host_cycle_tile and host_set_palette never call update_block_3d (main.gd:9601-9620). host_set_quiet does (main.gd:9627).
   - study_test.gd:1037 and :1078 assert the panel is hidden before completion and after reset. :1075 and :1080 assert it is visible after completion.
   - Fix: add a single choice()-style resolver like quiet_seats.gd:100-104 and bea_invitation.gd:47-53: draft while art is active, copied hosted value after, "" otherwise. Drive the panel from that one resolver. List which of those four assertions change and which stay byte-identical.
   - If option 1(a) is chosen, the 3D gate stays exactly as is.

4. [Tentative opportunity: "optional labelled ephemeral practice for completed saves"]: this is scope creep and works against the goal.
   - The stated goal is "tangible world consequences". Practice mode has zero result/photo/award/sequence/key writes by design, so it is a no-consequence sandbox.
   - It needs its own enter/exit state machine, bypasses the inactive setters (main.gd:9602, 9615 guard on current_hosting_activity()=="art"), and must restore on Back/Escape/reload.
   - That is the riskiest part of the slice for the smallest player value.
   - Fix: cut it from this slice (see CUT 1).

5. [Constraints: "normal next save UTF8<=4096 … non-growing visit-only state without misleading copy"]: the existing setters silently drop the save result.
   - host_cycle_tile and host_set_palette ignore the bool from save_godot_state() (main.gd:9610, 9618).
   - save_godot_state returns false without writing when the envelope is over 4096 bytes (main.gd:12098).
   - Tile edits (0..2 in place) and palette edits ("warm"/"cool", same length) never grow bytes. So on an oversized imported profile they become visit-only with NO copy saying so.
   - Fix: when the new surface calls these setters, surface a receipt following set_mural_scene's pattern (main.gd:11768: "Changed for this visit; the save is full."). Do not change the setters' return contract, which the tests at study_test.gd:1074 rely on.

6. [Tentative opportunity: "ShiftZ only cycles cell0 while changing palette"]: preserving it vs. fixing it is undecided.
   - cycle_programme_or_hosting_choice for art calls host_set_palette and then host_cycle_tile(0), but announces only the palette (main.gd:9687-9692). The a11y text is inaccurate today.
   - Fix: decide and state it. Either keep the ShiftZ side effect exactly (legacy) and correct only the announcement, or drop the tile-0 side effect.
   - Separately: keyboard acceptance for six cells must use the overlay's focus traversal (per MUST-FIX 2), not ShiftZ.

SHOULD-FIX

1. [Tentative opportunity: "circle/wave/triangle shapes" on native meshes]: the geometry must be specified, not assumed.
   - Tiles are BoxMesh 0.30×0.30×0.12 at local z=0.02 (main.gd:2964-2969). BoxMesh's default UV wraps all six faces.
   - Smallest fix that keeps the frozen builder as the single source of truth:
     - rasterize build_tile_panel_svg(result) once, using the Image.load_svg_from_string path already used by bea_invitation.gd:89-96;
     - add one QuadMesh child per tile at z ≈ 0.02 + 0.06 + ε;
     - set the per-tile material uv1_scale=(98/360, 98/240) and uv1_offset=(tx/360, ty/240), with tx/ty taken from main.gd:9390-9391.
   - This leaves the box positions and the frozen SVG untouched. tests/godot-browser.mjs:1988-1990 pins byte equality with public/hosting.js tilePanelSVG.
   - verify: which local ±Z face of HostingArtTilePanel faces the sidewalk after rotation.y = atan2(-m_t.y, m_t.x) (main.gd:2951-2952).

2. [Missing concept: resident voice for art]
   - Stories and pause get resident explanations in the hub detail (main.gd:14799-14802). Art falls through to the generic "block party is open" line (main.gd:14803-14804).
   - The browser has Celeste-owned copy for the panel (public/hosting.js:56, 66: "Look for it beside our first mural").
   - The slice title promises "resident-led". Add one Celeste explanation line keyed off the draft and result. No new state needed.
   - verify: whether any native string already references the panel's location by the mural.

3. [Tentative opportunity: originality / prior-art]
   - mural_workshop.gd's MOTIF_IDS are ["sun","wave","rise"] (line 35). The panel's tile values render circle/wave/triangle (main.gd:9392).
   - A six-cell shape editor next to the completed three-motif mural workshop risks reading as a repeat of Mural Stories, which the brief says must stay separate.
   - Name the differentiator explicitly: a two-palette tiling, communal six-hand panel. Give it different framing in the copy.

4. [Brief structure: "Compare 2-3 concrete … recommend ONE"]
   - The brief pre-selects the opportunity and lists no alternatives, so the comparison becomes a formality.
   - Require at least one non-art alternative that already has state hooks, e.g. a resident consequence of the completed programme order visible at the gathering. Judge it on the same "visible from where the player stands" test as MUST-FIX 1.

OPTIONAL / NICE-TO-HAVE
- Once 3D shapes exist, add the art panel to a snapshot like quiet_seats.snapshot / bea_invitation.snapshot (UV-sampled colours). Acceptance can then prove both palettes and all three tile values changed pixels. This matches the existing invitation acceptance style (session_handoff.md:27).

CUT THESE
1. Completed-save ephemeral practice mode. It is safe to cut:
   - there is no durable state, by definition;
   - completed players already see their copied panel (main.gd:3138-3148);
   - it removes the restore-on-Back/Escape/reload state machine and the setter-bypass path entirely.
2. "Optional explicit View subject … across all building collections". Safe to cut if MUST-FIX 1(a) is chosen: no camera ownership changes, so there is nothing to preserve or restore.
3. Treating "copied result afterward" as new work. It already exists: host_complete_current copies palette+tiles (main.gd:9643-9653), and update_block_3d paints the result (main.gd:3142-3148). Only the shape-texture layer (SHOULD-FIX 1) is new there.

RETAINED UNCERTAINTIES
- Camera position/target during art hosting: UNTRACED. I did not follow the camera path through host_start or the hub.
- Whether browser game.js host-tile controls (public/game.js:253-261) set any accessibility or labelling convention that native should mirror: not fully read (the lines are minified/omitted).
- Imported oversized-profile behaviour was reasoned from main.gd:12098 only. Needs driver verification in an isolated save path, per the brief's own rule.
