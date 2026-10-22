extends Control
## An original, visit-only gathering-light adventure. Never a real utility map.
const NAMES := ["Welcome lights", "Art lights", "Rhythm lights"]
const VOICES := ["Bea", "Celeste", "Rook"]
const CLUES := [
	"Bring the path in from the left at the upper connector. Take it around all four corners to the upper-right lamp.",
	"Our inlet is above the upper-left connector. Lead the path around the square to the lower-left lamp below it.",
	"Start on the right of the lower-right connector. Visit all four corners and leave at the lower-left lamp."
]
const SOURCES := [Vector2i(0,3),Vector2i(0,0),Vector2i(3,1)]
const SINKS := [Vector2i(1,1),Vector2i(2,2),Vector2i(2,3)]
const DIRECTIONS := ["North", "East", "South", "West"]
const ARRIVAL_M := 2.0
var game: Node
var entry: Button
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var reader: RichTextLabel
var picture: TextureRect
var pads: Array[Button] = []
var tabs: Array[Button] = []
var actions: Array[Button] = []
var saved_visibility: Dictionary = {}
var return_focus: Control
var fixtures: Array[MeshInstance3D] = []
var originals: Array[Material] = []
var boxes: Array[Node3D] = []
var lamps: Array[MeshInstance3D] = []
var active := false
var won := false
var restored := 0
var station := 0
var turns := [[0,0,1,1],[2,0,3,1],[3,0,1,2]]
var traveling := false
var trip_goal := Vector2.ZERO
var message := ""
var art_rect := Rect2()
var layout_pending := false
var snapshot_clock := 0.0
var goals: Array[Vector2] = []
var connector_room := true
var dark: StandardMaterial3D
var warm: StandardMaterial3D
var entry_generation := 0

func setup(owner_game: Node) -> void:
	game=owner_game
	name="PowerStory"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=106
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
	credit.text="Fictional event kit | City/PDDL | OSM/ODbL"
	credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	credit.add_theme_font_size_override("font_size",10)
	head.add_child(credit)
	picture=TextureRect.new()
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(picture)
	for i in range(4):
		var pad := Button.new()
		pad.custom_minimum_size=Vector2(44,44)
		for state in ["normal","disabled","pressed","hover","focus"]:
			var style := StyleBoxFlat.new()
			style.bg_color=Color.TRANSPARENT
			style.border_color=Color("fff0aa")
			style.set_border_width_all(3 if state=="focus" else (1 if state=="hover" else 0))
			pad.add_theme_stylebox_override(state,style)
		pad.pressed.connect(func(): rotate(i))
		add_child(pad)
		pads.append(pad)
	tray=frame()
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation",4)
	tray.add_child(box)
	reader=game.make_activity_detail()
	reader.custom_minimum_size.y=76
	reader.add_theme_font_size_override("normal_font_size",16)
	box.add_child(reader)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",3)
	box.add_child(row)
	for i in range(3): tabs.append(button(row,"Relay %d"%(i+1),func(): choose(i)))
	var grid := GridContainer.new()
	grid.columns=3
	grid.add_theme_constant_override("h_separation",3)
	grid.add_theme_constant_override("v_separation",3)
	box.add_child(grid)
	actions.append(button(grid,"Begin\nstory",begin))
	actions.append(button(grid,"Walk to\nrelay",walk_to_relay))
	actions.append(button(grid,"Check\npath",check_path))
	actions.append(button(grid,"End\nstory",end_session))
	actions.append(button(grid,"Music: Off",func(): game.toggle_music_playback(); refresh(false)))
	actions.append(button(grid,"Back",close_story))
	entry=button(game.block_page_nav,"Power",open_story)
	entry.size_flags_horizontal=Control.SIZE_SHRINK_END
	entry.tooltip_text="Lights Back On: optional power story (F8)"
	entry.accessibility_name=entry.tooltip_text
	game.block_page_nav.move_child(entry,game.block_page_nav.get_child_count()-2)
	entry.hide()
	for i in range(7):
		var pole: Node3D=game.get_node("StreetLifeDecor/StreetLamp_%d"%i)
		fixtures.append(pole.get_child(1))
		if i<3:
			var kit := Node3D.new()
			kit.name="FictionalPortableRelay"
			# First pole borders a measured wall on +Z: face the portable indicator streetward.
			if i==0: kit.rotation.y=PI
			pole.add_child(kit)
			var body := MeshInstance3D.new()
			var shape := BoxMesh.new()
			shape.size=Vector3(0.32,0.40,0.20)
			body.mesh=shape
			body.position=Vector3(0,1.10,0.02)
			body.material_override=game.material(Color("4f7076"))
			kit.add_child(body)
			var lamp := MeshInstance3D.new()
			var disk := SphereMesh.new()
			disk.radius=0.085
			disk.height=0.17
			lamp.mesh=disk
			lamp.position=Vector3(0,1.13,0.155)
			kit.add_child(lamp)
			boxes.append(kit)
			lamps.append(lamp)
	for i in range(3): fixtures.append(game.block_banner_node.get_node("GatheringLantern%d"%i))
	for fixture in fixtures: originals.append(fixture.material_override)
	for i in range(3): goals.append(game.nearest_walkable_point(game.street_lamp_points[i]+Vector2(0,1.4)))
	dark=game.material(Color("283c4b"))
	warm=game.mural_material(Color("ffe8a3"))
	for c in [top,tray]: c.minimum_size_changed.connect(queue_layout)
	resized.connect(queue_layout)
	hide()
	update_world()

