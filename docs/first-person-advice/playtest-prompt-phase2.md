# Playtest prompt for Codex and agy: street view, Phase 2

Same prompt for both, so the results can be compared. This replaces the Phase 1 prompt for the next round. It fixes three gaps the first round showed: a tester could not tell which build it had, it had no list of what was already known, and it had to guess which behaviours were by design.

- **Codex:** open Codex on `C:\tenderloin-redux` with its browser or shell tools enabled, and paste everything below the line with `<TOOL>` replaced by `codex`.
- **agy:** run agy in a mode that can use its browser (not plan mode), from `C:\tenderloin-redux`, with everything below the line as the prompt and `<TOOL>` replaced by `gemini`.

Run it only once Claude says the Phase 2 build is being served on port 4194. Run one tester at a time if the machine is also running a verification. Do not run `npm run godot:export` while a tester is playing.

---

You are a playtester for Tenderloin Redux, a free, peaceful browser game set on Turk Street in San Francisco. The 3D edition's **Phase 2** build is served locally at http://127.0.0.1:4194/. It adds look and movement controls to **street view**, an optional eye-level camera on the opening block. Test it like a careful player first and a QA engineer second. Do not edit any file in the repository. Do not open any other website.

## 0. Check the build first

Before playing, fetch `http://127.0.0.1:4194/index.pck` and compute its SHA-256. It must be:

```
b8ca13f1589cee21eaa727be3ff75596eba2df6e03b8baddf348bca0da75063a   (1,503,448 bytes; commit 8285794)
```

After the game loads, `window.__tenderloinGodotA11ySnapshot.street_view` must contain the keys `turn`, `fov`, `capture`, `stick` and `reduced_motion`. If the hash differs or those keys are missing, stop and report only that: you have the wrong build. Put the hash you measured at the top of your report.

## How to drive the game

Use your own browser tool, or Playwright from this repository: `PLAYWRIGHT_MODULE=C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`, Chrome channel, **headed** if you can (pointer lock needs a real window), with scripts you write in a new folder `artifacts/playtest2-<TOOL>/` (git-ignored). The game draws on one `<canvas id="canvas">`; there are no HTML buttons. On-screen buttons are listed in the snapshot with `x`, `y`, `width`, `height` in game-viewport pixels; scale by `canvas.width / snapshot.viewport_width` if they differ. `announcement` is the latest screen-reader text. Wait for `document.querySelector('#status')` to be hidden before playing; the first load can take a minute.

`street_view` in the snapshot reports: `active`, `enabled`, `yaw_deg`, `pitch_deg`, `projection` (0 eye level, 1 map), `eye`, `button`, `stick` (visible, name, rectangle), `turn`, `fov`, `keep_aspect` (0 is KEEP_WIDTH, 1 is KEEP_HEIGHT), `mouselook`, `mouselook_button`, `capture` (`released`, `requested`, `locked` or `denied`), `capture_requests`, `reduced_motion` (`on`, `saved`, `system`, `visible`, `toggle`, `text`), `contacts` (roles of held contacts) and `taps_routed`.

