TOOL CHECK: PASS (read godot/main.gd, godot/quiet_seats.gd, godot/film_screening.gd, godot/rhythm_circle.gd, godot/mural_stories.gd, public/hosting.js, docs/ROADMAP.md, docs/BUILD_STATUS.md)

VERDICT: yes-with-fixes. The target is right. Of the four hosted segments, "stories" is the only one with no Godot presentation or resident consequence: beats has godot/rhythm_circle.gd, art has HostingArtTilePanel (godot/main.gd:2945), pause has godot/quiet_seats.gd. But the brief's method (the hub reader) cannot deliver its own goal ("large enough to appreciate") without the modal it calls optional. It also leaves the resident consequence and the completed re-read surface undefined.

MUST-FIX BEFORE BUILD

1. [Tentative opportunity: "large enough to appreciate" vs "using existing action-hub full scrollable reader"] The goal and the method diverge.
   - The hub reader is block_detail_label. Its minimum height is 20px compact / 30px otherwise (godot/main.gd:6703). The dock is 280-440px wide (godot/main.gd:6682-6683).
   - Quiet Seats' single 44px row already needed a special upward-growth branch so it stopped covering Find Me (godot/main.gd:6738-6745; docs/BUILD_STATUS.md:7).
   - The hub has no room for a large illustration at 320x667 or 559x360. So "large" is reachable only through the "optional" viewer, which is the most expensive piece.
   - Fix: decide explicitly. Recommended: the hub carries only the two named choices plus Bea's text. The illustration goes on a world prop, textured from a NEW original SVG using the existing SVG-to-texture path (godot/film_screening.gd:193-207, world=true branch; FilmFrameCanvas at godot/main.gd:3050-3057). Players appreciate it with the existing Find Me/zoom/manual camera. That is the same visibility standard Quiet Seats accepted ("Meaningful world-pixel proof uses real FindMe/zoom/pan, not universal default-overview visibility", docs/BUILD_STATUS.md:6). No new modal.

2. [Preserve existing two STORY_CHOICES/public prior art] Godot has no human-readable story titles.
   - HOSTING_STORIES holds ids only (godot/main.gd:96).
   - A grep of godot/ finds neither "A small moment you want to keep" nor "Something you hope to make together".
   - Shift+Z currently announces the raw id: "Story circle invitation set to %s." with next_st = "future"/"memory" (godot/main.gd:9650-9652). Screen-reader users hear "set to future".
   - Fix: add a Godot TITLES table copied verbatim from public/hosting.js:4, mirroring the TITLES table in godot/quiet_seats.gd:3. Use it for the button accessible names, the Shift+Z announcement and Bea's reader text. This is a correctness fix within scope, not layout polish.

3. [Named tappable choices; Quiet Seats prior art] Do not add a second, parallel hub row.
   - godot/quiet_seats.gd:20-46 inserts its own row before block_page_nav.
   - godot/main.gd:6738 hardcodes `quiet_seats.row.visible` into the hub layout.
   - The hub detail text special-cases only "pause" (godot/main.gd:14724-14725).
   - "stories" and "pause" can never be active at the same time (current_hosting_activity, godot/main.gd:9516-9519).
   - A cloned story row therefore duplicates the layout special case and the modal-close refresh path. That is exactly where Quiet Seats regressed (docs/BUILD_STATUS.md:7: "Full1 genuine progression caught Circle Complete restoring a hidden new row").
   - Fix: either make the existing choice row activity-agnostic so stories and pause share one row, or replace the main.gd:6738 check with one shared predicate (e.g. hosting_choice_row_visible()). Add a "stories" branch beside main.gd:14724.

