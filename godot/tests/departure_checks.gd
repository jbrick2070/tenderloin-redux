extends RefCounted
const MOTION := preload("res://tests/helper_bench_checks.gd")
const ROOM := preload("res://tests/habitat_room_checks.gd")

static func assemble(suite: SceneTree,room: Node,positions: Array) -> void:
	for i in range(3):
		await suite.phone_accept(room.items[i]); await suite.phone_accept(room.places[positions[i]]); await suite.phone_accept(room.assist)
	await suite.phone_accept(room.assist)
	suite.require(room.complete and room.assist.text=="Prepare together","welcomed room retains deliberate preparation invitation")
	await suite.phone_accept(room.assist)
	suite.require(room.mode=="links" and room.links.is_empty() and not room.departure_ready,"Prepare never completes links/readiness")

static func fit(suite: SceneTree,room: Node,positions: Array) -> void:
	var spare: int=6-int(positions[0])-int(positions[1])-int(positions[2])
	# Independent grid labels: Entry=(0,1), Window=(1,0), Wall=(0,0), Side=(1,1).
	var grid := [Vector2i(0,1),Vector2i(1,0),Vector2i(0,0),Vector2i(1,1)]
	for i in range(3):
		var correct := 0 if grid[positions[i]].y==grid[spare].y else (1 if grid[positions[i]].x==grid[spare].x else 2)
		await suite.phone_accept(room.items[i]); await suite.phone_accept(room.places[(correct+1)%3]); var before: Array=room.links.duplicate(); await suite.phone_accept(room.assist)
		suite.require(room.links==before and room.notice.contains(room.NAMES[positions[i]].to_lower()) and room.assist.has_focus(),"misfit explains actual owner place, preserves links and focus")
		await suite.phone_accept(room.places[correct]); await suite.phone_accept(room.assist)
		suite.require(room.links.size()==i+1 and not room.departure_ready and room.panel==-1,"correct relation fits exactly one link without readiness/departure")
	suite.require(room.reader.text.contains(room.game.bea_invitation.TITLES[room.invitation().value]),"Bea contributes only copied invitation title")

