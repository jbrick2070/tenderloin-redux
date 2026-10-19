extends Node3D
## Measured-building block with actual-metre walking, footprint/courtyard collision,
## camera sightline cutaway and keyboard/touch neighbor navigation.
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
var route_mesh: MeshInstance3D
var selected_neighbor := -1
var arrived_neighbor := -1
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

func _ready() -> void:
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
	info.text = "Pos (%.1f, %.1f) m · %.2f m from %s%s\nWASD/Arrows or tap street to walk · 1–5 or button for neighbors\nCity 2010 PDDL footprints · Streets © OpenStreetMap / ODbL" % [p.x, p.y, nb.distance, nb.id, cut_note]

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
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to %s (%s) · %.1f m\nCollision route outside 58 city footprints · Press Esc to stop\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, dist]
	return true

func walk_to_point(goal_xz: Vector2) -> bool:
	var safe_goal := nearest_walkable_point(goal_xz, WALK_CLEARANCE_M)
	selected_neighbor = -1
	arrived_neighbor = -1
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
		return false
	if view_size > 110.0:
		view_size = 75.0
	target = Vector3(player.position.x, 1.0, player.position.z)
	update_camera()
	update_occlusion(true)
	update_route_ribbon(true)
	info.text = "Walking to street point (%.1f, %.1f) m · %.1f m\nCollision route outside 58 city footprints\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [safe_goal.x, safe_goal.y, player_xz().distance_to(safe_goal)]
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
	update_route_ribbon(true)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(true)
	var nb := nearest_building_info(player_xz())
	var cut_note := " · %d cutaway" % occluded_buildings.size() if not occluded_buildings.is_empty() else ""
	info.text = "With %s — %s (%.2f m from %s%s)\nWASD/Arrows or tap street to walk · Walk to neighbor for next\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [n.name, n.role, nb.distance, nb.id, cut_note]

func advance_walk(delta: float) -> bool:
	if current_path.is_empty() or delta <= 0.0:
		return false
	var remaining := WALK_SPEED_M_PER_S * delta
	var goal_xz: Vector2 = neighbor_xz(selected_neighbor) if selected_neighbor >= 0 else current_path.back()
	var replanned := false
	while remaining > 0.0 and not current_path.is_empty():
		var cur := player_xz()
		if selected_neighbor >= 0 and cur.distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
			finish_neighbor_arrival(selected_neighbor)
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
		if nxt.distance_to(wp) <= 0.08:
			current_path.remove_at(0)
	if following_player:
		target = Vector3(player.position.x, 1.0, player.position.z)
		update_camera()
	update_occlusion(false)
	update_route_ribbon(false)
	if selected_neighbor >= 0:
		var dist_after := player_xz().distance_to(goal_xz)
		if dist_after <= ARRIVAL_DISTANCE_M:
			finish_neighbor_arrival(selected_neighbor)
			return true
		if current_path.is_empty():
			var retry := find_path(player_xz(), goal_xz)
			if retry.size() > 1 and retry[0].distance_to(player_xz()) < 0.20:
				retry.remove_at(0)
			if not retry.is_empty() and retry.back().distance_to(goal_xz) <= ARRIVAL_DISTANCE_M:
				current_path = retry
				update_route_ribbon(true)
			else:
				arrived_neighbor = -1
				update_route_ribbon(true)
				info.text = "Route blocked to %s (%.1f m remaining)\nUse WASD/Arrows or tap another street point\nCity 2010 survey / PDDL · Streets © OpenStreetMap / ODbL" % [neighbors[selected_neighbor].name, dist_after]
	elif current_path.is_empty():
		update_route_ribbon(true)
		update_walking_status()
	return true

func stop_walking() -> void:
	current_path.clear()
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
	if not force and p_xz.distance_to(last_occlusion_pos) < 0.40 and last_occlusion_neighbor == selected_neighbor:
		return
	clear_occlusion()
	last_occlusion_pos = p_xz
	last_occlusion_neighbor = selected_neighbor
	var focus_points: Array[Vector2] = [p_xz]
	if selected_neighbor >= 0 and selected_neighbor < neighbors.size():
		focus_points.append(neighbor_xz(selected_neighbor))
	for idx in range(data.buildings.size()):
		for fp in focus_points:
			if building_occludes_point(idx, fp, 1.0):
				occluded_buildings.append(idx)
				meshes[idx].material_override = cutaway_material
				break

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
			KEY_1: walk_to_neighbor(0)
			KEY_2: walk_to_neighbor(1)
			KEY_3: walk_to_neighbor(2)
			KEY_4: walk_to_neighbor(3)
			KEY_5: walk_to_neighbor(4)
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

func overview() -> void:
	in_overview = true
	following_player = false
	selected_neighbor = -1
	arrived_neighbor = -1
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
	return "58 city footprints · 2010 survey · PDDL\nStreets © OpenStreetMap contributors / ODbL\nWASD/tap street to walk · Walk to neighbor (1–5) · Flat terrain"

func refit_after_layout() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if in_overview:
		overview()

func make_ui() -> void:
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
		controls.columns = 2 if vp.get_visible_rect().size.x < 600 else 3
		controls.offset_top = -174 if controls.columns == 2 else -124
		if in_overview:
			refit_after_layout()
	vp.size_changed.connect(resize_controls)
	tree_exiting.connect(func():
		if vp.size_changed.is_connected(resize_controls):
			vp.size_changed.disconnect(resize_controls)
	)
	resize_controls.call()

func button(parent: Node, text: String, action: Callable) -> void:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size = Vector2(0, 50)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.add_theme_font_size_override("font_size", 16)
	control.pressed.connect(action)
	parent.add_child(control)

