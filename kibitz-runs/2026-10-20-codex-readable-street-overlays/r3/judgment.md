# Driver judgment: independent r3 integration review

One external call completed successfully through installed Kibitz: claude-opus-5-5, high effort, rc0, verdict yes-with-fixes. Requested model/effort receipts retained. Claude read the current files and had no shell/diff capability; do not describe it as an independent git-diff or runtime test. Source/input/anchor hashes matched before and immediately after review. Codex remains sole writer and final judge.

## Must-fix findings

1. CONFIRMED: automatic Info never released its height. Reproduced in the initial 320px browser failure: 60px play area versus a 75px banner. Added speech_opened_info ownership, release on expiry/replacement/reset, and explicit requests taking ownership (main.gd release_speech_info/hide_speech_bubble/set_header_details). Landmark and conversation framing release owned Info first. A native layout probe proved that applying the new minimum height while preserving width is synchronous and stable next frame. Native tests now let speech expire normally and require the queued reward to appear, then verify replacement framing, explicit ownership and user dismissal. REJECTED suggestion to force an oversized banner after three seconds: it would cover controls. When Info is deliberately expanded, the full title/body appears at its top while preserving the explanation and sources; that presentation consumes normal reward display time.
2. CONFIRMED underlying feedback gap while a reward is held. REJECTED the specific floating-title fallback because an unbounded 3D title would reintroduce the collision being fixed. Resolved through automatic Info recovery and full reward text in deliberately opened Info. Floating duplicates stay suppressed; gems and independent sounds remain intact.
3. CONFIRMED vacuous 350ms browser check. Replaced it with a ui_frame advance wait and assertion. Both phone sizes must have speech deferred in both fresh snapshots with identical remaining reading time; desktop may render speech beside/below the reward and does not claim deferred-timer evidence.

## Other reviewer findings

- SHOULD 1, CONFIRMED by native probe: hiding Info changes minimum height immediately but leaves its actual rectangle stale until layout. set_header_details now applies minimum height without changing width. Reward layout follows conversation updates and is checked again after speech may change Info; captions compose last and web status flushes afterward. Final browser geometry remains required evidence.
- SHOULD 2, CONFIRMED: hidden pending speech is still active. Neighbor name/Talk and guide-arrow conditions now use the active speech anchor. Deferred speech cannot briefly revive that speaker's chrome.
- SHOULD 3, PARTLY CONFIRMED: added actual Talk-prompt bounds to composition and read-only snapshots, hides it if it cannot fit, and extended native/browser exclusion checks. Visible chapter cards also reserve caption space. The gold guide is a navigation marker, not another text block; its established hit precedence is preserved. No blanket marker-hiding change or full general scene occlusion claim.
- SHOULD 4, UNVERIFIABLE as a defect: reviewer explicitly assumed underlying visible neighbors/surprises. Visible caption text is the intended eatery target, and choosing that target is correct at the outer text edge. Putting unrelated world targets ahead of visible caption text would defeat the requested tap behavior. Keep existing tour-marker priority and reject speculative neighbor precedence changes. Native tests exercise actual counter and caption-edge dispatch across all six eateries/all three widths.
- SHOULD 5, CONFIRMED: explicitly closing fallback Info now dismisses that speech. It cannot continue an invisible reading timer or reopen itself.
- SHOULD 6, CONFIRMED: protect queued 10/10 finales by remaining time, and make optional-tour completion wait for any pending banner, including hidden ones.
- SHOULD 7, CONFIRMED: fallback speech now prepends to existing Info text rather than discarding the order message/sources.

## Optional/cut suggestions

- Bounds constants in two narrow functions remain aligned and covered by actual-scale geometry assertions; no separate geometry abstraction added in this bounded round.
- Reward staleness is bounded by normal display time when shown through deliberately opened Info, or by the remaining speech lifetime when Info is speech-owned. No extra wall-clock discard path needed.
- Browser final-host wait deliberately requires the complete spoken bubble to return at the supported widths; allowing Info instead would weaken this round's promised phone behavior. Oversized Info behavior is independently covered natively.
- CONFIRMED new input-time caption recomputation is intentional: taps use current camera/visibility rather than an old cached frame.
- Snapshot JSON deduplication was pre-existing; leaving the benign check avoids unrelated cleanup. The old sideways helper was removed when fitting changed, while the shared mesh shift parameter remains harmless and compatible. No broader cleanup claim.

## Driver-found follow-up

The new visibility rule let the resize callback resurrect an expired banner. Reproduced by native tests; layout_reward_banner now exits hidden when timer <= 0, with a positive resize regression. Diagnostic evidence is retained. This fix and the grounded review fixes received driver native/check/104 Node/export verification before final browser validation; no second independent external call is claimed.

## Limits

No physical device, full screen-reader, human timing/listening, field-truth or deployment acceptance. The optional tour and UI are still prototype work. Never modify public or legacy browser save; keep the save budget and glyph gate.

## Final focused follow-up

An internal read-only check found duplicate reward text when explicit Info needed both speech and reward fallbacks in one frame. CONFIRMED by source ordering: speech prepending displaced the active reward prefix and banner layout then prepended it again. Speech insertion now preserves the active prefix at the start. A native coexistence assertion requires the title exactly once and the complete speech text. This is a narrow follow-up to accepted MUST 1 / SHOULD 7, not a second external review. All five gates are rerun after it; the earlier browser run is retained as pre-final evidence.
