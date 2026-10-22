extends Control
## Manual presentation of the existing copied film. No media capture or saved state.
var game: Node
var top: PanelContainer
var tray: PanelContainer
var title: Label
var reader: RichTextLabel
var picture: TextureRect
var shots: Array[Button] = []
var music: Button
var back: Button
var saved_visibility: Dictionary = {}
var return_focus: Control
var layout_pending := false
var art_rect := Rect2()
var snapshot_clock := 0.0
var sources: Dictionary = {}
var textures: Dictionary = {}
var world_textures: Dictionary = {}

func setup(owner_game: Node) -> void:
	game = owner_game
	name = "FilmScreening"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	z_index = 102
	var shade := ColorRect.new()
	shade.color = Color("101f26")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top = frame()
	var heading := VBoxContainer.new()
	top.add_child(heading)
	title = Label.new()
	title.add_theme_font_size_override("font_size", 18)
	heading.add_child(title)
	var credit := Label.new()
	credit.text = "Original illustrated short | DataSF/PDDL | OSM/ODbL"
	credit.add_theme_font_size_override("font_size", 10)
	heading.add_child(credit)
	picture = TextureRect.new()
	picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(picture)
	tray = frame()
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	tray.add_child(box)
	reader = game.make_activity_detail()
	reader.add_theme_font_size_override("normal_font_size", 16)
	reader.custom_minimum_size.y = 76
	box.add_child(reader)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 4)
	box.add_child(row)
	for i in range(3):
		var b := button(row, "", func(): select_frame(i))
		b.toggle_mode = true
		shots.append(b)
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 4)
	box.add_child(actions)
	music = button(actions, "Music: Off", func(): game.toggle_music_playback(); refresh(false))
	back = button(actions, "Back to the block", close_screening)
	resized.connect(queue_layout)
	hide()

func _process(delta: float) -> void:
	if not visible: return
	if not available():
		close_screening(false)
		return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible = false
	snapshot_clock -= delta
	if snapshot_clock <= 0.0:
		snapshot_clock = 0.2
		game.sync_web_a11y_status()

func frame() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", game.panel_bg_style)
	add_child(p)
	return p

