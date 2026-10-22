extends Control
## Optional, project-native programme editor. Draft, posted and hosted copies stay separate.
const IDS := ["stories","beats","art","pause"]
const OWNERS := ["Bea","Dez","Celeste","Thanh"]
const PITCHES := [
	'“A story can take its time. If we follow the rhythm workshop, leave a quiet interval between it and the circle so we can settle in.”',
	'“Let’s build a rhythm together. Listening counts as joining in. We can start the afternoon or pick it up after the stories.”',
	'“Portable panels again. Everyone can add a shape, or help someone find a color. Put us wherever the afternoon needs a change.”',
	'“An unhurried pause belongs on the programme too. No amplified sound, no activity to finish. A chance to sit or come and go.”'
]
var game: Node
var top: PanelContainer
var tray: PanelContainer
var heading: Label
var reader: RichTextLabel
var picture: TextureRect
var cards: Array[Button] = []
var edits: Array[Button] = []
var primary: Button
var view: Button
var music: Button
var back: Button
var selected := "stories"
var posted := false
var saved_visibility: Dictionary = {}
var return_focus: Control
var textures: Dictionary = {}
var layout_pending := false
var snapshot_clock := 0.0
var budget_notice := ""

func setup(owner_game: Node) -> void:
	game=owner_game
	name="ProgrammeStudio"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_STOP
	z_index=104
	var shade := ColorRect.new()
	shade.color=Color("203c38")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	top=frame()
	var head := VBoxContainer.new()
	top.add_child(head)
	heading=Label.new()
	heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	heading.add_theme_font_size_override("font_size",18)
	head.add_child(heading)
	var credit := Label.new()
	credit.text="Fictional future plan | City/PDDL | OSM/ODbL"
	credit.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	credit.add_theme_font_size_override("font_size",10)
	head.add_child(credit)
	picture=TextureRect.new()
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(picture)
	tray=frame()
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation",4)
	tray.add_child(box)
	reader=game.make_activity_detail()
	reader.custom_minimum_size.y=52
	reader.add_theme_font_size_override("normal_font_size",16)
	box.add_child(reader)
	var grid := GridContainer.new()
	grid.columns=2
	box.add_child(grid)
	for i in range(4):
		var id: String=IDS[i]
		var b := button(grid,"",func(): selected=id; refresh(true))
		b.toggle_mode=true
		cards.append(b)
	var edit_row := HBoxContainer.new()
	box.add_child(edit_row)
	edits.append(button(edit_row,"Add",toggle_card))
	edits.append(button(edit_row,"Earlier",func(): move_card(-1)))
	edits.append(button(edit_row,"Later",func(): move_card(1)))
	var actions := HBoxContainer.new()
	box.add_child(actions)
	primary=button(actions,"Post",advance)
	view=button(actions,"Posted",func(): posted=not posted; refresh(true))
	music=button(actions,"Music: Off",func(): game.toggle_music_playback(); refresh(false))
	back=button(actions,"Back",close_studio)
	top.minimum_size_changed.connect(queue_layout)
	tray.minimum_size_changed.connect(queue_layout)
	resized.connect(queue_layout)
	hide()

func frame() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel",game.panel_bg_style)
	add_child(p)
	return p

