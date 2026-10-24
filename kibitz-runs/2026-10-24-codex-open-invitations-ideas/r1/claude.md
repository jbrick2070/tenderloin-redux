TOOL CHECK: PASS (read godot/story_picker.gd, godot/main.gd, the four episode modules, godot/tests/study_test.gd, docs/QUEST_FREEDOM_IMPLEMENTATION_BRIEF.md, docs/ROADMAP.md)

VERDICT: no. Option A rests on a false premise: the civic->film "earned surprise invitation" already happens, loudly and with the title spoiled, so it isn't new. A's four-module suspension also contradicts P5's "preserve all existing tests" and overloads `active` across ~116 call sites. A reframed, smaller slice (below) is buildable.

MUST-FIX BEFORE BUILD

1. [P3 "genuine newly available invitation" / P5 "reveal only newly available film invitation", "no-future-title spoilers"] False premise. The film is neither hidden nor surprising.
   - The title is spoiled before civic: chapter list main.gd:74 ("The Open Seat"), Celeste's pre-opening line main.gd:9052, Rook main.gd:9082, Dez main.gd:8796 ("Tap ... 'Shoot Short Film'"). The hosting_complete burst at main.gd:10970 already says "Tenant circle (Q) and neighborhood short film (.) unlocked". The hub always shows "Shoot Short Film" (main.gd:15424), dimmed with the tooltip "Unlocks later" (main.gd:7252-7261).
   - At civic_complete, the game already does ALL of the following on this one beat:
     - reward burst "'The Open Seat' film short (.) unlocked" (main.gd:10972-10976)
     - Bea recognition line (main.gd:10123)
     - a11y summary (main.gd:10128-10130)
     - beacon recolor (main.gd:3199)
     - objective switches to film (main.gd:6139-6140)
     - gold "Suggested next step" hub highlight (main.gd:7243-7261)
     - phone contextual primary becomes the film button (main.gd:6530-6531)
     - an automatic chapter-5 story card titled "The Open Seat" (current_chapter main.gd:7280-7281, delivered by main.gd:7681-7683)
   - A new invitation offer would be the ninth signal on the same beat, and a second modal competing with the chapter card.
   - FIX: build no new invitation surface. Make the live (non-startup) chapter-transition story card the invitation: add Follow this invitation / Keep exploring to it only on a live transition. The startup card (main.gd:2061-2063, startup=true) stays as-is, so reload never replays the offer.
   - Rewrite P5 to say plainly that the film title is pre-announced in existing content. The spoiler check should cover only NEW copy.

2. [P2 "Keep exploring" vs the linear objective] "Keep exploring" has no effect under current code. After civic, everything still points at film: current_objective (main.gd:6139), the HUD "Next:" line (main.gd:6187-6191), the gold highlight (main.gd:7243), the contextual primary (main.gd:6531) and the gold marker.
   - FIX: define one session-only `deferred_invitation` field (not saved, same pattern as landmark-tour state at main.gd:762).
   - While deferred, current_objective skips the film branch and falls through to comptons/blackhawk/explore (main.gd:6141+). The film button loses its gold highlight but stays enabled and labelled.
   - Follow, or a later choice from the hub/index, clears the deferral.
   - Without this, "Keep exploring" is just "dismiss", and P2's "retain the invitation" is meaningless.

3. [ROADMAP.md:125 vs P2] Goal and method diverge. The creator rule says "Avoid forced linear chapter order". P2 omits this, and none of A/B/C address it.
   - The core chain is hard-linear: current_objective main.gd:6100-6140, current_chapter main.gd:7272-7284, is_civic_available = hosting done (main.gd:10031-10032), is_film_available = civic done (main.gd:10188-10189).
   - FIX: state explicitly that core-chain order is out of scope for this slice, and that the slice offers choice of timing, not choice of order. Otherwise r3 will judge it against the roadmap rule and fail it.

4. [P2/P4 "Follow this invitation" is undefined] The brief never says what Follow does. There are three options:
   - Walk to Dez (objective target at main.gd:6140). This is a route/camera takeover. Only voting_story.gd:231-235 and lantern_procession.gd:288-296 preserve manual camera on travel; dog_story.gd:269-278 does not.
   - Open the film activity in place.
   - Only set the objective.
   - FIX: Follow = close the card and open the existing film activity panel in place, with no walk and no camera change (the same path as pressing block_film_btn, main.gd:15722). Write this into the spec.

5. [P4-A suspend/resume adapters] Suspension collides with how `active` is used.
   - `active` drives 15 sites in main.gd: active_story_episode main.gd:11990-11993, current_objective main.gd:6092-6095, walk-control label and dispatch main.gd:13842-13868, toggle_evening_lights refusal main.gd:4937, plus Power lighting via apply_time_of_day -> power_story.apply_lighting (main.gd:4934).
   - The four modules have ~101 more internal references.
   - "Suspended but active" leaves the objective, the walk-control label ("Power Story"/"Dog search"), the evening refusal and Power lighting engaged. "Suspended = active false" erases world state: update_world hides everything keyed on `active` (power_story.gd:447-452, dog_story.gd:311-313, lantern_procession.gd:329-331). It also breaks power_story._process (power_story.gd:610) and its arrival callback, which calls open_story() (power_story.gd:625).
   - Power is also the Story hub itself. The entry is at power_story.gd:139, and dogs_entry/more_entry at power_story.gd:129-138 are disabled while Power is active (power_story.gd:486-488). open_story redirects to whichever episode is active (power_story.gd:245-246). An adapter that suspends Power also suspends the navigation everyone else uses.
   - The current tests assert exclusivity:
     - study_test.gd:6084 "F8 resumes active parade"
     - study_test.gd:6085 "parade excludes dog overlap"
     - study_test.gd:6138 `story_picker.entries.size()==2`
     - study_test.gd:6039 13 Power buttons
   - P5's "Preserve all existing quickpaths/current tests" is therefore self-contradictory for A.
   - FIX: cut suspension (see CUT 1). If switching is kept, implement it as an explicit, confirmed "End <current> and open <other>" using the existing end_session/reset_session paths (voting_story.gd:216-220, lantern_procession.gd:271-279, dog_story.gd:251-267, power_story.gd:313-330). Use honest copy: visit progress for the ended story is cleared.
   - Name the tests at study_test.gd:6084-6085 that will be deliberately rewritten.

