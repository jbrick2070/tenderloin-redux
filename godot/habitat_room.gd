extends Control
## An authored speculative room of copies. Assignment and welcome last this visit.
const COPIES := preload("res://hosted_afternoon.gd")
const ITEMS := ["art","film","seats"]
const TITLES := ["Art","Film","Seats"]
const PLACES := ["entry","window","wall","side"]
const NAMES := ["Entry","Window","Far wall","Side nook"]
const SPOTS := [Vector2(42,258),Vector2(422,30),Vector2(42,30),Vector2(422,258)]
var game: Node
var top: PanelContainer
var tray: PanelContainer
var picture: TextureRect
var reader: RichTextLabel
var items: Array[Button]=[]
var places: Array[Button]=[]
var labels: Array[Label]=[]
var assist: Button
var detail: Button
var back: Button
var assigned: Dictionary={}
var selected := 0
var destination := 0
var complete := false
var inspecting := false
var last_place := -1
var saved_visibility: Dictionary={}
var return_focus: Control
var held_on_exit: Array[Key]=[]
var layout_pending := false
var clock := 0.0
var textures: Dictionary={}
var art_rect := Rect2()

func setup(owner_game: Node) -> void:
	game=owner_game; name="HabitatRoom"; z_index=106
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter=Control.MOUSE_FILTER_STOP
	var shade := ColorRect.new(); shade.color=Color("182c38"); shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); shade.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(shade)
	top=frame(); var titles := VBoxContainer.new(); top.add_child(titles)
	var title := Label.new(); title.text="Tenderloin to the Stars | A room for one more"; title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; title.add_theme_font_size_override("font_size",18); titles.add_child(title)
	var credit := Label.new(); credit.text="Speculative room model | Copies | This visit only"; credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; credit.add_theme_font_size_override("font_size",12); titles.add_child(credit)
	picture=TextureRect.new(); picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED; picture.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(picture)
	for place in NAMES:
		var label := Label.new(); label.text=place; label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; label.add_theme_font_size_override("font_size",12); label.add_theme_color_override("font_color",Color("fff2d7")); label.mouse_filter=Control.MOUSE_FILTER_IGNORE; labels.append(label); add_child(label)
	tray=frame(); var box := VBoxContainer.new(); box.add_theme_constant_override("separation",4); tray.add_child(box)
	reader=game.make_activity_detail(); reader.add_theme_font_size_override("normal_font_size",16); box.add_child(reader)
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation",4); box.add_child(row)
	for i in range(3):
		var index := i; items.append(button(row,TITLES[i],func(): choose_item(index))); items[i].toggle_mode=true
	row=HBoxContainer.new(); row.add_theme_constant_override("separation",4); box.add_child(row)
	for i in range(4):
		var index := i; places.append(button(row,NAMES[i],func(): choose_place(index))); places[i].toggle_mode=true
	row=HBoxContainer.new(); row.add_theme_constant_override("separation",4); box.add_child(row)
	assist=button(row,"Ask helper",carry_or_welcome); detail=button(row,"View detail",toggle_detail)
	back=button(box,"Keep exploring",close_room)
	resized.connect(queue_layout); top.minimum_size_changed.connect(queue_layout); tray.minimum_size_changed.connect(queue_layout); hide()

func frame() -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(p); return p

func button(parent: Node,text: String,callback: Callable) -> Button:
	var b := Button.new(); b.text=text; b.custom_minimum_size=Vector2(44,44); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; b.add_theme_font_size_override("font_size",13); game.style_game_button(b)
	for state in ["normal","hover","pressed","hover_pressed"]:
		var style: StyleBox=b.get_theme_stylebox(state).duplicate(); style.content_margin_left=2; style.content_margin_right=2; b.add_theme_stylebox_override(state,style)
	b.pressed.connect(callback); parent.add_child(b); return b

