extends Control
## Visit-only suspension. Active remains the sole world/travel owner; nothing here is saved.
const TITLES := ["Halloween: Lantern Procession", "Election Walk: November 2024", "Power stories", "Two Dogs Home"]
var game: Node
var panel: PanelContainer
var entries: Array[Button] = []
var saved_visibility: Dictionary = {}
var page := 0
var snapshot_clock := 0.0
var back: Button
var earlier: Button
var later: Button
var explore: Button
var follow: Button
var reader: RichTextLabel
var return_story: Control
var opened_from_reader := false
var suspended: Dictionary = {}
var completed: Dictionary = {}
var lantern_invited := false
var invitation_followed := false
var layout_pending := false
var footer: GridContainer

func episodes() -> Array:
	return [game.lantern_procession,game.voting_story,game.power_story,game.dog_story]

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
	box.add_theme_constant_override("separation",4)
	panel.add_child(box)
	var title := Label.new()
	title.text="Your story visits"
	title.add_theme_font_size_override("font_size",18)
	box.add_child(title)
	reader=game.make_activity_detail()
	reader.custom_minimum_size=Vector2(0,80)
	reader.add_theme_font_size_override("normal_font_size",16)
	reader.scroll_active=true; reader.focus_mode=Control.FOCUS_ALL
	box.add_child(reader)
	for i in range(TITLES.size()):
		var index := i
		entries.append(make_button(box,TITLES[i],func(): select_story(index)))
	var row := HBoxContainer.new()
	box.add_child(row)
	earlier=make_button(row,"Earlier",func(): change_page(-1))
	later=make_button(row,"Later",func(): change_page(1))
	footer=GridContainer.new(); footer.columns=1
	box.add_child(footer)
	follow=make_button(footer,"Follow this invitation",follow_invitation)
	follow.accessibility_name="Follow Imani's invitation: Lantern Procession"
	follow.tooltip_text=follow.accessibility_name
	explore=make_button(footer,"Keep exploring",keep_exploring)
	back=make_button(footer,"Back to stories",back_to_stories)
	resized.connect(queue_layout)
	panel.minimum_size_changed.connect(queue_layout)
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
	if not game.block_opened or game.startup_story_pending or game.is_story_card_visible(): return
	var previous: Control=game.active_story_episode()
	for episode in episodes():
		if episode!=null and episode.visible: previous=episode
	if game.is_focused_activity_visible() and (previous==null or not previous.visible):
		game.announce_a11y_status("Close the current activity before choosing a story visit.")
		return
	game.stop_walking()
	game.close_phone_disclosure(false)
	return_story=previous
	opened_from_reader=previous!=null and previous.visible
	if previous!=null and previous.visible: previous.close_story(false)
	remember_completed()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false; game.orbit_dragging=false
	refresh()
	if follow.visible and not follow.disabled: follow.grab_focus()
	elif not entries[page*2].disabled: entries[page*2].grab_focus()
	else: back.grab_focus()
	game.announce_a11y_status("Your story visits. "+reader.text)

func back_to_stories() -> void:
	var previous := return_story
	close_picker()
	if opened_from_reader and is_instance_valid(previous): previous.open_story()
	else: game.announce_a11y_status("Back to the street. Story choices are unchanged.")

func change_page(delta: int) -> void:
	page=clampi(page+delta,0,1)
	refresh()
	if not entries[page*2].disabled: entries[page*2].grab_focus()
	else: back.grab_focus()

func close_picker() -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	saved_visibility.clear()
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	if game.block_close_btn.is_visible_in_tree(): game.block_close_btn.grab_focus()

func refresh() -> void:
	if not visible: return
	page=clampi(page,0,1)
	remember_completed()
	var list := episodes()
	var accomplishments: PackedStringArray=[]
	for i in range(entries.size()):
		var episode: Node=list[i]
		entries[i].visible=i/2==page
		entries[i].disabled=episode==null or not episode.available()
		var status := "Continue" if episode!=null and episode.active else ("Resume" if suspended.has(episode) else "Visit")
		entries[i].text=status+": "+TITLES[i]
		entries[i].accessibility_name=entries[i].text+". Progress for this visit only."
		entries[i].tooltip_text=entries[i].accessibility_name
		if completed.has(i): accomplishments.append(String(completed[i]))
	var detail := ""
	if lantern_invited:
		detail+='Imani: "Pippin and Junebug are home. Come make a lantern with us whenever you are ready." Personal invitation: Lantern Procession is still available.\n'
	if not accomplishments.is_empty(): detail+="Completed this visit: "+", ".join(accomplishments)+".\n"
	detail+="Switch stories without losing this visit's choices. Travel stops; only your chosen story is shown. End clears that story's play state; reload clears all visits and invitations. F8 resumes your active story, or a paused Power visit; Shift F8 opens these choices."
	game.set_activity_detail(reader,detail)
	follow.visible=lantern_invited
	follow.disabled=not game.lantern_procession.available()
	earlier.disabled=page==0; later.disabled=page==1
	queue_layout()

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true
	fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size()
	footer.columns=3 if vp.x>=520 and vp.y<500 else 1
	panel.size=Vector2(minf(460,vp.x-16),0)
	reader.custom_minimum_size.y=80 if vp.y>=500 else 64
	panel.size.y=panel.get_combined_minimum_size().y
	panel.position=(vp-panel.size)/2

