extends Control
## Fictional future workshop. Deliberate still stages; only the invitation is durable.
const FORMS := ["Low display", "Upright display"]
const FRAME_WIDTH := 0.78
const FRAME_STEP := 0.54
var game: Node
var top: PanelContainer
var tray: PanelContainer
var reader: RichTextLabel
var picture: TextureRect
var forms: Array[Button] = []
var supports: Array[Button] = []
var assist: Button
var back: Button
var habitat_entry: Button
var selected := 0
var fitted: Array[bool] = [false,false]
var complete := false
var saved_visibility: Dictionary = {}
var return_focus: Control
var layout_pending := false
var snapshot_clock := 0.0
var textures: Dictionary = {}
var worlds: Array[Node3D] = []
var panels: Array = []
var legs: Array = []
var rails: Array = []
var rendered_world := ""
var held_on_exit: Array[Key] = []

func setup(owner_game: Node) -> void:
	game=owner_game; name="HelperBench"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP; z_index=105
	var shade := ColorRect.new(); shade.color=Color("182c38")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); shade.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(shade)
	top=frame(); var titles := VBoxContainer.new(); top.add_child(titles)
	var title := Label.new(); title.text="Tenderloin to the Stars | Helper bench"
	title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; title.add_theme_font_size_override("font_size",18); titles.add_child(title)
	var credit := Label.new(); credit.text="Speculative future | Fictional neighbors | This visit only"
	credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; credit.add_theme_font_size_override("font_size",12); titles.add_child(credit)
	picture=TextureRect.new(); picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; picture.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(picture)
	tray=frame(); var box := VBoxContainer.new(); box.add_theme_constant_override("separation",4); tray.add_child(box)
	reader=game.make_activity_detail(); reader.add_theme_font_size_override("normal_font_size",16); box.add_child(reader)
	var choices := HBoxContainer.new(); box.add_child(choices)
	for i in range(2):
		var index := i
		forms.append(button(choices,FORMS[i],func(): choose_form(index))); forms[i].toggle_mode=true
	var fits := HBoxContainer.new(); box.add_child(fits)
	for i in range(2):
		var index := i
		supports.append(button(fits,"Fit left support" if i==0 else "Fit right support",func(): fit_support(index)))
	assist=button(box,"Ask helper to lift",finish)
	var exits := HBoxContainer.new(); exits.add_theme_constant_override("separation",4); box.add_child(exits)
	back=button(exits,"Keep exploring",close_bench)
	habitat_entry=button(exits,"Habitat room",open_habitat)
	resized.connect(queue_layout); top.minimum_size_changed.connect(queue_layout); tray.minimum_size_changed.connect(queue_layout)
	hide(); build_world()

func frame() -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(p); return p

func button(parent: Node,text: String,callback: Callable) -> Button:
	var b := Button.new(); b.text=text; b.accessibility_name=text
	b.custom_minimum_size=Vector2(44,44); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; b.add_theme_font_size_override("font_size",13)
	game.style_game_button(b); b.pressed.connect(callback); parent.add_child(b); return b

func available() -> bool:
	return game.film_phase=="done" and game.is_valid_film_plan(game.film_result)

func open_bench() -> bool:
	if visible: return true
	if not available() or game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.active_story_episode()!=null or game.is_focused_activity_visible():
		game.announce_a11y_status("Finish your film and arriving, then close the current activity before visiting the helper bench."); return false
	return_focus=get_viewport().gui_get_focus_owner(); saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	game.cancel_map_pinch(); game.close_phone_disclosure(); game.pointer_active=false; game.orbit_dragging=false
	show()
	for c in saved_visibility: c.visible=false
	refresh(true); fit_layout()
	if complete or (not fitted[0] and not fitted[1]): forms[selected].grab_focus()
	elif fitted[0] and fitted[1]: assist.grab_focus()
	else: supports[0 if not fitted[0] else 1].grab_focus()
	return true

func open_habitat() -> void:
	if not visible or game.habitat_room==null: return
	if not game.habitat_room.can_open(self):
		game.announce_a11y_status("Finish arriving or the pending activity before arranging the habitat copies. The helper bench stays open.")
		return
	close_bench(false)
	if not game.habitat_room.open_room(): open_bench()

