# Prompt for Codex and agy: review the Phases 2–7 execution spec

Codex: open the repository at `C:\tenderloin-redux` and paste the text below the line. agy: `agy --model gemini-4-argon-high --mode plan -p="<the text below the line>"`. Both are read-only; tell them to write to different files (`execution-review-codex.md` / `execution-review-gemini.md`).

---

You are reviewing a planning document, not code: `docs/FIRST_PERSON_EXECUTION.md`, which turns the roadmap `docs/FIRST_PERSON_PLAN.md` (Phases 2–7 of an optional eye-level "street view" for a Godot 4.7.2 browser game) into work orders. Phase 1 is already built: `godot/street_view.gd`, hooks in `godot/main.gd` (search `street_view`), `godot/tests/street_view_checks.gd`, `tests/street-view-browser.mjs`. Use only file reading and search; run nothing; do not edit.

Read, in order: `docs/FIRST_PERSON_PLAN.md` sections 4–7 and 10, `docs/FIRST_PERSON_EXECUTION.md`, `godot/street_view.gd`, then the `main.gd` functions the spec names (it gives line numbers for the current tree; verify each one you rely on, since they drift).

Answer these, with `file:line` evidence for every claim and "unverified" where you cannot confirm:

1. **Anchors.** For each work order in Phases 2–5, do the named functions, variables and line ranges exist and do what the spec says? List every wrong or missing anchor.
2. **Feasibility.** Which work orders are under-specified for a fresh engineer (what exactly is missing), and which are over-specified in a way that will not survive contact with the code?
3. **Order.** Is the landing order in section 8 right? In particular question 1 in section 10 (adapter before or after Phase 3) and question 2 (conversations behind a toggle).
4. **Risk to the map view.** For each phase, name the single change most likely to alter the default (street view off) behaviour, and the test that would catch it.
5. **Tests.** Are the test lists sufficient for each phase's exit? Name missing tests, and any listed test that cannot be written headless.
6. **Sizes.** Are the line estimates in section 8 plausible given the code? Flag any that are off by more than 2×.
7. **Your top five changes to the spec**, each with the exact replacement text.

Write Markdown to `docs/first-person-advice/execution-review-<codex|gemini>.md`, under 1,500 words, first line `# Execution spec review (<Codex|Gemini 4 Argon>)`, last line `REVIEW-COMPLETE <number of anchor errors>/<number of spec changes>`, and print that last line.
