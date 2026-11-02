extends Node
## Phase 0 first-person spike (docs/FIRST_PERSON_PLAN.md, "Phase 0: spikes").
## Throwaway: it lives on the fp-spike-phase0 branch only and is never merged.
## It is inert unless the page URL carries ?spike=<mode> (web) or the engine is
## started with --fp-spike. Modes: look (drag look), lock (Pointer Lock on
## click), walk (autopilot loop for the phone frame-rate test), xr (Enter VR).
## It adds its own perspective camera over the measured block, a procedural
## sky, depth fog and a 250 m far plane, and publishes measurements to
## window.__spike for the browser harness.

const EYE_M := 1.6
const FOV_DEG := 70.0
const FAR_M := 250.0
const WALK_MPS := 4.8
const LOOK_RAD_PER_PX := 0.0035
const PUBLISH_EVERY := 0.25
const WALK_LEG_M := 26.0
const WALK_TURN_S := 1.4

var active := false
var mode := ""
var main: Node = null
var cam: Camera3D
var xr_origin: XROrigin3D
var xr_cam: XRCamera3D
var env: Environment
var yaw := 0.0
var pitch := 0.0
var pos := Vector3.ZERO
var dragging := false
var keys := {}
var touch_look_id := -1
var touch_move_id := -1
var touch_move_origin := Vector2.ZERO
var touch_move_vec := Vector2.ZERO
var lock_requested_msec := -1
var lock_log: Array = []
var last_mouse_mode := -1
var frame_dts: PackedFloat32Array = PackedFloat32Array()
var sample_clock := 0.0
var publish_clock := 0.0
var stats := {}
var focus_state := "in"
var ui: CanvasLayer
var status: Label
var xr_button: Button
var xr: WebXRInterface
var xr_state := {"interface": false, "supported": null, "session": "none", "error": ""}
var auto_walk := false
var auto_leg := 0.0
var auto_turn := 0.0
var auto_target_yaw := 0.0
var lifted := {}

func _ready() -> void:
	mode = requested_mode()
	if mode == "":
		return
	set_process(true)
	call_deferred("wait_for_block")

func requested_mode() -> String:
	if OS.has_feature("web"):
		var search = JavaScriptBridge.eval("location.search", true)
		if typeof(search) == TYPE_STRING:
			for part in String(search).trim_prefix("?").split("&"):
				if part.begins_with("spike="):
					return part.trim_prefix("spike=")
				if part == "spike":
					return "look"
		return ""
	for arg in OS.get_cmdline_user_args():
		if arg == "--fp-spike":
			return "look"
		if arg.begins_with("--fp-spike="):
			return arg.trim_prefix("--fp-spike=")
	return ""

func wait_for_block() -> void:
	# The measured block builds its camera in _ready and settles its overview
	# over a few frames; take over once the player and the camera exist.
	for _i in range(600):
		main = get_tree().current_scene
		if main != null and main.get("camera") != null and main.get("player") != null and main.get("world_env") != null:
			break
		await get_tree().process_frame
	if main == null or main.get("camera") == null:
		push_warning("fp_spike: no block camera; staying inert")
		return
	for _i in range(6):
		await get_tree().process_frame
	activate()

func activate() -> void:
	active = true
	var player: Node3D = main.get("player")
	pos = Vector3(player.position.x, EYE_M, player.position.z)
	yaw = 0.0
	pitch = 0.0
	auto_target_yaw = yaw
	cam = Camera3D.new()
	cam.name = "SpikeEye"
	cam.projection = Camera3D.PROJECTION_PERSPECTIVE
	cam.fov = FOV_DEG
	cam.near = 0.08
	cam.far = FAR_M
	main.add_child(cam)
	cam.current = true
	apply_eye()
	env = main.get("world_env")
	set_sky("procedural")
	set_fog(true)
	for child in main.get_children():
		if child is CanvasLayer:
			child.visible = false
	var visual: Node3D = main.get("player_visual")
	if visual != null:
		visual.visible = false
	var plate: Node3D = main.get("player_nameplate")
	if plate != null:
		plate.visible = false
	build_ui()
	setup_xr()
	auto_walk = mode == "walk"
	if mode == "lock":
		pass # the lock is requested from a real mouse press, never here
	publish(true)

