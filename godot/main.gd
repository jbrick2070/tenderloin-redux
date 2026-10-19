extends Node3D
## Measured-building block with actual-metre walking, footprint/courtyard collision,
## camera sightline cutaway, keyboard/touch neighbor navigation, Celeste's
## portable sidewalk mural board, Rook's soundcheck + procedural/local music,
## opening-block completion validation, opt-in browser-save adapter, and DOM a11y status bridge.
## Real DataSF 2010 PDDL rings and median heights; ODbL OSM street centerlines;
## original neutral materials, flat presentation ground and schematic street widths.

const WALK_SPEED_M_PER_S := 4.8
const PLAYER_HEIGHT_M := 1.72
const PLAYER_RADIUS_M := 0.45
const WALK_CLEARANCE_M := 0.65
const MAX_STREET_CORRIDOR_M := 12.0
const ARRIVAL_DISTANCE_M := 1.35
const CUTAWAY_RADIUS_M := 4.0
const CAMERA_OFFSET := Vector3(180.0, 180.0, 180.0)
const PLAYER_START := Vector3(17.74, 0.0, -9.33)
const MURAL_POS := Vector3(76.50, 0.0, -18.70)
const MURAL_BOARD_COLS := 6
const MURAL_BOARD_ROWS := 3
const CELESTE_ID := "celeste"
const ROOK_ID := "rook"
const ROOK_SPEAKER_POS := Vector3(117.10, 0.0, -15.95)
const BLOCK_BANNER_OFFSET := Vector3(0.0, 0.0, -0.55)
const MURAL_HALF_EXTENTS := Vector2(1.78, 0.18)
const SPEAKER_HALF_EXTENTS := Vector2(0.34, 0.28)
const GODOT_SAVE_PATH := "user://godot_block_save_v1.json"
const GODOT_TEST_SAVE_PATH := "user://godot_block_save_test_v1.json"
const GODOT_WEB_STORAGE_KEY := "tenderloin-redux.godot.save.v1"
const BROWSER_WEB_STORAGE_KEY := "tenderloin-redux.save.v1"
const BROWSER_SAVE_MAX_BYTES := 65536
const BROWSER_FURNITURE_IDS: Array[String] = ["table", "seats", "speaker"]
const BROWSER_LITTER_IDS: Array[String] = ["cup", "offcuts", "wrapper"]
const GODOT_SAVE_VERSION := 1
const MURAL_PALETTES: Array[String] = ["garden", "sunset", "ocean"]
const MURAL_MOTIFS: Array[String] = ["sun", "wave", "rise"]
const MURAL_DEFAULT_CELLS: Dictionary = {
	"sun": Vector2i(1, 0),
	"wave": Vector2i(3, 1),
	"rise": Vector2i(5, 2)
}
const MUSIC_STEM_ORDER: Array[String] = ["bass", "brush", "chords", "lead"]
const MUSIC_VOL_STEPS: Array[float] = [0.70, 1.0, 0.35, 0.0]
const MUSIC_MIX_RATE := 22050.0
const MUSIC_STEP_SEC := 0.375
const MUSIC_MAX_LOCAL_BYTES := 40 * 1024 * 1024
const MUSIC_DECODE_ERROR := "Could not decode audio file. Sketch remains available."
const MUSIC_FILE_ERROR := "Invalid audio file. Choose an MP3, WAV, or OGG track."

var data: Dictionary
var camera: Camera3D
var meshes: Array[MeshInstance3D] = []
var building_rects: Array[Rect2] = []
var building_materials: Array[StandardMaterial3D] = []
var walk_bounds := Rect2(-40.0, -65.0, 210.0, 140.0)
var selected := -1
var info: Label
var target := Vector3(65, 0, -12)
var view_size := 250.0
var wall_material: StandardMaterial3D
var chosen_material: StandardMaterial3D
var cutaway_material: StandardMaterial3D
var controls: GridContainer
var header_panel: PanelContainer
var overview_size := 400.0
var in_overview := true

var player: CharacterBody3D
var player_visual: Node3D
var neighbors: Array[Dictionary] = [
	{"id": "bea", "name": "Bea", "role": "The one with the plan", "pos": Vector3(22.09, 0.0, -10.03), "coat": Color("c5874f"), "skin": Color("966345"), "hair": Color("dad7c6")},
	{"id": "celeste", "name": "Celeste", "role": "Signs, paint & possibility", "pos": Vector3(70.07, 0.0, -17.75), "coat": Color("c87d82"), "skin": Color("8b5b3f"), "hair": Color("383c32")},
	{"id": "rook", "name": "Rook", "role": "Good ears. Better stories.", "pos": Vector3(114.71, 0.0, -14.79), "coat": Color("547a79"), "skin": Color("a97650"), "hair": Color("3f352c")},
	{"id": "dez", "name": "Dez", "role": "Always making a beat", "pos": Vector3(126.74, 0.0, -26.86), "coat": Color("978aaf"), "skin": Color("704b37"), "hair": Color("292f2b")},
	{"id": "thanh", "name": "Thanh", "role": "Neighbor & supply lender", "pos": Vector3(12.85, 0.0, 24.47), "coat": Color("b59b5d"), "skin": Color("c38c65"), "hair": Color("454236")}
]
var neighbor_nodes: Array[Node3D] = []
var celeste_index := 1
var rook_index := 2
var route_mesh: MeshInstance3D
var selected_neighbor := -1
var arrived_neighbor := -1
var walking_to_mural := false
var arrived_mural := false
var pending_celeste_talk := false
var walking_to_speaker := false
var arrived_speaker := false
var pending_rook_talk := false
var current_path: Array[Vector2] = []
var occluded_buildings: Array[int] = []
var following_player := false
var cell_walkable_cache: Dictionary = {}
var last_occlusion_pos := Vector2(INF, INF)
var last_occlusion_neighbor := -2
var last_ribbon_pos := Vector2(INF, INF)
var last_ribbon_count := -1
var pointer_active := false
var pointer_dragging := false
var pointer_down_pos := Vector2.ZERO
var pointer_last_pos := Vector2.ZERO

var mural_node: Node3D
var mural_canvas_mesh: MeshInstance3D
var mural_motif_nodes: Dictionary = {}
var mural_banner_mesh: MeshInstance3D
var mural_panel: PanelContainer
var mural_label: Label
var mural_buttons: Array[Button] = []
var mural_palette_btn: Button
var mural_sun_btn: Button
var mural_wave_btn: Button
var mural_rise_btn: Button
var save_path := GODOT_SAVE_PATH
var save_seq := 0
var celeste_talk_count := 0
var active_motif := "sun"
var mural_palette := "garden"
var mural_placements: Dictionary = {}
var mural_completed := false
var save_load_status := "fresh"

var speaker_node: Node3D
var speaker_cone_mesh: MeshInstance3D
var speaker_beacon_mesh: MeshInstance3D
var rook_soundcheck_done := false
var visited_neighbors: Dictionary = {}
var music_panel: PanelContainer
var music_label: Label
var music_stem_label: Label
var music_buttons: Array[Button] = []
var music_play_btn: Button
var music_vol_btn: Button
var music_rook_btn: Button
var music_load_btn: Button
var music_sketch_btn: Button
var sketch_generator: AudioStreamGenerator
var sketch_playback: AudioStreamGeneratorPlayback
var sketch_player: AudioStreamPlayer
var local_audio_player: AudioStreamPlayer
var music_mode := "sketch"
var music_playing := false
var music_volume := 0.70
var local_music_name := ""
var music_error := ""
var sketch_tick := 0
var sketch_phase := 0.0
var sketch_frames_pushed := 0
var last_pre_gain_rms := 0.0
var last_sample_rms := 0.0
var cue_chime_timer := 0.0
var cue_chime_freq := 523.25
var cue_history: Array[Dictionary] = []
var last_music_cue := "ready"
var unlocked_stem_mask := 1
var cached_mural_tangent := Vector2.ZERO
var cached_mural_normal := Vector2.ZERO
var cached_speaker_tangent := Vector2.ZERO
var cached_speaker_normal := Vector2.ZERO

var block_banner_node: Node3D
var block_opened := false
var block_panel: PanelContainer
var block_label: Label
var block_detail_label: Label
var block_buttons: Array[Button] = []
var block_next_btn: Button
var block_mural_btn: Button
var block_rook_btn: Button
var block_open_btn: Button
var block_import_btn: Button
var browser_import_status := "none"
var browser_import_message := ""
var last_a11y_announcement := ""
var a11y_announcement_seq := 0
var last_synced_a11y_json := ""
var button_focus_style: StyleBoxFlat

func _ready() -> void:
	save_path = resolve_save_path()
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/buildings.json"))
	if not parsed is Dictionary or not parsed.has("buildings") or parsed.buildings.is_empty():
		set_physics_process(false)
		set_process_unhandled_input(false)
		push_error("Missing/invalid city geometry. Run node scripts/build-godot-data.mjs.")
		return
	data = parsed
	wall_material = material(Color("c4b6a1"))
	chosen_material = material(Color("75bbb2"))
	cutaway_material = translucent_material(Color(0.77, 0.71, 0.63, 0.28))
	var palette: Array[Color] = [
		Color("c4b6a1"),
		Color("ccb89e"),
		Color("b8afa0"),
		Color("c9ab97")
	]
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("172a2e")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("e9e1cf")
	env.ambient_light_energy = 0.65
	environment.environment = env
	add_child(environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -25, 0)
	sun.light_energy = 1.2
	add_child(sun)
	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(520, 420)
	ground.mesh = plane
	ground.material_override = material(Color("566a63"))
	ground.position = Vector3(60, -0.1, -12)
	add_child(ground)
	build_streets()
	for idx in range(data.buildings.size()):
		var building: Dictionary = data.buildings[idx]
		var surface := SurfaceTool.new()
		surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		surface.set_smooth_group(-1)
		var wall_faces := PackedVector3Array()
		var h: float = building.height_m
		var b_rect := Rect2()
		var has_rect := false
		for polygon in building.polygons:
			for ring in polygon.rings:
				for i in range(ring.size()):
					var p0: Array = ring[i]
					var v2 := Vector2(p0[0], p0[1])
					if not has_rect:
						b_rect = Rect2(v2, Vector2.ZERO)
						has_rect = true
					else:
						b_rect = b_rect.expand(v2)
					var a := point(p0, 0)
					var b := point(ring[(i + 1) % ring.size()], 0)
					var bu := b + Vector3.UP * h
					var au := a + Vector3.UP * h
					triangle(surface, a, b, bu)
					triangle(surface, a, bu, au)
					wall_faces.append_array([a, b, bu, a, bu, au])
			for i in range(0, polygon.triangles.size(), 3):
				triangle(surface, point(polygon.vertices[polygon.triangles[i]], h),
					point(polygon.vertices[polygon.triangles[i + 1]], h),
					point(polygon.vertices[polygon.triangles[i + 2]], h))
		surface.generate_normals()
		var building_mesh := MeshInstance3D.new()
		building_mesh.name = building.id
		building_mesh.mesh = surface.commit()
		var b_mat := material(palette[idx % palette.size()])
		building_materials.append(b_mat)
		building_mesh.material_override = b_mat
		var body := StaticBody3D.new()
		body.name = "StaticBody3D"
		var col := CollisionShape3D.new()
		var concave := ConcavePolygonShape3D.new()
		concave.set_faces(wall_faces)
		col.shape = concave
		body.add_child(col)
		building_mesh.add_child(body)
		add_child(building_mesh)
		meshes.append(building_mesh)
		building_rects.append(b_rect)
	if not building_rects.is_empty():
		var b_union := building_rects[0]
		for br in building_rects:
			b_union = b_union.merge(br)
		walk_bounds = b_union.grow(12.0)
	build_neighbors_and_player()
	build_mural_board()
	build_rook_speaker()
	build_block_banner()
	build_audio_players()
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.far = 2000
	add_child(camera)
	camera.current = true
	update_camera()
	make_ui()
	setup_web_audio_bridge()
	setup_web_a11y_bridge()
	load_godot_state()
	await get_tree().process_frame
	await get_tree().process_frame
	overview()
	# Headless parser/import tests don't pretend to render a screenshot.
	if "--capture" in OS.get_cmdline_user_args():
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path("res://").path_join("../artifacts/godot-massing.png"))
		get_tree().quit()

func build_streets() -> void:
	for street in data.streets:
		var sidewalk := SurfaceTool.new()
		sidewalk.begin(Mesh.PRIMITIVE_TRIANGLES)
		var road_surface := SurfaceTool.new()
		road_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		var stripe_surface := SurfaceTool.new()
		stripe_surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		for i in range(street.points.size() - 1):
			var a_sw := point(street.points[i], 0.01)
			var b_sw := point(street.points[i + 1], 0.01)
			var dir := (b_sw - a_sw).normalized()
			var across_sw := dir.cross(Vector3.UP) * 8.2
			triangle(sidewalk, a_sw - across_sw, b_sw - across_sw, b_sw + across_sw)
			triangle(sidewalk, a_sw - across_sw, b_sw + across_sw, a_sw + across_sw)
			var a := point(street.points[i], 0.025)
			var b := point(street.points[i + 1], 0.025)
			var across := dir.cross(Vector3.UP) * 5.0
			triangle(road_surface, a - across, b - across, b + across)
			triangle(road_surface, a - across, b + across, a + across)
			var a_st := point(street.points[i], 0.035)
			var b_st := point(street.points[i + 1], 0.035)
			var across_st := dir.cross(Vector3.UP) * 0.16
			triangle(stripe_surface, a_st - across_st, b_st - across_st, b_st + across_st)
			triangle(stripe_surface, a_st - across_st, b_st + across_st, a_st + across_st)
		sidewalk.generate_normals()
		var sw_mesh := MeshInstance3D.new()
		sw_mesh.mesh = sidewalk.commit()
		sw_mesh.material_override = material(Color("7d7a6e"))
		add_child(sw_mesh)
		road_surface.generate_normals()
		var road := MeshInstance3D.new()
		road.mesh = road_surface.commit()
		road.material_override = material(Color("263e43"))
		add_child(road)
		stripe_surface.generate_normals()
		var stripe := MeshInstance3D.new()
		stripe.mesh = stripe_surface.commit()
		stripe.material_override = material(Color("cbbd9d"))
		add_child(stripe)

func build_neighbors_and_player() -> void:
	route_mesh = MeshInstance3D.new()
	route_mesh.name = "RouteRibbon"
	route_mesh.material_override = material(Color("f5d57a"))
	add_child(route_mesh)
	for i in range(neighbors.size()):
		var n: Dictionary = neighbors[i]
		var n_id := String(n.get("id", ""))
		if n_id == CELESTE_ID:
			celeste_index = i
		elif n_id == ROOK_ID:
			rook_index = i
		var n_node := make_person_node(n.name, n.coat, n.skin, n.hair, 1.70, false)
		n_node.position = n.pos
		add_child(n_node)
		neighbor_nodes.append(n_node)
	player = CharacterBody3D.new()
	player.name = "Player"
	player.position = PLAYER_START
	var col := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = PLAYER_RADIUS_M
	shape.height = PLAYER_HEIGHT_M
	col.shape = shape
	col.position = Vector3(0.0, PLAYER_HEIGHT_M * 0.5, 0.0)
	player.add_child(col)
	player_visual = make_person_node("PlayerVisual", Color("f0ce77"), Color("b67f5d"), Color("34392f"), PLAYER_HEIGHT_M, true)
	player.add_child(player_visual)
	add_child(player)

func mural_material(color: Color) -> StandardMaterial3D:
	var result := material(color)
	result.emission_enabled = true
	result.emission = color
	result.emission_energy_multiplier = 0.35
	return result

