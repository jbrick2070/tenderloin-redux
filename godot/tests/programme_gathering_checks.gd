extends RefCounted
const MOTION := preload("res://tests/helper_bench_checks.gd")
const KEYS := preload("res://tests/community_invitation_checks.gd")

static func settle(suite: SceneTree) -> void:
	for frame in range(8): await suite.process_frame

static func layout(suite: SceneTree,visit: Node) -> void:
	await settle(suite)
	var s: Dictionary=visit.snapshot(); var screen := Rect2(Vector2.ZERO,Vector2(suite.root.size))
	for control in [s.top,s.tray,s.art]+s.buttons:
		if control.get("visible",true): suite.require(screen.encloses(Rect2(control.x,control.y,control.width,control.height)),"gathering visible geometry fits supported viewport")
	for b in s.buttons:
		if b.visible: suite.require(b.width>=44 and b.height>=44 and b.words_fit,"gathering whole-word44px actions")
	suite.require(s.reader.height>=64 and s.art.width>=180 and s.art.height>=140,"gathering retains reader and four copied pictures")
	for prop in s.props: suite.require(prop.width>=70 and prop.height>=46,"each original contribution remains recognizable")

static func ready(suite: SceneTree,game: Node,full: String) -> void:
	suite.require(game.apply_save_envelope(full),"accepted populated original profile")
	game.hide_story_card(); game.startup_story_pending=false; game.last_story_chapter=int(game.current_chapter().num); game.following_player=false; game.in_overview=false; game.in_wide_overview=false
	await settle(suite)

