extends RefCounted
## Street view: an optional eye-level camera over the measured block (docs/FIRST_PERSON_PLAN.md, Phase 1).
## One rule decides the camera: street view is active while the player chose it, the map view is
## following the player, nothing is framed, selected or focused, and the player is on the opening
## block. Everything else suspends it and the elevated view renders exactly as before; `follow_player`
## and `frame_player_for_walking` resume it at the player's current position with the saved heading.
## All state here is transient: nothing is saved, and every session starts in the map view.
## Phase 2 (docs/FIRST_PERSON_EXECUTION.md section 2): every mouse or touch contact at eye level takes a role at
## contact-down (look, the walk stick, or ignored); a Control under it has already taken it in the GUI.

const EYE_M := 1.6
const FOV_DEG := 70.0
const NEAR_M := 0.1
const FAR_M := 250.0
const SNAP_TURN_RAD := PI / 6.0 # 30 degrees per Shift+Left/Right press
const PITCH_STEP_RAD := PI / 12.0 # 15 degrees per Shift+Up/Down press
const PITCH_LIMIT_RAD := PI / 3.0
const WEST_LIMIT_X := -50.0 # The fast corridor west of here stays a map-view walk in this phase.
const CAPTION_RANGE_M := 28.0
const BUTTON_SIZE := Vector2(132, 44)
const STICK_SIZE := Vector2(120, 120)
const STICK_KNOB := Vector2(48, 48)
const STICK_DEADZONE := 0.15
const LOOK_DRAG_PX := 8.0 # The map's tap/drag threshold.
const LOOK_YAW_PER_PX := 0.0085 # The map's orbit-drag rates.
const LOOK_PITCH_PER_PX := 0.0035
const MOUSE_CONTACT := -2 # Touch indices start at 0.
const TURN_STEPS := {"snap30": PI / 6.0, "snap45": PI / 4.0}
const SMOOTH_TURN_RAD_PER_S := PI / 2.0 # 90 degrees a second on held Shift+Left/Right.

var game: Node
var enabled := false # The player's choice; suspension is derived, never stored.
var yaw := 0.0
var pitch := 0.0
var was_active := false
var button: Button
var map_near := 0.05
var map_far := 4000.0
var map_background := {}
var has_heading := false
var street_turn := "snap30" # "snap30", "snap45" or "smooth"; the settings envelope carries it from the next work order.
var contacts := {} # contact id (touch index or MOUSE_CONTACT) -> {"role", "down", "last", "dragging"}
var stick: Control
var stick_knob: Panel
var stick_vec := Vector2.ZERO
var touch_screen := false
var taps_routed := 0 # Look contacts released inside the drag threshold; read by the tests.

func setup(g: Node, layer: Node) -> void:
	game = g
	button = Button.new()
	button.name = "StreetViewButton"
	button.text = "Street view"
	button.tooltip_text = "Street view (Shift+F)"
	button.clip_text = true
	button.custom_minimum_size = BUTTON_SIZE
	button.focus_mode = Control.FOCUS_ALL
	button.visible = false
	game.style_game_button(button)
	button.add_theme_font_size_override("font_size", 18)
	button.pressed.connect(toggle)
	layer.add_child(button)
	touch_screen = DisplayServer.is_touchscreen_available()
	stick = Control.new()
	stick.name = "StreetStick"
	stick.size = STICK_SIZE
	stick.mouse_filter = Control.MOUSE_FILTER_IGNORE # Its contact is routed by role in `pointer_input`, never by the GUI.
	stick.visible = false
	var ring := Panel.new()
	ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ring.size = STICK_SIZE
	ring.add_theme_stylebox_override("panel", stick_style(Color(0.06, 0.08, 0.1, 0.42), STICK_SIZE.x * 0.5, 2))
	stick.add_child(ring)
	stick_knob = Panel.new()
	stick_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stick_knob.size = STICK_KNOB
	stick_knob.add_theme_stylebox_override("panel", stick_style(Color(1, 1, 1, 0.72), STICK_KNOB.x * 0.5, 0))
	stick.add_child(stick_knob)
	center_knob()
	layer.add_child(stick)

func stick_style(fill: Color, radius: float, border: int) -> StyleBoxFlat:
	var st := StyleBoxFlat.new()
	st.bg_color = fill
	st.set_corner_radius_all(int(radius))
	st.set_border_width_all(border)
	st.border_color = Color(1, 1, 1, 0.65)
	return st

## The single rule. Any framing function that detaches from the player suspends street view.
func active() -> bool:
	return enabled and game.following_player and not game.in_overview and not game.in_wide_overview and game.selected < 0 and not game.is_focused_activity_visible() and in_block()

