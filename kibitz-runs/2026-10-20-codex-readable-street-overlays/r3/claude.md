TOOL CHECK: PASS (Read/Grep/Glob worked on godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs). No shell, so I could not run `git diff`. I reviewed the current working-tree source, which means I cannot always say whether a line is new in this diff or was already in c5f29e7. Where that matters, it is marked.

VERDICT: yes-with-fixes. Composition order, publish-after-composition and the tap paths work as described. But the new "queue reward while Info is expanded" gate combines badly with Info auto-expansion that nothing ever undoes, and one browser assertion can pass without testing anything.

MUST-FIX BEFORE BUILD

1. [layout_reward_banner / update_speech_bubble lifecycle] Auto-expanded Info is never collapsed by code, so rewards can stay queued and invisible with no end point.
   - Source proof: godot/main.gd:4610-4613 calls set_header_details(true, false) when dialogue is moved into Info. hide_speech_bubble (main.gd:4573-4579) only clears speech_bubble_in_info. It does not collapse Info or restore info.text.
   - Grep finds 9 set_header_details(true...) call sites: 4613, 6182, 7512, 7556, 7600, 7649, 7868, 7896, 12356. The only path that collapses Info is the user's own toggle at main.gd:13632. No code calls set_header_details(false) or sets header_details_expanded = false.
   - layout_reward_banner (main.gd:5645) now sets visible only when area.encloses(...). While the banner is hidden, update_celebration_burst (5676-5677) does not decrement reward_banner_timer. So the reward waits until the player happens to collapse Info.
   - Trigger: the test's own fixture proves the queueing at 320x667 with a conversation open and Info expanded (godot/tests/study_test.gd:1913). The test then collapses Info by hand (study_test.gd:1916-1918) before asserting the banner appears (1922). That hides the missing automatic recovery.
   - Same gap on reset/restore: main.gd:11080 and main.gd:11669 call hide_speech_bubble but leave Info expanded with stale dialogue text.
   - Impact: Order Up, surprise and tour-complete rewards get no visible feedback at phone widths after any route-blocked notice, What's Next answer or oversized line. The 3D title is also suppressed (see #2).
   - Smallest fix: add a flag `speech_info_auto_expanded`, set at 4613. In hide_speech_bubble, if the flag is set and info.text still begins with speech_bubble_text, call set_header_details(false, false) and clear the flag. Then add a native assertion that does NOT collapse Info manually: after the timer expires, the queued banner must become visible on its own.
   - For the pre-existing auto-expansions (route failures, What's Next), keep the gate but add a ceiling. If the banner has been queued longer than about 3 s, show it anyway as an overlay, or put its title in the expanded Info text. Either way the reward is never silent.

2. [update_celebration_burst, avoid duplicate floating titles] The floating title is hidden whenever a timer is running, even when the banner is not shown.
   - Source proof: main.gd:5700 sets `celebration_burst_label.visible = reward_banner == null or reward_banner_timer <= 0.0`. A queued banner keeps reward_banner_timer > 0 while reward_banner.visible == false (5645, 5676-5677).
   - Impact: while the reward is queued, neither title shows — not the banner and not the floating 3D label. Only the gems appear.
   - Fix: `celebration_burst_label.visible = reward_banner == null or not reward_banner.is_visible_in_tree()`. This still prevents duplicate titles when the banner is on screen.

3. [Browser checks, "full reading time"] tests/godot-browser.mjs:539-547 can pass without testing anything.
   - Source proof: the snapshot is only republished when a11y_sync_pending is set. That happens on announcements and on the 0.5 s objective timer (main.gd:6870-6874, 10762-10777).
   - The banner tap is swallowed and does not announce anything (main.gd:12702-12703). The test waits only 350 ms (godot-browser.mjs:542). So afterBannerTap is often the exact same published object as tourComplete, and `remaining` equals itself.
   - Fix: before reading afterBannerTap, wait for `ui_frame > tourComplete.ui_frame`, the same pattern already used at 520-521. Also assert that `deferred` was true in both snapshots, or log that the check was skipped. Otherwise the timer-preservation claim has no browser evidence.

SHOULD-FIX

1. [_process sequencing, published geometry] main.gd:12586-12591 runs update_celebration_burst (banner layout) before update_conversation_ui and update_speech_bubble. Both of those can change Info visibility (6866-6869, 4613).
   - In the frame where speech moves into Info, announce_a11y_status (4614) forces a publish in that same frame (10760 -> 12591).
   - [ASSUMPTION: Godot updates container layout one frame late] header_panel.get_global_rect() is then still the pre-expansion size. So play_area, caption rects and banner fit are all published for a layout that is no longer on screen. That is one frame of stale published geometry, which the driver lists as a MUST category.
   - Smallest fix: after set_header_details at 4613, set a flag that keeps a11y_sync_pending set for the next frame, and do not publish in the current frame.

2. [update_speech_bubble defer and neighbor chrome] While speech waits behind the banner, the bubble node is hidden (4607). Every consumer that keys on is_speech_bubble_visible() then behaves as if the speaker is silent:
   - the Talk prompt for the speaker reappears (main.gd:6053-6056);
   - their nameplate caption returns and takes the bubble's space (12566-12567);
   - the guide arrow comes back (6441).
   - Trigger: any neighbor line given together with a reward while the banner leaves too little room. Effect: the prompt and nameplate flicker in for up to 3.2 s, then vanish when the speech appears.
   - Fix: for "speaker is talking" checks, test `speech_bubble_anchor == n_id` (the anchor is non-empty while deferred) instead of node visibility.

3. [update_readable_scene_labels, avoid transient overlays] The `occupied` list (12525-12529) holds only the reward banner and the speech bubble. Missing:
   - the Talk prompt (main.gd:6011-6031): an opaque background at render priority 10, drawn over world captions at priority 8 (2208);
   - the gold GuideMarker;
   - the story card.
   - Both overlap checks (native verify_scene_overlay_bounds and browser assertReadableOverlays at godot-browser.mjs:484-496) list the same small set, so they are blind to this overlap.
   - Fix: add a screen rect for talk_prompt_node, computed the same way as speech_bubble_screen_rect, to `occupied` and to scene_overlay_snapshot.

4. [handle_scene_tap precedence] The cached caption hit test (12712-12715) runs before the neighbor, mural, speaker, history-stop and surprise tests (12716-12759).
   - An eatery caption rect is up to 320 px wide plus 20 px padding (12523, 12555). A neighbor or surprise standing under it becomes untappable; the tap goes to activate_eatery -> cycle_eatery_guide (12800), which also moves the camera (7835-7837).
   - [ASSUMPTION] It is unclear whether captions visibly cover those targets in practice.
   - Fix: only let a caption win if no neighbor qualifies under the existing (screen_d <= 48 and world_d <= 14) rule, or if the tap is within the caption's unpadded text rect.

5. [update_speech_bubble Info fallback, user collapse] Once speech_bubble_in_info is true (4610), collapsing Info by hand while the line still does not fit leaves the dialogue nowhere: it is off screen and Info is hidden. The timer keeps running (4620).
   - Fix: in the deferred branch, if speech_bubble_in_info and not header_details_expanded, call hide_speech_bubble() (treat it as dismissed).

6. [trigger_feel_good_burst, finale protection] keep_finale (main.gd:5651) checks reward_banner.visible. A queued (hidden) 10/10 finale is therefore overwritten by the next reward.
   - Fix: check `reward_banner_timer > 1.0` alone, or `reward_banner_timer > 1.0 and (reward_banner.visible or queued)`.

7. [eatery_counter_interact vs Info fallback] main.gd:5086 writes the "Ordering at X: item" info text. If that same host line then moves into Info, 4612 overwrites it and the item name is lost from Info. Fix: append the speech text to the existing info.text instead of replacing it.

OPTIONAL / NICE-TO-HAVE
- main.gd:4533 and main.gd:4604 repeat the bubble-bounds constants (+6.0, +7.2, the tail as box.z). Put them in one helper so the defer test and the hit/overlap rect cannot drift apart.
- Queued rewards have no staleness cap. A reward held under Info for minutes appears later with old content. Consider dropping it after N seconds.
- The browser host-after-reward wait (godot-browser.mjs:549-552) never completes if a line legitimately moves into Info at 320 px. Add an explicit `in_info` branch so the failure message says why.
- verify: whether godot/main.gd:12712 calling update_readable_scene_labels() from input is new in this diff. If so, note that it changes label visibility outside _process. It is harmless today because _process recomputes every frame.

CUT THESE (over-engineering)
1. The `last_synced_a11y_json` deduplication in flush_web_a11y_status (main.gd:10773-10775) never fires, because the payload always contains `ui_frame` (10676) and so differs every time. It is safe to remove, or drop it in favor of the existing 0.5 s cadence.
2. The `shift` parameter path of apply_speech_bubble_shape / bubble_shape_mesh and speech_bubble_shift (4535-4539, 4533) is dead: every call passes 0.0 (4525, 4558), and fitting moves the node instead (4618). It is safe to remove, and doing so takes one term out of the bounds formula.
