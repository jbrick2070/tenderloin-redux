TOOL CHECK: PASS -- read README.md, LICENSE, docs/CONCEPT.md, docs/SOURCES.md, docs/TENDERVOICE_REUSE_RESEARCH.md, and this run's driver_anchor.md. `git rev-parse HEAD` = e626a046f0dcb861b55b2b9881e3d8fcf8d6c0c4. docs/CONCEPT.md and r1/input.md have the same SHA-256 (69ABF4C5...0DF6B), so this review covers docs/CONCEPT.md.

VERDICT: no. The values and guardrails hold together. But the first playable (§4) has a core-loop contradiction (choice vs. no pressure). It never says who the player is or how hardship appears on screen. And the chosen location (Turk/Taylor) doesn't match the cultural references listed (§6). All three are decisions you can't change cheaply after the first scene is built.

MUST-FIX BEFORE BUILD

1. [§3 vs §4] The core loop contradicts itself. §3 lists "how to share a limited work session between neighbors' requests" as a key choice, which needs scarcity. §4 says "Tasks can be rearranged and revisited; avoid a crisis countdown," which removes scarcity. If everything can be redone with no limit, nothing is a trade-off. Then §9's "make a meaningful choice" can't be tested, and the slice turns into the fetch sequence §3 says to avoid.
   Fix: name ONE non-punitive constraint in §4 that shapes the result without a fail state. Examples: the gathering's single layout (where seating goes changes who can attend and which doorway stays clear); a fixed wall area or palette where each neighbor's motif competes for space. State the visible consequence that §9 will check, e.g. "the finale shows which contributions made it in, and who comments on it."

2. [§3, §1, §2 "Help existing residents"] The player's identity and role are never defined. §3 says "one participant in an existing community" but doesn't say whether the player is a resident (SRO tenant, worker), a volunteer, or a newcomer. This one choice decides whether the arc reads as solidarity or as an outsider fixing a "broken" neighborhood. That outsider story is exactly what §3 ("Characters are not symptoms") and the anti-displacement line in §2 are trying to prevent. It also decides how a resident can believably "decline help" (§3).
   Fix: add one paragraph to §3 fixing the player's role. My recommendation: an existing resident with ties to the area. Also add the framing that the gathering was resident-started before the player showed up.

3. [§3, §4, §2 "Litter cleanup"] There's no rule for what "litter" means, and the first playable puts cleanup at Turk and Taylor. That is the activity and place where §3's ban on rewarding "removing homeless people" is most likely to be broken by accident. Nothing says whether a cart, bedroll, tent or bag can ever be "cleaned," or whether unhoused people are participants or scenery.
   Fix: add a §3/§4 rule. Cleanup targets are chosen by neighbors (including unhoused characters). Personal belongings and occupied spaces can never be interacted with as trash. At least one unhoused resident is a full participant in Get the Block Ready.

4. [§1, §3, §6] There's no policy for how hardship is shown on screen. The concept wants an "accurate map" of the Tenderloin and claims it won't pretend "chores solve structural poverty" (§3). But it never says whether drug use, overdose response, police, encampments or open-air markets appear at all, or how. Leaving them out entirely makes the accuracy claim ring hollow. Showing them carelessly undoes §3. A writer or artist will make this call ad hoc in the first scene unless the doc makes it first.
   Fix: add a short "Representation and tone" subsection to §6. Say what is shown, what is implied, and what is left out, and how residents talk about it. No mechanic may "solve" a structural condition.

5. [§4 vs §6] The location and the content don't match. §4 anchors the slice at Turk and Taylor. Yet §6's first listed reference, the Black Hawk site, is at Turk and Hyde (docs/SOURCES.md line 24). That's several blocks west and probably outside a 10-15 minute slice. Meanwhile the concept never mentions the most important landmark AT Turk and Taylor: the site of the 1966 Compton's Cafeteria uprising, central to the Transgender District that §2 requires. [ASSUMPTION -- a well-known historical fact, but not in docs/SOURCES.md; verify: transgenderdistrictsf.com history page, docs/SOURCES.md line 21.] So the slice is either in the wrong place for its references, or it's missing its own anchor.
   Fix: in §4, state which cultural anchor or anchors the slice actually contains, and add the Compton's site to §6 as a lead pending verification. Or move the slice's bounds toward the references you plan to use. Either way, §4 and §6 should name the same place.

6. [§2 "help real nonprofits" vs §4/§6/§7] The real-nonprofit goal has no in-game method. §2 asks to help real nonprofits. §6 bans making up a real organization's positions. §7 bans implied partnership or showing real staff. §4 uses only fictional residents. So in the game, real organizations can only appear in a directory. But §4 also defers "detailed nonprofit activities," which suggests gameplay with real organizations later, and the doc's own rules make that nearly impossible without consent.
   Fix: decide now, in §2 or §7. Either (a) real organizations appear only in the factual directory layer, and gameplay uses fictional, clearly labeled community groups; or (b) gameplay with real organizations needs written consent, and the doc should say so. Also say honestly that the game's real-world "help" is limited to accurate discovery and link-outs, which matches §9's last bullet.

