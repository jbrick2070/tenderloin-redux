extends Node
## Fictional returned carrying kits; ownership is returned, the shared setup stays.
var game: Node
var kits: Dictionary = {}
var chapter_completion_notice := ""
var confirmed_owner := ""
const REPLIES := {
	"table":"The table is checked back in. I'll leave it set for another afternoon; the carrying bag and straps are packed. Thanks for helping.",
	"paint-case":"Paint case back, and still plenty for next time. Keep our mural up a little longer; I like what we made.",
	"speaker":"Speaker checked back in. It can stay for another afternoon; cover on hand, spare cable coiled. Good crew today."
}

func setup(owner_game: Node) -> void:
	game=owner_game
	for id in game.LOAN_IDS:
		var base: MeshInstance3D=game.loan_return_beacons[id]
		var kit := Node3D.new()
		kit.name="ReturnedCarryingKit"
		base.add_child(kit)
		kits[id]=kit
		if id=="table":
			box(kit,"CanvasCarryBag",Vector3(0,0.24,0),Vector3(0.32,0.16,0.24),Color("75907c"))
			for x in [-0.105,0.105]:
				box(kit,"PackedStrap",Vector3(x,0.328,0),Vector3(0.025,0.016,0.245),Color("f0d291"))
			handle(kit,0.32,Color("3d5145"))
		elif id=="paint-case":
			box(kit,"PaintCase",Vector3(0,0.25,0),Vector3(0.32,0.18,0.24),Color("c67d82"))
			box(kit,"ClosedLid",Vector3(0,0.35,0),Vector3(0.33,0.025,0.25),Color("efd4ac"))
			for x in [-0.10,0.10]: box(kit,"BrassLatch",Vector3(x,0.31,0.126),Vector3(0.026,0.05,0.008),Color("e3b457"))
			for i in range(3):
				var cap := MeshInstance3D.new()
				cap.name="PaintSwatch%d"%i
				var cylinder := CylinderMesh.new()
				cylinder.top_radius=0.025
				cylinder.bottom_radius=0.025
				cylinder.height=0.008
				cap.mesh=cylinder
				cap.position=Vector3((i-1)*0.075,0.367,0)
				cap.material_override=game.person_material([Color("5fb8a6"),Color("d6a449"),Color("987b9e")][i])
				kit.add_child(cap)
			handle(kit,0.363,Color("5a4039"))
		else:
			box(kit,"SpeakerCover",Vector3(0,0.25,0),Vector3(0.30,0.18,0.23),Color("3f5660"))
			for x in [-0.125,0.125]: box(kit,"CoverSeam",Vector3(x,0.27,0.119),Vector3(0.008,0.11,0.008),Color("8da8a4"))
			var cable := SurfaceTool.new()
			cable.begin(Mesh.PRIMITIVE_TRIANGLES)
			cable.set_smooth_group(-1)
			for i in range(20):
				var a := TAU*float(i)/20.0
				var b := TAU*float(i+1)/20.0
				game.colored_beam(cable,Vector3(cos(a)*0.088,0.352,sin(a)*0.075),Vector3(cos(b)*0.088,0.352,sin(b)*0.075),0.014,Color("f0cd7c"))
			cable.generate_normals()
			var coil := MeshInstance3D.new()
			coil.name="CoiledCable"
			coil.mesh=cable.commit()
			coil.material_override=game.vertex_color_material()
			kit.add_child(coil)
			box(kit,"CablePlug",Vector3(0.11,0.355,0.065),Vector3(0.045,0.018,0.018),Color("d6ded9"))
	update_world()

func box(parent: Node, part_name: String, pos: Vector3, size: Vector3, color: Color) -> void:
	var part := MeshInstance3D.new()
	part.name=part_name
	var shape := BoxMesh.new()
	shape.size=size
	part.mesh=shape
	part.position=pos
	part.material_override=game.person_material(color)
	parent.add_child(part)

func handle(parent: Node, bottom: float, color: Color) -> void:
	for x in [-0.055,0.055]: box(parent,"HandleSide",Vector3(x,bottom+0.025,0),Vector3(0.014,0.05,0.024),color)
	box(parent,"CarryHandle",Vector3(0,bottom+0.05,0),Vector3(0.125,0.014,0.024),color)

func update_world() -> void:
	for id in kits: kits[id].visible=game.block_opened and game.epilogue_returned.has(id)

