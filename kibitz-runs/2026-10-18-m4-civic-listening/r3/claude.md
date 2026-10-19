TOOL CHECK: PASS (read public/civic.js, public/core.js, public/game.js, public/hosting.js, public/programme.js, public/style.css, public/index.html, package.json, scripts/serve.mjs, scripts/build-fingerprint.mjs, tests/civic.test.mjs, tests/civic-fixture.mjs, tests/civic-browser.mjs, tests/browser-smoke.mjs excerpts). Did not run any tests. Pass/fail status of runs is the driver's to establish.

VERDICT: yes-with-fixes. The core wiring is ordered correctly and phase-guarded: civic restores after hosting, the unlock depends on validated hosting, and committed results are copied rather than aliased. Two UI contracts in C3 don't match how game.js actually works (announcement channel, cross-screen double-click), and two C4 evidence claims overstate what tests/civic-browser.mjs runs.

VERIFIED-CORRECT WIRING (so the judge doesn't re-litigate it)
- Restore order: public/core.js:158-162. opened -> epilogue -> programme -> hosting -> civic. civicAvailable(state) is evaluated after restoreHosting, so it sees the validated hosting.results. If someone reorders these, tests/civic.test.mjs:12-17 fails, because every stage goes through loadSave(serializeSave()).
- Unlock contract: public/civic.js:14 needs results.length === 4. restoreHosting (public/hosting.js:22-26) caps the count at 4 and keeps only the valid prefix. programmeIssue (public/programme.js:13) forces exactly 4 segments, so length 4 means a completed second gathering. Once opened, nothing in applyAction (public/core.js:50,54) can undo opened or shrink results, so the unlock cannot be revoked during a session.
- Action gate: public/core.js:101-105 checks civicAvailable(next) before changeCivic. changeCivic returns null for a no-op or a stale action, and core then returns the same state reference. tests/civic.test.mjs:16,18,25,31 assert identity.
- Immutable commit: public/civic.js:34 sets result = {...draft}. public/civic.js:25 sets draft = {...result} on restore. tests/civic.test.mjs:32 asserts draft !== result.
- Prototype/type rejection: public/civic.js:17 uses Object.hasOwn plus typeof string, and :31 also checks the action key with Object.hasOwn(fields, ...).
- Return target: public/game.js:200 re-queries #civic-hour after every render. returnFocus (public/game.js:94) falls back to an id lookup when the stored node was detached by updateAfterglow (public/game.js:170-181).
- Five-neighbor memory: every talk path goes through characterHeader (public/game.js:311,322-324,375,380,385,390,394), and civicResponse covers all five ids in public/world.js.
- Selector: tests/civic-browser.mjs:63 uses #neighbor-bea, which exists at public/game.js:501-502 (C4's retained QA-failure note is accurate).

MUST-FIX BEFORE BUILD
1. [C3 "announces selected authored label"] Interface mismatch between civicScreen and show().
   - show() (public/game.js:92) copies only `.grid-message` text into the persistent live region #modal-status (public/index.html:47). Otherwise it sets that region to ''.
   - civicScreen puts its message in a brand-new `<p id="civic-message" role="status">` with no grid-message class (public/game.js:199). That node is recreated by body.innerHTML on every edit.
   - Result: every civic edit clears the persistent live region, and the "X selected." text only appears inside a live region that is inserted already filled. Hosting does this differently and correctly (public/game.js:225 uses `<p class="grid-message">`), and the photo screen fills an existing empty status node (public/game.js:286,289).
   - [ASSUMPTION] Common screen-reader/browser combinations don't reliably announce content that is present when a live region is inserted. The re-focused aria-pressed button may partly make up for it.
   - Fix (smallest): add class="grid-message" to the civic message paragraph, or drop role=status from #civic-message and set $('#modal-status').textContent = message after show(). This keeps one announcement channel across screens.
   - Test: in tests/civic-browser.mjs after line 46, assert #modal-status text equals `${label} selected.`.

2. [C4 "double-click start"] The evidence claim doesn't match the test.
   - tests/civic-browser.mjs:51 double-clicks #civic-open (Welcome). #civic-start only gets a single click at :44.
   - No test anywhere double-clicks #civic-start or #civic-close.
   - Either correct the C4 wording to "double-click Welcome", or add the missing checks. Mirror the deterministic pattern hosting already uses (tests/browser-smoke.mjs:434, dispatchEvent('click',{detail:2}) on the replacement control) rather than relying on a layout-dependent dblclick that differs at each viewport.
   - See SHOULD-FIX 1 for the defect this gap hides.

SHOULD-FIX
1. [C3 "Double-click detail>1 ignored for start/open/close"] The guard only covers the three phase buttons (public/game.js:201-202). Their replacement screens contain unguarded controls:
   - After civic-start, planning renders the choice buttons (public/game.js:195,203) at scrollTop 0 (public/game.js:206). The second click of a double-click (detail=2) can land on a format/topic/notes button and silently change the draft. It is visible and reversible, but it is an unintended state edit.
   - [ASSUMPTION] Whether a choice button is under the pointer depends on viewport and copy length.
   - After civic-open or civic-close, the second click can land on #civic-back (public/game.js:204, unguarded). That closes the dialog immediately, so the player never sees the meeting/"We made room to be heard." screen. The comment at tests/civic-browser.mjs:50 shows this is a known concern, but it is only exercised by chance layout.
   - Fix: apply the same `if (event.detail > 1) return;` to the civic-choice and civic-back handlers (public/game.js:203-204). A repeated click on the same choice is already a core no-op (public/civic.js:32), so nothing is lost.
   - Add dispatchEvent detail:2 checks on #civic-topic-access after start and on #civic-back after open/close.

2. [C4 "checks all8choices at320/390/1440"] Each combination runs at exactly one width (tests/civic-browser.mjs:38, `[320,390,1440][index%3]`). 1440 sees only combinations 2 and 5, and 320 sees 0, 3 and 6. Reword to "8 combinations distributed across 320/390/1440 and both layouts", or loop widths if per-width coverage is intended.

3. [C4 "Current pre-review/final outcomes recorded separately, do not assume unfinished runs passed"] There is a stale-artifact hazard.
   - tests/civic-browser.mjs:69 writes artifacts/civic-browser-results.json only on full success. A failing rerun leaves the previous passing JSON and a mix of old and new screenshots (artifacts/civic-meeting-*.png and civic-memory-*.png already exist).
   - Fix: unlink the results JSON at startup, or write a {failed:true, error} record in the finally/catch.
   - Either way, the driver should accept the JSON only if its source.fingerprint equals the current buildInfo() (scripts/build-fingerprint.mjs:7-19).

4. [C3 "explicit Back/Escape/x returns to recreated event button"] Entering from Field notes (public/game.js:420) and then pressing Back sends focus to #civic-hour in the afterglow panel, not to #journal-button. close/returnFocus use focus({preventScroll:true}) (public/game.js:95,568), so at 320px the focused button may be off-screen.
   - tests/civic-browser.mjs:48,55,58 assert activeElement.id but not visibility. The bounds() visibility check (tests/civic-browser.mjs:29) only runs inside the modal.
   - Either accept this and state it in C3 (it matches the hosting precedent, public/game.js:214,226), or call scrollIntoView({block:'nearest'}) on the civic return target. Verify against the existing hosting behavior before changing shared close().

5. [C2 restore] Two restore branches have no test:
   - phase:'planning' together with a valid result. public/civic.js:25 must drop the result, and it does by inspection.
   - phase:'meeting'/'done' with a valid result but a corrupt draft. The draft must be replaced from the result.
   Add two assertions to tests/civic.test.mjs:37-42. Cheap, and they lock the "normalizes draft to frozen result" claim.

OPTIONAL / NICE-TO-HAVE
- [C1 "Native buttons change an original schematic SVG"] civicPlanSVG varies only by format (public/civic.js:60-62). Topic and notes change prose only. Reword C1, or accept it.
- [C5 config] The version string is hard-coded at public/game.js:605 ('0.11.0') and in package.json:3. Only tests/browser-smoke.mjs:43 asserts they are equal; tests/civic-browser.mjs does not. That's acceptable while browser-smoke stays required.
- [harness env] tests/civic-browser.mjs:11 ignores BASE_URL and doesn't capture server stderr. In contrast, tests/browser-smoke.mjs:13,21 honors BASE_URL and includes stderr in the exit error. Pipe stderr into the exit message at :17 for diagnosable failures.
- [C3 copy] In the idle phase the back button reads "Keep our place & return" (public/game.js:199), even though nothing has been saved yet. Use "Back to the block" when phase is idle.
- [cross-tab] There is no `storage` listener. Two open tabs are last-writer-wins, so a stale tab could persist planning over done. This is pre-existing and not civic-specific.
- [C3 characterHeader] After done, the civic response replaces the hosting response in all neighbor headers (public/game.js:98). Hosting memories remain reachable only through "Remember our second gathering" (public/game.js:176). That is consistent with "earlier memories remain reachable", but the earlier per-neighbor hosting lines (e.g. Celeste's "cool panel", tests/browser-smoke.mjs:423) are no longer reachable in conversation.

CUT THESE (over-engineering)
- None. Re-validating with restoreCivic(current, true) inside changeCivic (public/civic.js:29) is cheap and is what makes stale and prototype-tainted state impossible to advance, so keep it. Scroll restoration in civicScreen (public/game.js:190,205) overlaps with show()'s focus preservation (public/game.js:85-91), but it covers the case where innerHTML replacement changes scrollTop, so it isn't safe to remove.
