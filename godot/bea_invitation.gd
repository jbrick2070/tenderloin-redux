extends Node
## Original fictional invitation art. Existing story choice owns all durable state.
const TITLES := {"memory":"A small moment you want to keep", "future":"Something you hope to make together"}
const EXAMPLES := {
	"memory":"I once found a folded note in an old coat: a friend had written, 'There is a place for you here.' The coat wore out; I kept the note. A tiny thing can hold a whole afternoon.",
	"future":"I would like to make a string of paper flags with whoever feels like joining. Every flag could be different. We could leave a few blank for people who come later. It would still belong together."
}
const PAPER_SIZE := Vector2(1.2,0.8)
const PAPER_UVS := [Vector2(300.0/720.0,430.0/480.0),Vector2(320.0/720.0,250.0/480.0),Vector2(0.04,0.5)]
const PAPER_COLORS := {"memory":["29525e","fff5dd","f5e7cb"],"future":["f5e7cb","6a9a8c","f5e7cb"]}
var game: Node
var worlds: Array[Node3D] = []
var papers: Array[MeshInstance3D] = []
var textures: Dictionary = {}
var rendered := ""

func setup(owner_game: Node) -> void:
	game = owner_game
	assert(game.HOSTING_STORIES.size()==game.HOSTING_QUIETS.size(),"Shared hosting row requires matching choice counts")
	for li in range(2):
		var root := Node3D.new()
		root.name = "BeasIllustratedInvitation"
		root.position = Vector3(-3.1,0.812,-0.15) if li==0 else Vector3(0.2,0.043,0.15)
		(game.layout_table_node if li==0 else game.layout_floor_node).add_child(root)
		worlds.append(root)
		# A little folded-paper tent, not a new seat, signpost or stage.
		var back := MeshInstance3D.new()
		var fold := QuadMesh.new()
		fold.size = PAPER_SIZE
		back.mesh = fold
		back.position = Vector3(0,cos(0.35)*PAPER_SIZE.y*0.5,-sin(0.35)*PAPER_SIZE.y*0.5)
		back.rotation.x = 0.35
		var backing: StandardMaterial3D = game.mural_material(Color("d8c6a4"))
		back.material_override = backing
		root.add_child(back)
		var paper := MeshInstance3D.new()
		paper.name = "InvitationPaper"
		var quad := QuadMesh.new()
		quad.size = PAPER_SIZE
		paper.mesh = quad
		paper.position = Vector3(0,cos(0.35)*PAPER_SIZE.y*0.5,sin(0.35)*PAPER_SIZE.y*0.5)
		paper.rotation.x = -0.35
		root.add_child(paper)
		papers.append(paper)
	update_world()

func choice() -> String:
	if not game.block_opened: return ""
	if game.current_hosting_activity()=="stories":
		var draft := String(game.hosting_draft.get("story","memory"))
		return draft if draft in TITLES else ""
	var result: Variant = game.get_hosted_segment_value("stories")
	return String(result) if result is String and result in TITLES else ""

func explanation() -> String:
	var id := choice()
	if not id in TITLES: return ""
	return 'Bea: "'+TITLES[id]+'. '+EXAMPLES[id]+' That is just my example. Tell something if you want to; listening is equally welcome. No story is recorded." (Original fictional scene.)'

func select(index: int) -> void:
	if index<0 or index>=game.HOSTING_STORIES.size(): return
	var id: String = game.HOSTING_STORIES[index]
	if not game.host_set_story(id): game.update_block_ui()
	game.announce_a11y_status(explanation())

func update_choices(row: HBoxContainer, buttons: Array[Button]) -> void:
	var enabled: bool = game.block_opened and game.block_panel.visible and game.block_panel_mode=="hub"
	if row.visible!=enabled or row.get_meta("activity","")!="stories":
		row.set_meta("activity","stories")
		row.visible = enabled
		if enabled: game.last_panel_dialogue = explanation()+" Choose the invitation, then Host Activity (Z) when ready. Nothing is timed."
		game.layout_walking_controls_and_hub()
	for i in range(buttons.size()):
		var id: String = game.HOSTING_STORIES[i]
		buttons[i].text = "A small moment\nyou want to keep" if i==0 else "Something you hope\nto make together"
		buttons[i].tooltip_text = TITLES[id]
		buttons[i].set_pressed_no_signal(choice()==id)
		buttons[i].accessibility_name = TITLES[id]+(" , selected" if choice()==id else "")

