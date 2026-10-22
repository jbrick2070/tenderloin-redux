extends Control
## Presentation for the existing hosted beats; practice never enters the save model.
var game: Node
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var objective: Label
var reader: RichTextLabel
var pads: Array[Button] = []
var options: Array[Button] = []
var entry: Button
var worlds: Array[Node3D] = []
var lamps: Array[Array] = []
var players: Array[Node3D] = []
var saved_visibility: Dictionary = {}
var practice := false
var practice_pattern := 0
var step_cues := false
var active_step := -1
var rendered_pattern := -1
var return_pose: Array = []
var owns_view := false
var drag_start := Vector2.ZERO
var dragging := false
var scene_rect := Rect2()
var layout_pending := false
var entry_layout_pending := false
var entry_layout_generation := 0
var message := ""
var snapshot_clock := 0.0
var music_state := ""
var chapter_completion_notice := ""
var return_focus: Control
var resized_while_open := false
var restore_generation := 0
var audition
const HIT := Color("ffd076")
const REST := Color("4a6873")

func setup(owner_game: Node, layer: CanvasLayer) -> void:
	game = owner_game
	audition = preload("res://rhythm_bar.gd").new()
	add_child(audition)
	audition.setup()
	audition.finished.connect(func():
		audition.stop()
		game.apply_music_volume_db()
		if visible:
			message = "Your bar is complete. The original sketch continues."
			refresh()
			game.announce_a11y_status(message)
	)
	name = "RhythmCircle"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	z_index = 101
	top = frame()
	var title_box := VBoxContainer.new()
	title_box.add_theme_constant_override("separation", 2)
	top.add_child(title_box)
	heading = label(title_box, "Dez's Rhythm Circle", 17)
	objective = label(title_box, "", 12)
	label(title_box, "Fictional visiting players | City: DataSF/PDDL | Streets: OSM/ODbL", 10)
	tray = frame()
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	tray.add_child(box)
	reader = game.make_activity_detail()
	reader.custom_minimum_size.y = 36
	reader.add_theme_font_size_override("normal_font_size", 12)
	box.add_child(reader)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 3)
	grid.add_theme_constant_override("v_separation", 3)
	box.add_child(grid)
	for i in range(8):
		var b := button(grid, str(i+1), func(): toggle_step(i))
		b.toggle_mode = true
		pads.append(b)
	var actions := GridContainer.new()
	actions.columns = 4
	actions.add_theme_constant_override("h_separation", 3)
	actions.add_theme_constant_override("v_separation", 3)
	box.add_child(actions)
	options.append(button(actions, "Listen", listen))
	options.append(button(actions, "Music", func(): game.toggle_music_playback(); refresh()))
	options.append(button(actions, "View\nCircle", view_circle))
	options.append(button(actions, "Complete", complete))
	options.append(button(actions, "Step cues\nOff", func(): step_cues = not step_cues; refresh()))
	options.append(button(actions, "Back", close_circle))
	options.append(button(actions, "Play\nBar", play_bar))
	var ring: Array[Control] = [reader]
	ring.append_array(pads)
	ring.append_array(options)
	for i in range(ring.size()):
		var c := ring[i]
		c.focus_next = c.get_path_to(ring[(i+1)%ring.size()])
		c.focus_previous = c.get_path_to(ring[posmod(i-1,ring.size())])
		for direction in ["left","right","top","bottom"]:
			c.set("focus_neighbor_"+direction,c.get_path_to(ring[posmod(i+(-1 if direction in ["left","top"] else 1),ring.size())]))
	for i in range(8):
		for direction in ["left","right","top","bottom"]:
			var index := clampi(i + (-4 if direction=="top" else (4 if direction=="bottom" else (-1 if direction=="left" else 1))),0,7)
			pads[i].set("focus_neighbor_"+direction,pads[i].get_path_to(pads[index]))
	entry = Button.new()
	entry.text = "Rhythm\nCircle"
	entry.custom_minimum_size = Vector2(76,44)
	game.style_game_button(entry)
	entry.add_theme_font_size_override("font_size",12)
	entry.pressed.connect(open_circle)
	entry.visible = false
	game.block_page_nav.add_child(entry)
	game.block_page_nav.move_child(entry,game.block_page_nav.get_child_count()-2)
	visible = false
	gui_input.connect(scene_input)
	game.get_viewport().size_changed.connect(func():
		if visible: resized_while_open = true
		queue_layout()
	)

