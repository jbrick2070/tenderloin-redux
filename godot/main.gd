extends Node3D
## Measured-building Tenderloin neighborhood with actual-metre walking, footprint/courtyard
## collision across 188 DataSF footprints (58 opening block + 130 wider Tenderloin),
## 7 ODbL OSM streets (Turk, Taylor, Mason, Jones, Leavenworth, Hyde, Eddy),
## Transgender Cultural District boundary layer (DataSF 5xmc-5bjj, PDDL 1.0, founded 2017),
## Compton's Corner & Former Black Hawk Jazz Club history stops, Celeste's portable mural board,
## Rook's soundcheck + procedural/local music, opening-block completion, M1 keepsake photo &
## loan returns, M3 second-afternoon programme planning & hosting, and browser-save adapter.

const WALK_SPEED_M_PER_S := 4.8
const WALK_CORRIDOR_SPEED_M_PER_S := 24.0
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
const COMPTONS_POS := Vector3(-6.0, 0.0, -5.5)
const BLACKHAWK_POS := Vector3(-424.5, 0.0, 62.5)
const HISTORY_STOP_IDS: Array[String] = ["comptons", "blackhawk"]
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
const PHOTO_GUESTS: Array[String] = ["bea", "celeste", "dez", "thanh"]
const KEEPSAKE_EXPORT_FILENAME := "tenderloin-redux-godot-afternoon.svg"
const KEEPSAKE_PALETTE_HEX: Dictionary = {
	"garden": ["#c37e71", "#276a5a", "#d6a449"],
	"sunset": ["#cb7752", "#975a7c", "#dfb75f"],
	"ocean": ["#508a9b", "#28665f", "#d3ab77"]
}
const KEEPSAKE_BUNTING_Y: Array[String] = [
	"72", "79.5657117545147", "86.75204712999698", "93.19865326319695",
	"98.58227040391301", "102.63294150868225", "105.147549014182", "106",
	"105.147549014182", "102.63294150868225", "98.58227040391301", "93.19865326319695",
	"86.75204712999698", "79.5657117545147", "72"
]
const LOAN_IDS: Array[String] = ["table", "paint-case", "speaker"]
const LOAN_TITLES: Dictionary = {
	"table": "Thanh's folding table",
	"paint-case": "Celeste's paint case",
	"speaker": "Rook's speaker"
}
const PROGRAMME_SEGMENTS: Array[String] = ["stories", "beats", "art", "pause"]
const PROGRAMME_DEFAULT_ORDER: Array[String] = ["stories", "beats", "pause", "art"]
const PROGRAMME_TITLES: Dictionary = {
	"stories": "Story circle",
	"beats": "Rhythm workshop",
	"art": "Shared art panel",
	"pause": "Quiet interval"
}
const PROGRAMME_SEGMENT_COLORS: Dictionary = {
	"stories": "#e5b66d",
	"beats": "#91bac2",
	"art": "#d9a2b2",
	"pause": "#a3b48c"
}
const HOSTING_STORIES: Array[String] = ["memory", "future"]
const HOSTING_PALETTES: Array[String] = ["warm", "cool"]
const HOSTING_TILE_HEX: Dictionary = {
	"warm": ["#e5b66d", "#d9a2b2", "#75907c"],
	"cool": ["#91bac2", "#a3b48c", "#987b9e"]
}
const HOSTING_QUIETS: Array[String] = ["arc", "pairs"]
const HOSTING_DEFAULT_TILES: Array[int] = [0, 1, 2, 2, 1, 0]
const SAVE_BUDGET_MAX_BYTES := 4096
const PATHFIND_BUDGET_MAX_USEC := 250000
const SAVE_SERIALIZE_BUDGET_MAX_USEC := 50000
const VOICES_TEARDOWN_BUDGET_MAX_USEC := 50000
const GODOT_SETTINGS_PATH := "user://godot_block_settings_v1.json"
const GODOT_TEST_SETTINGS_PATH := "user://godot_block_settings_test_v1.json"
const GODOT_SETTINGS_WEB_STORAGE_KEY := "tenderloin-redux.godot.settings.v1"
const CIVIC_TOPICS: Array[String] = ["repairs", "access"]
const CIVIC_TOPIC_LABELS: Dictionary = {
	"repairs": "Repairs and staying put",
	"access": "Room to come and go"
}
const CIVIC_TOPIC_REQUESTS: Dictionary = {
	"repairs": "We want homes cared for and neighbors able to stay. We ask for a conversation about repairs without displacement.",
	"access": "We want shared spaces that welcome neighbors while keeping entrances and the through-route clear."
}
const CIVIC_FORMATS: Array[String] = ["circle", "dropin"]
const CIVIC_FORMAT_LABELS: Dictionary = {
	"circle": "Small listening circle",
	"dropin": "Drop-in notice table"
}
const CIVIC_NOTES: Array[String] = ["themes", "none"]
const CIVIC_NOTE_LABELS: Dictionary = {
	"themes": "Keep anonymous themes",
	"none": "Keep no meeting notes"
}
const CIVIC_PHASES: Array[String] = ["idle", "planning", "meeting", "done"]
const FILM_SHOTS: Array[String] = ["seat", "paint", "welcome"]
const FILM_SHOT_LABELS: Dictionary = {
	"seat": "An empty seat",
	"paint": "A shared motif",
	"welcome": "Room for one more"
}
const FILM_SHOT_QUIET_CAPTIONS: Dictionary = {
	"seat": "A chair waits. There is room for someone new.",
	"paint": "A neighbor's shape becomes part of something shared.",
	"welcome": "A place stays open. Joining in is an invitation."
}
const FILM_SHOT_LATER_CAPTIONS: Dictionary = {
	"seat": "\"May I sit here?\" \"We kept a place open.\"",
	"paint": "\"Your shape belongs beside mine.\"",
	"welcome": "\"Stay for a moment, or come back another day.\""
}
const FILM_FRAMING: Array[String] = ["close", "wide"]
const FILM_FRAMING_LABELS: Dictionary = {
	"close": "Objects in close-up",
	"wide": "Table and volunteer hands"
}
const FILM_PLANS: Array[String] = ["quiet", "later"]
const FILM_PLAN_LABELS: Dictionary = {
	"quiet": "A quiet prop take",
	"later": "Wait for the conversation"
}
const FILM_PHASES: Array[String] = ["idle", "planning", "hold", "shooting", "done"]
const VOICES_DATA_PATH := "res://data/neighborhood_voices.json"
const VOICES_CHECKED_AT := "2026-10-18"
const VOICES_DISCLAIMER := "Sources checked October 18, 2026. This is a dated introduction, not a current service or emergency directory. Follow the official pages for current information. No organization endorses or assigns missions in this game. \"Neighborhood Voices\" is the feature's name; this version contains no recorded voices."
const VOICES_MAX_BYTES := 8192
const OPTIONAL_SAVE_MAX_BYTES := 8192
const VOICES_SOURCES: Dictionary = {
	"tndc": "https://www.tndc.org/about",
	"glide": "https://www.glide.org/programs/",
	"larkin": "https://larkinstreetyouth.org/about/"
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
var wider_meshes: Array[MeshInstance3D] = []
var wider_building_rects: Array[Rect2] = []
var wider_building_materials: Array[StandardMaterial3D] = []
var all_buildings: Array = []
var all_building_rects: Array[Rect2] = []
var street_ways: Array = []
var street_way_rects: Array[Rect2] = []
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
var in_wide_overview := false

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
var walking_to_history_stop := ""
var arrived_history_stop := ""
var current_path: Array[Vector2] = []
var occluded_buildings: Array[int] = []
var occluded_wider_buildings: Array[int] = []
var following_player := false
var cell_walkable_cache: Dictionary = {}
var last_astar_expanded_cells := 0
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
var keepsake_photo: Dictionary = {"status": "unasked", "participants": [], "mural": {}, "palette": "garden", "layout": "table"}
var epilogue_packing := false
var epilogue_returned: Array[String] = []
var keepsake_frame_node: Node3D
var keepsake_canvas_mesh: MeshInstance3D
var keepsake_guest_pips: Dictionary = {}
var loan_return_beacons: Dictionary = {}
var programme_order: Array[String] = []
var programme_published: Array[String] = []
var hosting_order: Array[String] = []
var hosting_results: Array[Dictionary] = []
var hosting_draft: Dictionary = {"story": "memory", "pattern": 85, "tiles": [0, 1, 2, 2, 1, 0], "palette": "warm", "quiet": "arc"}
var programme_board_node: Node3D
var programme_segment_bars: Array[MeshInstance3D] = []
var hosting_tile_panel_node: Node3D
var hosting_tile_meshes: Array[MeshInstance3D] = []
var district_boundary_node: MeshInstance3D
var district_boundary_visible := true
var west_intersection_nodes: Array[Node3D] = []
var history_stop_nodes: Dictionary = {}
var history_beacon_meshes: Dictionary = {}
var history_read := false
var blackhawk_discovered := false
var block_panel: PanelContainer
var block_label: Label
var block_detail_label: Label
var block_buttons: Array[Button] = []
var block_next_btn: Button
var block_mural_btn: Button
var block_rook_btn: Button
var block_west_btn: Button
var block_district_btn: Button
var block_open_btn: Button
var block_epilogue_btn: Button
var block_programme_btn: Button
var block_civic_btn: Button
var block_film_btn: Button
var block_voices_btn: Button
var block_import_btn: Button
var settings_path := GODOT_SETTINGS_PATH
var civic_phase := "idle"
var civic_draft: Dictionary = {"topic": "repairs", "format": "circle", "notes": "themes"}
var civic_result: Dictionary = {}
var civic_setup_node: Node3D
var civic_circle_group: Node3D
var civic_dropin_group: Node3D
var civic_done_beacon: MeshInstance3D
var film_phase := "idle"
var film_draft: Dictionary = {"framing": "close", "plan": "quiet", "order": ["seat", "paint", "welcome"]}
var film_result: Dictionary = {}
var film_captured: Array[String] = []
var film_screen_frame := 0
var film_storyboard_node: Node3D
var film_frame_canvas: MeshInstance3D
var film_wide_border: MeshInstance3D
var film_shot_pips: Array[MeshInstance3D] = []
var optional_save_data: Dictionary = {}
var voices_enabled := false
var voices_status := "off"
var voices_error := ""
var voices_suspended := false
var voices_simulate_error := false
var voices_generation := 0
var voices_release_count := 0
var voices_checked_at := ""
var voices_records: Array[Dictionary] = []
var voices_custom_json_override := ""
var browser_import_status := "none"
var browser_import_message := ""
var last_a11y_announcement := ""
var a11y_announcement_seq := 0
var last_synced_a11y_json := ""
var button_focus_style: StyleBoxFlat
var last_exported_keepsake_svg := ""
var last_voices_teardown_usec := 0

func make_building_mesh_and_rect(building: Dictionary, mat: StandardMaterial3D) -> Dictionary:
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
	building_mesh.material_override = mat
	var body := StaticBody3D.new()
	body.name = "StaticBody3D"
	var col := CollisionShape3D.new()
	var concave := ConcavePolygonShape3D.new()
	concave.set_faces(wall_faces)
	col.shape = concave
	body.add_child(col)
	building_mesh.add_child(body)
	add_child(building_mesh)
	return {"mesh": building_mesh, "rect": b_rect}

func _ready() -> void:
	save_path = resolve_save_path()
	settings_path = resolve_settings_path()
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
	var wider_palette: Array[Color] = [
		Color("b7aa96"),
		Color("bfb09b"),
		Color("ada496"),
		Color("bca28f")
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
	plane.size = Vector2(960, 560)
	ground.mesh = plane
	ground.material_override = material(Color("566a63"))
	ground.position = Vector3(-130, -0.1, 15)
	add_child(ground)
	build_streets()
	build_district_boundary()
	for idx in range(data.buildings.size()):
		var building: Dictionary = data.buildings[idx]
		var b_mat := material(palette[idx % palette.size()])
		building_materials.append(b_mat)
		var built := make_building_mesh_and_rect(building, b_mat)
		var b_mesh: MeshInstance3D = built.mesh
		var b_rect: Rect2 = built.rect
		meshes.append(b_mesh)
		building_rects.append(b_rect)
		all_buildings.append(building)
		all_building_rects.append(b_rect)
	var wider_list: Array = data.get("wider_buildings", [])
	for w_idx in range(wider_list.size()):
		var w_building: Dictionary = wider_list[w_idx]
		var w_mat := material(wider_palette[w_idx % wider_palette.size()])
		wider_building_materials.append(w_mat)
		var w_built := make_building_mesh_and_rect(w_building, w_mat)
		var w_mesh: MeshInstance3D = w_built.mesh
		var w_rect: Rect2 = w_built.rect
		wider_meshes.append(w_mesh)
		wider_building_rects.append(w_rect)
		all_buildings.append(w_building)
		all_building_rects.append(w_rect)
	if not all_building_rects.is_empty():
		var b_union := all_building_rects[0]
		for br in all_building_rects:
			b_union = b_union.merge(br)
		walk_bounds = b_union.grow(14.0)
	build_west_intersections()
	build_history_stops()
	build_neighbors_and_player()
	build_mural_board()
	build_rook_speaker()
	build_block_banner()
	build_street_life_decor()
	build_audio_players()
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	add_child(camera)
	camera.current = true
	update_camera()
	make_ui()
	setup_web_audio_bridge()
	setup_web_a11y_bridge()
	load_godot_state()
	load_godot_settings()
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
	street_ways = data.get("wider_streets", data.streets)
	street_way_rects.clear()
	for street in street_ways:
		var s_rect := Rect2()
		var has_s_rect := false
		for p in street.points:
			var pv := Vector2(p[0], p[1])
			if not has_s_rect:
				s_rect = Rect2(pv, Vector2.ZERO)
				has_s_rect = true
			else:
				s_rect = s_rect.expand(pv)
		street_way_rects.append(s_rect)
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

func build_district_boundary() -> void:
	district_boundary_node = MeshInstance3D.new()
	district_boundary_node.name = "DistrictBoundaryRibbon"
	var cd: Dictionary = data.get("cultural_district", {})
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var polys: Array = cd.get("polygons", [])
	for poly in polys:
		var rings: Array = poly.get("rings", [])
		for ring in rings:
			var r_size: int = ring.size()
			for i in range(r_size):
				var p0: Array = ring[i]
				var p1: Array = ring[(i + 1) % r_size]
				var a := point(p0, 0.045)
				var b := point(p1, 0.045)
				var seg := b - a
				if seg.length_squared() < 1e-6:
					continue
				var across := seg.normalized().cross(Vector3.UP) * 0.90
				triangle(st, a - across, b - across, b + across)
				triangle(st, a - across, b + across, a + across)
				var au := a + Vector3.UP * 0.35
				var bu := b + Vector3.UP * 0.35
				triangle(st, a, b, bu)
				triangle(st, a, bu, au)
	st.generate_normals()
	district_boundary_node.mesh = st.commit()
	district_boundary_node.material_override = mural_material(Color("d484b4"))
	district_boundary_node.visible = district_boundary_visible
	add_child(district_boundary_node)

func update_district_boundary_3d() -> void:
	if district_boundary_node != null:
		district_boundary_node.visible = district_boundary_visible

func make_label_3d(node_name: String, text_str: String, pos: Vector3, tint: Color = Color("fff6df"), pixel_sz: float = 0.0115, font_sz: int = 24) -> Label3D:
	var lbl := Label3D.new()
	lbl.name = node_name
	lbl.text = text_str
	lbl.position = pos
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.pixel_size = pixel_sz
	lbl.font_size = font_sz
	lbl.outline_size = 7
	lbl.modulate = tint
	lbl.outline_modulate = Color(0.08, 0.14, 0.16, 0.94)
	return lbl

func build_west_intersections() -> void:
	west_intersection_nodes.clear()
	var list: Array = data.get("west_intersections", [])
	for item in list:
		var int_id := String(item.get("id", ""))
		var int_label := String(item.get("label", int_id.replace("turk-", "Turk & ").capitalize()))
		var pt: Array = item.get("point", [0.0, 0.0])
		var root_n := Node3D.new()
		root_n.name = "WestIntersection_%s" % int_id
		root_n.position = Vector3(float(pt[0]), 0.0, float(pt[1]))
		var ring_inst := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.top_radius = 1.65
		cyl.bottom_radius = 1.65
		cyl.height = 0.03
		ring_inst.mesh = cyl
		ring_inst.position = Vector3(0.0, 0.042, 0.0)
		ring_inst.material_override = material(Color("d8c8a8"))
		root_n.add_child(ring_inst)
		var post_inst := MeshInstance3D.new()
		var post_box := BoxMesh.new()
		post_box.size = Vector3(0.14, 3.0, 0.14)
		post_inst.mesh = post_box
		post_inst.position = Vector3(4.2, 1.5, -4.2)
		post_inst.material_override = material(Color("455357"))
		root_n.add_child(post_inst)
		var blade_inst := MeshInstance3D.new()
		blade_inst.name = "StreetSignBlade"
		var blade_box := BoxMesh.new()
		blade_box.size = Vector3(1.85, 0.34, 0.16)
		blade_inst.mesh = blade_box
		blade_inst.position = Vector3(4.2, 3.12, -4.2)
		blade_inst.material_override = mural_material(Color("75bbb2"))
		root_n.add_child(blade_inst)
		root_n.add_child(make_label_3d("StreetSignLabel", int_label, Vector3(4.2, 3.68, -4.2), Color("d6f5ef"), 0.011, 22))
		add_child(root_n)
		west_intersection_nodes.append(root_n)

func build_history_stops() -> void:
	history_stop_nodes.clear()
	history_beacon_meshes.clear()
	var stops: Array = data.get("history_stops", [])
	for stop in stops:
		var stop_id := String(stop.get("id", ""))
		var pt: Array = stop.get("pos", stop.get("point", [0.0, 0.0]))
		var s_node := Node3D.new()
		s_node.name = "HistoryStop_%s" % stop_id
		s_node.position = Vector3(float(pt[0]), 0.0, float(pt[1]))
		var ring_inst := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.top_radius = 0.78
		cyl.bottom_radius = 0.78
		cyl.height = 0.04
		ring_inst.mesh = cyl
		ring_inst.position = Vector3(0.0, 0.02, 0.0)
		ring_inst.material_override = material(Color("e6d7b8"))
		s_node.add_child(ring_inst)
		var ped_inst := MeshInstance3D.new()
		var ped_box := BoxMesh.new()
		ped_box.size = Vector3(0.42, 1.24, 0.30)
		ped_inst.mesh = ped_box
		ped_inst.position = Vector3(0.0, 0.62, 0.0)
		ped_inst.material_override = material(Color("4a3d33"))
		s_node.add_child(ped_inst)
		var plaque_inst := MeshInstance3D.new()
		plaque_inst.name = "HistoryPlaque"
		var plaque_box := BoxMesh.new()
		plaque_box.size = Vector3(0.76, 0.48, 0.14)
		plaque_inst.mesh = plaque_box
		plaque_inst.position = Vector3(0.0, 1.34, 0.0)
		plaque_inst.material_override = material(Color("c89d54"))
		s_node.add_child(plaque_inst)
		var beacon := MeshInstance3D.new()
		beacon.name = "HistoryBeacon"
		var b_cyl := CylinderMesh.new()
		b_cyl.top_radius = 0.22
		b_cyl.bottom_radius = 0.22
		b_cyl.height = 0.28
		beacon.mesh = b_cyl
		beacon.position = Vector3(0.0, 1.76, 0.0)
		s_node.add_child(beacon)
		var stop_label := "Compton's Cafeteria (1966)" if stop_id == "comptons" else "The Black Hawk (1949–63)"
		var stop_tint := Color("ffe394") if stop_id == "comptons" else Color("9ef5e5")
		s_node.add_child(make_label_3d("HistoryStopLabel", stop_label, Vector3(0.0, 2.32, 0.0), stop_tint, 0.0115, 23))
		history_stop_nodes[stop_id] = s_node
		history_beacon_meshes[stop_id] = beacon
		add_child(s_node)
	update_history_stops_3d()

func update_history_stops_3d() -> void:
	for stop_id in HISTORY_STOP_IDS:
		if not history_beacon_meshes.has(stop_id):
			continue
		var beacon: MeshInstance3D = history_beacon_meshes[stop_id]
		var discovered := history_read if stop_id == "comptons" else blackhawk_discovered
		if discovered:
			beacon.material_override = mural_material(Color("f8cc58") if stop_id == "comptons" else Color("5fd4ba"))
		else:
			beacon.material_override = material(Color("8a7964"))

func attach_neighbor_signature_prop(n_node: Node3D, n_id: String) -> void:
	var prop := Node3D.new()
	prop.name = "NeighborProp"
	match n_id:
		"bea":
			# Rollator walker (#496557 frame + dark wheels) matching public/keepsake.js
			var bar := MeshInstance3D.new()
			var bar_box := BoxMesh.new()
			bar_box.size = Vector3(0.50, 0.05, 0.05)
			bar.mesh = bar_box
			bar.position = Vector3(0.0, 0.78, 0.34)
			bar.material_override = material(Color("496557"))
			prop.add_child(bar)
			for side_x in [-0.22, 0.22]:
				var leg := MeshInstance3D.new()
				var leg_box := BoxMesh.new()
				leg_box.size = Vector3(0.05, 0.72, 0.05)
				leg.mesh = leg_box
				leg.position = Vector3(side_x, 0.40, 0.34)
				leg.material_override = material(Color("496557"))
				prop.add_child(leg)
				var wheel := MeshInstance3D.new()
				var w_cyl := CylinderMesh.new()
				w_cyl.top_radius = 0.08
				w_cyl.bottom_radius = 0.08
				w_cyl.height = 0.04
				wheel.mesh = w_cyl
				wheel.rotation_degrees = Vector3(0.0, 0.0, 90.0)
				wheel.position = Vector3(side_x, 0.08, 0.36)
				wheel.material_override = material(Color("24312b"))
				prop.add_child(wheel)
		"celeste":
			# Painter palette with 3 bright motif paint dabs + brush
			var pal := MeshInstance3D.new()
			var pal_box := BoxMesh.new()
			pal_box.size = Vector3(0.32, 0.04, 0.24)
			pal.mesh = pal_box
			pal.position = Vector3(0.34, 0.96, 0.18)
			pal.material_override = material(Color("d8b48a"))
			prop.add_child(pal)
			var dab_cols: Array[Color] = [Color("f8cc58"), Color("5fd4ba"), Color("ee835c")]
			for d_i in range(dab_cols.size()):
				var dab := MeshInstance3D.new()
				var dab_box := BoxMesh.new()
				dab_box.size = Vector3(0.06, 0.03, 0.06)
				dab.mesh = dab_box
				dab.position = Vector3(0.26 + float(d_i) * 0.08, 0.99, 0.18)
				dab.material_override = mural_material(dab_cols[d_i])
				prop.add_child(dab)
		"rook":
			# Sunburst archtop guitar slung at Rook's side
			var body_m := MeshInstance3D.new()
			var body_cyl := CylinderMesh.new()
			body_cyl.top_radius = 0.19
			body_cyl.bottom_radius = 0.19
			body_cyl.height = 0.07
			body_m.mesh = body_cyl
			body_m.rotation_degrees = Vector3(90.0, 0.0, -18.0)
			body_m.position = Vector3(0.24, 0.90, 0.20)
			body_m.material_override = material(Color("c87d44"))
			prop.add_child(body_m)
			var neck_m := MeshInstance3D.new()
			var neck_box := BoxMesh.new()
			neck_box.size = Vector3(0.06, 0.44, 0.04)
			neck_m.mesh = neck_box
			neck_m.rotation_degrees = Vector3(0.0, 0.0, -28.0)
			neck_m.position = Vector3(0.08, 1.12, 0.22)
			neck_m.material_override = material(Color("4a3525"))
			prop.add_child(neck_m)
		"dez":
			# Golden studio headphones (#dfc57f) matching public/keepsake.js + field notebook
			for ear_x in [-0.20, 0.20]:
				var cup := MeshInstance3D.new()
				var cup_cyl := CylinderMesh.new()
				cup_cyl.top_radius = 0.06
				cup_cyl.bottom_radius = 0.06
				cup_cyl.height = 0.04
				cup.mesh = cup_cyl
				cup.rotation_degrees = Vector3(0.0, 0.0, 90.0)
				cup.position = Vector3(ear_x, 1.48, 0.0)
				cup.material_override = mural_material(Color("dfc57f"))
				prop.add_child(cup)
			var notebook := MeshInstance3D.new()
			var nb_box := BoxMesh.new()
			nb_box.size = Vector3(0.18, 0.24, 0.04)
			notebook.mesh = nb_box
			notebook.position = Vector3(-0.32, 0.96, 0.18)
			notebook.material_override = material(Color("5fb8a6"))
			prop.add_child(notebook)
		"thanh":
			# Cedar tea & folding-stool supply crate beside Thanh
			var crate := MeshInstance3D.new()
			var crate_box := BoxMesh.new()
			crate_box.size = Vector3(0.42, 0.34, 0.32)
			crate.mesh = crate_box
			crate.position = Vector3(0.46, 0.17, 0.14)
			crate.material_override = material(Color("a9784d"))
			prop.add_child(crate)
			var thermos := MeshInstance3D.new()
			var t_cyl := CylinderMesh.new()
			t_cyl.top_radius = 0.07
			t_cyl.bottom_radius = 0.07
			t_cyl.height = 0.22
			thermos.mesh = t_cyl
			thermos.position = Vector3(0.46, 0.45, 0.14)
			thermos.material_override = material(Color("6a8d73"))
			prop.add_child(thermos)
	n_node.add_child(prop)

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
		attach_neighbor_signature_prop(n_node, n_id)
		n_node.add_child(make_label_3d("Nameplate", "%s · %s" % [n.name, String(n.get("role", "")).split(" ")[0]], Vector3(0.0, 2.06, 0.0), Color("fff6df"), 0.011, 22))
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
	player_visual.add_child(make_label_3d("PlayerNameplate", "You", Vector3(0.0, 2.08, 0.0), Color("fff3b0"), 0.011, 22))
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

func programme_segment_color(segment_id: String, hosted: bool) -> Color:
	match segment_id:
		"stories":
			return Color("f8cc58") if hosted else Color("e5b66d")
		"beats":
			return Color("b8e6ee") if hosted else Color("91bac2")
		"art":
			return Color("f1bed0") if hosted else Color("d9a2b2")
		_:
			return Color("c6deb0") if hosted else Color("a3b48c")

func hosting_tile_color(palette_id: String, tile_val: int) -> Color:
	var idx := clampi(tile_val, 0, 2)
	match palette_id:
		"cool":
			var cool_cols: Array[Color] = [Color("91bac2"), Color("a3b48c"), Color("987b9e")]
			return cool_cols[idx]
		_:
			var warm_cols: Array[Color] = [Color("e5b66d"), Color("d9a2b2"), Color("75907c")]
			return warm_cols[idx]

func build_block_banner() -> void:
	block_banner_node = Node3D.new()
	block_banner_node.name = "BlockGatheringBanner"
	var banner_pos: Vector3 = neighbors[0].pos + BLOCK_BANNER_OFFSET
	block_banner_node.position = banner_pos
	var st := nearest_street_tangent(Vector2(banner_pos.x, banner_pos.z))
	var street_t := -st if st.x < 0.0 else st
	var banner_rot_y := atan2(-street_t.y, street_t.x)
	block_banner_node.rotation.y = banner_rot_y
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

	keepsake_frame_node = Node3D.new()
	keepsake_frame_node.name = "KeepsakePhotoEasel"
	keepsake_frame_node.position = neighbors[0].pos + Vector3(1.85, 0.0, -0.45)
	keepsake_frame_node.rotation.y = banner_rot_y
	var k_frame := MeshInstance3D.new()
	var k_frame_box := BoxMesh.new()
	k_frame_box.size = Vector3(1.10, 0.86, 0.10)
	k_frame.mesh = k_frame_box
	k_frame.position = Vector3(0.0, 1.18, 0.0)
	k_frame.material_override = material(Color("5a402d"))
	keepsake_frame_node.add_child(k_frame)
	keepsake_canvas_mesh = MeshInstance3D.new()
	keepsake_canvas_mesh.name = "KeepsakePhotoCanvas"
	var k_canvas_box := BoxMesh.new()
	k_canvas_box.size = Vector3(0.94, 0.70, 0.12)
	keepsake_canvas_mesh.mesh = k_canvas_box
	keepsake_canvas_mesh.position = Vector3(0.0, 1.18, 0.02)
	keepsake_canvas_mesh.material_override = mural_material(mural_palette_color("garden", true))
	keepsake_frame_node.add_child(keepsake_canvas_mesh)
	keepsake_guest_pips.clear()
	for g_idx in range(PHOTO_GUESTS.size()):
		var g_id := PHOTO_GUESTS[g_idx]
		var pip := MeshInstance3D.new()
		pip.name = "KeepsakeGuestPip_%s" % g_id
		var pip_cyl := CylinderMesh.new()
		pip_cyl.top_radius = 0.07
		pip_cyl.bottom_radius = 0.07
		pip_cyl.height = 0.14
		pip.mesh = pip_cyl
		pip.rotation_degrees = Vector3(90.0, 0.0, 0.0)
		pip.position = Vector3(-0.30 + float(g_idx) * 0.20, 0.96, 0.05)
		pip.material_override = mural_material(Color("f8cc58"))
		keepsake_frame_node.add_child(pip)
		keepsake_guest_pips[g_id] = pip
	keepsake_frame_node.visible = false
	add_child(keepsake_frame_node)

	loan_return_beacons.clear()
	var loan_positions: Dictionary = {
		"table": neighbors[4].pos + Vector3(0.95, 0.32, 0.0),
		"paint-case": neighbors[1].pos + Vector3(-0.95, 0.32, 0.0),
		"speaker": ROOK_SPEAKER_POS + Vector3(0.62, 0.32, 0.0)
	}
	for lid in LOAN_IDS:
		var l_beacon := MeshInstance3D.new()
		l_beacon.name = "LoanBeacon_%s" % lid
		var l_box := BoxMesh.new()
		l_box.size = Vector3(0.38, 0.32, 0.30)
		l_beacon.mesh = l_box
		l_beacon.position = loan_positions[lid]
		l_beacon.material_override = material(Color("8a7964"))
		l_beacon.visible = false
		add_child(l_beacon)
		loan_return_beacons[lid] = l_beacon

	programme_board_node = Node3D.new()
	programme_board_node.name = "ProgrammeSignboard"
	programme_board_node.position = neighbors[0].pos + Vector3(-1.85, 0.0, -0.45)
	programme_board_node.rotation.y = banner_rot_y
	var p_board := MeshInstance3D.new()
	var p_box := BoxMesh.new()
	p_box.size = Vector3(1.06, 1.32, 0.10)
	p_board.mesh = p_box
	p_board.position = Vector3(0.0, 1.24, 0.0)
	p_board.material_override = material(Color("4a3d33"))
	programme_board_node.add_child(p_board)
	programme_segment_bars.clear()
	for s_idx in range(PROGRAMME_SEGMENTS.size()):
		var s_bar := MeshInstance3D.new()
		s_bar.name = "ProgrammeSegmentBar%d" % s_idx
		var s_bar_box := BoxMesh.new()
		s_bar_box.size = Vector3(0.88, 0.18, 0.12)
		s_bar.mesh = s_bar_box
		s_bar.position = Vector3(0.0, 1.62 - float(s_idx) * 0.25, 0.02)
		s_bar.material_override = mural_material(programme_segment_color(PROGRAMME_DEFAULT_ORDER[s_idx], false))
		programme_board_node.add_child(s_bar)
		programme_segment_bars.append(s_bar)
	programme_board_node.visible = false
	add_child(programme_board_node)

	hosting_tile_panel_node = Node3D.new()
	hosting_tile_panel_node.name = "HostingArtTilePanel"
	hosting_tile_panel_node.position = MURAL_POS + Vector3(2.35, 0.0, 0.0)
	var m_t := mural_tangent()
	hosting_tile_panel_node.rotation.y = atan2(-m_t.y, m_t.x)
	var h_frame := MeshInstance3D.new()
	var h_frame_box := BoxMesh.new()
	h_frame_box.size = Vector3(1.24, 0.92, 0.10)
	h_frame.mesh = h_frame_box
	h_frame.position = Vector3(0.0, 1.32, 0.0)
	h_frame.material_override = material(Color("5a402d"))
	hosting_tile_panel_node.add_child(h_frame)
	hosting_tile_meshes.clear()
	for t_idx in range(6):
		var t_mesh := MeshInstance3D.new()
		t_mesh.name = "HostingTile%d" % t_idx
		var t_box := BoxMesh.new()
		t_box.size = Vector3(0.30, 0.30, 0.12)
		t_mesh.mesh = t_box
		var tc := t_idx % 3
		var tr := int(t_idx / 3)
		t_mesh.position = Vector3(-0.36 + float(tc) * 0.36, 1.50 - float(tr) * 0.36, 0.02)
		t_mesh.material_override = mural_material(hosting_tile_color("warm", HOSTING_DEFAULT_TILES[t_idx]))
		hosting_tile_panel_node.add_child(t_mesh)
		hosting_tile_meshes.append(t_mesh)
	hosting_tile_panel_node.visible = false
	add_child(hosting_tile_panel_node)

	civic_setup_node = Node3D.new()
	civic_setup_node.name = "CivicListeningSetup"
	civic_setup_node.position = neighbors[0].pos + Vector3(3.40, 0.0, -0.45)
	civic_setup_node.rotation.y = banner_rot_y
	civic_circle_group = Node3D.new()
	civic_circle_group.name = "CivicCircleGroup"
	var circle_offsets: Array[Vector3] = [
		Vector3(-0.48, 0.24, -0.28),
		Vector3(0.48, 0.24, -0.28),
		Vector3(-0.48, 0.24, 0.28),
		Vector3(0.48, 0.24, 0.28)
	]
	for c_i in range(circle_offsets.size()):
		var c_stool := MeshInstance3D.new()
		c_stool.name = "CivicCircleStool%d" % c_i
		var c_cyl := CylinderMesh.new()
		c_cyl.top_radius = 0.20
		c_cyl.bottom_radius = 0.18
		c_cyl.height = 0.48
		c_stool.mesh = c_cyl
		c_stool.position = circle_offsets[c_i]
		c_stool.material_override = material(Color("75907c"))
		civic_circle_group.add_child(c_stool)
	var c_board := MeshInstance3D.new()
	var c_board_box := BoxMesh.new()
	c_board_box.size = Vector3(0.68, 0.52, 0.08)
	c_board.mesh = c_board_box
	c_board.position = Vector3(0.0, 0.92, -0.42)
	c_board.material_override = material(Color("d9a2b2"))
	civic_circle_group.add_child(c_board)
	civic_setup_node.add_child(civic_circle_group)

	civic_dropin_group = Node3D.new()
	civic_dropin_group.name = "CivicDropinGroup"
	var d_table := MeshInstance3D.new()
	var d_table_box := BoxMesh.new()
	d_table_box.size = Vector3(1.24, 0.72, 0.42)
	d_table.mesh = d_table_box
	d_table.position = Vector3(0.0, 0.36, -0.18)
	d_table.material_override = material(Color("d9a2b2"))
	civic_dropin_group.add_child(d_table)
	for d_i in range(2):
		var d_stool := MeshInstance3D.new()
		d_stool.name = "CivicDropinStool%d" % d_i
		var d_cyl := CylinderMesh.new()
		d_cyl.top_radius = 0.20
		d_cyl.bottom_radius = 0.18
		d_cyl.height = 0.48
		d_stool.mesh = d_cyl
		d_stool.position = Vector3(-0.34 + float(d_i) * 0.68, 0.24, 0.32)
		d_stool.material_override = material(Color("75907c"))
		civic_dropin_group.add_child(d_stool)
	civic_setup_node.add_child(civic_dropin_group)

	civic_done_beacon = MeshInstance3D.new()
	civic_done_beacon.name = "CivicDoneBeacon"
	var cb_sphere := SphereMesh.new()
	cb_sphere.radius = 0.16
	cb_sphere.height = 0.32
	civic_done_beacon.mesh = cb_sphere
	civic_done_beacon.position = Vector3(0.0, 1.38, -0.42)
	civic_done_beacon.material_override = material(Color("8a7964"))
	civic_setup_node.add_child(civic_done_beacon)
	civic_setup_node.visible = false
	add_child(civic_setup_node)

	film_storyboard_node = Node3D.new()
	film_storyboard_node.name = "FilmStoryboardEasel"
	film_storyboard_node.position = MURAL_POS + Vector3(-2.35, 0.0, 0.0)
	film_storyboard_node.rotation.y = atan2(-m_t.y, m_t.x)
	var f_frame := MeshInstance3D.new()
	var f_frame_box := BoxMesh.new()
	f_frame_box.size = Vector3(1.16, 0.88, 0.10)
	f_frame.mesh = f_frame_box
	f_frame.position = Vector3(0.0, 1.28, 0.0)
	f_frame.material_override = material(Color("253f35"))
	film_storyboard_node.add_child(f_frame)
	film_frame_canvas = MeshInstance3D.new()
	film_frame_canvas.name = "FilmFrameCanvas"
	var f_canvas_box := BoxMesh.new()
	f_canvas_box.size = Vector3(0.96, 0.62, 0.12)
	film_frame_canvas.mesh = f_canvas_box
	film_frame_canvas.position = Vector3(0.0, 1.32, 0.02)
	film_frame_canvas.material_override = mural_material(Color("276a5a"))
	film_storyboard_node.add_child(film_frame_canvas)
	film_wide_border = MeshInstance3D.new()
	film_wide_border.name = "FilmWideBorder"
	var f_wide_box := BoxMesh.new()
	f_wide_box.size = Vector3(0.92, 0.10, 0.14)
	film_wide_border.mesh = f_wide_box
	film_wide_border.position = Vector3(0.0, 1.06, 0.03)
	film_wide_border.material_override = mural_material(Color("c38c65"))
	film_wide_border.visible = false
	film_storyboard_node.add_child(film_wide_border)
	film_shot_pips.clear()
	for s_i in range(FILM_SHOTS.size()):
		var f_pip := MeshInstance3D.new()
		f_pip.name = "FilmShotPip%d" % s_i
		var f_pip_cyl := CylinderMesh.new()
		f_pip_cyl.top_radius = 0.07
		f_pip_cyl.bottom_radius = 0.07
		f_pip_cyl.height = 0.14
		f_pip.mesh = f_pip_cyl
		f_pip.rotation_degrees = Vector3(90.0, 0.0, 0.0)
		f_pip.position = Vector3(-0.28 + float(s_i) * 0.28, 0.92, 0.04)
		f_pip.material_override = material(Color("5a665f"))
		film_storyboard_node.add_child(f_pip)
		film_shot_pips.append(f_pip)
	film_storyboard_node.visible = false
	add_child(film_storyboard_node)
	update_block_3d()

func film_shot_color(shot_id: String) -> Color:
	match shot_id:
		"paint":
			return Color("d9a2b2")
		"welcome":
			return Color("91bac2")
		_:
			return Color("276a5a")

func update_block_3d() -> void:
	if block_banner_node != null:
		block_banner_node.visible = block_opened
	if keepsake_frame_node != null:
		var photo_taken := block_opened and String(keepsake_photo.get("status", "unasked")) == "taken"
		keepsake_frame_node.visible = photo_taken
		if photo_taken and keepsake_canvas_mesh != null:
			var k_pal := String(keepsake_photo.get("palette", "garden"))
			keepsake_canvas_mesh.material_override = mural_material(mural_palette_color(k_pal, true))
			var parts: Array = keepsake_photo.get("participants", [])
			for g_id in PHOTO_GUESTS:
				if keepsake_guest_pips.has(g_id):
					var pip_mesh: MeshInstance3D = keepsake_guest_pips[g_id]
					pip_mesh.visible = parts.has(g_id)
	for lid in LOAN_IDS:
		if loan_return_beacons.has(lid):
			var l_beacon: MeshInstance3D = loan_return_beacons[lid]
			var returned := epilogue_returned.has(lid)
			l_beacon.visible = block_opened and (epilogue_packing or returned)
			l_beacon.material_override = mural_material(Color("f8cc58")) if returned else material(Color("8a7964"))
	if programme_board_node != null:
		var board_order: Array[String] = hosting_order if not hosting_order.is_empty() else programme_published
		var pub_ready := block_opened and board_order.size() == PROGRAMME_SEGMENTS.size()
		programme_board_node.visible = pub_ready
		if pub_ready:
			for s_idx in range(mini(programme_segment_bars.size(), board_order.size())):
				var seg_id := board_order[s_idx]
				var hosted := has_hosted_segment(seg_id)
				programme_segment_bars[s_idx].material_override = mural_material(programme_segment_color(seg_id, hosted))
	if hosting_tile_panel_node != null:
		var art_val: Variant = get_hosted_segment_value("art")
		var art_done := block_opened and (art_val is Dictionary)
		hosting_tile_panel_node.visible = art_done
		if art_done:
			var art_dict: Dictionary = art_val
			var h_pal := String(art_dict.get("palette", "warm"))
			var h_tiles: Array = art_dict.get("tiles", HOSTING_DEFAULT_TILES)
			for t_idx in range(hosting_tile_meshes.size()):
				var tv := int(h_tiles[t_idx]) if t_idx < h_tiles.size() else 0
				hosting_tile_meshes[t_idx].material_override = mural_material(hosting_tile_color(h_pal, tv))
	if civic_setup_node != null:
		var c_vis := is_civic_available() and (civic_phase in ["meeting", "done"]) and not civic_result.is_empty()
		civic_setup_node.visible = c_vis
		if c_vis:
			var c_fmt := String(civic_result.get("format", "circle"))
			if civic_circle_group != null:
				civic_circle_group.visible = (c_fmt == "circle")
			if civic_dropin_group != null:
				civic_dropin_group.visible = (c_fmt == "dropin")
			if civic_done_beacon != null:
				civic_done_beacon.material_override = mural_material(Color("f8cc58")) if civic_phase == "done" else material(Color("8a7964"))
	if film_storyboard_node != null:
		var f_vis := is_film_available() and (film_phase in ["hold", "shooting", "done"]) and not film_result.is_empty()
		film_storyboard_node.visible = f_vis
		if f_vis:
			var f_framing := String(film_result.get("framing", "close"))
			if film_wide_border != null:
				film_wide_border.visible = (f_framing == "wide")
			var f_ord: Array = film_result.get("order", FILM_SHOTS)
			var active_shot := "seat"
			if f_ord.size() == 3:
				if film_phase == "done":
					active_shot = String(f_ord[clampi(film_screen_frame, 0, 2)])
				elif film_phase == "shooting" and film_captured.size() < 3:
					active_shot = String(f_ord[film_captured.size()])
				else:
					active_shot = String(f_ord[0])
			if film_frame_canvas != null:
				film_frame_canvas.material_override = mural_material(film_shot_color(active_shot))
			for p_i in range(film_shot_pips.size()):
				var is_cap := p_i < film_captured.size()
				film_shot_pips[p_i].material_override = mural_material(Color("f8cc58")) if is_cap else material(Color("5a665f"))

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
	var shoe_h := total_height * 0.06
	var leg_h := total_height * 0.36
	var legs_top := shoe_h + leg_h
	for leg_side in [-0.11, 0.11]:
		var shoe := MeshInstance3D.new()
		var shoe_mesh := BoxMesh.new()
		shoe_mesh.size = Vector3(0.16, shoe_h, 0.28)
		shoe.mesh = shoe_mesh
		shoe.position = Vector3(leg_side, shoe_h * 0.5, 0.03)
		shoe.material_override = material(Color("232c29"))
		root_node.add_child(shoe)
		var leg := MeshInstance3D.new()
		var leg_mesh := BoxMesh.new()
		leg_mesh.size = Vector3(0.16, leg_h, 0.22)
		leg.mesh = leg_mesh
		leg.position = Vector3(leg_side, shoe_h + leg_h * 0.5, 0.0)
		leg.material_override = material(Color("34463f"))
		root_node.add_child(leg)
	var torso := MeshInstance3D.new()
	var torso_mesh := BoxMesh.new()
	var torso_h := total_height * 0.36
	torso_mesh.size = Vector3(0.46, torso_h, 0.28)
	torso.mesh = torso_mesh
	torso.position = Vector3(0.0, legs_top + torso_h * 0.5, 0.0)
	torso.material_override = material(coat)
	root_node.add_child(torso)
	var collar := MeshInstance3D.new()
	var collar_mesh := BoxMesh.new()
	var collar_h := total_height * 0.045
	collar_mesh.size = Vector3(0.48, collar_h, 0.30)
	collar.mesh = collar_mesh
	collar.position = Vector3(0.0, legs_top + torso_h - collar_h * 0.5, 0.0)
	collar.material_override = material(coat.lightened(0.22))
	root_node.add_child(collar)
	var arm_h := torso_h * 0.82
	var hand_h := torso_h * 0.16
	for arm_side in [-0.30, 0.30]:
		var arm := MeshInstance3D.new()
		var arm_mesh := BoxMesh.new()
		arm_mesh.size = Vector3(0.12, arm_h, 0.16)
		arm.mesh = arm_mesh
		arm.position = Vector3(arm_side, legs_top + torso_h - arm_h * 0.5 - 0.02, 0.0)
		arm.material_override = material(coat.darkened(0.06))
		root_node.add_child(arm)
		var hand := MeshInstance3D.new()
		var hand_mesh := BoxMesh.new()
		hand_mesh.size = Vector3(0.10, hand_h, 0.12)
		hand.mesh = hand_mesh
		hand.position = Vector3(arm_side, legs_top + hand_h * 0.5 + 0.02, 0.02)
		hand.material_override = material(skin)
		root_node.add_child(hand)
	var head := MeshInstance3D.new()
	var head_mesh := BoxMesh.new()
	var head_h := total_height * 0.16
	head_mesh.size = Vector3(0.32, head_h, 0.32)
	head.mesh = head_mesh
	head.position = Vector3(0.0, legs_top + torso_h + head_h * 0.5, 0.0)
	head.material_override = material(skin)
	root_node.add_child(head)
	var cap := MeshInstance3D.new()
	var cap_mesh := BoxMesh.new()
	var cap_h := total_height - (legs_top + torso_h + head_h)
	cap_mesh.size = Vector3(0.35, cap_h, 0.35)
	cap.mesh = cap_mesh
	cap.position = Vector3(0.0, total_height - cap_h * 0.5, 0.0)
	cap.material_override = material(hair)
	root_node.add_child(cap)
	return root_node

func build_street_life_decor() -> void:
	var decor_root := Node3D.new()
	decor_root.name = "StreetLifeDecor"
	# 1. Dodge Alley Block Concert (Dodge Place off north side of 400 block of Turk St near Hyde)
	var concert := Node3D.new()
	concert.name = "DodgeAlleyConcert"
	concert.position = Vector3(-414.0, 0.0, 56.0)
	var stage_deck := MeshInstance3D.new()
	stage_deck.name = "StageDeck"
	var deck_box := BoxMesh.new()
	deck_box.size = Vector3(4.6, 0.26, 2.8)
	stage_deck.mesh = deck_box
	stage_deck.position = Vector3(0.0, 0.13, 0.0)
	stage_deck.material_override = material(Color("7a563c"))
	concert.add_child(stage_deck)
	var stage_trim := MeshInstance3D.new()
	var trim_box := BoxMesh.new()
	trim_box.size = Vector3(4.64, 0.08, 2.84)
	stage_trim.mesh = trim_box
	stage_trim.position = Vector3(0.0, 0.24, 0.0)
	stage_trim.material_override = mural_material(Color("f5d57a"))
	concert.add_child(stage_trim)
	var backdrop := MeshInstance3D.new()
	backdrop.name = "StageBackdrop"
	var back_box := BoxMesh.new()
	back_box.size = Vector3(4.4, 2.35, 0.16)
	backdrop.mesh = back_box
	backdrop.position = Vector3(0.0, 1.44, -1.32)
	backdrop.material_override = material(Color("23474b"))
	concert.add_child(backdrop)
	for slat_i in range(5):
		var slat := MeshInstance3D.new()
		var slat_box := BoxMesh.new()
		slat_box.size = Vector3(0.18, 1.85, 0.08)
		slat.mesh = slat_box
		slat.position = Vector3(-1.60 + float(slat_i) * 0.80, 1.44, -1.21)
		slat.material_override = mural_material(Color("f8cc58") if slat_i % 2 == 0 else Color("ee835c"))
		concert.add_child(slat)
	for post_x in [-2.15, 2.15]:
		var post := MeshInstance3D.new()
		var post_box := BoxMesh.new()
		post_box.size = Vector3(0.12, 3.10, 0.12)
		post.mesh = post_box
		post.position = Vector3(post_x, 1.55, 1.25)
		post.material_override = material(Color("3b494c"))
		concert.add_child(post)
		var mon := MeshInstance3D.new()
		var mon_box := BoxMesh.new()
		mon_box.size = Vector3(0.56, 0.34, 0.42)
		mon.mesh = mon_box
		mon.position = Vector3(post_x * 0.65, 0.43, 1.05)
		mon.material_override = material(Color("2e3538"))
		concert.add_child(mon)
	var arch_bar := MeshInstance3D.new()
	arch_bar.name = "ConcertLightArch"
	var arch_box := BoxMesh.new()
	arch_box.size = Vector3(4.50, 0.14, 0.14)
	arch_bar.mesh = arch_box
	arch_bar.position = Vector3(0.0, 3.12, 1.25)
	arch_bar.material_override = mural_material(Color("5fd4ba"))
	concert.add_child(arch_bar)
	var bulb_cols: Array[Color] = [Color("ffe394"), Color("ee835c"), Color("5fd4ba"), Color("f8cc58"), Color("ffe394")]
	for b_i in range(bulb_cols.size()):
		var bulb := MeshInstance3D.new()
		var b_sphere := SphereMesh.new()
		b_sphere.radius = 0.13
		b_sphere.height = 0.26
		bulb.mesh = b_sphere
		bulb.position = Vector3(-1.76 + float(b_i) * 0.88, 2.94, 1.25)
		bulb.material_override = mural_material(bulb_cols[b_i])
		concert.add_child(bulb)
	concert.add_child(make_label_3d("ConcertBannerLabel", "Dodge Alley Block Concert · Live Jazz", Vector3(0.0, 3.65, 0.60), Color("ffe394"), 0.012, 24))
	# 3-piece Dodge Alley jazz combo on stage
	var bassist := make_person_node("ConcertBassist", Color("c86d51"), Color("8d5b3e"), Color("222629"), 1.68, false)
	bassist.position = Vector3(-1.35, 0.26, -0.20)
	var bass_body := MeshInstance3D.new()
	var bb_box := BoxMesh.new()
	bb_box.size = Vector3(0.36, 0.88, 0.20)
	bass_body.mesh = bb_box
	bass_body.position = Vector3(0.30, 0.62, 0.22)
	bass_body.material_override = material(Color("8c4b2b"))
	bassist.add_child(bass_body)
	concert.add_child(bassist)
	var horn_player := make_person_node("ConcertHornPlayer", Color("49877a"), Color("b9825f"), Color("2f251e"), 1.70, false)
	horn_player.position = Vector3(0.0, 0.26, -0.05)
	var sax := MeshInstance3D.new()
	var sax_box := BoxMesh.new()
	sax_box.size = Vector3(0.12, 0.46, 0.22)
	sax.mesh = sax_box
	sax.position = Vector3(0.14, 1.04, 0.28)
	sax.material_override = mural_material(Color("f8cc58"))
	horn_player.add_child(sax)
	concert.add_child(horn_player)
	var drummer := make_person_node("ConcertDrummer", Color("d49b4b"), Color("6e4730"), Color("1e2224"), 1.66, false)
	drummer.position = Vector3(1.35, 0.26, -0.25)
	var drum_shell := MeshInstance3D.new()
	var ds_cyl := CylinderMesh.new()
	ds_cyl.top_radius = 0.28
	ds_cyl.bottom_radius = 0.28
	ds_cyl.height = 0.36
	drum_shell.mesh = ds_cyl
	drum_shell.position = Vector3(-0.10, 0.42, 0.42)
	drum_shell.material_override = material(Color("d96b43"))
	drummer.add_child(drum_shell)
	var cymbal := MeshInstance3D.new()
	var cym_cyl := CylinderMesh.new()
	cym_cyl.top_radius = 0.24
	cym_cyl.bottom_radius = 0.24
	cym_cyl.height = 0.03
	cymbal.mesh = cym_cyl
	cymbal.position = Vector3(-0.38, 0.92, 0.42)
	cymbal.material_override = mural_material(Color("f5d57a"))
	drummer.add_child(cymbal)
	concert.add_child(drummer)
	# Two sidewalk listeners in the Dodge Alley apron (north of z=58.05, clear of Turk St route)
	var listener_a := make_person_node("ConcertListener1", Color("6b8e78"), Color("c48f6b"), Color("322822"), 1.66, false)
	listener_a.position = Vector3(-2.15, 0.0, 2.00)
	listener_a.rotation.y = PI
	concert.add_child(listener_a)
	var listener_b := make_person_node("ConcertListener2", Color("b56c82"), Color("825439"), Color("23272a"), 1.68, false)
	listener_b.position = Vector3(2.15, 0.0, 2.00)
	listener_b.rotation.y = PI
	concert.add_child(listener_b)
	decor_root.add_child(concert)

	# 2. Warm sidewalk globe streetlamps & timber planter trees along Turk & Taylor and West Turk
	var lamp_coords: Array[Vector3] = [
		Vector3(36.0, 0.0, 4.2),
		Vector3(62.0, 0.0, 4.2),
		Vector3(96.0, 0.0, 4.2),
		Vector3(19.5, 0.0, 20.0),
		Vector3(-92.0, 0.0, 22.0),
		Vector3(-232.0, 0.0, 40.0),
		Vector3(-398.0, 0.0, 58.2)
	]
	for l_idx in range(lamp_coords.size()):
		var lamp := Node3D.new()
		lamp.name = "StreetLamp_%d" % l_idx
		lamp.position = lamp_coords[l_idx]
		var pole := MeshInstance3D.new()
		var pole_cyl := CylinderMesh.new()
		pole_cyl.top_radius = 0.06
		pole_cyl.bottom_radius = 0.09
		pole_cyl.height = 3.4
		pole.mesh = pole_cyl
		pole.position = Vector3(0.0, 1.7, 0.0)
		pole.material_override = material(Color("384649"))
		lamp.add_child(pole)
		var globe := MeshInstance3D.new()
		var g_sphere := SphereMesh.new()
		g_sphere.radius = 0.22
		g_sphere.height = 0.44
		globe.mesh = g_sphere
		globe.position = Vector3(0.0, 3.52, 0.0)
		globe.material_override = mural_material(Color("ffe8a3"))
		lamp.add_child(globe)
		decor_root.add_child(lamp)

	var planter_coords: Array[Vector3] = [
		Vector3(44.0, 0.0, 4.0),
		Vector3(82.0, 0.0, 4.0),
		Vector3(19.8, 0.0, 32.0),
		Vector3(-156.0, 0.0, 30.5),
		Vector3(-406.0, 0.0, 57.6)
	]
	for p_idx in range(planter_coords.size()):
		var planter := Node3D.new()
		planter.name = "StreetPlanter_%d" % p_idx
		planter.position = planter_coords[p_idx]
		var box_inst := MeshInstance3D.new()
		var p_box := BoxMesh.new()
		p_box.size = Vector3(0.92, 0.46, 0.92)
		box_inst.mesh = p_box
		box_inst.position = Vector3(0.0, 0.23, 0.0)
		box_inst.material_override = material(Color("6d4f38"))
		planter.add_child(box_inst)
		var trunk := MeshInstance3D.new()
		var t_cyl := CylinderMesh.new()
		t_cyl.top_radius = 0.08
		t_cyl.bottom_radius = 0.11
		t_cyl.height = 1.35
		trunk.mesh = t_cyl
		trunk.position = Vector3(0.0, 1.10, 0.0)
		trunk.material_override = material(Color("5a402d"))
		planter.add_child(trunk)
		var canopy := MeshInstance3D.new()
		var c_sphere := SphereMesh.new()
		c_sphere.radius = 0.78
		c_sphere.height = 1.42
		canopy.mesh = c_sphere
		canopy.position = Vector3(0.0, 2.15, 0.0)
		canopy.material_override = material(Color("4e7d5c") if p_idx % 2 == 0 else Color("5c8d67"))
		planter.add_child(canopy)
		decor_root.add_child(planter)

	var so_what_root := Node3D.new()
	so_what_root.name = "SoWhatEasterEgg"
	var turk_awning := Node3D.new()
	turk_awning.name = "SoWhatAwning_361Turk"
	turk_awning.position = Vector3(-350.0, 0.0, 65.8)
	var canopy_frame := MeshInstance3D.new()
	var c_box := BoxMesh.new()
	c_box.size = Vector3(6.4, 0.22, 1.8)
	canopy_frame.mesh = c_box
	canopy_frame.position = Vector3(0.0, 3.55, 0.0)
	canopy_frame.material_override = mural_material(Color("1c2842"))
	turk_awning.add_child(canopy_frame)
	for post_x in [-2.85, 2.85]:
		var post := MeshInstance3D.new()
		var p_cyl := CylinderMesh.new()
		p_cyl.top_radius = 0.06
		p_cyl.bottom_radius = 0.07
		p_cyl.height = 3.5
		post.mesh = p_cyl
		post.position = Vector3(post_x, 1.75, -0.78)
		post.material_override = mural_material(Color("d6a848"))
		turk_awning.add_child(post)
	var so_what_heights: Array[float] = [0.42, 0.56, 0.72, 0.64, 0.96, 0.82, 1.08, 0.92]
	var so_what_y_offsets: Array[float] = [3.62, 3.68, 3.76, 3.72, 3.92, 3.84, 4.02, 3.90]
	for b_idx in range(so_what_heights.size()):
		var bar := MeshInstance3D.new()
		bar.name = "SoWhatChordBar_%d" % b_idx
		var b_mesh := BoxMesh.new()
		var is_horn_chord := b_idx in [4, 6]
		b_mesh.size = Vector3(0.54 if is_horn_chord else 0.34, so_what_heights[b_idx], 0.16)
		bar.mesh = b_mesh
		bar.position = Vector3(-2.45 + float(b_idx) * 0.70, so_what_y_offsets[b_idx], -0.88)
		bar.material_override = mural_material(Color("f3c458") if is_horn_chord else Color("5ec2c6"))
		turk_awning.add_child(bar)
	var turk_lbl := make_label_3d("AwningLabel361Turk", "361 Turk · 'So What' Awning", Vector3(0.0, 4.7, -0.85), Color("ffe699"), 0.012, 22)
	turk_awning.add_child(turk_lbl)
	so_what_root.add_child(turk_awning)

	var leav_node := Node3D.new()
	leav_node.name = "EighthFloor_145Leavenworth"
	leav_node.position = Vector3(-290.8, 0.0, 99.4)
	var leav_canopy := MeshInstance3D.new()
	var lc_box := BoxMesh.new()
	lc_box.size = Vector3(1.6, 0.20, 4.2)
	leav_canopy.mesh = lc_box
	leav_canopy.position = Vector3(0.0, 3.55, 0.0)
	leav_canopy.material_override = mural_material(Color("1c2842"))
	leav_node.add_child(leav_canopy)
	for chord_idx in range(2):
		var l_bar := MeshInstance3D.new()
		var lb_box := BoxMesh.new()
		lb_box.size = Vector3(0.16, 0.88 if chord_idx == 0 else 1.02, 0.56)
		l_bar.mesh = lb_box
		l_bar.position = Vector3(0.82, 3.85 + float(chord_idx) * 0.10, -0.55 + float(chord_idx) * 1.10)
		l_bar.material_override = mural_material(Color("f3c458") if chord_idx == 1 else Color("5ec2c6"))
		leav_node.add_child(l_bar)
	var eighth_win := MeshInstance3D.new()
	eighth_win.name = "EighthFloorWindow"
	var ew_box := BoxMesh.new()
	ew_box.size = Vector3(1.15, 2.15, 2.65)
	eighth_win.mesh = ew_box
	eighth_win.position = Vector3(0.35, 24.6, 0.0)
	eighth_win.material_override = mural_material(Color("ffe082"))
	leav_node.add_child(eighth_win)
	var balcony := MeshInstance3D.new()
	var bal_box := BoxMesh.new()
	bal_box.size = Vector3(1.38, 0.46, 2.85)
	balcony.mesh = bal_box
	balcony.position = Vector3(0.45, 23.65, 0.0)
	balcony.material_override = mural_material(Color("2b3648"))
	leav_node.add_child(balcony)
	var turntable_lamp := MeshInstance3D.new()
	var tl_cyl := CylinderMesh.new()
	tl_cyl.top_radius = 0.36
	tl_cyl.bottom_radius = 0.24
	tl_cyl.height = 0.45
	turntable_lamp.mesh = tl_cyl
	turntable_lamp.position = Vector3(0.65, 24.35, 0.0)
	turntable_lamp.material_override = mural_material(Color("ff9e5e"))
	leav_node.add_child(turntable_lamp)
	var leav_lbl := make_label_3d("EighthFloorLabel", "145 Leavenworth · 8th Floor ★ ('So What')", Vector3(1.2, 26.6, 0.0), Color("ffe8a3"), 0.012, 24)
	leav_node.add_child(leav_lbl)
	so_what_root.add_child(leav_node)
	decor_root.add_child(so_what_root)

	add_child(decor_root)

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

func get_history_stop_record(stop_id: String) -> Dictionary:
	var stops: Array = data.get("history_stops", [])
	for item in stops:
		if String(item.get("id", "")) == stop_id:
			return item
	var fallback_pt := [BLACKHAWK_POS.x, BLACKHAWK_POS.z] if stop_id == "blackhawk" else [COMPTONS_POS.x, COMPTONS_POS.z]
	return { "id": stop_id, "name": stop_id, "pos": fallback_pt }

func history_stop_xz(stop_id: String) -> Vector2:
	var rec := get_history_stop_record(stop_id)
	var pt: Array = rec.get("pos", rec.get("point", []))
	if pt.size() >= 2:
		return Vector2(float(pt[0]), float(pt[1]))
	return Vector2(BLACKHAWK_POS.x, BLACKHAWK_POS.z) if stop_id == "blackhawk" else Vector2(COMPTONS_POS.x, COMPTONS_POS.z)

func comptons_xz() -> Vector2:
	return history_stop_xz("comptons")

func blackhawk_xz() -> Vector2:
	return history_stop_xz("blackhawk")

func history_stop_pos_3d(stop_id: String) -> Vector3:
	var xz := history_stop_xz(stop_id)
	return Vector3(xz.x, 0.0, xz.y)

func building_containing_point(pt: Vector2) -> String:
	for idx in range(all_buildings.size()):
		if not all_building_rects[idx].has_point(pt):
			continue
		var b: Dictionary = all_buildings[idx]
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

func min_wall_distance(pt: Vector2, cutoff: float = INF) -> float:
	var best := cutoff
	for idx in range(all_buildings.size()):
		if best < INF:
			if not all_building_rects[idx].grow(best).has_point(pt):
				continue
		elif rect_distance_2d(all_building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = all_buildings[idx]
		for polygon in b.polygons:
			for ring in polygon.rings:
				var r_size: int = ring.size()
				for i in range(r_size):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % r_size]
					var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
					if d < best:
						best = d
						if cutoff < INF:
							return best
	return best

func nearest_building_info(pt: Vector2) -> Dictionary:
	var best := INF
	var best_id := ""
	var best_tangent := Vector2(1.0, 0.0)
	for idx in range(all_buildings.size()):
		if rect_distance_2d(all_building_rects[idx], pt) >= best:
			continue
		var b: Dictionary = all_buildings[idx]
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

func min_street_distance(pt: Vector2, cutoff: float = INF) -> float:
	# When a finite cutoff is supplied, returns on the first street segment within cutoff.
	var best := INF
	var bound := cutoff
	for w_idx in range(street_ways.size()):
		if bound < INF:
			if not street_way_rects[w_idx].grow(bound).has_point(pt):
				continue
		elif rect_distance_2d(street_way_rects[w_idx], pt) >= best:
			continue
		var pts: Array = street_ways[w_idx].points
		for i in range(1, pts.size()):
			var p0: Array = pts[i - 1]
			var p1: Array = pts[i]
			var d := dist_to_segment_2d(pt, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1]))
			if d < best:
				best = d
				if d < bound:
					bound = d
				if cutoff < INF and best <= cutoff:
					return best
	return best