func copies() -> Dictionary:
	var result := {}
	for id in ["art","pause","beats"]:
		var copy: Dictionary=COPIES.copied(game,id)
		if not copy.valid: return {}
		result[id]=copy.value
	if game.film_phase!="done" or not game.is_valid_film_plan(game.film_result) or game.civic_phase!="done" or not game.is_valid_civic_plan(game.civic_result): return {}
	result.film=game.film_result.duplicate(true); result.civic=game.civic_result.duplicate(true); return result

func available() -> bool:
	return not copies().is_empty()

func can_open(caller: Control=null) -> bool:
	if not available() or game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.active_story_episode()!=null: return false
	if not game.is_focused_activity_visible(): return true
	if caller!=game.helper_bench or not caller.visible: return false
	# The bench owns this layer and hid its siblings. Refuse another owner
	# before closing the caller, rather than relying on a blocked fallback.
	for control in get_parent().get_children():
		if control is Control and control!=caller and control.visible: return false
	return true

func open_room() -> bool:
	if visible: return true
	if not can_open():
		game.announce_a11y_status("Finish your film and arriving, then close the current activity before arranging the habitat copies."); return false
	return_focus=get_viewport().gui_get_focus_owner(); saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	game.cancel_map_pinch(); game.close_phone_disclosure(); game.pointer_active=false; game.orbit_dragging=false
	show()
	for c in saved_visibility: c.visible=false
	refresh(true); fit_layout(); items[selected].grab_focus(); return true

func close_room(announce: bool=true) -> void:
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
	if announce: game.announce_a11y_status("Back to the block. Your room arrangement stays this visit. Watch your film, then open the helper bench to revisit. Reload or successful import starts a fresh arrangement; your film keeps the invitation.")

func reset_visit() -> void:
	close_room(false); assigned.clear(); selected=0; destination=0; complete=false; inspecting=false; last_place=-1; textures.clear()

func release_pending() -> bool:
	for i in range(held_on_exit.size()-1,-1,-1):
		if not Input.is_key_pressed(held_on_exit[i]) and not Input.is_physical_key_pressed(held_on_exit[i]): held_on_exit.remove_at(i)
	return not held_on_exit.is_empty()

func composition() -> Dictionary:
	return assigned.duplicate(true)

func place_of(id: String) -> int:
	for i in range(4):
		if assigned.get(PLACES[i],"")==id: return i
	return -1

func choose_item(index: int) -> void:
	if not visible or not available() or index<0 or index>=3: return
	selected=index; var at := place_of(ITEMS[index])
	if at>=0: destination=at
	else:
		for i in range(4):
			if not assigned.has(PLACES[i]): destination=i; break
	refresh(true)

func choose_place(index: int) -> void:
	if not visible or not available() or index<0 or index>=4: return
	if assigned.has(PLACES[index]) and assigned[PLACES[index]]!=ITEMS[selected]: return
	destination=index; refresh(true)

func can_carry() -> bool:
	return not assigned.has(PLACES[destination])

func carry_or_welcome() -> void:
	if not visible or not available(): return
	if can_carry():
		var old := place_of(ITEMS[selected])
		if old>=0: assigned.erase(PLACES[old])
		assigned[PLACES[destination]]=ITEMS[selected]; complete=false; last_place=destination; inspecting=false
	elif assigned.size()==3 and not complete: complete=true; inspecting=false
	else: return
	refresh(true)
	if assigned.size()<3: items[(selected+1)%3].grab_focus()
	elif not complete: assist.grab_focus()
	else: back.grab_focus()

func toggle_detail() -> void:
	if not visible or not available(): return
	inspecting=not inspecting; refresh(true)

func item_name(place: String) -> String:
	return TITLES[ITEMS.find(assigned[place])] if assigned.has(place) else "open place"

func helper_anchor() -> Vector2:
	# Same-size glyph, parked beside the corresponding side of the bay.
	# Including strokes: x304..416, y26.5..99; passage begins at y100.
	return [Vector2(331,59),Vector2(389,45),Vector2(331,45),Vector2(389,59)][last_place] if last_place>=0 else Vector2(360,46)

