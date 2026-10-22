TOOL CHECK: PASS. I read godot/main.gd, godot/shared_panel.gd, godot/loan_homecoming.gd and docs/CONCEPT.md directly. Line numbers below are from HEAD c1c073f as it is in the working tree.

VERDICT: yes-with-fixes. The document doesn't pick a slice yet, which is fine for an ideas pass. But it has one false source lead, and its "transformer hero" framing pulls against CONCEPT.md. Neither options A, B nor C, as worded, says how the world can visibly show light coming back zone by zone with the lighting hooks the code has today. All three gaps should be closed before any option is chosen.

MUST-FIX BEFORE BUILD

1. [Source leads, para 4] A source lead points at a function that doesn't exist. `update_day_evening_lighting` (around line 4883) isn't in godot/main.gd; a grep finds no match anywhere under godot/. The real hooks are `apply_time_of_day()` (godot/main.gd:4884-4898), `toggle_evening_lights()` (godot/main.gd:4900-4907), and Shift+L in `_input` (godot/main.gd:14251-14253). Plain L is `wide_overview()`.
   FIX: Replace the lead with those three locations. Any option that "returns world light" has to say whether it drives `apply_time_of_day` or works alongside it.

2. [Option A "world light return" / para 5 "visible world payoff"] The global lighting hooks are all-or-nothing, so they can't show three separate stations coming back.
   - `night_glow` is one uniform on one shared `building_shader_material` (godot/main.gd:1041, 1051-1058, 4898).
   - Every storefront and lamp light pool is merged into a single `StorefrontLightPools` MeshInstance3D with one `light_pool_material` (godot/main.gd:4871-4882, 4896).
   With these hooks, "repair station 2" can only dim or brighten the whole district at once. That's a global fade, not a neighbourhood lighting back up block by block.
   FIX (smallest change): Show each station's restoration through props that already have their own material.
   - The 3 `GatheringLantern%d` meshes (godot/main.gd:2855-2866).
   - The 7 hand-placed `StreetLamp_%d` globes (godot/main.gd:3946-3978). Their positions are already fictional and stylised, and they're snapped with `sidewalk_safe_point`.
   Each uses `mural_material`, which builds a fresh StandardMaterial3D with emission 0.35 per call (godot/main.gd:2590-2594, 7578-7583). Per-prop emission changes therefore stay isolated.
   Keep the global `night_glow` and pool alpha as one final "district back on" beat. Don't add a world-position zone mask to the shared building shader in the first slice: every existing building pixel would depend on the new default.

3. [Para 6 lifecycle / Option A] The outage's interaction with the evening toggle isn't specified.
   - `evening_mode` (godot/main.gd:873) defaults to false, i.e. daylight.
   - In daylight `night_glow` is already 0 and pools sit at `DAY_LIGHT_POOL_ALPHA` 0.28 (godot/main.gd:219), so a daytime outage barely shows.
   - During an outage, Shift+L calls `apply_time_of_day()`, which writes `night_glow` straight back to 1.0. That silently "restores" the district (a free win) or leaves the visuals out of sync with the outage state.
   FIX: Decide all three now:
   (a) Starting the outage forces evening and remembers the player's previous `evening_mode`.
   (b) While the outage is active, Shift+L is either refused with an announced reason or routed through the outage state. It must never reach `apply_time_of_day` unguarded.
   (c) Ending, aborting or reloading restores the exact earlier `evening_mode` and calls `apply_time_of_day` once.

