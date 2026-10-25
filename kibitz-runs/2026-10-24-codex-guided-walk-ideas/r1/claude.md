TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, artifacts/shared-meal-20261025/playability*.json/mjs/log)

VERDICT: no, not as written. Option A gives one control two competing targets, and the plan rests on two premises the code contradicts. A smaller slice with a single rule for the primary control (it always names where it will go) is build-ready once the fixes below are made.

Root cause, confirmed in code: "Go Meet Thanh" is conversation action walk_neighbor:4 (main.gd:6515, dispatched at main.gd:6606). It sets selected_neighbor=4 (main.gd:8338). stop_walking (main.gd:13815-13831) never touches selected_neighbor. The primary control's last branch (main.gd:13870) calls choose_next_neighbor(1), which computes posmod(4+1,5)=0, so the player goes to Bea (main.gd:8325). Meanwhile the header comes from current_objective() "meet", the nearest unvisited resident (main.gd:6100-6111), which is still Thanh. The failure snapshot agrees: objective_text "Meet Thanh (1/5 neighbors met)", walk_control_text "Walk & Talk (Next)", conversation_header "Talking with Bea ... Turn 1/5".

MUST-FIX BEFORE BUILD

1. [P4-A] One control, two targets. A adds both a header-following primary and a separate transient "Resume Thanh" action. The two can disagree because the nearest unmet resident is recomputed from player_xz() on every call (main.gd:6096, 6104-6108). Stop at a different point and the header can switch to another resident while Resume still points at Thanh. That rebuilds the P2 mismatch with two buttons instead of one. P5 says "named primary matches actual goal" but never says whether "goal" means the header or the destination.
   Fix: write one invariant: the primary control's label names the destination it will route to. Then give one precedence rule, all computed in the final else of activate_walk_control (main.gd:13869):
   (a) Resumable stopped route: selected_neighbor>=0, arrived_neighbor!=selected_neighbor and current_path empty. Label "Resume <name>", call walk_to_neighbor(selected_neighbor).
   (b) Otherwise, if current_objective().id=="meet": label "Meet <name>", call walk_to_neighbor(obj.neighbor). This is exactly what the conversation "Go Meet X" action does.
   (c) Otherwise: the existing cycle, labelled with its real next name.
   No second button. In the demonstrated failure (a) and (b) both give Thanh, so either one alone closes P2.

2. [P3] False premise: "Snapshot already exposes objective ID/neighbor and walking state." The snapshot has objective_text, objective_control_text, objective_tour_id (main.gd:11881-11882), walk_control_text (main.gd:11773) and player_grounding.path_active. It has no objective id, no objective neighbor index, no selected_neighbor and no route-target field. Grep finds no "objective_id"/"objective_neighbor"/"selected_neighbor" keys, and playability-failure.json has none either. So the P5 checks "named primary matches actual goal" and "nearest-unmet default equals header even when array-first differs" cannot be proven from structured state today.
   Fix: either add read-only snapshot fields (objective_id, objective_neighbor, walk_target_neighbor, walk_target_kind), which are UI-only with no save impact, or commit to regex assertions on text, as playability.mjs:32 already does on conversation_header. Say which in the plan.

3. [P3] Inaccurate premise: "Stop ... does not preserve a resumable core route." It keeps the target index. selected_neighbor survives Stop, and arrived_neighbor is -1 mid-route (cleared at main.gd:8339, set only on arrival at main.gd:8900). Resume therefore needs no new variable, only a derived check. Most of the P5 cancellation list is also already implemented, because these paths set selected_neighbor=-1: end_conversation (main.gd:6479), manual WASD (main.gd:8237), walk_to_mural (main.gd:8390), walk_to_speaker (main.gd:8435), history stop (main.gd:8484), walk_to_point/map tap (main.gd:8738), and overview/reset paths (main.gd:14830, 14907, 14969).
   Fix: restate Resume as a derived condition. Point P5's "explicit other-neighbor/map/WASD/... cancels stale resumption" at these existing clears, and add tests for them instead of new code. "No new saved state" then holds by construction. verify: whether selected_neighbor is in build_save_envelope; the stop test at study_test.gd:454/458 compares save JSON before and after, which suggests it is not.

