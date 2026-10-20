# Driver Anchor — 2026-10-20-story-surprises-character-ui (r3)

- **Driver**: AGY (`Gemini 4 Argon` High)
- **Verification before fanout**:
  - `npm.cmd run godot:test`: `GODOT_STUDY_PASS` (all 10 neighborhood surprises outside all 188 footprints, `Shift+D` discovery + `RewardBanner` + `CelebrationBurst`, `spark_count()`, character-tinted `BlockPanel`/`MuralPanel`/`MusicPanel` styleboxes, `Turn X/5` + badge headers, and save/reload roundtrip under 4096 bytes).
  - `npm.cmd run godot:export`: `DONE`
  - `npm.cmd run check`: `0` errors
  - `npm.cmd test`: `104/104` pass
  - `npm.cmd run godot:browser`: `errors: []`, `external: []`, all viewports (`1100x760`, `390x667`, `320x667`) verified.
- **Key areas to audit**:
  1. Ensure `discovered_surprises` persistence in `build_save_envelope()` and `apply_save_envelope()` is strictly additive, ignores unknown/malformed entries without losing existing progress, and does not trigger `RewardBanner` or `CelebrationBurst` during save load/reset.
  2. Ensure `Shift+D` (`cycle_neighborhood_surprise()`) and `handle_scene_tap()` do not interfere with `WASD` walking or overview street tapping.
  3. Ensure all new strings in `godot/main.gd` use only glyphs supported by Godot's Web default font (`ThemeDB.fallback_font`) and clearly frame fictional neighborhood surprises as fictional story moments on real measured streets.
