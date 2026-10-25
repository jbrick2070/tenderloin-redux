extends RefCounted
## Formal isolated component coverage; browser progression separately proves acquisition.
static func verify(suite: SceneTree, study: Node, full: String) -> void:
	suite.require(study.is_test_suite_mode(),"meal checks require formal isolated profile")
	var meal: Node=study.shared_meal
	var original_size: Vector2i=suite.root.size
	var recipe_art: Dictionary={}
	for layout in ["table","floor"]:
		for size in [Vector2i(1100,760),Vector2i(390,667),Vector2i(320,667),Vector2i(390,568),Vector2i(320,568),Vector2i(559,360)]:
			suite.root.size=size
			var profile: Dictionary=JSON.parse_string(full); profile.gathering_layout=layout
			suite.require(study.apply_save_envelope(JSON.stringify(profile)),"meal starts from accepted full profile with chosen existing layout")
			study.hide_story_card(); study.startup_story_pending=false
			study.last_story_chapter=int(study.current_chapter().num)
			# Settle the viewport's deferred Overview refit before opening the hub.
			# This component scenario deliberately owns a manual street camera.
			study.following_player=false; study.in_overview=false; study.in_wide_overview=false
			for frame in range(8): await suite.process_frame
			study.show_block_panel(true)
			for frame in range(8): await suite.process_frame
			for page in range(study.block_action_page_count()):
				if study.block_meal_btn.is_visible_in_tree(): break
				await suite.phone_accept(study.block_page_next)
			var before: String=JSON.stringify(study.build_save_envelope())
			var file: String=FileAccess.get_file_as_string(study.save_path)
			var settings: String=FileAccess.get_file_as_string(study.settings_path)
			var quiet: Array=[study.music_playing,study.music_volume,study.reward_sounds_enabled,study.music_mode]
			var cues: int=study.reward_sound_count
			var pose: Array=study.panel_camera_pose()
			var player: Vector3=study.player.position
			await suite.phone_accept(study.block_meal_btn)
			suite.require(meal.visible and meal.revealed==1 and meal.selected==0,"actual hub meal opens first cook without future titles")
			if not meal.visible:
				print("MEAL_OPEN_DIAGNOSTIC ",JSON.stringify({"size":size,"layout":layout,"startup":study.startup_story_pending,"story_card":study.is_story_card_visible(),"active_story":study.active_story_episode()!=null,"route":not study.current_path.is_empty(),"hosting_order":study.hosting_order.size(),"hosting_done":study.is_hosting_done(),"announcement":study.last_a11y_announcement,"entry":study.control_snapshot(study.block_meal_btn)}))
				return
			suite.require(not meal.select_cook(1) and not meal.share_dish(),"unearned cook and premature share refuse without progress")
			for cook in range(4):
				suite.require(meal.selected==cook,"Follow selects the personally invited next cook")
				await suite.phone_accept(meal.serving_buttons[cook%2])
				await suite.phone_accept(meal.placement_buttons[cook%2])
				for step in range(5):
					check_layout(suite,meal,size)
					var previous_step: int=meal.steps[cook]
					await suite.phone_accept(meal.prepare)
					suite.require(meal.steps[cook]==previous_step+1,"named actual next-step control transforms this dish once")
					if layout=="table" and size==Vector2i(390,667) and cook==0 and step==2:
						for resized in [Vector2i(559,360),size]:
							suite.root.size=resized
							for frame in range(8): await suite.process_frame
							check_layout(suite,meal,resized)
							suite.require(meal.visible and meal.snapshot().focus_within and meal.steps[0]==3,"open meal resize across portrait/side preserves focus and exact preparation")
				var art: int=hash(meal.picture.texture.get_image().get_data())
				recipe_art[cook]=art
				suite.require(not meal.shared.has(cook),"prepared food is not shared automatically")
				await suite.phone_accept(meal.share)
				suite.require(meal.shared.has(cook) and int(meal.shared[cook].serving)==cook%2,"deliberate Share copies actual serving choice")
				suite.require(meal.revealed==mini(4,cook+2) and meal.share.text=="Follow this invitation","specific recognition reveals retained next invitation")
				suite.require(meal.reader.text.contains(String(meal.DATA.RECIPES[cook].recognition[cook%2])),"recognition matches this dish and serving choice")
				check_world(suite,meal,layout)
				suite.require(JSON.stringify(study.build_save_envelope())==before and file==FileAccess.get_file_as_string(study.save_path),"preparation/Share/invitation never write earned save or sequence")
				if cook==0:
					await suite.phone_accept(meal.explore)
					suite.require(not meal.visible and meal.invitation==1 and meal.shared.size()==1,"Keep exploring retains copied meal and invitation")
					await suite.phone_accept(study.block_meal_btn)
					suite.require(meal.selected==0 and meal.share.text=="Follow this invitation","reopen retains exact current visit")
				if cook<3: await suite.phone_accept(meal.share)
			var distinct: Dictionary={}
			for key in recipe_art: distinct[recipe_art[key]]=true
			suite.require(distinct.size()==4,"all four actual rasterized finished dishes differ")
			# A new draft cannot silently replace an already shared plate.
			await suite.phone_accept(meal.share)
			suite.require(meal.selected==0,"last invitation returns to an already revealed cook")
			var copied: Dictionary=meal.shared[0].duplicate(true)
			await suite.phone_accept(meal.prepare)
			await suite.phone_accept(meal.serving_buttons[1])
			suite.require(meal.steps[0]==0 and meal.shared[0]==copied,"Try another preparation retains the copied served result")
			for step in range(5): await suite.phone_accept(meal.prepare)
			await suite.phone_accept(meal.share)
			suite.require(int(meal.shared[0].serving)==1 and int(meal.shared[0].generation)>int(copied.generation) and meal.revealed==4,"deliberate repeat Share replaces plate without another unlock")
			var key := InputEventKey.new(); key.keycode=KEY_W; key.pressed=true; Input.parse_input_event(key)
			for frame in range(8): await suite.process_frame
			key.pressed=false; Input.parse_input_event(key)
			suite.require(study.player.position==player and study.current_path.is_empty(),"held walking input cannot leave the meal reader")
			await suite.phone_escape()
			suite.require(not meal.visible and meal.revealed==4 and meal.shared.size()==4,"Escape keeps the completed meal for this visit")
			suite.require(study.panel_camera_pose()==pose,"meal entry/preparation/switching/Share/close preserve exact manual camera")
			suite.require(quiet==[study.music_playing,study.music_volume,study.reward_sounds_enabled,study.music_mode] and study.reward_sound_count==cues,"meal preserves quiet/volume and emits no new reward sound")
			suite.require(before==JSON.stringify(study.build_save_envelope()) and file==FileAccess.get_file_as_string(study.save_path) and settings==FileAccess.get_file_as_string(study.settings_path),"whole meal visit leaves saves/settings untouched")
			suite.require(meal.textures.size()<=8,"meal raster cache is bounded")
	suite.require(not study.import_browser_save_json("{}") and meal.shared.size()==4,"rejected browser import preserves the current visit")
	# The existing native-load contract recovers malformed saves through reset.
	# Meal state follows that reset instead of overriding core recovery behavior.
	suite.require(not study.apply_save_envelope("{}") and meal.shared.is_empty() and meal.revealed==1,"malformed native profile recovery resets the transient meal")
	suite.require(study.apply_save_envelope(full) and meal.shared.is_empty() and meal.revealed==1,"successful load clears transient meal and invitations")
	meal.shared[0]={"serving":0,"placement":0,"generation":0}; meal.revealed=2
	study.reset_mural_state_to_defaults("fresh")
	suite.require(meal.shared.is_empty() and meal.revealed==1,"reset clears meal visit")
	suite.require(not meal.open_meal() and study.block_meal_btn.modulate.a<0.6 and study.block_meal_btn.tooltip_text.contains("Unlocks later"),"fresh meal entry honestly explains and dims its gathering prerequisite")
	meal.shared[0]={"serving":0,"placement":0,"generation":0}; meal.revealed=2
	suite.require(study.import_browser_save_json('{"version":1,"core":{"greeted":true}}') and meal.shared.is_empty() and meal.revealed==1,"successful opt-in legacy import clears meal visit without a new save field")
	study.apply_save_envelope(full); study.hide_story_card(); study.startup_story_pending=false
	study.power_story.active=true
	suite.require(not meal.open_meal(),"meal refuses active story world ownership")
	study.power_story.active=false
	study.hosting_order.assign(["stories"]); study.hosting_results.clear()
	suite.require(not meal.open_meal(),"meal refuses unfinished hosting")
	study.apply_save_envelope(full); study.hide_story_card(); study.startup_story_pending=false
	suite.root.size=original_size
	print("SHARED_MEAL_PASS:4dishes/2layouts/6sizes/realui_accept/20namedsteps/openresize/copiedfood/invitations/revisit/manual/quiet/nosave/profileboundaries")

