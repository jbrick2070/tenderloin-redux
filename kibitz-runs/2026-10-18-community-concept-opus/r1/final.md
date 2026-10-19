# Tenderloin Redux

Status: pre-build concept, 2026-10-18 (America/Los_Angeles). No playable game exists yet.

## 1. Purpose

A peaceful neighborhood adventure on an accurate map of San Francisco's Tenderloin. Players work alongside residents and the organizations already helping the area, make shared spaces more useful and beautiful, and discover the neighborhood's living culture.

The creator explicitly intends this as a constructive response to the video game Tenderloin Night Shift: video games can inspire care, creativity, and greatness. See the dated reporting in [the source register](SOURCES.md). Keep that motivation in the project history. The player-facing experience should stand on its own through enjoyable choices, human relationships, art, and music.

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

For the first playable, the player is a fictional resident helping co-host a gathering that neighbors have already started organizing. Residents have skills, projects, humor, disagreements, routines, and agency. They can decline or redirect help without becoming an obstacle to completion. Characters are not symptoms, obstacles, or points to harvest.

Design activities with choices: which supply route keeps a doorway accessible, how to arrange a gathering within a finite usable space, and how colors and lettering form a mural within a finite canvas. Choices change the resulting scene without needing a countdown or excluding neighbors. Avoid making the whole game a sequence of identical fetch tasks.

Progress measures completed shared projects, useful spaces, discovered stories, and continuing relationships. Do not reward displacement, rising rents, removing homeless people, or judging a resident's worth. Avoid a universal moral score or a claim that chores solve structural poverty.

Cleanup targets are explicitly authored litter identified with neighbors. Personal belongings, carts, bags, tents, bedrolls, and occupied spaces are never trash targets. Include an unhoused fictional neighbor as a full participant with skills and interests. Food, care, and access are never rewards contingent on doing chores.

## 4. First playable proposal

Build a small, accurately mapped area around Turk and Taylor, with final bounds selected after map and walking-route verification. The local cultural anchor is the Compton's Cafeteria site and Transgender District history. The gathering is a fictional contemporary event with fictional visiting musicians, not a reconstruction of the 2022 Blackhawk Block Party. Black Hawk and other out-of-area sites stay in their actual locations for later exploration.

Begin with a 10-15 minute session, a handful of fictional residents, one small cleanup activity, one original mural activity, and one gathering. If the experimental directory is enabled, organizations outside the walkable bounds remain in their true map locations; do not move them for convenience.

Working mission: Get the Block Ready. A resident-led gathering needs a clear accessible route, supplies, seating, and an original collaborative artwork. Three distinct activities are arranging space, composing a mural from original neighbor-contributed shapes and lettering, and helping with soundcheck. Cleanup is a short supporting action. The paintable wall and damage are explicitly fictional/permissioned gameplay surfaces, not a claim that a real building is vandalized or free to repaint.

The bounded choice: arrange one event area as either a conversation-centered layout or an art-and-music-centered layout. Both must preserve the same accessible route and allow the same neighbors to participate. Different seating, performer positions, resident comments, and mural choices are visible in the finale. Prototype the alternatives and verify that players notice the consequences. Neighbors contribute visible work before and during the player's involvement. Tasks can be revisited; avoid a crisis countdown. Include a short free-roam epilogue after the gathering, with persistent results.

Finish with a musical change assembled from original stems: bass, brushes, piano, and trumpet enter as the shared event takes shape. This is a design proposal, not existing audio or implementation.

Full-neighborhood expansion, multiple festivals, detailed nonprofit activities, political events, and film productions remain part of the larger concept. Their representative systems can arrive after the first playable proves enjoyable.

## 5. Neighborhood Voices: conditional TenderVoice connection

TenderVoice (2010) connected real Tenderloin organizations, mapped locations, and recorded explanations of their work. A contemporary report describes matching short voice clips to agencies on a map. See [the reuse research](TENDERVOICE_REUSE_RESEARCH.md).

Proposed original feature: Neighborhood Voices. A map/journal helps players discover organizations, read sourced summaries, and optionally hear newly consented or appropriately licensed recordings. An optional matching activity teaches who does what; the directory remains directly accessible without solving a game.

Creator's experimental-feature requirement: keep this an optional module behind a single `experimental.neighborhoodVoices` flag, initially false. An Experimental setting can enable/disable it. With the flag off, do not load or fetch its content or audio, show its controls, register its interactions, or require its records to load a save. Turning it off must stop its audio and remove its UI/listeners without disturbing main-game progress. The core gathering, dialogue, history discovery, music, and all completion requirements must work with the module off.

First enabled experiment: a text-only community resource board with at most three verified organization entries, official links, verification dates, and a map/journal view. It connects optional fictional neighbor conversations to sourced public facts, while keeping every directory entry directly accessible. Defer recorded voices and the matching activity to later experiments. Source/license uncertainty is never resolved by a feature flag: do not bundle unlicensed original TenderVoice material, even behind a disabled switch.

Never present fictional dialogue or synthetic staff voices as actual interviews. Use text-first entries until recordings and permissions exist. State that the game is not a current emergency-services directory; link to official organizations for current information rather than inventing availability.

Original TenderVoice code, interviews, photos, and other media must not be imported until each relevant right is established. If no source/license is found, implement our own feature from documented high-level ideas with original code and assets. Do not claim affiliation or an official continuation.

## 6. Cultural and geographic grounding