4. [P2/P5 scope] The same mismatch happens without Stop, and the plan does not cover it. end_conversation sets selected_neighbor=-1 (main.gd:6479), and choose_next_neighbor with -1 jumps to index 0 (main.gd:8327), which is Bea. So Start -> Walk/Talk -> Bea -> Goodbye -> Walk & Talk (Next) should send the player back to Bea while the header says "Meet <nearest unmet>". [ASSUMPTION: inferred from code; verify with a native fixture.] This rules out Option B on its own: resume-after-Stop does nothing for the Goodbye path, while rule 1(b) fixes both.
   Fix: add the Goodbye -> primary journey to P5 acceptance next to Stop/Resume.

5. [P3/P4] The plan reconciles only one of three "next" behaviours.
   - Cyclic: choose_next_neighbor (main.gd:8323), used by N/B (main.gd:14735-14736) and the primary control (main.gd:13870).
   - Array-first: visit_next_unvisited_neighbor (main.gd:9281), behind the named "Meet Next (N left)" hub button (main.gd:15719).
   - Nearest-unmet: current_objective (main.gd:6100-6111), behind the header, the guide marker and "Go Meet X" (main.gd:6515).
   After the fix, "Meet Next" in All Block Actions can still head to array-first Celeste while the header says Thanh, which is the same named-promise defect.
   Fix: point block_next_btn's callback at current_objective().neighbor while obj.id=="meet". Leave visit_next_unvisited_neighbor itself alone so study_test.gd:816-826, which call it directly, still pass. Or explicitly declare the button out of scope and rename it so it promises nothing.

6. [P5] "Resume does not immediately award or write" conflicts with existing behaviour. If the player stops within ARRIVAL_DISTANCE_M of the target, walk_to_neighbor arrives at once (main.gd:8363-8366), and finish_neighbor_arrival marks the resident visited (main.gd:8912-8913). "Go Meet Thanh" behaves the same way today.
   Fix: restate as "awards/writes happen only through the existing finish_neighbor_arrival; Stop never awards; Resume inside the arrival radius arrives normally."

7. [P3/P5] Replacing the test at study_test.gd:433-469 needs an exact spec. The fixture walks to Dez (walk_to_neighbor(3)), stops, presses the primary control and asserts selected_neighbor==4 "retains ordinary Next cycling" (study_test.gd:469). Under rule 1(a) the result becomes 3 (resume Dez).
   Fix: replace it with two assertions so cycling coverage moves to the quick path rather than disappearing:
   (i) primary after Stop -> selected_neighbor==3, path non-empty, label names Dez;
   (ii) a fresh Stop, then KEY_N -> selected_neighbor==4.

SHOULD-FIX

1. [P4] The current copy describes cycling and will contradict the new behaviour: the Stop announcement "or Walk & Talk for the next neighbor" (main.gd:13831) and the tooltip "Walk to the next neighbor and talk on arrival" (main.gd:13841). The label strings also appear 5 times in tests/godot-browser.mjs and 8 times in godot/tests/study_test.gd (grep counts for "Walk & Talk (Next)" / "Walk / Talk" / "Walk"). List every string that changes before building, so the expensive suite isn't run against stale string checks.

2. [P4/P5] Compact labels. main.gd:13840 shortens the label to "Walk" or "Walk / Talk" on narrow or side-docked layouts. A named label needs a compact form: Celeste is the longest name; "Resume Celeste" is the longest label, which plan 1(c) relies on. Acceptance: text_fits true at 320 and 390 for the longest label in every state from MUST-FIX 1. Story-owner labels (main.gd:13842-13856) set the precedent for replacing the text.

