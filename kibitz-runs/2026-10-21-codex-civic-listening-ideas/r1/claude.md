TOOL CHECK: PASS (read input.md, godot/main.gd, public/civic.js, public/game.js, godot/film_screening.gd, docs/ROADMAP.md, tests/godot-browser.mjs, godot/tests/study_test.gd via Grep/Read)

Section ids used below refer to input.md lines: [L2 scope], [L3 ask], [L4 opportunity], [L5 constraints], [L6 source reading].

VERDICT: yes-with-fixes. The opportunity is real and well-grounded: Godot is missing the M4 civic slice's actual scripted conversation, named choices and shared request, which the roadmap says the 0.11.0 civic slice already delivers in the browser. But the outline mixes up "port the existing authored exchange" with "write original new dialogue". It promises a "persistent" reflection that the current memory precedence cuts short. And it calls the result a "reader" while also telling itself to avoid worksheets. Fix those three before selection.

MUST-FIX BEFORE BUILD

1. [L4] The plan does not say whether the dialogue is a port or new writing, and the two choices pull in opposite directions.
   - L4 asks for both "present public/civic.js civicConversation authored four-speaker exchange" and "original fictional resident dialogue/turns".
   - That exchange already exists and is already original fictional writing: public/civic.js:49-57 (Bea, Thanh, Celeste, Dez lines that vary by topic, format and notes). The browser shows it during the meeting phase: public/game.js:227, `civicConversation(plan).map(...)` inside `civic-voices`.
   - The precedent the plan cites, the film screening, was explicitly "bringing the existing browser illustrated reader into the 3D track" (docs/ROADMAP.md:73).
   - Writing a second, Godot-only script would split the two tracks' canonical civic content. That breaks the ROADMAP:5 "Preserve browser 0.12.0" parity posture.
   - Fix: state that the Godot conversation uses the civicConversation text verbatim, mirrored as GDScript constants the way main.gd:10244-10253 already mirrors civicResponse verbatim. Allow new writing only for turn framing, such as a "pass / just listen" beat. Add a byte-equality test against public/civic.js, like the existing civicPlanSVG parity assert in tests/godot-browser.mjs:1883-1885.

2. [L4 "persistent exact copied-result reflection"] The persistence claim is false under the current memory rules.
   - main.gd:10223 checks `film_phase == "done"` first. The civic branch (main.gd:10239) is an `elif`.
   - So the five copied-result civic reflections in neighbor talk last only from civic completion until film completion. After that, film memories replace them permanently.
   - The plan does not say where the "persistent" reflection lives: neighbor talk, the reader, or the world board.
   - Fix: pick one surface.
     - (a) The optional re-read reader shows the copied civic_result reflection whenever civic_phase == "done", independent of film state. This is the smallest fix and leaves the memory precedence untouched.
     - (b) Change the precedence. That alters existing film memory behavior, which L5 says to keep. Not recommended.
   - Name the surface and add a test for state "film done → civic reflection still reachable".

3. [L4 vs L3] The method contradicts the stated goal.
   - L3/L4 say "Prefer lived scene/decisions over another reference worksheet". The proposed deliverable is a "Listening Hour reader": a modal text panel, which is the worksheet pattern.
   - The real decisions (topic, format, notes) are made in planning, and then convene copies them.
   - The conversation belongs to the meeting phase (browser: public/game.js:227 renders it on the meeting step). Godot's meeting phase today is a single button: main.gd:14788, "Share Circle Notes", which calls civic_complete.
   - Fix: define the lived scene as the meeting phase itself. Speakers' turns step forward one per press via the existing Q/Share Circle Notes path, and civic_complete fires only after the last turn or an explicit "Close the hour".
   - Without that sequencing, the conversation is an optional pop-up the player can skip with Q, which repeats the current hollowness.

4. [L4 "direct named choices"] The setter exists but nothing in the UI calls it, and the plan does not say where the controls go.
   - civic_set_choice (main.gd:9786) is only called from godot/tests/study_test.gd:1181-1182. Players reach choices only through Shift+Q cycling of all 8 combinations (main.gd:9840-9865, 14091-14092).
   - The plan names neither a host (block panel row like quiet_seats/bea_invitation, or a new modal) nor what happens to Shift+Q.
   - Fix: state that named choices are three two-option toggle rows in the block panel during planning, matching quiet_seats' row pattern (main.gd:14704-14707). Shift+Q stays as the cycle. The rows are hidden outside planning, so done-phase re-read cannot call civic_set_choice (it already returns false outside planning, main.gd:9787, but the UI must not even offer it).

