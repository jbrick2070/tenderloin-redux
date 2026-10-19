extends Node3D
## LoD1 massing viewer, not the migrated game. Real rings and median height;
## neutral materials, flat presentation ground and schematic street widths.
var data: Dictionary
var camera: Camera3D
var meshes: Array[MeshInstance3D] = []
var selected := -1
var info: Label
var target := Vector3(65, 0, -12)
var view_size := 250.0
var wall_material: StandardMaterial3D
var chosen_material: StandardMaterial3D
var controls: GridContainer
var overview_size := 400.0
var in_overview := true

func _ready() -> void:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/buildings.json"))
	if not parsed is Dictionary or not parsed.has("buildings") or parsed.buildings.is_empty():
		push_error("Missing/invalid city geometry. Run node scripts/build-godot-data.mjs.")
		return
	data = parsed
	wall_material = material(Color("c4b6a1"))
	chosen_material = material(Color("75bbb2"))
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
	for street in data.streets:
		var surface := SurfaceTool.new()
		surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		for i in range(street.points.size() - 1):
			var a := point(street.points[i], 0.02)
			var b := point(street.points[i + 1], 0.02)
			var across := (b - a).normalized().cross(Vector3.UP) * 5.0
			triangle(surface, a - across, b - across, b + across)
			triangle(surface, a - across, b + across, a + across)
		surface.generate_normals()
		var road := MeshInstance3D.new()
		road.mesh = surface.commit()
		road.material_override = material(Color("263e43"))
		add_child(road)
	for building in data.buildings:
		var surface := SurfaceTool.new()
		surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		surface.set_smooth_group(-1)
		var h: float = building.height_m
		for polygon in building.polygons:
			for ring in polygon.rings:
				for i in range(ring.size()):
					var a := point(ring[i], 0)
					var b := point(ring[(i + 1) % ring.size()], 0)
					triangle(surface, a, b, b + Vector3.UP * h)
					triangle(surface, a, b + Vector3.UP * h, a + Vector3.UP * h)
			for i in range(0, polygon.triangles.size(), 3):
				triangle(surface, point(polygon.vertices[polygon.triangles[i]], h),
					point(polygon.vertices[polygon.triangles[i + 1]], h),
					point(polygon.vertices[polygon.triangles[i + 2]], h))
		surface.generate_normals()
		var building_mesh := MeshInstance3D.new()
		building_mesh.name = building.id
		building_mesh.mesh = surface.commit()
		building_mesh.material_override = wall_material
		add_child(building_mesh)
		meshes.append(building_mesh)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.far = 2000
	add_child(camera)
	camera.current = true
	update_camera()
	make_ui()
	await get_tree().process_frame
	await get_tree().process_frame
	overview()
	# Headless parser/import tests don't pretend to render a screenshot.
	if "--capture" in OS.get_cmdline_user_args():
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(ProjectSettings.globalize_path("res://").path_join("../artifacts/godot-massing.png"))
		get_tree().quit()

func material(color: Color) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.roughness = 1.0
	result.cull_mode = BaseMaterial3D.CULL_DISABLED
	return result

func point(p: Array, height: float) -> Vector3:
	return Vector3(p[0], height, p[1])

func triangle(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	surface.add_vertex(a)
	surface.add_vertex(b)
	surface.add_vertex(c)

func update_camera() -> void:
	camera.size = view_size
	camera.position = target + Vector3(180, 180, 180)
	camera.look_at(target)
	camera.force_update_transform()

func choose_next(direction: int) -> void:
	in_overview = false
	if selected >= 0:
		meshes[selected].material_override = wall_material
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

func overview() -> void:
	in_overview = true
	if selected >= 0:
		meshes[selected].material_override = wall_material
	selected = -1
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

func overview_text() -> String:
	return "58 city footprints · 2010 survey · PDDL\nStreets © OpenStreetMap contributors / ODbL\nFlat terrain / schematic streets / façades unverified"

func refit_after_layout() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if in_overview:
		overview()

func make_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var header := PanelContainer.new()
	header.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	header.offset_left = 12
	header.offset_right = -12
	header.offset_top = 12
	layer.add_child(header)
	var column := VBoxContainer.new()
	header.add_child(column)
	var title := Label.new()
	title.text = "TENDERLOIN REDUX / Godot geography study"
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size", 23)
	column.add_child(title)
	info = Label.new()
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.text = overview_text()
	info.add_theme_font_size_override("font_size", 17)
	column.add_child(info)
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
	var resize_controls := func():
		controls.columns = 2 if get_viewport().get_visible_rect().size.x < 600 else 3
		controls.offset_top = -174 if controls.columns == 2 else -124
		if in_overview:
			refit_after_layout()
	get_viewport().size_changed.connect(resize_controls)
	resize_controls.call()

func button(parent: Node, text: String, action: Callable) -> void:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size = Vector2(0, 50)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)