func build_mural_board() -> void:
	mural_node = Node3D.new()
	mural_node.name = "MuralBoard"
	mural_node.position = MURAL_POS
	var street_t := mural_tangent()
	mural_node.rotation.y = atan2(-street_t.y, street_t.x)
	var board_body := StaticBody3D.new()
	board_body.name = "StaticBody3D"
	var board_col := CollisionShape3D.new()
	var board_shape := BoxShape3D.new()
	board_shape.size = Vector3(3.56, 2.66, 0.36)
	board_col.shape = board_shape
	board_col.position = Vector3(0.0, 1.33, 0.0)
	board_body.add_child(board_col)
	mural_node.add_child(board_body)
	var base_ring := MeshInstance3D.new()
	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 0.85
	ring_mesh.bottom_radius = 0.85
	ring_mesh.height = 0.04
	base_ring.mesh = ring_mesh
	base_ring.position = Vector3(0.0, 0.02, 0.0)
	base_ring.material_override = material(Color("e6d7b8"))
	mural_node.add_child(base_ring)
	for leg_x in [-1.45, 1.45]:
		var leg := MeshInstance3D.new()
		var leg_mesh := BoxMesh.new()
		leg_mesh.size = Vector3(0.16, 2.55, 0.18)
		leg.mesh = leg_mesh
		leg.position = Vector3(leg_x, 1.275, -0.05)
		leg.material_override = material(Color("6d4f38"))
		mural_node.add_child(leg)
	var frame := MeshInstance3D.new()
	var frame_mesh := BoxMesh.new()
	frame_mesh.size = Vector3(3.56, 1.92, 0.14)
	frame.mesh = frame_mesh
	frame.position = Vector3(0.0, 1.56, -0.05)
	frame.material_override = material(Color("5a402d"))
	mural_node.add_child(frame)
	mural_canvas_mesh = MeshInstance3D.new()
	mural_canvas_mesh.name = "MuralCanvas"
	var canvas_box := BoxMesh.new()
	canvas_box.size = Vector3(3.28, 1.66, 0.08)
	mural_canvas_mesh.mesh = canvas_box
	mural_canvas_mesh.position = Vector3(0.0, 1.56, 0.04)
	mural_node.add_child(mural_canvas_mesh)
	mural_banner_mesh = MeshInstance3D.new()
	mural_banner_mesh.name = "MuralCompletionBanner"
	var banner_box := BoxMesh.new()
	banner_box.size = Vector3(3.48, 0.24, 0.18)
	mural_banner_mesh.mesh = banner_box
	mural_banner_mesh.position = Vector3(0.0, 2.66, 0.0)
	mural_banner_mesh.material_override = mural_material(Color("f5d57a"))
	mural_banner_mesh.visible = false
	mural_node.add_child(mural_banner_mesh)
	mural_motif_nodes.clear()
	var sun_node := Node3D.new()
	sun_node.name = "MotifSun"
	var sun_disc := MeshInstance3D.new()
	var disc_mesh := CylinderMesh.new()
	disc_mesh.top_radius = 0.22
	disc_mesh.bottom_radius = 0.22
	disc_mesh.height = 0.08
	sun_disc.mesh = disc_mesh
	sun_disc.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	sun_disc.material_override = mural_material(Color("f8cc58"))
	sun_node.add_child(sun_disc)
	for ray_size in [Vector3(0.52, 0.10, 0.06), Vector3(0.10, 0.52, 0.06)]:
		var ray := MeshInstance3D.new()
		var ray_mesh := BoxMesh.new()
		ray_mesh.size = ray_size
		ray.mesh = ray_mesh
		ray.material_override = mural_material(Color("fff3b0"))
		sun_node.add_child(ray)
	sun_node.visible = false
	mural_node.add_child(sun_node)
	mural_motif_nodes["sun"] = sun_node
	var wave_node := Node3D.new()
	wave_node.name = "MotifWave"
	for w_idx in range(3):
		var bar := MeshInstance3D.new()
		var bar_mesh := BoxMesh.new()
		bar_mesh.size = Vector3(0.48, 0.10, 0.08)
		bar.mesh = bar_mesh
		bar.position = Vector3((float(w_idx) - 1.0) * 0.05, (float(w_idx) - 1.0) * 0.13, 0.0)
		bar.material_override = mural_material(Color("5fd4ba") if w_idx != 1 else Color("9ef5e5"))
		wave_node.add_child(bar)
	wave_node.visible = false
	mural_node.add_child(wave_node)
	mural_motif_nodes["wave"] = wave_node
	var rise_node := Node3D.new()
	rise_node.name = "MotifRise"
	for r_idx in range(3):
		var step_mesh_inst := MeshInstance3D.new()
		var step_box := BoxMesh.new()
		var sh := 0.18 + float(r_idx) * 0.11
		step_box.size = Vector3(0.13, sh, 0.08)
		step_mesh_inst.mesh = step_box
		step_mesh_inst.position = Vector3((float(r_idx) - 1.0) * 0.15, -0.20 + sh * 0.5, 0.0)
		step_mesh_inst.material_override = mural_material(Color("ee835c") if r_idx < 2 else Color("ffb585"))
		rise_node.add_child(step_mesh_inst)
	rise_node.visible = false
	mural_node.add_child(rise_node)
	mural_motif_nodes["rise"] = rise_node
	add_child(mural_node)
	update_mural_3d()

func build_rook_speaker() -> void:
	speaker_node = Node3D.new()
	speaker_node.name = "RookSpeaker"
	speaker_node.position = ROOK_SPEAKER_POS
	var street_t := speaker_tangent()
	speaker_node.rotation.y = atan2(-street_t.y, street_t.x)
	var spk_body := StaticBody3D.new()
	spk_body.name = "StaticBody3D"
	var spk_col := CollisionShape3D.new()
	var spk_shape := BoxShape3D.new()
	spk_shape.size = Vector3(SPEAKER_HALF_EXTENTS.x * 2.0, 1.38, SPEAKER_HALF_EXTENTS.y * 2.0)
	spk_col.shape = spk_shape
	spk_col.position = Vector3(0.0, 0.69, 0.0)
	spk_body.add_child(spk_col)
	speaker_node.add_child(spk_body)
	var base_ring := MeshInstance3D.new()
	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 0.50
	ring_mesh.bottom_radius = 0.50
	ring_mesh.height = 0.04
	base_ring.mesh = ring_mesh
	base_ring.position = Vector3(0.0, 0.02, 0.0)
	base_ring.material_override = material(Color("e6d7b8"))
	speaker_node.add_child(base_ring)
	var cabinet := MeshInstance3D.new()
	cabinet.name = "SpeakerCabinet"
	var cab_mesh := BoxMesh.new()
	cab_mesh.size = Vector3(SPEAKER_HALF_EXTENTS.x * 2.0, 1.18, SPEAKER_HALF_EXTENTS.y * 2.0)
	cabinet.mesh = cab_mesh
	cabinet.position = Vector3(0.0, 0.61, 0.0)
	cabinet.material_override = material(Color("3a322c"))
	speaker_node.add_child(cabinet)
	speaker_cone_mesh = MeshInstance3D.new()
	speaker_cone_mesh.name = "SpeakerCone"
	var cone_cyl := CylinderMesh.new()
	cone_cyl.top_radius = 0.21
	cone_cyl.bottom_radius = 0.21
	cone_cyl.height = 0.06
	speaker_cone_mesh.mesh = cone_cyl
	speaker_cone_mesh.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	speaker_cone_mesh.position = Vector3(0.0, 0.72, 0.29)
	speaker_node.add_child(speaker_cone_mesh)
	speaker_beacon_mesh = MeshInstance3D.new()
	speaker_beacon_mesh.name = "SpeakerBeacon"
	var beacon_box := BoxMesh.new()
	beacon_box.size = Vector3(0.56, 0.16, 0.22)
	speaker_beacon_mesh.mesh = beacon_box
	speaker_beacon_mesh.position = Vector3(0.0, 1.30, 0.0)
	speaker_node.add_child(speaker_beacon_mesh)
	add_child(speaker_node)
	update_speaker_3d()

func update_speaker_3d() -> void:
	if speaker_cone_mesh != null:
		if music_playing:
			speaker_cone_mesh.material_override = mural_material(Color("f5d57a") if music_mode == "sketch" else Color("5fd4ba"))
		elif rook_soundcheck_done:
			speaker_cone_mesh.material_override = mural_material(Color("d6a85a"))
		else:
			speaker_cone_mesh.material_override = material(Color("7d7264"))
	if speaker_beacon_mesh != null:
		speaker_beacon_mesh.visible = music_playing or rook_soundcheck_done
		if music_playing:
			speaker_beacon_mesh.material_override = mural_material(Color("5fd4ba") if music_mode == "local" else Color("f8cc58"))
		else:
			speaker_beacon_mesh.material_override = mural_material(Color("e8b95a"))

func build_block_banner() -> void:
	block_banner_node = Node3D.new()
	block_banner_node.name = "BlockGatheringBanner"
	var banner_pos: Vector3 = neighbors[0].pos + BLOCK_BANNER_OFFSET
	block_banner_node.position = banner_pos
	var st := nearest_street_tangent(Vector2(banner_pos.x, banner_pos.z))
	var street_t := -st if st.x < 0.0 else st
	block_banner_node.rotation.y = atan2(-street_t.y, street_t.x)
	var arch_beam := MeshInstance3D.new()
	arch_beam.name = "ArchBeam"
	var beam_box := BoxMesh.new()
	beam_box.size = Vector3(2.80, 0.24, 0.18)
	arch_beam.mesh = beam_box
	arch_beam.position = Vector3(0.0, 2.55, 0.0)
	arch_beam.material_override = mural_material(Color("f5d57a"))
	block_banner_node.add_child(arch_beam)
	var lantern_colors: Array[Color] = [Color("ee835c"), Color("5fd4ba"), Color("f8cc58")]
	for i in range(3):
		var lantern := MeshInstance3D.new()
		lantern.name = "GatheringLantern%d" % i
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.16
		cyl.bottom_radius = 0.16
		cyl.height = 0.24
		lantern.mesh = cyl
		lantern.position = Vector3((float(i) - 1.0) * 0.95, 2.28, 0.0)
		lantern.material_override = mural_material(lantern_colors[i])
		block_banner_node.add_child(lantern)
	block_banner_node.visible = false
	add_child(block_banner_node)
	update_block_3d()

func update_block_3d() -> void:
	if block_banner_node != null:
		block_banner_node.visible = block_opened

func build_audio_players() -> void:
	sketch_generator = AudioStreamGenerator.new()
	sketch_generator.mix_rate = MUSIC_MIX_RATE
	sketch_generator.buffer_length = 0.25
	sketch_player = AudioStreamPlayer.new()
	sketch_player.name = "SketchAudioPlayer"
	sketch_player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	sketch_player.stream = sketch_generator
	add_child(sketch_player)
	local_audio_player = AudioStreamPlayer.new()
	local_audio_player.name = "LocalAudioPlayer"
	local_audio_player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	add_child(local_audio_player)
	apply_music_volume_db()
	recompute_music_stems()

func mural_palette_color(palette_id: String, completed: bool) -> Color:
	match palette_id:
		"sunset":
			return Color("8c495e") if completed else Color("6c3949")
		"ocean":
			return Color("366f94") if completed else Color("295572")
		_:
			return Color("3f7a66") if completed else Color("316050")

func update_mural_3d() -> void:
	mural_completed = mural_placements.size() == MURAL_MOTIFS.size()
	if mural_canvas_mesh != null:
		mural_canvas_mesh.material_override = mural_material(mural_palette_color(mural_palette, mural_completed))
	for motif_id in MURAL_MOTIFS:
		if not mural_motif_nodes.has(motif_id):
			continue
		var m_node: Node3D = mural_motif_nodes[motif_id]
		if mural_placements.has(motif_id):
			var cell: Dictionary = mural_placements[motif_id]
			var c: int = int(cell.get("col", 0))
			var r: int = int(cell.get("row", 0))
			m_node.visible = true
			m_node.position = Vector3(-1.28 + float(c) * 0.51, 1.98 - float(r) * 0.43, 0.11)
		else:
			m_node.visible = false
	if mural_banner_mesh != null:
		mural_banner_mesh.visible = mural_completed
	update_block_3d()
	recompute_music_stems()
	update_block_ui()

func make_person_node(node_name: String, coat: Color, skin: Color, hair: Color, total_height: float, is_player: bool) -> Node3D:
	var root_node := Node3D.new()
	root_node.name = node_name
	var ring := MeshInstance3D.new()
	var ring_mesh := CylinderMesh.new()
	ring_mesh.top_radius = 0.62 if is_player else 0.52
	ring_mesh.bottom_radius = ring_mesh.top_radius
	ring_mesh.height = 0.04
	ring.mesh = ring_mesh
	ring.position = Vector3(0.0, 0.02, 0.0)
	ring.material_override = material(Color("f8f0d5") if is_player else Color("d6cbb5"))
	root_node.add_child(ring)
	var legs := MeshInstance3D.new()
	var legs_mesh := BoxMesh.new()
	var legs_h := total_height * 0.42
	legs_mesh.size = Vector3(0.42, legs_h, 0.28)
	legs.mesh = legs_mesh
	legs.position = Vector3(0.0, legs_h * 0.5, 0.0)
	legs.material_override = material(Color("34463f"))
	root_node.add_child(legs)
	var torso := MeshInstance3D.new()
	var torso_mesh := BoxMesh.new()
	var torso_h := total_height * 0.36
	torso_mesh.size = Vector3(0.54, torso_h, 0.34)
	torso.mesh = torso_mesh
	torso.position = Vector3(0.0, legs_h + torso_h * 0.5, 0.0)
	torso.material_override = material(coat)
	root_node.add_child(torso)
	var head := MeshInstance3D.new()
	var head_mesh := BoxMesh.new()
	var head_h := total_height * 0.16
	head_mesh.size = Vector3(0.34, head_h, 0.34)
	head.mesh = head_mesh
	head.position = Vector3(0.0, legs_h + torso_h + head_h * 0.5, 0.0)
	head.material_override = material(skin)
	root_node.add_child(head)
	var cap := MeshInstance3D.new()
	var cap_mesh := BoxMesh.new()
	var cap_h := total_height - (legs_h + torso_h + head_h)
	cap_mesh.size = Vector3(0.36, cap_h, 0.36)
	cap.mesh = cap_mesh
	cap.position = Vector3(0.0, total_height - cap_h * 0.5, 0.0)
	cap.material_override = material(hair)
	root_node.add_child(cap)
	return root_node

func player_height_m() -> float:
	var min_y := INF
	var max_y := -INF
	for child in player_visual.get_children():
		if child is MeshInstance3D:
			var aabb: AABB = child.get_aabb()
			min_y = minf(min_y, child.position.y + aabb.position.y)
			max_y = maxf(max_y, child.position.y + aabb.end.y)
	return max_y - minf(0.0, min_y)

func player_xz() -> Vector2:
	return Vector2(player.position.x, player.position.z)

func neighbor_xz(index: int) -> Vector2:
	var p: Vector3 = neighbors[index].pos
	return Vector2(p.x, p.z)

func mural_xz() -> Vector2:
	return Vector2(MURAL_POS.x, MURAL_POS.z)

func mural_tangent() -> Vector2:
	if cached_mural_tangent.length_squared() < 1e-4:
		var st := nearest_street_tangent(mural_xz())
		cached_mural_tangent = -st if st.x < 0.0 else st
	return cached_mural_tangent

func mural_normal() -> Vector2:
	if cached_mural_normal.length_squared() < 1e-4:
		var t := mural_tangent()
		cached_mural_normal = Vector2(-t.y, t.x)
	return cached_mural_normal

func mural_stand_xz() -> Vector2:
	return mural_xz() + mural_normal() * 1.45

func mural_corner_points() -> Array[Vector2]:
	var c := mural_xz()
	var t := mural_tangent()
	var n := mural_normal()
	var corners: Array[Vector2] = []
	for sx in [-MURAL_HALF_EXTENTS.x, MURAL_HALF_EXTENTS.x]:
		for sz in [-MURAL_HALF_EXTENTS.y, MURAL_HALF_EXTENTS.y]:
			corners.append(c + t * sx + n * sz)
	return corners

func is_point_in_mural_footprint(pt: Vector2, clearance: float = PLAYER_RADIUS_M) -> bool:
	var rel := pt - mural_xz()
	var lx := absf(rel.dot(mural_tangent()))
	var lz := absf(rel.dot(mural_normal()))
	return lx < (MURAL_HALF_EXTENTS.x + clearance) and lz < (MURAL_HALF_EXTENTS.y + clearance)

func speaker_xz() -> Vector2:
	return Vector2(ROOK_SPEAKER_POS.x, ROOK_SPEAKER_POS.z)

func speaker_tangent() -> Vector2:
	if cached_speaker_tangent.length_squared() < 1e-4:
		var st := nearest_street_tangent(speaker_xz())
		cached_speaker_tangent = -st if st.x < 0.0 else st
	return cached_speaker_tangent

func speaker_normal() -> Vector2:
	if cached_speaker_normal.length_squared() < 1e-4:
		var t := speaker_tangent()
		cached_speaker_normal = Vector2(-t.y, t.x)
	return cached_speaker_normal

func speaker_stand_xz() -> Vector2:
	return speaker_xz() + speaker_normal() * 1.25

func speaker_corner_points() -> Array[Vector2]:
	var c := speaker_xz()
	var t := speaker_tangent()
	var n := speaker_normal()
	var corners: Array[Vector2] = []
	for sx in [-SPEAKER_HALF_EXTENTS.x, SPEAKER_HALF_EXTENTS.x]:
		for sz in [-SPEAKER_HALF_EXTENTS.y, SPEAKER_HALF_EXTENTS.y]:
			corners.append(c + t * sx + n * sz)
	return corners

func is_point_in_speaker_footprint(pt: Vector2, clearance: float = PLAYER_RADIUS_M) -> bool:
	var rel := pt - speaker_xz()
	var lx := absf(rel.dot(speaker_tangent()))
	var lz := absf(rel.dot(speaker_normal()))
	return lx < (SPEAKER_HALF_EXTENTS.x + clearance) and lz < (SPEAKER_HALF_EXTENTS.y + clearance)

func material(color: Color) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.roughness = 1.0
	result.cull_mode = BaseMaterial3D.CULL_DISABLED
	return result

func translucent_material(color: Color) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.roughness = 1.0
	result.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	result.cull_mode = BaseMaterial3D.CULL_DISABLED
	return result

func point(p: Array, height: float) -> Vector3:
	return Vector3(p[0], height, p[1])

