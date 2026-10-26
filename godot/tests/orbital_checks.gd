extends RefCounted
const MOTION := preload("res://tests/helper_bench_checks.gd")
const ROOM := preload("res://tests/habitat_room_checks.gd")
const DEPARTURE := preload("res://tests/departure_checks.gd")

static func finish_walk(suite: SceneTree,orbit: Node) -> void:
	var deadline: int=Time.get_ticks_msec()+20000
	while orbit.moving() and Time.get_ticks_msec()<deadline: await suite.process_frame
	suite.require(not orbit.moving(),"local traversal completes in bounded time")

static func near_arrival(suite: SceneTree,orbit: Node) -> void:
	# Inject only the sub-pixel interrupted endpoint; this is a boundary fixture,
	# not evidence that a browser/physical player hit that timing naturally.
	suite.require(orbit.shared==orbit.reached and orbit.reached>=0,"boundary fixture follows an actual completed invitation")
	var at_view: Vector2=orbit.thanh
	orbit.shared=-1; orbit.thanh+=Vector2(0.5,0); orbit.refresh(false)
	await suite.phone_accept(orbit.invite)
	suite.require(orbit.shared==orbit.reached and not orbit.moving() and orbit.sharing==-1 and orbit.invite.disabled,"explicit invitation beside destination completes without an empty-route limbo")
	orbit.thanh=at_view

static func lifecycle(suite: SceneTree,game: Node,full: String) -> void:
	var room: Node=game.habitat_room; var orbit: Node=room.orbital
	for kind in ["native good","native bad","browser"]:
		suite.require(game.apply_save_envelope(full),"lifecycle uses isolated valid original progress")
		game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num)
		for frame in range(8): await suite.process_frame
		suite.require(room.open_room(),"lifecycle starts with actual room entry")
		await DEPARTURE.assemble(suite,room,[0,1,2]); await DEPARTURE.fit(suite,room,[0,1,2]); await suite.phone_accept(room.assist); await suite.phone_accept(room.assist); await suite.phone_accept(room.places[1]); await suite.phone_accept(room.assist)
		await suite.phone_accept(orbit.destinations[0]); await finish_walk(suite,orbit); await suite.phone_accept(orbit.invite); await finish_walk(suite,orbit)
		suite.require(orbit.started and orbit.shared==0,"populated visit exists before each load/import boundary")
		var before: String=JSON.stringify(game.build_save_envelope()); var pos := [orbit.player,orbit.thanh]; var quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
		if kind=="native good": suite.require(game.apply_save_envelope(before),"successful isolated native apply")
		elif kind=="native bad": suite.require(not game.apply_save_envelope("bad"),"failed isolated native apply returns refusal")
		else:
			suite.require(not game.import_browser_save_json("bad") and orbit.started and orbit.shared==0 and [orbit.player,orbit.thanh]==pos,"failed browser import preserves actual populated visit")
			suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}'),"successful browser import exercised")
		suite.require(not orbit.started and not orbit.visible and orbit.shared==-1 and not room.complete,"all exercised native boundaries and successful import clear populated orbital state")
		if kind=="native bad": suite.require(not room.available() and game.film_phase=="idle" and game.save_load_status=="recovered","invalid startup native envelope uses existing recovered defaults, not browser-import preservation")
		else: suite.require(room.available(),"successful native apply/import retains valid earned film access")
		suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"load/import boundary preserves quiet intent")
		if kind=="native good": suite.require(JSON.stringify(game.build_save_envelope())==before,"valid native apply retains durable progress")
		print("ORBITAL_LIFECYCLE_OBSERVATION ",JSON.stringify({"kind":kind,"started":orbit.started,"shared":orbit.shared,"film_phase":game.film_phase,"status":game.save_load_status,"available":room.available()}))

