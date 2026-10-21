TOOL CHECK: PASS (read godot/mural_workshop.gd, godot/main.gd, godot/rhythm_circle.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, docs/ROADMAP.md)

Section ids used below (input.md has no headings):
  [B1] = input.md line 2 (creator quote, context, "concert already coded", "source frozen")
  [B2] = input.md line 3 (asks, constraints, acceptance, r3 hand-off)

VERDICT: yes-with-fixes. The brief is coherent about what NOT to touch, but it never says where new art can physically go. The current canvas leaves no free paper. It also doesn't say who in the fiction made the new marks, and its "native visual acceptance" can't be met as written.

MUST-FIX BEFORE BUILD

1. [B2 "narrow original decorative frieze ... doesn't obscure targets"] The canvas has no free paper to hold new art.
   - The 18 cells tile the whole canvas with zero gaps: h_separation/v_separation 0 and SIZE_EXPAND_FILL (godot/mural_workshop.gd:105-118).
   - In short-wide layout, canvas_grid.custom_minimum_size.y = 136 (mural_workshop.gd:215). Three 44px rows need 132, so there are only 4px to spare.
   - In portrait at 320px wide, the canvas is about 296-16 = 280px wide, so each cell is about 46.7px (6 columns, mural_workshop.gd:106, 216). That is only about 2.7px over 44.
   - Each motif_rect is the cell inset by 10x14 (mural_workshop.gd:271-274), and any cell can hold a motif. So the only paper that is never a motif box is a 5-7px gutter.
   - A frieze drawn inside canvas_grid would therefore either overlap targets or force cells below 44px in short-wide.
   - Fix: say in the brief that any frieze or signature strip is a separate, non-focusable sibling Control of canvas_grid, never drawn in draw_canvas():
     - portrait (body.columns==1, mural_workshop.gd:212): a strip under the canvas;
     - short-wide: a strip beside the canvas, where width is spare;
     - the existing 136/160-336 canvas sizing stays unchanged.

2. [B2 "meaningful native + actual browser visual acceptance"; "Do not assume canvas screenshot metadata proves actual pixels"] Native tests can't show pixels.
   - Native tests already admit they check layout metadata only: "drawn marks are independently checked in actual browser pixels" (godot/tests/study_test.gd:3834).
   - Fix: define native acceptance as geometry only. The strip's rect must:
     - not intersect any of the 18 cell rects;
     - not intersect any tool/option target;
     - stay out of the focus ring.
   - Define browser acceptance as pixel sampling from the real screenshot, the way verifyPaintedMuralPixels does today (tests/godot-browser.mjs:55-79). The new strokes need an ink-count threshold inside the strip rect.

3. [B2 acceptance; tests/godot-browser.mjs:64-77] The existing pixel checks are the main guard against art spreading across the canvas, and the brief doesn't freeze them. These are:
   - motif boxes must keep >15% pale paper (line 65);
   - all 15 open spots must show a registration dot (lines 70-73);
   - adjacent empty spots must share a paper-coloured seam within 25 (line 77).
   - Any flourish in or between cells would break these. The tempting "fix" is to loosen the 25/30/15% thresholds.
   - Fix: add an explicit rule that verifyPaintedMuralPixels thresholds and counts (3 motifs, 15 slot_marks, 15 dots) stay byte-identical in r3. New checks may only be added.

4. [B1 creator quote vs B2 "actual3Deasel ... immutable old photo/SVG ... must stay untouched"] The goal and the method don't match.
   - The creator asked for instruments "in the mural". Under the brief's limits they would only show in the workshop overlay.
   - The 3D board is built from box/cylinder primitives (main.gd:2587-2690). The keepsake SVG draws its own asterisk, wave paths and RISE text (main.gd:9164-9176). Neither would show the new art.
   - So once the player closes the workshop, the mural on the street and in the photo has no instruments.
   - Fix: the r3 plan must say this to the creator in plain words: "workshop canvas only; street easel and keepsake unchanged". It must not claim the mural now has instruments. If the creator wants them in the world, that is a separate, schema-free 3D prop decision, not a quiet expansion.

5. [B2 example list "trumpet/handdrum, tea cup, inclusive heart, Turk/Taylor corner"] Who made these marks in the story?
   - The workshop's whole story is crediting contributors: tool captions "Lulu/Dez/Celeste" (mural_workshop.gd:88-89), "Three neighbors' ideas, arranged your way" (main.gd:11554), and credit strings at main.gd:11609.
   - Uncredited decoration breaks that story.
   - Fix: tie each mark to an existing fictional cast member's established prop, not to real history:
     - hand drum = Dez (PortableHandDrum, rhythm_circle.gd:148-169);
     - tea cup = Thanh, "Tea & Stools Host" (main.gd:385);
     - speaker/turntable or Barnaby's clown horn = Rook (main.gd:395-396).
   - The credit belongs in the strip's accessible description, not in visible labels (B2 bans a labels grid).

6. [B2 "No licensed artist marks/logos"; docs/ROADMAP.md:34 "no ... implied affiliation"] The trumpet example has a real-person risk.
   - The project already ties trumpet-era jazz to a real person: "1961: Miles Davis played the Black Hawk at Turk & Hyde" (main.gd:262), plus the "So What" awning and the 1961 Black Hawk LP (main.gd:282-285).
   - A trumpet on a mural one block from that content implies Miles Davis even without his name.
   - Fix: drop the trumpet, or make it a generic, uncredited brass flourish with no 1961/Black Hawk/"So What" link and no muted-trumpet silhouette. Prefer the hand drum, which is already cast-owned.

