extends Control
## Optional planning and re-reading of the existing fictional civic hour.
const KEYS := ["topic","format","notes"]
const CATEGORIES := ["Topic","Space","Notes"]
const SPEAKERS := ["Bea","Thanh","Celeste","Dez"]
var game: Node
var entry: Button
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var reader: RichTextLabel
var picture: TextureRect
var tabs: Array[Button] = []
var choices: Array[Button] = []
var voices: Array[Button] = []
var advance: Button
var music: Button
var back: Button
var category := 0
var voice := 0
var saved_visibility: Dictionary = {}
var return_focus: Control
var textures: Dictionary = {}
var surfaces: Array[MeshInstance3D] = []
var layout_pending := false
var snapshot_clock := 0.0
var rendered := ""
var nav_compact := false
var nav_styles: Dictionary = {}

func setup(owner_game: Node) -> void:
	game = owner_game
	name = "CivicListening"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	z_index = 103
	var shade := ColorRect.new()
	shade.color = Color("162b31")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top = frame()
	var head := VBoxContainer.new()
	top.add_child(head)
	heading = Label.new()
	heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	heading.add_theme_font_size_override("font_size",18)
	head.add_child(heading)
	var credit := Label.new()
	credit.text = "Fictional neighbors | DataSF/PDDL | OSM/ODbL"
	credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	credit.add_theme_font_size_override("font_size",10)
	head.add_child(credit)
	picture = TextureRect.new()
	picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(picture)
	tray = frame()
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation",4)
	tray.add_child(box)
	reader = game.make_activity_detail()
	reader.add_theme_font_size_override("normal_font_size",16)
	reader.custom_minimum_size.y = 86
	box.add_child(reader)
	var categories := HBoxContainer.new()
	box.add_child(categories)
	for i in range(3): tabs.append(button(categories,CATEGORIES[i],func(): category=i; refresh(true)))
	var option_row := HBoxContainer.new()
	box.add_child(option_row)
	for i in range(2): choices.append(button(option_row,"",func(): choose(i)))
	var people := HBoxContainer.new()
	box.add_child(people)
	for i in range(4): voices.append(button(people,SPEAKERS[i],func(): voice=i; refresh(true)))
	var actions := HBoxContainer.new()
	box.add_child(actions)
	advance = button(actions,"",step)
	music = button(actions,"Music: Off",func(): game.toggle_music_playback(); refresh(false))
	back = button(actions,"Back",close_hour)
	for b in tabs+choices+voices: b.toggle_mode = true
	entry = Button.new()
	entry.text = "Listening\nHour"
	entry.autowrap_mode = TextServer.AUTOWRAP_OFF
	entry.custom_minimum_size = Vector2(76,44)
	game.style_game_button(entry)
	entry.add_theme_font_size_override("font_size",12)
	entry.pressed.connect(open_hour)
	entry.tooltip_text="Plan / Hear the Listening Hour (F5)"
	entry.accessibility_name=entry.tooltip_text
	game.block_page_nav.add_child(entry)
	game.block_page_nav.move_child(entry,game.block_page_nav.get_child_count()-2)
	for b in [game.block_page_prev,game.block_page_next,game.block_close_btn]:
		nav_styles[b]={}
		for state in ["normal","hover","pressed","hover_pressed"]: nav_styles[b][state]=b.get_theme_stylebox(state)
	entry.hide()
	game.block_page_nav.minimum_size_changed.connect(queue_nav_refit)
	game.block_page_nav.resized.connect(queue_nav_refit)
	resized.connect(queue_layout)
	hide()
	build_surfaces()

func frame() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel",game.panel_bg_style)
	add_child(p)
	return p

