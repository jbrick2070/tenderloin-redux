TOOL CHECK: PASS. Files read: r3/input.md, r3/driver_anchor.md, codex-mobile-map-ideas/r1/final.md, godot/main.gd (pinch state 517-526, _notification 10657-10663, get_a11y_status_snapshot 11650, poll_web_audio 11755-11772, JS lifecycle hooks 11246-11264, is_focused_activity_visible 11826, _process 13937-13942, is_screen_point_in_ui 14017-14036, cancel_map_pinch/map_pinch_input/apply_map_pinch/_input 14190-14292, _unhandled_input mouse path 14531-14575, update_camera 14577-14607, zoom/overview_text 14825-14835, activity reader gui_input 15102-15106, size_changed hook 15668), godot/rhythm_circle.gd (116, 477-493), godot/tests/study_test.gd (3255-3270, 6173-6231), tests/godot-browser.mjs (1378-1419, 1808, 3316-3326, 3423), godot/project.godot.

Section ids: [C] = input.md line 5 (candidate description). [R] = line 7 (review asks). [S1]..[S6] = the bullets of r1/final.md in order.

Engine claims about Godot 4.7 internals are marked "verify:". I could not read engine source from this repo.

VERDICT: yes-with-fixes. The runtime state machine in main.gd matches the selected design, and the map-route suppression holds under either engine ordering of emulated mouse vs touch. But refusing a gesture currently means swallowing it, which contradicts [S3] "reject UI/modal/reader/rhythm ownership". One CDP call likely violates the protocol contract. And the native test leaks engine-level touch state, so most of its route-suppression evidence is vacuous. Fix these before running the mandatory all-5 gates.

MUST-FIX BEFORE BUILD

1. [C][R][S3] Refusing the gesture consumes the events, so the refused owner loses them. This part is CONFIRMED by reading the code. Its downstream effect on stale GUI state is a hypothesis.
   CONFIRMED:
   - main.gd:14210-14215 sets map_pinch_blocked=true whenever there are 2 or more contacts, regardless of each contact's "allowed" flag (14208).
   - From then on, every one of these returns map_pinch_blocked and therefore set_input_as_handled() at 14265-14267:
     - ScreenTouch press and release (14233, 14232)
     - ScreenDrag for any tracked index (14246)
     - every emulated mouse event (14201-14202)
   - The canceled branch also always returns true (14204-14206).
   Consequences:
   (a) A finger already scrolling an activity reader stops receiving ScreenDrag the moment a second finger lands. Readers scroll only through gui_input ScreenDrag (main.gd:15102-15106), so the reader freezes until every finger lifts.
   (b) The rhythm circle gets raw touch only through gui_input (rhythm_circle.gd:116, 487-493). The first finger's release is eaten, so rhythm_circle.dragging stays true after the gesture.
   (c) A Button pressed by the first finger gets the emulated press (which passed, because nothing was blocked yet) but never the release.
   HYPOTHESIS (verify: scene/main/viewport.cpp in the pinned 4.7 build, specifically gui.touch_focus erase-on-release and gui.mouse_focus/mouse_focus_mask): eaten releases leave stale touch_focus/mouse_focus entries. The next tap or drag could then be routed to the old Button, reader or rhythm Control instead of the map, either losing a map tap or causing a rhythm-path pan.
   Also, refusal was only ever tested as "camera did not zoom". Nothing asserts that the refused owner still received its input.
   FIX (smallest):
   - Never consume a release or a cancel. ScreenTouch with pressed=false or canceled, and emulated MouseButton with pressed=false, should update map_touch_contacts and then return false. Route suppression does not need the release to be eaten: the tap requires pointer_active (14559-14564), which is already cleared at the second contact (14213), and while blocked it can only be re-armed by an emulated press, which stays consumed.
   - When the gesture is refused (either contact has allowed==false), also return false for ScreenDrag, so readers and the rhythm circle keep their drags.
   TESTS:
   - Add a native case and a CDP case: finger 1 drag-scrolls a reader or the rhythm circle, finger 2 lands on the map, finger 1 keeps moving. Assert the reader's scroll value or rhythm owns_view changes as it does for one finger, and that rhythm dragging is false after all fingers lift.
   - Add a case with finger 1 on a walking Button and finger 2 on the map, then lift both, then tap the map once. Assert the tap walks (path_active) rather than being swallowed.
   - Rename 'focused story picker owns input' (tests/godot-browser.mjs:1412). It currently asserts only that view size is unchanged.

2. [R][S5] tests/godot-browser.mjs:1396 sends `touchEnd` with a non-empty touchPoints list. The CDP Input.dispatchTouchEvent contract says TouchEnd and TouchCancel must not contain touch points, and Chrome may reject the call outright (verify against the Chromium version the helper runs).
   - If it is rejected: verifyMapPinch throws there, and the assertion at 3423 (mapPinchChecks.length===4) can never pass.
   - If Chrome instead treats it as "all points released": the next line, 1397, re-presses id 2 as a new single contact. held.map_pinch.blocked is then false, and 1398 fails.
   Either way, the "first release blocks the remaining finger" CDP evidence is not trustworthy as written.
   FIX: lift one finger by omitting it from a touchMove: `send('touchMove',[point(center.x+60,2)])`. Chrome emits one event per changed point, so id 1 is released. Keep `touchEnd` with `[]` for the final lift.
   Do not count the currently running helper's result for this case until this is fixed.

