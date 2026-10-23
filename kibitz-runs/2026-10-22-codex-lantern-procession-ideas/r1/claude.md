TOOL CHECK: PASS (Read on input.md, docs/ROADMAP.md, docs/BUILD_STATUS.md, docs/EPISODE_LOCATION_RESEARCH.md, godot/power_story.gd, godot/dog_story.gd, godot/main.gd returned real contents; Grep worked. Bash is disabled in this session, so nothing was executed. Read-only review.)

Section ids below refer to the paragraphs of input.md: [P1] line 2 header/status, [P2] line 4 source/gateway, [P3] line 6 tentative concept, [P4] line 8 history, [P5] line 10 verdict/acceptance, [P6] line 12 process limits, [P7] lines 14-15 read list/return.

VERDICT: yes-with-fixes. The concept can be built on existing seams, but four things are undecided at the vision level: how the procession moves, who wears the costumes, whether the gateway is sized for more than one new episode, and whether this payoff is just another lantern relight. Codex should not choose a slice until those four are settled.

MUST-FIX BEFORE BUILD

1. [P3] The motion model is undefined, and that one gap decides feasibility, safety and parade feel.
   "World motion only during actual player movement" covers two very different designs. One is followers that react to the player (escort AI). The other is participants placed at fixed arc-length offsets behind the player's progress along one pre-validated route polyline. Nothing in the codebase supports the first. Walking is a per-step loop in godot/main.gd:13480-13516 with no hook for followers. The last episode explicitly shipped "no...escortAI" (docs/BUILD_STATUS.md:5). Dog "motion" is a teleport on win (godot/dog_story.gd:309-315).
   Fix: decide on route-progress-driven placement. Author one route polyline and pre-validate every sample and lateral slot at setup with is_walkable_point, as dog_story already does (godot/dog_story.gd:93-101, 112-113). Disable Begin if any sample fails, as with sites_valid. Set participant position = route(s_player - k*gap), where s_player is the player's projected progress. Then Stop freezes the procession because s stops changing. Manual WASD detours do not drag people into buildings, and no AI is needed. State this in the anchor so the r3 reviewer has a contract to check.

2. [P3] Who wears the costumes is unstated.
   "Two costume motifs" has no carrier. It could be the player avatar (player_visual, godot/main.gd:13500-13501), anonymous visitors, or the five named residents. Named residents are excluded from duplication or moves, but costumes on them in place are not ruled out either way.
   This is the most visible design decision and the one most likely to surface as a mid-build invention.
   Fix: choose one. Recommendation: the player plus 2-4 anonymous visiting participants. Named residents watch from their existing anchors and keep their current geometry.

3. [P2] The access problem is misstated, so the paging decision rests on the wrong arithmetic.
   [P2] mixes two separate constraints:
   - Hub nav: six 44px siblings already fill the 264px interior (godot/civic_listening.gd:257; docs/BUILD_STATUS.md:24,38). A seventh does not fit there.
   - The gateway row: an HBox with separation 3 (godot/power_story.gd:113-116). It holds the 3 Power case tabs plus dogs_entry (godot/power_story.gd:128), each with a 44px minimum (godot/power_story.gd:200-204).
   At minimum widths the row needs 4x44+3x3=185px. A fifth tab needs 5x44+4x3=232px, which is under 264, so one more tab probably fits. A sixth needs 279px and does not.
   So the real argument for paging is Halloween plus the mayoral episode [P1], plus cooking later, not Halloween alone.
   verify: the rendered minimum widths of the multi-line labels "Larkin\n2017" and "Missing\ndogs" at 12px with 2px margins, in the 280px side dock at 520x360.
   Fix: size the gateway for at least 3 future episodes now and say so. Otherwise the mayoral round redoes this decision.