func button(parent: Node, text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(44,44)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.add_theme_font_size_override("font_size",13)
	game.style_game_button(b)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func available() -> bool:
	return game.is_civic_available()

func plan() -> Dictionary:
	return game.civic_draft if game.civic_phase in ["idle","planning"] else game.civic_result

func dialogue(p: Dictionary) -> Array[String]:
	# Project-native browser civicConversation, kept verbatim and checked in Web.
	return [
		'“A repair should help a neighbor stay. That is the question I want us to carry forward.”' if p.get("topic")=="repairs" else '“A clear route matters. I also want repairs and staying put on a future agenda; one conversation cannot cover everything.”',
		'“I can stay for a turn today. Some days I only have a few minutes; please make a drop-in option next time.”' if p.get("format")=="circle" else '“This table lets me join briefly. Could the host repeat the question? I do not want separate conversations to lose one another.”',
		'“Keep the shared request, not who said what. A person can listen or ask for their contribution to stay out.”' if p.get("notes")=="themes" else '“No meeting notes today. We can leave with something to think about without making a record of each other.”',
		'“You can speak, pass, or just listen. There is no sign-up sheet and no one has to agree with us.”'
	]

func request_text(p: Dictionary) -> String:
	return "Authored shared request (not sent; no names or testimony collected): "+String(game.CIVIC_TOPIC_REQUESTS[p.topic]) if p.notes=="themes" else "No meeting notes. Nothing is recorded or sent; this fictional conversation is not a record of real people."

func open_hour() -> bool:
	if visible: return true
	if not available() or game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.is_mural_workshop_visible() or game.is_rhythm_circle_visible() or game.is_film_screening_visible():
		game.announce_a11y_status("Finish hosting, arriving and any open activity before the Listening Hour.")
		return false
	return_focus = get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c != self: saved_visibility[c]=c.visible
	category=0
	voice=0
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false
	game.orbit_dragging=false
	refresh(true)
	fit_layout()
	(tabs[0] if game.civic_phase in ["idle","planning"] else voices[0]).grab_focus()
	return true

func close_hour(announce: bool = true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	game.update_block_ui()
	refresh_entry()
	game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif entry.is_visible_in_tree(): entry.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. Listening is welcome; Q keeps the original quick path.")

func choose(index: int) -> void:
	if not visible or game.civic_phase!="planning": return
	var values: Array = [game.CIVIC_TOPICS,game.CIVIC_FORMATS,game.CIVIC_NOTES]
	game.civic_set_choice(KEYS[category],values[category][index])
	refresh(true)

func step() -> void:
	if not visible: return
	match game.civic_phase:
		"idle": game.civic_start()
		"planning": game.civic_convene()
		"meeting": game.civic_complete()
		_: return
	refresh(false) # The core callback already announces this state change once.
	if game.civic_phase in ["meeting","done"]: voices[voice].grab_focus()

func refresh(announce: bool) -> void:
	if not visible or not available(): return
	var planning: bool = game.civic_phase in ["idle","planning"]
	var p := plan()
	heading.text = "Listening Hour | "+("Invitation" if planning else ("Remembering" if game.civic_phase=="done" else "Neighbors' turns"))
	picture.texture=texture(p)
	picture.accessibility_name=art_description(p)
	var summary := "%s | %s | %s"%[game.civic_topic_title(p.topic),game.civic_format_title(p.format),game.civic_notes_title(p.notes)]
	var text: String = "Bea: Choose what we talk about, how people can join, and what we keep. A disagreement can belong here too. Start planning to change the invitation. Q still offers the quick path." if game.civic_phase=="idle" else ("Choose one of each. These are fictional plans, not completed repairs or a real event. Changes are saved; Convene copies this invitation." if planning else SPEAKERS[voice]+": "+dialogue(p)[voice]+"\nSpeak, pass or just listen. No timer; Close the hour whenever you are ready.")
	text += "\n"+summary+"\n"+request_text(p)+"\nOne listening hour is a beginning, not a promise that housing problems are solved."
	if game.civic_phase=="done": text=text.replace("No timer; Close the hour whenever you are ready.","This hour is complete. You can revisit any turn; the copied invitation stays unchanged.")
	game.set_activity_detail(reader,text)
	for i in range(3): tabs[i].get_parent().visible=planning; tabs[i].set_pressed_no_signal(category==i)
	for i in range(2):
		choices[i].get_parent().visible=planning
		var labels: Array = [game.CIVIC_TOPIC_LABELS,game.CIVIC_FORMAT_LABELS,game.CIVIC_NOTE_LABELS]
		var values: Array = [game.CIVIC_TOPICS,game.CIVIC_FORMATS,game.CIVIC_NOTES]
		var id: String = values[category][i]
		choices[i].text=labels[category][id]
		choices[i].disabled=game.civic_phase!="planning"
		choices[i].set_pressed_no_signal(p[KEYS[category]]==id)
	for i in range(4): voices[i].get_parent().visible=not planning; voices[i].set_pressed_no_signal(voice==i)
	advance.visible=game.civic_phase!="done"
	advance.text={"idle":"Start planning","planning":"Convene","meeting":"Close the hour"}.get(game.civic_phase,"")
	music.text="Music: On" if game.music_playing else "Music: Off"
	var ring: Array[Control] = [reader]
	for b in tabs+choices+voices+[advance,music,back]:
		if b.is_visible_in_tree() and not b.disabled:
			ring.append(b)
			b.accessibility_name=b.text+(", selected" if b.toggle_mode and b.button_pressed else "")
	for i in range(ring.size()):
		ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()])
		ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	if announce: game.announce_a11y_status(heading.text+". "+text)
	queue_layout()

