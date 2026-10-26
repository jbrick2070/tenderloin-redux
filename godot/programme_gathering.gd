extends Control
## A second afternoon for this visit. Original progress and world props stay canonical.
const Hosted := preload("res://hosted_afternoon.gd")
const OPENINGS := {"stories":"Bea: I unfold our invitation again. There is room to pass, and room to listen.","beats":"Dez: We can begin by noticing the spaces in our rhythm.","art":"Celeste: I'll set our original six shapes where everyone can see them.","pause":"Thanh: Let's begin with somewhere to sit, without a task to finish."}
const HANDOFFS := {
	"stories>beats":["Bea offers Dez the last turn; he answers with the spaces in our rhythm.","Bea lets the last words settle. Dez joins after the held moment."],
	"stories>art":["Bea invites Celeste to answer the circle with its six shapes.","Celeste waits while Bea folds the paper, then sets out our panel."],
	"stories>pause":["Bea asks Thanh to carry the welcome over to the seats.","Thanh leaves a quiet opening after Bea's circle; nobody has to fill it."],
	"beats>art":["Dez hands the turn to Celeste: six shapes can answer eight slots.","Dez leaves his last slot open. Celeste lets our colors arrive quietly."],
	"beats>pause":["Dez invites Thanh to make the spaces in our rhythm somewhere to sit.","Dez lowers his hands. Thanh holds the quiet without calling anyone forward."],
	"art>stories":["Celeste offers Bea a turn beside the panel; the invitation stays open.","Celeste steps back from the colors. Bea opens the paper in the space left."],
	"art>beats":["Celeste invites Dez to answer our shapes with his eight-slot pattern.","Celeste leaves the panel standing. Dez takes a moment before joining."],
	"art>pause":["Celeste asks Thanh to bring the welcome from the panel to the seats.","Celeste leaves the shapes to look at. Thanh makes room for an unhurried pause."],
	"pause>stories":["Thanh invites Bea from the quiet seats; listening has already begun.","Thanh keeps the open seat free. Bea unfolds the invitation without a summons."],
	"pause>beats":["Thanh offers Dez the next turn, with a place for anyone who only listens.","Thanh holds the quiet a little longer. Dez joins without filling every space."],
	"pause>art":["Thanh invites Celeste to bring the six shapes into our shared view.","Thanh leaves room to come and go. Celeste sets out our panel without a call."]
}
var studio: Control
var game: Node
var top: PanelContainer
var heading: Label
var tray: PanelContainer
var reader: RichTextLabel
var choices: Array[Button]=[]
var previous: Button
var next: Button
var back: Button
var keep: Button
var order: Array=[]
var copies: Dictionary={}
var gestures: Array=[]
var painted: Dictionary={}
var completed := false
var review_step := 0
var notice := ""
var art_rect := Rect2()
var layout_pending := false
var held_on_exit: Array[int]=[]

func setup(owner_studio: Control) -> void:
	studio=owner_studio; game=studio.game; name="ProgrammeGathering"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); mouse_filter=Control.MOUSE_FILTER_STOP
	top=frame(); heading=Label.new(); heading.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; heading.add_theme_font_size_override("font_size",16); top.add_child(heading)
	tray=frame(); var box := VBoxContainer.new(); box.add_theme_constant_override("separation",4); tray.add_child(box)
	reader=game.make_activity_detail(); reader.add_theme_font_size_override("normal_font_size",16); box.add_child(reader)
	var row := HBoxContainer.new(); box.add_child(row)
	for i in range(2):
		var gesture := i; choices.append(studio.button(row,"",func(): handoff(gesture)))
	row=HBoxContainer.new(); box.add_child(row)
	previous=studio.button(row,"Previous",func(): review(-1)); next=studio.button(row,"Finish gathering",advance)
	row=HBoxContainer.new(); box.add_child(row)
	back=studio.button(row,"Back to Posted",back_to_studio); keep=studio.button(row,"Keep exploring",func(): studio.close_studio())
	resized.connect(queue_layout); top.minimum_size_changed.connect(queue_layout); tray.minimum_size_changed.connect(queue_layout)
	hide()

func frame() -> PanelContainer:
	var node := PanelContainer.new(); node.add_theme_stylebox_override("panel",game.panel_bg_style); add_child(node); return node

func title() -> String:
	return "Gather again" if order.is_empty() else ("Revisit gathering" if completed else "Resume gathering")

