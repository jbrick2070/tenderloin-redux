# Tenderloin Redux — Street View Playtest (`gemini`)

## 1. Summary

Stepping onto Turk Street at eye level gives Tenderloin Redux an inviting sense of place, with clear sidewalk sightlines, warm facades, and smooth handoffs to the overhead map for conversations and the district overview. Keyboard walking, street-tap routing, corner turns at Taylor Street, and conversation returns feel grounded and reliable on desktop. The single most important problem is that phone touch players (`390×667`) cannot turn or tilt the street-view camera—neither touch drags nor HUD buttons rotate the view—leaving touch-only players locked facing east while announcements cite keyboard shortcuts.

## 2. Bugs

### 1. Phone touch players cannot turn or tilt the street-view camera
- **Severity:** major | **Size:** Phone `390×667` (`hasTouch: true`) | **Reproduced twice:** Yes (2/2)
- **Steps:** Load a fresh `390×667` touch profile; tap `Start Exploring`; tap `Street view`; drag 1-finger horizontally/vertically, 2-finger swipe/twist on the street, and tap `Explore`.
- **Expected:** Touch gestures or HUD buttons turn/tilt the camera with touch instructions.
- **Actual:** `yaw_deg` and `pitch_deg` never change, neither HUD nor `Explore` has look controls, and `announcement` cites keyboard keys.
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=-80.86, pitch_deg=0, eye=(17.74,1.6,-9.33), button="Map view"(250,114,132×44,visible=true)`
- **`announcement`:** `"Street view. Facing east. On Turk Street, near Taylor Street. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view."`
- **Screenshot:** `repro-bug1-phone-no-touch-turn-r1.png`

### 2. Off-screen guide arrow points ahead (`▲`) when objective is 180° behind
- **Severity:** major | **Size:** Both `1100×760` and `390×667` | **Reproduced twice:** Yes (2/2)
- **Steps:** From a fresh load, activate `Start Exploring`, enter street view facing Bea 4 m east, and press `Shift+ArrowRight` 6 times (`180°`) to face west.
- **Expected:** The `Bea · 4 m` arrow moves to the bottom/side edge or points back toward Bea.
- **Actual:** `guide_marker_screen` projects behind the camera (`visible=false, y=997.6`), yet `guide_label` stays top-center (`(517,172)` desktop; `(162,168)` phone) pointing up (`▲`) away from Bea.
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=99.14, pitch_deg=0, eye=(17.74,1.6,-9.33), button="Map view"(960,118,132×44,visible=true)`
- **`announcement`:** `"Facing west."`
- **Screenshot:** `repro-bug2-desktop-guide-behind-r1.png`

### 3. Walking west past Taylor Street keeps street view active ~50 m onto 100 Block, then exits silently
- **Severity:** major | **Size:** Both `1100×760` and `390×667` | **Reproduced twice:** Yes (2/2)
- **Steps:** From a fresh load, activate `Start Exploring`, enter street view, press `Shift+ArrowLeft` 6 times to face west, and hold `W` (or tap west) across Taylor Street past `x = -50`.
- **Expected:** Crossing Taylor Street hands back to map view at the opening-block boundary and announces that street view is limited to the opening block.
- **Actual:** Street view stays active ~50 m onto `« TURK STREET (100 Block) »` (`repro-bug3a-desktop-100block-still-sv-r1.png`), then at `x = -50.02` snaps to map view, hides `street_view.button`, and announces only `"Map view."` (or keeps `"Walking to street point..."` when tap-routing).
- **`street_view`:** `active=false, enabled=true, projection=1, yaw_deg=99.14, pitch_deg=0, eye=(129.98,181,178.29), button="Map view"(960,118,132×44,visible=false)`
- **`announcement`:** `"Map view."`
- **Screenshot:** `repro-bug3b-desktop-handback-silent-r1.png`

