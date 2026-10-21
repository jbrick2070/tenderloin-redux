VERDICT: yes-with-fixes - native confirms bounded reading and complete phone controls; browser keyboard/scroll and final images must pass before acceptance.

MUST-FIX BEFORE BUILD:
1. [Browser contract] UNVERIFIABLE pending browser run: RichTextLabel is focusable with scroll_active, but actual PageUp/PageDown events must scroll its body rather than leak to game. Browser readActivityDetail uses real wheel/click/keys and waits for changed scroll, unchanged saved progress, player and zoom.
2. [Fit] CONFIRMED native: full two-line theme measurement plus220/224px activity panel allows all44px controls at six widths. Final browser images still need inspection; measured panel bounds do not prove human comfort.

SHOULD-FIX:
1. [State] CONFIRMED: set_activity_detail compares actual text before replacing/resetting; repeated updates preserve the reading position. Native final-line fixtures cover errors/custom Celeste dialogue; browser uses actual production dialogue/local file/error flows.
2. [Camera] CONFIRMED source: activity focus already explicitly detached/focused camera. New framing uses the target panel top even before visible. Verify geometry at actual opening/resize and preserve player position/zoom while reading; do not change hub framing or independent views.
3. [Preservation] CONFIRMED source diff limited to activity UI/snapshots/tests; final public fingerprint, save and glyph gates still required.

OPTIONAL: keep transient reward crowding/short landscape as explicit limits; no extra UI redesign.
CUT THESE: engine migration, route rewrites, new save preference fields, audio or asset changes. None is needed for readable descriptions.