func description() -> String:
	var parts: Array[String]=[]
	for i in range(4): parts.append(NAMES[i]+": "+item_name(PLACES[i]))
	return ("Room welcomed. " if complete else "%d of 3 copies placed. "%assigned.size())+"; ".join(parts)+". The central passage stays clear."

func refresh(announce: bool) -> void:
	if not visible or not available(): return
	var c := copies(); var body := "Thanh: Let us arrange copies in a shared room we imagine visiting together. Choose Art, Film or Seats, choose an empty place, then ask our helper to carry. Leave a place open for someone else.\nSuggested arrangement, not a remembered choice: art by Entry, seats by Window, film at Far wall. You decide."
	if not assigned.is_empty(): body="Thanh: %s Choose another copy or move one into the open place. Our helper waits for your instruction."%description()
	if assigned.size()==3 and not complete: body="Thanh: All three copies have a place. You can rearrange them through the spare place, or deliberately welcome me to the room."
	if complete:
		var spare := ""
		for i in range(4):
			if not assigned.has(PLACES[i]): spare=NAMES[i].to_lower()
		body='Thanh: "You left the %s open. Our %s has room to pause, and the middle stays clear."\nCeleste: "Our six shapes are by %s, in their original %s colors."\nDez: "Our film is by %s, ending on %s. The originals stay on the block."'%[spare,"open arc" if c.pause=="arc" else "pair and open seat",NAMES[place_of("art")].to_lower(),c.art.palette,NAMES[place_of("film")].to_lower(),game.film_shot_title(String(c.film.order[2])).to_lower()]
	body+="\n"+description()+"\nSelected: "+TITLES[selected]+" for "+NAMES[destination]+". View detail enlarges the selected copy; it does not place it."
	body+="\nCopied seats: %s. Listening Hour format: %s. Copied rhythm: %s. No personal stories or meeting notes are pictured."%[game.quiet_seats.TITLES[c.pause],game.CIVIC_FORMAT_LABELS[c.civic.format],"listening only, no marked beats" if int(c.beats)==0 else "the original marked slots, shown silently"]
	body+="\nThis is a speculative room model, not a walkable habitat or certified access plan. Copies travel in our imagination; originals, borrowed things and home stay on the block. Departure, orbit and return are still to come. Show room returns from a detail; Escape or Keep returns to the block from either view. This arrangement lasts this visit only; reload or successful load/import starts it fresh. Your completed film keeps this invitation. Quiet, saved work and the street camera stay yours."
	game.set_activity_detail(reader,body); picture.texture=texture(c); picture.accessibility_name=("Detail of "+TITLES[selected]+". " if inspecting else "Room model. ")+description()
	for i in range(3):
		items[i].text=TITLES[i]+(" +" if place_of(ITEMS[i])>=0 else ""); items[i].set_pressed_no_signal(selected==i); items[i].accessibility_name=TITLES[i]+(" placed" if place_of(ITEMS[i])>=0 else " unplaced")
	for i in range(4):
		places[i].disabled=assigned.has(PLACES[i]) and assigned[PLACES[i]]!=ITEMS[selected]; places[i].set_pressed_no_signal(destination==i); places[i].accessibility_name=NAMES[i]+": "+item_name(PLACES[i])
	assist.text="Ask helper" if can_carry() or assigned.size()<3 else ("Room welcomed" if complete else "Welcome Thanh")
	assist.disabled=not can_carry() and (assigned.size()!=3 or complete); detail.text="Show room" if inspecting else "View detail"
	var ring: Array[Control]=[reader]
	for b in items+places+[assist,detail,back]:
		if not b.disabled: ring.append(b)
	for i in range(ring.size()): ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()]); ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	queue_layout()
	if announce: game.announce_a11y_status(body)