static func verify(suite: SceneTree,game: Node,full: String,formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path!=game.GODOT_SAVE_PATH,"departure requires isolated native profile")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL departure token only in full suite")
	var room: Node=game.habitat_room; var original: String=JSON.stringify(game.build_save_envelope()); var motion: Dictionary=MOTION.motion_state(game)
	var size0: Vector2i=suite.root.size; var scale0: Vector2i=suite.root.content_scale_size; var state := {}; var visibility := {}; var focus: Control=suite.root.gui_get_focus_owner()
	for key in ["save_seq","save_load_status","browser_import_status","browser_import_message","last_story_chapter","startup_story_pending","block_panel_mode","header_details_expanded","last_music_cue","cue_arpeggio_duration","reward_sound_count","suppress_feel_good_burst","unlocked_stem_mask","last_a11y_announcement","a11y_announcement_seq","selected_neighbor","arrived_neighbor","walking_to_mural","walking_to_speaker","walking_to_history_stop","pending_celeste_talk","pending_rook_talk","music_mode","local_music_name","music_error","sketch_tick","sketch_phase","sketch_frames_pushed"]: state[key]=game.get(key)
	var history: Array=game.cue_history.duplicate(true); var freqs: Array=game.cue_arpeggio_freqs.duplicate(); var info_text: String=game.info.text
	suite.require(not game.music_playing and game.current_path.is_empty() and game.active_story_episode()==null,"departure fixture requires quiet idle caller; does not restore live audio or active episodes")
	var local_stream: AudioStream=game.local_audio_player.stream if game.local_audio_player!=null else null
	for c in room.get_parent().get_children():
		if c is Control: visibility[c]=c.visible
	var had_save: bool=FileAccess.file_exists(game.save_path); var saved := FileAccess.get_file_as_bytes(game.save_path) if had_save else PackedByteArray()
	var cases := 0
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout
			for result in profile.hosting.results:
				if result.id=="stories": result.value="memory" if layout=="table" else "future"
				if result.id=="beats": result.value=0 if layout=="table" else 145
				if result.id=="pause": result.value="pairs" if layout=="table" else "arc"
			suite.root.size=size; suite.require(game.apply_save_envelope(JSON.stringify(profile)),"departure private copied fixture validates")
			game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num); game.following_player=false; game.in_overview=false; game.in_wide_overview=false
			for frame in range(8): await suite.process_frame
			var before: String=JSON.stringify(game.build_save_envelope()); var pose: Array=game.panel_camera_pose(); var seq: int=game.save_seq; var quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
			var positions := [cases%4,(cases+1)%4,(cases+2)%4]; suite.require(room.open_room(),"earned room opens")
			await assemble(suite,room,positions); await fit(suite,room,positions)
			await suite.phone_accept(room.back); suite.require(room.open_room() and room.assist.has_focus() and not room.departure_ready and room.links.size()==3,"assembled Keep/re-entry focuses enabled Ready without automatic readiness")
			await suite.phone_accept(room.assist); suite.require(room.departure_ready and room.mode=="links" and room.panel==-1,"Ready has distinct still figure and no automatic departure")
			suite.require(room.reader.has_focus(),"Ready hands focus to acknowledgment, distinct from Depart")
			var accept := InputEventAction.new(); accept.action="ui_accept"; accept.pressed=true; Input.parse_input_event(accept); await suite.process_frame
			accept=InputEventAction.new(); accept.action="ui_accept"; accept.pressed=false; Input.parse_input_event(accept); await suite.process_frame
			suite.require(room.mode=="links" and room.panel==-1,"repeated accept while reading does not depart")
			for owner in ["Bea:","Celeste:","Dez:","Thanh:"]: suite.require(room.reader.text.contains(owner),"all4resident acknowledgments present")
			if layout=="table": suite.require(room.reader.text.contains("no marked beats"),"literal zero rhythm survives readiness")
			await suite.phone_accept(room.back); suite.require(room.open_room() and room.departure_ready and room.assist.has_focus(),"ready Keep/re-entry retains state and enabled focus")
			await suite.phone_accept(room.assist); suite.require(room.mode=="depart" and room.panel==0,"Depart deliberately begins first still panel")
			suite.require(room.credit.text.contains("Speculative future chapter") and not room.places[2].visible and not room.assist.visible,"departure phase label and absence of pseudo-actions are truthful")
			var first: PackedByteArray=room.picture.texture.get_image().get_data()
			await suite.phone_accept(room.places[0]); suite.require(room.panel==1 and first!=room.picture.texture.get_image().get_data(),"Next deliberately changes actual composition")
			await ROOM.escape(suite); suite.require(room.open_room() and room.panel==1 and room.places[0].has_focus(),"mid-reveal Escape/re-entry retains exact panel and focus")
			await suite.phone_accept(room.places[0]); var final_image: PackedByteArray=room.picture.texture.get_image().get_data(); var final_text: String=room.reader.text
			suite.require(room.panel==2 and room.detail.has_focus(),"final panel focuses Back to room")
			await suite.phone_accept(room.detail); await suite.phone_accept(room.assist); await suite.phone_accept(room.assist); await suite.phone_accept(room.places[1])
			suite.require(room.panel==2 and room.picture.texture.get_image().get_data()==final_image and room.reader.text==final_text,"actual Skip equals full still path image/text, no timers")
			var snap: Dictionary=room.snapshot(); var screen := Rect2(Vector2.ZERO,Vector2(size))
			for b in [snap.top,snap.tray,snap.picture,snap.art]+snap.buttons:
				if b.get("visible",true): suite.require(screen.encloses(Rect2(b.x,b.y,b.width,b.height)),"departure drawing/control stays inside supported size")
			for b in snap.buttons:
				if b.visible: suite.require(b.width>=44 and b.height>=44 and b.text_fits,"departure whole-word44px control")
			suite.require(snap.reader.height>=64 and snap.art.height>=120 and snap.art.width>=180,"still reveal and complete16px reader remain visible")
			suite.require(not game.import_browser_save_json("bad") and room.panel==2 and room.departure_ready,"failed browser import preserves departure")
			await suite.phone_accept(room.detail); suite.require(room.mode=="room" and room.departure_ready and room.links.size()==3,"Back returns original room controls without losing preparation")
			await suite.phone_accept(room.items[0]); await suite.phone_accept(room.places[6-positions[0]-positions[1]-positions[2]]); suite.require(room.departure_ready,"selection does not invalidate")
			await suite.phone_accept(room.assist); suite.require(not room.complete and room.links.is_empty() and not room.departure_ready and room.panel==-1,"actual relocation clears all preparation and renews welcome")
			await suite.phone_accept(room.assist); await suite.phone_accept(room.assist); suite.require(room.mode=="links","new welcome retains preparation access")
			await ROOM.escape(suite); suite.require(JSON.stringify(game.build_save_envelope())==before and game.save_seq==seq and game.panel_camera_pose()==pose and game.current_path.is_empty(),"departure writes no progress or camera/route")
			suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"departure keeps audio intent")
			suite.require(game.apply_save_envelope(before) and room.mode=="room" and room.links.is_empty() and not room.departure_ready and room.panel==-1,"successful startup/test-path native apply clears whole departure visit")
			cases+=1
	game.apply_save_envelope(full); game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num); suite.require(room.open_room(),"24map fixture opens")
	var maps := 0
	for a in range(4):
		for b in range(4):
			for c in range(4):
				if a==b or b==c or a==c: continue
				room.reset_visit(); suite.require(room.open_room(),"each of24maps starts through actual reset/reopen ownership path")
				await assemble(suite,room,[a,b,c]); await fit(suite,room,[a,b,c]); maps+=1
	var import_quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
	suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}') and not room.visible and room.links.is_empty() and room.mode=="room" and room.available(),"successful forward-only browser import resets visit and keeps invitation")
	suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==import_quiet,"successful browser import preserves audio intent and creates no reward sound")
	suite.require(game.last_music_cue=="browser_save_import","successful import cue metadata is exercised before caller restoration")
	game.apply_save_envelope(original); game.hide_story_card(); suite.root.content_scale_size=scale0; suite.root.size=size0
	for key in state: game.set(key,state[key])
	for c in visibility: c.visible=visibility[c]
	game.update_block_ui(); game.layout_walking_controls_and_hub(); MOTION.restore_motion(game,motion)
	for frame in range(8): await suite.process_frame
	for key in state: game.set(key,state[key])
	MOTION.restore_motion(game,motion)
	game.cue_history.assign(history); game.cue_arpeggio_freqs.assign(freqs)
	if game.local_audio_player!=null: game.local_audio_player.stream=local_stream
	game.update_music_ui(); game.info.text=info_text
	game.last_a11y_announcement=state.last_a11y_announcement; game.a11y_announcement_seq=state.a11y_announcement_seq
	for key in state: suite.require(game.get(key)==state[key],"departure restores idle caller field "+key)
	suite.require(game.cue_history==history and game.cue_arpeggio_freqs==freqs and game.info.text==info_text and game.last_music_cue==state.last_music_cue and game.cue_arpeggio_duration==state.cue_arpeggio_duration and game.reward_sound_count==state.reward_sound_count,"departure restores full cue history, arpeggio, info and reward count, including bounded-history contents")
	if had_save:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(saved); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	suite.require(JSON.stringify(game.build_save_envelope())==original and MOTION.motion_state(game)==motion,"departure restores caller motion/progress")
	suite.require(cases==22 and maps==24,"departure22sizes/layouts and24maps executed")
	if not suite.failed: print("DEPARTURE_PASS:"+("FORMAL" if formal else "PRIVATE")+"22layout-size/24maps/Ready/Depart/still/Skip/Keep/load/quiet")
