TOOL CHECK: PASS (I read input.md, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, godot/project.godot and godot/export_presets.cfg directly.)

VERDICT: yes-with-fixes. The 3D placement, the footprint, and the save-validation wiring trace correctly. Four real defects remain. (1) A promised piece of save state is not persisted on one of the paths that sets it. (2) A UI button skips the Rook-proximity rule that KEY_R enforces. (3) The synth generator is fed with no back-pressure headroom and runs on two clocks that drift apart. (4) The Web byte bridge copies the file several times, on the same single thread as the audio.

MUST-FIX BEFORE BUILD

1. [Scope §4 / §1 "brush" unlock] visited_neighbors is only saved incidentally.
   - Where: main.gd:1221-1225. finish_neighbor_arrival() sets visited_neighbors[n_id] = true and calls recompute_music_stems(), but it never calls save_godot_state(). The only saves on this path are the first Celeste talk (1240-1243) and the Rook soundcheck (1393). Visiting Bea, Dez or Thanh therefore stays in memory only.
   - Effect: reload drops those visits, and with them the "brush" stem. The gate is recompute_music_stems() at main.gd:1402 (visited_neighbors.size() >= 1). This breaks the §4 promise that reload "restores visited_neighbors".
   - Why tests miss it: study_test.gd:244 calls finish_neighbor_arrival(0), but checks reload only after check_sound_with_rook() has saved (study_test.gd:273, 305). The reload assertion at study_test.gd:320 passes through mural_completed and rook_soundcheck_done, which hides the gap.
   - Fix: in finish_neighbor_arrival, call save_godot_state() when n_id was not already a key.
   - Sequencing hazard that comes with this fix: tests/godot-browser.mjs:56 waits only for "any Godot save exists" before clicking the mural buttons. Once the Bea arrival from the "Walk to neighbor" click (godot-browser.mjs:50) saves, that wait resolves before Celeste's MuralPanel is open, so the clicks at :60-66 miss. In the same change, make :56 wait for celeste_talk_count >= 1.
   - Add a study_test case: Bea-only visit, reload, expect ["bass","brush"].

2. [Scope §2] The "Soundcheck: Rook" button skips the arrival/deferral contract.
   - Where: main.gd:2726 wires the button straight to check_sound_with_rook().
   - How it is reached from anywhere: KEY_K, KEY_V and KEY_U (main.gd:2435-2443) open MusicPanel at any position.
   - What one click away from Rook does: sets rook_soundcheck_done, unlocks "lead" (1406), saves (1393), and focus_speaker_camera() jumps the camera to Rook (1358-1371) without any walk.
   - Contrast: KEY_R (2424-2434) correctly walks first and sets pending_rook_talk.
   - Fix: move the KEY_R branch into one function, e.g. request_rook_soundcheck(), and point both KEY_R and the button at it.

3. [Scope §3 advance_music_clock / AudioStreamGenerator] The generator gets no headroom and has a split clock. Three parts:

   a) Under-fed buffer.
      - Each frame pushes only min(clampi(round(delta*22050), 64, 2048), get_frames_available()) (main.gd:1526-1531). That is a real-time trickle, not a buffer fill.
      - The prefill is advance_music_clock(0.40) at main.gd:1473, but the 2048 clamp cuts it to about 93 ms. The buffer could hold 0.25 s (5512 frames, main.gd:518).
      - export_presets.cfg:12 has thread_support=false, so mixing shares the main thread with find_path BFS (main.gd:874-945) and the base64 decode in poll_web_audio (MUST-FIX 4). Any stall over about 93 ms underruns. [ASSUMPTION: this is audible on mid-range phones; not measured.]

   b) Dropped frames still advance phase.
      - Frames beyond push_limit are synthesised and thrown away (1557).
      - sketch_phase still advances by the full frames_to_gen (1559), so the next push starts at a discontinuity (a click).

   c) Two clock domains.
      - The step index (bass/lead/chord notes) comes from sketch_tick, driven by wall-clock delta (1520-1523).
      - That delta also gets synthetic injections: +0.40 s on start (1473), +0.08 s on every progress cue (1444) and every volume cycle (1507).
      - The brush envelope instead uses fmod(sample-time t, MUSIC_STEP_SEC) (1546).
      - step_idx is also frozen for each whole chunk (1532), which adds up to 2048 frames (about 93 ms) of jitter.
      - Result: the brush hits and the note changes drift apart after the first cue.

   - Fix (smallest form):
     - When sketch_playback != null, set frames_to_gen = get_frames_available().
     - Advance sketch_phase and sketch_frames_pushed only by the frames actually pushed.
     - Compute the step per sample from one counter: step = floor(sample_index / (MUSIC_STEP_SEC * MUSIC_MIX_RATE)).
     - Remove the synthetic advance_music_clock(0.08/0.40) calls. Keep the delta-based path only for the Dummy driver (sketch_playback == null).
   - Test impact: study_test.gd:276, 280 and 283 currently depend on those synthetic advances (rms/tick changing right after start, cycle_music_volume, etc.). Change them to call advance_music_clock explicitly.

