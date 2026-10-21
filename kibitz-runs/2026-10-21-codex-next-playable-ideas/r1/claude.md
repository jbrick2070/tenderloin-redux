TOOL CHECK: PASS (read r1/input.md, godot/main.gd, docs/BUILD_STATUS.md, session_handoff.md, docs/ROADMAP.md, docs/CONCEPT.md, artifacts/small-activity-next-walking-info-520x360.json).

Section ids below refer to input.md paragraphs: P1 (scope line 3), P2 (baseline/authority line 5), P3 (read list/shipped list line 7), P4 (ideas + mural + Info comparison line 9), P5 (per-idea requirements line 11), P6 (hard invariants line 13), P7 (output line 15).

VERDICT: yes-with-fixes. The brief is broadly coherent, but it rests on two premises that are wrong or unanchored in the source (reduced-motion, and mural "completion" as a composition outcome). It also leaves a layout comparison and a duplicate composition system unresolved, so the round could slide back into a UI-only change.

MUST-FIX BEFORE BUILD

1. [P5] False premise: "sound/reduced-motion preferences". The Godot build has no reduced-motion preference. A search for reduce.?motion / prefers-reduced-motion / matchMedia under godot/ returns zero matches. The only implementations are in public/game.js, public/world.js, public/gathering.js and public/style.css, and the brief freezes public/ (P6). Existing Godot motion (celebration_burst_node, godot/main.gd:5691-5717) is not gated by any preference. As written, the acceptance criterion cannot be met or tested.
   Fix (smallest): replace it with "add no new looping or continuous animation, and keep any new one-shot cue behind the existing independent Sounds toggle". Alternatively, scope a Godot reduced-motion preference as its own explicit item. Do not leave it implied.

2. [P4] Wrong premise about what "composition" means in the game today. Completion is a count, not an arrangement: update_mural_3d sets mural_completed = mural_placements.size() == MURAL_MOTIFS.size() (godot/main.gd:3238). Block readiness checks size too (godot/main.gd:8901, 12285, 12775). Where motifs sit matters only to the keepsake photo and its SVG (take_keepsake_photo freezes col/row, godot/main.gd:8983-8986; SVG plots them, godot/main.gd:9150-9162).
   So a better cell picker by itself is a controls/layout change with no new world consequence. That is the "endless layout polishing" the creator steered away from (BUILD_STATUS.md:6).
   Fix: require every mural idea to name one observable consequence of the arrangement, using an existing hook only. Examples: Celeste's or a neighbor's reply reads the actual col/row, or the opened block's 3D display reflects it. Reject mural ideas that only change how cells are reached.

3. [P4/P5] Unnamed duplicate. The brief says "do not select duplicated functionality" but does not say that a second grid-composition activity already exists. The hosting "art" step has a six-tile panel plus a palette: host_cycle_tile (godot/main.gd:9477-9488), host_set_palette (godot/main.gd:9490-9496), and the result is persisted (godot/main.gd:9517-9527). It is described at ROADMAP.md:49 as a "six-tile original panel/palette".
   A mural composition upgrade shares that loop: tap a cell, cycle, pick a palette.
   Fix: add an explicit line that ideas must differ from hosting art in what the player does, not only in where it happens. Otherwise the driver should prefer a non-grid idea.

4. [P4] The mural candidate is framed around the wrong gap. CONCEPT.md:43 and :53 put the weight on motifs that neighbors contribute and on lettering. Snapping already exists in effect: there is a 6x3 integer grid with collision checks (is_valid_mural_cell / cell_occupied_by_other, godot/main.gd:11511-11521). In Godot, though, all three motifs are buttons on Celeste's panel (godot/main.gd:14570-14572), and no other resident contributes anything. The brief's own value criterion, "residents visibly contributing" (P4), points at this gap, not at snapping.
   Fix: restate the mural candidate as "who contributes which motif, visibly". Keep MURAL_MOTIFS fixed at three, because adding motifs breaks hard-coded counts (see 5).

5. [P6] Hidden assumption that "reuse the actual state model" stays cheap if the motif set grows. Many places assume exactly three motifs:
   - size==3 checks at godot/main.gd:8901, 8907, 8972, 12285, 12501, 12775;
   - the full-dictionary requirement in validate_mural_dict (godot/main.gd:11843);
   - the keepsake SVG, which has a hard-coded renderer per motif (godot/main.gd:9157-9162).
   Fix: add an invariant: "MURAL_MOTIFS and the keepsake mural schema stay unchanged; any contributor or attribution data goes in a separate optional key validated on load." Saves are currently 1728 bytes (BUILD_STATUS.md:9), so the 4096-byte budget leaves room.

