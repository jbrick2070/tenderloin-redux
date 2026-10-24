extends Control
## Original fictional Halloween procession; route progress, not autonomous escort AI.
var game: Node
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var reader: RichTextLabel
var picture: TextureRect
var buttons: Array[Button] = []
var saved_visibility: Dictionary = {}
var return_focus: Control
var stories_entry: Button
var art_rect := Rect2()
var layout_pending := false
var snapshot_clock := 0.0
var active := false
var won := false
var phase := 0
var costume := 0
var lantern := 0
var traveling := false
var generation := 0
var trip_goal := Vector2.ZERO
var message := ""
var route: Array[Vector2] = []
var sites_valid := false
var progress := 8.0
var returning := false
var last_player_xz := Vector2.ZERO
var crew: Array[Node3D] = []
var decorations: Array[Node3D] = []
var player_costume: Node3D
var textures: Dictionary = {}
const LENGTH := 36.0
const GAP := 4.0
const CLEARANCE := 0.85

func setup(owner_game: Node) -> void:
	game=owner_game
	name="LanternProcession"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=108
	var shade := ColorRect.new()
	shade.color=Color(0.02,0.06,0.09,0.70)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top=frame()
	var head := VBoxContainer.new()
	top.add_child(head)
	heading=Label.new()
	heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	heading.add_theme_font_size_override("font_size",18)
	head.add_child(heading)
	var credit := Label.new()
	credit.text="Original fiction | City/PDDL | OSM/ODbL"
	credit.add_theme_font_size_override("font_size",10)
	head.add_child(credit)
	picture=TextureRect.new()
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(picture)
	tray=frame()
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation",4)
	tray.add_child(stack)
	reader=RichTextLabel.new()
	reader.custom_minimum_size=Vector2(0,80)
	reader.add_theme_font_size_override("normal_font_size",16)
	reader.scroll_active=true
	reader.focus_mode=Control.FOCUS_ALL
	stack.add_child(reader)
	var grid := GridContainer.new()
	grid.columns=3
	grid.add_theme_constant_override("h_separation",4)
	grid.add_theme_constant_override("v_separation",4)
	stack.add_child(grid)
	add_button(grid,"Bat cape",func(): choose_costume(0))
	add_button(grid,"Stargazer cape",func(): choose_costume(1))
	add_button(grid,"Moon lantern",func(): choose_lantern(0))
	add_button(grid,"Star lantern",func(): choose_lantern(1))
	add_button(grid,"Begin",begin)
	add_button(grid,"Walk / March",walk_route)
	add_button(grid,"Gather / Finish",advance)
	add_button(grid,"End parade",end_session)
	add_button(grid,"Music: Off",func(): game.toggle_music_playback(); refresh(false))
	add_button(grid,"Back",close_story)
	build_route()
	for i in range(2):
		var person: Node3D=game.make_person_node("FictionalParadeVisitor%d"%i,Color("69559a"),Color("ae805f"),Color("343343"),1.6,false)
		game.add_child(person)
		crew.append(person)
		var costume_node := Node3D.new()
		person.add_child(costume_node)
		decorations.append(costume_node)
	player_costume=Node3D.new()
	player_costume.name="OriginalHalloweenCostume"
	player_costume.scale=Vector3(0.55,1,0.55)
	game.player_visual.add_child(player_costume)
	decorations.append(player_costume)
	resized.connect(queue_layout)
	for c in [top,tray]: c.minimum_size_changed.connect(queue_layout)
	hide()
	build_costumes()
	update_world()
func frame() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel",game.panel_bg_style)
	add_child(p)
	return p

func add_button(parent: Node,text: String,callback: Callable) -> void:
	var b := Button.new()
	b.text=text
	b.custom_minimum_size=Vector2(44,44)
	b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	game.style_game_button(b)
	b.add_theme_font_size_override("font_size",12)
	for state in ["normal","hover","pressed","disabled"]:
		var style: StyleBox=b.get_theme_stylebox(state).duplicate()
		style.content_margin_left=2
		style.content_margin_right=2
		b.add_theme_stylebox_override(state,style)
	b.pressed.connect(callback)
	parent.add_child(b)
	buttons.append(b)