func triangle(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	surface.add_vertex(a)
	surface.add_vertex(b)
	surface.add_vertex(c)

func is_point_in_ring(pt: Vector2, ring: Array) -> bool:
	var inside := false
	var count := ring.size()
	var j := count - 1
	for i in range(count):
		var xi: float = ring[i][0]
		var zi: float = ring[i][1]
		var xj: float = ring[j][0]
		var zj: float = ring[j][1]
		var dy := zj - zi
		if absf(dy) < 1e-12:
			dy = 1e-12
		var intersect := ((zi > pt.y) != (zj > pt.y)) and (pt.x < (xj - xi) * (pt.y - zi) / dy + xi)
		if intersect:
			inside = not inside
		j = i
	return inside

func is_point_in_building_polygon(pt: Vector2, polygon: Dictionary) -> bool:
	var rings: Array = polygon.rings
	if rings.is_empty() or not is_point_in_ring(pt, rings[0]):
		return false
	for r in range(1, rings.size()):
		if is_point_in_ring(pt, rings[r]):
			return false
	return true

func building_containing_point(pt: Vector2) -> String:
	for idx in range(data.buildings.size()):
		if not building_rects[idx].has_point(pt):
			continue
		var b: Dictionary = data.buildings[idx]
		for polygon in b.polygons:
			if is_point_in_building_polygon(pt, polygon):
				return b.id
	return ""

func dist_to_segment_2d(pt: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var denom := ab.length_squared()
	var t := 0.0 if denom < 1e-12 else clampf((pt - a).dot(ab) / denom, 0.0, 1.0)
	return pt.distance_to(a + ab * t)

func rect_distance_2d(rect: Rect2, pt: Vector2) -> float:
	var cx := clampf(pt.x, rect.position.x, rect.end.x)
	var cy := clampf(pt.y, rect.position.y, rect.end.y)
	return pt.distance_to(Vector2(cx, cy))

func min_wall_distance(pt: Vector2) -> float:
	var best := INF
	for idx in range(data.buildings.size()):
		if rect_distance_2d(building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = data.buildings[idx]
		for polygon in b.polygons:
			for ring in polygon.rings:
				var r_size: int = ring.size()
				for i in range(r_size):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % r_size]
					var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
					if d < best:
						best = d
	return best

func nearest_building_info(pt: Vector2) -> Dictionary:
	var best := INF
	var best_id := ""
	var best_tangent := Vector2(1.0, 0.0)
	for idx in range(data.buildings.size()):
		if rect_distance_2d(building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = data.buildings[idx]
		for polygon in b.polygons:
			for ring in polygon.rings:
				var r_size: int = ring.size()
				for i in range(r_size):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % r_size]
					var va := Vector2(p0[0], p0[1])
					var vb := Vector2(p1[0], p1[1])
					var d := dist_to_segment_2d(pt, va, vb)
					if d < best:
						best = d
						best_id = b.id
						var seg := vb - va
						if seg.length_squared() > 1e-9:
							best_tangent = seg.normalized()
	return {"id": best_id, "distance": best, "tangent": best_tangent}

func min_street_distance(pt: Vector2) -> float:
	var best := INF
	for street in data.streets:
		var pts: Array = street.points
		for i in range(1, pts.size()):
			var p0: Array = pts[i - 1]
			var p1: Array = pts[i]
			var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
			if d < best:
				best = d
	return best

func nearest_street_tangent(pt: Vector2) -> Vector2:
	var best := INF
	var best_tangent := Vector2(1.0, 0.0)
	for street in data.streets:
		var pts: Array = street.points
		for i in range(1, pts.size()):
			var p0: Array = pts[i - 1]
			var p1: Array = pts[i]
			var va := Vector2(p0[0], p0[1])
			var vb := Vector2(p1[0], p1[1])
			var d := dist_to_segment_2d(pt, va, vb)
			if d < best:
				best = d
				var seg := vb - va
				if seg.length_squared() > 1e-9:
					best_tangent = seg.normalized()
	return best_tangent

func is_walkable_point(pt: Vector2, clearance: float = WALK_CLEARANCE_M) -> bool:
	if not walk_bounds.has_point(pt):
		return false
	if min_street_distance(pt) > MAX_STREET_CORRIDOR_M:
		return false
	if building_containing_point(pt) != "":
		return false
	if is_point_in_mural_footprint(pt, PLAYER_RADIUS_M):
		return false
	if is_point_in_speaker_footprint(pt, PLAYER_RADIUS_M):
		return false
	if min_wall_distance(pt) < clearance:
		return false
	return true

func segment_walkable(a: Vector2, b: Vector2, clearance: float = WALK_CLEARANCE_M) -> bool:
	var dist := a.distance_to(b)
	var steps := maxi(1, int(ceil(dist / 0.20)))
	for i in range(steps + 1):
		var t := float(i) / float(steps)
		if not is_walkable_point(a.lerp(b, t), clearance):
			return false
	return true

func nearest_walkable_point(pt: Vector2, clearance: float = WALK_CLEARANCE_M) -> Vector2:
	var clamped := Vector2(
		clampf(pt.x, walk_bounds.position.x + 0.5, walk_bounds.end.x - 0.5),
		clampf(pt.y, walk_bounds.position.y + 0.5, walk_bounds.end.y - 0.5)
	)
	if is_walkable_point(clamped, clearance):
		return clamped
	var radii: Array[float] = [1.0, 2.0, 3.5, 5.0, 7.5, 10.0, 14.0, 20.0, 28.0]
	for radius in radii:
		var best_pt := clamped
		var best_d := INF
		var samples := 24
		for i in range(samples):
			var ang := TAU * float(i) / float(samples)
			var cand: Vector2 = clamped + Vector2(cos(ang), sin(ang)) * radius
			if is_walkable_point(cand, clearance):
				var d := pt.distance_to(cand)
				if d < best_d:
					best_d = d
					best_pt = cand
		if best_d < INF:
			return best_pt
	return Vector2(PLAYER_START.x, PLAYER_START.z)

func find_path(start_xz: Vector2, goal_xz: Vector2) -> Array[Vector2]:
	var safe_goal := nearest_walkable_point(goal_xz, WALK_CLEARANCE_M)
	var safe_start := nearest_walkable_point(start_xz, WALK_CLEARANCE_M)
	if safe_start.distance_to(safe_goal) < 0.05:
		return [safe_goal]
	if segment_walkable(safe_start, safe_goal):
		return [safe_start, safe_goal]
	var step := 2.0
	var max_cells := int(ceil(walk_bounds.size.x / step) * ceil(walk_bounds.size.y / step)) + 500
	var snap_pt := func(p: Vector2) -> Vector2i:
		return Vector2i(int(round(p.x / step)), int(round(p.y / step)))
	var cell_to_world := func(c: Vector2i) -> Vector2:
		return Vector2(float(c.x) * step, float(c.y) * step)
	var is_cell_passable := func(c: Vector2i) -> bool:
		if not cell_walkable_cache.has(c):
			cell_walkable_cache[c] = is_walkable_point(cell_to_world.call(c), WALK_CLEARANCE_M + 0.15)
		return cell_walkable_cache[c]
	var s_cell: Vector2i = snap_pt.call(safe_start)
	var g_cell: Vector2i = snap_pt.call(safe_goal)
	var dirs: Array[Vector2i] = [
		Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1),
		Vector2i(1, 1), Vector2i(1, -1), Vector2i(-1, 1), Vector2i(-1, -1)
	]
	if not is_cell_passable.call(s_cell):
		for d in dirs:
			if is_cell_passable.call(s_cell + d):
				s_cell = s_cell + d
				break
	if not is_cell_passable.call(g_cell):
		for d in dirs:
			if is_cell_passable.call(g_cell + d):
				g_cell = g_cell + d
				break
	var queue: Array[Vector2i] = [s_cell]
	var parent: Dictionary = {s_cell: null}
	var found := false
	var reached_cell := s_cell
	var head := 0
	while head < queue.size() and head < max_cells:
		var cur: Vector2i = queue[head]
		head += 1
		if cur.distance_to(g_cell) <= 1.5 and segment_walkable(cell_to_world.call(cur), safe_goal):
			reached_cell = cur
			found = true
			break
		for d in dirs:
			var nxt: Vector2i = cur + d
			if not parent.has(nxt) and is_cell_passable.call(nxt):
				if d.x != 0 and d.y != 0:
					if not is_cell_passable.call(Vector2i(cur.x + d.x, cur.y)) or not is_cell_passable.call(Vector2i(cur.x, cur.y + d.y)):
						continue
				parent[nxt] = cur
				queue.append(nxt)
	if not found:
		return []
	var raw: Array[Vector2] = [safe_goal]
	var cursor: Variant = reached_cell
	while cursor != null:
		raw.push_front(cell_to_world.call(cursor))
		cursor = parent[cursor]
	raw[0] = safe_start
	var smooth: Array[Vector2] = [raw[0]]
	var idx := 0
	while idx < raw.size() - 1:
		var next_idx := idx + 1
		for probe in range(raw.size() - 1, idx + 1, -1):
			if segment_walkable(raw[idx], raw[probe]):
				next_idx = probe
				break
		smooth.append(raw[next_idx])
		idx = next_idx
	return smooth

func update_route_ribbon(force: bool = false) -> void:
	if current_path.is_empty():
		route_mesh.mesh = null
		last_ribbon_count = 0
		return
	var p_xz := player_xz()
	if not force and last_ribbon_count == current_path.size() and p_xz.distance_to(last_ribbon_pos) < 0.35:
		return
	last_ribbon_pos = p_xz
	last_ribbon_count = current_path.size()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array[Vector2] = [p_xz]
	for p in current_path:
		if pts.back().distance_to(p) > 0.1:
			pts.append(p)
	if pts.size() < 2:
		route_mesh.mesh = null
		return
	for i in range(pts.size() - 1):
		var a := Vector3(pts[i].x, 0.06, pts[i].y)
		var b := Vector3(pts[i + 1].x, 0.06, pts[i + 1].y)
		var seg := b - a
		if seg.length_squared() < 1e-6:
			continue
		var across := seg.normalized().cross(Vector3.UP) * 0.28
		triangle(st, a - across, b - across, b + across)
		triangle(st, a - across, b + across, a + across)
	st.generate_normals()
	route_mesh.mesh = st.commit()

func walk_step(input_dir: Vector2, delta: float) -> bool:
	if input_dir.length_squared() < 1e-6 or delta <= 0.0:
		return false
	current_path.clear()
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	update_route_ribbon(true)
	in_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var dir := input_dir.normalized()
	var total_dist := WALK_SPEED_M_PER_S * delta
	var steps := maxi(1, int(ceil(total_dist / 0.20)))
	var step_len := total_dist / float(steps)
	var moved := false
	for _s in range(steps):
		var cur := player_xz()
		var desired := cur + dir * step_len
		if is_walkable_point(desired):
			player.position = Vector3(desired.x, 0.0, desired.y)
			moved = true
			continue
		var nb := nearest_building_info(cur)
		var wall_t: Vector2 = nb.tangent
		var street_t := nearest_street_tangent(cur)
		var slide_candidates: Array[Vector2] = [
			wall_t * dir.dot(wall_t),
			street_t * dir.dot(street_t),
			Vector2(dir.x, 0.0),
			Vector2(0.0, dir.y)
		]
		var best_pos := cur
		var best_score := 0.0
		for cand_vec in slide_candidates:
			if cand_vec.length_squared() < 1e-4:
				continue
			var cand_step := cand_vec.normalized() * step_len * clampf(cand_vec.length(), 0.35, 1.0)
			var cand_pos := cur + cand_step
			var score := cand_step.dot(dir)
			if score > best_score and is_walkable_point(cand_pos):
				best_score = score
				best_pos = cand_pos
		if best_score > 0.0:
			player.position = Vector3(best_pos.x, 0.0, best_pos.y)
			moved = true
		else:
			break
	player.velocity = Vector3.ZERO
	target = Vector3(player.position.x, 1.0, player.position.z)
	if view_size > 110.0:
		view_size = 75.0
	update_camera()
	update_occlusion(false)
	update_walking_status()
	return moved

func update_walking_status() -> void:
	var p := player_xz()
	var nb := nearest_building_info(p)
	var cut_note := " · %d cutaway" % occluded_buildings.size() if not occluded_buildings.is_empty() else ""
	info.text = "Pos (%.1f, %.1f) m · %.2f m from %s%s\nWASD/Arrows or tap street to walk · 1–5 neighbors · M mural · R/K music · G block\nCity 2010 PDDL footprints · Streets © OpenStreetMap / ODbL" % [p.x, p.y, nb.distance, nb.id, cut_note]

func choose_next_neighbor(direction: int = 1) -> bool:
	if selected_neighbor >= 0:
		selected_neighbor = posmod(selected_neighbor + direction, neighbors.size())
	else:
		selected_neighbor = 0 if direction > 0 else neighbors.size() - 1
	return walk_to_neighbor(selected_neighbor)

func walk_to_neighbor(index: int) -> bool:
	if index < 0 or index >= neighbors.size():
		return false
	var n: Dictionary = neighbors[index]
	selected_neighbor = index
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	if index != celeste_index:
		show_mural_panel(false)
	if index != rook_index:
		show_music_panel(false)
	if index in [celeste_index, rook_index]:
		show_block_panel(false)
	in_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := neighbor_xz(index)
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M:
		finish_neighbor_arrival(index)
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		update_route_ribbon(true)
		info.text = "No walkable route to %s\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % n.name
		announce_a11y_status("No walkable route to %s." % n.name)
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to %s (%s) · %.1f m\nCollision route outside %d city footprints · Press Esc to stop\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, dist, data.buildings.size()]
	announce_a11y_status("Walking to %s (%s), %.1f m." % [n.name, n.role, dist])
	return true

func walk_to_mural() -> bool:
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = true
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	show_music_panel(false)
	show_block_panel(false)
	in_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := mural_stand_xz()
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M or player_xz().distance_to(mural_xz()) <= 2.0:
		finish_mural_arrival()
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		walking_to_mural = false
		update_route_ribbon(true)
		info.text = "No walkable route to Portable Mural Board\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"
		announce_a11y_status("No walkable route to Portable Mural Board.")
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to Portable Mural Board (with Celeste) · %.1f m\nFreestanding sidewalk easel outside %d city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [dist, data.buildings.size()]
	announce_a11y_status("Walking to Portable Mural Board with Celeste, %.1f m." % dist)
	return true

func walk_to_speaker() -> bool:
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = true
	arrived_speaker = false
	pending_rook_talk = false
	show_mural_panel(false)
	show_block_panel(false)
	in_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := speaker_stand_xz()
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M or player_xz().distance_to(speaker_xz()) <= 1.8:
		finish_speaker_arrival()
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		walking_to_speaker = false
		update_route_ribbon(true)
		info.text = "No walkable route to Rook's Speaker\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"
		announce_a11y_status("No walkable route to Rook's Speaker.")
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to Rook's Turk St Speaker · %.1f m\nFreestanding sidewalk monitor outside %d city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [dist, data.buildings.size()]
	announce_a11y_status("Walking to Rook's Turk Street Speaker, %.1f m." % dist)
	return true