### 4. Objective diamond and `"Talk to ... · T or tap"` float high in the sky out of frame at eye level
- **Severity:** major | **Size:** Both `1100×760` and `390×667` | **Reproduced twice:** Yes (2/2)
- **Steps:** From a fresh load, activate `Start Exploring`, enter street view at spawn (`pitch_deg=0`) 4 m from Bea, then press `Shift+ArrowUp` twice (`pitch_deg=30`).
- **Expected:** At `pitch_deg=0` near Bea, the gold diamond and talk prompt appear near head height in frame.
- **Actual:** Both sit off-screen at `pitch_deg=0` (`guide_marker_screen.y=-249.7`, `talk.visible=false`) and float at 4th-storey sky height at `+30°` pitch while cutting Bea off at bottom; `"Portable Mural (M)"` also floats high (`d-p2-07-right-drag-vert.png`).
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=-80.86, pitch_deg=30, eye=(17.74,1.6,-9.33), button="Map view"(250,114,132×44,visible=true)`
- **`announcement`:** `"Street view. Facing east. On Turk Street, near Taylor Street. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view."`
- **Screenshot:** `repro-bug4b-desktop-sky-prompt-r1.png`

### 5. `Shift+F` bypasses opening card (music off), activates behind Block Actions, and aborts chats
- **Severity:** minor | **Size:** Both `1100×760` and `390×667` | **Reproduced twice:** Yes (2/2)
- **Steps:** (A) Press `Shift+F` on the fresh opening card. (B) After `Start Exploring`, press `G` then `Shift+F`. (C) Talk to Bea (`T`), then press `Shift+F`.
- **Expected:** Modal panels and chats block `Shift+F` or transition cleanly with audio initialized.
- **Actual:** (A) Enters street view with `Music: Off` (`repro-bug5a-desktop-shiftf-opening-r1.png`). (B) Switches to street view underneath the open `active_panel="block"` modal. (C) Drops Bea's chat without saying goodbye (`d-edge-04-shiftf-during-conv.png`).
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=-80.86, pitch_deg=0, eye=(17.74,1.6,-9.33), button="Map view"(960,118,132×44,visible=true)`
- **`announcement`:** `"Street view. Facing east. On Turk Street, near Taylor Street. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view."`
- **Screenshot:** `repro-bug5b-desktop-shiftf-blockhub-r1.png`

### 6. Desktop auto-expanded Info box defers proximity dialogue and slices text horizontally
- **Severity:** minor | **Size:** Desktop `1100×760` | **Reproduced twice:** Yes (2/2)
- **Steps:** From a fresh `1100×760` load, click `Start Exploring`, click `Street view`, hold `W` `1.5 s` to reach Bea, and wait `3.8 s`.
- **Expected:** Proximity greetings appear promptly and fit inside the expanded Info header without clipping.
- **Actual:** Bea's greeting hides ~3.5 s behind the connection toast, then `Before These Streets` slices horizontally through `"On Turk Street, near Taylor Street"` inside the `45 px` Info box (`d-p2-02-east-seg1.png`).
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=-80.86, pitch_deg=0, eye=(25.48,1.6,-10.66), button="Map view"(960,209,132×44,visible=true)`
- **`announcement`:** `"Full dialogue in Info. Welcome to Turk & Taylor! Greet all 5 neighbors, add 3 mural motifs, and run Rook's soundcheck to open our block."`
- **Screenshot:** `repro-bug6-desktop-info-expanded-r1.png`

### 7. 3D street-name labels and objective diamond draw through solid walls and props
- **Severity:** minor | **Size:** Both `1100×760` and `390×667` | **Reproduced twice:** Yes (2/2)
- **Steps:** From a fresh load, activate `Start Exploring`, enter street view at spawn, and press `Shift+ArrowRight` 3 times on `1100×760` (4 times on `390×667`) to face south.
- **Expected:** Occluded labels and 3D markers behind solid geometry are hidden.
- **Actual:** `| TAYLOR STREET |` draws across the solid building wall opposite Turk Street, and the gold diamond draws through the solid Portable Mural board at `(74.28,-18.47)` (`d-p2-02-east-seg5.png`).
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=-170.86, pitch_deg=0, eye=(17.74,1.6,-9.33), button="Map view"(960,118,132×44,visible=true)`
- **`announcement`:** `"Facing south."`
- **Screenshot:** `repro-bug7-desktop-wall-label-r1.png`

