extends Node3D
## One OSM exterior and city junction, separate from the 188 measured city buildings.
var record: Dictionary
var mesh: MeshInstance3D
var base_material: Material
var bounds := Rect2()
var goal := Vector2.ZERO
var source: Dictionary
var game: Node
var loaded := false
var legacy_bounds := Rect2()

func setup(owner_game: Node) -> void:
	game=owner_game
	name="LarkinSourceExterior"
	legacy_bounds=game.walk_bounds
	var parsed: Variant=JSON.parse_string(FileAccess.get_file_as_string("res://data/power_place.json"))
	if not valid_source(parsed):
		push_warning("Larkin place data unavailable; historical story disabled.")
		return
	source=parsed
	loaded=true
	record=source.exterior
	goal=Vector2(source.junction.xz[0],source.junction.xz[1])
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_smooth_group(-1)
	var ring: Array=record.polygons[0].rings[0]
	bounds=Rect2(Vector2(ring[0][0],ring[0][1]),Vector2.ZERO)
	for i in range(ring.size()):
		var a: Vector3=game.point(ring[i],0)
		var b: Vector3=game.point(ring[(i+1)%ring.size()],0)
		bounds=bounds.expand(Vector2(a.x,a.z))
		game.colored_quad(surface,a,b,b+Vector3.UP*record.height_m,a+Vector3.UP*record.height_m,Color("738492"))
	for index in record.polygons[0].triangles:
		surface.set_color(Color("a4b6bc"))
		surface.add_vertex(game.point(ring[index],record.height_m))
	surface.generate_normals()
	mesh=MeshInstance3D.new()
	mesh.mesh=surface.commit()
	base_material=StandardMaterial3D.new()
	base_material.vertex_color_use_as_albedo=true
	base_material.cull_mode=BaseMaterial3D.CULL_DISABLED
	mesh.material_override=base_material
	add_child(mesh)
	mesh.create_trimesh_collision()
	# Navigation uses the same complete OSM polygon as the plain exterior.
	game.current_buildings.append(record)
	game.current_building_rects.append(bounds)
	game.rebuild_walk_building_bins()
	# Existing Eddy way reaches this junction. Do not modify the measured-set window.
	game.walk_bounds=game.walk_bounds.expand(goal+Vector2(-10,0))

func cutaway(focus_points: Array) -> void:
	if mesh==null: return
	mesh.material_override=base_material
	for point in focus_points:
		if game.building_record_occludes_point(record,bounds,point,1.0):
			mesh.material_override=game.cutaway_material
			break

func valid_source(value: Variant) -> bool:
	if not value is Dictionary: return false
	for key in ["junction","address_point","return_junction","exterior","eddy"]:
		if not value.get(key) is Dictionary: return false
	for key in ["junction","address_point","return_junction"]:
		if not valid_point(value[key].get("xz")): return false
	if not value.eddy.get("points") is Array or value.eddy.points.size()<2: return false
	for p in value.eddy.points:
		if not valid_point(p): return false
	if not value.exterior.get("polygons") is Array or value.exterior.polygons.is_empty(): return false
	var polygon: Variant=value.exterior.polygons[0]
	if not polygon is Dictionary or not polygon.get("rings") is Array or polygon.rings.size()!=1: return false
	if not polygon.rings[0] is Array or polygon.rings[0].size()<3 or not polygon.get("triangles") is Array: return false
	for p in polygon.rings[0]:
		if not valid_point(p): return false
	if polygon.triangles.is_empty() or polygon.triangles.size()%3!=0: return false
	for index in polygon.triangles:
		if not (index is int or index is float) or index!=int(index) or index<0 or index>=polygon.rings[0].size(): return false
	var height: Variant=value.exterior.get("height_m")
	return (height is int or height is float) and is_finite(height) and height>0

func valid_point(p: Variant) -> bool:
	return p is Array and p.size()==2 and (p[0] is int or p[0] is float) and (p[1] is int or p[1] is float) and is_finite(p[0]) and is_finite(p[1])

func eddy_distance(pt: Vector2) -> float:
	if not loaded: return INF
	var distance := INF
	for i in range(source.eddy.points.size()-1):
		var a: Array=source.eddy.points[i]
		var b: Array=source.eddy.points[i+1]
		distance=minf(distance,game.dist_to_segment_2d(pt,Vector2(a[0],a[1]),Vector2(b[0],b[1])))
	return distance

func admits(pt: Vector2) -> bool:
	return not loaded or legacy_bounds.has_point(pt) or eddy_distance(pt)<=game.MAX_STREET_CORRIDOR_M

func map_point(xz: Array) -> Vector2:
	# Uniform metric scale, north up; the same projection used in the 3D world.
	return Vector2(28+(float(xz[0])+620)*1.35,24+(float(xz[1])+100)*1.35)

func map_svg() -> String:
	var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="#18323b"/>'
	if not loaded: return svg+'</svg>'
	var points := ""
	for p in record.polygons[0].rings[0]:
		var q := map_point(p)
		points+="%s,%s "%[q.x,q.y]
	svg+='<polygon points="%s" fill="#738492" stroke="#d8e3dc" stroke-width="2"/>'%points
	points=""
	for p in source.eddy.points:
		var q := map_point(p)
		points+="%s,%s "%[q.x,q.y]
	svg+='<polyline points="%s" fill="none" stroke="#758b90" stroke-width="14"/>'%points
	var junction := map_point(source.junction.xz)
	var address := map_point(source.address_point.xz)
	svg+='<circle cx="%s" cy="%s" r="7" fill="#ffcf77"/><circle cx="%s" cy="%s" r="5" fill="#d8e3dc"/><path d="M 290 215 h 54 m -54 -4 v 8 m 54 -8 v 8 M 328 42 v -22 l -5 9 m 5 -9 l 5 9" fill="none" stroke="#d8e3dc" stroke-width="2"/>'%[junction.x,junction.y,address.x,address.y]
	return svg+'</svg>'