5. [L4 world notice art / L5 "new representation should not replace copied photo/SVG"] The world board and table have no texture or art path, and the plan does not define one.
   - c_board (main.gd:2997-3003) and d_table (main.gd:3008-3014) are flat `material(Color("d9a2b2"))` boxes with no UV/texture path.
   - The film precedent needed "corrected texture mapping" (ROADMAP:73) and a dedicated texture builder (main.gd:3176-3177, `film_screening.texture(...)`).
   - The plan also forbids rewriting civicPlanSVG (L4). So the art cannot be the existing plan SVG. It must be a new builder, which must not be confused with the frozen one.
   - Fix: name it as a separate original texture builder (e.g., an illustrated notice). Do not route it through build_civic_plan_svg (main.gd:9388), so the svg_samples.civic_plan byte parity at tests/godot-browser.mjs:1883 stays untouched. Say whether art shows on the board only (circle) or table only (dropin), since update_block_3d shows only one group (main.gd:3151-3155).

SHOULD-FIX

1. [L4] The authored shared request is defined in Godot but never used.
   - CIVIC_TOPIC_REQUESTS (main.gd:116-119) appears only at its definition; Grep finds no reader.
   - The browser shows it only when notes == "themes", with an "it has not been sent" disclaimer (public/game.js:227). This is the most meaningful notes-choice consequence and is missing in Godot.
   - Fix: include it in the slice, gated on notes == "themes", with the same not-sent framing. This directly serves L5's "no collected testimony / no outbound" constraint.

2. [L4] The plan never says what in-game consequence the notes choice and format choice have beyond text.
   - Format already changes world furniture (main.gd:3151-3155). Topic and notes change nothing in the world.
   - Either accept that and say so, or let the notice art differ by topic and notes, for example a themes card versus a deliberately blank "nothing recorded" card. The second is cheap and makes the "none" choice visible rather than an absence.

3. [L6 / assumption] Adding a modal has a hidden integration cost.
   - Modal exclusivity is hand-maintained in many places: is_film_screening_visible() is checked at main.gd:5807, 5872, 7441, 11738, 12077, 12554, 13106, 13690, 13747, 13947, 14193 and 14443.
   - A new Listening Hour modal must be added to each, or input and camera bleed through.
   - Fix: either avoid a new modal (preferred; see Must-Fix 3: drive the meeting turns from the existing block panel detail and dialogue, as quiet_seats/bea_invitation do via last_panel_dialogue at main.gd:9561/9604), or list every guard site as an explicit build item.

4. [L5 "no new key/version"] The turn index has no defined persistence.
   - If turns are stepped (Must-Fix 3), the current turn index must be ephemeral; the save schema (main.gd:12039-12043) has only phase/draft/result.
   - State that a reload mid-meeting restarts the conversation at turn 1 and that this is acceptable.
   - Otherwise the build will either add a save key, violating L5, or silently lose position.

5. [L3 "compare with neighbor project/world consequence or atmosphere alternative"] The comparison alternative is named but never specified.
   - Without a concrete second option there is nothing to reject, and L3 explicitly requires "rejected alternatives".
   - Fix: name one, e.g. "Rook/Dez visibly occupy civic stools during meeting phase". Note the conflict: L5 bans duplicate named residents and moving resident anchors. The quiet_seats precedent (ROADMAP:57) used unnamed visitors for exactly this reason. Then reject or keep it on those grounds.

OPTIONAL / NICE-TO-HAVE
- civic_done_beacon is a sphere that turns yellow on done (main.gd:3028-3036, 3157). Fold it into the notice art instead of adding more markers.
- Add a Rook line to the conversation that Godot already has in civicResponse (main.gd:10250-10251) but civicConversation lacks. Only if browser parity is updated too; otherwise skip.
- verify: L5's "existing 12 hub titles/pages". Not checked here (look at the act list in main.gd ~6440-6510). If the new controls add a hub act, the 12-page claim changes.

CUT THESE
1. [L4] "Original fictional resident dialogue/turns" as new prose. Cut it in favor of the verbatim port (Must-Fix 1). New prose adds review and acceptance burden (tone, "no real stance") for content that already passed review in 0.11.0 (ROADMAP:69), and it splits the tracks.
2. [L4] A separate optional "re-read after done" modal as its own feature. If the meeting-phase conversation lives in the block panel, the re-read is just the same text shown when civic_phase == "done" with no setters. Do not build a second viewer, F-key, focus-return and visibility-guard surface (cf. film_screening.gd:12-14 and 70-80) for a four-paragraph text.
3. [L6] "Required later separate exact scoped r3 plus ALL 5 fresh gates" and the lock/baseline bookkeeping in L2. These are process, not part of the design. Keep them out of the build-scope document so they do not count as deliverables.

[ASSUMPTION] notes:
- I assume the 8-combination Godot browser stage tests (tests/godot-browser.mjs ~2240-2293, plus the study_test.gd:1177-1182 block) will need new assertions for turn stepping. I did not trace the full civic stage test body.
- I did not open quiet_seats.gd or bea_invitation.gd in full. The "row pattern" reference is based on main.gd:14704-14707 and 9561/9604 call sites only. verify: the exact row API before reusing it.