func fit_entry_navigation() -> void:
	if entry==null or nav_styles.is_empty(): return
	var vp: Vector2=game.bubble_viewport_size()
	var width: float=vp.x-24.0
	if game.uses_side_block_hub(): width=clampf(vp.x*0.52,280.0 if vp.x<game.WIDE_SIDE_PANEL_MIN_WIDTH else 312.0,440.0)
	var room: float=width-game.block_panel.get_theme_stylebox("panel").get_minimum_size().x
	var labels := ["Previous","Next %d/%d"%[mini(game.block_hub_page+2,game.block_action_page_count()),game.block_action_page_count()],"Close"]
	var needed := 76.0
	for b in game.block_page_nav.get_children():
		if b==entry or not b is Button or not b.visible: continue
		var index: int=[game.block_page_prev,game.block_page_next,game.block_close_btn].find(b)
		var minimum: float=b.get_combined_minimum_size().x
		if index>=0:
			minimum=maxf(b.custom_minimum_size.x,b.get_theme_font("font").get_string_size(labels[index],HORIZONTAL_ALIGNMENT_LEFT,-1,b.get_theme_font_size("font_size")).x+nav_styles[b]["normal"].get_minimum_size().x)
		needed+=minimum+4.0
	var compact: bool=entry.visible and needed>room
	if compact!=nav_compact:
		nav_compact=compact
		for b in nav_styles:
			for state in nav_styles[b]:
				var style: StyleBox=nav_styles[b][state]
				if compact:
					style=style.duplicate()
					style.content_margin_left=2
					style.content_margin_right=2
				b.add_theme_stylebox_override(state,style)
	game.block_page_nav.add_theme_constant_override("separation",3 if compact else 4)
	for i in range(3):
		var b: Button=[game.block_page_prev,game.block_page_next,game.block_close_btn][i]
		b.text=["Prev","Next","Close"][i] if compact else labels[i]
		b.tooltip_text=labels[i]
		b.accessibility_name=labels[i]
	entry.text="Listen" if compact else "Listening\nHour"
	entry.custom_minimum_size.x=44 if compact else 76
	entry.size_flags_horizontal=Control.SIZE_SHRINK_END
	entry.add_theme_font_size_override("font_size",12)
	for state in ["normal","hover","pressed","hover_pressed"]:
		var style: StyleBox=entry.get_theme_stylebox(state)
		if style.content_margin_left!=2 or style.content_margin_right!=2:
			style=style.duplicate()
			style.content_margin_left=2
			style.content_margin_right=2
			entry.add_theme_stylebox_override(state,style)

func queue_nav_refit() -> void:
	if not visible and entry.is_visible_in_tree() and game.following_player:
		game.refit_panel_after_layout()

func refresh_entry() -> void:
	var show_entry: bool = not visible and available() and not game.is_story_card_visible() and game.block_panel.visible and game.block_panel_mode=="hub"
	var changed: bool=entry.visible!=show_entry
	entry.visible=show_entry
	fit_entry_navigation()
	if changed:
		game.layout_walking_controls_and_hub()
		game.sync_web_a11y_status()

func _process(delta: float) -> void:
	refresh_entry()
	if not visible: return
	if not available(): close_hour(false); return
	music.text="Music: On" if game.music_playing else "Music: Off"
	music.accessibility_name=music.text
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	snapshot_clock-=delta
	if snapshot_clock<=0:
		snapshot_clock=0.2
		game.sync_web_a11y_status()

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
	picture.position=area.position
	picture.size=Vector2(maxf(1,area.size.x),maxf(1,area.size.y))
	game.sync_web_a11y_status()

func art_description(p: Dictionary) -> String:
	return "Original imagined welcome: neighbors around a %s; %s; %s. No real building or testimony pictured."%["circle" if p.format=="circle" else "drop-in table","a mended patchwork home" if p.topic=="repairs" else "an open doorway and clear path","a shared themes card" if p.notes=="themes" else "a closed unmarked notebook"]

