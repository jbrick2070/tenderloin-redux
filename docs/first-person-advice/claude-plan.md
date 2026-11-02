> **Unverified machine advice.** Claude (a Claude Code subagent) first-person plan, including its engine comparison, run read-only on November 1, 2026, at the creator's request, and saved unchanged below this header. Nothing here is a decision; the checked and merged plan is `docs/FIRST_PERSON_PLAN.md`, which lists the claims found false. Line numbers refer to commit `ce777e7`.

I have what I need. Here is the report.

# First-person ("street level") camera for the Tenderloin Redux Godot edition: findings and plan

## Summary

A first-person mode is a camera-and-overlay change, not a new game. Movement, pathing, collision and most of the UI never touch the camera directly. Five things do assume the elevated view:

1. **The camera is orthographic.** Every "keep this a constant size on screen" calculation reads `camera.size`, which only means something for an orthographic camera.
2. **Every world label, the speech bubble and the gold marker draw through walls** (`no_depth_test`). From above that is a feature; at eye level it becomes x-ray vision.
3. **Characters are drawn 2.15× life size.** At eye level the neighbours would be about 3.7 m tall.
4. **Ground picking stops working above the horizon.**
5. **Every activity frames itself by panning the orthographic camera.**

My recommendation: stay on Godot. Build Tier A as one new module, `godot/street_view.gd`, with a small set of hooks in `main.gd`, and leave the map view as the default and only saved state.

One correction to the brief: speech bubbles are not placed in screen space. They are world-space billboards scaled every frame from the orthographic camera size (main.gd:4618–4620, 4687–4691).

---

## 1. How the camera and player work now

**Camera**
- Created at main.gd:2058–2062 as `Camera3D.PROJECTION_ORTHOGONAL`, with default near and far planes. Nothing anywhere sets `visibility_range`.
- `update_camera()` (main.gd:15098–15128) sets `camera.size = view_size` and places the camera at `target + get_camera_offset_vec() * offset_scale`, then calls `look_at(target)`.
  - `CAMERA_OFFSET` is `(180,180,180)` (main.gd:20). That puts the camera about 311 m away, or about 685 m in the wide view (the ×2.2 factor at :15100).
  - In some layouts it re-pans so the player and the YOU label stay inside `play_area_rect()` (:15106–15128).
- **Heading and tilt:** `camera_yaw` and `camera_pitch_scale` (main.gd:777–778), `get_camera_offset_vec` (:14075), `rotate_camera_by_delta` (:14079, pitch clamped to 0.55–1.65). Input comes from Shift+arrows (:14325–14339) and right/middle or modifier drag (:15059–15096).
- **Pan, zoom, pinch:** `pan_camera_by_screen_delta` (:14541) converts screen pixels to metres. `zoom` (:15349) and `clamp_view_size` (:15346) handle zoom. Pinch is handled at :14563–14631. Left-drag pans (:15092–15095).
- **Framing helpers:** `follow_player` (:14041) and `frame_player_for_walking` (F key, :7466, :15045).
- **Overviews:** `overview()` (:15195) and `wide_overview()` (:15256) fit the camera to projected building bounds (:15316–15344) and reset yaw and pitch.
- **Cutaway:** `update_occlusion` (:14115–14205) and `building_record_occludes_point` (:14087).
  - It steps along the camera-offset ray slope from each focus point and swaps any building within `CUTAWAY_RADIUS_M = 4` (:19) to the translucent `cutaway_material` (:1944). It also hides rooftop details.
  - Focus points come from the player plus each activity's `cutaway_points()`: rhythm_circle.gd:466, quiet_seats.gd:184, bea_invitation.gd:136, shared_panel.gd:277, loan_homecoming.gd:139, helper_bench.gd, shared_meal.gd.
  - The idea of a camera offset is built into the test itself.
- **`target` does two jobs.** It is the camera's look-at point, and it is also the proximity centre for labels (55 m, :14264), the speech bubble (45 m, :4806) and activity cutaways and inspections (24–30 m, for example helper_bench.gd:278 and rhythm_circle.gd:471).