func snapshot() -> Dictionary:
	var paused: Array[int]=[]
	var list := episodes()
	for i in range(list.size()):
		if suspended.has(list[i]): paused.append(i)
	return {"visible":visible,"page":page,"panel":game.control_snapshot(panel),"entries":entries.map(func(b): return game.control_snapshot(b).merged({"text":b.text})),"back":game.control_snapshot(back),"earlier":game.control_snapshot(earlier),"later":game.control_snapshot(later),"explore":game.control_snapshot(explore),"follow":game.control_snapshot(follow),"reader":game.control_snapshot(reader),"text":reader.text,"scroll":reader.get_v_scroll_bar().value,"suspended":paused,"completed":completed.keys(),"lantern_invited":lantern_invited,"invitation_followed":invitation_followed,"layout_pending":layout_pending}

func add_reader_entry(episode: Node) -> Button:
	var parent: Node=episode.heading.get_parent()
	var row := HBoxContainer.new()
	parent.add_child(row); parent.move_child(row,0)
	episode.heading.reparent(row)
	episode.heading.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	var entry := make_button(row,"Other\nstories",open_picker)
	entry.custom_minimum_size.x=100
	entry.size_flags_horizontal=Control.SIZE_SHRINK_END
	entry.accessibility_name="Other story visits. Keep this visit's progress. Shift F8."
	return entry

func remember_completed() -> void:
	var list := episodes()
	for i in range(list.size()):
		if list[i]!=null and list[i].won:
			completed[i]=("Larkin 2017" if list[i].historical else "Lights Back On") if list[i]==game.power_story else TITLES[i]

func offer_lantern() -> void:
	# Called only by the genuine reunion, not by loading a profile or opening the picker.
	if lantern_invited: return
	lantern_invited=true; completed[episodes().find(game.dog_story)]="Two Dogs Home"

func sync_world(episode: Node) -> void:
	if episode==game.voting_story: episode.update_art()
	else: episode.update_world()
	if episode==game.power_story: game.apply_time_of_day()

func suspend_story(episode: Node) -> void:
	if episode==null or not episode.active: return
	remember_completed()
	episode.cancel_intent()
	episode.active=false; suspended[episode]=true
	if episode==game.power_story:
		for i in range(episode.fixtures.size()): episode.fixtures[i].material_override=episode.originals[i]
	sync_world(episode)

func resume_existing(episode: Node) -> void:
	if not suspended.has(episode) or game.active_story_episode()!=null or not episode.available(): return
	suspended.erase(episode)
	episode.cancel_intent(); episode.active=true
	# No Begin/reset, route, timer, save or camera command is part of resuming.
	sync_world(episode)

func select_story(index: int) -> bool:
	if not visible or index<0 or index>=entries.size(): return false
	var selected: Node=episodes()[index]
	if selected==null or not selected.available(): return false
	game.stop_walking()
	var current: Node=game.active_story_episode()
	var prior_reader := opened_from_reader
	var prior_story := return_story
	if current!=selected: suspend_story(current)
	close_picker()
	resume_existing(selected)
	if selected.open_story(): return true
	# A refused open cannot silently change the story owner or consume an invitation.
	if selected!=current: suspend_story(selected)
	if current!=null: resume_existing(current)
	open_picker()
	return_story=prior_story; opened_from_reader=prior_reader
	game.announce_a11y_status("That story could not open. Your previous visit is kept.")
	return false

func follow_invitation() -> void:
	if not visible or not lantern_invited or not game.lantern_procession.available(): return
	if select_story(episodes().find(game.lantern_procession)): invitation_followed=true

func keep_exploring() -> void:
	if not visible: return
	game.stop_walking(); suspend_story(game.active_story_episode()); close_picker()
	game.show_block_panel(false)
	game.update_walking_status()
	if game.walk_control.is_visible_in_tree(): game.walk_control.grab_focus()
	game.announce_a11y_status("Keep exploring. Your story choices and invitations stay for this visit. Reload starts them fresh.")

func reset_visit() -> void:
	close_picker()
	suspended.clear(); completed.clear()
	lantern_invited=false; invitation_followed=false; return_story=null; opened_from_reader=false; page=0

func _process(delta: float) -> void:
	if not visible: return
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false

	snapshot_clock+=delta
	if snapshot_clock>=0.2:
		snapshot_clock=0
		game.sync_web_a11y_status()
