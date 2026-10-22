TOOL CHECK: PASS (Read/Grep/Glob returned real contents of input.md, godot/main.gd, godot/civic_listening.gd, public/programme.js, public/hosting.js, public/game.js, tests/godot-browser.mjs, docs/GODOT_APPROACH.md, docs/ROADMAP.md, session_handoff.md). Reviewer ran no gates and edited no source.

VERDICT: yes-with-fixes. The Programme Studio direction closes a real, source-provable native gap. But as written in input.md §5, its only stated world consequence rests on a false premise (the signboard has no "posted art" and stops showing published revisions once hosting starts). It also omits the one order-dependent resident consequence that makes arranging meaningful, which is the browser's "neighbors answer".

GROUNDED FACTS THE PLAN SHOULD STATE (prove-source requirement, input.md §5 last sentence)
- Natively, Godot can publish only ONE order. Z (main.gd:9705-9716) appends PROGRAMME_DEFAULT_ORDER and publishes it. Shift+Z (main.gd:9686-9693) appends in default order and then only toggles "stories" by ±1. From the default ["stories","beats","pause","art"] that toggle gives ["beats","stories","pause","art"], which programme_issue rejects (main.gd:9478). The hub button calls the same advance path (main.gd:15114). No other caller of programme_move exists in godot/ (the only call is main.gd:9692). So "exposes default/preset order" (input.md §5) understates the gap: the quiet-interval rule only ever appears as a failure state of the shortcut.
- Non-default hosting orders have only been exercised through PRIVATE save-fixture mutation (tests/godot-browser.mjs:2724, 2743, 2754), never through genuine native input.
- The complete prior art is the browser editor: public/game.js:273-292 (proposal cards with owner and pitch, Add/Remove, Earlier/Later, issue text, "Post this revision", draft-vs-posted line) and public/game.js:293-296 (poster, "The neighbors answer" via programmeResponse, and the copy "This is a future plan… Revisions here do not rewrite it"). The Studio is therefore a parity port, not an original mechanic. Only its visual treatment (pinboard) can be original.

MUST-FIX BEFORE BUILD
1. [§5 "Existing actual signboard could show the posted art"] This premise is false in two ways.
   (a) ProgrammeSignboard is a 1.06m board with four flat-colour BoxMesh bars (main.gd:2922-2945), not a texture surface.
   (b) The board deliberately shows hosting_order once hosting starts (main.gd:3129; documented in docs/GODOT_APPROACH.md:13). Any Publish made mid-hosting or after completion therefore has zero world consequence.
   Also: build_programme_svg is text-only bars plus <text> (main.gd:9342-9364), while every in-world raster in the repo avoids <text> (godot/civic_listening.gd:320-325). verify: whether Godot's Image.load_svg_from_string renders SVG <text> at all. [ASSUMPTION] it does not.
   Fix: drop "signboard shows posted art". State the world consequence honestly. Before host_start, the existing bars re-order (already true at main.gd:3133-3136). After host_start, the board keeps the copied gathering order, which is browser parity. Make the large Studio/poster view (Godot Labels plus a text-free illustration) the readable surface.

