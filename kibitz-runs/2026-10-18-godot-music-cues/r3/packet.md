# Review Packet — Godot Round 4 (`2026-10-18-godot-music-cues`)

## Scope
Implement Godot Round 4 from `docs/GODOT_APPROACH.md` and `docs/SUNO_MUSIC_BRIEF.md`:
1. **3D `RookSpeaker` Prop & Sidewalk Collision (`ROOK_SPEAKER_POS = Vector3(117.10, 0.0, -15.95)`)**:
   - Freestanding 3D sidewalk monitor on Turk Street near Rook (`114.71, -14.79`), `>= 5.5 m` clear of nearest measured building `201006.0004056`, outside all 58 building footprints, with all 4 cabinet corners `>= 2.35 m` clear of walls.
   - `StaticBody3D` collision + solid footprint exclusion in `is_walkable_point(pt)`, with walkable stand position `speaker_stand_xz()`.
   - 3D `SpeakerCone` and `SpeakerBeacon` meshes that visibly update when Rook's soundcheck is completed or when music playback is active (`sketch` vs `local` mode).
2. **Rook Soundcheck & Navigation (`check_sound_with_rook()`, `walk_to_speaker()`, `KEY_R`)**:
   - Walking to Rook (`1–5` key `3`, tapping Rook, or `KEY_R` from anywhere) or tapping the 3D `RookSpeaker` opens `MusicPanel` (mutually exclusive with `MuralPanel`).
   - `KEY_R` when away from Rook starts walking to Rook and defers `check_sound_with_rook()` until arrival (`pending_rook_talk`).
   - `check_sound_with_rook()` marks `rook_soundcheck_done = true`, unlocks the `"brush"` and `"lead"` stems, saves to the isolated Godot save (`user://godot_block_save_v1.json` / `tenderloin-redux.godot.save.v1`), lights the 3D speaker beacon, frames Rook and the speaker in the camera, and displays Rook's dialogue.
3. **Original Procedural 80 BPM Synth Sketch & Progress Cues (`AudioStreamGenerator`)**:
   - Explicit playback (`start_music_playback()`, `stop_music_playback()`, `toggle_music_playback()`, `KEY_K`, `Play Music` / `Pause Music` button). Never autoplays on startup or reload.
   - Both `SketchAudioPlayer` and `LocalAudioPlayer` set `playback_type = AudioServer.PLAYBACK_TYPE_STREAM` so Godot 4.7 Web exports mix dynamic streams without WebAudio sample-mode warnings.
   - `advance_music_clock(delta)` advances an 80 BPM eighth-note step clock (`0.375 s` per step) and synthesizes 4 stems (`"bass"`, `"brush"`, `"chords"`, `"lead"`) unlocked by neighbor visits, Celeste conversation/mural placement, mural completion, and Rook soundcheck.
   - Volume cycling (`cycle_music_volume()`, `KEY_V`, `Vol: 70%` -> `100%` -> `35%` -> `0%`) updates `AudioStreamPlayer.volume_db` and waveform amplitude.
4. **Local Suno MP3/WAV/OGG Audition (`load_local_music_bytes()`, `load_local_music_file()`, `use_synth_sketch()`, Web file picker bridge)**:
   - Creator can audition a local `.mp3`, `.wav`, or `.ogg` file (up to 40 MB) in the current session/tab without bundling any Suno audio in the repository.
   - Validates extension, size, and RIFF/WAVE, ID3/MPEG, or OggS container headers in GDScript before decoding so invalid or corrupt files return `MUSIC_FILE_ERROR` or `MUSIC_DECODE_ERROR` cleanly without engine errors and without clobbering a previously loaded valid track.
   - When in `"local"` mode, procedural stem labels are hidden (`"Local full track (procedural stems hidden)"`), and `use_synth_sketch()` (`KEY_U` or `Use Sketch` button) returns to the 80 BPM procedural sketch.
   - Local audio files are never uploaded and never persisted in save files; reloading always restores `rook_soundcheck_done` and `visited_neighbors` while starting in silent `"sketch"` mode.

## Modified Files
- `godot/main.gd`
- `godot/tests/study_test.gd`
- `tests/godot-browser.mjs`

## Please Review
Inspect `godot/main.gd`, `godot/tests/study_test.gd`, and `tests/godot-browser.mjs` directly against source for:
- Correctness of 3D `RookSpeaker` placement, collision, navigation, and sightline occlusion cutaway.
- Correctness of Rook soundcheck, deferred `KEY_R` arrival behavior, and save/reload validation (`rook_soundcheck_done`, `visited_neighbors`, backward compatibility with Round 3 v1 saves, and corrupt-save recovery).
- Correctness of explicit playback, procedural synth clock/stems, local Suno WAV/MP3/OGG validation/audition, and responsive `MusicPanel` layout at `1100×760`, `390×667`, and `320×667`.