func nearest_street_tangent(pt: Vector2) -> Vector2:
	var best := INF
	var best_tangent := Vector2(1.0, 0.0)
	for w_idx in range(street_ways.size()):
		if rect_distance_2d(street_way_rects[w_idx], pt) >= best:
			continue
		var pts: Array = street_ways[w_idx].points
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
	if min_street_distance(pt, MAX_STREET_CORRIDOR_M) > MAX_STREET_CORRIDOR_M:
		return false
	if building_containing_point(pt) != "":
		return false
	if is_point_in_mural_footprint(pt, PLAYER_RADIUS_M):
		return false
	if is_point_in_speaker_footprint(pt, PLAYER_RADIUS_M):
		return false
	if min_wall_distance(pt, clearance) < clearance:
		return false
	return true

func segment_walkable(a: Vector2, b: Vector2, clearance: float = WALK_CLEARANCE_M) -> bool:
	var dist := a.distance_to(b)
	if dist > 1.0:
		if not is_walkable_point(a.lerp(b, 0.5), clearance):
			return false
		if dist > 4.0:
			for frac in [0.25, 0.75, 0.125, 0.375, 0.625, 0.875, 0.05, 0.95]:
				if not is_walkable_point(a.lerp(b, frac), clearance):
					return false
	var step_sz := 0.45 if dist > 16.0 else 0.20
	var steps := maxi(1, int(ceil(dist / step_sz)))
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
	last_astar_expanded_cells = 0
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
	var open_set: Array[Vector2i] = [s_cell]
	var in_open: Dictionary = {s_cell: true}
	var closed_set: Dictionary = {}
	var g_score: Dictionary = {s_cell: 0.0}
	var f_score: Dictionary = {s_cell: Vector2(s_cell - g_cell).length()}
	var parent: Dictionary = {s_cell: null}
	var found := false
	var reached_cell := s_cell
	var expanded := 0
	while not open_set.is_empty() and expanded < max_cells:
		var best_idx := 0
		var best_f := float(f_score.get(open_set[0], INF))
		for idx_o in range(1, open_set.size()):
			var cand_f := float(f_score.get(open_set[idx_o], INF))
			if cand_f < best_f:
				best_f = cand_f
				best_idx = idx_o
		var cur: Vector2i = open_set[best_idx]
		open_set[best_idx] = open_set.back()
		open_set.pop_back()
		in_open.erase(cur)
		closed_set[cur] = true
		expanded += 1
		if cur.distance_to(g_cell) <= 1.5 and segment_walkable(cell_to_world.call(cur), safe_goal):
			reached_cell = cur
			found = true
			break
		var cur_g := float(g_score.get(cur, 0.0))
		for d in dirs:
			var nxt: Vector2i = cur + d
			if closed_set.has(nxt) or not is_cell_passable.call(nxt):
				continue
			var step_cost := 1.0
			if d.x != 0 and d.y != 0:
				if not is_cell_passable.call(Vector2i(cur.x + d.x, cur.y)) or not is_cell_passable.call(Vector2i(cur.x, cur.y + d.y)):
					continue
				step_cost = 1.41421356
			var tentative_g := cur_g + step_cost
			if not g_score.has(nxt) or tentative_g < float(g_score[nxt]):
				parent[nxt] = cur
				g_score[nxt] = tentative_g
				f_score[nxt] = tentative_g + Vector2(nxt - g_cell).length()
				if not in_open.has(nxt):
					open_set.append(nxt)
					in_open[nxt] = true
	last_astar_expanded_cells = expanded
	if not found:
		return []
	var raw: Array[Vector2] = [safe_goal]
	var cursor: Variant = reached_cell
	while cursor != null:
		raw.push_front(cell_to_world.call(cursor))
		cursor = parent[cursor]
	raw[0] = safe_start
	var corners: Array[Vector2] = [raw[0]]
	var corner_raw_idx: Array[int] = [0]
	for i in range(1, raw.size() - 1):
		var d0 := (raw[i] - raw[i - 1]).normalized()
		var d1 := (raw[i + 1] - raw[i]).normalized()
		if d0.dot(d1) < 0.999:
			corners.append(raw[i])
			corner_raw_idx.append(i)
	if raw.size() > 1:
		corners.append(raw.back())
		corner_raw_idx.append(raw.size() - 1)
	var smooth: Array[Vector2] = [corners[0]]
	var idx := 0
	while idx < corners.size() - 1:
		var next_idx := -1
		for probe in range(corners.size() - 1, idx, -1):
			if segment_walkable(corners[idx], corners[probe]):
				next_idx = probe
				break
		if next_idx > idx:
			smooth.append(corners[next_idx])
			idx = next_idx
		else:
			for r_i in range(corner_raw_idx[idx] + 1, corner_raw_idx[idx + 1] + 1):
				smooth.append(raw[r_i])
			idx += 1
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
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	update_route_ribbon(true)
	in_overview = false
	in_wide_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var dir := input_dir.normalized()
	if player_visual != null:
		player_visual.rotation.y = atan2(dir.x, dir.y)
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
	var occ_total := occluded_buildings.size() + occluded_wider_buildings.size()
	var cut_note := " · %d cutaway" % occ_total if occ_total > 0 else ""
	info.text = "Pos (%.1f, %.1f) m · %.2f m from %s%s\nWASD/Arrows or tap street to walk · 1–5 neighbors · M mural · R/K music · G block · H/J/C west\nCity 2010 PDDL footprints · Streets © OpenStreetMap / ODbL" % [p.x, p.y, nb.distance, nb.id, cut_note]

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
	walking_to_history_stop = ""
	arrived_history_stop = ""
	if index != celeste_index:
		show_mural_panel(false)
	if index != rook_index:
		show_music_panel(false)
	if index in [celeste_index, rook_index]:
		show_block_panel(false)
	in_overview = false
	in_wide_overview = false
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
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_music_panel(false)
	show_block_panel(false)
	in_overview = false
	in_wide_overview = false
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
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_block_panel(false)
	in_overview = false
	in_wide_overview = false
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