func walk_to_point(goal_xz: Vector2) -> bool:
	var safe_goal := nearest_walkable_point(goal_xz, WALK_CLEARANCE_M)
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	in_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	current_path = find_path(player_xz(), safe_goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		update_route_ribbon(true)
		info.text = "No walkable route to point (%.1f, %.1f) m\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [safe_goal.x, safe_goal.y]
		announce_a11y_status("No walkable route to street point.")
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to street point (%.1f, %.1f) m · %.1f m\nCollision route outside %d city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [safe_goal.x, safe_goal.y, player_xz().distance_to(safe_goal), data.buildings.size()]
	announce_a11y_status("Walking to street point (%.1f, %.1f) m." % [safe_goal.x, safe_goal.y])
	return true

func finish_neighbor_arrival(index: int) -> void:
	var n: Dictionary = neighbors[index]
	var goal := neighbor_xz(index)
	var cur := player_xz()
	var dist := cur.distance_to(goal)
	if dist < 0.85:
		var away := (cur - goal).normalized() if dist > 1e-4 else -nearest_street_tangent(goal)
		var stand_pos := goal + away * 0.95
		if is_walkable_point(stand_pos):
			player.position = Vector3(stand_pos.x, 0.0, stand_pos.y)
	current_path.clear()
	arrived_neighbor = index
	walking_to_mural = false
	arrived_mural = false
	walking_to_speaker = false
	arrived_speaker = false
	var n_id := String(n.get("id", ""))
	var newly_visited := false
	if not n_id.is_empty() and not visited_neighbors.has(n_id):
		visited_neighbors[n_id] = true
		newly_visited = true
		browser_import_message = ""
	recompute_music_stems()
	update_block_3d()
	update_block_ui()
	trigger_progress_cue("neighbor_visit", n.name)
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	var nb := nearest_building_info(player_xz())
	var cut_note := " · %d cutaway" % occluded_buildings.size() if not occluded_buildings.is_empty() else ""
	if index == celeste_index:
		pending_rook_talk = false
		var trigger_talk := pending_celeste_talk
		pending_celeste_talk = false
		if trigger_talk:
			talk_with_celeste()
			return
		if celeste_talk_count == 0:
			celeste_talk_count = 1
			recompute_music_stems()
			save_godot_state()
		elif newly_visited:
			save_godot_state()
		show_mural_panel(true)
		update_mural_ui()
		info.text = "With %s — %s (%d/3 mural motifs · %.2f m from %s%s)\nPortable sidewalk easel ready · Place Sun, Wave & Rise below\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, mural_placements.size(), nb.distance, nb.id, cut_note]
		announce_a11y_status("Arrived at %s (%s). Portable Mural Board %d/3 motifs." % [n.name, n.role, mural_placements.size()])
	elif index == rook_index:
		pending_celeste_talk = false
		var trigger_rook := pending_rook_talk
		pending_rook_talk = false
		if trigger_rook:
			check_sound_with_rook()
			return
		if newly_visited:
			save_godot_state()
		show_music_panel(true)
		update_music_ui()
		var sc_tag := "Soundcheck ready" if rook_soundcheck_done else "Tap Soundcheck below"
		info.text = "With %s — %s (%s · %.2f m from %s%s)\nTurk St speaker %.1f m clear of wall · Explicit play/audition below\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, sc_tag, nb.distance, nb.id, cut_note, min_wall_distance(speaker_xz())]
		announce_a11y_status("Arrived at %s (%s). %s." % [n.name, n.role, sc_tag])
	elif index >= 3 or (index == 0 and not newly_visited):
		pending_celeste_talk = false
		pending_rook_talk = false
		if newly_visited:
			save_godot_state()
		show_block_panel(true)
		update_block_ui()
		info.text = "With %s — %s (%d/5 neighbors · %.2f m from %s%s)\nOpening block checklist below · Press G for Block Panel\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, visited_neighbors.size(), nb.distance, nb.id, cut_note]
		announce_a11y_status("Arrived at %s (%s). Visited %d/5 neighbors." % [n.name, n.role, visited_neighbors.size()])
	else:
		pending_celeste_talk = false
		pending_rook_talk = false
		if newly_visited:
			save_godot_state()
		show_mural_panel(false)
		show_music_panel(false)
		show_block_panel(false)
		info.text = "With %s — %s (%.2f m from %s%s)\nWASD/Arrows or tap street to walk · Walk to neighbor for next · Press G for Block\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, nb.distance, nb.id, cut_note]
		announce_a11y_status("Arrived at %s (%s). Visited %d/5 neighbors." % [n.name, n.role, visited_neighbors.size()])

func finish_mural_arrival() -> void:
	var stand_pt := mural_stand_xz()
	var cur := player_xz()
	if is_point_in_mural_footprint(cur, PLAYER_RADIUS_M) or cur.distance_to(stand_pt) > 0.65:
		if is_walkable_point(stand_pt):
			player.position = Vector3(stand_pt.x, 0.0, stand_pt.y)
	current_path.clear()
	walking_to_mural = false
	arrived_mural = true
	walking_to_speaker = false
	arrived_speaker = false
	arrived_neighbor = -1
	pending_rook_talk = false
	var trigger_talk := pending_celeste_talk
	pending_celeste_talk = false
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	if trigger_talk:
		talk_with_celeste()
		return
	if celeste_talk_count == 0:
		celeste_talk_count = 1
		recompute_music_stems()
		save_godot_state()
	show_mural_panel(true)
	update_mural_ui()
	var nb := nearest_building_info(player_xz())
	info.text = "At Portable Mural Board with Celeste (%d/3 motifs · %s palette · %.2f m from %s)\nFreestanding sidewalk easel — no building façade painted\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [mural_placements.size(), mural_palette.capitalize(), nb.distance, nb.id]
	announce_a11y_status("At Portable Mural Board with Celeste (%d/3 motifs, %s palette)." % [mural_placements.size(), mural_palette.capitalize()])

func finish_speaker_arrival() -> void:
	var stand_pt := speaker_stand_xz()
	var cur := player_xz()
	if is_point_in_speaker_footprint(cur, PLAYER_RADIUS_M) or cur.distance_to(stand_pt) > 0.65:
		if is_walkable_point(stand_pt):
			player.position = Vector3(stand_pt.x, 0.0, stand_pt.y)
	current_path.clear()
	walking_to_speaker = false
	arrived_speaker = true
	walking_to_mural = false
	arrived_mural = false
	arrived_neighbor = -1
	pending_celeste_talk = false
	var trigger_rook := pending_rook_talk
	pending_rook_talk = false
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	if trigger_rook:
		check_sound_with_rook()
		return
	show_music_panel(true)
	update_music_ui()
	var nb := nearest_building_info(player_xz())
	var sc_tag := active_stem_summary() if rook_soundcheck_done else "Tap Soundcheck below"
	info.text = "At Rook's Turk St Speaker (%s · %.2f m from %s)\nFreestanding sidewalk monitor · Play sketch or audition local Suno file\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [sc_tag, nb.distance, nb.id]
	announce_a11y_status("At Rook's Turk Street Speaker (%s)." % sc_tag)

func celeste_dialogue_text() -> String:
	if mural_completed:
		return "Celeste: \"Sun, Wave, and Rise are shining on our portable board—saved without touching any 2010 wall.\""
	match posmod(maxi(1, celeste_talk_count) - 1, 3):
		0:
			return "Celeste: \"Our freestanding easel sits %.1f m clear of the wall—add Sun, Wave, and Rise below.\"" % min_wall_distance(mural_xz())
		1:
			return "Celeste: \"Cycle Garden, Sunset, or Ocean, or tap Move tile to shift your active motif on the 6×3 board.\""
		_:
			return "Celeste: \"Every motif stays on our portable sidewalk board in its own Godot save—no façade is altered.\""

func rook_dialogue_text() -> String:
	if music_mode == "local" and not local_music_name.is_empty():
		return "Rook: \"Spinning your local cut (%s) on the Turk Street monitor—tab-local only, never uploaded.\"" % local_music_name
	if mural_completed:
		return "Rook: \"Celeste's 3/3 mural unlocked the full 4-stem 80 BPM sketch—hit Play or load a local Suno bounce.\""
	return "Rook: \"Turk Street speaker is %.1f m clear of the wall—soundcheck locked in (%s).\"" % [min_wall_distance(speaker_xz()), active_stem_summary()]

func focus_mural_camera() -> void:
	in_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var c_pos: Vector3 = neighbors[celeste_index].pos
	target = Vector3((c_pos.x + MURAL_POS.x) * 0.5, 1.4, (c_pos.z + MURAL_POS.z) * 0.5)
	view_size = 45.0
	update_camera()
	if get_viewport() != null and get_viewport().get_visible_rect().size.x < 600:
		target -= camera.global_basis.y * 4.2
		update_camera()
	update_occlusion(true)

func focus_speaker_camera() -> void:
	in_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var r_pos: Vector3 = neighbors[rook_index].pos
	target = Vector3((r_pos.x + ROOK_SPEAKER_POS.x) * 0.5, 1.2, (r_pos.z + ROOK_SPEAKER_POS.z) * 0.5)
	view_size = 45.0
	update_camera()
	if get_viewport() != null and get_viewport().get_visible_rect().size.x < 600:
		target -= camera.global_basis.y * 4.2
		update_camera()
	update_occlusion(true)

func focus_block_camera() -> void:
	in_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var b_pos: Vector3 = neighbors[0].pos
	target = Vector3(b_pos.x, 1.35, b_pos.z)
	view_size = 45.0
	update_camera()
	if get_viewport() != null and get_viewport().get_visible_rect().size.x < 600:
		target -= camera.global_basis.y * 4.2
		update_camera()
	update_occlusion(true)

func talk_with_celeste() -> String:
	celeste_talk_count += 1
	visited_neighbors[CELESTE_ID] = true
	browser_import_message = ""
	recompute_music_stems()
	update_block_3d()
	show_mural_panel(true)
	focus_mural_camera()
	save_godot_state()
	update_mural_ui()
	update_block_ui()
	trigger_progress_cue("celeste_talk", "Celeste talk")
	var line := celeste_dialogue_text()
	info.text = "%s\nPortable Mural Board: %d/3 motifs (%s palette) · Separate Godot save\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, mural_placements.size(), mural_palette.capitalize()]
	announce_a11y_status(line)
	return line

func request_rook_soundcheck() -> bool:
	if arrived_neighbor == rook_index or arrived_speaker:
		check_sound_with_rook()
		return true
	if selected_neighbor == rook_index or walking_to_speaker:
		pending_rook_talk = true
		return true
	if walk_to_neighbor(rook_index):
		if arrived_neighbor == rook_index:
			check_sound_with_rook()
		else:
			pending_rook_talk = true
		return true
	return false

func check_sound_with_rook() -> String:
	visited_neighbors[ROOK_ID] = true
	rook_soundcheck_done = true
	browser_import_message = ""
	recompute_music_stems()
	update_speaker_3d()
	update_block_3d()
	show_music_panel(true)
	focus_speaker_camera()
	save_godot_state()
	trigger_progress_cue("rook_soundcheck", "Rook soundcheck")
	update_music_ui()
	update_block_ui()
	var line := rook_dialogue_text()
	info.text = "%s\nRook's Speaker: %s · Explicit Play/Pause & local Suno audition\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, active_stem_summary()]
	announce_a11y_status(line)
	return line

func is_block_ready() -> bool:
	return visited_neighbors.size() >= neighbors.size() and mural_placements.size() == MURAL_MOTIFS.size() and rook_soundcheck_done

func get_block_missing_summary() -> String:
	var missing: Array[String] = []
	if visited_neighbors.size() < neighbors.size():
		missing.append("%d/5 neighbors" % visited_neighbors.size())
	if mural_placements.size() < MURAL_MOTIFS.size():
		missing.append("%d/3 mural motifs" % mural_placements.size())
	if not rook_soundcheck_done:
		missing.append("Rook soundcheck")
	if missing.is_empty():
		return "Ready to open"
	return ", ".join(missing)

func visit_next_unvisited_neighbor() -> bool:
	for i in range(neighbors.size()):
		var nid := String(neighbors[i].get("id", ""))
		if not visited_neighbors.has(nid):
			return walk_to_neighbor(i)
	return choose_next_neighbor(1)

func open_mural_from_block_panel() -> void:
	if arrived_neighbor == celeste_index or arrived_mural:
		show_mural_panel(true)
		focus_mural_camera()
	else:
		walk_to_mural()

func open_block_gathering() -> bool:
	if not is_block_ready():
		show_block_panel(true)
		var missing := get_block_missing_summary()
		info.text = "Turk St block gathering needs: %s\nVisit all 5 neighbors (1–5), place 3/3 mural motifs (M), and soundcheck with Rook (R)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % missing
		update_block_ui()
		announce_a11y_status("Block gathering needs: %s." % missing)
		return false
	if block_opened:
		show_block_panel(true)
		focus_block_camera()
		update_block_ui()
		announce_a11y_status("Block gathering already open.")
		return true
	block_opened = true
	browser_import_message = ""
	update_block_3d()
	show_block_panel(true)
	focus_block_camera()
	save_godot_state()
	trigger_progress_cue("block_opened", "Turk St Gathering")
	update_block_ui()
	var line := "Bea: \"Everyone's here, Celeste's 3/3 board is glowing, and Rook's speaker is set—our Turk Street block gathering is open!\""
	info.text = "%s\nOpening Block Complete (5/5 neighbors · 3/3 mural · Soundcheck ready · Sound-independent)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % line
	announce_a11y_status(line)
	return true

func recompute_music_stems() -> void:
	var mask := 1 # "bass" always active
	if visited_neighbors.size() >= 1 or celeste_talk_count > 0 or rook_soundcheck_done:
		mask |= 2 # "brush"
	if mural_placements.size() >= 1 or celeste_talk_count > 0:
		mask |= 4 # "chords"
	if mural_completed or rook_soundcheck_done:
		mask |= 8 # "lead"
	unlocked_stem_mask = mask
	update_music_ui()

func unlocked_stems() -> Array[String]:
	var result: Array[String] = []
	for i in range(MUSIC_STEM_ORDER.size()):
		if (unlocked_stem_mask & (1 << i)) != 0:
			result.append(MUSIC_STEM_ORDER[i])
	return result

func active_stem_summary() -> String:
	var stems := unlocked_stems()
	return "%s (%d/%d stems)" % ["+".join(stems), stems.size(), MUSIC_STEM_ORDER.size()]

func trigger_progress_cue(cue_id: String, reason: String) -> void:
	recompute_music_stems()
	var stems := unlocked_stems()
	last_music_cue = cue_id
	cue_history.append({
		"id": cue_id,
		"reason": reason,
		"stems": stems.duplicate()
	})
	if cue_history.size() > 32:
		cue_history.pop_front()
	if music_playing and music_mode == "sketch":
		cue_chime_timer = 0.32
		match cue_id:
			"mural_complete":
				cue_chime_freq = 783.99
			"rook_soundcheck":
				cue_chime_freq = 659.25
			"mural_motif":
				cue_chime_freq = 587.33
			_:
				cue_chime_freq = 523.25
	update_music_ui()

func apply_music_volume_db() -> void:
	var db := -80.0 if music_volume <= 0.0001 else linear_to_db(music_volume)
	if sketch_player != null:
		sketch_player.volume_db = db
	if local_audio_player != null:
		local_audio_player.volume_db = db
	if music_playing and music_mode == "sketch":
		last_sample_rms = last_pre_gain_rms * music_volume
	else:
		last_sample_rms = 0.0

func start_music_playback() -> bool:
	music_playing = true
	var has_audio_device := AudioServer.get_driver_name() != "Dummy"
	if music_mode == "local" and local_audio_player != null and local_audio_player.stream != null:
		if sketch_player != null and sketch_player.playing:
			sketch_player.stop()
		sketch_playback = null
		apply_music_volume_db()
		if has_audio_device:
			local_audio_player.play()
		last_pre_gain_rms = 0.0
		last_sample_rms = 0.0
	else:
		music_mode = "sketch"
		if local_audio_player != null and local_audio_player.playing:
			local_audio_player.stop()
		apply_music_volume_db()
		if sketch_player != null and has_audio_device:
			if not sketch_player.playing:
				sketch_player.play()
			sketch_playback = sketch_player.get_stream_playback() as AudioStreamGeneratorPlayback
			if sketch_playback != null:
				advance_music_clock(sketch_generator.buffer_length)
	update_speaker_3d()
	update_music_ui()
	var mode_tag := ("Local: " + local_music_name) if music_mode == "local" else ("80 BPM Sketch (" + active_stem_summary() + ")")
	announce_a11y_status("Music playing: %s." % mode_tag)
	return music_playing

func stop_music_playback() -> void:
	music_playing = false
	if sketch_player != null and sketch_player.playing:
		sketch_player.stop()
	if local_audio_player != null and local_audio_player.playing:
		local_audio_player.stop()
	sketch_playback = null
	cue_chime_timer = 0.0
	last_pre_gain_rms = 0.0
	last_sample_rms = 0.0
	update_speaker_3d()
	update_music_ui()

func toggle_music_playback() -> bool:
	if music_playing:
		stop_music_playback()
		announce_a11y_status("Music paused.")
		return false
	return start_music_playback()

func cycle_music_volume() -> float:
	var best_idx := 0
	var best_diff := INF
	for i in range(MUSIC_VOL_STEPS.size()):
		var d := absf(MUSIC_VOL_STEPS[i] - music_volume)
		if d < best_diff:
			best_diff = d
			best_idx = i
	music_volume = MUSIC_VOL_STEPS[posmod(best_idx + 1, MUSIC_VOL_STEPS.size())]
	apply_music_volume_db()
	update_music_ui()
	announce_a11y_status("Music volume %d%%." % int(round(music_volume * 100.0)))
	return music_volume

func advance_music_clock(delta: float) -> int:
	if not music_playing or delta <= 0.0:
		return 0
	var has_audio_device := AudioServer.get_driver_name() != "Dummy"
	if music_mode == "local":
		if has_audio_device and local_audio_player != null and local_audio_player.stream != null and not local_audio_player.playing:
			local_audio_player.play()
		last_pre_gain_rms = 0.0
		last_sample_rms = 0.0
		return 0
	if cue_chime_timer > 0.0:
		cue_chime_timer = maxf(0.0, cue_chime_timer - delta)
	if has_audio_device and sketch_playback == null and sketch_player != null and sketch_player.playing:
		sketch_playback = sketch_player.get_stream_playback() as AudioStreamGeneratorPlayback
	var frames_to_gen := 0
	if sketch_playback != null:
		frames_to_gen = sketch_playback.get_frames_available()
	else:
		frames_to_gen = maxi(1, int(round(delta * MUSIC_MIX_RATE)))
	if frames_to_gen <= 0:
		last_sample_rms = last_pre_gain_rms * music_volume
		return 0
	var bass_freqs: Array[float] = [110.0, 110.0, 130.81, 98.0, 123.47, 123.47, 146.83, 98.0]
	var lead_freqs: Array[float] = [440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 392.0]
	var inv_rate := 1.0 / MUSIC_MIX_RATE
	var samples_per_step := maxi(1, int(round(MUSIC_STEP_SEC * MUSIC_MIX_RATE)))
	var sum_sq := 0.0
	for i in range(frames_to_gen):
		var sample_idx := sketch_frames_pushed + i
		var t := float(sample_idx) * inv_rate
		var step_total := int(sample_idx / samples_per_step)
		var step_idx := posmod(step_total, 8)
		var step_t := float(sample_idx % samples_per_step) * inv_rate
		var c0 := 220.0 if step_idx < 4 else 196.0
		var c1 := 261.63 if step_idx < 4 else 246.94
		var c2 := 329.63 if step_idx < 4 else 293.66
		var bass_f: float = bass_freqs[step_idx]
		var lead_f: float = lead_freqs[step_idx]
		var sig := sin(TAU * bass_f * t) * 0.24 + sin(TAU * bass_f * 2.0 * t) * 0.08
		if (unlocked_stem_mask & 2) != 0:
			var env := exp(-step_t * 14.0)
			sig += sin(TAU * 910.0 * t) * cos(TAU * 1430.0 * t) * env * 0.10
		if (unlocked_stem_mask & 4) != 0:
			var c_sig := (sin(TAU * c0 * t) + sin(TAU * c1 * t) + sin(TAU * c2 * t)) / 3.0
			sig += c_sig * 0.16
		if (unlocked_stem_mask & 8) != 0:
			sig += sin(TAU * lead_f * t + sin(TAU * 5.0 * t) * 0.25) * 0.14
		if cue_chime_timer > 0.0:
			sig += sin(TAU * cue_chime_freq * t) * 0.15
		var sample := clampf(sig, -0.95, 0.95)
		sum_sq += sample * sample
		if sketch_playback != null:
			sketch_playback.push_frame(Vector2(sample, sample))
	sketch_frames_pushed += frames_to_gen
	sketch_phase = fmod(float(sketch_frames_pushed) * inv_rate, 60.0)
	sketch_tick = int(sketch_frames_pushed / samples_per_step)
	last_pre_gain_rms = sqrt(sum_sq / float(frames_to_gen))
	last_sample_rms = last_pre_gain_rms * music_volume
	return frames_to_gen

func parse_wav_stream(raw_bytes: PackedByteArray) -> AudioStreamWAV:
	if raw_bytes.size() < 44:
		return null
	if raw_bytes.slice(0, 4).get_string_from_ascii() != "RIFF":
		return null
	if raw_bytes.slice(8, 12).get_string_from_ascii() != "WAVE":
		return null
	var offset := 12
	var fmt_found := false
	var audio_format := 0
	var channels := 0
	var sample_rate := 0
	var bits_per_sample := 0
	var data_offset := -1
	var data_size := 0
	while offset + 8 <= raw_bytes.size():
		var chunk_id := raw_bytes.slice(offset, offset + 4).get_string_from_ascii()
		var chunk_size := int(raw_bytes.decode_u32(offset + 4))
		var chunk_body := offset + 8
		if chunk_body + chunk_size > raw_bytes.size():
			return null
		if chunk_id == "fmt ":
			if chunk_size < 16:
				return null
			audio_format = int(raw_bytes.decode_u16(chunk_body))
			channels = int(raw_bytes.decode_u16(chunk_body + 2))
			sample_rate = int(raw_bytes.decode_u32(chunk_body + 4))
			bits_per_sample = int(raw_bytes.decode_u16(chunk_body + 14))
			fmt_found = true
		elif chunk_id == "data":
			data_offset = chunk_body
			data_size = chunk_size
			break
		offset = chunk_body + chunk_size + (chunk_size % 2)
	if not fmt_found or data_offset < 0 or data_size <= 0:
		return null
	if audio_format != 1 or (channels != 1 and channels != 2):
		return null
	if bits_per_sample != 8 and bits_per_sample != 16:
		return null
	if sample_rate < 4000 or sample_rate > 96000:
		return null
	var frame_bytes := channels * int(bits_per_sample / 8)
	if frame_bytes <= 0 or data_size < frame_bytes:
		return null
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS if bits_per_sample == 16 else AudioStreamWAV.FORMAT_8_BITS
	wav.mix_rate = sample_rate
	wav.stereo = (channels == 2)
	wav.data = raw_bytes.slice(data_offset, data_offset + data_size)
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = int(data_size / frame_bytes)
	return wav

func is_plausible_mp3(raw_bytes: PackedByteArray) -> bool:
	if raw_bytes.size() < 16:
		return false
	var offset := 0
	if raw_bytes[0] == 0x49 and raw_bytes[1] == 0x44 and raw_bytes[2] == 0x33:
		if raw_bytes[3] == 0xFF or raw_bytes[4] == 0xFF:
			return false
		for b_i in range(6, 10):
			if raw_bytes[b_i] >= 0x80:
				return false
		var tag_size := (int(raw_bytes[6]) << 21) | (int(raw_bytes[7]) << 14) | (int(raw_bytes[8]) << 7) | int(raw_bytes[9])
		offset = 10 + tag_size
	if offset + 4 > raw_bytes.size():
		return false
	if raw_bytes[offset] != 0xFF or (raw_bytes[offset + 1] & 0xE0) != 0xE0:
		return false
	var ver_bits := (raw_bytes[offset + 1] >> 3) & 0x03
	var layer_bits := (raw_bytes[offset + 1] >> 1) & 0x03
	var br_idx := (raw_bytes[offset + 2] >> 4) & 0x0F
	var sr_idx := (raw_bytes[offset + 2] >> 2) & 0x03
	return ver_bits != 0x01 and layer_bits != 0x00 and br_idx != 0x00 and br_idx != 0x0F and sr_idx != 0x03

func is_plausible_ogg_vorbis(raw_bytes: PackedByteArray) -> bool:
	if raw_bytes.size() < 64:
		return false
	if raw_bytes.slice(0, 4).get_string_from_ascii() != "OggS" or raw_bytes[4] != 0:
		return false
	if raw_bytes[28] != 1 or raw_bytes.slice(29, 35).get_string_from_ascii() != "vorbis":
		return false
	var channels := int(raw_bytes[39])
	var sr := int(raw_bytes.decode_u32(40))
	if channels < 1 or channels > 8 or sr < 4000 or sr > 192000:
		return false
	var second_page := raw_bytes.slice(58, raw_bytes.size()).get_string_from_ascii().find("OggS")
	return second_page >= 0

func load_local_music_bytes(file_name: String, raw_bytes: PackedByteArray) -> bool:
	var clean_name := file_name.get_file().strip_edges()
	var ext := clean_name.get_extension().to_lower()
	if clean_name.is_empty() or not (ext in ["mp3", "wav", "ogg"]):
		music_error = MUSIC_FILE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_FILE_ERROR)
		return false
	if raw_bytes.is_empty() or raw_bytes.size() > MUSIC_MAX_LOCAL_BYTES:
		music_error = MUSIC_FILE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_FILE_ERROR)
		return false
	var stream: AudioStream = null
	if ext == "wav":
		stream = parse_wav_stream(raw_bytes)
	elif ext == "mp3":
		if is_plausible_mp3(raw_bytes):
			var mp3 := AudioStreamMP3.new()
			mp3.data = raw_bytes
			mp3.loop = true
			if mp3.get_length() > 0.0:
				stream = mp3
	elif ext == "ogg":
		if is_plausible_ogg_vorbis(raw_bytes):
			var ogg := AudioStreamOggVorbis.load_from_buffer(raw_bytes)
			if ogg != null and ogg.get_length() > 0.0:
				ogg.loop = true
				stream = ogg
	if stream == null:
		music_error = MUSIC_DECODE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_DECODE_ERROR)
		return false
	if local_audio_player != null:
		local_audio_player.stream = stream
	local_music_name = clean_name
	music_mode = "local"
	music_error = ""
	start_music_playback()
	trigger_progress_cue("local_audition", clean_name)
	info.text = "Auditioning local track: %s (Rook's Turk St speaker)\nTab-local only — never uploaded or saved · Use Sketch to return\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % clean_name
	announce_a11y_status("Auditioning local track %s." % clean_name)
	return true

