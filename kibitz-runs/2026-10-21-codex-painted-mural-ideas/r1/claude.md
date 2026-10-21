TOOL CHECK: PASS. I read godot/mural_workshop.gd in full and C:/tenderloin-redux/kibitz-runs/2026-10-21-codex-painted-mural-ideas/r1/input.md, and I can read repository files. I ran no commands, edited no source, and executed no gates. All pixel and contrast figures below are hand-computed from source constants and are marked "verify".

VERDICT: yes-with-fixes. The direction (A, a code-native painted canvas over the 18 existing hit targets) is sound and source-feasible. But the plan has no art spec. It points at three source motif languages that contradict each other, and it assumes accessibility names and position announcements already exist, which they do not on web. It also proposes visual acceptance that the current oracles would pass vacuously.

======================================================================
MUST-FIX BEFORE BUILD
======================================================================

1. [Art direction / "look at those for visual consistency"] The source has no single motif language to stay consistent with. It has three:
   - 3D easel (main.gd:2642-2689): Sun is a disc plus a cross of rays. Wave is three offset straight bars, so it is not a wave. Rise is three ascending step boxes. Colours are fixed (f8cc58, 5fd4ba, ee835c) whatever the palette.
   - Keepsake SVG (main.gd:9168-9173): Sun is an 8-spoke starburst stroke with no disc. Wave is two stacked q-curves. Rise is the literal word "RISE" in Georgia. Colours come per palette from KEEPSAKE_PALETTE_HEX (main.gd:51-55), so in Garden the Sun is #c37e71 terracotta, not yellow.
   - Current workshop (mural_workshop.gd:162): f8cc58 / 91bac2 / dba0a8. These match neither of the above.
   - The authored prior art matches the SVG, not the 3D easel: public/core.js:16 has SIGNS = sun '✳', wave '≈', rise 'RISE'. public/game.js:385 names them "Lulu's sun / Dez's rhythm / Celeste's letters", and public/game.js:409 has Celeste say she has been "making signs for ages". Celeste's Rise is lettering in the story.
   - The SVG language cannot change: build_keepsake_svg must match frozen public/keepsake.js byte for byte (tests/godot-browser.mjs:1156, 1242), and public/ is fingerprint-locked.
   - FIX: before r3, state in writing that the canonical 2D motif language is the keepsake/prior-art one:
     * Sun: starburst strokes.
     * Wave: two stacked curves.
     * Rise: hand-lettered "RISE". A cheap way to keep the 3D "steps" idea is to set each letter's baseline 2-3 px higher than the last.
     * Colours: KEEPSAKE_PALETTE_HEX[palette], so palette changes the motifs exactly as it does in the keepsake.
   - Then the workshop works as a live preview of the keepsake. Leave the 3D meshes alone in this slice and record the 3D mismatch as deferred (see Cut #3). Without this decision the implementer adds a fourth motif style.

2. [Accessibility premise: "accessibility names/position announcements must remain"] On web they do not exist for focus today, so removing the visible "c,r" text removes the only position cue.
   - The web a11y bridge publishes only a live status line and a summary string (main.gd:10994-11010). There is no per-control DOM name.
   - Cells have no focus_entered hook (mural_workshop.gd has none). Announcements fire only on select, place or reject (main.gd:11603, 11611, 11616, 11623).
   - tooltip_text (mural_workshop.gd:160) is hover-only and is not mirrored to the DOM.
   - So today an arrow-key user, sighted or not, learns position only from the visible "+\n3,2" caption.
   - FIX:
     * Connect each cell's focus_entered to game.announce_a11y_status("Column c, row r: empty" or "Lulu's Sun").
     * Show the same phrase as a small visible caption under the canvas or in the tray, so sighted keyboard users keep a position cue.
     * Keep tooltip_text.
     * Ordering looks safe: on open, grab_focus (main.gd:11567) runs before the open announcement (11572); on a pointer tap, focus comes on press and the placement on release. verify: when focus_entered fires relative to pressed.
     * verify: whether Godot 4.7 (project.godot:7) Control.accessibility_name exists and reaches native AT. If it does, set it per cell. Make no screen-reader claim either way.

3. [Acceptance oracles go vacuous] The existing "fits" checks will pass on the new design without proving anything.
   - activity_detail_snapshot (main.gd:11245-11247) measures only button text against the stylebox box. With empty cell text, text_fits is trivially true. With an icon or self-drawn swatch, the icon width is ignored, so the "full label fits" assertions become vacuous:
     * study_test.gd:3823-3824
     * godot-browser.mjs:83
   - FIX:
     * Swatch art must reserve its space through stylebox content_margin_left, so the existing measurement stays honest.
     * Add new art assertions (see ACCEPTANCE) rather than relying on text_fits.

4. [Determinism / "no new looping animations"] present() runs 3-4 times per placement:
   - update_mural_ui -> refresh (main.gd:14337)
   - update_music_ui -> refresh (main.gd:14376)
   - refresh again at 11622
   Any "painterly" jitter that uses randf() in _draw will reshuffle on each redraw. That is visible shimmer, effectively an unrequested animation, and it makes screenshot or pixel checks flaky.
   - FIX: every brush offset, wobble or torn edge comes from a fixed seed: hash(motif, col, row, palette). The spec must say "static, deterministic per state".

5. [Layout budget at 520x360 / 559x360] The art cannot grow taller there.
   - Short-wide puts the tools in one column next to the canvas (mural_workshop.gd:190-192).
   - Scroll height ≈ 360 − 24 − (title ≈22 + attribution ≈14 + Back 44 + 28) ≈ 228.
   - Content ≈ feedback 36 + 4 + body max(tools 3×44+4, canvas 3×44+4 = 136) + 4 + options 44 ≈ 224.
   - That leaves about 4 px of slack. verify: real font metrics.
   - Both suites require every cell to be fully inside the panel (godot-browser.mjs:83, study_test.gd:3824), so any taller canvas or swatch fails these sizes.
   - FIX:
     * Specify the canvas height as clamp(width × 0.506, 136, budget). 0.506 is the 3D canvas ratio 1.66/3.28 (main.gd:2628).
     * At short-wide this collapses to 136. At 1100x760 it turns today's ≈664×136 ribbon (computed) into an easel-shaped ≈664×336.
     * Swatches must fit 44 px rows in the one-column tray.

5b. [Contrast] There is no automated contrast check for the workshop. grep for "contrast" or "luminance" in study_test.gd and godot-browser.mjs finds nothing; the previous round's "5.93875 minimum" lives only in kibitz-runs final.md. The obvious colour pairings fail:
   - Hand-computed, verify:
     * Garden Sun #c37e71 on keepsake paper #f4e3ba ≈ 2.5:1.
     * Ocean Rise #d3ab77 on that paper ≈ 1.7:1.
     * Garden Wave #276a5a on the dark Garden ground #316050 ≈ 1.1:1.
   - FIX:
     * Every motif gets a 1.5-2 px dark ink keyline (#294f44, the keepsake title ink, main.gd:9211) under the palette colour.
     * Add a native test: keyline vs ground ≥ 3:1, and focus ring vs ground ≥ 3:1, across 3 palettes × 3 motifs × {incomplete, complete}.

======================================================================
SHOULD-FIX
======================================================================

1. [Narrative coherence: goal vs scope] The goal is to stop the mural reading as a "data reference cheat sheet". The plan restyles only the 18 cells. It keeps every surrounding string in the cheat-sheet register:
   - Title "Mural Workshop - 1/3 | Sparks: N" (mural_workshop.gd:143).
   - "Fictional portable art | City: DataSF/PDDL | Streets: OSM/ODbL" (mural_workshop.gd:52), shown over a 0.91-opaque shade (line 34) where no city or street data is visible.
   - "Palette: Garden" / "Music: Off".
   - The panel header "Talking with Celeste (Mural Artist · ... · Turn 3/5) · Easel: ... (Garden Palette) · Sparks: 4" (main.gd:14344).
   FIX, smallest version:
   - Retitle to something like "Celeste's easel · 1 of 3 painted · Sparks 4".
   - Shorten the attribution to an artist-style signature line that keeps the fiction disclaimer, e.g. "Original fictional portable art".
   - Drop the city/street credits only if no provenance gate needs them here. Grep found no test string for this line. [ASSUMPTION] verify: no provenance gate depends on it.
   - Leave the street panel header (14344) out of scope, but tell the creator it is out of scope.

2. [Discoverability on touch] "Faint local focus/hover guides" are not enough.
   - Touch has no hover, and a single tap places immediately (godot-browser.mjs:54, 103). With coordinates and borders gone, a 320 px phone player cannot see that there are 18 discrete snap spots, or where they are.
   - A1's "continuous painted canvas" also implies free painting the interaction does not allow.
   - FIX:
     * Always show a faint pencil registration mark (a small cross or dot, frame brown #b58e5d at ~35% alpha) at each empty slot centre.
     * Draw the hover or focus ghost preview of the selected motif only for mouse hover and keyboard focus.
     * Keep single-tap placement; a two-tap confirm would break the browser contract.

3. [Test coupling to keep] The redesign must keep these browser assertions true:
   - Exact tool texts ['Lulu\nSun','Dez\nWave','Celeste\nRise'] (godot-browser.mjs:84), so swatches keep these text strings.
   - Feedback overflowing its two-line reader (godot-browser.mjs:158). Do not enlarge feedback (mural_workshop.gd:66, 36 px), or the overflow and wheel-read check breaks.
   - The "column N, row M" text in feedback after placement (godot-browser.mjs:104). Numbers stay in the feedback sentence; only the artwork loses them.

4. [Focus visibility on a light ground] Cells currently take the shared button_focus_style (main.gd:14985-14986), which was designed for dark UI buttons. On a paper ground it may be invisible. verify by capture.
   - FIX: give cells a dedicated focus StyleBoxFlat with an empty fill and a 2 px ink border, with corner radius ≥ 6 so it reads as a soft guide, not a cell border.

5. [Completion moment] Nothing artistic marks 3/3 in the workshop, even though the 3D board shows a banner (main.gd:3259).
   - FIX, static and no animation: when complete, draw a small hand-lettered credit line on the canvas: "Lulu · Dez · Celeste". It reuses existing credits and adds no new facts.

======================================================================
THREE ARTISTIC ALTERNATIVES (source-feasible, code-native)
======================================================================

A1 — "Celeste's easel sheet" (RECOMMENDED; refines the driver's A)
- No new node type. Connect canvas_grid.draw to a paint function that calls canvas_grid.draw_* directly. A container's own draw runs before its children, so the art sits under the 18 existing Buttons. verify: draw-signal ordering on 4.7.
- Cells:
  * normal, hover and pressed styleboxes become StyleBoxEmpty (set once in setup; present() stops allocating 18 StyleBoxFlats per call).
  * Cell text becomes "".
  * Metadata, focus neighbours and signals stay unchanged.
- The paint function draws:
  * Paper ground #f4e3ba with an #b58e5d frame, the same board colours as the keepsake (main.gd:9211).
  * A faint wash of mural_palette_color at ~15% alpha with 3-5 deterministic horizontal brush streaks, so palette visibly changes the sheet.
  * Pencil slot marks at empty cells.
  * Motifs with keyline plus palette colour: Sun as starburst strokes (draw_line round-capped), Wave as two sampled quadratic polylines (antialiased), Rise as "RISE" via draw_string with stepped baselines (ASCII only, so the fallback-font invariant is not touched).
  * A focus or hover ghost at 35% alpha.
- Tray: the existing three toggle Buttons keep their exact text, with content_margin_left reserving 28-32 px where the tool button's own draw callback paints that contributor's motif. The pressed state gets a warm paper fill.
- Palette and Music stay as single buttons. The Palette button gets three small dots drawn in reserved margin space.
- Why it wins:
  * It previews the immutable keepsake.
  * It adds no node or contract churn.
  * Every existing test hook (cells[], tool_buttons[], palette_button, done_button, snapshot shape) survives.

B — Stamp/collage
- The same painted ground, but each placed motif sits on a torn-paper patch: a deterministic jittered polygon with an offset shadow. The slots read as "pin a neighbour's contribution here".
- It honestly matches the snapped 6×3 interaction better than a "continuous painting".
- Cost: polygon generation, more contrast cases (patch vs ground vs motif), and a higher risk of looking busy at 45 px cells on 320 screens.
- Viable as a later skin on A1. Do not build both now.

C — Stage the real 3D easel behind the editor
- Reject.
  * The camera must not move: pose equality is asserted at study_test.gd:3877 and godot-browser.mjs:133-134, 152-153. So C needs a SubViewport with a second camera, which renders the scene again on web GL Compatibility.
  * The 3D motifs are crude primitives (Wave = three bars), so showing them makes the art less artistic.
  * The 0.91 shade deliberately hides the world.
  * At 320 px the board is no larger than the 2D canvas.

======================================================================
RECOMMENDED BOUNDED SLICE (one r3)
======================================================================

Implement A1 plus Must-Fix 1-5b plus Should-Fix 1-4.

Files:
- godot/mural_workshop.gd: draw callbacks, empty styles, focus style, canvas height rule, caption, focus announcements, snapshot art data.
- godot/main.gd: only the title/attribution data passed through present(), and a shared credits constant if desired.
- Tests: study_test.gd and godot-browser.mjs.

Do not touch:
- Save schema, place_mural_motif, 3D meshes, build_keepsake_svg, public/.

======================================================================
ACCEPTANCE (meaningful, checkable)
======================================================================

Native contracts:
- After present(), for all 18 cells:
  * text contains no digit;
  * the normal/hover/pressed stylebox is StyleBoxEmpty, or has bg alpha 0 and border width 0;
  * focus style has border width ≥ 2.
- snapshot().art (read-only) lists {id, x, y, w, h, col, row} per placed motif:
  * count == placements.size();
  * each rect lies inside its own cell's rect and inside the panel;
  * slot_marks == 18 − placements.size().
- Determinism: two present() calls with the same model give identical art data (and identical draw parameters if exposed).
- Contrast test (Must-Fix 5b), ≥ 3:1 for keylines and the focus ring, across palettes and completion states.
- cells[7].grab_focus() → last_a11y_announcement contains "Column 2, row 2".
- All existing verify_mural_workshop requirements (study_test.gd:3774-3902) pass unchanged.

Browser (real GUI evidence):
- verifyMuralWorkshop passes with no assertion weakened (tool texts, reader overflow and coordinate feedback are kept).
- New, at each required size, after three placements, take a canvas screenshot clip and check:
  * Pixels sampled on each motif's stroke differ from the sampled paper by a clear threshold.
  * The midpoint between two adjacent empty cells (where today's 1 px #435a58 border sits, mural_workshop.gd:165) is within tolerance of paper, which proves there are no tile borders.
  * The centre of an empty cell is paper or a pencil mark, not an opaque tile.
- After a real Palette tap, the sampled wash pixel changes.
- After real ArrowRight, the announcement contains the new column and row.
- Required sizes: 1100x760, 390x667, 320x667, 520x360, 559x360.
- Save captures for creator review at all five sizes.

Limits to state honestly:
- Tests prove that the cheat-sheet elements are gone and that drawn motifs are present. They cannot prove the art is "artistic". Only the creator's review of the captures can accept that.
- No screen-reader, physical-phone or comfort claims.
- No claim of global originality: the motifs derive from the project's own prior art.

======================================================================
OPTIONAL / NICE-TO-HAVE
======================================================================
- Put the credit map in one shared const. It is duplicated at mural_workshop.gd:79 and main.gd:11600.
- A soft deterministic paper-grain stipple of about 40 fixed dots per sheet.

======================================================================
CUT THESE
======================================================================
1. Option C (3D easel as editor background). It breaks camera-pose contracts, costs a second render, and its primitives are less artful (see C above).
2. Any change to build_keepsake_svg. Byte parity with frozen public/keepsake.js (godot-browser.mjs:1156, 1242) makes it unsafe and out of scope.
3. Re-modelling the 3D motif meshes in this slice. It is a separate visual change with its own position test (study_test.gd:3839). Record the 3D-vs-keepsake mismatch as deferred.
4. Building both A and B. Pick A1; B can come later as a skin.
5. Separate per-palette swatch buttons that replace the single cycle button. This changes the palette contract (study_test.gd:3861, godot-browser.mjs:149) and the Tab ring for no art gain. Dots drawn inside the existing button are enough.
6. Pixel-diff against the previous round's screenshots as the "visual" proof. It proves only change, not art. Use the targeted pixel samples above instead.
