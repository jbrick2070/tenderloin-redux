TOOL CHECK: PASS (read input.md, godot/main.gd, session_handoff.md, public/hosting.js; Grep/Glob returned real content)

FRAME NOTE: input.md asks for "three alternatives + recommendation"; the driver's wrapper asks for an adversarial review. This file follows the wrapper structure. To avoid repeating the earlier r1 complaint ("returned critique instead of requested ranked menu", session_handoff.md:6), the three alternatives and a recommended slice are included under OPTIONAL as concrete fixes, not as authority.

VERDICT: yes-with-fixes. The brief's direction is sound and it correctly refuses to claim audio coupling, but it misses four source facts that decide the design. (1) The layout choice locks at opening. (2) Open Floor already is a stage. (3) Rook's speaker is about 80 m from the gathering site and plays non-positional audio. (4) Musician motion is driven by player-walk speed, not the music. Any of these, left unstated, gives a "concert" that is not coherent.

MUST-FIX BEFORE BUILD

1. [§"Opening-gathering layout" + §Next r1 option (a)] The brief has no timeline. It never says when the "concert setup" happens.
   - Defect: choose_gathering_layout returns false once block_opened (godot/main.gd:7285). Setup choices only exist before opening. Hosting, the only "performance" phase, only exists after opening (advance_programme_and_hosting_step returns "locked" if not block_opened, main.gd:9595-9601). Option (a) "setup" and any "concert happening" fall on opposite sides of a hard state gate. The brief treats them as one activity.
   - Fix: add one sentence fixing the phase. Recommended: setup stays the existing pre-open layout choice, unchanged. The concert is a post-open consequence shown during or after the hosted "beats" segment.

2. [§"Opening-gathering layout"] The brief describes the layouts as "tables/stools/rug/bunting/lights" and misses that Open Floor is already a performance space.
   - Defect: LayoutOpenFloor already builds a low riser, a mic stand and mic head, an amp/monitor box and a lettering panel (main.gd:7212-7240, "Dez & Celeste's Open Floor: an open painted floor, a low riser and mic"). Dialogue already sells it as "room for Dez's beat" (main.gd:7308-7312, 7337-7339). A proposal that "adds a stage" duplicates this.
   - Second defect: when no layout is chosen, open_block_gathering silently defaults to "table" (main.gd:8956-8959). A floor-only concert would be invisible on the default path.
   - Fix: state that any concert slice extends LayoutOpenFloor. Also specify the Long Table counterpart, e.g. hand percussion and tapping along the table, so both bounded choices get a consequence. This keeps the "both layouts are fine" contract in the comment at main.gd:7282-7283.

3. [§"Rook speaker/soundcheck" + option (b)] The plan assumes sound and stage are co-located. They are not.
   - Defect: ROOK_SPEAKER_POS is Vector3(117.10, 0, -15.95) (main.gd:27). The gathering site is nearest_street_point(Vector2(38, -8)) offset 3.4 m north (main.gd:7149-7157), roughly 80 m west of the speaker.
     - [ASSUMPTION] Distance is from the constants. nearest_street_point was not executed. Verify: the actual gathering_layout_center at runtime.
   - Defect: music plays through a plain AudioStreamPlayer (main.gd:3166), not AudioStreamPlayer3D. "Placement visibly/audibly affects the scene" therefore has no audio path.
   - Fix: the brief must choose one:
     - (i) The concert visual lives at the curb-lane site, and the speaker stays where it is, explained as Rook running sound down the block.
     - (ii) Move or duplicate the speaker. That is a world-fact and constant change, which I would cut.
   - Do not promise spatial or positional audio.

4. [§"verify coupling rather than assuming a drum machine already audibly drives the synth"] The brief checks audio coupling but not visual coupling. Today neither exists.
   - Audio: advance_music_clock uses fixed bass/lead arrays and an 8-step index (main.gd:10718-10742). The brush stem fires on every step when bit 2 is unlocked (main.gd:10735-10737). hosting_draft.pattern is never read there. The brief's warning is correct.
   - Animation: musicians and crowd animate from walk_anim_clock (main.gd:3502-3509). That clock advances at 9.5x when the player moves and 3.2x when idle (main.gd:3486). So the existing "concert" bobs faster when the player walks and ignores whether music is playing, paused or muted.
   - World: the hosted "beats" result has no 3D consumer. update_block_3d reads get_hosted_segment_value("art") only (main.gd:3119). "beats" only recolors a programme bar (main.gd:2810-2811). host_toggle_beat calls save_godot_state and update_block_ui but not update_block_3d (main.gd:9478-9486).
   - Fix: acceptance must say what drives performer motion: sketch_tick or music_playing, never walk_anim_clock. It must also say what a hosted beat pattern visibly changes.

