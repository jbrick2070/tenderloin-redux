# Character clarity graphics: r3 integration review

Review the current source in C:/tenderloin-redux, baseline fcfef6252e7e57b0a20e93d179efe759e9d88acf. Codex is sole writer; write only your claude.md report. Read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs and docs/STREET_VIEW_ASSESSMENT.md. Do not edit implementation, run another model or create a larger panel.

The creator requested graphics cleanups and research into optional first-person Street View. This code round only improves the established overhead character presentation:

- Player jacket changes from pavement-like yellow to teal; player collar stays gold and shoes become cream. Other characters retain their palette.
- Player and five core ground-level neighbors replace their broad filled GroundRing cylinders with thin hollow vertex-colored rings and a soft, depth-tested contact shadow. Shared person construction for elevated performers, biker and flying chef remains separate; no shadow is added to those.
- The ground treatment uses two simple procedural meshes per configured character, no textures, shaders, added lights or collision. The shadow center follows the root; animation moves limbs only. Existing world/presentation scale stays unchanged.
- Read-only browser snapshot fields expose actual player/shadow position, stride/walking and evening state. They do not mutate state or change visible UI.
- Native tests check scope, depth/alpha behavior, hollow centers, clearance above existing curbs, collision dimensions, moving/turning grounding and save equality. Browser tests use actual Start, Shift+L day/evening toggle and existing Digit5 travel, capture moving/arrived frames, check grounding and leave lighting comparisons out of saves. Existing full overlay/caption tests remain.
- The first-person assessment records a possible separate optional prototype, not an implementation or migration. Creator has since emphasized that optional is essential.

Current candidate evidence: GODOT_STUDY_PASS, export, check and 104 Node tests passed. Initial native test incorrectly assumed an unnamed collision node had the literal name CollisionShape3D and threw; fixed by enumerating direct collision children with a guard. Original failure log retained. Local live preview visually inspected: thinner rings show pavement and shoes, teal distinguishes player. Full browser run is required before completion.

Inspect integration, unintended shadow placement/z-fighting, material/depth behavior under Compatibility/Web, animation or save regressions, fragile/vacuous tests, and source-grounded first-person assessment claims. Flag actionable defects, distinguish facts from visual claims that need a rendered check. Do not demand a full first-person implementation in this bounded graphics round.

Hard invariants: public/ must stay unchanged at fingerprint 2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567; legacy browser save v1 read-only; Godot saves <=4096; all main.gd non-ASCII supported by fallback font. Preserve geometry/provenance, Find Me/F/Map, compact header, readable captions, reward/sound preferences and previous review artifacts. Five gates required after fixes. No physical-phone, full screen-reader, human comfort/pacing/listening, field or deployment claims.
