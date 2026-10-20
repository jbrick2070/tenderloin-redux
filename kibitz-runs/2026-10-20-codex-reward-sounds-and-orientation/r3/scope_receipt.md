# Scope receipt

- Creator explicitly authorizes one independent Claude CLI QA per bounded code-changing round.
- Selected r3 only; r1/r2/r4 not run. This is an explicit partial campaign.
- Driver, sole source writer and final judge: Codex.
- Reviewer: installed Kibitz native Claude CLI, --driver codex --only claude --round r3.
- Exact model claude-opus-5-5, effort high, pinned in environment.
- Input review_scope.md, SHA256 included in source_before_review.json before fanout.
- One external call; no self-review CLI, substitution or blind retries after account/quota errors.
- Baseline 37543ffab9d5fc8245514fb1e733962727ee6b94 on main.
- Existing untracked kibitz-runs/2026-10-20-landmark-discovery-bursts-and-conversation-tour/ is unrelated and preserved.
- Driver holds .build-round.lock through review/testing; removes before commit.
