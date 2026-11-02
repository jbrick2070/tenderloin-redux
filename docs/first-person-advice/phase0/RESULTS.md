# Phase 0 spike results

Measured on November 2, 2026. The spike is the throwaway autoload `godot/spikes/fp_spike.gd` on branch `fp-spike-phase0` (commit 3cc9b96, pushed, never to be merged); a copy sits in `harness/` next to the three Playwright scripts that produced the JSON reports in this folder. It is inert unless the page URL carries `?spike=look|lock|walk|xr`. It adds its own perspective camera (eye 1.6 m, FOV 70°, far 250 m) over the unchanged measured block, a `ProceduralSkyMaterial` sky, depth fog, drag or Pointer Lock look, WASD and touch movement, per-second frame statistics and an "Enter VR" button, and publishes everything to `window.__spike`.

Build: Godot 4.7.2 web export, no threads, Compatibility renderer, exported from a clean worktree of 51ce662 plus the spike. The pck grew from 1,472,548 to 1,489,888 bytes (+17 KB for the spike script); the engine files are unchanged. Machine: the creator's Windows 11 desktop; Chrome 156.0.8078.79 through Playwright (`channel: 'chrome'`), headless and headed. Firefox and Safari are not installed on this machine and were not run.

## 0a. Pointer Lock and Esc

| Check | Headless Chrome 156 | Headed Chrome 156 (real window) | Claude desktop in-app browser pane |
|---|---|---|---|
| Lock from a real mouse press (`Input.mouse_mode = CAPTURED` inside `_input`) | Locked; Godot reports `mouse_mode` 2 within 3 ms | Locked; 3–6 ms | `pointerlockerror` every time, about 250 ms after the request; never locked |
| `screen_relative` look while locked | Yaw moved (0 → −24°) | Yaw moved (0 → −34°) | n/a |
| Does the Esc that releases the lock reach Godot as `KEY_ESCAPE`? | Yes. Godot saw the press while `mouse_mode` was still 2; the DOM `keydown` was not `defaultPrevented`; the browser's own release followed about 15 ms later | Same: Godot press at t=16914, browser unlock 14 ms later | n/a |
| Re-lock allowed after an Esc exit | A click 0.6 s later locked again | A click 0.5 s later locked again; no 1.25 s cooldown observed | n/a |
| Tab switch while locked | not run | The browser released the lock; `Input.mouse_mode` went to 0 on its own; coming back did not re-lock; a click re-locked | n/a |
| Godot-side release (`mouse_mode = VISIBLE`) | — | DOM unlocked within 20 ms | n/a |
| Page-side `document.exitPointerLock()` | — | Godot reported 0 on the next frame | n/a |

Caveats: Esc was synthesized through the DevTools protocol in both Chrome runs, not pressed on a keyboard; one physical press in Chrome should confirm the delivery before Phase 2 relies on it. Firefox and Safari remain unmeasured. The pane result matters on its own: an embedded Chromium webview refused Pointer Lock outright, so some in-app browsers will never grant it.

**Decision:** drag-look is the base control; mouselook stays opt-in, exactly as the plan has it. `Input.mouse_mode` does track a browser-side release, so Phase 2 can poll it instead of listening to DOM events, and the "release on focus loss" rule is confirmed necessary rather than optional.

## 0b. Perspective, sky and fog in Compatibility

- `ProceduralSkyMaterial` as `BG_SKY` and `FOG_MODE_DEPTH` both render in the 4.7.2 Compatibility web build. Screenshots: `0b-turk-fog-on.png` and `0b-turk-fog-off.png` (west down Turk from the start), `0b-taylor-south.png` (south down Taylor to the Turk & Taylor sign), `0b-taylor-north.png`, `0b-turk-road-ribbons.png` (pitched down at the road).
- No hard horizon edge: with `fog_depth_end` 235 m inside the 250 m far plane, the far cut is fully fogged and the street ends in sky.
- The fog's visible effect is modest at these distances because the streets are enclosed; it mainly lightens the far facades and tints the sky. Values used: begin 55 m, end 235 m, light colour `cfdada`, `fog_sky_affect` 0.35.
- Z-fighting on the ribbons: five frames of a still pose were diffed per pixel (`report-2-fog-flicker.json`). Looking down the Taylor roadway: 0.000–0.001 % of pixels changed. Looking down Turk: 0.03–0.44 %, spread evenly over the middle bands where Bea's idle animation and the tree sway are, not along the ribbons. Lifting `RouteRibbon` and `TurkProtectedBikeLane` by 2 cm changed nothing (0.03 %). No flicker is visible in any frame. No y lift or depth bias is needed on this hardware.
- Two things the screenshots show that Phase 1 already plans for: the `Label3D` street texts are unreadably small at eye height (the `screen_constant_scale` perspective branch), and Bea at scale 2.15 towers over the 1.6 m eye (neighbours at 1.0 in street view).
- Heading reference from `PLAYER_START`: yaw 0° (−Z) faces the storefront wall; 90° looks south down Taylor; 180° looks across Taylor; 270° looks west down Turk.

## 0c. Frame rate

Desktop reference only (headless Chrome, 1280×720, autopilot walking a 26 m square for 12 s): 60 fps, vsync-capped at 16.67 ms average and p95; 179–187 draw calls; 547–555 objects; about 550 k primitives; 82 MB video memory; `TIME_PROCESS` 7.7–8.1 ms per frame; physics 0.3 ms.

The risk is the CPU side, not the draw calls: about 8 ms of script `_process` per frame on a desktop (tree sway, people animation, labels, UI refresh) would be three to four times that on a mid-range phone, which is the whole 33 ms budget. The plan's cost list (tree sway rewrites every canopy transform per frame) is the first thing to measure on a phone.

**Pending (needs the creator's phones):** the spike build is served on the LAN at `http://192.168.26.146:4181/` while the desktop is on. `?spike=walk` walks the loop by itself and shows fps average, p95 and draw calls in the top-left line; `?spike=look` gives a left-half stick and right-half drag look. Read the line in portrait and landscape after about 20 s of walking.

## 0d. WebXR

`XRServer.find_interface("WebXR")` returns the interface in this export; `is_session_supported("immersive-vr")` answered **false** on this PC (no OpenXR runtime or headset); `navigator.xr` exists and localhost is a secure context. The "Enter VR" button (`?spike=xr`, or the V key) sets `session_mode`, reference spaces and features and calls `initialize()` from the press; `session_started` switches the viewport to the `XROrigin3D`/`XRCamera3D` at the eye position and `session_ended` returns to the spike camera.

**Pending (needs a headset and HTTPS):** either a one-off Pages deploy of the spike branch under its own path, which needs the creator's OK, or an HTTPS tunnel to port 4181.

## Harness

- `harness/spike-harness-1.mjs`: screenshots at eight headings, autopilot statistics, WebXR flags, headless Pointer Lock probe → `report-1-headless.json`.
- `harness/spike-harness-2.mjs`: fog on/off pairs and the five-frame pixel diffs (a small PNG decoder, no dependencies) → `report-2-fog-flicker.json`.
- `harness/spike-harness-3.mjs`: headed Chrome Pointer Lock, Esc, re-lock, tab switch → `report-3-headed-pointer-lock.json`.

Run from the spike worktree with `PLAYWRIGHT_MODULE` pointing at a Playwright install and `SPIKE_OUT` at an output folder, with the export served on 4180.