func build_route() -> void:
	# Deliberately reuse the modeled Turk block; this is not a historical parade route.
	for origin in [game.mural_stand_xz(),game.speaker_stand_xz()]:
		var tangent: Vector2=game.nearest_street_tangent(origin)
		for lateral in [0.0,3.0,-3.0,6.0,-6.0]:
			var offset: Vector2=tangent.orthogonal()*lateral
			for sign_value in [1.0,-1.0]:
				var start: Vector2=origin+offset-tangent*8.0*sign_value
				var finish: Vector2=start+tangent*LENGTH*sign_value
				var valid := true
				for sample in range(145):
					if not route_clear(start.lerp(finish,float(sample)/144.0)): valid=false; break
				if valid:
					route=[start,finish]
					sites_valid=true
					return

func route_clear(p: Vector2) -> bool:
	if not game.is_walkable_point(p,CLEARANCE): return false
	if game.is_point_in_mural_footprint(p,CLEARANCE) or game.is_point_in_speaker_footprint(p,CLEARANCE): return false
	for pole in game.street_lamp_points:
		if p.distance_to(pole)<CLEARANCE+0.35: return false
	for tree in game.street_tree_points:
		if p.distance_to(tree)<CLEARANCE+0.5: return false
	for person in game.neighbor_nodes:
		if p.distance_to(Vector2(person.global_position.x,person.global_position.z))<CLEARANCE+1.4: return false
	# Both gathering layouts and their seated guests, papers, instruments and closure ends.
	var local: Vector3=game.gathering_layouts_node.to_local(Vector3(p.x,0,p.y))
	if absf(local.x)<10.0+CLEARANCE and absf(local.z)<5.0+CLEARANCE: return false
	return true

func route_point(distance: float) -> Vector2:
	return route[0].lerp(route[1],clampf(distance/LENGTH,0,1)) if sites_valid else Vector2.ZERO

func goal() -> Vector2: return route_point(8.0 if phase==0 else LENGTH)
func available() -> bool: return game.block_opened and sites_valid
func near() -> bool: return game.current_path.is_empty() and game.player_xz().distance_to(goal())<=1.0

func part(parent: Node3D,label: String,p: Vector3,size: Vector3,color: Color) -> void:
	var mesh := MeshInstance3D.new()
	mesh.name=label
	var shape := BoxMesh.new()
	shape.size=size
	mesh.mesh=shape
	mesh.position=p
	mesh.material_override=game.material(color)
	parent.add_child(mesh)

func paper_polygon(parent: Node3D,label: String,points: Array,color: Color) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var outline := PackedVector2Array()
	for vertex in points: outline.append(Vector2(vertex.x,vertex.y))
	for index in Geometry2D.triangulate_polygon(outline): surface.add_vertex(points[index])
	surface.generate_normals()
	var mesh := MeshInstance3D.new()
	mesh.name=label
	mesh.mesh=surface.commit()
	var mat: StandardMaterial3D=game.material(color).duplicate()
	mat.cull_mode=BaseMaterial3D.CULL_DISABLED
	mesh.material_override=mat
	parent.add_child(mesh)

