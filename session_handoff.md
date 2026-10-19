# Session Handoff — Tenderloin Redux — 2026-10-18 Pacific / 2026-10-19 UTC

## Core goal

Build the peaceful Tenderloin game described in docs/CONCEPT.md and the complete docs/ROADMAP.md. Creator has now selected **Godot with an isometric/2.5D view and accurate city-sourced buildings**. Continue as **AGY 4 / Gemini 4 Argon High**; do not silently use AGY Opus or change to a costly model.

## Tech stack and constraints

Windows PowerShell, C:\tenderloin-redux, origin https://github.com/jbrick2070/tenderloin-redux.git, main. Browser game remains 0.12.0 at http://127.0.0.1:4173/ . Separate Godot4.7.2 standard/GDScript Compatibility project in godot/, Web study at http://127.0.0.1:4174/ . Both servers are local previews, not deployments. Verify they are still running before relying on these URLs.

**Codex hourly automation build-tenderloin-redux is PAUSED at the creator's request. Do not restart that Codex task. The creator explicitly authorizes AGY to set up and run its own hourly scheduler after taking over as the sole writer.** Inspect git/instructions/processes and .build-round.lock first; avoid overlapping schedules, serialize work and preserve creator changes/historical reports. Stay quiet on unchanged/non-actionable state; notify playable milestones, failures, decisions or completion. Continue through documented full-game acceptance, then stop AGY's own task. Creator explicitly authorizes regular tested, reviewed commits and normal pushes to origin; no force push, purchases, public game publishing or external outreach. No automatic community endorsement/permission, borrowed Miles Davis recordings/solos or uncleared TenderVoice import.

**Each implementation turn should get actual CLI QA from another model when possible.** Default: one independent Kibitz native Claude CLI partner with `--driver agy --only claude`, exact `KIBITZ_CLAUDE_MODEL=claude-opus-5-5`, `KIBITZ_CLAUDE_EFFORT=high`. Claude CLI works; old OAuth failure is historical. If unavailable, try the independent Codex CLI lane, `--driver agy --only codex`, `KIBITZ_CODEX_MODEL=gpt-6.1-sol`, `KIBITZ_CODEX_REASONING=high`, after verifying availability. AGY/Gemini driver must not count its own CLI as an independent family. One successful partner is sufficient; no large panels or AGY Opus/Astra/purchases/blind auth/quota retries. Grounded driver anchor, focused input and explicit single-r3 scope receipt precede fanout; retain actual model/effort/quota receipts, source archive/comparison, source-verified judgment and final artifact. No paid re-review of unchanged code. Installed skill: C:\Users\jeffr\.codex\plugins\cache\claude-cowork\anthropic-skills\1.0.0\skills\kibitz\SKILL.md (runner scripts/kibitz.py).

**Explicit last-resort exception from the creator:** if other reviewers are unavailable, AGY may spawn **Gemini Flash 3.8** for QA if that exact model is available through its supported subagent/CLI mechanism. Verify/record actual model identity; do not invent or silently substitute the requested version. Record this as a creator-authorized same-Gemini-family fallback, not an independent-family review, and do not falsify Kibitz driver/lane receipts to bypass its exclusion. If no permitted reviewer can run, preserve an explicitly unreviewed checkpoint and report the gap; failed attempts never count as QA. The scheduler prompt must carry this entire review/fallback policy.

## Done and decided

- Existing browser game through 0.12 includes opening gathering, mobile neighbor navigation, local music import, wider history walk, district boundary, later programme/hosting, civic hour, illustrated film and safe default-off Voices. Full roadmap acceptance is still false; see BUILD_STATUS for exact implemented scope/human/source limits. Preserve browser saves; there is no automatic Godot save adapter.
- **Godot Round 1 (geography foundation) & Round 2 (actual-scale walking, collision, cutaway, and neighbor navigation) are complete**:
  - 58 full city MultiPolygons (`DataSF ynuv-fyni`, PDDL 1.0) around Turk/Taylor/Mason, IDs and courtyards retained; median above-ground heights (`hgt_mediancm / 100`), original Tenderloin sandstone/terracotta/warm-stone palette, derived OpenStreetMap (`ODbL 1.0`) street centerlines with schematic sidewalk/roadway bands and dashed centerlines.
  - `CharacterBody3D` player (`1.72 m` height, `4.8 m/s` speed) with authoritative 2D polygon + courtyard-hole collision (`0.65 m` wall clearance, sub-stepped movement, dynamic street-tangent sliding from `data.streets`) and `StaticBody3D` + `ConcavePolygonShape3D` on all 58 buildings.
  - 5 neighbors (`Bea`, `Celeste`, `Rook`, `Dez`, `Thanh`) on verified sidewalks (`>= 2.39 m` wall clearance), cell-cached BFS + string-pulled sidewalk pathfinding with 3D route ribbon, continuous non-teleporting arrival (`<= 1.35 m`, `>= 0.70 m`), automatic camera sightline cutaway (`CAMERA_OFFSET = Vector3(180, 180, 180)`), 6 responsive buttons (`>= 44 px` at `1100x760`, `390x667`, `320x667`), keyboard shortcuts (`WASD`/Arrows, `1`–`5`, `N`/`B`, `F`, `Esc`), and 3D scene tap/drag (`> 8 px` drag threshold).
  - Reviewed by independent native Claude CLI (`claude-opus-5-5`, effort `high`, `rc=0`) under `kibitz-runs/2026-10-18-godot-walking-collision/r3/` with zero reviewer source edits and all confirmed fixes verified against source and tested.
