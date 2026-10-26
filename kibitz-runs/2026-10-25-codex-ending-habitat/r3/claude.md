TOOL CHECK: PASS. I read input.md, godot/habitat_room.gd (whole file), godot/helper_bench.gd (whole file), godot/hosted_afternoon.gd, godot/film_screening.gd:110-139, godot/tests/habitat_room_checks.gd (whole file), tests/habitat-room-browser.mjs (whole file), and these main.gd ranges: 120-124, 7722-7736, 9696-9775, 9880-9889, 10100-10121, 10264, 11806-11905, 12005-12020, 12083-12113, 12185-12199, 12530-12539, 13010-13088, 13700-13749, 14290-14339, 14600-14709 and 16053-16058. I also read the godot-browser.mjs call site (2825-2859), godot/export_presets.cfg, quiet_seats.gd TITLES, the r1 final.md and docs/ENDING_HABITAT_BRIEF.md.

VERDICT: yes-with-fixes. The modal wiring is consistent: every bench registration site has a habitat counterpart, the reset/import order matches the bench, and the copy contracts and SVG builder inputs line up. But one selected-design behaviour is not implemented (the helper moving), and two acceptance claims (restoring visibility and focus on Keep/Escape at each step; restore-on-refusal) are not established by any assertion.

MUST-FIX BEFORE BUILD

1. [Selected before code; r1 final.md:5 "The familiar amber/teal helper moves only in discrete still stages on this deliberate action"] The helper never moves.
   - The helper glyph is always drawn at one fixed place: habitat_room.gd:220-221, `ry := 46`, cx 345/375, the "header parking bay".
   - `last_place` is set on every carry (habitat_room.gd:142) and reset (habitat_room.gd:105). Its only other use is as part of the texture cache key (habitat_room.gd:205). No drawing code reads it, so it is dead state.
   - input.md §Evidence says the driver moved the helper to the parking bay, but never says that per-carry movement was dropped. The selected design and the build disagree, and the formal gate would certify a claim that is not true.
   - Smallest fix, pick one:
     (a) Draw the parked helper beside `SPOTS[last_place]` after each carry, outside the clear passage (x 330-390, habitat_room.gd:210). Fall back to the bay when last_place is -1. Add one native assertion that the drawn position changes with last_place.
     (b) Delete `last_place` and amend final.md/handoff to say "static parked helper glyph; carrying is shown by module occupancy only".

2. [Implemented: helper_bench.gd "Close caller before room open"; habitat_room.gd close_room; r1 final.md:9 "Habitat Keep/Escape returns to the block with original focus/manual/quiet/input state"; ENDING_HABITAT_BRIEF.md acceptance 2 "Back/Keep/Escape at each step restores original visibility and appropriate focus"] Neither suite asserts visibility or focus restoration through the three-deep chain. The chain is: F4 → film_screening.open_helper (film_screening.gd:125-128) → helper_bench.open_habitat (helper_bench.gd:89-92) → habitat open_room/close_room (habitat_room.gd:79-102).
   - The room's `saved_visibility` and `return_focus` are captured after close_bench has restored the bench's snapshot (habitat_room.gd:83-85). That bench snapshot was in turn captured after close_screening. Correctness therefore depends on all three restores composing.
   - Native: habitat_room_checks.gd:11-12 captures sibling visibility, but :100 restores it unconditionally and :108 force-grabs focus. Nothing compares them after Keep (:38, :42, :61) and nothing asserts the focus owner.
   - Escape is never sent in native.
   - Browser: habitat-room-browser.mjs:98-99 checks camera, storage and quiet after Keep, but not the visibility of `walking_controls`, `block_panel_control` or `controls_control`, and not the focus owner. Escape is pressed once (:100), only in the completed non-detail state.
   - Fix:
     (a) In the native loop, after each Keep and after one Escape at a partial step and in detail view, assert sibling visibility equals the pre-F4 map and the focus owner equals the expected block control (or null).
     (b) In the browser harness, compare the `walking_controls` / `block_panel_control` visibility in `original` (line 32) with the values after line 98 and line 100.
   - Until then, report this acceptance item as unverified.

SHOULD-FIX

1. [Implemented helper_bench.gd "fallback opens helper on refusal"; helper_bench.gd:89-92] The order is wrong, and the fallback can never fire.
   - open_habitat checks only `available()`, closes the caller (close_bench(false)), and only then lets open_room run its guards (habitat_room.gd:81).
   - Those guards (startup_story_pending, story card, current_path, active_story_episode, is_focused_activity_visible) are exactly the guards of open_bench (helper_bench.gd:75). habitat.available() is a superset of bench.available() (habitat_room.gd:67-74 vs helper_bench.gd:70-71).
   - So any refusal after the handoff also makes the `open_bench()` fallback refuse. The player lands on the block, and the bench's refusal announcement overwrites the room's.
   - No test reaches this path: the native refusals at habitat_room_checks.gd:93-96 call `room.open_room()` directly, not via the bench.
   - Smallest fix: add `can_open()` to habitat_room. It runs the same guards but excludes the caller from the focused-activity check. Call it in open_habitat before close_bench, and stay in the bench on refusal.
   - Alternatively, document the fallback as unreachable and defensive only.
   - film_screening.gd:128 has the same pattern; that one is pre-existing and does not block this slice.

2. [Implemented habitat_room.gd "Escape"; habitat_room.gd:250] Escape in detail view (`inspecting == true`) closes the whole room. The existing nested-mode precedent asserts "Escape returns one level" (tests/godot-browser.mjs:620). The selected design (final.md:7, "Show room returns to composition") does not say what Escape does here.
   - Fix: decide and test it either way.
   - The smallest consistent change is `if inspecting: toggle_detail()` before close_room. If the current behaviour is intended, state it in the handoff and cover it with the Must-fix 2 Escape-in-detail case.

