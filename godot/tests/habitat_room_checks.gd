extends RefCounted
const MOTION := preload("res://tests/helper_bench_checks.gd")

static func assert_returned(suite: SceneTree,game: Node,room: Node,before: Dictionary,focus: Control) -> void:
	suite.require(not room.visible and not game.helper_bench.visible and not game.film_screening.visible,"entire film/helper/room chain returns to block")
	for control in before: suite.require(control.visible==before[control],"Keep/Escape restores original sibling visibility: "+str(control.name))
	var expected: Control=focus if is_instance_valid(focus) and focus.is_visible_in_tree() else (game.block_film_btn if game.block_film_btn.is_visible_in_tree() else null)
	suite.require(suite.root.gui_get_focus_owner()==expected,"Keep/Escape restores original visible focus or original film fallback")

static func escape(suite: SceneTree) -> void:
	var key := InputEventKey.new(); key.keycode=KEY_ESCAPE; key.pressed=true; Input.parse_input_event(key)
	await suite.process_frame
	key=InputEventKey.new(); key.keycode=KEY_ESCAPE; key.pressed=false; Input.parse_input_event(key)
	for frame in range(4): await suite.process_frame

static func verify(suite: SceneTree,game: Node,full: String,formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path!=game.GODOT_SAVE_PATH,"habitat uses isolated test state")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL habitat token only in full suite")
	var room: Node=game.habitat_room
	var original: String=JSON.stringify(game.build_save_envelope()); var size0: Vector2i=suite.root.size; var scale0: Vector2i=suite.root.content_scale_size
	var motion: Dictionary=MOTION.motion_state(game); var state := {}; var visibility := {}; var focus: Control=suite.root.gui_get_focus_owner()
	for key in ["save_seq","save_load_status","browser_import_status","browser_import_message","last_story_chapter","startup_story_pending","block_panel_mode","header_details_expanded"]: state[key]=game.get(key)
	for control in room.get_parent().get_children():
		if control is Control: visibility[control]=control.visible
	var had_save: bool=FileAccess.file_exists(game.save_path); var saved := FileAccess.get_file_as_bytes(game.save_path) if had_save else PackedByteArray()
	var cases := 0
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout
			if layout=="floor":
				profile.film.result.framing="close"; profile.film.result.order=["paint","welcome","seat"]; profile.film.draft=profile.film.result.duplicate(true); profile.film.captured=profile.film.result.order.duplicate(); profile.civic.result.format="circle"; profile.civic.result.notes="none"
				for result in profile.hosting.results:
					if result.id=="art": result.value={"palette":"warm","tiles":[0,2,1,2,0,1]}
					if result.id=="pause": result.value="arc"
					if result.id=="beats": result.value=145
			suite.root.size=size; suite.require(game.apply_save_envelope(JSON.stringify(profile)),"private completed-film copied axes validate")
			game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num); game.following_player=false; game.in_overview=false; game.in_wide_overview=false
			for frame in range(8): await suite.process_frame
			var before: String=JSON.stringify(game.build_save_envelope()); var seq: int=game.save_seq; var pose: Array=game.panel_camera_pose(); var player: Vector3=game.player.position
			var quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]; var helper_before: Dictionary=game.helper_bench.snapshot(); var case_motion: Dictionary=MOTION.motion_state(game)
			# Establish real visible focus before F4-equivalent entry, never force it after exit.
			if game.walk_control.is_visible_in_tree(): game.walk_control.grab_focus()
			elif game.block_film_btn.is_visible_in_tree(): game.block_film_btn.grab_focus()
			var entry_focus: Control=suite.root.gui_get_focus_owner(); var entry_visibility := {}
			for control in room.get_parent().get_children():
				if control is Control: entry_visibility[control]=control.visible
			suite.require(game.film_screening.open_screening(),"film retains original entry")
			await suite.phone_accept(game.film_screening.helper_entry)
			for frame in range(6): await suite.process_frame
			var bench: Dictionary=game.helper_bench.snapshot()
			suite.require(not game.helper_bench.complete and game.helper_bench.habitat_entry.is_visible_in_tree(),"habitat invitation does not require visit-local helper completion")
			for b in bench.buttons: suite.require(b.width>=44 and b.height>=44 and b.text_fits,"original helper and same-row invitation retain44px full words")
			suite.require(bench.picture.height>=80 and bench.picture.width>=180,"helper keeps original picture budget")
			if cases==0:
				for guard in ["startup","route","story"]:
					if guard=="startup": game.startup_story_pending=true
					elif guard=="route": game.current_path.append(Vector2.ZERO)
					else: game.power_story.active=true
					var bench_state: Dictionary=game.helper_bench.saved_visibility.duplicate()
					await suite.phone_accept(game.helper_bench.habitat_entry)
					suite.require(game.helper_bench.visible and not room.visible and game.helper_bench.saved_visibility==bench_state and game.helper_bench.habitat_entry.has_focus(),"guarded handoff retains caller visibility/focus/state before closing: "+guard)
					game.startup_story_pending=false; game.current_path.clear(); game.power_story.active=false
			await suite.phone_accept(game.helper_bench.habitat_entry)
			suite.require(room.visible and not game.helper_bench.visible and room.assigned.is_empty(),"sequential earned habitat handoff starts unassigned")
			await suite.phone_accept(room.back); assert_returned(suite,game,room,entry_visibility,entry_focus)
			suite.require(room.open_room() and room.assigned.is_empty(),"empty Keep does not invent suggested placement")
			for item in range(3):
				await suite.phone_accept(room.items[item]); await suite.phone_accept(room.places[(item+cases)%4]); var parked: Vector2=room.helper_anchor(); await suite.phone_accept(room.assist)
				var anchor: Vector2=room.helper_anchor(); suite.require(anchor!=parked and anchor.x-27>301 and anchor.x+27<419 and anchor.y-18.5>25 and anchor.y+40<100,"deliberate carry moves same-size helper within clear header bay")
				var partial: Dictionary=room.composition(); suite.require(partial.size()==item+1 and not room.complete,"each deliberate carry changes one module, never welcomes automatically")
				await suite.phone_accept(room.back); assert_returned(suite,game,room,entry_visibility,entry_focus)
				suite.require(room.open_room() and room.assigned==partial,"Keep retains each partial assignment")
				if item==0:
					await escape(suite); assert_returned(suite,game,room,entry_visibility,entry_focus)
					suite.require(room.open_room() and room.assigned==partial and not room.complete,"partial Escape returns block and same-visit arrangement")
			await suite.phone_accept(room.assist); suite.require(room.complete and room.reader.text.begins_with("Thanh:"),"deliberate Welcome gives spatial resident acknowledgment")
			var finished: Dictionary=room.composition(); finished.clear(); suite.require(room.assigned.size()==3,"future consumer gets defensive copy")
			var copy: Dictionary=room.copies(); suite.require(copy.film==profile.film.result and copy.civic==profile.civic.result,"room uses exact copied film/civic results")
			for frame in range(6): await suite.process_frame
			for item in range(3):
				await suite.phone_accept(room.items[item]); await suite.phone_accept(room.detail)
				var snap: Dictionary=room.snapshot(); var screen := Rect2(Vector2.ZERO,Vector2(size))
				for b in [snap.top,snap.tray,snap.picture,snap.art]+snap.buttons: suite.require(screen.encloses(Rect2(b.x,b.y,b.width,b.height)),"habitat detail/control/actual drawing fits all supported sizes")
				for b in snap.buttons: suite.require(b.width>=44 and b.height>=44 and b.text_fits,"whole-word44px habitat choices")
				suite.require(snap.reader.height>=64 and snap.art.width>=70 and snap.art.height>=80,"detail remains visible with complete16px reader")
				if item==1:
					await escape(suite); assert_returned(suite,game,room,entry_visibility,entry_focus)
					suite.require(room.open_room() and room.inspecting and room.complete,"detail Escape returns block and revisits same detail/state")
				await suite.phone_accept(room.detail)
			room.reader.grab_focus(); var end := InputEventKey.new(); end.keycode=KEY_END; end.pressed=true; Input.parse_input_event(end)
			for frame in range(4): await suite.process_frame
			var snap: Dictionary=room.snapshot(); suite.require(absf(snap.scroll-snap.scroll_max)<1,"real End reaches entire habitat disclosure")
			for key in [KEY_F2,KEY_F3,KEY_F4,KEY_F5,KEY_F6,KEY_F7,KEY_F8]:
				var event := InputEventKey.new(); event.keycode=key; event.shift_pressed=key==KEY_F8; event.pressed=true; Input.parse_input_event(event); await suite.process_frame; event=InputEventKey.new(); event.keycode=key; event.pressed=false; Input.parse_input_event(event)
			game.open_mural_workshop(); suite.require(room.visible and not game.mural_workshop.visible and not game.story_picker.visible,"other owners cannot open over room")
			suite.require(not game.import_browser_save_json("not-json") and room.complete and room.visible,"failed browser import preserves room")
			var held := InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held); await suite.phone_accept(room.back)
			for frame in range(6): await suite.process_frame
			suite.require(room.release_pending() and game.player.position==player,"held movement on Keep stays blocked")
			assert_returned(suite,game,room,entry_visibility,entry_focus)
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held)
			for frame in range(3): await suite.physics_frame
			suite.require(not room.release_pending(),"actual release clears habitat hold")
			suite.require(JSON.stringify(game.build_save_envelope())==before and game.save_seq==seq and game.panel_camera_pose()==pose,"room does not save or take camera")
			suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"room does not take audio")
			suite.require(game.helper_bench.snapshot().world==helper_before.world,"no world display/geometry/cutaway changes")
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held)
			for frame in range(5): await suite.physics_frame
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held); Input.flush_buffered_events()
			suite.require(game.player.position.distance_to(player)>0.01,"fresh movement works after released habitat exit")
			suite.require(game.apply_save_envelope(before) and room.assigned.is_empty() and not room.complete and room.available(),"native load resets visit but retains invitation")
			MOTION.restore_motion(game,case_motion); cases+=1
	game.apply_save_envelope(full); game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num)
	suite.require(room.open_room(),"private permutation fixture opens")
	var permutations := 0
	for a in range(4):
		for b in range(4):
			for c in range(4):
				if a==b or b==c or a==c: continue
				room.assigned.clear(); room.complete=false
				for i in range(3): room.choose_item(i); room.choose_place([a,b,c][i]); room.carry_or_welcome()
				suite.require(room.assigned.size()==3 and not room.complete,"three distinct assignments before Welcome")
				room.carry_or_welcome(); suite.require(room.complete and room.reader.text.contains(game.film_shot_title(String(game.film_result.order[2])).to_lower()),"all24maps acknowledge actual ending")
				var old: Dictionary=room.composition(); room.choose_item(0); room.choose_place(b); suite.require(room.assigned==old and room.destination==a,"occupied destination refuses without displacement")
				for free in range(4):
					if free not in [a,b,c]: room.choose_place(free)
				room.carry_or_welcome(); suite.require(not room.complete and room.assigned.size()==3 and room.place_of("art")!=a,"deliberate relocation uses spare place and renews welcome")
				permutations+=1
	suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}') and not room.visible and room.assigned.is_empty() and room.available(),"successful earlier import clears visit, preserves forward-earned copies")
	game.film_phase="idle"; suite.require(not room.open_room(),"unearned invitation refused"); game.film_phase="done"
	game.power_story.active=true; suite.require(not room.open_room(),"hidden active story refuses"); game.power_story.active=false
	game.current_path.append(Vector2.ZERO); suite.require(not room.open_room(),"active route refuses"); game.current_path.clear()
	game.startup_story_pending=true; suite.require(not room.open_room(),"pending startup refuses"); game.startup_story_pending=false
	var film: Dictionary=game.film_result; game.film_result={}; suite.require(not room.available(),"invalid copied film refuses defensively"); game.film_result=film
	game.apply_save_envelope(original); game.hide_story_card(); suite.root.content_scale_size=scale0; suite.root.size=size0
	for key in state: game.set(key,state[key])
	for control in visibility: control.visible=visibility[control]
	game.update_block_ui(); game.layout_walking_controls_and_hub(); MOTION.restore_motion(game,motion)
	for frame in range(8): await suite.process_frame
	for key in state: game.set(key,state[key])
	MOTION.restore_motion(game,motion)
	if had_save:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(saved); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	suite.require(MOTION.motion_state(game)==motion and JSON.stringify(game.build_save_envelope())==original,"habitat tests restore caller motion and saved progress")
	suite.require(cases==22 and permutations==24,"all22layoutsizes and24placement permutations completed")
	if not suite.failed: print("HABITAT_ROOM_PASS:"+("FORMAL" if formal else "PRIVATE")+"22layout-size/24maps/copied-art-film-seats/Keep/load/input/quiet")
