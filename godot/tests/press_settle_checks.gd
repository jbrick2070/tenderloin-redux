extends RefCounted
## Real pointer sequences against the real panels: one double press, one effect (main.gd press settle).
## Oracle: across every Button in the game, exactly one button_down happens in a double click.
## Input is real: Input.parse_input_event mouse pairs, and InputEventScreenTouch pairs at phone width (the engine emulates the
## mouse half itself, exactly as on a phone or in a browser, so the gate sees both halves of a tap). Keyboard and pressed.emit()
## paths stay covered by the older checks (phone_accept, emit); they never arm.
## Headless windows start at 64x64, so every sequence sets the root size first.
const DEPARTURE := preload("res://tests/departure_checks.gd")
const MOTION := preload("res://tests/helper_bench_checks.gd")
## Caller fields the cases below change (talk, hub, tray, walks, story card, audio receipts); restored and checked at the end.
const CALLER_FIELDS := ["save_seq","save_load_status","last_story_chapter","startup_story_pending","block_panel_mode","block_hub_page","header_details_expanded",
	"last_music_cue","cue_arpeggio_duration","reward_sound_count","suppress_feel_good_burst","last_a11y_announcement","a11y_announcement_seq","selected_neighbor",
	"arrived_neighbor","talk_partner","walking_to_mural","walking_to_speaker","walking_to_history_stop","pending_celeste_talk","pending_rook_talk",
	"phone_tray_open","phone_actions_open","district_boundary_visible"]

static func settle(suite: SceneTree, frames := 8) -> void:
	for f in range(frames): await suite.process_frame

static func reset(suite: SceneTree, game: Node, full: String, size := Vector2i(1100,760)) -> void:
	suite.root.size = size
	suite.require(game.apply_save_envelope(full),"press settle starts from the accepted full profile")
	game.hide_story_card(); game.startup_story_pending = false
	game.last_story_chapter = int(game.current_chapter().num)
	game.following_player = false; game.in_overview = false; game.in_wide_overview = false
	game.press_settle_msec = game.PRESS_SETTLE_MSEC; game.press_settle_until = 0; game.press_settle_frame = -10; game.press_swallowed = 0
	await settle(suite)

## Closes whatever a case opened (talk, hub, phone tray, walk) and lets the window run out.
static func calm(suite: SceneTree, game: Node) -> void:
	await suite.create_timer(0.65).timeout
	game.end_conversation(); game.show_block_panel(false); game.close_phone_disclosure(); game.stop_walking()
	await settle(suite)

## One left click from a mouse, or one finger tap (a real InputEventScreenTouch pair).
static func click(suite: SceneTree, at: Vector2, touch := false, hold := 0.03, button := MOUSE_BUTTON_LEFT, release_at := Vector2.INF) -> void:
	var end := at if release_at == Vector2.INF else release_at
	if touch:
		var finger := InputEventScreenTouch.new(); finger.index = 0; finger.position = at; finger.pressed = true
		Input.parse_input_event(finger)
		await suite.create_timer(hold).timeout
		finger = InputEventScreenTouch.new(); finger.index = 0; finger.position = end; finger.pressed = false
		Input.parse_input_event(finger)
		await suite.process_frame
		return
	var move := InputEventMouseMotion.new(); move.position = at; move.global_position = at; Input.parse_input_event(move)
	var down := InputEventMouseButton.new(); down.button_index = button; down.pressed = true; down.position = at; down.global_position = at
	down.button_mask = MOUSE_BUTTON_MASK_LEFT if button == MOUSE_BUTTON_LEFT else 0
	Input.parse_input_event(down)
	await suite.create_timer(hold).timeout
	if end != at:
		var drag := InputEventMouseMotion.new(); drag.position = end; drag.global_position = end; drag.button_mask = down.button_mask; Input.parse_input_event(drag)
		await suite.process_frame
	var up := InputEventMouseButton.new(); up.button_index = button; up.pressed = false; up.position = end; up.global_position = end
	Input.parse_input_event(up)
	await suite.process_frame

## Presses a Button twice at its centre (read once: the Button may relabel, hide or reflow under the pointer, which is the point).
## Returns what the whole UI saw.
static func double_press(suite: SceneTree, game: Node, target: Button, gap := 0.06, touch := false) -> Dictionary:
	suite.require(target.is_visible_in_tree() and not target.disabled,"double-press target is a live Button: "+target.text.replace("\n"," "))
	var at := target.get_global_rect().get_center()
	var tracked: Array = []; var downs := [0]; var presses := [0]
	for b in game.find_children("*","Button",true,false):
		var c := func(): downs[0] += 1
		b.button_down.connect(c); tracked.append([b,c])
	var count := func(): presses[0] += 1
	target.pressed.connect(count)
	var swallowed_before: int = game.press_swallowed
	await click(suite,at,touch)
	await suite.create_timer(gap).timeout
	await click(suite,at,touch)
	await settle(suite,3)
	for pair in tracked:
		if is_instance_valid(pair[0]): pair[0].button_down.disconnect(pair[1])
	if is_instance_valid(target): target.pressed.disconnect(count)
	return {"downs":downs[0],"pressed":presses[0],"swallowed":game.press_swallowed - swallowed_before,"events":2 if touch else 1,"at":at}

static func hub_to(suite: SceneTree, game: Node, target: Button) -> void:
	game.show_block_panel(true)
	await settle(suite)
	for page in range(game.block_action_page_count()):
		if target.is_visible_in_tree(): break
		game.change_block_action_page(1)
		await settle(suite,3)

