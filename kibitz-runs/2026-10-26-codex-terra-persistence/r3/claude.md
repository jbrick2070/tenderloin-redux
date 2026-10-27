TOOL CHECK: PASS (read kibitz-runs/2026-10-26-codex-terra-persistence/r3/input.md, godot/main.gd, godot/shared_panel.gd, godot/programme_studio.gd, godot/rhythm_circle.gd, godot/mural_stories.gd, godot/tests/persistence_checks.gd, godot/tests/study_test.gd, tests/persistence-browser.mjs, tests/godot-browser.mjs, godot/export_presets.cfg, r3/final-gates.py)

VERDICT: yes-with-fixes. The core wiring matches the claims. Web writes are key-only (main.gd:10673-10681). The sequence advances only on success (main.gd:12529-12542). Import refusal happens before any reset (main.gd:13624-13637 vs. the resets at 13638+). The warning is threaded through announce_a11y_status, persistence_text and update_objective_ui (main.gd:11999-12002, 12524-12527, 6194-6198). Four defects remain:
- one stated contract is falsified in the Studio hosting-start path;
- the two admission implementations disagree at a boundary;
- the native writer still returns a cheap false success;
- two browser "recovery" checks assert the absence of text instead of a storage change.

MUST-FIX BEFORE BUILD

1. [Scope bullet 4, "final action speech includes the notice"]: the Studio hosting-start path overwrites the action speech with the bare notice.
   Defect: programme_studio.gd:229-238 (advance) runs in this order:
   - allow_envelope() sets budget_notice=save_receipt("save full") when admission==1 (programme_studio.gd:183).
   - advance_programme_and_hosting_step() calls host_start(). host_start saves and then calls announce_a11y_status("Started hosting ... (1/4: X).") (main.gd:9904-9910). persistence_text already prefixes "Visit-only: save full; ..." to that speech (main.gd:12002).
   - programme_studio.gd:238 then calls announce_a11y_status(budget_notice). That replaces last_a11y_announcement (main.gd:12004), so the final speech is only "Visit-only: save full; reload restores the last save." The hosting action itself is never spoken.
   This is the exact "final action speech includes the notice" contract the doc claims, and it fails only in the oversized-profile case that this batch targets.
   Fix (smallest, and it reduces package size within the 44 B headroom): delete programme_studio.gd:238. Also consider deleting 235-236, because update_objective_ui and persistence_text already put the notice in the header and in the speech. Then add one native assertion: after advance() on an oversized profile, last_a11y_announcement contains both "Started hosting" and "Visit-only".

SHOULD-FIX

1. [Scope bullet 6, "budget admission permits non-growing edits ... rejects growth"]: there are two admission implementations with different boundary semantics.
   Defect: save_budget_kind (main.gd:12511-12518) computes `oversized` from build_save_envelope() at the CURRENT save_seq (line 12515). Only then does it set current.save_seq=save_seq+1 (line 12516) and compare bytes at seq+1. edit_mural_scene (main.gd:12167-12184) uses seq+1 for both the current and the candidate measurement.
   At a decimal rollover (seq 9→10, 99→100), a profile that is exactly 4096 B at seq N is 4097 B at N+1. For that profile:
   - save_budget_kind returns -1, so SharedPanel/Studio refuse even a non-growing edit with "Change not made".
   - edit_mural_scene allows the same non-growing edit.
   persistence_checks.gd:46-54 tests that rollover only for the writer, not for admission.
   Fix: move line 12516 above line 12515, so `oversized` is measured at seq+1. Ideally edit_mural_scene would call save_budget_kind instead of duplicating it, but only if the byte budget allows.

2. [Scope bullet 2, native writer]: post-open failure still yields a false "Saved", and there is a cheap partial close.
   Defect: write_save_json ignores the store result (main.gd:10679-10681: store_string, close, return true). On a short write, save_seq advances, save_notice clears, and every receipt says "Saved to Godot storage." Because FileAccess.WRITE truncates on open, the next load reads a truncated file and goes to "recovered", which is data loss. The doc correctly says this is NOT solved. But the false-success half can be detected cheaply, separately from atomicity.
   Fix: `var ok := file.store_string(raw); file.close(); return ok`. verify: in the target engine (Godot 4.7, project.godot), FileAccess.store_string returns bool. That has been true since 4.4 [ASSUMPTION]. This costs PCK bytes. Measure it against the 44 B headroom after MUST-FIX 1 frees bytes. If it doesn't fit, leave it and keep the doc's "not solved" wording as is.

