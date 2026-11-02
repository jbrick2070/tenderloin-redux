# Final execution-spec review: Codex + Antigravity

Source-checked synthesis, November 2, 2026. **Revise before implementation.** Reviewed HEAD 103cb2f plus working-tree follow-ups. Both original reports remain unchanged. No game, tests, build or browser ran; runtime results are **unverified**.

**Evidence standard:** source facts require file:line evidence. Existing plan choices are requirements, not measured optima. Recommendations below are proposed decisions, not verified behavior or approved spec changes. Reviewer agreement alone is not evidence.

E = [docs/FIRST_PERSON_EXECUTION.md](/C:/tenderloin-redux/docs/FIRST_PERSON_EXECUTION.md); M = [godot/main.gd](/C:/tenderloin-redux/godot/main.gd); S = [godot/street_view.gd](/C:/tenderloin-redux/godot/street_view.gd). Other .gd paths are under godot/. This reconciles [execution-review-codex.md](/C:/tenderloin-redux/docs/first-person-advice/execution-review-codex.md) and [execution-review-gemini.md](/C:/tenderloin-redux/docs/first-person-advice/execution-review-gemini.md), without changing the plan or spec.

## 1. Verified anchor corrections

Seventeen unique corrections; repeated references count once. In-function line references are acceptable.

| # | Spec reference | Correct source |
|---|---|---|
| 1 | E:10 build_web_a11y_snapshot | get_a11y_status_snapshot, M:11838. |
| 2 | E:45 mouse range | M:15135–15165; pan dispatch 15164. |
| 3 | E:63 TALK_PROMPT_RADIUS_M:264 | M:64. |
| 4 | E:66 Bea snapshot:136 | bea_invitation.gd:124, projection 130. |
| 5 | E:66 helper snapshot:287 | helper_bench.gd:302, projections 310/314. |
| 6 | E:66 scene_overlay_snapshot~11755 | M:11785, projection 11806. |
| 7–9 | E:66 fit_overlay_around_player / layout_reward_banner / trigger_feel_good_burst projections | M:7134/5873/5908 contain no unprojection; bounds originate at player_overlay_rect:7114, burst position at 5927. |
| 10–15 | E:80 six purported camera restorers | shared_panel.gd:275, bea_invitation.gd:120/124/134, helper_bench.gd:271, quiet_seats.gd:182, loan_homecoming.gd:137, civic_listening.gd:327/338 are inspection/projection/cutaway/layout helpers, not saved poses. |
| 16 | E:82 SPEECH_BUBBLE_HEIGHT_M:263 | M:199; height applied at 4758/5298/5729/8755. |
| 17 | E:33 thirteen test groups | Twelve numbered groups, tests/street_view_checks.gd:29–248. New numbering starts 13 (E:53). |

Other existing Phase 2–5 work-order anchors resolve; proposed APIs are not missing symbols. update_guide_marker:6279 is valid; declaration 6258, animation 6283–6284. Enumerate E:97’s “eighteen modules”: M:12147 lists fifteen focused activities; additional helpers need explicit identities.

## 2. Source facts and proposed decisions

**Adapter — facts:** E:64 dispatches existing gameplay entry points. Surprise/park/museum set following_player false (M:5701–5707/4587–4593/8721–8727). Rhythm/Lantern/Voting save camera poses (rhythm_circle.gd:262, lantern_procession.gd:293, voting_story.gd:236); dog_story.gd:279 and power_story.gd:371 call walk_to_point. **Recommendation:** keep the adapter after Phase 3, before eye conversations; inventory ownership first. Source evidence does not establish a dependency requiring an earlier landing or Codex’s blanket ownership-stack proposal.

**Conversations — facts:** S:48 has no talk_partner predicate; M:6397 detaches following. Hub code retains the followed target and skips refitting while street-active (M:15547–15549/15517), contrary to E:81’s suspension claim. Gemini’s automatic face_toward shortcut conflicts with E:76 and names a nonexistent helper. **Recommendation:** use a temporary development gate until Phase 4/5 transition tests pass, or release both together. Source inspection does not prove a separate toggle is necessary.

**Portrait/layout/save:** E:41/51 selects KEEP_WIDTH in portrait; preserving that choice is a recommendation, with comfort **unverified**. Aspect restoration is a prospective requirement because E:51 changes keep_aspect while S:92–105 does not restore it. Stick placement at 667×375 remains **unverified** pending layout testing. Preferences have a separate settings envelope (M:10713–10719); the specified transient eye state supplies no identified reason to change progression saves.

**Existing requirements, not measured optima:** E:49/63/65/82/83 specifies default 70°, adjustable 60–90°, 6 m focus, 60 m ground-ray cap, 2.05 m prompt and 2.4 m marker. Gemini’s alternative values lack measurements. Retain the documented choices pending validation. The straight-chord segment_walkable requirement (plan:126; E:65) excludes obstructed direct segments even when A* could find a detour; removing it changes policy.

Gemini misstates S:59–69/167: sync handles transitions; target is player+UP, not eye+forward×6. Do not re-enable street cutaways: M:14148–14150 deliberately clears them. Tree pivots are Array[Vector3] (M:944), not Node3D; use planar points 940/937/953.

## 3. Risks and required tests

These are prospective regression risks and proposed acceptance tests, not observed runtime failures or passing results.

