# Mural/music detail readability - scoped r3 QA

Baseline5601606. Review working-tree changes in godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs against actual source/diff. Read files; do not edit source, launch heavyweight tests, or write anywhere except your review file. Full browser gate is running. Independent QA: one exact claude-opus-5-5/high reviewer, not a four-round campaign.

## Demonstrated problem and bounded fix

Previous verified320px mural and390px music screenshots visibly cut off dialogue after one line and truncate phone Move/Close and soundcheck titles. Copies retained under ignored artifacts/activity-before-320-mural.png and activity-before-390-music.png.

Label descriptions become RichTextLabel with smart-wrap, focus, scrollbar and measured two-line minimum height (actual theme font plus line separation/style). Panel height is220px phone /224px wide, preserving header and walking-control separation. Unchanged text retains scroll; new text resets to first line. Complete local-track filename now appears in the scrollable music body; local errors replace that body in full. Plain text only (no BBCode). No audio, file decode, save or progress policy change.

Phone labels become Move/Clear/Hint/Close and shorter Rook/Sketch controls, with full help tooltips. Original callbacks/order and wide labels remain. Activity focus helpers replace their fixed phone-only4.2m offset with the existing orthographic screen-space pan calculation constrained above the panel, including calls immediately before a hidden panel becomes visible. Independent pan/inspection and completed hub work are otherwise untouched.

Read-only activity snapshots expose panel/detail/control geometry, complete text, scrollbar state and actual single-line button font fit. No action or progress mutation hook added.

## Coverage and risks to inspect

Native candidate passes: required3 main viewports plus dedicated320/390/600/800/1000/1100x667 sweep, actual-font two-line height, panel bounds,44px complete labels, long Celeste dialogue and music error final-line access, stable reading position on repeated updates, reset for new text, real ui_accept Close, unchanged walking/save. First fixture incorrectly assigned Celeste text before show_mural_panel cleared it; retained failure log and corrected fixture ordering.

Browser candidate exports/checks/104 Node and full actual browser flow running. Replaced guessed mural click positions with real control geometry. Browser reads real mural/music/local-WAV/error descriptions with mouse wheel and PageUp/PageDown, checks final scroll and unchanged save/player/zoom, captures images; resize/read checks at600/800/1000px; required1100x760/390x667/320x667 remain. Scrutinize actual RichTextLabel keyboard/focus behavior, description/label fit, scroll events leaking to game/camera, local file/error readability, resizing/heading/pan contracts, and newly exposed snapshot nullability/overhead. Inspect bounded panel height vs scene, state restoration in native fixtures and if browser checks truly require long reading on narrow views. Do not expand to first-person, route policy, sound redesign or a new hub.

## Invariants/limits

No public/ edits; browser0.12.0 fingerprint2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567. Product legacy savev1 strictly read-only, saves<=4096bytes, fallback glyph gate, unchanged250ms cold-route budget. Preserve geometry/provenance and original/fictional labels, prior receipts and initially untracked landmark review folder. No deployment/outreach/paid media. Short landscape<667px heights, physical phones, full screen readers and human comfort/listening unverified. Transient reward/character crowding remains a separate future candidate. Driver grounds every finding and reruns all five gates after source fixes.
