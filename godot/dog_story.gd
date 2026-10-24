extends Control
## Original visiting dogs/owners. No real lost-pet records, escort AI or saved state.
const NAMES := ["Pippin", "Junebug"]
const DESCRIPTIONS := ["small rust dog, floppy ears, blue collar and ROUND tag", "tall cream dog, upright ears, green collar and TRIANGLE tag"]
const LEADS := ["Turk / Taylor", "Turk / Hyde", "Gathering"]
const NOTES := ["Mara: Pippin has floppy ears and a round tag. My last sighting was where Turk meets Taylor.", "Imani: Junebug has upright ears and a triangle tag. My last sighting was at Turk and Hyde."]
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
var goals: Array[Vector2] = []
var dogs: Array[Node3D] = []
var search_positions: Array[Vector3] = []
var reunion: Node3D
var textures: Array[Texture2D] = []
var sites_valid := true
var active := false
var won := false
var found := 0
var profile := 0
var lead := -1
var traveling := false
var trip_goal := Vector2.ZERO
var generation := 0
var info_view := false
var message := ""
var layout_pending := false
var snapshot_clock := 0.0

func setup(owner_game: Node) -> void:
	game=owner_game
	name="TwoDogsHome"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=107
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
	for i in range(2): add_button(grid,NAMES[i],func(): choose_profile(i))
	add_button(grid,"SFACC info",func(): info_view=not info_view; refresh(true))
	for i in range(3): add_button(grid,LEADS[i],func(): choose_lead(i))
	add_button(grid,"Begin search",begin)
	add_button(grid,"Walk to lead",walk_to_lead)
	add_button(grid,"Match dog",match_dog)
	add_button(grid,"End search",end_session)
	add_button(grid,"Music: Off",func(): game.toggle_music_playback(); refresh(false))
	add_button(grid,"Back",close_story)
	for i in range(2):
		var image := Image.new()
		image.load_svg_from_string(illustration(i))
		image.generate_mipmaps()
		textures.append(ImageTexture.create_from_image(image))
		var origin: Vector2=game.history_stop_xz(["comptons","blackhawk"][i])
		var chosen := Vector2.ZERO
		for offset in [Vector2(0,4),Vector2(-3,1),Vector2(3,-3),Vector2(-4,0)]:
			var p: Vector2=origin+offset
			if game.is_walkable_point(p,0.8) and game.is_walkable_point(p+Vector2(0,1.8)):
				chosen=p; break
		if chosen==Vector2.ZERO: sites_valid=false
		search_positions.append(Vector3(chosen.x,0,chosen.y))
		goals.append(chosen+Vector2(0,1.8))
		var dog := make_dog(i)
		game.add_child(dog)
		dogs.append(dog)
	reunion=Node3D.new()
	reunion.name="OriginalVisitingDogOwners"
	game.gathering_layouts_node.add_child(reunion)
	for i in range(2):
		var owner: Node3D=game.make_person_node("FictionalVisitingOwner%d"%i,Color("587c83") if i==0 else Color("b26b61"),Color("aa7b5b"),Color("353334"),1.65,false)
		reunion.add_child(owner)
		owner.position=Vector3(-7.4 if i==0 else 7.4,0,-0.3)
	var home: Vector3=game.gathering_layouts_node.to_global(Vector3(6.4,0,1.9))
	if not game.is_walkable_point(Vector2(home.x,home.z)): sites_valid=false
	goals.append(Vector2(home.x,home.z))
	resized.connect(queue_layout)
	for c in [top,tray]: c.minimum_size_changed.connect(queue_layout)
	hide()
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

func dog_part(parent: Node3D,label: String,p: Vector3,size: Vector3,color: Color,round_part: bool=false) -> void:
	var m := MeshInstance3D.new()
	m.name=label
	if round_part:
		var sphere := SphereMesh.new()
		sphere.radius=0.5
		sphere.height=1
		m.mesh=sphere
	else:
		var box := BoxMesh.new()
		box.size=Vector3.ONE
		m.mesh=box
	m.scale=size
	m.position=p
	m.material_override=game.material(color)
	parent.add_child(m)

