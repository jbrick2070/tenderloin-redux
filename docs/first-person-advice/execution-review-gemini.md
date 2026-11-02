# Execution spec review (Gemini 4 Argon)

## 1. Anchors

1. **Section 1 (`docs/FIRST_PERSON_EXECUTION.md:33`) — `street_view_checks.gd (13 groups)`:** `godot/tests/street_view_checks.gd:14-248` has **12** numbered groups (`t.require(checks == 12, ...)` at `godot/tests/street_view_checks.gd:248`), not 13.
2. **Phase 2 WO 6 & Phase 4 WO 4 (`docs/FIRST_PERSON_EXECUTION.md:50, 83`) — `update_guide_marker 6279`:** `func update_guide_marker(obj: Dictionary)` starts at `godot/main.gd:6258` (`func guide_marker_anchor` is at `godot/main.gd:6247`). Line `6279` is mid-function; the bob/spin math is at `godot/main.gd:6283-6284`.
3. **Phase 3 WO 1 (`docs/FIRST_PERSON_EXECUTION.md:63`) — `TALK_PROMPT_RADIUS_M :264`:** `const TALK_PROMPT_RADIUS_M := 6.0` is at `godot/main.gd:64` (line `264` is inside `MUSEUM_DOCENT_LINES`).
4. **Phase 3 WO 2 (`docs/FIRST_PERSON_EXECUTION.md:64`) — Missing line anchors for `walk_to_mural`, `walk_to_speaker`, `walk_to_history_stop`, `activate_eatery`:** `walk_to_mural` is at `godot/main.gd:8468`, `walk_to_speaker` at `godot/main.gd:8513`, `walk_to_history_stop` at `godot/main.gd:8558`, and `activate_eatery` at `godot/main.gd:14591`.
5. **Phase 3 WO 3 (`docs/FIRST_PERSON_EXECUTION.md:65`) — Missing line anchor for `walk_to_point`:** `func walk_to_point(goal_xz: Vector2)` is at `godot/main.gd:8808`, called from `handle_scene_tap` at `godot/main.gd:14589`.
6. **Phase 3 WO 4 (`docs/FIRST_PERSON_EXECUTION.md:66`) — False `unproject_position` anchors (`fit_overlay_around_player 7134`, `layout_reward_banner 5873`, `trigger_feel_good_burst 5908`):** None of those three functions call `unproject_position`. `fit_overlay_around_player` (`godot/main.gd:7134-7166`) and `layout_reward_banner` (`godot/main.gd:5873-5907`) operate purely on 2D `Rect2`s (`player_overlay_rect` unprojects at `godot/main.gd:7122, 7131`), and `trigger_feel_good_burst` (`godot/main.gd:5908-5935`) positions a 3D `Node3D`. Actual unguarded `camera.unproject_position` callers in `godot/main.gd` are `film_easel_snapshot` (`:3141`), `update_speech_bubble` (`:4818`), `scene_overlay_snapshot` (`:11806`), `mural_signature_snapshot` (`:11819`), `mural_inspection_rect` corners (`:11827-11828`), `mural_scenes_snapshot` (`:11834`), `get_a11y_status_snapshot` (`:11911, 11955`), and `layout_mural_compose_entry` (`:12321`).
7. **Phase 4 WO 1 (`docs/FIRST_PERSON_EXECUTION.md:80`) — 6 of 9 cited modules do not save or restore camera state:** Only `godot/rhythm_circle.gd:262, 293-305`, `godot/lantern_procession.gd:292-300`, and `godot/voting_story.gd:235-241` save/restore camera fields. The other six anchors are `cutaway_points()` / `inspection_rect()` / nav-layout helpers that never save or restore camera poses: `godot/shared_panel.gd:275-279`, `godot/bea_invitation.gd:120-139`, `godot/helper_bench.gd:271-285` (comment at `:273`: *"never changes depth, cutaways or the camera"*), `godot/quiet_seats.gd:182-189`, `godot/loan_homecoming.gd:137-143`, and `godot/civic_listening.gd:327-344`.
8. **Phase 4 WO 3 (`docs/FIRST_PERSON_EXECUTION.md:82`) — `SPEECH_BUBBLE_HEIGHT_M :263`:** `const SPEECH_BUBBLE_HEIGHT_M := 5.0` is at `godot/main.gd:199`, and is added at the `show_speech_bubble` call sites (`godot/main.gd:4758, 5298, 5729, 8755`) before storing `speech_bubble_anchor_pos` (`godot/main.gd:4744`), not inside `update_speech_bubble` (`godot/main.gd:4798`).
9. **Phase 5 WO 1–2 (`docs/FIRST_PERSON_EXECUTION.md:94-95`) — "Eighteen modules" vs 15 listed:** WO 1 (`:94`) lists 15 scripts; WO 2 (`:95`) says *"Eighteen modules"* without naming the 3 `Node` helpers that call `game.camera.unproject_position`: `godot/bea_invitation.gd:116-117, 130`, `godot/quiet_seats.gd:163, 168, 180`, and `godot/loan_homecoming.gd:157` (plus `godot/helper_bench.gd:281-283, 310` and `godot/shared_meal.gd:395, 397`).
10. **Phase 6 (`docs/FIRST_PERSON_EXECUTION.md:113`) — `street_tree_pivots (~943)`:** `street_tree_pivots` (`godot/main.gd:944`) is `Array[Node3D]`; the 2D `Array[Vector2]` prop tables are `street_tree_points` (`godot/main.gd:940`), `street_lamp_points` (`godot/main.gd:937`), and `eatery_counter_points` (`godot/main.gd:953`).

