# Retained diagnostic evidence

The initial native attempts were not passing gates. Logs are retained under artifacts/overlays-native-*.log.

- Initial: expected host text lacked the new venue/fiction disclosure; unrelated scene-tap fixtures assumed clicks could pass through visible overlays. Fixtures now clear transients before testing unrelated targets and separately prove covered targets are blocked.
- Second/diagnostic: longest host line at 320px did not fit with the conversation panel. Preserved diagnostic dimensions; reduced bubble padding/tail and removed animation overshoot while keeping text size. Final fit uses full border/tail dimensions and a 2px inside margin.
- Third/fit attempts: retained a UnicodeDecodeError from a read-only temporary diagnostic edit; no write occurred. The subsequent script explicitly used UTF-8. A later diagnostic showed 147.63px full speech in a 146px reserved area; corrected inner spacing without shrinking text.
- pass1 (filename is historical, result failed): complete dialogue legitimately covered some physical counter centers on 320px. Assertions now distinguish blocked covered targets, usable uncovered targets, and mandatory real counter/caption-edge activation after dialogue clears. No click-through permission was added.
- pass2: native GODOT_STUDY_PASS before later integration hardening. Check and 104 Node tests also passed at that stage.
- Internal read-only findings before independent review: marker precedence, composed-frame snapshot publication, insufficient-height reward deferral, stale pending speech after reset/restore. All integrated before the external review source snapshot.
- Screenshot inspection found a small world street label drawing through speech. World labels now draw behind opaque speech backgrounds; final screenshots must verify this.

The first browser run uses the initial export, so it is exploratory evidence even if passing. Final native/export/check/Node/browser gates must use the final reviewed source. No failed or stale run is final verification.

## Review and final-validation diagnostics

- Initial browser failed at 320px eatery 1: expanded Info left play_area height60; visible reward height75 crossed into controls. Retained overlays-browser-initial-failure.json/png and initial log. This export predates the queue/composed-snapshot changes and is never final proof.
- Candidate native and reviewed diagnostic attempts exposed an expired reward resurrected by resize_controls calling layout_reward_banner with timer0. Captions were correctly suppressed by that incorrectly visible banner. Added timer admission to layout and a resize regression; did not weaken caption restoration checks.
- artifacts/overlay-layout-probe.log and overlay-layout-probe-height.log establish immediate minimum-height behavior. reset_size changes width undesirably; selected fix sets only the height, retaining viewport width. These probes used --test-suite.
- artifacts/overlays-native-final.log passes after all grounded review fixes and the resize guard. Final check/Node/export logs are separately retained; final browser pending at this note's creation.

- The first reviewed browser export passed all three widths with errors/external empty; retained as artifacts/overlays-browser-before-info-dedup.json. A later small Info-prefix regression fix invalidated that as final-source proof. Fresh native/check/104 Node/export gates passed with *-verified.log filenames; the browser gate is rerun against that export.

- FINAL: all five fresh *-verified.log gates pass after the Info-prefix fix. Final browser runs at 1100x760, 390x667 and 320x667 have errors/external empty; 1,728-byte saves and 166.7/176.2/179.3ms pathfinding. Final source hashes and screenshot/export freshness are asserted in verification.json. Earlier runs above remain diagnostic evidence only. A receipt-generation assertion initially compared wrapped versus unwrapped review-hash JSON; corrected to compare its files member, with no source or test changes.
