extends Node
## Original 3D rendering of the existing quiet choice. No clock, sound or save state.
const TITLES := {"arc":"An open arc of seats", "pairs":"A pair and an open seat"}
var game: Node
var worlds: Array[Node3D] = []
var guests: Array = []
var cushions: Array[MeshInstance3D] = []
var table_seats: Array[Node3D] = []
var floor_seats: Array[Node3D] = []
var choices: Array[Button] = []
var row: HBoxContainer
var rendered := ""
var neutral_table: Array[Vector3] = []
var neutral_floor: Array[Vector3] = []

func setup(owner_game: Node) -> void:
	game = owner_game
	for seat in table_seats: neutral_table.append(seat.position)
	for seat in floor_seats: neutral_floor.append(seat.position)
	row = HBoxContainer.new()
	row.add_theme_constant_override("separation",4)
	game.block_page_nav.get_parent().add_child(row)
	game.block_page_nav.get_parent().move_child(row,game.block_page_nav.get_index())
	for id in game.HOSTING_QUIETS:
		var b := Button.new()
		b.text = "An open arc\nof seats" if id=="arc" else "A pair and\nan open seat"
		b.custom_minimum_size = Vector2(44,44)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.toggle_mode = true
		b.tooltip_text = TITLES[id]
		b.accessibility_name = TITLES[id]
		game.style_game_button(b)
		b.add_theme_font_size_override("font_size",12)
		for state in ["normal","hover","pressed","hover_pressed"]:
			var style: StyleBox = b.get_theme_stylebox(state).duplicate()
			style.content_margin_left = 2
			style.content_margin_right = 2
			b.add_theme_stylebox_override(state,style)
		b.pressed.connect(func():
			game.last_panel_dialogue = explanation()
			if not game.host_set_quiet(id): game.update_block_ui()
			game.announce_a11y_status(explanation())
		)
		row.add_child(b)
		choices.append(b)
	row.hide()
	for li in range(2):
		var group := Node3D.new()
		group.name = "QuietSeatsVisitors"
		(game.layout_table_node if li==0 else game.layout_floor_node).add_child(group)
		worlds.append(group)
		var people: Array[Node3D] = []
		for i in range(2):
			var person: Node3D = game.make_person_node("QuietVisitor%d"%i,Color("d89669") if i==0 else Color("7fadd3"),Color("8f624b") if i==0 else Color("c18d6b"),Color("343135"),1.55,false)
			person.get_node("GroundRing").hide()
			# Seated hip at 0.50m; feet stay on ground. Static original poses.
			for part in person.get_children():
				if part is Node3D and part.name not in ["GroundRing","LeftLeg","RightLeg","LeftShoe","RightShoe"]:
					part.position.y -= 0.151
			for side in ["Left","Right"]:
				var shin := person.get_node(side+"Leg") as MeshInstance3D
				shin.scale.y = 0.407 / (shin.mesh as CylinderMesh).height
				shin.position = Vector3(shin.position.x,0.2965,0.24)
				person.get_node(side+"Shoe").position.z = 0.28
				var thigh := MeshInstance3D.new()
				thigh.name = side+"Thigh"
				var mesh := CylinderMesh.new()
				mesh.top_radius = 0.08
				mesh.bottom_radius = 0.08
				mesh.height = 0.26
				thigh.mesh = mesh
				thigh.position = Vector3(shin.position.x,0.58,0.12)
				thigh.rotation.x = PI*0.5
				thigh.material_override = game.person_material(Color("304248"))
				person.add_child(thigh)
			group.add_child(person)
			people.append(person)
		guests.append(people)
		var cushion := MeshInstance3D.new()
		cushion.name = "OpenSeatWovenCushion"
		var mesh := BoxMesh.new()
		mesh.size = Vector3(0.32,0.065,0.32)
		cushion.mesh = mesh
		cushion.material_override = game.person_material(Color("8ccfa0"))
		group.add_child(cushion)
		cushions.append(cushion)
		for i in range(3):
			var stripe := MeshInstance3D.new()
			var line := BoxMesh.new()
			line.size = Vector3(0.025,0.006,0.29)
			stripe.mesh = line
			stripe.position = Vector3((i-1)*0.08,0.036,0)
			stripe.material_override = game.person_material(Color("f4e2ad"))
			cushion.add_child(stripe)
	update_world()

func choice() -> String:
	if not game.block_opened: return ""
	if game.current_hosting_activity()=="pause": return String(game.hosting_draft.get("quiet","arc"))
	var result: Variant = game.get_hosted_segment_value("pause")
	return String(result) if result is String and result in TITLES else ""

