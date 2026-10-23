extends Control
## Original map-making walk through two entries in the October 3, 2024 polling list.
var game: Node
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var reader: RichTextLabel
var picture: TextureRect
var buttons: Array[Button]=[]
var pads: Array[Button]=[]
var map_labels: Array[Label]=[]
var saved_visibility: Dictionary={}
var return_focus: Control
var art_rect := Rect2()
var layout_pending := false
var snapshot_clock := 0.0
var active := false
var won := false
var traveling := false
var generation := 0
var via_pending := false
var trip_goal := Vector2.ZERO
var leg_goal := Vector2.ZERO
var home := Vector2.ZERO
var goals: Array[Vector2]=[]
var source: Dictionary={}
var sites_valid := false
var selected := 0
var palette := 0
var observed := 0
var placed := 0
var phase := 0
var message := ""
var paper: MeshInstance3D
var paper_material: StandardMaterial3D
var textures: Dictionary={}

func setup(owner_game: Node) -> void:
	game=owner_game
	name="ElectionMapWalk"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=108
	var shade := ColorRect.new()
	shade.color=Color(0.02,0.06,0.09,0.76)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top=frame()
	var head := VBoxContainer.new(); top.add_child(head)
	heading=Label.new(); heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	heading.add_theme_font_size_override("font_size",18); head.add_child(heading)
	var credit := Label.new(); credit.text="Historical list | City/PDDL | OSM/ODbL"
	credit.add_theme_font_size_override("font_size",10); head.add_child(credit)
	picture=TextureRect.new(); picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(picture)
	tray=frame()
	var stack := VBoxContainer.new(); stack.add_theme_constant_override("separation",4); tray.add_child(stack)
	reader=RichTextLabel.new(); reader.custom_minimum_size=Vector2(0,80)
	reader.add_theme_font_size_override("normal_font_size",16)
	reader.scroll_active=true; reader.focus_mode=Control.FOCUS_ALL; stack.add_child(reader)
	var grid := GridContainer.new(); grid.columns=3
	grid.add_theme_constant_override("h_separation",4); grid.add_theme_constant_override("v_separation",4); stack.add_child(grid)
	add_button(grid,"Cadillac\n380 Eddy",func(): choose(0))
	add_button(grid,"Boeddeker\n246 Eddy",func(): choose(1))
	add_button(grid,"Warm paper",func(): palette=0; refresh(true))
	add_button(grid,"Cool paper",func(): palette=1; refresh(true))
	add_button(grid,"Begin walk",begin)
	add_button(grid,"Walk",walk_route)
	add_button(grid,"Record site",record_site)
	add_button(grid,"Make map",make_map)
	add_button(grid,"Share map",share_map)
	add_button(grid,"End walk",end_session)
	add_button(grid,"Music: Off",func(): game.toggle_music_playback(); refresh(false))
	add_button(grid,"Back",close_story)
	for i in range(2):
		var index := i
		var pad := Button.new(); pad.text=str(i+1); pad.custom_minimum_size=Vector2(44,44)
		game.style_game_button(pad); pad.pressed.connect(func(): place_label(index))
		add_child(pad); pads.append(pad)
		var label := Label.new(); label.text=("1 380 Eddy St\nCadillac" if i==0 else "2 246 Eddy St\nBoeddeker")
		label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; label.add_theme_font_size_override("font_size",14)
		label.add_theme_color_override("font_color",Color("294b47")); label.mouse_filter=Control.MOUSE_FILTER_IGNORE
		add_child(label); map_labels.append(label)
	var parsed: Variant=JSON.parse_string(FileAccess.get_file_as_string("res://data/voting_places.json"))
	if valid_source(parsed):
		source=parsed
		for site in source.sites:
			if site.get("observation") is Array and site.observation.size()==2: goals.append(Vector2(site.observation[0],site.observation[1]))
	var tangent: Vector2=game.nearest_street_tangent(game.neighbor_xz(0))
	if tangent.x<0: tangent=-tangent
	home=game.neighbor_xz(0)+tangent*4.0
	sites_valid=goals.size()==2 and game.power_place.loaded and game.is_walkable_point(home,0.85)
	for p in goals:
		if not game.is_walkable_point(p,0.85): sites_valid=false
		for pole in game.street_lamp_points:
			if p.distance_to(pole)<1.3: sites_valid=false
		for tree in game.street_tree_points:
			if p.distance_to(tree)<1.4: sites_valid=false
		for person in game.neighbor_nodes:
			if p.distance_to(Vector2(person.position.x,person.position.z))<1.6: sites_valid=false
	if goals.size()==2:
		if goals[0].distance_to(Vector2(game.MUSEUM_HUB_POS.x,game.MUSEUM_HUB_POS.z))<14 or goals[1].distance_to(game.BOEDDEKER_PARK_ENTRANCE)<12: sites_valid=false
	paper=MeshInstance3D.new(); paper.name="OriginalHistoricalMapFolio"
	var quad := QuadMesh.new(); quad.size=Vector2(0.32,0.23); paper.mesh=quad
	paper.position=Vector3(0.1,1.08,0.34)
	paper_material=StandardMaterial3D.new(); paper_material.cull_mode=BaseMaterial3D.CULL_DISABLED
	paper_material.texture_filter=BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	paper.material_override=paper_material; game.player_visual.add_child(paper)
	resized.connect(queue_layout)
	for control in [top,tray]: control.minimum_size_changed.connect(queue_layout)
	hide(); update_art()

