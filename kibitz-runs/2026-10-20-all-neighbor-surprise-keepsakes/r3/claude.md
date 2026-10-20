TOOL CHECK: PASS (read r3/input.md, godot/main.gd, godot/tests/study_test.gd)

- VERDICT: yes-with-fixes. The keepsake build, registry and restore order are wired correctly. But the panel dialogue does not do what §2 says ("clears last_panel_dialogue"). When a newly found surprise belongs to a different neighbor, the panel keeps showing a hint that is now out of date, sometimes naming the surprise just found.

MUST-FIX BEFORE BUILD:
1. [§2 inspect_neighborhood_surprise / last_panel_dialogue] What the doc says does not match the code. The doc says the function clears `last_panel_dialogue = ""` before the panels refresh. The code (godot/main.gd:5345-5359) only writes to `last_panel_dialogue` when `paired_n_id == active_panel_n_id`, and never clears it otherwise. Concrete repro, using the panel's own button:
   - With Bea's paired surprises both found, ask_whats_next() sets last_panel_dialogue = `Bea: "You found both of my favorite block surprises! Next, check out Jeffrey's Lost 1961 Record..."` (study_test.gd:1542-1543 asserts this; main.gd:5862, 5867).
   - The "Spot Surprise" button then calls cycle_neighborhood_surprise(next_undiscovered_surprise_for_neighbor(talk_partner)) (main.gd:6048). That falls through to the first undiscovered surprise overall, jeffrey_record (main.gd:6014-6016), which is paired with "rook" (main.gd:390).
   - In inspect, paired "rook" != active "bea", so last_panel_dialogue is left alone. update_block_ui then shows it as block_detail_label (main.gd:12734-12735). The panel keeps telling the player to go find Jeffrey's record they just found.
   - The same happens in MuralPanel and MusicPanel: a Celeste or Rook explore hint survives when a surprise paired with another neighbor is found, through the custom-line check at main.gd:12658/12691.
   Fix: inside `if newly_discovered:`, add `else: last_panel_dialogue = ""` to the paired-match check at main.gd:5355. Keep it inside newly_discovered so study_test.gd:1534 ("re-inspect does not wipe") still passes. Add a test: after line 1543, run_conversation_action(0), then require that block_detail_label does not contain "Next, check out Jeffrey".

SHOULD-FIX:
1. [§2 speaker vs. active-panel contract] ask_whats_next() and inspect_neighborhood_surprise() pick the speaker differently:
   - ask_whats_next() (main.gd:5821-5829): mural panel → celeste, music panel → rook, then `talk_partner >= 0` whatever block_panel_mode is and whether block_panel is visible, then nearest_neighbor_within(TALK_PROMPT_RADIUS_M).
   - inspect (main.gd:5347-5354) copies update_block_ui's talk_idx (main.gd:12721): talk_partner only when block_panel_mode == "talk", otherwise arrived_neighbor, then selected_neighbor. It never uses nearest_neighbor_within.
   In "hub" mode (main.gd:6050), or with no talk_partner, the neighbor who spoke the hint can differ from the one inspect checks. Bea can give the hint, find her paired surprise, and get no reflection. The panel header (12728) can also name a different person than the "X:" prefix on the hint.
   Fix: extract one `active_panel_neighbor_idx()` and use it in all three places (5821, 5347-5354, 12721).
2. [§3 save-restore propagation] On success, apply_save_envelope does not reset last_panel_dialogue (main.gd:11098-11159). reset_mural_state_to_defaults does (main.gd:10519). If a panel is open, a pre-restore explore hint or surprise reflection (counts like "1/10 found", a named target) stays on screen after the restore changes discovered_surprises.
   Fix: add `last_panel_dialogue = ""` next to `discovered_surprises.clear()` at main.gd:11098.