func pending(index: int) -> String:
	if not game.block_opened or not game.epilogue_packing or index<0 or index>=game.neighbors.size(): return ""
	for id in game.LOAN_IDS:
		if game.LOAN_OWNERS[id]==game.neighbors[index].id and not game.epilogue_returned.has(id): return id
	return ""

func conversation_loan(index: int) -> String:
	var id := pending(index)
	if not id.is_empty(): return id
	if not confirmed_owner.is_empty() and index>=0 and index<game.neighbors.size() and game.LOAN_OWNERS[confirmed_owner]==game.neighbors[index].id:
		return confirmed_owner
	return ""

func chat(index: int) -> void:
	# Deliberate Chat extends the original callback; arrival never returns a loan.
	if index==game.rook_index:
		var near: bool=game.arrived_neighbor==index or game.arrived_speaker
		game.request_rook_soundcheck()
		if not near: return
	else: game.talk_with_neighbor(index)
	if not pending(index).is_empty(): game.show_conversation(index)

func allow_return(id: String) -> bool:
	var next: Dictionary=game.build_save_envelope()
	var returned: Array=[]
	for loan in game.LOAN_IDS:
		if loan==id or game.epilogue_returned.has(loan): returned.append(loan)
	next.epilogue.returned=returned
	next.save_seq=game.save_seq+1
	if JSON.stringify(next).to_utf8_buffer().size()<=game.SAVE_BUDGET_MAX_BYTES: return true
	game.last_panel_dialogue='%s: "The return was not changed: this save has no room. The last stored save stays unchanged."'%String(game.LOAN_OWNERS[id]).capitalize()
	game.update_block_ui()
	game.announce_a11y_status(game.last_panel_dialogue)
	return false

func reply(id: String) -> String:
	var owner: String=game.LOAN_OWNERS.get(id,"")
	return '%s: "%s"'%[owner.capitalize(),REPLIES.get(id,"")]

func note_completion() -> void:
	if game.is_epilogue_done() and int(game.current_chapter().num)>game.last_story_chapter:
		chapter_completion_notice="Returned all three neighbor loans (3/3). "

func return_to_owner(id: String) -> bool:
	if pending(game.talk_partner)!=id or not game.return_loan(id): return false
	confirmed_owner=id # Keep this target a harmless receipt through repeated input.
	game.last_panel_dialogue=reply(id)
	if not chapter_completion_notice.is_empty(): chapter_completion_notice+=game.last_panel_dialogue+" "
	game.update_block_ui()
	game.show_neighbor_speech(game.talk_partner,game.last_panel_dialogue)
	# Keep the earned return announcement; add the owner's voice rather than replace it.
	game.announce_a11y_status('Returned %s (%d/3). %s'%[game.LOAN_TITLES[id],game.epilogue_returned.size(),game.last_panel_dialogue])
	return true

func memory(neighbor_id: String) -> String:
	for id in game.LOAN_IDS:
		if game.LOAN_OWNERS[id]==neighbor_id and game.epilogue_returned.has(id): return '“'+String(REPLIES[id])+'”'
	return ""

func cutaway_points() -> Array[Vector2]:
	var result: Array[Vector2]=[]
	if game.following_player: return result
	for id in kits:
		var base: MeshInstance3D=game.loan_return_beacons[id]
		if base.visible and base.global_position.distance_to(game.target)<24: result.append(Vector2(base.global_position.x,base.global_position.z))
	return result

func snapshot() -> Dictionary:
	var items: Array[Dictionary]=[]
	var focused_action := ""
	for i in range(game.conv_action_btns.size()):
		if game.conv_action_btns[i].has_focus() and i<game.conv_action_ids.size(): focused_action=String(game.conv_action_ids[i])
	for id in game.LOAN_IDS:
		if not kits.has(id): continue
		var kit: Node3D=kits[id]
		var corners: Array[Dictionary]=[]
		for x in [-0.19,0.19]:
			for y in [-0.16,0.43]:
				for z in [-0.15,0.15]:
					var p: Vector2=game.camera.unproject_position(kit.to_global(Vector3(x,y,z)))
					corners.append({"x":p.x,"y":p.y})
		items.append({"id":id,"title":game.LOAN_TITLES[id],"returned":game.epilogue_returned.has(id),"visible":kit.is_visible_in_tree(),"base_visible":kit.get_parent().is_visible_in_tree(),"corners":corners,"parts":kit.get_child_count()})
	return {"packing":game.epilogue_packing,"returned":game.epilogue_returned.duplicate(),"pending":pending(game.talk_partner),"focused_action":focused_action,"items":items}