func make_dog(index: int) -> Node3D:
	var dog := Node3D.new()
	dog.name=NAMES[index]+"OriginalDog"
	var coat := Color("bb6d3e") if index==0 else Color("ead9ad")
	var height := 0.38 if index==0 else 0.58
	dog_part(dog,"Body",Vector3(0,height,0),Vector3(0.85,0.4,0.36),coat,true)
	dog_part(dog,"Head",Vector3(0.4,height+0.22,0),Vector3(0.34,0.34,0.34),coat,true)
	dog_part(dog,"Muzzle",Vector3(0.59,height+0.16,0),Vector3(0.25,0.17,0.24),coat.lightened(0.15),true)
	dog_part(dog,"Nose",Vector3(0.71,height+0.18,0),Vector3(0.07,0.07,0.16),Color("283839"),true)
	for side in [-1,1]:
		dog_part(dog,"FloppyEar" if index==0 else "UprightEar",Vector3(0.35,height+(0.13 if index==0 else 0.45),side*0.15),Vector3(0.13,0.29,0.09),coat.darkened(0.2))
		dog_part(dog,"Eye",Vector3(0.49,height+0.28,side*0.145),Vector3(0.05,0.05,0.05),Color("283839"),true)
		for x in [-0.27,0.27]: dog_part(dog,"Paw",Vector3(x,height/2-0.04,side*0.12),Vector3(0.13,height-0.08,0.12),coat)
	dog_part(dog,"Collar",Vector3(0.25,height+0.03,0),Vector3(0.1,0.35,0.39),Color("467cb5") if index==0 else Color("467a51"))
	if index==0: dog_part(dog,"RoundTag",Vector3(0.26,height-0.12,0.23),Vector3(0.12,0.12,0.05),Color("f4c45e"),true)
	else:
		var triangle := MeshInstance3D.new()
		triangle.name="TriangleTag"
		var surface := SurfaceTool.new()
		surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		for v in [Vector3(0,0.08,0),Vector3(-0.07,-0.05,0),Vector3(0.07,-0.05,0)]: surface.add_vertex(v)
		surface.generate_normals()
		triangle.mesh=surface.commit()
		triangle.material_override=game.material(Color("f4c45e"))
		triangle.position=Vector3(0.26,height-0.12,0.23)
		dog.add_child(triangle)
	dog_part(dog,"Tail",Vector3(-0.48,height+0.14,0),Vector3(0.12,0.35,0.12),coat)
	return dog

func available() -> bool: return game.block_opened and sites_valid
func near() -> bool: return lead>=0 and game.current_path.is_empty() and game.player_xz().distance_to(goals[lead])<=2.0

func choose_profile(index: int) -> void:
	if not visible or index<0 or index>1: return
	profile=index
	info_view=false
	message=""
	refresh(true)

func choose_lead(index: int) -> void:
	if not visible or not active or index<0 or index>2: return
	lead=index
	info_view=false
	message="You chose "+LEADS[index]+" from the notes. Walk there to look; a lead is not a confirmed sighting."
	refresh(true)

func open_story() -> bool:
	if visible: return true
	if not available() or (game.active_story_episode()!=null and game.active_story_episode()!=self) or game.startup_story_pending or game.is_story_card_visible() or game.is_focused_activity_visible() or not game.current_path.is_empty():
		game.announce_a11y_status("Finish arriving and close other activities. End an active power story before Two Dogs Home.")
		return false
	game.story_picker.resume_existing(self)
	return_focus=get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false
	game.orbit_dragging=false
	refresh(true)
	fit_layout()
	buttons[6 if not active else (8 if near() and not won else (7 if lead>=0 else 3))].grab_focus()
	return true

func close_story(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	game.update_block_ui()
	game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_close_btn!=null and game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. Dog search stays for this visit; End search or reload clears it.")

func begin() -> void:
	if not visible or active or (game.active_story_episode()!=null and game.active_story_episode()!=self) or not available(): return
	active=true
	won=false
	found=0
	lead=-1
	message="Read an owner's note, choose a lead, then walk and compare the dog. No timer or penalty."
	update_world()
	refresh(true)
	buttons[3].grab_focus()
	game.update_walking_status()

func cancel_intent() -> void:
	traveling=false
	generation+=1

func reset_session() -> void:
	if game.story_picker!=null: game.story_picker.suspended.erase(self)
	cancel_intent()
	active=false
	won=false
	found=0
	lead=-1
	info_view=false
	profile=0
	message=""
	update_world()

func end_session() -> void:
	if not visible: return
	game.story_picker.remember_completed()
	reset_session()
	message="Search ended. Ordinary chapter progress and your saved keepsake are unchanged."
	refresh(true)
	game.update_walking_status()

func walk_to_lead() -> void:
	if not visible or not active or lead<0: return
	if near(): refresh(true); return
	trip_goal=goals[lead]
	close_story(false)
	game.show_block_panel(false)
	traveling=game.walk_to_point(trip_goal)
	if not traveling:
		blocked_route()
		open_story()

func blocked_route() -> void:
	cancel_intent()
	message="That walk stopped. Choose Dog search to pick a different approach. No progress was lost."
	game.announce_a11y_status(message)

func open_from_walking() -> void:
	generation+=1
	var owned := generation
	await get_tree().process_frame
	while owned==generation and active and (game.walk_control.is_pressed() or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)): await get_tree().process_frame
	await get_tree().process_frame
	if owned==generation and active: open_story()