| Phase | Main map-view risk and coverage |
|---|---|
| 2 | Shared input M:14356: preserve map pan/pinch/press-settle; test simultaneous stick/look, synthetic-mouse duplication, cancellation, neutral input and portrait aspect round-trip including projected_bounds:15390. |
| 3 | Dispatch M:14491: retain study_test.gd:646–665; test two-neighbour identity, occluded gold marker/surprise, stale focus, above-horizon interactables and rejected ground taps preserving the current route. |
| 4 | Incomplete pose restoration: retain study_test.gd:4117/4149–4152/4189; test selection/material, overview, manual takeover, supersession, repeated release, toggle-off parity, long dialogue and behind-eye Face speaker. |
| 5 | Legitimate post-close refits, rhythm_circle.gd:307–320 / civic_listening.gd:338–343: test every inventoried activity, delayed callbacks, resize and ownership transfer. Save visible stick → open activity → disable street → close; verify no stale HUD/contact restoration. |
| 6 | Corridor speed M:13866–13868: test exact inactive 24 m/s and web×2.2 versus active 4.8; study_test.gd:896’s upper bound is insufficient. Add Skip cancellation, replan, repeated press, obstacle sliding, scope crossings and roof visibility restoration. |
| 7 | XR ownership/teardown: fake lifecycle tests plus headset acceptance; S:164 must not overwrite tracked pose. Specify device/browser/controllers, reference space/floor offset, collision, UI and stereo budget. |

Native headless supports synthetic state/geometry, not browser Pointer Lock, physical touch, rendered readability, screen readers, phone performance or headset acceptance. Use Godot browser suites; Gemini’s browser-smoke.spec.js does not exist. Its distant-building-tap selection test is invalid: M:14589 routes; choose_next:15216 selects.

Keep Phase 6 soft obstacles guarded in manual street movement; do not change global is_walkable_point or A* (M:8088/8311). Restore prior rooftop visibility on exit. Retain depth-aware marker scaling (M:6281–6282).

Fourteen of fifteen focused modules use saved_visibility, not twelve; that does not prove zero integration changes. Current S:73–74 saves near/far only, contrary to Gemini’s invented saved_projection/fov/size fields. Its quoted checks==12 assertion also does not exist.

E:49 needs OS-preference versus saved-override precedence, defaults/reset and smooth-turn rate. E:8 needs an explicit reduced-motion exception to off-mode parity. E:53’s transform test must account for burst expansion/lift/scale and bubble pop (M:5949–5962/4816). Revise E:86 to test 1.35 m player–speaker separation with the chosen bubble height (plan:52).

**Sizes:** neither report establishes a >2× error. Actual E:137–139 estimates are 250/350/300+table; Gemini critiques nonexistent 90/90/60 figures. Speculative replacement line counts are excluded from this synthesis. Implementation size remains **unverified**. Align E:119’s 1.9 MiB warning with E:11’s 200 KB headroom.

## 4. Five proposed exact spec replacements

These recommendations require implementation and acceptance testing. They are not current behavior or runtime proof.

1. Replace Phase 2 orders 1–2 touch policy, order 4 lifecycle and order 7:

> Assign GUI, movement, look or ignored roles at contact-down; allow one movement plus one look in either order. Integrate once through the existing physics path, with yaw rotation, explicit deadzone/key priority, clamped magnitude and panel guards. Preserve GUI releases; suppress owned emulated-mouse duplication. Clear contacts on cancellation/focus/mode changes. Drag release never routes; a fresh valid tap does. Track asynchronous capture requests; consume captured Esc before gameplay, release before every panel, cancel late grants, and distinguish timeout from denial. Save/restore actual keep_aspect; honor selected 60–90° FOV, default 70°. Interpret that angle vertically in landscape and horizontally in portrait; use KEEP_HEIGHT/KEEP_WIDTH respectively, with matching screen_constant dimensions. Test fixed-label scaling, then responsive bubble fit; responsive scale factors already differ by over 10% (M:4685/4700).

2. Replace Phase 3 orders 1–3:

> Use one resolver returning stable kind/ID, anchor and action. Focus uses 6 m/20°, ordered by angle, distance, ID; preserve existing tap reach and special Celeste/Rook dispatch without nearest-neighbour reselection. Revalidate on activation. Use exterior anchors and strict LOS, including gold markers/surprises, without whole-building exemptions. Resolve interactables before ground. Before mutations, require a finite positive ground-ray hit within 60 m and a walkable straight segment. Preserve map dispatch.

3. Replace Phase 4 order 1 and Phase 5 order 4:

> Inventory ownership first. Migrate Rhythm/Lantern/Voting saved poses; preserve Rhythm’s eight fields and selected material. Keep panel_camera_pose’s comparison signature separate. Define actual owner transfers; add a stack only if required. Manual takeover or changed mode invalidates pending restores; stale/repeated release does nothing. Resume at current player position without capture. Allow independently guarded legitimate post-close layout callbacks.

4. Replace Phase 4 orders 2/5:

> Gate eye conversations until Phase 4/5 validation. Change frame_conversation’s following-player detachment; no talk_partner predicate exists. Preserve heading, stop routes, close on renewed walking; Face speaker alone turns. Permit side docks and complete Info fallback. Explicitly suspend G for hub ownership and resume on close. Set speech anchors at creation, preserving per-kind offsets and map heights; use 2.05 m for neighbour speech/prompt. Validate portrait and short landscape.

5. Replace Phase 6 order 2:

> Before widening scope, enforce active 4.8 m/s while preserving inactive speeds. Offer Skip for remaining polyline length over 60 m. Stop, replan, suspension or repeated activation cancels its generation. Revalidate after fading; trim to the final 20 m, update camera/ribbon and preserve arrival intent.

REVIEW-COMPLETE 17/5
