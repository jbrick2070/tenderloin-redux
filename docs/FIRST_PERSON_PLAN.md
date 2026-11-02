# First-person (street-level) play: plan

**Status:** proposed; nothing is built. Dated November 2, 2026. Merged from three independent plans (Claude, Gemini 4 Argon, Codex gpt-6-astra) and checked against the code at commit `ce777e7`. The raw plans are in `docs/first-person-advice/` and are unverified machine advice; where they differ from this document, this document wins. Line numbers are for `ce777e7` and will drift.

## 1. Recommendation

Stay on Godot 4.7.2 and add an optional street view to the existing 3D edition. The map (elevated) view stays the default and is the only view that starts a session. All three plans agree on this. The game's movement, collision, routes, saves and activities never read the camera, and none of them need to change.

First, run four throwaway spikes (Phase 0) to retire the browser risks before any production code: Pointer Lock and Esc in the Godot web build, perspective with sky and fog in the Compatibility renderer, phone frame rate, and a WebXR session. Then build one shippable prototype (Phase 1) on the opening block around Turk and Taylor: Shift+F toggles a perspective eye camera at 1.6 m; drag and keys turn; neighbours are drawn at true scale; labels behind walls are hidden; anything that frames itself hands back to the map view and returns afterwards.

Switch to three.js only under the conditions in section 3.

## 2. Engine decision

Engine facts below are supported by at least one plan with a cited source or were confirmed here. Anything else is marked unverified in section 10.

