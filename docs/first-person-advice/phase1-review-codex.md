# Phase 1 street view review (Codex)

Source-only review of main at e117ae482af6bc33e42bc0b705121a8e77e669bf plus the uncommitted Phase 1 files, November 2, 2026. No Godot, npm, browser, or tests ran. References below abbreviate godot/main.gd as M, godot/street_view.gd as S, godot/tests/street_view_checks.gd as T.

**Findings, highest priority first**

1. **P2 — Speech does not reliably suspend.** M:6414/6454 lets “What’s Next?” open speech while following; face away from a neighbour within 6 m → M:4824/4848 projects and fits a behind-eye bubble, preserves negative depth, and spends its reading timer without necessarily using Info. Celeste/Rook arrivals likewise retain perspective on desktop (M:9017/9034/15472/15495). The plan’s justification for deferring bubble visibility is false.
2. **P2 — Guidance still assumes an elevated camera.** Turn away from the objective → M:7192/7197 hides its arrow when the mirrored projection falls inside the play area. Approach a neighbour with level pitch → the 5 m Talk anchor (M:6343) leaves the vertical frustum below approximately 4.9 m distance.
3. **P2 — First toggle destroys map intent.** Rotate/zoom the followed map, toggle twice → S:179 calls M:7486–7488, resetting map yaw/pitch/size. T:55 records its baseline after this first destructive round trip, so T:65 misses it.
4. **P2 — Gesture ownership crosses modes.** Hold two fingers in street view, toggle off with Shift+F, then drag → M:14657/14671 applies the old pinch baseline. M:14664 clears pending work but retains contacts/ownership. Releasing both fingers clears it.
5. **P2 — Street signs remain tiny and visible through walls.** Looking at StreetBanner/CornerSignLabel text → M:2232/2257 creates labels excluded from M:2307’s managed registry; fixed world sizing and no_depth_test bypass the new range/LOS policy.
6. **P2 — Web pace protection lacks coverage.** Remove M:14411’s street exception → web routes run at 10.56 m/s, while T:167/169 still passes because it calls advance_walk directly.
7. **P2 — Browser evidence can cover stale street code.** Edit only S after export → tests/godot-browser.mjs:48–110 omits S, T and tests/street-view-browser.mjs from freshness/fingerprints. The aggregate receipt at :3873 also omits streetViewChecks; individual receipts exist.
8. **P3 — Entry instructions are overwritten.** Toggle on → S:88’s controls announcement is replaced by M:7498 then S:181; the once-per-frame bridge (M:12024–12046) publishes location/exit only, without heading or turn instructions.
9. **P3 — Native fixture leaks state.** T:198–227 injects keys → M:14803–14806 sets reward_audio_unlocked, absent from T:21’s restoration and read later at study_test.gd:139/239/251. has_heading also remains true. Unlike before_streets_checks.gd:7–22/194–212, it omits focus/visibility, panel framing/dialogue and route-intent/arrival flags; later readers include study_test.gd:475/607/650/873/3756. Subsequent failure is unverified.

**A–D: coverage and limits**

All M diff hunks were traced. With enabled=false, the added camera/occlusion/refit/hub/zoom/pan/pinch/movement guards retain their prior branches. All seven screen_constant_scale callers and speech_bubble_base_scale retain the identical orthographic arithmetic; positional arguments have no side effects. player_screen_point preserves the old projection result. Ordinary arrows and plain F retain their behavior; Shift+F intentionally changes it. State/setup/tick/snapshot additions are inert geometrically. Hunk groups: sizing M:4692/4718/4848/6217/6279/6351/7124/14289/14330; ownership :9215/9254/14099/14141/15153/15409/15502; input :14369/14394/14411/14440/14445/14493/14584/14664/15092; initialization/bridge :829/9222/11950/11955/14327/16230.

“Byte-for-byte unchanged” nevertheless fails for UI: the new button changes focus traversal, hit targets and caption exclusion (M:14268/14433). panel_camera_pose (M:9215) gains false; all discovered consumers store/compare whole arrays, with no indexed/four-element consumer.

Every screen_to_ground_xz caller: scene tap M:14482 rejects INF at :14493 before ordinary routing; pinch capture :14633 can retain INF; pinch drift :14674 is excluded because street capture records following=true. No reachable INF-to-target/route path was confirmed; snapshot anchor projection :11948 remains unsafe geometry, with serialization consequences unverified.

Direct main framing paths update the camera before fitting. Rhythm return/deferred checks (:294–320), Lantern (:292–300), Voting (:235–241) preserve map intent. Focused opens/closes can wait until M:14328’s tick; Rhythm tick at :14346 can change visibility afterwards. A one-frame ordering window exists; visible flicker is unverified.

Bea/helper inspection rectangles reject following cameras; their snapshots, Quiet Seats, Rhythm, Lantern and Voting still project unchecked corners. Hidden player_visual makes player_overlay_rect empty, so reward/overlay fitting avoids the eye singularity. No remaining production division by camera.size was found. Picking M:14454–14560 lacks behind checks except the tour marker; a particular unintended activation is unverified.

Direct toggle releases focus and normal button taps cannot route. Clicking a no-op Zoom can subsequently retain GUI focus before Shift+arrows; exact traversal behavior is unverified. No conflicting match arm was found.

