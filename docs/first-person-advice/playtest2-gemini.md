Measured `index.pck` SHA-256: `b8ca13f1589cee21eaa727be3ff75596eba2df6e03b8baddf348bca0da75063a` (1,503,448 bytes)

# Tenderloin Redux — Phase 2 Street View Playtest Report

## 1. Build

- **Measured `http://127.0.0.1:4194/index.pck` SHA-256:** `b8ca13f1589cee21eaa727be3ff75596eba2df6e03b8baddf348bca0da75063a` (1,503,448 bytes; commit `8285794`).
- **`window.__tenderloinGodotA11ySnapshot.street_view` keys:** `active`, `button`, `capture`, `capture_requests`, `contacts`, `enabled`, `eye`, `fov`, `keep_aspect`, `mouselook`, `mouselook_button`, `pitch_deg`, `projection`, `reduced_motion`, `stick`, `taps_routed`, `turn`, `yaw_deg`.

## 2. Summary

Phase 2 makes Turk Street genuinely pleasant to explore at eye level: drag-look and right-drag turn smoothly without misfiring taps, 30° keyboard snap-turns and ±60° pitch feel crisp, and the portrait touch Walk stick pairs naturally with a second-finger look drag. Conversations, street signs, depth occlusion, and the one-time hand-back west of Taylor Street (`x < -50`) work cleanly across desktop and portrait phones while leaving standard map view intact. The single most important problem is phone viewport rotation (`390×667` to `667×390`): rotating to landscape hides the Walk stick, drops an active walk without resuming on return to portrait, and leaves touchscreens in `667×390` landscape with no free-walk control.

## 3. Known bugs rechecked

1. **Holding W into western limit flips views and omits reason:** **fixed** — crossing `x < -50` (`x: -50.06`, `kb1-crossed-minus50.png`) hands back once (`active: false, enabled: false, projection: 1`), announces `"Map view. Street view is only on the opening block for now. Walk back east of Taylor Street and press Shift+F to use it again."`, and stays in map view while `W` stays held (`x: -49.31`).
2. **Tapping Bea's face up close walks past her:** **fixed** — tapping Bea up close (`x: 19.73..20.22`) across all three sizes opens her chat immediately (`taps_routed: 1, path_active: false, conversation_detail.panel.visible: true`, `phone390-bea-conv-clean.png`).
3. **Objective behind points ahead instead of low/down:** **fixed** — facing west (`yaw_deg: 99.14`) places `overlays.guide_label` low at `{ x: 517, y: 552, width: 66, height: 22, visible: true }` with a downward arrow (`desktop-kb3-objective-behind.png`).
4. **At 390×667 Map view button covers guide arrow:** **fixed** — across 360° turns at `390×667` and `320×667`, `guide_label.y` drops from `168` to `213` below `street_view.button` (`{ x: 250, y: 114, width: 132, height: 44 }`, `phone390-kb4-upper-right-0.png`).
5. **On a phone, dragging cannot turn the view:** **fixed** — single-finger drags turn `yaw_deg` 360° and tilt `pitch_deg` to `±60°` (`taps_routed: 0`), while `stick` (`{ x: 8, y: 477, width: 120, height: 120, visible: true }`) and two-finger walk+look (`contacts: ["move", "look"]`) work smoothly (`phone390-street-initial.png`).
6. **Shift+F on opening card / chat / block hub (G):** **still happens** (chat part) — `Shift+F` on the opening card starts music (`music_playing: true, street_view.active: true`) and closes a map-view Block Hub (`block_panel_control.visible: false`), **but** `Shift+F` during chat still drops chat without a goodbye (`conversation_detail.panel.visible: false, street_view.active: true`, announcing `"Street view. Facing ..."`), and `G` inside street view opens the hub over street view (`desktop-streetview-then-G.png`).
7. **Gold diamond draws through Portable Mural board:** **fixed** — facing Rook from west of the board (`eye: { x: 73.52, y: 1.6, z: -19.13 }, yaw_deg: -93.14`) with `guide_marker_screen` (`{ visible: true, x: 577.3, y: 296.0 }`) inside `mural_scenes_world.corners` (`x: 550.0..818.6, y: 75.9..714.9`), the board completely occludes the diamond (`kb7-rook-behind-mural-board.png`).

## 4. New bugs

### Bug 1: Rotating phone `390×667` to `667×390` hides Walk stick, aborts active walking, and leaves landscape touch without a Walk stick
- **Severity:** major
- **Size:** `390×667` rotated to `667×390` and back to `390×667` (`hasTouch: true`)
- **Steps from fresh load:**
  1. Load `http://127.0.0.1:4194/` at `390×667` (`hasTouch: true`, `isMobile: true`).
  2. Tap `Start Exploring`, tap `Street view`, and drag to face west (`yaw_deg ≈ 99°`).
  3. Hold `Walk stick` at `(68, 537)` and drag to `(68, 487)` (`contacts: ["move"]`, `x` advancing).
  4. Keep finger held, resize to `667×390` for 500 ms (or move finger 2 px), then resize back to `390×667`.
