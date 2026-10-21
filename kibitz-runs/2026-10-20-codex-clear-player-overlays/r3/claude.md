TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot). Bash was disabled in this session, so I could not run `git diff`. Every claim below comes from reading the working-tree files. Where I could not tell whether code is new in this round or older than baseline dd1f068, I mark it "verify: baseline".

VERDICT: yes-with-fixes. The core geometry is sound: in godot/main.gd:6610-6634 the per-frame drawn bubble always fits inside the fitted rect, and the body prism covers the rig. But the speech-vs-reward contract still assumes the reward is a top band, which is no longer true. The browser evidence for the queued reward's timer is conditional and can pass on a stale snapshot. And the native "animated bounds" evidence only checks a resting pose.

MUST-FIX BEFORE BUILD:

1. [Browser evidence: queued reward timer] tests/godot-browser.mjs:339-342 waits 350 ms and then asserts `overlays.reward.remaining` is unchanged. But the snapshot is only republished when `a11y_sync_pending` is set. Without an announcement, that happens every 0.5 s: main.gd:7128-7132 (`objective_refresh_timer = 0.5` → `sync_web_a11y_status()`), main.gd:11116-11125 (`flush_web_a11y_status` returns early unless pending). In a 350 ms window it is likely that no new payload arrives, so the equality passes even if the hidden timer is being spent. Fix (smallest): wait at least 1100 ms, i.e. more than two refresh periods. Or compare against a value known to change every publish. verify: whether the snapshot carries any per-publish counter (I saw `seq` only for announcements, main.gd:10708).

2. [Browser evidence: queued/Close path can be vacuous] tests/godot-browser.mjs:339 and :347 gate the whole queued-reward / release-on-Close check on runtime state (`remaining > 0 && !visible && !header_details_expanded`). Two things can skip it:
   - The reward actually fit at that size.
   - It already expired during `readActivityDetail` and the resize loop (:327-336). Its timer is only 3.2 s (main.gd:5768).
   When skipped, nothing is checked and the suite still passes. input.md says the browser "adds ... queued reward timer/Close behavior", and nothing proves that ran. Fix: count the sizes that took the queued branch and assert at least one did (e.g., 320 or 390 at 667). Otherwise assert `reward.visible` with a player-clearance check, so each size proves one branch.

3. [Speech ↔ reward interface contract] main.gd:4674-4678 excludes the reward by moving the speech area's top to `reward_banner.get_global_rect().end.y + 6`. That assumes the reward sits in a top band. But `layout_reward_banner` (main.gd:5738-5741) now routes the reward through `fit_overlay_around_player`, which can pick the bottom band or a full-height side column (main.gd:6618-6622). With the reward below or beside the player, the speech area shrinks to the strip under the reward, or to nothing. Speech is then deferred and returns early at main.gd:4693-4694 (`banner_visible` → return) for the whole reward display, even when there is plenty of room above. It is not unsafe (no overlap), but the order is reversed from the stated intent: speech that was already visible disappears when a reward lands at the bottom. Fix (smallest): pass the reward rect as an extra blocked rect instead of trimming the top. For example, give `fit_overlay_around_player` an optional `extra_blocked: Rect2` and subtract it the same way. Or only apply the top-trim when `reward_rect.end.y` is above the player rect's top.

SHOULD-FIX:

1. [Native evidence: "actual bounds of animated player"]
   - study_test.gd:2817-2821 checks mesh AABB corners at whatever pose the fixture is in. The player was teleported (study_test.gd:2806) and is not walking, so `stride` is about 0 (main.gd:3458-3463).
   - The walking swing (legs ±0.44 rad, arms ±0.38 rad; main.gd:3421, 3441-3442) and the talk gesture are never sampled.
   - The YOU Label3D is not a MeshInstance3D, so the loop skips it entirely. Its bounds rest only on the font-metric formula at main.gd:6600-6605.
   Fix:
   - Loop `animate_person_node(study.player_visual, phase, 1.0, 0.55)` over a few phases and check the corners.
   - Add `player_nameplate.get_aabb()` corners, projected via `to_global`, to the contained-points check.
   [ASSUMPTION] The prism ±0.70 local × CHARACTER_VISUAL_SCALE 2.15 (main.gd:14, 6596-6598) does contain these poses, judging by the rig dimensions in main.gd:3285-3408. The test just doesn't prove it.

