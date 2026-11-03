extends RefCounted
## HUD Phase 1 (docs/HUD_REDESIGN_PLAN.md): the four review fixes. The menu's first focus is a row that acts; a short, wide
## window opens the docked hub on the suggested action's page; a hub that fits one page again drops its n/m title; and the
## note and the menu, which layout shows and hides, never come back stale when a focused activity restores the layer.
## Runs first in the formal suite, over the startup card, and restores the progress, size, note, hub and menu it touches.

static func frames(suite: SceneTree, n: int) -> void:
	for _f in range(n):
		await suite.process_frame

static func verify(suite: SceneTree, game: Node) -> void:
	var size0: Vector2i = suite.root.size
	var visited0: Dictionary = game.visited_neighbors.duplicate(true)
	var placements0: Dictionary = game.mural_placements.duplicate(true)
	var layout0: String = game.gathering_layout
	var details0: bool = game.header_details_expanded
	var state := {}
	for key in ["following_player", "in_overview", "in_wide_overview", "target", "view_size", "camera_yaw", "camera_pitch_scale", "block_panel_mode", "block_hub_page", "last_panel_dialogue", "panel_frame_control"]:
		state[key] = game.get(key)
	var player0: Vector3 = game.player.position

	# 1. Over the startup card Music is locked: the menu opens on Sounds, the first row that acts.
	suite.require(game.startup_story_pending and game.music_toggle_btn.disabled, "HUD fixture starts over the startup card with Music locked")
	game.set_menu_open(true)
	await frames(suite, 3)
	var focus: Control = suite.root.gui_get_focus_owner()
	suite.require(focus == game.sounds_btn and not game.sounds_btn.disabled, "the menu over the startup card focuses Sounds, not the locked Music (%s)" % [str(focus.name) if focus != null else "none"])
	game.set_menu_open(false, false)
	await frames(suite, 2)

	# 2. Only a visible hub docks on a short, wide window, so the page is chosen after it shows: the mural's later page.
	for n in game.neighbors:
		game.visited_neighbors[String(n.get("id", ""))] = true
	game.mural_placements.clear()
	game.gathering_layout = "table"
	suite.require(String(game.current_objective().id) == "mural", "HUD fixture makes the mural the objective (%s)" % String(game.current_objective().id))
	suite.root.size = Vector2i(1100, 300)
	await frames(suite, 4)
	game.show_block_panel(true)
	await frames(suite, 3)
	var mural_page: int = game.block_hub_page_of(game.block_mural_btn)
	suite.require(game.uses_side_block_hub() and mural_page > 0, "at 1100x300 the docked hub puts the mural on a later page (%d)" % mural_page)
	suite.require(game.block_hub_page == mural_page and game.block_mural_btn.is_visible_in_tree(), "the docked hub opens on the mural's page %d (on %d)" % [mural_page, game.block_hub_page])
	game.show_block_panel(false)
	await frames(suite, 2)

	# 3. The note under the header costs a row of actions at 390x667: when Hide closes it the hub fits one page again,
	# and the title drops its page count.
	suite.root.size = Vector2i(390, 667)
	await frames(suite, 4)
	game.set_header_details(true, false)
	game.show_block_panel(true)
	await frames(suite, 3)
	var paged_with_note: bool = game.block_action_page_count() > 1
	game.set_header_details(false, false)
	await frames(suite, 3)
	suite.require(paged_with_note and game.block_action_page_count() == 1, "at 390x667 the hub pages only while the note shows")
	suite.require(not game.block_label.text.contains("/"), "the one-page hub's title has no stale page count ('%s')" % game.block_label.text)
	game.show_block_panel(false)
	await frames(suite, 2)
	for n in game.neighbors:
		game.visited_neighbors.erase(String(n.get("id", "")))
	game.visited_neighbors.merge(visited0, true)
	game.mural_placements = placements0
	game.gathering_layout = layout0

	# 4. A focused activity hides every Control in the layer and restores what it saved. The note and the menu sit in
	# always-visible holders, so a note asked for during the activity stays under it, and a menu closed during it stays shut.
	suite.root.size = Vector2i(1100, 760)
	await frames(suite, 4)
	game.hide_story_card()
	await frames(suite, 2)
	var opening = game.before_streets
	game.set_header_details(true, false)
	await frames(suite, 2)
	suite.require(game.info_panel.is_visible_in_tree() and opening.open_opening(), "HUD fixture shows the note and opens Before These Streets")
	await frames(suite, 3)
	suite.require(not game.info_panel.is_visible_in_tree(), "the opening hides the note")
	game.set_header_details(false, false)
	await frames(suite, 2)
	opening.close_opening(false)
	await frames(suite, 4)
	suite.require(not game.info_panel.is_visible_in_tree(), "a note closed during the opening stays closed after it")
	suite.require(opening.open_opening(), "HUD fixture reopens the opening")
	await frames(suite, 3)
	game.set_header_details(true, false)
	suite.root.size = Vector2i(1000, 740)
	await frames(suite, 4)
	suite.require(not game.info_panel.is_visible_in_tree(), "a note asked for during the opening, and a resize, stay under it")
	opening.close_opening(false)
	await frames(suite, 4)
	suite.require(game.info_panel.is_visible_in_tree(), "that note shows once the opening closes")
	game.set_menu_open(true)
	await frames(suite, 2)
	suite.require(opening.open_opening(), "HUD fixture opens the opening over the menu")
	await frames(suite, 3)
	game.set_menu_open(false, false)
	opening.close_opening(false)
	await frames(suite, 4)
	suite.require(not game.menu_open and not game.menu_panel.is_visible_in_tree() and not game.menu_scrim.is_visible_in_tree(), "a menu closed during the opening does not come back with it")

	game.set_header_details(details0, false)
	suite.root.size = size0
	await frames(suite, 4)
	for key in state:
		game.set(key, state[key])
	game.player.position = player0
	game.update_camera()
	game.show_story_card(game.current_chapter(), true)
	game.startup_story_pending = true
	game.update_music_ui()
	await frames(suite, 3)
	suite.require(game.startup_story_pending and game.is_story_card_visible() and game.music_toggle_btn.disabled and not game.menu_open and not game.block_panel.visible, "HUD checks put the startup card back")
