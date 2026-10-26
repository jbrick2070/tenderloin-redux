extends SceneTree
var failed := false
var pinch_test_contacts: Dictionary = {}

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var save_arg := ""
	var settings_arg := ""
	for arg in args:
		if arg.begins_with("--godot-save-path="): save_arg=arg.trim_prefix("--godot-save-path=")
		if arg.begins_with("--godot-settings-path="): settings_arg=arg.trim_prefix("--godot-settings-path=")
	var save_prefix := "user://godot_block_save_test_"
	var settings_prefix := "user://godot_block_settings_test_"
	var nonce := save_arg.trim_prefix(save_prefix).trim_suffix(".json")
	var safe: bool=save_arg.begins_with(save_prefix) and settings_arg==settings_prefix+nonce+".json" and save_arg.ends_with(".json") and nonce.split("_").size()==2 and nonce.replace("_","").is_valid_int()
	if not args.has("--test-suite") or not safe or args.find("--godot-save-path="+save_arg)>args.find("--test-suite") or args.find("--godot-settings-path="+settings_arg)>args.find("--test-suite"):
		push_error("study_test.gd requires unique explicit save/settings overrides AND --test-suite BEFORE scene creation; use npm godot:test")
		quit(1)
		return
	call_deferred("run")

func require(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		push_error(message)

func make_synthetic_wav_bytes(duration_sec: float = 0.35, freq_hz: float = 330.0, sample_rate: int = 22050) -> PackedByteArray:
	var sr := clampi(sample_rate, 8000, 48000)
	var num_samples := maxi(64, int(round(duration_sec * float(sr))))
	var data_size := num_samples * 2
	var buf := PackedByteArray()
	buf.resize(44 + data_size)
	buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46
	buf.encode_u32(4, 36 + data_size)
	buf[8] = 0x57; buf[9] = 0x41; buf[10] = 0x56; buf[11] = 0x45
	buf[12] = 0x66; buf[13] = 0x6D; buf[14] = 0x74; buf[15] = 0x20
	buf.encode_u32(16, 16)
	buf.encode_u16(20, 1)
	buf.encode_u16(22, 1)
	buf.encode_u32(24, sr)
	buf.encode_u32(28, sr * 2)
	buf.encode_u16(32, 2)
	buf.encode_u16(34, 16)
	buf[36] = 0x64; buf[37] = 0x61; buf[38] = 0x74; buf[39] = 0x61
	buf.encode_u32(40, data_size)
	for i in range(num_samples):
		var t := float(i) / float(sr)
		var s := int(round(sin(TAU * freq_hz * t) * 14000.0))
		buf.encode_s16(44 + i * 2, clampi(s, -32767, 32767))
	return buf

func run() -> void:
	root.size = Vector2i(1100, 760)
	var study = load("res://main.tscn").instantiate()
	if study == null or study.get_script() == null:
		print("GODOT_STUDY_FAIL: main.gd failed to compile or attach")
		quit(1)
		return
	root.add_child(study)
	var expected_save := ""
	var expected_settings := ""
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--godot-save-path="): expected_save=arg.trim_prefix("--godot-save-path=")
		if arg.begins_with("--godot-settings-path="): expected_settings=arg.trim_prefix("--godot-settings-path=")
	require(study.save_path==expected_save and study.settings_path==expected_settings,"formal suite uses exact explicit unique test save AND settings paths before test mutations")
	if failed: quit(1); return
	print("GODOT_NATIVE_ISOLATION_PASS:",study.save_path," ",study.settings_path)
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	await preload("res://tests/before_streets_checks.gd").verify(self,study,true)
	# Compare indexed queries to the original linear geometry across actual bounds and bucket edges.
	require(not study.walk_building_bins.is_empty(), "conservative building lookup is ready before walking")
	require(study.WALK_CLEARANCE_M + study.WALK_CELL_EXTRA_CLEARANCE_M <= study.WALK_BUILDING_INDEX_CLEARANCE_M, "A* clearance uses the indexed broad phase")
	var courtyard_sample_count := 0
	var spatial_samples: Array[Vector2] = [Vector2(1000000, -1000000)]
	for rect in study.current_building_rects:
		spatial_samples.append(rect.get_center())
		spatial_samples.append(rect.position)
		spatial_samples.append(rect.end)
		spatial_samples.append(rect.position - Vector2(0.7, 0.7))
		spatial_samples.append(rect.end + Vector2(0.7, 0.7))
		var expanded_rect: Rect2 = rect.grow(study.WALK_BUILDING_INDEX_CLEARANCE_M)
		var low_bin: Vector2i = study.walk_building_bin(expanded_rect.position)
		var high_bin: Vector2i = study.walk_building_bin(expanded_rect.end)
		for bx in range(low_bin.x, high_bin.x + 2):
			var edge_x: float = bx * study.WALK_BUILDING_BIN_M
			if edge_x >= expanded_rect.position.x and edge_x <= expanded_rect.end.x:
				spatial_samples.append(Vector2(edge_x - 0.0001, rect.get_center().y))
				spatial_samples.append(Vector2(edge_x + 0.0001, rect.get_center().y))
		for by in range(low_bin.y, high_bin.y + 2):
			var edge_y: float = by * study.WALK_BUILDING_BIN_M
			if edge_y >= expanded_rect.position.y and edge_y <= expanded_rect.end.y:
				spatial_samples.append(Vector2(rect.get_center().x, edge_y - 0.0001))
				spatial_samples.append(Vector2(rect.get_center().x, edge_y + 0.0001))
	for building in study.current_buildings:
		for polygon in building.polygons:
			for hole_i in range(1, polygon.rings.size()):
				var ring_points := PackedVector2Array()
				for vertex in polygon.rings[hole_i]:
					ring_points.append(Vector2(vertex[0], vertex[1]))
				var triangle_ids: PackedInt32Array = Geometry2D.triangulate_polygon(ring_points)
				require(triangle_ids.size() >= 3, "actual courtyard ring supplies an interior sample")
				if triangle_ids.size() >= 3:
					var hole_point: Vector2 = (ring_points[triangle_ids[0]] + ring_points[triangle_ids[1]] + ring_points[triangle_ids[2]]) / 3.0
					require(study.is_point_in_ring(hole_point, polygon.rings[hole_i]), "courtyard oracle point lies inside its actual inner ring")
					spatial_samples.append(hole_point)
					courtyard_sample_count += 1
	require(courtyard_sample_count > 0, "geometry parity includes real courtyard interior samples")
	for key in study.walk_building_bins.keys():
		var boundary: Vector2 = Vector2(key) * study.WALK_BUILDING_BIN_M
		spatial_samples.append(boundary)
		spatial_samples.append(boundary - Vector2(0.0001, 0.0001))
		spatial_samples.append(boundary + Vector2(0.0001, 0.0001))
	for pt in spatial_samples:
		require(study.building_containing_point(pt) == reference_building_containing_point(study, pt), "indexed containment preserves polygon/hole and ordered-building results")
		for clearance in [0.1, 0.7, 1.0, 1.01]:
			require(study.min_wall_distance(pt, clearance) == reference_min_wall_distance(study, pt, clearance), "indexed clearance preserves finite-cutoff results including fallback")
	for pt in [Vector2.ZERO, study.blackhawk_xz(), Vector2(1000, -1000)]:
		require(study.min_wall_distance(pt) == reference_min_wall_distance(study, pt), "unbounded wall distance retains its linear fallback")
	study.cell_walkable_cache[Vector2i(1000000, 1000000)] = false
	study.rebuild_walk_building_bins()
	require(study.cell_walkable_cache.is_empty(), "rebuilding geometry lookup invalidates cell walkability cache")
	print("SPATIAL_PARITY_CHECK samples=", spatial_samples.size(), " finite_cutoffs=4 unbounded_samples=3 courtyard_samples=", courtyard_sample_count)
	require(study.startup_story_pending and study.is_story_card_visible(), "real startup presents Start before accepting")
	require(not study.music_playing, "music waits for startup acceptance instead of autoplaying during load")
	root.size = Vector2i(390, 667)
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	require(study.startup_story_pending and study.is_story_card_visible() and study.music_toggle_btn.disabled, "resizing startup preserves the Start contract and music lock")
	# Short-screen chapters keep their real Start/Continue target reachable.
	var short_story_save: String = JSON.stringify(study.build_save_envelope())
	var short_story_pos: Vector3 = study.player.position
	var short_story_target: Vector3 = study.target
	var short_story_unlocked: bool = study.reward_audio_unlocked
	var changed_scrolled_chapters := 0
	for story_size in [Vector2i(640, 360), Vector2i(667, 375), Vector2i(844, 390), Vector2i(800, 480), Vector2i(320, 568), Vector2i(320, 667), Vector2i(1100, 760), Vector2i(560, 360), Vector2i(599, 360), Vector2i(520, 360), Vector2i(559, 360)]:
		root.size = story_size
		await process_frame
		await process_frame
		for chapter in study.STORY_CHAPTERS:
			study.show_story_card(chapter, true)
			await process_frame
			await process_frame
			var viewport_rect := Rect2(Vector2.ZERO, Vector2(story_size))
			var card_rect: Rect2 = study.story_card.get_global_rect()
			var start_rect: Rect2 = study.story_continue_btn.get_global_rect()
			require(viewport_rect.encloses(card_rect) and card_rect.encloses(start_rect) and start_rect.size.y >= 44 and start_rect.size.x >= 44, "every chapter has a complete on-screen44px Start at %s" % story_size)
			require(card_rect.position.y >= study.header_panel.get_global_rect().end.y and study.story_body_label.text == String(chapter.intro) and study.story_body_label.get_theme_font_size("normal_font_size") == 16, "chapter reading preserves the full original text, font and compact header")
			var reading_scroll: VScrollBar = study.story_body_label.get_v_scroll_bar()
			if reading_scroll.max_value > reading_scroll.page + 1:
				study.story_body_label.scroll_to_line(study.story_body_label.get_line_count() - 1)
				await process_frame
				require(is_equal_approx(reading_scroll.value, reading_scroll.max_value - reading_scroll.page), "final chapter line remains reachable in its bounded body")
				var last_read: float = reading_scroll.value
				study.layout_story_card()
				study.layout_story_card()
				await process_frame
				require(is_equal_approx(reading_scroll.value, last_read), "unchanged chapter layout preserves reading position")
				var next_chapter: Dictionary = study.STORY_CHAPTERS[(study.STORY_CHAPTERS.find(chapter) + 1) % study.STORY_CHAPTERS.size()]
				study.show_story_card(next_chapter, true)
				await process_frame
				await process_frame
				require(study.story_body_label.text == String(next_chapter.intro) and is_zero_approx(reading_scroll.value), "a different chapter opens at its first line after the previous one was scrolled")
				if reading_scroll.max_value > reading_scroll.page + 1:
					changed_scrolled_chapters += 1
			study.show_story_card(chapter, true)
			await process_frame
			require(is_zero_approx(reading_scroll.value), "a newly opened chapter starts at its first line")
	require(changed_scrolled_chapters > 0, "changed-text scroll reset is tested with both chapter bodies overflowing")
	# Real reading keys and a finger drag on a forced-scrolling production intro.
	root.size = Vector2i(640, 360)
	study.show_story_card(study.STORY_CHAPTERS[0], true)
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	var story_scroll: VScrollBar = study.story_body_label.get_v_scroll_bar()
	require(story_scroll.max_value > story_scroll.page + 12, "short landscape fixture actually needs scrolling")
	short_story_target = study.target # Overview resize fitting is intentional; gestures must preserve the settled pose.
	study.story_body_label.grab_focus()
	await process_frame
	require(study.story_body_label.has_focus(), "reading fixture settles pending resize/Start focus before key input")
	study.story_continue_btn.grab_focus() # PageDown should start reading without a prerequisite text click.
	var page_down := InputEventKey.new()
	page_down.keycode = KEY_PAGEDOWN
	page_down.pressed = true
	Input.parse_input_event(page_down)
	await process_frame
	page_down.pressed = false
	Input.parse_input_event(page_down)
	await process_frame
	require(study.story_reader_has_focus() and story_scroll.value > 0, "PageDown begins reading from Start focus")
	story_scroll.value = 0.0
	var reading_arrow := InputEventKey.new()
	reading_arrow.keycode = KEY_DOWN
	reading_arrow.pressed = true
	Input.parse_input_event(reading_arrow)
	await process_frame
	reading_arrow.pressed = false
	Input.parse_input_event(reading_arrow)
	await process_frame
	require(study.startup_story_pending and study.is_story_card_visible() and not study.music_playing and story_scroll.value > 0, "reader-focused Down independently scrolls without accepting startup or playing music")
	story_scroll.value = 0.0
	var body_center: Vector2 = study.story_body_label.get_global_rect().get_center()
	var read_touch := InputEventScreenTouch.new()
	read_touch.index = 0
	read_touch.position = body_center
	read_touch.pressed = true
	Input.parse_input_event(read_touch)
	await process_frame
	var read_drag := InputEventScreenDrag.new()
	read_drag.index = 0
	read_drag.position = body_center - Vector2(0, 12)
	read_drag.relative = Vector2(0, -12)
	Input.parse_input_event(read_drag)
	await process_frame
	read_touch.pressed = false
	read_touch.position = read_drag.position
	Input.parse_input_event(read_touch)
	await process_frame
	require(is_equal_approx(story_scroll.value, 12.0) and study.startup_story_pending and not study.music_playing, "real finger drag reads once without accepting startup")
	require(study.player.position == short_story_pos and study.target == short_story_target and JSON.stringify(study.build_save_envelope()) == short_story_save, "chapter reading changes neither camera, walking nor saved progress")
	var chapter_notice: String = study.last_a11y_announcement
	for burst_size in [Vector2i(844, 390), Vector2i(640, 360), Vector2i(667, 375)]:
		root.size = burst_size
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	require(not study.layout_refit_pending and study.story_body_label.has_focus() and study.startup_story_pending and not study.music_playing and study.music_toggle_btn.disabled, "coalesced chapter resize preserves reading focus, pending consent and the music lock")
	require(study.last_a11y_announcement == chapter_notice, "chapter resize preserves the full chapter announcement")
	require(study.reward_audio_unlocked and not study.reward_audio_player.playing, "reading is real effect-unlock input but never plays a reward or music")
	var reader_accept := InputEventKey.new()
	reader_accept.keycode = KEY_SPACE
	reader_accept.pressed = true
	Input.parse_input_event(reader_accept)
	await process_frame
	reader_accept.pressed = false
	Input.parse_input_event(reader_accept)
	await process_frame
	require(not study.startup_story_pending and study.music_playing, "Space remains explicit startup acceptance even from the reader")
	study.stop_music_playback()
	study.show_story_card(study.current_chapter(), true)
	study.reward_audio_unlocked = short_story_unlocked
	study.story_continue_btn.grab_focus()
	root.size = Vector2i(390, 667)
	await process_frame
	await process_frame
	var initial_start_save: String = JSON.stringify(study.build_save_envelope())
	var initial_start_position: Vector3 = study.player.position
	var initial_start_key := InputEventKey.new()
	initial_start_key.keycode = KEY_SPACE
	initial_start_key.pressed = true
	study._unhandled_input(initial_start_key)
	require(not study.in_overview and study.view_size == 45.0 and study.player.position == initial_start_position and JSON.stringify(study.build_save_envelope()) == initial_start_save, "real startup keyboard acceptance frames without moving or mutating progress")
	require(study.music_playing and study.music_mode == "sketch" and study.music_volume == 0.70 and study.music_play_btn.text == "Pause Groove", "startup acceptance starts the original sketch at the existing volume")
	require(study.last_a11y_announcement.begins_with("You're here"), "startup music preserves orientation as the final announcement")
	study.stop_music_playback()
	study.show_story_card(study.current_chapter())
	study.continue_story()
	study.frame_player_for_walking()
	require(not study.music_playing and study.music_play_btn.text == "Play Groove", "later chapter Continue and Find Me preserve the player pause")
	study.show_story_card(study.current_chapter(), true)
	var startup_escape := InputEventKey.new()
	startup_escape.keycode = KEY_ESCAPE
	startup_escape.pressed = true
	study._unhandled_input(startup_escape)
	require(not study.music_playing and not study.startup_story_pending, "Escape dismisses startup silently without pretending to be an audio activation")
	study.show_story_card(study.current_chapter(), true)
	var startup_walk := InputEventKey.new()
	startup_walk.keycode = KEY_W
	startup_walk.pressed = true
	study._input(startup_walk)
	require(study.music_playing and not study.startup_story_pending, "W accepts startup and starts default music")
	study.stop_music_playback()
	study.show_story_card(study.current_chapter(), true)
	study.story_continue_btn.grab_focus()
	var startup_arrow := InputEventKey.new()
	startup_arrow.keycode = KEY_DOWN
	startup_arrow.pressed = true
	study._input(startup_arrow)
	require(study.music_playing and not study.startup_story_pending, "Down from Start focus retains quick walking acceptance")
	study.stop_music_playback()
	study.show_story_card(study.current_chapter(), true)
	study.update_music_ui()
	var tap_start_pos: Vector3 = study.player.position
	var tap_start_save: String = JSON.stringify(study.build_save_envelope())
	study.handle_scene_tap(Vector2(4, 400))
	require(study.music_playing and not study.startup_story_pending and study.player.position == tap_start_pos and JSON.stringify(study.build_save_envelope()) == tap_start_save, "first street tap accepts startup without routing in the pre-start camera view")
	study.stop_music_playback()
	require(study.lidar_additions[2].id == "osm:way/1072899109" and study.occluded_additions.has(2) and study.addition_meshes[2].material_override == study.cutaway_material, "Serif addition fades instead of hiding the starting player behind its roof")
	study.overview()
	require(study.occluded_additions.is_empty() and study.addition_meshes[2].material_override == study.addition_materials[2], "overview restores addition materials")
	root.size = Vector2i(1100, 760)
	await process_frame
	await process_frame
	require(study.meshes.size() == 58, "58 actual building meshes")
	require(study.wider_meshes.size() == 130, "130 wider Tenderloin building meshes")
	require(study.all_buildings.size() == 188, "188 total measured Tenderloin building footprints")
	for w in range(study.wider_meshes.size()):
		var wb: Dictionary = study.data.wider_buildings[w]
		var wmesh: MeshInstance3D = study.wider_meshes[w]
		require(wmesh.get_node_or_null("StaticBody3D") != null, "wider building mesh has StaticBody3D collision")
		require(is_equal_approx(wmesh.get_aabb().size.y, wb.height_m), "wider mesh height must be measured metres")
	require(study.district_boundary_node != null and study.district_boundary_node.visible, "3D DistrictBoundaryRibbon node exists and starts visible")
	require(study.west_intersection_nodes.size() == 3, "3 west intersection signpost nodes exist (Jones, Leavenworth, Hyde)")
	require(study.west_intersection_nodes[0].name == "WestIntersection_jones" and study.west_intersection_nodes[1].name == "WestIntersection_leavenworth" and study.west_intersection_nodes[2].name == "WestIntersection_hyde", "west intersection signposts match Jones, Leavenworth, and Hyde")
	require(study.history_stop_nodes.size() == 2 and study.history_beacon_meshes.size() == 2, "2 real-place history stop 3D nodes and beacons exist")
	for h_id in ["comptons", "blackhawk"]:
		var h_xz: Vector2 = study.history_stop_xz(h_id)
		var h_rec: Dictionary = study.get_history_stop_record(h_id)
		var h_pt: Array = h_rec.get("pos", [])
		require(h_pt.size() == 2 and is_equal_approx(h_xz.x, float(h_pt[0])) and is_equal_approx(h_xz.y, float(h_pt[1])), "history_stop_xz(%s) matches authoritative data.history_stops[].pos" % h_id)
		require(study.building_containing_point(h_xz) == "", "history stop %s is outside all 188 building footprints" % h_id)
		require(study.min_wall_distance(h_xz) >= 3.25, "history stop %s has >= 3.25m wall clearance" % h_id)
		require(study.is_walkable_point(h_xz), "history stop %s position is walkable" % h_id)
	require(study.controls.get_child_count() == 6, "6 responsive control buttons including Walk to neighbor")
	require(is_equal_approx(study.player_height_m(), 1.72), "player model is 1.72 metres before the existing presentation scale")
	var grounded_people: Array[Node3D] = [study.player_visual]
	for neighbor in study.neighbor_nodes:
		grounded_people.append(neighbor)
	require(study.find_children("ContactShadow", "MeshInstance3D", true, false).size() == 6, "only player and five ground-level neighbors receive contact shadows")
	for person in grounded_people:
		var contact := person.get_node("ContactShadow") as MeshInstance3D
		var contact_mat := contact.material_override as StandardMaterial3D
		require(not contact_mat.no_depth_test and not contact_mat.emission_enabled and contact_mat.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA, "contact shadows respect scene depth and never glow")
		require(contact.global_position.y >= 0.07 and contact.global_position.y < 0.09, "contact shadow clears the route ribbon and curb with a visible margin")
		require(contact_mat.render_priority > study.light_pool_material.render_priority, "contact shadows composite after additive evening pools")
		var shadow_colors: PackedColorArray = contact.mesh.surface_get_arrays(0)[Mesh.ARRAY_COLOR]
		var min_alpha := 1.0
		var max_alpha := 0.0
		for color in shadow_colors:
			min_alpha = minf(min_alpha, color.a)
			max_alpha = maxf(max_alpha, color.a)
		require(max_alpha > 0.3 and is_zero_approx(min_alpha), "contact shadow fades from dark center to transparent edge")
		var ring := person.get_node("GroundRing") as MeshInstance3D
		var ring_vertices: PackedVector3Array = ring.mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
		for vertex in ring_vertices:
			require(Vector2(vertex.x, vertex.z).length() >= 0.50, "hollow locator leaves pavement and shoes visible inside")
	var player_colliders: Array[Node] = study.player.find_children("*", "CollisionShape3D", false, false)
	require(player_colliders.size() == 1, "presentation marks add no player collision")
	if player_colliders.size() == 1:
		var player_collider := (player_colliders[0] as CollisionShape3D).shape as CylinderShape3D
		require(player_collider != null and is_equal_approx(player_collider.radius, study.PLAYER_RADIUS_M) and is_equal_approx(player_collider.height, study.PLAYER_HEIGHT_M), "graphics preserve physical character dimensions")
	var grounding_shadow := study.player_visual.get_node("ContactShadow") as MeshInstance3D
	study.player_visual.remove_child(grounding_shadow)
	require(study.get_a11y_status_snapshot().player_grounding.shadow_y == null, "missing decorative shadow does not abort accessibility status")
	study.player_visual.add_child(grounding_shadow)
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
	var s_xz: Vector2 = study.speaker_xz()
	require(study.speaker_node != null and study.speaker_cone_mesh != null and study.speaker_beacon_mesh != null, "3D RookSpeaker node, cone, and beacon meshes exist")
	require(study.speaker_node.get_node_or_null("StaticBody3D") != null, "RookSpeaker has StaticBody3D collision")
	require(study.building_containing_point(s_xz) == "", "RookSpeaker is outside all 58 building footprints")
	var s_nb: Dictionary = study.nearest_building_info(s_xz)
	require(s_nb.id == "osm:way/1072899109" and study.min_wall_distance(s_xz) >= 5.5, "RookSpeaker is >= 5.5m clear of the nearest standing building (Serif, which replaced 2010 footprint 201006.0004056)")
	for s_corner in study.speaker_corner_points():
		require(study.building_containing_point(s_corner) == "" and study.min_wall_distance(s_corner) >= 2.35, "all 4 RookSpeaker corners are outside all building footprints with >= 2.35m wall clearance")
	require(not study.is_walkable_point(s_xz), "RookSpeaker footprint center is solid/non-walkable")
	require(study.is_walkable_point(study.speaker_stand_xz()), "RookSpeaker stand position on Turk Street sidewalk is walkable")
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
	var grounding_save: String = JSON.stringify(study.build_save_envelope())
	var start_z: float = study.player_xz().y
	for _step in range(25):
		study.walk_step(Vector2(0.0, -1.0), 0.1)
		require(study.building_containing_point(study.player_xz()) == "", "walking north into wall never enters building interior")
		require(study.min_wall_distance(study.player_xz()) >= study.WALK_CLEARANCE_M - 1e-3, "wall clearance maintained during collision")
	require(study.player_xz().y < start_z and study.player_xz().y > -13.0, "player approaches north wall then stops outside footprint")
	var north_heading: float = study.player_visual.rotation.y

	# Test angled street wall-sliding eastward along Turk Street
	study.player.position = study.PLAYER_START
	var before_east_x: float = study.player_xz().x
	for _step in range(20):
		study.walk_step(Vector2(1.0, 0.0), 0.15)
		study.animate_person_node(study.player_visual, float(_step) * 0.7, 1.0, 0.0)
		require(Vector2(grounding_shadow.global_position.x, grounding_shadow.global_position.z).is_equal_approx(study.player_xz()), "contact shadow follows real wall-sliding movement")
		require(study.building_containing_point(study.player_xz()) == "", "eastward slide stays outside all footprints")
	require(study.player_xz().x > before_east_x + 8.0, "eastward walk slides smoothly along angled Turk sidewalk")
	require(not is_equal_approx(study.player_visual.rotation.y, north_heading), "grounding probe exercises a real heading change")
	require(grounding_shadow.position.is_equal_approx(Vector3(0.0, study.CHARACTER_SHADOW_GROUND_Y / study.CHARACTER_VISUAL_SCALE, 0.0)), "walking animation leaves the contact mark centered at ground height")
	require(JSON.stringify(study.build_save_envelope()) == grounding_save, "character grounding adds no save state")
	study.animate_person_node(study.player_visual, 0.0, 0.0, 0.0)

	# Test out-of-bounds rejection and nearest walkable snapping
	require(not study.is_walkable_point(Vector2(-500.0, -500.0)), "distant point outside bounds is not walkable")
	var interior_pt := Vector2(21.55, -13.39)
	require(study.building_containing_point(interior_pt) != "", "test point is inside a building footprint")
	var snapped: Vector2 = study.nearest_walkable_point(interior_pt)
	require(study.is_walkable_point(snapped) and study.building_containing_point(snapped) == "", "interior point snaps to walkable sidewalk")

	# Stop works for ordinary routes and cancels deferred conversations as well.
	for stop_case in ["neighbor", "mural", "celeste", "celeste_t", "rook", "street"]:
		study.player.position = study.PLAYER_START
		match stop_case:
			"neighbor": study.walk_to_neighbor(3)
			"mural":
				study.walk_to_mural()
				study.pending_celeste_talk = true
			"celeste", "celeste_t":
				var start_talk := InputEventKey.new()
				start_talk.keycode = KEY_E
				start_talk.pressed = true
				study._unhandled_input(start_talk)
			"rook": study.request_rook_soundcheck()
			"street": study.walk_to_point(study.neighbor_xz(4))
		require(not study.current_path.is_empty() and study.walk_control.text == "Stop Walking", "%s route exposes the stop control" % stop_case)
		if stop_case in ["mural", "celeste", "celeste_t"]:
			require(study.pending_celeste_talk, "Celeste stop fixture has a deferred conversation")
		if stop_case == "rook":
			require(study.pending_rook_talk, "Rook stop fixture has a deferred soundcheck")
		# T prefers a nearby neighbor; move clear of Bea before testing Celeste retry.
		study.advance_walk(4.0 if stop_case == "celeste_t" else 0.1)
		if stop_case == "celeste_t":
			require(study.nearest_neighbor_within(8.0) < 0, "T retry fixture is outside the nearby-conversation radius")
		var stop_position: Vector3 = study.player.position
		var stop_save: String = JSON.stringify(study.build_save_envelope())
		study.activate_walk_control()
		require(study.current_path.is_empty() and study.route_mesh.mesh == null and not study.pending_celeste_talk and not study.pending_rook_talk and not study.walking_to_mural and not study.walking_to_speaker, "stop clears the route and deferred actions")
		require(not study.advance_walk(2.0) and study.player.position.is_equal_approx(stop_position), "stopped route cannot keep moving or arrive later")
		require(JSON.stringify(study.build_save_envelope()) == stop_save and study.walk_control.text == guided_caption(study), "stopping preserves progress and restores the normal action")
		if stop_case == "rook":
			require(study.request_rook_soundcheck() and not study.current_path.is_empty() and study.pending_rook_talk, "soundcheck requested after Stop starts a fresh route")
		elif stop_case in ["celeste", "celeste_t"]:
			var retry_talk := InputEventKey.new()
			retry_talk.keycode = KEY_T if stop_case == "celeste_t" else KEY_E
			retry_talk.pressed = true
			study._unhandled_input(retry_talk)
			require(not study.current_path.is_empty() and study.pending_celeste_talk and study.selected_neighbor == study.celeste_index, "%s after stopping Celeste starts a fresh deferred route" % stop_case)
		elif stop_case == "neighbor":
			study.activate_walk_control()
			require(study.selected_neighbor == 3 and not study.current_path.is_empty(), "primary after Stop resumes the deliberately chosen Dez route")
		study.stop_walking()
		if stop_case == "neighbor":
			var cycle := InputEventKey.new(); cycle.keycode=KEY_N; cycle.pressed=true
			study._unhandled_input(cycle)
			require(study.selected_neighbor==4 and not study.current_path.is_empty(),"N retains deliberate next-resident cycling after Stop")
			study.stop_walking()
	study.overview()

	# Detached landmark views return to the player only on a new walking intent.
	for resume_case in ["manual", "neighbor", "mural", "speaker", "history", "street"]:
		study.player.position = study.PLAYER_START
		study.stop_walking()
		study.focus_history_stop_camera("blackhawk")
		study.camera_yaw = 0.3
		study.camera_pitch_scale = 1.1
		var resume_save: String = JSON.stringify(study.build_save_envelope())
		var resume_pos: Vector3 = study.player.position
		match resume_case:
			"manual": study.walk_step(Vector2.RIGHT, 0.05)
			"neighbor": require(study.walk_to_neighbor(4), "detached neighbor route succeeds")
			"mural": require(study.walk_to_mural(), "detached mural route succeeds")
			"speaker": require(study.walk_to_speaker(), "detached speaker route succeeds")
			"history": require(study.walk_to_black_hawk(), "detached history route succeeds")
			"street": require(study.walk_to_point(study.neighbor_xz(4)), "detached street route succeeds")
		require(study.following_player and study.view_size == 45.0 and study.target.distance_to(Vector3(study.player.position.x, 1.0, study.player.position.z)) < 0.01, "%s returns inspection to close player framing" % resume_case)
		require(study.camera_yaw == 0.3 and study.camera_pitch_scale == 1.1, "resume preserves camera-relative heading and pitch")
		require(study.player.position.distance_to(resume_pos) <= 0.25 and JSON.stringify(study.build_save_envelope()) == resume_save, "camera transition neither teleports nor changes progress")
		study.view_size = 70.0
		study.walk_step(Vector2.RIGHT, 0.01)
		require(study.view_size == 70.0, "manual follow preserves deliberate wide zoom")
		require(study.walk_to_neighbor(4) and study.view_size == 70.0, "route follow preserves deliberate wide zoom")
	study.view_size = 400.0
	study.walk_step(Vector2.RIGHT, 0.01)
	require(study.view_size == 75.0, "existing extreme follow zoom guard remains")
	for map_kind in ["block", "district"]:
		study.stop_walking()
		if map_kind == "block": study.overview()
		else: study.wide_overview()
		require(study.walk_to_neighbor(4) and study.following_player and study.view_size == 75.0, "unadjusted map resumes at established route scale")
	study.stop_walking()
	study.focus_history_stop_camera("blackhawk")
	var failed_view_target: Vector3 = study.target
	var failed_view_size: float = study.view_size
	require(not study.walk_to_point(Vector2(-350.0, -350.0)), "invalid detached street request fails")
	require(not study.following_player and study.target == failed_view_target and study.view_size == failed_view_size and study.header_details_expanded, "failure preserves inspection and reveals diagnostic")
	require(study.walk_to_neighbor(4) and study.view_size == 45.0, "valid retry after rejection still restores close framing")
	# Isolate an A* start without changing surveyed geometry, then restore its cache.
	study.stop_walking()
	study.player.position = Vector3(study.neighbor_xz(4).x, 0.0, study.neighbor_xz(4).y)
	study.focus_history_stop_camera("blackhawk")
	var saved_resume_cache: Dictionary = study.cell_walkable_cache.duplicate()
	var resume_start: Vector2 = study.nearest_walkable_point(study.player_xz())
	var resume_goal: Vector2 = study.nearest_walkable_point(study.blackhawk_xz())
	require(not study.segment_walkable(resume_start, resume_goal), "failure fixture requires A* routing")
	var resume_cell := Vector2i(int(round(resume_start.x / 2.0)), int(round(resume_start.y / 2.0)))
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			study.cell_walkable_cache[resume_cell + Vector2i(dx, dy)] = false
	var blocked_resume_save: String = JSON.stringify(study.build_save_envelope())
	var blocked_resume_target: Vector3 = study.target
	require(not study.walk_to_point(study.blackhawk_xz()) and study.last_astar_expanded_cells == 1, "isolated A* start exhausts actual path search")
	require(not study.following_player and study.target == blocked_resume_target and study.view_size == 55.0 and study.header_details_expanded, "path search failure preserves detached camera and explains rejection")
	require(JSON.stringify(study.build_save_envelope()) == blocked_resume_save and study.player_xz() == study.neighbor_xz(4), "failed search preserves save and player position")
	study.cell_walkable_cache = saved_resume_cache
	require(study.walk_to_point(study.blackhawk_xz()) and study.following_player and study.view_size == 45.0, "same route retries successfully after search failure")
	study.stop_walking()
	study.set_header_details(false)
	study.overview()

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
		require(study.walk_control.text == guided_caption(study), "arrival restores the ordinary walking action")
		var final_d: float = study.player_xz().distance_to(study.neighbor_xz(i))
		require(final_d <= study.ARRIVAL_DISTANCE_M + 1e-3 and final_d >= 0.70, "arrival stops within <= 1.35m without overlapping neighbor")
		require(study.info.text.contains(study.neighbors[i].name), "arrival updates info with neighbor name")
		if study.neighbors[i].id == "celeste":
			require(study.mural_panel.visible and not study.music_panel.visible, "arriving at Celeste opens portable mural panel and closes music panel")
		if study.neighbors[i].id == "rook":
			require(study.music_panel.visible and not study.mural_panel.visible, "arriving at Rook opens music panel and closes mural panel")
			rook_occluded = not study.occluded_buildings.is_empty()
			for occ_idx in study.occluded_buildings:
				require(study.meshes[occ_idx].material_override == study.cutaway_material, "occluding building uses cutaway material")
				require(is_equal_approx(study.meshes[occ_idx].get_aabb().size.y, study.data.buildings[occ_idx].height_m), "cutaway preserves measured building height")
				var occ_det: Node3D = study.meshes[occ_idx].get_node_or_null(study.ROOFTOP_DETAIL_NODE)
				require(occ_det == null or not occ_det.visible, "cutaway hides the occluding building's rooftop details")
		if study.neighbors[i].id == "thanh":
			thanh_occluded = not study.occluded_buildings.is_empty()
	require(rook_occluded and thanh_occluded, "camera sightline cutaway activates for occluded neighbor locations")
	# Conversations are detached local views; leaving them restores walking framing.
	study.view_size = 70.0
	require(study.walk_to_neighbor(0) and study.view_size == 45.0, "walking after conversation restores close view")
	study.stop_walking()
	for immediate_kind in ["neighbor", "mural", "speaker"]:
		var immediate_pt: Vector2 = study.neighbor_xz(4) if immediate_kind == "neighbor" else (study.mural_stand_xz() if immediate_kind == "mural" else study.speaker_stand_xz())
		study.player.position = Vector3(immediate_pt.x, 0.0, immediate_pt.y)
		study.focus_history_stop_camera("blackhawk")
		var immediate_save: String = JSON.stringify(study.build_save_envelope())
		match immediate_kind:
			"neighbor": require(study.walk_to_neighbor(4) and study.arrived_neighbor == 4 and study.block_panel.visible, "immediate neighbor arrival keeps conversation framing")
			"mural": require(study.walk_to_mural() and study.arrived_mural and study.mural_panel.visible, "immediate mural arrival opens its panel")
			"speaker": require(study.walk_to_speaker() and study.arrived_speaker and study.music_panel.visible, "immediate speaker arrival opens its panel")
		require(study.current_path.is_empty() and study.view_size == 45.0 and JSON.stringify(study.build_save_envelope()) == immediate_save, "repeat immediate arrival preserves progress and local view")
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

	# Test tapping and walking to the 3D RookSpeaker on Turk Street (opens MusicPanel; explicit soundcheck)
	study.clear_godot_save()
	study.pending_rook_talk = true
	study.overview()
	var speaker_screen: Vector2 = study.camera.unproject_position(study.ROOK_SPEAKER_POS + Vector3(0.0, 0.8, 0.0))
	require(study.handle_scene_tap(speaker_screen), "tapping projected 3D RookSpeaker starts route")
	require(study.walking_to_speaker and not study.pending_rook_talk and not study.current_path.is_empty(), "speaker tap sets walking_to_speaker route and clears stale pending_rook_talk")
	var speaker_guard := 0
	while not study.current_path.is_empty() and speaker_guard < 400:
		study.advance_walk(0.2)
		speaker_guard += 1
	require(speaker_guard < 400 and study.arrived_speaker, "player arrives at RookSpeaker within bounded steps")
	require(study.player_xz().distance_to(s_xz) <= 2.0 and not study.is_point_in_speaker_footprint(study.player_xz()), "player stands in front of RookSpeaker outside speaker footprint")
	require(study.music_panel.visible and not study.rook_soundcheck_done, "passive arrival at RookSpeaker opens MusicPanel and waits for explicit soundcheck")
	require(study.request_rook_soundcheck() and study.rook_soundcheck_done and study.speaker_beacon_mesh.visible, "request_rook_soundcheck while at RookSpeaker runs soundcheck and lights 3D beacon")

	# Test deferred KEY_R / Soundcheck button when starting far from Rook
	study.clear_godot_save()
	study.player.position = study.PLAYER_START
	study.overview()
	study.music_rook_btn.pressed.emit()
	require(study.selected_neighbor == study.rook_index and study.pending_rook_talk and not study.rook_soundcheck_done, "Soundcheck: Rook button when away starts walking to Rook and defers soundcheck until arrival")
	study.clear_godot_save()
	study.player.position = study.PLAYER_START
	study.overview()
	var keyr_ev := InputEventKey.new()
	keyr_ev.pressed = true
	keyr_ev.keycode = KEY_R
	study._unhandled_input(keyr_ev)
	require(study.selected_neighbor == study.rook_index and study.pending_rook_talk and not study.rook_soundcheck_done, "KEY_R when away starts walking to Rook and defers soundcheck until arrival")
	var rook_guard := 0
	while not study.current_path.is_empty() and rook_guard < 400:
		study.advance_walk(0.2)
		rook_guard += 1
	require(study.arrived_neighbor == study.rook_index and not study.pending_rook_talk and study.rook_soundcheck_done and study.info.text.contains("Rook:"), "deferred KEY_R soundcheck fires upon arriving at Rook")

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

	# Test procedural stem progression, Bea-only visit persistence, explicit playback, local Suno WAV audition, invalid/corrupt rejection, and save/reload
	study.clear_godot_save()
	require(not study.music_playing and study.music_mode == "sketch", "music starts paused in sketch mode after reset")
	study.set_reward_sounds_enabled(true, false)
	study.reward_audio_unlocked = false
	var reward_wheel := InputEventMouseButton.new()
	reward_wheel.button_index = MOUSE_BUTTON_WHEEL_UP
	reward_wheel.pressed = true
	study._input(reward_wheel)
	study._input(InputEventMouseMotion.new())
	require(not study.reward_audio_unlocked, "wheel and pointer motion cannot unlock sound")
	var reward_before_input: int = study.reward_sound_count
	study.trigger_progress_cue("mural_motif", "test locked cue")
	require(study.reward_sound_count == reward_before_input, "reward effects never play or queue before input")
	var reward_press := InputEventMouseButton.new()
	reward_press.button_index = MOUSE_BUTTON_LEFT
	reward_press.pressed = true
	study._input(reward_press)
	require(study.reward_audio_unlocked and study.reward_sound_count == reward_before_input, "input unlocks future effects without replaying startup cues")
	study.trigger_progress_cue("mural_motif", "test independent cue")
	require(study.reward_sound_count == reward_before_input + 1 and not study.music_playing, "reward sound is admitted with music paused")
	var reward_stream: AudioStreamWAV = study.reward_audio_player.stream
	require(reward_stream.loop_mode == AudioStreamWAV.LOOP_DISABLED and reward_stream.data.size() <= 33076 and reward_stream.get_length() <= 0.75, "reward PCM stays bounded and never loops")
	var reward_peak := 0
	for reward_sample in range(0, reward_stream.data.size(), 2):
		reward_peak = maxi(reward_peak, absi(reward_stream.data.decode_s16(reward_sample)))
	require(reward_peak > 100 and reward_peak < 5000 and reward_stream.data.decode_s16(0) == 0 and absi(reward_stream.data.decode_s16(reward_stream.data.size() - 2)) < 30, "soft reward PCM has audible energy, low peak and smooth endpoints")
	study.suppress_feel_good_burst = true
	study.trigger_progress_cue("mural_motif", "suppressed")
	study.suppress_feel_good_burst = false
	require(study.reward_sound_count == reward_before_input + 1, "suppressed/repeated progress cannot emit reward effects")
	var sound_save_before: String = JSON.stringify(study.build_save_envelope())
	study.set_reward_sounds_enabled(false)
	study.trigger_progress_cue("mural_motif", "muted")
	require(study.reward_sound_count == reward_before_input + 1 and not study.reward_audio_player.playing, "mute prevents and stops reward audio")
	study.set_reward_sounds_enabled(true, false)
	study.load_godot_settings()
	require(not study.reward_sounds_enabled and JSON.stringify(study.build_save_envelope()) == sound_save_before, "mute persists in settings without altering game progress")
	study.clear_godot_settings()
	require(study.reward_sounds_enabled and study.reward_sound_count == reward_before_input + 1, "reset/unmute never queues missed effects")
	require(study.unlocked_stems() == ["bass"], "fresh state starts with 1 stem (bass)")
	study.finish_neighbor_arrival(0)
	require(study.unlocked_stems() == ["bass", "brush"], "visiting Bea unlocks brush stem (2/4 stems)")
	var bea_reloaded = load("res://main.tscn").instantiate()
	root.add_child(bea_reloaded)
	await process_frame
	await process_frame
	require(bea_reloaded.save_load_status == "restored" and bea_reloaded.visited_neighbors.has("bea") and bea_reloaded.unlocked_stems() == ["bass", "brush"], "visiting Bea alone saves visited_neighbors and restores ['bass','brush'] on reload")
	bea_reloaded.queue_free()
	await process_frame
	var line1: String = study.talk_with_celeste()
	var line2: String = study.talk_with_celeste()
	require(study.celeste_talk_count == 2 and line1 != line2, "talking with Celeste advances original portable board dialogue")
	require(study.unlocked_stems() == ["bass", "brush", "chords"], "talking with Celeste unlocks chords stem (3/4 stems)")
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
	require(study.unlocked_stems() == ["bass", "brush", "chords", "lead"], "completing mural unlocks lead stem (4/4 stems)")
	var sun_pos_before: Vector3 = sun_node.position
	study.active_motif = "sun"
	require(study.move_active_motif(1, 0), "move_active_motif shifts Sun to (2,0)")
	require(not sun_node.position.is_equal_approx(sun_pos_before), "moving motif visibly updates 3D motif position on board")
	var canvas_mat_before: StandardMaterial3D = study.mural_canvas_mesh.material_override
	var color_before: Color = canvas_mat_before.albedo_color
	require(study.set_mural_palette("sunset"), "set_mural_palette switches to sunset")
	var canvas_mat_after: StandardMaterial3D = study.mural_canvas_mesh.material_override
	require(canvas_mat_after.albedo_color != color_before, "changing palette updates 3D canvas material color")

	# Test explicit procedural sketch playback, clock progression, volume cycling, and local WAV audition
	var rook_line: String = study.check_sound_with_rook()
	require(rook_line.contains("Rook:") and study.rook_soundcheck_done, "check_sound_with_rook returns Rook dialogue and marks soundcheck done")
	require(study.start_music_playback() and study.music_playing and study.music_mode == "sketch", "start_music_playback starts procedural 80 BPM sketch")
	study.advance_music_clock(0.40)
	require(study.sketch_tick >= 1 and study.sketch_frames_pushed > 0 and study.last_sample_rms > 0.01, "procedural synth advances beat clock and synthesizes non-zero audio waveform")
	var ticks_before: int = study.sketch_tick
	var frames_before: int = study.sketch_frames_pushed
	study.advance_music_clock(0.80)
	require(study.sketch_tick >= ticks_before + 2 and study.sketch_frames_pushed > frames_before, "advance_music_clock advances eighth-note steps and pushes additional synth frames")
	require(is_equal_approx(study.cycle_music_volume(), 1.0), "cycle_music_volume steps from 0.70 to 1.0")
	require(is_equal_approx(study.cycle_music_volume(), 0.35), "cycle_music_volume steps from 1.0 to 0.35")
	require(is_equal_approx(study.cycle_music_volume(), 0.0) and is_equal_approx(study.last_sample_rms, 0.0), "cycle_music_volume steps to 0.0 mute with zero RMS")
	require(is_equal_approx(study.cycle_music_volume(), 0.70), "cycle_music_volume wraps back to 0.70")
	var valid_wav: PackedByteArray = make_synthetic_wav_bytes(0.35, 330.0, 22050)
	require(study.load_local_music_bytes("suno-tl-sketch.wav", valid_wav), "valid synthetic WAV bytes load into local audition player")
	require(study.music_mode == "local" and study.local_music_name == "suno-tl-sketch.wav" and study.music_playing and study.music_error == "", "local WAV audition activates local mode and clears errors")
	var reward_before_local: int = study.reward_sound_count
	study.trigger_progress_cue("mural_motif", "local track independent")
	require(study.reward_sound_count == reward_before_local + 1 and study.music_mode == "local" and study.music_playing and study.local_music_name == "suno-tl-sketch.wav", "reward effects work over local music without changing the track")
	require(study.music_stem_label.text.contains("procedural stems hidden"), "local full-track mode hides procedural stem labels")
	require(not study.load_local_music_bytes("readme.txt", valid_wav), "unsupported file extension rejected")
	require(study.music_error == study.MUSIC_FILE_ERROR and study.music_mode == "local" and study.local_music_name == "suno-tl-sketch.wav", "invalid extension sets MUSIC_FILE_ERROR and preserves active local track")
	require(not study.load_local_music_bytes("empty.wav", PackedByteArray()), "empty audio file rejected")
	require(study.music_error == study.MUSIC_FILE_ERROR and study.music_mode == "local", "empty audio file sets MUSIC_FILE_ERROR and preserves active track")
	var corrupt_bytes := PackedByteArray([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
	require(not study.load_local_music_bytes("corrupt.wav", corrupt_bytes) and study.music_error == study.MUSIC_DECODE_ERROR, "corrupt WAV bytes rejected with MUSIC_DECODE_ERROR")
	require(not study.load_local_music_bytes("corrupt.mp3", corrupt_bytes) and study.music_error == study.MUSIC_DECODE_ERROR, "corrupt MP3 bytes rejected with MUSIC_DECODE_ERROR")
	require(not study.load_local_music_bytes("corrupt.ogg", corrupt_bytes) and study.music_error == study.MUSIC_DECODE_ERROR, "corrupt OGG bytes rejected with MUSIC_DECODE_ERROR")
	var id3_corrupt := "ID3".to_ascii_buffer()
	id3_corrupt.append_array(PackedByteArray([0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66]))
	require(not study.load_local_music_bytes("corrupt-id3.mp3", id3_corrupt) and study.music_error == study.MUSIC_DECODE_ERROR, "corrupt MP3 with ID3 header and junk body rejected without engine error")
	var oggs_corrupt := "OggS".to_ascii_buffer()
	for _b in range(32):
		oggs_corrupt.append(0x42)
	require(not study.load_local_music_bytes("corrupt-oggs.ogg", oggs_corrupt) and study.music_error == study.MUSIC_DECODE_ERROR, "corrupt OGG with OggS header and junk body rejected without engine error")
	require(study.music_mode == "local" and study.local_music_name == "suno-tl-sketch.wav", "corrupt file attempts preserve previously loaded local track")
	study.use_synth_sketch()
	require(study.music_mode == "sketch" and study.music_error == "" and study.music_stem_label.text.contains("4/4 stems"), "use_synth_sketch returns to 80 BPM procedural sketch and restores stem labels")
	study.stop_music_playback()
	require(not study.music_playing and is_equal_approx(study.last_sample_rms, 0.0), "stop_music_playback pauses audio and zeroes RMS")

	# Round 5: Opening-block readiness, sound-independent completion, and 3D BlockGatheringBanner
	require(study.block_banner_node != null and study.block_banner_node.name == "BlockGatheringBanner", "3D BlockGatheringBanner node exists")
	require(not study.block_opened and not study.block_banner_node.visible, "block gathering starts closed with banner hidden")
	require(study.visited_neighbors.size() == 3 and not study.is_block_ready(), "block is not ready when only 3/5 neighbors visited")
	require(study.get_block_missing_summary() == "3/5 neighbors", "get_block_missing_summary reports 3/5 neighbors when mural and soundcheck are done")
	require(not study.open_block_gathering() and not study.block_opened and not study.block_banner_node.visible and study.block_panel.visible, "open_block_gathering rejects incomplete block and opens BlockPanel with missing summary")

	# Visit remaining 2 neighbors (Dez and Thanh) via visit_next_unvisited_neighbor()
	require(study.visit_next_unvisited_neighbor(), "visit_next_unvisited_neighbor routes to Dez (index 3)")
	require(study.selected_neighbor == 3, "Dez selected as next unvisited neighbor")
	for _step in range(160):
		if study.arrived_neighbor == 3:
			break
		study.advance_walk(0.25)
	require(study.arrived_neighbor == 3 and study.visited_neighbors.has("dez") and study.block_panel.visible, "player arrives at Dez and opens BlockPanel")
	require(not study.is_block_ready() and study.get_block_missing_summary() == "4/5 neighbors", "block still needs 5th neighbor before opening")

	require(study.visit_next_unvisited_neighbor(), "visit_next_unvisited_neighbor routes to Thanh (index 4)")
	require(study.selected_neighbor == 4, "Thanh selected as final unvisited neighbor")
	for _step in range(200):
		if study.arrived_neighbor == 4:
			break
		study.advance_walk(0.25)
	require(study.arrived_neighbor == 4 and study.visited_neighbors.has("thanh") and study.visited_neighbors.size() == 5, "player arrives at Thanh and completes 5/5 neighbor visits")
	require(study.is_block_ready() and study.get_block_missing_summary() == "Ready to open", "is_block_ready becomes true when 5/5 neighbors, 3/3 mural, and Rook soundcheck are done")

	# Prove 100% sound-independent completion (music paused)
	study.stop_music_playback()
	require(not study.music_playing, "music playback is paused before opening block gathering")
	require(study.open_block_gathering(), "open_block_gathering succeeds with music paused (sound-independent completion)")
	require(study.block_opened and study.block_banner_node.visible and not study.music_playing, "open_block_gathering reveals 3D BlockGatheringBanner without forcing audio playback")
	require(study.last_music_cue == "block_opened", "open_block_gathering records block_opened progress cue")
	var a11y_snap: Dictionary = study.get_a11y_status_snapshot()
	require(bool(a11y_snap.get("block_ready", false)) and bool(a11y_snap.get("block_opened", false)) and int(a11y_snap.get("visited_count", 0)) == 5, "get_a11y_status_snapshot reflects opened block state")
	require(study.a11y_announcement_seq > 0 and study.last_a11y_announcement.contains("block gathering is open"), "announce_a11y_status records block opening announcement")

	# Round 6: Wider Tenderloin exploration (Compton's Corner, 4-block west walk along Turk Street to Black Hawk at Turk & Hyde, Transgender Cultural District boundary toggle, and wide overview)
	require(not study.history_read and not study.blackhawk_discovered and study.district_boundary_visible, "history_read and blackhawk_discovered start false, district_boundary_visible starts true")
	require(not study.history_beacon_meshes["comptons"].material_override.emission_enabled and not study.history_beacon_meshes["blackhawk"].material_override.emission_enabled, "history stop beacons start dim before reading")
	require(study.walk_to_comptons_corner(), "walk_to_comptons_corner() starts route to Turk & Taylor history plaque")
	require(study.walking_to_history_stop == "comptons", "walking_to_history_stop tracks comptons route")
	var c_guard := 0
	while study.walking_to_history_stop == "comptons" and c_guard < 300:
		study.advance_walk(0.25)
		require(study.building_containing_point(study.player_xz()) == "", "Compton's Corner walk stays outside all 188 building footprints")
		c_guard += 1
	require(c_guard < 300 and study.history_read and study.arrived_history_stop == "comptons" and study.history_beacon_meshes["comptons"].material_override.emission_enabled, "arriving at Compton's Corner plaque sets history_read=true and lights 3D beacon")
	require(study.last_a11y_announcement.contains("Compton's Corner") and study.last_a11y_announcement.contains("1966"), "arriving at Compton's Corner announces narrative history plaque")
	require(study.last_music_cue == "history_comptons" and study.reward_banner.visible and study.reward_title_label.text.contains("Living History") and study.celebration_burst_node.visible, "first discovery of Compton's Corner plaque triggers history_comptons chime and Living History feel-good burst")

	require(study.walk_to_black_hawk(), "walk_to_black_hawk() builds 4-block west Turk Street corridor route to Turk & Hyde")
	require(study.walking_to_history_stop == "blackhawk" and not study.current_path.is_empty(), "Black Hawk route has walkable west Turk corridor path")
	var jones_x := float(study.data.west_intersections[0].point[0])
	var leavenworth_x := float(study.data.west_intersections[1].point[0])
	var crossed_jones := false
	var crossed_leavenworth := false
	var bh_guard := 0
	var bh_dt := 1.0 / 60.0
	var max_bh_step: float = study.WALK_CORRIDOR_SPEED_M_PER_S * bh_dt + 0.15
	while study.walking_to_history_stop == "blackhawk" and bh_guard < 2400:
		var prev_bh_xz: Vector2 = study.player_xz()
		study.advance_walk(bh_dt)
		var p_xz: Vector2 = study.player_xz()
		require(prev_bh_xz.distance_to(p_xz) <= max_bh_step, "west corridor walk step stays within continuous corridor speed bound (no teleport)")
		require(study.building_containing_point(p_xz) == "", "west Turk Street corridor walk stays outside all 188 building footprints")
		if p_xz.x <= jones_x:
			crossed_jones = true
		if p_xz.x <= leavenworth_x:
			crossed_leavenworth = true
		bh_guard += 1
	require(bh_guard < 2400 and crossed_jones and crossed_leavenworth, "west Turk walk crosses actual Jones Street and Leavenworth Street centerlines")
	require(study.blackhawk_discovered and study.arrived_history_stop == "blackhawk" and study.history_beacon_meshes["blackhawk"].material_override.emission_enabled, "arriving at Turk & Hyde sets blackhawk_discovered=true and lights 3D Black Hawk beacon")
	study.focus_history_stop_camera("comptons")
	var immediate_history_save: String = JSON.stringify(study.build_save_envelope())
	require(study.walk_to_black_hawk() and study.arrived_history_stop == "blackhawk" and not study.following_player and study.view_size == 55.0 and study.block_panel.visible, "immediate history arrival retains deliberate landmark framing")
	require(JSON.stringify(study.build_save_envelope()) == immediate_history_save, "repeat immediate history arrival preserves progress")
	require(study.player_xz().distance_to(study.history_stop_xz("blackhawk")) <= study.ARRIVAL_DISTANCE_M + 1e-3, "player arrives within arrival radius of Former Black Hawk Jazz Club at Turk & Hyde")
	require(study.last_a11y_announcement.contains("Black Hawk Jazz Club") and study.last_a11y_announcement.contains("Miles Davis"), "arriving at Black Hawk announces Turk & Hyde narrative history stop")
	require(study.last_music_cue == "history_blackhawk" and study.reward_banner.visible and study.reward_title_label.text.contains("Jazz History") and study.celebration_burst_node.visible, "first discovery of Former Black Hawk Jazz Club triggers history_blackhawk chime and Jazz History feel-good burst")

	# Verify return corridor path from Turk & Hyde back east to Bea
	require(study.walk_to_neighbor(0), "walk_to_neighbor(0) routes from Turk & Hyde back east to Bea")
	var ret_guard := 0
	while study.arrived_neighbor != 0 and ret_guard < 450:
		study.advance_walk(0.25)
		require(study.building_containing_point(study.player_xz()) == "", "return walk from Turk & Hyde to Bea stays outside all 188 footprints")
		ret_guard += 1
	require(ret_guard < 450 and study.arrived_neighbor == 0, "player walks back from Turk & Hyde to Bea")

	# Toggle Transgender Cultural District 3D boundary and test wide overview
	require(not study.toggle_district_boundary() and not study.district_boundary_visible and not study.district_boundary_node.visible, "toggle_district_boundary hides 3D DistrictBoundaryRibbon")
	study.wide_overview()
	require(study.in_wide_overview and study.selected == -1 and study.selected_neighbor == -1, "wide_overview activates full 188-footprint Tenderloin framing")
	var wide_b: Rect2 = study.projected_wider_bounds()
	require(wide_b.size.x > 100.0 and wide_b.size.y > 40.0, "projected_wider_bounds spans all 188 buildings across the wider Tenderloin")

	# Load local track again before save/reload check to prove local tracks are tab-local and never persisted
	require(study.load_local_music_bytes("suno-tl-sketch.wav", valid_wav), "re-load local track before save check")
	study.save_godot_state()
	require(FileAccess.file_exists(study.save_path), "separate Godot save file written")
	var raw_saved: String = FileAccess.get_file_as_string(study.save_path)
	require(raw_saved.contains("\"schema\":\"tenderloin-redux.godot.save\"") and not raw_saved.contains("tenderloin-redux.save.v1"), "Godot save uses isolated schema namespace")
	require(raw_saved.contains("\"rook_soundcheck_done\":true") and raw_saved.contains("\"block_opened\":true") and raw_saved.contains("\"history_read\":true") and raw_saved.contains("\"blackhawk_discovered\":true") and raw_saved.contains("\"district_boundary_visible\":false") and not raw_saved.contains("suno-tl-sketch.wav"), "Godot save persists Round 5 and Round 6 state and never stores local audio filenames")
	study.stop_music_playback()

	# Instantiate a fresh scene to prove reload persistence from save_path
	var reloaded = load("res://main.tscn").instantiate()
	root.add_child(reloaded)
	await process_frame
	await process_frame
	require(reloaded.save_load_status == "restored", "fresh scene restores saved Godot mural, soundcheck, block, and wider Tenderloin state on load")
	require(reloaded.celeste_talk_count == 2 and reloaded.active_motif == "sun", "reloaded scene restores celeste_talk_count and active_motif")
	require(reloaded.mural_palette == "sunset" and reloaded.mural_completed and reloaded.mural_banner_mesh.visible, "reloaded scene restores palette, completion, and 3D banner")
	require(reloaded.rook_soundcheck_done and reloaded.speaker_beacon_mesh.visible and reloaded.unlocked_stems().size() == 4, "reloaded scene restores Rook soundcheck, 3D speaker beacon, and all 4 unlocked stems")
	require(reloaded.visited_neighbors.size() == 5 and reloaded.is_block_ready() and reloaded.block_opened and reloaded.block_banner_node.visible, "reloaded scene restores 5/5 visited neighbors, block_opened, and 3D BlockGatheringBanner")
	require(reloaded.history_read and reloaded.blackhawk_discovered and not reloaded.district_boundary_visible and not reloaded.district_boundary_node.visible, "reloaded scene restores history_read, blackhawk_discovered, and hidden district_boundary_visible")
	require(reloaded.history_beacon_meshes["comptons"].material_override.emission_enabled and reloaded.history_beacon_meshes["blackhawk"].material_override.emission_enabled, "reloaded scene restores lit 3D beacons for Compton's Corner and Black Hawk")
	require(not reloaded.music_playing and reloaded.music_mode == "sketch" and reloaded.local_music_name == "", "reloaded scene starts silent in sketch mode without local track")
	var rel_sun: Node3D = reloaded.mural_motif_nodes["sun"]
	var rel_wave: Node3D = reloaded.mural_motif_nodes["wave"]
	var rel_rise: Node3D = reloaded.mural_motif_nodes["rise"]
	require(rel_sun.visible and rel_wave.visible and rel_rise.visible, "reloaded scene restores all 3 visible 3D motif meshes")
	require(rel_sun.position.is_equal_approx(sun_node.position), "reloaded scene restores moved 3D Sun motif coordinates")
	reloaded.queue_free()
	await process_frame

	# Test corrupt save recovery and forged block_opened guard without crashing
	require(not study.apply_save_envelope("{corrupt-json"), "corrupt JSON save returns false")
	require(study.save_load_status == "recovered" and study.mural_placements.is_empty() and not study.mural_banner_mesh.visible and not study.rook_soundcheck_done and not study.block_opened and not study.block_banner_node.visible and not study.history_read and not study.blackhawk_discovered and study.district_boundary_visible, "corrupt JSON resets cleanly to recovered defaults")
	require(not study.apply_save_envelope("{\"schema\":\"wrong\",\"version\":1}"), "wrong schema save rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":2,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{}}"), "wrong integer version rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1.5,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{}}"), "fractional version rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":[]}"), "non-dictionary placements rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"moon\":{\"col\":0,\"row\":0}}}"), "unknown motif key rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"sun\":{\"col\":1.7,\"row\":0}}}"), "fractional cell coordinate rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"sun\":{\"col\":1,\"row\":0},\"wave\":{\"col\":1,\"row\":0}}}"), "duplicate cell collision in save rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"mural_placements\":{\"sun\":{\"col\":99,\"row\":0}}}"), "out-of-bounds saved cell rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"rook_soundcheck_done\":\"yes\",\"mural_placements\":{}}"), "non-bool rook_soundcheck_done rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"block_opened\":\"yes\",\"mural_placements\":{}}"), "non-bool block_opened rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"history_read\":\"yes\",\"mural_placements\":{}}"), "non-bool history_read rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"blackhawk_discovered\":\"yes\",\"mural_placements\":{}}"), "non-bool blackhawk_discovered rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"district_boundary_visible\":\"no\",\"mural_placements\":{}}"), "non-bool district_boundary_visible rejected cleanly")
	require(not study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"visited_neighbors\":[\"unknown\"],\"mural_placements\":{}}"), "unknown neighbor ID in visited_neighbors rejected cleanly")
	require(study.apply_save_envelope("{\"schema\":\"tenderloin-redux.godot.save\",\"version\":1,\"mural_palette\":\"garden\",\"celeste_talk_count\":1,\"rook_soundcheck_done\":true,\"block_opened\":true,\"visited_neighbors\":[\"bea\",\"celeste\"],\"mural_placements\":{\"sun\":{\"col\":1,\"row\":0},\"wave\":{\"col\":3,\"row\":1},\"rise\":{\"col\":5,\"row\":2}}}"), "partial save with forged block_opened=true loads valid partial state")
	require(not study.block_opened and not study.block_banner_node.visible, "forged block_opened=true is clamped to false when prerequisites are incomplete")

	# Round 5 & Round 6: Explicit opt-in browser-save adapter (inspect_browser_save_json / import_browser_save_json / import_browser_save_from_web_storage)
	study.set_mural_palette("ocean")
	require(not study.import_browser_save_from_web_storage() and study.browser_import_status == "error" and study.browser_import_message.contains("only available in the Web build"), "import_browser_save_from_web_storage rejects non-Web call cleanly")
	require(not study.import_browser_save_json("{\"schema\":\"tenderloin-redux.save\",\"version\":1,\"sentinel\":\"preserve-browser-save-v1\"}"), "browser save sentinel without core object rejected cleanly on explicit import")
	require(study.browser_import_status == "error" and study.mural_palette == "ocean" and study.mural_placements.size() == 3, "rejected browser save import preserves existing Godot state untouched")
	require(not bool(study.inspect_browser_save_json("{\"version\":2,\"core\":{}}").get("valid", false)), "wrong browser save version rejected")
	var row2_res: Dictionary = study.inspect_browser_save_json("{\"version\":1,\"core\":{\"greeted\":true,\"layout\":\"table\",\"furniture\":{\"table\":{\"col\":1,\"row\":2}},\"litter\":[],\"mural\":{},\"palette\":\"garden\",\"soundcheck\":false,\"opened\":false}}")
	require(bool(row2_res.get("valid", false)) and int(row2_res.get("furniture_count", -1)) == 0 and not bool(row2_res.get("layout_ready", true)), "browser furniture on clear route row 2 is filtered out by can_place_browser_furniture")
	var overlap_res: Dictionary = study.inspect_browser_save_json("{\"version\":1,\"core\":{\"greeted\":true,\"layout\":\"table\",\"furniture\":{\"table\":{\"col\":1,\"row\":0},\"seats\":{\"col\":2,\"row\":0}},\"litter\":[],\"mural\":{},\"palette\":\"garden\",\"soundcheck\":false,\"opened\":false}}")
	require(bool(overlap_res.get("valid", false)) and int(overlap_res.get("furniture_count", -1)) == 1 and not bool(overlap_res.get("layout_ready", true)), "overlapping 2-cell horizontal browser furniture is filtered out by can_place_browser_furniture")
	var floor_res: Dictionary = study.inspect_browser_save_json("{\"version\":1,\"core\":{\"greeted\":true,\"layout\":\"floor\",\"furniture\":{\"table\":{\"col\":1,\"row\":0},\"seats\":{\"col\":2,\"row\":0},\"speaker\":{\"col\":5,\"row\":3}},\"litter\":[],\"mural\":{},\"palette\":\"garden\",\"soundcheck\":false,\"opened\":false}}")
	require(bool(floor_res.get("valid", false)) and int(floor_res.get("furniture_count", -1)) == 3 and bool(floor_res.get("layout_ready", false)), "vertical table in floor layout at (1,0)+(1,1) does not collide with seats at (2,0)+(3,0)")
	study.clear_godot_save()
	var partial_browser_json := "{\"version\":1,\"core\":{\"greeted\":true,\"layout\":\"table\",\"furniture\":{\"table\":{\"col\":1,\"row\":0}},\"litter\":[\"cup\"],\"mural\":{\"sun\":{\"col\":1,\"row\":0},\"wave\":{\"col\":3,\"row\":1}},\"palette\":\"sunset\",\"soundcheck\":true,\"opened\":true}}"
	require(study.import_browser_save_json(partial_browser_json), "partial browser v1 save imports cleanly into fresh state")
	require(study.visited_neighbors.size() == 4 and study.mural_placements.size() == 2 and study.mural_palette == "sunset", "partial browser save maps greeted/mural/litter/layout neighbors, 2 mural motifs, and sunset palette")
	require(not study.rook_soundcheck_done and not study.block_opened and not study.history_read and not study.blackhawk_discovered, "browser soundcheck and opened flags are gated on valid 3-piece furniture layout and full readiness")
	var complete_browser_json := "{\"version\":1,\"core\":{\"greeted\":true,\"layout\":\"table\",\"furniture\":{\"table\":{\"col\":1,\"row\":0},\"seats\":{\"col\":4,\"row\":0},\"speaker\":{\"col\":1,\"row\":3}},\"litter\":[\"cup\",\"offcuts\",\"wrapper\"],\"mural\":{\"sun\":{\"col\":1,\"row\":0},\"wave\":{\"col\":3,\"row\":1},\"rise\":{\"col\":5,\"row\":2}},\"palette\":\"ocean\",\"soundcheck\":true,\"opened\":true,\"history\":true,\"blackhawk\":true}}"
	require(study.import_browser_save_json(complete_browser_json), "complete browser v1 save imports via import_browser_save_json()")
	require(study.browser_import_status == "imported" and study.visited_neighbors.size() == 5 and study.mural_completed and study.mural_palette == "ocean" and study.rook_soundcheck_done and study.block_opened and study.block_banner_node.visible and study.history_read and study.blackhawk_discovered and study.history_beacon_meshes["comptons"].material_override.emission_enabled and study.history_beacon_meshes["blackhawk"].material_override.emission_enabled, "complete browser v1 save maps full opening block completion, history_read, blackhawk_discovered, and lights 3D beacons")
	require(study.import_browser_save_json(partial_browser_json), "importing partial browser save after complete state succeeds as monotonic merge")
	require(study.visited_neighbors.size() == 5 and study.mural_completed and study.mural_palette == "ocean" and study.rook_soundcheck_done and study.block_opened and study.block_banner_node.visible and study.history_read and study.blackhawk_discovered, "monotonic browser save import never downgrades existing Godot progress")
	study.clear_mural_board()
	require(study.block_opened and study.mural_completed and study.mural_placements.size() == 3 and study.block_banner_node.visible, "clear_mural_board keeps 3/3 mural and block_opened intact once block gathering is open")
	study.show_block_panel(false)
	study.finish_neighbor_arrival(0)
	require(study.block_panel.visible, "re-arriving at Bea after initial greeting opens BlockPanel")
	var key_g := InputEventKey.new()
	key_g.pressed = true
	key_g.keycode = KEY_G
	study._unhandled_input(key_g)
	require(not study.block_panel.visible, "KEY_G toggles BlockPanel closed")
	study._unhandled_input(key_g)
	require(study.block_panel.visible, "KEY_G toggles BlockPanel open")
	var seq_before_o: int = study.save_seq
	var key_o := InputEventKey.new()
	key_o.pressed = true
	key_o.keycode = KEY_O
	study._unhandled_input(key_o)
	require(study.block_opened and study.save_seq == seq_before_o, "KEY_O on already-opened block is idempotent and does not increment save_seq")
	var key_i := InputEventKey.new()
	key_i.pressed = true
	key_i.keycode = KEY_I
	study._unhandled_input(key_i)
	require(study.browser_import_status == "error" and study.block_opened, "KEY_I in headless mode reports non-Web error without losing opened block state")
	var key_c := InputEventKey.new()
	key_c.pressed = true
	key_c.keycode = KEY_C
	var vis_before_c: bool = study.district_boundary_visible
	study._unhandled_input(key_c)
	require(study.district_boundary_visible == (not vis_before_c) and study.district_boundary_node.visible == study.district_boundary_visible, "KEY_C toggles Transgender Cultural District boundary")
	var key_l := InputEventKey.new()
	key_l.pressed = true
	key_l.keycode = KEY_L
	study._unhandled_input(key_l)
	require(study.in_wide_overview, "KEY_L activates wide Tenderloin overview")
	var wide_street_screen: Vector2 = study.camera.unproject_position(Vector3(45.0, 0.0, -7.2))
	require(study.handle_scene_tap(wide_street_screen) and study.selected_neighbor == -1 and not study.current_path.is_empty(), "zoomed-out wide_overview tap ~23m from Bea routes to street point rather than selecting neighbor (world_d <= 8.5 bound)")
	require(not study.walk_to_point(Vector2(-350.0, -350.0)) and study.current_path.is_empty(), "unreachable point far from any street is rejected without routing back to PLAYER_START")
	require(study.walk_control.text == guided_caption(study), "rejected route restores the normal walking action")
	require(study.header_details_expanded and study.info.visible and study.info.text.begins_with("No walkable"), "blocked navigation reveals its explanation in the compact header")
	study.set_header_details(false)
	study.wide_overview()
	await process_frame
	await process_frame
	await process_frame
	require(not study.walk_to_point(Vector2(-350.0, -350.0)), "unreachable tap is rejected from the wide map")
	await process_frame
	await process_frame
	await process_frame
	require(study.info.visible and study.info.text.begins_with("No walkable") and study.last_a11y_announcement.begins_with("No walkable"), "map layout cannot overwrite the visible route failure after deferred frames")
	study.set_header_details(false)

	# Round 7: M1 Afternoon Keepsake & Loan Returns + M3 Second Afternoon Programme Planning & Hosting
	study.block_opened = false
	require(not study.take_keepsake_photo(["bea"]) and not study.start_packing_epilogue() and not study.return_loan("table"), "M1 keepsake photo, packing, and loan returns are rejected while block_opened is false")
	require(not study.programme_add("stories") and not study.programme_publish() and not study.host_start(), "M3 programme planning, publishing, and hosting are rejected while block_opened is false")
	study.block_opened = true
	study.keepsake_photo = study.default_keepsake_photo()
	study.epilogue_packing = false
	study.epilogue_returned.clear()
	study.programme_order.clear()
	study.programme_published.clear()
	study.hosting_order.clear()
	study.hosting_results.clear()
	study.hosting_draft = study.default_hosting_draft()
	study.update_block_3d()
	require(not study.keepsake_frame_node.visible and not study.programme_board_node.visible and not study.hosting_tile_panel_node.visible, "3D keepsake easel, programme signboard, and hosting tile panel start hidden before M1/M3 completion")
	require(not study.take_keepsake_photo([]) and not study.take_keepsake_photo(["bea", "rook"]), "take_keepsake_photo rejects empty guest list and non-consenting Rook")
	require(study.skip_keepsake_photo() and String(study.keepsake_photo.get("status", "")) == "skipped", "skip_keepsake_photo marks status as skipped")
	study.set_mural_palette("sunset")
	study.place_mural_motif("sun", 0, 0)
	study.place_mural_motif("wave", 2, 1)
	study.place_mural_motif("rise", 4, 2)
	require(study.take_keepsake_photo(["thanh", "bea", "celeste"]) and String(study.keepsake_photo.get("status", "")) == "taken", "skipped keepsake can be reconsidered before packing starts")
	require(study.keepsake_photo.get("participants", []) == ["bea", "celeste", "thanh"], "keepsake participants are stored in canonical PHOTO_GUESTS order")
	require(study.keepsake_frame_node.visible and study.keepsake_guest_pips["bea"].visible and not study.keepsake_guest_pips["dez"].visible, "3D keepsake easel and consenting guest pips reflect keepsake photo")
	# Mutate live mural after taking photo to prove keepsake snapshot is immutable
	study.set_mural_palette("ocean")
	study.place_mural_motif("sun", 1, 2)
	require(String(study.keepsake_photo.get("palette", "")) == "sunset" and int(study.keepsake_photo["mural"]["sun"]["col"]) == 0, "keepsake photo snapshot stays frozen when live mural or palette changes later")
	require(not study.take_keepsake_photo(["bea"]) and not study.skip_keepsake_photo(), "taken keepsake photo cannot be retaken or skipped")
	require(not study.return_loan("table"), "cannot return loan before start_packing_epilogue")
	require(study.start_packing_epilogue() and study.epilogue_packing, "start_packing_epilogue enables loan returns")
	require(study.loan_return_beacons["table"].visible and not study.is_epilogue_done(), "loan return 3D beacons become visible during packing")
	require(study.return_loan("speaker") and study.return_loan("table") and not study.return_loan("table") and study.return_loan("paint-case"), "all 3 neighbor loans return once without duplicates")
	require(study.epilogue_returned == ["table", "paint-case", "speaker"] and study.is_epilogue_done(), "returned loans are stored in canonical order and complete M1 epilogue")

	# M3 Second Afternoon Programme Planning & Hosting
	require(study.programme_add("beats") and study.programme_add("stories") and study.programme_add("art") and study.programme_add("pause"), "all 4 afternoon programme segments can be added")
	require(study.programme_issue() != "" and not study.programme_publish(), "programme_publish rejects order where Beats precedes Stories without Quiet interval in between")
	require(study.advance_programme_and_hosting_step() == "programme_blocked" and study.programme_order == ["beats", "stories", "art", "pause"], "advance_programme_and_hosting_step blocks without overwriting non-empty invalid draft")
	require(study.programme_move("pause", -1) and study.programme_move("pause", -1) and study.programme_order == ["beats", "pause", "stories", "art"], "programme_move places Quiet interval between Beats and Stories")
	require(study.programme_issue() == "" and study.programme_publish() and study.programme_published == ["beats", "pause", "stories", "art"], "valid 4-segment programme publishes cleanly")
	require(study.programme_board_node.visible, "3D ProgrammeSignboard becomes visible on publish")
	require(study.programme_move("art", -1) and study.programme_order == ["beats", "pause", "art", "stories"] and study.programme_published == ["beats", "pause", "stories", "art"], "draft programme edits after publish do not mutate programme_published")
	require(study.host_start() and study.hosting_order == ["beats", "pause", "stories", "art"] and study.current_hosting_activity() == "beats", "host_start freezes published order and begins at first segment")
	require(study.programme_publish() and study.programme_published == ["beats", "pause", "art", "stories"] and study.hosting_order == ["beats", "pause", "stories", "art"], "re-publishing draft order does not overwrite already-started hosting_order")
	require(study.get_a11y_status_snapshot().get("hosting_order", []) == ["beats", "pause", "stories", "art"], "a11y snapshot exposes active hosting_order distinct from programme_published")
	# Toggle all 4 default active beats (0, 2, 4, 6 -> 85) down to 0 (Dez listening round)
	require(study.host_toggle_beat(0) and study.host_toggle_beat(2) and study.host_toggle_beat(4) and study.host_toggle_beat(6) and int(study.hosting_draft.get("pattern", -1)) == 0 and study.host_complete_current(), "completing Rhythm workshop commits 0 listening round pattern")
	require(int(study.get_hosted_segment_value("beats")) == 0, "hosted beats segment preserves 0 listening round value")
	require(study.current_hosting_activity() == "pause" and study.host_set_quiet("pairs") and study.host_complete_current(), "completing Quiet interval commits pairs seating option")
	require(study.current_hosting_activity() == "stories" and study.host_set_story("future") and study.host_complete_current(), "completing Story circle commits future prompt")
	require(study.current_hosting_activity() == "art" and study.host_set_palette("cool") and study.host_cycle_tile(0) and study.host_complete_current(), "completing Shared art panel commits cool palette and 6 tiles")
	require(study.is_hosting_done() and study.current_hosting_activity() == "" and study.hosting_tile_panel_node.visible, "4/4 hosted segments complete M3 and reveal 3D HostingArtTilePanel")
	var saved_m1_m3_json := FileAccess.get_file_as_string(study.save_path)
	study.reset_mural_state_to_defaults("fresh")
	require(not study.is_epilogue_done() and not study.is_hosting_done() and not study.keepsake_frame_node.visible and not study.hosting_tile_panel_node.visible, "reset clears M1 and M3 state and hides 3D props")
	require(study.apply_save_envelope(saved_m1_m3_json) and study.is_epilogue_done() and study.is_hosting_done(), "apply_save_envelope restores full M1 epilogue and M3 programme/hosting state")
	require(study.keepsake_frame_node.visible and study.programme_board_node.visible and study.hosting_tile_panel_node.visible, "restoring M1/M3 save restores all 3D scene props")
	# Corrupt M1/M3 save rejection
	var bad_rook_photo: Dictionary = JSON.parse_string(saved_m1_m3_json)
	bad_rook_photo["epilogue"]["photo"]["participants"] = ["bea", "rook"]
	require(not study.apply_save_envelope(JSON.stringify(bad_rook_photo)) and study.save_load_status == "recovered", "Godot save with non-consenting Rook in keepsake photo is rejected")
	var bad_missing_photo: Dictionary = JSON.parse_string(saved_m1_m3_json)
	bad_missing_photo["epilogue"].erase("photo")
	require(not study.apply_save_envelope(JSON.stringify(bad_missing_photo)) and study.save_load_status == "recovered", "Godot save with packing=true and missing photo key is rejected")
	var bad_non_array_parts: Dictionary = JSON.parse_string(saved_m1_m3_json)
	bad_non_array_parts["epilogue"]["photo"]["status"] = "skipped"
	bad_non_array_parts["epilogue"]["photo"]["participants"] = "bea"
	require(not study.apply_save_envelope(JSON.stringify(bad_non_array_parts)) and study.save_load_status == "recovered", "Godot save with non-Array participants on skipped photo is rejected")
	var bad_prog_save: Dictionary = JSON.parse_string(saved_m1_m3_json)
	bad_prog_save["programme"]["published"] = ["beats", "stories", "pause", "art"]
	require(not study.apply_save_envelope(JSON.stringify(bad_prog_save)) and study.save_load_status == "recovered", "Godot save with published programme violating Quiet interval rule is rejected")
	var bad_host_save: Dictionary = JSON.parse_string(saved_m1_m3_json)
	bad_host_save["hosting"]["results"][0]["id"] = "stories"
	require(not study.apply_save_envelope(JSON.stringify(bad_host_save)) and study.save_load_status == "recovered", "Godot save with out-of-order hosting result is rejected")
	# Browser v1 save inspection rejects incomplete keepsake photo and invalid hosting.order
	var browser_bad_photo_and_host := JSON.stringify({
		"version": 1,
		"core": {
			"greeted": true,
			"layout": "floor",
			"furniture": {"table": {"col": 1, "row": 0}, "seats": {"col": 4, "row": 0}, "speaker": {"col": 1, "row": 3}},
			"litter": ["cup", "offcuts", "wrapper"],
			"mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}},
			"palette": "sunset",
			"soundcheck": true,
			"opened": true,
			"epilogue": {
				"photo": {"status": "taken", "participants": ["bea", "rook"], "layout": "floor", "palette": "sunset", "mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}}},
				"packing": false,
				"returned": []
			},
			"programme": {"order": ["stories", "beats", "pause", "art"], "published": ["stories", "beats", "pause", "art"]},
			"hosting": {"order": [], "results": [{"id": "stories", "value": "future"}], "draft": {"story": "future", "pattern": 0, "tiles": [0, 1, 2, 2, 1, 0], "palette": "cool", "quiet": "pairs"}}
		}
	})
	var bad_insp: Dictionary = study.inspect_browser_save_json(browser_bad_photo_and_host)
	require(String(bad_insp["epilogue"]["photo"]["status"]) == "unasked" and (bad_insp["hosting"]["order"] as Array).is_empty() and (bad_insp["hosting"]["results"] as Array).is_empty(), "inspect_browser_save_json matches core.js/hosting.js by rejecting photo with Rook and rejecting hosting with empty order")
	# Browser v1 save import with genuine public/core.js + public/hosting.js values
	var browser_m1_m3_save := JSON.stringify({
		"version": 1,
		"core": {
			"greeted": true,
			"layout": "floor",
			"furniture": {"table": {"col": 1, "row": 0}, "seats": {"col": 4, "row": 0}, "speaker": {"col": 1, "row": 3}},
			"litter": ["cup", "offcuts", "wrapper"],
			"mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}},
			"palette": "sunset",
			"soundcheck": true,
			"opened": true,
			"history": true,
			"blackhawk": true,
			"epilogue": {
				"photo": {"status": "taken", "participants": ["dez", "bea"], "mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}}, "palette": "sunset", "layout": "floor"},
				"packing": true,
				"returned": ["speaker", "table"]
			},
			"programme": {
				"order": ["stories", "beats", "pause", "art"],
				"published": ["stories", "beats", "pause", "art"]
			},
			"hosting": {
				"order": ["stories", "beats", "pause", "art"],
				"results": [
					{"id": "stories", "value": "future"},
					{"id": "beats", "value": 0}
				],
				"draft": {"story": "future", "pattern": 0, "tiles": [1, 2, 0, 0, 2, 1], "palette": "cool", "quiet": "pairs"}
			}
		}
	})
	require(study.import_browser_save_json(browser_m1_m3_save) and study.keepsake_photo.get("participants", []) == ["bea", "dez"] and study.epilogue_returned == ["table", "speaker"], "import_browser_save_json maps browser v1 epilogue keepsake and returned loans")
	require(study.programme_published == ["stories", "beats", "pause", "art"] and study.hosting_results.size() == 2 and String(study.get_hosted_segment_value("stories")) == "future" and int(study.get_hosted_segment_value("beats")) == 0 and study.current_hosting_activity() == "pause", "import_browser_save_json maps browser v1 future story, 0 listening round beats, and partial hosting progress")
	var key_y := InputEventKey.new()
	key_y.pressed = true
	key_y.keycode = KEY_Y
	study._unhandled_input(key_y)
	require(study.is_epilogue_done(), "KEY_Y advances remaining loan return to complete M1 epilogue")
	var shift_z := InputEventKey.new()
	shift_z.pressed = true
	shift_z.shift_pressed = true
	shift_z.keycode = KEY_Z
	study._unhandled_input(shift_z)
	require(String(study.hosting_draft.get("quiet", "")) == "arc", "Shift+Z cycles active Quiet interval choice between pairs and arc")
	var key_z := InputEventKey.new()
	key_z.pressed = true
	key_z.keycode = KEY_Z
	study._unhandled_input(key_z)
	study._unhandled_input(key_z)
	require(study.is_hosting_done() and study.hosting_tile_panel_node.visible, "KEY_Z advances remaining hosted segments to complete M3")

	# M4 Peaceful Tenant Listening Hour (Civic) & Illustrated Three-Shot Film Short (The Open Seat)
	study.clear_godot_settings()
	require(not study.voices_enabled and study.voices_status == "off" and study.voices_records.is_empty(), "M5 Neighborhood Voices is default-off on startup and after clear_godot_settings")
	require(study.is_civic_available() and study.civic_phase == "idle" and not study.civic_setup_node.visible, "M4 Civic Listening Hour unlocks after all 4 M3 hosted segments finish and 3D setup starts hidden")
	require(not study.is_film_available() and not study.film_start() and study.advance_film_step() == "locked", "M4 Film Short stays locked until Peaceful Tenant Listening Hour is done")
	require(study.civic_start() and study.civic_phase == "planning" and not study.civic_setup_node.visible, "civic_start enters planning phase with 3D setup still hidden")
	var seq_before_noop: int = study.save_seq
	require(not study.civic_set_choice("topic", "repairs") and study.save_seq == seq_before_noop, "civic_set_choice rejects no-op choice without incrementing save_seq")
	require(study.civic_set_choice("topic", "access") and study.civic_set_choice("format", "dropin") and study.civic_set_choice("notes", "none"), "civic_set_choice updates topic, format, and notes in planning phase")
	require(study.civic_convene() and study.civic_phase == "meeting" and study.civic_setup_node.visible and study.civic_dropin_group.visible and not study.civic_circle_group.visible, "civic_convene enters meeting phase and shows 3D drop-in table setup")
	require(not study.is_film_available() and not study.film_start(), "M4 Film Short remains locked while Listening Hour is in meeting phase")
	require(study.civic_complete() and study.civic_phase == "done" and study.is_film_available() and study.last_music_cue == "civic_complete" and study.reward_banner.visible and study.reward_title_label.text.contains("Tenant Listening Circle Complete!"), "civic_complete finishes M4 Listening Hour, unlocks M4 Film Short, and triggers civic_complete feel-good burst")
	require(study.neighbor_project_memory_line("bea").find("Making room to come and go gave us a useful place to begin") >= 0 and study.neighbor_project_memory_line("celeste").find("We agreed to keep no meeting notes") >= 0, "neighbors remember completed M4 Listening Hour choices verbatim")

	# M4 Film Short (The Open Seat)
	require(study.film_start() and study.film_phase == "planning" and not study.film_storyboard_node.visible, "film_start enters planning phase with 3D storyboard easel hidden")
	var seq_before_film_noop: int = study.save_seq
	require(not study.film_set_choice("framing", "close") and study.save_seq == seq_before_film_noop, "film_set_choice rejects no-op framing without incrementing save_seq")
	require(study.film_set_choice("framing", "wide") and study.film_set_choice("plan", "later"), "film_set_choice updates framing and sharing plan")
	require(study.film_move_shot("welcome", -1) and study.film_move_shot("welcome", -1) and study.film_draft.get("order", []) == ["welcome", "seat", "paint"], "film_move_shot reorders 3 storyboard shots")
	require(not study.film_begin_shooting() and study.film_phase == "planning", "film_begin_shooting requires hold phase and rejects direct transition from planning")
	require(study.film_hold() and study.film_phase == "hold" and study.film_storyboard_node.visible and study.film_wide_border.visible, "film_hold saves storyboard for another day and displays 3D easel with wide border")
	require(study.film_begin_shooting() and study.film_phase == "shooting" and study.film_next_shot() == "welcome" and study.film_storyboard_node.visible, "film_begin_shooting transitions from hold to shooting and starts at first ordered shot")
	require(not study.film_capture_shot("seat") and study.film_captured.is_empty(), "film_capture_shot rejects out-of-order shot capture")
	require(study.film_capture_shot("welcome") and study.film_captured == ["welcome"] and study.film_next_shot() == "seat" and study.last_music_cue == "film_shot" and study.reward_banner.visible and study.reward_title_label.text.contains("Film Frame Captured"), "first ordered shot captures cleanly and triggers film_shot feel-good burst")
	var key_period := InputEventKey.new()
	key_period.pressed = true
	key_period.keycode = KEY_PERIOD
	study._unhandled_input(key_period)
	study._unhandled_input(key_period)
	require(study.film_phase == "done" and study.film_captured == ["welcome", "seat", "paint"] and study.film_screen_frame == 0 and study.last_music_cue == "film_complete" and study.reward_banner.visible and study.reward_title_label.text.contains("Short Film Complete"), "KEY_PERIOD captures remaining ordered shots, completes The Open Seat, and triggers film_complete feel-good burst")
	var seq_before_frame: int = study.save_seq
	require(study.film_set_screen_frame(2) and study.film_screen_frame == 2 and study.save_seq == seq_before_frame, "film_set_screen_frame updates viewer frame without writing save state")
	require(study.neighbor_project_memory_line("celeste").find("Dez and I offered our hands, not everyone else’s faces") >= 0 and study.neighbor_project_memory_line("dez").find("We ended on a shared motif") >= 0, "neighbors remember completed M4 Film Short choices verbatim")
	study.finish_neighbor_arrival(0)
	require(study.info.text.find("Being heard mattered more than rushing a take") >= 0, "arriving at Bea after M4 completion surfaces her remembered project line in header info")
	study.talk_with_celeste()
	require(study.info.text.find("Dez and I offered our hands, not everyone else’s faces") >= 0, "talk_with_celeste includes Celeste's remembered M4 project line")
	study.check_sound_with_rook()
	require(study.info.text.find("A no can belong in a good film too") >= 0, "check_sound_with_rook includes Rook's remembered M4 project line")

	# M4/M5 Save & Reload + Tamper Rejection
	study.optional_save_data = {"notes": {"tag": "quiet-block"}}
	study.save_godot_state()
	var saved_m4_json := FileAccess.get_file_as_string(study.save_path)
	study.reset_mural_state_to_defaults("fresh")
	require(study.civic_phase == "idle" and study.film_phase == "idle" and not study.civic_setup_node.visible and not study.film_storyboard_node.visible, "reset clears M4 civic and film state and hides 3D props")
	require(study.apply_save_envelope(saved_m4_json) and study.civic_phase == "done" and study.film_phase == "done" and study.film_screen_frame == 0 and study.civic_setup_node.visible and study.film_storyboard_node.visible, "apply_save_envelope restores M4 civic and film state, 3D props, and resets transient film_screen_frame to 0")
	require(not study.voices_enabled and study.optional_save_data.get("notes", {}).get("tag", "") == "quiet-block", "restoring save with optional data preserves optional dictionary without enabling M5 Neighborhood Voices")

	var bad_civic_save: Dictionary = JSON.parse_string(saved_m4_json)
	bad_civic_save["civic"]["result"] = null
	require(not study.apply_save_envelope(JSON.stringify(bad_civic_save)) and study.save_load_status == "recovered", "Godot save with civic.phase=done and null result is rejected")
	var bad_civic_gate: Dictionary = JSON.parse_string(saved_m4_json)
	bad_civic_gate["hosting"]["results"] = []
	require(not study.apply_save_envelope(JSON.stringify(bad_civic_gate)) and study.save_load_status == "recovered", "Godot save with active civic state before 4/4 hosting is rejected")
	var bad_film_save: Dictionary = JSON.parse_string(saved_m4_json)
	bad_film_save["film"]["captured"] = ["welcome", "seat"]
	require(not study.apply_save_envelope(JSON.stringify(bad_film_save)) and study.save_load_status == "recovered", "Godot save with film.phase=done and fewer than 3 captured shots is rejected")
	var bad_film_hold: Dictionary = JSON.parse_string(saved_m4_json)
	bad_film_hold["film"]["phase"] = "hold"
	require(not study.apply_save_envelope(JSON.stringify(bad_film_hold)) and study.save_load_status == "recovered", "Godot save with film.phase=hold and non-empty captured shots is rejected")
	var bad_opt_save: Dictionary = JSON.parse_string(saved_m4_json)
	bad_opt_save["optional"] = {"oversized": "x".repeat(8300)}
	require(study.apply_save_envelope(JSON.stringify(bad_opt_save)) and study.save_load_status == "restored" and study.optional_save_data.is_empty() and study.civic_phase == "done" and study.film_phase == "done", "Godot save with oversized optional dictionary (>8192 bytes) drops optional data to {} while preserving core and M1-M4 progress")

	# Browser v1 save inspection & import for M4 civic, M4 film, and M5 optional
	var browser_m4_edge := JSON.stringify({
		"version": 1,
		"core": {
			"greeted": true,
			"layout": "table",
			"furniture": {"table": {"col": 1, "row": 0}, "seats": {"col": 4, "row": 0}, "speaker": {"col": 1, "row": 3}},
			"litter": ["cup", "offcuts", "wrapper"],
			"mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}},
			"palette": "garden",
			"soundcheck": true,
			"opened": true,
			"programme": {"order": ["stories", "beats", "pause", "art"], "published": ["stories", "beats", "pause", "art"]},
			"hosting": {
				"order": ["stories", "beats", "pause", "art"],
				"results": [
					{"id": "stories", "value": "memory"},
					{"id": "beats", "value": 85},
					{"id": "pause", "value": "arc"},
					{"id": "art", "value": {"palette": "warm", "tiles": [0, 1, 2, 2, 1, 0]}}
				]
			},
			"civic": {
				"phase": "done",
				"draft": {"topic": "repairs", "format": "circle", "notes": "themes"},
				"result": {"topic": "repairs", "format": "circle", "notes": "themes"}
			},
			"film": {
				"phase": "done",
				"draft": {"framing": "close", "plan": "quiet", "order": ["paint", "seat", "welcome"]},
				"result": {"framing": "close", "plan": "quiet", "order": ["paint", "seat", "welcome"]},
				"captured": ["paint", "seat"]
			}
		},
		"optional": {"voices_bookmark": "tndc"}
	})
	var m4_insp: Dictionary = study.inspect_browser_save_json(browser_m4_edge)
	require(String(m4_insp["civic"]["phase"]) == "done" and String(m4_insp["film"]["phase"]) == "shooting" and (m4_insp["film"]["captured"] as Array) == ["paint", "seat"], "inspect_browser_save_json matches public/film.js by downgrading done film with 2/3 captures to shooting")
	study.reset_mural_state_to_defaults("fresh")
	require(study.import_browser_save_json(browser_m4_edge) and study.civic_phase == "done" and study.film_phase == "shooting" and study.film_captured == ["paint", "seat"] and study.film_next_shot() == "welcome", "import_browser_save_json imports M4 civic done and partial M4 film shooting progress")
	require(not study.voices_enabled and String(study.optional_save_data.get("voices_bookmark", "")) == "tndc", "importing browser save with optional data does not enable M5 Neighborhood Voices")
	require(study.film_capture_shot("welcome") and study.film_phase == "done", "capturing final shot after browser save import completes The Open Seat")
	# Reusable private-browser layout fixture comes from verified native progress.
	var layout_fixture_path := ProjectSettings.globalize_path("res://").path_join("../artifacts/small-hub-chapter6-fixture.json").simplify_path()
	DirAccess.make_dir_recursive_absolute(layout_fixture_path.get_base_dir())
	var layout_fixture := FileAccess.open(layout_fixture_path, FileAccess.WRITE)
	require(layout_fixture != null, "completed native progress can supply the isolated short-layout browser fixture")
	if layout_fixture != null:
		layout_fixture.store_string(JSON.stringify(study.build_save_envelope()))
		layout_fixture.close()

	# M5 Default-Off Experimental Neighborhood Voices lifecycle, generation-scoped cleanup, error/retry, and settings isolation
	var seq_before_voices: int = study.save_seq
	require(study.set_voices_enabled(true) and study.voices_enabled and study.voices_status == "ready" and study.voices_records.size() == 3 and study.voices_checked_at == "2026-10-18", "enabling M5 Neighborhood Voices lazy-loads 3 verified Tenderloin organization profiles")
	require(study.info.text.find("Tenderloin Neighborhood Development Corporation") >= 0 and study.info.text.find("GLIDE") >= 0 and study.info.text.find("Larkin Street Youth Services") >= 0 and study.info.text.find(study.VOICES_DISCLAIMER) >= 0, "enabling M5 Neighborhood Voices presents all 3 organization profiles and non-affiliation disclaimer in header info")
	require(study.last_a11y_announcement.find("Tenderloin Neighborhood Development Corporation") >= 0 and study.last_a11y_announcement.find(study.VOICES_DISCLAIMER) >= 0, "enabling M5 Neighborhood Voices announces all 3 organization profiles and non-affiliation disclaimer to screen readers")
	require(study.save_seq == seq_before_voices and not study.build_save_envelope().has("voices_enabled"), "toggling M5 Neighborhood Voices writes separate settings and does not touch game save_seq or save envelope")
	var active_gen: int = study.voices_generation
	var rel_before_suspend: int = study.voices_release_count
	require(study.suspend_voices() and study.voices_status == "paused" and study.voices_generation == active_gen + 1 and study.voices_records.is_empty() and study.voices_release_count == rel_before_suspend + 1, "suspend_voices sets paused status, increments generation, and releases owned resources")
	require(study.resume_voices() and study.voices_status == "ready" and study.voices_records.size() == 3, "resume_voices reloads M5 Neighborhood Voices records and restores ready status")
	study._notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	require(study.voices_status == "paused" and study.voices_records.is_empty(), "NOTIFICATION_APPLICATION_FOCUS_OUT suspends M5 Neighborhood Voices")
	study._notification(Node.NOTIFICATION_APPLICATION_FOCUS_IN)
	require(study.voices_status == "ready" and study.voices_records.size() == 3, "NOTIFICATION_APPLICATION_FOCUS_IN resumes M5 Neighborhood Voices")
	var rel_before: int = study.voices_release_count
	require(not study.set_voices_enabled(false) and not study.voices_enabled and study.voices_status == "off" and study.voices_records.is_empty() and study.voices_release_count == rel_before + 1, "disabling M5 Neighborhood Voices releases all owned resources")
	study.voices_simulate_error = true
	require(not study.set_voices_enabled(true) and study.voices_enabled and study.voices_status == "error" and not study.voices_error.is_empty(), "simulated load failure places M5 Neighborhood Voices into error state without affecting core play")
	require(study.block_opened and study.civic_phase == "done" and study.film_phase == "done", "M5 Neighborhood Voices load error leaves core M1-M4 block state intact")
	require(study.suspend_voices() and study.voices_status == "error" and not study.resume_voices(), "suspend_voices preserves error status and resume_voices does not auto-retry errored Voices")
	study.voices_simulate_error = false
	require(study.retry_voices_load() and study.voices_status == "ready" and study.voices_records.size() == 3, "retry_voices_load recovers M5 Neighborhood Voices after transient error")
	require(not bool(study.validate_voices_payload("{\"version\":1,\"checkedAt\":\"2026-10-18\",\"records\":[]}").get("ok", true)), "validate_voices_payload rejects empty records array")
	require(not bool(study.validate_voices_payload("{\"version\":1,\"checkedAt\":\"2099-01-01\",\"records\":[]}").get("ok", true)), "validate_voices_payload rejects unverified checkedAt date")
	var unverified_url_json := JSON.stringify({
		"version": 1,
		"checkedAt": "2026-10-18",
		"records": [
			{"id": "tndc", "name": "TNDC", "topic": "Homes", "summary": "Test", "url": "https://evil.example/tndc", "sourceTitle": "TNDC"},
			{"id": "glide", "name": "GLIDE", "topic": "Meals", "summary": "Test", "url": "https://www.glide.org/programs/", "sourceTitle": "GLIDE"},
			{"id": "larkin", "name": "Larkin", "topic": "Youth", "summary": "Test", "url": "https://larkinstreetyouth.org/about/", "sourceTitle": "Larkin"}
		]
	})
	require(not bool(study.validate_voices_payload(unverified_url_json).get("ok", true)), "validate_voices_payload rejects unverified organization URL")
	study.set_voices_enabled(false, false)
	require(not study.voices_enabled and study.load_godot_settings() and study.voices_enabled and study.voices_status == "ready", "load_godot_settings restores persisted voices_enabled preference from separate settings store")
	var slash_ev := InputEventKey.new()
	slash_ev.pressed = true
	slash_ev.keycode = KEY_SLASH
	study._unhandled_input(slash_ev)
	require(not study.voices_enabled and study.voices_status == "off", "KEY_SLASH toggles M5 Neighborhood Voices off")
	study._unhandled_input(slash_ev)
	require(study.voices_enabled and study.voices_status == "ready", "KEY_SLASH toggles M5 Neighborhood Voices on")
	study.clear_godot_settings()
	require(not study.voices_enabled and study.voices_status == "off", "clear_godot_settings resets M5 Neighborhood Voices to default-off")

	# M6 Original SVG builders, consent-aware keepsake export, Dodge Alley Block Concert 3D stage, 145 Leavenworth / 361 Turk 'So What' Easter Egg, and measured local performance
	require(study.get_node_or_null("StreetLifeDecor/DodgeAlleyConcert") != null and study.get_node_or_null("StreetLifeDecor/DodgeAlleyConcert/ConcertHornPlayer") != null and study.get_node_or_null("StreetLifeDecor/DodgeAlleyConcert/ConcertBannerLabel") != null, "Dodge Alley Block Concert 3D stage, jazz combo, and banner label are built in StreetLifeDecor")
	require(study.get_node_or_null("StreetLifeDecor/SoWhatEasterEgg/SoWhatAwning_361Turk") != null and study.get_node_or_null("StreetLifeDecor/SoWhatEasterEgg/EighthFloor_145Leavenworth/EighthFloorWindow") != null, "145 Leavenworth (8th Floor) & 361 Turk 'So What' Musical Awning 3D Easter Egg nodes exist in StreetLifeDecor")
	var shift_h_ev := InputEventKey.new()
	shift_h_ev.pressed = true
	shift_h_ev.shift_pressed = true
	shift_h_ev.keycode = KEY_H
	study._unhandled_input(shift_h_ev)
	require(study.last_a11y_announcement.contains("145 Leavenworth (8th Floor") and study.last_a11y_announcement.contains("361 Turk St") and study.last_a11y_announcement.contains("So What"), "Shift+H inspects 145 Leavenworth (8th Floor) & 361 Turk 'So What' Musical Awning Easter Egg")
	require(study.apply_save_envelope(saved_m4_json) and String(study.keepsake_photo.get("status", "")) == "taken", "restore full M1-M4 save state before M6 SVG and performance tests")
	require(study.xml_escape("<script>&\"'</script>") == "&lt;script&gt;&amp;&quot;&apos;&lt;/script&gt;", "xml_escape escapes all 5 XML special characters")
	require(study.build_keepsake_svg({"status": "unasked", "participants": ["bea"], "mural": study.mural_placements, "palette": "garden", "layout": "table"}) == "", "build_keepsake_svg rejects unasked status")
	require(study.build_keepsake_svg({"status": "taken", "participants": [], "mural": study.mural_placements, "palette": "garden", "layout": "table"}) == "", "build_keepsake_svg rejects empty participants")
	require(study.build_keepsake_svg({"status": "taken", "participants": ["bea", "rook"], "mural": study.mural_placements, "palette": "garden", "layout": "table"}) == "", "build_keepsake_svg rejects non-consenting Rook")
	require(study.build_keepsake_svg({"status": "taken", "participants": ["bea", "bea"], "mural": study.mural_placements, "palette": "garden", "layout": "table"}) == "", "build_keepsake_svg rejects duplicate consenting participant IDs")
	require(study.build_keepsake_svg({"status": "taken", "participants": [123], "mural": study.mural_placements, "palette": "garden", "layout": "table"}) == "", "build_keepsake_svg rejects non-String participant IDs")
	require(study.build_keepsake_svg({"status": "taken", "participants": ["bea"], "mural": study.mural_placements, "palette": "neon", "layout": "table"}) == "", "build_keepsake_svg rejects invalid palette")
	require(study.build_keepsake_svg({"status": "taken", "participants": ["bea"], "mural": study.mural_placements, "palette": "garden", "layout": "roof"}) == "", "build_keepsake_svg rejects invalid layout")
	require(study.build_keepsake_svg({"status": "taken", "participants": ["bea"], "mural": {"sun": {"col": 0, "row": 0}}, "palette": "garden", "layout": "table"}) == "", "build_keepsake_svg rejects incomplete mural")
	var valid_keepsake_svg: String = study.build_keepsake_svg()
	require(valid_keepsake_svg.begins_with("<svg ") and valid_keepsake_svg.ends_with("</svg>") and valid_keepsake_svg.contains("Rook is not pictured.") and valid_keepsake_svg.contains("data-guest=\"bea\"") and valid_keepsake_svg.contains("data-guest=\"dez\"") and not valid_keepsake_svg.contains("data-guest=\"rook\"") and valid_keepsake_svg.contains("86.75204712999698"), "build_keepsake_svg generates consent-aware 640x480 postcard SVG matching public/keepsake.js without Rook")
	require(not bool(study.get_a11y_status_snapshot().get("keepsake_exported", true)) and study.export_keepsake_svg() and study.last_exported_keepsake_svg == valid_keepsake_svg and bool(study.get_a11y_status_snapshot().get("keepsake_exported", false)), "export_keepsake_svg exports keepsake SVG and updates snapshot")
	study.last_exported_keepsake_svg = ""
	var shift_y_ev := InputEventKey.new()
	shift_y_ev.pressed = true
	shift_y_ev.shift_pressed = true
	shift_y_ev.keycode = KEY_Y
	study._unhandled_input(shift_y_ev)
	require(study.last_exported_keepsake_svg == valid_keepsake_svg, "Shift+Y triggers export_keepsake_svg when keepsake_photo status is taken")
	study.keepsake_photo["status"] = "skipped"
	study.keepsake_photo["participants"] = []
	study.epilogue_packing = true
	study.last_exported_keepsake_svg = ""
	var seq_before_skipped_shift_y: int = study.save_seq
	study._unhandled_input(shift_y_ev)
	require(study.last_exported_keepsake_svg == "" and study.save_seq == seq_before_skipped_shift_y and study.last_a11y_announcement == "No keepsake photo to export.", "Shift+Y when keepsake is skipped and packing announces No keepsake photo to export without mutating save_seq")
	require(study.apply_save_envelope(saved_m4_json), "restore saved_m4_json after Shift+Y skipped check")
	var prog_svg: String = study.build_programme_svg(["stories", "beats", "pause", "art"])
	require(prog_svg.begins_with("<svg ") and prog_svg.contains("Stories open the afternoon") and study.build_programme_svg(["beats", "stories", "pause", "art"]) == "", "build_programme_svg generates programme poster SVG and rejects invalid order")
	var tile_svg: String = study.build_tile_panel_svg({"palette": "cool", "tiles": [0, 1, 2, 2, 1, 0]})
	require(tile_svg.begins_with("<svg ") and tile_svg.contains("cool palette") and study.build_tile_panel_svg({"palette": "cool", "tiles": [0, 9, 2, 2, 1, 0]}) == "", "build_tile_panel_svg generates six-tile panel SVG and rejects out-of-range tiles")
	var civic_circle_svg: String = study.build_civic_plan_svg({"topic": "repairs", "format": "circle", "notes": "themes"})
	var civic_dropin_svg: String = study.build_civic_plan_svg({"topic": "access", "format": "dropin", "notes": "none"})
	require(civic_circle_svg.contains("Small listening circle") and civic_dropin_svg.contains("Drop-in notice table") and civic_circle_svg.contains("Clear route") and study.build_civic_plan_svg({"topic": "bad", "format": "circle", "notes": "themes"}) == "", "build_civic_plan_svg generates circle and dropin shared-space plans and rejects invalid plan")
	var film_wide_svg: String = study.build_film_frame_svg({"framing": "wide", "plan": "later", "order": ["seat", "paint", "welcome"]}, "seat")
	var film_close_svg: String = study.build_film_frame_svg({"framing": "close", "plan": "quiet", "order": ["seat", "paint", "welcome"]}, "paint")
	require(film_wide_svg.contains("#c38c65") and not film_close_svg.contains("#c38c65") and study.build_film_frame_svg({"framing": "wide", "plan": "later", "order": ["seat", "paint", "welcome"]}, "invalid") == "", "build_film_frame_svg renders volunteer hands only in wide framing and rejects invalid shot")

	study.set_voices_enabled(true, false)
	require(study.suspend_voices() and study.last_voices_teardown_usec > 0 and study.last_voices_teardown_usec < 50000, "suspend_voices records measured teardown latency under 50ms")
	study.set_voices_enabled(false, false)
	var perf: Dictionary = study.measure_local_performance()
	print("PERF_CHECK ", JSON.stringify(perf))
	var parity_walk_cache: Dictionary = study.cell_walkable_cache.duplicate()
	study.cell_walkable_cache.clear()
	var parity_route: Array = study.find_path(study.neighbor_xz(4), study.blackhawk_xz())
	require(parity_route == [Vector2(11.1, 24.97), Vector2(-6.0, 10.0), Vector2(-424.5, 62.5)] and study.last_astar_expanded_cells == 2222, "priority lookup preserves baseline Black Hawk waypoints and A* tie order")
	study.cell_walkable_cache = parity_walk_cache
	require(int(perf.get("opening_buildings_count", 0)) == 58 and int(perf.get("wider_buildings_count", 0)) == 130 and int(perf.get("total_buildings_count", 0)) == 188 and int(perf.get("street_ways_count", 0)) == 20 and int(perf.get("wider_street_ways_count", 0)) == 41 and bool(perf.get("district_boundary_present", false)), "measure_local_performance verifies 188 buildings, 20 opening / 41 wider street ways, and cultural district mesh")
	require(int(perf.get("pathfind_blackhawk_waypoints", 0)) >= 2 and bool(perf.get("pathfind_cold_cache", false)) and bool(perf.get("astar_used", false)) and int(perf.get("astar_expanded_cells", 0)) > 0 and int(perf.get("pathfind_blackhawk_usec", 999999)) < 250000, "measure_local_performance verifies cold-cache A* Taylor-to-Hyde pathfinding latency under 250ms")
	require(int(perf.get("save_bytes", 0)) > 0 and int(perf.get("save_bytes", 99999)) <= 4096 and int(perf.get("save_roundtrip_usec", 999999)) < 50000, "measure_local_performance verifies full M1-M4 save payload <= 4096 bytes and roundtrip under 50ms")
	require(bool(perf.get("voices_teardown_measured", false)) and int(perf.get("voices_teardown_usec", 0)) > 0 and int(perf.get("voices_teardown_usec", 999999)) < 50000 and bool(perf.get("within_budget", false)), "measure_local_performance verifies M5 teardown and overall M6 performance budget")

	var decor_node: Node3D = study.get_node_or_null("StreetLifeDecor")
	require(decor_node != null and decor_node.get_node_or_null("DodgeAlleyConcert") != null and decor_node.get_node_or_null("SoWhatEasterEgg") != null, "StreetLifeDecor includes DodgeAlleyConcert and SoWhatEasterEgg 3D nodes")
	var museum_node: Node3D = decor_node.get_node_or_null("TenderloinMuseumHub")
	require(museum_node != null and museum_node.get_node_or_null("ArchiveTimePortal") != null and study.portal_ring_meshes.size() == 3 and study.portal_lens_mesh != null, "TenderloinMuseumHub at 398 Eddy (Cadillac Hotel) includes 3-ring ArchiveTimePortal and PortalLens")
	var eateries_node: Node3D = decor_node.get_node_or_null("NeighborhoodEateries")
	require(eateries_node != null and eateries_node.get_child_count() == 6, "NeighborhoodEateries includes all 6 fictional Tenderloin bars and eateries")
	var eatery_names_ok := true
	for e_check in study.NEIGHBORHOOD_EATERIES:
		var e_name := String(e_check.get("name", ""))
		if e_check.has("rating") or e_name.contains("Golden Lotus") or e_name.contains("Midnight Sun") or e_name.contains("Owl"):
			eatery_names_ok = false
	for e_lbl_node in eateries_node.find_children("EateryLabel_*", "Label3D", true, false):
		if not (e_lbl_node as Label3D).text.ends_with("(fictional)") or (e_lbl_node as Label3D).text.contains("/5"):
			eatery_names_ok = false
	require(eatery_names_ok, "fictional eateries avoid real SF business names (Golden Lotus, Midnight Sun, owl-themed bar), show no made-up ratings, and are labeled fictional")
	require(study.inspect_so_what_easter_egg() and study.info.text.contains("145 Leavenworth") and study.info.text.contains("361 Turk St") and study.info.text.contains("So What") and study.last_music_cue == "so_what_egg" and study.reward_banner.visible and study.reward_title_label.text.contains("Found 'So What'!") and study.celebration_burst_node.position.is_equal_approx(study.SO_WHAT_VIEW_TARGET), "inspect_so_what_easter_egg frames 145 Leavenworth 8th Floor & 361 Turk 'So What' awning easter egg and triggers first-time feel-good burst at SO_WHAT_VIEW_TARGET")
	var burst_before_so_what_revisit: int = study.reward_burst_count
	require(study.inspect_so_what_easter_egg() and study.reward_burst_count == burst_before_so_what_revisit, "re-inspecting 'So What' Easter Egg does not duplicate feel-good burst")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "present" and study.info.text.contains("398 Eddy St") and study.info.text.contains("Cadillac Hotel") and study.last_music_cue == "museum_portal" and study.reward_body_label.text.contains("Session era 1/4"), "first inspect_tenderloin_museum_hub call presents 398 Eddy St Cadillac Hotel museum hub and triggers Session era 1/4 museum_portal burst")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "1961_jazz" and study.info.text.contains("1961") and study.reward_body_label.text.contains("Session era 2/4"), "second inspect_tenderloin_museum_hub call channels 1961 Black Hawk & 'So What' Jazz Era and triggers Session era 2/4 museum_portal burst")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "1966_comptons" and study.info.text.contains("1966") and study.reward_body_label.text.contains("Session era 3/4"), "third inspect_tenderloin_museum_hub call channels 1966 Compton's Cafeteria Midnight Neon and triggers Session era 3/4 museum_portal burst")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "1907_cadillac" and study.info.text.contains("1907") and study.reward_body_label.text.contains("Session era 4/4") and study.visited_museum_eras.size() == 4, "fourth inspect_tenderloin_museum_hub call channels 1907 Cadillac Hotel & Great White Way and completes Session era 4/4 museum_portal bursts")
	var burst_before_museum_revisit: int = study.reward_burst_count
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "present" and study.reward_burst_count == burst_before_museum_revisit, "re-channeling an already-visited museum era does not duplicate feel-good burst")
	study.museum_hub_step = 0
	study.active_time_era = "present"
	require(study.cycle_eatery_guide(0) and study.eatery_guide_idx == 0 and study.info.text.contains("Bowl & Basil Pho Counter") and study.info.text.contains("(fictional)") and not study.info.text.contains("/5"), "cycle_eatery_guide(0) frames the fictional Bowl & Basil Pho Counter, with no made-up rating")
	require(study.cycle_eatery_guide() and study.eatery_guide_idx == 1 and study.info.text.contains("Saffron Clay-Oven Naan & Curry") and study.info.text.contains("(fictional)"), "cycle_eatery_guide() advances to the fictional Saffron Clay-Oven Naan & Curry")

	# Rooftop details, SF corner turrets, Muni overhead lines & Boeddeker Park
	var roof_counts: Dictionary = study.rooftop_feature_counts
	require(int(roof_counts.get("parapets", 0)) >= 150 and int(roof_counts.get("lidar_masses", 0)) >= 100 and int(roof_counts.get("water_tanks", 0)) == 0 and int(roof_counts.get("penthouses", 0)) == 0 and int(roof_counts.get("skylights", 0)) == 0 and int(roof_counts.get("vents", 0)) == 0 and int(roof_counts.get("corner_towers", 0)) == 0, "every roof is measured by the 2023 LiDAR: parapets plus measured raised parts, and no rule-placed tanks, penthouses, skylights, vents, or turrets")
	var roof_items_inside := true
	for feat in study.rooftop_feature_points:
		if String(feat.kind) in ["water_tanks", "penthouses", "skylights", "vents"] and study.building_containing_point(feat.xz) != String(feat.id):
			roof_items_inside = false
	require(roof_items_inside, "every rooftop tank, penthouse, skylight, and vent sits inside its own measured footprint")
	var towers_ok: bool = study.corner_tower_sites.size() == int(roof_counts.get("corner_towers", -1))
	for t_id in study.corner_tower_sites:
		var t_site: Dictionary = study.corner_tower_sites[t_id]
		var t_ix: Vector2 = t_site.intersection
		var t_vtx: Vector2 = t_site.vertex
		if t_vtx.distance_to(t_ix) > study.CORNER_TOWER_MAX_CORNER_DIST_M or study.building_containing_point(t_site.center) != String(t_id):
			towers_ok = false
	require(towers_ok, "corner turrets sit on convex footprint corners within 15 m of a real OSM intersection")
	var details_count := 0
	var details_above_roof := true
	for b_list in [[study.meshes, study.data.buildings], [study.wider_meshes, study.data.wider_buildings]]:
		for d_i in range(b_list[0].size()):
			var d_mesh: MeshInstance3D = b_list[0][d_i]
			var det: MeshInstance3D = d_mesh.get_node_or_null(study.ROOFTOP_DETAIL_NODE)
			if det != null:
				details_count += 1
				if det.get_aabb().end.y < float(b_list[1][d_i].height_m) - 0.01:
					details_above_roof = false
	require(details_count >= 150 and details_above_roof, "RooftopDetails child meshes sit on measured roofs while building meshes keep LiDAR heights")
	# 2023 USGS LiDAR roofs and post-2010 buildings (data/lidar_2023.json)
	require(study.lidar_roofs.size() == study.all_buildings.size() and int(roof_counts.get("lidar_masses", 0)) >= 100, "all 188 city footprints have a 2023 LiDAR roof record and raised roof parts are drawn")
	var rule_items_on_lidar := 0
	for feat in study.rooftop_feature_points:
		if String(feat.kind) in ["water_tanks", "penthouses", "skylights", "vents"] and study.lidar_roofs.has(String(feat.id)):
			rule_items_on_lidar += 1
	for t_id in study.corner_tower_sites:
		if study.lidar_roofs.has(String(t_id)):
			rule_items_on_lidar += 1
	require(rule_items_on_lidar == 0, "measured LiDAR roofs replace the rule-placed tanks, penthouses, skylights, vents, and stylized corner turrets")
	var superseded_ok: bool = study.lidar_superseded.size() == 5
	var o_meshes: Array = []
	o_meshes.append_array(study.meshes)
	o_meshes.append_array(study.wider_meshes)
	for o_i in range(study.all_buildings.size()):
		var o_id := String(study.all_buildings[o_i].id)
		var o_mesh: MeshInstance3D = o_meshes[o_i]
		var o_body := o_mesh.get_node_or_null("StaticBody3D")
		if study.is_superseded_building(o_id):
			if o_mesh.visible or o_mesh.get_node_or_null(study.ROOFTOP_DETAIL_NODE) != null or o_body == null or o_body.process_mode != Node.PROCESS_MODE_DISABLED:
				superseded_ok = false
			var o_poly: Dictionary = study.all_buildings[o_i].polygons[0]
			var o_tri: Array = o_poly.triangles
			var o_c := (Vector2(o_poly.vertices[o_tri[0]][0], o_poly.vertices[o_tri[0]][1]) + Vector2(o_poly.vertices[o_tri[1]][0], o_poly.vertices[o_tri[1]][1]) + Vector2(o_poly.vertices[o_tri[2]][0], o_poly.vertices[o_tri[2]][1])) / 3.0
			if study.building_containing_point(o_c) == o_id:
				superseded_ok = false
		elif not o_mesh.visible:
			superseded_ok = false
	require(superseded_ok, "2010 footprints a newer building replaced are hidden, have no roof details, and leave physics and 2D collision")
	var adds_ok: bool = study.get_node_or_null(study.CURRENT_BUILDINGS_NODE) != null and study.lidar_additions.size() == 8 and study.addition_meshes.size() == 8
	var add_names := []
	for a_i in range(study.lidar_additions.size()):
		var a_rec: Dictionary = study.lidar_additions[a_i]
		var a_mesh: MeshInstance3D = study.addition_meshes[a_i]
		add_names.append(String(a_rec.name))
		if a_mesh.get_parent().name != study.CURRENT_BUILDINGS_NODE or not is_equal_approx(a_mesh.get_aabb().size.y, float(a_rec.height_m)) or a_mesh.get_node_or_null("StaticBody3D") == null:
			adds_ok = false
		var a_poly: Dictionary = a_rec.polygons[0]
		var a_tri: Array = a_poly.triangles
		var found_inside := false
		for t_i in range(0, a_tri.size(), 3):
			var a_c := (Vector2(a_poly.vertices[a_tri[t_i]][0], a_poly.vertices[a_tri[t_i]][1]) + Vector2(a_poly.vertices[a_tri[t_i + 1]][0], a_poly.vertices[a_tri[t_i + 1]][1]) + Vector2(a_poly.vertices[a_tri[t_i + 2]][0], a_poly.vertices[a_tri[t_i + 2]][1])) / 3.0
			if study.building_containing_point(a_c) == String(a_rec.id) and not study.is_walkable_point(a_c):
				found_inside = true
				break
		if not found_inside:
			adds_ok = false
	require(adds_ok and "Livat Mall" in add_names and "Serif" in add_names and "361 TL Residences" in add_names and "145 TL Residences" in add_names and "Prism" in add_names, "buildings the 2010 layer lacks or that were rebuilt (Livat Mall, Serif, Prism, TL Residences, 180 Jones, 993 Market, one unnamed) stand on current OSM outlines at their LiDAR height and block walking")
	var egg_ok := true
	for egg in [["StreetLifeDecor/SoWhatEasterEgg/EighthFloor_145Leavenworth", "145 Leavenworth Street", 0.3], ["StreetLifeDecor/SoWhatEasterEgg/SoWhatAwning_361Turk", "361 Turk Street", 1.2]]:
		var egg_node := study.get_node_or_null(egg[0]) as Node3D
		var egg_xz := Vector2(egg_node.position.x, egg_node.position.z) if egg_node != null else Vector2(INF, INF)
		var egg_bld := ""
		for a_rec in study.lidar_additions:
			if String(a_rec.address) == egg[1]:
				egg_bld = String(a_rec.id)
		if egg_node == null or egg_bld == "" or String(study.nearest_building_info(egg_xz).id) != egg_bld or study.min_wall_distance(egg_xz) > float(egg[2]):
			egg_ok = false
	var egg_win := study.get_node_or_null("StreetLifeDecor/SoWhatEasterEgg/EighthFloor_145Leavenworth/EighthFloorWindow") as Node3D
	for a_rec in study.lidar_additions:
		if String(a_rec.address) == "145 Leavenworth Street" and (egg_win == null or egg_win.position.y + 1.075 > float(a_rec.height_m) or egg_win.position.y < float(a_rec.height_m) * 7.0 / 8.0):
			egg_ok = false
	require(egg_ok, "the 145 Leavenworth 8th-floor window sits on the real TL Residences' 8th floor, and the 361 Turk 'So What' awning on its Turk facade")
	var tl_front: Dictionary = study.tl145_front_facade()
	var tl_egg := study.get_node_or_null("StreetLifeDecor/SoWhatEasterEgg/EighthFloor_145Leavenworth") as Node3D
	var tl_win_ok := not tl_front.is_empty() and tl_egg != null and egg_win != null
	if tl_win_ok:
		var w3: Vector3 = tl_egg.transform * egg_win.position
		var w2 := Vector2(w3.x, w3.z)
		var f_south: Vector2 = tl_front.south
		var floor_y: float = study.tl145_row_floor_y(study.TL145_CREATOR_ROW)
		var along := (w2 - Vector2(tl_front.north)).dot(Vector2(tl_front.dir))
		tl_win_ok = study.dist_to_segment_2d(w2, tl_front.north, tl_front.south) < 1.2 and w2.distance_to(f_south) < 3.8 and along > 0.0 and w3.y > floor_y + 0.6 and w3.y < floor_y + 2.0 and w3.y + 1.075 < study.tl145_roof_top()
	require(tl_win_ok, "the creator's apartment window is on the front facade's left (south) bay, 8th window row above the TL145 storefront")
	var dog := study.get_node_or_null("CreatorRooftops/TL145DogPark") as MeshInstance3D
	var play := study.get_node_or_null("CreatorRooftops/CompassRooftopPlayground") as MeshInstance3D
	var roofs_ok := dog != null and play != null and study.get_node_or_null("CreatorRooftops/TL145DogParkLabel") != null and study.get_node_or_null("CreatorRooftops/CompassPlaygroundLabel") != null
	if roofs_ok:
		var d_box := dog.get_aabb()
		var d_c := Vector2(d_box.get_center().x, d_box.get_center().z)
		roofs_ok = d_box.position.y >= study.tl145_roof_top() - 0.01 and study.building_containing_point(d_c) == String(study.tl145_record().id)
		var p_box := play.get_aabb()
		var compass_h := 0.0
		for b_rec in study.all_buildings:
			if String(b_rec.id) == study.COMPASS_ROOF_ID:
				compass_h = float(b_rec.height_m)
		var p_c := Vector2(p_box.get_center().x, p_box.get_center().z)
		roofs_ok = roofs_ok and p_box.position.y >= compass_h - 0.01 and p_box.end.y >= compass_h + 2.6 and study.building_containing_point(p_c) == study.COMPASS_ROOF_ID
	require(roofs_ok, "TL Residences has its rooftop dog park and fire pit, and Compass Children's Center across Leavenworth its canopy-covered rooftop playground")
	var photo_ok := true
	for p_id in study.CREATOR_PHOTO_PALETTES:
		var built: Dictionary = study.built_palettes.get(String(p_id), {})
		var want: Dictionary = study.CREATOR_PHOTO_PALETTES[p_id]
		if built.is_empty() or Color(built.base) != Color(String(want.base)) or Color(built.plinth) != Color(String(want.plinth)):
			photo_ok = false
	require(photo_ok and study.CREATOR_PHOTO_PALETTES.size() == 3, "TL Residences (145 Leavenworth), Kelly Cullen Community, and Page Hotel use the colors from the creator's own photo")
	var sup_idx := -1
	for o_i in range(study.data.buildings.size()):
		if study.is_superseded_building(String(study.data.buildings[o_i].id)):
			sup_idx = o_i
			break
	study.selected = sup_idx - 1
	study.choose_next(1)
	require(study.selected == sup_idx and study.info.text.contains("Replaced") and study.info.text.contains("Serif"), "selecting a replaced 2010 footprint names the building there now")
	study.overview()
	require(study.get_node_or_null("MuniOverheadLines/TrolleyPoles") != null and study.get_node_or_null("MuniOverheadLines/TrolleyWires") != null and study.trolley_pole_points.size() >= 40 and study.trolley_wire_runs >= 20, "Muni trolleybus poles and overhead contact wires run along Turk and Eddy")
	var poles_ok := true
	for pole_xz in study.trolley_pole_points:
		var pole_sd: float = study.min_street_distance(pole_xz)
		if study.building_containing_point(pole_xz) != "" or pole_sd < 5.2 or pole_sd > 7.5 or not (study.nearest_street_name(pole_xz) in study.TROLLEY_STREET_NAMES):
			poles_ok = false
	require(poles_ok, "every trolley pole stands on a Turk/Eddy sidewalk outside all footprints")
	var park_node: Node3D = study.get_node_or_null("BoeddekerPark")
	require(park_node != null and park_node.get_node_or_null("ParkLawn") != null and park_node.get_node_or_null("ParkFurnishings") != null and park_node.get_node_or_null("BoeddekerParkLabel") != null and study.boeddeker_tree_points.size() >= 12, "Boeddeker Park has lawn, fence/path/furnishings, label, and shade trees")
	var park_trees_ok := true
	for tree_xz in study.boeddeker_tree_points:
		if not study.is_point_in_boeddeker_park(tree_xz) or study.building_containing_point(tree_xz) != "":
			park_trees_ok = false
	require(park_trees_ok, "Boeddeker Park trees stand inside the OSM outline and outside all footprints")
	require(study.is_point_in_boeddeker_park(Vector2(-130.0, -115.0)) and not study.is_point_in_boeddeker_park(Vector2(-130.0, -86.0)), "Boeddeker Park outline lies north of the Eddy St centerline, east of Jones")
	require(study.inspect_boeddeker_park() and study.info.text.contains("240 Eddy St") and study.info.text.contains("33619301") and study.last_a11y_announcement.contains("Boeddeker Park") and study.last_music_cue == "boeddeker_park" and study.reward_banner.visible and study.reward_title_label.text.contains("Boeddeker Park") and study.celebration_burst_node.position.is_equal_approx(study.BOEDDEKER_VIEW_TARGET), "inspect_boeddeker_park frames and announces Boeddeker Park with OSM provenance and first-time feel-good burst at BOEDDEKER_VIEW_TARGET")
	study.overview()
	var burst_before_park_revisit: int = study.reward_burst_count
	study.inspect_boeddeker_park()
	require(study.reward_burst_count == burst_before_park_revisit, "re-inspecting Boeddeker Park does not duplicate feel-good burst")
	var park_tap: Vector2 = study.camera.unproject_position(Vector3(study.BOEDDEKER_PARK_ENTRANCE.x, 3.6, study.BOEDDEKER_PARK_ENTRANCE.y))
	require(not study.is_screen_point_in_ui(park_tap), "Boeddeker Park gate label projects outside UI panels when framed")
	study.info.text = ""
	require(study.handle_scene_tap(park_tap) and study.info.text.contains("Boeddeker Park"), "tapping the Boeddeker Park gate label inspects the park")

	# Living streetscape: overhead speech bubbles, light pools, day/evening, tree sway, eatery counters
	study.overview()
	require(not study.is_speech_bubble_visible(), "overview hides speech bubbles")
	var bubble_line: String = study.talk_with_neighbor(0)
	require(study.is_speech_bubble_visible() and study.speech_bubble_anchor == "bea" and study.speech_bubble_text == study.spoken_text_from_line(bubble_line) and not study.speech_bubble_text.begins_with("Bea:") and study.speech_bubble_text.length() > 20, "talk_with_neighbor pops a 3D speech bubble with Bea's spoken words")
	var bea_pos: Vector3 = study.neighbors[0].pos
	require(study.speech_bubble_node.position.distance_to(bea_pos + Vector3.UP * study.SPEECH_BUBBLE_HEIGHT_M) < 0.2, "speech bubble floats above the speaking neighbor")
	require(study.speech_bubble_label.billboard == BaseMaterial3D.BILLBOARD_ENABLED and study.speech_bubble_label.no_depth_test and study.speech_bubble_bg.mesh != null and study.speech_bubble_border.mesh != null, "speech bubble is a billboarded Label3D with background and border meshes")
	study.update_speech_bubble(0.4)
	var vp_h: float = study.bubble_viewport_size().y
	var bubble_screen_w: float = study.speech_bubble_box.x * study.SPEECH_BUBBLE_PIXEL * study.speech_bubble_node.scale.x * vp_h / study.camera.size
	study.zoom(0.8)
	study.update_speech_bubble(0.4)
	var bubble_screen_w2: float = study.speech_bubble_box.x * study.SPEECH_BUBBLE_PIXEL * study.speech_bubble_node.scale.x * vp_h / study.camera.size
	require(bubble_screen_w > 120.0 and bubble_screen_w < study.bubble_viewport_size().x and absf(bubble_screen_w2 - bubble_screen_w) < bubble_screen_w * 0.08, "speech bubble keeps a readable, zoom-independent on-screen width")
	study.update_speech_bubble(30.0)
	require(not study.is_speech_bubble_visible(), "speech bubble fades out after its reading time")
	study.talk_with_celeste()
	require(study.is_speech_bubble_visible() and study.speech_bubble_anchor == "celeste", "talking with Celeste shows her speech bubble")
	study.check_sound_with_rook()
	require(study.is_speech_bubble_visible() and study.speech_bubble_anchor == "rook", "Rook's soundcheck shows his speech bubble")
	study.target = Vector3(-400.0, 0.0, 60.0)
	study.update_speech_bubble(0.1)
	require(not study.is_speech_bubble_visible(), "speech bubble closes when the view moves away from the speaker")
	study.overview()
	require(study.get_node_or_null("StorefrontLightPools") != null and study.light_pool_centers.size() >= 60, "storefront and lamp light pools are built on the sidewalks")
	var pools_ok := true
	for pool_xz in study.light_pool_centers:
		if study.building_containing_point(pool_xz) != "":
			pools_ok = false
	require(pools_ok, "every light pool center lies outside all footprints")
	require(not study.evening_mode and is_equal_approx(study.light_pool_material.albedo_color.a, study.DAY_LIGHT_POOL_ALPHA), "daylight starts with faint light pools")
	var shift_l_ev := InputEventKey.new()
	shift_l_ev.pressed = true
	shift_l_ev.shift_pressed = true
	shift_l_ev.keycode = KEY_L
	study._unhandled_input(shift_l_ev)
	require(study.evening_mode and is_equal_approx(study.light_pool_material.albedo_color.a, 1.0) and study.world_env.ambient_light_energy < 0.6 and study.sun_light.light_energy < 0.6 and study.last_a11y_announcement.contains("Evening"), "Shift+L switches to evening: lower sun and ambient, glowing light pools")
	require(study.meshes[0].material_override == study.building_shader_material and study.wider_meshes[0].material_override == study.building_shader_material and is_equal_approx(float(study.building_shader_material.get_shader_parameter("night_glow")), 1.0), "evening mode lights up the windows through the shared building shader")
	study._unhandled_input(shift_l_ev)
	require(not study.evening_mode and is_equal_approx(study.world_env.ambient_light_energy, 0.72) and is_equal_approx(study.sun_light.light_energy, 1.25), "Shift+L again restores daylight")
	require(is_equal_approx(float(study.building_shader_material.get_shader_parameter("night_glow")), 0.0) and study.glass_flag(Color("ffe494"), true).a < 0.65 and study.glass_flag(Color("ffe494"), false).a > 0.65, "daylight turns the window glow off; glass flags mark lit and unlit windows")
	var plain_l_ev := InputEventKey.new()
	plain_l_ev.pressed = true
	plain_l_ev.keycode = KEY_L
	study._unhandled_input(plain_l_ev)
	require(study.in_wide_overview and not study.evening_mode, "plain L still opens the wide overview")
	study.overview()
	var tree_file: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/street_trees.json"))
	require(String(tree_file.get("source", {}).get("license", "")) == "PDDL 1.0" and study.street_tree_points.size() == tree_file.get("trees", []).size() and study.street_tree_points.size() > 300 and study.get_node_or_null("StreetTrees/StreetTreeCanopyLower") != null and study.get_node_or_null("StreetTrees/StreetTreeTrunks") != null, "every real DataSF street tree record in the modeled area is planted in the scene")
	var trees_ok := true
	for t_i in range(study.street_tree_points.size()):
		var st_xz: Vector2 = study.street_tree_points[t_i]
		var t_rec: Dictionary = tree_file.trees[t_i]
		if study.building_containing_point(st_xz) != "" or st_xz.distance_to(Vector2(float(t_rec.x), float(t_rec.z))) > 0.01 or study.street_tree_ids[t_i] != String(t_rec.id):
			trees_ok = false
		for pole_xz in study.trolley_pole_points:
			if pole_xz.distance_to(st_xz) < 1.5:
				trees_ok = false
	require(trees_ok, "street trees keep their surveyed positions outside every footprint, and schematic trolley poles step aside")
	require(study.street_tree_leaf_color("Sycamore, London Plane", 0) != study.street_tree_leaf_color("Brisbane Box", 0), "street tree canopies are tinted by species")
	var park_canopy: Node3D = study.park_tree_canopies[0]
	var park_rot_before: Vector3 = park_canopy.rotation
	var street_sway_before: Vector2 = study.street_tree_sway_sample
	study.update_tree_sway(0.7)
	var street_sway_after: Vector2 = study.street_tree_sway_sample
	require(not park_canopy.rotation.is_equal_approx(park_rot_before) and not street_sway_after.is_equal_approx(street_sway_before), "park and street tree canopies sway in the wind")
	var calm_xf: Array = study.street_tree_canopy_xforms(0, 0.0, 0.0)
	var gust_xf: Array = study.street_tree_canopy_xforms(0, street_sway_after.x, street_sway_after.y)
	require(absf(park_canopy.rotation.x) < 0.06 and absf(park_canopy.rotation.z) < 0.06 and absf(street_sway_after.x) < 0.06 and absf(street_sway_after.y) < 0.06 and (gust_xf[1] as Transform3D).origin.distance_to((calm_xf[1] as Transform3D).origin) < 0.4, "tree sway stays gentle")
	require(study.get_node_or_null("EateryCounters") != null and study.eatery_counter_nodes.size() == study.NEIGHBORHOOD_EATERIES.size() and study.get_node("StreetLifeDecor/NeighborhoodEateries").get_child_count() == 6, "each eatery has a sidewalk counter set while NeighborhoodEateries keeps its 6 storefronts")
	var counters_ok := true
	for c_i in range(study.eatery_counter_points.size()):
		var c_xz: Vector2 = study.eatery_counter_points[c_i]
		var c_sd: float = study.min_street_distance(c_xz)
		if study.building_containing_point(c_xz) != "" or c_sd < 5.5 or c_sd > 7.2 or study.min_wall_distance(c_xz) < 1.6:
			counters_ok = false
	require(counters_ok, "eatery counters sit on the sidewalk between curb and storefront")
	require(not study.eatery_counter_nodes[3].visible, "an unvisited eatery counter stays tucked away")
	require(study.cycle_eatery_guide(3) and study.eatery_counter_nodes[3].visible and study.is_speech_bubble_visible() and study.speech_bubble_anchor == "eatery:morning_star_banh_mi" and study.speech_bubble_text == String(study.NEIGHBORHOOD_EATERIES[3].name) + " (fictional)\n" + String(study.EATERY_HOST_LINES["morning_star_banh_mi"][0]), "visiting an eatery opens its counter and the host greets in a speech bubble")
	var order_before: int = int(study.eatery_order_counts.get("morning_star_banh_mi", 0))
	var order_sound_before: int = study.reward_sound_count
	require(study.eatery_counter_interact() and int(study.eatery_order_counts.get("morning_star_banh_mi", 0)) == order_before + 1 and study.last_music_cue == "eatery_order" and study.reward_banner.visible and study.reward_title_label.text.contains("Order Up:") and study.info.text.contains("Ordering at Morning Star") and study.info.text.contains("banh mi") and study.speech_bubble_text == String(study.NEIGHBORHOOD_EATERIES[3].name) + " (fictional)\n" + String(study.EATERY_HOST_LINES["morning_star_banh_mi"][1]), "ordering at the counter serves the house item, triggers eatery_order chime and Order Up burst, and the host answers")
	var counter_tap: Vector2 = study.camera.unproject_position(Vector3(study.eatery_counter_points[3].x, 1.3, study.eatery_counter_points[3].y))
	var burst_before_second_order: int = study.reward_burst_count
	require(study.reward_sound_count == order_sound_before + 1, "first eatery order sounds independently of its external banner")
	require(not study.is_screen_point_in_ui(counter_tap) and study.handle_scene_tap(counter_tap) and int(study.eatery_order_counts.get("morning_star_banh_mi", 0)) == order_before + 2 and study.reward_burst_count == burst_before_second_order, "tapping the 3D counter a second time orders the next item without spamming a duplicate feel-good burst")
	require(study.reward_sound_count == order_sound_before + 1, "repeat eatery orders do not replay a reward sound")
	var steam_node: Node3D = null
	for part in study.eatery_anim_parts:
		if int(part.idx) == 0 and String(part.kind) == "steam":
			steam_node = part.node
			break
	require(steam_node != null and study.eatery_counter_nodes[0].visible, "the visited pho counter has steam puffs")
	# Absolute-clock animation needs a current pose before measuring a delta.
	study.update_eatery_animation(0.0)
	var steam_before: Vector3 = steam_node.position
	study.update_eatery_animation(0.4)
	require(not steam_node.position.is_equal_approx(steam_before), "steam rises from the pho bowl on a visited counter")
	study.inspect_tenderloin_museum_hub()
	require(study.is_speech_bubble_visible() and study.speech_bubble_anchor == "museum_docent", "the museum docent speaks in a bubble at the Time-Portal")
	study.overview()
	require(not study.is_speech_bubble_visible(), "overview clears the docent bubble")

	# Field Guide survey overrides (scripts/apply-field-survey.mjs -> FIELD_SURVEY_OVERRIDES)
	var known_ids: Dictionary = {}
	for k_rec in study.all_buildings:
		known_ids[String(k_rec.id)] = true
	var shipped_ok := true
	for s_id in study.FIELD_SURVEY_OVERRIDES:
		if not known_ids.has(String(s_id)):
			shipped_ok = false
	require(shipped_ok, "every shipped FIELD_SURVEY_OVERRIDES key is a measured sf16_bldgid")
	var survey_b: Dictionary = {}
	for cand in study.data.buildings:
		var cand_ring: Array = cand.polygons[0].rings[0]
		if float(cand.height_m) >= 12.0 and absf(study.ring_signed_area(cand_ring)) >= 200.0 and not study.neon_blade_site(cand_ring).is_empty():
			survey_b = cand
			break
	require(not survey_b.is_empty(), "found an opening-block footprint suitable for a survey override test")
	var survey_id := String(survey_b.get("id", ""))
	var saved_overrides: Dictionary = study.field_survey_overrides
	study.field_survey_overrides = {survey_id: {"tags": ["Red Brick", "Terracotta Ornate Trim", "Iron Fire Escape", "Rooftop Water Tank", "Vertical Neon Blade Sign", "Not A Tag"], "base": "#123456", "cornice": "bogus", "source": "building"}}
	var survey_style: Dictionary = study.field_survey_style(survey_id)
	require(survey_style.get("base") == Color("#123456") and survey_style.get("spandrel") == Color("7e3a2e") and survey_style.get("cornice") == Color("b8643f") and bool(survey_style.get("force_fire_escape", false)) and bool(survey_style.get("roof_water_tank", false)) and bool(survey_style.get("neon_blade", false)), "field_survey_style resolves tag colors and flags, explicit facade hex wins, invalid hex is ignored")
	require(study.field_survey_style("201006.9999999").is_empty(), "unsurveyed buildings get no survey style")
	var counts_backup: Dictionary = study.rooftop_feature_counts.duplicate(true)
	var points_backup: int = study.rooftop_feature_points.size()
	var spots_backup: int = study.storefront_light_spots.size()
	var surveyed_built: Dictionary = study.make_building_mesh_and_rect(survey_b, study.vertex_color_material(), Color("d49a6a"))
	var surveyed_palette: Dictionary = study.last_built_palette
	var surveyed_kinds: Dictionary = {}
	for f_i in range(points_backup, study.rooftop_feature_points.size()):
		var f_rec: Dictionary = study.rooftop_feature_points[f_i]
		if String(f_rec.id) == survey_id:
			surveyed_kinds[String(f_rec.kind)] = true
	study.field_survey_overrides = {}
	var plain_built: Dictionary = study.make_building_mesh_and_rect(survey_b, study.vertex_color_material(), Color("d49a6a"))
	var plain_palette: Dictionary = study.last_built_palette
	require(bool(surveyed_palette.get("surveyed", false)) and surveyed_palette.get("base") == Color("#123456") and surveyed_palette.get("cornice") == Color("b8643f") and not bool(plain_palette.get("surveyed", true)) and plain_palette.get("base") != Color("#123456"), "surveyed facade and trim colors are painted onto the rebuilt 3D building")
	require(surveyed_kinds.has("water_tanks") and surveyed_kinds.has("neon_blades"), "surveyed Rooftop Water Tank and Vertical Neon Blade Sign tags add those 3D details")
	var surveyed_mesh: MeshInstance3D = surveyed_built.mesh
	require(is_equal_approx(surveyed_mesh.get_aabb().size.y, float(survey_b.height_m)), "survey overrides keep the measured LiDAR building height")
	surveyed_mesh.queue_free()
	(plain_built.mesh as MeshInstance3D).queue_free()
	study.rooftop_feature_counts = counts_backup
	study.rooftop_feature_points.resize(points_backup)
	study.storefront_light_spots.resize(spots_backup)
	study.overview()
	study.field_survey_overrides = {String(study.data.buildings[0].id): {"tags": ["Red Brick", "Iron Fire Escape"], "source": "stop:stop-01-comptons"}}
	study.choose_next(1)
	require(study.selected == 0 and study.info.text.contains("Field survey (stop:stop-01-comptons): Red Brick, Iron Fire Escape"), "selecting a surveyed building shows its Field Guide tags")
	study.field_survey_overrides = saved_overrides
	study.overview()

	require(is_equal_approx(study.apply_device_pixel_ratio(), 1.0) and is_equal_approx(study.get_tree().root.content_scale_factor, 1.0), "desktop/headless keeps a 1x UI scale; the Web build scales UI by devicePixelRatio")
	require(study.location_phrase(Vector2(study.PLAYER_START.x, study.PLAYER_START.z)) == "On Turk Street, near Taylor Street" and study.street_intersection_streets.size() == study.street_intersections.size(), "the walking header names your street and the nearest real cross street")
	study.player.position = study.PLAYER_START
	study.update_walking_status()
	require(study.info.text.begins_with("On Turk Street, near Taylor Street
") and not study.info.text.contains("Pos ("), "walking status uses plain location words instead of coordinates and footprint IDs")
	# Conversation-first UX: next-step line, guide marker, talk prompt, dialogue choices, goodbye
	require(study.compass_phrase(Vector2.ZERO, Vector2(52.0, 0.0)) == "about 50 m east" and study.compass_phrase(Vector2.ZERO, Vector2(0.0, -300.0)) == "about 2 blocks north" and study.compass_phrase(Vector2.ZERO, Vector2(-150.0, 0.0)) == "about a block west" and study.compass_phrase(Vector2.ZERO, Vector2(4.0, 3.0)) == "right here" and study.compass_phrase(Vector2.ZERO, Vector2(40.0, 40.0)) == "about 60 m southeast", "compass_phrase gives honest metre/block directions (+x east, +z south)")
	study.overview()
	study.reset_mural_state_to_defaults("fresh")
	study.player.position = study.PLAYER_START
	var turns_ok := true
	for t_id in ["bea", "dez", "thanh"]:
		var t_lines: Array = study.neighbor_lines(t_id)
		var uniq: Dictionary = {}
		for tl in t_lines:
			uniq[tl] = true
		if t_lines.size() != 5 or uniq.size() != 5:
			turns_ok = false
	require(turns_ok and String(study.neighbor_lines("bea")[3]).contains("Boeddeker Park is about a block northwest"), "each neighbor has five distinct conversation turns; Bea's park direction is computed from the OSM outline")
	var fresh_obj: Dictionary = study.current_objective()
	require(String(fresh_obj.get("id", "")) == "meet" and int(fresh_obj.get("neighbor", -1)) == 0 and String(fresh_obj.text).begins_with("Meet Bea (0/5"), "a fresh game points you to the nearest neighbor first (Bea)")
	study.update_objective_ui()
	require(study.objective_label.text == "Chapter 1: Get the Block Ready · Next: %s" % String(fresh_obj.text), "the header shows the chapter and the next step")
	study.update_guide_marker()
	var marker_target: Vector3 = fresh_obj.target
	print("GUIDE_FIXTURE ", {"visible": study.guide_marker.visible, "position": study.guide_marker.position, "anchor": study.guide_marker_target, "scale": study.guide_marker.scale, "objective": fresh_obj, "player": study.player.position, "partner": study.talk_partner, "panel": study.block_panel.visible})
	require(study.guide_marker.visible and Vector2(study.guide_marker.position.x, study.guide_marker.position.z).distance_to(Vector2(marker_target.x, marker_target.z)) < 0.01 and is_equal_approx(study.guide_marker_target.y, study.GUIDE_MARKER_LIFT_HIGH) and absf(study.guide_marker.position.y - study.guide_marker_target.y) <= 0.14 * study.guide_marker.scale.y + 0.001, "the gold guide marker uses the high neighbor anchor with its bounded screen-scaled bob")
	var bea_xz: Vector2 = study.neighbor_xz(0)
	study.player.position = Vector3(bea_xz.x + 3.0, 0.0, bea_xz.y)
	study.update_guide_marker()
	require(not study.guide_marker.visible, "the guide marker steps aside once you are next to the target")
	study.hide_speech_bubble()
	study.follow_player()
	study.update_talk_prompt()
	require(study.talk_prompt_node.visible and study.talk_prompt_neighbor == 0 and study.talk_prompt_label.text == "Talk to Bea · T or tap", "standing near Bea shows a 'Talk to Bea · T or tap' prompt")
	study.player.position = study.PLAYER_START
	var t_ev := InputEventKey.new()
	t_ev.pressed = true
	t_ev.keycode = KEY_T
	study._unhandled_input(t_ev)
	require(study.selected_neighbor == 0 or study.arrived_neighbor == 0, "T talks to the nearby neighbor (Bea) instead of walking off to Celeste")
	study.stop_walking()
	var hello_line: String = study.talk_with_neighbor(0)
	require(study.block_panel.visible and study.block_panel_mode == "talk" and study.talk_partner == 0 and study.conv_rows[0].visible and study.conv_rows[1].visible and not study.block_actions_grid.visible and study.block_detail_label.text.contains("Bea:"), "talking opens conversation mode with dialogue choices instead of the full action wall")
	require(study.conv_action_btns[0].text == "Go Meet Celeste" or study.conv_action_btns[0].text.begins_with("Go Meet "), "the first conversation action follows the next objective")
	require(study.conv_action_btns[2].text == "All Block Actions" and study.conv_chat_btn.text == "Keep Chatting (T)" and study.conv_next_btn.text == "What's Next?" and study.conv_bye_btn.text == "Goodbye (Esc)" and not study.is_narrow_layout(), "conversation offers Keep Chatting, What's Next?, Goodbye, and All Block Actions")
	var next_line: String = study.ask_whats_next()
	require(next_line.begins_with("Bea: \"") and next_line.contains("Go say hello!") and study.is_speech_bubble_visible() and study.speech_bubble_anchor == "bea" and study.info.text.contains("gold marker"), "What's Next? has Bea explain the next step in her bubble")
	require(study.keep_chatting() != "" and study.block_panel_mode == "talk", "Keep Chatting continues the conversation")
	study.conv_action_btns[2].grab_focus()
	require(study.run_conversation_action(2) and study.block_panel.visible and study.block_panel_mode == "hub" and study.block_actions_grid.visible and not study.conv_rows[0].visible, "All Block Actions switches to the full action list")
	require(root.gui_get_focus_owner() in study.block_buttons, "conversation-to-actions transition retains a focused hub control")
	study.show_conversation(0)
	var esc_ev := InputEventKey.new()
	esc_ev.pressed = true
	esc_ev.keycode = KEY_ESCAPE
	study._unhandled_input(esc_ev)
	require(not study.block_panel.visible and study.talk_partner == -1 and not study.is_speech_bubble_visible() and study.info.text.contains("You said goodbye to Bea") and study.info.text.contains("Next: "), "Esc says goodbye: panel and bubble close and the next step is shown")
	study.player.position = study.PLAYER_START
	study.follow_player()
	study.target = Vector3(-400.0, 1.0, 60.0)
	study.update_camera()
	study.update_guide_marker()
	study.update_guide_arrow()
	var arrow_area: Rect2 = study.play_area_rect()
	require(study.guide_arrow.visible and not study.guide_marker_target_name.is_empty() and study.guide_marker_target_name != "Bea" and study.guide_arrow_label.text.begins_with(study.guide_marker_target_name + " · ") and study.guide_arrow_label.text.ends_with(" m") and arrow_area.has_point(study.guide_arrow.position), "an edge arrow points to the off-screen next step with name and distance")
	study.target = Vector3(study.guide_marker_target.x, 1.0, study.guide_marker_target.z)
	study.update_camera()
	study.update_guide_arrow()
	require(not study.guide_arrow.visible, "the edge arrow hides once the target is on screen")
	study.show_block_panel(true)
	require(study.block_panel_mode == "hub" and study.block_next_btn.get_theme_stylebox("normal") == study.button_suggest_style and study.block_open_btn.modulate.a < 0.9 and study.block_epilogue_btn.modulate.a < 0.9 and is_equal_approx(study.block_mural_btn.modulate.a, 1.0), "the full action list highlights the suggested step and dims steps that unlock later")
	study.show_block_panel(false)
	require(study.mural_buttons[7].text == "What's Next?" and study.mural_buttons[8].text == "Goodbye (Esc)" and study.music_buttons[5].text == "What's Next?" and study.music_buttons[6].text == "Goodbye (Esc)", "Celeste's and Rook's panels offer What's Next? and the same Goodbye (Esc)")
	var whats_next_btn: Button = study.controls.get_child(0)
	study.overview()
	whats_next_btn.emit_signal("pressed")
	require(whats_next_btn.text == "What's Next?" and (study.info.text.contains("Follow the gold marker") or study.info.text.contains("wander")), "the bottom-bar What's Next? button gives guidance from anywhere")
	require(study.apply_save_envelope(saved_m4_json) and study.block_opened, "restore the full M1-M4 save after the fresh conversation walkthrough")
	var later_obj: Dictionary = study.current_objective()
	require(not String(later_obj.get("text", "")).is_empty() and String(later_obj.get("id", "")) != "meet", "after the block opens, the next step moves on to the afternoon projects")
	study.overview()

	# Story: chapters, story card, and the Long Table / Open Floor gathering choice (docs/CONCEPT.md)
	study.overview()
	study.reset_mural_state_to_defaults("fresh")
	var ch1: Dictionary = study.current_chapter()
	require(int(ch1.num) == 1 and String(ch1.title) == "Get the Block Ready" and String(ch1.intro).contains("fictional") and String(ch1.intro).contains("streets and the history are real"), "Chapter 1 sets up the story and says plainly what is fictional and what is real")
	study.last_story_chapter = 0
	study.update_conversation_ui(0.016)
	require(study.is_story_card_visible() and study.story_title_label.text == "Chapter 1 · Get the Block Ready" and study.story_body_label.text.contains("your neighbors have already started planning"), "a story card introduces the chapter")
	require(study.is_screen_point_in_ui(study.story_card.get_global_rect().get_center()), "taps on the story card never walk the player")
	study.story_continue_btn.emit_signal("pressed")
	require(not study.is_story_card_visible(), "Continue closes the story card")
	for lay_n in study.neighbors:
		study.visited_neighbors[String(lay_n.get("id", ""))] = true
	var lay_obj: Dictionary = study.current_objective()
	require(String(lay_obj.get("id", "")) == "layout" and String(lay_obj.text).contains("Long Table") and String(lay_obj.text).contains("Open Floor"), "after meeting everyone, the next step is choosing the gathering layout")
	require(not study.gathering_layouts_node.visible, "nothing is set up in the street before the choice")
	study.talk_partner = 0
	require(study.ask_whats_next().begins_with("Bea: \"I'd love a Long Table"), "Bea pitches her own Long Table in the first person")
	study.show_conversation(0)
	require(study.conv_action_ids[0] == "layout_table" and study.conv_action_ids[1] == "layout_floor" and study.conv_action_btns[0].text.begins_with("Long Table") and study.conv_action_btns[1].text.begins_with("Open Floor"), "the conversation offers Long Table and Open Floor")
	require(study.run_conversation_action(1) and study.gathering_layout == "floor" and study.layout_floor_node.visible and not study.layout_table_node.visible and String(study.keepsake_photo.get("layout", "")) == "floor" and study.block_panel_mode == "talk", "choosing Open Floor sets it up in 3D and remembers it for the keepsake")
	require(study.last_panel_dialogue.contains("Open Floor it is") and study.last_panel_dialogue.contains("next time"), "the other idea becomes a next-time promise, not a failure")
	require(study.choose_gathering_layout("table") and study.layout_table_node.visible and not study.layout_floor_node.visible and not study.choose_gathering_layout("roof"), "you can change your mind before opening; unknown layouts are rejected")
	var lay_c: Vector2 = study.gathering_layout_center
	var lay_sd: float = study.min_street_distance(lay_c)
	var lay_ix_ok := true
	for ix_pt in study.street_intersections:
		if ix_pt.distance_to(lay_c) < 14.0:
			lay_ix_ok = false
	require(study.building_containing_point(lay_c) == "" and lay_sd > 2.5 and lay_sd < 4.6 and lay_ix_ok, "the gathering sits in a fictional curb-lane closure, leaving the sidewalk route and crosswalks clear")
	var lay_save := JSON.stringify(study.build_save_envelope())
	study.gathering_layout = ""
	require(study.apply_save_envelope(lay_save) and study.gathering_layout == "table", "the layout choice survives save and reload")
	var bad_lay_env: Dictionary = JSON.parse_string(lay_save)
	bad_lay_env["gathering_layout"] = "roof"
	require(study.apply_save_envelope(JSON.stringify(bad_lay_env)) and study.gathering_layout == "" and study.visited_neighbors.size() == 5, "an invalid saved layout is dropped without resetting other progress")
	require(study.choose_gathering_layout("floor"), "choose Open Floor before opening")
	study.place_mural_motif("sun", 1, 0)
	study.place_mural_motif("wave", 3, 1)
	study.place_mural_motif("rise", 5, 2)
	study.rook_soundcheck_done = true
	require(study.open_block_gathering() and study.block_opened and study.gathering_lights_node.visible and study.layout_floor_node.visible and study.last_a11y_announcement.contains("block gathering is open, Open Floor style"), "opening the gathering lights up the chosen Open Floor")
	study.neighbor_talk_counts["bea"] = 4
	require(study.neighbor_greeting_line("bea").contains("Next time we try my Long Table"), "after opening, Bea remembers the promise to try her Long Table next time")
	require(study.take_keepsake_photo() and study.build_keepsake_svg().contains("A little room on the Open Floor"), "the keepsake is titled after the chosen layout")
	study.update_conversation_ui(0.016)
	require(int(study.current_chapter().num) == 2 and study.is_story_card_visible() and study.story_title_label.text == "Chapter 2 · The Gathering", "opening the block starts Chapter 2 with a story card")
	var story_esc := InputEventKey.new()
	story_esc.pressed = true
	story_esc.keycode = KEY_ESCAPE
	study._unhandled_input(story_esc)
	require(not study.is_story_card_visible() and study.block_opened, "Esc closes the story card without doing anything else")
	study.reset_mural_state_to_defaults("fresh")
	for lay_n2 in study.neighbors:
		study.visited_neighbors[String(lay_n2.get("id", ""))] = true
	study.place_mural_motif("sun", 1, 0)
	study.place_mural_motif("wave", 3, 1)
	study.place_mural_motif("rise", 5, 2)
	study.rook_soundcheck_done = true
	require(study.open_block_gathering() and study.gathering_layout == "table" and String(study.keepsake_photo.get("layout", "")) == "table", "opening without choosing defaults to Bea's Long Table")
	require(study.apply_save_envelope(saved_m4_json) and study.block_opened and study.gathering_layout in study.GATHERING_LAYOUTS, "restore the full M1-M4 save after the story walkthrough")
	study.overview()

	# Godot Web default font (Open Sans SemiBold) coverage: no hex-box glyphs in any 3D or UI text
	var web_font: Font = ThemeDB.fallback_font
	var src_text := FileAccess.get_file_as_string("res://main.gd")
	var missing_glyphs: Dictionary = {}
	for ch_i in range(src_text.length()):
		var cp := src_text.unicode_at(ch_i)
		if cp > 127 and not web_font.has_char(cp):
			missing_glyphs["U+%04X" % cp] = true
	require(src_text.length() > 1000 and missing_glyphs.is_empty(), "every non-ASCII character in main.gd exists in the Web default font (missing: %s)" % str(missing_glyphs.keys()))
	var text_nodes: Array[Node] = study.find_children("*", "Label3D", true, false)
	text_nodes.append_array(study.find_children("*", "Label", true, false))
	text_nodes.append_array(study.find_children("*", "Button", true, false))
	var scene_missing: Dictionary = {}
	for tn in text_nodes:
		var t_str: String = tn.text
		for t_i in range(t_str.length()):
			var cp2 := t_str.unicode_at(t_i)
			if cp2 > 127 and not web_font.has_char(cp2):
				scene_missing["U+%04X" % cp2] = true
	require(text_nodes.size() > 30 and scene_missing.is_empty(), "every live Label3D/Label/Button renders in the Web default font (missing: %s)" % str(scene_missing.keys()))

	study.overview()
	var street_screen: Vector2 = study.camera.unproject_position(Vector3(45.0, 0.0, -7.2))
	require(study.handle_scene_tap(street_screen) and study.selected_neighbor == -1, "tapping projected street point in overview starts street route")
	require(not study.current_path.is_empty(), "street tap produces walkable path")

	study.overview()
	require(study.occluded_buildings.is_empty() and study.selected_neighbor == -1 and not study.mural_panel.visible and not study.music_panel.visible and not study.block_panel.visible, "overview clears cutaway, neighbor selection, mural panel, music panel, and block panel")
	for i in range(58):
		require(study.meshes[i].material_override == study.building_materials[i], "overview restores solid neutral building materials")
		var ov_det: Node3D = study.meshes[i].get_node_or_null(study.ROOFTOP_DETAIL_NODE)
		require(ov_det == null or ov_det.visible, "overview restores rooftop details hidden by cutaway")

	# Verify 3D mouse/keyboard camera orbit rotation and reset
	var orig_cam_pos: Vector3 = study.camera.position
	study.rotate_camera_by_delta(0.55, -0.15)
	require(not is_zero_approx(study.camera_yaw) and study.camera.position.distance_to(orig_cam_pos) > 5.0, "rotate_camera_by_delta orbits 3D camera around target")
	study.overview()
	require(is_zero_approx(study.camera_yaw) and is_equal_approx(study.camera_pitch_scale, 1.0), "overview resets camera orbit yaw and pitch")

	# Verify 3D street corridor banners, corner signs, and character stride/gesture animation
	require(study.street_signs_root != null and study.street_signs_root.get_node_or_null("StreetBanner_TurkOpening") != null and study.street_signs_root.get_node_or_null("CornerSign_TurkTaylor") != null, "3D StreetNameSigns corridor banners and opening corner signs exist")
	require(study.nearest_street_name(Vector2(20.0, -9.0)) == "Turk Street", "nearest_street_name identifies Turk Street")
	study.animate_person_node(study.player_visual, 1.2, 1.0, 0.0)
	var l_leg_node := study.player_visual.get_node_or_null("LeftLeg") as MeshInstance3D
	require(l_leg_node != null and not is_zero_approx(l_leg_node.rotation.x), "animate_person_node swings character legs during walking stride")
	study.animate_person_node(study.player_visual, 0.0, 0.0, 0.0)
	require(is_equal_approx(study.player_height_m(), study.PLAYER_HEIGHT_M), "animate_person_node preserves unscaled 1.72m player model")
	var bea_nameplate_screen: Vector2 = study.camera.unproject_position(study.neighbors[0].pos + Vector3(0.0, 4.0, 0.0))
	require(study.handle_scene_tap(bea_nameplate_screen) and study.selected_neighbor == 0, "tapping neighbor upper body / nameplate selects neighbor")
	var bea_line_1: String = study.talk_with_neighbor(0)
	var bea_line_2: String = study.talk_with_neighbor(0)
	require(not bea_line_1.is_empty() and bea_line_1 != bea_line_2 and study.block_panel.visible and study.block_label.text.contains("Talking with Bea") and study.block_detail_label.text.contains("Bea:"), "talk_with_neighbor(0) cycles Bea's natural conversation turns and updates BlockPanel talking header and spoken quote")
	require(study.block_programme_btn.text.contains("Hosted All 4 Events") and study.block_civic_btn.text.contains("Tenant Circle") and study.block_film_btn.text.contains("Watch Film"), "BlockPanel completed action buttons use natural conversational action phrasing")
	study.reset_mural_state_to_defaults("fresh")
	require(study.block_programme_btn.text.contains("Plan Party Schedule") and study.block_civic_btn.text.contains("Hold Tenant Circle") and study.block_film_btn.text.contains("Shoot Short Film"), "BlockPanel fresh action buttons use natural conversational action phrasing")
	# Verify 10 neighborhood surprises (Jeffrey's lost record, 145 Leavenworth hidden mural, impromptu drag show, Viking dirt biker, small cutesy dinosaur, wild woman chef on a magic carpet, bite-sized bags of nachos, good donut & everything bagel, guy with a clown horn, and impromptu Mayor Public Event), Character Talk UI themes/badges/turns/sparks, and feel-good reward bursts
	require(study.surprise_root != null and study.NEIGHBORHOOD_SURPRISE_IDS.size() == 10 and study.surprise_nodes.size() == 10, "NeighborhoodSurprises root builds all 10 neighborhood surprise vignettes")
	for s_id in study.NEIGHBORHOOD_SURPRISE_IDS:
		var s_pt: Vector2 = study.surprise_points.get(s_id, Vector2.ZERO)
		require(study.building_containing_point(s_pt) == "", "neighborhood surprise '%s' sits on open sidewalk outside all 188 building footprints" % s_id)
	require(study.viking_biker_node != null and study.viking_biker_node.get_node_or_null("VikingHelmet") != null and study.viking_bike_mesh != null, "Viking dirt biker surprise includes DirtBike and horned VikingHelmet")
	require(study.cutesy_dino_node != null and study.cutesy_dino_tail_node != null and study.cutesy_dino_node.get_node_or_null("DinoHead") != null, "Small cutesy dinosaur surprise includes DinoHead and wagging DinoTailPivot")
	require(study.magic_carpet_chef_node != null and study.magic_carpet_chef_person != null and study.magic_carpet_chef_person.get_node_or_null("ChefToquePuff") != null, "Wild woman chef surprise includes MagicCarpetRig and ChefZafira with ChefToquePuff")
	require(study.clown_horn_walker_node != null and study.clown_horn_bulb_mesh != null and study.mayor_event_speaker_node != null and study.mayor_fanfare_bugler_node != null and study.mayor_scissors_node != null, "Clown horn walker and impromptu Mayor Public Event surprises build animated props and speakers")
	require(study.jeffrey_turntable_node != null and not study.jeffrey_turntable_node.visible and study.hidden_mural_sketch_node != null and not study.hidden_mural_sketch_node.visible, "JeffreyRecordTurntable on RookSpeaker and HiddenMuralSketchCard on MuralBoard start hidden before discovery")
	require(study.surprise_keepsake_nodes.size() == 10 and study.SURPRISE_KEEPSAKE_META.size() == 10 and study.visible_surprise_keepsake_count() == 0, "all 10 3D surprise keepsake nodes are registered and start hidden before discovery")
	for ks_id in study.NEIGHBORHOOD_SURPRISE_IDS:
		var ks_node: Node3D = study.surprise_keepsake_nodes.get(ks_id, null)
		var ks_meta: Dictionary = study.SURPRISE_KEEPSAKE_META.get(ks_id, {})
		var ks_nb: String = String(ks_meta.get("neighbor", ""))
		require(ks_node != null and not ks_node.visible and ks_node.name == String(ks_meta.get("node", "")) and study.NEIGHBOR_SURPRISE_PAIRS.get(ks_nb, []).has(ks_id), "surprise '%s' has a valid hidden 3D keepsake node matching SURPRISE_KEEPSAKE_META and NEIGHBOR_SURPRISE_PAIRS" % ks_id)
	var hidden_disc_rot: float = study.jeffrey_turntable_disc_mesh.rotation.y
	var hidden_dino_y: float = study.celeste_dino_figurine_node.position.y
	var hidden_carpet_y: float = study.dez_carpet_keepsake_node.position.y
	study.update_people_animation(0.25)
	require(is_equal_approx(study.jeffrey_turntable_disc_mesh.rotation.y, hidden_disc_rot) and is_equal_approx(study.celeste_dino_figurine_node.position.y, hidden_dino_y) and is_equal_approx(study.dez_carpet_keepsake_node.position.y, hidden_carpet_y), "Jeffrey's 1961 vinyl LP, PipDinoMascot, and ZafiraSpiceCarpet do not animate while hidden")
	var pre_sparks: int = study.spark_count()
	var key_shift_d := InputEventKey.new()
	key_shift_d.keycode = KEY_D
	key_shift_d.pressed = true
	key_shift_d.shift_pressed = true
	for s_idx in range(study.NEIGHBORHOOD_SURPRISE_IDS.size()):
		study._unhandled_input(key_shift_d)
		var expected_sid: String = study.NEIGHBORHOOD_SURPRISE_IDS[s_idx]
		var expected_ks_label: String = String(study.SURPRISE_KEEPSAKE_META[expected_sid].get("label", ""))
		var expected_ks_node: Node3D = study.surprise_keepsake_nodes[expected_sid]
		require(study.discovered_surprises.has(expected_sid), "Shift+D discovers surprise '%s'" % expected_sid)
		require(expected_ks_node != null and expected_ks_node.visible and study.visible_surprise_keepsake_count() == s_idx + 1, "discovering surprise '%s' reveals its 3D neighbor keepsake prop (%d/10)" % [expected_sid, s_idx + 1])
		require(study.reward_banner != null and study.reward_banner.visible and study.reward_body_label.text.contains("Sparks:") and study.reward_body_label.text.contains(expected_ks_label) and study.info.text.contains(expected_ks_label) and study.celebration_burst_node != null and study.celebration_burst_node.visible, "discovering surprise '%s' triggers RewardBanner with Sparks count and keepsake label '%s'" % [expected_sid, expected_ks_label])
	require(study.discovered_surprises.size() == 10 and study.visible_surprise_keepsake_count() == 10 and study.spark_count() == pre_sparks + 10, "discovering all 10 neighborhood surprises reveals all 10 3D keepsakes and increments spark_count by 10")
	require(study.reward_title_label.text.contains("10/10 Surprises:") and study.reward_body_label.text.contains("All 10/10 Keepsakes!") and study.last_music_cue == "surprise_finale" and study.cue_arpeggio_freqs.size() == 4 and is_equal_approx(study.cue_arpeggio_duration, 0.68) and is_equal_approx(study.reward_banner_timer, 4.5), "discovering the 10th surprise triggers the 10/10 All Keepsakes grand finale RewardBanner (4.5s) and explicit surprise_finale 4-note ascending C-major octave fanfare")
	study.trigger_feel_good_burst("Order Up: Test", "Test", Vector3.ZERO)
	require(study.reward_title_label.text.contains("10/10 Surprises:") and study.reward_banner_timer > 4.0, "active 4.5s 10/10 grand finale RewardBanner is protected from immediate overwrite by non-finale bursts")
	require(study.jeffrey_turntable_node.visible and study.hidden_mural_sketch_node.visible and is_equal_approx(study.speaker_beacon_mesh.position.y, 1.54), "discovering jeffrey_record and hidden_mural_145 reveals 3D turntable on RookSpeaker (raising SpeakerBeacon above sleeve) and sketch card on MuralBoard")
	var prev_disc_rot: float = study.jeffrey_turntable_disc_mesh.rotation.y
	var prev_tail_rot: float = study.celeste_dino_tail_node.rotation.y
	study.update_people_animation(0.25)
	require(not is_equal_approx(study.jeffrey_turntable_disc_mesh.rotation.y, prev_disc_rot) and not is_equal_approx(study.celeste_dino_tail_node.rotation.y, prev_tail_rot) and study.celeste_dino_figurine_node.position.y >= 0.88 and not is_equal_approx(study.rook_clown_horn_bulb_mesh.scale.x, 1.0), "visible 3D keepsakes (Jeffrey's 1961 LP, PipDinoMascot tail/hop, and BarnabyClownHornClip bulb) animate on update_people_animation")
	for n_mem_id in ["bea", "celeste", "rook", "dez", "thanh"]:
		require(not study.neighbor_surprise_memory_line(n_mem_id).is_empty() and study.neighbor_project_memory_line(n_mem_id).contains(study.neighbor_surprise_memory_line(n_mem_id)), "neighbor '%s' has a personal surprise story reflection" % n_mem_id)
	var burst_before_revisit: int = study.reward_burst_count
	var seq_before_revisit: int = study.save_seq
	study.inspect_neighborhood_surprise("mayor_pomp_event")
	require(study.reward_burst_count == burst_before_revisit and study.save_seq == seq_before_revisit, "re-inspecting an already-discovered surprise does not re-fire reward burst or write save")
	var a11y_surp: Dictionary = study.get_a11y_status_snapshot()
	require(int(a11y_surp.get("surprises_found", -1)) == 10 and int(a11y_surp.get("keepsakes_visible", -1)) == 10 and int(a11y_surp.get("sparks", -1)) == study.spark_count(), "get_a11y_status_snapshot reports surprises_found, keepsakes_visible, and sparks")
	study.talk_with_neighbor(0)
	require(study.block_label.text.contains("Block Organizer") and study.block_label.text.contains("Turn 1/5") and study.block_label.text.contains("Sparks: "), "BlockPanel talking header includes character badge, conversation turn counter, and Sparks count")
	require(study.info.text.contains("Block Mayor") and study.info.text.contains("Baker Mae"), "talking with Bea after discovering her surprises surfaces her surprise reflection in header info")
	for _t_wrap in range(5):
		study.talk_with_neighbor(0)
	require(study.block_label.text.contains("Turn 1/5"), "conversation turn counter wraps back to Turn 1/5 on the 6th talk")
	require(study.character_panel_styles.has("bea") and study.block_panel.get_theme_stylebox("panel") == study.character_panel_styles["bea"], "BlockPanel applies Bea's character-tinted border stylebox when talking")
	var surp_save_json := JSON.stringify(study.build_save_envelope())
	require(surp_save_json.to_utf8_buffer().size() <= 4096, "save envelope with all 10 discovered surprises stays under 4096 bytes")
	require(study.apply_save_envelope(saved_m4_json), "restore full M1-M4 save before testing combined M1-M4 + 10-surprise budget")
	study.history_read = true
	study.blackhawk_discovered = true
	study.end_conversation()
	study.player.position = study.PLAYER_START
	var explore_obj_0: Dictionary = study.current_objective()
	var jeffrey_pt: Vector2 = study.surprise_points.get("jeffrey_record", Vector2.ZERO)
	require(String(explore_obj_0.get("id", "")) == "explore" and bool(explore_obj_0.get("has_target", false)) and String(explore_obj_0.get("surprise_id", "")) == "jeffrey_record" and String(explore_obj_0.get("target_name", "")) == "Jeffrey's Lost 1961 Record" and Vector2(explore_obj_0.target.x, explore_obj_0.target.z).distance_to(jeffrey_pt) < 0.01, "in explore chapter with no active panel or hint, current_objective() targets the first undiscovered surprise (jeffrey_record)")
	study.update_guide_marker()
	study.target = Vector3(study.PLAYER_START.x, 1.0, study.PLAYER_START.z)
	study.view_size = 58.0
	study.update_camera()
	study.update_guide_arrow()
	require(study.guide_marker.visible and Vector2(study.guide_marker.position.x, study.guide_marker.position.z).distance_to(jeffrey_pt) < 0.01 and study.guide_arrow.visible and study.guide_arrow_label.text.begins_with("Jeffrey's Lost 1961 Record · "), "in explore chapter, the 3D gold GuideMarker floats above the target surprise and the off-screen GuideArrow names the surprise and distance")
	study.show_conversation(0)
	var bea_obj: Dictionary = study.current_objective()
	var mayor_pt: Vector2 = study.surprise_points.get("mayor_pomp_event", Vector2.ZERO)
	require(String(bea_obj.get("surprise_id", "")) == "mayor_pomp_event" and Vector2(bea_obj.target.x, bea_obj.target.z).distance_to(mayor_pt) < 0.01, "while talking with Bea in explore chapter, current_objective() targets Bea's first undiscovered paired surprise (mayor_pomp_event)")
	require(study.conv_action_ids[0] == "surprise" and study.conv_action_btns[0].text == "Spot Surprise (0/10)", "in explore chapter with undiscovered surprises at desktop width, conversation offers Spot Surprise (0/10)")
	var bea_explore_hint: String = study.ask_whats_next()
	require(bea_explore_hint.begins_with("Bea: \"Have you spotted Impromptu 'Mayor Public Event' & Ribbon Cutting yet?") and study.last_panel_dialogue == bea_explore_hint and study.last_hinted_surprise_id == "mayor_pomp_event", "ask_whats_next() with Bea in explore chapter gives a personal direction to her first undiscovered paired surprise and locks last_hinted_surprise_id")
	study.end_conversation()
	var post_bye_obj: Dictionary = study.current_objective()
	require(String(post_bye_obj.get("surprise_id", "")) == "mayor_pomp_event" and study.guide_marker.visible and Vector2(study.guide_marker.position.x, study.guide_marker.position.z).distance_to(mayor_pt) < 0.01, "after saying goodbye to Bea, last_hinted_surprise_id keeps GuideMarker locked onto Bea's hinted surprise (mayor_pomp_event) instead of jumping back to jeffrey_record")
	study.show_conversation(0)
	require(study.run_conversation_action(0) and study.discovered_surprises.size() == 1 and study.discovered_surprises.has("mayor_pomp_event") and study.last_hinted_surprise_id == "" and study.bea_mayor_ribbon_node.visible and study.last_panel_dialogue.begins_with("Bea: \"") and study.block_detail_label.text.contains("Block Mayor") and study.block_panel_mode == "talk", "tapping Spot Surprise while talking with Bea discovers her first paired surprise (mayor_pomp_event), clears last_hinted_surprise_id, reveals MayorRibbonRosette on her walker, and immediately displays her surprise reflection in the panel")
	var custom_diag_before_revisit: String = study.last_panel_dialogue
	study.inspect_neighborhood_surprise("mayor_pomp_event")
	require(study.last_panel_dialogue == custom_diag_before_revisit, "re-inspecting an already-discovered surprise does not wipe last_panel_dialogue")
	var first_surp_pt: Vector2 = study.surprise_points.get("mayor_pomp_event", Vector2.ZERO)
	var first_surp_screen: Vector2 = study.camera.unproject_position(Vector3(first_surp_pt.x, 1.8, first_surp_pt.y))
	require(study.play_area_rect().has_point(first_surp_screen), "tapping Spot Surprise keeps camera framed on the discovered surprise inside play_area_rect")
	var one_surp_save := JSON.stringify(study.build_save_envelope())
	require(study.apply_save_envelope(one_surp_save) and study.discovered_surprises.size() == 1 and study.surprise_guide_idx == -1 and study.last_hinted_surprise_id == "", "restoring save with 1 discovered surprise resets surprise_guide_idx to -1 and clears last_hinted_surprise_id")
	study.show_conversation(0)
	require(study.conv_action_btns[0].text == "Spot Surprise (1/10)" and study.run_conversation_action(0) and study.discovered_surprises.size() == 2 and study.discovered_surprises.has("good_donut_and_bagel") and study.bea_treat_box_node.visible, "tapping Spot Surprise (1/10) with Bea after save restore discovers her second paired surprise (good_donut_and_bagel) and reveals BakeryTreatBox on her walker")
	var bea_after_both_hint: String = study.ask_whats_next()
	require(bea_after_both_hint.begins_with("Bea: \"You found both of my favorite block surprises! Next, check out Jeffrey's Lost 1961 Record"), "after finding both of Bea's paired surprises, ask_whats_next() with Bea points to the next undiscovered block surprise")
	require(study.run_conversation_action(0) and study.discovered_surprises.size() == 3 and study.discovered_surprises.has("jeffrey_record") and study.last_panel_dialogue == "" and not study.block_detail_label.text.contains("Next, check out Jeffrey"), "tapping Spot Surprise after Bea's fallback hint discovers jeffrey_record and clears the now-resolved hint from Bea's panel")
	study.last_hinted_surprise_id = "magic_carpet_chef"
	study.show_conversation(0)
	require(String(study.current_objective().get("surprise_id", "")) == "magic_carpet_chef", "opening a neighbor panel whose own pairs are already found preserves last_hinted_surprise_id instead of jumping to global fallback")
	study.show_mural_panel(true)
	require(String(study.current_objective().get("surprise_id", "")) == "hidden_mural_145" and study.cycle_neighborhood_surprise() and study.discovered_surprises.has("hidden_mural_145") and study.hidden_mural_sketch_node.visible and study.last_panel_dialogue.begins_with("Celeste: \"") and study.mural_detail_label.text.contains("145 Leavenworth"), "pressing Shift+D (cycle_neighborhood_surprise) while MuralPanel is open in explore chapter follows current_objective().surprise_id (hidden_mural_145) even if last_hinted_surprise_id was set to another surprise")
	study.show_mural_panel(false)
	study.last_hinted_surprise_id = "cutesy_dino"
	var dino_pt: Vector2 = study.surprise_points.get("cutesy_dino", Vector2.ZERO)
	study.in_overview = false
	study.in_wide_overview = false
	study.target = Vector3(dino_pt.x, 1.8, dino_pt.y)
	study.view_size = 52.0
	study.update_camera()
	study.update_guide_marker()
	var dino_marker_tap: Vector2 = study.camera.unproject_position(Vector3(dino_pt.x, study.GUIDE_MARKER_LIFT_LOW, dino_pt.y))
	require(study.guide_marker.visible and not study.is_screen_point_in_ui(dino_marker_tap) and study.handle_scene_tap(dino_marker_tap) and study.discovered_surprises.has("cutesy_dino") and study.celeste_dino_figurine_node.visible, "tapping the 3D floating GuideMarker height (GUIDE_MARKER_LIFT_LOW) above the active objective surprise vignette inspects and discovers the surprise")
	study.show_conversation(3)
	require(study.run_conversation_action(0) and study.discovered_surprises.size() == 6 and study.discovered_surprises.has("viking_dirt_biker") and study.dez_viking_charm_node.visible and study.block_detail_label.text.contains("Viking helmet"), "tapping Spot Surprise with Dez discovers Dez's paired surprise (viking_dirt_biker), reveals VikingHornCharm on his notebook, and immediately shows Dez's Viking reflection even when M4 film memory exists on Turn 1")
	for lay_n_id in ["bea", "celeste", "rook", "dez", "thanh"]:
		require(not study.layout_memory_line(lay_n_id).is_empty(), "layout_memory_line provides a post-opening layout memory for '%s'" % lay_n_id)
	for s_full_id in study.NEIGHBORHOOD_SURPRISE_IDS:
		study.discovered_surprises[s_full_id] = true
	study.visited_museum_eras.clear()
	study.boeddeker_park_visited = false
	study.so_what_visited = false
	study.eatery_order_counts.clear()
	study.landmark_tour_celebrated = false
	study.update_neighborhood_surprises_3d()
	var explore_obj_all: Dictionary = study.current_objective()
	study.update_guide_marker(explore_obj_all)
	study.update_guide_arrow()
	require(String(explore_obj_all.get("id", "")) == "explore" and bool(explore_obj_all.get("has_target", false)) and explore_obj_all.get("tour_id") == "museum:0" and String(explore_obj_all.get("text", "")).contains("0/12 this session") and study.guide_marker.visible, "all 10 keepsakes unlock session-only tour guidance to the first museum era")
	study.show_conversation(0)
	require(study.conv_action_ids[0] == "landmark_tour" and study.conv_action_btns[0].text == "Visit the Museum" and study.conv_action_ids[1] == "eateries" and study.conv_action_btns[1].text == "Visit Eateries" and study.conv_action_ids[2] == "hub", "all 10 keepsakes offer the next tour stop plus free eatery exploration and All Block Actions")
	study.ask_whats_next()
	require(study.run_conversation_action(0) and study.last_panel_dialogue == "" and study.speech_bubble_anchor == "museum_docent", "tapping Visit the Museum from conversation inspects the Tenderloin Museum Hub and clears stale What's Next prompt")
	require(study.active_time_era == study.TOUR_MUSEUM_ERAS[0], "first guided stop matches the museum's present-day era")
	study.ask_whats_next()
	var prev_eatery_idx: int = study.eatery_guide_idx
	require(study.run_conversation_action(1) and study.last_panel_dialogue == "" and study.eatery_guide_idx != prev_eatery_idx and study.speech_bubble_anchor.begins_with("eatery:"), "tapping Visit Eateries from conversation cycles to the next neighborhood eatery counter and clears stale What's Next prompt")
	study.end_conversation()
	study.celeste_talk_count = 0
	var celeste_post_lines: Dictionary = {}
	for _c_t in range(5):
		var c_tl: String = study.talk_with_celeste()
		celeste_post_lines[c_tl] = true
	require(celeste_post_lines.size() == 5 and study.mural_detail_label != null and study.mural_detail_label.text.contains("145 Leavenworth") and study.mural_detail_label.text.count("145 Leavenworth") == 1 and study.info.text.count("145 Leavenworth") == 1, "Celeste has 5 distinct post-mural conversation turns and Turn 5 does not duplicate her surprise memory in mural_detail_label or info.text")
	var celeste_next: String = study.ask_whats_next()
	require(celeste_next.begins_with("Celeste: \"All 10 keepsakes are yours!") and celeste_next.contains("this session") and study.mural_detail_label.text.begins_with("Celeste: \"") and study.speech_bubble_anchor == "celeste", "Celeste explains the next session tour stop with her own attribution")
	study.end_conversation()
	require(not study.mural_panel.visible and study.info.text.begins_with("You said goodbye to Celeste."), "Goodbye from MuralPanel closes the panel and says goodbye to Celeste")
	study.player.position = Vector3(-50.0, 0.0, 60.0)
	study.arrived_mural = false
	require(study.walk_to_mural() and study.walking_to_mural and not study.current_path.is_empty(), "walk_to_mural from west block starts an in-flight walk to the mural board")
	study.end_conversation()
	require(not study.walking_to_mural and not study.pending_celeste_talk and study.current_path.is_empty(), "end_conversation cancels in-flight walk_to_mural and clears current_path")
	study.rook_talk_count = 0
	var rook_post_lines: Dictionary = {}
	for _r_t in range(5):
		var r_tl: String = study.check_sound_with_rook()
		rook_post_lines[r_tl] = true
	require(rook_post_lines.size() == 5 and study.music_stem_label.text.contains("361 Turk") and study.music_stem_label.text.count("361 Turk") == 1 and study.info.text.count("361 Turk") == 1, "Rook has 5 distinct post-mural conversation turns and Turn 5 does not duplicate his surprise memory in music_stem_label or info.text")
	var rook_next: String = study.ask_whats_next()
	require(rook_next.begins_with("Rook: \"All 10 keepsakes are yours!") and rook_next.contains("this session") and study.music_stem_label.text.contains(rook_next) and study.speech_bubble_anchor == "rook", "Rook explains the next session tour stop with his own attribution")
	study.end_conversation()
	require(not study.music_panel.visible and study.info.text.begins_with("You said goodbye to Rook."), "Goodbye from MusicPanel closes the panel and says goodbye to Rook")
	var full_m4_plus_surprises_json := JSON.stringify(study.build_save_envelope())
	require(full_m4_plus_surprises_json.to_utf8_buffer().size() <= 4096, "full M1-M4 save envelope with all 10 discovered_surprises stays <= 4096 bytes (%d B)" % full_m4_plus_surprises_json.to_utf8_buffer().size())
	var tour_save_before := JSON.stringify(study.build_save_envelope())
	require(int(study.landmark_tour_state().count) == 1, "viewing an eatery does not count as a first order; museum first visit counts")
	study.inspect_boeddeker_park()
	study.inspect_boeddeker_park()
	study.eatery_counter_interact(5)
	study.eatery_counter_interact(5)
	require(int(study.landmark_tour_state().count) == 3 and study.current_objective().tour_id == "museum:1", "out-of-order park/cafe visits count once and preserve earliest unvisited tour stop")
	for _era in range(3):
		require(study.visit_next_landmark(), "guided museum action inspects next unvisited era")
		require(study.active_time_era == study.TOUR_MUSEUM_ERAS[_era + 1], "guided museum ordering matches the actual era")
	require(study.visited_museum_eras.size() == 4 and study.current_objective().tour_id == "so_what" and study.current_objective().target == Vector3(study.SO_WHAT_AWNING_XZ.x, 0.0, study.SO_WHAT_AWNING_XZ.y), "museum eras advance and the previsited park is skipped; Easter egg marker targets the awning")
	require(study.visit_next_landmark() and study.so_what_visited, "guided Easter egg inspection advances tour")
	for _counter in range(5):
		var tour_obj: Dictionary = study.current_objective()
		var counter_idx := int(String(tour_obj.tour_id).get_slice(":", 1))
		var counter_point: Vector2 = study.eatery_counter_points[counter_idx]
		require(tour_obj.target == Vector3(counter_point.x, 0.0, counter_point.y), "eatery marker points to the actual sidewalk counter")
		require(study.visit_next_landmark(), "explicit guided order visits the next fictional cafe")
	require(int(study.landmark_tour_state().count) == 12 and not bool(study.current_objective().has_target), "all 12 session stops complete the tour and remove guidance")
	require(JSON.stringify(study.build_save_envelope()) == tour_save_before, "all tour interactions leave the Godot save envelope byte-for-byte unchanged")
	study.discovered_surprises.erase("jeffrey_record")
	study.reward_banner.visible = false
	study.update_landmark_tour_completion()
	require(not study.landmark_tour_celebrated, "previsited tour stops cannot celebrate until all ten surprises are found")
	study.discovered_surprises["jeffrey_record"] = true
	study.last_reward_title = "10/10 Surprises: finale test"
	study.reward_banner.visible = true
	study.reward_banner_timer = 4.5
	study.update_landmark_tour_completion()
	require(not study.landmark_tour_celebrated and study.last_reward_title.begins_with("10/10"), "tour finale waits for the protected keepsake finale")
	study.update_celebration_burst(4.6)
	require(not study.reward_banner.visible and not study.landmark_tour_celebrated, "expired keepsake banner hides before the tour completion phase of the frame")
	study.update_landmark_tour_completion()
	require(study.landmark_tour_celebrated and study.last_music_cue == "tour_complete" and study.last_reward_title == "Neighborhood Tour Complete!", "tour completion announces and celebrates after earlier banner finishes")
	var tour_bursts: int = study.reward_burst_count
	study.update_landmark_tour_completion()
	require(study.reward_burst_count == tour_bursts and not study.visit_next_landmark(), "completed tour does not award again or dispatch an empty action")
	require(study.apply_save_envelope(tour_save_before) and not study.landmark_tour_celebrated and int(study.landmark_tour_state().count) == 0 and study.visible_surprise_keepsake_count() == 10, "reload resets optional session tour while all ten physical keepsakes remain saved")
	study.talk_with_celeste()
	var old_celeste_hint: String = study.ask_whats_next()
	study.visit_next_landmark()
	require(not study.mural_detail_label.text.contains(old_celeste_hint), "museum visit clears Celeste's completed objective hint")
	study.end_conversation()
	study.check_sound_with_rook()
	var old_rook_hint: String = study.ask_whats_next()
	study.visit_next_landmark()
	require(not study.music_stem_label.text.contains(old_rook_hint), "museum visit clears Rook's completed objective hint")
	study.end_conversation()
	# Actual explore objective beside Bea: reward titles wrap and guide text clears Talk.
	var readable_reward_save: String = JSON.stringify(study.build_save_envelope())
	var readable_surprises: Dictionary = study.discovered_surprises.duplicate()
	var readable_hint: String = study.last_hinted_surprise_id
	study.discovered_surprises.erase("jeffrey_record")
	study.last_hinted_surprise_id = "jeffrey_record"
	for text_size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		root.size = text_size
		await process_frame
		await process_frame
		study.player.position = study.PLAYER_START
		study.set_header_details(false, false)
		study.frame_player_for_walking()
		study.update_celebration_burst(5.0)
		for heading in ["Archive Time-Portal - A neighborhood history session at the former Black Hawk jazz club", "NeighborhoodDiscoveryKeepsakeCelebrationForOurWholeTenderloinCommunity"]:
			study.trigger_feel_good_burst(heading, "Original historical context remains available in Info.", study.target)
			await process_frame
			await process_frame
			require(study.reward_title_label.get_visible_line_count() == study.reward_title_label.get_line_count(), "full smart-wrapped heading including unbroken token stays visible")
		study.update_talk_prompt()
		study.update_guide_marker()
		study.update_readable_scene_labels()
		require((study.reward_banner.visible or study.reward_banner_timer > 0.0) and study.reward_title_label.get_line_count() > 1 and study.reward_title_label.get_visible_line_count() == study.reward_title_label.get_line_count(), "complete long reward title wraps without clipping or remains queued at %s" % text_size)
		require(study.reward_banner.get_global_rect().encloses(study.reward_title_label.get_global_rect()), "wrapped title remains inside the reward banner")
		if not study.reward_banner.visible:
			study.set_header_details(true, false)
			study.layout_reward_banner()
			require(study.info.text.contains(study.reward_title_label.text) and study.info.text.contains(study.reward_body_label.text), "a queued long heading is delivered complete in deliberate Info at this width")
			study.update_celebration_burst(5.0)
			study.set_header_details(false, false)
		require(study.guide_arrow.visible and study.guide_arrow_label.visible, "named objective stays visible during long reward at %s" % text_size)
		verify_scene_overlay_bounds(study, "long reward and guide at %s" % text_size)
		study.update_celebration_burst(5.0)
		study.update_talk_prompt()
		study.update_readable_scene_labels()
		require(study.talk_prompt_node.visible and study.guide_arrow_label.visible, "Talk and named objective return together after reward at %s" % text_size)
		verify_scene_overlay_bounds(study, "guide after reward at %s" % text_size)
		var tall_reward_height: float = study.reward_banner.size.y
		study.trigger_feel_good_burst("Found 'So What'!", "Full addresses remain in Info.", study.target)
		await process_frame
		await process_frame
		require(study.reward_title_label.get_visible_line_count() == 1 and study.reward_banner.size.y < tall_reward_height, "short heading restores compact reward height after a wrapped one")
		study.update_celebration_burst(5.0)
	study.discovered_surprises = readable_surprises
	study.last_hinted_surprise_id = readable_hint
	require(JSON.stringify(study.build_save_envelope()) == readable_reward_save, "text layout does not change saved progress")
	for tap_size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		root.size = tap_size
		await process_frame
		await process_frame
		# Tap fixtures start with transient overlays cleared, as a player can wait for them.
		study.hide_speech_bubble()
		study.update_celebration_burst(4.0)
		study.set_header_details(false, false)
		study.hide_story_card()
		for pitch in [1.0, 0.55]:
			study.update_celebration_burst(4.0)
			study.hide_speech_bubble()
			study.visited_museum_eras = {"present": true, "1961_jazz": true, "1966_comptons": true, "1907_cadillac": true}
			study.boeddeker_park_visited = false
			study.target = Vector3(study.BOEDDEKER_PARK_ENTRANCE.x, 2.0, study.BOEDDEKER_PARK_ENTRANCE.y)
			study.view_size = 96.0
			study.camera_pitch_scale = pitch
			study.in_overview = false
			study.in_wide_overview = false
			study.update_camera()
			study.update_guide_marker()
			var marker_center: Vector3 = study.guide_marker.global_position + Vector3.UP * 0.5 * study.guide_marker.scale.y
			var marker_tap: Vector2 = study.camera.unproject_position(marker_center)
			require(not study.is_screen_point_in_ui(marker_tap) and study.handle_scene_tap(marker_tap) and study.boeddeker_park_visited, "tour marker center activates park at %s pitch %.2f" % [tap_size, pitch])
		study.update_celebration_burst(4.0)
		study.hide_speech_bubble()
		study.so_what_visited = true
		study.eatery_order_counts.clear()
		study.eatery_counter_nodes[0].visible = false
		var first_counter: Vector2 = study.eatery_counter_points[0]
		study.player.position = Vector3(first_counter.x, 0.0, first_counter.y)
		study.target = study.player.position + Vector3.UP * 1.3
		study.view_size = 56.0
		study.update_camera()
		study.update_guide_marker()
		require(study.eatery_counter_nodes[0].visible and not study.guide_marker.visible, "nearby guided counter is visible even when its gold marker hides")
		var tour_counter_tap: Vector2 = study.camera.unproject_position(study.player.position + Vector3.UP * 1.3)
		require(not study.is_screen_point_in_ui(tour_counter_tap) and study.handle_scene_tap(tour_counter_tap) and int(study.eatery_order_counts.get(String(study.NEIGHBORHOOD_EATERIES[0].id), 0)) == 1, "walking to and tapping a fresh tour counter orders directly at %s" % tap_size)
		study.trigger_feel_good_burst("Progress!", "12/12 stops this session\nThanks for exploring!", study.target)
		await process_frame
		await process_frame
		var reward_body_rect: Rect2 = study.reward_body_label.get_global_rect()
		require(study.reward_body_label.get_visible_line_count() >= 2 and study.reward_banner.get_global_rect().encloses(reward_body_rect) and study.play_area_rect().encloses(study.reward_banner.get_global_rect()), "reward detail displays two readable lines within the banner and play area at %s" % tap_size)
		study.visited_museum_eras.clear()
		study.show_conversation(0)
		await process_frame
		await process_frame
		study.visit_next_landmark()
		await process_frame
		await process_frame
		study.update_celebration_burst(4.0)
		study.update_speech_bubble(30.0)
		require(bool(study.get_a11y_status_snapshot().guide_marker_screen.visible), "museum tour marker stays in the play area above the conversation at %s" % tap_size)
		study.end_conversation()
	# Compose the actual captions, host speech and rewards with the tour panel open.
	for overlay_size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		root.size = overlay_size
		study.camera_pitch_scale = 1.0
		study.set_header_details(false, false)
		study.show_conversation(0)
		await process_frame
		await process_frame
		var overlay_save: String = JSON.stringify(study.build_save_envelope())
		for e_i in range(study.NEIGHBORHOOD_EATERIES.size()):
			study.update_celebration_burst(4.0)
			study.set_header_details(false, false)
			study.cycle_eatery_guide(e_i)
			study.hide_speech_bubble()
			await process_frame
			await process_frame
			study.update_readable_scene_labels()
			study.update_celebration_burst(4.0)
			study.update_readable_scene_labels()
			var baseline_ids: Array[String] = []
			var tappable_caption := Rect2()
			for caption in study.visible_scene_captions:
				baseline_ids.append(String(caption.id))
				if int(caption.eatery_index) == e_i:
					tappable_caption = caption.rect
			require(tappable_caption.has_area(), "active eatery has a readable caption before speech at %s stop %d" % [overlay_size, e_i])
			study.eatery_counter_interact(e_i)
			study.trigger_feel_good_burst("A little progress!", "Thanks for exploring this fictional cafe.", study.target)
			await process_frame
			await process_frame
			study.update_speech_bubble(0.4)
			study.update_readable_scene_labels()
			verify_scene_overlay_bounds(study, "%s stop %d during reward" % [overlay_size, e_i])
			var reading_time: float = study.speech_bubble_timer
			if study.speech_bubble_deferred and not study.speech_bubble_in_info:
				study.update_speech_bubble(0.5)
				require(is_equal_approx(study.speech_bubble_timer, reading_time), "hidden host speech retains its full reading time")
			var order_before_overlay: int = int(study.eatery_order_counts.get(String(study.NEIGHBORHOOD_EATERIES[e_i].id), 0))
			if study.reward_banner.visible:
				require(not study.handle_scene_tap(study.reward_banner.get_global_rect().get_center()), "reward banner cannot click through to the scene")
			else:
				require(study.reward_banner_timer > 0.0, "crowded scene retains its reward")
				study.set_header_details(true, false)
				study.layout_reward_banner()
				require(study.info.text.contains(study.reward_title_label.text), "queued reward is complete in deliberately opened Info")
			study.update_celebration_burst(4.0)
			if study.header_details_expanded and not study.speech_opened_info:
				study.set_header_details(false, false)
			study.update_speech_bubble(0.4)
			study.update_readable_scene_labels()
			require((study.is_speech_bubble_visible() or (study.speech_bubble_in_info and study.info.text.contains(study.speech_bubble_text))) and study.speech_bubble_text.contains("(fictional)"), "complete host speech appears in scene or Info after reward at %s stop %d" % [overlay_size, e_i])
			verify_scene_overlay_bounds(study, "%s stop %d after reward" % [overlay_size, e_i])
			if study.is_speech_bubble_visible():
				require(not study.handle_scene_tap(study.speech_bubble_screen_rect().get_center()), "host speech cannot click through to the scene")
			var counter_point: Vector2 = study.eatery_counter_points[e_i]
			var physical_tap: Vector2 = study.camera.unproject_position(Vector3(counter_point.x, 1.3, counter_point.y))
			if study.is_screen_point_in_ui(physical_tap):
				require(not study.handle_scene_tap(physical_tap) and int(study.eatery_order_counts.get(String(study.NEIGHBORHOOD_EATERIES[e_i].id), 0)) == order_before_overlay, "covered counter cannot receive a tap through dialogue")
			else:
				require(study.handle_scene_tap(physical_tap), "uncovered physical counter remains tappable during host dialogue")
				order_before_overlay += 1
			study.update_speech_bubble(30.0)
			await process_frame
			await process_frame
			study.update_readable_scene_labels()
			var restored_ids: Array[String] = []
			for caption in study.visible_scene_captions:
				restored_ids.append(String(caption.id))
			require(restored_ids == baseline_ids, "all previously readable captions return after transients at %s stop %d" % [overlay_size, e_i])
			require(not study.is_screen_point_in_ui(physical_tap) and study.handle_scene_tap(physical_tap), "physical counter is tappable after dialogue at %s stop %d" % [overlay_size, e_i])
			order_before_overlay += 1
			study.update_speech_bubble(30.0)
			study.update_readable_scene_labels()
			var burst_count: int = study.reward_burst_count
			var sound_count: int = study.reward_sound_count
			var tour_count: int = int(study.landmark_tour_state().count)
			var edge_tap: Vector2 = tappable_caption.position + Vector2(5.0, tappable_caption.size.y * 0.5)
			require(study.handle_scene_tap(edge_tap) and int(study.eatery_order_counts.get(String(study.NEIGHBORHOOD_EATERIES[e_i].id), 0)) == order_before_overlay + 1, "outer edge of visible caption orders at its own eatery at %s stop %d" % [overlay_size, e_i])
			require(study.reward_burst_count == burst_count and study.reward_sound_count == sound_count and int(study.landmark_tour_state().count) == tour_count, "repeat caption tap cannot duplicate rewards or tour progress")
		require(JSON.stringify(study.build_save_envelope()) == overlay_save, "overlay layout and repeat orders never mutate the save")
		study.end_conversation()
	study.hide_speech_bubble()
	study.update_celebration_burst(4.0)
	root.size = Vector2i(1100, 760)
	await process_frame
	study.layout_reward_banner()
	require(not study.reward_banner.visible and study.reward_banner_timer <= 0.0, "resizing cannot resurrect an expired reward")
	study.cycle_eatery_guide(0)
	study.update_speech_bubble(0.4)
	var original_speech: String = study.speech_bubble_text
	var wide_wrap: float = study.speech_bubble_label.width
	root.size = Vector2i(320, 667)
	await process_frame
	await process_frame
	study.update_speech_bubble(0.4)
	require(study.speech_bubble_label.width < wide_wrap and study.speech_bubble_text == original_speech and study.play_area_rect().encloses(study.speech_bubble_screen_rect()), "resizing active dialogue rewraps its full text at the same font size")
	study.update_celebration_burst(4.0)
	study.show_conversation(0)
	study.show_speech_bubble("long-dialogue-fixture", study.target, "A complete line for the bounded Info panel. ".repeat(25), 20.0)
	study.announce_a11y_status("Keepsake: a new memory. Neighbor says: " + study.speech_bubble_text)
	await process_frame
	await process_frame
	require(study.speech_bubble_in_info and study.header_details_expanded and study.info.text.begins_with(study.speech_bubble_text), "dialogue too tall for the scene remains complete in scrollable Info")
	require(study.last_a11y_announcement.contains("Keepsake:") and study.last_a11y_announcement.ends_with("Full dialogue in Info."), "Info fallback retains the earned-progress live announcement alongside the dialogue location")
	study.trigger_feel_good_burst("Progress while reading", "Saved progress stays visible above.", study.target)
	require(study.reward_banner.visible and study.play_area_rect().encloses(study.reward_banner.get_global_rect()),"reduced phone chrome leaves usable room for a normal short reward")
	await constrain_reward_headroom_fixture(study)
	await process_frame
	await process_frame
	study.update_celebration_burst(0.0)
	var queued_reward_time: float = study.reward_banner_timer
	print("PHONE_REWARD_DIAG queued area=",study.play_area_rect()," header=",study.header_panel.get_global_rect()," panel=",study.block_panel.get_global_rect()," controls_visible=",study.controls.is_visible_in_tree()," banner=",study.reward_banner.get_global_rect()," visible=",study.reward_banner.visible," speech_owns=",study.speech_opened_info," info=",study.header_details_expanded)
	require(not study.reward_banner.visible and queued_reward_time > 0.0, "reward queues when expanded Info leaves insufficient room")
	study.update_celebration_burst(1.0)
	require(is_equal_approx(queued_reward_time, study.reward_banner_timer), "queued reward retains its display time")
	study.update_speech_bubble(30.0)
	print("PHONE_REWARD_DIAG expired anchor=",study.speech_bubble_anchor," age=",study.speech_bubble_age," timer=",study.speech_bubble_timer," speech_owns=",study.speech_opened_info," info=",study.header_details_expanded)
	require(not study.header_details_expanded, "speech expiry automatically releases only its owned Info")
	await process_frame
	await process_frame
	study.update_celebration_burst(0.0)
	require(study.reward_banner.visible and study.play_area_rect().encloses(study.reward_banner.get_global_rect()), "queued reward appears fully after Info closes")
	root.size=Vector2i(320,667)
	for f in range(4): await process_frame
	study.update_celebration_burst(4.0)
	study.show_speech_bubble("long-replacement-fixture", study.target, "A line kept in Info for replacement. ".repeat(25), 20.0)
	study.update_speech_bubble(0.1)
	require(study.speech_opened_info, "oversized dialogue owns only automatically opened Info")
	study.cycle_eatery_guide(5)
	await process_frame
	await process_frame
	study.update_speech_bubble(0.4)
	study.hide_speech_bubble()
	study.update_readable_scene_labels()
	var replacement_visible := false
	for caption in study.visible_scene_captions:
		replacement_visible = replacement_visible or int(caption.eatery_index) == 5
	require(not study.header_details_expanded and replacement_visible, "replacement releases Info before framing its readable eatery caption")
	study.show_speech_bubble("explicit-info-fixture", study.target, "A full line while Info is chosen. ".repeat(25), 20.0)
	study.update_speech_bubble(0.1)
	study.set_header_details(true, false) # A user/route/hint request takes ownership.
	study.hide_speech_bubble()
	require(study.header_details_expanded, "explicit Info request survives speech cleanup")
	study.trigger_feel_good_burst("Progress in Info", "One more friendly stop.", study.target)
	await constrain_reward_headroom_fixture(study)
	print("PHONE_REWARD_DIAG explicit area=",study.play_area_rect()," header=",study.header_panel.get_global_rect()," panel=",study.block_panel.get_global_rect()," banner=",study.reward_banner.get_global_rect()," visible=",study.reward_banner.visible," speech_owns=",study.speech_opened_info)
	study.update_celebration_burst(0.1)
	require(not study.reward_banner.visible and study.info.text.contains("Progress in Info") and study.info.text.contains("One more friendly stop."), "deliberately expanded Info displays the full reward without covering controls")
	study.show_speech_bubble("shared-info-fixture", study.target, "Full host words sharing Info with a reward. ".repeat(25), 20.0)
	study.update_speech_bubble(0.1)
	study.layout_reward_banner()
	require(study.info.text.count("Progress in Info") == 1 and study.info.text.contains(study.speech_bubble_text), "simultaneous reward and full speech share Info without repeating the reward")
	study.set_header_details(false, false)
	study.update_celebration_burst(4.0)
	study.show_speech_bubble("dismiss-info-fixture", study.target, "A full line that can be dismissed. ".repeat(25), 20.0)
	study.update_speech_bubble(0.1)
	study.set_header_details(false, false)
	study.update_speech_bubble(0.1)
	require(study.speech_bubble_anchor.is_empty(), "closing Info explicitly dismisses its oversized speech")
	study.end_conversation()
	root.size=Vector2i(320,667)
	for f in range(4): await process_frame
	var reset_overlay_save: String = JSON.stringify(study.build_save_envelope())
	study.show_eatery_host_speech(0, "A pending host line.")
	require(study.apply_save_envelope(reset_overlay_save) and study.speech_bubble_anchor.is_empty() and not study.speech_bubble_deferred, "save restore clears pending speech along with session rewards")
	study.show_eatery_host_speech(0, "Another pending host line.")
	study.reset_mural_state_to_defaults("overlay reset fixture")
	require(study.speech_bubble_anchor.is_empty() and not study.speech_bubble_deferred, "fresh reset clears pending speech")
	study.apply_save_envelope(reset_overlay_save)
	root.size = Vector2i(1100, 760)
	study.camera_pitch_scale = 1.0
	await process_frame
	study.inspect_tenderloin_museum_hub()
	study.inspect_tenderloin_museum_hub()
	study.inspect_boeddeker_park()
	study.inspect_so_what_easter_egg()
	study.eatery_counter_interact(0)
	study.reset_mural_state_to_defaults("fresh")
	for reset_counter in study.eatery_counter_nodes:
		require(not reset_counter.visible, "fresh session hides previously opened eatery counters")
	require(study.discovered_surprises.is_empty() and study.visible_surprise_keepsake_count() == 0 and not study.jeffrey_turntable_node.visible and not study.hidden_mural_sketch_node.visible and is_equal_approx(study.speaker_beacon_mesh.position.y, 1.30) and not study.reward_banner.visible and not study.celebration_burst_node.visible and study.visited_museum_eras.is_empty() and not study.boeddeker_park_visited and not study.so_what_visited and study.museum_hub_step == 0 and study.active_time_era == "present" and study.eatery_guide_idx == -1 and study.eatery_order_counts.is_empty() and study.portal_ring_meshes[0].rotation_degrees.is_equal_approx(Vector3(90.0, 0.0, 0.0)), "reset_mural_state_to_defaults clears discovered_surprises, hides all 10 3D surprise keepsakes and reward banner/burst, and resets session landmark tour flags and 3D museum portal")
	require(study.apply_save_envelope(surp_save_json) and study.discovered_surprises.size() == 10 and study.visible_surprise_keepsake_count() == 10 and study.jeffrey_turntable_node.visible and study.hidden_mural_sketch_node.visible and study.surprise_guide_idx == -1, "apply_save_envelope restores all 10 discovered_surprises, all 10 3D surprise keepsakes, and resets surprise_guide_idx")
	study.reset_mural_state_to_defaults("fresh")
	study.overview()

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
		study.wide_overview()
		var w_bounds: Rect2 = study.projected_wider_bounds()
		var w_top: float = study.info.get_parent().get_parent().get_global_rect().end.y
		var w_bottom: float = study.controls.get_global_rect().position.y
		require(w_bounds.position.x >= 11 and w_bounds.end.x <= size.x - 11, "wide_overview preserves all 188 wider Tenderloin footprint edges horizontally at %s" % str(size))
		require(w_bounds.position.y >= w_top and w_bounds.end.y <= w_bottom, "wide_overview stays between UI panels at %s" % str(size))
		study.overview()
		for control in study.controls.get_children():
			var r: Rect2 = control.get_global_rect()
			require(r.size.x >= 44 and r.size.y >= 44, "44px minimum controls")
			require(r.position.x >= 0 and r.end.x <= size.x, "buttons within viewport")
			require(r.position.y >= 0 and r.end.y <= size.y, "buttons vertically visible")
			require(control.focus_mode == Control.FOCUS_ALL and control.has_theme_stylebox_override("focus"), "bottom control buttons have keyboard focus ring stylebox")
		var fitted: float = study.view_size
		study.zoom(1.25)
		require(study.view_size > fitted, "Zoom out from mobile overview must zoom out")
		study.zoom(0.8)
		require(is_equal_approx(study.view_size, fitted), "paired zoom restores fitted size")
		if study.uses_phone_disclosure():
			await phone_accept(study.phone_explore_control)
			verify_phone_tray_targets(study, size)
		var next: Button = study.phone_find_control
		next.grab_focus()
		require(next.has_focus(), "keyboard focus available")
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
		require(next.text == "Find Me" and study.following_player and study.view_size == 45.0 and study.selected == -1, "ui_accept activates Find Me walking view")
		var walk_btn: Button = study.walk_control
		require(study.current_path.is_empty() and walk_btn.text == guided_caption(study), "keyboard Next fixture begins without an active route")
		walk_btn.grab_focus()
		require(walk_btn.has_focus(), "Walk to neighbor button focus available")
		var expected_neighbor: int = int(study.primary_walk_choice().neighbor)
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
		require(study.selected_neighbor == expected_neighbor and (not study.current_path.is_empty() or study.arrived_neighbor == expected_neighbor), "ui_accept on Walk to neighbor activates neighbor route")
		# A held Stop gesture must not become a new walk when the label changes.
		require(study.walk_to_black_hawk() and not study.current_path.is_empty(), "stop-control fixture starts a real distant route")
		require(walk_btn.text == "Stop Walking", "active route exposes Stop Walking at every viewport")
		var stopped_save: String = JSON.stringify(study.build_save_envelope())
		var stopped_camera: Vector3 = study.target
		walk_btn.grab_focus()
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = true
		Input.parse_input_event(accept)
		await process_frame
		var stopped_pos: Vector3 = study.player.position
		require(study.current_path.is_empty() and study.route_mesh.mesh == null and study.walking_to_history_stop == "", "ui_accept stops immediately on press and removes the route")
		require(not study.advance_walk(1.0), "held stop cannot advance a cleared route")
		var echo_enter := InputEventKey.new()
		echo_enter.keycode = KEY_ENTER
		echo_enter.pressed = true
		echo_enter.echo = true
		Input.parse_input_event(echo_enter)
		await process_frame
		require(study.current_path.is_empty(), "held Enter key repeat cannot reactivate Next")
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = false
		Input.parse_input_event(accept)
		await process_frame
		require(study.current_path.is_empty() and study.player.position.is_equal_approx(stopped_pos) and study.target.is_equal_approx(stopped_camera), "releasing Stop never starts a new route or reframes the camera")
		require(walk_btn.text == guided_caption(study) and study.last_a11y_announcement.begins_with("Walking stopped."), "stopping restores the action and announces confirmation")
		require(JSON.stringify(study.build_save_envelope()) == stopped_save, "stopping grants no progress and changes no save fields")
		study.block_opened = false
		study.clear_mural_board()
		study.show_mural_panel(true)
		await process_frame
		await process_frame
		require(study.mural_buttons.size() == 9, "MuralPanel has all 9 interactive buttons")
		var mp_rect: Rect2 = study.mural_panel.get_global_rect()
		require(mp_rect.position.x >= 0 and mp_rect.end.x <= size.x and mp_rect.position.y >= top - 2 and mp_rect.end.y <= bottom + 2, "mural panel fits cleanly between header and bottom controls")
		for m_btn in study.mural_buttons:
			var mr: Rect2 = m_btn.get_global_rect()
			require(mr.size.x >= 44 and mr.size.y >= 44, "44px minimum mural panel buttons")
			require(mr.position.x >= 0 and mr.end.x <= size.x and mr.position.y >= 0 and mr.end.y <= size.y, "mural buttons within viewport")
			require(m_btn.focus_mode == Control.FOCUS_ALL and m_btn.has_theme_stylebox_override("focus"), "mural buttons have keyboard focus ring stylebox")
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
		study.check_sound_with_rook()
		await process_frame
		await process_frame
		require(study.music_panel.visible and not study.mural_panel.visible and not study.block_panel.visible, "check_sound_with_rook opens MusicPanel and hides MuralPanel/BlockPanel")
		require(study.music_buttons.size() == 7, "MusicPanel has all 7 interactive buttons")
		var mus_rect: Rect2 = study.music_panel.get_global_rect()
		var mus_header_end_y: float = study.header_panel.get_global_rect().end.y
		var mus_controls_pos_y: float = study.controls.get_global_rect().position.y
		require(mus_rect.position.x >= 0 and mus_rect.end.x <= size.x and mus_header_end_y <= mus_rect.position.y and mus_rect.end.y <= mus_controls_pos_y, "3-line Rook dialogue header, MusicPanel, and bottom controls do not overlap at %s" % str(size))
		for mus_btn in study.music_buttons:
			var br: Rect2 = mus_btn.get_global_rect()
			require(br.size.x >= 44 and br.size.y >= 44, "44px minimum music panel buttons")
			require(br.position.x >= 0 and br.end.x <= size.x and br.position.y >= 0 and br.end.y <= size.y, "music buttons within viewport")
			require(mus_btn.focus_mode == Control.FOCUS_ALL and mus_btn.has_theme_stylebox_override("focus"), "music buttons have keyboard focus ring stylebox")
		study.stop_music_playback()
		study.music_play_btn.grab_focus()
		require(study.music_play_btn.has_focus(), "music Play button focus available")
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
		require(study.music_playing, "ui_accept on music Play button starts playback")
		study.stop_music_playback()
		for n_item in study.neighbors:
			study.visited_neighbors[String(n_item.get("id", ""))] = true
		study.block_opened = false
		study.update_block_3d()
		study.show_block_panel(true)
		await process_frame
		await process_frame
		require(study.block_panel.visible and not study.mural_panel.visible and not study.music_panel.visible, "show_block_panel opens BlockPanel and hides MuralPanel/MusicPanel")
		require(study.BLOCK_ACTION_COUNT==13 and study.block_buttons.size()==study.BLOCK_ACTION_COUNT+1, "BlockPanel retains twelve original actions, the appended meal, and Close")
		require(study.block_buttons.slice(0,12)==[study.block_open_btn,study.block_next_btn,study.block_epilogue_btn,study.block_programme_btn,study.block_mural_btn,study.block_rook_btn,study.block_west_btn,study.block_civic_btn,study.block_film_btn,study.block_voices_btn,study.block_district_btn,study.block_import_btn] and study.block_buttons[12]==study.block_meal_btn,"original twelve callback indexes retained; meal appended")
		var blk_rect: Rect2 = study.block_panel.get_global_rect()
		var blk_header_end_y: float = study.header_panel.get_global_rect().end.y
		var blk_controls_pos_y: float = study.controls.get_global_rect().position.y
		require(blk_rect.position.x >= 0 and blk_rect.end.x <= size.x and blk_header_end_y <= blk_rect.position.y and blk_rect.end.y <= blk_controls_pos_y, "header, BlockPanel, and bottom controls do not overlap at %s" % str(size))
		if study.uses_paged_block_actions():
			var motifs_before_hub: Dictionary = study.mural_placements.duplicate(true)
			study.mural_placements.clear()
			study.show_block_panel(false)
			study.show_block_panel(true)
			await process_frame
			await process_frame
			require(String(study.current_objective().id) == "mural" and study.block_hub_page == 1 and study.block_mural_btn.is_visible_in_tree(), "opening the phone hub reveals the actual mural objective on page2")
			study.show_conversation(0)
			var hub_slot: int = study.conv_action_ids.find("hub")
			require(hub_slot >= 0, "conversation retains its All Actions entry")
			study.conv_action_btns[hub_slot].grab_focus()
			study.run_conversation_action(hub_slot)
			await process_frame
			await process_frame
			require(study.block_hub_page == 1 and study.block_mural_btn.is_visible_in_tree() and study.block_mural_btn.has_focus(), "conversation-to-hub opens and focuses the actual suggested later-page action")
			study.mural_placements = motifs_before_hub
			study.show_block_panel(false)
			study.show_block_panel(true)
			await process_frame
			await process_frame
			study.hide_story_card()
		var suggested_hub_button: Button = study.hub_button_for_objective(String(study.current_objective().get("id", "")))
		require(suggested_hub_button == null or suggested_hub_button.is_visible_in_tree(), "opening the hub reveals the suggested next action")
		study.block_hub_page = 0
		study.layout_block_action_pages()
		var hub_save: String = JSON.stringify(study.build_save_envelope())
		var hub_position: Vector3 = study.player.position
		var hub_seen: Array[int] = []
		for hub_page in range(study.block_action_page_count() if study.uses_paged_block_actions() else 1):
			study.layout_block_action_pages()
			await process_frame
			await process_frame
			blk_rect = study.block_panel.get_global_rect()
			require(study.header_panel.get_global_rect().end.y <= blk_rect.position.y and blk_rect.end.y <= study.controls.get_global_rect().position.y, "each action page fits between header and walking controls")
			var hub_actions: Array = study.block_action_snapshots()
			require(hub_actions.size() == (mini(4,study.BLOCK_ACTION_COUNT-study.block_hub_page*4) if study.uses_paged_block_actions() else study.BLOCK_ACTION_COUNT), "readable action page count at %s" % size)
			for item in hub_actions:
				hub_seen.append(int(item.id))
				require(bool(item.text_fits), "full action title fits the actual font and button box: %s at %s" % [item.text, size])
			for blk_btn in study.block_buttons:
				if not blk_btn.is_visible_in_tree():
					continue
				var bkr: Rect2 = blk_btn.get_global_rect()
				require(bkr.size.x >= 44 and bkr.size.y >= 44, "44px minimum block panel buttons")
				require(blk_rect.encloses(bkr), "visible action and Close buttons fit inside the bounded panel")
				require(blk_btn.focus_mode == Control.FOCUS_ALL and blk_btn.has_theme_stylebox_override("focus"), "block buttons have keyboard focus ring stylebox")
			require(study.block_close_btn.is_visible_in_tree(), "Close stays available on every action page")
			if study.uses_paged_block_actions() and hub_page < study.block_action_page_count()-1:
				study.block_page_next.grab_focus()
				var page_accept := InputEventAction.new()
				page_accept.action = "ui_accept"
				page_accept.pressed = true
				Input.parse_input_event(page_accept)
				await process_frame
				page_accept.pressed = false
				Input.parse_input_event(page_accept)
				await process_frame
				require(study.block_hub_page == hub_page + 1 and study.block_buttons[(hub_page + 1) * 4].has_focus(), "keyboard page change focuses the first newly visible action")
				require(study.last_a11y_announcement.begins_with("Block actions page %d of %d" % [hub_page + 2,study.block_action_page_count()]), "keyboard paging announces the new page")
		var expected_actions: Array[int] = []
		for action_id in range(study.BLOCK_ACTION_COUNT):
			expected_actions.append(action_id)
		require(hub_seen == expected_actions and study.player.position == hub_position and JSON.stringify(study.build_save_envelope()) == hub_save, "all original actions plus meal reachable once without changing player or save")
		study.change_block_action_page(1)
		require(study.block_hub_page == (study.block_action_page_count()-1 if study.uses_paged_block_actions() else 0), "last page clamps; desktop paging is a no-op")
		study.block_hub_page = 0
		study.layout_block_action_pages()
		await process_frame
		await process_frame
		if size.x == 320:
			var old_titles: Array[String] = []
			var long_titles := ["Open Block Party!", "Visit Next Neighbor", "Gear Returned (3/3)", "Hosted All 4 Events", "Paint w/ Celeste (0/3)", "Soundcheck w/ Rook (OK)", "Black Hawk Site (OK)", "Tenant Circle (Done)", "Roll Camera (Clear)", "Local Stories: Err", "District Border: Off", "Web Save Loaded", "Cook & Share"]
			for action_id in range(study.BLOCK_ACTION_COUNT):
				old_titles.append(study.block_buttons[action_id].text)
				study.block_buttons[action_id].text = long_titles[action_id]
			for state_page in range(study.block_action_page_count()):
				study.block_hub_page = state_page
				study.layout_block_action_pages()
				await process_frame
				await process_frame
				var state_rect: Rect2 = study.block_panel.get_global_rect()
				require(state_rect.end.y <= study.controls.get_global_rect().position.y, "long completed-state labels keep each page above walking controls")
				for entry in study.block_action_snapshots():
					require(bool(entry.text_fits), "long-state title is fully readable: %s" % entry.text)
			for action_id in range(study.BLOCK_ACTION_COUNT):
				study.block_buttons[action_id].text = old_titles[action_id]
			study.block_hub_page = 0
			study.layout_block_action_pages()
		var detail_before: String = study.block_detail_label.text
		var dialogue_before: String = study.last_panel_dialogue
		study.last_panel_dialogue = "Full detail line\n".repeat(18) + "Last action explanation"
		study.update_block_ui()
		await process_frame
		await process_frame
		study.block_detail_label.scroll_to_line(study.block_detail_label.get_line_count() - 1)
		await process_frame
		var hub_scroll: VScrollBar = study.block_detail_label.get_v_scroll_bar()
		require(study.block_detail_label.size.y <= 31 and hub_scroll.value > 0 and is_equal_approx(hub_scroll.value, hub_scroll.max_value - hub_scroll.page), "full hub descriptions remain reachable in a bounded scroll area")
		var old_scroll: float = hub_scroll.value
		study.update_block_ui()
		study.update_block_ui()
		await process_frame
		require(is_equal_approx(hub_scroll.value, old_scroll), "unchanged real detail preserves its reading position")
		study.last_panel_dialogue = dialogue_before
		study.update_block_ui()
		require(study.block_detail_label.text == detail_before, "detail fixture restores the actual prior description")
		if size.x == 1100:
			study.block_west_btn.grab_focus()
			root.size = Vector2i(320, 667)
			await process_frame
			await process_frame
			require(study.block_hub_page == 1 and study.block_west_btn.has_focus() and study.block_west_btn.is_visible_in_tree(), "desktop-to-phone resize keeps the focused later-page action visible")
			root.size = size
			await process_frame
			await process_frame
		study.block_open_btn.grab_focus()
		require(study.block_open_btn.has_focus(), "block Open button focus available")
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
		require(study.block_opened and study.block_banner_node.visible, "ui_accept on block Open button opens block gathering and reveals 3D banner at %s" % str(size))
		study.set_header_details(false, false)
		study.show_conversation(0)
		await process_frame
		await process_frame
		require(not study.info.visible and not study.header_details_expanded, "the header stays compact during conversations at %s" % str(size))
		study.header_details_expanded = true
		study.update_conversation_ui(0.0)
		require(study.info.visible, "Info can reveal descriptions and sources at %s" % str(size))
		var prior_details: String = study.info.text
		study.info.text = "Details and sources\n".repeat(20) + "Final uncertainty and source line"
		await process_frame
		await process_frame
		var details_scroll: VScrollBar = study.info.get_v_scroll_bar()
		require(details_scroll.max_value > details_scroll.page and study.info.size.y <= 91.0, "long Info content scrolls within a bounded panel at %s" % str(size))
		study.info.scroll_to_line(study.info.get_line_count() - 1)
		await process_frame
		require(details_scroll.value > 0 and is_equal_approx(details_scroll.value, details_scroll.max_value - details_scroll.page), "final Info lines remain reachable at %s" % str(size))
		study.info.text = prior_details
		study.header_details_expanded = false
		study.update_conversation_ui(0.0)
		if size.x < 600:
			if study.is_story_card_visible(): await phone_accept(study.story_continue_btn)
			if study.phone_talking() and not study.phone_actions_open: await phone_accept(study.conv_next_btn)
			print("PHONE_CHOICE_DIAG ",size," talk=",study.phone_talking()," actions=",study.phone_actions_open," transition=",study.phone_primary_transition," modal=",study.is_story_card_visible()," row=",study.conv_rows[1].visible," ids=",study.conv_action_ids)
			require(study.conv_action_btns[0].is_visible_in_tree(), "conversation width measurements target a disclosed action")
			require(study.conv_chat_btn.text == "Chat More" and study.conv_bye_btn.text == "Goodbye" and study.conv_action_btns[2].text == "All Actions", "phone layout uses short conversation labels at %s" % str(size))
			var find_w: float = ThemeDB.fallback_font.get_string_size("Find 9/10", HORIZONTAL_ALIGNMENT_CENTER, -1, 13).x
			require(find_w + 16.0 <= study.conv_action_btns[0].size.x, "narrow phone Find 9/10 surprise label fits inside conversation action button width at %s" % str(size))
			var eat_w: float = ThemeDB.fallback_font.get_string_size("Eateries", HORIZONTAL_ALIGNMENT_CENTER, -1, 13).x
			require(eat_w + 16.0 <= study.conv_action_btns[0].size.x, "narrow phone Eateries label fits inside conversation action button width at %s" % str(size))
			study.history_read = false
			study.read_history_stop("comptons")
			var comptons_burst_screen: Vector2 = study.camera.unproject_position(study.celebration_burst_node.position)
			require(study.play_area_rect().has_point(comptons_burst_screen), "3D CelebrationBurst for Compton's projects into visible play_area_rect above bottom panel at %s" % str(size))
			study.show_conversation(0)
			await process_frame
			await process_frame
		study.frame_conversation(0)
		var bea_screen: Vector2 = study.camera.unproject_position(study.neighbors[0].pos + Vector3(0.0, 2.2, 0.0))
		require(study.play_area_rect().has_point(bea_screen), "the conversation camera keeps Bea in the visible 3D area above the panel at %s" % str(size))
		var conv_rect: Rect2 = study.block_panel.get_global_rect()
		require(study.header_panel.get_global_rect().end.y <= conv_rect.position.y and panel_clears_walking(study, study.block_panel), "header, conversation panel, and bottom controls do not overlap at %s" % str(size))
		for c_btn in study.conv_buttons:
			if c_btn.visible:
				var cbr: Rect2 = c_btn.get_global_rect()
				require(cbr.size.x >= 44 and cbr.size.y >= 44 and cbr.position.x >= 0 and cbr.end.x <= size.x and cbr.end.y <= size.y, "conversation buttons are >= 44px and on screen at %s" % str(size))
				require(c_btn.focus_mode == Control.FOCUS_ALL and c_btn.has_theme_stylebox_override("focus"), "conversation buttons have keyboard focus rings")
		study.conv_next_btn.grab_focus()
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
		require(study.last_panel_dialogue.begins_with("Bea: \""), "ui_accept on What's Next? asks Bea for the next step at %s" % str(size))
		study.overview()
	for start_size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		study.stop_music_playback()
		root.size = start_size
		study.overview()
		await process_frame
		await process_frame
		study.show_story_card(study.current_chapter(), true)
		var start_position: Vector3 = study.player.position
		var start_save: String = JSON.stringify(study.build_save_envelope())
		study.story_continue_btn.emit_signal("pressed")
		await process_frame
		await process_frame
		require(not study.in_overview and study.following_player and study.view_size <= 58.0 and study.play_area_rect().has_point(study.camera.unproject_position(study.player.position + Vector3.UP)), "Start frames the avatar in usable scene at %s" % start_size)
		require(study.music_playing and not study.music_toggle_btn.disabled and study.music_toggle_btn.size.x >= 44 and study.music_toggle_btn.size.y >= 44 and study.header_panel.size.y <= 130, "default music has an immediate visible pause control in a compact header")
		require(study.player.position == start_position and JSON.stringify(study.build_save_envelope()) == start_save, "orientation never moves the player or changes progress")
		require(study.progress_label.visible and study.progress_label.text.contains("Sparks:") and study.progress_label.text.contains("Keepsakes:"), "persistent score remains visible after Start")
		var later_target: Vector3 = study.target
		study.show_story_card(study.current_chapter())
		study.story_continue_btn.emit_signal("pressed")
		require(study.target == later_target, "later chapter Continue preserves camera framing")
		study.show_conversation(0)
		study.show_neighbor_speech(0, "Bea: \"See you on the sidewalk.\"")
		var find_me_route: Array = study.current_path.duplicate()
		var find_me_music: bool = study.music_playing
		var find_me_save: String = JSON.stringify(study.build_save_envelope())
		study.frame_player_for_walking()
		require(not study.any_side_panel_visible() and not study.is_speech_bubble_visible() and study.talk_partner == -1 and study.current_path == find_me_route and study.music_playing == find_me_music and JSON.stringify(study.build_save_envelope()) == find_me_save, "Find Me clears conversation overlays while preserving route, music and progress")
		study.overview()
		require(study.in_overview, "Map Overview remains available after Start")
		study.stop_music_playback()
	# Activity instructions, final lines and errors must remain reachable in a bounded panel.
	var activity_original_dialogue: String = study.last_panel_dialogue
	var activity_original_error: String = study.music_error
	var activity_save: String = JSON.stringify(study.build_save_envelope())
	var activity_position: Vector3 = study.player.position
	for activity_width in [320, 390, 600, 800, 1000, 1100]:
		root.size = Vector2i(activity_width, 667)
		await process_frame
		await process_frame
		for activity_kind in ["mural", "music"]:
			var detail: RichTextLabel
			var activity_panel: Control
			var activity_buttons: Array[Button]
			var activity_focus: Vector3
			var hidden_panel_rect: Rect2
			if activity_kind == "mural":
				study.show_mural_panel(false)
				study.focus_mural_camera()
				hidden_panel_rect = study.mural_panel.get_global_rect()
				var celeste_pos: Vector3 = study.neighbors[study.celeste_index].pos
				activity_focus = Vector3((celeste_pos.x + study.MURAL_POS.x) * 0.5, 1.4, (celeste_pos.z + study.MURAL_POS.z) * 0.5)
				study.show_mural_panel(true)
				study.last_panel_dialogue = 'Celeste: "' + 'Original portable mural instructions. '.repeat(16) + 'Final mural instruction."'
				study.update_mural_ui()
				detail = study.mural_detail_label
				activity_panel = study.mural_panel
				activity_buttons = study.mural_buttons
			else:
				study.music_error = 'Cannot decode this local track. '.repeat(16) + 'Final error explanation.'
				study.show_music_panel(false)
				study.focus_speaker_camera()
				hidden_panel_rect = study.music_panel.get_global_rect()
				var rook_pos: Vector3 = study.neighbors[study.rook_index].pos
				activity_focus = Vector3((rook_pos.x + study.ROOK_SPEAKER_POS.x) * 0.5, 1.2, (rook_pos.z + study.ROOK_SPEAKER_POS.z) * 0.5)
				study.show_music_panel(true)
				detail = study.music_stem_label
				activity_panel = study.music_panel
				activity_buttons = study.music_buttons
			await process_frame
			await process_frame
			var activity_rect: Rect2 = activity_panel.get_global_rect()
			require(activity_rect == hidden_panel_rect and study.play_area_rect().has_point(study.camera.unproject_position(activity_focus)), "production hidden-focus-show order keeps the real activity subject above its stable panel")
			require(activity_rect.position.y >= study.header_panel.get_global_rect().end.y and activity_rect.end.y <= study.controls.get_global_rect().position.y, "activity details preserve header and walking controls at %d" % activity_width)
			require(study.play_area_rect().size.y >= 140, "activity descriptions leave a useful scene area")
			var activity_font: Font = detail.get_theme_font("normal_font")
			var two_line_height: float = activity_font.get_height(detail.get_theme_font_size("normal_font_size")) * 2.0 + detail.get_theme_constant("line_separation") + detail.get_theme_stylebox("normal").get_minimum_size().y
			require(detail.size.y >= two_line_height and detail.size.y <= 50 and activity_rect.encloses(detail.get_global_rect()), "two real font lines fit without unbounded description growth")
			var activity_snapshot: Dictionary = study.activity_detail_snapshot(detail, activity_panel, activity_buttons)
			for activity_button in activity_snapshot.buttons:
				require(bool(activity_button.text_fits) and activity_button.width >= 44 and activity_button.height >= 44, "full activity button title fits at %d: %s" % [activity_width, activity_button.text])
			if activity_kind == "mural":
				var placed_before: Dictionary = study.mural_placements.duplicate(true)
				var motif_before: String = study.active_motif
				study.mural_placements.clear()
				for selected_motif in ["sun", "wave", "rise"]:
					study.active_motif = selected_motif
					study.update_mural_ui()
					await process_frame
					await process_frame
					for empty_button in study.activity_detail_snapshot(detail, activity_panel, activity_buttons).buttons:
						require(bool(empty_button.text_fits), "empty/selected motif title fits at %d: %s" % [activity_width, empty_button.text])
				study.mural_placements = placed_before
				study.active_motif = motif_before
				study.update_mural_ui()
				await process_frame
			var detail_scroll: VScrollBar = detail.get_v_scroll_bar()
			require(detail.scroll_active and detail.focus_mode == Control.FOCUS_ALL and detail.has_theme_stylebox_override("focus") and detail_scroll.max_value > detail_scroll.page, "long %s details are focusable and scrollable at %d" % [activity_kind, activity_width])
			if activity_width == 320:
				var gesture_target: Vector3 = study.target
				var gesture_zoom: float = study.view_size
				var finger_start: Vector2 = detail.get_global_rect().get_center() + Vector2(0.0, 10.0)
				var touch_detail := InputEventScreenTouch.new()
				touch_detail.index = 17
				touch_detail.position = finger_start
				touch_detail.pressed = true
				Input.parse_input_event(touch_detail)
				await process_frame
				var drag_detail := InputEventScreenDrag.new()
				drag_detail.index = 17
				drag_detail.position = finger_start - Vector2(0.0, 20.0)
				drag_detail.relative = Vector2(0.0, -20.0)
				Input.parse_input_event(drag_detail)
				await process_frame
				touch_detail.pressed = false
				touch_detail.position = drag_detail.position
				Input.parse_input_event(touch_detail)
				await process_frame
				require(is_equal_approx(detail_scroll.value, 20.0), "real finger drag scrolls the activity body exactly once without routing/zooming")
				require(study.target == gesture_target and study.view_size == gesture_zoom and study.player.position == activity_position, "finger reading never pans, zooms or moves the character")
			detail.scroll_to_line(detail.get_line_count() - 1)
			await process_frame
			require(detail_scroll.value > 0 and is_equal_approx(detail_scroll.value, detail_scroll.max_value - detail_scroll.page), "the final %s line is reachable at %d" % [activity_kind, activity_width])
			var reading_position: float = detail_scroll.value
			if activity_kind == "mural":
				study.update_mural_ui()
				study.update_mural_ui()
			else:
				study.update_music_ui()
				study.update_music_ui()
			await process_frame
			require(is_equal_approx(detail_scroll.value, reading_position), "unchanged periodic refresh preserves activity reading position")
			study.set_activity_detail(detail, "New explanation")
			await process_frame
			require(is_zero_approx(detail_scroll.value), "a changed explanation starts from its first line")
			activity_buttons[-1].grab_focus()
			var close_activity := InputEventAction.new()
			close_activity.action = "ui_accept"
			close_activity.pressed = true
			Input.parse_input_event(close_activity)
			await process_frame
			close_activity.pressed = false
			Input.parse_input_event(close_activity)
			await process_frame
			require(not activity_panel.visible, "real ui_accept on Close exits the activity panel")
	study.last_panel_dialogue = activity_original_dialogue
	study.music_error = activity_original_error
	study.update_mural_ui()
	study.update_music_ui()
	require(study.player.position == activity_position and JSON.stringify(study.build_save_envelope()) == activity_save, "reading and closing activity details change neither walking nor progress")
	# Real activity arrivals: overlays respect the enlarged player without panning.
	for clearance_width in [320, 390, 600, 1100]:
		root.size = Vector2i(clearance_width, 667)
		await process_frame
		await process_frame
		for clearance_kind in ["mural", "music"]:
			study.hide_speech_bubble()
			study.reward_banner_timer = 0.0
			study.layout_reward_banner()
			study.set_header_details(false, false)
			study.show_mural_panel(false)
			study.show_music_panel(false)
			var stand: Vector2 = study.mural_stand_xz() if clearance_kind == "mural" else study.speaker_stand_xz()
			study.player.position = Vector3(stand.x, 0.0, stand.y)
			if clearance_kind == "mural":
				study.focus_mural_camera()
				study.show_mural_panel(true)
			else:
				study.focus_speaker_camera()
				study.show_music_panel(true)
			await process_frame
			await process_frame
			var body: Rect2 = study.player_overlay_rect()
			require(body.has_area() and body.intersects(study.play_area_rect()), "arrival fixture projects the real player into the activity scene")
			for phase in [0.0, 0.8, 1.6, 3.14, 4.7]:
				study.animate_person_node(study.player_visual, phase, 1.0, 0.55)
				for mesh in study.player_visual.get_children():
					if mesh is MeshInstance3D or mesh == study.player_nameplate:
						for corner in range(8):
							var world_corner: Vector3 = mesh.to_global(mesh.get_aabb().get_endpoint(corner))
							if mesh == study.player_nameplate:
								var glyph_corner: Vector3 = mesh.get_aabb().get_endpoint(corner) * mesh.global_basis.get_scale()
								world_corner = mesh.global_position + study.camera.global_basis * glyph_corner
							var pixel: Vector2 = study.camera.unproject_position(world_corner)
							require(body.has_point(pixel), "player reservation contains stride/gesture mesh and Label3D quad corners: %s phase %s pixel %s bounds %s" % [mesh.name, phase, pixel, body])
			study.animate_person_node(study.player_visual, 0.0, 0.0, 0.0)
			var clear_area: Rect2 = study.play_area_rect().grow(-2.0)
			var small: Rect2 = study.fit_overlay_around_player(Rect2(body.get_center(), Vector2(30, 24)), clear_area)
			require(small.has_area() and clear_area.encloses(small) and not small.intersects(body), "nearest free region fits a small overlay around the real character")
			require(not study.fit_overlay_around_player(clear_area, clear_area).has_area(), "a full scene overlay cannot cover a visible character")
			var roomy_area := Rect2(body.position - Vector2(100, 100), body.size + Vector2(200, 200))
			var lower_reward := Rect2(Vector2(roomy_area.position.x, body.end.y + 20), Vector2(roomy_area.size.x, 80))
			var upper_speech: Rect2 = study.fit_overlay_around_player(Rect2(lower_reward.position, Vector2(roomy_area.size.x - 4, 30)), roomy_area, lower_reward)
			require(upper_speech.has_area() and upper_speech.end.y < body.position.y and not upper_speech.intersects(lower_reward), "a reward below the character leaves the upper speech region usable")
			var stationary_target: Vector3 = study.target
			var stationary_zoom: float = study.view_size
			study.last_panel_dialogue = ""
			study.music_error = ""
			study.update_mural_ui()
			study.update_music_ui()
			var arrival_line: String = study.celeste_dialogue_text() if clearance_kind == "mural" else study.rook_dialogue_text()
			study.show_neighbor_speech(study.celeste_index if clearance_kind == "mural" else study.rook_index, arrival_line)
			for pop_delta in [0.02, 0.04, 0.08, 0.08]:
				study.update_speech_bubble(pop_delta)
				if study.is_speech_bubble_visible():
					require(not study.speech_bubble_screen_rect().intersects(study.player_overlay_rect()), "animated speech frames stay clear of the player")
			if study.is_speech_bubble_visible():
				require(not study.speech_bubble_screen_rect().intersects(study.player_overlay_rect()), "visible activity speech clears body and YOU")
			else:
				require(study.speech_bubble_in_activity and study.speech_activity_detail() != null and not study.header_details_expanded, "crowded activity dialogue stays complete in its existing instructions without covering the character with Info")
			require(study.speech_bubble_activity_matched, "arrival dialogue was available in the activity instructions")
			var matching_detail: RichTextLabel = study.speech_activity_detail()
			study.set_activity_detail(matching_detail, "Newer activity instructions supersede the welcome line.")
			study.update_speech_bubble(0.02)
			require(study.speech_bubble_anchor.is_empty() and not study.header_details_expanded, "replaced activity instructions dismiss stale dialogue without expanding Info")
			study.update_mural_ui()
			study.update_music_ui()
			study.trigger_feel_good_burst("Mural Complete - all three motifs", "Your contribution stays in the progress counter.", study.player.position, Color("f8cc58"), true)
			study.update_celebration_burst(0.0)
			if study.reward_banner.visible:
				require(not study.reward_banner.get_global_rect().intersects(study.player_overlay_rect()), "visible activity reward clears body and YOU")
			else:
				var waiting_time: float = study.reward_banner_timer
				study.trigger_feel_good_burst("A smaller motif adjustment", "The completion reward takes priority while queued.", study.player.position)
				require(study.last_reward_title == "Mural Complete - all three motifs" and study.reward_banner_milestone, "queued milestone survives a lower-priority follow-up reward")
				study.update_celebration_burst(0.5)
				require(is_equal_approx(waiting_time, study.reward_banner_timer), "hidden activity reward keeps its reading time")
				study.set_header_details(true, false)
				study.layout_reward_banner()
				require(study.info.text.contains(study.reward_title_label.text) and study.info.text.contains(study.reward_body_label.text), "deliberate Info reveals the complete queued activity reward")
			require(study.target == stationary_target and study.view_size == stationary_zoom and study.player_xz() == stand and JSON.stringify(study.build_save_envelope()) == activity_save, "overlay fitting preserves camera intent, player position and saved progress")
			study.update_celebration_burst(4.0)
			study.hide_speech_bubble()
			study.set_header_details(false, false)
			study.show_mural_panel(false)
			study.show_music_panel(false)
	study.player.position = activity_position
	study.last_panel_dialogue = activity_original_dialogue
	study.music_error = activity_original_error
	# This fixture intentionally closes panels; the next independent suite resets its view/layout with Find Me.
	# Regression: at600px the old six-column hub grew43px over walking controls.
	study.hide_story_card()
	study.frame_player_for_walking()
	study.show_block_panel(true)
	var tablet_save: String = JSON.stringify(study.build_save_envelope())
	var tablet_position: Vector3 = study.player.position
	var tablet_zoom: float = study.view_size
	var tablet_yaw: float = study.camera_yaw
	var tablet_pitch: float = study.camera_pitch_scale
	for tablet_width in [599, 600, 700, 800, 900, 1000, 1049, 1050, 1100]:
		root.size = Vector2i(tablet_width, 667)
		await process_frame
		await process_frame
		var paged: bool = tablet_width < 1050
		require(study.uses_paged_block_actions() == paged, "hub breakpoint is independent of the phone controls breakpoint")
		study.block_hub_page = 0
		study.layout_block_action_pages()
		var tablet_seen: Array[int] = []
		for tablet_page in range(study.block_action_page_count() if paged else 1):
			await process_frame
			await process_frame
			var tablet_rect: Rect2 = study.block_panel.get_global_rect()
			for body_height in [-1.0, 0.0, study.PLAYER_HEIGHT_M * study.CHARACTER_VISUAL_SCALE]:
				require(study.play_area_rect().has_point(study.camera.unproject_position(study.player.position + Vector3.UP * body_height)), "followed character and YOU area stay above the tablet menu")
			require(tablet_rect.position.y >= study.header_panel.get_global_rect().end.y and tablet_rect.end.y <= study.controls.get_global_rect().position.y, "intermediate hub never overlaps walking controls at %d" % tablet_width)
			require(tablet_rect.position.y - study.header_panel.get_global_rect().end.y >= 180, "intermediate hub retains a useful scene area")
			var tablet_actions: Array = study.block_action_snapshots()
			require(tablet_actions.size() == (mini(4,study.BLOCK_ACTION_COUNT-study.block_hub_page*4) if paged else study.BLOCK_ACTION_COUNT), "intermediate page has the expected action count")
			for tablet_action in tablet_actions:
				tablet_seen.append(int(tablet_action.id))
				require(bool(tablet_action.text_fits), "intermediate full title fits: %s at %d" % [tablet_action.text, tablet_width])
			for tablet_button in [study.block_close_btn, study.block_page_prev, study.block_page_next]:
				if tablet_button.is_visible_in_tree():
					require(tablet_rect.encloses(tablet_button.get_global_rect()) and tablet_button.size.x >= 44 and tablet_button.size.y >= 44, "intermediate navigation remains enclosed and tappable")
			if paged and tablet_page < study.block_action_page_count()-1:
				study.change_block_action_page(1)
				require(study.block_buttons[(tablet_page + 1) * 4].has_focus(), "intermediate paging retains keyboard focus")
		var tablet_expected: Array[int] = []
		for tablet_id in range(study.BLOCK_ACTION_COUNT):
			tablet_expected.append(tablet_id)
		require(tablet_seen == tablet_expected, "all intermediate-width actions remain reachable once")
		if tablet_width in [600, 1050]:
			var tablet_titles: Array[String] = []
			var tablet_long_titles := ["Open Block Party!", "Visit Next Neighbor", "Gear Returned (3/3)", "Hosted All 4 Events", "Paint w/ Celeste (0/3)", "Soundcheck w/ Rook (OK)", "Black Hawk Site (OK)", "Tenant Circle (Done)", "Roll Camera (Clear)", "Local Stories: Err", "District Border: Off", "Web Save Loaded"]
			for title_id in range(12):
				tablet_titles.append(study.block_buttons[title_id].text)
				study.block_buttons[title_id].text = tablet_long_titles[title_id]
			for title_page in range(study.block_action_page_count() if paged else 1):
				study.block_hub_page = title_page
				study.layout_block_action_pages()
				await process_frame
				await process_frame
				var long_rect: Rect2 = study.block_panel.get_global_rect()
				require(long_rect.end.y <= study.controls.get_global_rect().position.y, "long-state titles cannot grow into controls at %d" % tablet_width)
				for title_action in study.block_action_snapshots():
					require(bool(title_action.text_fits), "long-state title fits at the tablet/desktop boundary")
			for title_id in range(12):
				study.block_buttons[title_id].text = tablet_titles[title_id]
	study.block_west_btn.grab_focus()
	root.size = Vector2i(1049, 667)
	await process_frame
	await process_frame
	require(study.block_hub_page == 1 and study.block_west_btn.has_focus() and study.block_west_btn.is_visible_in_tree(), "crossing the tablet breakpoint preserves the focused later action")
	study.block_hub_page = 0
	study.layout_block_action_pages()
	study.block_page_next.grab_focus()
	root.size = Vector2i(1050, 667)
	await process_frame
	await process_frame
	require(study.block_open_btn.has_focus(), "disappearing tablet page navigation hands focus to a visible action")
	var desktop_hub_snapshot: Dictionary = study.get_a11y_status_snapshot()
	require(desktop_hub_snapshot.block_hub_page == 0 and desktop_hub_snapshot.block_hub_pages == 1 and not desktop_hub_snapshot.block_hub_paged, "desktop snapshot reports one complete action view")
	require(study.following_player and study.view_size == tablet_zoom and study.camera_yaw == tablet_yaw and study.camera_pitch_scale == tablet_pitch, "hub framing preserves follow, zoom and heading")
	require(JSON.stringify(study.build_save_envelope()) == tablet_save and study.player.position == tablet_position, "tablet resizing and paging leave walking and progress unchanged")
	study.following_player = false
	study.target += Vector3(3.0, 0.0, 2.0)
	study.update_camera()
	var inspected_hub_target: Vector3 = study.target
	study.show_block_panel(false)
	study.show_block_panel(true)
	await process_frame
	await process_frame
	require(study.target == inspected_hub_target and not study.following_player, "opening hub preserves a separately inspected camera view")
	study.frame_player_for_walking()
	await process_frame
	require(study.play_area_rect().has_point(study.camera.unproject_position(study.player.position + Vector3.UP)) and study.view_size == 45.0, "Find Me exits the menu to the close walking view")
	# Short landscape: all12 actions stay beside a useful, followed character view.
	var short_hub_save: String = JSON.stringify(study.build_save_envelope())
	var short_hub_position: Vector3 = study.player.position
	for short_hub_size in [Vector2i(600, 360), Vector2i(640, 360), Vector2i(667, 375), Vector2i(844, 390), Vector2i(800, 480), Vector2i(1100, 480)]:
		root.size = short_hub_size
		study.show_block_panel(true)
		var short_suggested: Button = study.hub_button_for_objective(String(study.current_objective().get("id", "")))
		require(short_suggested == null or short_suggested.is_visible_in_tree(), "short hub opens on the actual suggested page")
		study.block_hub_page = 0
		study.update_block_ui()
		await process_frame
		await process_frame
		await process_frame
		require(study.uses_side_block_hub() and study.uses_paged_block_actions(), "short hub uses a paged side dock even at desktop widths")
		var short_seen: Array[int] = []
		for short_page in range(study.block_action_page_count()):
			await process_frame
			await process_frame
			var dock: Rect2 = study.block_panel.get_global_rect()
			var scene: Rect2 = study.play_area_rect()
			print("SHORT_HUB_CHECK ", short_hub_size, " panel=", dock, " scene=", scene)
			require(dock.position.y >= study.header_panel.get_global_rect().end.y + 7 and dock.end.y <= short_hub_size.y - 11, "short dock stays below header and within screen")
			require(not dock.intersects(study.controls.get_global_rect()) and scene.size.x >= 240 and scene.size.y >= 100, "short hub retains useful scene and separate walking controls")
			require(study.player_overlay_rect().has_area() and scene.encloses(study.player_overlay_rect()), "actual enlarged player and YOU fit in the short hub scene")
			for short_caption in study.visible_scene_captions:
				require(not short_caption.rect.intersects(study.player_overlay_rect()), "short hub world captions leave the real character clear")
			if study.guide_arrow_label.is_visible_in_tree():
				require(not study.guide_arrow_label.get_global_rect().grow(7.0).intersects(study.player_overlay_rect()), "short hub outlined objective leaves YOU and the body clear")
			for action in study.block_action_snapshots():
				short_seen.append(int(action.id))
				require(bool(action.text_fits), "short hub full action title fits")
			for short_button in [study.block_close_btn, study.block_page_prev, study.block_page_next]:
				require(dock.encloses(short_button.get_global_rect()) and short_button.size.x >= 44 and short_button.size.y >= 44, "short hub page/Close remain reachable44px targets")
			for walking_button in study.walking_control_snapshots():
				require(bool(walking_button.text_fits) and walking_button.width >= 44 and walking_button.height >= 44, "short walking target fits at %s: %s" % [short_hub_size, walking_button.text])
			if short_page < study.block_action_page_count()-1:
				study.change_block_action_page(1)
				require(study.block_buttons[(short_page + 1) * 4].has_focus(), "short paging keeps visible action focus")
		require(short_seen == range(study.BLOCK_ACTION_COUNT), "every short hub action is reachable once")
		var prior_objective: String = study.objective_label.text
		var prior_refresh: float = study.objective_refresh_timer
		study.objective_refresh_timer = 1000.0
		study.objective_label.text = "A longer objective while the hub stays open: keep the character visible and all twelve neighborhood actions reachable. ".repeat(3)
		await process_frame
		await process_frame
		await process_frame
		await process_frame
		require(study.objective_label.get_line_count() >= 2 and study.block_panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y + 7, "a growing objective moves the open dock below the actual header")
		study.set_header_details(true, false)
		await process_frame
		await process_frame
		require(study.block_panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y + 7 and study.block_panel.get_global_rect().end.y <= short_hub_size.y - 11 and study.info.is_visible_in_tree() and study.info.size.y >= 24, "long objective plus Info keeps dock and reader reachable")
		study.set_header_details(false, false)
		study.objective_label.text = prior_objective
		study.objective_refresh_timer = prior_refresh
		study.show_block_panel(false)
		await process_frame
		await process_frame
		require(not study.uses_side_block_hub() and study.controls.offset_right == -12.0 and study.controls.get_child(1).text == "Tenderloin Map", "Close restores full walking controls")
		require(JSON.stringify(study.build_save_envelope()) == short_hub_save and study.player.position == short_hub_position and study.view_size == 45.0, "short paging/resize/Info/Close preserve player zoom and progress")
	root.size = Vector2i(844, 390)
	study.show_block_panel(true)
	study.block_hub_page = 2
	study.layout_block_action_pages()
	study.block_voices_btn.grab_focus()
	for boundary_size in [Vector2i(844, 600), Vector2i(800, 559), Vector2i(800, 560), Vector2i(599, 667), Vector2i(600, 360), Vector2i(1100, 480)]:
		root.size = boundary_size
		await process_frame
		await process_frame
		await process_frame
		var should_side: bool = boundary_size.x >= study.SMALL_SIDE_HUB_MIN_WIDTH and boundary_size.y < study.SIDE_HUB_MAX_HEIGHT
		require(study.uses_side_block_hub() == should_side and study.block_voices_btn.is_visible_in_tree() and study.block_voices_btn.has_focus() and study.block_hub_page == 2, "open-dock breakpoint crossing retains the focused later action")
		require(study.block_panel.anchor_left == (1.0 if should_side else 0.0) and (study.controls.offset_right < -12.0 if should_side else study.controls.offset_right == -12.0), "open-dock breakpoint crossing restores anchors and walking width")
	# Browser touch sends both emulated mouse and raw touch to a press-mode button.
	# Both must keep Stop intent until release; a later gesture must work again.
	root.size = Vector2i(640, 360)
	for stop_gesture in range(2):
		require(study.walk_to_history_stop("blackhawk"), "touch Stop fixture starts a real long route")
		study.show_block_panel(true)
		await process_frame
		await process_frame
		await process_frame
		var touch_stop_save: String = JSON.stringify(study.build_save_envelope())
		var stop_point: Vector2 = study.walk_control.get_global_rect().get_center()
		var stop_mouse := InputEventMouseButton.new()
		stop_mouse.device = -1
		stop_mouse.button_index = MOUSE_BUTTON_LEFT
		stop_mouse.pressed = true
		stop_mouse.position = stop_point
		stop_mouse.global_position = stop_point
		Input.parse_input_event(stop_mouse)
		var stop_touch := InputEventScreenTouch.new()
		stop_touch.index = 0
		stop_touch.pressed = true
		stop_touch.position = stop_point
		Input.parse_input_event(stop_touch)
		await process_frame
		require(study.current_path.is_empty() and study.last_a11y_announcement.begins_with("Walking stopped."), "paired raw touch and mouse stop once instead of restarting")
		var stop_mouse_release := stop_mouse.duplicate() as InputEventMouseButton
		stop_mouse_release.pressed = false
		Input.parse_input_event(stop_mouse_release)
		var stop_touch_release := stop_touch.duplicate() as InputEventScreenTouch
		stop_touch_release.pressed = false
		Input.parse_input_event(stop_touch_release)
		await process_frame
		require(not study.walk_control_press_handled and study.current_path.is_empty() and JSON.stringify(study.build_save_envelope()) == touch_stop_save, "release rearms Stop without walking or changing progress")
	study.player.position = short_hub_position
	study.following_player = false
	study.target += Vector3(3, 0, 2)
	study.update_camera()
	var side_manual_target: Vector3 = study.target
	study.show_block_panel(false)
	study.show_block_panel(true)
	await process_frame
	await process_frame
	require(study.target == side_manual_target and not study.following_player, "side dock preserves manual inspection camera intent")
	study.show_block_panel(false)
	study.frame_player_for_walking()
	root.size = Vector2i(1100, 760)
	await process_frame
	await process_frame
	study.show_conversation(0)
	study.last_panel_dialogue = "Bea: \"A previous conversation.\""
	study.wide_overview()
	require(study.talk_partner == -1 and study.block_panel_mode == "hub" and study.last_panel_dialogue.is_empty(), "Tenderloin Map clears old conversation context")
	study.player.position = Vector3(-50.0, 0.0, 60.0)
	require(study.nearest_neighbor_within(study.TALK_PROMPT_RADIUS_M) == -1, "solo hint fixture is away from all neighbors")
	study.frame_player_for_walking()
	study.set_header_details(false)
	var solo_hint: String = study.ask_whats_next()
	await process_frame
	await process_frame
	await process_frame
	require(study.info.visible and study.info.text.contains(solo_hint), "What's Next shows a visible answer away from neighbors")
	study.set_header_details(false)
	await verify_narrow_hub(study)
	await verify_short_narrow_walking(study)
	await verify_short_activity_panels(study)
	await verify_short_activity_panels(study, true)
	await verify_mural_workshop(study)
	await verify_rhythm_bar(study)
	await verify_rhythm_circle(study)
	await verify_mural_stories(study,saved_m4_json)
	await verify_film_screening(study,saved_m4_json)
	await preload("res://tests/helper_bench_checks.gd").verify(self,study,saved_m4_json,true)
	await verify_quiet_seats(study,saved_m4_json)
	await verify_bea_invitation(study,saved_m4_json)
	await verify_civic_listening(study,saved_m4_json)
	await verify_programme_studio(study,saved_m4_json)
	await preload("res://tests/hosted_afternoon_checks.gd").verify(self,study,saved_m4_json,true)
	await verify_shared_panel(study,saved_m4_json)
	await verify_loan_homecoming(study,saved_m4_json)
	await verify_power_story(study,saved_m4_json)
	await verify_dog_story(study,saved_m4_json)
	await verify_lantern_procession(study,saved_m4_json)
	await verify_voting_story(study,saved_m4_json)
	await verify_story_visits(study,saved_m4_json)
	await verify_guided_walk(study,saved_m4_json)
	await preload("res://tests/shared_meal_checks.gd").verify(self,study,saved_m4_json)
	await preload("res://tests/community_invitation_checks.gd").verify(self,study,saved_m4_json)
	await verify_map_pinch(study,saved_m4_json)
	await verify_phone_disclosure(study,initial_start_save,saved_m4_json)
	study.clear_godot_save()
	study.clear_godot_settings()
	var legacy_settings := FileAccess.open(study.settings_path, FileAccess.WRITE)
	legacy_settings.store_string('{"schema":"tenderloin-redux.godot.settings.v1","version":1,"neighborhood_voices":false}')
	legacy_settings.close()
	study.set_reward_sounds_enabled(false, false)
	study.load_godot_settings()
	require(study.reward_sounds_enabled and not study.voices_enabled, "older settings without reward_sounds retain compatible default")
	study.clear_godot_settings()
	if "--force-failure" in OS.get_cmdline_user_args():
		require(false, "harness failure sentinel")
	if failed:
		print("GODOT_STUDY_FAIL")
		quit(1)
	else:
		print("GODOT_STUDY_PASS:188 meshes (58 opening + 130 wider), measured heights, collision/courtyards, walking/sliding, 5 neighbors, Celeste portable mural, Rook speaker/music/local-audition, opening-block readiness/banner, wider Tenderloin walk (Compton's Corner + Black Hawk at Turk & Hyde + Transgender Cultural District boundary), M1 keepsake photo & loan returns, M3 afternoon programme & hosting, M4 civic listening hour & three-shot film short (The Open Seat), M5 default-off neighborhood voices & isolated settings, M6 original SVG builders/export & measured local performance, browser-save adapter, save/reload, cutaway, focus-rings, 44px and ui_accept at 1100/390/320")
		quit(0)




func verify_narrow_hub(study: Node) -> void:
	var original_player: Vector3 = study.player.position
	var original_timer: float = study.objective_refresh_timer
	study.hide_story_card()
	study.current_path.clear()
	study.hide_speech_bubble()
	study.set_header_details(false, false)
	root.size = Vector2i(1100, 760)
	study.show_block_panel(true)
	var original_titles: Array[String] = []
	for i in range(study.BLOCK_ACTION_COUNT):
		original_titles.append(study.block_buttons[i].text)
	study.show_block_panel(false)
	for hub_size in [Vector2i(320, 568), Vector2i(390, 568), Vector2i(360, 600), Vector2i(520, 568), Vector2i(520, 360), Vector2i(559, 360), Vector2i(520, 559), Vector2i(559, 559), Vector2i(560, 360), Vector2i(599, 360), Vector2i(560, 568), Vector2i(599, 639)]:
		root.size = hub_size
		var arrival: Vector2 = study.neighbor_xz(0) - study.nearest_street_tangent(study.neighbor_xz(0)) * 0.95
		study.player.position = Vector3(arrival.x, 0, arrival.y)
		study.show_conversation(0)
		for frame in range(4):
			await process_frame
		var save: String = JSON.stringify(study.build_save_envelope())
		var zoom: float = study.view_size
		require(study.run_conversation_action_id("hub"), "real conversation action opens narrow hub")
		study.block_hub_page = 0
		study.layout_block_action_pages()
		study.objective_refresh_timer = 1000.0
		study.objective_label.text = "Chapter 6: Explore the neighborhood · Next: Spot Jeffrey's Lost 1961 Record (0/10 surprises, Shift+D) · Museum (Shift+M)"
		for frame in range(5):
			await process_frame
		require(study.following_player and study.uses_compact_activity_controls(), "automatically framed conversation hands off to a compact followed-player hub")
		var seen: Array[int] = []
		for page in range(study.block_action_page_count()):
			for frame in range(3):
				await process_frame
			var panel: Rect2 = study.block_panel.get_global_rect()
			var area: Rect2 = study.play_area_rect()
			print("NARROW_HUB_CHECK ", hub_size, " page=", page, " panel=", panel, " scene=", area, " body=", study.player_overlay_rect())
			require(panel.position.y >= study.header_panel.get_global_rect().end.y + 7 and panel.end.y <= hub_size.y - 11 and not panel.intersects(study.controls.get_global_rect()), "narrow hub clears header and walking controls")
			require(area.size.x >= 200 and area.size.y >= 100 and area.grow(1).encloses(study.player_overlay_rect()), "narrow hub leaves full enlarged player and YOU in useful scene space")
			for action in study.block_action_snapshots():
				seen.append(int(action.id))
				require(action.text == original_titles[int(action.id)], "small hub retains the original full desktop title")
				require(action.text_fits and action.width >= 44 and action.height >= 44, "narrow hub complete original action is readable and44px")
			for nav in [study.block_page_prev, study.block_page_next, study.block_close_btn]:
				require(panel.encloses(nav.get_global_rect()) and nav.size.x >= 44 and nav.size.y >= 44, "narrow hub page and Close controls remain reachable")
			for walking in study.walking_control_snapshots():
				if not walking.visible: continue
				require(walking.text_fits and walking.width >= 44 and walking.height >= 44, "narrow hub walking labels fit44px targets")
			if page < study.block_action_page_count()-1:
				study.change_block_action_page(1)
				require(study.block_buttons[(page + 1) * 4].has_focus(), "narrow hub paging focuses a newly visible action")
		require(seen == range(study.BLOCK_ACTION_COUNT), "all original narrow hub actions plus meal remain reachable")
		if hub_size == Vector2i(320, 568) or hub_size == Vector2i(520, 360):
			var changing: Button = study.block_buttons[study.block_hub_page * 4]
			var caption: String = changing.text
			var panel_height: float = study.block_panel.size.y
			changing.text = "First line\nSecond line\nThird line"
			for frame in range(6):
				await process_frame
			require(study.block_panel.size.y > panel_height and (study.uses_side_block_hub() or study.block_panel.get_global_rect().end.y + 7 <= study.controls.get_global_rect().position.y) and study.block_panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y + 7 and study.block_panel.get_global_rect().end.y <= hub_size.y - 11 and study.block_panel.get_global_rect().encloses(study.block_close_btn.get_global_rect()), "deferred hub content growth stays between header and walking controls")
			print("NARROW_HUB_GROW panel=", study.block_panel.get_global_rect(), " scene=", study.play_area_rect(), " body=", study.player_overlay_rect(), " pending=", study.compact_panel_layout_pending)
			require(study.play_area_rect().grow(1).encloses(study.player_overlay_rect()) and not study.compact_panel_layout_pending, "deferred hub growth retains full followed player without a pending loop")
			changing.text = caption
			for frame in range(6):
				await process_frame
			require(absf(study.block_panel.size.y - panel_height) < 1 and study.play_area_rect().grow(1).encloses(study.player_overlay_rect()) and not study.compact_panel_layout_pending, "deferred hub shrink restores size and followed player")
		# The appended meal occupies page3; reveal the original voice page before
		# asking for focus. Hidden Controls cannot acquire native keyboard focus.
		while study.block_hub_page>2: await phone_accept(study.block_page_prev)
		study.block_voices_btn.grab_focus()
		for boundary in [Vector2i(520, 360), Vector2i(559, 360), Vector2i(560, 360), Vector2i(520, 559), Vector2i(520, 560), Vector2i(559, 568), Vector2i(560, 559), Vector2i(560, 568), Vector2i(599, 639), Vector2i(599, 640), Vector2i(600, 360), hub_size]:
			root.size = boundary
			for frame in range(4):
				await process_frame
			require(study.block_hub_page == 2 and study.block_voices_btn.has_focus() and study.block_voices_btn.is_visible_in_tree(), "narrow open hub breakpoints preserve the focused later-page action")
			require(study.uses_side_block_hub() == (boundary.x >= study.SMALL_SIDE_HUB_MIN_WIDTH and boundary.y < study.SIDE_HUB_MAX_HEIGHT) and study.block_panel.get_global_rect().end.y <= boundary.y - 11 and study.block_panel.get_global_rect().encloses(study.block_close_btn.get_global_rect()) and study.block_panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y and not study.block_panel.get_global_rect().intersects(study.controls.get_global_rect()), "narrow open hub breakpoints keep header and walking targets clear")
			require(study.play_area_rect().grow(1).encloses(study.player_overlay_rect()), "open narrow hub breakpoint retains full player and YOU")
		study.block_detail_label.scroll_to_line(1000)
		await process_frame
		var bar: VScrollBar = study.block_detail_label.get_v_scroll_bar()
		require(bar.value + bar.page >= bar.max_value - 1, "complete narrow hub description reaches its final line")
		study.set_header_details(true, false)
		for frame in range(4):
			await process_frame
		require(study.info.size.y >= study.info.get_theme_font("normal_font").get_height(study.info.get_theme_font_size("normal_font_size")) and study.block_panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y + 7 and study.block_panel.get_global_rect().end.y <= hub_size.y - 11, "narrow hub Info keeps a measured full font line and reachable Close")
		study.set_header_details(false, false)
		study.show_block_panel(false)
		for frame in range(3):
			await process_frame
		var short_walk: bool = hub_size.x >= study.SMALL_SIDE_HUB_MIN_WIDTH and hub_size.y < study.SIDE_HUB_MAX_HEIGHT
		if study.uses_phone_disclosure():
			await verify_phone_walking_restored(study,hub_size)
		else:
			require(study.controls.columns == (3 if short_walk else 2) and study.controls.offset_top == (-116 if short_walk else -174) and study.controls.offset_right == -12 and study.map_control.text == "Tenderloin Map", "Close restores the full narrow walking grid with two rows in short landscape")
		require(JSON.stringify(study.build_save_envelope()) == save and study.view_size == zoom, "narrow hub paging reading and Info preserve progression and zoom")
		study.show_conversation(0)
		for frame in range(3):
			await process_frame
		study.pan_camera_by_screen_delta(Vector2(9, 4))
		var manual: Array = study.panel_camera_pose()
		study.run_conversation_action_id("hub")
		for frame in range(5):
			await process_frame
		require(study.panel_camera_pose() == manual and not study.following_player, "manual conversation inspection survives All Actions")
		study.show_block_panel(false)
	root.size = Vector2i(640, 360)
	study.show_conversation(0)
	for frame in range(4):
		await process_frame
	var wider_conversation_pose: Array = study.panel_camera_pose()
	study.run_conversation_action_id("hub")
	for frame in range(4):
		await process_frame
	require(not study.following_player and study.panel_camera_pose() == wider_conversation_pose, "completed wider conversation-to-hub camera behavior remains unchanged")
	study.show_block_panel(false)
	study.player.position = original_player
	study.objective_refresh_timer = original_timer
	root.size = Vector2i(1100, 760)
	study.frame_player_for_walking()
	await process_frame
	await process_frame

func verify_short_narrow_walking(study: Node) -> void:
	var before_player: Vector3 = study.player.position
	var before_timer: float = study.objective_refresh_timer
	study.hide_story_card()
	study.hide_speech_bubble()
	study.current_path.clear()
	study.set_header_details(false, false)
	var caption_checks := 0
	var guide_checks := 0
	for size in [Vector2i(520, 360), Vector2i(559, 360), Vector2i(520, 559), Vector2i(559, 559), Vector2i(560, 360), Vector2i(568, 375), Vector2i(599, 360), Vector2i(599, 480), Vector2i(560, 559), Vector2i(599, 559)]:
		root.size = size
		if size == Vector2i(599, 480):
			var stop: Vector2 = study.nearest_street_point(study.comptons_xz())
			study.player.position = Vector3(stop.x, 0, stop.y)
		var case_player: Vector3 = study.player.position
		study.frame_player_for_walking()
		study.objective_refresh_timer = 1000.0
		study.objective_label.text = "Chapter 6: Explore the neighborhood · Next: Spot Jeffrey's Lost 1961 Record (0/10 surprises, Shift+D) · Museum (Shift+M)"
		for frame in range(5):
			await process_frame
		var save: String = JSON.stringify(study.build_save_envelope())
		var area: Rect2 = study.play_area_rect()
		print("SHORT_WALK_CHECK ", size, " scene=", area, " body=", study.player_overlay_rect(), " controls=", study.controls.get_global_rect())
		require(study.uses_short_narrow_walking() and study.controls.columns == 3 and study.controls.offset_top == -116, "short narrow walking uses two rows")
		require(area.size.y >= 100 and area.grow(1).encloses(study.player_overlay_rect()), "short walking retains full enlarged player and YOU under a long objective")
		for caption in study.visible_scene_captions:
			caption_checks += 1
			require(not caption.rect.intersects(study.player_overlay_rect()), "short walking world captions leave the real player clear")
		if study.guide_arrow_label.is_visible_in_tree():
			guide_checks += 1
			require(not study.guide_arrow_label.get_global_rect().grow(7).intersects(study.player_overlay_rect()), "short walking outlined objective leaves the player clear")
		var captions: Array = ["What's Next?", "Tenderloin Map", "Find Me", "Zoom In (+)", "Zoom Out (−)", guided_caption(study)]
		for i in range(study.walking_control_snapshots().size()):
			var b: Dictionary = study.walking_control_snapshots()[i]
			require(b.text == captions[i] and b.text_fits and b.width >= 44 and b.height >= 50 and b.y + b.height <= size.y, "short walking preserves complete original labels and50px targets")
		for kind in ["hub", "mural", "music"]:
			if kind == "hub":
				study.show_block_panel(true)
			elif kind == "mural":
				study.show_mural_panel(true)
			else:
				study.show_music_panel(true)
			require(study.controls.offset_top == -104 and study.controls.columns == 3, "open panel retains its actual compact control geometry")
			if kind == "hub":
				study.block_close_btn.pressed.emit()
			else:
				study.end_conversation()
			for frame in range(4):
				await process_frame
			require(study.uses_short_narrow_walking() and study.controls.columns == 3 and study.play_area_rect().grow(1).encloses(study.player_overlay_rect()), "real Close restores useful short walking space")
		study.wide_overview()
		for frame in range(4):
			await process_frame
		require(not study.player_nameplate.is_visible_in_tree(), "Map fixture actually hides the YOU billboard before Find Me")
		study.frame_player_for_walking()
		for frame in range(4):
			await process_frame
		require(not study.in_wide_overview and study.view_size == 45 and study.play_area_rect().grow(1).encloses(study.player_overlay_rect()), "Map then Find Me restores the short walking view")
		study.pan_camera_by_screen_delta(Vector2(10, 4))
		var manual: Array = study.panel_camera_pose()
		for pan_size in [Vector2i(519, 360), Vector2i(599, 375)]:
			root.size = pan_size
			for frame in range(4):
				await process_frame
			require(study.panel_camera_pose() == manual and not study.following_player, "short walking resize preserves manual pan across the520 seam")
		require(study.player.position == case_player and JSON.stringify(study.build_save_envelope()) == save, "short walking framing and Close preserve position/progress")
		study.player.position = before_player
	print("SHORT_WALK_OVERLAYS captions=", caption_checks, " guides=", guide_checks)
	require(caption_checks > 0 and guide_checks > 0, "short walking clearance exercises real captions and an outlined guide")
	for boundary in [Vector2i(519, 360), Vector2i(520, 560), Vector2i(560, 560), Vector2i(599, 560), Vector2i(599, 640), Vector2i(320, 667), Vector2i(600, 360)]:
		root.size = boundary
		study.frame_player_for_walking()
		for frame in range(4):
			await process_frame
		require(not study.uses_short_narrow_walking() and study.controls.columns == (3 if study.uses_phone_disclosure() else (2 if boundary.x < 600 else 3)), "taller layouts restore their designated phone or original walking grid")
	root.size = Vector2i(599, 360)
	study.frame_player_for_walking()
	for frame in range(4):
		await process_frame
	study.wide_overview()
	require(study.in_wide_overview and not study.following_player and study.view_size != 45, "short keyboard Find Me starts in a different real Map view")
	require(study.controls.get_child(2).text == "Find Me", "short keyboard fixture targets the actual Find Me button")
	study.controls.get_child(2).grab_focus()
	for pressed in [true, false]:
		var accept := InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = pressed
		Input.parse_input_event(accept)
		await process_frame
	for frame in range(4):
		await process_frame
	require(not study.in_wide_overview and study.following_player and study.view_size == 45 and study.play_area_rect().grow(1).encloses(study.player_overlay_rect()), "real ui_accept on short Find Me frames the enlarged player")
	study.frame_player_for_walking()
	study.pan_camera_by_screen_delta(Vector2(10, 4)) # Before the queued Find Me refit settles.
	var immediate_manual: Array = study.panel_camera_pose()
	for frame in range(4):
		await process_frame
	require(not study.following_player and study.panel_camera_pose() == immediate_manual, "a manual pan immediately after Find Me owns the pending settled refit")
	study.objective_refresh_timer = before_timer
	root.size = Vector2i(1100, 760)
	study.frame_player_for_walking()
	await process_frame
	await process_frame

func verify_short_activity_panels(study: Node, narrow_small := false) -> void:
	require(study.SIDE_ACTIVITY_MIN_WIDTH == 520, "short activity dock breakpoint is520px")
	var original_player: Vector3 = study.player.position
	var original_timer: float = study.objective_refresh_timer
	study.hide_story_card()
	study.current_path.clear()
	study.music_error = ""
	study.set_header_details(false, false)
	var sizes: Array = [Vector2i(520, 360), Vector2i(559, 360), Vector2i(520, 559), Vector2i(559, 559), Vector2i(320, 568), Vector2i(390, 568), Vector2i(360, 600), Vector2i(520, 568), Vector2i(560, 360), Vector2i(599, 360), Vector2i(560, 568), Vector2i(599, 639)] if narrow_small else [Vector2i(600, 360), Vector2i(640, 360), Vector2i(667, 375), Vector2i(844, 390), Vector2i(800, 480), Vector2i(1100, 480)]
	for short_size in sizes:
		root.size = short_size
		await process_frame
		await process_frame
		for neighbor_idx in range(study.neighbors.size()):
			var arrival: Vector2 = study.neighbor_xz(neighbor_idx) - study.nearest_street_tangent(study.neighbor_xz(neighbor_idx)) * 0.95
			study.player.position = Vector3(arrival.x, 0, arrival.y)
			study.show_conversation(neighbor_idx)
			await process_frame
			await process_frame
			await process_frame
			var actual_person: Vector3 = study.neighbors[neighbor_idx].pos + Vector3.UP
			require(study.play_area_rect().has_point(study.camera.unproject_position(actual_person)), "all five actual neighbors remain visible in short conversation layouts")
			if short_size.x >= 520 and short_size.x < 560 and short_size.y < 560:
				require(study.play_area_rect().grow(1.0).encloses(study.player_overlay_rect()), "small landscape conversations keep the full nearby player and YOU for all five neighbors")
				var neighbor_panel: Rect2 = study.block_panel.get_global_rect()
				require(neighbor_panel.position.y >= study.header_panel.get_global_rect().end.y and neighbor_panel.end.y <= short_size.y - 12, "all five small conversation panels stay below the header and on-screen")
				for b in study.activity_detail_snapshot(study.block_detail_label, study.block_panel, study.conv_buttons).buttons:
					if b.visible:
						require(b.width >= 44 and b.height >= 44 and b.text_fits and neighbor_panel.encloses(Rect2(b.x, b.y, b.width, b.height)), "all five small conversation action labels fit: " + b.text)
				for b in study.walking_control_snapshots():
					require(b.text_fits and b.width >= 44 and b.height >= 44, "native compact walking labels fit beside small activities")
			study.show_block_panel(false)
		if short_size.x >= 520 and short_size.x < 560 and short_size.y < 560:
			for arrival_kind in ["mural", "speaker", "celeste", "rook"]:
				study.show_mural_panel(false)
				study.show_music_panel(false)
				study.show_block_panel(false)
				var arrival_pt: Vector2 = study.mural_stand_xz() if arrival_kind == "mural" else (study.speaker_stand_xz() if arrival_kind == "speaker" else study.neighbor_xz(study.celeste_index if arrival_kind == "celeste" else study.rook_index))
				study.player.position = Vector3(arrival_pt.x, 0, arrival_pt.y)
				if arrival_kind == "mural": require(study.walk_to_mural(), "immediate passive mural arrival succeeds")
				elif arrival_kind == "speaker": require(study.walk_to_speaker(), "immediate passive speaker arrival succeeds")
				else: require(study.walk_to_neighbor(study.celeste_index if arrival_kind == "celeste" else study.rook_index), "immediate passive neighbor arrival succeeds")
				for frame in range(4): await process_frame
				print("SMALL_PASSIVE_CHECK ",short_size," ",arrival_kind," body=",study.player_overlay_rect())
				require(study.play_area_rect().grow(1).encloses(study.player_overlay_rect()) and study.panel_subject_snapshots().size() == 2, "passive arrival frames full player and actual person/prop")
				for point in study.panel_subject_snapshots():
					require(not point.behind and study.play_area_rect().has_point(Vector2(point.x,point.y)), "passive person and prop clear the dock")
				# A pending automatic arrival refit cannot reclaim a manual pan.
				var active_panel: Control = study.mural_panel if arrival_kind in ["mural", "celeste"] else study.music_panel
				if arrival_kind == "mural": require(study.walk_to_mural(), "repeated passive mural arrival succeeds")
				elif arrival_kind == "speaker": require(study.walk_to_speaker(), "repeated passive speaker arrival succeeds")
				else: require(study.walk_to_neighbor(study.celeste_index if arrival_kind == "celeste" else study.rook_index), "repeated passive neighbor arrival succeeds")
				study.pan_camera_by_screen_delta(Vector2(10,4))
				var manual_arrival: Array = study.panel_camera_pose()
				study.show_mural_panel(true) if active_panel == study.mural_panel else study.show_music_panel(true)
				study.refit_panel_after_layout()
				for frame in range(4): await process_frame
				require(study.panel_camera_pose() == manual_arrival and not study.following_player, "passive panel refresh and settled refit preserve manual inspection")
		for kind in ["conversation", "mural", "music"]:
			study.hide_speech_bubble()
			study.show_block_panel(false)
			study.show_mural_panel(false)
			study.show_music_panel(false)
			var arrival: Vector2 = study.neighbor_xz(0) - study.nearest_street_tangent(study.neighbor_xz(0)) * 0.95
			if kind == "mural":
				arrival = study.mural_stand_xz()
			elif kind == "music":
				arrival = study.speaker_stand_xz()
			study.player.position = Vector3(arrival.x, 0, arrival.y)
			var panel: Control
			var detail: RichTextLabel
			var buttons: Array[Button]
			var subject: Vector3
			if kind == "conversation":
				study.show_conversation(0)
				panel = study.block_panel
				detail = study.block_detail_label
				buttons = study.conv_buttons
				var pos: Vector3 = study.neighbors[0].pos
				subject = Vector3(pos.x, 2.2, pos.z)
			else:
				if kind == "mural":
					study.focus_mural_camera()
					study.show_mural_panel(true)
					panel = study.mural_panel
					detail = study.mural_detail_label
					buttons = study.mural_buttons
					var pos: Vector3 = study.neighbors[study.celeste_index].pos
					subject = Vector3((pos.x + study.MURAL_POS.x) * 0.5, 1.4, (pos.z + study.MURAL_POS.z) * 0.5)
				else:
					study.focus_speaker_camera()
					study.show_music_panel(true)
					panel = study.music_panel
					detail = study.music_stem_label
					buttons = study.music_buttons
					var pos: Vector3 = study.neighbors[study.rook_index].pos
					subject = Vector3((pos.x + study.ROOK_SPEAKER_POS.x) * 0.5, 1.2, (pos.z + study.ROOK_SPEAKER_POS.z) * 0.5)
			study.objective_refresh_timer = 1000.0
			study.objective_label.text = "Chapter 6: Explore the neighborhood · Next: Spot Jeffrey's Lost 1961 Record (0/10 surprises, Shift+D) · Museum (Shift+M)"
			var full_text := 'Full original dialogue and source details. '.repeat(20) + 'FINAL readable line.'
			study.set_activity_detail(detail, full_text)
			await process_frame
			await process_frame
			await process_frame
			var dock: Rect2 = panel.get_global_rect()
			var scene: Rect2 = study.play_area_rect()
			print("SHORT_ACTIVITY_CHECK ", short_size, " ", kind, " panel=", dock, " scene=", scene, " player=", study.player_overlay_rect())
			require(dock.position.y >= study.header_panel.get_global_rect().end.y and dock.end.x <= short_size.x and dock.end.y <= short_size.y - 12, "short activity dock clears header and stays on-screen")
			require(scene.size.x >= (200 if narrow_small else 250) and scene.size.y >= 100 and not dock.intersects(scene), "short activities leave useful scene space clear of the panel")
			if study.uses_compact_narrow_activities():
				require(panel_clears_walking(study,panel), "compact activity stays above visible walking controls or the phone talk viewport edge")
			require(scene.has_point(study.camera.unproject_position(subject)), "real conversation/activity subject is visible beside the dock")
			require(study.player_overlay_rect().has_area() and scene.grow(1.0).encloses(study.player_overlay_rect()), "short arrival keeps the full enlarged player and YOU clear of controls under a two-line objective")
			for point in study.panel_subject_snapshots():
				require(not point.behind and scene.has_point(Vector2(point.x, point.y)), "actual activity person and prop both remain in the short scene")
			if kind == "mural" and short_size.x >= 520 and short_size.x < 560 and short_size.y < 560:
				for motif in study.MURAL_MOTIFS:
					require(study.activate_or_advance_motif(motif), "small mural motif callback succeeds")
					for frame in range(3): await process_frame
					for b in study.activity_detail_snapshot(detail,panel,buttons).buttons:
						if b.visible: require(b.text_fits, "placed and selected motif label fits: " + b.text)
				study.set_activity_detail(detail,full_text)
				for frame in range(3): await process_frame
			var snap: Dictionary = study.activity_detail_snapshot(detail, panel, buttons)
			for b in snap.buttons:
				if b.visible:
					require(b.width >= 44 and b.height >= 44 and b.text_fits and dock.encloses(Rect2(b.x, b.y, b.width, b.height)), "short activity full control label fits: " + b.text)
			var font: Font = detail.get_theme_font("normal_font")
			require(detail.size.y >= font.get_height(detail.get_theme_font_size("normal_font_size")) * 2, "short activity reader retains two actual font lines")
			var before_pose: Array = study.panel_camera_pose()
			var before_player: Vector3 = study.player.position
			var before_save: String = JSON.stringify(study.build_save_envelope())
			var bar: VScrollBar = detail.get_v_scroll_bar()
			require(bar.max_value > bar.page, "short full dialogue really overflows the reader")
			detail.grab_focus()
			var drag := InputEventScreenDrag.new()
			drag.position = detail.size * 0.5
			drag.relative = Vector2(0, -12)
			detail.emit_signal("gui_input", drag)
			require(is_equal_approx(bar.value, 12.0), "short detail finger delta is applied exactly once")
			bar.value = bar.max_value
			await process_frame
			require(bar.value + bar.page >= bar.max_value - 1 and detail.text.ends_with("FINAL readable line."), "short reader reaches the entire original final line")
			require(before_pose == study.panel_camera_pose() and before_player == study.player.position and before_save == JSON.stringify(study.build_save_envelope()), "short activity reading preserves camera, player and progress")
			if narrow_small and (short_size == Vector2i(320, 568) or (short_size == Vector2i(520, 360) and kind == "conversation")):
				var changing_button: Button = buttons[0]
				var original_caption: String = changing_button.text
				var original_height: float = panel.size.y
				changing_button.text = "First line\nSecond line\nThird line" if short_size == Vector2i(520,360) else "First line\nSecond line\nThird line\nFourth line"
				for frame in range(6):
					await process_frame
				print("SMALL_ACTIVITY_GROW ",short_size," ",kind," original=",original_height," current=",panel.get_global_rect()," text=",changing_button.text)
				require(panel.size.y > original_height and (panel.get_global_rect().end.y <= short_size.y - 12 if study.has_side_panel_dock() else panel_clears_walking(study,panel)), "deferred content growth keeps the complete panel reachable")
				changing_button.text = original_caption
				for frame in range(6):
					await process_frame
				require(absf(panel.size.y - original_height) < 1 and study.play_area_rect().has_point(study.camera.unproject_position(subject)) and not study.compact_panel_layout_pending, "deferred content shrink restores useful space and subject without a pending loop")
			# Explicit Info may grow the header, but must leave controls reachable.
			study.set_header_details(true, false)
			await process_frame
			await process_frame
			await process_frame
			require(panel.get_global_rect().end.y <= short_size.y - 12 and study.play_area_rect().size.y >= 75, "short activity dock refits below deliberately opened Info")
			require(panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y and study.play_area_rect().has_point(study.camera.unproject_position(subject)), "Info growth moves dock below header and reframes the actual subject")
			var info_font: Font = study.info.get_theme_font("normal_font")
			require(study.info.size.y >= info_font.get_height(study.info.get_theme_font_size("normal_font_size")), "short deliberate Info retains a complete font line and scrolling")
			study.set_header_details(false, false)
			await process_frame
			await process_frame
			await process_frame
			require(panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y and study.play_area_rect().has_point(study.camera.unproject_position(subject)), "Info shrink also preserves header and subject clearance")
			for boundary in ([Vector2i(519, 568), Vector2i(520, 559), Vector2i(559, 559), Vector2i(560, 559), Vector2i(520, 560)] if short_size.x >= 520 and short_size.x < 560 and short_size.y < 560 else [Vector2i(599, 667), Vector2i(600, 559), Vector2i(600, 560)]):
				root.size = boundary
				await process_frame
				await process_frame
				await process_frame
				require(is_equal_approx(panel.anchor_left, 1.0 if boundary.x >= study.SIDE_ACTIVITY_MIN_WIDTH and boundary.y < study.SIDE_HUB_MAX_HEIGHT else 0.0) and study.play_area_rect().has_point(study.camera.unproject_position(subject)), "open activity crosses width/height dock boundaries with its real subject")
				require(panel.get_global_rect().position.y >= study.header_panel.get_global_rect().end.y and (study.controls.get_global_rect().end.x <= panel.get_global_rect().position.x if study.has_side_panel_dock() else panel_clears_walking(study,panel)), "open boundary keeps panel clear of header and walking controls")
				if kind == "conversation":
					require(is_equal_approx(study.panel_frame_subject.y, 1.0 if study.uses_compact_activity_controls() else 2.2), "rotation uses the same conversation body focus as a fresh open")
			root.size = Vector2i(360, 640)
			await process_frame
			await process_frame
			await process_frame
			require(panel.anchor_left == 0.0 and study.play_area_rect().has_point(study.camera.unproject_position(subject)), "open portrait rotation undocks the panel and retains its actual subject")
			root.size = short_size
			await process_frame
			await process_frame
			await process_frame
			require(panel.anchor_left == (1.0 if short_size.x >= study.SIDE_ACTIVITY_MIN_WIDTH and short_size.y < study.SIDE_HUB_MAX_HEIGHT else 0.0) and study.play_area_rect().has_point(study.camera.unproject_position(subject)), "rotating back restores the short layout and actual subject")
			study.pan_camera_by_screen_delta(Vector2(9, 4))
			var manual: Array = study.panel_camera_pose()
			study.refit_panel_after_layout()
			await process_frame
			await process_frame
			await process_frame
			require(manual == study.panel_camera_pose(), "short activity refit preserves manual inspection intent")
			study.end_conversation()
			await process_frame
			await process_frame
			await process_frame
			require(study.controls.offset_right == -12 and study.map_control.text == "Tenderloin Map", "closing short activity restores normal walking controls")
			var tall_phone: bool = short_size.x < 600 and (short_size.x < 520 or short_size.y >= 560)
			if study.uses_phone_disclosure():
				await verify_phone_walking_restored(study,short_size)
			else:
				require(study.controls.columns == (2 if tall_phone else 3) and study.controls.offset_top == (-174 if tall_phone else (-116 if short_size.x < 600 else -124)), "real Close restores walking grid and vertical offsets")
				var normal_labels: Array = ["What's Next?", "Tenderloin Map", "Find Me", "Zoom In (+)", "Zoom Out (−)", guided_caption(study)]
				for i in range(study.controls.get_child_count()):
					var control: Button = study.controls.get_child(i)
					require(control.text == normal_labels[i] and control.custom_minimum_size.y == 50, "real Close restores every walking caption and target size")
			for restored_panel in [study.block_panel, study.mural_panel, study.music_panel]:
				require(restored_panel.grow_vertical == Control.GROW_DIRECTION_END, "real Close restores panel grow direction")
	study.last_panel_dialogue = ""
	study.player.position = original_player
	study.objective_refresh_timer = original_timer
	study.overview()

func verify_scene_overlay_bounds(study: Node, context: String) -> void:
	var occupied: Array[Rect2] = []
	if study.reward_banner.visible:
		var banner: Rect2 = study.reward_banner.get_global_rect()
		require(study.play_area_rect().encloses(banner), "reward stays in play area: " + context)
		require(not banner.intersects(study.player_overlay_rect()), "reward clears the player and YOU: " + context)
		occupied.append(banner)
	if study.is_speech_bubble_visible():
		var speech: Rect2 = study.speech_bubble_screen_rect()
		require(study.play_area_rect().encloses(speech), "full speech including border and tail stays in play area: " + context)
		require(not speech.intersects(study.player_overlay_rect()), "speech clears the player and YOU: " + context)
		for previous in occupied:
			require(not speech.intersects(previous), "speech clears reward: " + context)
		occupied.append(speech)
	if study.talk_prompt_node.is_visible_in_tree():
		var talk: Rect2 = study.talk_prompt_screen_rect()
		require(study.play_area_rect().encloses(talk), "talk prompt stays in play area: " + context)
		for previous in occupied:
			require(not talk.intersects(previous), "talk prompt clears other overlays: " + context)
		occupied.append(talk)
	if study.guide_arrow.visible and study.guide_arrow_label.visible:
		var guide: Rect2 = study.guide_arrow_label.get_global_rect().grow(6.0)
		require(not guide.intersects(Rect2(study.guide_arrow.position - Vector2(20.0, 20.0), Vector2(40.0, 40.0))), "guide name clears its arrow glyph: " + context)
		require(study.play_area_rect().encloses(guide), "outlined guide label stays in play area: " + context)
		for previous in occupied:
			require(not guide.intersects(previous), "guide label clears other overlays: " + context)
		occupied.append(guide)
	for caption in study.visible_scene_captions:
		var rect: Rect2 = caption.rect
		require(study.play_area_rect().encloses(rect), "caption stays in play area: " + context)
		for previous in occupied:
			require(not rect.intersects(previous), "caption clears other text: " + context)
		occupied.append(rect)

# Linear geometry oracle preserves the pre-index implementation for parity checks.
func reference_building_containing_point(study, pt: Vector2) -> String:
	for idx in range(study.current_buildings.size()):
		if not study.current_building_rects[idx].has_point(pt):
			continue
		var b: Dictionary = study.current_buildings[idx]
		for polygon in b.polygons:
			if study.is_point_in_building_polygon(pt, polygon):
				return b.id
	return ""


func reference_min_wall_distance(study, pt: Vector2, cutoff: float = INF) -> float:
	var best := cutoff
	for idx in range(study.current_buildings.size()):
		if best < INF:
			if not study.current_building_rects[idx].grow(best).has_point(pt):
				continue
		elif study.rect_distance_2d(study.current_building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = study.current_buildings[idx]
		for polygon in b.polygons:
			for ring in polygon.rings:
				var r_size: int = ring.size()
				for i in range(r_size):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % r_size]
					var d: float = study.dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
					if d < best:
						best = d
						if cutoff < INF:
							return best
	return best

func verify_mural_workshop(study: Node) -> void:
	study.hide_story_card()
	study.set_header_details(false,false)
	study.current_path.clear()
	study.player.position = study.BLACKHAWK_POS
	var far_save := JSON.stringify(study.build_save_envelope())
	require(not study.open_mural_workshop() and not study.is_mural_workshop_visible() and far_save == JSON.stringify(study.build_save_envelope()), "workshop rejects remote editing without changing save")
	# An explicit native fixture verifies that later art cannot rewrite the copied keepsake.
	var old_photo: Dictionary = study.keepsake_photo.duplicate(true)
	study.keepsake_photo = {"status":"taken","participants":["bea","celeste","dez","thanh"],"mural":{"sun":{"col":0,"row":0},"wave":{"col":3,"row":1},"rise":{"col":5,"row":2}},"palette":"garden","layout":"table"}
	var frozen_photo := JSON.stringify(study.keepsake_photo)
	var frozen_svg: String = study.build_keepsake_svg(study.keepsake_photo)
	var stand: Vector2 = study.mural_stand_xz()
	study.player.position = Vector3(stand.x,0,stand.y)
	study.walk_to_mural()
	# A final-approach fixture must retain the original pending arrival/talk.
	study.current_path.append(stand + Vector2(0.5,0))
	study.walking_to_mural = true
	study.pending_celeste_talk = true
	var pending_talks: int = study.celeste_talk_count
	require(not study.open_mural_workshop() and not study.current_path.is_empty() and study.walking_to_mural and study.pending_celeste_talk and study.celeste_talk_count == pending_talks, "early workshop input cannot cancel arrival or first-talk progress")
	study.current_path.clear()
	study.walking_to_mural = false
	study.pending_celeste_talk = false
	study.show_block_panel(true)
	require(not study.open_mural_workshop() and study.block_panel.visible, "F2 cannot silently replace another resident's panel")
	study.show_mural_panel(true)
	for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(320,568),Vector2i(360,640)]:
		root.size = size
		for frame in range(5): await process_frame
		study.focus_mural_camera()
		study.pan_camera_by_screen_delta(Vector2(10,4))
		for frame in range(4): await process_frame
		require(study.mural_compose_btn.visible, "nearby workshop entry fits in the native scene")
		study.mural_compose_btn.grab_focus()
		for frame in range(3): await process_frame
		require(study.mural_compose_btn.has_focus(), "entry retains keyboard focus across layout frames")
		var pose: Array = study.panel_camera_pose()
		var player_pos: Vector3 = study.player.position
		var before: String = JSON.stringify(study.build_save_envelope())
		require(study.open_mural_workshop(), "nearby artist can open workshop")
		for frame in range(6): await process_frame
		var w = study.mural_workshop
		var snap: Dictionary = w.snapshot()
		var screen := Rect2(Vector2.ZERO,Vector2(size))
		var panel_rect := Rect2(snap.panel.x,snap.panel.y,snap.panel.width,snap.panel.height)
		print("MURAL_WORKSHOP_CHECK ",size," panel=",panel_rect," pending=",w.layout_pending)
		require(not w.layout_pending and screen.encloses(panel_rect), "workshop settles entirely on-screen")
		require(snap.cells.size() == 18 and snap.tools.size() == 3, "workshop offers18exact cells and3contributions")
		for b in snap.cells + snap.tools + snap.options:
			require(b.width >= 44 and b.height >= 44 and b.text_fits and panel_rect.encloses(Rect2(b.x,b.y,b.width,b.height)), "workshop full label and44px target fits: " + b.text)
		require(w.done_button.get_global_rect().end.y <= size.y - 11, "workshop Back remains reachable")
		# Empty button text is intentional; separately prove the continuous art surface.
		for i in range(18):
			require(w.cells[i].text.is_empty() and w.cells[i].get_theme_stylebox("normal") is StyleBoxEmpty and w.cells[i].accessibility_name.contains("Column"), "painted canvas has named hit targets, no text tiles or opaque card styles")
		for mark in snap.art.motifs:
			var mark_rect := Rect2(mark.x,mark.y,mark.width,mark.height)
			var target: Dictionary = snap.cells[int(mark.row)*6+int(mark.col)]
			require(Rect2(target.x,target.y,target.width,target.height).encloses(mark_rect) and mark.width >= 20 and mark.height >= 25, "painted contribution reserves a useful layout box inside its exact target; actual stroke presence is checked in browser pixels")
		require(snap.art.motifs.size() == study.mural_placements.size() and snap.art.slot_marks == 18-study.mural_placements.size(), "layout metadata reflects the saved contribution count; drawn marks are independently checked in actual browser pixels")
		require(w.signature.focus_mode==Control.FOCUS_NONE and snap.signature.icons.size()==4,"original instrument/tea/heart border stays outside keyboard ring")
		for icon in snap.signature.icons:
			var rect := Rect2(icon.x,icon.y,icon.width,icon.height)
			for c in w.cells: require(not rect.intersects(c.get_global_rect()),"artistic border does not obscure precise painted targets")
		require(study.mural_banner_mesh.material_override.albedo_texture!=null and study.mural_banner_mesh.visible and study.mural_banner_mesh.material_override.uv1_scale==Vector3(3,2,1) and not study.mural_banner_mesh.material_override.emission_enabled,"completed street easel maps all4 original ink icons through every BoxMesh face atlas without white wash")
		for icon in snap.signature.icons:
			require(w.scroll.get_global_rect().grow(1).encloses(Rect2(icon.x,icon.y,icon.width,icon.height)),"new border is actually inside the unclipped reading viewport")
		var saved_model: Dictionary = w.art_model.duplicate(true)
		for palette in study.MURAL_PALETTES:
			for complete in [false,true]:
				w.art_model["canvas_color"] = study.mural_palette_color(palette,complete)
				var paper_linear: Color = w.paper_color().srgb_to_linear()
				var ink_linear: Color = w.INK.srgb_to_linear()
				require((paper_linear.get_luminance()+0.05)/(ink_linear.get_luminance()+0.05) >= 3, "ink keyline/focus stays distinguishable on every complete and incomplete palette wash")
		w.present(saved_model)
		var first_art: String = JSON.stringify(w.art_snapshot())
		w.present(saved_model)
		require(JSON.stringify(w.art_snapshot()) == first_art and JSON.stringify(study.build_save_envelope()) == before, "repeated presentation is deterministic and never writes artwork")
		require(snap.art.motifs.size() == 3 and snap.art.motifs.map(func(mark): return mark.id).has("wave") and snap.art.motifs.map(func(mark): return mark.id).has("rise"), "inherited completed native fixture covers all three motif layout boxes, not only Sun")
		w.cells[7].grab_focus()
		w.hovered_cell = 8
		require(w.active_canvas_cell() == 7 and w.preview_canvas_cell() == 8, "hover has its own preview while keyboard guide retains the actual Space target")
		require(study.last_a11y_announcement.contains("Column 2, row 2") and w.feedback.text.contains("Column 2, row 2"), "arrow-target focus has both a visible position caption and live announcement")
		print("PAINTED_MURAL_CHECK ",size," art=",snap.art.motifs.size()," paper=",snap.art.paper)
		w.tool_buttons[0].emit_signal("pressed")
		require(study.mural_workshop_selected == "sun" and before == JSON.stringify(study.build_save_envelope()), "selecting contribution changes no saved art or progress")
		var target_cell := Vector2i(-1,-1)
		for i in range(18):
			var col: int = i % 6
			var row: int = i / 6
			if not study.cell_occupied_by_other(col,row,"sun") and (not study.mural_placements.has("sun") or int(study.mural_placements.sun.col) != col or int(study.mural_placements.sun.row) != row):
				target_cell = Vector2i(col,row)
				break
		w.cells[target_cell.y*6+target_cell.x].emit_signal("pressed")
		for frame in range(3): await process_frame
		require(int(study.mural_placements.sun.col) == target_cell.x and int(study.mural_placements.sun.row) == target_cell.y, "actual cell callback places the selected mark exactly")
		var sun_node: Node3D = study.mural_motif_nodes.sun
		require(sun_node.position.is_equal_approx(Vector3(-1.28+target_cell.x*0.51,1.98-target_cell.y*0.43,0.11)), "workshop exact placement appears on3Deasel")
		w.cells[target_cell.y*6+target_cell.x].grab_focus()
		w.present(w.art_model)
		require(w.position_caption.contains("Sun") and w.feedback.text.begins_with(w.position_caption), "refresh retains a visible, current occupied position caption without another focus event")
		var placed: String = JSON.stringify(study.build_save_envelope())
		require(not study.place_workshop_contribution(target_cell.x,target_cell.y) and placed == JSON.stringify(study.build_save_envelope()), "same-cell input cannot replay save/progress")
		require(not study.place_workshop_contribution(-1,0) and placed == JSON.stringify(study.build_save_envelope()), "invalid workshop cell changes no save")
		# A second contribution deliberately tries the occupied Sun cell.
		w.tool_buttons[1].emit_signal("pressed")
		require(not study.place_workshop_contribution(target_cell.x,target_cell.y) and study.mural_workshop_message.contains("nothing has moved") and placed == JSON.stringify(study.build_save_envelope()), "occupied-cell rejection is visible and non-destructive")
		var key := InputEventKey.new()
		key.keycode = KEY_W
		key.physical_keycode = KEY_W
		key.pressed = true
		Input.parse_input_event(key)
		for frame in range(3): await physics_frame
		require(Input.is_key_pressed(KEY_W) and study.player.position == player_pos and study.panel_camera_pose() == pose, "real held walking key is blocked by workshop")
		key.pressed = false
		Input.parse_input_event(key)
		var was_music: bool = study.music_playing
		w.music_button.emit_signal("pressed")
		require(study.music_playing != was_music, "workshop has an actual independent music toggle")
		w.music_button.emit_signal("pressed")
		require(study.music_playing == was_music and placed == JSON.stringify(study.build_save_envelope()), "music preference restores without progression writes")
		var palette_before: String = study.mural_palette
		w.palette_button.emit_signal("pressed")
		require(study.mural_palette != palette_before, "workshop palette callback changes the actual board")
		require(frozen_photo == JSON.stringify(study.keepsake_photo) and frozen_svg == study.build_keepsake_svg(study.keepsake_photo), "free later art edits preserve immutable keepsake andSVG")
		for expanded in [false,true]:
			study.set_header_details(expanded,false)
			study.trigger_feel_good_burst("Workshop milestone","Native queue fixture",study.MURAL_POS,Color.WHITE,true)
			var cue_time: float = study.reward_banner_timer
			study.update_celebration_burst(0.5)
			require(cue_time > 0 and not study.reward_banner.visible and study.reward_banner_timer == cue_time, "workshop retains hidden reward time with Info collapsed or expanded")
		study.set_header_details(false,false)
		for boundary in [Vector2i(520,360),Vector2i(320,667),size]:
			root.size = boundary
			for frame in range(6): await process_frame
			require(Rect2(Vector2.ZERO,Vector2(boundary)).encloses(w.panel.get_global_rect()) and not w.layout_pending, "open workshop rotation settles with reachable Back")
		w.done_button.emit_signal("pressed")
		for frame in range(4): await process_frame
		require(not study.is_mural_workshop_visible() and study.mural_panel.visible and study.panel_camera_pose() == pose and study.player.position == player_pos and study.music_playing == was_music, "Back preserves the artist view, location and pause intent")
		if study.mural_compose_btn.visible: require(study.mural_compose_btn.has_focus(), "Back retains entry focus after settled frames")
		require(JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size() <= 4096, "workshop retains bounded existing save schema")
	# Replies respond to arrangement, never a correct-art puzzle.
	for arrangement in [{"sun":{"col":0,"row":0},"wave":{"col":3,"row":1},"rise":{"col":5,"row":2}}, {"sun":{"col":1,"row":1},"wave":{"col":4,"row":1},"rise":{"col":0,"row":0}}, {"sun":{"col":2,"row":2},"wave":{"col":1,"row":0},"rise":{"col":3,"row":1}}]:
		study.mural_placements = arrangement.duplicate(true)
		study.update_mural_3d()
		var reply: String = study.mural_composition_reply()
		require(reply.contains("Lulu") and reply.contains("Dez") and reply.contains("Rise") and study.mural_completed, "all expressive arrangements retain3motif completion and authored credits")
		if int(arrangement.sun.row) == int(arrangement.wave.row): require(reply.contains("share a horizon"), "artist notices same-row arrangement")
		elif int(arrangement.sun.row) < int(arrangement.wave.row): require(reply.contains("Sun shines above"), "artist notices Sun above Wave")
		else: require(reply.contains("Wave floats above"), "artist notices Wave above Sun")
	study.keepsake_photo = old_photo
	# Explicit pending-chapter fixture: a card must not steal a cell's focus.
	var saved_chapter: int = study.last_story_chapter
	study.last_story_chapter = int(study.current_chapter().num) - 1
	require(study.open_mural_workshop(), "pending chapter fixture opens nearby workshop")
	study.mural_workshop.cells[7].grab_focus()
	for frame in range(4): await process_frame
	require(not study.is_story_card_visible() and study.mural_workshop.cells[7].has_focus(), "pending chapter waits without stealing workshop focus")
	study.close_mural_workshop()
	for frame in range(4): await process_frame
	require(study.is_story_card_visible(), "pending chapter is delivered after Back")
	study.hide_story_card()
	study.last_story_chapter = saved_chapter
	study.overview()

func verify_rhythm_circle(study: Node) -> void:
	var saved := JSON.stringify(study.build_save_envelope())
	var positions: Array[Vector3] = []
	for n in study.neighbor_nodes: positions.append(n.position)
	study.hide_story_card()
	study.startup_story_pending = false
	study.current_path.clear()
	study.block_opened = true
	study.programme_published.assign(["beats","pause","stories","art"])
	study.hosting_order.assign(["beats","pause","stories","art"])
	study.hosting_results.clear()
	study.hosting_draft = study.default_hosting_draft()
	study.last_story_chapter = int(study.current_chapter().num)
	study.opening_conversation = false
	study.talk_partner = -1
	study.in_overview = false
	study.in_wide_overview = false
	var circle: Control = study.rhythm_circle
	for layout in ["table","floor"]:
		study.gathering_layout = layout
		study.update_layout_3d()
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(320,568)]:
			root.size = size
			study.show_block_panel(true)
			study.last_story_chapter=int(study.current_chapter().num)
			study.hide_story_card()
			for f in range(5): await process_frame
			study.hide_story_card()
			if size.x==1100:
				study.player.position = study.BLACKHAWK_POS
				study.selected = 0
				study.meshes[0].material_override = study.chosen_material
			circle.layout_entry()
			var pose: Array = study.panel_camera_pose()
			require(circle.entry.visible and Rect2(Vector2.ZERO,Vector2(size)).encloses(circle.entry.get_global_rect()),"visible hub entry fits actual native viewport")
			circle.entry.grab_focus()
			circle.entry.emit_signal("pressed")
			require(circle.visible,"active beats have an actual visible Rhythm Circle")
			for f in range(5): await process_frame
			require(study.panel_camera_pose()==pose,"opening keeps camera until deliberate View Circle")
			circle.view_circle()
			if size.x==1100:
				require(study.selected==-1 and circle.cutaway_points().size()==10,"explicit Circle view clears inspection selection and supplies remote stage cutaway subjects")
				var relevant := 0
				for group in [[study.data.buildings,study.building_rects,study.occluded_buildings],[study.data.wider_buildings,study.wider_building_rects,study.occluded_wider_buildings],[study.lidar_additions,study.addition_rects,study.occluded_additions]]:
					for idx in range(group[0].size()):
						for fp in circle.cutaway_points():
							if study.building_record_occludes_point(group[0][idx],group[1][idx],fp):
								relevant += 1
								require(group[2].has(idx),"actual foreground buildings cut away for the remote stage, not only the distant player")
								break
				require(relevant>0,"remote-stage native cutaway check uses real foreground geometry")
			for f in range(3): await process_frame
			var view: Dictionary = circle.snapshot()
			require(view.world_visible and view.subjects.size()==4 and view.lamps.size()==8,"both layouts stage one fictional visiting performer, two listeners, drum and eight lanterns")
			require(circle.scene_rect.size.y>=120 and circle.scene_rect.size.x>=240,"rhythm controls leave useful world space")
			for b in circle.pads+circle.options:
				require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).grow(1).encloses(b.get_global_rect()),"all rhythm inputs remain visible44px targets")
			for subject in view.subjects:
				require(circle.scene_rect.has_point(Vector2(subject.x,subject.y)) and circle.scene_rect.has_point(Vector2(subject.head_x,subject.head_y)),"real subject foot and head fit the world view")
			var original: int = circle.pattern()
			for bit in range(8):
				circle.pads[bit].emit_signal("pressed")
				require(circle.pattern()==(original ^ (1<<bit)),"each actual pad calls the exact existing draft bit")
				for li in range(2):
					var col: Color = circle.lamps[li][bit].material_override.albedo_color
					require(col==(circle.HIT if circle.pattern() & (1<<bit) else circle.REST),"pad changes actual3D material on both layouts")
				circle.pads[bit].emit_signal("pressed")
			circle.options[0].emit_signal("pressed")
			require(circle.pattern()==0,"listening zero is a complete valid draft")
			circle.step_cues = true
			study.music_playing = false
			circle.update_world()
			require(circle.active_step==-1,"paused and listening have static poses")
			circle.toggle_step(2)
			study.music_playing = true
			study.music_volume = 0.7
			study.music_mode = "sketch"
			study.sketch_frames_pushed = int(study.MUSIC_STEP_SEC*study.MUSIC_MIX_RATE*2.1+(study.sketch_generator.buffer_length*study.MUSIC_MIX_RATE if study.sketch_playback!=null else 0))
			circle.update_world()
			require(circle.active_step==2 and circle.lamps[0][2].scale.x==1.25,"opted-in cues derive from sketch tick")
			for mode in ["local","sketch"]:
				study.music_mode = mode
				study.music_volume = 0.0 if mode=="sketch" else 0.7
				circle.update_world()
				require(circle.active_step==-1 and circle.lamps[0][2].scale==Vector3.ONE,"localfiles and mute use honest static fallback")
			study.music_playing = false
			circle.close_circle()
			require(study.panel_camera_pose()==pose,"Back from deliberate View Circle restores original pose")
			if size.x==1100: require(study.selected==0 and study.meshes[0].material_override==study.chosen_material,"Back restores the original building-inspection selection")
			study.hosting_draft.pattern = original
			print("RHYTHM_CIRCLE_CHECK ",layout," ",size," scene=",circle.scene_rect)
	# Complete0 via original callback, then practice cannot rewrite result/photo/save.
	study.hide_story_card()
	circle.open_circle()
	circle.listen()
	circle.complete()
	require(study.get_hosted_segment_value("beats")==0 and study.current_hosting_activity()=="pause","Complete copies listening0 and advances original hosting")
	study.hide_story_card()
	var frozen := JSON.stringify(study.build_save_envelope())
	var photo := JSON.stringify(study.keepsake_photo)
	circle.open_circle()
	require(circle.practice,"completed beats enter labelled ephemeral practice")
	circle.toggle_step(7)
	require(circle.pattern()==128 and frozen==JSON.stringify(study.build_save_envelope()),"practice changes the world without calling inactive save setters")
	circle.view_circle()
	var point: Vector2 = circle.scene_rect.get_center()
	var down := InputEventScreenTouch.new()
	down.pressed = true
	down.position = point
	circle.scene_input(down)
	var jitter := InputEventScreenDrag.new()
	jitter.position = point+Vector2(2,0)
	jitter.relative = Vector2(2,0)
	var still: Array = study.panel_camera_pose()
	circle.scene_input(jitter)
	require(circle.owns_view and study.panel_camera_pose()==still,"native touch2px jitter does not silently drop Back restoration")
	var move := InputEventScreenDrag.new()
	move.position = point+Vector2(20,8)
	move.relative = Vector2(18,8)
	circle.scene_input(move)
	require(not circle.owns_view and study.panel_camera_pose()!=still,"actual native touch handler grants ownership only to deliberate scene drag")
	var manual: Array = study.panel_camera_pose()
	circle.close_circle()
	require(study.panel_camera_pose()==manual and circle.pattern()==0 and photo==JSON.stringify(study.keepsake_photo),"Back preserves manual ownership and restores copied saved rhythm/photo")
	# Open rotation must restore the followed body above the real hub.
	study.frame_player_for_walking()
	study.show_block_panel(true)
	for f in range(5): await process_frame
	study.block_close_btn.grab_focus()
	circle.open_circle()
	circle.view_circle()
	root.size = Vector2i(520,360)
	for f in range(8): await process_frame
	circle.close_circle()
	for f in range(8): await process_frame
	require(study.block_close_btn.has_focus() and study.play_area_rect().grow(1).encloses(study.player_overlay_rect()),"rotation Back restores focus and full followed player above restored dock")
	# A followed view may refit its target after round-trip rotation; manual views remain exact.
	root.size = Vector2i(559,360)
	for f in range(8): await process_frame
	var returned_zoom: float = study.view_size
	var returned_yaw: float = study.camera_yaw
	circle.open_circle()
	circle.view_circle()
	root.size = Vector2i(390,667)
	for f in range(8): await process_frame
	root.size = Vector2i(559,360)
	for f in range(8): await process_frame
	circle.close_circle()
	for f in range(8): await process_frame
	require(study.following_player and study.view_size==returned_zoom and study.camera_yaw==returned_yaw and study.play_area_rect().grow(1).encloses(study.player_overlay_rect()),"559 round-trip rotation Back keeps zoom/heading and fits the followed body rather than freezing an obsolete layout target")
	study.following_player = false
	var manual_return: Array = study.panel_camera_pose()
	circle.open_circle()
	circle.view_circle()
	root.size = Vector2i(390,667)
	for f in range(8): await process_frame
	root.size = Vector2i(559,360)
	for f in range(8): await process_frame
	circle.close_circle()
	for f in range(8): await process_frame
	require(not study.following_player and study.panel_camera_pose()==manual_return,"round-trip rotation Back restores the complete manually owned pose exactly")
	# Last segment preserves the original completion announcement, including listening0.
	study.hosting_order.assign(["stories","pause","art","beats"])
	study.hosting_results.assign([{"id":"stories","value":"memory"},{"id":"pause","value":"arc"},{"id":"art","value":{"palette":"warm","tiles":[0,1,2,2,1,0]}}])
	study.hide_story_card()
	study.last_story_chapter = int(study.current_chapter().num)
	circle.open_circle()
	circle.listen()
	circle.complete()
	require(study.is_hosting_done() and study.get_hosted_segment_value("beats")==0 and study.last_a11y_announcement.contains("Second Afternoon Complete"),"beats-last Complete0 retains main's earned final announcement")
	study.hide_story_card()
	circle.open_circle()
	study.reset_mural_state_to_defaults("fresh")
	require(not circle.visible and not study.is_mural_workshop_visible(),"state reset closes focused views before replacing models")
	for i in range(positions.size()): require(positions[i]==study.neighbor_nodes[i].position,"named neighbor navigation anchors never move or duplicate")
	require(JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size()<=4096,"rhythm adds no save keys or budget growth")
	study.apply_save_envelope(saved)
	study.music_playing = false
	study.music_mode = "sketch"
	root.size = Vector2i(1100,760)

func verify_mural_stories(study: Node, full_profile: String) -> void:
	var saved: String = JSON.stringify(study.build_save_envelope())
	require(study.apply_save_envelope(full_profile) and study.is_hosting_done() and study.civic_phase=="done" and study.film_phase=="done" and study.keepsake_photo.status=="taken","scene compatibility starts from the actual native completed M1-M4 callback profile")
	var old: Dictionary = study.build_save_envelope().duplicate(true)
	old.erase("mural_scenes")
	require(study.apply_save_envelope(JSON.stringify(old)),"existing saves without optional stories remain valid")
	require(study.mural_scenes.is_empty() and not study.build_save_envelope().has("mural_scenes"),"unused story field does not rewrite old schema or add bytes")
	for malformed in [null,[],"cooking",{"left":"unknown","right":9},{"left":"cooking","right":"cooking","third":"painting"}]:
		var env := old.duplicate(true)
		env["mural_scenes"] = malformed
		require(study.apply_save_envelope(JSON.stringify(env)),"malformed optional stories never reset valid core progress")
		require(study.keepsake_photo == old.epilogue.photo and study.hosting_results == old.hosting.results,"optional validation preserves actual copied photo and later progress")
		require(study.mural_scenes.size() <= 1,"unknown and duplicate stories filter independently")
	require(preload("res://mural_stories.gd").clean({"left":"sharing","right":"painting"}) == {"left":"sharing","right":"painting"},"two distinct known scenes survive validation")
	require(preload("res://mural_stories.gd").clean({"left":"music","right":"garden"}) == {"left":"music","right":"garden"},"new short scene IDs round trip through the existing bounded optional contract")
	study.apply_save_envelope(JSON.stringify(old))
	study.hide_story_card()
	study.startup_story_pending = false
	study.current_path.clear()
	var stand: Vector2 = study.mural_stand_xz()
	study.player.position = Vector3(stand.x,0,stand.y)
	study.show_mural_panel(true)
	study.last_story_chapter = int(study.current_chapter().num)
	var photo: String = JSON.stringify(study.keepsake_photo)
	var svg: String = study.build_keepsake_svg(study.keepsake_photo)
	var placements: Dictionary = study.mural_placements.duplicate(true)
	var sparks: int = study.spark_count()
	var geometry: Vector3 = study.mural_canvas_mesh.mesh.size
	require(not study.edit_mural_scene("cooking","left"),"closed scene editor cannot edit saved art")
	for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(320,568),Vector2i(800,480)]:
		root.size = size
		require(study.open_mural_workshop(),"nearby mural offers the existing Workshop")
		for f in range(6): await process_frame
		study.mural_workshop.stories_entry.emit_signal("pressed")
		var art: Control = study.mural_workshop.stories
		for f in range(8): await process_frame
		require(art.visible and not study.mural_workshop.panel.visible and study.is_mural_workshop_visible(),"new reader is a submode of the original modal guard")
		var view := Rect2(Vector2.ZERO,Vector2(size))
		require(view.grow(1).encloses(art.panel.get_global_rect()) and not art.layout_pending,"new paper panel settles on screen")
		for b in art.choices+art.targets+art.lifts+[art.palette_button,art.music_button,art.back_button,art.page_button]:
			require(b.size.x >= 44 and b.size.y >= 44,"all story targets retain44px")
			require(art.panel.get_global_rect().grow(1).encloses(b.get_global_rect()),"complete scene controls are reachable inside the panel")
		for b in art.choices:
			var row: Control = b.get_child(0)
			require(b.get_global_rect().grow(1).encloses(row.get_global_rect()),"illustrated full-name swatch stays inside its button")
		art.reader.custom_minimum_size.y = 72
		for f in range(8): await process_frame
		require(not art.layout_pending and view.grow(1).encloses(art.panel.get_global_rect()),"deferred reader growth refits without dropping rewrap or looping")
		art.reader.custom_minimum_size.y = 36
		for f in range(8): await process_frame
		require(not art.layout_pending and view.grow(1).encloses(art.panel.get_global_rect()),"reader shrink settles back on screen")
		var original_paper: Vector2 = art.paper_rect.size
		var before_page: String = JSON.stringify(study.build_save_envelope())
		art.page_button.emit_signal("pressed")
		for f in range(8): await process_frame
		require(art.scene_page==1 and art.choices[0].accessibility_name=="Making Music" and art.choices[1].accessibility_name=="Growing Together" and not art.choices[2].visible,"second artist page exposes two full original names without a phantom third choice")
		require(before_page==JSON.stringify(study.build_save_envelope()),"browsing scenes is not an art edit or save")
		require(art.paper_rect.size.y>=original_paper.y-1 and art.paper_rect.size.x>=original_paper.x-1,"more scenes do not shrink the primary painting surface")
		for b in art.choices+art.targets+art.lifts+[art.palette_button,art.music_button,art.back_button,art.page_button]:
			if b.visible:
				require(b.size.x>=44 and b.size.y>=44 and art.panel.get_global_rect().grow(1).encloses(b.get_global_rect()),"new page keeps all visible targets inside the panel at44px")
		var music_before: bool = study.music_playing
		art.choices[0].emit_signal("pressed")
		art.targets[0].emit_signal("pressed")
		art.choices[1].emit_signal("pressed")
		art.targets[1].emit_signal("pressed")
		require(study.mural_scenes=={"left":"music","right":"garden"} and study.music_playing==music_before,"actual new choice and paper callbacks paint both silent original scenes")
		require(study.neighbor_greeting_line("dez").contains("painted guitar") and study.neighbor_greeting_line("thanh").contains("painted planter"),"both real resident dialogue builders notice current live art without a new relationship flag")
		for resident in ["dez","thanh"]:
			var spoken: String = study.spoken_text_from_line(study.neighbor_greeting_line(resident))
			require(not spoken.begins_with(resident.capitalize()+":") and not spoken.contains('"') and spoken.contains("painted"),"new resident reactions stay inside the existing spoken dialogue contract")
			study.show_neighbor_speech(3 if resident=="dez" else 4,study.neighbor_greeting_line(resident))
			require(study.speech_bubble_text==spoken,"actual speech entry receives parsed resident art reaction")
			study.hide_speech_bubble()
		art.choices[2].emit_signal("pressed")
		require(art.selected=="garden","stale hidden-choice activation cannot index outside the shorter page")
		require(photo==JSON.stringify(study.keepsake_photo) and svg==study.build_keepsake_svg(study.keepsake_photo) and study.spark_count()==sparks,"new art never rewrites copied work or grants additional Sparks")
		var new_roundtrip: Dictionary = study.build_save_envelope().duplicate(true)
		new_roundtrip.optional["bounded_art_metadata"] = "x".repeat(512)
		new_roundtrip.discovered_surprises = study.NEIGHBORHOOD_SURPRISE_IDS.duplicate()
		require(JSON.stringify(new_roundtrip).to_utf8_buffer().size()<=4096,"actual completed profile plus new pair/all surprises/512bytes remains bounded")
		art.lifts[0].emit_signal("pressed")
		art.lifts[1].emit_signal("pressed")
		require(study.mural_neighbor_reply("dez").is_empty() and study.mural_neighbor_reply("thanh").is_empty(),"lifting removes derived resident reactions immediately")
		art.page_button.emit_signal("pressed")
		for f in range(8): await process_frame
		require(art.scene_page==0 and art.choices[2].visible,"page return preserves all three existing choices")
		print("LIVING_MURAL_CHECK ",size," paper=",art.paper_rect.size)
		art.select_scene("cooking")
		art.targets[0].emit_signal("pressed")
		require(study.mural_scenes.get("left")=="cooking","actual target callback paints chosen left scene")
		art.select_scene("painting")
		art.targets[1].emit_signal("pressed")
		require(study.mural_scenes=={"left":"cooking","right":"painting"},"two complete people-at-work scenes compose independently")
		var stable: String = JSON.stringify(study.build_save_envelope())
		require(not study.edit_mural_scene("painting","right") and stable==JSON.stringify(study.build_save_envelope()),"same-slot action cannot write or replay progress")
		require(not study.edit_mural_scene("bad","left") and not study.edit_mural_scene("cooking","middle"),"invalid enum/slot cannot alter scene state")
		art.select_scene("cooking")
		art.targets[1].emit_signal("pressed")
		require(study.mural_scenes=={"right":"cooking"},"moving one scene replaces the optional occupant without duplication")
		art.select_scene("sharing")
		art.targets[0].emit_signal("pressed")
		art.lifts[1].emit_signal("pressed")
		require(study.mural_scenes=={"left":"sharing"},"sharing food and lifting are real optional callbacks")
		study.edit_mural_scene("painting","right")
		require(study.spark_count()==sparks and study.mural_placements==placements,"optional stories never grant farmable Sparks or touch the three required marks")
		require(photo==JSON.stringify(study.keepsake_photo) and svg==study.build_keepsake_svg(study.keepsake_photo),"live art never rewrites an earlier copied keepsake or its SVG")
		var mat: StandardMaterial3D = study.mural_canvas_mesh.material_override
		require(mat.albedo_texture != null and mat.uv1_scale == Vector3(3,2,1) and not mat.emission_enabled,"existing world canvas renders the same static art with correct Box UVs")
		require(study.mural_canvas_mesh.mesh.size==geometry,"new world consequence does not change geometry/collision")
		var pose: Array = study.panel_camera_pose()
		var pos: Vector3 = study.player.position
		var held := InputEventKey.new()
		held.keycode = KEY_W
		held.physical_keycode = KEY_W
		held.pressed = true
		Input.parse_input_event(held)
		for f in range(4): await physics_frame
		held.pressed = false
		Input.parse_input_event(held)
		require(study.player.position==pos and study.panel_camera_pose()==pose,"focused stories block world walking and preserve camera ownership")
		art.back_button.emit_signal("pressed")
		for f in range(5): await process_frame
		require(not art.visible and study.mural_workshop.panel.visible and study.mural_workshop.stories_entry.has_focus(),"Back restores original Workshop and its visible entry focus")
		study.mural_workshop.open_stories()
		var escape := InputEventKey.new()
		escape.keycode = KEY_ESCAPE
		escape.pressed = true
		study._unhandled_input(escape)
		escape.echo = true
		study._unhandled_input(escape)
		require(not art.visible and study.is_mural_workshop_visible(),"pressed Escape plus OS echo returns exactly one level")
		study.close_mural_workshop()
		print("MURAL_STORIES_CHECK ",size," bytes=",JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size())
	var roundtrip: Dictionary = study.build_save_envelope().duplicate(true)
	require(study.apply_save_envelope(JSON.stringify(roundtrip)) and study.mural_scenes=={"left":"sharing","right":"painting"},"scene arrangement survives normal save reload")
	# Defined bounded import metadata, not a claim about every8192-character optional bag.
	roundtrip.optional["story_test_bookmark"] = "x".repeat(512)
	roundtrip.discovered_surprises = study.NEIGHBORHOOD_SURPRISE_IDS.duplicate()
	require(study.apply_save_envelope(JSON.stringify(roundtrip)) and JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size()<=4096,"defined complete profile plus both scenes, all surprises and512byte imported metadata fits4096")
	var before_import: Dictionary = study.mural_scenes.duplicate()
	require(study.import_browser_save_json('{"version":1,"core":{"greeted":true}}') and study.mural_scenes==before_import,"successful browser adapter import does not erase or fabricate local story scenes")
	study.hide_story_card()
	study.current_path.clear()
	study.show_mural_panel(true)
	study.open_mural_workshop()
	study.mural_workshop.open_stories()
	study.optional_save_data["oversized_import"] = "x".repeat(4000)
	var stored := FileAccess.get_file_as_string(study.save_path)
	var seq: int = study.save_seq
	require(study.edit_mural_scene("","left") and study.mural_scenes=={"right":"painting"},"oversized imported profile permits lifting for this visit")
	require(study.edit_mural_scene("cooking","right") and study.edit_mural_scene("cooking","left"),"non-growing replacement and right-to-left move remain usable while full")
	require(study.edit_mural_scene("sharing","left"),"same-size replacement is usable while full")
	var full := JSON.stringify(study.build_save_envelope())
	require(not study.edit_mural_scene("painting","right") and full==JSON.stringify(study.build_save_envelope()),"a growing over-budget edit is refused without truncating imported metadata")
	require(not study.save_godot_state() and seq==study.save_seq and stored==FileAccess.get_file_as_string(study.save_path),"neither scene reductions nor any ordinary save writes an oversized envelope or consumes a sequence")
	require(study.mural_workshop.stories.message.contains("full"),"full-save changes are honestly marked as visit-only")
	study.optional_save_data.erase("oversized_import")
	study.close_mural_workshop()
	study.apply_save_envelope(saved)
	root.size = Vector2i(1100,760)

func verify_rhythm_bar(study: Node) -> void:
	var bar_script = preload("res://rhythm_bar.gd")
	var peak := 0
	# Independent original per-sample generator, before the template optimization.
	var reference := PackedByteArray()
	reference.resize(132300)
	for i in range(66150):
		var bit := int(float(i)/(22050*0.375))
		var t := float(i)/22050 - bit*0.375
		var phase := TAU*(125.0*t+2.4*(1.0-exp(-t*35.0)))
		var attack := minf(t/0.005,1.0)
		var tail := maxf(0.0,1.0-t/0.22)
		var value := attack*tail*tail*(sin(phase)*0.36+sin(TAU*430.0*t)*exp(-t*60.0)*0.06)
		reference.encode_s16(i*2,int(round(value*32767.0)))
	for mask in range(256):
		var wav: AudioStreamWAV = bar_script.make_bar(mask)
		require(wav.data.size()==132300 and wav.mix_rate==22050 and wav.loop_mode==AudioStreamWAV.LOOP_DISABLED and is_equal_approx(wav.get_length(),3.0),"every mask is exactly one finite three-second mono bar")
		var energy := [0,0,0,0,0,0,0,0]
		var actual := wav.data
		var expected := PackedByteArray()
		expected.resize(132300)
		for i in range(66150):
			var value := absi(actual.decode_s16(i*2))
			if mask & (1 << int(float(i)/(22050*0.375))): expected.encode_s16(i*2,reference.decode_s16(i*2))
			peak = maxi(peak,value)
			energy[int(float(i)/(22050*0.375))] += value
		require(actual==expected,"template output is byte-identical to the original per-sample generator for all256 masks")
		for bit in range(8):
			require((energy[bit]>100000)==((mask & (1<<bit))!=0),"actual PCM energy matches each hit for all256 patterns")
			if (mask & (1<<bit))==0: require(energy[bit]==0,"every actual rest window is digitally silent")
	require(peak<16000 and peak>7000,"original synthesized strike has headroom and nonvacuous energy")
	require(bar_script.make_bar(85).data==bar_script.make_bar(85).data,"original audition is deterministic")
	var saved := JSON.stringify(study.build_save_envelope())
	var volume: float = study.music_volume
	var unlocked: bool = study.reward_audio_unlocked
	var sounds: bool = study.reward_sounds_enabled
	study.hide_story_card()
	study.startup_story_pending = false
	study.current_path.clear()
	study.block_opened = true
	study.hosting_order.assign(["beats","pause","stories","art"])
	study.programme_published.assign(study.hosting_order)
	study.hosting_results.clear()
	study.hosting_draft = study.default_hosting_draft()
	study.hosting_draft.pattern = 129
	study.music_playing = true
	study.music_mode = "sketch"
	study.music_volume = 0.7
	study.reward_audio_unlocked = true
	study.reward_sounds_enabled = false
	study.last_story_chapter = int(study.current_chapter().num)
	var circle: Control = study.rhythm_circle
	circle.open_circle()
	var frozen := JSON.stringify(study.build_save_envelope())
	var pose: Array = study.panel_camera_pose()
	study.reward_audio_unlocked = false
	var locked_starts: int = circle.audition.starts
	circle.play_bar()
	require(circle.audition.starts==locked_starts and circle.message.begins_with("Use a key"),"locked audio refuses playback with an accurate explanation")
	study.reward_audio_unlocked = true
	circle.play_bar()
	require(circle.audition_active() and circle.audition.pattern==129 and study.sketch_player.volume_db==-80.0,"explicit Play Bar plays the actual mask and ducks sketch even when rewardSounds are off")
	require(study.music_playing and study.music_volume==0.7 and frozen==JSON.stringify(study.build_save_envelope()) and pose==study.panel_camera_pose(),"audition never changes Music state, save or camera")
	study.music_volume = 0.35
	study.apply_music_volume_db()
	require(circle.audition_active() and study.sketch_player.volume_db==-80.0 and is_equal_approx(circle.audition.volume_db,linear_to_db(0.35)),"live volume applies to bar while sketch stays ducked")
	circle.play_bar()
	require(not circle.audition_active() and is_equal_approx(study.sketch_player.volume_db,linear_to_db(0.35)),"Stop Bar restores current user gain")
	circle.play_bar()
	circle.toggle_step(1)
	require(not circle.audition_active(),"editing stops frozen audition instead of silently auditioning another mask")
	circle.play_bar()
	study.stop_music_playback()
	require(not circle.audition_active(),"MusicOff immediately stops optional audition")
	var starts: int = circle.audition.starts
	circle.play_bar()
	require(circle.audition.starts==starts,"MusicOff cannot start audition")
	study.music_playing = true
	study.music_volume = 0.0
	study.apply_music_volume_db()
	circle.play_bar()
	require(circle.audition.starts==starts,"muted Music cannot start audition")
	study.music_volume = 0.7
	study.music_mode = "local"
	circle.play_bar()
	require(circle.audition.starts==starts,"local files stay independent with no hidden bar playback")
	study.music_mode = "sketch"
	circle.play_bar()
	study._notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	require(not circle.audition_active(),"focus loss stops audition without scheduling a resume")
	require(circle.options[6].accessibility_name=="Play one bar of this rhythm" and not circle.message.contains("Playing"),"non-UI stop refreshes reader and actual accessibility name")
	circle.play_bar()
	study.music_mode = "local"
	study.apply_music_volume_db()
	require(not circle.audition_active(),"switching to local audio stops and releases the sketch duck")
	study.music_mode = "sketch"
	circle.play_bar()
	study.music_volume = 0.0
	study.apply_music_volume_db()
	require(not circle.audition_active(),"live mute stops immediately")
	study.music_volume = 0.7
	circle.play_bar()
	require(circle.audition_active(),"natural-end check starts from a genuinely playing finite bar")
	var natural_deadline := Time.get_ticks_msec()+4500
	var natural_start := Time.get_ticks_msec()
	var natural_frames := 0
	var natural_position := 0.0
	var inactive_at := -1
	while (circle.audition_active() or not is_equal_approx(study.sketch_player.volume_db,linear_to_db(0.7))) and Time.get_ticks_msec()<natural_deadline:
		natural_frames += 1
		if circle.audition_active(): natural_position = circle.audition.get_playback_position()
		elif inactive_at < 0: inactive_at = Time.get_ticks_msec()-natural_start
		await process_frame
	# The mixer can clear playing before its finished signal reaches the main thread.
	# Await BOTH unchanged postconditions; never manually stop or restore gain in this check.
	print("RHYTHM_NATURAL_END ",circle.audition.snapshot()," elapsed_ms=",Time.get_ticks_msec()-natural_start," frames=",natural_frames," last_position=",natural_position," inactive_at_ms=",inactive_at," driver=",AudioServer.get_driver_name()," since_mix=",AudioServer.get_time_since_last_mix()," sketch_gain=",study.sketch_player.volume_db," expected=",linear_to_db(0.7))
	require(natural_position>=2.5 and Time.get_ticks_msec()-natural_start>=2500,"natural end observes actual playback near the finite end, not an unrelated early stop")
	require(not circle.audition_active() and is_equal_approx(study.sketch_player.volume_db,linear_to_db(0.7)),"natural end releases duck, no loop or queue")
	circle.listen()
	starts = circle.audition.starts
	circle.play_bar()
	require(circle.pattern()==0 and circle.audition.starts==starts and circle.message.contains("All rests"),"valid Listening0 refuses fake playback with visible explanation")
	circle.toggle_step(3)
	circle.play_bar()
	circle.complete()
	require(not circle.audition_active() and study.get_hosted_segment_value("beats")==8,"Complete stops and copies only the original pattern result")
	study.hide_story_card()
	circle.open_circle()
	var practice_save := JSON.stringify(study.build_save_envelope())
	var photo := JSON.stringify(study.keepsake_photo)
	circle.toggle_step(7)
	circle.play_bar()
	require(circle.practice and circle.audition.pattern==136 and practice_save==JSON.stringify(study.build_save_envelope()),"practice audition reads ephemeral mask without persisting it")
	circle.complete()
	require(not circle.audition_active() and circle.pattern()==8,"Reset Practice stops bar and restores copied result")
	circle.play_bar()
	circle.close_circle()
	require(not circle.audition_active() and practice_save==JSON.stringify(study.build_save_envelope()) and photo==JSON.stringify(study.keepsake_photo),"Back stops audition and preserves exact copied save/photo")
	study.apply_save_envelope(saved)
	study.music_playing = false
	study.music_mode = "sketch"
	study.music_volume = volume
	study.reward_audio_unlocked = unlocked
	study.reward_sounds_enabled = sounds
	study.apply_music_volume_db()
	print("RHYTHM_BAR_CHECK masks=256 peak=",peak," finite/music/local/focus/practice/save passed")


func verify_film_screening(study: Node, full_profile: String) -> void:
	var screen: Control = study.film_screening
	for framing in ["close","wide"]:
		for plan in ["quiet","later"]:
			for order in study.all_film_shot_orders():
				study.apply_save_envelope(full_profile)
				study.film_result = {"framing":framing,"plan":plan,"order":order.duplicate()}
				study.film_draft = study.copy_film_plan(study.film_result)
				study.film_captured.assign(order)
				study.update_block_3d()
				study.hide_story_card()
				study.startup_story_pending = false
				study.last_story_chapter = int(study.current_chapter().num)
				study.current_path.clear()
				study.show_block_panel(true)
				var before: String = JSON.stringify(study.build_save_envelope())
				var seq: int = study.save_seq
				study.following_player = false
				var pose: Array = study.panel_camera_pose()
				var point: Vector3 = study.player.position
				var music: bool = study.music_playing
				for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(800,480)]:
					root.content_scale_size = size
					root.size = size
					await process_frame
					await process_frame
					study.block_film_btn.emit_signal("pressed")
					await process_frame
					await process_frame
					var vp := Rect2(Vector2.ZERO,Vector2(size))
					require(screen.visible and not study.header_panel.visible and not study.block_panel.visible,"done hub opens focused screening and hides world HUD")
					require(vp.encloses(screen.top.get_global_rect()) and vp.encloses(screen.tray.get_global_rect()) and vp.encloses(screen.art_rect) and screen.art_rect.size.y>=90,"screening header/reader/art stay on-screen at accepted eight sizes")
					for i in range(3):
						screen.shots[i].emit_signal("pressed")
						var expected: String = order[i]
						var table: Dictionary = study.FILM_SHOT_LATER_CAPTIONS if plan=="later" else study.FILM_SHOT_QUIET_CAPTIONS
						require(screen.shot_id()==expected and screen.caption()==table[expected] and screen.reader.text.contains(screen.caption()),"actual copied shot order and all six captions drive visible reader")
						require(screen.picture.texture!=null and screen.picture.texture.get_width()==840 and screen.picture.texture.get_height()==472,"large reader raster is2x original resolution")
						var material: StandardMaterial3D = study.film_frame_canvas.material_override
						require(material.albedo_texture!=null and material.uv1_scale==Vector3(3,2,1) and material.shading_mode==BaseMaterial3D.SHADING_MODE_UNSHADED,"existing world canvas uses letterboxed original texture with corrected BoxMesh UV")
						for b in screen.shots+[screen.music,screen.back]:
							require(b.size.x>=44 and b.size.y>=44 and vp.encloses(b.get_global_rect()),"full shot and Back/Music controls remain reachable44px")
						var key := InputEventKey.new()
						key.pressed=true
						key.keycode=KEY_W
						Input.parse_input_event(key)
						Input.flush_buffered_events()
						require(Input.is_key_pressed(KEY_W),"native held-key fixture actually sets global Input")
						study._physics_process(0.02)
						var key_up: InputEventKey = key.duplicate()
						key_up.pressed=false
						Input.parse_input_event(key_up)
						Input.flush_buffered_events()
						require(study.player.position==point,"focused film blocks world walking")
					var escape := InputEventKey.new()
					escape.pressed=true
					escape.keycode=KEY_ESCAPE
					study._unhandled_input(escape)
					require(not screen.visible and study.block_panel.visible and study.music_playing==music,"Escape returns to original hub and preserves pause")
					require(study.save_seq==seq and JSON.stringify(study.build_save_envelope())==before,"watching all frames adds zero save bytes and writes no saved sequence")
					require(study.panel_camera_pose()==pose,"screening never owns or alters manual/automatic camera pose")
				study.film_screen_frame=0
				require(screen.open_screening(),"completed film can reopen")
				study.apply_save_envelope(full_profile)
				require(not screen.visible and study.film_screen_frame==0,"actual state reload closes viewer and restores transient first frame")
	require(screen.textures.size()==6 and screen.world_textures.size()==6,"both texture caches are bounded to six original framing/shot combinations")
	study.film_phase="planning"
	require(not screen.open_screening(),"unfinished films cannot enter completed screening")
	study.apply_save_envelope(full_profile)
	root.content_scale_size=Vector2i(1100,760)
	root.size=Vector2i(1100,760)
	await process_frame
	study.hide_story_card()
	study.startup_story_pending=false
	study.current_path.clear()
	study.show_block_panel(true)
	study.block_film_btn.grab_focus()
	require(screen.open_screening(),"focused Watch Film opens before rotating")
	root.content_scale_size=Vector2i(320,568)
	root.size=Vector2i(320,568)
	await process_frame
	await process_frame
	screen.close_screening()
	require(study.block_hub_page==2 and study.block_film_btn.is_visible_in_tree() and study.block_film_btn.has_focus(),"wide-to-paged Close reveals actual Watch Film and restores focus")
	for overview in [false,true]:
		study.following_player=not overview
		study.in_overview=overview
		study.in_wide_overview=false
		var owned_pose: Array = study.panel_camera_pose()
		require(screen.open_screening(),"followed and overview views open screening")
		for resize in [Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(320,568)]:
			root.content_scale_size=resize
			root.size=resize
			await process_frame
			await process_frame
			await process_frame
			require(study.panel_camera_pose()==owned_pose and study.following_player==(not overview) and study.in_overview==overview,"focused reader resize never refits hidden followed/overview camera")
		screen.close_screening()
	study.in_overview=false
	study.following_player=false
	study.set_header_details(true)
	study.speech_opened_info=false
	study.trigger_progress_cue("film_shot","Screening reward retention fixture")
	require(study.reward_banner_timer>0 and study.reward_banner.visible,"reward retention fixture actually starts a visible earned cue")
	var reward_time: float = study.reward_banner_timer
	screen.open_screening()
	study.update_celebration_burst(0.5)
	require(study.reward_banner_timer==reward_time,"deliberately expanded Info cannot drain hidden earned reward during screening")
	screen.close_screening()
	require(study.reward_banner.visible and study.reward_banner_timer>0 and study.reward_banner.modulate.a>0,"Back restores a readable reward rather than a transparent input blocker")
	study.set_header_details(false)
	study.apply_save_envelope(full_profile)
	root.content_scale_size=Vector2i(1100,760)
	root.size=Vector2i(1100,760)
	await process_frame
	print("FILM_SCREENING_CHECK plans=24 sizes=8 captions=6 original_frames=6 save_growth=0")

func verify_quiet_seats(study: Node, full_profile: String) -> void:
	var saved := JSON.stringify(study.build_save_envelope())
	var qs: Node = study.quiet_seats
	require(qs.TITLES.keys()==study.HOSTING_QUIETS,"quiet titles cover exactly existing choice IDs")
	var closure_box: AABB = study.gathering_layouts_node.get_node("ClosureBarricades").mesh.get_aabb()
	var strip_half_width: float = closure_box.size.z*0.5
	var anchors: Array = []
	for n in study.neighbor_nodes: anchors.append(n.position)
	for layout in ["table","floor"]:
		study.apply_save_envelope(full_profile)
		study.gathering_layout = layout
		study.hosting_order.assign(["stories","beats","pause","art"])
		study.programme_order.assign(study.hosting_order)
		study.programme_published.assign(study.hosting_order)
		study.hosting_results.assign([{"id":"stories","value":"memory"},{"id":"beats","value":85}])
		study.civic_phase = "idle"
		study.civic_result.clear()
		study.civic_draft = study.default_civic_draft()
		study.film_phase = "idle"
		study.film_result.clear()
		study.film_draft = study.default_film_draft()
		study.film_captured.clear()
		study.hide_story_card()
		study.startup_story_pending = false
		study.last_story_chapter = int(study.current_chapter().num)
		study.current_path.clear()
		study.talk_partner = -1
		study.opening_conversation = false
		study.show_block_panel(true)
		study.update_block_3d()
		# The real modal transition must expose newly active choices without reopening G.
		study.hosting_results.assign([{"id":"stories","value":"memory"}])
		study.update_block_3d()
		study.show_block_panel(true)
		require(study.rhythm_circle.open_circle(),"native beats transition opens real Circle")
		study.rhythm_circle.complete()
		for f in range(4): await process_frame
		require(study.current_hosting_activity()=="pause" and qs.row.is_visible_in_tree() and study.block_detail_label.text.contains("An open arc of seats"),"actual Circle Complete restores new quiet row and complete Thanh reader without G workaround")
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
			root.size = size
			study.update_block_ui()
			for f in range(6): await process_frame
			for id in ["pairs","arc"]:
				var pose: Array = study.panel_camera_pose()
				qs.choices[0 if id=="arc" else 1].emit_signal("pressed")
				for f in range(4): await process_frame
				require(qs.choice()==id and qs.rendered==id,"quiet button changes actual world draft")
				require(study.panel_camera_pose()==pose,"quiet choice never takes camera ownership")
				require(study.block_action_page_count()==ceili(float(study.BLOCK_ACTION_COUNT)/4),"quiet choices preserve every original action and appended cooking page")
				var targets: Array = qs.choices.duplicate()
				targets.append(study.block_close_btn)
				for original in study.block_buttons:
					if original.is_visible_in_tree(): targets.append(original)
				for b in targets:
					require(b.is_visible_in_tree() and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"full quiet choice targets fit viewport")
					for walking in study.controls.get_children(): require(not b.get_global_rect().intersects(walking.get_global_rect()),"quiet choices/original actions/Close never overlap walking buttons")
				var li := 0 if layout=="table" else 1
				var expected: Array = ([-0.55,0.55] if id=="arc" else [-3.85,-2.75]) if li==0 else ([-1.2,0.0] if id=="arc" else [-4.2,-3.2])
				for i in range(2):
					var person: Node3D = qs.guests[li][i]
					require(absf(person.position.x-expected[i])<0.001,"quiet guests occupy intended actual seats")
					for part in person.get_children():
						if part is MeshInstance3D and part.visible:
							var transformed: AABB = person.transform * (part.transform * part.get_aabb())
							require(transformed.position.x> -6.0 and transformed.end.x<6.0 and transformed.position.z>=-strip_half_width and transformed.end.z<=strip_half_width,"actual guest meshes stay in authored curb-lane strip")
							var obstacles: Array[AABB] = []
							if li==0:
								obstacles.append(AABB(Vector3(-4.6,0.72,-0.45),Vector3(9.2,0.08,0.9)))
								for leg_x in [-4.3,-1.5,1.5,4.3]:
									for leg_z in [-0.38,0.38]: obstacles.append(AABB(Vector3(leg_x-0.035,0,leg_z-0.035),Vector3(0.07,0.74,0.07)))
							else:
								obstacles.append_array([AABB(Vector3(3.9,0,-1),Vector3(1.6,0.3,2)),AABB(Vector3(4.58,0.3,-0.02),Vector3(0.04,1.3,0.04)),AABB(Vector3(5.06,0.3,-0.95),Vector3(0.48,0.64,0.4)),AABB(Vector3(-5.35,0.45,-0.8),Vector3(0.1,1.2,1.6))])
							for end_x in [-6.3,6.3]: obstacles.append(AABB(Vector3(end_x-0.22,0,-strip_half_width),Vector3(0.44,1.1,strip_half_width*2)))
							for obstacle in obstacles: require(not transformed.intersects(obstacle),"quiet body clears actual tabletop/legs/riser/mic/panel/barricades")
							for visitor in study.rhythm_circle.worlds[li].get_children():
								if String(visitor.name).begins_with("Visiting"):
									for old_part in visitor.get_children():
										if old_part is MeshInstance3D and old_part.visible: require(not transformed.intersects(visitor.transform*(old_part.transform*old_part.get_aabb())),"quiet meshes clear actual Circle guest meshes")
					for visitor in study.rhythm_circle.worlds[li].get_children():
						if String(visitor.name).begins_with("Visiting"):
							require(Vector2(person.position.x,person.position.z).distance_to(Vector2(visitor.position.x,visitor.position.z))>0.7,"quiet visitors do not overlap existing Circle bodies")
				var music: Array = [study.music_playing,study.music_volume,study.music_mode]
				qs.update_world()
				require(music==[study.music_playing,study.music_volume,study.music_mode],"quiet world never changes music")
		var previous_target: Vector3 = study.target
		var previous_following: bool = study.following_player
		study.following_player = false
		study.target = qs.worlds[0 if layout=="table" else 1].global_position
		require(qs.cutaway_points().size()==3,"independent quiet inspection supplies actual guest and empty-seat cutaway points")
		study.following_player = true
		require(qs.cutaway_points().is_empty(),"quiet props never steal normal player-follow cutaway")
		study.target = previous_target
		study.following_player = previous_following
		study.host_set_quiet("pairs")
		qs.choices[0].grab_focus()
		var press := InputEventAction.new()
		press.action = "ui_accept"
		press.pressed = true
		Input.parse_input_event(press)
		await process_frame
		var release := InputEventAction.new()
		release.action = "ui_accept"
		release.pressed = false
		Input.parse_input_event(release)
		await process_frame
		require(qs.choice()=="arc" and study.block_detail_label.text.contains("An open arc of seats"),"real ui_accept selects quiet seats and updates full reader")
		study.host_set_quiet("pairs")
		study.block_hub_page = 2
		study.layout_block_action_pages()
		qs.choices[1].grab_focus()
		study.host_complete_current()
		require(study.get_viewport().gui_get_focus_owner()==study.block_programme_btn and study.block_hub_page==0,"completing focused quiet choice restores visible hosting focus")
		var copied := JSON.stringify(study.build_save_envelope())
		study.hosting_draft.quiet = "arc"
		qs.update_world()
		require(qs.choice()=="pairs","copied completed quiet result wins over stale draft")
		study.apply_save_envelope(copied)
		study.update_block_3d()
		if JSON.stringify(study.build_save_envelope())!=copied:
			print("QUIET_RELOAD_EXPECTED ",copied," ACTUAL ",JSON.stringify(study.build_save_envelope()))
		require(JSON.stringify(study.build_save_envelope())==copied and qs.choice()=="pairs","reload renders copied quiet scene with zero writes")
		require(not study.host_set_quiet("arc"),"inactive quiet setter cannot rewrite completed result")
		require(study.neighbor_project_memory_line("thanh").contains("open seat"),"Thanh remembers actual quiet result")
		for i in range(anchors.size()): require(study.neighbor_nodes[i].position==anchors[i],"named navigation residents stay at anchors")
		study.hosting_order.clear()
		study.hosting_results.clear()
		qs.update_world()
		require(qs.choice()=="" and not qs.worlds[0].visible and is_equal_approx(study.floor_quiet_seats[0].position.x,-3.6),"before quiet hidden and neutral stools restored")
	study.apply_save_envelope(saved)
	study.update_block_3d()
	root.size = Vector2i(1100,760)
	print("QUIET_SEATS_PASS: 2 layouts x6sizes, real buttons/meshes/route/quiet/camera/copied result/reload")

func verify_programme_studio(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"native Studio diagnostics must use test-suite or explicit isolated save/settings paths")
	if not study.is_test_suite_mode(): return
	var original := JSON.stringify(study.build_save_envelope())
	var studio: Control=study.programme_studio
	var desired: Array[String]=["beats","pause","stories","art"]
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(320,568)]:
			study.apply_save_envelope(full_profile)
			study.hide_story_card()
			study.startup_story_pending=false
			study.last_story_chapter=6
			study.current_path.clear()
			study.gathering_layout=layout
			study.programme_order.clear()
			study.programme_published.clear()
			study.hosting_order.clear()
			study.hosting_results.clear()
			study.civic_phase="idle"
			study.civic_result.clear()
			study.film_phase="idle"
			study.film_result.clear()
			study.film_captured.clear()
			study.following_player=false
			study.target=Vector3(12,3,-10)
			study.panel_frame_control=null
			study.update_camera()
			study.show_block_panel(true)
			root.size=size
			study.last_story_chapter=int(study.current_chapter().num)
			study.hide_story_card()
			for f in range(5): await process_frame
			study.pan_camera_by_screen_delta(Vector2(24,0))
			var pose: Array=study.panel_camera_pose()
			var photo := JSON.stringify(study.keepsake_photo)
			var quiet: Array=[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled]
			var before := JSON.stringify(study.build_save_envelope())
			study.current_path.append(study.player_xz()+Vector2(4,0))
			study.block_programme_btn.emit_signal("pressed")
			require(not studio.visible and study.block_detail_label.text.contains("Stop Walking") and JSON.stringify(study.build_save_envelope())==before,"route refusal is visibly explained in hub reader with zero save writes")
			study.current_path.clear()
			study.block_programme_btn.emit_signal("pressed")
			if not studio.visible: print("PROGRAMME_ENTRY_FAILURE "+JSON.stringify({"size":str(size),"layout":layout,"opened":study.block_opened,"startup":study.startup_story_pending,"story":study.is_story_card_visible(),"mural":study.is_mural_workshop_visible(),"circle":study.is_rhythm_circle_visible(),"film":study.is_film_screening_visible(),"civic":study.is_civic_listening_visible(),"path":study.current_path.size(),"announcement":study.last_a11y_announcement}))
			require(studio.visible and JSON.stringify(study.build_save_envelope())==before,"actual programme hub entry opens partial draft with no fill/save write")
			if not studio.visible: continue
			for index in [1,0,2,3]:
				studio.cards[index].emit_signal("pressed")
				studio.edits[0].emit_signal("pressed")
			for f in range(4): await process_frame
			require(studio.primary.disabled and studio.description().contains("between"),"invalid quiet ordering explains why Post is disabled")
			studio.edits[1].grab_focus()
			for i in range(2):
				var down := InputEventAction.new()
				down.action="ui_accept"
				down.pressed=true
				Input.parse_input_event(down)
				await process_frame
				var up := InputEventAction.new()
				up.action="ui_accept"
				Input.parse_input_event(up)
				await process_frame
			require(study.programme_order==desired and studio.edits[1].has_focus(),"true ui_accept moves the same selected Quiet card twice and retains Earlier focus")
			var bounds := Rect2(Vector2.ZERO,Vector2(size))
			for c in [studio.top,studio.tray,studio.picture]: require(bounds.encloses(c.get_global_rect()),"complete programme layout fits all six viewports")
			for b in studio.cards+studio.edits+[studio.primary,studio.view,studio.music,studio.back]:
				require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and bounds.encloses(b.get_global_rect()),"all full named programme controls are >=44px and reachable")
			for i in range(4): require(studio.cards[i].text.contains(study.programme_title(studio.IDS[i])),"full original proposal title retained")
			require(studio.reader.get_theme_font_size("normal_font_size")==16 and studio.reader.size.y>=40,"complete programme prose uses scrollable16px text")
			require(studio.picture.size.x>=200 and studio.picture.size.y>=90,"draft pinboard has meaningful visible size, not a collapsed1px rectangle")
			studio.primary.emit_signal("pressed")
			for f in range(4): await process_frame
			require(study.programme_published==desired and studio.posted and studio.replies(desired).size()==4,"Post copies exact chosen order and reveals four original resident replies")
			require(studio.picture.size.x>=200 and studio.picture.size.y>=90,"posted pinboard retains meaningful size after primary label rewrap")
			for b in studio.cards+studio.edits+[studio.primary,studio.view,studio.music,studio.back]: require(b.size.x>=44 and b.size.y>=44 and bounds.encloses(b.get_global_rect()),"posted controls remain fully on-screen and >=44px after rewrap")
			for i in range(4): require(study.programme_segment_bars[i].material_override.albedo_color==study.programme_segment_color(desired[i],false),"actual existing world bars follow posted order before hosting")
			studio.view.emit_signal("pressed")
			studio.cards[2].emit_signal("pressed")
			studio.edits[0].emit_signal("pressed")
			require(study.programme_order.size()==3 and studio.primary.disabled,"unfinished revision is kept separately from the posted complete plan")
			studio.view.emit_signal("pressed")
			require(studio.primary.text=="Start hosting" and not studio.primary.disabled,"Posted view can start its complete copy despite an incomplete draft")
			studio.primary.emit_signal("pressed")
			require(not studio.visible and study.hosting_order==desired,"actual Studio Start Hosting copies nondefault order through original callback")
			require(study.last_panel_dialogue.begins_with('Bea: "We\'re hosting 1/4'),"Studio starts through complete original hosting wrapper and Bea introduction")
			var active_save := JSON.stringify(study.build_save_envelope())
			require(not studio.open_studio() and study.block_detail_label.text.contains("Finish hosting") and JSON.stringify(study.build_save_envelope())==active_save,"mid-host keyboard and hub entry policy agrees and refusal is visible without a write")
			study.block_programme_btn.emit_signal("pressed")
			require(study.hosting_results.size()==1 and study.current_hosting_activity()=="pause","active hosting hub action keeps its original completion callback")
			for i in range(3): study.host_complete_current()
			study.hide_story_card()
			var hosted := JSON.stringify(study.hosting_results)
			require(studio.open_studio(),"completed profile can revise a separate future plan")
			studio.cards[2].emit_signal("pressed")
			if not study.programme_order.has("art"): studio.edits[0].emit_signal("pressed")
			for i in range(3): studio.edits[1].emit_signal("pressed")
			studio.primary.emit_signal("pressed")
			require(study.programme_published==["art","beats","pause","stories"] and study.hosting_order==desired and JSON.stringify(study.hosting_results)==hosted,"future revision never rewrites running/copied hosted order or results")
			require(studio.description().contains("future plan") and study.info.text.contains("Running gathering"),"post-host revision truthfully distinguishes future plan from existing signboard")
			for i in range(4): require(study.programme_segment_bars[i].material_override.albedo_color==study.programme_segment_color(desired[i],true),"actual copied world bars stay hosted after future revision")
			studio.view.emit_signal("pressed")
			studio.edits[0].emit_signal("pressed")
			require(study.programme_order.size()==3 and study.programme_published.size()==4,"Remove only edits partial draft, preserving posted copy")
			studio.edits[0].emit_signal("pressed")
			require(study.programme_order.size()==4,"Add explicitly restores removed card")
			var saved := JSON.stringify(study.build_save_envelope())
			studio.close_studio(false)
			var key := InputEventKey.new()
			key.keycode=KEY_F6
			key.pressed=true
			Input.parse_input_event(key)
			await process_frame
			var key_up := InputEventKey.new()
			key_up.keycode=KEY_F6
			Input.parse_input_event(key_up)
			await process_frame
			require(studio.visible and JSON.stringify(study.build_save_envelope())==saved,"real F6 reopens without a write or a practice state")
			var held := InputEventKey.new()
			held.physical_keycode=KEY_W
			held.pressed=true
			var position: Vector3=study.player.position
			Input.parse_input_event(held)
			Input.flush_buffered_events()
			require(Input.is_physical_key_pressed(KEY_W),"native held-key guard receives a genuinely pressed W")
			await physics_frame
			var release := InputEventKey.new()
			release.keycode=KEY_W
			release.physical_keycode=KEY_W
			release.pressed=false
			Input.parse_input_event(release)
			Input.flush_buffered_events()
			require(not Input.is_physical_key_pressed(KEY_W),"native logical+physical W release clears the actual pressed state")
			await physics_frame
			await physics_frame
			require(study.player.position==position,"held walking cannot move under Programme Studio")
			studio.close_studio(false)
			for f in range(4): await process_frame
			if study.panel_camera_pose()!=pose or JSON.stringify(study.keepsake_photo)!=photo: print("PROGRAMME_RETURN_FAILURE "+JSON.stringify({"size":str(size),"before":pose,"after":study.panel_camera_pose(),"following":study.following_player,"photo_equal":JSON.stringify(study.keepsake_photo)==photo}))
			require(study.panel_camera_pose()==pose and JSON.stringify(study.keepsake_photo)==photo,"programme editing preserves exact manual camera and frozen photo")
			require(quiet==[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled],"programme editing preserves quiet preferences")
			require(saved.to_utf8_buffer().size()<=4096 and study.apply_save_envelope(saved),"programme revision remains under budget and reload-valid")
			require(not studio.visible and study.programme_published==["art","beats","pause","stories"] and study.hosting_order==desired,"reload closes Studio and restores distinct posted/hosted copies")
	for a in studio.IDS:
		for b in studio.IDS:
			for c in studio.IDS:
				for d in studio.IDS:
					if {a:1,b:1,c:1,d:1}.size()!=4: continue
					var order: Array=[a,b,c,d]
					var image: Image=studio.texture(order).get_image()
					require(image.get_width()==720 and image.get_height()==480 and image.has_mipmaps(),"all24 original pinboard order rasters render/mipmap")
					require(studio.replies(order).size()==(4 if study.programme_issue(order)=="" else 0),"resident replies only describe valid posted orders")
	require(studio.textures.size()<=8,"pinboard cache stays bounded8")
	for text in studio.PITCHES+studio.replies(desired):
		for i in range(text.length()): require(text.unicode_at(i)<128 or ThemeDB.fallback_font.has_char(text.unicode_at(i)),"every nonASCII authored programme pitch/reply renders in fallback font")
	study.apply_save_envelope(full_profile)
	study.current_path.clear()
	study.hosting_order.clear()
	study.hosting_results.clear()
	study.programme_order.clear()
	study.programme_order.append("art")
	study.programme_published.clear()
	for id in ["stories","beats","pause","art"]: study.programme_published.append(id)
	study.civic_phase="idle"
	study.civic_result.clear()
	study.film_phase="idle"
	study.film_result.clear()
	study.film_captured.clear()
	study.last_story_chapter=int(study.current_chapter().num)
	study.hide_story_card()
	root.size=Vector2i(1100,760)
	for f in range(4): await process_frame
	var first := JSON.stringify(study.build_save_envelope())
	study.run_conversation_action_id("programme")
	require(studio.visible and studio.posted and studio.primary.text=="Start hosting" and JSON.stringify(study.build_save_envelope())==first,"conversation Start Hosting label opens the same posted review even with partial draft")
	studio.primary.emit_signal("pressed")
	require(study.hosting_order==["stories","beats","pause","art"] and study.last_panel_dialogue.contains(study.bea_invitation.explanation()),"stories-first Studio start includes original Bea invitation explanation")
	var stored := FileAccess.get_file_as_string(study.save_path)
	var large: Dictionary=JSON.parse_string(full_profile)
	large.optional["budget_probe"]="x".repeat(5000)
	require(study.apply_save_envelope(JSON.stringify(large)),"existing bounded optional import can be larger than4096 without discarding core")
	study.hide_story_card()
	study.current_path.clear()
	studio.open_studio()
	var seq: int=study.save_seq
	studio.cards[0].emit_signal("pressed")
	(studio.edits[1] if study.programme_order.find("stories")>0 else studio.edits[2]).emit_signal("pressed")
	require(studio.reader.text.contains("Visit-only") and study.save_seq==seq,"non-growing oversized-profile move visibly reports visit-only without incrementing sequence")
	studio.edits[0].emit_signal("pressed")
	var reduced: Array=study.programme_order.duplicate()
	studio.edits[0].emit_signal("pressed")
	require(study.programme_order==reduced and studio.reader.text.contains("Change not made") and study.save_seq==seq,"oversized-profile growth is refused visibly before draft mutation")
	require(FileAccess.get_file_as_string(study.save_path)==stored,"budget refusals and visit-only edits preserve exact last valid stored file")
	studio.close_studio(false)
	var near: Dictionary=JSON.parse_string(full_profile)
	var removed: String=near.programme.order.pop_back()
	near.optional["budget_probe"]=""
	study.apply_save_envelope(JSON.stringify(near))
	var base_bytes: int=JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size()
	near.optional["budget_probe"]="x".repeat(4094-base_bytes)
	require(study.apply_save_envelope(JSON.stringify(near)) and study.save_godot_state(),"near-limit partial imported profile is a valid stored test save")
	study.hide_story_card()
	study.current_path.clear()
	studio.open_studio()
	var near_stored := FileAccess.get_file_as_string(study.save_path)
	var near_order: Array=study.programme_order.duplicate()
	var near_seq: int=study.save_seq
	studio.cards[studio.IDS.find(removed)].emit_signal("pressed")
	studio.edits[0].emit_signal("pressed")
	require(study.programme_order==near_order and study.save_seq==near_seq and studio.reader.text.contains("Change not made"),"growth across4096 refuses before modifying an otherwise valid draft")
	require(JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size()<=4096 and FileAccess.get_file_as_string(study.save_path)==near_stored,"near-limit refusal preserves valid envelope budget and exact stored file")
	studio.close_studio(false)
	study.apply_save_envelope(original)
	root.size=Vector2i(1100,760)
	print("PROGRAMME_STUDIO_PASS: 2layouts x7sizes, route/midhost refusal, posted-vs-partial Start, stories-first wrapper, true input,24rasters/cache8")

func verify_civic_listening(study: Node, full_profile: String) -> void:
	var original := JSON.stringify(study.build_save_envelope())
	var hour: Control = study.civic_listening
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,667),Vector2i(600,667),Vector2i(700,667),Vector2i(599,640)]:
			study.apply_save_envelope(full_profile)
			study.hide_story_card()
			study.startup_story_pending=false
			study.current_path.clear()
			study.gathering_layout=layout
			study.civic_phase="idle"
			study.civic_draft=study.default_civic_draft()
			study.civic_result.clear()
			study.film_phase="idle"
			study.film_result.clear()
			study.update_block_3d()
			root.size=size
			study.show_block_panel(true)
			study.last_story_chapter=int(study.current_chapter().num)
			study.hide_story_card()
			for f in range(5): await process_frame
			var save_before := JSON.stringify(study.build_save_envelope())
			var pose: Array = study.panel_camera_pose()
			var position: Vector3 = study.player.position
			var music: Array=[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled]
			require(hour.entry.is_visible_in_tree() and hour.entry.size.y>=44,"actual hub entry is visible and tappable after hosting")
			for control in [hour.entry,study.block_close_btn,study.block_page_prev,study.block_page_next]:
				if control.is_visible_in_tree():
					for walking in study.controls.get_children():
						if control.get_global_rect().intersects(walking.get_global_rect()): print("CIVIC_NAV_OVERLAP "+JSON.stringify({"size":str(size),"layout":layout,"control":control.text,"box":study.rect_snapshot(control.get_global_rect()),"walking":walking.text,"walk":study.rect_snapshot(walking.get_global_rect()),"panel":study.rect_snapshot(study.block_panel.get_global_rect()),"minimum":str(study.block_panel.get_combined_minimum_size()),"nav":str(study.block_page_nav.get_combined_minimum_size()),"entry":hour.entry.text,"compact":hour.nav_compact}))
						require(not control.get_global_rect().intersects(walking.get_global_rect()),"new entry and original hub navigation never cover walking controls")
			hour.entry.grab_focus()
			hour.entry.emit_signal("pressed")
			require(hour.visible and JSON.stringify(study.build_save_envelope())==save_before,"optional actual entry opens without starting/writing")
			hour.advance.emit_signal("pressed")
			require(study.civic_phase=="planning","real Start planning retains core civic callback")
			for category in range(3):
				hour.tabs[category].emit_signal("pressed")
				hour.choices[1].emit_signal("pressed")
				for f in range(4): await process_frame
				require(study.civic_draft[hour.KEYS[category]]==["access","dropin","none"][category],"named category and exact option changes original field")
				for b in hour.tabs+hour.choices+[hour.advance,hour.music,hour.back]:
					require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"complete planning controls on screen at all six sizes")
				require(Rect2(Vector2.ZERO,Vector2(size)).encloses(hour.top.get_global_rect()),"wrapped full heading stays inside viewport")
				require(hour.reader.get_theme_font_size("normal_font_size")==16 and hour.reader.size.y>=76 and hour.picture.size.y>=32,"full scrollable text and useful illustration remain")
			var held := InputEventKey.new()
			held.physical_keycode=KEY_W
			held.pressed=true
			Input.parse_input_event(held)
			Input.flush_buffered_events()
			require(Input.is_physical_key_pressed(KEY_W),"native held-key guard receives a genuinely pressed W")
			await physics_frame
			var release := InputEventKey.new()
			release.keycode=KEY_W
			release.physical_keycode=KEY_W
			release.pressed=false
			Input.parse_input_event(release)
			Input.flush_buffered_events()
			require(not Input.is_physical_key_pressed(KEY_W),"native logical+physical W release clears the actual pressed state")
			require(study.player.position==position,"real held movement cannot walk under focused civic reader")
			hour.advance.grab_focus()
			var press := InputEventAction.new()
			press.action="ui_accept"
			press.pressed=true
			Input.parse_input_event(press)
			await process_frame
			var up := InputEventAction.new()
			up.action="ui_accept"
			Input.parse_input_event(up)
			await process_frame
			require(study.civic_phase=="meeting" and hour.voices[0].has_focus(),"real ui_accept convenes copied plan and moves focus off hidden categories")
			var copied: Dictionary=study.civic_result.duplicate()
			var seq: int=study.save_seq
			for i in range(4):
				hour.voices[i].emit_signal("pressed")
				require(hour.reader.text.contains(hour.SPEAKERS[i]+": "+hour.dialogue(copied)[i]),"four full original fictional voices readable independently")
				require(not hour.tabs[0].is_visible_in_tree() and not hour.choices[0].is_visible_in_tree(),"meeting and re-read never offer inactive setters")
				require(study.save_seq==seq,"speaker reading writes no save")
			require(hour.request_text(copied).begins_with("No meeting notes."),"no-notes choice equally valid with truthful no recording")
			require(study.civic_setup_node.visible and study.civic_dropin_group.visible and not study.civic_circle_group.visible,"existing actual civic format world group remains")
			require(hour.surfaces[1].material_override.albedo_texture==hour.texture(copied),"existing tabletop carries original notice texture")
			require(not hour.surfaces[0].material_override.emission_enabled and hour.surfaces[0].material_override.shading_mode==BaseMaterial3D.SHADING_MODE_UNSHADED,"world notice has no untextured white emission wash")
			var original_material: Material=hour.surfaces[0].material_override
			study.update_block_3d()
			require(hour.surfaces[0].material_override==original_material,"same copied notice reuses material rather than reallocating")
			hour.advance.emit_signal("pressed")
			require(study.civic_phase=="done" and hour.advance.visible and hour.advance.text=="Follow this invitation" and hour.voices[3].has_focus(),"civic completion retains speaker focus and offers deliberate film handoff without a timer/required turn count")
			study.film_result=JSON.parse_string(full_profile).film.result.duplicate(true)
			study.film_phase="done"
			study.last_story_chapter=int(study.current_chapter().num)
			study.hide_story_card()
			var done_save := JSON.stringify(study.build_save_envelope())
			hour.close_hour()
			for f in range(4): await process_frame
			require(hour.entry.has_focus(),"Back restores actual entry keyboard focus synchronously")
			require(hour.open_hour() and hour.reader.text.contains(hour.dialogue(copied)[0]),"copied listening hour remains reachable after film memories")
			hour.voices[2].emit_signal("pressed")
			require(JSON.stringify(study.build_save_envelope())==done_save,"completed re-read does not change save/result/photo/sequence")
			var escape := InputEventKey.new()
			escape.keycode=KEY_ESCAPE
			escape.pressed=true
			study._unhandled_input(escape)
			for f in range(3): await process_frame
			if hour.visible or study.panel_camera_pose()!=pose or study.player.position!=position:
				print("CIVIC_CAMERA_FAILURE "+JSON.stringify({"layout":layout,"size":str(size),"visible":hour.visible,"pose_before":str(pose),"pose_after":str(study.panel_camera_pose()),"position_before":str(position),"position_after":str(study.player.position),"following":study.following_player,"logicalW":Input.is_key_pressed(KEY_W),"physicalW":Input.is_physical_key_pressed(KEY_W)}))
			require(not hour.visible and study.panel_camera_pose()==pose and study.player.position==position,"Back and real Escape preserve camera and position")
			require(hour.entry.has_focus(),"Escape restores entry focus without waiting for a later visibility frame")
			require(music==[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled],"quiet/music/preferences not changed by viewing")
			# A queued hub/viewport fit must not move the still-followed Circle entry.
			var followed_before_circle: bool=study.following_player
			study.following_player=true
			study.refresh_hub_camera()
			for f in range(5): await process_frame
			var before_circle: Array=study.panel_camera_pose()
			study.refit_panel_after_layout()
			study.refit_after_layout()
			require(study.rhythm_circle.open_circle(),"real Circle entry opens with both hub refits pending")
			for f in range(6): await process_frame
			require(study.panel_camera_pose()==before_circle,"pending hub fits preserve exact Circle entry pose before explicit View Circle")
			require(JSON.stringify(study.build_save_envelope())==done_save,"pending-fit Circle entry is still read-only practice")
			study.rhythm_circle.close_circle(false)
			study.following_player=followed_before_circle
	for topic in study.CIVIC_TOPICS:
		for format_id in study.CIVIC_FORMATS:
			for notes in study.CIVIC_NOTES:
				var p := {"topic":topic,"format":format_id,"notes":notes}
				var image: Image=hour.texture(p).get_image()
				require(image.get_width()==720 and image.get_height()==480,"all eight original notice rasters render at native resolution")
				require(image.get_pixel(360,355).to_html(false)==("fff9e9" if notes=="themes" else "3c5b63"),"actual theme card versus closed notebook ink")
				require(hour.dialogue(p).size()==4 and hour.request_text(p).contains("not sent" if notes=="themes" else "Nothing is recorded"),"all eight plans retain full dialogue and truthful notes consequence")
		require(hour.texture({"topic":topic,"format":"circle","notes":"themes"}).get_image().get_data()!=hour.texture({"topic":topic,"format":"circle","notes":"none"}).get_image().get_data(),"notes choice produces actual rendered art consequence")
	require(hour.textures.size()==8,"notice raster cache bounded eight")
	study.apply_save_envelope(original)
	root.size=Vector2i(1100,760)
	print("CIVIC_LISTENING_PASS: 2layouts x10sizes, all8rasters, true input, copied re-read and exact quiet/camera/save")

func verify_bea_invitation(study: Node, full_profile: String) -> void:
	var saved := JSON.stringify(study.build_save_envelope())
	var invitation: Node = study.bea_invitation
	require(invitation.TITLES.keys()==study.HOSTING_STORIES,"invitation exact existing story IDs")
	var note: Image = invitation.texture("memory").get_image()
	var flags: Image = invitation.texture("future").get_image()
	require(note.get_width()==720 and note.get_height()==480 and note.get_data()!=flags.get_data(),"two original invitation rasters differ at full resolution")
	require(note.get_pixel(300,430).is_equal_approx(Color("29525e")) and flags.get_pixel(320,250).is_equal_approx(Color("6a9a8c")),"actual note pocket and green paper flag ink render")
	for id in ["memory","future"]:
		var raster: Image = invitation.texture(id).get_image()
		for k in range(invitation.PAPER_UVS.size()):
			var uv: Vector2 = invitation.PAPER_UVS[k]
			require(raster.get_pixel(int(uv.x*720),int(uv.y*480)).to_html(false)==invitation.PAPER_COLORS[id][k],"exact original-art probe colors match projected UV samples")
	var anchors: Array = []
	for n in study.neighbor_nodes: anchors.append(n.position)
	for layout in ["table","floor"]:
		study.apply_save_envelope(full_profile)
		study.gathering_layout = layout
		study.hosting_order.assign(["pause","stories","beats","art"])
		study.programme_order.assign(study.hosting_order)
		study.programme_published.assign(study.hosting_order)
		study.hosting_results.clear()
		study.hosting_draft.story = "memory"
		study.civic_phase = "idle"
		study.civic_result.clear()
		study.civic_draft = study.default_civic_draft()
		study.film_phase = "idle"
		study.film_result.clear()
		study.film_draft = study.default_film_draft()
		study.film_captured.clear()
		study.hide_story_card()
		study.startup_story_pending = false
		study.last_story_chapter = int(study.current_chapter().num)
		study.current_path.clear()
		study.talk_partner = -1
		study.opening_conversation = false
		study.show_block_panel(true)
		study.update_block_3d()
		require(invitation.choice()=="" and not invitation.worlds[0].visible,"invitation hidden before stories despite open gathering")
		study.host_complete_current()
		for f in range(4): await process_frame
		require(study.quiet_seats.row.visible and study.block_detail_label.text.contains("folded note"),"shared pause-to-stories row refreshes full Bea example without reopening")
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
			root.size = size
			study.update_block_ui()
			for f in range(5): await process_frame
			for i in [1,0]:
				var pose: Array = study.panel_camera_pose()
				var music: Array = [study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled]
				study.quiet_seats.choices[i].emit_signal("pressed")
				for f in range(4): await process_frame
				var id: String = study.HOSTING_STORIES[i]
				require(invitation.choice()==id and invitation.rendered==id,"shared actual buttons change story and world art, never quiet choice")
				require(study.hosting_draft.quiet=="arc" and study.block_detail_label.text.contains(invitation.EXAMPLES[id]),"full fictional example and quiet draft preserved")
				require(study.panel_camera_pose()==pose and music==[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled],"invitation never changes camera or quiet/music preferences")
				var targets: Array = study.quiet_seats.choices.duplicate()
				targets.append(study.block_close_btn)
				for b in study.block_buttons:
					if b.is_visible_in_tree(): targets.append(b)
				for b in targets:
					require(b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"full story actions and Close reachable")
					for walking in study.controls.get_children(): require(not b.get_global_rect().intersects(walking.get_global_rect()),"shared invitation row never covers walking buttons")
				var paper: MeshInstance3D = invitation.papers[0 if layout=="table" else 1]
				require(paper.material_override.albedo_texture==invitation.texture(id),"actual world Quad carries selected complete artwork")
				var bounds: AABB = paper.get_parent().transform*(paper.transform*paper.get_aabb())
				require(absf(bounds.position.y-paper.get_parent().position.y)<0.00001,"standing invitation front rests on surface rather than floats")
				require(paper.rotation.x<0,"illustrated face tilts toward overhead view")
				for button in study.quiet_seats.snapshot().buttons: require(button.text_fits,"full named invitation label fits measured button")
				require(bounds.position.z>=-1.15 and bounds.end.z<=1.15 and bounds.position.x> -6 and bounds.end.x<6,"actual paper stays inside fictional curb strip")
				if layout=="table":
					for cup_x in [-2.2,-0.9,0.9,2.2]: require(not bounds.intersects(AABB(Vector3(cup_x-0.045,0.81,0.155),Vector3(0.09,0.08,0.09))),"paper clears existing cups")
				for person in study.quiet_seats.guests[0 if layout=="table" else 1]:
					for part in person.get_children():
						if part is MeshInstance3D and part.visible: require(not bounds.intersects(person.transform*(part.transform*part.get_aabb())),"invitation clears actual quiet visitors")
		var old_target: Vector3 = study.target
		var old_follow: bool = study.following_player
		study.following_player = false
		study.target = invitation.worlds[0 if layout=="table" else 1].global_position
		study.update_camera()
		study.update_readable_scene_labels()
		var protected_paper: Rect2 = invitation.inspection_rect()
		require(protected_paper.has_area() and (not study.guide_arrow_label.visible or not protected_paper.intersects(study.guide_arrow_label.get_global_rect())),"manual invitation inspection keeps objective caption off actual artwork")
		study.following_player = old_follow
		study.target = old_target
		study.update_camera()
		study.quiet_seats.choices[1].grab_focus()
		var press := InputEventAction.new()
		press.action = "ui_accept"
		press.pressed = true
		Input.parse_input_event(press)
		await process_frame
		var release := InputEventAction.new()
		release.action = "ui_accept"
		release.pressed = false
		Input.parse_input_event(release)
		await process_frame
		require(invitation.choice()=="future","real ui_accept selects full future invitation")
		study.host_complete_current()
		require(study.get_hosted_segment_value("stories")=="future" and not study.quiet_seats.row.visible,"completion copies invitation and releases shared row")
		var copied := JSON.stringify(study.build_save_envelope())
		study.hosting_draft.story = "memory"
		invitation.update_world()
		require(invitation.choice()=="future","copied invitation wins over stale draft")
		study.apply_save_envelope(copied)
		study.update_block_3d()
		require(JSON.stringify(study.build_save_envelope())==copied and not study.host_set_story("memory"),"completed reload/viewing cannot rewrite saved story/photo/sequence")
		require(study.neighbor_project_memory_line("bea").contains("paper flags"),"Bea remembers copied invitation")
		for i in range(anchors.size()): require(study.neighbor_nodes[i].position==anchors[i],"Bea and named neighbors remain at navigation anchors")
		# Reverse live handoff keeps the same focused physical button and resets all semantics.
		study.hosting_order.assign(["stories","pause","beats","art"])
		study.programme_order.assign(study.hosting_order)
		study.programme_published.assign(study.hosting_order)
		study.hosting_results.clear()
		study.hosting_draft.story = "future"
		study.hosting_draft.quiet = "pairs"
		study.show_block_panel(true)
		study.update_block_3d()
		study.quiet_seats.choices[1].grab_focus()
		study.host_complete_current()
		for f in range(4): await process_frame
		require(study.quiet_seats.row.visible and study.quiet_seats.choices[1].has_focus(),"stories-to-pause keeps focused shared row visible")
		require(study.quiet_seats.choices[1].accessibility_name==study.quiet_seats.TITLES.pairs+" , selected" and study.quiet_seats.choices[1].tooltip_text==study.quiet_seats.TITLES.pairs,"reverse handoff restores full quiet label/tooltip/selected name")
		require(study.hosting_draft.quiet=="pairs" and study.block_detail_label.text.contains("woven green cushion"),"reverse handoff preserves quiet choice and full Thanh reader")

	require(invitation.textures.size()==2,"original invitation texture cache bounded two")
	study.apply_save_envelope(saved)
	study.update_block_3d()
	root.size = Vector2i(1100,760)
	print("BEA_INVITATION_PASS: 2layouts x6sizes, shared buttons, true ui_accept, original rasters/world, copied/no-write/camera/quiet")

func verify_shared_panel(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"Shared Panel native diagnostics require test-suite BEFORE mutations")
	if not study.is_test_suite_mode(): return
	var original := JSON.stringify(study.build_save_envelope())
	var panel: Control=study.shared_panel
	var expected: Array=[1,2,0,0,2,1]
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(320,568)]:
			study.apply_save_envelope(full_profile)
			var at: int=study.hosting_order.find("art")
			require(at>=0,"native actual completed callback profile includes art")
			study.hosting_results.resize(at)
			study.hosting_draft=study.default_hosting_draft()
			study.civic_phase="idle"
			study.civic_result.clear()
			study.film_phase="idle"
			study.film_result.clear()
			study.film_captured.clear()
			study.current_path.clear()
			study.hide_story_card()
			study.startup_story_pending=false
			study.last_story_chapter=int(study.current_chapter().num)
			study.gathering_layout=layout
			study.following_player=false
			study.panel_frame_control=null
			study.target=Vector3(12,3,-10)
			study.update_camera()
			study.show_block_panel(true)
			root.size=size
			study.update_block_3d()
			for f in range(6): await process_frame
			study.pan_camera_by_screen_delta(Vector2(24,0))
			var pose: Array=study.panel_camera_pose()
			var quiet: Array=[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled]
			var before := JSON.stringify(study.build_save_envelope())
			var photo := JSON.stringify(study.keepsake_photo)
			study.block_programme_btn.emit_signal("pressed")
			for f in range(6): await process_frame
			require(panel.visible and panel.editing() and JSON.stringify(study.build_save_envelope())==before,"actual Host Activity opens art paper with zero opening writes")
			require(not study.hosting_tile_panel_node.visible,"active preview remains on paper; world visibility contract is completion-only")
			if not panel.visible: continue
			panel.pads[0].grab_focus()
			var down := InputEventAction.new()
			down.action="ui_accept"
			down.pressed=true
			Input.parse_input_event(down)
			await process_frame
			var up := InputEventAction.new()
			up.action="ui_accept"
			up.pressed=false
			Input.parse_input_event(up)
			await process_frame
			for i in range(1,6): panel.pads[i].emit_signal("pressed")
			panel.options[1].emit_signal("pressed")
			for f in range(6): await process_frame
			require(panel.options[0].has_focus(),"palette activation moves actual focus to the remaining enabled palette")
			require(panel.value().tiles==expected and panel.value().palette=="cool","all six wired controls and real ui_accept change exact shapes; Cool uses original callback")
			var snap: Dictionary=panel.snapshot()
			for box in snap.buttons:
				require(float(box.width)>=44 and float(box.height)>=44 and float(box.x)>=0 and float(box.y)>=0 and float(box.x)+float(box.width)<=size.x+1 and float(box.y)+float(box.height)<=size.y+1,"eleven targets stay44px and within current viewport")
			require(float(snap.picture.width)>=200 and float(snap.picture.height)>=90 and panel.reader.get_theme_font_size("normal_font_size")==16,"large original paper and full16px scrollable reader remain")
			require(panel.reader.text.contains("Tile 6") or panel.reader.text.contains("6 wave"),"current exact tile and complete shape description are readable")
			panel.close_panel(false)
			for f in range(4): await process_frame
			require(study.panel_camera_pose()==pose and quiet==[study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled],"Back preserves exact manual pose and quiet settings")
			var saved := JSON.stringify(study.build_save_envelope())
			require(study.apply_save_envelope(saved) and not panel.visible and study.hosting_draft.tiles==expected,"active art reload preserves actual draft and closes paper")
			study.hide_story_card()
			study.last_story_chapter=int(study.current_chapter().num)
			study.current_path.clear()
			require(panel.open_panel(),"active draft reopens")
			panel.options[0].emit_signal("pressed")
			panel.options[1].emit_signal("pressed")
			panel.options[2].emit_signal("pressed")
			for f in range(4): await process_frame
			require(not panel.visible and study.has_hosted_segment("art") and study.get_hosted_segment_value("art").tiles==expected and study.hosting_tile_panel_node.visible,"Hang closes first and copies exact result through original hosting wrapper/world visibility")
			require(JSON.stringify(study.keepsake_photo)==photo,"all tile/palette/Hang actions preserve earlier frozen keepsake")
			study.hide_story_card()
			study.last_story_chapter=int(study.current_chapter().num)
			var copied := JSON.stringify(study.get_hosted_segment_value("art"))
			study.hosting_draft.palette="warm"
			study.hosting_draft.tiles=[0,0,0,0,0,0]
			var stable := JSON.stringify(study.build_save_envelope())
			study.show_conversation(study.neighbor_index_for_id("dez"))
			require(study.conv_action_ids[1]=="shared_panel" and study.run_conversation_action(1) and panel.visible and not panel.editing() and JSON.stringify(panel.value())==copied,"actual Dez conversation reaches copied reader rather than stale draft, retaining primary objective and All Actions")
			panel.cycle(0)
			panel.palette("warm")
			panel.hang()
			require(JSON.stringify(study.build_save_envelope())==stable and panel.options[2].disabled,"completed reader refuses edits/Hang and writes zero saves")
			panel.close_panel(false)
			for face in panel.faces:
				var base: MeshInstance3D=face.get_parent()
				require(base.mesh is BoxMesh and base.mesh.size==Vector3(0.30,0.30,0.12) and face.mesh is QuadMesh and face.mesh.size==Vector2(0.30,0.30) and is_equal_approx(face.position.z,0.065),"six physical tile boxes stay unchanged; thin original painted fronts clear actual front faces")
				var paint: StandardMaterial3D=face.material_override
				require(not paint.emission_enabled and paint.albedo_texture.get_image().has_mipmaps() and paint.uv1_scale.is_equal_approx(Vector3(98.0/360.0,98.0/240.0,1)),"world shapes use mipmapped nonemissive cropped frozen3:2SVG, not BoxMesh UV guesses")
			var normal: Vector3=study.hosting_tile_panel_node.global_basis.z
			require(Vector2(normal.x,normal.z).dot(study.mural_normal())>0.99,"painted +Z front faces actual sidewalk/mural stand direction")
	# All three source glyphs/palettes and cache bounds without a model/schema change.
	for i in range(24):
		var v := {"palette":"cool" if i%2 else "warm","tiles":[i%3,(i/3)%3,(i/9)%3,2,1,0]}
		var ink: Texture2D=panel.texture(v,false)
		var world: Texture2D=panel.texture(v,true)
		require(ink!=null and world!=null and ink.get_width()==720 and ink.get_height()==480,"native frozen art raster is720x480")
	require(panel.textures.size()<=8 and panel.world_textures.size()<=1,"reader cache bounded8/world cache bounded1")
	# Oversized imported bags remain explicit visit-only; completion growth must refuse.
	study.apply_save_envelope(full_profile)
	var at: int=study.hosting_order.find("art")
	study.hosting_results.resize(at)
	study.hosting_draft=study.default_hosting_draft()
	study.civic_phase="idle"
	study.civic_result.clear()
	study.film_phase="idle"
	study.film_result.clear()
	study.film_captured.clear()
	var oversize: Dictionary=study.build_save_envelope()
	for target_bytes in [4096,4097]:
		var near: Dictionary=oversize.duplicate(true)
		near.optional={"padding":""}
		require(study.apply_save_envelope(JSON.stringify(near)),"normalize empty optional fixture before measuring actual serialized budget")
		near=study.build_save_envelope()
		var after_hang: Dictionary=near.duplicate(true)
		after_hang.hosting.results.append({"id":"art","value":panel.value()})
		after_hang.save_seq=study.save_seq+2
		near.optional.padding="x".repeat(target_bytes-JSON.stringify(after_hang).to_utf8_buffer().size())
		require(study.apply_save_envelope(JSON.stringify(near)) and study.save_godot_state(),"valid near-limit art profile writes only isolated native test file")
		study.hide_story_card()
		study.last_story_chapter=int(study.current_chapter().num)
		study.current_path.clear()
		var near_file := FileAccess.get_file_as_string(study.save_path)
		var near_before := JSON.stringify(study.build_save_envelope())
		require(near_before.to_utf8_buffer().size()<=4096 and panel.open_panel(),"near-limit valid art draft opens within4096")
		after_hang=study.build_save_envelope()
		after_hang.hosting.results.append({"id":"art","value":panel.value()})
		after_hang.save_seq=study.save_seq+1
		require(JSON.stringify(after_hang).to_utf8_buffer().size()==target_bytes,"actual next-envelope prediction is exactly the independent boundary fixture")
		panel.hang()
		if target_bytes==4096:
			require(not panel.visible and study.has_hosted_segment("art") and FileAccess.get_file_as_string(study.save_path).to_utf8_buffer().size()==4096,"exact4096 completion succeeds through actual save writer, preventing over-strict budget preview")
		else:
			require(panel.visible and panel.message.contains("Change not made") and JSON.stringify(study.build_save_envelope())==near_before and FileAccess.get_file_as_string(study.save_path)==near_file,"exact4097 completion refuses BEFORE mutation/storage")
		panel.close_panel(false)
	oversize.optional={"test":"x".repeat(5000)}
	require(study.apply_save_envelope(JSON.stringify(oversize)),"existing oversized optional import contract remains")
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	study.current_path.clear()
	var file_before := FileAccess.get_file_as_string(study.save_path)
	var sequence: int=study.save_seq
	require(panel.open_panel(),"isolated oversized profile opens art paper")
	var previous_tile: int=int(study.hosting_draft.tiles[5])
	panel.cycle(5)
	require(int(study.hosting_draft.tiles[5])==(previous_tile+1)%3 and int(panel.value().tiles[5])==(previous_tile+1)%3,"visit-only receipt describes an actual in-memory tile change")
	require(panel.message.contains("visit") and study.save_seq==sequence and FileAccess.get_file_as_string(study.save_path)==file_before,"non-growing oversized tile edit is visibly visit-only with exact stored file/sequence unchanged")
	var before_hang := JSON.stringify(study.build_save_envelope())
	panel.hang()
	require(panel.visible and panel.message.contains("Change not made") and JSON.stringify(study.build_save_envelope())==before_hang,"oversized Hang growth refuses BEFORE state/progress mutation")
	panel.close_panel(false)
	require(study.advance_programme_and_hosting_step()=="hosting_blocked" and JSON.stringify(study.build_save_envelope())==before_hang and FileAccess.get_file_as_string(study.save_path)==file_before,"legacy Z callback shares art Hang budget guard and truthfully refuses unsavable progress")
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	study.current_path.clear()
	for tiny in [Vector2i(390,240),Vector2i(320,200)]:
		root.size=tiny
		panel.open_panel()
		for f in range(8): await process_frame
		require(panel.picture.size.x>0 and panel.picture.size.y>0 and not panel.painting_room and panel.pads.all(func(b): return not b.visible) and panel.reader.text.contains("enlarge"),"below accepted size gracefully disables overlapping tiny paint targets without negative picture geometry")
		panel.close_panel(false)
	root.size=Vector2i(1100,760)
	for f in range(6): await process_frame
	panel.open_panel()
	study.block_panel.visible=true
	for f in range(3): await process_frame
	require(not study.block_panel.visible,"focused art re-hides siblings after derived UI updates")
	study.block_opened=false
	for f in range(3): await process_frame
	require(not panel.visible,"lost art precondition closes stale focused paper")
	study.apply_save_envelope(original)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(1100,760)
	print("SHARED_PANEL_PASS:2layouts x7sizes, six real targets/two palettes/Hang/copies/24rasters/cache8and1/exact4096success4097refusal")

func verify_power_story(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"power story runs only inside isolated formal suite")
	if not study.is_test_suite_mode(): return
	var original := JSON.stringify(study.build_save_envelope())
	var story: Node=study.power_story
	var solutions := [[2,1,0,3],[0,2,1,3],[1,2,3,0]]
	# Exhaustive topology oracle: these endpoints have one full four-elbow solution.
	for station in range(3):
		story.station=station
		var solutions_found := 0
		for mask in range(256):
			story.turns[station]=[mask%4,(mask/4)%4,(mask/16)%4,(mask/64)%4]
			var expected: bool=story.turns[station]==solutions[station]
			require(story.connected()==expected,"all256 connector states obey actual full-path topology")
			if story.connected(): solutions_found+=1
		require(solutions_found==1,"each relay has exactly one untimed four-connector solution")
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
			study.apply_save_envelope(full_profile)
			study.hide_story_card()
			study.last_story_chapter=int(study.current_chapter().num)
			study.startup_story_pending=false
			study.current_path.clear()
			study.gathering_layout=layout
			study.evening_mode=layout=="floor"
			study.apply_time_of_day()
			var evening: bool=study.evening_mode
			var lighting := [study.world_env.background_color,study.world_env.ambient_light_color,study.world_env.ambient_light_energy,study.sun_light.light_color,study.sun_light.light_energy,study.rim_light.light_color,study.rim_light.light_energy,study.light_pool_material.albedo_color,study.building_shader_material.get_shader_parameter("night_glow")]
			var saved := JSON.stringify(study.build_save_envelope())
			var file := FileAccess.get_file_as_string(study.save_path)
			var quiet := [study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]
			root.size=size
			for f in range(6): await process_frame
			require(story.open_story(),"optional episode opens after block completion")
			story.begin()
			require(story.active and story.restored==0 and not study.light_pool_material.albedo_color.a and study.evening_mode==evening,"outage has readable after-dark override without changing time preference")
			require(study.current_objective().id=="power_story" and study.current_objective().text.contains("0/3"),"deliberate episode supplies its own full next objective")
			study.toggle_evening_lights()
			require(study.evening_mode==evening and story.active,"evening shortcut cannot bypass episode or alter saved time intent")
			for station in range(3):
				story.choose(station)
				var goal: Vector2=story.relay_goal(station)
				require(study.is_walkable_point(goal),"relay uses a genuinely walkable stand point")
				study.player.position=Vector3(goal.x,0,goal.y)
				study.following_player=false
				study.target=Vector3(goal.x,1,goal.y)
				study.update_camera()
				var pose: Array=study.panel_camera_pose()
				story.refresh(false)
				for f in range(8): await process_frame
				var vp := Rect2(Vector2.ZERO,Vector2(size))
				for b in story.pads+story.tabs+story.actions:
					require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and vp.encloses(b.get_global_rect()),"all4diagram targets and9full named controls fit accepted sizes at44px")
				require(story.reader.size.y>=story.reader.get_theme_font("normal_font").get_height(16) and vp.encloses(story.reader.get_global_rect()),"full16px clue reader stays scrollable and on screen")
				story.check_path()
				require(story.restored==(1<<station)-1 and story.message.contains("Not connected yet"),"wrong wiring is an untimed no-penalty not-yet state")
				for i in range(4):
					for press in range((solutions[station][i]-int(story.turns[station][i])+4)%4):
						story.pads[i].grab_focus()
						var down := InputEventAction.new()
						down.action="ui_accept"
						down.pressed=true
						Input.parse_input_event(down)
						await process_frame
						var up := InputEventAction.new()
						up.action="ui_accept"
						up.pressed=false
						Input.parse_input_event(up)
						await process_frame
				story.actions[2].pressed.emit()
				require(story.restored==(1<<(station+1))-1 and story.fixtures[station].material_override==story.originals[station] and story.fixtures[station+7].material_override==story.originals[station+7],"actual input restores only selected lamp and gathering lantern")
				require(study.panel_camera_pose()==pose and quiet==[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled],"repair owns no manual camera or music settings")
				require(JSON.stringify(study.build_save_envelope())==saved and FileAccess.get_file_as_string(study.save_path)==file,"entire episode makes zero save/photo/sequence/file writes")
				require(story.boxes[station].is_visible_in_tree(),"fictional original relay kit is visible on existing pole")
				require(story.boxes[station].get_child_count()==2 and story.boxes[station].get_children().all(func(c): return c is MeshInstance3D),"portable relay adds only decorative meshes, no collider or named resident")
			require(story.won and story.restored==7 and story.message.contains("You brought our lights back") and study.light_pool_material.albedo_color.a==1,"three-phase hero moment restores shared world lights")
			var won_state := JSON.stringify(study.build_save_envelope())
			story.check_path()
			require(JSON.stringify(study.build_save_envelope())==won_state,"completion is idempotent and offers no hidden saved award")
			story.close_story(false)
			require(story.active and story.won and story.open_story(),"Back keeps completed visit readable and resumable")
			story.end_session(false)
			require(not story.active and study.evening_mode==evening and story.fixtures.all(func(m): return m.material_override==story.originals[story.fixtures.find(m)]),"explicit End restores exact original materials and day/evening intent")
			require(lighting==[study.world_env.background_color,study.world_env.ambient_light_color,study.world_env.ambient_light_energy,study.sun_light.light_color,study.sun_light.light_energy,study.rim_light.light_color,study.rim_light.light_energy,study.light_pool_material.albedo_color,study.building_shader_material.get_shader_parameter("night_glow")],"every overridden lighting property restores exactly for both day and evening")
			require(study.current_objective().id!="power_story" and story.heading.text.contains("ended"),"End restores normal chapter guidance and truthfully labels ended story")
			story.close_story(false)
	# Real route dispatch, Stop latch, deliberate arrival then repair (no teleport).
	# These pole-mounted noncolliding meshes need physical wall clearance, not a walking-body radius.
	# Check BOTH box and indicator: the first wall-facing indicator would otherwise enter the footprint.
	for kit in story.boxes:
		for body: MeshInstance3D in kit.get_children():
			var bounds: AABB=body.global_transform*body.get_aabb()
			for x in [bounds.position.x,bounds.end.x]:
				for z in [bounds.position.z,bounds.end.z]: require(study.building_containing_point(Vector2(x,z))=="" and study.min_wall_distance(Vector2(x,z))>=0.05,"actual box AND indicator corners keep 5cm physical wall clearance without claiming human circulation width")
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	study.current_path.clear()
	root.size=Vector2i(1100,760)
	story.open_story()
	story.begin()
	story.walk_to_relay()
	require(story.traveling and not study.current_path.is_empty() and not story.visible,"Walk dispatches original actual path and closes repair")
	study.stop_walking()
	for f in range(4): await process_frame
	require(not story.traveling and not story.visible,"Stop cancels pending automatic repair entry")
	story.open_story()
	story.walk_to_relay()
	var steps := 0
	while not study.current_path.is_empty() and steps<500:
		study.advance_walk(0.1)
		steps+=1
	for f in range(6): await process_frame
	require(steps>0 and steps<500 and story.visible and story.near(),"real path arrival opens repair at the actual relay")
	var position: Vector3=study.player.position
	var held := InputEventKey.new()
	held.keycode=KEY_W
	held.pressed=true
	Input.parse_input_event(held)
	for f in range(4): await physics_frame
	held.pressed=false
	Input.parse_input_event(held)
	require(study.player.position==position,"held walking input cannot move player during focused repair")
	story.close_story(false)
	for interruption in ["manual","overview","wide","neighbor","goodbye"]:
		story.station=0
		var goal: Vector2=story.relay_goal(0)
		var start := goal
		for offset in [Vector2(-4,0),Vector2(0,4),Vector2(4,0),Vector2(0,-4),Vector2(-4,4),Vector2(4,4)]:
			if study.is_walkable_point(goal+offset) and study.segment_walkable(goal+offset,goal): start=goal+offset; break
		require(start.distance_to(goal)>=4 and study.is_walkable_point(start),"interruption fixture begins on a verified walkable connected street point")
		study.player.position=Vector3(start.x,0,start.y)
		story.open_story()
		story.walk_to_relay()
		while study.player_xz().distance_to(goal)>1.7 and not study.current_path.is_empty(): study.advance_walk(0.02)
		require(not study.current_path.is_empty() and study.player_xz().distance_to(goal)<story.ARRIVAL_M,"interruption is nonvacuously within arrival radius with a live route")
		match interruption:
			"manual": study.walk_step(Vector2.UP,0.05)
			"overview": study.overview(false)
			"wide": study.wide_overview(false)
			"neighbor": study.choose_next(1)
			"goodbye": study.end_conversation()
		for f in range(6): await process_frame
		require(not story.visible and not story.traveling,"manual/map/selection/goodbye interruption cannot surprise-open a nearby repair")
	# Small unaccepted windows decline painting clearly, never focus a hidden target.
	study.current_path.clear()
	story.open_story()
	for tiny in [Vector2i(320,300),Vector2i(390,240)]:
		root.size=tiny
		for f in range(8): await process_frame
		require(not story.connector_room and story.pads.all(func(b): return not b.visible) and story.reader.text.contains("taller or wider") and story.actions[2].disabled,"tiny window gives a complete explanation and disables unavailable connector input")
	story.close_story(false)
	# Current full and pre-civic profiles must fit ALL navigation siblings, not just Power.
	for civic_ready in [false,true]:
		var nav_seed: Dictionary=JSON.parse_string(full_profile)
		if not civic_ready:
			var results: Array=[]
			for id in nav_seed.hosting.order:
				if id=="beats": break
				for result in nav_seed.hosting.results:
					if result.id==id: results.append(result)
			nav_seed.hosting.results=results
			nav_seed.civic.phase="idle"
			nav_seed.civic.result=null
			nav_seed.film.phase="idle"
			nav_seed.film.result=null
			nav_seed.film.captured=[]
		study.apply_save_envelope(JSON.stringify(nav_seed))
		study.hide_story_card()
		study.last_story_chapter=int(study.current_chapter().num)
		study.block_panel_mode="hub"
		study.show_block_panel(true)
		for width in [320,520,559]:
			root.size=Vector2i(width,667 if width==320 else 360)
			for f in range(10): await process_frame
			require(study.rhythm_circle.entry.is_visible_in_tree() and story.entry.is_visible_in_tree(),"Power and Circle are genuinely visible in both civic-available boundaries")
			var hub_bounds: Rect2=study.block_panel.get_global_rect()
			require(Rect2(Vector2.ZERO,Vector2(root.size)).encloses(hub_bounds) and not hub_bounds.intersects(study.controls.get_global_rect()),"all navigation keeps the whole hub on screen and clear of walking, not merely each button")
			require(study.block_close_btn.get_theme_font("font").get_string_size("Close",HORIZONTAL_ALIGNMENT_LEFT,-1,study.block_close_btn.get_theme_font_size("font_size")).x+study.block_close_btn.get_theme_stylebox("normal").get_minimum_size().x<=study.block_close_btn.size.x,"compact Close remains one complete word")
			for b in study.block_page_nav.get_children():
				if b is Button and b.is_visible_in_tree(): require(b.size.x>=44 and b.size.y>=44 and b.get_global_rect().position.x>=0 and b.get_global_rect().end.x<=width,"every real navigation sibling fits44px at narrow widths")
	# Reproduce late six-entry minimum shrink WITHOUT a viewport resize or a new profile.
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(520,360)
	study.show_block_panel(true)
	for f in range(10): await process_frame
	study.block_panel.size.x=295
	study.civic_listening.queue_nav_refit()
	for f in range(10): await process_frame
	require(study.block_panel.get_global_rect().end.x<=508.01 and not study.civic_listening.nav_layout_pending,"settled navigation returns an already expanded Web dock to280px without a viewport resize or pending loop")
	study.apply_save_envelope(original)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	require(not story.active and not story.visible and story.boxes.all(func(b): return not b.visible),"reload/import ends visit-only episode and restores ordinary world")
	require(story.message.is_empty() and not story.won and story.restored==0,"reset clears stale outcome copy and visit-only progress")
	await verify_larkin_story(study,full_profile)
	print("POWER_STORY_PASS:2layouts x6sizes, all768topologies/actualui_accept/3lamps+lanterns/hero/routeStopArrival+5nearinterruptions/quiet/manual/no-save/reload/nav6/tiny2")


func verify_larkin_story(study: Node, full_profile: String) -> void:
	var story: Node=study.power_story
	var place: Node=study.power_place
	var source_goal := Vector2(-593.405, -10.084)
	require(place.goal.distance_to(source_goal)<0.002 and story.site_valid,"city Larkin/Eddy coordinate reaches actual walkable junction without nearest-point relocation")
	require(place.source.exterior.id=="osm:way/71209428" and place.record.height_m==9 and place.record.polygons[0].rings[0].size()==7,"separate full OSM exterior and reported9m tag retained")
	require(study.all_buildings.size()==188 and study.lidar_additions.size()==8,"original188 measured records and8LiDAR additions remain separate")
	require(study.building_containing_point(Vector2(-550,-50))=="osm:way/71209428" and not study.is_walkable_point(Vector2(-550,-50)),"actual complete exterior blocks walking through the substation")
	require(place.loaded and not place.valid_source(null) and not place.valid_source({"junction":{}}),"missing or malformed place data cannot create a walkable substitute goal")
	require(not study.is_walkable_point(Vector2(-570,91)),"Eddy extension does not open the unrelated western Turk corridor")
	for pole in study.trolley_pole_points: require(pole.x>=place.legacy_bounds.position.x-1,"decorative trolley poles retain original west coverage")
	var mesh_bounds: AABB=place.mesh.get_aabb()
	require(absf(mesh_bounds.size.x-place.bounds.size.x)<0.001 and absf(mesh_bounds.size.z-place.bounds.size.y)<0.001,"rendered exterior uses actual complete OSM geometry")
	for child in story.site_kit.get_children():
		if child is MeshInstance3D:
			var box: AABB=child.get_aabb()
			for corner in range(8):
				var point: Vector3=child.global_transform*box.get_endpoint(corner)
				require(study.building_containing_point(Vector2(point.x,point.z)).is_empty() and study.min_wall_distance(Vector2(point.x,point.z),0.05)>=0.05,"actual battery stand mesh corners clear modeled walls by5cm")
	var cutaways := 0
	var original_pitch: float=study.camera_pitch_scale
	for yaw in [0.0,PI*0.5,PI,PI*1.5]:
		study.following_player=false
		study.in_overview=false
		study.in_wide_overview=false
		study.selected=-1
		study.target=Vector3(place.goal.x,1,place.goal.y)
		study.camera_yaw=yaw
		study.camera_pitch_scale=0.55
		study.view_size=24
		study.update_camera()
		var expected: bool=study.building_record_occludes_point(place.record,place.bounds,place.goal,1.0)
		place.cutaway([place.goal])
		if expected: cutaways+=1
		require(place.mesh.material_override==(study.cutaway_material if expected else place.base_material),"separate exterior follows common cutaway across rotated real corner views")
	require(cutaways>0,"at least one real low-pitch rotated Larkin view exercises exterior cutaway")
	study.camera_pitch_scale=original_pitch
	study.update_camera()
	var solutions := [[2,1,0,3],[0,2,1,3],[1,2,3,0]]
	for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
		study.apply_save_envelope(full_profile)
		study.hide_story_card()
		study.last_story_chapter=int(study.current_chapter().num)
		study.startup_story_pending=false
		study.current_path.clear()
		root.size=size
		for f in range(6): await process_frame
		var lighting := [study.world_env.background_color,study.world_env.ambient_light_color,study.world_env.ambient_light_energy,study.sun_light.light_color,study.sun_light.light_energy,study.rim_light.light_color,study.rim_light.light_energy,study.light_pool_material.albedo_color,study.building_shader_material.get_shader_parameter("night_glow")]
		var saved := JSON.stringify(study.build_save_envelope())
		var file := FileAccess.get_file_as_string(study.save_path)
		var quiet := [study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]
		var pose: Array=study.panel_camera_pose()
		require(story.open_story(),"historical case shares original Power entry")
		story.tabs[1].grab_focus()
		var down := InputEventAction.new()
		down.action="ui_accept"
		down.pressed=true
		Input.parse_input_event(down)
		await process_frame
		down.pressed=false
		Input.parse_input_event(down)
		for f in range(6): await process_frame
		require(story.historical and not story.active and story.reader.text.contains("April 21, 2017") and story.reader.text.contains("PG&E restored"),"actual keyboard selection exposes dated history and correct utility role")
		require(story.pads.all(func(b): return not b.visible) and study.panel_camera_pose()==pose,"source map hides repair pads and owns no camera")
		for label in story.map_labels: require(label.visible and label.get_theme_font_size("font_size")>=12 and story.art_rect.encloses(label.get_global_rect()),"real fallback-font map labels are readable and fit the paper")
		for b in story.tabs+story.actions: require(b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"source map reuses full44px controls at all6sizes")
		story.begin()
		require(story.active and not story.map_view and story.relay_goal(0).distance_to(source_goal)<0.002 and study.sun_light.light_energy>0.8 and study.light_pool_material.albedo_color.a==0,"2017 uses real junction and daytime community support")
		for station in range(3):
			story.choose(station)
			var goal: Vector2=story.relay_goal(station)
			study.player.position=Vector3(goal.x,0,goal.y)
			study.following_player=false
			study.update_camera()
			pose=study.panel_camera_pose()
			story.refresh(false)
			story.walk_to_relay()
			require(story.visible and study.current_path.is_empty() and not story.traveling,"Walk at the reached light stays put instead of detouring")
			for f in range(6): await process_frame
			for b in story.pads+story.tabs+story.actions: require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"historical repair has all13 actual44px controls")
			story.check_path()
			require(story.restored==(1<<station)-1,"wrong historical connection earns no progress")
			for i in range(4):
				for press in range((solutions[station][i]-int(story.turns[station][i])+4)%4): story.pads[i].pressed.emit()
			story.actions[2].pressed.emit()
			require(story.restored==(1<<(station+1))-1 and study.panel_camera_pose()==pose,"fictional battery tasks restore exact stage without camera takeover")
			story.begin()
			require(story.map_view and story.active and story.reader.text.contains("not an entrance"),"Case map is readable during the active visit")
			var turns: Array=story.turns.duplicate(true)
			story.rotate(0)
			require(story.turns==turns,"map cannot turn an invisible connector")
			story.begin()
		require(story.won and story.reader.text.contains("kept our neighbors connected") and story.site_lamp.material_override==story.warm and study.building_shader_material.get_shader_parameter("night_glow")==0.0,"daylight payoff lights fictional battery stand without claiming player restored utility grid")
		story.end_session(false)
		require(lighting==[study.world_env.background_color,study.world_env.ambient_light_color,study.world_env.ambient_light_energy,study.sun_light.light_color,study.sun_light.light_energy,study.rim_light.light_color,study.rim_light.light_energy,study.light_pool_material.albedo_color,study.building_shader_material.get_shader_parameter("night_glow")],"every historical lighting override restores exactly")
		require(not story.site_kit.visible and quiet==[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled] and JSON.stringify(study.build_save_envelope())==saved and FileAccess.get_file_as_string(study.save_path)==file,"all historical choices preserve exact save/file/quiet and End hides stand")
		story.close_story(false)
	# Real movement from an existing street to the added corner, then back. No goal teleport.
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(1100,760)
	story.open_story()
	story.choose(1)
	story.begin()
	var via := Vector2(place.source.return_junction.xz[0],place.source.return_junction.xz[1])
	for station in [0,1,0,2]:
		story.choose(station)
		story.walk_to_relay()
		require(story.via_pending and story.leg_goal==via and study.current_path[-1].distance_to(via)<0.01,"each full crossing starts with an explicit source-backed Taylor/Eddy leg")
		var steps := 0
		var interrupted := false
		var resume_x := INF
		while (story.traveling or not study.current_path.is_empty()) and steps<5000:
			study.advance_walk(0.1)
			story._process(0)
			steps+=1
			var player: Vector2=study.player_xz()
			if player.x<float(place.source.eddy.points[-1][0]): require(place.eddy_distance(player)<=study.MAX_STREET_CORRIDOR_M,"actual westward and return route samples stay on retained Eddy corridor")
			if station==0 and not interrupted and player.x<-300:
				study.stop_walking()
				require(not story.traveling and not story.via_pending and not story.visible,"mid-Eddy Stop clears both arrival legs")
				story.open_story()
				resume_x=study.player_xz().x
				story.walk_to_relay()
				require(not story.via_pending,"mid-Eddy resume takes the clear direct segment instead of backtracking to Taylor")
				interrupted=true
			if station==0 and interrupted: require(study.player_xz().x<=resume_x+0.01,"resumed westbound journey never backtracks east")
		for f in range(6): await process_frame
		print("LARKIN_ROUTE ",station," steps=",steps," visible=",story.visible," near=",story.near()," player=",study.player_xz()," resumed=",interrupted)
		require(steps>0 and steps<5000 and story.visible and story.near(),"actual route reaches real Larkin/Eddy and both Turk stations without fallback")

	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	require(not story.historical and not story.active and not story.site_kit.visible,"reload resets selected historical visit without resuming")
	print("LARKIN_STORY_PASS:real cityjunction/OSM exterior/daylight/6sizes/source map/actual ui_accept/route out+back/quiet/camera/zero file writes")

func verify_loan_homecoming(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"Loan Homecoming tests use the isolated formal suite")
	if not study.is_test_suite_mode(): return
	var saved := JSON.stringify(study.build_save_envelope())
	var seed: Dictionary=JSON.parse_string(full_profile)
	seed.epilogue.returned=[]
	seed.epilogue.packing=true
	seed.civic.phase="idle"
	seed.civic.result=null
	seed.film.phase="idle"
	seed.film.result=null
	seed.film.captured=[]
	var care: Node=study.loan_homecoming
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(320,568)]:
			for id in study.LOAN_IDS:
				study.apply_save_envelope(JSON.stringify(seed))
				study.hide_story_card()
				study.startup_story_pending=false
				study.last_story_chapter=int(study.current_chapter().num)
				study.gathering_layout=layout
				study.current_path.clear()
				var owner_index: int=study.neighbor_index_for_id(study.LOAN_OWNERS[id])
				study.player.position=study.neighbors[owner_index].pos+Vector3(0.0,0,1.0)
				var photo := JSON.stringify(study.keepsake_photo)
				study.finish_neighbor_arrival(owner_index)
				require(study.epilogue_returned.is_empty(),"actual owner arrival never auto-returns a loan")
				if id=="paint-case": require(study.mural_panel.visible,"Celeste arrival still opens original mural controls")
				if id=="speaker": require(study.music_panel.visible,"Rook arrival still opens original music controls")
				care.chat(owner_index)
				root.size=size
				for f in range(8): await process_frame
				require(study.block_panel.visible and study.block_panel_mode=="talk" and study.conv_action_ids[0]=="return_owner:"+id,"deliberate owner Chat exposes correct direct return first")
				var button: Button=study.conv_action_btns[0]
				require(button.text=="Return "+study.LOAN_TITLES[id] and button.size.x>=44 and button.size.y>=44,"full owner item label and44px target remain")
				require(study.activity_detail_snapshot(study.block_detail_label,study.block_panel,study.conv_buttons).buttons[3].text_fits,"new owner return label actually fits its button after wrapping")
				require(study.block_panel.get_global_rect().encloses(button.get_global_rect()),"owner return target stays inside fitted conversation")
				study.pan_camera_by_screen_delta(Vector2(22,0))
				var pose: Array=study.panel_camera_pose()
				var quiet: Array=[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]
				button.grab_focus()
				var down := InputEventAction.new()
				down.action="ui_accept"
				down.pressed=true
				Input.parse_input_event(down)
				await process_frame
				var up := InputEventAction.new()
				up.action="ui_accept"
				up.pressed=false
				Input.parse_input_event(up)
				for f in range(8): await process_frame
				require(study.epilogue_returned==[id] and care.kits[id].is_visible_in_tree(),"actual ui_accept returns only this owner loan and reveals its kit")
				var once := JSON.stringify(study.build_save_envelope())
				Input.parse_input_event(down)
				await process_frame
				Input.parse_input_event(up)
				await process_frame
				require(study.epilogue_returned==[id] and JSON.stringify(study.build_save_envelope())==once,"repeated actual ui_accept on the returned receipt never returns another loan or writes a save")
				require(study.conv_action_btns[0].text.begins_with("Returned ") and study.activity_detail_snapshot(study.block_detail_label,study.block_panel,study.conv_buttons).buttons[3].text_fits,"harmless returned receipt retains a complete fitted label")
				require(study.last_a11y_announcement.contains("Returned "+study.LOAN_TITLES[id]) and study.last_a11y_announcement.contains(study.LOAN_OWNERS[id].capitalize()+":"),"earned return progress and the correct owner's quote are announced")
				require(study.panel_camera_pose()==pose and [study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]==quiet,"return retains exact manual camera and quiet settings")
				require(JSON.stringify(study.keepsake_photo)==photo and JSON.stringify(study.build_save_envelope()).to_utf8_buffer().size()<=4096,"return preserves copied photo and save budget")
	for order in [["table","paint-case","speaker"],["table","speaker","paint-case"],["paint-case","table","speaker"],["paint-case","speaker","table"],["speaker","table","paint-case"],["speaker","paint-case","table"]]:
		var first_afternoon: Dictionary=seed.duplicate(true)
		first_afternoon.programme.published=[]
		first_afternoon.hosting.order=[]
		first_afternoon.hosting.results=[]
		study.apply_save_envelope(JSON.stringify(first_afternoon))
		study.hide_story_card()
		study.last_story_chapter=int(study.current_chapter().num)
		for id in order:
			study.show_conversation(study.neighbor_index_for_id(study.LOAN_OWNERS[id]))
			require(care.return_to_owner(id),"all six direct owner-return orders remain valid")
		for f in range(8): await process_frame
		require(study.is_story_card_visible() and study.last_a11y_announcement.begins_with("Returned all three neighbor loans (3/3). "+study.LOAN_OWNERS[order[2]].capitalize()+":") and study.last_a11y_announcement.contains("Chapter "),"actual chapter card itself announces earned3/3 and correct final owner voice in all six orders")
		require(study.epilogue_returned==study.LOAN_IDS,"saved returned list stays canonical regardless of actual order")
		var copy := JSON.stringify(study.build_save_envelope())
		require(study.apply_save_envelope(copy) and care.kits.values().all(func(k): return k.is_visible_in_tree()),"late completed reload restores all three returned kits")
	for id in study.LOAN_IDS:
		var base: MeshInstance3D=study.loan_return_beacons[id]
		var kit: Node3D=care.kits[id]
		require(is_equal_approx(base.position.y-(base.mesh as BoxMesh).size.y/2,0.0),"original marker base is grounded")
		for part in kit.get_children():
			var bounds: AABB=(part as MeshInstance3D).get_aabb()
			bounds=part.transform*bounds
			require(bounds.position.x>=-0.19 and bounds.end.x<=0.19 and bounds.position.z>=-0.15 and bounds.end.z<=0.15,"actual carrying gear stays in the original beacon footprint")
		for x in [-0.19,0.19]:
			for z in [-0.15,0.15]:
				var p := Vector2(base.global_position.x+x,base.global_position.z+z)
				require(study.building_containing_point(p)=="" and study.min_wall_distance(p)>=study.WALK_CLEARANCE_M and not study.is_point_in_mural_footprint(p,0.0) and not study.is_point_in_speaker_footprint(p,0.0),"gear stays clear of measured walls and actual prop surfaces; player-radius speaker exclusion is not a gear surface")
		var kit_bounds := AABB(base.global_position+Vector3(-0.19,-0.16,-0.15),Vector3(0.38,0.59,0.30))
		var owner_index: int=study.neighbor_index_for_id(study.LOAN_OWNERS[id])
		var owner_node: Node3D=study.neighbor_nodes[owner_index]
		var original_rotation: Vector3=owner_node.rotation
		var player_position: Vector3=study.player.position
		var player_rotation: Vector3=study.player_visual.rotation
		require(Vector2(base.position.x,base.position.z).distance_to(study.neighbor_xz(owner_index))>=1.75,"carrying kit clears the0.95m arrival stand ring plus player body and kit half width")
		for angle in [0.0,PI/2.0,PI,PI*1.5]:
			owner_node.rotation.y=angle
			study.player.position=study.neighbors[owner_index].pos+Vector3(cos(angle)*0.95,0,sin(angle)*0.95)
			study.player_visual.rotation.y=angle
			for part in study.player_visual.find_children("*","MeshInstance3D",true,false):
				if part.name not in ["GroundRing","ContactShadow"]:
					require(not kit_bounds.intersects(part.global_transform*part.get_aabb()),"actual player body meshes clear the kit at four cardinal0.95m arrival stands")
			for part in owner_node.get_node("NeighborProp").find_children("*","MeshInstance3D",true,false):
				require(not kit_bounds.intersects(part.global_transform*part.get_aabb()),"actual kit clears all signature prop meshes at four cardinal resident arrival rotations")
		owner_node.rotation=original_rotation
		study.player.position=player_position
		study.player_visual.rotation=player_rotation
		for counter in study.eatery_counter_nodes:
			var body: MeshInstance3D=counter.get_node("CounterBody")
			require(not kit_bounds.intersects(body.global_transform*body.get_aabb()),"actual kit bounding volume stays clear of existing fictional counter furniture")
		if id=="speaker": require(kit.has_node("CoiledCable") and kit.has_node("SpeakerCover"),"speaker model is cover/cable, not a duplicate monitor")
		if id=="table": require(kit.has_node("CanvasCarryBag") and kit.has_node("CarryHandle"),"table model is carry bag/straps, not a duplicate table")
	for target_bytes in [4096,4097]:
		var near: Dictionary=seed.duplicate(true)
		near.optional={"padding":""}
		study.apply_save_envelope(JSON.stringify(near))
		near=study.build_save_envelope()
		var preview: Dictionary=near.duplicate(true)
		preview.epilogue.returned=["table"]
		preview.save_seq=study.save_seq+2
		near.optional.padding="x".repeat(target_bytes-JSON.stringify(preview).to_utf8_buffer().size())
		require(study.apply_save_envelope(JSON.stringify(near)) and study.save_godot_state(),"near-limit owner-return fixture uses isolated formal save file")
		var before := JSON.stringify(study.build_save_envelope())
		var file := FileAccess.get_file_as_string(study.save_path)
		if target_bytes==4096:
			require(study.return_next_loan()=="table" and FileAccess.get_file_as_string(study.save_path).to_utf8_buffer().size()==4096,"exact4096 loan return succeeds through actual writer")
		else:
			require(study.return_next_loan().is_empty() and JSON.stringify(study.build_save_envelope())==before and FileAccess.get_file_as_string(study.save_path)==file,"exact4097 return refuses before state/file/sequence and does not skip to another loan")
	care.chapter_completion_notice="earned pending notice"
	require(not study.import_browser_save_json("{}") and care.chapter_completion_notice=="earned pending notice","rejected legacy import preserves pending earned loan notice")
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	study.startup_story_pending=false
	study.show_block_panel(false)
	study.mural_panel.hide()
	study.music_panel.hide()
	study.mural_scenes={"left":"music","right":"garden"}
	root.size=Vector2i(559,360)
	for f in range(8): await process_frame
	study.current_path.clear()
	study.player.position=Vector3(72.33017,0,-17.2684)
	study.following_player=false
	study.in_overview=false
	study.in_wide_overview=false
	study.view_size=24.0
	study.camera_yaw=0.0
	study.camera_pitch_scale=1.0
	study.target=Vector3(74.0332,0.19665,-18.1681)
	study.update_camera()
	study.update_readable_scene_labels()
	study.update_guide_arrow()
	var inspection_pose: Array=study.panel_camera_pose()
	var paper: Rect2=study.mural_inspection_rect()
	require(paper.has_area(),"real559x360 failed mural inspection pose has a meaningful protected paper rectangle")
	require(not study.guide_arrow_label.visible or not paper.intersects(study.guide_arrow_label.get_global_rect()),"outlined objective never covers the inspected musician face")
	for caption in study.visible_scene_captions: require(not paper.intersects(caption.rect),"nearby world captions reserve inspected original mural art")
	require(study.panel_camera_pose()==inspection_pose,"art protection never takes over the manual camera")
	study.following_player=true
	require(not study.mural_inspection_rect().has_area(),"mural reservation is limited to deliberate manual inspection")
	study.apply_save_envelope(saved)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(1100,760)
	print("LOAN_HOMECOMING_PASS:2layouts x7sizes x3owners/6orders/trueui_accept/grounded kits/canonical reload/exact4096and4097")

func verify_dog_story(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"dog tests only run in isolated formal profile")
	if not study.is_test_suite_mode(): return
	var story: Node=study.dog_story
	var original: Dictionary=JSON.parse_string(full_profile)
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
			original.gathering_layout=layout
			study.apply_save_envelope(JSON.stringify(original))
			study.hide_story_card()
			study.last_story_chapter=int(study.current_chapter().num)
			study.startup_story_pending=false
			root.size=size
			for f in range(6): await process_frame
			var saved := JSON.stringify(study.build_save_envelope())
			var file: String=FileAccess.get_file_as_string(study.save_path)
			var quiet: Array=[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]
			study.following_player=false
			var pose: Array=study.panel_camera_pose()
			require(story.open_story(),"original dogs can open after gathering")
			story.buttons[6].grab_focus()
			var down := InputEventAction.new()
			down.action="ui_accept"
			down.pressed=true
			Input.parse_input_event(down)
			await process_frame
			var up := InputEventAction.new()
			up.action="ui_accept"
			up.pressed=false
			Input.parse_input_event(up)
			for f in range(6): await process_frame
			require(story.active and story.lead==-1 and not story.objective().has_target,"true ui_accept begins without revealing or auto-routing a hidden dog")
			require(study.panel_camera_pose()==pose,"dog reader preserves exact manual pose")
			require(story.buttons[3].has_focus(),"Begin moves keyboard focus to enabled lead choice")
			for dog in story.dogs:
				for mesh in dog.find_children("*","MeshInstance3D",true,false):
					for corner in range(8):
						var point: Vector3=mesh.global_transform*mesh.get_aabb().get_endpoint(corner)
						require(study.building_containing_point(Vector2(point.x,point.z)).is_empty(),"actual search dog mesh corners stay outside measured footprints")
			for button in story.buttons:
				var rect: Rect2=button.get_global_rect()
				require(button.is_visible_in_tree() and rect.size.x>=44 and rect.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(rect),"all12 dog controls are44px and completely on screen")
			require(story.reader.get_theme_font_size("normal_font_size")==16 and story.reader.scroll_active,"complete dog clue reader is16px and scrollable")
			story.choose_lead(2)
			study.player.position=Vector3(story.goals[2].x,0,story.goals[2].y)
			story.match_dog()
			require(story.found==0 and story.reader.text.contains("No missing dog"),"wrong decoy lead has no penalty or fabricated dog")
			var order: Array=[1,0] if layout=="floor" else [0,1]
			for dog_id in order:
				story.choose_lead(dog_id)
				study.player.position=Vector3(story.goals[dog_id].x,0,story.goals[dog_id].y)
				story.choose_profile(1-dog_id)
				var before: int=story.found
				story.match_dog()
				require(story.found==before and story.reader.text.contains("differs"),"wrong profile compares non-color descriptors without penalty")
				story.choose_profile(dog_id)
				story.match_dog()
				require((story.found&(1<<dog_id))!=0,"either-order correct ear/tag match succeeds")
			require(story.found==3 and not story.won and not story.reunion.visible,"two matches require deliberate gathering reunion")
			story.choose_lead(2)
			study.player.position=Vector3(story.goals[2].x,0,story.goals[2].y)
			story.match_dog()
			require(story.won and story.reunion.visible and story.reader.text.begins_with("Two dogs home!"),"visible owner reunion has complete leading thank-you copy")
			for node in story.dogs+story.reunion.get_children():
				require(node.is_visible_in_tree(),"both actual dogs and original visiting owners are visible at reunion")
				require(study.building_containing_point(Vector2(node.global_position.x,node.global_position.z)).is_empty(),"reunion models are outside measured footprints")
				for mesh in node.find_children("*","MeshInstance3D",true,false):
					var box: AABB=mesh.get_aabb()
					for corner in range(8):
						var point: Vector3=mesh.global_transform*box.get_endpoint(corner)
						require(study.building_containing_point(Vector2(point.x,point.z)).is_empty(),"actual reunion dog/owner mesh corners stay outside footprints")
						var local: Vector3=study.gathering_layouts_node.to_local(point)
						require(absf(local.x)>6.6 and absf(local.x)<8.3 and absf(local.z)<1.55,"actual reunion parts stand clear beside barricade end, not across its rail/legs")
						for pole_x in [-5.9,5.9]:
							for pole_z in [-1.25,1.25]: require(Vector2(local.x,local.z).distance_to(Vector2(pole_x,pole_z))>0.10,"actual reunion mesh corners clear existing light poles")
			require(story.dogs[0].has_node("FloppyEar") and story.dogs[0].get_node("RoundTag").mesh is SphereMesh and story.dogs[1].has_node("UprightEar") and story.dogs[1].get_node("TriangleTag").mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX].size()==3,"ears and genuinely round/triangular world tags provide non-color differences")
			story.info_view=true
			story.refresh(false)
			require(story.reader.text.contains("1419 Bryant") and story.reader.text.contains("OUTSIDE") and story.reader.text.contains("No report is sent"),"real service reference stays separate and remote")
			story.end_session()
			require(not story.active and not story.reunion.visible,"End hides visit-only reunion")
			require(saved==JSON.stringify(study.build_save_envelope()) and file==FileAccess.get_file_as_string(study.save_path) and quiet==[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled],"all dog play is zero-save/file/settings/photo/award and quiet-safe")
			story.close_story(false)
	# Actual source route, real Stop and generation-owned arrival; no teleport for this proof.
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	story.open_story()
	story.begin()
	for target in [0,1,2]:
		story.choose_lead(target)
		story.walk_to_lead()
		var steps := 0
		while not study.current_path.is_empty() and steps<5000:
			study.advance_walk(0.1)
			story._process(0)
			steps+=1
			if steps==4:
				study.stop_walking()
				require(not story.traveling and not story.visible,"Stop clears dog arrival intent before opening")
				story.open_story()
				story.walk_to_lead()
		for f in range(8): await process_frame
		require(steps>4 and steps<5000 and story.visible and story.near(),"actual dog route reaches selected source lead with Stop/resume")
		if target<2:
			story.choose_profile(target)
			story.match_dog()
		else: story.match_dog()
	require(story.won,"actual three walks complete reunion")
	story.close_story(false)
	require(study.power_story.open_story() and story.visible and not study.power_story.visible,"F8 gateway resumes active dog rather than overlapping Power")
	story.end_session()
	story.close_story(false)
	study.power_story.open_story()
	study.power_story.begin()
	require(not story.open_story(),"active but closed or visible Power refuses dog overlap")
	study.power_story.end_session(false)
	study.power_story.close_story(false)
	study.apply_save_envelope(full_profile)
	study.hide_story_card()
	study.last_story_chapter=int(study.current_chapter().num)
	require(not story.active and not story.visible and not story.reunion.visible,"reload resets visit completely")
	root.size=Vector2i(1100,760)
	print("DOG_STORY_PASS:2layouts x6sizes/trueui_accept/clue-led choices/decoy/wrongmatch/bothorders/3realwalksStop/reunion/remoteSFACC/no-save/quiet/manual/reload")

func verify_lantern_procession(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"parade only runs with isolated test profile")
	if not study.is_test_suite_mode(): return
	var story: Node=study.lantern_procession
	require(story.sites_valid and story.route.size()==2,"prevalidated actual street route exists")
	if not story.sites_valid: return
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
			var data: Dictionary=JSON.parse_string(full_profile); data.gathering_layout=layout
			study.apply_save_envelope(JSON.stringify(data)); study.hide_story_card()
			study.last_story_chapter=int(study.current_chapter().num); study.startup_story_pending=false
			root.size=size
			for f in range(6): await process_frame
			var saved := JSON.stringify(study.build_save_envelope())
			var file: String=FileAccess.get_file_as_string(study.save_path)
			var quiet: Array=[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]
			study.following_player=false
			var pose: Array=study.panel_camera_pose()
			study.power_story.open_story()
			for f in range(6): await process_frame
			require(study.power_story.snapshot().buttons.size()==13,"Power button indices unchanged")
			for b in study.power_story.tabs+[study.power_story.dogs_entry,study.power_story.more_entry]:
				require(b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"all five gateway choices fit")
			study.power_story.close_story(false)
			study.story_picker.open_picker()
			for f in range(5): await process_frame
			require(study.story_picker.visible and Rect2(Vector2.ZERO,Vector2(size)).encloses(study.story_picker.panel.get_global_rect()),"paged episode picker fits")
			study.story_picker.close_picker()
			require(story.open_story(),"Halloween opens after gathering")
			story.choose_costume(1); story.choose_lantern(1)
			story.buttons[4].grab_focus()
			var down := InputEventAction.new(); down.action="ui_accept"; down.pressed=true
			Input.parse_input_event(down); await process_frame
			var up := InputEventAction.new(); up.action="ui_accept"; up.pressed=false
			Input.parse_input_event(up)
			for f in range(6): await process_frame
			require(story.active and story.player_costume.visible,"real ui_accept begins visible costume procession")
			require(study.panel_camera_pose()==pose,"Halloween reader exact manual camera")
			for b in story.buttons: require(b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"ten named44px Halloween controls fit")
			require(story.reader.scroll_active and story.reader.get_theme_font_size("normal_font_size")==16,"full16px scrollable parade reader")
			for distance in range(0,145): require(story.route_clear(story.route_point(float(distance)/4.0)),"route clears lamps trees people and both gathering layout envelopes")
			for distance in range(8,37):
				story.progress=float(distance); story.update_world(false)
				for person in story.crew:
					for mesh in person.find_children("*","MeshInstance3D",true,false):
						for corner in range(8):
							var point: Vector3=mesh.global_transform*mesh.get_aabb().get_endpoint(corner)
							require(study.building_containing_point(Vector2(point.x,point.z)).is_empty(),"all moving participant mesh corners outside actual footprints")
			story.progress=8; story.update_world(false)
			study.player.position=Vector3(story.goal().x,0,story.goal().y)
			story.advance()
			require(story.phase==1 and not story.won,"assembly deliberately begins march")
			var assembly: Vector3=study.player.position
			study.player.position=Vector3(story.goal().x,0,story.goal().y)
			story.advance()
			require(not story.won and story.progress==8,"walking alone to finish cannot win with crew left behind")
			story.walk_route()
			require(story.returning and story.trip_goal.distance_to(story.route_point(story.progress))<0.01,"off-route resume returns to paused group before marching")
			study.advance_walk(0.1); story._process(0)
			require(story.progress==8,"return walk cannot teleport visitors forward")
			study.stop_walking(); study.player.position=assembly
			story.open_story()

			story.choose_costume(0); require(story.costume==1,"costume locked during march")
			story.close_story(false)
			require(study.power_story.open_story() and story.visible and not study.power_story.visible,"F8 resumes active parade")
			require(not study.dog_story.open_story(),"parade excludes dog overlap")
			story.end_session(); story.close_story(false)
			require(story.costume==0 and story.lantern==0,"End resets visit choices")
			require(saved==JSON.stringify(study.build_save_envelope()) and file==FileAccess.get_file_as_string(study.save_path) and quiet==[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled],"parade zero-save and quiet settings unchanged")
	study.apply_save_envelope(full_profile); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
	story.open_story(); story.begin()
	for leg in range(2):
		story.walk_route()
		var steps := 0
		while not study.current_path.is_empty() and steps<5000:
			study.advance_walk(0.1); story._process(0); steps+=1
			if steps==8:
				study.stop_walking()
				var held: float=story.progress
				for f in range(3): story._process(1)
				require(not story.traveling and story.progress==held,"Stop freezes procession without timer-driven movement")
				story.open_story(); story.walk_route()
		for f in range(8): await process_frame
		require(steps<5000 and story.near() and story.visible,"actual parade route arrives without teleport")
		story.advance()
	require(story.won and story.progress>35 and story.crew[0].position.distance_to(story.crew[1].position)>3.9,"actual moving group reaches deliberate finish at fixed spacing")
	story.end_session(); story.close_story(false)
	require(not story.player_costume.visible and not story.crew[0].visible,"End removes visit costume and crew")
	study.apply_save_envelope(full_profile); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(1100,760)
	print("LANTERN_PROCESSION_PASS:2layouts x6sizes/actualui_accept/routes/Stop/movingmesh/costumes/gateway/quiet/manual/zero-save")


func verify_voting_story(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"election walk requires isolated native profile")
	if not study.is_test_suite_mode(): return
	var story: Node=study.voting_story
	require(story.sites_valid and story.goals.size()==2,"two sourced outdoor observations available")
	if not story.sites_valid: return
	require(story.valid_source(story.source),"exact published source identities accepted")
	var malformed: Dictionary=story.source.duplicate(true); malformed.sites.reverse()
	require(not story.valid_source(malformed),"reordered source identities refuse")
	malformed=story.source.duplicate(true); malformed.sites[0].observation[0]=INF
	require(not story.valid_source(malformed),"nonfinite observation refuses")
	study.power_place.loaded=false; require(not story.available(),"degraded power geometry disables dependent episode safely"); study.power_place.loaded=true
	require(story.home.distance_to(study.neighbor_xz(0))>3.9,"share stand beside Bea, not inside her walker")
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360)]:
			var data: Dictionary=JSON.parse_string(full_profile); data.gathering_layout=layout
			study.apply_save_envelope(JSON.stringify(data)); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num); study.startup_story_pending=false
			root.size=size
			for f in range(8): await process_frame
			var saved := JSON.stringify(study.build_save_envelope())
			var file: String=FileAccess.get_file_as_string(study.save_path)
			var quiet: Array=[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled]
			study.following_player=false; var pose: Array=study.panel_camera_pose()
			study.story_picker.open_picker()
			for f in range(6): await process_frame
			require(study.story_picker.entries.size()==4 and Rect2(Vector2.ZERO,Vector2(size)).encloses(study.story_picker.panel.get_global_rect()),"four visits, two full entries per page fit")
			study.story_picker.close_picker(); require(story.open_story(),"historical map reader opens")
			story.buttons[4].grab_focus()
			var down := InputEventAction.new(); down.action="ui_accept"; down.pressed=true; Input.parse_input_event(down); await process_frame
			var up := InputEventAction.new(); up.action="ui_accept"; up.pressed=false; Input.parse_input_event(up)
			for f in range(6): await process_frame
			require(story.active and story.paper.visible,"real ui_accept begins visible original paper")
			require(study.panel_camera_pose()==pose,"election reader preserves manual camera")
			for b in story.buttons: require(b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"12 named election controls fit")
			require(story.reader.scroll_active and story.reader.get_theme_font_size("normal_font_size")==16,"full16px source reader")
			story.record_site(); require(story.observed==0,"remote Record cannot claim a site")
			for i in ([0,1] if layout=="table" else [1,0]):
				story.choose(i)
				require(study.is_walkable_point(story.goal(),0.85) and study.building_containing_point(story.goal()).is_empty(),"observation outside measured footprint with clearance")
				require(story.goal().distance_to(Vector2(story.source.sites[i].xz[0],story.source.sites[i].xz[1]))>5,"city address pin is not a walking goal")
				study.player.position=Vector3(story.goal().x,0,story.goal().y); story.record_site()
			var observed: int=story.observed; story.record_site(); require(story.observed==observed,"repeated Record is harmless")
			story.make_map(); require(story.phase==2 and story.observed==3,"both orders reach actual map placement")
			story.close_story(false); story.open_story(); require(story.buttons[story.selected].has_focus(),"reopened map focuses enabled label")
			for f in range(6): await process_frame
			for pad in story.pads: require(pad.size.x>=44 and pad.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(pad.get_global_rect()),"map pin targets fit at44px")
			require(not story.pads[0].get_global_rect().intersects(story.pads[1].get_global_rect()),"map targets do not overlap")
			story.choose(0); story.place_label(1); require(story.placed==0 and story.phase==2,"mismatch keeps all observed progress")
			story.place_label(0); story.choose(1); story.place_label(1)
			require(story.phase==3 and story.placed==3 and not story.won,"two exact labels need deliberate return/share")
			for f in range(6): await process_frame
			for label in story.map_labels: require(label.visible and Rect2(Vector2.ZERO,Vector2(size)).encloses(label.get_global_rect()),"actual native address labels fit")
			story.share_map(); require(not story.won,"remote Share refuses")
			study.player.position=Vector3(story.home.x,0,story.home.y); story.share_map(); require(story.won,"near gathering Share completes")
			require(story.reader.text.contains("380 Eddy") and story.reader.text.contains("398 Eddy") and story.reader.text.contains("246 Eddy") and story.reader.text.contains("240 Eddy") and story.reader.text.contains("later relocations unverified"),"full dated distinctions retained")
			require(story.textures.size()<=32 and saved==JSON.stringify(study.build_save_envelope()) and file==FileAccess.get_file_as_string(study.save_path) and quiet==[study.music_playing,study.music_mode,study.music_volume,study.reward_sounds_enabled],"visit art bounded zero-save exact quiet/file")
			story.end_session(); require(story.buttons[4].has_focus(),"End focuses enabled Begin"); story.close_story(false); require(not story.paper.visible,"End clears original paper")
	for walk_layout in ["table","floor"]:
		var walk_data: Dictionary=JSON.parse_string(full_profile); walk_data.gathering_layout=walk_layout
		study.apply_save_envelope(JSON.stringify(walk_data)); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
		root.size=Vector2i(1100,760); study.player.position=Vector3(story.home.x,0,story.home.y); study.following_player=false
		var walking_pose: Array=study.panel_camera_pose(); story.open_story(); story.begin()
		for i in [1,0,2]:
			if i<2: story.choose(i)
			else:
				story.make_map(); story.choose(0); story.place_label(0); story.choose(1); story.place_label(1)
			story.walk_route()
			if i==1: require(story.via_pending,"real outbound walk takes sourced Taylor/Eddy via")
			var steps := 0
			while (not study.current_path.is_empty() or story.traveling) and steps<10000:
				study.advance_walk(0.1); story._process(0); steps+=1
				if steps==8:
					study.stop_walking(); require(not story.traveling and not story.via_pending,"Stop cancels owned route legs")
					story.open_story(); story.walk_route()
			for f in range(8): await process_frame
			require(steps<10000 and story.near() and story.visible,"actual sourced route reaches exterior/gathering within2m")
			require(study.panel_camera_pose()==walking_pose,"exact manual camera survives actual route and arrival")
			if i<2:
				require(story.buttons[6].has_focus(),"actual arrival focuses enabled Record")
				story.record_site()
			else: story.share_map()
		require(story.won,"three real walks and deliberate map/Share completed")
	story.close_story(false); study.apply_save_envelope(full_profile)
	require(not story.active and not story.visible and not story.paper.visible,"import/reload clears visit")
	print("VOTING_STORY_PASS:2layouts x6sizes/trueui_accept/2sourcegoals/bothorders/mapmismatch/threeactualwalksStop/exactquietmanual/zero-save")

func pinch_touch(index: int, point: Vector2, pressed: bool, canceled := false) -> void:
	var event := InputEventScreenTouch.new()
	event.index=index; event.position=point; event.pressed=pressed; event.canceled=canceled
	if pressed: pinch_test_contacts[index]=point
	else: pinch_test_contacts.erase(index)
	Input.parse_input_event(event)

func pinch_drag(index: int, point: Vector2) -> void:
	var event := InputEventScreenDrag.new(); event.index=index; event.position=point
	event.relative=point-Vector2(pinch_test_contacts.get(index,point)); pinch_test_contacts[index]=point
	Input.parse_input_event(event)

func pinch_release_all() -> void:
	for index in pinch_test_contacts.keys(): pinch_touch(index,pinch_test_contacts[index],false)

func verify_map_pinch(study: Node, profile: String) -> void:
	require(study.is_test_suite_mode(),"pinch native checks require isolated profile")
	study.apply_save_envelope(profile); study.hide_story_card(); study.startup_story_pending=false
	study.last_story_chapter=int(study.current_chapter().num); study.end_conversation()
	var save: String=JSON.stringify(study.build_save_envelope())
	for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(559,360),Vector2i(599,360)]:
		root.size=size
		for f in range(8): await process_frame
		pinch_release_all(); study.frame_player_for_walking(); study.cancel_map_pinch()
		var area: Rect2=study.play_area_rect(); var center: Vector2=area.get_center()
		var a := center-Vector2(30,0); var b := center+Vector2(30,0)
		require(not study.is_screen_point_in_ui(a) and not study.is_screen_point_in_ui(b),"native pinch begins on unobstructed map")
		var player: Vector2=study.player_xz(); var initial: float=study.view_size
		var followed: bool=study.following_player
		pinch_touch(0,a,true); await process_frame
		require(study.pointer_active,"first real touch arms emulated mouse before suppression")
		pinch_touch(1,b,true); pinch_drag(1,center+Vector2(90,0))
		for f in range(3): await process_frame
		require(absf(study.view_size-clampf(initial*0.5,24,maxf(900,study.overview_size*2.5)))<0.001,"spread zooms in with original minimum")
		require(study.following_player==followed and study.player_xz()==player and study.current_path.is_empty(),"pinch keeps follow/player/route intent")
		pinch_touch(0,a,false); pinch_drag(1,center+Vector2(110,0))
		var held: float=study.view_size
		for f in range(3): await process_frame
		require(study.map_pinch_blocked and study.view_size==held and study.current_path.is_empty(),"first index release and remaining finger cannot walk or pan")
		pinch_touch(1,b,false); await process_frame
		require(not study.map_pinch_blocked and study.map_touch_contacts.is_empty(),"all contacts release gesture ownership")
		study.following_player=false; study.view_size=100; study.update_camera()
		center.x-=15; a=center-Vector2(30,0); b=center+Vector2(30,0)
		var anchor: Vector2=study.screen_to_ground_xz(center)
		pinch_touch(0,a,true); pinch_touch(1,b,true); pinch_drag(0,center-Vector2(90,0)); pinch_drag(1,center+Vector2(90,0))
		for f in range(3): await process_frame
		require(absf(study.view_size-100.0/3.0)<0.001 and study.screen_to_ground_xz(center).distance_to(anchor)<0.02,"manual initial centroid stays on same ground point")
		pinch_drag(0,center-Vector2(10,0)); pinch_drag(1,center+Vector2(10,0))
		for f in range(3): await process_frame
		require(absf(study.view_size-300)<0.001,"pinch closes to zoom out")
		pinch_touch(2,center,true); var third_size: float=study.view_size
		pinch_drag(0,center-Vector2(60,0)); await process_frame
		require(not study.map_pinch_active and study.view_size==third_size,"extra contact cancels until all lift")
		study.notification(NOTIFICATION_APPLICATION_FOCUS_OUT)
		require(study.map_touch_contacts.is_empty() and not study.map_pinch_pending and not study.pointer_active,"notification focus loss clears touch and emulated mouse intent")
		pinch_release_all()
		pinch_touch(0,a,true); pinch_touch(1,b,true); pinch_drag(1,b+Vector2(40,0)); pinch_touch(1,b,false,true)
		await process_frame
		require(not study.map_pinch_active and not study.map_pinch_pending,"touch cancel clears pending zoom")
		pinch_release_all(); study.cancel_map_pinch(); study.view_size=100; study.update_camera()
		var ui: Vector2=study.header_panel.get_global_rect().get_center()
		pinch_touch(0,ui,true); pinch_touch(1,b,true); pinch_drag(1,b+Vector2(50,0)); await process_frame
		require(study.view_size==100,"UI-origin second contact refuses map zoom")
		pinch_release_all(); study.cancel_map_pinch()
		study.view_size=30; study.update_camera(); pinch_touch(0,a,true); pinch_touch(1,b,true); pinch_drag(1,center+Vector2(90,0))
		for f in range(3): await process_frame
		require(study.view_size==24,"actual gesture hits minimum clamp"); pinch_release_all()
		study.view_size=study.clamp_view_size(1e9)*0.9; study.update_camera(); pinch_touch(0,a,true); pinch_touch(1,b,true); pinch_drag(1,center-Vector2(10,0))
		for f in range(3): await process_frame
		require(study.view_size==study.clamp_view_size(1e9),"actual gesture hits maximum clamp"); pinch_release_all()
		study.frame_player_for_walking(); pinch_touch(0,a,true); pinch_touch(1,b,true); pinch_touch(1,b,false); pinch_drag(0,a-Vector2(12,0)); await process_frame
		require(study.map_pinch_blocked and study.current_path.is_empty(),"opposite release order keeps emulating finger suppressed"); pinch_release_all()
		pinch_touch(0,a,true); await process_frame; require(study.pointer_active,"one-finger touch recovers after all-lift"); pinch_drag(0,a+Vector2(20,0)); pinch_touch(0,a+Vector2(20,0),false); await process_frame
		require(not study.following_player and not study.pointer_active and study.current_path.is_empty(),"one-finger pan recovers without route")
		require(JSON.stringify(study.build_save_envelope())==save,"all pinch paths preserve persistent progress")
	pinch_release_all(); study.cancel_map_pinch()
	root.size=Vector2i(390,667)
	for f in range(8): await process_frame
	require(study.film_screening.open_screening(),"reader refusal case opens completed screening")
	for f in range(8): await process_frame
	var reader: RichTextLabel=study.film_screening.reader
	var rp: Vector2=reader.get_global_rect().get_center(); reader.get_v_scroll_bar().value=0
	pinch_touch(0,rp,true); pinch_drag(0,rp-Vector2(0,12)); await process_frame
	var first_scroll: float=reader.get_v_scroll_bar().value
	pinch_touch(1,Vector2(50,180),true); pinch_drag(0,rp-Vector2(0,28)); await process_frame
	require(reader.get_v_scroll_bar().value>first_scroll,"refused second finger preserves actual reader GUI scroll")
	pinch_release_all(); study.film_screening.close_screening(false)
	require(study.rhythm_circle.open_circle(),"rhythm refusal opens actual owner")
	for f in range(8): await process_frame
	study.rhythm_circle.view_circle(); require(study.rhythm_circle.owns_view,"rhythm owner takes view before raw touch refusal"); var rc: Vector2=study.rhythm_circle.scene_rect.get_center()
	pinch_touch(0,rc,true); pinch_touch(1,rc+Vector2(20,0),true); pinch_drag(0,rc+Vector2(10,0)); await process_frame
	require(not study.rhythm_circle.owns_view,"rhythm raw touch still pans its own scene with second contact")
	pinch_release_all(); await process_frame; require(not study.rhythm_circle.dragging,"rhythm receives actual release")
	study.rhythm_circle.close_circle(false); study.cancel_map_pinch()
	study.apply_save_envelope(profile); study.hide_story_card(); study.startup_story_pending=false; study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(1100,760)
	require(study.overview_text().contains("WASD/arrows walk · drag pans · right-drag rotates · scroll zooms"),"desktop overview guidance retained")
	print("MAP_PINCH_PASS:5sizes/actualtouch/spread/pinch/clamps/manualanchor/follow/bothreleaseorders/extra/cancel/notificationfocus/UI/readerGUI/rhythmGUI/recovery/save")

# Adversarial queue-component fixture only, NOT an accepted gameplay viewport.
# Measure actual headroom in the existing side dock, then reduce height just enough
# to force queuing. Keep original text/timers/ownership and all normal-size tests.
func constrain_reward_headroom_fixture(study: Node) -> void:
	root.size=Vector2i(520,360)
	for f in range(4): await process_frame
	var reduction: int=maxi(0,ceili(study.play_area_rect().size.y-study.reward_banner.size.y+8.0))
	root.size=Vector2i(520,360-reduction)
	for f in range(4): await process_frame
	study.layout_reward_banner()
	require(study.play_area_rect().size.y<study.reward_banner.size.y,"queue-component fixture proves genuinely insufficient headroom")
	print("PHONE_REWARD_FIXTURE viewport=",root.size," banner_height=",study.reward_banner.size.y," area_height=",study.play_area_rect().size.y)

func panel_clears_walking(study: Node, panel: Control) -> bool:
	if study.phone_talking() and not study.controls.is_visible_in_tree():
		return panel == study.block_panel and panel.get_global_rect().end.y <= root.size.y - 11 and study.conv_rows[0].is_visible_in_tree()
	return panel.get_global_rect().end.y <= study.controls.get_global_rect().position.y

func verify_phone_tray_targets(study: Node, size: Vector2i) -> void:
	require(study.phone_tray.is_visible_in_tree(),"tray target checks require a real disclosed native tray")
	for b in [study.map_control,study.phone_find_control,study.zoom_in_control,study.zoom_out_control,study.phone_all_actions_control,study.phone_tray_close]:
		require(b.is_visible_in_tree() and b.get_global_rect().size.x>=44 and b.get_global_rect().size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"all six disclosed secondary targets are44px and on-screen")
		require(b.focus_mode==Control.FOCUS_ALL and b.has_theme_stylebox_override("focus"),"all disclosed secondary targets retain native focus rings")

func verify_phone_walking_restored(study: Node, size: Vector2i) -> void:
	require(study.controls.is_visible_in_tree() and study.controls.columns==3 and study.controls.get_child_count()==3 and study.phone_explore_control.is_visible_in_tree(),"phone Close restores three named native primaries")
	require(study.controls.offset_top == -maxf(50,study.controls.get_combined_minimum_size().y)-12 and study.controls.offset_right==-12,"phone primary band fits its actual native minimum")
	require(study.next_hint_control.text in ["Next Step","Back to Me"] and study.walk_control.text==guided_caption(study) and study.phone_explore_control.text=="Explore","phone Close restores objective/walking/Explore labels")
	await phone_accept(study.phone_explore_control)
	verify_phone_tray_targets(study,size)
	var labels: Array = ["Tenderloin Map","Find Me","Zoom In (+)","Zoom Out (−)"]
	for i in range(4): require(study.phone_original_walk_buttons[i+1].text==labels[i],"disclosed original secondary captions retained")
	await phone_accept(study.phone_tray_close)
	require(not study.phone_tray.visible and study.phone_explore_control.has_focus(),"real tray Close restores Explore focus")

func phone_escape() -> void:
	for pressed in [true,false]:
		var esc:=InputEventKey.new(); esc.keycode=KEY_ESCAPE; esc.pressed=pressed; Input.parse_input_event(esc)
		await process_frame
	for f in range(5): await process_frame

func phone_accept(control: Button) -> void:
	require(control.is_visible_in_tree(),"phone acceptance targets a visible native button")
	control.grab_focus()
	var down := InputEventAction.new(); down.action="ui_accept"; down.pressed=true; Input.parse_input_event(down)
	await process_frame
	var up := InputEventAction.new(); up.action="ui_accept"; up.pressed=false; Input.parse_input_event(up)
	for f in range(6): await process_frame

func verify_phone_disclosure(study: Node, startup_snapshot: String, full: String) -> void:
	require(study.is_test_suite_mode(),"phone UI checks require isolated formal profile")
	var startup: Dictionary=JSON.parse_string(startup_snapshot)
	print("PHONE_STARTUP_FIXTURE block_opened=",startup.get("block_opened")," visited=",startup.get("visited_neighbors")," layout=",startup.get("gathering_layout"))
	# The separate native test save can contain prior test progress at startup.
	# Explicitly create a fresh isolated fixture; never infer freshness from its name.
	study.reset_mural_state_to_defaults("fresh")
	var fresh: String=JSON.stringify(study.build_save_envelope())
	require(study.visited_neighbors.is_empty() and not study.block_opened and String(study.current_objective().id)=="meet","phone fixture starts with no earned visits or opened block")
	for width in [320,390]:
		for height in [568,639,640,664,667]:
			study.apply_save_envelope(fresh); study.hide_story_card(); study.startup_story_pending=false; study.last_story_chapter=int(study.current_chapter().num)
			study.end_conversation(); root.size=Vector2i(width,height)
			for f in range(8): await process_frame
			study.talk_with_neighbor(0)
			for f in range(8): await process_frame
			require(study.phone_talking() and not study.controls.is_visible_in_tree(),"phone talk hides duplicate walking grid")
			require(study.block_detail_label.get_theme_font_size("normal_font_size")==16 and study.block_detail_label.size.y>=96,"phone talk gives16px text at least96px reader")
			require(not study.phone_actions_open and study.conv_rows[0].visible,"talk starts with three original primary callbacks")
			var save: String=JSON.stringify(study.build_save_envelope())
			await phone_accept(study.conv_next_btn)
			require(study.phone_actions_open and study.conv_rows[1].visible,"real Next Step discloses relevant actions")
			for b in study.activity_detail_snapshot(study.block_detail_label,study.block_panel,study.conv_buttons).buttons:
				require(b.text_fits and b.width>=44 and b.height>=44,"disclosed named destination choices fit complete words at actual phone font")
			var esc := InputEventKey.new(); esc.keycode=KEY_ESCAPE; esc.pressed=true; Input.parse_input_event(esc)
			for f in range(6): await process_frame
			require(not study.phone_actions_open and study.phone_talking() and study.conv_next_btn.has_focus(),"first Escape dismisses choices and restores focus without Goodbye")
			await phone_accept(study.conv_next_btn)
			require(study.conv_action_ids[2]=="hub" and study.conv_action_btns[2].is_visible_in_tree(),"fresh Bea discloses original All Actions")
			await phone_accept(study.conv_action_btns[2])
			require(study.block_panel_mode=="hub" and not study.phone_actions_open and not study.phone_explore_control.is_visible_in_tree(),"talk-to-hub clears disclosure and prevents covering tray")
			await phone_escape()
			require(not study.block_panel.visible,"single Escape reaches original hub Goodbye after talk disclosure")
			study.show_conversation(0)
			for f in range(6): await process_frame
			await phone_accept(study.conv_bye_btn)
			require(study.controls.is_visible_in_tree() and study.controls.get_child_count()==3 and not study.phone_tray.visible,"Goodbye returns to three walking primaries")
			for b in study.controls.get_children():
				require(b.get_global_rect().size.x>=44 and b.get_global_rect().size.y>=44 and Rect2(Vector2.ZERO,Vector2(width,height)).encloses(b.get_global_rect()),"all phone primaries44px and fully visible")
			await phone_accept(study.phone_explore_control)
			require(study.phone_tray.visible and study.map_control.is_visible_in_tree(),"real Explore opens original map controls")
			require(study.is_screen_point_in_ui(study.phone_tray.get_global_rect().get_center()) and study.play_area_rect().end.y<=study.phone_tray.get_global_rect().position.y,"tray owns hit-testing and scene clearance")
			study.frame_player_for_walking(); var z: float=study.view_size
			await phone_accept(study.zoom_in_control)
			require(study.view_size<z and study.phone_tray.visible,"original Zoom remains usable through Explore")
			await phone_accept(study.map_control)
			require(not study.phone_tray.visible and study.next_hint_control.text=="Back to Me","overview offers direct primary return while keeping Explore")
			await phone_accept(study.next_hint_control)
			require(study.following_player and not study.in_overview and not study.in_wide_overview,"Back to Me returns through original framing")
			require(JSON.stringify(study.build_save_envelope())==save,"phone disclosure and framing do not alter saved accomplishment")
			await phone_accept(study.phone_explore_control)
			verify_phone_tray_targets(study,Vector2i(width,height))
			await phone_accept(study.phone_all_actions_control)
			require(study.block_panel_mode=="hub" and study.block_panel.visible and not study.phone_tray.visible,"real tray All Actions opens original hub")
			await phone_escape()
			require(not study.block_panel.visible,"one Escape closes hub entered from Explore")

	# Isolated valid saved-state fixtures exercise required choices without a disclosure tap.
	for size in [Vector2i(320,568),Vector2i(320,667),Vector2i(390,568),Vector2i(390,667)]:
		root.size=size
		var layout: Dictionary=JSON.parse_string(fresh)
		layout.visited_neighbors=[]
		for n in study.neighbors: layout.visited_neighbors.append(String(n.id))
		layout.gathering_layout=""
		require(study.apply_save_envelope(JSON.stringify(layout)),"derived layout fixture is a valid actual save envelope"); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
		study.show_conversation(0)
		for f in range(8): await process_frame
		print("PHONE_LAYOUT_FIXTURE ",size," objective=",study.current_objective().id," met=",study.visited_neighbors.size()," opened=",study.block_opened," layout=",study.gathering_layout," ids=",study.conv_action_ids)
		require(not study.phone_actions_open and study.conv_action_ids[0]=="layout_table" and study.conv_action_ids[1]=="layout_floor" and study.conv_action_btns[0].is_visible_in_tree() and study.conv_action_btns[1].is_visible_in_tree(),"both required layout choices stay inline before NextStep")
		require(study.block_panel.get_global_rect().position.y>=study.header_panel.get_global_rect().end.y and panel_clears_walking(study,study.block_panel),"inline layout reader clears header and viewport edge")
		await phone_accept(study.conv_action_btns[0])
		require(study.gathering_layout=="table","actual inline Long Table retains its original progress action")
		var loans: Dictionary=JSON.parse_string(full)
		loans.epilogue.packing=true; loans.epilogue.returned=[]
		study.apply_save_envelope(JSON.stringify(loans)); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
		study.show_conversation(study.neighbor_index_for_id("thanh"))
		for f in range(8): await process_frame
		require(not study.phone_actions_open and String(study.conv_action_ids[0]).begins_with("return_owner:") and study.conv_action_btns[0].is_visible_in_tree(),"required owner return stays inline before NextStep")
		require(study.block_panel.get_global_rect().position.y>=study.header_panel.get_global_rect().end.y and panel_clears_walking(study,study.block_panel),"owner-return reader and action clear header and viewport edge")
	study.end_conversation(); study.apply_save_envelope(full); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
	for size in [Vector2i(559,360),Vector2i(599,360),Vector2i(1100,760)]:
		root.size=size
		for f in range(8): await process_frame
		require(not study.uses_phone_disclosure() and study.controls.get_child_count()==6 and not study.phone_explore_control.is_visible_in_tree(),"legacy landscape/desktop restore all original control parents")
	for btn in study.phone_original_walk_buttons: require(btn.get_theme_font_size("font_size")==19,"first completed desktop layout restores canonical original font")
	print("PHONE_DISCLOSURE_PASS:inlineLayoutOwner/AllActionsEsc/10portraitsizes/16px96pxreader/realui_accept/talkchoicesEsc/3primaries/Explore/Zoom/Map/BackToMe/save/legacy")


func story_visit_press(button: Button) -> void:
	require(button.is_visible_in_tree() and not button.disabled,"visit action actually visible and enabled")
	button.grab_focus()
	var down := InputEventAction.new(); down.action="ui_accept"; down.pressed=true
	Input.parse_input_event(down)
	await process_frame
	var up := InputEventAction.new(); up.action="ui_accept"; up.pressed=false
	Input.parse_input_event(up)
	for frame in range(8): await process_frame

func verify_story_visits(study: Node, full_profile: String) -> void:
	require(study.is_test_suite_mode(),"story visit tests use formal isolated saves")
	if not study.is_test_suite_mode(): return
	var picker: Node=study.story_picker
	var dog: Node=study.dog_story
	var lantern: Node=study.lantern_procession
	var power: Node=study.power_story
	var voting: Node=study.voting_story
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(390,568),Vector2i(520,360),Vector2i(599,360)]:
			var profile: Dictionary=JSON.parse_string(full_profile); profile.gathering_layout=layout
			study.apply_save_envelope(JSON.stringify(profile)); study.hide_story_card()
			study.startup_story_pending=false; study.last_story_chapter=int(study.current_chapter().num)
			root.size=size
			for f in range(8): await process_frame
			var saved := JSON.stringify(study.build_save_envelope())
			var file: String=FileAccess.get_file_as_string(study.save_path)
			var quiet: Array=[study.music_playing,study.music_volume,study.reward_sounds_enabled,study.music_mode]
			study.following_player=false
			var pose: Array=study.panel_camera_pose()
			dog.open_story(); await story_visit_press(dog.buttons[6])
			# Component fixture: genuine match/real-walk browser coverage separately proves acquisition.
			dog.found=1; dog.profile=1; dog.lead=1
			dog.traveling=true; dog.trip_goal=Vector2(1,1); study.current_path.clear(); study.current_path.append(Vector2(1,1))
			var old_generation: int=dog.generation
			await story_visit_press(dog.stories_entry)
			require(picker.visible and not dog.visible and not dog.traveling and study.current_path.is_empty() and dog.generation>old_generation,"switch cancels pending route/generation before new modal")
			await story_visit_press(picker.entries[0])
			require(not dog.active and not dog.dogs[0].visible and dog.found==1 and picker.suspended.has(dog),"paused dog state retained while world ownership removed")
			await story_visit_press(lantern.buttons[1]); await story_visit_press(lantern.buttons[3]); await story_visit_press(lantern.buttons[4])
			lantern.phase=1; lantern.progress=17; lantern.update_world()
			await story_visit_press(lantern.stories_entry)
			await story_visit_press(picker.later); await story_visit_press(picker.entries[3])
			require(dog.active and dog.found==1 and dog.profile==1 and dog.lead==1 and not lantern.active and not lantern.crew[0].visible,"actual choice resumes dog fields and suspends parade")
			require(lantern.costume==1 and lantern.lantern==1 and lantern.progress==17,"parade choices and progress retained")
			dog.found=3; dog.lead=2; study.player.position=Vector3(dog.goals[2].x,0,dog.goals[2].y); dog.refresh(false)
			await story_visit_press(dog.buttons[8])
			require(dog.won and dog.reunion.visible and picker.lantern_invited and picker.completed.has(3),"deliberate reunion earns recognition, visible owners and personal invitation")
			await story_visit_press(dog.stories_entry)
			for f in range(8): await process_frame
			require(Rect2(Vector2.ZERO,Vector2(size)).encloses(picker.panel.get_global_rect()),"invitation and choices fit supported viewport")
			require(picker.reader.get_theme_font_size("normal_font_size")==16 and picker.reader.size.y>=64,"visit invitation has full 16px scrollable reader")
			for b in picker.entries+[picker.follow,picker.explore,picker.back,picker.earlier,picker.later]:
				if b.is_visible_in_tree(): require(b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"visit choice 44px and on screen")
			await story_visit_press(picker.explore)
			require(study.active_story_episode()==null and not picker.visible and not dog.reunion.visible and picker.lantern_invited,"Keep exploring releases ownership and retains invitation")
			var key := InputEventKey.new(); key.keycode=KEY_F8; key.shift_pressed=true; key.pressed=true
			Input.parse_input_event(key)
			await process_frame
			key.pressed=false; Input.parse_input_event(key)
			for f in range(8): await process_frame
			await story_visit_press(picker.follow)
			require(lantern.active and lantern.progress==17 and lantern.costume==1 and lantern.visible and not lantern.traveling and study.current_path.is_empty(),"Follow resumes retained parade without automatic walking")
			await story_visit_press(lantern.stories_entry)
			if picker.page==0: await story_visit_press(picker.later)
			await story_visit_press(picker.entries[2])
			power.choose(1 if layout=="floor" else 0); power.begin(); power.restored=1; power.turns[1]=[1,2,3,0]; power.station=1; power.update_world(); study.apply_time_of_day()
			var light: Color=study.world_env.background_color
			await story_visit_press(power.more_entry)
			await story_visit_press(picker.earlier); await story_visit_press(picker.entries[1])
			voting.begin(); voting.observed=1; voting.palette=1; voting.selected=1; voting.via_pending=true; voting.traveling=true
			require(not power.active and power.fixtures[0].material_override==power.originals[0],"Power suspension restores shared materials")
			await story_visit_press(voting.stories_entry)
			require(not voting.via_pending and not voting.traveling,"Election second leg cancelled by switch")
			await story_visit_press(picker.later); await story_visit_press(picker.entries[2])
			require(power.active and power.restored==1 and power.turns[1]==[1,2,3,0] and power.historical==(layout=="floor") and study.world_env.background_color==light,"Power mode, puzzle and lighting resume exactly")
			await story_visit_press(power.more_entry); await story_visit_press(picker.earlier); await story_visit_press(picker.entries[1])
			require(voting.active and voting.observed==1 and voting.palette==1 and voting.selected==1 and not voting.via_pending,"Election observations and choices retained without stale route")
			await story_visit_press(voting.stories_entry); await story_visit_press(picker.explore)
			var base_light: Color=study.world_env.background_color
			var cancel_key := InputEventKey.new(); cancel_key.keycode=KEY_F8; cancel_key.shift_pressed=true; cancel_key.pressed=true
			Input.parse_input_event(cancel_key); await process_frame; cancel_key.pressed=false; Input.parse_input_event(cancel_key)
			for f in range(8): await process_frame
			await story_visit_press(picker.back)
			require(not picker.visible and study.active_story_episode()==null and study.world_env.background_color==base_light,"Back from world selector never resumes paused Power")
			cancel_key.pressed=true; Input.parse_input_event(cancel_key); await process_frame; cancel_key.pressed=false; Input.parse_input_event(cancel_key)
			for f in range(8): await process_frame
			var escape := InputEventKey.new(); escape.keycode=KEY_ESCAPE; escape.pressed=true
			Input.parse_input_event(escape); await process_frame; escape.pressed=false; Input.parse_input_event(escape)
			for f in range(8): await process_frame
			require(not picker.visible and study.active_story_episode()==null and study.world_env.background_color==base_light,"Escape from world selector never resumes paused Power")
			require(study.panel_camera_pose()==pose,"story switches preserve exact manual camera")
			require(saved==JSON.stringify(study.build_save_envelope()) and file==FileAccess.get_file_as_string(study.save_path),"story switching and invitation write no saves")
			require(quiet==[study.music_playing,study.music_volume,study.reward_sounds_enabled,study.music_mode],"story choices retain quiet preferences")
			study.apply_save_envelope(JSON.stringify(profile))
			require(picker.suspended.is_empty() and picker.completed.is_empty() and not picker.lantern_invited and study.active_story_episode()==null,"load clears all transient visits and invitations")
	study.apply_save_envelope(full_profile); study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
	root.size=Vector2i(1100,760)
	print("STORY_VISITS_PASS:2layouts x6sizes/realui_accept/4controllers/Power2modes/routecancel/manual/visitinvitation/nosave/reload")


# Independent caption oracle: use actual resident indexes/objective, not the UI label.
func guided_caption(study: Node) -> String:
	if study.selected_neighbor>=0 and study.arrived_neighbor!=study.selected_neighbor:
		return "Resume "+String(study.neighbors[study.selected_neighbor].name)
	var obj: Dictionary=study.current_objective()
	if obj.id=="meet": return "Meet "+String(study.neighbors[int(obj.neighbor)].name)
	return "Visit "+String(study.neighbors[posmod(study.selected_neighbor+1,study.neighbors.size())].name)

func verify_guided_walk(study: Node, full: String) -> void:
	var original_size := root.size
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667)]:
			study.apply_save_envelope(full);study.hide_story_card();study.startup_story_pending=false
			study.end_conversation();study.show_mural_panel(false);study.show_music_panel(false)
			study.block_opened=false;study.gathering_layout=layout
			study.visited_neighbors={"bea":true};study.player.position=Vector3(21.18,0,-9.12)
			study.selected_neighbor=-1;study.arrived_neighbor=-1;root.size=size
			study.update_block_ui();study.update_walking_status()
			for f in range(8): await process_frame
			require(study.current_objective().id=="meet" and int(study.current_objective().neighbor)==4,"fresh Bea next marker names Thanh, not array-first Celeste")
			require(study.walk_control.text=="Meet Thanh","primary names nearest unmet resident after Goodbye")
			await phone_accept(study.walk_control)
			require(study.selected_neighbor==4 and not study.current_path.is_empty(),"actual primary acceptance starts the named Thanh route")
			var save: String=JSON.stringify(study.build_save_envelope())
			await phone_accept(study.walk_control)
			var point: Vector3=study.player.position
			var pose: Vector3=study.target
			require(study.current_path.is_empty() and study.walk_control.text=="Resume Thanh","Stop offers same named resident rather than wrapping to Bea")
			require(not study.advance_walk(1.0) and study.player.position==point and study.target==pose,"Stop remains stationary and keeps camera intent")
			require(JSON.stringify(study.build_save_envelope())==save,"Stop writes no progress")
			require(study.walk_control.accessibility_name=="Resume Thanh","accessible Stop/Resume label follows current action")
			await phone_accept(study.walk_control)
			require(study.selected_neighbor==4 and not study.current_path.is_empty(),"real acceptance resumes Thanh rather than Bea")
			study.stop_walking()
			study.choose_next_neighbor(1)
			require(study.selected_neighbor==0,"explicit Next still cycles Thanh to Bea")
			study.choose_next_neighbor(-1)
			require(study.selected_neighbor==4,"explicit Previous still cycles Bea to Thanh")
			study.stop_walking();study.walk_step(Vector2.RIGHT,0.01)
			require(study.selected_neighbor==-1 and study.primary_walk_choice().kind=="meet","manual walking discards stopped neighbor target")
			study.walk_to_neighbor(4);study.stop_walking();study.overview(false)
			require(study.selected_neighbor==-1 and study.primary_walk_choice().kind=="meet","map inspection discards old resident route without resuming it")
			study.follow_player();study.walk_to_neighbor(3);study.stop_walking()
			require(study.walk_control.text=="Resume Dez","explicit chosen resident outranks a different suggested goal")
			study.end_conversation();study.player.position=Vector3(21.18,0,-9.12)
			study.visit_suggested_neighbor()
			require(study.selected_neighbor==4,"suggested hub action agrees with nearest unmet marker")
			study.stop_walking();study.apply_save_envelope(full)
			require(study.primary_walk_choice().kind!="resume","reload boundary clears transient resume target")
	# Existing malformed-path fixture, adapted to an actual resident route.
	study.apply_save_envelope(full);study.hide_story_card();study.startup_story_pending=false
	study.stop_walking();study.player.position=Vector3(study.neighbor_xz(4).x,0,study.neighbor_xz(4).y)
	var cache: Dictionary=study.cell_walkable_cache.duplicate()
	var start: Vector2=study.nearest_walkable_point(study.player_xz())
	var candidate := -1
	for i in range(study.neighbors.size()):
		if not study.segment_walkable(start,study.nearest_walkable_point(study.neighbor_xz(i))): candidate=i;break
	require(candidate>=0,"resident refusal fixture requires actual A-star path, not direct visibility")
	var cell := Vector2i(int(round(start.x/2)),int(round(start.y/2)))
	for dx in range(-1,2):
		for dy in range(-1,2): study.cell_walkable_cache[cell+Vector2i(dx,dy)]=false
	var failed_save: String=JSON.stringify(study.build_save_envelope())
	if candidate>=0:
		require(not study.walk_to_neighbor(candidate) and study.last_astar_expanded_cells==1,"blocked resident route exhausts actual isolated A-star start")
		require(study.primary_walk_choice().kind!="resume" and study.selected_neighbor==-1,"failed resident route never claims resumable travel")
		require(JSON.stringify(study.build_save_envelope())==failed_save,"failed resident route leaves earned progress unchanged")
	study.cell_walkable_cache=cache
	for boundary in ["reset","import"]:
		study.apply_save_envelope(full);study.player.position=study.PLAYER_START
		study.walk_to_neighbor(4);study.stop_walking()
		require(study.primary_walk_choice().kind=="resume","boundary fixture retains a real stopped resident")
		if boundary=="reset": study.reset_mural_state_to_defaults("fresh")
		else: require(study.import_browser_save_json('{"version":1,"core":{"greeted":true}}'),"existing valid legacy fixture imports normally")
		require(study.primary_walk_choice().kind!="resume" and study.current_path.is_empty(),"profile replacement discards old paused resident target")
	# The longest complete destination caption fits compact docks without clipping.
	for size in [Vector2i(520,360),Vector2i(559,360),Vector2i(600,360)]:
		root.size=size;study.apply_save_envelope(full);study.hide_story_card();study.startup_story_pending=false
		study.player.position=study.PLAYER_START;study.walk_to_neighbor(study.celeste_index);study.stop_walking()
		study.show_block_panel(true);study.update_block_ui()
		for f in range(8): await process_frame
		var button: Dictionary=study.walking_control_snapshots()[5]
		require(button.text=="Resume Celeste" and button.text_fits and button.width>=44 and button.height>=44,"complete longest named action fits compact dock at actual font and height")
	root.size=original_size;study.apply_save_envelope(full);study.hide_story_card();study.startup_story_pending=false
	print("GUIDED_WALK_PASS:2layouts x3sizes/realui_accept/nearestgoal/StopResume/explicitcycle/manual/map/hub/reload/nosave")