func in_block() -> bool:
	if game.player == null or game.player.position.x < WEST_LIMIT_X:
		return false
	if not game.current_path.is_empty() and (game.current_path.back() as Vector2).x < WEST_LIMIT_X:
		return false
	return true

## Apply enter/exit side effects once whenever the rule's answer changes. Idempotent; called from
## `update_camera` so projection is right before anyone unprojects, and every frame for region changes.
func sync() -> bool:
	var now := active()
	if now == was_active:
		return false
	was_active = now
	game.cancel_map_pinch() # Held contacts never carry a pinch or drag across the mode change.
	if now:
		enter()
	else:
		exit()
	return true

func enter() -> void:
	var cam: Camera3D = game.camera
	map_near = cam.near
	map_far = cam.far
	cam.projection = Camera3D.PROJECTION_PERSPECTIVE
	cam.fov = FOV_DEG
	cam.near = NEAR_M
	cam.far = FAR_M
	game.clear_occlusion()
	if game.player_visual != null:
		game.player_visual.visible = false
	if game.player_nameplate != null:
		game.player_nameplate.visible = false
	for n in game.neighbor_nodes:
		if n != null:
			n.scale = Vector3.ONE
	apply_sky(true)
	set_label_depth(true)
	apply_camera()
	game.announce_a11y_status("Street view at eye level. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view." + touch_hint())

func exit() -> void:
	var cam: Camera3D = game.camera
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.near = map_near
	cam.far = map_far
	cam.size = game.view_size
	if game.player_visual != null:
		game.player_visual.visible = true
	for n in game.neighbor_nodes:
		if n != null:
			n.scale = Vector3.ONE * game.CHARACTER_VISUAL_SCALE
	apply_sky(false)
	set_label_depth(false)
	game.announce_a11y_status("Map view." if enabled else "Map view. Street view off.")

## The map view draws every Label3D through walls (`no_depth_test`). At eye level that shows street
## signs and nameplates through buildings, so labels are depth-tested while active and restored on exit.
var label_depth_saved := {}
func set_label_depth(on: bool) -> void:
	if on:
		label_depth_saved = {}
		for label in game.find_children("*", "Label3D", true, false):
			label_depth_saved[label] = label.no_depth_test
			label.no_depth_test = false
		return
	for label in label_depth_saved:
		if is_instance_valid(label):
			label.no_depth_test = label_depth_saved[label]
	label_depth_saved = {}

## Sky and depth fog from spike 0b (docs/first-person-advice/phase0/RESULTS.md); the map view keeps
## its flat background colour, restored exactly on exit.
func apply_sky(on: bool) -> void:
	var env: Environment = game.world_env
	if env == null:
		return
	if on:
		map_background = {"mode": env.background_mode, "color": env.background_color, "sky": env.sky, "fog": env.fog_enabled}
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
		env.fog_mode = Environment.FOG_MODE_DEPTH
		env.fog_light_color = Color("cfdada")
		env.fog_light_energy = 1.0
		env.fog_density = 1.0
		env.fog_depth_begin = 55.0
		env.fog_depth_end = 235.0
		env.fog_depth_curve = 1.0
		env.fog_sky_affect = 0.35
		env.fog_aerial_perspective = 0.0
		env.fog_enabled = true
		return
	if map_background.is_empty():
		return
	env.fog_enabled = bool(map_background["fog"])
	env.background_mode = int(map_background["mode"])
	env.background_color = map_background["color"]
	env.sky = map_background["sky"]
	map_background = {}

## The street branch of `update_camera`: eye above the player, zero roll, target kept on the player.
func apply_camera() -> void:
	var cam: Camera3D = game.camera
	var p: Vector3 = game.player.position
	game.target = p + Vector3.UP
	cam.size = game.view_size
	cam.position = Vector3(p.x, p.y + EYE_M, p.z)
	cam.rotation = Vector3(pitch, yaw, 0.0)
	cam.force_update_transform()

func eye_position() -> Vector3:
	var p: Vector3 = game.player.position
	return Vector3(p.x, p.y + EYE_M, p.z)

func eye_xz() -> Vector2:
	return Vector2(game.player.position.x, game.player.position.z)

