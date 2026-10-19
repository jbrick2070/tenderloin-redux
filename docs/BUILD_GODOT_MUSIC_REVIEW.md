# Godot Round 4 Review — Rook's Speaker, Procedural 80 BPM Synth Sketch & Local Suno Audition (`2026-10-18-godot-music-cues`)

## Summary
- **Milestone**: Godot Round 4 from [`docs/GODOT_APPROACH.md`](file:///C:/tenderloin-redux/docs/GODOT_APPROACH.md) and [`docs/SUNO_MUSIC_BRIEF.md`](file:///C:/tenderloin-redux/docs/SUNO_MUSIC_BRIEF.md) — Freestanding 3D `RookSpeaker` on Turk Street, Rook soundcheck interaction, procedural 80 BPM 4-stem synth sketch (`AudioStreamGenerator`), progress cues, and tab-local Suno MP3/WAV/OGG audition.
- **Implementation Writer**: `AGY 4 / Gemini 4 Argon` (High reasoning)
- **Independent CLI QA**: `Claude Opus 5.5` (`claude-opus-5-5`, effort `high`, via Kibitz `--driver agy --only claude`, `rc=0`, `TOOL CHECK: PASS`, `VERDICT: yes-with-fixes`)
- **Review Artifacts**:
  - [`kibitz-runs/2026-10-18-godot-music-cues/r3/packet.md`](file:///C:/tenderloin-redux/kibitz-runs/2026-10-18-godot-music-cues/r3/packet.md)
  - [`kibitz-runs/2026-10-18-godot-music-cues/r3/driver_anchor.md`](file:///C:/tenderloin-redux/kibitz-runs/2026-10-18-godot-music-cues/r3/driver_anchor.md)
  - [`kibitz-runs/2026-10-18-godot-music-cues/r3/claude.md`](file:///C:/tenderloin-redux/kibitz-runs/2026-10-18-godot-music-cues/r3/claude.md)
  - [`kibitz-runs/2026-10-18-godot-music-cues/r3/final.md`](file:///C:/tenderloin-redux/kibitz-runs/2026-10-18-godot-music-cues/r3/final.md)

## What Was Built
1. **Freestanding 3D `RookSpeaker` on Turk Street ([`godot/main.gd`](file:///C:/tenderloin-redux/godot/main.gd))**:
   - Placed at `ROOK_SPEAKER_POS = Vector3(117.10, 0.0, -15.95)` near Rook (`114.71, -14.79`), `5.91 m` clear of nearest measured building `201006.0004056`, outside all 58 building footprints, with all 4 cabinet corners `>= 2.35 m` clear of walls (`SPEAKER_HALF_EXTENTS = Vector2(0.34, 0.28)`).
   - Includes `StaticBody3D` collision, solid footprint exclusion in `is_walkable_point()`, walkable stand position `speaker_stand_xz()`, cached street tangent/normal vectors (`cached_speaker_tangent`, `cached_speaker_normal`), sightline occlusion cutaway support (`occ_tag = 98`), and 3D `SpeakerCone` / `SpeakerBeacon` meshes that respond to soundcheck and playback state.
2. **Rook Soundcheck & Consistent Arrival Contract ([`godot/main.gd`](file:///C:/tenderloin-redux/godot/main.gd))**:
   - Walking to Rook (`KEY_3`, `"Walk to neighbor"`, or tapping Rook) or tapping the 3D `RookSpeaker` opens `MusicPanel` (mutually exclusive with `MuralPanel`).
   - Pressing `KEY_R` or clicking `"Soundcheck: Rook"` calls `request_rook_soundcheck()`: if already at Rook or `RookSpeaker`, it runs `check_sound_with_rook()` immediately; if away, it walks to Rook with `pending_rook_talk = true` and runs `check_sound_with_rook()` upon arrival.
   - `check_sound_with_rook()` sets `rook_soundcheck_done = true`, unlocks the `"brush"` and `"lead"` stems, lights the 3D speaker beacon, frames Rook and the speaker in the camera, and saves to the isolated Godot save (`user://godot_block_save_v1.json` / `tenderloin-redux.godot.save.v1`).
3. **Original Procedural 80 BPM 4-Stem Synth Sketch & Progress Cues ([`godot/main.gd`](file:///C:/tenderloin-redux/godot/main.gd))**:
   - Explicit playback (`start_music_playback()`, `stop_music_playback()`, `toggle_music_playback()`, `KEY_K`, `Play Music` / `Pause Music` button). Never autoplays on startup or reload.
   - Both `SketchAudioPlayer` and `LocalAudioPlayer` set `playback_type = AudioServer.PLAYBACK_TYPE_STREAM` so Godot 4.7 Web exports mix streams without WebAudio sample-mode console warnings.
   - `advance_music_clock(delta)` fills `sketch_playback.get_frames_available()` on real audio devices (with deterministic delta-based synthesis on the headless `"Dummy"` driver) using a single sample-accurate counter (`sketch_frames_pushed + i`) for all 4 stems (`"bass"`, `"brush"`, `"chords"`, `"lead"`).
   - Volume cycling (`cycle_music_volume()`, `KEY_V`, `70% -> 100% -> 35% -> 0%`) applies gain once via `AudioStreamPlayer.volume_db` (`-80 dB` when muted) and reports post-fader `last_sample_rms = last_pre_gain_rms * music_volume`.
4. **Tab-Local Suno MP3/WAV/OGG Audition ([`godot/main.gd`](file:///C:/tenderloin-redux/godot/main.gd))**:
   - `load_local_music_bytes(file_name, raw_bytes)` validates `.mp3`, `.wav`, and `.ogg` extensions, byte length (`<= 40 MB`), RIFF/WAVE PCM chunks (`parse_wav_stream`), ID3v2/MPEG frame sync headers (`is_plausible_mp3`), and Ogg Vorbis identification/audio pages (`is_plausible_ogg_vorbis`) before decoding so invalid or corrupt files return `MUSIC_FILE_ERROR` or `MUSIC_DECODE_ERROR` without engine errors and without clobbering a previously loaded valid track.
   - Web file picker bridge (`#tenderloin-godot-audio-input`, `FileReader.readAsArrayBuffer`, `window.__tenderloinQueueLocalAudioBytes`, and adapter `window.__tenderloinQueueLocalAudioBase64`) transfers `Uint8Array` directly into Godot `PackedByteArray` without JSON/base64 copies.
   - Local tracks hide procedural stem labels (`"Local full track (procedural stems hidden)"`), remain strictly tab-local (never uploaded, never persisted in save JSON), and `use_synth_sketch()` (`KEY_U` or `Use Sketch` button) returns to the 80 BPM procedural sketch.

## Independent CLI Review Findings & Fixes Applied
All 4 Must-Fix items, 9 Should-Fix items, and 4 Cut items identified by `Claude Opus 5.5` High were verified against source and fixed:
1. **Persisted `visited_neighbors` on all neighbor arrivals**: `finish_neighbor_arrival()` now calls `save_godot_state()` whenever a neighbor is newly visited, and `study_test.gd` verifies that visiting Bea alone persists `"bea"` and restores `["bass", "brush"]` on reload.
2. **Unified `request_rook_soundcheck()` across `KEY_R` and `"Soundcheck: Rook"` button**: Clicking `"Soundcheck: Rook"` while away from Rook now walks to Rook first and defers `check_sound_with_rook()` until arrival.
3. **Full `AudioStreamGenerator` buffer fill & unified sample clock**: `advance_music_clock()` now fills `get_frames_available()` on real audio devices, advances phase strictly by pushed frames, derives `step_idx` and brush envelope `step_t` per sample from one sample counter, and applies `music_volume` once via `volume_db`.
4. **Direct `ArrayBuffer` / `Uint8Array` Web audio bridge**: Replaced `readAsDataURL` + `JSON.stringify` + `Marshalls.base64_to_raw` with `readAsArrayBuffer` + `Uint8Array` -> `PackedByteArray` transfer.
5. **Pre-validation for corrupt `"ID3"` / `"OggS"` headers & WebAudio warning gate**: Added `is_plausible_mp3()` and `is_plausible_ogg_vorbis()`, added `"ID3"` and `"OggS"` corrupt-body fixtures to `study_test.gd` and `tests/godot-browser.mjs`, and added a `console.warn` check for WebAudio sample-mode warnings in `tests/godot-browser.mjs`.
6. **Hot-path tangent caching, `save_seq` recency sorting & runtime cleanup**: Cached mural/speaker street tangents and normals, sorted save candidates by `save_seq` in `load_godot_state()`, unified `SPEAKER_HALF_EXTENTS`, moved `make_synthetic_wav_bytes()` to `study_test.gd`, and removed unused `load_local_music_file()`.

## Verification Results
- `npm.cmd run godot:test`: `GODOT_STUDY_PASS:58 meshes, measured heights, collision/courtyards, walking/sliding, 5 neighbors, Celeste portable mural, Rook speaker/music/local-audition, save/reload, cutaway, 44px and ui_accept at 1100/390/320` (exit `0`, 0 warnings, 0 leaked instances).
- Negative sentinel `node scripts/run-godot.mjs --headless --path godot --script res://tests/study_test.gd -- --force-failure`: `NEGATIVE_SENTINEL_OK exit=1`.
- `npm.cmd run godot:export`: `artifacts/godot-web/index.pck` exported cleanly.
- `npm.cmd run godot:browser`: Chrome headless verification at `1100×760`, `390×667`, and `320×667` (`errors: []`, `external: []`, `rookMusicAuditionVerified: true`).
- `npm.cmd test`: `94/94` Node tests pass.
- `npm.cmd run check`: `0` syntax errors.
