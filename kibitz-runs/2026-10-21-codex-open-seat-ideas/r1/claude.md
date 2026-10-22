TOOL CHECK: PASS. Read input.md, godot/main.gd, godot/mural_stories.gd, public/film.js, public/game.js, docs/ROADMAP.md, docs/GODOT_APPROACH.md, godot/tests/study_test.gd, and grepped tests/godot-browser.mjs.

Section ids used below: [Brief] = input.md lines 1-3, [Anchor-VERDICT/CONFIRMED/MUST-FIX/SHOULD-FIX/UNVERIFIABLE] = input.md lines 5-10, [Scope] = input.md lines 12-13.

VERDICT: yes-with-fixes. Option (A) is the right slice, but the brief presents it as a new "original screening experience". It is really a Godot catch-up to a browser screening that already ships. The brief also misses three source facts that decide the design: Godot never shows captions today, the quiet/later choice is only visible through captions, and the caption text differs between the two tracks.

MUST-FIX BEFORE BUILD

1. [Brief] (A) and [Anchor-CONFIRMED]: wrong framing of prior art and originality.
   - The browser 0.12.0 track already has a manual screening reader. public/game.js:204 shows, in the done phase, the SVG frame, a figcaption from filmCaption(), three frame buttons with aria-pressed and a remembered-ending line. public/game.js:198 adds alt text that depends on framing.
   - So (A) is not new in the project. In Godot it is a parity port. Godot today only offers the hub "Watch Film (n/3)" button (main.gd:14693), which cycles film_screen_frame (main.gd:10110-10116) and recolours the easel.
   - The brief asks for "project-native prior art/originality (no unsupported universal novelty)". Its own framing breaks that rule.
   - Fix: restate (A) as "Godot parity with the browser screening (public/game.js:193-205), plus a painted world easel". Use the browser reader as the behavioural spec: frame order, caption source, alt-text wording, remembered-ending line. Do not invent a new screening flow.

2. [Anchor-CONFIRMED] and [Anchor-MUST-FIX] "full readable original narrative/captions": Godot captions are dead code. Nothing in the anchor says so.
   - FILM_SHOT_QUIET_CAPTIONS and FILM_SHOT_LATER_CAPTIONS (main.gd:137-146) are declared but never referenced anywhere in godot/. A grep finds only the declarations.
   - The quiet/later plan has no visual effect. build_film_frame_svg (main.gd:9354-9381) and filmFrameSVG (public/film.js:67-74) read only framing and shot id. In Godot, the plan choice shows up after completion only in neighbour memory lines (main.gd:10160-10173).
   - Fix: make captions a required, testable part of the slice. Contract: caption(plan, shot) comes from the existing constants. Each of the 2x3 plan/shot combinations shows its caption in the reader. The "later" plan shows the dialogue captions. Without this, the player's quiet/later choice still has no visible result in the screening.

3. [Anchor-MUST-FIX] "copied ... captions" plus export parity: Godot and browser caption text are not byte-equal. The brief assumes a single source.
   - main.gd:139 has "A neighbor's shape" with a straight apostrophe. public/film.js:4 has "A neighbor’s shape" with a curly one.
   - main.gd:143-145 use \"...\" straight quotes. public/film.js:56 uses “...” curly quotes.
   - Fix: before coding, decide which text is canonical, and either align main.gd to film.js or record the difference as intentional. If acceptance includes "caption matches browser", the current constants fail it. Verify: whether any browser-save import or test compares caption strings.

4. [Anchor-MUST-FIX] "Preserve ... old photo/SVG parity": captions must stay out of the SVG.
   - Parity is asserted byte-for-byte: tests/godot-browser.mjs:1692-1694 compares the film_frame sample (main.gd:11231) with filmFrameSVG.
   - Putting caption text into the SVG would break parity. It would also add a font dependency to rasterising with Image.load_svg_from_string, since the current film SVG has no <text>, only a <title>.
   - Fix: state as a contract that build_film_frame_svg and filmFrameSVG stay unchanged. Show captions as a separate Godot Label or RichText under the raster, and allow scrolling when space is tight.

5. [Brief] "optional finite playback" vs [Anchor-SHOULD-FIX] "no ... timers, forced autoplay": the two sections contradict each other, and playback goes beyond parity.
   - The browser reader (public/game.js:204) has no playback.
   - Adding playback only in Godot would break parity. It would also need its own timer lifecycle (Back, Escape, pagehide and _notification), reduced-motion rules and acceptance tests.
   - Fix: cut playback (see CUT 1). A manual reader with three frames is the complete feature.

6. [Anchor-CONFIRMED] "Watch Film advances frame index": the entry-point and input contract is undecided, and legacy tests depend on it.
   - Today film_phase=="done" makes three inputs cycle frames: the hub button (main.gd:10110), Period, and Shift+Period (cycle_film_choice_or_frame, main.gd:10067-10071).
   - study_test.gd:1206 requires film_set_screen_frame to change the frame without writing a save. study_test.gd:1221 requires a reload to reset film_screen_frame to 0. study_test.gd:1939 requires the button text to contain "Watch Film".
   - BLOCK_ACTION_COUNT is 12 (main.gd:809). The anchor says the All Actions list must stay at 12 legacy titles, which rules out adding a new hub entry.
   - Fix: write down one choice before coding. Recommended: in the done phase, the existing block_film_btn opens the reader. Period in the done phase keeps cycling frames, so the legacy behaviour holds. While the reader is open it is modal: it consumes Period/Shift+Period, the 1-5 neighbour keys and WASD. Back/Escape returns focus to block_film_btn.
   - State contract: the reader's frame index is film_screen_frame. Add no new variable and no save key. Closing the reader keeps the index, and reload resets it to 0, as today.

