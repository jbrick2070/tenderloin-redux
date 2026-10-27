extends Control
## Original regional process illustration; never a reconstruction or a saved achievement.
const FRAME := "This is Ramaytush homeland today. The Yelamu were the original people of what is now San Francisco; Ramaytush people continue to live today."
const VIEWS := [
	"A low sweep of sand. The National Park Service describes wind carrying coastal sand inland across much of San Francisco. This drawing explains a regional process; it does not reconstruct this block.",
	"A gust carries loose grains across the ridge. The crest in this simplified drawing has shifted. No street, village, trail or coastline is being mapped here.",
	"Another gust leaves a different ridge. Landscapes change over long periods. These three drawings are observations of a process, not dated snapshots or a simulation of an exact place."
]
const REPLIES := [
	'Bea (fictional neighbor): "You noticed the changing shapes. I like looking twice: a familiar place can show me something different. When you are ready, come see what we are making together."',
	'Bea (fictional neighbor): "You noticed how much time a place holds. We can take our time too. There is a place for you in our afternoon, whenever you want to join."'
]
const SOURCES := "Sources checked October 25, 2026.\nNational Park Service: regional wind-blown sand and dunes.\nhttps://www.nps.gov/places/000/dune-habitat-a-once-common-now-rare-commodity.htm\nAssociation of Ramaytush Ohlone: living people and Peninsula homeland.\nhttps://www.ramaytush.org/\nRamaytush Tribe: Yelamu and ongoing historical landscape research.\nhttps://www.ramaytushtribe.org/research.html\nOriginal schematic artwork and fictional Bea dialogue. This is not a community-authored cultural account; consultation and cultural acceptance have not occurred. No Indigenous voice, village, ceremony or historical trail is invented. Links are reading references; this scene makes no network requests."
var game: Node
var top: PanelContainer
var tray: PanelContainer
var title: Label
var frame_label: Label
var reader: RichTextLabel
var picture: TextureRect
var previous: Button
var gust: Button
var shapes: Button
var time_choice: Button
var sources: Button
var back: Button
var entry: Button
var view := 0
var observation := -1
var source_view := false
var from_startup := false
var opened_size := Vector2.ZERO
var saved_visibility: Dictionary = {}
var return_focus: Control
var textures: Dictionary = {}
var layout_pending := false
var snapshot_clock := 0.0
var held_on_exit: Array[Key] = []

func setup(owner_game: Node) -> void:
	game=owner_game; name="BeforeTheseStreets"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP; z_index=110
	var shade := ColorRect.new(); shade.color=Color("142f38")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(shade)
	top=panel(); var headings := VBoxContainer.new(); top.add_child(headings)
	title=Label.new(); title.text="Before These Streets"; title.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size",22); headings.add_child(title)
	frame_label=Label.new(); frame_label.text="Ramaytush homeland, then and now\nOriginal regional illustration | Not a map"
	frame_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	frame_label.add_theme_font_size_override("font_size",14); headings.add_child(frame_label)
	picture=TextureRect.new(); picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE; add_child(picture)
	tray=panel(); var box := VBoxContainer.new(); box.add_theme_constant_override("separation",4); tray.add_child(box)
	reader=game.make_activity_detail(); reader.add_theme_font_size_override("normal_font_size",16)
	reader.custom_minimum_size.y=112; box.add_child(reader)
	var row := HBoxContainer.new(); box.add_child(row)
	previous=button(row,"Previous view",func(): set_view(view-1))
	gust=button(row,"Send a gust",func(): set_view(view+1))
	row=HBoxContainer.new(); box.add_child(row)
	shapes=button(row,"Changing shapes",func(): observe(0))
	time_choice=button(row,"Passing time",func(): observe(1))
	shapes.toggle_mode=true; time_choice.toggle_mode=true
	row=HBoxContainer.new(); box.add_child(row)
	sources=button(row,"Sources",toggle_sources)
	back=button(row,"Return",close_opening)
	resized.connect(queue_layout); top.minimum_size_changed.connect(queue_layout); tray.minimum_size_changed.connect(queue_layout)
	hide()

func panel() -> PanelContainer:
	var p := PanelContainer.new(); p.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(p); return p

func button(parent: Node,text: String,callback: Callable) -> Button:
	var b := Button.new(); b.text=text; b.accessibility_name=text; b.tooltip_text=text
	b.custom_minimum_size=Vector2(44,44); b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.add_theme_font_size_override("font_size",14); b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	b.clip_text=false; game.style_game_button(b); b.pressed.connect(callback); parent.add_child(b); return b

func idle_entry_available() -> bool:
	return not game.startup_story_pending and not game.is_story_card_visible() and not game.is_focused_activity_visible() and not game.any_side_panel_visible() and game.active_story_episode()==null and game.current_path.is_empty()