func module_svg(id: String,c: Dictionary) -> String:
	if id=="art": return game.build_tile_panel_svg(c.art)
	if id=="film":
		var frames := ""
		for i in range(3): frames+='<g transform="translate(6 %d) scale(.5)">%s</g>'%[6+i*122,svg_body(game.build_film_frame_svg(c.film,String(c.film.order[i])))]
		return '<svg xmlns="http://www.w3.org/2000/svg" width="222" height="372" viewBox="0 0 222 372"><rect width="222" height="372" rx="7" fill="#29434a"/>'+frames+'</svg>'
	var s := '<rect width="360" height="240" rx="20" fill="#e7dcc0"/>'
	s+='<ellipse cx="180" cy="123" rx="108" ry="82" fill="#b7d0c1"/>' if c.civic.format=="circle" else '<rect x="102" y="74" width="156" height="65" rx="10" fill="#b88051" stroke="#29434a" stroke-width="5"/>'
	var positions := [Vector2(70,145),Vector2(150,65),Vector2(250,145)] if c.pause=="arc" else [Vector2(70,70),Vector2(70,145),Vector2(250,145)]
	for i in range(3):
		var p: Vector2=positions[i]; s+='<rect x="%f" y="%f" width="40" height="38" rx="9" fill="%s" stroke="#29434a" stroke-width="5"/>'%[p.x,p.y,"#e8b861" if i==2 else "#548b84"]
	return '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">'+s+'</svg>'

func svg_body(source: String) -> String:
	# Keep one root viewport: nested SVG viewports can lose outer transforms.
	var start := source.find(">")+1
	return source.substr(start,source.rfind("</svg>")-start)

func texture(c: Dictionary) -> Texture2D:
	var key := JSON.stringify([c,selected] if inspecting else [c,assigned,destination,complete,last_place])
	if textures.has(key): return textures[key]
	var svg := ""
	if inspecting: svg=module_svg(ITEMS[selected],c)
	else:
		svg='<rect width="720" height="480" rx="22" fill="#e7dcc0"/><path d="M18 464V18H702V464M318 464H402" stroke="#29434a" stroke-width="14" fill="none"/><path d="M330 470V100H390V470" fill="#f8f0d9"/><rect x="462" y="7" width="140" height="17" fill="#7eb8bc"/>'
		for i in range(4):
			var p: Vector2=SPOTS[i]; var id: String=assigned.get(PLACES[i],"")
			svg+='<rect x="%f" y="%f" width="256" height="190" rx="14" fill="#29434a" stroke="%s" stroke-width="%d"/>'%[p.x,p.y,"#c88436" if i==destination else "#687c76",6 if i==destination else 2]
			if not id.is_empty():
				var scale := 0.4 if id=="film" else 0.62
				var width := 222 if id=="film" else 360; var height := 372 if id=="film" else 240
				svg+='<g transform="translate(%f %f) scale(%f)">%s</g>'%[p.x+(256-width*scale)/2,p.y+30+(154-height*scale)/2,scale,svg_body(module_svg(id,c))]
			else: svg+='<path d="M%f %fH%fM%f %fV%f" stroke="#a6b9aa" stroke-width="6"/>'%[p.x+98,p.y+106,p.x+158,p.x+128,p.y+76,p.y+136]
		for i in range(8): svg+='<rect x="%d" y="457" width="20" height="8" rx="3" fill="%s"/>'%[45+i*28,"#29434a" if int(c.beats)&(1<<i) else "#c9bea5"]
		var parked := helper_anchor()
		svg+='<g transform="translate(%f %f)"><circle cx="-15" cy="31" r="9" fill="#29434a"/><circle cx="15" cy="31" r="9" fill="#29434a"/><rect x="-25" y="0" width="50" height="38" rx="9" fill="#da9e49" stroke="#29434a" stroke-width="4"/><rect x="-18" y="-17" width="36" height="21" rx="8" fill="#5f9c92" stroke="#29434a" stroke-width="3"/></g>'%[parked.x,parked.y]
		if complete: svg+='<path d="M342 425L355 439L381 404" stroke="#29434a" stroke-width="9" fill="none"/>'
		svg='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">'+svg+'</svg>'
	var image := Image.new()
	if image.load_svg_from_string(svg)!=OK: return null
	var tex := ImageTexture.create_from_image(image)
	if textures.size()>=4: textures.erase(textures.keys()[0])
	textures[key]=tex; return tex

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true; fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size(); var side: bool=vp.x>=520 and vp.y<500; var width: float=minf(960,vp.x-12)
	top.size=Vector2(vp.x-298 if side else width,0); top.size.y=top.get_combined_minimum_size().y; top.position=Vector2(6 if side else (vp.x-width)*0.5,6)
	reader.custom_minimum_size.y=64 if side else 112
	tray.size=Vector2(280 if side else width,0); tray.size.y=tray.get_combined_minimum_size().y; tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	picture.position=Vector2(6 if side else (vp.x-width)*0.5,top.position.y+top.size.y+6); picture.size=Vector2(maxf(1,tray.position.x-12) if side else width,maxf(1,(vp.y-6 if side else tray.position.y-6)-picture.position.y))
	var tex_size: Vector2=picture.texture.get_size() if picture.texture!=null else Vector2(720,480); var scale := minf(picture.size.x/tex_size.x,picture.size.y/tex_size.y)
	art_rect=Rect2(picture.position+(picture.size-tex_size*scale)*0.5,tex_size*scale)
	for i in range(4): labels[i].visible=not inspecting; labels[i].position=art_rect.position+(SPOTS[i]+Vector2(4,3))*scale; labels[i].size=Vector2(248*scale,20)
	game.sync_web_a11y_status()

