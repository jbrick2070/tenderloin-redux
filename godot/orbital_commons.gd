extends Control
## Visit-local walking in a fictional future. This child never owns the street.
const DESTINATIONS := [Vector2(154,310),Vector2(562,330),Vector2(360,390)]
const DISPLAY_RECTS := [Rect2(36,106,214,143),Rect2(526,55,130,218),Rect2(280,103,180,120)]
const JUNCTION := Vector2(360,350)
const ENTRY := Vector2(360,438)
var room: Control
var game: Node
var top: PanelContainer
var tray: PanelContainer
var reader: RichTextLabel
var destinations: Array[Button]=[]
var invite: Button
var stop: Button
var back: Button
var pause: Button
var orbital_copies: Dictionary={}
var copy_textures: Array[Texture2D]=[]
var invitation_title := ""
var invitation_colors: Array=[]
var player := ENTRY
var thanh := Vector2(432,350)
var player_path: Array[Vector2]=[]
var thanh_path: Array[Vector2]=[]
var target := -1
var reached := -1
var sharing := -1
var shared := -1
var started := false
var notice := ""
var art_rect := Rect2()
var layout_pending := false
var pointer_start := Vector2.ZERO
var pointer_id := -2
var copy_rasterizations := 0
var web_lifecycle = null

func setup(owner_room: Control) -> void:
	room=owner_room; game=room.game; name="OrbitalCommons"
	if OS.has_feature("web"):
		JavaScriptBridge.eval("""if (!window.__tenderloinOrbitalLifecycle) {
window.__tenderloinOrbitalLifecycle = true; window.__tenderloinOrbitalStopPending = false;
window.addEventListener('blur', function() { window.__tenderloinOrbitalStopPending = true; });
window.addEventListener('pagehide', function() { window.__tenderloinOrbitalStopPending = true; });
document.addEventListener('visibilitychange', function() { if (document.hidden) window.__tenderloinOrbitalStopPending = true; });
}""",true)
		web_lifecycle=JavaScriptBridge.get_interface("window")
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter=Control.MOUSE_FILTER_STOP
	top=frame(); var heading := Label.new(); heading.text="Tenderloin to the Stars | Walk the commons\nSpeculative future chapter | Copies | This visit only"; heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; heading.add_theme_font_size_override("font_size",16); top.add_child(heading)
	tray=frame(); var box := VBoxContainer.new(); box.add_theme_constant_override("separation",4); tray.add_child(box)
	reader=game.make_activity_detail(); reader.add_theme_font_size_override("normal_font_size",16); box.add_child(reader)
	reader.focus_entered.connect(func(): halt(false))
	reader.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton or event is InputEventScreenTouch or event is InputEventScreenDrag: halt(false))
	reader.get_v_scroll_bar().focus_entered.connect(func(): halt(false))
	reader.get_v_scroll_bar().gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton or event is InputEventScreenTouch or event is InputEventScreenDrag: halt(false))
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation",4); box.add_child(row)
	for i in range(3):
		var index := i; destinations.append(room.button(row,"Walk to "+room.TITLES[i],func(): walk_to(index)))
	row=HBoxContainer.new(); row.add_theme_constant_override("separation",4); box.add_child(row)
	invite=room.button(row,"Invite Thanh",invite_thanh); stop=room.button(row,"Stop",func(): halt(true))
	row=HBoxContainer.new(); row.add_theme_constant_override("separation",4); box.add_child(row)
	back=room.button(row,"Back to departure",back_to_departure); pause=room.button(row,"Pause chapter",pause_chapter)
	resized.connect(queue_layout); top.minimum_size_changed.connect(queue_layout); tray.minimum_size_changed.connect(queue_layout)
	hide()

func frame() -> PanelContainer:
	var node := PanelContainer.new(); node.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(node); return node

func reset_visit() -> void:
	halt(false); hide(); started=false; orbital_copies.clear(); copy_textures.clear(); invitation_colors.clear(); invitation_title=""; player=ENTRY; thanh=Vector2(432,350); target=-1; reached=-1; shared=-1; notice=""; copy_rasterizations=0

