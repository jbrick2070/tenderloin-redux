extends RefCounted
## Actual fourth completion, copied results, retained view-only handoff and future plans.
const Hosted = preload("res://hosted_afternoon.gd")
const Community = preload("res://tests/community_invitation_checks.gd")

static func verify(suite: SceneTree, study: Node, full: String, formal := false) -> void:
	suite.require(study.is_test_suite_mode(),"Hosted checks require isolated test-suite profile")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL provenance requires the complete study suite caller")
	var original: String=JSON.stringify(study.build_save_envelope())
	var state := {}
	for key in ["following_player","in_overview","in_wide_overview","target","view_size","camera_yaw","camera_pitch_scale","block_panel_mode","block_hub_invitation","block_hub_page","talk_partner","selected_neighbor","arrived_neighbor","panel_frame_control","panel_frame_subject","panel_frame_pose","last_panel_dialogue","last_story_chapter","startup_story_pending"]:
		var current: Variant=study.get(key)
		state[key]=current.duplicate(true) if current is Array or current is Dictionary else current
	var visibility := {}
	for c in study.programme_studio.get_parent().get_children():
		if c is Control: visibility[c]=c.visible
	var focus: Control=suite.root.gui_get_focus_owner()
	var original_size: Vector2i=suite.root.size
	var original_file_exists := FileAccess.file_exists(study.save_path)
	var original_file := FileAccess.get_file_as_string(study.save_path) if original_file_exists else ""
	var rhythm_notice: String=study.rhythm_circle.chapter_completion_notice
	var loan_notice: String=study.loan_homecoming.chapter_completion_notice
	var studio: Control=study.programme_studio
	var cases := 0
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(390,568),Vector2i(520,360),Vector2i(559,360)]:
			for order in [["stories","beats","art","pause"],["beats","pause","stories","art"]]:
				var p: Dictionary=JSON.parse_string(full)
				p.gathering_layout=layout
				p.programme={"order":order.duplicate(),"published":order.duplicate()}
				var draft: Dictionary=study.default_hosting_draft()
				draft.story="memory" if order[0]=="stories" else "future"
				draft.pattern=37 if order[0]=="stories" else 0
				draft.palette="warm" if order[0]=="stories" else "cool"
				draft.quiet="arc" if order[0]=="stories" else "pairs"
				draft.tiles=[2,0,1,2,0,1]
				var results: Array=[]
				for id in order.slice(0,3): results.append({"id":id,"value":value(draft,id)})
				p.hosting={"order":order.duplicate(),"results":results,"draft":draft}
				p.civic={"phase":"idle","draft":study.default_civic_draft(),"result":null}
				p.film={"phase":"idle","draft":study.default_film_draft(),"result":null,"captured":[]}
				var loaded: bool=study.apply_save_envelope(JSON.stringify(p))
				suite.require(loaded,"accepted PRIVATE three-completion profile before actual fourth action")
				if not loaded: return
				suite.root.size=size
				study.hide_story_card(); study.startup_story_pending=false
				study.following_player=false; study.in_overview=false; study.in_wide_overview=false
				study.last_story_chapter=int(study.current_chapter().num)
				suite.require(not Hosted.invitation_available(study) and not studio.open_studio(false,true),"no Hosted review or offer before actual fourth completion")
				if order[3]=="art":
					study.open_programme_or_host()
					for frame in range(6): await suite.process_frame
					suite.require(study.shared_panel.visible,"original active hub dispatch opens art paper before fourth Hang")
					await suite.phone_accept(study.shared_panel.options[2])
				else: await Community.press_key(suite,KEY_Z)
				suite.require(study.is_hosting_done() and Hosted.invitation_available(study),"actual fourth completion earns derived invitation without a new flag")
				study.hide_story_card(); study.last_story_chapter=int(study.current_chapter().num)
				study.show_block_panel(true)
				for frame in range(6): await suite.process_frame
				# Original hub callback dispatches to Hosted; direct F6 remains future Draft.
				study.open_programme_or_host()
				for frame in range(8): await suite.process_frame
				suite.require(studio.visible and studio.hosted_view and study.block_buttons.find(study.block_programme_btn)==3,"completed original hub action opens Hosted at original logical index")
				var before := Community.signature(study)
				var copies: String=JSON.stringify(study.hosting_results)
				for i in range(4):
					await suite.phone_accept(studio.cards[i])
					suite.require(studio.reader.text.contains(Hosted.OWNERS[i]+': "') and studio.cards[i].text.begins_with(str(order.find(Hosted.IDS[i])+1)+"."),"selected contribution has specific owner response and actual hosted position")
					suite.require(studio.picture.texture!=null and studio.picture.size.x>=180 and studio.picture.size.y>=60,"copied picture retains useful visible scene space")
					for b in studio.cards+[studio.primary,studio.view,studio.music,studio.back]:
						suite.require(b.is_visible_in_tree() and b.size.x>=44 and b.size.y>=44 and Rect2(Vector2.ZERO,Vector2(size)).encloses(b.get_global_rect()),"Hosted full controls fit supported viewport and keep44px targets")
						suite.require(studio.button_words_fit(b),"Hosted action and contribution labels keep complete readable words")
					suite.require(studio.reader.get_theme_font_size("normal_font_size")==16 and studio.reader.size.y>=40,"Hosted full response remains scrollable16px prose")
					studio.toggle_card(); studio.move_card(-1)
					suite.require(studio.edits.all(func(b): return b.disabled) and Community.signature(study)==before,"read-only result selection/edit refusal never mutates save/camera/quiet/copies")
				await suite.phone_accept(studio.back)
				suite.require(not studio.visible and Community.signature(study)==before,"Keep exploring retains offer and exact copied progress")
				if size==Vector2i(390,667) and layout=="table" and order[0]=="stories":
					study.open_programme_or_host()
					for resized in [Vector2i(520,360),Vector2i(320,667),size]:
						suite.root.size=resized
						for frame in range(8): await suite.process_frame
						for b in studio.cards+[studio.primary,studio.view,studio.music,studio.back]: suite.require(Rect2(Vector2.ZERO,Vector2(resized)).encloses(b.get_global_rect()) and studio.button_words_fit(b),"open Hosted resize keeps controls and whole words reachable")
					studio.close_studio(false)
				# All phase offers reveal the F5 reader entry; none starts or advances civic.
				for phase in ["idle","planning","meeting","done"]:
					var phase_profile: Dictionary=study.build_save_envelope().duplicate(true)
					phase_profile.civic={"phase":phase,"draft":study.default_civic_draft(),"result":study.default_civic_draft() if phase in ["meeting","done"] else null}
					suite.require(study.apply_save_envelope(JSON.stringify(phase_profile)),"accepted exact civic phase for retained Hosted offer")
					study.hide_story_card(); study.startup_story_pending=false
					study.last_story_chapter=int(study.current_chapter().num)
					study.show_block_panel(true)
					for frame in range(6): await suite.process_frame
					study.open_programme_or_host()
					for frame in range(6): await suite.process_frame
					before=Community.signature(study)
					if phase=="done":
						suite.require(studio.primary.disabled and not studio.follow_hosted_invitation() and studio.reader.text.contains("Dez's offer"),"completed Listening keeps recognition and original access without duplicate Follow")
						await suite.phone_accept(studio.back)
					else:
						var chapter: Dictionary=study.current_chapter()
						if phase=="idle":
							# Defensive synthetic pending-notice branch, not genuine progression evidence.
							study.last_story_chapter=int(chapter.num)-1
							study.rhythm_circle.chapter_completion_notice="Rhythm notice. "
							study.loan_homecoming.chapter_completion_notice="Loan notice. "
						await suite.phone_accept(studio.primary)
						for frame in range(6): await suite.process_frame
						suite.require(not studio.visible and study.civic_listening.entry.is_visible_in_tree() and study.civic_listening.entry.has_focus() and not study.civic_listening.visible and not study.is_story_card_visible(),"Follow focuses only existing visible Listening reader entry")
						suite.require(Community.signature(study)==before and study.civic_phase==phase,"Follow does not start/convene/complete/write/reward/move/play")
						if phase=="idle": suite.require(study.last_a11y_announcement.contains(String(chapter.title)) and study.last_a11y_announcement.contains(String(chapter.intro)) and study.last_a11y_announcement.contains("Rhythm notice.") and study.last_a11y_announcement.contains("Loan notice.") and study.rhythm_circle.chapter_completion_notice.is_empty() and study.loan_homecoming.chapter_completion_notice.is_empty(),"Follow delivers earned chapter and both side notices once without forced card")
						await suite.phone_accept(study.civic_listening.entry)
						suite.require(study.civic_listening.visible and study.civic_phase==phase,"separate explicit entry activation opens view without advancing phase")
						study.civic_listening.close_hour(false)
				# Original keyboard surface remains a future Draft, with truthful limitation.
				await Community.press_key(suite,KEY_F6)
				suite.require(studio.visible and not studio.hosted_view and not studio.posted and studio.description().contains("Posting alone does not start another gathering"),"actual F6 keeps future Draft and discloses future enactment boundary")
				studio.selected="art"; studio.move_card(-1)
				suite.require(JSON.stringify(study.hosting_results)==copies and study.hosting_order==order,"future draft edit leaves copied result and hosted order intact")
				studio.close_studio(false)
				study.open_programme_or_host()
				suite.require(studio.hosted_view and JSON.stringify(study.hosting_results)==copies,"reopen retains actual Hosted copy after separate future editing")
				studio.close_studio(false)
				if size in [Vector2i(390,667),Vector2i(559,360)] and layout=="table" and order[0]=="stories":
					var earned: Dictionary=study.build_save_envelope().duplicate(true)
					earned.civic={"phase":"idle","draft":study.default_civic_draft(),"result":null}
					for context in ["hidden","talk","following","talk-manual"]:
						study.apply_save_envelope(JSON.stringify(earned)); study.hide_story_card(); study.startup_story_pending=false
						study.last_story_chapter=int(study.current_chapter().num)
						study.following_player=context=="following"; study.in_overview=false; study.in_wide_overview=false
						study.show_block_panel(false); study.selected_neighbor=study.celeste_index; study.arrived_neighbor=-1
						if context.begins_with("talk"):
							study.selected_neighbor=0; study.arrived_neighbor=0; study.show_conversation(0)
						for frame in range(6): await suite.process_frame
						if context=="talk-manual": study.pan_camera_by_screen_delta(Vector2(20,0))
						study.run_conversation_action_id("programme")
						for frame in range(6): await suite.process_frame
						suite.require(studio.visible and studio.hosted_view,"same programme callback opens Hosted from hidden or conversation context")
						var releases_frame: bool=context=="talk" and size==Vector2i(559,360)
						var expected_following: bool=study.following_player or releases_frame
						var preserve_pose: bool=not expected_following
						var contextual := Community.signature(study,preserve_pose)
						if releases_frame: contextual[4]=[true,false,false]
						if context=="following":
							studio.primary.grab_focus(); await Community.press_key(suite,KEY_ENTER,true)
						else: await suite.phone_accept(studio.primary)
						for frame in range(6): await suite.process_frame
						suite.require(not studio.visible and study.civic_listening.entry.has_focus() and not study.civic_listening.visible and study.block_panel_neighbor_idx()==-1,"context/held Enter handoff focuses reader in neutral hub without accidental start")
						suite.require(Community.signature(study,preserve_pose)==contextual,"context/held Enter preserves exact progress, quiet, selection and deliberate camera intent")
						suite.require(study.following_player==expected_following and Rect2(Vector2.ZERO,Vector2(size)).encloses(study.civic_listening.entry.get_global_rect()),"handoff preserves original automatic talk-frame release and visible reader entry")
					study.apply_save_envelope(JSON.stringify(earned)); study.hide_story_card(); study.startup_story_pending=false
					study.last_story_chapter=int(study.current_chapter().num); study.open_programme_or_host()
					suite.require(not study.import_browser_save_json("not-json") and studio.visible and Hosted.invitation_available(study),"invalid import preserves current Hosted reader and derived offer")
					suite.require(study.apply_save_envelope(JSON.stringify(earned)) and not studio.visible and Hosted.invitation_available(study),"successful load closes visit-only reader and rederives durable offer")
					suite.require(study.apply_save_envelope(JSON.stringify(p)) and not Hosted.invitation_available(study),"earlier three-completion load removes offer truthfully")
					var legacy := {"version":1,"core":{"greeted":true,"layout":layout,"furniture":{"table":{"col":1,"row":0},"seats":{"col":4,"row":0},"speaker":{"col":1,"row":3}},"litter":["cup","offcuts","wrapper"],"mural":{"sun":{"col":0,"row":0},"wave":{"col":2,"row":0},"rise":{"col":4,"row":0}},"palette":"sunset","soundcheck":true,"opened":true,"history":true,"blackhawk":true,"epilogue":earned.epilogue,"programme":earned.programme,"hosting":earned.hosting,"civic":earned.civic,"film":earned.film}}
					suite.require(study.import_browser_save_json(JSON.stringify(legacy)) and Hosted.invitation_available(study),"valid earlier browser-save import rederives actual copied gathering offer")
					suite.require(study.apply_save_envelope(JSON.stringify(earned)) and Hosted.invitation_available(study),"established completed load restores retained choice without new flag")
					var large: Dictionary=earned.duplicate(true)
					large.optional={"budget_probe":"x".repeat(5000)}
					suite.require(study.apply_save_envelope(JSON.stringify(large)),"existing oversized optional import remains accepted in memory")
					study.hide_story_card(); study.startup_story_pending=false; study.last_story_chapter=int(study.current_chapter().num)
					study.show_block_panel(true)
					for frame in range(6): await suite.process_frame
					study.open_programme_or_host()
					before=Community.signature(study)
					await suite.phone_accept(studio.primary)
					for frame in range(6): await suite.process_frame
					suite.require(Hosted.invitation_available(study) and Community.signature(study)==before,"oversized imported offer is read-only and never writes/truncates/repairs retained file or sequence")
					study.apply_save_envelope(JSON.stringify(earned))
				# Presenter refuses malformed raw variants without repairing source state.
				var saved_results: Array=study.hosting_results.duplicate(true)
				study.hosting_results.assign([{"id":"stories","value":false},{"id":"beats","value":999},{"id":"art","value":{"palette":"cool","tiles":[true,0,1,2,0,1]}},{"id":"pause","value":2}])
				for id in Hosted.IDS: suite.require(Hosted.detail(study,id).contains("unavailable"),"malformed copied raw variant has honest read-only fallback")
				suite.require(study.hosting_results[0].value==false,"fallback does not repair raw data")
				study.hosting_results.assign(saved_results)
				study.hosting_results.assign([{"id":"beats","value":0.999999},{"id":"art","value":{"palette":"cool","tiles":[0.999999,0,1,2,0,1]}}])
				suite.require(Hosted.copied(study,"beats").value==1 and Hosted.copied(study,"art").value.tiles[0]==1,"near-whole copied values use existing loader rounding parity")
				study.hosting_results[1].value.tiles[0]=2.999999
				suite.require(not Hosted.copied(study,"art").valid,"near-whole tile rounding outside range reports unavailable rather than truncating")
				study.hosting_results.assign(saved_results)
				study.reset_mural_state_to_defaults("Hosted component reset")
				suite.require(not Hosted.invitation_available(study),"reset removes prerequisite and retained offer without stale flags")
				cases+=1
	suite.root.size=original_size
	study.apply_save_envelope(original); study.hide_story_card()
	study.rhythm_circle.chapter_completion_notice=rhythm_notice
	study.loan_homecoming.chapter_completion_notice=loan_notice
	for key in state: study.set(key,state[key])
	study.update_block_ui()
	for c in visibility:
		if is_instance_valid(c): c.visible=visibility[c]
	study.layout_walking_controls_and_hub()
	for frame in range(6): await suite.process_frame
	# Deferred refits may run during restoration; restore the captured owner/pose last.
	for key in state: study.set(key,state[key])
	study.update_camera()
	if is_instance_valid(focus) and focus.is_visible_in_tree(): focus.grab_focus()
	for key in state: suite.require(study.get(key)==state[key],"Hosted component restores caller presentation field: "+key)
	if original_file_exists:
		var restored := FileAccess.open(study.save_path,FileAccess.WRITE)
		restored.store_string(original_file); restored.close()
	else: DirAccess.remove_absolute(study.save_path)
	print("HOSTED_AFTERNOON_PASS:"+("FORMAL" if formal else "PRIVATE")+" isolated-prefix/real-Z-or-Hang-fourth/2orders/2layouts x6sizes/4copies/read-only/Keep-reopen/4civicphases/focus-only/F6future/defensive-notices/malformed-reset/caller-restored ",cases)

static func value(draft: Dictionary,id: String) -> Variant:
	match id:
		"stories": return draft.story
		"beats": return draft.pattern
		"art": return {"palette":draft.palette,"tiles":draft.tiles.duplicate()}
	return draft.quiet