func open_opening() -> bool:
	if visible: return true
	var startup: bool=game.is_story_card_visible() and game.startup_story_pending
	if game.is_focused_activity_visible() or game.active_story_episode()!=null or not game.current_path.is_empty() or (game.is_story_card_visible() and not startup):
		game.announce_a11y_status("Use Stop and close the current activity or story visit before Before These Streets. It is available in every chapter.")
		return false
	from_startup=startup; return_focus=get_viewport().gui_get_focus_owner()
	opened_size=game.bubble_viewport_size()
	game.cancel_map_pinch(); game.close_phone_disclosure(false)
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	show()
	for c in saved_visibility: c.visible=false
	refresh(true); fit_layout(); gust.grab_focus() if not gust.disabled else back.grab_focus()
	return true

func close_opening(announce: bool=true) -> void:
	if not visible: return
	held_on_exit.clear()
	for key in [KEY_W,KEY_A,KEY_S,KEY_D,KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT]:
		if Input.is_key_pressed(key) or Input.is_physical_key_pressed(key): held_on_exit.append(key)
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	saved_visibility.clear()
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	if from_startup:
		game.layout_story_card(); game.story_continue_btn.grab_focus()
	elif is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif entry!=null and entry.is_visible_in_tree(): entry.grab_focus()
	if game.bubble_viewport_size()!=opened_size and (game.in_overview or game.in_wide_overview):
		game.refit_after_layout()
	if announce: game.announce_a11y_status(FRAME+" Back to your existing chapter. Your observation stays in this opening for this visit; reload starts it fresh. Revisit through Info when idle.")
	game.sync_web_a11y_status()

func reset_visit() -> void:
	close_opening(false); view=0; observation=-1; source_view=false; from_startup=false

func release_pending() -> bool:
	var was_pending := not held_on_exit.is_empty()
	for i in range(held_on_exit.size()-1,-1,-1):
		if not Input.is_key_pressed(held_on_exit[i]) and not Input.is_physical_key_pressed(held_on_exit[i]): held_on_exit.remove_at(i)
	if was_pending and held_on_exit.is_empty(): game.sync_web_a11y_status()
	return not held_on_exit.is_empty()

func set_view(index: int) -> void:
	if not visible or index<0 or index>=VIEWS.size(): return
	view=index; source_view=false; refresh(true)
	if gust.disabled: shapes.grab_focus()
	elif previous.disabled and previous.has_focus(): gust.grab_focus()

func observe(index: int) -> void:
	if not visible or index<0 or index>=REPLIES.size(): return
	observation=index; source_view=false; refresh(true)

func toggle_sources() -> void:
	if not visible: return
	source_view=not source_view; refresh(true); reader.grab_focus()

func refresh(announce: bool) -> void:
	if not visible: return
	var text := ""
	if source_view: text=FRAME+"\n\n"+SOURCES
	else:
		if observation>=0: text=String(REPLIES[observation])+"\n\n"
		text+=FRAME+"\n\n"+String(VIEWS[view])+"\n\n"
		if observation>=0: text+="Your observation stays here this visit. Reload starts it fresh; it is never required for the ending."
		else: text+="Send a gust to change the illustration, or choose what you notice. No timer, score or required answer. You can skip at any point."
	game.set_activity_detail(reader,text)
	previous.disabled=view==0; gust.disabled=view==VIEWS.size()-1
	sources.text="Back to scene" if source_view else "Sources"
	back.text="Back to start" if from_startup else "Back to block"
	back.tooltip_text="Skip or return to your unchanged chapter; no progress or audio is started."
	for b in [previous,gust,shapes,time_choice,sources,back]: b.accessibility_name=b.text
	shapes.set_pressed_no_signal(observation==0); time_choice.set_pressed_no_signal(observation==1)
	picture.texture=texture(view,observation)
	picture.accessibility_name=art_description()
	var ring: Array[Control]=[reader]
	for b in [previous,gust,shapes,time_choice,sources,back]:
		if not b.disabled: ring.append(b)
	for i in range(ring.size()):
		ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()])
		ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	if announce: game.announce_a11y_status("Before These Streets. "+(SOURCES if source_view else art_description()+" "+(String(REPLIES[observation]) if observation>=0 else String(VIEWS[view]))))
	queue_layout()

func art_description() -> String:
	return "Schematic regional illustration, view %d of 3: %s. %s"%[view+1,["low sand ridges","wind-borne grains and a shifted crest","a second shifted ridge"][view],"Fictional Bea's observation card is open." if observation>=0 else "No mapped settlement or cultural scene."]

func texture(index: int,choice: int) -> Texture2D:
	var key := "%d:%d"%[index,choice]
	if textures.has(key): return textures[key]
	var image := Image.new(); var err := image.load_svg_from_string(artwork(index,choice))
	if err!=OK: return null
	image.generate_mipmaps(); var tex := ImageTexture.create_from_image(image); textures[key]=tex; return tex