- **Expected:** Walk continues across `390×667 -> 667×390 -> 390×667`, and `667×390` touch landscape keeps a usable Walk stick.
- **Actual:** At `667×390`, `phone_disclosure.enabled` becomes `false` and the desktop bar shrinks `play_area.height` to `140`, setting `stick.visible: false` and `contacts: []`. Movement stops (`x` freezes at `13.16` / `19.29`), slight finger motion rotates `yaw_deg` instead of walking, and rotating back to `390×667` restores `stick.visible: true` while `contacts` stays `[]` and walking stays halted until re-pressing. Fresh `667×390` touch loads also keep `stick.visible: false`.
- **Snapshot values:** `street_view: { active: true, enabled: true, projection: 0, keep_aspect: 1, capture: "released", contacts: [], stick: { name: "Walk stick", visible: false, x: 8, y: 138, width: 120, height: 120 } }`; `announcement: "Facing west. On Turk Street, near Taylor Street."`
- **Screenshot:** `phone-667x390-landscape-stick-held.png` (`bug-phone-667x390-no-stick.png`)
- **Reproduced twice in fresh profiles:** Yes (3 profiles).

### Bug 2: System `prefers-reduced-motion: reduce` setting is ignored (`system: false`, `on: false`)
- **Severity:** major
- **Size:** `1100×760` (all sizes)
- **Steps from fresh load:**
  1. Launch a fresh profile with `prefers-reduced-motion: reduce` (`matchMedia` `true`) and load `http://127.0.0.1:4194/`.
  2. Press `Enter`, press `Shift+F`, and click `Info` (`x: 1036, y: 16`).
  3. Read `Reduced motion`, watch trees and marker, and click `Reduced motion` three times (`On -> Off -> System`).
- **Expected:** Initial load and `System` mode set `system: true` and `on: true` (`"Reduced motion: System (on)"`), halting tree sway and marker bobbing automatically.
- **Actual:** `system` and `on` stay `false` (`"Reduced motion: System (off)"`), trees and marker animate until manually set `On`, and cycling to `System` announces `"Reduced motion follows the system setting: off."`
- **Snapshot values:** `street_view.reduced_motion: { on: false, saved: false, system: false, visible: true, text: "Reduced motion: System (off)", toggle: { height: 44, visible: true, width: 111, x: 969, y: 142 } }`; `announcement: "Reduced motion follows the system setting: off."`
- **Screenshot:** `bug-or-check-reduced-motion-system-reduce.png`
- **Reproduced twice in fresh profiles:** Yes.

### Bug 3: Holding right mouse button while left-clicking street with Mouse look on still locks pointer
- **Severity:** minor
- **Size:** `1100×760`
- **Steps from fresh load:**
  1. Load `http://127.0.0.1:4194/` at `1100×760`, press `Enter`, and press `Shift+F`.
  2. Click `Mouse look: off` (`x: 960, y: 170`) so `mouselook: true` and `capture: "released"`.
  3. Hold right mouse button at `(550, 380)`, left-click while right stays held, release right button, and move mouse unpressed.
- **Expected:** Pointer stays free, `capture` stays `"released"`, and plain mouse movement does not turn the view.
- **Actual:** Left-clicking acquires pointer lock (`pointerLockElement === canvas`, `capture: "locked"`, `capture_requests: 1`) despite the held right button, and plain mouse motion turns the view.
- **Snapshot values:** `street_view: { active: true, projection: 0, yaw_deg: -80.86, pitch_deg: 0, mouselook: true, capture: "locked", capture_requests: 1, contacts: [] }`; `announcement: "Esc releases the mouse."`
- **Screenshot:** `desktop-mouselook-after-click.png`
- **Reproduced twice in fresh profiles:** Yes.

### Bug 4: Locked Mouse look button truncates mid-word as `"Esc releases mou"`
- **Severity:** polish
- **Size:** `1100×760`
- **Steps from fresh load:**
  1. Load `http://127.0.0.1:4194/` at `1100×760`, press `Enter`, and press `Shift+F`.
  2. Click `Mouse look: off` (`x: 960, y: 170`), then left-click `(550, 380)` to lock pointer.
- **Expected:** Button renders `"Esc releases mouse"` without horizontal clipping.
- **Actual:** Inside `{ x: 960, y: 170, width: 132, height: 44 }`, the single-line label clips mid-word as `"Esc releases mou"`.
- **Snapshot values:** `street_view: { active: true, mouselook: true, capture: "locked", mouselook_button: { height: 44, width: 132, x: 960, y: 170, pressed: true, text: "Esc releases mouse", visible: true } }`; `announcement: "Esc releases the mouse."`
- **Screenshot:** `desktop-mouselook-after-click.png` (`bug-mouselook-clip-repro2.png`)
- **Reproduced twice in fresh profiles:** Yes.