4. [P2] The "paged story gateway" would deepen a coupling problem that the plan does not name.
   Today the gateway is Power's own puzzle tray:
   - tabs[0..2] switch between case selectors and Relay 1-3 depending on `active` (godot/power_story.gd:510-519).
   - dogs_entry is a foreign button injected into Power's tab row (godot/power_story.gd:128-132).
   - Mutual exclusion is pairwise and hand-wired (godot/dog_story.gd:208,236,334; godot/power_story.gd:239,479).
   - main.gd has per-episode branches for:
     - cancel_intent at 8+ call sites (e.g. godot/main.gd:6417, 8037, 13566)
     - reset (godot/main.gd:12200-12204, 12689-12693, 13253-13257)
     - objective priority (godot/main.gd:6063-6064)
     - walk-control label and resume (godot/main.gd:13590-13604)
     - blocked route (godot/main.gd:13495-13496)
     - cutaway focus (godot/main.gd:13720-13722)
     - Escape handling (godot/main.gd:14132-14137)
   A third and a fourth episode turn each of these into a 3- or 4-way chain. That multiplies the "exact pause/Stop/Back ownership" risk that [P3] itself warns about.
   Fix (smallest change): put the gateway's episode entries in their own small container or node, outside Power's `buttons` array. That keeps the 13 indices asserted at tests/godot-browser.mjs:1323. Add one "active story episode" query in main.gd that the existing call sites consult. Do not grow pairwise checks.
   If Codex keeps the hand-wiring, the anchor should list every site Halloween must touch, so r3 can audit it.

5. [P3] The lantern payoff collides with existing art, which goes against the "not another...power reskin" clause.
   Lanterns already exist in three places:
   - the gathering banner GatheringLantern0..2 (godot/main.gd:2861-2872)
   - those same banner lanterns, which Power relights as its payoff (godot/power_story.gd:164; docs/BUILD_STATUS.md:31)
   - Rhythm Circle's eight lanterns (godot/rhythm_circle.gd:200; godot/tests/study_test.gd:4009)
   A procession that ends by lighting lanterns at the gathering is the Power payoff again.
   Fix: make the payoff the procession itself: people in costume moving down the street with you, then arriving as a visible crowd. Lanterns should be handheld props carried by participants. Do not alter the banner lanterns, and do not touch Power's fixture or material override paths (godot/power_story.gd:442-448).

6. [P3]/[P4] "Flower" costume plus candle-like lanterns plus an evening procession reads as Día de los Muertos.
   That is the exact conflation [P4] and docs/EPISODE_LOCATION_RESEARCH.md:32,34 forbid. TLCBD's Boeddeker Día de los Muertos event is dated November 1 in the same 2021 source.
   Fix: either replace the flower motif with something clearly Halloween, or add explicit art guards: no marigold orange or cempasúchil shapes, no skulls or calaveras, no papel picado, no altar or ofrenda staging. Make the guard checkable in r3 by listing the palette and shapes in the anchor.

SHOULD-FIX

1. [P3] "Must feel like a parade" has no verifier.
   [P1] says the build happens before human playtesting, and BUILD_STATUS already admits that small world objects are not universally readable at the default map (docs/BUILD_STATUS.md:6,31).
   Fix: replace the feel claim with measurable proxies. For example: during follow-camera walking at 1100/390/320, at least N participants and the player costume project inside the viewport and are not occluded, checked like Power's world snapshot unprojection (godot/power_story.gd:578-588). Label the parade feel itself as human-unverified.

2. [P3] The "stationary costume craft + checkpoints" alternative contradicts the plan's own goal.
   A stationary parade is a worksheet with costumes, which is what [P3] says to avoid.
   Fix: keep it only as the explicitly labeled fallback if MUST-FIX 1 fails its walkability validation. Do not present it as an equal alternative.

