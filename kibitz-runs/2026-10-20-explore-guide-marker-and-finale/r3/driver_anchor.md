# Driver Anchor — `explore-guide-marker-and-finale` (r3)

- **Driver**: AGY (`Gemini 4 Argon` High)
- **Scope**: Iteration 7 (`2026-10-20-explore-guide-marker-and-finale`) in `godot/main.gd` and `godot/tests/study_test.gd`.
- **Changes under review**:
  1. Chapter 6 (`"explore"`) 3D gold `GuideMarker` and screen-edge `GuideArrow` wayfinding for undiscovered neighborhood surprises via `next_explore_surprise_id()` and `current_objective()`.
  2. Session-only `last_hinted_surprise_id` persistence across conversation panels after asking `"What's Next?"`.
  3. Unified `Shift+D` (`cycle_neighborhood_surprise()`) and `"Spot Surprise"` resolution via `current_objective().surprise_id`.
  4. Multi-height 3D scene tap hitbox (`surprise_screen_distance()`, `surprise_has_guide_marker()`, `GUIDE_MARKER_LIFT_LOW`) for surprise vignettes, labels, and the active floating `GuideMarker`.
  5. 10/10 All Keepsakes grand-finale `RewardBanner` (`4.5s`) and explicit `"surprise_finale"` 4-note ascending C-major octave fanfare (`[523.25, 659.25, 783.99, 1046.50]`, `0.68s`).
