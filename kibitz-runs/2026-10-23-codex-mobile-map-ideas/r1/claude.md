TOOL CHECK: PASS (read input.md, godot/main.gd, godot/project.godot, godot/export_presets.cfg, godot/rhythm_circle.gd, tests/godot-browser.mjs, session_handoff.md, docs/ROADMAP.md, .github/workflows/deploy-pages.yml, artifacts/mobile-chrome-20261023/*).

Section ids used below refer to input.md paragraphs: [P1] live-site/pack identity (line 3), [P2] read scope (line 5), [P3] deliverables + pinch requirements (line 7), [P4] music constraints (line 9), [P5] freezes/process (line 11).

VERDICT: yes-with-fixes. The pinch half is grounded in real code and buildable. The music half has three problems: it names only one hypothesis, its acceptance test could pass while the phone stays silent, and the plan has no way to get the phone verification it asks for. Fix those before choosing the slice.

MUST-FIX BEFORE BUILD

1. [P1][P5] The plan never says how the live site actually gets updated, so "do not deploy" rests on an unstated habit. .github/workflows/deploy-pages.yml:3-5 deploys on every push to main. It copies artifacts/godot-web/* to the site root (line 64) and public/* only to /browser (line 66). So the live root is Godot by design, not a surprise. The only thing stopping a deploy is the "[skip ci]" commit suffix (session_handoff.md:15; every recent commit in git log carries it). Two consequences the plan doesn't state:
   (a) any push without [skip ci] ships ALL of main to the phone, not just a pinch fix. That includes everything since the Oct 21 pack (Election Walk, lantern, dog, etc.);
   (b) "Public/ must stay byte-frozen" has nothing to do with what the phone loads at "/".
   FIX: add one line to [P5]: "Live root = Godot export of main via deploy-pages.yml; deployment is prevented only by [skip ci]; every commit in this slice must carry it. Shipping any mobile fix means shipping all of main and needs separate creator authorization." Also correct the stale framing that still says otherwise: godot/project.godot:1 ("Browser 0.12 remains the playable game baseline"), session_handoff.md:13 ("A Godot fix will not change that published site") and session_handoff.md:21 ("This is published browser track, not assumed Godot").

2. [P3][P4] There's no device-verification channel, so the plan can't reach the confirmation it asks for. It wants phone-relevant pinch and music evidence. But the creator's phone only ever loads the deployed root (see 1), deployment is forbidden, and the plan offers no other way for the phone to load the local build. Without that, "phone music fixed" or "phone pinch feels right" can never be confirmed, only inferred from desktop Chromium.
   FIX: state outright that this slice's acceptance stops at native + desktop-Chromium CDP evidence, and that phone confirmation stays OPEN until the creator authorizes a route to the phone. Either a deploy of main, or a separate preview path, which would itself be a workflow change needing approval [ASSUMPTION: creator decides]. Don't let any r3/all5 verdict word this as a mobile fix.

3. [P4] The music section has only one hypothesis (frame starvation) and misses a stronger one that the code supports. For a new player, recompute_music_stems() (godot/main.gd:10654-10662) leaves unlocked_stem_mask = 1 (initialized at main.gd:588). So advance_music_clock() (main.gd:10952) produces only sine bass at 98-146.83 Hz (amplitude 0.24) plus a 2x harmonic at 196-293.66 Hz (amplitude 0.08). That's multiplied by music_volume 0.70 (main.gd:578) and mixed at 22050 Hz (main.gd:170). Phone loudspeakers reproduce very little that low [ASSUMPTION: typical handset speaker roll-off; verify on device]. So the opening music may be technically playing and still nearly inaudible.
   FIX: list at least three separate hypotheses in [P4], each with its own evidence:
   H1 starvation: single-thread web export (export_presets.cfg:12 thread_support=false; live-index.html:115 GODOT_THREADS_ENABLED=false) plus a generator filled from _process (main.gd:13930, 10930).
   H2 bass-only content inaudible on a handset speaker.
   H3 platform/OS mute or unlock state. The OS is unknown per driver_anchor.md:4.
   Also keep the existing public/audio.js "no notes before progress" observation (session_handoff.md:13,21) clearly marked as belonging to the /browser track, not the live root.

4. [P4] The proposed music acceptance can produce a false green. "Capture actual destination audio after real Start/Music" in desktop headless Chromium will show nonzero RMS under H2, and very likely under H1 too, because desktop doesn't reproduce phone frame pacing. The test passes while the creator still hears nothing.
   FIX: the acceptance must either:
   (a) record a band-limited or spectral measure alongside RMS (for example, energy above ~300 Hz at the opening stem mask), so H2 shows up as a measured fact; and
   (b) record underrun/continuity telemetry under a throttled main thread (CDP CPU throttling) for H1.
   Otherwise, downgrade the claim to "desktop output present; phone audibility unverified." Reuse the existing destination observer, installRhythmAudioProbe (tests/godot-browser.mjs:141-175), rather than building a second probe. That observer took 11 failed full runs to stabilize (session_handoff.md:30-60). Budget for that, and don't put a new audio assertion in the 76-minute full12 gate without a bounded diagnostic preflight first.

5. [P3] Camera ownership during pinch is undefined, and the two existing zoom paths disagree. zoom() (main.gd:14734-14739) leaves following_player untouched. pan_camera_by_screen_delta() (main.gd:14164-14174) clears following_player. update_camera() (main.gd:14494-14516) re-centers target on the player whenever following_player is set and the hub is up or uses_short_narrow_walking() is true. That's exactly the phone layout. So a centroid-anchored pinch that shifts target will be undone the next time update_camera runs while following. Clearing follow on every pinch instead would detach the camera mid-walk, which the Zoom +/- buttons don't do today.
   FIX: [P3] must pick one rule. Recommended: pinch behaves like zoom() for follow state (keep follow, anchor to the player, not the centroid, while following). It anchors to the centroid only when not following. Write this as an explicit acceptance case at the 559x360 / 599x360 short-walking sizes already in the harness (tests/godot-browser.mjs:690).

6. [P3] "Centroid anchored pinch" doesn't say whether moving the two-finger centroid also pans. Standard map pinch, which [P3] invokes, does. Leaving it undecided means the r3 reviewer has no spec to judge against.
   FIX: state it either way. Recommended: zoom only, centroid fixed at gesture start, no two-finger pan, no twist-rotate. That's the smallest slice. It keeps one-finger pan as the only pan and keeps orbit desktop-only, as main.gd:14447-14478 has it today.

7. [P3] The plan names "reader ownership" and "modal readers" but leaves out an existing raw-touch owner that will conflict. godot/rhythm_circle.gd:478-493 ignores emulated mouse (DEVICE_ID_EMULATION) and handles ScreenTouch/ScreenDrag itself, with no finger-index tracking. A second finger resets dragging/drag_start (line 488) and pans via game.pan_camera_by_screen_delta (line 492). A map-level pinch in main.gd would run alongside it.
   FIX: add rhythm_circle owns_view/visible to the refusal list in [P3], or declare that pinch while the rhythm circle is visible is out of scope and refused. Include one two-finger case on the rhythm circle in the native acceptance (pattern already at godot/tests/study_test.gd:4064-4078).

SHOULD-FIX

1. [P3] The plan ignores that zoom already exists on phones. Zoom +/- buttons are always in the control grid (main.gd:15442-15443, relabelled "Zoom +"/"Zoom -" on compact at main.gd:6741-6744; no visibility toggle found). So the user problem is "the expected gesture is missing", not "can't zoom". That changes the priority of "discoverable gesture guidance": it's a hint, not a rescue. FIX: frame pinch as parity with a working button path, and make the button path the documented fallback in any guidance text.

2. [P3] The current in-game guidance is mouse-only and is shown on phones. overview_text() (main.gd:14741-14742) says "drag pans · right-drag rotates · scroll zooms", with no narrow/touch branch. FIX: the cheapest honest "discoverable guidance" is a touch-aware variant of this existing string ("drag pans · pinch or Zoom ± zooms"). No new UI, tutorial, timer or save key. Keep desktop text byte-identical.

3. [P3] Pinch will fire zoom() many times per frame, and each call runs update_occlusion(true) (main.gd:14739). verify: cost of update_occlusion on a phone-class CPU. FIX: apply at most one zoom per frame (accumulate the scale ratio), which also helps H1 by not stealing main-thread time from the audio fill.

4. [P1] The live pack (1694608 B, Last-Modified Oct 21; live-pack-receipt.json:3,8) is older than local (1950596 B). The plan refuses build-identity claims, which is right, but skips the cheap step that makes the phone report usable. FIX: identify the last non-[skip ci] commit before Oct 21 17:32 GMT and diff only the input (main.gd ~14176-14485) and audio (main.gd 3205-3224, 10853-10970) paths against HEAD. If they're unchanged, the phone report applies to current source; if not, say so. verify: which commit produced the Oct 21 deploy.

5. [P3] MagnifyGesture: the plan lists "no explicit ScreenTouch/Magnify path" as if both were candidates. verify: whether Godot 4.7 Web ever emits InputEventMagnifyGesture for touch pinch [ASSUMPTION: it doesn't; touch arrives as indexed ScreenTouch/ScreenDrag]. FIX: commit to index-tracked ScreenTouch/ScreenDrag, following the rhythm_circle.gd:478 precedent of ignoring emulated mouse while the gesture is active. Drop Magnify from scope unless verified.

6. [P3] Emulated-mouse hazard, to make concrete in the spec: Godot emulates the left mouse button from touch index 0 (comment at main.gd:14455). If finger 0 lifts before finger 1 after a pinch with little finger-0 movement, the mouse release reaches main.gd:14468-14473 with pointer_dragging false, which calls handle_scene_tap and then walk_to_point (main.gd:14155). FIX: name this exact sequence (index-0-first release) as a required native and CDP case. CDP Input.dispatchTouchEvent with two touchPoints ids is enough; the harness only uses id:1 today (tests/godot-browser.mjs:365, 538).

OPTIONAL / NICE-TO-HAVE
- Honest music feedback that needs no score change: when music_playing and unlocked_stem_mask == 1, have the existing music UI say the opening layer is low bass only and name what unlocks the next layer (logic already in recompute_music_stems). It addresses H2 honestly without changing audio. It's a copy change only; keep quiet/mute/volume untouched.
- Wheel zoom and button zoom stay unanchored (main.gd:14441-14446, 15442-15443). Don't change them in this slice (desktop must be preserved), but note the inconsistency for later.

CUT THESE
1. [P3] The "originality/prior-art considerations" section for pinch. Pinch-to-zoom is a standard platform convention and the plan already disclaims novelty. One line is enough, and cutting it removes nothing that's at risk.
2. [P3] Delivering "2-3 improvements" and "ONE bounded slice" in the same round. Pinch (input/camera), guidance (copy) and music (audio diagnosis) are three subsystems with different evidence standards. Recommended slice: pinch plus the touch-aware overview_text line. Music becomes a diagnosis-only artifact (H1/H2/H3 evidence, no runtime change) until device evidence exists; music code changes can't be verified anyway under Must-fix 2.
3. [P2] Reading docs/GODOT_APPROACH.md "as needed". Nothing in [P3]/[P4] depends on it. The facts that matter come from main.gd, export_presets.cfg, deploy-pages.yml and the live HTML. Safe to drop from required reading.
4. [P3] "third finger" handling as a separate design item. With a zoom-only, two-index state machine (Must-fix 6), extra indices are simply ignored until every contact lifts. Fold it into the "suppress until all released" rule rather than designing it separately.
