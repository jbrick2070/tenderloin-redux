# Grounded implementation-review judgment

One exact sole-Claude r3 completed 2026-10-26T23:57:47Z, harness rc0,
claude-opus-5-5/high requested and selected, all302 bound inputs unchanged.
Provider runtime identity and numeric allowance are unknown. This is distinct
from the completed pre-code r1. No additional pass or model substitution.
Later driver corrections below are NOT independently re-reviewed.

## Each finding

1. MUST1 / CUT2, Studio start overwrites action speech: **reachability REFUTED;
   redundant fanout removed**. `is_hosting_ready_to_start` requires empty order;
   valid empty order has no results. Adding the four IDs costs31 serialized
   bytes. The largest legal idle draft can shrink at most3 bytes on defaulting
   (255 to85; pairs to arc), so start grows by at least28. Thus a valid oversized
   start is refused by admission before the alleged overwrite. Native loading
   can retain a bounded nondefault idle draft: it is not always default. For a
   fitting start followed by storage refusal, admission0 clears budget_notice
   and the existing central announcement already retains both action and warning.
   Removing the duplicated dialogue/info/update/announcement branch is related
   simplification/hardening, not proof that the reported player defect existed.
   New native assertions use validated idle fixtures: oversized growth refuses;
   fitting start with controlled file-open refusal retains Started hosting plus
   Visit-only. No fabricated oversized non-growing start was used.

2. SHOULD1, admission rollover inconsistency: **HOLDS, fixed**. Shared admission
   now measures both current and proposed envelopes at next save_seq, matching
   the mural path. Exact4096 current envelopes at9 and99 permit equal-sized
   visit-only edits after rollover while refusing growth. Writer boundary and
   next-sequence tests remain. No import data is removed or truncated.

3. SHOULD2, native store result ignored: **HOLDS, partially hardened**. The writer
   now returns FileAccess.store_string's boolean after closing. Official Godot
   [FileAccess documentation](https://docs.godotengine.org/en/4.6/classes/class_fileaccess.html#class-fileaccess-method-store-string)
   documents this return type; the actual installed4.7.2 engine parses/runs the
   changed path in the private check. This is not a reproduced full-disk or
   after-open fault, flush guarantee or atomic replacement. Opening WRITE can
   still truncate before a later failure; native prior-file preservation under
   that fault remains unsolved. Generic failed-write receipts therefore say
   reload may lose changes, not that a prior file is always guaranteed.

4. SHOULD3, Studio/Mural recovery evidence too weak: **HOLDS, strengthened**.
   Both actual-control recovery paths now require authoritative key changes,
   exact stored draft/scenes, unchanged settings, real reload, reentry and the
   recovered values plus unchanged recovered storage. Existing progress/settings/
   SharedPanel recovery, all old genuine journeys and retained faults remain.

5. SHOULD4, terminal wording / unbounded controller: **PARTIAL, corrected**.
   The module was explicitly described as immediately before cleanup, not after
   all code; it is the last feature module, then owned-profile cleanup and the
   existing legacy-settings compatibility check. Comment/current records now
   say that precisely. It restores paths, not the discarded caller state.
   Runtime-coroutine failure could hang the old controller: bounded stage
   deadlines and retained timeout receipts were added. Only the still-live child
   this controller launched and its descendants can be stopped on its timeout.
   No unrelated process selector or broad kill is used.

6. SHOULD5, intentional open-refusal log errors: **verified clean, no threshold
   weakening**. The already completed private native log was clean; corrected
   execution native-1793059188793046000_24996 again exits0 with the PRIVATE
   persistence marker, no ERROR/WARNING/script exception and protectedASFOUND
   unchanged. No private execution is promoted to full formal acceptance.

7. SHOULD6, bridge null conversion: **HOLDS in isolated native evidence; guarded**.
   The exact native engine raises Invalid call / Nonexistent bool constructor
   when a Variant null is passed to bool. That rejected rc0 execution is retained
   at native-1793059548077444600_28932; its SCRIPT ERROR disqualifies it. Exact
   failed source was reconstructed and SHA-verified, not assumed from current files.
   The review's proposed eval(...) == true replacement was also rejected: actual
   Web settings storage changed but the warning stayed latched. JS observation
   proves the eval expression returned boolean true; temporary later GDScript
   diagnostic markers were unobserved, so no engine Variant/compiler cause is
   claimed. The corrected writer explicitly checks result != null before the
   established bool conversion. Native short-circuit checks pass, and the browser
   matrix injects a null bridge return as well as denied/allowed localStorage
   writes. Preserve rejected pack/source, traces, pixels and profiles separately.

8. OPTIONAL limit naming: added a comment that OPTIONAL_SAVE_MAX_BYTES is the
   historical serialized-character admission limit, distinct from UTF-8 write
   bytes. Kept schema/constant and literal8192 contract stable.
9. OPTIONAL sequence ordering: agreed; current GODOT_APPROACH explicitly says
   Web/native are exclusive stores with no cross-store ordering/merge. Sequence
   tests protect successful-write/schema/budget semantics, not store selection.
10. OPTIONAL separate browser evidence: intentionally retained. This module owns
    its traced isolated contexts and writes its own failure pixels/profile/receipt;
    the controller copies its evidence directories. Not a missing failure claim.
11. OPTIONAL rhythm stale-string negative: replaced with positive hosted-result
    practice wording while retaining positive final Visit-only announcement and
    unchanged stored-byte assertions. The central warning belongs in composed
    reader/speech; it need not be injected into the base practice message.
12. OPTIONAL partial-fixture source assumptions: assert exactly four distinct
    original hosting results matching the four known IDs before deriving PRIVATE
    earlier-state fixtures. This never replaces genuine progression.
13. CUT1, remove owned PID guard: **REJECTED**. This controller is deliberately
    bound to one verified owned episode and refuses duplicate output. A future
    reboot/owner change requires renewed live ownership checks, not weakening
    ownership to a reusable label. Source/ASFOUND hashes do not prove ownership.

Additional driver grounding found no stale result-schema/marker assertions.
The controller now compares actual served index assets against this export
before and after the browser run; local pack hashes alone do not bind a preview.
All previous formal browser counts and process-exit checks remain unchanged.

## Verification state

Corrected post-review native-1793059579998644300_28176 private assertions passed
with clean diagnostics, source and ASFOUND unchanged. Corrected post-review export is2096484B,668B below unchanged2097152B,
256B smaller than the accepted programme. No unrelated deletion, export-filter change,
coverage cut, speedup claim or publication. The corrected three-size browser run
and fresh final all-five are tracked separately in actual execution receipts.
Review grounding and private checks are not accepted full-gate completion.
