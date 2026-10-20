# Round r3 Review: All 10 Neighbor 3D Surprise Keepsakes & Personalized Explore Hints

Please review the uncommitted git diff in `C:\tenderloin-redux` (`godot/main.gd` and `godot/tests/study_test.gd`) for Iteration 6 (`2026-10-20-all-neighbor-surprise-keepsakes`).

## Summary of Changes
1. **All 10/10 Neighborhood Surprises Unlock Persistent 3D Keepsake Props at Their Paired Neighbor's Station (`SURPRISE_KEEPSAKE_META`, `surprise_keepsake_nodes`)**:
   - **Bea (`neighbor_nodes[0]/NeighborProp`)**:
     - `"mayor_pomp_event"` -> `MayorRibbonRosette` (`bea_mayor_ribbon_node`: crimson-and-gold ceremonial ribbon rosette with gold seal and two ribbon tails pinned to Bea's rollator walker bar).
     - `"good_donut_and_bagel"` -> `BakeryTreatBox` (`bea_treat_box_node`: pastel pink bakery box holding a miniature pink-frosted donut and toasted everything bagel on Bea's rollator walker).
   - **Celeste (`MuralBoard`)**:
     - `"hidden_mural_145"` -> `HiddenMuralSketchCard` (`hidden_mural_sketch_node` on right easel leg).
     - `"cutesy_dino"` -> `PipDinoMascot` (`celeste_dino_figurine_node` on left easel leg: wooden ledge + miniature pastel-mint Pip the Tiny Dino with coral crest and wagging tail `celeste_dino_tail_node`).
   - **Rook (`RookSpeaker`)**:
     - `"jeffrey_record"` -> `JeffreyRecordTurntable` (`jeffrey_turntable_node` atop `RookSpeaker`).
     - `"clown_horn_walker"` -> `BarnabyClownHornClip` (`rook_clown_horn_node` on right side of `RookSpeaker`: brass horn cone and pulsing red squeeze bulb `rook_clown_horn_bulb_mesh`).
   - **Dez (`neighbor_nodes[3]/NeighborProp`)**:
     - `"viking_dirt_biker"` -> `VikingHornCharm` (`dez_viking_charm_node` on Dez's field notebook: miniature steel-and-gold Viking helmet emblem with curved horns).
     - `"magic_carpet_chef"` -> `ZafiraSpiceCarpet` (`dez_carpet_keepsake_node` beside Dez: miniature crimson-and-gold fringed magic carpet mat and copper spice wok that gently bobs when visible).
   - **Thanh (`neighbor_nodes[4]/NeighborProp`)**:
     - `"impromptu_drag_show"` -> `StarlightRunwayCrown` (`thanh_starlight_fan_node` on Thanh's cedar tea crate: rose-magenta & teal pleated hand fan and gold star tiara).
     - `"bite_size_nachos"` -> `RicoMiniNachoBag` (`thanh_nacho_bag_node` beside Thanh's thermos on her cedar tea crate: orange-and-gold bite-sized nacho bag, golden tortilla chip, and salsa verde cup).
2. **Keepsake Payoff Feedback, Stale Panel Dialogue Reset, & Personalized Explore Hints**:
   - `inspect_neighborhood_surprise(s_id)` clears `last_panel_dialogue = ""` before refreshing UI panels so an open character panel immediately displays the neighbor's updated surprise reflection instead of stale `What's Next?` text, and surfaces `SURPRISE_KEEPSAKE_META[s_id].label` in `RewardBanner` and `info.text`.
   - `ask_whats_next()` in `"explore"` mode gives a personalized first-person direction from the active neighbor (`Bea`, `Celeste`, `Rook`, `Dez`, or `Thanh`) to their first undiscovered paired surprise (using `compass_phrase()` and street name), or to the next undiscovered block surprise once both of their paired surprises are found, or celebrates unlocking all 10/10 keepsakes when complete.
   - `get_a11y_status_snapshot()` includes `"keepsakes_visible": visible_surprise_keepsake_count()`.
3. **Tests (`godot/tests/study_test.gd`)**:
   - Added unit/integration coverage for all 10 keepsake nodes, animations while hidden vs. visible, keepsake payoff labels in `RewardBanner` / `info.text`, `keepsakes_visible` in `get_a11y_status_snapshot()`, personalized `ask_whats_next()` hints in `"explore"` mode, and reset/save-restore round-tripping.

## Review Focus
- Check for any logic bugs, state synchronization issues, UI layout/font regressions, or edge cases in `godot/main.gd` and `godot/tests/study_test.gd`.
- Be concise and list concrete findings ordered by severity.
