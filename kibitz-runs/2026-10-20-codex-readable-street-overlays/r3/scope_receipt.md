# Scope receipt

- Creator heartbeat explicitly requests one independent Claude CLI QA in r3 only for this round.
- Explicit partial campaign: r1, r2, r4 not run; no completed-four-round claim.
- Driver, sole source writer and final judge: Codex. Reviewer: Claude via installed Kibitz runner, --driver codex --only claude --round r3.
- Requested exact model: claude-opus-5-5. Requested effort: high. Environment overrides set before fanout; no substitutions, credits or quota/auth retries.
- Baseline main c5f29e70db3b04da19ce382e2b00c032fdd397b9. One external review call planned.
- Input review_scope.md and source SHA256 recorded in source_before_review.json before fanout.
- Pin-check output retained in artifacts/overlays-review-pins.log; model and effort selection receipts from the actual invocation are authoritative for this review.
- Preserve preexisting untracked kibitz-runs/2026-10-20-landmark-discovery-bursts-and-conversation-tour/.
- Driver holds its own atomic .build-round.lock through edits/review/testing and removes it before normal commit/push.