func walk_to_history_stop(stop_id: String) -> bool:
	if not (stop_id in HISTORY_STOP_IDS):
		return false
	var rec := get_history_stop_record(stop_id)
	var title_str := String(rec.get("name", rec.get("title", stop_id)))
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = stop_id
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	in_overview = false
	in_wide_overview = false
	following_player = true
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var goal := history_stop_xz(stop_id)
	var dist := player_xz().distance_to(goal)
	if dist <= ARRIVAL_DISTANCE_M:
		finish_history_stop_arrival(stop_id)
		return true
	current_path = find_path(player_xz(), goal)
	if current_path.size() > 1 and current_path[0].distance_to(player_xz()) < 0.20:
		current_path.remove_at(0)
	if current_path.is_empty():
		walking_to_history_stop = ""
		update_route_ribbon(true)
		info.text = "No walkable route to %s\nWASD/Arrows or tap street to walk\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % title_str
		announce_a11y_status("No walkable route to %s." % title_str)
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to %s · %.1f m\nWider Tenderloin route across %d measured footprints · Press Esc to stop\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [title_str, dist, all_buildings.size()]
	announce_a11y_status("Walking to %s, %.1f m." % [title_str, dist])
	return true

func finish_history_stop_arrival(stop_id: String) -> void:
	current_path.clear()
	walking_to_history_stop = ""
	arrived_history_stop = stop_id
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_celeste_talk = false
	pending_rook_talk = false
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	read_history_stop(stop_id)

func focus_history_stop_camera(stop_id: String) -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	var pos := history_stop_pos_3d(stop_id)
	target = Vector3(pos.x, 1.3, pos.z)
	view_size = 55.0
	update_camera()
	if get_viewport() != null and get_viewport().get_visible_rect().size.x < 600:
		target -= camera.global_basis.y * 4.2
		update_camera()
	update_occlusion(true)

func read_history_stop(stop_id: String) -> bool:
	if not (stop_id in HISTORY_STOP_IDS):
		return false
	var rec := get_history_stop_record(stop_id)
	var title_str := String(rec.get("name", rec.get("title", stop_id)))
	var note_str := String(rec.get("note", rec.get("source_note", "")))
	var newly_discovered := false
	if stop_id == "comptons":
		if not history_read:
			history_read = true
			newly_discovered = true
	else:
		if not blackhawk_discovered:
			blackhawk_discovered = true
			newly_discovered = true
	browser_import_message = ""
	update_history_stops_3d()
	show_block_panel(true)
	focus_history_stop_camera(stop_id)
	if newly_discovered:
		save_godot_state()
		trigger_progress_cue("history_" + stop_id, title_str)
	update_block_ui()
	var yr := int(rec.get("year", 1949 if stop_id == "blackhawk" else 1966))
	var extra_stage := " · Dodge Alley Block Concert live next door at Dodge Place" if stop_id == "blackhawk" else ""
	info.text = "%s (%d)%s\n%s\nCity 2010 survey & 5xmc-5bjj (2017) / PDDL · Streets © OpenStreetMap / ODbL" % [title_str, yr, extra_stage, note_str]
	announce_a11y_status("%s%s: %s" % [title_str, extra_stage, note_str])
	return true

func walk_to_or_read_history_stop(stop_id: String) -> bool:
	if arrived_history_stop == stop_id or player_xz().distance_to(history_stop_xz(stop_id)) <= ARRIVAL_DISTANCE_M + 0.5:
		return read_history_stop(stop_id)
	return walk_to_history_stop(stop_id)

func walk_to_comptons_corner() -> bool:
	return walk_to_history_stop("comptons")

func walk_to_black_hawk() -> bool:
	return walk_to_history_stop("blackhawk")

func inspect_so_what_easter_egg() -> bool:
	in_overview = false
	in_wide_overview = false
	following_player = false
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
		selected = -1
	target = Vector3(-320.0, 14.0, 82.6)
	view_size = 84.0
	update_camera()
	update_occlusion(true)
	var line := "145 Leavenworth (8th Floor ★) & 361 Turk St — 'So What' Musical Awning Easter Egg"
	var sub := "Dual-address Tenderloin complex (footprints 201006.0001527 & 201006.0003855) · Entrance awning arranged after Miles Davis's 'So What' (Live at the Black Hawk, 1961)"
	if info != null:
		info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub]
	announce_a11y_status("%s: %s" % [line, sub])
	return true

func toggle_district_boundary() -> bool:
	district_boundary_visible = not district_boundary_visible
	browser_import_message = ""
	update_district_boundary_3d()
	save_godot_state()
	update_block_ui()
	var state_word := "Shown" if district_boundary_visible else "Hidden"
	var msg := "Transgender Cultural District boundary (DataSF 5xmc-5bjj, PDDL 1.0, founded 2017): %s within the wider Tenderloin." % state_word
	info.text = "%s\nRecognized 2017 city cultural district boundary within the wider %d-building Tenderloin scene\nCity 2010 survey & 5xmc-5bjj / PDDL · Streets © OpenStreetMap / ODbL" % [msg, all_buildings.size()]
	announce_a11y_status(msg)
	return district_boundary_visible

func walk_to_point(goal_xz: Vector2) -> bool:
	var safe_goal := nearest_walkable_point(goal_xz, WALK_CLEARANCE_M)
	if goal_xz.distance_to(safe_goal) > 28.5 or not is_walkable_point(safe_goal, WALK_CLEARANCE_M):
		current_path.clear()
		update_route_ribbon(true)
		info.text = "No walkable street point near (%.1f, %.1f) m\nTap a street corridor or use WASD/Arrows\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [goal_xz.x, goal_xz.y]
		announce_a11y_status("No walkable street point here.")
		return false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	in_overview = false
	in_wide_overview = false
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
	walking_to_history_stop = ""
	arrived_history_stop = ""
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
	var mem_line := neighbor_project_memory_line(n_id)
	var mem_a11y := (" " + mem_line) if not mem_line.is_empty() else ""
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
		var sub_c := mem_line if not mem_line.is_empty() else "Portable sidewalk easel ready · Place Sun, Wave & Rise below"
		info.text = "With %s — %s (%d/3 mural motifs · %.2f m from %s%s)\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, mural_placements.size(), nb.distance, nb.id, cut_note, sub_c]
		announce_a11y_status("Arrived at %s (%s). Portable Mural Board %d/3 motifs.%s" % [n.name, n.role, mural_placements.size(), mem_a11y])
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
		var sub_r := mem_line if not mem_line.is_empty() else ("Turk St speaker %.1f m clear of wall · Explicit play/audition below" % min_wall_distance(speaker_xz()))
		info.text = "With %s — %s (%s · %.2f m from %s%s)\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, sc_tag, nb.distance, nb.id, cut_note, sub_r]
		announce_a11y_status("Arrived at %s (%s). %s.%s" % [n.name, n.role, sc_tag, mem_a11y])
	elif index >= 3 or (index == 0 and not newly_visited):
		pending_celeste_talk = false
		pending_rook_talk = false
		if newly_visited:
			save_godot_state()
		show_block_panel(true)
		update_block_ui()
		var sub_b := mem_line if not mem_line.is_empty() else "Opening block checklist below · Press G for Block Panel"
		info.text = "With %s — %s (%d/5 neighbors · %.2f m from %s%s)\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, visited_neighbors.size(), nb.distance, nb.id, cut_note, sub_b]
		announce_a11y_status("Arrived at %s (%s). Visited %d/5 neighbors.%s" % [n.name, n.role, visited_neighbors.size(), mem_a11y])
	else:
		pending_celeste_talk = false
		pending_rook_talk = false
		if newly_visited:
			save_godot_state()
		show_mural_panel(false)
		show_music_panel(false)
		show_block_panel(false)
		var sub_o := mem_line if not mem_line.is_empty() else "WASD/Arrows or tap street to walk · Walk to neighbor for next · Press G for Block"
		info.text = "With %s — %s (%.2f m from %s%s)\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, nb.distance, nb.id, cut_note, sub_o]
		announce_a11y_status("Arrived at %s (%s). Visited %d/5 neighbors.%s" % [n.name, n.role, visited_neighbors.size(), mem_a11y])

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
	walking_to_history_stop = ""
	arrived_history_stop = ""
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
	walking_to_history_stop = ""
	arrived_history_stop = ""
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
	in_wide_overview = false
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
	in_wide_overview = false
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
	in_wide_overview = false
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
	var mem_c := neighbor_project_memory_line(CELESTE_ID)
	var sub_c := mem_c if not mem_c.is_empty() else ("Portable Mural Board: %d/3 motifs (%s palette) · Separate Godot save" % [mural_placements.size(), mural_palette.capitalize()])
	info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub_c]
	announce_a11y_status(line if mem_c.is_empty() else ("%s %s" % [line, mem_c]))
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
	var mem_r := neighbor_project_memory_line(ROOK_ID)
	var sub_r := mem_r if not mem_r.is_empty() else ("Rook's Speaker: %s · Explicit Play/Pause & local Suno audition" % active_stem_summary())
	info.text = "%s\n%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [line, sub_r]
	announce_a11y_status(line if mem_r.is_empty() else ("%s %s" % [line, mem_r]))
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

