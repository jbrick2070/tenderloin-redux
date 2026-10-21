TOOL CHECK: PASS (read godot/mural_workshop.gd, godot/mural_signature.gd, godot/main.gd, godot/rhythm_circle.gd, docs/ROADMAP.md, docs/ASSETS.md, tests/godot-browser.mjs via file tools).

Section ids below refer to paragraphs of input.md by line: P1 = input.md:3 (creator steering), P2 = :5 (scope/lock), P3 = :7 (current contract), P4 = :9 (vignettes + save rules), P5 = :11 (reading/rights rules), P6 = :13 (slice + acceptance).

VERDICT: yes-with-fixes. The brief is honest about the current three-motif contract. But it leaves out four constraints already in the code, and any one of them would wreck a naive scene implementation: (1) byte-parity with frozen public/keepsake.js; (2) MURAL_MOTIFS is used as the completion denominator in about 20 places; (3) the strict validators wipe the whole save on unknown mural keys; (4) the schema-less `optional` bag is allowed to exceed the 4096 B budget. It also asks for "pixel acceptance" of recognizability, which pixel checks cannot prove.

MUST-FIX BEFORE BUILD

1. [P3, P4 "copied-photo semantics", P6 "frozen-photo behavior"] The brief doesn't mention that the Godot keepsake SVG is byte-locked to the frozen browser file.
   - tests/godot-browser.mjs:1344 checks the exported SVG with `assert.equal(exportedKeepsake.exported?.svg, postcardSVG(savedPhotoForParity))`.
   - tests/godot-browser.mjs:1419-1429 also checks the build_keepsake_svg sample against public/keepsake.js postcardSVG byte for byte.
   - P5 forbids modifying public/. So drawing any cooking or graffiti scene into build_keepsake_svg (main.gd:9151-9232), or adding scene data to keepsake_photo, fails a required gate, and the only fix (editing public/keepsake.js) isn't allowed.
   - FIX: add a stated rule. "The M1 keepsake photo/SVG stays three-motif and byte-identical; scenes never enter keepsake_photo or build_keepsake_svg." If the creator wants scenes in a keepsake, make it a separate Godot-only artifact in a later round, with its own filename and its own test, not the M1 postcard.

2. [P3, P4 "existing strict-three contract must remain valid"] The brief states the goal but not the architectural rule needed to meet it. MURAL_MOTIFS (main.gd:43) is the completion denominator everywhere:
   - main.gd:3244 (mural_completed)
   - main.gd:8926 (block-open readiness)
   - main.gd:8997 (photo gate)
   - main.gd:12469 and 12963 (load and browser-import open gate)
   - main.gd:14397, 14515 and 14609 (the "3/3" UI strings)
   - The browser workshop also hard-codes `["sun","wave","rise"]` (mural_workshop.gd:33, :90, :189).
   - Adding scene IDs to MURAL_MOTIFS turns completion into 4/4 or more. Legacy 3/3 saves would then fail to reopen the block, and take_keepsake_photo would refuse.
   - FIX: state that scenes live in a separate constant and collection (e.g. MURAL_SCENES / mural_scenes). They never count toward completion, never gate block_opened, and never appear in mural_placements.

3. [P4 "explicit backward-compatible design, validators"] The brief doesn't warn that the current validators fail closed and wipe the whole save.
   - validate_mural_dict rejects any key not in MURAL_MOTIFS (main.gd:12003-12004).
   - On save load, that failure calls reset_mural_state_to_defaults("recovered") (main.gd:12464-12467).
   - For the photo, validate_godot_epilogue rejects (main.gd:12094-12096), which also resets the save (main.gd:12472-12475).
   - The photo is rebuilt from known keys only (main.gd:12097+), so an extra `scenes` field inside the photo is silently dropped on reload. That is exactly the "unverifiable persistence" the brief forbids.
   - FIX: require scene state as a new top-level envelope key with its own validator. Follow the existing additive precedent for discovered_surprises (main.gd:12539-12545: "Additive optional field: gracefully filters unknown entries rather than hard-resetting v1 saves").
   - An invalid scene entry must be filtered, never trigger a reset. Add a study_test case showing that a v1 save without the key, and one with a malformed key, both keep full M1-M4 progress.