SHOULD-FIX

1. [P4] The expanded-Info comparison works against the round's goal. The 31px scene with full body = False (artifacts/small-activity-next-walking-info-520x360.json: play_area.height 31, header_details_expanded true) appears only after the player deliberately opens Info. BUILD_STATUS.md:12 already lists "deliberately expandedInfo fullbody" as unaccepted, and P4 itself says the text and actions remain reachable.
   Fix: drop it from the head-to-head ranking. Keep it as a backlog item, so the 2-3 ideas are not judged against a layout baseline.

2. [P4] The brief says "Add/Move/Clear UI mostly shifts right". It is "always", not "mostly". Every player-facing path calls move_active_motif(1, 0):
   - the Shift button (godot/main.gd:14576);
   - key 9 (godot/main.gd:13614);
   - re-pressing a placed motif via activate_or_advance_motif (godot/main.gd:11568).
   Moving through all cells is row-major with wrap-around, so reaching a given cell can take up to 17 presses.
   Separately, move_active_motif already accepts any (dcol, drow) (godot/main.gd:11570). Up/down/left moves therefore need only new buttons/keys, not new rules. Say so, so the driver sizes this as small. Note the key budget: 1-5 are neighbors and 6-0 are the mural (godot/main.gd:13593-13617), so direction keys must not collide.

3. [P4] Late-game reach. Clear is locked once block_opened (godot/main.gd:11620), and the keepsake freezes the arrangement (godot/main.gd:8983). A mural-only improvement mostly affects the opening minutes. Players in the later hosting/civic/film content get nothing from it.
   Ask the ideas to say which chapter they improve, and prefer ones that also pay off after the block opens.

4. [P2] Authority is partly stale. The ROADMAP.md:7 paragraph about AGY as sole writer is correctly flagged. But ROADMAP.md:5 also still says "Keep one independent Kibitz partner per implementation round", while the current policy is two separate passes, r1 and r3 (BUILD_STATUS.md:6). Flag both lines, or the next brief inherits the conflict.

5. [P5/P7] "Ranked by player value": no player evidence exists. BUILD_STATUS.md:12 lists physical phones, human comfort and pacing as absent, and ROADMAP.md:22 notes playtesting is outstanding. Ranking is therefore reviewer judgment. Require each idea to name one cheap observable proxy, such as a reachable state change visible in a capture, instead of claiming player value.

6. [P1/P7] Same-agent selection. Codex writes the brief, selects the idea, implements it, and judges it (P1, P7). Require the selection rationale, including why rejected ideas lost, to be written down before editing, so the r3 reviewer can check it against this r1 report.

OPTIONAL / NICE-TO-HAVE
- State the "104+Node" gate's relevance. verify: whether the Node tests exercise any godot/ code or only the frozen public/ track. If only public/, the gate guards nothing for this change.
- Define what "ambitious" means for this round, e.g. at least one new world-visible state change saved through the existing save envelope (build_save_envelope, godot/main.gd:11661).

CUT THESE
1. [P5] Requiring "prior-art considerations" for each idea. It invites unverifiable novelty claims, and the "no copied assets" rule is already enforced by P6. Safe to cut.
2. [P4] The detailed restatement of what place_mural_motif already validates. It is CONFIRMED against godot/main.gd:11536-11557, but it nudges reviewers toward the mural before they compare alternatives. The single pointer "mural rules live in place_mural_motif" is enough.
3. [P5] Listing the three browser viewports and the per-input acceptance matrix inside an idea pass. They are implementation gates (P6 already lists them). Repeating them makes reviewers spend effort on layout instead of on the idea. Keep only the requirement for 44px targets and full action labels.

CLAIM STATUS (P3/P4/P6 spot checks)
- CONFIRMED: the stale scheduler paragraph at ROADMAP.md:7.
- CONFIRMED: a 6x3 board (godot/main.gd:23-24).
- CONFIRMED: three motifs (godot/main.gd:43).
- CONFIRMED: placement validates cells and collisions, saves, updates 3D, and tracks completion (godot/main.gd:11536-11557, 3237-3257).
- CONFIRMED: the expanded-Info artifacts exist, with play_area height 31.
- CONFIRMED: tours shipped (tour_total 12 in the artifact JSON).
- MISREAD: "mostly shifts right" should be "always" (SHOULD-FIX 2).
- MISREAD: completion reflects composition (MUST-FIX 2).
- UNVERIFIABLE here: the public/ fingerprint value (I did not hash it); the 104 Node test count.
