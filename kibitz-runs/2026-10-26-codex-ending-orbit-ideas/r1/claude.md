TOOL CHECK: PASS. Read godot/habitat_room.gd (1-420), godot/helper_bench.gd (80-104), the relevant main.gd ranges, docs/BIG_ENDING_PLAN.md, godot/project.godot, godot/export_presets.cfg and kibitz-runs/2026-10-26-codex-ending-departure/r3/verification.json. I ran no probes and changed no source.

VERDICT: yes-with-fixes. The seams are mostly grounded, but the brief has four problems at the arc level:
- All three candidates reuse the arranging verb.
- The "revisitable invitation" requirement contradicts the visit-only entry.
- The exits from orbit undo the departure in the story.
- The byte budget and the second render pass are assumed, not measured.
These must be settled before an option is selected.

MUST-FIX BEFORE BUILD

1. [Intended outcome ¶2 + Candidates 1-3] Every candidate repeats one mechanic: a spatial arrangement or orientation choice.
   - The arc already has three such tasks in a row:
     - Helper bench: fit forms and supports (helper_bench.gd, the "fitted" state at :84-86).
     - Habitat: place three copies into four spots (habitat_room.gd:226-240, SPOTS at :8).
     - Departure: fit links by facing, Across/Along/Corner (facing() at habitat_room.gd:54-56, departure_action at :73-87).
   - Candidate 1, "where the spare welcome faces", is the facing()/spare_place() concept a third time (habitat_room.gd:49-56).
   - Candidate 3 is literally the SPOTS map enlarged.
   - The stated emotional goal is that residents remain authors and the place becomes a home (BIG_ENDING_PLAN.md:7, :19). Another placement puzzle does not deliver that.
   Fix: require a non-placement verb for the orbital action. The player walks to a resident and does one social act with them. The visible consequence is where people now are or what they are doing, not where an object sits. Example: Dez starts the copied film at the stand the player walked to, and residents gather and sit at Thanh's copied seats there. Write "no arrangement, facing or fitting choice" into the candidate requirements.

2. [Intended outcome ¶2 "revisitable invitation" vs Seams bullet 2 "VISIT-ONLY", "No new durable model"] The brief contradicts itself.
   - The entry candidate is the final departure panel (mode depart, panel 2, ready). That state is cleared by reset_visit (habitat_room.gd:180-181), which runs on reset, load and import (main.gd:12532, 13036, 13737) and on every fresh launch.
   - After a reload the player must redo the arrangement, Welcome, three links, Ready and Depart before reaching orbit again.
   - BIG_ENDING_PLAN.md:11 says "Once earned, the invitation remains available."
   - copies() and invitation() derive from state that the save envelope persists: film/civic results at main.gd:12494-12504, and hosting results at :12489-12493 via hosted_afternoon.gd:7-19. [verify: get_hosted_segment_value reads only the saved hosting results.]
   Fix: decide now, before choosing among options, between:
   - (a) Gate orbit entry on the durable derived prerequisites (available() and invitation().valid) and render from copies() alone, never from the visit-only `assigned`, `links` or `departure_ready`. This needs no new save data.
   - (b) State plainly "revisitable within this visit only" and remove the "revisitable invitation" wording.
   Option (a) rules out Candidate 3, whose layout depends on the visit-only `assigned` (habitat_room.gd:21, 188-194).

