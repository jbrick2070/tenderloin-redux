extends Control
## Six prepared communal tiles. Live draft editor and immutable copied-panel reader.
var game: Node
var top: PanelContainer
var tray: PanelContainer
var title: Label
var reader: RichTextLabel
var picture: TextureRect
var pads: Array[Button] = []
var options: Array[Button] = []
var saved_visibility: Dictionary = {}
var return_focus: Control
var layout_pending := false
var art_rect := Rect2()
var textures: Dictionary = {}
var world_textures: Dictionary = {}
var faces: Array[MeshInstance3D] = []
var rendered := ""
var message := ""
var snapshot_clock := 0.0
var opened_editing := false
var painting_room := true
const SHAPES := ["circle", "wave", "triangle"]

func setup(owner_game: Node) -> void:
	game=owner_game
	name="SharedPanel"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=105
	var shade := ColorRect.new()
	shade.color=Color("253b39")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top=frame()
	var head := VBoxContainer.new()
	top.add_child(head)
	title=Label.new()
	title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size",18)
	head.add_child(title)
	var credit := Label.new()
	credit.text="Original portable art | City/PDDL | OSM/ODbL"
	credit.add_theme_font_size_override("font_size",10)
	credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	head.add_child(credit)
	picture=TextureRect.new()
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(picture)
	for i in range(6):
		var pad := Button.new()
		pad.custom_minimum_size=Vector2(44,44)
		for state in ["normal","disabled","pressed","hover","focus"]:
			var s := StyleBoxFlat.new()
			s.bg_color=Color.TRANSPARENT
			s.border_color=Color("fff5dc") if state=="hover" else Color("ffd45e")
			s.set_border_width_all(3 if state=="focus" else (1 if state=="hover" else 0))
			pad.add_theme_stylebox_override(state,s)
		pad.pressed.connect(func(): cycle(i))
		add_child(pad)
		pads.append(pad)
	tray=frame()
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation",4)
	tray.add_child(box)
	reader=game.make_activity_detail()
	reader.custom_minimum_size.y=52
	reader.add_theme_font_size_override("normal_font_size",16)
	box.add_child(reader)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",3)
	box.add_child(row)
	options.append(button(row,"Warm\npalette",func(): palette("warm")))
	options.append(button(row,"Cool\npalette",func(): palette("cool")))
	options.append(button(row,"Hang\npanel",hang))
	options.append(button(row,"Music: Off",func(): game.toggle_music_playback(); refresh(false)))
	options.append(button(row,"Back",close_panel))
	for c in [top,tray]: c.minimum_size_changed.connect(queue_layout)
	resized.connect(queue_layout)
	hide()

func frame() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel",game.panel_bg_style)
	add_child(p)
	return p