4. [Para 2-3 "fix transformers and be a hero" vs para 3 "peaceful residents/cooperation", "never actual electrical repair"] The framing contradicts itself and CONCEPT.md.
   - Civilians repairing a city transformer is exactly the real-grid, real-repair picture para 3 forbids.
   - A lone hero is at odds with docs/CONCEPT.md:7 ("work alongside residents"), docs/CONCEPT.md:31 (no universal score, no "chores solve structural poverty") and docs/CONCEPT.md:73 (not an emergency-services resource).
   FIX: Change what's broken, not the hero fantasy. The fictional equipment is the gathering's own portable, festival-scale kit: "lantern relay carts" or a "stage power trunk". It's owned by the block event, the same way the loan kits in godot/loan_homecoming.gd:1-11 are fictional borrowed gear. Each station is unlocked by a resident's knowledge or a tool, and the player is the one who connects them.
   Also state that the cause is neutral (a storm, an overloaded fictional trunk). It must never be blamed on residents or unhoused people, per CONCEPT.md:31.

5. [Para 3 "tangible puzzle agency" / no failure] The puzzle mechanic is never defined. The one obvious off-the-shelf candidate breaks existing rules.
   - Colour-matched wires (prior art: Among Us "Fix Wiring") break docs/CONCEPT.md:47, which requires shape/text cues as well as colour.
   - A timed version breaks para 6 ("No automatic ... timers").
   - CONCEPT.md:47 also rules out a failure state.
   FIX: Require one untimed, order-agnostic mechanic that never fails, with three variations. For example: rotate fictional connector tiles so a shaped symbol path links a resident's prop to the station, with text labels and shapes alongside colour. It must work identically with click, tap and keyboard focus. Say outright that there is no lose state, only "not yet connected".

6. [Para 6 "player movement versus focused repair panel"] Reusing the shared_panel pattern produces exactly the "settings worksheet" para 3 rejects.
   - `shared_panel.open_panel()` hides every sibling Control, refuses to open while a path is active, and requires the hosting state (godot/shared_panel.gd:120-139, 110).
   - `is_focused_activity_visible()` gates world input (godot/main.gd:11743-11744).
   A full-screen modal per station turns the adventure into three forms.
   FIX: Each phase is "walk to the station in the world, then a small anchored repair overlay". The puzzle surface sits over the 3D scene with the world still visible; at most it hides the hub, not every sibling. The overlay only appears on arrival, using the existing arrival/`ARRIVAL_DISTANCE_M` pattern (godot/main.gd:11759).
   Decide whether the overlay counts toward `is_focused_activity_visible()`. If it does, camera fitting and walking stop (godot/main.gd:14322). If it doesn't, F3-F7 and resident keys stay live during repair and need their own guard.

7. [Para 6 "start availability"] Start conditions are missing, and an F-key start doesn't work on touch.
   - F2-F7 are all taken (godot/main.gd:14097-14108). F-keys don't exist at the 390x667 and 320x667 touch sizes that para 7 requires.
   - Touch entry for peers already goes through `run_conversation_action_id` (godot/main.gd:6555-6576).
   - The lanterns that are the natural payoff are hidden until `block_opened` (godot/main.gd:2867, 3113).
   FIX: Start from a resident conversation action id (e.g. `"outage"`), with keyboard access through the normal conversation UI rather than a new F-key. Gate it explicitly:
   - only after `block_opened`
   - not while `startup_story_pending`, a story card or a focused activity is showing
   - not while `current_path` is non-empty
   Copy the guard list from godot/shared_panel.gd:122.

SHOULD-FIX

1. [Options A/B/C comparison] The doc compares scopes (session, saved, single station) but not experiences. Options A and C differ mostly in station count.
   FIX: Recommend A-lite: three stations, one shared mechanic with three variations, session-only. There's a direct precedent in the session-only landmark tour state (godot/main.gd:736-744) and its reload messaging (godot/main.gd:6127, "tour progress starts fresh on reload"). C's single station can't carry a "phase loop" and gives one beat of payoff, so drop C as a standalone option.

2. [Para 5 "resident roles"] Roles aren't defined. Without them, "cooperation" is just decoration.
   FIX: Bind one resident to each station by function, not as a quest-giver. For example: Rook knows the stage trunk, since soundcheck already exists at godot/main.gd:6567-6568. Celeste knows the lantern/paint side. A third resident holds a fictional spare part.
   Each resident walks with the player (existing `walk_neighbor:` action, godot/main.gd:6558-6559) or gives a clue the puzzle actually uses. verify: which neighbor indices sit closest to candidate station sites.

