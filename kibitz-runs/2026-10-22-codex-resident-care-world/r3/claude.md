TOOL CHECK: PASS. I read godot/loan_homecoming.gd, godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs. I ran no gates and edited nothing except this file.

VERDICT: yes-with-fixes. The wiring is mostly sound: build order, three-slot action budget, envelope mirroring and deferred chapter-card timing all check out. Four defects need fixing first. A core progression gate was added that protects no stored data. A focus rebind can turn a repeated activation into a second, unintended return. The 3/3 chapter test passes even if the chapter card never fires. The kit-clearance test never checks the prop actually next to the moved table marker.

Verified OK (no action needed, listed so the judge can skip them):
- Build order. Beacons are created by build_block_banner (main.gd:1995, beacons at 2907-2923). They exist before make_ui (2017), which calls loan_homecoming.setup (15302-15304). Save loading (load_godot_state, 2020) runs after that. build_block_banner is called only once, so the kits are never left attached to freed beacons.
- Action slot budget. While packing, current_objective always returns "return" (main.gd:6079-6086). The "pack"/"return" branch skips the epilogue action when owner_loan is set (6477). So an owner conversation fills exactly 3 actions (return_owner, other, hub), matching the 3 conv_action_btns (15192-15194). Dez is not a loan owner, so the shared_panel early return (6493) cannot clash.
- Envelope mirroring. allow_return (loan_homecoming.gd:97-104) builds the same canonical returned list and the same save_seq+1 that return_loan (main.gd:9189-9193) and save_godot_state (12131-12136) use.
- Chapter notice timing. The card is shown from the per-frame update_conversation_ui (main.gd:7472-7474), not synchronously. The quote added at loan_homecoming.gd:121 therefore lands after note_completion (main.gd:9198) and before show_story_card reads it (7176-7178).
- Chat callbacks. talk_with_neighbor(celeste_index) still routes to talk_with_celeste (main.gd:8621-8622), so the original Celeste behavior is kept.

MUST-FIX BEFORE BUILD:

1. [Common return callback / budget; main.gd:9188, loan_homecoming.gd:97-108] The allow_return check blocks core progression without protecting the stored save.
   - The stored save is already safe without it: save_godot_state refuses any envelope over 4096 bytes and keeps progress in memory (main.gd:12134-12136, comment "Keep it in memory, but never replace the last valid stored profile").
   - So allow_return only adds an in-memory refusal of core M1 progression.
   - Imported optional data can be up to 8192 bytes (OPTIONAL_SAVE_MAX_BYTES, main.gd:162). For such profiles, and for any genuine profile within about 13 bytes of 4096, all three returns are refused for good.
   - Consequence: is_epilogue_done() (9218-9219) never becomes true. current_objective stays on "return" (6079-6086), the programme/civic/film steps are never offered, and chapter 2→3 never happens.
   - The refusal copy offers no way out.
   - The existing project convention refuses only optional edits (11798) and otherwise uses the receipt "Changed for this visit; the save is full" (11806).
   - Fix: drop the allow_return call from return_loan. Let save_godot_state refuse the write as it did before, and have return_to_owner/return_loan say "Returned for this visit; the save is full" when save_godot_state returns false (its return value is ignored today at 9196).
   - The "no skip to a shorter next ID" goal still holds, because return_next_loan's existing early `return ""` (9215) handles that.
   - Update study_test.gd:5460: the 4097 case should check that the file is unchanged, not that in-memory state is unchanged.
   - If Codex keeps the hard refusal as a deliberate product decision, it must at least be stated in README.md:32 as a known way to get stuck.

