TOOL CHECK: PASS (read godot/civic_listening.gd, godot/main.gd, godot/film_screening.gd, godot/bea_invitation.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, public/civic.js, docs/ASSETS.md)

VERDICT: yes-with-fixes. The core callback wiring, save gating, modal mutual exclusion and the camera/held-input guards hold up against the source. But the focus-return path breaks in the main entry flow, and the world-notice material washes out the illustration on the board and table.

MUST-FIX BEFORE BUILD

1. [focus / Back-Escape] Closing the hour after opening it from the hub entry leaves no focus owner. The steps run in this order:
   (a) Pressing `entry` focuses it. open_hour stores it as return_focus (civic_listening.gd:133).
   (b) On the next frame, _process sets `entry.visible=false`, because show_entry requires `not visible` (civic_listening.gd:212-215).
   (c) close_hour restores only the `layer` siblings it saved (civic_listening.gd:151-152). `entry` is a child of block_vbox, not of `layer` (civic_listening.gd:84-86), so it stays hidden.
   (d) So `return_focus.is_visible_in_tree()` is false and `entry.is_visible_in_tree()` is false too (civic_listening.gd:155-156). No control gets focus. The entry only reappears on the following frame, with nothing focused.
   Neither test catches this. study_test.gd:4713/4761/4769 open with open_hour() and close with close_hour()/_unhandled_input, never press `entry`, and never assert focus after closing. godot-browser.mjs:990/1024 taps the entry and then Back, but checks no focus.
   Smallest fix: in close_hour, recompute the entry's visibility before restoring focus (move the show_entry expression into a helper and call it after the sibling restore). Alternatively, drop `not visible and` from show_entry: block_panel is already hidden while the modal is open, so the entry cannot be clicked then anyway.
   Add an assertion that, after Back and after Escape, `entry.has_focus()` is true (or the focus owner is the pre-open control).

