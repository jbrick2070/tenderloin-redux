TOOL CHECK: PASS (read godot/main.gd, public/game.js, docs/ROADMAP.md, package.json, godot/tests/study_test.gd, tests/godot-browser.mjs).

Section ids used below refer to input.md paragraphs: [P3 header/checkpoint], [P5 creator goal], [P7 tentative candidate], [P9 read list / alt candidates], [P11 hard constraints], [P13 incident], [P15 deliverables].

VERDICT: yes-with-fixes. The brief is buildable as an ideation prompt, but the lead candidate [P7] rests on a fiction that contradicts persistent world props, is framed as new work when it is mostly a lost port-parity behaviour, and offers no resident-led choice, which is what [P5] actually asks for.

MUST-FIX BEFORE BUILD

1. [P7] The "back home" fiction breaks for 2 of the 3 loans. The fix has to be decided before options are compared.
   - Table: Thanh's own line says the loaned table IS the gathering Long Table: godot/main.gd:7429 "My folding table made a fine Long Table". LayoutLongTable (main.gd:7252-7288) stays visible for good whenever gathering_layout=="table" (update_layout_3d, main.gd:7366). It doesn't depend on epilogue state. Its front stools are table_quiet_seats (main.gd:7278), which feed quiet_seats (main.gd:15288). [P7] also forbids "replacing/moving original ... table" and says "preserve later hosting props". So a folded-table silhouette at Thanh (neighbors[4]) would show the same table in two places at once, 4.6 m long at Bea's and folded at Thanh's.
   - Table, Open Floor branch: LayoutOpenFloor (main.gd:7290-7328) has no table, and Thanh's floor line (main.gd:7429) says "I kept the tea by the curb". The player still "returns Thanh's folding table", which was never put out.
   - Speaker: [P7] forbids moving the original speaker at ROOK_SPEAKER_POS (main.gd:27). Rook stands about 2.6 m from it (main.gd:488). Nothing ever left Rook's side, so there is nothing to visibly bring home.
   - Paint case: no paint-case prop exists anywhere (grep "paint.?case" across godot/ finds only consts, dialogue, the beacon offset and tests). This is the only loan with a clean slate.
   FIX: make the brief require each option to state its fiction. Smallest coherent version: the returned silhouette shows the carrying gear, not the main object. Examples: a table carry-bag/strap bundle, a coiled cable and speaker cover, the paint case itself. "Packed and back with the owner" then holds without touching the persistent Long Table or speaker. Alternatively, say plainly that Ch.3 "Another Afternoon" (main.gd:72) borrows the setup again and add one line of dialogue. Pick one. Leaving it to the implementer will produce the double-table.

2. [P7]/[P9] This is a port-parity restoration, not an original feature. Label it that way. The frozen browser build already has the "tangible lap" behaviours the Godot port lost:
   - public/game.js:401-403: talking to an owner while packing opens that owner's loan return, in any order ("Return the three borrowed supplies in any order", game.js:336).
   - public/game.js:340: owner-specific thank-you lines (Thanh, Celeste, Rook).
   - public/game.js:405: owner-specific lines after the return.
   - public/game.js:352: Bea's packed-up line.
   In Godot, return_next_loan (main.gd:9190-9199) always returns in LOAN_IDS order, wherever the player is. advance_epilogue_step attributes every return to Thanh, including Celeste's case and Rook's speaker: main.gd:9228 'Thanh: "Returned %s ..."'. The "epilogue" context action shows while chatting with anyone (main.gd:6468-6469, 6560-6561). So current_objective's "Return X … %s is <compass>" (main.gd:6084) points at an owner the code never checks.
   FIX: list "owner-specific return while talking to that owner, owner-voiced thank-you" as project-native prior art (game.js) being ported. Don't present it as new. Keep Y/hub "Return Gear" as the location-free fast path. ROADMAP line 23 already calls this a "short optional thank-you lap" that 0.2.0 implemented in the browser build.

3. [P5] vs [P7]: the goal and the method diverge. [P5] asks for "meaningful resident-led choices and world consequences". The loan slice has no choice: three fixed returns, canonical storage (return_loan canonicalises order, main.gd:9174-9178), one outcome. At best it's atmosphere plus a voiced ending.
   FIX: require each of the 2-3 options to state its decision point and its divergent visible consequence. If the loan option stays recommended, the brief must accept in writing that it's an atmosphere/port-parity slice and not a choice slice. The one honest choice available is "return Thanh's / Celeste's / Rook's first" via talk_partner. Order has no consequence unless something is added, so don't oversell it.

4. [P7] "Direct existing-action path" vs "no obligatory fetch chores / timers": the brief leaves this tension unresolved. Thanh (11.10, 24.97), Celeste (70.07, -17.75) and Rook (114.71, -14.79) are about 72 m + 45 m apart (main.gd:486-490). docs/ROADMAP.md:22 says "avoid fetch-task repetition". If returns need proximity, it's a fetch chore. If they don't, the visible consequence happens off-screen under the overhead camera.
   FIX: state the rule in the brief:
   (a) A return never requires proximity. Y, hub and conversation "Return Gear" stay as they are.
   (b) When talk_partner is an owner with an unreturned loan, conversation_actions (main.gd:6449) puts "Return <Owner's item>" first. That calls return_loan(<that lid>) and shows an owner line, which return_loan already supports out of order.
   (c) Any world change must still read correctly when first seen later. It must come from epilogue_returned only, with no transition animation that depends on witnessing it.