3. [R][S4] The native test never releases engine-level touches, so 4 of its 5 sizes exercise no emulated mouse press. CONFIRMED by tracing godot/tests/study_test.gd:6182-6231. The engine part is verify: Input mouse_from_touch semantics, where emulation is only for the first-down index and is reset only by that index's release.
   Trace:
   - Index 2 is pressed at 6215 and never released.
   - Indices 0 and 1 are re-pressed at 6220 and 6225. Only 1 is released, as canceled, at 6220. After 6225 nothing is released.
   - study.cancel_map_pinch() at 6223/6227 resets game state only. The engine still believes index 0 is down.
   - So from the second size (390x667) onward, pinch_touch(0,a,true) at 6196 generates no emulated press. pointer_active is never armed. "first index release and remaining finger cannot walk or pan" (6204) is then true for the wrong reason.
   - The UI-origin case (6225) likewise never sends an emulated press to header_panel.
   FIX:
   - Add a helper that releases every index pressed in each sub-case (pinch_touch(i,p,false), or a canceled release) before the next case and at the end of each size.
   - Before the second contact in each route-suppression case, add the precondition `require(study.pointer_active, ...)`, so the suppression assertion cannot pass vacuously.
   - Delete the manual emulated MouseButton injection at 6202. It duplicates the engine's own emulated release and muddies which path is being proven (see CUT 1).

4. [S4][S5][R] Selected test coverage is missing or overclaimed. The final gates are mandatory, so these are build blockers relative to the selection.
   (a) Rhythm-circle two-finger refusal. [S3] and [S4] name it explicitly. There is no native or CDP case. The only rhythm touch tests are single-finger (godot-browser.mjs:299, study_test.gd:4065-4078, which call scene_input directly).
   (b) Both release orders. Native lifts index 0 (the emulating finger) first (6200). CDP lifts id 1 first (1396). Neither lifts the non-emulating finger first and then the emulating one.
   (c) Manual centroid anchor in CDP. manualZoom (1405) checks only that view size decreased and following is false, with no camera_pose or ground-under-centroid check, so [S5] "exact camera assertions" is unmet.
   Also, the native anchor case (6207-6211) uses a centroid at play_area center. That only tests anchoring if the play-area center differs from the target's projection at that size. Use an off-center centroid, e.g. a and b both at center+Vector2(-80,±0) offsets.
   (d) Max clamp. No case reaches max(900, overview_size*2.5). The largest is 300 at 6214. MAP_PINCH_PASS (6231) still prints "clamps". The min clamp is hit only where the initial view_size*0.5 is below 24 (verify the initial view_size at each of the 5 sizes).
   (e) One-finger recovery. CDP covers only a one-finger pan after the gesture (1403). There is no one-finger tap-to-walk after a gesture (the highest-risk regression path, 14559-14564) in either harness. Desktop wheel and button recovery after a touch gesture are not covered natively either; only the Zoom+ touchscreen tap at 1414 is.
   (f) UI-origin refusal in CDP. Only the story picker modal is covered (1412). [S5] lists UI refusal.
   FIX: add (a) through (f). Make MAP_PINCH_PASS list only what was actually asserted. Rename 6218's "focus loss" case: it calls study._notification(...) directly rather than routing through study.notification(NOTIFICATION_APPLICATION_FOCUS_OUT). Use notification() and say so in the token.

SHOULD-FIX

1. [C] main.gd:13938 vs 13942: lifecycle cancellation is ordered after apply in the same frame. _process calls apply_map_pinch() before poll_web_audio(), which is where pagehide/visibilitychange cancellation runs (11762-11763). A drag that was pending when the page hid is applied on the first frame back, then cancelled.
   Separately, if a new touch is queued before that poll runs, the stale contacts from before hide make it count as a third contact. It is consumed and then cleared, so the first tap after returning does nothing.
   FIX: in _process, run the bar-stop check (or all of poll_web_audio) before apply_map_pinch(). The nameplate block at 13939-13941 already runs before poll, so move apply after poll but keep it ahead of the nameplate, which reads camera scale.

2. [C] main.gd:14265 runs before 14271, so a gesture skips the reward-audio unlock. When the pinch path consumes the ScreenTouch releases, `reward_audio_unlocked = true` never runs. If a user's first interaction is a two-finger gesture, no unlock is recorded.
   FIX: move the key_activation/mouse_activation/ScreenTouch-release unlock observation (14269-14272) above the map_pinch_input call. Must-fix 1 also stops eating releases, which mostly resolves this.