6. [P2 "Show accomplishments"] The visit episodes have no persistent accomplishments. `won` is cleared by reset_session in all four modules, and main.gd calls it in three places (main.gd:12428-12437, 12924-12933, 13495-13504).
   - An index that mixes saved core completions (e.g. `"civic_done"` at main.gd:11867) with "Reunited!" episode states would silently lose half its rows on reload.
   - FIX: the accomplishments list shows only persisted core state. Any episode line is labelled "this visit", or is left out.

7. [P5 acceptance: "exercise a genuine persistent prerequisite through real gameplay"] From a fresh save that means meet x N, layout, mural 3/3, soundcheck, open, photo, pack, 3 returns, programme 4/4, hosting 4/4, then civic (main.gd:6100-6138).
   - FIX: name the starting fixture explicitly: an apply_save_envelope profile with hosting done and civic idle, the same pattern as study_test.gd:6089/6128. Drive only civic start -> convene -> complete with real ui_accept/touch.

SHOULD-FIX

1. [P3 "All four visit episodes derive availability from block_opened plus valid sites"] Inaccurate.
   - Power is block_opened only (power_story.gd:223-224). Voting also needs power_place.loaded (voting_story.gd:147).
   - Power has two variants sharing one state, chosen by `historical=index==1` (power_story.gd:336), with different lighting (power_story.gd:440-443). Any adapter covers five storylines, not four.

2. [P5 "return ... exact manual camera"] Camera preservation is uneven: voting and lantern preserve manual camera on travel; dog walk_to_lead does not (dog_story.gd:269-278). verify: power walk_to_relay; grep found no following_player in power_story.gd. Scope the camera acceptance to reader open/close and the invitation card, not post-travel.

3. [P4 index location] "Existing-Story index combining civic->film" mixes two navigation systems. Civic and film live in the block hub (hub_button_for_objective main.gd:7232-7235). Story -> Power reader -> picker serves only episodes (power_story.gd:129-139, story_picker.gd:33-35).
   - FIX: keep the core invitation in the hub, via the card plus the film button. Keep Story for episodes only.

4. [P4 session bookkeeping] If the "open invitation" is derived from `civic_phase=="done" and film_phase!="done"`, an offer with session-only bookkeeping re-fires after every reload.
   - FIX: fire the offer only from the live civic_complete transition. The derived state may appear only as a passive "Open: The Open Seat" row.

5. [Naming] "Invitation" already names Bea's Illustrated Invitation (bea_invitation.gd:1-3, docs/BUILD_STATUS.md:235). Use distinct identifiers in code and in the a11y names so screen-reader users don't hear two different "invitation" objects.

6. [P2 "three contextual primaries"] The contextual action list already makes film the primary after civic (main.gd:6530-6531). Follow/Keep exploring must live on the card, not as extra primaries. verify: the phone primary-count cap function.

OPTIONAL / NICE-TO-HAVE
- hosting_complete -> civic (main.gd:9921-9922, burst main.gd:10968-10970) is a second genuine, already-persisted transition. The same card mechanism covers it for free and makes the feature a pattern, not a one-off.
- The beacon recolor (main.gd:3199) is the existing "visible world consequence". Say so in acceptance rather than inventing a new prop.

CUT THESE
1. Four-module suspend/resume adapters (A). They are the largest risk surface (see MUST-FIX 5), and episodes are short, visit-only and already resumable via close_story while active. Replacing them with confirmed End-and-switch delivers "available to switch and revisit" honestly.
2. A separate journal/index screen. The chapter card, the hub film button and the existing gold-suggestion system already carry the information. A new modal adds a saved_visibility/focus transaction of the kind the brief itself flags as a hazard.
3. Episode "accomplishments" rows and C's "original completion recognition" for episodes. Each episode already has resident recognition on win (voting_story.gd:212, lantern_procession.gd:310, dog_story.gd:299), and none of it persists.
4. The "fresh-save no-future-title spoilers" acceptance item for film. It is unfalsifiable against existing content (MUST-FIX 1); replace it with "new copy introduces no new future titles".

RECOMMENDED SLICE (smallest that meets P2):
- (a) The live chapter-transition card gains Follow (opens the film activity in place) and Keep exploring (session-only deferral that removes film from current_objective and the gold highlight).
- (b) The hub film button and its passive "open" label stay as the retained invitation.
- (c) The Story picker offers already-available episodes via confirmed End-and-switch with honest visit-loss copy.
- No new saved keys; established saves keep every existing access path.

[ASSUMPTION] This assumes show_story_card can host two extra buttons within the 44px/phone constraints; verify: the build_story_card layout (main.gd:7286+) at 320/390 widths.
