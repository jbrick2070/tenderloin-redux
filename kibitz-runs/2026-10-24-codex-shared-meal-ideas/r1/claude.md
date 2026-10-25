TOOL CHECK: PASS (read input.md, docs/COOKING_FOODWAYS_BRIEF.md, docs/ROADMAP.md, godot/main.gd, godot/story_picker.gd, godot/civic_listening.gd, godot/shared_panel.gd, godot/programme_studio.gd, godot/bea_invitation.gd, godot/quiet_seats.gd, godot/mural_stories.gd, godot/tests/study_test.gd, tests/godot-browser.mjs at baseline working tree)

VERDICT: no (yes after the fixes below). The direction is right, but four things that hold the plan together are undefined: what the invitation leads to, where food goes in the Open Floor layout, who owns the module when a story is active, and which preparation steps are actually backed by sources. Option A as written is also bigger than "small-to-medium".

MUST-FIX BEFORE BUILD

1. [P4 "personal invitation to another cook" / P3 "do not rebuild selector"] The invitation has no target, and the only invitation system is hardwired to one story.
   - godot/story_picker.gd has a single boolean, lantern_invited (l.20).
   - Follow is labelled "Follow Imani's invitation: Lantern Procession" (l.63). follow_invitation() can only select lantern_procession (l.242-244).
   - TITLES has four fixed entries, and the page is clamped to 0..1 (l.3, l.116, l.132).
   - So a cooking invitation either reworks the selector, which P3 forbids, or it means nothing.
   - Fix: keep the invitation inside the cooking module and make it the backbone of the feature.
     - One cook is open at first.
     - Sharing that cook's finished dish produces that cook's personal invitation to the next cook.
     - "Follow" opens that cook's station in the same panel, with no route or camera change.
     - "Keep exploring" closes the panel and keeps the invitation for this visit.
     - Once revealed, every cook stays switchable in any order.
   - Leave story_picker's Lantern invitation untouched.
   - This gives a reason to have four dishes in one module, without a generic framework. It also answers Option C's concern.

2. [P4 "existing gathering supports in BOTH layouts"] The Open Floor layout has nowhere to put food. The premise is false for one of the two layouts.
   - Open Floor (godot/main.gd:7517-7555) has: a painted floor slab at y≈0.035, a riser at (4.7, 0.15) holding a mic stand at x=4.6, a lettering panel at x=-5.3, and three stools at z=-1.05. There is no table or counter.
   - The Long Table (main.gd:7479-7514) has a surface at y≈0.81, but it is already used:
     - Thanh's teapot at x=0 and cups at x=±0.9 and ±2.2, z=0.2 (main.gd:7506-7508)
     - Bea's invitation paper at x=-3.1 (godot/bea_invitation.gd:23)
     - quiet-seat guests (godot/quiet_seats.gd:53)
   - Fix: say this outright and choose.
     - (a) Allow one original portable serving tray or cloth on the Open Floor slab, clear of the stools and riser, described as portable gathering kit. I recommend this.
     - (b) Hide the meal on Open Floor. This fails P4.
   - Do not put dishes on the mic riser or bare painted ground.
   - List the free Long Table slots before writing art, e.g. roughly x∈[-2.6,-1.3], [1.3,2.0], [2.6,3.9], avoiding the cups and teapot.
   - verify: rhythm_circle.gd:162 also parents props to the same layout nodes; check for overlap.

3. [P3 ownership / "avoid overlapping story/modal worlds"] The plan never says whether cooking is a focused panel or a story episode.
   - The existing focused panels only refuse to open when another activity is visible, a story card is up, a path is active, or startup is pending (godot/shared_panel.gd:122, godot/programme_studio.gd:113).
   - Neither checks game.active_story_episode() (main.gd:12011-12014).
   - An active Power visit changes lighting and fixtures (godot/story_picker.gd:204, 212). So a cooking panel could open and place dishes in a world that a story has altered.
   - Fix:
     - Make cooking a focused panel and add it to is_focused_activity_visible() (main.gd:12029).
     - Do not add it to active_story_episode().
     - Refuse to open while active_story_episode()!=null, with an honest message (e.g. "Pause your story visit first: Shift F8, Keep exploring").
     - State what world dishes do while a story is active (recommend: stay as they are, since a story cannot become active while the panel is open).
     - Also decide what happens during unfinished hosting. Programme Studio refuses then (programme_studio.gd:115-116); cooking should copy that or justify a different rule.