func button(parent: Node, text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text=text
	b.custom_minimum_size=Vector2(44,44)
	b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	game.style_game_button(b)
	b.add_theme_font_size_override("font_size",12)
	b.pressed.connect(action)
	parent.add_child(b)
	return b

func open_studio(prefer_posted: bool=false) -> bool:
	if visible: return true
	if not game.block_opened or game.startup_story_pending or game.is_story_card_visible() or not game.current_path.is_empty() or game.is_focused_activity_visible():
		return refuse("Open the block, finish walking or use Stop Walking, and close any chapter or activity before planning.")
	if not game.hosting_order.is_empty() and not game.is_hosting_done():
		return refuse("Finish hosting this gathering before revising a future plan. Host Activity or Z continues the current programme.")
	return_focus=get_viewport().gui_get_focus_owner()
	saved_visibility.clear()
	for c in get_parent().get_children():
		if c is Control and c!=self: saved_visibility[c]=c.visible
	selected="stories"
	posted=prefer_posted and game.programme_issue(game.programme_published)==""
	budget_notice=""
	show()
	for c in saved_visibility: c.visible=false
	game.pointer_active=false
	game.orbit_dragging=false
	refresh(true)
	fit_layout()
	cards[0].grab_focus()
	return true

func refuse(message: String) -> bool:
	if game.block_opened and not game.is_focused_activity_visible() and not game.is_story_card_visible(): game.show_block_panel(true)
	game.last_panel_dialogue="Programme Studio: "+message
	game.info.text=message+"\nCity / PDDL | Streets OpenStreetMap / ODbL"
	game.update_block_ui()
	game.announce_a11y_status(message)
	return false

func close_studio(announce: bool=true) -> void:
	if not visible: return
	hide()
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=saved_visibility[c]
	if not budget_notice.is_empty():
		game.last_panel_dialogue="Programme Studio: "+budget_notice
		game.info.text=budget_notice+"\nCity / PDDL | Streets OpenStreetMap / ODbL"
	game.update_block_ui()
	game.layout_walking_controls_and_hub()
	if is_instance_valid(return_focus) and return_focus.is_visible_in_tree(): return_focus.grab_focus()
	elif game.block_programme_btn.is_visible_in_tree(): game.block_programme_btn.grab_focus()
	if announce: game.announce_a11y_status("Back to the block. "+(budget_notice if not budget_notice.is_empty() else "Draft, posted future plan and running gathering stay separate. Z keeps the quick path."))

func allow_envelope(next: Dictionary) -> bool:
	# The existing import contract permits oversized optional metadata in memory.
	# Never grow that profile or silently promise persistence for a refused write.
	next["save_seq"]=game.save_seq+1
	var old: Dictionary=game.build_save_envelope()
	var current_bytes := JSON.stringify(old).to_utf8_buffer().size()
	old["save_seq"]=game.save_seq+1
	var bytes := JSON.stringify(next).to_utf8_buffer().size()
	var old_bytes := JSON.stringify(old).to_utf8_buffer().size()
	if bytes<=game.SAVE_BUDGET_MAX_BYTES:
		budget_notice=""
		return true
	if current_bytes>game.SAVE_BUDGET_MAX_BYTES and bytes<=old_bytes:
		budget_notice="Visit-only change: this imported profile is too large to save. The last stored save stays unchanged; reload restores it."
		return true
	budget_notice="Change not made: this imported profile has no saving room for it. The last stored save stays unchanged."
	refresh(true)
	return false

func allow_draft(order: Array, publishing: bool=false) -> bool:
	var next: Dictionary=game.build_save_envelope()
	next.programme.order=order.duplicate()
	if publishing: next.programme.published=order.duplicate()
	return allow_envelope(next)

func toggle_card() -> void:
	if not visible or posted: return
	var next: Array=game.programme_order.duplicate()
	if next.has(selected): next.erase(selected)
	else: next.append(selected)
	if not allow_draft(next): return
	if game.programme_order.has(selected): game.programme_remove(selected)
	else: game.programme_add(selected)
	refresh(true)
	edits[0].grab_focus()

func move_card(direction: int) -> void:
	if not visible or posted: return
	var next: Array=game.programme_order.duplicate()
	var index := next.find(selected)
	var to := index+(-1 if direction<0 else 1)
	if index<0 or to<0 or to>=next.size(): return
	var other: Variant=next[to]
	next[to]=next[index]
	next[index]=other
	if not allow_draft(next) or not game.programme_move(selected,direction): return
	refresh(false)
	var at: int=game.programme_order.find(selected)
	(edits[1] if direction<0 and at>0 else (edits[2] if at<game.programme_order.size()-1 else edits[1])).grab_focus()
	game.announce_a11y_status("%s is now %d of %d."%[game.programme_title(selected),at+1,game.programme_order.size()])

func advance() -> void:
	if not visible or primary.disabled: return
	if game.is_hosting_ready_to_start() and (posted or game.programme_order==game.programme_published):
		var next: Dictionary=game.build_save_envelope()
		next.hosting={"order":game.programme_published.duplicate(),"results":[],"draft":game.default_hosting_draft()}
		if not allow_envelope(next): return
		close_studio(false)
		game.advance_programme_and_hosting_step()
		if not budget_notice.is_empty():
			game.last_panel_dialogue+="\n"+budget_notice
			game.info.text=budget_notice+"\n"+game.info.text
			game.update_block_ui()
			game.announce_a11y_status(budget_notice)
	elif allow_draft(game.programme_order,true) and game.programme_publish():
		posted=true
		refresh(false)
		view.grab_focus()

func replies(order: Array) -> Array[String]:
	if game.programme_issue(order)!="": return []
	var stories_first: bool=order.find("stories")<order.find("beats")
	var bea: String='“%s Thanks for finding a place for Dez’s workshop too.”'%['Stories first this time. I’ll bring one to open with.' if order[0]=="stories" else 'Stories before the rhythm this time. I’ll bring one to share.'] if stories_first else '“A quiet interval before our circle. That gives us room to listen after the rhythm. I’ll bring a story.”'
	var dez: String='“I can pick up a rhythm from the stories, if their tellers want that. Glad there’s room for both ideas next time.”' if stories_first else '“%s Bea and I have both got a place next time.”'%['We start with a rhythm and leave room to settle afterward.' if order[0]=="beats" else 'The rhythm comes before the stories, with room to settle afterward.']
	return [bea,dez,'“Our panel is %s. I’ll bring shapes people can arrange together. The programme is something we made together too.”'%["first","second","third","fourth"][order.find("art")],'“The quiet interval is %s. I like seeing a pause treated as part of the afternoon.”'%["first","second","third","fourth"][order.find("pause")]]

func description() -> String:
	var order: Array=game.programme_published if posted else game.programme_order
	var lines: Array[String]=[]
	if not budget_notice.is_empty(): lines.append(budget_notice)
	elif JSON.stringify(game.build_save_envelope()).to_utf8_buffer().size()>game.SAVE_BUDGET_MAX_BYTES: lines.append("This imported profile is too large to save. Non-growing edits are visit-only; the last stored save is kept.")
	if posted:
		lines.append("Posted future plan. "+game.programme_poster_heading(order)+". No date or real event is announced.")
		var answers := replies(order)
		for i in range(answers.size()): lines.append(OWNERS[i]+": "+answers[i])
		if answers.is_empty(): lines.append("Nothing posted yet. Return to Draft to add and arrange the four proposals.")
	else:
		lines.append(OWNERS[IDS.find(selected)]+": "+PITCHES[IDS.find(selected)])
		var issue: String=game.programme_issue(order)
		lines.append(issue if issue!="" else "All four proposals have room. Post this draft when you are ready.")
		lines.append("Draft differs from the posted plan." if order!=game.programme_published else "Draft matches the posted plan.")
	if not game.hosting_order.is_empty(): lines.append("This is a future plan. Revisions do not rewrite the gathering already started: "+order_text(game.hosting_order)+".")
	else: lines.append("Posting copies the draft. Start Hosting copies that posted order; listening is welcome.")
	lines.append("Pinboard order: "+order_text(order)+". Original imagined paper, not a real event poster.")
	return "\n".join(lines)

func order_text(order: Array) -> String:
	var names: Array[String]=[]
	for id in order: names.append(game.programme_title(id))
	return " -> ".join(names) if not names.is_empty() else "no cards yet"

func refresh(announce: bool) -> void:
	heading.text="Programme Studio | "+("Posted future plan" if posted else "Draft pinboard")
	var text := description()
	if reader.text!=text: reader.text=text; reader.get_v_scroll_bar().value=0
	for i in range(4):
		var at: int=(game.programme_published if posted else game.programme_order).find(IDS[i])
		cards[i].text=(str(at+1)+". " if at>=0 else "+ ")+game.programme_title(IDS[i])+"\n"+OWNERS[i]
		cards[i].set_pressed_no_signal(selected==IDS[i])
		cards[i].accessibility_name=cards[i].text+(" selected" if selected==IDS[i] else "")
	var index: int=game.programme_order.find(selected)
	edits[0].text="Remove" if index>=0 else "Add"
	edits[0].disabled=posted
	edits[1].disabled=posted or index<=0
	edits[2].disabled=posted or index<0 or index>=game.programme_order.size()-1
	var start: bool=game.is_hosting_ready_to_start() and (posted or game.programme_order==game.programme_published)
	primary.text="Start hosting" if start else (("Post" if game.programme_published.is_empty() else "Post revision") if game.programme_order!=game.programme_published or game.programme_published.is_empty() else "Posted")
	primary.disabled=not start and (game.programme_issue(game.programme_order)!="" or game.programme_order==game.programme_published)
	view.text="Draft" if posted else "Posted"
	music.text="Music: On" if game.music_playing else "Music: Off"
	picture.texture=texture(game.programme_published if posted else game.programme_order)
	var ring: Array[Control]=[reader]
	for b in cards+edits+[primary,view,music,back]:
		if not b.disabled:
			ring.append(b)
			if not cards.has(b): b.accessibility_name=b.text
	for i in range(ring.size()):
		ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()])
		ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	queue_layout()
	if announce: game.announce_a11y_status(heading.text+". "+text)

