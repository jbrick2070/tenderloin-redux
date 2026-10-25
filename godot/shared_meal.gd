extends Control
## A current-visit shared meal. No save, route, reward, audio or camera owner.
const DATA = preload("res://shared_meal_data.gd")
const TABLE_SLOTS := [-1.8,-0.6,1.4,3.4]
const SERVING := ["Shared platter","Tasting plates"]
var game: Node
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var reader: RichTextLabel
var picture: TextureRect
var previous: Button
var next: Button
var prepare: Button
var share: Button
var explore: Button
var serving_buttons: Array[Button] = []
var placement_buttons: Array[Button] = []
var selected := 0
var revealed := 1
var invitation := -1
var steps: Array[int] = [0,0,0,0]
var servings: Array[int] = [0,0,0,0]
var placements: Array[int] = [0,0,0,0]
var generations: Array[int] = [0,0,0,0]
var shared: Dictionary = {}
var saved_visibility: Dictionary = {}
var return_focus: Control
var layout_pending := false
var snapshot_clock := 0.0
var textures: Dictionary = {}
var worlds: Array[Node3D] = []
var dishes: Array = []
var rendered_world := ""
var message := ""

func setup(owner_game: Node) -> void:
	game=owner_game
	name="SharedMeal"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=104
	var shade := ColorRect.new()
	shade.color=Color("183239")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top=frame()
	var titles := VBoxContainer.new(); top.add_child(titles)
	heading=Label.new(); heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	heading.add_theme_font_size_override("font_size",18); titles.add_child(heading)
	var credit := Label.new()
	credit.text="Original fictional neighbors | Stylized, untimed cooking | This visit only"
	credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	credit.add_theme_font_size_override("font_size",12); titles.add_child(credit)
	picture=TextureRect.new()
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(picture)
	tray=frame()
	var box := VBoxContainer.new(); box.add_theme_constant_override("separation",4); tray.add_child(box)
	reader=game.make_activity_detail(); reader.add_theme_font_size_override("normal_font_size",16)
	reader.custom_minimum_size.y=96; box.add_child(reader)
	var cooks := HBoxContainer.new(); box.add_child(cooks)
	previous=button(cooks,"Previous cook",func(): select_cook(posmod(selected-1,revealed)))
	next=button(cooks,"Next cook",func(): select_cook((selected+1)%revealed))
	prepare=button(box,"",advance)
	var portions := HBoxContainer.new(); box.add_child(portions)
	for i in range(2):
		var index := i
		serving_buttons.append(button(portions,SERVING[i],func(): set_serving(index)))
		serving_buttons[i].toggle_mode=true
	var places := HBoxContainer.new(); box.add_child(places)
	for i in range(2):
		var index := i
		placement_buttons.append(button(places,"Near edge" if i==0 else "Other edge",func(): set_placement(index)))
		placement_buttons[i].toggle_mode=true
	var actions := HBoxContainer.new(); box.add_child(actions)
	share=button(actions,"Share this dish",share_or_follow)
	explore=button(actions,"Keep exploring",close_meal)
	resized.connect(queue_layout)
	tray.minimum_size_changed.connect(queue_layout)
	top.minimum_size_changed.connect(queue_layout)
	hide()
	build_world()

func frame() -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(p); return p

func button(parent: Node,text: String,callback: Callable) -> Button:
	var b := Button.new(); b.text=text; b.accessibility_name=text; b.tooltip_text=text
	b.custom_minimum_size=Vector2(44,44); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; b.clip_text=false
	b.add_theme_font_size_override("font_size",13); game.style_game_button(b)
	b.pressed.connect(callback); parent.add_child(b); return b

func available() -> bool:
	return game.block_opened

