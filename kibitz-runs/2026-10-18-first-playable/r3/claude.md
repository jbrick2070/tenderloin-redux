TOOL CHECK: PASS (read public/core.js, game.js, world.js, audio.js, index.html, style.css, scripts/serve.mjs, tests/core.test.mjs, tests/browser-smoke.mjs, package.json, docs/BUILD_STATUS.md, docs/ROADMAP.md, public/data/streets.osm.json head).

VERDICT: yes-with-fixes. The core state, save and route wiring holds together and the server root check is sound. But there is one reachable null-deref crash. The browser-evidence harness is wired to a hard-coded port and a server it does not start, and it overclaims "keyboard: pass". Keyboard focus is dropped on every grid placement in the two required editors.

MUST-FIX BEFORE BUILD

1. [game.js:155 / init sequencing game.js:226 vs 235-249] Restart dereferences `world` before it is guaranteed to exist. The header buttons are wired at module top (game.js:226), before `init()` resolves. If the streets fetch fails, `world` is never assigned (game.js:237-247), and the Settings button stays live permanently. Settings > "Start a new afternoon…" > "Start fresh" then runs `world.path = []` with world undefined and throws a TypeError. At that point `state` has already been reset in memory, but `updateUI()`, `persist()` and `close()` never run: the dialog stays open and the reset is never saved. The same window exists during normal loading.
   Fix: `if (world) world.path = [];` at game.js:155.
   Related, lower severity: game.js:123 (Rook "arrange the supplies") and game.js:139 (journal "Walk to the history stop") call `close()` then `goTo()`, and goTo returns silently when `!world` (game.js:166). The dialog closes and nothing happens. Add `toast(...)` in goTo's `!world` branch.

2. [tests/browser-smoke.mjs:5-10, 68 vs scripts/serve.mjs:7 and package.json:11] The verification harness and the server are not wired together, and the evidence overstates coverage.
   (a) serve.mjs honours `PORT` (serve.mjs:7), but the smoke test hard-codes `http://127.0.0.1:4173` (lines 10, 68). Set PORT and the test fails. Worse, a stale server already on 4173 (an older checkout, or another project) gives a false PASS against the wrong code. `npm run test:browser` does not start the server, and nothing checks readiness.
   (b) `chromium.launch({ channel: 'chrome' })` (line 6) needs branded Google Chrome installed, not Playwright's Chromium. The input doc calls this "Real Chromium"; on a machine without Chrome the launch fails for reasons unrelated to the game.
   (c) `evidence.keyboard: 'pass'` (line 49) comes from a single 260 ms ArrowLeft press (lines 39-40). E/Enter interaction, keyboard-only completion and grid operation are never exercised, so BUILD_STATUS.md:16-18 would record a keyboard pass the test does not prove.
   Smallest fix:
   - Derive `BASE = process.env.BASE_URL || \`http://127.0.0.1:${process.env.PORT || 4173}\`` and use it at lines 10 and 68.
   - Assert the page is this build: `window.tenderloin.version === require('../package.json').version` (game.js:244 exposes version '0.1.0'; package.json:3 matches).
   - Read the launch channel from an env var instead of hard-coding it.
   - Rename the field to `keyboardMovement: 'pass'`, or add one E-key interaction (walk to Bea, press E, assert `#choose-table` is visible).
   - Optionally spawn `node scripts/serve.mjs` with the same PORT and wait for a 200 before testing.

3. [game.js:28-33 with game.js:79 and game.js:96] Keyboard focus is lost after every grid placement in both required editors. `show()` only restores focus by element `id` (game.js:29, 32). Layout grid cells (game.js:79) and mural grid cells (game.js:96) have no id. Each placement calls `act()` and then re-renders through `layoutEditor()`/`muralEditor()`, which replaces `body.innerHTML` (game.js:30). The focused cell is destroyed and focus falls out of the grid, so a keyboard user must Tab back through the tool picker and up to 40 cells after every placement. M0 lists "keyboard and click navigation", and both editors are mandatory for `ready()`.
   Fix: add `id="cell-${col}-${row}"` (layout) and `id="mcell-${col}-${row}"` (mural) to the button templates. `show()` then restores focus automatically.
   verify-at-build: confirm the post-removal `document.activeElement` in Chromium (body vs dialog) and that focus returns to the same cell after the fix.

