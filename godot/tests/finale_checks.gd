extends RefCounted
const MOTION := preload("res://tests/helper_bench_checks.gd")
const ROOM := preload("res://tests/habitat_room_checks.gd")
const DEPARTURE := preload("res://tests/departure_checks.gd")
const ORBIT := preload("res://tests/orbital_checks.gd")

static func layout(suite: SceneTree,orbit: Node) -> void:
	for frame in range(8): await suite.process_frame
	var s: Dictionary=orbit.snapshot()
	var title: String={"walk":"Walk the commons","gathered":"An open place","menu":"The welcome stays open","return":"A way home","recap":"Memories of this visit"}[s.phase]
	suite.require(s.heading.contains(title),"visible finale heading describes its current phase")
	var screen := Rect2(Vector2.ZERO,Vector2(suite.root.size))
	for control in [s.top,s.tray,s.art]+s.buttons:
		if control.get("visible",true): suite.require(screen.encloses(Rect2(control.x,control.y,control.width,control.height)),"finale visible geometry fits supported viewport")
	for b in s.buttons:
		if b.visible: suite.require(b.width>=44 and b.height>=44 and b.text_fits,"finale whole-word44px actions")
	suite.require(s.reader.height>=64 and s.art.width>=180 and s.art.height>=120,"finale retains reader and original drawing minimums")

static func lifecycle(suite: SceneTree,game: Node,full: String) -> void:
	var room: Node=game.habitat_room; var orbit: Node=room.orbital
	for kind in ["native good","native bad","browser"]:
		suite.require(game.apply_save_envelope(full),"finale lifecycle valid isolated fixture")
		game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num)
		for frame in range(8): await suite.process_frame
		suite.require(room.open_room(),"populated finale lifecycle uses real room path")
		await DEPARTURE.assemble(suite,room,[0,1,2]); await DEPARTURE.fit(suite,room,[0,1,2]); await suite.phone_accept(room.assist); await suite.phone_accept(room.assist); await suite.phone_accept(room.places[1]); await suite.phone_accept(room.assist)
		await suite.phone_accept(orbit.destinations[0]); await ORBIT.finish_walk(suite,orbit); await suite.phone_accept(orbit.invite); await ORBIT.finish_walk(suite,orbit)
		await suite.phone_accept(orbit.stop); await suite.phone_accept(orbit.destinations[0]); await suite.phone_accept(orbit.destinations[1]); await suite.phone_accept(orbit.destinations[1]); await suite.create_timer(0.1).timeout; await suite.phone_accept(orbit.stop)
		var roaming: Array=[orbit.player,orbit.thanh]; await suite.phone_accept(orbit.stop); await suite.phone_accept(orbit.invite)
		suite.require(orbit.phase=="gathered" and orbit.depicted_player()==orbit.DESTINATIONS[0] and [orbit.player,orbit.thanh]==roaming,"Gathering replay uses saved still composition while actual exploration positions stay intact")
		await suite.phone_accept(orbit.destinations[0]); await suite.phone_accept(orbit.destinations[0]); await suite.phone_accept(orbit.destinations[2]); await suite.phone_accept(orbit.destinations[1])
		suite.require(orbit.completed and orbit.returned and orbit.gathering==0 and not room.visible,"actual completed return exists before each reset boundary")
		var before: String=JSON.stringify(game.build_save_envelope()); var quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
		if kind=="native good": suite.require(game.apply_save_envelope(before),"successful native apply on populated finale")
		elif kind=="native bad": suite.require(not game.apply_save_envelope("bad"),"invalid native rejects populated finale envelope")
		else:
			suite.require(not game.import_browser_save_json("bad") and orbit.completed and orbit.returned and orbit.gathering==0,"failed browser import preserves populated completion/return")
			suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}'),"successful browser import on populated finale")
		suite.require(not orbit.started and not orbit.completed and not orbit.returned and orbit.gathering==-1 and orbit.phase=="walk" and orbit.return_panel==0 and orbit.memory==0,"native and successful browser import reset every finale visit field")
		if kind=="native bad": suite.require(not room.available() and game.film_phase=="idle" and game.save_load_status=="recovered","invalid native uses recovered defaults")
		else: suite.require(room.available(),"successful apply/import retains earned access")
		suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"finale reset boundaries preserve quiet")
		if kind=="native good": suite.require(JSON.stringify(game.build_save_envelope())==before,"successful native apply preserves original progress")
		print("FINALE_LIFECYCLE_OBSERVATION ",JSON.stringify({"kind":kind,"completed":orbit.completed,"returned":orbit.returned,"phase":orbit.phase,"available":room.available(),"status":game.save_load_status}))

