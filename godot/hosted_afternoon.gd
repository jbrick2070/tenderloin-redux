extends RefCounted
## Read-only presentation of the original copied gathering; no saved state.
const IDS := ["stories","beats","art","pause"]
const OWNERS := ["Bea","Dez","Celeste","Thanh"]
const POSITIONS := ["first","second","third","fourth"]

static func copied(game: Node,id: String) -> Dictionary:
	var raw: Variant=game.get_hosted_segment_value(id)
	if id=="stories" and raw is String and raw in game.HOSTING_STORIES:
		return {"valid":true,"value":raw}
	if id=="pause" and raw is String and raw in game.HOSTING_QUIETS:
		return {"valid":true,"value":raw}
	if id=="beats" and game.is_whole_json_number(raw) and int(roundf(float(raw)))>=0 and int(roundf(float(raw)))<=255:
		return {"valid":true,"value":int(roundf(float(raw)))}
	if id=="art" and raw is Dictionary and raw.get("palette") is String and raw.palette in game.HOSTING_PALETTES and raw.get("tiles") is Array and raw.tiles.size()==6:
		var tiles: Array[int]=[]
		for tile in raw.tiles:
			if not game.is_whole_json_number(tile) or int(roundf(float(tile)))<0 or int(roundf(float(tile)))>2: return {"valid":false}
			tiles.append(int(roundf(float(tile))))
		return {"valid":true,"value":{"palette":String(raw.palette),"tiles":tiles}}
	return {"valid":false}

static func detail(game: Node,id: String) -> String:
	var index := IDS.find(id)
	var position: int=game.hosting_order.find(id)
	if index<0 or position<0 or position>=POSITIONS.size(): return "No copied contribution is available. The saved gathering stays unchanged."
	var heading: String="%s was %s in the afternoon we hosted."%[game.programme_title(id),POSITIONS[position]]
	var copy := copied(game,id)
	if not copy.valid: return heading+"\nThe copied choice is unavailable. The saved gathering stays unchanged."
	var value: Variant=copy.value
	var result := ""
	var reply := ""
	match id:
		"stories":
			result="Copied invitation: "+String(game.bea_invitation.TITLES[value])+"."
			reply="You made room for a small moment, and passing was welcome. No personal story was recorded." if value=="memory" else "You left room for something we hoped to make. Listening counted too. No personal story was recorded."
		"beats":
			var slots: Array[String]=[]
			for i in range(8):
				if (int(value)&(1<<i))!=0: slots.append(str(i+1))
			result="Copied rhythm: listening only, with no marked beats." if slots.is_empty() else "Copied rhythm: %d taps in eight slots, at %s."%[slots.size(),", ".join(slots)]
			reply="You gave listening a place without asking anyone to make a beat." if slots.is_empty() else "You gave us %d taps in eight slots. I kept the spaces between them too."%slots.size()
		"art":
			result="Copied panel: %s colors and six arranged shapes."%String(value.palette).capitalize()
			reply="Our six shapes stay in warm colors, just as we hung them." if value.palette=="warm" else "Our six shapes stay in cool colors, just as we hung them."
		"pause":
			result="Copied seating: "+String(game.quiet_seats.TITLES[value])+"."
			reply="You kept an open arc, with the cushion marking a place. Coming and going were welcome." if value=="arc" else "You kept a pair and an open seat, with the cushion marking a place. Coming and going were welcome."
	return OWNERS[index]+': "'+reply+'"'+"\n"+heading+"\n"+result

static func replies(game: Node) -> Array[String]:
	var result: Array[String]=[]
	for id in IDS: result.append(detail(game,id))
	return result

static func invitation_available(game: Node) -> bool:
	return game.is_hosting_done() and game.is_civic_available() and game.civic_phase in ["idle","planning","meeting"]

static func invitation(game: Node) -> String:
	if not game.is_hosting_done(): return ""
	if game.civic_phase=="done": return "The Listening Hour is complete. Its remembered voices and Dez's offer remain in Listening Hour (F5)."
	var opening: String="Our afternoon began with %s and ended with %s."%[game.programme_title(game.hosting_order[0]),game.programme_title(game.hosting_order[3])]
	var offer := "I would like to make room for a Listening Hour too, when you are ready."
	if game.civic_phase=="planning": offer="Your Listening Hour plan is still there. We can return to it at your pace."
	elif game.civic_phase=="meeting": offer="The Listening Hour is open. We can return to the conversation without closing it."
	return 'Bea: "'+opening+" "+offer+'"'