func open_chapter() -> bool:
	if not room.visible or not room.available() or not room.complete or room.mode!="depart" or room.panel!=2 or not room.departure_ready or not room.invitation().valid: return false
	if not started:
		var prepared: Dictionary=room.copies().duplicate(true)
		var textures: Array[Texture2D]=[]
		for id in room.ITEMS:
			var bitmap := Image.new()
			if bitmap.load_svg_from_string(room.module_svg(id,prepared))!=OK: return false
			textures.append(ImageTexture.create_from_image(bitmap))
		orbital_copies=prepared; copy_textures=textures; copy_rasterizations=3
		invitation_title=game.bea_invitation.TITLES[room.invitation().value]
		invitation_colors=game.bea_invitation.PAPER_COLORS[room.invitation().value].duplicate()
		started=true
	halt(false); show(); room.refresh(false); fit_layout(); refresh(true); reader.grab_focus(); return true

func moving() -> bool:
	return not player_path.is_empty() or not thanh_path.is_empty()

func halt(announce: bool) -> void:
	var was_moving := moving(); var resident_moving := not thanh_path.is_empty()
	player_path.clear(); thanh_path.clear(); sharing=-1; pointer_id=-2
	if was_moving: notice="Thanh paused on the path. Invite him again when you want to continue." if resident_moving else "Stopped here. Choose a place to walk again; nobody moves while you read."
	if was_moving and is_instance_valid(reader) and is_visible_in_tree() and started: refresh(announce,true)

func back_to_departure() -> void:
	halt(false); hide(); room.refresh(true); room.fit_layout(); room.focus_step()

func pause_chapter() -> void:
	halt(false); room.close_room()

func route(from: Vector2,to: Vector2) -> Array[Vector2]:
	# Authored clear paths stay below the displays; a destination is never a teleport.
	var result: Array[Vector2]=[]
	if from.distance_to(to)<1: return result
	for end in [ENTRY]+DESTINATIONS+[DESTINATIONS[0]+Vector2(42,10),DESTINATIONS[1]+Vector2(42,10),DESTINATIONS[2]+Vector2(42,10),Vector2(432,350)]:
		if Geometry2D.get_closest_point_to_segment(from,JUNCTION,end).distance_to(from)<1 and Geometry2D.get_closest_point_to_segment(to,JUNCTION,end).distance_to(to)<1:
			result.append(to); return result
	if from.distance_to(JUNCTION)>1: result.append(JUNCTION)
	if to.distance_to(JUNCTION)>1: result.append(to)
	return result

func walk_to(index: int) -> void:
	if not is_visible_in_tree() or not started or index<0 or index>2: return
	if target==index and not player_path.is_empty(): return
	halt(false); target=index
	if player.distance_to(DESTINATIONS[index])<1:
		reached=index; notice="You are by "+room.TITLES[index]+". Invite Thanh when you want to share this view."
	else:
		reached=-1; player_path=route(player,DESTINATIONS[index]); notice="Walking to "+room.TITLES[index]+". Stop or focus the reading panel to pause. Arrival does not invite anyone."
	refresh(true)

func invite_thanh() -> void:
	if not is_visible_in_tree() or reached<0 or moving() or shared==reached: return
	sharing=reached; shared=-1
	var place: Vector2=DESTINATIONS[reached]+Vector2(42,10)
	thanh_path=route(thanh,place); notice="Thanh: I will join you by "+room.TITLES[reached]+". You chose what to share; we can take our time."
	if thanh_path.is_empty(): shared=sharing; sharing=-1; notice="Thanh is already beside this view. You chose to share it together."
	refresh(true)

func response() -> String:
	if shared<0: return "Thanh waits on the path. Choose what you want to share with him."
	if shared==0: return "Thanh: You brought me to Celeste's six shapes. We can look at the spaces between them together. Celeste: These are our original "+String(orbital_copies.art.palette)+" colors and arrangement; nothing has been repainted."
	if shared==1: return "Thanh: You brought me to our film. I can follow its three pictures at my own pace. Dez: Our copied film ends on "+game.film_shot_title(String(orbital_copies.film.order[2])).to_lower()+", with its original order and framing. "+("We listen without marked beats." if int(orbital_copies.beats)==0 else "Our eight rhythm slots are shown silently.")
	return "Thanh: You chose a place to pause together: "+String(game.quiet_seats.TITLES[orbital_copies.pause])+". Our "+String(game.CIVIC_FORMAT_LABELS[orbital_copies.civic.format])+" Listening Hour has room for another neighbor. Bea: We keep the invitation open; this shared moment does not start the final gathering."

