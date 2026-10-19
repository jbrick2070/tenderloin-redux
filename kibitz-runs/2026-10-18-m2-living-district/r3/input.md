# M2 Living district — focused integration review

## Scope

Version 0.7.0 adds an optional city cultural-district map layer and original source-linked community/street context. Ordinary tab-local view, off by default, no save/settings/quest fields. It is not NeighborhoodVoices or a partnership/endorsement. No map tiles, imagery, logos, recordings or source artwork. Streets/player coordinates/BOUNDS/gameplay unchanged. Full-game M2 remains partial: current entrances/crossings/decorations require observation.

Creator requests one independent Kibitz partner per implementation round, explicitly scoped r3 only. Codex/Sol High driver; exact native Claude CLI claude-opus-5-5/high chosen as authorized alternative. Current Gemini 4 Argon (High) pin/catalog check passed but actual most recent Gemini request in prior round returned no report at 15 minutes; catalog is not operational health. Conserve credits by not blindly repeating that failed request. One new native partner prompt this round, no AGY Opus/Astra/duplicate driver family/r1/r2/r4.

## Source and code contracts

- `public/data/transgender-district.geojson`: complete unmodified single MultiPolygon feature fetched from DataSF dataset 5xmc-5bjj using exact query in `cultural-district-source.json`. Metadata API explicitly PDDL, Planning Department attribution, source timestamps/query retained. All 17 positions retained including beyond game bounds. Date field 2017-01-01 is not asserted as an exact founding day. Candidate ArcGIS response was research-only in ignored artifacts; shipped geometry directly DataSF under explicit license.
- `district.js`: validates collection/single named feature/MultiPolygon, finite local coordinates, bounded ring/vertex counts and closed rings, projects through unchanged core.project without altering source. Renderer keeps polygon/hole structure, fills evenodd, uses screen-sized dashed outline and low tint, clips draw to existing game BOUNDS without clipping raw data. ctx.save/restore isolates styles. No containment score/identity rule or walkable change.
- `world.js`: tab-local districtVisible=false/polygons=[]; draw optional layer over schematic buildings but before names/props. Existing people/markers/routes unaffected.
- `game.js`: Living district modal via new nav button or fieldnotes. Lazy bundled-data fetch on first use, deduped while pending, cached geometry after success, error/retry state with disabled show until ready. No external runtime request. Failed/malformed data cannot fail init/core; late completion updates only current district controls/legend and cannot reopen/replace other modals. Retry removal keeps focus inside dialog. Show/hide closes dialog and visible legend has Source notes/Hide controls. Hiding returns focus to nav button. Reload starts layer off; saves untouched.
- HTML/CSS: wrapped responsive four-button navigation, dashed/patterned DOM legend with Planning/DataSF/PDDL attribution, full-district-beyond-game notice, explicit hidden handling. Source links include full downloadable feature, provenance/license, organization About, current city code 107.3(d), dated SFMTA pages. No real logos/art. Version 0.7 in package/readonlydiagnostics. Static server unchanged; .geojson source link intentionally downloads under existing generic binary MIME, while fetch parses JSON normally.

## Grounded source facts

Full officialAbout page confirms 2017 founding by Honey Mahogany/Janetta Johnson/Aria Sa’id and history/culture/economic work; original prose only. Current city code 107.3(d) read, linking source rather than hand-inferring polygon from textual street-side boundaries. DataSF API metadata explicitly identifies PDDL; not assumed from unrelated GIS service. SFMTA 2018 page read for Mason–Polk bikeway. Safer Taylor webopen timed out twice; direct official HTML fetch succeeded and source body read for substantial completion in 2024/wider sidewalks/crossing changes. None is a present field survey or exact decorative-crossing reproduction. SOURCES/ASSETS record these limits.

## Verification gates

54 Node tests pass, syntax passes: original 51 plus three tests for complete sourceprojection/extent/license metadata, malformed swapped/nonfinite/distant/excessive/open geometry, and holes/evenodd/clipping/style restoration. Complete existing Chrome suite is running with new off/on/off exact canvas, note+legend, focus, progress/optional/save isolation, journal access and reload-off checks. Added final-suite cases for malformed-data explicit retry and 320px view, late completion while Neighbors modal open without stealing focus/enabling layer, and aborted citydata leaving core playable. Must rerun final-source suite and inspect narrow/desktop layer/note before acceptance.

No physical phone/screen-reader/human pacing/final music quality or surveyed streetscape is claimed. No full-game acceptance. Preserve all raw historical/manual reports and uncommitted changes; source manifests/archive before fanout and comparison afterward.

## Independent request

Read actual district.js/world/game/HTML/CSS/data/tests and sources. Focus validation/projection, canvas state/stack/holes, async dedup/error/retry/late-result focus, view state/save/quest isolation, source attribution and phone layout. Treat performance guesses as unmeasured. Give concrete file:line evidence/minimal fixes. Do not read any prior reviewer or current driver anchor; write only your designated report, no application/test/doc edits. No new feature/dependency/panel requested.
