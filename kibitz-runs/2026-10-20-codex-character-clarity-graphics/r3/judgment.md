# Driver judgment

One independent installed Kibitz r3 Claude CLI call completed: selected claude-opus-5-5, effort high, rc0, verdict yes-with-fixes. Source/input/anchor hashes match before and immediately after review. Reviewer had file-reading tools but no shell; this is not an independent runtime, git-diff or fingerprint verification. Codex remains sole writer and judge.

## Must-fix findings

1. PARTLY CONFIRMED. Original ring widths projected to about one pixel on phones; candidate screenshots showed narrow outlines, and one local view alone was insufficient visual proof. Widened the hollow bands (player0.10, neighbor0.085 local units) while leaving their centers open. Check final three-size daylight/evening/moving screenshots. Whole-neighborhood overview deliberately relies on navigation/UI; do not promise that a metre-scale ring is readable there.
2. CONFIRMED. ContactShadow and the map-wide additive light-pool mesh both use transparency, so relying on transparent depth sorting can vary composition by location. Contact material now uses render_priority1, above pool priority0, while retaining normal depth testing. Native asserts relative priority. Browser now toggles evening during actual travel and requires the player within1.3m of a light-pool center before capturing a pool comparison.
3. CONFIRMED. The route ribbon at world y0.06 and ADA pads at0.058 exceed the curb. Shadow world height is now0.075, computed from named CHARACTER_VISUAL_SCALE; native/browser bounds require>=0.07 and<0.09. This gives a margin above the ribbon. Comment corrected.

## Should-fix findings

1. CONFIRMED for missing decoration. Snapshot uses get_node_or_null and null fields for a missing shadow; native temporarily detaches the decorative node and verifies status still works. The pre-build claim was broader than the existing function contract, which already requires a built player/UI.
2. CONFIRMED. Renamed walking to path_active; stride remains separate. The snapshot no longer mislabels manual WASD as not walking.
3. CONFIRMED. Replaced the same-direction isolated probe with checks inside existing north-wall/east-slide movement tests. Heading must actually change, the character must travel, contact X/Z must follow, and animation must leave its local offset unchanged.
4. CONFIRMED. Removed the later probe that leaked movement/UI flags. Existing early movement fixtures already establish/reset their own state before neighbor routing; no new independent navigation state transition remains in the later conversation tests.
5. CONFIRMED. Browser now closes the conversation with Escape (clearing the old path), captures a fresh before-Digit5 position/frame, and requires a later frame with an active path, stride and actual displacement from that baseline.
6. CONFIRMED limit. Snapshot and screenshot are separate operations. Fresh-frame waits support assertions; comments and final evidence explicitly call PNGs visual evidence near the asserted frame, not atomic render captures.
7. CONFIRMED scope clarification. Only player and five core neighbors receive the new grounding. Other shared-builder characters, including some ground-level extras, retain their previous discs. The original scope never claims all residents were changed, but listing only elevated examples was incomplete. No expansion to extras in this bounded pass.
8. CONFIRMED. Startup sets projection; update_camera drives size/position/look-at. Corrected the research document. Driver independently opened official Godot Camera3D and Eastshade developer pages, and reviewed additional official input/web docs through a read-only research partner.
9. CONFIRMED. Replaced the two scale literals with CHARACTER_VISUAL_SCALE and derived the contact offset from CHARACTER_SHADOW_GROUND_Y.

## Optional and cut suggestions

- Vertex-color sRGB/unshaded appearance: visual validation, not a proved defect. Keep the established vertex-color convention. Marker outlines are intentional stable presentation cues; contact shadows remain non-emissive with transparent edges.
- Degenerate center triangles and temporary original ring allocation are small one-time construction costs. No extra refactor; only six added shadow nodes and bounded meshes.
- Replaced order-dependent alpha indexing with min/max alpha coverage.
- Removed the tautological basis-up assertion and redundant phase loop; meaningful motion checks now reuse the existing collision tests.
- Driver screenshot inspection also found conversation panels hiding feet in candidate walking/arrival captures. Final browser captures use ordinary Escape before travel and Find Me after arrival to expose the character. These actions are documented; do not claim the original covered screenshots proved foot visibility.

All five gates must pass after these fixes. No second external call is implied. Physical phones, full screen readers, subjective comfort and a first-person implementation remain unverified.