func set_sky(kind: String) -> void:
	if env == null:
		return
	if kind == "color":
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color("c9d6d8")
		env.sky = null
		return
	var sky := Sky.new()
	var mat := ProceduralSkyMaterial.new()
	mat.sky_top_color = Color("3f74a0")
	mat.sky_horizon_color = Color("cfdada")
	mat.sky_curve = 0.12
	mat.ground_bottom_color = Color("4d5f58")
	mat.ground_horizon_color = Color("cfdada")
	mat.ground_curve = 0.05
	mat.sun_angle_max = 25.0
	mat.sun_curve = 0.15
	sky.sky_material = mat
	sky.radiance_size = Sky.RADIANCE_SIZE_64
	env.sky = sky
	env.background_mode = Environment.BG_SKY

func set_fog(on: bool) -> void:
	if env == null:
		return
	env.fog_enabled = on
	if not on:
		return
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = Color("cfdada")
	env.fog_light_energy = 1.0
	env.fog_density = 1.0
	env.fog_depth_begin = 55.0
	env.fog_depth_end = 235.0
	env.fog_depth_curve = 1.0
	env.fog_sky_affect = 0.35
	env.fog_aerial_perspective = 0.0

func build_ui() -> void:
	ui = CanvasLayer.new()
	ui.name = "SpikeUI"
	ui.layer = 90
	add_child(ui)
	status = Label.new()
	status.name = "SpikeStatus"
	status.position = Vector2(10, 10)
	status.add_theme_font_size_override("font_size", 15)
	status.add_theme_color_override("font_color", Color.WHITE)
	status.add_theme_color_override("font_outline_color", Color.BLACK)
	status.add_theme_constant_override("outline_size", 4)
	status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(status)
	xr_button = Button.new()
	xr_button.name = "EnterVR"
	xr_button.text = "Enter VR"
	xr_button.visible = mode == "xr"
	xr_button.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	xr_button.position = Vector2(-150, -70)
	xr_button.custom_minimum_size = Vector2(130, 52)
	xr_button.pressed.connect(_on_enter_vr)
	ui.add_child(xr_button)

func setup_xr() -> void:
	xr_origin = XROrigin3D.new()
	xr_origin.name = "SpikeXROrigin"
	xr_cam = XRCamera3D.new()
	xr_cam.name = "SpikeXRCamera"
	xr_origin.add_child(xr_cam)
	main.add_child(xr_origin)
	xr_origin.position = Vector3(pos.x, 0.0, pos.z)
	var iface := XRServer.find_interface("WebXR")
	if iface == null or not (iface is WebXRInterface):
		xr_state["interface"] = false
		xr_state["error"] = "WebXR interface not found"
		return
	xr = iface
	xr_state["interface"] = true
	xr.session_supported.connect(_on_xr_supported)
	xr.session_started.connect(_on_xr_started)
	xr.session_ended.connect(_on_xr_ended)
	xr.session_failed.connect(_on_xr_failed)
	xr.is_session_supported("immersive-vr")

func _on_xr_supported(session_mode: String, supported: bool) -> void:
	if session_mode == "immersive-vr":
		xr_state["supported"] = supported
		publish(true)

func _on_enter_vr() -> void:
	if xr == null:
		xr_state["error"] = "no interface"
		publish(true)
		return
	xr.session_mode = "immersive-vr"
	xr.requested_reference_space_types = "bounded-floor, local-floor, local"
	xr.required_features = "local-floor"
	xr.optional_features = "bounded-floor"
	xr_state["session"] = "requesting"
	xr_state["error"] = ""
	if not xr.initialize():
		xr_state["session"] = "init-failed"
		xr_state["error"] = "initialize() returned false"
	publish(true)

func _on_xr_started() -> void:
	xr_state["session"] = "started"
	xr_state["reference_space"] = xr.reference_space_type
	xr_origin.position = Vector3(pos.x, 0.0, pos.z)
	xr_origin.rotation = Vector3(0.0, yaw, 0.0)
	xr_origin.current = true
	xr_cam.current = true
	get_viewport().use_xr = true
	publish(true)

