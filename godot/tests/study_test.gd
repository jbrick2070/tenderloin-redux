extends SceneTree
var failed := false

func _initialize() -> void:
	call_deferred("run")

func require(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		push_error(message)

func run() -> void:
	var study = load("res://main.tscn").instantiate()
	root.add_child(study)
	await process_frame
	await process_frame
	await process_frame
	await process_frame
	require(study.meshes.size() == 58, "58 actual building meshes")
	study.choose_next(-1)
	require(study.selected == 57, "first Previous selects last building")
	study.overview()
	require(study.selected == -1 and study.info.text == study.overview_text(), "overview clears selection and restores context")
	for i in range(58):
		var mesh: MeshInstance3D = study.meshes[i]
		require(is_equal_approx(mesh.get_aabb().size.y, study.data.buildings[i].height_m), "mesh height must be measured metres")
		study.choose_next(1)
		require(study.selected == i, "next selects stable source sequence")
		require(study.info.text.contains(study.data.buildings[i].id), "visible selected city ID")
	study.choose_next(1)
	require(study.selected == 0, "next wraps")
	study.choose_next(-1)
	require(study.selected == 57, "previous wraps")
	study.overview()
	for size in [Vector2i(1100, 760), Vector2i(390, 667), Vector2i(320, 667)]:
		root.size = size
		await process_frame
		await process_frame
		await process_frame
		await process_frame
		# Refit must happen on resize itself, not only by a manual test call.
		var bounds: Rect2 = study.projected_bounds()
		var top: float = study.info.get_parent().get_parent().get_global_rect().end.y
		var bottom: float = study.controls.get_global_rect().position.y
		print("FIT_CHECK ", size, " bounds=", bounds, " top=", top, " bottom=", bottom)
		require(bounds.position.x >= 11 and bounds.end.x <= size.x - 11, "overview preserves all footprint edges horizontally")
		require(bounds.position.y >= top and bounds.end.y <= bottom, "overview stays between UI panels")
		for control in study.controls.get_children():
			var r: Rect2 = control.get_global_rect()
			require(r.size.x >= 44 and r.size.y >= 44, "44px minimum controls")
			require(r.position.x >= 0 and r.end.x <= size.x, "buttons within viewport")
			require(r.position.y >= 0 and r.end.y <= size.y, "buttons vertically visible")
		var fitted: float = study.view_size
		study.zoom(1.25)
		require(study.view_size > fitted, "Zoom out from mobile overview must zoom out")
		study.zoom(0.8)
		require(is_equal_approx(study.view_size, fitted), "paired zoom restores fitted size")
		var next: Button = study.controls.get_child(2)
		next.grab_focus()
		require(next.has_focus(), "keyboard focus available")
		var previous_index: int = study.selected
		var accept := InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = true
		Input.parse_input_event(accept)
		await process_frame
		accept = InputEventAction.new()
		accept.action = "ui_accept"
		accept.pressed = false
		Input.parse_input_event(accept)
		await process_frame
		require(study.selected == (previous_index + 1) % 58, "ui_accept press/release activates focused button")
		study.overview()
	if "--force-failure" in OS.get_cmdline_user_args():
		require(false, "harness failure sentinel")
	if failed:
		print("GODOT_STUDY_FAIL")
		quit(1)
	else:
		print("GODOT_STUDY_PASS:58 meshes, measured heights, IDs, first-previous/wrap, overview/refit, zoom, 44px and ui_accept at 1100/390/320")
		quit(0)
