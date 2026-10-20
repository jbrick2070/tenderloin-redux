# Driver anchor

VERDICT: yes-with-fixes pending final browser evidence and independent review.

CONFIRMED: build_neighbors_and_player calls add_character_grounding only for the player and five main neighbors. make_person_node remains shared by elevated surprise characters, which do not get the new shadows. Existing 2.15 presentation scale and player collider dimensions are unchanged.

CONFIRMED: character_ground_mesh builds a flat gradient/annulus; add_character_grounding uses ordinary depth-tested StandardMaterial3D, no emission, alpha only for the contact mesh, no shadow casting or collision. Local heights 0.029 and 0.040 become 0.06235 and 0.086 after scale, above existing curb y0.052. The ring is hollow and the shadow fades to alpha0 at its outer edge.

CONFIRMED: the previous local player_height_m test ignored the visual root scale. Its wording now accurately says unscaled model height. No physical dimension or geometry was changed. Native walking/animation probe passes, restores position/rotation and verifies save equality.

MUST VERIFY: actual Web rendering in daylight/evening and movement at all three required sizes. Snapshot geometry proves attachment/height, not aesthetic quality, depth occlusion or screen-reader usability. Inspect screenshots and retain limitations.

SHOULD VERIFY: browser walking wait must observe an actual moving frame and then arrival without disrupting existing route/progress tests. Source comparison must show the external reviewer made no implementation changes. All five gates must pass on final source.

First-person assessment is source-grounded research only. The creator explicitly wants an optional mode; do not replace the overhead default or implement an incomplete mode inside this graphics change.