## 2. Feasibility

- **Under-specified (cannot start from text alone):**
  - **Phase 2 WO 1 (Drag-to-look):** In `godot/main.gd:15137-15165`, left-drag sets `pointer_dragging = true` after `8.0 px` and calls `pan_camera_by_screen_delta(event.position - pointer_last_pos)` (`:15164`), which currently returns early at `:14600`. The spec does not state whether `pan_camera_by_screen_delta` should forward `delta_px` to `street_view.drag_look(delta_px)` or whether `_unhandled_input` (`:15164`) should branch before `pan_camera_by_screen_delta`.
  - **Phase 2 WO 4 (Pointer-lock release):** Releasing mouse capture only on `Esc`, window blur, and view exit traps the cursor whenever a player presses `G` (`:15041`), `E` (`:15000`), `T` (`:15013`), `R` (`:15030`), `M` (`:14995`), or `F2`–`F8` (`:14941-14954`) to open a panel or activity with buttons. Capture must also release whenever `any_side_panel_visible()`, `is_focused_activity_visible()`, or `is_story_card_visible()` becomes true.
  - **Phase 4 WO 3 (`2.05 m` speech bubble):** Because `speech_bubble_anchor_pos` already has `SPEECH_BUBBLE_HEIGHT_M` (`5.0 m`) baked in at `show_speech_bubble` call sites (`godot/main.gd:4758, 5298, 5729, 8755`), `update_speech_bubble` (`godot/main.gd:4798`) cannot anchor at `2.05 m` unless `show_speech_bubble` stores raw ground `world_pos` or `update_speech_bubble` subtracts `SPEECH_BUBBLE_HEIGHT_M - 2.05` when `street_view_active()`.
- **Over-specified (code will not support as written):**
  - **Phase 3 WO 3 (`segment_walkable` gate on `walk_to_point`):** `walk_to_point` (`godot/main.gd:8808-8837`) uses `nearest_walkable_point` + `find_path` (A*) specifically so tapping around a corner, mural easel, or speaker routes around obstacles. Requiring `segment_walkable(player_xz(), ground_xz)` (`godot/main.gd:8105`) breaks tap-to-walk whenever the straight 2D chord grazes a curb, mural footprint (`:8090`), or speaker footprint (`:8092`). Only the `25.0 m` distance cap should gate eye-level ground taps.
  - **Phase 4 WO 1 (6 non-camera modules):** Force-fitting `capture_camera_state` into `shared_panel.gd`, `bea_invitation.gd`, `helper_bench.gd`, `quiet_seats.gd`, `loan_homecoming.gd`, and `civic_listening.gd` conflicts with their existing `following_player` / `target` cutaway guards (`godot/shared_panel.gd:277`, `godot/bea_invitation.gd:136`). Instead, `street_view.sync()` (`godot/street_view.gd:109-121`) already keeps `game.target` at `eye_pos + forward * 6.0` and `game.following_player = true` while `street_view_active()`, so those `cutaway_points()` helpers only need `and not game.street_view_active()` where they early-return on `game.following_player`.

## 3. Order

Section 8's phase order (2 → 3 → 4 → 5 → 6 → 7) is mostly right, except **Phase 4 WO 1's `capture_camera_state` / `restore_camera_state` adapter should land before Phase 3 WO 2**, and **Phase 3 WO 4's behind-camera guards belong before Phase 3 WO 1–2**.

