extends Control
## Original fictional community-art layer. No real artist, business or mural claim.
const IDS := ["cooking", "sharing", "painting", "music", "garden"]
const SLOTS := ["left", "right"]
const NAMES := {"cooking":"Cooking Together", "sharing":"Sharing a Bowl", "painting":"Making Street Art", "music":"Making Music", "garden":"Growing Together"}
const LABELS := {"cooking":"Cooking\nTogether", "sharing":"Sharing\na Bowl", "painting":"Making\nStreet Art", "music":"Making\nMusic", "garden":"Growing\nTogether"}
const PAGES := [["cooking", "sharing", "painting"], ["music", "garden"]]
static var textures: Dictionary = {}
static var thumbnails: Dictionary = {}
var game: Node
var workshop: Control
var panel: PanelContainer
var title: Label
var attribution: Label
var scroll: ScrollContainer
var content: VBoxContainer
var body: GridContainer
var tools: GridContainer
var paper: Control
var reader: RichTextLabel
var palette_button: Button
var music_button: Button
var back_button: Button
var page_button: Button
var scene_page := 0
var choices: Array[Button] = []
var targets: Array[Button] = []
var lifts: Array[Button] = []
var selected := "cooking"
var message := ""
var layout_pending := false
var layout_busy := false
var layout_generation := 0
var layout_dirty := false
var thumbnail_palette := ""
var paper_rect := Rect2()

static func clean(raw: Variant) -> Dictionary:
	var out := {}
	if not raw is Dictionary: return out
	for slot in SLOTS:
		var id: Variant = raw.get(slot, "")
		if id is String and id in IDS and not id in out.values(): out[slot] = id
	return out

