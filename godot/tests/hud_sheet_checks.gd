extends RefCounted
## HUD Phase 3a (docs/HUD_REDESIGN_PLAN.md 4 and 8): the conversation sheet's two heights with their handle and memory,
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
