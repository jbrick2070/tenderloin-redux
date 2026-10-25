TOOL CHECK: PASS (read godot/civic_listening.gd, godot/main.gd, godot/film_screening.gd, godot/story_picker.gd, godot/shared_meal.gd, godot/programme_studio.gd, godot/bea_invitation.gd)

VERDICT: yes-with-fixes for Option A only. P2's description of current behavior matches the code. But P3.A's "Follow" has no safe film surface to dispatch to before film is done, and the handoff only lives in a reader that quick-path players skip. Options B and C should be cut.

MUST-FIX BEFORE BUILD

1. [P3.A "Following should reveal/resume a truthful next film action"] There is no film surface that can be opened without changing state before the film is done.
   - film_screening.available() is `film_phase == "done"` only (godot/film_screening.gd:100-101).
   - The only film entry before that point is block_film_btn, which calls advance_film_step (godot/main.gd:15819-15822). That function changes state at every phase: idle->planning (film_start), planning->hold, where film_hold copies the draft and clears captures (main.gd:10334-10341), hold->shooting (main.gd:10351-10359), and shooting->capture a frame (main.gd:10371-10380).
   - "." is also unreachable from inside the reader: while CivicListening is visible, every key except Esc is swallowed (main.gd:14630-14634).
   - So "resume" cannot mean calling any film_* or advance_film_step function.
   - FIX: define Follow in P3.A as:
     a. close_hour(false);
     b. make sure the block hub is visible in "hub" mode;
     c. set block_hub_page to the page holding block_film_btn and call layout_block_action_pages();
     d. grab_focus() on block_film_btn and announce its current label. That label is already accurate for the phase (main.gd:15511-15521).
     e. Never press the button.
   - Once film is done, Follow may call film_screening.open_screening(). That is read-only and is already what the button does in the done phase (main.gd:15820).
   - Write "Follow = focus, never press" into the spec as a hard rule.

2. [P3.A paged/phone reachability] After Follow on paged layouts, the film button is on a different page.
   - The block_buttons order is open, next, epilogue, programme, mural, rook, west, civic, film, ... (main.gd:15811-15826), with BLOCK_ACTIONS_PER_PAGE := 4 (main.gd:844). That puts civic at index 7 (page 1) and film at index 8 (page 2).
   - block_hub_page is only recomputed from current_objective when the panel opens from hidden (main.gd:15236-15239). close_hour just restores the saved visibility (godot/civic_listening.gd:170-176).
   - The player opened the reader while the objective was "civic", so the hub comes back on page 1.
   - FIX: Follow must set the page explicitly (item 1c). Add acceptance for the paged hub in both narrow and side-dock layouts (uses_paged_block_actions, main.gd:6704-6706): after Follow, the focused control is block_film_btn and it is visible in the tree.

3. [P3.A vs P1/P2 "earned invitation in the core community journey"] The goal and the method diverge.
   - Civic can be finished without ever opening the reader: Q / advance_civic_step (main.gd:10191-10205) and the hub "Share Circle Notes" button (main.gd:15818, label at 15505-15506).
   - In that case the player only gets Bea's generic line (main.gd:10154) and the info text (main.gd:10159-10160). Revisiting the hub after completion gives a second generic line (main.gd:10207).
   - A handoff placed only in the reader is an optional reread, not a core-journey handoff.
   - FIX (smallest): use the same authored acknowledgment string, built from civic_result, in three places:
     - the reader's done text;
     - last_panel_dialogue at civic_complete (main.gd:10154);
     - the done branch of advance_civic_step (main.gd:10207).
     This uses existing surfaces with no new UI, and the Q/. quick paths are unchanged. If that is rejected, P3.A must say explicitly that quick-path players won't see the handoff.

4. [P3.A "Follow this invitation or Keep exploring ... retained on reopen/reload ... (no new saved fields)"] With no saved field, "Keep" cannot be recorded, so Keep exploring is the same as the current Back.
   - The invitation can only be derived from (civic_phase == "done", film_phase).
   - This also contradicts the two existing invitations, which both tell the player reload clears them:
     - godot/story_picker.gd:252: "Reload starts them fresh."
     - godot/shared_meal.gd:134 and 207: "Reload clears this visit's meal and invitations."
   - FIX: say in P3.A that this is a standing offer derived from durable phases, not something used up. Keep exploring = close_hour plus its own announcement. Choose player-facing copy that doesn't use the "invitations last for this visit" wording, so the player isn't told two opposite rules.
   - Acceptance: Follow → back out without a film action → reopen the reader → the same offer, with the same accurate label.

