TOOL CHECK: PASS. I read these files directly:
- godot/main.gd
- godot/tests/study_test.gd
- tests/godot-browser.mjs
- r3/input.md, review_scope.md and driver_anchor.md

I grepped tests/godot-data.test.mjs; it does not reference 520/560/dock. I had no git or shell tool, so I could not diff against 4fc6f5e. My claims about baseline behaviour rest on the document plus the prior r3 at kibitz-runs/2026-10-21-codex-small-landscape-hub/r3/claude.md. Those claims are marked [ASSUMPTION] below.

VERDICT: yes-with-fixes.
- The predicate change is wired consistently: SIDE_ACTIVITY_MIN_WIDTH=520 (main.gd:796) feeds uses_short_side_panels (6591-6593), then panel_uses_side_dock (6595-6596), then has_side_panel_dock and compact controls (6609-6622), then layout (6634-6702) and play_area_rect (6844-6849).
- The problem is that the framing evidence only covers focus-before-show. The main real path (walking arrival at Celeste/Rook) shows a docked panel with no panel framing. No gate has final evidence yet.

Wiring I verified, so no action is needed:
- **Dock geometry:** at 520 the dock minimum is 280 (6634-6635). The panel's left edge is 520-292=228 (6687-6688). Controls end at 520-300 (6636). Scene width is 228-8-8=212 against the 200 oracle (study_test.gd:3564, godot-browser.mjs:245).
- **Hidden panels:** they use the same dock geometry (6681). focus_mural_camera calls frame_activity_camera, then layout, then remember_panel_framing (8771-8777). refit_panel_camera returns early while the panel is hidden (8800). show_mural_panel/show_music_panel then lay out and do a synchronous refit (14073-14075, 14093-14095). The order is correct.
- **Info growth:** header_panel.resized (14765-14771) fires in the dock because uses_compact_activity_controls() is true (6610). It defers layout and runs the generation-checked refit (8787-8796). The manual pose guard is at 8800.
- **Close:** with no panel visible, uses_short_narrow_walking (6612-6616) makes columns 3 / offset_top -116 for 520..599 at short height. study_test.gd:3649-3650 matches this.
- **Snapshot keys** used by the browser oracle exist: compact_narrow_activity 11335, compact_panel_layout_pending 11338, panel_subject_points 11341, controls_control 11329.
- **Counts:** 9 mouse sizes x3 = 27 and 4 touch x3 = 12, so 39 matches godot-browser.mjs:217 and 1836.
- **External systems / config:** this change makes no third-party calls. PLAYWRIGHT_MODULE and GODOT_PORT are unchanged (godot-browser.mjs:25-26). There are no env, flag or secret changes and nothing touches public/ or the save schema.

MUST-FIX BEFORE BUILD:

1. [Gates / ordering] The document says the "targeted actual preflight is in flight, not final proof", so none of the five gates has passed on the final source.
   - Required order after the last main.gd edit:
     1. native GODOT_STUDY_PASS (no ERROR/WARNING)
     2. npm godot:export
     3. check
     4. >=104 Node
     5. full browser 1100x760/390x667/320x667 with errors=[] and external=[]
   - Any main.gd fix from this review makes the pck stale. The browser fails fast on that (godot-browser.mjs:10-22, pck mtime >= main.gd), so re-export before the browser run.
   - Fix: run all five in that order and quote the real pass lines.

2. [Passive Celeste/Rook arrival leaves the player and subject under the 520..559 dock; untested] Several arrival paths open a docked panel while following_player is still true:
   - finish_mural_arrival (main.gd:8640-8651)
   - finish_speaker_arrival (8674-8681)
   - the Celeste and Rook branches of finish_neighbor_arrival (8565-8567, 8582, 8599)

   Why it fails:
   - walk_to_* sets following_player=true through resume_walking_view (7894-7901).
   - None of these paths calls focus_*_camera or remember_panel_framing, so panel_frame_control stays null. walk_to_mural cleared it via show_block_panel(false) at 8063 and 14105-14106.
   - refit_panel_camera therefore returns at 8800, and refit_panel_after_layout does too (8793: uses_short_narrow_walking is false while a panel is visible).
   - update_camera only fits the body for the hub or short walking (13791). The camera simply looks at the player (13786-13787), so the player lands at the viewport centre: (260,180) at 520x360.
   - The dock covers x 228..508, so the enlarged player/YOU and Celeste/Rook end up under the panel.

   Reachable paths:
   - the conversation action "Paint with Celeste" when not already at Celeste: open_mural_from_block_panel goes to walk_to_mural (8922-8927), then finish_mural_arrival.
   - passive Rook arrival (study_test.gd:643).
   - immediate arrival (study_test.gd:578-579, which asserts only panel.visible).

   Why the oracles miss it: every framing oracle uses focus-before-show.
   - study_test.gd:3537-3552 and 2949-2954.
   - Browser KeyE/KeyR (godot-browser.mjs:222) go through talk_with_celeste (8843-8849) and check_sound_with_rook (8884-8890).
   - panel_subject_screen is {} when panel_frame_control is null (11340). So the browser would not even get a subject point for this path.

   [ASSUMPTION] This is pre-existing at >=560 docks (centre 280 vs dock left 236 at 560) and in the old bottom layout (centre y 180 inside y100..248). This diff carries it into 520..559 and claims "real people/props/player/YOU fitting" for the band.

   Fix:
   - First, in verify_short_activity_panels at 520x360 and 559x360, add the immediate-arrival fixture from study_test.gd:571-579 (walk_to_mural() / walk_to_speaker() from the stand point). Assert play_area_rect().grow(1).encloses(player_overlay_rect()) and every panel_subject_snapshots() point in play_area_rect().
   - If that fails, the smallest code fix uses the existing idiom from open_mural_from_block_panel (8924-8925). Call focus_mural_camera() after show_mural_panel(true) at 8582 and 8651, and focus_speaker_camera() after show_music_panel(true) at 8599 and 8681.
   - focus_* sets view_size=45.0 (8752), so study_test.gd:580's view_size==45 still holds.

