# Chapter 6 session landmark tour and browser verification

## A. Scope and authorization

Review the current uncommitted changes against baseline `1cd1eb120abea43fe286abc273c8a07d2a953edb` in `godot/main.gd`, `godot/tests/study_test.gd`, and `tests/godot-browser.mjs`. Read the real source and diff. This is the creator-requested single-r3 implementation QA round, with Codex sole writer and judge. Do not edit any source, run tests concurrently with the driver, or examine historical review conclusions as authority. Write only your requested report.

## B. Resulting behavior

After the ten saved surprise keepsakes and the earlier Chapter 6 objectives, guide the player through an optional 12-stop tour: four museum eras, Boeddeker Park, the So What awning, and an explicit first order at six fictional cafes. Derive progress from existing session state; no save fields. A pure resolver skips visited stops, supplies marker targets and hints, and the conversation's first action visits/orders at the next stop. Free eatery exploration remains available. Markers use actual interactive anchors, including sidewalk counters. Tapping the active marker can activate that stop.

Museum/park/Easter egg/order interactions refresh guidance and clear stale dialogue. A frame-driven one-shot celebration waits for active discovery banners, especially the 10/10 finale, before playing. Reload/new game resets the tour while saved keepsakes survive. Labels and hints explicitly say this session and explain reload behavior.

## C. Observability and tests

Read-only accessibility snapshots expose tour state and visible conversation control rectangles. Browser tests use actual Shift+D input and canvas clicks, never a state/action mutation hook. They discover all ten surprises, inspect keepsake visibility and duplicate rewards, open Bea's conversation, distinguish eatery viewing from ordering, complete all twelve stops, verify one-shot reward and save nonmutation, and check reload/import persistence at 1100x760, 390x667 and 320x667.

Native tests cover out-of-order visits, duplicates, exact targets, no tour save mutation, session reset, speaker attribution and delayed finale. Initial godot:test, export, check and 104 Node tests passed. Browser run is underway; final verification remains the driver's responsibility.

## D. Hard invariants and review focus

`public/` stays untouched at browser fingerprint `2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567`; `tenderloin-redux.save.v1` remains read-only; Godot v1 envelope <=4096 bytes; non-ASCII main.gd characters supported by ThemeDB.fallback_font.has_char(). Preserve measured geometry, labels and provenance.

Find concrete integration defects: stale UI/action snapshots after resizing, target/tap mismatch, incorrect tour completion/duplicate awards, suppressed banners, reset/import regressions, hidden side effects in resolver/refresh, meaningful browser assertions and saved-state consistency. Cite exact current file lines. Distinguish confirmed defects from assumptions. Avoid unrelated rewrites, extra reviewers or geographic fact invention.
