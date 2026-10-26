extends RefCounted

static func verify(suite: SceneTree,game: Node,full: String,formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path!=game.GODOT_SAVE_PATH,"helper checks own isolated test state")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL helper token only in full suite")
	var bench: Node=game.helper_bench
	var original: String=JSON.stringify(game.build_save_envelope()); var original_size: Vector2i=suite.root.size
	# Component tests own a temporary visit, including transient walking/framing.
	var caller_motion := motion_state(game)
	var original_scale: Vector2i=suite.root.content_scale_size
	var caller_state := {}
	for key in ["save_seq","save_load_status","browser_import_status","browser_import_message","last_story_chapter","startup_story_pending","block_panel_mode","header_details_expanded"]: caller_state[key]=game.get(key)
	var caller_visibility := {}
	for control in bench.get_parent().get_children():
		if control is Control: caller_visibility[control]=control.visible
	var caller_focus: Control=suite.root.gui_get_focus_owner()
	var had_test_save: bool=FileAccess.file_exists(game.save_path)
	var test_save := FileAccess.get_file_as_bytes(game.save_path) if had_test_save else PackedByteArray()
	var cases := 0
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout
			suite.root.size=size; suite.require(game.apply_save_envelope(JSON.stringify(profile)),"valid completed-film fixture")
			game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num)
			game.following_player=false; game.in_overview=false; game.in_wide_overview=false
			for frame in range(8): await suite.process_frame
			var before: String=JSON.stringify(game.build_save_envelope()); var seq: int=game.save_seq
			var quiet: Array=[game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
			var pose: Array=game.panel_camera_pose(); var player: Vector3=game.player.position
			var case_motion := motion_state(game)
			suite.require(game.film_screening.open_screening(),"retained completed film viewer opens")
			for frame in range(8): await suite.process_frame
			var film_view: Dictionary=game.film_screening.snapshot()
			for b in [film_view.top,film_view.tray,film_view.picture]+film_view.buttons:
				suite.require(Rect2(Vector2.ZERO,Vector2(size)).encloses(Rect2(b.x,b.y,b.width,b.height)),"existing film viewer and new entry fit all supported sizes")
			suite.require(film_view.picture.height>=90,"existing film illustration retains90px minimum")
			await suite.phone_accept(game.film_screening.helper_entry)
			suite.require(bench.visible and not game.film_screening.visible and not bench.complete,"deliberate earned entry opens empty bench")
			await suite.phone_accept(bench.back); suite.require(bench.open_bench() and bench.fitted==[false,false],"Keep before work retains empty jig")
			for frame in range(6): await suite.process_frame
			bench.finish(); suite.require(not bench.complete,"premature helper instruction cannot complete")
			var first := 0 if layout=="table" else 1
			await suite.phone_accept(bench.forms[1]); await suite.phone_accept(bench.supports[first])
			var partial: Array=[first==0,first==1]
			bench.fit_support(first); bench.choose_form(0)
			suite.require(bench.selected==1 and bench.fitted==partial,"both support orders, double same support and locked arrangement cannot skip task")
			await suite.phone_accept(bench.back); suite.require(bench.open_bench(),"partial task can reopen")
			for frame in range(6): await suite.process_frame
			suite.require(bench.fitted==partial,"partial task survives Keep")
			await suite.phone_accept(bench.supports[1-first])
			await suite.phone_accept(bench.back); suite.require(bench.open_bench() and bench.fitted==[true,true] and not bench.complete,"two supports never silently complete while away")
			for frame in range(6): await suite.process_frame
			await suite.phone_accept(bench.assist)
			suite.require(bench.complete and bench.reader.text.begins_with("Dez: Your upright display") and bench.reader.text.contains(game.film_shot_title(String(game.film_result.order[2])).to_lower()),"specific copied-film acknowledgment")
			var high: float=bench.panels[0][0].position.y
			await suite.phone_accept(bench.forms[0]); suite.require(bench.complete and bench.panels[0][0].position.y<high,"deliberate rearrangement changes one finished display")
			await suite.phone_accept(bench.forms[0]); suite.require(bench.selected==0 and bench.worlds.size()==2,"duplicate choice is idempotent, one display per layout")
			var snap: Dictionary=bench.snapshot(); var screen := Rect2(Vector2.ZERO,Vector2(size))
			for key in ["top","tray","picture"]:
				var b: Dictionary=snap[key]; suite.require(screen.encloses(Rect2(b.x,b.y,b.width,b.height)),"complete helper art/panels fit viewport")
			suite.require(snap.picture.width>=180 and snap.picture.height>=80 and snap.reader.height>=64,"meaningful helper artwork and readable16px reader")
			for b in snap.buttons: suite.require(b.width>=44 and b.height>=44 and b.text_fits and screen.encloses(Rect2(b.x,b.y,b.width,b.height)),"whole-word helper controls/44px")
			bench.reader.grab_focus(); var end := InputEventKey.new(); end.keycode=KEY_END; end.pressed=true; Input.parse_input_event(end)
			for frame in range(4): await suite.process_frame
			snap=bench.snapshot(); suite.require(snap.scroll_max>0 and absf(snap.scroll-snap.scroll_max)<1,"actual End reaches complete helper disclosure")
			for key in [KEY_F2,KEY_F3,KEY_F4,KEY_F5,KEY_F6,KEY_F7,KEY_F8,KEY_W]:
				var e := InputEventKey.new(); e.keycode=key; e.shift_pressed=key==KEY_F8; e.pressed=true; Input.parse_input_event(e); await suite.process_frame
				e=InputEventKey.new(); e.keycode=key; e.pressed=false; Input.parse_input_event(e)
			suite.require(bench.visible and not game.story_picker.visible and game.player.position==player,"world shortcuts/held movement cannot steal helper ownership")
			suite.require(not game.import_browser_save_json("not-json") and bench.complete and bench.visible,"failed import preserves helper visit")
			var held := InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held)
			await suite.phone_accept(bench.back)
			for frame in range(6): await suite.process_frame
			suite.require(game.player.position==player,"held movement through Keep waits for actual release")
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held)
			var li := 0 if layout=="table" else 1
			suite.require(bench.worlds[li].is_visible_in_tree() and not bench.worlds[1-li].is_visible_in_tree(),"exact selected-layout world result")
			for i in range(3):
				var mat: StandardMaterial3D=bench.panels[li][i].material_override
				suite.require(mat.albedo_texture==game.film_screening.texture(game.film_result,String(game.film_result.order[i]),true),"world triptych uses exact copied ordered frames")
				suite.require(not mat.no_depth_test and mat.transparency==BaseMaterial3D.TRANSPARENCY_ALPHA and mat.render_priority==1,"copied color composites over cutaway while opaque geometry still occludes")
			for form in [0,1]:
				bench.selected=form; bench.update_world()
				var root: Node3D=bench.worlds[li]
				var bounds := AABB(); var first_mesh := true
				for mesh in root.find_children("*","MeshInstance3D",true,false):
					var actual: AABB=(root.transform*mesh.transform)*mesh.get_aabb()
					bounds=actual if first_mesh else bounds.merge(actual); first_mesh=false
				suite.require(not first_mesh and bounds.size.y>1.0,"measure actual entire helper mesh bounds in both forms")
				if li==0: suite.require(bounds.position.x> -6.09 and bounds.end.x< -4.6 and bounds.position.z> -1.19 and bounds.end.z<1.19,"actual table helper mesh clears table/barricades/light poles")
				else: suite.require(bounds.position.x>1.4 and bounds.end.x<3.9 and bounds.position.z> -1.15 and bounds.end.z<1.15,"actual floor helper mesh clears riser/meal/seats inside painted lane")
				verify_inspection(suite,game,bench,li)
			suite.require(JSON.stringify(game.build_save_envelope())==before and game.save_seq==seq,"helper actions do not save or change copied progress")
			suite.require([game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet and game.panel_camera_pose()==pose,"quiet and manual camera intent unchanged")
			for frame in range(3): await suite.physics_frame
			suite.require(not bench.release_pending() and not bench.snapshot().release_pending,"released W clears the held-exit guard")
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=true; Input.parse_input_event(held)
			for frame in range(5): await suite.physics_frame
			held=InputEventKey.new(); held.keycode=KEY_W; held.pressed=false; Input.parse_input_event(held)
			suite.require(game.player.position.distance_to(player)>0.01,"fresh movement works after held-exit release")
			Input.flush_buffered_events()
			for frame in range(3): await suite.physics_frame
			suite.require(not Input.is_key_pressed(KEY_W) and not Input.is_physical_key_pressed(KEY_W),"movement proof releases its actual input")
			suite.require(game.apply_save_envelope(before) and not bench.complete and bench.available() and bench.fitted==[false,false],"successful load clears visit but retains earned invitation")
			restore_motion(game,case_motion)
			suite.require(motion_state(game)==case_motion,"each movement case restores its isolated starting position and camera policy")
			cases+=1
	game.apply_save_envelope(full); game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num)
	game.film_phase="idle"; suite.require(not bench.open_bench(),"unearned film refuses workshop")
	game.film_phase="done"; var film: Dictionary=game.film_result; game.film_result={}; suite.require(not bench.open_bench(),"malformed raw film defensive fixture refuses workshop"); game.film_result=film
	game.startup_story_pending=true; suite.require(not bench.open_bench(),"pending startup refuses"); game.startup_story_pending=false
	game.power_story.active=true; suite.require(not bench.open_bench(),"active story refuses even when its panel is hidden"); game.power_story.active=false
	game.current_path.append(Vector2.ZERO); suite.require(not bench.open_bench(),"active route refuses"); game.current_path.clear()
	suite.require(bench.open_bench(),"guard fixtures release ownership")
	for frame in range(6): await suite.process_frame
	await suite.phone_accept(bench.supports[0]); await suite.phone_accept(bench.supports[1]); await suite.phone_accept(bench.assist)
	suite.require(bench.selected==0 and bench.complete,"initial Low display also completes")
	var earned_film: String=JSON.stringify(game.film_result)
	suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}') and not bench.visible and not bench.complete and bench.available() and JSON.stringify(game.film_result)==earned_film,"successful earlier legacy import clears visit while original monotone merge retains earned copied film")
	game.apply_save_envelope(original); game.hide_story_card()
	suite.root.content_scale_size=original_scale; suite.root.size=original_size
	for key in caller_state: game.set(key,caller_state[key])
	for control in caller_visibility: control.visible=caller_visibility[control]
	game.update_block_ui(); game.layout_walking_controls_and_hub()
	restore_motion(game,caller_motion)
	for frame in range(8): await suite.process_frame
	for key in caller_state: game.set(key,caller_state[key])
	restore_motion(game,caller_motion)
	# Restore only the explicitly isolated test file; production load stays monotone.
	if had_test_save:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(test_save); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(caller_focus) and caller_focus.is_visible_in_tree(): caller_focus.grab_focus()
	suite.require(motion_state(game)==caller_motion and JSON.stringify(game.build_save_envelope())==original,"helper component restores caller transient framing/player and exact saved progress")
	suite.require(cases==22,"all 22 helper layout-size cases ran")
	if not suite.failed: print("HELPER_BENCH_PASS:"+("FORMAL" if formal else "PRIVATE")+"22layout-size/actualuiaccept/copiedtriptych/Keep/reload/input/quiet/manual/wholewords cases=",cases)