func refresh(announce: bool,preserve_scroll := false) -> void:
	if not started or not is_visible_in_tree(): return
	var old_focus: Control=get_viewport().gui_get_focus_owner(); var old_scroll: float=reader.get_v_scroll_bar().value
	var body := "You are in the commons of a fictional orbital neighborhood. The yellow traveler is you; Thanh wears gold, Celeste rose, Dez purple with headphones, and Bea has her rollator. Art, Film and Seats are places you can walk to in any order. Choose a walking button or a marked floor destination. When you arrive, Invite Thanh is a separate choice.\n"+notice+"\n"+response()
	if shared>=0: body=response()+"\n"+notice+"\nWalk to another view whenever you like. The yellow traveler is you; the originals remain at home."
	body+="\nBea's copied invitation: "+invitation_title+". The original six shapes, three film pictures, seats and Listening Hour format travel as copies. "+("Listening only: no marked beats." if int(orbital_copies.beats)==0 else "The original rhythm is pictured silently.")+" No personal story or meeting notes are shown.\nStop, reading, Back and Pause stop local movement. Back reviews the departure; Pause/Escape returns to today's block while this fictional chapter waits for this visit. That is not the later authored return-home journey. Revisit through your film and room. Moving a room copy starts this chapter fresh. Reload or successful load/import clears this visit's walking and shared view; your completed film keeps the invitation, and you arrange and prepare again. No automatic reconstruction. The final gathering and authored return are still to come. The street camera, Music and Sounds remain yours."
	game.set_activity_detail(reader,body)
	if preserve_scroll: reader.get_v_scroll_bar().value=old_scroll
	invite.disabled=reached<0 or moving() or shared==reached; stop.disabled=not moving()
	for i in range(3): destinations[i].accessibility_name="Walk to "+room.TITLES[i]+(". You are here." if reached==i else "")
	var ring: Array[Control]=[reader]
	for b in destinations+[invite,stop,back,pause]:
		if not b.disabled: ring.append(b)
	for i in range(ring.size()): ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()]); ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	if (old_focus==invite and invite.disabled) or (old_focus==stop and stop.disabled):
		if moving(): stop.grab_focus()
		elif not invite.disabled: invite.grab_focus()
		else: destinations[maxi(0,reached)].grab_focus()
	queue_layout(); queue_redraw()
	if announce: game.announce_a11y_status(response() if shared>=0 and not moving() else notice)

func queue_layout() -> void:
	if not is_visible_in_tree() or layout_pending: return
	layout_pending=true; fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not is_visible_in_tree(): return
	var vp: Vector2=game.bubble_viewport_size(); var side: bool=vp.x>=520 and vp.y<500; var width: float=minf(960,vp.x-12)
	top.size=Vector2(vp.x-298 if side else width,0); top.size.y=top.get_combined_minimum_size().y; top.position=Vector2(6 if side else (vp.x-width)*0.5,6)
	reader.custom_minimum_size.y=64 if side else 112
	tray.size=Vector2(280 if side else width,0); tray.size.y=tray.get_combined_minimum_size().y; tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	var origin := Vector2(6 if side else (vp.x-width)*0.5,top.position.y+top.size.y+6)
	var area := Vector2(maxf(1,tray.position.x-12) if side else width,maxf(1,(vp.y-6 if side else tray.position.y-6)-origin.y))
	var scale := minf(area.x/720.0,area.y/480.0); art_rect=Rect2(origin+(area-Vector2(720,480)*scale)*0.5,Vector2(720,480)*scale)
	queue_redraw(); game.sync_web_a11y_status()

func target_rect(index: int) -> Rect2:
	var center: Vector2=art_rect.position+DESTINATIONS[index]*(art_rect.size.x/720.0)
	return Rect2(center-Vector2(22,22),Vector2(44,44))

func tap(at: Vector2) -> void:
	for i in range(3):
		if target_rect(i).has_point(at): destinations[i].grab_focus(); walk_to(i); return

func _gui_input(event: InputEvent) -> void:
	if not is_visible_in_tree(): return
	if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		if event.pressed: pointer_start=event.position; pointer_id=-1
		else:
			var valid: bool=pointer_id==-1 and pointer_start.distance_to(event.position)<=8
			pointer_id=-2
			if valid: tap(event.position)
		accept_event()
	elif event is InputEventMouseMotion and pointer_id==-1:
		if pointer_start.distance_to(event.position)>8: pointer_id=-2
		accept_event()
	elif event is InputEventScreenTouch:
		if event.pressed and pointer_id==-2: pointer_start=event.position; pointer_id=event.index
		elif not event.pressed and pointer_id==event.index:
			var valid: bool=not event.canceled and pointer_start.distance_to(event.position)<=8; pointer_id=-2
			if valid: tap(event.position)
		accept_event()
	elif event is InputEventScreenDrag and pointer_id==event.index:
		if pointer_start.distance_to(event.position)>8: pointer_id=-2
		accept_event()

