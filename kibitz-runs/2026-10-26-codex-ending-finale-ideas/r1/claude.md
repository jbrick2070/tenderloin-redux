TOOL CHECK: PASS (read godot/orbital_commons.gd, godot/habitat_room.gd, godot/helper_bench.gd, godot/main.gd excerpts, docs/ENDING_FINALE_BRIEF.md, docs/BIG_ENDING_PLAN.md, session_handoff.md excerpts, r1/driver_anchor.md, r1/scope_receipt.md). No web access was used; the three prior-art URLs in "Prior art checked against primary sources" were NOT re-verified by this reviewer.

VERDICT: yes-with-fixes. The candidates are buildable on the existing seams. But the brief never fixes the order of gathering -> completion -> options -> journey home, never decides whether the chapter is "real" or "imagined", leaves "View the memories" and "Explore the habitat" undefined, and its byte budget is probably too small for the scope, judging by the measured orbital growth.

MUST-FIX BEFORE BUILD

1. [Player outcome, para 1 vs BIG_ENDING_PLAN.md "Playable arc" step 5] The arc's order contradicts itself. The brief says "Then provide an authored journey home ... and working Return to the Tenderloin / Explore the habitat / View the memories options", which puts the journey BEFORE the three options. BIG_ENDING_PLAN.md:19 offers the three options after the gathering's acknowledgment. If the journey home plays first, "Explore the habitat" afterwards is incoherent, because you are already home. It also leaves no clean moment for completion to happen.
   Fix: fix one sequence and state it. Recommended:
   - deliberate gather
   - per-place resident acknowledgments
   - deliberate final response, which is the COMPLETION INSTANT
   - a 3-option menu
   "Return to the Tenderloin" then runs the authored still return panels, with Next/Skip parity like departure (habitat_room.gd:218, 302). Its last explicit step calls the existing close_room restoration with its own announcement. "Explore" stays in the commons. "Memories" opens a recap and comes back to the menu. With this order, Escape/Pause after the completion instant cannot "grant" completion, because completion has already happened by a deliberate action. Escape during the return panels stays Pause (orbital_commons.gd:209, pause_chapter:101-102). State that rule explicitly.

2. [Player outcome; "journey home" wording] The fiction's frame is never settled. The existing source frames the chapter as shared imagination: habitat_room.gd:288 says "Copies travel in our imagination; originals, borrowed things and home stay on the block", and orbital_commons.gd:144 says "this fictional chapter waits". BIG_ENDING_PLAN.md:7 says "a new home carrying memories of the old one". The brief's "authored journey home" reads as literal transport back. The return panels' content depends entirely on which frame holds: do residents also come home, or are we leaving an imagined future? [ASSUMPTION] Bea/Thanh/Celeste/Dez also exist as street residents (verify: main.gd neighbor ids). If they do, a literal frame duplicates them.
   Fix: one sentence in the brief choosing the frame. Recommended: "the imagined future chapter closes and the neighbors are back on today's block." This is consistent with :288 and with the "no real launch" invariant. Write all return captions against it.

3. ["View the memories" and "Explore the habitat", Player outcome para 1] Neither has any definition, and neither exists in source. A grep for "memories", "Explore the habitat" and "Return to the Tenderloin" across godot/ finds no such view. "Memories" also collides with existing systems: main.gd has neighbor_memory_tail()/layout_memory_line() (main.gd:7691, 10637), and there is a DURABLE street epilogue (keepsake_photo / epilogue_packing / epilogue_returned saved under "epilogue" in build_save_envelope, main.gd:12480-12484, plus loan_homecoming.gd "returned carrying kits"). The brief never says whether orbital "memories" includes, excludes or is separate from that keepsake photo and those returned loans. "Habitat" collides too: HabitatRoom is the block-side room model, while the walkable place is the "orbital commons".
   Fix:
   - Define Explore = the existing walk mode with the post-gathering arrangement kept, plus a visible completed marker.
   - Define Memories = a read-only recap state inside the existing OrbitalCommons reader. It reuses copy_textures (orbital_commons.gd:83) and this visit's acknowledgments, and adds no new modal or media.
   - State explicitly that it does not read or write keepsake_photo/epilogue.
   - Rename the button "Explore the commons", or note the alias.

