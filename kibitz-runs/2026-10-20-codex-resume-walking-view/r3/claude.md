TOOL CHECK: PASS (Read/Grep/Glob on godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs all returned content; Bash is disabled in this session, so I could not run git diff. Pre-change code below is taken from kibitz-runs/.../r3/driver_anchor.md:5 and marked "verify" where it matters.)

VERDICT: yes-with-fixes. The six starters are sequenced correctly: the helper runs after path validation, before finish_*, and before update_camera. But the helper uses following_player==false as its "inspection" signal, and that flag means more than inspection. The follow branch also has no upper bound, and the Map, immediate-arrival and find_path-failure branches are never exercised by the new tests.

MUST-FIX BEFORE BUILD

1. [Problem: "distinguishes detached inspection/pan from Map and existing follow"; "existing follow preserves deliberate zoom"]
   Defect: resume_walking_view (godot/main.gd:7456-7461) treats every following_player==false as inspection. Ordinary conversation framing also clears the flag:
   - show_conversation -> frame_conversation sets following_player=false (main.gd:6181, 6191).
   - That runs on every ordinary neighbor arrival via finish_neighbor_arrival (main.gd:8173): routed arrivals from advance_walk (main.gd:12352/12386/12408), and WASD proximity arrivals in _physics_process (main.gd:12752-12757).
   - focus_mural_camera, focus_speaker_camera and focus_block_camera (main.gd:8306/8322/8338) and choose_next (main.gd:13164) clear it too.
   Result: after any arrival, the next Walk & Talk, KeyN, tap or WASD step forces view_size to 45, even if the player deliberately zoomed to, say, 70. frame_conversation only shrinks views above 90 (main.gd:6192), so 70 survives the conversation and is then lost on the next walk. The native test (godot/tests/study_test.gd:277-280) only covers the case where following_player is already true, so it cannot catch this. Also, in the WASD case where W is held through a neighbor, frame N+1 calls walk_step, which calls resume and re-snaps to 45.
   Fix (smallest): accept the behavior as "conversation framing counts as detached". Correct the spec sentence and add one native assertion: arrive at a neighbor (advance_walk loop, as at study_test.gd:297-312), set view_size=70, call walk_to_neighbor(next), and expect 45. If the creator really wants zoom preserved after conversations, the alternative is a dedicated `camera_inspecting` bool. Set it only in inspect_so_what_easter_egg, inspect_tenderloin_museum_hub, cycle_eatery_guide, inspect_boeddeker_park, focus_history_stop_camera and pan_camera_by_screen_delta; clear it in follow_player and resume_walking_view. That is larger, so decide before building rather than leaving the spec contradicting the code.

2. [Problem: "existing follow preserves deliberate zoom (including 125m)"; regression of the old >110 shrink]
   Defect: in the follow branch the helper leaves view_size untouched with no ceiling.
   - zoom() (main.gd:13363-13368) keeps following_player as it is and allows up to max(900, overview_size*2.5).
   - A following player who scrolls out past 300 also switches update_camera to offset_scale 2.2 (main.gd:13156).
   - The next walk keeps the 300-900 m view, which reproduces the "character small" defect this round is fixing.
   - driver_anchor.md:5 says the old starters shrank views above 110 (verify against cf339d2 — no git access here).
   Fix: in the follow branch of resume_walking_view, add an `elif view_size > 300.0: view_size = 75.0`. 300 matches the existing offset_scale threshold, and the 125 test (study_test.gd:277-280) stays green. Add a one-line native assertion: view_size=400 while following, call walk_step, expect 75.

SHOULD-FIX

3. [Problem: "Map uses 75m"] The Map branch is easy to lose and has no test.
   - zoom() (main.gd:13364), rotate_camera_by_delta (main.gd:12513) and pan_camera_by_screen_delta (main.gd:12917) all clear in_overview and in_wide_overview, while following_player stays false.
   - So Map plus any scroll, right-drag or drag, followed by a walk, gives 45 instead of 75.
   - No native case calls overview() or wide_overview() before a starter: study_test.gd:258-290 only uses focus_history_stop_camera. The browser block (godot-browser.mjs:883-912) only uses Shift+H.
   Fix: add native cases overview() then walk_to_neighbor(4), expecting following_player and view_size==75, and the same for wide_overview(). State in the spec that a Map view the user has adjusted counts as pan and gets 45.