func default_keepsake_photo() -> Dictionary:
	return {"status": "unasked", "participants": [], "mural": {}, "palette": "garden", "layout": "table"}

func default_hosting_draft() -> Dictionary:
	return {"story": "memory", "pattern": 85, "tiles": [0, 1, 2, 2, 1, 0], "palette": "warm", "quiet": "arc"}

func take_keepsake_photo(participants: Array = PHOTO_GUESTS) -> bool:
	if not block_opened or epilogue_packing or String(keepsake_photo.get("status", "unasked")) == "taken":
		return false
	if mural_placements.size() < MURAL_MOTIFS.size() or participants.is_empty():
		return false
	for raw_p in participants:
		if not (raw_p is String) or not (String(raw_p) in PHOTO_GUESTS):
			return false
	var canonical: Array[String] = []
	for guest_id in PHOTO_GUESTS:
		if participants.has(guest_id):
			canonical.append(guest_id)
	if canonical.is_empty():
		return false
	var frozen_mural: Dictionary = {}
	for m_id in MURAL_MOTIFS:
		var cell: Dictionary = mural_placements[m_id]
		frozen_mural[m_id] = {"col": int(cell.get("col", 0)), "row": int(cell.get("row", 0))}
	var cur_layout := String(keepsake_photo.get("layout", "table"))
	keepsake_photo = {
		"status": "taken",
		"participants": canonical,
		"mural": frozen_mural,
		"palette": mural_palette,
		"layout": cur_layout if cur_layout in ["table", "floor"] else "table"
	}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("keepsake_photo", "%d guests" % canonical.size())
	update_block_ui()
	var guest_names: Array[String] = []
	for g_id in canonical:
		guest_names.append(g_id.capitalize())
	var summary := "Keepsake photo taken with %s (%s mural frozen · Rook declines without penalty)" % [", ".join(guest_names), mural_palette.capitalize()]
	info.text = "%s\nM1 Afternoon Keepsake · Press Y to pack & return neighbor loans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func skip_keepsake_photo() -> bool:
	if not block_opened or epilogue_packing or String(keepsake_photo.get("status", "unasked")) != "unasked":
		return false
	var cur_layout := String(keepsake_photo.get("layout", "table"))
	keepsake_photo = {
		"status": "skipped",
		"participants": [],
		"mural": {},
		"palette": mural_palette,
		"layout": cur_layout if cur_layout in ["table", "floor"] else "table"
	}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	update_block_ui()
	var summary := "Keepsake photo skipped for now (can still take photo before packing starts)."
	info.text = "%s\nM1 Afternoon Keepsake · Press Y to start packing neighbor loans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func start_packing_epilogue() -> bool:
	if not block_opened:
		return false
	if not epilogue_packing:
		epilogue_packing = true
		if String(keepsake_photo.get("status", "unasked")) == "unasked":
			var cur_layout := String(keepsake_photo.get("layout", "table"))
			keepsake_photo = {
				"status": "skipped",
				"participants": [],
				"mural": {},
				"palette": mural_palette,
				"layout": cur_layout if cur_layout in ["table", "floor"] else "table"
			}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("epilogue_packing", "Packing loans")
	update_block_ui()
	var summary := "Started packing borrowed neighbor gear (%d/3 loans returned)." % epilogue_returned.size()
	info.text = "%s\nReturn Thanh's folding table, Celeste's paint case, and Rook's speaker (Y)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func return_loan(loan_id: String) -> bool:
	if not block_opened or not epilogue_packing or not (loan_id in LOAN_IDS):
		return false
	if epilogue_returned.has(loan_id):
		return false
	var next_returned: Array[String] = []
	for lid in LOAN_IDS:
		if lid == loan_id or epilogue_returned.has(lid):
			next_returned.append(lid)
	epilogue_returned = next_returned
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("loan_returned", loan_id)
	update_block_ui()
	var title := String(LOAN_TITLES.get(loan_id, loan_id))
	var summary := "Returned %s (%d/3 loans returned)%s" % [title, epilogue_returned.size(), " — Afternoon Epilogue Complete!" if is_epilogue_done() else ""]
	info.text = "%s\nM1 Afternoon Keepsake & Loan Returns · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func return_next_loan() -> String:
	if not block_opened:
		return ""
	if not epilogue_packing:
		start_packing_epilogue()
	for lid in LOAN_IDS:
		if not epilogue_returned.has(lid):
			if return_loan(lid):
				return lid
	return ""

func is_epilogue_done() -> bool:
	return block_opened and epilogue_packing and epilogue_returned.size() == LOAN_IDS.size()

func advance_epilogue_step() -> String:
	show_block_panel(true)
	if not block_opened:
		var msg := "Open the Turk Street block gathering (O) before taking the keepsake photo or returning loans."
		info.text = "%s\nVisit all 5 neighbors, complete 3/3 mural motifs, and soundcheck with Rook\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if String(keepsake_photo.get("status", "unasked")) == "unasked" and not epilogue_packing:
		return "photo_taken" if take_keepsake_photo(PHOTO_GUESTS) else "photo_blocked"
	if not epilogue_packing:
		return "packing_started" if start_packing_epilogue() else "packing_blocked"
	if epilogue_returned.size() < LOAN_IDS.size():
		var lid := return_next_loan()
		return ("returned_" + lid) if not lid.is_empty() else "loan_blocked"
	var kp_status := String(keepsake_photo.get("status", "skipped"))
	var done_msg := "Afternoon epilogue complete: keepsake %s and 3/3 neighbor loans returned." % kp_status
	var export_hint := " (Shift+Y exports keepsake SVG)" if kp_status == "taken" else ""
	info.text = "%s\nUse Z to plan & host the Second Afternoon Programme%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [done_msg, export_hint]
	announce_a11y_status(done_msg)
	return "epilogue_complete"

func xml_escape(raw_val: String) -> String:
	return raw_val.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;")

func build_keepsake_svg(photo_dict: Dictionary = {}) -> String:
	var src: Dictionary = keepsake_photo if photo_dict.is_empty() else photo_dict
	if String(src.get("status", "")) != "taken":
		return ""
	var p_val: Variant = src.get("participants", null)
	if not (p_val is Array) or (p_val as Array).is_empty():
		return ""
	var seen_p: Dictionary = {}
	for raw_id in (p_val as Array):
		if not (raw_id is String):
			return ""
		var gid := String(raw_id)
		if not (gid in PHOTO_GUESTS) or seen_p.has(gid):
			return ""
		seen_p[gid] = true
	var pal_id := String(src.get("palette", ""))
	var lay_id := String(src.get("layout", ""))
	if not (pal_id in MURAL_PALETTES) or not (lay_id in ["table", "floor"]):
		return ""
	var m_check := validate_mural_dict(src.get("mural", null), true)
	if not bool(m_check.get("ok", false)):
		return ""
	var clean_mural: Dictionary = m_check.get("placements", {})
	var colors: Array = KEEPSAKE_PALETTE_HEX.get(pal_id, KEEPSAKE_PALETTE_HEX["garden"])
	var motifs_svg := ""
	for i in range(MURAL_MOTIFS.size()):
		var mid := MURAL_MOTIFS[i]
		var cell: Dictionary = clean_mural[mid]
		var mx := 135 + int(cell.get("col", 0)) * 68
		var my := 155 + int(cell.get("row", 0)) * 43
		var m_col := String(colors[i])
		if mid == "sun":
			motifs_svg += "<g transform=\"translate(%d %d)\" stroke=\"%s\" stroke-width=\"5\" stroke-linecap=\"round\"><path d=\"M-15 0h30M0-15v30M-11-11l22 22M-11 11l22-22\"/></g>" % [mx, my, m_col]
		elif mid == "wave":
			motifs_svg += "<path d=\"M%d %dq12-17 24 0t24 0M%d %dq12-17 24 0t24 0\" stroke=\"%s\" stroke-width=\"4\" fill=\"none\"/>" % [mx - 23, my, mx - 23, my + 11, m_col]
		else:
			motifs_svg += "<text x=\"%d\" y=\"%d\" text-anchor=\"middle\" font-family=\"Georgia,serif\" font-size=\"24\" fill=\"%s\">RISE</text>" % [mx, my + 6, m_col]
	var guest_meta: Dictionary = {
		"bea": {"name": "Bea", "coat": "#c5874f", "skin": "#966345", "hair": "#dad7c6", "rollator": true, "headphones": false},
		"celeste": {"name": "Celeste", "coat": "#c87d82", "skin": "#8b5b3f", "hair": "#383c32", "rollator": false, "headphones": false},
		"dez": {"name": "Dez", "coat": "#978aaf", "skin": "#704b37", "hair": "#292f2b", "rollator": false, "headphones": true},
		"thanh": {"name": "Thanh", "coat": "#b59b5d", "skin": "#c38c65", "hair": "#454236", "rollator": false, "headphones": false}
	}
	var guests: Array[String] = []
	var guest_names: Array[String] = []
	for gid in PHOTO_GUESTS:
		if seen_p.has(gid):
			guests.append(gid)
			guest_names.append(String(guest_meta[gid]["name"]))
	var people_svg := ""
	for i in range(guests.size()):
		var gid := guests[i]
		var gm: Dictionary = guest_meta[gid]
		var gx := 320 + i * 106 - (guests.size() - 1) * 53
		var walker := "<g stroke=\"#496557\" stroke-width=\"4\" fill=\"none\"><path d=\"M-31 10l-8 39h68l-6-39\"/><path d=\"M-35 33h61\"/></g><circle cx=\"-37\" cy=\"52\" r=\"5\" fill=\"#496557\"/><circle cx=\"29\" cy=\"52\" r=\"5\" fill=\"#496557\"/>" if bool(gm.get("rollator", false)) else ""
		var headphones := "<path d=\"M-20-50a20 20 0 0 1 40 0\" fill=\"none\" stroke=\"#dfc57f\" stroke-width=\"4\"/><rect x=\"-23\" y=\"-54\" width=\"6\" height=\"17\" rx=\"2\" fill=\"#dfc57f\"/><rect x=\"17\" y=\"-54\" width=\"6\" height=\"17\" rx=\"2\" fill=\"#dfc57f\"/>" if bool(gm.get("headphones", false)) else ""
		people_svg += "<g data-guest=\"%s\" transform=\"translate(%d 321)\"><ellipse cx=\"3\" cy=\"47\" rx=\"34\" ry=\"7\" fill=\"#64735b22\"/><path d=\"M-10 10v33M10 10v33\" stroke=\"#3d5149\" stroke-width=\"10\" stroke-linecap=\"round\"/><rect x=\"-22\" y=\"-30\" width=\"44\" height=\"50\" rx=\"12\" fill=\"%s\"/><path d=\"M-25-19v35M25-19v35\" stroke=\"%s\" stroke-width=\"8\" stroke-linecap=\"round\"/><circle cy=\"-49\" r=\"18\" fill=\"%s\"/><path d=\"M-18-52a18 18 0 0 1 36 0\" fill=\"%s\"/>%s%s<text y=\"76\" text-anchor=\"middle\" font-size=\"15\" fill=\"#41594e\">%s</text></g>" % [
			gid,
			gx,
			String(gm["coat"]),
			String(gm["skin"]),
			String(gm["skin"]),
			String(gm["hair"]),
			headphones,
			walker,
			xml_escape(String(gm["name"]))
		]
	var bunting_svg := ""
	for i in range(15):
		var bx := 55 + i * 37
		bunting_svg += "<path d=\"M%d %sh20l-10 22z\" fill=\"%s\"/>" % [bx, KEEPSAKE_BUNTING_Y[i], String(colors[i % 3])]
	var title_str := "Stories around the Long Table" if lay_id == "table" else "A little room on the Open Floor"
	var escaped_title := xml_escape(title_str)
	var escaped_guests := xml_escape(", ".join(guest_names))
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 480\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">%s</title><desc id=\"desc\">Fictional gathering keepsake with %s. Rook is not pictured. An original illustration, not a photograph of a real place or person.</desc><rect width=\"640\" height=\"480\" rx=\"8\" fill=\"#faf3df\"/><rect x=\"20\" y=\"20\" width=\"600\" height=\"395\" rx=\"3\" fill=\"#dce2cc\"/><path d=\"M20 105h600M20 282h600\" stroke=\"#c3cdb6\" stroke-width=\"2\"/><path d=\"M45 69Q320 138 595 69\" fill=\"none\" stroke=\"#647b62\" stroke-width=\"2\"/>%s<rect x=\"91\" y=\"123\" width=\"455\" height=\"145\" rx=\"4\" fill=\"#f4e3ba\" stroke=\"#b58e5d\" stroke-width=\"8\"/>%s%s<text x=\"320\" y=\"438\" text-anchor=\"middle\" font-family=\"Georgia,serif\" font-size=\"22\" fill=\"#294f44\">%s</text><text x=\"320\" y=\"461\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"9\" letter-spacing=\"1.5\" fill=\"#6b7b68\">TENDERLOIN REDUX · FICTIONAL GATHERING · ORIGINAL ILLUSTRATION</text></svg>" % [
		escaped_title,
		escaped_guests,
		bunting_svg,
		motifs_svg,
		people_svg,
		escaped_title
	]

func export_keepsake_svg() -> bool:
	var svg := build_keepsake_svg(keepsake_photo)
	if svg.is_empty():
		return false
	last_exported_keepsake_svg = svg
	if OS.has_feature("web"):
		var js_svg := JSON.stringify(svg)
		var js_name := JSON.stringify(KEEPSAKE_EXPORT_FILENAME)
		JavaScriptBridge.eval("window.__tenderloinExportKeepsakeSvg && window.__tenderloinExportKeepsakeSvg(%s, %s);" % [js_svg, js_name], true)
	var summary := "Exported illustrated keepsake SVG (%s · %d bytes · Rook not pictured)." % [KEEPSAKE_EXPORT_FILENAME, svg.to_utf8_buffer().size()]
	if info != null:
		info.text = "%s\nOriginal consent-aware illustration · Tab-local SVG export\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	sync_web_a11y_status()
	return true

func programme_poster_heading(order: Array = programme_published) -> String:
	if order.size() != PROGRAMME_SEGMENTS.size() or programme_issue(order) != "":
		return "Another afternoon, taking shape"
	if String(order[0]) == "stories":
		return "Stories open the afternoon"
	if order.find("stories") < order.find("beats"):
		return "Stories before the rhythm"
	return "A rhythm, a pause, a story"

func build_programme_svg(order: Array = programme_published) -> String:
	if order.size() != PROGRAMME_SEGMENTS.size() or programme_issue(order) != "":
		return ""
	var heading := xml_escape(programme_poster_heading(order))
	var desc_parts: Array[String] = []
	var rows_svg := ""
	for i in range(order.size()):
		var sid := String(order[i])
		var s_name := xml_escape(programme_title(sid))
		var s_col := String(PROGRAMME_SEGMENT_COLORS.get(sid, "#e5b66d"))
		desc_parts.append("%d. %s." % [i + 1, s_name])
		rows_svg += "<g transform=\"translate(32 %d)\"><rect width=\"576\" height=\"61\" rx=\"9\" fill=\"%s\"/><text x=\"18\" y=\"39\" font-family=\"sans-serif\" font-size=\"22\" fill=\"#253c33\">%d. %s</text><circle cx=\"546\" cy=\"30\" r=\"12\" fill=\"#f8ecd9\"/></g>" % [
			110 + i * 73,
			s_col,
			i + 1,
			s_name
		]
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"460\" viewBox=\"0 0 640 460\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">%s</title><desc id=\"desc\">Fictional future gathering. %s</desc><rect width=\"640\" height=\"460\" rx=\"18\" fill=\"#f8ecd9\"/><text x=\"32\" y=\"44\" font-family=\"sans-serif\" font-size=\"15\" fill=\"#425547\">OUR NEXT AFTERNOON · A FICTIONAL PLAN</text><text x=\"32\" y=\"82\" font-family=\"sans-serif\" font-size=\"25\" fill=\"#253c33\">%s</text>%s<text x=\"32\" y=\"435\" font-family=\"sans-serif\" font-size=\"14\" fill=\"#425547\">Come and go. Listening counts. No date or real event is announced.</text></svg>" % [
		heading,
		" ".join(desc_parts),
		heading,
		rows_svg
	]

func build_tile_panel_svg(art_dict: Dictionary = {}) -> String:
	var src := art_dict
	if src.is_empty():
		var hosted_art: Variant = get_hosted_segment_value("art")
		if hosted_art is Dictionary:
			src = hosted_art as Dictionary
		else:
			src = hosting_draft
	var pal_val: Variant = src.get("palette", "")
	var tiles_val: Variant = src.get("tiles", null)
	if not (pal_val is String) or not (String(pal_val) in HOSTING_PALETTES) or not (tiles_val is Array) or (tiles_val as Array).size() != 6:
		return ""
	var pal_id := String(pal_val)
	var pal_hex: Array = HOSTING_TILE_HEX[pal_id]
	var tiles_svg := ""
	var t_arr: Array = tiles_val
	for i in range(6):
		var tv: Variant = t_arr[i]
		if not is_whole_json_number(tv):
			return ""
		var ti := int(roundf(float(tv)))
		if ti < 0 or ti > 2:
			return ""
		var tx := 24 + (i % 3) * 106
		var ty := 20 + int(i / 3) * 106
		var shape_svg := "<circle cx=\"49\" cy=\"49\" r=\"24\" fill=\"#f8ecd9\"/>" if ti == 0 else ("<path d=\"M12 64 Q32 20 50 50 T86 36\" stroke=\"#f8ecd9\" stroke-width=\"10\" fill=\"none\"/>" if ti == 1 else "<path d=\"M20 76 L49 22 L78 76Z\" fill=\"#f8ecd9\"/>")
		tiles_svg += "<g transform=\"translate(%d %d)\"><rect width=\"98\" height=\"98\" rx=\"7\" fill=\"%s\"/>%s</g>" % [tx, ty, String(pal_hex[ti]), shape_svg]
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"360\" height=\"240\" viewBox=\"0 0 360 240\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">Our six-tile portable panel</title><desc id=\"desc\">Original abstract neighbor-made panel, %s palette. Tiles numbered left to right, top to bottom.</desc><rect width=\"360\" height=\"240\" rx=\"14\" fill=\"#f8ecd9\"/>%s</svg>" % [
		xml_escape(pal_id),
		tiles_svg
	]

func build_civic_plan_svg(plan_dict: Dictionary = {}) -> String:
	var src: Variant = plan_dict
	if (src as Dictionary).is_empty():
		src = civic_result if is_valid_civic_plan(civic_result) else civic_draft
	if not is_valid_civic_plan(src):
		return ""
	var p := copy_civic_plan(src as Dictionary)
	var fmt := String(p.get("format", "circle"))
	var fmt_label := xml_escape(civic_format_title(fmt))
	var shapes_svg := ""
	if fmt == "circle":
		var pts := [[100, 42], [145, 30], [190, 42], [100, 158], [145, 170], [190, 158]]
		for pt in pts:
			shapes_svg += "<circle cx=\"%d\" cy=\"%d\" r=\"10\" fill=\"#75907c\"/>" % [pt[0], pt[1]]
		shapes_svg += "<rect x=\"260\" y=\"30\" width=\"75\" height=\"32\" rx=\"4\" fill=\"#d9a2b2\"/>"
	else:
		shapes_svg = "<rect x=\"80\" y=\"30\" width=\"150\" height=\"30\" rx=\"4\" fill=\"#d9a2b2\"/><circle cx=\"100\" cy=\"165\" r=\"10\" fill=\"#75907c\"/><circle cx=\"155\" cy=\"165\" r=\"10\" fill=\"#75907c\"/>"
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"420\" height=\"210\" viewBox=\"0 0 420 210\"><title>%s: schematic shared-space plan</title><rect width=\"420\" height=\"210\" rx=\"12\" fill=\"#f3eedf\"/><path d=\"M20 100H400\" stroke=\"#91bac2\" stroke-width=\"32\"/><path d=\"M20 100H400\" stroke=\"#fffdf5\" stroke-width=\"2\" stroke-dasharray=\"7 6\"/>%s<text x=\"310\" y=\"105\" font-family=\"sans-serif\" font-size=\"12\" fill=\"#253f35\">Clear route</text><text x=\"22\" y=\"199\" font-family=\"sans-serif\" font-size=\"11\" fill=\"#253f35\">Fictional setup · schematic, not surveyed access widths</text></svg>" % [
		fmt_label,
		shapes_svg
	]

func build_film_frame_svg(plan_dict: Dictionary = {}, shot_id: String = "") -> String:
	var src: Variant = plan_dict
	if (src as Dictionary).is_empty():
		src = film_result if is_valid_film_plan(film_result) else film_draft
	if not is_valid_film_plan(src):
		return ""
	var p := copy_film_plan(src as Dictionary)
	var ord: Array = p.get("order", FILM_SHOTS)
	var target_shot := shot_id
	if target_shot.is_empty():
		var idx := clampi(film_screen_frame, 0, ord.size() - 1)
		target_shot = String(ord[idx])
	if not (target_shot in FILM_SHOTS):
		return ""
	var chair := "<path d=\"M155 143V103H220V143M157 119H218M159 143V167M216 143V167\" fill=\"none\" stroke=\"#276a5a\" stroke-width=\"8\" stroke-linecap=\"round\"/>"
	var panel := "<rect x=\"95\" y=\"54\" width=\"100\" height=\"68\" rx=\"4\" fill=\"#f3eedf\" stroke=\"#276a5a\" stroke-width=\"3\"/><circle cx=\"124\" cy=\"87\" r=\"16\" fill=\"#d9a2b2\"/><path d=\"M146 98Q160 68 180 98\" fill=\"none\" stroke=\"#91bac2\" stroke-width=\"7\"/>"
	var scene_svg := chair if target_shot == "seat" else (panel if target_shot == "paint" else (chair + "<circle cx=\"270\" cy=\"116\" r=\"28\" fill=\"none\" stroke=\"#d9a2b2\" stroke-width=\"7\"/><path d=\"M254 116H286M270 100V132\" stroke=\"#276a5a\" stroke-width=\"4\"/>"))
	var framing := String(p.get("framing", "close"))
	var hands_svg := "<path d=\"M20 167L65 135Q79 129 84 142L57 165L93 163Q108 169 94 180H20M400 167L355 135Q341 129 336 142L363 165L327 163Q312 169 326 180H400\" fill=\"#c38c65\"/>" if framing == "wide" else ""
	var table_edge := "<rect x=\"64\" y=\"176\" width=\"292\" height=\"7\" rx=\"3\" fill=\"#b59b5d\"/>" if framing == "wide" else ""
	var group_attr := " transform=\"translate(-30 -8) scale(1.2)\"" if framing == "close" else ""
	return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"420\" height=\"236\" viewBox=\"0 0 420 236\"><title>%s — original illustrated frame</title><rect width=\"420\" height=\"236\" rx=\"12\" fill=\"#253f35\"/><rect x=\"12\" y=\"17\" width=\"396\" height=\"202\" rx=\"5\" fill=\"#ecebdc\"/><path d=\"M20 190H400\" stroke=\"#91bac2\" stroke-width=\"6\"/>%s<g%s>%s</g>%s<path d=\"M25 9H395M25 227H395\" stroke=\"#f3eedf\" stroke-width=\"4\" stroke-dasharray=\"8 10\"/></svg>" % [
		xml_escape(film_shot_title(target_shot)),
		table_edge,
		group_attr,
		scene_svg,
		hands_svg
	]

func programme_title(segment_id: String) -> String:
	return String(PROGRAMME_TITLES.get(segment_id, segment_id))

func programme_issue(order: Array = programme_order) -> String:
	var seen: Dictionary = {}
	for raw_id in order:
		if not (raw_id is String):
			return "Each segment can only appear once in the afternoon programme."
		var sid := String(raw_id)
		if not (sid in PROGRAMME_SEGMENTS) or seen.has(sid):
			return "Each segment can only appear once in the afternoon programme."
		seen[sid] = true
	if order.size() < PROGRAMME_SEGMENTS.size():
		var missing_titles: Array[String] = []
		for sid in PROGRAMME_SEGMENTS:
			if not seen.has(sid):
				missing_titles.append(programme_title(sid))
		return "Add all 4 segments to publish (%s remaining)." % ", ".join(missing_titles)
	var beats_at := -1
	var stories_at := -1
	var pause_at := -1
	for i in range(order.size()):
		var sid := String(order[i])
		if sid == "beats":
			beats_at = i
		elif sid == "stories":
			stories_at = i
		elif sid == "pause":
			pause_at = i
	if beats_at < stories_at and not (beats_at < pause_at and pause_at < stories_at):
		return "Place Quiet interval between Rhythm workshop and Story circle when Beats comes before Stories."
	return ""

