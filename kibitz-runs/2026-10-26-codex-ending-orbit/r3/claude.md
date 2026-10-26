TOOL CHECK: PASS (read godot/orbital_commons.gd, godot/habitat_room.gd, godot/main.gd, godot/tests/orbital_checks.gd, tests/orbital-browser.mjs, docs/ENDING_ORBIT_BRIEF.md)

- VERDICT: yes-with-fixes. Ownership, reset and import wiring trace cleanly through the real code. Two required cancellation/honesty behaviours are not there: focus loss is only partly handled (and untested), and the shared-view state goes stale after an interrupted invitation (both test lanes lock that stale state in).

MUST-FIX BEFORE BUILD

1. [CONNECTED CANDIDATE "focus loss cancel local motion"; brief lines 27-28 "tab focus loss", "continue in the background"]
   Defect: godot/orbital_commons.gd:198-199 halts only on NOTIFICATION_APPLICATION_FOCUS_OUT. The repo's own lifecycle code at godot/main.gd:10915 also treats NOTIFICATION_APPLICATION_PAUSED (Android background) and NOTIFICATION_WM_WINDOW_FOCUS_OUT as suspend events. So on Android pause, or when the window loses focus without an application focus-out, an active player or Thanh route keeps going. _process (201-215) resumes it on return; the delta clamp at 205 only stops it jumping. On top of that, no orbital test triggers any focus-loss notification. grep shows none in godot/tests/orbital_checks.gd and no blur/visibility event in tests/orbital-browser.mjs. That makes the claim unproven in both lanes.
   Fix (smallest): change line 199 to `if what in [NOTIFICATION_APPLICATION_PAUSED,NOTIFICATION_WM_WINDOW_FOCUS_OUT,NOTIFICATION_APPLICATION_FOCUS_OUT]: halt(false)`. That mirrors main.gd:10915, and main.gd stays unchanged. Add one native step in orbital_checks.gd during actual walking: `suite.root.propagate_notification(Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT)`, then assert `not orbit.moving()` and an unchanged position after a timer. That goes through the real notification path rather than setting child state. verify: whether Godot 4.7 web emits WM_WINDOW_FOCUS_OUT on canvas blur [ASSUMPTION: APPLICATION_FOCUS_OUT is documented for desktop/mobile only]. If it doesn't, state honestly that web tab-hide only freezes motion because rAF stops, and that motion continues on return.

2. [CONNECTED CANDIDATE "changed resident location/shared-view marker"; r3 ask "honest state after stop during resident travel"]
   Defect: invite_thanh (orbital_commons.gd:110-114) starts a new resident route but never clears `shared`. halt (81-85) clears only `sharing`. Take the case Invite at a second place, then Stop, Back, Pause, Escape, walk_to or reader input mid-route. Thanh is left between places, but:
   (a) the shared ring is still drawn at the old destination (line 239);
   (b) the reading panel still opens with the old response(), e.g. "Thanh: You brought me to Celeste's six shapes" (116-118, put first by line 125);
   (c) halt's notice says "Choose a place to walk again" (84), although the player never moved and Invite is the live choice.
   Both lanes lock this in as correct. godot/tests/orbital_checks.gd:85-87 invites, presses Back, then requires `orbit.shared==first`. tests/orbital-browser.mjs:50 does the same: orbitButton(3) then orbitButton(5), then `o.shared===first`. Neither checks where Thanh actually is.
   Fix (pick one, then update both test sites to match):
   (i) set `shared=-1` in invite_thanh before routing, so the earlier view counts as left, and assert shared==-1 plus a stationary Thanh at 86-87 and in browser line 50; or
   (ii) keep `shared`, but draw the ring and say response() only while `thanh.distance_to(DESTINATIONS[shared]+Vector2(42,10))<1`. Otherwise say "Thanh paused on the way; invite again to share this view."
   In both cases halt() should give a resident-specific notice when only thanh_path was non-empty.

SHOULD-FIX

1. [Brief line 43 "readable copied graphics and visible player/location at supported sizes"; r3 ask "glyph visibility", "identity shapes including rollator/headphones"]
   Defect: everything is drawn under draw_set_transform(art_rect.position,0,scale) (orbital_commons.gd:228). That includes the 16-unit floor labels (235), the player/resident figures with 4-5-unit strokes, the headphone cups r4 (221) and the rollator lines (223). At supported sizes in the native matrix (orbital_checks.gd:48), my estimate is scale ≈0.36 at 320x568 and ≈0.31 at 520x360 (side layout: area.x=vp.x-280-6-12=222, so 222/720). [ASSUMPTION: tray/top heights estimated from the 112/64 reader minimum plus three 44px rows.] Floor labels would come out around 5-6px, headphone cups around 1.4px and the player marker (240) around 1.4px. The existing room deliberately uses fixed 12px Label nodes for place names (habitat_room.gd:112, 394). The only size gate is art width/height ≥180x120 (orbital_checks.gd:69), with nothing on glyph size.
   Fix: draw the labels after `draw_set_transform(Vector2.ZERO)` at a fixed size of at least 12px, positioned with art_rect.position+DESTINATIONS*scale. Alternatively reuse Label nodes the way habitat_room does. Clamp the identity-prop stroke widths to a minimum on-screen width. verify against browser3 captures at 320 and the 520x360 native case before deciding whether this is a must-fix.