4. [Problem: "Immediate arrival retains the existing finish/conversation behavior"] The immediate-arrival branch is never run by the new tests.
   - All six native resume cases (study_test.gd:259-273) start from PLAYER_START, away from the goal, so the branches at main.gd:7590, 7630, 7671 and 7717 never execute.
   - The real end states differ from the "resume" state:
     - Ordinary neighbor: following_player=false (frame_conversation), view 45. It was 84 before for a Shift+H inspection.
     - History stop: resume sets 45 and following=true, then finish_history_stop_arrival -> read_history_stop -> focus_history_stop_camera (main.gd:7758-7766) sets following=false and 55. The resume call is overwritten.
     - The ARRIVAL..ARRIVAL+0.5 band in walk_to_or_read_history_stop (main.gd:7803) skips the helper entirely.
   Fix: add one native case per kind. Put the player within ARRIVAL_DISTANCE_M of neighbor 4 and of the mural stand, starting from a detached view. Assert that the finish behavior happened (arrived_* set, panel visible) and that the save is unchanged when nothing is new. Do not assert following_player==true, because it will be false.

5. [Problem: "rejected requests keep inspection camera... retry can still reframe"] The failure test does not exercise the branch whose ordering changed.
   - The test at study_test.gd:285 uses walk_to_point(Vector2(-350,-350)). That fails at the safe-goal check (main.gd:7941-7947), which already returned before any flag change.
   - The find_path-empty branches are the ones that matter here (main.gd:7596, 7636, 7677, 7723, 7967), and none is covered. Grep finds no "No walkable route" assertion anywhere in study_test.gd.
   - Before failing, those branches already overwrite current_path and so cancel any active route (main.gd:7593 and the matching lines). They also mutate selected_neighbor, talk_partner, the open panels and the selected building highlight (e.g. main.gd:7564-7586).
   - "Keeps inspection" is therefore true for target and view_size only. Say so in the spec.
   Fix: add one find_path-empty failure, e.g. player.position inside an enclosed walkable pocket, or a goal in a disconnected walkable fragment (verify that a reproducible pair exists). Assert that target, view_size and following_player are unchanged. If no such pair exists, record that the find_path-empty branch is untested rather than claiming "failure ... covered".

6. [Browser end-of-suite, godot-browser.mjs:883-900] Verify that the starting position cannot trigger a proximity arrival.
   - After the reload (godot-browser.mjs:833) the player is at PLAYER_START (main.gd:2521; I assume the save does not restore position — verify).
   - The 200 ms W press runs the proximity loop (main.gd:12752-12757). If PLAYER_START is within ARRIVAL_DISTANCE_M of Bea or any other neighbor, finish_neighbor_arrival runs, frame_conversation detaches, and neighbor_talk_counts may change (main.gd:8110-8111).
   - In that case "manual resume leaves saved progress unchanged" (godot-browser.mjs:900) could pass or fail for reasons that have nothing to do with resume.
   - verify: distance from PLAYER_START to the nearest neighbor_xz is greater than ARRIVAL_DISTANCE_M + 0.75, after a 200 ms W walk.

7. [Problem: "Delay overview/follow flag changes until a validated path"] walk_step calls resume_walking_view whether or not it moved (main.gd:7525), so a W press blocked by a wall still reframes from an inspection. That is probably the intended meaning of intent, but the spec wording covers routes only. Add "manual input reframes even if blocked" to the spec. No code change needed.

OPTIONAL / NICE-TO-HAVE
- The literals 45.0 and 75.0 in resume_walking_view (main.gd:7458) repeat values hard-coded in frame_player_for_walking (main.gd:6716) and focus_mural_camera, focus_speaker_camera and focus_block_camera (main.gd:8312/8328/8344). A single WALK_VIEW_SIZE_M constant would stop them drifting apart.
- Snapshot cadence is fine, no fix needed. __tenderloinGodotA11ySnapshot is only republished through sync_web_a11y_status, which update_conversation_ui calls every 0.5 s (main.gd:6955-6958), so the ui_frame and following_player waits at godot-browser.mjs:893-907 resolve within about 0.5 s. The story-card path cannot fake the W result: KeyI at godot-browser.mjs:836 calls hide_story_card through _unhandled_input (main.gd:12946-12947), which sets startup_story_pending=false, so W at godot-browser.mjs:890 does not go through continue_story (main.gd:12934).
- Test isolation is fine. The new native block ends with stop_walking, set_header_details(false) and overview(), which resets yaw to 0 and pitch to 1.0 (main.gd:13236-13237). The 0.3/1.1 test values do not leak into later tests.

CUT THESE
1. resume_walking_view() in walk_to_history_stop's immediate-arrival branch (main.gd:7717) can be cut. read_history_stop -> focus_history_stop_camera immediately overwrites following_player, view_size, in_overview and target (main.gd:7758-7766), so it has no observable effect. It is also harmless to keep for symmetry, so cut it only if you want the code to match the real end state.
Nothing else is over-engineered. The following_player snapshot field (main.gd:10771) is needed by the browser waits.