3. [Formal gate: "HABITAT_ROOM_PASS:FORMAL"] The token is printed (godot/tests/habitat_room_checks.gd:111) but no script checks it. A repo grep outside kibitz-runs/artifacts finds it only in the test, docs/BUILD_STATUS.md and session_handoff.md; package.json and scripts/* do not reference it. HELPER_BENCH_PASS is the same (pre-existing).
   - Because the token is guarded by the cumulative `suite.failed`, an earlier unrelated failure silently suppresses it.
   - Fix: the all-five receipt must record an explicit grep of the native log for `HABITAT_ROOM_PASS:FORMAL` and `HELPER_BENCH_PASS:FORMAL`. Do not rely on the exit code alone.

4. [Interface/config propagation: tests/habitat-room-browser.mjs:50,53,73,84-85 vs habitat_room.gd:8,190,215-217] The browser oracle hard-codes the room geometry:
   - SPOTS [[42,258],[422,30],[42,30],[422,258]]
   - film scale .4, module 222x372, frame offset 6+f*122, frame 210x118
   - the 720x480 / 222x372 canvases

   Any layout change in GDScript makes the pixel probes sample other regions. The low thresholds (paper>40, border>3, habitat-room-browser.mjs:18) might still pass on a neighbouring frame, although the ring/panel identity check (:19) limits this.
   - Fix: export the per-place drawn rects and the room film-frame rects from `snapshot()` (habitat_room.gd:262-267), and have the harness read them instead of duplicating the constants.

5. [Implemented habitat_room.gd "Film/art SVG builders get validated explicit copies"; svg_body habitat_room.gd:199-202] Stripping the root `<svg>` also removes the builder's viewport clip.
   - Today the content stays inside the viewBox: build_film_frame_svg's close transform `translate(-30 -8) scale(1.2)` with ring cx270 r28 gives max x ≈ 332 and y ≈ 197, inside 420x236 (main.gd:9764-9771). build_tile_panel_svg stays inside 360x240 (main.gd:9719-9723). So there is no bleed now.
   - But the "assigned bounds" guarantee now silently depends on every future builder edit.
   - Smallest fix: wrap each flattened body in `<clipPath><rect width=W height=H/></clipPath>` inside the existing `<g transform>`, without re-nesting `<svg>`. verify: that ThorVG honours clipPath under the outer transform before adopting it.

OPTIONAL / NICE-TO-HAVE

- habitat_room.gd:205: in room view the texture key includes `selected` (and `last_place`), but only `destination` is drawn there. Every Art/Film/Seats tap re-rasterizes the full 720x480 SVG with nine nested film frames, and with a 4-entry cache that is noticeable churn on web. Key room view on [c, assigned, destination, complete] and detail view on [c, selected].
- habitat_room.gd:177-178: when fewer than 3 modules are placed and the selected module is already placed, `assist` reads a disabled "Welcome Thanh". "Ask helper" (disabled) would be more honest.
- habitat_room.gd:156: the a11y description exposes raw ids ("Entry: art"). Use TITLES for consistency with the button names.
- habitat-room-browser.mjs:31-33 asserts `!startup_pending` and the viewport after a generic settle, rather than waiting on them. It fails closed, so this is a flake risk, not a false pass. input.md §Evidence calls it a barrier that "requires" a newer startup-dismissed snapshot; a `waitForFunction` on those conditions would match that description. verify: the "startup observation receipts" in input.md:23/32 come only from the private harness, not from this file. They are absent here.

CUT THESE (over-engineering)

1. `last_place` (habitat_room.gd:25,105,142,205), if Must-fix 1 takes option (b). It is never drawn; it only fragments the cache key. Safe to cut: no snapshot, test or text reads it (verified by reading habitat_room.gd and habitat_room_checks.gd in full).
2. The first clause of `can_carry()` (habitat_room.gd:135), `assigned.get(PLACES[destination],"")!=ITEMS[selected]`. The second clause, `not assigned.has(...)`, already implies it. Safe: pure redundancy.

NOT DEFECTS (checked, so the judge need not re-trace)

- Modal registration parity. Every bench site has a habitat counterpart:
  - main.gd:7730, 12113, 12192, 12531, 13035, 13736, 14317, 14628, 14681, 11901 and 16056
  - cutaway (14142) and world update (3156) are correctly omitted, since the room has no props.
- Physics order: release_pending for habitat (14317) runs before the bench (14318). It is safe because both prune by live key state.
- Copy contracts:
  - HOSTING_QUIETS ["arc","pairs"] (main.gd:102) matches quiet_seats.TITLES keys.
  - CIVIC_FORMATS/LABELS "circle"/"dropin" (main.gd:120-124) match module_svg's `=="circle"` branch.
  - civic notes is an enum (main.gd:10104-10111), so there is no free-text leak through `snapshot().copies`.
  - Builders receive non-empty explicit dicts, so their draft fallbacks (main.gd:9697-9703, 9751-9753) are never taken.
- Browser import resets after the merge (main.gd:13736), so copies() reads post-merge state. Native apply resets before validation (main.gd:13035), the same as the bench.
- tests/* is excluded from export (godot/export_presets.cfg:7).
- [ASSUMPTION] Godot Button default ACTION_MODE_BUTTON_RELEASE prevents the handoff tap's release from activating the room's "Keep exploring", which overlaps the bench's "Habitat room". The genuine touch journeys at 390/320 support this, but no assertion covers it.
