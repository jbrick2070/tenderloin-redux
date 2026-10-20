TOOL CHECK: PASS (read godot/main.gd, godot/tests/study_test.gd, godot/project.godot successfully)

- VERDICT: yes-with-fixes. The panel-local dedupe and What's Next/Goodbye routing work on the paths the tests cover. Three things are still wrong: Goodbye does not cancel a walk that is already underway, three panels share one dialogue slot, and the dedupe rule is not used by info/a11y. On top of that, the new memory text is clipped out of view at every tested width.

MUST-FIX BEFORE BUILD

1. [end_conversation, main.gd:5688-5717] Goodbye does not cancel an in-flight walk. It resets arrived_* and selected_neighbor, but it leaves walking_to_mural, walking_to_speaker, pending_celeste_talk, pending_rook_talk, walking_to_history_stop and current_path untouched.
   Repro: "Paint with Celeste" -> open_mural_from_block_panel (main.gd:7750) -> walk_to_mural (main.gd:6940) sets walking_to_mural=true -> press Esc/Goodbye -> advance_walk keeps stepping because current_path is not empty -> finish_mural_arrival fires (main.gd:11470-11471 / 11504-11505 / 11525-11526) and the MuralPanel reopens right after the "You said goodbye" text. The speaker has the same problem (walking_to_speaker, main.gd:6989 -> finish_speaker_arrival).
   pending_rook_talk is also left dangling. A later WASD proximity arrival at Rook (main.gd:11760-11764 -> finish_neighbor_arrival, main.gd:7468-7472) then runs check_sound_with_rook unprompted and sets rook_soundcheck_done=true (main.gd:7705).
   Fix: in end_conversation, before show_*_panel(false), add: current_path.clear(); walking_to_mural=false; walking_to_speaker=false; pending_celeste_talk=false; pending_rook_talk=false; walking_to_history_stop="". These are the same resets walk_to_neighbor already does (main.gd:6897-6904).

2. [ask_whats_next main.gd:5675-5676 + update_block_ui main.gd:12500-12501] last_panel_dialogue is one string shared by three panels. Only the mural and music readers check the speaker prefix (main.gd:12420, 12455). update_block_ui uses the string unconditionally.
   Repro: MuralPanel open -> "What's Next?" stores `Celeste: "..."` -> press G -> toggle_block_panel/show_block_panel(true) (main.gd:12370, 12358) -> BlockPanel detail shows Celeste's line under a hub header or another neighbor's header.
   Neither show_block_panel nor toggle_block_panel clears the slot. It is only cleared at main.gd:5700, 7384, 7424, 7666, 7707 and 10290.
   Fix (smallest): clear last_panel_dialogue in show_mural_panel(true), show_music_panel(true) and show_block_panel(true) when the panel was not already visible. Alternative: give update_block_ui a prefix guard against the current talk subject, like the other two readers have.

3. [talk_with_celeste main.gd:7680-7683, check_sound_with_rook main.gd:7722-7725, talk_with_neighbor main.gd:7394-7397, finish_neighbor_arrival main.gd:7445-7491] The dedupe rule is not applied to info.text or announce_a11y_status.
   On turn 5, the dialogue line already contains the surprise memory: options[4] is replaced in celeste_dialogue_text (main.gd:7571-7572 / 7581-7582), rook_dialogue_text (7600-7601 / 7610-7611) and neighbor_greeting_line (7364-7366). neighbor_project_memory_line (main.gd:8941-8977) still returns base · surprise or the surprise alone. info.text and the screen-reader announcement therefore repeat the same sentence twice.
   Also, the panels alternate base vs surprise by turn parity (main.gd:12426, 12461, 12509), while info always shows the full memory. The two views of the same turn disagree.
   Fix: extract one helper, memory_tail(n_id, spoken_line, turn) -> String, containing the logic now copy-pasted three times at main.gd:12421-12429, 12456-12464 and 12504-12513. Call it from all six sites (3 UI updaters + 3 talk functions) and from finish_neighbor_arrival.
   Add a test: discovered_surprises full, celeste_talk_count=4, talk_with_celeste(), then assert info.text.count("145 Leavenworth") == 1.

4. [MuralPanel construction main.gd:12684-12685, resize_controls main.gd:12871-12872; item 3 of the brief] mural_detail_label is clip_text=true with no autowrap. The text is `<dialogue line> · <memory>` (main.gd:12430), and the dialogue lines alone run about 100-250 chars (main.gd:7562-7579). The appended memory is therefore clipped off-screen at 1100 px (about 1060 px usable at 14 px) and certainly at 390 and 320 px (12 px font, about 280-350 px usable). [ASSUMPTION: about 7 px/char average advance]
   On narrow screens, info is also hidden while any side panel is open (update_conversation_ui main.gd:6287-6288). The memory line is then not visible anywhere on a phone; only the a11y announcement carries it.
   The test at study_test.gd:1536 checks `mural_detail_label.text.contains("145 Leavenworth")`. That proves the string, not that it is visible. music_stem_label has the same problem (clip_text=true, main.gd:12729), with a "Groove Stems: ... — " prefix in front (main.gd:12469).
   Fix: either (a) mirror apply_block_panel_mode's talk branch (main.gd:5863-5865): autowrap WORD_SMART + max_lines_visible=2. Re-check the height budget: the narrow panel is 192 px (-368..-176) and holds a header plus 3 button rows at 44 px min (main.gd:12954), about 180 px today, so a second detail line needs about 16 px more, e.g. offset_top -384 on narrow. Or (b) put the memory first, or drop the memory from the label on narrow, since the speech bubble already carries the dialogue.
   Add a test that asserts mural_detail_label.get_line_count() or visible characters at 320x667, not just .text.