func button(parent: Node, text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text=text
	b.custom_minimum_size=Vector2(44,44)
	b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	game.style_game_button(b)
	b.add_theme_font_size_override("font_size",12)
	for state in ["normal","hover","pressed","disabled"]:
		var s: StyleBox=b.get_theme_stylebox(state).duplicate()
		s.content_margin_left=2
		s.content_margin_right=2
		b.add_theme_stylebox_override(state,s)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func available() -> bool:
	return game.block_opened and (game.current_hosting_activity()=="art" or game.has_hosted_segment("art"))

func editing() -> bool:
	return game.current_hosting_activity()=="art"

func value() -> Dictionary:
	var copied: Variant=game.get_hosted_segment_value("art")
	var src: Dictionary=game.hosting_draft if editing() else (copied if copied is Dictionary else {})
	return {"palette":src.get("palette","warm"),"tiles":src.get("tiles",game.HOSTING_DEFAULT_TILES).duplicate()}

func open_panel() -> bool:
	if visible: return true
	if not available() or game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.is_focused_activity_visible():
		game.announce_a11y_status("Reach the shared-art activity, finish arriving and close any chapter or activity before opening the panel.")
		return false
	return_focus=get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	message=""
	opened_editing=editing()
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false
	game.orbit_dragging=false
	refresh(true)
	fit_layout()
	if editing(): pads[0].grab_focus()
	else: reader.grab_focus()
	return true

func close_panel(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	if not message.is_empty() and "visit" in message.to_lower(): game.last_panel_dialogue='Celeste: "'+message+'"'
	game.update_block_ui()
	game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_programme_btn.is_visible_in_tree(): game.block_programme_btn.grab_focus()
	if announce:
		var fallback: String = game.save_receipt()+" Nothing was hung." if editing() else "Your copied panel and earlier keepsake are unchanged."
		if editing() and JSON.stringify(game.build_save_envelope()).to_utf8_buffer().size()>game.SAVE_BUDGET_MAX_BYTES: fallback=game.save_receipt("save full")
		game.announce_a11y_status("Back to the block. "+(message if not message.is_empty() else fallback))

func allow(next: Dictionary) -> bool:
	var admission: int=game.save_budget_kind(next)
	if admission>=0:
		message=game.save_receipt("save full") if admission==1 else ""
		return true
	message="Change not made: save full; stored progress is unchanged."
	refresh(true)
	return false

func cycle(index: int) -> void:
	if not visible or not editing() or index<0 or index>=6: return
	var next: Dictionary=game.build_save_envelope()
	next.hosting.draft.tiles[index]=(int(next.hosting.draft.tiles[index])+1)%3
	if not allow(next) or not game.host_cycle_tile(index): return
	message="Tile %d: %s. "%[index+1,SHAPES[int(value().tiles[index])]]+game.save_receipt()
	refresh(true)
	pads[index].grab_focus()

func palette(id: String) -> void:
	if not visible or not editing() or not id in game.HOSTING_PALETTES or value().palette==id: return
	var next: Dictionary=game.build_save_envelope()
	next.hosting.draft.palette=id
	if not allow(next) or not game.host_set_palette(id): return
	message=id.capitalize()+" palette. "+game.save_receipt()
	refresh(true)
	options[1 if id=="warm" else 0].grab_focus()

func allow_hang() -> bool:
	var next: Dictionary=game.build_save_envelope()
	next.hosting.results.append({"id":"art","value":value()})
	return allow(next)

func hang() -> void:
	if not visible or not editing() or not painting_room or not allow_hang(): return
	close_panel(false)
	game.advance_programme_and_hosting_step()

func explanation() -> String:
	return 'Celeste: "Six prepared tiles: circles, waves and rising triangles. Tap any tile, or keep our starting arrangement. Hang our shared panel beside the first mural when you are ready."'

func refresh(announce: bool) -> void:
	if not visible: return
	var v := value()
	title.text="Celeste's Shared Panel | "+("Make together" if editing() else "Copied artwork")
	picture.texture=texture(v,false)
	var shapes: Array[String]=[]
	for i in range(6):
		var shape: String=SHAPES[int(v.tiles[i])]
		shapes.append("%d %s"%[i+1,shape])
		pads[i].disabled=not editing() or not painting_room
		pads[i].accessibility_name="Tile %d: %s. %s"%[i+1,shape,"Change shape" if editing() else "Copied artwork"]
		pads[i].tooltip_text=pads[i].accessibility_name
	var text := explanation()+"\n"+("Live draft on this paper. The street frame receives the copied artwork when you hang it." if editing() else 'Celeste: "Our '+String(v.palette)+' panel came out of everyone\'s shapes. Look for it beside our first mural."\nCopied artwork: looking changes no saved choices or keepsake.')
	text+="\n"+String(v.palette).capitalize()+" palette | "+", ".join(shapes)+".\nOriginal fictional portable art, separate from the opening mural. Music stays yours to choose."
	if not message.is_empty(): text=message+"\n"+text
	elif JSON.stringify(game.build_save_envelope()).to_utf8_buffer().size()>game.SAVE_BUDGET_MAX_BYTES: text=game.save_receipt("save full")+"\n"+text
	text=game.persistence_text(text)
	if not painting_room: text="Make room for painting: enlarge the window or rotate it. No tiny overlapping paint targets are active.\n"+text
	if reader.text!=text: reader.text=text; reader.get_v_scroll_bar().value=0
	options[0].disabled=not editing() or not painting_room or v.palette=="warm"
	options[1].disabled=not editing() or not painting_room or v.palette=="cool"
	options[2].disabled=not editing() or not painting_room
	options[2].text="Hang\npanel" if editing() else "Shared"
	options[3].text="Music: On" if game.music_playing else "Music: Off"
	options[3].accessibility_name=options[3].text+". Independent from reward sounds."
	var ring: Array[Control]=[reader]
	if editing() and painting_room: ring.append_array(pads)
	for b in options:
		if not b.disabled: ring.append(b)
	for i in range(ring.size()):
		ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()])
		ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	for i in range(6):
		for direction in ["left","right","top","bottom"]:
			var at := clampi(i+(-3 if direction=="top" else (3 if direction=="bottom" else (-1 if direction=="left" else 1))),0,5)
			pads[i].set("focus_neighbor_"+direction,pads[i].get_path_to(pads[at]))
	queue_layout()
	if announce: game.announce_a11y_status(title.text+". "+text)