func use_synth_sketch() -> void:
	music_error = ""
	music_mode = "sketch"
	if local_audio_player != null and local_audio_player.playing:
		local_audio_player.stop()
	if music_playing:
		start_music_playback()
	else:
		update_speaker_3d()
		update_music_ui()
	info.text = "Switched Rook's Turk St Speaker to 80 BPM Synth Sketch (%s)\nExplicit Play/Pause below · Load Suno File for local audition\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % active_stem_summary()
	announce_a11y_status("Switched Rook's Speaker to 80 BPM Synth Sketch (%s)." % active_stem_summary())

func setup_web_audio_bridge() -> void:
	if not OS.has_feature("web"):
		return
	var js_init := """
	(function() {
		if (window.__tenderloinWebAudioReady) return;
		window.__tenderloinWebAudioReady = true;
		// Single pending-file slot: a new selection before the next frame poll replaces the prior slot.
		window.__tenderloinWebAudioPending = null;
		window.__tenderloinQueueLocalAudioBytes = function(name, bytes, err) {
			var u8 = (bytes instanceof Uint8Array) ? bytes : (bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(0));
			window.__tenderloinWebAudioPending = { name: String(name || ''), bytes: u8, err: String(err || '') };
			return true;
		};
		window.__tenderloinQueueLocalAudioBase64 = function(name, b64, err) {
			var u8 = new Uint8Array(0);
			if (b64) {
				try {
					var bin = window.atob(String(b64));
					u8 = new Uint8Array(bin.length);
					for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
				} catch (_e) {
					return window.__tenderloinQueueLocalAudioBytes(name, new Uint8Array(0), err || 'decode');
				}
			}
			return window.__tenderloinQueueLocalAudioBytes(name, u8, err);
		};
		var input = document.createElement('input');
		input.type = 'file';
		input.id = 'tenderloin-godot-audio-input';
		input.accept = '.mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg';
		input.style.display = 'none';
		input.addEventListener('change', function() {
			var f = input.files && input.files[0];
			if (!f) return;
			if (f.size <= 0 || f.size > 40 * 1024 * 1024) {
				window.__tenderloinQueueLocalAudioBytes(f.name, new Uint8Array(0), 'size');
				input.value = '';
				return;
			}
			var reader = new FileReader();
			reader.onload = function() {
				var buf = reader.result instanceof ArrayBuffer ? new Uint8Array(reader.result) : new Uint8Array(0);
				window.__tenderloinQueueLocalAudioBytes(f.name, buf, '');
				input.value = '';
			};
			reader.onerror = function() {
				window.__tenderloinQueueLocalAudioBytes(f.name, new Uint8Array(0), 'read');
				input.value = '';
			};
			reader.readAsArrayBuffer(f);
		});
		document.body.appendChild(input);
		window.__tenderloinOpenAudioPicker = function() {
			input.click();
			return true;
		};
	})();
	"""
	JavaScriptBridge.eval(js_init, true)

func setup_web_a11y_bridge() -> void:
	if not OS.has_feature("web"):
		return
	var js_a11y := """
	(function() {
		if (window.__tenderloinWebA11yReady) return;
		window.__tenderloinWebA11yReady = true;
		var srStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
		var live = document.getElementById('godot-a11y-status');
		if (!live) {
			live = document.createElement('div');
			live.id = 'godot-a11y-status';
			live.setAttribute('role', 'status');
			live.setAttribute('aria-live', 'polite');
			live.setAttribute('aria-atomic', 'true');
			live.style.cssText = srStyle;
			document.body.appendChild(live);
		}
		var summary = document.getElementById('godot-a11y-summary');
		if (!summary) {
			summary = document.createElement('div');
			summary.id = 'godot-a11y-summary';
			summary.setAttribute('role', 'region');
			summary.setAttribute('aria-label', 'Tenderloin Block Status');
			summary.style.cssText = srStyle;
			document.body.appendChild(summary);
		}
		window.__tenderloinGodotA11ySnapshot = null;
		window.__tenderloinLastA11ySeq = 0;
		window.__tenderloinUpdateA11yDOM = function(payloadJson) {
			try {
				var data = JSON.parse(payloadJson);
				window.__tenderloinGodotA11ySnapshot = data;
				var l = document.getElementById('godot-a11y-status');
				if (l && data.announcement && data.seq !== window.__tenderloinLastA11ySeq) {
					window.__tenderloinLastA11ySeq = data.seq;
					l.textContent = (l.textContent === data.announcement) ? (data.announcement + '\\u00a0') : data.announcement;
				}
				var s = document.getElementById('godot-a11y-summary');
				if (s) {
					s.textContent = 'Neighbors ' + data.visited_count + '/5 · Mural ' + data.mural_count + '/3 (' + data.mural_palette + ') · Soundcheck ' + (data.soundcheck_done ? 'Done' : 'Pending') + ' · Block ' + (data.block_opened ? 'Opened' : (data.block_ready ? 'Ready' : 'In progress'));
				}
				return true;
			} catch (_e) {
				return false;
			}
		};
		window.__tenderloinWebSavePending = null;
		window.__tenderloinQueueBrowserSaveJson = function(rawText, errMsg) {
			window.__tenderloinWebSavePending = {
				raw: String(rawText || ''),
				err: String(errMsg || '')
			};
			return true;
		};
		var saveInput = document.getElementById('tenderloin-godot-save-input');
		if (!saveInput) {
			saveInput = document.createElement('input');
			saveInput.type = 'file';
			saveInput.id = 'tenderloin-godot-save-input';
			saveInput.accept = '.json,application/json';
			saveInput.style.display = 'none';
			saveInput.addEventListener('change', function() {
				var f = saveInput.files && saveInput.files[0];
				if (!f) return;
				if (f.size <= 0 || f.size > 65536) {
					window.__tenderloinQueueBrowserSaveJson('', 'size');
					saveInput.value = '';
					return;
				}
				var reader = new FileReader();
				reader.onload = function() {
					window.__tenderloinQueueBrowserSaveJson(typeof reader.result === 'string' ? reader.result : '', '');
					saveInput.value = '';
				};
				reader.onerror = function() {
					window.__tenderloinQueueBrowserSaveJson('', 'read');
					saveInput.value = '';
				};
				reader.readAsText(f);
			});
			document.body.appendChild(saveInput);
		}
		window.__tenderloinOpenSavePicker = function() {
			saveInput.click();
			return true;
		};
	})();
	"""
	JavaScriptBridge.eval(js_a11y, true)

func get_a11y_status_snapshot() -> Dictionary:
	var active_panel := "none"
	if block_panel != null and block_panel.visible:
		active_panel = "block"
	elif mural_panel != null and mural_panel.visible:
		active_panel = "mural"
	elif music_panel != null and music_panel.visible:
		active_panel = "music"
	return {
		"seq": a11y_announcement_seq,
		"announcement": last_a11y_announcement,
		"active_panel": active_panel,
		"visited_count": visited_neighbors.size(),
		"mural_count": mural_placements.size(),
		"mural_palette": mural_palette,
		"soundcheck_done": rook_soundcheck_done,
		"block_ready": is_block_ready(),
		"block_opened": block_opened,
		"music_playing": music_playing,
		"music_mode": music_mode,
		"browser_import_status": browser_import_status
	}

func announce_a11y_status(msg: String) -> void:
	var clean := msg.replace("\n", " ").strip_edges()
	if clean.is_empty():
		return
	a11y_announcement_seq += 1
	last_a11y_announcement = clean
	sync_web_a11y_status()

func sync_web_a11y_status() -> void:
	if not OS.has_feature("web"):
		return
	var payload := JSON.stringify(get_a11y_status_snapshot())
	if payload == last_synced_a11y_json:
		return
	last_synced_a11y_json = payload
	var js_lit := JSON.stringify(payload)
	JavaScriptBridge.eval("window.__tenderloinUpdateA11yDOM && window.__tenderloinUpdateA11yDOM(%s);" % js_lit, true)

func prompt_local_music_file() -> void:
	show_music_panel(true)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.__tenderloinOpenAudioPicker && window.__tenderloinOpenAudioPicker();", true)
	else:
		info.text = "Choose a local MP3, WAV, or OGG track (or call load_local_music_bytes)\nTab-local only — never uploaded or saved · Sketch remains available\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"

func poll_web_audio() -> void:
	if not OS.has_feature("web"):
		return
	var has_save_pending: Variant = JavaScriptBridge.eval("Boolean(window.__tenderloinWebSavePending);", true)
	if bool(has_save_pending):
		var save_raw_var: Variant = JavaScriptBridge.eval("var sp = window.__tenderloinWebSavePending; window.__tenderloinWebSavePending = null; (sp && !sp.err) ? String(sp.raw || '') : '';", true)
		var save_raw := String(save_raw_var) if save_raw_var is String else ""
		import_browser_save_json(save_raw)
	var has_pending: Variant = JavaScriptBridge.eval("Boolean(window.__tenderloinWebAudioPending);", true)
	if not bool(has_pending):
		return
	var fname_var: Variant = JavaScriptBridge.eval("window.__tenderloinWebAudioPending ? String(window.__tenderloinWebAudioPending.name || '') : '';", true)
	var err_var: Variant = JavaScriptBridge.eval("window.__tenderloinWebAudioPending ? String(window.__tenderloinWebAudioPending.err || '') : '';", true)
	var raw_var: Variant = JavaScriptBridge.eval("var p = window.__tenderloinWebAudioPending; window.__tenderloinWebAudioPending = null; (p && p.bytes instanceof Uint8Array) ? p.bytes : new Uint8Array(0);", true)
	var fname := String(fname_var) if fname_var is String else ""
	var err := String(err_var) if err_var is String else ""
	var raw: PackedByteArray = raw_var if raw_var is PackedByteArray else PackedByteArray()
	if not err.is_empty() or raw.is_empty():
		music_error = MUSIC_FILE_ERROR
		update_music_ui()
		announce_a11y_status(MUSIC_FILE_ERROR)
		return
	load_local_music_bytes(fname, raw)

func can_interact_with_mural() -> bool:
	return arrived_mural or arrived_neighbor == celeste_index or (mural_panel != null and mural_panel.visible)

func is_valid_mural_cell(col: int, row: int) -> bool:
	return col >= 0 and col < MURAL_BOARD_COLS and row >= 0 and row < MURAL_BOARD_ROWS

func cell_occupied_by_other(col: int, row: int, ignore_motif: String) -> bool:
	for m_id in mural_placements.keys():
		if String(m_id) == ignore_motif:
			continue
		var c_dict: Dictionary = mural_placements[m_id]
		if int(c_dict.get("col", -1)) == col and int(c_dict.get("row", -1)) == row:
			return true
	return false

func first_free_mural_cell(preferred: Vector2i, ignore_motif: String) -> Vector2i:
	if is_valid_mural_cell(preferred.x, preferred.y) and not cell_occupied_by_other(preferred.x, preferred.y, ignore_motif):
		return preferred
	var start_idx := clampi(preferred.y * MURAL_BOARD_COLS + preferred.x, 0, MURAL_BOARD_COLS * MURAL_BOARD_ROWS - 1)
	var total := MURAL_BOARD_COLS * MURAL_BOARD_ROWS
	for offset in range(total):
		var idx := posmod(start_idx + offset, total)
		var c := idx % MURAL_BOARD_COLS
		var r := int(idx / MURAL_BOARD_COLS)
		if not cell_occupied_by_other(c, r, ignore_motif):
			return Vector2i(c, r)
	return Vector2i(0, 0)