Controls: Start Exploring (the opening card's button, or Enter). Street view: **Shift+F** or the "Street view" button at the top right of the scene. In street view:
- **Look:** drag anywhere on the street with the left mouse button or one finger (past 8 px it turns; a short tap acts instead). Right-drag also turns. **Shift+Left/Right** turns, **Shift+Up/Down** tilts.
- **Walk:** **W A S D** or arrows. On a touchscreen, a **walk stick** sits at the bottom left; a second finger can look while the first walks. Keys win over the stick.
- **Tap:** a short tap or click on a neighbour or a sign acts on it.
- **Mouse look** (desktop only, off by default): the "Mouse look" toggle under the street button. When it is on, a click on the street asks the browser to hold the pointer; moving the mouse then turns the view, and **Esc** releases it.
- **Leave:** **Shift+F** or "Map view".

Other keys: plain **F** is Find Me, **L** opens the Tenderloin map, **G** the block actions, **T** talks to a nearby neighbour, **Esc** says goodbye or stops walking. **Reduced motion** is a button in **Info** (the header's details), beside "Before These Streets", shown while you are idle; it cycles system setting, on, off.

## What is designed this way (do not report these as bugs)

- Street view covers only the opening block. West of Taylor Street (x below -50) it hands back to the map view **once** and says so; it does not come back on its own.
- Conversations hand back to the map view and return to the street at your position afterwards.
- The Mouse look toggle is hidden on touchscreens and on very short windows. A browser that refuses the pointer lock turns the toggle off and says "The browser did not allow mouse look."
- While the pointer is held, clicks do nothing (there is no crosshair yet). A panel, conversation, map or focus loss releases it.
- With reduced motion on, the trees, speech bubble, guide marker and burst gems stop moving; the burst ring still widens and lifts.
- Settings are saved only under `tenderloin-redux.godot.settings.v1`. The keys `tenderloin-redux.save.v1` and `tenderloin-redux.settings.v1` must never be written; if either appears in `localStorage`, that **is** a blocker.
- The limit is the line x = −50 at Taylor Street, not the edge of the 100 Block; a block-shaped boundary comes later.
- The gold marker and the "Talk to … · T or tap" prompt still sit at their map heights, above the top of the eye-level view up close. Lowering them is scheduled for Phase 4.
- Shift+Up/Down tilt is not announced (headings are; the game never narrates continuously). The heading and the tilt are kept between visits to street view.
- Zoom In/Out do nothing at eye level; they say that zoom works in the map view.
- Street-name banners and nameplates are hidden behind walls at eye level. A banner hanging in front of a wall is not behind it.
- The Info box in the header scrolls; a line cut at its bottom edge is the scroll position, not clipping. A greeting waits for the reward banner to clear before its reading time starts.

## Already reported (recheck these; they do not count as new bugs)

From the Phase 1 round (Codex and agy), against the older build, all fixed in this one. For each, say **fixed**, **still happens** or **could not check**, with the snapshot values:

1. Holding W into the western limit makes the view flip between street and map many times a second, and the hand-back does not say why.
2. Tapping Bea's face up close starts a walk past her instead of talking to her.
3. With the objective directly behind, the guide arrow points ahead. It should sit low and point down.
4. At 390×667 the Map view button covers the guide arrow at some headings.
5. On a phone, dragging cannot turn the view (Phase 2 adds drag-look and the walk stick).
6. Shift+F on the opening card dismisses it with the music off; Shift+F with a chat or the block hub (G) open drops the chat without a goodbye or opens street view under the hub.
7. The gold diamond draws through the Portable Mural board.

## What to test

Play at three sizes, each in a fresh browser profile: desktop **1100×760** with a mouse; phone **390×667** with touch (`hasTouch: true`, real touchscreen taps and CDP touch drags); phone **320×667** with touch. For each size:

1. **Look around.** Enter street view. Turn a full circle by dragging (and by Shift+arrows on desktop). Check a short tap still acts and a drag never does. Tilt up and down to the limits.
2. **Walk.** Desktop: keys. Phones: the stick only, then the stick while a second finger looks. Walk to Bea, along a building, around the Taylor corner and back. Note anything that blocks you oddly, lets you through a wall, or turns the view unexpectedly. Rotate the phone viewport (390×667 to 667×390 and back) while holding the stick: the walk should carry on.
3. **Turn settings and field of view.** The street view settings are not in the menu yet; read `turn` and `fov` and confirm the defaults (`snap30`, 70). In portrait, check the view does not look zoomed in compared with landscape (`keep_aspect` should be 0 in portrait, 1 in landscape).
4. **Mouse look (desktop).** Turn it on, click the street, move the mouse, press Esc. Then: open a conversation while locked, press L while locked, switch tabs while locked, and hold the right button while clicking. After each, check the pointer is free, `capture` is `released`, and plain mouse movement does not turn the view. If your browser cannot grant a lock, report what the game said and test the refusal path instead.
5. **Reduced motion.** Open Info, cycle the Reduced motion button through its three states, and check the trees, the speech bubble and the gold marker move or stand still to match. Reload and check the choice is kept. Run once with Chrome's `prefers-reduced-motion: reduce` emulated and once without.
6. **Talk and come back.** Talk to Bea by tap and by T. Check her words are readable and that you return to the street where you stood.
7. **Edges.** Tap the sky and far down the street. Press the street button repeatedly. Press Shift+F with a panel open. Open the Tenderloin map (L) and come back with Find Me. Resize between sizes in street view. Click in the thin margin at the edge of the scene. Recheck the four known bugs above.
8. **Map view unchanged.** In a separate fresh profile that never turns street view on, play two minutes of the normal map view at 1100×760 and 390×667 (walk, zoom, drag to pan, right-drag to rotate, meet a neighbour). Report anything that a first-time player would find wrong.
9. **Accessibility.** After each action, read `announcement`: is it clear and correct? Is every button at least 44 px and inside the screen, including Mouse look, the stick and Reduced motion? Can steps 1, 2, 6 and 7 be done without a mouse on desktop?
10. **Storage and console.** Record `localStorage` keys at the end of each profile. Collect console errors and warnings for the whole session.

## Report

Write Markdown to `docs/first-person-advice/playtest2-<TOOL>.md` (create or overwrite), under 1,800 words, with screenshots in `artifacts/playtest2-<TOOL>/` referenced by file name. Structure:

1. **Build**: the SHA-256 you measured and the snapshot keys you saw.
2. **Summary**: three sentences on how the Phase 2 controls feel and the single most important problem.
3. **Known bugs rechecked**: one line each for the seven above.
4. **New bugs**, most severe first, each with: severity (blocker, major, minor, polish), size, exact steps from a fresh load, expected, actual, the `street_view` and `announcement` values when it happened, a screenshot file name, and whether you reproduced it twice in fresh profiles.
5. **Readability and feel**, per size.
6. **Accessibility findings.**
7. **Storage and console**: `localStorage` keys per profile; console errors verbatim, deduplicated.
8. **What you could not test** and why.

End with the line `PLAYTEST-COMPLETE <new bugs found>/<new bugs reproduced twice>` and print that line.

You will be scored on new bugs that the maintainer can reproduce from your steps. Unreproducible or speculative reports, reports of designed behaviour listed above, and reports from the wrong build count against you, so report only what you saw on the build you checked.
