TOOL CHECK: PASS. Read scripts/serve-godot.mjs, tools/field-guide/index.html, .github/workflows/deploy-pages.yml, artifacts/terra-field-guide-20261027/route-observation.json, public/index.html, godot/data/buildings.json (origin), tests/ and README.md.

Section ids used below: [P1] = paragraph 1 "Creator outcome", [P2] = "Observed at", [P3] = "Pre-code ideation only", [P4] = "Ground feasibility / acceptance", [P5] = reviewer constraints.

VERDICT: yes-with-fixes. The diagnosis in [P2] is correct and grounded. But [P1]/[P3] call this local-only when the guide is publicly deployed. The brief also treats routing as the headline when the deeper defect is the loader's dishonesty, which fires on every failure path, any URL, any host. And it gives a weak solution (a document-relative fetch URL) equal standing with the redirect, which dominates it.

MUST-FIX BEFORE BUILD

1. [P1] + [P3] False premise: "not a ... public deployment" / "deployment under a project base path" is hypothetical.
   - Evidence: .github/workflows/deploy-pages.yml:63-68 copies tools/field-guide/* and godot/data/buildings.json into _site/field-guide/. The workflow runs on every push to main (deploy-pages.yml:3-6). README.md:12 links the live guide at https://jbrick2070.github.io/tenderloin-redux/field-guide/.
   - So any edit to tools/field-guide/index.html ships publicly on the next push to main that does not carry [skip ci]. "No deployment" is a commit-message convention (recent commits carry [skip ci]), not a property of the change.
   - Fix: restate [P1] as "the local preview route is the observed defect; the HTML change also reaches the live Pages site at /tenderloin-redux/field-guide/." Make "commit with [skip ci], no workflow_dispatch" an explicit acceptance item.
   - The project-base-path case is real, not hypothetical. Treat GitHub Pages as the base-path environment. [ASSUMPTION] GitHub Pages already redirects a directory path with no trailing slash to the slash form; verify against the live URL before relying on it.

2. [P1]/[P3] The goal targets the wrong defect. Routing is the trigger; the lie is in the loader.
   - tools/field-guide/index.html:631-632 calls res.json() without checking res.ok.
   - The catch at index.html:641-643 only logs to the console.
   - index.html:665 renders `${allBuildings.length || 188} footprints loaded`, so 0 loaded displays as 188.
   - route-observation.json:18 and :51 record a byte-identical summary for the failed and successful cases. The summary carries no signal at all.
   - The same lie fires for a 200 response with {} or {"buildings":[]}, for a network error, and for file:// opens. A redirect fixes none of these.
   - Fix: make the loader truthfulness change the non-negotiable core of the slice. Use an explicit tri-state (loading / loaded N / unavailable + reason), where N is computed from the parsed arrays, and remove the `|| 188` fallback. The route fix is secondary.

3. [P3] Hard-coded "188" claims made before or without data:
   - index.html:300 "Loading 188 measured DataSF buildings…"
   - index.html:312 map pill "…any of the 188 buildings"
   - index.html:665 the `|| 188` fallback
   With geometry unavailable, the map pill still invites the user to tap 188 buildings that are not drawn and cannot be selected. Fix: the loading text and pill must not state a count until the data has loaded. In the unavailable state the pill must say that footprints are unavailable and stops still work.

4. [P3] Design trap: the status text will be overwritten.
   - saveState() (index.html:605-612) calls updateProgressSummary() on every user action, and that function overwrites progressSummary.textContent unconditionally (index.html:664-665).
   - If the "unavailable" message is written into the same element, the first tag, photo or colour change erases it.
   - Fix: hold geometry status in its own variable that updateProgressSummary composes, or in its own DOM node such as the existing mapStatusPill (index.html:312). Acceptance must take a user action after the failure and assert that the unavailable text survives.

5. [P3] Choice of solution: the brief should rule out the document-relative fetch URL as the primary fix now.
   - Patching only fetch("./buildings.json") leaves the document base URL wrong for every other relative reference. The "Back to 3D Game" link is href="../" (index.html:305). From /field-guide it works by coincidence locally (it resolves to "/"). Under /tenderloin-redux/field-guide with no slash it would resolve to "/", the wrong site root.
   - Any script heuristic that guesses the mount directory from location.pathname also misfires on file:///…/tools/field-guide/index.html.
   - The server redirect fixes the base for all relative references at once.
   - Fix: recommend the server canonical redirect (scripts/serve-godot.mjs) plus loader truthfulness (item 2). Drop the document-relative fetch URL rather than combining it.

6. [P3] The redirect needs a behaviour contract written down, or it will regress silently.
   - serve-godot.mjs:13 derives `name` from pathname only. A redirect built from `name` drops ?query.
   - Required contract:
     - Location is "/field-guide/" plus the original search string.
     - The fragment is left to the browser.
     - Use a non-permanent status (302/307), or send Cache-Control: no-store, so a stale permanent redirect is not cached in the user's main browser profile.
     - HEAD and GET behave the same.
     - The existing /field-guide/buildings.json special case (serve-godot.mjs:14-19) and its no-store header stay unchanged.
   - Also state the preservation argument explicitly: localStorage is per-origin, not per-path, and the redirect is same-origin, so records stored under /field-guide remain visible at /field-guide/. Without that sentence, "preserving notes" is unproven for the redirect option.

7. [P4] Failure injection must not touch the original data. [P3] says do not change the original data, but [P4] asks for injected 404, malformed and empty responses without saying how.
   - Fix: require interception at the browser request layer (Playwright route or the CDP Fetch domain) against the unmodified server. Assert that the sha256 of godot/data/buildings.json (baseline 8b3afd7a… in route-observation.json:8) and of tools/field-guide/index.html are unchanged before and after the test run.

8. [P4] "Note/record preservation" needs an oracle, and the brief forbids opening real user records ([P2], [P5]).
   - Fix: seed a synthetic fixture under key "tenderloin-redux.field-guide.v1" (index.html:587). Include stop notes, one tiny dataUrl photo, and one building tag with facade/trim.
   - For each case (slash, no-slash, 404, malformed, empty, network-abort), assert two things:
     (a) the localStorage value is byte-identical after load;
     (b) the Export Field Pack payload (index.html:1202-1213) is identical to the success-case payload except for exportedAt.
   - Today (b) holds because the fallback ORIGIN (index.html:386) equals buildings.json origin (godot/data/buildings.json:3-6). The test locks that in.

SHOULD-FIX

1. [P3] Malformed geometry is under-specified, and the click path crashes on it.
   - Drawing tolerates bad rings (index.html:712-714).
   - selectBuilding dereferences b.polygons[0].rings[0] and b.height_m.toFixed (index.html:980, 984) with no guards. A building with a valid ring but no height_m, or whose polygons[0] is empty while a later polygon was hit (index.html:1129-1131), throws inside the pointerup handler.
   - Fix: filter or validate entries once at load. Report "N of M footprints usable", and reach "unavailable" when N = 0. Add one injected record with a missing height_m to the malformed case and click it.

2. [P4] "Meaningful map pixels" needs a concrete oracle. The canvas is never empty on failure: the background (index.html:690), the hard-coded stop route and the markers (index.html:740-770) still draw.
   - Fix: sample canvas pixels at a known footprint centroid. Expect the opening-zone fill #c87d55 or the wider fill #756a5a (index.html:729-731) on success. Expect them absent, with background #132226, on failure. Then do one real pointer click on that centroid and assert that #bldgCard becomes visible.

3. [P3] Twin defect left out of scope. The /browser mount has the same no-slash bug class.
   - public/index.html uses ./style.css, ./game.js and ./icon.svg (lines 9, 10, 48). From /browser these resolve to /style.css, /game.js and /icon.svg, which are served from artifacts/godot-web/. That directory contains index.html but none of those three files (glob check).
   - The redirect predicate on serve-godot.mjs:21-22 can cover /browser too, with zero bytes changed in public/.
   - Fix: either include /browser in the same one-line rule, with the same acceptance, or name it as a known out-of-scope twin. Do not leave it unmentioned. Verify with a browser observation first.

4. [P2] Evidence gap: route-observation.json:31-44 logs two "404 (Not Found)" console errors, but the requests array records only one 404 (/buildings.json). The field guide has no <link> or <img> (grep). Verify the source of the second 404, likely an auto /favicon.ico; it is absent from the with-slash case. The "zero unexpected external requests" acceptance in [P4] should list every request, not a filtered subset.

5. [P1] "imported/current notes" ([P3]): tools/field-guide/index.html has no import path. State is loaded only from localStorage (index.html:595-603). Verify what "imported" means here. If it refers to the game-side "preserve imported data" work (commit 87cf3b5, public/), it is out of scope for this tool, and the word should be dropped so acceptance does not chase a non-existent feature.

6. [P4] Where the acceptance test lives is unstated.
   - No existing test exercises the field guide in a browser. tests/godot-browser.mjs targets 4174 but aggregates game verifiers only (imports at lines 12-25).
   - tests/apply-field-survey.test.mjs:26-52 string-matches tag literals in index.html, so it must stay green.
   - Fix: name a single new verifier (for example tests/field-guide-browser.mjs, wired into package.json) instead of another one-off artifacts/*.mjs script.

7. [P4] "Full all-five" and "sole-Claude r3" are undefined in this document. Verify which five suites or gates are meant (package.json has test, test:browser, test:voices, test:civic, test:film, godot:browser, …) so the post-build gate is checkable.

OPTIONAL / NICE-TO-HAVE
- Report the unavailable reason in user terms: "map file not found", "map file unreadable", "map file has no footprints". Put the HTTP status and parse error in console only.
- serve-godot.mjs binds 127.0.0.1 only (line 37), and localStorage for "localhost" is a different origin. One sentence in docs that notes live with the exact host used would prevent "my notes vanished" reports. Do not change the server binding.

CUT THESE
1. [P3] Document-relative or "robust" asset URL computed in script. Item 5 above shows it is dominated by the redirect, fragile under file:// and base paths, and leaves "../" wrong. Safe to cut: the redirect plus truthful status covers every case the fetch patch would.
2. [P3] Retry. The asset is a same-origin static file, and every observed or injected failure (404, parse, empty) is deterministic, so retry cannot succeed where a page reload would not. Safe to cut: the unavailable message can say "reload the page" at zero state-machine cost.
3. [P4] "Compare prior art/originality". This is a two-part fix (trailing-slash redirect plus honest load status) with well-known precedent in static servers. An originality survey adds review surface and no decision value. Safe to cut.
4. [P4] "Retain source/PCK". The slice touches scripts/serve-godot.mjs and tools/field-guide/index.html only, and no Godot export is involved. Retain source hashes; PCK retention is ritual for this slice. Safe to cut unless the all-five gate itself rebuilds the PCK (verify).
5. [P3] Storage-quota language beyond one disclaimer sentence. saveState already swallows quota errors with console.warn (index.html:606-610). The brief rightly excludes fixing that. Keep the single disclaimer and do not design around it, so the slice does not creep into save handling.