func frame() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel",game.panel_bg_style)
	add_child(panel)
	return panel

func button(parent: Node, text: String, callback: Callable) -> Button:
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
	return b

func available() -> bool:
	return game.block_opened

func near() -> bool:
	return game.player_xz().distance_to(relay_goal(station))<=ARRIVAL_M and game.current_path.is_empty()

func relay_goal(index: int) -> Vector2:
	return goals[index] if index<goals.size() else Vector2.ZERO

func objective() -> Dictionary:
	var count := int((restored&1)!=0)+int((restored&2)!=0)+int((restored&4)!=0)
	var next := station
	if (restored&(1<<next))!=0:
		for i in range(3):
			if (restored&(1<<i))==0: next=i; break
	var goal := relay_goal(next)
	return {"id":"power_story","has_target":restored!=7,"target":Vector3(goal.x,0,goal.y),"target_name":"Festival relay %d"%(next+1),"text":"Power Story: %s (%d/3 lights restored)"%[NAMES[next] if restored!=7 else "You brought the lights back!",count],"hint":"Choose Power Story to walk to and repair the next fictional relay. " + ("End story returns to your usual afternoon." if restored==7 else VOICES[next]+" has a clue for "+NAMES[next]+".")}

func open_story() -> bool:
	if visible: return true
	if not available() or game.startup_story_pending or game.is_story_card_visible() or game.is_focused_activity_visible() or not game.current_path.is_empty():
		game.announce_a11y_status("Open the gathering, finish arriving and close any chapter or activity before Power Story.")
		return false
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
	if not active: actions[0].grab_focus()
	elif near() and (restored & (1<<station))==0 and pads[0].visible: pads[0].grab_focus()
	else: actions[1].grab_focus()
	return true

func cancel_intent() -> void:
	traveling=false
	entry_generation+=1

func open_from_walking() -> void:
	# Stop acts on press; opening a screen waits for the whole gesture to release.
	# Otherwise that same finger's release can land on the new screen's Back.
	entry_generation+=1
	var generation := entry_generation
	await get_tree().process_frame
	while generation==entry_generation and active and (game.walk_control.is_pressed() or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)):
		await get_tree().process_frame
	await get_tree().process_frame
	if generation==entry_generation and active: open_story()

