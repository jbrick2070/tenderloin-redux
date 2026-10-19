# Accepted Godot walking/collision checkpoint and forward plan

Accept the Godot 4.7.2 Round 2 milestone — actual-scale walking (`CharacterBody3D`, `1.72 m` height, `4.8 m/s`), authoritative 2D building/courtyard-hole collision (`0.65 m` wall clearance, sub-stepped movement, dynamic street-tangent sliding) with `StaticBody3D` + `ConcavePolygonShape3D` on all 58 city buildings, automatic camera sightline cutaway (`CAMERA_OFFSET = Vector3(180, 180, 180)`), and keyboard/touch neighbor navigation (`Bea`, `Celeste`, `Rook`, `Dez`, `Thanh`) — after one successful independent native Claude CLI review (`claude-opus-5-5`, effort `high`, `rc=0`), source-verified fixes, and final automated gates. Browser 0.12.0 (`2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567`) and all historical review reports remain unchanged.

Provenance and scope updates recorded per creator direction:
1. Documented why Google Open Buildings V3 (excludes North America/San Francisco) and Google Maps Platform 3D Tiles/Street View (require a live billed Google Cloud API key and Google Maps Platform ToS Section 3.2.3 prohibits scraping, caching, or redistributing derived meshes/imagery in an offline MIT repository even for non-commercial use) are not bundled, while using San Francisco's official PDDL building footprints (`DataSF ynuv-fyni`) + OpenStreetMap (`ODbL 1.0`) streets.
2. Recorded the creator's requirement that wider M2/Godot walkable district expansion cover the **entire Tenderloin neighborhood**, not only the Transgender Cultural District or the opening Turk/Taylor/Mason block.

Next bounded milestone (Godot Round 3 in `docs/GODOT_APPROACH.md`):
- Add one fictional neighbor interaction and original portable mural at an authored access-aware game location on the block, proving talking, painting, visible consequence, reload, and keyboard/touch play without claiming permission to paint a real façade.
- Followed by original music / local creator-file playback (Round 4), block validation / save adapter / mobile accessibility checks (Round 5), and whole-Tenderloin M2 neighborhood expansion + M0–M6 carry-forward (Round 6).
