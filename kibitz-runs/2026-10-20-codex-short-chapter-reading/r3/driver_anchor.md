VERDICT: yes-with-fixes pending actual browser reading and Start click evidence.

MUST-FIX:
1. CONFIRMED actual baseline browser probe:640x360 Start extends10px below viewport. New native full-card/44px geometry passes for42 chapter/size combinations; browser hit-testing still pending.
2. CONFIRMED source: global startup arrows run before GUI input. Reading handlers must consume focused reader/scrollbar arrows and page keys before startup acceptance; preserve W/A/S/D, Enter/Start/Escape behavior. Native real-input cases pass after settling deferred focus.
3. UNVERIFIABLE pending browser: full text and touch/keyboard reachability need actual browser evidence. Native text identity/scroll endpoints are useful but not human comfort proof.

SHOULD-FIX:
1. CONFIRMED: periodic layout only changes sizes; show_story_card owns text replacement/reset. Native repeat layouts retain scroll; resize preserves reader focus with existing overview refit.
2. CONFIRMED: snapshot is read-only and reuses bounded activity detail diagnostics; no gameplay test hook. Five gates and screenshot inspection still required on final source.
3. CONFIRMED scope: this fixes chapter entry/reading, not all landscape panels or headers with arbitrary content. Record remaining activity/hub landscape work, untested shorter heights and human pacing.

CUT THESE: geography, audio policy, save fields, first-person migration and full HUD restructuring. No need for those to make Start reachable.
