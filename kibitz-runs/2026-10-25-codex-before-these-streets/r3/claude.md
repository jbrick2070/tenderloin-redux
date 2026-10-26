TOOL CHECK: PASS. Read and Grep worked: I read godot/before_streets.gd in full, plus main.gd, the tests and input.md. Bash is disabled in this session, so I could not run git diff. I located the main.gd hunks by grepping for before_streets/story_before_btn and reading those regions directly.

- VERDICT: yes-with-fixes. Wiring and ownership mostly hold. Two problems are real: the overview camera is not refit after a resize that happens while the opening is open, and the header has a frame-ordering bug. Separately, one claimed proof (F8) does not test what it claims.

MUST-FIX BEFORE BUILD

1. [Integration: close_opening / resize chronology] The overview camera framing goes stale after a resize or rotation that happens while the opening is open.
   - Startup always runs in overview: main.gd:2065 calls overview() and then show_story_card(...,true).
   - On resize, resize_controls (main.gd:16044-16045) calls refit_after_layout(). That function waits two frames and then returns early because is_focused_activity_visible() is true (main.gd:15202-15205). The opening counts as a focused activity (main.gd:12087).
   - close_opening (before_streets.gd:99-111) only calls update_block_ui, layout_walking_controls_and_hub and, for startup, layout_story_card. Nothing calls overview() again.
   - overview() sizes view_size from the viewport and header/controls rects (main.gd:15064-15075). So a phone rotated 320x568→568x320 (or 520x360↔360x520) while the opening is up returns to an overview framed for the old aspect.
   - Why the tests miss it:
     - tests/before-streets-browser.mjs:33-37 always rotates back to the original `size` before Escape.
     - The browser camera_pose field (main.gd:11903) has no view_size, so "unchanged camera" cannot detect it.
     - The native checks (before_streets_checks.gd:18-60) never resize while the opening is open.
   - Fix: when opening, record the size (`opened_size = game.bubble_viewport_size()`). In close_opening, after restoring visibility, add: `if game.bubble_viewport_size()!=opened_size and (game.in_overview or game.in_wide_overview): game.refit_after_layout()`. With the card up, refit_after_layout already restores the startup card, startup_story_pending and Start focus (main.gd:15213-15218).
   - Add one assertion: resize while open, Escape at the new size, then check that view_size equals what overview() gives at that size.

2. [Proof claim: "W/arrows/F8 suppression"] The F8 check does not test the shortcut it claims to block.
   - The other-story shortcut only fires on Shift+F8 (main.gd:14636: `event.keycode==KEY_F8 and event.shift_pressed`).
   - The native test sends plain F8 (before_streets_checks.gd:44-47, no shift_pressed). The browser test also sends plain 'F8' (tests/before-streets-browser.mjs:31).
   - Plain F8 never opens the story picker, so both assertions pass whether or not the opening blocks the shortcut.
   - KEY_UP in the native case is also sent while the reader has focus, after Sources and End (lines 39-41). That exercises the reader-scroll branch (before_streets.gd:209), not the "arrow accepts hidden startup" branch (main.gd:14629).
   - Fix (test only):
     - Native: set `press.shift_pressed=true` for KEY_F8, and send KEY_UP once with a button focused (for example after `opening.gust.grab_focus()`).
     - Browser: use `page.keyboard.press('Shift+F8')`.
     - Then assert that story_picker is not visible and startup_pending is still true.

SHOULD-FIX

1. [Entry visibility / header size churn] The header height goes stale because of a frame-order inversion inside _process.
   - The order in _process is: refresh_phone_disclosure() at main.gd:14253, then update_conversation_ui() at main.gd:14263.
   - refresh_phone_disclosure relays out when its signature changes (main.gd:6802). The signature includes current_path.is_empty(), any_side_panel_visible(), is_story_card_visible() and is_focused_activity_visible(), which are most of the inputs to idle_entry_available() (before_streets.gd:80).
   - That relayout recomputes header_panel.offset_bottom from the header's minimum size (main.gd:6960) while the entry still has last frame's visibility.
   - Later in the same frame, update_conversation_ui flips entry.visible (main.gd:7735-7736). On the next frame the signature has not changed, so nothing recomputes.
   - Result with Info expanded:
     - Starting a route, opening a panel, or a chapter card appearing hides the entry, but the header (PRESET_TOP_WIDE with a manual offset_bottom, main.gd:15637) keeps the old taller height, leaving a blank band of roughly 45px.
     - When the entry reappears, the header grows past offset_bottom. header_panel.resized only triggers a relayout in compact modes (main.gd:16050-16055).
   - Two of the inputs, active_story_episode() and startup_story_pending, are not in the signature at all.
   - Fix: in update_conversation_ui, compute the new entry visibility. If it differs from the current one, assign it and then recompute `header_panel.offset_bottom = offset_top + get_combined_minimum_size().y` and call layout_walking_controls_and_hub().
   - Do not reuse set_header_details for this: it clears speech_opened_info (main.gd:7698).

