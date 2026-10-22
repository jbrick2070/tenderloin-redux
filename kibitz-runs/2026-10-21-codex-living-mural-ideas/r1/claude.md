TOOL CHECK: PASS (read godot/mural_stories.gd, godot/main.gd, godot/mural_workshop.gd, godot/mural_signature.gd, tests/godot-browser.mjs, godot/tests/study_test.gd, docs/ROADMAP.md, session_handoff.md, r1/source-before.json, r1/driver_anchor.md). No file other than this report was written.

Section IDs used below: [BRIEF] = input.md lines 1-4 (ideas request, options A/B/C, constraints); [ANCHOR-CONFIRMED], [ANCHOR-MUST], [ANCHOR-SHOULD], [ANCHOR-UNVERIFIABLE] = the driver-anchor lines 7-11; [SCOPE] = lines 13-15.

VERDICT: yes-with-fixes. The anchor's code claims check out. But option (A) packages two things that already exist as if they were new, option (B) has no definition and its "facade" framing points against the roadmap, and the anchor asks for "feels like large art" as a must-fix while also calling aesthetics unverifiable. Pick a narrowed A plus a zero-schema resident reply (recommendation at the end).

------------------------------------------------------------------
VERIFIED HIGH-LEVEL CLAIMS (so the judge can skip them)
- [ANCHOR-CONFIRMED] "IDS/NAMES/vignette/clean drive scenes, two anchors": TRUE. godot/mural_stories.gd:3-5 (IDS, SLOTS, NAMES), :34-40 (clean filters by IDS and removes duplicates), :42-64 (vignette).
- "music appears only in a nonselectable static border": TRUE. godot/mural_signature.gd:4 (IDS brass/drum/tea/heart), :33-34 (MOUSE_FILTER_IGNORE, FOCUS_NONE).
- "tests cover three hard-coded choice indices; layout/snapshot assume three": TRUE. tests/godot-browser.mjs:341 (slice(0,3) names), :345-358 (positional buttons[0..9]), :292, :316; godot/mural_stories.gd:162 (hard-coded 3-entry label dict), :249 (tools.columns = 3), :298 (for i in range(3)).
- "edit_mural_scene bounds writes and budgets UTF8; no new save key needed to extend enum": TRUE for adding enum values. godot/main.gd:11619-11645 validates against IDS and refuses over-budget growth; :12603 loads through clean(). This holds only if nothing beyond new IDS values is added (see MUST-FIX 2).
- "world consequence is same art on portable board, not a real facade": TRUE. godot/main.gd:3248-3254 (scene texture replaces canvas material), :8686 ("no building façade is painted").
- The keepsake photo freezes only motifs and palette, never scenes: TRUE. godot/main.gd:9016-9027. New scenes can therefore never reach the photo, which is consistent with "old photo frozen".

------------------------------------------------------------------
MUST-FIX BEFORE BUILD

1. [ANCHOR-CONFIRMED] last sentence + [BRIEF] option B: "not a real facade" reads as if a real facade were the missing upgrade. The roadmap forbids that direction. docs/ROADMAP.md:32 says "Do not invent businesses that overwrite real tenants" and keeps facades for geographically grounded replacement. docs/ROADMAP.md:45 says "original portable community art stays separate from real public artworks". The game's own copy at godot/main.gd:8686 promises "no building façade is painted".
   FIX: before choosing, state explicitly that option B must not paint or overlay any real building, facade, or OSM/DataSF footprint. A "world consequence" may only change authored, fictional, portable or decor objects.

2. [BRIEF] option A "usable artist palette and saved portable-board consequence": two of A's three parts already exist. The palette is a working cycle over MURAL_PALETTES (godot/main.gd:42, :11864-11870), exposed in the stories footer (godot/mural_stories.gd:189) and pixel-tested (tests/godot-browser.mjs:359, "actual palette recolors scene illustration"). The board consequence is already update_mural_3d (godot/main.gd:3248-3254). If "usable artist palette" means anything new, such as per-scene colors, free color picking or per-slot palettes, it needs a new save field. That contradicts [ANCHOR-CONFIRMED] "no new save key is needed".
   FIX: change A to "two new vignettes rendered with the existing palette cycle on the existing board". Either drop "artist palette" or define it with an explicit save contract and budget measurement. Do not let it slip in under the no-new-key claim.

3. [ANCHOR-MUST] "must feel like large art" vs [ANCHOR-UNVERIFIABLE] "human ... aesthetic acceptance": a must-fix that is unverifiable by definition can't gate a build.
   FIX: replace it with checkable proxies, for example:
   (a) each new vignette's figure plus prop bounding box covers at least N% of its 200x200 half;
   (b) pairwise rendered-pixel difference between every pair of the 5 scenes on the same palette is at least the current threshold (tests/godot-browser.mjs:348 uses changed>=40 against blank, not scene-vs-scene);
   (c) on the world board, the instrument/tool region of each new vignette is not fully covered by the three mandatory 3D motifs at their default cells (see MUST-FIX 4).
   Keep "feels like large art" as UNVERIFIABLE only.

