extends SceneTree
var failed := false

func _initialize() -> void:
	call_deferred("run")

func require(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		push_error(message)

func run() -> void:
	var study = load("res://main.tscn").instantiate()
	root.add_child(study)
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	require(study.meshes.size() == 58, "58 actual building meshes")
	require(study.controls.get_child_count() == 6, "6 responsive control buttons including Walk to neighbor")
	require(is_equal_approx(study.player_height_m(), 1.72), "player visual height is actual 1.72 metres")
	require(study.building_containing_point(study.player_xz()) == "", "player starts outside all building footprints")
	require(study.is_walkable_point(study.player_xz()), "player start is walkable")
	var courtyard_tested := false
	for i in range(58):
		var b: Dictionary = study.data.buildings[i]
		var mesh: MeshInstance3D = study.meshes[i]
		require(mesh.get_node_or_null("StaticBody3D") != null, "building mesh has StaticBody3D collision")
		for poly in b.polygons:
			if poly.rings.size() > 1:
				var hole: Array = poly.rings[1]
				var hc := Vector2.ZERO
				for pt in hole:
					hc += Vector2(pt[0], pt[1])
				hc /= float(hole.size())
				if study.is_point_in_ring(hc, hole):
					require(not study.is_point_in_building_polygon(hc, poly), "courtyard hole is not treated as solid building interior")
					courtyard_tested = true
	require(courtyard_tested, "at least one real courtyard hole verified")
	for i in range(study.neighbors.size()):
		var n_xz: Vector2 = study.neighbor_xz(i)
		require(study.building_containing_point(n_xz) == "", "neighbor %s outside all building footprints" % study.neighbors[i].name)
		require(study.min_wall_distance(n_xz) >= 2.35, "neighbor %s has sidewalk clearance >= 2.35m" % study.neighbors[i].name)
		require(study.is_walkable_point(n_xz), "neighbor %s position is walkable" % study.neighbors[i].name)
	require(study.save_path == study.GODOT_TEST_SAVE_PATH, "study_test uses isolated test save path")
	var m_xz: Vector2 = study.mural_xz()
	require(study.mural_node != null and study.mural_canvas_mesh != null, "3D Portable Mural Board node and canvas mesh exist")
	require(study.mural_node.get_node_or_null("StaticBody3D") != null, "Portable Mural Board has StaticBody3D collision")
	require(study.building_containing_point(m_xz) == "", "portable mural board is outside all 58 building footprints")
	var m_nb: Dictionary = study.nearest_building_info(m_xz)
	require(m_nb.id == "201006.0003465" and study.min_wall_distance(m_xz) >= 3.40, "portable mural board is >= 3.40m clear of nearest measured building 201006.0003465")
	for corner in study.mural_corner_points():
		require(study.building_containing_point(corner) == "" and study.min_wall_distance(corner) >= 2.35, "all 4 mural board corners are outside all building footprints with >= 2.35m wall clearance")
	require(not study.is_walkable_point(m_xz), "portable mural board footprint center is solid/non-walkable")
	require(study.is_walkable_point(study.mural_stand_xz()), "portable mural board stand position in front of canvas is walkable")
	study.clear_godot_save()
	study.choose_next(-1)
	require(study.selected == 57, "first Previous selects last building")
	study.overview()
	require(study.selected == -1 and study.info.text == study.overview_text(), "overview clears selection and restores context")
	for i in range(58):
		var mesh: MeshInstance3D = study.meshes[i]
		require(is_equal_approx(mesh.get_aabb().size.y, study.data.buildings[i].height_m), "mesh height must be measured metres")
		study.choose_next(1)
		require(study.selected == i, "next selects stable source sequence")
		require(study.info.text.contains(study.data.buildings[i].id), "visible selected city ID")
	study.choose_next(1)
	require(study.selected == 0, "next wraps")
	study.choose_next(-1)
	require(study.selected == 57, "previous wraps")
	study.overview()

	# Test direct walking collision against north-side building 201006.0006089
	study.player.position = study.PLAYER_START
	var start_z: float = study.player_xz().y
	for _step in range(25):
		study.walk_step(Vector2(0.0, -1.0), 0.1)
		require(study.building_containing_point(study.player_xz()) == "", "walking north into wall never enters building interior")
		require(study.min_wall_distance(study.player_xz()) >= study.WALK_CLEARANCE_M - 1e-3, "wall clearance maintained during collision")
	require(study.player_xz().y < start_z and study.player_xz().y > -13.0, "player approaches north wall then stops outside footprint")

	# Test angled street wall-sliding eastward along Turk Street
	study.player.position = study.PLAYER_START
	var before_east_x: float = study.player_xz().x
	for _step in range(20):
		study.walk_step(Vector2(1.0, 0.0), 0.15)
		require(study.building_containing_point(study.player_xz()) == "", "eastward slide stays outside all footprints")
	require(study.player_xz().x > before_east_x + 8.0, "eastward walk slides smoothly along angled Turk sidewalk")

	# Test out-of-bounds rejection and nearest walkable snapping
	require(not study.is_walkable_point(Vector2(-500.0, -500.0)), "distant point outside bounds is not walkable")
	var interior_pt := Vector2(21.55, -13.39)
	require(study.building_containing_point(interior_pt) != "", "test point is inside a building footprint")
	var snapped: Vector2 = study.nearest_walkable_point(interior_pt)
	require(study.is_walkable_point(snapped) and study.building_containing_point(snapped) == "", "interior point snaps to walkable sidewalk")

	# Test cycling and arriving at all 5 neighbors + continuous non-teleporting walk + occlusion cutaway
	study.player.position = study.PLAYER_START
	study.selected_neighbor = -1
	var rook_occluded := false
	var thanh_occluded := false
	for i in range(study.neighbors.size()):
		study.choose_next_neighbor(1)
		require(study.selected_neighbor == i, "choose_next_neighbor selects neighbor %d" % i)
		for wp in study.current_path:
			require(study.building_containing_point(wp) == "", "route waypoint outside all footprints")
		var guard := 0
		var max_step_dist: float = study.WALK_SPEED_M_PER_S * 0.2 + 0.05
		while not study.current_path.is_empty() and guard < 400:
			var prev_pos: Vector2 = study.player_xz()
			study.advance_walk(0.2)
			var cur_pos: Vector2 = study.player_xz()
			require(cur_pos.distance_to(prev_pos) <= max_step_dist, "walk step moves continuously without teleporting")
			require(study.building_containing_point(cur_pos) == "", "step along route stays outside footprints")
			guard += 1
		require(guard < 400, "neighbor route finishes within bounded steps")
		require(study.arrived_neighbor == i, "arrived at neighbor %s" % study.neighbors[i].name)
		var final_d: float = study.player_xz().distance_to(study.neighbor_xz(i))
		require(final_d <= study.ARRIVAL_DISTANCE_M + 1e-3 and final_d >= 0.70, "arrival stops within <= 1.35m without overlapping neighbor")
		require(study.info.text.contains(study.neighbors[i].name), "arrival updates info with neighbor name")
		if study.neighbors[i].id == "celeste":
			require(study.mural_panel.visible, "arriving at Celeste opens portable mural panel")
		if study.neighbors[i].id == "rook":
			rook_occluded = not study.occluded_buildings.is_empty()
			for occ_idx in study.occluded_buildings:
				require(study.meshes[occ_idx].material_override == study.cutaway_material, "occluding building uses cutaway material")
				require(is_equal_approx(study.meshes[occ_idx].get_aabb().size.y, study.data.buildings[occ_idx].height_m), "cutaway preserves measured building height")
		if study.neighbors[i].id == "thanh":
			thanh_occluded = not study.occluded_buildings.is_empty()
	require(rook_occluded and thanh_occluded, "camera sightline cutaway activates for occluded neighbor locations")
	study.choose_next_neighbor(1)
	require(study.selected_neighbor == 0, "neighbor navigation wraps to first neighbor")

	# Test _unhandled_input 3D scene tap on a neighbor, street point, and >8px drag threshold gating
	study.overview()
	var celeste_screen: Vector2 = study.camera.unproject_position(study.neighbors[1].pos + Vector3(0.0, 0.9, 0.0))
	var press_ev := InputEventMouseButton.new()
	press_ev.button_index = MOUSE_BUTTON_LEFT
	press_ev.pressed = true
	press_ev.position = celeste_screen
	study._unhandled_input(press_ev)
	var rel_ev := InputEventMouseButton.new()
	rel_ev.button_index = MOUSE_BUTTON_LEFT
	rel_ev.pressed = false
	rel_ev.position = celeste_screen
	study._unhandled_input(rel_ev)
	require(study.selected_neighbor == 1 and not study.current_path.is_empty(), "mouse tap on projected neighbor starts route to Celeste")

	# Test >8px drag pans camera without cancelling route or resetting target on advance_walk
	var drag_start := Vector2(550.0, 380.0)
	var drag_end := Vector2(590.0, 410.0)
	press_ev.position = drag_start
	study._unhandled_input(press_ev)
	var motion_ev := InputEventMouseMotion.new()
	motion_ev.position = drag_end
	study._unhandled_input(motion_ev)
	rel_ev.position = drag_end
	study._unhandled_input(rel_ev)
	var panned_target: Vector3 = study.target
	require(not study.following_player, "drag pan disables automatic camera follow")
	require(study.selected_neighbor == 1 and not study.current_path.is_empty(), "drag pan does not trigger a tap route override")
	study.advance_walk(0.1)
	require(study.target.is_equal_approx(panned_target), "advance_walk preserves panned camera target while following_player is false")
	study.follow_player()
	require(study.following_player, "follow_player re-enables camera follow")

	# Test tapping and walking to the 3D Portable Mural Board
	study.overview()
	var mural_screen: Vector2 = study.camera.unproject_position(study.MURAL_POS + Vector3(0.0, 1.4, 0.0))
	require(study.handle_scene_tap(mural_screen), "tapping projected 3D Portable Mural Board starts route")
	require(study.walking_to_mural and not study.current_path.is_empty(), "mural tap sets walking_to_mural route")
	var mural_guard := 0
	while not study.current_path.is_empty() and mural_guard < 400:
		study.advance_walk(0.2)
		mural_guard += 1
	require(mural_guard < 400 and study.arrived_mural, "player arrives at Portable Mural Board within bounded steps")
	require(study.player_xz().distance_to(m_xz) <= 2.2 and not study.is_point_in_mural_footprint(study.player_xz()), "player stands in front of Portable Mural Board outside board footprint")
	require(study.mural_panel.visible, "arriving at Portable Mural Board opens mural panel")

	# Test deferred KEY_E talk when starting far from Celeste, and shortcut gating when away from mural
	study.clear_godot_save()
	study.player.position = study.PLAYER_START
	study.overview()
	var key6_ev := InputEventKey.new()
	key6_ev.pressed = true
	key6_ev.keycode = KEY_6
	study._unhandled_input(key6_ev)
	require(study.mural_placements.is_empty(), "KEY_6 is ignored while away from Celeste/mural in overview")
	var keye_ev := InputEventKey.new()
	keye_ev.pressed = true
	keye_ev.keycode = KEY_E
	study._unhandled_input(keye_ev)
	require(study.selected_neighbor == study.celeste_index and study.pending_celeste_talk and study.celeste_talk_count == 0, "KEY_E when away starts walking to Celeste and defers talk until arrival")
	var talk_guard := 0
	while not study.current_path.is_empty() and talk_guard < 400:
		study.advance_walk(0.2)
		talk_guard += 1
	require(study.arrived_neighbor == study.celeste_index and not study.pending_celeste_talk and study.celeste_talk_count == 1 and study.info.text.contains("Celeste:"), "deferred KEY_E talk fires upon arriving at Celeste")

	# Test talking with Celeste, 6x3 motif placement/movement, 3D visual consequence, and separate Godot save/reload
	study.clear_godot_save()
	var line1: String = study.talk_with_celeste()
	var line2: String = study.talk_with_celeste()
	require(study.celeste_talk_count == 2 and line1 != line2, "talking with Celeste advances original portable board dialogue")
	require(not study.place_mural_motif("bogus", 0, 0), "invalid motif ID rejected")
	require(not study.place_mural_motif("sun", -1, 0) and not study.place_mural_motif("sun", 6, 0) and not study.place_mural_motif("sun", 0, 3), "out-of-bounds 6x3 board cells rejected")
	require(study.place_mural_motif("sun", 1, 0), "place Sun motif at (1,0)")
	var sun_node: Node3D = study.mural_motif_nodes["sun"]
	var wave_node: Node3D = study.mural_motif_nodes["wave"]
	var rise_node: Node3D = study.mural_motif_nodes["rise"]
	require(sun_node.visible and not wave_node.visible and not rise_node.visible, "placing Sun makes 3D MotifSun visible on board")
	require(not study.place_mural_motif("wave", 1, 0), "occupied board cell (1,0) rejects overlapping motif")
	require(study.place_mural_motif("wave", 3, 1), "place Wave motif at (3,1)")
	require(study.place_mural_motif("rise", 5, 2), "place Rise motif at (5,2)")
	require(study.mural_completed and study.mural_banner_mesh.visible, "placing all 3 motifs completes mural and shows 3D completion banner")
	var sun_pos_before: Vector3 = sun_node.position
	study.active_motif = "sun"
	require(study.move_active_motif(1, 0), "move_active_motif shifts Sun to (2,0)")
	require(not sun_node.position.is_equal_approx(sun_pos_before), "moving motif visibly updates 3D motif position on board")
	var canvas_mat_before: StandardMaterial3D = study.mural_canvas_mesh.material_override
	var color_before: Color = canvas_mat_before.albedo_color
	require(study.set_mural_palette("sunset"), "set_mural_palette switches to sunset")
	var canvas_mat_after: StandardMaterial3D = study.mural_canvas_mesh.material_override
	require(canvas_mat_after.albedo_color != color_before, "changing palette updates 3D canvas material color")
	require(FileAccess.file_exists(study.save_path), "separate Godot save file written")
	var raw_saved: String = FileAccess.get_file_as_string(study.save_path)
	require(raw_saved.contains("\"schema\":\"tenderloin-redux.godot.save\"") and not raw_saved.contains("tenderloin-redux.save.v1"), "Godot save uses isolated schema namespace")

	# Instantiate a fresh scene to prove reload persistence from save_path
	var reloaded = load("res://main.tscn").instantiate()
	root.add_child(reloaded)
	await process_frame
	await process_frame
	require(reloaded.save_load_status == "restored", "fresh scene restores saved Godot mural state on load")
	require(reloaded.celeste_talk_count == 2 and reloaded.active_motif == "sun", "reloaded scene restores celeste_talk_count and active_motif")
	require(reloaded.mural_palette == "sunset" and reloaded.mural_completed and reloaded.mural_banner_mesh.visible, "reloaded scene restores palette, completion, and 3D banner")
	var rel_sun: Node3D = reloaded.mural_motif_nodes["sun"]
	var rel_wave: Node3D = reloaded.mural_motif_nodes["wave"]
	var rel_rise: Node3D = reloaded.mural_motif_nodes["rise"]
	require(rel_sun.visible and rel_wave.visible and rel_rise.visible, "reloaded scene restores all 3 visible 3D motif meshes")
	require(rel_sun.position.is_equal_approx(sun_node.position), "reloaded scene restores moved 3D Sun motif coordinates")
	reloaded.queue_free()
	await process_frame

	# Test corrupt save recovery without crashing
	require(not study.apply_save_envelope("{corrupt-json"), "corrupt JSON save returns false")
	require(study.save_load_status == "recovered" and study.mural_placements.is_empty() and not study.mural_banner_mesh.visible, "corrupt JSON resets cleanly to recovered defaults")
	require(not study.apply_save_envelope("{\"schema\":\"wrong\",\"version\":1}"), "wrong schema save rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":2,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{}}"), "wrong integer version rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1.5,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{}}"), "fractional version rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":[]}"), "non-dictionary placements rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"moon\":{\"col\":0,\"row\":0}}}"), "unknown motif key rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"sun\":{\"col\":1.7,\"row\":0}}}"), "fractional cell coordinate rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"sun\":{\"col\":1,\"row\":0},\"wave\":{\"col\":1,\"row\":0}}}"), "duplicate cell collision in save rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"sun\":{\"col\":99,\"row\":0}}}"), "out-of-bounds saved cell rejected cleanly")

	study.overview()
	var street_screen: Vector2 = study.camera.unproject_position(Vector3(45.0, 0.0, -7.2))
	require(study.handle_scene_tap(street_screen), "tapping projected street point starts route")
	require(not study.current_path.is_empty(), "street tap produces walkable path")

	study.overview()
	require(study.occluded_buildings.is_empty() and study.selected_neighbor == -1 and not study.mural_panel.visible, "overview clears cutaway, neighbor selection, and mural panel")
	for i in range(58):
		require(study.meshes[i].material_override == study.building_materials[i], "overview restores solid neutral building materials")

	for size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		root.size = size
		await process_frame
		await process_frame
		await process_frame
		await process_frame
		# Refit must happen on resize itself, not only by a manual test call.
		var bounds: Rect2 = study.projected_bounds()
		var top: float = study.info.get_parent().get_parent().get_global_rect().end.y
		var bottom: float = study.controls.get_global_rect().position.y
		print("FIT_CHECK ", size, " bounds=", bounds, " top=", top, " bottom=", bottom)
		require(bounds.position.x >= 11 and bounds.end.x <= size.x - 11, "overview preserves all footprint edges horizontally")
		require(bounds.position.y >= top and bounds.end.y <= bottom, "overview stays between UI panels")
		for control in study.controls.get_children():
			var r: Rect2 = control.get_global_rect()
			require(r.size.x >= 44 and r.size.y >= 44, "44px minimum controls")
			require(r.position.x >= 0 and r.end.x <= size.x, "buttons within viewport")
			require(r.position.y >= 0 and r.end.y <= size.y, "buttons vertically visible")
		var fitted: float = study.view_size
		study.zoom(1.25)
		require(study.view_size > fitted, "Zoom out from mobile overview must zoom out")
		study.zoom(0.8)
		require(is_equal_approx(study.view_size, fitted), "paired zoom restores fitted size")
		var next: Button = study.controls.get_child(2)
		next.grab_focus()
		require(next.has_focus(), "keyboard focus available")
		var previous_index: int = study.selected
		var accept := InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = true
		Input.parse_input_event(accept)
		await process_frame
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = false
		Input.parse_input_event(accept)
		await process_frame
		require(study.selected == (previous_index + 1) % 58, "ui_accept press/release activates focused button")
		var walk_btn: Button = study.controls.get_child(5)
		walk_btn.grab_focus()
		require(walk_btn.has_focus(), "Walk to neighbor button focus available")
		var prev_neighbor: int = study.selected_neighbor
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = true
		Input.parse_input_event(accept)
		await process_frame
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = false
		Input.parse_input_event(accept)
		await process_frame
		var expected_neighbor: int = 0 if prev_neighbor < 0 else (prev_neighbor + 1) % study.neighbors.size()
		require(study.selected_neighbor == expected_neighbor and (not study.current_path.is_empty() or study.arrived_neighbor == expected_neighbor), "ui_accept on Walk to neighbor activates neighbor route")
		study.clear_mural_board()
		study.show_mural_panel(true)
		await process_frame
		await process_frame
		require(study.mural_buttons.size() == 8, "MuralPanel has all 8 interactive buttons")
		var mp_rect: Rect2 = study.mural_panel.get_global_rect()
		require(mp_rect.position.x >= 0 and mp_rect.end.x <= size.x and mp_rect.position.y >= top - 2 and mp_rect.end.y <= bottom + 2, "mural panel fits cleanly between header and bottom controls")
		for m_btn in study.mural_buttons:
			var mr: Rect2 = m_btn.get_global_rect()
			require(mr.size.x >= 44 and mr.size.y >= 44, "44px minimum mural panel buttons")
			require(mr.position.x >= 0 and mr.end.x <= size.x and mr.position.y >= 0 and mr.end.y <= size.y, "mural buttons within viewport")
		study.mural_sun_btn.grab_focus()
		require(study.mural_sun_btn.has_focus(), "mural Sun button focus available")
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = true
		Input.parse_input_event(accept)
		await process_frame
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = false
		Input.parse_input_event(accept)
		await process_frame
		require(study.mural_placements.has("sun"), "ui_accept on mural Sun button places Sun motif")
		study.place_mural_motif("wave", 3, 1)
		study.place_mural_motif("rise", 5, 2)
		study.talk_with_celeste()
		await process_frame
		await process_frame
		var header_end_y: float = study.header_panel.get_global_rect().end.y
		var mural_pos_y: float = study.mural_panel.get_global_rect().position.y
		var mural_end_y: float = study.mural_panel.get_global_rect().end.y
		var controls_pos_y: float = study.controls.get_global_rect().position.y
		require(header_end_y <= mural_pos_y and mural_end_y <= controls_pos_y, "3-line Celeste dialogue header, MuralPanel, and bottom controls do not overlap at %s" % str(size))
		study.overview()
	study.clear_godot_save()
	if "--force-failure" in OS.get_cmdline_user_args():
		require(false, "harness failure sentinel")
	if failed:
		print("GODOT_STUDY_FAIL")
		quit(1)
	else:
		print("GODOT_STUDY_PASS:58 meshes, measured heights, collision/courtyards, walking/sliding, 5 neighbors, Celeste portable mural, save/reload, cutaway, 44px and ui_accept at 1100/390/320")
		quit(0)


