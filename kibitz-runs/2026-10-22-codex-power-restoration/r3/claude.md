TOOL CHECK: PASS (read godot/power_story.gd, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/civic_listening.gd, godot/project.godot, godot/export_presets.cfg). No gates run by this reviewer; nothing below is a pass claim.

VERDICT: yes-with-fixes. The startup order, lighting hooks, Stop latch and snapshot contract all line up with the real code. One wiring gap directly contradicts the plan's own claim that "free manual/keyboard interruptions should not surprise open".

MUST-FIX BEFORE BUILD

1. [Source hooks / "Stop cancels pendingentry; free manual/keyboard interruptions should not surprise open"] The pending-arrival latch is only cleared by stop_walking().
   - Evidence: main.gd:13527 is the only place in main.gd that writes power_story.traveling=false.
   - Several other main.gd paths clear current_path but leave traveling=true:
     - walk_step (main.gd:8028, WASD and arrow keys, called from _physics_process main.gd:13858)
     - overview (main.gd:14462)
     - wide_overview (main.gd:14520, plain L key at main.gd:14281)
     - choose_next (main.gd:14389)
     - end_conversation (main.gd:6422)
   - What breaks: power_story.gd:417-419 treats any empty path as arrival. If the player is within 2.0 m of trip_goal when they press W (or L, or the overview control), open_story() fires on the next idle frame. That is exactly the surprise-open the plan says cannot happen.
   - The tests never reach this case:
     - The native held-W case (study_test.gd:5460-5468) runs with the story already visible, where _physics_process returns early (main.gd:13817), so it cannot detect the bug.
     - The browser held-W case (godot-browser.mjs:1191) has the same limitation.
   - Smallest fix: add `if power_story != null: power_story.traveling=false` at the top of walk_step (after the early return at main.gd:8026-8027), and at the current_path.clear() sites in overview and wide_overview. This mirrors main.gd:13527. choose_next and end_conversation are optional but cheap to cover the same way.
   - Add one native case: walk_to_relay() → advance_walk until within 2 m with the path still non-empty → walk_step(Vector2.UP,0.05) → a few process frames → require(not story.visible and not story.traveling).

SHOULD-FIX

1. [Lifecycle / "valid import/apply/reset"] Stale outcome message on every fresh visit.
   - Startup sequence: load_godot_state (main.gd:2021) → reset_mural_state_to_defaults or apply_save_envelope (main.gd:12171-12173 / 12657-12659) → reset_session() → end_session(false). end_session sets message="Usual lighting restored. Your saved chapters... were not changed." (power_story.gd:223).
   - reset_session (power_story.gd:226-231) never clears it.
   - refresh() puts any non-empty message first (power_story.gd:341). So the very first Power open after load or import tells the player lighting was "restored" when no episode ever ran.
   - Fix: add `message=""` at the end of reset_session.

2. [Sequencing / walk_to_relay] Steps are ordered so a failed walk strands the player.
   - power_story.gd:243-245 calls close_story(false) and game.show_block_panel(false) before game.walk_to_point().
   - If walk_to_point returns false (main.gd:8503-8509 or 8529-8534), the story stays closed, the hub stays hidden and traveling=false. The player is left in the world with only "No walkable route", and the focus target is gone.
   - The order itself is required: _physics_process does not advance while the story is visible (main.gd:13817).
   - Fix (keep the order): `if not traveling: open_story()` right after line 245.

3. [Panel fit / hidden focus] Connector pads have no fallback.
   - power_story.gd:389 hides all four pads when 88*scale<44, i.e. when the art area is under about 180x120 px.
   - Nothing else can rotate a connector, so the relay becomes unsolvable, with no message.
   - open_story then calls pads[0].grab_focus() (power_story.gd:189) on a hidden control, so focus is silently lost.
   - The native size matrix (study_test.gd:5374) and the browser matrix (godot-browser.mjs:3110-3119 plus the main matrix) never reach that threshold, so the tests cannot see it. verify: short portrait sizes such as 320x400, and landscape 568x320, where the side tray (power_story.gd:378-381) may also overlap `top`.
   - Fix: clamp the pads to a 44 px minimum (let the art scale from pad size), or route focus to actions[2] and show a "make the window taller" hint when the pads are hidden.

