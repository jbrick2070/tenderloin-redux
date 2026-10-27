TOOL CHECK: PASS (read kibitz-runs/2026-10-26-codex-opening-release-ideas/r1/input.md, godot/before_streets.gd, godot/main.gd, godot/helper_bench.gd, godot/habitat_room.gd, godot/programme_gathering.gd, godot/tests/before_streets_checks.gd, artifacts/terra-input-20261027/opening-probe{1,2}/result.json)

VERDICT: yes-with-fixes. The goal is sound and the mechanism is already clear from the code. But the doc frames the prior art too narrowly. It does not say which of two incompatible "fresh key / route" behaviours it wants. Its evidence covers only the revisit path, yet it asks for startup parity.

Confirmed mechanism (the doc never states it, so recording it here): Escape closes on the key-press event in _input (before_streets.gd:212-213; dispatch at main.gd:14633-14635). On the next physics tick the visibility guard at main.gd:14313 no longer applies. Input.is_key_pressed(KEY_W) is still true (set_input_as_handled does not clear Input singleton state), so main.gd:14341 drives walk_step. close_opening (before_streets.gd:101-115) captures nothing. That matches the 2.08–2.93 m drift reported in para 5.

MUST-FIX BEFORE BUILD

1. [Para 7 "opening-owned release latch analogous to helper/habitat" / Para 9 "prior art/originality"] The prior art is miscounted. There are already THREE latch copies, and they do not behave the same way:
   - helper_bench.gd:97-117 and habitat_room.gd:175-192 call held_on_exit.clear() and then re-capture on close.
   - programme_gathering.gd:91-101 accumulates without clearing (`not held_on_exit.has(key)`), uses Array[int] instead of Array[Key], and only captures when `studio.visible and not order.is_empty()`. main.gd:14315 reaches it through programme_studio.gd:177-178.
   The "originality" question is moot because this is a known in-repo pattern.
   Fix: list all three call sites. State which semantics the opening copies (clear-and-recapture fits better, because close_opening is a single exit point). Drop "originality" from the request.

2. [Para 3 player outcome vs Para 7 "preserve route behavior/manual camera" vs Para 9 "multi-key/independent fresh key"] These goals conflict with the prior-art method, and the doc does not choose. The existing guards return from the ENTIRE _physics_process (main.gd:14315-14317). While any captured key is still held, that also blocks:
   - Shift+arrow camera rotation (main.gd:14318-14332);
   - a fresh, independent key (for example D pressed while W is still held: input_vec is never built);
   - route advance (main.gd:14369-14370, advance_walk), including a Walk tap or tap-to-walk route issued after close.
   So "independent fresh key moves" and "route behavior preserved" are FALSE under option A as written.
   Fix (smallest): state the intended semantics in Para 3 and write the acceptance against them. Recommended wording: "Until every key captured at close is physically and logically up, keyboard walking, Shift camera rotation and route advance stay suspended, matching helper/habitat/programme. A fresh independent key does not move until the captured key is released." The alternative is to mask only the captured keys inside input_vec. That diverges from the three existing guards and should be justified explicitly, not left implicit.

3. [Para 5 evidence vs Para 7 "preserve startup versus revisit" / Para 9 "startup/resize"] The evidence covers only the revisit path. Both probe result.json files contain only `"from_startup": false` (45 snapshot values in total, none true). The only startup held-W coverage is before_streets_checks.gd:68-75. That test checks position only while the story card still blocks physics (main.gd:14313) and releases W BEFORE Start, so startup-then-Start-while-held is unproven either way. Startup also has a key-driven side effect the doc never mentions: any fresh non-echo movement key during startup calls continue_story() (main.gd:14676). With W latched, pressing D would dismiss the story card and then be swallowed by the latch.
   Fix: decide whether startup close arms the latch. Recommended: yes, because the single capture point is close_opening. Add these acceptance rows:
   (a) startup Escape with W held, then pointer Start while still held: zero movement.
   (b) startup Escape with W held, then fresh D: continue_story fires and the player does not move until W and D are released (or whatever item 2 decides).

