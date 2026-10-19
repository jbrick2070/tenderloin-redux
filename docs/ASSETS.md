# Shipped assets and dependencies

| Asset | Origin/method | Rights/provenance |
| --- | --- | --- |
| `public/world.js`, `icon.svg`, CSS and UI | Original code-drawn geometric illustration created for this project; generic schematic facades, no reproduced real murals/photos/brands | Project MIT license. Artistic originality does not certify real-world appearance. |
| `public/keepsake.js` and user-exported `tenderloin-redux-afternoon.svg` | Original SVG illustration of selected fictional characters and a snapshot of the player's original mural. Fixed authored consent responses; no real camera, whole-map screenshot, external images or upload | Project MIT license. Only consenting fictional guests can appear; no actual real-person interview/consent record is claimed. Static fictional backdrop uses no geographic map database. |
| `public/gathering.js` current-plan SVG and visitor activity | Original abstract event grid and authored anonymous activity markers, derived from the player's supply arrangement; shared presentation model for original map visitor figures | Project MIT license. Current schematic event plan is not a photograph, consent-keepsake export, surveyed access plan or map database. It imports no audio, photos, artwork or real-person identity. |
| `public/audio.js` | Original procedural 80 BPM synth sketch: new note sequence, oscillator tones and noise brush accents; no sampled performance | Project MIT license. Development placeholder, not a Miles Davis recording, imitation solo or completed recorded jazz score. |
| `public/soundtrack.js` and optional user-selected local audio | Original player code; a creator-chosen MP3/WAV is held in a tab-local object URL, never uploaded, bundled or stored in the game save | Player code is MIT. Selecting a file does not license it to the project. No Suno recording has been imported. Eventual distribution requires the chosen recording's provenance/rights record; see SUNO_MUSIC_BRIEF.md. Quiet original WAV/MP3 test tones are ignored QA artifacts and are not shipped. |
| `public/data/source.osm.xml` | Original OpenStreetMap API bounding-box extract, downloaded 2026-10-18, https://api.openstreetmap.org/api/0.6/map?bbox=-122.413,37.782,-122.408,37.786 | © OpenStreetMap contributors, ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/ and https://www.openstreetmap.org/copyright. Not MIT. Full source extract provided. |
| `public/data/source-turk-west.osm.xml` | Larger original OSM API extract, downloaded 2026-10-18, bbox -122.417,37.7817,-122.408,37.786; preserves prior opening extract separately | © OpenStreetMap contributors, ODbL 1.0. Full raw source and selected geometry provided. Not MIT. |
| `public/data/streets.osm.json` | Named highway-way selection from the larger Turk-west extract; original coordinates, OSM IDs and node IDs retained; metadata includes source | ODbL 1.0; map-data obligations retained. Uniform projection occurs in code at runtime. No map tiles or Google imagery. |
| Fonts | Installed system Segoe UI/system sans and Georgia/Times fallback | No font files distributed or fetched. |
| Game runtime | Browser-standard APIs only; Node built-in static development server and tests | No third-party runtime packages installed/bundled. |

The initial authored historical summary points to the city Historic Preservation Commission agenda (2026-03-18) linked in the game. It uses original prose about facts; no source photographs or quoted article text is shipped. Existing planning/review documents are not shipped by the static server.

No original TenderVoice source, recordings, photographs, or logos are included. Neighborhood Voices was absent in M0; version 0.10.0 adds the original default-off text-only experiment below. All characters and event objects are fictional. Current facade, doorway, crossing, ornamental and bike-lane details are explicitly approximate and require further verification.

Version 0.6.0 adds original Black Hawk history prose with official SFJAZZ, Tenderloin Museum and Miles Davis catalog links (dated checks in SOURCES.md). No source media, live embeds, recordings, artwork or person likeness is bundled; external source pages open only when selected. `history.js` stores projected intersection markers derived from OSM coordinates, under the same ODbL map-data attribution; MIT does not replace those data obligations.

| Added in 0.7.0 | Origin/method | Rights/provenance |
| --- | --- | --- |
| `data/transgender-district.geojson`, `data/cultural-district-source.json` | One complete unchanged city-published Cultural Districts feature; DataSF/Planning dataset 5xmc-5bjj, retrieved 2026-10-18. Query, source URL, license and timestamps retained | Source dataset explicitly PDDL 1.0. Separate from MIT graphics and OSM ODbL data; Planning Department/DataSF credited in visible legend and source note. No city logos, imagery or basemap tiles imported. |
| `district.js`, original Living district prose and map-layer presentation | Original projection/validation, dashed violet boundary display and text based on dated primary facts | Project code/presentation MIT; underlying city data PDDL. No organization/municipal endorsement or surveyed current streetscape claim. |

| Added in 0.8.0 | Origin/method | Rights/provenance |
| --- | --- | --- |
| `public/programme.js`, planner UI, original SVG poster and world programme board | Four authored fictional neighbor proposals and original abstract colored strips; generated only from a whitelisted published running order | Project MIT license. No real event artwork, brand, photographs, musician likeness, audio, map data or borrowed code/media. Planning artifact is separate from consent-aware keepsake and dated real-festival notes; no actual event/date/organization partnership announced. |

| Added in 0.9.0 | Origin/method | Rights/provenance |
| --- | --- | --- |
| `public/hosting.js`, story invitations, eight-step tap/rest pattern, six-tile panel SVG, new portable world panel/stools and event responses | Original fictional resident-led gathering; fixed authored prose, player-edited visual rhythm and original circle/wave/triangle shapes in whitelisted palettes | Project MIT license. No recorded music, real story/interview, personal input, camera image, real event artwork, organization branding or copied public mural. The visual pattern makes no claim to be an audible performance. New props are fictional and separate from opening loans. Street data attribution remains unchanged. |

| Added in 0.10.0 | Origin/method | Rights/provenance |
| --- | --- | --- |
| `public/experimental-host.js`, `public/experiments/neighborhood-voices.js`, optional UI | Original lifecycle/resource ownership, bounded data validation and three-card presentation | Project MIT code and original presentation. No TenderVoice legacy code/media, dependency, voice likeness, recordings, interviews, logos or photos. |
| `public/experiments/neighborhood-voices.json` | Three original factual summaries based on full primary-page reads on 2026-10-18; exact official links and limits in VOICES_SOURCE_REGISTER.md | Facts summarized in original words, no source prose reproduced. No organization affiliation, endorsement, operational availability or branded mission. Source-site content is not relicensed by MIT. The synthetic audio tone is QA-only and is not served in the game. |

| Added in 0.11.0 | Origin/method | Rights/provenance |
| --- | --- | --- |
| `public/civic.js`, listening-hour UI, original schematic SVG | Authored fictional tenant conversation, two quiet arrangements, shared requests, differing neighbor responses, bounded local choices | Original project code/prose/geometric art under MIT. No real event poster/organization stance, source photograph/public mural, copied policy text, musician likeness, recording, personal input or legacy TenderVoice material. Separate diagram does not replace or certify map geography/real access widths. No additional runtime package/media/source dataset. |

| Added in 0.12.0 | Origin/method | Rights/provenance |
| --- | --- | --- |
| `public/film.js`, original The Open Seat storyboard frames/captions and film UI | Original geometric chair, portable motif prop, open-place symbol and optional volunteered fictional hands; player orders three authored shots | Project original code/prose/art under MIT. No film footage, photograph, existing mural copy, recording, real actor/musician likeness or legacy source/media. Generic fictional title is not a uniqueness/trademark claim. Manual illustrated screening, no camera/microphone access or real production/permit. OSM/PDDL map data and prior attribution unchanged. |