4. [P4 "no silent v1 writes"] This clause contradicts the version gate and the repo's own precedent.
   - apply_save_envelope accepts only `version == GODOT_SAVE_VERSION` (main.gd:41, :12404-12407). Bumping to v2 means any older build loading a v2 save resets everything to "recovered".
   - The established pattern is additive keys inside v1 (main.gd:12539-12540, which explicitly accepts "Forward-only compatibility").
   - FIX: the brief must say which one it means:
     - (a) additive key under v1, documented as forward-only (a downgrade drops scenes but keeps progress); or
     - (b) a version bump, with an explicit multi-version accept path and a test showing that the older build's reset is acceptable.
   - Recommend (a). Reword "no silent v1 writes" to "no undocumented v1 writes."

5. [P4 "<=4096-byte evidence"] The brief doesn't rule out the obvious shortcut, which bypasses the budget.
   - `optional` is free-form, with no schema (validate_godot_optional, main.gd:12373-12379).
   - It is capped at OPTIONAL_SAVE_MAX_BYTES = 8192 (main.gd:162), double the total SAVE_BUDGET_MAX_BYTES = 4096 (main.gd:104; asserted at tests/godot-browser.mjs:1411).
   - Scenes stored there would pass load validation, have no ID or occupancy checks, and could push the envelope past 4096. Only the end-of-run perf probe (main.gd:11137-11162) would catch it.
   - FIX: forbid storing scene state under `optional`.
   - Require a measured worst-case envelope: all M1-M4 complete, all surprises, maximum scenes, AND an imported browser `optional` payload. Report the byte count before and after.
   - verify: the current worst-case save_bytes is not recorded in input.md. The implementer must measure it.

6. [P4 "readable canvas stays primary", P6 "recognizable rendered art"] Single-cell scenes won't be readable at phone size, and multi-cell scenes conflict with the occupancy model.
   - Mark area is the cell rect minus (10,14) (mural_workshop.gd:287), then grow(-3) (:318).
   - The canvas is only 136 px tall when short-wide (mural_workshop.gd:228). That's 3 rows of about 45 px, so mark height is about 25 px. [ASSUMPTION: derived from the layout constants; verify via art_snapshot().motifs[].height at 320/390/1440.]
   - A person cooking or spraying a wall at roughly 25-40 px is a pictogram, not a scene.
   - Multi-cell scenes would need cell_occupied_by_other (main.gd:11687-11694) and first_free_mural_cell (main.gd:11696-11707) to know about scenes. Today first_free_mural_cell falls back to (0,0) when no cell is free, which would collide.
   - Scenes in the grid must also never block the three mandatory motifs. Auto-placement through activate_or_advance_motif (main.gd:11732-11741) assumes free cells exist.
   - FIX: choose one of these before build:
     - (a) Scenes live in a separate, non-occupying layer, e.g. a backdrop band behind the 6x3 grid or the existing border strip, so the grid's occupancy and completion rules don't change.
     - (b) Scenes span cells, and a stated invariant guarantees at least 3 free cells for motifs at all times, with a test.
   - Recommend (a).

7. [P6 "acceptance that proves recognizable rendered art"] This is a false premise for automated gates.
   - The existing pixel checks (tests/godot-browser.mjs:58-85) count ink and paper pixels inside reported boxes. They prove presence, contrast and bounds, not that a viewer reads "someone cooking."
   - FIX: split acceptance into two parts:
     - (i) Automated: per-scene ink/paper ratio, bounds, no overlap with the motif boxes, and the scene ID in the snapshot only after real pointer, touch or keyboard input.
     - (ii) A human creator check of committed screenshots at 320/390/1440, recorded as pending until it is done.
   - Don't let r3 claim recognizability from pixel counts.

SHOULD-FIX

1. [P4 "one meaningful world-visible consequence"] The brief doesn't name the rendering seam for the 3D consequence.
   - The current 3D motifs are primitive meshes per motif (main.gd:2642-2690). A recognizable cook or painter built from primitives, seen from the overhead camera, is unlikely.
   - The proven seam is SVG to ImageTexture: mural_signature.gd:23-29 builds the texture, and the banner uses it at main.gd:3261-3262.
   - FIX: name that seam as the world-consequence path, e.g. a scene texture on the board canvas (mural_canvas_mesh, main.gd:2626-2632) or a second plaque. Don't use new primitive figures.

2. [P2 "do not revisit that completed implementation"] Possible collision with frozen work.
   - The 3D banner shares mural_signature's texture and cache (main.gd:3262; mural_signature.gd:5, :24-29).
   - If the scene work changes signature.svg(), the IDS list, or the cache key, it reopens the r3-frozen border.
   - FIX: state that mural_signature.gd is read-only for this round, and scenes get their own builder and cache.

