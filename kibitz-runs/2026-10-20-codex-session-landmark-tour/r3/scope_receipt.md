# Scope receipt

- Creator explicitly requested one independent CLI QA round for each code-changing build round.
- Selected scope: r3 only. r1, r2 and r4 are not run; this is not a four-round campaign.
- Input: `review_scope.md` in this directory; SHA256 recorded in `source_before_review.json` before fanout.
- Driver/sole writer/sole judge: Codex, gpt-6.1-sol High.
- Reviewer: native Claude CLI via installed Kibitz runner, `--driver codex --only claude --round r3`.
- Requested exact model: `claude-opus-5-5`; effort: `high`. Environment overrides pin both. Resolved CLI/model/effort and quota diagnostics are retained in runner receipts.
- One external call authorized for this round; no Codex self-review CLI, additional panel or model substitution. No blind retry on quota/auth failure. Actual credit usage is unavailable unless the provider exposes it.
- Baseline: main at `1cd1eb120abea43fe286abc273c8a07d2a953edb`.
- Initial dirty state was only the pre-existing untracked historical folder `kibitz-runs/2026-10-20-landmark-discovery-bursts-and-conversation-tour/`; preserved untouched and excluded from this round's staging.
- `.build-round.lock` is held by the driver throughout review and verification.