- **Section 10 Q1 (Adapter before or after Phase 3?):** **Before Phase 3.** Phase 3 WO 2 (`docs/FIRST_PERSON_EXECUTION.md:64`) modifies `inspect_neighborhood_surprise` (`godot/main.gd:5690`), `inspect_boeddeker_park` (`:4584`), and `inspect_tenderloin_museum_hub` (`:8718`), and triggers conversations (`show_conversation` → `frame_conversation` at `:6390`, `focus_mural_camera` at `:9185`, `focus_speaker_camera` at `:9199`). Having `capture_camera_state()` / `restore_camera_state()` in `godot/main.gd` first prevents Phase 3 and Phase 4 from touching the same landmark/panel transitions twice.
- **Section 10 Q2 (Eye-level conversations behind a toggle?):** **No toggle.** In `godot/main.gd:6390-6409` (`frame_conversation`), `:9185-9211` (`focus_mural_camera`, `focus_speaker_camera`), and `:6509-6510` (`end_conversation`), keeping the camera at eye level when `street_view_active()` is a single branch (`if street_view_active(): street_view.face_toward(focus_xz); return`). A second sub-toggle would double the state matrix across `refit_panel_camera` (`:9261`) and `end_conversation` (`:6509`).
- **Section 10 Q3–Q5:** Q3: `street_view.gd` stays under ~550 lines through Phase 5 (`StreetStick` can live inside `street_view.gd` or `street_stick.gd`). Q4: Keep full collision (`6a`) off in street view until `6a` passes a full-walk sweep (`godot/main.gd:8088`). Q5: Keep `6c` (sky/horizon) in Phase 6 (`godot/main.gd:1012-1040`).

## 4. Map-view risk

- **Phase 2:** **Portrait FOV changing `camera.keep_aspect` (`docs/FIRST_PERSON_EXECUTION.md:51`, `godot/street_view.gd:75-106, 164`).** `StreetView.enter()` (`:75-78`) saves `saved_projection`, `saved_fov`, `saved_size`, `saved_near`, `saved_far`, but **not** `keep_aspect`! If Phase 2 WO 7 sets `camera.keep_aspect = Camera3D.KEEP_WIDTH` in portrait and `exit()` (`:92-106`) does not restore `Camera3D.KEEP_HEIGHT`, leaving street view on a portrait viewport permanently alters orthographic map-view bounds. **Test:** On a `390×844` viewport, enter and exit street view and assert `camera.keep_aspect == Camera3D.KEEP_HEIGHT` and `projected_bounds()` (`godot/main.gd:15390`) matches pre-entry.
- **Phase 3:** **`handle_scene_tap` (`godot/main.gd:14491`) and `TALK_PROMPT_RADIUS_M` (`godot/main.gd:64`).** Changing the constant or unguarded tap tolerances alters map-view building selection (`:14567`) or `talk_to_nearby_neighbor` (`:6360`). **Test:** With `street_view_active() == false`, assert `talk_prompt_radius_m() == 6.0` and tapping a building >25 m from the player still selects it (`selected >= 0`).
- **Phase 4:** **`update_speech_bubble` (`godot/main.gd:4798`) and `frame_conversation` (`godot/main.gd:6390`).** Altering `SPEECH_BUBBLE_HEIGHT_M` (`:199`) or `frame_conversation` without gating on `street_view_active()` shifts map-view speech bubbles and `panel_subject_points` (`:11752`). **Test:** With street view off, talk to Bea and assert `speech_bubble_anchor_pos.y == 5.0` and `panel_frame_pose` matches baseline.
- **Phase 5:** **`saved_visibility` restore in full-screen activities (`godot/rhythm_circle.gd:266-270`, `godot/shared_panel.gd:128-134`, etc.).** Each activity hides all sibling `Control`s on open and restores `saved_visibility` on close; if `StreetStick` visibility is restored blindly when `street_view_active() == false`, the stick appears in map view. **Test:** Open and close `shared_panel` with street view off; assert `StreetStick.visible == false`.
- **Phase 6:** **Adding prop clearances to `is_walkable_point` (`godot/main.gd:8088`) and distance stride throttling in `update_people_animation` (`godot/main.gd:3574`).** Adding trees/lamps/counters to `is_walkable_point` changes A* (`find_path` at `:8146`) in map view and can invalidate existing test routes (`godot/tests/study_test.gd:75-100`). **Test:** Run the `study_test.gd` spatial-index and route suite with street view off; assert identical path waypoints to all 5 neighbors, mural, and speaker.

