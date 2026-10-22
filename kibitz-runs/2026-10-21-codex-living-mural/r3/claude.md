TOOL CHECK: PASS (read godot/mural_stories.gd, godot/main.gd, godot/mural_workshop.gd, godot/rhythm_circle.gd, godot/rhythm_bar.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, artifacts/living-*.log). No git access in this lane, so I could not diff against 2e41ed4. Wherever a claim depends on that diff, I mark it "verify:".

VERDICT: yes-with-fixes. The page, closure and focus wiring is sound. Two things block acceptance. The rhythm natural-end gate is still intermittent: native2 and native3 ran the same wait logic, and native2 failed while native3 passed. The new resident reply also breaks the speech-bubble text contract.

MUST-FIX BEFORE BUILD

1. [IMPORTANT OPEN BASELINE GATE] One green run does not close an intermittent failure, and the new diagnostic gives no information when the test passes.
   - Evidence: artifacts/living-mural-native2.log:181-185 fails at study_test.gd:4384, which was the require line in that build. That line number shows the 4.5 s wall-clock loop (study_test.gd:4379-4381) was already in place. artifacts/living-mural-native3.log:181 and :211 then pass (GODOT_STUDY_PASS) with the same loop. So the change from a 3.3-scene-second wait to a 4.5 s wall-clock wait did not fix it. The clock-domain explanation in the comment at study_test.gd:4382-4383 is contradicted by native2: a 3.0 s bar (rhythm_bar.gd:27-41, LOOP_DISABLED) stayed active past 4.5 s of real time.
   - Diagnostic gap: rhythm_bar.gd:59 reports "position" only when playing is true. So RHYTHM_NATURAL_END prints position 0.0 on every pass (native3:181 and probe2:3 both show it), and that pass-path output proves nothing about timing.
   - Smallest fix:
     a) Leave the assertion unchanged.
     b) Inside the wait loop, record whether any frame saw get_playback_position() >= 2.9. Then print elapsed ms, frames waited, AudioServer.get_driver_name(), AudioServer.get_time_since_last_mix() and the last observed position.
     c) Treat the gate as closed only after at least 3 consecutive full native runs pass. Keep the native1 and native2 logs.
   - How to separate source from test state:
     - If the last position is near 0 while playing is still true, the mixer was not advancing. That points to the environment or Dummy driver, i.e. test state.
     - If the position is at or above 3.0 while playing is still true, the finished/reap path is at fault. That is engine or source.
     - [ASSUMPTION] A candidate test-state cause: study_test.gd:4336-4377 runs about 7 start/stop cycles of the same max_polyphony=1 player (rhythm_bar.gd:47, 49-56) inside one frame, with no await between them. Run one diagnostic variant with `await process_frame` between transitions to discriminate. Use it only to diagnose; do not adopt it as the fix unless it is justified as realistic input timing.
   - verify: `git diff 2e41ed4 -- godot/tests/study_test.gd`. The 4379-4383 rewrite changes the precondition of a shipped assertion: scene seconds became wall-clock and the window grew from 3.3 s to 4.5 s. That change must be disclosed as a test modification, not described as "unchanged".

2. [CONFIRMED "Derived actual neighbor_greeting_line appends Dez/Thanh replies"] The appended reply breaks the speech-bubble parser.
   - main.gd:8525 appends mural_neighbor_reply() after the closing quote of lines shaped like `Dez: "..."` (main.gd:8476-8506; every line ends with `"`).
   - spoken_text_from_line (main.gd:4643-4647) strips the speaker prefix and quotes only when `line.ends_with("\"")`. Once a reply is appended, that check fails and the raw `Dez: "…" That painted guitar…` goes into the 3D bubble, via show_neighbor_speech (main.gd:4673), called from talk_with_neighbor (main.gd:8556) and the arrival path (main.gd:8654).
   - The tests do not catch this. study_test.gd:4189 and godot-browser.mjs:362 check only `contains("painted guitar")` against the greeting string and conversation_detail, never against the bubble.
   - Fix: splice the reply inside the quote in neighbor_greeting_line. If the line ends with `"`, use `line.left(-1) + reply + "\""`.
   - Add a native assertion: with mural_scenes {left:"music"}, after talk_with_neighbor for Dez, speech_bubble_text must not begin with "Dez:" and must contain "painted guitar".
   - Also re-run the existing bubble-fit checks at 320 width. The longest block_opened Dez and Thanh lines (main.gd:8483, 8499) now grow by about 60–90 characters.

3. [MUST-FIX "Preflight3 … must fully finish"] artifacts/living-mural-preflight3.log has no final JSON: no livingMuralChecks, no errors array, no AssertionError. Acceptance cannot cite it yet. Re-check it after it finishes, and confirm godot-browser.mjs:2477-2478 (8 livingMuralChecks, at least 2 with two reactions) actually ran.