func refuse(message: String) -> bool:
	notice=message
	if visible: refresh(true)
	else: studio.refresh(false); game.announce_a11y_status(message)
	return false

func prepare() -> bool:
	if not game.is_hosting_done() or game.programme_issue(game.programme_published)!="": return refuse("Gathering not started: finish the first afternoon and post a valid four-part plan. Your previous visit stays intact.")
	var prepared := {}
	for id in Hosted.IDS:
		var result: Dictionary=Hosted.copied(game,id)
		if not result.valid: return refuse("Gathering not started: an original copied contribution is unavailable. Your previous visit and saved afternoon stay intact.")
		prepared[id]=result.value
	var textures := {"stories":game.bea_invitation.texture(prepared.stories),"art":game.shared_panel.texture(prepared.art,false)}
	if textures.stories==null or textures.art==null: return refuse("Gathering not started: the original pictures could not be prepared. Your previous visit stays intact.")
	order=game.programme_published.duplicate(); copies=prepared.duplicate(true); painted=textures; gestures.clear(); completed=false; review_step=0; notice=""
	return true

func open_gathering() -> bool:
	if not studio.visible or not studio.posted or studio.hosted_view: return false
	if order.is_empty() and not prepare(): return false
	notice=""; show(); studio.set_gathering_visible(true); refresh(false); fit_layout(); reader.grab_focus()
	game.announce_a11y_status(title()+". "+response()); return true

func back_to_studio() -> void:
	if not visible: return
	pause_for_exit(); studio.posted=true; studio.hosted_view=false; studio.refresh(false); studio.primary.grab_focus()
	game.announce_a11y_status("Back to Posted. "+title()+" keeps this visit's copied order and handoffs, even if you edit or repost.")

func pause_for_exit() -> bool:
	var was_visible := visible
	if studio.visible and not order.is_empty():
		for key in [KEY_W,KEY_A,KEY_S,KEY_D,KEY_UP,KEY_DOWN,KEY_LEFT,KEY_RIGHT]:
			if (Input.is_key_pressed(key) or Input.is_physical_key_pressed(key)) and not held_on_exit.has(key): held_on_exit.append(key)
	hide(); studio.set_gathering_visible(false); return was_visible

func release_pending() -> bool:
	for i in range(held_on_exit.size()-1,-1,-1):
		if not Input.is_key_pressed(held_on_exit[i]) and not Input.is_physical_key_pressed(held_on_exit[i]): held_on_exit.remove_at(i)
	return not held_on_exit.is_empty()

func reset_visit() -> void:
	pause_for_exit(); order.clear(); copies.clear(); painted.clear(); gestures.clear(); completed=false; review_step=0; notice=""

func handoff(gesture: int) -> void:
	if visible and completed and review_step==gestures.size() and gesture==0:
		if prepare(): refresh(false); reader.grab_focus(); game.announce_a11y_status("New visit copied. "+response())
		return
	if not visible or completed or gesture<0 or gesture>1 or gestures.size()>=3 or review_step!=gestures.size(): return
	gestures.append(gesture); review_step=gestures.size(); notice=""; refresh(false); reader.grab_focus(); game.announce_a11y_status(response())

func review(direction: int) -> void:
	if not visible or order.is_empty(): return
	review_step=clampi(review_step+direction,0,gestures.size()); refresh(false); reader.grab_focus(); game.announce_a11y_status(response())

func advance() -> void:
	if not visible: return
	if review_step<gestures.size(): review(1)
	elif not completed and gestures.size()==3:
		completed=true; refresh(false); reader.grab_focus(); game.announce_a11y_status("Gathering complete this visit. "+closure())

func contribution(id: String) -> String:
	match id:
		"stories": return 'Bea: Our invitation, "%s", is the original copy. No personal story or notes were recorded.'%game.bea_invitation.TITLES[copies.stories]
		"beats":
			var slots: Array[String]=[]
			for i in range(8):
				if int(copies.beats)&(1<<i): slots.append(str(i+1))
			return "Dez: Listening only, zero marked beats. The empty slots are welcome." if slots.is_empty() else "Dez: Our original taps stay in slots %s. The picture is silent; the spaces count too."%", ".join(slots)
		"art": return "Celeste: These are our original six shapes in %s colors, in their original arrangement."%copies.art.palette
		"pause": return "Thanh: Our original %s still leaves a place for someone to join or pass."%("open arc" if copies.pause=="arc" else "pair and open seat")
	return ""