5. [P3.A "original specific resident acknowledgment"] The speaker isn't named, and the number of copy variants isn't bounded.
   - The film objective already belongs to Dez (main.gd:6143: neighbor "dez", hint "Celeste and I want to make a little three-shot film"). Dez is one of the four SPEAKERS (civic_listening.gd:5), and Dez's turn is the consent line (civic_listening.gd:144).
   - FIX: make the speaker Dez, with no fifth resident. Branch only on civic_result.notes ("themes" vs no notes), the same branch request_text already makes (civic_listening.gd:147-148). Do not write 8 topic×format×notes variants.

SHOULD-FIX

1. [P3.A control placement] Reuse the slots that already exist instead of adding a row.
   - In the done phase, `advance` is hidden (civic_listening.gd:220). The action row is advance / music / back (civic_listening.gd:81-84). The side tray is 280px wide (civic_listening.gd:346).
   - Show advance as "Follow this invitation" when phase == "done", and relabel back to "Keep exploring" only in that phase. The button count stays at 3, and the 44px minimum (civic_listening.gd:123) and the focus ring (civic_listening.gd:223-230) keep working. Default focus in the done phase is voices[0] (civic_listening.gd:167, 196); keep that so rereading still comes first.

2. [P4 "no automatic ... audio"] civic_complete already fires trigger_progress_cue("civic_complete"). That drives the burst and the reward banner (main.gd:10157, 11003, 11052; asserted in godot/tests/study_test.gd:1195).
   - The reader re-hides its siblings every frame (civic_listening.gd:325-326).
   - verify: whether reward_banner is a sibling of CivicListening and is already hidden when you complete inside the reader.
   - Either way, the acknowledgment must not add a cue, burst or music change. Add acceptance: reward_burst_count (main.gd:5893) and last_music_cue are unchanged by Follow and Keep.

3. [P3.A film done] For "honest revisit language", specify that the done-phase Follow label becomes a rewatch (e.g. "Watch The Open Seat") and opens film_screening only after close_hour.
   - open_screening likely refuses while another focused activity is visible.
   - verify: the guard at film_screening.gd:103.

4. [P4 test matrix] Add two sources of the done state:
   - a web-save import that raises civic/film phases (film_phase_rank merge at main.gd:13652);
   - the reset paths that set film_phase = "idle" (main.gd:12547).
   The derived offer must track both without being cached.

5. [P1 vs P5] P1 says "No request for r2/r3/r4", while P5 says "A separate exact implementation r3 follows". State once which review gates the code.

OPTIONAL / NICE-TO-HAVE
- In the reader's done-phase art caption, keep "No real building or testimony pictured" (civic_listening.gd:356) and the "beginning, not a promise" line (civic_listening.gd:207). The acknowledgment must not soften these.
- Prior art, limited to general genre knowledge with no live checks: an NPC hands you the next quest from inside the conversation you just finished, instead of through a separate quest log. What could make this original is the content: the line quotes the player's own copied plan and keeps the consent framing. The mechanic itself is not novel. [ASSUMPTION]

CUT THESE
1. [P3.B] Cut. Hosting does not finish inside a reader scene. programme_studio refuses to open while hosting is running (godot/programme_studio.gd:115-116). Completion happens through the hub, Z, or shared_panel (main.gd:9999-10002). That leaves no "actual completed scene" to integrate with, so B would need a new surface, which P3.B itself forbids.
2. [P3.C] Cut. apply_hub_guidance already gold-highlights the suggested next button and dims locked ones (main.gd:7260-7281), driven by current_objective. An invitation shelf would duplicate that and the four-story picker.
3. [P3.A] Cut per-combination acknowledgment copy beyond the notes branch (MUST-FIX 5). It inflates review load for authored text, and that text needs separate human cultural acceptance (P4).

HIDDEN ASSUMPTIONS
- [ASSUMPTION] Players reopen the Listening Hour after finishing it. Nothing in the hub pushes them back there once the objective moves to film (main.gd:6142-6143).
- [ASSUMPTION] CivicListening and block_panel share a parent, so close_hour restores the hub. verify: the parent at setup, civic_listening.gd:157-158.
- verify: what the "all-five full regression" and "nativeASFOUND1272B/SHA" in P4 refer to. I found no definition in the files I read, apart from SAVE_BUDGET_MAX_BYTES := 4096 at main.gd:104.
- [ASSUMPTION] An Android emulator / phone harness is available for the P4 phone acceptance.
