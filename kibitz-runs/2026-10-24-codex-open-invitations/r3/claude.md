TOOL CHECK: PASS. I read the current source of godot/story_picker.gd, power_story.gd, dog_story.gd, lantern_procession.gd, voting_story.gd, the relevant regions of godot/main.gd, godot/tests/study_test.gd:6434-6517 and tests/godot-browser.mjs:1536-1669 and 3490-3601. I also read the r1 final/judgment and the r3 driver anchor. I had no shell, so I reviewed the current source rather than the raw `git diff`. No tests or browser were run; every point below comes from reading the code.

VERDICT: yes-with-fixes. The ownership, suspend/resume, reset ordering and save isolation are wired correctly. One real ownership bug remains: Back/Escape from a picker opened in the world silently resumes a suspended Power. The new picker reader also skips the project's touch-scroll helper and hides the invitation below the fold on short screens. Several required behaviours have no test.

MUST-FIX BEFORE BUILD

1. [story_picker.gd:105-111 back_to_stories; main.gd:14508-14509 Escape; power_story.gd:240-247] Escape or "Back to stories" from a picker opened in the world resumes a suspended Power.
   - Trigger: Power is active, then More stories, then Keep exploring (story_picker.gd:234-236 suspends Power). Then Shift+F8 from the world.
   - In open_picker, `previous=game.active_story_episode()` is null and no reader is visible (story_picker.gd:82-84), so `return_story=null`.
   - Escape calls back_to_stories. That takes the null branch and calls `game.power_story.open_story()`.
   - power_story.open_story then calls `game.story_picker.resume_existing(self)` (power_story.gd:247). That sets `active=true` and runs sync_world, then apply_time_of_day, then apply_lighting (story_picker.gd:211-216, power_story.gd:420-443).
   - Result: a cancel gesture brings back the Power world kit, the after-dark or Larkin lighting override, the Power objective and the "Power Story" walk-control label. This breaks "returns without automatic ... takeover" and makes Keep exploring undo itself.
   - Fix (smallest): when `return_story` is not valid, back_to_stories only calls close_picker() and announces "Back to the street". If a Stories hub is still wanted from that path, open Power's reader only when `not story_picker.suspended.has(power_story)`.
   - Add one native ui_accept/Escape assertion: after Keep exploring from Power, Shift+F8 then Escape leaves `power_story.active==false` and the lighting unchanged.

2. [story_picker.gd:47-51 reader; 143-147 text order; 164 reader height] The invitation reader cannot be touch-scrolled, and on short screens the invitation sits below the fold.
   - The picker builds a bare `RichTextLabel.new()`. Every other activity detail uses `game.make_activity_detail()` (main.gd:15309-15323), which adds the InputEventScreenDrag scroll handler and the focus stylebox. Power uses it at power_story.gd:110.
   - At 520x360 and 599x360 the reader is 64px. The Imani invitation and "Completed this visit" lines are appended after a roughly 190-character generic paragraph. [ASSUMPTION] At 16px in a ~444px-wide panel that paragraph is about 4 lines, so the selected player benefit is off-screen, and touch players can only reach it through the thin scrollbar. Keyboard focus on the reader is also invisible, because there is no focus stylebox.
   - verify: whether Godot 4 RichTextLabel drag-scrolls on touch natively. The repo's own helper exists because it does not.
   - The tests only check string presence (godot-browser.mjs:1609) and the 16px/64px sizes (study_test.gd:6485), so this would pass unnoticed.
   - Fix: `reader=game.make_activity_detail()`, keep the 16px override and the 64/80 minimum height, and put the Imani invitation and the completed line before the generic switching paragraph.

SHOULD-FIX

1. [story_picker.gd:218-227 select_story; 229-232 follow_invitation] There is no rollback when opening the selected story fails.
   - select_story calls suspend_story(current) and close_picker() before `selected.open_story()`, and ignores the bool it returns.
   - follow_invitation sets `invitation_followed=true` before the open succeeds.
   - Every open_story refusal clause I traced is already pre-cleared: stop_walking empties current_path (main.gd:13815-13821), and the picker refuses while a story card is pending or at startup (story_picker.gd:81). So this is low-probability, but a refusal would leave the previous story suspended, the picker gone and focus on the hub.
   - Fix: `if not selected.open_story(): resume_existing(current) (when current was suspended here); open_picker()`. Set invitation_followed only on success.

2. [story_picker.gd:82,106-108] Escape from a picker opened in the world, while a story is active but its reader is hidden (for example Shift+F8 mid-walk), opens that story's reader instead of returning to the world.
   - It is not a takeover, because that story is already the owner. It is still inconsistent with Escape meaning "go back to where I was".
   - Fix: record `opened_from_reader := previous!=null and previous.visible` and use it in back_to_stories. This fix also covers MUST-FIX 1.

