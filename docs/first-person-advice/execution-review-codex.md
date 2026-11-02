# Execution spec review (Codex)

Source-only review, November 2, 2026: HEAD 103cb2f plus current uncommitted follow-ups. No game, tests, npm or browser ran. E = docs/FIRST_PERSON_EXECUTION.md; M = godot/main.gd; S = godot/street_view.gd. Other .gd paths below are under godot/. Earlier reviews were treated as historical, not current evidence.

**1. Anchors**

Sixteen corrections: fifteen work-order anchors plus the bridge name. Repeated references count once; a number inside the correct function is accepted.

| # | Spec reference | Correction |
|---|---|---|
| 1 | E:10 build_web_a11y_snapshot | Nonexistent; get_a11y_status_snapshot, M:11838. |
| 2 | E:45 mouse range 15145–15162 | Incomplete: M:15135–15165 includes activation and actual pan dispatch at 15164. |
| 3 | E:63 TALK_PROMPT_RADIUS_M:264 | M:64. |
| 4 | E:66 bea_invitation snapshot:136 | snapshot:124, projection:130;136 is cutaway logic. |
| 5 | E:66 helper_bench snapshot:287 | snapshot:302, projections:310/314;287 is input handling. |
| 6 | E:66 scene_overlay_snapshot~11755 | M:11785; projection 11806. |
| 7–9 | E:66 projection guards in fit_overlay_around_player, layout_reward_banner, trigger_feel_good_burst | M:7134/5873/5908 contain no unprojection. Bounds originate in player_overlay_rect:7114; burst positioning is 5927. |
| 10 | E:80 shared_panel:277 pose restoration | cutaway_points:275; remove from pose migration. |
| 11 | E:80 bea_invitation:121–136 pose restoration | inspection_rect:120, snapshot:124, cutaway_points:134; no saved pose. |
| 12 | E:80 helper_bench:274 pose restoration | inspection_rect:271; no saved pose. |
| 13 | E:80 quiet_seats:184 pose restoration | cutaway_points:182; no saved pose. |
| 14 | E:80 loan_homecoming:139 pose restoration | cutaway_points:137; no saved pose. |
| 15 | E:80 civic_listening:335–342 pose restoration | queue_nav_refit:327/settle_navigation:338; no saved pose. |
| 16 | E:82 SPEECH_BUBBLE_HEIGHT_M:263 | M:199. |

Other existing anchors in orders 2.1–2.7,3.1–3.4,4.1–4.5,5.1–5.4 resolve to the named code. Proposed new APIs are not missing-anchor errors. update_guide_marker:6279 is a valid body location; declaration 6258, bob/spin 6283–6284. film_easel_snapshot~3143 and quiet_seats:158 likewise point inside their functions.

**2. Feasibility and order**

Phase 2’s second-contact prohibition conflicts with simultaneous stick/look (E:45–46). Its capture policy lacks captured-Esc consumption, asynchronous cancellation and panel-open release: M:15115 also stops walking/ends conversations, while S:48 does not suspend for every panel. Two frames do not establish browser refusal; that threshold is **unverified**.

Phase 3 needs selected-target dispatch: M:6361 reselects the nearest neighbour. T’s actual priorities include arrived/pending cases and a Celeste fallback (M:15013–15029). The blanket LOS claim at E:65 is false for surprise projections M:14478 and gold-marker dispatch 14500. S:280–287 exempts the target’s entire building, unsuitable for strict interaction visibility.

Phase 4’s five-field return loses Rhythm’s overview/selection fields and manual-takeover semantics (rhythm_circle.gd:262/294–302/485/492). S:48 has no talk_partner condition; M:6397 causes conversation suspension. G currently stays in street view (M:15552), contrary to E:81. Side docks are forbidden at E:81 but retained at 84. Bubble source height is set at M:4758, not only its animator 4817; existing Info expands the header at 4845, so calling it a subtitle panel does not specify a new layout.

Keep the adapter **after Phase 3**, answering question 1: target resolution can reuse current gameplay entry points. Move Phase 5’s ownership table before adapter implementation. Answer question 2: **yes**, use an initially disabled transient conversation toggle; it does not replace ownership tests. E:97 names eighteen modules but M:12147 lists fifteen focused activities; the extra identities are **unverified** and must be enumerated.

Additional blockers: E:49 needs saved-override/OS-preference precedence and reset defaults (M:10713–10750); smooth turning lacks a rate. E:51 must restore map keep_aspect and use a calibration target: responsive bubble scale already differs by >11% between the cited sizes (M:4685/4700). E:53 freezes transforms while burst expansion/lift/scale and bubble pop remain (M:5949–5962/4816). E:8’s exact off-mode promise needs an explicit exception for reduced-motion preferences affecting map animations.

**3. Map risk and missing tests, by phase**