4. [Para 7 option B "shared cross-activity release coordinator" vs Para 7 "no change to unrelated activities"] This contradicts itself. A real coordinator must either migrate the three existing guards (main.gd:14315-14317 and the three modules), which changes unrelated activities, or sit beside them as a fourth parallel mechanism, which adds a concept without removing any. Either way it cannot meet the stated constraint.
   Fix: demote option B to "documented follow-up, not built in this slice". Otherwise, relax the constraint explicitly to allow a behaviour-identical migration of the three existing guards, with their tests (helper_bench_checks.gd:74-103, habitat_room_checks.gd:99-110, programme_gathering_checks.gd:27,134-135) as the regression net.

SHOULD-FIX

5. [Para 7 "risks of clearing a guard during reset/reentry"] The doc names the risk but makes no decision. reset_visit calls close_opening(false) (before_streets.gd:117-118), and the import/load paths call reset_visit (main.gd:12550, 13056, 13758). If capture lives in close_opening, a successful import while the opening is visible and W is held will ARM the latch. That matches helper_bench.gd:111-112, but the doc should say it is intended. Reentry: open_opening is refused while a route is active (before_streets.gd:87) but not while a latch is pending. Reopening and closing again under clear-and-recapture simply re-captures, which is fine; programme-style accumulation would also be fine. State which.

6. [Para 7 "mixing physical/logical input"] There is no design choice to make here: mirror the physics read exactly. WASD is read as logical OR physical (main.gd:14335-14342). Arrows are logical-only and only when no GUI focus owner exists (main.gd:14343-14351). The existing captures use logical OR physical for all 8 keys (helper_bench.gd:100-101), which over-captures arrows. That is harmless, because release clears it. Note that the existing test presses only a logical keycode (before_streets_checks.gd:68), so it never exercises a physical-only hold. verify: the browser probe harness sends both keycode and physical_keycode for W.

7. [Para 9 process] The paragraph contradicts itself. It asks for "original full all-five and separate sole-Claude implementation r3" and also says "scoped r1 only now, no four-round campaign". Fix: say that r3 and all-five are deferred, or drop them from this document.

8. [Para 9 acceptance bloat] The matrix (1100/390/320 + side layout × held/unheld × multi-key × non-movement × startup/resize × import/reload/lifecycle × camera/quiet/storage) is out of proportion to a roughly 10-line close-path change. before_streets_checks.gd:21 already loops 11 sizes and already exercises import/load (lines 93-104) and resize-return camera (129-136). Fix:
   - Add one revisit held-W Escape case and one Back/Return case inside the existing loop.
   - Add one startup case (item 3) and one multi-key case (item 2) outside the loop.
   - Limit the actual-browser run to 1100 plus one narrow size. Phone layouts have no held-touch movement path (press_walk_control -> walk_to_neighbor routes, main.gd:14025-14033), so narrow sizes only re-test the same keyboard code.

OPTIONAL / NICE-TO-HAVE
- Add `"release_pending"` to before_streets.snapshot() (before_streets.gd:236), mirroring habitat_room.gd:416. Browser probes could then assert the latch directly instead of inferring it from position deltas, which also addresses the snapshot-timing ambiguity in para 5.
- Name the guard insertion point in the doc: main.gd:14315-14317, next to the existing three.

CUT THESE
1. Option B build (shared coordinator). It cannot satisfy "no change to unrelated activities" (item 4). Keep a one-line follow-up note only.
2. "Prior art/originality". The pattern already exists three times in-repo (item 1), so no external survey is needed.
3. The full per-size actual-browser matrix beyond 1100 plus one narrow size (item 8). Native checks already iterate 11 sizes, and phone layouts add no distinct held-input path.
4. The r3 / all-five campaign references in this r1 document (item 7). They contradict the stated scope.

[ASSUMPTION] Other focused activities in is_focused_activity_visible (main.gd:12116), such as shared_meal, rhythm_circle, film_screening, civic_listening, shared_panel and the story overlays, probably leak held movement the same way: only three modules define release_pending. Out of scope here, but it is the real argument for a later coordinator. verify: close paths of those modules with a held-W probe.
