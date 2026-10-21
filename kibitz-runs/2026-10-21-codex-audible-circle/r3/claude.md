TOOL CHECK: PASS (read godot/rhythm_bar.gd, godot/rhythm_circle.gd, godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs, docs/ASSETS.md)

VERDICT: yes-with-fixes. The gain seams and stop seams in main.gd are wired correctly for the native paths. Three things need fixing first: a bfcache lifecycle hole lets the bar resume after a pagehide, the reader/AT status goes stale after a non-UI stop, and two browser stop assertions plus the PCM-observed flag can pass without proving anything.

MUST-FIX BEFORE BUILD

1. [Lifecycle / pagehide -> "No autoresume"] main.gd:11049-11059 uses one mailbox slot, `__tenderloinWebVoicesLifecyclePending`. The pagehide handler writes 'suspend'. On a bfcache restore, pageshow(persisted) overwrites it with 'resume' before Godot's loop runs again. The loop does not tick while the page is in bfcache, so poll_web_audio (main.gd:11535-11541) only ever sees 'resume'. As a result, `rhythm_circle.stop_audition()` at main.gd:11539 never runs. The AudioStreamPlayer is still `playing` at its frozen position, so the rest of the bar resumes on restore and the sketch stays ducked at -80 dB until the bar's `finished` fires. The browser test (godot-browser.mjs:173) dispatches a synthetic pagehide without hiding the page, so it cannot see this. [ASSUMPTION] The page is bfcache-eligible; verify in Chrome DevTools > Application > Back/forward cache.
   Smallest fix: in the `voices_lc == "resume"` branch at main.gd:11540, also call `if rhythm_circle != null: rhythm_circle.stop_audition()`. An alternative is to make the pageshow handler leave a pending 'suspend' in place.

2. [Honest reader status / AT name after non-UI stop] When a stop comes from outside the circle's own buttons, rhythm_circle.gd:379-384 `stop_audition()` updates only `options[6].text`. These callers are:
   - focus loss (main.gd:10466)
   - pagehide (main.gd:11539)
   - `apply_music_volume_db` calling stop_audition(false) (main.gd:10654)

   `options[6].accessibility_name` is only set in `refresh()` (rhythm_circle.gd:372), so it stays "Stop bar audition". `message` also stays "Playing one drum bar. The sketch is quiet until it ends." (rhythm_circle.gd:400). tick() only calls refresh() when `[music_playing, music_mode, local_music_name]` changes (rhythm_circle.gd:493-496). Focus loss and pagehide change none of those, so the stale name and reader text persist until the next pad or button press. Screen-reader users hear "Stop bar audition" on a button whose visible text is "Play Bar" and which would start playback.
   Fix: replace line 384 with `if visible: message = "Bar stopped. The original sketch continues."; refresh()`. Callers that set their own message (play_bar, toggle_step, listen, complete) overwrite it and refresh again, so their behaviour is unchanged. Add a native require after study_test.gd:4313: `options[6].accessibility_name == "Play one bar of this rhythm"` and `not circle.message.contains("Playing")`.

