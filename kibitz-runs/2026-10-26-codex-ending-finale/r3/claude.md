TOOL CHECK: PASS (read input.md, package.json, godot/orbital_commons.gd and others successfully).

VERDICT: yes-with-fixes. The production wiring (phase machine, reset boundaries, close_room restoration) holds together against the real code. But one unchanged browser test still asserts the old "still to be built" departure text, so the formal full browser run will fail as things stand. The rest are contract/text mismatches and assertions that test nothing.

MUST-FIX BEFORE BUILD

1. [tests/departure-browser.mjs:39 vs godot/habitat_room.gd:99] A stale contract will break the formal all-five browser run.
   departure-browser.mjs:39 asserts `assert.match(h.text,/Choose Walk orbital.*final gathering and authored return journey are still to be built/s)` on departure panel 2. The current panel-2 string at habitat_room.gd:99 ends "...Choose Walk orbital to explore the commons and share a view with Thanh. After sharing a view, Gather here brings everyone together. Finish that gathering to choose memories, exploration or an authored return." It no longer contains "still to be built" anywhere, including the trailing text at habitat_room.gd:100.
   verifyDeparture still runs in the main sequence (tests/godot-browser.mjs:2863, one line before verifyFinale at :2865). tests/departure-browser.mjs is not in the modified set (git status; source-before.json hash 0a4244b7…), so it was never updated.
   orbital-browser.mjs (modified) was updated to the new "Gather here brings everyone to your shared view" text at :40. departure-browser was missed. [ASSUMPTION] The private browser2 run that the anchor reports did not run verifyDeparture against the current habitat_room.gd text, or this would already have failed.
   Fix: change the regex at departure-browser.mjs:39 to the new contract, e.g. /Choose Walk orbital.*Gather here brings everyone together.*authored return/s. It is a one-line test change, and the departure source-fingerprint entry (godot-browser.mjs:98 includes tests/departure-browser.mjs) must then be refreshed.

SHOULD-FIX

1. [orbital_commons.gd:218 vs helper_bench.gd:149] The return_home announcement names a button that no longer exists by that name.
   return_home() announces "...Watch your film and open Habitat room to revisit." returned implies completed, and when completed the bench button label is "Revisit finale" (helper_bench.gd:149; finale-browser.mjs:39 taps it by that text). A screen-reader user is told to look for a label that is absent.
   Fix: say "open Revisit finale on the helper bench".

2. [orbital_commons.gd:253] The phase-change announcement leaks internal phase ids.
   refresh(true) announces "Orbital "+phase+". " in every non-walk phase, so users hear "Orbital gathered.", "Orbital recap.", "Orbital return.". The user-facing names already exist in the heading dictionary at :222 ("An open place", "The welcome stays open", "A way home", "Memories of this visit").
   Fix: announce that dictionary value instead of `phase`.

3. [habitat_room.gd:184 with orbital_commons.gd:111] Pause/Escape after returned==true announces a false statement.
   close_room() always says "...this pause does not complete the authored return-home journey" whenever orbital.visible. After Home now, reentry lands in phase "menu" with returned=true (finale_checks.gd:93). Pausing from there still says the journey is not complete, which contradicts recognition() at orbital_commons.gd:191.
   Fix: in close_room(), use the returned-aware wording when `orbital.returned` is true (e.g. "Future chapter paused. Your return home is already complete this visit."). This is the smallest change, inside the allowed habitat text surface.

4. [tests/finale-browser.mjs:36] The Escape check asserts nothing.
   `await page.keyboard.press('Escape');await settle();assert.ok(!o.returned);` tests `o`, which was captured before Escape. Escape is only proven indirectly, because enter() later needs the film screening to be reachable.
   Fix: `const after=await snap(); assert.ok(!after.habitat_room.visible && !after.habitat_room.orbital.returned && after.habitat_room.orbital.return_panel===1);`

5. [orbital_commons.gd:399 "floor_labels_visible"; finale-browser.mjs:37] The visual check for "return hides floor labels/actors behind the card" is a restatement of the phase, not a measurement.
   floor_labels_visible is computed as `phase!="return"`, so asserting it false at panel 2 only re-checks the phase. Nothing measures pixels for labels or actors behind the card; the evidence is only the screenshot finale-…-return-2.png.
   Fix: in finale-browser at panel 2, sample label_rect/target regions taken from the gathered-phase snapshot. Assert they match the card fill f4ebce within tolerance, in the same style as the existing difference() helper. Or drop the field and rely on that pixel check (see CUT 1).