4. [Resident/project consequence: "compare a genuinely meaningful resident/project consequence"] The obvious consequence already exists as prior art and is missing in Godot.
   - Thanh got a copied-result memory line in Quiet Seats (godot/main.gd:10246-10247). Bea has no equivalent in neighbor_project_memory_line (godot/main.gd:10212-10250).
   - The browser already gives Bea a stories response (public/hosting.js:61-64).
   - Fix: add a Bea branch directly after main.gd:10246, at the same precedence (film/civic memories still win). Derive it from get_hosted_segment_value("stories").
   - This also gives the brief's "completed re-read" requirement a surface. The brief never names one, and Godot has no Field notes/journal (a grep of godot/main.gd for "field notes|journal" returns 0 matches). The choice row hides once the activity is no longer active (quiet_seats.gd:109 pattern). So after completion the only re-read surfaces are Bea's talk memory line and the world prop.
   - State this explicitly. Either keep Bea's anecdote short enough for the scrollable talk reader, or declare that the full anecdote is readable only while "stories" is active.

5. [All prose/art original; originality limits] There is a concrete duplication risk.
   - The browser "future" response already uses "Someone imagined a garden in a box. Someone else offered seeds." (public/hosting.js:64).
   - Godot Mural Stories already ships "Growing Together" (two neighbors tending a portable planter, godot/mural_stories.gd:75-80), "Sharing a Bowl" and "Cooking Together" (godot/mural_stories.gd:3-6).
   - A "something you hope to make together" card defaults to a planter or a shared meal, which re-draws existing scenes.
   - Fix: name non-overlapping motifs for each card BEFORE drawing, and exclude the garden/planter, food/bowl, painting and guitar vocabulary. The anecdote and the new Bea memory line must not repeat each other. Example motifs, [ASSUMPTION] on creative fit only: memory = a kept folded note or ticket stub; future = a hand-drawn paper plan or folded bunting.

6. [World consequence on LongTable/OpenFloor; "do not move named anchors"] Creative coherence and placement.
   - The source labels the Long Table "Bea's" (godot/main.gd:7235) and the Open Floor "Dez & Celeste's", with a riser and mic (godot/main.gd:7273, 7285-7287) and Celeste's lettering panel (godot/main.gd:7289-7291).
   - Story paper on the riser/mic reads as "step up and perform". That contradicts "Telling a story and listening were equally welcome" (public/hosting.js:54) and "Nobody had to perform" (public/hosting.js:55).
   - Fix for OpenFloor: place the prop at the floor stool cluster (godot/main.gd:7292-7305) or on the tile field. Never on the riser, mic or lettering panel.
   - Fix for LongTable: clear the teapot at x=0 and the cups at x=+/-0.9 and +/-2.2, z=0.2 (godot/main.gd:7263-7265).
   - In both layouts, clear the Quiet Seats occupied stools: table indices [3,4,5] or [0,1,7], plus the cushion (godot/quiet_seats.gd:133-145). After full hosting, both scenes are visible at once in every valid order.

SHOULD-FIX

1. [Naming] "Story card" collides with existing identifiers.
   - godot/main.gd already has story_card, is_story_card_visible() (godot/main.gd:7194) and story_reader_has_focus() (godot/main.gd:7129). These act as modal guards (godot/rhythm_circle.gd:516, godot/film_screening.gd:105).
   - The name space also holds the "Read Local Stories" Voices button (godot/main.gd:14788) and Mural Stories.
   - A "story invitation card" will produce ambiguous identifiers and snapshot keys, and confuse players. Use "invitation" naming for the module, nodes and snapshot keys (e.g. bea_invitation.gd).

