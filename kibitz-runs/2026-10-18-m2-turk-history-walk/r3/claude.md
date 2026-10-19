TOOL CHECK: PASS (read public/core.js, camera.js, history.js, world.js, game.js, index.html, style.css excerpts, scripts/serve.mjs, scripts/build-fingerprint.mjs, tests/history.test.mjs, tests/camera.test.mjs, tests/browser-smoke.mjs excerpts, docs/SOURCES.md excerpts, public/data/streets.osm.json excerpts).

VERDICT: yes-with-fixes. The core contracts hold: additive v1 save, no progression gate, actual shared nodes, BOUNDS/OPENING_BOUNDS split, and init order (walkable reset before camera construction). But the Black Hawk label you see does not match what you can tap. Path-search and facade constants are hard-coded with a margin no test checks. The "desktop reload follows" claim has no browser evidence.

Hand-computed reference values, using core.js:151-160 project() and the history.js:6-8 coordinates: Jones x≈-732, Leavenworth x≈-1465, Hyde x≈-2198 (y≈0). BLACK_HAWK ≈ (-2198, -48). Phone (390px) route overview minimum scale ≈ (362)/3250 ≈ 0.111. [ASSUMPTION: canvas width ≈ viewport width minus page padding; verify with window.tenderloin.location() on the 390 context.]

MUST-FIX BEFORE BUILD