2. [Input/focus; main.gd:6462-6477, 14934, 15192-15194, loan_homecoming.gd:118-126] A repeated activation after an owner return triggers a different, consequential action.
   - After a successful return_to_owner, update_block_ui calls apply_block_panel_mode (14934), which rebinds slot 0 at once.
   - The owner now has nothing pending, so slot 0 becomes {"epilogue","Return Gear (n/3)"} (6477). Keyboard focus stays on that same Button, which remains visible.
   - A second ui_accept, Space, or a touch double-tap then runs advance_epilogue_step → return_next_loan (9242-9247). That returns another owner's loan in canonical order, with no conversation with that owner, and writes the save.
   - This undercuts "deliberate owner conversations… any order".
   - verify: I found no debounce on conv_action_btns.
   - Fix (smallest): after a successful return in return_to_owner, if game.conv_action_btns[0].has_focus(), move focus to game.conv_chat_btn. Alternatively, in conversation_actions, do not put "epilogue" at index 0 when talk_partner owns an already-returned loan.
   - Add a native check: after the ui_accept at study_test.gd:5396-5406, send one more ui_accept and require epilogue_returned==[id].

3. [Test claim "third owner… retains earned3/3+correct owner quote under chapter card"; study_test.gd:5423, godot-browser.mjs:1034] Both assertions pass even if the chapter card never fires.
   - return_to_owner's own announcement already contains both "3/3" and "<Owner>:" (loan_homecoming.gd:125: 'Returned %s (%d/3). %s').
   - So study_test.gd:5423 passes even if show_story_card never runs or chapter_completion_notice is dropped.
   - The browser check waits for story_detail.panel.visible, but the same substring test still cannot tell the notice path apart.
   - Fix: in native, require study.is_story_card_visible() and last_a11y_announcement.begins_with("Returned all three neighbor loans (3/3). "+owner.capitalize()+":") and .contains("Chapter "). In browser, use the same begins_with on s.announcement.

4. [Kit geometry "table marker alone moves from Thanh+0.95X to -0.95X"; loan_homecoming.gd:20, main.gd:2507-2515, 2559-2563, 8648-8663; study_test.gd:5379, 5435-5442] The moved table kit sits where the player and Thanh's crate can be, and the test never checks either.
   a) Player position. finish_neighbor_arrival places the player at goal + away*0.95 (main.gd:8653-8657). A player approaching Thanh from the west stands exactly on the new -0.95X marker. The beacon is a bare MeshInstance3D with no collider (2914-2922), so the player body and the kit overlap.
   b) Thanh's crate. The crate (local pos 0.46/0.17/0.14, box 0.42x0.34x0.32) is a child of the neighbor node, which is scaled by CHARACTER_VISUAL_SCALE=2.15 (main.gd:14, 2562-2563). Its centre is therefore about 1.03 m from Thanh, with half-extents of about 0.45x0.34 m.
      - Thanh turns to face the player on arrival (8663).
      - For an approach from -Z, the rotation is about π. The crate then sits at about (-0.99, -0.30) relative to Thanh, overlapping the kit footprint x∈[-1.14,-0.76], z∈[-0.15,0.15].
      - At rotation 0 the same crate also overlapped the old +0.95X spot. [ASSUMPTION] The "counter" diagnosis in the input may really be this crate; check with a render.
      - verify: the `prop` node's own transform inside attach_neighbor_signature_prop (main.gd:2374-2545). The numbers above assume an identity transform.
   c) Test coverage. The clearance test checks walls, mural, speaker footprint and eatery counters only (5435-5442). It never checks neighbor signature props or the 0.95 m stand ring. It also places the player at +Z (5379), which gives the one rotation (0) that does not hit the crate.
   - Fix: add a native check that the kit AABB is clear of Thanh's prop child AABBs at the four cardinal arrival rotations and of the 0.95 m player stand ring. Choose the marker offset to pass that (e.g. a ±Z offset; verify).

SHOULD-FIX:

