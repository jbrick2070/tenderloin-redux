# Failure evidence

- artifacts/readable-labels-native-candidate.log and readable-labels-layout-diagnostic.log: wrap alone produced title height1px (visible lines0), reducing banner height and breaking queue/Info behavior. Explicit measured minimum title height fixed it. Initial guide priority also hid an active cafe caption; guide placement now runs after captions and reserves their bounds.
- artifacts/readable-labels-native-candidate-fixed.log and readable-labels-guide-diagnostic.log: the intentionally long3-line reward at320 correctly suppressed Talk where their bounds touched, under the existing reward priority rule. Corrected test to require guide visibility during reward and both Talk/guide after expiry, while checking no overlap throughout. The real short So What browser case still requires both visible simultaneously.
- artifacts/readable-labels-native-candidate-pass.log: GODOT_STUDY_PASS. Final source after review must still pass all five gates.

- artifacts/readable-labels-browser-before-review.json: all three candidate widths passed with errors/external empty, but precede fresh-frame/adaptive-wrap/arrow-glyph fixes. Final verification must use the later reviewed logs and export.

- First post-review all-five pass is retained as artifacts/readable-labels-browser-before-final-copy.json/.log. Its390px museum heading had an orphan decorative trailing star. Final copy removes that ornament; the later reviewed logs/verification identify the final source.

- Final source: all five gates pass, all three widths errors/external empty. Six fresh final screenshots inspected; both requested visual regressions clear. verification.json identifies final source/export/log hashes.
