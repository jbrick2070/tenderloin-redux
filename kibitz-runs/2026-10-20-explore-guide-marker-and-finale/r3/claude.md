TOOL CHECK: PASS (read input.md, godot/main.gd, godot/tests/study_test.gd successfully)

Scope note: I had no shell/git access, so I reviewed the current working-tree state of godot/main.gd and godot/tests/study_test.gd rather than a literal diff. Where I cannot tell whether a line is new in this iteration, I say so. Line numbers are current working-tree lines.

VERDICT: yes-with-fixes. The wiring is mostly coherent, and save/reset clears the new state at both entry points. But three code paths each pick "the next surprise" in a different order, so Shift+D can contradict the GuideMarker and the "Spot Surprise" button in the same panel. The new 4.6 m tap sample is also applied to all 10 surprises and runs before the museum/eatery checks.

MUST-FIX BEFORE BUILD

1. [Shift+D vs GuideMarker contract: main.gd:5393-5413 vs main.gd:5613-5624 vs main.gd:6114]
   Defect: three functions choose the next surprise, and each uses a different priority order:
     - next_explore_surprise_id() (feeds current_objective().surprise_id, so it decides where the GuideMarker, GuideArrow and objective text point): the open panel's neighbor comes first (next_undiscovered_surprise_for_neighbor), then last_hinted_surprise_id, then the first undiscovered surprise.
     - cycle_neighborhood_surprise() (Shift+D, main.gd:12356): last_hinted_surprise_id comes FIRST, then the open panel's paired surprises, then round-robin.
     - The conversation "surprise" action (main.gd:6114): uses talk_partner's pair or the first undiscovered surprise, and ignores last_hinted entirely.
   Repro, traced by reading the code (not run): ask_whats_next() with Bea sets last_hinted_surprise_id="mayor_pomp_event" (main.gd:5909). Then end_conversation() (it does not clear the hint, by design; test study_test.gd:1548). Then open MuralPanel. active_panel_neighbor_idx() returns celeste_index (main.gd:5312-5313), so the marker and objective text point at Celeste's first undiscovered pair. Shift+D still takes the last_hinted branch at main.gd:5397-5398 and opens mayor_pomp_event. inspect_neighborhood_surprise() then blanks last_panel_dialogue, because Bea is not the active panel (main.gd:5377-5378). Result: the player follows the gold marker, presses the key the objective text names ("Shift+D"), and lands somewhere else. Meanwhile the BlockPanel "Spot Surprise" button for the same neighbor (main.gd:6114) agrees with the marker, not with Shift+D.
   Fix (smallest): in cycle_neighborhood_surprise, when target_idx < 0, take obj = current_objective(). If obj.id == "explore" and obj has "surprise_id", set target_idx = NEIGHBORHOOD_SURPRISE_IDS.find(obj.surprise_id). Otherwise keep the round-robin. Delete the bespoke last_hinted and pair lookup at main.gd:5397-5408 (see CUT 1). This gives one resolver, and "Shift+D goes where the marker points" becomes true by construction. Existing test study_test.gd:1565 still passes: with MuralPanel open, current_objective() resolves to Celeste's pair. verify: whether study_test.gd:1493's Shift+D loop runs in the explore chapter. If it does, "first undiscovered" equals the sequential round-robin from surprise_guide_idx=-1, so the loop still passes.
   Add a test: set last_hinted to a Bea pair, open MuralPanel, then assert that the id discovered by Shift+D == the current_objective().surprise_id captured just before.

2. [Explore-mode round-robin can contradict the marker: main.gd:5411-5412]
   Defect: in explore with no panel and no hint, Shift+D falls through to (surprise_guide_idx + 1) % 10. surprise_guide_idx is overwritten by every inspect (main.gd:5323-5325), including tap-inspects of already-discovered surprises. So after the player re-taps a found surprise, Shift+D moves to the next index whether or not it is already found, while the marker shows the first undiscovered surprise (main.gd:5621-5623). Re-inspecting a found surprise produces no burst, so the press feels dead.
   Fix: closed by MUST-FIX 1. Explore always resolves through current_objective().surprise_id, and round-robin remains only outside explore and after 10/10.