5. [P7] "Do NOT assert that arriving currently returns a loan": confirmed, it doesn't. finish_neighbor_arrival (main.gd:8634-8719) only sets visited/talk counts. For Celeste it opens show_mural_panel (8692), for Rook show_music_panel (8709). The brief needs one more line: any owner-return hook must NOT auto-fire on arrival, and must not displace the panels Celeste/Rook open on arrival. Otherwise arriving at Celeste during packing changes the meaning of an existing callback, which [P7] says to preserve.

SHOULD-FIX

1. [P7] "EXISTING footprints/anchors" are assumed safe but have not been checked. The loan_positions offsets (main.gd:2907-2911) are world-axis (+/-0.95 x, 0.32 y) and not street-rotated, unlike the banner/easel, which use banner_rot_y (main.gd:2844-2872). The box centre sits at y=0.32 with height 0.32, so today's beacon floats about 0.16 m off the ground. Thanh's crate is at prop-local (0.46, 0.17, 0.14) (main.gd:2512); verify it doesn't overlap the table beacon at thanh+(0.95,0,0). FIX: require a check that each silhouette footprint passes is_walkable_point/min_wall_distance, sits clear of the sidewalk route and existing props, and rests on y=0. Verify: the prop node's parent and rotation for the Thanh crate.

2. [P11] "Do not promise universal tiny-world legibility", yet the loan option's whole value is reading 0.38 m silhouettes under the default overhead camera. FIX: acceptance must include a native screenshot/projection check at the default overhead pose and the narrow layout. If the silhouettes don't read there, a text/announcement consequence has to carry the meaning on its own. The pattern exists in film_easel_snapshot (main.gd:3089-3096).

3. [P9] The keepsake-easel consequence is lumped in with the loan idea. KeepsakePhotoEasel (main.gd:2869-2904) is a flat palette box plus pips. Changing it touches keepsake_photo, which tests treat as frozen: tests/godot-browser.mjs:280, 418, 458, 598, 1027, 1083, 1133 all assert epilogue.photo is byte-identical. FIX: if a keepsake option is offered, require it to read keepsake_photo only and never write it. Or drop it (see CUT 2).

4. [P15] "Actual browser acceptance": a Godot Web export and harness exist (package.json:21 godot:export, :23 godot:browser). But tests/godot-browser.mjs has no loan-return coverage; its only epilogue references are photo-preservation asserts. Native coverage is study_test.gd:1058-1060 (a visibility flag, plus canonical order). FIX: acceptance should name new browser steps: mouse click on the owner, then the conversation action; touch on the same path; keyboard Y fallback. Assert epilogue.returned order stays canonical, save <=4096 (pattern at godot-browser.mjs:458), and the legacy key is unchanged (pattern at :1003/:1027).

5. [P9] "Another candidate may be stronger": the brief should name the obvious roadmap-grounded rival instead of leaving it implicit. docs/ROADMAP.md:22 still lists "Finish distinct visible/dialogue consequences of both layouts" as open M1 work. gathering_layout is the game's one real resident-led binary choice (main.gd:7372-7412), and layout_memory_line (7415-7430) already branches dialogue. A layout-branch consequence that carries into Ch.3+ fits [P5] "resident-led choice → world consequence" better than the loan lap. [ASSUMPTION] Partial 0.5.0 work (ROADMAP:26) may cover some of this in the browser build; verify how much of it the Godot port has.

6. [P13] The incident rules are correct but put a review-only constraint into an ideation brief. Keep them; they're safety-critical. Also add the one implementation-facing consequence: any new acceptance test must use the isolated --godot-save-path/--godot-settings-path flags. That point currently sits only in prose.

OPTIONAL / NICE-TO-HAVE
- Bring over Bea's packing line (game.js:352, "Seats are folded…"). Note that in Godot it contradicts the persistent stools and quiet seats (main.gd:7278, 15288), so rewrite it rather than port it as-is.
- After all three returns, give owners one post-return idle line each, ported from game.js:405 via neighbor_memory_tail. No new state needed.

CUT THESE
1. [P9] "Any genuinely new persistent feature needs an explicit compatibility/budget design". For this slice, ban new persisted fields outright. Everything proposed comes from epilogue_returned, epilogue_packing, gathering_layout and keepsake_photo, which are already saved (main.gd:12081-12084). Cutting it removes the 4096-envelope and 8192-import questions from [P11] for this slice.
2. [P9] The keepsake-easel visual change. The creator has just shipped the large Shared Panel editor (commit 0e8bbdf). The easel is gated on a photo that many players skip (skip_keepsake_photo, main.gd:9125). Many players will never see it.
3. [P7] "Ready-vs-back-home arrangements" as two authored states for all three items. A "ready" state for the table and speaker would duplicate the persistent props (MUST-FIX 1). Author only the returned state, and only for gear that doesn't duplicate a live prop.
4. [P3]/[P11] Restating version, fingerprint and hash constants inside an ideation brief adds no design signal. Move them to a constraints appendix the implementer reads; it doesn't belong in the creative prompt.
