# Building geography provenance

City and County of San Francisco, Department of Technology, **Building Footprints**, **ynuv-fyni**. Raw GeoJSON, original metadata and attached method PDF are retained in `source/`.

- Catalog: https://data.sf.gov/Geographic-Locations-and-Boundaries/Building-Footprints/ynuv-fyni
- Metadata: https://data.sfgov.org/api/views/ynuv-fyni.json
- PDF: https://data.sfgov.org/api/views/ynuv-fyni/files/e6e73cd0-15be-47a8-9463-9c9a725b72c3?download=true&filename=SF_BldgFoot_2017-05_description.pdf
- Method prepared 2017-05-01; Pictometry **2010** footprints and airborne LiDAR. Later parcel-guided splitting is not a new survey. 50 cm feature-height surface subtracts bare earth from first return; may include roof/tree effects. Median is a summary, not a detailed roof.
- Published license: **Open Data Commons Public Domain Dedication and License (PDDL) 1.0**, https://opendatacommons.org/licenses/pddl/1.0/ . Confirmed in metadata and PDF. Repository MIT does not override data licenses.
- Query: `https://data.sfgov.org/resource/ynuv-fyni.geojson?$where=intersects(shape,'POLYGON((-122.4118 37.7825,-122.4085 37.7825,-122.4085 37.7842,-122.4118 37.7842,-122.4118 37.7825))')&$limit=1000&$order=sf16_bldgid` (URL-encode query).
- 58 records, below explicit 1000 limit, downloaded 2026-10-18 Pacific / 2026-10-19 UTC. Full intersecting geometries, IDs and properties retained. Selection is a bounded study area, not an exact cadastral block/district boundary. `data_as_of`/`data_loaded_at` are source/portal timestamps, not new observation dates.
- Height: `hgt_mediancm / 100` metres above ground, checked against `hgt_median_m`; absolute roof elevation `p2010_zmaxn88ft` is not used. Ground `gnd_mediancm / 100` retained separately in NAVD88 metres; presentation ground currently flat.
- Projection: approximate local metres, origin lat37.7832203/lon-122.410784. X=(lon-origin.lon)*111320*cos(origin.lat); Z=-(lat-origin.lat)*111320. No individual footprint rotation/scaling/simplification. Derived rings omit only their repeated closing vertex. Source precision is not a survey-accuracy guarantee.
- Offline generator: `scripts/build-godot-data.mjs`. Unmodified **Mapbox earcut v3.0.2** triangulates roofs including holes; ISC license at `scripts/vendor/earcut.LICENSE`, https://github.com/mapbox/earcut/tree/v3.0.2 . Build-only, no remote runtime dependency. Each roof's area deviation is checked; all ring walls retained.
- Streets: existing `public/data/streets.osm.json` plus source XML, original OSM IDs/coordinates. **© OpenStreetMap contributors**, https://www.openstreetmap.org/copyright , ODbL 1.0. Derived street data retains source metadata and ODbL; city buildings remain PDDL. The 10 m bands are schematic widths, not surveyed curbs/sidewalks/permissions.

`source_receipt.json` records input/vendor hashes and official engine/template asset hashes; tests verify every listed hash. Generated `buildings.json` records raw GeoJSON and OSM street hashes, and tests verify exact derived streets. Godot Engine copyright/permission text is retained at `godot/ENGINE_LICENSE.txt` and included in the export. No imagery, business identities, current occupancy claims, borrowed art/music or Google Maps/Earth assets imported. Current façades/roof details/entrances/crossings/decorations remain unverified.

## Why Google Maps / Google Open Buildings Are Not Bundled (Even Non-Commercial)

- **Google Open Buildings V3 (`CC BY 4.0`)**: Covers Africa, South/Southeast Asia, Latin America, and the Caribbean; it does **not** cover North America or San Francisco.
- **Google Maps Platform Photorealistic 3D Tiles, Street View, and Places**: Even for non-commercial projects, Google Maps Platform requires a live billed Google Cloud API key at runtime, and Google Maps Platform Terms of Service (Section 3.2.3: *No Scraping*, *No Caching*, *No Creating Content From Google Maps Content*) prohibit pre-fetching, extracting, or redistributing Google 3D meshes, textures, panoramas, or place data inside a self-contained offline MIT repository.
- **Verified Open-Data Alternative Used Here**: San Francisco's official airborne-LiDAR + Pictometry building footprints (`DataSF ynuv-fyni`, **PDDL 1.0**) paired with **OpenStreetMap (`ODbL 1.0`)** street centerlines give higher cadastral/roof-height fidelity for San Francisco without proprietary keys, runtime network calls, or ToS restrictions, and scale cleanly across the **entire Tenderloin neighborhood** in subsequent M2 milestones.