func open_meal() -> bool:
	if visible: return true
	if not available(): return refuse("Open the neighborhood gathering before cooking together.")
	if game.active_story_episode()!=null: return refuse("Pause your story visit first: Other stories, then Keep exploring.")
	if game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.is_focused_activity_visible():
		return refuse("Finish arriving or use Stop, then close the current activity before cooking.")
	if not game.hosting_order.is_empty() and not game.is_hosting_done():
		return refuse("Finish hosting this gathering before cooking together. Host Activity continues the programme.")
	return_focus=get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	game.cancel_map_pinch(); game.close_phone_disclosure()
	game.pointer_active=false; game.orbit_dragging=false
	show()
	for c in saved_visibility: c.visible=false
	refresh(true); fit_layout(); prepare.grab_focus()
	return true

func refuse(text: String) -> bool:
	game.announce_a11y_status(text)
	return false

func close_meal(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	saved_visibility.clear()
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()
	if game.camera != null: game.update_occlusion(true)
	if announce: game.announce_a11y_status("Back to the street. Your meal, preparation and invitations stay for this visit. Reload starts them fresh.")

func reset_visit() -> void:
	close_meal(false)
	selected=0; revealed=1; invitation=-1
	steps=[0,0,0,0]; servings=[0,0,0,0]; placements=[0,0,0,0]; generations=[0,0,0,0]
	shared.clear(); message=""; rendered_world=""; update_world()

func select_cook(index: int) -> bool:
	if not visible or index<0 or index>=revealed: return false
	selected=index; message=""; refresh(true); prepare.grab_focus(); return true

func set_serving(index: int) -> void:
	if not visible or index<0 or index>1: return
	servings[selected]=index; refresh(true)

func set_placement(index: int) -> void:
	if not visible or index<0 or index>1: return
	placements[selected]=index; refresh(true)

func advance() -> void:
	if not visible: return
	if steps[selected]>=5:
		steps[selected]=0
		generations[selected]+=1
		message="A new preparation. The already shared dish stays on the table until you deliberately share again."
	else:
		steps[selected]+=1
		message=""
	refresh(true)
	if steps[selected]==5: share.grab_focus()

func share_or_follow() -> void:
	if not visible: return
	if steps[selected]<5: return
	if current_preparation_shared() and follow_target()>=0:
		select_cook(follow_target())
		return
	share_dish()

func current_preparation_shared() -> bool:
	return shared.has(selected) and int(shared[selected].get("generation",-1))==generations[selected]

func follow_target() -> int:
	if not shared.has(selected): return -1
	return selected+1 if selected<3 and selected+1<revealed else (0 if selected==3 else -1)

func share_dish() -> bool:
	if not visible or steps[selected]!=5: return false
	var first := not shared.has(selected)
	shared[selected]={"serving":servings[selected],"placement":placements[selected],"generation":generations[selected]}
	if first and selected+1<4:
		revealed=maxi(revealed,selected+2); invitation=selected+1
	elif first and shared.size()==4: invitation=0
	message=String(DATA.RECIPES[selected].recognition[servings[selected]])
	update_world(); refresh(true)
	return true

func refresh(announce: bool) -> void:
	if not visible: return
	var recipe: Dictionary=DATA.RECIPES[selected]
	var complete: bool=steps[selected]>=5
	var served: bool=current_preparation_shared()
	var target: int=follow_target()
	heading.text=String(recipe.cook)+" | "+String(recipe.title)
	var text: String=String(recipe.welcome)+"\n"+String(recipe.tradition)+". "+String(recipe.ingredients)
	if not complete:
		text+="\nStep %d/5: %s"%[steps[selected]+1,String(recipe.steps[steps[selected]][1])]
	elif not message.is_empty(): text+="\n"+String(recipe.cook)+': "'+message+'"'
	else: text+="\nReady to share. Choose a serving style and a safe place for your dish."
	if served:
		text+="\nShared this visit: %d/4 dishes. %s"%[shared.size(),String(recipe.invite)]
		if target>=0: text+=" Follow this invitation visits "+String(DATA.RECIPES[target].cook)+". Keep exploring retains it."
	text+="\n"+String(recipe.source)+"\n"+String(recipe.url)+"\nCondensed preparation, not a complete real-world recipe. Reload clears this visit's meal and invitations."
	game.set_activity_detail(reader,text)
	prepare.text="Try another preparation" if complete else String(recipe.steps[steps[selected]][0])
	previous.disabled=revealed<2; next.disabled=revealed<2
	previous.accessibility_name="Previous revealed cook. Current: "+String(recipe.cook)
	next.accessibility_name="Next revealed cook. Current: "+String(recipe.cook)
	for i in range(2):
		serving_buttons[i].set_pressed_no_signal(servings[selected]==i)
		placement_buttons[i].set_pressed_no_signal(placements[selected]==i)
		serving_buttons[i].get_parent().visible=not served or not complete
		placement_buttons[i].get_parent().visible=not served or not complete
	share.text="Follow this invitation" if complete and served and target>=0 else "Share this dish"
	share.disabled=not complete
	for b in [prepare,share,explore]+serving_buttons+placement_buttons:
		b.accessibility_name=b.text; b.tooltip_text=b.text
	picture.texture=texture(selected,steps[selected],servings[selected],false)
	picture.accessibility_name=art_description(selected,steps[selected],servings[selected])
	var ring: Array[Control]=[reader]
	for b in [previous,next,prepare]+serving_buttons+placement_buttons+[share,explore]:
		if b.is_visible_in_tree() and not b.disabled: ring.append(b)
	for i in range(ring.size()):
		ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()])
		ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	if announce:
		var cue: String=heading.text+". "
		if not complete: cue+="Step %d of5: %s. %s"%[steps[selected]+1,String(recipe.steps[steps[selected]][0]),String(recipe.steps[steps[selected]][1])]
		elif not message.is_empty(): cue+=message+(" "+String(recipe.invite) if served else "")
		else: cue+="Ready to share. Choose a serving style and place."
		game.announce_a11y_status(cue)
	queue_layout()

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true; fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size()
	var side: bool=vp.x>=520 and vp.y<500
	var width: float=minf(960,vp.x-12)
	top.size=Vector2(vp.x-298 if side else width,0)
	top.position=Vector2(6 if side else (vp.x-width)*0.5,6)
	top.size.y=top.get_combined_minimum_size().y
	reader.custom_minimum_size.y=80 if side else 96
	tray.size=Vector2(280 if side else width,0)
	tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	picture.position=Vector2(6,top.position.y+top.size.y+6)
	picture.size=Vector2(maxf(1,tray.position.x-12) if side else width,maxf(1,(vp.y-6 if side else tray.position.y-6)-picture.position.y))
	if not side: picture.position.x=(vp.x-width)*0.5
	game.sync_web_a11y_status()