func build_costumes() -> void:
	for node in decorations:
		for child in node.get_children(): node.remove_child(child); child.queue_free()
		var color := Color("563b83") if costume==0 else Color("315b91")
		var hem := 0.64 if costume==0 else 0.72
		paper_polygon(node,"BatCape" if costume==0 else "StarCape",[Vector3(-0.28,1.35,-0.23),Vector3(0.28,1.35,-0.23),Vector3(0.43,hem,-0.25),Vector3(0,0.83,-0.25),Vector3(-0.43,hem,-0.25)],color)
		if costume==1:
			paper_polygon(node,"CapeStar",[Vector3(0,1.23,-0.26),Vector3(0.07,1.07,-0.26),Vector3(0.21,1.04,-0.26),Vector3(0.1,0.96,-0.26),Vector3(0.13,0.82,-0.26),Vector3(0,0.9,-0.26),Vector3(-0.13,0.82,-0.26),Vector3(-0.1,0.96,-0.26),Vector3(-0.21,1.04,-0.26),Vector3(-0.07,1.07,-0.26)],Color("f6db8c"))
		part(node,"PaperLantern",Vector3(0.34,0.82,0.25),Vector3(0.24,0.31,0.16),Color("f4d28c"))
		part(node,"LanternHandle",Vector3(0.34,1.05,0.25),Vector3(0.025,0.18,0.025),Color("604d61"))
		if lantern==0:
			var disk := MeshInstance3D.new()
			var ball := SphereMesh.new()
			ball.radius=0.065; ball.height=0.13
			disk.mesh=ball; disk.scale.z=0.15
			disk.position=Vector3(0.34,0.82,0.34)
			disk.material_override=game.material(Color("75549b"))
			disk.name="MoonMark"
			node.add_child(disk)
		else:
			paper_polygon(node,"StarMark",[Vector3(0.34,0.92,0.34),Vector3(0.37,0.85,0.34),Vector3(0.44,0.84,0.34),Vector3(0.39,0.8,0.34),Vector3(0.41,0.73,0.34),Vector3(0.34,0.77,0.34),Vector3(0.27,0.73,0.34),Vector3(0.29,0.8,0.34),Vector3(0.24,0.84,0.34),Vector3(0.31,0.85,0.34)],Color("75549b"))
	# A miniature handmade boat carried by a visitor, not a vehicle or borrowed parade float.
	if decorations.size()>0:
		paper_polygon(decorations[0],"HandmadePaperBoat",[Vector3(-0.4,0.78,0.34),Vector3(0.16,0.78,0.34),Vector3(0.05,0.62,0.34),Vector3(-0.29,0.62,0.34)],Color("c96682"))
	update_art()

func choose_costume(value: int) -> void:
	if not visible or (active and phase>0): return
	costume=value
	build_costumes(); refresh(true)

func choose_lantern(value: int) -> void:
	if not visible or (active and phase>0): return
	lantern=value
	build_costumes(); refresh(true)

func open_story() -> bool:
	if visible: return true
	if not sites_valid:
		game.announce_a11y_status("The parade route has no clear space here. Your other stories are still available.")
		return false
	var other=game.active_story_episode()
	if not available() or (other!=null and other!=self) or game.startup_story_pending or game.is_story_card_visible() or game.is_focused_activity_visible() or not game.current_path.is_empty():
		game.announce_a11y_status("Open the gathering, finish arriving and End the other story before the Lantern Procession.")
		return false
	game.story_picker.resume_existing(self)
	return_focus=get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false; game.orbit_dragging=false
	refresh(true); fit_layout()
	buttons[4 if not active else (9 if won else (6 if near() and (phase==0 or progress>=LENGTH-1) else 5))].grab_focus()
	return true

func close_story(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. Your parade stays for this visit. End or reload clears it.")

func begin() -> void:
	if not visible or active or not available() or game.active_story_episode()!=null: return
	active=true; won=false; phase=0; progress=8.0
	message="Choose your paper costume and lantern, then walk to assembly."
	update_world(); refresh(true); game.update_walking_status()
	buttons[5].grab_focus()

func cancel_intent() -> void:
	traveling=false; returning=false; generation+=1

func reset_session() -> void:
	if game.story_picker!=null: game.story_picker.suspended.erase(self)
	cancel_intent(); active=false; won=false; phase=0; progress=8.0; message=""
	costume=0; lantern=0; build_costumes()
	update_world()

func end_session() -> void:
	if not visible: return
	game.story_picker.remember_completed()
	reset_session(); message="Parade ended. Your ordinary afternoon continues."
	refresh(true); game.update_walking_status()

func walk_route() -> void:
	if not visible or not active or won: return
	if near() and (phase==0 or progress>=LENGTH-1): refresh(true); return
	var return_trip: bool=phase==1 and game.player_xz().distance_to(route_point(progress))>0.25
	trip_goal=route_point(progress) if return_trip else goal()
	close_story(false); game.show_block_panel(false)
	# A deliberate Walk owns movement, but preserve an existing manual camera exactly.
	var manual: bool=not game.following_player
	var camera_state := {"target":game.target,"view_size":game.view_size,"in_overview":game.in_overview,"in_wide_overview":game.in_wide_overview}
	traveling=game.walk_to_point(trip_goal)
	returning=return_trip
	last_player_xz=game.player_xz()
	if manual:
		game.following_player=false
		for key in camera_state: game.set(key,camera_state[key])
		game.update_camera()
	if not traveling: blocked_route(); open_story()

func advance() -> void:
	if not visible or not active or not near() or won: return
	if phase==1 and progress<LENGTH-1:
		message="Return to your paused group with March, then lead the lanterns to the finish."
		refresh(true)
		return
	if phase==0:
		phase=1
		message="Costumes ready! Lead the two visitors down this fictional Halloween route. Choose March. Stop pauses everyone."
	else:
		phase=2; won=true
		message='A little parade, a big welcome! Bea: "Look at those handmade lanterns." Celeste: "Every paper cape has its own story." The visiting neighbors stay together for this visit.'
	update_world(); refresh(true); game.update_walking_status()
	buttons[9 if won else 5].grab_focus()

func blocked_route() -> void:
	cancel_intent()
	message="The procession is paused. Return to the marked route and choose March again; your choices remain."
	game.announce_a11y_status(message)

func open_from_walking() -> void:
	generation+=1
	var owned := generation
	await get_tree().process_frame
	while owned==generation and active and (game.walk_control.is_pressed() or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)): await get_tree().process_frame
	await get_tree().process_frame
	if owned==generation and active: open_story()