Maintain a content register: stable ID, present/historical date, exact location and source, original summary, verification date, and media permission status. Historical facts are not a license for a source's prose, photographs, artwork, or recordings.

Use a small flat file. Distinguish real geography, sourced historical facts, fictional characters, and fictional gameplay surfaces. The initial reference date is 2026-10-18; visual accuracy is not certified merely by choosing that date. Record the actual observation/verification date per feature and label approximations. The first walkable world is contemporary; historical material appears in dated journal cards or interpretation, with no separate period-world asset pipeline.

Candidate references include the Black Hawk site at Turk and Hyde, Hyde Street Studios, Tenderloin Museum programming, the documented Blackhawk Block Party of 2022, real nonprofit services, and the Transgender District. These are research leads, not partnerships or promised licensed material.

Existing crosswalks, banners, murals, and signage require current reference checks. Player-created improvements must be clearly distinct from claims about the real street. Do not imply that the player can unilaterally repaint public traffic markings or another artist's mural.

For political events, include practical organizing and disagreement through fictional characters. Do not manufacture a real organization's political position. For movie shoots, begin with a fictional production and original promotional art; factual historic shoot locations can be added after verification.

Representation and tone: show an inhabited urban neighborhood with joy, work, hardship, mutual support, and unresolved needs. Let fictional residents discuss housing insecurity and service barriers respectfully. No cleanup interaction removes a person or their possessions. The first slice has no staged overdose, medical-response minigame, policing simulation, or playable reenactment of historical violence. Geographic accuracy does not claim a complete social simulation.

## 7. Rights and community participation

Use original or explicitly licensed assets. Track code, music compositions, recordings, photos, art, map data, logos, voices, and likenesses separately. The repository's MIT license does not grant rights in third-party material. Attribution is not a substitute for a license.

Use documented facts and original writing for historical entries. Real performers' reenacted appearances, branded partnerships, and copied artwork require separate review. Keep original dialogue with fictional residents; historical entries identify their sources.

Seek compensated local creative and resident feedback when resources permit. No claimed endorsement, partnership, or representation of a real staff member without evidence. No contact has been made on the creator's behalf.

The first real-organization layer is factual discovery and official link-outs. Branded collaborative missions are a later production path with the relevant organization's participation and appropriate agreements. No donation, volunteering, or social benefit is recorded or claimed simply because a player completes an in-game task.

No composer, performer, or artist is contracted yet. Development may use clearly marked original geometric art and synthesized tone placeholders. Original recorded jazz remains a production goal, not an existing asset. Track creator, method, rights, and license for every delivered asset; do not fabricate interviews or imitate a real resident/staff voice. Any generative production choice needs its own provenance and rights review rather than assuming the word original settles permissions.

## 8. Proposed technical approach for review

There is no application code to inherit: the initial committed repository contains README.md and LICENSE only (HEAD e626a046f0dcb861b55b2b9881e3d8fcf8d6c0c4). Planning and review files have since been added to the working tree.

Use a browser-based, single-player, top-down 2D first slice with a small local content bundle and no accounts or backend. Renderer selection and technical contracts remain pre-build decisions; do not imply they were implemented. Geography should use projected real coordinates rather than a pretend street layout. Reference-check a separately authored walkable gameplay layer, including doorways and crossings; do not assume map data contains every sidewalk or entrance. Use fictional interior layouts unless surveyed and cleared.

Keep location/content data separate from interaction state, dialogue, project progress, and audio playback. Use stable IDs for saves and journal entries. Begin with keyboard and pointer input, text transcripts, adjustable sound, and reduced-motion support. Do not require audio to understand or complete a task.

Keep main-world, project, and journal records independent of experimental module state. Version the save envelope and handle missing/disabled module state without deleting core progress. Define module enable/disable, teardown, and re-enable behavior before implementation. Main jazz/music belongs to the core audio system; optional voice clips belong to the experimental module so the toggle cannot silence the entire game accidentally.

A prospective map source is OpenStreetMap, with its ODbL/attribution and derived-database obligations assessed before distribution. Do not copy Google Maps tiles or Street View imagery into assets. Provider terms, attribution, and exact data provenance remain build checks.

## 9. Evidence and acceptance before describing it as playable

- Ground the small map's streets, crossings, entrances, and route continuity; identify known approximations.
- A new player can explore, understand a neighbor's request, make a meaningful choice, complete the gathering, and see persistent results.
- Tasks work without sound; dialogue and controls remain legible at common browser sizes.
- Reload preserves progress; replay does not repeatedly award or duplicate a completed project.
- Compare experimental module off/on/off: identical core completion remains possible, core progress persists, and disabled module content/audio is not loaded or left playing. A save created while enabled loads with the module absent.
- Both gathering layouts preserve the required accessible route and show the chosen arrangement and neighbor contributions in the epilogue.
- All shipped media and imported dependencies have provenance and license records.
- Label historical recreations, fictional scenes, unverified details, and organization information honestly.
- Observe play sessions for enjoyment and confusion. Do not claim the game improves attitudes or produces community impact without evidence.

## 10. Planning status

This is a reviewed concept, not a build-ready engineering specification or a playable game. Source references are in [SOURCES.md](SOURCES.md). Independent reviewer outputs, model requests, failures, and driver judgments are retained under kibitz-runs/. Reviewer agreement is not factual verification, permission, a benchmark, or proof of social impact.