3. [§2 a11y channel parity] The keepsake label goes to the RewardBanner (burst_sub, main.gd:5334-5335) and info.text (5365-5368). It does not go to announce_a11y_status (main.gd:5369), which only sends line + speaker + speech. Screen-reader users never hear about the unlocked keepsake that §2 says is surfaced.
   Fix: add keepsake_suffix to the announce string.
4. [§2 ask_whats_next target selection] The hint's target choice (main.gd:5839-5851) re-implements next_undiscovered_surprise_for_neighbor (main.gd:6004-6017). The spoken hint and the "Spot Surprise" button must point at the same surprise. Today they agree only because the two loops happen to match, and they will drift.
   Fix: idx = next_undiscovered_surprise_for_neighbor(speaker); is_personal_pair = NEIGHBOR_SURPRISE_PAIRS.get(spk_id, []).has(NEIGHBORHOOD_SURPRISE_IDS[idx]).
5. [§3 tests] The Shift+D loop (study_test.gd:1493-1500) runs with no panel open. So the inspect → last_panel_dialogue branch (main.gd:5346-5359) is never exercised for the MuralPanel/MusicPanel (CELESTE_ID/ROOK_ID) paths, or for the case where the surprise belongs to someone else. Only Bea and Dez in BlockPanel "talk" mode are covered (1531, 1545).
   Add: one MuralPanel-open discovery of hidden_mural_145 that expects a "Celeste: \"" reflection, plus the regression for MUST-FIX 1.

OPTIONAL / NICE-TO-HAVE:
- [§1 rest-pose constants] Each keepsake's resting pose is hard-coded in three places:
  - build: main.gd:2404 (carpet y 0.14), 2609 (dino y 0.88), 2616 (tail rot 58/-35/0)
  - hidden reset: main.gd:5280-5287
  - animation baseline: main.gd:3340, 3342, 3347
  The values match today. Store the rest pose at build time (e.g. node.set_meta("rest_y", ...)) or use a const, so a single edit can't desync them.
- [§2 ask_whats_next fallthrough] If next_s_id is non-empty but missing from NEIGHBORHOOD_SURPRISES, the `else` branch (main.gd:5852/5863) says "You've spotted all 10". Branch on next_s_id.is_empty() instead. Data drift is already guarded by study_test.gd:1482, so this is low risk.
- Checked, no defect found:
  - Registry order is correct: surprise_keepsake_nodes.clear() (main.gd:1899) runs before registration in build_neighbors_and_player/build_mural_board/build_rook_speaker (1900-1902), which runs before the first update_neighborhood_surprises_3d via build_neighborhood_surprises (1912 → 5259), which runs before load_godot_state (1928).
  - The restore path calls update_neighborhood_surprises_3d (11155) before sync_web_a11y_status (11159). The reset path does the same (10577 before 10581).
  - Keepsake visibility comes from the existing discovered_surprises save field, so no save-schema change is needed.
  - Coordinates are consistent: compass_phrase(player_xz, surprise_points[id]) is Vector2(x, z) on both sides (main.gd:5854-5856, 5567).
  - import_browser_save_json does not touch discovered_surprises (main.gd:11489-11610), so it needs no keepsake update.

CUT THESE (over-engineering):
1. [§2 get_a11y_status_snapshot "keepsakes_visible"] visible_surprise_keepsake_count() (main.gd:5292-5299) reads node.visible, which update_neighborhood_surprises_3d sets directly from discovered_surprises (5274-5277). It is not is_visible_in_tree, so it always equals surprises_found unless a node failed to register, and test 1477 already catches that case. I found no consumer of window.__tenderloinUpdateA11yDOM in the repo; only main.gd, study_test.gd and docs/BUILD_STATUS.md mention the snapshot keys. verify: whether the web export HTML shell, which is outside this repo, reads this key. If nothing reads it, it is safe to drop from the DOM payload and keep visible_surprise_keepsake_count() for tests only. Otherwise rename it "keepsakes_unlocked" so nobody reads it as "currently rendered". [ASSUMPTION] The export shell is not in the repo.