3. [power_story.gd:247 + power_story.gd:129-133,488] Design tradeoff that should be stated in the copy and docs. Once Power is suspended, the legacy hub "Story" button and F8 resume Power. That re-applies Power lighting, disables the existing "Missing dogs" button (`dogs_entry.disabled=active`), and the only route to Dogs is then More stories.
   - Resuming is how the code avoids Begin/choose() resetting paused fields (power_story.gd:296-302, 334-344), so it is defensible.
   - It is still a visible behaviour change to an old gateway. Either document it, or make dogs_entry call `story_picker.select_story(3)` when Power is active.

4. [study_test.gd:6490-6491] The native Shift+F8 test calls `study._unhandled_input(key)` directly, which skips GUI routing and `_input` (main.gd:14482 story-card key handling). Use Input.parse_input_event, as story_visit_press does for ui_accept. The browser covers the real key at godot-browser.mjs:1592, so this is native-only.

5. [Acceptance gap] "Explicit End can retain the completed-this-visit acknowledgment" is not asserted anywhere. A grep for "Completed this visit" finds only godot-browser.mjs:1609, which checks before any End.
   - The source does support it: remember_completed() runs before reset in dog_story.gd:267, lantern_procession.gd:281, voting_story.gd:223 and power_story.gd:312.
   - Fix: after the dog End at godot-browser.mjs:1666, reopen the picker and assert that the text still includes "Completed this visit" and "Two Dogs Home" before the reload check at 1667.

6. [Acceptance gap] Power and Voting suspend/resume are proven only with native field fixtures: `power.choose(); power.begin(); power.restored=1; power.turns[1]=...` at study_test.gd:6497, and `voting.begin(); voting.observed=1; voting.via_pending=true` at 6501. No browser leg switches away from a real Power or Voting run and back.
   - r1 final.md lists "Power lighting/turns and Voting two-leg intent/observations switch tests". Either add a minimal browser leg (Power Begin, More stories, Dogs, then picker back to Power, comparing the existing `night_glow` and `pool_alpha` snapshot fields from power_story.gd:598), or record honestly that this is native-fixture-only.

7. [godot-browser.mjs:1647,1649,1651] `s` is captured at 1647. verifyStoryVisitSwitch then closes and reopens the dog reader (chooseDogs at 1614). Line 1651 then taps `s.dog_story.buttons[11]` using the stale coordinates and the stale visible/disabled flags. It works only while the layout happens to be identical. Re-snapshot before the tap.

8. [Acceptance gap] Back/Escape out of the picker is never exercised. A grep for `back_to_stories` and `picker.back` in the tests finds only the 44px size loop at study_test.gd:6486. This is the path behind MUST-FIX 1; add a test for it.

OPTIONAL / NICE-TO-HAVE

- [story_picker.gd:126 with dog_story.gd:213, lantern_procession.gd:242, voting_story.gd:159, power_story.gd:248] close_picker grabs block_close_btn, and the next open_story stores that as `return_focus`. After any trip through the picker, the reader's Back sends focus to the hub Close button instead of the original opener.
- [story_picker.gd:61] The Follow button's accessible name has no target. Use "Follow Imani's invitation: Lantern Procession".
- [story_picker.gd:195,232] Magic indices: `completed[3]` and `select_story(0)` duplicate the TITLES/episodes() order. Derive them with `episodes().find(game.dog_story)` and `episodes().find(game.lantern_procession)`.
- [story_picker.gd:162 vs readers' 520/560 breakpoint at dog_story.gd:365] The picker uses 500 for its 3-column/64px switch while the readers use 560 for side layout. This is not in the supported size list; noted for consistency only.
- Checked, holds:
  - Reset, load and import call reset_visit before the controller resets, and Power `end_session(false)` skips remember_completed (main.gd:12426, 12922, 13493; power_story.gd:311-313).
  - Power suspension restores fixture materials, then hides the kit, then re-derives the base lighting (story_picker.gd:207-209).
  - The Lantern off-route return uses `returning` to stop progress jumping (lantern_procession.gd:288-289, 392).
  - Voting paper follows `active` through update_art (voting_story.gd:302).
  - stop_walking bumps every generation, so pending open_from_walking coroutines die before the picker opens (main.gd:13815-13819).
  - The story card is deferred while the picker is visible (main.gd:7676).
  - No picker state reaches build_save_envelope; it appears only in the debug snapshot at main.gd:11808.
  - The original 13 Power controls, the first two picker entries and plain F8 (main.gd:14571-14572) are unchanged.

CUT THESE (over-engineering)

1. [story_picker.gd:20,147,231,243] `invitation_followed` only appends " You can revisit it." to the reader text. It is safe to cut: the Follow button stays visible and enabled regardless, and removing it also removes the set-before-success ordering in SHOULD-FIX 1.
