TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs successfully). No git/shell tool was available in this lane, so I could not see the diff against fd9ed98; I judged the current source as it stands. Where something may predate this change I say "verify pre-existing".

VERDICT: yes-with-fixes. The layout and reader routing are wired coherently. But the overview-resize refit lets the startup card's music lock leak, the browser "before" snapshot races that same refit, and two of the claimed reading checks pass without testing what they claim. The browser gate has also not run yet, per the input's "Browser pending".

MUST-FIX BEFORE BUILD

1. [Overview resize refit / audio consent] The Music toggle is re-enabled while startup is still pending after any overview resize.
   Order of events: resize_controls (main.gd:14464-14465) calls refit_after_layout (main.gd:13735). That calls overview() (main.gd:13742), which calls hide_story_card() (main.gd:13583), which sets music_toggle_btn.disabled = false (main.gd:6915-6916). The restore block then puts back story_card.visible and startup_story_pending (main.gd:13745-13749). It never calls update_music_ui(), the only place that sets disabled = startup_story_pending (main.gd:13884).
   Nothing else repairs it while music is off: the update_music_ui() calls at main.gd:10425/10440 sit on music playback paths, and the one at main.gd:14455-14456 only runs when the music panel is visible.
   Effect: after a phone rotation or URL-bar resize, the pre-Start Music toggle can be tapped. A tap does not count as a scene tap (the header is in is_screen_point_in_ui, main.gd:13092), so music can start while the card still shows "Start Exploring".
   Native test line study_test.gd:109 ("resizing startup preserves the Start contract") and line 210 check only pending and visibility, so they cannot catch this. The browser can't either: control_snapshot (main.gd:10966-10970) has no `disabled` field.
   Fix (smallest): call update_music_ui() right after main.gd:13748, or set music_toggle_btn.disabled = startup_story_pending there. Add require(study.music_toggle_btn.disabled) after study_test.gd:109 and :210. Add "disabled" to control_snapshot so the browser can assert music_toggle_control.disabled during reading (godot-browser.mjs:211).

2. [Browser pending: "seven real resize/reading cases"] The `before` snapshot races the overview refit, so the camera-pose assertion can fail intermittently. This is the exact trap the input says not to mistake.
   - godot-browser.mjs:170 waits only for viewport_width/height to match and story_detail.control.visible. It then captures `before` (line 171) and later asserts after.camera_pose deepEqual before.camera_pose (line 212).
   - The refit runs only after two awaited process_frames (main.gd:13736-13737) and then calls overview(), which moves the camera (main.gd:13622-13633).
   - The snapshot is published whenever a11y sync is pending (flush at main.gd:13030). Besides announcements, that happens on a 0.5 s timer (main.gd:7186-7188). So a timer flush in the 1-2 frames between resize_controls and the refit can publish a snapshot that already has the new viewport size but the old camera.
   - The native fixture fixed this by settling first (study_test.gd:148-155, "short_story_target = study.target"). The browser test has no equivalent.
   Fix: after line 170, also wait for two consecutive snapshots with ui_frame advanced and identical camera_pose/camera_view_size, or for the announcement to begin with "Overview:" when in_overview. Only then capture `before`.

3. [Native gate claim "actual PageDown/Down from Start focus"; browser "actual ... PageDown/ArrowDown"] The Down/ArrowDown part of these checks is vacuous, and the "from Start focus" label is wrong for Down.
   - study_test.gd:159-169: Start gets focus, then PageDown and Down are sent in sequence. PageDown runs main.gd:13266-13267, which moves focus to the reader, so Down is pressed with the reader focused, not Start. The single assertion `story_scroll.value > 0` (line 169) is already satisfied by PageDown alone.
   - The browser has the same shape: godot-browser.mjs:195-197 presses PageDown then ArrowDown and waits for scroll_value > 0.
   - What actually happens on Down from Start focus during startup is untested. main.gd:13279 accepts startup and starts music, because story_reader_has_focus() is false.
   Fix: record the scroll value after PageDown, assert story_reader_has_focus(), then assert Down strictly increases it. Add one explicit case: Start focused, startup pending, Down -> continue_story (or whatever the intended policy is). Then fix the claim text to match.

SHOULD-FIX

1. [New chapter resets scroll] No test resets the scroll when the text actually changes from a scrolled position.
   study_test.gd:132-143 scrolls chapter N to its end, then re-shows the same chapter (line 140) and asserts 0. The next loop iteration starts from an already-zeroed scroll. The browser never shows a second chapter.
   Verify: Godot's RichTextLabel.set_text returns early when the text is unchanged, and whether scroll_to_line(0) (main.gd:6905) before the new text is laid out is reliable.
   Fix: scroll chapter i to its end, call show_story_card(STORY_CHAPTERS[i+1]), await a frame, assert scroll value is 0.

