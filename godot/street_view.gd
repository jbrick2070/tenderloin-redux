extends RefCounted
## Street view: an optional eye-level camera over the measured block (docs/FIRST_PERSON_PLAN.md, Phase 1).
## One rule decides the camera: street view is active while the player chose it, the map view is
## following the player, nothing is framed, selected or focused, and the player is on the opening
## block. Everything else suspends it and the elevated view renders exactly as before; `follow_player`
## and `frame_player_for_walking` resume it at the player's current position with the saved heading.
## The eye's state is transient: mode, heading and pitch are never saved, and every session starts in the map view.
## Phase 2 (docs/FIRST_PERSON_EXECUTION.md section 2): every mouse or touch contact at eye level takes a role at
## contact-down (look, the walk stick, or ignored); a Control under it has already taken it in the GUI.
## Settings (work orders 5-7): the field of view, the turn step, mouse look and reduced motion are the only saved
## state, as optional keys in the v1 settings envelope, written only when they differ from the defaults.
## Mouse look (work order 4) is opt-in: with the "Mouse look" toggle on, a left press on the street asks for the
## pointer lock from inside the press handler, and `capture_state` follows the browser's answer frame by frame. The
## capture ends with every suspension (`exit`), focus loss and Esc, and is never asked for again without a new press.

const EYE_M := 1.6
const FOV_DEG := 70.0
const NEAR_M := 0.1
const SHOULDER_RANGE_M := 2.0 # Nearer than this, a neighbor ahead has the eye step back over the shoulder.
const SHOULDER_MAX_M := 1.0
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
const FOV_MIN_DEG := 60
const FOV_MAX_DEG := 90
const DEFAULT_TURN := "snap30"
const CAPTURE_WAIT_FRAMES := 10 # A pointer lock not granted within this many frames counts as refused.
const ESC_GRACE_FRAMES := 10 # The browser may drop the lock just before its Esc reaches the game.
const BANNER_PX := 18.0 # Street-name banners at eye level: about this many pixels tall, like a readable caption.
const BANNER_RANGE_M := 45.0
const MURAL_LABEL_EYE_Y := 2.4 # The mural board's caption sits at 4.1 m for the map; at eye level just above the board.
const BODY_TOP_M := 1.75 # A neighbour at true scale, for eye-level taps.
const BODY_HALF_WIDTH_M := 0.35

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
var street_turn := DEFAULT_TURN # "snap30", "snap45" or "smooth"; saved as `street_turn`.
var street_fov := int(FOV_DEG) # Degrees, 60-90: vertical in landscape, horizontal in portrait; saved as `street_fov`.
var street_mouselook := false # Opt-in mouse capture (work order 4); saved as `street_mouselook`.
var map_keep_aspect := Camera3D.KEEP_HEIGHT
## Reduced motion helps the map view too: the system preference seeds it once at startup on web, and the player's
## choice in the menu is saved as an override until "Use system setting" clears it.
var reduced_motion := false
var reduced_motion_saved := false # True only while the player's own choice overrides the system preference.
var reduced_motion_system := false
var motion_btn: Button
var contacts := {} # contact id (touch index or MOUSE_CONTACT) -> {"role", "down", "last", "dragging"}
var stick: Control
var stick_knob: Panel
var stick_vec := Vector2.ZERO
var stick_placed_for := Vector2.ZERO # The viewport the stick was last placed in.
var touch_screen := false
var taps_routed := 0 # Look contacts released inside the drag threshold; read by the tests.
var mouselook_btn: Button
var capture_state := "released" # "requested", "locked", "denied" or "released"; transient, never saved.
var capture_wait := 0 # Frames since the request.
var capture_requests := 0 # Requests made this session; read by the tests, and nothing is polled before the first.
var capture_dropped_frame := -1 # When the browser last dropped a lock, for the Esc that dropped it.
## Tests only: when >= 0 this stands in for `Input.mouse_mode`, since a headless run has no pointer lock. A grant
## arrives when the test sets it to captured; a release writes it at once.
var mouse_mode_override := -1

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
	mouselook_btn = Button.new()
	mouselook_btn.name = "MouseLookToggle"
	mouselook_btn.tooltip_text = "Mouse look: when on, click the street to steer the view with the mouse. Esc releases the mouse."
	mouselook_btn.toggle_mode = true
	mouselook_btn.clip_text = true
	mouselook_btn.custom_minimum_size = BUTTON_SIZE
	mouselook_btn.focus_mode = Control.FOCUS_ALL
	mouselook_btn.visible = false
	game.style_game_button(mouselook_btn)
	mouselook_btn.add_theme_font_size_override("font_size", 14)
	mouselook_btn.pressed.connect(func(): set_mouselook(not street_mouselook))
	layer.add_child(mouselook_btn)
	refresh_mouselook_button()
	touch_screen = DisplayServer.is_touchscreen_available()
	stick = Control.new()
	stick.name = "StreetStick"
	stick.size = STICK_SIZE
	stick.mouse_filter = Control.MOUSE_FILTER_IGNORE # Its contact is routed by role in `pointer_input`, never by the GUI.
	stick.accessibility_name = "Walk stick"
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
	reduced_motion_system = system_reduced_motion()
	reduced_motion = reduced_motion_system