func handle_input(event: InputEvent) -> void:
	if not visible or not event is InputEventKey or not event.pressed: return
	var key: Key=event.keycode if event.keycode!=KEY_NONE else event.physical_keycode
	if key==KEY_ESCAPE and not event.echo: close_room(); get_viewport().set_input_as_handled(); return
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
	var result := {"visible":visible,"available":available(),"assigned":composition(),"complete":complete,"selected":selected,"destination":destination,"detail":inspecting,"release_pending":not held_on_exit.is_empty(),"layout_pending":layout_pending}
	var focus: Control=get_viewport().gui_get_focus_owner()
	result["focus_owner"]=str(focus.get_path()) if is_instance_valid(focus) and focus.is_visible_in_tree() else ""
	result["film_focus"]=game.block_film_btn.has_focus()
	if not visible: return result
	var anchor := helper_anchor(); var scale := art_rect.size.x/720.0
	result["helper_rect"]=game.rect_snapshot(Rect2(art_rect.position+(anchor+Vector2(-27,-18.5))*scale,Vector2(54,58.5)*scale))
	result["helper_visible"]=not inspecting
	var buttons: Array[Button]=[]; buttons.append_array(items); buttons.append_array(places); buttons.append_array([assist,detail,back])
	result.merge({"buttons":game.activity_detail_snapshot(reader,tray,buttons).buttons,"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"picture":game.control_snapshot(picture),"art":game.rect_snapshot(art_rect),"reader":game.control_snapshot(reader),"text":reader.text,"description":description(),"copies":copies(),"scroll":reader.get_v_scroll_bar().value,"scroll_max":maxf(0,reader.get_v_scroll_bar().max_value-reader.get_v_scroll_bar().page),"focus_within":is_ancestor_of(get_viewport().gui_get_focus_owner()) if get_viewport().gui_get_focus_owner()!=null else false})
	return result

func _process(delta: float) -> void:
	if not visible: return
	if not available(): close_room(false); return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	clock+=delta
	if clock>=0.2: clock=0; game.sync_web_a11y_status()
