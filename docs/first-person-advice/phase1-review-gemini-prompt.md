# Prompt for agy (Gemini 4 Argon): arbitrate the Codex review and add what it missed

Run from `C:\tenderloin-redux`:

```
agy --model gemini-4-argon-high --mode plan -p="<paste everything below the line>"
```

Plan mode has no shell, so the prompt tells it to use only its file read and search tools.

---

You are the second, independent reviewer of a change to a small open-source Godot 4.7.2 game in the current folder. Use only your file reading and search tools; do not run shell commands, Godot, npm, git or a browser. Report only what you have confirmed by reading the code, with `file:line` for every claim; when you cannot confirm something, write "unverified" rather than guessing. A previous Gemini review of this project made several false claims (functions that did not exist, wrong positions, wrong engine size), so precision matters more than volume.

## The change

The 3D edition (`godot/main.gd`, about 16,000 lines, an elevated orthographic "map view") gained an optional eye-level "street view": Phase 1 of `docs/FIRST_PERSON_PLAN.md` (read sections 4, 5 "Phase 1", 6, 7 and 10 first). New: `godot/street_view.gd` (the module: one rule `active()`, enter/exit side effects in `sync()`, the street camera branch `apply_camera()`, snap turn and tilt, a 2D line-of-sight test for captions, sky and fog, the floating "Street view / Map view" button, the a11y snapshot), `godot/tests/street_view_checks.gd` (formal suite, preloaded from `godot/tests/study_test.gd`), `tests/street-view-browser.mjs` (browser suite, called from `tests/godot-browser.mjs`). Modified: hooks in `godot/main.gd` (search for `street_view`), `package.json`. The commits are the two most recent on `main` ("Street view, Phase 1" and the uid files); if the working tree has further uncommitted edits, review the working tree as it is and say so.

A first reviewer (Codex) already wrote `docs/first-person-advice/phase1-review-codex.md`. Read it after the code, not before, so your own reading is not anchored on it.

## Part 1: arbitrate the nine Codex findings

For each numbered Codex finding, write one of **CONFIRMED**, **REFUTED** or **UNVERIFIED**, then the evidence: the exact lines you read and the state or input sequence that triggers (or fails to trigger) the problem. Where Codex cites a line number, check that the line says what Codex says it says; its numbers may be off by a few lines because `main.gd` changed after its read. In particular:

1. Can a speech bubble be shown while street view is active (search every caller of `show_neighbor_speech` / the speech bubble functions and check whether each path sets `following_player = false` or opens a focused activity first)? If yes, what does `update_speech_bubble` do with a bubble behind a perspective camera?
2. Does `update_guide_arrow` hide the arrow when the objective is behind the eye? Read the function and `camera.unproject_position`'s behaviour for points behind a perspective camera (it mirrors them).
3. Does `toggle()` → `frame_player_for_walking()` reset the map's yaw, pitch and zoom even when the map was already following the player?
4. Is there a path where two-finger pinch contacts captured in street view are applied after leaving it?
5. Which street-sign labels exist (`build_street_name_signs` or similar), are they in `readable_scene_labels`, and do they bypass the 28 m / line-of-sight rule?
6. Is the web ×2.2 route multiplier exercised by any headless test? (Expected: no; say what would test it.)
7. Which source files does `tests/godot-browser.mjs` include in its pck-freshness check (its `stat` list near the top), and are `godot/street_view.gd` and the new tests missing?
8. Which announcement does the player finally hear on entering street view (trace `toggle()` → `frame_player_for_walking()` → `enter()` and the order of `announce_a11y_status` calls)?
9. Which game fields does `street_view_checks.gd` change but not restore (compare with `before_streets_checks.gd`'s restoration list), and does any later section of `study_test.gd` read them?

## Part 2: what Codex missed

Look specifically at: `handle_scene_tap`'s neighbour, mural, speaker and history-stop hit tests under a perspective camera (points behind the eye; distances measured from a ground hit); `update_occlusion` callers that still run while street view is active; `player_overlay_rect`, `fit_overlay_around_player` and the reward banner at eye level; `refit_panel_after_layout` running after a mode change; the activity modules (`rhythm_circle.gd`, `lantern_procession.gd`, `voting_story.gd`, `bea_invitation.gd`, `helper_bench.gd`, `quiet_seats.gd`) saving or restoring camera poses; the a11y snapshot fields that unproject world points; and anything in `street_view.gd` itself (the `in_block` half-plane, `line_of_sight_clear` with holes/rings, `screen_constant` at depth near zero, `face_objective` when the gold marker is hidden). Same evidence standard.

## Part 3: the improvement list

Codex proposed eight shipping changes (its section F–G). For each, say whether you agree it belongs in Phase 1, Phase 2 or later, and whether its code snippet is correct for this codebase (check the functions it names exist with those signatures). Add at most five improvements of your own, prioritized, each with file and function, why, risk and size; write the exact GDScript for anything under 25 lines.

## Output

Write Markdown to `docs/first-person-advice/phase1-review-gemini.md` (create or overwrite), under 1,500 words, first line `# Phase 1 street view review (Gemini 4 Argon)`, last line `REVIEW-COMPLETE <confirmed>/<refuted>/<unverified> <own findings>`. Print that last line at the end of your answer as well.