func texture(v: Dictionary, world: bool) -> Texture2D:
	var cache: Dictionary=world_textures if world else textures
	var key := JSON.stringify(v)
	if cache.has(key): return cache[key]
	var image := Image.new()
	if image.load_svg_from_string(game.build_tile_panel_svg(v),2.0)!=OK: return null
	image.generate_mipmaps()
	if cache.size()>=(1 if world else 8): cache.erase(cache.keys()[0])
	cache[key]=ImageTexture.create_from_image(image)
	return cache[key]

func update_world() -> void:
	if game.hosting_tile_meshes.size()!=6: return
	if faces.is_empty():
		for tile in game.hosting_tile_meshes:
			var face := MeshInstance3D.new()
			face.name="PaintedShape"
			var quad := QuadMesh.new()
			quad.size=Vector2(0.30,0.30)
			face.mesh=quad
			face.position.z=0.065
			tile.add_child(face)
			faces.append(face)
	var copied: Variant=game.get_hosted_segment_value("art")
	if not (copied is Dictionary): rendered=""; return
	var key := JSON.stringify(copied)
	if key==rendered: return
	rendered=key
	var ink := texture(copied,true)
	for i in range(6):
		var paint := StandardMaterial3D.new()
		paint.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
		paint.cull_mode=BaseMaterial3D.CULL_DISABLED
		paint.albedo_texture=ink
		paint.texture_filter=BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
		paint.uv1_scale=Vector3(98.0/360.0,98.0/240.0,1)
		paint.uv1_offset=Vector3(float(24+(i%3)*106)/360.0,float(20+(i/3)*106)/240.0,0)
		faces[i].material_override=paint

func cutaway_points() -> Array[Vector2]:
	var points: Array[Vector2]=[]
	if not game.has_hosted_segment("art") or game.following_player or game.hosting_tile_panel_node.global_position.distance_to(game.target)>30.0: return points
	for face in faces: points.append(Vector2(face.global_position.x,face.global_position.z))
	return points

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
	var side: bool=vp.x>=game.SMALL_SIDE_HUB_MIN_WIDTH and vp.y<game.SIDE_HUB_MAX_HEIGHT
	tray.size=Vector2(280 if side else width,0)
	tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	var area := Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	if side: area=Rect2(6,top.position.y+top.size.y+6,tray.position.x-12,vp.y-top.position.y-top.size.y-18)
	area.size=Vector2(maxf(1,area.size.x),maxf(1,area.size.y))
	var scale := minf(area.size.x/360.0,area.size.y/240.0)
	art_rect=Rect2(area.position+(area.size-Vector2(360,240)*scale)*0.5,Vector2(360,240)*scale)
	picture.position=art_rect.position
	picture.size=art_rect.size
	for i in range(6):
		pads[i].visible=98*scale>=44
		pads[i].position=art_rect.position+Vector2(24+(i%3)*106,20+(i/3)*106)*scale
		pads[i].size=Vector2(98,98)*scale
	if painting_room!=(98*scale>=44):
		painting_room=98*scale>=44
		refresh(false)
	game.sync_web_a11y_status()

func snapshot() -> Dictionary:
	var buttons: Array[Dictionary]=[]
	for b in pads+options: buttons.append(game.control_snapshot(b))
	var world: Array[Dictionary]=[]
	for face in faces:
		var p: Vector2=game.camera.unproject_position(face.global_position)
		var corners: Array[Dictionary]=[]
		for x in [-0.15,0.15]:
			for y in [-0.15,0.15]:
				var screen: Vector2=game.camera.unproject_position(face.to_global(Vector3(x,y,0)))
				corners.append({"x":screen.x,"y":screen.y})
		world.append({"x":p.x,"y":p.y,"corners":corners,"visible":face.is_visible_in_tree()})
	return {"visible":visible,"editing":editing(),"value":value(),"buttons":buttons,"reader":game.control_snapshot(reader),"text":reader.text,"scroll":reader.get_v_scroll_bar().value,"scroll_max":maxf(0,reader.get_v_scroll_bar().max_value-reader.get_v_scroll_bar().page),"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"picture":game.rect_snapshot(art_rect),"layout_pending":layout_pending,"message":message,"painting_room":painting_room,"world":world,"reader_cache":textures.size(),"world_cache":world_textures.size()}

func _process(delta: float) -> void:
	if not visible: return
	if not available() or editing()!=opened_editing:
		close_panel(false)
		return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	options[3].text="Music: On" if game.music_playing else "Music: Off"
	options[3].accessibility_name=options[3].text+". Independent from reward sounds."
	snapshot_clock+=delta
	if snapshot_clock>=0.18:
		snapshot_clock=0
		game.sync_web_a11y_status()