func toggle() -> void:
	game.get_viewport().gui_release_focus() # A pressed button must not keep Shift+arrows as focus traversal.
	if active():
		enabled = false
		game.update_camera()
		game.update_occlusion(true)
		game.update_guide_marker()
		refresh_button()
		return
	if not in_block():
		enabled = false
		game.announce_a11y_status("Street view is only on the opening block for now. Walk back east of Taylor Street to use it.")
		return
	enabled = true
	if not has_heading:
		face_objective() # First entry of the session only; later entries keep the heading the player chose.
		has_heading = true
	if game.following_player and not game.in_overview and not game.in_wide_overview and game.selected < 0 and not game.is_focused_activity_visible():
		# Already walking: keep the map's own yaw, pitch and zoom for the return; just hand the camera over.
		game.update_camera()
		game.update_occlusion(true)
		game.update_guide_marker()
	else:
		game.frame_player_for_walking()
	if active():
		game.announce_a11y_status("Street view. Facing %s. %s. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view." % [heading_text(), game.location_phrase(eye_xz())] + touch_hint())
	refresh_button()

## Entering from the map faces the gold marker (or Bea) so the first view is down the street, not a wall.
func face_objective() -> void:
	var goal: Vector3 = game.guide_marker_target if (game.guide_marker != null and game.guide_marker.visible) else (game.neighbors[0].pos if game.neighbors.size() > 0 else Vector3.INF)
	if not is_finite(goal.x):
		return
	var d := Vector2(goal.x, goal.z) - eye_xz()
	if d.length() < 0.5:
		return
	yaw = atan2(-d.x, -d.y)
	pitch = 0.0

func touch_hint() -> String:
	return " Drag the stick at the bottom left to walk; drag anywhere else to look around." if touch_screen else ""

func key_turn(keycode: Key) -> void:
	match keycode:
		KEY_LEFT:
			if street_turn != "smooth":
				turn(1)
		KEY_RIGHT:
			if street_turn != "smooth":
				turn(-1)
		KEY_UP: tilt(1)
		KEY_DOWN: tilt(-1)

## The snap step from the `street_turn` setting; anything unknown snaps 30 degrees.
func turn_step() -> float:
	return float(TURN_STEPS.get(street_turn, SNAP_TURN_RAD))

## Snap turn: positive steps turn left. Keeps the map view's yaw untouched for the return.
func turn(steps: int) -> void:
	yaw = wrapf(yaw + float(steps) * turn_step(), -PI, PI)
	game.update_camera()
	game.announce_a11y_status("Facing %s." % heading_text())

## Held Shift+Left/Right in the smooth setting, from `_physics_process`; `dir` is +1 for right, as in the map's orbit.
func hold_turn(dir: float, delta: float) -> void:
	if street_turn != "smooth" or is_zero_approx(dir):
		return
	var before := heading_text()
	yaw = wrapf(yaw - dir * SMOOTH_TURN_RAD_PER_S * delta, -PI, PI)
	game.update_camera()
	if heading_text() != before:
		game.announce_a11y_status("Facing %s." % heading_text())

func tilt(steps: int) -> void:
	pitch = clampf(pitch + float(steps) * PITCH_STEP_RAD, -PITCH_LIMIT_RAD, PITCH_LIMIT_RAD)
	game.update_camera()

## Smooth look for a right-drag; the same sign convention as `rotate_camera_by_delta`.
func look(delta_yaw: float, delta_pitch: float) -> void:
	yaw = wrapf(yaw + delta_yaw, -PI, PI)
	pitch = clampf(pitch - delta_pitch, -PITCH_LIMIT_RAD, PITCH_LIMIT_RAD)
	game.update_camera()

func forward_xz() -> Vector2:
	return Vector2(-sin(yaw), -cos(yaw))

## Keyboard walking relative to the street heading; pitch never affects walking.
func walk_input(input_vec: Vector2) -> Vector2:
	return input_vec.rotated(-yaw)

func heading_text() -> String:
	var deg := wrapf(rad_to_deg(yaw), 0.0, 360.0)
	var names := ["north", "north-west", "west", "south-west", "south", "south-east", "east", "north-east"]
	return names[int(round(deg / 45.0)) % 8]

## Pixels-per-unit scale at a world point for a perspective camera (the map view uses `camera.size`).
func screen_constant(px_per_unit: float, at: Vector3) -> float:
	var cam: Camera3D = game.camera
	var depth := (at - cam.global_position).dot(-cam.global_basis.z)
	depth = maxf(depth, 0.5)
	var vp_h := maxf(game.bubble_viewport_size().y, 1.0)
	return px_per_unit * 2.0 * depth * tan(deg_to_rad(cam.fov) * 0.5) / vp_h