## Read once at startup; native builds and the tests have no system preference.
func system_reduced_motion() -> bool:
	if not OS.has_feature("web"):
		return false
	# Ask for a string: a JS boolean did not come back through the bridge as a GDScript bool (the playtest saw
	# matchMedia report true while this read false), and strings cross it reliably, as the localStorage reads do.
	var v: Variant = JavaScriptBridge.eval("try { window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference'; } catch (_e) { 'no-preference'; }", true)
	return String(v) == "reduce"

## Reduced motion is a menu row. It cycles the system setting, on and off; "System" clears the saved choice.
func setup_motion_button(parent: Control) -> void:
	motion_btn = Button.new()
	motion_btn.name = "ReducedMotionToggle"
	motion_btn.tooltip_text = "Reduced motion stills the swaying trees, the bobbing speech bubble, the spinning guide marker and the burst's spin. Press to cycle: system setting, on, off."
	motion_btn.focus_mode = Control.FOCUS_ALL
	game.style_game_button(motion_btn)
	motion_btn.pressed.connect(cycle_reduced_motion)
	parent.add_child(motion_btn)
	refresh_motion_controls()

## System -> the opposite of the system -> the same as the system -> System again.
func cycle_reduced_motion() -> void:
	if not reduced_motion_saved:
		set_reduced_motion(not reduced_motion_system)
	elif reduced_motion != reduced_motion_system:
		set_reduced_motion(reduced_motion_system)
	else:
		use_system_motion()

func set_reduced_motion(on: bool, persist := true) -> void:
	reduced_motion = on
	reduced_motion_saved = true
	refresh_motion_controls()
	if persist:
		game.save_godot_settings()
		game.announce_a11y_status("Reduced motion %s." % ("on" if on else "off"))

## The "System" step of the cycle: clears the saved choice.
func use_system_motion(persist := true) -> void:
	reduced_motion = reduced_motion_system
	reduced_motion_saved = false
	refresh_motion_controls()
	if persist:
		game.save_godot_settings()
		game.announce_a11y_status("Reduced motion follows the system setting: %s." % ("on" if reduced_motion else "off"))

func motion_state_text() -> String:
	if not reduced_motion_saved:
		return "System (%s)" % ("on" if reduced_motion else "off")
	return "On" if reduced_motion else "Off"

func refresh_motion_controls() -> void:
	if motion_btn == null:
		return
	motion_btn.text = "Reduced motion: %s" % motion_state_text()
	motion_btn.accessibility_name = "Reduced motion: %s" % motion_state_text()

## Optional settings keys, only those that differ from the defaults, so an untouched envelope keeps its old bytes.
func settings_fields() -> Dictionary:
	var out := {}
	if reduced_motion_saved:
		out["reduced_motion"] = reduced_motion
	if street_fov != int(FOV_DEG):
		out["street_fov"] = street_fov
	if street_turn != DEFAULT_TURN:
		out["street_turn"] = street_turn
	if street_mouselook:
		out["street_mouselook"] = true
	return out

