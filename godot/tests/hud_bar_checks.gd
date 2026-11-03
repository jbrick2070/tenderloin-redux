extends RefCounted
## HUD Phase 2 (docs/HUD_REDESIGN_PLAN.md 8): one bottom bar everywhere. At each size class the bar is one row of Next Step,
## the walk button and Explore (44 px on landscape phones, 50 px elsewhere, at the class's font), the Explore tray opens over
## it with 44 px targets, and only desktop has the corner column (Map, Find Me, +, −) at the right edge of the scene under
## the Street view button, clear of the bar, the header, the street controls and the reward note. Next Step is one handler.
## Short landscape walking (the retired verify_short_narrow_walking) keeps the player and YOU in the scene with no camera
## refit of its own. Runs early in the formal suite, after hud_checks, and puts back the startup card and what it touched.

const SIZES := [
	[Vector2i(320, 568), "portrait"], [Vector2i(390, 667), "portrait"], [Vector2i(410, 892), "portrait"],
	[Vector2i(520, 360), "landscape"], [Vector2i(599, 360), "landscape"], [Vector2i(667, 390), "landscape"], [Vector2i(900, 380), "landscape"], [Vector2i(1100, 480), "landscape"],
	[Vector2i(600, 560), "desktop"], [Vector2i(1100, 760), "desktop"], [Vector2i(1600, 900), "desktop"],
]

static func frames(suite: SceneTree, n: int) -> void:
	for _f in range(n):
		await suite.process_frame

static func target_ok(b: Control, size: Vector2i) -> bool:
	var r := b.get_global_rect()
	return b.is_visible_in_tree() and r.size.x >= 44.0 and r.size.y >= 44.0 and Rect2(Vector2.ZERO, Vector2(size)).encloses(r)

