TOOL CHECK: PASS. Read godot/power_story.gd (614 lines), the godot/main.gd hook sites, civic_listening.gd, docs/EPISODE_LOCATION_RESEARCH.md, docs/ROADMAP.md, tests/godot-browser.mjs, and the r1 driver_anchor.md/scope_receipt.md.

Section ids: input.md has no headings, so I cite its paragraphs. [P1]=line 1 title, [P2]=line 3 process, [P3]=line 5 goal/sources, [P4]=line 7 alternatives, [P5]=line 9 access/invariants. [ANCHOR]=r1/driver_anchor.md.

VERDICT: yes-with-fixes. The constraints are sound and grounded in the real code. But the access mechanism suggested in [P5] (reusing the inactive End slot) is a one-time hack applied to a four-episode problem. Option (a) in [P4] is structurally a reskin of Lights Back On unless the clues actually decide where the player walks. Neither point is resolved yet.

MUST-FIX BEFORE BUILD:

1. [P5] Reusing the inactive End slot for the dog entry is incoherent and does not scale.
   - Where the slot is: power_story.gd:124 builds actions[3] "End\nstory". power_story.gd:512 disables it only while inactive.
   - Semantic hazard: one button means "End the Power story" while active and "start a dog story" while inactive. end_session() (power_story.gd:299-306) sets active=false and calls refresh() while the button is still under the pointer or finger. A double-click or double-tap on End story would therefore end the power story and then open the dog story with the second press.
   - Wrong home: the dog episode would sit under a button labelled "Power", whose tooltip reads "Lights Back On: optional power story (F8)" (power_story.gd:127-130). Inside, the header is "Lights Back On"/"Larkin 2017" and the credit is "Fictional event kit" (power_story.gd:472-474). A missing-dogs episode is not discoverable there.
   - It doesn't scale: ROADMAP.md:71 queues three more creator episodes (cooking contest, mayoral election, Halloween parade). Each would face the same 264px wall. The End-slot trick works once.
   - Fix: decide the gateway now, for all four episodes. Smallest coherent change:
     - Keep the single existing nav sibling (still six, so the civic_listening.gd:257-260 width math still holds). Relabel it as an episode or story gateway, with an honest tooltip.
     - Turn the Power tray's inactive case selector into the episode selector. Its tabs already act as one: "Festival / Larkin 2017 / Place map" at power_story.gd:503-505, with Place map disabled for Festival at :504.
     - The tray is not in block_page_nav, so the 264px nav constraint in [P5] does not apply to it. verify: four 44px tabs fit the narrowest tray (308px at a 320px viewport per power_story.gd:531,536).
     - Never repurpose actions[3].

2. [P4](a) The search has no source of agency. As written, (a) repeats the Lights Back On skeleton (power_story.gd:337-361, 387-404): walk to three goals with a button that already knows the destination, do a small task, then celebrate at the gathering. ROADMAP.md:22 explicitly says "avoid fetch-task repetition".
   - If the dog story's walk button routes to the dog's known location, as walk_to_relay() does with relay_goal(station), there is no search.
   - Fix: require that the player picks the destination from clue evidence, choosing among existing safe stands that include non-dog decoys. A wrong pick should show gentle feedback ("no one here matches the brindle coat"), not a penalty.
   - State as an acceptance criterion: no control routes directly to a dog's hidden location before the matching clue is confirmed.

3. [P3]/[P4] Dog ownership is undefined, and that affects the whole story.
   - [P4] says "resident collar/coat clues" and "reunion at gathering". [ANCHOR] forbids "NPC duplication or named-anchor move". The plan never says whose dogs these are.
   - If the owners are existing named residents (Bea, Celeste, Rook, Dez, Thanh), this rewrites canon. None of them has ever mentioned a dog: the only dog references in godot/main.gd are the rooftop dog-park geometry at :3707-3755.
   - If the owners are new fictional neighbors, that is new NPC geometry and dialogue the plan doesn't budget for.
   - Fix: state the owners explicitly. Either two new original owner figures (reusing make_person_node, main.gd:3363) placed at the gathering, or existing residents with a one-line canon justification such as "minding a friend's dog". Make the reunion target concrete.

4. [P5] The cost of a second episode in main.gd is a hidden assumption.
   - Power is wired into main.gd at about 25 sites:
     - cancel_intent() at 6415, 8034, 8132, 8184, 8226, 8268, 8515, 13543, 14396, 14458, 14516
     - close/reset at 12186, 12672, 13233
     - blocked_route at 13473
     - walk-control resume label and action at 13566-13574
     - lighting at 4904-4908
     - objective at 6062
     - focused-activity lists at 7480, 11768, 11847
     - Escape handling at 14097-14101
     - F8 at 14144
   - The input says "Preserve ... Stop, generation-safe arrival", but it never says whether the dog episode duplicates every hook, becomes a mode inside power_story.gd, or adds a shared active-episode indirection.
   - Fix: decide one of these before build and list every hook site in the implementation brief.
   - Recommendation: a separate dog_story.gd module with explicitly duplicated hooks for this round. Don't generalize Power yet; that risks the shipped Festival/Larkin cases.
   - Don't make it a mode of power_story.gd. Pads, relay tabs, connected() and diagram() are meaningless for dogs, and the file would become a god object.