SHOULD-FIX

1. [Two compact transient pages / closure indices] The choice closure at mural_stories.gd:158 runs `PAGES[scene_page][i]` with no bounds check. On page 1, i=2 is out of range (PAGES[1] has 2 entries, mural_stories.gd:7). The hidden button cannot be clicked, but `emit_signal("pressed")` from tests or an AT activation would raise an index error. snapshot() guards the same index at mural_stories.gd:341, so the two are inconsistent. Fix: `func(): if i < PAGES[scene_page].size(): select_scene(PAGES[scene_page][i])`.

2. [44px / full names] The native page-0 sweep at study_test.gd:4161 leaves out art.page_button. It is checked only on page 1 (4180), where its text is "Food &\nArt". On page 0 the text is "Music &\nGarden" (mural_stories.gd:254), and its 44px size and text fit are never checked natively. Fix: add page_button to the list at 4161.

3. [Snapshot interface contract] The snapshot shape changes with visibility. mural_workshop.gd:277-282 leaves out "stories" when the workshop is hidden, and mural_stories.gd:331-332 returns only {visible, layout_pending} when the stories view is hidden. Both preflight crashes came from this: artifacts/living-mural-preflight1.log:5 "reading 'layout_pending'" and preflight2.log:5 "reading 'paper'".
   - Remaining unsafe reader: verifyMuralStories' tap (godot-browser.mjs:372) uses `b.visible`, not `b?.visible`. godot-browser.mjs:325 already uses `b?.visible`. Missing buttons should fail as assertions, not TypeErrors.
   - Fix: switch 372 to `b?.visible`, or have the snapshot always emit "buttons": [] and "paper": null.

4. [SHOULD-FIX musician copy] The "silent illustration" note appears only in change_page's message (mural_stories.gd:241). edit_mural_scene overwrites it on the first placement (main.gd:11656). The open_stories copy (mural_workshop.gd:181) never mentions it, even though a real "Music" toggle sits in the same footer (mural_stories.gd:209). Smallest fix: in present() (mural_stories.gd:249), append a short fixed clause when `selected == "music"` or "music" is in game.mural_scenes.values(). Do not rely on the transient message.

5. [Audition finished/gain restoration] The duck is released only on the edge. sketch_player is restored from -80 dB only in the `finished` lambda (rhythm_circle.gd:45-52) or by an explicit stop_audition/apply. tick() (rhythm_circle.gd:493-497) re-checks the stop conditions but never releases a duck once audition_active() is false. Fix: in tick(), `if not audition_active() and game.sketch_player.volume_db <= -79.9 and game.music_volume > 0.0: game.apply_music_volume_db()`, or use a `ducked` flag. This does not replace MUST-FIX 1's diagnosis. [ASSUMPTION] native2's message does not say which of its two conjuncts failed.

OPTIONAL / NICE-TO-HAVE
- Forward compatibility: an older build's clean() would drop "music"/"garden" (mural_stories.gd:38-44 filters on IDS), and its next save would erase them. That is acceptable for optional art, but say so in the release notes. verify: whether any cached older web export can load the same localStorage key.
- present() runs wire_focus() on every refresh (mural_stories.gd:266). It is cheap, but it could run only when the page or visibility changes.

CUT THESE
1. study_test.gd:4191-4194, the 4096-byte budget check with the full profile, 512 bytes of metadata and all surprises, sits inside the 8-viewport loop. Save size does not depend on viewport: every MURAL_STORIES_CHECK reports bytes=1589 (native3:196-210). Run it once outside the loop. It is safe to move because 4253 repeats the same check after the loop.
2. godot-browser.mjs:323 `!s.mural_workshop.stories?.layout_pending` is redundant: mural_workshop.gd:277 already ORs stories.layout_pending into mural_workshop.layout_pending. Removing it is safe, but optional.

Verified as correctly wired, no action needed:
- mural_stories.gd:216-228 drops the hidden third choice from the focus ring, and present() sets visibility before wire_focus (256-266).
- activity_detail_snapshot (main.gd:11284-11296) does not filter hidden buttons, so the index roles at mural_stories.gd:340-349 stay aligned with 3 choices, 2 targets, 2 lifts and palette/music/back/page = 7..10. That matches the fixed indices in godot-browser.mjs:293, 317 and 391.
- open_stories resets the page, brush and thumbnails (mural_workshop.gd:178-180).
- Palette changes reach stories.present() through mural_workshop.gd:241, and the world texture through set_mural_palette, which calls update_mural_3d (main.gd:11863).
- The edit budget is measured in UTF-8 bytes (main.gd:11638, 11646).
