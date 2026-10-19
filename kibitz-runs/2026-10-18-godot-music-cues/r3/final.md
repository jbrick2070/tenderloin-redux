# Final Merged Review — Godot Round 4 (`2026-10-18-godot-music-cues`, r3)

- **Driver**: `AGY 4 / Gemini 4 Argon` (High reasoning)
- **Independent CLI Reviewer**: `Claude Opus 5.5` (`claude-opus-5-5`, effort `high`, via Kibitz `--driver agy --only claude`, `rc=0`, `TOOL CHECK: PASS`, `VERDICT: yes-with-fixes`)

## Verified & Fixed Must-Fix Findings

1. **`visited_neighbors` persistence on non-Celeste / non-Rook arrivals (`godot/main.gd`, `godot/tests/study_test.gd`, `tests/godot-browser.mjs`)**:
   - **Finding**: `finish_neighbor_arrival()` marked `visited_neighbors[n_id] = true` and unlocked the `"brush"` stem in memory, but only saved when arriving at Celeste (`celeste_talk_count == 0`) or running Rook's soundcheck. Visiting Bea, Dez, or Thanh alone was not persisted across reload.
   - **Verification & Fix**: Confirmed at `godot/main.gd:1221-1263`. Updated `finish_neighbor_arrival()` to call `save_godot_state()` whenever a neighbor ID is newly added to `visited_neighbors`. Updated `tests/godot-browser.mjs:56` to wait for `parsed.celeste_talk_count >= 1` before clicking `MuralPanel` buttons so Bea's arrival save from `"Walk to neighbor"` does not resolve the wait early, and asserted `parsedSave.visited_neighbors.includes('bea')`. Added a dedicated Bea-only reload test in `godot/tests/study_test.gd` proving `visited_neighbors.has("bea")` and `unlocked_stems() == ["bass", "brush"]` after reload.

2. **`"Soundcheck: Rook"` UI button arrival/deferral contract (`godot/main.gd`, `godot/tests/study_test.gd`)**:
   - **Finding**: `music_rook_btn` (`"Soundcheck: Rook"`) called `check_sound_with_rook()` directly even when `MusicPanel` was opened away from Rook via `KEY_K`/`KEY_V`/`KEY_U`, bypassing the walk-and-arrive deferral enforced by `KEY_R`.
   - **Verification & Fix**: Confirmed at `godot/main.gd:2726`. Extracted `request_rook_soundcheck()` and wired both `KEY_R` and `music_rook_btn` to it. Added an assertion in `godot/tests/study_test.gd` proving that pressing `music_rook_btn` from `PLAYER_START` starts walking to Rook with `pending_rook_talk == true` and `rook_soundcheck_done == false` until arrival.

3. **`AudioStreamGenerator` buffer headroom, phase continuity, and single sample-counter clock (`godot/main.gd`, `godot/tests/study_test.gd`)**:
   - **Finding**: `advance_music_clock()` clamped frame generation to `delta * 22050` (`<= 2048` frames) instead of filling `sketch_playback.get_frames_available()`, advanced phase even on unpushed frames, and used split clocks (`sketch_beat_accum` with synthetic `+0.40`/`+0.08` advances vs sample-time `t` for the brush envelope).
   - **Verification & Fix**: Confirmed at `godot/main.gd:1520-1562`. When `sketch_playback != null`, `advance_music_clock()` now generates `sketch_playback.get_frames_available()` frames (filling the full `0.25 s` / `5512`-frame buffer on `start_music_playback()`), advances `sketch_frames_pushed` and `sketch_phase` strictly by the generated frames, and computes `step_total`, `step_idx`, and within-step brush time `step_t` per sample from a single sample counter (`sketch_frames_pushed + i`). Removed synthetic `advance_music_clock(0.08)` injections on cue/volume changes.