func close_bench(announce: bool=true) -> void:
	if not visible: return
	held_on_exit.clear()
	for key in [KEY_W,KEY_A,KEY_S,KEY_D,KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT]:
		if Input.is_key_pressed(key) or Input.is_physical_key_pressed(key): held_on_exit.append(key)
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	saved_visibility.clear(); game.update_block_ui(); game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_film_btn.is_visible_in_tree(): game.block_film_btn.grab_focus()
	if game.camera!=null: game.update_occlusion(true)
	if announce: game.announce_a11y_status("Back to the block. Your helper bench stays this visit. Watch your film to return; reload or a successful import clears the bench, not your invitation.")

func reset_visit() -> void:
	close_bench(false); selected=0; fitted=[false,false]; complete=false; textures.clear(); rendered_world=""; update_world()

func release_pending() -> bool:
	for i in range(held_on_exit.size()-1,-1,-1):
		if not Input.is_key_pressed(held_on_exit[i]) and not Input.is_physical_key_pressed(held_on_exit[i]): held_on_exit.remove_at(i)
	return not held_on_exit.is_empty()

func choose_form(index: int) -> void:
	if not visible or not available() or index<0 or index>1: return
	if not complete and (fitted[0] or fitted[1]): return
	selected=index; refresh(true); update_world()

func fit_support(index: int) -> void:
	if not visible or not available() or complete or index<0 or index>1 or fitted[index]: return
	fitted[index]=true; refresh(true)
	if fitted[0] and fitted[1]: assist.grab_focus()
	else: supports[1-index].grab_focus()

func finish() -> void:
	if not visible or not available() or complete or not fitted[0] or not fitted[1]: return
	complete=true; refresh(true); update_world()
	forms[selected].grab_focus()

func description() -> String:
	return "%s jig: left support %s; right support %s. %s"%[FORMS[selected],"fitted" if fitted[0] else "empty","fitted" if fitted[1] else "empty","The helper has placed three copied film pictures and parked." if complete else "The helper waits for your instruction beside the unmounted frames."]+(" The low illustration is foreshortened to show its tilt." if complete and selected==0 else "")

func refresh(announce: bool) -> void:
	if not visible or not available(): return
	var ending: String=game.film_shot_title(String(game.film_result.order[2])).to_lower()
	var titles := PackedStringArray()
	for shot in game.film_result.order: titles.append(game.film_shot_title(String(shot)))
	var body := "Dez: Celeste and I imagine a little helper built by the neighbors. Let's give it a useful first job: lift our three film pictures onto a stand for a future neighborhood.\nChoose a display, then fit both supports in either order. Only you can ask the helper to lift. There is no timer."
	if fitted[0] or fitted[1]: body="Dez: Good, the %s has %s. Fit the remaining support, then ask our helper to lift the pictures. It waits for you."%[FORMS[selected].to_lower(),"both supports" if fitted[0] and fitted[1] else "one support"]
	if complete: body="Dez: Your %s holds all three pictures, ending on %s. You fitted the supports; our helper lifted the frames and parked. That is a small job we can share.\nWe can imagine a home around what our neighbors made. Our habitat room model is ready to arrange; a welcomed room now offers Prepare together and a speculative departure. The departure opens the walkable orbital commons, a final gathering and an authored return. You can try the other display here, or keep exploring."%[FORMS[selected].to_lower(),ending]
	body+="\nCopied order: %s. %s; %s. These are the film's original illustrations, separate from Celeste's hosted tile panel.\nThis is speculative fiction, not a present-day robot or launch claim. Assembly and display last this visit only. Reload or a successful import keeps your earned invitation from the completed film, and starts this bench fresh. Music, saved work and the street camera stay yours."%[" / ".join(titles),game.FILM_FRAMING_LABELS[game.film_result.framing],game.FILM_PLAN_LABELS[game.film_result.plan]]
	body+="\nHabitat room opens a separate room of copies from your completed film and hosted choices. You may arrange it now or after this bench; constructing the stand is optional. Its arrangement also lasts this visit only."
	if game.habitat_room!=null and game.habitat_room.orbital.completed: body=game.habitat_room.orbital.recognition()+"\n"+body
	habitat_entry.text="Revisit finale" if game.habitat_room!=null and game.habitat_room.orbital.completed else "Habitat room"
	habitat_entry.disabled=game.habitat_room==null or not game.habitat_room.available()
	game.set_activity_detail(reader,body); picture.texture=texture(); picture.accessibility_name=description()
	for i in range(2):
		forms[i].set_pressed_no_signal(selected==i); forms[i].disabled=not complete and (fitted[0] or fitted[1])
		supports[i].disabled=fitted[i] or complete
	assist.disabled=complete or not fitted[0] or not fitted[1]
	assist.text="Helper parked" if complete else "Ask helper to lift"
	var ring: Array[Control]=[reader]
	for b in forms+supports+[assist,back,habitat_entry]:
		if not b.disabled: ring.append(b)
	for i in range(ring.size()):
		ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()]); ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	if announce: game.announce_a11y_status(description()+" "+body)
	queue_layout()

