extends RefCounted
# Last feature fixture; restores owned paths before suite cleanup and settings compatibility.
# PRIVATE callers likewise discard the scene afterwards; no caller-state restoration claim.
static func put(path: String, raw: String) -> void:
	var file := FileAccess.open(path,FileAccess.WRITE)
	assert(file != null)
	file.store_string(raw)
	file.close()

static func populated(suite: SceneTree, game: Node, full: String) -> void:
	suite.require(game.apply_save_envelope(full),"persistence fixture loads validated earned contributions")
	game.hide_story_card(); game.startup_story_pending=false
	game.last_story_chapter=int(game.current_chapter().num)
	game.current_path.clear(); game.stop_music_playback()
	for frame in range(4): await suite.process_frame
	var studio: Node=game.programme_studio
	suite.require(studio.open_studio(true) and studio.gathering.open_gathering(),"persistence fixture deliberately opens copied visit")
	studio.gathering.handoff(0)
	studio.gathering.back_to_studio(); studio.close_studio(false)
	suite.require(studio.gathering.gestures.size()==1,"populated hidden visit exists before import")

static func verify(suite: SceneTree, game: Node, full: String, formal := false) -> void:
	suite.require(game.is_test_suite_mode() and game.save_path.begins_with("user://godot_block_save_test_") and game.settings_path.begins_with("user://godot_block_settings_test_"),"persistence requires paired owned isolated paths")
	suite.require(not formal or suite.get_script().resource_path.ends_with("/study_test.gd"),"FORMAL persistence only in full suite")
	var save: String=game.save_path; var settings: String=game.settings_path
	var absent: Variant=null
	suite.require(not (absent != null and bool(absent)),"null bridge receipt short-circuits before unsafe conversion")
	# Repeated admission uses the same next-sequence boundary as the writer.
	for rollover in [9,99]:
		game.reset_mural_state_to_defaults("fresh"); game.save_seq=rollover; game.optional_save_data={"padding":""}
		var current: Dictionary=game.build_save_envelope()
		game.optional_save_data.padding="a".repeat(4096-JSON.stringify(current).to_utf8_buffer().size())
		var equal: Dictionary=game.build_save_envelope()
		suite.require(game.save_budget_kind(equal)==1,"non-growing next-sequence overflow remains visit-only")
		var growing: Dictionary=game.build_save_envelope(); growing.optional.padding+="b"
		suite.require(game.save_budget_kind(growing)==-1,"next-sequence overflow still refuses growth")
	# Real Studio start: oversized growth refuses; storage refusal keeps action speech.
	for oversized in [true,false]:
		var idle: Dictionary=JSON.parse_string(full)
		idle.hosting={"order":[],"results":[],"draft":game.default_hosting_draft()}
		idle.civic={"phase":"idle","draft":game.default_civic_draft(),"result":null}
		idle.film={"phase":"idle","draft":game.default_film_draft(),"result":null,"captured":[]}
		idle.optional={"padding":"x".repeat(5000)} if oversized else {}
		suite.require(game.apply_save_envelope(JSON.stringify(idle)),"validated ready-to-host fixture")
		game.hide_story_card(); game.startup_story_pending=false; game.current_path.clear()
		game.last_story_chapter=int(game.current_chapter().num)
		for frame in range(4): await suite.process_frame
		suite.require(game.programme_studio.open_studio(true),"real Posted start is available")
		if not oversized: game.save_path=save+"/impossible-hosting.json"
		game.programme_studio.advance()
		if oversized:
			suite.require(game.hosting_order.is_empty() and game.programme_studio.budget_notice.contains("Change not made"),"growing oversized hosting start refuses before action")
			game.programme_studio.close_studio(false)
		else:
			suite.require(game.hosting_order.size()==4 and game.last_a11y_announcement.contains("Started hosting") and game.last_a11y_announcement.contains("Visit-only"),"failed storage keeps hosting action and warning together")
		game.save_path=save
	var visit: Node=game.programme_studio.gathering
	await populated(suite,game,full)
	game.optional_save_data={"first":"x".repeat(5000)}
	var before: String=JSON.stringify(game.build_save_envelope()); var copied: Dictionary=visit.copies.duplicate(true); var gestures: Array=visit.gestures.duplicate()
	var sequence: int=game.save_seq
	for optional in [{"second":"y".repeat(4000)},{"incoming":"z".repeat(8300)}]:
		suite.require(not game.import_browser_save_json(JSON.stringify({"version":1,"core":{"greeted":true},"optional":optional})),"unpreservable optional import refuses")
		suite.require(JSON.stringify(game.build_save_envelope())==before and visit.copies==copied and visit.gestures==gestures and game.save_seq==sequence,"refusal preserves exact progress and populated visit before reset")
		suite.require(game.browser_import_message.contains("Nothing changed"),"refusal has honest visible receipt")
	suite.require(not game.import_browser_save_json("bad") and visit.copies==copied,"malformed import also preserves populated visit")
	# A valid replacement key avoids merge growth, applies for this visit, and clears the visit.
	suite.require(game.import_browser_save_json(JSON.stringify({"version":1,"core":{"greeted":true},"optional":{"first":"q".repeat(5000)}})),"valid oversized import remains applied=true")
	suite.require(visit.order.is_empty() and game.optional_save_data.first=="q".repeat(5000) and game.save_seq==sequence,"successful visit-only import resets visit without losing input or consuming sequence")
	suite.require(game.info.text.contains("Visit-only") and game.last_a11y_announcement.contains("Visit-only") and not game.info.text.contains("Saved to"),"final import text and announcement state unsaved status")
	# The admission contract counts characters; writer budget counts UTF-8 bytes.
	game.reset_mural_state_to_defaults("fresh")
	var unicode_value := String.chr(233).repeat(2200)
	suite.require(game.import_browser_save_json(JSON.stringify({"version":1,"core":{"greeted":true},"optional":{"unicode":unicode_value}})),"multibyte input below optional character limit applies")
	suite.require(game.optional_save_data.unicode==unicode_value and game.save_notice=="save full","multibyte input retained exactly with byte-budget warning")
	# Exact 4096 next-sequence envelope, one-byte overflow, and decimal rollover.
	for initial_sequence in [8,9,99]:
		game.reset_mural_state_to_defaults("fresh"); game.save_seq=initial_sequence; game.optional_save_data={"padding":""}
		var next: Dictionary=game.build_save_envelope(); next.save_seq=initial_sequence+1
		var padding: int=4096-JSON.stringify(next).to_utf8_buffer().size()
		game.optional_save_data.padding="a".repeat(padding)
		suite.require(game.save_godot_state() and FileAccess.get_file_as_bytes(save).size()==4096 and game.save_seq==initial_sequence+1,"exact writer boundary accounts for decimal sequence growth")
		var stored := FileAccess.get_file_as_string(save); sequence=game.save_seq
		game.optional_save_data.padding+="a"
		suite.require(not game.save_godot_state() and FileAccess.get_file_as_string(save)==stored and game.save_seq==sequence,"overflow preserves stored bytes and sequence")
	# File-open failure is controlled with a child beneath an owned regular file.
	game.reset_mural_state_to_defaults("fresh"); suite.require(game.save_godot_state(),"baseline native save")
	var stored := FileAccess.get_file_as_string(save); sequence=game.save_seq
	game.save_path=save+"/impossible-child.json"; game.history_read=true
	suite.require(not game.save_godot_state() and game.save_seq==sequence and FileAccess.get_file_as_string(save)==stored,"native open refusal cannot consume sequence or damage baseline")
	game.announce_a11y_status("Action completed.")
	suite.require(game.progress_label.text.contains("Visit-only") and game.last_a11y_announcement.contains("Visit-only"),"ordinary save failure reaches header and final announcement")
	var announcement: String=game.last_a11y_announcement; var ann_seq: int=game.a11y_announcement_seq
	game.announce_a11y_status(" \n ")
	suite.require(game.last_a11y_announcement==announcement and game.a11y_announcement_seq==ann_seq,"empty announcement remains a no-op with a warning latched")
	game.settings_path=save+"/impossible-settings.json"
	suite.require(not game.save_godot_settings() and game.settings_save_failed,"independent preference write failure is retained")
	game.save_path=save; suite.require(game.save_godot_state() and game.save_seq==sequence+1 and game.save_notice.is_empty() and game.settings_save_failed,"successful progress recovery clears only its own warning")
	game.settings_path=settings; suite.require(game.save_godot_settings() and not game.settings_save_failed,"preference recovery clears its own warning")
	suite.require(game.load_godot_state() and game.history_read and game.save_seq==sequence+1,"native recovery reload restores actual changed progress")
	# Single-store loader retains exact absent/blank/nonempty validation boundaries.
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save))
	suite.require(not game.load_godot_state() and game.save_load_status=="fresh","absent native load is fresh")
	put(save," \n\t ")
	suite.require(not game.load_godot_state() and game.save_load_status=="fresh","blank native load is fresh")
	put(save,"not json")
	suite.require(not game.load_godot_state() and game.save_load_status=="recovered","malformed nonempty native load recovers")
	put(save,full); suite.require(game.load_godot_state() and game.is_hosting_done(),"valid native load retains earned records")
	await populated(suite,game,full)
	suite.require(not game.apply_save_envelope("bad") and visit.order.is_empty() and game.save_load_status=="recovered","native invalid apply still clears populated visit before validation")
	game.save_path=save; game.settings_path=settings
	print("PERSISTENCE_HONESTY_PASS:","FORMAL" if formal else "PRIVATE",":optional:unicode:budget:sequence:open-refusal:recovery:loader:visit-boundaries")
