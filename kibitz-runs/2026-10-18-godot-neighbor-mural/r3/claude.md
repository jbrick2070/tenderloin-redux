TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot, godot/main.tscn, scripts/serve-godot.mjs, package.json, public/core.js; all reads returned content)

VERDICT: yes-with-fixes. The core wiring works: _ready order, the save schema and its round-trip, and the 3D state updates. But two web-side checks in tests/godot-browser.mjs pass whether or not the feature works, the talk interaction runs before the walk to Celeste finishes, and the board is not in the walkability layer.

MUST-FIX BEFORE BUILD

1. [Brief "Separate Godot save persistence & reload recovery" / tests/godot-browser.mjs:66-74] The web reload check does not test restore. After page.reload() the test only re-reads the localStorage blob and compares it to the blob from before the reload. Nothing in _ready writes a save: load_godot_state at main.gd:195 and overview at main.gd:198 never call save_godot_state. So the assertion still passes if load_godot_state or apply_save_envelope is a no-op on Web, or if the JavaScriptBridge read at main.gd:1239 returns null.
   Fix (smallest): after the reload, press KeyP (gated on the panel, so press KeyE first) or KeyE, then re-read the save. Assert parsedSave2.mural_palette === parsedSave.mural_palette, assert its mural_placements deep-equal the earlier ones, and assert celeste_talk_count === parsedSave.celeste_talk_count + 1. If restore failed, the post-action save would contain the defaults ("garden" palette, {} placements, count 1). main.gd:1018-1022 confirms KeyE triggers a save.

2. [Brief "Never read or write the browser game's tenderloin-redux.save.v1" / tests/godot-browser.mjs:58,73] This isolation assertion can never fail. scripts/serve-godot.mjs:6,20 serves only artifacts/godot-web on 127.0.0.1:4174, and nothing ever seeds that key on that origin (localStorage is per-origin). It is always null whatever main.gd does.
   Fix: before page.goto, run context.addInitScript(() => localStorage.setItem('tenderloin-redux.save.v1', '{"sentinel":1}')). Then assert the key is byte-identical after the mural actions and after the reload. That proves no write or clear. It still cannot prove no read: verify that by code review of main.gd:21 and main.gd:1152/1239/1253, which only ever reference GODOT_WEB_STORAGE_KEY.

3. [Brief "Support talking with Celeste" / main.gd:1503-1506] The talk happens before the walk to Celeste finishes. KEY_E/KEY_T calls walk_to_neighbor(1) and then talk_with_celeste() on the same frame. That has three effects:
   (a) celeste_talk_count is incremented and saved (main.gd:1019,1022) while the player is up to ~100 m away.
   (b) focus_mural_camera (main.gd:1005) sets following_player=false, so the camera leaves the walking player behind.
   (c) If walk_to_neighbor returns false ("No walkable route"), the talk still fires and overwrites that error text in info.
   The browser test runs exactly this path. tests/godot-browser.mjs:35-40 selects Bea (selected_neighbor=0), then presses E. That starts a ~48 m walk, and every motif click (lines 44-50) and the reload (line 66) happen ~1 s later, long before arrival.
   Fix: if the player has not arrived (arrived_neighbor != 1 and not arrived_mural), call walk_to_neighbor(1) and set a pending_talk flag. Consume the flag in finish_neighbor_arrival(1) / finish_mural_arrival. Call talk_with_celeste() immediately only when already arrived. Skip the talk entirely if walk_to_neighbor returns false.

4. [Brief "freestanding portable sidewalk easel clear of the pedestrian through-route" / main.gd:279-377 vs main.gd:616-625, 966-974] The board is not part of the walkability or collision layer:
   - build_mural_board creates no StaticBody3D.
   - is_walkable_point never consults the board.
   - study_test.gd:49 even asserts that the board centre is walkable.
   So routes, WASD sliding and arrivals pass straight through a 3.56 m frame (main.gd:306) whose legs sit at local x=±1.45 (main.gd:296-301). Arrival is radial: ARRIVAL_DISTANCE_M=1.35 (main.gd:13, 1271/1297) and a 0.95 m stand-off (main.gd:972). An approach along the street tangent therefore stops the player at about local x=-1.35, overlapping the 0.16 m leg at -1.45 with a PLAYER_RADIUS_M of 0.45. [ASSUMPTION: the final path segment from the west runs roughly parallel to Turk. Verify by logging mural_node.to_local(player.position) after the study_test.gd:166-170 loop.]
   Fix (smallest):
   (a) In is_walkable_point, reject points inside the board's rotated rectangle grown by PLAYER_RADIUS_M.
   (b) Make the walk goal and the arrival test a stand point on the board's street-facing normal (mural_node.basis.z * ~1.4 from MURAL_POS), not MURAL_POS itself.
   (c) Change study_test.gd:49 to assert that the stand point is walkable and the board centre is not.