static func vignette(id: String, pal: Array) -> String:
	# Hand-drawn silhouettes, expressive arms and utensils make actions legible.
	var ink := "#294f44"
	var head := '<circle cx="77" cy="47" r="17" fill="#aa6549"/><path d="M60 43Q56 22 78 25Q96 24 94 44L86 34L62 38Z" fill="%s"/><path d="M82 47h2M85 54q-6 4-10 0" fill="none" stroke="%s" stroke-width="2"/>' % [ink,ink]
	var art := ""
	match id:
		"cooking":
			art = '<path d="M28 184Q23 158 43 154L169 157Q182 175 168 186Z" fill="%s" opacity=".2"/>' % pal[0]
			art += head
			art += '<path d="M58 70Q75 60 94 71L104 132H47Z" fill="%s"/><path d="M67 69L68 88H85L88 69M66 88L57 136H94L86 88Z" fill="#f4e3ba" stroke="%s" stroke-width="3"/><path d="M54 130L54 174M87 132L90 176" stroke="%s" stroke-width="13" stroke-linecap="round"/><path d="M54 174H42M90 176H104" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % [pal[1],ink,ink,ink]
			art += '<path d="M57 78L39 109L64 117M92 78L115 94L143 76" fill="none" stroke="#aa6549" stroke-width="10" stroke-linecap="round"/><path d="M140 72L156 118" stroke="%s" stroke-width="4"/><ellipse cx="157" cy="120" rx="6" ry="9" fill="%s" transform="rotate(-20 157 120)"/>' % [ink,pal[0]]
			art += '<path d="M105 127H183L175 153H113Z" fill="%s" stroke="%s" stroke-width="3"/><ellipse cx="144" cy="127" rx="39" ry="7" fill="%s" stroke="%s" stroke-width="3"/><path d="M102 134H96M183 134H190M126 111Q114 101 126 88M147 112Q138 101 149 92M168 113Q160 103 171 92" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/><path d="M96 157H190M103 157V185M183 157V185" stroke="%s" stroke-width="5"/><path d="M113 120L120 115L125 122M145 121L151 117L158 123" fill="%s"/>' % [pal[0],ink,pal[2],ink,ink,ink,pal[1]]
		"sharing":
			art = '<path d="M19 184Q12 165 36 157H178Q198 172 181 185Z" fill="%s" opacity=".2"/>' % pal[1]
			art += '<circle cx="44" cy="53" r="16" fill="#aa6549"/><path d="M28 50Q20 25 45 29Q65 29 62 50L52 40L29 44Z" fill="%s"/><circle cx="161" cy="54" r="16" fill="#71452f"/><path d="M146 46Q145 28 164 29Q187 32 178 60L170 41Z" fill="%s"/>' % [ink,ink]
			art += '<path d="M28 77Q43 66 61 79L68 134H22Z" fill="%s"/><path d="M144 78Q161 67 176 81L183 137H139Z" fill="%s"/><path d="M30 133L26 179M58 133L61 179M148 136L145 179M172 136L177 179" stroke="%s" stroke-width="11" stroke-linecap="round"/>' % [pal[1],pal[0],ink]
			art += '<path d="M58 82L82 105L113 105" fill="none" stroke="#aa6549" stroke-width="9" stroke-linecap="round"/><path d="M145 84L127 118L103 116" fill="none" stroke="#71452f" stroke-width="9" stroke-linecap="round"/><path d="M89 101H122Q118 118 105 118Q93 117 89 101Z" fill="%s" stroke="%s" stroke-width="3"/><path d="M97 94Q90 86 97 79M110 94Q103 86 111 79" fill="none" stroke="%s" stroke-width="2.5" stroke-linecap="round"/><path d="M64 139H141M72 139V183M134 139V183" fill="none" stroke="%s" stroke-width="5"/><ellipse cx="103" cy="137" rx="26" ry="5" fill="%s"/>' % [pal[2],ink,ink,ink,pal[0]]
		"painting":
			art = '<path d="M18 185Q12 167 30 163H183L186 186Z" fill="%s" opacity=".2"/>' % pal[2]
			art += '<path d="M93 34L189 27L185 148L91 153Z" fill="#ecd4aa" stroke="%s" stroke-width="3"/><path d="M104 61Q142 20 176 59M106 109Q125 71 169 88M111 129Q141 97 174 121" fill="none" stroke="%s" stroke-width="13" stroke-linecap="round"/><path d="M106 69Q141 38 174 65M108 116Q134 85 173 97" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round"/><path d="M101 152L96 182M177 150L185 181" stroke="%s" stroke-width="5"/>' % [ink,pal[0],pal[1],ink]
			art += '<circle cx="51" cy="54" r="16" fill="#71452f"/><path d="M35 48Q31 29 53 31Q70 31 68 49L59 40L36 43Z" fill="%s"/><path d="M31 78Q46 68 62 78L71 129H25Z" fill="%s"/><path d="M32 128L27 178M61 128L69 178" stroke="%s" stroke-width="12" stroke-linecap="round"/><path d="M27 178H15M69 178H81" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % [ink,pal[2],ink,ink]
			art += '<path d="M61 82L79 99L105 75M33 84L18 110L39 122" fill="none" stroke="#71452f" stroke-width="9" stroke-linecap="round"/><path d="M101 69L108 66L114 85L105 88Z" fill="%s" stroke="%s" stroke-width="2"/><path d="M106 65L110 63" stroke="%s" stroke-width="3"/><g fill="%s"><circle cx="118" cy="59" r="2"/><circle cx="126" cy="56" r="2.6"/><circle cx="126" cy="64" r="1.8"/><circle cx="133" cy="61" r="2"/></g><path d="M39 126L45 119L50 124L45 134Z" fill="%s"/>' % [pal[0],ink,ink,pal[1],pal[1]]
		"music":
			# A complete seated guitarist, not a repeat of the small drum border.
			art = '<path d="M18 184Q12 163 39 159L173 163Q194 174 179 187Z" fill="%s" opacity=".2"/>' % pal[1]
			art += '<path d="M46 133H116M52 133L43 180M109 133L120 180" fill="none" stroke="%s" stroke-width="6"/>' % ink
			art += head
			art += '<path d="M57 70Q76 62 94 73L105 124L61 133L45 106Z" fill="%s"/><path d="M61 128L91 142L86 177M94 125L119 138L132 172" fill="none" stroke="%s" stroke-width="13" stroke-linecap="round"/><path d="M86 177H72M132 172L144 169" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % [pal[1],ink,ink]
			art += '<path d="M90 91Q70 82 66 104Q60 113 74 121Q66 144 90 148Q111 153 119 135Q133 127 119 114L114 107Z" fill="%s" stroke="%s" stroke-width="3"/><path d="M105 110L164 72L171 81L114 121Z" fill="#bd8152" stroke="%s" stroke-width="3"/><path d="M158 72L173 63L181 77L167 86Z" fill="%s" stroke="%s" stroke-width="3"/><circle cx="98" cy="121" r="9" fill="%s"/><path d="M86 139L83 132M86 134L172 74M88 136L173 76M90 138L174 78" stroke="#f4e3ba" stroke-width="1.5"/><path d="M54 82L51 106L88 123M92 80L121 97L143 92" fill="none" stroke="#aa6549" stroke-width="9" stroke-linecap="round"/><path d="M147 43v17q-10-4-10 3t13-1V40l19-5v19q-10-4-10 3t13-1V31Z" fill="%s"/>' % [pal[2],ink,ink,pal[0],ink,ink,pal[0]]
		"garden":
			# Two people share care work around an imagined portable planter.
			art = '<path d="M12 184Q14 163 38 160H178Q200 173 182 187Z" fill="%s" opacity=".2"/>' % pal[0]
			art += '<circle cx="39" cy="55" r="16" fill="#71452f"/><path d="M23 50Q18 30 40 30Q61 31 56 51L46 40L24 45Z" fill="%s"/><path d="M21 78Q38 66 56 78L64 127H17Z" fill="%s"/><path d="M26 126L23 177M51 127L62 176" stroke="%s" stroke-width="12" stroke-linecap="round"/>' % [ink,pal[0],ink]
			art += '<circle cx="163" cy="65" r="16" fill="#aa6549"/><path d="M147 60Q139 36 164 39Q184 40 180 64L171 48L148 53Z" fill="%s"/><path d="M146 87Q161 75 179 88L185 137L143 145Z" fill="%s"/><path d="M150 140L133 162L153 178M177 136L178 175" fill="none" stroke="%s" stroke-width="12" stroke-linecap="round"/>' % [ink,pal[1],ink]
			art += '<path d="M64 137L141 135L135 173L71 174Z" fill="#b97952" stroke="%s" stroke-width="3"/><path d="M60 132H145V142H60Z" fill="%s" stroke="%s" stroke-width="3"/><path d="M84 130V109M107 131V94M127 131V111" fill="none" stroke="%s" stroke-width="3"/><path d="M84 118Q64 118 69 106Q83 100 84 118M84 114Q82 99 96 100Q102 113 84 114M107 112Q88 110 92 98Q106 93 107 112M108 104Q109 84 124 91Q130 104 108 104M127 123Q115 111 125 105Q139 108 127 123M127 119Q132 104 144 112Q147 125 127 119Z" fill="%s"/>' % [ink,pal[2],ink,ink,pal[1]]
			art += '<path d="M52 84L68 99L84 96M148 96L135 113L119 123" fill="none" stroke="#aa6549" stroke-width="9" stroke-linecap="round"/><path d="M60 99L85 95L91 116L67 122Z" fill="%s" stroke="%s" stroke-width="3"/><path d="M67 103Q53 91 57 107L66 113M86 104L99 108L98 113L88 113M99 116L102 124M104 115L108 122M112 125L117 118L121 126Z" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/>' % [pal[2],ink,ink]
	return '<g stroke-linejoin="round">'+art+'</g>'

