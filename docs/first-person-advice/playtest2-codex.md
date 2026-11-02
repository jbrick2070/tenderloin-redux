SHA-256: `b8ca13f1589cee21eaa727be3ff75596eba2df6e03b8baddf348bca0da75063a`

# 1. Build

Fetched `http://127.0.0.1:4194/index.pck`: **1,503,448 bytes**, matching the supplied commit-8285794 package fingerprint. Live `street_view` contained **turn, fov, capture, stick, reduced_motion**. Each lane checked the gate before play. Headed Chrome 156, independent fresh contexts; phones used `hasTouch:true`, touchscreen taps and CDP touch input. Only the specified local site was opened.

Screenshot links below refer to `artifacts/playtest2-codex/`. Full snapshots, input scripts, console records and storage evidence are retained there; desktop actions are in `desktop-history.json`.

# 2. Summary

Street view feels immediately usable: dragging separates cleanly from tapping, keyboard turning is predictable, and walking while looking with a second finger works. Portrait views and Bea’s dialogue remain readable at both phone widths, although landscape leaves little street visible. The most important problem is that **System reduced motion ignores Chrome’s emulated reduce preference**, leaving motion enabled until the player explicitly chooses On.

# 3. Known bugs rechecked

1. **Fixed:** held W and held touch stick produced one western hand-back; desktop crossed x=−50.0254, then `active:false,enabled:false,projection:1` stayed stable. Announcement: “Map view. Street view is only on the opening block for now. Walk back east of Taylor Street and press Shift+F to use it again.”
2. **Fixed:** Bea face taps approached and opened her conversation instead of walking past; `taps_routed:1,active:false,projection:1,active_panel:"block"`, announcement “Arrived at Bea (The one with the plan). Visited 1/5 neighbors.”
3. **Fixed:** objective behind appeared low/down. At 390, `yaw_deg:96.6036,pitch_deg:0`; guide-label rectangle `(170.38,521,66,22)`. [phone390-d-objective-behind.png](../../artifacts/playtest2-codex/phone390-d-objective-behind.png).
4. **Fixed in sampled headings:** full-circle 390 turns showed no guide/Map overlap; Map rectangle `(250,114,132,44)`, behind guide as above.
5. **Fixed:** phone drags turned through full circles, reached pitch ±60, and retained `taps_routed:0`; simultaneous movement/look reported `contacts:["move","look"]`.
6. **Still happens, conversation branch:** Shift+F changed `active_panel:"block"→"none",active:false→true` and announced “Street view. Facing east…” without the goodbye announcement. Esc correctly announced “Said goodbye to Bea…”. Opening Shift+F now starts with `music_playing:true`; the tested hub closes rather than remaining over street view. [desktop-t-chat-after-shiftf.png](../../artifacts/playtest2-codex/desktop-t-chat-after-shiftf.png).
7. **Could not check conclusively:** twelve inspection headings never established the diamond behind the Portable Mural. Representative `active:true,projection:0,yaw_deg:-132.0115`, eye `(108.7817,1.6,-20.1300)`, marker `visible:false,y:29.1028`; absence is insufficient proof of a fix.

# 4. New bugs

## A. Major — System reduced motion ignores the browser preference

**Sizes:** 1100×760, 390×667, 320×667.

**Fresh-load steps:** Create a clean Chrome context with `reducedMotion:"reduce"` before navigation. Load the game, wait for loading to finish, Start Exploring, then open Info without changing Reduced motion. Confirm `matchMedia("(prefers-reduced-motion: reduce)").matches === true`.

**Expected:** System reports on and suppresses the specified motion. **Actual:** Info says “System (off)”; the gold marker continues bobbing. Reloading also retained the mismatch. Explicit On froze the marker.

**Snapshot:** `street_view:{active:false,projection:1,turn:"snap30",fov:70,capture:"released",reduced_motion:{on:false,saved:false,system:false,text:"Reduced motion: System (off)"}}`. Desktop announcement: “You're here. Meet Bea (0/5 neighbors met). Follow the gold marker or tap What's Next?”

**Evidence:** [desktop-system-reduce-r2.png](../../artifacts/playtest2-codex/desktop-system-reduce-r2.png), `desktop-system-reduce-r2.json`, `desktop-motion-samples.json`; independent phone evidence `phone320-c-media-evidence.json`.

**Twice in fresh profiles:** Yes—two desktop contexts, independently corroborated on both phone sizes.

## B. Minor — Rotating clears a held walk stick

**Sizes:** 390×667→667×390→390×667; also reproduced from 320×667.

**Fresh-load steps:** Start Exploring, tap Street view. Touch stick center `(68,537)`, drag down to `(68,565)`, and keep that contact held while resizing to 667×390 and back. Do not send touch-end.

**Expected:** Walking carries on across rotation. **Actual:** Landscape hides the stick, clears its contact and stops walking; returning to portrait restores the stick but does not resume the held input. DOM logging recorded **no touchend or touchcancel** during resizing.

**Snapshot:** `active:true,projection:0,turn:"snap30",fov:70,capture:"released",yaw_deg:-80.85836,pitch_deg:0`; `contacts:["move"]→[]`, `stick.visible:true→false→true`, `keep_aspect:0→1→0`. Eye remained `(13.794336,1.6,-8.670538)` across subsequent landscape/portrait samples. Announcement stayed: “Street view. Facing east. On Turk Street, near Taylor Street. Shift+Left and Shift+Right turn, Shift+Up and Shift+Down tilt, WASD or arrows walk. Shift+F returns to the map view. Drag the stick at the bottom left to walk; drag anywhere else to look around.”