3. [Seams bullet 3 "Back to departure, Back to room, Keep/Escape to block"] Two of the three proposed exits from orbit reverse the story.
   - "Back to room" returns to the pre-launch room, where the credit reads "Speculative room model" (habitat_room.gd:263) and the player can still relocate copies, which clears readiness (habitat_room.gd:231). Rearranging the room on Earth while "in orbit" contradicts the departure the player just saw.
   - Keep/Escape currently announces "Back to the block…" (habitat_room.gd:178), which silently teleports the traveling neighborhood home. That is the very return journey the brief says must not be faked (¶2: "closing a panel must never be called that full return ending").
   - The final departure panel already ends in a meta disclaimer, "The walkable orbital neighborhood, its final gathering and the return journey are still to be built" (habitat_room.gd:96). Orbit would be a fourth stage ending the same way.
   Fix:
   - Give orbit exactly one exit: a diegetic pause, for example a resident line such as "We'll gather here when everyone's settled. Go see the block; this place will wait." Its accessibility status separately states the factual visit/reset boundary.
   - Remove "Back to room" from orbit.
   - Allow "Back to departure" only as replaying the still panels, with no state reversal.
   - Keep the "still to be built" disclosure in the reader/accessibility text, not as the closing beat of the story.

4. [Architecture comparison ¶ "3D SubViewport vs 2.5D"] Neither option states its render and ownership cost, and the two have opposite hidden assumptions.
   - 3D SubViewport:
     - No SubViewport, World3D or own_world_3d exists anywhere in godot/. The only Camera3D and WorldEnvironment are the street's (main.gd:1962, 2055).
     - The renderer is gl_compatibility on desktop and mobile (project.godot:17-18).
     - main._process keeps running update_people_animation, tree sway and eatery animation while any modal is open (main.gd:14292-14313). The street camera keeps rendering behind HabitatRoom's opaque full-rect shade (habitat_room.gd:103).
     - A SubViewport therefore adds a second 3D pass on web phones. Neither the 390x667/320x667 acceptance nor anything else in the brief checks frame time. [ASSUMPTION: no existing phone frame-time measurement; verify in the departure verification artifacts]
   - 2.5D inside HabitatRoom:
     - texture() rebuilds a full SVG and rasterizes it per state key, with a 4-entry cache (habitat_room.gd:321-349).
     - A walking actor therefore cannot be part of that SVG. It must be a separate Control/Node2D overlay on a static backdrop, positioned through art_rect (habitat_room.gd:381).
   Fix:
   - Add to the comparison: whether street 3D rendering is suspended while orbit is visible, and how that is done without touching the camera owner.
   - Add a phone frame-time acceptance item.
   - For 2.5D, require a static backdrop plus a non-SVG actor layer.

5. [Measured limits ¶1] The 24 KiB slice aim is a guess against a hard 39,660 B remainder (2,097,152 − 2,057,492; verification.json:149).
   - HabitatRoom, a static room with no movement, is about 420 dense lines.
   - A walkable chapter adds movement, bounds, stops, input ownership, an actor layer, residents and a consequence.
   - Spending 24 KiB leaves about 15 KiB for both the final gathering and the return journey, which BIG_ENDING_PLAN.md:19 describes as a full stage with three end options.
   - export_presets.cfg:6-7 does not set script_export_mode. [verify: the effective GDScript export mode (text vs binary tokens) and so the real cost per source byte]
   Fix: before selecting an option, record the measured PCK deltas of commits 0dbee76 (habitat) and a808bce (departure) from their verification artifacts. Derive the orbit budget from them. Reserve a named byte floor for gathering and return. State which visual ambition is dropped if the measured slope does not fit. The most likely candidate to drop is the separate 3D world.

SHOULD-FIX

1. [Seams bullet 5 / Intended outcome "residents present as authors"] Resident identity continuity is missing.
   - make_person_node (main.gd:3403-3526) does not draw signature props. Those come from attach_neighbor_signature_prop (main.gd:2417), and Bea's rollator is one of them (main.gd:2422).
   - The 2D keepsake renderer encodes the same identity: rollator for Bea and headphones for Dez (main.gd:9602-9619).
   - The brief names only make_person_node as a reuse candidate.
   Fix:
   - Name the identity source for the selected option: make_person_node plus attach_neighbor_signature_prop in 3D, or the keepsake guest SVG data in 2.5D. [verify: attach_neighbor_signature_prop has no street-global side effects]
   - Require a step-free walkable layout with widths and stops reachable by Bea with her rollator. A neighborhood "traveling together" that cannot hold its own resident is incoherent.