4. [Scope §4 Web file picker bridge] The 40 MB path copies the file about five times on the only thread.
   - JS: readAsDataURL builds a ~53 MB base64 string (main.gd:1754), stored in a JS object (1726). The pending check is cheap (1775), but the second eval then JSON.stringify's the payload (1778) and returns it as a Godot String.
   - GDScript: JSON.parse_string (1781), then Marshalls.base64_to_raw (1792), then the decode.
   - All of this runs synchronously in _process (2298), on the same thread as audio mixing (thread_support=false). It is the main trigger for MUST-FIX 3a.
   - Fix:
     - Use readAsArrayBuffer and keep a Uint8Array plus the name.
     - Fetch the name with one eval and the bytes with a second eval that returns the typed array. verify: in the target Godot version, JavaScriptBridge.eval returns a PackedByteArray for an ArrayBuffer/TypedArray result. I believe it does in 4.x.
     - Remove the JSON hop entirely.
   - Keep window.__tenderloinQueueLocalAudioBase64 as a thin adapter (decode base64 into a Uint8Array in JS) so godot-browser.mjs:111 and :117 keep working.

SHOULD-FIX

1. [Scope §2 "1–5 key 2"] The documented key is wrong.
   - In main.gd:2392-2396, KEY_2 goes to neighbor index 1 (Celeste, main.gd:64) and KEY_3 goes to index 2 (Rook, main.gd:65).
   - The packet's "key 2" for Rook is off by one. That is a 0-based index written as a key.
   - Fix: change the doc to KEY_3.

2. [Scope §2] Two ways of reaching Rook have different side effects.
   - finish_speaker_arrival() runs check_sound_with_rook() whenever the soundcheck is not done (main.gd:1317).
   - finish_neighbor_arrival() for Rook, reached via KEY_3, a tap on Rook, or "Walk to neighbor", only opens MusicPanel and prompts "Tap Soundcheck below" (1254-1257).
   - The same NPC gives different state changes depending on where the player stands, and Rook is only 2.66 m from the speaker (main.gd:22 vs 65).
   - Fix: pick one rule (I recommend explicit only) and apply it in both arrival functions.

3. [Scope §2 pending_rook_talk] walk_to_speaker() leaves a stale flag.
   - It does not clear pending_rook_talk (main.gd:1136-1143). walk_to_neighbor (1068), walk_to_mural (1107) and walk_to_point (1181) all clear it.
   - A stale KEY_R flag then re-fires check_sound_with_rook() on speaker arrival even when the soundcheck is already done: another save, another cue, and the camera re-frames.
   - Fix: add pending_rook_talk = false at 1143. The KEY_R branch (2427-2428) sets it again after that, so ordering is preserved.

4. [Scope §4 "without engine errors"] The decode error path is never tested.
   - study_test.gd:293 uses an 8-byte junk fixture. It fails the length/header guards (mp3 >= 16 bytes at main.gd:1663, ogg >= 36 bytes and "OggS" at 1673) before any decoder runs.
   - So AudioStreamMP3.data= (1668) and AudioStreamOggVorbis.load_from_buffer (1674) are never given a valid header with a corrupt body.
   - verify: whether those calls push_error in Godot 4.7. I believe they do. godot-browser.mjs:32 and :165 fail on any console error.
   - Fix:
     - Add fixtures "ID3" + 13 junk bytes and "OggS" + 32 junk bytes in both study_test and the browser test.
     - If engine errors appear, add deeper pre-validation before decoding: skip the ID3 size and check for a 0xFFE sync; check for an Ogg identification packet "\x01vorbis" at byte 28.

5. [Scope §3 "without WebAudio sample-mode warnings"] Nothing tests this claim.
   - godot-browser.mjs:32 only captures console type 'error'. Godot's Web playback-type warnings go through console.warn.
   - Fix: also collect m.type() === 'warning' and assert that none match /sample|playback.?type|AudioStreamGenerator/i.

