# Tenderloin Redux

Status: pre-build concept, 2026-10-18 (America/Los_Angeles). No playable game exists yet.

## 1. Purpose

A peaceful neighborhood adventure on an accurate map of San Francisco's Tenderloin. Players work alongside residents and the organizations already helping the area, make shared spaces more useful and beautiful, and discover the neighborhood's living culture.

The creator explicitly intends this as a constructive response to the Tenderloin shooter: video games can inspire care, creativity, and greatness. Keep that motivation in the project history. The player-facing experience should stand on its own through enjoyable choices, human relationships, art, and music.

## 2. Requirements from the creator

- No player violence or combat.
- Geographically accurate real streets, intersections, landmarks, and district boundaries. Art can be stylized. Accuracy must be checked, not assumed from a map provider.
- Help existing residents and real nonprofits; neighborhood improvement should support people staying and thriving.
- Litter cleanup, tending public spaces, and covering actual vandalism with original hip-hop-influenced community art where permission exists. Preserve existing community art.
- Real festivals, local music legends, and sourced history; distinguish historical places and dates from the present-day world.
- Original muted-trumpet jazz, upright bass, brushes, piano, and optional hip-hop rhythms. New compositions and recordings; no copied Miles Davis recording, melody, or solo.
- Occasional political events, tenant organizing, peaceful demonstrations, and movie shoots with practical effects on neighborhood life.
- A lively Transgender District, including verified pride streetscape features, residents, businesses, history, public art, and community events.
- Reuse TenderVoice if a suitable open-source license and usable source can be established. This is conditional, not a claim that it is open source.

## 3. Core experience

Explore -> meet a neighbor -> choose a shared project -> do a satisfying hands-on activity -> see a useful change -> return to relationships and places that remember the contribution.

The player is one participant in an existing community. Residents have skills, projects, humor, disagreements, routines, and agency. They can decline help. Characters are not symptoms, obstacles, or points to harvest.

Design activities with choices: which supply route keeps a doorway accessible, how to arrange a gathering, how colors and lettering form a mural, and how to share a limited work session between neighbors' requests. Avoid making the whole game a sequence of identical fetch tasks.

Progress measures completed shared projects, useful spaces, discovered stories, and continuing relationships. Do not reward displacement, rising rents, removing homeless people, or judging a resident's worth. Avoid a universal moral score or a claim that chores solve structural poverty.

## 4. First playable proposal

Build a small, accurately mapped area around Turk and Taylor, with final bounds selected only after map and walking-route verification. Begin with a 10-15 minute session, a handful of fictional residents, one small cleanup activity, one original mural activity, and one gathering. Real organizations outside those bounds remain accurately located in the directory; do not move them for convenience.

Working mission: Get the Block Ready. A resident-led gathering needs a clear accessible route, supplies, seating, and an original collaborative artwork. Neighbors contribute different skills. Tasks can be rearranged and revisited; avoid a crisis countdown. The gathering completes a playable arc, while the space and relationships retain the results.

Finish with a musical change assembled from original stems: bass, brushes, piano, and trumpet enter as the shared event takes shape. This is a design proposal, not existing audio or implementation.

Full-neighborhood expansion, multiple festivals, detailed nonprofit activities, political events, and film productions remain part of the larger concept. Their representative systems can arrive after the first playable proves enjoyable.

## 5. Neighborhood Voices: conditional TenderVoice connection

TenderVoice (2010) connected real Tenderloin organizations, mapped locations, and recorded explanations of their work. A contemporary report describes matching short voice clips to agencies on a map. See TENDERVOICE_REUSE_RESEARCH.md.

Proposed original feature: Neighborhood Voices. A map/journal helps players discover organizations, read sourced summaries, and optionally hear newly consented or appropriately licensed recordings. An optional matching activity teaches who does what; the directory remains directly accessible without solving a game.

Never present fictional dialogue or synthetic staff voices as actual interviews. Use text-first entries until recordings and permissions exist. State that the game is not a current emergency-services directory; link to official organizations for current information rather than inventing availability.

