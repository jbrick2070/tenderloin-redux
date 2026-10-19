# Driver Judgment — Godot Round 4 (`2026-10-18-godot-music-cues`)

- **Reviewer**: `Claude Opus 5.5` High (`claude-opus-5-5`, `rc=0`, `TOOL CHECK: PASS`, `VERDICT: yes-with-fixes`)
- **Action Taken**: All 4 Must-Fix, 9 Should-Fix, and 4 Cut items verified against source and fixed before merge:
  1. `finish_neighbor_arrival()` persists newly added `visited_neighbors` via `save_godot_state()`, verified by a standalone Bea-only reload test in `study_test.gd` and Playwright assertion `parsedSave.visited_neighbors.includes('bea')`.
  2. `request_rook_soundcheck()` handles both `KEY_R` and `music_rook_btn` (`"Soundcheck: Rook"`), walking to Rook and deferring `check_sound_with_rook()` when not within `2.2 m`.
  3. `advance_music_clock()` pushes available `AudioStreamGeneratorPlayback` frames, advances `sketch_frames_pushed` and `sketch_phase` strictly by generated samples, and derives `step_total`, `step_idx`, and `step_t` from a single sample counter.
  4. Web local audio file bridge uses `FileReader.readAsArrayBuffer` and `Uint8Array` -> `PackedByteArray` transfer (`window.__tenderloinQueueLocalAudioBytes`), with `window.__tenderloinQueueLocalAudioBase64` retained as a thin adapter.
  5. Unified `finish_speaker_arrival()` / `finish_neighbor_arrival()` auto-soundcheck behavior, cleared `pending_rook_talk` in `walk_to_speaker()`, added `is_plausible_mp3()` / `is_plausible_ogg_vorbis()` pre-checks and corrupt-body tests, eliminated double volume scaling on synthesized samples, sorted save candidates by `save_seq`, cached mural/speaker street frames, removed unused `load_local_music_file()`, and capped `cue_history` at 32 entries.