4. [Candidate 1; orbital_commons.gd:264] "Brings all four residents" rests on a false picture of the scene. Celeste, Dez and Bea are static figures drawn at fixed points: Celeste (82,326), Bea (88,382), Dez (640,326). Only Thanh has a path (thanh_path, :236-240). Celeste and Bea already stand about 70px from the Art destination (154,310), and Dez stands beside Film (562,330). So a gathering at Art barely changes the picture for two of the three, while Film and Seats change a lot. The "readable gathering arrangement" requirement is not met evenly across the three choices. Also, route() (:104-113) only recognises segments from JUNCTION to its listed endpoints. The residents' start points are not on any of those segments, so routing them would cut diagonally across the floor away from the drawn path (:258). That is the "new endpoints need clear-path justification" problem multiplied by three, and one of the walkers is Bea with her rollator.
   Fix: author three explicit gathered arrangements (positions per place) that are visibly different from the baseline at EVERY place. For example, at Art, Dez crosses over and Bea turns to face the copy. Pick ONE movement model:
   (a) Recommended: Thanh walks as he already does, and the other three arrive through one captioned still beat ("A little later, everyone has gathered by ..."). The still path and the moving path then share the same consequence by construction, and moving()/halt() test growth stays limited to existing actors.
   (b) Three new resident paths. This needs new route endpoints, intermediate-position tests and interruption/re-entry tests for each.
   The brief currently implies (b) without costing it.

5. [Candidate 1 "After any completed shared view"; orbital_commons.gd:125-137] Eligibility is unclear. `shared` holds only the current share. invite_thanh sets shared=-1 the moment a new share starts (:127), and walk_to does not clear it, so the player can stand somewhere other than `shared`. "Any completed shared view" is therefore not a fact the code keeps.
   Fix: state the gate in terms of existing state. Recommended: "Gather here" is enabled only when reached==shared, not moving() and sharing<0, and the gathering place is `shared`. This keeps "arrival never invites" and needs no history flag. Also update the existing contract text at :137 ("this shared moment does not start the final gathering").

6. [Measured budget and acceptance] The headroom claim is not backed by the project's own data. Departure PCK was 2057492B (session_handoff.md:54), and the frozen orbital PCK is 2074608B (brief), so the orbital commons stage added 17116B. The finale is at least as large in scope: a gathering, 3x4 per-place acknowledgments, return panels, an options menu, a recap view and mode state. Only 22544B remains. At orbital density the finale plausibly uses 15-25KB [ASSUMPTION: same bytes per feature], leaving zero contingency.
   Fix: set a hard production-growth ceiling now. Proposed: <=12000B, which leaves about 10.5KB contingency (verify against the first export). Enforce it with these design rules:
   - extend orbital_commons.gd rather than adding a new script/scene
   - no new SVG builders; return panels reuse the departure tint/texture pattern (habitat_room.gd:354-356) and the cached copy_textures
   - one shared acknowledgment template per resident with per-place clauses, not 12 free paragraphs
   State in the brief what gets cut if export exceeds the ceiling. Memories recap goes first, then the return panels drop from 3 to 2.

7. [Grounded seams, HabitatRoom bullet; habitat_room.gd:171-184, 99, 288; orbital_commons.gd:144; helper_bench.gd:145] Several "unfinished" texts and announcements must change together, but the brief lists only test text. These player-facing strings all assert the finale is unbuilt:
   - orbital_commons.gd:144 "The final gathering and authored return are still to come"
   - habitat_room.gd:99 ("The final gathering and authored return journey are still to be built")
   - habitat_room.gd:288
   - helper_bench.gd:145 ("The orbital neighborhood and return are still to come"). This one is already stale, since orbital exists.
   - close_room's Pause announcement (:184)
   Fix: list them as required edits in the batch. Specify that the authored return calls close_room(false) and then makes its own bounded announcement, rather than adding a branch to the Pause text.

8. [Reentry, Player outcome para 3] The brief lists five reentry points but no target state for each. Re-entry runs film -> helper bench (helper_bench.gd:89-95) -> open_room -> orbital.refresh when orbital is still visible (habitat_room.gd:273-275). After "Return to the Tenderloin", the room would reopen straight into the orbit unless return changes that. Every visit-local fact needs an explicit state: gathered, completed, menu, return-panel index.
   Fix: add a 5-row table to the brief: entry point -> mode/panel on reopen -> focus -> what is retained. Recommended:
   - after return: reopen at the commons in "completed/Explore" with no movement, not the departure panel
   - mid-return: reopen at the same panel (mirrors departure_checks.gd:64)
   - partial gathering: reopen stopped, with Gather re-enabled only by deliberate input
   - reset/relocation clears all of it through the existing orbital.reset_visit() (habitat_room.gd:44-46)

