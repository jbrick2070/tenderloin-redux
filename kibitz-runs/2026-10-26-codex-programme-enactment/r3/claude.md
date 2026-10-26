TOOL CHECK: PASS (read input.md, driver_anchor.md, scope_receipt.md, budget-measurement.json, source-before.json, docs/PROGRAMME_ENACTMENT_BRIEF.md, godot/programme_gathering.gd, godot/programme_studio.gd, godot/hosted_afternoon.gd, relevant main.gd ranges, godot/tests/programme_gathering_checks.gd, study_test.gd integration, tests/programme-gathering-browser.mjs, tests/godot-browser.mjs aggregate, export_presets.cfg, package.json). No git diff tool available to me; "new vs old" claims about main.gd rely on the driver anchor's four-line description.

VERDICT: no. The product wiring mostly holds, but the new browser module will fail inside the formal aggregate at 320px. It also leaves `programme.published` in a state that breaks an existing aggregate assertion at all three widths. Separately, a destructive "New posted plan" action reuses the same in-place button as Finish/Next, so a repeated tap or double-click wipes a completed visit.

MUST-FIX BEFORE BUILD

1. [driver_anchor "Evidence and limits": "106+Node/all prior full-browser matrices and 3 genuine journeys after existing Programme Studio check"]
   Defect: tests/programme-gathering-browser.mjs:16 sets the 320px `proposed` order to ['art','beats','pause','stories']. That is exactly what verifyProgrammeStudio has just posted at tests/godot-browser.mjs:1883-1887 (the non-preHost path, called at 2873, immediately before 2874). Lines 17-18 rebuild the same draft, so draft==published. programme_studio.gd:348-349 then makes primary "Posted" and disabled; the gathering override at programme_studio.gd:350 applies only when `posted` is true, and line 15 of the module asserts Draft view. tap() at programme-gathering-browser.mjs:7 asserts `!b.disabled`, so the formal aggregate fails at 320 before entering the gathering. The private browser2/3 cases could not catch this; they used fixtures, not the aggregate's prior state [ASSUMPTION based on anchor wording "Browser aggregate integration postdates earlier private cases"].
   Fix (test-only, 0 PCK bytes; tests/* is excluded per godot/export_presets.cfg:7 and tests/*.mjs is outside godot/): choose a 320 order that is valid, differs from ['art','beats','pause','stories'] and from `revised` (e.g. ['pause','art','stories','beats']), or derive `proposed` as the first valid order != current published. Assert published != proposed before tapping.

2. [same section; "Two old no-second-gathering Studio statements ... deliberately revised"]
   Defect: the module reposts `revised=['stories','beats','art','pause']` at programme-gathering-browser.mjs:40 and never restores it. The reload at line 57 persists it. The existing aggregate assertion at tests/godot-browser.mjs:3189 still requires `parsedSave.programme.published` to equal ['art','beats','pause','stories']. storageBeforeReload is captured at 3149, after 2874, so this fails at 1100/390/320.
   Fix (test-only): either deliberately update 3189 to the module's final revision (and name it as a revised old assertion like the Hosted ones), or have the module re-post its entry `published` via Draft before returning. The first option is smaller.

3. [driver_anchor "Actual connected candidate": "Separate Finish acknowledges completion ... Real edits/reposting retain copied order until deliberate new plan after completion"]
   Defect: programme_gathering.gd:161 relabels the same `next` control from "Finish gathering" or "Next handoff" to "New posted plan" in place. advance() (lines 117-118) then calls prepare(), which clears gestures and completed with no confirmation.
   - Trigger: a mouse double-click or two phone taps on Finish gathering, or one tap too many on "Next handoff" while reviewing a completed visit.
   - Proof: the module itself shows it. Three button(3) taps at line 47 bring review_step to 3, and the next button(3) at lines 50-51 restarts the visit.
   - Consequence: the completed closure and three handoffs are discarded; "Revisit gathering" is lost.
   - The label also appears when no new plan was posted (published==order), so the restart is mislabelled.
   - Keyboard is safe only because focus moves to the reader (lines 108/112/118/120). Pointer and touch are not.
   Fix within the 636B headroom: never put the restart on `next`. For example, when completed and review_step==gestures.size(), hide `next` and show choices[0] (its row is otherwise hidden when completed) labelled "New posted plan". Branch handoff() to advance() when completed. Alternatively, make restart appear only on reentry, not in the refresh that set `completed`. Add native and browser assertions that a second activation of Finish leaves completed==true and gestures intact. Remeasure the PCK.

SHOULD-FIX

4. [Interface contract: bea_invitation.TITLES → gathering prose] programme_gathering.gd:124 interpolates `TITLES[copies.stories].to_lower()` as an adjective. TITLES are full phrases (bea_invitation.gd:3), so every player and screen reader hears "Bea: Our a small moment you want to keep invitation is the original copy." (or "Our something you hope to make together invitation"). The native check only asserts the handoff string and owner prefix (programme_gathering_checks.gd:84), so this is uncovered. Fix: 'Bea: Our invitation, "%s", is the original copy. ...' with TITLES unmodified (about 0 net bytes). Add an exact-text assertion for both "memory" and "future".

5. [Ownership: refusal channel] When hidden, refuse() writes the gathering refusal into studio.budget_notice (programme_gathering.gd:65). That field is the save-budget channel:
   - It is shown first in both the Draft and Posted descriptions (programme_studio.gd:295).
   - It suppresses the "imported profile too large" line (296).
   - It survives toggle_view (254-260).
   - It is copied into game.info and last_panel_dialogue on close (157-159).
   - It is cleared only by a successful allow_envelope or by open_studio.
   This hidden branch is also untested: the refusal checks at programme_gathering_checks.gd:97-100 call prepare() while the gathering is visible. Fix: keep refusal text in gathering.notice and have studio.description() show it in Posted view only, or clear budget_notice in toggle_view. Add one native case: open_gathering() with an invalid copy while hidden.

6. [Sequencing inside the formal browser aggregate] The module's page.reload() (line 57) now runs in the middle of the main run. Before this change, the first reload after the Studio checks was at godot-browser.mjs:3198. Everything at 2876-3149 now runs on reloaded in-memory state: Voices, perf, the a11y DOM block at 2965-2980, and the 10-surprise reward loop at 2982-3008, which requires reward_audio_playing===true at 3005. Lost state includes the local WAV loaded at 2707, the manual camera intent from 2846, and in-game audio unlock. verify: each of those assertions is reload-agnostic. Fix: after the reload, re-establish intent the way 2117/2173 do, or move the reload sub-journey after the 3198 reload.

7. [Formal gate wiring] Nothing under scripts/, tests/, package.json or artifacts/programme-enactment-20261026/*.py references "PROGRAMME_GATHERING_PASS:FORMAL" or binds 28 tokens. FORMAL appears only in the godot/tests/*_checks.gd emitters. verify: where the 27+1 token binder lives. If it lives only in driver-side tooling, the "28th token" claim is not reproducible from the repo.

8. [Native ordering vs anchor wording] study_test.gd:3307 runs the gathering check before verify_programme_studio (3311) and hosted_afternoon_checks (3312). Restoration through apply_save_envelope(original) clears the visit. It does not restore shared_panel.textures or bea_invitation.textures, which gain entries in prepare() (programme_gathering.gd:75), and it does not restore gathering.held_on_exit; reset_visit at line 104 never clears it. verify: no later native check asserts those cache sizes or a fresh held list.

OPTIONAL / NICE-TO-HAVE

- open_gathering always announces "Gather again." (programme_gathering.gd:84), even on Resume or Revisit. Use title().
- While the gathering is visible there is no Music control. The Studio tray is hidden (programme_studio.gd:171) and main.gd:14730-14734 swallows all keys while the Studio is visible. Music state is preserved, but the player cannot stop music without leaving.
- pause_for_exit (programme_gathering.gd:93-95) arms the held-key guard on every Studio close once an order exists, including Draft and Hosted-view closes. The 8-key list duplicates the movement bindings; verify it matches main's full movement set.
- Budget [driver_anchor "Measured budget correction"]: the record is honest. The 14500B "allocation" and its 252B contingency are bookkeeping; the binding number is the 636B left under the 2097152B cap.
  - MUST 1-2 are test-only (0 PCK bytes).
  - MUST 3 and SHOULD 4-5 touch product code and need a PCK remeasure.
- Verified holds, no action needed:
  - Native reset runs before validation (main.gd:13037).
  - A failed browser import returns at 13616 before any reset or close; success resets at 13739, after the merges.
  - Reset-to-defaults clears the visit (12532).
  - The held-key guard sits after the focused-activity early return (14320/14322).
  - No new Escape branch: 14730-14734 → close_studio → pause_for_exit.
  - prepare() validates prerequisites, all four Hosted.copied values and both textures before its single assignment (line 77), so refusal is transactional.
  - Texture aspect is 360x240 for both the invitation (bea_invitation.gd:82) and the panel (main.gd:9724), matching prop_rect.
  - Literal zero beats is handled in both text (129) and drawing (206).
  - Studio captures siblings only (programme_studio.gd:126-127).

CUT THESE

1. programme_gathering.gd:147: the ~400-byte instruction paragraph is re-emitted at every step. Trim it to one sentence, e.g. "Back edits the pinboard without changing this copied visit; reload or a successful import clears it." That frees PCK headroom for MUST 3. Safe to cut: the same disclosure is repeated in the back_to_studio announcement (89) and the close_studio message (programme_studio.gd:166).
2. The second heading line, "Fictional gathering | Original copies | This visit only" (line 153), duplicates the reader text. It is safe to drop if bytes are needed after remeasure, because the disclosure stays in description() and closure().