static func once(suite: SceneTree, what: String, r: Dictionary) -> void:
	suite.require(r.downs == 1 and r.pressed == 1 and r.swallowed == r.events,"%s: a double press is exactly one press (%s)" % [what,JSON.stringify(r)])

## A reparented Button (the phone tray moves the zoom, map and find controls) must not collect a second arming connection.
static func arm_connections(b: BaseButton) -> int:
	return b.pressed.get_connections().filter(func(c): return c.callable.get_method() == &"arm_press_settle").size()

## Every pointer activation opens the window. Is a repeat on this same Button swallowed (true), or may a repeat that still lands
## on this rapid Button go through (false)?
static func arms(game: Node, b: BaseButton) -> bool:
	return not game.press_is_rapid(b)

## Every BaseButton has exactly one arming connection (the hook ran once, also after the phone tray reparents buttons). The named lists
## say which controls repeat in place and which are fully guarded, and the rapid set is pinned: a Button marked rapid but not named
## in `fast` fails here, so every rapid mark is a deliberate decision.
static func lint(suite: SceneTree, game: Node) -> void:
	var all := game.find_children("*","BaseButton",true,false)
	var unhooked := all.filter(func(b): return arm_connections(b) != 1)
	suite.require(all.size() > 150 and unhooked.is_empty(),"every BaseButton has exactly one arming connection (%d buttons, %d without: %s)" % [all.size(),unhooked.size(),unhooked.map(func(b): return String(b.get_path())).slice(0,3)])
	var civic: Node = game.civic_listening; var studio: Node = game.programme_studio; var meal: Node = game.shared_meal; var rhythm: Node = game.rhythm_circle
	var room: Node = game.habitat_room; var orbital: Node = room.orbital; var shop: Node = game.mural_workshop; var stories: Node = shop.stories
	var fast: Array = [game.zoom_in_control,game.zoom_out_control,game.map_tools_buttons[2],game.map_tools_buttons[3],game.block_page_prev,game.block_page_next,game.mural_palette_btn,game.music_vol_btn,
		game.conv_chat_btn,studio.edits[1],studio.edits[2],meal.previous,meal.next,shop.palette_button,stories.palette_button,
		game.story_picker.earlier,game.story_picker.later]
	for list in [game.power_story.pads,game.shared_panel.pads]: fast.append_array(list)
	suite.require(fast.all(func(b): return not arms(game,b)),"repeat-in-place controls are rapid: "+str(fast.filter(func(b): return arms(game,b)).map(func(b): return b.text if b.text != "" else String(b.name)).slice(0,4)))
	var stray := all.filter(func(b): return game.press_is_rapid(b) and not fast.has(b))
	suite.require(stray.is_empty(),"only the named repeat-in-place controls are rapid: "+str(stray.map(func(b): return b.text if b.text != "" else String(b.get_path())).slice(0,4)))
	# Toggles, selectors and place-then-move buttons are guarded: a selector's repeat changes nothing, an on/off toggle or a rhythm
	# pad must not undo itself, a paint or Shift Motif press must not place a motif and then move it, a canvas cell must not paint twice.
	var slow: Array = [game.walk_control,game.map_control,game.next_hint_control,game.phone_find_control,game.map_tools_buttons[0],game.map_tools_buttons[1],game.conv_next_btn,game.music_toggle_btn,game.sounds_btn,
		game.mural_sun_btn,game.mural_wave_btn,game.mural_rise_btn,game.mural_buttons[5],game.mural_buttons[7],rhythm.options[0],rhythm.options[1],rhythm.options[2],rhythm.options[4],rhythm.options[6],
		game.block_close_btn,game.conv_bye_btn,game.mural_buttons[0],game.music_rook_btn,game.mural_compose_btn,game.story_continue_btn,game.story_before_btn,
		game.phone_explore_control,game.phone_all_actions_control,game.phone_tray_close,civic.entry,civic.advance,civic.back,civic.music,studio.edits[0],studio.primary,studio.view,studio.back,
		studio.gathering.previous,studio.gathering.next,studio.gathering.back,studio.gathering.keep,meal.prepare,meal.share,meal.explore,
		room.assist,room.detail,room.back,orbital.invite,orbital.stop,orbital.back,orbital.pause,game.film_screening.back,game.film_screening.helper_entry,
		game.helper_bench.assist,game.helper_bench.back,game.helper_bench.habitat_entry,game.before_streets.previous,game.before_streets.gust,game.before_streets.sources,
		game.before_streets.back,game.before_streets.entry,shop.stories_entry,shop.done_button,stories.back_button,stories.page_button,
		rhythm.entry,rhythm.options[3],rhythm.options[5],game.shared_panel.options[2],game.shared_panel.options[4],game.power_story.entry,game.power_story.actions[1],game.power_story.actions[5],
		game.power_story.dogs_entry,game.story_picker.follow,game.story_picker.explore,game.story_picker.back]
	for list in [game.block_buttons,game.conv_action_btns,orbital.destinations,studio.gathering.choices,game.helper_bench.supports,stories.lifts,rhythm.pads,
		studio.cards,civic.tabs,civic.choices,civic.voices,meal.serving_buttons,meal.placement_buttons,room.items,room.places,shop.cells,stories.choices,
		stories.targets,game.voting_story.pads,game.story_picker.entries,game.helper_bench.forms,game.film_screening.shots,game.quiet_seats.choices]: slow.append_array(list)
	suite.require(slow.all(func(b): return arms(game,b)),"fully guarded controls are not rapid: "+str(slow.filter(func(b): return not arms(game,b)).map(func(b): return b.text if b.text != "" else String(b.name)).slice(0,4)))
	print("PRESS_SETTLE_LINT buttons=%d fast=%d armed_named=%d" % [all.size(),fast.size(),slow.size()])

