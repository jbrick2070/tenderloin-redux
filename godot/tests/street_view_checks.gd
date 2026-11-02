extends RefCounted
## Street view (docs/FIRST_PERSON_PLAN.md, Phase 1): the one rule, the exact return pose,
## suspension by framing functions, the guarded refit, horizon taps, depth scaling, line of
## sight, the walking pace and the Shift+F key. Phase 2 (docs/FIRST_PERSON_EXECUTION.md section 2,
## work orders 1-3): yaw-relative walking, mouse and touch contact roles, the touch stick and the
## turn step. Runs early in the formal suite and restores the caller's camera, player, route and
## story card.

static func pose(game: Node) -> Array:
	return [game.target, game.view_size, game.camera_yaw, game.camera_pitch_scale, game.following_player]

static func send(suite: SceneTree, event: InputEvent) -> void:
	Input.parse_input_event(event)
	await suite.process_frame

static func mouse_left(pos: Vector2, pressed: bool) -> InputEventMouseButton:
	var e := InputEventMouseButton.new()
	e.button_index = MOUSE_BUTTON_LEFT
	e.pressed = pressed
	e.button_mask = MOUSE_BUTTON_MASK_LEFT if pressed else 0
	e.position = pos
	e.global_position = pos
	return e

static func mouse_move(pos: Vector2, rel: Vector2) -> InputEventMouseMotion:
	var e := InputEventMouseMotion.new()
	e.button_mask = MOUSE_BUTTON_MASK_LEFT
	e.position = pos
	e.global_position = pos
	e.relative = rel
	return e

static func touch(index: int, pos: Vector2, pressed: bool) -> InputEventScreenTouch:
	var e := InputEventScreenTouch.new()
	e.index = index
	e.position = pos
	e.pressed = pressed
	return e

static func touch_drag(index: int, pos: Vector2, rel: Vector2) -> InputEventScreenDrag:
	var e := InputEventScreenDrag.new()
	e.index = index
	e.position = pos
	e.relative = rel
	return e

static func key(code: Key, pressed: bool, shift := false) -> InputEventKey:
	var e := InputEventKey.new()
	e.keycode = code
	e.pressed = pressed
	e.shift_pressed = shift
	return e

## A play-area point with room for a 60 px drag to the right, clear of the HUD, the stick and `avoid`.
static func free_point(game: Node, sv, avoid := Rect2()) -> Vector2:
	var area: Rect2 = game.play_area_rect()
	for fy in [0.55, 0.65, 0.45, 0.75, 0.35]:
		for fx in [0.5, 0.4, 0.6, 0.3, 0.7]:
			var p: Vector2 = area.position + area.size * Vector2(fx, fy)
			var ok := true
			for off in [Vector2.ZERO, Vector2(5, 0), Vector2(30, 0), Vector2(60, 0)]:
				var q: Vector2 = p + off
				ok = ok and area.has_point(q) and not game.is_screen_point_in_ui(q) and not avoid.grow(12.0).has_point(q) and not (sv.stick_visible() and sv.stick.get_global_rect().grow(8.0).has_point(q))
			if ok:
				return p
	return Vector2.INF

## A walkable spot on the block with 1.5 m of open ground all round, so short test walks never meet a wall,
## and well clear of every neighbour, so a walk never arrives at one (an arrival frames a greeting and suspends the eye).
static func open_spot(game: Node, sv) -> Vector2:
	var start: Vector2 = sv.eye_xz()
	for r in [0.0, 2.0, 4.0, 6.0, 9.0, 12.0, 16.0, 20.0, 25.0]:
		for k in range(8):
			var c: Vector2 = start + Vector2(r, 0.0).rotated(float(k) * PI / 4.0)
			if c.x < sv.WEST_LIMIT_X + 3.0 or not game.is_walkable_point(c):
				continue
			var ok := true
			for n_i in range(game.neighbors.size()):
				ok = ok and game.neighbor_xz(n_i).distance_to(c) > game.ARRIVAL_DISTANCE_M + 4.0
			for a in range(16):
				ok = ok and game.is_walkable_point(c + Vector2(1.5, 0.0).rotated(float(a) * PI / 8.0))
			if ok:
				return c
	return Vector2.INF