6. [orbital_commons.gd:222, snapshot() :399-408] "Mode heading matches state" has no test hook.
   The heading text is not in snapshot(), only top geometry, and neither finale_checks.gd nor finale-browser.mjs asserts the heading for any phase.
   Fix: add "heading":heading.text to snapshot. In each existing phase step of finale-browser and finale_checks, assert it contains the matching dictionary phrase.

7. [orbital_commons.gd:159-161, :172, :180] Some reachable transitions are never exercised.
   No native or browser journey covers:
   - "Back to commons" from an uncompleted gathering (gathered index 1);
   - return-phase "Back to choices" (index 5 → menu);
   - "Previous" at panel 0 (→ menu);
   - Back to departure from gathered/menu, then "Walk orbital" re-entry keeping the phase.
   The browser test at :40 does Back from menu but goes straight to relocation. The anchor claims "Reentry retains phase/positions" for all exits, but only the Pause/Escape-via-bench path is tested.
   Fix: add one native step in finale_checks.verify after line 78: back → room.assist ("Walk orbital") → require phase=="menu" and completed. Add one step at panel 0: Previous → require phase=="menu" and not returned. No new journeys are needed.

OPTIONAL / NICE-TO-HAVE

- [orbital_commons.gd:361-368] After "Back to commons" from an uncompleted gathering, the walk phase still draws Bea/Celeste/Dez at GATHERED[gathering] with the invitation paper and ring, while the heading reads "Walk the commons". This is consistent with the replay-separation rule but may read as an unfinished gathering. If it is intended, consider one caption line in the walk body when gathering>=0 and not completed.
- [finale-browser.mjs:31; finale_checks.gd] Nothing asserts that the three GATHERED compositions differ from each other. Each run only shows a change from the pre-gather image (≥20px). A native check that GATHERED[0..2] and the paper anchors are pairwise distinct would back the "three distinct compositions" claim cheaply.
- [package.json godot:test / scripts/run-godot.mjs:10-17] Configuration propagation is correct: run-godot.mjs injects unique --godot-save-path/--godot-settings-path before --test-suite, and refuses if they are already supplied (:14). No change needed. Noted only because the brief makes it a hard rule and the npm script alone doesn't show it.
- External systems (round focus 4): the finale adds no third-party calls. JavaScriptBridge lifecycle flags (orbital_commons.gd:48-55) are reused unchanged. No auth, rate-limit or retry surface was added.

CUT THESE (over-engineering)

1. [orbital_commons.gd:399 "floor_labels_visible"] This field restates `phase` and gives false confidence as visual evidence. Cutting it is safe once the pixel assertion in SHOULD-FIX 5 exists; nothing in production reads it (only finale-browser.mjs:37 does).

VERIFIED-OK (grounded, so the judge needn't re-derive)

- Reset ordering:
  - apply_save_envelope resets first (main.gd:13036), then validates.
  - A failed browser import returns before any reset (main.gd:13608-13614).
  - A successful import merges, then resets (main.gd:13737).
  - HabitatRoom.reset_visit runs close_room → reset_departure → orbital.reset_visit, in that order (habitat_room.gd:187, :45).
  - So the native good/bad/browser differences match finale_checks.gd:31-38.
- Relocation goes through carry_or_welcome → reset_departure (habitat_room.gd:239-240). Selection and detail do not reset.
- Copies cannot change mid-visit outside load/import: film_start needs film_phase=="idle" (main.gd:10321), and host_start needs an empty hosting_order (main.gd:9870). So no stale orbital_copies or "Revisit finale" path exists.
- Only Home now sets returned (orbital_commons.gd:215-217), guarded by phase/panel/completed. pause_chapter never touches completed or returned.
- After return_home, orbital.visible stays true while the room is hidden, so reentry goes straight to phase "menu" through room.refresh (habitat_room.gd:272-275). Hidden-room callers all guard on `visible`.
- The held-key guard covers Home now (close_room records held keys; main.gd:14319 release_pending).
- Budget arithmetic is consistent: 2074608+7632=2082240, and 2097152-2082240=14912. verify: exported PCK size after the fixes above.
- Production scope: helper_bench.gd changes are limited to :148-149 (recognition prefix plus label). habitat_room.gd changes are text-only at :99 and :288 as far as can be seen. verify: diff of habitat_room.gd/helper_bench.gd against HEAD; I had no git diff access, so this was judged from current file contents only.
- study_test.gd:3306 adds a single finale_checks call after orbital_checks, and the FORMAL token is gated `if not suite.failed` (finale_checks.gd:119), like the sibling ending tokens.
