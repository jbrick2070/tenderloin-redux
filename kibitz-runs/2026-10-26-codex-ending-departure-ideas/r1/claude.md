TOOL CHECK: PASS. Read input.md, godot/habitat_room.gd, godot/helper_bench.gd, godot/hosted_afternoon.gd, godot/bea_invitation.gd (1-30), godot/film_screening.gd (115-134), godot/civic_listening.gd (grep), godot/main.gd (grep plus 9870-9889 and 12520-12539), docs/BIG_ENDING_PLAN.md, docs/ENDING_HABITAT_BRIEF.md:19 (grep). No diagnostics run. No files other than this one written.

VERDICT: yes-with-fixes. The constraints are well grounded, but the brief never says what departs or which residents count. It asks for a "challenge" while ruling out every way to fail. Candidates 1 and 3 add a third copy of the existing put-N-things-in-slots mechanic. Fix those and one coherent slice inside the existing HabitatRoom is feasible.

MUST-FIX BEFORE BUILD

1. [Player outcome] + docs/BIG_ENDING_PLAN.md:7 vs godot/habitat_room.gd:189. The fiction of what departs contradicts itself, and the brief does not resolve it.
   - BIG_ENDING_PLAN:7 says "The neighborhood goes to space together".
   - The shipped room text says "Copies travel in our imagination; originals, borrowed things and home stay on the block". Thanh's own framing is "a shared room we imagine visiting together" (habitat_room.gd:179).
   - Candidate 1 says "reveal the imagined journey". The brief also asks for a "clearly fictional departure reveal".
   - Nothing says whether the residents leave, the copies leave, or the neighbors picture a trip in-fiction. This decides the departure composition, every resident line, the later orbital and return stages, and whether a "return journey" is even meaningful.
   - FIX: add one sentence to the brief, e.g. "In-fiction, the residents imagine travelling together aboard the room of copies; the block, originals and home stay. The departure composition is that shared imagining." Every candidate must then use that framing, and BIG_ENDING_PLAN:7 should be made consistent with it.

2. [Player outcome] "each resident contributes visibly". The brief never names the cast, and the source suggests the omission is silent.
   - Hosted contributions have four owners: Bea, Dez, Celeste, Thanh (hosted_afternoon.gd:4). civic_listening.gd:5 also has four speakers.
   - The habitat only validates and voices art, pause and beats plus film and civic (habitat_room.gd:69-74). Only Thanh, Celeste and Dez speak (habitat_room.gd:186). Bea's copied "stories" choice is never read in the habitat.
   - Candidate 1's "three distinct resident-contributed pieces" would leave Bea out a second time.
   - FIX: name the four residents and each one's source-backed contribution:
     - Celeste: copied art palette and tiles.
     - Dez: film order and framing, plus rhythm.
     - Thanh: seats (pause) and the Listening Hour format.
     - Bea: copied invitation title only, via COPIES.copied(game,"stories"), with no personal story.
   - Do NOT add "stories" to the habitat_room.copies() gate. That would newly lock out players for whom the room opens today. Gate only the new mode.
   - verify: whether is_hosting_done() (main.gd:9877-9878) guarantees a valid "stories" value after an odd import.

3. [Player outcome] "one meaningful cooperative assembly challenge" vs "No countdown, dexterity pressure, score". Together with the no-punishment requirement in candidate 2, this leaves no fail state. Any "challenge" is therefore a gentle constraint you can try exhaustively. The brief must say that, or it will judge every option against a bar that cannot be met.
   - FIX: replace "challenge" with something checkable. "One spatial decision governed by a stated rule. The correct result depends on the player's own earlier arrangement and differs visibly between arrangements. A misfit is explained by the resident who owns the piece and costs nothing."
   - Also state the cooperation claim: "pieces from different residents only complete the figure together". Do not claim a challenge the design does not have.

4. [Candidates 1 and 3] Both repeat the slot-assignment mechanic the player has already done twice.
   - Candidate 1 (pick a piece, choose a compatible place/orientation, the author responds) has the same grammar as the habitat: choose item, choose place, Ask helper (habitat_room.gd:130-158). It also repeats the bench's fit-two-supports-then-confirm loop (helper_bench.gd:124-133). Its "orientation" step adds a rotate control to a tray that already has 10 buttons (habitat_room.gd:47-54). At 667x390 the side layout gives the tray 280px of width in 390px of height (habitat_room.gd:255-258), so a fourth row of 44px buttons will overflow or squeeze the reader.
   - Candidate 3's "common emblem" has no source anchor. Nothing in the copied data defines endpoints or an emblem, so the matching rule would be arbitrary. It is also the candidate most likely to drift into glowing effects.
   - FIX: reject candidate 1. Use candidate 3 only for the assembled-silhouette output, not as a second stage. Build on candidate 2 (see item 5).

