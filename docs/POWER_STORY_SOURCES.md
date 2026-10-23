# Larkin 2017: real location, original community-support story

The optional **Power / F8 → Larkin 2017** scenario uses one documented site and event. The existing Festival story remains original fiction. Neither scenario writes saved chapter results or reconstructs utility repair work.

On April 21, 2017, an arc and fire in a circuit-breaker cabinet at **Larkin Substation, 600 Larkin Street at Eddy**, interrupted service for approximately 88,000 customers. The Exponent report gives an onset around 9:06 a.m. and full restoration at 4:46 p.m. The report was commissioned by PG&E and is hosted by CPUC; it is not presented as a separate CPUC investigative conclusion.

- [Exponent, Larkin Outage Investigation, September 15, 2017](https://www.cpuc.ca.gov/-/media/cpuc-website/files/uploadedfiles/cpuc_public_website/content/safety/electric_safety_and_reliability/attachment-3-exponent-report-larkin-outage-redacted-version.pdf): printed pages 1, 9 and 34 (PDF pages 11, 19 and 44). The failure described is a breaker-cabinet arc/fire, not a verified transformer explosion.
- [PG&E restoration release, April 21, 2017](https://investor.pgecorp.com/news-events/press-releases/press-release-details/2017/PGE-Safely-Restores-Power-to-San-Francisco-Thanks-Customers-for-their-Patience-Substation-Scheduled-for-Modernization/default.aspx): confirms the location, restoration and approximately 88,000 affected customers.

The player helps fictional neighbors link portable battery lights, first at the real street junction and then at the existing gathering on Turk near Taylor/Mason. PG&E restored actual utility service. Fictional actions, dialogue, props, colors and game progression are not records of actual residents' actions. The story stays in daylight; it has no live clock, current-fault feed, electrical procedure, equipment inventory, security detail, or entry into the substation.

The historical inspiration is presented on the project's existing dated city/OSM geometry. This is not a reconstruction of the neighborhood's 2017 buildings or facades.

## Geographic sources and precision

Exact raw responses, dataset metadata and SHA-256 retrieval receipts are retained under `godot/data/source/larkin/`. `scripts/build-power-place.mjs` reproducibly derives `godot/data/power_place.json` using the game's existing uniform local-metre projection.

- [SF Enterprise Addressing System, 3mea-di5p](https://data.sfgov.org/d/3mea-di5p), EAS address ID **491045**, 600 LARKIN ST: latitude **37.78359857210517**, longitude **-122.41741847018493**. This is an address point, not an entrance or a transformer position. The row's update timestamp is August 16, 2018; the portal's later `data_as_of` timestamp is not a new field survey.
- [SF Street Intersections, gmfx-8h6i](https://data.sfgov.org/d/gmfx-8h6i), CNN **25148000**, Larkin/Eddy: latitude **37.78331089**, longitude **-122.417528773**. The game uses this junction directly, with no nearest-point relocation. Both city datasets publish PDDL licensing.
- **OpenStreetMap contributors, ODbL**: retained building way **71209428** supplies the complete closed exterior polygon and contributor-reported **9 m** height. The plain solid uses stylized colors and no invented facade details. This is separate from the unchanged 188 city/LiDAR building set and eight LiDAR additions; it is not newly measured massing. Existing retained Eddy way **30832489** reaches OSM junction node **65354421**, approximately 1.8 m from the city junction. Only a short western walking-bound extension along this already sourced Eddy approach is added. Larkin Street beyond the junction is not modeled.

The case map is north-up with a uniform metric scale: a gold junction marker, white address marker, the complete OSM exterior and the retained Eddy segment. Its scale bar represents 40 m. Street-center and address coordinates do not establish pedestrian accessibility, actual traffic controls, utility access or present-day appearance. The portable battery stand is explicitly fictional.

The added western walking area admits only the retained Eddy corridor, not the unrelated western Turk segment. Original decorative trolley-wire coverage uses the pre-extension bounds. Other lots along this short western approach have not been newly surveyed; the abstract street corridor is not a certification of actual sidewalk clearance. The plain OSM exterior participates in the existing wall/cutaway system, while its height remains contributor-reported.

Long historical trips use separate legs through the sourced Taylor/Eddy junction when a direct segment is obstructed. A collision replan retains the current leg's goal. Stop cancels both legs; resuming on a clear Eddy segment continues toward the destination. Pressing Walk at the reached battery light leaves the player in place. This is a local episode route choice, not a general pathfinding performance improvement.

The December 11, 2014 SFFD storm entry at Larkin/Eddy remains research only. It identifies an intersection-level transformer incident, not a particular asset or the 2017 failed cabinet, and is not combined into this scenario.