func programme_add(segment_id: String) -> bool:
	if not block_opened or not (segment_id in PROGRAMME_SEGMENTS) or programme_order.has(segment_id):
		return false
	programme_order.append(segment_id)
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func programme_move(segment_id: String, delta: int) -> bool:
	if not block_opened:
		return false
	var at := programme_order.find(segment_id)
	var to := at + (-1 if delta < 0 else 1)
	if at < 0 or to < 0 or to >= programme_order.size():
		return false
	var tmp := programme_order[at]
	programme_order[at] = programme_order[to]
	programme_order[to] = tmp
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func programme_publish() -> bool:
	if not block_opened:
		return false
	if programme_issue(programme_order) != "":
		return false
	if programme_order == programme_published:
		return false
	programme_published = programme_order.duplicate()
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("programme_published", "4 segments")
	update_block_ui()
	var titles: Array[String] = []
	for sid in programme_published:
		titles.append(programme_title(sid))
	var summary := "Published Second Afternoon Programme: %s" % " -> ".join(titles)
	info.text = "%s\n3D Programme Signboard posted by Bea · Press Z to start hosting\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func is_hosting_ready_to_start() -> bool:
	return block_opened and hosting_order.is_empty() and programme_published.size() == PROGRAMME_SEGMENTS.size() and programme_issue(programme_published) == ""

func current_hosting_activity() -> String:
	if hosting_order.size() != PROGRAMME_SEGMENTS.size() or hosting_results.size() >= hosting_order.size():
		return ""
	return hosting_order[hosting_results.size()]

func is_hosting_done() -> bool:
	return hosting_order.size() == PROGRAMME_SEGMENTS.size() and hosting_results.size() == PROGRAMME_SEGMENTS.size()

func has_hosted_segment(segment_id: String) -> bool:
	for entry in hosting_results:
		if String(entry.get("id", "")) == segment_id:
			return true
	return false

func get_hosted_segment_value(segment_id: String) -> Variant:
	for entry in hosting_results:
		if String(entry.get("id", "")) == segment_id:
			return entry.get("value", null)
	return null

func host_start() -> bool:
	if not is_hosting_ready_to_start():
		return false
	hosting_order = programme_published.duplicate()
	hosting_results.clear()
	hosting_draft = default_hosting_draft()
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("hosting_started", hosting_order[0])
	update_block_ui()
	var first_title := programme_title(hosting_order[0])
	var summary := "Started hosting Second Afternoon Programme (1/4: %s)." % first_title
	info.text = "%s\nPress Z to complete each hosted activity across the block (Shift+Z to customize)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func host_set_story(story_id: String) -> bool:
	if current_hosting_activity() != "stories" or not (story_id in HOSTING_STORIES) or String(hosting_draft.get("story", "memory")) == story_id:
		return false
	hosting_draft["story"] = story_id
	save_godot_state()
	update_block_ui()
	return true

func host_toggle_beat(step: int) -> bool:
	if current_hosting_activity() != "beats" or step < 0 or step > 7:
		return false
	var pat := clampi(int(hosting_draft.get("pattern", 85)), 0, 255)
	var next_pat := (pat ^ (1 << step)) & 255
	hosting_draft["pattern"] = next_pat
	save_godot_state()
	update_block_ui()
	return true

func host_cycle_tile(index: int) -> bool:
	if current_hosting_activity() != "art" or index < 0 or index > 5:
		return false
	var raw_tiles: Array = hosting_draft.get("tiles", HOSTING_DEFAULT_TILES)
	var next_tiles: Array[int] = []
	for i in range(6):
		var v := int(raw_tiles[i]) if i < raw_tiles.size() else HOSTING_DEFAULT_TILES[i]
		next_tiles.append((clampi(v, 0, 2) + 1) % 3 if i == index else clampi(v, 0, 2))
	hosting_draft["tiles"] = next_tiles
	save_godot_state()
	update_block_ui()
	return true

func host_set_palette(pal_id: String) -> bool:
	if current_hosting_activity() != "art" or not (pal_id in HOSTING_PALETTES) or String(hosting_draft.get("palette", "warm")) == pal_id:
		return false
	hosting_draft["palette"] = pal_id
	save_godot_state()
	update_block_ui()
	return true

func host_set_quiet(quiet_id: String) -> bool:
	if current_hosting_activity() != "pause" or not (quiet_id in HOSTING_QUIETS) or String(hosting_draft.get("quiet", "arc")) == quiet_id:
		return false
	hosting_draft["quiet"] = quiet_id
	save_godot_state()
	update_block_ui()
	return true

func host_complete_current() -> bool:
	var active := current_hosting_activity()
	if active == "":
		return false
	var entry: Dictionary = {"id": active}
	if active == "stories":
		var st := String(hosting_draft.get("story", "memory"))
		entry["value"] = st if st in HOSTING_STORIES else "memory"
	elif active == "beats":
		var pat := clampi(int(hosting_draft.get("pattern", 85)), 0, 255)
		entry["value"] = pat
	elif active == "art":
		var raw_t: Array = hosting_draft.get("tiles", HOSTING_DEFAULT_TILES)
		var clean_t: Array[int] = []
		for i in range(6):
			var v := int(raw_t[i]) if i < raw_t.size() else HOSTING_DEFAULT_TILES[i]
			clean_t.append(clampi(v, 0, 2))
		var pal := String(hosting_draft.get("palette", "warm"))
		entry["value"] = {
			"palette": pal if pal in HOSTING_PALETTES else "warm",
			"tiles": clean_t
		}
	elif active == "pause":
		var q := String(hosting_draft.get("quiet", "arc"))
		entry["value"] = q if q in HOSTING_QUIETS else "arc"
	hosting_results.append(entry)
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	if is_hosting_done():
		trigger_progress_cue("hosting_complete", "4/4 hosted")
	else:
		trigger_progress_cue("hosting_segment", active)
	update_block_ui()
	var next_act := current_hosting_activity()
	var summary := "Completed %s (%d/4 hosted)%s" % [programme_title(active), hosting_results.size(), " — Second Afternoon Complete!" if next_act == "" else (" · Next: " + programme_title(next_act))]
	info.text = "%s\nM3 Second Afternoon Programme & Hosting · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func cycle_programme_or_hosting_choice() -> String:
	show_block_panel(true)
	if not block_opened:
		return "locked"
	var active := current_hosting_activity()
	if active == "stories":
		var next_st := "future" if String(hosting_draft.get("story", "memory")) == "memory" else "memory"
		host_set_story(next_st)
		announce_a11y_status("Story circle invitation set to %s." % next_st)
		return "story_" + next_st
	elif active == "beats":
		host_toggle_beat(0)
		var pat := int(hosting_draft.get("pattern", 85))
		announce_a11y_status("Rhythm workshop pattern set to %d." % pat)
		return "beats_%d" % pat
	elif active == "art":
		var next_pal := "cool" if String(hosting_draft.get("palette", "warm")) == "warm" else "warm"
		host_set_palette(next_pal)
		host_cycle_tile(0)
		announce_a11y_status("Shared art panel palette set to %s." % next_pal)
		return "art_" + next_pal
	elif active == "pause":
		var next_q := "pairs" if String(hosting_draft.get("quiet", "arc")) == "arc" else "arc"
		host_set_quiet(next_q)
		announce_a11y_status("Quiet interval seating set to %s." % next_q)
		return "pause_" + next_q
	if programme_order.size() < PROGRAMME_SEGMENTS.size():
		for sid in PROGRAMME_DEFAULT_ORDER:
			if not programme_order.has(sid):
				programme_add(sid)
				return "added_" + sid
	if programme_order.size() == PROGRAMME_SEGMENTS.size():
		programme_move("stories", 1 if programme_order[0] == "stories" else -1)
		return "moved_stories"
	return "noop"

func advance_programme_and_hosting_step() -> String:
	show_block_panel(true)
	if not block_opened:
		var msg := "Open the Turk Street block gathering (O) before publishing or hosting the Second Afternoon Programme."
		info.text = "%s\nVisit all 5 neighbors, complete 3/3 mural motifs, and soundcheck with Rook\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if programme_published.size() < PROGRAMME_SEGMENTS.size():
		if programme_order.is_empty():
			for sid in PROGRAMME_DEFAULT_ORDER:
				programme_add(sid)
		var issue := programme_issue(programme_order)
		if issue != "":
			info.text = "%s\nAdjust programme draft before publishing\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % issue
			announce_a11y_status(issue)
			return "programme_blocked"
		return "programme_published" if programme_publish() else "programme_blocked"
	if hosting_order.is_empty():
		return "hosting_started" if host_start() else "hosting_blocked"
	if not is_hosting_done():
		var act := current_hosting_activity()
		return ("hosted_" + act) if host_complete_current() else "hosting_blocked"
	var done_msg := "Second Afternoon Programme complete: 4/4 activities hosted across Turk Street."
	info.text = "%s\nStory circle, Rhythm workshop, Quiet interval, and Shared art panel complete\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % done_msg
	announce_a11y_status(done_msg)
	return "hosting_complete"

func default_civic_draft() -> Dictionary:
	return {"topic": "repairs", "format": "circle", "notes": "themes"}

func is_civic_available() -> bool:
	return block_opened and is_hosting_done()

func is_valid_civic_plan(raw_val: Variant) -> bool:
	if not (raw_val is Dictionary):
		return false
	var d: Dictionary = raw_val
	var t_val: Variant = d.get("topic", null)
	var f_val: Variant = d.get("format", null)
	var n_val: Variant = d.get("notes", null)
	return (t_val is String) and (String(t_val) in CIVIC_TOPICS) and (f_val is String) and (String(f_val) in CIVIC_FORMATS) and (n_val is String) and (String(n_val) in CIVIC_NOTES)

func copy_civic_plan(raw_val: Dictionary) -> Dictionary:
	var t := String(raw_val.get("topic", "repairs"))
	var f := String(raw_val.get("format", "circle"))
	var n := String(raw_val.get("notes", "themes"))
	return {
		"topic": t if t in CIVIC_TOPICS else "repairs",
		"format": f if f in CIVIC_FORMATS else "circle",
		"notes": n if n in CIVIC_NOTES else "themes"
	}

func civic_topic_title(topic_id: String) -> String:
	return String(CIVIC_TOPIC_LABELS.get(topic_id, topic_id))

func civic_format_title(format_id: String) -> String:
	return String(CIVIC_FORMAT_LABELS.get(format_id, format_id))

func civic_notes_title(notes_id: String) -> String:
	return String(CIVIC_NOTE_LABELS.get(notes_id, notes_id))

func civic_start() -> bool:
	if not is_civic_available() or civic_phase != "idle":
		return false
	civic_phase = "planning"
	civic_draft = default_civic_draft()
	civic_result = {}
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("civic_planning", "Listening hour")
	update_block_ui()
	var summary := "Started planning Peaceful Tenant Listening Hour (%s · %s · %s)." % [civic_topic_title(String(civic_draft.get("topic", "repairs"))), civic_format_title(String(civic_draft.get("format", "circle"))), civic_notes_title(String(civic_draft.get("notes", "themes")))]
	info.text = "%s\nPress Q to convene listening hour or Shift+Q to cycle all 8 topic/seating/notes plans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func civic_set_choice(key: String, val: String) -> bool:
	if not is_civic_available() or civic_phase != "planning":
		return false
	if key == "topic":
		if not (val in CIVIC_TOPICS) or String(civic_draft.get("topic", "repairs")) == val:
			return false
		civic_draft["topic"] = val
	elif key == "format":
		if not (val in CIVIC_FORMATS) or String(civic_draft.get("format", "circle")) == val:
			return false
		civic_draft["format"] = val
	elif key == "notes":
		if not (val in CIVIC_NOTES) or String(civic_draft.get("notes", "themes")) == val:
			return false
		civic_draft["notes"] = val
	else:
		return false
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func civic_convene() -> bool:
	if not is_civic_available() or civic_phase != "planning":
		return false
	civic_result = copy_civic_plan(civic_draft)
	civic_draft = copy_civic_plan(civic_result)
	civic_phase = "meeting"
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("civic_meeting", String(civic_result.get("topic", "repairs")))
	update_block_ui()
	var summary := "Convened Peaceful Tenant Listening Hour: %s (%s · %s)." % [civic_topic_title(String(civic_result.get("topic", "repairs"))), civic_format_title(String(civic_result.get("format", "circle"))), civic_notes_title(String(civic_result.get("notes", "themes")))]
	info.text = "%s\n3D Listening Circle & Notes Easel active on Turk Street · Press Q to complete\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func civic_complete() -> bool:
	if not is_civic_available() or civic_phase != "meeting" or not is_valid_civic_plan(civic_result):
		return false
	civic_phase = "done"
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("civic_complete", "Listening hour complete")
	update_block_ui()
	var summary := "Completed Peaceful Tenant Listening Hour (%s · %s · %s) — The Open Seat film short ready!" % [civic_topic_title(String(civic_result.get("topic", "repairs"))), civic_format_title(String(civic_result.get("format", "circle"))), civic_notes_title(String(civic_result.get("notes", "themes")))]
	info.text = "%s\nM4 Civic Listening Hour Complete · Press Period (.) to plan The Open Seat\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func cycle_civic_choice() -> String:
	show_block_panel(true)
	if not is_civic_available():
		return "locked"
	if civic_phase == "idle":
		civic_start()
		return "started"
	if civic_phase != "planning":
		return "noop"
	var t_idx := maxi(0, CIVIC_TOPICS.find(String(civic_draft.get("topic", "repairs"))))
	var f_idx := maxi(0, CIVIC_FORMATS.find(String(civic_draft.get("format", "circle"))))
	var n_idx := maxi(0, CIVIC_NOTES.find(String(civic_draft.get("notes", "themes"))))
	var combo := posmod((t_idx * 4) + (f_idx * 2) + n_idx + 1, 8)
	var next_topic := CIVIC_TOPICS[(combo >> 2) & 1]
	var next_fmt := CIVIC_FORMATS[(combo >> 1) & 1]
	var next_notes := CIVIC_NOTES[combo & 1]
	civic_draft["topic"] = next_topic
	civic_draft["format"] = next_fmt
	civic_draft["notes"] = next_notes
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	var summary := "Listening hour draft set to %s · %s · %s." % [civic_topic_title(next_topic), civic_format_title(next_fmt), civic_notes_title(next_notes)]
	info.text = "%s\nPress Q to convene Peaceful Tenant Listening Hour\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return "choice_%s_%s_%s" % [next_topic, next_fmt, next_notes]

func advance_civic_step() -> String:
	show_block_panel(true)
	if not is_civic_available():
		var msg := "Complete the 4 Second Afternoon Programme activities (Z) before starting the Peaceful Tenant Listening Hour."
		info.text = "%s\nM4 Civic Listening Hour unlocks after all 4 hosted segments finish\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if civic_phase == "idle":
		return "civic_planning" if civic_start() else "civic_blocked"
	if civic_phase == "planning":
		return "civic_meeting" if civic_convene() else "civic_blocked"
	if civic_phase == "meeting":
		return "civic_done" if civic_complete() else "civic_blocked"
	var done_msg := "Peaceful Tenant Listening Hour complete (%s · %s · %s)." % [civic_topic_title(String(civic_result.get("topic", "repairs"))), civic_format_title(String(civic_result.get("format", "circle"))), civic_notes_title(String(civic_result.get("notes", "themes")))]
	info.text = "%s\nPress Period (.) to plan & capture The Open Seat three-shot film short\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % done_msg
	announce_a11y_status(done_msg)
	return "civic_complete"

func default_film_draft() -> Dictionary:
	var ord: Array[String] = []
	for s_id in FILM_SHOTS:
		ord.append(s_id)
	return {"framing": "close", "plan": "quiet", "order": ord}

func is_film_available() -> bool:
	return block_opened and civic_phase == "done"

func is_valid_film_order(raw_order: Variant) -> bool:
	if not (raw_order is Array):
		return false
	var ord: Array = raw_order
	if ord.size() != FILM_SHOTS.size():
		return false
	var seen: Dictionary = {}
	for item in ord:
		if not (item is String):
			return false
		var sid := String(item)
		if not (sid in FILM_SHOTS) or seen.has(sid):
			return false
		seen[sid] = true
	return seen.size() == FILM_SHOTS.size()

func is_valid_film_plan(raw_val: Variant) -> bool:
	if not (raw_val is Dictionary):
		return false
	var d: Dictionary = raw_val
	var fr_val: Variant = d.get("framing", null)
	var pl_val: Variant = d.get("plan", null)
	return (fr_val is String) and (String(fr_val) in FILM_FRAMING) and (pl_val is String) and (String(pl_val) in FILM_PLANS) and is_valid_film_order(d.get("order", null))

func copy_film_plan(raw_val: Dictionary) -> Dictionary:
	var fr := String(raw_val.get("framing", "close"))
	var pl := String(raw_val.get("plan", "quiet"))
	var clean_ord: Array[String] = []
	var raw_ord: Variant = raw_val.get("order", null)
	if is_valid_film_order(raw_ord):
		for item in (raw_ord as Array):
			clean_ord.append(String(item))
	else:
		for s_id in FILM_SHOTS:
			clean_ord.append(s_id)
	return {
		"framing": fr if fr in FILM_FRAMING else "close",
		"plan": pl if pl in FILM_PLANS else "quiet",
		"order": clean_ord
	}

func film_shot_title(shot_id: String) -> String:
	return String(FILM_SHOT_LABELS.get(shot_id, shot_id))

func film_next_shot() -> String:
	if film_phase != "shooting" or not is_valid_film_plan(film_result):
		return ""
	var ord: Array = film_result.get("order", [])
	if film_captured.size() >= ord.size():
		return ""
	return String(ord[film_captured.size()])

func film_start() -> bool:
	if not is_film_available() or film_phase != "idle":
		return false
	film_phase = "planning"
	film_draft = default_film_draft()
	film_result = {}
	film_captured.clear()
	film_screen_frame = 0
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("film_planning", "The Open Seat")
	update_block_ui()
	var summary := "Started planning The Open Seat three-shot film short (Objects in close-up · A quiet prop take · Seat -> Paint -> Welcome)."
	info.text = "%s\nPress Period (.) to roll/hold for clear route or Shift+Period to cycle all 24 film plans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_set_choice(key: String, val: String) -> bool:
	if not is_film_available() or film_phase != "planning":
		return false
	if key == "framing":
		if not (val in FILM_FRAMING) or String(film_draft.get("framing", "close")) == val:
			return false
		film_draft["framing"] = val
	elif key == "plan":
		if not (val in FILM_PLANS) or String(film_draft.get("plan", "quiet")) == val:
			return false
		film_draft["plan"] = val
	else:
		return false
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func film_move_shot(shot_id: String, delta: int) -> bool:
	if not is_film_available() or film_phase != "planning" or not (shot_id in FILM_SHOTS):
		return false
	var raw_ord: Variant = film_draft.get("order", FILM_SHOTS)
	var ord: Array[String] = []
	if is_valid_film_order(raw_ord):
		for item in (raw_ord as Array):
			ord.append(String(item))
	else:
		for s_id in FILM_SHOTS:
			ord.append(s_id)
	var at := ord.find(shot_id)
	var to := at + (-1 if delta < 0 else 1)
	if at < 0 or to < 0 or to >= ord.size():
		return false
	var tmp := ord[at]
	ord[at] = ord[to]
	ord[to] = tmp
	film_draft["order"] = ord
	browser_import_message = ""
	save_godot_state()
	update_block_ui()
	return true

func film_hold() -> bool:
	if not is_film_available() or film_phase != "planning":
		return false
	film_result = copy_film_plan(film_draft)
	film_draft = copy_film_plan(film_result)
	film_captured.clear()
	film_screen_frame = 0
	film_phase = "hold"
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	update_block_ui()
	var summary := "The Open Seat crew holds the take beside the clear route until neighbors pass (hold)."
	info.text = "%s\n3D Storyboard Easel ready · Press Period (.) when the route is clear to begin shooting\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_begin_shooting() -> bool:
	if not is_film_available() or film_phase != "hold" or not is_valid_film_plan(film_result):
		return false
	var plan_src := copy_film_plan(film_result)
	film_result = plan_src
	film_draft = copy_film_plan(plan_src)
	film_captured.clear()
	film_screen_frame = 0
	film_phase = "shooting"
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	trigger_progress_cue("film_shooting", film_next_shot())
	update_block_ui()
	var next_title := film_shot_title(film_next_shot())
	var summary := "Route clear — started shooting The Open Seat (0/3 frames · Next: %s)." % next_title
	info.text = "%s\n3D Storyboard Easel active · Press Period (.) to capture each frame in order\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_capture_shot(shot_id: String = "") -> bool:
	if not is_film_available() or film_phase != "shooting" or not is_valid_film_plan(film_result):
		return false
	var expected := film_next_shot()
	var target_shot := expected if shot_id.is_empty() else shot_id
	if expected.is_empty() or target_shot != expected:
		return false
	film_captured.append(expected)
	if film_captured.size() == FILM_SHOTS.size():
		film_phase = "done"
		film_screen_frame = 0
	browser_import_message = ""
	update_block_3d()
	save_godot_state()
	if film_phase == "done":
		trigger_progress_cue("film_complete", "The Open Seat 3/3")
	else:
		trigger_progress_cue("film_shot", expected)
	update_block_ui()
	var cap_title := film_shot_title(expected)
	var summary := "Captured %s (%d/3 frames)%s" % [cap_title, film_captured.size(), " — The Open Seat Complete!" if film_phase == "done" else (" · Next: " + film_shot_title(film_next_shot()))]
	info.text = "%s\nM4 Three-Shot Film Short (The Open Seat) · Sound-independent\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func film_set_screen_frame(index: int) -> bool:
	if film_phase != "done" or index < 0 or index >= FILM_SHOTS.size() or not is_valid_film_plan(film_result):
		return false
	film_screen_frame = index
	update_block_3d()
	update_block_ui()
	var ord: Array = film_result.get("order", FILM_SHOTS)
	var shot_id := String(ord[index]) if index < ord.size() else "seat"
	var summary := "Viewing The Open Seat Frame %d/3: %s." % [index + 1, film_shot_title(shot_id)]
	info.text = "%s\nTransient storyboard viewer frame (resets to Frame 1 on reload)\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
	announce_a11y_status(summary)
	return true

func all_film_shot_orders() -> Array[Array]:
	return [
		["seat", "paint", "welcome"],
		["seat", "welcome", "paint"],
		["paint", "seat", "welcome"],
		["paint", "welcome", "seat"],
		["welcome", "seat", "paint"],
		["welcome", "paint", "seat"]
	]

func cycle_film_choice_or_frame() -> String:
	show_block_panel(true)
	if not is_film_available():
		return "locked"
	if film_phase == "idle":
		film_start()
		return "started"
	if film_phase == "planning":
		var orders := all_film_shot_orders()
		var cur_ord: Array = film_draft.get("order", FILM_SHOTS)
		var ord_idx := 0
		for i in range(orders.size()):
			var cand: Array = orders[i]
			if cur_ord.size() == 3 and String(cur_ord[0]) == String(cand[0]) and String(cur_ord[1]) == String(cand[1]) and String(cur_ord[2]) == String(cand[2]):
				ord_idx = i
				break
		var fr_idx := maxi(0, FILM_FRAMING.find(String(film_draft.get("framing", "close"))))
		var pl_idx := maxi(0, FILM_PLANS.find(String(film_draft.get("plan", "quiet"))))
		var combo := posmod((fr_idx * 12) + (pl_idx * 6) + ord_idx + 1, 24)
		var next_fr := FILM_FRAMING[(combo / 12) % 2]
		var next_pl := FILM_PLANS[(combo / 6) % 2]
		var next_ord_raw: Array = orders[combo % 6]
		var next_ord: Array[String] = []
		for item in next_ord_raw:
			next_ord.append(String(item))
		film_draft["framing"] = next_fr
		film_draft["plan"] = next_pl
		film_draft["order"] = next_ord
		browser_import_message = ""
		save_godot_state()
		update_block_ui()
		var summary := "The Open Seat draft set to %s · %s · %s." % [next_fr, next_pl, "->".join(next_ord)]
		info.text = "%s\nPress Period (.) to hold for clear route or Shift+Period to cycle all 24 film plans\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % summary
		announce_a11y_status(summary)
		return "draft_%s_%s_%s" % [next_fr, next_pl, "_".join(next_ord)]
	if film_phase == "done":
		var next_idx := posmod(film_screen_frame + 1, FILM_SHOTS.size())
		film_set_screen_frame(next_idx)
		return "frame_%d" % next_idx
	return "noop"

func advance_film_step() -> String:
	show_block_panel(true)
	if not is_film_available():
		var msg := "Complete the Peaceful Tenant Listening Hour (Q) before planning The Open Seat three-shot film short."
		info.text = "%s\nM4 Film Short unlocks after the listening hour finishes\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
		announce_a11y_status(msg)
		return "locked"
	if film_phase == "idle":
		return "film_planning" if film_start() else "film_blocked"
	if film_phase == "planning":
		return "film_hold" if film_hold() else "film_blocked"
	if film_phase == "hold":
		return "film_shooting" if film_begin_shooting() else "film_blocked"
	if film_phase == "shooting":
		var next_s := film_next_shot()
		if not film_capture_shot():
			return "film_blocked"
		return "film_done" if film_phase == "done" else ("captured_" + next_s)
	var next_idx := posmod(film_screen_frame + 1, FILM_SHOTS.size())
	film_set_screen_frame(next_idx)
	return "film_complete_frame_%d" % next_idx

func neighbor_project_memory_line(neighbor_id: String) -> String:
	if film_phase == "done" and is_valid_film_plan(film_result):
		var ord: Array = film_result.get("order", FILM_SHOTS)
		var last_shot := film_shot_title(String(ord[2]) if ord.size() >= 3 else "welcome").to_lower()
		var framing := String(film_result.get("framing", "close"))
		var plan := String(film_result.get("plan", "quiet"))
		match neighbor_id:
			"rook":
				return "“I helped with the cue and stayed out of the picture. A no can belong in a good film too.”"
			"celeste":
				return "“Dez and I offered our hands, not everyone else’s faces. We made the picture together.”" if framing == "wide" else "“Our props told the story without putting anyone on camera. I like that small frame.”"
			"thanh":
				return "“The crew held the take while I used the route. A production should fit around the people who live here.”"
			"bea":
				return "“They waited until the conversation finished. Being heard mattered more than rushing a take.”" if plan == "later" else "“We could keep talking while they worked quietly. The film made room for our afternoon.”"
			"dez":
				return "“We ended on %s. A different order would tell a different little story.”" % last_shot
	if civic_phase == "done" and is_valid_civic_plan(civic_result):
		var topic := String(civic_result.get("topic", "repairs"))
		var fmt := String(civic_result.get("format", "circle"))
		var notes := String(civic_result.get("notes", "themes"))
		match neighbor_id:
			"bea":
				return "“We put repairs and staying put into the conversation. One listening hour is a beginning, not a promise that housing problems are solved.”" if topic == "repairs" else "“I still want us to talk about repairs. Making room to come and go gave us a useful place to begin.”"
			"thanh":
				return "“I could join for a few minutes and leave when I needed to. Keeping the table off the route mattered.”" if fmt == "dropin" else "“I liked hearing everyone together. Next time, could we leave a drop-in moment for people who cannot stay?”"
			"celeste":
				return "“The shared request has no names or personal stories attached. Nobody owes us their story.”" if notes == "themes" else "“We agreed to keep no meeting notes. Listening can matter without making a record of someone.”"
			"rook":
				return "“No microphone needed. A listening hour can have room for a disagreement and a quiet voice.”"
			"dez":
				return "“I helped welcome people who just wanted to listen. Nobody had to sign anything or agree to belong.”"
	return ""