func artwork(p: Dictionary) -> String:
	var topic := '<path d="M230 250V155L360 72 490 155V250" fill="#ce8f70"/><path d="M210 155L360 60 510 155" fill="none" stroke="#3c5b63" stroke-width="20"/><path d="M292 118L318 138 298 162 326 182" fill="none" stroke="#fff0c6" stroke-width="10"/><rect x="340" y="174" width="48" height="76" rx="20" fill="#f6dfb0"/>' if p.topic=="repairs" else '<path d="M300 258V80H440V258" fill="none" stroke="#3c5b63" stroke-width="18"/><path d="M312 258V92L370 120V274" fill="#cf8f70"/><path d="M385 257Q490 270 540 370" fill="none" stroke="#8ac1b5" stroke-width="45"/><circle cx="350" cy="193" r="5" fill="#fff0c6"/>'
	var space := '<ellipse cx="360" cy="350" rx="150" ry="42" fill="#9ab6a0"/>' if p.format=="circle" else '<path d="M210 316H510V352H210Z" fill="#cf8f70"/><path d="M230 350V414M490 350V414" stroke="#3c5b63" stroke-width="12"/>'
	var notes := '<path d="M304 314L405 302 414 363 313 375Z" fill="#fff9e9"/><path d="M325 332L386 324M327 347L373 341" stroke="#658b83" stroke-width="6"/>' if p.notes=="themes" else '<path d="M305 318L405 310 413 365 313 373Z" fill="#3c5b63"/><path d="M322 317L330 371" stroke="#f1c56d" stroke-width="5"/>'
	var people := '<g fill="#304e58"><path d="M124 324Q124 278 166 278Q208 278 208 324V394H124Z"/><path d="M516 320Q516 274 558 274Q600 274 600 320V394H516Z"/></g><circle cx="166" cy="252" r="31" fill="#b77b59"/><circle cx="558" cy="248" r="31" fill="#d9a67e"/><path d="M184 315Q234 283 278 306M535 315Q489 281 448 304" fill="none" stroke="#b77b59" stroke-width="19" stroke-linecap="round"/>'
	return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f5e7cb"/><circle cx="360" cy="221" r="199" fill="#ebd7ac"/><path d="M53 432Q360 450 667 428" fill="none" stroke="#6f9d90" stroke-width="9"/>%s%s%s%s</svg>'%[topic,space,people,notes]

func texture(p: Dictionary) -> Texture2D:
	var key := "%s:%s:%s"%[p.topic,p.format,p.notes]
	if textures.has(key): return textures[key]
	var image := Image.new()
	if image.load_svg_from_string(artwork(p))!=OK: return null
	image.generate_mipmaps()
	var tex := ImageTexture.create_from_image(image)
	textures[key]=tex
	return tex

func build_surfaces() -> void:
	# Original notice rests on the existing board/table, no extra furniture/collider.
	for circle in [true,false]:
		var paper := MeshInstance3D.new()
		paper.name="ListeningNotice"
		var mesh := QuadMesh.new()
		mesh.size=Vector2(0.64,0.4266667) if circle else Vector2(0.60,0.40)
		paper.mesh=mesh
		paper.position=Vector3(0,0.92,-0.379) if circle else Vector3(0,0.721,-0.18)
		if not circle: paper.rotation.x=-PI*0.5
		(game.civic_circle_group if circle else game.civic_dropin_group).add_child(paper)
		surfaces.append(paper)
	update_world()

func update_world() -> void:
	if surfaces.is_empty() or not game.is_civic_available() or game.civic_phase not in ["meeting","done"]: return
	var key := "%s:%s:%s"%[game.civic_result.topic,game.civic_result.format,game.civic_result.notes]
	if rendered==key: return
	for surface in surfaces:
		var mat := StandardMaterial3D.new()
		mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.cull_mode=BaseMaterial3D.CULL_DISABLED
		mat.albedo_texture=texture(game.civic_result)
		surface.material_override=mat
	rendered=key

func snapshot() -> Dictionary:
	var result := {"visible":visible,"entry":game.control_snapshot(entry),"entry_inline":entry.get_parent()==game.block_page_nav,"entry_focused":entry.has_focus(),"cache":textures.size()}
	if not visible: return result
	var boxes: Array[Dictionary]=[]
	for b in tabs+choices+voices+[advance,music,back]:
		var item: Dictionary=game.control_snapshot(b)
		item.merge({"text":b.text,"disabled":b.disabled,"selected":b.button_pressed,"accessible_name":b.accessibility_name})
		boxes.append(item)
	result.merge({"phase":game.civic_phase,"category":category,"voice":voice,"plan":plan().duplicate(),"text":reader.text,"dialogue":dialogue(plan()),"request":request_text(plan()),"description":art_description(plan()),"top":game.control_snapshot(top),"picture":game.control_snapshot(picture),"reader":game.control_snapshot(reader),"scroll":reader.get_v_scroll_bar().value,"scroll_max":reader.get_v_scroll_bar().max_value,"scroll_page":reader.get_v_scroll_bar().page,"buttons":boxes,"layout_pending":layout_pending,"focus_within":is_ancestor_of(get_viewport().gui_get_focus_owner()) if get_viewport().gui_get_focus_owner()!=null else false})
	return result