static func verify(suite: SceneTree, game: Node, formal := false) -> void:
	suite.require(game.is_test_suite_mode(), "street view checks require explicit isolated test paths")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"), "street view FORMAL token belongs only to full native suite")
	var sv = game.street_view
	suite.require(sv != null, "street_view.gd is attached to the measured block")
	if sv == null:
		return
	var cam: Camera3D = game.camera
	var original_player: Vector3 = game.player.position
	var original_path: Array = game.current_path.duplicate()
	var state := {}
	for key in ["following_player", "in_overview", "in_wide_overview", "target", "view_size", "camera_yaw", "camera_pitch_scale", "startup_story_pending", "block_panel_mode", "talk_partner", "selected_neighbor", "arrived_neighbor", "last_proximity_neighbor", "selected", "last_story_chapter", "reward_audio_unlocked", "panel_frame_control", "panel_frame_subject", "panel_frame_pose", "last_panel_dialogue"]:
		state[key] = game.get(key)
	var story_visible: bool = game.is_story_card_visible()
	var saved_info: String = game.info.text
	var saved_announcement: String = game.last_a11y_announcement
	var saved_seq: int = game.a11y_announcement_seq
	var checks := 0

	# 1. After load: orthographic, street view off.
	suite.require(cam.projection == Camera3D.PROJECTION_ORTHOGONAL and not sv.active() and not sv.enabled, "after load the camera is orthographic and street view is off")
	var map_near: float = cam.near
	var map_far: float = cam.far
	checks += 1

	# 2. The toggle gives perspective with the eye 1.6 m above the player and the target on the player.
	sv.toggle()
	await suite.process_frame
	suite.require(sv.active() and cam.projection == Camera3D.PROJECTION_PERSPECTIVE, "the toggle gives a perspective camera")
	suite.require(cam.global_position.distance_to(game.player.position + Vector3.UP * sv.EYE_M) < 1e-3, "the eye sits 1.6 m above the player")
	suite.require(game.target.is_equal_approx(game.player.position + Vector3.UP), "target stays on the player in street view")
	suite.require(is_equal_approx(cam.fov, sv.FOV_DEG) and is_equal_approx(cam.far, sv.FAR_M) and is_zero_approx(cam.rotation.z), "70 degree eye with a 250 m far plane and no roll")
	suite.require(game.last_a11y_announcement.contains("Street view"), "entering street view is announced")
	suite.require(game.occluded_buildings.is_empty() and game.occluded_wider_buildings.is_empty() and game.occluded_additions.is_empty(), "no cutaways at eye level")
	suite.require(not game.player_visual.visible and not game.player_nameplate.visible, "the player's own body and nameplate are hidden at eye level")
	var true_scale := true
	for n in game.neighbor_nodes:
		true_scale = true_scale and n.scale.is_equal_approx(Vector3.ONE)
	suite.require(true_scale, "neighbours stand at true scale in street view")
	suite.require(sv.button.visible and sv.button.text == "Map view" and sv.button.size.x >= 44 and sv.button.size.y >= 44, "the street button offers the map view at 44 px")
	suite.require(game.is_screen_point_in_ui(sv.button.get_global_rect().get_center()), "the street button is part of the UI for taps")
	checks += 1

	# 3. Ten toggles restore the exact elevated pose, materials, scales and visibility.
	sv.toggle()
	await suite.process_frame
	suite.require(not sv.active() and cam.projection == Camera3D.PROJECTION_ORTHOGONAL and cam.near == map_near and cam.far == map_far, "toggling off restores the orthographic camera and its planes")
	suite.require(game.last_a11y_announcement.contains("Map view"), "leaving street view is announced")
	var elevated_pose: Array = pose(game)
	var elevated_cam: Transform3D = cam.global_transform
	var materials: Array = []
	for i in range(game.meshes.size()):
		materials.append(game.meshes[i].material_override)
	for _n in range(10):
		sv.toggle()
		await suite.process_frame
		sv.toggle()
		await suite.process_frame
	suite.require(pose(game) == elevated_pose and cam.global_transform.is_equal_approx(elevated_cam) and cam.projection == Camera3D.PROJECTION_ORTHOGONAL, "ten toggles restore the exact elevated pose")
	# A rotated, zoomed walking map keeps its own pose through a street visit.
	game.camera_yaw = 0.7
	game.camera_pitch_scale = 1.2
	game.view_size = 62.0
	game.update_camera()
	var manual_pose: Array = pose(game)
	sv.toggle()
	await suite.process_frame
	suite.require(sv.active(), "street view enters from a manually rotated walking map")
	sv.toggle()
	await suite.process_frame
	suite.require(pose(game) == manual_pose, "entering from a walking map keeps its yaw, pitch and zoom for the return")
	game.camera_yaw = elevated_pose[2]
	game.camera_pitch_scale = elevated_pose[3]
	game.view_size = elevated_pose[1]
	game.update_camera()
	game.update_occlusion(true) # The cutaways follow the pose; the rotated map's set must not count against the toggles.
	var same_materials := true
	for i in range(game.meshes.size()):
		same_materials = same_materials and game.meshes[i].material_override == materials[i]
	suite.require(same_materials, "ten toggles leave every building material as it was")
	var map_scale := true
	for n in game.neighbor_nodes:
		map_scale = map_scale and n.scale.is_equal_approx(Vector3.ONE * game.CHARACTER_VISUAL_SCALE)
	suite.require(map_scale and game.player_visual.visible, "ten toggles restore the map scale and the player's body")
	suite.require(sv.button.visible and sv.button.text == "Street view", "the button offers street view again from the map")
	checks += 1

	# 4. wide_overview() suspends to orthographic; frame_player_for_walking() resumes perspective.
	sv.toggle()
	await suite.process_frame
	game.wide_overview()
	await suite.process_frame
	suite.require(cam.projection == Camera3D.PROJECTION_ORTHOGONAL and not sv.active() and sv.enabled, "the Tenderloin map suspends street view without forgetting it")
	suite.require(not sv.button.visible, "the street button hides in the overview")
	game.frame_player_for_walking()
	await suite.process_frame
	suite.require(cam.projection == Camera3D.PROJECTION_PERSPECTIVE and sv.active(), "Find Me resumes street view")
	checks += 1

	# 5. frame_conversation(0) suspends; ending the conversation resumes.
	game.frame_conversation(0)
	await suite.process_frame
	suite.require(cam.projection == Camera3D.PROJECTION_ORTHOGONAL and not sv.active(), "framing a conversation suspends to the map view")
	game.end_conversation()
	await suite.process_frame
	suite.require(game.following_player and sv.active() and cam.projection == Camera3D.PROJECTION_PERSPECTIVE, "ending the conversation resumes street view")
	checks += 1

	# 6. A deferred refit while active leaves the eye alone, even with a talk panel framed and its pose current.
	var eye: Vector3 = cam.global_position
	var rot: Vector3 = cam.rotation
	var panel_was_visible: bool = game.block_panel.visible
	game.block_panel.visible = true
	game.block_panel_mode = "talk"
	game.talk_partner = 0
	game.remember_panel_framing(game.block_panel, game.neighbors[0].pos)
	game.refit_panel_camera()
	await suite.process_frame
	suite.require(sv.active() and cam.global_position == eye and cam.rotation == rot, "a panel refit while active leaves the eye alone")
	game.talk_partner = -1
	game.block_panel_mode = "hub"
	game.block_panel.visible = panel_was_visible
	game.panel_frame_control = null
	checks += 1

	# 7. screen_to_ground_xz at or above the horizon reports no hit.
	sv.pitch = 0.0
	game.update_camera()
	var vp: Vector2 = game.bubble_viewport_size()
	suite.require(not is_finite(game.screen_to_ground_xz(Vector2(vp.x * 0.5, 4.0)).x), "a tap above the horizon reports no ground hit")
	suite.require(not is_finite(game.screen_to_ground_xz(Vector2(vp.x * 0.5, vp.y * 0.5)).x), "a tap at the horizon reports no ground hit")
	suite.require(is_finite(game.screen_to_ground_xz(Vector2(vp.x * 0.5, vp.y - 4.0)).x), "a tap below the horizon still hits the ground")
	checks += 1

	# 8. Screen-constant scaling follows depth: a bubble at 20 m needs 20/3 the world size of one at 3 m.
	var f2: Vector2 = sv.forward_xz()
	var fwd := Vector3(f2.x, 0.0, f2.y)
	var near_scale: float = game.screen_constant_scale(1.0, sv.eye_position() + fwd * 3.0)
	var far_scale: float = game.screen_constant_scale(1.0, sv.eye_position() + fwd * 20.0)
	suite.require(near_scale > 0.0 and absf(far_scale / near_scale - 20.0 / 3.0) < 0.05 * 20.0 / 3.0, "screen-constant scale follows depth in street view")
	checks += 1

	# 9. Line of sight: a point behind a building is blocked; visible captions are near and unblocked.
	var eye_xz: Vector2 = sv.eye_xz()
	var blocked_found := false
	for idx in range(game.current_building_rects.size()):
		var c: Vector2 = game.current_building_rects[idx].get_center()
		if game.building_containing_point(c) == "" or c.distance_to(eye_xz) > 60.0:
			continue
		var beyond := c + (c - eye_xz).normalized() * 6.0
		if not sv.line_of_sight_clear(eye_xz, beyond):
			blocked_found = true
			break
	suite.require(blocked_found, "a point behind a nearby building footprint is out of sight")
	suite.require(sv.line_of_sight_clear(eye_xz, eye_xz + f2 * 0.3), "a point just ahead is in sight")
	game.update_readable_scene_labels()
	var captions_ok := true
	var shown := 0
	for label in game.readable_scene_labels:
		if is_instance_valid(label) and label.is_visible_in_tree():
			shown += 1
			var l_xz := Vector2(label.global_position.x, label.global_position.z)
			captions_ok = captions_ok and l_xz.distance_to(eye_xz) <= sv.CAPTION_RANGE_M and sv.line_of_sight_clear(eye_xz, l_xz)
	suite.require(shown > 0 and captions_ok, "every caption shown at eye level is within 28 m with a clear line of sight (%d shown)" % shown)
	checks += 1

	# 10. Route speed is at most 4.8 m/s in street view.
	var start := Vector2(game.player.position.x, game.player.position.z)
	var routed := false
	for d in [Vector2(18.0, 0.0), Vector2(-18.0, 0.0), Vector2(0.0, 18.0), Vector2(0.0, -18.0)]:
		var goal: Vector2 = game.nearest_walkable_point(start + d, game.WALK_CLEARANCE_M)
		if goal.x >= sv.WEST_LIMIT_X and goal.distance_to(start) > 8.0 and game.walk_to_point(goal) and not game.current_path.is_empty():
			routed = true
			break
	suite.require(routed, "a short route starts from the opening block")
	if routed:
		suite.require(sv.active(), "a route on the block keeps street view")
		game.advance_walk(1.0)
		var moved := start.distance_to(Vector2(game.player.position.x, game.player.position.z))
		suite.require(moved <= game.WALK_SPEED_M_PER_S + 0.05 and moved > 0.5, "one second of route moves at most 4.8 m at eye level (%.2f m)" % moved)
		game.stop_walking()
		await suite.process_frame
	checks += 1

	# 11. A route west of x=-50 suspends to the map view; stopping it resumes.
	var west_goal: Vector2 = game.nearest_walkable_point(Vector2(sv.WEST_LIMIT_X - 20.0, start.y), game.WALK_CLEARANCE_M)
	var routed_west: bool = west_goal.x < sv.WEST_LIMIT_X and game.walk_to_point(west_goal) and not game.current_path.is_empty()
	suite.require(routed_west, "a route west of x=-50 exists from the opening block (goal %s)" % str(west_goal))
	if routed_west:
		await suite.process_frame
		suite.require(not sv.active() and cam.projection == Camera3D.PROJECTION_ORTHOGONAL, "a route west of the block suspends street view")
		game.stop_walking()
		game.update_camera()
		await suite.process_frame
		suite.require(sv.active() and cam.projection == Camera3D.PROJECTION_PERSPECTIVE, "stopping the western route resumes street view")
	checks += 1

	# 12. Shift+F toggles; Shift+Right snaps 30 degrees; the map's yaw is untouched.
	var map_yaw: float = game.camera_yaw
	var yaw_before: float = sv.yaw
	game.startup_story_pending = false # Keys reach the block only after the opening card is accepted.
	game.hide_story_card()
	suite.root.gui_release_focus()
	await suite.process_frame
	# A held Shift must be pressed as its own key: the physics loop polls it to tell turning from walking.
	var shift_down := InputEventKey.new()
	shift_down.keycode = KEY_SHIFT
	shift_down.pressed = true
	Input.parse_input_event(shift_down)
	await suite.process_frame
	for key in [KEY_RIGHT, KEY_F]:
		var press := InputEventKey.new()
		press.keycode = key
		press.shift_pressed = true
		press.pressed = true
		Input.parse_input_event(press)
		await suite.process_frame
		var release := InputEventKey.new()
		release.keycode = key
		release.shift_pressed = true
		Input.parse_input_event(release)
		await suite.process_frame
		if key == KEY_RIGHT:
			suite.require(sv.active() and is_equal_approx(wrapf(yaw_before - sv.yaw, -PI, PI), sv.SNAP_TURN_RAD) and game.last_a11y_announcement.begins_with("Facing "), "Shift+Right snaps the eye 30 degrees to the right and says the heading")
	suite.require(not sv.active() and not sv.enabled and cam.projection == Camera3D.PROJECTION_ORTHOGONAL and game.camera_yaw == map_yaw, "Shift+F leaves street view and the map heading is untouched")
	var press_on := InputEventKey.new()
	press_on.keycode = KEY_F
	press_on.shift_pressed = true
	press_on.pressed = true
	Input.parse_input_event(press_on)
	await suite.process_frame
	suite.require(sv.active() and cam.projection == Camera3D.PROJECTION_PERSPECTIVE, "Shift+F enters street view from the walking view")
	var shift_up := InputEventKey.new()
	shift_up.keycode = KEY_SHIFT
	Input.parse_input_event(shift_up)
	var f_up := InputEventKey.new()
	f_up.keycode = KEY_F
	Input.parse_input_event(f_up)
	await suite.process_frame
	checks += 1

	# Phase 2 groups run from the active eye that group 12 leaves, on an open spot of the block.
	var saved_settle: int = game.press_settle_msec
	var saved_touch_screen: bool = sv.touch_screen
	var saved_taps: int = sv.taps_routed
	game.press_settle_msec = 0 # Synthetic presses must not meet the double-activation gate.
	suite.require(sv.active() and not sv.stick_visible(), "Phase 2 starts from the active eye; no stick without a touchscreen")
	var spot: Vector2 = open_spot(game, sv)
	suite.require(is_finite(spot.x), "an open spot on the block for the walking checks")
	if not is_finite(spot.x):
		spot = sv.eye_xz()
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	game.update_camera()
	await suite.process_frame

	# 13. Walking is relative to the heading at 0, 90 and 180 degrees; diagonals are normalized; the stick's magnitude scales the step.
	var step_m: float = game.WALK_SPEED_M_PER_S * 0.1
	var yaw_axes := [[0.0, Vector2(0.0, -1.0)], [90.0, Vector2(-1.0, 0.0)], [180.0, Vector2(0.0, 1.0)]]
	for pair in yaw_axes:
		sv.yaw = deg_to_rad(pair[0])
		game.player.position = Vector3(spot.x, 0.0, spot.y)
		game.walk_step(sv.walk_input(Vector2(0.0, -1.0)), 0.1)
		var fwd_moved: Vector2 = game.player_xz() - spot
		suite.require(fwd_moved.normalized().dot(pair[1]) > 0.999 and absf(fwd_moved.length() - step_m) < 0.01, "forward at %d degrees walks along %s (%s)" % [int(pair[0]), str(pair[1]), str(fwd_moved)])
		game.player.position = Vector3(spot.x, 0.0, spot.y)
		game.walk_step(sv.walk_input(Vector2(1.0, 0.0)), 0.1)
		var side_moved: Vector2 = game.player_xz() - spot
		suite.require(side_moved.normalized().dot(Vector2(-pair[1].y, pair[1].x)) > 0.999, "a right step at %d degrees walks to the eye's right (%s)" % [int(pair[0]), str(side_moved)])
	sv.yaw = 0.0
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	game.walk_step(sv.walk_input(Vector2(1.0, -1.0)), 0.1)
	var diag: Vector2 = game.player_xz() - spot
	suite.require(absf(diag.length() - step_m) < 0.01 and diag.normalized().dot(Vector2(1.0, -1.0).normalized()) > 0.999, "a diagonal walks at the normal speed, not 1.41 times it (%.3f m)" % diag.length())
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	game.walk_step(sv.walk_input(Vector2(0.0, -1.0)), 0.1, 0.5)
	suite.require(absf((game.player_xz() - spot).length() - step_m * 0.5) < 0.01, "walk_step's magnitude scales the step")
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	game.update_camera()
	await suite.process_frame
	checks += 1

	# 14. A synthetic left-drag turns the eye without detaching it or moving the player; a release after it never routes, a release inside 8 px does.
	var look_at: Vector2 = free_point(game, sv)
	suite.require(is_finite(look_at.x), "a free play-area point for the drag checks")
	if is_finite(look_at.x):
		var yaw0: float = sv.yaw
		var pitch0: float = sv.pitch
		await send(suite, mouse_left(look_at, true))
		suite.require(sv.contacts.has(sv.MOUSE_CONTACT) and sv.contacts[sv.MOUSE_CONTACT].role == "look" and not game.pointer_active, "a left press at eye level is a look contact, not a map pan")
		await send(suite, mouse_move(look_at + Vector2(30, 0), Vector2(30, 0)))
		await send(suite, mouse_move(look_at + Vector2(60, 0), Vector2(30, 0)))
		var turned_by: float = wrapf(sv.yaw - yaw0, -PI, PI)
		suite.require(absf(turned_by + 60.0 * sv.LOOK_YAW_PER_PX) < 1e-3 and is_equal_approx(sv.pitch, pitch0), "a 60 px left-drag to the right turns the eye right by 60 x 0.0085 rad (%.4f)" % turned_by)
		suite.require(sv.active() and game.following_player and game.player_xz() == spot and game.current_path.is_empty(), "the drag keeps following the player and leaves the player in place")
		await send(suite, mouse_left(look_at + Vector2(60, 0), false))
		suite.require(sv.taps_routed == saved_taps and sv.contacts.is_empty() and game.current_path.is_empty() and sv.active(), "the release after a drag does not route")
		sv.pitch = -PI / 6.0 # Look down so the tap lands on the street near the player.
		game.update_camera()
		await send(suite, mouse_left(look_at, true))
		await send(suite, mouse_move(look_at + Vector2(5, 0), Vector2(5, 0)))
		suite.require(absf(wrapf(sv.yaw - yaw0 - turned_by, -PI, PI)) < 1e-6, "a 5 px wobble does not turn the eye")
		await send(suite, mouse_left(look_at + Vector2(5, 0), false))
		suite.require(sv.taps_routed == saved_taps + 1, "a release inside 8 px is a tap into handle_scene_tap")
	game.stop_walking()
	if not sv.active():
		game.end_conversation()
		game.frame_player_for_walking()
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	sv.yaw = 0.0
	sv.pitch = 0.0
	game.update_camera()
	await suite.process_frame
	suite.require(sv.active(), "the eye is active again after the tap")
	checks += 1

	# 15. Touch: a look drag turns the eye, its emulated mouse never reaches the map path, a second contact neither pinches nor looks, and focus loss clears roles.
	look_at = free_point(game, sv)
	var second: Vector2 = free_point(game, sv, Rect2(look_at, Vector2(60, 0)).grow(40.0))
	suite.require(is_finite(look_at.x) and is_finite(second.x), "two free play-area points for the touch checks")
	if is_finite(look_at.x) and is_finite(second.x):
		var yaw0: float = sv.yaw
		var taps0: int = sv.taps_routed
		await send(suite, touch(0, look_at, true))
		suite.require(sv.contacts.has(0) and sv.contacts[0].role == "look" and not game.pointer_active, "a touch at eye level is a look contact; its emulated mouse never arms the map pan")
		await send(suite, touch_drag(0, look_at + Vector2(50, 0), Vector2(50, 0)))
		suite.require(absf(wrapf(sv.yaw - yaw0, -PI, PI) + 50.0 * sv.LOOK_YAW_PER_PX) < 1e-3, "a 50 px touch drag turns the eye")
		await send(suite, touch(1, second, true))
		suite.require(sv.contacts.has(1) and sv.contacts[1].role == "ignored", "a second look contact is ignored")
		suite.require(not game.map_pinch_active and not game.map_pinch_blocked and game.map_touch_contacts.is_empty(), "two contacts at eye level never start the map pinch")
		var yaw1: float = sv.yaw
		await send(suite, touch_drag(1, second + Vector2(40, 0), Vector2(40, 0)))
		suite.require(sv.yaw == yaw1 and not game.map_pinch_active, "an ignored contact neither turns nor pinches")
		await send(suite, touch(1, second + Vector2(40, 0), false))
		await send(suite, touch(0, look_at + Vector2(50, 0), false))
		suite.require(sv.taps_routed == taps0 and sv.contacts.is_empty() and game.current_path.is_empty() and sv.active(), "the touch release after a drag does not route")
		await send(suite, touch(0, look_at, true))
		suite.require(sv.contacts.size() == 1, "a new touch takes a role")
		game.notification(Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT)
		suite.require(sv.contacts.is_empty(), "focus loss clears the contact roles")
		game.notification(Node.NOTIFICATION_WM_WINDOW_FOCUS_IN)
		await send(suite, touch(0, look_at, false))
		suite.require(sv.taps_routed == taps0, "a release after focus loss does not route")
		await send(suite, touch(0, look_at, true))
		game.cancel_map_pinch()
		suite.require(sv.contacts.is_empty(), "cancel_map_pinch clears the contact roles")
		await send(suite, touch(0, look_at, false))
		suite.require(sv.taps_routed == taps0, "a release after cancel_map_pinch does not route")
	sv.yaw = 0.0
	game.update_camera()
	checks += 1

	# 16. The stick: only on touchscreens; its contact walks along the heading, a look contact may join in either order, keys win, release stops.
	sv.touch_screen = true
	await suite.process_frame
	suite.require(sv.stick_visible() and sv.stick.size == sv.STICK_SIZE and game.play_area_rect().encloses(sv.stick.get_global_rect()), "the stick shows bottom-left of the play area on a touchscreen")
	suite.require(not game.is_screen_point_in_ui(sv.stick.get_global_rect().get_center()), "the stick is a world contact, not a GUI control")
	if sv.stick_visible():
		var centre: Vector2 = sv.stick.get_global_rect().get_center()
		look_at = free_point(game, sv)
		game.player.position = Vector3(spot.x, 0.0, spot.y)
		await send(suite, touch(0, centre + Vector2(0, -45), true))
		suite.require(sv.contacts.has(0) and sv.contacts[0].role == "move" and absf(sv.stick_vector().length() - 0.75) < 0.01, "a contact in the stick is the movement contact (%s)" % str(sv.stick_vector()))
		for _f in range(6):
			await suite.physics_frame
		var walked: Vector2 = game.player_xz() - spot
		suite.require(walked.length() > 0.1 and walked.normalized().dot(Vector2(0.0, -1.0)) > 0.99 and sv.active() and game.following_player, "holding the stick up walks forward (%s)" % str(walked))
		if is_finite(look_at.x):
			var yaw0: float = sv.yaw
			await send(suite, touch(1, look_at, true))
			await send(suite, touch_drag(1, look_at + Vector2(30, 0), Vector2(30, 0)))
			suite.require(sv.contacts.has(1) and sv.contacts[1].role == "look" and sv.yaw < yaw0, "a look contact joins a held stick and turns the eye")
			await send(suite, touch(2, look_at + Vector2(0, 40), true))
			suite.require(sv.contacts.has(2) and sv.contacts[2].role == "ignored" and not game.map_pinch_active, "a third contact is ignored")
			await send(suite, touch(2, look_at + Vector2(0, 40), false))
			await send(suite, touch(1, look_at + Vector2(30, 0), false))
			sv.yaw = 0.0
			game.update_camera()
		await send(suite, touch_drag(0, centre + Vector2(0, -5), Vector2(0, 40)))
		suite.require(sv.stick_vector() == Vector2.ZERO, "inside the 0.15 deadzone the stick does not walk")
		await send(suite, touch_drag(0, centre + Vector2(0, 200), Vector2(0, 205)))
		suite.require(absf(sv.stick_vector().length() - 1.0) < 1e-4 and sv.stick_vector().y > 0.99, "a pull past the ring clamps to 1.0")
		var before_keys: Vector2 = game.player_xz()
		await send(suite, key(KEY_W, true))
		for _f in range(4):
			await suite.physics_frame
		await send(suite, key(KEY_W, false))
		var key_walk: Vector2 = game.player_xz() - before_keys
		suite.require(key_walk.length() > 0.05 and key_walk.normalized().dot(Vector2(0.0, -1.0)) > 0.99, "W wins over a stick held backwards (%s)" % str(key_walk))
		await send(suite, touch(0, centre + Vector2(0, 200), false))
		suite.require(sv.contacts.is_empty() and sv.stick_vector() == Vector2.ZERO, "releasing the stick ends the movement contact")
		await suite.physics_frame
		var stopped: Vector2 = game.player_xz()
		for _f in range(4):
			await suite.physics_frame
		suite.require(game.player_xz() == stopped, "after the release the player stands still")
		# Look first, then the stick.
		if is_finite(look_at.x):
			await send(suite, touch(0, look_at, true))
			await send(suite, touch(1, centre + Vector2(0, -45), true))
			suite.require(sv.contacts[0].role == "look" and sv.contacts[1].role == "move" and sv.stick_vector().y < -0.7, "the stick also takes a contact that comes after a look")
			await send(suite, touch(1, centre + Vector2(0, -45), false))
			var taps_held: int = sv.taps_routed
			await send(suite, touch_drag(0, look_at + Vector2(20, 0), Vector2(20, 0)))
			await send(suite, touch(0, look_at + Vector2(20, 0), false))
			suite.require(sv.taps_routed == taps_held and game.current_path.is_empty() and sv.contacts.is_empty(), "the look contact's release after its drag does not route")
	sv.touch_screen = false
	await suite.process_frame
	suite.require(not sv.stick_visible(), "the stick hides without a touchscreen")
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	sv.yaw = 0.0
	game.update_camera()
	sv.taps_routed = saved_taps
	checks += 1

	# 17. The turn step: snap30 by default, snap45 on request, smooth at 90 degrees a second on held Shift+arrows.
	suite.require(sv.street_turn == "snap30" and is_equal_approx(sv.turn_step(), PI / 6.0), "street_turn defaults to snap30")
	sv.street_turn = "snap45"
	sv.key_turn(KEY_RIGHT)
	suite.require(is_equal_approx(wrapf(-sv.yaw, -PI, PI), PI / 4.0), "snap45 turns 45 degrees per Shift+Right")
	sv.yaw = 0.0
	sv.street_turn = "smooth"
	sv.key_turn(KEY_RIGHT)
	suite.require(sv.yaw == 0.0, "smooth turning does not snap on the key press")
	sv.hold_turn(1.0, 0.5)
	suite.require(is_equal_approx(wrapf(-sv.yaw, -PI, PI), PI / 4.0), "smooth turning runs at 90 degrees a second")
	sv.yaw = 0.0
	game.update_camera()
	await send(suite, key(KEY_SHIFT, true))
	await send(suite, key(KEY_RIGHT, true, true))
	var held_yaw: float = sv.yaw
	var held_frames := 6
	for _f in range(held_frames):
		await suite.physics_frame
	await send(suite, key(KEY_RIGHT, false, true))
	await send(suite, key(KEY_SHIFT, false))
	var held_turn: float = wrapf(held_yaw - sv.yaw, -PI, PI)
	var tick_turn: float = sv.SMOOTH_TURN_RAD_PER_S / float(Engine.physics_ticks_per_second)
	suite.require(held_turn > tick_turn * 0.5 and held_turn <= tick_turn * float(held_frames + 4) + 1e-4 and game.player_xz() == spot and game.camera_yaw == map_yaw, "held Shift+Right turns smoothly at eye level without walking or touching the map's yaw (%.4f rad, moved %s, path %d, map yaw %.3f vs %.3f)" % [held_turn, str(game.player_xz() - spot), game.current_path.size(), game.camera_yaw, map_yaw])
	sv.street_turn = "snap30"
	sv.yaw = 0.0
	game.update_camera()
	game.press_settle_msec = saved_settle
	sv.touch_screen = saved_touch_screen
	checks += 1

	# Restore the caller's state.
	sv.enabled = false
	sv.yaw = 0.0
	sv.pitch = 0.0
	sv.has_heading = false
	sv.street_turn = "snap30"
	sv.touch_screen = saved_touch_screen
	sv.taps_routed = saved_taps
	sv.clear_contacts()
	game.press_settle_msec = saved_settle
	game.stop_walking()
	game.update_camera()
	game.player.position = original_player
	game.current_path.assign(original_path)
	for key in state:
		game.set(key, state[key])
	game.update_camera()
	game.update_occlusion(true)
	if story_visible:
		game.show_story_card(game.current_chapter(), true)
	for _frame in range(8):
		await suite.process_frame
	for key in state:
		game.set(key, state[key])
	game.player.position = original_player
	game.current_path.assign(original_path)
	game.update_camera()
	game.update_walk_control()
	game.info.text = saved_info
	game.last_a11y_announcement = saved_announcement
	game.a11y_announcement_seq = saved_seq
	suite.require(not sv.active() and cam.projection == Camera3D.PROJECTION_ORTHOGONAL and cam.near == map_near and cam.far == map_far, "street view checks hand back the orthographic map camera")
	suite.require(game.player.position == original_player and game.current_path == original_path, "street view checks restore caller position and route")
	print("STREET_VIEW_PASS:" + ("FORMAL" if formal else "PRIVATE") + " rule/eye/return-pose/suspend/resume/refit/horizon/depth/sight/pace/west/ShiftF/yaw-walk/mouse-look/touch-roles/stick/turn-step ", checks)
