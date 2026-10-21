VERDICT: yes-with-fixes / final gates pending.
MUST-FIX BEFORE BUILD:
1. CONFIRMED prior actual320x568/599x360 crowding. New compact walking rows and content-sized activity panels address wasted vertical space. Verify full actual player/body and original actions rather than camera target alone.
2. CONFIRMED side capability now560 while hub minimum remains600. panel_uses_side_dock must agree with has_side_panel_dock and play_area_rect, especially hidden panels and hub mode. Existing hub assertions preserved.
3. CONFIRMED bottom panel grow direction switches to BEGIN for compact portrait and back to END otherwise. Resize, changed text/minimum height and explicit Info must keep bottom/Close inside controls; inspect deferred container sizing.
4. CONFIRMED compact speech fallback prevents repeated full conversation from expanding duplicate Info; original full text and existing announcement behavior remain.
5. CONFIRMED native preflight3 complete error-free PASS, including actual stand positions, two-line objective/Info and body/person/prop bounds at12 sizes. New browser actual input and full five gates still pending; do not call acceptance complete.
SHOULD-FIX: measure all six walking labels at560px; restore original50px targets/labels on Close and outside compact modes; verify open560/600 and639/640 boundary focus and manual inspection. Browser CDP finger is emulation, not physical acceptance.
UNVERIFIABLE: physical phones, full screen readers, human readability/pacing/listening/comfort. No new source geography or license facts; no deployment.
