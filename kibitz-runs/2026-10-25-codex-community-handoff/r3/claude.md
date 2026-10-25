TOOL CHECK: PASS (read godot/civic_listening.gd, godot/main.gd, godot/tests/community_invitation_checks.gd, godot/tests/study_test.gd, tests/godot-browser.mjs). No shell/git was available to me, so I reviewed the working-tree files directly, not a diff against 8cf022f.

VERDICT: yes-with-fixes. Follow does what it claims on the path the tests exercise (hub already visible, manual camera). It has three integration defects on paths no test reaches: a chapter card that gets consumed without ever showing, hub dialogue that depends on how the Hour was opened, and Dez's line that contradicts a finished film.

MUST-FIX BEFORE BUILD

1. [R3.2 "sets last_story_chapter ... ONLY on explicit Follow"] This writes a value whose only meaning so far has been "this chapter's card was delivered".
   - Evidence: the only production writers before this change are main.gd:2064 and main.gd:7704. Both are immediately followed by show_story_card(). civic_listening.gd:193 is the first writer that consumes the chapter without showing it.
   - Consequence: when the player earns civic completion inside the Hour and presses Follow right away, current_chapter() moves to idx 4 (main.gd:7302-7303). "Chapter 4 · A Listening Hour" (main.gd:73) is then never shown in this session, and neither is its announce_a11y_status (main.gd:7403-7410). It only comes back as the startup card on the next launch (main.gd:2063-2065).
   - The card's side channels also break. rhythm_circle.chapter_completion_notice and loan_homecoming.chapter_completion_notice are cleared only inside show_story_card (main.gd:7404-7409). Any pending notice would attach to the wrong later card.
   - The Keep path still shows the card (godot-browser.mjs:1885), so the two exits now diverge.
   - community_invitation_checks.gd:34-38 makes the loss a passing assertion and never checks that anything replaces it.
   - Smallest fix: keep the write, but when int(current_chapter().num) != last_story_chapter before the write, start the Follow announcement (civic_listening.gd:201) with the chapter text, e.g. "Chapter %d: %s." Also clear the two chapter_completion_notice fields exactly as show_story_card does. Add one native assert that the Follow status contains the chapter title when a chapter was pending.

2. [R3.2 Follow / R3.4 "last_panel_dialogue clearing ... lose intent?"] What the hub shows after Follow depends on how the Hour was opened.
   - Mechanism: CivicListening and block_panel are siblings on the same layer (main.gd:15769, 15914). open_hour hides block_panel (civic_listening.gd:159-164) and close_hour restores it (civic_listening.gd:175-176). Then show_block_panel(true) clears last_panel_dialogue only when the panel was hidden (main.gd:15238-15242).
     (a) Opened from the hub entry button: the panel was visible, so Dez's line is kept.
     (b) F5 with the hub hidden (main.gd:14673): the panel was hidden, so last_panel_dialogue is set to "". Dez's line set by civic_complete (main.gd:10159) disappears from the hub, and the page is recomputed from the objective before Follow overwrites it.
     (c) F5 during a talk-mode conversation (open_hour does not block this; civic_listening.gd:154): last_panel_dialogue still holds the neighbour's line.
   - Talk mode is only partly torn down. Follow sets talk_partner=-1 without the cleanup that every other talk-to-hub writer does: main.gd:6465-6483, 7433-7436, 8371-8373 and 15053-15055 all clear last_panel_dialogue, and most call hide_speech_bubble.
   - block_panel_neighbor_idx() (main.gd:5654-5661) still returns arrived_neighbor or selected_neighbor. update_block_ui (main.gd:15434-15441) then draws a "Talking with <name>" heading and the character theme around the film button. That contradicts the R3.2 claim "clears talk_partner to deliberately reveal hub, not conversation".
   - Ordering detail: close_hour(false) runs update_block_ui, refresh_entry, layout and return_focus.grab_focus while still in talk mode (civic_listening.gd:177-180). Only then does Follow switch to hub, so the panel is built twice and focus moves twice.
   - Smallest fix, in follow_invitation:
     - Record talking := game.talk_partner >= 0 before close_hour.
     - After show_block_panel(true), set game.last_panel_dialogue = game.civic_completion_acknowledgment(). If talking, also call game.hide_speech_bubble().
     - Then call update_block_ui(), and only after that set the page and call layout_block_action_pages().
   - Also decide explicitly whether arrived_neighbor and selected_neighbor stay set. If they stay, change the R3.2 wording. If they should go, clear them the way main.gd:12475-12476 / 13679-13680 do.
   - Add a native case for (b) and (c). Every current case goes through show_block_panel(true) and then the entry button (community_invitation_checks.gd:23-25 and 54-56, godot-browser.mjs:1838 and 1891), so neither path is tested.

