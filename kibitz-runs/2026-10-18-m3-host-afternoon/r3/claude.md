TOOL CHECK: PASS (read public/hosting.js, public/core.js, public/game.js, public/world.js, public/gathering.js, public/programme.js, public/style.css, package.json, scripts/build-fingerprint.mjs, tests/hosting.test.mjs, tests/browser-smoke.mjs)

VERDICT: yes-with-fixes. The core contract holds: frozen order, valid-prefix restore, copied art outcome and stale-ID rejection are wired correctly through core.js -> hosting.js -> game.js/world.js. The defects are in gate sequencing (the browser suite only reaches hosting after full pack/return), one unverifiable claim in the plan, and a few visual/interaction edges.

MUST-FIX BEFORE BUILD

1. [Verification gates] The browser gate never exercises hosting with first-gathering supplies still on the block or with loans pending.
   - Evidence: tests/browser-smoke.mjs:443-445 runs epilogue() before hostingCheck(). epilogue() packs at :261 and returns every loan at :265. So when hostingCheck runs, gatheringScene().items is empty: packing removes seats, and returned items are filtered out at public/gathering.js:25. freeVisitorCells() (gathering.js:11-14) then returns all 10 unreserved cells.
   - What is never browser-tested: visitor placement around a live table, seats and speaker; the row-0 visitor and new-panel overlap (see SHOULD-FIX 3); and the "existing pending-loan actions/dialogueIDs preserved" claim [Current code §game.js] while hosting is active. In that case talk() at game.js:298-299 goes to returnLoan(), whose characterHeader now shows the hosting response at game.js:54.
   - The unit test at tests/hosting.test.mjs:80-97 does run packing=false for cell validity, but it checks no rendering and no return-during-hosting path.
   - Fix (smallest): in the final source-matched rerun, add one branch that runs hostingCheck before epilogue(). Begin hosting, complete one slot, then pack and return one loan (#return-event-loan) while hosting is active. Assert the dialog IDs, then finish. Otherwise the plan's "Supplemental ... before packing" item has no automated backing.

2. [Verification gates] "Final source-matched full rerun required" must come after the partner freeze and after any fixes from this round. It must use the /__build identity check, not the earlier harness run.
   - The identity check is tests/browser-smoke.mjs:427-428 against scripts/build-fingerprint.mjs. Note that buildInfo() hashes only public/ (build-fingerprint.mjs:6-17). It does not catch edits to tests/ or scripts/.
   - Fix: the before/after archive hash described in §Owned lock must cover tests/, scripts/ and package.json as well as public/. buildInfo alone is not enough. [ASSUMPTION] that the driver might reuse buildInfo as the archive hash. Verify: what the driver's source_before/after.json actually hashes.

SHOULD-FIX

1. [Current code §game.js] The plan says "Existing shared queuedclose guard stays." No such guard exists in source.
   - Searching "queue" under public/ only finds findPath's BFS queue (public/core.js:204-214). game.js has no queued-close logic. The only close guard is the `if (!modal.open)` check in the dialog 'close' listener at game.js:490.
   - Fix: correct the plan text to name the real mechanism (game.js:489-490 plus returnFocus at :50). Do not claim a guard that is not in source. Verify: whether a guard was removed in an earlier round.

2. [Current code §game.js] A double-click on the commit button can complete two slots.
   - host-complete (game.js:164) commits, then re-renders synchronously and binds a new #host-complete with the next slot's id. The core stale-ID guard (hosting.js:47) only rejects the old id. If the second click of a double-click lands on the new button, it is a valid completion of the next slot, committing the default draft unseen (e.g. pattern 85, tiles [0,1,2,2,1,0]).
   - Keyboard is safe because focus moves to #modal-title (game.js:167). Whether the mouse case triggers depends on layout. Verify in 390/1440 layouts.
   - Fix (one token): in the host-complete handler, return early when `event.detail > 1`. Keyboard-synthesized clicks have detail 0, so keyboard use is unaffected.

3. [Current code §world.js] The new tile panel overlaps the facade/awning band. The in-game copy says it is away from buildings.
   - The panel is drawn at y -90..-59 (world.js:211). The block-face buildings end at y -81 (world.js:178, building(239,-455,142,374)). The awning [253,104] spans x 253..357, y -94..-81 (world.js:187-188).
   - So the panel covers 9px of awning/facade. game.js:154 says "away from real buildings and existing art". By comparison, the first mural sits at y -80 (world.js:234) and stays clear.
   - The overhead bunting string passes y≈-64..-61 across the panel's lower tile row (-74..-63) (world.js:229).
   - A row-0 visitor at col 2 (visitorPoint x≈298, y -32, head top ≈ -65 per person() world.js:143) is drawn after the panel and covers its bottom edge.
   - Fix (smallest): drop the panel 9px, rect(275,-81,...) with tiles and legs offset +9. Or soften the copy at game.js:154. Confirm in the required "actual board/art" visuals with supplies present (see MUST-FIX 1).

4. [Current code §hosting.js / §world.js] The plan says "no packing/photo/return dependency." In core that is true (core.js:94-98). The world view is still coupled: world.js:259 computes hosting visitor cells from freeVisitorCells(scene.items), and scene.items shrinks on pack and on each return (gathering.js:25).
   - Result: returning Thanh's table or the speaker during the quiet interval moves the second gathering's visitors and stools (world.js:260). The plan says only the "Quiet choice changes positions."
   - Fix: either state this in the plan as accepted behavior, or pass the un-packed footprint (accepted supply cells, ignoring packing/returned) into freeVisitorCells for hostingGuests only. Add an assertion that positions are stable across 'pack' and 'return-loan' at fixed host state, next to tests/hosting.test.mjs:81-86.

5. [Current code §game.js afterglow] Once hosting starts, updateAfterglow overwrites the packing status heading.
   - game.js:137 replaces the .afterglow-heading h2 with 'Your opening afternoon.' This happens after game.js:126 rendered 'A little thank-you lap.' or 'Ready for another afternoon.' The loan-status headline is lost whenever hosting.order exists. The body <p> still carries it.
   - Fix: when packing is true, keep the packing h2 (or append it). Apply the override only when !packing.

6. [Current code §game.js] The completion handler can throw if the commit is rejected.
   - game.js:164 calls activitySummary(state.hosting.results.at(-1)) unconditionally. If the act were rejected with zero results, this throws a TypeError in the click handler (hosting.js:54 reads result.id). That is outside the frame() try/catch. If rejected with results present, it re-announces the previous summary as new.
   - Fix: snapshot results.length before act(), and only pass a summary if the length increased.

OPTIONAL / NICE-TO-HAVE
- [Verification gates] tests/hosting.test.mjs:80-97 checks visitor clearance only against NEIGHBORS and PLACES. Add the fixed prop rects (panel 275..326/-90..-50, board 506..537/-85..-46, paint case 479..493) to the clearance check. Then "eventfreecell clearances" covers the props this round added.
- [Current code §game.js] show() at game.js:46-47 focuses the first button, then hostingScreen at :166-167 refocuses the title or control. That is a double focus move per edit and can cause double announcements. Low priority; verify with a screen reader later (already listed as out of scope).
- [Package] The version is hard-coded in two places: package.json:3 and game.js:526. Only the browser gate cross-checks them (tests/browser-smoke.mjs:43). A one-line node test that imports package.json and greps game.js would catch drift without Chrome.

CUT THESE (over-engineering / noise)
1. [Intro paragraph 2] The partner-selection history (Gemini catalog pin, prior 15-minute failure, AGY/Astra exclusions) has no build or wiring content. It is safe to cut from the integration plan and keep in the run log. Nothing in source depends on it.
2. No code-level over-engineering found in hosting.js. The restore-on-every-action pattern in changeHosting (hosting.js:35) is redundant with applyAction's structuredClone (core.js:45), but it is cheap and gives a single validation path. Keep it.

Not found / confirmed OK (so the judge does not re-chase these)
- Restore ordering: core.js:151 computes opened before restoreHosting at :154. Prefix break on the first invalid slot is at hosting.js:22-26. Art is deep-copied at hosting.js:16 and :49. Prototype keys are guarded with Object.hasOwn (hosting.js:11-14).
- Frozen order vs future poster: host-start copies `published` once (hosting.js:36-38). The board prefers hosting.order (world.js:221). Covered by tests/hosting.test.mjs:63-71 and browser-smoke.mjs:400-409.
- Sound independence: hosting never reaches music.update (game.js:73 passes only progress plus opened). Dance pose motion is reduced-motion-gated in gathering.js:46-48 via world.js:135.
- package.json:12 `check` includes public/hosting.js. `node --test tests/*.test.mjs` picks up tests/hosting.test.mjs.
