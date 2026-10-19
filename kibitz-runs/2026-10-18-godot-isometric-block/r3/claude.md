TOOL CHECK: PASS (read input.md, godot/main.gd, scripts/build-godot-data.mjs and the other cited files successfully)

VERDICT: yes-with-fixes. The data pipeline matches what Godot reads. Three viewer wiring defects contradict G2 claims and are not caught by the current tests: previous-from-start skips a building, zoom inverts on mobile after overview, and there is a hard-coded cross-service URL.

MUST-FIX BEFORE BUILD

1. [G2 next/previous wrap] godot/main.gd:7 sets `selected := -1`. godot/main.gd:114 computes `posmod(selected + direction, size)`. If the first press after load is "Previous", that is posmod(-2, 58) = 56. It selects the second-to-last building, and building index 57 is skipped. godot/tests/study_test.gd:18-27 only presses Previous after 59 Next presses, starting from index 0, so this initial-state path is never exercised. The "previous wraps" claim is only half-tested.
   Fix: in choose_next, `if selected < 0: selected = 0 if direction > 0 else data.buildings.size() - 1` else posmod. Add one study_test case on a fresh instance: choose_next(-1) must give 57.

2. [G2 zoom / size-adaptive controls] godot/main.gd:136 writes an unclamped fitted `view_size`. godot/main.gd:160 clamps zoom to [45, 400]. At narrow widths the fit needs a view_size above 400. [ASSUMPTION, rough estimate]: the bbox in scripts/build-godot-data.mjs:8 is about 290 m x 190 m. Its isometric screen width is about 340 m, and the available width is 366 px (at 390) or 296 px (at 320). Height-keyed ortho size is then roughly 650-800 m. If so, "Zoom out" sets clamp(view_size*1.25) = 400, which zooms IN sharply. "Zoom in" (x0.8) also snaps to 400, a larger jump than intended. study_test.gd:28-48 never presses zoom after overview, so this passes today.
   verify: print study.view_size after overview() at 390x667 and 320x667.
   Fix: in overview() store `overview_size = view_size`. Clamp zoom to [45, maxf(400, overview_size * 1.25)]. Add a test: after overview, zoom(1.25) must not decrease view_size.