| Phase | Largest default-map risk; required coverage |
|---|---|
| 2 | Shared movement/input dispatch (M:14356). Preserve map pan/pinch/press-settle; add enabled=false parity, simultaneous stick/look, emulated-mouse duplication, neutral stick, capture cancellation and aspect restoration. |
| 3 | Replacing target precedence (M:14491). Retain mural/speaker tap checks study_test.gd:646–665; add two-neighbour identity, occluded marker/surprise, stale focus and rejected taps preserving an existing route/announcement. |
| 4 | Incomplete adapter restoration. Retain study_test.gd:4117/4149–4152/4189; add overview/selection, supersession, repeated release, toggle-off parity, long dialogue and Face-speaker behind the eye. |
| 5 | Suppressing legitimate post-close refits (rhythm_circle.gd:307–320; civic_listening.gd:338–343). Test every enumerated activity, resize/manual takeover/nested transfer and stale callbacks. “Every close resumes street” must exempt deliberate manual takeover. |
| 6 | Global corridor-speed changes (M:13866). Add exact on/off west/Blackhawk speeds; existing study_test.gd:896 only checks an upper bound. Also Skip cancellation/replan/double press, obstacle sliding, scope crossings and rooftop restoration. |
| 7 | XR teardown retaining camera/viewport ownership. Add fake lifecycle end/failure/loss/re-entry tests plus headset tests; S.apply_camera:164 must not overwrite tracked pose. |

Native headless can verify synthetic input, state and projected geometry. It cannot establish browser Pointer Lock, physical Esc, actual touch capability, rendered readability, screen-reader usability, phone FPS or XR acceptance. E:53 needs injected capability/capture seams; use existing CDP touch patterns (tests/godot-browser.mjs:447). E:86’s 1.35 m should mean player–speaker **distance**, with the selected bubble height, not a seated-height fixture. Browser rendering and device exits remain separate.

**4. Sizes and remaining scope**

No section 8 estimate can be established as >2× wrong from source alone; all are **unverified**, and whether tests count is unspecified. My provisional Phase 6 allowance is **800–1,200 Godot lines including tests**, versus 400: scope/travel 200–300, obstacles 150–250, visibility/performance 100–150, tests 350–500. This is planning judgment, not measured work.

Phase 6 must separate scope from collision (M:8088–8102), use planar tree/lamp points (M:940/937), and restore distance-hidden roofs. Phase 7 remains discovery until headset/browser/controllers, reference space, floor offset, collision, UI coverage and stereo budget are specified (E:125–127). The 1.9 MiB warning at E:119 also permits less than E:11’s required 200 KB headroom.

**5. Top five exact replacements**

1. Replace Phase 2 orders 1–2’s touch policy and order4’s lifecycle policy with:

> Classify contacts at touch-down as GUI, movement, look or ignored; allow one movement and one look contact in either order, without reassignment. Consume owned emulated mouse events while preserving GUI releases and press-settle. Merge input into one guarded physics movement path: keyboard wins when nonzero; stick uses a 0.15 radial deadzone, remapped magnitude 0–1 and walk_input yaw rotation. Clear contacts on cancellation, focus loss and mode change. A drag release never routes; a fresh valid tap does. Track capture request generations, consume captured Esc before gameplay, release before every panel, and cancel late grants. Observe success/error; a bounded timeout is not proof of denial.

2. Replace Phase 3 orders 1–3 with:

> Build one ray-based resolver returning stable kind/ID, anchor and action. Focus uses 6 m/20° and sorts by angle, distance, then stable ID. Preserve existing tap ranges; parity means the same selected ID invokes the same action, not identical reach. Revalidate at activation; neighbour dispatch preserves existing Celeste/Rook rules without reselecting nearest. Use exterior interaction anchors and LOS without whole-building exemptions, including surprises and the gold marker. Resolve interactables before ground travel. Reject invalid or obstructed ground hits before route/panel/announcement mutation. Preserve map dispatch.

3. Replace Phase 4 order1 and Phase 5 order4 with:

> Complete the activity ownership inventory first. Migrate saved poses only in Rhythm, Lantern and Voting. Preserve Rhythm’s eight map fields and selected material; keep panel_camera_pose’s comparison signature separate. Stack nested claims; only the current owner releases. Manual takeover or changed mode choice invalidates pending restores; stale/repeated releases do nothing. Restore the eye at the player’s current location without capture. Distinguish stale callbacks from a valid, independently guarded post-close layout generation.

4. Replace Phase 4 orders 2/5 with:

> Gate eye-level conversations behind an initially disabled transient toggle. Change frame_conversation’s following-player detachment, not a talk_partner predicate. Permit existing side docks; use complete Info fallback whenever the bubble cannot fit. Stop the route on entry; renewed walking closes the conversation. Preserve heading; a behind-eye partner uses fallback until Face speaker turns toward them. G explicitly suspends for the hub and releases ownership on close. Set neighbour bubble height 2.05 m at creation. Test desktop, portrait, short landscape and toggle-off parity.

5. Replace Phase 6 order2 with:

> Before widening scope, cap active street routes at 4.8 m/s while preserving inactive corridor/web speeds. Offer Skip for remaining polyline length over 60 m. Capture a route generation; Stop, replan, suspension or repeated activation cancels it. Revalidate after the fade, trim that route to its final 20 m, update camera/ribbon, and retain arrival intents. Test cancellation and unchanged map travel.

REVIEW-COMPLETE 16/5