func art_description(index: int,stage: int,style: int) -> String:
	var shapes: Array[String]=["a layered bulgur pie with diamond cuts","pale rectangular daikon cakes with browned faces","basil-flecked beef beside rice and an egg","separate tomato-red rice grains with sausage and peppers"]
	return "Original illustration: "+shapes[index]+". Preparation %d/5. %s."%[stage,SERVING[style]]

func artwork(index: int,stage: int,style: int,world: bool=false) -> String:
	var body := ""
	if not world:
		body='<rect width="720" height="480" rx="24" fill="#f2e5c7"/><path d="M36 407H684" stroke="#ad8865" stroke-width="12"/>'
		var clothes: Array[String]=["448577","aa705a","637eaa","ae8651"]
		var skin: Array[String]=["c69068","d1a078","b88461","81543e"]
		body+='<path d="M35 139Q35 92 77 92Q119 92 119 139" fill="#'+clothes[index]+'"/><circle cx="77" cy="67" r="27" fill="#'+skin[index]+'"/><path d="M51 61Q47 28 80 32Q108 30 105 62L94 48 62 49Z" fill="#34312f"/><path d="M104 119L155 144" stroke="#'+skin[index]+'" stroke-width="15" stroke-linecap="round"/>'
		if index==1: body+='<circle cx="103" cy="38" r="13" fill="#34312f"/>'
		if index==3: body+='<circle cx="66" cy="67" r="10" fill="none" stroke="#34312f" stroke-width="4"/><circle cx="89" cy="67" r="10" fill="none" stroke="#34312f" stroke-width="4"/>'
	var ready: bool=stage>=5 or world
	if style==0 or not ready: body+='<ellipse cx="360" cy="280" rx="270" ry="150" fill="#23434b"/><ellipse cx="360" cy="265" rx="248" ry="133" fill="#fff5df"/>'
	else: body+='<ellipse cx="220" cy="270" rx="150" ry="112" fill="#fff5df" stroke="#23434b" stroke-width="12"/><ellipse cx="500" cy="270" rx="150" ry="112" fill="#fff5df" stroke="#23434b" stroke-width="12"/>'
	var food_start: int=body.length()
	var color := "ad7c46" if ready else "c9a67a"
	match index:
		0:
			if stage==0: body+='<ellipse cx="360" cy="264" rx="165" ry="76" fill="#d4b881"/><path d="M240 250Q350 190 480 250" fill="none" stroke="#9b8057" stroke-width="12"/>'
			elif stage==1: body+='<path d="M195 215Q360 160 525 215L500 328Q360 365 220 328Z" fill="#caa06b"/>'
			elif stage==2: body+='<ellipse cx="360" cy="266" rx="174" ry="87" fill="#76513b"/><path d="M225 240L270 217 300 248 335 222 375 245 420 218 488 260" stroke="#c4a476" stroke-width="16" fill="none"/>'
			else:
				body+='<path d="M178 200L480 165 548 325 245 361Z" fill="#684731"/><path d="M178 185L480 150 548 310 245 346Z" fill="#'+color+'"/>'
				if stage==3: body+='<path d="M210 220L490 190 520 275 245 309Z" fill="#76513b"/>'
				if stage>=4:
					for n in range(5): body+='<path d="M%d 180L%d 327M200 %dL520 %d" stroke="#6e492c" stroke-width="7"/>'%[220+n*61,280+n*49,210+n*27,174+n*27]
		1:
			if stage<3:
				for n in range(12): body+='<path d="M%d %dL%d %d" stroke="#d3dfac" stroke-width="11" stroke-linecap="round"/>'%[230+n*18,230+(n%3)*24,265+n*18,268+(n%3)*24]
				if stage==2: body+='<circle cx="285" cy="240" r="18" fill="#9a5744"/><circle cx="420" cy="267" r="17" fill="#76513b"/>'
			elif stage<5: body+='<rect x="200" y="181" width="320" height="164" rx="14" fill="#dbe0b6"/><path d="M230 202H490M230 224H490" stroke="#fbf6df" stroke-width="10"/>'
			else:
				for x in [190,320,450]:
					body+='<path d="M%d 214L%d 195 %d 302 %d 322Z" fill="#ad773c"/><path d="M%d 196L%d 182 %d 287 %d 301Z" fill="#eee2ad"/><path d="M%d 213L%d 279" stroke="#b98943" stroke-width="17"/>'%[x,x+100,x+116,x+16,x,x+100,x+116,x+16,x+38,x+49]
		2:
			if stage<2:
				body+='<path d="M250 240Q360 352 470 240L447 320Q360 366 273 320Z" fill="#81746a"/><path d="M385 190L440 140" stroke="#b6a58c" stroke-width="27" stroke-linecap="round"/>'
				for x in [296,350,402]: body+='<ellipse cx="%d" cy="242" rx="30" ry="15" fill="#c64f36"/>'%x
			else:
				body+='<ellipse cx="435" cy="267" rx="125" ry="83" fill="#efe6bd"/>'
				for n in range(17): body+='<circle cx="%d" cy="%d" r="19" fill="#79513b"/>'%[190+(n*43)%184,220+(n*29)%112]
				if stage>=3: body+='<path d="M190 255L255 215 280 260 337 234" stroke="#bb5037" stroke-width="14" fill="none"/>'
				if stage>=5:
					for n in range(7): body+='<ellipse cx="%d" cy="%d" rx="23" ry="10" transform="rotate(-25 %d %d)" fill="#50804c"/>'%[205+n*24,235+(n%3)*28,205+n*24,235+(n%3)*28]
					body+='<path d="M425 210Q462 174 493 214Q532 225 503 254Q481 290 449 260Q408 260 425 210Z" fill="#fff9e3"/><circle cx="467" cy="235" r="23" fill="#dfa42b"/>'
		3:
			body+='<ellipse cx="360" cy="284" rx="190" ry="105" fill="#724c3d"/>'
			for n in range(90): body+='<path d="M%d %dL%d %d" stroke="#%s" stroke-width="7" stroke-linecap="round"/>'%[210+(n*71)%300,220+(n*29)%120,222+(n*71)%300,222+(n*29)%120,"c87339" if stage>=3 else "e7d6a3"]
			if stage>=2:
				for n in range(10): body+='<rect x="%d" y="%d" width="17" height="14" rx="3" fill="#%s"/>'%[228+(n*37)%260,233+(n*23)%98,"557647" if n%2 else "824835"]
			if stage==4: body+='<ellipse cx="360" cy="236" rx="198" ry="109" fill="#8f9d98" stroke="#485c58" stroke-width="10"/><path d="M320 135H400" stroke="#485c58" stroke-width="18"/>'
	if style==1 and ready:
		var food: String=body.substr(food_start)
		body=body.substr(0,food_start)+'<g transform="translate(40 135) scale(0.5)">'+food+'</g><g transform="translate(320 135) scale(0.5)">'+food+'</g>'
	if not world and not ready:
		for n in range(5): body+='<circle cx="%d" cy="437" r="10" fill="#%s"/>'%[288+n*36,"4d8b7c" if n<stage else "d2bb91"]
	return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">'+body+'</svg>'