func response() -> String:
	if order.is_empty(): return ""
	var text: String=OPENINGS[order[0]] if review_step==0 else HANDOFFS[order[review_step-1]+">"+order[review_step]][gestures[review_step-1]]
	return text+"\n"+contribution(order[review_step])

func closure() -> String:
	return "Bea: We carried the welcome through all four parts. Listening Hour, the film and the ending keep our first afternoon's records. This gathering and its handoffs stay only for this visit."

func description() -> String:
	var text := response()
	if completed: text+="\n"+closure()
	elif review_step==gestures.size(): text+="\nChoose how to welcome the next resident." if gestures.size()<3 else "\nAll four contributions are here. Finish gathering when you are ready."
	text+="\nCopied order: "+studio.order_text(order)+". "+("The same order as our first afternoon, with a new welcome." if order==game.hosting_order else "A different order, with our original contributions.")
	text+="\nInvite joins turns; Make room holds an opening. Back edits the pinboard without changing this copy. Keep exploring retains it under Posted. Reload or successful import clears this visit; the saved afternoon keeps the invitation."
	if not notice.is_empty(): text=notice+"\n"+text
	return text

func refresh(announce: bool) -> void:
	if order.is_empty(): return
	heading.text="Gather again | "+("Afternoon revisited" if completed else "A welcome in four parts")+"\nFictional gathering | Original copies | This visit only"
	var text := description()
	if reader.text!=text: reader.text=text; reader.get_v_scroll_bar().value=0
	var choosing := not completed and review_step==gestures.size() and gestures.size()<3
	var restart := completed and review_step==gestures.size()
	choices[0].text="Invite "+Hosted.OWNERS[Hosted.IDS.find(order[mini(3,review_step+1)])]; choices[1].text="Make room"
	for b in choices: b.visible=choosing; b.disabled=not choosing
	if restart: choices[0].text="New visit" if order==game.programme_published else "New posted plan"; choices[0].show(); choices[0].disabled=false
	previous.visible=review_step>0; previous.disabled=review_step==0
	next.visible=not choosing; next.disabled=choosing or restart
	next.text="Next handoff" if review_step<gestures.size() else ("Complete" if completed else "Finish gathering")
	var ring: Array[Control]=[reader]
	for b in choices+[previous,next,back,keep]:
		if b.visible and not b.disabled: b.accessibility_name=b.text; ring.append(b)
	for i in range(ring.size()): ring[i].focus_next=ring[i].get_path_to(ring[(i+1)%ring.size()]); ring[i].focus_previous=ring[i].get_path_to(ring[posmod(i-1,ring.size())])
	queue_layout(); queue_redraw()
	if announce: game.announce_a11y_status(notice if not notice.is_empty() else response())

func queue_layout() -> void:
	if not visible or layout_pending: return
	layout_pending=true; fit_layout.call_deferred()

func fit_layout() -> void:
	layout_pending=false
	if not visible: return
	var vp: Vector2=game.bubble_viewport_size(); var width := minf(940,vp.x-12)
	top.position=Vector2((vp.x-width)/2,6); top.size=Vector2(width,0); top.size.y=top.get_combined_minimum_size().y
	var side: bool=vp.x>=game.SMALL_SIDE_HUB_MIN_WIDTH and vp.y<game.SIDE_HUB_MAX_HEIGHT
	reader.custom_minimum_size.y=64 if side or vp.y<600 else 112
	tray.size=Vector2(280 if side else width,0); tray.size.y=tray.get_combined_minimum_size().y
	tray.position=Vector2(vp.x-tray.size.x-6,vp.y-tray.size.y-6) if side else Vector2((vp.x-width)/2,vp.y-tray.size.y-6)
	art_rect=Rect2(6,top.position.y+top.size.y+6,tray.position.x-12,vp.y-top.position.y-top.size.y-18) if side else Rect2(top.position.x,top.position.y+top.size.y+6,width,tray.position.y-top.position.y-top.size.y-12)
	queue_redraw(); game.sync_web_a11y_status()