2. [Bea anecdote; hidden assumption that a host's own story is neutral] The project's stance is consent-first. Celeste says "Nobody owes us their story" (godot/main.gd:10240). Frame the anecdote explicitly as Bea's own example, end it by restating that listening is welcome, and imply no expectation that anyone share.

3. [Draft vs copied result; completed re-read without inactive setters] Define the world/hub state exactly as quiet_seats.choice() does (godot/quiet_seats.gd:97-101): hidden before block open or before stories, draft while active, copied result after completion.
   - host_set_story already rejects inactive edits (godot/main.gd:9554). Keep viewing write-free.
   - Stories can be hosted in any slot that programme_issue permits (godot/main.gd:9322-9326, 9465). The checks must include a stories-after-pause order and a browser v1 import with stories already hosted (precedent: godot/tests/study_test.gd:1155).

4. [Assumption surface] State these in the plan instead of leaving them implicit:
   - (a) No new save key or version, and SAVE_BUDGET_MAX_BYTES 4096 is untouched (godot/main.gd:104). The last full-progression saves were 1729 B (docs/BUILD_STATUS.md:8).
   - (b) Rasterizing a new SVG at setup or first show is acceptable for pack size and runtime. Verify: pack size against the Quiet Seats 1766168 B (docs/BUILD_STATUS.md:8).
   - (c) "all5gates" and "native and actual mouse/finger/browser acceptance" mean the exact gate list in docs/BUILD_STATUS.md:8. Cite it so r3 does not renegotiate.
   - (d) Music, Sounds and camera ownership stay untouched. The feature adds no audio and no camera framing beyond the existing common cutaway points (quiet_seats.gd:170-177 precedent).

5. [Arc framing vs "Do not repeat ... Circle/readers/hubs"] The method leans on the hub reader plus an optional reader-style viewer, which are the very categories BUILD_STATUS says not to repeat (docs/BUILD_STATUS.md:9; input line 2). Frame the feature as completing the Godot presentation of all four hosted segments, the one gap left. Keep the hub work limited to the shared row from MUST-FIX 3. Otherwise this reads as "Quiet Seats again" with nothing new.

OPTIONAL / NICE-TO-HAVE

- Recommended single bounded feature: MUST-FIX 1+2+3+4+6 together.
  - One shared choice row and the verbatim titles.
  - Bea's short fictional anecdote in the hub reader while "stories" is active.
  - One standing illustrated invitation prop per layout, derived from draft or copied result.
  - Bea's copied-result memory line.
  - Small-to-medium scope; reuses existing contracts only.
- Alternative A (resident consequence only, smallest): titles, the announcement fix, the shared row and the Bea memory line, with no art. Lowest risk; little visual payoff.
- Alternative B (atmosphere, reuses an existing anchor): once stories is copied, the stories bar on the existing ProgrammeSignboard (godot/main.gd:2920-2943; segment colors at godot/main.gd:2812-2815) gains a small original invitation glyph. No new prop and no layout clearance work. Verify: whether programme_segment_bars can carry a texture without changing the frozen programme SVG (godot/main.gd:9328).
- Rejected: a new facade or board near Bea. The area is already crowded with the ProgrammeSignboard at -1.85, the KeepsakePhotoEasel at +1.85 and CivicListeningSetup at +3.40 around neighbors[0].pos (godot/main.gd:2867, 2922, 2975), and the brief forbids new facades anyway.

CUT THESE

1. [Optional large read-only illustration viewer] Cut it.
   - godot/main.gd has 38 occurrences of the four existing modal-visibility predicates (is_story_card_visible / is_rhythm_circle_visible / is_film_screening_visible / is_mural_workshop_visible, definitions included). More sit in godot/film_screening.gd:105 and godot/rhythm_circle.gd:516.
   - A new modal must join those mutual-exclusion guards and copy the saved_visibility / return_focus / resize handling (godot/film_screening.gd:103-132, 169-191).
   - Quiet Seats shipped explicitly with "no ... modal" (docs/BUILD_STATUS.md:5).
   - Safe to cut: the world prop plus the existing zoom meets "appreciate" under the accepted standard (docs/BUILD_STATUS.md:6). Revisit only on human feedback.

2. [Flat "story paper" lying on surfaces] Replace it with one standing card per layout. A flat sheet of about 0.3 m lying on the table or floor is likely illegible from the isometric camera. [ASSUMPTION] on camera distance. Verify: a Find Me + zoom capture on both layouts at 320x667 and 1100x760.

3. [Any third invitation, free-text story entry, or audio/Music tie-in] These are already out of bounds (input line 8). Do not let pressure to be "playable" reintroduce them. The playable agency is choosing between the two existing invitations.

4. [Any Bea pose, gesture or movement] Named residents do not move (input line 8; Quiet Seats used only anonymous visitors, godot/quiet_seats.gd:47-78). Cut any Bea animation.
