extends RefCounted
## Street view (docs/FIRST_PERSON_PLAN.md, Phase 1): the one rule, the exact return pose,
## suspension by framing functions, the guarded refit, horizon taps, depth scaling, line of
## sight, the walking pace and the Shift+F key. Runs early in the formal suite and restores
## the caller's camera, player, route and story card.

static func pose(game: Node) -> Array:
	return [game.target, game.view_size, game.camera_yaw, game.camera_pitch_scale, game.following_player]

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
	for key in ["following_player", "in_overview", "in_wide_overview", "target", "view_size", "camera_yaw", "camera_pitch_scale", "startup_story_pending", "block_panel_mode", "talk_partner", "selected_neighbor", "arrived_neighbor", "last_proximity_neighbor", "selected", "last_story_chapter"]:
		state[key] = game.get(key)
	var story_visible: bool = game.is_story_card_visible()
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

	# Restore the caller's state.
	sv.enabled = false
	sv.yaw = 0.0
	sv.pitch = 0.0
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
	suite.require(not sv.active() and cam.projection == Camera3D.PROJECTION_ORTHOGONAL and cam.near == map_near and cam.far == map_far, "street view checks hand back the orthographic map camera")
	suite.require(game.player.position == original_player and game.current_path == original_path, "street view checks restore caller position and route")
	print("STREET_VIEW_PASS:" + ("FORMAL" if formal else "PRIVATE") + " rule/eye/return-pose/suspend/resume/refit/horizon/depth/sight/pace/west/ShiftF ", checks)