3. [C] Nothing cancels the gesture on viewport resize or layout change. cancel_map_pinch has exactly three callers (10659, 11763, 14205). vp.size_changed goes to resize_controls (15668), and refit_after_layout (14841) does not cancel either. A rotation or header resize mid-gesture leaves map_pinch_center and map_pinch_ground in the old layout's screen space, so the manual anchor (14257-14261) jumps.
   FIX: call cancel_map_pinch() from resize_controls, or at the top of refit_after_layout. Add one CDP case: setViewportSize mid-gesture, then assert contacts==0 and no pose jump.

4. [C] Same-frame re-gesture uses a stale start size. On all-lift, map_pinch_pending is intentionally kept (14228-14232). A new two-contact start in the same frame captures map_pinch_start_size=view_size (14220) before the old pending applies (13938). The new gesture's first drag then snaps back. This is reachable by CDP; physically unlikely.
   FIX: at 14220 use `map_pinch_next_size if map_pinch_pending else view_size`, and clear pending there.

5. [C] The clamp literals are duplicated. 14244 repeats zoom()'s `24` / `maxf(900, overview_size*2.5)` from 14828, so a future clamp change could diverge between button and pinch.
   FIX: one helper, e.g. clamp_view_size(v), used by both. The 8.0 px threshold appears twice (14219, 14243); make it one const.

6. [C] Touch-aware overview copy changes the desktop text on hybrid devices. overview_text() (14833) switches on DisplayServer.is_touchscreen_available(), which is true on touchscreen laptops, so those desktop users lose the "T talks · Esc · WASD · right-drag · scroll" hints. r1 asked that desktop text stay byte-identical. No test asserts either string. verify: what Web is_touchscreen_available reports on hybrid Chrome.
   FIX: either append the pinch phrase only for touch-and-narrow (is_narrow_layout()), or keep the keyboard hints and add the pinch phrase. Add one native assertion per branch. Also check that the 320-wide line wraps inside the info reader (activity_detail_snapshot(info, ...) at 11613 can measure it).

7. [S5] The synthetic pagehide at tests/godot-browser.mjs:1410 has side effects beyond pinch. The listener (main.gd:11251-11258) also queues voices 'suspend' (handled at 11767-11769) and revokes the export URL, and no pageshow follows. That is harmless today only because the context closes at 3327. Note it in the test, or follow it with a pageshow{persisted:true} so later helpers added to this context don't inherit suspended voices.

8. [S5] tests/godot-browser.mjs:1406-1407: move() sends only ids 1 and 2. By the omission semantics in must-fix 2, this releases id 3 first. So the case actually proves "after a third contact, the remaining two cannot zoom until all lift", which is valid, but not "third contact held cancels". Rename it, or keep id 3 in the move payload.

9. [S5] tests/godot-browser.mjs:1417 hard-codes playerUnchanged:true and legacyUnchanged:true. Write the measured values (pose deltas, save equality booleans) so the artifact is evidence rather than a label.

OPTIONAL / NICE-TO-HAVE
- Add `refused` (either contact not allowed) and `start_size` to the map_pinch snapshot (11650). Tests could then distinguish "refused" from "cancelled by extra contact" without inferring it from view_size. Measurement only; no action hook.
- In apply_map_pinch, the manual path calls update_camera() twice (14256, 14261). Fine for once-per-frame. Only fold it if profiling shows cost; update_occlusion(true) is already once per frame (14262), which satisfies [R] "no heavy occlusion per packet".
- verify: whether Godot 4.7 Web sets InputEventScreenTouch.canceled on DOM touchcancel. If it delivers a plain release instead, the canceled branch (14204) is native-only, and CDP touchCancel (1408/1410/1412) exercises the release path. Either is safe after must-fix 1, but the test labels should say which.

CUT THESE
1. godot/tests/study_test.gd:6202, the hand-built DEVICE_ID_EMULATION MouseButton release. The engine already emulates it from pinch_touch(0,...,false) on the emulating index. The manual copy proves nothing extra and hides whether real emulation happened, which is the gap behind must-fix 3. It is safe to cut once must-fix 3 releases touches properly.
2. Nothing in main.gd. The state is minimal for the selected behavior: map_pinch_following is needed so a follow-to-manual flip mid-gesture doesn't anchor to a stale ground point, and the drag-time modal latch (14237-14239) is not redundant with the apply-time check (14252), because it ends the gesture permanently.

ACCEPTANCE LIMITS
- This r3 is a source-reading review only. It is not all-5 gate evidence, not physical-phone confirmation, and makes no claim about music or audibility.
- I did not run the native candidate or the private historical-profile helper and make no claim about their results. Must-fix 2 means the helper's "first release" step should be treated as unproven.
- Everything about Godot engine dispatch order, mouse_from_touch, Viewport touch_focus/mouse_focus and Web touchcancel mapping is marked "verify:". The confirmed defects are the consumption pattern (must-fix 1, CONFIRMED part), the CDP payload (must-fix 2, contract per protocol docs), the native touch leak (must-fix 3, traced in the test), the coverage gaps (must-fix 4), and should-fix 1-3, 5 and 9.
