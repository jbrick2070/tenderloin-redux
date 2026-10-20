# Failure evidence

- artifacts/graphics-native-initial.log: new test assumed the unnamed player collider had literal name CollisionShape3D; get_node returned null, and the harness stopped advancing. Preserved the log, identified the exact test-only Godot child process (PID5820, parent3220, study_test.gd --test-suite), and stopped that child only. No unrelated process was killed. Fixed test discovery with direct child type enumeration and guarded access.
- artifacts/graphics-native-candidate.log: GODOT_STUDY_PASS after that fix. Candidate export/check/104 Node tests also pass. These are candidate evidence until final review, screenshots and browser gates complete.

- Candidate browser passed all three viewports, errors/external empty; retained as artifacts/graphics-browser-before-review-fixes.json. It predates wider rings, stable light-pool composition, raised shadow clearance and strengthened interaction checks, so it is not final-source proof.
- Candidate walking/arrival screenshots had open dialogue covering feet. Preserved graphics-before-test-fix-walking-390.png and graphics-before-test-fix-arrived-1100.png. Final tests close the conversation via Escape before walking and use Find Me after arrival, then inspect unobstructed screenshots.

- Final post-review native/export/check/104 Node tests/browser gates all passed. Browser errors/external are empty at all three required viewports; final graphics images are newer than the final export. See verification.json. Earlier candidate and failure evidence is retained, not substituted for final-source verification.