func frame() -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(p); return p

func add_button(parent: Node,text: String,callback: Callable) -> void:
	var b := Button.new(); b.text=text; b.custom_minimum_size=Vector2(44,44)
	b.size_flags_horizontal=Control.SIZE_EXPAND_FILL; b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	game.style_game_button(b); b.add_theme_font_size_override("font_size",12)
	for state in ["normal","hover","pressed","disabled"]:
		var style: StyleBox=b.get_theme_stylebox(state).duplicate(); style.content_margin_left=2; style.content_margin_right=2; b.add_theme_stylebox_override(state,style)
	b.pressed.connect(callback); parent.add_child(b); buttons.append(b)

func valid_source(value: Variant) -> bool:
	if not value is Dictionary or value.get("format")!=1 or value.get("election")!="2024-11-05" or value.get("published")!="2024-10-03": return false
	if not value.get("sites") is Array or value.sites.size()!=2: return false
	for i in range(2):
		var site: Variant=value.sites[i]
		if not site is Dictionary: return false
		if site.get("id")!=["750","2092"][i] or site.get("eas_id")!=["490999","490979"][i] or site.get("address")!=["380 Eddy St","246 Eddy St"][i] or site.get("room")!=["Lobby","Meeting Room"][i]: return false
		for key in ["xz","observation","lonlat","centerline"]:
			if not site.get(key) is Array or site[key].size()!=2: return false
			for number in site[key]:
				if not (number is int or number is float) or not is_finite(number): return false
	if not value.get("streets") is Array: return false
	for street in value.streets:
		if not street is Dictionary or not street.get("points") is Array: return false
		for point in street.points:
			if not point is Array or point.size()!=2: return false
			for number in point:
				if not (number is int or number is float) or not is_finite(number): return false
	return true

func available() -> bool: return game.block_opened and sites_valid and game.power_place.loaded
func goal() -> Vector2: return home if phase>=3 else (goals[selected] if sites_valid else Vector2.ZERO)
func near() -> bool: return game.current_path.is_empty() and game.player_xz().distance_to(goal())<=(1.0 if phase>=3 else 2.0)

func open_story() -> bool:
	if visible: return true
	var other=game.active_story_episode()
	if not available() or (other!=null and other!=self) or game.startup_story_pending or game.is_story_card_visible() or game.is_focused_activity_visible() or not game.current_path.is_empty():
		game.announce_a11y_status("Open the gathering, finish arriving and End the other story before this historical map walk.")
		return false
	return_focus=get_viewport().gui_get_focus_owner(); saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false; game.orbit_dragging=false
	refresh(true); fit_layout()
	var focus_index := 11 if won else (4 if not active else (selected if phase==2 else (8 if phase>=3 and near() else (6 if phase==1 and near() and (observed&(1<<selected))==0 else 5))))
	buttons[focus_index].grab_focus()
	return true

