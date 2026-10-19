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
- New Godot slice is an **interactive geography study**, not the walking/mural/music prototype. 58 full city MultiPolygons around Turk/Taylor/Mason, IDs and courtyards retained; median above-ground heights, original neutral materials. City PDDL data is from Pictometry2010 with method2017; portal loading dates do not mean a current survey. Flat terrain, median-height extrusion and schematic street widths are explicitly approximate; no current façade/roof/occupancy/entrance/crossing certification.
- Data source, exact query, unit/projection formulas and source/license hashes: godot/data/SOURCES.md, source_receipt.json and retained raw source/metadata/PDF. `node scripts/build-godot-data.mjs` is offline; roof triangulation uses pinned ISC Mapbox earcut3.0.2. OSM centerlines remain ODbL with attribution. No Google mesh/imagery; Google's published Open BuildingsV3 coverage excludes SF.
- Successful single independent exact native Claude Opus5.5/High review is under kibitz-runs/2026-10-18-godot-isometric-block/r3/. Reviewer made zero source edits. Driver fixes: first Previous, narrow overview zoom reversal, camera transform/refit/reset, clear selection/context on Overview, real keyboard input evidence, negative harness exit, source/vendor/OSM hashes and regeneration checks, preview-port propagation/npm launchers. Optional hard-coded Browser-game link removed; original preview stays separately documented.

## Current evidence and tools

Final verification receipts and retained failure notes are in that campaign and docs/BUILD_STATUS.md. Browser runtime fingerprint remains `2a9641a83499cdb6ba7f7c43d6cd9c8fa7ce34ce689b3be461b1f21ae5f84567`; version0.12 unchanged. Node94 tests and native Godot geometry/control checks pass; see latest final receipts for export/Chrome completion, not an older pre-fix log. Physical phone, full screen-reader output, community participation and human pacing/art/music acceptance remain unverified.

Engine executable: C:\Users\jeffr\.cache\tenderloin-tools\godot-4.7.2\Godot_v4.7.2-stable_win64_console.exe . Official archive hashes verified; templates in standard user AppData Godot export_templates/4.7.2.stable. Not committed. `scripts/run-godot.mjs` uses GODOT_BIN, then this cache, then godot on PATH.

Run `npm run godot:data`, `npm run godot:import`, `npm test`, `npm run check`, `npm run godot:test`, `npm run godot:export`. Start `npm run godot:serve` in a separate terminal before `npm run godot:browser`; keep existing4173 alive. PLAYWRIGHT_MODULE can point to C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs . Python for Kibitz: C:\Users\jeffr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe . Generated artifacts/cache ignored. Do not commit binaries/secrets.

## Immediate next steps

1. Read this handoff, docs/GODOT_APPROACH.md, BUILD_STATUS.md, ROADMAP.md and repository instructions. Verify branch/status, current files and no competing writer. Do not repeat the completed geography review just to start.
2. Implement the next bounded Godot milestone: actual-metre walking with building collision and camera occlusion/cutaway; easy keyboard/touch neighbor navigation that stays outside real footprint interiors and respects bounds. Keep all measured geography unchanged and test collision/arrival behavior.
3. Add one fictional neighbor and an original portable mural interaction with a visible consequence and separate save namespace; original music follows. Validate the one-block experience before a full port. Preserve the existing browser build throughout.
4. Get one successful other-model CLI QA per implementation turn when possible using the default/fallback policy above; verify claims, fix/test and update status. Commit/push checkpoints regularly with honest review status. Keep the Codex scheduler paused; AGY may create its own hourly scheduler with this exact QA policy and no overlapping writer.

## Open questions

Current façades/terrain/entrances/crossings need further dated sources; Godot mobile/accessibility/save migration remains open. Creator may contribute Suno jazz: retain local import/provenance workflow from docs/SUNO_MUSIC_BRIEF.md, no track bundled/cleared by assumption. These do not block the first collision/navigation slice.

## Resume prompt

Read C:\tenderloin-redux\session_handoff.md and the referenced current project docs. Continue the next bounded Godot walking/collision and neighbor-navigation milestone using Gemini 4 Argon High. Preserve measured geography, browser0.12 and creator work. You may run your own hourly scheduler; leave the Codex scheduler paused and keep one writer. Each implementation turn: seek other-family CLI QA (Claude Opus5.5/High, otherwise Codex SolHigh); if neither is available, creator authorizes Gemini Flash3.8 subagent QA if available, explicitly labeled same-family fallback. Verify actual models/claims, test, record evidence and push checkpoints regularly. Follow the complete handoff policy, then start the work.