## Each key is validated on its own; a missing or invalid key keeps its default.
func apply_settings(env: Dictionary) -> void:
	reset_settings()
	var rm: Variant = env.get("reduced_motion", null)
	if rm is bool:
		reduced_motion = bool(rm)
		reduced_motion_saved = true
	var fov: Variant = env.get("street_fov", null)
	if game.is_whole_json_number(fov) and float(fov) >= FOV_MIN_DEG and float(fov) <= FOV_MAX_DEG:
		street_fov = int(roundf(float(fov)))
	var turn_val: Variant = env.get("street_turn", null)
	if turn_val is String and (String(turn_val) == "smooth" or TURN_STEPS.has(String(turn_val))):
		street_turn = String(turn_val)
	var ml: Variant = env.get("street_mouselook", null)
	if ml is bool:
		street_mouselook = bool(ml)
	refresh_motion_controls()
	refresh_mouselook_button()
	if active():
		game.update_camera()

func reset_settings() -> void:
	street_fov = int(FOV_DEG)
	street_turn = DEFAULT_TURN
	street_mouselook = false
	reduced_motion = reduced_motion_system
	reduced_motion_saved = false
	refresh_motion_controls()
	release_capture()
	refresh_mouselook_button()

func stick_style(fill: Color, radius: float, border: int) -> StyleBoxFlat:
	var st := StyleBoxFlat.new()
	st.bg_color = fill
	st.set_corner_radius_all(int(radius))
	st.set_border_width_all(border)
	st.border_color = Color(1, 1, 1, 0.65)
	return st

## The single rule. Any framing function that detaches from the player suspends street view.
func active() -> bool:
	# The hub suspends the eye while it is open (it resumes when the panel closes), so its buttons, the walk stick and the
	# eye-level labels never pile up on one screen. A conversation, the mural and the music keep it while the scene above
	# or beside their sheet is still readable (eye_yields_to_panel).
	return enabled and game.following_player and not game.in_overview and not game.in_wide_overview and game.selected < 0 and not game.is_focused_activity_visible() and not game.eye_yields_to_panel() and in_block()

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
		return true
	# Walking west of Taylor Street turns street view off, once: suspending there would let the map's own heading
	# walk a held W back east and re-enter it, flipping the camera many times a second. A route to the west still
	# only suspends it (the eye returns when the route stops), since the player did not walk there by hand.
	var left_block: bool = enabled and game.player != null and game.player.position.x < WEST_LIMIT_X
	if left_block:
		enabled = false
	exit()
	if left_block:
		game.announce_a11y_status("Map view. Street view is only on the opening block for now. Walk back east of Taylor Street and press Shift+F to use it again.")
	return true

func enter() -> void:
	var cam: Camera3D = game.camera
	map_near = cam.near
	map_far = cam.far
	map_keep_aspect = cam.keep_aspect
	cam.projection = Camera3D.PROJECTION_PERSPECTIVE
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
	set_banners(true)
	apply_camera()
	game.announce_a11y_status("Street view at eye level. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view." + touch_hint())

func exit() -> void:
	release_capture() # Every panel, map and activity suspends the eye, so the mouse is free before any of them.
	var cam: Camera3D = game.camera
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.near = map_near
	cam.far = map_far
	cam.keep_aspect = map_keep_aspect
	cam.size = game.view_size
	if game.player_visual != null:
		game.player_visual.visible = true
	for n in game.neighbor_nodes:
		if n != null:
			n.scale = Vector3.ONE * game.CHARACTER_VISUAL_SCALE
	apply_sky(false)
	set_label_depth(false)
	set_banners(false)
	if enabled and game.any_side_panel_visible():
		return # The panel speaks for itself; street view comes back when it closes.
	game.announce_a11y_status("Map view." if enabled else "Map view. Street view off.")