func explanation() -> String:
	var id := choice()
	if id.is_empty(): return ""
	return 'Thanh: "'+TITLES[id]+'. Two fictional visitors can sit together; the woven green cushion marks an open seat. Sit, stand or leave whenever you like. The sidewalk stays clear. Music is your choice; there is no timer."'

func update_ui() -> void:
	var show_choices: bool = game.current_hosting_activity()=="pause" and game.block_opened and game.block_panel.visible and game.block_panel_mode=="hub"
	if row.visible!=show_choices:
		if show_choices: game.last_panel_dialogue = explanation()+" Choose the seats, then Host Activity (Z) when you are ready."
		if not show_choices and game.block_panel.visible and game.block_panel_mode=="hub" and choices.any(func(b): return b.has_focus()):
			game.block_hub_page = game.block_buttons.find(game.block_programme_btn) / game.BLOCK_ACTIONS_PER_PAGE
			game.layout_block_action_pages()
			game.block_programme_btn.grab_focus()
		row.visible = show_choices
		game.layout_walking_controls_and_hub()
	for i in range(choices.size()):
		var selected: bool = choice()==game.HOSTING_QUIETS[i]
		choices[i].set_pressed_no_signal(selected)
		choices[i].accessibility_name = TITLES[game.HOSTING_QUIETS[i]]+(" , selected" if selected else "")

func update_world() -> void:
	if worlds.is_empty(): return
	var id := choice()
	for world in worlds: world.visible = not id.is_empty()
	# Restore neutral stools before every branch; imported/reloaded saves use the same path.
	for i in range(table_seats.size()): table_seats[i].position = neutral_table[i]
	for i in range(floor_seats.size()): floor_seats[i].position = neutral_floor[i]
	if id.is_empty():
		rendered = ""
		return
	var table_indices: Array = [3,4,5] if id=="arc" else [0,1,7]
	var floor_x: Array = [-1.2,0.0,1.2] if id=="arc" else [-4.2,-3.2,1.2]
	for i in range(floor_seats.size()): floor_seats[i].position = Vector3(floor_x[i],neutral_floor[i].y,neutral_floor[i].z+0.15+(0.25 if id=="arc" and i==1 else 0.0))
	for i in table_indices: table_seats[i].position.z -= 0.05
	if id=="arc": table_seats[table_indices[1]].position.z -= 0.20
	for li in range(2):
		for i in range(2):
			var seat: Node3D = table_seats[table_indices[i]] if li==0 else floor_seats[i]
			var person: Node3D = guests[li][i]
			person.position = seat.position
			person.rotation.y = PI if li==0 else 0.0
		var empty: Node3D = table_seats[table_indices[2]] if li==0 else floor_seats[2]
		cushions[li].position = empty.position + Vector3(0,0.5325,0)
	rendered = id

func snapshot() -> Dictionary:
	var people: Array = []
	var selected_layout := 0 if game.gathering_layout=="table" else 1
	if not worlds.is_empty() and not choice().is_empty():
		for person in guests[selected_layout]:
			var p: Vector3 = person.global_position
			var screen: Vector2 = game.camera.unproject_position(p+Vector3.UP)
			var bounds := Rect2(screen,Vector2.ZERO)
			for part in person.get_children():
				if part is MeshInstance3D and part.visible:
					var box: AABB = part.get_aabb()
					for corner in range(8): bounds = bounds.expand(game.camera.unproject_position(part.to_global(box.get_endpoint(corner))))
			people.append({"x":screen.x,"y":screen.y,"world_x":p.x,"world_z":p.z,"local_x":person.position.x,"local_z":person.position.z,"bounds":game.rect_snapshot(bounds)})
	var buttons: Array = []
	for b in choices:
		var item: Dictionary = game.control_snapshot(b)
		item["text"] = b.text
		item["selected"] = b.button_pressed
		item["accessible_name"] = b.accessibility_name
		buttons.append(item)
	return {"choice":choice(),"copied":game.has_hosted_segment("pause"),"people":people,"buttons":buttons,"explanation":explanation(),"row":game.control_snapshot(row),"cushion":game.rect_snapshot(Rect2(game.camera.unproject_position(cushions[selected_layout].global_position),Vector2.ONE)) if not cushions.is_empty() else {}}

func cutaway_points() -> Array[Vector2]:
	var points: Array[Vector2] = []
	if choice().is_empty() or worlds.is_empty() or game.following_player: return points
	var li := 0 if game.gathering_layout=="table" else 1
	if worlds[li].global_position.distance_to(game.target)>30.0: return points
	for person in guests[li]: points.append(Vector2(person.global_position.x,person.global_position.z))
	points.append(Vector2(cushions[li].global_position.x,cushions[li].global_position.z))
	return points