1. [world.js / game.js — "schematic rendering vs hit targets"] The Black Hawk chip is drawn but is not a hit target.
   - world.js:231 draws the chip at BLACK_HAWK.y - 44*max(1,1/scale). Below scale .22 it is also shifted +250 world px in x.
   - World.hit() (world.js:75-80) only creates label-hit regions for NEIGHBORS (world.js:77). For BLACK_HAWK it uses only the marker point, with radius max(28, 22/scale).
   - Phone route overview (scale ≈ .111): the marker disc (world.js:229, radius 11 world px) is about 2–3 screen px, so effectively invisible. The visible "Black Hawk" chip is ~28 screen px right of it, outside the ~198 world-px hit radius. Tapping the chip falls through to moveTo() (game.js:327-330). That point is off-street (≈250 px from Hyde's centerline), so the user gets the toast "Keep to the streets and sidewalks."
   - Follow scale (.85): the chip centre is ≈52 world px above the marker, beyond the 28 px radius. Tapping it walks to a walkable point on Hyde with walkTarget=null, so no note opens. nearest() (world.js:82, <40) also will not catch it.
   - Neighbor chips are tappable, so this is an inconsistent affordance on the primary route control.
   - Fix (smallest): in hit(), add a label region for o.id === 'blackhawk' that mirrors the world.js:231 geometry (same x offset rule, y = o.y - 44*labelScale, width from text length * labelScale). Add a camera.test case like the Rook label test (camera.test.mjs:46-52) at scales .111, .28 and .85.

SHOULD-FIX

1. [core.js findPath — path-search budget] The BFS cap of 12000 (core.js:181) is a fixed constant, but the searchable area grew about 3.8× (BOUNDS.left -300 → -2400, core.js:172).
   - My estimate of walkable 10 px cells: Turk ±60 across 3250 px plus 5 N-S streets × 68 rows ≈ 7.3k. Margin is about 40%. [ASSUMPTION: hand estimate; verify by instrumenting `i` at return.]
   - A route to a far stop has to expand nearly the whole walkable set first.
   - When the cap is hit, findPath returns [] and game.js:305 shows "That route is outside this small scene", which is a misleading message.
   - No test hits this case. history.test.mjs:29-30 only checks goals that fail walkable() before the BFS starts.
   - Fix: derive the cap from BOUNDS, e.g. ceil((right-left)/step+1)*ceil((bottom-top)/step+1), or add a unit assertion that the explored count stays below the cap for initialState → BLACK_HAWK.

2. [core.js:166-173 / world.js:20 — per-click CPU] walkable() runs streetDistance over every segment of all 41 ways for each BFS neighbour, synchronously inside the pointerup handler (world.js:50 → game.js:304/328).
   - The data includes Eddy Street ways (e.g. streets.osm.json:84-118, lat ≈37.7835 → y ≈ -524). That is beyond BOUNDS.top=-460 plus the 60 px margin, so those segments can never pass walkable(), yet they are tested on every call. The complete N-S ways also extend past the bounds.
   - Fix (smallest): in makeWays, or once in findPath, drop ways/segments whose bbox is outside BOUNDS expanded by 60. Or memoize walkable per snapped cell for the lifetime of `ways`. [ASSUMPTION: noticeable delay on low-end phones; not measured. Verify with performance.now() around findPath in the 390 smoke context.]

3. [world.js:158 — hard-coded facade x-ranges] The western facades are literal x-ranges [-2110,550], [-1380,550], [-650,335], not derived from WEST_INTERSECTIONS (history.js:5-9).
   - With today's data the gaps to road edges (half-width 60.5, world.js:152) are only 21–37 px.
   - Any re-extract that shifts a node redraws buildings over roadway with no test failure.
   - Fix: compute each block from adjacent cross.x ± (61 + margin). Alternatively, add a unit assertion that each facade interval does not overlap [cross.x-61, cross.x+61].

4. [browser-smoke.mjs:253 vs :351 — evidence gap for "desktop reload at western saved position also follows"] historyWalkCheck runs only in the 390px mobile context (browser-smoke.mjs:267-268, 351). Phone follows anyway because width < 600 (camera.js:11), so the browser check at :70-71 cannot distinguish the new player.x < OPENING_BOUNDS.left branch.
   - The desktop branch is covered only by a bare Camera(940,…) unit test (history.test.mjs:47-48), not through World.measure/init ordering (game.js:406-407).
   - Fix: in the 1440 context, seed a v1 save with player = BLACK_HAWK via addInitScript (the existing pattern at browser-smoke.mjs:353). Reload and assert #camera-status === 'Following you' and the snapshot player x < -2100.

5. [world.js:162-165 — route-overview legibility] The cross-street labels are fixed 12 world-px text. At the phone route overview (~.111) they render at about 1.3 screen px, so the "full-route overview" shows no readable Jones/Leavenworth/Hyde names. Its only legible label is the Black Hawk chip.
   - Fix: scale these labels by max(1, 1/scale) the way chip() does (world.js:139), or draw them as chips when scale < .22.

6. [docs/BUILD_STATUS.md:3,5 — release sequencing] It still says "Version 0.5.0". Meanwhile package.json:3, game.js:412 and the README say 0.6.0.
   - Update it only after the Chrome suite finishes and artifacts/browser-results.json is written (browser-smoke.mjs:379).
   - The fingerprint covers public/ only (build-fingerprint.mjs:6-17). Any public/ fix from this round must come before the final smoke, or the recorded fingerprint is stale.

7. [game.js:305 — failure feedback while modal is open] goTo() from the history-walk modal (game.js:262-264) shows the "no route" toast without closing the modal. #toast is inside .world-panel (index.html:29), which is inert or behind the showModal backdrop. Fix: call closeIfOpen() before the toast in the !path.length branch, or write the message into #modal-status.

8. [game.js:265 — silent cancel] "Show the whole route" calls stopWalk() and drops an in-progress walk without any feedback, while every other cancel path toasts (game.js:399). Fix: toast "Stopped walking" if walkPath.length was non-zero, or don't stop the walk at all. Walking already pauses while the modal is open (game.js:342) and resumes after close.

OPTIONAL / NICE-TO-HAVE
- game.js:412 hard-codes version '0.6.0', duplicating package.json:3. The smoke test catches drift (browser-smoke.mjs:40), but `npm test` does not. A unit test reading package.json would close the gap.
- Downgrade path: blackhawk lives in `core`, not `optional`. A pre-0.6 build loads and re-saves without it (old initialState lacks the key), and its BOUNDS reset the western player to the start. Acceptable, but say so in BUILD_STATUS rather than calling it "untouched". [ASSUMPTION: older build's loadSave mirrors core.js:116-145 minus line 135.]
- index.html:31: "History walk ↗" exposes the arrow to screen readers. The neighbors button wraps its arrow in aria-hidden; match that.
- Doc wording, "paused/cancelable walking": Stop walking clears walkPath/walkTarget (game.js:308), so it cancels rather than pauses. "Resume" means re-choosing the destination, which is what the smoke test at browser-smoke.mjs:52-56 does. Align the wording or the route-status text ("Choose Stop walking to pause", game.js:336).
- Field notes (game.js:269) have a Compton's entry that reflects state.history but no Black Hawk entry reflecting state.blackhawk. The saved note can only be reached through the walk modal.
- Verify: "All 27 prior selected ways compare exactly equal including geometry". public/ is untracked in git (only e626a04 exists), so no prior streets.osm.json is available to diff here.

CUT THESE (over-engineering)
1. The +250 world-px chip x-shift below scale .22 (world.js:231). It is a positioning patch that creates the render/hit split in MUST-FIX 1. Once the chip has a real hit region, an edge-aware clamp (keep the chip inside the viewport) is simpler, and the magic offset goes away. Safe to cut because no test asserts the offset.
2. Nothing else qualifies. The remaining additions (two-stop directory, route overview, saved-note reread, return to Bea) are each small and wired to existing goTo/interact paths.