static func svg(scenes: Dictionary, pal: Array) -> String:
	var out := '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="600" height="300" rx="8" fill="#f4e3ba"/><path d="M13 239Q129 208 289 239T587 225L587 284H13Z" fill="%s" opacity=".12"/><path d="M14 28Q146 10 283 27M326 20Q462 4 584 25" fill="none" stroke="#fff3d5" stroke-width="10" opacity=".7"/>' % pal[0]
	for x in range(16,600,23):
		out += '<path d="M%d 8v284" stroke="#a78056" stroke-width=".5" opacity=".09"/>' % x
	for slot in SLOTS:
		if scenes.has(slot):
			out += '<g transform="translate(%d 10) scale(1.3)">%s</g>' % [14 if slot == "left" else 314,vignette(scenes[slot],pal)]
	return out+'</svg>'

static func texture(scenes: Dictionary, pal: Array) -> ImageTexture:
	var cleaned := clean(scenes)
	var key := str(cleaned)+str(pal)
	if not textures.has(key):
		if textures.size() >= 6: textures.clear()
		var image := Image.new()
		if image.load_svg_from_string(svg(cleaned,pal)) != OK: return null
		textures[key] = ImageTexture.create_from_image(image)
	return textures[key]

static func thumbnail(id: String, pal: Array) -> ImageTexture:
	var key := id+str(pal)
	if not thumbnails.has(key):
		if thumbnails.size() >= IDS.size()*3: thumbnails.clear()
		var image := Image.new()
		if image.load_svg_from_string('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">'+vignette(id,pal)+'</svg>') != OK: return null
		thumbnails[key] = ImageTexture.create_from_image(image)
	return thumbnails[key]