SHOULD-FIX

1. [Anchor-SHOULD-FIX] "reuse existing original frames on the existing world easel": name the prior art and its traps.
   - The pattern already exists: mural_stories.gd:93-101 calls Image.load_svg_from_string, wraps the result in ImageTexture, and caches up to 6 textures. main.gd:3248-3254 applies it to the canvas BoxMesh with uv1_scale Vector3(3,2,1) to cancel BoxMesh's 3x2 face atlas.
   - The film canvas is also a BoxMesh (main.gd:3048-3050), sized 0.96x0.62, an aspect ratio of about 1.55. The SVG is 420x236, about 1.78 (main.gd:9375). Mapping it directly stretches the framing the brief says to honour.
   - Fix: name mural_stories.texture() as the pattern. Require letterboxing or a canvas resize so the aspect ratio is kept. Cache by (framing, shot): there are only 6 combinations.

2. [Brief] "large readable optional screening": a raster at native size will be blurry.
   - The prior art rasterises at the default scale. A 420x236 image upscaled into a large panel at 1100x760 will look soft.
   - Fix: rasterise the reader copy at a higher scale (load_svg_from_string takes a scale argument). Keep the easel texture small.
   - Verify: that the Web export (Compatibility renderer) handles the larger image within budget.

3. [Anchor-UNVERIFIABLE] "full screen-reader": a text alternative is still needed.
   - The browser gives each frame alt text that depends on framing (public/game.js:198). Godot today announces only "Viewing The Open Seat Frame n/3: <label>." (main.gd:10017).
   - Fix: on each frame change, send an announce_a11y_status line that carries the same alt text plus the caption. This can be checked through #godot-a11y-status even though real speech can't be.

4. [Anchor-SHOULD-FIX] "no need to create new buildings/screen furniture": build the reader as a module, not inside main.gd.
   - main.gd is past 15,000 lines (main.gd:15087 exists). mural_stories.gd and mural_workshop.gd already show the sibling-module pattern for a bounded panel.
   - Fix: put the reader in its own file, e.g. a film_screening.gd that copies the mural_stories.gd setup/present/snapshot shape. main.gd keeps the state and callbacks.

5. [Brief] (B) and (C): the comparison is a straw man.
   - [Anchor-VERDICT] has already picked the film. (B) is one vague phrase and (C) has no content.
   - Cheap way to cover (B) without new state: the reader's done view can show the existing remembered neighbour lines (main.gd:10160-10173, public/film.js:58-65), as the browser's #film-memory line does. That gives a "resident consequence" with no new save key. Fix: say this outright and reject any (B) variant that needs a new persisted flag, because it would grow the save envelope.

6. [Anchor-MUST-FIX] "4096 budget": add a zero-growth acceptance check.
   - Fix: if the slice adds nothing persisted, require measure_local_performance().save_bytes (main.gd:11175, 11195) to be identical before and after on a fully completed save. That is stricter and easier to check than "≤ 4096".

7. [Anchor-CONFIRMED] "exact export parity contract": the claim is broader than what is tested.
   - Byte parity is checked for one sample only, close/quiet/seat (main.gd:11231). Wide framing, which adds hands and a table edge, is checked natively only for colour presence (study_test.gd:1381-1383), not compared byte-for-byte with film.js.
   - Fix: if the easel or reader shows wide frames, add a wide-framing parity sample, or reword the claim to "one-sample parity".

OPTIONAL / NICE-TO-HAVE

- Mirror the browser's done-view footnote in the reader, which states that no real camera, microphone, permit or recording is involved (public/game.js:205).
- Render pixel acceptance as: the easel's material albedo_texture is non-null and differs across the 3 shots and 2 framings. That can be checked in a headless snapshot, like mural_scenes_snapshot (main.gd:11343-11348).
- [ASSUMPTION] The easel art may not be readable from the default isometric camera (CAMERA_OFFSET Vector3(180,180,180) per docs/GODOT_APPROACH.md:8). The reader, not the easel, should be the readable surface, and the easel is decoration. Verify with a capture at the easel's stand position.

CUT THESE

1. Optional finite playback ([Brief] line 3). The browser reader has none, so cutting it keeps parity. It also removes the timer lifecycle and the extra acceptance tests. Three manual frames are the whole film.
2. Any new screen, projector or building furniture, and any new hub entry. The existing FilmStoryboardEasel (main.gd:3035-3078) and block_film_btn cover both surfaces. A new hub entry would break the 12-title rule.
3. Any new persisted "screening watched" flag or (B)-style gathering state. It grows the save, the import mapping (main.gd:13117-13124) and the legacy-save matrix, for a cosmetic gain. Existing neighbour memories already carry the consequence.
4. Captions or titles drawn into the SVG. This would break byte parity (tests/godot-browser.mjs:1692-1694) and add a font dependency to rasterising.
5. Making the plan choice change the illustration. This is tempting because the plan currently has no visual effect, but it would change both SVG builders and break the frozen export. Captions already carry the plan.
