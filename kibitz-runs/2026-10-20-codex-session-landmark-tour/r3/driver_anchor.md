# Driver anchor — Codex, before independent CLI QA

VERDICT: yes-with-verification. Native and Node gates pass; live browser coverage is still running, and final acceptance requires all five gates after accepted fixes.

MUST-FIX BEFORE COMMIT:

1. CONFIRMED validation obligation, scope C: verify actual conversation clicks and session reset at all three sizes. A passing native simulation cannot establish exported UI behavior.
2. CONFIRMED evidence obligation, scope D: retain pre/post-review source hashes, requested/resolved Claude model and effort, quota/status receipt, judgment and all final gate results.

SHOULD-FIX:

1. CONFIRMED regression boundary: existing post-10/10 assertions intentionally changed from no marker to the session tour. Tests at study_test.gd:1605-1674 cover the new route, duplicates, deferred banner and save nonmutation.
2. CONFIRMED frame/read separation: main.gd:5647 derives tour state without mutation; main.gd:5701 performs completion separately and waits until the prior banner finishes. Inspect actual exported rendering before accepting.
3. CONFIRMED counter semantics: visit_next_landmark explicitly calls eatery_counter_interact; cycle_eatery_guide alone does not count. Browser tests assert that distinction.

UNVERIFIABLE in this round: physical-phone interaction, real screen-reader speech, human pacing, real-world field accuracy and full-game acceptance. No claims of those outcomes.

No external model call made before this anchor. Two internal Codex helpers performed read-only reconnaissance, not the required independent-family review.