func texture(index: int,stage: int,style: int,world: bool) -> Texture2D:
	var key := "%d:%d:%d:%s"%[index,stage,style,world]
	if textures.has(key): return textures[key]
	var image := Image.new()
	if image.load_svg_from_string(artwork(index,stage,style,world))!=OK: return null
	image.generate_mipmaps()
	var tex := ImageTexture.create_from_image(image)
	if textures.size()>=8: textures.erase(textures.keys()[0])
	textures[key]=tex
	return tex

func build_world() -> void:
	for li in range(2):
		var root := Node3D.new(); root.name="SharedMealFood"
		(game.layout_table_node if li==0 else game.layout_floor_node).add_child(root)
		worlds.append(root)
		if li==1:
			var cloth := MeshInstance3D.new(); cloth.name="PortableServingCloth"
			var mesh := BoxMesh.new(); mesh.size=Vector3(2.6,0.015,1.2); cloth.mesh=mesh
			cloth.position=Vector3(-1.9,0.06,0.55); cloth.material_override=game.person_material(Color("d5bd8f")); root.add_child(cloth)
		var row: Array[MeshInstance3D]=[]
		for i in range(4):
			var food := MeshInstance3D.new(); food.name="SharedDish_"+String(DATA.RECIPES[i].id)
			var mesh := QuadMesh.new(); mesh.size=Vector2(0.7,0.4666667); food.mesh=mesh
			food.rotation.x=-PI*0.5
			food.position=Vector3(TABLE_SLOTS[i],0.824,-0.18) if li==0 else Vector3(-2.7+float(i%2)*1.4,0.084,0.3+float(i/2)*0.6)
			var mat: StandardMaterial3D=game.material(Color.WHITE); mat.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
			# Preserve the original illustration's colors on the small serving surface.
			mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
			food.material_override=mat; root.add_child(food); row.append(food)
		dishes.append(row)
	update_world()