6. [Scope §3 volume cycling] Volume is applied twice, in two units.
   - apply_music_volume_db() sets volume_db = linear_to_db(v) on both players (main.gd:1447-1452).
   - advance_music_clock also multiplies every sample by music_volume (1555).
   - Sketch gain is therefore v² and local gain is v. The "35%" step is -18.2 dB for the sketch but -9.1 dB for the local track.
   - Fix: stop scaling samples (or set the sketch player's volume_db to 0). Report last_sample_rms as pre-gain RMS × music_volume so study_test.gd:283 still holds.

7. [Scope §1 is_walkable_point] Round 4 adds street scans to the hot path.
   - is_point_in_speaker_footprint (677-681) calls speaker_tangent() plus speaker_normal(), and speaker_normal calls speaker_tangent again. Each of those runs nearest_street_tangent(), a full scan of all street segments (808-824).
   - The mural footprint already does the same (647-651, 626-632). So every is_walkable_point now costs 4 extra full scans.
   - is_walkable_point runs per BFS cell, every 0.2 m in segment_walkable, on every walk_step substep, and on every advance_walk step. advance_walk also recomputes speaker_stand_xz() each frame (2127).
   - Fix: compute tangent and normal once in build_rook_speaker() / build_mural_board() and cache them. Ordering is safe: both run after data is parsed (main.gd:156) and before any walk or test call (241-242).

8. [Scope §4 save/reload] The load source is chosen by order, not by recency.
   - load_godot_state() (2093-2106) always tries localStorage first and the IndexedDB file second, without comparing save_seq.
   - save_godot_state() treats a write as successful if either store succeeds (1964). If localStorage.setItem fails (quota or private mode) while user:// succeeds, a stale localStorage envelope wins on reload.
   - Fix: parse both and apply the valid one with the higher save_seq.

9. [Scope §1 sizing] The speaker's dimensions are hand-copied in four places that must agree.
   - BoxShape3D 0.68×1.38×0.56 (458), BoxMesh 0.68×1.18×0.56 (475), corner offsets ±0.34/±0.28 (672-673), footprint half-extents 0.34/0.28 (681).
   - Fix: one const SPEAKER_HALF_EXTENTS := Vector2(0.34, 0.28), used everywhere.

OPTIONAL / NICE-TO-HAVE

- cue_history (main.gd:1426) grows without bound: it gets an entry on every arrival, motif move and palette change. Cap it, e.g. at 32 entries.
- The pending-file slot (main.gd:1726) holds one file. A second pick before the next poll replaces the first without any message. That is acceptable, but document it.
- Save schema: rook_soundcheck_done and visited_neighbors were added while GODOT_SAVE_VERSION stays 1 (main.gd:26). Loading a Round 3 save into Round 4 works, because both keys are optional (2016, 2023). verify: whether Round 3's validator accepts unknown keys, i.e. whether rolling back to Round 3 would accept a Round 4 save.
- verify: AudioServer.get_driver_name() returns exactly "Dummy" under --headless in 4.7 (main.gd:1457, 1514). Otherwise the headless test would take the real-device path.
- verify: input.click() via JavaScriptBridge.eval (main.gd:1768) still has transient user activation on Safari. Godot processes DOM input on the next frame, not inside the gesture.
- The speaker's StaticBody3D (main.gd:454-462) is not used for movement. The player is positioned directly (1007, 2158), with no move_and_slide anywhere. That is fine, but the packet should not imply the physics body does the blocking; the footprint check at main.gd:835 does.

CUT THESE

1. make_synthetic_wav_bytes() (main.gd:1564-1591). It is only used by study_test.gd:285. Move it into the test, so a fixture generator does not ship in the runtime script. Safe because nothing in main.gd calls it.
2. load_local_music_file(path) (main.gd:1692-1703). Nothing calls it: not the UI, not the Web path, not the tests. On desktop, prompt_local_music_file() only prints text (1770). Cut it, or wire it to a FileDialog. Safe because nothing references it.
3. The local-mode "RMS" value (last_sample_rms = 0.18 * music_volume at main.gd:1464 and 1518) is made up, not measured. Drop it, or rename it to make clear it is a placeholder, so tests do not read it as a real meter. Safe because no assertion depends on its value in local mode.
4. The "playing" and "mode" fields in each cue_history entry (main.gd:1430-1431). Nothing reads them. Safe to cut.
