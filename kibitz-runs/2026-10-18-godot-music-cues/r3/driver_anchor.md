# Driver Anchor — Godot Round 4 (`2026-10-18-godot-music-cues`, r3)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High reasoning)
- **Reviewer**: `Claude Opus 5.5` (`claude-opus-5-5`, effort `high`, via Kibitz `--driver agy --only claude`, `rc=0`)
- **Pre-fan-out anchor**: `packet.md` written before Kibitz fan-out against `godot/main.gd`, `godot/tests/study_test.gd`, and `tests/godot-browser.mjs`.
- **Key areas anchored prior to review**:
  1. Freestanding 3D `RookSpeaker` on Turk Street (`ROOK_SPEAKER_POS = Vector3(117.10, 0.0, -15.95)`), `>= 5.5 m` clear of nearest measured building `201006.0004056`, outside all 58 building footprints, with all 4 corners `>= 2.35 m` clear of walls.
  2. Rook soundcheck (`check_sound_with_rook()`, `request_rook_soundcheck()`, `walk_to_speaker()`, `KEY_R`) and isolated Godot save persistence (`user://godot_block_save_v1.json` / `tenderloin-redux.godot.save.v1`).
  3. Procedural 80 BPM 4-stem synth sketch (`AudioStreamGenerator`) with `AudioServer.PLAYBACK_TYPE_STREAM`, progress cues, and volume cycling.
  4. Tab-local Suno MP3/WAV/OGG audition (`load_local_music_bytes()`, `use_synth_sketch()`, Web file picker bridge `#tenderloin-godot-audio-input`).