SHOULD-FIX

1. [Grounded seams, layout bullet; orbital_commons.gd:58-64, 147-152] Three 44px rows already hold seven actions. The brief says "mode-specific controls" but does not name the mode set.
   Fix: declare a single `phase` enum (walk / gathered / menu / return / recap) and a table of which of the 7 existing buttons are relabeled in each phase, following the pattern habitat_room.gd uses (:299-307). No phase should exceed 7 controls or add a 4th row. This also keeps the "seven existing action indices" test contract stable.

2. [Recognition, Player outcome para 3] Recommend visit-local recognition and say so outright, rather than deferring.
   - Reload cannot rebuild the room/orbit (habitat_room.gd:288 text, and reset_visit on load/import at main.gd:12532/13036), so a durable "finale complete" flag would claim an outcome the game cannot show again.
   - save_godot_state refuses envelopes over SAVE_BUDGET_MAX_BYTES (main.gd:12516), and the brief itself says imported optional data can already exceed 4096. A durable flag could therefore fail to persist silently.
   Fix: visit-local only. Name the street-side surface where completion is visible after returning (e.g. the helper bench habitat entry label or a block-panel line via update_block_ui), otherwise "clear completion acknowledgment" is just a screen-reader announcement.

3. [Ownership and accepted baseline] Hidden assumption: the finale is built on an uncommitted orbital overlay whose "later corrections are NOT independently re-reviewed", and the primary browser run is still pending.
   Fix: state the rebase policy if the primary's accepted orbital commit differs from the 239-file overlay. Recommended: diff orbital_commons.gd and habitat_room.gd against the accepted commit before r3 and treat any change as invalidating r3.

4. [Measured budget/acceptance; "No native/browser/export/render jobs while the primary browser is live"] Hidden assumption: a whole connected batch can be written with zero execution feedback until after r3. The 17KB budget risk in MUST-FIX 6 cannot be measured until then.
   Fix: let one export-only size probe run as soon as the primary browser finishes, before r3.

5. [Candidate 1 "deliberate final response"] Specify who gives the final response and that it differs per place. Otherwise the "specific acknowledgments" collapse into the existing response() lines (:133-137), which already do per-place Celeste/Dez/Bea lines.
   Fix: require that each place's finale acknowledgment names a copy fact not already said in response() for that place. For example, Art mentions the open place NAMES[spare_place()], Film mentions the framing label, and Seats mentions Bea's invitation title.

OPTIONAL / NICE-TO-HAVE

- Recommended coherent batch: Candidate 1 (gather at the current `shared` place, with movement model (a)), plus Candidate 3 reduced to its motif only. Bea's existing invitation triangle (orbital_commons.gd:263) moves to the gathered place and is the recurring image in the return panels and the recap. This needs no new composition UI.
- A valid replacement for option 2: "the last look". After gathering, the player picks which of the other two copies the group turns toward for the closing line. That gives one extra deliberate choice and changes the composition without a hosting UI. Only do it if the byte ceiling allows.
- In the return captions, point to the keepsake photo and returned loans as part of "home", without reading their state. That closes the arc toward the street epilogue at zero bytes of save.

CUT THESE

1. Candidate 2 (Host the last orbital afternoon). It is an opening/closing sequencer over contributions, which effectively replays hosting (hosting_order/hosting_results already exist in the save, main.gd:12489-12493). It adds the controls the brief itself flags as a risk, and its "emphasis between contributions" duplicates what candidate 1 achieves by choice of place. Cutting it loses no stated requirement.
2. Candidate 3's "two-sided invitation/memory composition" as a new interactive object. It is a new composition interface and new art, against "reuse assets". Keep only the motif (see OPTIONAL).
3. Durable recognition / any save-envelope change. No stated requirement needs it, it risks the 4096 budget, and it cannot be honoured on reload (SHOULD-FIX 2).
4. Separate memories modal/sibling. HabitatRoom._process re-hides siblings every frame (habitat_room.gd:432-433), so a sibling is unsafe anyway. A recap phase inside the existing child meets "Memories must actually work" at a fraction of the bytes.
5. Walking paths for Celeste/Dez/Bea (movement model (b) in MUST-FIX 4). Cutting them removes three new actors' intermediate-position and interruption test burden and the off-path routing problem. Narrative parity is kept by the captioned still beat.
