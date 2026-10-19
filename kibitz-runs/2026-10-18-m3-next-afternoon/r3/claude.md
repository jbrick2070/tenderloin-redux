TOOL CHECK: PASS (read public/programme.js, public/core.js, public/game.js, public/world.js, public/style.css, public/index.html, tests/programme.test.mjs, tests/browser-smoke.mjs directly). I had no shell, so nothing was executed: "59 Node tests pass" and "Chrome suite running" are NOT re-verified here (verify: `npm test` count and exit code; browser-smoke exit code on current source hash).

VERDICT: yes-with-fixes. State, save and guard wiring holds up. The faults are false copy derived from the published order and a focus-return contract that only holds for two of the four ways to close the modal. Both are small, checkable fixes.

MUST-FIX BEFORE BUILD

1. [Contract and code / programme.js copy; "misleading rule or event copy"] The title and responses claim an absolute position, but the code only checks relative order.
   - public/programme.js:39: `programmeTitle` returns "Stories open the afternoon" whenever stories precede beats. That covers 12 of the 16 valid orders, but stories are at index 0 in only 6 of them. Example: ['art','stories','beats','pause'] or ['pause','stories','art','beats'] gets the title "Stories open the afternoon" while the ordered list directly below shows something else first.
   - public/programme.js:45: Bea's storiesFirst line, "Stories first this time. I'll bring one to open with.", is false for the same 6 orders.
   - public/programme.js:46: Dez's beats-first line, "We start with a rhythm…", is false for ['art','beats','pause','stories'], which is valid (tests/programme.test.mjs:21 accepts it).
   - The wrong title shows up in five places: the poster h2 (game.js:154), the SVG <title> and heading (programme.js:56), the Field notes h3 (game.js:300), the editor's "Posted:" line (game.js:137), and Bea's characterHeader (game.js:52).
   - Smallest fix, option A (condition on the first slot): programme.js:39 `order[0] === 'stories' ? 'Stories open the afternoon' : order.indexOf('stories') < order.indexOf('beats') ? 'Stories before the rhythm' : 'A rhythm, a pause, a story'`.
   - Option B (relative wording): Bea → "Stories before the rhythm this time. I'll bring one."; Dez → "The rhythm comes before the stories, with room to settle afterward."
   - Why the tests miss it: browser-smoke.mjs:318-321 only publishes ['stories','beats','pause','art'], where stories happen to be first. The node test at programme.test.mjs:66-67 only checks one beats-first order with beats at index 0.
   - Regression check: in programme.test.mjs, loop over the 16 valid permutations (the helper is already at line 15). Assert that /open the afternoon/ appears in programmeTitle iff order[0]==='stories', and that /start with a rhythm/ appears in programmeResponse('dez') iff order[0]==='beats'. If you take option B, update browser-smoke.mjs:321's /Stories open/ assertion to match.

2. [Contract and code: "Modal close returns to afterglow entry"; sequencing] This only holds for the explicit buttons (game.js:148 `programme-close` and game.js:156 `programme-poster-close`), and those are the only paths tested (browser-smoke.mjs:291, 302-303, 309, 322).
   - The × button: game.js:448 `$('#close-modal').addEventListener('click', close)` passes a MouseEvent as `target`. Then game.js:49 `target instanceof HTMLElement` is false, so focus goes to the canvas.
   - Escape: there is no keydown handler (no "Escape" anywhere in game.js). The native dialog cancel fires the 'close' listener at game.js:449, and `modalReturnTarget` is still `canvas` (it is reset at the end of every prior close), so focus goes to the canvas.
   - A hidden ordering trap blocks the obvious fix of storing `$('#next-afternoon')` when the editor opens. Every programme action runs act() → updateUI() → updateAfterglow() (game.js:38, 75, 124, 127), and that rewrites `#afterglow` innerHTML and recreates #next-afternoon. A node captured before the action is disconnected by the time the modal closes, so game.js:449's `isConnected` fallback still sends focus to the canvas.
   - Smallest fix, three parts:
     (a) game.js:448 → `addEventListener('click', () => close(modalReturnTarget))`.
     (b) game.js:449 → resolve by id when the node is stale: `const t = modalReturnTarget.isConnected ? modalReturnTarget : (modalReturnTarget.id && document.getElementById(modalReturnTarget.id)) || canvas;`
     (c) Set `modalReturnTarget = $('#next-afternoon')` right after show() in programmeEditor (game.js:137) and programmePoster (game.js:154).
   - Regression check: in programmeCheck, open the editor and press Escape, then open the poster and click #close-modal. Each time, assert `document.activeElement.id === 'next-afternoon'`.

