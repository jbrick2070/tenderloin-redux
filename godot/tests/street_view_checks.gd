extends RefCounted
## Street view (docs/FIRST_PERSON_PLAN.md, Phase 1): the one rule, the exact return pose,
## suspension by framing functions, the guarded refit, horizon taps, depth scaling, line of
## sight, the walking pace and the Shift+F key. Phase 2 (docs/FIRST_PERSON_EXECUTION.md section 2,
## work orders 1-7): yaw-relative walking, mouse and touch contact roles, the touch stick, the
## turn step, the portrait field of view, the settings keys, reduced motion and opt-in mouse look. Runs early in the formal suite and
## restores the caller's camera, player, route, settings file and story card.

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
## Turns the eye to face a ground point (forward is (-sin yaw, -cos yaw)) and updates the camera.
static func face_toward(sv, game: Node, xz: Vector2) -> void:
	var d: Vector2 = xz - sv.eye_xz()
	sv.yaw = atan2(-d.x, -d.y)
	game.update_camera()

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

## The on-screen height of a screen-constant Label3D 3 m ahead of the eye, sized for 32 px.
static func screen_label_px(game: Node, sv) -> float:
	var cam: Camera3D = game.camera
	var label := Label3D.new()
	label.text = "Turk St"
	label.font_size = 32
	game.add_child(label)
	label.global_position = cam.global_position - cam.global_basis.z * 3.0
	label.pixel_size = sv.screen_constant(1.0, label.global_position)
	var half: Vector3 = cam.global_basis.y * (label.pixel_size * float(label.font_size) * 0.5)
	var px: float = cam.unproject_position(label.global_position + half).distance_to(cam.unproject_position(label.global_position - half))
	label.queue_free()
	return px

## Tree canopies (park, planters, the first street tree) and the guide marker's pose.
static func motion_sample(game: Node) -> Array:
	var out: Array = []
	for i in range(mini(4, game.park_tree_canopies.size())):
		out.append(game.park_tree_canopies[i].rotation)
	for i in range(mini(4, game.planter_canopy_nodes.size())):
		out.append(game.planter_canopy_nodes[i].position)
	if game.street_tree_lower_mm != null and game.street_tree_points.size() > 0:
		out.append(game.street_tree_lower_mm.get_instance_transform(0))
	out.append(game.guide_marker.rotation)
	out.append(game.guide_marker.position)
	return out

## The burst's gem rotations and orbit angles, then the ring radius, the lift and the scale of its first gem.
static func burst_sample(game: Node) -> Array:
	var turns: Array = []
	for gem in game.celebration_gem_meshes:
		turns.append([gem.rotation, snappedf(atan2(gem.position.z, gem.position.x), 1e-5)])
	var g: Node3D = game.celebration_gem_meshes[0]
	return [turns, Vector2(g.position.x, g.position.z).length(), g.position.y, g.scale.x]

## What a scene tap can change: the route, the selection, the eye's rule and the follow. A routed tap changes one.
static func tap_state(game: Node, sv) -> Array:
	return [game.current_path.duplicate(), game.selected, game.selected_neighbor, sv.active(), game.following_player]