func source(id: String) -> String:
	if not id in TITLES: return ""
	var base := '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect width="360" height="240" fill="#f5e7cb"/><path d="M10 20 Q170 9 350 18 M16 222 Q190 230 344 216" fill="none" stroke="#d8bf96" stroke-width="3"/>'
	if id=="memory":
		base += '<path d="M18 240 L44 95 Q67 63 116 60 L266 63 Q302 84 333 240Z" fill="#386e79"/><path d="M65 112 Q174 137 289 108 L278 240 H80Z" fill="#29525e"/><path d="M75 128 Q173 152 281 125" stroke="#e0ae68" stroke-width="3" stroke-dasharray="5 5" fill="none"/><g transform="rotate(-8 180 100)"><path d="M110 34 L252 43 L242 147 L106 134Z" fill="#fff5dd" stroke="#bd8b65" stroke-width="3"/><path d="M110 34 L171 91 L252 43 M171 91 L109 134 M171 91 L242 147" stroke="#d8b990" stroke-width="3" fill="none"/><path d="M165 75 C152 58 134 72 165 96 C196 72 178 58 165 75" fill="#c36b62"/></g><path d="M54 51 Q68 37 83 50 M286 48 L298 32 M305 64 L324 59" fill="none" stroke="#d5a44f" stroke-width="5" stroke-linecap="round"/>'
	else:
		base += '<path d="M20 69 Q178 117 340 58" fill="none" stroke="#38596c" stroke-width="5"/><path d="M48 78 L107 91 L69 155Z" fill="#d68468"/><path d="M128 96 L188 98 L160 170Z" fill="#6a9a8c"/><path d="M213 94 L271 81 L259 156Z" fill="#a194ba"/><path d="M291 74 L335 60 L330 128Z" fill="#fff5dd" stroke="#c4b18d" stroke-width="2"/><path d="M0 216 L80 158 L111 170 L59 240 H0Z" fill="#38596c"/><path d="M64 173 Q92 139 113 139 L136 132 Q151 134 143 146 L113 161 L124 166 Q142 162 145 173 Q144 187 119 194 L89 201Z" fill="#b77f5d"/><path d="M360 211 L293 159 L263 177 L310 240 H360Z" fill="#a194ba"/><path d="M299 171 Q285 141 269 135 L245 123 Q231 124 236 138 L261 155 L247 153 Q233 157 240 169 L268 191Z" fill="#e0b18b"/><path d="M182 35 L182 51 M166 43 L174 53 M198 43 L190 53" stroke="#d5a44f" stroke-width="4" stroke-linecap="round"/>'
	return base+'</svg>'

func texture(id: String) -> Texture2D:
	if textures.has(id): return textures[id]
	var image := Image.new()
	if image.load_svg_from_string(source(id),2.0)!=OK: return null
	image.generate_mipmaps()
	var tex := ImageTexture.create_from_image(image)
	textures[id] = tex
	return tex

func update_world() -> void:
	var id := choice()
	for world in worlds: world.visible = not id.is_empty()
	if id==rendered: return
	rendered = id
	if id.is_empty(): return
	for paper in papers:
		var paint := StandardMaterial3D.new()
		paint.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		paint.cull_mode = BaseMaterial3D.CULL_DISABLED
		paint.albedo_texture = texture(id)
		paper.material_override = paint

func paper_rect() -> Rect2:
	if papers.is_empty() or choice().is_empty(): return Rect2()
	var paper: MeshInstance3D = papers[0 if game.gathering_layout=="table" else 1]
	if not paper.is_visible_in_tree() or game.camera.is_position_behind(paper.global_position): return Rect2()
	var box := paper.get_aabb()
	var art := Rect2(game.camera.unproject_position(paper.to_global(box.position)),Vector2.ZERO)
	for i in range(8): art = art.expand(game.camera.unproject_position(paper.to_global(box.get_endpoint(i))))
	return art

func inspection_rect() -> Rect2:
	if game.following_player or game.in_overview or game.in_wide_overview or cutaway_points().is_empty(): return Rect2()
	return paper_rect().grow(4.0) if paper_rect().has_area() else Rect2()

func snapshot() -> Dictionary:
	var samples: Array[Dictionary] = []
	if paper_rect().has_area():
		var paper: MeshInstance3D = papers[0 if game.gathering_layout=="table" else 1]
		for i in range(PAPER_UVS.size()):
			var uv: Vector2 = PAPER_UVS[i]
			var screen: Vector2 = game.camera.unproject_position(paper.to_global(Vector3((uv.x-0.5)*PAPER_SIZE.x,(0.5-uv.y)*PAPER_SIZE.y,0)))
			samples.append({"x":screen.x,"y":screen.y,"u":uv.x,"v":uv.y,"color":PAPER_COLORS[choice()][i]})
	return {"choice":choice(),"copied":game.has_hosted_segment("stories"),"explanation":explanation(),"paper":game.rect_snapshot(paper_rect()),"paper_samples":samples,"row":game.control_snapshot(game.quiet_seats.row)}

func cutaway_points() -> Array[Vector2]:
	var points: Array[Vector2] = []
	if choice().is_empty() or worlds.is_empty() or game.following_player: return points
	var world: Node3D = worlds[0 if game.gathering_layout=="table" else 1]
	if world.global_position.distance_to(game.target)<30.0: points.append(Vector2(world.global_position.x,world.global_position.z))
	return points