5. [Candidate 2 + "Return 2-3 options"] Recommended bounded slice. It is the smallest change that closes items 1-4, and every part is anchored in source.
   - Why candidate 2. The only player-authored variable in the accepted room is which of the four places stays open. assigned.size() is 3 at completion (habitat_room.gd:153). The room already gives that choice meaning: "Leave a place open for someone else" (:179), "You left the %s open" (:186), and the title "A room for one more" (:39). Bea's authored "future" invitation also says "We could leave a few blank for people who come later" (bea_invitation.gd:6).
   - Spatial rule: "Each resident's link sits on the side of the open place that faces their copy." SPOTS (habitat_room.gd:8) form a 2x2 grid of 256x190 places (:231), so the open place always has three distinct neighbors:
     - one across the passage, through the 32px gutters between x298 and x330, and between x390 and x422;
     - one stacked, through the 38px gutter between y220 and y258;
     - one diagonal, at the inner corner.
   - Link pieces:
     - Celeste: a strip with 6 notches in her copied palette.
     - Dez: a 3-cell film strip ending on the copied final shot.
     - Thanh: a curved (arc) or paired joint, chosen by the copied pause.
     - Each draws only in a gutter, so the clear passage at x330-390 (habitat_room.gd:228) is never covered.
     - Which side each link belongs on is determined by the player's own arrangement. There are 12 combinations: 4 open places x 3 assignments.
   - Misfit: nothing is placed. The owner says which copy their link should face, e.g. "Celeste: Mine faces our six shapes by the far wall." Focus stays put. Nothing is counted.
   - Bea: once all three links fit, Bea's copied invitation title becomes a folded-paper keystone inside the open place. It reuses PAPER_COLORS (bea_invitation.gd:10) and shows no story text. This is the narrative surprise: the place the player left open is the one the neighborhood keeps for whoever comes next. Present it as a story beat, not a claim of novelty.
   - Scenes:
     - Initial: the welcomed room with an empty dashed frame around the open place.
     - Partial: 1-2 links fitted, each with its own shape and a text label.
     - Assembled: three links plus Bea's keystone.
     - Readied: a single "Ready together" action. Four resident lines quote their copied values (hosted_afternoon.detail replies can be adapted), and the helper glyph parks inside the open frame.
     - Departure: "Depart" swaps to ONE still composition. It shows the room's silhouette, whose open corner varies with the arrangement, on a dark field. Optional marks come from the copied beats bits; zero rhythm gives no marks, which keeps listening-only literal. The caption states it is imagined and that orbit and return are not built.
     - Buttons: "Back to room" and "Keep exploring". No Explore button.
   - Ownership: this is a mode inside the existing HabitatRoom Control, not a new modal owner. Relabel the existing 3 item buttons and 4 place buttons. The assist button is already disabled once complete (habitat_room.gd:195-196), so it is free to become "Prepare together", then "Ready together", then "Depart". Zero new rows.
   - Invalidation: the existing carry path already clears `complete` (habitat_room.gd:152). Clear links, ready and departed on the same line, and announce "Links come off when copies move." This invalidates rather than snapshots, matching the existing rule.
   - Visit lifetime:
     - Keep/Escape preserves the state for this visit, like today (habitat_room.gd:112).
     - reset_visit at main.gd:12532, 13036 and 13737 clears it.
     - Nothing is saved.
   - Alternatives to record as rejected: candidate 1 (see item 4); candidate 3 as a separate emblem stage (see item 4); a camera fly-by (see item 6).

6. [Grounded contracts, BIG_ENDING_PLAN:18] The plan asks for an "intentional camera sequence with a Skip control", while the brief bans changes to the street camera and notes there is no reduced-motion preference (brief, Grounded current contracts).
   - These are compatible only if the departure is an isolated still image. The brief leaves motion optional, which reopens a Skip/still equivalence requirement and a test matrix for no product gain.
   - FIX: decide now. The departure is one universally stable still composition with no motion. Skip then has nothing to skip, and there is no preference to invent. Captions are the reader text, since no new audio exists.
   - Record in BIG_ENDING_PLAN:18 that the camera sequence is replaced for this slice. Do not leave it as an open requirement.

