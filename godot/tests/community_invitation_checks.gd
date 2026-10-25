extends RefCounted
## Core phase-derived standing offer; no new save flag or automatic film action.
static func verify(suite: SceneTree, study: Node, full: String) -> void:
	suite.require(study.is_test_suite_mode(),"community invitation checks use isolated formal profile")
	var original: String=JSON.stringify(study.build_save_envelope())
	var original_file_exists := FileAccess.file_exists(study.save_path)
	var original_file := FileAccess.get_file_as_string(study.save_path) if original_file_exists else ""
	var original_rhythm_notice: String=study.rhythm_circle.chapter_completion_notice
	var original_loan_notice: String=study.loan_homecoming.chapter_completion_notice
	var original_size: Vector2i=suite.root.size
	var hour: Control=study.civic_listening
	var cases := 0
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(390,568),Vector2i(520,360),Vector2i(559,360)]:
			var p: Dictionary=JSON.parse_string(full)
			p.gathering_layout=layout
			p.civic={"phase":"planning","draft":{"topic":"access","format":"dropin","notes":"themes" if layout=="table" else "none"},"result":null}
			p.film={"phase":"idle","draft":study.default_film_draft(),"result":null,"captured":[]}
			var loaded: bool=study.apply_save_envelope(JSON.stringify(p))
			suite.require(loaded,"valid earlier profile before civic accomplishment")
			if not loaded: return
			suite.root.size=size
			study.hide_story_card(); study.startup_story_pending=false
			study.following_player=false; study.in_overview=false; study.in_wide_overview=false
			study.last_story_chapter=int(study.current_chapter().num)
			for frame in range(8): await suite.process_frame
			study.show_block_panel(true)
			for frame in range(8): await suite.process_frame
			await suite.phone_accept(hour.entry)
			suite.require(hour.visible and not hour.invitation_available() and not hour.follow_invitation(),"no invitation or film handoff before actual completion")
			await suite.phone_accept(hour.advance)
			suite.require(study.civic_phase=="meeting" and not hour.invitation_available(),"actual Convene copies plan but does not earn film invitation")
			await suite.phone_accept(hour.advance)
			suite.require(study.civic_phase=="done" and hour.invitation_available() and hour.voices[0].has_focus(),"actual completion earns offer while remembered speaker retains focus")
			suite.require(hour.reader.text.contains(study.civic_completion_acknowledgment()) and study.last_panel_dialogue==study.civic_completion_acknowledgment(),"reader and quickpath share specific Dez acknowledgment")
			suite.require(hour.reader.text.contains("without names or testimony") if layout=="table" else hour.reader.text.contains("notebook closed"),"acknowledgment honors actual copied notes choice")
			var completed: Dictionary=study.build_save_envelope().duplicate(true)
			# Follow immediately after earning: no deferred chapter may steal focus.
			var earned_chapter: Dictionary=study.current_chapter()
			study.rhythm_circle.chapter_completion_notice="Rhythm notice. "
			study.loan_homecoming.chapter_completion_notice="Loan notice. "
			var immediate := signature(study)
			await suite.phone_accept(hour.advance)
			for frame in range(6): await suite.process_frame
			check_follow(suite,study,immediate)
			suite.require(study.last_a11y_announcement.contains(String(earned_chapter.title)) and study.last_a11y_announcement.contains(String(earned_chapter.intro)),"immediate Follow delivers earned chapter title and intro through status")
			suite.require(study.last_a11y_announcement.contains("Rhythm notice.") and study.last_a11y_announcement.contains("Loan notice.") and study.rhythm_circle.chapter_completion_notice.is_empty() and study.loan_homecoming.chapter_completion_notice.is_empty(),"Follow delivers and consumes both existing chapter side notices exactly once")
			for phase in ["idle","planning","hold","shooting","done"]:
				var fixture: Dictionary=completed.duplicate(true)
				var film: Dictionary=JSON.parse_string(full).film.duplicate(true)
				film.phase=phase
				film.draft=study.default_film_draft()
				film.result=study.copy_film_plan(film.draft) if phase in ["hold","shooting"] else (film.result if phase=="done" else null)
				film.captured=[String(film.result.order[0])] if phase=="shooting" else (film.captured if phase=="done" else [])
				fixture.film=film
				var phase_loaded: bool=study.apply_save_envelope(JSON.stringify(fixture))
				suite.require(phase_loaded and study.film_phase==phase,"accepted established civic-done profile preserves exact film phase")
				if not phase_loaded: return
				study.hide_story_card(); study.startup_story_pending=false
				study.last_story_chapter=int(study.current_chapter().num)
				study.following_player=false; study.in_overview=false; study.in_wide_overview=false
				for frame in range(6): await suite.process_frame
				study.show_block_panel(true)
				for frame in range(6): await suite.process_frame
				await suite.phone_accept(hour.entry)
				if size==Vector2i(390,667) and phase=="idle":
					for resized in [Vector2i(520,360),Vector2i(320,667),size]:
						suite.root.size=resized
						for frame in range(8): await suite.process_frame
						for button in [hour.advance,hour.music,hour.back]: suite.require(Rect2(Vector2.ZERO,Vector2(resized)).encloses(button.get_global_rect()),"live resize refits long wrapped handoff actions above screen edge")
				for b in [hour.advance,hour.music,hour.back]:
					suite.require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"existing three action slots remain readable reachable targets")
				suite.require(hour.reader.get_theme_font_size("normal_font_size")==16 and hour.reader.size.y>=76,"standing invitation keeps full scrollable reader")
				suite.require(hour.advance.text==("Revisit the film" if phase=="done" else "Follow this invitation") and hour.back.text=="Keep exploring","film-complete offer uses honest revisit wording")
				var ack: String=study.civic_completion_acknowledgment()
				suite.require(hour.reader.text.begins_with(ack),"specific acknowledgment leads phone reader before remembered voices")
				suite.require(ack.ends_with('Thank you for making The Open Seat. We can watch it again whenever you like."') if phase=="done" else ack.ends_with('I would like to make The Open Seat with you, at your pace."'),"finished film has a thank-you, unfinished film keeps truthful invitation")
				var before := signature(study)
				await suite.phone_accept(hour.back)
				suite.require(signature(study)==before and not hour.visible,"Keep exploring does not consume offer or mutate film/save/camera/audio")
				await suite.phone_accept(hour.entry)
				suite.require(hour.invitation_available(),"actual reopen retains phase-derived standing offer")
				await suite.phone_accept(hour.advance)
				for frame in range(6): await suite.process_frame
				check_follow(suite,study,before)
				cases+=1
			# A valid load and invalid web import retain/rederive existing durable access.
			suite.require(not study.import_browser_save_json("not-json") and hour.invitation_available(),"rejected browser import leaves derived invitation intact")
			suite.require(study.apply_save_envelope(JSON.stringify(completed)) and hour.invitation_available(),"successful reload of earned progress rederives standing offer")
			if size==Vector2i(1100,760):
				var legacy := {"version":1,"core":{"greeted":true,"layout":layout,"furniture":{"table":{"col":1,"row":0},"seats":{"col":4,"row":0},"speaker":{"col":1,"row":3}},"litter":["cup","offcuts","wrapper"],"mural":{"sun":{"col":0,"row":0},"wave":{"col":2,"row":0},"rise":{"col":4,"row":0}},"palette":"sunset","soundcheck":true,"opened":true,"history":true,"blackhawk":true,"epilogue":completed.epilogue,"programme":completed.programme,"hosting":completed.hosting,"civic":completed.civic,"film":completed.film}}
				suite.require(study.apply_save_envelope(JSON.stringify(p)) and not hour.invitation_available(),"accepted earlier load removes standing offer before import")
				suite.require(study.import_browser_save_json(JSON.stringify(legacy)) and hour.invitation_available() and study.civic_phase=="done","valid web import of earned civic phase rederives standing offer without a new flag")
			if size in [Vector2i(390,667),Vector2i(559,360)]:
				for context in ["hidden","talk","following","talk-manual"]:
					study.apply_save_envelope(JSON.stringify(completed)); study.hide_story_card(); study.startup_story_pending=false
					study.last_story_chapter=int(study.current_chapter().num)
					study.following_player=context=="following"; study.in_overview=false; study.in_wide_overview=false
					study.show_block_panel(false)
					study.selected_neighbor=study.celeste_index; study.arrived_neighbor=-1
					if context.begins_with("talk"):
						study.selected_neighbor=0; study.arrived_neighbor=0; study.show_conversation(0)
					for frame in range(6): await suite.process_frame
					if context=="talk-manual": study.pan_camera_by_screen_delta(Vector2(20,0))
					await press_key(suite,KEY_F5)
					suite.require(hour.visible,"actual F5 opens from hidden hub or conversation")
					# An untouched conversation frame belongs to the panel, not a manual pan.
					# The existing narrow talk-to-hub policy releases that owner to following.
					# While the reader is open the hub is hidden: layout helpers intentionally
					# return false. These two fixed viewports exercise tall and side hub policy.
					var releases_frame: bool=context=="talk" and size==Vector2i(559,360)
					if context.begins_with("talk"):
						suite.require((study.panel_frame_pose==study.panel_camera_pose())==(context=="talk"),"untouched conversation owns its pose; deliberate pan breaks ownership")
					var expected_following: bool=study.following_player or releases_frame
					var preserve_pose: bool=not expected_following
					var contextual := signature(study,preserve_pose)
					if releases_frame: contextual[4]=[true,false,false]
					if context=="following":
						hour.advance.grab_focus()
						await press_key(suite,KEY_ENTER,true)
					else: await suite.phone_accept(hour.advance)
					for frame in range(6): await suite.process_frame
					check_follow(suite,study,contextual,preserve_pose)
					suite.require(study.last_panel_dialogue==study.civic_completion_acknowledgment() and study.block_panel_neighbor_idx()==-1,"hidden and talk entry share Dez acknowledgment in neutral invitation hub")
					suite.require(study.following_player==expected_following,"handoff preserves manual pan/following intent and existing automatic conversation-frame release")
					suite.require(not study.in_overview and not study.in_wide_overview and Rect2(Vector2.ZERO,Vector2(size)).encloses(study.block_film_btn.get_global_rect()),"following camera keeps original film control on screen without overview takeover")
			study.reset_mural_state_to_defaults("community invitation test reset")
			suite.require(not hour.invitation_available(),"reset removes earned offer with prerequisite, no stale cached invitation")
	suite.root.size=original_size
	study.apply_save_envelope(original); study.hide_story_card(); study.startup_story_pending=false
	study.last_story_chapter=int(study.current_chapter().num)
	study.rhythm_circle.chapter_completion_notice=original_rhythm_notice
	study.loan_homecoming.chapter_completion_notice=original_loan_notice
	if original_file_exists:
		var restored := FileAccess.open(study.save_path,FileAccess.WRITE)
		restored.store_string(original_file); restored.close()
	else: DirAccess.remove_absolute(study.save_path)
	print("COMMUNITY_INVITATION_PASS:actual earning/2notesbranches/2layouts x6sizes/all5filmphases/Keep-reopen/Follow focus-only/quiet-manual-save/reset-load-import ",cases)