4. [ANCHOR-MUST] "large art" world consequence vs the mandatory motifs drawn on top. The scene texture sits under the Sun/Wave/Rise nodes, which are placed at x = -1.28 + col*0.51, y = 1.98 - row*0.43 (godot/main.gd:3262-3264) over the 6x3 board. Each paper half spans 3x3 of those cells, so up to three mandatory motifs can sit on one vignette. The earlier round accepted "no clearance promise" (session_handoff.md:22). A musician or gardening scene depends on a small legible prop (instrument, trowel or seedling). If a motif covers it, the "world consequence" for the new feature collapses into a recolored board.
   FIX: decide at concept level either (a) to design the new vignettes so the key prop avoids the default motif cells (MURAL_DEFAULT_CELLS, godot/main.gd:44-48), or (b) to accept occlusion explicitly and drop "large art in the world" from the acceptance claims. Do not leave it implicit a second time.

5. [BRIEF] "Respect ... optional two anchors" vs the creator goal of "original musical neighborhood imagery ... people cooking/sharing and making street art": with SLOTS fixed at two (godot/mural_stories.gd:4) and clean() forbidding duplicates (:39), going from 3 to 5 scenes adds choice but no extra composition. Music now competes with food for one of two halves; the player can never show music, cooking and painting together. That is the creator's stated combination (session_handoff.md:46, "combined with musical neighborhood imagery").
   FIX: the selected plan must say plainly that this trade-off is accepted ("pick 2 of 5"). Otherwise it must get creator consent to change "two anchors", which would mean a new slot key whose older-build behavior clean() silently drops; record that. Do not present 5-in-2 as satisfying "combined" imagery without saying so.

------------------------------------------------------------------
SHOULD-FIX

1. [BRIEF] option B "meaningful resident-led world consequence": undefined. Nothing in the brief or anchor names which resident leads, what changes in the world, or whether it persists. Today only Celeste reacts to scenes (godot/main.gd:11612-11617 is the only consumer besides the board texture; grep finds no other neighbor reading mural_scenes). B as written cannot be compared on feasibility.
   FIX: define the smallest real B. One option is zero-schema, derived reactions: when a scene is on the board, a matching resident's existing dialogue gets one line, such as Dez for a musician scene or Thanh for sharing/gardening. It is computed from mural_scenes with no new key. Compare that, not an abstract "world consequence". [ASSUMPTION: Dez/Thanh dialogue functions can take one derived line; verify: the per-neighbor reply builders near godot/main.gd:8600-8750 and 14489-14496.]

2. [ANCHOR-MUST] "expose all full names >=44px without crowding the painting" on short-wide screens: with five choices, the short-wide branch stacks tools.columns = 1 at 136x60 per button (godot/mural_stories.gd:249-254). That is 5x60 + 4x4 = 316px of choices beside a 136px-tall paper (:255) at 520/559x360. It forces the choice list to scroll inside a 360px viewport, so the paper becomes the minor element. On narrow phones tools.columns = 3 gives a 3+2 grid of 90px rows above the paper.
   FIX: require short-wide choices in 2 columns (or a horizontal strip) and keep the paper's 136px minimum. Add a rendered check that the paper rect at 520x360 and 559x360 does not shrink below the current baseline.

3. [ANCHOR-CONFIRMED] "tests cover three hard-coded choice indices": extending IDS shifts every positional index. The targets move from 3/4 to 5/6, the lifts from 5/6 to 7/8 and back from 9 to 11, across tests/godot-browser.mjs:292, 316, 343, 347-359. A silent shift would turn "Lift" taps into "Back" taps and still pass some assertions.
   FIX: as part of the slice, have snapshot() (godot/mural_stories.gd:288-303) expose role-tagged buttons (choice:<id>, target:left/right, lift:left/right, palette, music, back). Then rewrite the existing tests by role before adding scenes, so the regression is proven on the old three first.

4. [ANCHOR-MUST] "<=4096 guard": the over-budget path refuses any edit that grows the envelope (godot/main.gd:11640). A new ID longer than the one it replaces is a "growing" edit and will be refused in the documented oversized-import state (session_handoff.md:23). Today's maximum ID length is 8 ("painting").
   FIX: cap new IDs at 8 characters or fewer (for example "music"/"garden" style IDs; display NAMES can be longer). Re-measure the defined complete profile + both scenes + 512-byte imported metadata with the longest new pair.

5. [BRIEF] "Missing pieces": discoverability. Scenes are reachable only through the Workshop footer button "Paint Scenes" (godot/mural_workshop.gd:153). No objective or hint points there; the mural objective stops at 3/3 motifs (godot/main.gd:6039-6040). Celeste's invitation line (godot/main.gd:11613) is only shown inside the stories reader itself (godot/mural_stories.gd:216). Adding two more scenes behind an entry players may never open adds content with little value.
   FIX: include one derived, non-saving invitation after 3/3, for example Celeste's composition reply or the mural detail panel mentioning "Paint Scenes". No new objective or reward.