static func verify(suite: SceneTree, game: Node) -> void:
	var sv = game.street_view
	var size0: Vector2i = suite.root.size
	var state := {}
	for key in ["following_player", "in_overview", "in_wide_overview", "target", "view_size", "camera_yaw", "camera_pitch_scale", "block_panel_mode", "last_panel_dialogue"]:
		state[key] = game.get(key)
	var player0: Vector3 = game.player.position
	var touch0: bool = sv.touch_screen
	var mouselook0: bool = sv.street_mouselook
	var info0: String = game.info.text
	game.hide_story_card()
	game.startup_story_pending = false
	game.current_path.clear()
	game.set_header_details(false, false)
	await frames(suite, 3)

	# 1. Next Step is one handler wherever it shows: the bar, the objective line and the conversation row.
	for b in [game.next_hint_control, game.objective_btn, game.conv_next_btn]:
		var methods: Array = b.pressed.get_connections().map(func(c): return String(c.callable.get_method()))
		suite.require(methods.has("press_next_step") and not methods.has("press_next_hint") and not methods.has("press_conversation_next"), "%s presses press_next_step (%s)" % [b.name, str(methods)])

	# 2. The bar, the tray and the corner column at each size class.
	var checked := 0
	for entry in SIZES:
		var size: Vector2i = entry[0]
		var kind: String = entry[1]
		suite.root.size = size
		game.close_phone_disclosure()
		game.frame_player_for_walking()
		await frames(suite, 5)
		suite.require(game.hud_size_class() == kind, "%s is the %s size class (%s)" % [size, kind, game.hud_size_class()])
		var bar_h: float = 44.0 if kind == "landscape" else 50.0
		var font: int = {"portrait": 14, "landscape": 13, "desktop": 19}[kind]
		var bar: Array = game.controls.get_children()
		suite.require(game.controls.is_visible_in_tree() and bar == [game.next_hint_control, game.walk_control, game.phone_explore_control], "at %s the bar is Next Step, the walk button and Explore" % size)
		for b in bar:
			suite.require(target_ok(b, size) and b.custom_minimum_size.y == bar_h and b.get_theme_font_size("font_size") == font, "at %s %s is a %d px bar target at %d px (%s, %d px)" % [size, b.text, bar_h, font, str(b.get_global_rect()), b.get_theme_font_size("font_size")])
			suite.require(absf(b.get_global_rect().position.y - bar[0].get_global_rect().position.y) < 0.5, "at %s the bar is one row" % size)
		var bar_rect: Rect2 = game.controls.get_global_rect()
		suite.require(bar_rect.size.y <= bar_h + 26.0 and absf(bar_rect.end.y - (size.y - 12.0)) < 0.5, "at %s the bar is %d px over a 12 px margin (%s)" % [size, bar_h, str(bar_rect)])
		suite.require(game.play_area_rect().end.y <= bar_rect.position.y - 7.5 and game.next_hint_control.text == "Next Step" and game.phone_explore_control.text == "Explore", "at %s the scene ends above the bar and the words are kept" % size)
		var area: Rect2 = game.play_area_rect()
		var tools: Control = game.map_tools
		suite.require(tools.is_visible_in_tree() == (kind == "desktop"), "at %s the corner map tools show only on desktop (%s)" % [size, tools.is_visible_in_tree()])
		if kind == "desktop":
			var texts: Array = game.map_tools_buttons.map(func(t): return t.text)
			var names: Array = game.map_tools_buttons.map(func(t): return String(t.accessibility_name))
			suite.require(texts == ["Map", "Find Me", "+", "−"] and names == ["Tenderloin Map", "Find Me", "Zoom In", "Zoom Out"], "the column reads Map, Find Me, +, − and says the full names (%s %s)" % [str(texts), str(names)])
			var col: Rect2 = tools.get_global_rect()
			suite.require(area.grow(0.5).encloses(col) and absf(col.end.x - area.end.x) < 0.5, "at %s the column stands at the scene's right edge (%s in %s)" % [size, str(col), str(area)])
			for t in game.map_tools_buttons:
				suite.require(target_ok(t, size) and t.focus_mode == Control.FOCUS_ALL and t.has_theme_stylebox_override("focus"), "at %s %s is a 44 px focusable target (%s)" % [size, t.accessibility_name, str(t.get_global_rect())])
			for other in [game.controls, game.header_panel, sv.button, sv.mouselook_btn]:
				suite.require(not other.is_visible_in_tree() or not other.get_global_rect().intersects(col), "at %s the column clears %s" % [size, other.name])
			if sv.button_visible():
				suite.require(col.position.y >= sv.button.get_global_rect().end.y + 7.5, "at %s the column sits under the Street view button" % size)
			suite.require(game.is_screen_point_in_ui(col.get_center()), "a press on the column is not a walk on the street")
		# Explore opens the tray at every size, clear of the bar; the column steps aside for it.
		game.press_phone_explore()
		await frames(suite, 3)
		suite.require(game.phone_tray.is_visible_in_tree() and not game.phone_tray.get_global_rect().intersects(bar_rect) and not tools.is_visible_in_tree(), "at %s Explore opens the tray over the bar and the column hides" % size)
		for b in [game.map_control, game.phone_find_control, game.zoom_in_control, game.zoom_out_control, game.phone_all_actions_control, game.phone_tray_close]:
			suite.require(target_ok(b, size), "at %s the tray's %s is a 44 px target on screen" % [size, b.text])
		game.close_phone_disclosure()
		await frames(suite, 2)
		checked += 1

	# 3. Desktop's column does what the tray does: Map, Find Me, Zoom In and Zoom Out.
	suite.root.size = Vector2i(1100, 760)
	game.frame_player_for_walking()
	await frames(suite, 4)
	var map_tool: Button = game.map_tools_buttons[0]
	map_tool.pressed.emit()
	await frames(suite, 3)
	suite.require(game.in_wide_overview and game.next_hint_control.text == "Back to Me", "the column's Map opens the Tenderloin map and Next Step offers Back to Me")
	game.map_tools_buttons[1].pressed.emit()
	await frames(suite, 3)
	suite.require(game.following_player and not game.in_wide_overview and game.view_size == 45.0, "the column's Find Me frames the player")
	var z: float = game.view_size
	game.map_tools_buttons[2].pressed.emit()
	suite.require(game.view_size < z, "+ zooms in")
	game.map_tools_buttons[3].pressed.emit()
	suite.require(is_equal_approx(game.view_size, z), "− zooms back out")
	suite.require(game.press_is_rapid(game.map_tools_buttons[2]) and game.press_is_rapid(game.map_tools_buttons[3]) and not game.press_is_rapid(map_tool) and not game.press_is_rapid(game.map_tools_buttons[1]), "+ and − repeat in place; Map and Find Me are guarded")
	# A conversation hides Explore; the column stays beside it while the scene above the panel holds it, and never meets it.
	for size in [Vector2i(1100, 760), Vector2i(600, 560)]:
		suite.root.size = size
		game.frame_player_for_walking()
		await frames(suite, 3)
		game.show_conversation(0)
		await frames(suite, 4)
		var col: Rect2 = game.map_tools.get_global_rect()
		suite.require(game.block_panel.visible and not game.phone_explore_control.is_visible_in_tree(), "a conversation on desktop hides Explore at %s" % size)
		suite.require(not game.map_tools.is_visible_in_tree() or (game.play_area_rect().grow(0.5).encloses(col) and not col.intersects(game.block_panel.get_global_rect())), "at %s the column stays clear of the conversation (%s, %s)" % [size, str(col), str(game.block_panel.get_global_rect())])
		if size == Vector2i(1100, 760):
			suite.require(game.map_tools.is_visible_in_tree(), "at 1100x760 Map and zoom stay one click beside a conversation")
		game.end_conversation()
		await frames(suite, 3)

	# 4. Street view at eye level: the column sits under the Street view button and Mouse look (mouse), the stick (touch) stays
	# bottom-left, and none of them meet the bar, the column or each other; the caption lists reserve the column.
	for size in [Vector2i(1100, 760), Vector2i(600, 560), Vector2i(900, 380), Vector2i(667, 390), Vector2i(390, 667)]:
		for touch in [false, true]:
			suite.root.size = size
			sv.touch_screen = touch
			game.frame_player_for_walking()
			await frames(suite, 3)
			if not sv.active():
				sv.toggle()
			await frames(suite, 4)
			suite.require(sv.active(), "street view is active at %s" % size)
			var pieces: Array = []
			for c in [game.controls, game.map_tools, sv.button, sv.mouselook_btn, sv.stick]:
				if c.is_visible_in_tree():
					pieces.append(c)
			for i in range(pieces.size()):
				for j in range(i + 1, pieces.size()):
					suite.require(not pieces[i].get_global_rect().intersects(pieces[j].get_global_rect()), "at eye level at %s (touch %s) %s and %s do not meet (%s, %s)" % [size, touch, pieces[i].name, pieces[j].name, str(pieces[i].get_global_rect()), str(pieces[j].get_global_rect())])
			suite.require(sv.button_visible() and game.map_tools.is_visible_in_tree() == (game.hud_size_class() == "desktop"), "at eye level at %s the Street view button shows, and the column only on desktop" % size)
			if game.map_tools.is_visible_in_tree():
				var col: Rect2 = game.map_tools.get_global_rect()
				var above: Control = sv.mouselook_btn if sv.mouselook_visible() else sv.button
				suite.require(col.position.y >= above.get_global_rect().end.y + 7.5 and sv.occupied_rects().any(func(r): return r.encloses(col)), "at eye level the column sits under %s and is reserved from captions and the arrow" % above.name)
			if touch:
				suite.require(sv.stick_visible(), "the stick still has room at %s (play area %s)" % [size, str(game.play_area_rect())])
			sv.toggle()
			await frames(suite, 3)
	sv.touch_screen = touch0
	sv.street_mouselook = mouselook0

	# 5. The reward note: with the Street view button away (a panned view hides it), a note that reaches the column's place
	# keeps it, and the column steps below the note. (With the button showing, the button steps below the note first.)
	suite.root.size = Vector2i(600, 560)
	game.frame_player_for_walking()
	await frames(suite, 3)
	game.pan_camera_by_screen_delta(Vector2(6.0, 0.0))
	await frames(suite, 2)
	game.trigger_feel_good_burst("Corner check", "A reward note beside the map tools, long enough to reach the corner.", game.player.position)
	await frames(suite, 3)
	var area5: Rect2 = game.play_area_rect()
	var rb: Rect2 = game.reward_banner.get_global_rect() if game.reward_banner.is_visible_in_tree() else Rect2()
	var col5: Rect2 = game.map_tools.get_global_rect()
	suite.require(not sv.button_visible() and rb.has_area() and rb.end.x > area5.end.x - col5.size.x and rb.end.y > area5.position.y + 52.0, "fixture: a panned 600x560 view with a reward note that reaches the column's place (%s, %s)" % [str(rb), str(area5)])
	suite.require(game.map_tools.is_visible_in_tree() and not rb.intersects(col5) and col5.position.y >= rb.end.y + 5.5, "the column steps below the reward note (%s, %s)" % [str(rb), str(col5)])
	game.reward_banner_timer = 0.0
	game.reward_banner.visible = false
	game.celebration_burst_node.visible = false
	await frames(suite, 2)

	# 6. Short landscape walking without its own refit: Find Me, a hub's Close and Map then Find Me keep the enlarged player
	# and YOU inside the scene above the 44 px bar, and captions and the outlined guide leave the player clear.
	var caption_checks := 0
	for size in [Vector2i(520, 360), Vector2i(559, 360), Vector2i(599, 360), Vector2i(599, 480), Vector2i(599, 559), Vector2i(667, 375), Vector2i(900, 380)]:
		suite.root.size = size
		if size == Vector2i(599, 480):
			var stop: Vector2 = game.nearest_street_point(game.comptons_xz()) # Compton's caption stands by the player.
			game.player.position = Vector3(stop.x, 0.0, stop.y)
		else:
			game.player.position = player0
		game.frame_player_for_walking()
		game.objective_label.text = "Chapter 6: Explore the neighborhood · Next: Spot Jeffrey's Lost 1961 Record (0/10 surprises, Shift+D) · Museum (Shift+M)"
		await frames(suite, 5)
		var area: Rect2 = game.play_area_rect()
		print("HUD_BAR_SHORT_WALK ", size, " scene=", area, " body=", game.player_overlay_rect(), " bar=", game.controls.get_global_rect())
		suite.require(area.size.y >= 100.0 and area.grow(1.0).encloses(game.player_overlay_rect()), "at %s Find Me keeps the player and YOU in the scene" % size)
		for caption in game.visible_scene_captions:
			caption_checks += 1
			suite.require(not caption.rect.intersects(game.player_overlay_rect()), "at %s world captions leave the player clear" % size)
		if game.guide_arrow_label.is_visible_in_tree():
			suite.require(not game.guide_arrow_label.get_global_rect().grow(7.0).intersects(game.player_overlay_rect()), "at %s the outlined objective leaves the player clear" % size)
		game.show_block_panel(true)
		await frames(suite, 4)
		game.block_close_btn.pressed.emit()
		await frames(suite, 4)
		suite.require(game.following_player and game.play_area_rect().grow(1.0).encloses(game.player_overlay_rect()), "at %s a hub's Close keeps the player and YOU in the scene" % size)
		game.wide_overview()
		await frames(suite, 3)
		game.frame_player_for_walking()
		await frames(suite, 4)
		suite.require(game.view_size == 45.0 and game.play_area_rect().grow(1.0).encloses(game.player_overlay_rect()), "at %s Map then Find Me keeps the player and YOU in the scene" % size)
	print("HUD_BAR_PASS sizes=", checked, " short_walk_captions=", caption_checks)

	game.info.text = info0
	suite.root.size = size0
	await frames(suite, 4)
	for key in state:
		game.set(key, state[key])
	game.player.position = player0
	game.update_camera()
	game.update_objective_ui()
	game.show_story_card(game.current_chapter(), true)
	game.startup_story_pending = true
	game.update_music_ui()
	await frames(suite, 3)
	suite.require(game.startup_story_pending and game.is_story_card_visible() and not game.block_panel.visible and not game.phone_tray.visible, "HUD bar checks put the startup card back")