3. [P3] The route goes over ground the player has already walked twice.
   The dog leads are Turk/Taylor, Turk/Hyde and Gathering (godot/dog_story.gd:5,93), and the Turk Taylor-to-Hyde history walk is the same corridor (docs/ROADMAP.md:38).
   A third episode on the same blocks weakens the "short real playable route" payoff.
   Fix: choose a sub-segment, direction or turn not used as a dog lead. verify: which modeled walkable segments beyond the Turk corridor exist, e.g. the Eddy corridor admitted for Larkin (docs/BUILD_STATUS.md:17). Or state honestly that reuse is intentional.

4. [P1] The creator's reorder is not recorded in the repo.
   [P1] says Halloween and mayoral come before playtesting and cooking later. docs/ROADMAP.md:73 and docs/BUILD_STATUS.md:11 still order the queue cooking, then election, then Halloween, and the docs record no reorder.
   Fix: Codex records the creator instruction, with its date, in the handoff before code. Otherwise the r3 reviewer will flag the order as unsourced.

5. [P3] "Tangible world consequence" overpromises under the zero-save, visit-only rule.
   As in Dogs, everything vanishes on End or reload (godot/dog_story.gd:251-267).
   Fix: say "visible during this visit" in player-facing text and in the anchor, matching the reader's existing "Visit only" line (godot/dog_story.gd:331).

6. [P3] "No new audio" plus "feel like a parade" is unresolved.
   Fix: state the choice. Either the procession is silent, with Music staying independent as in Dogs (godot/dog_story.gd:86), or it reuses only the existing Rhythm Circle procedural drum under the existing Music gate. That reuse is a project-native reuse, not new audio (docs/ROADMAP.md:57). Do not leave this to implementation.

7. [P3] Camera modes are unaddressed.
   Overview, wide and manual drag break any "procession visible while walking" claim. Follow is set in godot/main.gd:13517-13519, and overview flags are in godot/main.gd:13616-13619.
   Fix: state that participants advance only from route progress, and that camera mode never auto-switches. The manual camera invariant is already in docs/BUILD_STATUS.md:39.

OPTIONAL / NICE-TO-HAVE
- Name the 2021 TLCBD 200 Turk Fall Family Festival (docs/EPISODE_LOCATION_RESEARCH.md:32) only as a dated precedent in the reader. verify: whether 200 Turk lies on modeled geography before mentioning any location tie.
- Use a "start / walk / finish" phase indicator in the heading, like Dogs' "%d/2 matched", for legibility (godot/dog_story.gd:322).
- Add participants to cutaway focus points while they are near, as was done for the dogs (godot/main.gd:13720-13722).

CUT THESE
1. The handmade float in [P3].
   It is the largest moving footprint, so it carries the highest collision and overlap risk on narrow sidewalks with barricades and poles (docs/BUILD_STATUS.md:6). It also adds nothing that handheld lanterns plus costumes do not already deliver. Defer it to a later round.
2. A second costume motif, if MUST-FIX 6 is not resolved cheaply.
   One clearly Halloween motif (the paper bat) plus anonymous participants still delivers the costume beat. Two motifs double the art and the a11y labeling.
3. The 12-control, 16px-reader, six-size acceptance matrix in [P5] as a design input.
   The "12?" shows the count is undecided, and the matrix is copied from Dogs (docs/BUILD_STATUS.md:5,8). It belongs in r3 and the gates, not in the concept choice. Keep it out of the r1 selection criteria so it does not drive the UI.
4. Prior-art or originality claims beyond "project-native" ([P5]).
   Nothing in scope needs an external novelty claim. Cut it entirely instead of narrowing it.

[ASSUMPTION] markers:
- The 5-tab fit arithmetic assumes the HBox lays buttons out at their 44px minimum. Rendered label widths may be larger; see the verify in MUST-FIX 3.
- MUST-FIX 1 assumes the walking loop can expose player route progress without changing path behavior. verify: whether current_path or player_xz projection onto an authored polyline is enough, without new main.gd walking hooks.
- I did not read godot/power_place.gd, godot/tests/study_test.gd in full, tests/godot-data.test.mjs or docs/ASSETS.md beyond targeted greps. Claims about them are limited to the cited lines.