func setup(owner_game: Node, owner_workshop: Control) -> void:
	game = owner_game
	workshop = owner_workshop
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel = PanelContainer.new()
	var frame: StyleBoxFlat = game.panel_bg_style.duplicate()
	frame.set_content_margin_all(8)
	frame.bg_color = Color("182c31")
	frame.set_corner_radius_all(12)
	panel.add_theme_stylebox_override("panel",frame)
	add_child(panel)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation",4)
	panel.add_child(outer)
	title = Label.new()
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size",16)
	title.add_theme_color_override("font_color",Color("ffe082"))
	outer.add_child(title)
	attribution = Label.new()
	attribution.text = "Original fictional community art | City: DataSF/PDDL | Streets: OSM/ODbL"
	attribution.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	attribution.add_theme_font_size_override("font_size",10)
	outer.add_child(attribution)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	outer.add_child(scroll)
	content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",4)
	scroll.add_child(content)
	reader = game.make_activity_detail()
	reader.custom_minimum_size.y = 36
	reader.add_theme_font_size_override("normal_font_size",12)
	content.add_child(reader)
	body = GridContainer.new()
	body.add_theme_constant_override("h_separation",8)
	body.add_theme_constant_override("v_separation",4)
	content.add_child(body)
	tools = GridContainer.new()
	tools.add_theme_constant_override("h_separation",4)
	tools.add_theme_constant_override("v_separation",4)
	body.add_child(tools)
	for i in range(3):
		var id: String = PAGES[0][i]
		var b: Button = workshop.button(tools,NAMES[id],func():
			if i < PAGES[scene_page].size(): select_scene(PAGES[scene_page][i]))
		b.custom_minimum_size.y = 60
		b.toggle_mode = true
		b.text = ""
		b.accessibility_name = NAMES[id]
		b.tooltip_text = NAMES[id]+". Choose a half of the paper to paint or move this scene."
		var row := GridContainer.new()
		row.columns = 2
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		row.offset_left = 4
		row.offset_right = -4
		row.offset_top = 2
		row.offset_bottom = -2
		b.add_child(row)
		var icon := TextureRect.new()
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		icon.custom_minimum_size = Vector2(42,44)
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		row.add_child(icon)
		var label := Label.new()
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.text = LABELS[id]
		label.add_theme_font_size_override("font_size",12)
		row.add_child(label)
		choices.append(b)
	var sheet := VBoxContainer.new()
	sheet.add_theme_constant_override("separation",4)
	sheet.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(sheet)
	paper = Control.new()
	paper.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sheet.add_child(paper)
	paper.draw.connect(draw_paper)
	paper.resized.connect(layout_paper)
	for slot in SLOTS:
		var b: Button = workshop.button(paper,"",func(): game.edit_mural_scene(selected,slot))
		for state in ["normal","hover","pressed","hover_pressed","focus"]: b.add_theme_stylebox_override(state,StyleBoxEmpty.new())
		b.focus_entered.connect(paper.queue_redraw)
		b.focus_exited.connect(paper.queue_redraw)
		b.mouse_entered.connect(paper.queue_redraw)
		b.mouse_exited.connect(paper.queue_redraw)
		targets.append(b)
	var lift_row := HBoxContainer.new()
	sheet.add_child(lift_row)
	for slot in SLOTS:
		lifts.append(workshop.button(lift_row,"Lift %s scene" % slot,func(): game.edit_mural_scene("",slot)))
	var footer := HBoxContainer.new()
	outer.add_child(footer)
	palette_button = workshop.button(footer,"Palette",func(): game.cycle_mural_palette())
	music_button = workshop.button(footer,"Music",func(): game.toggle_music_playback())
	back_button = workshop.button(footer,"Back to\nMural",func(): workshop.close_stories())
	page_button = workshop.button(footer,"Music &\nGarden",change_page)
	wire_focus()
	for node in [title,attribution,content]: node.minimum_size_changed.connect(queue_layout)
	visible = false