func _on_xr_ended() -> void:
	xr_state["session"] = "ended"
	get_viewport().use_xr = false
	cam.current = true
	publish(true)

func _on_xr_failed(message: String) -> void:
	xr_state["session"] = "failed"
	xr_state["error"] = message
	get_viewport().use_xr = false
	cam.current = true
	publish(true)

func log_lock(event: String, extra: Dictionary = {}) -> void:
	var entry := {"t": Time.get_ticks_msec(), "event": event, "mouse_mode": Input.mouse_mode}
	if lock_requested_msec >= 0:
		entry["since_request_ms"] = Time.get_ticks_msec() - lock_requested_msec
	entry.merge(extra)
	lock_log.append(entry)
	while lock_log.size() > 60:
		lock_log.pop_front()

func request_lock() -> void:
	lock_requested_msec = Time.get_ticks_msec()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	log_lock("request", {"mode_after_set": Input.mouse_mode})

func release_lock() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	log_lock("release")

func _input(event: InputEvent) -> void:
	if not active:
		return
	var handled := false
	if event is InputEventKey:
		var key := event as InputEventKey
		if key.keycode == KEY_ESCAPE:
			log_lock("esc_key_down" if key.pressed else "esc_key_up", {"echo": key.echo})
			if key.pressed and not key.echo and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
				release_lock()
			handled = true
		elif key.keycode in [KEY_W, KEY_A, KEY_S, KEY_D, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_Q, KEY_E]:
			keys[key.keycode] = key.pressed
			handled = true
		elif key.pressed and not key.echo:
			if key.keycode == KEY_P:
				mode = "look" if mode == "lock" else "lock"
				if mode == "look" and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
					release_lock()
				handled = true
			elif key.keycode == KEY_G:
				set_fog(not env.fog_enabled)
				handled = true
			elif key.keycode == KEY_V:
				_on_enter_vr()
				handled = true
	elif event is InputEventMouseMotion:
		var motion := event as InputEventMouseMotion
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			look(motion.screen_relative)
			handled = true
		elif dragging:
			look(motion.relative)
			handled = true
	elif event is InputEventMouseButton:
		var button := event as InputEventMouseButton
		if button.button_index == MOUSE_BUTTON_LEFT:
			if button.pressed:
				if mode == "lock" and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
					request_lock()
				else:
					dragging = true
			else:
				dragging = false
			handled = true
	elif event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		var left_half: bool = touch.position.x < get_viewport().get_visible_rect().size.x * 0.5
		if touch.pressed:
			if left_half and touch_move_id < 0:
				touch_move_id = touch.index
				touch_move_origin = touch.position
				touch_move_vec = Vector2.ZERO
			elif touch_look_id < 0:
				touch_look_id = touch.index
		else:
			if touch.index == touch_move_id:
				touch_move_id = -1
				touch_move_vec = Vector2.ZERO
			if touch.index == touch_look_id:
				touch_look_id = -1
		handled = true
	elif event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		if drag.index == touch_look_id:
			look(drag.relative)
		elif drag.index == touch_move_id:
			touch_move_vec = (drag.position - touch_move_origin) / 70.0
			touch_move_vec = touch_move_vec.limit_length(1.0)
		handled = true
	if handled:
		get_viewport().set_input_as_handled()

func look(rel: Vector2) -> void:
	yaw = wrapf(yaw - rel.x * LOOK_RAD_PER_PX, -PI, PI)
	pitch = clampf(pitch - rel.y * LOOK_RAD_PER_PX, deg_to_rad(-80.0), deg_to_rad(80.0))

func _notification(what: int) -> void:
	if not active:
		return
	match what:
		NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_WM_WINDOW_FOCUS_OUT:
			focus_state = "out"
			keys.clear()
			dragging = false
			log_lock("focus_out")
		NOTIFICATION_APPLICATION_FOCUS_IN, NOTIFICATION_WM_WINDOW_FOCUS_IN:
			focus_state = "in"
			log_lock("focus_in")

