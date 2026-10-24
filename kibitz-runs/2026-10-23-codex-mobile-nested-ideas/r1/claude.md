TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, docs/MOBILE_UI_BRIEF.md, the screenshot receipt, and the private screenshot itself, inspected only)

VERDICT: no. The goal (readable dialogue, no empty panel, fewer buttons) and the proposed method (three-way nested disclosure) diverge. The screenshot's defect comes from a layout branch, not from information architecture. Also, two of the tentative relabels ("Talk", "Reply") collide with what those controls actually do in source.

MUST-FIX BEFORE BUILD

1. [Goal vs method / "Tentative direction" + "Meaningful acceptance"] The plan never names the root cause shown in the screenshot.
   - The creator's canvas is about 390x660 CSS px. [ASSUMPTION: from the 588px-wide image, the canvas spans about 995/1280 px, scale ≈1.508.]
   - Because y >= COMPACT_ACTIVITY_MAX_HEIGHT=640 (main.gd:833), uses_compact_narrow_activities() is false (main.gd:6703-6705). The talk panel therefore takes the fixed-offset path: offset_top -368 / offset_bottom -176 (main.gd:6811,6815), a fixed ~192px box.
   - Inside that box the detail is min 30px (main.gd:6760) at 12px (main.gd:15099) and has no vertical expand. The leftover space falls below the rows. That is exactly the "unused space" plus the 1.5-line clipped dialogue in the image.
   - The walking grid also stays at 2 columns / -174 with 50px buttons (main.gd:6742-6747), so 12 buttons show at once.
   - Two of those 12 are duplicates. The walking "What's Next?" (main.gd:15544) and the talk "Next Step" (main.gd:15492) both call ask_whats_next(). "Walk & Talk (Next)" duplicates "Meet Thanh".
   - Fix: make step 1 of the slice a content-fit for narrow-portrait talk, reusing the existing fit pattern at main.gd:6796-6810 (hosting_choices / short_phone), with the detail taking the remainder. Hide the walking grid while talk is open on portrait phone. Add an acceptance metric: in the screenshot state, detail visible lines go up and the empty px under the last row is about 0. Disclosure trays come after this, not instead of it.