3. [P1 vs P4 "ephemeral sketch"] The creator's wording is "people could add ... in the mural". An ephemeral, unsaved sketch contradicts "add", and the brief only asks to "assess" it.
   - FIX: rule ephemeral out as the selected slice. Allow it only as an in-workshop preview before commit, which is how hover previews already work (tests/godot-browser.mjs:300: "hover previews never write art").

4. [P4 "neighbor contribution responses"] The brief invents a new cast ("a neighbor cooking", "an artist") while ignoring resident-owned food and art material already in the world:
   - Thanh's tea in the border (mural_signature.gd:3-4)
   - the eatery props PhoBroth and MangoLassi (main.gd:5088, :5096)
   - Dez's spice-wok surprise, magic_carpet_chef (main.gd:2488-2496)
   - Celeste as "Sidewalk Muralist" (main.gd:382)
   - FIX: require each scene to be credited to an existing resident, the way Sun/Wave/Rise credit Lulu/Dez/Celeste (mural_workshop.gd:91), with a Celeste reply line through the existing mural_composition_reply path (main.gd:11594, :11651). verify: what mural_composition_reply currently branches on.

5. [P1 "graffiti art", P5] The brief turns graffiti into "a portable painted wall" without saying why. Make the reason explicit:
   - Spray or graffiti imagery appears only on Celeste's portable board or a fictional sanctioned wall, never on OSM-placed real building facades.
   - This is consistent with ROADMAP.md:32 ("Do not invent businesses that overwrite real tenants") and :45 ("original portable community art stays separate from real public artworks").
   - Otherwise a later round may "paint" real Tenderloin frontages.

6. [P5, docs] docs/ROADMAP.md has no entry for the mural workshop, Rhythm Circle, or this scene feature. The last dated items are 0.12.0/M6 (ROADMAP.md:61-77).
   - FIX: anchor the slice to M3, "meaningful arrangement/art/care choices" (ROADMAP.md:42), so the feature has a stated milestone purpose and isn't a free-floating addition.

7. [P6 "true input/persistence"] Browser-save import merges monotonically (main.gd:12940-12980). The brief doesn't require that scenes survive an opt-in browser import, or that the import never fabricates scenes (the browser track has none).
   - FIX: add one study_test case: Godot state with scenes, then browser import, then scenes unchanged.

OPTIONAL / NICE-TO-HAVE

- Creative direction the brief asked for (smallest coherent slice, in my view): a "Block Kitchen and Wall" backdrop band.
  - The player picks one of 2-3 resident-credited original vignettes and places it in a left, centre or right slot of a non-occupying band behind the 6x3 grid. Examples: Thanh pouring tea over a steaming pot; Celeste or Dez spraying a portable panel.
  - Persist it as a top-level `mural_scenes: {slot: id}` with at most 3 entries, enum-validated and filtered, never resetting the save.
  - Render it with an SVG to ImageTexture builder that mirrors mural_signature.gd, and show the same texture on a 3D plaque beside the board.
  - It doesn't touch the keepsake. Celeste replies with a new line.
  - This meets "add/combine scenes" (more than one slot, so scenes combine), keeps the canvas primary, and leaves every strict-three path unchanged.
- Alternative: two-cell "wide" scene tiles inside the grid with the at-least-3-free-cells invariant (MUST-FIX 6b). This is riskier because it touches the occupancy code above.
- Rank the "small music scene" last (see CUT 1).

CUT THESE

1. [P4 "a small music scene"] The creator's steering (P1) asks for cooking and graffiti/art only. Music is already covered by the Rhythm Circle (godot/rhythm_circle.gd) and by brass and drum in the static border (mural_signature.gd:3-4). A third music surface dilutes the arc and doubles the art workload. Cutting it removes nothing the creator asked for.

2. [P4 "Any new optional Godot save field/schema ... copied-photo semantics"] Drop copied-photo semantics for scenes from this round entirely (see MUST-FIX 1). Designing photo-copy behavior for scenes invites a change to the parity-locked SVG path. "Scenes are not in the photo" is simpler and safe.

3. [P6 "an entire freeform painting app" guard + P4 "layers/scale"] Cut free scale and layer ordering from this slice. Free scale reintroduces the coordinate-encoded state P4 forbids, and adds a third input mode on top of select and place. A fixed set of slots meets the creator's wish.
