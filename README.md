# Tenderloin Redux

A peaceful neighborhood adventure set on an accurate map of San Francisco's Tenderloin. Help neighbors with shared projects, create community art, explore local history, and bring a block together through original jazz and hip-hop.

The project began as a constructive response to the Tenderloin-set shooter reported as Night Shift by SFist and Tenderloin Night Shift by the San Francisco Chronicle, with the belief that games can inspire care, creativity, and greatness.

**Status:** first local playable in development. The full game remains in progress; see [build status](docs/BUILD_STATUS.md) and [roadmap](docs/ROADMAP.md).

**Godot direction:** the creator selected stylized isometric/2.5D with city-sourced buildings. Separate `godot/` combines the 58-building measured footprint/height study (`DataSF ynuv-fyni` PDDL + OpenStreetMap ODbL streets) with actual-scale walking, building/courtyard collision, camera sightline cutaway, and keyboard/touch neighbor navigation; neighbor conversation/portable mural/music and whole-Tenderloin neighborhood expansion come next. The browser game remains playable below. See [Godot approach/run instructions](docs/GODOT_APPROACH.md) and [data provenance](godot/data/SOURCES.md). The hourly builder follows this direction and regularly pushes tested, reviewed checkpoints to GitHub.

Run with Node.js 22 or newer:

```powershell
npm run dev
```

