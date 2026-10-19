# Explicit single-round scope before fanout

Creator authorized AGY 4 (`Gemini 4 Argon` High) as sole writer with its own hourly scheduler (`build-tenderloin-redux` Codex scheduler kept PAUSED). Scope r3 only (`2026-10-18-godot-walking-collision`); r1/r2/r4 omitted, not a full four-round arc. Driver AGY (`Gemini 4 Argon` High) excluded from independent-family CLI review. Review priority per creator instructions:
1. Native Claude Opus 5.5 High via Kibitz (`--driver agy --only claude`, `KIBITZ_CLAUDE_MODEL=claude-opus-5-5`, `KIBITZ_CLAUDE_EFFORT=high`).
2. Codex Sol High via Kibitz (`--driver agy --only codex`, `KIBITZ_CODEX_MODEL=gpt-6.1-sol`, `KIBITZ_CODEX_REASONING=high`) if Claude is unavailable.
3. If neither external CLI can run, spawn Gemini Flash 3.8 subagent QA if that exact model is available, explicitly labeled as a creator-authorized same-Gemini-family fallback.

Input `docs/BUILD_GODOT_WALKING_REVIEW.md` SHA256 `42e2135f58b59dccf8c085c6f04caf774bfe0a34a40306b82934691eb84b1c92`. Anchor is source-grounded and precedes fanout. Frozen source archive/manifest covers browser/Godot/data/scripts/tests/docs and root project files, excluding generated cache/binaries/artifacts. Owned `2026-10-18-godot-walking-collision` lock; no concurrent writer. Reviewer may write only designated report; no implementation/test/data edits, no commits/push/outreach/publishing. Driver verifies all claims against source and runs final tests.