func place_mural_motif(motif_id: String, col: int, row: int) -> bool:
	if not motif_id in MURAL_MOTIFS:
		return false
	if not is_valid_mural_cell(col, row):
		return false
	if cell_occupied_by_other(col, row, motif_id):
		return false
	browser_import_message = ""
	var was_completed := mural_completed
	active_motif = motif_id
	mural_placements[motif_id] = {"col": col, "row": row}
	update_mural_3d()
	save_godot_state()
	update_mural_ui()
	update_block_ui()
	if mural_completed and not was_completed:
		trigger_progress_cue("mural_complete", "3/3 motifs")
	else:
		trigger_progress_cue("mural_motif", motif_id)
	info.text = "Placed %s motif at (%d, %d) on Portable Mural Board with Celeste (%d/3 motifs)\nFreestanding sidewalk easel · %s palette · Saved to Godot storage\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [motif_id.capitalize(), col, row, mural_placements.size(), mural_palette.capitalize()]
	announce_a11y_status("Placed %s motif at (%d, %d) on Portable Mural Board (%d/3 motifs)." % [motif_id.capitalize(), col, row, mural_placements.size()])
	return true

func activate_or_advance_motif(motif_id: String) -> bool:
	if not motif_id in MURAL_MOTIFS:
		return false
	show_mural_panel(true)
	active_motif = motif_id
	if not mural_placements.has(motif_id):
		var pref: Vector2i = MURAL_DEFAULT_CELLS.get(motif_id, Vector2i(0, 0))
		var target_cell := first_free_mural_cell(pref, motif_id)
		return place_mural_motif(motif_id, target_cell.x, target_cell.y)
	return move_active_motif(1, 0)

func move_active_motif(dcol: int, drow: int) -> bool:
	if not active_motif in MURAL_MOTIFS:
		active_motif = "sun"
	show_mural_panel(true)
	if not mural_placements.has(active_motif):
		var pref: Vector2i = MURAL_DEFAULT_CELLS.get(active_motif, Vector2i(0, 0))
		var target_cell := first_free_mural_cell(pref, active_motif)
		return place_mural_motif(active_motif, target_cell.x, target_cell.y)
	var cur_cell: Dictionary = mural_placements[active_motif]
	var cur_c: int = int(cur_cell.get("col", 0))
	var cur_r: int = int(cur_cell.get("row", 0))
	var direct_c := cur_c + dcol
	var direct_r := cur_r + drow
	if is_valid_mural_cell(direct_c, direct_r) and not cell_occupied_by_other(direct_c, direct_r, active_motif):
		return place_mural_motif(active_motif, direct_c, direct_r)
	var step_delta := drow * MURAL_BOARD_COLS + dcol
	if step_delta == 0:
		step_delta = 1
	var total := MURAL_BOARD_COLS * MURAL_BOARD_ROWS
	var cur_idx := cur_r * MURAL_BOARD_COLS + cur_c
	var dir_sign := 1 if step_delta > 0 else -1
	for step in range(1, total):
		var cand_idx := posmod(cur_idx + step * dir_sign, total)
		var cand_c := cand_idx % MURAL_BOARD_COLS
		var cand_r := int(cand_idx / MURAL_BOARD_COLS)
		if not cell_occupied_by_other(cand_c, cand_r, active_motif):
			return place_mural_motif(active_motif, cand_c, cand_r)
	return false

func set_mural_palette(palette_id: String) -> bool:
	if not palette_id in MURAL_PALETTES:
		return false
	mural_palette = palette_id
	update_mural_3d()
	save_godot_state()
	update_mural_ui()
	trigger_progress_cue("mural_palette", palette_id)
	info.text = "Portable Mural Board palette set to %s with Celeste (%d/3 motifs)\nFreestanding sidewalk easel · Saved to Godot storage\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [mural_palette.capitalize(), mural_placements.size()]
	announce_a11y_status("Portable Mural Board palette set to %s (%d/3 motifs)." % [mural_palette.capitalize(), mural_placements.size()])
	return true

func cycle_mural_palette() -> String:
	show_mural_panel(true)
	var idx := MURAL_PALETTES.find(mural_palette)
	var next_id: String = MURAL_PALETTES[posmod(idx + 1, MURAL_PALETTES.size())]
	set_mural_palette(next_id)
	return mural_palette

func clear_mural_board() -> void:
	browser_import_message = ""
	if block_opened:
		info.text = "Block gathering is open — Portable Mural Board stays on display with Celeste (3/3 motifs · %s palette)\nAdjust motif positions or cycle palette freely\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % mural_palette.capitalize()
		announce_a11y_status("Block gathering is open; Portable Mural Board stays on display.")
		return
	mural_placements.clear()
	mural_completed = false
	update_mural_3d()
	save_godot_state()
	update_mural_ui()
	update_block_ui()
	info.text = "Cleared Portable Mural Board with Celeste (0/3 motifs · %s palette)\nPlace Sun, Wave, and Rise on the 6×3 freestanding board\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % mural_palette.capitalize()
	announce_a11y_status("Cleared Portable Mural Board (0/3 motifs).")

func resolve_save_path() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--godot-save-path="):
			var custom := arg.trim_prefix("--godot-save-path=").strip_edges()
			if not custom.is_empty():
				return custom
	for arg in OS.get_cmdline_args():
		if arg.ends_with("study_test.gd"):
			return GODOT_TEST_SAVE_PATH
	return GODOT_SAVE_PATH

func is_whole_json_number(val: Variant) -> bool:
	if val is int:
		return true
	if val is float:
		return not is_nan(val) and not is_inf(val) and is_equal_approx(val, roundf(val))
	return false

func valid_neighbor_ids() -> Array[String]:
	var ids: Array[String] = []
	for n in neighbors:
		var nid := String(n.get("id", ""))
		if not nid.is_empty():
			ids.append(nid)
	return ids

func build_save_envelope() -> Dictionary:
	var v_list: Array[String] = []
	for k in visited_neighbors.keys():
		v_list.append(String(k))
	v_list.sort()
	return {
		"schema": "tenderloin-redux.godot.save",
		"version": GODOT_SAVE_VERSION,
		"save_seq": save_seq,
		"celeste_talk_count": celeste_talk_count,
		"mural_palette": mural_palette,
		"active_motif": active_motif,
		"mural_placements": mural_placements.duplicate(true),
		"rook_soundcheck_done": rook_soundcheck_done,
		"visited_neighbors": v_list,
		"block_opened": block_opened
	}

func save_godot_state() -> bool:
	save_seq += 1
	var raw_json := JSON.stringify(build_save_envelope())
	var wrote := false
	var file := FileAccess.open(save_path, FileAccess.WRITE)
	if file != null:
		file.store_string(raw_json)
		file.close()
		wrote = true
	if OS.has_feature("web"):
		var js_literal := JSON.stringify(raw_json)
		var web_ok: Variant = JavaScriptBridge.eval("try { window.localStorage.setItem('%s', %s); true; } catch (_e) { false; }" % [GODOT_WEB_STORAGE_KEY, js_literal], true)
		wrote = wrote or bool(web_ok)
	return wrote

func reset_mural_state_to_defaults(status_label: String) -> void:
	celeste_talk_count = 0
	mural_palette = "garden"
	active_motif = "sun"
	mural_placements.clear()
	mural_completed = false
	rook_soundcheck_done = false
	visited_neighbors.clear()
	block_opened = false
	browser_import_status = "none"
	browser_import_message = ""
	stop_music_playback()
	sketch_tick = 0
	sketch_phase = 0.0
	sketch_frames_pushed = 0
	music_mode = "sketch"
	local_music_name = ""
	music_error = ""
	if local_audio_player != null:
		local_audio_player.stream = null
	save_load_status = status_label
	update_mural_3d()
	update_speaker_3d()
	update_block_3d()
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	sync_web_a11y_status()

func apply_save_envelope(raw_json: String) -> bool:
	var trimmed := raw_json.strip_edges()
	if trimmed.is_empty():
		reset_mural_state_to_defaults("fresh")
		return false
	if not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		reset_mural_state_to_defaults("recovered")
		return false
	var parsed: Variant = JSON.parse_string(trimmed)
	if not parsed is Dictionary:
		reset_mural_state_to_defaults("recovered")
		return false
	var env: Dictionary = parsed
	if String(env.get("schema", "")) != "tenderloin-redux.godot.save":
		reset_mural_state_to_defaults("recovered")
		return false
	var ver_val: Variant = env.get("version", -1)
	if not is_whole_json_number(ver_val) or int(roundf(float(ver_val))) != GODOT_SAVE_VERSION:
		reset_mural_state_to_defaults("recovered")
		return false
	var pal_id := String(env.get("mural_palette", ""))
	if not pal_id in MURAL_PALETTES:
		reset_mural_state_to_defaults("recovered")
		return false
	var talk_val: Variant = env.get("celeste_talk_count", 0)
	if not is_whole_json_number(talk_val) or int(roundf(float(talk_val))) < 0:
		reset_mural_state_to_defaults("recovered")
		return false
	var sc_done := false
	if env.has("rook_soundcheck_done"):
		var sc_val: Variant = env.get("rook_soundcheck_done")
		if not (sc_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		sc_done = bool(sc_val)
	var bo_done := false
	if env.has("block_opened"):
		var bo_val: Variant = env.get("block_opened")
		if not (bo_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		bo_done = bool(bo_val)
	var clean_visited: Dictionary = {}
	if env.has("visited_neighbors"):
		var vn_val: Variant = env.get("visited_neighbors")
		if not (vn_val is Array):
			reset_mural_state_to_defaults("recovered")
			return false
		var known_ids := valid_neighbor_ids()
		var vn_arr: Array = vn_val
		for item in vn_arr:
			if not (item is String) or not (String(item) in known_ids):
				reset_mural_state_to_defaults("recovered")
				return false
			clean_visited[String(item)] = true
	var raw_placements: Variant = env.get("mural_placements", null)
	if not raw_placements is Dictionary:
		reset_mural_state_to_defaults("recovered")
		return false
	var raw_dict: Dictionary = raw_placements
	var clean_placements: Dictionary = {}
	var occupied: Dictionary = {}
	for k in raw_dict.keys():
		var motif_key := String(k)
		if not motif_key in MURAL_MOTIFS:
			reset_mural_state_to_defaults("recovered")
			return false
		var cell_val: Variant = raw_dict[k]
		if not cell_val is Dictionary:
			reset_mural_state_to_defaults("recovered")
			return false
		var cell_dict: Dictionary = cell_val
		var c_val: Variant = cell_dict.get("col", null)
		var r_val: Variant = cell_dict.get("row", null)
		if not is_whole_json_number(c_val) or not is_whole_json_number(r_val):
			reset_mural_state_to_defaults("recovered")
			return false
		var c_int := int(roundf(float(c_val)))
		var r_int := int(roundf(float(r_val)))
		if not is_valid_mural_cell(c_int, r_int):
			reset_mural_state_to_defaults("recovered")
			return false
		var cell_key := "%d,%d" % [c_int, r_int]
		if occupied.has(cell_key):
			reset_mural_state_to_defaults("recovered")
			return false
		occupied[cell_key] = true
		clean_placements[motif_key] = {"col": c_int, "row": r_int}
	var seq_val: Variant = env.get("save_seq", 0)
	if is_whole_json_number(seq_val):
		save_seq = maxi(save_seq, int(roundf(float(seq_val))))
	celeste_talk_count = maxi(0, int(roundf(float(talk_val))))
	mural_palette = pal_id
	var act_id := String(env.get("active_motif", "sun"))
	active_motif = act_id if act_id in MURAL_MOTIFS else "sun"
	mural_placements = clean_placements
	rook_soundcheck_done = sc_done
	visited_neighbors = clean_visited
	stop_music_playback()
	sketch_tick = 0
	sketch_phase = 0.0
	sketch_frames_pushed = 0
	music_mode = "sketch"
	local_music_name = ""
	music_error = ""
	if local_audio_player != null:
		local_audio_player.stream = null
	save_load_status = "restored"
	update_mural_3d()
	block_opened = bo_done and is_block_ready()
	update_speaker_3d()
	update_block_3d()
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	sync_web_a11y_status()
	return true

func browser_furniture_cells(item_id: String, col: int, row: int, layout_id: String) -> Array[Vector2i]:
	var vertical := (item_id == "table" and layout_id == "floor")
	return [
		Vector2i(col, row),
		Vector2i(col + (0 if vertical else 1), row + (1 if vertical else 0))
	]

func can_place_browser_furniture(placed: Dictionary, item_id: String, col: int, row: int, layout_id: String) -> bool:
	if not (layout_id in ["table", "floor"]) or not (item_id in BROWSER_FURNITURE_IDS):
		return false
	var cells := browser_furniture_cells(item_id, col, row, layout_id)
	for c in cells:
		if c.x < 0 or c.x > 7 or c.y < 0 or c.y > 4 or c.y == 2:
			return false
	for other_key in placed.keys():
		var other_id := String(other_key)
		if other_id == item_id:
			continue
		var other_pos: Dictionary = placed[other_key]
		var other_cells := browser_furniture_cells(other_id, int(other_pos.get("col", -1)), int(other_pos.get("row", -1)), layout_id)
		for a in cells:
			for b in other_cells:
				if a == b:
					return false
	return true

func inspect_browser_save_json(raw_json: String) -> Dictionary:
	if raw_json.is_empty() or raw_json.length() > BROWSER_SAVE_MAX_BYTES:
		return {"valid": false, "error": "empty_or_too_large"}
	var trimmed := raw_json.strip_edges()
	if not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		return {"valid": false, "error": "malformed_json"}
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		return {"valid": false, "error": "malformed_json"}
	var env: Dictionary = parsed
	var ver_val: Variant = env.get("version", null)
	var core_val: Variant = env.get("core", null)
	if not is_whole_json_number(ver_val) or int(roundf(float(ver_val))) != 1 or not (core_val is Dictionary):
		return {"valid": false, "error": "unsupported_envelope"}
	var saved: Dictionary = core_val
	var greeted := (saved.get("greeted", false) is bool) and bool(saved.get("greeted", false))
	var layout_id := ""
	if greeted and (saved.get("layout", null) is String):
		var cand_layout := String(saved.get("layout", ""))
		if cand_layout in ["table", "floor"]:
			layout_id = cand_layout
	var clean_furniture: Dictionary = {}
	if saved.get("furniture", null) is Dictionary:
		var raw_furn: Dictionary = saved.get("furniture")
		for f_id in BROWSER_FURNITURE_IDS:
			var fp: Variant = raw_furn.get(f_id, null)
			if fp is Dictionary:
				var f_dict: Dictionary = fp
				var fc: Variant = f_dict.get("col", null)
				var fr: Variant = f_dict.get("row", null)
				if is_whole_json_number(fc) and is_whole_json_number(fr):
					var c_i := int(roundf(float(fc)))
					var r_i := int(roundf(float(fr)))
					if can_place_browser_furniture(clean_furniture, f_id, c_i, r_i, layout_id):
						clean_furniture[f_id] = {"col": c_i, "row": r_i}
	var layout_ready := (layout_id != "" and clean_furniture.size() == BROWSER_FURNITURE_IDS.size())
	var clean_litter: Array[String] = []
	if saved.get("litter", null) is Array:
		var raw_lit: Array = saved.get("litter")
		for lit_id in BROWSER_LITTER_IDS:
			for item in raw_lit:
				if (item is String) and String(item) == lit_id:
					clean_litter.append(lit_id)
					break
	var tidy_ready := (clean_litter.size() == BROWSER_LITTER_IDS.size())
	var clean_mural: Dictionary = {}
	var occ_mural: Dictionary = {}
	if saved.get("mural", null) is Dictionary:
		var raw_mural: Dictionary = saved.get("mural")
		for m_id in MURAL_MOTIFS:
			var mp: Variant = raw_mural.get(m_id, null)
			if mp is Dictionary:
				var m_dict: Dictionary = mp
				var mc: Variant = m_dict.get("col", null)
				var mr: Variant = m_dict.get("row", null)
				if is_whole_json_number(mc) and is_whole_json_number(mr):
					var mc_i := int(roundf(float(mc)))
					var mr_i := int(roundf(float(mr)))
					if is_valid_mural_cell(mc_i, mr_i):
						var m_key := "%d,%d" % [mc_i, mr_i]
						if not occ_mural.has(m_key):
							occ_mural[m_key] = true
							clean_mural[m_id] = {"col": mc_i, "row": mr_i}
	var mural_ready := (clean_mural.size() == MURAL_MOTIFS.size())
	var pal_id := "garden"
	if (saved.get("palette", null) is String) and String(saved.get("palette")) in MURAL_PALETTES:
		pal_id = String(saved.get("palette"))
	var sc_done := (saved.get("soundcheck", false) is bool) and bool(saved.get("soundcheck", false)) and layout_ready
	var opened_done := (saved.get("opened", false) is bool) and bool(saved.get("opened", false)) and layout_ready and tidy_ready and mural_ready and sc_done
	return {
		"valid": true,
		"greeted": greeted,
		"layout": layout_id,
		"furniture_count": clean_furniture.size(),
		"layout_ready": layout_ready,
		"tidy_count": clean_litter.size(),
		"tidy_ready": tidy_ready,
		"mural": clean_mural,
		"mural_count": clean_mural.size(),
		"mural_ready": mural_ready,
		"palette": pal_id,
		"soundcheck": sc_done,
		"opened": opened_done
	}

func import_browser_save_json(raw_json: String) -> bool:
	var res := inspect_browser_save_json(raw_json)
	if not bool(res.get("valid", false)):
		browser_import_status = "error"
		browser_import_message = "Browser save not imported (invalid or absent v1 save); Godot progress kept."
		update_block_ui()
		info.text = "%s\nBrowser save ('%s') is read-only and never overwritten by Godot\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
		announce_a11y_status(browser_import_message)
		return false
	var imported_mural: Dictionary = res.get("mural", {})
	if imported_mural.size() >= mural_placements.size():
		if not imported_mural.is_empty():
			mural_placements = imported_mural.duplicate(true)
		mural_palette = String(res.get("palette", "garden"))
	if not mural_placements.is_empty():
		celeste_talk_count = maxi(1, celeste_talk_count)
	rook_soundcheck_done = rook_soundcheck_done or bool(res.get("soundcheck", false))
	var next_visited: Dictionary = visited_neighbors.duplicate()
	if bool(res.get("greeted", false)):
		next_visited["bea"] = true
	if not mural_placements.is_empty():
		next_visited["celeste"] = true
	if rook_soundcheck_done:
		next_visited["rook"] = true
	if int(res.get("tidy_count", 0)) > 0:
		next_visited["dez"] = true
	if String(res.get("layout", "")) != "" or int(res.get("furniture_count", 0)) > 0:
		next_visited["thanh"] = true
	if bool(res.get("opened", false)):
		for nid in valid_neighbor_ids():
			next_visited[nid] = true
	visited_neighbors = next_visited
	update_mural_3d()
	block_opened = (block_opened or bool(res.get("opened", false))) and is_block_ready()
	update_speaker_3d()
	update_block_3d()
	browser_import_status = "imported"
	var state_tag := "Gathering Open" if block_opened else ("Ready" if is_block_ready() else "In progress")
	browser_import_message = "Imported browser v1 save: %d/5 neighbors · %d/3 mural (%s) · %s" % [visited_neighbors.size(), mural_placements.size(), mural_palette.capitalize(), state_tag]
	save_godot_state()
	trigger_progress_cue("browser_save_import", "Browser v1 save")
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	info.text = "%s\nBrowser save ('%s') preserved untouched · Saved to Godot storage\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
	announce_a11y_status(browser_import_message)
	return true

func import_browser_save_from_web_storage() -> bool:
	show_block_panel(true)
	if not OS.has_feature("web"):
		browser_import_status = "error"
		browser_import_message = "Browser save localStorage import is only available in the Web build."
		update_block_ui()
		info.text = "%s\nCall import_browser_save_json(raw_json) in native/headless tests\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % browser_import_message
		announce_a11y_status(browser_import_message)
		return false
	var raw_str := ""
	var web_val: Variant = JavaScriptBridge.eval("try { window.localStorage.getItem('%s') || ''; } catch (_e) { ''; }" % BROWSER_WEB_STORAGE_KEY, true)
	if web_val is String:
		raw_str = String(web_val)
	if raw_str.strip_edges().is_empty():
		JavaScriptBridge.eval("window.__tenderloinOpenSavePicker && window.__tenderloinOpenSavePicker();", true)
	return import_browser_save_json(raw_str)

func extract_candidate_save_seq(raw_json: String) -> int:
	var trimmed := raw_json.strip_edges()
	if not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		return -1
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		return -1
	var env: Dictionary = parsed
	var seq_val: Variant = env.get("save_seq", 0)
	if not is_whole_json_number(seq_val):
		return -1
	return int(roundf(float(seq_val)))

func load_godot_state() -> bool:
	var candidates: Array[String] = []
	if OS.has_feature("web"):
		var web_val: Variant = JavaScriptBridge.eval("try { window.localStorage.getItem('%s') || ''; } catch (_e) { ''; }" % GODOT_WEB_STORAGE_KEY, true)
		if web_val is String and not String(web_val).strip_edges().is_empty():
			candidates.append(String(web_val))
	if FileAccess.file_exists(save_path):
		var file_val := FileAccess.get_file_as_string(save_path)
		if not file_val.strip_edges().is_empty() and not candidates.has(file_val):
			candidates.append(file_val)
	if candidates.is_empty():
		reset_mural_state_to_defaults("fresh")
		return false
	if candidates.size() > 1:
		candidates.sort_custom(func(a: String, b: String) -> bool:
			return extract_candidate_save_seq(a) > extract_candidate_save_seq(b)
		)
	for raw_json in candidates:
		if apply_save_envelope(raw_json):
			return true
	return false

func clear_godot_save() -> void:
	save_seq = 0
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	if OS.has_feature("web"):
		JavaScriptBridge.eval("try { window.localStorage.removeItem('%s'); } catch (_e) {}" % GODOT_WEB_STORAGE_KEY, true)
	reset_mural_state_to_defaults("fresh")

func advance_walk(delta: float) -> bool:
	if current_path.is_empty() or delta <= 0.0:
		return false
	var remaining := WALK_SPEED_M_PER_S * delta
	var goal_xz: Vector2 = current_path.back()
	if selected_neighbor >= 0:
		goal_xz = neighbor_xz(selected_neighbor)
	elif walking_to_mural:
		goal_xz = mural_stand_xz()
	elif walking_to_speaker:
		goal_xz = speaker_stand_xz()
	var replanned := false
	while remaining > 0.0 and not current_path.is_empty():
		var cur := player_xz()
		if selected_neighbor >= 0 and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_neighbor_arrival(selected_neighbor)
			return true
		if walking_to_mural and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_mural_arrival()
			return true
		if walking_to_speaker and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_speaker_arrival()
			return true
		var wp: Vector2 = current_path[0]
		var to_wp := wp - cur
		var d := to_wp.length()
		if d <= 0.08:
			current_path.remove_at(0)
			continue
		var step := minf(remaining, minf(d, 0.20))
		var nxt := cur + to_wp.normalized() * step
		if not is_walkable_point(nxt):
			if not replanned:
				replanned = true
				current_path = find_path(cur, goal_xz)
				if current_path.size() > 1 and current_path[0].distance_to(cur) < 0.20:
					current_path.remove_at(0)
				if not current_path.is_empty():
					continue
			current_path.clear()
			break
		player.position = Vector3(nxt.x, 0.0, nxt.y)
		remaining -= step
		if selected_neighbor >= 0 and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_neighbor_arrival(selected_neighbor)
			return true
		if walking_to_mural and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_mural_arrival()
			return true
		if walking_to_speaker and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_speaker_arrival()
			return true
		if nxt.distance_to(wp) <= 0.08:
			current_path.remove_at(0)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(false)
	update_route_ribbon(false)
	if selected_neighbor >= 0 or walking_to_mural or walking_to_speaker:
		var dist_after := player_xz().distance_to(goal_xz)
		if dist_after <= ARRIVAL_DISTANCE_M:
			if selected_neighbor >= 0:
				finish_neighbor_arrival(selected_neighbor)
			elif walking_to_mural:
				finish_mural_arrival()
			else:
				finish_speaker_arrival()
			return true
		if current_path.is_empty():
			var retry := find_path(player_xz(), goal_xz)
			if retry.size() > 1 and retry[0].distance_to(player_xz()) < 0.20:
				retry.remove_at(0)
			if not retry.is_empty() and retry.back().distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
				current_path = retry
				update_route_ribbon(true)
			else:
				var dest_name := "Rook's Speaker"
				if selected_neighbor >= 0:
					dest_name = neighbors[selected_neighbor].name
				elif walking_to_mural:
					dest_name = "Portable Mural Board"
				arrived_neighbor = -1
				walking_to_mural = false
				walking_to_speaker = false
				pending_celeste_talk = false
				pending_rook_talk = false
				update_route_ribbon(true)
				info.text = "Route blocked to %s (%.1f m remaining)\nUse WASD/Arrows or tap another street point\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [dest_name, dist_after]
				announce_a11y_status("Route blocked to %s." % dest_name)
	elif current_path.is_empty():
		update_route_ribbon(true)
		update_walking_status()
	return true

func stop_walking() -> void:
	current_path.clear()
	walking_to_mural = false
	walking_to_speaker = false
	pending_celeste_talk = false
	pending_rook_talk = false
	update_route_ribbon(true)
	update_walking_status()

func follow_player() -> void:
	in_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_walking_status()

func clear_occlusion() -> void:
	for idx in occluded_buildings:
		if idx >= 0 and idx < meshes.size():
			meshes[idx].material_override = chosen_material if idx == selected else building_materials[idx]
	occluded_buildings.clear()
	last_occlusion_pos = Vector2(INF, INF)
	last_occlusion_neighbor = -2

func building_occludes_point(b_idx: int, focus_xz: Vector2, focus_y: float = 1.0) -> bool:
	var b: Dictionary = data.buildings[b_idx]
	var h: float = b.height_m
	if h <= focus_y + 1.0:
		return false
	var max_t := h - focus_y
	var b_rect: Rect2 = building_rects[b_idx].grow(CUTAWAY_RADIUS_M)
	var ray_slope := Vector2(CAMERA_OFFSET.x / CAMERA_OFFSET.y, CAMERA_OFFSET.z / CAMERA_OFFSET.y)
	var t := 1.0
	while t <= max_t:
		var ray_pt := focus_xz + ray_slope * t
		if b_rect.has_point(ray_pt):
			for polygon in b.polygons:
				if is_point_in_building_polygon(ray_pt, polygon):
					return true
				for ring in polygon.rings:
					var r_size: int = ring.size()
					for i in range(r_size):
						var p0: Array = ring[i]
						var p1: Array = ring[(i + 1) % r_size]
						if dist_to_segment_2d(ray_pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1])) <= CUTAWAY_RADIUS_M:
							return true
		t += 1.5
	return false