**Player and movement**
- The player is a `CharacterBody3D` with a cylinder collision shape (main.gd:2616–2634). However, `move_and_slide` is never called. Position is written directly after 2D tests in `is_walkable_point` (:8072–8087): walk bounds, a street corridor of 12 m or less, not inside any footprint, mural and speaker footprints, and wall clearance.
- **Keyboard:** `_physics_process` (:14317–14377). WASD and arrows build `input_vec`, rotate it by `-camera_yaw` (:14362), then call `walk_step` (:8295), which slides along walls and the street tangent. While a focused activity is open, everything stops early (:14319, `is_focused_activity_visible` :12117).
- **Click or tap:**
  - Left-button release without a drag goes to `handle_scene_tap` (:15066–15085, :14435–14532).
  - `screen_to_ground_xz` (:14401) intersects with the y=0 plane.
  - `find_path` is an A* search (:8130). `advance_walk` (:13825) runs at 4.8 m/s, or at **24 m/s on the west corridor** (:11, :13837), and is multiplied by **2.2 on the web** (:14377).
- **Collision:** each building mesh gets a `StaticBody3D` with a `ConcavePolygonShape3D` of its walls (:1904–1911), built through `make_building_mesh_and_rect`, which also builds the current and LiDAR buildings (:1430). Movement does not use these shapes. They are available for camera rays, though.
- **Characters:** neighbours already turn toward the player within 6.5 m (:3585–3595) and on arrival (:8963–8965). `CHARACTER_VISUAL_SCALE = 2.15` (:14, :2608, :2628).

## 2. Everything that assumes the elevated camera

**`screen_constant_scale()` (main.gd:6210)** returns `px * camera.size / viewport_h`, which only works for an orthographic camera. It is used by:
- the speech bubble (`speech_bubble_base_scale` :4687, rect :4713, shift :4843),
- the talk prompt (:6335, :6342),
- the guide marker (:6270),
- scene labels (:14262),
- the player nameplate (:14298),
- `player_overlay_rect` (:7115).

The tests rely on it too: study_test.gd:1624–1627 computes the bubble width from `camera.size`.

**Speech bubble**
- A billboard 5 m above the speaker (`SPEECH_BUBBLE_HEIGHT_M` :199), drawn through walls (:4611, :4640).
- Hidden when `target` is more than 45 m from the anchor (:4806).
- Fitted around the player's screen rectangle (:4820), with a fallback into Info or the activity text (:4824–4840).
- It bobs (:4812). This is ambient motion, and there is no reduced-motion setting to turn it off.

**Labels**
- Every `make_label_3d` label draws through walls (:2305).
- They are made visible within 55 m of `target` and when `not camera.is_position_behind(...)` (:14264, :14272).
- At street level, labels for buildings behind other buildings would show through the walls.

**Gold marker**
- A gem drawn through walls (:6230), lifted 4.6 or 6.6 m (:201–202), spinning (:6273).
- The off-screen arrow (`update_guide_arrow` :7177) uses `unproject_position` without a behind-camera check. With a perspective camera, a target behind you mirrors, so **the arrow would point the wrong way**.

**Reward banner**
- A 2D Control (:5866–5899) that only depends on `play_area_rect` and `fit_overlay_around_player`. It is safe, as long as `player_overlay_rect` (:7103) comes back empty or small when the player's body is hidden. It already returns `Rect2()` when the body is behind the camera or hidden.

**Picking**
- No physics raycasts. Picking compares screen distances from `unproject_position`, combined with distance gates measured on the ground (:14453–14531).
  - Neighbours: 48 px, with the ground hit within 14 m (:14458).
  - Mural, speaker, history stops, surprises, eateries, museum, park and easter eggs have similar checks.
- Two failure cases at eye level:
  - A ray at or above the horizon gives `t < 0`, so the "ground point" lands behind the camera and a tap on the sky walks you backwards.
  - Gates measured on the ground are meaningless for long, grazing rays.

