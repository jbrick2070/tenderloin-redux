# Driver Anchor — Godot Round 5 (`2026-10-19-godot-block-validation`, r3)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High reasoning)
- **Reviewer**: `Claude Opus 5.5` (`claude-opus-5-5`, effort `high`, via Kibitz `--driver agy --only claude`)
- **Pre-fan-out anchor**: Written before Kibitz fan-out against `godot/main.gd`, `godot/tests/study_test.gd`, and `tests/godot-browser.mjs`.
- **Key areas anchored prior to review**:
  1. Opening-block readiness (`is_block_ready()`, `get_block_missing_summary()`, `open_block_gathering()`), 3D `BlockGatheringBanner` at `BLOCK_BANNER_POS = Vector3(22.09, 0.0, -10.03)`, sound-independent completion (`music_playing == false`), and `block_opened` save/reload + forged-save guard in `apply_save_envelope()`.
  2. Explicit opt-in browser-save adapter (`inspect_browser_save_json()`, `import_browser_save_json()`, `import_browser_save_from_web_storage()`, `browser_furniture_cells()`, `can_place_browser_furniture()`) matching `public/core.js` v1 validation without ever mutating `tenderloin-redux.save.v1`.
  3. Mobile controls & accessibility: `BlockPanel` 6 buttons (`>= 44×44 px` at `1100×760`, `390×667`, `320×667`), `StyleBoxFlat` keyboard focus rings (`button_focus_style`), and Web DOM `aria-live="polite"` status/summary bridge (`#godot-a11y-status` and `#godot-a11y-summary`).