- **Creator directives recorded (2026-10-18)**:
  - **Google Maps / Open Buildings evaluation (non-commercial)**: Documented in `godot/data/SOURCES.md`, `docs/GODOT_APPROACH.md`, and `docs/ROADMAP.md` why Google Open Buildings V3 (excludes North America/SF) and Google Maps Platform 3D Tiles/Street View (require live billed API key; ToS Section 3.2.3 prohibits offline scraping/caching/redistribution in an MIT repo even for non-commercial use) are not bundled, while open city PDDL + OSM ODbL data provide higher San Francisco fidelity.
  - **Whole-Tenderloin M2 scope**: Documented in `docs/ROADMAP.md` and `docs/GODOT_APPROACH.md` that wider M2/Godot walkable district expansion must cover the **entire Tenderloin neighborhood**, not only the Transgender Cultural District or the opening Turk/Taylor/Mason block.

## Current evidence and tools

Final verification receipts and retained failure notes are in `kibitz-runs/2026-10-18-godot-walking-collision/r3/` and `docs/BUILD_STATUS.md`. Browser runtime fingerprint remains `2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567`; version 0.12.0 unchanged. All 94 Node tests, JS syntax checks, native Godot study/walking/collision/cutaway/UI checks (`GODOT_STUDY_PASS`), negative harness sentinel (`--force-failure` exit 1), Web export, and Chrome `1100x760`/`390x667`/`320x667` smoke tests pass. Physical phone, full screen-reader output, community participation and human pacing/art/music acceptance remain unverified.

Engine executable: `C:\Users\jeffr\.cache\tenderloin-tools\godot-4.7.2\Godot_v4.7.2-stable_win64_console.exe` . Official archive hashes verified; templates in standard user AppData `Godot/export_templates/4.7.2.stable`. Not committed. `scripts/run-godot.mjs` uses `GODOT_BIN`, then this cache, then `godot` on PATH.

Run `npm.cmd run godot:data`, `npm.cmd run godot:import`, `npm.cmd test`, `npm.cmd run check`, `npm.cmd run godot:test`, `npm.cmd run godot:export`. Start `npm.cmd run godot:serve` in a separate terminal before `npm.cmd run godot:browser`; keep existing `4173` alive. `PLAYWRIGHT_MODULE` can point to `C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs` . Python for Kibitz: `C:\Users\jeffr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` . Generated artifacts/cache ignored. Do not commit binaries/secrets.

## Immediate next steps

1. Read this handoff, `docs/GODOT_APPROACH.md`, `docs/BUILD_STATUS.md`, `docs/ROADMAP.md` and repository instructions. Verify branch/status, current files and no competing writer. Do not re-review unchanged Round 1/Round 2 code.
2. Implement the next bounded Godot milestone (Round 3 of `docs/GODOT_APPROACH.md`): add one fictional neighbor conversation and an original portable mural interaction at an authored access-aware game location on the block, proving talking, painting, visible consequence, reload (separate Godot save namespace), and keyboard/touch play without claiming permission to paint a real façade.
3. Follow with Round 4 (original music and progress cues with explicit playback + creator local Suno import pathway), Round 5 (block validation, browser-save adapter, mobile/accessibility checks), and Round 6 (whole-Tenderloin neighborhood expansion and M0–M6 carry-forward). Preserve the existing browser build throughout.
4. Get one successful other-model CLI QA per implementation turn when possible using the default/fallback policy above; verify claims, fix/test and update status. Commit/push checkpoints regularly with honest review status. Keep the Codex scheduler paused; keep AGY's hourly scheduler active as sole writer until full-game acceptance is achieved.

## Open questions

Current façades/terrain/entrances/crossings need further dated sources; Godot mobile/accessibility/save migration and whole-Tenderloin footprint extraction remain open for subsequent rounds. Creator may contribute Suno jazz: retain local import/provenance workflow from `docs/SUNO_MUSIC_BRIEF.md`, no track bundled/cleared by assumption.

## Resume prompt

Read `C:\tenderloin-redux\session_handoff.md` and the referenced current project docs. Continue the next bounded Godot milestone (Round 3: fictional neighbor conversation + original portable mural with visible saved consequence) using Gemini 4 Argon High. Preserve measured geography, browser 0.12.0 and creator work. Keep your AGY hourly scheduler active, leave the Codex scheduler paused, and keep one writer. Each implementation turn: seek other-family CLI QA (Claude Opus 5.5/High, otherwise Codex Sol High); if neither is available, creator authorizes Gemini Flash 3.8 subagent QA if available, explicitly labeled same-family fallback. Verify actual models/claims, test, record evidence and push checkpoints regularly.