func _process(delta: float) -> void:
	if not visible: return
	if not game.block_opened: close_studio(false); return
	music.text="Music: On" if game.music_playing else "Music: Off"
	music.accessibility_name=music.text
	for c in saved_visibility:
		if is_instance_valid(c): c.visible=false
	snapshot_clock-=delta
	if snapshot_clock<=0: snapshot_clock=0.2; game.sync_web_a11y_status()

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true
	fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size()
	var width := minf(940,vp.x-12)
	top.position=Vector2((vp.x-width)*0.5,6)
	top.size=Vector2(width,0)
	top.size.y=top.get_combined_minimum_size().y
	var side: bool=vp.x>=game.SMALL_SIDE_HUB_MIN_WIDTH and vp.y<game.SIDE_HUB_MAX_HEIGHT
	tray.size=Vector2(280 if side else width,0)
	tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)*0.5,vp.y-tray.size.y-6)
	var area := Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	if side: area=Rect2(6,top.position.y+top.size.y+6,tray.position.x-12,vp.y-top.position.y-top.size.y-18)
	picture.position=area.position
	picture.size=Vector2(maxf(1,area.size.x),maxf(1,area.size.y))
	game.sync_web_a11y_status()

func artwork(order: Array) -> String:
	var colors := {"stories":"e5b66d","beats":"91bac2","art":"d9a2b2","pause":"a3b48c"}
	var glyphs := {"stories":'<path d="M10 10Q35 0 60 12Q85 0 110 10V78Q85 68 60 80Q35 68 10 78ZM60 12V80" fill="#fff4dc" stroke="#38594e" stroke-width="5"/>',"beats":'<ellipse cx="60" cy="25" rx="45" ry="18" fill="#fff4dc" stroke="#38594e" stroke-width="5"/><path d="M15 25L30 85Q60 102 90 85L105 25M35 40L85 83M85 40L35 83" fill="none" stroke="#38594e" stroke-width="5"/>',"art":'<path d="M12 55Q0 5 60 4Q120 4 110 55Q110 85 70 83Q60 78 70 65Q68 49 50 55Q30 80 12 55" fill="#fff4dc" stroke="#38594e" stroke-width="5"/><circle cx="30" cy="28" r="7" fill="#c88268"/><circle cx="60" cy="18" r="7" fill="#6b9c8b"/><circle cx="90" cy="33" r="7" fill="#ad7ca0"/>',"pause":'<path d="M30 82V42H85V82M22 42H95M35 82V100M80 82V100" fill="none" stroke="#38594e" stroke-width="7"/><path d="M50 25Q55 3 85 7Q80 30 50 25" fill="#fff4dc"/>'}
	var ink := ""
	for i in range(4):
		var id: String=order[i] if i<order.size() else ""
		var color: String=colors.get(id,"d5c4a5")
		ink+='<g transform="translate(65 %d)"><path d="M0 0L590 3 586 86 4 88Z" fill="#%s"/><path d="M135 24Q300 17 530 26M140 47L460 45M140 67Q350 61 510 66" fill="none" stroke="#fff4dc" stroke-width="6" opacity=".55"/><circle cx="12" cy="10" r="7" fill="#b46f50"/><g transform="translate(12 -1) scale(.85)">%s</g></g>'%[45+i*99,color,glyphs.get(id,"")]
	return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><rect width="720" height="480" rx="16" fill="#a47e54"/><path d="M25 25L700 20 693 459 20 452Z" fill="#edddb8"/><path d="M40 31H680M42 446H673" stroke="#d3bb8b" stroke-width="5"/>%s</svg>'%ink