func handle_input(event: InputEventKey) -> void:
	if not event.pressed: return
	var key: Key=event.keycode if event.keycode!=KEY_NONE else event.physical_keycode
	if key==KEY_ESCAPE and not event.echo: pause_chapter(); get_viewport().set_input_as_handled(); return
	if key in [KEY_PAGEUP,KEY_PAGEDOWN,KEY_HOME,KEY_END] or (reader.has_focus() and key in [KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT]):
		halt(false); reader.grab_focus(); var bar := reader.get_v_scroll_bar()
		match key:
			KEY_HOME: bar.value=0
			KEY_END: bar.value=bar.max_value
			KEY_PAGEUP: bar.value-=bar.page*0.9
			KEY_PAGEDOWN: bar.value+=bar.page*0.9
			KEY_UP: bar.value-=24
			KEY_DOWN: bar.value+=24
		get_viewport().set_input_as_handled()

func _notification(what: int) -> void:
	if what in [NOTIFICATION_APPLICATION_FOCUS_OUT,NOTIFICATION_APPLICATION_PAUSED,NOTIFICATION_WM_WINDOW_FOCUS_OUT]: halt(false)

func _process(delta: float) -> void:
	if web_lifecycle!=null and bool(web_lifecycle.__tenderloinOrbitalStopPending):
		web_lifecycle.__tenderloinOrbitalStopPending=false; halt(false)
	if not is_visible_in_tree() or not started:
		if moving(): halt(false)
		return
	var distance := minf(delta,0.05)*135.0
	if not player_path.is_empty():
		player=player.move_toward(player_path[0],distance)
		if player.distance_to(player_path[0])<0.1: player_path.pop_front()
		if player_path.is_empty(): reached=target; notice="You reached "+room.TITLES[reached]+". Invite Thanh to share this view, or walk somewhere else."; refresh(true)
		queue_redraw()
	if not thanh_path.is_empty():
		thanh=thanh.move_toward(thanh_path[0],distance*0.8)
		if thanh.distance_to(thanh_path[0])<0.1: thanh_path.pop_front()
		if thanh_path.is_empty(): shared=sharing; sharing=-1; notice="Thanh has joined you. This shared view stays this visit; you can choose another place together."; refresh(true)
		queue_redraw()

func person(at: Vector2,coat: String,skin: String,hair: String,kind: String="") -> void:
	var prop: float=maxf(4,1.6/(art_rect.size.x/720.0))
	draw_circle(at+Vector2(0,2),13,Color("29434a")); draw_line(at+Vector2(-5,-4),at+Vector2(-6,3),Color("29434a"),5); draw_line(at+Vector2(5,-4),at+Vector2(6,3),Color("29434a"),5)
	draw_circle(at+Vector2(0,-20),11,Color(coat)); draw_rect(Rect2(at+Vector2(-11,-20),Vector2(22,18)),Color(coat))
	draw_circle(at+Vector2(0,-34),10,Color(skin)); draw_arc(at+Vector2(0,-36),9,PI,TAU,12,Color(hair),5)
	if kind=="headphones": draw_arc(at+Vector2(0,-34),13,PI,TAU,12,Color("182c38"),prop); draw_circle(at+Vector2(-12,-33),prop,Color("182c38")); draw_circle(at+Vector2(12,-33),prop,Color("182c38"))
	if kind=="rollator":
		draw_polyline(PackedVector2Array([at+Vector2(-19,-12),at+Vector2(-19,13),at+Vector2(19,13),at+Vector2(19,-12)]),Color("c7ded6"),prop); draw_line(at+Vector2(-19,-10),at+Vector2(19,-10),Color("c7ded6"),prop); draw_circle(at+Vector2(-19,15),5,Color("182c38")); draw_circle(at+Vector2(19,15),5,Color("182c38"))