**Activities that frame themselves** (all depend on orthographic `pan_camera_by_screen_delta` and `view_size`):
- `frame_conversation` (:6379), `frame_landmark_view` (:6067, used by Boeddeker at :4583 with `view_size` 96), `focus_mural_camera`, `focus_speaker_camera`, `frame_activity_camera` and `focus_block_camera` (:9169–9267), `refit_panel_camera` with `panel_camera_pose` (:9205–9251), `focus_history_stop_camera` (:8610).
- Rhythm Circle's "View Circle" (rhythm_circle.gd:434–464) saves a `return_pose` and restores it (:262, :294–304). This is the right pattern to copy.
- Lantern procession (lantern_procession.gd:292–300) and voting story (voting_story.gd:235–241) save and restore the camera the same way.
- Inspection rectangles in bea_invitation.gd:114–130, helper_bench.gd:274–283 and quiet_seats.gd:163–168 assume the elevated view.
- I did not open `inspect_tenderloin_museum_hub` (:8702) in detail.

**Tests that check the camera pose:** before_streets_checks.gd:30 and :64 compare `[target, view_size, yaw, pitch, following]`, and helper_bench_checks.gd:140–159 does something similar. Any new mode must leave these values untouched while it is off.

## 3. Building geometry at eye level

**What is there**
- Buildings are procedural, vertex-coloured and untextured (shader :1080–1100; mesh :1667–1916). Each has:
  - a storefront plinth with an opaque "glass" quad and awnings,
  - floors every 3.2 m with window bays,
  - 0.38 m projecting bays and fire escapes on some walls,
  - a cornice and a flat roof.
- Survey and photo palettes apply to some buildings. The info text itself says facades are "unverified" (:15167).
- Street trees are MultiMesh trunks plus two canopy blobs from `street_trees.json` (:5017–5055). The sway rewrites every instance's transform every frame (:5057–5081).
- Street furniture and props are hand-placed primitives (:3857 onward).
- The LiDAR roof masses (:1443) only matter from above.

**What would look bad**
- **Giant people.** At 2.15× scale, neighbours are about 3.7 m tall, as tall as the storefront plinth (`plinth_h` is up to 3.6 m, :1806).
- **Flat, single-sided walls with no thickness** (`cull_disabled`), no interiors, and opaque glass. Up close, the flat-colour rectangles will read as a diagram.
- **Ground surfaces are flat ribbons layered 1–5 cm apart**: sidewalk at 0.01, road at 0.025, stripes at 0.035, curb at 0.052 (:2108–2127), with the ground plane at −0.1 (:1986–1992). Near 0.05 / far 4000 with perspective means likely z-fighting at grazing angles. The "raised curbs" are flat bands, not steps.
- **No sky and no fog.** The background is a flat colour (:1967). The 960×560 ground plane and the street ends will show a hard edge into teal.
- **Repetition.** Bay and window patterns are generated from a hash, so long facades repeat.

## 4. Web constraints

- **Pointer lock:** the project has no pointer-lock code. Godot's web build maps `Input.mouse_mode = MOUSE_MODE_CAPTURED` to the browser's `requestPointerLock`, which needs a user gesture. Esc always releases the lock in the browser, and this game uses Esc heavily for closing panels (:14768, :14813–14866, :15046). **Not verified:** whether that Esc keypress still reaches Godot after the browser releases the lock. Recommendation: make **drag-to-look the default** and pointer lock an opt-in.
- **Right-drag:** right-drag already works because the web accessibility bridge blocks the browser's context menu (:11463).
- **Touch:** the canvas sets `touch-action: none` (index.html). One-finger drag currently pans, two fingers pinch.
- **Keys:** all 26 letters, the digits and F2–F8 are already bound (I checked every `KEY_*` constant). The F handler ignores Shift (:15045), so **Shift+F** is free. Comma, backquote and F9 are also unbound.
- **Reduced motion:** the Godot edition has no reduced-motion setting at all. The settings schema (:10686) only stores voices and reward sounds. The 2D edition has one (`public/game.js:19`, `prefers-reduced-motion`).
- **Size:**
  - The pck is 1,472,548 bytes. The 2 MiB cap is asserted at tests/godot-browser.mjs:104.
  - Scripts total about 1.99 MB of source, yet the whole pck is 1.47 MB, so scripts are clearly stored compressed or tokenized. A 500–800 line module should add about 10–30 KB. That is an estimate, not measured.
  - `index.wasm` is 39.5 MB uncompressed, outside the cap. It is the real download cost of any Godot build.
