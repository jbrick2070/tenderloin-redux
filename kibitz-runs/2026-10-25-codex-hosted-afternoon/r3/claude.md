TOOL CHECK: PASS (read godot/hosted_afternoon.gd, godot/programme_studio.gd, godot/main.gd, godot/civic_listening.gd, godot/shared_panel.gd, godot/tests/hosted_afternoon_checks.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, tests/hosted-afternoon-browser.mjs). No git/Bash access in this lane, so "what changed vs 8f6a73d" claims below are read from the current files only.

VERDICT: yes-with-fixes. I found no production wiring defect that breaks the build. The Follow ordering, entry visibility, init order and copied-data contracts all check out against the code. Two gate-integrity and test-isolation defects need closing before the "all five FINAL gates" claim in R3.6 means what it says.

MUST-FIX BEFORE BUILD

1. [R3.4 / R3.6] The pass token cannot tell a private run from the formal gate.
   - godot/tests/study_test.gd:3288 wires the helper into the formal suite.
   - godot/tests/hosted_afternoon_checks.gd:174 always prints "HOSTED_AFTERNOON_PASS:PRIVATE ...".
   - R3.6 requires a "clean native HOSTED_AFTERNOON_PASS". The formal run will therefore print a token labelled PRIVATE, and the focused private run prints the identical string. Any gate grep either accepts both or rejects both. That is exactly the "private pass substituted for full gate" risk R3.5 says is excluded.
   - Fix (smallest): drop ":PRIVATE" from line 174, or pass a label in from the caller (study_test.gd:3288 passes "FORMAL", the private harness passes "PRIVATE"). Then make the gate match the formal label exactly.

2. [R3.4 "every old test retained"] The helper leaks camera and hub state into later checks, both natively and in the browser.
   - Native: hosted_afternoon_checks.gd:38 and :115 set study.following_player / in_overview / in_wide_overview. Line 116 sets selected_neighbor / arrived_neighbor, and :118 runs show_conversation. Lines 44, 78 and 148 call show_block_panel(true).
   - The teardown at :165-173 restores only root.size, the envelope, last_story_chapter, the two chapter notices and the save file. following_player, overview flags, block-panel visibility/mode, talk_partner and camera pose are never restored.
   - verify_shared_panel (study_test.gd:3289) and everything after it now start from a manual, non-overview camera, not the state they started from at baseline. "Retained 106+" may be passing on different preconditions. Verify: whether verify_shared_panel / verify_loan_homecoming read following_player or camera pose.
   - Browser: the same leak exists. tests/hosted-afternoon-browser.mjs:27-30 forces a manual drag (following_player=false), then leaves the hub open with focus on the Listening entry. godot-browser.mjs:2778 inserts this before verifyCivicListening (:2788). That function captures `pose` at :1853 and asserts it later, so the pose baseline is now the Hosted helper's manual pose, not the pre-change pose.
   - Fix: at entry, snapshot [following_player, in_overview, in_wide_overview, block_panel.visible, block_panel_mode, talk_partner, selected_neighbor, arrived_neighbor] and restore it in the teardown before line 174. In the browser helper, record following_player/camera_pose at entry. If the drag changed them, restore with one KeyG/recentre before returning, or document that verifyCivicListening now runs from a manual pose and re-baseline it explicitly.

SHOULD-FIX

1. [R3.3 "Only explicit Follow consumes earned chapter..."] The Follow chapter-consumption branch can't be reached in real play. The evidence for it is synthetic.
   - Why it can't happen: update_conversation_ui (main.gd:7703-7710) is blocked only while a focused surface is open. After the actual fourth completion (main.gd:10050 via Z/hub, or the shared panel for art-last orders), the chapter-3 card is shown on the next unblocked frame.
   - open_studio refuses while is_story_card_visible() (programme_studio.gd:119). So int(chapter.num) != last_story_chapter is false by the time Follow can be pressed (programme_studio.gd:245).
   - The only coverage is hosted_afternoon_checks.gd:89, which forces last_story_chapter = num-1. The browser asserts `!story_detail.panel.visible` (hosted-afternoon-browser.mjs:54) after already dismissing the card at :24.
   - Fix: keep the code, since it mirrors civic_listening.gd:192-194, but relabel the R3.4 claim "chapter+both side notices once" as defensive/synthetic. Don't count it as a genuine-journey property.

2. [R3.2 future 4-column regression] The orphan-letter defect was fixed for Hosted only (programme_studio.gd:377 gates columns=2 on hosted_view). Future Draft/Posted stays 4 columns at 320, with "Post revision" / "Start hosting" / "Music: Off".
   - The existing rotation check (godot-browser.mjs:1839) asserts bounds only, not words_fit. The snapshot already exposes words_fit per button (programme_studio.gd:419).
   - Fix: add `p.buttons.every(b=>b.words_fit)` to the :1839 loop. If it fails at 320, drop the hosted_view condition at :377.

3. [R3.2 / Keep] The Keep exploring announcement is stale in Hosted mode.
   - back calls close_studio (programme_studio.gd:93), which announces "Draft, posted future plan and running gathering stay separate. Z keeps the quick path." (:160).
   - Hosted has no running gathering, and the line never says the offer is retained. That contradicts the in-reader text at :270.
   - Fix: one branch at :160 when hosted_view, e.g. "Back to the block. Bea's offer stays with your completed gathering."