Original TenderVoice code, interviews, photos, and other media must not be imported until each relevant right is established. If no source/license is found, implement our own feature from documented high-level ideas with original code and assets. Do not claim affiliation or an official continuation.

## 6. Cultural and geographic grounding

Maintain a content register: stable ID, present/historical date, exact location and source, original summary, verification date, and media permission status. Historical facts are not a license for a source's prose, photographs, artwork, or recordings.

Candidate references include the Black Hawk site at Turk and Hyde, Hyde Street Studios, Tenderloin Museum programming, the documented Blackhawk Block Party of 2022, real nonprofit services, and the Transgender District. These are research leads, not partnerships or promised licensed material.

Existing crosswalks, banners, murals, and signage require current reference checks. Player-created improvements must be clearly distinct from claims about the real street. Do not imply that the player can unilaterally repaint public traffic markings or another artist's mural.

For political events, include practical organizing and disagreement through fictional characters. Do not manufacture a real organization's political position. For movie shoots, begin with a fictional production and original promotional art; factual historic shoot locations can be added after verification.

## 7. Rights and community participation

Use original or explicitly licensed assets. Track code, music compositions, recordings, photos, art, map data, logos, voices, and likenesses separately. The repository's MIT license does not grant rights in third-party material. Attribution is not a substitute for a license.

Use documented facts and original writing for historical entries. Real performers' reenacted appearances, branded partnerships, and copied artwork require separate review. Keep original dialogue with fictional residents; historical entries identify their sources.

Seek compensated local creative and resident feedback when resources permit. No claimed endorsement, partnership, or representation of a real staff member without evidence. No contact has been made on the creator's behalf.

## 8. Proposed technical approach for review

There is no application code to inherit: the starting repository contains README.md and LICENSE only (HEAD e626a046f0dcb861b55b2b9881e3d8fcf8d6c0c4).

An initial candidate is a browser-based, single-player 2D or 2.5D game using a small local content bundle and no accounts or backend. Select the rendering library only after checking current documentation and the first scene's needs. Geography should use projected real coordinates rather than a pretend street layout. Use fictional interior layouts unless surveyed and cleared.

Keep location/content data separate from interaction state, dialogue, project progress, and audio playback. Use stable IDs for saves and journal entries. Begin with keyboard and pointer input, text transcripts, adjustable sound, and reduced-motion support. Do not require audio to understand or complete a task.

A prospective map source is OpenStreetMap, with its ODbL/attribution and derived-database obligations assessed before distribution. Do not copy Google Maps tiles or Street View imagery into assets. Provider terms, attribution, and exact data provenance remain build checks.

## 9. Evidence and acceptance before describing it as playable

- Ground the small map's streets, crossings, entrances, and route continuity; identify known approximations.
- A new player can explore, understand a neighbor's request, make a meaningful choice, complete the gathering, and see persistent results.
- Tasks work without sound; dialogue and controls remain legible at common browser sizes.
- Reload preserves progress; replay does not repeatedly award or duplicate a completed project.
- All shipped media and imported dependencies have provenance and license records.
- Label historical recreations, fictional scenes, unverified details, and organization information honestly.
- Observe play sessions for enjoyment and confusion. Do not claim the game improves attitudes or produces community impact without evidence.

## 10. Review request

Review the actual files. There is no hidden game implementation. Propose concrete, playful additions that fit the creator's requirements, then prioritize a small feasible first playable. Separate design judgments from factual claims. Do not invent a TenderVoice license, organization endorsement, geography, music right, budget, or demonstrated social impact.

The independent panel is Gemini 4 Argon (High) through Antigravity and Claude Opus 5.5 through Claude Code, with Codex as driver and final judge. Run the four-round Kibitz arc on this pre-build plan; do not implement the game or contact anyone. Only write the review file assigned by the runner. Source-ground new factual claims or mark them for verification.