SHOULD-FIX

1. [Multi-height tap hitbox applied to every surprise, ahead of other tap targets: main.gd:12104-12110, main.gd:12146-12158]
   Defect A (priority order): the surprise loop runs before the so-what easter egg, museum, Boeddeker park and eatery checks (main.gd:12159-12180). Those checks return on the first match without comparing screen distances. The column now samples heights 0.8/1.6/2.6/4.6 m for all 10 surprises with a 32 px radius and a 9.5 m ground gate, so a tap aimed at a nearby museum/eatery sign can be claimed by a surprise. Candidate collisions from the record positions (verify: whether surprise_points[s_id] (c2) differs from rec.pos):
     - surprise at (-376.2, 62.4) (main.gd:281) is 7.9 m from the eatery at (-384.0, 63.8) (main.gd:650), inside the 9.5 m gate.
     - surprise at (-296.0, -52.0) (main.gd:371) is 12.7 m from MUSEUM_HUB_POS (-293.5, -64.5) (main.gd:642).
     [ASSUMPTION] Whether these overlap on screen depends on camera yaw and pitch. verify by tapping the museum and that eatery at default yaw, view_size 52.
   Defect B (contract): 4.6 duplicates the magic number in guide_marker_anchor (main.gd:5741, lift 4.6 when neighbor < 0). The gem mesh spans local y 0..1 scaled by s = screen_constant_scale(30) (main.gd:5726-5727, 5768-5769), so the visual center sits at 4.6 + 0.5*s, about 5.7 m at the default zoom. The 4.6 m sample hits the diamond's bottom tip. And the marker floats over only ONE surprise, yet the 4.6 m sample is added to all ten.
   Fix: lift 4.6 into a shared const (e.g. GUIDE_MARKER_LIFT_LOW) used by both functions. Sample the marker height only for the s_id whose surprise point matches guide_marker_target, and use guide_marker.global_position (its live center) rather than the constant. Keep the 0.8/1.6/2.6 samples for all surprises.
   Test gap: study_test.gd:1573-1574 checks one camera setup (view_size 52, default viewport). It does not cover 390/320 viewports, and it has no negative test that a museum/eatery tap still reaches its handler.

2. [Panel-neighbor fallback hides last_hinted: main.gd:5614-5618 together with main.gd:6080-6082]
   Defect: next_explore_surprise_id() takes next_undiscovered_surprise_for_neighbor(p_idx) whenever a panel is open. That function falls back to the first undiscovered surprise globally when the neighbor's pairs are all found. So opening the panel of a neighbor whose pairs are done makes the marker jump from the hinted surprise to the global first one, even though nobody gave a new hint. That undercuts "last_hinted persistence across conversation panels".
   Fix: in next_explore_surprise_id, accept the panel result only if it is one of that neighbor's undiscovered NEIGHBOR_SURPRISE_PAIRS entries. Otherwise fall through to last_hinted. ask_whats_next still overwrites last_hinted with the global fallback when that neighbor is actually asked (main.gd:5909), so the hint and the marker stay in agreement.

3. [GuideArrow label overflow at 390/320: main.gd:6203-6207]
   Defect: in explore, the label is "<surprise title> · N m" at font 15 (main.gd:13160), e.g. "Impromptu 'Mayor Public Event' & Ribbon Cutting · 312 m" (title per study_test.gd:1545). That is roughly 400 px wide, and it is centered on an arrow clamped only 26 px inside play_area_rect, with no clamp on the label's own rect. At 320 or 390 width it spills past both screen edges whenever the arrow sits on a left/right edge. Test study_test.gd:1330 checks only guide_arrow.position, not the label's rect.
   Fix: after computing lbl_size, clamp the label's global rect into play_area_rect(). On is_narrow_layout(), truncate guide_marker_target_name (or show only the distance).