SHOULD-FIX

1. [Save/load ordering on Web / main.gd:1144-1153 vs 1236-1247] The two stores have no ordering or freshness rule. Save writes the user:// file first, then localStorage inside a try/catch that swallows errors. Load prefers localStorage unconditionally. Two failure cases:
   (a) If setItem throws (quota or private mode) after an earlier successful write, localStorage keeps a stale blob, and it wins over the newer file.
   (b) If the localStorage blob is corrupt, apply_save_envelope returns "recovered" and resets to defaults without trying the valid user:// file.
   Fix: in load_godot_state, if apply_save_envelope(web_val) returns false, try the file. In save, add a monotonically increasing "seq" to the envelope (main.gd:1133-1142); on Web, load both and pick the higher valid seq.

2. [clear_godot_save on Web / main.gd:1249-1254] Possible race. localStorage.removeItem is synchronous, but the user:// file on Web lives in Godot's IndexedDB-backed FS and syncs asynchronously. If the page reloads before that sync, load_godot_state finds localStorage empty, falls through to FileAccess.file_exists at main.gd:1242, and brings back the cleared save. [ASSUMPTION: Godot 4.7 web syncs the persistent FS on file close but may not sync promptly on DirAccess.remove_absolute. Verify in a browser: clear_godot_save, reload immediately, check save_load_status.] The seq fix above does not cover deletion. The smallest fix is to write an empty-placements envelope (a tombstone) to both stores instead of deleting the file.

3. [Test environment isolation / godot/project.godot:5, main.gd:20, study_test.gd:50,174,311] No custom user dir is configured, so the headless test reads, writes and deletes the same app_userdata/"Tenderloin Redux — measured block"/godot_block_save_v1.json as an editor or desktop run. `npm run godot:test` (package.json:18) wipes a developer's real save. It also has a startup-order dependency: the scene loads the save in _ready (main.gd:195), synchronously inside root.add_child (study_test.gd:14), so the test cannot inject a path through a property before the load happens.
   Fix: read the save path from a user cmdline arg (e.g. `--godot-save-path=user://test_save.json`, via OS.get_cmdline_user_args(), as main.gd:200 already does for --capture) into a var used by save, load and clear. Pass it in the godot:test script.

4. [Magic neighbor index coupling / main.gd:846, 955, 1009, 1399, 1504] Celeste is hard-wired as neighbors[1] in five places, while the mural wiring is keyed by the "celeste" id elsewhere (study_test.gd:115). Reordering the neighbors array silently breaks the panel, the camera focus, the occlusion focus points and the E/T routing. Fix: add const CELESTE_ID := "celeste" and resolve the index once in build_neighbors_and_player into var celeste_index.

5. [Input gating contract / main.gd:1497-1509 vs 1068-1077, 1125-1131, 764-773] Keyboard shortcuts gate the panel inconsistently:
   - P is ignored unless the panel is visible (main.gd:1508).
   - 6/7/8/9 force the panel open from anywhere: overview, or 100 m from the board (main.gd:1071, 1082). They mutate and save, which bypasses the beside-Celeste interaction.
   - 0 runs clear_mural_board (main.gd:1501) from anywhere, without even showing the panel. It destroys saved progress with no visible context.
   - Any WASD step hides the panel and clears arrived_mural (main.gd:771-772), after which P stops working but 6-9 still work.
   Fix: apply one guard to all of 0, 6-9 and P: require (arrived_mural or arrived_neighbor == celeste_index or mural_panel.visible).

6. [Header vs MuralPanel layout contract at 320×667 / main.gd:1662-1679, 1686-1740; study_test.gd:287-292] The header grows from the top with info.text (autowrap, font 17). The MuralPanel is pinned to fixed bottom offsets (top at y=315 on 320×667). The fit test measures the panel while info shows the short "Walking to Bea…" text (study_test.gd:286). In real use the panel shows alongside the much longer dialogue strings at main.gd:994-1001 and 1025, which plausibly wrap to 9-10 lines at 296 px and push the header bottom past y≈315. [ASSUMPTION about font metrics. Verify by calling study.talk_with_celeste() after mural_completed, then running the existing FIT_CHECK print and the panel-top >= header-bottom check at 320×667.] Fix: either run the fit assertion after talk_with_celeste() with all 3 motifs placed, or clamp mural_panel.offset_top to the header bottom in resize_controls / update_mural_ui.

