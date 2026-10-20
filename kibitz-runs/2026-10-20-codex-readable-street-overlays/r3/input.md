# Readable street overlays: independent integration QA

Review the current uncommitted diff against c5f29e70db3b04da19ce382e2b00c032fdd397b9. This is one bounded improvement round in the creator-authorized October 20 shift. Read actual source. Do not edit source or run export/browser/test gates; root owns writing and validation. Write only the runner-assigned claude.md review.

Problem: large fictional eatery captions, host dialogue and transient rewards overlapped in the 1100/390/320 tour-completion captures. Preserve large fonts, compact header, Info, permanent Find Me / Tenderloin Map, real city geometry and provenance.

Implementation under review:
- main.gd refresh_speech_bubble_wrap/speech_bubble_screen_rect/update_speech_bubble: wrap on resize; border/tail/animated bounds; fit full text inside play area below visible reward; defer without consuming reading time if reward leaves insufficient room; full scrollable Info fallback for genuinely oversized dialogue.
- Fictional eatery name/disclosure is included with host speech. World-label drawing priority stays behind opaque speech.
- layout_reward_banner/update_celebration_burst: wait for enough room if expanded Info leaves a short street strip; preserve timer; avoid duplicate floating reward titles; map/reset/restore clear transients.
- update_readable_scene_labels: active eatery name before menu, actual bounds, avoid other accepted captions and transient overlays, restore eligibility every frame. Cached visible eatery caption rectangles drive real scene taps via activate_eatery. Preserve gold tour-marker precedence, physical counter targets, chapter-card dismissal; overlays block click-through.
- scene_overlay_snapshot / sync_web_a11y_status / flush_web_a11y_status: read-only geometry and counter state, publish after composition. No mutating test-only browser hooks.
- Native checks: all six cafes at all three widths with conversation open, nonoverlap, positive caption restoration, actual edge/counter taps, no duplicate reward or save change, active resize, oversized Info -> queued reward, reset/restore clears pending speech.
- Browser checks: actual tour buttons, order/reward/host/restored screenshots, geometry per cafe, real banner tap and venue caption edge tap, full reading time, exact localStorage preservation.

Evidence so far: native/check/104 Node tests passed before final small integration fixes (final gates still required). First browser run uses the earlier export and is ongoing. Retained failure logs in artifacts/overlays-* are diagnostic, not final proof. No claim of physical phones, screen-reader certification, human timing/listening acceptance or field observation.

Hard invariants: never modify public/ (fingerprint 2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567); tenderloin-redux.save.v1 read-only; save <=4096; every non-ASCII main.gd glyph in fallback font. No scheduler changes, deployment, paid media, credits or outreach. Root holds .build-round.lock, sole source writer/final judge. Preserve unrelated untracked landmark-discovery review folder.

Find concrete wiring, lifecycle, layout, input or validation defects. Distinguish source-proved findings from conjecture. Cite file:line, trigger and impact. Do not demand a broader UI/engine rewrite.