- **Performance:** about 188 opening and wider buildings plus additions, each one draw call, and one big sidewalk mesh per street. From the street most of these are off-screen, and the GPU skips those. A far plane of about 250 m plus fog bounds the rest. Not verified: frame rate on phones in perspective.

---

## Engine alternatives

| Engine | Free in any browser from GitHub Pages | Build size | Phones | Accessibility | Reuses data and the ~17k lines | WebXR later | Verdict |
|---|---|---|---|---|---|---|---|
| **Godot 4** (MIT), current | Yes, already shipping; threads off so no special headers (export_presets.cfg) | pck 1.47 MB; wasm 39.5 MB uncompressed | Works today (Compatibility renderer) | Already built: aria-live bridge (:11456), keyboard paths | 100% | Godot 4 web has a WebXR interface. Not tested here, and not tested with the Compatibility renderer | **Stay** |
| O3DE (Apache-2.0) | No web export, as far as I know (unverified) | – | – | – | Rewrite | – | Fails |
| Bevy (MIT/Apache) | wasm + WebGL2/WebGPU | Several MB (unverified) | Varies | Some UI accessibility support (unverified) | Full Rust rewrite, no editor | Community crates only (unverified) | Poor fit |
| Stride (MIT) | No web export (unverified) | – | – | – | C# rewrite | – | Fails |
| three.js (MIT) | Yes, static files | Smallest, roughly 150 KB gzipped core (unverified) | Good | Best: real DOM buttons and ARIA | Data JSON reusable. The JS 2D editions (`public/`, `browser-next/`) already hold much of the game logic; parity with Godot not checked | Mature built-in WebXR | Credible **fallback** |
| Babylon.js (**Apache-2.0**, not MIT as the brief says) | Yes | Larger, MB range (unverified) | Good | DOM + its own tools | Same as three.js | Strong built-in WebXR helpers | Viable, heavier |
| PlayCanvas engine (MIT; the editor is a hosted service) | Yes | Small to medium | Good | DOM | Rewrite | Built-in WebXR | Viable |
| Unreal (source-available, 5% royalty past $1M) | No: HTML5 export was dropped in 4.24. Pixel Streaming needs paid GPU servers | – | Only via streaming | – | Rewrite | – | Fails |
| Unity (proprietary; Personal tier free under a revenue cap) | Web export works | Usually several to tens of MB (unverified) | Improved in Unity 6 (unverified) | Weak in WebGL | Rewrite | Third-party exporters only | Poor fit |

The shared save works the same in any web engine, because GitHub Pages is one origin. Godot already reads both keys (`GODOT_WEB_STORAGE_KEY` and `BROWSER_WEB_STORAGE_KEY`, main.gd:36–37; import on the I key).

**Recommendation:** stay on Godot 4 for Tiers A and B. Only consider a three.js spike if the Tier C WebXR test fails, or if phones can't run the perspective view fast enough.

---

## The plan

### Shared design (all tiers)

Add `godot/street_view.gd`, following the existing module pattern where each script holds a `game` reference, plus a handful of hooks in main.gd:

- **New state:** `street_mode`, `street_suspended`, `street_yaw`, `street_pitch` and a `fov` value.
  - `street_mode` is never saved in progress. Comfort preferences go in settings (main.gd:10686), schema-checked like the existing fields.
- **Branch in `update_camera`:** when `street_mode and following_player and not in_overview and not in_wide_overview and not is_focused_activity_visible()`:
  - switch to perspective, with near 0.1 and far about 250 m,
  - put the eye at the player's position plus about 1.6 m,
  - apply yaw and pitch,
  - **keep `target = player.position + Vector3.UP`**, so every proximity check driven by `target` keeps working.

  Otherwise, set `street_suspended = true` and render the map view exactly as today. This one rule handles the automatic return:
  - every framing function (`frame_conversation`, the `focus_*` functions, `view_circle`, history stops, Boeddeker, the museum) already sets `following_player = false`,
  - every focused activity is already caught by `is_focused_activity_visible`.

  Resume when `follow_player()` or `frame_player_for_walking()` runs again. Announce both the suspend and the resume.
