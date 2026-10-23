# Real locations for the next neighborhood episodes

Researched October 22, 2026, following the creator's requests for missing dogs, a cooking contest, a mayoral-election episode and a Halloween parade. These are research and design leads, not implemented episodes or completed pre-coding CLI idea passes. Finish the in-flight Larkin outage checkpoint before choosing the next feature.

## Missing dogs: real animal-service anchors

| Place | Verified address and role | Possible game use |
| --- | --- | --- |
| San Francisco Animal Care & Control | **1419 Bryant Street at Alameda**. The agency's own lost-pet page directs owners to the shelter and describes filing a missing-pet report. | Strongest real reference for the fictional search/reunion story. A clearly simulated report or referral can connect neighborhood clues with the real service. |
| SF SPCA Adoption Center | **250 Florida Street**. The organization's own locations page distinguishes the adoption center from its veterinary hospital at **201 Alabama Street**. | A separately identified adoption/rescue reference; do not call it the municipal stray-intake shelter. |
| Muttville Senior Dog Rescue | **750 Florida Street**, confirmed on the organization's own event/contact page. | A senior-dog rescue reference and a documented link to a past pet costume parade. |

Sources: [SFACC report a lost pet](https://www.sfanimalcare.org/lost-found-pets/report-a-lost-pet/), [SF SPCA hours and locations](https://www.sfspca.org/about/hours-locations/), [Muttville event/contact page](https://muttville.org/event/20241026-hayes-valley-annual-halloween-parade-and-costume-contest).

These facilities are **outside the Tenderloin and current playable area**. Do not move them into the neighborhood, invent a local branch or imply an actual partnership. A distant map/contact reference is possible; a genuine visit requires sourced geography expansion. The dogs, owners, sightings and reunion should be original fiction, with no real missing-animal records or personal contact details copied into play. The proposed missing-dogs episode can begin with resident descriptions, compare collar/coat clues, calmly find the fictional dogs and reunite them with their owners. This is a proposal for the next mandatory CLI ideas pass.

Current city EAS address points, retrieved separately from the service-role sources:

| Address | EAS ID | Latitude | Longitude |
| --- | --- | --- | --- |
| 1419 Bryant St | 691579 | 37.76856277109036 | -122.41034844561791 |
| 201 Alabama St | 732147 | 37.76732438366957 | -122.4123905998584 |
| 750 Florida St | 585908 | 37.75966878851279 | -122.411283738019 |

The exact query returned no EAS row for 250 Florida; its official organizational address is verified but its independent coordinate remains open. None of these address points establishes a public entrance or access conditions. Older references to SFACC at 1200 15th Street must not replace its verified Bryant Street location.

## Halloween: documented local precedents

- **Tenderloin Halloween Crawl / “13 Corner Thursday,” 2019.** TLCBD's own [November 1, 2019 report](https://tlcbd.org/blog/2019/11/01/photos-tenderloin-halloween-crawl/) thanks more than thirty participating neighborhood organizations and businesses. This documents a neighborhood crawl; the page does not establish a formal parade route.
- **Hayes Valley Halloween Pet Parade and Costume Contest, October 26, 2024.** [Muttville's own event listing](https://muttville.org/event/20241026-hayes-valley-annual-halloween-parade-and-costume-contest) specifies Hayes/Octavia by Patricia's Green, 12:30–2 p.m., and identifies SFwalkies and Hayes Valley Art Works as sponsors, with Muttville guest judges. This is Hayes Valley, not the Tenderloin.
- **Halloween Hoopla costume parade, November 2, 2024.** The [organizer's archived event page](https://ybgfestival.org/event/halloween-hoopla-2024/) places the family event at Children's Garden, Yerba Buena Gardens, **799 Howard Street**, noon–3 p.m.; its finale was a children's costume parade. This is a different neighborhood and is dated November 2 despite the Halloween theme.
- TLCBD's [October 27,2021 event notice](https://tlcbd.org/blog/2021/10/27/2021-10-27-halloween-in-the-tenderloin-how-and-where-to-celebrate-this-year/) lists a Fall Family Festival at **200 Turk St**, October29,4–7p.m., with a costume contest. It also places Halloween trick-or-treating on **Larkin between O'Farrell and Eddy**, October31, and separately dates its Boeddeker Día de los Muertos event November1. These are specific festival/crawl references, not proof of a parade route; the northern Larkin corridor is not currently modeled.

A fictional Tenderloin lantern/costume procession can draw on these verified community traditions while using original costumes, puppets, music and artwork. Do not present a newly designed route as a historical route, copy the organizers' media, claim endorsement or blend Día de los Muertos into Halloween.

## Mayoral election: actual November 2024 polling places

The creator specified the most recent San Francisco **mayoral** election, so the episode basis remains **November 5, 2024**, a historical election. The official Department of Elections [dataset page](https://sfelections.org/tools/election_data/datasets.php), after selecting that election, links a **Polling Place List dated October 3, 2024**. Its [text file](https://sfelections.org/tools/election_data/datasets/2024-11-05/PODJ011_PollingPlaces_20241003.txt) was read in the browser; the records below carry `ElectionAbbr=2024NOVGEN`.

| Official listed site | Address | PollingSiteID | Listed precinct | City EAS address point, latitude / longitude |
| --- | --- | --- | --- | --- |
| Cadillac Hotel — Lobby | **380 Eddy St**, between Jones and Leavenworth | 750 | 7528 | 37.784053888260054 / -122.41394301886764 |
| Boeddeker Park & Clubhouse — Meeting Room | **246 Eddy St**, between Jones and Taylor | 2092 | 7534 | 37.784166333048596 / -122.4119742455036 |
| Faithful Fools | **234 Hyde St**, between Eddy and Turk | 3592 | 7529 | 37.78305698522451 / -122.41550765659734 |
| Glide Memorial Church — 2nd Floor Sanctuary | **330 Ellis St**, between Taylor and Jones | 3981 | 7533 | 37.78529137439479 / -122.41169726655217 |

The coordinates are independent current city EAS points, not coordinates supplied by the polling list, surveyed historical entrances or room locations. EAS IDs respectively: **490999, 490979, 667581, 696845**. Some EAS records have a placeholder 1970 update timestamp; do not interpret it as a survey date. The October 3 published list is a dated planning snapshot and does not prove there were no later relocations. Keep that limit visible in research and verify later official changes before finalizing a historical reconstruction.

The first three are promising nearby geography candidates; each still needs actual source-footprint/street/walking checks before implementation. Glide is beyond the currently modeled northern street coverage. Do not silently clamp a destination or infer an entrance from an address point.

**Polling places, ballot drop boxes and the City Hall Voting Center are distinct.** Boeddeker also appears in the pamphlet's drop-box table, but the separate polling-list row above is what supports calling its meeting room a polling place. The [official November 2024 election plan](https://media.api.sf.gov/documents/Election_Plan-_Nov_2024.pdf) distinguishes 501 polling places, ballot drop boxes and the City Hall Voting Center. Game characters' fictional homes do not establish a real voter's precinct assignment. Label the episode historical, keep it nonpartisan and direct any present-day voting questions to current official election information.

## Retained evidence and next implementation boundary

Compact source evidence is retained under `docs/research/2026-10-22-episode-locations/`: city API raw responses/retrieval hashes, a four-row official polling excerpt, a browser-reading provenance note and SHA-256 receipt. Additional fetch diagnostics remain ignored under `artifacts/episode-location-research-2026-10-22/`. The excerpt is not represented as the complete downloaded file; ordinary fetches returned HTTP403 while the browser rendered the official text successfully. The SFUSD staff notice required employee login for its detailed list and was not used to claim any school polling location. An unrelated ArcGIS polling layer lacked a verified San Francisco/November2024 basis and was excluded.

No dog, contest, election or parade code was added by this research. Each future code-changing round still requires its own source-grounded exact Claude Opus5.5/high pre-coding idea pass, separate implementation QA, all five local gates, save/geography invariants and a reviewed local commit with `[skip ci]`. Keep one writer and finish the current outage checkpoint first.
