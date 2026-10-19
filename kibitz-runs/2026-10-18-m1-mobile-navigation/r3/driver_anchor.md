# Driver anchor, before partner fanout

VERDICT: yes-with-verification. Implemented small camera/DOM navigation slice is suitable for independent review; final real-touch rerun and source fingerprint still required.

MUST-FIX BEFORE COMPLETION
1. [3, CONFIRMED] Final touch checks in tests/browser-smoke.mjs were added after first green browser run. Run them and inspect captures before acceptance. Do not infer real touch from mouse drag alone.
2. [3, CONFIRMED] Capture final runtime/test source hashes and compare independent reviewer before/after. Source is uncommitted by creator convention, so git alone does not detect alterations of untracked files.

SHOULD-FIX / VERIFY
1. [2, CONFIRMED] camera.js keeps projection untouched, clamps scale and camera center, and tracks player only when following. Roundtrip/bounds tests pass. Full-block view reserves upper/lower overlays.
2. [2, CONFIRMED] world.js defers activation until pointer-up, cancels drag/multi-touch activation, preserves preventDefault before canvas focus, and uses the same camera transform for hits/draw. Minimum label font has corresponding scaled label-hit bounds. Verify capture cancellation and secondary touch sequences in Chrome.
3. [2, CONFIRMED] game.js directory uses NEIGHBORS and existing goTo, arrival uses interact, Stop clears walkPath and walkTarget. Live route text changes only with status content and no focusable menu is rebuilt per animation frame. show/close modal guards from the prior round remain.
4. [2, UNVERIFIABLE] Physical phone feel and screen reader announcements need a human later; DOM labels/native buttons and automated focus checks are useful but not a completed accessibility audit.

OPTIONAL: pinch zoom omitted deliberately; explicit large buttons and single-finger drag provide current scope. No experiment or geographic content changes.
CUT: new routing/navigation dependencies, teleporting, persistent camera state in quest saves, additional reviewer panels.