static func verify(suite: SceneTree,game: Node,full: String,formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path!=game.GODOT_SAVE_PATH,"finale requires isolated native profile")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL finale token only in full suite")
	var room: Node=game.habitat_room; var orbit: Node=room.orbital; var original: String=JSON.stringify(game.build_save_envelope()); var motion: Dictionary=MOTION.motion_state(game)
	var size0: Vector2i=suite.root.size; var scale0: Vector2i=suite.root.content_scale_size; var state := {}; var visibility := {}; var focus: Control=suite.root.gui_get_focus_owner()
	for key in ["save_seq","save_load_status","browser_import_status","browser_import_message","last_story_chapter","startup_story_pending","block_panel_mode","header_details_expanded","last_music_cue","cue_arpeggio_duration","reward_sound_count","suppress_feel_good_burst","unlocked_stem_mask","last_a11y_announcement","a11y_announcement_seq","selected_neighbor","arrived_neighbor","walking_to_mural","walking_to_speaker","walking_to_history_stop","pending_celeste_talk","pending_rook_talk","music_mode","local_music_name","music_error","sketch_tick","sketch_phase","sketch_frames_pushed"]: state[key]=game.get(key)
	var history: Array=game.cue_history.duplicate(true); var freqs: Array=game.cue_arpeggio_freqs.duplicate(); var info_text: String=game.info.text
	suite.require(not game.music_playing and game.current_path.is_empty() and game.active_story_episode()==null,"orbital fixture requires quiet idle caller; does not restore live audio or active episodes")
	var local_stream: AudioStream=game.local_audio_player.stream if game.local_audio_player!=null else null
	for c in room.get_parent().get_children():
		if c is Control: visibility[c]=c.visible
	var had_save: bool=FileAccess.file_exists(game.save_path); var saved := FileAccess.get_file_as_bytes(game.save_path) if had_save else PackedByteArray()
	var cases := 0
	for layout_name in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout_name
			for result in profile.hosting.results:
				if result.id=="beats": result.value=0 if layout_name=="table" else 145
			suite.root.size=size; suite.require(game.apply_save_envelope(JSON.stringify(profile)),"finale validates original fixture")
			game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num)
			for frame in range(8): await suite.process_frame
			var before: String=JSON.stringify(game.build_save_envelope()); var pose: Array=game.panel_camera_pose(); var quiet := [game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]; var seq: int=game.save_seq
			var positions := [cases%4,(cases+1)%4,(cases+2)%4]; suite.require(room.open_room(),"finale room entry")
			await DEPARTURE.assemble(suite,room,positions); await DEPARTURE.fit(suite,room,positions); await suite.phone_accept(room.assist); await suite.phone_accept(room.assist); await suite.phone_accept(room.places[1]); await suite.phone_accept(room.assist)
			suite.require(not orbit.can_gather() and not orbit.completed and not orbit.returned,"arrival and entry never grant finale")
			var chosen: int=cases%3; await suite.phone_accept(orbit.destinations[chosen]); await ORBIT.finish_walk(suite,orbit)
			suite.require(not orbit.can_gather(),"walking alone does not gather")
			await suite.phone_accept(orbit.invite); await ORBIT.finish_walk(suite,orbit); suite.require(orbit.can_gather() and orbit.stop.text=="Gather here","current shared view exposes deliberate Gather")
			var copies: Dictionary=orbit.orbital_copies.duplicate(true)
			await suite.phone_accept(orbit.stop); suite.require(orbit.phase=="gathered" and orbit.gathering==chosen and not orbit.completed and orbit.reader.has_focus(),"still gathering is deliberate and separate from completion")
			await layout(suite,orbit)
			for resident in ["Celeste:","Dez:","Thanh:","Bea:"]: suite.require(orbit.reader.text.contains(resident),"specific gathering acknowledgment "+resident)
			suite.require(orbit.reader.text.contains("A little later") and orbit.reader.text.contains(String(game.FILM_FRAMING_LABELS[copies.film.framing]).to_lower()),"honest still time cut and copied framing")
			await suite.phone_accept(orbit.destinations[1]); suite.require(orbit.phase=="walk" and not orbit.completed and orbit.can_gather(),"unfinished Back to commons preserves deliberate response")
			await suite.phone_accept(orbit.stop); await suite.phone_accept(orbit.back); suite.require(not orbit.visible and room.visible and not orbit.completed,"gathered Back reviews departure without finishing")
			await suite.phone_accept(room.assist); suite.require(orbit.phase=="gathered" and not orbit.completed,"departure reentry retains unfinished gathering")
			await suite.phone_accept(orbit.pause); suite.require(not orbit.completed and not orbit.returned and not room.visible,"Pause before final response never completes")
			suite.require(room.open_room() and orbit.phase=="gathered" and not orbit.moving(),"partial gathering revisits stopped")
			await suite.phone_accept(orbit.destinations[0]); suite.require(orbit.completed and not orbit.returned and orbit.phase=="menu" and orbit.reader.has_focus(),"explicit final response grants visit-only gathering completion")
			await suite.phone_accept(orbit.back); await suite.phone_accept(room.assist); suite.require(orbit.phase=="menu" and orbit.completed and not orbit.returned,"completed menu survives departure review and reentry")
			await layout(suite,orbit); await suite.phone_accept(orbit.destinations[2])
			for i in range(3):
				await suite.phone_accept(orbit.destinations[i]); await layout(suite,orbit); suite.require(orbit.phase=="recap" and orbit.memory==i and orbit.orbital_copies==copies,"memories are actual unchanged copies")
			await suite.phone_accept(orbit.invite); await suite.phone_accept(orbit.destinations[1]); suite.require(orbit.phase=="walk" and orbit.completed and orbit.stop.text=="Finale choices","Explore preserves recognition and available original walking")
			await suite.phone_accept(orbit.destinations[(chosen+1)%3]); await suite.create_timer(0.1).timeout; suite.require(orbit.moving(),"post-finale exploration actually walks")
			orbit.reader.grab_focus(); suite.require(not orbit.moving(),"reading still cancels post-finale walking")
			await suite.phone_accept(orbit.stop); await suite.phone_accept(orbit.destinations[0]); suite.require(orbit.phase=="return" and orbit.return_panel==0 and not orbit.returned,"Return starts authored content without premature home completion")
			await suite.phone_accept(orbit.destinations[0]); suite.require(orbit.phase=="menu" and not orbit.returned,"Previous at first return panel returns to choices")
			await suite.phone_accept(orbit.destinations[0]); await suite.phone_accept(orbit.back); suite.require(orbit.phase=="menu" and not orbit.returned,"return Back to choices never grants return")
			await suite.phone_accept(orbit.destinations[0]); await layout(suite,orbit); await suite.phone_accept(orbit.destinations[1]); suite.require(orbit.return_panel==1,"Next advances authored still")
			await ROOM.escape(suite); suite.require(not orbit.returned and room.open_room() and orbit.phase=="return" and orbit.return_panel==1,"Escape pauses midreturn and reentry retains exact panel")
			await suite.phone_accept(orbit.destinations[1]); await layout(suite,orbit); var last: String=orbit.reader.text
			await suite.phone_accept(orbit.destinations[0]); await suite.phone_accept(orbit.destinations[2]); suite.require(orbit.return_panel==2 and orbit.reader.text==last and not orbit.returned,"Skip has exact Next content parity and cannot itself return home")
			suite.require(not game.import_browser_save_json("bad") and orbit.completed and orbit.return_panel==2,"failed browser import preserves populated finale")
			await suite.phone_accept(orbit.destinations[1]); suite.require(orbit.returned and orbit.completed and not room.visible and orbit.phase=="menu","Home now alone records authored return and restores block")
			suite.require(game.last_a11y_announcement.contains("Revisit finale"),"return announcement names the actual reentry control")
			suite.require(JSON.stringify(game.build_save_envelope())==before and game.save_seq==seq and game.panel_camera_pose()==pose and [game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"finale and return preserve durable work, camera and quiet")
			suite.require(room.open_room() and orbit.phase=="menu" and orbit.returned and not orbit.moving(),"completed return revisits choices with visible recognition")
			await suite.phone_accept(orbit.pause); suite.require(game.last_a11y_announcement.contains("return home is already complete") and orbit.returned,"Pause after return acknowledges completed journey")
			suite.require(room.open_room() and orbit.returned,"returned Pause reentry keeps recognition")
			await suite.phone_accept(orbit.back); await suite.phone_accept(room.detail); await suite.phone_accept(room.items[0]); await suite.phone_accept(room.detail); suite.require(orbit.returned,"selection/detail retain recognition")
			await suite.phone_accept(room.detail); await suite.phone_accept(room.places[6-positions[0]-positions[1]-positions[2]]); await suite.phone_accept(room.assist)
			suite.require(not orbit.completed and not orbit.returned and orbit.gathering==-1 and orbit.phase=="walk" and not room.complete,"actual relocation invalidates whole finale and renews Welcome")
			await ROOM.escape(suite)
			cases+=1
	await lifecycle(suite,game,full)
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
	for key in state: suite.require(game.get(key)==state[key],"orbital restores idle caller field "+key)
	suite.require(game.cue_history==history and game.cue_arpeggio_freqs==freqs and game.info.text==info_text and game.last_music_cue==state.last_music_cue and game.cue_arpeggio_duration==state.cue_arpeggio_duration and game.reward_sound_count==state.reward_sound_count,"orbital restores full cue history, arpeggio, info and reward count, including bounded-history contents")
	if had_save:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(saved); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	suite.require(JSON.stringify(game.build_save_envelope())==original and MOTION.motion_state(game)==motion,"orbital restores caller motion/progress")
	suite.require(cases==22,"finale22layout-size journeys executed")
	if not suite.failed: print("ENDING_FINALE_PASS:"+("FORMAL" if formal else "PRIVATE")+"22layout-size/gather/recognition/memories/explore/return/Skip/relocation/caller")