7. [B2 "inclusive heart, Turk/Taylor corner"] Turk & Taylor is a real cultural place in this game.
   - The game already labels "Taylor & Turk (Transgender Cultural District)" (main.gd:302) and has Compton's 1966 content (main.gd:742, 2345).
   - A heart "at the Turk/Taylor corner" painted by fictional neighbors reads as speaking for a real district.
   - Fix: if a heart ships, credit it to a fictional neighbor. Give it no district name, no corner text and no flag-stripe composition. Draw it in the active KEEPSAKE_PALETTE_HEX ink like the other marks (mural_workshop.gd:260-262). [ASSUMPTION: the district has its own branding that a stripe/heart combination could resemble; verify before shipping.]

SHOULD-FIX

1. [B2 "New optional stamps that cannot persist honestly ... should be deferred"] The brief only treats state as a risk. There is an honest middle path using already-saved data:
   - reveal or complete the strip from state the save already holds: mural_completed, rook_soundcheck_done (main.gd:11832), hosting.results (main.gd:11849);
   - for example, Dez's drum ink appears once a Rhythm Circle result exists.
   - This gives the art a reason to appear with no schema change and no hidden coordinate encoding. If it's rejected, say why. Otherwise a strip that is always on is pure set dressing with no arc.

2. [B1 "The concert feature is already coded ... earlier completed concert r1"; B2 "Separate implementation r3 will cover both"] Hidden assumption: the concert work is stable.
   - At session start, godot/rhythm_circle.gd is untracked and godot/main.gd and tests/godot-browser.mjs are modified (git status).
   - One r3 covering concert and mural on top of uncommitted concert code makes regressions impossible to pin on either feature.
   - Fix: commit or freeze the concert diff before r3. Keep the mural slice in its own commit.

3. [B2 "phone/short-wide readability"] Write down the size budget. A portrait strip under the canvas makes the scroll content taller (scroll min height, mural_workshop.gd:219), and tests require every target to be enclosed in the panel (tests/godot-browser.mjs:184).
   - Fix: cap the strip at about 20-24px tall in portrait.
   - Require the existing 320/390/short-wide browser viewports to still pass the target-fit loop without any extra scrolling to reach Back ("Back to Celeste", mural_workshop.gd:139).

4. [mural_workshop.gd:382 art_snapshot "language"] The snapshot says "original starburst, flowing Wave, hand-lettered RISE". Leave that string alone so current assertions stay stable.
   - Expose the strip under its own new key: rect, the cast credit for each mark, ink colour.

5. [B2 accessibility, implied] The strip must stay out of the focus ring (mural_workshop.gd:141-152) and must not add another a11y announcement in focus_canvas_cell (mural_workshop.gd:268).
   - At most one static accessibility_description on a non-focusable node.

OPTIONAL / NICE-TO-HAVE

Candidate treatments, ordered by recommendation:

- T1 (recommend): "Block-party signature strip."
  - A single row of ink-and-wash vignettes drawn with brush_line() (mural_workshop.gd:294-300), reusing the existing INK keyline and palette colours:
    - Dez's hand drum, matching PortableHandDrum;
    - Thanh's tea cup with a steam curl;
    - Rook's speaker cone with two sound arcs;
    - a small heart joining them.
  - Fixed point-index offsets, so no shimmer (same rule as the comment at mural_workshop.gd:255).
  - Lives outside canvas_grid per MUST-FIX 1. No schema change.
- T2: Richer tool-swatch art.
  - Give each contributor swatch a tiny companion mark: Dez's Wave swatch gains drum-stick ticks; Celeste's gains a brush.
  - The 24x24 draw at mural_workshop.gd:101 sits outside the canvas, so no target conflict.
  - Lowest risk, but the least "in the mural".
- T3 (defer): Musical marks inside the motif glyphs themselves (e.g., Wave ribbons become a drum rhythm).
  - Widens the already-existing gap with the keepsake SVG glyphs (main.gd:9172-9176) and the 3D primitives. It also risks breaking the >15% pale-paper check. Defer.
- Internal prior art to reuse instead of reinventing: "SketchSaxMotif" on the hidden mural sketch card (main.gd:2698).
  - A sax already belongs to the hidden-mural story. Don't add a second, competing sax.

CUT THESE

1. [B2 "trumpet"] Cut. Real-person association (MUST-FIX 6). The hand drum covers "musical" with an existing cast owner.
2. [B2 "Turk/Taylor corner"] Cut as a named or depicted place mark. It is the only example that needs real-place framing, and the brief already bans current-building/event facts. A generic heart keeps the warmth.
3. [B2 "2-3 treatments ... recommend one bounded slice"] Ship only T1 in r3. T2 and T3 add surfaces to test (tool swatch redraw, glyph pixel thresholds) without serving the creator's request any better. Cutting them is safe because nothing persists or depends on them.
4. [B2 "Separate implementation r3 will cover both"] Cut the concert work from this mural r3 (SHOULD-FIX 2). The concert was already reviewed in its own r1; re-opening it here invites scope coupling.