SHOULD-FIX

1. [update_block_ui main.gd:12487 vs ask_whats_next 5663, end_conversation 5694, keep_chatting 5720, conversation_actions 5764] The block panel has two sources of truth for who you are talking to. update_block_ui takes the subject from arrived_neighbor, then selected_neighbor. The conversation buttons, What's Next and Goodbye use talk_partner.
   Repro: talking with Bea -> "Talk to Dez" (walk_neighbor:3) -> walk_to_neighbor(3) (main.gd:6891-6896) sets selected_neighbor=3 and arrived_neighbor=-1. It does not hide the block panel for non-Celeste/Rook targets (6905-6910), and run_conversation_action does not re-show the conversation for walk_neighbor (5798).
   While walking, the header and theme say "Talking with Dez", but the action buttons are Bea's, What's Next speaks as Bea, and Goodbye says goodbye to Bea.
   Fix: in update_block_ui, use talk_partner first when block_panel_mode == "talk"; or have walk_to_neighbor set talk_partner=-1 / hide the block panel for every target.

2. [update_block_ui main.gd:12509 vs update_mural_ui 12426 / update_music_ui 12461] The parity formulas differ. The block panel uses `int(neighbor_talk_counts.get(n_id, 1)) % 2` with no maxi(1, ...), so a count of 0 picks the surprise branch. Mural and music use maxi(1, count) and pick base.
   finish_neighbor_arrival normalizes 0 to 1 (main.gd:7426-7427), but show_conversation from save restore or tests does not.
   Fix: use the shared helper from MUST-FIX 3.

3. [talk_with_celeste main.gd:7669-7672, check_sound_with_rook main.gd:7711-7718] update_*_ui runs twice per talk: once inside show_*_panel(true) (main.gd:12344, 12356) and again explicitly. The two paths are also ordered differently. Celeste updates before trigger_progress_cue, Rook after. spark_count does not change inside trigger_progress_cue (main.gd:9265-9310, 5220-5234), so nothing renders stale today, but anything added to the cue later will diverge between the two characters.
   Fix: drop the explicit update_mural_ui call at 7672 (or the one inside show_mural_panel), and put the Celeste and Rook paths in the same order.

4. [ask_whats_next main.gd:5679-5681] It calls all three update_*_ui unconditionally. That re-applies the character stylebox to hidden panels and recomputes their dialogue, which hides the stale-slot bug in MUST-FIX 2 until the panel opens.
   Fix: update only the visible panel.

5. [neighbor_greeting_line main.gd:7366] The speaker label is built with n_id.capitalize(), while every other line uses neighbors[i].name or a literal. Today the ids match the names (main.gd:456-460), but this is a separate naming contract. If a display name ever differs from its id, the dedupe .contains() checks and any prefix guard break silently.
   Fix: look up the display name from neighbors.

6. [resize_controls main.gd:12870-12872 vs construction 12681, 12686] The initial font sizes (17/15) differ from the non-narrow resize values (16/14). resize_controls.call() at main.gd:12924 overwrites them immediately, so the construction values are dead.
   Fix: set one value so the next reader is not misled.

OPTIONAL / NICE-TO-HAVE
- Glyphs: project.godot sets no custom font or theme, so the engine default font is used. The dialogue uses “ ” ’ — · × ©. [ASSUMPTION] The Godot 4 embedded default (Open Sans) covers Latin-1 and General Punctuation. verify: engine version used for the web export, and that the export does not strip the default font.
- trim_prefix("“")/trim_suffix("”") is repeated at 7366, 7572, 7582, 7601, 7611, 12427, 12462 and 12511. Fold it into neighbor_surprise_memory_line by returning the bare text.
- study_test.gd:1538 asserts mural_detail_label.text begins with `Celeste: "`. It does not assert that the What's Next line replaced the turn line, or that MuralPanel stays visible after ask_whats_next.

CUT THESE (over-engineering)
1. The `Turn %d/5` counter in mural_label, music_label and block_label (main.gd:12417-12418, 12449-12450, 12493-12494). It is a single clip_text line, so on narrow widths the counter crowds out "Sparks", and it exposes an internal modulo to players. Cutting it is safe: the turn number is not used by the dialogue-selection logic (that recomputes its own posmod). Only study_test.gd:1504 and 1508 assert it, so update those two lines.
2. The alternating base/surprise memory by turn parity (12426, 12461, 12509). With the dedupe in MUST-FIX 3, just show base_mem when the spoken line already contains the surprise and the full memory otherwise. The parity rule adds a third state that info/a11y never matched anyway.