func match_dog() -> void:
	if not visible or not active or not near() or won: return
	if lead==2:
		if found!=3: message="No missing dog is at the gathering. Compare the owners' street-corner notes."
		else:
			won=true
			game.story_picker.offer_lantern()
			message='Two dogs home! Mara: "Those floppy ears! Welcome back, Pippin." Imani: "Junebug, there is your triangle tag. Thank you for bringing us together." Original fictional reunion. Imani: "Come make a lantern with us whenever you are ready." Other stories keeps this personal invitation.'
	elif lead!=profile: message="This is "+DESCRIPTIONS[lead]+". That differs from "+NAMES[profile]+"'s note. Try the other profile; there is no penalty."
	elif (found&(1<<profile))!=0: message=NAMES[profile]+" is already matched. Find the other dog, then meet both owners at the gathering."
	else:
		found|=1<<profile
		message=NAMES[profile]+" matched by ears and tag, not color alone. The fictional owner has your sighting. "+("Both found! Choose Gathering, walk there and Reunite." if found==3 else "Read the other owner's note and choose your next lead.")
	update_world()
	refresh(true)
	game.update_walking_status()

func update_world() -> void:
	if reunion==null: return
	reunion.visible=active and won
	for i in range(dogs.size()):
		dogs[i].visible=active
		dogs[i].global_position=game.gathering_layouts_node.to_global(Vector3(-7.4 if i==0 else 7.4,0,0.7)) if won else search_positions[i]
		dogs[i].rotation.y=game.gathering_layouts_node.rotation.y+(PI if i==1 else 0) if won else 0
	if game.camera!=null: game.update_occlusion(true)

func objective() -> Dictionary:
	return {"id":"dog_story","has_target":lead>=0 and not won,"target":Vector3(goals[lead].x,0,goals[lead].y) if lead>=0 else Vector3.ZERO,"target_name":LEADS[lead] if lead>=0 else "Choose a lead","text":"Two Dogs Home: "+("Reunited!" if won else "%d/2 matched - %s"%[int((found&1)!=0)+int((found&2)!=0),LEADS[lead] if lead>=0 else "choose a lead"]),"hint":"Dog search resumes your owner notes. You choose where to look. End search returns to your afternoon."}

func refresh(announce: bool) -> void:
	heading.text="Two Dogs Home | %d/2 matched%s"%[int((found&1)!=0)+int((found&2)!=0)," | Reunited!" if won else ""]
	var text := "Original visiting dogs and owners; imaginary sightings on real streets. Begin search, compare notes, choose among the three leads, and look for both dogs in either order. No chase, timer or penalty."
	if active:
		text=NOTES[profile]+"\n"+NAMES[profile]+": "+DESCRIPTIONS[profile]+".\n"
		text+="Your selected lead: "+(LEADS[lead] if lead>=0 else "none - choose a street corner from the notes")+". "
		if near(): text+=("The gathering has no missing dog here." if lead==2 and found!=3 else ("Both owners are ready. Choose Reunite." if lead==2 else "Observed here: "+DESCRIPTIONS[lead]+". Compare with the selected profile, then Match dog."))
		else: text+="Walk to your chosen lead; Stop Walking cancels arrival intent."
	if info_view: text="REAL SERVICE REFERENCE, checked October 22, 2026: San Francisco Animal Care & Control, 1419 Bryant Street at Alameda. OUTSIDE this Tenderloin play area. https://www.sfanimalcare.org/lost-found-pets/report-a-lost-pet/ . Check its official page for current information. No report is sent and no partnership or agency intake is simulated. These dogs, owners and sightings are fiction. Choose SFACC info again to return to the notes."
	if not message.is_empty(): text=message+"\n"+text
	reader.text=text+"\nVisit only: Back keeps this search; End or reload clears it. No saved progress, photo, reward or soundtrack changes."
	if announce: reader.scroll_to_line(0)
	picture.texture=textures[profile]
	buttons[6].disabled=active or (game.active_story_episode()!=null and game.active_story_episode()!=self) or not sites_valid
	for i in range(3,6): buttons[i].disabled=not active
	buttons[7].disabled=not active or lead<0
	buttons[8].disabled=not active or not near() or won
	buttons[8].text="Reunite" if found==3 and lead==2 else "Match dog"
	buttons[9].disabled=not active
	buttons[10].text="Music: On" if game.music_playing else "Music: Off"
	for i in range(buttons.size()):
		buttons[i].accessibility_name=buttons[i].text+((": "+DESCRIPTIONS[i]) if i<2 else (". Independent soundtrack." if i==10 else ""))
		buttons[i].tooltip_text=buttons[i].accessibility_name
	queue_layout()
	if announce: game.announce_a11y_status(heading.text+". "+reader.text)

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