func update_world(refresh_occlusion: bool=true) -> void:
	if player_costume==null: return
	player_costume.visible=active
	for i in range(crew.size()):
		crew[i].visible=active
		var p := route_point(progress-(i+1)*GAP)
		crew[i].position=Vector3(p.x,0,p.y)
		if sites_valid:
			var direction: Vector2=route[1]-route[0]
			crew[i].rotation.y=atan2(direction.x,direction.y)
	if refresh_occlusion and game.camera!=null: game.update_occlusion(true)

func objective() -> Dictionary:
	var p := goal()
	return {"id":"lantern_procession","has_target":not won,"target":Vector3(p.x,0,p.y),"target_name":"Assembly" if phase==0 else "Parade finish","text":"Lantern Procession: "+("Welcome home!" if won else ("Meet the costume makers" if phase==0 else "Lead the lanterns - %.0f m left"%(LENGTH-progress))),"hint":"Parade resumes your choices and march. Stop pauses the group. End returns to your afternoon."}

func refresh(announce: bool) -> void:
	heading.text="Lantern Procession | "+("Welcome!" if won else ("Costume makers" if phase==0 else "Lead the lanterns"))
	reader.text=message+"\nOriginal fictional Halloween procession on the modeled Turk block. "+("Bat cape" if costume==0 else "Stargazer cape")+" / "+("Moon lantern" if lantern==0 else "Star lantern")+". "
	reader.text+=("Walk to assembly, then Gather to lock your paper choices." if phase==0 else ("Your two visiting neighbors are here. Enjoy your handmade parade." if won else "March to the finish, then Welcome everyone. The group moves only while you follow this route; Stop pauses it."))
	reader.text+="\nTLCBD documented Halloween events in 2019 and 2021; this route, visitors, costumes and dialogue are original fiction. No historical parade route is claimed. Back keeps this visit; End or reload clears it. Music is independent."
	if announce: reader.scroll_to_line(0)
	for i in range(4): buttons[i].disabled=active and phase>0
	buttons[4].disabled=active or not available()
	buttons[5].disabled=not active or won
	buttons[5].text="Walk to assembly" if phase==0 else "March"
	buttons[6].disabled=not active or not near() or won or (phase==1 and progress<LENGTH-1)
	buttons[6].text="Gather" if phase==0 else "Welcome"
	buttons[7].disabled=not active
	buttons[8].text="Music: On" if game.music_playing else "Music: Off"
	for b in buttons: b.accessibility_name=b.text; b.tooltip_text=b.text
	queue_layout()
	if announce: game.announce_a11y_status(heading.text+". "+reader.text)