func close_story(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree() and not (return_focus is BaseButton and return_focus.disabled): return_focus.grab_focus()
	elif game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. This historical map stays for this visit; End or reload clears it.")

func begin() -> void:
	if not visible or active or not available() or game.active_story_episode()!=null: return
	active=true; won=false; phase=1; observed=0; placed=0
	message='Bea: "Help us make a little map from two published records. We are observing outside, not entering polling rooms." Choose either site and Walk.'
	refresh(true); game.update_walking_status(); buttons[5].grab_focus()

func choose(index: int) -> void:
	if not visible or index<0 or index>1: return
	selected=index; message="Selected "+str(source.sites[index].address)+"."
	refresh(true); buttons[index].grab_focus()

func record_site() -> void:
	if not visible or not active or phase!=1 or not near() or (observed&(1<<selected))!=0: return
	observed|=1<<selected
	message="Recorded "+str(source.sites[selected].listed_description)+", "+str(source.sites[selected].address)+" from the October 3 published list. This outdoor stop is not its doorway."
	if observed==3: message+=" Both records found! Choose Make map."
	refresh(true); buttons[7 if observed==3 else 1-selected].grab_focus()

func make_map() -> void:
	if not visible or not active or observed!=3 or phase!=1: return
	phase=2; message="Choose an address label, then tap its numbered address pin on your paper map. North is up; the upper sloping line is Eddy Street, with Turk below. A mismatch is harmless."
	refresh(true); buttons[0].grab_focus()

func place_label(index: int) -> void:
	if not visible or not active or phase!=2 or index<0 or index>1: return
	if index!=selected:
		message="That pin belongs to "+str(source.sites[index].address)+". Your selected label is "+str(source.sites[selected].address)+". Choose its matching pin; nothing was lost."
	else:
		placed|=1<<index; message="Placed "+str(source.sites[index].address)+" on its city address pin."
		if placed==3: phase=3; message+=' Both labels fit! Return to Bea and Share your original map.'
	refresh(true); buttons[5 if phase==3 else 1-index].grab_focus()

func share_map() -> void:
	if not visible or not active or phase!=3 or placed!=3 or not near() or won: return
	won=true; message='Bea: "Now our little map keeps the addresses straight." Celeste: "Two careful observations, one clear picture." Your finished original paper map stays with you for this visit.'
	refresh(true); game.update_walking_status(); buttons[11].grab_focus()

func cancel_intent() -> void: traveling=false; via_pending=false; generation+=1
func reset_session() -> void:
	cancel_intent(); active=false; won=false; observed=0; placed=0; phase=0; selected=0; palette=0; message=""; update_art()
func end_session() -> void:
	if not visible: return
	reset_session(); message="Historical walk ended. Your afternoon continues."; refresh(true); game.update_walking_status(); buttons[4].grab_focus()

func walk_route() -> void:
	if not visible or not active or won or phase==2: return
	if near(): message="Already at this outdoor stop. Choose Record site or Share map."; refresh(true); return
	trip_goal=goal(); leg_goal=trip_goal
	var p: Array=game.power_place.source.return_junction.xz
	var via := Vector2(p[0],p[1])
	var use_via: bool=not game.segment_walkable(game.player_xz(),trip_goal) and ((game.player_xz().x>via.x)!=(trip_goal.x>via.x))
	if use_via: leg_goal=via
	close_story(false); game.show_block_panel(false)
	var manual: bool=not game.following_player
	var camera_state := {"target":game.target,"view_size":game.view_size,"in_overview":game.in_overview,"in_wide_overview":game.in_wide_overview}
	traveling=game.walk_to_point(leg_goal); via_pending=traveling and use_via
	if manual:
		game.following_player=false
		for key in camera_state: game.set(key,camera_state[key])
		game.update_camera()
	if not traveling: blocked_route()

func blocked_route() -> void:
	cancel_intent(); message="The walk paused before arrival. Your map stays. Return to Eddy Street and choose Walk again."; game.announce_a11y_status(message)
	open_from_walking()

func open_from_walking() -> void:
	generation+=1; var owned := generation
	await get_tree().process_frame
	while owned==generation and active and (game.walk_control.is_pressed() or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)): await get_tree().process_frame
	await get_tree().process_frame
	if owned==generation and active: open_story()