func texture() -> Texture2D:
	var key := "%d:%s:%s:%s:%s"%[selected,fitted[0],fitted[1],complete,JSON.stringify(game.film_result)]
	if textures.has(key): return textures[key]
	var svg := '<rect width="720" height="480" rx="20" fill="#e6dcc0"/><path d="M24 450H696" stroke="#9d8769" stroke-width="8"/><rect x="100" y="420" width="310" height="25" rx="8" fill="#406d73"/>'
	var upper := 142 if selected==0 else 34
	for i in range(2):
		var x := 140+i*230
		if fitted[i]: svg+='<path d="M%d 420L%d %dL%d %dL%d 420Z" fill="#c07e47" stroke="#654835" stroke-width="5"/>'%[x-20,x-7,upper,x+14,upper,x+26]
		else: svg+='<rect x="%d" y="%d" width="48" height="%d" rx="12" fill="none" stroke="#a68a64" stroke-width="5" stroke-dasharray="10 8"/>'%[x-20,upper,420-upper]
	# A vertical three-frame strip keeps each copied picture readable in the street.
	for i in range(3):
		var px := 160 if complete else 45+i*140
		var py := upper+i*(80 if selected==0 else 115) if complete else 20
		var sx := 0.46 if complete else 0.30
		var sy := (0.32 if selected==0 else 0.46) if complete else 0.30
		svg+='<rect x="%d" y="%d" width="%f" height="%f" rx="5" fill="#29434a"/>'%[px-3,py-3,420*sx+6,236*sy+6]
		svg+='<g transform="translate(%d %d) scale(%f %f)">%s</g>'%[px,py,sx,sy,game.build_film_frame_svg(game.film_result,String(game.film_result.order[i]))]
	var rx := 580 if complete else 540
	var raised := 55 if not complete else 0
	svg+='<circle cx="%d" cy="434" r="23" fill="#29434a"/><circle cx="%d" cy="434" r="23" fill="#29434a"/><rect x="%d" y="344" width="96" height="72" rx="20" fill="#da9e49" stroke="#29434a" stroke-width="6"/><rect x="%d" y="316" width="74" height="44" rx="17" fill="#5f9c92" stroke="#29434a" stroke-width="6"/><circle cx="%d" cy="337" r="6" fill="#fff2cc"/><circle cx="%d" cy="337" r="6" fill="#fff2cc"/>'%[rx-23,rx+32,rx-43,rx-33,rx-13,rx+13]
	svg+='<path d="M%d 371L%d %dL%d %d" stroke="#29434a" stroke-width="14" stroke-linecap="round" fill="none"/>'%[rx-38,rx-64,398-raised,rx-72,412-raised]

	var image := Image.new()
	if image.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">'+svg+'</svg>')!=OK: return null
	var result := ImageTexture.create_from_image(image)
	if textures.size()>=4: textures.erase(textures.keys()[0])
	textures[key]=result; return result

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true; fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size(); var side: bool=vp.x>=520 and vp.y<500
	var width: float=minf(960,vp.x-12)
	top.size=Vector2(vp.x-298 if side else width,0); top.size.y=top.get_combined_minimum_size().y
	top.position=Vector2(6 if side else (vp.x-width)*0.5,6)
	reader.custom_minimum_size.y=64 if side else 112
	tray.size=Vector2(280 if side else width,0); tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	picture.position=Vector2(6 if side else (vp.x-width)*0.5,top.position.y+top.size.y+6)
	picture.size=Vector2(maxf(1,tray.position.x-12) if side else width,maxf(1,(vp.y-6 if side else tray.position.y-6)-picture.position.y))
	game.sync_web_a11y_status()

