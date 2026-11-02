# Codex prompt: review the Phases 2–7 execution spec

Open ChatGPT Codex on `C:\tenderloin-redux` and paste everything below the line (or run it from a terminal with `codex exec -s read-only --skip-git-repo-check -C C:\tenderloin-redux "<text>"`).

---

Read-only review of a planning document in this repository. Run nothing, edit nothing except the one report file named at the end.

The document is `docs/FIRST_PERSON_EXECUTION.md`. It turns `docs/FIRST_PERSON_PLAN.md` (Phases 2–7 of an optional eye-level "street view" for a Godot 4.7.2 browser game) into work orders with functions, line numbers, tests and exits. Phase 1 is already built and committed: `godot/street_view.gd`, the hooks in `godot/main.gd` (search for `street_view`), `godot/tests/street_view_checks.gd`, `tests/street-view-browser.mjs`. Your earlier review of Phase 1 is `docs/first-person-advice/phase1-review-codex.md`; a second reviewer's arbitration is `phase1-review-gemini.md`.

Read in this order: `docs/FIRST_PERSON_PLAN.md` sections 4, 5, 6, 7 and 10; `docs/FIRST_PERSON_EXECUTION.md`; `godot/street_view.gd`; then every `main.gd` function the spec names, verifying each line number it gives (they are for the current tree and drift).

Report, with `file:line` evidence for each claim and the word "unverified" where you could not confirm:

1. **Anchors.** For every work order in Phases 2–5: do the named functions, variables and ranges exist and do what the spec says? List each wrong or missing anchor with the correct one.
2. **Feasibility.** Which work orders could a fresh engineer not start from the text alone, and exactly what is missing? Which are over-specified in a way the code will not support?
3. **Order.** Is section 8's landing order right? Answer section 10's questions 1 (adapter before or after Phase 3) and 2 (eye-level conversations behind a toggle) with reasons from the code.
4. **Map-view risk.** For each phase, the single change most likely to alter the default behaviour with street view off, and the existing or new test that would catch it.
5. **Tests.** Missing tests per phase, and any listed test that cannot run headless in `godot/tests/study_test.gd`.
6. **Sizes.** Any estimate in section 8 off by more than 2×, with your number.
7. **Your top five changes to the spec**, each as exact replacement text.

Write Markdown to `docs/first-person-advice/execution-review-codex.md` (create or overwrite), under 1,500 words, first line `# Execution spec review (Codex)`, last line `REVIEW-COMPLETE <anchor errors>/<spec changes>`, and print that last line.