## The map view draws every Label3D through walls (`no_depth_test`). At eye level that shows street
## signs and nameplates through buildings, so labels are depth-tested while active and restored on exit.
var label_depth_saved := {}
func set_label_depth(on: bool) -> void:
	if on:
		label_depth_saved = {}
		for label in game.find_children("*", "Label3D", true, false):
			if label.has_meta("neighbor_index"):
				continue # Nameplates hide behind buildings by line of sight; a lamp pole must not slice a name in two.
			label_depth_saved[label] = label.no_depth_test
			label.no_depth_test = false
		var gem_mat := guide_gem_material()
		if gem_mat != null: # The gold diamond is a mesh, not a label; at eye level it must not show through walls either.
			label_depth_saved[gem_mat] = gem_mat.no_depth_test
			gem_mat.no_depth_test = false
		return
	for item in label_depth_saved:
		if is_instance_valid(item):
			item.no_depth_test = label_depth_saved[item]
	label_depth_saved = {}

## Street-name banners are sized for the map (a 28-letter banner is about 8 m wide), so up close at eye level one
## filled the screen. While active they are drawn at a readable screen size and only within reach; the mural
## board's caption comes down to just above the board. Exit restores the map values.
var banner_saved := {}
func set_banners(on: bool) -> void:
	var ml := mural_label()
	if on:
		banner_saved = {}
		if game.street_signs_root != null:
			for b in game.street_signs_root.get_children():
				if b is Label3D:
					banner_saved[b] = [b.pixel_size, b.visible]
		if ml != null:
			banner_saved[ml] = [ml.position.y]
			ml.position.y = MURAL_LABEL_EYE_Y
		size_banners()
		return
	for item in banner_saved:
		if not is_instance_valid(item):
			continue
		if item == ml:
			item.position.y = banner_saved[item][0]
		else:
			item.pixel_size = banner_saved[item][0]
			item.visible = banner_saved[item][1]
	banner_saved = {}

## Banners also give way, like captions do: one that would overlap the street controls, the Talk prompt, a speech
## bubble, a visible caption or a nearer banner is hidden for that frame.
func size_banners() -> void:
	var eye := eye_xz()
	var ml := mural_label()
	var cam: Camera3D = game.camera
	var area: Rect2 = game.play_area_rect()
	var avoid: Array[Rect2] = occupied_rects()
	var talk: Rect2 = game.talk_prompt_screen_rect()
	if talk.has_area():
		avoid.append(talk.grow(6.0))
	if game.is_speech_bubble_visible():
		avoid.append(game.speech_bubble_screen_rect().grow(6.0))
	for c in game.visible_scene_captions:
		avoid.append(c.rect)
	var order: Array = []
	for b in banner_saved:
		if is_instance_valid(b) and b != ml:
			order.append(b)
	order.sort_custom(func(a: Label3D, c: Label3D) -> bool: return Vector2(a.global_position.x, a.global_position.z).distance_to(eye) < Vector2(c.global_position.x, c.global_position.z).distance_to(eye))
	for b in order:
		var xz := Vector2(b.global_position.x, b.global_position.z)
		b.visible = xz.distance_to(eye) <= BANNER_RANGE_M and not cam.is_position_behind(b.global_position)
		if not b.visible:
			continue
		b.pixel_size = game.screen_constant_scale(BANNER_PX / float(maxi(b.font_size, 1)), b.global_position)
		var sz: Vector2 = ThemeDB.fallback_font.get_string_size(b.text, HORIZONTAL_ALIGNMENT_CENTER, -1, b.font_size) * (BANNER_PX / float(maxi(b.font_size, 1))) + Vector2(16.0, 8.0)
		var rect := Rect2(cam.unproject_position(b.global_position) - sz * 0.5, sz)
		for r in avoid:
			if rect.intersects(r):
				b.visible = false
				break
		if b.visible and area.intersects(rect):
			avoid.append(rect)

func mural_label() -> Label3D:
	return game.mural_node.get_node_or_null("MuralBoardLabel") as Label3D if game.mural_node != null else null

func guide_gem_material() -> BaseMaterial3D:
	if game.guide_marker == null:
		return null
	var gem := game.guide_marker.get_node_or_null("GuideGem") as MeshInstance3D
	return gem.material_override as BaseMaterial3D if gem != null else null

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