static func check_layout(suite: SceneTree,meal: Node,size: Vector2i) -> void:
	var s: Dictionary=meal.snapshot()
	var screen := Rect2(Vector2.ZERO,Vector2(size))
	suite.require(s.font_size==16 and s.reader.height>=(80 if size.y<500 else 96),"complete meal instructions use16px readable scrollable surface")
	for name in ["top","tray","picture"]:
		var b: Dictionary=s[name]
		suite.require(screen.encloses(Rect2(b.x,b.y,b.width,b.height)),"meal art and panels fit supported viewport")
	suite.require(s.picture.height>=90,"meal leaves a meaningful original food illustration")
	for b in s.buttons:
		if b.visible: suite.require(b.width>=44 and b.height>=44 and b.text_fits and screen.encloses(Rect2(b.x,b.y,b.width,b.height)),"complete named meal controls fit at actual font/44px targets")

static func check_world(suite: SceneTree,meal: Node,layout: String) -> void:
	var li: int=0 if layout=="table" else 1
	for i in range(4):
		var food: MeshInstance3D=meal.dishes[li][i]
		suite.require(food.is_visible_in_tree()==meal.shared.has(i),"only deliberately shared dishes appear in active layout")
		if not meal.shared.has(i): continue
		var area := Rect2(-4.6,-0.45,9.2,0.9) if li==0 else Rect2(-3.2,-0.05,2.6,1.2)
		var rect := Rect2(food.position.x-0.35,food.position.z-0.23333335,0.7,0.4666667)
		suite.require(area.grow(0.0001).encloses(rect),"food quads stay supported by existing table or explicit portable cloth")
		var other: bool=int(meal.shared[i].placement)==1
		if li==0:
			suite.require(food.position.z>0.1 if other else food.position.z< -0.1,"table placement reaches a distinct supported edge")
			for cup_x in [-2.2,-0.9,0.9,2.2]:
				suite.require(not rect.grow(0.045).has_point(Vector2(cup_x,0.2)),"copied meal leaves every original cup clear")
			suite.require(not rect.grow(0.12).has_point(Vector2.ZERO),"copied meal leaves original teapot clear")
		else:
			var base_x: float=-2.7+float(i%2)*1.4
			suite.require(food.position.x-base_x>0.19 if other else absf(food.position.x-base_x)<0.001,"cloth placement has a visible twenty-centimetre alternative")
		suite.require(food.material_override.albedo_texture!=null,"shared world food has actual original texture")