4. [Module performance] relay_goal() is recomputed on every call.
   - relay_goal() calls game.nearest_walkable_point() each time (power_story.gd:170-171). In the worst case that is up to 1+9×24 is_walkable_point probes (main.gd:7836-7858), each doing street, building and wall distance queries.
   - near() calls it again, and refresh() calls near() about 7 times (power_story.gd:339, 345 ×4, 354).
   - snapshot() calls relay_goal() 6 times plus near() (power_story.gd:406-407). snapshot() is embedded in every a11y snapshot even when the story is inactive (main.gd:11569), and is forced every 0.2 s while visible (power_story.gd:425-428).
   - Walkability is purely static: is_walkable_point (main.gd:7804-7817) only reads fixed footprints.
   - Fix: compute the three goals once at the end of setup() (street_lamp_points is filled before make_ui, main.gd:1997 vs 2018) and have relay_goal() return the cached value.

5. [External integration: walk system] A blocked relay route is silent.
   - advance_walk's "Route blocked" handling (main.gd:13483-13520) only covers named destinations. For a generic walk_to_point, a failed replan just clears the path (main.gd:13458-13459).
   - power_story.gd:418 then sets traveling=false with no announcement if the player is more than 2 m away.
   - Fix: in the `elif game.current_path.is_empty()` branch, announce "Route to relay N blocked; Power (F8) reopens the story" when the distance is over 2.0.

6. [Browser helper contract] The save-unchanged check may fail for reasons unrelated to the story.
   - godot-browser.mjs:1201 asserts the save is unchanged after three real walks.
   - update_landmark_tour_completion runs every frame (main.gd:13804) and may persist discoveries while walking. That would trip the assertion even though the story wrote nothing.
   - verify: every fixture passed to verifyPowerStory (godot-browser.mjs:3029, 3116-3119) already has all discoveries along the lamp 0-2 route (main.gd:3948-3950). If not, compare only story-relevant keys or take `original` after the walks.

7. [Nav wiring] Power entry may overflow the hub's bottom row at narrow widths.
   - Power inserts into block_page_nav at count-2 (power_story.gd:105-109), between the civic entry (civic_listening.gd:92-93) and the rhythm entry (setup order main.gd:15341/15353/15357).
   - Compact nav is only applied when civic's entry is visible (civic_listening.gd:239 `entry.visible and needed>room`).
   - verify: at 320 px with the civic entry hidden but Power and Rhythm visible, Prev/Next/Power/Rhythm/Close still fit. The browser tap() bounds check (godot-browser.mjs:1156) only covers Power itself, not its neighbours.

OPTIONAL / NICE-TO-HAVE
- apply_lighting (power_story.gd:291-298) sets rim_light energy but not light_color. The outage rim tint therefore follows the day/evening preference (main.gd:4894: ffd8a6 vs ff9f6e). Set it explicitly for a deterministic outage look.
- update_world (power_story.gd:303,307) builds new StandardMaterial3Ds through game.material/mural_material (main.gd:7583-7596) on every call: up to 13 per begin, check or end. Create one dark and one lit material in setup() and reuse them.
- The arrival frame is order-sensitive. main._process (update_conversation_ui, main.gd:13805) runs before the child power_story._process. A pending chapter card shown in that frame makes open_story refuse (power_story.gd:175) after traveling is already cleared. That is acceptable but worth a native case.
- The a11y flush runs at the end of main._process (main.gd:13814), before power_story._process calls sync (power_story.gd:428). Published state therefore lags one frame. Harmless given settle()'s +3 frames, but note it if exact-frame assertions are added.
- Literal 2.0 m arrival radius (power_story.gd:168, 416, 419) versus ARRIVAL_DISTANCE_M=1.35 (main.gd:18). Make it a named const so the native and browser oracles share one value.
- After End, the heading and tabs still show "3/3" and "Relay n OK" while inactive (power_story.gd:335, 349), because end_session does not reset `restored`. Either reset it or show an "(ended)" label.
- Browser coordinates compare Godot viewport px against CSS `size` (godot-browser.mjs:1176, 1206). This is only valid with stretch disabled (project.godot:14) and DPR 1. verify the contexts do not set deviceScaleFactor.

CUT THESE
- None material. The periodic 0.2 s sync (power_story.gd:425-428) looks redundant but carries reader scroll changes that the browser helper depends on (godot-browser.mjs:1217). The per-frame re-hide (power_story.gd:421-422) is needed because layout_reward_banner can re-show the banner while the story is visible (main.gd:5843, 5883). Neither is safe to cut.
- Trivial: the Music label write in refresh() (power_story.gd:356) is overwritten every visible frame by power_story.gd:423-424. It is safe to drop, but the gain is negligible.

[ASSUMPTION] Controls under `layer` process after main.gd because they are tree children with default process_priority. verify: `layer` is parented under the main node.
