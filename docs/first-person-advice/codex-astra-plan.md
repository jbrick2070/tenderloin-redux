> **Unverified machine advice.** Codex gpt-6-astra first-person plan, run read-only on November 1, 2026, at the creator's request, and saved unchanged below this header. Nothing here is a decision; the checked and merged plan is `docs/FIRST_PERSON_PLAN.md`, which lists the claims found false. Line numbers refer to commit `ce777e7`.

**Recommendation:** add first person as a second walking presentation, with explicit ownership of the camera and input. Preserve the elevated camera’s existing behavior behind an adapter, then introduce street-level movement, interaction, and UI in small releases.

This is a read-only source audit of the working tree observed at `ce777e709728312eca3fa72f15bf629ccef5d005`. I did not edit files, run tests, build, or export. Runtime behavior, current export/source equivalence, visual quality, performance, and assistive-technology behavior remain **unverified**. Line references describe the inspected source; other agents may subsequently move them.

Below, `main.gd` means [`godot/main.gd`](C:/tenderloin-redux/godot/main.gd), and `study_test.gd` means [`godot/tests/study_test.gd`](C:/tenderloin-redux/godot/tests/study_test.gd). Proposed changes and tests are recommendations, not existing functionality.

**1. Inventory the existing contracts before changing the camera**

The project selects GL Compatibility, and its runner prefers a cached Godot 4.7.2 executable but permits `GODOT_BIN` to override it. That verifies configuration intent, not the executable actually running. Sources: `godot/project.godot:17–18`; `scripts/run-godot.mjs:5–6`.

| System | Verified implementation | First-person consequence |
|---|---|---|
| Camera creation and startup | A single root-level `Camera3D` is created with orthographic projection. Startup subsequently opens the overview and chapter story card. `main.gd:2058–2074`. | Preserve this default startup. There is no existing eye-level pivot rig at the camera’s creation site. |
| Camera state and orbit | State includes `target`, `view_size`, overview flags, yaw, and pitch scale. The offset is `(180,180,180)`, rotated around UP; pitch scales the offset’s Y component and clamps to `0.55…1.65`. `main.gd:466–467,493–495,777–780,20,14075–14085`. | These are elevated orbit parameters. Introduce separate street yaw/pitch rather than repurposing pitch scale. |
| Camera application and follow | `update_camera()` applies size, offset, and `look_at(target)`, then can translate the target to fit the avatar around UI. `follow_player()` targets the player at Y=1; Find Me also resets orbit and zoom. `main.gd:15098–15128,14041–14053,7466–7489`. | Street mode must bypass avatar-fitting translations. Its eye remains attached to the player’s physical position. |
| Player body and visual | The player is a `CharacterBody3D` with a cylinder of radius 0.45 m and height 1.72 m. Its visual is independently scaled 2.15×; residents are generated at 1.70 m and also scaled 2.15×. `main.gd:12–14,2605–2628`. | Mount the eye on an unscaled body-space transform. Resolve the enlarged-resident presentation before accepting eye height or conversation distance. |
| Keyboard movement | `_physics_process()` polls logical/physical WASD; arrows move when GUI focus is absent; Shift+arrows orbit. Movement is rotated by `-camera_yaw`. WASD can release existing GUI focus. `main.gd:14317–14364`. | Add mode-specific movement basis and input-context gating **before polling**. Guarding `_unhandled_input()` alone will not prevent walking underneath a menu. |
| Collision and direct walking | `walk_step()` writes XZ positions at Y=0 in substeps of at most 0.20 m. It checks walkability and attempts wall/street/axis sliding; it does not use `move_and_slide()` in this path. Walkability includes bounds, street corridor, footprints, clearance, mural/speaker obstacles, and `power_place.admits`. `main.gd:8295–8365,8072–8087`. | Retain this solver initially. First person does not require replacing navigation with general 3D character physics. |
| Pathfinding and click-to-walk | Pathfinding tries a direct segment before a cached 2 m grid search. `walk_to_point()` validates/snaps the destination, establishes a path, and resumes follow. `main.gd:8089–8152,8792–8837`. | Preserve route validation and cancellation; change only how street-mode input supplies a destination. |
| Automatic route playback | `advance_walk()` substeps, revalidates, can replan, and invokes destination arrival handlers. Its camera update depends on `following_player`. `main.gd:13825–13942`. | Looking around in first person must not turn body-follow off. |
| **Automatic route speed** | Base speeds are 4.8 and 24 m/s. The faster speed applies to Black Hawk/western routes; web playback multiplies route delta by 2.2. `main.gd:10–11,13837–13839,14376–14377`. | The source implies nominal web travel of **10.56 or 52.8 m/s**, before obstacles/arrival. These are derived values, not measured speeds. Do not permit this unchanged at eye level. |
| Story `walk_route` | Lantern and voting call `walk_to_point()` but restore partial legacy camera dictionaries for manually owned views. Voting and power also establish subsequent route legs directly. `godot/lantern_procession.gd:285–301`; `godot/voting_story.gd:226–242,314–322`; `godot/power_story.gd:613–623`. | Convert these handoffs to the shared camera contract. Cover subsequent legs, not just initial route entry. |
| Mouse and one-finger touch | Wheel zooms; right/middle or modified-left drag orbits; ordinary drag becomes pan after 8 px; release otherwise invokes scene picking. The implementation intentionally uses Godot’s emulated mouse path for single touch. `main.gd:15052–15096`. | Street look must own its gesture and suppress the legacy pan/tap path. |
| Existing touch controls | Walk/Stop is a route button activated on **press**, with a release guard to prevent arrival between press/release from triggering another action. It is not a movement joystick. `main.gd:14027–14039,16076–16082`. | Add the stick as a separate input owner; preserve the route button’s guard. |
| Two-finger gesture | Contact IDs, UI-start refusal, emulated mouse suppression, cancellation, and remaining-finger suppression implement map pinch. Pinch changes orthographic size and can preserve a ground anchor. `main.gd:14553–14631`. | Map pinch and street stick/look must be mutually exclusive gesture contexts. |
| Picking and “raycasts” | Ground picking analytically intersects Y=0 using camera rays. Horizontal rays return `target.xz`; negative intersection distance is not rejected. Scene picking combines projected pixel distances with ground distances; the objective marker has a separate plane intersection. `main.gd:14401–14408,14435–14532`. | This is not a physics visibility query. Horizon/upward clicks and targets behind walls require new handling. |
| Physical query geometry | Buildings create concave collision from footprint wall faces. The ground creation shown is a `PlaneMesh`, without a collision body at that site. `main.gd:1795–1800,1904–1911,1986–1992`. | A gaze query needs explicit targets, masks, blocker rules, and player exclusion. Do not assume physical ground, roofs, or every prop participate. |
| Cutaway | Occlusion uses the elevated offset’s slope to sample expanded footprints. It substitutes translucent materials and hides roof details for selected focus subjects. `main.gd:1944,14087–14205`. | Restore solid buildings and bypass this algorithm in street mode. It is not eye-level visibility testing. |
| Overview and wide overview | These functions cancel story intent, clear routes/conversation and transient feedback, reset orbit, restore cutaways, and fit building bounds between UI. `main.gd:15195–15314`. | Treat maps as temporary view contexts with existing gameplay semantics, not merely camera poses. |
| Focus loss | The notification handler clears pinch/phone state and suspends audio-related behavior; it does not stop the route at this site. `main.gd:10917–10926`. | Define explicit street movement, route-pause, and capture-loss behavior. |