5. [§Hard constraints, line 16, vs "immersive" goal] An unstated motion constraint.
   - Defect: the last checkpoint states "Godot has no reduced-motion setting; this adds no new looping/continuous animation" (session_handoff.md:6). Grep finds no reduced-motion handling in main.gd. A concert with dancing or playing figures is new looping animation by definition. The brief neither permits it nor bounds it.
   - Fix: bound it explicitly. Performer and crowd motion run only while music_playing is true in sketch mode, and freeze on Pause or mute. Otherwise use discrete per-step poses or lights, not continuous bobbing. Or explicitly scope a motion toggle; I would cut that.

6. [§"Rook speaker/soundcheck" -> option (b) "soundcheck rehearsal"] Option (b) contradicts the cast and destabilizes the opening gate.
   - Defect: Rook is written as the off-camera sound person ("I'd rather stay off camera, but I'll always run the sound", main.gd:8747 and 8734). Dez is the "80 BPM Beatmaker" (main.gd:384), and public/hosting.js:61 maps dez to "beats". A Rook-on-stage rehearsal breaks that characterization.
   - Defect: rook_soundcheck_done is a required condition of is_block_ready (main.gd:8912) and is set in a single interaction (main.gd:8889). A multi-step rehearsal there lengthens the mandatory opening path for every player and touches readiness, saves and the existing tests.
   - Fix: performer = Dez, and Rook stays at the board. Do not change soundcheck semantics. If any rehearsal exists, it is optional and post-open.

7. [§line 18 "immersive, believable" vs line 11/16 prohibitions] Goal and method diverge because "believable" is undefined.
   - Defect: the brief asks for realism and immersion. It also forbids new world facts, paid or external media and silent save expansion, and requires original assets. It never says what "believable" means in testable terms. Meanwhile the existing DodgeAlleyConcert already asserts a real-place event: a "Dodge Alley Block Concert · Live Jazz" label at Dodge Place (main.gd:3769, 3838). The brief warns against conflation but leaves that real-place claim untouched.
   - Fix: define "believable" as observable and testable:
     - (a) named fictional residents physically occupy stage and seat positions;
     - (b) the audience faces the performer;
     - (c) step lights or poses follow the sketch clock while playing, and stop when paused;
     - (d) the clear sidewalk route remains.
   - State the persistence rule: every concert visual is derived from existing state (gathering_layout, hosting_results "beats" value, unlocked_stem_mask, music_playing), so there are zero new save keys. That makes the "no silent schema expansion" promise checkable.

SHOULD-FIX

1. [§option (c)] The brief cites public/hosting.js only generically. It already contains the exact prior art needed:
   - "Dez shared an eight-step visual rhythm ... Joining in was optional." / "Nobody had to perform." (public/hosting.js:55)
   - Visitors take a 'dance' pose during beats when the pattern is non-zero (public/hosting.js:84).
   - Fix: name this as the approved prior art, and require "pattern 0 = listening round, nobody performs" parity in Godot.

2. [§acceptance, line 18] "Actual mouse/finger/keyboard" acceptance is demanded without naming the input surface.
   - Existing beat input is host_toggle_beat(step) through the block-panel UI. Shift+Z only toggles step 0 (main.gd:9567-9571).
   - World-tap on riser or instruments would be a new input surface. It would collide with camera ownership and manual drag, which the brief says must remain.
   - Fix: state "panel buttons drive, world shows". No new world-tap targets in this slice.

