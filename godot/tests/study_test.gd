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

	study.overview()
	var street_screen: Vector2 = study.camera.unproject_position(Vector3(45.0, 0.0, -7.2))
	require(study.handle_scene_tap(street_screen) and study.selected_neighbor == -1, "tapping projected street point in overview starts street route")
	require(not study.current_path.is_empty(), "street tap produces walkable path")

	study.overview()
	require(study.occluded_buildings.is_empty() and study.selected_neighbor == -1 and not study.mural_panel.visible and not study.music_panel.visible and not study.block_panel.visible, "overview clears cutaway, neighbor selection, mural panel, music panel, and block panel")
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
		require(study.block_buttons.size() == 10, "BlockPanel has all 10 interactive buttons")
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
	if "--force-failure" in OS.get_cmdline_user_args():
		require(false, "harness failure sentinel")
	if failed:
		print("GODOT_STUDY_FAIL")
		quit(1)
	else:
		print("GODOT_STUDY_PASS:188 meshes (58 opening + 130 wider), measured heights, collision/courtyards, walking/sliding, 5 neighbors, Celeste portable mural, Rook speaker/music/local-audition, opening-block readiness/banner, wider Tenderloin walk (Compton's Corner + Black Hawk at Turk & Hyde + Transgender Cultural District boundary), M1 keepsake photo & loan returns, M3 afternoon programme & hosting, browser-save adapter, save/reload, cutaway, focus-rings, 44px and ui_accept at 1100/390/320")
		quit(0)