## 2D line of sight against the building footprints near the segment, using the walking bins.
func line_of_sight_clear(from_xz: Vector2, to_xz: Vector2) -> bool:
	var dir := to_xz - from_xz
	var span := dir.length()
	if span < 1e-3:
		return true
	# Captions sit on facades; stop short so a label's own wall does not hide it.
	var end := to_xz - dir / span * minf(0.8, span * 0.5)
	var bounds := Rect2(from_xz, Vector2.ZERO).expand(end).grow(0.5)
	var seen := {}
	var candidates: Array = []
	var steps := maxi(1, int(ceil(span / float(game.WALK_BUILDING_BIN_M))))
	for i in range(steps + 1):
		for idx in game.walk_building_bins.get(game.walk_building_bin(from_xz.lerp(end, float(i) / float(steps))), []):
			if not seen.has(idx):
				seen[idx] = true
				candidates.append(idx)
	# A caption on or inside its own footprint (shop awnings, the museum hub) is not hidden by that building.
	var own_id: String = game.building_containing_point(to_xz)
	for idx in candidates:
		var rect: Rect2 = game.current_building_rects[idx]
		if not rect.intersects(bounds):
			continue
		var b: Dictionary = game.current_buildings[idx]
		if own_id != "" and String(b.id) == own_id:
			continue
		for polygon in b.polygons:
			for ring in polygon.rings:
				var n: int = ring.size()
				for i in range(n):
					var p0: Array = ring[i]
					var p1: Array = ring[(i + 1) % n]
					if Geometry2D.segment_intersects_segment(from_xz, end, Vector2(p0[0], p0[1]), Vector2(p1[0], p1[1])) != null:
						return false
	return true

func caption_visible(label_xz: Vector2) -> bool:
	var eye := eye_xz()
	return label_xz.distance_to(eye) <= CAPTION_RANGE_M and line_of_sight_clear(eye, label_xz)

## Contact roles, from `_unhandled_input` while active, so a Control under the contact has already taken it. A look
## contact turns the eye once it moves past 8 px and taps the scene when released inside 8 px; a release after a
## drag never routes. One look and one stick contact may coexist in either order; any other contact is ignored, and
## no contact pinches at eye level (`_input` skips `map_pinch_input` while active). Returns true when used here.
func pointer_input(event: InputEvent) -> bool:
	if event is InputEventMouse and event.device == InputEvent.DEVICE_ID_EMULATION:
		return true # Touch contacts carry their own role; their emulated-mouse duplicates never act twice.
	if event is InputEventScreenTouch:
		if event.canceled:
			drop_contact(event.index)
			return true
		return contact_down(event.index, event.position) if event.pressed else contact_up(event.index, event.position)
	if event is InputEventScreenDrag:
		return contact_move(event.index, event.position)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and (event.shift_pressed or event.alt_pressed or event.ctrl_pressed):
			return false # The map's modifier orbit already turns the eye through `rotate_camera_by_delta`.
		return contact_down(MOUSE_CONTACT, event.position) if event.pressed else contact_up(MOUSE_CONTACT, event.position)
	if event is InputEventMouseMotion:
		return contact_move(MOUSE_CONTACT, event.position)
	return false

func has_role(role: String) -> bool:
	for id in contacts:
		if contacts[id].role == role:
			return true
	return false

func contact_down(id: int, pos: Vector2) -> bool:
	drop_contact(id)
	if game.is_screen_point_in_ui(pos) or not game.play_area_rect().has_point(pos):
		return false
	var role := "move" if stick_visible() and stick.get_global_rect().has_point(pos) else "look"
	if contacts.size() >= 2 or has_role(role):
		role = "ignored"
	contacts[id] = {"role": role, "down": pos, "last": pos, "dragging": false}
	if role == "move":
		set_stick(pos)
	return true

func contact_move(id: int, pos: Vector2) -> bool:
	if not contacts.has(id):
		return false
	var c: Dictionary = contacts[id]
	if c.role == "move":
		set_stick(pos)
	elif c.role == "look":
		if not c.dragging and pos.distance_to(c.down) > LOOK_DRAG_PX:
			c.dragging = true
		if c.dragging:
			var d: Vector2 = pos - c.last
			look(-d.x * LOOK_YAW_PER_PX, d.y * LOOK_PITCH_PER_PX)
	c.last = pos
	return true

func contact_up(id: int, pos: Vector2) -> bool:
	if not contacts.has(id):
		return false
	var c: Dictionary = contacts[id]
	drop_contact(id) # Before the tap: a tap that opens a panel flips the mode and clears the roles.
	if c.role == "look" and not c.dragging and pos.distance_to(c.down) <= LOOK_DRAG_PX:
		taps_routed += 1
		game.handle_scene_tap(pos)
	return true

