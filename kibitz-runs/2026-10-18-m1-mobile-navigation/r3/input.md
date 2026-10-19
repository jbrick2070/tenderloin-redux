# M1 mobile map and neighbor navigation — focused implementation review

## 1. Scope and contract

Creator asks to continue the mobile map and easier neighbor navigation, with one independent Kibitz partner each build round. Review this implemented slice, not the full roadmap. Codex/Sol High is driver; one Gemini 4 Argon (High) partner through the installed runner. Single r3 partial campaign; r1/r2/r4 not requested or executed. No AGY Opus, installation, assets or public publishing.

## 2. Implementation

- `public/camera.js`: a pure view transform; desktop starts with the full block, phone-width canvas starts closer and follows the player. Zoom buttons clamp between fitted bounds and a maximum. Full block fits the scene. Follow me resumes tracking; drag suspends tracking with bounded center. Resize preserves an intentional view or recomputes full-block fit. World coordinates, walking speed, projection, save format and quest states are untouched.
- `public/world.js`: uses the camera for both rendering and pointer conversion. One-finger/primary-pointer drag pans beyond an 8px threshold; releasing a drag, cancelling, or multiple touches cannot activate objects. Pointer capture handles release outside the canvas. Preserve the earlier focus fix by preventing default pointer-down focus before modal activation on pointer-up. Neighbor labels have an 11px minimum screen font; hit areas track label scale.
- `public/index.html`, `style.css`, `game.js`: visible zoom/overview/follow controls, a DOM neighbor directory with five named residents and their roles, walking route status and Stop walking. Directory buttons use the existing pathfinder and conversation logic: no teleporting. Routes automatically follow the player; dragging can inspect elsewhere; Full block is always available. A nearby neighbor opens their normal conversation. Directory and arrival dialogs use the existing modal focus rules. Stops preserve player position and clear pending arrival action. No new runtime dependencies or save migration.
- Version 0.3.0. Original schematic art, route permissions and geographic disclaimers remain. Actual facade/crossing surveys, a full screen-reader audit, human pacing and the final score are outside this slice. Drag plus buttons are implemented; pinch zoom is not promised.

## 3. Grounding and verification

Read the actual files above and `public/core.js`, especially goTo/moveTo/hint/renderFrame and pointer capture sequencing. Focus on view/route interactions, touch cancellation, resize, disabled controls, modal focus, and old-save behavior. Do not read historical partner reports or the current driver anchor; provide an independent review. Do not edit application/test/doc files. Write only your designated report.

25 Node tests passed before fanout, including camera round-trip, clamp, bounded pan/follow, desktop/mobile defaults and resize behavior, plus all existing core/save/ending/audio checks. Syntax passed; camera is now included in the syntax command. First Chrome run passed both chapter branches and endings, mobile controls, drag with no player movement, neighbor directory keyboard selection, route cancellation, Thanh/Bea arrival dialogs and focus, with no page errors. A final rerun will include explicit Chrome touch drag, multi-touch and touch-cancel checks and the final source fingerprint. The driver will visually inspect the new mobile/desktop captures.

## 4. Review request

Identify concrete defects against the current source with file/line evidence and the smallest correction. Separate blockers from nonblocking polish. Do not require expensive dependencies, full game redesign or paid assets. Preserve saves and historical reports. A successful review is evidence of independent inspection, not automatic acceptance; the driver verifies every claim and fixes confirmed defects before recording completion.