## The street branch of `update_camera`: eye above the player, zero roll, target kept on the player. The chosen
## angle is vertical in landscape and horizontal in portrait, so a phone held upright is not a 37 degree slit.
func apply_camera() -> void:
	var cam: Camera3D = game.camera
	var p: Vector3 = game.player.position
	cam.keep_aspect = eye_keep_aspect()
	cam.fov = float(street_fov)
	game.target = p + Vector3.UP
	cam.size = game.view_size
	var back := shoulder_back_m()
	var ahead := Vector2(-sin(yaw), -cos(yaw))
	# Never behind a wall: the step shortens until the camera stands 0.3 m clear of every facade.
	while back > 0.05 and not game.is_walkable_point(Vector2(p.x, p.z) - ahead * back, 0.3):
		back -= 0.1
	back = maxf(back, 0.0)
	cam.position = Vector3(p.x - ahead.x * back, p.y + EYE_M, p.z - ahead.y * back)
	cam.rotation = Vector3(pitch, yaw, 0.0)
	cam.force_update_transform()

## How far the camera steps back along its view when a neighbor stands close ahead: walking up to someone stops at a
## metre or so, where their body would fill the whole view. Up to a metre, smoothly, and only for a neighbor in front;
## the player, the walking logic and every test of the eye stay where they are.
func shoulder_back_m() -> float:
	var here := eye_xz()
	var ahead := Vector2(-sin(yaw), -cos(yaw))
	var back := 0.0
	for i in range(game.neighbors.size()):
		var to_neighbor: Vector2 = game.neighbor_xz(i) - here
		var dist := to_neighbor.length()
		if dist < game.PLAYER_RADIUS_M or dist >= SHOULDER_RANGE_M: # Inside the body radius the direction is not steady.
			continue
		var facing := clampf((to_neighbor.normalized().dot(ahead) - 0.3) / 0.4, 0.0, 1.0)
		back = maxf(back, (SHOULDER_RANGE_M - dist) * facing)
	return minf(back, SHOULDER_MAX_M)

func eye_keep_aspect() -> Camera3D.KeepAspect:
	var vp: Vector2 = game.bubble_viewport_size()
	return Camera3D.KEEP_WIDTH if vp.x < vp.y else Camera3D.KEEP_HEIGHT

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
	var goodbye := ""
	if game.talk_partner >= 0 or game.any_side_panel_visible():
		game.end_conversation() # A chat or the hub ends with its goodbye first; street view never opens under a panel.
		goodbye = String(game.last_a11y_announcement).get_slice(" Next:", 0) + " " # Spoken before the entry line, which replaces it.
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
		game.announce_a11y_status(goodbye + "Street view. Facing %s. %s. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view." % [heading_text(), game.location_phrase(eye_xz())] + touch_hint())
	refresh_button()

## Turns the eye to a point on the ground, as a conversation, the mural or the music begins: the person or prop is ahead.
func face_xz(point: Vector2) -> void:
	var d := point - eye_xz()
	if d.length() < 0.05:
		return
	yaw = atan2(-d.x, -d.y)
	pitch = 0.0

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
	var vp: Vector2 = game.bubble_viewport_size()
	var span := maxf(vp.x if cam.keep_aspect == Camera3D.KEEP_WIDTH else vp.y, 1.0) # The dimension the angle spans.
	return px_per_unit * 2.0 * depth * tan(deg_to_rad(cam.fov) * 0.5) / span

