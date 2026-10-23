TOOL CHECK: PASS. Read input.md, docs/EPISODE_LOCATION_RESEARCH.md, godot/story_picker.gd, godot/power_place.gd, godot/data/power_place.json, plus targeted reads of godot/main.gd, godot/lantern_procession.gd, godot/power_story.gd, godot/dog_story.gd and godot/civic_listening.gd.

VERDICT: yes-with-fixes. The site research is honest. But the anchor's lead concept lands on two real sites the game already depicts under different addresses and other in-world identities (museum hub, park gate). Its "preparation/delivery/return" loop repeats Power Story's historical loop on the same Eddy corridor. It also invents an interaction at a real polling place that the "historical" bar cannot source.

MUST-FIX BEFORE BUILD

1. [Dated facts / Tentative opportunity] Cadillac's frontage is already taken by a different in-world identity, under a different address.
   - main.gd:672 puts MUSEUM_HUB_POS at (-293.5,0,-64.5). By the power_place.json Eddy endpoints, Taylor (-16.5,-103.7) and Larkin (-593.4,-10.1), that is about 6 m north of the Eddy centerline, on the Cadillac's north-side frontage. It is about 16 m west of the 380 Eddy EAS point at x=-277.9.
   - The building is labelled "Tenderloin Museum & Info Hub · 398 Eddy (Cadillac Hotel)" (main.gd:4203). It carries a tour stop (main.gd:5987) and a time portal whose 1907 era is about the Cadillac Hotel (main.gd:8474-8476).
   - The polling row says "Cadillac Hotel — Lobby, 380 Eddy St" (EPISODE_LOCATION_RESEARCH.md:42).
   - Problem: an exterior observation point near x≈-278 frames a "398 Eddy museum" label while the episode says "380 Eddy lobby". Players will read that as an error, or assume the museum hub was the polling room.
   - Fix: the spec must state how the episode reconciles 380 vs 398 Eddy. For example, a source card says "Cadillac Hotel (380 Eddy; the museum at 398 Eddy shares the building)", and the camera framing hides or does not target the museum hub. It must also require that the episode's goal point does not fall inside the museum hub's tap target, label or cutaway radius (main.gd:13771 uses 12 m). verify: the exact 380/398 relationship against a primary source before writing that card.

2. [Dated facts / "never pretend those are verified entrance locations"] Boeddeker has the same kind of conflict, and the game already has a stylized "Eddy St gate".
   - The in-world label and inspect text say "Boeddeker Park · 240 Eddy St" (main.gd:4539, 4557), and the outline is OSM way 33619301 (main.gd:184-186).
   - The polling row says "246 Eddy St … Meeting Room" (research:43).
   - main.gd:4417 says the park has an "Eddy St gate", and BOEDDEKER_PARK_ENTRANCE=(-126,-97.7) (main.gd:195). That is about 21 m west of the 246 Eddy EAS point at (-104.7,-105.3).
   - Problem: if the episode reuses BOEDDEKER_PARK_ENTRANCE, or any point near that gate, as the destination, it implicitly turns a stylized gate into the polling entrance. That is exactly what the anchor forbids.
   - Fix: forbid BOEDDEKER_PARK_ENTRANCE and the park-inspection framing (inspect_boeddeker path, main.gd:4545-4561) as the election destination. Choose an Eddy sidewalk point nearest the 246 Eddy EAS point and explain 240 vs 246 on screen. Do not trigger trigger_progress_cue("boeddeker_park") (main.gd:4555) from the episode: that would be a hidden award or progress side effect, which the MUST line bans.

3. [Tentative opportunity] "Hands-on cooperative preparation/delivery/return" at a real polling place is not sourced, and it is structurally Power Story again.
   - power_story.gd historical mode already does this: walk Eddy via the Taylor/Eddy junction to a real site, hand off an object outside it ("never entered", power_story.gd:504), then bring items back to the Turk gathering (power_story.gd:307, 364-369). Both Eddy polling sites sit on that same corridor (x=-277.9 and x=-104.7 lie between Taylor x=-16.5 and Larkin x=-593.4).
   - "Delivering" anything to a real polling place also asserts a real-world Election Day practice (who may bring what, and how near) that the research does not establish. [ASSUMPTION: California rules near polling places exist and are not covered in docs/; verify before any delivery depicts handing items over at a site.]
   - Fix: deliveries end at the fictional Turk gathering, never at a polling site. The polling sites are observe-only waypoints. Or drop delivery and pick a loop that is not Power Story's. See the recommended slice.