7. [§4 vs §5 vs §9] The doc can't decide whether the directory is in the first playable. §4 says organizations outside the bounds "remain accurately located in the directory," as if a directory ships. But §4's list of components (residents, cleanup, mural, gathering, music finale) leaves it out, and §9 has no acceptance criterion for it. §5 then spends a whole section on Neighborhood Voices.
   Fix: either add "text-only directory, N entries, each with a content-register ID and verification date" to §4 and a matching line to §9, or move it to post-slice and change §4's wording to "will remain."

SHOULD-FIX

1. [§2 murals, §6] Murals over "actual vandalism" on an "accurate map" means implying real buildings are vandalized and showing paint going on real property. §8 makes interiors fictional but says nothing about facades. Also, deciding which marks are "vandalism" and which are "community art" is a judgment about graffiti, itself part of hip-hop culture, which the art direction draws on.
   Fix: in §6, state which layers are real (street grid, intersections, landmark positions) and which are fictional (facades, mural walls, tags). In-game, a named wall-owner character decides what gets covered.

2. [§2, §6] The game has no fixed "present." Real murals, banners and businesses change, and docs/SOURCES.md line 23 already flags the June 2026 streetscape as needing re-checking. Without a fixed snapshot date, "accurate" slowly becomes false.
   Fix: give the content register (§6) a single "world snapshot date," and show "as of <date>" in game next to the historical/present labels.

3. [§1] "The Tenderloin shooter" is ambiguous. Most readers will take it as a real shooting. docs/SOURCES.md line 7 points to a video game, "Tenderloin Night Shift" (SF Chronicle, Oct 16 2026). Verify: the article's contents; it wasn't fetched in this review.
   Fix: name the game and cite SOURCES.md line 7 in §1.

4. [§2 music/art, §4 finale, §7] Who makes the assets is an unstated assumption. The finale (§4) needs original jazz stems, and the mural activity needs original hip-hop-influenced art. §7's compensated involvement is "when resources permit," and no composer, musician, artist or budget is named. [ASSUMPTION] The creator may be working mostly alone with AI tools. There's also no policy on generative-AI art, music or voice. §5 bans only synthetic *staff* voices, yet the doc keeps stressing "original" and "community" art.
   Fix: add an asset-origin line to §7: who makes music and art for the slice, and whether AI generation is allowed, banned, or allowed only as placeholder. Track it in the §9 provenance records.

5. [§9 bullet 1, §8] The map-accuracy bar assumes data the plan doesn't have. §9 requires grounding "entrances" and "route continuity" for an accessible route. OSM detail for entrances and curb ramps is often incomplete [ASSUMPTION; verify per block]. §8 forbids copying Street View into assets but doesn't say whether it can be a visual reference, and nobody is assigned to walk the route.
   Fix: state the verification method in §8/§9: OSM plus an on-site walk, or OSM plus a reference-only imagery policy. List the known approximations as a deliverable.

6. [§8] "2D or 2.5D" with projected real coordinates leaves the biggest pipeline cost undecided. 2.5D/isometric from real geometry is much more work than top-down 2D.
   Fix: commit to top-down or flat 2D for the slice. Revisit only after §9 passes.

7. [§8, §5] The plan's own records aren't under version control. `git ls-files` shows only LICENSE and README.md; docs/ and kibitz-runs/ are untracked. §8's "README.md and LICENSE only" is correct for HEAD, but CONCEPT.md, SOURCES.md and TENDERVOICE_REUSE_RESEARCH.md could be lost or drift without history. §1 also asks to keep the motivation "in the project history," and README.md is just a title.
   Fix: commit docs/ before build, and add a one-paragraph README. Also, §5's link to TENDERVOICE_REUSE_RESEARCH.md leaves out its docs/ path.

OPTIONAL / NICE-TO-HAVE

- [§4] After the gathering, give players a short free-roam epilogue so the "places remember" promise in §3 is felt, not just saved.
- [§3] Let one resident decline or redirect the player in the slice. Then "they can decline help" is shown in play, not just stated.
- [§10] The panel description is out of date for this run. It says Antigravity runs "Gemini 4 Argon (High)," but r1/agy_model_selected.txt reads "Claude Opus 5.5 (High)." Correct it so the run's records are accurate.

CUT THESE (scope / over-engineering)

1. [§6 movie-shoot and political-event paragraph] Cut the design detail now and keep one line saying both are deferred. §4 already defers them, and this detail invites building event systems before the core loop is proven fun. The requirement itself stays in §2.
2. [§5 optional matching activity] Cut from the first playable. It's a second game mode built on a directory that may not even ship (Must-fix 7). §5 already says the directory works without it.
3. [§5 recorded audio] Leave consented recordings out of the slice entirely, not just "until permissions exist." That removes a whole rights track (§7) from the first build at no cost to the core loop.
4. [§6 content register fields] For the slice, use a flat file, not a system: ID, real/fictional/historical flag, location, source, verified-on date, media status. Anything heavier is premature for about 10-15 minutes of content.
5. [§2 "Reuse TenderVoice"] Take this out of the build path for now. docs/TENDERVOICE_REUSE_RESEARCH.md line 7 records open-source status as UNVERIFIED, with no repo found (lines 21-23). Keep it as a background research task. Nothing in §4 depends on it, so it costs the build nothing.