func frame() -> PanelContainer:
	var p := PanelContainer.new()
	var s: StyleBoxFlat = game.panel_bg_style.duplicate()
	s.set_content_margin_all(6)
	s.bg_color = Color("172c32")
	s.border_color = Color("c29e66")
	s.set_border_width_all(1)
	p.add_theme_stylebox_override("panel",s)
	add_child(p)
	return p

func label(parent: Node, text: String, font_size: int) -> Label:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size",font_size)
	parent.add_child(l)
	return l

func button(parent: Node, text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(44,44)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	game.style_game_button(b)
	b.add_theme_font_size_override("font_size",12)
	for state in ["normal","hover","pressed","hover_pressed","disabled"]:
		var style: StyleBox = b.get_theme_stylebox(state).duplicate()
		style.content_margin_left = 2
		style.content_margin_right = 2
		b.add_theme_stylebox_override(state,style)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func build_world() -> void:
	# Same curb-lane footprint, no new colliders, sidewalk props or resident relocation.
	for layout_index in range(2):
		var root := Node3D.new()
		root.name = "RhythmVisitors"
		var parent: Node3D = game.layout_table_node if layout_index == 0 else game.layout_floor_node
		parent.add_child(root)
		worlds.append(root)
		var person: Node3D = game.make_person_node("VisitingPercussionist",Color("ca795b"),Color("9e6848"),Color("2c2832"),1.72,false)
		person.position = Vector3(5.05,0.0 if layout_index == 0 else 0.3,0.25)
		person.rotation.y = -0.588
		root.add_child(person)
		players.append(person)
		for i in range(2):
			var guest: Node3D = game.make_person_node("VisitingListener%d"%i,Color("5fb8a6") if i==0 else Color("9782b8"),Color("bd9271"),Color("343235"),1.55,false)
			guest.position = Vector3(-2.2+float(i)*4.4,0.0,-1.25 if layout_index==0 else -0.7)
			guest.rotation.y = PI*0.35
			root.add_child(guest)
		var instrument := Node3D.new()
		instrument.name = "PortableHandDrum"
		instrument.position = Vector3(4.75,0.3 if layout_index==1 else 0.0,0.7)
		root.add_child(instrument)
		var drum := MeshInstance3D.new()
		var body := CylinderMesh.new()
		body.top_radius = 0.28
		body.bottom_radius = 0.13
		body.height = 0.7
		drum.mesh = body
		drum.position.y = 0.65
		drum.material_override = game.person_material(Color("a96840"))
		instrument.add_child(drum)
		var head := MeshInstance3D.new()
		var skin := CylinderMesh.new()
		skin.top_radius = 0.29
		skin.bottom_radius = 0.29
		skin.height = 0.045
		head.mesh = skin
		head.position.y = 1.02
		head.material_override = game.person_material(Color("f4dbab"))
		instrument.add_child(head)
		var cues: Array = []
		for i in range(8):
			var cue := MeshInstance3D.new()
			cue.name = "RhythmLantern%d"%i
			var mesh := SphereMesh.new()
			mesh.radius = 0.18
			mesh.height = 0.42
			cue.mesh = mesh
			cue.position = Vector3(-4.7+float(i)*1.33,2.56,1.25)
			root.add_child(cue)
			cues.append(cue)
		lamps.append(cues)
	update_world()

func available() -> bool:
	return game.block_opened and (game.current_hosting_activity()=="beats" or game.has_hosted_segment("beats"))

func pattern() -> int:
	if visible and practice:
		return practice_pattern
	if game.current_hosting_activity()=="beats":
		return int(game.hosting_draft.get("pattern",85))
	var result: Variant = game.get_hosted_segment_value("beats")
	return int(result) if result != null else 0

func update_world() -> void:
	var p := pattern()
	var enabled := available()
	var stepping: bool = enabled and visible and step_cues and p!=0 and game.music_playing and game.music_volume>0.0 and game.music_mode=="sketch"
	var queued_frames: float = game.sketch_generator.buffer_length*game.MUSIC_MIX_RATE if game.sketch_playback!=null else 0.0
	var played_frames := maxf(0.0,float(game.sketch_frames_pushed)-queued_frames)
	var step: int = posmod(int(played_frames/(game.MUSIC_STEP_SEC*game.MUSIC_MIX_RATE)),8) if stepping else -1
	if audition_active(): step = clampi(int(audition.get_playback_position()/audition.STEP),0,7)
	if p==rendered_pattern and step==active_step and not worlds.is_empty() and worlds[0].visible==enabled:
		return
	rendered_pattern = p
	active_step = step
	for li in range(worlds.size()):
		worlds[li].visible = enabled
		for i in range(8):
			var hit := (p & (1<<i)) != 0
			var col := HIT if hit else REST
			if i==step and hit: col = Color("fff0ba")
			lamps[li][i].material_override = game.mural_material(col)
			lamps[li][i].scale = Vector3.ONE * (1.25 if i==step and hit else 1.0)
		# Discrete sketch-clock hand poses; static for saved memory, listening, mute and local files.
		var strike := step>=0 and (p & (1<<step))!=0
		var arm := players[li].get_node("LeftArm") as MeshInstance3D
		var hand := players[li].get_node("LeftHand") as MeshInstance3D
		hand.position = Vector3(-0.16,1.02,0.34) if strike else Vector3(-0.24,0.82,0.12)
		var shoulder := Vector3(-0.24,1.31,0)
		arm.position = (shoulder+hand.position)*0.5
		arm.quaternion = Quaternion(Vector3.UP,(shoulder-hand.position).normalized())
		arm.scale.y = shoulder.distance_to(hand.position)/(arm.mesh as CylinderMesh).height

func open_circle() -> bool:
	if visible: return true
	if not available() or game.is_story_card_visible() or game.startup_story_pending or not game.current_path.is_empty() or game.is_mural_workshop_visible() or game.is_film_screening_visible() or game.is_civic_listening_visible() or game.is_programme_studio_visible():
		game.announce_a11y_status("Finish arriving and continue any chapter card before opening Rhythm Circle.")
		return false
	restore_generation += 1
	resized_while_open = false
	return_focus = game.get_viewport().gui_get_focus_owner()
	practice = game.current_hosting_activity()!="beats"
	practice_pattern = pattern()
	return_pose = [game.target,game.view_size,game.camera_yaw,game.camera_pitch_scale,game.following_player,game.in_overview,game.in_wide_overview,game.selected]
	owns_view = false
	step_cues = false
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self:
			saved_visibility[c] = c.visible
	visible = true
	for c in saved_visibility: c.visible = false
	entry.visible = false
	game.pointer_active = false
	game.orbit_dragging = false
	message = "Practice copy only. Your hosted result and keepsake stay saved." if practice else "Dez: Choose hits or rests. Listening is welcome too. Complete when you are ready."
	refresh()
	fit_layout()
	pads[0].grab_focus()
	game.announce_a11y_status("Rhythm Circle. "+message+" View Circle frames the visitors. Play Bar optionally auditions your hits and rests. Music must be On; set volume at Rook's speaker.")
	return true

func close_circle(announce: bool = true) -> void:
	if not visible: return
	stop_audition()
	var was_practice := practice
	visible = false
	practice = false
	step_cues = false
	for c in saved_visibility:
		if is_instance_valid(c): c.visible = saved_visibility[c]
	# Completion can advance to a different activity while the hub is hidden.
	game.update_block_ui()
	game.layout_walking_controls_and_hub()
	if owns_view:
		game.target = return_pose[0]
		game.view_size = return_pose[1]
		game.camera_yaw = return_pose[2]
		game.camera_pitch_scale = return_pose[3]
		game.following_player = return_pose[4]
		game.in_overview = return_pose[5]
		game.in_wide_overview = return_pose[6]
		game.selected = return_pose[7]
		if game.selected>=0: game.meshes[game.selected].material_override = game.chosen_material
		game.update_camera()
		game.update_occlusion(true)
	owns_view = false
	game.update_occlusion(true)
	if resized_while_open and game.following_player:
		game.refresh_hub_camera()
		restore_follow_after_layout(restore_generation,game.panel_camera_pose())
	update_world()
	layout_entry()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif entry.visible: entry.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. Saved rhythm restored; practice was not saved." if was_practice else "Back to the block. Your rhythm draft is saved; return when ready to complete it.")

func restore_follow_after_layout(generation: int, pose: Array) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if generation==restore_generation and not visible and game.following_player and game.panel_camera_pose()==pose:
		game.refresh_hub_camera()

func toggle_step(index: int) -> void:
	if not visible or index<0 or index>7: return
	stop_audition()
	if practice:
		practice_pattern = (practice_pattern ^ (1<<index)) & 255
	elif not game.host_toggle_beat(index):
		return
	message = "Step %d: %s. %s"%[index+1,"hit" if pattern() & (1<<index) else "rest","Practice only; saved result unchanged." if practice else "Draft saved. Complete when ready."]
	refresh()
	game.announce_a11y_status(message)

func listen() -> void:
	if not visible: return
	stop_audition()
	if practice: practice_pattern = 0
	else:
		for i in range(8):
			if pattern() & (1<<i): game.host_toggle_beat(i)
	message = "Listening round. No performance needed; this is an equally complete choice."
	refresh()
	game.announce_a11y_status(message)

func complete() -> void:
	stop_audition()
	if practice:
		var saved: Variant = game.get_hosted_segment_value("beats")
		practice_pattern = int(saved) if saved != null else 0
		message = "Saved rhythm restored. Practice never changes your hosted result."
		refresh()
		return
	if visible and game.current_hosting_activity()=="beats" and game.host_complete_current():
		var next: String = game.current_hosting_activity()
		if next.is_empty() and int(game.current_chapter().num)!=game.last_story_chapter:
			chapter_completion_notice = "Second Afternoon Complete! 4/4 activities hosted. "
		close_circle(false)
		if not next.is_empty():
			game.announce_a11y_status("Rhythm Circle complete (%d/4 hosted). %s is next."%[game.hosting_results.size(),game.programme_title(next)])

func refresh() -> void:
	if not visible: return
	heading.text = "Dez's Rhythm Circle - "+("Practice" if practice else "Hosting")
	objective.text = "%s | Sparks: %d"%[String(game.current_objective().get("text",game.current_objective().get("title","Explore the block"))),game.spark_count()]
	reader.text = message+ (" Local track: %s. Bar audition is unavailable with local files; step cues stay still."%game.local_music_name if game.music_mode=="local" else " Play Bar: one original drum bar, then the sketch returns. Music must be On; set volume at Rook's speaker. Reward Sounds is separate.")+" Drag the street to inspect."
	for i in range(8):
		var hit := (pattern() & (1<<i))!=0
		pads[i].set_pressed_no_signal(hit)
		pads[i].text = "%d\n%s"%[i+1,"Hit" if hit else "Rest"]
		pads[i].accessibility_name = "Step %d, %s"%[i+1,"hit" if hit else "rest"]
	options[1].text = "Music\n"+("On" if game.music_playing else "Off")
	options[3].text = "Reset\nPractice" if practice else "Complete"
	options[4].text = "Step cues\n"+("On" if step_cues else "Off")
	options[6].text = "Stop\nBar" if audition_active() else "Play\nBar"
	options[6].accessibility_name = "Stop bar audition" if audition_active() else "Play one bar of this rhythm"
	update_world()
	queue_layout()

func audition_active() -> bool:
	return audition != null and audition.playing

func stop_audition(restore_gain: bool = true) -> void:
	if not audition_active(): return
	audition.stop()
	if restore_gain: game.apply_music_volume_db()
	update_world()
	if visible:
		message = "Bar stopped. Music follows your current On/Off and volume settings."
		refresh()

func play_bar() -> void:
	if not visible: return
	if audition_active():
		stop_audition()
		message = "Bar stopped. The original sketch continues."
	elif not game.reward_audio_unlocked:
		message = "Use a key, mouse or touch first to enable audio. Silent play is always welcome."
	elif not game.music_playing or game.music_volume<=0.0:
		message = "Music is off or muted. Turn Music On with audible volume to audition; silent play is always welcome."
	elif game.music_mode!="sketch":
		message = "Local music stays independent. Return to the original sketch before auditioning a bar."
	elif pattern()==0:
		message = "All rests: a listening round. Nothing to play, and it is an equally complete choice."
	else:
		game.apply_music_volume_db() # Set the current audition gain before play.
		game.sketch_player.volume_db = -80.0
		audition.start_bar(pattern())
		game.apply_music_volume_db()
		message = "Playing one drum bar. The sketch is quiet until it ends. Edit a pad to stop; Play Bar auditions your new choice."
	refresh()
	game.announce_a11y_status(message)

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending = true
	fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending = false
	if not visible: return
	var vp: Vector2 = game.bubble_viewport_size()
	top.position = Vector2(6,6)
	top.size = Vector2(vp.x-12,0)
	top.size.y = top.get_combined_minimum_size().y
	var side := vp.x>=520 and vp.y<560
	var w := 232.0 if side else minf(620,vp.x-12)
	tray.size = Vector2(w,0)
	tray.size.y = tray.get_combined_minimum_size().y
	tray.position = Vector2(vp.x-w-6,maxf(top.position.y+top.size.y+4,vp.y-tray.size.y-6)) if side else Vector2((vp.x-w)*0.5,vp.y-tray.size.y-6)
	scene_rect = Rect2(6,top.position.y+top.size.y+4,vp.x-12,vp.y-top.size.y-tray.size.y-26)
	if side: scene_rect = Rect2(6,top.position.y+top.size.y+4,vp.x-w-18,vp.y-top.size.y-20)
	if owns_view: frame_world()

func view_circle() -> void:
	owns_view = true
	game.following_player = false
	game.in_overview = false
	game.in_wide_overview = false
	if game.selected>=0:
		game.meshes[game.selected].material_override = game.building_materials[game.selected]
		game.selected = -1
	game.camera_yaw = 0.0
	game.camera_pitch_scale = 1.0
	frame_world()
	game.announce_a11y_status("Viewing the fictional Rhythm Circle at the selected gathering layout. Back restores your earlier view; dragging keeps your inspection view.")

func frame_world() -> void:
	var root: Node3D = worlds[0 if game.gathering_layout=="table" else 1]
	game.target = root.to_global(Vector3(0,1.3,0))
	game.view_size = 20.0
	game.update_camera()
	var points: Array[Vector3] = []
	for x in [-6.0,6.0]:
		for y in [0.0,3.2]:
			for z in [-1.3,1.3]: points.append(root.to_global(Vector3(x,y,z)))
	var bounds := Rect2(game.camera.unproject_position(points[0]),Vector2.ZERO)
	for p in points: bounds = bounds.expand(game.camera.unproject_position(p))
	game.view_size *= maxf(bounds.size.x/maxf(1,scene_rect.size.x-16),bounds.size.y/maxf(1,scene_rect.size.y-16))
	game.update_camera()
	var ppm: float = (game.camera.unproject_position(game.target+game.camera.global_basis.y)-game.camera.unproject_position(game.target)).length()
	var delta: Vector2 = scene_rect.get_center()-game.camera.unproject_position(root.to_global(Vector3(0,1.3,0)))
	game.target -= game.camera.global_basis.x*delta.x/ppm-game.camera.global_basis.y*delta.y/ppm
	game.update_camera()
	game.update_occlusion(true)

func cutaway_points() -> Array[Vector2]:
	var points: Array[Vector2] = []
	if not available() or worlds.is_empty() or (not visible and game.following_player): return points
	var root: Node3D = worlds[0 if game.gathering_layout=="table" else 1]
	var center := Vector2(root.global_position.x,root.global_position.z)
	if center.distance_to(Vector2(game.target.x,game.target.z))>30.0: return points
	for x in [-5.0,-2.5,0.0,2.5,5.0]:
		for z in [-1.25,1.25]:
			var p := root.to_global(Vector3(x,1,z))
			points.append(Vector2(p.x,p.z))
	return points

func scene_input(event: InputEvent) -> void:
	if event is InputEventMouse and event.device == InputEvent.DEVICE_ID_EMULATION: return
	if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		dragging = event.pressed and scene_rect.has_point(event.position)
		drag_start = event.position
	elif event is InputEventMouseMotion and dragging and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		if event.position.distance_to(drag_start)>3:
			owns_view = false
			game.pan_camera_by_screen_delta(event.relative)
			game.update_occlusion(true)
	elif event is InputEventScreenTouch:
		dragging = event.pressed and scene_rect.has_point(event.position)
		drag_start = event.position
	elif event is InputEventScreenDrag and dragging and event.position.distance_to(drag_start)>3:
		owns_view = false
		game.pan_camera_by_screen_delta(event.relative)
		game.update_occlusion(true)

func tick(delta: float) -> void:
	if audition_active() and (not visible or not game.music_playing or game.music_volume<=0.0 or game.music_mode!="sketch"):
		stop_audition()
	if visible and not available(): close_circle(false)
	update_world()
	if visible:
		var current_music: String = str([game.music_playing,game.music_mode,game.local_music_name])
		if music_state!=current_music:
			music_state = current_music
			refresh()
		snapshot_clock -= delta
		if snapshot_clock<=0.0:
			snapshot_clock = 0.2
			game.sync_web_a11y_status()
	if visible:
		for c in saved_visibility:
			if is_instance_valid(c): c.visible = false
	else: layout_entry()

func layout_entry() -> void:
	if entry==null: return
	var show_entry: bool = not visible and available() and not game.is_story_card_visible() and game.block_panel.visible and game.block_panel_mode=="hub"
	if entry.visible!=show_entry:
		entry.visible = show_entry
		entry_layout_generation += 1
		entry_layout_pending = show_entry
		if show_entry: finish_entry_layout(entry_layout_generation)

func finish_entry_layout(generation: int) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if generation==entry_layout_generation:
		entry_layout_pending = false
		game.sync_web_a11y_status()

func snapshot() -> Dictionary:
	var world: Array[Dictionary] = []
	if worlds.size()==2:
		var li := 0 if game.gathering_layout=="table" else 1
		for i in range(8):
			var lamp: MeshInstance3D = lamps[li][i]
			var screen: Vector2 = game.camera.unproject_position(lamp.global_position)
			world.append({"step":i,"x":screen.x,"y":screen.y,"hit":(pattern() & (1<<i))!=0,"color":lamp.material_override.albedo_color.to_html(false),"scale":lamp.scale.x})
	var pad_boxes: Array[Dictionary] = []
	var option_boxes: Array[Dictionary] = []
	for b in pads: pad_boxes.append(game.control_snapshot(b))
	for b in options: option_boxes.append(game.control_snapshot(b))
	var subjects: Array[Dictionary] = []
	if worlds.size()==2:
		var root: Node3D = worlds[0 if game.gathering_layout=="table" else 1]
		for child in root.get_children():
			if child.name.begins_with("Visiting") or child.name=="PortableHandDrum":
				var foot: Vector2 = game.camera.unproject_position(child.global_position)
				var head: Vector2 = game.camera.unproject_position(child.global_position+Vector3.UP*(1.72 if child.name.begins_with("Visiting") else 1.05))
				subjects.append({"name":child.name,"x":foot.x,"y":foot.y,"head_x":head.x,"head_y":head.y})
	return {"audition_accessibility_name":options[6].accessibility_name,"sketch_gain":game.sketch_player.volume_db,"audition":audition.snapshot(),"subjects":subjects,"visible":visible,"entry":game.control_snapshot(entry),"practice":practice,"pattern":pattern(),"active_step":active_step,"step_cues":step_cues,"owns_view":owns_view,"scene":game.rect_snapshot(scene_rect),"tray":game.control_snapshot(tray),"top":game.control_snapshot(top),"pads":pad_boxes,"options":option_boxes,"lamps":world,"message":message,"layout_pending":layout_pending or entry_layout_pending,"world_visible":not worlds.is_empty() and worlds[0 if game.gathering_layout=="table" else 1].is_visible_in_tree()}