3. [Para 5 "where world models can sit"] Station placement is left open.
   FIX: Put station props next to existing fictional anchors only: the 3 lanterns on `BlockGatheringBanner`, near the stylised `StreetLamp_*` points, or beside `loan_return_beacons` (godot/loan_homecoming.gd:16). Run every new prop through `sidewalk_safe_point` (godot/main.gd:3609-3615). Don't anchor to any real building ID or storefront spot from `storefront_light_spots` (godot/main.gd:1777); those carry real building IDs and could read as real infrastructure locations.

4. [Para 6 "quiet/Music intent"] Silence is a natural outage beat, but the doc doesn't say whether the outage touches music.
   FIX: The outage never pauses, starts or restarts music, and never calls `toggle_music_playback` (godot/main.gd:10848). Any "power back" sound is opt-in and silent when quiet is active. verify: where the quiet flag lives. `quiet_seats` (godot/main.gd:795) is a node, not obviously a global quiet intent.

5. [Para 6 "abort/resume/Back/Escape"] Escape is listed, but the abort result isn't.
   FIX: Escape or Back closes the repair overlay and keeps the station's progress for the session. A separate, explicit "Call it a night" action restores normal lighting (see Must-fix 3c). Reload always gives the normal scene. Escape is routed per activity in `_input` (godot/main.gd:14070-14085), so the outage needs its own branch before the generic Escape/X handler at godot/main.gd:14262.

6. [Para 7 evidence] "substantive input/world pixel evidence" needs a definition for this feature.
   FIX: Capture the lantern and lamp emission state before the outage, after each phase, and after restore. Also capture the `evening_mode` and `night_glow` values. Assert that the save-file bytes are unchanged across the whole outage. Existing tests already compare raw save bytes, e.g. godot/tests/study_test.gd:4903.

OPTIONAL / NICE-TO-HAVE
- After restore, one short resident line per station, using the existing `memory()` or reply style (godot/loan_homecoming.gd:7-11, 132). Session-only.
- Mark station props with the gold-marker convention the tour already uses (godot/main.gd:6127), not a new HUD element.
- Prior-art note for the doc: pipe/connector rotation (Pipe Mania lineage), the Among Us wiring task, and festival-lights restoration beats in cosy games. The idea isn't novel, so claim it as a fit for this project, not as an original mechanic.

CUT THESE
1. [Option B, saved chapter] Cut it. The save budget is already pinned at exactly 4096/4097 bytes in two recent features (godot/tests/study_test.gd:5288-5310 and 5470-5483), and `SAVE_BUDGET_MAX_BYTES` is 4096 (godot/main.gd:104). A saved outage chapter adds compatibility and budget-refusal paths the creator didn't ask for. Session-only already has accepted precedent (godot/main.gd:736).
2. [Option C as its own option] Cut it, or fold it into A-lite. One station gives no phase loop. It also invites a follow-up "expand later" campaign that para 3 doesn't need.
3. [Any change to BUILDING_SHADER_CODE] Cut from the first slice (see Must-fix 2). Per-prop emission is enough, and the shader is shared by every building.
4. [Para 4 lead: loan_homecoming "original static mesh"] Use it only as a pattern for building fictional props from boxes (godot/loan_homecoming.gd:61-73). Don't hook outage logic into loan state, `pending()` or `chapter_completion_notice`. Those are tied to `epilogue_packing` and save state (godot/loan_homecoming.gd:78-79; godot/main.gd:11564, 7179).

[ASSUMPTION] I'm assuming the creator's "hero" means feeling capable, not working alone. If they truly want a solo saviour, Must-fix 4 becomes a question to put to the creator rather than a fix.
[ASSUMPTION] I'm assuming touch users at 390x667 and 320x667 can reach resident conversation actions. verify: the conversation action buttons are visible and reachable at those sizes after block_opened.
