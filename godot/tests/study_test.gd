extends SceneTree
var failed := false

func _initialize() -> void:
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
	root.add_child(study)
	await process_frame
	await process_frame
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
	var s_xz: Vector2 = study.speaker_xz()
	require(study.speaker_node != null and study.speaker_cone_mesh != null and study.speaker_beacon_mesh != null, "3D RookSpeaker node, cone, and beacon meshes exist")
	require(study.speaker_node.get_node_or_null("StaticBody3D") != null, "RookSpeaker has StaticBody3D collision")
	require(study.building_containing_point(s_xz) == "", "RookSpeaker is outside all 58 building footprints")
	var s_nb: Dictionary = study.nearest_building_info(s_xz)
	require(s_nb.id == "201006.0004056" and study.min_wall_distance(s_xz) >= 5.5, "RookSpeaker is >= 5.5m clear of nearest measured building 201006.0004056")
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
	require(study.player_xz().distance_to(study.history_stop_xz("blackhawk")) <= study.ARRIVAL_DISTANCE_M + 1e-3, "player arrives within arrival radius of Former Black Hawk Jazz Club at Turk & Hyde")
	require(study.last_a11y_announcement.contains("Black Hawk Jazz Club") and study.last_a11y_announcement.contains("Miles Davis"), "arriving at Black Hawk announces Turk & Hyde narrative history stop")

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
	require(study.civic_complete() and study.civic_phase == "done" and study.is_film_available(), "civic_complete finishes M4 Listening Hour and unlocks M4 Film Short")
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
	require(study.film_capture_shot("welcome") and study.film_captured == ["welcome"] and study.film_next_shot() == "seat", "first ordered shot captures cleanly")
	var key_period := InputEventKey.new()
	key_period.pressed = true
	key_period.keycode = KEY_PERIOD
	study._unhandled_input(key_period)
	study._unhandled_input(key_period)
	require(study.film_phase == "done" and study.film_captured == ["welcome", "seat", "paint"] and study.film_screen_frame == 0, "KEY_PERIOD captures remaining ordered shots and completes The Open Seat")
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
	require(int(perf.get("opening_buildings_count", 0)) == 58 and int(perf.get("wider_buildings_count", 0)) == 130 and int(perf.get("total_buildings_count", 0)) == 188 and int(perf.get("street_ways_count", 0)) == 20 and int(perf.get("wider_street_ways_count", 0)) == 41 and bool(perf.get("district_boundary_present", false)), "measure_local_performance verifies 188 buildings, 20 opening / 41 wider street ways, and cultural district mesh")
	require(int(perf.get("pathfind_blackhawk_waypoints", 0)) >= 2 and bool(perf.get("pathfind_cold_cache", false)) and bool(perf.get("astar_used", false)) and int(perf.get("astar_expanded_cells", 0)) > 0 and int(perf.get("pathfind_blackhawk_usec", 999999)) < 250000, "measure_local_performance verifies cold-cache A* Taylor-to-Hyde pathfinding latency under 250ms")
	require(int(perf.get("save_bytes", 0)) > 0 and int(perf.get("save_bytes", 99999)) <= 4096 and int(perf.get("save_roundtrip_usec", 999999)) < 50000, "measure_local_performance verifies full M1-M4 save payload <= 4096 bytes and roundtrip under 50ms")
	require(bool(perf.get("voices_teardown_measured", false)) and int(perf.get("voices_teardown_usec", 0)) > 0 and int(perf.get("voices_teardown_usec", 999999)) < 50000 and bool(perf.get("within_budget", false)), "measure_local_performance verifies M5 teardown and overall M6 performance budget")

	var decor_node: Node3D = study.get_node_or_null("StreetLifeDecor")
	require(decor_node != null and decor_node.get_node_or_null("DodgeAlleyConcert") != null and decor_node.get_node_or_null("SoWhatEasterEgg") != null, "StreetLifeDecor includes DodgeAlleyConcert and SoWhatEasterEgg 3D nodes")
	var museum_node: Node3D = decor_node.get_node_or_null("TenderloinMuseumHub")
	require(museum_node != null and museum_node.get_node_or_null("ArchiveTimePortal") != null and study.portal_ring_meshes.size() == 3 and study.portal_lens_mesh != null, "TenderloinMuseumHub at 398 Eddy (Cadillac Hotel) includes 3-ring ArchiveTimePortal and PortalLens")
	var eateries_node: Node3D = decor_node.get_node_or_null("NeighborhoodEateries")
	require(eateries_node != null and eateries_node.get_child_count() == 6, "NeighborhoodEateries includes all 6 fictionalized Tenderloin bars and eateries with star ratings")
	require(study.inspect_so_what_easter_egg() and study.info.text.contains("145 Leavenworth") and study.info.text.contains("361 Turk St") and study.info.text.contains("So What"), "inspect_so_what_easter_egg frames 145 Leavenworth 8th Floor & 361 Turk 'So What' awning easter egg")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "present" and study.info.text.contains("398 Eddy St") and study.info.text.contains("Cadillac Hotel"), "first inspect_tenderloin_museum_hub call presents 398 Eddy St Cadillac Hotel museum hub")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "1961_jazz" and study.info.text.contains("1961"), "second inspect_tenderloin_museum_hub call channels 1961 Black Hawk & 'So What' Jazz Era")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "1966_comptons" and study.info.text.contains("1966"), "third inspect_tenderloin_museum_hub call channels 1966 Compton's Cafeteria Midnight Neon")
	require(study.inspect_tenderloin_museum_hub() and study.active_time_era == "1907_cadillac" and study.info.text.contains("1907"), "fourth inspect_tenderloin_museum_hub call channels 1907 Cadillac Hotel & Great White Way")
	require(study.cycle_eatery_guide(0) and study.eatery_guide_idx == 0 and study.info.text.contains("Golden Lotus Pho & Noodle House") and study.info.text.contains("★ 4.8"), "cycle_eatery_guide(0) frames Golden Lotus Pho & Noodle House (★ 4.8)")
	require(study.cycle_eatery_guide() and study.eatery_guide_idx == 1 and study.info.text.contains("Saffron Clay-Oven Naan & Curry") and study.info.text.contains("★ 4.6"), "cycle_eatery_guide() advances to Saffron Clay-Oven Naan & Curry (★ 4.6)")

	# Rooftop details, SF corner turrets, Muni overhead lines & Boeddeker Park
	var roof_counts: Dictionary = study.rooftop_feature_counts
	require(int(roof_counts.get("parapets", 0)) >= 150 and int(roof_counts.get("water_tanks", 0)) >= 10 and int(roof_counts.get("penthouses", 0)) >= 10 and int(roof_counts.get("skylights", 0)) >= 40 and int(roof_counts.get("corner_towers", 0)) >= 6, "rooftop parapets, water tanks, elevator penthouses, skylights, and corner turrets are generated across the 188 footprints")
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
	require(study.inspect_boeddeker_park() and study.info.text.contains("240 Eddy St") and study.info.text.contains("33619301") and study.last_a11y_announcement.contains("Boeddeker Park"), "inspect_boeddeker_park frames and announces Boeddeker Park with OSM provenance")
	study.overview()
	study.inspect_boeddeker_park()
	var park_tap: Vector2 = study.camera.unproject_position(Vector3(study.BOEDDEKER_PARK_ENTRANCE.x, 3.6, study.BOEDDEKER_PARK_ENTRANCE.y))
	require(not study.is_screen_point_in_ui(park_tap), "Boeddeker Park gate label projects outside UI panels when framed")
	study.info.text = ""
	require(study.handle_scene_tap(park_tap) and study.info.text.contains("Boeddeker Park"), "tapping the Boeddeker Park gate label inspects the park")

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
	require(is_equal_approx(study.player_height_m(), study.PLAYER_HEIGHT_M), "animate_person_node preserves exact 1.72m player height")
	var bea_nameplate_screen: Vector2 = study.camera.unproject_position(study.neighbors[0].pos + Vector3(0.0, 4.0, 0.0))
	require(study.handle_scene_tap(bea_nameplate_screen) and study.selected_neighbor == 0, "tapping neighbor upper body / nameplate selects neighbor")
	var bea_line_1: String = study.talk_with_neighbor(0)
	var bea_line_2: String = study.talk_with_neighbor(0)
	require(not bea_line_1.is_empty() and bea_line_1 != bea_line_2 and study.block_panel.visible and study.block_label.text.contains("Talking with Bea") and study.block_detail_label.text.contains("Bea:"), "talk_with_neighbor(0) cycles Bea's natural conversation turns and updates BlockPanel talking header and spoken quote")
	require(study.block_programme_btn.text.contains("Hosted All 4 Events") and study.block_civic_btn.text.contains("Tenant Circle") and study.block_film_btn.text.contains("Watch Film"), "BlockPanel completed action buttons use natural conversational action phrasing")
	study.reset_mural_state_to_defaults("fresh")
	require(study.block_programme_btn.text.contains("Plan Party Schedule") and study.block_civic_btn.text.contains("Hold Tenant Circle") and study.block_film_btn.text.contains("Shoot Short Film"), "BlockPanel fresh action buttons use natural conversational action phrasing")
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
		study.block_opened = false
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
		require(study.music_buttons.size() == 6, "MusicPanel has all 6 interactive buttons")
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
		require(study.block_buttons.size() == 13, "BlockPanel has all 13 interactive buttons")
		var blk_rect: Rect2 = study.block_panel.get_global_rect()
		var blk_header_end_y: float = study.header_panel.get_global_rect().end.y
		var blk_controls_pos_y: float = study.controls.get_global_rect().position.y
		require(blk_rect.position.x >= 0 and blk_rect.end.x <= size.x and blk_header_end_y <= blk_rect.position.y and blk_rect.end.y <= blk_controls_pos_y, "header, BlockPanel, and bottom controls do not overlap at %s" % str(size))
		for blk_btn in study.block_buttons:
			var bkr: Rect2 = blk_btn.get_global_rect()
			require(bkr.size.x >= 44 and bkr.size.y >= 44, "44px minimum block panel buttons")
			require(bkr.position.x >= 0 and bkr.end.x <= size.x and bkr.position.y >= 0 and bkr.end.y <= size.y, "block buttons within viewport")
			require(blk_btn.focus_mode == Control.FOCUS_ALL and blk_btn.has_theme_stylebox_override("focus"), "block buttons have keyboard focus ring stylebox")
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
		study.overview()
	study.clear_godot_save()
	study.clear_godot_settings()
	if "--force-failure" in OS.get_cmdline_user_args():
		require(false, "harness failure sentinel")
	if failed:
		print("GODOT_STUDY_FAIL")
		quit(1)
	else:
		print("GODOT_STUDY_PASS:188 meshes (58 opening + 130 wider), measured heights, collision/courtyards, walking/sliding, 5 neighbors, Celeste portable mural, Rook speaker/music/local-audition, opening-block readiness/banner, wider Tenderloin walk (Compton's Corner + Black Hawk at Turk & Hyde + Transgender Cultural District boundary), M1 keepsake photo & loan returns, M3 afternoon programme & hosting, M4 civic listening hour & three-shot film short (The Open Seat), M5 default-off neighborhood voices & isolated settings, M6 original SVG builders/export & measured local performance, browser-save adapter, save/reload, cutaway, focus-rings, 44px and ui_accept at 1100/390/320")
		quit(0)