**Evidence:** [phone390-d-rotate-stop.png](../../artifacts/playtest2-codex/phone390-d-rotate-stop.png), `phone390-clean-rotation-evidence.json`, `phone320-c-touch-events-before-release.json`.

**Twice in fresh profiles:** Yes—three 390 contexts and two 320 contexts.

## C. Minor — Right-button/left-click chord captures the pointer

**Size:** 1100×760.

**Fresh-load steps:** Enter to Start Exploring; Shift+F; enable Mouse look. At street point `(700,400)`, hold the right button, click/release the left button, then release the right button. Move to `(850,400)` with both buttons up.

**Expected:** Pointer remains free after this right-button chord; unpressed movement does not turn. **Actual:** Pointer locks and remains locked after both buttons are released; subsequent movement turns the view. Esc recovers.

**Snapshot:** `active:true,projection:0,mouselook:true,capture:"locked",capture_requests:1,contacts:[],taps_routed:0,turn:"snap30",fov:70`; yaw changed `−80.85836→−153.97695` with buttons up. Announcement: “Esc releases the mouse.” Browser `document.pointerLockElement` was non-null.

**Evidence:** [desktop-rightchord-r2-move.png](../../artifacts/playtest2-codex/desktop-rightchord-r2-move.png); matching `desktop-rightchord-r1` and `r2` records in `desktop-history.json`.

**Twice in fresh profiles:** Yes.

# 5. Readability and feel

- **1100×760:** Spacious street view, readable buttons and speech. Left/right drag and twelve 30° keyboard turns worked; tilt clamped at ±60°. Walking along the façade resisted sideways movement into it without an observed wall passage. Conversations returned to the same standing position and retained heading/tilt.
- **390×667:** Clear portrait composition; the 120×120 stick is comfortable. A 290-pixel swipe turned about 142°, so small swipes are easier to control. Bea’s 16px dialogue was readable. Landscape’s header and bottom controls consume much of the view.
- **320×667:** Principal buttons and dialogue remain readable; Info scrolls and its motion button fits. [phone320-a-bea-face-talk.png](../../artifacts/playtest2-codex/phone320-a-bea-face-talk.png). Multi-touch worked, and W overrode backward stick input until released.
- **Map-only baselines:** Separate fresh desktop and 390 profiles ran **131.060 and 127.450 seconds**, never enabling street view. Walking, zooming, panning, right-drag rotation, Find Me and meeting neighbors worked; no confirmed new map-play defect. Phone rotation also used supplemental mouse right-drag.

# 6. Accessibility findings

Observed principal targets stayed inside the viewport: Street/Map and desktop Mouse look 132×44, Reduced motion 111×44, stick 120×120; conversation actions were at least 44px high. Defaults were `snap30/70`; portrait street view used `keep_aspect:0`, landscape 1, without a portrait zoom-in effect.

Desktop entry, turning, tilt, walking, talking, goodbye, G, L and Find Me worked from keys. Arrival, goodbye, heading and western-limit announcements were clear; the Shift+F conversation issue remains above. Sky taps and thin margins caused no unintended walking. Repeated view toggles and desktop resizing preserved usable controls.

Normal pointer capture moved the view; Esc, T/conversation, L and a tab switch released it. Subsequent unpressed movement preserved yaw. Explicit Reduced motion cycled all three choices and On survived reload. Timed samples showed the gold marker and speech bubble stationary with On and moving with Off.

# 7. Storage and console

Abbreviations: **S** = `tenderloin-redux.godot.save.v1`; **P** = `tenderloin-redux.godot.settings.v1`.

| Fresh profile | Final localStorage keys |
|---|---|
| desktop-main | S, P |
| desktop-rightchord-r1 | P |
| desktop-rightchord-r2 | S, P |
| phone390 a / b / c / d | none / S,P / S / none |
| phone320 a / b / c | S / P / none |
| map desktop / completed390 / mural inspection | S / S / S |
| map Close-recheck 1 / 2 | none / none |
| preliminary desktop / interrupted first map-phone trial | not captured |

Neither forbidden `tenderloin-redux.save.v1` nor `tenderloin-redux.settings.v1` appeared in recorded profiles. No captured console errors or page errors. Deduplicated warnings, verbatim:

```text
WebGL: INVALID_OPERATION: bindBuffer: element array buffers can not be bound to a different target
WebGL: INVALID_OPERATION: bufferSubData: no buffer
```

# 8. What could not be tested

Physical-phone orientation and hardware touch were unavailable; rotation findings use CDP touch with viewport resizing. The exact mural occlusion setup was not established. Individual trees and burst gems/ring were not conclusively compared across motion states; marker and speech were measured. Collision exploration was sampled, and the complete phone Taylor-corner-and-return route was not finished.

Pointer-lock refusal was not exercised because Chrome granted locks. The preliminary map inspection omitted final storage capture; the first phone-map harness stopped at a hidden Zoom button before its storage step, then a fresh complete run replaced it. The temporary focus-test tab’s console was not separately captured.

PLAYTEST-COMPLETE 3/3