4. [Finale RewardBanner text is clipped at all three widths: main.gd:5361, 5355-5358, 5486-5503, 5510]
   Defect: the title label is single-line with clip_text, font 15, inside width w = min(460, max(180, area.x-16)), minus 24 px of content margins.
     - At 1100: about 436 px, roughly 58 chars. "* All 10/10 Surprises Found: Impromptu 'Mayor Public Event' & Ribbon Cutting *" is about 80 chars, so the surprise name is cut.
     - At 320: about 264 px, roughly 35 chars. The title shows as "* All 10/10 Surprises Found: Impro".
     - The body ("10/10 Surprises (All Keepsakes!) · Sparks: N · Keepsake: <label>") is limited to 2 lines (max_lines_visible=2). At 320 the keepsake label will likely be cut.
   Tests study_test.gd:1500/1502 assert on .text only, so they cannot catch this.
   Fix: for the finale, use a fixed short title ("All 10/10 Keepsakes!") and move the surprise title into the body. Alternatively, drop "Sparks: N" from the finale body when is_narrow_layout() is true.

5. [The finale fanfare reads global state instead of the cue arguments: main.gd:9575-9579]
   Defect: trigger_progress_cue selects the 4-note finale by reading discovered_surprises.size() at call time, not from the cue/reason arguments. It is correct today only because inspect_neighborhood_surprise writes discovered_surprises[s_id] (main.gd:5340) before calling the cue (main.gd:5362). If the two lines are ever reordered, or if a cue is replayed from cue_history, the wrong arpeggio plays.
   Fix: pass the finale explicitly, e.g. trigger_progress_cue("surprise_discovery", "all_found" if all_found else s_id). all_found is already computed at main.gd:5354.

OPTIONAL / NICE-TO-HAVE
- last_hinted_surprise_id is session-only. apply_save_envelope clears it (main.gd:11172), and test study_test.gd:1558 enforces that. After a reload the marker reverts to the first undiscovered surprise. That is fine if intended, but "persistence" in the iteration description means across panels only, not across saves. State that in a comment next to main.gd:866.
- The finale banner uses the same 3.2 s timer as an ordinary discovery (main.gd:5527), and update_celebration_burst hides it on overview (main.gd:5545). Consider about 5 s for the 10/10 case.
- Per-frame cost: update_conversation_ui calls current_objective() every frame (main.gd:6563). In explore that runs compass_phrase plus several string formats per frame. This pattern predates this iteration, and it gets cheaper if MUST-FIX 1 makes current_objective() the single resolver; caching it per frame would help.
- The browser v1 import (main.gd:11562+) merges additively and never touches discovered_surprises or last_hinted. That is consistent with this iteration's design and needs no change. Noted here as checked.

CUT THESE (over-engineering)
1. [main.gd:5397-5408] The last_hinted check and the NEIGHBOR_SURPRISE_PAIRS loop inside cycle_neighborhood_surprise duplicate next_explore_surprise_id() and next_undiscovered_surprise_for_neighbor(), with a different precedence. That duplication is the root cause of MUST-FIX 1. It is safe to cut: current_objective().surprise_id already encodes the panel → hint → first-undiscovered order, and the tests that exercise Shift+D with a panel open (study_test.gd:1565) resolve the same way through it.
2. [main.gd:6114] The "surprise" conversation action could call cycle_neighborhood_surprise() with no argument when in explore, instead of passing next_undiscovered_surprise_for_neighbor(talk_partner). In explore, with BlockPanel in talk mode, current_objective() already resolves to talk_partner's pair via active_panel_neighbor_idx() → block_panel_neighbor_idx() (main.gd:5303-5304). Keep the explicit argument only for the non-explore second-slot "surprise" action (main.gd:6050-6051).