3. [§"local track" — absent] Concert visuals in local-audio mode are undefined.
   - In local mode, advance_music_clock returns 0 and zeroes RMS (main.gd:10702-10707), and there is no step clock. Anything driven by RMS or sketch_tick goes dead when the player loads their own track.
   - Fix: specify fallback behavior for local mode, e.g. static "playing" pose and lights on, with no step sync. Do not claim step sync with player audio.

4. [§line 3 vs line 11 vs line 14] The process text contradicts itself.
   - Line 3: "This is research preparation, not a pre-coding CLI receipt."
   - Line 11: "Next mandatory source-reading ... r1".
   - Line 14: "explicit source-reading pre-coding r1 ideation ONLY".
   - Fix: one sentence stating whether this run counts as the mandatory pre-coding r1 for the concert feature. session_handoff.md:13 requires that r1 before implementation.

5. [§"Identify any acceptance blocked by physical-phone/human/listening/field evidence"] State up front that "does it feel like a concert" and "is the groove musically pleasant with the pattern applied" are human-listening acceptance. Automated gates cannot prove them. Browser runs can only prove that state, poses and colors change, and that RMS changes when audio coupling is added.

OPTIONAL / NICE-TO-HAVE (alternatives + recommendation, grounded)

- (A) Open Floor setup only (pre-open). Add Dez and an instrument on the existing riser (main.gd:7224-7227) and listeners on the three existing stools (main.gd:7231-7233).
  - Low risk.
  - But it is static, and the default "table" path never sees it (Must-fix 2).
- (B) Rook soundcheck rehearsal. Reject for now (Must-fix 6, 3).
- (C) Hosted Rhythm Workshop staged on the chosen layout (post-open). RECOMMENDED. Bounded medium slice:
  1. When current_hosting_activity() == "beats", or a "beats" value exists in hosting_results, show the Dez performer node on the Open Floor riser, or a hand-percussion pose at the Long Table. Show 8 step markers using the existing tile/lights vocabulary, lit from the hosting_draft/hosted pattern bits. Seated neighbors face the performer. Pattern 0 = "listening round" pose (public/hosting.js:55 parity).
  2. Add an update_block_3d() call to host_toggle_beat (main.gd:9478-9486) so every panel tap visibly changes the world.
  3. Optional small honest audio coupling: in advance_music_clock, gate the brush stem (main.gd:10735) on ((pattern >> step_idx) & 1) only once a "beats" value is hosted. Then a resident-made rhythm audibly drives the sketch.
     - Verify: whether existing tests assert brush RMS. If any do, they need deliberate updates.
  4. Drive performer motion and step highlight from sketch_tick only while music_playing in sketch mode. Freeze when paused or muted. Never use walk_anim_clock.
  - Functions touched: build_gathering_layouts (new child nodes), update_layout_3d / update_block_3d (beats consumer), host_toggle_beat (3D refresh), the per-frame animate block near main.gd:3502 (music-driven performer), and optionally advance_music_clock.
  - Not touched: save schema, keepsake, DodgeAlleyConcert, ROOK_SPEAKER_POS, public/.
  - Acceptance:
    - native: toggling step k flips marker k's material and the hosted value.
    - browser: real mouse and finger taps on the beat-step buttons change the captured world pixels at the marker; Pause freezes the performer pose across two frames; pattern 0 shows the listening pose; saves stay at their current byte count.
    - human-only: whether it reads and sounds like a concert.

CUT THESE

1. Any edit to, or reuse of, DodgeAlleyConcert as "the player's concert" (main.gd:3769-3895). It is a different real-place decor at about x=-414. Linking them invites real-event claims. Safe: no system depends on it except decor animation.
2. Moving Rook's speaker or adding positional audio. It changes a world constant, needs no-new-save-key handling for player position, and gives no testable benefit. Safe: the existing non-positional player already satisfies "simple real-input audio controls".
3. Freeform drag-placement of instruments or people. It is a new input surface plus new persisted coordinates, which contradicts "no silent save expansion". The two existing layouts already are the bounded placement decision.
4. Turning soundcheck into a rehearsal minigame (see Must-fix 6). Safe: rook_soundcheck_done stays a one-tap gate, and tests and readiness stay untouched.
5. "Realism" wording in any player-facing text or receipt. Replace it with the observable criteria in Must-fix 7. Safe: no code depends on it, and it removes an unprovable claim.