func close_story(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	game.update_block_ui()
	game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. "+("Power Story progress stays for this visit; End story restores ordinary lighting. Reload starts fresh." if active else "Ordinary lighting and saved progress are unchanged."))

func begin() -> void:
	if not visible or active or not available(): return
	active=true
	won=false
	restored=0
	station=0
	turns=[[0,0,1,1],[2,0,3,1],[3,0,1,2]]
	message='Bea: "Our fictional festival light kit has gone dark. Help us link the three relays. No rush - we have each other."'
	game.apply_time_of_day()
	update_world()
	refresh(true)
	actions[1].grab_focus()

func end_session(announce: bool=true) -> void:
	cancel_intent()
	active=false
	for i in range(fixtures.size()): fixtures[i].material_override=originals[i]
	update_world()
	game.apply_time_of_day()
	message="The afternoon is just as you left it. Thanks for helping. Choose Replay story to bring the crew together again."
	if visible: refresh(announce); actions[0].grab_focus()

func reset_session() -> void:
	end_session(false)
	won=false
	restored=0
	station=0
	turns=[[0,0,1,1],[2,0,3,1],[3,0,1,2]]
	message=""

func choose(index: int) -> void:
	if index<0 or index>2: return
	station=index
	message=""
	refresh(true)
	tabs[index].grab_focus()

func walk_to_relay() -> void:
	if not active or not visible: return
	trip_goal=relay_goal(station)
	close_story(false)
	game.show_block_panel(false)
	traveling=game.walk_to_point(trip_goal)
	if traveling: game.announce_a11y_status("Walking to fictional relay %d, %s. Stop Walking cancels. Its repair view opens after arrival."%[station+1,NAMES[station]])
	else:
		message="That route is not open. Try another relay, or return to the street and choose a different approach."
		open_story()

func rotate(index: int) -> void:
	if not visible or not active or not connector_room or not near() or (restored & (1<<station))!=0: return
	turns[station][index]=(int(turns[station][index])+1)%4
	message="Connector %d now links %s to %s."%[index+1,DIRECTIONS[int(turns[station][index])],DIRECTIONS[(int(turns[station][index])+1)%4]]
	refresh(true)
	pads[index].grab_focus()

func connected() -> bool:
	var at: int=SOURCES[station].x
	var incoming: int=SOURCES[station].y
	var visited: Array[int]=[]
	while not visited.has(at):
		visited.append(at)
		var a := int(turns[station][at])
		var b := (a+1)%4
		if incoming!=a and incoming!=b: return false
		var outgoing: int=b if incoming==a else a
		if at==SINKS[station].x and outgoing==SINKS[station].y: return visited.size()==4
		var next: Vector2i=Vector2i(at%2,at/2)+[Vector2i.UP,Vector2i.RIGHT,Vector2i.DOWN,Vector2i.LEFT][outgoing]
		if next.x<0 or next.y<0 or next.x>1 or next.y>1: return false
		at=next.y*2+next.x
		incoming=(outgoing+2)%4
	return false

func check_path() -> void:
	if not visible or not active or not connector_room or not near() or (restored & (1<<station))!=0: return
	if not connected():
		message="Not connected yet. Trace from the IN arrow through all four elbows to OUT. Every turn can be changed; there is no penalty."
	else:
		restored |= 1<<station
		message=VOICES[station]+': "There it is! '+NAMES[station]+' are back. You made the connection."'
		if restored==7:
			won=true
			message='Bea: "You brought our lights back! The whole crew is cheering for you. Our block is glowing again." Take a walk under the lights, or End story to return to your afternoon.'
		game.apply_time_of_day()
		update_world()
	refresh(true)
	if restored==7: actions[5].grab_focus()
	else: tabs[(station+1)%3].grab_focus()

func apply_lighting() -> void:
	if not active: return
	# A fictional after-dark scene override; evening_mode preference is never changed.
	game.world_env.background_color=Color("101b2b")
	game.world_env.ambient_light_color=Color("b9c2dc")
	game.world_env.ambient_light_energy=0.54
	game.sun_light.light_color=Color("b9c2dc")
	game.sun_light.light_energy=0.36
	game.rim_light.light_energy=0.30
	game.rim_light.light_color=Color("c1b4df")
	game.light_pool_material.albedo_color=Color(1,1,1,1 if restored==7 else 0)
	game.building_shader_material.set_shader_parameter("night_glow",1.0 if restored==7 else 0.0)

func update_world() -> void:
	for i in range(boxes.size()):
		boxes[i].visible=active
		lamps[i].material_override=warm if (restored & (1<<i))!=0 else dark
	if not active: return
	for i in range(fixtures.size()):
		var lit: bool=restored==7 or (i<3 and (restored & (1<<i))!=0) or (i>=7 and (restored & (1<<(i-7)))!=0)
		fixtures[i].material_override=originals[i] if lit else dark

func diagram() -> String:
	var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect x="2" y="2" width="356" height="236" rx="20" fill="#16313c" stroke="#d9b978" stroke-width="3"/>'
	for i in range(4):
		var x: int=82+(i%2)*96
		var y: int=20+(i/2)*96
		var center := Vector2(x+44,y+44)
		var r := int(turns[station][i])
		var a: Vector2=center+[Vector2(0,-44),Vector2(44,0),Vector2(0,44),Vector2(-44,0)][r]
		var b: Vector2=center+[Vector2(0,-44),Vector2(44,0),Vector2(0,44),Vector2(-44,0)][(r+1)%4]
		svg+='<rect x="%d" y="%d" width="88" height="88" rx="12" fill="#35515c" stroke="#75949c" stroke-width="2"/><path d="M %s %s L %s %s L %s %s" fill="none" stroke="%s" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="%s" cy="%s" r="5" fill="#d29060"/>'%[x,y,a.x,a.y,center.x,center.y,b.x,b.y,"#87dbca" if (restored&(1<<station))!=0 else "#ffe1a0",center.x,center.y]
	for endpoint in [SOURCES[station],SINKS[station]]:
		var p := Vector2(126+(endpoint.x%2)*96,64+(endpoint.x/2)*96)
		var d: Vector2=[Vector2.UP,Vector2.RIGHT,Vector2.DOWN,Vector2.LEFT][endpoint.y]
		var a := p+d*44
		var b := p+d*62
		var input: bool=endpoint==SOURCES[station]
		svg+='<path d="M %s %s L %s %s" stroke="%s" stroke-width="10"/><circle cx="%s" cy="%s" r="9" fill="%s"/>'%[a.x,a.y,b.x,b.y,"#87dbca" if input else "#ffc765",b.x,b.y,"#87dbca" if input else "#ffc765"]
		if input:
			var side := Vector2(-d.y,d.x)*9
			var tip := p+d*38
			var base := p+d*58
			svg+='<polygon points="%s,%s %s,%s %s,%s" fill="#16313c"/>'%[tip.x,tip.y,(base+side).x,(base+side).y,(base-side).x,(base-side).y]
	svg+='<path d="M 18 222 L 342 222" stroke="#78909a" stroke-width="2"/>'
	return svg+'</svg>'

func refresh(announce: bool) -> void:
	heading.text="Lights Back On | %d/3"%[int((restored&1)!=0)+int((restored&2)!=0)+int((restored&4)!=0)]
	if won and not active: heading.text="Lights Back On | Story ended"
	var text := "A fictional, untimed power-restoration adventure. Three portable transformer relays, three neighbors' clues, and you making the lights shine again. Follow the triangle inlet through all four elbows to the round lamp. Progress is for this visit only; reload starts fresh. Music is your independent soundtrack. This event kit is not a real utility map or electrical repair training."
	if active:
		text="Relay %d: %s. %s: \"%s\"\nIN: %s of connector %d. OUT: %s of connector %d. Connect all four elbows.\n"%[station+1,NAMES[station],VOICES[station],CLUES[station],DIRECTIONS[SOURCES[station].y],SOURCES[station].x+1,DIRECTIONS[SINKS[station].y],SINKS[station].x+1]
		text+=("This relay is restored. Choose another relay or Back to see the lights." if (restored&(1<<station))!=0 else ("You are at the relay. Turn a connector, then Check path." if near() else "Choose Walk to relay. The repair surface opens when you arrive; Stop Walking cancels."))
		text+="\nBack keeps this visit's progress. End story restores usual lighting. Reload starts this story fresh."
	if not message.is_empty(): text=message+"\n"+text
	if not connector_room: text="Make the window taller or wider to use all four connectors. Back and End story remain available.\n"+text
	reader.text=text
	for i in range(4):
		var r := int(turns[station][i])
		pads[i].disabled=not active or not connector_room or not near() or (restored&(1<<station))!=0
		pads[i].accessibility_name="Turn connector %d: %s to %s"%[i+1,DIRECTIONS[r],DIRECTIONS[(r+1)%4]]
		pads[i].tooltip_text=pads[i].accessibility_name
	for i in range(3):
		tabs[i].text="Relay %d%s"%[i+1," OK" if (restored&(1<<i))!=0 else ""]
		tabs[i].accessibility_name="Relay %d: %s, %s"%[i+1,NAMES[i],"restored" if (restored&(1<<i))!=0 else "not yet restored"]
	actions[0].disabled=active
	actions[0].text="Replay\nstory" if won else "Begin\nstory"
	actions[1].disabled=not active
	actions[2].disabled=not active or not connector_room or not near() or (restored&(1<<station))!=0
	actions[3].disabled=not active
	actions[4].text="Music: On" if game.music_playing else "Music: Off"
	for b in actions: b.accessibility_name=b.text.replace("\n"," ")
	var image := Image.new()
	if image.load_svg_from_string(diagram(),2.0)==OK:
		image.generate_mipmaps()
		picture.texture=ImageTexture.create_from_image(image)
	queue_layout()
	if announce: game.announce_a11y_status(heading.text+". "+text)

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true
	fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size()
	var width := minf(940,vp.x-12)
	top.position=Vector2((vp.x-width)*0.5,6)
	top.size=Vector2(width,0)
	top.size.y=top.get_combined_minimum_size().y
	var side: bool=vp.x>=520 and vp.y<560
	tray.size=Vector2(280 if side else width,0)
	tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	var area := Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	if side: area=Rect2(6,top.position.y+top.size.y+6,tray.position.x-12,vp.y-top.position.y-top.size.y-18)
	var scale := maxf(0.001,minf(area.size.x/360.0,area.size.y/240.0))
	art_rect=Rect2(area.position+(area.size-Vector2(360,240)*scale)*0.5,Vector2(360,240)*scale)
	picture.position=art_rect.position
	picture.size=art_rect.size
	for i in range(4):
		pads[i].visible=88*scale>=44
		pads[i].position=art_rect.position+Vector2(82+(i%2)*96,20+(i/2)*96)*scale
		pads[i].size=Vector2(88,88)*scale
	if connector_room!=(88*scale>=44):
		connector_room=88*scale>=44
		if not connector_room and pads.any(func(b): return b.has_focus()): reader.grab_focus()
		refresh(false)
	game.sync_web_a11y_status()

func snapshot() -> Dictionary:
	var buttons: Array[Dictionary]=[]
	for b in pads+tabs+actions: buttons.append(game.control_snapshot(b))
	var world: Array[Dictionary]=[]
	for i in range(3):
		var p: Vector2=game.camera.unproject_position(fixtures[i].global_position)
		var corners: Array[Dictionary]=[]
		for x in [-0.22,0.22]:
			for y in [-0.22,0.22]:
				for z in [-0.22,0.22]:
					var point: Vector2=game.camera.unproject_position(fixtures[i].global_position+Vector3(x,y,z))
					corners.append({"x":point.x,"y":point.y})
		world.append({"x":p.x,"y":p.y,"corners":corners,"lit":(restored&(1<<i))!=0,"goal_x":relay_goal(i).x,"goal_z":relay_goal(i).y,"box_visible":boxes[i].is_visible_in_tree()})
	return {"visible":visible,"entry":game.control_snapshot(entry),"active":active,"won":won,"restored":restored,"station":station,"turns":turns.duplicate(true),"near":near(),"traveling":traveling,"connected":connected(),"buttons":buttons,"text":reader.text,"reader":game.control_snapshot(reader),"scroll":reader.get_v_scroll_bar().value,"scroll_max":maxf(0,reader.get_v_scroll_bar().max_value-reader.get_v_scroll_bar().page),"picture":game.rect_snapshot(art_rect),"world":world,"night_glow":game.building_shader_material.get_shader_parameter("night_glow"),"pool_alpha":game.light_pool_material.albedo_color.a,"layout_pending":layout_pending,"connector_room":connector_room}

func blocked_route() -> void:
	traveling=false
	message="The route to relay %d stopped. Choose Power Story to try again or choose another relay."%(station+1)
	game.announce_a11y_status(message)

func _process(delta: float) -> void:
	var show_entry: bool=available() and not game.is_focused_activity_visible() and not game.is_story_card_visible() and game.block_panel.visible and game.block_panel_mode=="hub"
	if entry.visible!=show_entry:
		entry.visible=show_entry
		game.layout_walking_controls_and_hub()
	if active and not available(): end_session(false)
	if traveling:
		if not game.current_path.is_empty() and game.current_path[-1].distance_to(trip_goal)>ARRIVAL_M: traveling=false
		elif game.current_path.is_empty():
			traveling=false
			if game.player_xz().distance_to(trip_goal)<=ARRIVAL_M: open_story()
			else: blocked_route()
	if not visible: return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	actions[4].text="Music: On" if game.music_playing else "Music: Off"
	actions[4].accessibility_name=actions[4].text+". Independent soundtrack."
	snapshot_clock+=delta
	if snapshot_clock>=0.2:
		snapshot_clock=0
		game.sync_web_a11y_status()
