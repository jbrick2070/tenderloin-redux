# Review Packet — Godot Round 5 (`2026-10-19-godot-block-validation`)

## Scope
Implement Godot Round 5 from `docs/GODOT_APPROACH.md`:
1. **Opening-Block Completion & Readiness Validation (`is_block_ready()`, `get_block_missing_summary()`, `open_block_gathering()`, `BlockGatheringBanner`)**:
   - `is_block_ready()` checks that all 5 neighbors (`bea`, `celeste`, `rook`, `dez`, `thanh`) have been visited, Celeste's portable mural board has all 3 motifs placed (`mural_placements.size() == 3`), and Rook's soundcheck is completed (`rook_soundcheck_done == true`).
   - `open_block_gathering()` (`KEY_O` or `"Open Block"` button in `BlockPanel`) rejects incomplete blocks with an explicit summary of missing requirements (`get_block_missing_summary()`), and when ready sets `block_opened = true`, reveals the 3D `BlockGatheringBanner` arch and 3 colored lanterns at Bea's Turk Street station (`BLOCK_BANNER_POS = Vector3(22.09, 0.0, -10.03)`), frames Bea's station, records `"block_opened"` progress cue, persists to Godot's isolated save, and announces completion via DOM `aria-live`.
   - 100% sound-independent completion: `open_block_gathering()` succeeds even when `music_playing == false`.
   - `apply_save_envelope()` validates `block_opened` as a boolean and clamps `block_opened = bo_done and is_block_ready()` so forged saves cannot mark an incomplete block as opened.
2. **Explicit Opt-In Browser-Save Adapter (`inspect_browser_save_json()`, `import_browser_save_json()`, `import_browser_save_from_web_storage()`)**:
   - Reads browser save `tenderloin-redux.save.v1` only on explicit user action (`KEY_I` or `"Import Browser Save"` button in `BlockPanel`). Never runs automatically on startup or reload, and never writes to or mutates `tenderloin-redux.save.v1`.
   - Faithfully ports `public/core.js` v1 validation (`version == 1`, `core` dictionary, `greeted`, `layout`, `can_place_browser_furniture` with `row == 2` clear-route exclusion and 2-cell footprints including vertical `"table"` in `"floor"` layout, `litter`, `mural`, `palette`, `soundcheck` gated on `layout_ready`, and `opened` gated on `layout_ready && tidy_ready && mural_ready && soundcheck`).
   - Rejects invalid, malformed, oversized (`> 65536` bytes), or sentinel payloads cleanly (`browser_import_status = "error"`) while preserving existing Godot progress untouched.
3. **Mobile Controls & Nonvisual / Keyboard Accessibility Validation**:
   - `BlockPanel` (`KEY_G`, arriving at Dez/Thanh, or tapping Bea when already at Bea) provides 6 buttons (`>= 44×44 px` across `1100×760`, `390×667`, and `320×667`) with zero overlap between `header_panel`, `BlockPanel`, and bottom `controls`.
   - High-contrast `StyleBoxFlat` focus ring (`button_focus_style`) applied to every button across `controls`, `MuralPanel`, `MusicPanel`, and `BlockPanel`.
   - Web DOM `aria-live="polite"` status bridge (`#godot-a11y-status` with `role="status"` and `#godot-a11y-summary` with `role="region"`, `setup_web_a11y_bridge()`, `announce_a11y_status()`, `sync_web_a11y_status()`, `get_a11y_status_snapshot()`).

## Modified Files
- `godot/main.gd`
- `godot/tests/study_test.gd`
- `tests/godot-browser.mjs`

## Please Review
Inspect `godot/main.gd`, `godot/tests/study_test.gd`, and `tests/godot-browser.mjs` directly against source and `public/core.js` for any concrete bugs, edge cases, or test gaps.