func update_world() -> void:
	var visibility_changed := false
	for li in range(worlds.size()):
		var shown: bool=game.block_opened and not shared.is_empty() and game.active_story_episode()==null
		visibility_changed=visibility_changed or worlds[li].visible!=shown
		worlds[li].visible=shown
	var signature: String=JSON.stringify(shared)
	if rendered_world==signature:
		if visibility_changed and game.camera != null: game.update_occlusion(true)
		return
	rendered_world=signature
	for li in range(dishes.size()):
		for i in range(4):
			var food: MeshInstance3D=dishes[li][i]
			food.visible=shared.has(i)
			if not food.visible: continue
			var result: Dictionary=shared[i]
			food.material_override.albedo_texture=texture(i,5,int(result.serving),true)
			var other: bool=int(result.placement)==1
			# The table's other edge needs an x clearance from the existing cups/pot.
			food.position.x=(TABLE_SLOTS[i] if li==0 else -2.7+float(i%2)*1.4)+((0.11 if li==0 else 0.20) if other else 0.0)
			food.position.z=(-0.18 if not other else 0.15) if li==0 else 0.3+float(i/2)*0.6+(-0.07 if other else 0.0)
	if game.camera != null: game.update_occlusion(true)

func cutaway_points() -> Array[Vector2]:
	var points: Array[Vector2]=[]
	for li in range(dishes.size()):
		for food in dishes[li]:
			if food.is_visible_in_tree(): points.append(Vector2(food.global_position.x,food.global_position.z))
	return points

