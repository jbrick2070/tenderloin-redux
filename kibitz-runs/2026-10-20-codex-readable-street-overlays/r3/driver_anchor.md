# Driver anchor (before independent fanout)

VERDICT: yes-with-verification. MUST-FIX: any reproducible overlap, missed caption restoration, wrong-target tap, stale published geometry or persistent progress mutation found by independent review/final gates.

CONFIRMED against main.gd: speech geometry includes border/tail and animation (4516-4630); deferred speech retains timer and target/map cancellation remains active; Info fallback preserves full text. Caption composition rebuilds visibility and hit rectangles (12521 onward), with visible overlays excluded before dispatch and tour marker ahead of captions (12701 onward). Rewards now wait if Info leaves too little room (5635 onward). Reset/restore clear pending speech. Snapshot publish moved after composition (10762 onward and _process).

CONFIRMED tests: study_test.gd 1822 onward has all-six-cafe/all-three-width coverage with positive restoration and real taps, save equality, active resize, Info/reward and reset lifecycle checks. tests/godot-browser.mjs tour loop uses read-only geometry plus actual mouse/button activation, with screenshot evidence and exact localStorage checks.

CONFIRMED limits: native/check/104 Node tests passed before the final integration fixes; earlier-export browser run is in progress. Final five-gate results remain pending. Existing public fingerprint and source bytes must be rechecked at finalization. Native tests are not physical-phone or full screen-reader acceptance.

SHOULD-FIX: keep the implementation bounded and copy concise; retain failure evidence and explain any deferred speech/reward behavior. No broad camera migration or factual streetscape changes are authorized in this slice.
