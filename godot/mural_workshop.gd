extends Control
## Original presentation for the existing three-motif mural rules.
signal contribution_selected(id: String)
signal cell_selected(col: int, row: int)
signal palette_requested
signal music_requested
signal close_requested

var game: Node
var panel: PanelContainer
var title: Label
var attribution: Label
var scroll: ScrollContainer
var content: VBoxContainer
var body: GridContainer
var tools: GridContainer
var canvas_sheet: GridContainer
var signature
var canvas_grid: GridContainer
var feedback: RichTextLabel
var palette_button: Button
var music_button: Button
var done_button: Button
var stories_entry: Button
var stories
var tool_buttons: Array[Button] = []
var cells: Array[Button] = []
var layout_pending := false
var layout_busy := false
var art_model: Dictionary = {}
var hovered_cell := -1
var position_caption := ""
const PAPER := Color("f4e3ba")
const INK := Color("294f44")
const MOTIF_IDS := ["sun", "wave", "rise"]

func setup(owner_game: Node) -> void:
	game = owner_game
	name = "MuralWorkshop"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	z_index = 100
	var shade := ColorRect.new()
	shade.color = Color(0.02, 0.04, 0.06, 0.91)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	panel = PanelContainer.new()
	var frame: StyleBoxFlat = game.panel_bg_style.duplicate()
	frame.set_content_margin_all(8)
	frame.bg_color = Color("182c31")
	frame.border_color = Color("b58e5d")
	frame.set_border_width_all(1)
	frame.set_corner_radius_all(12)
	panel.add_theme_stylebox_override("panel", frame)
	add_child(panel)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 4)
	panel.add_child(outer)
	title = Label.new()
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size", 16)
	title.add_theme_color_override("font_color", Color("ffe082"))
	outer.add_child(title)
	attribution = Label.new()
	attribution.text = "Fictional portable art | City: DataSF/PDDL | Streets: OSM/ODbL"
	attribution.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	attribution.add_theme_font_size_override("font_size", 10)
	outer.add_child(attribution)
	scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	outer.add_child(scroll)
	content = VBoxContainer.new()
	content.add_theme_constant_override("separation", 4)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(content)
	feedback = game.make_activity_detail()
	feedback.custom_minimum_size.y = 36
	feedback.add_theme_font_size_override("normal_font_size", 12)
	content.add_child(feedback)
	body = GridContainer.new()
	body.add_theme_constant_override("h_separation", 8)
	body.add_theme_constant_override("v_separation", 4)
	content.add_child(body)
	tools = GridContainer.new()
	tools.add_theme_constant_override("h_separation", 2)
	tools.add_theme_constant_override("v_separation", 2)
	tools.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(tools)
	for id in ["sun", "wave", "rise"]:
		var credit: String = {"sun":"Lulu", "wave":"Dez", "rise":"Celeste"}[id]
		var b := button(tools, "%s\n%s" % [credit, id.capitalize()], func(): contribution_selected.emit(id))
		b.toggle_mode = true
		for state in ["normal", "hover", "pressed", "hover_pressed"]:
			var swatch: StyleBoxFlat = b.get_theme_stylebox(state).duplicate()
			swatch.content_margin_left = 32
			swatch.content_margin_right = 4
			swatch.border_color = Color("b58e5d")
			swatch.set_border_width_all(1)
			swatch.set_corner_radius_all(6)
			swatch.bg_color = Color("3e504c") if state in ["pressed", "hover_pressed"] else Color("20373b")
			b.add_theme_stylebox_override(state, swatch)
		b.draw.connect(func(): draw_motif(b, id, Rect2(Vector2(5, b.size.y * 0.5 - 12), Vector2(24,24)), motif_color(id), 1.0, Color("f4e3ba")))
		b.resized.connect(b.queue_redraw)
		b.tooltip_text = "%s's %s. Choose this contribution, then a space." % [credit, id.capitalize()]
		tool_buttons.append(b)
	canvas_sheet = GridContainer.new()
	canvas_sheet.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	canvas_sheet.add_theme_constant_override("h_separation",0)
	canvas_sheet.add_theme_constant_override("v_separation",0)
	body.add_child(canvas_sheet)
	canvas_grid = GridContainer.new()
	canvas_grid.columns = 6
	canvas_grid.add_theme_constant_override("h_separation", 0)
	canvas_grid.add_theme_constant_override("v_separation", 0)
	canvas_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	canvas_sheet.add_child(canvas_grid)
	signature = preload("res://mural_signature.gd").new()
	canvas_sheet.add_child(signature)
	signature.setup_signature()
	canvas_grid.draw.connect(draw_canvas)
	canvas_grid.resized.connect(canvas_grid.queue_redraw)
	for row in range(3):
		for col in range(6):
			var b := button(canvas_grid, "", func(): cell_selected.emit(col, row))
			b.size_flags_vertical = Control.SIZE_EXPAND_FILL
			for state in ["normal", "hover", "pressed", "hover_pressed", "focus"]:
				b.add_theme_stylebox_override(state, StyleBoxEmpty.new())
			b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
			var index := row * 6 + col
			b.mouse_entered.connect(func(): hovered_cell = index; canvas_grid.queue_redraw())
			b.mouse_exited.connect(func(): hovered_cell = -1; canvas_grid.queue_redraw())
			b.focus_entered.connect(func(): focus_canvas_cell(index))
			b.focus_exited.connect(canvas_grid.queue_redraw)
			cells.append(b)
	for row in range(3):
		for col in range(6):
			var b := cells[row * 6 + col]
			b.focus_neighbor_left = b.get_path_to(cells[row * 6 + maxi(0, col - 1)])
			b.focus_neighbor_right = b.get_path_to(cells[row * 6 + mini(5, col + 1)])
			b.focus_neighbor_top = b.get_path_to(cells[maxi(0, row - 1) * 6 + col])
			b.focus_neighbor_bottom = b.get_path_to(cells[mini(2, row + 1) * 6 + col])
	var options := GridContainer.new()
	options.columns = 2
	options.add_theme_constant_override("h_separation", 4)
	content.add_child(options)
	palette_button = button(options, "Palette: Garden", func(): palette_requested.emit())
	music_button = button(options, "Music: Off", func(): music_requested.emit())
	var footer := HBoxContainer.new()
	outer.add_child(footer)
	stories_entry = button(footer, "Paint Scenes", open_stories)
	done_button = button(footer, "Back to Celeste", func(): close_requested.emit())
	stories = preload("res://mural_stories.gd").new()
	add_child(stories)
	stories.setup(game,self)
	# This is a focused editing surface, so keyboard traversal stays inside it.
	var focus_ring: Array[Control] = [feedback]
	for b in tool_buttons: focus_ring.append(b)
	for b in cells: focus_ring.append(b)
	focus_ring.append_array([palette_button, music_button, stories_entry, done_button])
	for i in range(focus_ring.size()):
		var node := focus_ring[i]
		node.focus_next = node.get_path_to(focus_ring[(i + 1) % focus_ring.size()])
		node.focus_previous = node.get_path_to(focus_ring[posmod(i - 1, focus_ring.size())])
		if node.get_parent() != canvas_grid:
			for direction in ["left", "right", "top", "bottom"]:
				var step := -1 if direction in ["left", "top"] else 1
				node.set("focus_neighbor_" + direction, node.get_path_to(focus_ring[posmod(i + step, focus_ring.size())]))
	for node in [panel, content, title, attribution]:
		node.minimum_size_changed.connect(queue_layout)
	visible = false