func box(parent: Node3D,id: String,pos: Vector3,full_size: Vector3,color: String) -> MeshInstance3D:
	var mesh := BoxMesh.new(); mesh.size=full_size
	var item := MeshInstance3D.new(); item.name=id; item.mesh=mesh; item.position=pos; item.material_override=game.person_material(Color(color)); parent.add_child(item); return item

func build_world() -> void:
	for li in range(2):
		var root := Node3D.new(); root.name="SpeculativeHelperDisplay"
		(game.layout_table_node if li==0 else game.layout_floor_node).add_child(root)
		root.position=Vector3(-5.35,0,0) if li==0 else Vector3(2.9,0.06,-0.1); worlds.append(root)
		box(root,"Foot",Vector3(0,0.06,0),Vector3(0.90,0.12,0.48),"406d73")
		var pair: Array=[]
		for i in range(2): pair.append(box(root,"Support%d"%i,Vector3(-0.36+i*0.72,0.4,0),Vector3(0.055,0.7,0.055),"c07e47"))
		legs.append(pair); var rail_pair: Array=[]
		for i in range(2): rail_pair.append(box(root,"DisplayRail%d"%i,Vector3(-0.41+i*0.82,1.1,-0.035),Vector3(0.04,1.64,0.04),"29434a"))
		rails.append(rail_pair); var faces: Array=[]
		for i in range(3):
			var face := MeshInstance3D.new(); face.name="CopiedFilmFrame%d"%i
			var mesh := QuadMesh.new(); mesh.size=Vector2(FRAME_WIDTH,FRAME_WIDTH*271.25/420.0); face.mesh=mesh
			var mat: StandardMaterial3D=game.material(Color.WHITE); mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED; mat.cull_mode=BaseMaterial3D.CULL_DISABLED
			# Keep copied colors legible over the existing translucent cutaway veil.
			# Opaque depth testing stays enabled; no building or camera policy changes.
			mat.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA; mat.render_priority=1
			face.material_override=mat; root.add_child(face); faces.append(face)
		panels.append(faces)
		# One parked helper, contained within the same bounded fictional furniture pocket.
		box(root,"ParkedHelper",Vector3(0,0.22,0.95),Vector3(0.30,0.30,0.28),"da9e49")
		box(root,"HelperHead",Vector3(0,0.43,0.95),Vector3(0.26,0.16,0.22),"5f9c92")
		for i in range(2): box(root,"Wheel%d"%i,Vector3(-0.16+i*0.32,0.08,0.95),Vector3(0.06,0.16,0.23),"29434a")
	update_world()

func update_world() -> void:
	var shown: bool=complete and available() and game.block_opened and game.active_story_episode()==null
	var changed := false
	for root in worlds:
		changed=changed or root.visible!=shown; root.visible=shown
	var key := "%s:%d:%s"%[complete,selected,JSON.stringify(game.film_result)]
	if key!=rendered_world and complete and available():
		rendered_world=key; changed=true
		for li in range(worlds.size()):
			var angle := -PI/3.0 if selected==0 else -PI/10.0
			var center_y := 0.85 if selected==0 else 1.1
			for i in range(3):
				var face: MeshInstance3D=panels[li][i]
				face.material_override.albedo_texture=game.film_screening.texture(game.film_result,String(game.film_result.order[i]),true)
				face.set_meta("copied_key","%s:%s"%[game.film_result.framing,game.film_result.order[i]])
				var along := FRAME_STEP-float(i)*FRAME_STEP
				face.position=Vector3(0,center_y+along*cos(angle),along*sin(angle))
				face.rotation.x=angle
			for leg in legs[li]:
				leg.scale.y=(center_y-0.06)/0.7; leg.position.y=(center_y+0.06)*0.5
			for rail in rails[li]:
				rail.position.y=center_y; rail.rotation.x=angle
	if changed and game.camera!=null: game.update_occlusion(true)

func cutaway_points() -> Array[Vector2]:
	var points: Array[Vector2]=[]
	for root in worlds:
		if root.is_visible_in_tree(): points.append(Vector2(root.global_position.x,root.global_position.z))
	return points

