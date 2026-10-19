TOOL CHECK: PASS (read godot/main.gd, public/*.js, tests/*.mjs, godot/tests/study_test.gd, docs/ASSETS.md, godot/export_presets.cfg, godot/data/source_receipt.json)

VERDICT: no. The provenance inventory names files that do not exist, and the test suite asserts the wrong names. The "measured" pathfinding and teardown numbers can pass without measuring the cold path. Shift+Y changes saved state when it is pressed after the photo was skipped.

MUST-FIX BEFORE BUILD

1. [§3 ASSETS.md / tests/godot-data.test.mjs] The earcut vendor path is wrong in both the doc and the test.
   - docs/ASSETS.md:53 and tests/godot-data.test.mjs:164 both name `scripts/vendor/earcut-3.0.2.mjs`.
   - On disk, scripts/vendor/ holds only `earcut.js` and `earcut.LICENSE`.
   - scripts/build-godot-data.mjs:5 imports `./vendor/earcut.js`, and godot/data/source_receipt.json:11 hashes `scripts/vendor/earcut.js`.
   - The test only checks that the doc contains the string `scripts/vendor/earcut-3.0.2.mjs`, so it locks the wrong name in place.
   - Fix: rename the path in ASSETS.md:53 and in the token list at test:164. In the M6 test, also assert `existsSync` for every backticked `godot/...` and `scripts/...` path in the Godot table, so doc-to-disk drift fails CI.

2. [§3 ASSETS.md:51] Two source filenames are wrong, so the real files have no inventory entry.
   - The doc lists `godot/data/source/ynuv-fyni.metadata.json` and `godot/data/source/SF_BldgFoot_2017-05_description.pdf`.
   - The files on disk, and the keys in source_receipt.json:9-10, are `godot/data/source/metadata.json` and `godot/data/source/method.pdf`.
   - Fix: use the real names. The path-existence assertion from #1 covers this case too.

3. [§2 measure_local_performance] The pathfinding latency is measured with a warm cache, so the < 250000 usec budget is not shown for a cold A* run.
   - `cell_walkable_cache` (main.gd:207) is only ever written at main.gd:1674-1676 and is never cleared.
   - In tests/godot-browser.mjs the player already walks to Black Hawk with KeyH (:180) before the perf request (:269), so every route cell is cached when `find_path` is timed at main.gd:4405-4407.
   - The headless study_test runs the same walk before its M6 block (:907).
   - Also check whether `find_path(PLAYER_START, blackhawk_xz())` takes the straight-line shortcut at main.gd:1665. If it does, A* never runs and the "A* latency" metric is just the cost of segment probes. Also verify that PLAYER_START (main.gd:19) really is Turk & Taylor.
   - Fix: inside measure_local_performance, save `cell_walkable_cache`, assign `{}`, time the call, then restore the saved cache. Add `pathfind_cold_cache: true` and an `astar_used` / expanded-cell count to the returned dict, and have both tests assert `astar_used`.

4. [§2 measure_local_performance, main.gd:4415-4420] The Voices teardown metric is fake whenever Voices were never torn down.
   - If `last_voices_teardown_usec <= 0`, the function instead times `Array.clear()` on three literal dicts and feeds that into `within_budget` (:4437).
   - This is the normal case for a player who never enabled M5 Voices. It reports a "measured" M5 teardown that never happened.
   - Fix: delete the fallback. Report `voices_teardown_usec: -1` with `voices_teardown_measured: false`, and gate `within_budget` only on metrics that were actually measured. The tests already create a real teardown first (browser :261-267, study_test :905).

5. [§1 Shift+Y binding, main.gd:6297-6303 + skip_keepsake_photo main.gd:2574-2592] Pressing Shift+Y after the photo was skipped mutates state and announces something false.
   - main.gd:2668 advertises "Shift+Y exports keepsake SVG" once the epilogue is complete.
   - If `keepsake_photo.status == "skipped"` (start_packing_epilogue forces this at :2599-2607), Shift+Y routes to `skip_keepsake_photo()`.
   - That function has no `epilogue_packing` guard, so it rewrites `keepsake_photo`, calls `save_godot_state()` (incrementing save_seq and writing localStorage), and announces "can still take photo before packing starts", which is false after packing.
   - Fix: in skip_keepsake_photo, return false if `epilogue_packing` is set or the status is already "skipped". In the Shift+Y branch, when the status is not "taken", announce "No keepsake photo to export" and change nothing. Add a study_test case for Shift+Y after packing with a skipped photo.

SHOULD-FIX

1. [§1 parity contract] The brief cites JS functions that do not exist, and nothing tests parity.
   - The brief names `buildKeepsakeSvg`, `buildProgrammeSvg`, `buildTilePanelSvg`, `buildCivicPlanSvg` and `buildFilmFrameSvg`. The real exports are `postcardSVG` (public/keepsake.js:13), `programmeSVG` (programme.js:53), `tilePanelSVG` (hosting.js:69), `civicPlanSVG` (civic.js:58) and `filmFrameSVG` (film.js:67).
   - No test compares Godot output with JS output.
   - The keepsake output already differs byte-for-byte. The JS bunting y is printed at full float precision (keepsake.js:33 gives `72`, `79.5657...`), while Godot uses `"%.2f"` (main.gd:2746, giving `72.00`, `79.57`).
   - Fix: either state that parity is visual only, or format with `String.num` plus trailing-zero stripping. Add one parity check in godot-browser.mjs (it already imports public/core.js): import `postcardSVG`, call it with the saved `epilogue.photo` plus world data, and compare against `__tenderloinLastExportedSvg.svg`.

2. [§1 export bridge contract, main.gd:4371 vs :2768] The JS side and Godot side count bytes differently.
   - The JS side records `bytes: cleanSvg.length` (UTF-16 code units).
   - Godot announces `svg.to_utf8_buffer().size()`.
   - The footer contains two U+00B7 characters, so the two counts differ by 2.
   - Fix: use `new TextEncoder().encode(cleanSvg).length`.

3. [§3 tests/godot-browser.mjs:201] The real download path never runs in tests.
   - Setting `__tenderloinSuppressDownload = true` skips the whole Blob / createObjectURL / anchor-click path (main.gd:4373-4389).
   - Fix: in at least one viewport, leave suppression off and assert with `page.waitForEvent('download')` that the filename is `tenderloin-redux-godot-afternoon.svg`.
   - [ASSUMPTION] The anchor click runs inside Godot's `_process` through JavaScriptBridge.eval, not inside the keydown handler. Repeated exports may hit Chrome's "multiple downloads" prompt or user-activation limits. Verify in headed Chrome.

4. [§2 static memory] The static memory number is likely always 0 on Web.
   - [ASSUMPTION; verify against the Godot 4.7 Performance docs] `Performance.MEMORY_STATIC` is documented as unavailable in release builds.
   - `godot:export` uses `--export-release` (package.json:19), so the Web snapshot `static_memory_bytes` (main.gd:4455) would always be 0, while the brief claims "static memory" is measured.
   - Fix: drop the field or label it debug-only.

5. [§2 min_street_distance, main.gd:1569-1583] The default cutoff turns off the minimum search.
   - With the default `cutoff = INF`, `if best <= cutoff` is true on the first finite segment, so the function returns the first distance it finds, not the minimum.
   - The only current caller (main.gd:1608) passes a cutoff, so the bug is latent, but the signature invites misuse.
   - Its semantics also differ from min_wall_distance (main.gd:1525-1542), which seeds `best = cutoff`, uses strict `<`, and returns `cutoff` when nothing is nearer.
   - Fix: use `if cutoff < INF and best <= cutoff`, and document that a cutoff means "any hit within cutoff", not "true minimum".

6. [§3 tests/godot-data.test.mjs:190] The network-call check misses network calls made from JavaScript.
   - It only greps for `HTTPRequest|HTTPClient|WebSocketPeer`. main.gd runs arbitrary JS through `JavaScriptBridge.eval` (for example main.gd:4266-4401), so `fetch(`, `XMLHttpRequest`, `sendBeacon`, `new WebSocket`, `EventSource`, `import(` and `OS.shell_open` would all pass the check.
   - The code is clean today (grep shows none of them).
   - Fix: add these tokens to the regex.

7. [§3 tests/godot-browser.mjs:5-13] The stale-pck check and the size budget both have gaps.
   - The stale-pck check omits `godot/ENGINE_LICENSE.txt`, which is in the pck through include_filter (export_presets.cfg:6). Add it.
   - The 2 MB budget (:17) only covers `index.pck`. The Wasm runtime, which is the main download, has no budget. Say so in the brief and ASSETS.md, or budget it as well.

8. [§3 brief vs ASSETS.md] Two brief claims about ASSETS.md are inaccurate.
   - The brief says ASSETS.md "includes SHA256 hashes". The file has zero 64-hex strings; it defers to source_receipt.json (ASSETS.md:51, :53).
   - The brief says ASSETS.md covers "every file in the godot/ track". `godot/tests/study_test.gd`, `godot/main.gd.uid` and `godot/tests/study_test.gd.uid` have no row, and `godot/data/SOURCES.md` and `source_receipt.json` appear only as cross-references.
   - Fix: correct the brief, or add the rows.

9. [§1 study_test.gd:879-882] Several build_keepsake_svg rejection cases have no negative test.
   - Untested: duplicate participants, a non-String participant, an invalid palette, and an invalid layout. Validation for all four exists at main.gd:2683-2693.
   - Add one require for each.

OPTIONAL / NICE-TO-HAVE
- get_a11y_status_snapshot (main.gd:4483) builds the full keepsake SVG on every `sync_web_a11y_status`, so each announcement does an SVG build. Cache it keyed on `keepsake_photo`.
- apply_save_envelope (main.gd:5236; called from :5909 and mid-session in study_test:877) does not clear `last_exported_keepsake_svg`. That is harmless at startup, but `keepsake_exported` would be stale if the function is ever reused mid-session.
- The last object URL is never revoked (main.gd:4375-4381). Revoke it on `pagehide`.
- The `find_path` collinear collapse (main.gd:1750) calls `segment_walkable` at 0.2 m steps for every raw node, using the uncached `is_walkable_point`. This is part of the budgeted latency, so report it separately if #3 shows it dominates.

CUT THESE (over-engineering)
1. The `keepsake_svg_ready` snapshot field (main.gd:4483). The DOM summary (main.gd:4306) and godot-browser.mjs never read it, and it costs an SVG build on every sync. Removing it changes no asserted behaviour.
2. The `static_memory_bytes` field (main.gd:4455), if SHOULD-FIX #4 is confirmed. It does not gate `within_budget`, and a constant 0 in release is misleading evidence.
3. The synthetic teardown fallback (main.gd:4416-4420). See MUST-FIX #4: both tests already create a real teardown first, so nothing that depends on a real measurement loses coverage.