func _process(delta: float) -> void:
	if not active:
		return
	var mm := Input.mouse_mode
	if mm != last_mouse_mode:
		if last_mouse_mode >= 0:
			log_lock("mouse_mode_changed", {"from": last_mouse_mode, "to": mm})
		last_mouse_mode = mm
	frame_dts.append(delta)
	sample_clock += delta
	if sample_clock >= 1.0:
		summarize_frames()
		sample_clock = 0.0
		frame_dts = PackedFloat32Array()
	move(delta)
	apply_eye()
	poll_commands()
	publish_clock += delta
	if publish_clock >= PUBLISH_EVERY:
		publish_clock = 0.0
		publish(false)

func summarize_frames() -> void:
	var n := frame_dts.size()
	if n == 0:
		return
	var sorted := frame_dts.duplicate()
	sorted.sort()
	var total := 0.0
	for d in sorted:
		total += d
	var avg_ms := total / n * 1000.0
	var p95_ms := sorted[mini(n - 1, int(floor(n * 0.95)))] * 1000.0
	var worst_ms := sorted[n - 1] * 1000.0
	stats = {
		"frames": n,
		"fps_avg": snappedf(1000.0 / maxf(avg_ms, 0.001), 0.1),
		"frame_ms_avg": snappedf(avg_ms, 0.01),
		"frame_ms_p95": snappedf(p95_ms, 0.01),
		"frame_ms_worst": snappedf(worst_ms, 0.01),
		"process_ms": snappedf(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, 0.01),
		"physics_ms": snappedf(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0, 0.01),
		"draw_calls": int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)),
		"primitives": int(Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)),
		"objects_drawn": int(Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME)),
		"video_mem_mb": snappedf(Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0, 0.1),
	}

func move(delta: float) -> void:
	var fwd := Vector3(-sin(yaw), 0.0, -cos(yaw))
	var right := Vector3(cos(yaw), 0.0, -sin(yaw))
	var wish := Vector3.ZERO
	if auto_walk:
		if auto_turn > 0.0:
			auto_turn -= delta
			var t := 1.0 - clampf(auto_turn / WALK_TURN_S, 0.0, 1.0)
			yaw = lerp_angle(auto_target_yaw + PI * 0.5, auto_target_yaw, t)
			if auto_turn <= 0.0:
				yaw = auto_target_yaw
				auto_leg = 0.0
		else:
			wish = fwd
			auto_leg += WALK_MPS * delta
			if auto_leg >= WALK_LEG_M:
				auto_target_yaw = wrapf(yaw - PI * 0.5, -PI, PI)
				auto_turn = WALK_TURN_S
	else:
		if keys.get(KEY_W, false) or keys.get(KEY_UP, false):
			wish += fwd
		if keys.get(KEY_S, false) or keys.get(KEY_DOWN, false):
			wish -= fwd
		if keys.get(KEY_D, false):
			wish += right
		if keys.get(KEY_A, false):
			wish -= right
		if keys.get(KEY_RIGHT, false) or keys.get(KEY_E, false):
			yaw = wrapf(yaw - 1.6 * delta, -PI, PI)
		if keys.get(KEY_LEFT, false) or keys.get(KEY_Q, false):
			yaw = wrapf(yaw + 1.6 * delta, -PI, PI)
		if touch_move_id >= 0:
			wish += fwd * -touch_move_vec.y + right * touch_move_vec.x
	if wish.length_squared() > 1.0:
		wish = wish.normalized()
	pos += wish * WALK_MPS * delta
	pos.y = EYE_M

func apply_eye() -> void:
	if cam == null:
		return
	cam.position = pos
	cam.rotation = Vector3(pitch, yaw, 0.0)

