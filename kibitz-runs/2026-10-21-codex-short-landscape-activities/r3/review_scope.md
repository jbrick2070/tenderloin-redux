# Short-landscape conversation and activity panels - scoped implementation QA

Baseline main 4ef3d4f9834bf37b9fc82df21f2640ca333f4023. Codex is sole writer. Review only; do not modify source or launch other reviewers. User explicitly requires one Claude r3 implementation review, exact claude-opus-5-5 / high. This is not a four-round campaign.

## Problem and intended behavior
The prior actual 640x360 probe left one pixel of scene: conversation panel y24..230 overlapped header y12..201; mural/music y6..230 overlapped y12..110. Evidence artifacts/short-hub-next-{conversation,mural,music}-640x360.json/png. Existing short hub is complete and must remain.
At widths>=600 and heights<560 all visible conversation/mural/music panels now dock to the right, below the actual header. Walking controls occupy the left bottom with original compact hub captions and44px targets. Dock uses content height, original callback order, full scrollable dialogue/details and concise headings. Standard tall layouts retain their original geometry and labels. Conversation full dialogue can satisfy short-screen speech fallback without auto-expanding duplicate Info. Actual people/activity targets must remain in the playable area; resize refits only an unchanged automatically framed pose and preserves manual panning/zoom/rotation.

## Source to inspect
- godot/main.gd: speech_activity_detail, frame_conversation, apply_block_panel_mode, uses_short_side_panels, has_side_panel_dock, layout_walking_controls_and_hub, play_area_rect, frame_activity_camera, remember_panel_framing/refit_panel_after_layout, show_*_panel, activity_detail_snapshot, update_*_ui, make_ui resize/header callbacks.
- godot/tests/study_test.gd: verify_short_activity_panels adds18 combinations across600x360,640x360,667x375,844x390,800x480,1100x480. Full labels/two font lines, original final line, finger delta, real subjects, Info growth, manual intent and save stability. Existing study suite retained.
- tests/godot-browser.mjs: verifyShortActivities adds18 actual mouse/finger cases within required browser contexts. Real requested hints/Chat when needed, wheel/Home/End, finger drag, rotation and manual pan, original Close. Read-only panel subject and conversation-reader snapshots, no action hook.

## Evidence and outstanding gates
Native preflight4 GODOT_STUDY_PASS, no warning/errors. Actual new640x360 Start/conversation/Celeste/Rook captures show header98px, conversation148px, activities194px and scene130px instead of1px, errors[]. artifacts/short-activity-preflight-*-640x360.png/json inspected. New actual-input preflight still running; driver will ground failures and required full five gates must run after any source/test changes. Do not equate preflight or source inspection with all gates passing.

## Invariants and review focus
Never modify public/ or legacy tenderloin-redux.save.v1 product storage. Fingerprint2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567, Godot save<=4096, fallback glyphs. Keep actual geography/provenance/distances and explicit fictional/stylized labels. Preserve route/music/sound policy, default70% music after Start, hub/Stop touch latch, rewards/speech clearance, Find Me/Map/manual intent, phone667px readers. No deploy/outreach/paid media/engine migration.
Review initialization and hidden-focus-show ordering, panel minimum sizing, header growth, open rotation, callback labels and complete text, reader inputs and save stability, actual-subject versus camera-target correctness, pose ownership, and nonvacuous tests. Cite exact files/lines. Separate confirmed defects from unverifiable physical-phone/screen-reader/human acceptance. Full roadmap unfinished.