## 5. Tests

- **Cannot run headless as specified in `godot/tests/study_test.gd`:**
  - **Phase 2 WO 3 (`StreetStick` touch visibility):** In headless runs, `DisplayServer.is_touchscreen_available()` is `false`. Testing `StreetStick` visibility in `study_test.gd` requires a test override flag (e.g. `street_view.force_touch_ui_for_test = true`).
  - **Phase 2 WO 4 (`Input.mouse_mode == MOUSE_MODE_CAPTURED`):** Under `--headless` (Dummy display server), `Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)` is a no-op or unsupported on some platforms; test a state boolean (`street_view.pointer_locked`) alongside `Input.mouse_mode`.
  - **Phase 2 WO 6 (`prefers-reduced-motion`):** `JavaScriptBridge.eval` only runs when `OS.has_feature("web")` (`godot/main.gd:12040`); `study_test.gd` can only test the `reduced_motion` setting toggle, while `prefers-reduced-motion` media-query seeding requires Playwright (`tests/browser-smoke.spec.js`).
- **Missing tests per phase:**
  - **Phase 2:** Assert `camera.keep_aspect` is restored on `street_view.exit()` after portrait resize (`390×844`).
  - **Phase 3:** Assert eye-level tap-to-walk routes around an obstacle within 25 m via `find_path` (`godot/main.gd:8837`).
  - **Phase 4:** Assert `end_conversation()` (`godot/main.gd:6475`) in street view preserves `street_view.active() == true`, `camera.projection == PROJECTION_PERSPECTIVE`, and player yaw.
  - **Phase 5:** Assert `bea_invitation.snapshot()` (`godot/bea_invitation.gd:124`), `quiet_seats.snapshot()` (`godot/quiet_seats.gd:157`), and `loan_homecoming.snapshot()` (`godot/loan_homecoming.gd:145`) do not produce false on-screen coordinates when subjects are behind the perspective camera.

## 6. Sizes

Section 8 estimates off by more than 2×:
- **Phase 4 (`main.gd` est. `+90` lines, `street_view_checks.gd` est. `+90` lines):** Once the 6 non-camera modules in WO 1 are removed (only `main.gd` gets the ~20-line `capture_camera_state`/`restore_camera_state` helpers, plus ~25 lines across `frame_conversation`, `focus_mural_camera`, `focus_speaker_camera`, `update_speech_bubble`, `update_guide_marker`), **our number for `main.gd` is `+40` lines**; across the 3 real camera modules (`rhythm_circle.gd`, `lantern_procession.gd`, `voting_story.gd`) net delta is **`-15` lines**.
- **Phase 5 (`15 activity files` est. `+60` lines):** Because 12 of the 15 listed `Control` modules already use `saved_visibility` on `get_parent().get_children()` (`godot/shared_panel.gd:128`, etc.) and never touch `camera`, they need **0 lines** of code changes; only the `unproject_position` snapshot/inspection helpers (`bea_invitation.gd`, `quiet_seats.gd`, `loan_homecoming.gd`, `helper_bench.gd`, `shared_meal.gd`) need behind-camera guards. **Our number is `+15` lines across 5 files.**

## 7. Top five changes to the spec

### Change 1 — Fix Phase 2 WO 7 (`docs/FIRST_PERSON_EXECUTION.md:51`) to save/restore `camera.keep_aspect`
Replace line 51 with:
```markdown
7. **Portrait FOV.** `StreetView.enter` (`godot/street_view.gd:75`) saves `saved_keep_aspect = cam.keep_aspect`, and `exit` (`godot/street_view.gd:92`) restores `cam.keep_aspect = saved_keep_aspect`. `apply_camera` (`godot/street_view.gd:164`) checks `viewport.size`: when `aspect < 1.0`, set `cam.keep_aspect = Camera3D.KEEP_WIDTH` and `cam.fov = 55.0` (else `KEEP_HEIGHT` and `62.0`); update `screen_constant` (`godot/street_view.gd:255`) to branch on `cam.keep_aspect`.
```