static func verify_inspection(suite: SceneTree,game: Node,bench: Node,li: int) -> void:
	var before := motion_state(game)
	game.target=bench.worlds[li].global_position
	game.view_size=24.0; game.camera_yaw=-0.7975; game.camera_pitch_scale=1.65
	game.update_camera()
	var reserved: Rect2=bench.inspection_rect()
	suite.require(reserved.has_area(),"nearby manual helper inspection reserves actual transformed pictures in either form/layout")
	for face in bench.snapshot().world[li].frames:
		for p in face.corners: suite.require(reserved.has_point(Vector2(p.x,p.y)),"reservation contains every actual projected frame corner")
	game.update_readable_scene_labels(); game.update_guide_arrow()
	if game.guide_arrow_label.is_visible_in_tree(): suite.require(not reserved.intersects(game.guide_arrow_label.get_global_rect().grow(7.0)),"outlined guide label clears inspected helper pictures")
	for flag in ["following_player","in_overview","in_wide_overview"]:
		game.set(flag,true); suite.require(not bench.inspection_rect().has_area(),"ordinary following/overview leaves original label policy"); game.set(flag,false)
	bench.complete=false; suite.require(not bench.inspection_rect().has_area(),"unfinished helper reserves no art"); bench.complete=true
	bench.worlds[li].visible=false; suite.require(not bench.inspection_rect().has_area(),"inactive layout contributes no art reservation"); bench.worlds[li].visible=true
	game.target+=Vector3(100,0,0); suite.require(not bench.inspection_rect().has_area(),"distant inspection reserves nothing")
	game.target=bench.worlds[li].global_position
	var transform: Transform3D=game.camera.global_transform
	game.camera.global_position+=Vector3(1000,0,0); suite.require(not bench.inspection_rect().has_area(),"offscreen art reserves nothing")
	game.camera.global_transform=transform
	game.camera.rotate_object_local(Vector3.UP,PI); suite.require(not bench.inspection_rect().has_area(),"behind-camera art reserves nothing")
	game.camera.global_transform=transform
	restore_motion(game,before)
	game.update_readable_scene_labels(); game.update_guide_arrow()
	suite.require(motion_state(game)==before,"inspection proof restores caller camera and motion")

static func motion_state(game: Node) -> Dictionary:
	var state := {}
	for key in ["target","view_size","camera_yaw","camera_pitch_scale","following_player","in_overview","in_wide_overview"]: state[key]=game.get(key)
	state.position=game.player.position; state.velocity=game.player.velocity; state.rotation=game.player_visual.rotation
	return state

static func restore_motion(game: Node,state: Dictionary) -> void:
	for key in ["target","view_size","camera_yaw","camera_pitch_scale","following_player","in_overview","in_wide_overview"]: game.set(key,state[key])
	game.player.position=state.position; game.player.velocity=state.velocity; game.player_visual.rotation=state.rotation
	game.update_camera(); game.update_occlusion(true)
