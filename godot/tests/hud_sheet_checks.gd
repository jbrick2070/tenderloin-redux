extends RefCounted
## HUD Phase 3 (docs/HUD_REDESIGN_PLAN.md 4 and 8): the conversation, mural and music sheets's two heights with their handle and memory,
## the bubble shown only while the sheet is at bar height, and the status line that reads what Info used to receive:
## dialogue the scene cannot place, a hint with no one to say it, route messages and a reward with no room. Also Phase 2's
## gaps: panels stand on the one-row bar, desktop has one Next Step while talking, and the Explore tray uses the bar's font.
## Runs after the bar checks, over the startup card, and restores the size, progress, camera, card and panels it touches.

static func frames(suite: SceneTree, n: int) -> void:
	for _f in range(n):
		await suite.process_frame

static func near(a: float, b: float, tolerance := 1.5) -> bool:
	return absf(a - b) <= tolerance

static func verify(suite: SceneTree, game: Node) -> void:
	var size0: Vector2i = suite.root.size
	var state := {}
	for key in ["following_player", "in_overview", "in_wide_overview", "target", "view_size", "camera_yaw", "camera_pitch_scale", "block_panel_mode", "block_hub_page", "last_panel_dialogue", "panel_frame_control", "header_details_expanded", "talk_partner", "selected_neighbor", "arrived_neighbor"]:
		state[key] = game.get(key)
	var player0: Vector3 = game.player.position
	var talks0: Dictionary = game.neighbor_talk_counts.duplicate(true)
	var visited0: Dictionary = game.visited_neighbors.duplicate(true)
	game.hide_story_card()
	game.set_header_details(false, false)
	await frames(suite, 2)

	# 1. The conversation sheet at each size class: half reads the line once, Show less leaves the handle on the bar with
	# Goodbye beside it and the bubble back on stage, Show more returns, and each neighbor keeps the height it was left at.
	for size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(667, 390)]:
		suite.root.size = size
		await frames(suite, 4)
		game.sheet_heights.clear()
		game.show_conversation(0)
		game.talk_with_neighbor(0)
		await frames(suite, 2)
		game.update_celebration_burst(4.0) # A reward on screen holds a line back (the existing rule); this one has read.
		await frames(suite, 3)
		var snap: Dictionary = game.sheet_snapshot()
		var handle: Rect2 = game.sheet_handle_btn.get_global_rect()
		suite.require(snap.mode == "talk" and snap.height == "half" and game.sheet_handle_btn.is_visible_in_tree() and game.sheet_handle_btn.text == "Show less" and handle.size.x >= 44.0 and handle.size.y >= 44.0, "at %s a conversation opens at half with a 44 px Show less handle (%s %s %s)" % [size, snap.mode, snap.height, handle.size])
		var said: String = game.speech_bubble_text
		suite.require(not said.is_empty() and game.block_detail_label.is_visible_in_tree() and game.block_detail_label.text.contains(said) and not game.is_speech_bubble_visible(), "at %s the half sheet reads the line and the bubble stays hidden" % size)
		if game.hud_size_class() != "portrait":
			suite.require(game.next_hint_control.is_visible_in_tree() and not game.conv_next_btn.is_visible_in_tree(), "at %s Next Step is on the bar once, not again in the conversation" % size)
		var area_half: Rect2 = game.play_area_rect()
		game.sheet_handle_btn.pressed.emit()
		await frames(suite, 4)
		snap = game.sheet_snapshot()
		var panel: Rect2 = game.block_panel.get_global_rect()
		var bar_top: float = game.controls.get_global_rect().position.y
		suite.require(snap.height == "bar" and game.sheet_handle_btn.text == "Show more" and not game.conv_rows[0].is_visible_in_tree() and not game.block_detail_label.is_visible_in_tree(), "at %s Show less leaves the handle alone (%s)" % [size, snap.height])
		suite.require(game.controls.is_visible_in_tree() and near(panel.end.y, bar_top - 8.0) and panel.size.y <= 64.0 and not snap.docked, "at %s the sheet at bar height stands on the bar (%s over %.0f)" % [size, panel, bar_top])
		suite.require(game.walk_control.text == "Goodbye" and game.walk_control.is_visible_in_tree(), "at %s the bar's middle button reads Goodbye while the sheet is shown less ('%s')" % [size, game.walk_control.text])
		suite.require(game.play_area_rect().get_area() > area_half.get_area() * 1.15, "at %s showing less gives the scene its room back (%s, was %s)" % [size, game.play_area_rect().size, area_half.size])
		var first_words := said.replace("\n", " ").substr(0, 12)
		suite.require(not game.speech_bubble_anchor.is_empty() and (game.is_speech_bubble_visible() or (game.speech_bubble_in_sheet and game.block_label.text.contains(first_words))), "at %s the line is back on stage, or its first words are under the handle" % size)
		game.end_conversation()
		await frames(suite, 2)
		game.show_conversation(0)
		await frames(suite, 3)
		suite.require(game.sheet_snapshot().height == "bar", "at %s the same neighbor's conversation reopens shown less" % size)
		game.end_conversation()
		game.show_conversation(1)
		await frames(suite, 3)
		suite.require(game.sheet_snapshot().height == "half", "at %s another neighbor's conversation opens at half" % size)
		game.end_conversation()
		game.show_conversation(0)
		await frames(suite, 3)
		game.press_next_step()
		await frames(suite, 3)
		var who: String = String(game.neighbors[0].name)
		suite.require(game.sheet_snapshot().height == "half" and game.block_detail_label.is_visible_in_tree() and game.block_detail_label.text.begins_with(who + ":"), "at %s Next Step from the bar-height sheet reads %s's hint in the sheet at half ('%s')" % [size, who, game.block_detail_label.text.left(40)])
		game.sheet_handle_btn.pressed.emit()
		await frames(suite, 3)
		game.update_celebration_burst(4.0)
		game.show_speech_bubble("host-fixture", game.target, "A host across the street says a line far too long for the scene to place. ".repeat(12), 20.0)
		game.update_speech_bubble(0.1)
		await frames(suite, 2)
		suite.require(game.speech_bubble_in_sheet and game.block_label.text.begins_with("A host") and not game.block_label.text.begins_with(who + ":"), "at %s someone else's line under the handle is not given %s's name ('%s')" % [size, who, game.block_label.text.left(30)])
		game.hide_speech_bubble()
		suite.require(game.block_label.text.begins_with(who + " · Turn"), "at %s the handle's title goes back to %s once the line ends" % [size, who])
		game.sheet_handle_btn.pressed.emit()
		await frames(suite, 3)
		suite.require(not game.walk_to_point(Vector2(-350.0, -350.0)), "HUD fixture asks for a point off every street during a conversation")
		await frames(suite, 2)
		suite.require(game.talk_sheet_open() and game.block_detail_label.text.begins_with("No walkable") and not game.sheet_bar_visible(), "at %s a route message during a conversation reads in its sheet, not stacked above it" % size)
		game.sheet_handle_btn.pressed.emit()
		await frames(suite, 3)
		game.press_walk_control()
		game.finish_phone_primary_transition()
		await frames(suite, 3)
		suite.require(not game.talk_sheet_open() and game.talk_partner == -1, "at %s Goodbye on the bar ends the conversation" % size)
		game.sheet_handle_btn.pressed.emit() # A handle press with no conversation open changes nothing.
		suite.require(not game.talk_sheet_open(), "at %s the hidden handle cannot reopen a conversation" % size)
	game.sheet_heights.clear()

	# 2. A line the scene cannot place goes to the status line, never to Info; while a conversation reads at half it goes
	# into that conversation's reader instead.
	suite.root.size = Vector2i(390, 667)
	await frames(suite, 4)
	game.follow_player()
	game.update_celebration_burst(4.0) # A reward on screen holds a line back until it has read (the existing rule).
	await frames(suite, 2)
	game.show_speech_bubble("sheet-fixture", game.target, "A complete line too long for the street above the bar. ".repeat(25), 20.0)
	game.update_speech_bubble(0.1)
	await frames(suite, 3)
	var line: Dictionary = game.sheet_snapshot().line
	suite.require(game.speech_bubble_in_sheet and line.visible and line.kind == "speech" and String(line.text) == game.speech_bubble_text, "a line the scene cannot place reads in the status line (%s)" % line.kind)
	suite.require(not game.header_details_expanded and not game.info.is_visible_in_tree(), "Info never receives dialogue")
	suite.require(game.last_a11y_announcement.contains("Full dialogue in the line above the bar."), "the screen reader hears where the line is ('%s')" % game.last_a11y_announcement.right(60))
	var bar_rect: Rect2 = game.sheet_bar.get_global_rect()
	suite.require(near(bar_rect.end.y, game.controls.get_global_rect().position.y - 8.0) and game.play_area_rect().end.y <= bar_rect.position.y - 7.5, "the status line stands on the bar and the scene ends above it (%s)" % bar_rect)
	suite.require(game.is_screen_point_in_ui(bar_rect.get_center()), "a tap on the status line is not a tap on the street")
	game.sheet_bar_toggle.pressed.emit()
	await frames(suite, 3)
	var expanded: Rect2 = game.sheet_bar.get_global_rect()
	suite.require(game.sheet_line_expanded and game.sheet_bar_reader.is_visible_in_tree() and expanded.size.y > bar_rect.size.y + 40.0 and expanded.size.y <= 667.0 * 0.46 + 1.0 and expanded.position.y >= game.hud_bottom(), "Show more reads the whole line up to half the screen (%s)" % expanded)
	game.update_speech_bubble(30.0)
	suite.require(not game.speech_bubble_anchor.is_empty() and game.sheet_bar_visible(), "a line shown more stays until it is shown less")
	game.sheet_bar_toggle.pressed.emit()
	game.update_speech_bubble(30.0)
	await frames(suite, 2)
	suite.require(game.speech_bubble_anchor.is_empty() and not game.sheet_bar_visible() and game.sheet_line_kind == "", "shown less, the line spends its reading time and the status line clears")
	game.show_conversation(0)
	await frames(suite, 3)
	game.update_celebration_burst(4.0)
	game.show_speech_bubble("other-speaker-fixture", game.target, "Another neighbor calls across the street with a long line. ".repeat(12), 20.0)
	game.update_speech_bubble(0.1)
	await frames(suite, 3)
	suite.require(game.block_detail_label.text.contains(game.speech_bubble_text) and not game.sheet_bar_visible() and not game.header_details_expanded, "during a conversation another line reads in its sheet, not stacked above it")
	game.end_conversation()
	await frames(suite, 2)

	# 3. A hint with no one near to say it, and a route that cannot be walked, are status lines with their reading time.
	game.player.position = player0 + Vector3(-40.0, 0.0, 0.0)
	game.follow_player()
	await frames(suite, 3)
	game.ask_whats_next()
	await frames(suite, 2)
	line = game.sheet_snapshot().line
	suite.require(line.visible and line.kind == "hint" and not game.header_details_expanded, "a hint with no one near reads in the status line (%s)" % line.kind)
	game.press_phone_explore()
	await frames(suite, 2)
	suite.require(not game.sheet_bar_visible() and game.sheet_line_text.is_empty() and game.phone_tray.is_visible_in_tree(), "the Explore tray takes the status line's place, and the hint does not come back stale")
	game.press_next_step()
	await frames(suite, 2)
	suite.require(not game.phone_tray_open and game.sheet_bar_visible() and game.sheet_line_kind == "hint", "Next Step over the tray closes it and reads the hint where it stood")
	game.press_phone_explore()
	await frames(suite, 2)
	game.update_celebration_burst(4.0)
	game.show_speech_bubble("tray-fixture", game.target, "A line said while the tray is open, too long for the scene. ".repeat(20), 20.0)
	game.update_speech_bubble(0.1)
	var held_time: float = game.speech_bubble_timer
	game.update_speech_bubble(5.0)
	suite.require(game.speech_bubble_in_sheet and not game.sheet_bar_visible() and is_equal_approx(held_time, game.speech_bubble_timer), "a line the tray hides keeps its reading time (%.1f, was %.1f)" % [game.speech_bubble_timer, held_time])
	game.close_phone_disclosure()
	await frames(suite, 2)
	suite.require(game.sheet_bar_visible() and game.sheet_line_kind == "speech", "the held line reads once the tray closes")
	game.sheet_bar_toggle.grab_focus() # A keyboard player tabs to Show more.
	held_time = game.speech_bubble_timer
	game.update_speech_bubble(5.0)
	suite.require(is_equal_approx(held_time, game.speech_bubble_timer), "keyboard focus on Show more holds the line")
	game.sheet_bar_toggle.pressed.emit()
	game.sheet_bar_toggle.pressed.emit()
	suite.require(game.next_hint_control.has_focus() and not game.sheet_line_expanded, "Show less hands focus back to Next Step")
	game.hide_speech_bubble()
	await frames(suite, 2)
	game.ask_whats_next()
	await frames(suite, 2)
	var tray_font: int = game.hud_bar_font_size()
	suite.require(game.phone_all_actions_control.get_theme_font_size("font_size") == tray_font and game.phone_tray_close.get_theme_font_size("font_size") == tray_font, "the tray's All Actions and Close use the bar's %d px font" % tray_font)
	game.close_phone_disclosure()
	await frames(suite, 2)
	game.update_sheet_line(30.0)
	suite.require(not game.sheet_bar_visible() and game.sheet_line_text.is_empty(), "the hint clears after its reading time")
	suite.require(not game.walk_to_point(Vector2(-350.0, -350.0)), "HUD fixture asks for a point off every street")
	await frames(suite, 2)
	line = game.sheet_snapshot().line
	suite.require(line.visible and line.kind == "status" and String(line.text).begins_with("No walkable") and not String(line.text).contains("©") and not game.header_details_expanded, "a route failure reads in the status line without the sources line ('%s')" % line.text)
	game.update_sheet_line(30.0)

	# 4. A reward with no room above the bar reads in the status line for its own time instead of waiting in Info.
	game.trigger_feel_good_burst("Sheet fixture reward", "Saved progress reads in the status line.", game.target)
	suite.root.size = Vector2i(520, 360)
	await frames(suite, 4)
	var reduction: int = maxi(0, ceili(game.play_area_rect().size.y - game.reward_banner.size.y + 8.0))
	suite.root.size = Vector2i(520, 360 - reduction)
	await frames(suite, 4)
	game.trigger_feel_good_burst("Sheet fixture reward", "Saved progress reads in the status line.", game.target)
	await frames(suite, 2)
	line = game.sheet_snapshot().line
	suite.require(not game.reward_banner.visible and line.kind == "reward" and String(line.text).contains("Sheet fixture reward") and String(line.text).contains("Saved progress") and not game.header_details_expanded, "a reward with no room reads in the status line (%s, area %.0f)" % [line.kind, game.play_area_rect().size.y])
	game.update_sheet_line(30.0)
	game.update_celebration_burst(4.0)
	# 4a. A reward crowded out by an open mural waits, its whole reading time, and is delivered when the mural closes.
	game.sheet_heights.clear()
	game.show_mural_panel(true)
	await frames(suite, 3)
	game.trigger_feel_good_burst("Sheet fixture reward", "Saved progress waits for the mural.", game.target)
	await frames(suite, 3)
	var queued_for: float = game.reward_banner_timer
	game.update_sheet_line(0.0)
	line = game.sheet_snapshot().line
	suite.require(game.sheet_panel() == game.mural_panel and not game.reward_banner.visible and queued_for > 2.5 and line.kind != "reward", "a reward crowded out by the open mural waits for it, not in the status line (%s, %.1f s)" % [line.kind, queued_for])
	game.update_celebration_burst(1.0)
	suite.require(is_equal_approx(game.reward_banner_timer, queued_for), "the waiting reward keeps its whole reading time beside the mural")
	game.end_conversation()
	await frames(suite, 3)
	line = game.sheet_snapshot().line
	suite.require(game.reward_banner.visible or (line.kind == "reward" and String(line.text).contains("waits for the mural")), "closing the mural delivers the waiting reward (%s)" % line.kind)
	game.update_sheet_line(30.0)
	game.update_celebration_burst(4.0)

	# 4b. At eye level a finger on the walk stick keeps it where it was pressed while the status line comes, and it moves
	# above the line once the finger lifts.
	suite.root.size = Vector2i(390, 667)
	await frames(suite, 4)
	var sv = game.street_view
	var touch0: bool = sv.touch_screen
	sv.touch_screen = true
	if not sv.enabled:
		sv.toggle()
	await frames(suite, 3)
	var stick_before: Vector2 = sv.stick.position
	suite.require(sv.active() and sv.stick_visible(), "HUD fixture stands at eye level with the touch stick")
	sv.contacts[0] = {"role": "move", "down": sv.stick.get_global_rect().get_center(), "last": sv.stick.get_global_rect().get_center(), "dragging": false}
	game.show_sheet_line("A route message arrives while the stick is held.", "status")
	await frames(suite, 3)
	suite.require(game.sheet_bar_visible() and sv.stick.position == stick_before, "a held stick stays under the finger as the status line comes (%s, was %s)" % [sv.stick.position, stick_before])
	sv.contacts.clear()
	await frames(suite, 3)
	suite.require(sv.stick.position.y < stick_before.y and sv.stick.get_global_rect().end.y <= game.sheet_bar.get_global_rect().position.y, "released, the stick stands above the status line")
	game.clear_sheet_line()
	if sv.enabled:
		sv.toggle()
	sv.touch_screen = touch0
	await frames(suite, 3)

	# 5. Panels stand on the one-row bar on a desktop, where the old two-row bar left a 60 px gap.
	suite.root.size = Vector2i(1100, 760)
	await frames(suite, 4)
	for kind in ["mural", "music"]:
		if kind == "mural": game.show_mural_panel(true)
		else: game.show_music_panel(true)
		await frames(suite, 3)
		var p: Control = game.mural_panel if kind == "mural" else game.music_panel
		var gap: float = game.controls.get_global_rect().position.y - p.get_global_rect().end.y
		suite.require(p.is_visible_in_tree() and near(gap, 8.0), "the desktop %s panel stands on the bar (gap %.0f px)" % [kind, gap])
		game.end_conversation()
		await frames(suite, 2)

	# 6. Celeste's mural and Rook's music are sheets too: Show less leaves their handle on the bar with Goodbye beside it,
	# each keeps its height for the session, and Next Step shows it more.
	for size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(667, 390)]:
		suite.root.size = size
		await frames(suite, 4)
		for kind in ["mural", "music"]:
			game.sheet_heights.clear()
			if kind == "mural": game.show_mural_panel(true)
			else: game.show_music_panel(true)
			await frames(suite, 3)
			var p: Control = game.mural_panel if kind == "mural" else game.music_panel
			var handle: Button = game.sheet_handle_for(p)
			var body: Control = p.get_meta("sheet_body")
			var snap: Dictionary = game.sheet_snapshot()
			suite.require(snap.mode == kind and snap.height == "half" and handle.is_visible_in_tree() and handle.text == "Show less" and body.is_visible_in_tree() and handle.get_global_rect().size.y >= 44.0, "at %s the %s panel opens at half with its Show less handle" % [size, kind])
			handle.pressed.emit()
			await frames(suite, 3)
			var rect: Rect2 = p.get_global_rect()
			suite.require(game.sheet_snapshot().height == "bar" and not body.is_visible_in_tree() and handle.text == "Show more" and handle.has_focus(), "at %s Show less leaves the %s handle alone, with focus on it" % [size, kind])
			suite.require(game.controls.is_visible_in_tree() and near(rect.end.y, game.controls.get_global_rect().position.y - 8.0) and rect.size.y <= 64.0 and game.walk_control.text == "Goodbye", "at %s the %s strip stands on the bar beside Goodbye (%s)" % [size, kind, rect])
			game.end_conversation()
			await frames(suite, 2)
			if kind == "mural": game.show_mural_panel(true)
			else: game.show_music_panel(true)
			await frames(suite, 3)
			rect = p.get_global_rect()
			suite.require(game.sheet_snapshot().height == "bar" and not body.is_visible_in_tree() and handle.text == "Show more" and near(rect.end.y, game.controls.get_global_rect().position.y - 8.0), "at %s the %s panel reopens shown less, as a strip on the bar" % [size, kind])
			var owner_name := "Celeste" if kind == "mural" else "Rook"
			suite.require(game.sheet_title_for(p).text.begins_with(owner_name + " · Turn"), "at %s the %s strip's title is %s's name ('%s')" % [size, kind, owner_name, game.sheet_title_for(p).text])
			game.press_next_step()
			await frames(suite, 3)
			suite.require(game.sheet_snapshot().height == "half" and body.is_visible_in_tree(), "at %s Next Step shows the %s panel more" % [size, kind])
			game.end_conversation()
			await frames(suite, 2)

	# 5b. On desktop a conversation, the mural and the music are at most 640 px wide, left aligned with the scene, at half
	# and shown less; the hub keeps its full width; under 664 px a sheet spans the screen as before.
	for size in [Vector2i(1100, 760), Vector2i(1440, 900), Vector2i(640, 700)]:
		suite.root.size = size
		await frames(suite, 4)
		var want := minf(640.0, float(size.x) - 24.0)
		for kind in ["talk", "mural", "music"]:
			game.sheet_heights.clear()
			match kind:
				"talk": game.show_conversation(0)
				"mural": game.show_mural_panel(true)
				_: game.show_music_panel(true)
			await frames(suite, 3)
			var sp: Control = game.sheet_panel()
			var half: Rect2 = sp.get_global_rect()
			suite.require(game.hud_size_class() == "desktop" and near(half.position.x, 12.0) and near(half.size.x, want), "at %s the %s sheet at half is %.0f px wide from the left (%s)" % [size, kind, want, half])
			suite.require(near(game.play_area_base_rect().end.y, half.position.y - 8.0), "at %s the scene ends above the %s sheet" % [size, kind])
			var detail: Dictionary = game.activity_detail_snapshot(game.block_detail_label, game.block_panel, game.conv_buttons) if kind == "talk" else (game.activity_detail_snapshot(game.mural_detail_label, game.mural_panel, game.mural_buttons) if kind == "mural" else game.activity_detail_snapshot(game.music_stem_label, game.music_panel, game.music_buttons))
			var clipped: Array = []
			for b in detail.get("buttons", []):
				if b.visible and not b.text_fits: clipped.append(b.text)
			suite.require(clipped.is_empty(), "at %s every %s button's words fit the narrower sheet (%s)" % [size, kind, clipped])
			game.sheet_handle_for(sp).pressed.emit()
			await frames(suite, 3)
			var bar_strip: Rect2 = sp.get_global_rect()
			suite.require(game.sheet_at_bar() and near(bar_strip.position.x, 12.0) and near(bar_strip.size.x, want) and near(bar_strip.end.y, game.controls.get_global_rect().position.y - 8.0), "at %s the %s strip is %.0f px wide on the bar (%s)" % [size, kind, want, bar_strip])
			game.end_conversation()
			await frames(suite, 2)
		if size.x >= 1050:
			# The gathering choice is required and inline: its longest labels must read whole in the narrower sheet.
			var visited_before: Dictionary = game.visited_neighbors.duplicate()
			var layout_before: String = game.gathering_layout
			for n in game.neighbors: game.visited_neighbors[String(n.get("id", ""))] = true
			game.gathering_layout = ""
			game.show_conversation(0)
			await frames(suite, 3)
			var choice_detail: Dictionary = game.activity_detail_snapshot(game.block_detail_label, game.block_panel, game.conv_buttons)
			var cut: Array = []
			var offered := false
			for b in choice_detail.get("buttons", []):
				offered = offered or String(b.text).begins_with("Open Floor")
				if b.visible and not b.text_fits: cut.append(b.text)
			suite.require(String(game.current_objective().get("id", "")) == "layout" and offered and cut.is_empty() and near(game.block_panel.get_global_rect().size.x, 640.0), "at %s the required Long Table and Open Floor choices read whole in the 640 px sheet (%s)" % [size, cut])
			game.end_conversation()
			await frames(suite, 2)
			game.visited_neighbors = visited_before
			game.gathering_layout = layout_before
		game.show_block_panel(true)
		await frames(suite, 3)
		suite.require(game.block_panel_mode == "hub" and near(game.block_panel.get_global_rect().size.x, float(size.x) - 24.0), "at %s the hub keeps the full width (%s)" % [size, game.block_panel.get_global_rect()])
		game.show_block_panel(false)
		await frames(suite, 2)
	game.sheet_heights.clear()

	# 6b. A conversation with Celeste or Rook keeps its own height, apart from their panel's.
	suite.root.size = Vector2i(1100, 760)
	await frames(suite, 4)
	game.sheet_heights.clear()
	game.sheet_heights[String(game.neighbors[game.celeste_index].get("id", ""))] = "bar"
	game.show_mural_panel(true)
	await frames(suite, 3)
	suite.require(game.sheet_snapshot().height == "half", "Celeste's conversation shown less leaves her mural panel at half")
	game.end_conversation()
	await frames(suite, 2)

	# 7. Explore beside a sheet: on landscape and desktop it stays on the bar while a conversation reads, and opening the
	# tray shows the conversation less, its strip standing on the tray on desktop and beside it, on the bar, where a
	# landscape phone docks the tray (Phase 4); on a tall phone the strip leaves Explore its place.
	for size in [Vector2i(1100, 760), Vector2i(667, 390), Vector2i(900, 380), Vector2i(390, 667)]:
		suite.root.size = size
		await frames(suite, 4)
		game.sheet_heights.clear()
		game.show_conversation(0)
		await frames(suite, 3)
		if game.hud_size_class() == "portrait":
			game.sheet_handle_btn.pressed.emit()
			await frames(suite, 3)
		suite.require(game.phone_explore_control.is_visible_in_tree(), "at %s Explore is on the bar beside the conversation" % size)
		game.phone_explore_control.pressed.emit()
		await frames(suite, 3)
		var strip: Rect2 = game.block_panel.get_global_rect()
		var tray: Rect2 = game.phone_tray.get_global_rect()
		suite.require(game.talk_sheet_open() and game.sheet_snapshot().height == "bar" and game.phone_tray.is_visible_in_tree() and game.map_control.is_visible_in_tree(), "at %s Explore shows the conversation less and opens the tray with Map" % size)
		if game.hud_size_class() == "landscape":
			var bar_top: float = game.controls.get_global_rect().position.y
			var scene: Rect2 = game.play_area_rect()
			suite.require(game.phone_tray_docked() and near(tray.size.x, game.side_dock_width()) and near(tray.end.y, bar_top - 8.0) and near(tray.end.x, float(size.x) - 12.0), "at %s the tray stands in the right dock, on the bar (%s)" % [size, tray])
			suite.require(near(strip.end.y, bar_top - 8.0) and near(strip.position.x, 12.0) and near(strip.end.x, tray.position.x - 8.0) and not strip.intersects(tray), "at %s the conversation's strip stands on the bar beside the docked tray (%s beside %s)" % [size, strip, tray])
			suite.require(near(scene.end.x, tray.position.x - 8.0) and near(scene.end.y, strip.position.y - 8.0) and scene.size.y >= 150.0 and scene.size.x >= 250.0, "at %s the scene keeps %.0f x %.0f px beside the tray and above the strip" % [size, scene.size.x, scene.size.y])
			var speaker_at: Vector2 = game.camera.unproject_position(game.neighbors[0].pos)
			suite.require(scene.has_point(speaker_at), "at %s opening the tray re-frames the speaker into the scene beside it (%s in %s)" % [size, speaker_at, scene])
		else:
			suite.require(near(strip.end.y, tray.position.y - 8.0) and not strip.intersects(tray), "at %s the conversation's strip stands on the tray (%s over %s)" % [size, strip, tray])
		game.close_phone_disclosure()
		await frames(suite, 3)
		var back: Rect2 = game.block_panel.get_global_rect()
		suite.require(near(back.end.y, game.controls.get_global_rect().position.y - 8.0) and near(back.size.x, game.sheet_width(game.block_panel)) and not game.phone_tray_docked(), "at %s the strip goes back onto the bar, at its own width, when the tray closes (%s)" % [size, back])
		game.end_conversation()
		await frames(suite, 2)
	# 7b. With nothing open, a landscape phone's tray still stands in the dock and the scene keeps its height beside it.
	for size in [Vector2i(667, 390), Vector2i(900, 380)]:
		suite.root.size = size
		await frames(suite, 4)
		var idle_scene: Rect2 = game.play_area_rect()
		game.press_phone_explore()
		await frames(suite, 3)
		var docked_tray: Rect2 = game.phone_tray.get_global_rect()
		var beside: Rect2 = game.play_area_rect()
		suite.require(game.phone_tray_docked() and near(beside.end.x, docked_tray.position.x - 8.0) and near(beside.size.y, idle_scene.size.y), "at %s the idle tray docks right and the scene keeps its %.0f px height beside it (%s)" % [size, idle_scene.size.y, beside])
		game.close_phone_disclosure()
		await frames(suite, 3)
		suite.require(game.play_area_rect().is_equal_approx(idle_scene), "at %s the scene comes back whole when the tray closes" % size)
	suite.root.size = Vector2i(1100, 760)
	await frames(suite, 4)
	game.sheet_heights.clear()
	game.show_mural_panel(true)
	await frames(suite, 3)
	game.phone_explore_control.pressed.emit()
	await frames(suite, 3)
	var mural_strip: Rect2 = game.mural_panel.get_global_rect()
	suite.require(game.mural_panel.visible and game.sheet_snapshot().height == "bar" and game.phone_tray.is_visible_in_tree() and near(mural_strip.end.y, game.phone_tray.get_global_rect().position.y - 8.0), "Explore beside the mural shows it less, its strip standing on the tray (%s)" % mural_strip)
	game.end_conversation()
	game.close_phone_disclosure()
	await frames(suite, 2)
	suite.root.size = Vector2i(390, 667)
	await frames(suite, 4)
	game.sheet_heights.clear()
	game.show_conversation(0)
	await frames(suite, 3)
	game.press_phone_explore()
	await frames(suite, 2)
	suite.require(game.phone_talking() and not game.phone_tray_open and game.sheet_snapshot().height == "half", "Explore pressed under a tall phone's conversation at half changes nothing")
	game.end_conversation()
	await frames(suite, 2)
	game.sheet_heights.clear()

	# 9. A phone's reader has more than two lines when its panel has the room: Bea's line beside the scene on a landscape
	# phone and Rook's note over a tall phone's bar; and with Explore hidden beside a panel the bar's two buttons share its row.
	for size in [Vector2i(667, 390), Vector2i(900, 380), Vector2i(390, 667)]:
		suite.root.size = size
		await frames(suite, 4)
		game.sheet_heights.clear()
		var kinds: Array = ["talk", "music"] if size.x < size.y else ["talk"]
		for kind in kinds:
			if kind == "talk":
				game.last_panel_dialogue = ""
				game.show_conversation(0)
				game.last_panel_dialogue = "Bea: \"" + "Boeddeker Park is about a block northwest, if you ever want a bench and some trees. ".repeat(3) + "\""
				game.update_block_ui()
			else:
				game.show_music_panel(true)
			await frames(suite, 3)
			var reader: RichTextLabel = game.reader_label_for(game.sheet_panel())
			var font_size: int = reader.get_theme_font_size("normal_font_size")
			var two_lines := ceilf(reader.get_theme_font("normal_font").get_height(font_size) * 2.0 + float(reader.get_theme_constant("line_separation")) + reader.get_theme_stylebox("normal").get_minimum_size().y)
			var sheet: Rect2 = game.sheet_panel().get_global_rect()
			var inside := sheet.position.y >= 0.0 and sheet.end.y <= float(size.y) - 11.0
			if game.phone_talking():
				suite.require(reader.custom_minimum_size.y >= 90.0 and inside, "at %s a tall phone's conversation keeps its reader (%.0f px) on screen" % [size, reader.custom_minimum_size.y])
			else:
				suite.require(reader.custom_minimum_size.y > two_lines + 1.0 and inside, "at %s the %s reader has %.0f px, more than its two lines (%.0f), and the sheet stays on screen (%s)" % [size, kind, reader.custom_minimum_size.y, two_lines, sheet])
				if size.x < size.y:
					suite.require(sheet.size.y <= float(size.y) * 0.62, "at %s the %s sheet at half leaves the scene its top (%.0f px of %d)" % [size, kind, sheet.size.y, size.y])
			if kind == "music":
				var shown: Array = []
				for b in [game.next_hint_control, game.walk_control, game.phone_explore_control]:
					if b.visible: shown.append(b)
				var row: Rect2 = game.controls.get_global_rect()
				suite.require(game.controls.columns == shown.size() and near(shown[shown.size() - 1].get_global_rect().end.x, row.end.x, 2.0) and near(shown[0].get_global_rect().position.x, row.position.x, 2.0), "at %s with Explore hidden the bar's %d buttons share its row (%d columns)" % [size, shown.size(), game.controls.columns])
			game.end_conversation()
			await frames(suite, 2)
		game.sheet_heights.clear()

	# 8. A touch screen has no keyboard: what it reads leaves out the key hints, and keys keep them. A key press turns them back on.
	game.touch_ui_override = 1
	for pair in [["Portable Mural (M)", "Portable Mural"], ["Rook's Speaker (R / K)", "Rook's Speaker"], ["Return Thanh's folding table (Y) · 1/3 returned", "Return Thanh's folding table · 1/3 returned"], ["Open the block party with Bea (O)", "Open the block party with Bea"], ["Tenant circle (Q) and neighborhood short film (.) unlocked", "Tenant circle and neighborhood short film unlocked"], ["Hello  (Click Bea or press T to keep chatting)", "Hello"], ["Goodbye (Esc)", "Goodbye"], ["Spot Surprise (3/10)", "Spot Surprise (3/10)"], ["Walk up to any neighbor (1–5) to talk!", "Walk up to any neighbor to talk!"], ["Walking to Bea · Press Esc to stop", "Walking to Bea · Tap Stop Walking to stop"], ["Spot Pip (2/10 surprises, Shift+D) · Museum (Shift+M)", "Spot Pip (2/10 surprises) · Museum"], ["[*] Small Cutesy Dinosaur (Tap / Shift+D)", "[*] Small Cutesy Dinosaur"], ["Dez: \"Out along Turk, press Shift+D!\"", "Dez: \"Out along Turk!\""], ["Tap the street or use WASD/arrows to walk · T talks to people nearby · G: all block actions", "Tap the street to walk · tap a neighbor to talk"], ["Route blocked
Use WASD/Arrows or tap another street point", "Route blocked
Tap another street point"], ["Compose Mural (F2 or tap the easel) opens", "Compose Mural (tap the easel) opens"]]:
		suite.require(game.phone_text(pair[0]) == pair[1], "on a touch screen '%s' reads '%s' (got '%s')" % [pair[0], pair[1], game.phone_text(pair[0])])
	game.touch_ui_override = 0
	suite.require(game.phone_text("Portable Mural (M)") == "Portable Mural (M)" and game.phone_text("Goodbye (Esc)") == "Goodbye (Esc)", "with keys the hints stay")
	game.touch_ui_override = 1
	for size in [Vector2i(667, 390), Vector2i(390, 667), Vector2i(1100, 760)]:
		suite.root.size = size
		await frames(suite, 4)
		game.last_panel_dialogue = ""
		game.show_conversation(0)
		await frames(suite, 3)
		var spoken: String = game.block_detail_label.text
		suite.require(not spoken.contains("press T") and not spoken.contains("(Click") and not game.conv_chat_btn.text.contains("(T)") and not game.conv_bye_btn.text.contains("(Esc)"), "at %s a touch screen's conversation names no key (%s | %s | %s)" % [size, spoken, game.conv_chat_btn.text, game.conv_bye_btn.text])
		game.end_conversation()
		await frames(suite, 2)
	game.show_sheet_line("Walking to Bea · Press Esc to stop", "status")
	suite.require(game.sheet_line_text == "Walking to Bea · Tap Stop Walking to stop", "a touch screen's status line says what to tap, not Esc (%s)" % game.sheet_line_text)
	game.clear_sheet_line()
	game.touch_ui_override = -1
	game.keyboard_seen = false
	var key_event := InputEventKey.new()
	key_event.keycode = KEY_F13
	key_event.pressed = true
	game._input(key_event)
	suite.require(game.keyboard_seen, "a key press marks the keyboard as in use")
	game.keyboard_seen = false

	suite.root.size = size0
	await frames(suite, 4)
	for key in state:
		game.set(key, state[key])
	game.neighbor_talk_counts = talks0
	game.visited_neighbors = visited0
	game.player.position = player0
	game.clear_sheet_line()
	game.hide_speech_bubble()
	game.update_camera()
	game.show_story_card(game.current_chapter(), true)
	game.startup_story_pending = true
	game.update_music_ui()
	await frames(suite, 3)
	suite.require(game.is_story_card_visible() and not game.block_panel.visible and not game.sheet_bar_visible(), "HUD sheet checks put the startup card back")