1. [Rook Chat proximity; loan_homecoming.gd:90-93 vs main.gd:6444-6448, 8623-8624, 14167-14176, 11674] Rook's Chat button is the only owner entry that requires being near Rook, so it contradicts "no required proximity/fetch chore".
   - The music panel can open without the player near Rook: K, V and U (14170-14176) and prompt_local_music_file (11674).
   - From there, Chat (loan_homecoming.chat) sees near=false and starts a walk (request_rook_soundcheck, 8994-9001). Arrival then reopens the music panel with no return offer, so Chat must be pressed a second time.
   - Celeste's Chat (talk_with_celeste, 8967) and keep_chatting with Rook (talk_with_neighbor → check_sound_with_rook, 8623-8624) have no proximity check at all.
   - README.md:32 ("use their Chat button") does not mention this.
   - Fix: in chat(), when pending(index) is non-empty, open show_conversation(index) without the walk. Otherwise document the Rook-only extra step.

2. [Direct vs legacy callbacks; main.gd:15095, 15141, 6556] The new module calls are not null-checked.
   - These three call sites replaced legacy direct callbacks and call loan_homecoming without a null check.
   - Every other call site checks first (3151, 6448, 6462, 7176, 9188, 9198, 10316, 11554, 12152, 12633, 13181, 13629).
   - If the module is ever absent, the original "Chat with Celeste" and "Soundcheck w/ Rook" buttons crash.
   - Fix: fall back to talk_with_celeste() / request_rook_soundcheck() when loan_homecoming == null.

3. [Notice reset on apply/import; main.gd:12633, 13181] The earned notice is cleared before the input is validated.
   - chapter_completion_notice is cleared at the start of apply_save_envelope and import_browser_save_json, before validation (e.g. 13182-13186 is the invalid-import branch).
   - The card can be held back while a focused activity (rhythm/film/civic/programme/shared panel) is open (7467). A rejected import during that time silently drops the earned 3/3 notice.
   - Fix: clear only after a successful apply. (rhythm_circle at 12638 has the same pattern; fix both or neither.)

4. [Common manual cutaway; loan_homecoming.gd:136-138, main.gd:3129] cutaway_points also adds unreturned markers.
   - It filters on base.visible, which is true for every grey unreturned beacon while packing.
   - The input says the cutaway "adds kit points". Fix: filter on kits[id].is_visible_in_tree().
   - Note: update_occlusion's cache (13617) is not forced on manual pan (pan_camera_by_screen_delta, 13998-14008), so the target<24 gate can go stale. Sibling modules share this; do not claim exact live cutaway after a pan.

5. [Init order / hidden coupling; main.gd:2908-2912 vs loan_homecoming.gd:17-20] World transforms are changed late, from UI setup.
   - setup(), called from make_ui, overrides the beacon y and the table x after world build.
   - build_block_banner positions the table from neighbors[4]; setup uses neighbor_index_for_id("thanh"). These agree today (main.gd:490), but nothing enforces it.
   - Fix: put the grounded y (0.16) and the -0.95X offset into loan_positions at 2908-2912, and drop the transform overrides from setup.

OPTIONAL / NICE-TO-HAVE:
- loan_homecoming.gd:105 uses String(LOAN_OWNERS[id]).capitalize(). Using neighbors[i].name would match conversation_partner_line (main.gd:6341).
- godot-browser.mjs:2019 and 2022 press Y with a fixed 80 ms wait and no settle. Using the save-state waitForFunction after each press would remove a timing race in the "Y fallback" evidence.
- verify: whether get_a11y_status_snapshot (main.gd:11554) runs every frame on web. If so, snapshot() does 24 unproject_position calls per frame; cheap, but it could be gated to test-suite mode.

CUT THESE (over-engineering):
1. The allow_return pre-mutation check and its refusal copy (loan_homecoming.gd:97-108), per MUST-FIX 1. save_godot_state already prevents an oversized write, so removing it loses no storage protection.
2. The "base_visible" field in snapshot() (loan_homecoming.gd:155). It is redundant with "visible", which uses is_visible_in_tree and already depends on the parent. Removing it shrinks the a11y snapshot with no loss.
