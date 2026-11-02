# Phase 1 street view review (Gemini 4 Argon)

Note: Codex reviewed an earlier snapshot (~7 lines shorter in `godot/main.gd` and `godot/street_view.gd`). Several fixes from Codex's list are already present in the current working tree (`godot/main.gd:4826-4827, 7199-7201, 7219-7220`; `godot/street_view.gd:53, 64, 180-188`; `godot/tests/street_view_checks.gd:41, 67-77`). All verdicts below evaluate the current files on disk.

## Part 1: Arbitrate the nine Codex findings

1. **Speech does not reliably suspend (P2) — `CONFIRMED`**
   - **Evidence:** `godot/main.gd:4695-4719, 4798-4855, 5292-5325, 6415-6473, 7694, 9023, 9039, 9295-9359`; `godot/street_view.gd:53`.
   - **Sequence:** While `street_view_active()` is `true` (`following_player == true`, no side panel open):
     - Pressing `What's Next?` within `TALK_PROMPT_RADIUS_M` (`6.0` m, `godot/main.gd:264, 6423`) runs `ask_whats_next()` -> `show_neighbor_speech(speaker, line)` (`godot/main.gd:6456`) without calling `frame_conversation()`.
     - Tapping an eatery counter (`godot/main.gd:14518-14528`) runs `eatery_counter_interact()` -> `show_eatery_host_speech(idx, line)` (`godot/main.gd:5297, 5314`) while `following_player` stays `true`.
     - `choose_gathering_layout()` calls `show_neighbor_speech(...)` at `godot/main.gd:7694`.
     - By contrast, `talk_with_celeste()` (`godot/main.gd:9295-9318`) and `check_sound_with_rook()` (`godot/main.gd:9335-9359`) call `focus_mural_camera()` (`godot/main.gd:9222`, `following_player = false`) / `focus_speaker_camera()` (`godot/main.gd:9261`) and open `mural_panel` / `music_panel` (`any_side_panel_visible() == true`, `godot/street_view.gd:53`), which suspends street view. Desktop `finish_mural_arrival()` / `finish_speaker_arrival()` (`godot/main.gd:9023, 9039`) also exit street view via `any_side_panel_visible()`, not perspective retention (see Part 2 #1).
   - **Behaviour in `update_speech_bubble()` (`godot/main.gd:4798-4855`):** `godot/main.gd:4826-4827` now zeroes `fitted` when `camera.is_position_behind(speech_bubble_node.global_position)` or `not street_view.line_of_sight_clear(street_view.eye_xz(), anchor_xz)`. That hides `speech_bubble_node` (`godot/main.gd:4829`), **but** because `full_rect.has_area()` is `true` (`godot/main.gd:4812, 4830`), `update_speech_bubble()` returns at `godot/main.gd:4831` without calling `hide_speech_bubble()`. `speech_bubble_timer` (`godot/main.gd:4803-4808`) expires unseen while `info.visible` remains `false` (`godot/main.gd:15953`; `ask_whats_next()` only expands `Info` in its `else` branch at `godot/main.gd:6468`, and `eatery_counter_interact()` at `godot/main.gd:5322` never expands `Info`). When the speaker is in front and in LOS, `speech_bubble_node` renders in street view (`godot/main.gd:4846`), shifts vertically using orthographic `ppm` (`godot/main.gd:4810, 4850`), and `speech_bubble_screen_rect()` (`godot/main.gd:4697, 4717`) computes a hit rect at `1.0` m depth (~38.5× oversized) that blocks scene taps (`godot/main.gd:14426`).

2. **Guidance still assumes an elevated camera (P2) — `REFUTED`**
   - **Evidence:** `godot/main.gd:263-264, 6335-6359, 7188-7270`; `godot/street_view.gd:6-7`.
   - **Why refuted on `update_guide_arrow`:** `godot/main.gd:7199-7201` checks `if camera.is_position_behind(guide_marker_target): screen = area.get_center() - (screen - area.get_center()).normalized() * 100000.0` **before** `if area.grow(-18.0).has_point(screen):` (`godot/main.gd:7202`). A target behind the eye is pushed `100000.0` px from `area.get_center()`, outside `area.grow(-18.0)`, so `guide_arrow.visible` stays `true` (`godot/main.gd:7269`) unless `screen == area.get_center()` (`Vector2.ZERO.normalized()`, `godot/main.gd:7206`).
   - **Confirmed sub-claim on `update_talk_prompt_3d`:** `godot/main.gd:6350` places `talk_prompt_node` at `y = SPEECH_BUBBLE_HEIGHT_M + bob` (`5.0` m, `godot/main.gd:263`). Above the `1.6` m eye (`godot/street_view.gd:6`) at `FOV_DEG = 70.0` (`godot/street_view.gd:7`) and `pitch = 0`, $\Delta y = 3.4\text{ m}$ exits the top of the frustum at horizontal distance $3.4 / \tan(35^\circ) \approx 4.86\text{ m}$—inside `TALK_PROMPT_RADIUS_M = 6.0` m.

3. **First toggle destroys map intent (P2) — `REFUTED`**
   - **Evidence:** `godot/street_view.gd:180-186`; `godot/main.gd:7482-7505`; `godot/tests/street_view_checks.gd:67-77`.
   - **Why:** In `street_view.toggle()` (`godot/street_view.gd:180-186`), when `game.following_player and not game.in_overview and not game.in_wide_overview and game.selected < 0 and not game.is_focused_activity_visible()`, it calls `game.update_camera()`, `game.update_occlusion(true)`, and `game.update_guide_marker()` directly—preserving `camera_yaw`, `camera_pitch_scale`, and `view_size` (`godot/tests/street_view_checks.gd:67-77`). `frame_player_for_walking()` (`godot/main.gd:7493-7495`) is only called from the `else` branch (`godot/street_view.gd:186`) when the camera was detached from following the player.

4. **Gesture ownership crosses modes (P2) — `REFUTED`**
   - **Evidence:** `godot/street_view.gd:59-64`; `godot/main.gd:14604-14673`.
   - **Why:** `street_view.sync()` (`godot/street_view.gd:64`) calls `game.cancel_map_pinch()` (`godot/main.gd:14604-14613`) on every transition of `is_active`, clearing `map_touch_contacts` and resetting `map_pinch_active`, `map_pinch_blocked`, `map_pinch_refused`, `map_pinch_pending`, `pointer_active`, `pointer_dragging`, and `orbit_dragging`. Holding two fingers in street view, pressing `Shift+F`, and dragging cannot zoom from a stale baseline because `map_touch_contacts.has(event.index)` (`godot/main.gd:14654`) is `false`.

5. **Street signs remain tiny and visible through walls (P2) — `CONFIRMED`**
   - **Evidence:** `godot/main.gd:2220-2263, 2300-2317, 2350-2358, 3799, 3856, 4165, 4789, 6279, 14244-14326`.
   - **Sequence:** `make_label_3d()` sets `lbl.no_depth_test = true` (`godot/main.gd:2306`) on all 3D labels, but only appends labels matching its allowlist to `readable_scene_labels` (`godot/main.gd:2307-2310`). Excluded labels—14 `"StreetBanner_*"` (`godot/main.gd:2232`), 2 `"CornerSignLabel"` (`godot/main.gd:2257`), 3 `"StreetSignLabel"` (`godot/main.gd:2353`), `"TL145DogParkLabel"` (`godot/main.gd:3799`), `"CompassPlaygroundLabel"` (`godot/main.gd:3856`), `"EighthFloorLabel"` (`godot/main.gd:4165`), `"PlayerNameplate"` (`godot/main.gd:6279`), and `"CelebrationBurstLabel"` (`godot/main.gd:4789`)—are never touched by `update_readable_scene_labels()` (`godot/main.gd:14244`), remaining visible through every building wall across the city at fixed world `pixel_size`.

6. **Web pace protection lacks coverage (P2) — `CONFIRMED`**
   - **Evidence:** `godot/main.gd:14418`; `godot/tests/street_view_checks.gd:183`; `tests/street-view-browser.mjs:1-58`.
   - **Why:** `_physics_process()` (`godot/main.gd:14418`) gates the web `2.2`× multiplier via `advance_walk(delta * (2.2 if OS.has_feature("web") and not street_view_active() else 1.0))`. `street_view_checks.gd:183` calls `game.advance_walk(1.0)` directly in native Godot (`OS.has_feature("web") == false`), bypassing `_physics_process()`, and `tests/street-view-browser.mjs:1-58` never walks a route.

7. **Browser evidence can cover stale street code (P2) — `CONFIRMED`**
   - **Evidence:** `tests/godot-browser.mjs:48-115`.
   - **Why:** `sourceStats` (`tests/godot-browser.mjs:48-105`) and `sourceFingerprint` (`tests/godot-browser.mjs:110`) omit `godot/street_view.gd`, `godot/tests/street_view_checks.gd`, and `tests/street-view-browser.mjs`. Edits to those files after `build/web/index.pck` is built neither trigger the stale-build error (`tests/godot-browser.mjs:107`) nor change the receipt `sourceFingerprint`.

8. **Entry instructions are overwritten (P3) — `REFUTED`**
   - **Evidence:** `godot/street_view.gd:89, 180-188`; `godot/main.gd:6515, 7505`; `godot/tests/street_view_checks.gd:41`.
   - **Why:** `street_view.toggle()` (`godot/street_view.gd:188`) finishes by setting `last_a11y_announcement` to `"Street view. Facing %s. %s. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view."`, which includes both heading and turn instructions (verified at `godot/tests/street_view_checks.gd:41`). However, `toggle()` still fires 2–3 announcements in one frame (`enter()` at `godot/street_view.gd:89`, optional `frame_player_for_walking()` at `godot/main.gd:7505`, then `toggle()` at `godot/street_view.gd:188`), and when street view **automatically resumes** in `frame_player_for_walking()` (`godot/main.gd:7497-7505`) or `end_conversation()` (`godot/main.gd:6503-6515`), `enter()`'s announcement at `godot/street_view.gd:89` is immediately overwritten by the caller's map/conversation announcement.

9. **Native fixture leaks state (P3) — `CONFIRMED`**
   - **Evidence:** `godot/tests/street_view_checks.gd:9, 18-23, 214-270`; `godot/main.gd:12576-12695, 14810-14813`; `godot/tests/study_test.gd:73, 139`.
   - **Sequence:** `street_view_checks.gd:9, 218-238` calls `Viewport.push_input()`, which runs `game._input()` (`godot/main.gd:14796`) and sets `game.reward_audio_unlocked = true` (`godot/main.gd:14810-14813`). Teardown (`street_view_checks.gd:247-270`) never restores `reward_audio_unlocked`, nor does `reset_mural_state_to_defaults()` (`godot/main.gd:12576-12695`), causing `study_test.gd:139` (`_check(not game.reward_audio_unlocked and game.reward_sound_count == 0, ...)`) to fail deterministically after `StreetViewChecks.new().run(self, game)` at `study_test.gd:73`. Teardown also leaks `street_view.has_heading`/`yaw`/`pitch`, `info.text`, `last_a11y_announcement`, `a11y_announcement_seq`, `walk_control.text` (`"Stop Walking (Esc)"` from `walk_to_point` at `street_view_checks.gd:181, 194`), `last_panel_dialogue`, and GUI focus (`street_view_checks.gd:214`).

## Part 2: What Codex missed

1. **Side-panel suspension leaves the orthographic camera stranded at the 1.6 m eye pose (`godot/main.gd:9023, 9039, 15462-15552`; `godot/street_view.gd:53, 59-65, 91-106`)**
   - Pressing `G` (`show_block_panel(true)`, `godot/main.gd:15533`) or `K`/`V`/`U` (`show_music_panel(true)`, `godot/main.gd:15491`), or arriving at the mural/speaker on desktop (`finish_mural_arrival()` / `finish_speaker_arrival()`, `godot/main.gd:9023, 9039`), opens a side panel and queues `refresh_hub_camera.call_deferred()` (`godot/main.gd:15479, 15502, 15541`). When `refresh_hub_camera()` runs at the end of that frame (`godot/main.gd:15508-15515`), `street_view.is_active` is still `true`, so `refresh_hub_camera()` returns early at `godot/main.gd:15510`. Next frame, `street_view.tick()` (`godot/main.gd:14335`) sees `any_side_panel_visible() == true` (`godot/street_view.gd:53`) and calls `exit()` (`godot/street_view.gd:91-106`), which sets `camera.projection = Camera3D.PROJECTION_ORTHOGONAL` and `camera.size = game.view_size` without restoring `camera.position`, `camera.look_at(target)`, or `update_occlusion(true)`. Additionally, `clear_occlusion()` (`godot/main.gd:14138-14146`) does not reset `last_occlusion_pos` / `last_occlusion_cam`.

2. **`handle_scene_tap` aborts before 3D tap targets on horizon/distant rays and projects behind-camera targets (`godot/main.gd:14446, 14461-14575`)**
   - At `godot/main.gd:14500-14501`, `if street_view_active() and (not hit_ok or ground_hit.distance_to(player_xz()) > street_view.MAX_TAP_GROUND_M): return` runs **before** Rook's speaker (`14504`), Museum (`14514`), Eateries (`14518`), History stops (`14533`), Boeddeker Park (`14547`), So What (`14554`), and all 5 Neighbours (`14563`). Tapping the upper body/head of a nearby neighbour or an elevated plaque/counter sends a ray above the horizon (`dir.y >= -0.02`, `not hit_ok` at `godot/main.gd:14446`) or past `60.0` m on `y = 0`, aborting at line `14501`. Conversely, when `ground_hit` is within `60.0` m, every `camera.unproject_position(...)` in `handle_scene_tap` (`godot/main.gd:14461, 14489, 14505, 14515, 14524, 14536, 14548, 14555, 14568`, except `surprise_tour` at `14474`) omits `not camera.is_position_behind(...)` and `street_view.line_of_sight_clear(...)`, allowing mirrored behind-camera or through-wall taps.

3. **`line_of_sight_clear` self-occludes facade labels and ignores courtyard holes (`godot/street_view.gd:133-155`; `godot/main.gd:4106, 4244-4246, 4284, 5407, 14262`)**
   - `update_readable_scene_labels()` (`godot/main.gd:14262`) tests `street_view.line_of_sight_clear(street_view.eye_xz(), lbl_xz)`. Because `MuseumHubLabel` (`godot/main.gd:4244`), `TimePortalLabel` (`4246`), `AwningLabel361Turk` (`4106`), `EateryLabel_*` (`4284`), and `hidden_mural_145` (`5407`) lie on or inside building footprints, the 2D segment crosses the building's own outer ring (`poly.rings[0]`, `godot/street_view.gd:147-153`), hiding the label while looking directly at the storefront. `line_of_sight_clear()` also ignores courtyard holes (`rings[1..]`) and `lidar_additions`.

4. **Unprojection without `is_position_behind` in web a11y, activity snapshots, and `player_overlay_rect` (`godot/main.gd:3137-3145, 7384-7407, 11755-11801, 11954-11964`; `godot/bea_invitation.gd:128-137`; `godot/helper_bench.gd:278-288`; `godot/quiet_seats.gd:153-168`; `godot/rhythm_circle.gd:254-292`)**
   - `build_web_a11y_snapshot()` (`godot/main.gd:11955-11964`) calls `screen_to_ground_xz(vp_center)` (returning `Vector2(INF, INF)` whenever `pitch >= 0`) and unprojects `player.position + Vector3.UP * 1.15` (at `z_cam = 0` when `pitch = 0`, and behind the eye when `pitch < 0`). `player_overlay_rect()` (`godot/main.gd:7384-7407`) likewise unprojects 8 points around `(player.x, y, player.z)` at `z_cam <= 0` when `fit_overlay_around_player()` runs before `street_view.sync()`. `bea_invitation.snapshot()` (`godot/bea_invitation.gd:136`), `helper_bench.snapshot()` (`godot/helper_bench.gd:287`), `quiet_seats.seat_rect()` (`godot/quiet_seats.gd:158`), `film_easel_snapshot()` (`godot/main.gd:3143`), and `scene_overlay_snapshot()` (`godot/main.gd:11755-11801`) also unproject without `is_position_behind`. Finally, `rhythm_circle.open_circle()` (`godot/rhythm_circle.gd:254-272`) opened via `F3` in street view leaves `return_camera` empty, so `close_circle()` (`godot/rhythm_circle.gd:282-292`) skips `update_camera()`.

## Part 3: The improvement list

### Evaluation of Codex's 8 shipping changes (sections F–G)
1. **Codex #1 (Repair findings 1–7, 9 in Phase 1):** Keep in **Phase 1 before merge** for confirmed items (#1, #5, #6, #7, #9); drop #3 and #4 (already fixed).
2. **Codex #2 (`game.cancel_map_pinch()` in `S.sync()`):** **Drop (already in code)** verbatim at `godot/street_view.gd:64`.
3. **Codex #3 (Replace `S.toggle()` announcement):** **Drop (already in code)** at `godot/street_view.gd:188`; only suppress the duplicate `enter()` announcement (`godot/street_view.gd:89`).
4. **Codex #4 (Street signs + `street_view.button` in `M.update_guide_arrow`):** The 2-line `update_guide_arrow` snippet is **already in code** verbatim at `godot/main.gd:7219-7220`. Keep street-sign management in **Phase 1 before merge**.
5. **Codex #5 (Portrait FOV / `KEEP_WIDTH`):** Defer to **Phase 2** with mobile touch-look tuning (`docs/FIRST_PERSON_PLAN.md:139-145`).
6. **Codex #6 (Reduced motion across tree/bubble/marker):** Defer to **later** (separate accessibility PR; not a Phase 1 regression).
7. **Codex #7 (One-finger look, analog magnitude, pointer lock):** **Phase 2** (`docs/FIRST_PERSON_PLAN.md:139-145`); cited function names in `godot/main.gd` match.
8. **Codex #8 (Trial one neighbour at eye level; `in_block` polygon check):** **Phase 2 / Phase 3** (`docs/FIRST_PERSON_PLAN.md:147-166`).

### Top 5 prioritized improvements

1. **Restore orthographic camera pose and occlusion when street view suspends (`godot/street_view.gd:63-65, 91-106`, `godot/main.gd:14138-14146`)** — *Why:* Opening `block_panel` (`G`) or `music_panel` (`K`/`V`/`U`) leaves the orthographic camera at `y = 1.6` m. *Risk:* Low. *Size:* 10 lines.
```gdscript
# In godot/street_view.gd sync(), after exit() when transitioning active -> inactive:
if not is_active and game.camera != null:
	game.update_camera()
	game.update_occlusion(true)
	if game.any_side_panel_visible():
		game.refresh_hub_camera.call_deferred()
# In godot/main.gd clear_occlusion():
last_occlusion_pos = Vector3(INF, INF, INF)
last_occlusion_cam = Vector3(INF, INF, INF)
```

2. **Fix `handle_scene_tap` ground-distance abort and behind-camera unprojections (`godot/main.gd:14449-14576`)** — *Why:* Tapping above the horizon aborts at line `14501` before neighbours/eateries/plaques are checked, and unprojected targets lack `is_position_behind` + LOS checks. *Risk:* Low. *Size:* 14 lines.
```gdscript
func can_tap_world_point(world_pos: Vector3) -> bool:
	if camera == null or camera.is_position_behind(world_pos):
		return false
	return not street_view_active() or street_view.line_of_sight_clear(
		street_view.eye_xz(), Vector2(world_pos.x, world_pos.z))

# Remove lines 14500-14501, guard each 3D tap target with can_tap_world_point(...),
# and place the ground-distance check immediately before walk_to_point(ground_hit) at line 14574:
if not hit_ok or (street_view_active() and ground_hit.distance_to(player_xz()) > street_view.MAX_TAP_GROUND_M):
	return
```

3. **Restore `reward_audio_unlocked` and UI state in `godot/tests/street_view_checks.gd:18-23, 247-270`** — *Why:* `push_input` sets `reward_audio_unlocked = true` (`godot/main.gd:14813`), failing `godot/tests/study_test.gd:139`. *Risk:* None. *Size:* 14 lines.
```gdscript
# Save at start of run():
var saved_audio: bool = game.reward_audio_unlocked
var saved_info: String = game.info.text
var saved_a11y: String = game.last_a11y_announcement
var saved_seq: int = game.a11y_announcement_seq
# Restore at end of run():
game.street_view.has_heading = false
game.update_walk_control()
game.info.text = saved_info
game.last_a11y_announcement = saved_a11y
game.a11y_announcement_seq = saved_seq
game.reward_audio_unlocked = saved_audio
```

4. **Track Phase 1 files in `tests/godot-browser.mjs:48-105` and test `_physics_process` web pace in `godot/tests/street_view_checks.gd:183`** — *Why:* Prevents stale `index.pck` receipts and exercises `godot/main.gd:14418`. *Risk:* None. *Size:* 6 lines.
```gdscript
# In godot/tests/street_view_checks.gd at line 183 (instead of game.advance_walk(1.0)):
game._physics_process(1.0)
```

5. **Route street-view speech to `Info` and depth-test/cull street signs (`godot/main.gd:2306-2310, 4801-4855, 5314, 6456`)** — *Why:* Prevents hidden speech bubbles from burning `speech_bubble_timer` with `info.visible == false` and stops street signs from rendering through walls across the city. *Risk:* Low. *Size:* 11 lines.
```gdscript
# In godot/main.gd show_speech_bubble(), when street_view_active():
if street_view_active():
	set_header_details(true, false)
	if speech_bubble_node != null:
		speech_bubble_node.visible = false
	return
# In godot/main.gd make_label_3d(), include street signs in readable_scene_labels:
if node_name.begins_with("StreetBanner_") or node_name in ["CornerSignLabel", "StreetSignLabel"]:
	readable_scene_labels.append(lbl)
```

REVIEW-COMPLETE 5/4/0 5