func illustration(index: int) -> String:
	var coat := "#bb6d3e" if index==0 else "#ead9ad"
	var collar := "#467cb5" if index==0 else "#467a51"
	var ears := '<path d="M233 75l-25 50-18-50M267 75l25 50 18-50" fill="#884c34"/>' if index==0 else '<path d="M222 78l-6-55 29 48M266 78l20-55 10 66" fill="#b9a47d"/>'
	var tag := '<circle cx="220" cy="151" r="12" fill="#f4c45e"/>' if index==0 else '<path d="M220 139l15 24h-30z" fill="#f4c45e"/>'
	return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 360 240"><rect x="2" y="2" width="356" height="236" rx="20" fill="#f3e7cb" stroke="#d1a46c" stroke-width="3"/><ellipse cx="170" cy="207" rx="122" ry="11" fill="#d6cfb3"/><path d="M75 148q-48-55-39-72" fill="none" stroke="'+coat+'" stroke-width="14" stroke-linecap="round"/><rect x="78" y="150" width="19" height="53" rx="8" fill="'+coat+'"/><rect x="185" y="150" width="19" height="53" rx="8" fill="'+coat+'"/><ellipse cx="143" cy="142" rx="78" ry="44" fill="'+coat+'"/><circle cx="244" cy="109" r="43" fill="'+coat+'"/>'+ears+'<path d="M208 136l49 17" stroke="'+collar+'" stroke-width="17"/>'+tag+'<ellipse cx="277" cy="124" rx="27" ry="18" fill="'+coat+'"/><circle cx="298" cy="119" r="7" fill="#283839"/><circle cx="254" cy="101" r="5" fill="#283839"/><path d="M275 139q-12 9-20 0" fill="none" stroke="#283839" stroke-width="3"/></svg>'

func snapshot() -> Dictionary:
	var world: Array[Dictionary]=[]
	for i in range(dogs.size()):
		var dog: Node3D=dogs[i]
		var corners: Array[Dictionary]=[]
		for x in [-0.65,0.8]:
			for y in [0.0,1.15]:
				var p: Vector2=game.camera.unproject_position(dog.to_global(Vector3(x,y,0)))
				corners.append({"x":p.x,"y":p.y})
		var body_points: Array[Dictionary]=[]
		for x in [-0.2,0.0,0.2]:
			for y in [-0.08,0.0,0.08]:
				var p: Vector2=game.camera.unproject_position(dog.to_global(Vector3(x,(0.38 if i==0 else 0.58)+y,0.2)))
				body_points.append({"x":p.x,"y":p.y})
		world.append({"visible":dog.visible,"position":[dog.global_position.x,dog.global_position.z],"corners":corners,"body_points":body_points})
	return {"stories_entry":game.control_snapshot(stories_entry),"visible":visible,"sites_valid":sites_valid,"active":active,"won":won,"found":found,"profile":profile,"lead":lead,"near":near(),"traveling":traveling,"text":reader.text,"reader":game.control_snapshot(reader),"scroll":reader.get_v_scroll_bar().value,"buttons":buttons.map(func(b): return game.control_snapshot(b).merged({"text":b.text,"focused":b.has_focus(),"accessible_name":b.accessibility_name})),"picture":game.rect_snapshot(art_rect),"layout_pending":layout_pending,"world":world,"owners_visible":reunion.visible,"goals":goals.map(func(p): return [p.x,p.y])}

func _process(delta: float) -> void:
	if active and not available(): reset_session()
	if traveling:
		if not game.current_path.is_empty() and game.current_path[-1].distance_to(trip_goal)>2.0: cancel_intent()
		elif game.current_path.is_empty():
			if game.player_xz().distance_to(trip_goal)>2.0: blocked_route()
			else:
				traveling=false
				open_from_walking()
	if not visible: return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	buttons[10].text="Music: On" if game.music_playing else "Music: Off"
	snapshot_clock+=delta
	if snapshot_clock>=0.2:
		snapshot_clock=0
		game.sync_web_a11y_status()