2. [Talk mode: "Reply ... contextual choices disclosed"] conv_action_btns are not replies.
   - Slot 0 is the objective action ("Go Meet X", main.gd:6499-6526; study_test.gd:1789 requires it).
   - In the layout chapter, slots 0/1 are the binary story decision Long Table / Open Floor (main.gd:6491-6495; study_test.gd:1847).
   - Loan "Return X" lives there too (main.gd:6497-6498).
   - Hiding these behind "Reply" hides the objective's required action, which contradicts the plan's own "objective never hidden".
   - "Reply" is also undefined against the existing Chat More / keep_chatting() (main.gd:6478-6484).
   - Fix: Reply = existing conv_chat_btn (keep_chatting). Next Step = existing conv_next_btn, which also discloses acts[] (this matches the brief's "Next Step exposes the current goal and its useful action"). Goodbye = conv_bye_btn. Exception: when acts contain layout_table/layout_floor or return_owner:*, show them inline, not disclosed.

3. [Walking primary row: "Next Step/Talk/Explore ... Stop replaces"] The existing walk_control is not "Talk".
   - It is the Walk/Stop toggle, and it is also the resume entry for four active stories: "Power Story", "Dog search", "Parade", "Election map" (main.gd:13655-13677, activate_walk_control main.gd:13679-13691).
   - The story modules poll game.walk_control.is_pressed() (power_story.gd:277, dog_story.gd:289, lantern_procession.gd:323, voting_story.gd:247).
   - A new "Talk" button would either strand story resume or need adaptation in four modules.
   - Fix: slot 2 IS the existing walk_control, with labels and behaviour unchanged. That makes "Stop replaces" true for free. Drop the "Talk" name and any new neighbor picker.

4. [Scope: phone vs short landscape; acceptance "559/599x360"] This contradicts existing gates.
   - is_narrow_layout() (x<600, main.gd:7089-7090) covers both portrait phones and 520-599 landscape.
   - Native (study_test.gd:3430-3441) and browser (godot-browser.mjs:690, 707) tests assert six complete original walking labels at 50px for 520-599 x <560 short walking.
   - The plan lists 559/599x360 as acceptance without saying whether those sizes get the new row.
   - Fix: gate the new row on vp.x < SMALL_SIDE_HUB_MIN_WIDTH (520, main.gd:832), portrait only. Declare 520-599 landscape and >=600 unchanged and regression-only. Or explicitly adopt them and list the rewritten assertions. Choose one in the plan.

5. [Explore tray contains Find Me / Map] The return path from the map gets buried.
   - Find Me is the actual exit from wide overview (godot-browser.mjs:709, 846-847 tap Map, then Find Me).
   - With both inside Explore, getting from the map back to the street needs the tray reopened. That violates the brief's "visible path back to the street" (MOBILE_UI_BRIEF.md:11).
   - Fix: while in_wide_overview or in_overview, the Explore slot (or a primary) shows Find Me / "Back to me" directly.

6. [Hit-testing and snapshot architecture for any tray] The tray placement is unstated.
   - is_screen_point_in_ui() enumerates specific nodes (main.gd:14019-14038). Pinch admission (main.gd:14212) and tap-to-walk (main.gd:14541-14556) depend on it.
   - play_area_rect() only knows `controls` plus three panels (main.gd:6949-6964), and it drives camera framing and the guide arrow.
   - A tray above the grid will let taps through to walk and pinch, and it will overlap the player/arrow area.
   - walking_control_snapshots() casts every `controls` child to Button and reads btn.text (main.gd:11452-11456). A non-Button child parented under `controls` breaks the snapshot.
   - Fix: make the tray a sibling Control, not a child of `controls`. Register it in is_screen_point_in_ui() and play_area_rect().

SHOULD-FIX

1. ["at most 3 primary action buttons closed"] Is this per screen or per mode? In talk, the walking grid is also on screen (screenshot: 6 + 6).
   - Define it: portrait talk shows 3 talk primaries and hides the walking grid.
   - A Stop is not needed there: walk_to_neighbor() switches talk to hub mode (main.gd:8174-8176) and end_conversation() clears the path (main.gd:6450).
   - verify: whether resume_walking_view() hides block_panel, and whether any path leaves a route active with block_panel_mode=="talk".

2. [Acceptance viewport list] 390x568 and 320x568 exercise the compact branch (y<640). The creator's state is the non-compact branch (y>=640).
   - Add an iPhone-Chrome-like height of 640 or more (e.g. 390x664), plus the 639/640 boundary on both sides.
   - The plan treats "568" as representative of the screenshot. It is not.

3. ["readable 16px dialogue"] size_activity_detail() is shared (4 call sites in main.gd; it sets 12px when narrow, main.gd:15099). It also sizes the mural/music details (main.gd:6771-6773).
   - Scope 16px to block_detail_label in talk only, or explicitly accept the mural/music spillover and its test fallout.

4. [Explore -> All Actions depth] Explore -> All Actions -> paged hub (BLOCK_ACTIONS_PER_PAGE=4, 12 actions = 3 pages, main.gd:828, 836) -> item is 3 levels deep, against "shallow menus".
   - Route Explore's All Actions straight to the hub at the suggested page, reusing the "hub" branch of run_conversation_action_id (main.gd:6634-6638).
   - State that this is a new touch path: while walking, the hub is today reachable only via G (main.gd:14466-14467) or the talk "All Block Actions". It changes the reachability of Import Web Save and District Border on phone.

5. [Test adaptation: "minimize or adapt old tests"] This understates the work.
   - Browser tests index walking_controls by position: godot-browser.mjs:116-117, 350, 709, 712 ([5] = Stop), 846-847, 1096, 1112.
   - They also loop over every walking control asserting size and on-screen (765, 909).
   - walking_control_snapshots() has no visibility filter. Hidden buttons stay listed with stale rects.
   - Plan item: snapshot entries keep "visible". Each portrait-size test that iterates walking_controls must filter on visible and open the tray via a real tap before tapping Map/Find Me/Zoom. List these tests by line.

6. [Esc / ui_cancel precedence] Esc today means Stop or Goodbye (info text at main.gd:8207; button labels at main.gd:6680).
   - The tray's Back/Close must consume Esc first, without stopping a route or ending a talk.
   - verify: the Esc branch in _unhandled_input (main.gd:14302+).

7. [Hidden assumption: pinch replaces zoom buttons] The receipt (artifacts/mobile-chrome-20261023/creator-iphone-ui-20261023.receipt.json) says "GitHub-hosted build still does not pinch". 416b0a2 is not deployed and has no physical-iPhone acceptance.
   - On the creator's device, Zoom +/- are the only proven zoom.
   - The plan must not count pinch as a mitigation for moving zoom into the tray. Acceptance must cover zoom through the tray.

OPTIONAL / NICE-TO-HAVE
- Prior-art section: the project-native precedents are enough. They are the paged hub (layout_block_action_pages, main.gd:6842-6865), the story card's single Continue (main.gd:7112-7152), and the existing narrow label shortening (main.gd:6672-6680). No external research is needed.
- The short narrow "Next" label (main.gd:6751) and the talk "Next Step" (main.gd:6678) already converge. Use one label string for both.

CUT THESE
1. Header Music/Sounds/Info settings disclosure. The screenshot shows these three already share one 44px header row, so collapsing them recovers no vertical space. Music is also the creator's immediate mitigation for the open choppy-audio issue. music_toggle_control/text is in the a11y snapshot (main.gd:11584-11585). Safe to defer with that explanation.
2. A "Talk exposes nearby conversation choices" neighbor picker (MOBILE_UI_BRIEF.md:9). It duplicates walk_control (choose_next_neighbor) and the proximity talk prompt. It is new UI with no screenshot evidence behind it.
3. A Next Step tray in the walking row. The objective is already persistent in the header objective_label (main.gd:15354-15360) and the guide arrow. The walking Next Step can stay a direct ask_whats_next(), with zero new disclosure.
4. Any change at >=520 width (landscape dock, desktop) in this slice. The evidence is a single portrait screenshot, and the 520-599 dock code is intricate and heavily asserted (see MUST-FIX 4).

Recommended bounded slice, for the judge's comparison:
(a) Portrait-only (x<520) content-fit talk panel, with the detail taking the remaining space and the walking grid hidden during talk.
(b) Talk primaries: Chat More / Next Step (discloses acts, except required story choices, which stay inline) / Goodbye.
(c) Walking primaries: Next Step (direct) / walk_control (unchanged, carrying Stop and story resume) / Explore (a sibling tray with Map, Find Me, Zoom +/-, All Actions). Explore shows Find Me directly while in overview.
Everything else stays deferred.
