# Driver anchor

VERDICT: yes-with-verification-pending. Codex read the current source and remains sole writer/judge.

CONFIRMED: update_route_ribbon is called by route starts, stop, arrival, manual movement, overview and rejected street routes. Updating the label before its early returns prevents a stale Stop label when there is no path. Actual activity is current_path, not camera-follow or selected-neighbor state.

CONFIRMED: stop_walking clears route, mural/speaker/history targets and deferred Celeste/Rook flags. It retains selected_neighbor by design, preserving Next cycling, and never writes saves or awards progress. Native tests now exercise those cancellation boundaries.

CONFIRMED: press-time activation avoids the release-time Stop/Next race. The native suite exercises real ui_accept down/up, including a held interval and unchanged position/camera/save. Browser source likewise holds mouse down, observes stopped state, then verifies release does not start a new route.

MUST-FIX if found: stale label on any production path, a Stop press that starts another route, delayed arrival/reward after cancellation, changes to physical geography or save data, browser checks that accidentally bypass real inputs, or fixture state leaking into subsequent tests. No confirmed remaining implementation defect from driver inspection; native/check/104 tests pass.

SHOULD-FIX/verify: inspect final desktop/390/320 walking/stopped screenshots, require fresh snapshot frames, bound actual hit targets, preserve Escape/Find Me/Map semantics, and run all five gates after any reviewer fixes. Existing view geometry and typography should remain unchanged. Browser test is pending; no runtime claim beyond completed native/check/Node gates.