4. [R3.4 browser coverage] The genuine journey only ever runs with civic phase idle.
   - The helper is inserted after 4/4 and before verifyCivicListening (godot-browser.mjs:2778 vs :2788), so `phase` (hosted-afternoon-browser.mjs:32) is always "idle".
   - The planning / meeting / done offer texts (hosted_afternoon.gd:61-65) and the disabled "Listening complete" path are proven only by native private fixtures (hosted_afternoon_checks.gd:72-99).
   - Fix: state this in R3.4. Optionally run a done-phase Hosted reopen after verifyCivicListening completes in one size.

5. [R3.2 interface] Rounding differs from the loader for non-canonical floats. hosted_afternoon.gd:13 and :18 use int(raw); the canonical loader uses int(roundf(float(rv))) (main.gd:13410, :13416).
   - For 2.999999 (passes is_whole_json_number via is_equal_approx, main.gd:12391), Hosted shows tile 2 while the loader would compute 3 and reject.
   - In-memory data is canonical today (host_complete_current main.gd:9937-9944, loader above), so this is latent.
   - Fix: use int(roundf(float(x))) at both sites for parity.

6. [R3.4 freshness, pre-existing] The PCK mtime freshness list (godot-browser.mjs:29-61) omits four inputs the fingerprint list at :69 hashes: godot/lantern_procession.gd, godot/story_picker.gd, godot/voting_story.gd and godot/data/voting_places.json. An edit to these doesn't fail "PCK older than sources". Verify: whether the omission predates 8f6a73d. If so, it's out of scope but cheap to add.

OPTIONAL / NICE-TO-HAVE

- programme_studio.gd:148 close_studio never resets hosted_view, and the not-visible snapshot hard-codes "hosted_view":false (:415), which hides the stale flag. It's harmless because open_studio resets it at :128. Setting hosted_view=false in close_studio would make the snapshot truthful.
- The Hosted column threshold repeats the side-tray literal 280 (:377 vs :378) and adds a magic 500. A shared const would stop them drifting.
- Both browser helpers address snapshot buttons by position (buttons[7]/[8]/[10] at godot-browser.mjs:1821 and hosted-afternoon-browser.mjs:50/53/54). That's tied to the cards+edits+[primary,view,music,back] concatenation order at programme_studio.gd:417. Adding a role key to each snapshot entry would remove the coupling.
- hosted_afternoon_checks.gd:41 drives the fourth completion with host_complete_current() directly. For the ["beats","pause","stories","art"] order this bypasses the real dispatch (main.gd:10007 shared_panel.open_panel) and allow_hang (:10044). Calling it "actual fourth" is overstated for the native case; the browser path is genuine.
- In follow_hosted_invitation, focus moves twice: close_studio grabs return_focus (:158), then entry.grab_focus (:256). A screen reader may announce the intermediate control before the final announce_a11y_status. Verify on a real AT (outside this review's scope).
- Held-Enter safety on the newly focused entry relies on engine BaseButton echo/release semantics. It's proven natively only in the "following" context (hosted_afternoon_checks.gd:130). Verify: Godot Button ui_accept action_mode in this engine build.

CUT THESE (over-engineering)

1. programme_studio.gd:359-361, the per-frame hosted_signature JSON.stringify compare and refresh, plus the is_hosting_done auto-close. Safe to cut because:
   - The studio is modal: main.gd:14637-14641 swallows every key while it's visible, and update_conversation_ui returns early (:7703).
   - Load and reset close it before changing state (main.gd:12503, :13000, :13575), and civic phase cannot change while it's open.
   - So the signature can't change while hosted_view is visible. It costs a stringify every frame for an impossible case.
   - If kept as a guard, at least drop the stringify and compare hosting_results.size() and civic_phase.
2. The `hosted_replies` key in snapshot() (programme_studio.gd:423) is computed on every 0.2 s sync whenever hosting is done, even outside Hosted view. Neither browser helper reads it (they read `text`). Safe to cut, or gate it on hosted_view.

Checked and found consistent (no action)

- Init order: civic_listening is created before programme_studio (main.gd:15921 vs :15924), so the entry dereference in the snapshot (programme_studio.gd:415) is safe.
- Art copies: they go through shared_panel.texture(v,false) (programme_studio.gd:303 -> shared_panel.gd:241), whose non-world cache is separate from the world cache.
- Beats bitmask: hosted_afternoon.gd:40 matches the toggle at main.gd:9889 (bit i is step i).
- Follow ordering: talk_partner=-1 is set before show_block_panel, so block_panel_mode resolves to "hub" (main.gd:15248). last_panel_dialogue is assigned after show_block_panel's reset (main.gd:15250). refresh_entry's preconditions (civic_listening.gd:346) are all true when grab_focus runs.
- Entry paging: the entry lives in block_page_nav (civic_listening.gd:95), not the paged grid. That's why no block_hub_page or layout_block_action_pages call is needed here, unlike civic_listening.gd:201-202.
- F6 while Hosted is open is swallowed (main.gd:14637-14641), so it can't flip modes mid-view.