static func verify(suite: SceneTree,game: Node,full: String,formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path!=game.GODOT_SAVE_PATH,"orbital requires isolated native profile")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL orbital token only in full suite")
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
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout
			for result in profile.hosting.results:
				if result.id=="stories": result.value="memory" if layout=="table" else "future"
				if result.id=="beats": result.value=0 if layout=="table" else 145
				if result.id=="pause": result.value="pairs" if layout=="table" else "arc"
			suite.root.size=size; suite.require(game.apply_save_envelope(JSON.stringify(profile)),"orbital fixture validates copied axes")
			game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num); game.following_player=false; game.in_overview=false; game.in_wide_overview=false
			for frame in range(8): await suite.process_frame
			var before: String=JSON.stringify(game.build_save_envelope()); var pose: Array=game.panel_camera_pose(); var seq: int=game.save_seq; var quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
			var positions := [cases%4,(cases+1)%4,(cases+2)%4]; suite.require(room.open_room(),"earned room opens without optional helper reconstruction")
			suite.require(not orbit.open_chapter() and not orbit.started,"orbital entry refuses before actual final departure")
			await DEPARTURE.assemble(suite,room,positions); await DEPARTURE.fit(suite,room,positions)
			await suite.phone_accept(room.assist); await suite.phone_accept(room.assist); await suite.phone_accept(room.places[1])
			suite.require(room.panel==2 and room.assist.visible and room.assist.text=="Walk orbital","only final deliberate panel invites local walking")
			await suite.phone_accept(room.assist); suite.require(orbit.is_visible_in_tree() and orbit.started and orbit.reader.has_focus(),"chapter opens with stopped reading focus")
			var copies: Dictionary=room.copies(); suite.require(orbit.orbital_copies==copies and orbit.copy_rasterizations==3,"explicit original art/film/seats cached once, never per movement")
			var snap: Dictionary=orbit.snapshot(); var screen := Rect2(Vector2.ZERO,Vector2(size))
			for control in [snap.top,snap.tray,snap.art]+snap.buttons+snap.floor_labels:
				suite.require(screen.encloses(Rect2(control.x,control.y,control.width,control.height)),"orbital controls/drawing inside supported viewport")
			for control in snap.buttons: suite.require(control.width>=44 and control.height>=44 and control.text_fits,"orbital44px whole-word buttons")
			suite.require(snap.floor_label_px>=12,"floor destination labels use readable screen-space size")
			suite.require(snap.reader.height>=64 and snap.art.width>=180 and snap.art.height>=120,"orbital reader and real walking area stay visible")
			if layout=="table": suite.require(snap.text.contains("no marked beats"),"literal zero retained")
			var first: int=cases%3; var second: int=(first+1)%3
			await suite.phone_accept(orbit.destinations[first]); var start: Vector2=orbit.player
			await suite.create_timer(0.18).timeout
			suite.require(orbit.moving() and orbit.player!=start and orbit.reached==-1 and orbit.shared==-1,"actual intermediate walking, no teleport or auto conversation")
			await suite.phone_accept(orbit.stop); var stopped: Vector2=orbit.player
			await suite.create_timer(0.1).timeout; suite.require(not orbit.moving() and orbit.player==stopped,"Stop cancels actual local route")
			if cases==0:
				# Targeted child notification injection, not an OS/device background test.
				for notification in [MainLoop.NOTIFICATION_APPLICATION_FOCUS_OUT,MainLoop.NOTIFICATION_APPLICATION_PAUSED,Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT]:
					await suite.phone_accept(orbit.destinations[first]); await suite.create_timer(0.1).timeout
					suite.require(orbit.moving(),"injected lifecycle case begins with real local traversal")
					orbit.propagate_notification(notification); var paused_position: Vector2=orbit.player
					await suite.create_timer(0.15).timeout; suite.require(not orbit.moving() and orbit.player==paused_position,"all three child lifecycle notifications cancel without resume")
			await suite.phone_accept(orbit.destinations[first]); await finish_walk(suite,orbit)
			suite.require(orbit.reached==first and orbit.shared==-1 and not orbit.invite.disabled,"arrival leaves separate social choice")
			await suite.phone_accept(orbit.invite); suite.require(orbit.stop.has_focus(),"disabled Invite hands keyboard focus to Stop without cancelling walking"); var resident_start: Vector2=orbit.thanh; await suite.create_timer(0.18).timeout
			suite.require(orbit.moving() and orbit.thanh!=resident_start and orbit.shared==-1,"Thanh genuinely walks only after invitation")
			await finish_walk(suite,orbit); suite.require(orbit.shared==first and orbit.reader.text.contains("Thanh:"),"resident arrives and acknowledges copied choice")
			suite.require(orbit.invite.disabled and orbit.destinations[first].has_focus(),"completed shared view has no repeated invitation and repairs disabled Stop focus")
			var at_view: Vector2=orbit.thanh; orbit.invite_thanh(); suite.require(not orbit.moving() and orbit.thanh==at_view,"repeated same-view invitation cannot start a round trip")
			if cases==0: await near_arrival(suite,orbit)
			await suite.phone_accept(orbit.destinations[second]); await suite.create_timer(0.1).timeout; orbit.reader.grab_focus(); var reading_position: Vector2=orbit.player
			await suite.create_timer(0.1).timeout; suite.require(not orbit.moving() and orbit.player==reading_position,"reader focus stops local movement")
			await suite.phone_accept(orbit.destinations[second]); await finish_walk(suite,orbit); suite.require(orbit.reached==second,"second station reached by actual walking")
			var previous_resident: Vector2=orbit.thanh; await suite.phone_accept(orbit.invite); await suite.create_timer(0.18).timeout
			suite.require(orbit.thanh!=previous_resident and orbit.moving() and orbit.shared==-1,"new invitation removes old marker during actual resident travel")
			await suite.phone_accept(orbit.back); var interrupted: Vector2=orbit.thanh
			suite.require(not orbit.visible and not orbit.moving() and orbit.shared==-1 and room.mode=="depart","Back stops pending resident invitation without stale shared completion")
			await suite.phone_accept(room.assist); suite.require(orbit.visible and not orbit.moving() and orbit.shared==-1 and orbit.thanh==interrupted,"Back/re-entry retains actual interrupted position without old marker")
			await suite.phone_accept(orbit.invite); await finish_walk(suite,orbit); suite.require(orbit.shared==second,"separate renewed invitation completes the selected new view")
			var local_positions := [orbit.player,orbit.thanh]; await suite.phone_accept(orbit.pause); suite.require(not room.visible and not orbit.moving() and not orbit.snapshot().has("buttons"),"Pause restores block and hidden snapshot omits live UI geometry")
			suite.require(room.open_room() and orbit.is_visible_in_tree() and not orbit.moving() and [orbit.player,orbit.thanh]==local_positions,"visit re-entry keeps positions without hidden continuation")
			await ROOM.escape(suite); suite.require(room.open_room() and orbit.is_visible_in_tree() and not orbit.moving(),"Escape/re-entry remains stopped")
			suite.require(not game.import_browser_save_json("bad") and orbit.started and orbit.shared==second,"failed browser import preserves actual visit")
			await suite.phone_accept(orbit.back); await suite.phone_accept(room.detail); await suite.phone_accept(room.items[0]); await suite.phone_accept(room.detail); suite.require(orbit.started and orbit.shared==second,"selection/detail do not invalidate local visit")
			await suite.phone_accept(room.detail); await suite.phone_accept(room.places[6-positions[0]-positions[1]-positions[2]]); await suite.phone_accept(room.assist)
			suite.require(not orbit.started and orbit.shared==-1 and not orbit.visible and not room.complete,"actual room relocation invalidates chapter and renews welcome")
			await ROOM.escape(suite); suite.require(JSON.stringify(game.build_save_envelope())==before and game.save_seq==seq and game.panel_camera_pose()==pose and game.current_path.is_empty(),"local chapter writes no progress or street camera/route")
			suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"orbital chapter preserves quiet intent")
			suite.require(game.apply_save_envelope(before) and not orbit.started and not room.complete and room.available(),"successful native apply starts fresh but retains earned access")
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
	suite.require(cases==22,"orbital22layout-size journeys executed")
	if not suite.failed: print("ORBITAL_COMMONS_PASS:"+("FORMAL" if formal else "PRIVATE")+"22layout-size/walk/invite/Stop/reader/Back/Pause/relocation/reset/quiet")