SHOULD-FIX

3. [Verification and limits: "Inspect 320/390/1440"; phone usability] programmeCheck only runs in the 1440×1000 contexts (browser-smoke.mjs:335-348). The 390 context (line 351) and the 320 context (line 472) never open #next-afternoon. The scroll/focus logic at game.js:136 and 149 (`modal.scrollTop = scroll; target.scrollIntoView({block:'nearest'})`) runs inside a dialog capped at max-height:90dvh (style.css:597). Its "focused control stays visible" claim has not been checked at phone height.
   - Add one 390px pass: open the editor, add all four, move one, then assert that the activeElement's boundingBox lies inside #modal's boundingBox and that `#modal` scrollWidth <= clientWidth (the same check browser-smoke.mjs:300 does at desktop).

4. [game.js:151-154 poster focus] On publish, show() can't find the old focus id 'programme-publish', so it sets scrollTop=0 and focuses the first enabled button, `programme-edit` (game.js:44-46, preventScroll:true). That button sits below a 640×460 image, the ordered list and four responses, so keyboard focus starts off-screen. This contradicts "scrolling keeps focused control visible".
   - Smallest fix: give the poster h2 `tabindex="-1"` and call `$('#modal-title').focus({ preventScroll: true })` after show() in programmePoster. Focus then stays at the top, where the view already is.

5. [World / world.js:208-223 draw order] The board (x 506-537, y -85..-46) is drawn after the bunting (world.js:209-213).
   - The bunting rope runs from (376,-57) to (620,-73), so it is at y ≈ -65.5…-67.5 across the board. Flag i=16 (x≈512, hanging to y≈-50) is also covered.
   - So a ground-standing board is painted in front of overhead bunting.
   - Smallest fix: move the board block (lines 218-223) above line 208 so the bunting draws over it.
   - The related test is also weak. browser-smoke.mjs:304 only asserts the whole-canvas hash changed, which proves "something changed", not that the strips are at the board in published order. Sample pixels at the four strip rects via the world transform instead (verify: World exposes a world→screen mapping usable from page.evaluate; `window.tenderloin.location()` at game.js:485 gives offset and scale).

6. [core.js:84-88 vs game.js:137 "native disabled post until valid/changed"] The UI disables re-posting an unchanged draft, but core accepts it: programme.js:24-26 returns a new state when order equals published. This is harmless today, but the UI and core contracts disagree.
   - Smallest fix: programme.js:25 → `if (programmeIssue(order) || order.join() === next.published.join()) return null;`
   - Add `assert.equal(act(s, {type:'programme-publish'}), s)` after a publish in programme.test.mjs.

OPTIONAL / NICE-TO-HAVE
- game.js:137: #programme-message has role="status", and show() also copies the same .grid-message text into the persistent #modal-status live region (game.js:47). Two live regions can double-announce, so drop role="status" from #programme-message.
- game.js:300: the Field notes button always reads "Plan another afternoon", even after a post, while afterglow switches to "Revisit our next afternoon ↗" (game.js:127). Mirror the conditional.
- game.js:304: the programme entry is appended after the "WHAT'S REAL, WHAT'S IMAGINED" and real-history blocks. Inserting it next to the fictional keepsake entry would keep the fictional items grouped, apart from the dated Compton's/history note.
- Config: the version string is hard-coded at both package.json:3 and game.js:485 ('0.8.0'), and README.md:45 still describes 0.7.0 as the latest, with no 0.8.0 or programme entry. Either derive the version or add a test asserting they match. [ASSUMPTION] README is in scope for the release note; the doc says manual reports are unchanged but says nothing about README.
- programme.js:49: Rook's "when the time comes" slightly implies a scheduled date. "If it happens" would fit the no-date framing better.

CUT THESE (over-engineering)
1. world.js:218 `state.programme?.published`: the optional chaining is dead. initialState (core.js:24) and loadSave (core.js:146) always set `programme`, and line 221 then dereferences `state.programme.published` without it anyway. Use plain access for consistency. This is cosmetic only.
Nothing else is materially over-built. The module is small and its guards are each exercised.

Wiring checked and found sound (no action): in loadSave, `opened` is computed before restoreProgramme (core.js:144-146), so restored projects aren't wrongly reset. World reads state through the `() => state` getter (game.js:480), so the board can't go stale. The poster SVG is used as an <img> data URL (game.js:154), so its id="title"/"desc" can't collide with other inline SVG ids. bind() is re-run on freshly rendered nodes each show(), so listeners don't duplicate.