4. [P2 sources vs P5 "distinctive preparation states" for all four] The mechanics are being specified before the evidence exists.
   - The brief records these source gaps (docs/COOKING_FOODWAYS_BRIEF.md:13-16):
     - Thai first-party fetch returned 402.
     - The kibbeh baked-variant link returned 404, and the community PDF is listed as 404 in P2.
     - The Kardea Brown site is intermittent.
   - Yet acceptance requires distinctive preparation for all four dishes.
   - Fix: before code, write a per-dish "grounded minimum" containing only steps already recorded in the brief or re-fetched from a source:
     - lo bak go: daikon plus regular (not glutinous) rice flour, steam to set, slice, pan-fry
     - kibbeh: fine-bulgur shell and a separate filling, formed and sealed by hand
     - kra pao: holy basil as the defining late addition
     - red rice: tomato-based, parboiled rice, smoked sausage, per Kardea's page
   - Only grounded steps become actions. Quantities, heat and garnish stay as the fictional cook's own words, labelled "one family's way".
   - Re-fetch the gaps (Thai, kibbeh complete variant, Kardea method) before r3. If they stay inaccessible, ship with the brief-level facts only and say so in docs. Do not encode guessed steps as mechanics.

5. [P4 "prefer actions that change visual food state, not a click-through quiz" vs P5 "harmless out-of-order hint without progress"] Together these describe a hidden-correct-order quiz.
   - Several buttons are shown, one is valid, and wrong presses produce a hint. That is the quiz P4 rejects, and it implicitly grades cultural correctness, which P2 forbids.
   - Fix:
     - The primary control is always the next grounded step, named after what it does to the food.
     - Real choices sit where a source or family variation allows freedom: kibbeh shaping, a serving or garnish choice (verify against the source), and where the dish goes on the table.
     - Out-of-order input should only be reachable through keyboard or quick paths. Test that edge; don't make it the core loop.

6. [P3 tentative entry A] Appending a 13th hub action buries the flagship feature, and many tests hard-code three pages.
   - Discoverability:
     - "Import Web Save" is the last of the 12 (main.gd:15792).
     - With 4 actions per page (main.gd:842) and paging below 1050px (main.gd:6703), cooking would sit alone on page 4.
     - In the 6-column wide grid (main.gd:7025) it sits alone on row 3.
   - Hard-coded three-page assumptions:
     - godot/tests/study_test.gd:4649: block_action_page_count()==3 "preserve all original3hub pages"
     - godot/tests/study_test.gd:3210, 3389, 4567: block_hub_page==2 treated as the final page
     - tests/godot-browser.mjs:814 (p<2), 820 (while block_hub_page<2), 859, 1999, 3296 ("Next clamps at the final page" ==2), 3352, 3363 (`? 3 : 1`), 3384 (actionPage<2)
     - tests/godot-browser.mjs:3277 and 3367 assert 4 actions on every paged page. That breaks with a single-action page 4.
   - Fix:
     - Rewrite these literals to use block_action_page_count() and a per-page count, together in one pass. Do not swap in "4" literals.
     - Make cooking reachable through the existing suggestion jump. block_hub_page snaps to the suggested button's page at main.gd:6652 and 15208. The hub then opens on cooking's page when it is the next suggestion.
   - Confirmed: a sibling in the nav row is not viable. civic_listening.gd:257-258 already notes that six 44px targets fill the entire 264px interior of the smallest side dock.

SHOULD-FIX

1. [P3 alternative eatery entry] Reject it.
   - NEIGHBORHOOD_EATERIES carry real block addresses, e.g. "400 block of Turk St" (main.gd:705).
   - Their menus overlap the requested cuisines in confusing ways:
     - the pho counter lists "iced Thai tea" (main.gd:706)
     - the banh mi counter lists a "pickled daikon side" (main.gd:256)
   - Serving kra pao or lo bak go at these counters would blur Thai/Vietnamese and Cantonese/Vietnamese. It would also imply cooking at a business tied to a real address.
   - Eatery visits also feed the landmark tour count (study_test.gd:2122-2127), which would entangle tour objectives.

2. [docs/ROADMAP.md:97 vs P2] The roadmap still calls this a "hands-on resident cooking contest". A contest implies judging, which contradicts "no cultural correctness score". Rename it to shared meal in the same docs pass so later rounds don't bring judging back.

3. [P4 "no awards" vs P5 "without duplicate reward"] These contradict each other. Choose one explicitly.
   - Option 1: one feel-good burst or sound on the first Share of each dish per visit, none on repeats. This matches the eatery precedent (study_test.gd:1681-1683).
   - Option 2: no burst at all.
   - Either way, spark_count() derives from saved state only (main.gd:5759-5771), and cooking must not change it.