2. [Intended outcome / BIG_ENDING_PLAN.md:19] The terms "final gathering" and "return" already mean different durable things in the code:
   - gathering_layout is saved (main.gd:12476).
   - The epilogue's "returned" means returning borrowed loans (main.gd:12480-12484). It is surfaced to players as "Return %s … returned" (main.gd:6140) and "Return Gear" (main.gd:6537).
   Fix: reserve distinct identifiers, accessibility wording and any future save keys (for example orbit_*) in this slice so later stages do not collide with or misreport the existing epilogue.

3. [Defining genuine local movement ¶] The input model is unspecified.
   - The brief correctly forbids walk_step and walk_to_point (main.gd:8290, 8787). It does not say whether orbit uses free directional movement with collision, or tap/Tab-to-destination with visible traversal.
   - Free movement collides with the reader's arrow-key ownership (habitat_room.gd:389). It also overlaps the held-key and release_pending machinery (habitat_room.gd:169-171, 183-186; main.gd:14319) and touch-pad space at 320px.
   - Destination traversal maps naturally onto the existing 44 px button and focus ring (habitat_room.gd:296-299) and still shows real walking.
   Fix: pick destination-based walking as the default. Add bounded directional input only if measured bytes allow. Define "genuine" as actual input causing visible actor traversal between at least two distinct stations.

4. [Final acceptance ¶ "3 genuine orbital journeys"] These are undefined.
   Fix: specify each journey:
   - real entry through the actual departure UI;
   - a real-input walk to at least two stations;
   - the resident act;
   - a pixel-verified consequence;
   - exit plus re-entry showing what survived;
   - one reload or successful import showing what reset.
   Run the three at 1100x760, 390x667 and 320x667, matching the departure triplet.

5. [Primary prior art] The three external titles cover theme, not the hard problem: a walkable vignette inside a modal overlay that works with touch and a screen reader.
   Fix: add the game's own phone walking and overlay patterns as internal prior art to reuse or avoid: layout_walking_controls_and_hub (main.gd:6907) and the HabitatRoom/HelperBench sibling-hiding pattern (habitat_room.gd:159-165; helper_bench.gd:80-95). Also state the BIG_ENDING_PLAN.md:34 originality limit explicitly.

OPTIONAL / NICE-TO-HAVE
- Clarify "universal still framing" as a fixed local camera where only actors move. Otherwise walking itself reads as a violation of the still-panel promise in the departure stage.
- The brief's line citations have drifted by about 2-10 lines: handle_input is at :385, not :375; snapshot at :400, not :390; relocation reset at :231, not :215. Fix them before this brief is used as the grounding map for r3.
- A one-window commons can deliver the Earth view as a backdrop without a second bay.

CUT THESE
1. Candidate 3 (four-place courtyard). It enlarges the SPOTS map, repeats the placement verb (MUST-FIX 1) and depends on visit-only `assigned` (MUST-FIX 2). Its one good idea, residents active at authored locations, folds into Candidate 1.
2. Candidate 2's second bay and connecting corridor. They double the layout, bounds and screenshot surface at three sizes for no extra authored consequence, and the brief already flags "thin corridor plus text panels" as the risk. Use a single commons with an Earth-facing window instead.
3. "Back to room" from orbit (MUST-FIX 3). It is safe to cut because the room stays reachable from the helper bench (helper_bench.gd:89-95), so no capability is lost.
4. Free-roam collision physics (a CharacterBody or custom walkability). Nothing in the brief needs collision: no hazards, no timers and no chase. A bounded destination path meets "genuinely walkable" at a fraction of the bytes and input-ownership risk.
5. Any durable orbital achievement or flag in this slice. The brief already says it would need a new schema design. Cut it explicitly so the visit-only boundary is not re-argued during implementation.
