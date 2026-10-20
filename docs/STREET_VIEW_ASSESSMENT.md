# Optional first-person Street View

Assessed October 20, 2026, following the creator's interest in first-person and question about Unreal. This is a proposed experiment, not an implemented mode or engine migration.

Godot already supports perspective cameras. An engine switch is not required to evaluate first-person in this project. Reusing the current scene preserves the city data, original gameplay, saves and provenance; moving to Unreal would require a separate migration assessment. See [Godot Camera3D documentation](https://docs.godotengine.org/en/stable/classes/class_camera3d.html).

There is relevant prior art: [Eastshade's developer describes it](https://eastshade.com/eastshade-game/) as a first-person adventure about a traveling painter, exploring and talking to inhabitants. That supports first-person as a possible fit for peaceful exploration; it does not establish that this game's geometry or controls are ready for it.

## Recommended first experiment

Add an optional, session-only **Street View** at the player's actual position, with bounded drag-to-look and a clear return to the existing overhead view. Start with looking around while stationary, so the creator can assess the streetscape before adding movement controls. Preserve Find Me and Tenderloin Map. Do not teleport, alter progress, change measured city geometry or silently replace the isometric default.

Then test camera-relative walking at a comfortable speed, nearby interaction and phone look/movement controls. Keep dialogue in a bounded HUD, support Escape/focus changes on desktop, and avoid camera bob as a default. This needs its own review, native and browser checks, plus human comfort feedback.

## Optional means explicit entry and a reliable exit

The creator emphasized **"optional is key."** Overhead remains the default on startup and reload. Entering Street View should pause the current route, preserve the actual player position and progress, hide the player's own mesh/YOU caption, and restore opaque buildings. The eye belongs to the unscaled body. Entering and leaving must not award, reset or replay objectives.

A visible **Overhead** control, Find Me/F and Tenderloin Map should all leave Street View and restore the ordinary camera, player visibility, captions and cutaway. Escape releases any captured mouse control first. Opening UI or losing focus must stop look/movement and clear held keys or active touch IDs. Godot's globally polled input is not consumed by GUI event handling, so this needs an explicit mode/focus gate. [Input documentation](https://docs.godotengine.org/en/stable/classes/class_input.html)

| Input | Initial look-around experiment | Later walking option |
| --- | --- | --- |
| Desktop | Drag on scenery to look; optional capture only after an explicit click. Use unscaled screen-relative movement. | Camera-relative movement at a separately tuned speed; cursor/UI/focus release rules. |
| Phone | Track one scenery-drag finger by touch index; UI touches never steer the camera. | Separate movement controls; prevent duplicate processing of touch and emulated mouse input. |

Browser mouse capture must be requested from a live input callback, not from later input polling. [Godot web capture requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html#full-screen-and-mouse-capture). Godot documents screen-relative motion for [mouse look](https://docs.godotengine.org/en/stable/tutorials/inputs/mouse_and_input_coordinates.html) and [touch drag](https://docs.godotengine.org/en/stable/classes/class_inputeventscreendrag.html). The existing Compatibility renderer already fits the [web export requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html); this experiment does not require a renderer or threading migration.

Comfort proposal: no head bob or roll, bounded pitch, adjustable look sensitivity and no automatic high-speed route playback. These are design recommendations, not tested comfort claims.

## Current code dependencies

All source references are function names in `godot/main.gd`, inspected from checkpoint `fcfef62` and the following graphics round.

- Startup sets orthographic projection; `update_camera()` drives its size, elevated position and look-at target. `screen_constant_scale()`, speech and caption bounds assume uniform screen scale; perspective needs distance-aware projection or HUD labels.
- `build_neighbors_and_player()` enlarges character visuals by 2.15 for overhead visibility. The player model is 1.72m before scaling; the collision shape remains 1.72m. Eye-level presentation needs a separate scale policy. Existing local-height tests are not world-height proof.
- `walk_step()` provides polygon/courtyard collision on flat ground. It does not establish stairs or general prop physics. `advance_walk()` has accelerated corridor travel, with an additional web multiplier; that speed must not be reused blindly in first-person.
- `screen_to_ground_xz()` assumes downward rays. A perspective horizon needs bounded forward ray targeting and rejection of intersections behind the camera.
- `frame_conversation()` and `frame_landmark_view()` move the camera away from the player. Street View needs explicit inspection transitions or dialogue that stays with the player.
- `update_occlusion()` follows the elevated camera; eye-level mode should restore opaque buildings and use its own visibility policy. Current world labels deliberately render without depth testing.
- Existing drag/pan/orbit input needs separate look controls and UI exclusion. A stationary prototype is a useful assessment step, not a completed first-person game.

The next mode decision should be based on that playable comparison. The current graphics pass only improves character contrast and grounding in the established view.