func update_occlusion(force: bool = true) -> void:
	if in_overview or selected >= 0:
		clear_occlusion()
		return
	var p_xz := player_xz()
	var occ_tag := selected_neighbor
	if walking_to_mural or arrived_mural:
		occ_tag = 99
	elif walking_to_speaker or arrived_speaker:
		occ_tag = 98
	if not force and p_xz.distance_to(last_occlusion_pos) < 0.40 and last_occlusion_neighbor == occ_tag:
		return
	clear_occlusion()
	last_occlusion_pos = p_xz
	last_occlusion_neighbor = occ_tag
	var focus_points: Array[Vector2] = [p_xz]
	if selected_neighbor >= 0 and selected_neighbor < neighbors.size():
		focus_points.append(neighbor_xz(selected_neighbor))
	if selected_neighbor == celeste_index or arrived_neighbor == celeste_index or walking_to_mural or arrived_mural:
		focus_points.append(mural_xz())
		focus_points.append(neighbor_xz(celeste_index))
	if selected_neighbor == rook_index or arrived_neighbor == rook_index or walking_to_speaker or arrived_speaker:
		focus_points.append(speaker_xz())
		focus_points.append(neighbor_xz(rook_index))
	for idx in range(data.buildings.size()):
		for fp in focus_points:
			if building_occludes_point(idx, fp, 1.0):
				occluded_buildings.append(idx)
				meshes[idx].material_override = cutaway_material
				break

func _process(delta: float) -> void:
	poll_web_audio()
	if music_playing:
		advance_music_clock(delta)

func _physics_process(delta: float) -> void:
	var input_vec := Vector2.ZERO
	if Input.is_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_D):
		input_vec.x += 1.0
	if Input.is_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_A):
		input_vec.x -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_S):
		input_vec.y += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_W):
		input_vec.y -= 1.0
	if get_viewport().gui_get_focus_owner() == null:
		if Input.is_key_pressed(KEY_RIGHT):
			input_vec.x += 1.0
		if Input.is_key_pressed(KEY_LEFT):
			input_vec.x -= 1.0
		if Input.is_key_pressed(KEY_DOWN):
			input_vec.y += 1.0
		if Input.is_key_pressed(KEY_UP):
			input_vec.y -= 1.0
	if input_vec.length_squared() > 0.0:
		if get_viewport().gui_get_focus_owner() != null:
			get_viewport().gui_release_focus()
		walk_step(input_vec, delta)
	elif not current_path.is_empty():
		advance_walk(delta)

func is_screen_point_in_ui(screen_pos: Vector2) -> bool:
	if header_panel and header_panel.get_global_rect().has_point(screen_pos):
		return true
	if mural_panel and mural_panel.visible and mural_panel.get_global_rect().has_point(screen_pos):
		return true
	if music_panel and music_panel.visible and music_panel.get_global_rect().has_point(screen_pos):
		return true
	if block_panel and block_panel.visible and block_panel.get_global_rect().has_point(screen_pos):
		return true
	if controls and controls.get_global_rect().has_point(screen_pos):
		return true
	return false

func screen_to_ground_xz(screen_pos: Vector2) -> Vector2:
	var origin := camera.project_ray_origin(screen_pos)
	var normal := camera.project_ray_normal(screen_pos)
	if absf(normal.y) < 1e-6:
		return Vector2(target.x, target.z)
	var t := -origin.y / normal.y
	var hit := origin + normal * t
	return Vector2(hit.x, hit.z)

func handle_scene_tap(screen_pos: Vector2) -> bool:
	if is_screen_point_in_ui(screen_pos):
		return false
	var ground_xz := screen_to_ground_xz(screen_pos)
	var best_idx := -1
	var best_screen_d := INF
	for i in range(neighbors.size()):
		var n_pos: Vector3 = neighbors[i].pos + Vector3(0.0, 0.9, 0.0)
		var n_screen := camera.unproject_position(n_pos)
		var screen_d := n_screen.distance_to(screen_pos)
		var world_d := neighbor_xz(i).distance_to(ground_xz)
		if screen_d <= 36.0 or world_d <= 4.5:
			if screen_d < best_screen_d:
				best_screen_d = screen_d
				best_idx = i
	var m_screen := camera.unproject_position(MURAL_POS + Vector3(0.0, 1.4, 0.0))
	var m_screen_d := m_screen.distance_to(screen_pos)
	var m_world_d := mural_xz().distance_to(ground_xz)
	if (m_screen_d <= 38.0 or m_world_d <= 3.6) and m_screen_d < best_screen_d:
		return walk_to_mural()
	var s_screen := camera.unproject_position(ROOK_SPEAKER_POS + Vector3(0.0, 0.8, 0.0))
	var s_screen_d := s_screen.distance_to(screen_pos)
	var s_world_d := speaker_xz().distance_to(ground_xz)
	if (s_screen_d <= 36.0 or s_world_d <= 3.2) and s_screen_d < best_screen_d:
		return walk_to_speaker()
	if best_idx >= 0:
		return walk_to_neighbor(best_idx)
	return walk_to_point(ground_xz)

func pan_camera_by_screen_delta(delta_px: Vector2) -> void:
	in_overview = false
	following_player = false
	var ppm := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
	if ppm <= 1e-5:
		return
	target -= camera.global_basis.x * (delta_px.x / ppm) - camera.global_basis.y * (delta_px.y / ppm)
	target.x = clampf(target.x, walk_bounds.position.x, walk_bounds.end.x)
	target.z = clampf(target.z, walk_bounds.position.y, walk_bounds.end.y)
	update_camera()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var k: Key = event.keycode if event.keycode != KEY_NONE else event.physical_keycode
		match k:
			KEY_1, KEY_KP_1: walk_to_neighbor(0)
			KEY_2, KEY_KP_2: walk_to_neighbor(1)
			KEY_3, KEY_KP_3: walk_to_neighbor(2)
			KEY_4, KEY_KP_4: walk_to_neighbor(3)
			KEY_5, KEY_KP_5: walk_to_neighbor(4)
			KEY_6, KEY_KP_6:
				if can_interact_with_mural():
					activate_or_advance_motif("sun")
			KEY_7, KEY_KP_7:
				if can_interact_with_mural():
					activate_or_advance_motif("wave")
			KEY_8, KEY_KP_8:
				if can_interact_with_mural():
					activate_or_advance_motif("rise")
			KEY_9, KEY_KP_9:
				if can_interact_with_mural():
					move_active_motif(1, 0)
			KEY_0, KEY_KP_0:
				if can_interact_with_mural():
					clear_mural_board()
			KEY_M: walk_to_mural()
			KEY_E, KEY_T:
				if arrived_neighbor == celeste_index or arrived_mural:
					talk_with_celeste()
				elif selected_neighbor == celeste_index or walking_to_mural:
					pending_celeste_talk = true
				else:
					if walk_to_neighbor(celeste_index):
						if arrived_neighbor == celeste_index:
							talk_with_celeste()
						else:
							pending_celeste_talk = true
			KEY_R:
				request_rook_soundcheck()
			KEY_K:
				show_music_panel(true)
				toggle_music_playback()
			KEY_V:
				show_music_panel(true)
				cycle_music_volume()
			KEY_U:
				show_music_panel(true)
				use_synth_sketch()
			KEY_G:
				toggle_block_panel()
			KEY_O:
				show_block_panel(true)
				open_block_gathering()
			KEY_I:
				import_browser_save_from_web_storage()
			KEY_P:
				if can_interact_with_mural():
					cycle_mural_palette()
			KEY_N, KEY_BRACKETRIGHT: choose_next_neighbor(1)
			KEY_B, KEY_BRACKETLEFT: choose_next_neighbor(-1)
			KEY_F: follow_player()
			KEY_ESCAPE, KEY_X: stop_walking()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		# Godot emulates MouseButton/MouseMotion from touch by default; handling once avoids double firing.
		if event.pressed:
			if not is_screen_point_in_ui(event.position):
				pointer_active = true
				pointer_dragging = false
				pointer_down_pos = event.position
				pointer_last_pos = event.position
		elif pointer_active:
			var was_drag := pointer_dragging
			pointer_active = false
			pointer_dragging = false
			if not was_drag:
				handle_scene_tap(event.position)
	elif event is InputEventMouseMotion and pointer_active:
		if event.position.distance_to(pointer_down_pos) > 8.0:
			pointer_dragging = true
		if pointer_dragging:
			pan_camera_by_screen_delta(event.position - pointer_last_pos)
		pointer_last_pos = event.position