static func verify(suite: SceneTree,game: Node,full: String,formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path!=game.GODOT_SAVE_PATH,"programme gathering requires isolated native profile")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL programme gathering token only in full suite")
	var studio: Node=game.programme_studio; var visit: Node=studio.gathering; var original: String=JSON.stringify(game.build_save_envelope()); var motion: Dictionary=MOTION.motion_state(game)
	var caches := [game.shared_panel.textures.duplicate(),game.bea_invitation.textures.duplicate()]; var held: Array=visit.held_on_exit.duplicate()
	var size0: Vector2i=suite.root.size; var scale0: Vector2i=suite.root.content_scale_size; var state := {}; var visibility := {}; var focus: Control=suite.root.gui_get_focus_owner()
	for key in ["save_seq","save_load_status","browser_import_status","browser_import_message","last_story_chapter","startup_story_pending","block_panel_mode","header_details_expanded","last_music_cue","cue_arpeggio_duration","reward_sound_count","suppress_feel_good_burst","unlocked_stem_mask","last_a11y_announcement","a11y_announcement_seq","selected_neighbor","arrived_neighbor","walking_to_mural","walking_to_speaker","walking_to_history_stop","pending_celeste_talk","pending_rook_talk","music_mode","local_music_name","music_error","sketch_tick","sketch_phase","sketch_frames_pushed"]: state[key]=game.get(key)
	var history: Array=game.cue_history.duplicate(true); var freqs: Array=game.cue_arpeggio_freqs.duplicate(); var info_text: String=game.info.text
	suite.require(not game.music_playing and game.current_path.is_empty() and game.active_story_episode()==null,"programme gathering fixture requires quiet idle caller; does not restore live audio or active episodes")
	var local_stream: AudioStream=game.local_audio_player.stream if game.local_audio_player!=null else null
	for c in studio.get_parent().get_children():
		if c is Control: visibility[c]=c.visible
	var had_save: bool=FileAccess.file_exists(game.save_path); var saved := FileAccess.get_file_as_bytes(game.save_path) if had_save else PackedByteArray()
	var cases := 0
	for layout_name in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(320,568),Vector2i(520,360),Vector2i(559,360),Vector2i(640,360),Vector2i(599,360),Vector2i(667,375),Vector2i(844,390),Vector2i(800,480)]:
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout_name
			for result in profile.hosting.results:
				if result.id=="stories": result.value="memory" if layout_name=="table" else "future"
				if result.id=="beats": result.value=0 if layout_name=="table" else 145
				if result.id=="pause": result.value="arc" if layout_name=="table" else "pairs"
			suite.root.size=size; await ready(suite,game,JSON.stringify(profile))
			var before: String=JSON.stringify(game.build_save_envelope()); var pose: Array=game.panel_camera_pose(); var player: Vector3=game.player.position; var quiet := [game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]
			suite.require(studio.open_studio(true) and not visit.visible and visit.order.is_empty(),"posted invitation never starts automatically")
			await suite.phone_accept(studio.back); suite.require(studio.open_studio(true),"declined invitation remains earned")
			await suite.phone_accept(studio.primary); suite.require(visit.visible and studio.visible and visit.reader.has_focus(),"deliberate true-child entry has reader focus")
			await layout(suite,visit)
			var copied: Dictionary=visit.copies.duplicate(true); var copied_order: Array=visit.order.duplicate()
			var invitation: String='Bea: Our invitation, "%s", is the original copy. No personal story or notes were recorded.'%game.bea_invitation.TITLES["memory" if layout_name=="table" else "future"]
			suite.require(visit.contribution("stories")==invitation,"both original invitation titles form an exact grammatical response")
			for i in range(3):
				suite.require(visit.review_step==i and not visit.completed,"no automatic step or completion")
				await suite.phone_accept(visit.choices[(cases+i)%2]); await layout(suite,visit)
				suite.require(visit.gestures.size()==i+1 and visit.reader.has_focus(),"actual accepted handoff records one choice and focuses response")
				if i==0:
					await suite.phone_accept(visit.back); suite.require(not visit.visible and studio.visible and studio.posted and studio.primary.text=="Resume gathering","Back exposes retained primary")
					await suite.phone_accept(studio.primary); suite.require(visit.order==copied_order and visit.copies==copied and visit.gestures.size()==1,"partial reentry retains actual copy")
					await suite.phone_accept(visit.keep); suite.require(not studio.visible and not visit.visible and studio.open_studio(true),"Keep restores block without completing")
					await suite.phone_accept(studio.primary)
				suite.require(visit.copies==copied,"all transitions preserve copied values")
			suite.require(not visit.completed and visit.next.text=="Finish gathering","last handoff has separate final acknowledgment")
			await suite.phone_accept(visit.next); suite.require(visit.completed and visit.reader.text.contains("first afternoon's records"),"deliberate closure distinguishes original progress")
			var finished: Array=visit.gestures.duplicate(); visit.advance(); visit.next.emit_signal("pressed")
			suite.require(visit.completed and visit.gestures==finished and visit.next.disabled and visit.choices[0].visible,"repeated Finish cannot discard completed handoffs; new visit is a different action")
			await layout(suite,visit)
			for i in range(3): await suite.phone_accept(visit.previous)
			suite.require(visit.review_step==0 and visit.completed and not visit.previous.visible,"review first boundary honest")
			for i in range(3): await suite.phone_accept(visit.next)
			visit.advance(); suite.require(visit.completed and visit.gestures==finished and visit.next.disabled,"extra Next at completed review boundary cannot restart")
			await suite.phone_accept(visit.back); await suite.phone_accept(studio.back); suite.require(studio.open_studio(true),"completed invitation retained")
			await suite.phone_accept(studio.primary); suite.require(visit.completed and visit.review_step==3,"completed visit reopens at retained place")
			await KEYS.press_key(suite,KEY_ESCAPE); suite.require(not studio.visible and not visit.visible,"actual Escape releases parent and child")
			suite.require(JSON.stringify(game.build_save_envelope())==before and game.panel_camera_pose()==pose and game.player.position==player and [game.music_playing,game.music_volume,game.reward_sounds_enabled,game.reward_sound_count]==quiet,"entire visit preserves save/world/manual view/quiet")
			cases+=1
	print("PROGRAMME_LAYOUT_OBSERVATION ",cases)
	# Exhaust valid orders through the product validator; cover each pair and both gestures.
	await ready(suite,game,full); var pairs := {}; var openings := {}; var orders := 0
	for a in visit.Hosted.IDS:
		for b in visit.Hosted.IDS:
			for c in visit.Hosted.IDS:
				for d in visit.Hosted.IDS:
					var candidate: Array=[a,b,c,d]
					if game.programme_issue(candidate)!="": continue
					orders+=1; openings[a]=true
					for gesture in range(2):
						studio.reset_visit(); game.programme_published.assign(candidate); suite.require(studio.open_studio(true) and visit.open_gathering(),"valid posted order starts")
						for i in range(3):
							visit.handoff(gesture); pairs[candidate[i]+">"+candidate[i+1]]=true
							suite.require(visit.response().contains(visit.HANDOFFS[candidate[i]+">"+candidate[i+1]][gesture]) and visit.response().contains(visit.Hosted.OWNERS[visit.Hosted.IDS.find(candidate[i+1])]+":"),"actual choice and incoming copied value have distinct authored response")
						visit.advance(); suite.require(visit.completed,"all valid orders finish without resetting original hosting")
		suite.require(openings.size()>0,"opening enumerated")
	suite.require(orders==16 and pairs.size()==11 and openings.size()==4,"all legal orders/pairs/openings covered")
	# Repost without rewriting the retained run; new-plan refusal is transactional.
	studio.reset_visit(); await ready(suite,game,full); suite.require(studio.open_studio(true) and visit.open_gathering(),"repost fixture entry")
	visit.handoff(0); var saved_order: Array=visit.order.duplicate(); var saved_copies: Dictionary=visit.copies.duplicate(true)
	visit.back_to_studio(); studio.toggle_view(); studio.selected="art"; studio.move_card(-1); studio.advance()
	suite.require(game.programme_published!=saved_order and visit.order==saved_order,"real edit and publication leave partial run fixed")
	suite.require(visit.open_gathering(),"reposted partial resume"); visit.handoff(1); visit.handoff(0); visit.advance()
	suite.require(visit.completed and visit.order==saved_order,"completion retains copied order after repost")
	await suite.phone_accept(visit.choices[0]); suite.require(not visit.completed and visit.gestures.is_empty() and visit.order==game.programme_published and visit.order!=saved_order and visit.copies==saved_copies,"deliberate new posted plan captures current order with original contributions")
	visit.handoff(0); var held_buttons: Array=visit.choices+[visit.previous,visit.next,visit.back,visit.keep]
	suite.require(held_buttons.all(func(b): return b.mouse_filter==Control.MOUSE_FILTER_IGNORE),"a handoff briefly holds pointer input so a double-click or double tap cannot choose the next welcome")
	await suite.create_timer(0.65).timeout
	suite.require(held_buttons.all(func(b): return b.mouse_filter==Control.MOUSE_FILTER_STOP),"pointer input returns after the settle")
	visit.handoff(1); visit.handoff(0); visit.advance()
	var prior: Dictionary=visit.snapshot(); var results: Array=game.hosting_results.duplicate(true); game.hosting_results[0].value="invalid"
	suite.require(not visit.prepare() and visit.order==prior.order and visit.gestures==prior.gestures and visit.completed and visit.notice.contains("unavailable"),"invalid copied contribution refuses without destroying previous visit")
	game.hosting_results.assign(results); var published: Array=game.programme_published.duplicate(); game.programme_published.clear()
	suite.require(not visit.prepare() and visit.completed,"invalid posted order refuses transactionally"); game.programme_published.assign(published)
	visit.back_to_studio(); game.hosting_results[0].value="invalid"; studio.budget_notice="Existing budget refusal"
	suite.require(not visit.prepare() and not visit.visible and visit.completed and studio.budget_notice=="Existing budget refusal" and studio.description().contains("unavailable"),"hidden refusal preserves the previous visit and independent save-budget channel")
	studio.toggle_view(); suite.require(not studio.description().contains("unavailable") and studio.description().contains("Existing budget refusal"),"gathering refusal stays out of Draft without suppressing budget feedback")
	game.hosting_results.assign(results); studio.reset_visit(); suite.require(studio.open_studio(true),"hidden first-entry refusal fixture")
	game.hosting_results[0].value="invalid"; suite.require(not visit.open_gathering() and not visit.visible and visit.order.is_empty() and studio.description().contains("unavailable") and studio.budget_notice.is_empty(),"invalid hidden first entry refuses through Posted only")
	game.hosting_results.assign(results)
	for kind in ["native good","native bad","browser","defaults"]:
		studio.reset_visit(); await ready(suite,game,full); suite.require(studio.open_studio(true) and visit.open_gathering(),"populated lifecycle entry")
		visit.handoff(0); visit.handoff(1); visit.handoff(0); visit.advance(); visit.back_to_studio(); studio.close_studio(false)
		suite.require(visit.completed and visit.gestures.size()==3,"hidden populated visit precedes reset")
		if kind=="native good": suite.require(game.apply_save_envelope(full),"successful native apply")
		elif kind=="native bad": suite.require(not game.apply_save_envelope("bad"),"invalid native rejected")
		elif kind=="defaults": game.reset_mural_state_to_defaults("fresh")
		else:
			suite.require(not game.import_browser_save_json("bad") and visit.completed and visit.gestures.size()==3,"failed browser import preserves actual hidden visit")
			suite.require(game.import_browser_save_json('{"version":1,"core":{"greeted":true}}'),"successful browser import")
		suite.require(visit.order.is_empty() and visit.copies.is_empty() and visit.gestures.is_empty() and not visit.completed and not visit.visible,"each actual reset clears full visit")
	game.apply_save_envelope(original); game.hide_story_card(); suite.root.content_scale_size=scale0; suite.root.size=size0
	for key in state: game.set(key,state[key])
	for c in visibility: c.visible=visibility[c]
	game.update_block_ui(); game.layout_walking_controls_and_hub(); MOTION.restore_motion(game,motion)
	for frame in range(8): await suite.process_frame
	for key in state: game.set(key,state[key])
	MOTION.restore_motion(game,motion)
	game.cue_history.assign(history); game.cue_arpeggio_freqs.assign(freqs)
	if game.local_audio_player!=null: game.local_audio_player.stream=local_stream
	game.shared_panel.textures=caches[0]; game.bea_invitation.textures=caches[1]; visit.held_on_exit.assign(held)
	suite.require(game.shared_panel.textures==caches[0] and game.bea_invitation.textures==caches[1] and visit.held_on_exit==held,"programme fixture restores caller texture caches and release guard")
	game.update_music_ui(); game.info.text=info_text
	game.last_a11y_announcement=state.last_a11y_announcement; game.a11y_announcement_seq=state.a11y_announcement_seq
	for key in state: suite.require(game.get(key)==state[key],"programme gathering restores idle caller field "+key)
	suite.require(game.cue_history==history and game.cue_arpeggio_freqs==freqs and game.info.text==info_text and game.last_music_cue==state.last_music_cue and game.cue_arpeggio_duration==state.cue_arpeggio_duration and game.reward_sound_count==state.reward_sound_count,"programme gathering restores full cue history, arpeggio, info and reward count, including bounded-history contents")
	if had_save:
		var file := FileAccess.open(game.save_path,FileAccess.WRITE); file.store_buffer(saved); file.close()
	else: DirAccess.remove_absolute(ProjectSettings.globalize_path(game.save_path))
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	suite.require(JSON.stringify(game.build_save_envelope())==original and MOTION.motion_state(game)==motion,"programme gathering restores caller motion/progress")
	suite.require(cases==22,"all22 supported layout-size cases")
	print("PROGRAMME_GATHERING_PASS:","FORMAL" if formal else "PRIVATE",":",cases,":orders=",orders,":pairs=",pairs.size())
