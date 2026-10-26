TOOL CHECK: PASS (read godot/film_screening.gd, godot/main.gd, godot/hosted_afternoon.gd, godot/shared_panel.gd, docs/BIG_ENDING_PLAN.md, and the input brief).

VERDICT: yes-with-fixes. The slice is sized right, but the brief treats the copied art as if it were part of the film, its main payoff would duplicate a panel that is already standing in the world, and nothing ties it to the ending arc.

MUST-FIX BEFORE BUILD

1. [Entry and earned invitation] The brief asks the game to "Recognize the actual final copied shot and original hosted art palette/shapes" as if the film contained the hosted art. It does not. build_film_frame_svg draws a fixed, hard-coded panel for the "paint" shot (pink circle and blue arc, godot/main.gd:9762). It never reads hosting_results. The film and the six-tile art are separate artifacts, kept in separate save blocks.
   Fix: state the invitation's recognition line as two separate facts. (a) The final shot comes from film_result.order[2], as film_screening.gd:154 already does. (b) The palette and shapes come from hosted_afternoon.copied(game,"art"). Never imply that the film shows the player's panel.

2. [Option A/B "copied art panel" + Acceptance 2] The copied six-tile art is already a permanent world prop. HostingArtTilePanel sits at MURAL_POS+(2.35,0,0) (godot/main.gd:2991-2993). It is visible whenever block_opened and the art value is a Dictionary (main.gd:3182-3192), and shared_panel.update_world repaints it (godot/shared_panel.gd:252-274). A "portable display" of the copied panel would therefore be a second copy of art that is already 2.35 m from the mural. That is a weak "visible consequence," and it brings up an unasked question: which copy is canonical?
   Fix: choose one of these explicitly before building.
   (a) The helper carries the existing panel to the gathering. It is shown at the gathering pocket for this visit, and its original mount shows a small "lent to the gathering" placeholder. One instance stays at all times, which matches "keep only one display."
   (b) The stand displays something that does not exist yet, such as the three film frames together as a triptych. That uses film_screening.texture(...,world=true) at film_screening.gd:193.
   Either way, write down which source the stand renders from and how it relates to HostingArtTilePanel.