2. [§5 "resident pitches… deliberate Publish"; missing concept] The plan ports pitches but not the order-dependent replies (public/programme.js:41-52 programmeResponse). In Godot nothing reads the order beyond the hosting sequence. The only order-dependent use is hosting_order[0] for the start line (main.gd:9559-9561, 9724-9725), and there is no order-dependent resident dialogue anywhere in godot/*.gd (grep for .find/[0] on the order arrays). Without replies, rearranging changes four bar colours and nothing else. That is not a "resident-led consequence" (session_handoff.md:10 requirement).
   Fix: include the four programmeResponse replies inside the Studio's posted view only, as the browser does at game.js:296. Do NOT inject them into world/neighbour dialogue. That ladder already has precedence rules (session_handoff.md:16 "Bea remembers… until civic/film responses take precedence"), and reopening it is a separate campaign.

3. [§5 "completed profiles must still have meaningful read-only or safe revision"] Undecided. Existing code makes revision unsafe in its messaging. programme_publish ignores hosting state (main.gd:9506-9525) and always:
   - fires the "Evening Programme Published! / All 4 block gathering segments scheduled on the board" burst (main.gd:9517, 10672-10675);
   - writes info text "3D Programme Signboard posted by Bea · Press Z to start hosting" (main.gd:9523).
   Both are false once hosting_order is non-empty, and the Studio would make this path routine.
   Fix: pick browser parity. Revision and Post stay allowed as a "future plan" (game.js:296 copy), with hosting_order/results untouched (already guaranteed and tested, godot/tests/study_test.gd:1065-1067). Make the cue/info copy conditional on hosting_order being empty. Nothing else changes: no Spark change (spark_count main.gd:5715-5727 ignores publish) and no new key.

4. [§5 card set; missing concept] The plan describes "four … proposal cards" with move earlier/later only. It doesn't address partial drafts. validate_godot_programme accepts 0-3 entries (main.gd:12312-12322), the hub shows "Plan Schedule (%d/4)" (main.gd:14804-14805), and Godot has no programme_remove (the browser does, programme.js:31).
   Fix: decide explicitly on one option:
   (a) Opening the Studio fills missing segments in default order through existing programme_add calls (no remove; documented deviation from browser), or
   (b) add a remove action, which is a new callback.
   Prefer (a), the smallest option, and state it as an intentional parity deviation.

5. [§7 "avoid extra hub nav row"; missing concept] There's no entry point, and that decides whether the slice breaks the layout or established inputs.
   - The Listening entry already lives inline in block_page_nav (civic_listening.gd:364 entry_inline). session_handoff.md:6 records that full3/4 real extra-row regressions forced the single-nav solution, so a second inline entry is a known regression risk.
   - Z must keep one-press default publish and host. The genuine progression gate depends on it (tests/godot-browser.mjs:1847-1857).
   Fix: open the Studio from the existing block_programme_btn only in the "no hosting active" states: unpublished, published-not-started, and done ("Hosted All 4 Events", main.gd:14797-14807). During active hosting the button keeps its Host Activity behaviour. Keep Z/Shift+Z unchanged as the fast path, mirroring Q/Shift+Q for the Listening Hour (session_handoff.md:5). verify: which function key, if any, is free if a key alternative is wanted (F4 film and F5 listening are taken).

SHOULD-FIX
1. [§5 "Original4 resident proposals exist"] Only true in the browser. Godot has titles and colours only (main.gd:82-95). Owners and pitches exist only in byte-frozen public/programme.js:2-7, so they must be duplicated in GDScript, which creates a two-source drift risk. Fix: add a byte-parity assertion for the pitch/response strings, like the existing programmeSVG parity check (tests/godot-browser.mjs:1932-1934). The curly quotes and apostrophes are non-ASCII, so the main-font fallback boundary in §7 applies to every pitch and reply.
2. [§4 acceptance] Acceptance should require at least one GENUINE-progression run that posts a non-default valid order through the Studio and then hosts it far enough to reach the downstream consumers: the Quiet Seats/Bea invitation hub rows and the "A rhythm, a pause, a story" heading (main.gd:9333-9340). Those consumers have only seen non-default orders through PRIVATE fixtures (tests/godot-browser.mjs:2724-2754). This is the most valuable new evidence the slice can produce. Don't count fixture runs as a substitute.
3. [§5 accessible move] The plan doesn't specify where focus goes after Earlier/Later. The browser moves focus to the same card's control, or flips to the opposite direction at the ends, and announces "X is now n of 4" (game.js:285-286). Fix: require that exact parity. The native test should prove focus stays on the moved card after ui_accept, including the first/last disabled edges.
4. [docs/GODOT_APPROACH.md:13] This doc claims a 1:1 match with programme.js/hosting.js and names functions that don't exist: is_programme_balanced, publish_programme, start_hosting, host_choose, host_paint_tile (0 matches in godot/). The real names are programme_issue/programme_publish/host_start/host_cycle_tile. Fix: correct it in the slice's docs pass so the "prove source" claim isn't built on stale documentation.
5. [§6 Celeste comparison] The comparison understates the Celeste gap, so it should be stated precisely if kept as the alternative:
   - Shift+Z flips the palette AND cycles cell 0 on every press (main.gd:9675-9680), so the palette can't be held while editing.
   - World tiles are colour-only boxes, so tile SHAPE is never shown in world (main.gd:2960-2971, 3145-3147).
   - The panel is visible only after art is hosted (main.gd:3139-3140), so there is no live preview while drafting.
   - Completed profiles have nothing to edit.
   Net: Celeste gives a stronger in-world art consequence but no post-completion agency. The Studio, with fix 2, keeps meaningful post-completion revision. This supports choosing the Studio, conditional on Must-fix 2.

OPTIONAL / NICE-TO-HAVE
- If a world touch is wanted pre-hosting, briefly highlight the moved bar's position on the existing board. No new mesh is needed.
- The pinboard visual can reuse PROGRAMME_SEGMENT_COLORS (main.gd:90-95) as card stock so the cards match the board bars.

CUT THESE
1. [§5] Signboard showing posted art. It rests on a false premise (Must-fix 1), and retexturing the board would change documented hosting_order board semantics (GODOT_APPROACH.md:13). Cutting it loses nothing, because the bars already re-order.
2. [§5 "four illustrated … cards"] Four NEW per-segment illustrations. Each segment already has original art elsewhere (Bea invitation, Quiet Seats, tile panel). New card art adds four rasters, a cache bound and aesthetic acceptance without serving the arrangement goal. Use one text-free pinboard backdrop plus coloured cards, with Labels for the full titles and pitches.
3. [§5 "safe revision/practice behaviour"] "Practice" mode. There's no source precedent for a programme practice mode, and browser-parity "future plan" revision (Must-fix 3) already gives completed profiles real agency. A separate practice state would be new transient-state surface.
4. [§6] Keepsake gallery/reflection. It's unspecified and has no grounding in source. It also pulls toward a new award or checklist, which §7 boundaries forbid without justification. Drop it from this round rather than leave it as a live alternative.

[ASSUMPTION] markers above: Godot SVG <text> rendering (Must-fix 1). Function-key availability is marked verify: in Must-fix 5.