4. [Dated facts / "walk through the Oct3 published list"] The game must not present the four-row excerpt as "the list".
   - Research:55 says the retained file is a "four-row official polling excerpt", not the complete list. The full list has 501 polling places (research:51).
   - Glide (row 4) cannot be reached in-world (research:49).
   - Problem: dropping Glide quietly and showing three sites as "the polling places" overstates both completeness and nearness.
   - Fix: on-screen wording such as "three of the sites on the City's October 3, 2024 published list that are walkable from this block; Glide (330 Ellis) was also listed but is outside this map." Do not show the PollingSiteID or precinct columns as anything the player is "assigned".

5. [MUST: "bounded main/picker hooks"] The "bounded hooks" premise is false at today's code shape.
   - lantern_procession is referenced 40 times in main.gd, and so is dog_story. Each episode is hand-listed in:
     - active_story_episode (main.gd:11787)
     - is_focused_activity_visible (11801)
     - two visibility gates (7487, 11880)
     - objective dispatch (6065-6067)
     - blocked_route dispatch (13527-13529)
     - snapshot (11603-11606)
     - three reset blocks (12219-12228, 12712-12721, 13280-13289)
     - at least seven cancel_intent blocks (6420-6422, 8041-8043, 8141-8143, 8195-8197, 8239-8241, 8283-8285, 8532-8534)
   - story_picker.gd:91 hard-codes entries[0].disabled to lantern availability.
   - A fourth episode means about 40 more edits to main. Each missed site is a bug: Stop not cancelling, reload not resetting, or a stale snapshot.
   - Fix (smallest): before or with the episode, add a single `story_episodes` array in main. Make active_story_episode, the cancel, reset, blocked and visibility loops, and story_picker.refresh availability iterate over it. Then the election module needs only one registration line in main plus one picker entry. Otherwise, write down the duck-typed contract the module must meet: active, visible, traveling, open_story, close_story, cancel_intent, reset_session, blocked_route, objective, snapshot.

6. [Current source: "walks source-grounded Eddy via Taylor/Eddy retained junction"] The Eddy routing workaround is private to power_story.
   - power_story.walk_to_relay (power_story.gd:363-369) uses return_junction as a via leg so a collision replan "cannot discard the Taylor/Eddy approach". The anchor does not say the new module needs the same logic to reach Cadillac and Boeddeker from Turk.
   - Fix: require the new module to reuse that via-leg logic, ideally factored into one shared helper. Add acceptance coverage for the replan case: Stop mid-Eddy, then resume.

SHOULD-FIX

1. [Opening / MUST: "Historical"] The framing names the wrong event.
   - The research basis is ElectionAbbr=2024NOVGEN (research:38), the consolidated general election. Calling the episode a "mayoral election" walk hides that the same ballot carried federal and state contests. [ASSUMPTION: general knowledge that Nov 5, 2024 was the U.S. presidential general election.]
   - The nonpartisan constraints also remove every mayoral element, so nothing in the play is "mayoral".
   - Fix: title it "Election Day, November 5, 2024", with a one-line source note that this was the consolidated general election, which included the mayoral race. Do not promise mayoral content the design forbids.

2. [Concept gap] The anchor does not say what the player's role is.
   - Without voting, ballot simulation, persuasion, entering buildings or assignments, the player's purpose on Election Day is unstated, and the episode risks being a walk past three labels.
   - Fix: state one role in one sentence. For example, "a neighbor who helps the gathering make an original, neutral 'where it was' map of the listed sites near our block." Every phase must serve that role.

3. [Concept gap] There is overlap with the existing civic content.
   - civic_listening.gd:2 already runs an "existing fictional civic hour", with speakers Bea, Thanh, Celeste and Dez. The museum and tour stops already provide guided history visits (main.gd:5987-5988).
   - Fix: decide explicitly whether the election episode starts from or ends at the civic hour, or stays separate. Otherwise players get two civic features that do not refer to each other.

