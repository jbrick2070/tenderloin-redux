# Kibitz Final Judgment — `explore-guide-marker-and-finale` (r3)

- **Reviewer**: `claude` (`claude-opus-5-5`, `effort=high`)
- **Verdict**: `yes-with-fixes`

## Adopted Findings & Fixes
1. **MUST-FIX 1 & 2 + CUT 1 & 2 (`cycle_neighborhood_surprise` vs `current_objective().surprise_id` single resolver)**:
   - Verified in `godot/main.gd`: `cycle_neighborhood_surprise` previously checked `last_hinted_surprise_id` before `active_panel_neighbor_idx()`, while `next_explore_surprise_id()` checked `active_panel_neighbor_idx()` first.
   - Fix: In `cycle_neighborhood_surprise(target_idx: int = -1)`, resolve `current_objective().surprise_id` when in `"explore"` mode (falling back to `last_hinted_surprise_id` outside `"explore"` mode, and then round-robin). Also simplify `run_conversation_action_id("surprise")` to use `cycle_neighborhood_surprise()` in `"explore"` mode.
2. **SHOULD-FIX 1 (Multi-height tap hitbox `GUIDE_MARKER_LIFT_LOW` scoped to the marker-bearing surprise)**:
   - Verified in `godot/main.gd`: Sampling `y = 4.6` with `surp_world_d <= 9.5` on all 10 surprises was broader than needed when only one surprise has the floating `GuideMarker`.
   - Fix: Extract `GUIDE_MARKER_LIFT_LOW := 4.6` and `GUIDE_MARKER_LIFT_HIGH := 6.6`. Sample `[0.8, 1.6, 2.6]` (`surp_world_d <= 5.5`) for all surprises, and sample `GUIDE_MARKER_LIFT_LOW` + `guide_marker.global_position` (`surp_world_d <= 9.5`) only for the surprise where `guide_marker` is currently visible.
3. **SHOULD-FIX 2 (`next_explore_surprise_id()` panel-neighbor pair check before `last_hinted_surprise_id`)**:
   - Verified in `godot/main.gd`: Calling `next_undiscovered_surprise_for_neighbor(p_idx)` inside `next_explore_surprise_id()` fell back to the global first undiscovered surprise when that neighbor's 2 paired surprises were already found, overriding an active `last_hinted_surprise_id`.
   - Fix: In `next_explore_surprise_id()`, only return a panel neighbor's surprise if one of that neighbor's own `NEIGHBOR_SURPRISE_PAIRS` entries is still undiscovered; otherwise fall through to `last_hinted_surprise_id`.
4. **SHOULD-FIX 3 (`GuideArrow` label rect clamped inside `play_area_rect()` at 390/320)**:
   - Fix: Shorten long target names on `is_narrow_layout()` and clamp `guide_arrow_label`'s global rect inside `play_area_rect()`.
5. **SHOULD-FIX 4 & 5 + OPTIONAL 1 & 2 (Compact finale `RewardBanner`, explicit `"surprise_finale"` cue ID, 4.5s finale timer, session-only comment)**:
   - Fix: Use `"10/10 Surprises: %s"` and `"All 10/10 Keepsakes! · Sparks: %d · Keepsake: %s"` with a 4.5s banner duration on 10/10 completion, and pass `"surprise_finale"` explicitly to `trigger_progress_cue()`.
