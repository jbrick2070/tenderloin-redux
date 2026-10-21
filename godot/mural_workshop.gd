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
var canvas_grid: GridContainer
var feedback: RichTextLabel
var palette_button: Button
var music_button: Button
var done_button: Button
var tool_buttons: Array[Button] = []
var cells: Array[Button] = []
var layout_pending := false
var layout_busy := false

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
		b.tooltip_text = "%s's %s. Choose this contribution, then a space." % [credit, id.capitalize()]
		tool_buttons.append(b)
	canvas_grid = GridContainer.new()
	canvas_grid.columns = 6
	canvas_grid.add_theme_constant_override("h_separation", 2)
	canvas_grid.add_theme_constant_override("v_separation", 2)
	canvas_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(canvas_grid)
	for row in range(3):
		for col in range(6):
			var b := button(canvas_grid, "+\n%d,%d" % [col + 1, row + 1], func(): cell_selected.emit(col, row))
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
	done_button = button(outer, "Back to street", func(): close_requested.emit())
	# This is a focused editing surface, so keyboard traversal stays inside it.
	var focus_ring: Array[Control] = [feedback]
	for b in tool_buttons: focus_ring.append(b)
	for b in cells: focus_ring.append(b)
	focus_ring.append_array([palette_button, music_button, done_button])
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
	game.set_activity_detail(feedback, model.message)
	palette_button.text = "Palette: %s" % String(model.palette).capitalize()
	music_button.text = "Music: On" if model.music else "Music: Off"
	for i in range(3):
		tool_buttons[i].set_pressed_no_signal(["sun", "wave", "rise"][i] == model.selected)
	var ink := Color("1b3036")
	var canvas: Color = model.canvas_color
	for i in range(cells.size()):
		var col := i % 6
		var row := i / 6
		var occupant := ""
		for id in ["sun", "wave", "rise"]:
			if model.placements.has(id) and int(model.placements[id].col) == col and int(model.placements[id].row) == row:
				occupant = id
		var b := cells[i]
		b.text = "%s\n%d,%d" % [occupant.capitalize() if not occupant.is_empty() else "+", col + 1, row + 1]
		b.tooltip_text = "Column %d, row %d: %s" % [col + 1, row + 1, occupant if not occupant.is_empty() else "empty"]
		b.set_meta("occupant", occupant)
		var color: Color = {"sun": Color("f8cc58"), "wave": Color("91bac2"), "rise": Color("dba0a8")}.get(occupant, canvas.lightened(0.6))
		var normal := StyleBoxFlat.new()
		normal.bg_color = color
		normal.border_color = Color("435a58")
		normal.set_border_width_all(1)
		normal.set_corner_radius_all(3)
		normal.set_content_margin_all(2)
		b.add_theme_stylebox_override("normal", normal)
		for state in ["hover", "pressed", "hover_pressed"]:
			var active: StyleBoxFlat = normal.duplicate()
			active.bg_color = color.darkened(0.03) if state == "pressed" else color.lightened(0.05)
			b.add_theme_stylebox_override(state, active)
		for state in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color"]:
			b.add_theme_color_override(state, ink)
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
	layout_busy = true
	var vp := game.bubble_viewport_size() as Vector2
	var short_wide := vp.x >= 520 and vp.y < 560
	body.columns = 2 if short_wide else 1
	tools.columns = 1 if short_wide else 3
	var width := minf(680, vp.x - 24)
	panel.size.x = width
	var fixed_height: float = title.get_combined_minimum_size().y + attribution.get_combined_minimum_size().y + done_button.get_combined_minimum_size().y + 28
	scroll.custom_minimum_size.y = minf(content.get_combined_minimum_size().y, maxf(44, vp.y - 24 - fixed_height))
	panel.size = Vector2(width, 0)
	panel.position = (vp - panel.size) * 0.5
	layout_busy = false

func snapshot() -> Dictionary:
	var result := {"visible": is_visible_in_tree(), "layout_pending": layout_pending}
	if not is_visible_in_tree():
		return result
	result["panel"] = game.control_snapshot(panel)
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
		entries.append(entry)
	result["cells"] = entries
	return result
