extends Control
## Paged original episode gateway; no additional main-hub navigation sibling.
var game: Node
var panel: PanelContainer
var entries: Array[Button] = []
var saved_visibility: Dictionary = {}
var page := 0
var snapshot_clock := 0.0
var back: Button
var earlier: Button
var later: Button

func setup(owner_game: Node) -> void:
	game=owner_game
	name="NeighborhoodStories"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=109
	var shade := ColorRect.new()
	shade.color=Color(0.02,0.06,0.09,0.82)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	panel=PanelContainer.new()
	panel.add_theme_stylebox_override("panel",game.panel_bg_style)
	add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation",6)
	panel.add_child(box)
	var title := Label.new()
	title.text="Neighborhood stories"
	title.add_theme_font_size_override("font_size",18)
	box.add_child(title)
	var parade := make_button(box,"Halloween: Lantern Procession",func(): close_picker(); game.lantern_procession.open_story())
	entries.append(parade)
	var row := HBoxContainer.new()
	box.add_child(row)
	earlier=make_button(row,"Earlier",func(): change_page(-1))
	later=make_button(row,"Later",func(): change_page(1))
	back=make_button(box,"Back to stories",back_to_stories)
	resized.connect(refresh)
	hide()

func make_button(parent: Node,text: String,callback: Callable) -> Button:
	var b := Button.new()
	b.text=text; b.accessibility_name=text; b.tooltip_text=text
	b.custom_minimum_size=Vector2(44,44)
	b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	game.style_game_button(b)
	b.pressed.connect(callback)
	parent.add_child(b)
	return b

func open_picker() -> void:
	if visible: return
	if game.active_story_episode()!=null or game.is_focused_activity_visible() or not game.current_path.is_empty():
		game.announce_a11y_status("Finish arriving and close the active story before choosing another.")
		return
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false; game.orbit_dragging=false
	refresh()
	if not entries[page*3].disabled: entries[page*3].grab_focus()
	else: back.grab_focus()

func back_to_stories() -> void:
	close_picker()
	game.power_story.open_story()
	game.power_story.more_entry.grab_focus()

func change_page(delta: int) -> void:
	page+=delta
	refresh()
	entries[page*3].grab_focus()

func close_picker() -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	if game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()

func refresh() -> void:
	if not visible: return
	page=clampi(page,0,maxi(0,(entries.size()-1)/3))
	for i in range(entries.size()): entries[i].visible=i/3==page
	entries[0].disabled=not game.lantern_procession.available()
	earlier.get_parent().visible=entries.size()>3
	earlier.disabled=page==0
	later.disabled=(page+1)*3>=entries.size()
	var vp: Vector2=game.bubble_viewport_size()
	panel.size=Vector2(minf(420,vp.x-16),0)
	panel.size.y=panel.get_combined_minimum_size().y
	panel.position=(vp-panel.size)/2

func snapshot() -> Dictionary:
	return {"visible":visible,"page":page,"panel":game.control_snapshot(panel),"entries":entries.map(func(b): return game.control_snapshot(b)),"back":game.control_snapshot(back)}

func _process(delta: float) -> void:
	if not visible: return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false

	snapshot_clock+=delta
	if snapshot_clock>=0.2:
		snapshot_clock=0
		game.sync_web_a11y_status()