2. [refresh focus ring, orbital_commons.gd:128-133]
   Defect: pressing Invite disables Invite (moving) while it still has focus. The ring is rebuilt from enabled controls only, so the disabled focused control keeps its old focus_next. That was computed when Stop was disabled, so it points to Back. Tab from Invite skips the newly enabled Stop. Stop has the same problem in reverse (128). Keyboard users can't reach Stop in one step during resident travel.
   Fix: in refresh, if the focus owner is a control being disabled, move focus to `stop` when moving() or to the first enabled destination/invite when stopped. Never send it to `reader`: reader focus halts (43).

3. [route/invite_thanh, orbital_commons.gd:93-98, 110-114]
   Defect: route() always passes through JUNCTION unless the start point is the junction. So inviting Thanh to the place he already shares sends him out to (360,350) and back. Invite also stays enabled when shared==reached (128). In the same way, walking from ENTRY (360,438) to Seats (360,390) goes up past Seats to y=350 and back down: a visible backtrack.
   Fix: return [] (or just `to`) when the start and end points are on the same segment. Disable Invite when shared==reached and Thanh is at the offset point.

4. [open_chapter failure path, orbital_commons.gd:71-75; habitat_room.gd:234]
   Defect: if an SVG fails part-way, the code clears copy_textures but leaves orbital_copies and invitation_title set, and doesn't reset copy_rasterizations. A retry pushes it past 3, which breaks the `copy_rasterizations==3` invariant (orbital_checks.gd:64). carry_or_welcome ignores the false return, so the "Walk orbital" press does nothing and announces nothing.
   Fix: reset copy_rasterizations and orbital_copies on failure, and announce a short refusal in carry_or_welcome when open_chapter() returns false.

5. [Pause/re-entry lifecycle, orbital_commons.gd:90-91 vs 85,123,138,143,245]
   Pause hides the parent (habitat_room.gd:178), not the child, so orbital.visible stays true on the street. That's intentional for re-entry (habitat_room.gd:270-273). But halt/refresh/queue_layout/fit_layout/snapshot all gate on local `visible`. Result: a resize or focus-out on the street re-lays out the hidden child, reruns set_activity_detail and calls sync_web_a11y_status. Also, habitat snapshot (habitat_room.gd:418) builds full child geometry on every a11y flush.
   Fix: gate queue_layout/fit_layout/snapshot geometry on is_visible_in_tree(). Re-entry already calls room.fit_layout, which forwards to orbital (habitat_room.gd:169, 386).

6. [Copies cache vs live departure text]
   orbital_copies and invitation_title are captured once (68-70). The departure panel recomputes them live (habitat_room.gd:93, 287). Film and civic can't restart once done (main.gd:10321 `film_phase != "idle"`, 10134). verify: that get_hosted_segment_value (hosted_afternoon.gd:8) can't change mid-session without the reset paths at main.gd:12532/13036/13737. If it can, re-entry through open_room (which skips open_chapter) would show stale copies.

OPTIONAL / NICE-TO-HAVE
- tests/orbital-browser.mjs:48: dragScrollbar runs straight after walk_to. walk_to changed the text, so set_activity_detail (main.gd:15492-15494) has already scrolled to 0 and `prior.scroll` is about 0. The assertion can't catch a halt-triggered reset to the top. Give it one prior scroll at rest to make it meaningful.
- orbital_checks.gd:82 uses programmatic `orbit.reader.grab_focus()`. That's acceptable only because the browser lane covers real scrollbar input. Label it that way in the receipt.
- refresh(true) announces the full ~1k-character body on every walk_to and arrival (107-108, 209, 214). Consider announcing just the notice and response.
- Thanh starts at (432,350), on the Film route (232), while response() says "waits near the seats" (117). Adjust the copy or the position.
- External systems: none. No network, auth or third-party calls in orbital_commons.gd. Config: all constants (speed 135 at 205, routes, rects) are hard-coded, which fits this authored scope. No env vars or flags to thread through. main.gd is confirmed unmodified per git status.
- No script collects the FORMAL tokens (ORBITAL_COMMONS_PASS appears only in orbital_checks.gd:119 and the docs). Acceptance still depends on reading logs by hand, the same as the earlier slices.

CUT THESE
1. Nothing material. open_chapter's three refreshes (76: room.refresh(false) already calls orbital.refresh, then refresh(true), then reader.grab_focus triggers halt and another refresh) waste a few calls but are harmless. Don't touch them in this checkpoint, so the frozen inputs stay unchanged.