5. [P5] Mutual exclusion is missing from the doc under review. [ANCHOR] line 9 states it, but input.md does not.
   - current_objective() returns power_story.objective() whenever power_story.active is true (main.gd:6062).
   - The walk control relabels itself "Power Story" while Power is active (main.gd:13566-13568).
   - Power stays active after Back (power_story.gd:277).
   - Fix: add to [P5]: the dog Begin control is disabled, with stated copy, while power_story.active is true, and the reverse. Exactly one module owns the objective, the walk-control resume and the route intent at any time. Cover the "active but closed" state as well as the "visible" state.

6. [P3] The source doc and the brief contradict each other on the real service's role.
   - EPISODE_LOCATION_RESEARCH.md:9 proposes "A clearly simulated report or referral can connect neighborhood clues with the real service."
   - [P3] forbids "outbound reports" and "imply a partnership".
   - Even a simulated SFACC report models a real agency's intake workflow inside fiction and invites the partnership reading.
   - Fix: cut the simulated report and referral. The real-service reference should be a dated, clearly separated information card only. Example content: SFACC, 1419 Bryant, outside the Tenderloin, retrieved 2026-10-22, with the source page linked. Label it like Larkin's "historical sources, not current outage guidance" (power_story.gd:469), here as "check the official page; not current guidance". Unlike Larkin, this is present-day actionable advice, so a currentness disclaimer is mandatory.

7. [P3]/[P4] Coat and collar clues are visual and colour-coded by nature. Colour-only matching fails colour-blind and screen-reader players. The precedent is that the Power reader text carries every clue (power_story.gd:478).
   - Fix: every clue must be encoded at least twice, in text and in a non-colour attribute (pattern, ear shape, size, tag shape). The visible dog must also be named in the reader and the a11y status.
   - Acceptance: completion is possible from the reader text alone.

SHOULD-FIX:

1. [P3] The creator asked for "real animal-service locations where appropriate". The brief concludes none are in reach, which is correct per EPISODE_LOCATION_RESEARCH.md:15. Say this to the creator plainly as an unmet part of the request, with the deferred option "sourced geography expansion to Bryant/Alameda is a separate round". Don't let a remote card read as fulfilling it.

2. [P3] The plan omits an existing in-world dog landmark: the creator-reported "Rooftop dog park & fire pit" at 145 Leavenworth (main.gd:3707-3755, label at :3755). It is a private residential roof, stylized, and not walkable. Fix: say explicitly that no dog is hidden at, sighted on or routed to it. At most a resident line may mention it, without implying real residents' pets.

3. [P4] "Tangible dog models" assumes primitive-mesh dogs are readable at the default isometric zoom. There is no dog builder: make_person_node (main.gd:3363) is the only character builder. A dog of about 0.5m next to 1.75m people may be a few pixels tall.
   - Fix: make projected on-screen size (unproject corners, as power_story.gd:569-576 does) an acceptance measurement at 320/390/1440.
   - Don't rely on a camera move: manual camera ownership is preserved.

4. [P5] Tests address Power controls by position: pads+tabs+actions, where buttons[7]=Begin, [8]=Walk, [9]=Check, [10]=End and [12]=Back (tests/godot-browser.mjs:1174-1305; snapshot order at power_story.gd:565). Adding a tab shifts every action index. State this cost, and either append new controls after the existing 13 in the snapshot or update indices deliberately. Don't let a silent index shift make an old assertion tap the wrong control.

5. [P5] Visit-only progress means the reunion world consequence vanishes on reload. That is acceptable under the Lights Back On precedent (ROADMAP.md:67), but the end copy must say so, as Power's does at power_story.gd:476 and :480. Otherwise "visible world consequence" over-promises.

6. [P4] "Real walking to safe existing stands" doesn't name the stands. verify: which existing walkable goals are used. The Power relay goals come from street_lamp_points[0..2] (power_story.gd:160), and the mural and speaker stand points from main.gd:8768 and :8802. If the dog story reuses the Power lamp goals, the two episodes become spatially indistinguishable. Pick distinct existing points.

OPTIONAL / NICE-TO-HAVE:
- A short owner-voiced reunion line per dog, plus the dog staying visible beside its owner at the gathering until End, mirroring Power's lit-lantern payoff.
- One cost-free kindness beat, such as a water bowl at a stand, as non-punitive flavor. Not a new required step.

CUT THESE:

1. [P4](b) "illustrated clue-board/search scene". The creator already said "avoid another worksheet", and a clue-board scene is one. Comparing it costs report space without a live option. Reduce it to a one-line rejection, or fold its useful part (a readable clue list) into the tray reader of (a).

2. [P5] "optional F9 shortcut". If the gateway is the existing Power/F8 entry (must-fix 1), F9 is redundant and starts a per-episode F-key ladder: F2-F8 are already taken (main.gd:14144-14157), and three more episodes are queued. F-keys are also unavailable on most touch and compact keyboards. Cut it, or defer it to the gateway design.

3. [P3]/research line 9: any "simulated report/referral" mechanic (see must-fix 6). Safe to cut because the information card already satisfies "real service reference".

4. SPCA (250 Florida) and Muttville (750 Florida) references in the dog episode. Both are adoption/rescue organizations, not lost-pet intake (EPISODE_LOCATION_RESEARCH.md:10-11). Naming them in a missing-dog story invites a role error. Keep SFACC alone. Muttville's documented relevance is the costume-parade precedent, which belongs to the Halloween episode (research :30).

[ASSUMPTION] I treated input.md as the plan under review, with [ANCHOR] as context. Several of its constraints (mutual exclusion, no named-anchor move) appear only in the anchor, and I flagged where the reviewed doc omits them. I did not verify human readability of the dog models, the physical-phone feel or the current SFACC process; all are unverifiable here, as [ANCHOR] line 13 states.