Open the printed local address (normally http://127.0.0.1:4173). No dependency installation, account, or API key is needed. Walk with WASD/arrows, press E to interact, or click people/objects. The preparations list can walk you to each activity. Pick a gathering layout with Bea, arrange supplies while keeping the striped route clear, tidy three marked litter spots, compose the shared mural, check sound with Rook, and open the gathering. Progress saves in this browser; Settings has an explicit restart and save recovery.

After opening, the optional **Stay a little longer** panel below the map offers an illustrated keepsake and a thank-you lap. Ask the neighbors before the picture, choose among those who agree, and save the original SVG if you like. Rook's choice not to be pictured is respected. The keepsake freezes that afternoon's mural and selected neighbors; later edits do not change it. You can skip the picture without penalty. When ready, confirm packing up and return the three event loans to Thanh, Celeste and Rook in any order. A partial lap survives reload, and the gathering stays complete throughout.

Version 0.8.0 adds **Plan another afternoon** below the map and in Field notes after opening. Arrange Bea’s story circle, Dez’s rhythm workshop, Celeste’s shared art and Thanh’s quiet interval with native Add/Remove/Earlier/Later buttons. If rhythm comes before stories, leave the quiet interval between them; you can also begin with stories. A partial draft saves separately from the posted programme. Posting creates an original poster, a portable board beside the mural, and remembered neighbor responses. Revise whenever you like. This is a fictional future planning project; you choose separately when to host it. It is available before or after optional packing and does not change your existing keepsake.

Version 0.9.0 makes that programme playable. Choose **Host the posted programme** below the map, **Host the programme** on its poster, or the hosting entry in Field notes. Confirm a second afternoon, then follow the order you began with. Choose Bea’s story invitation, edit Dez’s eight-step visual tap/rest pattern (a listening-only round is welcome), compose Celeste’s six-tile portable panel and palette, and try Thanh’s two quiet-space arrangements. Each activity has an explicit finish button; you can save and explore between them. Partial choices, completed activities and neighbor responses survive reload. The panel stays beside the first mural, and the new stools/visitors preserve the through-route. Programme revisions are future plans and do not rewrite this event. Opening keepsakes and loan returns remain available independently. The rhythm is visual; your optional soundtrack does not change automatically.

On phones the map starts closer to you. Use **+ / −** to zoom, **Full block** for an overview, and **Follow me** to return to your position. Drag to look around; a drag does not start walking. **Meet the neighbors** lists all five people with buttons that walk you over and open their conversation. **Stop walking** cancels the route. These are camera/navigation aids: real street distances stay the same. Pinch zoom is not implemented.

**Preview your arrangement** in the supply editor shows a read-only plan and returns to the same selected tool. Once opened, Long Table draws visitors near your table for conversation; Open Floor spreads them through free edge spots with gentle movement. Reduced motion stills it. **See your gathering plan** below the map shows the current supply positions and clear third row, with readable text on phones; it follows packing and returns. This live plan is separate from the frozen illustrated keepsake.

**Choose music** in the soundtrack strip lets you try your own Suno jazz or another local MP3/WAV (up to 100 MB). Choose a file, then Play; it repeats with pause/resume and the shared music volume. Return to synth sketch or choose another file whenever you like. The file stays local to this tab, is not uploaded or included in saves, and must be selected again after a reload. Full-track mode hides the sketch's instrument-progress labels. [Music prompts and provenance brief](docs/SUNO_MUSIC_BRIEF.md) includes a frugal one-track starting point. No Suno audio is bundled yet.

`npm test` checks game rules, saves, route reachability and audio startup cancellation. `npm run check` checks JavaScript syntax. `npm run test:browser` requires a separate local Playwright installation and Chrome; optionally set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path and `BROWSER_CHANNEL` to another installed channel (`bundled` for Playwright's installed Chromium). It starts its own temporary server, verifies the served source fingerprint, and stops that server afterward. `BASE_URL` can select an existing server, which must match this checkout. Browser evidence is written to ignored `artifacts/`.

Street centerlines use actual OpenStreetMap coordinates at uniform scale. Facades, sidewalks, decorative features, bike-lane widths and event permissions remain schematic, explicitly marked in-game. [Asset and map-data provenance](docs/ASSETS.md) separates ODbL map data from MIT code/original art. The optional original synth soundtrack is a development sketch; recorded jazz remains a later milestone.

- [Game concept](docs/CONCEPT.md)
- [TenderVoice source and license research](docs/TENDERVOICE_REUSE_RESEARCH.md)
- [Research sources](docs/SOURCES.md)
- [Independent review record](kibitz-runs/2026-10-18-community-concept/campaign.md)
- [Prompt for a manual Claude review](docs/CLAUDE_REVIEW_PROMPT.md)
- [Manual Claude review](docs/CLAUDE_MANUAL_REVIEW.md)
- [Verified findings and design decisions from that review](docs/MANUAL_REVIEW_SYNTHESIS.md)

Version 0.10.0 adds **Neighborhood Voices** under **Settings → Experimental**, off by default. Turn it on to reveal an optional navigation entry with three dated, text-only organization cards and direct official source links. The fictional neighbors' projects work independently of these cards. Turn it off from Settings or the cards to release optional resources. Load failures have an explicit Retry; they never stop the gathering. This first experiment has no recordings, interviews or impersonated voices. Original TenderVoice source/media have not been imported: a usable source-and-license pair has not been verified. [Source register and limits](docs/VOICES_SOURCE_REGISTER.md).

`npm run test:voices` uses the same Playwright/Chrome setup as the core browser suite. It checks off/on/off completion, optional failures and cleanup, focus, lifecycle restoration and a nonshipped synthetic audio fixture. A measured pause command is not an acoustic latency certification.

Version 0.11.0 adds **A tenant listening hour** below the map and in Field notes after you finish the second gathering. On a later fictional afternoon, help neighbors talk about repairs/staying put or shared-space access. Choose a small listening circle or a drop-in table, see the schematic plan, and agree to keep anonymous themes or no meeting notes. Welcome the conversation, hear differing priorities and close it together. Partial planning and the meeting survive reload; completed choices and neighbor responses remain as a memory. No deadline, attendee input, signature, recording, real organization campaign or outbound message. Opening packing, keepsake and returns remain independent. Topic and notes change conversation/prose; format also changes the original diagram. No map/route or soundtrack change. `npm run test:civic` uses the same Chrome/Playwright setup and distributes all eight combinations across phone/desktop sizes.

Version 0.12.0 adds **A little film on the block** after the listening hour. Help Celeste and Dez make *The Open Seat*, an original three-shot illustrated short. Choose objects in close-up or a table with volunteered fictional hands; Rook helps off camera and declines a picture. Work quietly beside the conversation or wait for a cue, arrange the shots with Earlier/Later, then prepare the take. The crew holds for Thanh to use the route before you keep each drawing. Progress resumes during planning, the pause or partial capture. Screen your finished sequence with the three frame buttons; neighbors remember the choices. This is an illustrated game sequence with captions, not a recorded movie or a real camera/microphone feed. Your music and other projects stay independent. `npm run test:film` checks representative phone/desktop paths; rule tests cover every plan/order in both layouts.

The first playable proposal centers on a resident-led gathering around Turk and Taylor, with cleanup, original mural composition, accessible space arrangement, and an original music finale. Real organizations, history, and streets require source verification; no partnership is claimed.

The repository's MIT license covers this project's own software and documentation. Third-party material retains its own rights and licensing requirements.

Optional history walk (0.6.0): choose **History walk** below the map to follow Turk west through Jones and Leavenworth to the former Black Hawk at Hyde. **Show the whole route** frames the longer walk; **Full block** returns the opening view, and **Walk back to Bea** routes your character home. A dated, source-linked jazz note is remembered in the existing local v1 save. This is a bounded game route with schematic scenery, not current real-world crossing/access guidance. No historic recordings or source media are bundled.

Version 0.7.0 adds **Living district** below the map and in Field notes. Show/hide a dated city cultural-district boundary with a clear source legend and original community/street-history notes. The city layer is local, off by default, and does not alter saves, quests, walking routes or music. Its full extent goes beyond the game; it is not a current streetscape survey or real-world crossing guide.

The cultural-district data is a pinned snapshot. Refresh is manual: use the exact query in its provenance JSON, recheck dataset metadata/license and source facts, then rerun geometry, browser and fingerprint checks. No upstream city-data changes are automatically applied.
