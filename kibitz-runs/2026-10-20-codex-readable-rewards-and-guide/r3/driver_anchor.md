# Driver anchor

VERDICT: yes-with-verification. CONFIRMED: previous RewardTitle was clipped single-line; smart wrap alone collapsed its minimum height to1px because clip_text is enabled. Explicit font multiline measurement now reserves full height including line spacing. Long title test exposes2-3 complete lines. Known So What heading shortened, original full addresses retained in Info.

CONFIRMED: guide label previously clamped only to play area and ignored Talk. Bounded candidates now clear outline-expanded obstacle rectangles. Captions retain priority: update_readable_scene_labels places guide last against current caption rectangles. Existing speech suppression remains. If no safe label slot exists, keep arrow and persistent objective, hide only extra label.

MUST-FIX before completion: all five gates after final changes, actual320px reproduction with both Talk/guide visible, and visual inspection of full headings. Do not accept merely hiding the known overlapping labels. Preserve timer/Info behavior, caption tap targets and font/glyph/save bounds.

SHOULD-FIX/verify: exact font measurement vs Label line spacing; container resize from multi-line to short heading; no stale caption blockers after resize; queue/reveal when Info leaves too little room. Native existing coverage passes after fixing title height and caption priority. Browser still required. Human comfort and complete screen-reader speech UNVERIFIABLE.