2. [Speech → Info fallback is sticky, and a one-frame transient can trigger it]
   - main.gd:4695-4702 sets `speech_bubble_in_info = true` and expands Info the first time a fit fails.
   - Nothing un-routes it: the fitted branch (main.gd:4703-4706) never clears `speech_bubble_in_info` or collapses Info.
   - Expanding Info shrinks `play_area_rect` (header end, main.gd:6639-6640), so the fit gets less likely. This feeds back on itself.
   - `play_area_rect` reads `get_global_rect()` of panels on the same frame their visibility changes (main.gd:6644-6646, called after `update_conversation_ui` in `_process`, main.gd:12964-12966). One stale-layout frame can therefore push speech into expanded Info for its whole lifetime.
   - The native fixture waits two frames before speaking (study_test.gd:2813-2814), so it cannot see this.
   Fix: require the fit to fail on two consecutive frames before opening Info. Or, in the fitted branch, if `speech_bubble_in_info and speech_opened_info`, clear it and call `release_speech_info()`. verify: whether a newly shown PanelContainer's global rect is valid on its first visible frame.

3. [Single-slot reward queue now holds indefinitely]
   - A queued reward's timer is frozen while hidden (main.gd:5783-5784), but `trigger_feel_good_burst` overwrites the slot unconditionally, except for 10/10 (main.gd:5758-5768).
   - Every mural motif placement fires a reward (main.gd:11220-11223 → 10241-10243). The browser test places four motifs at about 120 ms intervals with the panel open (godot-browser.mjs:317-323).
   - So "Mural Complete" (main.gd:10188) can be replaced by a later "Painted X Motif" before it is ever shown. Close then reveals only the last, stale reward.
   - Before this round the same overwrite happened within the 3.2 s window. Now the window is unbounded.
   Fix (smallest): extend the `keep_finale` test so a queued, never-shown milestone reward (the `mural_complete`/`block_opened`/`*_complete` class) is not overwritten by a lower-priority one. Alternatively, append the displaced title to Info.

4. [Rewards dropped in overview] main.gd:5787 sets `reward_banner_timer = 0.0` whenever `in_overview or in_wide_overview`. A reward fired in, or queued into, map view is discarded with no Info fallback (main.gd:5745 also excludes overview). That contradicts "Rewards without room retain display time". verify: baseline (`git show dd1f068:godot/main.gd`). If this is older than baseline, record it as a known limit instead of fixing it.

5. [Weakened old assertions do not check delivery]
   - study_test.gd:2044 now accepts `reward_banner_timer > 0.0`, i.e. queued, in place of visible. Then :2040 and :2045 measure line counts and enclosure on a hidden banner, which proves nothing a user sees.
   - study_test.gd:2166 accepts Info for tour speech.
   - Neither queued branch asserts the content is later delivered at that text size.
   Fix: in the queued branch at :2044, add `set_header_details(true)` → `layout_reward_banner()` → `info.text.contains(reward_title_label.text)`, mirroring :2158-2160.

6. [Pop-animation reservation is misaligned] main.gd:4679-4682 builds `Rect2(rect.position, full_size)`, where `rect.position` comes from the current animated scale (0.6→1.0, main.gd:4670) but the size is the full size. Whether a fit exists depends only on size (main.gd:6626), so there is no pop-in-then-vanish. Two problems remain:
   - The nearest region can flip mid-pop, so the bubble jumps.
   - The bubble grows from the fitted top-left instead of from its tail.
   Neither native call exercises the pop: study_test.gd:2834 and :2146 call `update_speech_bubble(0.4)`, and `pop = clamp(0.4/0.2)` is already 1 on the first frame. Fix: compute the reserved position with full scale, i.e. anchor + offset × `speech_bubble_screen_scale()` (same formula as main.gd:4593). Add a native step at delta 0.02 to cover the animated frames.

OPTIONAL / NICE-TO-HAVE:
- The prism constants are hard-coded magic numbers: ±0.70, +0.05, grow(4.0) at main.gd:6596-6606, and grow(2.0) at :6615. The 0.70 should be tied to the ring radius 0.65 (main.gd:3264, 3292) through a named const, so a rig change cannot silently break it. The native corner test is the only guard.
- Add a fit unit case with the player near the top of the play area. It would cover reward-to-bottom-band selection and the speech placement that follows it (this exercises MUST-FIX 3).
- A frozen queued reward has no ceiling on how stale it can get, and no a11y announcement. Consider announcing the title when it is first queued.
- Browser player clearance (godot-browser.mjs:723) checks overlays against `player_overlay_rect()` taken from the same snapshot (main.gd:10962). That makes it a self-consistency check, not a check of rendered pixels. Name it that way in the evidence, or add a screenshot pixel probe of the YOU marker.

CUT THESE:
1. The double padding on the player rect: `grow(4.0)` in `player_overlay_rect` (main.gd:6606) plus `grow(2.0)` in the fitter (main.gd:6615). Keep one. The native corner test already proves containment without the 2 px, and the tests assert against the 4-px rect anyway. It is safe to cut because both are arbitrary and stacked; dropping one gives 2 px back to narrow phones.
2. No other over-engineering found. The activity-detail reuse (main.gd:4652-4656, 4688-4692) is the minimal way to avoid expanding Info.