func button(parent: Node, text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(44,44)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.add_theme_font_size_override("font_size", 13)
	game.style_game_button(b)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func available() -> bool:
	return game.film_phase == "done" and game.is_valid_film_plan(game.film_result)

func open_screening() -> bool:
	if visible: return true
	if not available() or game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.is_mural_workshop_visible() or game.is_rhythm_circle_visible() or game.is_civic_listening_visible() or game.is_programme_studio_visible() or game.is_shared_panel_visible():
		game.announce_a11y_status("Finish the three-shot film, arriving and any chapter card before watching The Open Seat.")
		return false
	return_focus = get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c != self: saved_visibility[c] = c.visible
	show()
	for c in saved_visibility: c.visible = false
	game.pointer_active = false
	game.orbit_dragging = false
	refresh(true)
	fit_layout()
	shots[game.film_screen_frame].grab_focus()
	return true

func close_screening(announce: bool = true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible = saved_visibility[c]
	if game.block_panel.visible and game.uses_paged_block_actions():
		game.block_hub_page = game.block_buttons.find(game.block_film_btn) / game.BLOCK_ACTIONS_PER_PAGE
		game.layout_block_action_pages()
	game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_film_btn.is_visible_in_tree(): game.block_film_btn.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. Your copied film and soundtrack are unchanged.")

func shot_id() -> String:
	return String(game.film_result.order[game.film_screen_frame]) if available() else ""

func caption() -> String:
	var table: Dictionary = game.FILM_SHOT_LATER_CAPTIONS if game.film_result.get("plan") == "later" else game.FILM_SHOT_QUIET_CAPTIONS
	return String(table.get(shot_id(), ""))

func description() -> String:
	return "%s. Original illustrated props%s." % [game.film_shot_title(shot_id()), " and Celeste and Dez's volunteered fictional hands" if game.film_result.get("framing") == "wide" else ", with no people pictured"]

func select_frame(index: int) -> void:
	if not visible or not available(): return
	if game.film_set_screen_frame(index): refresh(true)

func refresh(announce: bool) -> void:
	if not visible or not available(): return
	var index: int = game.film_screen_frame
	title.text = "The Open Seat | %d / 3" % (index+1)
	picture.texture = texture(game.film_result, shot_id())
	picture.accessibility_name = description()
	var ending: String = game.film_shot_title(String(game.film_result.order[2])).to_lower()
	var text := "%s\n%s\n%s | %s\nYour ending is %s. The copied order, framing and production choice are remembered.\nSilent illustrated sequence, not a recorded movie. Music stays yours to choose. No real camera, microphone, permit or recording.\nDez: We ended on %s. A different order would tell a different little story." % [caption(), description(), game.FILM_FRAMING_LABELS[game.film_result.framing], game.FILM_PLAN_LABELS[game.film_result.plan], ending, ending]
	game.set_activity_detail(reader, text)
	for i in range(3):
		shots[i].text = game.film_shot_title(String(game.film_result.order[i]))
		shots[i].set_pressed_no_signal(i == index)
		shots[i].accessibility_name = "Frame %d of 3: %s%s" % [i+1, shots[i].text, ", selected" if i == index else ""]
	music.text = "Music: On" if game.music_playing else "Music: Off"
	var ring: Array[Control] = [reader, shots[0], shots[1], shots[2], music, back]
	for i in range(ring.size()):
		ring[i].focus_next = ring[i].get_path_to(ring[(i+1)%ring.size()])
		ring[i].focus_previous = ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	if announce: game.announce_a11y_status("The Open Seat. Frame %d of 3. %s %s Silent illustrated sequence. Music is independent." % [index+1, description(), caption()])
	queue_layout()

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending = true
	fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending = false
	if not visible: return
	var vp: Vector2 = game.bubble_viewport_size()
	var width := minf(900,vp.x-12)
	top.position = Vector2((vp.x-width)*0.5,6)
	top.size = Vector2(width,0)
	top.size.y = top.get_combined_minimum_size().y
	tray.size = Vector2(width,0)
	tray.size.y = tray.get_combined_minimum_size().y
	tray.position = Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	var available_rect := Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	var size_fit := Vector2(minf(available_rect.size.x,maxf(1,available_rect.size.y)*420.0/236.0),maxf(1,available_rect.size.y))
	size_fit.y = size_fit.x*236.0/420.0
	art_rect = Rect2(available_rect.get_center()-size_fit*0.5,size_fit)
	picture.position = art_rect.position
	picture.size = art_rect.size
	game.sync_web_a11y_status()

func texture(plan: Dictionary, id: String, world: bool = false) -> Texture2D:
	var cache: Dictionary = world_textures if world else textures
	var key := "%s:%s" % [plan.get("framing","close"),id]
	if cache.has(key): return cache[key]
	var svg: String = game.build_film_frame_svg(plan,id)
	if svg.is_empty(): return null
	if not world: sources[key] = svg
	if world:
		# Letterbox the 420:236 drawing within the unchanged 0.96:0.62 canvas.
		svg = '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="271.25" viewBox="0 0 420 271.25"><rect width="420" height="271.25" fill="#253f35"/><g transform="translate(0 17.625)">%s</g></svg>' % svg
	var image := Image.new()
	if image.load_svg_from_string(svg, 1.0 if world else 2.0) != OK: return null
	var tex := ImageTexture.create_from_image(image)
	cache[key] = tex
	return tex

func snapshot() -> Dictionary:
	var result := {"visible":visible,"world_cache":world_textures.size(),"reader_cache":textures.size()}
	if not visible: return result
	var buttons: Array[Dictionary] = []
	for b in shots+[music,back]:
		var data: Dictionary = game.control_snapshot(b)
		data["text"] = b.text
		data["pressed"] = b.button_pressed
		data["accessible_name"] = b.accessibility_name
		buttons.append(data)
	result.merge({"frame":game.film_screen_frame,"shot":shot_id(),"caption":caption(),"description":description(),"svg":sources.get("%s:%s" % [game.film_result.framing,shot_id()], ""),"picture":game.rect_snapshot(art_rect),"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"reader":game.control_snapshot(reader),"text":reader.text,"scroll":reader.get_v_scroll_bar().value,"scroll_max":reader.get_v_scroll_bar().max_value,"scroll_page":reader.get_v_scroll_bar().page,"buttons":buttons,"focus_within":is_ancestor_of(get_viewport().gui_get_focus_owner()) if get_viewport().gui_get_focus_owner()!=null else false,"layout_pending":layout_pending})
	return result