3. [Evidence: Browser PRIVATE synthetic fault profiles]: the studio and mural "recovery" steps never prove that storage changed.
   Defect: tests/persistence-browser.mjs:39 (studio) and :44 (mural) call reject([]), tap, and then only assert that the reader text no longer includes "Visit-only". That proves save_notice was cleared, not that the authoritative key was rewritten or survives reload. The progress stage (:33) and the shared-panel stage (:42) do assert a storage delta and reload. The flags checks.studio and checks.mural feed final-gates.py:83-85 as acceptance, so they claim more than they verify.
   Fix (test-only, outside the PCK because export_presets.cfg:7 excludes tests/*): after each recovery tap, add `assert.notDeepEqual(await storage(), stable)` (studio) and `assert.notDeepEqual(await storage(), muralStorage)` (mural). Optionally add a reload and assert the edited draft/scene is retained.

4. [Evidence: "new native module is intentionally TERMINAL"]: it isn't actually last, and the gate has no timeout.
   Defect: the module runs at study_test.gd:3325. More suite code runs after it (3326-3333): clear_godot_save, clear_godot_settings, a legacy settings write via FileAccess.open(study.settings_path) with no null check, and a load. That code relies on persistence_checks.gd:80 having restored save_path and settings_path. require() doesn't abort, so paths are restored on assertion failures. But a GDScript runtime error inside the awaited chain (for example at persistence_checks.gd:17-20 if studio/gathering is null) stops the coroutine, and quit() is never reached (study_test.gd:3337-3342). scripts/run-godot.mjs has no timeout, and final-gates.py:32 calls subprocess.run without timeout=. So the formal controller hangs with no receipt.
   Fix: add timeout= to final-gates.py:32 (subprocess.run). It's controller-only, so it costs no PCK bytes. Optionally reword the doc's "TERMINAL" claim to "last feature module; restores save_path/settings_path before suite cleanup".

5. [Evidence / final gate wiring]: the intentional fault paths must not emit engine log text that the gate rejects.
   final-gates.py:88 fails the native gate if "ERROR:" or "WARNING:" appears anywhere in the log. The new module deliberately triggers FileAccess.open failures (persistence_checks.gd:58-59, 65-66) and DirAccess.remove_absolute (persistence_checks.gd:71).
   verify: Godot 4.7 on Windows prints nothing for FileAccess.open on "<regular file>/impossible-child.json". If it prints an "ERROR:" line, the formal gate fails deterministically even though every assertion passes. Run the PRIVATE native module once and grep the log for these tokens before the all-five gates.

6. [Scope bullet 1 / Web writer contract]: the bridge return type isn't guarded.
   write_save_json does `bool(JavaScriptBridge.eval("try{...;true}catch{false}", true))` (main.gd:10675). verify: what eval returns if the bridge yields null (for example a JS parse failure outside the try), and whether bool(null) is a GDScript runtime error rather than false. Smallest hardening: `return JavaScriptBridge.eval(...) == true`. It's a similar size.

OPTIONAL / NICE-TO-HAVE
- [Scope bullet 5] The refusal text hard-codes "8192 characters" (main.gd:13633) instead of deriving it from OPTIONAL_SAVE_MAX_BYTES (main.gd:162). That constant's name says BYTES, but it is compared to String.length() at main.gd:13046, 13582 and 13629. The doc now states the character semantics, which is good. A comment at main.gd:162 would stop a future "fix" to UTF-8 bytes.
- [Scope bullet 7] After the single-store loader, save_seq has no reader that affects behaviour. It is only maxed on load (main.gd:13202-13204) and counted in budget bytes. The sequence-honesty tests therefore protect schema bytes, not selection. That's fine, but the doc shouldn't imply that sequence ordering still matters.
- [Evidence: browser module] tests/persistence-browser.mjs:10 uses browser.newContext and not newTracedContext/closeTracedContext (godot-browser.mjs:127-141), so latestPage and retainBrowserFailure from the main harness never see a failure in this module. The module does write its own failure capture (:46-47), so this is only an evidence-location inconsistency.
- [Evidence: rhythm stage] tests/persistence-browser.mjs:43 asserts `!r.message.includes('stay saved')`. That's a negative match against a stale string and passes trivially. Prefer a positive match on /Visit-only/ for the practice message, or drop the assertion.
- [Studio fixture] partial() at tests/persistence-browser.mjs:41 assumes the earned save has hosting.results for all four ids. If the genuine journey changes, find() returns undefined, so the fixture loads as "recovered" and fails at an unrelated stage. Assert source.hosting.results.length===4 up front.

CUT THESE
1. final-gates.py:12, the hard-coded `owned['pid']==6396` lock check. A PID is not a stable identity across reboots or restarts and will make a legitimate rerun fail on a lock-ownership technicality. The owner string check on the same line is enough. It's safe to cut because the source-hash check (line 9/26) and the as-found-save check (line 33) already detect tampering.
2. programme_studio.gd:235-238, the duplicated budget_notice fan-out (last_panel_dialogue, info.text, announce). After this batch, persistence_text and update_objective_ui already surface the same notice on the header and in speech. Cutting it is the MUST-FIX 1 fix and recovers bytes toward the 2097152 cap.