3. [Placed mural motif labels clip in the 280px dock; complete-label requirement unverified]
   - After a motif is placed, motif_button_text (main.gd:14139-14144) returns "%s%s (%d,%d)" with a "> " prefix when active. The short form ("Add X") only applies to unplaced motifs.
   - Row 2 holds three buttons (14559-14564). The dock content width is 280-16=264 (panel margins 14164-14165 / 14440-14441). Minus 2x4 separation, each button is about 85px. Minus button margins 8+8 (14410-14411), the text box is about 69px at font 13 (6668-6669).
   - "> Wave (3,2)" is 12 glyphs. [ASSUMPTION: this exceeds ~69px at 13px.] mural_button sets clip_text=true (14816), so the label truncates silently.
   - At >=560 the box is about 80px, so this new band is strictly worse.
   - Neither suite places a motif before the 520/559 mural checks. study_test.gd:3537-3574 uses current state; the browser taps only Hint and Chat (godot-browser.mjs:227-232).
   - Fix: in the 520x360 mural case, place and activate a motif (e.g. study.move_active_motif(1,0), 11570). Then re-run the 3572-3574 text_fits loop. If it fails, drop the parentheses or the "> " prefix in short mode inside motif_button_text. Do not widen the dock.

SHOULD-FIX:

1. [Self-referential native oracle, study_test.gd:3623 and 3636] The expected anchor_left is computed from study.SIDE_ACTIVITY_MIN_WIDTH, the very constant under test. If someone reverted it to 560, both checks would still pass. Only browser godot-browser.mjs:241 (a hard-coded 520) would catch it. Fix: use the literal 520 here, as 3511 and 3618 already do, or add require(study.SIDE_ACTIVITY_MIN_WIDTH == 520) once.

2. [Neighbor coverage gap, study_test.gd:3502-3513] All five neighbors are checked only for person and player visibility. Dock bottom, header clearance, 44px and text_fits (3563-3574) run only for neighbor 0 (3530). This matters because:
   - Action labels vary by partner and objective (main.gd:6403-6458). "Talk to %s", "See Compton's Plaque", tour_action and programme/civic/film button text are not shortened by 6568.
   - In the dock, conv buttons autowrap (6660-6661), so they grow taller instead of clipping.
   - block_panel is excluded from the separation squeeze (6682-6686).
   - Fix: inside the neighbor loop, for 520..559 x <560, assert block_panel end.y <= vp.y-12 and run the activity_detail_snapshot button loop.

3. [Deferred growth no longer re-laid out at 520..559, main.gd:6705] queue_compact_panel_layout returns unless uses_compact_narrow_panels() is true. That is now false for docked activities in this band because of the `not uses_short_side_panels()` at 6600. Before the change, these sizes had the deferred relayout.
   - In the dock, the panel uses GROW_DIRECTION_END (6690) and its bottom is never clamped after a caption change.
   - The only growth probe runs at 320x568 (study_test.gd:3592-3603).
   - Fix: run the same probe at 520x360 for the conversation panel and assert panel end.y <= 348. If it fails, gate with `uses_compact_narrow_panels() or has_side_panel_dock()` at 6705 and 6720.

4. [Walking controls beside the 280 dock: native has no label-fit check]
   - Controls are 520-12-300 = 208px wide with 3 columns (6636-6637). [ASSUMPTION: GridContainer h_separation is 4, so ~66px per button and ~50px of text space for "Find Me" at 12px.]
   - Only the browser asserts text_fits here (godot-browser.mjs:252). Fonts differ between the web export and native.
   - Fix: add a walking_control_snapshots() (main.gd:11199-11209) text_fits/44px loop in verify_short_activity_panels for sizes 520..559 x <560.

5. [Aggregate count hides band regressions, godot-browser.mjs:1836] The total of 39 would still pass if 520/559 were swapped for other sizes. Fix: also assert narrowActivityChecks.filter(c => c.width >= 520 && c.width < 560 && c.height < 560).length === 12 (2 sizes x 3 kinds x mouse+touch).

OPTIONAL / NICE-TO-HAVE:
- The dock width jumps at the seam: 290.7 at 559 becomes 312 at 560 (6634-6635). The scene shrinks by about 21px for 1px more viewport. This is accepted because >=560 must stay unchanged; it is documented here only.
- Two constants now hold the same breakpoint: SIDE_ACTIVITY_MIN_WIDTH and SMALL_SIDE_HUB_MIN_WIDTH (796, 798). Consider `const SIDE_ACTIVITY_MIN_WIDTH := SMALL_SIDE_HUB_MIN_WIDTH` so the hub and activity bands cannot drift. Only do this if main.gd is already being edited.
- The scene margin is 12px over the 200px oracle at 520 (212 vs 200). It is fine, but any later dock padding change will trip it.

CUT THESE (over-engineering):
1. The `(panel == block_panel and uses_side_block_hub())` clause in panel_uses_side_dock (main.gd:6596) is now dead.
   - uses_side_block_hub needs x>=520 and y<560 (6588). That implies uses_short_side_panels (6593), because both thresholds are 520, and uses_short_side_panels has no visibility condition.
   - Removing it is safe. Do it only together with another main.gd fix, so the gates are not re-run for a no-op.