func open_stories() -> void:
	panel.visible = false
	stories.visible = true
	stories.scene_page = 0
	stories.selected = "cooking"
	stories.thumbnail_palette = ""
	stories.message = "Choose any two of five illustrated scenes, then the left or right half. Music & Garden shows more scenes. Lifting keeps the original three marks."
	stories.scroll.scroll_vertical = 0
	stories.present()
	stories.choices[0].grab_focus()
	game.announce_a11y_status("Mural Stories. Food and art page 1 of 2. Music & Garden shows two more scenes. Choose any two scenes, then a half of the paper. Escape returns to Mural Workshop.")

func close_stories() -> void:
	reset_mode()
	present(art_model)
	stories_entry.grab_focus()
	game.announce_a11y_status("Back to Mural Workshop. "+game.mural_scene_reply())

func reset_mode() -> void:
	stories.visible = false
	stories.layout_generation += 1
	stories.layout_pending = false
	stories.layout_dirty = false
	panel.visible = true
	queue_layout()

func button(parent: Node, caption: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = caption
	b.custom_minimum_size = Vector2(44, 44)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.focus_mode = Control.FOCUS_ALL
	game.style_game_button(b)
	b.add_theme_font_size_override("font_size", 12)
	for style_name in ["normal", "hover", "pressed", "disabled"]:
		var style: StyleBox = b.get_theme_stylebox(style_name).duplicate()
		style.content_margin_left = 4
		style.content_margin_right = 4
		b.add_theme_stylebox_override(style_name, style)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func present(model: Dictionary) -> void:
	title.text = "Mural Workshop - %d/3 | Sparks: %d" % [model.placements.size(), model.sparks]
	palette_button.text = "Palette: %s" % String(model.palette).capitalize()
	music_button.text = "Music: On" if model.music else "Music: Off"
	for i in range(3):
		tool_buttons[i].set_pressed_no_signal(["sun", "wave", "rise"][i] == model.selected)
	art_model = model.duplicate(true)
	for i in range(cells.size()):
		var col := i % 6
		var row := i / 6
		var occupant := ""
		for id in MOTIF_IDS:
			if model.placements.has(id) and int(model.placements[id].col) == col and int(model.placements[id].row) == row:
				occupant = id
		var b := cells[i]
		b.text = ""
		b.tooltip_text = "Column %d, row %d: %s" % [col + 1, row + 1, occupant.capitalize() if not occupant.is_empty() else "open canvas"]
		b.accessibility_name = b.tooltip_text
		b.accessibility_description = "Place or move the selected neighbor's mark here. Arrow keys explore the canvas."
		b.set_meta("occupant", occupant)
	refresh_position_caption()
	for b in tool_buttons: b.queue_redraw()
	canvas_grid.queue_redraw()
	if stories.visible: stories.present()
	queue_layout()

func queue_layout() -> void:
	if not visible or layout_pending or layout_busy:
		return
	layout_pending = true
	finish_layout.call_deferred()

func finish_layout() -> void:
	layout_pending = false
	if not visible:
		return
	if stories.visible:
		stories.queue_layout()
		return
	layout_busy = true
	var vp := game.bubble_viewport_size() as Vector2
	var short_wide := vp.x >= 520 and vp.y < 560
	body.columns = 2 if short_wide else 1
	tools.columns = 1 if short_wide else 3
	tools.size_flags_horizontal = Control.SIZE_FILL if short_wide else Control.SIZE_EXPAND_FILL
	canvas_sheet.columns = 2 if short_wide else 1
	var pal: Array = game.KEEPSAKE_PALETTE_HEX.get(art_model.get("palette","garden"),game.KEEPSAKE_PALETTE_HEX.garden)
	signature.present(pal,short_wide)
	canvas_grid.custom_minimum_size.y = 136 if short_wide else clampf((minf(680, vp.x - 24) - 16) * 0.506, 160, 336)
	var width := minf(680, vp.x - 24)
	panel.size.x = width
	var fixed_height: float = title.get_combined_minimum_size().y + attribution.get_combined_minimum_size().y + done_button.get_combined_minimum_size().y + 28
	scroll.custom_minimum_size.y = minf(content.get_combined_minimum_size().y, maxf(44, vp.y - 24 - fixed_height))
	panel.size = Vector2(width, 0)
	panel.position = (vp - panel.size) * 0.5
	layout_busy = false
	canvas_grid.queue_redraw()

func snapshot() -> Dictionary:
	var result := {"visible": is_visible_in_tree(), "layout_pending": layout_pending or stories.layout_pending}
	if not is_visible_in_tree():
		return result
	result["panel"] = game.control_snapshot(panel)
	result["stories_entry"] = game.control_snapshot(stories_entry)
	result["stories"] = stories.snapshot()
	if stories.visible:
		result["focus_within"] = result["stories"].focus_within
		return result
	var no_buttons: Array[Button] = []
	result["reader"] = game.activity_detail_snapshot(feedback, panel, no_buttons)
	result["tools"] = game.activity_detail_snapshot(feedback, panel, tool_buttons).buttons
	for i in range(tool_buttons.size()):
		result["tools"][i]["selected"] = tool_buttons[i].button_pressed
	var options: Array[Button] = [palette_button, music_button, done_button]
	result["options"] = game.activity_detail_snapshot(feedback, panel, options).buttons
	var focused_control := get_viewport().gui_get_focus_owner()
	result["focused_cell"] = cells.find(focused_control as Button) if focused_control is Button else -1
	result["focus_within"] = focused_control != null and is_ancestor_of(focused_control)
	var entries: Array[Dictionary] = []
	for i in range(cells.size()):
		var b := cells[i]
		var single: Array[Button] = [b]
		var entry: Dictionary = game.activity_detail_snapshot(feedback, panel, single).buttons[0]
		entry["col"] = i % 6
		entry["row"] = i / 6
		entry["occupant"] = b.get_meta("occupant", "")
		entry["accessible_name"] = b.accessibility_name
		entries.append(entry)
	result["cells"] = entries
	result["signature"] = signature.ink_snapshot()
	result["art"] = art_snapshot()
	result["position_caption"] = position_caption
	return result

# All brush offsets are fixed functions of the point index: redraws never shimmer.
# These original 2D marks follow the project's keepsake, not real public artworks.
func paper_color() -> Color:
	return PAPER.lerp(art_model.get("canvas_color", Color("316050")), 0.12)

func motif_color(id: String) -> Color:
	var palette: Array = game.KEEPSAKE_PALETTE_HEX.get(art_model.get("palette", "garden"), game.KEEPSAKE_PALETTE_HEX.garden)
	return Color(palette[MOTIF_IDS.find(id)])

func focus_canvas_cell(index: int) -> void:
	if not visible or art_model.is_empty(): return
	hovered_cell = -1
	refresh_position_caption()
	game.announce_a11y_status(position_caption + ". " + String(art_model.selected).capitalize() + " selected. Space paints; Escape returns to Celeste's easel.")
	canvas_grid.queue_redraw()

func motif_rect(index: int) -> Rect2:
	var cell := cells[index].get_rect()
	var mark_size := Vector2(cell.size.x - 10, cell.size.y - 14)
	return Rect2(cell.get_center() - mark_size * 0.5, mark_size)

func focused_canvas_cell() -> int:
	var focused := get_viewport().gui_get_focus_owner()
	return cells.find(focused as Button) if focused is Button else -1

func active_canvas_cell() -> int:
	# Keyboard owns its guide even when a mouse is hovering elsewhere.
	var focused := focused_canvas_cell()
	return focused if focused >= 0 else hovered_cell

func preview_canvas_cell() -> int:
	return hovered_cell if hovered_cell >= 0 else focused_canvas_cell()

func refresh_position_caption() -> void:
	var focused := focused_canvas_cell()
	position_caption = cells[focused].accessibility_name if focused >= 0 else ""
	var prefix := position_caption + ". " if not position_caption.is_empty() else ""
	game.set_activity_detail(feedback, prefix + String(art_model.message))

func brush_line(surface: CanvasItem, points: PackedVector2Array, color: Color, width: float, alpha: float, key: Color = INK) -> void:
	# Ink keyline makes light pigments readable on paper, even in Ocean.
	surface.draw_polyline(points, Color(key, alpha), width + 2.4, true)
	surface.draw_polyline(points, Color(color, alpha), width, true)
	for point in [points[0], points[points.size()-1]]:
		surface.draw_circle(point, (width + 2.4) * 0.5, Color(key, alpha), true, -1, true)
		surface.draw_circle(point, width * 0.5, Color(color, alpha), true, -1, true)

func draw_motif(surface: CanvasItem, id: String, rect: Rect2, color: Color, alpha: float = 1.0, key: Color = INK) -> void:
	# Reserve the reported layout box for complete strokes plus rounded keylines.
	rect = rect.grow(-3)
	var center := rect.get_center()
	var unit := minf(rect.size.x, rect.size.y)
	var stroke := maxf(1.8, unit * 0.065)
	if id == "sun":
		for i in range(8):
			var angle := i * TAU / 8.0 - 0.12
			var ray := Vector2(cos(angle), sin(angle))
			brush_line(surface, PackedVector2Array([center + ray * unit * 0.19, center + ray * unit * (0.43 + (i % 2) * 0.035)]), color, stroke, alpha, key)
		surface.draw_circle(center, unit * 0.12 + 1.2, Color(key, alpha), true, -1, true)
		surface.draw_circle(center, unit * 0.12, Color(color, alpha), true, -1, true)
	elif id == "wave":
		for ribbon in range(2):
			var points := PackedVector2Array()
			for i in range(25):
				var t := i / 24.0
				points.append(Vector2(rect.position.x + rect.size.x * (0.06 + t * 0.88), center.y + (ribbon - 0.5) * unit * 0.33 + sin(t * TAU - 0.5) * unit * 0.15))
			brush_line(surface, points, color, stroke, alpha, key)
	else:
		# Hand-lettered RISE; ascending baselines echo the original 3D steps.
		var paths := [
			[Vector2(0,1),Vector2(0,0),Vector2(.45,0),Vector2(.6,.2),Vector2(.42,.43),Vector2(0,.43),Vector2(.65,1)],
			[Vector2(.18,0),Vector2(.18,1)],
			[Vector2(.6,.07),Vector2(.1,0),Vector2(0,.38),Vector2(.53,.52),Vector2(.57,.88),Vector2(.1,1),Vector2(0,.9)],
			[Vector2(.62,0),Vector2(0,0),Vector2(0,1),Vector2(.62,1)],
			[Vector2(0,.48),Vector2(.5,.48)]]
		for n in range(paths.size()):
			var letter := mini(n,3)
			var points := PackedVector2Array()
			for point in paths[n]:
				points.append(Vector2(rect.position.x + rect.size.x * (0.05 + letter * 0.24 + point.x * 0.28), center.y - unit * 0.28 - letter * unit * .045 + point.y * unit * .65))
			brush_line(surface, points, color, maxf(1.5, stroke * .85), alpha, key)

func draw_canvas() -> void:
	if cells.size() != 18 or art_model.is_empty(): return
	var bounds := Rect2(Vector2.ZERO, canvas_grid.size)
	var paper := paper_color()
	canvas_grid.draw_rect(bounds, paper)
	# Wide dry-brush washes and quiet paper flecks, not a tile background.
	for i in range(9):
		var y := bounds.size.y * (0.10 + i * 0.101)
		var points := PackedVector2Array([Vector2(3,y), Vector2(bounds.size.x * .35,y+sin(i*1.7)*2), Vector2(bounds.size.x-3,y+cos(i)*2)])
		canvas_grid.draw_polyline(points, Color(PAPER, .20), 3.0 + (i % 3), true)
	for i in range(80):
		var point := Vector2(4 + fmod(i * 43.17, maxf(1,bounds.size.x-8)), 4 + fmod(i * 29.31, maxf(1,bounds.size.y-8)))
		canvas_grid.draw_circle(point, .45, Color(INK,.09), true, -1, true)
	var active := preview_canvas_cell()
	for i in range(cells.size()):
		var id: String = cells[i].get_meta("occupant", "")
		if not id.is_empty():
			draw_motif(canvas_grid, id, motif_rect(i), motif_color(id))
		else:
			canvas_grid.draw_circle(cells[i].get_rect().get_center(), 1.3, Color(INK,.36), true, -1, true)
			if i == active: draw_motif(canvas_grid, art_model.selected, motif_rect(i), motif_color(art_model.selected), .28)
	var focused := focused_canvas_cell()
	if focused >= 0: draw_canvas_guide(focused, 2)
	if hovered_cell >= 0 and hovered_cell != focused: draw_canvas_guide(hovered_cell, 1)
	canvas_grid.draw_rect(bounds.grow(-1), Color("b58e5d"), false, 2)

func draw_canvas_guide(index: int, width: int) -> void:
	var guide := cells[index].get_rect().grow(-3)
	var focus := StyleBoxFlat.new()
	focus.bg_color = Color.TRANSPARENT
	focus.border_color = INK
	focus.set_border_width_all(width)
	focus.set_corner_radius_all(7)
	canvas_grid.draw_style_box(focus, guide)

func art_snapshot() -> Dictionary:
	var marks: Array[Dictionary] = []
	for i in range(cells.size()):
		var id: String = cells[i].get_meta("occupant", "")
		if not id.is_empty():
			var rect := motif_rect(i)
			rect.position += canvas_grid.global_position
			var mark: Dictionary = game.rect_snapshot(rect)
			mark.merge({"id":id,"col":i%6,"row":i/6,"color":motif_color(id).to_html(false)})
			marks.append(mark)
	return {"canvas": game.control_snapshot(canvas_grid), "motifs":marks, "slot_marks":18-marks.size(), "active_cell":preview_canvas_cell(), "guide_cell":active_canvas_cell(), "hover_cell":hovered_cell, "focus_cell":focused_canvas_cell(), "paper":paper_color().to_html(false), "ink":INK.to_html(false), "language":"original starburst, flowing Wave, hand-lettered RISE"}