func card_rect(index: int) -> Rect2:
	var cell := Vector2((art_rect.size.x-12)/2,(art_rect.size.y-12)/2)
	var p: Vector2=[Vector2(0,0),Vector2(1,0),Vector2(1,1),Vector2(0,1)][index]
	return Rect2(art_rect.position+p*(cell+Vector2(12,12)),cell)

func prop_rect(index: int) -> Rect2:
	var r := card_rect(index); var area := Rect2(r.position+Vector2(6,23),r.size-Vector2(12,43)); var scale := maxf(0.01,minf(area.size.x/360,area.size.y/240))
	return Rect2(area.position+(area.size-Vector2(360,240)*scale)/2,Vector2(360,240)*scale)

func _draw() -> void:
	if not visible or order.is_empty(): return
	draw_rect(Rect2(Vector2.ZERO,size),Color("203c38"))
	for i in range(4):
		var r := card_rect(i); var p := prop_rect(i); var id: String=order[i]
		draw_rect(r,Color("e7dcc0")); draw_rect(r.grow(-2),Color("e2a04e") if i==review_step else Color("526e65"),false,3)
		draw_string(ThemeDB.fallback_font,r.position+Vector2(7,17),str(i+1)+". "+Hosted.OWNERS[Hosted.IDS.find(id)],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color("182c38"))
		if painted.has(id): draw_texture_rect(painted[id],p,false)
		else:
			draw_set_transform(p.position,0,p.size/Vector2(360,240)); draw_rect(Rect2(0,0,360,240),Color("f8f0d9"))
			if id=="beats":
				for slot in range(8):
					var at := Vector2(32+(slot%4)*85,70+(slot/4)*100); draw_circle(at,24,Color("548b84") if int(copies.beats)&(1<<slot) else Color("d8cdb2")); draw_circle(at,24,Color("29434a"),false,3)
			else:
				var seats := [Vector2(62,140),Vector2(156,60),Vector2(250,140)] if copies.pause=="arc" else [Vector2(62,70),Vector2(62,140),Vector2(250,140)]
				for seat in range(3): draw_rect(Rect2(seats[seat],Vector2(45,40)),Color("e8b861") if seat==2 else Color("548b84")); draw_rect(Rect2(seats[seat],Vector2(45,40)),Color("29434a"),false,4)
			draw_set_transform(Vector2.ZERO)
		var mark := "Opening" if i==0 else ("Invite" if i<=gestures.size() and gestures[i-1]==0 else ("Make room" if i<=gestures.size() else "Not yet"))
		draw_string(ThemeDB.fallback_font,r.position+Vector2(7,r.size.y-6),mark,HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color("182c38"))
		if i>0 and i<=gestures.size():
			var center := (card_rect(i-1).get_center()+r.get_center())/2
			if gestures[i-1]==0: draw_line(center-Vector2(6,0),center+Vector2(6,0),Color("e8b861"),4); draw_circle(center,3,Color("f8f0d9"))
			else: draw_arc(center,5,0.3,2.8,12,Color("e8b861"),3)

func snapshot() -> Dictionary:
	var out := {"visible":is_visible_in_tree(),"order":order.duplicate(),"copies":copies.duplicate(true),"gestures":gestures.duplicate(),"completed":completed,"step":review_step,"held":held_on_exit.duplicate(),"layout_pending":layout_pending}
	if not is_visible_in_tree(): return out
	var buttons: Array=[]
	for b in choices+[previous,next,back,keep]:
		var value: Dictionary=game.control_snapshot(b); value.merge({"text":b.text,"visible":b.is_visible_in_tree(),"disabled":b.disabled,"focused":b.has_focus(),"words_fit":studio.button_words_fit(b)}); buttons.append(value)
	var props: Array=[]
	for i in range(4):
		var r := prop_rect(i); props.append({"id":order[i],"x":r.position.x,"y":r.position.y,"width":r.size.x,"height":r.size.y})
	var scroll := reader.get_v_scroll_bar()
	out.merge({"heading":heading.text,"text":reader.text,"response":response(),"buttons":buttons,"props":props,"top":game.control_snapshot(top),"tray":game.control_snapshot(tray),"reader":game.control_snapshot(reader),"scroll":scroll.value,"scroll_max":maxf(0,scroll.max_value-scroll.page),"scrollbar":game.control_snapshot(scroll),"art":{"x":art_rect.position.x,"y":art_rect.position.y,"width":art_rect.size.x,"height":art_rect.size.y},"reader_focused":reader.has_focus()})
	return out