- **Make screen-constant sizing work in perspective:** change `screen_constant_scale(px, at := Vector3.INF)` so that in perspective it returns `px * 2 * depth * tan(fov/2) / viewport_h`, where `depth` is the distance to `at` along the camera's forward axis. Update the roughly 12 callers listed in §2 to pass the node's position.
- **Cutaway:** when street mode is active, skip it (`clear_occlusion()`).
- **Seeing through walls:** for labels, nameplates, the bubble and the marker, test line of sight to the anchor:
  - either a physics ray, using the existing `ConcavePolygonShape3D` walls,
  - or the 2D `segment_walkable`-style footprint test.

  Hide what is blocked, or show a small edge chip for the speaker and the objective. Note that hidden or replaced buildings may still have collision (unverified).
- **Picking:**
  - In `screen_to_ground_xz`, return "no hit" when `normal.y >= -0.02`, and limit ground hits to about 60 m.
  - Ignore taps that miss everything instead of walking backwards.
  - Add an "occluded" check before accepting a neighbour.
- **Guide arrow:** flip the direction when `camera.is_position_behind(target)`.
- **Character scale:** use 1.0 for player and neighbours while street mode is active, and restore 2.15 on exit. Hide `player_visual` so `player_overlay_rect` comes back empty.
- **Comfort:**
  - Cap path walking at `WALK_SPEED_M_PER_S` in street mode: no 24 m/s corridor and no ×2.2 web multiplier.
  - Offer "Skip ahead": fade or cut to arrival for long routes. Black Hawk is about 440 m away, roughly 90 s at walking speed.
- **Reduced motion:**
  - New setting, seeded from `matchMedia('(prefers-reduced-motion: reduce)')` through `JavaScriptBridge`.
  - Effects: snap turns, no camera smoothing, no head bob (none is planned anyway), and the bubble bob, marker spin and tree sway stop.
- **Environment:**
  - A sky gradient, via a two-colour background or a procedural sky. Not verified with the Compatibility renderer.
  - Distance fog. Also not verified with Compatibility in 4.7.2, so it needs a quick test.
  - Raise the ground-ribbon offsets, or use a depth bias, to avoid z-fighting.

### Tier A: Street-level camera (optional toggle)

**Changes**
- Shift+F plus a "Street view" button in the walking controls (`layout_walking_controls_and_hub`, :6912), with an `accessibility_name`.
- Look controls:
  - Drag-to-look with the left mouse button or one finger (replaces panning only while street mode is active).
  - Shift+Left/Right turns, smooth or 30° snaps.
  - Shift+Up/Down tilts.
- Arrows and WASD stay movement, relative to `street_yaw`. This reuses the existing `-camera_yaw` rotation at :14362.
- Pinch and scroll do nothing, or nudge the FOV inside the comfort range.
- Esc, X and L work as they do today. `overview()` always exits street mode.
- Announcements: "Street view on. Facing north, On Turk Street, near Taylor Street", reusing `location_phrase` (:8368) and `compass_phrase` (:5994). Announce the heading after each snap turn.
- Everything in the shared design above.

**Files:** new `godot/street_view.gd`; `main.gd` hooks in `update_camera`, `_physics_process`, `_unhandled_input`, `screen_constant_scale` and its callers, `screen_to_ground_xz`, `update_readable_scene_labels`, `update_guide_arrow`, `update_occlusion`, the settings functions and `_ready`.

**Risks**
- The bubble and label sizing refactor touches many tested paths.
- `pan_camera_by_screen_delta` and the activity framings must never run in perspective.
- The automatic return could flicker if a function quickly toggles `following_player`.
- Phone frame rate.

**Tests**
- New `godot/tests/street_view_checks.gd`, preloaded from `study_test.gd` the way `before_streets_checks` is. It should check:
  - the default after load is the orthographic map view;
  - toggling on gives perspective at eye height with `target` on the player;
  - the bubble's on-screen width stays within a tolerance at 3 m and 20 m;
  - a tap above the horizon doesn't walk;
  - a label behind a building is hidden;
  - opening Rhythm Circle or a conversation returns to the map, and closing restores street view;
  - `overview()` exits;
  - snap turns step exactly 30°;
  - the settings round-trip;
  - the announcement text.
- Rerun the existing pose tests with street mode off; they must be unchanged.
- In `tests/godot-browser.mjs`: press Shift+F, check that the screenshot shows sky above and ground below; the pck assertion stays.