func inspection_rect() -> Rect2:
	# Like the mural/Bea paper, reserve copied pictures during nearby manual inspection.
	# This only places screen labels; it never changes depth, cutaways or the camera.
	if not complete or not available() or game.following_player or game.in_overview or game.in_wide_overview: return Rect2()
	var art := Rect2()
	var half := FRAME_WIDTH*0.5
	for li in range(worlds.size()):
		if not worlds[li].is_visible_in_tree() or game.target.distance_to(worlds[li].global_position)>24.0: continue
		for face: MeshInstance3D in panels[li]:
			if not face.is_visible_in_tree() or game.camera.is_position_behind(face.global_position): continue
			var frame := Rect2(game.camera.unproject_position(face.to_global(Vector3(-half,half*271.25/420.0,0))),Vector2.ZERO)
			for local in [Vector3(half,half*271.25/420.0,0),Vector3(-half,-half*271.25/420.0,0),Vector3(half,-half*271.25/420.0,0)]:
				frame=frame.expand(game.camera.unproject_position(face.to_global(local)))
			if frame.has_area() and game.play_area_rect().intersects(frame): art=art.merge(frame) if art.has_area() else frame
	return art.grow(4.0) if art.has_area() else Rect2()

func handle_input(event: InputEvent) -> void:
	if not visible or not event is InputEventKey or not event.pressed: return
	var key: Key=event.keycode if event.keycode!=KEY_NONE else event.physical_keycode
	if key==KEY_ESCAPE and not event.echo: close_bench(); get_viewport().set_input_as_handled(); return
	if key in [KEY_PAGEUP,KEY_PAGEDOWN,KEY_HOME,KEY_END] or (reader.has_focus() and key in [KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT]):
		reader.grab_focus(); var bar := reader.get_v_scroll_bar()
		match key:
			KEY_HOME: bar.value=0
			KEY_END: bar.value=bar.max_value
			KEY_PAGEUP: bar.value-=bar.page*0.9
			KEY_PAGEDOWN: bar.value+=bar.page*0.9
			KEY_UP: bar.value-=24
			KEY_DOWN: bar.value+=24
		get_viewport().set_input_as_handled()

func snapshot() -> Dictionary:
	var all_buttons: Array[Button]=[]
	all_buttons.append_array(forms); all_buttons.append_array(supports); all_buttons.append_array([assist,back,habitat_entry])
	var controls: Array=game.activity_detail_snapshot(reader,tray,all_buttons).buttons
	var world: Array=[]
	for li in range(worlds.size()):
		var faces: Array=[]
		for i in range(3):
			var face: MeshInstance3D=panels[li][i]; var pos: Vector2=game.camera.unproject_position(face.global_position)
			var corners: Array=[]
			var half := FRAME_WIDTH*0.5
			for local in [Vector3(-half,half*271.25/420.0,0),Vector3(half,half*271.25/420.0,0),Vector3(-half,-half*271.25/420.0,0),Vector3(half,-half*271.25/420.0,0)]:
				var point: Vector2=game.camera.unproject_position(face.to_global(local)); corners.append({"x":point.x,"y":point.y})
			faces.append({"shot":String(game.film_result.order[i]) if available() else "","texture":face.material_override.albedo_texture!=null,"copied_key":face.get_meta("copied_key",""),"x":pos.x,"y":pos.y,"height":face.position.y,"corners":corners})
		world.append({"visible":worlds[li].is_visible_in_tree(),"local_x":worlds[li].position.x,"local_z":worlds[li].position.z,"frames":faces})
	return {"visible":visible,"available":available(),"selected":selected,"fitted":fitted.duplicate(),"complete":complete,"description":description(),"text":reader.text,"buttons":controls,"reader":game.control_snapshot(reader),"picture":game.control_snapshot(picture),"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"scroll":reader.get_v_scroll_bar().value,"scroll_max":maxf(0,reader.get_v_scroll_bar().max_value-reader.get_v_scroll_bar().page),"world":world,"layout_pending":layout_pending,"release_pending":not held_on_exit.is_empty(),"focus_within":is_ancestor_of(get_viewport().gui_get_focus_owner()) if get_viewport().gui_get_focus_owner()!=null else false}

func _process(delta: float) -> void:
	update_world()
	if not visible: return
	if not available(): close_bench(false); return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	snapshot_clock+=delta
	if snapshot_clock>=0.2: snapshot_clock=0; game.sync_web_a11y_status()