func poll_commands() -> void:
	if not OS.has_feature("web"):
		return
	var raw = JavaScriptBridge.eval("(function(){var c=window.__spikeCmd;window.__spikeCmd=null;return c?JSON.stringify(c):'';})()", true)
	if typeof(raw) != TYPE_STRING or String(raw) == "":
		return
	var parsed = JSON.parse_string(String(raw))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var cmd: Dictionary = parsed
	if cmd.has("yaw_deg"):
		yaw = wrapf(deg_to_rad(float(cmd["yaw_deg"])), -PI, PI)
		auto_target_yaw = yaw
	if cmd.has("pitch_deg"):
		pitch = clampf(deg_to_rad(float(cmd["pitch_deg"])), deg_to_rad(-80.0), deg_to_rad(80.0))
	if cmd.has("x"):
		pos.x = float(cmd["x"])
	if cmd.has("z"):
		pos.z = float(cmd["z"])
	if cmd.has("fog"):
		set_fog(bool(cmd["fog"]))
	if cmd.has("sky"):
		set_sky(String(cmd["sky"]))
	if cmd.has("far"):
		cam.far = float(cmd["far"])
	if cmd.has("fov"):
		cam.fov = float(cmd["fov"])
	if cmd.has("mode"):
		mode = String(cmd["mode"])
		auto_walk = mode == "walk"
		xr_button.visible = mode == "xr"
	if cmd.has("auto"):
		auto_walk = bool(cmd["auto"])
	if cmd.has("release") and bool(cmd["release"]):
		release_lock()
	if cmd.has("lift"):
		lift_named(String(cmd.get("lift_prefix", "")), float(cmd["lift"]))
	if cmd.has("list"):
		var names: Array = []
		for child in main.get_children():
			if child is MeshInstance3D or child is MultiMeshInstance3D or child is Node3D:
				names.append("%s:%s" % [child.get_class(), child.name])
		stats["children"] = names
	if cmd.has("hide_ui"):
		ui.visible = not bool(cmd["hide_ui"])
	if cmd.has("xr"):
		_on_enter_vr()
	publish(true)

func lift_named(prefix: String, dy: float) -> void:
	# Depth-fighting test: raise the ribbon meshes a hair above the ground plane.
	for child in main.get_children():
		if child is Node3D and (prefix == "" or String(child.name).begins_with(prefix)):
			var key := String(child.name)
			var base: float = lifted.get(key, (child as Node3D).position.y)
			lifted[key] = base
			(child as Node3D).position.y = base + dy

func publish(force: bool) -> void:
	var payload := {
		"active": active,
		"mode": mode,
		"mouse_mode": Input.mouse_mode,
		"focus": focus_state,
		"pos": [snappedf(pos.x, 0.01), snappedf(pos.y, 0.01), snappedf(pos.z, 0.01)],
		"yaw_deg": snappedf(rad_to_deg(yaw), 0.1),
		"pitch_deg": snappedf(rad_to_deg(pitch), 0.1),
		"fov": cam.fov if cam != null else 0.0,
		"far": cam.far if cam != null else 0.0,
		"fog": env.fog_enabled if env != null else false,
		"sky": env.background_mode if env != null else -1,
		"stats": stats,
		"lock_log": lock_log,
		"xr": xr_state,
		"renderer": RenderingServer.get_current_rendering_method(),
		"adapter": RenderingServer.get_video_adapter_name(),
		"viewport": [get_viewport().get_visible_rect().size.x, get_viewport().get_visible_rect().size.y],
		"ticks": Time.get_ticks_msec(),
	}
	if status != null:
		var s := stats
		status.text = "FP spike [%s]  %s fps  %s ms avg  %s ms p95  %s draws\nmouse_mode=%d  yaw %.0f°  pos %.1f,%.1f  fog=%s\nWASD/arrows move · drag or lock (P) to look · G fog · Esc releases · V VR" % [
			mode, str(s.get("fps_avg", "–")), str(s.get("frame_ms_avg", "–")), str(s.get("frame_ms_p95", "–")), str(s.get("draw_calls", "–")),
			Input.mouse_mode, rad_to_deg(yaw), pos.x, pos.z, str(env.fog_enabled if env != null else false)]
		if xr_state["interface"]:
			status.text += "\nWebXR immersive-vr supported=%s session=%s %s" % [str(xr_state["supported"]), xr_state["session"], xr_state["error"]]
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.__spike=" + JSON.stringify(payload) + ";", true)
	elif force:
		print("fp_spike ", JSON.stringify(payload))