3. [G2 "no external runtime service" / G3 config] godot/main.gd:196 hard-codes `OS.shell_open("http://127.0.0.1:4173/")`. This is a runtime dependency on a second server (scripts/serve.mjs, per docs/BUILD_STATUS.md:181) that nothing starts or checks.
   - In the Web export (export_presets.cfg) it calls window.open to a different origin. tests/godot-browser.mjs:13 records requests only on `page`, not on popups, so its "zero external requests" assertion would not see this request. [ASSUMPTION: Playwright popup requests are not emitted on the opener page's 'request' event.]
   - The port is not configurable. serve-godot.mjs:20 honours GODOT_PORT, but nothing configures 4173.
   Fix (smallest): remove the button for this slice. It is outside the geography-study scope and the grid stays 3x2 / 2x3 with 5 buttons. Alternatively, read the URL from a ProjectSettings custom key and hide the button when `OS.has_feature("web")`.

SHOULD-FIX

1. [G2 camera fit, startup sequencing] godot/main.gd:82-83 runs make_ui() and then call_deferred("overview"). overview() reads `header.get_global_rect().end.y` (main.gd:129-131) on the first deferred flush. The autowrapped title and info Labels (main.gd:176, 180) only get their wrapped height after the PanelContainer and then the VBoxContainer sort. Those sorts are themselves deferred, and the VBox re-sort is queued after `overview`. On narrow first load, the header can be measured shorter than it renders, so footprints can sit under the header. study_test.gd:29-32 awaits two frames before calling overview(), so it does not reproduce startup order. [ASSUMPTION: Godot 4.7 Container queue_sort ordering.] The browser test (godot-browser.mjs:17-23) only checks for a pixel change, not overlap.
   Fix: in _ready, replace call_deferred("overview") with `await get_tree().process_frame; await get_tree().process_frame; overview()`, or connect `header.resized` to overview while in overview mode.

2. [G2 size-adaptive] main.gd:198-202 connects `size_changed` only to `resize_controls`. Rotating a phone or resizing the canvas (export_presets.cfg `html/canvas_resize_policy=2`, adaptive) re-flows the buttons but never re-fits the overview, and the fitted target and size go stale. Neither test resizes after load.
   Fix: track `in_overview` (true after overview(), false after choose_next/zoom). On size_changed, call overview() deferred when in_overview is true.

3. [G2 labels/contract] overview() (main.gd:126-142) does not clear `selected`, does not restore wall_material on the highlighted mesh, and does not reset `info.text`. After Next and then Overview, the screen shows all 58 footprints while the label still claims one building ID and height, and that building stays teal.
   Fix: in overview(), un-highlight, set selected = -1, and restore the header text from main.gd:181. This also fixes item 1's entry point for later presses.

4. [G2 native keyboard evidence] study_test.gd:43-48 calls `grab_focus()` and then `next.pressed.emit()`. That proves the signal is wired, not that a key activates the focused button. godot-browser.mjs:24-26 presses Tab and Enter but asserts nothing, and it writes `keyboardAttempted: true` into artifacts/godot-browser.json. The claim "actual control focus/emission separately native-tested" is therefore weaker than it reads.
   Fix: after grab_focus, `Input.parse_input_event(InputEventAction ui_accept pressed)` (plus the release), wait one frame, and assert selected advanced. Either drop the browser Tab/Enter lines or assert a screenshot change.

5. [Test harness exit code] study_test.gd:6-10 `require` calls quit(1) and then assert(false), but execution can continue. A failure in the final size iteration (lines 33-48) is followed synchronously by the PASS print and quit(0) at lines 49-50, with no await in between. The exit code can then end up 0 and the PASS line is still printed.
   verify: whether GDScript `assert` aborts the coroutine in a headless debug run without a debugger.
   Fix: keep a `failed` flag, `return` from run() on the first failure, and print PASS / quit(0) only when no failure occurred.

6. [G3 provenance/hash coverage] scripts/build-godot-data.mjs:50-53 reads public/data/streets.osm.json. That input is not hashed in godot/data/source_receipt.json:4-10 or in buildings.json (only `source_sha256` of the GeoJSON, build-godot-data.mjs:49). tests/godot-data.test.mjs:15 compares only `output.buildings` with a fresh derive, so stale or edited `output.streets` goes undetected. No test or build step verifies the receipt hashes, including scripts/vendor/earcut.js. The receipt is a document, not a check.
   Fix: (a) add `streets_sha256` to the build output and the receipt; (b) in godot-data.test.mjs, assert `output.streets` deep-equals a re-derivation; (c) in the test, assert sha256 of every file listed in source_receipt.json `hashes`.

7. [G3 port config propagation] scripts/serve-godot.mjs:20 accepts GODOT_PORT, but tests/godot-browser.mjs:13-14 hard-codes 4174 in both the navigation URL and the external-request allow-list. With GODOT_PORT set, the test hits the wrong port or flags every request as external.
   Fix: `const base = 'http://127.0.0.1:' + (process.env.GODOT_PORT || 4174) + '/'` and use it in both places.

8. [G3 sequencing/orchestration] The required order is: build-godot-data, godot --import, the study test, mkdir artifacts/godot-web, --export-release Web, start the server, then godot-browser.
   - package.json:7-16 has no scripts for any of it.
   - docs/GODOT_APPROACH.md:24-37 never lists the study_test command at all.
   - The docs do not say that serve-godot must already be running before `node tests/godot-browser.mjs`. The browser test does not start the server.
   - package.json:12 `check` does not syntax-check scripts/serve-godot.mjs or tests/godot-browser.mjs.
   Fix: add `godot:data`, `godot:test` (`godot --headless --path godot -s tests/study_test.gd`), `godot:serve` and `godot:browser` scripts. Add the two files to `check`. Document the study_test command and the "server must be running" prerequisite in GODOT_APPROACH.md.

9. [G2 browser test coupling] godot-browser.mjs:20 clicks at hard-coded pixel offsets: `size.height - 98`, x at .25 or .83. These offsets are derived from main.gd:189/200 offsets (-124/-174), the 50 px button height, the default grid separation and button order. The comment "bottom-right top row" is wrong for the 390 px layout, where x=.25 hits the left column of row 2. Any UI change silently retargets the click, for example removing the button in MUST-FIX 3 shifts the order in the 2-column grid.
   Fix: compute the click point from the same constants and the button order, with a comment, or expose a debug print of the Next button rect in the export and read it.

OPTIONAL / NICE-TO-HAVE
- build-godot-data.mjs:39 `ground_m_navd88: Number(p.gnd_mediancm)/100` is unvalidated. A NaN value serializes to null silently. Add a Number.isFinite check or explicitly allow null.
- main.gd:118-121: the selection centroid averages `polygons[0].vertices`, which includes courtyard hole vertices (vertices = rings.flat(), build-godot-data.mjs:37). It is fine for framing; using rings[0] would be slightly better.
- main.gd:16: JSON.parse_string returns null on a malformed file and is assigned to a typed Dictionary with no message. Add push_error plus an early return.
- main.gd:88 `save_png("res://../artifacts/...")`. verify: Godot 4.7 accepts a res:// path that escapes the project root. ProjectSettings.globalize_path("res://").path_join("../artifacts/...") would be safer.

CUT THESE (over-engineering)
1. The "Browser game" button (main.gd:196). It is not in the slice scope (G2 lists study controls only), creates the cross-service coupling in MUST-FIX 3, and nothing tests it. It is safe to cut because the browser game is reachable directly at the documented URL (docs/GODOT_APPROACH.md:37).
2. The Tab/Enter step in godot-browser.mjs:24-26 and the `keyboardAttempted: true` field, unless it is turned into an assertion. Unasserted output in an evidence artifact reads as proof. It is safe to cut because native keyboard proof belongs in study_test (SHOULD-FIX 4).