func is_test_suite_mode() -> bool:
	for arg in OS.get_cmdline_user_args():
		if arg == "--test-suite":
			return true
	for arg in OS.get_cmdline_args():
		if arg.ends_with("study_test.gd") or arg == "--test-suite":
			return true
	return false

func resolve_settings_path() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--godot-settings-path="):
			var custom := arg.trim_prefix("--godot-settings-path=").strip_edges()
			if not custom.is_empty():
				return custom
	if is_test_suite_mode():
		return GODOT_TEST_SETTINGS_PATH
	return GODOT_SETTINGS_PATH

func save_godot_settings() -> bool:
	var env := {
		"schema": "tenderloin-redux.godot.settings.v1",
		"version": 1,
		"neighborhood_voices": voices_enabled
	}
	var raw_json := JSON.stringify(env)
	var wrote := false
	if OS.has_feature("web"):
		var js_literal := JSON.stringify(raw_json)
		var web_ok: Variant = JavaScriptBridge.eval("try { window.localStorage.setItem('%s', %s); true; } catch (_e) { false; }" % [GODOT_SETTINGS_WEB_STORAGE_KEY, js_literal], true)
		wrote = bool(web_ok)
	if not wrote and not settings_path.is_empty():
		var file := FileAccess.open(settings_path, FileAccess.WRITE)
		if file != null:
			file.store_string(raw_json)
			file.close()
			wrote = true
	return wrote

func load_godot_settings() -> bool:
	var raw_str := ""
	if OS.has_feature("web"):
		var web_val: Variant = JavaScriptBridge.eval("try { window.localStorage.getItem('%s') || ''; } catch (_e) { ''; }" % GODOT_SETTINGS_WEB_STORAGE_KEY, true)
		if web_val is String and not String(web_val).strip_edges().is_empty():
			raw_str = String(web_val)
	elif not settings_path.is_empty() and FileAccess.file_exists(settings_path):
		raw_str = FileAccess.get_file_as_string(settings_path)
	var trimmed := raw_str.strip_edges()
	if trimmed.is_empty() or not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		set_voices_enabled(false, false)
		return false
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		set_voices_enabled(false, false)
		return false
	var env: Dictionary = parsed
	if String(env.get("schema", "")) != "tenderloin-redux.godot.settings.v1":
		set_voices_enabled(false, false)
		return false
	var nv_val: Variant = env.get("neighborhood_voices", false)
	if not (nv_val is bool):
		set_voices_enabled(false, false)
		return false
	return set_voices_enabled(bool(nv_val), false)

func clear_godot_settings() -> void:
	voices_custom_json_override = ""
	voices_simulate_error = false
	if not settings_path.is_empty() and FileAccess.file_exists(settings_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(settings_path))
	if OS.has_feature("web"):
		JavaScriptBridge.eval("try { window.localStorage.removeItem('%s'); } catch (_e) {}" % GODOT_SETTINGS_WEB_STORAGE_KEY, true)
	set_voices_enabled(false, false)

func validate_voices_payload(raw_json: String) -> Dictionary:
	if raw_json.to_utf8_buffer().size() > VOICES_MAX_BYTES:
		return {"ok": false}
	var trimmed := raw_json.strip_edges()
	if trimmed.is_empty() or not trimmed.begins_with("{") or not trimmed.ends_with("}"):
		return {"ok": false}
	var parsed: Variant = JSON.parse_string(trimmed)
	if not (parsed is Dictionary):
		return {"ok": false}
	var d: Dictionary = parsed
	var ver_val: Variant = d.get("version", -1)
	if not is_whole_json_number(ver_val) or int(roundf(float(ver_val))) != 1:
		return {"ok": false}
	var checked_val: Variant = d.get("checkedAt", "")
	if not (checked_val is String) or String(checked_val) != VOICES_CHECKED_AT:
		return {"ok": false}
	var list_val: Variant = d.get("records", null)
	if not (list_val is Array) or (list_val as Array).size() != 3:
		return {"ok": false}
	var req_keys := ["name", "topic", "summary", "sourceTitle"]
	var clean_records: Array[Dictionary] = []
	var seen_ids: Dictionary = {}
	for entry_val in (list_val as Array):
		if not (entry_val is Dictionary):
			return {"ok": false}
		var entry: Dictionary = entry_val
		var id_val: Variant = entry.get("id", null)
		var url_val: Variant = entry.get("url", null)
		if not (id_val is String) or not (url_val is String):
			return {"ok": false}
		var rec_id := String(id_val)
		var src_url := String(url_val)
		if not VOICES_SOURCES.has(rec_id) or seen_ids.has(rec_id) or src_url != String(VOICES_SOURCES[rec_id]):
			return {"ok": false}
		seen_ids[rec_id] = true
		var clean_rec: Dictionary = {"id": rec_id, "url": src_url}
		for k in req_keys:
			var v: Variant = entry.get(k, null)
			var max_len := 450 if k == "summary" else 100
			if not (v is String) or String(v).strip_edges().is_empty() or String(v).length() > max_len:
				return {"ok": false}
			clean_rec[k] = String(v)
		clean_records.append(clean_rec)
	return {"ok": true, "checked_at": String(checked_val), "records": clean_records}

func voices_release_resources() -> void:
	var t0 := Time.get_ticks_usec()
	voices_records.clear()
	voices_checked_at = ""
	voices_release_count += 1
	last_voices_teardown_usec = maxi(1, Time.get_ticks_usec() - t0)

func present_voices_summary() -> String:
	if not voices_enabled or voices_status != "ready" or voices_records.is_empty():
		return ""
	var card_lines: Array[String] = []
	for rec in voices_records:
		card_lines.append("%s (%s): %s [%s — %s]" % [
			String(rec.get("name", "")),
			String(rec.get("topic", "")),
			String(rec.get("summary", "")),
			String(rec.get("sourceTitle", "")),
			String(rec.get("url", ""))
		])
	var body := "People already doing the work (%d profiles checked %s): %s\n%s" % [
		voices_records.size(),
		voices_checked_at,
		" · ".join(card_lines),
		VOICES_DISCLAIMER
	]
	if info != null:
		info.text = "%s\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % body
	announce_a11y_status(body)
	return body

func load_voices_for_generation(gen: int, raw_override: String = "") -> bool:
	if not voices_enabled or gen != voices_generation:
		return false
	if is_test_suite_mode() and voices_simulate_error:
		voices_records.clear()
		voices_checked_at = ""
		voices_status = "error"
		voices_error = "Could not load neighborhood voices dataset."
		update_block_ui()
		sync_web_a11y_status()
		return false
	var raw_text := raw_override
	if raw_text.is_empty() and is_test_suite_mode():
		raw_text = voices_custom_json_override
	if raw_text.is_empty() and FileAccess.file_exists(VOICES_DATA_PATH):
		raw_text = FileAccess.get_file_as_string(VOICES_DATA_PATH)
	var val_res := validate_voices_payload(raw_text)
	if not bool(val_res.get("ok", false)):
		voices_records.clear()
		voices_checked_at = ""
		voices_status = "error"
		voices_error = "Neighborhood voices dataset failed validation."
		update_block_ui()
		sync_web_a11y_status()
		return false
	voices_records = val_res.get("records", [] as Array[Dictionary])
	voices_checked_at = String(val_res.get("checked_at", ""))
	voices_status = "ready"
	voices_error = ""
	update_block_ui()
	sync_web_a11y_status()
	return true

func set_voices_enabled(enabled_flag: bool, persist_setting: bool = true) -> bool:
	voices_generation += 1
	var gen := voices_generation
	voices_release_resources()
	voices_enabled = enabled_flag
	voices_suspended = false
	if not enabled_flag:
		voices_status = "off"
		voices_error = ""
		if persist_setting:
			save_godot_settings()
		update_block_ui()
		if persist_setting and info != null:
			var off_msg := "Experimental Neighborhood Voices: Off (default-off · game saves unaffected)."
			info.text = "%s\nSettings stored separately from game saves · Core gathering stays complete\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % off_msg
			announce_a11y_status(off_msg)
		else:
			sync_web_a11y_status()
		return false
	voices_status = "loading"
	voices_error = ""
	if persist_setting:
		save_godot_settings()
	var ok := load_voices_for_generation(gen)
	if persist_setting and info != null:
		if ok:
			present_voices_summary()
		else:
			var err_msg := "Experimental Neighborhood Voices error: %s" % voices_error
			info.text = "%s\nUse Retry (Shift+/) or switch Voices Off · Core gathering unaffected\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % err_msg
			announce_a11y_status(err_msg)
	return ok

func toggle_voices_enabled() -> bool:
	show_block_panel(true)
	return set_voices_enabled(not voices_enabled, true)

func retry_voices_load() -> bool:
	if not voices_enabled:
		return false
	voices_generation += 1
	var gen := voices_generation
	voices_release_resources()
	voices_suspended = false
	voices_status = "loading"
	voices_error = ""
	var ok := load_voices_for_generation(gen)
	if info != null:
		if ok:
			present_voices_summary()
		else:
			var msg := "Neighborhood Voices retry failed: %s" % voices_error
			info.text = "%s\nDefault-off optional shelf · Core gathering unaffected\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % msg
			announce_a11y_status(msg)
	return ok

func suspend_voices() -> bool:
	if not voices_enabled:
		return false
	var t0 := Time.get_ticks_usec()
	var had_error := (voices_status == "error" or not voices_error.is_empty())
	voices_generation += 1
	voices_release_resources()
	voices_suspended = true
	voices_status = "error" if had_error else "paused"
	update_block_ui()
	sync_web_a11y_status()
	last_voices_teardown_usec = maxi(1, Time.get_ticks_usec() - t0)
	return true

