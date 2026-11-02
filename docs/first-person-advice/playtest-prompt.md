# Playtest prompt for Codex and agy: street view, Phase 1

Same prompt for both, so the results can be compared. Run it after the current verification runs finish (they share the machine and the local server).

- **Codex:** open ChatGPT Codex on `C:\tenderloin-redux` with its browser or shell tools enabled, and paste everything below the line with `<TOOL>` replaced by `codex`.
- **agy:** run agy in a mode that can use its browser (not plan mode), from `C:\tenderloin-redux`, with everything below the line as the prompt and `<TOOL>` replaced by `gemini`.

Before starting, check that `http://127.0.0.1:4190/` loads the game. If it does not, from `C:\tenderloin-redux` run `node scripts/serve-godot.mjs` with the environment variable `GODOT_PORT=4192` and use port 4192 instead. Do not run `npm run godot:export` while another session is testing.

---

You are a playtester for Tenderloin Redux, a free, peaceful browser game set on Turk Street in San Francisco. The 3D edition is served locally at http://127.0.0.1:4190/ (or 4192 if you were told to use it). A new optional feature, **street view**, has just been built: an eye-level camera on the opening block. Test it like a careful player first and a QA engineer second. Do not edit any file in the repository. Do not open any other website.

## How to drive the game

Use your own browser tool, or Playwright from this repository: `PLAYWRIGHT_MODULE=C:/Users/jeffr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`, Chrome channel, with scripts you write in a new folder `artifacts/playtest-<TOOL>/` (that folder is git-ignored). The game draws on one `<canvas id="canvas">`; there are no HTML buttons. The game publishes its state for testers at `window.__tenderloinGodotA11ySnapshot`: every on-screen button appears there with `x`, `y`, `width`, `height` in game-viewport pixels (scale by `canvas.width / snapshot.viewport_width` if they differ), and `street_view` reports `active`, `enabled`, `yaw_deg`, `pitch_deg`, `projection` (0 is perspective, 1 is the map), `eye` and `button`. `announcement` is the latest screen-reader text. Wait for `document.querySelector('#status')` to be hidden before playing; the first load can take a minute.

Controls: Start Exploring (the opening card's button, or Enter). Street view: **Shift+F** or the "Street view" button at the top right of the scene. In street view: **Shift+Left/Right** turns 30°, **Shift+Up/Down** tilts, **W A S D** or arrows walk, a right-drag turns, a tap on a neighbour or a sign acts on it, **Shift+F** or "Map view" returns to the map. Plain **F** is Find Me; **L** opens the Tenderloin map; **G** opens the block actions; **T** talks to a nearby neighbour; **Esc** says goodbye or stops walking.

## What to test

Play at two sizes: desktop 1100×760 with a mouse, and a phone 390×667 with touch (`hasTouch: true`, taps via the touchscreen). Use a fresh browser profile for each size. For each size:

1. **First impressions.** Start the game, enter street view, and look around a full circle in 30° steps. Take a screenshot at each heading. Note what you can and cannot read: street names, the gold objective marker and its arrow, neighbour names, shop captions. Is anything drawn through a wall?
2. **Getting around.** Walk to Bea (the first neighbour, a few metres away) using only street view and the keyboard. Walk along a building, around a corner, and back. Note anything that blocks you oddly, lets you through a wall, or turns the view unexpectedly.
3. **Talking and coming back.** Talk to Bea (tap her, or T). Street view is designed to hand back to the map view for conversations in this version and to return afterwards: check that it does, that her words are readable somewhere, and that the view returns to the street at your position when the conversation ends.
4. **Edges.** Tap the sky. Tap far down the street. Tap the street button repeatedly. Press Shift+F while a panel is open. Open the Tenderloin map (L) from street view and come back with Find Me. Resize the window between the two sizes while in street view. Walk or route west past Taylor Street (street view is limited to the opening block for now: it should hand back to the map and say so). Try the guide arrow with the objective behind you.
5. **Map view unchanged.** With street view never turned on, play two minutes of the normal map view (walk, zoom, drag to pan, rotate with a right-drag, meet a neighbour). Anything that looks different from what a first-time player would expect is worth reporting, but note that you have no "before" to compare with.
6. **Accessibility.** After each action in 1–4, read `announcement`. Is it clear and correct? Is every button at least 44 px and inside the screen? Can everything in 1–3 be done without a mouse?
7. **Console.** Collect browser console errors and warnings for the whole session.

## Report

Write Markdown to `docs/first-person-advice/playtest-<TOOL>.md` (create or overwrite), under 1,500 words, with screenshots saved in `artifacts/playtest-<TOOL>/` and referenced by file name. Structure:

1. **Summary**: three sentences on how street view feels and the single most important problem.
2. **Bugs**, most severe first, each with: severity (blocker, major, minor, polish), size, exact steps from a fresh load, expected, actual, the `street_view` and `announcement` values when it happened, a screenshot file name, and whether you reproduced it twice.
3. **Readability and feel**: what reads well and what does not at eye level, per size.
4. **Accessibility findings.**
5. **Console errors**, verbatim, deduplicated.
6. **What you could not test** and why.

End with the line `PLAYTEST-COMPLETE <bugs found>/<bugs reproduced twice>` and print that line.

You will be scored on bugs that the maintainer can reproduce from your steps. Unreproducible or speculative reports count against you, so report only what you saw.