2. [Focus/keyboard ownership] Space while reading accepts startup and starts music.
   With the reader focused, RichTextLabel does not consume Space, so _unhandled_input runs continue_story(true) (main.gd:13288-13289). That contradicts the "reading keys never accept" intent in the input. [ASSUMPTION] Web readers expect Space to page down.
   Fix: add KEY_SPACE to the reader-focused branch at main.gd:13265 (treat it as PageDown), or document it and add a test.

3. [Explicit Start/Enter/Escape policy] Any other unconsumed key during startup silently cancels it.
   main.gd:13293-13294 calls hide_story_card(). That clears startup_story_pending without frame_player_for_walking, music or the orientation announcement. Then the same key falls through to `match k` (e.g. KEY_1 -> walk_to_neighbor(0), main.gd:13296-13300), which acts in the overview camera. Verify pre-existing.
   Fix: while startup_story_pending, return after the policy keys instead of hiding.

4. [Startup contract split across call sites] The "startup card" state takes three steps, and only the caller knows the last two.
   show_story_card forces startup_story_pending = false (main.gd:6907). _ready then sets it to true and relabels the button (main.gd:1991-1993).
   Tests repeat this by hand about eight times (study_test.gd:120-122, 140-141, 146-147, 211-213, 233-234, 240-241, 248-249). Most omit the "Start Exploring" label, so the reading and focus fixtures (146-147) run with pending=true but a "Continue" button. That is not the production target.
   Fix: one show_startup_story_card(chapter) helper used by _ready and the tests.

5. [Audio consent claim] Reading gestures set reward_audio_unlocked.
   main.gd:13258-13261 runs before the reading branch at 13262, so PageDown, arrows, a click or a touch release on the reader all set reward_audio_unlocked = true. The native test quietly restores it (study_test.gd:214). The browser checks it only before reading (godot-browser.mjs:155) and after Start (:249).
   Fix: decide which is intended. If gesture unlock is fine, assert it is true after reading and drop the restore. If not, move the reading branch above the unlock.

6. [Overview resize refit / a11y] Every startup resize replaces the chapter announcement.
   overview() announces "Overview: N city footprints." (main.gd:13634) on each refit, overwriting the chapter text that show_story_card announced (main.gd:6911). On phones, address-bar show/hide fires this repeatedly.
   Fix: re-announce the chapter in the restore block at main.gd:13745-13749, or suppress overview()'s announcement there.

7. [Event fan-in] Refit coroutines are not coalesced.
   Each size_changed starts a new refit_after_layout coroutine (main.gd:14464-14465). A burst of resizes queues several overview() calls and several deferred grab_focus calls (main.gd:13749), and the last one wins. If the user presses PageDown inside that 2-frame window, a later coroutine may already have computed reading_card=false and will pull focus back to Start.
   Fix: a generation counter so only the latest coroutine resumes.

OPTIONAL / NICE-TO-HAVE
- main.gd:13263 falls back to physical_keycode; main.gd:13279 reads event.keycode only. Make them consistent.
- layout_story_card is not called from resize_controls (main.gd:14396-14465). It relies on the next frame's update_conversation_ui (main.gd:7177-7178), so geometry is one frame stale after a resize. Harmless given the per-frame refresh.
- The body measurement (main.gd:6880-6884) ignores the RichTextLabel "normal" stylebox, which size_activity_detail does include (main.gd:13939). Verify that stylebox is empty by default.
- No touch tap on Start is tested in a phone context. The 320 context accepts with Enter (godot-browser.mjs:245); the only real click is a mouse click at 640x360 (:224).
- I could not check the fixed hash 2a9641a8..., the v1 read-only legacy save, the <=4096 B save limit or the fallback-glyph invariant. Verify: run all 5 gates on the final source.

CUT THESE
1. main.gd:13285-13286: this guard in _unhandled_input is dead code. Its condition (reader focused plus an arrow, page, Home or End key) is a subset of what _input already consumes and marks handled at main.gd:13265-13277, echo included, so _unhandled_input never receives those events. Removing it changes nothing.
2. study_test.gd:170-182: the scrollbar-focus fixture forces story_scroll.focus_mode = FOCUS_ALL, a state production never sets. Verify Godot's default ScrollBar focus_mode. It also never checks that the scroll moved. Either cut it or make it assert movement on a focus state production can actually reach. Keep the cheap is_ancestor_of clause in main.gd:6898 either way.
