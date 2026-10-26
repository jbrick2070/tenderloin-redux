TOOL CHECK: PASS (read docs/BEFORE_THESE_STREETS_SOURCES.md, docs/GODOT_APPROACH.md, docs/ROADMAP.md, godot/main.gd, godot/story_picker.gd, godot/shared_meal.gd, tests/godot-browser.mjs)

VERDICT: yes-with-fixes. Option A is buildable from existing patterns, but the plan has not settled where the opening goes in the story, what the player is left with afterwards, or where the entry point and source reader live. Each of those either runs into a real code constraint or contradicts the plan's own representation rules.

MUST-FIX BEFORE BUILD

1. [§3A / §1 "historical opening"]: the arc places living Ramaytush/Yelamu people in a "before" sidebar.
   Defect: The title "Before These Streets" and Option A's sequence (sand tray, then an observation, then a Bea response, then the present-day block) run from geology straight to fictional present-day residents. Ramaytush/Yelamu appear only as a "distinct present/past panel". docs/BEFORE_THESE_STREETS_SOURCES.md:5 forbids framing the people "as vanished or part of geological prehistory". A side panel inside a "before" sequence does exactly that, however the panel itself is worded. The third observation choice, "living place", makes it worse. It is the one choice that touches people, and it earns a FICTIONAL resident's reply. That puts Bea in the position of mediating Indigenous presence.
   Fix: Show the sourced Ramaytush/Yelamu text as a present-tense frame at entry and exit ("today, ..."), not as a step in the timeline. Reword or drop "living place" so that no observation choice is about Indigenous people. Limit Bea's reply to her own fictional present-day relationship to the sand and wind process. She must never paraphrase or speak about Ramaytush history.

2. [§3A "deliberate transition to the existing opening" / §4 "revisit at any progress"]: the destination of the transition is undefined.
   Defect: "The existing opening" is not one thing. At startup, main._ready (godot/main.gd:2064-2066) shows current_chapter(). For any save with block_opened, that is chapters 2-6 (godot/main.gd:7296-7308), not Chapter 1 "Get the Block Ready" (godot/main.gd:70). A revisit at chapter 6 that "transitions to the existing opening" must either:
   - show Chapter 1 intro text that contradicts saved progress, or
   - show the chapter 6 card, which is not an "opening".
   Fix: Define it explicitly. The transition always returns to the card the player came from: the startup card with its "Start Exploring" button if they launched from startup, otherwise the street with focus restored. Never show a different chapter card.

3. [§4 startup entry]: the startup card cannot take a second action as drafted, and the music gesture depends on it.
   Defect: build_story_card (godot/main.gd:7338-7349) has one right-aligned HBox row holding a single 140x44 button. layout_story_card budgets "chrome" from story_continue_btn alone (godot/main.gd:7377). At 320 px the card is 296 px wide, about 268 px of content after margins. Two whole-word 17 px buttons ("Before These Streets" plus "Start Exploring") will not share that row. tests/godot-browser.mjs:2263-2264 also reads this startup card at 640x360, 599x360, 520x360 and 320x568, and :2250/:2375 assert that music waits for, and then starts on, Start Exploring.
   On top of that:
   - continue_story only starts music and frames the player when startup_story_pending is true (godot/main.gd:7424-7432).
   - story_picker.open_picker refuses while startup_story_pending or while the card is visible (godot/story_picker.gd:84).
   - shared_meal.open_meal refuses for the same reasons (godot/shared_meal.gd:105).
   So there is no existing overlay that opens over the startup card.
   Fix: Specify all of the following:
   (a) The second button goes in a wrapping or vertical row, and layout_story_card's chrome includes it.
   (b) Opening the scene from the card hides the card using the saved-visibility pattern and leaves startup_story_pending untouched.
   (c) Closing, skipping or transitioning restores the card with "Start Exploring" focused, so the first music activation is still that button.
   (d) Escape inside the scene closes the scene. It must not reach continue_story(false).

4. [§4 "existing Info reader entry"]: the Info reader cannot serve as either the revisit entry or the 16 px source reader.
   Defect: "Info" (godot/main.gd:15646-15658) toggles `info`, a 12 px RichTextLabel inside the header (godot/main.gd:15672-15681). main.gd assigns info.text in 86 places, for example frame_player_for_walking at :7457 and import errors at :13555. That makes it a transient status sink. A revisit button or source list placed there would be overwritten. The browser test also asserts header_details_expanded == false and header height <= 130 at startup (tests/godot-browser.mjs:2256-2257).
   Fix: The source reader lives inside the opening Control as its own 16 px make_activity_detail reader, as story_picker does (godot/story_picker.gd:48-52). The post-startup revisit entry needs one stable location, chosen now. My recommendation: a single 44 px header button next to Info, outside the 13-button BlockPanel (docs/GODOT_APPROACH.md:11). Re-verify the header-height assertion once it is added.

