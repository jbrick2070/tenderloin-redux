VERDICT: yes-with-fixes / verification pending. CONFIRMED source implements the bounded dock strategy; final actual-input and five-gate evidence remains required.
MUST-FIX BEFORE BUILD:
1. CONFIRMED baseline overlap from ignored actual browser evidence, addressed by shared layout_walking_controls_and_hub/play_area_rect. Verify short panel titles, actions and two-line text stay on-screen after long objectives and Info, not just initial minimum sizes.
2. CONFIRMED activity focus runs before show. frame_activity_camera explicitly sizes hidden activity geometry and reserves future short walking bounds; verify actual Celeste/easel and Rook/speaker midpoint, not the post-pan target.
3. CONFIRMED camera ownership is independent of following_player for activities. remember_panel_framing/refit_panel_after_layout uses saved pose equality and visible panel/mode to avoid replacing manual camera intent. Inspect deferred calls across close/reopen/resize.
4. CONFIRMED new browser tests call actual shortcuts/buttons and read only snapshots; startup/standard context coverage remains. Native injection and emulated browser finger are not physical-device or screen-reader proof. Complete every required gate on frozen final source.
SHOULD-FIX:
1. CONFIRMED conversation button text now wraps only in short docks. Verify all dynamic action labels using measured multiline fonts and ensure original standard clipping policy restores.
2. CONFIRMED short conversation full reader can carry speech fallback; verify requested hint and stale dialogue remain understandable without losing progress announcements.
UNVERIFIABLE: physical phones, full screen readers, human comfort/pacing/listening. No claim of completion or deployment.
