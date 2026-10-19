# Driver judgment — first playable, scoped r3

One external call: native Claude CLI, requested `claude-opus-5-5`, high effort. Successful process rc=0, substantive file-reading report with TOOL CHECK: PASS. Requested model/effort receipts and raw report are retained. No AGY Opus call or duplicate GPT reviewer. Credit usage was not exposed; no cost measurement is claimed. This is a single implementation-review round, not a four-round campaign.

The driver checked the report against actual source. The review's original line numbers refer to the reviewed revision; references below identify the resulting functions. The driver made small independent compass/text/CSS/test-harness corrections while the reviewer ran, then applied the grounded review fixes. `source_before.json` preserves the initial hashes; `source_after.json` records the final tested source. Raw reviewer output was not edited.

| Reviewer claim | Grounding and decision |
| --- | --- |
| MUST 1: restart can dereference absent world during loading/fetch failure | CONFIRMED in showSettings/restart. Guarded `world.path`; goTo now explains an unavailable map. Browser interception of a failed street fetch exercises restart and asserts no unhandled page error. |
| MUST 2a: browser checks can hit the wrong server/port | CONFIRMED in old hard-coded 4173 harness. The test now starts its own server on an OS-assigned port (or honors an explicit BASE_URL/PORT) and checks a hash of served public files against this checkout. New scripts/build-fingerprint.mjs supplies the identity. Temporary QA server is cleaned up. |
| MUST 2b: Chrome dependency is not generic bundled Chromium availability | CONFIRMED. Chrome remains the tested/default channel, explicitly documented. BROWSER_CHANNEL selects another installed channel; bundled uses Playwright's installed Chromium. No untested browser coverage claimed. |
| MUST 2c: keyboard evidence overclaimed | CONFIRMED: old evidence meant movement only. Renamed keyboardMovement; added E interaction, Enter activation of mandatory editor cells, retained-focus assertions and movement with audio-button focus. Full keyboard-only playthrough/screen-reader audit remains unverified. |
| MUST 3: editor cell focus disappears on rerender | CONFIRMED in show(), anonymous cell templates. Added stable cell/mcell IDs so show restores focus. Browser tests check focused IDs after successful and rejected placements. |
| SHOULD 1: frame/init error handling fragile; roundRect absent | CONFIRMED as failure paths. Added rounded-rectangle fallback, one frame-error recovery dialog, and safe loading-overlay construction. Loading overlay is removed after successful UI/welcome setup. Unsupported-browser visual quality is not claimed tested. |
| SHOULD 2: movement suppressed with audio-button focus | CONFIRMED. Movement ignores only editable controls; E/Enter retains button/link default activation. Browser test moves with arrow keys after sound-toggle focus. |
| SHOULD 3: touch targets tiny and prompt not actionable | CONFIRMED. World hit radius has a minimum screen-space size; the nearby prompt is now a real button. Mobile smoke activates it and reaches Bea. Enlargement/zoom and full touch usability remain M1 work. |
| SHOULD 4: null/broken preferences mislabel valid storage as unavailable | CONFIRMED. Settings parsing is isolated and guarded; malformed settings leave defaults. Browser seeds null preferences and checks save availability. |
| SHOULD 5: async sound resume can win after stop/hide | CONFIRMED by lifecycle inspection. Added startup generation and starting state; a second toggle cancels pending startup. Two mocked-resume tests verify stop and hidden completion cannot enable or schedule playback. Real browser checks exercise toggles; audible quality remains unmeasured. |
| SHOULD 6: replaced live region may not announce editor feedback | CONFIRMED structural issue; announcement behavior UNVERIFIABLE without screen reader. Added a persistent dialog status node outside replaced content. No claim of completed NVDA/VoiceOver audit. |
| SHOULD 7: editor reopening selects an already-placed item | CONFIRMED. Entry selects the first missing supply/motif while explicit internal tool selection still permits moving existing pieces. Browser tests reload partial layout and mural, checking the next selected tool. |
| SHOULD 8: static-file read after writeHead can break error handling | CONFIRMED as avoidable response-order fragility. Read data before setting success headers and report listen errors clearly. No injected file-lock race or AV behavior test is claimed. |
| SHOULD 9: hidden-page position checkpoint absent | CONFIRMED. Visibility-hidden now persists progress and stops sound. Browser/platform lifecycle differences remain outside the tested matrix. |
| OPTIONAL: authored pixel coordinates tied to projection | CONFIRMED intentional M0 authoring contract; document it in BUILD_STATUS. Do not change ORIGIN/scale/rotation without moving authored scenery and rechecking routes. Existing geometry test pins real intersection and Mason distance. |
| OPTIONAL: snapped path start can fall just outside corridor | CONFIRMED cosmetic boundary case, deferred to M1 navigation polish. It does not block tested targets or completion; startup validates positions. Do not claim every arbitrary edge path is already proven. |
| OPTIONAL: reduced-motion setting does not affect CSS transitions | CONFIRMED and fixed: synchronize a root reduced-motion class with saved/in-app settings and suppress CSS transitions too. |
| CUT: move action, dispose method, text-link class unused | CONFIRMED currently unused in this small application. Deferred; removing them is not required for M0 correctness and this is not a dead-code cleanup campaign. Do not route per-frame movement through structuredClone just to create a caller. |
| Server root escape closed; map/callback/save/grid contracts consistent | CONFIRMED against source. Retain trailing-root path containment and public-only server root. Browser checks deny package.json. |

## Additional driver findings

- Corrected compass from left-of-up to right-of-up to match the actual rotated projection, and a missing mobile heading space.
- Changed muted-finale copy from “playing” to “ready”; sound is optional.
- Initial browser damaged-save test was invalid because the outgoing page legitimately saved on pagehide after the test injected malformed data. Preserved the failure explanation and corrected injection to occur before startup. No production save code was altered to satisfy that erroneous assertion. Corrected startup recovery and the full suite pass.
- Browser assertions use actual DOM controls for progression. The production inspection API returns cloned read-only snapshots; it has no quest-completion bypass.

## Limits

No human playtest, measured enjoyment/runtime, screen-reader audit, non-Chrome compatibility matrix, audible final-score assessment, or current facade/access survey is represented as passed. Street centerlines are sourced; widths/decorative crossings/facades are schematic. Final jazz, a larger district, optional module, photo/loan flourishes and wider game systems remain roadmap work.

All confirmed MUST items are resolved in source and exercised by focused browser evidence. SHOULD items were fixed conservatively; remaining verification limits are explicit. No additional model call was needed for the fixes; the driver used code inspection and regression checks.