| Engine | License | Static web export | Size evidence | First-person / WebXR | Port cost from this repo | Verdict |
|---|---|---|---|---|---|---|
| **Godot 4** (current) | MIT | Yes, already shipping: WASM + WebGL2, Compatibility renderer, threads off (`godot/export_presets.cfg:12`) | **Measured here:** pck 1,472,548 B; wasm 39,514,754 B; js 279,815 B. Gzip -9 total about 11.2 MB; Brotli total about 8.1 MB | Perspective camera built in. `MOUSE_MODE_CAPTURED` maps to `requestPointerLock()` on the canvas (Astra cites the 4.7.2 web platform source). `WebXRInterface` exists; untested here | Lowest: an increment, roughly 300–800 lines for Phase 1–2 | **Stay** |
| three.js | MIT | Yes, plain JS | Core is a few hundred KB compressed (estimate) | `PointerLockControls`, built-in `WebXRManager`; you write the movement and interaction | Medium–high: city JSON and `browser-next/` JS logic and saves are reusable; Godot's procedural meshes, UI wiring and 3D interaction must be rebuilt | **Fallback** |
| Babylon.js | **Apache-2.0** (not MIT) | Yes | Sub-MB to a few MB depending on imports (estimate) | `UniversalCamera`; the strongest integrated WebXR helpers | As three.js | Fallback if WebXR becomes the main mode |
| PlayCanvas engine | MIT (the hosted editor has separate terms) | Yes, self-hostable engine | Estimate only | First-person example; built-in WebXR | As three.js | Viable; no advantage over three.js here |
| Defold | Defold License: source-available, Apache-derived, not OSI | Yes, HTML5/WASM | Vendor claims 0.83 MB for an empty build | FPS example with pointer lock; no maintained WebXR path verified | High: Lua rewrite | No |
| Bevy | MIT or Apache-2.0 | WASM, WebGL2/WebGPU | No comparable baseline | Camera example only; WebXR immature | Very high: Rust ECS rewrite | No |
| Stride | MIT | No official browser target | – | – | Very high | Reject |
| O3DE | Apache-2.0 or MIT | No official browser target | – | – | Very high | Reject |
| Unity 6 | Proprietary; Personal tier under a $200k threshold | Yes, WASM/WebGL2 | Small benchmark builds are about 3–7 MB Brotli (Astra's citation) | Mature first-person tooling; WebXR only through third-party packages | High: C# rewrite plus new save and accessibility bridges | No |
| Unreal | Source-available, not open source; 5% royalty above $1M | No: HTML5 became a community extension at 4.24. Pixel Streaming needs GPU servers | – | Native XR only | Very high | Reject |

**The download-size caveat.** The 2 MiB cap at `tests/godot-browser.mjs:104` applies to the pck only, and is `<=`. The engine binary is outside it. Astra's warning is correct: the cold first-visit transfer is already about 11 MB with gzip, so the Godot edition does not meet a strict single-digit-MB total today. Only Brotli brings it near 8 MB, and whether GitHub Pages serves Brotli for `.wasm` is unverified. First person does not change the wasm, so this is an existing property of the 3D edition, not a cost of first person (see decision 1). Argon's "5–8 MB compressed, 18–28 MB uncompressed" wasm figure is wrong for this build.

**Switch to three.js (Babylon if XR is primary) if any of these happens:**

1. The Phase 0 phone spike cannot hold about 30 fps in perspective on a mid-range phone after fog and a 250 m far plane.
2. The Phase 0 WebXR spike cannot start an immersive session in the Godot web build on the target headset browser, and VR is committed.
3. The creator makes a strict single-digit-MB cold download a hard rule, and a size-optimized custom Godot template (unmeasured) cannot reach it.
4. The creator decides to merge the 2D and 3D editions into one JavaScript codebase. `browser-next/` already holds the rules, saves (`browser-next/godot-save.js`) and semantic HTML UI, so this is the strongest long-term argument for a JS renderer.

**On an "engine-to-engine transformer".** No tool converts a whole game. Geometry and materials can move at low cost: Godot's built-in glTF 2.0 exporter (`GLTFDocument`, also usable at runtime) can write the procedurally built city, including vertex colours, to a `.glb` that three.js, Babylon, Unity or Unreal can import. Particles and `ShaderMaterial`s, including the custom building shader at `main.gd:1080`, do not export, and they would need re-creating. There is no proven GDScript-to-other-engine code converter; Unidot goes the other way (Unity to Godot). The logic in `main.gd` (16,327 lines) and 26 other scripts would be a rewrite. Reusing `browser-next/` JS is the only real shortcut. Argon's claim that a baked `.glb` "would bloat the 2 MiB budget" confuses the budgets: the pck cap applies only to the Godot build.

## 3. What in the code assumes the elevated camera (verified)

All lines are in `godot/main.gd` unless another file is named.

| # | Assumption | Evidence | Street-level effect |
|---|---|---|---|
| 1 | One orthographic camera | Created at 2058–2061 (`PROJECTION_ORTHOGONAL`, default near/far). `update_camera()` 15098–15128 sets `camera.size`, places the camera at `target + get_camera_offset_vec() * offset_scale` (`CAMERA_OFFSET` (180,180,180) at :20; ×2.2 for wide views at :15100), then `look_at(target)`. In hub and short-phone layouts it re-pans `target` to keep the player and YOU label inside `play_area_rect()` (15106–15128) | The street branch must bypass all of this, including the re-pan |
| 2 | Orbit state | `camera_yaw`, `camera_pitch_scale` (777–778); `get_camera_offset_vec` 14075; `rotate_camera_by_delta` 14079 (pitch scale clamped 0.55–1.65) | Use a separate `street_yaw`/`street_pitch`; do not reuse the pitch scale |
| 3 | `target` has two jobs: look-at point and proximity centre | Bubble hidden beyond 45 m of `target` (4806); labels within 55 m of `target` (14264) | Keep `target` on the player in street view and these keep working |
| 4 | Screen-constant sizing reads `camera.size` | `screen_constant_scale()` 6210–6213; `speech_bubble_base_scale()` 4687–4691 reads `camera.size` directly. Callers: bubble 4713, 4843; talk prompt 6335 (via base scale), 6342; guide marker 6270; overlay rect 7115; labels 14262; nameplate 14298. Test: `godot/tests/study_test.gd:1624,1627` divides by `camera.size` | Meaningless in perspective. It needs a depth-aware variant that takes the node position |
| 5 | Through-wall drawing | `no_depth_test = true` on every `make_label_3d` label (2305), the bubble (4611, 4640), a burst material (5816), the gold gem (6230) and the talk prompt (6286) | X-ray labels at eye level. They need a line-of-sight test |
| 6 | Anchors placed high | Bubble and talk prompt at `SPEECH_BUBBLE_HEIGHT_M` 5 m (:199, 6334); marker lift 4.6/6.6 m (201–202); bubble bob (4812), marker bob and spin (6272–6273) | At the 1.35 m arrival distance (:18), a 5 m bubble is about 68° above eye level, off the top of a 70° view (Argon's arithmetic, confirmed) |
| 7 | Characters drawn 2.15× | `CHARACTER_VISUAL_SCALE` (:14) applied to neighbours (2608) and the player (2628) | Neighbours about 3.65 m tall |
| 8 | Ground picking | `screen_to_ground_xz` 14401–14408 intersects y=0 with no check on the sign of `t`. `neighbor_screen_distance` 14410 and the landmark checks after it use `unproject_position` without `is_position_behind`; only the marker check at 14447 guards it. Picking gates on ground distance (14458) | A tap at or above the horizon resolves behind the player, and targets behind the camera can be picked |
| 9 | No physics queries anywhere | No `intersect_ray`, `move_and_slide`, `MOUSE_MODE`, `visibility_range` or fog setting in any `godot/*.gd` (grep). Building walls do have `ConcavePolygonShape3D` bodies (1904–1911) | Line of sight can use those bodies or a 2D footprint test. Movement stays the 2D solver |
| 10 | Cutaway slope | `update_occlusion` 14115 (clears only for overview, wide overview or selection) and `building_record_occludes_point` 14087–14094 use the camera-offset slope, with `CUTAWAY_RADIUS_M` 4 (:19). Activity focus points come from `cutaway_points()` in `rhythm_circle.gd:466`, `quiet_seats.gd:182`, `bea_invitation.gd:134`, `shared_panel.gd:275`, `loan_homecoming.gd:137`, `helper_bench.gd:265` and `shared_meal.gd:378` | Would ghost the facades beside the player. Call `clear_occlusion()` (14055) in street view |
| 11 | Off-screen arrow | `update_guide_arrow` 7177–7200 uses `unproject_position` with no behind-camera test | Points the wrong way for a target behind you |
| 12 | Player overlay rect | `player_overlay_rect` 7103–7119 already returns `Rect2()` when the visual is hidden or behind the camera | Hiding `player_visual` is enough. Argon's claim that the reward banner (5866–5899) would always be hidden is true only if the body stays visible |
| 13 | Self-framing views | `frame_conversation` 6379 (sets `following_player = false`); `focus_*` and block framing 9169–9267; `panel_camera_pose()` 9205 is a four-value array, and the refit waits two frames (9216–9217); `focus_history_stop_camera` 8610; `frame_landmark_view` 6066; Boeddeker 4583 | All pan an orthographic camera. In perspective they must suspend street view or be skipped |
| 14 | Return-pose patterns to copy | `rhythm_circle.gd:262` saves an 8-value `return_pose` and restores it at 294–301. `lantern_procession.gd:292–300` and `voting_story.gd:226–242` keep a 4-key camera dictionary around `walk_to_point` | Extend these with the street state |
| 15 | Pose-equality tests | `godot/tests/before_streets_checks.gd:30,64` compare `[target, view_size, camera_yaw, camera_pitch_scale, following_player]` | Must pass unchanged with street view off |
| 16 | Route speed | 4.8 m/s (:10); 24 m/s west of x=-50 (:11, 13837); ×2.2 on web (14377), so up to about 53 m/s on web | Unacceptable at eye level |
| 17 | Movement basis | `_physics_process` 14317: returns early for focused activities (14319); WASD/arrows rotated by `-camera_yaw` (14362) into `walk_step` (8295); 2D walkability in `is_walkable_point` 8072–8087; A* on a 2.0 m grid in `find_path` 8130 (Argon's "1.5 m grid" is wrong) | Reuse it with the street yaw. Trees, lamps and counters are not obstacles (Argon, confirmed: `is_walkable_point` has no prop test) |
| 18 | No sky or fog | `BG_COLOR` 172a2e (1967–1968); a 960×560 plane at y=-0.1 (1986–1991); ground ribbons at 0.01/0.025/0.052 m (about 2108–2125) | Hard horizon edge; likely z-fighting at grazing angles |
| 19 | No reduced-motion setting | Settings envelope v1 stores only `neighborhood_voices` and `reward_sounds` (`save_godot_settings` 10685; `load_godot_settings` 10691 ignores unknown keys). `browser-next/game.js:57` already reads `prefers-reduced-motion` | Add one; the new keys are backward-compatible |
| 20 | Keys | Every letter, the digits, F2–F8, `[ ]`, `.` and `/` are bound. `KEY_F` at 15045 ignores Shift, so Shift+F means Find Me today. Q (15003), E (14938), T (14951) and V (14973) are taken; Tab is GUI focus traversal. Unbound: comma, backquote, F9 | Bind Shift+F explicitly before the `KEY_F` arm. Do not use Q/E/V/Tab (Argon proposed them) |
| 21 | Browser bridge | `setup_web_a11y_bridge` 11456 already blocks the context menu (11463), so right-drag works; announcements go through `announce_a11y_status` 12002 | Reuse for mode, heading and capture announcements |

## 4. Architecture

- **One new module**, `godot/street_view.gd`, following the existing pattern of a script with a `game` reference (Claude's proposal), plus small hooks in `main.gd`. Do not grow `main.gd` with an enum state machine (Argon) and do not first refactor every camera entry point into an adapter (Astra's Phase 0). The second is the right destination but too much risk before the feel is proven; adopt it in Phase 4.
- **State** (all transient; not in the progress save): `street_enabled` (the player's choice), `street_suspended`, `street_yaw`, `street_pitch` (clamped to ±60°), `street_fov`, and `capture_state` (released/requested/locked/lost), kept separate from the mode.
- **One rule decides the camera.** The street view is active when `street_enabled and following_player and not in_overview and not in_wide_overview and selected < 0 and not is_focused_activity_visible()`. Otherwise it is suspended, and the map view renders exactly as today. Every framing function already sets `following_player = false`, so they all suspend automatically. Resume happens through `follow_player()` (14041), `frame_player_for_walking()` (7466) or `resume_walking_view()` (8286). Announce both suspend and resume.
- **The street branch in `update_camera()`:** perspective, near 0.1, far 250, eye at the player plus 1.6 m, rotation from yaw and pitch with zero roll. `target` stays at `player.position + Vector3.UP`. Never parent the camera to `player_visual`: its limbs animate (`animate_person_node` 3531). On every exit, restore orthographic projection, `near` 0.05, `far` 4000, cutaways, the 2.15 scale and player visibility.
- **Ownership guard (from Astra).** Deferred refits (`refit_panel_camera` after two frames) compare a four-value pose with no mode in it. Add the street state to `panel_camera_pose()` and make refits no-ops while street view is active, so a late callback cannot pan a perspective camera.
- **Return to the player's current position.** When resuming, compute the eye from the player's position now, with the saved yaw and pitch. Never restore an old position.
- **Settings.** Add optional `reduced_motion`, `street_fov` and `street_turn` (snap or smooth, and the step) to the existing v1 settings envelope, validated like the current keys, with safe defaults. Do not persist `street_enabled` by default (decision 6), and never persist pointer capture.

## 5. Phases

Each phase ships behind the off-by-default toggle and keeps `npm run godot:test` and `tests/godot-browser.mjs` green. Headless checks prove state, geometry and dispatch. They cannot prove Pointer Lock, feel, readability or comfort, so each phase also has a real-browser exit.

### Phase 0: spikes (throwaway; nothing merged to `main`)

Run them in a clean worktree, and write each result into this document's section 10.

- **0a. Pointer Lock and Esc in the Godot web build.** Set `MOUSE_MODE_CAPTURED` from a real mouse press in `_unhandled_input`, and use `InputEventMouseMotion.screen_relative` for look. Record, in Chromium, Firefox and Safari: whether the Esc that releases the lock also reaches Godot as `KEY_ESCAPE`; the delay before re-locking is allowed (Argon claims about 1.25 s, unverified); behaviour on tab switch; and how `Input.mouse_mode` reports a lock the browser released. *Exit:* a table of results, and a decision between "drag-look only" and "opt-in mouselook".
- **0b. Perspective, sky and fog in Compatibility.** Perspective eye at `PLAYER_START` (:21); `ProceduralSkyMaterial` or a two-colour gradient; `Environment` depth fog (Astra cites the 4.7 renderer table as supporting depth and height fog in Compatibility); far 250 m. Check z-fighting on the ribbons, then try a small y lift or a depth bias. *Exit:* screenshots looking down Turk, Taylor and Eddy with no hard horizon edge and no flicker.
- **0c. Phone frame rate.** The same build on one mid-range Android phone (Chrome) and one iPhone (Safari), portrait and landscape, walking the opening block. Log frame time from `Performance.TIME_PROCESS` or the FPS monitor. *Exit:* at least 30 fps sustained, or a list of the costs found (tree sway rewrites every canopy transform per frame at 5057; there are about 188 building draw calls).
- **0d. WebXR session smoke test.** A button calls `WebXRInterface.is_session_supported("immersive-vr")` and then `initialize()` from a user gesture, with an `XROrigin3D`/`XRCamera3D` at the eye position. It must be served over HTTPS (Pages) or localhost. *Exit:* the street is visible in stereo on the target headset browser, and the session ends cleanly back to the page; otherwise apply switch condition 2.

### Phase 1: one-block street-view prototype

*Scope:* Shift+F (handled before the `KEY_F` arm) and a "Street view" button with an accessible name in the walking controls. Perspective eye camera; `clear_occlusion()`; `player_visual` and nameplate hidden; neighbours at scale 1.0 while active; the suspend/resume rule above; `update_occlusion` and `refit_panel_camera` guarded; sky, fog and far plane from 0b; `screen_constant_scale(px, at)` gains a perspective branch, `px * 2 * depth * tan(fov/2) / viewport_h` with depth along the camera's forward axis, and its callers in row 4 pass their node position; labels and the bubble hidden when the line of sight to them is blocked, using a 2D segment-against-footprint test (`walk_building_bins`); route speed capped at 4.8 m/s with no corridor speed and no ×2.2 while active; keyboard turning (Shift+Left/Right snap 30°, Shift+Up/Down pitch); a tap at or above the horizon does nothing. Limit it to the opening block: leaving it, or any route west of x=-50, suspends to the map view.

*Exit:* stand, look, walk along a wall and around a corner, open the map with L, return with F, talk to a neighbour (which suspends to the map and returns), resize to phone portrait. No teleport, no ghosted facade, no 3.65 m neighbours.

*Tests:* new `godot/tests/street_view_checks.gd`, preloaded from `study_test.gd` the way `before_streets_checks.gd` is. It checks:
- after load, the camera is orthographic and street view is off;
- the toggle gives perspective with the eye at 1.6 m and `target` on the player;
- `occluded_buildings` is empty;
- toggling ten times restores the exact elevated pose, materials and scales;
- `wide_overview()` gives orthographic, and `frame_player_for_walking()` gives perspective again;
- `frame_conversation(0)` suspends, and ending the conversation resumes;
- a deferred `refit_panel_camera` while active leaves the eye alone;
- `screen_to_ground_xz` at or above the horizon reports no hit;
- the bubble's screen width at 3 m and 20 m is within tolerance;
- a label behind a building is hidden;
- route speed is at most 4.8 m/s;
- the announcement text.

Rerun `before_streets_checks` and `helper_bench_checks` unchanged. In the browser, `tests/godot-browser.mjs` presses Shift+F and samples the canvas for sky above and ground below; the pck assertion stays (optionally make it strict `<`, as Astra suggests).

### Phase 2: look and movement controls

Drag-to-look with the left mouse button or one finger, replacing pan only while active (15052–15096; a release under 8 px is still a tap). WASD and arrows relative to `street_yaw`, with pitch ignored for walking. Give `walk_step` an explicit magnitude, because it normalizes its input today (8320–8325). A touch stick bottom-left and a look area on the right; each contact gets an owner at touch-down, and a street gesture never starts the map pinch (14563–14631). Mouselook through Pointer Lock only if 0a allows it: opt-in, requested synchronously from a press, released before any panel, map or activity, never re-requested automatically, with a visible and announced "Esc releases the mouse" hint. Release capture and clear held contacts on focus loss (10917).

*Tests:* yaw-relative movement at yaw 0, 90° and 180°; diagonal speed normalized; a drag changes yaw without detaching `following_player`; a look release never routes; a stick release stops; capture state goes to released when a panel opens. *Exit:* walking and looking together on a real phone and on desktop, in Chromium, Firefox and Safari.

### Phase 3: crosshair and click interaction

A focus ring on the interactable nearest the crosshair: within about 6 m and 20° (reusing `TALK_PROMPT_RADIUS_M`, :64), not behind the camera, line of sight clear. Enter or T activates it through the existing gameplay methods (`talk_to_nearby_neighbor` 6349 and the `walk_to_*` functions). Add `is_position_behind` guards to every picking `unproject_position` call (14410 onward). A ground tap needs a finite positive hit within 60 m on a clear segment that passes `is_walkable_point`; otherwise nothing happens. Argon's fallback that walks 18 m ahead is rejected: an unintended walk is worse than none. *Tests:* a wall blocks a neighbour; a target behind the camera is rejected; sky taps are rejected; click, crosshair and keyboard each trigger the same action exactly once. *Exit:* a neighbour, the mural and the speaker are each reachable by crosshair, by click and by keyboard alone.

### Phase 4: eye-level UI and conversations in street view

The camera-ownership adapter (Astra), now justified: a return token with owner, generation and both poses, applied in `rhythm_circle.gd`, `lantern_procession.gd` and `voting_story.gd`. Bubble and talk prompt anchored at about 2.05 m in street view, or a subtitle panel (decision 4); full text keeps its Info fallback (4824–4840). Marker lowered to about 2.4 m. The guide arrow uses the bearing in camera space when the target is behind (7177). The celebration burst is placed in view. Conversations no longer suspend street view: neighbours already face the player (3585–3595, 8963–8965); the player's camera is not turned by default (decision 3), and there is a "Face speaker" key. *Tests:* a bubble at 1.35 m sits inside `play_area_rect()` and is not deferred; the arrow is visible with the objective 180° behind; the reward banner is visible and unclipped; a conversation keeps perspective. *Exit:* readable at desktop, narrow portrait and short landscape sizes, and a screen-reader walkthrough passes.

### Phase 5: activity handover

Each activity module gets `prefers_elevated_view()`. Full-screen 2D activities (the `is_focused_activity_visible` set, 12117) simply suspend, release capture and return. Explicit world inspections stay elevated at first: the overviews, Rhythm's View Circle (`rhythm_circle.gd:434`), mural, speaker and block framing, history stops, Boeddeker and the museum. A short-range inspection becomes a street-level look-at only once the creator decides so (decision 5). Fix the projection-dependent rectangles in `bea_invitation.gd:114–130`, `helper_bench.gd:273–283`, `quiet_seats.gd:163–180` and the activity `snapshot()` projections Astra lists, so they reject points behind the camera. *Tests:* every focused activity entered from street view returns to street view at the player's current position; a late callback after close does nothing; nothing re-captures the mouse automatically. *Exit:* every activity can be reached and left from street view.

### Phase 6: whole district, art and performance

Lift the one-block limit. Long routes: walk at 4.8 m/s with a "Skip ahead" fade or cut (decision 2). Soft obstacles for trees, lamps and counters in manual street movement only, leaving A* untouched. Eye-level detail only where Phase 0 screenshots show it is needed (doors on short plinth segments, subtle facade banding in the shader), all procedural. Hide rooftop details beyond about 140 m with hysteresis. Measure pck growth after each change and keep at least 200 KB of headroom. *Exit:* the creator approves frame times on target phones; the pck stays under 2 MiB; no regression in the map view.

### Phase 7 (later): WebXR

Only after 0d passes and the creator commits to it. Phases 1–5 already provide a metric eye rig, input as actions, interaction rays and comfort settings. Still to do: `XROrigin3D` on the player, session lifecycle signals, controller rays into the Phase 3 resolver, snap turn and teleport, `CanvasLayer` panels redrawn on world-space `SubViewport` quads, and depth-tested labels.

## 6. Comfort and accessibility

- **Field of view:** default 70° vertical, adjustable from 60° to 90° in settings. Test portrait separately; consider `keep_aspect = KEEP_WIDTH` in portrait (decision 7).
- **Turning:** drag and mouse look are smooth, because they are direct manipulation. Keyboard and touch buttons snap 30° by default, with smooth turning at a bounded rate as an option. Pitch is clamped and roll is always zero.
- **No head bob,** shake, auto-lean or speed-dependent FOV. The eye never follows the animated visual.
- **Travel:** 4.8 m/s in street view, with Stop always available. Faster travel is a fade or cut, never a fast eye camera. Under reduced motion, every camera transition is an instant cut.
- **Reduced motion:** a real Godot setting, seeded from `matchMedia('(prefers-reduced-motion: reduce)')` through `JavaScriptBridge` and saved as an override. It also stops the bubble bob (4812), the marker spin (6273) and the tree sway (5057). Build it in Phase 1; it helps the map view too.
- **Keyboard-only play:** move, turn, pitch, cycle targets (N/B already exist), interact, map, Stop and toggle the view, all without Pointer Lock. Movement never runs under a focused menu (the early return at 14319 already covers activities).
- **Screen readers:** announce the mode change with the heading and location, reusing `location_phrase` 8368 and `compass_phrase` 5994 ("Street view on. Facing north on Turk Street near Taylor"). Announce the heading after each snap turn, focus-ring changes debounced, and capture loss. Never narrate continuously. Expose `camera_mode` and `street_yaw_deg` in `get_a11y_status_snapshot` (11810) for the tests.
- **Touch:** adjustable sensitivity, a left-handed option, large targets, and nothing that requires two fingers.
- **The map view is always one key away,** for anyone who feels unwell.

## 7. Decisions for the creator

1. **Download budget.** Is the existing about 11 MB gzip cold download of the 3D edition acceptable? *Default: yes. Keep the pck cap; the 2D edition is the light fallback; revisit only under switch condition 3.*
2. **Long walks in street view.** Walk them, skip ahead, or hand over to the map view? *Default: 4.8 m/s with a "Skip ahead" fade for routes over 60 m; no 24 m/s or ×2.2 in street view.*
3. **Conversation camera.** Turn the player's view to the speaker automatically? *Default: no; offer a "Face speaker" key.*
4. **Dialogue at eye level.** Lowered world bubble, or a subtitle panel? *Default: a lowered bubble first, with the panel as the fallback.*
5. **Which inspections stay elevated.** *Default: all existing explicit inspections and the overviews stay elevated at first.*
6. **Remember street view between sessions?** *Default: no; every session starts in the map view.*
7. **Field of view and eye height.** *Default: 70° vertical (fixed width in portrait), 1.6 m eye, no visible body.*
8. **Neighbour scale.** True scale only in street view, or everywhere? *Default: 1.0 in street view, 2.15 in the map view.*
9. **Turning default.** *Default: snap 30° on keys and buttons, smooth for drag.*
10. **Mouselook.** *Default: drag-look only, until spike 0a shows Esc and re-lock behave; then opt-in.*
11. **Art promise.** Stylized and geographically grounded, or a surveyed reconstruction? *Default: stylized; facades are already labelled unverified in-game (15167).*
12. **Label density.** *Default: only captions within 28 m with a clear line of sight; no building names at eye level.*

## 8. Where the plans disagreed and how it was resolved

| Topic | Claude | Argon | Astra | Resolution |
|---|---|---|---|---|
| Engine | Stay | Stay ("near-zero port cost") | Qualify Godot first; three.js if a strict single-digit MB is mandatory | **Stay**, with explicit switch conditions. Astra was right that the total download already exceeds single-digit MB with gzip (measured here); Argon's wasm size is wrong |
| Structure | New module plus hooks | In `main.gd`, with an enum | Adapter around every camera entry point first | Module plus hooks for Phases 1–3; Astra's ownership tokens in Phase 4, and the refit guard in Phase 1 |
| Default desktop look | Drag; pointer lock opt-in | Drag; pointer lock opt-in | Capture on an explicit click, with a drag fallback | Drag by default; mouselook opt-in after spike 0a |
| Horizon tap | No hit | Clamp to a point 18 m ahead | No destination | **No hit**: walking somewhere unintended is worse than nothing |
| Conversation camera | Eased turn (Tier B) | Auto-yaw at the speaker | No forced rotation | No forced rotation, plus a "Face speaker" key (comfort) |
| Inspections | Suspend to the map | Many stay at street level with an aimed yaw | Stay elevated initially | Suspend first; per-activity opt-in later |
| Turn default | Either | Snap 30° | Smooth mouse, snap on keys | Smooth for drag, snap 30° on keys |
| Street route speed | 4.8 m/s plus skip | 7.2–8.5 m/s | Bounded, plus an elevated transfer | 4.8 m/s plus skip ahead |
| Far plane / eye height | 250 m / 1.6 m | 650 m / 1.62 m | Configurable | 250 m with fog / 1.6 m, confirmed in spike 0b |
| Toggle key | Shift+F | Shift+F, Tab or backquote (and Q/E for turning) | Audit first | Shift+F; Q, E, V and Tab are taken |
| Unreal HTML5 | "Dropped in 4.24" | "Removed after 4.24" | Became a community extension at 4.24 | Astra's wording |

## 9. Claims in the plans that were false or overstated

- **Argon:** `MURAL_POS` is `(76.50, 0, -18.70)` and `ROOK_SPEAKER_POS` is `(117.10, 0, -15.95)` (:22, :27), not `(31.2, 0, -8.8)` and `(55.4, 0, -8.6)`.
- **Argon:** the path grid is 2.0 m (`find_path` 8130), not 1.5 m, and `WALK_GRID_STEP_M` does not exist.
- **Argon:** many line numbers are wrong. `resume_walking_view` is at 8286 (not 8870), `frame_player_for_walking` at 7466 (not 8881), `walk_to_point` at 8792, `setup_web_a11y_bridge` at 11456 (not 10572), `announce_a11y_status` at 12002 and `get_a11y_status_snapshot` at 11810. `apply_settings_json`, `trigger_celebration_burst` and `build_environment` do not exist (the real functions are `load_godot_settings` 10691, `build_celebration_burst` 5795, and environment setup inline at 1965). Its engine document's line numbers are worse (it puts `walk_step` at 8156 and `PLAYER_HEIGHT_M` at :27).
- **Argon:** the wasm is about 5–8 MB compressed and 18–28 MB raw. Measured: 39.5 MB raw, 10.2 MB gzip, 7.1 MB Brotli.
- **Argon:** the reward banner and bubbles break because the overlay rect surrounds the camera. This happens only if the player body stays visible; `player_overlay_rect` already returns empty when it is hidden (7104).
- **Argon:** "`player_visual` bobs `absf(sin(walk_phase)) * 0.055` at 3625–3634": no such code; there is no `walk_phase`, and the walk swings limbs in `animate_person_node` (3531). The advice not to mount the eye on the visual stands.
- **Argon:** proposed Q/E for turning and Tab as the toggle; all three are already in use.
- **Claude:** "`screen_constant_scale` used by the talk prompt (:6335)". Line 6335 uses `speech_bubble_base_scale()`, which reads `camera.size` directly. The conclusion holds. "Shift+F is free": it currently triggers Find Me, so it is unbound only as a combination and needs an explicit arm.
- **The brief:** `main.gd` is 16,327 lines, not about 17,000. Babylon.js is Apache-2.0, not MIT.

## 10. Phase 0 results and what is still unverified

Phase 0 ran on November 2, 2026 from the throwaway branch `fp-spike-phase0`; the full tables, screenshots, JSON reports and harness are in `docs/first-person-advice/phase0/RESULTS.md`.

- **0a, measured in Chrome 156 (headless and a real window):** Pointer Lock engages from a press in 3–6 ms; the Esc that releases it does reach Godot as `KEY_ESCAPE` (synthesized key; one physical press should confirm); a re-lock 0.5 s after Esc succeeded, so Argon's 1.25 s cooldown was not reproduced; a tab switch releases the lock and `Input.mouse_mode` tracks that release on its own. The Claude desktop in-app pane refused Pointer Lock every time (`pointerlockerror`). *Decision: drag-look is the base, mouselook stays opt-in.* Firefox and Safari were not available.
- **0b, verified:** `ProceduralSkyMaterial` and depth fog render in Compatibility on 4.7.2 web; no hard horizon edge with `fog_depth_end` 235 m inside far 250 m; no z-fighting on the ribbons (five-frame pixel diffs: 0.000–0.001 % on the Taylor roadway; the Turk differences sit on Bea's idle animation and the tree sway, and a 2 cm lift changed nothing). The screenshots confirm two Phase 1 items: `Label3D` texts are unreadable at eye height, and a 2.15-scale neighbour towers over the eye.
- **0c, desktop only:** 60 fps vsync-capped, 179–187 draw calls, about 550 k primitives, 82 MB video memory, but 7.7–8.1 ms of script `_process` per frame. The CPU side, not the draw calls, is the phone risk. *Pending on the creator's phones* (the spike build is on the LAN; see RESULTS.md).
- **0d, partly:** the `WebXRInterface` exists in this export and the session path is wired; `is_session_supported("immersive-vr")` is false on this PC with no headset. *Pending on a headset over HTTPS.*
- Safari and Firefox behaviour for Pointer Lock (0a).
- Whether GitHub Pages serves Brotli or gzip for `.wasm`, and the real transfer size; savings from a custom size-optimized template.
- Whether hidden or replaced buildings keep collision bodies (affects a physics line-of-sight test; the 2D test avoids it).
- Engine sizes for three.js, Babylon, PlayCanvas and Bevy (estimates); Unity 6.6 WebGPU status and its benchmark sizes; Defold's 0.83 MB vendor figure; Unity and Unreal licence terms as of today.
- How much Godot activity logic `browser-next/` actually matches (relevant only to switch condition 4).
- glTF export of `MultiMeshInstance3D` street trees (expected to need flattening).
- Pck growth per phase (estimated at 10–30 KB for Phases 1–2; not measured).