3. [P3] Deferred-arrival semantics, resolved by exclusion rather than preservation. walk_to_mural and walk_to_speaker set selected_neighbor=-1 (main.gd:8390, 8435), so stopped mural/Rook routes are not resumable under 1(a). That matches the existing test, which requires a fresh request_rook_soundcheck or E/T after Stop (study_test.gd:459-466). The E/T Celeste route leaves selected_neighbor==celeste_index (study_test.gd:466). Stop clears pending_celeste_talk, and Resume via walk_to_neighbor clears the pending flags (main.gd:8342-8345). verify: that arrival at celeste_index through walk_to_neighbor opens the same conversation as the deferred E-talk. If it doesn't, also exclude Celeste-with-pending-talk from 1(a). State the chosen behaviour.

4. [P4] Story-owner precedence. Put the rule-1 logic only in the final else of activate_walk_control, after the voting/lantern/dog/power branches (main.gd:13861-13868), and only in update_walk_control's non-story label path. The plan says "after story-owner priorities"; make it a test: with a story active, the label and action are unchanged.

5. [P4] Routing failure. A failed walk_to_neighbor leaves selected_neighbor set and arrived_neighbor=-1 (main.gd:8370-8375), and the route-blocked branch (main.gd:13800-13809) does too. 1(a) would then offer "Resume X" for a target that just failed. Acceptable only if the honest "No walkable route to X" refusal repeats. Add that to "blocked path refuses honestly."

6. [P4 boundary] Once all 5 are met, the objective moves to layout/mural/soundcheck/open (main.gd:6112-6118), each with a neighbor field (0, celeste_index, rook_index, 0). Under 1(c) the primary keeps cycling while the header says "Paint ... on Celeste's easel". That is honest only if the label names the cycled resident. Decide whether 1(b) also covers these opening-chapter objectives through obj.neighbor. That would still be "one coherent opening-navigation repair" (P4); otherwise state that 1(c) naming is the repair for them.

OPTIONAL / NICE-TO-HAVE
- Add walk_target_neighbor to the snapshot even if text regex is chosen. It makes later regressions cheaper to diagnose.
- The "Resume <name>" label after Stop is standard navigation-app behaviour; no originality or prior-art risk worth spending review time on.

CUT THESE
1. [P4-A] The separate transient "Resume Thanh" action or button. Fold it into the primary label's precedence (MUST-FIX 1). A new button adds layout risk to the phone tray and nested controls (press_walk_control phone transition guard, main.gd:13872-13884) for no extra capability.
2. [P4-C] The broad next-goal dispatcher. The demonstrated failure is a single branch at main.gd:13870. Safe to cut.
3. [P4] "Originality/prior-art concerns." This is a navigation bug fix; the question cannot change the design.
4. [P5] New bespoke acceptance for Music/Sounds, import-limited profiles, the 4096/legacy boundary beyond one "save bytes unchanged across Stop/Resume" check, and extra pinch/voting cases. The change touches no audio, import or save code. Keep these under the existing full regression gate, not as new acceptance items. That gate stays, per P5.
5. [P5] "Deliberately chosen visited neighbor survives Stop" as a separate requirement. It comes free from the 1(a) check, so it needs no state or code of its own; one test assertion is enough.

HIDDEN ASSUMPTIONS
- [ASSUMPTION] The header target stays stable between Stop and the next press. It does not: it depends on position (main.gd:6104-6108). Only MUST-FIX 1's invariant makes this harmless.
- [ASSUMPTION] Calling current_objective() inside update_walk_control is cheap enough. verify: how often update_walk_control runs; current_objective iterates neighbors and builds hint strings (main.gd:6100-6118).
- [ASSUMPTION] There are exactly 5 neighbors, and Thanh=4 / Bea=0 index order is stable (P3 relies on index 4 wrapping to 0).
- [ASSUMPTION] Android/touch acceptance can reuse playability.mjs. Its Android leg was never reached (playability.log: waitForFunction timeout at playability.mjs:32 on desktop). Treat the Android result as still unproven, not as passed.
- Physical-phone, fullscreen-reader, human-comfort and music-quality evidence is still missing, as P5 says. Nothing in this slice provides it.