static func signature(study: Node,manual := true) -> Array:
	return [JSON.stringify(study.build_save_envelope()),study.film_screen_frame,FileAccess.get_file_as_string(study.save_path),FileAccess.get_file_as_string(study.settings_path),study.panel_camera_pose() if manual else [study.following_player,study.in_overview,study.in_wide_overview],study.music_playing,study.music_volume,study.music_mode,study.reward_sounds_enabled,study.reward_sound_count,study.reward_burst_count,study.last_music_cue,study.selected_neighbor,study.arrived_neighbor,study.primary_walk_choice()]

static func check_follow(suite: SceneTree,study: Node,before: Array,manual := true) -> void:
	suite.require(not study.civic_listening.visible and study.block_panel.visible and study.block_panel_mode=="hub","Follow returns to actual hub without an automatic film action")
	suite.require(study.block_film_btn.is_visible_in_tree() and study.block_film_btn.has_focus() and not study.is_story_card_visible(),"Follow reveals original film page and actual native focus without deferred chapter takeover")
	suite.require(study.block_buttons.find(study.block_film_btn)==8 and (not study.uses_paged_block_actions() or study.block_hub_page==study.block_buttons.find(study.block_film_btn)/study.BLOCK_ACTIONS_PER_PAGE),"phone and side dock reveal film page while original id8 remains intact")
	suite.require(signature(study,manual)==before,"Follow preserves film/draft/result/captures/frame/save/quiet/rewards/navigation and manual or following camera intent")

static func press_key(suite: SceneTree,code: int,held_echo := false) -> void:
	for step in range(3 if held_echo else 2):
		var event := InputEventKey.new()
		event.keycode=code; event.physical_keycode=code
		event.pressed=step<(2 if held_echo else 1); event.echo=held_echo and step==1
		Input.parse_input_event(event); Input.flush_buffered_events()
		for frame in range(3): await suite.process_frame
