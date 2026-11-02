# agy prompt: review the Phases 2–7 execution spec

From `C:\tenderloin-redux`, in a terminal:

```
agy --model gemini-4-argon-high --mode plan -p="<paste everything below the line as one argument>"
```

Plan mode has no shell; the prompt tells it to use only read and search tools.

---

You are a read-only reviewer of a planning document in the current repository. Use only your file reading and search tools; do not run shell commands, Godot, npm, git or a browser; write only the one report file named at the end. Every claim needs file:line evidence; write "unverified" where you cannot confirm. An earlier Gemini review of this project made false claims (functions that did not exist, wrong engine size), so precision matters more than volume.

The document is docs/FIRST_PERSON_EXECUTION.md. It turns docs/FIRST_PERSON_PLAN.md (Phases 2 to 7 of an optional eye-level "street view" for a Godot 4.7.2 browser game) into work orders with functions, line numbers, tests and exits. Phase 1 is built: godot/street_view.gd, the hooks in godot/main.gd (search street_view), godot/tests/street_view_checks.gd, tests/street-view-browser.mjs. Your own Phase 1 arbitration is docs/first-person-advice/phase1-review-gemini.md.

Read in order: FIRST_PERSON_PLAN.md sections 4, 5, 6, 7, 10; FIRST_PERSON_EXECUTION.md; godot/street_view.gd; then each main.gd function the spec names, verifying the line numbers it gives (current tree; they drift).

Report:
1. Anchors: for every work order in Phases 2 to 5, do the named functions, variables and ranges exist and do what the spec says? List each wrong or missing anchor with the correct one.
2. Feasibility: which work orders could a fresh engineer not start from the text alone, and what exactly is missing; which are over-specified in a way the code will not support.
3. Order: is section 8's landing order right? Answer section 10 questions 1 (adapter before or after Phase 3) and 2 (eye-level conversations behind a toggle) from the code.
4. Map-view risk: per phase, the single change most likely to alter default behaviour with street view off, and the test that would catch it.
5. Tests: missing tests per phase; any listed test that cannot run headless in godot/tests/study_test.gd.
6. Sizes: any section 8 estimate off by more than 2x, with your number.
7. Your top five changes to the spec, each as exact replacement text.

Write Markdown to docs/first-person-advice/execution-review-gemini.md (create or overwrite), under 1,500 words, first line "# Execution spec review (Gemini 4 Argon)", last line "REVIEW-COMPLETE <anchor errors>/<spec changes>", and print that last line.
