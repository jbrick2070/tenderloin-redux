# Street view Phase 1 — Codex playtest

## 1. Summary

Street view gives the opening block a convincing sense of height and distance, with a clearly readable nearby Bea at both sizes. Keyboard movement, the conversation handoff and return, and the Taylor corner walk worked, but clicking a close neighbour and following the gold guide were unreliable. The most important problem is repeated street/map camera switching while holding forward at the western boundary.

Tested November 2, 2026, after the existing verification process exited: Chrome 156.0.8078.79, fresh profiles at 1100×760 mouse and 390×667 emulated touch, actual touchscreen taps, normal input protection enabled, only `http://127.0.0.1:4190/`. Checkout HEAD: `d36016f`; **served build**: PCK 1,485,816 bytes, SHA-256 `04aa5124bad58d0ccba768561c148ecad67466510b2081be5f7f781ffc758af1`. This differs from the latest build note's package size; no export was performed. Evidence files below are in `artifacts/playtest-codex/`; snapshots, input logs and console logs accompany the PNGs. Boundary hold details are retained in `completion-receipt.json`.

## 2. Bugs

**1. Major — western boundary repeatedly switches the camera. Size: 390×667. Reproduced twice: yes, separate fresh profiles.**

Fresh load → Start Exploring → Street view → six Shift+Right turns to face west → hold **W continuously for about 20 seconds**, continuing after reaching the boundary. One recorded run first turned left once, then right seven times, producing the same west-facing pose.

Expected: one stable handoff to map view with an explanation of the opening-block limit. Actual: movement stalls near `x=-50` and the camera repeatedly switches between eye level and overhead. The higher-frequency recording captured 28 further mode changes in about three seconds after the initial exit. `street_view`: `enabled=true`, yaw `99.141637`, pitch `0`, `active=true/false`, `projection=0/1`; representative eyes `(-49.9769,1.6,-1.7148)` and `(129.9717,181,178.2934)`. Announcements alternate between `Map view.` and `Street view at eye level. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view.` Neither explains the limit.

Screenshots: `phone-guide-repro-boundary-32.png` (map), `phone-guide-repro-boundary-33.png` (street). Timing evidence: `phone-repro-boundary-timeline.json`, `phone-guide-repro-boundary.json`. Snapshot and PNG acquisition are sequential, so they can capture opposite modes during this rapid switching.

**2. Major — tapping Bea's close-up face walks through her instead of talking. Sizes: both. Reproduced twice: yes; two phone profiles and one desktop reproduction.**

Fresh load → Start → Street view → hold W roughly 0.5 seconds → T → Escape → wait at least 0.7 seconds → tap Bea's face at **(195,400)** on phone. Desktop equivalent: **(550,420)**. Expected: reopen Bea's conversation. Actual: a ground route starts through her; T still works. Phone `street_view`: `active=true, enabled=true, projection=0, yaw=-80.858363, pitch=0`, eye `(22.3210,1.6,-10.0672)` after the tap. Announcement: `Walking to street point (32.1, -11.6) m.` Desktop eye `(23.0319,1.6,-10.1816)`, same mode/yaw/pitch; announcement `Walking to street point (42.3, -13.3) m.`

Screenshots: `phone-repro-goodbye.png`, `phone-repro-tap-close-bea.png`, `desktop-repro-goodbye.png`, `desktop-repro-click-close-bea.png`. The before images establish that these coordinates are inside her rendered face.

**3. Minor — guide points ahead when Bea is behind. Sizes: both. Reproduced twice: yes, including two fresh desktop profiles.**

Fresh load → Start → Street view → six Shift+Right turns, without walking. Expected: a cue to turn around. Actual: the gold arrow points upward at the same top-centre location as when Bea was ahead, still labelled `Bea · 4 m`. `street_view`: `active=true, enabled=true, projection=0, yaw=99.141637, pitch=0`, eye `(17.74,1.6,-9.33)`; announcement `Facing west.`

Screenshots: `desktop-heading-000.png` versus `desktop-heading-180.png`, `desktop-repro-behind-arrow.png`, `phone-heading-180.png`.

**4. Minor — Map view button covers the phone guide arrow. Size: 390×667. Reproduced twice: yes, fresh profiles.**

Fresh load → Start → Street view → Shift+Left once. Expected: visible arrow beside the objective label. Actual: `Bea · 4 m` remains visible, but its arrow is hidden behind the Map view button. `street_view`: `active=true, enabled=true, projection=0, yaw=-50.858363, pitch=0`, eye `(17.74,1.6,-9.33)`, button `(x=250,y=114,width=132,height=44,visible=true,text="Map view")`; announcement `Facing north-east.`

Screenshots: `phone-guide-repro-guide-under-button.png`, `phone-heading-330.png`. Similar overlap occurs at headings 210 and 300.

## 3. Readability and feel

Desktop: nearby Bea, objective distance and controls read clearly. Distant Turk/Taylor labels bunch together at the horizon. Looking north around the corner reveals a large shop caption with a partly clipped name (`desktop-corner-around-corner.png`).

Phone: Bea and the dialogue panel remain readable; her first conversation text fits above Chat More, Next Step and Goodbye (`phone-talk-bea-keyboard.png`). Distant street text is particularly small. The corner shop caption is also partly clipped (`phone-corner-around-corner.png`). Compton's caption is partly obscured by a pole. I saw no unambiguous object rendered through an opaque wall, or player movement through a building, in these walks.

Both sizes: the full twelve-heading circle, building approach/sideways blocking, walking along a facade, corner and return, tilt, sky/distant-ground taps, repeated view-button presses, Shift+F with a panel open, L/Find Me round trip, and resizing were exercised. Right-drag turns on desktop. Conversation returns to street view at the conversation position; turning street view on during conversation closes that panel.

Map-only checks: each size completed over two minutes in a separate profile that never enabled street view. Walking, zooming, panning, right-drag rotation, overview/Find Me and conversations worked without another reproducible problem. Phone pan used touch events; the requested right-drag rotation used an emulated mouse.

## 4. Accessibility findings

Start, street entry, full-circle looking, walking to Bea, talking and returning were possible using the keyboard. Captured visible interactive controls were at least 44×44 and inside their viewport; labels/readers and invisible stale rectangles were excluded. Entry and snap-turn announcements were understandable. Tilt and some movement leave the previous announcement unchanged; boundary switching repeatedly replaces it with the two messages above. Reading the snapshot does not establish real screen-reader usability.

## 5. Console errors

No console errors or uncaught JavaScript exceptions were recorded. Deduplicated console warnings, verbatim:

```text
WebGL: INVALID_OPERATION: bindBuffer: element array buffers can not be bound to a different target
WebGL: INVALID_OPERATION: bufferSubData: no buffer
```

Separately, some contexts recorded `net::ERR_ABORTED` for `/index.wasm`, although every tested session loaded and played; the cause is unestablished. No external requests were observed.

## 6. What I could not test

Physical phones, Safari/iOS, actual screen-reader output, human comfort/pacing, and a before-version comparison were not tested. Touch was Chrome emulation with a keyboard available for the specified Phase 1 movement/turning controls. Findings apply to the served hash above, not an independently rebuilt current HEAD. No implementation files were changed.

PLAYTEST-COMPLETE 4/4