## Eye-level tap distance to a neighbour standing at `base`, at true scale: 0 px anywhere on the body (feet to head,
## a shoulder's width either side), otherwise the distance from that outline. INF behind the eye or behind a wall.
## The map's three probe heights suit its 2.15-scale figures and miss a true-scale face up close.
func body_screen_distance(base: Vector3, screen_pos: Vector2) -> float:
	var cam: Camera3D = game.camera
	var mid := base + Vector3.UP * (BODY_TOP_M * 0.5)
	if cam.is_position_behind(mid) or not line_of_sight_clear(eye_xz(), Vector2(base.x, base.z)):
		return INF
	var lo := base + Vector3.UP * 0.05
	var hi := base + Vector3.UP * BODY_TOP_M
	var m := cam.unproject_position(mid)
	var a := m if cam.is_position_behind(lo) else cam.unproject_position(lo)
	var b := m if cam.is_position_behind(hi) else cam.unproject_position(hi)
	var half_px := cam.unproject_position(mid + cam.global_transform.basis.x * BODY_HALF_WIDTH_M).distance_to(m)
	var ab := b - a
	var t := 0.0 if ab.length_squared() < 1e-6 else clampf((screen_pos - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
	return maxf(0.0, screen_pos.distance_to(a + ab * t) - half_px)

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
		if not event.pressed:
			if contacts.has(MOUSE_CONTACT):
				return contact_up(MOUSE_CONTACT, event.position)
			# A modifier orbit's release still reaches the map to end it; any other stray release is ignored here.
			return not game.orbit_dragging and not game.pointer_active and not game.is_screen_point_in_ui(event.position)
		var used := contact_down(MOUSE_CONTACT, event.position)
		if not used:
			# A press in a gutter outside the play area is ignored at eye level, as the same touch is; only UI keeps it.
			return not game.is_screen_point_in_ui(event.position)
		var chord: bool = (event.button_mask & (MOUSE_BUTTON_MASK_RIGHT | MOUSE_BUTTON_MASK_MIDDLE)) != 0 # Part of a right/middle drag.
		if contacts[MOUSE_CONTACT].role == "look" and not chord and request_capture():
			contacts[MOUSE_CONTACT].role = "capture" # The press that asks for the lock neither looks nor taps.
		return used
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

## The "Mouse look" toggle: saved as `street_mouselook`; turning it off frees a held mouse. It only arms the next
## press on the street; nothing is requested here.
func set_mouselook(on: bool) -> void:
	game.get_viewport().gui_release_focus() # As with the street button: Shift+arrows must not become focus traversal.
	street_mouselook = on
	if not on:
		release_capture()
	refresh_mouselook_button()
	game.save_godot_settings()
	game.announce_a11y_status("Mouse look on. Click the street to steer the view with the mouse; Esc releases it." if on else "Mouse look off.")

func refresh_mouselook_button() -> void:
	if mouselook_btn == null:
		return
	mouselook_btn.set_pressed_no_signal(street_mouselook)
	mouselook_btn.text = "Esc frees mouse" if capture_state == "locked" else ("Mouse look: on" if street_mouselook else "Mouse look: off")
	# The label fits the 132 px button ("Esc releases mouse" clipped to "Esc releases mou"); the name says it in full.
	mouselook_btn.accessibility_name = "Esc releases the mouse" if capture_state == "locked" else mouselook_btn.text

func read_mouse_mode() -> int:
	return mouse_mode_override if mouse_mode_override >= 0 else int(Input.mouse_mode)

func write_mouse_mode(mode: int) -> void:
	if mouse_mode_override >= 0:
		if mode != Input.MOUSE_MODE_CAPTURED:
			mouse_mode_override = mode
		return
	Input.mouse_mode = mode as Input.MouseMode

## A grant is only kept while the eye is active with nothing over it: no story card, and no hub, conversation,
## mural or music panel (those open over the eye without suspending it, and their buttons need the mouse).
func capture_allowed() -> bool:
	return street_mouselook and mouselook_offered() and mouselook_room() and active() and not game.is_story_card_visible() and not game.any_side_panel_visible()

## The room the toggle needs under the street button. Read from the play area, not the toggle's visibility, so a
## lock is never asked for or kept while the toggle and its "Esc frees mouse" hint cannot be shown.
func mouselook_room() -> bool:
	var area: Rect2 = game.play_area_rect()
	return area.size.x >= BUTTON_SIZE.x + 16.0 and area.size.y >= BUTTON_SIZE.y * 5.0

## A right- or middle-button orbit held into a lock never sees its release (the lock takes every button), so the
## map's drag flags end with the lock's start and end; otherwise a plain hover would turn the eye after Esc.
func clear_map_drag() -> void:
	game.orbit_dragging = false
	game.pointer_active = false
	game.pointer_dragging = false

## The toggle is a mouse control; a touchscreen has the stick and drag-look, so a saved `street_mouselook` asks for
## nothing there, where the toggle that would turn it off is not shown.
func mouselook_offered() -> bool:
	return not touch_screen

## From the left-press handler only, so the browser sees the request inside the click. True when one was made.
func request_capture() -> bool:
	if not capture_allowed() or capture_state == "requested" or capture_state == "locked":
		return false
	capture_requests += 1
	capture_state = "requested"
	capture_wait = 0
	write_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	return true

## Ends a request or a lock without announcing it; Esc and the browser's own release announce for themselves.
func release_capture() -> void:
	if capture_state != "requested" and capture_state != "locked":
		return
	capture_state = "released"
	write_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	contacts.erase(MOUSE_CONTACT)
	clear_map_drag()
	refresh_mouselook_button()

## Once per frame from `tick`, after the first request of the session: follows the browser's answer.
func poll_capture() -> void:
	var captured := read_mouse_mode() == Input.MOUSE_MODE_CAPTURED
	match capture_state:
		"requested":
			if captured and capture_allowed():
				capture_state = "locked"
				contacts.erase(MOUSE_CONTACT)
				clear_map_drag()
				refresh_mouselook_button()
				game.announce_a11y_status("Esc releases the mouse.")
			elif captured:
				release_capture() # Granted after the player left the eye or opened a panel: cancelled at once.
			else:
				capture_wait += 1
				if capture_wait >= CAPTURE_WAIT_FRAMES:
					write_mouse_mode(Input.MOUSE_MODE_VISIBLE) # A grant still in flight must not land later.
					capture_state = "denied"
					street_mouselook = false
					refresh_mouselook_button()
					game.save_godot_settings()
					game.announce_a11y_status("The browser did not allow mouse look.")
		"locked":
			if not captured:
				capture_state = "released" # The browser dropped it (a tab switch, or its own Esc).
				capture_dropped_frame = Engine.get_process_frames()
				refresh_mouselook_button()
				game.announce_a11y_status("Mouse released.")
			elif not capture_allowed():
				release_capture()
		_:
			if captured:
				write_mouse_mode(Input.MOUSE_MODE_VISIBLE) # A late grant after a release or a refusal.

## From the top of `_input`, before the GUI and every gameplay key: while locked, Esc releases the mouse and
## motion steers the eye; presses do nothing until Phase 3 gives them a crosshair. True when used here.
func capture_input(event: InputEvent) -> bool:
	var esc: bool = event is InputEventKey and (event.keycode == KEY_ESCAPE or event.physical_keycode == KEY_ESCAPE)
	if capture_state == "locked":
		if esc:
			if event.pressed and not event.echo:
				release_capture()
				game.announce_a11y_status("Mouse released.")
			return true
		if event is InputEventMouseMotion:
			look(-event.screen_relative.x * LOOK_YAW_PER_PX, event.screen_relative.y * LOOK_PITCH_PER_PX)
			return true
		return event is InputEventMouseButton
	if esc and capture_dropped_frame >= 0:
		if Engine.get_process_frames() - capture_dropped_frame <= ESC_GRACE_FRAMES:
			if not event.pressed:
				capture_dropped_frame = -1 # The press and the release of the browser's Esc are both used here.
			return true
		capture_dropped_frame = -1
	return false

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
	var held := has_role("move")
	if show:
		var area: Rect2 = game.play_area_rect()
		stick.size = STICK_SIZE
		# A finger on the stick keeps it where it was pressed while the status line comes or goes; a rotation still moves it.
		var vp: Vector2 = game.bubble_viewport_size()
		if not held or vp != stick_placed_for:
			stick.position = Vector2(area.position.x, area.end.y - STICK_SIZE.y)
			stick_placed_for = vp
		# The stick sits bottom-left and the street button top-right, so they only meet in a narrow area; a short
		# landscape phone (667x390 leaves about 140 px) still has room for the stick beside the button.
		show = area.size.x >= STICK_SIZE.x + BUTTON_SIZE.x + 16.0 and area.size.y >= STICK_SIZE.y + 8.0
	stick.visible = show
	# A finger already on the stick keeps walking while a rotation leaves no room for it (the eye is still active);
	# only leaving the eye, or a device without touch, ends the movement contact.
	if not (touch_screen and active()):
		for id in contacts.keys():
			if contacts[id].role == "move":
				drop_contact(id)

## The street button, the stick, the Mouse look toggle and desktop's map tools under them, for the caption, banner and
## guide-arrow `occupied` lists.
func occupied_rects() -> Array[Rect2]:
	var rects: Array[Rect2] = []
	if button_visible():
		rects.append(button.get_global_rect().grow(6.0))
	if stick_visible():
		rects.append(stick.get_global_rect().grow(6.0))
	if mouselook_visible():
		rects.append(mouselook_btn.get_global_rect().grow(6.0))
	var tools: Rect2 = game.map_tools_rect()
	if tools.has_area():
		rects.append(tools.grow(6.0))
	return rects

## Called once per frame from `_process`: region changes, the floating button and the stick.
## Applies a rule change at once: the camera, cutaways and hub fit follow in the same call. From `tick`, and from
## the panel show functions, so a refit in the frame a panel opens meets the map camera, not the eye.
func resync() -> bool:
	if not sync():
		return false
	game.update_camera() # A rule change outside update_camera (an activity opening, a western route) must not leave the eye pose.
	game.update_occlusion(true)
	if not was_active:
		game.refresh_hub_camera.call_deferred() # A hub that opened while the eye was in charge still gets its fit.
	return true

func tick() -> void:
	if resync():
		pass
	elif was_active and game.camera.keep_aspect != eye_keep_aspect():
		game.update_camera() # A phone turned between portrait and landscape moves the angle to the other dimension.
	if was_active:
		size_banners()
	if capture_requests > 0:
		poll_capture()
	refresh_button()
	refresh_stick()

func button_visible() -> bool:
	return button != null and button.is_visible_in_tree()

func mouselook_visible() -> bool:
	return mouselook_btn != null and mouselook_btn.is_visible_in_tree()

func refresh_button() -> void:
	if button == null:
		return
	var show: bool = game.following_player and not game.in_overview and not game.in_wide_overview and not game.is_focused_activity_visible() and not game.is_story_card_visible() and game.selected < 0 and in_block()
	if not show:
		button.visible = false
		mouselook_btn.visible = false
		return
	button.text = "Map view" if active() else "Street view"
	var area: Rect2 = game.play_area_rect()
	button.size = BUTTON_SIZE
	var top: float = area.position.y
	if game.reward_banner != null and game.reward_banner.is_visible_in_tree():
		var rb: Rect2 = game.reward_banner.get_global_rect()
		if rb.intersects(Rect2(Vector2(area.end.x - BUTTON_SIZE.x, top), BUTTON_SIZE)):
			top = rb.end.y + 6.0 # The reward note keeps its place; the button steps down below it while it shows.
	button.position = Vector2(area.end.x - BUTTON_SIZE.x, top)
	button.visible = area.size.x >= BUTTON_SIZE.x + 16.0 and area.size.y >= BUTTON_SIZE.y * 3.0
	# Mouse look sits under the street button at eye level, for a mouse; a touchscreen has the stick and drag-look.
	mouselook_btn.size = BUTTON_SIZE
	mouselook_btn.position = button.position + Vector2(0.0, BUTTON_SIZE.y + 8.0)
	mouselook_btn.visible = button.visible and active() and mouselook_offered() and mouselook_room()

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
		"stick": {"visible": stick_visible(), "name": stick.accessibility_name if stick != null else "","x": stick_rect.position.x, "y": stick_rect.position.y, "width": stick_rect.size.x, "height": stick_rect.size.y},
		"turn": street_turn,
		"fov": street_fov,
		"keep_aspect": int(cam.keep_aspect) if cam != null else -1,
		"mouselook": street_mouselook,
		"mouselook_button": game.control_snapshot(mouselook_btn).merged({"text": mouselook_btn.text if mouselook_btn != null else "", "pressed": mouselook_btn != null and mouselook_btn.button_pressed}),
		"capture": capture_state,
		"capture_requests": capture_requests,
		"reduced_motion": {"on": reduced_motion, "saved": reduced_motion_saved, "system": reduced_motion_system, "visible": motion_btn != null and motion_btn.is_visible_in_tree(), "toggle": game.control_snapshot(motion_btn), "text": motion_btn.accessibility_name if motion_btn != null else ""},
		"contacts": roles,
		"taps_routed": taps_routed,
	}
