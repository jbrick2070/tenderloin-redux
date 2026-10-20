# Driver Anchor — Round r3 (`2026-10-20-all-neighbor-surprise-keepsakes`)

## Scope & Intent
- Single-round (`r3`) implementation and verification of all 10/10 3D neighbor surprise keepsake props across all 5 neighbors on Turk Street (`SURPRISE_KEEPSAKE_META`, `surprise_keepsake_nodes`) plus personalized `ask_whats_next()` explore-mode neighbor hints and immediate panel surprise-reflection display on discovery.

## Key Invariants
1. All 10 surprise IDs in `NEIGHBORHOOD_SURPRISE_IDS` map 1:1 to a `Node3D` in `surprise_keepsake_nodes`, matching `SURPRISE_KEEPSAKE_META[s_id].node` and `NEIGHBOR_SURPRISE_PAIRS[SURPRISE_KEEPSAKE_META[s_id].neighbor]`.
2. `surprise_keepsake_nodes.clear()` runs once in `_ready()` before `build_neighbors_and_player()`, `build_mural_board()`, and `build_rook_speaker()`.
3. `update_neighborhood_surprises_3d()` toggles `.visible` for all 10 keepsake nodes from `discovered_surprises` and resets animated keepsake transforms to base poses when hidden.
4. `inspect_neighborhood_surprise(s_id)` formats `RewardBanner` body as `"%d/%d Surprises · Sparks: %d · Keepsake: %s"` (with 2-line word wrap on `reward_body_label`) and, when `newly_discovered` is true and the paired neighbor's panel is open, sets `last_panel_dialogue` to the paired neighbor's newly unlocked surprise reflection without wiping panel dialogue on revisits.
5. `ask_whats_next()` in `"explore"` mode gives a personalized direction from the active neighbor to their first undiscovered paired surprise, or the next undiscovered block surprise, or celebrates all 10/10 keepsakes when complete.