func source_text() -> String:
	if source.is_empty(): return "Historical source unavailable."
	var site: Dictionary=source.sites[selected]
	return "HISTORICAL: November 5, 2024 consolidated election, including Mayor. Two entries from the City's October 3 published list; later relocations unverified.\nSELECTED: "+str(site.name)+" - "+str(site.address)+" - "+str(site.room)+". City EAS "+str(site.eas_id)+" address pin, not a surveyed entrance or room. The orange square is an outdoor game observation stop. North is up; scale bar 40m. Pins 1 and 2 are city address points, not doors.\nADDRESS NOTE: the existing museum scene says 398 Eddy; this polling row says Cadillac Hotel, 380 Eddy, Lobby. The park scene says 240 Eddy; its separate polling row says 246 Eddy, Meeting Room. Neither scene's entrance is a polling-door claim.\nOther entries in our retained excerpt: Faithful Fools, 234 Hyde; Glide, 330 Ellis, 2nd Floor Sanctuary. They are outside this two-stop walk. This is not a complete list or an assigned voting site. For present-day voting, consult current San Francisco Department of Elections information. The world uses the existing dated geography model, not a 2024 streetscape reconstruction. Original fictional map-making and dialogue; no real ballot, endorsement or vote."

func refresh(announce: bool) -> void:
	heading.text="Election Walk 2024 | "+("Shared!" if won else ("Place the labels" if phase==2 else ("Share with Bea" if phase>=3 else "%d/2 sites observed"%[int((observed&1)!=0)+int((observed&2)!=0)])))
	reader.text=message+"\n"+source_text()
	if announce: reader.scroll_to_line(0)
	buttons[4].disabled=active or not available()
	buttons[5].disabled=not active or won or phase==2
	buttons[5].text="Return to Bea" if phase>=3 else "Walk to site"
	buttons[6].disabled=not active or phase!=1 or not near() or (observed&(1<<selected))!=0
	buttons[7].disabled=not active or observed!=3 or phase!=1
	buttons[8].disabled=not active or phase!=3 or not near() or won
	buttons[9].disabled=not active
	buttons[10].text="Music: On" if game.music_playing else "Music: Off"
	for b in buttons: b.accessibility_name=b.text.replace("\n"," "); b.tooltip_text=b.accessibility_name
	for i in range(2):
		pads[i].visible=phase==2
		map_labels[i].visible=(placed&(1<<i))!=0
		pads[i].accessibility_name="Map pin %d: city address point"%(i+1)
		pads[i].tooltip_text=pads[i].accessibility_name
	update_art(); queue_layout()
	if announce: game.announce_a11y_status(heading.text+". "+message)

func map_point(xz: Array) -> Vector2: return Vector2(20+(float(xz[0])+320)*0.9,18+(float(xz[1])+140)*0.9)
func update_art() -> void:
	if paper==null: return
	var key := "%d:%d:%d"%[palette,observed,placed]
	if not textures.has(key):
		var bg := "#eee0bf" if palette==0 else "#dce8e3"
		var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 360 240"><rect x="1" y="1" width="358" height="238" rx="8" fill="'+bg+'" stroke="#476961" stroke-width="2"/>'
		for street in source.get("streets",[]):
			var path := ""
			for point in street.points:
				var p := map_point(point); path+=("M" if path.is_empty() else "L")+"%.2f %.2f "%[p.x,p.y]
			svg+='<path d="'+path+'" fill="none" stroke="#8aa9ac" stroke-width="8"/>'
		for i in range(source.get("sites",[]).size()):
			var p := map_point(source.sites[i].xz); var o := map_point(source.sites[i].observation)
			var ink := "#276a5a" if (placed&(1<<i))!=0 else "#75549b"
			svg+='<path d="M%.2f %.2fL%.2f %.2f" stroke="#9c7644" stroke-dasharray="2 2"/>'%[p.x,p.y,o.x,o.y]
			svg+='<rect x="%.2f" y="%.2f" width="6" height="6" fill="#c47d43"/>'%[o.x-3,o.y-3]
			svg+='<circle cx="%.2f" cy="%.2f" r="10" fill="%s" stroke="#fffaf0" stroke-width="2"/>'%[p.x,p.y,ink]
			if (observed&(1<<i))!=0: svg+='<path d="M%.2f %.2fl4 4 8-10" fill="none" stroke="#fffaf0" stroke-width="2"/>'%[p.x-6,p.y]
		svg+='<rect x="1" y="1" width="358" height="238" rx="8" fill="none" stroke="#476961" stroke-width="2"/><path d="M330 45V18l-6 10m6-10 6 10M25 215h36m-36-4v8m36-8v8" fill="none" stroke="#294b47" stroke-width="2"/></svg>'
		var img := Image.new(); img.load_svg_from_string(svg); img.generate_mipmaps(); textures[key]=ImageTexture.create_from_image(img)
	picture.texture=textures[key]; paper_material.albedo_texture=textures[key]; paper.visible=active