7. [Export and preservation constraints] There is no budget split, even though the largest stage comes later.
   - The habitat checkpoint used 2051028-2033468 = 17560B (docs/ENDING_HABITAT_BRIEF.md:19 against the brief's current figure). Another 17.5KB stage would leave about 28.5KB for a walkable 3D orbital neighborhood plus return.
   - FIX: set a hard ceiling for this slice, e.g. <=10KB of production growth measured by a cheap export. Prefer adding to habitat_room.gd over a new script, which avoids new .gd/.uid overhead.
   - State the orbital stage's reserved floor explicitly. [ASSUMPTION] It needs the larger share.

SHOULD-FIX

1. [Entry] Readiness is three full-screen hops from the street: film viewer, then helper bench (film_screening.gd:125-128), then Habitat room (helper_bench.gd:89-95), then the new mode. This is acceptable because it adds no owner, but the brief should accept that depth explicitly and give one discoverability cue. For example, Thanh's completed-room line (habitat_room.gd:186) could name "Prepare together". Do not add a street-level entry, which would create a new owner.

2. [Copy honesty] Shipped strings will become false once departure exists:
   - habitat_room.gd:189: "Departure, orbit and return are still to come."
   - helper_bench.gd:145: "the journey is still to come".
   - habitat_room.gd:112, the close announcement.
   List them as required edits, e.g. "orbit and return are still to come". Have the acceptance tests assert the new text.

3. [Ready together vs Depart] There are now three deliberate confirmations in a row on the same button: Welcome Thanh, Ready together, Depart. That is the Next/Next risk the brief itself names. Each needs a distinct visible state change (see MUST-FIX 5: helper parks, then the composition swaps). If Ready cannot carry four value-specific resident lines plus a picture change, merge it into Depart. In that case, record that BIG_ENDING_PLAN:17's "deliberate Ready" is satisfied by Welcome plus Depart.

4. [Assumptions] Unstated hidden assumptions:
   - (a) Residents can be "visible" without portrait art. habitat_room.gd draws no resident figures, only the helper glyph at :239. verify: whether any 2D resident art exists. Otherwise represent residents by their pieces plus names in text.
   - (b) Visit-only departure is acceptable for a climax. The orbital stage (BIG_ENDING_PLAN:19, "Completion grants recognition") will inherit visit-only entry or force the persistence design. State which stage owns that decision.
   - (c) The brief's "helper_bench.open_room89-96" is actually helper_bench.open_habitat at helper_bench.gd:89-95. Fix the name so implementers do not hunt for a non-existent function.
   - (d) The reset-site list should explicitly include reset_mural_state_to_defaults at main.gd:12531-12533, alongside 13036 and 13737.

5. [Accessibility symbolism, candidate 2 risk] Name the piece "open place frame" or "links", never threshold, ramp, door or access. This keeps it clear of the "surveyed access/certification" implication the brief warns about. The room already disclaims "not ... certified access plan" (habitat_room.gd:189); reuse that line.

6. [Prior art] The three references cover building and travel. None covers the mechanic now being selected: narrative object placement whose meaning comes from the player's own home arrangement. [ASSUMPTION, URL not checked this pass] Witch Beam's Unpacking (2021) is a closer precedent for "arrange belongings so the place tells who lives there". Add it as a comparison only, with no novelty claim. BIG_ENDING_PLAN:34 also asks for community-led robotics prior art, which none of the listed sources addresses. Either say it is out of scope (the helper is closed) or cite one source.

7. [Acceptance 3] "Three NEW GENUINE journeys" should each exercise a different open place and relation set. For example: open Entry with seats=arc; open Window with seats=pair; open Far wall with zero rhythm. That way the three runs test the arrangement-derived rule rather than repeat one path. One of them must include a real rearrangement that clears links, plus a reload. Rebuild the room via actual input after habitat-room-browser.mjs:115, per the brief.

OPTIONAL / NICE-TO-HAVE
- Departure composition marks: if the copied rhythm has marks, draw the marked slots as the 8-slot band from habitat_room.gd:237, shown silently. Do not invent a starfield. That reuses an existing renderer and keeps zero rhythm literal.
- Use Thanh's civic format (circle or table, habitat_room.gd:211) as the shape of the silhouette's center gathering in the departure image. This makes the Listening Hour choice recognizable at no extra UI cost.
- Keep the texture cache at 4 entries (habitat_room.gd:245). Before adding states, check that the departure key does not thrash it. verify: cost of SVG rasterization on phone at 720x480.

CUT THESE
1. The optional departure motion and any Skip control (see MUST-FIX 6). With a still composition, Skip/still equivalence holds by construction, so cutting it is safe. It also removes the need to invent a reduced-motion preference.
2. Candidate 1's orientation/rotation step. It is a new control in an already full tray (habitat_room.gd:47-54) and adds no cooperative meaning. Cutting it is safe because the facing rule already supplies the spatial decision.
3. Candidate 3's separate emblem-matching stage. It has no source-backed data to match, and its only valuable part, the assembled silhouette, survives as the departure image.
4. Any new modal owner, scene or script for readiness. HabitatRoom already owns the full-screen layer, the sibling-visibility save, held-key release and focus ring (habitat_room.gd:89-112, :197-200). Reusing it avoids the "two modal owners" risk the brief lists and saves export bytes.
5. "Captions" as a separate system for this slice. There is no new audio (brief, Grounded contracts BIG_ENDING_PLAN 3/4 bullet), so the reader text plus accessibility_name (habitat_room.gd:190) is the caption. Building a caption track would serve nothing.
