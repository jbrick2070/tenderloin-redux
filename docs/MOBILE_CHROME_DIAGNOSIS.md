# Published Chrome mobile diagnosis - October 23, 2026

The creator reports silent music and an expected map pinch that does not zoom at https://jbrick2070.github.io/tenderloin-redux/ in Chrome. Physical phone OS/model/output and Chrome version remain unknown.

## Corrected live-build identity

The root URL serves a Godot export, confirmed by actual Chrome title/canvas, rendered Godot chapter UI and HTTP200 index.html loading index.js. The earlier inference from local public/ was incorrect for this URL. deploy-pages.yml copies Godot to root and /godot, and public/ to /browser. No workflow or public file was changed, no dispatch/deployment occurred; all future commits/pushes must retain [skip ci]. Local Godot work can address this track, but only a separately authorized deployment would deliver it to the phone.

Live index SHA256 f5bdd8c1640ea2897e2e15e42b62c5b42b0d2e3e932ac0f28cc2fd04567517ee; live PCK1694608 bytes SHA256654f9b29e7d5076bf19e36d62c6b1b4c15b47c8792fec63c79c01260fb8f7b78. HTTP Last-Modified October21 17:32:48Z. GitHub API latest successful deploy run39644416466 uses head1c5fa7ae08e39e6488208e09aaeb0fa8b8ba42b6, finishing17:32:54Z; this strongly associates the observed export with that deployment, not proof of reproducible PCK equality. It differs from current verified local PCK. Function comparison against that commit finds zoom, pan, audio construction/start and stem logic unchanged; advance_music_clock differs for later gain reporting. No whole-source identity claim.

## Reproduction evidence

Fresh isolated installed Chrome,390x667 mobile/touch emulation, explicit user-gesture-required audio policy, no autoplay bypass, no saved profile injection or game action hooks. After actual keyboard Enter, a destination analyser tee measured nonzero output (peak RMS0.12874), and the screenshot showed Music On after Start. After actual touchscreen Start, two separate captures measured peak RMS0.12788 and0.12832 with context running, volume0.7 and no page errors. The original audible connection remained intact. Legacy browser save remained absent/unwritten in each isolated context. These are desktop browser output measurements; neither listening nor physical phone acceptance.

Actual CDP two simultaneous contacts spread100px to212px and then pinched back over unobstructed map at y420. camera_view_size stayed45 before, after spread and after pinch; target shifted about2.34m per x/z axis during spread and returned during pinch. Player stayed still and no route started in this sequence. This reproduces absent pinch zoom and unintended one-finger-style map pan for this emulated input. Local main.gd has emulated mouse tap/pan, but no indexed map ScreenTouch/ScreenDrag zoom handler.

First diagnostic launch failed before UI because the bundled headless-shell executable was absent; the script was corrected to installed Chrome, no download. The first touch diagnostic omitted camera_view_size by reading a nonexistent view_size snapshot property; retained touch1 artifacts show camera movement but are not zoom-scalar proof. The final corrected diagnostic records actual camera_view_size45 in all three states. All failed/earlier scripts and receipts remain in artifacts/mobile-chrome-20261023. Meaningful before/after phone screenshots were inspected.

## Music remains open

Nonzero RMS does not establish handset audibility, continuous playback under phone load, volume routing or user-gesture unlock on the creator device. Source supports three separate hypotheses: frame-bound generator starvation; opening bass-only content (roughly98-147Hz fundamental plus second harmonic) hard to hear on some phone speakers; platform/output/mute/unlock behavior. Phone acoustic roll-off is an inference, not tested fact. The old public/audio.js progress-layer silence observation applies to /browser only. Current Godot always has a bass stem. No runtime music/score change is justified by these sessions alone. Further spectral/continuity evidence and actual-device verification remain needed; preserve mute/quiet/volume, no forced unmute or copyrighted track.

## Selected next implementation

Mandatory exact sole-Claude Opus5.5/high scoped pre-code r1 completed rc0/ToolCheckPASS with12 anchored files unchanged. Codex grounded all findings and recorded selection-before-code.json in kibitz-runs/2026-10-23-codex-mobile-map-ideas/r1. Selected: indexed two-finger map zoom and existing touch-aware overview guidance; conventional interaction, no novelty claim. Follow view retains follow/player framing; manual view anchors the initial centroid on ground. Zoom only, no new two-finger pan/twist. Coalesce scale once per frame; refuse UI/modal/rhythm ownership; suppress emulated taps/routes until every contact lifts, including first-index-first release, extra contact, cancel/focus/lifecycle. Preserve one-finger/desktop recovery and existing clamps. See r1 final.md for native and real-CDP acceptance.

No production code has changed in this episode yet. Separate implementation r3 and all five fresh gates are required after code/fixes. Owned lock codex-mobile-chrome-diagnosis-20261023/PID32440 records this in-flight episode; no active diagnostic or gate remains. Do not start a competing slice. Before continuing verify ownership/processes/HEAD and selected code hashes. ElectionWalk30cb85a remains the last fully verified/pushed checkpoint. Public fingerprint/legacy read-only/save4096/font/geometry/quiet/user-camera invariants remain. Quest freedom, cooking, historical opening, speculative ending and playtest/teaser stay queued.


## Creator device clarification and audio follow-up

Creator confirms Chrome on iPhone, Music says On but remains silent. Device/iOS/Chrome versions and output routing are still unknown. This supersedes the earlier unknown-phone-OS note. WebKit documents ambient Web Audio obeying Silent Mode and discusses Audio Session behavior: https://bugs.webkit.org/show_bug.cgi?id=252746#c2 and https://bugs.webkit.org/show_bug.cgi?id=237322#c6 . These are leads, not proof of the creator device cause. A voluntary Silent Mode off/media-volume/Music Off-to-On check is pending. No silent-file workaround, audio-session override or forced unmute is implemented.


## Creator follow-up and current candidate

The combined suggested check restored audibility according to the creator, but music is described as choppy/static-like at beat endings and too chippy. Do not assign causality to Silent Mode alone. The creator physical screenshot and request for nested one-to-three persistent controls are captured in docs/MOBILE_UI_BRIEF.md. The live GitHub pinch remains broken; indexed pinch exists only in the local candidate under test. Exact r1 and separate r3 are complete, native4 passes; stronger private browser owner/release/fallback tests are still being grounded. No final five-gate acceptance, commit or deployment yet. Earlier pre-code and unknown-device paragraphs above are historical.


FINAL VERIFICATION: all five fresh local gates pass on identical frozen inputs. Native-final1 GODOT_STUDY_PASS/MAP_PINCH_PASS/noERRORWARNING, export/check/106Node, full browser1 rc0 in4976.76s,46 source/PCK hashes and native ASFOUND unchanged. Full old1100/390/320 matrices plus3 genuine voting and4 actual two-touch cases/errors[]external[] pass. Full390 before/320 distant after screenshots inspected. Compact verification.json records exact receipts and retained failures. Driver fixes remain NOT independently re-reviewed. Physical iPhone/AT/human acceptance and deployment absent; nested UI and music quality remain queued.

Earlier pre-code/in-flight statements above are historical and superseded by this final verified checkpoint. The live GitHub build remains unchanged.
