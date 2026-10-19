# Godot Block Study — Round 3 Review Brief: Celeste & Portable Mural Board (`2026-10-18-godot-neighbor-mural`)

## Scope Under Review
1. [`godot/main.gd`](file:///C:/tenderloin-redux/godot/main.gd)
2. [`godot/tests/study_test.gd`](file:///C:/tenderloin-redux/godot/tests/study_test.gd)
3. [`tests/godot-browser.mjs`](file:///C:/tenderloin-redux/tests/godot-browser.mjs)

## Milestone Requirements (`docs/GODOT_APPROACH.md` Round 3)
- **Fictional neighbor interaction (Celeste) + original portable mural board**:
  - Add a freestanding 3D `MuralBoard` easel (`MURAL_POS = Vector3(76.50, 0.0, -18.70)`) on the north sidewalk of Turk Street beside Celeste (`Vector3(70.07, 0.0, -17.75)`), `3.44 m` clear of measured building `201006.0003465` and outside all 58 building footprints.
  - Never paint or claim permission to paint a real building façade; the board is explicitly a freestanding portable sidewalk easel clear of the pedestrian through-route.
  - Support talking with Celeste (`talk_with_celeste()`), cycling 3 palettes (`"garden"`, `"sunset"`, `"ocean"`), placing and moving all 3 neighbor motifs (`"sun"`, `"wave"`, `"rise"`) on the `6×3` board (`col` `0..5`, `row` `0..2`), rejecting invalid/out-of-bounds or overlapping cells, and showing visible 3D consequence on `MuralBoard` (`MotifSun`, `MotifWave`, `MotifRise`, canvas palette color, and `MuralCompletionBanner` when all 3 motifs are placed).
- **Separate Godot save persistence & reload recovery**:
  - Persist in `user://godot_block_save_v1.json` and, on Web export, `window.localStorage['tenderloin-redux.godot.save.v1']` using schema `"tenderloin-redux.godot.save"`, version `1`.
  - Never read or write the browser game's `tenderloin-redux.save.v1`.
  - Restore saved palette, talk count, active motif, and 3D motif positions on fresh scene load, and recover cleanly from corrupt/invalid JSON or out-of-bounds/duplicate saved cells without crashing.
- **Keyboard & touch playability across `1100×760`, `390×667`, and `320×667`**:
  - Responsive `MuralPanel` (`8` buttons, all `>= 44×44 px`, fitting cleanly between `header_panel` and bottom `controls` at `1100×760`, `390×667`, and `320×667`), plus keyboard shortcuts (`E`/`T` talk with Celeste, `M` walk to mural, `6`/`7`/`8` Sun/Wave/Rise, `9` move tile, `0` reset, `P` palette, `Tab`/`Enter` `ui_accept`) and 3D scene tap on `MuralBoard`.

## Reviewer Instructions
- **Read-only audit**: Do NOT modify repository files.
- Inspect `godot/main.gd`, `godot/tests/study_test.gd`, and `tests/godot-browser.mjs` against source and report any concrete bugs, edge cases, geometry/collision/save/UI issues, or test gaps with file and line references.
