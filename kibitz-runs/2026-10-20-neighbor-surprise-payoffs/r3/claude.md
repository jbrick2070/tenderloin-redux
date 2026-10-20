TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, godot/project.godot directly).

VERDICT: yes-with-fixes. Keepsake visibility stays in sync through reset, restore and update, and the M4 memory tests still pass. But the conversation "Spot Surprise" action moves the camera to the surprise and then straight back in the same call, and its "next surprise" label doesn't match the handler, which just steps to the next index.

MUST-FIX BEFORE BUILD

1. [main.gd:5773 run_conversation_action / main.gd:5154-5195 inspect_neighborhood_surprise / main.gd:5627-5641 frame_conversation] The steps run in the wrong order and the second undoes the first.
   "surprise" is in the stay-in-conversation list at 5773. The call chain is cycle_neighborhood_surprise -> inspect_neighborhood_surprise. That function sets target=world_pos, view_size=52 and update_camera() (5169-5171). It puts the speech bubble at the surprise (5184) and the CelebrationBurst at world_pos+2.2 up (5190, 5326).
   Then, in the same call, run_conversation_action calls show_conversation(partner) -> frame_conversation(partner). That sets target to the neighbor and pans the camera (5636-5640). The block panel is still visible because inspect never hides it, so the 5773 guard is true.
   Net effect: the camera never reaches the surprise. The surprise's bubble and 3D burst play off-screen, possibly blocks away.
   Smallest fix: drop "surprise" from the 5773 list. inspect never calls show_block_panel, so block_panel_mode stays "talk" and test study_test.gd:1512 still holds. verify: nothing reached from inspect (update_block_ui at 5195, update_objective_ui at 5196) writes block_panel_mode.
   Alternative: keep the entry but skip frame_conversation when act_id == "surprise".
   Add an assert after 1512: camera.unproject_position(surprise world pos) is inside play_area_rect().

2. [main.gd:5733-5734, 5757-5758 conversation_actions vs main.gd:5204-5211 cycle_neighborhood_surprise] The button and its handler disagree.
   The label "Spot Surprise (n/10)" is only offered while discoveries < 10, which implies "find the next new one". The handler instead advances surprise_guide_idx+1 by index, and surprise_guide_idx is forced to -1 by apply_save_envelope (10793) and reset (10221).
   After restoring a save that has, say, NEIGHBORHOOD_SURPRISE_IDS[0] discovered, the first tap re-inspects index 0, which is already found. Nothing new is discovered, there's no burst (5185 gate) and the count doesn't change. inspect also sets surprise_guide_idx to whatever was last inspected (5157-5159), so manual inspections move the cursor too.
   Fix: in run_conversation_action_id "surprise" (5805-5806), pass the first index whose id is not in discovered_surprises to cycle_neighborhood_surprise(target_idx). Leave Shift+D's cycling as it is.
   Test 1512 only covers the 0/10 start. Add a case: restore a save with 1 discovered, tap, expect size == 2.

3. [study_test.gd:1509-1511] Hidden test-order dependency, verify before merging. 1511 assumes that after apply_save_envelope(saved_m4_json) (snapshot taken at study_test.gd:771), current_objective() (main.gd:5411-5461) returns "explore", so that slot 0 is "surprise".
   That only holds if the snapshot at 771 has history_read == true and blackhawk_discovered == true. Otherwise 5457-5460 return "comptons"/"blackhawk" and 1511 fails.
   verify: run the suite, or check the history flags between study_test.gd:537 and 771. Any reset in that window breaks 1511.
   1511 also asserts the wide label text, so it implicitly needs root.size.x >= 600 at that point (root is resized only at 1523). Note that coupling in the assert message, or set the size explicitly.

SHOULD-FIX

4. [main.gd:2556-2574 build_rook_speaker] The coordinates of two parts of the speaker overlap. Everything below is in speaker_node local space.
   SpeakerBeacon box: size (0.56, 0.16, 0.22) at (0, 1.30, 0), so x ±0.28, y 1.22-1.38, z ±0.11.
   JeffreyRecordTurntable at (0, 1.21, 0.14):
   - Plinth: y 1.21-1.27, z -0.03..0.31.
   - LP disc: y ~1.27-1.29, z 0.02-0.30.
   - ProppedRecordSleeve: centred near (0, 1.38, 0.0), height 0.26, so it sits almost entirely inside the beacon footprint.
   All three intersect the beacon. The beacon is visible whenever music_playing or rook_soundcheck_done (2588). rook_soundcheck_done is a precondition of every post-"open" chapter (5432), so it is always true in the explore chapter where surprises are surfaced, which means the clipping is always on screen.
   Also, the plinth's z extends to 0.31, past the cabinet half-depth of 0.28 (SPEAKER_HALF_EXTENTS.y, main.gd:31).
   Fix (pick one): raise jeffrey_turntable_node.position.y to >= 1.39; or lift speaker_beacon_mesh above the sleeve top (~1.55) when the turntable is visible; or hide the beacon while jeffrey_record is discovered. Also set node z to <= 0.10.

