# HUD redesign plan: one bar, one sheet, one menu

**Status:** design only, November 2, 2026. Nothing here is built. Written from the creator's iPhone frames in `artifacts/hud-design-input/` and from the layout code in `godot/main.gd` (`layout_walking_controls_and_hub` ~6931, `play_area_rect` ~7177, `set_header_details` ~7773, `update_speech_bubble` ~4800, `configure_phone_disclosure` ~6834, the header build ~15982, the panel builds ~16068, the controls build ~16236) and `godot/street_view.gd`. Line numbers drift; function names are the anchors. Wireframes are in `docs/hud-mockups/`.

The creator's words: "kind of unplayable, can't we give the windows to be more nested or something so it's easier and you see more the screen", then "I think it's for all views. The menu needs to take up less space and the, on the text modal, I don't know... help design a better workflow."

The short version: the scene gets the screen. Three fixed pieces of chrome stay: a one-row header, a three-button bottom bar, and one sheet that holds every piece of reading text and can shrink to a single line. Everything else sits behind a Menu button.

---

## 1. What is wrong now

Measured from the frames (game area under Chrome's bars) and confirmed in the code.

### Landscape phone (about 890 x 383 of game, `landscape-8s.png`, `landscape-52s.png`)

| Piece | Height | Share of screen | Source |
|---|---|---|---|
| Header, idle (title, Music/Sounds/Info row, Sparks line, chapter line, credit line) | ~117 px | 31 % | header build: 44 px buttons, 20 px title, 12/14/10 px labels, `offset_top 12` |
| Header with a long objective plus a save notice (`landscape-52s`) | ~175 px | 46 % | `objective_label` wraps to 2 lines, `progress_label` gains a line from `persistence_text` |
| Walking controls, 2 rows of 3 (What's Next?, Tenderloin Map, Find Me, Zoom In, Zoom Out, Meet Thanh) | 112 px + 12 margin | 33 % | `controls.offset_top = -124`, 50 px buttons |
| Scene left over, idle | ~103 px | 27 % | `play_area_rect` |
| Scene left over with the Block Actions hub open | ~75 px strip beside a dock | 20 % | side dock `clampf(vp.x*0.52, 280, 440)` |

With the hub open the dock starts at `header end + 8` and needs about 230 px (label, two reader lines, two rows of 44 px actions, a 44 px nav row). 175 + 8 + 230 = 413 > 383, so Previous / Next 2/4 / Close are cut off at the bottom of `landscape-52s.png`. That is the "unplayable" frame.

### Portrait phone (about 410 x 680 of game, `portrait-96s`, `portrait-180s`, `portrait-200s`)

| Piece | Height | Share | Source |
|---|---|---|---|
| Header, Info open (Music/Sounds/Info, Sparks, Ch. line, two Info lines, Before These Streets + Reduced motion row, credit) | ~193 px | 28 % | `info.custom_minimum_size.y = 90`, 44 px rows |
| Header, Info closed | ~108 px | 16 % | |
| Block Actions / mural panel | 200 to 220 px | 30 to 32 % | `-368 .. -176` narrow, grown to content |
| Bottom primaries (Next Step, Meet Thanh, Explore) | 50 px + 12 | 9 % | phone disclosure |
| Scene with Info open and the hub open (`portrait-180s`) | two strips of ~110 px, above and below the panel | 32 % total, no single usable view | |

The phone disclosure (October) already fixed the bottom of the portrait screen: three primaries, a tray for Map / Find Me / Zoom. The header and the panels were never put on the same diet. Landscape phones never got the disclosure at all (`uses_phone_disclosure` requires `vp.y > vp.x`).

### Desktop (1100 x 760)

Header ~120 px (16 %), controls 124 px (16 %), an open panel 194 to 224 px (26 to 29 %). Playable, but the same three layers.

### The same words two or three times

Found in the frames and traced in the code:

1. **The dialogue line.** `ask_whats_next` writes the line into `info.text` (header Info), into `last_panel_dialogue` (the panel's `block_detail_label`), and calls `show_neighbor_speech` (the 3D bubble). `update_speech_bubble` also copies bubble text into Info whenever the bubble does not fit (`speech_bubble_in_info`). `portrait-180s.png` shows "Thanh is about a block southwest. Go say hello!" in Info and again in the panel, 200 px apart.
2. **The credit line.** The header's `attribution` label ("City: DataSF / PDDL · Streets: OSM / ODbL") and the last line of every `info.text` ("City 2010 survey / PDDL · Streets © OpenStreetMap / ODbL"). Both visible at once in `portrait-96s` and `portrait-180s`.
3. **Sparks.** `progress_label` ("Sparks: 9 · Keepsakes: 0/10") and the panel title (`block_label`: "Block Actions · 1/4 · Sparks: 9", "Celeste · Turn 2/5 · Sparks: 6").
4. **The objective.** Header ("Next: Meet Thanh"), the walk button ("Meet Thanh"), the guide arrow ("Thanh · 35 m"), the hub ("Meet Next (1 left)"), the conversation action ("Meet Thanh"), and the Info walking line ("Walking to Thanh ... 125.5 m"). The arrow and the button earn their place; the rest is repetition.
5. **Next Step / What's Next?** Lives on the bottom bar, in the conversation row, in the mural panel and in the music panel, with two different handlers (`press_next_hint` vs `press_conversation_next`).

### Six things that can be on screen together

`header_panel` (with `info`), `block_panel`, `mural_panel`, `music_panel`, `story_card`, `phone_tray`, `reward_banner`, the street button and stick. The code keeps them apart with about fifteen layout predicates (`uses_phone_disclosure`, `uses_side_block_hub`, `uses_short_side_panels`, `uses_compact_narrow_*`, `uses_short_narrow_walking`, `has_side_panel_dock`, ...). Each new rule has been correct and each has added a case. The redesign replaces the stack with one sheet that has modes, so there is one geometry to get right per size class.

---

## 2. The workflow

### Three fixed pieces, one rule

- **Header row** (one line, 44 to 48 px): `Menu` button, the chapter and objective on one line, a small Sparks pill. Always visible except inside a focused activity (those already hide the HUD).
- **Bottom bar** (one row, 44 to 50 px): `Next Step`, the walk/talk button (`Meet Thanh`, `Visit Bea`, `Stop Walking`), `Explore`. Hidden only while the sheet is open in conversation on a phone, because the sheet then carries Next Step and Goodbye.
- **The sheet**: the single reading surface. Dialogue, hints, the hub, the mural and music panels, the story card, activity instructions, and anything that used to be pushed into Info. It has three heights: **bar** (one line plus a handle), **half** (text plus one or two rows of buttons), **full** (hub pages, story cards). On landscape phones the half and full states dock to the right instead of the bottom.
- **Menu**: settings, sources and the rare actions. Opens from the header. Never open at the same time as a sheet above bar height.

The rule for what goes where: **if it changes this minute, it is on the bar or in the sheet; if it changes once an afternoon, it is in the menu.** Sparks, the objective and the walk target change this minute. Music, Sounds, Reduced motion, District Border, Local Stories, Import Web Save, sources and credits do not.

### Player states

| State | Header | Bottom bar | Sheet | Scene overlays |
|---|---|---|---|---|
| **Exploring** (no objective target, or wandering) | Menu · "Ch. 3 · Explore the block" · Sparks | Next Step · Visit Bea · Explore | hidden | Talk prompt, guide arrow, reward banner, Street view button, stick (touch, eye level) |
| **Following an objective** | Menu · "Ch. 1 · Next: Meet Thanh (4/5)" · Sparks | Next Step · Meet Thanh · Explore | hidden; `Next Step` opens it at half with the hint line and up to three actions, then it collapses to bar when you walk | guide marker and arrow |
| **Walking a route** | same | Next Step · **Stop Walking** · Explore | bar if a line is showing ("Walking to Thanh · 126 m") | route ribbon |
| **Talking** | same | hidden on phones while the sheet is at half or full; back at bar height with the middle button reading `Goodbye`; always visible on desktop | **half**: speaker + turn, the line (16 px, scrollable), row 1 `Chat More` · `Next Step` · `Goodbye`; `Next Step` discloses row 2 (the context actions, e.g. `Meet Thanh` · `Talk to Dez` · `All Actions`); required choices (Long Table / Open Floor, Return <gear>) are always in row 2 | speech bubble only while the sheet is at bar height |
| **Block hub** (All Actions) | same | hidden on phones | **full**: "Block Actions" + one hint line, a 2-column grid of actions (no paging on tall phones once settings leave the hub, see 3), `Back` (to the conversation it came from) · `Close` | none |
| **Activity panel** (Celeste's mural, Rook's music) | same | hidden on phones | **half**: title, two reader lines, the activity's button rows; `Hide` collapses to bar so the easel or speaker is visible; the compose entry stays in the scene | Compose Mural button, subject framed |
| **Focused activity** (workshop, rhythm circle, screening, ...) | hidden | hidden | hidden | the activity owns the screen (unchanged) |
| **Story card** | visible | hidden | **full**: chapter title, body, `Before These Streets` (startup), `Continue` / `Start Exploring` | none |
| **Street view** (eye level) | same | same | same rules | Map view button top-right, stick bottom-left on touch, Mouse look under the button on desktop |
| **Map overview** | same | **Back to Me** · Meet Thanh · Explore | hidden | none |
| **Menu open** | Menu pressed | dimmed, inert | collapsed to bar or hidden | dimmed |

The reward banner stays as it is: the one transient overlay at the top of the scene. When it does not fit, its text goes to the sheet bar for its reading time instead of into Info.

---

## 3. The menu

### What stays on screen

- Header row: `Menu`, the chapter + objective line (tap or Enter opens the sheet with the hint, the same as `Next Step`), the Sparks pill (`✦ 8 · 0/10`; tooltip and accessibility name "Sparks 8, Keepsakes 0 of 10").
- Bottom bar: `Next Step`, walk/talk, `Explore`.
- Scene corners: `Street view` / `Map view` (top-right, exists), the walk stick (touch, eye level, exists), `Mouse look` (desktop eye level, exists), `Compose Mural` near the easel (exists).

### What moves behind `Menu`

In this order, each a 48 px row, full width on phones, 320 px wide under the button on desktop:

1. `Music: On` (toggle)
2. `Sounds: On` (toggle)
3. `Reduced motion: System (off)` (cycles, as today)
4. `Street view` / `Map view` (same action as the corner button, for keyboard users)
5. `About this place ›` opens the sheet at full with what Info holds today: where you are, how to walk, the data sources and the full credit line. Static text, no dialogue.
6. `Before These Streets ›` (only while `before_streets.idle_entry_available()`)
7. `Local Stories: Off` (today `block_voices_btn` in the hub)
8. `District Border: On` (today `block_district_btn`)
9. `Import Web Save` (today `block_import_btn`)
10. A 10 px credit line: "City: DataSF / PDDL · Streets: OSM / ODbL"
11. `Close`

Items 7 to 9 are settings that happen to live in the 13-action hub. Moving them leaves 10 real actions, which is a 2 x 5 grid that fits a full sheet at 320 x 667 (5 rows x 48 + gaps = 256 px) with no paging. Paging stays only where the height forces it (landscape phones: 2 x 3 per page, two pages).

The title "TENDERLOIN REDUX" leaves the HUD. It is in the page title, the story card at startup, and the menu's About page. The credit line stays in the menu, on the startup story card, and in the HTML page around the canvas (no HUD cost). The creator decides whether that is enough attribution (decision 9).

### How it opens and closes

- **Touch / mouse:** tap `Menu`; it is a toggle button, pressed while open. Tap `Menu` again, `Close`, or anywhere in the dimmed scene to close. Opening the menu collapses an open sheet to bar (or hides it if it has no line). Opening a sheet closes the menu.
- **Keyboard:** `Menu` is the first control in the focus order. Enter or Space opens it and moves focus to the first row; Tab and the arrow keys move through rows (Godot focus neighbours set top-to-bottom); Escape closes it and returns focus to `Menu`. A shortcut is nice to have if a key is free (every letter is bound; `Shift+M` suggested, to be checked against the key map).
- **Screen reader:** the menu root is announced as "Menu, settings and sources"; each toggle carries its state in its accessibility name ("Music, on"); opening and closing announce through `announce_a11y_status`, as the Explore tray does today.

---

## 4. The text modal becomes the sheet

### One place for dialogue

Today a line can be in three places at once: the 3D bubble, the panel reader, and Info. The sheet rule:

- **The sheet is the reader. The bubble is the stage.** A line is read in full in exactly one place.
- Sheet at **half or full**: the bubble is hidden (the code path exists: `speech_bubble_in_activity`). The sheet shows the speaker, the turn, and the line at 16 px in a scrollable reader at least 96 px tall (the phone disclosure's numbers, kept).
- Sheet at **bar**: the bubble shows above the character. The bar shows `Bea · ▲` (speaker and the handle). If the bubble cannot be placed (behind the eye, behind a wall, no room), the bar shows the first words of the line instead: `Bea: "Welcome to the block, neighbor..." ▲`.
- **Info never receives dialogue again.** The `speech_bubble_in_info` branch and the `info.text = line + ...` writes in `ask_whats_next`, `end_conversation`, the walking status and the save notices all go to the sheet (bar for a status line, half for a hint with actions). The header never grows.
- The aria-live mirror announces each line once, when it is spoken, as now. "Full dialogue in the conversation panel" becomes "Full dialogue in the sheet" and only fires when the bubble was deferred.

### Choices

- Row 1 is always `Chat More` · `Next Step` · `Goodbye` (the current narrow labels; see decision 3 about renaming).
- `Next Step` discloses row 2 with up to three context actions (`conversation_actions()` unchanged) and relabels to `Hide Steps`, as the phone disclosure does. Required choices (`layout_table`, `layout_floor`, `return_owner:*`) are shown in row 2 from the start, as today.
- `All Actions` grows the same sheet to full and swaps the rows for the hub grid. `Back` returns to the conversation at half. Escape does the same. No second panel.
- Buttons wrap to two lines rather than clip; every button is at least 44 x 44 and all of row 2 is on screen before the sheet opens (the sheet grows upward from its bottom edge, `GROW_DIRECTION_BEGIN`, as `phone_talking` does now).

### Shrinking to see the scene

- The handle is a 44 px tall strip across the top of the sheet: speaker (or title) on the left, `Show less` / `Show more` on the right. On touch it also takes a drag (down to bar, up to half or full), with the handle's press settled by the existing one-gesture guard. Mouse: click. Keyboard: the handle is a button and the first focusable thing in the sheet.
- Bar height is 48 px: the line's first words, ellipsised, and `▲`. It sits directly above the bottom bar (or at the screen bottom when the bar is hidden).
- Half is 46 % of the viewport height on phones, capped at 360 px; on desktop it is 300 px. Full is everything below the header minus 12 px.
- The sheet remembers its height per owner for the session: if you shrank Celeste's panel to bar, it reopens at bar next time she talks.

### Never two panels stacked

- `block_panel`, `mural_panel`, `music_panel`, `story_card`, `phone_tray` and the Info reader become modes of one `Sheet` node (talk, hub, mural, music, story, hint, about, status). Switching modes reuses the node; the hub and the conversation share it, as `block_panel_mode` already does for two of them.
- The `Explore` tray is the sheet in a fourth, short mode (two rows: `Tenderloin Map` · `Find Me` / `Zoom In` · `Zoom Out`, then `All Actions` · `Close`). Opening it collapses any dialogue to bar.
- `play_area_rect` becomes: top = header bottom + 8; bottom = min(bottom bar top, sheet top) - 8 in portrait and desktop; right = sheet left - 8 when docked (landscape). One rule instead of five.

---

## 5. Layout per size class

Size classes replace the fifteen predicates. Three classes, chosen once per resize:

| Class | Rule | Header | Bottom bar | Sheet half | Sheet full | Explore |
|---|---|---|---|---|---|---|
| **Portrait phone** | `w < 600` and `h > w` | 48 px, 1 row, 14 px objective text clipped to one line (full text in the Next Step sheet) | 50 px, 3 buttons, 14 px | bottom, `min(0.46h, 360)` | bottom, `h - 56 - 12` | tray (sheet mode) |
| **Landscape phone** | `h < 560` | 44 px | 44 px, 3 buttons, 13 px | right dock, width `clamp(0.48w, 280, 440)`, header to bar | same dock | tray in the dock |
| **Desktop** | otherwise (`w >= 600`, `h >= 560`) | 48 px | 50 px, 3 buttons at 19 px plus, at the right edge of the scene under `Street view`, a tool column `Map` · `Find Me` · `+` · `−` (44 x 44 each, decision 1) | bottom, 300 px, width `min(640, w - 24)`, left aligned with the scene | bottom, `min(0.7h, 520)` | not needed |

Numbers at the required sizes (scene = `play_area_rect` height, idle, no sheet):

| Size | Today | Planned | Note |
|---|---|---|---|
| 1100 x 760 desktop | ~500 px (66 %) | 622 px (82 %) | 12 + header 48 + 8 + scene + 8 + bar 50 + 12 |
| 390 x 667 portrait | Info closed ~470 (70 %); Info open ~385 (58 %) | 529 px (79 %) | talk at half: scene 272 px (41 %), bubble hidden; talk at bar: 473 px (71 %) |
| 320 x 667 portrait | as above with 2-line objective | 529 px (79 %) | one-line objective never wraps |
| 667 x 390 landscape | ~165 px (42 %) idle; hub open: dock cut off | 262 px (67 %) idle; hub docked: a 347 x 304 scene beside a 320 px dock | dock holds 2 x 3 actions + nav per page |
| 900 x 380 landscape (creator's phone) | ~103 px (27 %); hub: 75 px strip, Close off screen | 252 px (66 %); hub docked 432 px wide, scene 436 x 304 | |

The wireframes:

- `hud-mockups/portrait-idle.svg`: 390 x 667, following an objective.
- `hud-mockups/portrait-conversation.svg`: 390 x 667, talking to Bea, sheet at half with row 2 disclosed.
- `hud-mockups/landscape-idle.svg`: 900 x 380, idle.
- `hud-mockups/landscape-conversation.svg`: 900 x 380, sheet docked right in hub mode (the state that was cut off).
- `hud-mockups/portrait-menu.svg`: 390 x 667, Menu open.
- `hud-mockups/portrait-street-view.svg`: 390 x 667, eye level, sheet at bar with the bubble on stage.

Desktop is the portrait layout with room to spare; no separate drawing.

---

## 6. Accessibility and keyboard

- **Targets:** every button 44 x 44 or larger, including the handle, the Sparks pill (made a 44 px tall button that opens About), and the menu rows. The existing `require(... >= 44 ...)` checks keep running; the new nodes join `walking_control_snapshots` and `activity_detail_snapshot` so they are measured too.
- **Focus order:** `Menu` → objective line → Sparks → scene corner buttons (Street view, Mouse look, Compose Mural) → sheet (handle, reader, row 1, row 2, grid, nav) → bottom bar. When a sheet opens, focus moves to its first button (or the reader for a story card, as today); when it closes, focus returns to what opened it (`close_phone_disclosure(restore_focus)` pattern).
- **Escape:** closes the top-most nested thing: menu → disclosed row 2 → hub back to the conversation it came from → Goodbye / Close / Stop Walking. The sheet height is never on Escape; the handle owns it. This matches `verify_phone_disclosure` ("first Escape dismisses choices ... without Goodbye").
- **Keys that stay:** T (talk / Keep Chatting), Esc, WASD/arrows, Shift+arrows, Shift+F (street view), the digits 1 to 5, G (all block actions), V (volume with Rook), Z (host). `Enter` on the objective line opens Next Step.
- **Announcements:** the mirror already speaks lines, rewards and state changes. New: "Sheet shown less" / "shown more", "Menu open" / "closed", and the sheet's mode in `get_a11y_status_snapshot` under a new `sheet` key (`mode`, `height`: bar/half/full, `handle` rect, `text`, `docked`). Existing keys stay and point at the sheet's parts (`block_panel_control`, `conversation_detail`, `phone_disclosure.tray`, `info_reader` → the About page) so `tests/godot-browser.mjs` keeps reading them during the transition.
- **Reduced motion:** sheet height changes are cuts, not slides, when reduced motion is on; otherwise a 150 ms ease.
- **Reading text is never lost.** Everything Info showed is in About; every dialogue line is in the sheet reader; the credit line is in the menu and on the page.

---

## 7. The 2D fork

`browser-next/` is a web page, not a HUD: a masthead, a map panel with its own small controls, a side guide, and one `<dialog>` for every conversation and activity (`game.js` `show`/`close`, `characters.js` `conversationView`). It already has the shape this plan wants for 3D: one dialog at a time, settings behind a `Settings` button, the chapter line in one place.

Recommendation: **the fork follows the text and the rules, not the layout.** Reasons:

- The drift tests (`tests/next-game-text.test.mjs`, `next-characters.test.mjs`) pin button labels and lines copied from Godot (`BUTTON_TEXT`, `HUB_LABELS`, `NARROW_LABEL_REWRITES`). If this plan keeps the current words (decision 3), nothing in the fork changes. If a label is renamed, the fork's copy and its test change in the same commit, which is what the drift test is for.
- Moving Local Stories, District Border and Import Web Save out of the hub changes the hub's action list; the fork's `HUB_LABELS` and its hub rendering need the same list, so that move is one shared decision and one paired change.
- Two things are worth copying later, as their own small phase: the three-button bottom bar on narrow screens (the fork's `neighbor-navigation` row has five buttons), and the sheet's bar state for a dialog that the player wants to peek past. Neither blocks the 3D work.

---

## 8. Build order

Each phase ships alone: tests first, the formal Godot suite (`npm run godot:test`), the browser suite at the five sizes, pck under 2 MiB (now 1,507,192 bytes; this is code only, expect +20 to 40 KB), then the clean-checkout run and the usual review pass. Nothing deploys without the creator's OK.

### Phase 0: measure (tests only)

Add `hud_metrics` to the a11y snapshot: header height, bar height, sheet or panel rect, `play_area_rect` share, and a `duplicate_text` list (any string over 20 characters visible in two HUD labels at once). The browser test prints them at 1100x760, 390x667, 320x667, 667x390 and 900x380 and fails on nothing yet. This gives before and after numbers and catches the "same line twice" regressions mechanically.

Risk: none to players. Changes: `get_a11y_status_snapshot`, `tests/godot-browser.mjs`.

### Phase 1: one-row header and the menu

- Build `Menu` and the menu panel; move Music, Sounds, Reduced motion, Street view, Before These Streets, the credit line, Local Stories, District Border and Import Web Save into it.
- Header becomes `Menu` · one-line objective · Sparks pill. `set_header_details` keeps its signature but toggles the menu's About page.
- Info stays as a hidden node for one phase: its `text` is still written, and the About page reads it. The speech and reward fallbacks that open Info are redirected to a one-line notice under the header (48 px, only while a fallback is live) so no reading text is lost before Phase 3 removes it.
- The hub drops to 10 actions; `BLOCK_ACTION_COUNT` and `layout_block_action_pages` page by available height.

Tests that change: `study_test.gd` 2847 (`header_panel.size.y <= 130` → `<= 56`), 153 (story card below header: still true), the `info.is_visible_in_tree()` / `info.size.y` checks at 3210 and 3435 (point at the notice line or the About page), hub paging counts (`block_hub_pages`), `verify_phone_disclosure` 6422 and 6446 (`All Actions` still opens the hub), the music-toggle checks (now in the menu, still 44 px). The fork's `HUB_LABELS` and its hub list move with the three actions (one paired commit).

Risks: the header's `offset_bottom` is read by every panel and the story card; a one-row header changes every `play_area_rect` and camera refit, so the camera tests (`verify_scene_overlay_bounds`, the hub refit checks) are the ones to watch. Attribution placement (decision 9).

### Phase 2: one bottom bar everywhere

- Extend the three-primary bar to landscape phones and desktop. `uses_phone_disclosure` becomes "always"; the Explore tray exists on every size (desktop adds the corner tool column if decision 1 says so).
- `press_next_hint` and `press_conversation_next` merge: Next Step always opens the hint with its actions.
- Remove `uses_short_narrow_walking` and the 2-column / 3-column / `-174 / -116 / -104 / -124` geometry.

Tests that change: 3217, 3444, 3496, 3507, 3515, 3547, 3778, 3783 (`controls.columns`, `offset_top`, `map_control.text == "Tenderloin Map"`), 6371, 6477 (`controls.get_child_count() == 6` on desktop → 3), 6478 (19 px font on desktop stays). `verify_short_narrow_walking` is retired; `verify_phone_tray_targets` runs at every size.

Risks: desktop players lose one-tap zoom unless the corner tools ship (mouse wheel and `+`/`-` keys still work); the walk control's long labels ("Walk & Talk (Next)") at 19 px in a third of 1100 px are fine, at a third of 600 px they wrap to two lines (allowed, 50 px tall).

### Phase 3: the sheet

- One `Sheet` node with modes talk, hub, mural, music, story, hint, about, status, explore; heights bar, half, full; bottom or docked.
- Dialogue goes only to the sheet and the bubble. Delete `speech_bubble_in_info`, `speech_opened_info`, `reward_info_prefix` and the Info notice line from Phase 1. `info` is removed; About is a static text built from `overview_text()` and `location_phrase`.
- `block_panel`, `mural_panel`, `music_panel`, `story_card`, `phone_tray` become the sheet's content containers (keep the variable names so the snapshot keys and the activity scripts that reach `block_detail_label`, `mural_detail_label`, `music_stem_label` keep working).
- The handle, the per-owner height memory, the bubble hide rule.

Tests that change: everything that measures a panel against `controls` (`panel_clears_walking`, 2679, 2815, 2906, 3097, 3388, 3602, 3684, 3729 to 3754): the sheet bottom is the screen bottom when the bar is hidden, so they read the new `sheet` snapshot; `verify_phone_disclosure` 6410 to 6432 (the reader's 16 px / 96 px rule stays; `controls` hidden while talking stays on phones); the reward diagnostics at 2399 and 2433; the `PHONE_REWARD_DIAG` queued-into-Info path becomes queued-into-bar. The fork is untouched unless labels change.

Risks: the biggest phase. The activity scripts (`quiet_seats`, `civic_listening.entry`, `bea_invitation`, `loan_homecoming`) add rows to `block_panel` (`hosting_choice_row_visible`); they need the sheet to grow upward exactly as the panel does now. Suggest shipping 3a (talk + hub + hint + status) and 3b (mural, music, story, about, explore) separately if the diff passes 1,500 lines.

### Phase 4: landscape dock, desktop width, street view

- The right dock for landscape phones as a sheet placement (replaces `uses_side_block_hub` / `uses_short_side_panels`).
- Desktop sheet width cap and left alignment; the corner tool column if chosen.
- Street view: with a half sheet leaving 42 % of the scene, test whether the eye can stay at eye level while a panel is open (today `street_view.in_block` hands back to the map). Keep the hand-back until the phone frames say the half sheet is enough.

Tests that change: 3180 to 3231 (dock geometry), `verify_short_activity_panels`, `verify_narrow_hub`, the street-view groups that assert the hand-back.

Risks: the dock and the guide arrow / caption `occupied` lists; the stick needs `play_area_rect.size.x >= 120 + 132 + 16` which the dock leaves at 667 wide (347 px scene) but is tight at 520 wide.

### Phase 5 (optional): the fork follows

Three-button narrow bar and a peek state for its dialog, under its own tests. Only after Phase 3 has been seen on the phone.

---

## 9. Decisions for the creator

1. **Desktop map tools.** Three primaries plus a corner column (`Map` · `Find Me` · `+` · `−` under `Street view`) on desktop, or three primaries and the Explore tray everywhere? **Recommendation: corner column on desktop only.** It keeps one-tap zoom for mouse players and costs no phone space.
2. **The bubble.** Keep the 3D speech bubble (shown only while the sheet is at bar height) or drop it and read everything in the sheet? **Recommendation: keep it.** It says who is talking without a label, and the hide rule removes the duplicate.
3. **Labels.** Keep today's words (`Chat More`, `Next Step`, `Goodbye`, `All Actions`, `Explore`, `Tenderloin Map`) or rename (`Reply`, `Talk`, `Hide`)? **Recommendation: keep them for Phases 1 to 4.** The drift tests, the i18n catalogs in progress and the fork all pin them; rename once, later, in one paired commit if at all.
4. **Menu label.** The word `Menu` (56 x 44) or a `≡` glyph? **Recommendation: the word.** No icon font to ship, nothing to learn, and it reads aloud as written.
5. **Settings out of the hub.** Move Local Stories, District Border and Import Web Save to the menu? **Recommendation: yes.** The hub becomes 10 actions and stops paging on tall phones; the fork's hub list changes in the same commit.
6. **Street view and open panels.** Keep handing back to the map while a sheet is open, or let the eye stay once the sheet is half height? **Recommendation: keep the hand-back through Phase 3, decide from phone frames in Phase 4.**
7. **Half height.** 46 % of the screen (scene 41 % left on a 390 x 667 phone) or 40 % (scene 47 %, reader down to three lines at 16 px)? **Recommendation: 46 %,** because the reader must hold two rows of buttons plus 96 px of text and still show the handle.
8. **Title.** Drop "TENDERLOIN REDUX" from the HUD? **Recommendation: yes;** it stays on the story card, the page title and About.
9. **Attribution.** Is a credit line in the menu, on the startup card and in the HTML page around the canvas enough, or must one stay on the HUD at all times? **Recommendation: menu + card + page.** If a permanent one is wanted, a 10 px line under the bottom bar costs 14 px and is the only extra chrome in the design.
10. **Order.** Header and menu first (biggest visible win, moderate risk) or the sheet first (fixes the duplicate text, biggest risk)? **Recommendation: header and menu first,** then the bar, then the sheet, as in section 8. Each step is visible on the phone within a day of work and can stop there if it is enough.