3. [Ending arc coherence; BIG_ENDING_PLAN §Playable arc 1-2] The plan says stage 1 should "Meet an original fictional robotics collaboration through familiar residents." The brief never says who built or runs the robot, why a helper robot is on Turk & Taylor, or how this work leads into stage 2 ("Pack what makes this home"). The game currently has no robots or space content anywhere. A grep for robot, habitat and launch across godot/*.gd finds only an NPS "dune habitat" citation in godot/before_streets.gd:13. The game is grounded and careful about provenance, so this slice is the tonal hinge for the whole ending, and the brief leaves it undesigned.
   Fix: add a short concept paragraph covering three things.
   - The fictional origin of the helper, framed through a named existing resident, with a speculative-fiction label shown in game (BIG_ENDING_PLAN §Production acceptance asks for this label).
   - One sentence of dialogue that seeds the "future neighborhood" without promising travel.
   - A statement that stage 2 will re-derive from durable copied data (film_result, hosting_results), not from this visit-local prop. Without that statement, the next round will either need persistence it was told not to add (Acceptance 4) or will silently drop the workshop.

4. [Acceptance 2 "visible this visit in BOTH Long Table and Open Floor" vs Acceptance 6 "genuine" journeys] Any real player sees only one layout:
   - Once block_opened is true, choose_gathering_layout refuses to change the layout (main.gd:7645).
   - The film requires block_opened (is_film_available, main.gd:10262).
   - update_layout_3d shows only the chosen layout (main.gd:7633-7640).
   So genuine progression can only ever exercise one pocket.
   Fix: restate the requirement. Each layout has its own pocket, and the two need not match. The genuine journey checks whichever layout the existing progression picks. A labeled private fixture covers the other layout. The "occupied by OpenFloor's lettering panel" note matters only if one shared position was intended. That lettering panel is at floor-local (-5.3,1.05,0) (main.gd:7577) and is hidden when the table layout is chosen. Note also that the sawhorses at ±6.3 (main.gd:7510) and the light poles at x ±5.9, z ±1.25 (main.gd:7607-7609) are shared by both layouts and bound any west-end pocket. verify: colored_box half-extent vs full-size semantics before measuring the clearance between the table end and the barricade.

5. [Entry and earned invitation] Placing the invitation inside the film viewer buries an earned surprise. That viewer opens only from the hub button "Watch Film (n/3)" (main.gd:15575-15576, 15882-15884) or from F4 (main.gd:14732-14733). On narrow viewports the hub is paged 4 actions per page across 13 actions (main.gd:848, 856, 7048-7051). A player who never replays the film will never see the invitation, and BIG_ENDING_PLAN §Earn the invitation asks for a resident to deliver it.
   Fix: deliver the invitation once from a resident at the moment it is earned (film completion, film_capture_shot main.gd:10421-10428, or the next chapter/hint surface), then keep the viewer row as the place it remains available. That is two surfaces with one deliberate activation, and neither is a new global selector.

6. [Acceptance 5 "F5/F6"] The list of hotkeys to preserve is wrong and leaves out the entry point itself. The function keys are F2 mural, F3 rhythm, F4 film screening, F5 listening, F6 programme, F7 shared panel and F8 power story (main.gd:14724-14737). F4 is the film viewer, which is the proposed host for the invitation.
   Fix: list F2-F8 and Shift+F8 (main.gd:14653), and state whether the workshop gets a key (I recommend it does not).

SHOULD-FIX

1. [Ground current source / shared_meal & before_streets bullet] The phrase "do not inherit incomplete guards blindly" points at a real gap the brief should name. The guard in film_screening.open_screening (film_screening.gd:105) does not check before_streets, shared_meal, voting, lantern, dog, power or story_picker. Those are all in is_focused_activity_visible (main.gd:12097-12098).
   Fix: the new Control's open guard should be is_focused_activity_visible() plus startup_story_pending, is_story_card_visible() and current_path, not a copy of film_screening's list. verify: whether those siblings can actually be visible while the film tray is reachable.

2. [Acceptance 3/4 reset boundary] The visit-reset hooks are copied by hand into three places:
   - reset_mural_state_to_defaults (main.gd:12516-12541)
   - apply_save_envelope (main.gd:13018-13045)
   - the success path of import_browser_save_json (main.gd:13595-13618 and 13717-13718)
   Unhandled input is a hand-ordered if-chain (main.gd:14649-14712).
   Fix: name all four integration points in the brief as required edits. The workshop is the first stateful 3D-plus-UI feature with an in-world prop, so missing one means the prop survives a load.

3. [hosted_afternoon contract] The brief rightly prefers copied(game,"art") (hosted_afternoon.gd:7-21), but the existing world panel uses a looser check. update_block_3d tests only `art_val is Dictionary` and defaults missing tiles to 0 (main.gd:3184-3191). Imported hosting_results are taken without per-value validation (main.gd:13682-13686).
   Fix: define what happens when the film is valid but copied art is invalid, because an import can produce that state. Either (a) offer no invitation and show one honest line, or (b) the invitation works with a neutral stand that has no panel. Do not let the new prop follow the 3184 pattern.

4. [Option A, SubViewport question] The brief asks this question but does not frame it as a cost. Every existing focused activity is a full-rect Control that hides its siblings (film_screening.gd:110-113). A true 3D bench needs either a SubViewport, which is a new rendering surface with web/phone GPU and memory cost and none in source today (verify: grep SubViewport), or the main camera, which Acceptance 5 forbids.
   Fix: treat this as a cut decision now, not a question to research during implementation (see CUT 1).

5. [Request "Build another stand/replacement policy"] Defining a "Build another" flow is scope creep on top of a two-option result.
   Fix: after finishing, reopening shows the finished stand read-only, with one deliberate "Rearrange as <other option>" action that replaces it in place. One display, no second build loop.

6. [Named resident response] Celeste as the respondent fits, because she owns the art segment (hosted_afternoon.gd:4, 43-45). But if fix 2(b) is chosen (film triptych), the earned voice is Dez (film_screening.gd:155).
   Fix: tie the respondent to whichever artifact is displayed.

7. [Primary prior art] The three cited works cover a cargo bot, building a boat and a ship-crew sim. None is "community-led robotics," which is what BIG_ENDING_PLAN §Production acceptance requires r1 to research. They support later stages (departure/habitat), not this slice.
   Fix: either research helper or assembly precedent specifically, or say plainly that originality for this slice is unestablished.

OPTIONAL / NICE-TO-HAVE

- Compute the robot's parked pose from the selected layout's pocket, so the robot in the world stays a still prop after the task and no idle animation runs behind other activities (BIG_ENDING_PLAN: "Quest switching does not leave robot movement ... running").
- Avoid the word "workshop" in code identifiers. MuralWorkshop / is_mural_workshop_visible / mural_workshop (godot/mural_workshop.gd:39; main.gd:12109-12110) already exist, and F2 opens them. A name like helper_bench avoids test-selector and announcement collisions.
- verify: the runtime cost of adding genuine post-film steps to all three viewport journeys in tests/godot-browser.mjs before committing to "genuine at 1100/390/320." [ASSUMPTION] each full progression is already expensive, given that Acceptance 7 bans gating after every leg.

CUT THESE

1. Option A's real-time 3D assembly bench. It needs either a new SubViewport surface or a camera takeover, and the brief forbids the second ("Reject ... new physics/camera system"). Option B's illustrated jig in a focused Control gives the same deliberate staged actions; the real 3D payoff comes from the world prop afterwards. It is safe because Acceptance 2's in-world consequence remains fully 3D.
2. Option C (planter/table from seating choices). The copied seating is already rendered by quiet_seats/bea_invitation update_world (main.gd:3151-3152), and the brief itself says to "preserve earned results." Moving or reshaping those props puts earned results at risk for a payoff no stronger than the display.
3. The "still/instant option provides identical result" as a separate mode. Fold it into the existing quiet/reduced-motion preference: the robot step is a discrete stage change with an optional tween, not a second path to build and test.
4. The "Build another" flow (SHOULD-FIX 5).
5. Process material inside the design spec: [Exact scoped pass], Acceptance 7, model/quota/provider wording, and the "notify creator / switch back to Sol" note in [Player outcome and scope]. These are runbook items, not design. They make the spec harder to judge and are safe to move to session_handoff.md.