5. [main.gd:8898-8900 neighbor_project_memory_line -> main.gd:12399-12402 update_block_ui; main.gd:5823-5825 apply_block_panel_mode] Long text gets cut off.
   After M4, the talk-mode detail line becomes greet · base_mem · surp_mem + "  (Click X or press T…)". In talk mode block_detail_label is limited to max_lines_visible = 2.
   The header info line, which also carries mem_line (7348, 7604, 7646), is hidden on phones while a conversation is open (study_test.gd:1684). The surprise reflection is appended last, so it is the part that gets cut off. On phones after M4 the reflection is effectively never visible.
   The M4 verbatim tests are unaffected because they match substrings: study_test.gd:739 and 760 use find(...) >= 0, and 1493 uses contains. So there's no regression, only a display-budget problem.
   Fix: at 12401 show base_mem OR surp_mem, alternating by neighbor_talk_counts parity, instead of the three-part concatenation. Keep the combined string for announce_a11y_status (7350/7648) only.

6. [main.gd:5838 narrow label map; main.gd:5845-5857 conv_button; main.gd:12672-12674] On narrow screens the action row holds 3 EXPAND_FILL buttons at font_size 16 with clip_text = true. At 320 px each button is about 95-100 px wide [ASSUMPTION: panel side margins; verify the block_panel offset_left/right].
   "Surprise (10/10)" can't occur because the action is hidden at 10, but "Surprise (9/10)" is 15 characters at 16 px. That is about 110-125 px in Godot's default font [ASSUMPTION: glyph advance ~7.5-8.5 px], so it gets clipped.
   The narrow test (study_test.gd:1681-1695) runs right after block open, when the objective is "photo". It never puts the explore-chapter surprise label on a phone, and it only checks size >= 44, not whether the text fits.
   Fix: change the narrow mapping to "Find n/10" (or drop "Spot ") and add an explore-state narrow assert, e.g. get_theme_font("font").get_string_size(text, …, 16).x <= button width.

7. [main.gd:10801-10805 apply_save_envelope] discovered_surprises is a new envelope key added under the same GODOT_SAVE_VERSION = 1 (main.gd:39), so the change is additive.
   Restore is fine: non-array or unknown ids are dropped, and the key is re-read after the clear at 10792.
   But an older build loading a newer save keeps the progress through its own save_godot_state only if it round-trips unknown keys. verify: whether a downgraded client rewrites the envelope and silently drops discovered_surprises. If downgrade isn't a supported path, document that next to 10800.

OPTIONAL / NICE-TO-HAVE
- Web font: project.godot has no custom font or theme, and main.gd has no FontFile/SystemFont, so Godot's built-in default font is used. The new strings use “ ” — · (8829-8861, 5189), and those glyphs already appear in shipped strings (civic lines 8889-8897, 12406 "1–5"). This adds no new glyph risk.
- Test 1491 spins the disc only via update_people_animation(0.25) with jeffrey_turntable_node.visible. Also assert the disc does not spin when the turntable is hidden; the guard is at 3222.
- Build and load order is correct, no defect: build_mural_board (1869) -> build_rook_speaker (1870) -> build_neighborhood_surprises (1880) -> load_godot_state (1896). Both keepsake nodes exist before any update_* that reads discovered_surprises, and every access is null-guarded.
- The early-reject paths in apply_save_envelope (e.g. 10761, 10768, 10775) go through reset_mural_state_to_defaults, which clears discovered_surprises and calls all three update functions (10266-10271). No stale keepsakes after a failed restore.

CUT THESE (over-engineering)
1. [main.gd:2993-2996 update_mural_3d and main.gd:2593-2594 update_speaker_3d] Duplicate owners of the keepsake visibility.
   Every write to discovered_surprises is followed by update_neighborhood_surprises_3d, which already sets both flags (5149-5152). The writes are at 5174 (update at 5175), 10220 (10271) and 10792/10805 (10848).
   Both nodes are built with visible = false (2504, 2566), and discovered_surprises is empty at build time.
   Three writers for one boolean invites drift, e.g. a future edit changes one id string and not the others. Safe to cut both copies. Keep update_neighborhood_surprises_3d as the single owner.