func drop_contact(id: int) -> void:
	if contacts.has(id) and contacts[id].role == "move":
		stick_vec = Vector2.ZERO
		center_knob()
	contacts.erase(id)

## From `cancel_map_pinch`: every mode flip and every focus loss ends the held contacts.
func clear_contacts() -> void:
	contacts.clear()
	stick_vec = Vector2.ZERO
	center_knob()

## The walking vector for `_physics_process`: screen up is forward, deadzone 0.15, length at most 1.
func stick_vector() -> Vector2:
	return stick_vec if has_role("move") else Vector2.ZERO

func set_stick(pos: Vector2) -> void:
	var radius := STICK_SIZE.x * 0.5
	var v := (pos - stick.get_global_rect().get_center()) / radius
	if v.length() > 1.0:
		v = v.normalized()
	stick_vec = v if v.length() >= STICK_DEADZONE else Vector2.ZERO
	stick_knob.position = STICK_SIZE * 0.5 + v * radius - STICK_KNOB * 0.5

func center_knob() -> void:
	if stick_knob != null:
		stick_knob.position = (STICK_SIZE - STICK_KNOB) * 0.5

func stick_visible() -> bool:
	return stick != null and stick.is_visible_in_tree()

## Bottom-left of the play area, only on touchscreens while the eye is active and the area has room for it.
func refresh_stick() -> void:
	if stick == null:
		return
	var show := touch_screen and active()
	if show:
		var area: Rect2 = game.play_area_rect()
		stick.size = STICK_SIZE
		stick.position = Vector2(area.position.x, area.end.y - STICK_SIZE.y)
		show = area.size.x >= STICK_SIZE.x + BUTTON_SIZE.x + 16.0 and area.size.y >= STICK_SIZE.y + BUTTON_SIZE.y + 16.0
	stick.visible = show
	if not show:
		for id in contacts.keys():
			if contacts[id].role == "move":
				drop_contact(id)

## The street button and the stick, for the caption and guide-arrow `occupied` lists.
func occupied_rects() -> Array[Rect2]:
	var rects: Array[Rect2] = []
	if button_visible():
		rects.append(button.get_global_rect().grow(6.0))
	if stick_visible():
		rects.append(stick.get_global_rect().grow(6.0))
	return rects

## Called once per frame from `_process`: region changes, the floating button and the stick.
func tick() -> void:
	if sync():
		game.update_camera() # A rule change outside update_camera (an activity opening, a western route) must not leave the eye pose.
		game.update_occlusion(true)
		if not was_active:
			game.refresh_hub_camera.call_deferred() # A hub that opened while the eye was in charge still gets its fit.
	refresh_button()
	refresh_stick()

func button_visible() -> bool:
	return button != null and button.is_visible_in_tree()

func refresh_button() -> void:
	if button == null:
		return
	var show: bool = game.following_player and not game.in_overview and not game.in_wide_overview and not game.is_focused_activity_visible() and not game.is_story_card_visible() and game.selected < 0 and in_block()
	if not show:
		button.visible = false
		return
	button.text = "Map view" if active() else "Street view"
	var area: Rect2 = game.play_area_rect()
	button.size = BUTTON_SIZE
	button.position = Vector2(area.end.x - BUTTON_SIZE.x, area.position.y)
	button.visible = area.size.x >= BUTTON_SIZE.x + 16.0 and area.size.y >= BUTTON_SIZE.y * 3.0

func snapshot() -> Dictionary:
	var cam: Camera3D = game.camera
	var rect: Rect2 = button.get_global_rect() if button != null else Rect2()
	var stick_rect: Rect2 = stick.get_global_rect() if stick != null else Rect2()
	var roles: Array = []
	for id in contacts:
		roles.append(contacts[id].role)
	return {
		"active": active(),
		"enabled": enabled,
		"yaw_deg": rad_to_deg(yaw),
		"pitch_deg": rad_to_deg(pitch),
		"projection": int(cam.projection) if cam != null else -1,
		"eye": {"x": cam.global_position.x, "y": cam.global_position.y, "z": cam.global_position.z} if cam != null else {},
		"button": {"visible": button_visible(), "text": button.text if button != null else "", "x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y},
		"stick": {"visible": stick_visible(), "x": stick_rect.position.x, "y": stick_rect.position.y, "width": stick_rect.size.x, "height": stick_rect.size.y},
		"turn": street_turn,
		"contacts": roles,
		"taps_routed": taps_routed,
	}