func artwork(index: int,choice: int) -> String:
	# Finite deterministic views; no rasterization or movement loop per frame.
	var shift := index*64
	var body := '<rect width="720" height="440" rx="24" fill="#b4d4d0"/><circle cx="590" cy="88" r="46" fill="#f3e3b2"/><path d="M0 180Q130 120 260 185T520 165T720 170V440H0Z" fill="#668e8b"/><path d="M0 225Q150 180 320 225T720 220V440H0Z" fill="#426f79"/>'
	body+='<path d="M0 300Q%d 135 %d 240T720 285V440H0Z" fill="#c8a567"/>'%[155+shift,340+shift]
	body+='<path d="M0 355Q%d 215 %d 315T720 300V440H0Z" fill="#e4c993"/>'%[220+shift,420+shift]
	body+='<path d="M0 411Q%d 275 720 375V440H0Z" fill="#f2ddb0"/>'%[450-shift]
	for n in range(8):
		body+='<path d="M%d %dQ%d %d %d %d" stroke="#b99a65" stroke-width="2" fill="none"/>'%[70+n*61,365+n%3*12,95+n*61+shift/3,345+n%3*12,125+n*61+shift/3,361+n%3*12]
	if index>0:
		for n in range(3): body+='<path d="M%d %dQ%d %d %d %d" stroke="#fff4d8" stroke-width="7" stroke-linecap="round" fill="none"/>'%[40+n*32,100+n*39,170+shift,75+n*39,290+shift,105+n*39]
		for n in range(30): body+='<circle cx="%d" cy="%d" r="3" fill="#f3dcb0"/>'%[180+(n*47+shift)%380,150+(n*31)%125]
	if choice>=0:
		body+='<rect x="450" y="247" width="240" height="167" rx="18" fill="#fff4d8" stroke="#294751" stroke-width="5"/><path d="M458 404Q455 330 500 330Q548 330 548 404Z" fill="#778b6a"/><circle cx="500" cy="302" r="25" fill="#cb976c"/><path d="M476 297Q476 264 505 274Q529 278 525 300L513 286 490 287Z" fill="#eeeece"/>'
		if choice==0: body+='<path d="M565 294Q610 260 663 294M565 325Q610 291 663 325M565 355Q610 321 663 355" stroke="#c79855" stroke-width="9" fill="none"/>'
		else: body+='<circle cx="611" cy="326" r="47" fill="#dfbd78"/><path d="M611 287V326L640 344" stroke="#294751" stroke-width="9" stroke-linecap="round" fill="none"/>'
	return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440">'+body+'</svg>'

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
	reader.custom_minimum_size.y=112 if side else 128
	tray.size=Vector2(280 if side else width,0); tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	picture.position=Vector2(6 if side else (vp.x-width)*0.5,top.position.y+top.size.y+6)
	picture.size=Vector2(maxf(1,tray.position.x-12) if side else width,maxf(1,(vp.y-6 if side else tray.position.y-6)-picture.position.y))
	game.sync_web_a11y_status()

func handle_input(event: InputEvent) -> void:
	if not visible or not event is InputEventKey or not event.pressed: return
	if event.echo:
		get_viewport().set_input_as_handled(); return
	var key: Key=event.keycode if event.keycode!=KEY_NONE else event.physical_keycode
	if key==KEY_ESCAPE:
		close_opening(); get_viewport().set_input_as_handled(); return
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
	var controls: Array=[]
	for b in [previous,gust,shapes,time_choice,sources,back]:
		var c: Dictionary=game.control_snapshot(b); c["text"]=b.text; c["focused"]=b.has_focus()
		var font: Font=b.get_theme_font("font"); var size_value: int=b.get_theme_font_size("font_size")
		var available: float=b.size.x-b.get_theme_stylebox("normal").get_minimum_size().x
		c["words_fit"]=true
		for word in b.text.split(" "):
			if font.get_string_size(word,HORIZONTAL_ALIGNMENT_LEFT,-1,size_value).x>available+0.1: c["words_fit"]=false
		controls.append(c)
	var bar := reader.get_v_scroll_bar()
	return {"visible":visible,"view":view,"observation":observation,"source_view":source_view,"from_startup":from_startup,"layout_pending":layout_pending,"release_pending":not held_on_exit.is_empty(),"text":reader.text,"description":art_description(),"buttons":controls,"reader":game.control_snapshot(reader),"picture":game.control_snapshot(picture),"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"scroll":bar.value,"scroll_max":maxf(0,bar.max_value-bar.page),"entry":game.control_snapshot(entry)}

func _process(delta: float) -> void:
	if not visible: return
	snapshot_clock+=delta
	if snapshot_clock>=0.2:
		snapshot_clock=0; game.sync_web_a11y_status()