The UI audit must include more than the camera node:

| Elevated-view dependency | Evidence | Required treatment |
|---|---|---|
| Shared screen-size conversion | `screen_constant_scale()` uses `camera.size / viewport_height`. `main.gd:6210–6213`. | Preserve it for orthographic mode; use Canvas placement or depth-aware perspective scaling for street mode. |
| Speech bubbles | Billboard/no-depth-test presentation; orthographic scaling; 5 m neighbor anchor; visibility depends partly on distance from camera `target`; pop/bob animation and full-text fallbacks. `main.gd:4620–4650,4687–4691,4749–4753,4805–4845`. | Give street dialogue its own placement and visibility policy. Preserve complete text and reading fallback. |
| Talk prompt | Nearest-neighbor selection, elevated anchor, and bubble-derived scale. `main.gd:6297–6345`. | Replace the floating prompt with a named, accessible action prompt at eye level. |
| Scene/building labels | Billboard/no-depth-test labels cover residents, history, mural/speaker, museum/portal, park, eateries, and surprises. Close-view filtering uses `target`, orthographic scale, and screen-rectangle exclusion. `main.gd:2299–2315,14219–14287`. | Distinguish map labels, physical signage, and interaction captions. Street labels need range and occlusion policies. |
| Player “YOU” and layout exclusion | The caption sits below the feet; overlay fitting reserves the enlarged projected avatar. `main.gd:2629–2632,7103–7140`. | Hide the local avatar/nameplate and reserve the crosshair and touch-control regions instead. |
| Gold objective marker | No depth test; 4.6/6.6 m lift; orthographic scale; bob/spin; hidden near an engaged target. `main.gd:201–202,6226–6239,6257–6273`. | Use a restrained street presentation and retain explicit navigation guidance. |
| Off-screen objective arrow | Direction derives from projected screen coordinates without a behind-camera test in this function. `main.gd:7177–7205`. | Handle behind-camera destinations from camera-relative bearing, avoiding mirrored arrows. |
| Reward banner | Already a Canvas panel; fitting avoids the avatar, suppresses it during focused activities, and supports deferred/Info fallback. `main.gd:5835–5838,5866–5899`. | Keep it in Canvas UI; change its reserved regions and preserve queued messages. |
| Conversation framing | Conversation disables follow, changes target/zoom, and pans the speaker into available screen space. `main.gd:6370–6397`. | Ordinary street conversation must not invoke this elevated recentering. |
| Local inspections | Park, surprises, history, So What, museum, and eateries explicitly change target/size; landmark framing pans around panels. `main.gd:4583–4592,5683–5701,6066–6074,8610–8624,8666–8675,8702–8711,8753–8767`. | Route each through an explicit inspection policy. |
| Mural, speaker, and block framing | These set elevated targets/zoom and frame panels. `main.gd:9169–9195,9253–9267`. | Initially retain explicit elevated inspection, with a reliable return to street view. |
| Deferred framing and hub reopening | Panel ownership compares four legacy pose fields; refits wait two frames and can pan the camera. Reopening/closing the block panel can also restore follow or refresh framing. `main.gd:9205–9251,15446–15472`. | Add mode/owner generation checks to synchronous and deferred paths. |
| Rhythm Circle | Saves an eight-value return pose, explicitly frames the 3D circle, and relinquishes ownership after deliberate manual drag. `godot/rhythm_circle.gd:262,293–309,434–494`. | Replace its positional snapshot with a complete return token while preserving elevated manual-inspection behavior. |