func texture(order: Array) -> Texture2D:
	var key := ",".join(order)
	if textures.has(key): return textures[key]
	var image := Image.new()
	if image.load_svg_from_string(artwork(order))!=OK: return null
	image.generate_mipmaps()
	var tex := ImageTexture.create_from_image(image)
	if textures.size()>=8: textures.erase(textures.keys()[0])
	textures[key]=tex
	return tex

func snapshot() -> Dictionary:
	if not visible: return {"visible":false,"cache":textures.size()}
	var buttons: Array=[]
	for b in cards+edits+[primary,view,music,back]:
		var d: Dictionary=game.control_snapshot(b)
		d.merge({"visible":b.is_visible_in_tree(),"disabled":b.disabled,"text":b.text,"focused":b.has_focus()})
		buttons.append(d)
	var scroll := reader.get_v_scroll_bar()
	var focus := get_viewport().gui_get_focus_owner()
	return {"visible":visible,"selected":selected,"posted_view":posted,"draft":game.programme_order.duplicate(),"published":game.programme_published.duplicate(),"hosting":game.hosting_order.duplicate(),"issue":game.programme_issue(game.programme_order),"pitches":PITCHES,"replies":replies(game.programme_published),"text":reader.text,"buttons":buttons,"picture":game.control_snapshot(picture),"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"reader":game.control_snapshot(reader),"scroll":scroll.value,"scroll_max":maxf(0,scroll.max_value-scroll.page),"layout_pending":layout_pending,"cache":textures.size(),"focus_within":focus==self or (focus!=null and is_ancestor_of(focus))}