3. [Tests vacuous: the stop assertions can't fail] At godot-browser.mjs:168 (Space) and godot-browser.mjs:173 (pagehide), the check is `page.waitForFunction(()=>!...audition.playing)` with the default timeout. The bar ends by itself after 3 s, so both pass even if Space and pagehide do nothing.
   Fix: pass `{timeout: 800}` (well under the 3 s bar length), or assert `message` matches /Bar stopped/ right after the event.
   The same function also never fails if no audio was observed. `outputObserved:!!sparse` is pushed at godot-browser.mjs:176 but only logged at godot-browser.mjs:2411 and godot-browser.mjs:2431. When `__rhythmOutputTaps` is empty, capture() returns null (godot-browser.mjs:149) and the whole sparse/dense PCM block at godot-browser.mjs:162-167 is skipped silently. That would hollow out the "real WebAudio destination tap" evidence in the final gate run.
   Fix: after the loop, `assert.ok(rhythmAuditionChecks.length && rhythmAuditionChecks.every(c=>c.outputObserved))`. If some viewports are meant to be exempt, use `.some(...)` instead.

SHOULD-FIX

4. [Unlock gate untested; misleading refusal reason]
   - The native test forces `study.reward_audio_unlocked = true` (study_test.gd:4278) and never checks that playback is refused when it is false.
   - The browser test only reaches Play Bar after many real taps, so the gate is never exercised locked.
   - Fix: add `reward_audio_unlocked=false -> circle.play_bar() -> starts unchanged`.
   - rhythm_circle.gd:391 folds `not reward_audio_unlocked` into the "Music is off or muted" message. Music can be playing without the unlock flag being set: `_input` (main.gd:13817-13820) only counts key, mouse and touch events, so a joypad `ui_accept` press can start music without setting it. [ASSUMPTION] An AccessKit/AT "activate" action may also emit `pressed` with no InputEvent; verify. In those cases the stated reason is false.
   - Fix: give the unlock case its own branch with an accurate message.

5. [Interface mismatch: music RMS ignores the duck]
   - `last_sample_rms = last_pre_gain_rms * music_volume` (main.gd:10662, main.gd:10747, main.gd:10782) does not account for the -80 dB duck, and it is exported as `music_sample_rms` (main.gd:11490). During a bar the snapshot reports the sketch as audible while `sketch_player.volume_db` is -80. Fix: report 0, or apply the duck gain, while `rhythm_circle.audition_active()`.
   - The browser snapshot exposes only the audition's own gain (rhythm_bar.gd:43). It has no `sketch_player.volume_db`, so duck restore is proven only natively (study_test.gd:4292, study_test.gd:4327). Fix: add the sketch gain to the snapshot and assert restore after godot-browser.mjs:159.

6. [Hard-coded values that should come from one source]
   - The step length 0.375 is a literal in rhythm_circle.gd:229, duplicating `STEP` (rhythm_bar.gd:4) and `MUSIC_STEP_SEC` (main.gd:171). Use `audition.STEP`.
   - The snapshot's `"seconds":3.0` (rhythm_bar.gd:43) is a constant and can never fail as evidence. Use `stream.get_length() if stream != null else 0.0`.
   - The test literals 132300, 66150 and 0.375 (study_test.gd:4251-4256) can be left as independent oracles.

7. [Performance: PCM regenerated on every press] `start_bar` (rhythm_bar.gd:37) calls `make_bar`, which runs a 66,150-iteration GDScript loop with sin/exp per sample (rhythm_bar.gd:12-20). This happens on the main thread inside the input frame, every time Play Bar is pressed. The evidence has no web frame-time measurement for the press; verify that.
   Fix: every hit is identical relative to its step start, so precompute one strike once (0.22 s ≈ 4,851 frames, zero-padded) as a static PackedByteArray. Then build the bar from eight strike or zero chunks with `append_array`, keeping the `floor(k*8268.75)` step boundaries so the output is bit-identical. Add a require that the new output equals the old generator's for all 256 masks. docs/ASSETS.md:73 says "no loop/cache"; reword it to "single strike template, no per-pattern cache".

8. [Misleading copy about volume]
   - The announcement at rhythm_circle.gd:278 says "Music controls its volume", and the reader at rhythm_circle.gd:362 says "volume are required".
   - Inside the circle, options[1] only toggles music on/off. `_unhandled_input` (main.gd:13843-13847) swallows all keys while the circle is open, and the volume control is hidden. Volume therefore cannot be changed while a bar plays.
   - So study_test.gd:4288-4290 ("live volume applies to bar") tests a path the user can't reach. That's harmless, but it shouldn't be cited as user-facing behaviour.
   - Fix the copy, e.g. "Music must be on; set volume at Rook's speaker."

OPTIONAL / NICE-TO-HAVE
- Duck/start order (rhythm_circle.gd:398-399): `play()` runs before the sketch is ducked, so for up to one mix period the sketch and bar can overlap at full gain. Negligible; set the sketch to -80 before `start_bar` if anyone hears it.
- Step-cue timing (rhythm_circle.gd:229): it uses `get_playback_position()` with no output-latency correction, so lamps run ahead of the sound on web. Consider subtracting `AudioServer.get_output_latency()`. The docs already say "approximate".
- Tab hide: there is no `visibilitychange` listener (only pagehide/pageshow at main.gd:11049 and main.gd:11056). Tab hide relies on NOTIFICATION_WM_WINDOW_FOCUS_OUT (main.gd:10464). Verify that Godot web emits focus-out when the canvas is not the focused element (e.g. focus is on a DOM a11y node). Impact is limited because the bar is at most 3 s.
- Native focus-loss coverage: it calls `study._notification(...)` directly (study_test.gd:4313), which skips the real OS/DisplayServer path. Acceptable as a unit seam, but don't describe it as real focus-loss evidence.

CUT THESE
1. The `volume` parameter of `start_bar` and its `volume_db = linear_to_db(volume)` line (rhythm_bar.gd:34 and rhythm_bar.gd:38). `apply_music_volume_db()` immediately overwrites the gain (rhythm_circle.gd:399 -> main.gd:10651, main.gd:10656) using a different formula with a <=0.0001 -> -80 dB floor. Two gain formulas for one player invites drift. It is safe to cut because play_bar always calls apply_music_volume_db right after start_bar, and no other code calls start_bar (rhythm_circle.gd is the only caller).
