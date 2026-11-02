extends RefCounted
## Street view: an optional eye-level camera over the measured block (docs/FIRST_PERSON_PLAN.md, Phase 1).
## One rule decides the camera: street view is active while the player chose it, the map view is
## following the player, nothing is framed, selected or focused, and the player is on the opening
## block. Everything else suspends it and the elevated view renders exactly as before; `follow_player`
## and `frame_player_for_walking` resume it at the player's current position with the saved heading.
## All state here is transient: nothing is saved, and every session starts in the map view.

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
	apply_camera()
	game.announce_a11y_status("Street view at eye level. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view.")

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
	game.announce_a11y_status("Map view." if enabled else "Map view. Street view off.")

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
	game.frame_player_for_walking()
	if active():
		game.announce_a11y_status("Street view at eye level. %s. Shift+F returns to the map view." % game.location_phrase(eye_xz()))
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

func key_turn(keycode: Key) -> void:
	match keycode:
		KEY_LEFT: turn(1)
		KEY_RIGHT: turn(-1)
		KEY_UP: tilt(1)
		KEY_DOWN: tilt(-1)

## Snap turn: positive steps turn left. Keeps the map view's yaw untouched for the return.
func turn(steps: int) -> void:
	yaw = wrapf(yaw + float(steps) * SNAP_TURN_RAD, -PI, PI)
	game.update_camera()
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
	for idx in candidates:
		var rect: Rect2 = game.current_building_rects[idx]
		if not rect.intersects(bounds):
			continue
		var b: Dictionary = game.current_buildings[idx]
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

## Called once per frame from `_process`: region changes and the floating button.
func tick() -> void:
	if sync():
		game.update_camera() # A rule change outside update_camera (an activity opening, a western route) must not leave the eye pose.
	refresh_button()

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
	return {
		"active": active(),
		"enabled": enabled,
		"yaw_deg": rad_to_deg(yaw),
		"pitch_deg": rad_to_deg(pitch),
		"projection": int(cam.projection) if cam != null else -1,
		"eye": {"x": cam.global_position.x, "y": cam.global_position.y, "z": cam.global_position.z} if cam != null else {},
		"button": {"visible": button_visible(), "text": button.text if button != null else "", "x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y},
	}