**E: assertion audit**

Static counterfactuals, not executed mutations. T assertion lines:

| Lines | Protection tested; what can survive removal |
|---|---|
| 11/12/14,27 | Harness/default-off; individual active constraints survive while disabled. |
| 35/36/37/38 | Projection/eye assignments detected; target assignment removal survives follow_player’s duplicate; FOV/far checked, roll starts zero, near untested. |
| 39/40/41 | Final toggle announcement/body hide checked; enter announcement, entry cutaway clear or nameplate hide can disappear because later paths duplicate them. |
| 45/46/47 | Rescale, button state, UI-rectangle inclusion checked; removing one refresh call survives tick. Actual focus/tap dispatch untested. |
| 53/54,65/69/73/74 | Exit projection/planes/announcement/scale/body/button checked; initial pose loss survives; material comparison lacks seeded cutaways; environment not compared. |
| 82/83/86,92/95 | Suspension/return checked; overview predicate removal survives following=false; conversation exposes removal of following-player ownership. |
| 108 | Refit street guard removal survives pan guard; call is synchronous. |
| 119–121 | Horizon rejection; 60 m guard and tap-dispatch rejection untested. |
| 129 | Depth ratio; bubble-specific scaling removal survives. |
| 143/144/153 | Rejects trivial LOS always-true/false; shared algorithm faults or absent caption filtering can survive this fixture. |
| 164/166/169 | Route/pace; web multiplier bypassed. |
| 177/180/184 | West destination; player-boundary guard removal survives. |
| 213/214/221 | Snap/toggle; forced focus release masks GUI capture; tilt untested. |
| 252/253 | Camera/player/path only; other restoration leaks survive. |

tests/street-view-browser.mjs:8/39 polls frame count rather than expected yaw; no sleeps. :41 accepts either turn direction. Blue-threshold upper samples and “not blue” lower samples (:31–36) cannot prove sky/ground reliably across 1100/390/320 widths. Start Exploring placement supplies position, first heading, following and viewport equality; reordering invalidates those assumptions.

**F–G: prioritized shipping changes**

1. **Phase 1:** repair findings 1–7/9 before release. In M’s speech, picking, guidance and test functions, add front/LOS checks, readable fallback, explicit suspension, initial-pose fixtures and real dispatch coverage. Medium, multiple changes exceeding 25 lines; risks are interaction precedence and map regression.
2. **Phase 1:** clear gestures on mode change. In S.sync(), immediately after the unchanged-state return:
~~~gdscript
game.cancel_map_pinch()
~~~
One line; cancels held gestures deliberately, preventing cross-mode zoom.
3. **Phase 1:** replace S.toggle():181’s announcement:
~~~gdscript
game.announce_a11y_status("Street view. Facing %s. %s. Shift+arrows look; WASD or arrows walk; Shift+F returns to map." % [heading_text(), game.location_phrase(eye_xz())])
~~~
One line, negligible risk; automatic-resume announcements need separate lifecycle coverage.
4. **Phase 1:** manage street signs separately with map restoration (M.build_street_name_signs/update_readable_scene_labels; 30–60 lines; crowding risk). Keep the 132×44 button; reserve it in M.update_guide_arrow’s occupied list:
~~~gdscript
if street_view != null and street_view.button_visible():
    occupied.append(street_view.button.get_global_rect().grow(6.0))
~~~
Two lines; reduces text placement space, not arrow-polygon overlap.
5. **Phase 1, creator decision:** complete portrait FOV plus matching scale denominator in S.apply_camera/screen_constant and restore map aspect (~30 lines; rotation-framing risk). Current 70° vertical gives only ~37° horizontal at 320×667. Keep 1.6 m, 30° snaps, objective-first heading, true-scale neighbours and pitch-independent walking provisionally; compare slower pace against 4.8 m/s with people.
6. **Phase 1:** restore reduced motion in settings/tree/bubble/marker functions (~50–100 lines; animation-test risk). docs/first-person-advice/phase0/RESULTS.md’s ~8 ms desktop script time is not phone qualification; measure real phones before optimizing.
7. **Phase 2 before mobile release:** one-finger look/contact ownership, analog magnitude and capture lifecycle (>100 lines; gesture-conflict risk). Change M:530–543/14583/14607–14659/14719/14790/14821/15120–15150, especially the 8 px threshold :15146, walk normalization :8329 and focus-loss :10938. Chrome measured re-lock at 0.5 s, not universally immediate; embedded refusal requires drag fallback.
8. **Phase 2, creator decision:** retain activity suspension; trial one neighbour with existing panel subtitles, stopped walking and preserved yaw instead of world bubbles (M.frame_conversation/show_neighbor_speech; 40–80 lines; focus risk). Later: wider activities/district/skip-ahead. S.in_block is a half-plane, not one block; creator must choose truthful scope or a polygon (~30–60 lines; boundary-cut risk).

docs/FIRST_PERSON_PLAN.md §7 defaults 1/3/5/6/8/9/11 remain; qualify 2/7, reconsider 4 explicitly, keep 10 opt-in, and enforce 12 consistently.

REVIEW-COMPLETE 9