func _draw() -> void:
	if not started or not is_visible_in_tree() or art_rect.size.x<=0: return
	draw_rect(Rect2(Vector2.ZERO,size),Color("182c38"))
	var scale := art_rect.size.x/720.0; draw_set_transform(art_rect.position,0,Vector2(scale,scale))
	draw_colored_polygon(PackedVector2Array([Vector2(18,68),Vector2(702,68),Vector2(702,458),Vector2(670,478),Vector2(50,478),Vector2(18,458)]),Color("d5d5bb"))
	draw_rect(Rect2(26,14,668,55),Color("29434a")); draw_circle(Vector2(370,150),105,Color("7eb8bc")); draw_circle(Vector2(390,180),92,Color("548b84")); draw_rect(Rect2(26,69,668,407),Color("d5d5bb"))
	for at in [Vector2(90,33),Vector2(210,24),Vector2(560,35),Vector2(632,25)]: draw_circle(at,2,Color("fff2d7"))
	draw_polyline(PackedVector2Array([Vector2(154,310),JUNCTION,Vector2(562,330)]),Color("f4ebce"),42); draw_line(JUNCTION,ENTRY,Color("f4ebce"),42)
	for i in range(3):
		draw_rect(DISPLAY_RECTS[i].grow(7),Color("29434a")); draw_texture_rect(copy_textures[i],DISPLAY_RECTS[i],false)
		draw_arc(DESTINATIONS[i],20,0,TAU,24,Color("487c74"),3)
	for i in range(8): draw_rect(Rect2(253+i*27,456,18,7),Color("29434a") if int(orbital_copies.beats)&(1<<i) else Color("c9bea5"))
	draw_colored_polygon(PackedVector2Array([Vector2(58,421),Vector2(82,393),Vector2(106,421)]),Color("#"+String(invitation_colors[1]))); draw_line(Vector2(58,421),Vector2(106,421),Color("#"+String(invitation_colors[0])),3)
	person(Vector2(88,382),"c5874f","966345","dad7c6","rollator"); person(Vector2(82,326),"c87d82","8b5b3f","383c32"); person(Vector2(640,326),"978aaf","704b37","292f2b","headphones")
	if shared>=0: draw_arc(DESTINATIONS[shared]+Vector2(21,5),38,0,TAU,32,Color("c88436"),5)
	person(thanh,"b59b5d","c38c65","454236"); person(player,"e8b861","e7c39b","29434a"); draw_circle(player+Vector2(0,-51),4,Color("fff2d7"))
	draw_set_transform(Vector2.ZERO)
	for i in range(3): draw_string(ThemeDB.fallback_font,label_rect(i).position+Vector2(0,ThemeDB.fallback_font.get_ascent(12)),room.TITLES[i],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color("182c38"))

func label_rect(index: int) -> Rect2:
	var extent := ThemeDB.fallback_font.get_string_size(room.TITLES[index],HORIZONTAL_ALIGNMENT_LEFT,-1,12)
	var center: Vector2=art_rect.position+DESTINATIONS[index]*(art_rect.size.x/720.0)
	return Rect2(center+Vector2(-extent.x*0.5,10),extent)

func snapshot() -> Dictionary:
	var result := {"visible":is_visible_in_tree(),"started":started,"player":[player.x,player.y],"thanh":[thanh.x,thanh.y],"moving":moving(),"player_moving":not player_path.is_empty(),"thanh_moving":not thanh_path.is_empty(),"target":target,"reached":reached,"shared":shared,"pending_share":sharing,"copy_rasterizations":copy_rasterizations}
	if not is_visible_in_tree() or not started: return result
	var buttons: Array[Button]=[]; buttons.append_array(destinations); buttons.append_array([invite,stop,back,pause])
	var targets: Array=[]
	for i in range(3): targets.append(game.rect_snapshot(target_rect(i)))
	result["scrollbar"]=game.control_snapshot(reader.get_v_scroll_bar())
	result["floor_labels"]=[game.rect_snapshot(label_rect(0)),game.rect_snapshot(label_rect(1)),game.rect_snapshot(label_rect(2))]
	result["floor_label_px"]=12
	result["focus_action"]=get_viewport().gui_get_focus_owner().text if get_viewport().gui_get_focus_owner() is Button else "reader"
	result.merge({"art":game.rect_snapshot(art_rect),"targets":targets,"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"reader":game.control_snapshot(reader),"buttons":game.activity_detail_snapshot(reader,tray,buttons).buttons,"text":reader.text,"copies":orbital_copies.duplicate(true),"invitation":invitation_title,"reader_focus":reader.has_focus(),"scroll":reader.get_v_scroll_bar().value,"scroll_max":maxf(0,reader.get_v_scroll_bar().max_value-reader.get_v_scroll_bar().page),"layout_pending":layout_pending})
	return result
