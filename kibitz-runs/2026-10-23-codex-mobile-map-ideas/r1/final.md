# Selected bounded implementation: Godot map pinch parity and guidance

SELECTED before coding: index-tracked two-finger zoom on unobstructed map plus touch-aware existing overview guidance. NO implementation edits yet. Music remains diagnosis-only. This is the same in-flight mobile comfort episode; complete it before selecting another slice.

- Two map-origin contacts track initial distance and centroid. Spread decreases orthographic view_size (zoom in), pinch increases it; preserve existing24..max(900,overview*2.5) clamps and desktop +/-/wheel behavior.
- Zoom only. While following, retain follow/player framing. Manual view keeps the world point under the initial centroid fixed; moving centroid does not introduce a new pan mode. No twist/orbit and no route/player/audio/save mutation.
- Coalesce scale to one camera update per process frame. Reject UI/modal/reader/rhythm ownership. Reset on cancellation/focus/visibility/lifecycle. A pinch or extra contact suppresses emulated mouse tap/pan/route until every contact lifts, whichever index releases first. Preserve ordinary one-finger tap/pan after full release. More than two contacts cancel until all lift.
- Native actual Input.parse_input_event cases: spread/pinch/clamps, manual anchor/follow intent, no route or player displacement, release orders/remaining finger/third contact/cancel/focus cleanup, modal/rhythm/UI-origin refusal, one-finger and desktop recovery.
- Actual CDP two-contact cases at390x667/320x667 and short559x360/599x360: both directions, exact camera/player/save assertions, Zoom +/- fallback, UI/reader refusal and release/cancel recovery. Capture meaningful before/after screenshots and scalar metrics. No physical phone feel claim.
- After code, separate soleClaude exact Opus5.5/high r3 with anchored sources and receipts; ground findings, fix valid ones, run all5 fresh gates on final inputs. Public fingerprint, legacy read-only,4096save,font,quiet/preferences/Stop/geometry invariants remain.

Rejected alternatives: audio runtime/score change without cause; new tutorial UI; two-finger panning/twist; MagnifyGesture without Web evidence; publishing/altering public or workflow. Revisit phone sound with real device/output details and spectral/continuity evidence after the bounded map slice.
