# M2 first Turk-west history route — integration review

## Scope

Version 0.6.0 adds a coherent optional walk from the opening Turk/Taylor gathering through Jones and Leavenworth to a Black Hawk reading stop at Turk/Hyde. This is a bounded first M2 slice, not a fully surveyed district or finished game. Exactly one independent partner, creator-authorized single r3 campaign, Codex/Sol High driver; Gemini 4 Argon (High) lane requested after current pin check. No r1/r2/r4 or other model panel.

## Contracts

- `public/data/streets.osm.json`: 41 complete named highway ways from new `source-turk-west.osm.xml`, OpenStreetMap API bbox -122.417,37.7817,-122.408,37.786 downloaded 2026-10-18. All 27 prior selected ways compare exactly equal including geometry. Old raw source.osm.xml remains. License/attribution/provenance links stay separate from MIT graphics. Inspect selected IDs/coordinates; do not spend time reading the entire 2.5MB raw extract.
- `core.js`: origin/rotation and 5 world pixels/metre unchanged. OPENING_BOUNDS retains earlier frame, district BOUNDS extends left to -2400. Walking/path search uses actual projected ways. New core.blackhawk bool and discover-blackhawk action are additive v1; old saves false, strict true restore, bounded unknown optional JSON untouched. Core progress and ending independent. Save coordinate bound remains sufficient for whole bounded route.
- `history.js`: Jones/Leavenworth/Hyde shared OSM nodes, marker offset 48 pixels north of actual Turk/Hyde intersection. Marker describes an intersection-area reading point, not an exact entrance/plaque or current business.
- `camera.js`: opening fit remains readable, separate full-route overview and lower zoom limit; pan clamp uses full bounded district. Existing phone follow remains; desktop reload at western saved position also follows. Full block is still opening block.
- `world.js`: adds western original schematic facades and real street-name labels, Black Hawk marker/chip. No named current tenants or reconstructed historic club facade. Tiny route overview hides overlapping neighbor labels below .22 scale and matching label-hit regions; DOM neighbor directory remains. Existing gatherers, supplies, clear event row, music and endings unchanged.
- `game.js` / HTML/CSS: History walk DOM button below map and link in field notes; optional two-stop directory, named route controls, paused/cancelable walking, full-route overview, return to Bea, saved-note rereading. New Black Hawk note sets discovery on arrival/read, with official source links. No imported media, embeds, recordings, accounts or new runtime packages. Modal native focus behavior and route arrival unchanged. Version diagnostics/package 0.6.0.

## Source checks and boundaries

Full primary pages were read in browser research. SOURCES.md records narrow verified facts and differences: SFJAZZ gives Turk/Hyde, 1963 closure and performers Billie Holiday/John Coltrane/Miles Davis; Miles Davis official catalog dates Friday-night album recording to April1961 (release August1961); museum2022 archive specifies former club200Hyde atTurk and past festival August13,2022 atDodgePlace/TurkLarkin, separately west of this stop. Museum2016 opening-year1950 differs from SFJAZZ/museum2022 year1949, so UI does not assert opening year. All history prose original. No claim of an ongoing/current festival or endorsement. No current site use/appearance, exact door/plaque, surveyed crossings/bike access/district boundary is certified. No source media downloaded or used.

## Evidence and final gates

48 Node tests pass: previous44 plus four checks for actual shared nodes/440m scale, long route and return to every neighbor/place from initial/Hyde/western edge with every waypoint walkable and coordinate-only, additive discovery/save optional isolation, and desktop/phone route/opening/reload camera modes. Syntax passes. The complete Chrome smoke suite is in progress; it adds actual-control phone route pause/resume, arrival note/source count, state isolation, reload atHyde, saved-note read and walk back toBea, and retains existing both-layout ending/audio/navigation/recovery checks. Final evidence and fingerprint must pass before acceptance. First unit run exposed an outdated zoom expectation (new minimum differs from opening fit); expectation now specifically tests lower full-route minimum. No production regression was hidden by that correction.

Visual checks: driver inspected whole-route390px capture. Need inspect final note and Hyde follow view and narrow/desktop coverage. No physical-phone, human pacing, screen-reader, audible final-music or field-survey certification. M1 feedback and remaining M2–M6 stay open.

## Focused independent request

Review integration and correctness against actual source/tests. Check larger path search/bounds, preserving opening targets/scale, schematic rendering vs hit targets, camera reload/zoom, history route modal/return controls, no new progression gates, save compatibility, source/provenance truth and phone layout. Report concrete file:line problems and minimal fixes. Do not read other reviewers or driver anchor. Write only your designated review file; do not modify code/tests/docs. No new features or dependencies requested.