Also include **projection-dependent inspection and diagnostic code** in the migration checklist. It may not move the camera, but incorrect behind-camera rectangles can invalidate layout and QA:

- Film easel: `main.gd:3136–3143`.
- Invitation and helper artwork: `godot/bea_invitation.gd:114–130`; `godot/helper_bench.gd:273–283,310–314`.
- Quiet seats, loan kit, shared panel, and food: `godot/quiet_seats.gd:163–180`; `godot/loan_homecoming.gd:157`; `godot/shared_panel.gd:319–323`; `godot/shared_meal.gd:395–397`.
- Dogs, power fixtures, voting paper, lantern participants, and rhythm participants: `godot/dog_story.gd:390–395`; `godot/power_story.gd:591–596`; `godot/voting_story.gd:309`; `godot/lantern_procession.gd:380`; `godot/rhythm_circle.gd:537–549`.

**2. Introduce a small camera-mode abstraction**

Use the existing `Camera3D` initially so camera readers continue referring to the same object. Put two pose calculations behind one application point: the unchanged elevated calculation and a new street calculation.

Separate these concepts:

| Proposed state | Purpose |
|---|---|
| `walking_mode: ELEVATED / STREET` | The player’s selected walking presentation. Fresh/default behavior remains elevated. |
| `view_context: WALK / MAP_BLOCK / MAP_DISTRICT / INSPECTION / ACTIVITY` | Determines who currently owns the view. Opening a map does not erase the walking preference. |
| Elevated pose | Existing target, size, orbit yaw/pitch scale, and follow/manual state. |
| Street pose | Independent yaw, pitch, eye height, FOV, and clip planes. Position derives from the current player body. |
| Input context | Walking, free-pointer UI, focused activity, reading, or suspended input. |
| Capture state | Released, requested, confirmed, or failed/lost. Keep this separate from camera mode. |
| Return token | Owner, generation, prior context, both relevant poses, and focus-return information. |

Implement the adapter in this order:

1. **Centralize final camera application.** Initially route every request through the existing elevated calculation. Keep legacy fields as temporary compatibility accessors rather than rewriting the whole main script.
2. **Adapt all camera entry points.** Include Find Me, resume walking, follow, pan/orbit/zoom, overview, conversation, inspection, panel refits, Rhythm Circle, and story `walk_route` restoration. Their current dependencies are inventoried above.
3. **Guard camera ownership.** A delayed callback may apply only if its owner and generation are still current. Street mode must also reject elevated panel translations synchronously; pose equality alone is insufficient because the current comparison contains no mode. `main.gd:9205–9251`.
4. **Keep street orientation independent of avatar animation and route heading.** Movement rotates the visual today, and arrival rotates both participants. Those operations must not rotate the player’s eye automatically. `main.gd:8320–8322,8950–8965`.
5. **Restore presentation, not old physical position.** Returning from an activity recomputes the street eye at the player’s **current** body position with saved look angles. Never restore an old player position from a camera token.
6. **Persist preferences separately from progress.** The current settings envelope contains voices/reward-sound preferences and uses separate storage with failure handling. Extend that boundary with validated camera/comfort preferences; do not put transient owners, pointer capture, held touches, or modal state into saves. `main.gd:10674–10720`.