6. [ANCHOR-MUST] "Quiet play, Music ... remain independent": a musician-at-work vignette sits next to the stories footer's Music toggle (godot/mural_stories.gd:190). Players will expect it to sound, and the brief does not decide.
   FIX: state that the musician vignette is visual-only, does not start, duck or route the Rhythm Circle Play Bar, and does not read music_playing. Add one assertion that placing or lifting it leaves music state and save bytes outside mural_scenes unchanged (the existing pattern at tests/godot-browser.mjs:335 captures `music`).

7. [ANCHOR-SHOULD] "Existing pattern audition is complete, do not repeat it" + [BRIEF] originality: the musician vignette will naturally draw a hand drum, which already appears in the border (godot/mural_signature.gd:3, "Dez's hand drum") and the Rhythm Circle. That is acceptable project-native prior art, but a straight copy of the border icon would read as duplication.
   FIX: require a different instrument/action silhouette from the four border icons, or explicitly reuse Dez's drum as a deliberate visual link. Either way, no real musician likeness and no named genre or venue claim (the Black Hawk history card at docs/ROADMAP.md:33-36 must not be visually implied).

------------------------------------------------------------------
OPTIONAL / NICE-TO-HAVE

- Thumbnail cache cap 9 (godot/mural_stories.gd:88) is smaller than 5 IDs x 3 palettes = 15, so palette cycling would re-rasterize thumbnails repeatedly. Raise it to IDS.size()*3. Full-paper cache cap 6 (:79) stays acceptable (it clears and rebuilds).
- Gardening has a project-native anchor: authored "timber planter trees along Turk & Taylor" decor (godot/main.gd:3913, 3948-3986). The vignette can echo those planters without claiming a real community garden. [ASSUMPTION: those planters are decor, not sourced street-tree records; verify against godot/data/source/street_trees_tkzw-k3nq.json usage before any copy says they are real.]
- Update the empty-state invitation copy (godot/main.gd:11613, "A shared meal or a painter at work...") so it names the new options.

------------------------------------------------------------------
CUT THESE

1. "Usable artist palette" as a new system ([BRIEF] option A): the palette cycle already exists and is tested (MUST-FIX 2). Anything beyond it adds a save field and a test surface without serving the stated goal (musical/gardening imagery). It is safe to cut because the existing cycle already recolors the new vignettes through pal[] in vignette().
2. Any facade, building-overlay or geometry-changing "world consequence" ([BRIEF] option B, [ANCHOR-CONFIRMED] facade wording): it conflicts with docs/ROADMAP.md:32/45 and the in-game promise at godot/main.gd:8686. Safe to cut; the portable board remains the sanctioned surface.
3. Option C as an open-ended slot ([BRIEF] "(C) another substantive nearby opportunity"): with A and B both under-defined, a third open option invites the selection to drift. If kept, limit it to one named, source-grounded candidate. [ASSUMPTION: a candidate such as showing the saved scene paper on the second-gathering "Shared art panel" (PROGRAMME_TITLES.art, godot/main.gd:87) is plausible; verify that panel's renderer and its frozen-copy rules before proposing it.]

------------------------------------------------------------------
RECOMMENDED BOUNDED SLICE (answering the [BRIEF] ask)

Build a narrowed A plus a derived B-lite:
- Add two IDS values (8 characters or fewer), Musician at Work and Gardening Together, as hand-drawn vignettes in godot/mural_stories.gd using the existing pal[] palette and the existing two anchors. No schema change, no new save key, frozen photo untouched.
- First make snapshot() role-tagged and re-baseline the existing three-scene tests by role, then add the new scenes.
- Use a 2-column short-wide choice tray so the paper keeps its current minimum size.
- Add one derived resident line per new scene (Dez for music, Thanh or Bea for gardening) computed from mural_scenes, plus one Celeste "Paint Scenes" invitation after 3/3. No saved state, no rewards.
- Acceptance: pairwise scene pixel distinctness, key-prop visibility against the default motif cells on the world board, rendered paper size at 320x568/390x667/520x360/559x360/1100x760, real mouse/finger/arrow-Space placement and lift, reload restoring a new-scene pair, music state unchanged by musician placement, and the 4096 profile re-measured with the longest new ID pair.

Why this beats the alternatives: it is the only option whose feasibility can be proven against existing seams (clean(), edit_mural_scene budget, update_mural_3d). It directly delivers the creator's musician and gardening request. B as written is undefined and its obvious form (facade) is roadmap-prohibited; a free-form artist palette costs a schema change for no imagery gain. Remaining honest limit: still only 2 of 5 scenes visible at once (MUST-FIX 5); human aesthetic and recognition acceptance stays UNVERIFIABLE.