static func verify(suite: SceneTree, game: Node, full: String, formal := false) -> void:
	suite.require(game.is_test_suite_mode(),"press settle checks require the isolated native profile")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL press settle token only in full suite")
	suite.require(game.PRESS_SETTLE_MSEC == 450 and game.PRESS_SETTLE_RADIUS == 32.0 and game.PRESS_SETTLE_RADIUS_TOUCH == 36.0,"the shipped settle window is 450 ms, 32 px mouse, 36 px touch")
	var studio: Node = game.programme_studio; var visit: Node = studio.gathering; var meal: Node = game.shared_meal; var hour: Node = game.civic_listening
	var size0: Vector2i = suite.root.size; var scale0: Vector2i = suite.root.content_scale_size
	suite.require(game.current_path.is_empty() and game.active_story_episode() == null,"press settle needs an idle caller; it does not restore a live walk or an active episode")
	var original: String = JSON.stringify(game.build_save_envelope()); var motion: Dictionary = MOTION.motion_state(game); var focus: Control = suite.root.gui_get_focus_owner()
	var state := {}; var visibility := {}
	for key in CALLER_FIELDS: state[key] = game.get(key)
	for c in studio.get_parent().get_children():
		if c is Control: visibility[c] = c.visible
	var history: Array = game.cue_history.duplicate(true); var info_text: String = game.info.text
	var had_save: bool = FileAccess.file_exists(game.save_path); var saved := FileAccess.get_file_as_bytes(game.save_path) if had_save else PackedByteArray()
	var cases := 0
	# 0. Every BaseButton arms; the named lists say which are fast and which arm (the room place buttons are checked in case 8: their mark follows the room mode and is only refreshed while the room is open).
	await reset(suite,game,full)
	lint(suite,game)
	await reset(suite,game,full,Vector2i(390,667))
	lint(suite,game)
	for size in [Vector2i(1100,760),Vector2i(390,667)]:
		var touch: bool = size.x < 600
		# 1. Hub entry hands off to a panel whose buttons sit under the pointer; the panel then closes onto the HUD.
		await reset(suite,game,full,size)
		await hub_to(suite,game,game.block_meal_btn)
		once(suite,"hub Cook & Share %s" % size,await double_press(suite,game,game.block_meal_btn,0.06,touch))
		suite.require(meal.visible and meal.steps == [0,0,0,0],"hub double press opens the meal and does not press inside it")
		await suite.create_timer(0.65).timeout
		once(suite,"meal Keep exploring close-through %s" % size,await double_press(suite,game,meal.explore,0.06,touch))
		suite.require(not meal.visible,"Keep exploring closed the meal once")
		if not touch:
			# Control run: with the gate off the second press reaches the HUD control under the pointer, so the oracle above can fail.
			# Since the one bar (HUD Phase 2) that control is Explore, which an open hub hides, so the run reopens the meal from the
			# street rather than over the hub (the old walk control sat there with the hub open too).
			await suite.create_timer(0.65).timeout
			game.show_block_panel(false); await settle(suite)
			game.press_settle_msec = 0
			suite.require(meal.open_meal(),"meal reopens for the control run"); await settle(suite)
			var leak: Dictionary = await double_press(suite,game,meal.explore,0.06,touch)
			suite.require(leak.downs >= 2 and leak.swallowed == 0,"control: with the gate off the second press reaches a control under Keep exploring: "+JSON.stringify(leak))
			game.press_settle_msec = game.PRESS_SETTLE_MSEC
			game.stop_walking(); await settle(suite,4)
		# 2. In-place relabel: each prepare press is a step, so a double press is one step.
		await reset(suite,game,full,size)
		suite.require(meal.open_meal(),"meal opens from the full profile"); await settle(suite)
		once(suite,"meal prepare %s" % size,await double_press(suite,game,meal.prepare,0.06,touch))
		suite.require(meal.steps[meal.selected] == 1,"double press prepares one step, not two")
		await suite.create_timer(0.65).timeout
		var again: Dictionary = await double_press(suite,game,meal.prepare,0.06,touch)
		suite.require(again.swallowed == again.events and meal.steps[meal.selected] == 2,"the same spot works again after the window")
		# 3. A selector toggle is guarded too: its repeat would change nothing, so it is one press.
		await suite.create_timer(0.65).timeout
		once(suite,"meal serving toggle %s" % size,await double_press(suite,game,meal.serving_buttons[1],0.06,touch))
		meal.close_meal(false); await settle(suite)
		# 4. Programme Studio, Gather again: open handoff, in-place choice, Back handoff.
		await reset(suite,game,full,size)
		suite.require(studio.open_studio(true) and not visit.visible,"studio opens on the posted invitation"); await settle(suite)
		once(suite,"studio Gather again %s" % size,await double_press(suite,game,studio.primary,0.06,touch))
		suite.require(visit.visible and visit.gestures.is_empty(),"entering Gather again does not choose a handoff")
		await suite.create_timer(0.65).timeout
		once(suite,"gathering handoff %s" % size,await double_press(suite,game,visit.choices[0],0.06,touch))
		suite.require(visit.gestures.size() == 1,"a double press chooses one handoff")
		await suite.create_timer(0.65).timeout
		once(suite,"gathering Back to Posted %s" % size,await double_press(suite,game,visit.back,0.06,touch))
		suite.require(not visit.visible and studio.visible,"Back to Posted returns once and Resume gathering is not pressed")
		studio.close_studio(false); await settle(suite)
		# 5. Listening Hour: one Button is Start planning, then Convene, then Close the hour; each step saves.
		await reset(suite,game,full,size)
		game.civic_phase = "idle"; game.civic_draft = game.default_civic_draft(); game.civic_result = {}
		suite.require(hour.open_hour(),"Listening Hour opens"); await settle(suite)
		var seq: int = game.save_seq
		once(suite,"Listening Hour Start planning %s" % size,await double_press(suite,game,hour.advance,0.06,touch))
		suite.require(game.civic_phase == "planning" and game.save_seq == seq + 1,"double press starts planning only: no Convene, one save")
		await suite.create_timer(0.65).timeout
		once(suite,"Listening Hour Convene %s" % size,await double_press(suite,game,hour.advance,0.06,touch))
		suite.require(game.civic_phase == "meeting" and game.save_seq == seq + 2,"the next deliberate press convenes only")
		await suite.create_timer(0.65).timeout
		once(suite,"Listening Hour Back close-through %s" % size,await double_press(suite,game,hour.back,0.06,touch))
		suite.require(not hour.visible,"Back closed the Listening Hour once")
		cases += 5
	# 6. Orbital Stop relabels in place (Gather here, Finale choices), so it arms like Invite; only a repeat is ever swallowed, never its first press.
	await reset(suite,game,full)
	var orbital: Node = game.habitat_room.orbital
	suite.require(arms(game,orbital.stop) and arms(game,orbital.invite),"orbital Stop and Invite arm")
	# 7. Film to helper bench to habitat room: the handoff target never receives the second press.
	await reset(suite,game,full)
	suite.require(game.film_screening.open_screening(),"film opens from the full profile"); await settle(suite)
	once(suite,"film Helper workshop",await double_press(suite,game,game.film_screening.helper_entry))
	suite.require(game.helper_bench.visible and not game.habitat_room.visible,"the helper bench opens and stays")
	game.helper_bench.close_bench(false); await settle(suite)
	# 8. Habitat Next panel is a toggle used as an action while departing; the room's place choosers stay selectors.
	await reset(suite,game,full)
	var room: Node = game.habitat_room
	var positions := [0,1,2]
	suite.require(room.open_room(),"earned room opens"); await DEPARTURE.assemble(suite,room,positions); await DEPARTURE.fit(suite,room,positions)
	suite.require(arms(game,room.places[0]),"in the room and while fitting links the place buttons are guarded selectors")
	await suite.phone_accept(room.back); suite.require(room.open_room(),"room reopens ready"); await suite.phone_accept(room.assist)
	await suite.phone_accept(room.back); suite.require(room.open_room() and room.departure_ready,"ready room reopens"); await suite.phone_accept(room.assist)
	suite.require(room.mode == "depart" and room.panel == 0 and arms(game,room.places[0]),"while departing, Next panel is an action and arms the gate")
	once(suite,"habitat Next panel",await double_press(suite,game,room.places[0]))
	suite.require(room.panel == 1,"a double press reads one still panel, not two")
	game.habitat_room.close_room(false); await settle(suite)
	# 9. Window edges, on the meal panel.
	await reset(suite,game,full)
	suite.require(meal.open_meal(),"meal for window edges"); await settle(suite)
	var spot: Vector2 = meal.prepare.get_global_rect().get_center(); var far: Button = meal.serving_buttons[0]
	var hits := {"prepare":0,"far":0}
	var on_prepare := func(): hits.prepare += 1
	var on_far := func(): hits.far += 1
	meal.prepare.pressed.connect(on_prepare); far.pressed.connect(on_far)
	await click(suite,spot); await suite.create_timer(0.1).timeout
	await click(suite,far.get_global_rect().get_center()); await settle(suite,3)
	suite.require(hits.prepare == 1 and hits.far == 1 and game.press_swallowed == 0,"a press on another button inside the window works: "+JSON.stringify(hits))
	suite.require(game.press_settle_at.distance_to(spot) > game.PRESS_SETTLE_RADIUS_TOUCH,"a press anywhere else ends the window at the first spot (the rapid toggle opened its own)")
	await click(suite,spot); await settle(suite,3)
	suite.require(hits.prepare == 2 and game.press_swallowed == 0,"the same spot works again once another press came between: "+JSON.stringify(hits))
	await suite.create_timer(0.65).timeout
	await click(suite,spot); await settle(suite,3)
	suite.require(hits.prepare == 3 and game.press_swallowed == 0 and meal.steps[meal.selected] == 3,"the same spot works again after 650 ms: "+JSON.stringify(hits))
	# A mouse press 24 px away is the same double press (radius 32); one 40 px away is a separate press.
	await suite.create_timer(0.65).timeout
	await click(suite,spot); await suite.create_timer(0.06).timeout
	await click(suite,spot + Vector2(24,0)); await settle(suite,2)
	suite.require(game.press_swallowed == 1 and hits.prepare == 4,"a mouse press 24 px away is the same double press: "+JSON.stringify(hits))
	await suite.create_timer(0.65).timeout
	await click(suite,spot + Vector2(-10,0)); await suite.create_timer(0.06).timeout
	await click(suite,spot + Vector2(-10,0) + Vector2(40,0)); await settle(suite,2)
	suite.require(game.press_swallowed == 1 and hits.prepare == 6,"a mouse press 40 px away is a separate press: "+JSON.stringify(hits))
	# A long press arms from the release.
	await suite.create_timer(0.65).timeout
	game.press_swallowed = 0
	await click(suite,spot,false,0.5); await settle(suite,2)
	suite.require(game.press_settle_until > game.press_settle_clock,"a long press arms at release, not at press")
	await click(suite,spot); await settle(suite,2)
	suite.require(game.press_swallowed == 1 and hits.prepare == 7,"a press right after a long press is swallowed")
	# A drag that leaves the button never presses or arms; right and middle buttons are ignored.
	await suite.create_timer(0.65).timeout
	game.press_swallowed = 0
	await click(suite,spot,false,0.03,MOUSE_BUTTON_LEFT,spot + Vector2(300,-200)); await settle(suite,2)
	suite.require(game.press_settle_until == 0 and hits.prepare == 7,"a drag that leaves the button neither presses nor arms")
	await click(suite,spot,false,0.03,MOUSE_BUTTON_RIGHT); await click(suite,spot,false,0.03,MOUSE_BUTTON_MIDDLE)
	suite.require(game.press_settle_until == 0 and game.press_swallowed == 0 and hits.prepare == 7,"right and middle buttons never arm and are never swallowed")
	var wheel := InputEventMouseButton.new(); wheel.button_index = MOUSE_BUTTON_WHEEL_UP; wheel.pressed = true; wheel.position = spot
	game.press_settle_until = game.press_settle_clock + 450; game.press_settle_at = spot; game.press_settle_radius = 32.0
	suite.require(not game.settle_swallows(wheel),"the wheel is never swallowed")
	game.press_settle_until = 0
	# Keyboard activation does not arm, and a click right after it is not swallowed.
	await suite.phone_accept(meal.prepare)
	suite.require(game.press_settle_until == 0 and hits.prepare == 8,"ui_accept activation presses and does not arm")
	meal.prepare.pressed.emit()
	suite.require(game.press_settle_until == 0,"pressed.emit() from code does not arm")
	await click(suite,spot); await settle(suite,2)
	suite.require(hits.prepare == 10 and game.press_swallowed == 0,"a click right after keyboard activation is not swallowed")
	# Two ui_accept in a row both act.
	await suite.create_timer(0.65).timeout
	await suite.phone_accept(meal.prepare); await suite.phone_accept(meal.prepare)
	suite.require(hits.prepare == 12 and game.press_swallowed == 0,"two ui_accept activations in a row both act")
	# The gate can be switched off (the Web test override has the same effect).
	await suite.create_timer(0.65).timeout
	game.press_settle_msec = 0
	var off: Dictionary = await double_press(suite,game,meal.prepare)
	suite.require(off.pressed == 2 and off.swallowed == 0,"settle 0 switches the gate off: "+JSON.stringify(off))
	game.press_settle_msec = game.PRESS_SETTLE_MSEC
	# 10. A slow first handler (600 ms) must not let the queued repeat through, in the same input flush or in the next frame.
	await suite.create_timer(0.65).timeout
	var stalls := [0]
	var stall := func(): stalls[0] += 1; OS.delay_msec(600)
	meal.prepare.pressed.connect(stall)   # connected after the hook, so the window opens, then the handler stalls
	var before: int = hits.prepare
	var queue := func(kinds: Array):
		for kind in kinds:
			var e := InputEventMouseButton.new(); e.button_index = MOUSE_BUTTON_LEFT; e.pressed = kind == "down"; e.position = spot; e.global_position = spot
			if kind == "down": e.button_mask = MOUSE_BUTTON_MASK_LEFT
			Input.parse_input_event(e)
	var move := InputEventMouseMotion.new(); move.position = spot; move.global_position = spot; Input.parse_input_event(move); await suite.process_frame
	queue.call(["down","up","down","up"]); await settle(suite,4)
	suite.require(hits.prepare == before + 1 and stalls[0] == 1,"a 600 ms handler does not let a repeat queued in the same flush through (%d)" % (hits.prepare - before))
	await suite.create_timer(0.7).timeout
	before = hits.prepare
	queue.call(["down","up"]); await suite.process_frame
	queue.call(["down","up"]); await settle(suite,4)
	suite.require(hits.prepare == before + 1,"a 600 ms handler does not let a repeat queued for the next frame through (%d)" % (hits.prepare - before))
	await suite.create_timer(0.7).timeout
	before = hits.prepare
	await click(suite,spot); await settle(suite,2)
	suite.require(hits.prepare == before + 1,"a deliberate press 700 ms later works")
	meal.prepare.pressed.disconnect(stall)
	# Slow frames after the first press (closing a heavy panel does this on the Web) must not run the window out: five 120 ms
	# frames are 600 ms of wall clock but at most 250 ms on the settle clock, so the late-processed repeat is still swallowed.
	await suite.create_timer(0.7).timeout
	before = hits.prepare
	var swallowed_slow: int = game.press_swallowed
	await click(suite,spot)
	for f in range(5):
		OS.delay_msec(120); await suite.process_frame
	await click(suite,spot); await settle(suite,2)
	suite.require(hits.prepare == before + 1 and game.press_swallowed > swallowed_slow,"a repeat processed after 600 ms of slow frames is still the same double press (%d)" % (hits.prepare - before))
	await suite.create_timer(0.7).timeout
	await click(suite,spot); await settle(suite,2)
	suite.require(hits.prepare == before + 2,"after the window on normal frames the same spot works again")
	meal.prepare.pressed.disconnect(on_prepare); far.pressed.disconnect(on_far)
	meal.close_meal(false); await settle(suite)
	# 11. The HUD zoom control is fast: five presses within about 300 ms all act. On desktop that is the corner column's +
	# (HUD Phase 2: the bar holds three, and the tray's Zoom In is case 16's).
	await reset(suite,game,full)
	var zoom_downs := [0]
	var on_zoom := func(): zoom_downs[0] += 1
	var desk_zoom: Button = game.map_tools_buttons[2]
	suite.require(desk_zoom.is_visible_in_tree() and desk_zoom.accessibility_name == "Zoom In","desktop's corner Zoom In is on screen (bar %s, tray %s, panel %s, activity %s, card %s, scene %s, column %s)" % [game.controls.is_visible_in_tree(),game.phone_tray_open,game.any_side_panel_visible(),game.is_focused_activity_visible(),game.is_story_card_visible(),game.play_area_rect(),game.map_tools.get_global_rect()])
	desk_zoom.button_down.connect(on_zoom)
	var zoom_at: Vector2 = desk_zoom.get_global_rect().get_center()
	for i in range(5):
		await click(suite,zoom_at); await suite.create_timer(0.04).timeout
	desk_zoom.button_down.disconnect(on_zoom)
	suite.require(zoom_downs[0] == 5 and game.press_swallowed == 0,"Zoom In pressed five times quickly acts five times")
	# 12. The whole window counts: a repeat 250 ms after the release is the same double press. A finger repeat 34 px away is the
	# same tap (touch radius 36), one 44 px away is a new tap.
	await reset(suite,game,full)
	suite.require(meal.open_meal(),"meal for the late repeat"); await settle(suite)
	once(suite,"meal prepare repeated 250 ms later",await double_press(suite,game,meal.prepare,0.25))
	meal.close_meal(false); await settle(suite)
	await reset(suite,game,full,Vector2i(390,667))
	suite.require(meal.open_meal(),"meal for the touch radius"); await settle(suite)
	var finger := [0]
	var on_finger := func(): finger[0] += 1
	meal.prepare.pressed.connect(on_finger)
	var finger_at: Vector2 = meal.prepare.get_global_rect().get_center() - Vector2(20,0)
	await click(suite,finger_at,true); await suite.create_timer(0.06).timeout
	await click(suite,finger_at + Vector2(34,0),true); await settle(suite,3)
	suite.require(finger[0] == 1 and game.press_swallowed == 2,"a finger repeat 34 px away is the same tap: %d presses, %d swallowed" % [finger[0],game.press_swallowed])
	await suite.create_timer(0.65).timeout
	await click(suite,finger_at,true); await suite.create_timer(0.06).timeout
	await click(suite,finger_at + Vector2(44,0),true); await settle(suite,3)
	suite.require(finger[0] == 3 and game.press_swallowed == 2,"a finger tap 44 px away is a new tap: %d presses" % finger[0])
	meal.prepare.pressed.disconnect(on_finger)
	meal.close_meal(false); await settle(suite)
	cases += 1
	# 13. Rapid controls repeat only while they stay put. A dock's short last hub page lifts the pager row: a double press on
	# Previous pages back once and never presses the hub action that lands under the pointer (no save). A hub standing on the
	# walking controls keeps its pager put, so the same double press pages back twice (Previous only relabels) and mid-hub
	# Next repeats. A page holds the rows that fit (a tall phone has no pager), so 559x360 docks and 800x560 stands. (800x600
	# had three pages above the old two-row bar; above the one-row bar it has two, too few to page back twice.)
	for size in [Vector2i(559,360),Vector2i(800,560)]:
		var touch: bool = size.x < 600
		for profile in ["fresh","full"]:
			await reset(suite,game,full,size)
			if profile == "fresh":
				game.reset_mural_state_to_defaults("fresh"); await settle(suite)
				game.hide_story_card(); game.startup_story_pending = false; game.last_story_chapter = int(game.current_chapter().num); await settle(suite)
			game.show_block_panel(true); await settle(suite)
			suite.require(game.uses_paged_block_actions() and game.block_action_page_count() >= 2,"the hub pages at %s" % size)
			game.block_hub_page = 0; game.layout_block_action_pages(); await settle(suite)
			var row := {}
			while game.block_hub_page < game.block_action_page_count() - 1:
				row[game.block_hub_page] = game.block_page_prev.get_global_rect().position.y
				game.change_block_action_page(1); await settle(suite,3)
			var last: int = game.block_hub_page; var district: bool = game.district_boundary_visible; var seq: int = game.save_seq
			var moves: bool = game.block_page_prev.get_global_rect().position.y != row[last - 1]
			suite.require(moves == game.uses_side_block_hub(),"precondition at %s: a dock's short last page lifts the pager row; a hub on the controls keeps it put" % size)
			var back: Dictionary = await double_press(suite,game,game.block_page_prev,0.06,touch)
			if moves:
				once(suite,"hub Previous on the lifted last page %s" % size,back)
				suite.require(game.block_hub_page == last - 1,"Previous pages back once")
			else:
				suite.require(back.downs == 2 and back.swallowed == 0 and game.block_hub_page == last - 2,"Previous that stays put pages back twice: "+JSON.stringify(back))
			suite.require(game.district_boundary_visible == district and game.save_seq == seq,"no hub action ran and the save is untouched (%s %s)" % [profile,size])
			if profile == "full" and not moves:
				await suite.create_timer(0.65).timeout
				game.block_hub_page = 0; game.layout_block_action_pages(); await settle(suite)
				var paging: Dictionary = await double_press(suite,game,game.block_page_next,0.06,touch)
				suite.require(paging.downs == 2 and paging.swallowed == 0 and game.block_hub_page == mini(2,game.block_action_page_count()-1),"a pager that stays put repeats: "+JSON.stringify(paging))
			await calm(suite,game)
	cases += 1
	# 14. Phone conversation: Next Step opens the steps row where it stood, so a double tap opens it once and presses no step. In
	# the layout objective the required Long Table / Open Floor row is already open, the panel does not grow, and Next Step stays
	# under the finger as Hide Steps: a double tap must still open the steps once, not open and close them.
	for objective in ["full","layout"]:
		for touch in [true,false]:
			await reset(suite,game,full,Vector2i(390,667))
			if objective == "layout":
				for n in game.neighbors: game.visited_neighbors[String(n.id)] = true
				game.gathering_layout = ""; game.block_opened = false; game.update_block_ui(); await settle(suite)
				game.hide_story_card(); game.startup_story_pending = false; game.last_story_chapter = int(game.current_chapter().num); await settle(suite)
				suite.require(String(game.current_objective().id) == "layout","the layout objective is current")
			game.talk_with_neighbor(0); await settle(suite)
			suite.require(game.phone_talking() and not game.phone_actions_open,"a phone conversation with the steps closed (%s)" % objective)
			var partner: int = game.talk_partner; var layout_before: String = game.gathering_layout
			once(suite,"phone Next Step %s touch=%s" % [objective,touch],await double_press(suite,game,game.conv_next_btn,0.06,touch))
			suite.require(game.phone_actions_open and game.talk_partner == partner and game.current_path.is_empty() and game.gathering_layout == layout_before,"the steps open once and no step runs (%s): open=%s partner %d->%d path=%d layout '%s'->'%s'" % [objective,game.phone_actions_open,partner,game.talk_partner,game.current_path.size(),layout_before,game.gathering_layout])
			await calm(suite,game)
	cases += 1
	# 15. Phone Explore tray: Find Me and Map close the tray, so the second tap would reach the street and start a walk.
	for target in [game.phone_find_control,game.map_control]:
		await reset(suite,game,full,Vector2i(390,667))
		game.follow_player(); await settle(suite,4)
		game.press_phone_explore(); await settle(suite)
		suite.require(target.is_visible_in_tree() and game.phone_tray_open,"tray open with "+target.text)
		once(suite,"tray "+target.text,await double_press(suite,game,target,0.06,true))
		suite.require(game.current_path.is_empty(),"the second tap after %s starts no walk" % target.text)
		await calm(suite,game)
	cases += 1
	# 16. In the tray Zoom In stays put, so five finger taps act five times. A quick second press that lands on the neighbour
	# inside the radius is one press, whether it straddles the Zoom In / Zoom Out edge or drifts 20-30 px across it (a drifting
	# double tap must not reach Clear Board under a motif or Convene under a topic); presses on the two centres both act.
	await reset(suite,game,full,Vector2i(390,667))
	game.follow_player(); await settle(suite,4)
	game.press_phone_explore(); await settle(suite)
	zoom_downs[0] = 0
	game.zoom_in_control.button_down.connect(on_zoom)
	zoom_at = game.zoom_in_control.get_global_rect().get_center()
	for i in range(5):
		await click(suite,zoom_at,true); await suite.create_timer(0.04).timeout
	game.zoom_in_control.button_down.disconnect(on_zoom)
	suite.require(zoom_downs[0] == 5 and game.press_swallowed == 0 and game.phone_tray_open,"Zoom In tapped five times in the tray acts five times")
	for size in [Vector2i(1100,760),Vector2i(390,667)]:
		var touch: bool = size.x < 600
		await reset(suite,game,full,size)
		# Phones' zooms are the tray's, side by side; desktop's are the corner column's + and −, one above the other.
		var zin: Button = game.zoom_in_control if touch else game.map_tools_buttons[2]
		var zout: Button = game.zoom_out_control if touch else game.map_tools_buttons[3]
		if touch:
			game.follow_player(); await settle(suite,4); game.press_phone_explore(); await settle(suite)
		suite.require(zin.is_visible_in_tree() and zout.is_visible_in_tree(),"both zoom neighbours are on screen at %s" % size)
		var ra: Rect2 = zin.get_global_rect(); var rb: Rect2 = zout.get_global_rect()
		var row := absf(ra.get_center().y - rb.get_center().y) < 2.0
		var first := ra if (ra.position.x < rb.position.x if row else ra.position.y < rb.position.y) else rb
		var second := rb if first == ra else ra
		var pa := Vector2(first.end.x - 3,first.get_center().y) if row else Vector2(first.get_center().x,first.end.y - 3)
		var pb := Vector2(second.position.x + 3,second.get_center().y) if row else Vector2(second.get_center().x,second.position.y + 3)
		suite.require(pa.distance_to(pb) < game.PRESS_SETTLE_RADIUS,"the facing edges are inside the radius (%.0f px)" % pa.distance_to(pb))
		var both := [0]
		var on_both := func(): both[0] += 1
		for z in [zin,zout]: z.button_down.connect(on_both)
		var swallowed_before: int = game.press_swallowed
		await click(suite,pa,touch); await suite.create_timer(0.06).timeout
		await click(suite,pb,touch); await settle(suite,3)
		suite.require(both[0] == 1 and game.press_swallowed > swallowed_before,"a double press straddling the neighbours' edge is one press at %s: %d" % [size,both[0]])
		await suite.create_timer(0.65).timeout
		var qa := Vector2(first.end.x - 11,first.get_center().y) if row else Vector2(first.get_center().x,first.end.y - 11)
		var qb := Vector2(second.position.x + 11,second.get_center().y) if row else Vector2(second.get_center().x,second.position.y + 11)
		var radius: float = game.PRESS_SETTLE_RADIUS_TOUCH if touch else game.PRESS_SETTLE_RADIUS
		suite.require(qa.distance_to(qb) >= 20.0 and qa.distance_to(qb) < radius,"the drifted taps are 20 px or more apart and inside the radius (%.0f px)" % qa.distance_to(qb))
		swallowed_before = game.press_swallowed
		await click(suite,qa,touch); await suite.create_timer(0.06).timeout
		await click(suite,qb,touch); await settle(suite,3)
		suite.require(both[0] == 2 and game.press_swallowed > swallowed_before,"a quick second press drifted onto the neighbour is one press at %s: %d" % [size,both[0]])
		await suite.create_timer(0.65).timeout
		suite.require(first.get_center().distance_to(second.get_center()) > game.PRESS_SETTLE_RADIUS_TOUCH,"the neighbours' centres are farther apart than the radius")
		swallowed_before = game.press_swallowed
		await click(suite,first.get_center(),touch); await suite.create_timer(0.06).timeout
		await click(suite,second.get_center(),touch); await settle(suite,3)
		for z in [zin,zout]: z.button_down.disconnect(on_both)
		suite.require(both[0] == 4 and game.press_swallowed == swallowed_before,"quick presses on the two centres both act at %s: %d" % [size,both[0]])
		await calm(suite,game)
	cases += 1
	# 17. The walk control acts on press and arms there (the finger's own touch half is swallowed with it). Beside a neighbour a
	# double press arrives once and presses nothing that opens under the pointer; far away it starts a walk that the second
	# press does not stop.
	for size in [Vector2i(390,667),Vector2i(1100,760)]:
		var touch: bool = size.x < 600
		for distance in [0.6,12.0]:
			await reset(suite,game,full,size)
			var neighbour := int(game.primary_walk_choice().neighbor)
			var goal: Vector2 = game.neighbor_xz(neighbour)
			game.player.position = Vector3(goal.x + distance,game.player.position.y,goal.y)
			game.update_walk_control(); game.layout_walking_controls_and_hub(); await settle(suite)
			var label: String = game.walk_control.text
			var walk: Dictionary = await double_press(suite,game,game.walk_control,0.06,touch)
			suite.require(walk.downs == 1 and walk.pressed == 1 and walk.swallowed >= walk.events,"walk control '%s' at %.1f m %s is one press: %s" % [label,distance,size,JSON.stringify(walk)])
			if distance > 1.0: suite.require(not game.current_path.is_empty(),"the walk the first press started is still going")
			else: suite.require(game.current_path.is_empty(),"arriving does not start another walk")
			await calm(suite,game)
	cases += 1
	# 18. Mural Paint and Shift Motif place an unplaced motif and then, pressed again, move it: a double press on either places
	# once with one save.
	for size in [Vector2i(1100,760),Vector2i(390,667)]:
		var touch: bool = size.x < 600
		await reset(suite,game,full,size)
		var stand: Vector2 = game.mural_stand_xz()
		game.player.position = Vector3(stand.x,game.player.position.y,stand.y); game.current_path.clear(); game.walking_to_mural = false; game.pending_celeste_talk = false
		for target in [game.mural_sun_btn,game.mural_buttons[5]]:
			game.mural_placements = {}; game.mural_completed = false; game.active_motif = ""
			game.show_mural_panel(true); game.update_mural_ui(); await settle(suite)
			var paint_seq: int = game.save_seq; var label: String = target.text
			once(suite,"mural %s %s" % [label,size],await double_press(suite,game,target,0.15,touch))
			suite.require(game.mural_placements.size() == 1 and game.save_seq == paint_seq + 1,"a double press on %s places once and saves once: %s, %d saves" % [label,JSON.stringify(game.mural_placements),game.save_seq - paint_seq])
			await suite.create_timer(0.65).timeout
		game.show_mural_panel(false); await calm(suite,game)
	cases += 1
	# Put the caller back the way programme_gathering_checks does: profile, size, fields, panel visibility, motion, save bytes, focus.
	await calm(suite,game)
	suite.require(game.apply_save_envelope(original),"press settle restores the caller profile")
	game.hide_story_card(); suite.root.content_scale_size = scale0; suite.root.size = size0
	for key in state: game.set(key,state[key])
	for c in visibility: c.visible = visibility[c]
	game.update_block_ui(); game.layout_block_action_pages(); game.layout_walking_controls_and_hub(); MOTION.restore_motion(game,motion)
	await settle(suite)
	for key in state: game.set(key,state[key])
	MOTION.restore_motion(game,motion)
	game.cue_history.assign(history); game.info.text = info_text
	if had_save:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(saved); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	for key in state: suite.require(game.get(key) == state[key],"press settle restores caller field "+key)
	suite.require(JSON.stringify(game.build_save_envelope()) == original and MOTION.motion_state(game) == motion,"press settle restores caller motion and progress")
	game.press_settle_until = 0; game.press_settle_frame = -10
	print("PRESS_SETTLE_PASS cases=",cases)
