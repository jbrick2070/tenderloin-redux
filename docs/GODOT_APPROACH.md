# Godot approach — creator decision, 2026-10-18

Build a stylized isometric/2.5D Godot version, beginning with a separately runnable block before wider migration. Preserve browser 0.12.0 and its saves while testing the new engine. Neither track is a finished release.

`godot/` is a Godot 4.7.2 standard/GDScript Compatibility project. This first slice is an **interactive geography study**, not the walking game. It shows 58 city building records around Turk/Taylor/Mason, with Previous/Next, Overview and zoom. Selection shows stable city ID and median above-ground height. Orthographic camera at equal X/Y/Z offset; no compressed buildings. Neutral original materials are not researched façades.

[San Francisco Building Footprints](https://data.sf.gov/Geographic-Locations-and-Boundaries/Building-Footprints/ynuv-fyni) provides full footprint rings and LiDAR height statistics under PDDL. City method identifies Pictometry **2010** data and a method prepared 2017-05-01. Portal refresh times do not establish current buildings. Keep actual rings, parts and courtyards; use above-ground `hgt_mediancm / 100`, never absolute NAVD88 roof elevation as height. Median-height LoD1 extrusion is not an exact roofline or floor count. Flat presentation ground does not reproduce terrain; street widths are schematic. Current façades, entrances, crossings and decorations remain separate verification work. [Provenance](../godot/data/SOURCES.md).

Google Open Buildings V3's [published coverage](https://sites.research.google/gr/open-buildings/) does not include San Francisco; city data is the first choice here. No Google imagery/mesh/texture imported.

## Next implementation rounds

1. The geography foundation is checked and independently reviewed; see BUILD_STATUS for final receipts. It does not complete the one-block prototype; do not pay to re-review unchanged source.
2. Add actual-scale walking/collision, bounded easy neighbor navigation and camera occlusion/cutaway without moving real geometry.
3. Add one fictional neighbor and original portable mural at an authored access-aware game location. Prove talking, painting, visible consequence, reload and keyboard/touch play; do not claim permission to paint a real façade.
4. Add original music and progress cues with explicit playback; preserve the creator's local Suno import option/provenance brief. No Suno audio bundled yet. Listen before claiming musical quality.
5. Validate the block before wider migration. Browser-save compatibility requires an explicit adapter; this study does not read or write those saves. Test mobile controls/accessibility before replacing the DOM-based browser experience.
6. Carry forward the entire M0–M6 roadmap: resident-led projects and later gatherings, accurate wider district/history/culture/nonprofits/festivals, civic events/filming and default-off Neighborhood Voices. Existing human/current-location/release acceptance remains open.

## Local run

Open `godot/project.godot` in Godot 4.7.2 standard. The official portable engine and matching templates are verified in the user cache, outside Git. No .NET or global installation needed. With Godot on PATH:

```powershell
node scripts/build-godot-data.mjs
godot --headless --path godot --editor --import --quit
godot --path godot
```

For a browser preview, install official matching Web templates, create `artifacts/godot-web/`, then:

```powershell
godot --headless --path godot --export-release Web
node scripts/serve-godot.mjs
```

Study: http://127.0.0.1:4174/ . Existing game: http://127.0.0.1:4173/ . Generated exports/cache are ignored. Data regeneration is offline/deterministic; source refresh must be deliberate, dated and reverified. `npm test` includes geometry checks. `node tests/godot-browser.mjs` uses existing Playwright setup; canvas pixel changes/screenshots do not establish screen-reader speech or physical-phone feel.

## Scheduler and remote checkpoints

The creator requested a handoff to AGY 4 and stopped the hourly work at this checkpoint. Existing `build-tenderloin-redux` heartbeat is now **PAUSED**, verified through the app tool and saved configuration. Do not resume it without a new request. Its retained hourly prompt records this Godot/data approach and regular reviewed pushes. For an AGY driver use Gemini 4 Argon High and exclude the Antigravity CLI from independent Kibitz partners; native Claude Opus 5.5 High is the authorized economical single partner. The creator authorizes regular commits/pushes after meaningful tested and independently reviewed checkpoints. Inspect intended files, exclude secrets/binaries/caches/generated bulk artifacts, preserve user changes and historical reports. No force push or shared-history rewriting. Retain local work and report exact auth/conflict/rejection blockers.

The npm launchers use GODOT_BIN if set, otherwise the verified Windows user cache or `godot` on PATH. Run in order: `npm run godot:data`, `npm run godot:import`, `npm run godot:test`, `npm run godot:export`. Start `npm run godot:serve` in another terminal **before** `npm run godot:browser` (requires Playwright). `npm run check` includes the Godot JS syntax checks. Use GODOT_PORT for a different preview port in both server and browser tests. Native rule/UI checks can run separately with `godot --headless --path godot --script res://tests/study_test.gd`.