func wire_focus() -> void:
	var ring: Array[Control] = [reader]
	for b in choices:
		if b.visible: ring.append(b)
	ring.append_array(targets)
	ring.append_array(lifts)
	ring.append_array([palette_button,music_button,back_button,page_button])
	for i in range(ring.size()):
		var node := ring[i]
		node.focus_next = node.get_path_to(ring[(i+1)%ring.size()])
		node.focus_previous = node.get_path_to(ring[posmod(i-1,ring.size())])
		for direction in ["left","right","top","bottom"]:
			node.set("focus_neighbor_"+direction,node.focus_previous if direction in ["left","top"] else node.focus_next)

func select_scene(id: String) -> void:
	if not id in IDS: return
	selected = id
	message = NAMES[id]+" is on your brush. Touch the left or right half to paint; a second placement moves it."
	present()
	game.announce_a11y_status(message)

func change_page() -> void:
	scene_page = 1-scene_page
	selected = PAGES[scene_page][0]
	thumbnail_palette = ""
	message = "Choose any two of five scenes. " + ("Making Music is a silent illustration; Growing Together pictures a shared planter." if scene_page == 1 else "Food and art scenes. Music and gardening are on the other page.")
	present()
	game.announce_a11y_status(message)

func present() -> void:
	title.text = "Mural Stories | Marks %d/3" % game.mural_placements.size()
	palette_button.text = "Palette:\n"+String(game.mural_palette).capitalize()
	music_button.text = "Music:\n"+("On" if game.music_playing else "Off")
	var text: String = message+" Celeste: "+game.mural_scene_reply()+" Story scenes sit under the original marks on the street board. Your earlier keepsake stays as it was."
	if selected == "music" or "music" in game.mural_scenes.values(): text += " Making Music is a silent illustration; Music controls the soundtrack separately."
	text=game.persistence_text(text)
	if reader.text != text:
		reader.text = text
		reader.scroll_to_line(0)
	var pal: Array = game.KEEPSAKE_PALETTE_HEX.get(game.mural_palette,game.KEEPSAKE_PALETTE_HEX.garden)
	page_button.text = "Music &\nGarden" if scene_page == 0 else "Food &\nArt"
	page_button.accessibility_name = "Show music and gardening scenes, page 2 of 2" if scene_page == 0 else "Show food and art scenes, page 1 of 2"
	for i in range(choices.size()):
		choices[i].visible = i < PAGES[scene_page].size()
		if not choices[i].visible: continue
		var id: String = PAGES[scene_page][i]
		choices[i].accessibility_name = NAMES[id]
		choices[i].tooltip_text = NAMES[id]+". Choose a half of the paper to paint or move this scene."
		choices[i].set_pressed_no_signal(selected == id)
		choices[i].get_child(0).get_child(1).text = LABELS[id]
		if thumbnail_palette != str(pal): choices[i].get_child(0).get_child(0).texture = thumbnail(id,pal)
	thumbnail_palette = str(pal)
	wire_focus()
	for i in range(SLOTS.size()):
		var id: String = game.mural_scenes.get(SLOTS[i],"")
		targets[i].accessibility_name = "%s half: %s. Paint %s here." % [String(SLOTS[i]).capitalize(),NAMES.get(id,"open paper"),NAMES[selected]]
		targets[i].tooltip_text = targets[i].accessibility_name
		lifts[i].disabled = id.is_empty()
	paper.queue_redraw()
	queue_layout()

func queue_layout() -> void:
	if not visible: return
	if layout_pending or layout_busy:
		layout_dirty = true
		return
	layout_pending = true
	layout_dirty = false
	layout_generation += 1
	finish_layout.call_deferred(layout_generation)