2. [Held-key release across Skip] A key held during the opening takes effect as soon as it closes back to startup.
   - While the opening is visible, the W press is swallowed (main.gd:14586-14588, then 14633-14635) and physics is gated (main.gd:14275).
   - If the user is still holding W when they press Escape or Back to start, the next frame's _physics_process reads Input.is_key_pressed(KEY_W) (main.gd:14300). It then walks the player and calls gui_release_focus() (main.gd:14312-14313), so Start loses focus while the startup card is still up.
   - OS key-repeat echo events then reach the startup branch (main.gd:14629). That branch does not exclude echo, so it calls continue_story(), which accepts startup and starts music (main.gd:7439-7445).
   - This contradicts "Back to start … no progress or audio is started" (before_streets.gd:142). The tests release every key before Escape (before_streets_checks.gd:47; before-streets-browser.mjs:31).
   - Fix:
     - Add `and not event.echo` to main.gd:14629. This does not change the original startup flow, because the first press already hides the card.
     - Gate walking in _physics_process while `startup_story_pending and is_story_card_visible()`. verify: no existing test relies on walking under the startup card.
     - Add a test that holds W, sends Escape, waits a few frames, and asserts startup_pending, story_start_focus and an unchanged player.position.

3. [Pending chapter deferral, test] The test never checks that the deferred chapter card actually arrives.
   - The native test sets last_story_chapter=0 (before_streets_checks.gd:67), asserts the card stays hidden while the opening is open (line 69), and then puts last_story_chapter back at line 70, before the opening closes.
   - So delivery after close is never exercised. The code path is update_conversation_ui's early return at main.gd:7720, followed by show_story_card at main.gd:7725-7727 once the opening is closed.
   - Fix: leave the mismatch in place, close the opening, wait a few frames, then assert the story card is visible, it is not a startup card, and focus/announcement are correct. Restore afterward.

4. [Reset routes, test] The successful browser-import reset path is never exercised.
   - input.md says the visit "closes/reset[s] … on successful browser import". That path is main.gd:13706, inside import_browser_save_json.
   - The native test only covers a failed import (line 71) and apply_save_envelope (line 72 → main.gd:13007). The browser module has no import case.
   - Fix: add `game.import_browser_save_json('{"version":1,"core":{"greeted":true}}')` while the opening is visible, and assert the opening is hidden with observation==-1. The same fixture is used at shared_meal_checks.gd:100. Then reapply `original`.

5. [Focus ownership] Focus can be left on a disabled button.
   - set_view only moves focus when gust becomes disabled (before_streets.gd:119).
   - Pressing Previous from view 1 to view 0 leaves focus on the now-disabled Previous button.
   - refresh() then rebuilds the focus ring without Previous (before_streets.gd:148-153), so the focused control is outside the ring.
   - Fix: add `if previous.disabled and previous.has_focus(): gust.grab_focus()`.

6. [Snapshot measures behavior] Test taps grab focus programmatically, so focus routing is never really tested.
   - phone_accept calls `control.grab_focus()` before sending ui_accept (study_test.gd:6372-6378).
   - As a result, the native case never verifies the focus that open_opening sets on its own (gust or back, before_streets.gd:96), or the focus after observe() and after Sources toggles back to the scene.
   - Fix: assert the focus owner right after opening and after each action, before the next phone_accept.

OPTIONAL / NICE-TO-HAVE
- [Visibility restore ordering] open_opening captures saved_visibility (before_streets.gd:89-91) before calling close_phone_disclosure (line 92). A phone_tray that was open is therefore saved as visible and restored as visible. configure_phone_disclosure corrects it within the same call (main.gd:6831). Capturing after line 92 would make the snapshot honest.
- [Per-frame updaters] _process → update_readable_scene_labels → update_guide_arrow (main.gd:14268, 7162-7190) is not guarded for the opening. It can set the GuideArrow layer Control visible again under the opaque shade. It is drawn below z_index 110, but its Label stays in the accessibility tree. Guard with is_focused_activity_visible(). verify: the same applies to the scene caption Controls.
- [Short layout gap] fit_layout's side layout needs vp.x>=520 (before_streets.gd:192). Below 520px wide with height under about 400 (not a listed supported size), the stacked tray (128px reader + 3×44 rows) leaves the picture clamped to 1px by maxf(1,…). Consider a height-only fallback.
- [Key mapping] handle_input matches only event.keycode (before_streets.gd:207-209). The story-card path falls back to physical_keycode when keycode is KEY_NONE (main.gd:14612). Mirror that for Escape/Home/End/PageUp/PageDown.

CUT THESE
1. before_streets.gd:93 `game.pointer_active=false; game.orbit_dragging=false`. The cancel_map_pinch() call on the line before already clears both (main.gd:14511-14513). Safe to cut: pure duplication.
2. before_streets.gd:144 `shapes.toggle_mode=true; time_choice.toggle_mode=true` runs on every refresh(). Set it once in setup() after creating the buttons. Safe: the value never changes.
Not a cut: the 0.2s sync_web_a11y_status poll in _process (before_streets.gd:233-237). It is currently the only thing that publishes keyboard and wheel scroll changes (handle_input never calls sync), and the browser settle() relies on it. Remove it only if handle_input syncs after scrolling.

[ASSUMPTION] In the held-key item, the "music starts" step assumes OS key-repeat delivers echo InputEventKey with pressed=true in the native and web builds (standard Godot behavior). I did not run anything to confirm it.