7. [Reload test coverage / study_test.gd:203-213, 218-221] The brief says restore covers "palette, talk count, active motif, and 3D motif positions". The reload test never asserts reloaded.celeste_talk_count == 2 or reloaded.active_motif == "sun". Recovery is tested only for malformed JSON, a wrong schema and an out-of-bounds cell. Untested paths:
   - duplicate cells (main.gd:1221, which the brief names explicitly)
   - wrong version (main.gd:1182)
   - a non-dictionary mural_placements (main.gd:1194)
   - an unknown motif key (main.gd:1202)
   Add one require() for each.

8. [Export freshness gate / tests/godot-browser.mjs:4-5] The gate stats only godot/main.gd and godot/data/buildings.json. A change to godot/main.tscn, godot/project.godot (stretch mode, viewport size, input) or godot/export_presets.cfg leaves a stale index.pck that still passes. Fix: add those three files to the Promise.all stat and to the mtime assertion.

9. [Hard-coded pixel coupling / tests/godot-browser.mjs:42-43 vs main.gd:1686-1687, 1739-1740] row1Y/row2Y (H-255/H-208, narrow H-305/H-258) duplicate MuralPanel offsets and font-13 label metrics from main.gd with no shared source. A one-line change to the label font or offsets makes the clicks land on the wrong row. The only check that would notice, the screenshot inequality at line 53, passes anyway because the panel appearing and the camera moving change the screenshot by themselves. Fix: rely on the save-blob check (lines 60-65) as the oracle, which it partly is already, and add a comment in main.gd:1686 pointing to tests/godot-browser.mjs:42-43. Optionally expose the panel row rects through a debug JavaScriptBridge hook.

10. [Save return contract / main.gd:1144-1153, 1065, 1115] save_godot_state always returns true, even when FileAccess.open returns null, and the setItem error is swallowed. Callers then unconditionally print "Saved to Godot storage". Fix: return file != null, and have the web eval return a boolean from the try/catch. Only show "Saved" when it is true.

11. [Hard-coded geometry claims in text / main.gd:997, 871, 903] The dialogue states "3.4 m clear of the wall", and the info strings state "58 city footprints" as literals. Neither is derived from min_wall_distance(mural_xz()) or data.buildings.size(). Moving MURAL_POS or re-extracting the data would make the copy wrong. Also, the brief's 3.44 m / building 201006.0003465 claim is never asserted: study_test.gd:48 checks only >= 2.35. Fix: format these strings from the computed values, and assert nearest_building_info(mural_xz()).id == "201006.0003465" and distance >= 3.4.

OPTIONAL / NICE-TO-HAVE
- main.gd:1146-1149: the WRITE truncates before writing, so a crash mid-write leaves truncated JSON, the next load reports "recovered" and progress is lost. Write to a .tmp file and use DirAccess.rename.
- main.gd:1182, 1212: int(1.9) == 1 passes the version check, and fractional col/row values are truncated silently. Require the value to equal its floor.
- study_test.gd:293-296: the 44 px and in-viewport button checks run only after clear_mural_board, when buttons show the short "Sun · add" labels. Re-check with all motifs placed and "> Rise (5,2)" labels. Also assert study.mural_buttons.size() == 8, the count the brief requires.
- main.gd:1490-1501: number keys are matched by keycode only. Numpad 6/7/8/9/0 and AZERTY top-row digits do nothing. Add KEY_KP_* cases.
- study_test.gd:47: only the board centre is checked against footprints. Also check the 4 frame corners: mural_node.to_global(Vector3(±1.78, 0, ±0.12)).
- tests/godot-browser.mjs:9: channel 'chrome' is hard-coded and needs a system Chrome. Make it configurable through an env var, as PLAYWRIGHT_MODULE already is.

CUT THESE
1. main.gd:1139 "mural_completed" in the save envelope. It is derived state: apply_save_envelope ignores it and update_mural_3d recomputes it (main.gd:389), so a saved true can disagree with the placements. Safe to cut. Replace tests/godot-browser.mjs:63 with an assertion that Object.keys(mural_placements).length === 3.
2. main.gd:1170-1172, the begins_with("{") / ends_with("}") pre-check. The `parsed is Dictionary` check at main.gd:1174 already covers it, with the same "recovered" outcome. Safe to cut; study_test.gd:218 still passes because "{corrupt-json" fails to parse.
3. The duplicate update_mural_ui() calls: show_mural_panel(true) already calls it (main.gd:1636), and talk_with_celeste (1023) and finish_*_arrival (960, 988) call it again straight after. Harmless redundancy and safe to drop, but low value; cut only if touching those lines anyway.
