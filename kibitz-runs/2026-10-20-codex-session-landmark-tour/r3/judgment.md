# Grounded judgment

One independent Claude CLI request completed successfully: `claude-opus-5-5`, effort `high`, runner rc0, verdict yes-with-fixes. The reviewer had file-reading tools but no shell; its inability to run a Git diff is disclosed in the raw report. Pre/post-review SHA256 comparison confirms no changes to any reviewed source or the input by the reviewer. Actual usage/spend percentages were not exposed.

## Accepted findings and fixes

1. **CONFIRMED — hidden eatery target.** `update_guide_marker()` hid near the target while unopened counters stayed hidden; scene taps required a visible counter. The current tour counter now becomes visible as part of guidance rendering, and its tap dispatches the explicit visit/order action even when the marker is hidden. Native tests approach and tap at all three viewport sizes.
2. **CONFIRMED — finale coverage gap.** Replaced the test's manual hide with `update_celebration_burst(4.6)` and assertions before the completion phase. The ten-keepsake banner expires normally before the pending tour celebration. Previsited stops do not celebrate with only nine surprises.
3. **CONFIRMED — missing exported marker tap coverage.** Read-only snapshot exposes projected marker center/visibility. Browser activates the second museum era by actual canvas mouse click at each viewport; remaining stops use real conversation buttons.
4. **CONFIRMED — museum index contract.** Native checks now compare every guided era against `TOUR_MUSEUM_ERAS`, including present day.
5. **CONFIRMED — copy drift risk.** Completion copy formats the derived total instead of repeating 12. Current acceptance intentionally tests 12 stops.
6. **CONFIRMED — duplicated awning anchor.** One `SO_WHAT_AWNING_XZ` constant now supplies the objective, tap anchor and regression expectation.
7. **CONFIRMED — inaccurate cafe label.** Changed the action to “Order at Next Stop” / “Order Next”, covering the fictional bars and food counters.
8. **CONFIRMED as a harness freshness risk.** Added `ui_frame` read-only metadata; conversation clicks wait for a later rendered snapshot before reading rectangles. This is stronger for layout than announcement sequence alone, because layout can change without a new spoken announcement.
9. **CONFIRMED optional reset cleanup.** Both fresh/default reset and save application hide open eatery counters when clearing session state.
10. **CONFIRMED copy correction.** Neighbors “show you the stop”; camera inspection is not represented as avatar travel.
11. **CONFIRMED redundant refresh.** Removed repeated UI/marker refresh from the dispatcher, retaining the shared refresh after each inspector/order.
12. **CONFIRMED redundant pre-gates.** Completion retains the cheap surprise count gate and authoritative current-objective Chapter 6 gate.

## Driver checks and fixes

- Read-only internal source checks caught stale Celeste/Rook hints and the raised-marker ground-ray mismatch before independent fanout. Active character panels refresh after clearing the previous hint. Marker taps intersect a plane at the marker's actual height; native checks cover 1100/390/320 widths and default/low camera pitch.
- DOM summary now includes keepsakes, session tour progress and the next objective, rather than leaving these only in diagnostic metadata.
- Visual inspection found `RewardBody` collapsed under its clipped wrapping layout. It now reserves two font-height lines **including theme line spacing**; the banner uses its combined minimum height. A diagnostic proved 36 px gave only one visible line, while 42 px gave two. Native tests check the actual visible line count and rectangles inside the banner/play area at all three sizes. Browser screenshots verify the displayed result. This directly addresses the creator's request for legible micro-rewards.
- The new exported marker-click check exposed a phone framing defect: inspected landmarks could sit behind the open conversation panel. `frame_landmark_view()` now frames the inspected focus inside the available play area. Native regression checks inspect the museum with the conversation open at all three sizes; exported marker clicks verify the same path.
- Initial browser failure was a **test assertion error**, not a product save regression: the assertion ran after an intentional fresh-save reset. Moved merge-preservation coverage before that reset and explicitly asserted no invented discoveries after the fresh import. The failed log is retained.

## Deliberately not changed

- Protecting the tour banner from every possible later reward was optional, not a correctness defect. Existing first-discovery suppression remains; the tour waits for the prior banner and celebrates once.
- A dedicated sound-effects channel and simpler phone conversation headers are the next authorized usability slice. Current chimes remain coupled to the synth soundtrack; no independent audio claim is made for this round.
- No new geography, assets, saves, external runtime requests, public runtime edits, or physical-device/human acceptance claims.