func objective() -> Dictionary:
	var p := goal()
	return {"id":"election_walk","has_target":not won and phase!=2,"target":Vector3(p.x,0,p.y),"target_name":"Bea's gathering" if phase>=3 else str(source.sites[selected].address),"text":"Election Walk: "+("Map shared!" if won else ("Place two labels on your paper map" if phase==2 else ("Return and share your map" if phase>=3 else "Observe "+str(source.sites[selected].address)))),"hint":"Election map resumes this historical visit. Back keeps it; End clears it."}

func snapshot() -> Dictionary:
	return {"visible":visible,"active":active,"won":won,"sites_valid":sites_valid,"phase":phase,"observed":observed,"placed":placed,"selected":selected,"palette":palette,"traveling":traveling,"via_pending":via_pending,"near":near(),"goal":[goal().x,goal().y],"goals":goals.map(func(p):return [p.x,p.y]),"text":reader.text,"reader":game.control_snapshot(reader),"scroll":reader.get_v_scroll_bar().value,"buttons":buttons.map(func(b):return game.control_snapshot(b).merged({"text":b.text,"focused":b.has_focus(),"accessible_name":b.accessibility_name})),"pads":pads.map(func(b):return game.control_snapshot(b)),"map_labels":map_labels.map(func(label):return game.control_snapshot(label).merged({"text":label.text})),"picture":game.rect_snapshot(art_rect),"layout_pending":layout_pending,"paper_visible":paper.visible,"paper_corners":[Vector2(-0.16,0.115),Vector2(0.16,0.115),Vector2(-0.16,-0.115),Vector2(0.16,-0.115)].map(func(p): var q:Vector2=game.camera.unproject_position(paper.to_global(Vector3(p.x,p.y,0))); return {"x":q.x,"y":q.y}),"cache":textures.size()}

func _process(delta: float) -> void:
	if active and not available(): reset_session(); close_story(false)
	if traveling:
		if not game.current_path.is_empty() and game.current_path[-1].distance_to(leg_goal)>2: cancel_intent()
		elif game.current_path.is_empty():
			if game.player_xz().distance_to(leg_goal)>2: blocked_route()
			elif via_pending:
				via_pending=false; leg_goal=trip_goal
				game.current_path=game.find_path(game.player_xz(),trip_goal)
				if game.current_path.size()>1 and game.current_path[0].distance_to(game.player_xz())<0.2: game.current_path.remove_at(0)
				game.update_route_ribbon(true)
				if game.current_path.is_empty(): blocked_route()
			else: traveling=false; open_from_walking()
	if not visible: return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	buttons[10].text="Music: On" if game.music_playing else "Music: Off"
	snapshot_clock+=delta
	if snapshot_clock>=0.2: snapshot_clock=0; game.sync_web_a11y_status()

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true; fit_layout.call_deferred()
func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size(); var width := minf(940,vp.x-12)
	top.position=Vector2((vp.x-width)/2,6); top.size=Vector2(width,0); top.size.y=top.get_combined_minimum_size().y
	var side: bool=vp.x>=520 and vp.y<560
	tray.size=Vector2(280 if side else width,0); tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)/2,vp.y-tray.size.y-6)
	var area := Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	if side: area=Rect2(6,top.position.y+top.size.y+6,tray.position.x-12,vp.y-top.position.y-top.size.y-18)
	var scale := maxf(0.001,minf(area.size.x/360,area.size.y/240))
	art_rect=Rect2(area.position+(area.size-Vector2(360,240)*scale)/2,Vector2(360,240)*scale)
	picture.position=art_rect.position; picture.size=art_rect.size
	for i in range(2):
		var p := art_rect.position+map_point(source.sites[i].xz)*scale if sites_valid else Vector2.ZERO
		pads[i].position=p-Vector2(22,22); pads[i].size=Vector2(44,44)
		var label_width := minf(160,art_rect.size.x/2-10)
		map_labels[i].size=Vector2(label_width,0)
		map_labels[i].position=Vector2(clampf(p.x-label_width/2,art_rect.position.x+i*art_rect.size.x/2+5,art_rect.position.x+(i+1)*art_rect.size.x/2-label_width-5),p.y+26)