static func write_text(path: String, raw: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f != null:
		f.store_string(raw)
		f.close()

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
	var requests_at_start: int = sv.capture_requests
	var saved_announcement: String = game.last_a11y_announcement
	var saved_seq: int = game.a11y_announcement_seq
	var saved_visual_rotation: Vector3 = game.player_visual.rotation # walk_step turns the body.
	var checks := 0

	# 1. After load: orthographic, street view off.
	suite.require(cam.projection == Camera3D.PROJECTION_ORTHOGONAL and not sv.active() and not sv.enabled, "after load the camera is orthographic and street view is off")
	var map_near: float = cam.near
	var map_far: float = cam.far
	var map_keep: int = cam.keep_aspect # Read in the map view, so group 18 can tell the eye's value from the map's.
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
	var same_materials := true
	for i in range(game.meshes.size()):
		same_materials = same_materials and game.meshes[i].material_override == materials[i]
	suite.require(same_materials, "ten toggles leave every building material as it was")
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
	game.update_occlusion(true) # Cutaways follow the heading; recompute them for the restored one.
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

	# 6. A panel over the eye suspends it at once (the map camera is back in the same call, so a refit never meets
	# the eye's perspective), quietly, and closing it resumes the eye with its heading; a refit while active still
	# leaves the eye alone.
	var eye: Vector3 = cam.global_position
	var rot: Vector3 = cam.rotation
	var yaw6: float = sv.yaw
	game.refit_panel_camera()
	suite.require(sv.active() and cam.global_position == eye and cam.rotation == rot, "a panel refit while active leaves the eye alone")
	var note6: String = game.last_a11y_announcement
	game.show_block_panel(true)
	var suspended6: bool = not sv.active() and sv.enabled and cam.projection == Camera3D.PROJECTION_ORTHOGONAL
	var quiet6: bool = not game.last_a11y_announcement.begins_with("Map view")
	game.refit_panel_camera()
	await suite.process_frame
	var still6: bool = not sv.active() and not sv.stick_visible()
	game.show_block_panel(false)
	var resumed6: bool = sv.active() and cam.projection == Camera3D.PROJECTION_PERSPECTIVE
	await suite.process_frame
	suite.require(suspended6 and quiet6 and still6 and resumed6 and is_equal_approx(sv.yaw, yaw6) and cam.global_position.distance_to(eye) < 1e-3, "the block hub suspends the eye at once and quietly, and closing it resumes the same view (suspended %s, quiet %s, held %s, resumed %s)" % [str(suspended6), str(quiet6), str(still6), str(resumed6)])
	game.last_a11y_announcement = note6
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
	# Beside Bea the Talk prompt takes her nameplate's place (one label, as in the map view), so it counts as shown.
	var talk_shown: bool = game.talk_prompt_node != null and game.talk_prompt_node.is_visible_in_tree()
	suite.require((shown > 0 or talk_shown) and captions_ok, "every caption shown at eye level is within 28 m with a clear line of sight (%d shown, talk prompt %s)" % [shown, str(talk_shown)])
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
		suite.require(absf(turned_by + 60.0 * 0.0085) < 1e-3 and is_equal_approx(sv.pitch, pitch0), "a 60 px left-drag to the right turns the eye right by 60 x 0.0085 rad (%.4f)" % turned_by)
		suite.require(sv.active() and game.following_player and game.player_xz() == spot and game.current_path.is_empty(), "the drag keeps following the player and leaves the player in place")
		var yaw_mid: float = sv.yaw
		await send(suite, mouse_move(look_at + Vector2(60, 40), Vector2(0, 40)))
		suite.require(sv.yaw == yaw_mid and absf(sv.pitch - (pitch0 - 40.0 * 0.0035)) < 1e-4, "a 40 px drag down tilts the eye down by 40 x 0.0035 rad (%.4f)" % (sv.pitch - pitch0))
		await send(suite, mouse_left(look_at + Vector2(60, 40), false))
		suite.require(sv.taps_routed == saved_taps and sv.contacts.is_empty() and game.current_path.is_empty() and sv.active(), "the release after a drag does not route")
		sv.pitch = -PI / 6.0 # Look down so the tap lands on the street near the player.
		game.update_camera()
		var before_tap: Array = tap_state(game, sv)
		await send(suite, mouse_left(look_at, true))
		await send(suite, mouse_move(look_at + Vector2(5, 0), Vector2(5, 0)))
		suite.require(absf(wrapf(sv.yaw - yaw0 - turned_by, -PI, PI)) < 1e-6, "a 5 px wobble does not turn the eye")
		await send(suite, mouse_left(look_at + Vector2(5, 0), false))
		suite.require(sv.taps_routed == saved_taps + 1 and tap_state(game, sv) != before_tap, "a release inside 8 px is a tap into handle_scene_tap, which acts on it (%s -> %s)" % [str(before_tap), str(tap_state(game, sv))])
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
	# A press on a Control is the GUI's contact: no role is taken, so it neither turns the eye nor taps the street.
	var btn_at: Vector2 = sv.button.get_global_rect().get_center()
	var yaw_gui: float = sv.yaw
	var gui_taps: int = sv.taps_routed
	var gui_used: bool = sv.pointer_input(mouse_left(btn_at, true)) or sv.pointer_input(touch(4, btn_at, true))
	suite.require(not gui_used and sv.contacts.is_empty(), "a press on the street button takes no eye-level contact (the GUI role)")
	sv.pointer_input(touch_drag(4, btn_at + Vector2(-40, 20), Vector2(-40, 20)))
	sv.pointer_input(mouse_move(btn_at + Vector2(-40, 20), Vector2(-40, 20)))
	sv.pointer_input(touch(4, btn_at, false))
	sv.pointer_input(mouse_left(btn_at, false))
	suite.require(sv.yaw == yaw_gui and sv.taps_routed == gui_taps and sv.contacts.is_empty(), "a GUI contact's drag and release neither turn the eye nor tap")
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
		var emulated := mouse_left(look_at, true)
		emulated.device = InputEvent.DEVICE_ID_EMULATION
		var emulated_move := mouse_move(look_at + Vector2(50, 0), Vector2(50, 0))
		emulated_move.device = InputEvent.DEVICE_ID_EMULATION
		var yaw_em: float = sv.yaw
		suite.require(sv.pointer_input(emulated) and sv.pointer_input(emulated_move) and sv.contacts.size() == 1 and not sv.contacts.has(sv.MOUSE_CONTACT) and sv.yaw == yaw_em, "a touch's emulated mouse duplicate is used up without a second contact or a second turn")
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
		sv.pitch = -PI / 6.0 # Look down so the tap lands on the street near the player.
		game.update_camera()
		var touch_before: Array = tap_state(game, sv)
		await send(suite, touch(0, look_at, true))
		await send(suite, touch_drag(0, look_at + Vector2(4, 0), Vector2(4, 0)))
		await send(suite, touch(0, look_at + Vector2(4, 0), false))
		suite.require(sv.taps_routed == taps0 + 1 and tap_state(game, sv) != touch_before, "a touch released inside 8 px is a tap into handle_scene_tap (%s -> %s)" % [str(touch_before), str(tap_state(game, sv))])
		game.stop_walking()
		if not sv.active():
			game.end_conversation()
			game.frame_player_for_walking()
		game.player.position = Vector3(spot.x, 0.0, spot.y)
	sv.yaw = 0.0
	sv.pitch = 0.0
	game.update_camera()
	await suite.process_frame
	suite.require(sv.active(), "the eye is active again after the touch tap")
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
		sv.yaw = PI / 2.0 # Facing west, so the physics loop must turn the stick's forward with the eye.
		game.update_camera()
		await send(suite, touch(0, centre + Vector2(0, -45), true))
		suite.require(sv.contacts.has(0) and sv.contacts[0].role == "move" and absf(sv.stick_vector().length() - 0.75) < 0.01, "a contact in the stick is the movement contact (%s)" % str(sv.stick_vector()))
		await suite.physics_frame
		var held_from: Vector2 = game.player_xz()
		var held_ticks := 6
		for _f in range(held_ticks):
			await suite.physics_frame
		var walked: Vector2 = game.player_xz() - held_from
		var expect_m: float = game.WALK_SPEED_M_PER_S * 0.75 * float(held_ticks) / float(Engine.physics_ticks_per_second)
		suite.require(walked.normalized().dot(Vector2(-1.0, 0.0)) > 0.99 and absf(walked.length() - expect_m) < expect_m * 0.1 and sv.active() and game.following_player, "holding the stick 0.75 up while facing west walks west at 0.75 of the walking speed (%s, expected %.3f m)" % [str(walked), expect_m])
		game.get_viewport().size_changed.emit() # The resize handler runs, as when a phone's URL bar collapses.
		suite.require(sv.contacts.has(0) and sv.contacts[0].role == "move" and absf(sv.stick_vector().length() - 0.75) < 0.01, "a viewport resize keeps the held stick (%s)" % str(sv.contacts))
		sv.yaw = 0.0
		game.update_camera()
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
		var key_walk: Vector2 = game.player_xz() - before_keys # Read before the release, so the stick's backward ticks after it do not count.
		await send(suite, key(KEY_W, false))
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

	# 18. Portrait FOV: the angle is vertical in landscape and horizontal in portrait, a screen-constant label at 3 m
	# keeps its pixel size between 1100x760 and 320x667, the chosen angle applies, and exit restores keep_aspect.
	var original_size: Vector2i = suite.root.size
	var label_px := {}
	for size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		suite.root.size = size
		await suite.process_frame
		await suite.process_frame
		await suite.process_frame # The per-frame tick moves the angle to the other dimension on its own.
		var portrait: bool = size.x < size.y
		suite.require(sv.active() and cam.keep_aspect == (Camera3D.KEEP_WIDTH if portrait else Camera3D.KEEP_HEIGHT) and is_equal_approx(cam.fov, 70.0), "the 70 degree angle is %s at %dx%d" % ["horizontal" if portrait else "vertical", size.x, size.y])
		label_px[size] = screen_label_px(game, sv)
		if portrait:
			sv.touch_screen = true
			await suite.process_frame
			suite.require(sv.stick_visible() and sv.stick.accessibility_name == "Walk stick" and game.play_area_rect().encloses(sv.stick.get_global_rect()), "the named walk stick has room at %dx%d" % [size.x, size.y])
			sv.touch_screen = saved_touch_screen
			await suite.process_frame
	var px_land: float = label_px[Vector2i(1100, 760)]
	var px_port: float = label_px[Vector2i(320, 667)]
	suite.require(px_land > 1.0 and absf(px_port - px_land) <= px_land * 0.1, "a screen-constant Label3D at 3 m keeps its pixel size from 1100x760 to 320x667 (%.1f vs %.1f px)" % [px_land, px_port])
	suite.root.size = original_size
	await suite.process_frame
	await suite.process_frame
	sv.street_fov = 80
	game.update_camera()
	suite.require(is_equal_approx(cam.fov, 80.0), "street_fov sets the eye's angle")
	sv.street_fov = 70
	sv.toggle()
	await suite.process_frame
	suite.require(not sv.active() and cam.keep_aspect == map_keep and cam.projection == Camera3D.PROJECTION_ORTHOGONAL, "leaving street view restores the map camera's keep_aspect")
	cam.keep_aspect = Camera3D.KEEP_WIDTH # A sentinel the landscape eye would never choose.
	sv.toggle()
	await suite.process_frame
	suite.require(sv.active() and cam.keep_aspect == Camera3D.KEEP_HEIGHT, "the landscape eye keeps the height")
	sv.toggle()
	await suite.process_frame
	suite.require(not sv.active() and cam.keep_aspect == Camera3D.KEEP_WIDTH, "exit restores whatever keep_aspect the map camera had")
	cam.keep_aspect = map_keep
	game.update_camera()
	checks += 1

	# 19. Settings: the four optional keys round-trip through the v1 envelope; an untouched envelope keeps its old
	# bytes; an old envelope and invalid values load the defaults; the system preference seeds reduced motion.
	var settings_path: String = game.settings_path
	var had_settings: bool = FileAccess.file_exists(settings_path)
	var saved_settings_raw: String = FileAccess.get_file_as_string(settings_path) if had_settings else ""
	var saved_main := {}
	for key in ["voices_enabled", "reward_sounds_enabled", "settings_save_failed", "voices_generation", "voices_release_count", "last_voices_teardown_usec", "voices_status", "voices_error"]:
		saved_main[key] = game.get(key)
	var saved_voice_records: Array = game.voices_records.duplicate()
	var saved_voices_checked: String = game.voices_checked_at
	var saved_system_motion: bool = sv.reduced_motion_system
	suite.require(sv.street_fov == 70 and sv.street_turn == "snap30" and not sv.street_mouselook and not sv.reduced_motion and not sv.reduced_motion_saved, "the Phase 2 settings start at their defaults")
	game.save_godot_settings()
	var old_bytes := JSON.stringify({"schema": "tenderloin-redux.godot.settings.v1", "version": 1, "neighborhood_voices": game.voices_enabled, "reward_sounds": game.reward_sounds_enabled})
	suite.require(FileAccess.get_file_as_string(settings_path) == old_bytes, "an untouched settings envelope keeps its old bytes")
	sv.street_fov = 84
	sv.street_turn = "smooth"
	sv.street_mouselook = true
	sv.set_reduced_motion(true, false)
	game.save_godot_settings()
	var written: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	suite.require(written is Dictionary and written.get("schema") == "tenderloin-redux.godot.settings.v1" and int(written.get("version", 0)) == 1 and int(written.get("street_fov", 0)) == 84 and written.get("street_turn") == "smooth" and written.get("street_mouselook") == true and written.get("reduced_motion") == true, "the four keys are written into the v1 envelope")
	suite.require(not (written as Dictionary).has("street_enabled") and not (written as Dictionary).has("yaw") and not (written as Dictionary).has("pitch") and not (written as Dictionary).has("capture_state") and not (written as Dictionary).has("capture"), "the eye's mode, heading and capture state are never saved")
	sv.reset_settings()
	suite.require(sv.street_fov == 70 and sv.street_turn == "snap30" and not sv.street_mouselook and not sv.reduced_motion, "reset_settings returns the defaults")
	game.load_godot_settings()
	suite.require(sv.street_fov == 84 and sv.street_turn == "smooth" and sv.street_mouselook and sv.reduced_motion and sv.reduced_motion_saved, "the four keys round-trip through load_godot_settings")
	var envelopes := [
		{"raw": '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false}', "what": "an old envelope without the keys"},
		{"raw": '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"reward_sounds":true,"reduced_motion":1,"street_fov":120,"street_turn":"spin","street_mouselook":"yes"}', "what": "invalid values"},
		{"raw": '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"street_fov":59,"street_turn":30}', "what": "a field of view under 60"},
		{"raw": '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"street_fov":70.5}', "what": "a fractional field of view"},
	]
	for e in envelopes:
		write_text(settings_path, e.raw)
		sv.street_fov = 84
		sv.street_turn = "smooth"
		sv.street_mouselook = true
		sv.reduced_motion = true
		sv.reduced_motion_saved = true
		game.load_godot_settings()
		suite.require(sv.street_fov == 70 and sv.street_turn == "snap30" and not sv.street_mouselook and not sv.reduced_motion and not sv.reduced_motion_saved, "%s loads the defaults" % e.what)
	write_text(settings_path, '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"reduced_motion":"on","street_fov":80,"street_turn":"spin","street_mouselook":true}')
	game.load_godot_settings()
	suite.require(sv.street_fov == 80 and sv.street_turn == "snap30" and sv.street_mouselook and not sv.reduced_motion_saved, "each key is validated on its own: a bad turn and reduced motion keep their defaults beside a good angle and mouse look")
	write_text(settings_path, '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"reduced_motion":true,"street_fov":91,"street_turn":"smooth"}')
	game.load_godot_settings()
	suite.require(sv.street_fov == 70 and sv.street_turn == "smooth" and sv.reduced_motion and sv.reduced_motion_saved and not sv.street_mouselook, "a field of view over 90 falls back alone")
	write_text(settings_path, '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"street_fov":90,"street_turn":"snap45"}')
	game.load_godot_settings()
	suite.require(sv.street_fov == 90 and sv.street_turn == "snap45", "the valid edge of the range loads")
	sv.reduced_motion_system = true
	write_text(settings_path, '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false}')
	game.load_godot_settings()
	suite.require(sv.reduced_motion and not sv.reduced_motion_saved, "with no saved choice the system preference seeds reduced motion")
	write_text(settings_path, '{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false,"reduced_motion":false}')
	game.load_godot_settings()
	suite.require(not sv.reduced_motion and sv.reduced_motion_saved, "a saved choice wins over the system preference")
	sv.use_system_motion(false)
	suite.require(sv.reduced_motion and not sv.reduced_motion_saved and not sv.settings_fields().has("reduced_motion"), "Use system setting clears the saved choice")
	game.clear_godot_settings()
	suite.require(sv.street_fov == 70 and sv.street_turn == "snap30" and sv.reduced_motion == sv.reduced_motion_system and not sv.reduced_motion_saved, "clearing the settings returns the defaults")
	sv.reduced_motion_system = saved_system_motion
	sv.reset_settings()
	if had_settings:
		write_text(settings_path, saved_settings_raw)
	elif FileAccess.file_exists(settings_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(settings_path))
	game.voices_records = saved_voice_records
	game.voices_checked_at = saved_voices_checked
	for key in saved_main:
		game.set(key, saved_main[key])
	game.set_reward_sounds_enabled(game.reward_sounds_enabled, false)
	checks += 1

	# 20. Reduced motion, in the map view where it also applies: the button moved with the opening entry into the menu, a
	# 44 px row on screen there at 1100x760 and 320x667 that leaves the header one row, and it cycles system, on, off and
	# back to system. Then the tree canopies, the bubble's bob, the marker's spin and bob and the burst's gem rotation hold
	# still across 30 frames once the bubble's 0.2 s pop is over, while the burst still widens, lifts and shrinks.
	var entry: Button = game.before_streets.entry
	for size in [Vector2i(320, 667), Vector2i(1100, 760)]:
		suite.root.size = size
		for _f in range(3):
			await suite.process_frame
		var bar_height: float = game.header_panel.size.y
		game.set_menu_open(true)
		for _f in range(3):
			await suite.process_frame
		suite.require(entry.is_visible_in_tree() and sv.motion_btn.is_visible_in_tree() and sv.motion_btn.get_parent() == entry.get_parent() and sv.motion_btn.get_parent() == game.menu_list, "the menu holds the opening entry and Reduced motion at %dx%d" % [size.x, size.y])
		suite.require(sv.motion_btn.size.x >= 44 and sv.motion_btn.size.y >= 44 and Rect2(Vector2.ZERO, Vector2(size)).encloses(sv.motion_btn.get_global_rect()) and is_equal_approx(game.header_panel.size.y, bar_height), "Reduced motion is an on-screen 44 px row that adds no height to the header at %dx%d" % [size.x, size.y])
		game.set_menu_open(false)
		await suite.process_frame
		suite.require(not sv.motion_btn.is_visible_in_tree(), "closing the menu hides the row")
	suite.root.size = original_size
	game.set_menu_open(true)
	await suite.process_frame
	suite.require(sv.motion_btn.accessibility_name == "Reduced motion: System (off)" and sv.motion_btn.text == sv.motion_btn.accessibility_name, "the row names the system setting first (%s)" % sv.motion_btn.accessibility_name)
	sv.motion_btn.pressed.emit()
	suite.require(sv.reduced_motion and sv.reduced_motion_saved and sv.motion_btn.accessibility_name == "Reduced motion: On" and game.last_a11y_announcement == "Reduced motion on.", "a press turns reduced motion on as the player's choice and says so")
	sv.motion_btn.pressed.emit()
	suite.require(not sv.reduced_motion and sv.reduced_motion_saved and sv.motion_btn.accessibility_name == "Reduced motion: Off", "the next press saves off")
	sv.motion_btn.pressed.emit()
	suite.require(not sv.reduced_motion and not sv.reduced_motion_saved and game.last_a11y_announcement.contains("system setting") and sv.motion_btn.accessibility_name == "Reduced motion: System (off)", "the third press returns to the system setting")
	game.set_menu_open(false)
	await suite.process_frame
	suite.require(not sv.active(), "the reduced-motion checks run in the map view")
	var saved_burst := [game.celebration_burst_node.visible, game.celebration_burst_age, game.celebration_burst_timer, game.celebration_burst_node.position]
	var saved_gems: Array = []
	for gem in game.celebration_gem_meshes:
		saved_gems.append(gem.transform)
	var burst_label: Node3D = game.celebration_burst_label
	var saved_burst_label := [burst_label.position, burst_label.visible] if burst_label != null else []
	var samples := {}
	for on in [false, true]:
		sv.set_reduced_motion(on, false)
		game.show_speech_bubble("reduced-motion-fixture", game.target + Vector3.UP * 2.0, "A short line for the reduced motion check.", 30.0)
		game.celebration_burst_node.position = game.target
		game.celebration_burst_node.visible = true
		game.celebration_burst_age = 0.0
		game.celebration_burst_timer = 60.0 # Outlasts 30 frames on a loaded machine.
		var waited := 0
		while game.speech_bubble_age <= 0.2 and waited < 3000 and not game.speech_bubble_deferred:
			await suite.process_frame
			waited += 1
		await suite.process_frame
		var first := motion_sample(game)
		var bubble_first: Vector3 = game.speech_bubble_node.position
		var age_first: float = game.speech_bubble_age
		game.celebration_burst_age = 0.5 # Fixed ages, so the widening never meets the 2 s clamp on a slow machine.
		game.update_celebration_burst(0.0)
		var burst_first: Array = burst_sample(game)
		for _f in range(30):
			await suite.process_frame
		var last := motion_sample(game)
		var bubble_last: Vector3 = game.speech_bubble_node.position
		game.celebration_burst_age = 1.0
		game.update_celebration_burst(0.0)
		var burst_last: Array = burst_sample(game)
		# Trees (every entry but the marker's last two) and the marker are compared apart, so each has its own control.
		samples[on] = [first.slice(0, -2) == last.slice(0, -2), bubble_first == bubble_last, burst_first[0] == burst_last[0], burst_last[1] > burst_first[1] and burst_last[2] > burst_first[2] and burst_last[3] < burst_first[3], first.slice(-2) == last.slice(-2)]
		suite.require(game.guide_marker.visible and not game.speech_bubble_deferred and age_first > 0.2, "the guide marker and a fitted speech bubble are up for the reduced-motion check (marker %s, deferred %s, age %.2f)" % [str(game.guide_marker.visible), str(game.speech_bubble_deferred), age_first])
		game.hide_speech_bubble()
	suite.require(samples[true][0] and samples[true][1] and samples[true][2] and samples[true][4], "reduced motion stills the tree canopies, the marker, the bubble's bob and the burst's gem rotation across 30 frames (%s)" % str(samples[true]))
	suite.require(samples[true][3], "under reduced motion the burst still widens, lifts and shrinks")
	suite.require(not samples[false][0] and not samples[false][1] and not samples[false][2] and not samples[false][4], "with reduced motion off the trees, the bubble, the gems and the marker each still move (%s)" % str(samples[false]))
	sv.use_system_motion(false)
	game.celebration_burst_node.visible = saved_burst[0]
	game.celebration_burst_age = saved_burst[1]
	game.celebration_burst_timer = saved_burst[2]
	game.celebration_burst_node.position = saved_burst[3]
	for g_i in range(saved_gems.size()):
		game.celebration_gem_meshes[g_i].transform = saved_gems[g_i]
	if burst_label != null:
		burst_label.position = saved_burst_label[0]
		burst_label.visible = saved_burst_label[1]
	if had_settings:
		write_text(settings_path, saved_settings_raw)
	elif FileAccess.file_exists(settings_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(settings_path))
	game.settings_save_failed = saved_main["settings_save_failed"]
	checks += 1

	# 21. Mouse look (work order 4), through the `mouse_mode_override` seam, since a headless run has no pointer lock.
	# The toggle is an announced 44 px street control; with it off no press ever asks for the mouse. On, a left press
	# asks: requested -> locked when the mode reports captured, or -> denied after 10 frames (toggle off, announced).
	# Esc is taken by the capture before gameplay; motion steers the eye; frame_conversation, wide_overview, a focused
	# activity and focus loss release it; a late grant is cancelled; nothing asks again on its own.
	var saved_override: int = sv.mouse_mode_override
	var saved_requests: int = sv.capture_requests
	var saved_capture := [sv.capture_state, sv.capture_wait, sv.capture_dropped_frame]
	var saved_rhythm_visible: bool = game.rhythm_circle.visible
	var CAPTURED := Input.MOUSE_MODE_CAPTURED
	var VISIBLE := Input.MOUSE_MODE_VISIBLE
	suite.require(sv.capture_requests == requests_at_start and sv.capture_state == "released", "groups 1 to 20 pressed and dragged with mouse look off and never asked for the mouse (%d requests)" % (sv.capture_requests - requests_at_start))
	sv.mouse_mode_override = VISIBLE
	game.press_settle_msec = 0 # As in groups 13-17: synthetic presses must not meet the double-activation gate.
	if not sv.active():
		sv.toggle()
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	sv.yaw = 0.0
	sv.pitch = 0.0
	game.update_camera()
	await suite.process_frame
	await suite.process_frame
	var ml: Button = sv.mouselook_btn
	var street_rect: Rect2 = sv.button.get_global_rect()
	var ml_rect: Rect2 = ml.get_global_rect()
	suite.require(sv.active() and sv.mouselook_visible() and ml_rect.size.x >= 44 and ml_rect.size.y >= 44 and not ml_rect.intersects(street_rect) and absf(ml_rect.position.x - street_rect.position.x) < 1.0 and ml_rect.position.y > street_rect.position.y, "the Mouse look toggle is a 44 px control under the street button (%s under %s)" % [str(ml_rect), str(street_rect)])
	suite.require(ml.text == "Mouse look: off" and ml.accessibility_name == ml.text and not ml.button_pressed and game.is_screen_point_in_ui(ml_rect.get_center()), "the toggle starts off, names itself and counts as UI")
	var ml_at: Vector2 = free_point(game, sv)
	suite.require(is_finite(ml_at.x), "a free play-area point for the mouse look checks")
	if not is_finite(ml_at.x):
		ml_at = game.play_area_rect().get_center()
	for _i in range(3):
		await send(suite, mouse_left(ml_at, true))
		await send(suite, mouse_move(ml_at + Vector2(30, 0), Vector2(30, 0)))
		await send(suite, mouse_left(ml_at + Vector2(30, 0), false))
	suite.require(sv.capture_requests == saved_requests and sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE and absf(wrapf(sv.yaw, -PI, PI)) > 0.1, "with the toggle off, presses on the street look (yaw %.3f) and never ask for the mouse" % sv.yaw)
	sv.yaw = 0.0
	game.update_camera()
	ml.pressed.emit()
	var ml_written: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	suite.require(sv.street_mouselook and ml.button_pressed and ml.text == "Mouse look: on" and game.last_a11y_announcement.begins_with("Mouse look on.") and sv.capture_requests == saved_requests, "pressing the toggle turns mouse look on and says so, without asking for the mouse itself")
	suite.require(ml_written is Dictionary and ml_written.get("street_mouselook") == true, "the toggle is saved as street_mouselook")
	await send(suite, mouse_left(ml_at, true))
	suite.require(sv.capture_state == "requested" and sv.capture_requests == saved_requests + 1 and sv.contacts.has(sv.MOUSE_CONTACT) and sv.contacts[sv.MOUSE_CONTACT].role == "capture", "with the toggle on, a left press on the street asks for the mouse (%s, %d, %s, allowed %s, story %s)" % [sv.capture_state, sv.capture_requests - saved_requests, str(sv.contacts), str(sv.capture_allowed()), str(game.is_story_card_visible())])
	sv.mouse_mode_override = CAPTURED # The browser's grant.
	await suite.process_frame
	suite.require(sv.capture_state == "locked" and game.last_a11y_announcement == "Esc releases the mouse." and ml.text == "Esc frees mouse" and ml.accessibility_name == "Esc releases the mouse" and ThemeDB.fallback_font.get_string_size(ml.text, HORIZONTAL_ALIGNMENT_LEFT, -1, ml.get_theme_font_size("font_size")).x <= ml.size.x - 12.0, "requested -> locked when the mode reports captured, with the Esc hint shown in full and announced")
	var taps_lock: int = sv.taps_routed
	await send(suite, mouse_left(ml_at, false))
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_left(ml_at, false))
	suite.require(sv.taps_routed == taps_lock and sv.capture_requests == saved_requests + 1 and sv.contacts.is_empty(), "presses while locked neither tap nor ask again")
	var yaw_l: float = sv.yaw
	var pitch_l: float = sv.pitch
	var rel := InputEventMouseMotion.new()
	rel.position = ml_at
	rel.global_position = ml_at
	rel.relative = Vector2(40, 20)
	rel.screen_relative = Vector2(40, 20)
	await send(suite, rel)
	suite.require(absf(wrapf(sv.yaw - yaw_l, -PI, PI) + 40.0 * sv.LOOK_YAW_PER_PX) < 1e-4 and absf(sv.pitch - pitch_l + 20.0 * sv.LOOK_PITCH_PER_PX) < 1e-4 and sv.active() and game.player_xz() == spot, "screen_relative motion steers the eye while locked (yaw %.4f, pitch %.4f)" % [wrapf(sv.yaw - yaw_l, -PI, PI), sv.pitch - pitch_l])
	game.current_path.assign([spot + Vector2(1.4, 0.0)])
	await send(suite, key(KEY_ESCAPE, true))
	suite.require(sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE and game.last_a11y_announcement == "Mouse released." and not game.current_path.is_empty() and sv.active(), "Esc while locked releases the mouse and is taken before gameplay (the walk goes on)")
	await send(suite, key(KEY_ESCAPE, false))
	await send(suite, key(KEY_ESCAPE, true))
	await send(suite, key(KEY_ESCAPE, false))
	suite.require(game.current_path.is_empty(), "the next Esc reaches gameplay again and stops the walk")
	game.stop_walking()
	game.player.position = Vector3(spot.x, 0.0, spot.y)
	sv.yaw = 0.0
	sv.pitch = 0.0
	game.update_camera()
	for _f in range(15):
		await suite.process_frame
	suite.require(sv.capture_requests == saved_requests + 1 and sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE, "after a release nothing asks for the mouse again on its own")
	# The browser's own release (a tab switch, or its Esc) and the Esc that follows it.
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_left(ml_at, false))
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	suite.require(sv.capture_state == "locked", "a new press locks again")
	sv.mouse_mode_override = VISIBLE
	await suite.process_frame
	suite.require(sv.capture_state == "released" and game.last_a11y_announcement == "Mouse released." and ml.text == "Mouse look: on", "locked -> released when the browser drops the lock, announced")
	suite.require(sv.capture_input(key(KEY_ESCAPE, true)) and sv.capture_input(key(KEY_ESCAPE, false)) and not sv.capture_input(key(KEY_ESCAPE, true)), "the browser's Esc that dropped the lock is used once, then Esc belongs to gameplay")
	# requested -> denied after 10 frames: the toggle turns off and says why; a grant after that is cancelled.
	await send(suite, mouse_left(ml_at, true))
	var waited_frames := 1
	while sv.capture_state == "requested" and waited_frames < 30:
		await suite.process_frame
		waited_frames += 1
	await send(suite, mouse_left(ml_at, false))
	var denied_written: Variant = JSON.parse_string(FileAccess.get_file_as_string(settings_path))
	suite.require(sv.capture_state == "denied" and waited_frames >= sv.CAPTURE_WAIT_FRAMES - 1 and waited_frames <= sv.CAPTURE_WAIT_FRAMES + 1, "requested -> denied after 10 frames without a grant (%d frames)" % waited_frames)
	suite.require(not sv.street_mouselook and not ml.button_pressed and ml.text == "Mouse look: off" and game.last_a11y_announcement == "The browser did not allow mouse look." and denied_written is Dictionary and not (denied_written as Dictionary).has("street_mouselook"), "a refusal turns the toggle off, saves that and announces it")
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	suite.require(sv.mouse_mode_override == VISIBLE and sv.capture_state == "denied", "a grant after the refusal is cancelled at once")
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_move(ml_at + Vector2(30, 0), Vector2(30, 0)))
	await send(suite, mouse_left(ml_at + Vector2(30, 0), false))
	suite.require(sv.capture_requests == saved_requests + 3, "after a refusal a press asks nothing until the toggle is on again")
	# Every suspension and focus loss releases a lock.
	sv.street_mouselook = true
	sv.refresh_mouselook_button()
	var releasers := [
		["frame_conversation", func(): game.frame_conversation(0), func(): game.end_conversation(), true],
		["wide_overview", func(): game.wide_overview(), func(): game.frame_player_for_walking(), true],
		["a focused activity opening", func(): game.rhythm_circle.visible = true, func(): game.rhythm_circle.visible = saved_rhythm_visible, false],
		["focus loss", func(): game.notification(Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT), func(): game.notification(Node.NOTIFICATION_WM_WINDOW_FOCUS_IN), true],
	]
	for r in releasers:
		if not sv.active():
			game.frame_player_for_walking()
		await suite.process_frame
		await send(suite, mouse_left(ml_at, true))
		await send(suite, mouse_left(ml_at, false))
		sv.mouse_mode_override = CAPTURED
		await suite.process_frame
		var was_locked: bool = sv.capture_state == "locked"
		r[1].call()
		var at_once: bool = sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE # Framing calls suspend the eye (exit) at once.
		await suite.process_frame # A focused activity suspends it on the next tick.
		suite.require(was_locked and (at_once or not r[3]) and sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE and sv.contacts.is_empty(), "%s releases the mouse (locked first: %s, at once: %s, now %s)" % [r[0], str(was_locked), str(at_once), sv.capture_state])
		r[2].call()
		await suite.process_frame
		if not sv.active():
			game.frame_player_for_walking()
		await suite.process_frame
	suite.require(sv.active(), "the eye is back after the release checks")
	# A hub, conversation, mural or music panel opens over the eye without suspending it: a lock is released when one
	# opens, a grant that lands after it opened is cancelled, and a press while it is open asks for nothing.
	var saved_panel := [game.block_panel.visible, game.block_panel_mode]
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_left(ml_at, false))
	suite.require(sv.capture_state == "requested", "a press asks before the panel checks")
	game.block_panel.visible = true
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	suite.require(not sv.active() and sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE, "a grant that lands after a panel opened over the eye is cancelled at once (%s)" % sv.capture_state)
	game.block_panel.visible = false
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_left(ml_at, false))
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	var panel_locked: bool = sv.capture_state == "locked"
	game.block_panel.visible = true
	await suite.process_frame
	suite.require(panel_locked and not sv.active() and sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE, "a panel opening over the eye releases a held mouse (locked first: %s, now %s)" % [str(panel_locked), sv.capture_state])
	var panel_requests: int = sv.capture_requests
	sv.pointer_input(mouse_left(ml_at, true))
	sv.pointer_input(mouse_move(ml_at + Vector2(30, 0), Vector2(30, 0)))
	sv.pointer_input(mouse_left(ml_at + Vector2(30, 0), false))
	suite.require(sv.capture_requests == panel_requests and sv.capture_state == "released", "a press on the street while a panel is open asks for nothing")
	game.block_panel.visible = saved_panel[0]
	game.block_panel_mode = saved_panel[1]
	sv.yaw = 0.0
	game.update_camera()
	await suite.process_frame
	# A touchscreen never shows the toggle, so a saved street_mouselook there asks for nothing.
	sv.touch_screen = true
	await suite.process_frame
	var touch_requests: int = sv.capture_requests
	sv.pointer_input(mouse_left(ml_at, true))
	var touch_role: String = sv.contacts[sv.MOUSE_CONTACT].role if sv.contacts.has(sv.MOUSE_CONTACT) else ""
	sv.pointer_input(mouse_move(ml_at + Vector2(30, 0), Vector2(30, 0)))
	sv.pointer_input(mouse_left(ml_at + Vector2(30, 0), false))
	suite.require(sv.street_mouselook and not sv.mouselook_visible() and touch_role == "look" and sv.capture_requests == touch_requests and sv.capture_state == "released", "on a touchscreen a saved mouse look neither shows the toggle nor asks for the mouse (role %s)" % touch_role)
	sv.touch_screen = false
	sv.yaw = 0.0
	game.update_camera()
	await suite.process_frame
	suite.require(sv.active() and sv.mouselook_visible(), "the eye and the toggle are back before the late grant check")
	# A right-button orbit held into a lock: the lock takes its release, so the lock's start and end clear the map's
	# drag flags; after Esc a plain hover must not turn the eye.
	var right := InputEventMouseButton.new()
	right.button_index = MOUSE_BUTTON_RIGHT
	right.pressed = true
	right.button_mask = MOUSE_BUTTON_MASK_RIGHT
	right.position = ml_at
	right.global_position = ml_at
	await send(suite, right)
	var orbit_armed: bool = game.orbit_dragging
	await send(suite, mouse_left(ml_at, true))
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	var orbit_locked: bool = sv.capture_state == "locked"
	var right_up: InputEventMouseButton = right.duplicate()
	right_up.pressed = false
	right_up.button_mask = 0
	await send(suite, right_up)
	await send(suite, mouse_left(ml_at, false))
	await send(suite, key(KEY_ESCAPE, true))
	await send(suite, key(KEY_ESCAPE, false))
	var hover_yaw: float = sv.yaw
	await send(suite, mouse_move(ml_at + Vector2(40, 0), Vector2(40, 0)))
	suite.require(orbit_armed and orbit_locked and sv.capture_state == "released" and not game.orbit_dragging and not game.pointer_active and is_equal_approx(sv.yaw, hover_yaw), "a right-button orbit held into a lock ends with it: after Esc a hover does not turn the eye (armed %s, locked %s, yaw moved %.4f)" % [str(orbit_armed), str(orbit_locked), sv.yaw - hover_yaw])
	sv.yaw = 0.0
	game.update_camera()
	await suite.process_frame
	# A click in a gutter outside the play area (not over UI) is ignored at eye level, as the same touch is.
	var play: Rect2 = game.play_area_rect()
	var gutter := Vector2(INF, INF)
	for g in [Vector2(play.position.x - 3.0, play.get_center().y), Vector2(play.end.x + 3.0, play.get_center().y), Vector2(play.get_center().x, play.end.y + 3.0), Vector2(play.get_center().x, play.position.y - 3.0)]:
		if g.x >= 0.0 and g.y >= 0.0 and g.x < float(suite.root.size.x) and g.y < float(suite.root.size.y) and not game.is_screen_point_in_ui(g) and not play.has_point(g):
			gutter = g
			break
	if is_finite(gutter.x):
		var gutter_state: Array = tap_state(game, sv)
		var gutter_taps: int = sv.taps_routed
		var gutter_requests: int = sv.capture_requests
		await send(suite, mouse_left(gutter, true))
		var gutter_armed: bool = game.pointer_active
		await send(suite, mouse_left(gutter, false))
		suite.require(not gutter_armed and not game.pointer_active and sv.taps_routed == gutter_taps and tap_state(game, sv) == gutter_state and sv.capture_requests == gutter_requests, "a click in the gutter at %s outside the play area neither taps the scene nor asks for the mouse" % str(gutter))
	else:
		suite.require(false, "a gutter point outside the play area and the UI for the eye-level click check (play %s)" % str(play))
	# A play area too short for the toggle under the street button: no lock is kept or asked for there.
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_left(ml_at, false))
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	var short_locked: bool = sv.capture_state == "locked"
	var short_size: Vector2i = suite.root.size
	suite.root.size = Vector2i(1100, 300)
	await suite.process_frame
	await suite.process_frame
	var short_area: Rect2 = game.play_area_rect()
	var short_released: bool = sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE
	var short_requests: int = sv.capture_requests
	sv.pointer_input(mouse_left(short_area.get_center(), true))
	var short_role: String = sv.contacts[sv.MOUSE_CONTACT].role if sv.contacts.has(sv.MOUSE_CONTACT) else ""
	sv.pointer_input(mouse_left(short_area.get_center(), false))
	suite.require(short_locked and short_area.size.y < sv.BUTTON_SIZE.y * 5.0 and not sv.mouselook_visible() and short_released and sv.capture_requests == short_requests and short_role == "look", "a play area too short for the toggle (%.0f px) drops a held mouse and a press there only looks (locked %s, released %s, role %s)" % [short_area.size.y, str(short_locked), str(short_released), short_role])
	suite.root.size = short_size
	await suite.process_frame
	await suite.process_frame
	sv.yaw = 0.0
	game.update_camera()
	await suite.process_frame
	suite.require(sv.active() and sv.mouselook_visible(), "the eye and the toggle are back after the drag, gutter and short-area checks")
	# A grant that lands after the player has left street view is cancelled at once.
	await send(suite, mouse_left(ml_at, true))
	await send(suite, mouse_left(ml_at, false))
	suite.require(sv.capture_state == "requested", "a press asks again before the late grant check")
	sv.toggle() # Leave street view while the request is in flight.
	await suite.process_frame
	sv.mouse_mode_override = CAPTURED
	await suite.process_frame
	suite.require(not sv.active() and sv.capture_state == "released" and sv.mouse_mode_override == VISIBLE, "a grant that arrives after leaving street view is cancelled at once")
	var requests_end: int = sv.capture_requests
	for _f in range(15):
		await suite.process_frame
	suite.require(sv.capture_requests == requests_end and sv.mouse_mode_override == VISIBLE and not sv.mouselook_visible(), "nothing asks again from the map view, where the toggle is hidden")
	sv.street_mouselook = false
	sv.capture_state = saved_capture[0]
	sv.capture_wait = saved_capture[1]
	sv.capture_dropped_frame = saved_capture[2]
	sv.capture_requests = saved_requests
	sv.mouse_mode_override = saved_override
	sv.refresh_mouselook_button()
	game.press_settle_msec = saved_settle
	game.rhythm_circle.visible = saved_rhythm_visible
	if had_settings:
		write_text(settings_path, saved_settings_raw)
	elif FileAccess.file_exists(settings_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(settings_path))
	game.settings_save_failed = saved_main["settings_save_failed"]
	checks += 1

	# 22. The Codex playtest of Phase 1: a hand walk west of Taylor turns street view off once (it used to flip
	# between the eye and the map many times a second); a tap on a close neighbour's face picks her (it used to walk
	# to a street point beyond her); a target behind the eye points the arrow down to turn around (it pointed up);
	# the arrow keeps clear of the street controls (the Map view button hid it at some phone headings).
	var g22_player: Vector3 = game.player.position
	var g22_size: Vector2i = suite.root.size
	game.stop_walking()
	game.startup_story_pending = false
	game.hide_story_card()
	suite.root.gui_release_focus()
	var bea_xz: Vector2 = game.neighbor_xz(0)
	var west_edge := Vector2.INF
	for zi in range(-40, 41):
		var c := Vector2(sv.WEST_LIMIT_X + 1.2, float(zi) * 0.5)
		if game.is_walkable_point(c) and game.is_walkable_point(c + Vector2(-3.0, 0.0)) and game.is_walkable_point(c + Vector2(-6.0, 0.0)):
			west_edge = c
			break
	suite.require(west_edge.x > sv.WEST_LIMIT_X and west_edge.x < sv.WEST_LIMIT_X + 4.0, "a walkable point just east of the western limit (%s)" % str(west_edge))
	game.player.position = Vector3(west_edge.x, 0.0, west_edge.y)
	if not sv.enabled:
		sv.toggle()
	await suite.process_frame
	face_toward(sv, game, west_edge + Vector2(-10.0, 0.0))
	await suite.process_frame
	suite.require(sv.active() and sv.forward_xz().x < -0.9, "the eye faces west at the limit (%s)" % str(sv.forward_xz()))
	var west_flips := 0
	var west_was: bool = sv.active()
	var exit_note := ""
	var after_exit := -1
	await send(suite, key(KEY_W, true))
	for _f in range(400):
		await suite.physics_frame
		if sv.active() != west_was:
			west_was = sv.active()
			west_flips += 1
			if west_flips == 1:
				exit_note = game.last_a11y_announcement
				after_exit = 0
		if after_exit >= 0:
			after_exit += 1
			if after_exit > 90:
				break
	await send(suite, key(KEY_W, false))
	game.stop_walking()
	suite.require(west_flips == 1 and not sv.active() and not sv.enabled and cam.projection == Camera3D.PROJECTION_ORTHOGONAL and exit_note.contains("only on the opening block"), "holding W across the western limit leaves street view once and says why (%d flips, '%s')" % [west_flips, exit_note])
	# A tap on Bea's face from 1 m (her face below the horizon, as in the playtest) picks her: a walk to her or a
	# talk, never a walk to a street point beyond her.
	var bea_stand: Vector2 = game.nearest_walkable_point(bea_xz + Vector2(1.0, 0.0), game.WALK_CLEARANCE_M)
	game.player.position = Vector3(bea_stand.x, 0.0, bea_stand.y)
	game.update_camera()
	sv.toggle()
	await suite.process_frame
	face_toward(sv, game, bea_xz)
	sv.pitch = 0.0
	game.update_camera()
	await suite.process_frame
	var near_back: float = sv.shoulder_back_m()
	var cam_flat := Vector2(cam.global_position.x, cam.global_position.z)
	suite.require(near_back > 0.2 and near_back <= sv.SHOULDER_MAX_M + 0.001 and cam_flat.distance_to(bea_xz) > game.player_xz().distance_to(bea_xz) + near_back - 0.05, "up close the eye steps back over the shoulder (%.2f m) so Bea is not a wall of body" % near_back)
	var yaw_front: float = sv.yaw
	sv.yaw = yaw_front + PI
	suite.require(is_zero_approx(sv.shoulder_back_m()), "with Bea behind the eye does not step back")
	sv.yaw = yaw_front
	game.update_camera()
	var bea_face: Vector2 = cam.unproject_position(game.neighbors[0].pos + Vector3.UP * 1.45)
	suite.require(sv.active() and is_zero_approx(sv.body_screen_distance(game.neighbors[0].pos, bea_face)), "at eye level Bea's face is on her body for taps (%s, %.1f px)" % [str(bea_face), sv.body_screen_distance(game.neighbors[0].pos, bea_face)])
	game.last_a11y_announcement = ""
	var sn0: int = game.selected_neighbor
	var tp0: int = game.talk_partner
	game.handle_scene_tap(bea_face)
	var tap_note: String = game.last_a11y_announcement
	var to_bea: bool = game.current_path.is_empty() or (game.current_path.back() as Vector2).distance_to(bea_xz) <= game.ARRIVAL_DISTANCE_M + 1.5
	var picked: bool = tap_note.contains("Bea") or (game.selected_neighbor == 0 and sn0 != 0) or (game.talk_partner == 0 and tp0 != 0)
	suite.require(bea_stand.distance_to(bea_xz) < 1.6 and bea_face.y > game.play_area_rect().get_center().y and to_bea and picked and not tap_note.contains("street point"), "a tap on Bea's face up close picks her ('%s')" % tap_note)
	game.stop_walking()
	if game.selected_neighbor >= 0:
		game.end_conversation()
	await suite.process_frame
	game.player.position = Vector3(bea_stand.x, 0.0, bea_stand.y)
	if not sv.active():
		game.frame_player_for_walking()
	await suite.process_frame
	# The objective behind the eye: the arrow sits low and points down. The marker is set from a fixed objective 8 m
	# away and the arrow read in the same frame, so the chapter the suite has reached does not matter.
	game.hide_speech_bubble()
	var arrow_tgt: Vector2 = sv.eye_xz() + Vector2(8.0, 0.0)
	var arrow_obj := {"has_target": true, "target": Vector3(arrow_tgt.x, 0.0, arrow_tgt.y), "target_name": "Arrow check"}
	face_toward(sv, game, sv.eye_xz() * 2.0 - arrow_tgt)
	await suite.process_frame
	game.update_guide_marker(arrow_obj)
	game.update_guide_arrow()
	if game.guide_marker.visible:
		var arrow_down := absf(wrapf(game.guide_arrow_poly.rotation - PI * 0.5, -PI, PI))
		suite.require(sv.active() and game.camera.is_position_behind(game.guide_marker_target) and game.guide_arrow.visible and game.guide_arrow.position.y > game.play_area_rect().get_center().y and arrow_down < 0.35, "with the objective behind the eye the arrow points down to turn around (rotation %.2f, at %s)" % [game.guide_arrow_poly.rotation, str(game.guide_arrow.position)])
	else:
		suite.require(false, "the guide marker is up for the behind-the-eye arrow check")
	# At 390x667 the arrow never sits under the street controls, at any heading.
	suite.root.size = Vector2i(390, 667)
	await suite.process_frame
	await suite.process_frame
	var arrow_overlaps: Array = []
	var arrow_shown := 0
	var near_button := 0
	arrow_tgt = sv.eye_xz() + Vector2(4.0, 0.0) # As close as Bea was in the playtest: the marker floats above the view.
	arrow_obj["target"] = Vector3(arrow_tgt.x, 0.0, arrow_tgt.y)
	var btn_rect: Rect2 = sv.button.get_global_rect()
	for h in range(72):
		sv.yaw = float(h) * PI / 36.0
		game.update_camera()
		await suite.process_frame
		game.update_guide_marker(arrow_obj)
		game.update_guide_arrow()
		if game.guide_arrow.visible:
			arrow_shown += 1
			if absf(game.guide_arrow.position.x - btn_rect.get_center().x) < btn_rect.size.x and game.guide_arrow.position.y < btn_rect.end.y + 60.0:
				near_button += 1
			var arrow_box := Rect2(game.guide_arrow.position - Vector2(20.0, 20.0), Vector2(40.0, 40.0))
			for r in sv.occupied_rects():
				if arrow_box.intersects(r):
					arrow_overlaps.append(h * 5)
	# The marker now sits at 2.4 m at eye level, so the arrow rarely reaches the button; the slide itself is checked
	# directly below.
	suite.require(arrow_shown >= 4 and arrow_overlaps.is_empty(), "at 390x667 the guide arrow keeps clear of the street controls at every 5 degree heading (%d shown, %d by the button, overlaps at %s)" % [arrow_shown, near_button, str(arrow_overlaps)])
	game.reward_banner_timer = 0.0 # A reward note moves the street button down; this check is about the top edge.
	game.reward_banner.visible = false
	sv.refresh_button()
	var slide_inset: Rect2 = game.play_area_rect().grow(-27.0)
	var slide_from := Vector2(sv.button.get_global_rect().get_center().x, slide_inset.position.y)
	var slid: Vector2 = game.clear_of_street_controls(slide_from, slide_inset, sv.occupied_rects())
	var slid_clear := true
	for r in sv.occupied_rects():
		slid_clear = slid_clear and not Rect2(slid - Vector2(20.0, 20.0), Vector2(40.0, 40.0)).intersects(r)
	suite.require(sv.button_visible() and slid_clear and is_equal_approx(slid.y, slide_from.y) and slide_inset.grow(0.5).has_point(slid) and slid.x < slide_from.x, "an arrow on the top edge under the Map view button slides left along the edge, clear of it (%s to %s)" % [str(slide_from), str(slid)])
	suite.root.size = g22_size
	await suite.process_frame
	await suite.process_frame
	sv.yaw = 0.0
	if sv.enabled:
		sv.toggle()
	game.stop_walking()
	game.player.position = g22_player
	game.update_camera()
	await suite.process_frame
	checks += 1

	# 23. The agy playtest of Phase 1: Shift+F on the opening card accepts it first (music on, as Start Exploring
	# does); Shift+F with a chat or the hub open ends it with its goodbye before the eye takes over; the gold diamond
	# is depth-tested at eye level and restored after; Zoom at eye level says why it does nothing.
	var g23_player: Vector3 = game.player.position
	var g23_music: bool = game.music_playing
	if sv.enabled:
		sv.toggle()
	game.player.position = Vector3(bea_stand.x, 0.0, bea_stand.y)
	game.update_camera()
	await suite.process_frame
	if game.music_playing:
		game.stop_music_playback()
	game.show_story_card(game.current_chapter(), true)
	game.startup_story_pending = true
	await suite.process_frame
	suite.require(game.is_story_card_visible() and game.startup_story_pending and not game.music_playing, "the opening card is up, with the music off, for the Shift+F check")
	suite.root.gui_release_focus()
	await send(suite, key(KEY_F, true, true))
	await send(suite, key(KEY_F, false, true))
	await suite.process_frame
	suite.require(not game.is_story_card_visible() and not game.startup_story_pending and game.music_playing and sv.active(), "Shift+F on the opening card accepts it with the music on, then enters street view (card %s, music %s, active %s)" % [str(game.is_story_card_visible()), str(game.music_playing), str(sv.active())])
	var gem_mat: BaseMaterial3D = sv.guide_gem_material()
	suite.require(gem_mat != null and sv.active() and not gem_mat.no_depth_test, "at eye level the gold diamond is depth-tested, so it does not show through walls")
	var zoom_size: float = game.view_size
	game.zoom(0.8)
	suite.require(is_equal_approx(game.view_size, zoom_size) and game.last_a11y_announcement.begins_with("Zoom works in the map view"), "Zoom at eye level changes nothing and says why ('%s')" % game.last_a11y_announcement)
	sv.toggle()
	await suite.process_frame
	suite.require(not sv.active() and gem_mat != null and gem_mat.no_depth_test, "leaving street view restores the diamond's map drawing")
	# A chat with Bea, then Shift+F: the goodbye comes first and no panel stays over the eye.
	game.talk_with_neighbor(0)
	await suite.process_frame
	suite.require(game.talk_partner == 0 and game.any_side_panel_visible(), "a chat with Bea is open for the Shift+F check")
	suite.root.gui_release_focus()
	await send(suite, key(KEY_F, true, true))
	await send(suite, key(KEY_F, false, true))
	await suite.process_frame
	suite.require(sv.active() and game.talk_partner == -1 and not game.any_side_panel_visible() and String(game.info.text).begins_with("You said goodbye to Bea") and game.last_a11y_announcement.begins_with("Said goodbye to Bea. Street view."), "Shift+F during a chat says goodbye to Bea (shown and spoken), then enters street view with no panel open (partner %d, panel %s, info '%s')" % [game.talk_partner, str(game.any_side_panel_visible()), String(game.info.text).get_slice("\n", 0)])
	# The block hub (G), then Shift+F: the hub closes before the eye takes over.
	sv.toggle()
	await suite.process_frame
	game.toggle_block_panel()
	await suite.process_frame
	suite.require(game.block_panel.visible and not sv.active(), "the block hub is open for the Shift+F check")
	suite.root.gui_release_focus()
	await send(suite, key(KEY_F, true, true))
	await send(suite, key(KEY_F, false, true))
	await suite.process_frame
	suite.require(sv.active() and not game.block_panel.visible, "Shift+F with the hub open closes it, then enters street view")
	if sv.enabled:
		sv.toggle()
	await suite.process_frame
	if game.music_playing and not g23_music:
		game.stop_music_playback()
	game.stop_walking()
	game.player.position = g23_player
	game.update_camera()
	await suite.process_frame
	checks += 1

	# 24. The Codex playtest of Phase 2: a held stick walks on through a rotation to landscape and back; a left click
	# chorded with a held right button never asks for the mouse. (The goodbye spoken before the street view line is
	# checked in group 23; the system reduced-motion seed is web-only and is checked in a browser.)
	var g24_player: Vector3 = game.player.position
	var g24_size: Vector2i = suite.root.size
	var g24_touch: bool = sv.touch_screen
	var g24_spot: Vector2 = open_spot(game, sv)
	if is_finite(g24_spot.x):
		game.player.position = Vector3(g24_spot.x, 0.0, g24_spot.y)
	game.update_camera()
	suite.root.size = Vector2i(390, 667)
	sv.touch_screen = true
	if not sv.enabled:
		sv.toggle()
	await suite.process_frame
	await suite.process_frame
	var rot_centre: Vector2 = sv.stick.get_global_rect().get_center()
	await send(suite, touch(0, rot_centre, true))
	await send(suite, touch_drag(0, rot_centre + Vector2(0, -40), Vector2(0, -40)))
	var held_portrait: bool = sv.contacts.has(0) and sv.contacts[0].role == "move" and sv.stick_vector().length() > 0.5
	suite.root.size = Vector2i(667, 390)
	await suite.process_frame
	await suite.process_frame
	var landscape_stick: bool = sv.stick_visible() and game.play_area_rect().encloses(sv.stick.get_global_rect()) and not sv.stick.get_global_rect().intersects(sv.button.get_global_rect())
	var held_landscape: bool = sv.active() and sv.contacts.has(0) and sv.contacts[0].role == "move" and sv.stick_vector().length() > 0.5
	suite.root.size = Vector2i(390, 667)
	await suite.process_frame
	await suite.process_frame
	var held_back: bool = sv.active() and sv.stick_visible() and sv.contacts.has(0) and sv.stick_vector().length() > 0.5
	await send(suite, touch(0, rot_centre + Vector2(0, -40), false))
	suite.require(held_portrait and held_landscape and held_back and sv.contacts.is_empty(), "a held stick walks on through a rotation to 667x390 and back (portrait %s, landscape %s, back %s)" % [str(held_portrait), str(held_landscape), str(held_back)])
	suite.require(landscape_stick, "a 667x390 landscape phone shows the walk stick inside the play area, clear of the street button (%s in %s)" % [str(sv.stick.get_global_rect()), str(game.play_area_rect())])
	sv.touch_screen = false
	suite.root.size = g24_size
	await suite.process_frame
	await suite.process_frame
	# Mouse look on; a right drag with a left click inside it asks for nothing.
	game.press_settle_msec = 0
	var chord_at: Vector2 = free_point(game, sv)
	if not is_finite(chord_at.x):
		chord_at = game.play_area_rect().get_center()
	sv.street_mouselook = true
	sv.mouse_mode_override = Input.MOUSE_MODE_VISIBLE
	sv.refresh_mouselook_button()
	var chord_requests: int = sv.capture_requests
	var rdown := InputEventMouseButton.new()
	rdown.button_index = MOUSE_BUTTON_RIGHT
	rdown.pressed = true
	rdown.button_mask = MOUSE_BUTTON_MASK_RIGHT
	rdown.position = chord_at
	rdown.global_position = chord_at
	await send(suite, rdown)
	var ldown: InputEventMouseButton = mouse_left(chord_at, true)
	ldown.button_mask = MOUSE_BUTTON_MASK_LEFT | MOUSE_BUTTON_MASK_RIGHT
	await send(suite, ldown)
	var lup: InputEventMouseButton = mouse_left(chord_at, false)
	lup.button_mask = MOUSE_BUTTON_MASK_RIGHT
	await send(suite, lup)
	var rup: InputEventMouseButton = rdown.duplicate()
	rup.pressed = false
	rup.button_mask = 0
	await send(suite, rup)
	await suite.process_frame
	suite.require(sv.active() and sv.capture_requests == chord_requests and sv.capture_state != "locked" and sv.capture_state != "requested" and not game.orbit_dragging, "a left click inside a right-button drag never asks for the mouse (%d requests, %s)" % [sv.capture_requests - chord_requests, sv.capture_state])
	sv.street_mouselook = false
	sv.mouse_mode_override = saved_override
	sv.refresh_mouselook_button()
	game.press_settle_msec = saved_settle
	sv.touch_screen = g24_touch
	if sv.enabled:
		sv.toggle()
	game.stop_walking()
	game.player.position = g24_player
	game.update_camera()
	await suite.process_frame
	checks += 1

	# 25. Declutter at eye level (the creator's iPhone run): street banners at a readable screen size and only within
	# reach; speech, the Talk prompt, the gold marker and the mural caption just above head height; nameplates kept
	# whole past poles (line of sight still hides them behind buildings); Celeste's and Rook's panels suspend the eye
	# like the hub, and closing them resumes it. Leaving restores every map value.
	var g25_player: Vector3 = game.player.position
	var g25_size: Vector2i = suite.root.size
	if sv.enabled:
		sv.toggle()
	await suite.process_frame
	var eye_banners: Array = []
	for b in game.street_signs_root.get_children():
		if b is Label3D:
			eye_banners.append([b, b.pixel_size, b.visible])
	var mural_cap: Label3D = sv.mural_label()
	var ml_map_y: float = mural_cap.position.y if mural_cap != null else 0.0
	var bea_nameplate: Label3D = null
	for label in game.readable_scene_labels:
		if is_instance_valid(label) and int(label.get_meta("neighbor_index", -1)) == 0:
			bea_nameplate = label
	game.player.position = Vector3(bea_stand.x, 0.0, bea_stand.y)
	game.update_camera()
	sv.toggle()
	await suite.process_frame
	await suite.process_frame
	var near_shown := 0
	var far_hidden := 0
	var banners_sized := true
	for item in eye_banners:
		var b: Label3D = item[0]
		var d: float = Vector2(b.global_position.x, b.global_position.z).distance_to(sv.eye_xz())
		if b.visible:
			near_shown += 1
			var want: float = game.screen_constant_scale(sv.BANNER_PX / float(b.font_size), b.global_position)
			banners_sized = banners_sized and d <= sv.BANNER_RANGE_M and absf(b.pixel_size - want) <= want * 0.02 and b.pixel_size < float(item[1])
		elif d > sv.BANNER_RANGE_M:
			far_hidden += 1
	suite.require(sv.active() and near_shown >= 1 and far_hidden >= 1 and banners_sized, "at eye level street banners are about 18 px tall and only within 45 m (%d near shown, %d far hidden, sized %s)" % [near_shown, far_hidden, str(banners_sized)])
	var heights_eye := [game.speech_lift_m(), game.guide_marker_anchor({"target": Vector3(bea_xz.x, 0.0, bea_xz.y), "neighbor": 0}).y, mural_cap.position.y if mural_cap != null else -1.0]
	suite.require(is_equal_approx(heights_eye[0], 2.05) and is_equal_approx(heights_eye[1], 2.4) and is_equal_approx(heights_eye[2], sv.MURAL_LABEL_EYE_Y), "at eye level speech and the Talk prompt sit at 2.05 m, the gold marker at 2.4 m and the mural caption at 2.4 m (%s)" % str(heights_eye))
	var banner_tested: bool = eye_banners.size() > 0 and not (eye_banners[0][0] as Label3D).no_depth_test
	suite.require(bea_nameplate != null and bea_nameplate.no_depth_test and banner_tested, "at eye level nameplates are not sliced by poles while street banners stay depth-tested")
	# The two collisions in the follow-up phone shots: the reward note under the street button, and a banner
	# behind the Talk prompt. At 410x892, beside Bea: the button steps below a showing reward note, and no visible
	# banner overlaps the prompt, the street controls or another banner.
	suite.root.size = Vector2i(410, 892)
	game.player.position = Vector3(17.74, 0.0, -9.33)
	face_toward(sv, game, bea_xz)
	sv.pitch = 0.0
	game.update_camera()
	if not sv.enabled:
		sv.toggle()
	await suite.process_frame
	await suite.process_frame
	game.trigger_feel_good_burst("Layout check", "A reward note for the street button check.", game.player.position)
	await suite.process_frame
	await suite.process_frame
	var rb_rect: Rect2 = game.reward_banner.get_global_rect() if game.reward_banner.is_visible_in_tree() else Rect2()
	suite.require(rb_rect.has_area() and sv.button_visible() and not sv.button.get_global_rect().intersects(rb_rect), "with a reward note showing, the street button steps below it (%s, %s)" % [str(rb_rect), str(sv.button.get_global_rect())])
	game.reward_banner_timer = 0.0
	game.reward_banner.visible = false
	game.celebration_burst_node.visible = false
	await suite.process_frame
	var taken: Array[Rect2] = sv.occupied_rects()
	var talk25: Rect2 = game.talk_prompt_screen_rect()
	if talk25.has_area():
		taken.append(talk25.grow(6.0))
	var clash := ""
	var shown25 := 0
	for b in game.street_signs_root.get_children():
		if not (b is Label3D) or not b.visible or game.camera.is_position_behind(b.global_position):
			continue
		shown25 += 1
		var sz: Vector2 = ThemeDB.fallback_font.get_string_size(b.text, HORIZONTAL_ALIGNMENT_CENTER, -1, b.font_size) * (sv.BANNER_PX / float(b.font_size)) + Vector2(16.0, 8.0)
		var rect := Rect2(game.camera.unproject_position(b.global_position) - sz * 0.5, sz)
		for r in taken:
			if rect.intersects(r):
				clash = String(b.name)
		taken.append(rect)
	suite.require(talk25.has_area() and clash == "", "beside Bea at 410x892 no street banner overlaps the Talk prompt, the street controls or another banner (talk %s, %d shown, clash '%s')" % [str(talk25), shown25, clash])
	# Celeste's and Rook's panels suspend the eye like the hub, at 1100x760 and at 390x667.
	var g25_panels: Array = []
	for size in [g25_size, Vector2i(390, 667)]:
		suite.root.size = size
		await suite.process_frame
		await suite.process_frame
		for which in ["mural", "music"]:
			if not sv.active():
				game.frame_player_for_walking()
				await suite.process_frame
			if which == "mural":
				game.show_mural_panel(true)
			else:
				game.show_music_panel(true)
			var off: bool = not sv.active() and game.camera.projection == Camera3D.PROJECTION_ORTHOGONAL
			await suite.process_frame
			if which == "mural":
				game.show_mural_panel(false)
			else:
				game.show_music_panel(false)
			await suite.process_frame
			if not sv.active() and not game.following_player:
				game.follow_player() # A phone frames the easel or speaker; closing walks the view back to the player.
				await suite.process_frame
			g25_panels.append([size.x, which, off, sv.active()])
	var g25_panels_ok := true
	for r in g25_panels:
		g25_panels_ok = g25_panels_ok and r[2] and r[3]
	suite.require(g25_panels_ok, "Celeste's and Rook's panels suspend the eye at once and closing them resumes it, at 1100 and 390 wide (%s)" % str(g25_panels))
	suite.root.size = g25_size
	await suite.process_frame
	await suite.process_frame
	if sv.enabled:
		sv.toggle()
	await suite.process_frame
	var g25_restored := true
	for item in eye_banners:
		var b: Label3D = item[0]
		g25_restored = g25_restored and is_equal_approx(b.pixel_size, float(item[1])) and b.visible == bool(item[2])
	suite.require(g25_restored and is_equal_approx(game.speech_lift_m(), game.SPEECH_BUBBLE_HEIGHT_M) and (mural_cap == null or is_equal_approx(mural_cap.position.y, ml_map_y)) and is_equal_approx(game.guide_marker_anchor({"target": Vector3(bea_xz.x, 0.0, bea_xz.y), "neighbor": 0}).y, game.GUIDE_MARKER_LIFT_HIGH), "leaving street view restores the banners, the speech, marker and mural caption heights")
	game.stop_walking()
	game.player.position = g25_player
	game.update_camera()
	await suite.process_frame
	checks += 1

	# Restore the caller's state.
	sv.enabled = false
	sv.yaw = 0.0
	sv.pitch = 0.0
	sv.has_heading = false
	sv.touch_screen = saved_touch_screen
	sv.street_turn = "snap30"
	sv.reset_settings()
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
	game.player_visual.rotation = saved_visual_rotation
	suite.require(not sv.active() and cam.projection == Camera3D.PROJECTION_ORTHOGONAL and cam.near == map_near and cam.far == map_far, "street view checks hand back the orthographic map camera")
	suite.require(game.player.position == original_player and game.current_path == original_path, "street view checks restore caller position and route")
	print("STREET_VIEW_PASS:" + ("FORMAL" if formal else "PRIVATE") + " rule/eye/return-pose/suspend/resume/refit/horizon/depth/sight/pace/west/ShiftF/yaw-walk/mouse-look/touch-roles/stick/turn-step/portrait-fov/settings/reduced-motion/capture/playtest/agy/playtest2/declutter ", checks)