3. [R3.2 Dez's acknowledgment / R3.4 "honest for ... done"] When film_phase=="done", Dez's line still says "I would like to make The Open Seat with you, at your pace."
   - civic_completion_acknowledgment() (main.gd:10149-10152) checks civic_phase but not film_phase.
   - The completed reader appends that line, immediately followed by "The film is ready to revisit." (civic_listening.gd:236-237).
   - Repeated Q/hub on a finished civic hour sets the same line as hub dialogue (main.gd:10212) after the film is finished.
   - This is the readOnly re-read every browser run takes after the film is shot (godot-browser.mjs:2777-2778). No assertion catches it: the native phase loop only checks button text (community_invitation_checks.gd:65), and the browser only checks includes('Dez:') (godot-browser.mjs:1893).
   - Smallest fix: make only the last sentence depend on film_phase=="done" (for example, a thank-you for making The Open Seat). Assert the exact string in the native phase loop for "done" and for one unfinished phase.

SHOULD-FIX

1. [R3.3 camera claims] Every native case forces following_player=false (community_invitation_checks.gd:20 and 52). The browser camera assertion is skipped whenever following_player is true (godot-browser.mjs:1902). With the follow camera on, show_block_panel(true) schedules refresh_hub_camera.call_deferred() (main.gd:15256-15258). On narrow layouts it can also take over a talk-framed camera (main.gd:15253-15255). Add one native case with following_player=true. Assert that following_player stays true, the view does not drop into overview, and the film button stays on screen. Narrow the R3.2/R3.3 wording to "manual camera unchanged".

2. [R3.3 browser helper] godot-browser.mjs:1893 checks offerHour.text.includes('Dez:'). That passes on any Dez line, including Dez's turn in the Hour dialogue (civic_listening.gd:146). Export the expected acknowledgment, or rebuild it from the plan, and compare exactly. Do the same for the notes branch the native test checks (community_invitation_checks.gd:32).

3. [R3.3 observer contract] check_follow hard-codes page 2 (community_invitation_checks.gd:95). The browser hard-codes id 8 and page 2 (godot-browser.mjs:1896 and 1898). The product derives the page instead (civic_listening.gd:198; BLOCK_ACTIONS_PER_PAGE=4 at main.gd:844). Derive the expected page in the tests the same way: block_buttons.find(block_film_btn) / BLOCK_ACTIONS_PER_PAGE. Otherwise reordering the action grid breaks the tests and not the product.

4. [R3.2 page write in wide layout] Follow writes block_hub_page=2 even when the hub is not paged. The observer then hides that value (main.gd:11822 exports 0 when unpaged), so internal state and the a11y snapshot disagree. A later resize from wide to phone opens on page 2 instead of the objective page. Smallest fix: only write the page when uses_paged_block_actions() is true. Then the observer change in R3.3 "Rejected focused2" can stay or be dropped without hiding anything.

5. [R3.4 recognition placement] On phones the reader is about 86px tall (civic_listening.gd:69), and the acknowledgment comes after the speaker line, summary, request and disclaimer (civic_listening.gd:231-238). After completion, focus goes to voices[voice] (civic_listening.gd:221), not to the reader. Screen-reader users still hear it once through civic_complete's announcement (main.gd:10166). Sighted phone users have to scroll to find it. Moving the acknowledgment and invitation lines ahead of the speaker line in the "done" branch only changes string order: no layout change, and the four voice rereads still work.

6. [R3.3 browser earned-path coverage] In the browser, Follow on the earned path is only reached after Back and after dismissing the chapter card (godot-browser.mjs:1884-1891). "Immediate Follow while a chapter is pending" is proven natively only (community_invitation_checks.gd:34-38). Either state that limit in R3.3 or add one browser tap of buttons[9] straight after buttons[9] reaches "done".

OPTIONAL / NICE-TO-HAVE

- [R3.3 PRIVATE listening fixtures] godot-browser.mjs:3653 calls addInitScript without the `if(!localStorage.getItem(...))` guard that the neighbouring loops use (3644, 3663). It is harmless as long as the context never reloads. Add the guard for consistency.
- [R3.3 native isolation] apply_save_envelope does not write the save file, but civic_start, civic_convene, civic_complete and import do (main.gd:10102, 10141, 10161, 13685). So after community_invitation_checks.gd:85 the file on disk holds the last case's state, not `original`. Later suites compare the file before and after, so nothing breaks today (e.g. study_test.gd:6475 and 6541). Restore it or document it.
- [R3.2 "NEVER PRESS"] For keyboard input, the down/up split in phone_accept (study_test.gd:6355-6358) shows that the key release on the film button does not activate it. Verify: Godot 4 BaseButton ignores ui_accept echo events while Enter is held after focus moves to block_film_btn [ASSUMPTION about engine behaviour].
- [R3.3 layout loop] I found no feedback loop in tray/top minimum_size_changed → queue_layout → fit_layout (civic_listening.gd:111-112 and 363-384). Width depends only on the viewport, and layout_pending collapses repeated requests. Each pass calls sync_web_a11y_status(), which only costs time.

CUT THESE

1. [R3.2] Drop `game.block_panel_mode="hub"` at civic_listening.gd:196. After talk_partner=-1, show_block_panel(true) already sets block_panel_mode to "hub" (main.gd:15240). The line is redundant and easy to misread as the thing that does the switch.
2. [R3.3 "Rejected focused2" observer change] If SHOULD-FIX 4 lands, the wide layout keeps page 0 in both the product and the observer, so the special case at godot-browser.mjs:1898 (paged ? 2 : 0) collapses to one rule. It is safe to cut because the product no longer writes a value the observer has to hide.
