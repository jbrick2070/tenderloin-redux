# M1 visible layout consequences — implementation review

## 1. Scope and acceptance

Hourly continuation selects the next unfinished opening-chapter item: the Long Table and Open Floor choices need visibly different consequences. Implemented version 0.5.0 derives activity from the existing layout and arrangement. No new task, timer, scoring, save fields, resident removal, music asset, geographic alteration or runtime dependency. Human pacing feedback remains open; this does not complete the whole game or full M1 acceptance.

One independent partner for this implementation round, creator-authorized r3 only. Driver Codex/Sol High. Gemini 4 Argon (High), checked current through installed Kibitz before fanout. No r1/r2/r4, duplicate Codex lane, AGY Opus or paid asset generation. Native Claude is only an authorized alternative if needed.

## 2. Implementation contracts

- `public/gathering.js`: pure scene derived from existing validated state. Uses actual `occupiedCells` for all three supplies, hides folded seats/returned supplies during packing, and emits three anonymous visitor spots only for an open, fully furnished gathering. Long Table chooses free outer-edge cells near the placed table; Open Floor spreads visitors through free edge cells. No guests on supplies or the clear third row. World projection puts visitor ground shadows above the authored bike-edge band. This describes schematic event geometry, not surveyed sidewalk/permit accessibility.
- The same scene produces an original, static SVG **current gathering plan**, with actual 8x5 supply footprints, protected route, conversation/movement markers and explicit schematic disclosure. State-derived/static content only; no photos, imported map tiles or external media. Scene title/caption, route note and supply cell positions are also visible DOM text. The picture is not a consent-based keepsake and is not frozen/exported as one.
- `public/world.js`: replaces the identical pair of ambient guests with the model's anonymous visitors, keeps all five named residents and interactable coordinates, integrates visitors in depth order, and gives Open Floor a small arm/leg motion that freezes under existing reduced-motion settings. Table visitors remain still. Scene caches by the quest-state object identity; actions replace that object, while player walking does not change layout. Existing projection, furniture map transforms and route mechanics remain untouched.
- `public/game.js`: preview button inside arrangement editor; current-plan button and branch-specific caption after opening and throughout packing/returns. Read-only dialog returns to arranging before opening, or the map after opening. Existing save/keepsake/consent controls remain. Celeste and Thanh react differently to the layout after opening. No claim that a user-selected track is a specific trumpet performance.
- `style.css`: responsive plan image plus readable DOM route/supply descriptions. Version 0.5.0 in package and readonly diagnostics; syntax check includes new module.

## 3. Evidence and limits

42 Node tests pass, including five new tests for distinct activity, coordinate-only derivation/save immutability and reload equivalence, footprints, free outer-edge positions for representative arrangements, moving table changes conversation positions, all packing/return phases including unreturned paint case, and reduced motion. Syntax passes.

Complete isolated Chrome suite is running with preview/back-to-editor preserving arrangement, SVG decode, both branch titles/activity markers, read-only quest/consent state, branch-specific Celeste conversation, current supply counts before/during/after returns, modal focus and phone overflow. Existing two-layout/endings, audio, mobile navigation and save-recovery coverage remain. Final source fingerprint and driver visual checks follow before acceptance.

No human pacing measurement, physical phone, full screen reader audit, new current-place fact or final score is claimed. Real street centerlines remain the same; scenery/access widths stay explicitly approximate. The original synth and user-selected local track modes are unchanged. Raw historical reports must remain intact.

## 4. Focused independent request

Read the actual module/UI/world/core/tests. Check wiring/cycles, cache invalidation, depth/pose/motion, arrangement invariants and current-plan truth during partial returns; check preview focus, mobile readability, and accidental quest/keepsake changes. Give concrete file/line evidence and the smallest correction. Do not read historical partner reports or current driver anchor. Write only your designated review; do not modify application/tests/docs. Optional major systems/new gameplay/dependencies are outside this slice.
