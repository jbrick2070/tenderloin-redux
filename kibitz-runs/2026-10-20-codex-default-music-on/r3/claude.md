TOOL CHECK: PASS (Read/Grep/Glob work; read godot/main.gd, godot/tests/study_test.gd, tests/godot-browser.mjs. Bash is disabled in this session, so I reviewed the working tree source directly and could not run `git diff`, the export, or the fingerprint hash.)

VERDICT: yes-with-fixes. The core wiring is correct: continue_story() only calls start_music_playback() when the card is visible and startup_story_pending is set, and the K toggle count in the browser test still comes out right. But the startup path overwrites the orientation announcement, phone players have no touch control to pause the default-on music, and the browser "audible" assertion does not prove what the input says it proves.

MUST-FIX BEFORE BUILD:

1. [input "Start Exploring ... starts the original procedural sketch" / continue_story ordering] The Start orientation announcement gets overwritten in the same frame.
   godot/main.gd:6741-6744 calls frame_player_for_walking() first, which announces "You're here. ... Follow the gold marker or tap What's Next?" (main.gd:6766). It then calls start_music_playback(), which announces "Music playing: 80 BPM Sketch (...)." (main.gd:10210). announce_a11y_status only sets a11y_sync_pending (main.gd:10898-10901), and flush_web_a11y_status publishes one snapshot per frame (main.gd:10904-10913). So the web live region only ever gets the music line, and the orientation and objective guidance after Start is lost for screen-reader users. No test checks the post-Start announcement: grep for "You're here" in tests/*.mjs and godot/tests/*.gd returns nothing.
   Fix (smallest): in continue_story, call start_music_playback() before frame_player_for_walking(). That is safe because frame_player_for_walking only hides the music panel (show_music_panel(false) at main.gd:6755) and does not touch playback. Better still, add "Music on, K or Rook's panel to pause" to the orientation line. Add one assert in godot-browser.mjs after line 75: oriented.announcement starts with "You're here".

2. [input "discoverability/phone usability" + "Existing Rook music Play/Pause/Volume and K/V shortcuts remain"] Phone players have no touch path to pause music that now defaults on.
   The only ways to open the music panel are walking to or talking with Rook (show_music_panel(true) at main.gd:8203, 8285, 8449), the K/V/U keys (main.gd:13079-13087), and prompt_local_music_file (main.gd:10916). frame_player_for_walking hides the panel right at Start (main.gd:6755). The header "Sounds" button toggles reward sounds only (main.gd:3189-3191, which even announces "Music has its own controls"). So at 390x667 and 320x667 a touch-only player hears music for at least 3s with no on-screen way to stop it short of walking to Rook. That is a WCAG 1.4.2 Audio Control gap. It also confuses people: setting "Sounds: Off" leaves the groove playing.
   Fix (smallest, choose one): (a) make the existing music toggle reachable from the header or walk-control grid; or (b) keep music_panel visible after a startup-triggered start (skip show_music_panel(false) for that path) so "Pause Groove" is on screen. Then assert a ≥44px pause target exists in the 390/320 runs. [ASSUMPTION] No other touch-reachable music control exists; I grepped every show_music_panel(true) and toggle_music_playback call site in main.gd.

3. [input "Actual Web player/buffer/RMS fields support browser assertions" + "Do not assume player.playing proves audible speakers"] The browser assertion cannot detect a suspended AudioContext.
   tests/godot-browser.mjs:79-82 waits for music_audio_playing && music_buffer_ready && music_sample_rms > 0. Those fields come from Godot-side state: sketch_player.playing, sketch_playback != null, and last_sample_rms (main.gd:10882-10884). last_sample_rms is computed from the samples the generator writes (main.gd:10298-10299). When frames_available is 0 it keeps the last value instead of dropping to 0 (main.gd:10263-10264). So a suspended AudioContext would pass all three fields if the first write happens. The input claims the fields "support browser assertions" of real playback, which overstates what they show.
   Fix: add context.addInitScript that wraps window.AudioContext to record instances. After the Start click, waitForFunction checks that some recorded ctx.state === 'running'. Otherwise downgrade the claim to "logical playback plus generator feed". verify: whether Godot's web audio library creates the AudioContext through window.AudioContext (needed for the hook to see it).

SHOULD-FIX:

1. [input "existing keyboard acceptance"] Escape is treated as an activation for music but not for reward audio.
   _unhandled_input routes KEY_ESCAPE to continue_story() (main.gd:12994-12995), so Escape on the startup card starts music. _input deliberately leaves KEY_ESCAPE out of key_activation for reward_audio_unlocked (main.gd:12983). Under the HTML user-activation rules, an Escape keydown is not activation-triggering. If Escape is the player's first interaction, the browser will probably keep the AudioContext suspended. music_playing would be true, the UI would show "Pause Groove", and nothing would be audible. Escape also means "dismiss" to most players, not "turn on audio".
   Fix: in continue_story, only start music when the triggering input was not Escape. For example, pass a flag from the Escape branch, or make the Escape branch call hide_story_card() plus frame_player_for_walking() without music. verify: how Godot's web audio driver resumes the AudioContext (which DOM events it listens on).

2. [input "Only startup acceptance starts it"] The most common phone gesture silently skips default music.
   handle_scene_tap() calls hide_story_card() (main.gd:12871), which clears startup_story_pending (main.gd:6732). Any non-accept key does the same (main.gd:13000), as do overview()/wide_overview() (main.gd:13278, 13335) reached from header buttons. Tapping the street instead of "Start Exploring" therefore drops the creator's "default with music on" for the whole session. This may be the intended behaviour, but it is not stated and not tested.
   Fix: decide which behaviour you want and record it in the scope. If scene taps should count as acceptance, call continue_story() instead of hide_story_card() when startup_story_pending is set. Add a native assert either way.

3. [study_test startup block] The test does not cover the real-input path for the startup button or WASD.
   godot/tests/study_test.gd:59-62 calls study._unhandled_input(SPACE) directly, which skips _input and GUI focus routing. In a real Space/Enter press, the focused story_continue_btn takes ui_accept and fires `pressed` (main.gd:6703). The WASD acceptance in _input (main.gd:12987-12988) is not tested for music at all. The browser test covers only the mouse click (godot-browser.mjs:73).
   Fix: add one native assert that sends an InputEventKey KEY_W through study._input() during startup and checks music_playing. Optionally, the browser test could use keyboard Enter for one of the three viewport sizes.

4. [study_test.gd:2437-2462 loop] There is a hidden ordering dependency across the three sizes.
   At 2446, the first iteration's story_continue_btn press starts music. Later iterations skip start_music_playback (`if not music_playing`, main.gd:6743), and music stays on for the rest of the suite. Nothing after line 2462 asserts music state today. But any later test that assumes the reset-time "music starts paused" state (study_test.gd:485, 718) would fail depending on where it sits in the file.
   Fix: call study.stop_music_playback() at the end of the loop body, or assert music_playing inside the loop so the side effect is explicit.

5. [godot-browser.mjs:246-247, 300] The toggle sequence is now fragile and its comments are wrong.
   Line 247's comment says "start explicit procedural sketch playback". That is only true because line 88 paused the music, so the count is: auto-on, then K off (88), K on (247), local-audition start (main.gd:10432), K off (300). Line 507 depends on that count. If one press is added or removed upstream, line 507 fails far from the cause.
   Fix: after line 247 add waitForFunction(music_playing === true), and after line 300 add waitForFunction(music_playing === false). Update the comment.

6. [input "Final export/check ... still pending"] Build order: godot-browser.mjs:19-22 fails fast if index.pck is older than godot/ sources. The browser 1100/390/320 run is only valid after `npm run godot:export` runs on the final main.gd. Any edit made for fixes 1-5 needs a re-export before the browser rerun. verify: the receipts show the export timestamp is later than the last main.gd edit.

OPTIONAL / NICE-TO-HAVE:
- Expose the AudioContext state in get_a11y_status_snapshot via JavaScriptBridge, if Godot exposes it, so the browser check doesn't depend on wrapping the constructor.
- verify: the Playwright Chromium default launch args (godot-browser.mjs:28 passes none) do not include --autoplay-policy=no-user-gesture-required. If they do, the browser run cannot catch any gesture-gating regression.
- verify (could not run, Bash disabled): public/ fingerprint 2a9641a8...; git status at session start showed only godot/main.gd, godot/tests/study_test.gd and tests/godot-browser.mjs modified, so public/ looks untouched.

CUT THESE (over-engineering):
1. None in the code. In the document, drop the claim that Web player/buffer/RMS fields support browser assertions of real playback (MUST-FIX 3), unless you add the ctx.state probe. Cutting the claim is safe because the fields stay valid as logical-playback evidence.