### Change 2 — Fix Phase 3 WO 1, WO 3, and WO 4 (`docs/FIRST_PERSON_EXECUTION.md:63, 65, 66`)
Replace lines 63, 65, and 66 with:
```markdown
1. **Proximity talk radius.** Add `talk_prompt_radius_m() -> float` returning `3.5` when `street_view_active()` else `TALK_PROMPT_RADIUS_M` (`godot/main.gd:64`). Replace direct uses in `nearest_neighbor_within` callers (`6325`, `6361`, `6423`). In `KEY_T` (`15022`), use `4.5` when `street_view_active()` else `8.0`.
3. **Ground-tap walk range.** `handle_scene_tap` (`godot/main.gd:14491`, before `walk_to_point` at `14589`): when `street_view_active()`, require `ground_xz.distance_to(player_xz()) <= 25.0` (keep `walk_to_point`'s A* `find_path` routing; do not require `segment_walkable`).
4. **Overlay behind-camera guard.** `player_overlay_rect` (`godot/main.gd:7114`): return `Rect2()` when `street_view_active()`. Add `camera.is_position_behind(...)` guards to unguarded `camera.unproject_position` callers in `godot/main.gd`: `film_easel_snapshot` (`3141`), `update_speech_bubble` (`4818`), `scene_overlay_snapshot` (`11806`), `mural_signature_snapshot` (`11819`), `mural_inspection_rect` (`11827`), `mural_scenes_snapshot` (`11834`), `get_a11y_status_snapshot` (`11911`, `11955`), and `layout_mural_compose_entry` (`12321`).
```

### Change 3 — Fix Phase 4 WO 1 (`docs/FIRST_PERSON_EXECUTION.md:80`) to target only actual camera-saving modules
Replace line 80 with:
```markdown
1. **Camera-state adapter.** Add `capture_camera_state() -> Dictionary` and `restore_camera_state(state: Dictionary) -> void` on `godot/main.gd` (near `panel_camera_pose` `9221`). Migrate the three modules that save/restore camera state: `rhythm_circle.gd` (`262`, `293–305`), `lantern_procession.gd` (`292–300`), and `voting_story.gd` (`235–241`), plus `dog_story.gd` (`279`) and `power_story.gd` (`371`) if they preserve manual views. In `shared_panel.gd:277`, `bea_invitation.gd:136`, `quiet_seats.gd:184`, and `loan_homecoming.gd:139`, keep `cutaway_points()` active when `street_view_active()` even though `following_player` is true.
```

### Change 4 — Fix Phase 4 WO 3 & WO 4 (`docs/FIRST_PERSON_EXECUTION.md:82-83`) anchors and bubble height math
Replace lines 82–83 with:
```markdown
3. **Speech bubble and talk prompt.** `SPEECH_BUBBLE_HEIGHT_M` (`godot/main.gd:199`) is `5.0` for the map (added at `show_speech_bubble` call sites `4758`, `5298`, `5729`, `8755`). In `update_speech_bubble` (`4798`) and `update_talk_prompt` (`6322`), when `street_view_active()`, offset the world anchor by `Vector3.UP * (2.05 - SPEECH_BUBBLE_HEIGHT_M)` (and `1.95 m` for `talk_prompt_node`), guard with `camera.is_position_behind(world_pos)` → hide and route text to `info`, and clamp screen rect inside `play_area_rect()`.
4. **Guide marker and celebration burst.** `guide_marker_anchor` (`godot/main.gd:6247`) and `update_guide_marker` (`6258`): when `street_view_active()`, lower marker base to `1.8 m` (`scale = Vector3.ONE * 0.45`). `trigger_feel_good_burst` (`5908`): when `street_view_active()`, spawn at `player.position + street_view.forward_xz_3d() * 2.5 + Vector3.UP * 1.5`.
```

### Change 5 — Fix Phase 5 WO 1–2 (`docs/FIRST_PERSON_EXECUTION.md:94-95`) to match actual module architecture
Replace lines 94–95 with:
```markdown
1. **Behind-camera guards in module snapshots/inspections.** Add `not game.camera.is_position_behind(...)` guards to `unproject_position` loops in `bea_invitation.gd` (`116–117`, `130`), `quiet_seats.gd` (`163`, `168`, `180`), `loan_homecoming.gd` (`157`), `helper_bench.gd` (`281–283`, `310`), and `shared_meal.gd` (`395`, `397`).
2. **Street HUD visibility across the 15 `is_focused_activity_visible()` controls.** Ensure `StreetViewButton` and `StreetStick` (when added in Phase 2) are children of the same HUD parent iterated by `saved_visibility` in the 12 full-screen activities, and in `close_*` / `layout_walking_controls_and_hub` (`godot/main.gd:7461`) gate `StreetStick.visible` on `street_view_active()`.
```

REVIEW-COMPLETE 10/5
