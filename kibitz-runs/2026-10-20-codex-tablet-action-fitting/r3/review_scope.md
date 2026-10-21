# Tablet action fitting - scoped integration QA

Baseline d59c58b1fe1fa1270e153e2f7d30d8fd28cbb4c5. Review this small working-tree delta in godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs. Read actual source and git diff. Do not edit source or execute heavyweight tests while the browser gate is running. Write only your review file.

## Problem and implementation

A real browser probe at760px height found the six-column action panel extending43px over walking controls at600px width and21px at700px. Screenshots/geometry: ignored artifacts/midwidth-before-600.png, -700.png and midwidth-before.json. Existing desktop>=600 switch squeezed long labels into tall rows. Public browser0.12.0 must remain untouched.

uses_paged_block_actions at main.gd:6516 gives this secondary hub its own1050px breakpoint, independent of global600px phone controls. Below1050: four actions in two columns, three pages, 13px labels, visible Previous/Next and Close. At1050 and up all12 actions retain six columns. Existing callbacks, order, suggested-page opening, save/progress, conversation controls and geometry remain unchanged. Resize preserves the focused action's page at either phone or tablet sizes; page changes remain guarded and announce/focus the first visible action. The read-only accessibility snapshot exposes block_hub_paged.

## Coverage and scrutiny

Native added bounded599/600/700/800/900/1000/1049/1050/1100px sweep at667px height, actual font-fitting, panel/header/control bounds, navigation44px, all12 actions once, focus across1050/1049 and unchanged player/save. Native initial gate passes. Export/check/104 Node tests pass. Full browser gate currently running, required1100x760/390x667/320x667. At end of desktop run a short real resize/click sweep covers the same nine widths with all pages, full font-fit,44px navigation, panel bounds,180px scene gap and progress preservation. No testing state-mutation hook.

Check initial UI/resize timing,1050 breakpoint, page focus/stale page indices, compact labels, semantic snapshot contract, whether browser interaction evidence is meaningful and if any short-height/long-state fit is missed. Main walking/camera/geometry/performance policy must not change for this slice. Larger camera/first-person migration and mural/music descriptions are outside this round.

## Invariants and limits

Never modify public/ (fingerprint2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567), product legacy savev1 read-only, saves<=4096, fallback-font glyph checks, unmodified250ms cold-route budget. Preserve prior reviews and initially untracked landmark-discovery-bursts-and-conversation-tour folder. No deployment or outreach. Physical devices/full screen readers/human comfort unverified. One exact Claude reviewer, r3 only, not a four-round campaign. Driver grounds every finding and reruns all five gates after any changes.