## 5. Readability and feel

- **Desktop `1100×760`:** `turn: "snap30"`, `fov: 70`, `keep_aspect: 1` (`desktop-street-initial.png`). Drag-look, right-drag, `Shift+Left/Right`, held `Shift+Up/Down` (`±60°`, `desktop-tilt-up-max.png`, `desktop-tilt-down-min.png`), and `WASD`/arrows feel responsive; curbs and walls block cleanly. Pointer lock releases on `Esc`, `T`, `L`, and tab switch. Manual `Reduced motion: On` halts tree sway (`0` vs `34 KB` diffs) and marker bobbing (`0` vs `7.74 px`) and persists on reload. Map-only play (`maponly-desktop-rotated.png`, `maponly-desktop-bea.png`) felt unchanged.
- **Phone `390×667`:** `turn: "snap30"`, `fov: 70`, `keep_aspect: 0` (`phone390-street-initial.png`), keeping wide framing without feeling zoomed in. `Mouse look` is hidden (`visible: false`). Drag-look, `Walk stick`, two-finger walk+look, keys beating stick, `Explore` (`Walk stick` shifts to `y: 311`, `phone390-explore-tray.png`), and `Map -> Find Me` returning to street view feel natural. Map-only play (`maponly-phone390-bea.png`) worked smoothly.
- **Phone `320×667`:** `turn: "snap30"`, `fov: 70`, `keep_aspect: 0` (`phone320-street-initial.png`). `Opening` (`phone320-opening.png`), `Info` + `Reduced motion` (`phone320-info-open.png`, `phone320-info-rm-on.png`), `Explore` (`phone320-explore-tray.png`), `Block Actions` (`phone320-block-hub.png`), and chats (`phone320-bea-conv-clean.png`) stay legible without overlap. Only `667×390` feels cramped (`play_area.height: 140`, no stick).

## 6. Accessibility findings

- **Announcements:** Clear and accurate across entry/exit, headings, silent tilt, map-only zoom notices, `Mouse look` lock/release, `Reduced motion`, greetings/goodbyes, and `x < -50` hand-back.
- **44 px targets & bounds:** Every visible control across `1100×760`, `390×667`, `667×390`, and `320×667` met `>= 44×44 px` inside screen bounds, including `Street/Map view` (`132×44`), `Mouse look` (`132×44`), `Walk stick` (`120×120`), `Reduced motion` (`111×44`), `Info` (`44×44`), `Explore` (`>= 138×50`), and `Block Actions` (`>= 90×44`).
- **Keyboard-only desktop:** Steps 1, 2, 6, and 7 work without a mouse (`Enter`, `Shift+F`, `Shift+Arrows`, `WASD`/arrows, `T`, `Esc`, `G`, `L`, and `F` returning from Map to street view). Header buttons (`Info`, `Reduced motion`, `Music`, `Sounds`) lack keyboard focus/shortcuts, and `prefers-reduced-motion: reduce` is ignored (Bug 2).

## 7. Storage and console

- **`localStorage` keys per profile:**
  - Desktop `1100×760`: `tenderloin-redux.godot.save.v1`, `tenderloin-redux.godot.settings.v1`
  - Phone `390×667`: `tenderloin-redux.godot.save.v1` (`tenderloin-redux.godot.settings.v1` when settings change)
  - Phone `320×667`: `tenderloin-redux.godot.settings.v1` (`tenderloin-redux.godot.save.v1` once a neighbor is met)
  - Map-view-only `1100×760` and `390×667`: `tenderloin-redux.godot.save.v1`
  - Blocker keys `tenderloin-redux.save.v1` and `tenderloin-redux.settings.v1`: **never written**.
- **Console errors and warnings (verbatim, deduplicated):**
  - Console/page errors: **none** (`0`).
  - Console warnings:
    - `WebGL: INVALID_OPERATION: bindBuffer: element array buffers can not be bound to a different target`
    - `WebGL: INVALID_OPERATION: bufferSubData: no buffer`

## 8. What you could not test

- **Pointer-lock refusal (`capture: "denied"`):** Headed Chrome granted pointer lock natively; forcing refusal would require policy overrides or page injection.
- **Non-default `turn` and `fov` options:** Confirmed defaults (`"snap30"`, `70`); menu controls are not exposed yet.
- **Physical multi-touch glass and live OS screen-reader audio:** Verified via CDP touch dispatch and `#godot-a11y-status` (`aria-live="polite"`).

PLAYTEST-COMPLETE 4/4