**Size:** about 500–800 lines of GDScript, an estimated +10–30 KB in the pck.

### Tier B: First-person play

**Changes**
- Street view becomes a real mode where talking does *not* suspend it.
  - `frame_conversation` turns the camera to face the speaker (an eased yaw turn, or a cut under reduced motion) instead of panning.
  - Neighbours already turn to face you.
- A focus ring on the person or object nearest the screen centre within about 6 m, with Enter/T and tap to interact. This reuses `TALK_PROMPT_RADIUS_M` (:64) and `talk_to_nearby_neighbor` (:6349).
- An on-screen touch joystick plus a look area.
- Opt-in pointer lock with a visible "Esc releases the mouse" hint.
- Panels shown as overlays over the first-person view.
- Each activity is classified "stays elevated" or "works in first person", through a per-module `prefers_elevated_view()`.
- Strafe vs turn options for A/D.

**Files:** `street_view.gd`, `main.gd` framing functions, each activity module's inspection rectangle and `cutaway_points`, and `shared_panel.gd` for layout.

**Risks**
- Inspection rectangles (bea, helper bench, quiet seats) assume the overhead view.
- Mural Workshop's board and Boeddeker were designed for the elevated view.
- Motion sickness on long walks.

**Tests**
- Focus-ring choice by angle and distance.
- An interaction with nothing in focus does nothing.
- Joystick input feeds `walk_step`.
- A conversation opened in first person keeps perspective.
- A browser touch-drag test.

**Size:** about 800–1500 more lines.

### Tier C: WebXR, later

Tier B would leave the important pieces ready:
- one camera rig node (an XROrigin3D-style parent: a body plus head pose),
- input abstracted into "move / turn / select / back" actions,
- interaction by focus or pointing ray instead of screen pixels,
- the panels' content available to draw on in-world 3D quads,
- comfort options already in settings (snap turns, vignette, teleport).

Godot's web WebXR has not been tried here; the first step should be a throwaway WebXR session test.

### Smallest prototype to feel it on one block

Build Tier A, limited to the opening block around Turk & Taylor, where the player starts (`PLAYER_START`, main.gd:21):
- Shift+F toggle,
- perspective eye camera with drag-look and Shift+arrow snap turns,
- automatic return to the map for anything that frames itself,
- characters at 1.0 scale,
- bubbles sized by distance,
- labels hidden when behind walls,
- sky colour and fog,
- far plane 250 m.

Skip pointer lock, the joystick and the focus ring. Roughly 300–400 lines.

### Open decisions for you

- **Field of view:** default (I suggest about 70° vertical) and slider range. Should phones held upright keep a fixed horizontal width instead?
- **Eye height:** 1.6 m, or slightly over the shoulder with the player's body visible?
- **Turning:** smooth or snap by default, and how many degrees per snap?
- **Turning vs strafing** for A/D, and for the arrow keys.
- **Long walks:** show the walk or skip ahead in street view? And should the 24 m/s corridor and the ×2.2 web multiplier remain anywhere?
- **Which activities stay elevated.** Candidates: Mural Workshop, Rhythm Circle "View Circle", Boeddeker, the overviews, history-stop framing.
- **True-scale neighbours** only in street view, or everywhere?
- **Labels:** how many to show at eye level? Should building names show at all?
- **Sky and fog style:** a realistic look vs the current painterly palette.
- **Whether street view is remembered** between sessions. I suggest not: always start in the map view.

### Could not verify

- How Esc behaves with pointer lock in Godot 4.7.2's web build.
- Sky and fog support in the Compatibility renderer.
- Phone frame rate in perspective.
- Whether hidden or replaced buildings keep collision.
- How much of the Godot logic the `browser-next` JS code actually matches.
- The marked engine sizes and capabilities in the comparison table.
- Godot WebXR with the Compatibility renderer.

### Critical files for implementation
- C:\tenderloin-redux\godot\main.gd
- C:\tenderloin-redux\godot\rhythm_circle.gd
- C:\tenderloin-redux\godot\tests\study_test.gd
- C:\tenderloin-redux\godot\tests\before_streets_checks.gd
- C:\tenderloin-redux\tests\godot-browser.mjs