5. [§4 gating]: there is no central focused-activity registry. A partial integration will cause chapter cards to pop over the scene and let input leak through.
   Defect: The focused-activity visibility list is duplicated, and the copies already diverge:
   - is_focused_activity_visible at godot/main.gd:12063 includes mural_workshop.
   - The lists at :7703 and :12142 omit mural_workshop.
   - Escape is routed by a per-overlay chain around :14620-14660.
   - Close-on-reset/load/import lists sit at :12503, :13000 and :13575.
   update_conversation_ui (:7705-7710) delivers pending chapter cards whenever the overlay is missing from :7703.
   Fix: The plan must list every site the new Control registers in: :7703, :12063, :12142, the Escape chain, and the three close sites. It must also add one native assertion that a chapter card does not appear while the opening is visible.

6. [§1 / §3B "carry one chosen observation to the block" / §4 "no new save key"]: the observation has nowhere to land.
   Defect: The creator asked for "start and end" (§1; docs/ROADMAP.md:5). With visit-only state and no save key, the chosen observation and Bea's reply disappear on reload. The planned helper-robot ending (docs/ROADMAP.md:21) can never refer back to it. So the opening is a detachable prologue, not a start. "Carries to the original block" (§3B) and "retained revisit entry" (§3A) promise continuity the state model cannot provide.
   Fix: Either
   (a) say explicitly that the opening is a standalone, stateless prologue, and drop the "carries/earns" language, or
   (b) state now the single thing the block reflects this visit, for example one line of Bea's world dialogue, and accept that it resets on reload.
   Do not add a save key. Do decide the bookend relationship to the ending in this r1 so the robot stage does not have to retrofit it.

SHOULD-FIX

1. [§1 baseline claim]: "clean except preserved historical untracked landmark folder" is false right now. git status shows docs/BUILD_STATUS.md, docs/ROADMAP.md and session_handoff.md modified, and docs/BEFORE_THESE_STREETS_SOURCES.md untracked. The source-authority document this slice depends on is not committed. Fix: commit or record those files as part of the baseline before the build.

2. [§3A visuals / §5 "no media generation"]: the rendering approach is unstated. No .gd file in godot/ uses _draw or Polygon2D. The existing precedent is an SVG string rasterized with Image.load_svg_from_string into a TextureRect (godot/shared_meal.gd:56-58 and :318-326; same TextureRect setup in godot/film_screening.gd:42-44). "Sends gusts across" suggests continuous animation, and SVG rasterization per frame is unlikely to be cheap on the Web export ([ASSUMPTION]; verify: per-frame SVG raster cost in the web build). Fix: commit to a small set of discrete tray states, each a deterministic SVG, with at most a tween between them. That also makes the §4 "distinct choices / pixels before/after" test deterministic.

3. [§1 "historical" vs content]: what is actually sourced is a regional geological process (docs/BEFORE_THESE_STREETS_SOURCES.md:8) plus present-day tribal identity statements (:5-7). Nothing covers the transition the title names, from dunes to "these streets" ([ASSUMPTION]: the 19th-century grading of San Francisco's sand hills for the street grid; no source in the doc). Fix: either add a dated primary source for the dunes-to-grid transition, or rename/reframe so the opening does not claim to be "history of these streets" without it.

4. [§4 accessibility]: the core consequence is visual, but the plan only specifies pixel tests. Fix: each tray state needs an announce_a11y_status text equivalent (the bridge exists, e.g. godot/main.gd:7405), and the test should assert that the text changes per gust and per choice.

5. [§3A "reverses/revisits"]: "reverse" as a mechanic reads as blowing the wind backwards, which is not a sourced process. Fix: present it as UI Back/Undo through viewed states, not as a physical reversal.

6. [§4 "refusal during active episode/route"]: this conflicts with "revisit accessible at any progress". shared_meal refuses when active_story_episode() is set or current_path is non-empty (godot/shared_meal.gd:104-106). Fix: state that the revisit uses the same refusal and messaging, so "any progress" means "any chapter", not "any moment".

OPTIONAL / NICE-TO-HAVE
- The sources doc links Never Alone as prior art. Say explicitly in-game that this slice is not community-authored, rather than relying on the absence of claims.
- There is no reduced-motion setting anywhere in main.gd. If gusts animate, the discrete-states approach (should-fix 2) covers this.
- Source links appear as text in the reader only, with no auto-open (consistent with docs/BEFORE_THESE_STREETS_SOURCES.md:12). State that the reader contains no clickable OS.shell_open call.

CUT THESE
1. [§3B Foldout] and [§3C Viewpoints]: once A is chosen, reject them in one line each and do not carry their mechanics into A. B's "carry an observation" is already causing the continuity defect in must-fix 6, and C needs either matched surveyed views or a new camera, both of which §3 rules out.
2. [§3A three observation choices]: two non-Indigenous process observations (for example "shifting shapes" and "long time") are enough to prove that distinct choices produce distinct responses, and removing "living place" also clears must-fix 1. Safe because §4 only requires "distinct choices".
3. [§4 "Consider ... existing Info reader entry"]: one entry after startup is enough (see must-fix 4). Two entry points double the work on focus-return, Escape and test paths for no player benefit.
4. [§1 robot-workshop description]: keep only the single bookend decision from must-fix 6 and drop the rest from this r1. The ending is out of scope for this pass (§1: "this pass is ONLY the opening").
5. [§5 process text]: the gate inventory (106+Node, 6 fresh phone, 4 actual pinch, 3 genuine voting) restates the existing regression bar. Point to session_handoff/BUILD_STATUS instead of re-listing it. Safe because none of it changes the design.