func update_camera() -> void:
	camera.size = view_size
	camera.position = target + CAMERA_OFFSET
	camera.look_at(target)
	camera.force_update_transform()

func choose_next(direction: int) -> void:
	in_overview = false
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	current_path.clear()
	update_route_ribbon(true)
	clear_occlusion()
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = posmod(selected + direction, data.buildings.size())
	else:
		selected = 0 if direction > 0 else data.buildings.size() - 1
	meshes[selected].material_override = chosen_material
	var building: Dictionary = data.buildings[selected]
	var center := Vector3.ZERO
	var vertices: Array = building.polygons[0].rings[0]
	for vertex in vertices:
		center += point(vertex, 0)
	target = center / vertices.size() + Vector3.UP * building.height_m * 0.3
	view_size = 100
	info.text = "%s  •  median height %.2f m\nCity: 2010 survey / PDDL\nStreets © OpenStreetMap contributors / ODbL\nFlat terrain; façades and current changes unverified" % [building.id, building.height_m]
	update_camera()
	announce_a11y_status("Building %s selected, median height %.2f meters." % [building.id, building.height_m])

func overview() -> void:
	in_overview = true
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	current_path.clear()
	update_route_ribbon(true)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
	selected = -1
	clear_occlusion()
	info.text = overview_text()
	# Fit full records, including geometry beyond the extraction box, between UI.
	var viewport_size := get_viewport().get_visible_rect().size
	var header: Control = info.get_parent().get_parent()
	var top := header.get_global_rect().end.y + 12
	var bottom := controls.get_global_rect().position.y - 12
	var available := Rect2(12, top, maxf(viewport_size.x - 24, 1), maxf(bottom - top, 1))
	target = Vector3(65, 0, -12)
	view_size = 250
	update_camera()
	var bounds := projected_bounds()
	view_size *= maxf(bounds.size.x / available.size.x, bounds.size.y / available.size.y) * 1.06
	overview_size = view_size
	update_camera()
	bounds = projected_bounds()
	var pixels_per_metre := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
	var offset := bounds.get_center() - available.get_center()
	target += camera.global_basis.x * offset.x / pixels_per_metre - camera.global_basis.y * offset.y / pixels_per_metre
	update_camera()
	announce_a11y_status("Overview: %d city footprints." % data.buildings.size())

func projected_bounds() -> Rect2:
	var bounds := Rect2()
	var first := true
	for building in data.buildings:
		for polygon in building.polygons:
			for vertex in polygon.vertices:
				for h in [0.0, building.height_m]:
					var screen := camera.unproject_position(point(vertex, h))
					if first:
						bounds = Rect2(screen, Vector2.ZERO)
						first = false
					else:
						bounds = bounds.expand(screen)
	return bounds

func zoom(factor: float) -> void:
	in_overview = false
	view_size = clampf(view_size * factor, 45, maxf(400, overview_size * 2.0))
	update_camera()
	update_occlusion(true)

func overview_text() -> String:
	return "%d city footprints · 2010 survey · PDDL\nStreets © OpenStreetMap contributors / ODbL\nWASD/tap street to walk · Walk to neighbor (1–5) · Block status (G)" % data.buildings.size()

func refit_after_layout() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if in_overview:
		overview()

func show_mural_panel(visible_flag: bool) -> void:
	if visible_flag:
		if music_panel != null:
			music_panel.visible = false
		if block_panel != null:
			block_panel.visible = false
	if mural_panel != null:
		mural_panel.visible = visible_flag
		if visible_flag:
			update_mural_ui()

func show_music_panel(visible_flag: bool) -> void:
	if visible_flag:
		if mural_panel != null:
			mural_panel.visible = false
		if block_panel != null:
			block_panel.visible = false
	if music_panel != null:
		music_panel.visible = visible_flag
		if visible_flag:
			update_music_ui()

func show_block_panel(visible_flag: bool) -> void:
	if visible_flag:
		if mural_panel != null:
			mural_panel.visible = false
		if music_panel != null:
			music_panel.visible = false
	if block_panel != null:
		block_panel.visible = visible_flag
		if visible_flag:
			update_block_ui()

func toggle_block_panel() -> void:
	var next_vis := true
	if block_panel != null:
		next_vis = not block_panel.visible
	show_block_panel(next_vis)
	if next_vis:
		announce_a11y_status("Block readiness panel open. %s" % get_block_missing_summary())

func motif_button_text(motif_id: String, label_prefix: String) -> String:
	var prefix := "> " if active_motif == motif_id else ""
	if mural_placements.has(motif_id):
		var c_dict: Dictionary = mural_placements[motif_id]
		return "%s%s (%d,%d)" % [prefix, label_prefix, int(c_dict.get("col", 0)), int(c_dict.get("row", 0))]
	return "%s%s · add" % [prefix, label_prefix]

func update_mural_ui() -> void:
	if mural_label == null:
		return
	var state_tag := "3/3 Complete" if mural_completed else "%d/3 motifs" % mural_placements.size()
	mural_label.text = "Portable Board · %s · %s" % [state_tag, mural_palette.capitalize()]
	if mural_palette_btn != null:
		mural_palette_btn.text = "Palette: %s" % mural_palette.capitalize()
	if mural_sun_btn != null:
		mural_sun_btn.text = motif_button_text("sun", "Sun")
	if mural_wave_btn != null:
		mural_wave_btn.text = motif_button_text("wave", "Wave")
	if mural_rise_btn != null:
		mural_rise_btn.text = motif_button_text("rise", "Rise")

func update_music_ui() -> void:
	if music_label == null:
		return
	var play_state := "Playing" if music_playing else "Paused"
	var mode_desc := "80 BPM Sketch" if music_mode == "sketch" else ("Local: %s" % local_music_name)
	var sc_state := "Checked" if rook_soundcheck_done else "Pending"
	music_label.text = "Speaker · %s · %s · %s" % [play_state, mode_desc, sc_state]
	if music_stem_label != null:
		if not music_error.is_empty():
			music_stem_label.text = music_error
		elif music_mode == "local":
			music_stem_label.text = "Local full track (procedural stems hidden)"
		else:
			music_stem_label.text = "Stems: %s" % active_stem_summary()
	if music_play_btn != null:
		music_play_btn.text = "Pause Music" if music_playing else "Play Music"
	if music_vol_btn != null:
		music_vol_btn.text = "Vol: %d%%" % int(round(music_volume * 100.0))
	if music_rook_btn != null:
		music_rook_btn.text = "Soundcheck: Done" if rook_soundcheck_done else "Soundcheck: Rook"
	if music_sketch_btn != null:
		music_sketch_btn.text = "> Sketch (80 BPM)" if music_mode == "sketch" else "Use Sketch"

func update_block_ui() -> void:
	if block_label == null:
		return
	var v_count := visited_neighbors.size()
	var n_total := neighbors.size() if not neighbors.is_empty() else 5
	var m_state := "3/3" if mural_completed else "%d/3" % mural_placements.size()
	var sc_state := "Sound OK" if rook_soundcheck_done else "Sound Pending"
	var open_tag := "OPEN" if block_opened else ("READY" if is_block_ready() else "PREP")
	block_label.text = "Block · %s · %d/%d Nbrs · %s Mural · %s" % [open_tag, v_count, n_total, m_state, sc_state]
	if block_detail_label != null:
		block_detail_label.text = get_block_missing_summary() if browser_import_message.is_empty() else ("%s · %s" % [get_block_missing_summary(), browser_import_message])
	if block_open_btn != null:
		if block_opened:
			block_open_btn.text = "Block Opened"
		elif is_block_ready():
			block_open_btn.text = "Open Block!"
		else:
			block_open_btn.text = "Open Block"
	if block_next_btn != null:
		var remaining := maxi(0, n_total - v_count)
		block_next_btn.text = "Visit Next (%d left)" % remaining if remaining > 0 else "Cycle Neighbor"
	if block_mural_btn != null:
		block_mural_btn.text = "Mural: 3/3" if mural_completed else ("Mural: %d/3" % mural_placements.size())
	if block_rook_btn != null:
		block_rook_btn.text = "Rook: Checked" if rook_soundcheck_done else "Rook: Soundcheck"
	if block_import_btn != null:
		block_import_btn.text = "Browser Save: Ready" if browser_import_status == "imported" else "Import Browser Save"

func make_ui() -> void:
	button_focus_style = StyleBoxFlat.new()
	button_focus_style.bg_color = Color(0.95, 0.72, 0.19, 0.18)
	button_focus_style.border_color = Color(0.98, 0.78, 0.22, 1.0)
	button_focus_style.set_border_width_all(3)
	button_focus_style.set_corner_radius_all(4)

	var layer := CanvasLayer.new()
	add_child(layer)
	header_panel = PanelContainer.new()
	header_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	header_panel.offset_left = 12
	header_panel.offset_right = -12
	header_panel.offset_top = 12
	layer.add_child(header_panel)
	var column := VBoxContainer.new()
	header_panel.add_child(column)
	var title := Label.new()
	title.text = "TENDERLOIN REDUX / Godot block walk & study"
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size", 23)
	column.add_child(title)
	info = Label.new()
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.text = overview_text()
	info.add_theme_font_size_override("font_size", 17)
	column.add_child(info)

	mural_panel = PanelContainer.new()
	mural_panel.name = "MuralPanel"
	mural_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	mural_panel.offset_left = 12
	mural_panel.offset_right = -12
	mural_panel.offset_top = -302
	mural_panel.offset_bottom = -130
	mural_panel.visible = false
	layer.add_child(mural_panel)
	var mural_vbox := VBoxContainer.new()
	mural_vbox.add_theme_constant_override("separation", 3)
	mural_panel.add_child(mural_vbox)
	mural_label = Label.new()
	mural_label.clip_text = true
	mural_label.add_theme_font_size_override("font_size", 13)
	mural_vbox.add_child(mural_label)
	mural_buttons.clear()
	var row1 := HBoxContainer.new()
	row1.add_theme_constant_override("separation", 4)
	mural_vbox.add_child(row1)
	mural_button(row1, "Talk: Celeste", func(): talk_with_celeste())
	mural_palette_btn = mural_button(row1, "Palette: Garden", func(): cycle_mural_palette())
	var row2 := HBoxContainer.new()
	row2.add_theme_constant_override("separation", 4)
	mural_vbox.add_child(row2)
	mural_sun_btn = mural_button(row2, "Sun · add", func(): activate_or_advance_motif("sun"))
	mural_wave_btn = mural_button(row2, "Wave · add", func(): activate_or_advance_motif("wave"))
	mural_rise_btn = mural_button(row2, "Rise · add", func(): activate_or_advance_motif("rise"))
	var row3 := HBoxContainer.new()
	row3.add_theme_constant_override("separation", 4)
	mural_vbox.add_child(row3)
	mural_button(row3, "Move tile", func(): move_active_motif(1, 0))
	mural_button(row3, "Reset", func(): clear_mural_board())
	mural_button(row3, "Close", func(): show_mural_panel(false))
	update_mural_ui()

	music_panel = PanelContainer.new()
	music_panel.name = "MusicPanel"
	music_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	music_panel.offset_left = 12
	music_panel.offset_right = -12
	music_panel.offset_top = -302
	music_panel.offset_bottom = -130
	music_panel.visible = false
	layer.add_child(music_panel)
	var music_vbox := VBoxContainer.new()
	music_vbox.add_theme_constant_override("separation", 2)
	music_panel.add_child(music_vbox)
	music_label = Label.new()
	music_label.clip_text = true
	music_label.add_theme_font_size_override("font_size", 13)
	music_vbox.add_child(music_label)
	music_stem_label = Label.new()
	music_stem_label.clip_text = true
	music_stem_label.add_theme_font_size_override("font_size", 12)
	music_vbox.add_child(music_stem_label)
	music_buttons.clear()
	var m_row1 := HBoxContainer.new()
	m_row1.add_theme_constant_override("separation", 4)
	music_vbox.add_child(m_row1)
	music_play_btn = music_button(m_row1, "Play Music", func(): toggle_music_playback())
	music_vol_btn = music_button(m_row1, "Vol: 70%", func(): cycle_music_volume())
	var m_row2 := HBoxContainer.new()
	m_row2.add_theme_constant_override("separation", 4)
	music_vbox.add_child(m_row2)
	music_rook_btn = music_button(m_row2, "Soundcheck: Rook", func(): request_rook_soundcheck())
	music_load_btn = music_button(m_row2, "Load Suno File", func(): prompt_local_music_file())
	var m_row3 := HBoxContainer.new()
	m_row3.add_theme_constant_override("separation", 4)
	music_vbox.add_child(m_row3)
	music_sketch_btn = music_button(m_row3, "> Sketch (80 BPM)", func(): use_synth_sketch())
	music_button(m_row3, "Close", func(): show_music_panel(false))
	update_music_ui()

	block_panel = PanelContainer.new()
	block_panel.name = "BlockPanel"
	block_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	block_panel.offset_left = 12
	block_panel.offset_right = -12
	block_panel.offset_top = -302
	block_panel.offset_bottom = -130
	block_panel.visible = false
	layer.add_child(block_panel)
	var block_vbox := VBoxContainer.new()
	block_vbox.add_theme_constant_override("separation", 2)
	block_panel.add_child(block_vbox)
	block_label = Label.new()
	block_label.clip_text = true
	block_label.add_theme_font_size_override("font_size", 13)
	block_vbox.add_child(block_label)
	block_detail_label = Label.new()
	block_detail_label.clip_text = true
	block_detail_label.add_theme_font_size_override("font_size", 12)
	block_vbox.add_child(block_detail_label)
	block_buttons.clear()
	var b_row1 := HBoxContainer.new()
	b_row1.add_theme_constant_override("separation", 4)
	block_vbox.add_child(b_row1)
	block_open_btn = block_button(b_row1, "Open Block", func(): open_block_gathering())
	block_next_btn = block_button(b_row1, "Visit Next (5 left)", func(): visit_next_unvisited_neighbor())
	var b_row2 := HBoxContainer.new()
	b_row2.add_theme_constant_override("separation", 4)
	block_vbox.add_child(b_row2)
	block_mural_btn = block_button(b_row2, "Mural: 0/3", func(): open_mural_from_block_panel())
	block_rook_btn = block_button(b_row2, "Rook: Soundcheck", func(): request_rook_soundcheck())
	var b_row3 := HBoxContainer.new()
	b_row3.add_theme_constant_override("separation", 4)
	block_vbox.add_child(b_row3)
	block_import_btn = block_button(b_row3, "Import Browser Save", func(): import_browser_save_from_web_storage())
	block_button(b_row3, "Close", func(): show_block_panel(false))
	update_block_ui()

	controls = GridContainer.new()
	controls.columns = 3
	controls.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	controls.offset_left = 12
	controls.offset_right = -12
	controls.offset_top = -124
	controls.offset_bottom = -12
	layer.add_child(controls)
	button(controls, "Previous", func(): choose_next(-1))
	button(controls, "Overview", overview)
	button(controls, "Next building", func(): choose_next(1))
	button(controls, "Zoom in", func(): zoom(0.8))
	button(controls, "Zoom out", func(): zoom(1.25))
	button(controls, "Walk to neighbor", func(): choose_next_neighbor(1))
	var vp := get_viewport()
	var resize_controls := func():
		if not is_instance_valid(controls) or not is_inside_tree():
			return
		var narrow := vp.get_visible_rect().size.x < 600
		if is_instance_valid(title):
			title.add_theme_font_size_override("font_size", 18 if narrow else 23)
		if is_instance_valid(info):
			info.add_theme_font_size_override("font_size", 13 if narrow else 17)
		controls.columns = 2 if narrow else 3
		controls.offset_top = -174 if narrow else -124
		if is_instance_valid(mural_panel):
			mural_panel.offset_bottom = -180 if narrow else -130
			mural_panel.offset_top = -352 if narrow else -302
		if is_instance_valid(music_panel):
			music_panel.offset_bottom = -180 if narrow else -130
			music_panel.offset_top = -352 if narrow else -302
		if is_instance_valid(block_panel):
			block_panel.offset_bottom = -180 if narrow else -130
			block_panel.offset_top = -352 if narrow else -302
		if in_overview:
			refit_after_layout()
	vp.size_changed.connect(resize_controls)
	tree_exiting.connect(func():
		stop_music_playback()
		if sketch_player != null:
			sketch_player.stream = null
		if local_audio_player != null:
			local_audio_player.stream = null
		sketch_generator = null
		if vp.size_changed.is_connected(resize_controls):
			vp.size_changed.disconnect(resize_controls)
	)
	resize_controls.call()

func button(parent: Node, text: String, action: Callable) -> void:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size = Vector2(0, 50)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	if button_focus_style != null:
		control.add_theme_stylebox_override("focus", button_focus_style)
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)

func mural_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	if button_focus_style != null:
		control.add_theme_stylebox_override("focus", button_focus_style)
	control.add_theme_font_size_override("font_size", 13)
	control.pressed.connect(action)
	parent.add_child(control)
	mural_buttons.append(control)
	return control

func music_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	if button_focus_style != null:
		control.add_theme_stylebox_override("focus", button_focus_style)
	control.add_theme_font_size_override("font_size", 13)
	control.pressed.connect(action)
	parent.add_child(control)
	music_buttons.append(control)
	return control

func block_button(parent: Node, text: String, action: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size = Vector2(44, 44)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.focus_mode = Control.FOCUS_ALL
	if button_focus_style != null:
		control.add_theme_stylebox_override("focus", button_focus_style)
	control.add_theme_font_size_override("font_size", 13)
	control.pressed.connect(action)
	parent.add_child(control)
	block_buttons.append(control)
	return control


