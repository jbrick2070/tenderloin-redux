extends RefCounted

static func verify(suite: SceneTree,game: Node,formal := false) -> void:
	suite.require(game.is_test_suite_mode(),"opening checks require explicit isolated test paths")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"opening FORMAL token belongs only to full native suite")
	var opening: Control=game.before_streets
	var original_held_on_exit: Array = opening.held_on_exit.duplicate()
	var original_player_position: Vector3=game.player.position
	var original_path: Array = game.current_path.duplicate()
	suite.require(game.save_path!=game.GODOT_SAVE_PATH and (game.save_path.contains("_test_") or game.save_path.begins_with("user://before_streets_runtime")),"opening fixture restoration owns only explicit test save")
	var had_test_file: bool=FileAccess.file_exists(game.save_path)
	var test_bytes := FileAccess.get_file_as_bytes(game.save_path) if had_test_file else PackedByteArray()
	var original: String=JSON.stringify(game.build_save_envelope())
	var original_size: Vector2i=suite.root.size
	var state := {}
	for key in ["following_player","in_overview","in_wide_overview","target","view_size","camera_yaw","camera_pitch_scale","last_story_chapter","startup_story_pending","header_details_expanded","block_panel_mode","talk_partner","selected_neighbor","arrived_neighbor","last_proximity_neighbor","save_seq","save_load_status","browser_import_status","browser_import_message","reward_sound_count","reward_audio_unlocked"]:
		state[key]=game.get(key)
	var visibility := {}
	for c in opening.get_parent().get_children():
		if c is Control: visibility[c]=c.visible
	var focus: Control=suite.root.gui_get_focus_owner()
	var music: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled]
	var cases := 0
	for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
		suite.root.size=size
		game.show_story_card(game.current_chapter(),true)
		for frame in range(8): await suite.process_frame
		var chapter_text: String=game.story_title_label.text
		suite.require(Rect2(Vector2.ZERO,Vector2(size)).encloses(game.story_card.get_global_rect()) and game.story_body_label.size.y>=16,"original startup reader and both actions fit supported short sizes")
		var pose: Array=[game.target,game.view_size,game.camera_yaw,game.camera_pitch_scale,game.following_player]
		await suite.phone_accept(game.story_before_btn)
		suite.require(opening.visible and game.startup_story_pending and not game.story_card.visible,"optional real startup action owns input without accepting startup")
		suite.require(opening.gust.has_focus() or opening.back.has_focus(),"entry supplies its own enabled focus")
		var before := signature(game)
		var first_svg: String=opening.artwork(0,-1)
		await suite.phone_accept(opening.gust)
		suite.require(opening.view==1 and opening.artwork(1,-1)!=first_svg and game.last_a11y_announcement.contains("shifted crest"),"actual gust visibly changes deterministic scene and text equivalent")
		await suite.phone_accept(opening.gust)
		suite.require(opening.view==2 and opening.gust.disabled,"second gust reaches finite third view")
		await suite.phone_accept(opening.previous)
		suite.require(opening.view==1,"Previous view revisits an illustration without reversed history")
		await suite.phone_accept(opening.previous)
		suite.require(opening.view==0 and opening.gust.has_focus(),"Previous boundary hands focus to enabled gust inside ring")
		await suite.phone_accept(opening.gust)
		await suite.phone_accept(opening.shapes)
		suite.require(opening.shapes.has_focus(),"observation leaves focus on its actual action")
		var shapes_text: String=opening.reader.text
		await suite.phone_accept(opening.time_choice)
		suite.require(opening.time_choice.has_focus(),"second observation keeps its actual action focus")
		suite.require(opening.observation==1 and opening.reader.text!=shapes_text and opening.reader.text.begins_with("Bea (fictional") and opening.reader.text.contains("homeland today"),"selected response leads scrollable reader while living-history frame remains")
		await suite.phone_accept(opening.sources)
		suite.require(opening.reader.has_focus(),"Sources deliberately focuses complete reader")
		var end := InputEventKey.new(); end.keycode=KEY_END; end.pressed=true; Input.parse_input_event(end)
		for frame in range(5): await suite.process_frame
		var read: Dictionary=opening.snapshot()
		suite.require(read.source_view and read.text.contains("ramaytushtribe.org") and absf(read.scroll-read.scroll_max)<1,"actual End reaches complete source reader")
		opening.shapes.grab_focus()
		for key in [KEY_W,KEY_UP,KEY_F8]:
			var press := InputEventKey.new(); press.keycode=key; press.shift_pressed=key==KEY_F8; press.pressed=true; Input.parse_input_event(press)
			await suite.process_frame
			press=InputEventKey.new(); press.keycode=key; press.pressed=false; Input.parse_input_event(press)
		suite.require(opening.visible and game.startup_story_pending and not game.story_card.visible and not game.story_picker.visible,"button-focused arrow/W/actual Shift+F8 never accept hidden startup or steal ownership")
		suite.require(signature(game)==before,"all opening actions leave exact save/settings/music/player state unchanged")
		suite.require([game.target,game.view_size,game.camera_yaw,game.camera_pitch_scale,game.following_player]==pose,"opening retains underlying camera policy")
		var shot: Dictionary=opening.snapshot()
		for b in shot.buttons:
			suite.require(b.width>=44 and b.height>=44 and b.words_fit,"whole-word opening44px controls")
			var rect := Rect2(b.x,b.y,b.width,b.height)
			suite.require(Rect2(Vector2.ZERO,Vector2(size)).encloses(rect),"opening action completely inside supported viewport")
		suite.require(shot.reader.height>=64 and shot.picture.width>=180 and shot.picture.height>=80,"useful16px reader and landscape illustration remain")
		var held := InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held)
		var held_position: Vector3=game.player.position
		var esc := InputEventKey.new(); esc.keycode=KEY_ESCAPE; esc.pressed=true; Input.parse_input_event(esc)
		var echo := InputEventKey.new(); echo.keycode=KEY_W; echo.pressed=true; echo.echo=true; Input.parse_input_event(echo)
		for frame in range(6): await suite.process_frame
		suite.require(not opening.visible and game.startup_story_pending and game.story_card.visible and game.story_continue_btn.has_focus() and game.story_title_label.text==chapter_text,"Escape restores exact startup chapter and Start focus without accepting")
		suite.require(game.player.position==held_position,"held movement through Skip cannot walk behind original startup card")
		suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled]==music,"optional opening never activates or changes audio")
		if cases==0:
			await suite.phone_accept(game.story_continue_btn)
			for frame in range(4): await suite.physics_frame
			suite.require(not opening.held_on_exit.is_empty() and game.player.position==held_position,"actual Start while W is held cannot walk")
		held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held)
		for frame in range(3): await suite.physics_frame
		suite.require(opening.held_on_exit.is_empty(),"physics clears captured release while startup or another panel is visible")
		if cases==0:
			game.show_story_card(game.current_chapter(),true)
			for frame in range(6): await suite.process_frame
			await suite.phone_accept(game.story_before_btn)
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held)
			for frame in range(3): await suite.process_frame
			await suite.phone_accept(opening.back)
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held)
			for frame in range(3): await suite.physics_frame
			suite.require(opening.held_on_exit.is_empty() and game.startup_story_pending,"release is observed while original startup remains open")
			var fresh_position: Vector3=game.player.position
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held)
			for frame in range(4): await suite.physics_frame
			suite.require(not game.startup_story_pending and game.player.position!=fresh_position,"fresh W starts and moves after prior captured W was released")
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held)
			for frame in range(3): await suite.physics_frame
			if not music[0] and game.music_playing: game.stop_music_playback()
		game.hide_story_card(); game.last_story_chapter=int(game.current_chapter().num)
		game.set_header_details(false,false)
		for frame in range(6): await suite.process_frame
		var collapsed_header: float=game.header_panel.size.y
		game.set_header_details(true,false)
		for frame in range(6): await suite.process_frame
		suite.require(opening.entry.is_visible_in_tree(),"stable Info revisit exists while idle at any chapter")
		suite.require(game.header_panel.size.y<=collapsed_header+100,"opening revisit shares the original bounded Info expansion at every supported size")
		var map_area: Rect2=game.play_area_rect()
		suite.require(map_area.size.y>=44 and not game.is_screen_point_in_ui(map_area.get_center()-Vector2(30,0)) and not game.is_screen_point_in_ui(map_area.get_center()+Vector2(30,0)),"expanded opening Info leaves real two-contact map space at every supported size")
		suite.require(game.info.size.y>=ceilf(game.info.get_theme_font("normal_font").get_height(game.info.get_theme_font_size("normal_font_size"))),"short Info retains a full scrollable line")
		await suite.phone_accept(opening.entry)
		suite.require(opening.visible and opening.observation==1 and opening.view==1,"Info revisit retains this visit's actual observation")
		var first_held := InputEventKey.new(); first_held.keycode=KEY_W; first_held.pressed=true; Input.parse_input_event(first_held)
		var second_held := InputEventKey.new(); second_held.keycode=KEY_D; second_held.pressed=true; Input.parse_input_event(second_held)
		var revisit_position: Vector3=game.player.position
		await suite.phone_accept(opening.back)
		for frame in range(4): await suite.physics_frame
		suite.require(not opening.visible and not opening.held_on_exit.is_empty() and game.player.position==revisit_position,"Return holds position until all movement keys held at exit are released")
		first_held=InputEventKey.new(); first_held.keycode=KEY_W; first_held.pressed=false; Input.parse_input_event(first_held)
		for frame in range(3): await suite.physics_frame
		suite.require(not opening.held_on_exit.is_empty() and game.player.position==revisit_position,"releasing only one captured key does not resume movement")
		var fresh_key := InputEventKey.new(); fresh_key.keycode=KEY_S; fresh_key.pressed=true; Input.parse_input_event(fresh_key)
		for frame in range(3): await suite.physics_frame
		suite.require(game.player.position==revisit_position,"new uncaptured key waits for remaining captured key")
		second_held=InputEventKey.new(); second_held.keycode=KEY_D; second_held.pressed=false; Input.parse_input_event(second_held)
		for frame in range(4): await suite.physics_frame
		suite.require(opening.held_on_exit.is_empty() and game.player.position!=revisit_position,"physics resumes and fresh key moves after captured keys release")
		fresh_key=InputEventKey.new(); fresh_key.keycode=KEY_S; fresh_key.pressed=false; Input.parse_input_event(fresh_key)
		for frame in range(3): await suite.physics_frame
		game.set_header_details(true,false)
		for frame in range(6): await suite.process_frame
		await suite.phone_accept(opening.entry)
		suite.require(opening.visible,"opening can be revisited after releasing movement keys")
		game.last_story_chapter=0
		for frame in range(6): await suite.process_frame
		suite.require(not game.story_card.visible,"pending chapter does not interrupt opening")
		suite.require(not game.import_browser_save_json("not-json") and opening.visible and opening.observation==1,"failed import retains visit and visible opening")
		await suite.phone_accept(opening.back)
		for frame in range(6): await suite.process_frame
		suite.require(game.story_card.visible and not game.startup_story_pending and game.story_continue_btn.has_focus() and game.last_a11y_announcement.begins_with("Chapter "),"deferred chapter actually arrives after return with Continue focus and announcement")
		game.hide_story_card(); game.set_header_details(true,false)
		for frame in range(6): await suite.process_frame
		await suite.phone_accept(opening.entry)
		var import_held := InputEventKey.new(); import_held.keycode=KEY_W; import_held.pressed=true; Input.parse_input_event(import_held)
		for frame in range(3): await suite.process_frame
		suite.require(Input.is_key_pressed(KEY_W),"isolated held-key event is applied before import")
		suite.require(not game.import_browser_save_json("not-json") and opening.visible,"invalid import while a movement key is held leaves the opening visible")
		suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}') and not opening.visible and opening.observation==-1,"successful legacy import clears only transient opening")
		suite.require(not opening.held_on_exit.is_empty(),"successful import captures movement keys held when it closes the opening")
		game.apply_save_envelope(original)
		suite.require(not opening.held_on_exit.is_empty(),"another load while hidden preserves the pending release guard")
		import_held=InputEventKey.new(); import_held.keycode=KEY_W; import_held.pressed=false; Input.parse_input_event(import_held)
		for frame in range(3): await suite.physics_frame
		suite.require(opening.held_on_exit.is_empty(),"release after import restores original physics")
		game.apply_save_envelope(original); game.hide_story_card(); game.last_story_chapter=int(game.current_chapter().num); game.set_header_details(true,false)
		for frame in range(6): await suite.process_frame
		await suite.phone_accept(opening.entry); await suite.phone_accept(opening.time_choice)
		suite.require(game.apply_save_envelope(original) and not opening.visible and opening.observation==-1 and opening.view==0,"successful load clears only transient opening")
		game.hide_story_card(); game.set_header_details(false,false)
		cases+=1
	# Exit at a DIFFERENT aspect: compare to an independent ordinary overview refit.
	suite.root.size=Vector2i(320,568); game.overview(false); game.show_story_card(game.current_chapter(),true)
	for frame in range(8): await suite.process_frame
	await suite.phone_accept(game.story_before_btn)
	suite.root.size=Vector2i(520,360)
	for frame in range(8): await suite.process_frame
	await suite.phone_accept(opening.back)
	for frame in range(8): await suite.process_frame
	suite.require(game.startup_story_pending and game.story_continue_btn.has_focus(),"rotated opening returns original startup focus")
	var returned_view: float=game.view_size; var returned_target: Vector3=game.target
	game.overview(false)
	suite.require(is_equal_approx(game.view_size,returned_view) and game.target.is_equal_approx(returned_target),"return at new aspect equals independently recomputed overview")
	# Visibility transitions shrink/grow Info immediately without changing speech ownership.
	game.hide_story_card(); game.set_header_details(true,false)
	for frame in range(8): await suite.process_frame
	var info_height: float=game.header_panel.size.y
	game.show_block_panel(true)
	for frame in range(8): await suite.process_frame
	suite.require(not opening.entry.visible and game.header_panel.size.y<info_height and is_equal_approx(game.header_panel.size.y,game.header_panel.get_combined_minimum_size().y),"Info shrinks when an actual panel removes opening entry")
	game.show_block_panel(false)
	for frame in range(8): await suite.process_frame
	suite.require(opening.entry.visible and is_equal_approx(game.header_panel.size.y,game.header_panel.get_combined_minimum_size().y),"Info grows exactly when idle entry returns")
	game.in_overview=false; game.in_wide_overview=false; game.following_player=false; game.update_camera()
	var manual_pose: Array=[game.target,game.view_size,game.camera_yaw,game.camera_pitch_scale]
	await suite.phone_accept(opening.entry); suite.root.size=Vector2i(390,667)
	for frame in range(8): await suite.process_frame
	suite.require(not game.guide_arrow.visible and game.visible_scene_captions.is_empty(),"opening suppresses hidden street captions and guide")
	await suite.phone_accept(opening.back)
	for frame in range(8): await suite.process_frame
	suite.require([game.target,game.view_size,game.camera_yaw,game.camera_pitch_scale]==manual_pose,"resize return leaves deliberate manual camera unchanged")
	game.apply_save_envelope(original); game.hide_story_card()
	suite.root.size=original_size
	for key in state: game.set(key,state[key])
	for c in visibility:
		if is_instance_valid(c): c.visible=visibility[c]
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	for frame in range(8): await suite.process_frame
	for key in state: game.set(key,state[key])
	game.player.position=original_player_position; game.current_path.assign(original_path)
	game.update_camera()
	# Import correctly advances the monotone save sequence. Restore only this
	# isolated fixture's caller bytes, never change production load semantics.
	if had_test_file:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(test_bytes); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	opening.held_on_exit.assign(original_held_on_exit)
	suite.require(game.player.position==original_player_position and game.current_path==original_path,"opening movement checks restore caller position and route")
	suite.require(JSON.stringify(game.build_save_envelope())==original,"opening checks restore caller saved state")
	print("BEFORE_STREETS_PASS:"+("FORMAL" if formal else "PRIVATE")+" actual startup/held-Skip/gusts/choices/sources/revisit/ShiftF8/11sizes/import/load/rotation/header/deferred-chapter/caller-restored ",cases)

static func signature(game: Node) -> String:
	return JSON.stringify([game.build_save_envelope(),game.music_playing,game.music_volume,game.reward_sounds_enabled,game.player.position,game.current_path,game.startup_story_pending])