func snapshot() -> Dictionary:
	var all_buttons: Array[Button]=[previous,next,prepare]
	all_buttons.append_array(serving_buttons); all_buttons.append_array(placement_buttons)
	all_buttons.append_array([share,explore])
	var controls: Array=game.activity_detail_snapshot(reader,tray,all_buttons).buttons
	var world: Array=[]
	for li in range(dishes.size()):
		var food_state: Array=[]
		for i in range(4):
			var food: MeshInstance3D=dishes[li][i]
			var pos: Vector2=game.camera.unproject_position(food.global_position)
			var bounds := Rect2(pos,Vector2.ZERO)
			for corner in range(8): bounds=bounds.expand(game.camera.unproject_position(food.to_global(food.mesh.get_aabb().get_endpoint(corner))))
			food_state.append({"id":String(DATA.RECIPES[i].id),"visible":food.is_visible_in_tree(),"x":pos.x,"y":pos.y,"bounds":game.rect_snapshot(bounds),"local_x":food.position.x,"local_y":food.position.y,"local_z":food.position.z})
		world.append(food_state)
	return {"visible":visible,"available":available(),"selected":selected,"revealed":revealed,"invitation":invitation,"follow_target":follow_target(),"steps":steps.duplicate(),"servings":servings.duplicate(),"placements":placements.duplicate(),"shared":shared.duplicate(true),"text":reader.text,"font_size":reader.get_theme_font_size("normal_font_size"),"reader":game.control_snapshot(reader),"scroll_value":reader.get_v_scroll_bar().value,"scroll_max":reader.get_v_scroll_bar().max_value,"scroll_page":reader.get_v_scroll_bar().page,"heading":heading.text,"art_description":picture.accessibility_name,"picture":game.control_snapshot(picture),"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"buttons":controls,"world":world,"layout_pending":layout_pending,"texture_cache":textures.size(),"focus_within":is_ancestor_of(get_viewport().gui_get_focus_owner()) if get_viewport().gui_get_focus_owner()!=null else false}

func _process(delta: float) -> void:
	update_world()
	if not visible: return
	if not available(): close_meal(false); return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	snapshot_clock-=delta
	if snapshot_clock<=0:
		snapshot_clock=0.2; game.sync_web_a11y_status()