2. [world art / material contract] update_world uses `game.mural_material(Color.WHITE)` as the base for a textured surface (civic_listening.gd:287-288). mural_material turns on emission with `emission = color` at energy 0.35 (main.gd:2587-2592), and it has no emission texture. That adds a flat white lift on top of the albedo texture everywhere. The dark ink (#3c5b63) of the "closed unmarked notebook" and the outlines move toward light grey, and the cream background clips. [ASSUMPTION: Godot's additive emission term; exact sRGB result not measured.] That weakens the visible notes consequence on the board/table notice, which is the world-side half of the "art consequence" claim.
   The project's existing textured-paper pattern is bea_invitation.gd:104-109: a fresh `StandardMaterial3D`, `SHADING_MODE_UNSHADED`, `CULL_DISABLED`, `albedo_texture`, and a `rendered` memo so it is not rebuilt on every update_block_3d.
   civic_listening.update_world has no memo. It allocates 2 new emissive materials on every update_block_3d call (main.gd:3148), and update_block_3d runs from civic_start, civic_convene, civic_complete, load and others.
   Fix: copy the bea_invitation material and memo pattern, keyed on "topic:format:notes".
   The test only checks texture identity (study_test.gd:4753). Add a check that `material_override.emission_enabled == false` (or that the material is unshaded), as study_test.gd:308 already does for contact shadows.

SHOULD-FIX

1. [hub layout / extra row] The entry adds a 44px row to block_vbox, just before block_page_nav (civic_listening.gd:84-86). layout_walking_controls_and_hub has a special case for exactly one extra 44px row: `hosting_choices` = quiet_seats.row.visible, which makes the panel grow upward "never over Find Me/Close" (main.gd:6742-6749). The civic entry is not registered there.
   In the fixed-offset branch (not docked, not short phone), the panel has a fixed height and grows downward (main.gd:6743, 6757-6761). On narrow screens, panel bottom -176 sits just above controls top -174 (main.gd:6691), so any extra height pushes the panel over the walking controls. The test sizes 390x667 and 320x667 (narrow, ≥640 tall, so not a compact hub per main.gd:6654-6656) and 1100x760 all use this branch.
   The row most likely to be pushed under the walking controls is block_page_nav (Previous/Next/Close), which comes after the entry. The browser test only checks that the entry itself is on screen (godot-browser.mjs:986/990).
   Verify: with the entry visible at those three sizes, block_close_btn, block_page_prev and block_page_next must not intersect any `controls` child rect.
   Smallest fix: OR `civic_listening.entry.visible` into the `hosting_choices` predicate at main.gd:6742.

2. [layout / top panel at 320px] `heading` is a Label with no autowrap (civic_listening.gd:42-44). fit_layout sets `top.size=Vector2(width,0)` with width = vp.x-12 = 308 at 320px (civic_listening.gd:236-238). A no-wrap Label's minimum width is its full text width, so "Listening Hour | Neighbors' turns" at 18px may force `top` wider than the viewport. [ASSUMPTION: glyph widths not measured.] Tests only check the tray buttons are inside the viewport (study_test.gd:4722, godot-browser.mjs:986/1022), never `top`.
   Fix: set autowrap on heading (and credit), and assert `top.get_global_rect()` is inside the viewport.

3. [art / mipmaps in 2D] `generate_mipmaps()` (civic_listening.gd:265) only helps the 3D material, whose default filter uses mipmaps. The reader `picture` TextureRect uses the CanvasItem default filter. I found no texture_filter setting in project.godot and none in any godot/*.gd. So the 720x480 raster is minified without mipmaps on phones, and the "mipmapped raster" claim only holds in 3D.
   Fix: `picture.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS`.

4. [config propagation] The side-tray breakpoint `vp.x>=520 and vp.y<560` (civic_listening.gd:240) hard-codes main.gd's SMALL_SIDE_HUB_MIN_WIDTH=520 and SIDE_HUB_MAX_HEIGHT=560 (main.gd:811/813). Use `game.SMALL_SIDE_HUB_MIN_WIDTH` and `game.SIDE_HUB_MAX_HEIGHT` so they cannot drift.

5. [a11y event ordering] step() calls civic_start/civic_convene/civic_complete. Each of those already calls announce_a11y_status(summary) (main.gd:9785/9824/9839). step() then immediately calls refresh(true), which announces heading plus the full reader text (civic_listening.gd:172, 208), so two announcements fire in the same frame. verify: whether announce_a11y_status replaces or queues. If it replaces, the core state-change summary is never spoken; if it queues, the user hears both back to back. Smallest fix: call refresh(false) in step() and announce once.

6. [test coverage gaps, not product defects]
   (a) The browser test presses Tab and Shift+Tab with no assertion (godot-browser.mjs:1010), so the explicit focus ring built at civic_listening.gd:200-207 is never checked.
   (b) The Godot test's Escape bypasses viewport GUI dispatch by calling `study._unhandled_input(escape)` directly (study_test.gd:4769). Real Escape is covered only by godot-browser.mjs:1025.
   (c) The Godot test never sees the entry button (visibility, 44px size, or hub-only gating).
   (d) Held-W only gets one physics frame (study_test.gd:4728). It passes trivially via the _physics_process early return at main.gd:13699, which is fine as a guard check but proves nothing about duration.

OPTIONAL / NICE-TO-HAVE
- [stale restore] close_hour restores every `layer` sibling to its visibility at open time (civic_listening.gd:151-152). Core callbacks that run during the hour (civic_complete → update_block_ui and the progress cue) can legitimately change sibling visibility in the meantime. The reward banner recomputes itself (main.gd:5815-5833), so it is fine. verify: that guide_arrow, mural_compose_btn and any other `layer` child without a per-frame updater are recomputed after close. This is the same pattern as film_screening.gd:109-125, so the risk is shared.
- [camera after entry toggle] _process calls layout_walking_controls_and_hub directly when the entry appears or disappears (civic_listening.gd:213-215). That skips refresh_hub_camera/refit_panel_after_layout, which queue_compact_panel_layout runs (main.gd:6780-6786), so on a compact narrow hub (<600 wide, <640 tall; no test size) the followed player can end up behind the taller panel. bea_invitation.gd:72 does the same thing, so this is low priority.
- [z offset] The notice quads sit 1mm off the existing surfaces: board front face at z=-0.38 vs quad at -0.379, and table top at y=0.72 vs quad at 0.721 (main.gd:3000-3002, 3011-3013; civic_listening.gd:278). verify: no z-fighting at overview zoom given the camera near/far settings. The sizes and 3:2 aspect fit inside the board (0.68x0.52) and the table top (1.24x0.42), and the UV orientation faces the stools.
- [apply order] apply_save_envelope closes the hour before validating the save (main.gd:12561), so an invalid save closes the modal anyway. This matches the film behaviour; acceptable.
- Checked, no defect found:
  - Civic setters only change state in "planning" and return false on a repeated value (main.gd:9788-9808).
  - Load and import never yield phase meeting/done with an empty result (main.gd:12466-12469, 13018-13022), so plan()/texture() key access is safe.
  - Film, rhythm and mural open guards all include civic (film_screening.gd:105, rhythm_circle.gd:254, main.gd:11744).
  - update_camera and refit_after_layout skip while the hour is open (main.gd:14209, 14459). The reward timer pauses (main.gd:5874). Physics and held input are blocked (main.gd:13699).
  - Import (main.gd:13114) and reset (main.gd:12083) close the hour.
  - Dialogue matches public/civic.js:52-55 verbatim, including which choice drives each conditional line.
  - Texture cache is bounded at 8. civic_listening.setup runs after block_page_nav and the civic groups exist (main.gd:15118, 2979-3027, 15198-15200).
  - Insertion order: quiet_seats inserts its row after the civic entry (main.gd:15209, quiet_seats.gd:23), but the two rows are never visible at the same time.

CUT THESE (over-engineering)
1. The per-frame `music.text`/`accessibility_name` rewrite in _process (civic_listening.gd:218-219) repeats refresh(), which already runs after every music toggle (civic_listening.gd:74, 199). It only matters if music can change from outside while the modal swallows input. verify: rhythm/tick-driven music changes. If none, it can be cut safely.
2. Nothing else is worth cutting. The sibling re-hide on every frame, the snapshot fields and the bounded cache are all used by tests or guards.