4. [Assumption surface] The anchor leaves these hidden assumptions unstated:
   - (a) Faithful Fools frontage on Hyde (-415.6,18.2) is walkable. It is about 57 m south of the Eddy centerline, so power_place.admits (power_place.gd:96) admits it only if legacy_bounds covers it. Dog Story's "Turk / Hyde" lead (dog_story.gd:5) and BLACKHAWK_POS (-424.5,0,62.5, main.gd:30) suggest the area is covered. verify: legacy_bounds contains a Hyde sidewalk point near z≈18, and min_street_distance there is ≤ 12 m (MAX_STREET_CORRIDOR_M, main.gd:17).
   - (b) Election Day time of day and lighting. Power Story forces its own lighting (main.gd:4907-4911). Say whether this episode does or leaves lighting alone.
   - (c) Frontage points need clearance from lamps, trees and neighbors, as lantern route_clear does (lantern_procession.gd:149-161). is_walkable_point alone does not do this.
   - (d) Mutual exclusion with Power Story, which uses the same Eddy corridor and the Larkin exterior. active_story_episode already prevents both from running at once, but the anchor should say it relies on that.

5. [Acceptance: "wrong-choice behavior"] "Wrong choice" has no defined meaning in a nonpartisan, no-score design.
   - Fix: define it concretely. For example, the player picks a site card whose address does not match the frontage they reached, and the episode gives a gentle correction while keeping the player's progress. Never frame a polling site as the "wrong" place to vote.

OPTIONAL / NICE-TO-HAVE. The input asks for 2–3 alternatives; here they are, with feasibility.

A. Recommended first slice: "Where Neighbors Voted, 2024".
   - Phases:
     - (0) At the Turk gathering, the player chooses an original neutral map style: two palettes and one icon set. No candidate or party imagery.
     - (1) The player walks to the Boeddeker Eddy frontage point (from MUST-FIX 2) and matches one of three address/date cards (240 park label vs 246 polling row vs a distractor such as 330 Ellis). A mismatch gives a gentle correction.
     - (2) The same at the Cadillac frontage, reconciling 380 vs 398 (MUST-FIX 1).
     - (3) Return to Turk. The gathering's board shows the finished original map, with a Glide "outside this map" note, the Oct 3 caveat and a pointer to current official information.
   - World payoff: an original map board at the gathering, plus a temporary visit-only marker at each frontage. Zero save, matching the lantern pattern (lantern_procession.gd:271-274).
   - Feasibility:
     - Two goals on the retained Eddy corridor, using power_story's via logic (MUST-FIX 6).
     - Lantern-style state: active, phase 0–3, one style int, a 2-bit visited mask.
     - Picker entry at story_picker.gd:33.
   - Prior art: a familiar fetch-and-match walking tour, the same family as Dog Story's clue leads and Power Story's relay walk. No novelty claim is warranted.

B. "Faithful Fools afternoon": one site, the shortest slice.
   - A Hyde-only walk to the Faithful frontage, plus an original paper "welcome to the block" banner made at the gathering.
   - Feasible only if SHOULD-FIX 4(a) is verified. It uses the legacy walk area, not Power Story's corridor, which helps originality.
   - It is weaker on "walk through the list": one site.

C. "Line-of-sight sketch walk".
   - The player stops at each of three frontages and sketches an original stylized facade into a notebook reader (lantern's 16px reader).
   - It is purely observational, which carries the lowest real-world risk.
   - Risk: the facade art must be original and must not imply interior or entrance knowledge.

CUT THESE

1. [Alternatives: "source-notebook exploration"] It duplicates the existing museum Time Portal and tour stops (main.gd:5987-5988, 8448-8476) and adds no hands-on payoff. Safe to cut because the history-reading path already exists.

2. [Alternatives: "fictional route-making and walking companion"] Lantern's crew only follows a straight 36 m line (lantern_procession.gd:33, 163-164, 330-333), and dog_story.gd:2 explicitly avoids "escort AI". A companion over multi-leg Eddy/Taylor routes would need new follower or path logic. Safe to cut because none of the stated goals require it.

3. [Tentative opportunity: "delivery"] Delivery to a polling site. See MUST-FIX 3. Cutting it removes the only unsourced real-world operational claim.

4. [Dated facts: Glide] Do not plan any extension of the northern map for Glide in this episode. A text note is enough, and the anchor already says "beyond current coherent north coverage".