Keep the existing startup overview/story sequence. If “remember street view” is offered later, make it an explicit preference affecting return to walking; never restore Pointer Lock automatically. Missing/invalid settings should produce the current elevated default.

**3. Deliver the work in small, testable phases**

For future implementation, add focused test modules called by the existing suite. The suite already delegates to modules and enforces isolated save/settings paths before scene creation. Sources: `study_test.gd:5–18,52–67,3304–3328`; `scripts/run-godot.mjs:10–18`.

Run `npm run godot:test` during those implementation phases, **not during this read-only audit**. Headless checks establish state, geometry, and dispatch correctness; they cannot establish actual Pointer Lock, touch ergonomics, rendered readability, or comfort.

**Phase 0 — Adapter with no presentation change**

1. Introduce the state and return-token API.
2. Route existing camera requests through it.
3. Leave all elevated pose calculations and default controls intact.
4. Expose camera mode, owner, capture state, and return-token generation in diagnostic snapshots.

**Headless additions:** elevated snapshot round-trip; invalid/stale owner rejection; unchanged startup; deferred refit after a mode/context change; no story-progress mutation from camera operations.

**Exit:** existing elevated behavior remains unchanged under walking, manual pan/orbit, map, resize, conversation, and activity entry/exit. Preserve current detached-camera tests and delayed-refit regression: `study_test.gd:496–552,5097–5103`.

**Phase (a) — Opt-in street-level camera on one block**

1. Add a clearly labeled view toggle with keyboard and touch activation.
2. Start with a stationary, opt-in street preview at the existing opening location.
3. Compute perspective pose from the unscaled player body plus a configurable eye height.
4. Hide the local player visual/nameplate; restore solid buildings; bypass elevated cutaway and avatar-fitting logic.
5. Use an immediate change or short optional fade. Do not fly the camera from its elevated position through buildings.
6. Resolve resident visual scale here. A 1.70 m model scaled 2.15× appears approximately **3.655 m tall**; that is a source-derived presentation issue, not an eye-height adjustment problem. `main.gd:2605–2608`.
7. Until later phases are ready, unsupported inspections and scripted travel explicitly hand over to elevated mode. The preview must not accidentally expose fast street routes or broken horizon picking.

**Headless additions:** default remains elevated; toggle preserves player position/progress; finite perspective transform; repeated toggles restore elevated pose/materials/visuals; resize and queued refits cannot move the eye; map → Find Me returns to the selected walking mode.

**Exit:** stand, look, return, open map, return again, and resize without teleportation or camera ownership errors. Eye-height suitability, near-plane clipping, and resident scale require rendered inspection.

**Phase (b1) — Desktop look and street movement**

1. Add named actions for street look, turning, walking, interaction, and cursor release. Audit bindings before choosing defaults: `E`, `Q`, `F`, and many function keys already have gameplay uses. `main.gd:14938–14950,15003–15007,15045,14879–14888`.
2. Derive horizontal forward/right from street yaw; ignore pitch for walking.
3. Keep the existing clearance/substep solver. Add an explicit speed/input-magnitude parameter: current `walk_step()` normalizes its input, so passing an analog stick vector alone would discard magnitude. `main.gd:8320–8325`.
4. Give manual and automatic street travel a comfortable, bounded speed policy. Remove the corridor/web acceleration **for street presentation** before enabling those routes.
5. Preserve Stop and manual-cancellation semantics. `main.gd:13944–13960,8295–8316`.
6. Offer keyboard turning immediately, so street play remains possible without mouse capture.

For browser mouse look, treat `MOUSE_MODE_CAPTURED` as a request:

- Godot’s web backend maps captured mode to canvas Pointer Lock; the JavaScript helper calls `requestPointerLock()`, and actual lock state comes from `document.pointerLockElement`. Confined mouse modes are unsupported in the inspected backend. Sources: [Godot 4.7.2 web display backend](https://github.com/godotengine/godot/blob/4.7.2-stable/platform/web/display_server_web.cpp), [cursor implementation](https://github.com/godotengine/godot/blob/4.7.2-stable/platform/web/js/libs/library_godot_display.js).
- Request capture synchronously during a real pressed input callback. A `_ready()` call, polling in `_process()`, or a deferred request is not a reliable substitute for browser user activation. [Godot web-export documentation](https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_web.html#full-screen-and-mouse-capture).
- Use `InputEventMouseMotion.screen_relative` for mouse look, with sensitivity in radians/degrees per pixel. Do not multiply a mouse displacement by frame delta. Godot documents that `relative` is content-scale dependent, while `screen_relative` avoids that sensitivity change. [Mouse-motion documentation](https://docs.godotengine.org/en/stable/classes/class_inputeventmousemotion.html).
- Observe confirmed lock, loss, and errors. Escape, browser focus changes, missing support, denied activation, and sandboxed embedding must lead to a usable free-pointer state. Sandboxed iframes require `allow-pointer-lock`; browser success/failure is observable through Pointer Lock events. [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).
- Release capture before menus, reading, maps, or focused activities. Require a fresh deliberate action to resume it. Consume the capture gesture so it cannot also activate the object beneath the crosshair.
- Keep unlocked drag-to-look and keyboard turning available when capture fails. Show and announce a short recovery instruction rather than repeatedly requesting capture.

**Headless additions:** yaw-relative cardinal movement; pitch-independent walking; diagonal speed normalization; bounded route distance per second; first and subsequent story legs; denied/lost capture state; UI priority before movement polling; no movement from stale held input; no camera roll or animation-derived bob.

**Browser exit:** real capture/release/re-entry, Escape, tab switching, menu opening, denied capture, and reload tested in Chromium, Firefox, and supported Safari configurations. The existing browser harness imports Chromium, so it does not establish that wider coverage. `tests/godot-browser.mjs:106`.

**Phase (b2) — Touch stick and drag-to-look**

1. Add a left movement stick and a separate right-side look region, with a left-handed option.
2. Assign each contact an owner at touch-down: UI, stick, look, or map gesture.
3. Retain that ownership until release/cancel; crossing a panel boundary must not transfer the gesture.
4. Add deadzone and analog magnitude to the stick. Treat look movement as displacement; apply delta only to continuous rate controls.
5. Suppress emulated mouse events for contacts owned by street controls.
6. A look release must never become click-to-walk. Two-finger street input must never also start map pinch.
7. Clear contacts on focus loss, activity entry, orientation changes, and cancellation.

**Headless additions:** either finger released first; third contact; UI-start refusal; contact crossing regions; touch cancellation; mouse emulation suppression; stick release stops movement; look release triggers no route; repeated Walk/Stop activation preserves its existing guard.

**Exit:** simultaneous walking and looking works on physical phones/tablets in portrait and landscape. Existing touch/pinch regressions remain intact: `study_test.gd:6245–6342`. Emulated touch alone is insufficient evidence of ergonomic success.

**Phase (c) — Gaze/crosshair interaction alongside click and keyboard**

1. Introduce interaction records with stable IDs, world anchors/shapes, action labels, availability, and range.
2. Resolve a candidate separately from executing its action.
3. For gaze, cast through the **actual crosshair screen coordinate**. Do not assume the center of `play_area_rect()` equals the optical center.
4. Query explicit interaction shapes and world blockers. If targets use `Area3D`, explicitly enable area queries and define masks; exclude the player. Reject a target when a nearer blocker wins.
5. Dispatch the chosen action through existing gameplay methods so progression logic is shared.
6. Preserve free-pointer clicking, named nearby-target selection, and existing route/Stop controls.
7. For street ground destinations, require a finite positive intersection, a bounded distance, an unobstructed segment, and existing walkability admission. Sky and horizon clicks produce no destination.

This replaces the elevated handler’s ground-distance/pixel-distance heuristics only where needed; it does not require a navigation rewrite. Current picking and route admission are at `main.gd:14401–14532,8792–8837`.

**Headless additions:** wall blocks resident; nearest valid target wins; behind-camera target rejected; sky/horizontal/upward ray rejected; unavailable/out-of-range action rejected; UI consumes activation; click/gaze/keyboard produce the same gameplay action once; no duplicate activation after capture.

**Exit:** complete a short neighbor → mural → speaker interaction loop using gaze, free-pointer click, and keyboard-only controls.

**Phase (d) — Re-place UI for eye level**

1. Prefer a Canvas conversation/subtitle panel for first-person dialogue. Optional world bubbles should anchor near the actual presented head height.
2. Reserve the crosshair, movement stick, look controls, and focused dialogue area in layout.
3. Keep the existing reward banner, queue, and text fallback; substitute street exclusion regions for the invisible avatar.
4. Show focused/nearby captions selectively. Use a world-visibility test for physical targets; keep distant objective navigation explicitly separate from visible-world labels.
5. Convert the objective marker to a restrained street cue, with a bearing/distance indicator for hidden or behind-player destinations.
6. Keep labels readable without requiring tiny gaze targets. Preserve full text through the established fallback and announcement path. `main.gd:4783–4791,4824–4840`.
7. Make all projection diagnostics reject behind-camera/invalid geometry before forming screen rectangles.

**Headless additions:** finite projection at near-plane boundaries; hidden/behind targets; crosshair and touch-region exclusion; long dialogue; queued rewards survive suppression; narrow/landscape layouts; no accidental activation through a banner or dialogue panel.

**Exit:** rendered UI remains readable at desktop, narrow portrait, and short landscape sizes. Extend the existing overlay oracle rather than weakening it: `study_test.gd:3794–3826`.

**Phase (e) — Conversation facing and spacing**

This is refinement of existing behavior: engaged/nearby residents already turn toward the player, and arrival faces both visuals toward one another. `main.gd:3585–3597,8950–8965`.

1. Preserve resident facing, but decouple it from player camera orientation.
2. Define conversation spacing using chosen street visual scale and walkable clearance.
3. Avoid forced player yaw or pitch. Offer an explicit “Face speaker” action if useful.
4. Keep orientation stable near zero separation and when the speaker changes.
5. Evaluate procedural faces and gestures at eye level before adding animation complexity.

**Headless additions:** residents face a player on each side; zero-distance guard; bounded turn behavior; no player-camera rotation on arrival; no placement inside a wall; ending conversation restores normal behavior.

**Exit:** eye contact and spacing are readable in the one-block prototype without camera steering. Close-up face quality remains **unverified** until rendered review.

**Phase (f) — Activity camera handover**

Use three policies:

| Activity type | Initial policy | Source basis |
|---|---|---|
| Full-screen reading/composition activities | Preserve their 2D UI, release capture, suspend street movement/look, retain a return token. | Focused-owner inventory: `main.gd:12117–12118`. Representative full-screen construction: `godot/habitat_room.gd:105–106`; `godot/helper_bench.gd:33–36`; `godot/shared_meal.gd:40–45`; `godot/film_screening.gd:25–30`; `godot/civic_listening.gd:37–42`; `godot/programme_studio.gd:40–45`; `godot/shared_panel.gd:28–33`. |
| Existing 2D activities with view-preservation behavior | Keep their existing focus/UI handoff, extending the token with street state. | Before These Streets: `godot/before_streets.gd:85–118`. Mural workshop: `main.gd:12196–12247`. |
| Explicit world inspections | Keep elevated initially: maps, Rhythm’s View Circle, mural/speaker/block inspection, and remote landmark inspection. Clearly offer Return to Street. | `godot/rhythm_circle.gd:434–463`; `main.gd:9169–9267,15195–15314`; inspection inventory above. |

Gather Again and Orbital Commons should retain their own interfaces initially. Gather Again is a full-screen `Control`; Orbital Commons has separate 2D player/path state. They are not another street `Camera3D` to convert. `godot/programme_gathering.gd:40–54`; `godot/orbital_commons.gd:22–25,46–74`.

For every owner: acquire token → neutralize held input → release capture → show activity → restore valid prior context/focus → offer deliberate capture re-entry.

Preserve Rhythm’s existing rule that deliberate manual inspection can retain ownership in elevated mode. That rule is already tested. For entry from street mode, make Back/Return behavior explicit rather than inheriting accidental array-restoration behavior. `study_test.gd:4147–4163`.

**Headless additions:** every focused activity entered from each walking mode; nested activity/back; resize while open; map interruption; late callback after close; manual inspection; route progression while an elevated inspection is open; correct current-body eye position on return; no automatic recapture.

**Exit:** every activity is reachable and escapable from street play, either in street presentation or through a deliberate elevated/2D handover.

**Phase (g) — Eye-level art and performance**

1. **Inspect existing geometry first.** The code already generates storefronts, awnings, bays, fire escapes, and cornices. Close-up quality has not been verified here. `main.gd:1815–1891`.
2. **Separate visual defects from collision defects.** Decorative projections extend beyond the wall faces used for physical collision. Test storefront edges and awnings before adding small blockers or changing clearance. `main.gd:1795–1800,1828–1836,1871–1882,1904–1909`.
3. **Keep geographic claims bounded.** The data describes approximate local metres, flat presentation ground, and median building heights rather than detailed roofs. Street-level appearance must not silently imply surveyed entrances, interiors, or exact contemporary façades. `godot/data/buildings.json:1`.
4. **Add close detail economically.** Favor original procedural geometry, shared materials, and small reusable assets. Keep measured footprints and stable IDs intact.
5. **Introduce distance policy only after profiling.** Consider separate near-detail meshes and coarse distant shells, with hysteresis. Because current building geometry is generated and committed at runtime, automatic imported-mesh LOD should not be assumed to cover it. `main.gd:1899–1903`; [Godot mesh LOD documentation](https://docs.godotengine.org/en/4.7/tutorials/3d/mesh_lod.html).
6. **Use supported fog deliberately.** Depth/height fog is supported in Compatibility; volumetric fog is not. Fog can soften distant transitions but does not itself remove geometry or animation cost. [Renderer feature table](https://docs.godotengine.org/en/4.7/tutorials/rendering/renderers.html). Visibility ranges can suppress distant detail; start with hysteresis rather than transparent fades. [Visibility ranges](https://docs.godotengine.org/en/4.7/tutorials/3d/visibility_ranges.html).
7. **Profile CPU as well as GPU.** Trees use three MultiMeshes, but sway updates canopy transforms per tree. The existing local performance check measures pathfinding, save work, and voice teardown—not rendering FPS. `main.gd:5017–5081,11611–11668`.
8. **Keep collision and navigation alive when detail is hidden.** Treat draw distance as presentation state.
9. **Enforce the actual byte budget.** The inspected pack is **1,472,548 bytes**, leaving **624,604 bytes to the 2 MiB boundary**. Its generated configuration records that size at `artifacts/godot-web/index.html:114`. The existing gate permits equality; change the future gate to strict `< 2,097,152` for the requested “under” requirement. `tests/godot-browser.mjs:101–104`.

The export includes all resources and excludes tests/source data, so measure actual exported growth after each authorized implementation phase. `godot/export_presets.cfg:5–8`. Reserve headroom rather than spending the entire remaining allowance on art.

**Headless additions:** valid FOV/clip ranges; distance-threshold hysteresis; unchanged collision when detail disappears; stable building IDs/coordinates; restored elevated visibility; frozen decorative animation under reduced motion.

**Exit:** creator-approved browser frame-time and memory budgets on actual target devices, acceptable close-up traversal, no elevated regression, and a fresh pack strictly below 2 MiB. No current first-person performance result is established by this audit.

**4. Comfort and accessibility requirements**

Treat these as acceptance criteria throughout the phases:

- **Field of view:** begin with a configurable value, for example 70° vertical in landscape, and test a useful adjustment range. Label the axis; Godot’s FOV interpretation depends on `keep_aspect`. Test portrait separately rather than assuming the same number provides an acceptable horizontal view. [Camera3D documentation](https://docs.godotengine.org/en/4.7/classes/class_camera3d.html).
- **Turning:** offer smooth mouse look plus keyboard/touch snap turning, with selectable increments such as 30° or 45°. Continuous keyboard turning should use a bounded angular rate. Clamp pitch and keep roll zero.
- **No head bob:** never attach the eye to animated visual parts. Do not add walk bob, camera shake, automatic leaning, or speed-dependent FOV.
- **Travel comfort:** offer ordinary-speed street routes with a clear Stop action. Faster travel should use an explicit elevated transfer or an optional fade/skip policy, not silently accelerate the eye camera.
- **Reduced motion:** implement an actual Godot preference, initially informed by browser `prefers-reduced-motion` with a saved override. Suppress camera travel transitions and decorative bob/spin/sway while preserving semantic progress. Existing Godot support is **unverified**; the inspected settings serialize only voices/reward sounds, while bubbles and markers visibly have animation code. `main.gd:10685–10720,4810–4812,6270–6273`.
- **Keyboard-only play:** provide look/turn, move, target cycling, interact, map, Stop, and return-view actions without Pointer Lock. Keep UI focus visible and prevent movement beneath focused menus/readers.
- **Touch accessibility:** adjustable sensitivity, handedness, usable target sizes, and alternatives to simultaneous two-finger operation.
- **Screen-reader announcements:** reuse the existing polite/atomic live region and sequence-based announcement API. Announce mode changes, capture loss, available interaction, route start/stop, and activity return. Avoid continuous yaw/distance narration. Existing implementation: `main.gd:11465–11507,12002–12025`.
- **Persistent dialogue:** gaze movement or looking away must not remove the only readable copy of dialogue.

Headless tests should verify announcements and focus state. Actual keyboard workflows and screen-reader output require browser/manual QA; DOM updates alone do not prove usable spoken interaction.

**5. Retire the highest risks on one block**

Use the opening location, nearby residents, mural, and speaker as the first vertical slice. Their positions already exist in the source. `main.gd:21–27,2598–2608`.

Prototype this sequence before broad art work:

1. Stand still and toggle between views.
2. Look toward a resident, a nearby wall, and the horizon.
3. Walk along the wall, around a corner, and beneath an awning.
4. Speak to the resident using keyboard and gaze.
5. Open a full-screen activity and return.
6. Open both map views and use Find Me.
7. Start a short route, stop it, lose browser focus, and resume deliberately.
8. Repeat in narrow portrait and short landscape layouts.

| Risk | Earliest retirement evidence |
|---|---|
| Residents appear oversized; props/anchors no longer align | Phase (a): side-by-side rendered scale comparison, then one shared presentation-height policy. |
| Camera enters façade projections | Phase (a)/(g): wall/awning traversal and near-plane inspection; targeted clearance/blocker decisions. |
| Routes become uncomfortable at eye level | Phase (b): bounded mode-specific speed tests plus real traversal; include western routes and subsequent story legs. |
| Panels or callbacks overwrite the street eye | Phase 0/(a): ownership-generation tests, including pending two-frame refits. |
| Horizon clicks route behind the player | Phase (c): positive/finite/bounded ground-hit tests. |
| Gaze interacts through walls | Phase (c): target/blocker query fixtures using actual query geometry. |
| Look gestures trigger walking or menu actions | Phase (b): contact ownership, emulation, release, and repeated-press tests. |
| Pointer Lock fails or is lost | Phase (b): real-browser denial/loss/recovery checks with usable keyboard/unlocked fallback. |
| UI is technically present but unreadable | Phase (d): rendered layout inspection plus keyboard and screen-reader walkthrough. |
| Art exceeds pack or rendering budget | Phase (g): exported-byte tracking and target-device profiling before expanding beyond the block. |

The creator should decide these points after the first prototype:

- **Resident presentation:** true-scale street visuals versus intentionally oversized residents. My recommendation is true-scale street presentation while preserving elevated visuals.
- **Street travel:** normal-speed routes versus explicit elevated fast travel. My recommendation is normal-speed street movement with an optional elevated transfer for long trips.
- **Conversation:** remain at the player’s chosen eye orientation versus automatic framing. My recommendation is no forced camera rotation.
- **Inspection:** which remote subjects warrant an elevated view. Initially retain all existing explicit world inspections.
- **Art promise:** stylized, geographically grounded streets versus a surveyed architectural reconstruction. The latter requires additional evidence and content work.
- **Release scope and devices:** one-block preview versus whole-district availability, and the minimum browser/phone performance target.
- **Preference persistence:** always begin elevated, or offer an explicit remembered walking preference while retaining the current startup sequence.

**6. What this prepares for a later WebXR version**

The proposed work creates reusable foundations:

- Body-space locomotion separated from camera/head orientation.
- A clear metric scale and presentation-height policy.
- Interaction actions independent of mouse coordinates.
- Explicit camera/input ownership and reliable return transitions.
- Comfort preferences and low-motion travel options.
- UI content that can be presented through different renderers.
- Measured browser performance and asset budgets.

A later XR adapter could supply its view through an `XROrigin3D`/`XRCamera3D` arrangement and feed controller or gaze rays into the same interaction resolver. Preserve those seams now; do not make the street camera controller depend on raw mouse events throughout gameplay.

WebXR still requires separate work:

- Capability detection and explicit user-initiated session entry.
- Asynchronous supported/started/failed/ended handling.
- Reference-space selection, recentering, seated/standing height, and room-scale collision policy.
- Controller input and optional teleportation.
- Stereo-safe world UI, readable panel distance, and controller focus.
- Per-eye rendering budgets and actual headset tests.
- Returning to the prior non-XR view when the session ends.

Godot exposes those asynchronous lifecycle signals through `WebXRInterface`; session failure is distinct from successfully starting XR. [Godot WebXRInterface documentation](https://docs.godotengine.org/en/4.7/classes/class_webxrinterface.html). Browser XR session requests also depend on secure context and browser/device support. [XR session API](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession).

**WebXR readiness remains unverified.** Completing first person would provide reusable locomotion, interaction, and ownership boundaries; it would not establish headset support, stereo UI suitability, or XR comfort.