4. [P4 cooks] The plan doesn't say whether the new cooks are 3D people in the world.
   - There are five world neighbors today (main.gd:500-504).
   - Adding four bodies multiplies placement, collision, talk-target, camera and accessibility tests, and conflicts with "never move residents".
   - Recommend: in this slice, cooks appear only in the panel illustrations and through their own voices.
   - Existing residents can react as tasters, with no ethnicity assigned to them.

5. [P2 / brief l.26 script rendering] There are no font files under godot/ (glob returned none).
   - verify: the default font in the web export has no Arabic shaping, Thai or CJK coverage.
   - Use romanized names only in this slice. Otherwise missing-glyph boxes are likely.

6. [P4/P5 "actual world pixels"] At the default follow camera, dishes about 0.3m wide on a 4.6m table (main.gd:7484) will be tiny.
   - Bea's paper is already only meant to be viewed through manual inspection: inspection_rect is empty while following (bea_invitation.gd:120-122).
   - Reuse that pattern: cutaway_points plus pixel sampling, like PAPER_UVS and the snapshot samples (bea_invitation.gd:9, 124-132).
   - Give each dish distinct sample points and colors and a distinct silhouette. That makes "not the same tinted bowl" testable in the world, and the large panel art carries the semantic difference.

7. [P4 "Keep exploring retains ... current-visit prep"] Keeping half-finished preparation state across closes adds a third transient state on top of revealed cooks and shared dishes. It also complicates reset, load and import clearing. Either drop it (re-entering a dish restarts its short prep) or list every reset point explicitly, following story_picker.reset_visit (l.254-257).

8. [P5 acceptance breadth] The new journeys are not bounded, only the preserved matrices are. Set an explicit cooking matrix, for example:
   - all four dishes, Share, invitation chain and Follow/Keep exploring on the Long Table at desktop
   - Open Floor with two dishes at 390x568 and 320x667 by finger
   - one short-landscape Follow and one reopen
   - one reload, one reset and one import clear
   - one active-story refusal

OPTIONAL / NICE-TO-HAVE

- Prior-art and originality:
  - Venba (2023) builds its immigrant-family cooking around reconstructing a faded recipe and a loss arc. Avoid "restore the lost recipe" puzzles and grief-driven framing; they are also trauma-as-task risks.
  - Cooking Mama grades gesture mini-games. Avoid scored gestures.
  - Overcooked runs on timers, which the plan already excludes.
  - This game's own original hook is worth leaning on: cooks pass invitations to each other, and the meal builds up on a gathering the player already set up.
- mural_stories.gd:5 and l.58-62 already include a "Sharing a Bowl" vignette, which is a literally generic shared bowl. Keep the new dish art visually separate from it and don't reuse it.
- Options as I'd frame them:
  - A' (recommended): Option A plus the internal invitation chain (Must-fix 1) and the grounded-minimum steps (Must-fix 4). Entry is a 13th hub action reached through the suggestion jump. Panel only, world shows finished dishes.
  - B (potluck service): fold its "arrangement" part into A' as choosing where each finished dish sits on the table. Drop seating.
  - C (one deep dish): fails the creator's explicit scope covering four traditions in one feature. Keep it only as the fallback if Must-fix 4 leaves a dish with no grounded steps; then that cook appears with a sourced note and invitation only, clearly labelled.

CUT THESE

1. Option B's neighbor seating choices. They duplicate Thanh's Quiet Seats arc/pair arrangement (quiet_seats.gd:3; ROADMAP.md:83).
2. Arabic, Chinese and Thai script. Romanized names are enough, and the font risk is real (Should-fix 5).
3. Full separate art sets for each family variant. One variation per dish, shown as a small art change plus a cook line, satisfies "respect family variants".
4. Showing intermediate preparation states in the world. Keep them in the panel; the world shows only shared, finished dishes.
5. Placing the cooks as 3D world people (Should-fix 4).
6. Any general invitation or quest-journal mechanism. ROADMAP.md:16 already queues that as a separate item. The cooking chain stays local to the module.
7. The eatery-counter entry (Should-fix 1). Keeping two entry paths doubles the discoverability and focus tests for no benefit.

[ASSUMPTION] Coordinate slots in Must-fix 2 are estimated from the mesh literals in main.gd, not measured renders. Venba and Cooking Mama characterisations come from general knowledge, not repository sources.