SHOULD-FIX

1. [game.js:183-210, 241, 246] The frame loop and the error path are fragile.
   - `requestAnimationFrame(frame)` is the last statement in `frame()` (line 210). Any throw in `world.draw()` or `hint()` permanently stops the loop with no error UI: no movement, no walk arrival, so `interact()` never fires. `world.js:42` uses `ctx.roundRect` unconditionally; browsers without it will throw on the first frame (verify-at-build: target browser matrix).
   - init removes `#loading` (line 241) before `updateUI()`/`welcome()` run. If either throws, the catch at line 246 does `$('#loading').innerHTML` on null and throws again, so the error box never appears.
   Fix: schedule rAF first in `frame()` (or wrap the body in try/catch with one console.error). In init, move `$('#loading').remove()` to after `welcome()`, or null-guard it in the catch.

2. [game.js:217 with game.js:230-234] Movement keys are dead while focus is on any BUTTON or A. After clicking or pressing the ♫ toggle (#sound-toggle), focus stays on that button, and WASD/arrows are ignored until the user clicks the canvas. Other header and sidebar paths happen to refocus the canvas through `goTo` (line 167) or `close` (line 34); this one does not.
   Smallest fix: apply the tag check only to the `e`/`enter` branch (Enter must still activate buttons). Arrow keys and WASD have no default action on buttons, so movement can run whenever focus is not in INPUT/TEXTAREA.

3. [world.js:40-41, style.css (.world-prompt pointer-events:none), game.js:174-178] Touch has no equivalent of E, and tap targets shrink with scale.
   - `hit()` uses a fixed 28 world-unit radius. At 390 px width, `scale = (w-28)/1150` ≈ 0.29 (world.js:32), so the radius is about 8 CSS px and a neighbor box is about 18×19 px.
   - A slightly-missed tap falls through to `moveTo()`, which walks but never interacts. `#world-prompt` shows "E Talk with…" but is not clickable.
   - Progression still works through the sidebar task buttons, but Celeste/Dez/Thanh conversations are hard to reach on touch.
   Roadmap places "mobile/touch play" in M1 (ROADMAP.md:18), so this is not an M0 blocker, but the mobile viewport is part of the M0 check.
   Smallest fix: radius `Math.max(28, 22 / this.scale)` in `hit()`, and make `#world-prompt` a button that calls `interact(world.nearest())`.

4. [game.js:10-15] Settings parsing shares the save-load try block. A corrupt or `null` SETTINGS_KEY (`JSON.parse('null').reducedMotion` throws) sets `storageAvailable = false` even though the save loaded fine. `updateUI` then shows "Saving is unavailable…" (line 59), and Settings says storage is unavailable, until the first successful `persist()`.
   Fix: give the settings read its own try/catch and guard `stored && typeof stored === 'object'`.

5. [audio.js:3-15, game.js:225, 230-233] `start()`/`stop()` race.
   - `enabled` is set only after `await this.context.resume()` (audio.js:10). A `visibilitychange` to hidden during that await calls `stop()` and sets aria-pressed=false, then `start()` finishes and sets `enabled = true` and starts the interval timer. Music then plays while the toggle reads "off".
   - A rapid double-click ends with music on: both clicks see `enabled === false`.
   Fix: a generation counter in MusicSketch (`const gen = ++this.gen; await resume(); if (gen !== this.gen) return false;`, with `stop()` incrementing gen), plus a `starting` guard in the click handler.

6. [game.js:81, 99 with game.js:30] The `role="status"` `.grid-message` is recreated on every render because `show()` replaces the whole innerHTML. A live region inserted together with its text is often not announced, so placement accept/reject feedback, including the blocked-route message, may be silent for screen-reader users (verify-at-build with NVDA or VoiceOver).
   Fix: keep one persistent status element outside `#modal-body` inside the dialog and update only its textContent.

7. [game.js:17, 73-90, 92-107] `activeTool`/`activeMotif` are module-level and never resynced when an editor opens. After a reload with the table already placed, `activeTool` is 'table' again, so the first grid click moves the table instead of placing the missing seats. Each move also resets `soundcheck` (core.js:42).
   Fix: at the top of `layoutEditor`/`muralEditor`, if the active item is placed and another is missing, set it to the first missing item.

8. [scripts/serve.mjs:16-18, 20] `writeHead(200)` runs before `await readFile()`. If the read fails (file removed or locked between stat and read, plausible on Windows with editors or AV), the catch calls `writeHead(404)` on a response that already sent headers. That throws ERR_HTTP_HEADERS_SENT out of the async listener as an unhandled rejection, which crashes the process on current Node defaults. `listen` has no 'error' handler, so EADDRINUSE also dies with a raw stack.
   Fix: `const data = await readFile(filename);` before `writeHead`, and add `server.on('error', e => { console.error(e.message); process.exit(1); })`.

9. [game.js:224-225] The hide path does not persist. Quest actions persist immediately (`act`, game.js:27), but player position is saved only every 1.5 s while moving (line 209) and on `pagehide`, which mobile browsers do not reliably fire. Add `persist()` to the `document.hidden` branch.

OPTIONAL / NICE-TO-HAVE

- [world.js:111-137, world.js:3-14, core.js:3-7, core.js:99-120] Every authored coordinate (buildings, awnings, closure rect, Turk bike-lane offset `y+32`, NEIGHBORS/PLACES/LITTER, furniture mapping `166 + col*53`, BOUNDS, walkable threshold 60) is in projected pixel space and silently depends on `PIXELS_PER_METRE = 5`, ORIGIN and the rotation angle. Re-extracting OSM or changing scale breaks the scenery with no test failure, except that tests/core.test.mjs:65 pins Mason x. Add a comment at core.js:100, or a test that pins Turk's y at the closure x-range.
- [core.js:126-133] The first path node is the snapped start, which can sit up to about 7 units outside `walkable`. If the player stops there and the position is saved, init resets the position (game.js:239). Cosmetic.
- [game.js:153 / style.css:7] The in-app "Reduce ambient motion" toggle only affects canvas drawing. CSS transitions (progress bar, buttons) follow the OS media query alone. Toggle a `reduced-motion` class on `<html>` and mirror the media rule.
- [scripts/serve.mjs:11] A malformed `%` escape returns 404 rather than 400. Harmless.
- Path escape: verified closed. `root` from `fileURLToPath(new URL('../public/', ...))` keeps its trailing separator. `path.resolve` runs after `decodeURIComponent`, so `%2e%2e%2f`, `%5c` and drive-letter segments all resolve outside root and fail `startsWith(root)`. The smoke test also covers `/package.json` returning 404 (browser-smoke.mjs:68). No change needed.
- Interface contracts checked and consistent:
  - streets.osm.json `ways[].geometry[{lat, lon}]` → `makeWays`/`project` (world.js:16, core.js:104).
  - `World` callbacks `click(point, object)` ↔ game.js:240.
  - World units are used consistently by `toWorld` (world.js:35) and `draw` (world.js:103-104).
  - Save envelope `{version: 1, core, optional}` round-trips (core.js:94-97 ↔ 63-93).
  - Furniture grid cells ↔ canvas mapping (world.js:147-148) ↔ route row 2 (core.js:22, world.js:136).

CUT THESE (over-engineering / dead wiring)

1. [core.js:54-56] The `'move'` action in `applyAction` is never dispatched. Grep finds no `type: 'move'` in public/, tests/ or scripts/; `frame()` mutates `state.player` directly (game.js:196-202). Its bound check (`> 3000` rejects) also disagrees with `loadSave` (`< 3000`, core.js:87). It is safe to cut. The alternative is to route movement through it, which means a structuredClone at 60 fps, and is not worth it.
2. [audio.js:44] `dispose()` has no caller (grep finds no call outside its definition). It is safe to cut, or call it from `pagehide` instead of `stop()`, which also releases the AudioContext.
3. [style.css `.text-link`] No element uses this class. Safe to cut.