func finish_layout(generation: int) -> void:
	if not visible or generation != layout_generation: return
	layout_busy = true
	var vp: Vector2 = game.bubble_viewport_size()
	var short_wide := vp.x >= 520 and vp.y < 560
	body.columns = 2 if short_wide else 1
	tools.columns = 1 if short_wide else 3
	tools.size_flags_horizontal = Control.SIZE_FILL if short_wide else Control.SIZE_EXPAND_FILL
	for b in choices:
		# Stacked thumbnails keep the three full names readable on narrow phones.
		b.get_child(0).columns = 2 if short_wide else 1
		b.custom_minimum_size = Vector2(136,60) if short_wide else Vector2(84,90)
	paper.custom_minimum_size.y = 136 if short_wide else clampf((minf(760,vp.x-24)-16)*0.5,136,300)
	var width := minf(760,vp.x-24)
	panel.size.x = width
	var fixed_height: float = title.get_combined_minimum_size().y+attribution.get_combined_minimum_size().y+back_button.get_combined_minimum_size().y+28
	scroll.custom_minimum_size.y = minf(content.get_combined_minimum_size().y,maxf(44,vp.y-24-fixed_height))
	panel.size = Vector2(width,0)
	panel.position = (vp-panel.size)*0.5
	layout_busy = false
	await get_tree().process_frame
	if not visible or generation != layout_generation: return
	layout_paper()
	layout_pending = false
	if layout_dirty or vp != game.bubble_viewport_size(): queue_layout()

func layout_paper() -> void:
	if targets.size() != 2: return
	var w := minf(paper.size.x,paper.size.y*2.0)
	paper_rect = Rect2(Vector2((paper.size.x-w)*0.5,(paper.size.y-w*0.5)*0.5),Vector2(w,w*0.5))
	for i in range(2):
		targets[i].position = paper_rect.position+Vector2(w*0.5*i,0)
		targets[i].size = Vector2(w*0.5,w*0.5)
	paper.queue_redraw()

func draw_paper() -> void:
	if paper_rect.size.x <= 0: return
	var pal: Array = game.KEEPSAKE_PALETTE_HEX.get(game.mural_palette,game.KEEPSAKE_PALETTE_HEX.garden)
	var image := texture(game.mural_scenes,pal)
	if image != null: paper.draw_texture_rect(image,paper_rect,false)
	else: paper.draw_rect(paper_rect,Color("f4e3ba"))
	for i in range(2):
		if targets[i].has_focus() or targets[i].is_hovered():
			paper.draw_rect(Rect2(targets[i].position+Vector2(3,3),targets[i].size-Vector2(6,6)),Color("294f44"),false,2)

func snapshot() -> Dictionary:
	var out := {"visible":is_visible_in_tree(),"layout_pending":layout_pending}
	if not is_visible_in_tree(): return out
	var buttons: Array[Button] = []
	buttons.append_array(choices)
	buttons.append_array(targets)
	buttons.append_array(lifts)
	buttons.append_array([palette_button,music_button,back_button,page_button])
	var detail: Dictionary = game.activity_detail_snapshot(reader,panel,buttons)
	var snaps: Array = detail.buttons
	for i in range(3):
		var id: String = PAGES[scene_page][i] if i < PAGES[scene_page].size() else ""
		snaps[i]["text"] = NAMES.get(id,"")
		snaps[i]["role"] = "choice:"+id
		var row: Control = choices[i].get_child(0)
		snaps[i]["text_fits"] = choices[i].get_global_rect().grow(1).encloses(row.get_global_rect())
	for i in range(2):
		snaps[3+i]["role"] = "target:"+SLOTS[i]
		snaps[5+i]["role"] = "lift:"+SLOTS[i]
	for i in range(4): snaps[7+i]["role"] = ["palette","music","back","page"][i]
	out.merge({"panel":game.control_snapshot(panel),"reader":detail,"buttons":snaps,"page":scene_page,"selected":selected,"scenes":game.mural_scenes.duplicate(),"paper":game.rect_snapshot(Rect2(paper.global_position+paper_rect.position,paper_rect.size)),"focus_within":get_viewport().gui_get_focus_owner()!=null and is_ancestor_of(get_viewport().gui_get_focus_owner())})
	return out