func resume_voices() -> bool:
	if not voices_enabled or voices_status != "paused":
		return false
	voices_suspended = false
	return retry_voices_load()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		suspend_voices()
	elif what == NOTIFICATION_APPLICATION_RESUMED or what == NOTIFICATION_WM_WINDOW_FOCUS_IN or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		resume_voices()

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
					var progLen = Array.isArray(data.programme_published) ? data.programme_published.length : 0;
					var hostCur = data.hosting_current ? (" (" + data.hosting_current + ")") : "";
					var voicesTag = data.voices_enabled ? ("On:" + (data.voices_status || "ready")) : "Off";
					s.textContent = "Neighbors " + data.visited_count + "/5 · Mural " + data.mural_count + "/3 (" + data.mural_palette + ") · Soundcheck " + (data.soundcheck_done ? "Done" : "Pending") + " · Block " + (data.block_opened ? "Opened" : (data.block_ready ? "Ready" : "In progress")) + " · Compton's " + (data.history_read ? "Read" : "Unread") + " · Black Hawk " + (data.blackhawk_discovered ? "Found" : "Unvisited") + " · District " + (data.district_boundary_visible ? "Shown" : "Hidden") + " · Keepsake " + (data.keepsake_status || "unasked") + " · Loans " + (data.loans_returned_count || 0) + "/3 · Programme " + progLen + "/4 · Hosted " + (data.hosting_completed_count || 0) + "/4" + hostCur + " · Civic " + (data.civic_phase || "idle") + " · Film " + (data.film_phase || "idle") + " (" + (data.film_captured_count || 0) + "/3) · Voices " + voicesTag;
				}
				return true;
			} catch (_e) {
				return false;
			}
		};
		window.__tenderloinWebVoicesLifecyclePending = '';
		window.addEventListener('pagehide', function() {
			window.__tenderloinWebVoicesLifecyclePending = 'suspend';
			if (window.__tenderloinLastExportUrl) {
				try { URL.revokeObjectURL(window.__tenderloinLastExportUrl); } catch (_e) {}
				window.__tenderloinLastExportUrl = '';
			}
		});
		window.addEventListener('pageshow', function(e) {
			if (e && e.persisted) {
				window.__tenderloinWebVoicesLifecyclePending = 'resume';
			}
		});
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
				if (f.size <= 0 || f.size > %d) {
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
		window.__tenderloinLastExportedSvg = null;
		window.__tenderloinLastExportUrl = '';
		window.__tenderloinExportKeepsakeSvg = function(svgText, fileName) {
			var cleanSvg = String(svgText || '');
			var cleanName = String(fileName || 'tenderloin-redux-godot-afternoon.svg');
			if (!cleanSvg) return false;
			var utf8Bytes = (typeof TextEncoder !== 'undefined') ? (new TextEncoder().encode(cleanSvg).length) : cleanSvg.length;
			window.__tenderloinLastExportedSvg = {
				filename: cleanName,
				svg: cleanSvg,
				bytes: utf8Bytes
			};
			if (!window.__tenderloinSuppressDownload) {
				try {
					if (window.__tenderloinLastExportUrl) {
						URL.revokeObjectURL(window.__tenderloinLastExportUrl);
						window.__tenderloinLastExportUrl = '';
					}
					var blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
					var url = URL.createObjectURL(blob);
					window.__tenderloinLastExportUrl = url;
					var a = document.createElement('a');
					a.href = url;
					a.download = cleanName;
					a.style.display = 'none';
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
				} catch (_e) {}
			}
			return true;
		};
		window.__tenderloinLastPerfSnapshot = null;
		window.__tenderloinWebPerfRequestPending = false;
		window.__tenderloinRequestPerfSnapshot = function() {
			window.__tenderloinLastPerfSnapshot = null;
			window.__tenderloinWebPerfRequestPending = true;
			return true;
		};
	})();
	""" % BROWSER_SAVE_MAX_BYTES
	JavaScriptBridge.eval(js_a11y, true)

func measure_local_performance() -> Dictionary:
	var saved_walk_cache := cell_walkable_cache.duplicate()
	cell_walkable_cache.clear()
	var t_path0 := Time.get_ticks_usec()
	var bh_path := find_path(neighbor_xz(4), blackhawk_xz())
	var path_usec := maxi(1, Time.get_ticks_usec() - t_path0)
	var path_astar_cells := last_astar_expanded_cells
	cell_walkable_cache = saved_walk_cache
	var t_save0 := Time.get_ticks_usec()
	var env := build_save_envelope()
	var raw_json := JSON.stringify(env)
	var parsed_back: Variant = JSON.parse_string(raw_json)
	var save_usec := maxi(1, Time.get_ticks_usec() - t_save0)
	var save_bytes := raw_json.to_utf8_buffer().size()
	var save_parse_ok := (parsed_back is Dictionary) and String((parsed_back as Dictionary).get("schema", "")) == "tenderloin-redux.godot.save"
	var teardown_measured := last_voices_teardown_usec > 0
	var teardown_usec := last_voices_teardown_usec if teardown_measured else -1
	var teardown_budget_ok := (not teardown_measured) or (teardown_usec < VOICES_TEARDOWN_BUDGET_MAX_USEC)
	var street_count := int((data.get("streets", []) as Array).size())
	var wider_street_count := street_ways.size()
	var district_ok := district_boundary_node != null and district_boundary_node.mesh != null
	var budget_ok := (
		meshes.size() == 58
		and wider_meshes.size() == 130
		and all_buildings.size() == 188
		and street_count == 20
		and wider_street_count == 41
		and district_ok
		and bh_path.size() >= 2
		and path_astar_cells > 0
		and path_usec < PATHFIND_BUDGET_MAX_USEC
		and save_parse_ok
		and save_bytes > 0
		and save_bytes <= SAVE_BUDGET_MAX_BYTES
		and save_usec < SAVE_SERIALIZE_BUDGET_MAX_USEC
		and teardown_budget_ok
	)
	return {
		"opening_buildings_count": meshes.size(),
		"wider_buildings_count": wider_meshes.size(),
		"total_buildings_count": all_buildings.size(),
		"street_ways_count": street_count,
		"wider_street_ways_count": wider_street_count,
		"district_boundary_present": district_ok,
		"pathfind_blackhawk_waypoints": bh_path.size(),
		"pathfind_blackhawk_usec": path_usec,
		"pathfind_budget_max_usec": PATHFIND_BUDGET_MAX_USEC,
		"pathfind_cold_cache": true,
		"astar_used": path_astar_cells > 0,
		"astar_expanded_cells": path_astar_cells,
		"save_bytes": save_bytes,
		"save_budget_max_bytes": SAVE_BUDGET_MAX_BYTES,
		"save_roundtrip_usec": save_usec,
		"save_budget_max_usec": SAVE_SERIALIZE_BUDGET_MAX_USEC,
		"voices_teardown_measured": teardown_measured,
		"voices_teardown_usec": teardown_usec,
		"voices_teardown_budget_max_usec": VOICES_TEARDOWN_BUDGET_MAX_USEC,
		"object_node_count": int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)),
		"svg_samples": {
			"keepsake": build_keepsake_svg({
				"status": "taken",
				"participants": ["bea", "celeste", "dez", "thanh"],
				"mural": {"sun": {"col": 0, "row": 0}, "wave": {"col": 2, "row": 1}, "rise": {"col": 4, "row": 2}},
				"palette": "garden",
				"layout": "table"
			}),
			"programme": build_programme_svg(["stories", "beats", "pause", "art"]),
			"tile_panel": build_tile_panel_svg({"palette": "warm", "tiles": [0, 1, 2, 2, 1, 0]}),
			"civic_plan": build_civic_plan_svg({"topic": "repairs", "format": "circle", "notes": "themes"}),
			"film_frame": build_film_frame_svg({"framing": "close", "plan": "quiet", "order": ["seat", "paint", "welcome"]}, "seat")
		},
		"within_budget": budget_ok
	}

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
		"history_read": history_read,
		"blackhawk_discovered": blackhawk_discovered,
		"district_boundary_visible": district_boundary_visible,
		"keepsake_status": String(keepsake_photo.get("status", "unasked")),
		"keepsake_participants": keepsake_photo.get("participants", []).duplicate(),
		"keepsake_exported": not last_exported_keepsake_svg.is_empty(),
		"epilogue_packing": epilogue_packing,
		"loans_returned_count": epilogue_returned.size(),
		"epilogue_done": is_epilogue_done(),
		"programme_published": programme_published.duplicate(),
		"hosting_order": hosting_order.duplicate(),
		"hosting_completed_count": hosting_results.size(),
		"hosting_current": current_hosting_activity(),
		"hosting_done": is_hosting_done(),
		"civic_phase": civic_phase,
		"civic_done": civic_phase == "done",
		"film_phase": film_phase,
		"film_captured_count": film_captured.size(),
		"film_screen_frame": film_screen_frame,
		"film_done": film_phase == "done",
		"voices_enabled": voices_enabled,
		"voices_status": voices_status,
		"voices_count": voices_records.size(),
		"voices_generation": voices_generation,
		"last_voices_teardown_usec": last_voices_teardown_usec,
		"total_buildings": all_buildings.size(),
		"wider_buildings_count": wider_meshes.size(),
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
	var perf_req: Variant = JavaScriptBridge.eval("var pr = Boolean(window.__tenderloinWebPerfRequestPending); window.__tenderloinWebPerfRequestPending = false; pr;", true)
	if bool(perf_req):
		var perf_json := JSON.stringify(measure_local_performance())
		JavaScriptBridge.eval("window.__tenderloinLastPerfSnapshot = JSON.parse(%s);" % JSON.stringify(perf_json), true)
	var voices_lc_var: Variant = JavaScriptBridge.eval("var vlc = window.__tenderloinWebVoicesLifecyclePending || ''; window.__tenderloinWebVoicesLifecyclePending = ''; String(vlc);", true)
	var voices_lc := String(voices_lc_var) if voices_lc_var is String else ""
	if voices_lc == "suspend":
		suspend_voices()
	elif voices_lc == "resume":
		resume_voices()
	var has_save_pending: Variant = JavaScriptBridge.eval("Boolean(window.__tenderloinWebSavePending);", true)
	if bool(has_save_pending):
		var save_err_var: Variant = JavaScriptBridge.eval("window.__tenderloinWebSavePending ? String(window.__tenderloinWebSavePending.err || '') : '';", true)
		var save_raw_var: Variant = JavaScriptBridge.eval("var sp = window.__tenderloinWebSavePending; window.__tenderloinWebSavePending = null; (sp && !sp.err) ? String(sp.raw || '') : '';", true)
		var save_err := String(save_err_var) if save_err_var is String else ""
		var save_raw := String(save_raw_var) if save_raw_var is String else ""
		if not save_err.is_empty():
			browser_import_status = "error"
			browser_import_message = "Browser save file exceeds 64 KB limit; Godot progress kept." if save_err == "size" else "Browser save file could not be read; Godot progress kept."
			update_block_ui()
			info.text = "%s\nBrowser save ('%s') is read-only and never overwritten by Godot\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
			announce_a11y_status(browser_import_message)
		else:
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
		if arg == "--test-suite":
			return GODOT_TEST_SAVE_PATH
	for arg in OS.get_cmdline_args():
		if arg.ends_with("study_test.gd") or arg == "--test-suite":
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
		"block_opened": block_opened,
		"history_read": history_read,
		"blackhawk_discovered": blackhawk_discovered,
		"district_boundary_visible": district_boundary_visible,
		"epilogue": {
			"photo": keepsake_photo.duplicate(true),
			"packing": epilogue_packing,
			"returned": epilogue_returned.duplicate()
		},
		"programme": {
			"order": programme_order.duplicate(),
			"published": programme_published.duplicate()
		},
		"hosting": {
			"order": hosting_order.duplicate(),
			"results": hosting_results.duplicate(true),
			"draft": hosting_draft.duplicate(true)
		},
		"civic": {
			"phase": civic_phase,
			"draft": copy_civic_plan(civic_draft),
			"result": copy_civic_plan(civic_result) if is_valid_civic_plan(civic_result) else null
		},
		"film": {
			"phase": film_phase,
			"draft": copy_film_plan(film_draft),
			"result": copy_film_plan(film_result) if is_valid_film_plan(film_result) else null,
			"captured": film_captured.duplicate()
		},
		"optional": optional_save_data.duplicate(true)
	}

func save_godot_state() -> bool:
	save_seq += 1
	var raw_json := JSON.stringify(build_save_envelope())
	var wrote := false
	if OS.has_feature("web"):
		var js_literal := JSON.stringify(raw_json)
		var web_ok: Variant = JavaScriptBridge.eval("try { window.localStorage.setItem('%s', %s); true; } catch (_e) { false; }" % [GODOT_WEB_STORAGE_KEY, js_literal], true)
		wrote = wrote or bool(web_ok)
	if not wrote:
		var file := FileAccess.open(save_path, FileAccess.WRITE)
		if file != null:
			file.store_string(raw_json)
			file.close()
			wrote = true
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
	keepsake_photo = default_keepsake_photo()
	last_exported_keepsake_svg = ""
	epilogue_packing = false
	epilogue_returned.clear()
	programme_order.clear()
	programme_published.clear()
	hosting_order.clear()
	hosting_results.clear()
	hosting_draft = default_hosting_draft()
	civic_phase = "idle"
	civic_draft = default_civic_draft()
	civic_result = {}
	film_phase = "idle"
	film_draft = default_film_draft()
	film_result = {}
	film_captured.clear()
	film_screen_frame = 0
	optional_save_data = {}
	history_read = false
	blackhawk_discovered = false
	district_boundary_visible = true
	walking_to_history_stop = ""
	arrived_history_stop = ""
	in_wide_overview = false
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
	update_district_boundary_3d()
	update_history_stops_3d()
	update_mural_ui()
	update_music_ui()
	update_block_ui()
	sync_web_a11y_status()

func validate_mural_dict(raw_val: Variant, require_full: bool) -> Dictionary:
	if not (raw_val is Dictionary):
		return {"ok": false, "placements": {}}
	var raw_dict: Dictionary = raw_val
	var clean_placements: Dictionary = {}
	var occupied: Dictionary = {}
	for k in raw_dict.keys():
		var motif_key := String(k)
		if not (motif_key in MURAL_MOTIFS):
			return {"ok": false, "placements": {}}
		var cell_val: Variant = raw_dict[k]
		if not (cell_val is Dictionary):
			return {"ok": false, "placements": {}}
		var cell_dict: Dictionary = cell_val
		var c_val: Variant = cell_dict.get("col", null)
		var r_val: Variant = cell_dict.get("row", null)
		if not is_whole_json_number(c_val) or not is_whole_json_number(r_val):
			return {"ok": false, "placements": {}}
		var c_int := int(roundf(float(c_val)))
		var r_int := int(roundf(float(r_val)))
		if not is_valid_mural_cell(c_int, r_int):
			return {"ok": false, "placements": {}}
		var cell_key := "%d,%d" % [c_int, r_int]
		if occupied.has(cell_key):
			return {"ok": false, "placements": {}}
		occupied[cell_key] = true
		clean_placements[motif_key] = {"col": c_int, "row": r_int}
	if require_full and clean_placements.size() != MURAL_MOTIFS.size():
		return {"ok": false, "placements": {}}
	return {"ok": true, "placements": clean_placements}

func validate_godot_epilogue(raw_ep: Variant, allow_opened: bool, fallback_palette: String) -> Dictionary:
	if not (raw_ep is Dictionary):
		return {"ok": false}
	var ep: Dictionary = raw_ep
	var packing := false
	if ep.has("packing"):
		var pk_val: Variant = ep.get("packing")
		if not (pk_val is bool):
			return {"ok": false}
		packing = bool(pk_val)
	var clean_ret: Array[String] = []
	if ep.has("returned"):
		var ret_val: Variant = ep.get("returned")
		if not (ret_val is Array):
			return {"ok": false}
		var seen_ret: Dictionary = {}
		for item in ret_val:
			if not (item is String):
				return {"ok": false}
			var lid := String(item)
			if not (lid in LOAN_IDS) or seen_ret.has(lid):
				return {"ok": false}
			seen_ret[lid] = true
		if not packing and not seen_ret.is_empty():
			return {"ok": false}
		for lid in LOAN_IDS:
			if seen_ret.has(lid):
				clean_ret.append(lid)
	if packing and not ep.has("photo"):
		return {"ok": false}
	var clean_photo := default_keepsake_photo()
	clean_photo["palette"] = fallback_palette
	if ep.has("photo"):
		var ph_val: Variant = ep.get("photo")
		if not (ph_val is Dictionary):
			return {"ok": false}
		var ph: Dictionary = ph_val
		var st_val: Variant = ph.get("status", "unasked")
		if not (st_val is String) or not (String(st_val) in ["unasked", "taken", "skipped"]):
			return {"ok": false}
		var st := String(st_val)
		if packing and st == "unasked":
			return {"ok": false}
		var lay_id := "table"
		if ph.has("layout"):
			var lay_val: Variant = ph.get("layout")
			if not (lay_val is String) or not (String(lay_val) in ["table", "floor"]):
				return {"ok": false}
			lay_id = String(lay_val)
		if st == "taken":
			var p_val: Variant = ph.get("participants", null)
			if not (p_val is Array) or p_val.is_empty():
				return {"ok": false}
			var seen_p: Dictionary = {}
			for item in p_val:
				if not (item is String):
					return {"ok": false}
				var gid := String(item)
				if not (gid in PHOTO_GUESTS) or seen_p.has(gid):
					return {"ok": false}
				seen_p[gid] = true
			var canon_p: Array[String] = []
			for gid in PHOTO_GUESTS:
				if seen_p.has(gid):
					canon_p.append(gid)
			var k_pal_val: Variant = ph.get("palette", "")
			if not (k_pal_val is String) or not (String(k_pal_val) in MURAL_PALETTES):
				return {"ok": false}
			var m_res := validate_mural_dict(ph.get("mural", null), true)
			if not bool(m_res.get("ok", false)):
				return {"ok": false}
			clean_photo = {
				"status": "taken",
				"participants": canon_p,
				"mural": m_res.get("placements", {}),
				"palette": String(k_pal_val),
				"layout": lay_id
			}
		else:
			if ph.has("participants"):
				var non_taken_p: Variant = ph.get("participants")
				if not (non_taken_p is Array) or not (non_taken_p as Array).is_empty():
					return {"ok": false}
			clean_photo = {
				"status": st,
				"participants": [],
				"mural": {},
				"palette": fallback_palette,
				"layout": lay_id
			}
	if not allow_opened:
		return {"ok": true, "photo": default_keepsake_photo(), "packing": false, "returned": [] as Array[String]}
	return {"ok": true, "photo": clean_photo, "packing": packing, "returned": clean_ret}

func validate_godot_programme(raw_prog: Variant, allow_opened: bool) -> Dictionary:
	if not (raw_prog is Dictionary):
		return {"ok": false}
	var prog: Dictionary = raw_prog
	var clean_order: Array[String] = []
	if prog.has("order"):
		var ord_val: Variant = prog.get("order")
		if not (ord_val is Array) or ord_val.size() > PROGRAMME_SEGMENTS.size():
			return {"ok": false}
		for item in ord_val:
			if not (item is String):
				return {"ok": false}
			var sid := String(item)
			if not (sid in PROGRAMME_SEGMENTS) or clean_order.has(sid):
				return {"ok": false}
			clean_order.append(sid)
	var clean_pub: Array[String] = []
	if prog.has("published"):
		var pub_val: Variant = prog.get("published")
		if not (pub_val is Array):
			return {"ok": false}
		if not pub_val.is_empty():
			if pub_val.size() != PROGRAMME_SEGMENTS.size() or programme_issue(pub_val) != "":
				return {"ok": false}
			for item in pub_val:
				clean_pub.append(String(item))
	if not allow_opened:
		return {"ok": true, "order": [] as Array[String], "published": [] as Array[String]}
	return {"ok": true, "order": clean_order, "published": clean_pub}

func validate_godot_hosting(raw_host: Variant, allow_opened: bool) -> Dictionary:
	if not (raw_host is Dictionary):
		return {"ok": false}
	var host: Dictionary = raw_host
	var clean_order: Array[String] = []
	if host.has("order"):
		var ord_val: Variant = host.get("order")
		if not (ord_val is Array):
			return {"ok": false}
		if not ord_val.is_empty():
			if ord_val.size() != PROGRAMME_SEGMENTS.size() or programme_issue(ord_val) != "":
				return {"ok": false}
			for item in ord_val:
				clean_order.append(String(item))
	var clean_results: Array[Dictionary] = []
	if host.has("results"):
		var res_val: Variant = host.get("results")
		if not (res_val is Array) or res_val.size() > PROGRAMME_SEGMENTS.size():
			return {"ok": false}
		if clean_order.is_empty() and not res_val.is_empty():
			return {"ok": false}
		for i in range(res_val.size()):
			var entry_val: Variant = res_val[i]
			if not (entry_val is Dictionary):
				return {"ok": false}
			var entry: Dictionary = entry_val
			var expected_id := clean_order[i]
			if String(entry.get("id", "")) != expected_id:
				return {"ok": false}
			var v: Variant = entry.get("value", null)
			if expected_id == "stories":
				if not (v is String) or not (String(v) in HOSTING_STORIES):
					return {"ok": false}
				clean_results.append({"id": "stories", "value": String(v)})
			elif expected_id == "beats":
				if not is_whole_json_number(v):
					return {"ok": false}
				var pat_i := int(roundf(float(v)))
				if pat_i < 0 or pat_i > 255:
					return {"ok": false}
				clean_results.append({"id": "beats", "value": pat_i})
			elif expected_id == "art":
				if not (v is Dictionary):
					return {"ok": false}
				var art_d: Dictionary = v
				var a_pal: Variant = art_d.get("palette", "")
				var a_tiles: Variant = art_d.get("tiles", null)
				if not (a_pal is String) or not (String(a_pal) in HOSTING_PALETTES) or not (a_tiles is Array) or a_tiles.size() != 6:
					return {"ok": false}
				var clean_t: Array[int] = []
				for tv in a_tiles:
					if not is_whole_json_number(tv):
						return {"ok": false}
					var ti := int(roundf(float(tv)))
					if ti < 0 or ti > 2:
						return {"ok": false}
					clean_t.append(ti)
				clean_results.append({"id": "art", "value": {"palette": String(a_pal), "tiles": clean_t}})
			elif expected_id == "pause":
				if not (v is String) or not (String(v) in HOSTING_QUIETS):
					return {"ok": false}
				clean_results.append({"id": "pause", "value": String(v)})
	var clean_draft := default_hosting_draft()
	if host.has("draft"):
		var dr_val: Variant = host.get("draft")
		if not (dr_val is Dictionary):
			return {"ok": false}
		var dr: Dictionary = dr_val
		if dr.has("story"):
			if not (dr.get("story") is String) or not (String(dr.get("story")) in HOSTING_STORIES):
				return {"ok": false}
			clean_draft["story"] = String(dr.get("story"))
		if dr.has("pattern"):
			var p_v: Variant = dr.get("pattern")
			if not is_whole_json_number(p_v):
				return {"ok": false}
			var p_i := int(roundf(float(p_v)))
			if p_i < 0 or p_i > 255:
				return {"ok": false}
			clean_draft["pattern"] = p_i
		if dr.has("palette"):
			if not (dr.get("palette") is String) or not (String(dr.get("palette")) in HOSTING_PALETTES):
				return {"ok": false}
			clean_draft["palette"] = String(dr.get("palette"))
		if dr.has("quiet"):
			if not (dr.get("quiet") is String) or not (String(dr.get("quiet")) in HOSTING_QUIETS):
				return {"ok": false}
			clean_draft["quiet"] = String(dr.get("quiet"))
		if dr.has("tiles"):
			var dt_val: Variant = dr.get("tiles")
			if not (dt_val is Array) or dt_val.size() != 6:
				return {"ok": false}
			var dt_clean: Array[int] = []
			for tv in dt_val:
				if not is_whole_json_number(tv):
					return {"ok": false}
				var ti := int(roundf(float(tv)))
				if ti < 0 or ti > 2:
					return {"ok": false}
				dt_clean.append(ti)
			clean_draft["tiles"] = dt_clean
	if not allow_opened:
		return {"ok": true, "order": [] as Array[String], "results": [] as Array[Dictionary], "draft": default_hosting_draft()}
	return {"ok": true, "order": clean_order, "results": clean_results, "draft": clean_draft}

func validate_godot_civic(raw_civic: Variant, allow_civic: bool) -> Dictionary:
	if not (raw_civic is Dictionary):
		return {"ok": false}
	var cv: Dictionary = raw_civic
	var ph_val: Variant = cv.get("phase", "idle")
	if not (ph_val is String) or not (String(ph_val) in ["idle", "planning", "meeting", "done"]):
		return {"ok": false}
	var ph := String(ph_val)
	var clean_draft := default_civic_draft()
	if cv.has("draft"):
		var dr_val: Variant = cv.get("draft")
		if not (dr_val is Dictionary):
			return {"ok": false}
		var dr: Dictionary = dr_val
		if dr.has("topic"):
			if not (dr.get("topic") is String) or not (String(dr.get("topic")) in CIVIC_TOPICS):
				return {"ok": false}
			clean_draft["topic"] = String(dr.get("topic"))
		if dr.has("format"):
			if not (dr.get("format") is String) or not (String(dr.get("format")) in CIVIC_FORMATS):
				return {"ok": false}
			clean_draft["format"] = String(dr.get("format"))
		if dr.has("notes"):
			if not (dr.get("notes") is String) or not (String(dr.get("notes")) in CIVIC_NOTES):
				return {"ok": false}
			clean_draft["notes"] = String(dr.get("notes"))
	var clean_result: Dictionary = {}
	if cv.has("result") and cv.get("result") != null:
		var r_val: Variant = cv.get("result")
		if not is_valid_civic_plan(r_val):
			return {"ok": false}
		clean_result = copy_civic_plan(r_val as Dictionary)
	if ph in ["meeting", "done"]:
		if clean_result.is_empty():
			return {"ok": false}
		clean_draft = copy_civic_plan(clean_result)
	elif not clean_result.is_empty():
		return {"ok": false}
	if not allow_civic:
		if ph != "idle":
			return {"ok": false}
		return {"ok": true, "phase": "idle", "draft": default_civic_draft(), "result": {}}
	return {"ok": true, "phase": ph, "draft": clean_draft, "result": clean_result}

func validate_godot_film(raw_film: Variant, allow_film: bool) -> Dictionary:
	if not (raw_film is Dictionary):
		return {"ok": false}
	var fm: Dictionary = raw_film
	var ph_val: Variant = fm.get("phase", "idle")
	if not (ph_val is String) or not (String(ph_val) in ["idle", "planning", "hold", "shooting", "done"]):
		return {"ok": false}
	var ph := String(ph_val)
	var clean_draft := default_film_draft()
	if fm.has("draft"):
		var dr_val: Variant = fm.get("draft")
		if not (dr_val is Dictionary):
			return {"ok": false}
		var dr: Dictionary = dr_val
		if dr.has("framing"):
			if not (dr.get("framing") is String) or not (String(dr.get("framing")) in FILM_FRAMING):
				return {"ok": false}
			clean_draft["framing"] = String(dr.get("framing"))
		if dr.has("plan"):
			if not (dr.get("plan") is String) or not (String(dr.get("plan")) in FILM_PLANS):
				return {"ok": false}
			clean_draft["plan"] = String(dr.get("plan"))
		if dr.has("order"):
			var ord_val: Variant = dr.get("order")
			if not is_valid_film_order(ord_val):
				return {"ok": false}
			var c_ord: Array[String] = []
			for s_item in (ord_val as Array):
				c_ord.append(String(s_item))
			clean_draft["order"] = c_ord
	var clean_result: Dictionary = {}
	if fm.has("result") and fm.get("result") != null:
		var r_val: Variant = fm.get("result")
		if not is_valid_film_plan(r_val):
			return {"ok": false}
		clean_result = copy_film_plan(r_val as Dictionary)
	var clean_cap: Array[String] = []
	if fm.has("captured"):
		var cap_val: Variant = fm.get("captured")
		if not (cap_val is Array) or (cap_val as Array).size() > FILM_SHOTS.size():
			return {"ok": false}
		for c_item in (cap_val as Array):
			if not (c_item is String) or not (String(c_item) in FILM_SHOTS):
				return {"ok": false}
			clean_cap.append(String(c_item))
	if ph in ["idle", "planning"]:
		if not clean_result.is_empty() or not clean_cap.is_empty():
			return {"ok": false}
	elif ph == "hold":
		if clean_result.is_empty() or not clean_cap.is_empty():
			return {"ok": false}
		clean_draft = copy_film_plan(clean_result)
	elif ph == "shooting":
		if clean_result.is_empty() or clean_cap.size() >= FILM_SHOTS.size():
			return {"ok": false}
		var r_ord: Array = clean_result.get("order", [])
		for i in range(clean_cap.size()):
			if clean_cap[i] != String(r_ord[i]):
				return {"ok": false}
		clean_draft = copy_film_plan(clean_result)
	elif ph == "done":
		if clean_result.is_empty() or clean_cap.size() != FILM_SHOTS.size():
			return {"ok": false}
		var r_ord_d: Array = clean_result.get("order", [])
		for i in range(FILM_SHOTS.size()):
			if clean_cap[i] != String(r_ord_d[i]):
				return {"ok": false}
		clean_draft = copy_film_plan(clean_result)
	if not allow_film:
		if ph != "idle":
			return {"ok": false}
		return {"ok": true, "phase": "idle", "draft": default_film_draft(), "result": {}, "captured": [] as Array[String]}
	return {"ok": true, "phase": ph, "draft": clean_draft, "result": clean_result, "captured": clean_cap}

func validate_godot_optional(raw_opt: Variant) -> Dictionary:
	if not (raw_opt is Dictionary):
		return {"ok": false}
	var serialized := JSON.stringify(raw_opt)
	if serialized.length() > OPTIONAL_SAVE_MAX_BYTES:
		return {"ok": false}
	return {"ok": true, "optional": (raw_opt as Dictionary).duplicate(true)}

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
	var hr_done := false
	if env.has("history_read"):
		var hr_val: Variant = env.get("history_read")
		if not (hr_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		hr_done = bool(hr_val)
	var bh_done := false
	if env.has("blackhawk_discovered"):
		var bh_val: Variant = env.get("blackhawk_discovered")
		if not (bh_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		bh_done = bool(bh_val)
	var db_vis := true
	if env.has("district_boundary_visible"):
		var db_val: Variant = env.get("district_boundary_visible")
		if not (db_val is bool):
			reset_mural_state_to_defaults("recovered")
			return false
		db_vis = bool(db_val)
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
	var m_check := validate_mural_dict(env.get("mural_placements", null), false)
	if not bool(m_check.get("ok", false)):
		reset_mural_state_to_defaults("recovered")
		return false
	var clean_placements: Dictionary = m_check.get("placements", {})
	var will_open := bo_done and clean_visited.size() >= neighbors.size() and clean_placements.size() == MURAL_MOTIFS.size() and sc_done
	var ep_res := {"ok": true, "photo": default_keepsake_photo(), "packing": false, "returned": [] as Array[String]}
	if env.has("epilogue"):
		ep_res = validate_godot_epilogue(env.get("epilogue"), will_open, pal_id)
		if not bool(ep_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var prog_res := {"ok": true, "order": [] as Array[String], "published": [] as Array[String]}
	if env.has("programme"):
		prog_res = validate_godot_programme(env.get("programme"), will_open)
		if not bool(prog_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var host_res := {"ok": true, "order": [] as Array[String], "results": [] as Array[Dictionary], "draft": default_hosting_draft()}
	if env.has("hosting"):
		host_res = validate_godot_hosting(env.get("hosting"), will_open)
		if not bool(host_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var host_done := will_open and (host_res.get("order", []) as Array).size() == PROGRAMME_SEGMENTS.size() and (host_res.get("results", []) as Array).size() == PROGRAMME_SEGMENTS.size()
	var civic_res := {"ok": true, "phase": "idle", "draft": default_civic_draft(), "result": {}}
	if env.has("civic"):
		civic_res = validate_godot_civic(env.get("civic"), host_done)
		if not bool(civic_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var civic_done := host_done and String(civic_res.get("phase", "idle")) == "done"
	var film_res := {"ok": true, "phase": "idle", "draft": default_film_draft(), "result": {}, "captured": [] as Array[String]}
	if env.has("film"):
		film_res = validate_godot_film(env.get("film"), civic_done)
		if not bool(film_res.get("ok", false)):
			reset_mural_state_to_defaults("recovered")
			return false
	var opt_res := {"ok": true, "optional": {}}
	if env.has("optional"):
		opt_res = validate_godot_optional(env.get("optional"))
		if not bool(opt_res.get("ok", false)):
			opt_res = {"ok": true, "optional": {}}
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
	history_read = hr_done
	blackhawk_discovered = bh_done
	district_boundary_visible = db_vis
	block_opened = will_open
	keepsake_photo = ep_res.get("photo", default_keepsake_photo())
	last_exported_keepsake_svg = ""
	epilogue_packing = bool(ep_res.get("packing", false))
	epilogue_returned = ep_res.get("returned", [] as Array[String])
	programme_order = prog_res.get("order", [] as Array[String])
	programme_published = prog_res.get("published", [] as Array[String])
	hosting_order = host_res.get("order", [] as Array[String])
	hosting_results = host_res.get("results", [] as Array[Dictionary])
	hosting_draft = host_res.get("draft", default_hosting_draft())
	civic_phase = String(civic_res.get("phase", "idle"))
	civic_draft = civic_res.get("draft", default_civic_draft())
	civic_result = civic_res.get("result", {})
	film_phase = String(film_res.get("phase", "idle"))
	film_draft = film_res.get("draft", default_film_draft())
	film_result = film_res.get("result", {})
	film_captured = film_res.get("captured", [] as Array[String])
	film_screen_frame = 0
	optional_save_data = opt_res.get("optional", {})
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
	update_speaker_3d()
	update_block_3d()
	update_district_boundary_3d()
	update_history_stops_3d()
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
	var history_flag := (saved.get("history", false) is bool) and bool(saved.get("history", false))
	var blackhawk_flag := (saved.get("blackhawk", false) is bool) and bool(saved.get("blackhawk", false))
	var clean_epilogue := {"photo": default_keepsake_photo(), "packing": false, "returned": [] as Array[String]}
	clean_epilogue["photo"]["palette"] = pal_id
	clean_epilogue["photo"]["layout"] = layout_id if layout_id != "" else "table"
	if opened_done and (saved.get("epilogue", null) is Dictionary):
		var raw_ep: Dictionary = saved.get("epilogue")
		var pk := (raw_ep.get("packing", false) is bool) and bool(raw_ep.get("packing", false))
		var ret_list: Array[String] = []
		if pk and (raw_ep.get("returned", null) is Array):
			var raw_ret: Array = raw_ep.get("returned")
			for lid in LOAN_IDS:
				for r_item in raw_ret:
					if (r_item is String) and String(r_item) == lid:
						ret_list.append(lid)
						break
		var ph_status := "skipped" if pk else "unasked"
		var ph_parts: Array[String] = []
		var ph_mural: Dictionary = {}
		var ph_pal := pal_id
		var ph_lay := layout_id if layout_id != "" else "table"
		if raw_ep.get("photo", null) is Dictionary:
			var raw_ph: Dictionary = raw_ep.get("photo")
			var cand_st := String(raw_ph.get("status", "")) if (raw_ph.get("status", null) is String) else ""
			if cand_st == "skipped":
				ph_status = "skipped"
			elif cand_st == "taken":
				var raw_p_val: Variant = raw_ph.get("participants", null)
				var raw_lay_val: Variant = raw_ph.get("layout", null)
				var raw_pal_val: Variant = raw_ph.get("palette", null)
				var m_chk := validate_mural_dict(raw_ph.get("mural", null), true)
				var all_p_valid := (raw_p_val is Array) and not (raw_p_val as Array).is_empty()
				if all_p_valid:
					for p_item in (raw_p_val as Array):
						if not (p_item is String) or not (String(p_item) in PHOTO_GUESTS):
							all_p_valid = false
							break
				if all_p_valid and (raw_lay_val is String) and (String(raw_lay_val) in ["table", "floor"]) and (raw_pal_val is String) and (String(raw_pal_val) in MURAL_PALETTES) and bool(m_chk.get("ok", false)):
					var raw_p_arr: Array = raw_p_val
					for gid in PHOTO_GUESTS:
						if raw_p_arr.has(gid):
							ph_parts.append(gid)
					ph_mural = m_chk.get("placements", {})
					ph_pal = String(raw_pal_val)
					ph_lay = String(raw_lay_val)
					ph_status = "taken"
			if pk and ph_status == "unasked":
				ph_status = "skipped"
		clean_epilogue = {
			"photo": {
				"status": ph_status,
				"participants": ph_parts if ph_status == "taken" else ([] as Array[String]),
				"mural": ph_mural if ph_status == "taken" else {},
				"palette": ph_pal,
				"layout": ph_lay
			},
			"packing": pk,
			"returned": ret_list
		}
	var clean_prog_order: Array[String] = []
	var clean_prog_pub: Array[String] = []
	if opened_done and (saved.get("programme", null) is Dictionary):
		var raw_pr: Dictionary = saved.get("programme")
		if raw_pr.get("order", null) is Array:
			for item in raw_pr.get("order"):
				if (item is String) and (String(item) in PROGRAMME_SEGMENTS) and not clean_prog_order.has(String(item)):
					clean_prog_order.append(String(item))
		if raw_pr.get("published", null) is Array:
			var cand_pub: Array = raw_pr.get("published")
			if cand_pub.size() == PROGRAMME_SEGMENTS.size() and programme_issue(cand_pub) == "":
				for item in cand_pub:
					clean_prog_pub.append(String(item))
	var clean_host_order: Array[String] = []
	var clean_host_results: Array[Dictionary] = []
	var clean_host_draft := default_hosting_draft()
	if opened_done and (saved.get("hosting", null) is Dictionary):
		var raw_ho: Dictionary = saved.get("hosting")
		if raw_ho.get("order", null) is Array:
			var cand_ho: Array = raw_ho.get("order")
			if cand_ho.size() == PROGRAMME_SEGMENTS.size() and programme_issue(cand_ho) == "":
				for item in cand_ho:
					clean_host_order.append(String(item))
		if not clean_host_order.is_empty():
			if raw_ho.get("results", null) is Array:
				var raw_res: Array = raw_ho.get("results")
				for i in range(mini(raw_res.size(), clean_host_order.size())):
					var r_item: Variant = raw_res[i]
					var exp_id := clean_host_order[i]
					if not (r_item is Dictionary) or String(r_item.get("id", "")) != exp_id:
						break
					var rv: Variant = r_item.get("value", null)
					if exp_id == "stories" and (rv is String) and (String(rv) in HOSTING_STORIES):
						clean_host_results.append({"id": "stories", "value": String(rv)})
					elif exp_id == "beats" and is_whole_json_number(rv) and int(roundf(float(rv))) >= 0 and int(roundf(float(rv))) <= 255:
						clean_host_results.append({"id": "beats", "value": int(roundf(float(rv)))})
					elif exp_id == "art" and (rv is Dictionary) and (rv.get("palette", null) is String) and (String(rv.get("palette")) in HOSTING_PALETTES) and (rv.get("tiles", null) is Array) and rv.get("tiles").size() == 6:
						var ok_tiles := true
						var ct: Array[int] = []
						for tv in rv.get("tiles"):
							if not is_whole_json_number(tv) or int(roundf(float(tv))) < 0 or int(roundf(float(tv))) > 2:
								ok_tiles = false
								break
							ct.append(int(roundf(float(tv))))
						if not ok_tiles:
							break
						clean_host_results.append({"id": "art", "value": {"palette": String(rv.get("palette")), "tiles": ct}})
					elif exp_id == "pause" and (rv is String) and (String(rv) in HOSTING_QUIETS):
						clean_host_results.append({"id": "pause", "value": String(rv)})
					else:
						break
			if raw_ho.get("draft", null) is Dictionary:
				var dr: Dictionary = raw_ho.get("draft")
				if (dr.get("story", null) is String) and String(dr.get("story")) in HOSTING_STORIES:
					clean_host_draft["story"] = String(dr.get("story"))
				if is_whole_json_number(dr.get("pattern", null)) and int(roundf(float(dr.get("pattern")))) >= 0 and int(roundf(float(dr.get("pattern")))) <= 255:
					clean_host_draft["pattern"] = int(roundf(float(dr.get("pattern"))))
				if (dr.get("palette", null) is String) and String(dr.get("palette")) in HOSTING_PALETTES:
					clean_host_draft["palette"] = String(dr.get("palette"))
				if (dr.get("quiet", null) is String) and String(dr.get("quiet")) in HOSTING_QUIETS:
					clean_host_draft["quiet"] = String(dr.get("quiet"))
				if (dr.get("tiles", null) is Array) and dr.get("tiles").size() == 6:
					var dt: Array[int] = []
					var ok_dt := true
					for tv in dr.get("tiles"):
						if not is_whole_json_number(tv) or int(roundf(float(tv))) < 0 or int(roundf(float(tv))) > 2:
							ok_dt = false
							break
						dt.append(int(roundf(float(tv))))
					if ok_dt:
						clean_host_draft["tiles"] = dt
	var civic_avail := opened_done and clean_host_results.size() == PROGRAMME_SEGMENTS.size()
	var clean_civic := {"phase": "idle", "draft": default_civic_draft(), "result": {}}
	if civic_avail and (saved.get("civic", null) is Dictionary):
		var raw_cv: Dictionary = saved.get("civic")
		var cv_ph := String(raw_cv.get("phase", "")) if (raw_cv.get("phase", null) is String) else ""
		if cv_ph in ["planning", "meeting", "done"]:
			clean_civic["phase"] = "planning"
			if raw_cv.get("draft", null) is Dictionary:
				var cv_dr: Dictionary = raw_cv.get("draft")
				if (cv_dr.get("topic", null) is String) and String(cv_dr.get("topic")) in CIVIC_TOPICS:
					clean_civic["draft"]["topic"] = String(cv_dr.get("topic"))
				if (cv_dr.get("format", null) is String) and String(cv_dr.get("format")) in CIVIC_FORMATS:
					clean_civic["draft"]["format"] = String(cv_dr.get("format"))
				if (cv_dr.get("notes", null) is String) and String(cv_dr.get("notes")) in CIVIC_NOTES:
					clean_civic["draft"]["notes"] = String(cv_dr.get("notes"))
			if (cv_ph in ["meeting", "done"]) and is_valid_civic_plan(raw_cv.get("result", null)):
				var cv_res := copy_civic_plan(raw_cv.get("result") as Dictionary)
				clean_civic["phase"] = cv_ph
				clean_civic["result"] = cv_res
				clean_civic["draft"] = copy_civic_plan(cv_res)
	var film_avail := opened_done and String(clean_civic.get("phase", "idle")) == "done"
	var clean_film := {"phase": "idle", "draft": default_film_draft(), "result": {}, "captured": [] as Array[String]}
	if film_avail and (saved.get("film", null) is Dictionary):
		var raw_fm: Dictionary = saved.get("film")
		var fm_ph := String(raw_fm.get("phase", "")) if (raw_fm.get("phase", null) is String) else ""
		if fm_ph in ["planning", "hold", "shooting", "done"]:
			clean_film["phase"] = "planning"
			if raw_fm.get("draft", null) is Dictionary:
				var fm_dr: Dictionary = raw_fm.get("draft")
				if (fm_dr.get("framing", null) is String) and String(fm_dr.get("framing")) in FILM_FRAMING:
					clean_film["draft"]["framing"] = String(fm_dr.get("framing"))
				if (fm_dr.get("plan", null) is String) and String(fm_dr.get("plan")) in FILM_PLANS:
					clean_film["draft"]["plan"] = String(fm_dr.get("plan"))
				if is_valid_film_order(fm_dr.get("order", null)):
					var f_ord: Array[String] = []
					for s_item in (fm_dr.get("order") as Array):
						f_ord.append(String(s_item))
					clean_film["draft"]["order"] = f_ord
			if fm_ph != "planning" and is_valid_film_plan(raw_fm.get("result", null)):
				var fm_res := copy_film_plan(raw_fm.get("result") as Dictionary)
				clean_film["result"] = fm_res
				clean_film["draft"] = copy_film_plan(fm_res)
				if fm_ph == "hold":
					clean_film["phase"] = "hold"
				else:
					clean_film["phase"] = "shooting"
					var f_cap: Array[String] = []
					if raw_fm.get("captured", null) is Array:
						var raw_cap: Array = raw_fm.get("captured")
						var res_ord: Array = fm_res.get("order", [])
						for i in range(mini(raw_cap.size(), res_ord.size())):
							if (raw_cap[i] is String) and String(raw_cap[i]) == String(res_ord[i]):
								f_cap.append(String(raw_cap[i]))
							else:
								break
					clean_film["captured"] = f_cap
					if f_cap.size() == FILM_SHOTS.size():
						clean_film["phase"] = "done"
	var clean_optional: Dictionary = {}
	if env.get("optional", null) is Dictionary:
		var cand_opt: Dictionary = env.get("optional")
		if JSON.stringify(cand_opt).length() <= OPTIONAL_SAVE_MAX_BYTES:
			clean_optional = cand_opt.duplicate(true)
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
		"opened": opened_done,
		"history": history_flag,
		"blackhawk": blackhawk_flag,
		"epilogue": clean_epilogue,
		"programme": {"order": clean_prog_order, "published": clean_prog_pub},
		"hosting": {"order": clean_host_order, "results": clean_host_results, "draft": clean_host_draft},
		"civic": clean_civic,
		"film": clean_film,
		"optional": clean_optional
	}

func civic_phase_rank(ph: String) -> int:
	match ph:
		"planning": return 1
		"meeting": return 2
		"done": return 3
		_: return 0

func film_phase_rank(ph: String) -> int:
	match ph:
		"planning": return 1
		"hold": return 2
		"shooting": return 3
		"done": return 4
		_: return 0

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
	history_read = history_read or bool(res.get("history", false))
	blackhawk_discovered = blackhawk_discovered or bool(res.get("blackhawk", false))
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
	block_opened = (block_opened or bool(res.get("opened", false))) and (visited_neighbors.size() >= neighbors.size() and mural_placements.size() == MURAL_MOTIFS.size() and rook_soundcheck_done)
	if block_opened:
		var imp_ep: Dictionary = res.get("epilogue", {})
		var imp_ph: Dictionary = imp_ep.get("photo", {})
		var cur_st := String(keepsake_photo.get("status", "unasked"))
		var imp_st := String(imp_ph.get("status", "unasked"))
		if cur_st != "taken" and imp_st == "taken":
			keepsake_photo = imp_ph.duplicate(true)
		elif cur_st == "unasked" and imp_st == "skipped":
			keepsake_photo = imp_ph.duplicate(true)
		epilogue_packing = epilogue_packing or bool(imp_ep.get("packing", false))
		if epilogue_packing and String(keepsake_photo.get("status", "unasked")) == "unasked":
			keepsake_photo["status"] = "skipped"
		var imp_ret: Array = imp_ep.get("returned", [])
		var merged_ret: Array[String] = []
		for lid in LOAN_IDS:
			if epilogue_returned.has(lid) or imp_ret.has(lid):
				merged_ret.append(lid)
		epilogue_returned = merged_ret
		var imp_pr: Dictionary = res.get("programme", {})
		var imp_pr_ord: Array = imp_pr.get("order", [])
		var imp_pr_pub: Array = imp_pr.get("published", [])
		if imp_pr_ord.size() > programme_order.size():
			programme_order.clear()
			for sid in imp_pr_ord:
				programme_order.append(String(sid))
		if programme_published.is_empty() and imp_pr_pub.size() == PROGRAMME_SEGMENTS.size():
			programme_published.clear()
			for sid in imp_pr_pub:
				programme_published.append(String(sid))
		var imp_ho: Dictionary = res.get("hosting", {})
		var imp_ho_ord: Array = imp_ho.get("order", [])
		var imp_ho_res: Array = imp_ho.get("results", [])
		if hosting_order.is_empty() and imp_ho_ord.size() == PROGRAMME_SEGMENTS.size():
			for sid in imp_ho_ord:
				hosting_order.append(String(sid))
		if imp_ho_res.size() > hosting_results.size() and imp_ho_ord.size() == PROGRAMME_SEGMENTS.size():
			hosting_order.clear()
			for sid in imp_ho_ord:
				hosting_order.append(String(sid))
			hosting_results = imp_ho_res.duplicate(true)
			if imp_ho.get("draft", null) is Dictionary:
				hosting_draft = imp_ho.get("draft").duplicate(true)
		if is_civic_available():
			var imp_cv: Dictionary = res.get("civic", {})
			var imp_cv_ph := String(imp_cv.get("phase", "idle"))
			if civic_phase_rank(imp_cv_ph) > civic_phase_rank(civic_phase):
				civic_phase = imp_cv_ph
				if imp_cv.get("draft", null) is Dictionary:
					civic_draft = copy_civic_plan(imp_cv.get("draft"))
				civic_result = copy_civic_plan(imp_cv.get("result")) if is_valid_civic_plan(imp_cv.get("result", null)) else {}
		if is_film_available():
			var imp_fm: Dictionary = res.get("film", {})
			var imp_fm_ph := String(imp_fm.get("phase", "idle"))
			var imp_fm_cap: Array = imp_fm.get("captured", [])
			if film_phase_rank(imp_fm_ph) > film_phase_rank(film_phase) or (imp_fm_ph == "shooting" and film_phase == "shooting" and imp_fm_cap.size() > film_captured.size()):
				film_phase = imp_fm_ph
				if imp_fm.get("draft", null) is Dictionary:
					film_draft = copy_film_plan(imp_fm.get("draft"))
				film_result = copy_film_plan(imp_fm.get("result")) if is_valid_film_plan(imp_fm.get("result", null)) else {}
				film_captured.clear()
				for s_item in imp_fm_cap:
					film_captured.append(String(s_item))
				film_screen_frame = 0
	var imp_opt: Dictionary = res.get("optional", {})
	if not imp_opt.is_empty():
		var merged_opt := optional_save_data.duplicate(true)
		for k in imp_opt.keys():
			merged_opt[k] = imp_opt[k]
		if JSON.stringify(merged_opt).length() <= OPTIONAL_SAVE_MAX_BYTES:
			optional_save_data = merged_opt
	update_mural_3d()
	update_speaker_3d()
	update_block_3d()
	update_history_stops_3d()
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
		browser_import_status = "picker"
		browser_import_message = "Choose a browser v1 save JSON file to import."
		update_block_ui()
		info.text = "%s\nBrowser save ('%s') is read-only and never overwritten by Godot\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [browser_import_message, BROWSER_WEB_STORAGE_KEY]
		announce_a11y_status(browser_import_message)
		return false
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
	elif FileAccess.file_exists(save_path):
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
	var goal_xz: Vector2 = current_path.back()
	if selected_neighbor >= 0:
		goal_xz = neighbor_xz(selected_neighbor)
	elif walking_to_mural:
		goal_xz = mural_stand_xz()
	elif walking_to_speaker:
		goal_xz = speaker_stand_xz()
	elif not walking_to_history_stop.is_empty():
		goal_xz = history_stop_xz(walking_to_history_stop)
	var use_corridor_speed := walking_to_history_stop == "blackhawk" or player_xz().x < -50.0 or goal_xz.x < -50.0
	var speed := WALK_CORRIDOR_SPEED_M_PER_S if use_corridor_speed else WALK_SPEED_M_PER_S
	var remaining := speed * delta
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
		if not walking_to_history_stop.is_empty() and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_history_stop_arrival(walking_to_history_stop)
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
		if player_visual != null and to_wp.length_squared() > 1e-4:
			player_visual.rotation.y = atan2(to_wp.x, to_wp.y)
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
		if not walking_to_history_stop.is_empty() and nxt.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_history_stop_arrival(walking_to_history_stop)
			return true
		if nxt.distance_to(wp) <= 0.08:
			current_path.remove_at(0)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(false)
	update_route_ribbon(false)
	if selected_neighbor >= 0 or walking_to_mural or walking_to_speaker or not walking_to_history_stop.is_empty():
		var dist_after := player_xz().distance_to(goal_xz)
		if dist_after <= ARRIVAL_DISTANCE_M:
			if selected_neighbor >= 0:
				finish_neighbor_arrival(selected_neighbor)
			elif walking_to_mural:
				finish_mural_arrival()
			elif walking_to_speaker:
				finish_speaker_arrival()
			else:
				finish_history_stop_arrival(walking_to_history_stop)
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
				elif not walking_to_history_stop.is_empty():
					var stop_rec := get_history_stop_record(walking_to_history_stop)
					dest_name = String(stop_rec.get("name", stop_rec.get("title", walking_to_history_stop)))
				arrived_neighbor = -1
				walking_to_mural = false
				walking_to_speaker = false
				walking_to_history_stop = ""
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
	walking_to_history_stop = ""
	pending_celeste_talk = false
	pending_rook_talk = false
	update_route_ribbon(true)
	update_walking_status()

func follow_player() -> void:
	in_overview = false
	in_wide_overview = false
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
	for w_idx in occluded_wider_buildings:
		if w_idx >= 0 and w_idx < wider_meshes.size():
			wider_meshes[w_idx].material_override = wider_building_materials[w_idx]
	occluded_wider_buildings.clear()
	last_occlusion_pos = Vector2(INF, INF)
	last_occlusion_neighbor = -2

func building_record_occludes_point(b: Dictionary, raw_rect: Rect2, focus_xz: Vector2, focus_y: float = 1.0) -> bool:
	var h: float = b.height_m
	if h <= focus_y + 1.0:
		return false
	var max_t := h - focus_y
	var b_rect: Rect2 = raw_rect.grow(CUTAWAY_RADIUS_M)
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

func building_occludes_point(b_idx: int, focus_xz: Vector2, focus_y: float = 1.0) -> bool:
	return building_record_occludes_point(data.buildings[b_idx], building_rects[b_idx], focus_xz, focus_y)

func update_occlusion(force: bool = true) -> void:
	if in_overview or in_wide_overview or selected >= 0:
		clear_occlusion()
		return
	var p_xz := player_xz()
	var occ_tag := selected_neighbor
	if walking_to_mural or arrived_mural:
		occ_tag = 99
	elif walking_to_speaker or arrived_speaker:
		occ_tag = 98
	elif walking_to_history_stop == "comptons" or arrived_history_stop == "comptons":
		occ_tag = 97
	elif walking_to_history_stop == "blackhawk" or arrived_history_stop == "blackhawk":
		occ_tag = 96
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
	if not walking_to_history_stop.is_empty():
		focus_points.append(history_stop_xz(walking_to_history_stop))
		if walking_to_history_stop == "blackhawk":
			focus_points.append(Vector2(-414.0, 56.0))
	elif not arrived_history_stop.is_empty():
		focus_points.append(history_stop_xz(arrived_history_stop))
		if arrived_history_stop == "blackhawk":
			focus_points.append(Vector2(-414.0, 56.0))
	for idx in range(data.buildings.size()):
		for fp in focus_points:
			if building_occludes_point(idx, fp, 1.0):
				occluded_buildings.append(idx)
				meshes[idx].material_override = cutaway_material
				break
	var wider_list: Array = data.get("wider_buildings", [])
	for w_idx in range(wider_meshes.size()):
		for fp in focus_points:
			if building_record_occludes_point(wider_list[w_idx], wider_building_rects[w_idx], fp, 1.0):
				occluded_wider_buildings.append(w_idx)
				wider_meshes[w_idx].material_override = cutaway_material
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
		if (screen_d <= 36.0 and world_d <= 8.5) or world_d <= 4.5:
			if screen_d < best_screen_d:
				best_screen_d = screen_d
				best_idx = i
	var m_screen := camera.unproject_position(MURAL_POS + Vector3(0.0, 1.4, 0.0))
	var m_screen_d := m_screen.distance_to(screen_pos)
	var m_world_d := mural_xz().distance_to(ground_xz)
	if ((m_screen_d <= 38.0 and m_world_d <= 8.5) or m_world_d <= 3.6) and m_screen_d < best_screen_d:
		return walk_to_mural()
	var s_screen := camera.unproject_position(ROOK_SPEAKER_POS + Vector3(0.0, 0.8, 0.0))
	var s_screen_d := s_screen.distance_to(screen_pos)
	var s_world_d := speaker_xz().distance_to(ground_xz)
	if ((s_screen_d <= 36.0 and s_world_d <= 8.5) or s_world_d <= 3.2) and s_screen_d < best_screen_d:
		return walk_to_speaker()
	var c_screen := camera.unproject_position(history_stop_pos_3d("comptons") + Vector3(0.0, 1.3, 0.0))
	var c_screen_d := c_screen.distance_to(screen_pos)
	var c_world_d := comptons_xz().distance_to(ground_xz)
	if ((c_screen_d <= 34.0 and c_world_d <= 8.5) or c_world_d <= 3.0) and c_screen_d < best_screen_d:
		return walk_to_history_stop("comptons")
	var bh_screen := camera.unproject_position(history_stop_pos_3d("blackhawk") + Vector3(0.0, 1.3, 0.0))
	var bh_screen_d := bh_screen.distance_to(screen_pos)
	var bh_world_d := blackhawk_xz().distance_to(ground_xz)
	if ((bh_screen_d <= 36.0 and bh_world_d <= 8.5) or bh_world_d <= 3.5) and bh_screen_d < best_screen_d:
		return walk_to_history_stop("blackhawk")
	var turk_ee_screen := camera.unproject_position(Vector3(-350.0, 3.6, 65.8))
	var leav_ee_screen := camera.unproject_position(Vector3(-290.8, 24.6, 99.4))
	if turk_ee_screen.distance_to(screen_pos) <= 28.0 or leav_ee_screen.distance_to(screen_pos) <= 28.0:
		return inspect_so_what_easter_egg()
	if best_idx >= 0:
		return walk_to_neighbor(best_idx)
	return walk_to_point(ground_xz)

func pan_camera_by_screen_delta(delta_px: Vector2) -> void:
	in_overview = false
	in_wide_overview = false
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
			KEY_Y:
				if event.shift_pressed:
					show_block_panel(true)
					var kp_st := String(keepsake_photo.get("status", "unasked"))
					if kp_st == "taken":
						export_keepsake_svg()
					elif not epilogue_packing and kp_st == "unasked":
						skip_keepsake_photo()
					else:
						var no_kp_msg := "No keepsake photo to export."
						info.text = "%s\nTake the M1 Keepsake Photo (Y) when the block gathering opens to export a keepsake SVG\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % no_kp_msg
						announce_a11y_status(no_kp_msg)
				else:
					advance_epilogue_step()
			KEY_Z:
				if event.shift_pressed:
					cycle_programme_or_hosting_choice()
				else:
					advance_programme_and_hosting_step()
			KEY_Q:
				if event.shift_pressed:
					cycle_civic_choice()
				else:
					advance_civic_step()
			KEY_PERIOD:
				if event.shift_pressed:
					cycle_film_choice_or_frame()
				else:
					advance_film_step()
			KEY_SLASH:
				if event.shift_pressed and voices_enabled:
					if voices_status == "error":
						retry_voices_load()
					elif voices_status == "ready":
						present_voices_summary()
				else:
					toggle_voices_enabled()
			KEY_I:
				import_browser_save_from_web_storage()
			KEY_J:
				walk_to_or_read_history_stop("comptons")
			KEY_H:
				if event.shift_pressed:
					inspect_so_what_easter_egg()
				else:
					walk_to_or_read_history_stop("blackhawk")
			KEY_C:
				toggle_district_boundary()
			KEY_L:
				wide_overview()
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
	var offset_scale := 2.2 if (in_wide_overview or view_size > 300.0) else 1.0
	camera.position = target + CAMERA_OFFSET * offset_scale
	camera.look_at(target)
	camera.force_update_transform()

func choose_next(direction: int) -> void:
	in_overview = false
	in_wide_overview = false
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
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
	in_wide_overview = false
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
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

func wide_overview() -> void:
	in_overview = false
	in_wide_overview = true
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
	walking_to_mural = false
	arrived_mural = false
	pending_celeste_talk = false
	walking_to_speaker = false
	arrived_speaker = false
	pending_rook_talk = false
	walking_to_history_stop = ""
	arrived_history_stop = ""
	show_mural_panel(false)
	show_music_panel(false)
	show_block_panel(false)
	current_path.clear()
	update_route_ribbon(true)
	if selected >= 0:
		meshes[selected].material_override = building_materials[selected]
	selected = -1
	clear_occlusion()
	info.text = wide_overview_text()
	var viewport_size := get_viewport().get_visible_rect().size
	var header: Control = info.get_parent().get_parent()
	var top := header.get_global_rect().end.y + 12
	var bottom := controls.get_global_rect().position.y - 12
	var available := Rect2(12, top, maxf(viewport_size.x - 24, 1), maxf(bottom - top, 1))
	target = Vector3(-130, 0, 15)
	view_size = 560
	update_camera()
	var bounds := projected_wider_bounds()
	view_size *= maxf(bounds.size.x / available.size.x, bounds.size.y / available.size.y) * 1.06
	update_camera()
	bounds = projected_wider_bounds()
	var pixels_per_metre := (camera.unproject_position(target + camera.global_basis.y) - camera.unproject_position(target)).length()
	var offset := bounds.get_center() - available.get_center()
	target += camera.global_basis.x * offset.x / pixels_per_metre - camera.global_basis.y * offset.y / pixels_per_metre
	update_camera()
	announce_a11y_status("Wider Tenderloin overview: %d city footprints across 7 streets; Transgender Cultural District boundary %s." % [all_buildings.size(), "shown" if district_boundary_visible else "hidden"])

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

func projected_wider_bounds() -> Rect2:
	var bounds := Rect2()
	var first := true
	for building in all_buildings:
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
	in_wide_overview = false
	view_size = clampf(view_size * factor, 45, maxf(900, overview_size * 2.5))
	update_camera()
	update_occlusion(true)

func overview_text() -> String:
	return "%d city footprints · 2010 survey · PDDL\nStreets © OpenStreetMap contributors / ODbL\nWASD/tap street to walk · Walk to neighbor (1–5) · Block status (G)" % data.buildings.size()

func wide_overview_text() -> String:
	var dist_state := "Shown" if district_boundary_visible else "Hidden"
	return "%d Tenderloin footprints (%d opening + %d wider) · 7 OSM streets\nTransgender Cultural District (%s, C) · Compton's (J) · Black Hawk (H)\nCity 2010 survey & 5xmc-5bjj (2017) / PDDL · Streets © OpenStreetMap / ODbL" % [all_buildings.size(), data.buildings.size(), wider_meshes.size(), dist_state]

func refit_after_layout() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if in_overview:
		overview()
	elif in_wide_overview:
		wide_overview()

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
		var west_tag := "BH:Found" if blackhawk_discovered else "BH:West"
		var comp_tag := "CC:Read" if history_read else "CC:1966"
		var m1_tag := "Loans:%d/3" % epilogue_returned.size() if epilogue_packing else ("Photo:OK" if String(keepsake_photo.get("status", "unasked")) == "taken" else "M1:Ready")
		var m3_tag := "Host:%d/4" % hosting_results.size()
		var m4_tag := "Film:3/3" if film_phase == "done" else ("Civic:OK" if civic_phase == "done" else ("Civic:" + civic_phase))
		var m5_tag := "Voices:Off"
		if voices_enabled:
			if voices_status == "ready":
				m5_tag = "Voices:" + str(voices_records.size())
			elif voices_status == "error":
				m5_tag = "Voices:Err"
			elif voices_status == "paused":
				m5_tag = "Voices:Paused"
			else:
				m5_tag = "Voices:On"
		var base_detail := "%s · %s · %s · %s · %s · %s · %s" % [get_block_missing_summary(), comp_tag, west_tag, m1_tag, m3_tag, m4_tag, m5_tag]
		block_detail_label.text = base_detail if browser_import_message.is_empty() else ("%s · %s" % [base_detail, browser_import_message])
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
	if block_epilogue_btn != null:
		if is_epilogue_done():
			block_epilogue_btn.text = "Loans: 3/3"
		elif epilogue_packing:
			block_epilogue_btn.text = "Loan: %d/3" % epilogue_returned.size()
		elif String(keepsake_photo.get("status", "unasked")) != "unasked":
			block_epilogue_btn.text = "Pack Loans"
		else:
			block_epilogue_btn.text = "Keepsake"
	if block_programme_btn != null:
		if is_hosting_done():
			block_programme_btn.text = "Hosted: 4/4"
		elif not hosting_order.is_empty():
			block_programme_btn.text = "Host: %d/4" % hosting_results.size()
		elif programme_published.size() == PROGRAMME_SEGMENTS.size():
			block_programme_btn.text = "Start Host"
		else:
			block_programme_btn.text = "Programme"
	if block_civic_btn != null:
		if civic_phase == "done":
			block_civic_btn.text = "Civic: Done"
		elif civic_phase == "meeting":
			block_civic_btn.text = "Civic: Meet"
		elif civic_phase == "planning":
			block_civic_btn.text = "Civic: Plan"
		else:
			block_civic_btn.text = "Civic"
	if block_film_btn != null:
		if film_phase == "done":
			block_film_btn.text = "Film: %d/3" % (film_screen_frame + 1)
		elif film_phase == "shooting":
			block_film_btn.text = "Shot: %d/3" % film_captured.size()
		elif film_phase == "hold":
			block_film_btn.text = "Film: Hold"
		elif film_phase == "planning":
			block_film_btn.text = "Film: Plan"
		else:
			block_film_btn.text = "Film"
	if block_voices_btn != null:
		if voices_enabled:
			block_voices_btn.text = "Voices: Err" if voices_status == "error" else "Voices: On"
		else:
			block_voices_btn.text = "Voices: Off"
	if block_mural_btn != null:
		block_mural_btn.text = "Mural: 3/3" if mural_completed else ("Mural: %d/3" % mural_placements.size())
	if block_rook_btn != null:
		block_rook_btn.text = "Rook: OK" if rook_soundcheck_done else "Rook: Sound"
	if block_west_btn != null:
		block_west_btn.text = "Hyde: OK" if blackhawk_discovered else "West: Hyde"
	if block_district_btn != null:
		block_district_btn.text = "District: On" if district_boundary_visible else "District: Off"
	if block_import_btn != null:
		block_import_btn.text = "Save: Ready" if browser_import_status == "imported" else "Import Save"

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
	block_epilogue_btn = block_button(b_row1, "Keepsake", func(): advance_epilogue_step())
	block_programme_btn = block_button(b_row1, "Programme", func(): advance_programme_and_hosting_step())
	var b_row2 := HBoxContainer.new()
	b_row2.add_theme_constant_override("separation", 4)
	block_vbox.add_child(b_row2)
	block_mural_btn = block_button(b_row2, "Mural: 0/3", func(): open_mural_from_block_panel())
	block_rook_btn = block_button(b_row2, "Rook: Sound", func(): request_rook_soundcheck())
	block_west_btn = block_button(b_row2, "West: Hyde", func(): walk_to_or_read_history_stop("blackhawk"))
	block_civic_btn = block_button(b_row2, "Civic", func(): advance_civic_step())
	var b_row3 := HBoxContainer.new()
	b_row3.add_theme_constant_override("separation", 4)
	block_vbox.add_child(b_row3)
	block_film_btn = block_button(b_row3, "Film", func(): advance_film_step())
	block_voices_btn = block_button(b_row3, "Voices: Off", func(): toggle_voices_enabled())
	block_district_btn = block_button(b_row3, "District: On", func(): toggle_district_boundary())
	block_import_btn = block_button(b_row3, "Import Save", func(): import_browser_save_from_web_storage())
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
		if in_overview or in_wide_overview:
			refit_after_layout()
	vp.size_changed.connect(resize_controls)
	tree_exiting.connect(func():
		stop_music_playback()
		voices_release_resources()
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
	control.clip_text = true
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
	control.clip_text = true
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
	control.clip_text = true
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