func update_art() -> void:
	var key := "%d:%d"%[costume,lantern]
	if not textures.has(key):
		var cape := "#563b83" if costume==0 else "#315b91"
		var mark := '<circle cx="263" cy="155" r="14" fill="#75549b"/>' if lantern==0 else '<path d="M263 137l6 12 14 2-10 10 2 14-12-7-13 7 3-14-10-10 14-2z" fill="#75549b"/>'
		var star := '<path d="M160 105l9 21 23 2-18 15 5 23-19-12-20 12 5-23-18-15 24-2z" fill="#f6db8c"/>' if costume==1 else '<path d="M118 125l15 8 12-17 15 17 15-17 12 17 15-8-9 28-33-7-33 7z" fill="#b69bc9"/>'
		var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 360 240"><rect width="360" height="240" rx="18" fill="#eee0bf"/><ellipse cx="179" cy="218" rx="135" ry="9" fill="#bdb59d"/><path d="M120 71h80l37 126-77-20-77 20z" fill="'+cape+'"/>'+star+'<circle cx="160" cy="47" r="27" fill="#b98963"/><path d="M136 43q24-36 49 0" fill="#353143"/><rect x="239" y="128" width="49" height="59" rx="6" fill="#f4d28c" stroke="#604d61" stroke-width="3"/><path d="M247 128v-18q16-17 32 0v18" fill="none" stroke="#604d61" stroke-width="4"/>'+mark+'<path d="M31 182h78l-18 24H48z" fill="#c96682"/><path d="M69 141v40H39z" fill="#f6db8c"/></svg>'
		var img := Image.new(); img.load_svg_from_string(svg); img.generate_mipmaps()
		textures[key]=ImageTexture.create_from_image(img)
	picture.texture=textures[key]

func person_snapshot(person: Node3D) -> Dictionary:
	var points: Array[Dictionary]=[]
	for x in [-0.4,0.4]:
		for y in [0.0,1.6]:
			var p: Vector2=game.camera.unproject_position(person.to_global(Vector3(x,y,0)))
			points.append({"x":p.x,"y":p.y})
	return {"visible":person.visible,"position":[person.position.x,person.position.z],"corners":points}

func snapshot() -> Dictionary:
	return {"stories_entry":game.control_snapshot(stories_entry),"visible":visible,"active":active,"won":won,"phase":phase,"costume":costume,"lantern":lantern,"sites_valid":sites_valid,"layout_pending":layout_pending,"progress":progress,"traveling":traveling,"returning":returning,"near":near(),"text":reader.text,"reader":game.control_snapshot(reader),"buttons":buttons.map(func(b): return game.control_snapshot(b).merged({"text":b.text,"focused":b.has_focus(),"accessible_name":b.accessibility_name})),"route":route.map(func(p): return [p.x,p.y]),"goal":[goal().x,goal().y],"picture":game.rect_snapshot(art_rect),"cache":textures.size(),"crew":crew.map(person_snapshot),"player_costume":player_costume.visible}

func _process(delta: float) -> void:
	if active and not available(): reset_session(); close_story(false)
	if traveling:
		if not game.current_path.is_empty() and game.current_path[-1].distance_to(trip_goal)>1: cancel_intent()
		else:
			if phase==1 and not returning:
				var direction: Vector2=(route[1]-route[0]).normalized()
				var distance: float=(game.player_xz()-route[0]).dot(direction)
				if game.player_xz().distance_to(route_point(distance))<=1.0:
					var moved: float=game.player_xz().distance_to(last_player_xz)
					var next := clampf(minf(distance,progress+moved),progress,LENGTH)
					if next>progress: progress=next; update_world(false)
			last_player_xz=game.player_xz()
			if game.current_path.is_empty():
				if game.player_xz().distance_to(trip_goal)>1: blocked_route()
				else:
					traveling=false
					if returning: message="Back with your neighbors. Choose March to lead the lanterns."
					returning=false
					open_from_walking()
	if not visible: return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	buttons[8].text="Music: On" if game.music_playing else "Music: Off"
	snapshot_clock+=delta
	if snapshot_clock>=0.2: snapshot_clock=0; game.sync_web_a11y_status()
func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true
	fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size()
	var width := minf(940,vp.x-12)
	top.position=Vector2((vp.x-width)/2,6)
	top.size=Vector2(width,0)
	top.size.y=top.get_combined_minimum_size().y
	var side: bool=vp.x>=520 and vp.y<560
	tray.size=Vector2(280 if side else width,0)
	tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)/2,vp.y-tray.size.y-6)
	var area := Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	if side: area=Rect2(6,top.position.y+top.size.y+6,tray.position.x-12,vp.y-top.position.y-top.size.y-18)
	var scale := maxf(0.001,minf(area.size.x/360.0,area.size.y/240.0))
	art_rect=Rect2(area.position+(area.size-Vector2(360,240)*scale)/2,Vector2(360,240)*scale)
	picture.position=art_rect.position
	picture.size=art_rect.size