### 8. `Shift+Up/Down` tilt updates no `announcement`, pitch persists across toggles, and zoom buttons are no-ops
- **Severity:** polish | **Size:** Both `1100×760` and `390×667` | **Reproduced twice:** Yes (2/2)
- **Steps:** From a fresh load, enter street view, press `Shift+ArrowUp` twice (`pitch_deg=30`), press `Shift+F` twice, and click/tap `Zoom In (+)` / `Zoom Out (−)`.
- **Expected:** Tilting announces pitch changes, re-entry resets/announces pitch, and map zoom buttons are disabled, hidden, or adjust FOV.
- **Actual:** `Shift+Up/Down` leaves `announcement` unchanged, non-zero pitch persists across toggles, and zoom buttons remain enabled no-ops (`d-edge-08b-zoom-in-sv.png`).
- **`street_view`:** `active=true, enabled=true, projection=0, yaw_deg=-80.86, pitch_deg=30, eye=(17.74,1.6,-9.33), button="Map view"(250,114,132×44,visible=true)`
- **`announcement`:** `"Street view. Facing east. On Turk Street, near Taylor Street. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view."`
- **Screenshot:** `repro-bug4-phone-sky-prompt-r1.png`

## 3. Readability and feel

- **Desktop (`1100×760`):** `Bea`, `Celeste`, `Turk & Taylor`, and `Compton's Cafeteria (1966)` (`d-sv-000.png`, `d-sv-180.png`) read crisply and open stories when clicked. Down-block `« TURK STREET (Opening Block) »` shrinks behind light poles; eatery captions appear on the 100 Block (`Morning Star Banh Mi & Coffee (fictional)`, `d-edge-16b-after-route-west.png`) rather than the opening block. Keyboard walking, right-drag turning, wall collisions, sky taps, rapid toggles, resize (`d-edge-12-resize-to-phone.png`), `L`/`F` map handoffs, and conversation handback/return (`d-p3-03-after-tap-bea.png`, `d-p3-04-after-esc-bea.png`) feel solid; `conversation_detail` clips its second line (`"chatting)"`) in both map and handback views (`d-m5-06-met-bea.png`).
- **Phone (`390×667`):** Portrait framing (`p-sv-000.png`, `p-sv-180.png`) keeps `Bea`, `Turk & Taylor`, and `Compton's Cafeteria (1966)` clear above the 3-button bar, proximity greetings fit inside Info (`p-p2-02-east-seg1.png`), and tapping Bea hands back and returns via `Goodbye` (`p-p3-03-clean-goodbye-return.png`). Without touch turning, street view feels tunnel-visioned; normal touch map view (`p-m5-06-met-bea.png`) plays smoothly aside from minor truncation in `All Actions` (`p-sv-tray-all-actions.png`).

## 4. Accessibility findings

- **Buttons:** Every visible button across all states on both sizes measured `>= 44×44 px` and stayed inside the viewport.
- **Keyboard-only:** Items 1–3 are 100% completable without a mouse (`d-k6-01-sv-entered.png`, `d-k6-04-around-corner-keyboard.png`).
- **Announcements:** `#godot-a11y-status` (`aria-live="polite"`) mirrors `announcement` reliably, apart from keyboard instructions on touch phones, silent `Shift+Up/Down` tilt, missing `x = -50` boundary explanation, and repeated 8-wind labels across adjacent `30°` steps.

## 5. Console errors

Zero `console.error`, zero `pageerror`, and zero failed network requests occurred. Two deduplicated WebGL warnings appeared:

```text
WebGL: INVALID_OPERATION: bindBuffer: element array buffers can not be bound to a different target
WebGL: INVALID_OPERATION: bufferSubData: no buffer
```

## 6. What you could not test

- **Live screen-reader speech and audio mix:** Headless Chrome cannot judge OS voice synthesis or music timbre; verified `#godot-a11y-status` DOM updates and `music_sample_rms` instead.
- **Physical multi-touch glass:** Tested on `390×667` (`hasTouch: true`) via Playwright touchscreen taps and CDP multi-touch rather than physical hardware.
- **Pre-street-view diff:** No prior baseline build existed.

PLAYTEST-COMPLETE 8/8
