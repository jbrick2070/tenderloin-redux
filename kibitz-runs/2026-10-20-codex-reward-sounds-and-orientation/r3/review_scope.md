# Reward sounds, startup orientation and visible progress

Baseline main: 37543ffab9d5fc8245514fb1e733962727ee6b94.
Review current files in C:\tenderloin-redux read-only; write only your review.

User asked for friendly micro rewards and sounds, then explicitly requested zooming to the player after accepting Start, and a persistent on-screen indication of progress.

Changed files: godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs.
Inspect real source, especially:
- make_reward_sound/play_reward_sound, build_audio_players, trigger_progress_cue: bounded original PCM notes, soft envelope, one player, input-unlocked, separate from soundtrack. Suppression, mute, restore and revisit behavior.
- _input plus settings save/load/clear: preference separate from game save, old settings compatible, no auto-play or queued startup effects.
- continue_story, startup_story_pending, _ready, story button and keyboard acceptance: initial card only frames actual player; later cards and Map Overview preserve navigation; no teleport or save schema additions.
- make_ui/update_objective_ui: always-visible Sparks and keepsakes; title-row Sounds switch. Short mobile neighbor headers and Next Step label; responsive refresh.
- Native and browser tests: three sizes, actual clicks, settings isolation, PCM limits, paused/local music, startup/reload, progress snapshots.

Gates are being run by the driver. Do not claim they passed from reading code. Find concrete regressions or uncovered integration risks, citing real paths/lines. Review particularly narrow layout, camera centering and input focus, actual SFX suppression and audio duplication, default settings semantics and no changes to public/.

Invariants: public/ frozen; legacy tenderloin-redux.save.v1 read-only; Godot v1 <=4096 bytes; supported fallback-font glyphs; peaceful original fictional gameplay grounded in existing geography.
No external libraries, copyrighted audio, deployment or real-world factual changes.
