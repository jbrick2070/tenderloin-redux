# Street view Phase 1 playtest: scorecard

Both testers ran the same prompt (`playtest-prompt.md`) on November 2, 2026, against the build served on port 4190: the verified Phase 1 export of `761e91c` (SHA-256 `04aa5124…f758af1`, 1,485,816 bytes). Each claim was checked by Claude against the code and the screenshots, and every confirmed bug was turned into a headless check that fails with its fix turned off.

## Result

| | Codex | agy (Gemini) |
|---|---|---|
| Time, first saved file to report | about 28 minutes | about 40 minutes |
| Report | 976 words, 266 files | 1,479 words, 237 files |
| Bugs reported | 4 | 8 |
| Real and new | 4 | 3 (touch turning, Shift+F, the diamond through walls) |
| Real, found by both | the arrow behind the player; the western limit | the same two |
| Real but already planned | 0 | 1 (high marker and talk prompt, Phase 4) |
| Not a bug | 0 | most of 3 claims (Info clipping, the Taylor banner, silent tilt and kept pitch) |
| Precision | 4 of 4 | about 5 of 8 |

**Codex was faster and more accurate.** Every report reproduced exactly as written, with coordinates and snapshot values that led straight to the cause. **agy covered more ground**: it found the touch gap and the Shift+F problems that Codex did not try. It also reported designed behaviour as bugs, and it missed Codex's two most specific finds: the tap on Bea's face and the arrow under the Map view button.

## Each claim

| Claim | Tester | Verdict | Where it stands |
|---|---|---|---|
| Holding W at the western limit flips between street and map | Codex | Real, major (41 flips in the headless repro) | Fixed in `12e277b` |
| Walking west hands back silently | agy | Real (the same root cause) | Fixed in `12e277b`: it now says why |
| Street view lasts "50 m onto the 100 Block" | agy | Designed: the limit is x = −50 (a polygon is deferred) | No change |
| A tap on Bea's face up close walks past her | Codex | Real, major | Fixed in `12e277b` |
| The guide arrow points ahead when the objective is behind | both | Real | Fixed in `12e277b` |
| The Map view button hides the arrow on phones | Codex | Real (280° to 355° at 390×667) | Fixed in `12e277b` |
| Touch cannot turn or tilt the view | agy | Real for Phase 1 | Phase 2 adds drag-look, the walk stick and a touch hint |
| The marker and talk prompt float off the top of the view | agy | Real, known issue | Scheduled: Phase 4, work orders 3-4 |
| Shift+F on the opening card leaves the music off | agy | Real | Fixed in `8285794` |
| Shift+F under the block hub, and during a chat without a goodbye | agy | Real | Fixed in `8285794` |
| The gold diamond draws through the mural board | agy | Real | Fixed in `8285794` |
| "Taylor Street" banner draws through a wall | agy | Not real: it is a depth-tested Label3D | No change |
| The Info box clips the greeting | agy | Not street view: a scrolling map-view box, and the greeting waits for the reward banner by design | No change |
| Tilt is silent; pitch is kept between visits | agy | Designed (the plan says never narrate continuously, and resume with the saved yaw and pitch) | No change |
| Zoom buttons do nothing at eye level | agy | Designed no-op, but silent | `8285794`: they now say zoom works in the map view |

## For the next round

The Phase 2 prompt (`playtest-prompt-phase2.md`) now pins the build by its hash, lists every confirmed bug for rechecking, and lists the designed behaviours both testers asked about.