4. **Web local audio picker `ArrayBuffer` / `Uint8Array` -> `PackedByteArray` transfer (`godot/main.gd`, `tests/godot-browser.mjs`)**:
   - **Finding**: `setup_web_audio_bridge()` used `FileReader.readAsDataURL`, `JSON.stringify`, `JSON.parse_string`, and `Marshalls.base64_to_raw` on the single main/audio thread.
   - **Verification & Fix**: Confirmed in `godot/main.gd` and verified in `artifacts/godot-web/index.js` (`_godot_js_eval` natively transfers `Uint8Array` / `ArrayBuffer` into `Variant::PACKED_BYTE_ARRAY` via `HEAPU8.set`). Updated `setup_web_audio_bridge()` and `poll_web_audio()` to read files via `FileReader.readAsArrayBuffer(f)` into a `Uint8Array` (`window.__tenderloinQueueLocalAudioBytes`) and transfer bytes directly to `PackedByteArray` without JSON or base64 copies, while keeping `window.__tenderloinQueueLocalAudioBase64` as a thin JS adapter.

## Verified & Fixed Should-Fix / Cut Findings

- **SHOULD-FIX 1 (`KEY_3` for Rook)**: Updated documentation (`KEY_3` walks to neighbor index `2`, Rook; `KEY_2` walks to Celeste).
- **SHOULD-FIX 2 (Consistent Rook arrival behavior)**: Unified `finish_speaker_arrival()` and `finish_neighbor_arrival()` so passive arrival at either Rook or `RookSpeaker` opens `MusicPanel` and waits for explicit soundcheck unless `pending_rook_talk` (`trigger_rook`) is active.
- **SHOULD-FIX 3 (`walk_to_speaker()` stale `pending_rook_talk`)**: Cleared `pending_rook_talk = false` in `walk_to_speaker()` and added test coverage in `study_test.gd`.
- **SHOULD-FIX 4 (Deep MP3/OGG header pre-validation & corrupt header fixtures)**: Added `is_plausible_mp3()` (validating ID3v2 synchsafe size + MPEG frame sync/version/layer/bitrate/samplerate bits) and `is_plausible_ogg_vorbis()` (validating `"OggS"` page 0 + `"\x01vorbis"` identification packet + second `"OggS"` page), and added `"ID3" + 13 junk bytes` and `"OggS" + 32 junk bytes` test fixtures to both `study_test.gd` and `tests/godot-browser.mjs`.
- **SHOULD-FIX 5 (WebAudio sample-mode warning check)**: Added `console` `warning` inspection in `tests/godot-browser.mjs` asserting zero `/sample|playback.?type|AudioStreamGenerator/i` warnings.
- **SHOULD-FIX 6 (Single-unit volume scaling)**: Stopped multiplying pushed `AudioStreamGenerator` samples by `music_volume` (leaving `AudioStreamPlayer.volume_db` as the single gain stage on both players) and computed `last_sample_rms = last_pre_gain_rms * music_volume`.
- **SHOULD-FIX 7 (Cached street tangents/normals on `is_walkable_point` hot path)**: Cached `cached_mural_tangent`, `cached_mural_normal`, `cached_speaker_tangent`, and `cached_speaker_normal` in `godot/main.gd`.
- **SHOULD-FIX 8 (`load_godot_state` recency ordering)**: Sorted save candidates by descending `save_seq` (`extract_candidate_save_seq()`) before applying.
- **SHOULD-FIX 9 (`SPEAKER_HALF_EXTENTS` constant)**: Unified speaker cabinet dimensions and footprint checks under `SPEAKER_HALF_EXTENTS = Vector2(0.34, 0.28)` and `MURAL_HALF_EXTENTS = Vector2(1.78, 0.18)`.
- **CUT 1–4**: Moved `make_synthetic_wav_bytes()` out of `godot/main.gd` into `godot/tests/study_test.gd`, removed unused `load_local_music_file()`, set `last_sample_rms = 0.0` in local mode instead of a synthetic placeholder, removed unused `"playing"`/`"mode"` keys from `cue_history`, and capped `cue_history` at 32 entries.
