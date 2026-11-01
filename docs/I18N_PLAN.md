# Localization spec: Spanish, Vietnamese, Arabic and Thai for browser-next

> **Status: decided; the foundation (I1) is built (see "I1: foundation" in section 6), with no locale shipped.** On November 1, 2026 the creator adopted every recommendation in section 7 ("take your defaults") and confirmed all four languages, Vietnamese included: D1 2D-only catalogs that convert to `.po`; D3 a paid native reviewer per locale with Tenderloin community ties where possible, plus a second reader (hiring and spending stay the creator's); D4 neutral US and Latin American Spanish with "tú"; D5 MSA with a warm register, Western digits, neutral chrome and masculine and feminine dialogue variants behind a "Form of address" setting whose default the Arabic pilot reviewer and the creator choose; D7 names kept, transliterated in Arabic and Thai script, Latin in Spanish and Vietnamese; D2, D6 and D8 to D18 as written. D16 has no recommendation of its own, so the optional civic notes and an "English prevails" note stay out until the creator asks for them. The content order is es, vi, ar, th. Nothing ships to players before its D10 release gates, and a Pages deploy still needs the creator's explicit OK.

Status: design spec, November 1, 2026. Read-only review of `C:\tenderloin-redux`; nothing under the repo was edited, staged or committed. All counts come from a snapshot of `browser-next/` and `tests/` copied at 01:24 PT to the scratchpad (`fork/i18n/snapshot/`). The snapshot is HEAD `a54815f` ("Wire the Phase 3 side stories into the 2D game (WIP checkpoint)"). Its uncommitted Phase 3 work is in `browser-next/sprites.js`, `visits-kit.js`, `visits-ui.js`, `tests/next-browser.mjs`, `next-sprites.test.mjs`, `next-visits-kit.test.mjs` and `next-visits-ui.test.mjs`, and `tests/next-visits-browser.mjs` is untracked. `sprites.js` grew from 539 to 640 lines during this review, and the Phase 3 polish was then committed as `e0b876f` ("Polish the Phase 3 scenes…"; it touches `game.js`, `sprites.js`, `visits-kit.js`, `visits-ui.js` and `visits/positions.js`). Re-measured on `e0b876f`, the totals are within 5 of the snapshot's: 2,020 multi-word units, 206 single-word labels, 20,894 words, 337 interpolating templates, 281 concatenation sites. The tables below are the snapshot's.

Reproducible tools are in the scratchpad (`C:\Users\jeffr\AppData\Local\Temp\claude\C--tenderloin-redux\4c5e49de-e485-4e4f-92ce-17784f75a2df\scratchpad\fork\i18n\`):
- `tools/jslex.mjs` is a JavaScript lexer. It handles nested template literals and regex literals, and every one of the 58 files lexed with balanced braces and parentheses.
- `tools/inventory.mjs`, `concat.mjs`, `origin.mjs`, `table.mjs`, `sensitive.mjs`, `htmlcss.mjs`, `cssphys.mjs` and `thai-wrap.mjs` produce the measurements, and `out/` holds their raw output, including `out/strings.tsv` with every human-text unit and its file and line.
- `lab/` holds a static server on 127.0.0.1:4199, a copy of the fork, and the Playwright probes `probe-fonts.mjs`, `probe-layout.mjs`, `probe-expansion.mjs`, `probe-keys.mjs` and `probe-bidi.mjs`. They ran Chrome 156.0.8078.79 on this Windows 11 Home 10.0.26220 machine. Their screenshots are in `lab/shots/`.
- No Playwright suite and no `npm test` was run, and port 4174 was not touched.

Conventions are the Phase 3 spec's:
- Code is named by file and function, Godot by `file:line`.
- The CRLF files are `game.js`, `core.js`, `world.js`, `camera.js`, `index.html`, `style.css` and `data/streets.osm.json`, and `tests/next-scaffold.test.mjs` pins them. Every new file in this spec is LF.
- "Locale" means one of `es`, `vi`, `ar` or `th`. "English" means today's output, byte for byte.

The recommendation in brief:
1. The English source stays in the JavaScript tables it lives in today, which are drift-tested and untouched.
2. Catalogs are same-origin JSON keyed by the exact English text, with an optional context. This is gettext's msgid model, so the catalogs convert to `.po` for Godot later.
3. Localization happens in two places:
   - at the five existing formatters (`gdFormat`, both `gdf`, `fmt`, `fill`), which look up the template before substituting;
   - at the view boundary (`show` templates, `announce`, `toast`, chips, aria attributes and title), which looks up static strings and, under the pseudo-locale, reports any English that reaches the screen.
4. English is the identity at every point, so every existing drift and browser test keeps passing unchanged, apart from the few named in 1.3.10.
5. RTL and Thai are engineering risks. They are retired early with pseudo-locales, before the first real locale ships.

---

## 1. Inventory

### 1.1 How it was measured

| Unit | Definition |
|---|---|
| String literal | Every `'…'`, `"…"` and template literal in the 58 `browser-next/**/*.js` files (12,501 lines, 940,814 bytes). Object keys and import specifiers are excluded. |
| Human-text unit | The literal's text after removing markup: text nodes between tags and the values of `aria-label`, `title`, `alt` and `placeholder` are separate units. Code-like values are excluded: ids, CSS, selectors, colors, fonts, SVG paths, URLs, event and key names. Placeholders (`%s`, `%d`, `%.Nf`, `${…}`) count as no word. |
| Multi-word | A unit with 2 or more words containing letters. |
| Single-word label | A unit with exactly 1 such word. |
| Words | Whitespace tokens with a Latin letter, counted over distinct units, so a string repeated in 3 files counts once. |
| Godot literal | The exact value equals one of the 4,337 distinct string literals that `tests/gd-lex.mjs` `tokens()` reads from the 27 `godot/*.gd` files. |

The quick count gave about 1,800 strings and 19,600 words. This count is 2,020 multi-word units and 20,892 words. It is higher because markup templates are split into their text nodes and attribute values. Counting whole literals only gives 2,006 multi-word strings and 20,439 words (`origin.mjs`).

### 1.2 Totals

| Measure | Count |
|---|---|
| Distinct multi-word units (JS) | 2,020 |
| Distinct single-word labels (JS) | 204 (Back, Close, Hint, Ready, Playing, Paused, On, Off, Bass, Brush, Chords, Lead, Table, Seats, Earlier, Later, the five names…) |
| Words over distinct units (JS) | 20,892 (22,356 over all occurrences) |
| Of which copied from Godot (exact literals, whole multi-word strings) | 1,275 strings, 13,140 words (64%) |
| Fork-authored or composed in the fork | 731 strings, 7,299 words (game.js alone: 464 strings, 4,834 words) |
| Distinct fork literals equal to a Godot literal (any length) | 1,508 |
| `index.html` | 68 text nodes / 211 words; 18 `aria-label`s / 101 words; `<title>` and `<meta name="description">` (18 words); 4 `<kbd>`; 3 live regions |
| Data files with displayed text | see 1.3.13 (about 250 displayed words) |
| Translatable words per locale (estimate) | about 21,500 (20,892 + 312 index.html + about 250 data; minus untranslatables about 3%; plus about 3% for re-authored composites and narrow variants) |

### 1.3 By category

**1.3.1 Single-word labels: 204.**
- These are short controls and states.
- Many short labels are context-ambiguous in gendered languages. "Ready" in "Soundcheck: Ready" agrees with a feminine noun in Spanish ("Lista"), and so do "On" and "Off" ("Music: On" is "Música: activada"). Others include Complete, Stop, Entry, Window, Seats, Gathering and Invite.
- 209 of the 2,231 distinct texts occur at more than one location, 144 of them in more than one file. 87 of those are 1 or 2 words long. Most mean the same thing everywhere (names, "Keep exploring" ×9, "Music: Off" ×10, "Back" ×6). Context keys are needed for an estimated 20 to 40 of them.

**1.3.2 index.html.**
- **Text nodes:** 68, with 211 words.
- **Text that stays English:** the brand "tenderloin redux"; "TURK STREET"; "© OpenStreetMap contributors · ODbL"; "San Francisco Planning Department / DataSF · PDDL…".
- **Mixed elements:** several elements mix text with `aria-hidden` arrows and `<kbd>`, for example `#journal-button` "Field notes ↗".
- **The hint sentence:** the `.map-bottom` hint is a sentence split by three `<kbd>` elements: "Tap to walk · drag to look · `WASD` / `↑↓←→` to move · `E` to talk". It must become one template with element placeholders.
- **Accessible names:**
  - 18 aria-labels;
  - the canvas name, a 37-word instruction that names keys: "…Move with arrow keys or WASD. Press E or Enter…";
  - `#close-modal` is named "Close dialog".
- **The chapter line:** `#chapter-text` is replaced at runtime by `chapterUI()`, so its static copy needs no translation.

**1.3.3 Canvas strings.**
- **`world.js`: 11 `this.text(` sites and 4 `this.chip(` sites, plus the bubble loop in `World.drawBubble`.**
  - Fixed map text: 'TURK STREET · HISTORY WALK', 'THE TRANSGENDER' and 'DISTRICT', 'A NEIGHBORHOOD OF MANY STORIES', and the letter-spaced 'T U R K   S T R E E T', 'T A Y L O R   S T R E E T' and 'M A S O N   S T'.
  - The `WEST_INTERSECTIONS` OSM street names, uppercased by `toUpperCase()`.
  - The gathering chip, with 6 variants: `Second afternoon · ${segment(…).name}`, 'A programme shared', 'An afternoon well spent', 'The Long Table', 'The Open Floor' and 'The gathering'.
  - `objectLabel` Black Hawk, short and long.
  - Neighbor names.
  - The hover chip: `PLACES` names and `LITTER` labels.
  - `SIGNS.rise` 'RISE', the mural art.
- **`sprites.js`:** one `chip(c, world, text, x, y, ink)` renderer, called once from `overlay()`. It draws about 25 Label3D texts from `visits/text.js` `labelTexts()`: 10 surprise labels, 6 eatery names "%s (fictional)", 6 menu chips "Today: %s", the park, the "So What" awning and floor, the museum and the portal.
- **Speech bubbles:** every neighbor line, composed at runtime.
- **Fonts:** all canvas text uses `"Segoe UI", sans-serif` (`world.js` `chip`, `drawBubble`; `sprites.js` `FONT`; `game.js` `measureText`) or `Georgia,serif` (district text).

**1.3.4 Accessible names.**
- **JS aria-labels:** 40 `aria-label` occurrences in the UI files: game.js 23, ending/ui.js 8, rhythm-ui.js 5, visits-kit.js 3, visits-episodes.js 1.
- **Other attributes:** 27 `title` sites, 13 `alt` sites and 3 `aria-describedby` sites.
- **The label-in-name rule** is implemented as text logic in `visits-kit.js` `btn()` with `startsWithLabel(name, label)`: when Godot's name starts with the label, it becomes the `aria-label`; otherwise it becomes an sr-only description. The rule must hold in every locale (2.10).
- **Composed names:** `game.js` builds names such as `aria-label="${task.title}. ${task.detail}"` (`updateUI`) and `aria-label="Column ${col + 1}, row ${row + 1}: ${route ? 'clear route, keep free' : item ? item[0] : 'empty'}"` (`layoutEditor`). The second inserts an id ('table', 'seats', 'speaker') as text.

**1.3.5 Announcements.**
- **Call sites:** about 130 in the UI files (`announce`, `toast`, `say`, `routeSay`, `modalStatus`, `notify`, `host.announce`, `host.toast`, `host.status`, `kit.say`, `status()`):

  | File | Calls |
  |---|---|
  | game.js | 58 |
  | ending/ui.js | 20 + 2 status |
  | visits-ui.js | 12 |
  | visits-kit.js | 11 + 3 status |
  | visits-world.js | 9 |
  | rhythm-ui.js | 7 + 6 status |
  | visits-episodes.js | 1 |
  | experimental-host.js | 1 |

- **Routing:** everything reaches the screen reader through `game.js` `announce()`, which routes to `#modal-status`, `#soundtrack-status` or `routeSay()` into `#route-status`, or through `toast()` into `#toast` or `#modal-notice`.
- **Speech:** `say()` and `speak()` mirror the bubble as `${name}: ${text}`, a structural join that needs a catalog entry, as French would show.

**1.3.6 Templates and placeholders.**
- **Printf-style tables:** 185 string literals hold GDScript placeholders, 402 in all (`%s`, `%d`, `%.Nf`, `%%`).
  - The largest has 9 placeholders: `characters.js` `PANEL_TEXT.header`, "Talking with %s (%s · %s · Turn %d/5) · %s · %d/%d Met · Mural %s · Sparks: %d".
- **Template literals:** 332 interpolate into human text, 152 of them in game.js.
- **Formatter calls:** 262 calls to the five formatters, each with its own English semantics, which must be kept byte-identical:
  - `characters.js` `gdFormat` (%s %d %%);
  - `ending/text.js` `gdf(template, ...args)` (%s %d %f %%);
  - `visits/format.js` `gdf(template, args)` (%s %d %.Nf %%, throws on missing args);
  - `story.js` `fmt` and `rhythm.js` `fill` (%s %d, ignore `%%`, Known debt).
- **Number output:** `gdFloat` prints Godot floats ("12.0"), and `toFixed` appears 13 times.

**1.3.7 Concatenation and fragments.** Godot builds many sentences by `+`, and the fork copies the fragments verbatim.

| Measure | Total | Worst offenders |
|---|---|---|
| `+` sites next to a literal | 281 (115 where the literal has words) | visits/meal.js 53, ending/orbital.js 46, visits/dogs.js 29, ending/hosted.js 20, visits/election.js 17, visits/before-streets.js 14, ending/habitat.js 13, ending/gather-again.js 12, visits/lantern.js 11, visits/power.js 11 |
| Template literals with interpolated text | 332 | game.js 152, ending/ui.js 24, ending/orbital.js 20, visits-kit.js 19, visits-episodes.js 15 |
| Fragment literals (leading or trailing space, or a joiner `, ` `·` `—` `:` `(`) | 272 | ending/text.js 117, visits/text.js 60, game.js 37, characters.js 16, rhythm.js 13, hosted-text.js 10 |
| `.join()` with a literal separator | 27 (15 list-like) | `core.js` `blockMissing` `', '`, `ending/hosted.js` `slots.join(', ')`, `ending/mural.js` `sceneReply` `.join(r.join)` |

Examples:
- `ending/hosted.js` `hostedDetail`: `H.OWNERS[index] + ': "' + reply + '"' + '\n' + heading + '\n' + result` and `d.storiesResult + BEA_TITLES[value] + '.'`, where `storiesResult` is "Copied invitation: ".
- `visits/dogs.js` line 57: `message: T.choose_lead.chose + LEADS[i] + …`, where `chose` is "You chose ".
- `characters.js`:
  - `ACTION_LABELS.returned` "Returned " and `.return` "Return ";
  - `CAPTION_TEXT.goodbye` "You said goodbye to %s." with `goodbyeNobody` "the block". Spanish needs "de la cuadra" here and "del vecindario" elsewhere.
- `bubble.js` `BUBBLE_TEXT.notice` "Full dialogue in %s." with `panel` "the conversation panel".

**1.3.8 Plural, number and gender agreement.**
- **Count templates:** 96 in all.
  - 19 count + noun, which need plural forms: "Copied rhythm: %d taps in eight slots, at %s.", "You gave us %d taps…", "%d links fitted.", "%d guests", "about %d blocks %s", "(%d/%d surprises found…)".
  - 49 ratio or progress labels: "Turn %d/5", "%d/3 Motifs Painted", "Return Gear (%d/3)".
  - 12 ordinals: "Step %d", "Chapter %d: %s", "Relay %d".
  - 16 others: "Volume: %d%%", "Frame %d of 3", "about %d m %s".
- **English-only plural logic:** `story.js` `compassPhrase`: `blocks <= 1 ? C.block : C.blocks`.
- **Godot defects copied by design:** "Step %d of5" and "1 taps". English keeps them; translations must not copy them.
- **Pronoun counts over distinct strings:** you/your 463, we/our 266, they/them 51, she/her 13, he/his 12.
- **Neighbors' implied genders** (from co-occurrence, to be confirmed by the creator): Bea she, Celeste she, Dez he, Rook he; Thanh and Imani unclear.
- **Speech envelopes:** 85 literals of the form `Name: "…"`, about 1,900 words. `bubble.js` `spokenText` and `characters.js` `greetingLine` rely on this shape.

**1.3.9 Markup and entities.**
- **Markup templates:** 102 templates carry markup, with 305 text nodes (game.js 81/276), for example `history()`: `<p>The northwest corner of Turk and Taylor is the site of Compton’s Cafeteria…</p>…<a class="source-link" …>Read the city’s document ↗</a>`.
- **Entities:** 0 source strings contain HTML entities. Text uses literal Unicode: ’ “ ” — · ↗ ….
- **Escaping:** 7 separate `esc()` helpers produce entities at runtime: game.js, gathering.js, keepsake.js, rhythm-ui.js, visits-kit.js, ending/art.js and ending/ui.js, plus `escape` in experiments/neighborhood-voices.js.
- **Unescaped insertion:** many game.js templates insert table values without `esc()`. That is safe only because the values are trusted English constants (2.5).
- **Other special characters:**
  - 99 strings embed `\n`; ending/ui.js and gather-again.js split headings on it.
  - 131 use curly quotes or apostrophes, and 323 use ASCII double quotes.
  - 43 contain arrows: "↗" as an "opens" marker, and "→" for the furniture grid's route.

**1.3.10 Strings tied to Godot, and the drift tests.**
- 1,508 distinct literals equal a Godot literal. They live in `visits/text.js` (541 strings, 5,208 words), `ending/text.js` (367 / 4,073), `characters.js` (197 / 2,322), `story.js`, `rhythm.js`, `civic.js`, `programme.js` and `hosted-text.js`. Exact matches only, and a string shared by two files is counted in the first file alphabetically: `characters.js` `SURPRISE_MEMORY` and `visits/surprises.js` hold the same memory lines.
- Under the recommended design these tables are not edited and every drift test keeps passing. The tests that would break, or that constrain how the work is done:

| Test | What it pins | Impact and required change |
|---|---|---|
| `tests/next-ending.test.mjs` (copies) | Each `GODOT` string is one Godot literal of its function, and every long literal of a listed function is copied | Composite templates must not be added to `GODOT`. They go in a separate declared fork table (`ending/compose.js`, 2.7) with its own "not a Godot literal" and parity tests. |
| `tests/next-visits.test.mjs` "every copied template occurs, in order…", "web overrides only drop 3D key hints" | `visits/text.js` contents | Same: composites go in a new `visits/compose.js`, never in `GODOT_TEXT` or `WEB_OVERRIDES`. |
| `tests/next-characters.test.mjs` | `NARROW_LABEL_REWRITES` equals Godot's `.replace` chain, `wrapLines` cases, `spokenText` cases, "game.js reads `BUTTON_TEXT`, not an inline …", `HOSTING_FORK_TEXT` in game.js, contrast rules read from `style.css` | Keep the English chain and narrow labels unchanged. Narrow translations live in the catalog. Keep English `wrapLines` (space-split) and add the Segmenter path only for non-English. Wrap as `t(BUTTON_TEXT.play)` so the source still contains `BUTTON_TEXT.play`. I3 keeps `.talk-badge` and `.talk-header` colors. |
| `tests/next-visits-ui`, `-kit`, `-episodes`, `-world` "no hand-copied Godot text" (`jsStrings` ∩ `gdStrings`) | UI files hold no Godot literal | Wrap table values, never literal copies. The new `game-text.js` must hold no Godot literal: game.js's 5 Godot literals (11 words) move to their Godot tables instead. |
| `tests/next-sprites.test.mjs` canvas call lists | The chip call sequence (save, translate, scale, shadow, body at -19, text) | Setting `c.direction` in `chip()` changes the recorded calls. I4 updates the expected lists. |
| `tests/next-press-settle.test.mjs` "the rapid set" | Literal `id="…" data-rapid` tags and the `${b.rapid ? ' data-rapid' : ''}` conduit | Extraction must not insert attributes between `id` and `data-rapid`, or move a rapid site out of its file. |
| `tests/next-scaffold.test.mjs` | CSP `deepEqual`; LF or CRLF per file; at least one LF per file | No CSP change (system fonts only, D12). Every `locales/*.json` must be pretty-printed LF with a final newline: a minified one-line JSON fails "has lines". |
| `tests/next-wiring.test.mjs` | Column-0 declarations and code-shape regexes in game.js (`declaration()`, `members()`, `inline()`) | Keep game.js declarations at column 0, and do not reshape the pinned code lines. Moving text out only helps `inline()`. |
| `tests/next-world.test.mjs`, `next-sprites`, `next-wiring` hit tests | `World.hit` geometry | Replacing `chip.text.length * 7 + 20` with the measured chip width (2.10) changes English hit areas slightly. Update any test that depends on the estimate. |
| Browser runners `tests/next-browser.mjs`, `next-ending-browser.mjs`, `next-visits-browser.mjs` | English text, ids, 320/390/1440 | Unchanged in English. Add `locale: 'en-US'` to their contexts so the first-run offer (2.9) never appears on a machine whose system language is supported. Playwright defaults to the system locale. |

**1.3.11 Proper nouns, addresses and names that stay as they are.**
- **Counts over distinct strings:**

  | Category | Strings |
  |---|---|
  | Street addresses (for example "361 Turk", "145 Leavenworth", "240 Eddy St") | 41 |
  | Intersections ("Turk & Taylor", "Jones & Turk", "Larkin/Eddy") | 61 |
  | A street name anywhere | 143 |
  | Real landmarks and organizations | 96 |
  | Fictional named characters and businesses | 57 |

- **Real landmarks and organizations include:** Compton's Cafeteria, Black Hawk, Boeddeker Park, Tenderloin Museum, Cadillac Hotel, GLIDE, TNDC, Larkin Street Youth Services, OpenStreetMap, DataSF, National Park Service, Ramaytush, SFMTA and Miles Davis.
- **Fictional names include:** Baker Mae, Chef Zafira, Starlight Vee, Nacho Captain Rico, Honker Barnaby, Pip the Tiny Dino, Imani, Pippin and Junebug, Morning Star Bánh Mì & Coffee, and Open Seat Diner & Pie Counter.
- **Strings that mention a named neighbor:** Bea 97, Celeste 93, Dez 94, Thanh 71, Rook 60.

**1.3.12 Logic keyed by text.** These must change or be justified, and the scan in 2.12 enforces the rule afterwards.

| # | Site | What it does | Fix |
|---|---|---|---|
| 1 | `characters.js` `narrowLabel` / `NARROW_LABEL_REWRITES` | English substring rewrites ("Go Meet " → "Meet ", "Spot Surprise (" → "Find ", "/10)" → "/10") | English unchanged. Locales get catalog narrow variants keyed by the wide template (2.4). |
| 2 | `characters.js` `neighborLines` | `line.includes('%s')` decides formatting | Test the English source before lookup (already the case). The parity test forbids dropping `%s`. |
| 3 | `characters.js` `greetingLine` | `line.endsWith('"')` inserts the art tail before the closing quote | Envelope rule: the validator requires translated speech lines to end with `"`. |
| 4 | `characters.js` `unquote`, `quoted` | Trims “ ” from memories | Translations keep “ ” (validator). |
| 5 | `bubble.js` `spokenText` | Strips `Name: "` (at most 12 code units) | Envelope rule plus the localized name. `«»` fails (measured, 1.5). |
| 6 | `bubble.js` `stepBubble`, `speechNotice`; `game.js` `announce()` dedup | Equality and `includes` between rendered texts | Same-locale comparisons; keep. The pseudo-locale test proves they still match. |
| 7 | `ending/ui.js` `stories()` | `t.name.split('. Paint')[0]` for the paper `alt` | Add an explicit `place` or `alt` field to `ending/mural.js` targets. |
| 8 | `ending/ui.js`, `ending/gather-again.js` | `heading.split('\n')` | Newline-parity rule. |
| 9 | `game.js` `filmButtonLabel` (createEnding host) | Reads `#film-shoot` `textContent` and strips " ↗" | Read the label from its table; the arrow moves to a span. |
| 10 | `world.js` `World.hit` | Label hit width `chip.text.length * 7 + 20` | Measured width of the drawn chip (cached). |
| 11 | `ending/hosted.js`, `ending/mural.js`, `characters.js`, `hosted-text.js`; `visits/landmarks.js` and `visits/surprises.js` via `visits/format.js` `gdCapitalize` | Display text made from ids or by English title-casing: `capitalize(value.palette)`, `slot[0].toUpperCase() + slot.slice(1)`, `capitalize(LOAN_OWNERS[id])`, the eatery burst `gdCapitalize(item)` ("1961 Live Jazz Lp") | Id-to-display tables (palette, slot, owner, menu item), with English equal to today's output (parity test). Locales never title-case. |
| 12 | `game.js` `layoutEditor` | `Placing ${id}.` and `item[0]` in the aria-label | Same display tables. |
| 13 | `visits-kit.js` `startsWithLabel` | Chooses `aria-label` or description by text | Presentation-only and adaptive per locale; allowlisted. |
| 14 | `bubble.js` `holdSeconds` | Hold time from code-point length | English unchanged; Thai counts graphemes. |
| 15 | `story.js` `compassPhrase` | Two-way English plural | Plural object in the catalog (2.7). |

**1.3.13 Data files with displayed text.**

| File | Multi-word strings | Words | Fields |
|---|---|---|---|
| `data/power_place.json` | 12 | 100 | name, address, history cause, report, fiction |
| `data/voting_places.json` | 28 | 90 | site names, addresses, listed descriptions, rooms, streets |
| `data/cultural-district-source.json` | 5 | 66 | dataset, publisher, license, scope, designation note |
| `experiments/neighborhood-voices.json` | 10 | 89 | name, topic, summary, sourceTitle |
| `data/transgender-district.geojson` | 1 | 3 | `district_name` |

- `experiments/neighborhood-voices.json` is byte-identical to `godot/data/neighborhood_voices.json`, and `tests/godot-data.test.mjs` pins the Godot copy against `public/`.
- `readRecords` in `neighborhood-voices.js` requires `version` 1, `checkedAt` '2026-10-18', exactly 3 records, a summary of at most 450 characters, other fields of at most 100, and a file of at most 8,192 bytes. Translations therefore never go into that JSON (2.6).

**1.3.14 Strings that are not player-visible.**
- These are developer-facing exceptions: `district.js` (8: "Invalid ring"…), `experimental-host.js` ("Optional module unavailable"), `visits-kit.js` "startWalk: %s is not an episode", and `visits/format.js` "Not enough arguments…".
- They stay English and are excluded by the extractor.
- `style.css` has no `content:` strings and `text-transform:none` only. Eyebrows are uppercase in the source strings ("SAN FRANCISCO, TOGETHER", "FIELD NOTE 01 · REAL PLACE").

**1.3.15 Content that needs care** (`sensitive.mjs`, keyword-based, approximate):

| Category | Strings | Words |
|---|---|---|
| Civic and voting | 60 | 939 |
| Missing pets | 66 | 902 |
| History and identity (trans history, Ramaytush land acknowledgement) | 41 | 581 |
| Power outage | 34 | 514 |
| Housing and tenants | 17 | 244 |
| Emergency and safety | 4 | 236 |
| **Union of the above** | **205** | **2,982** |
| Real organizations and sources | 35 | 819 |
| Key or control hints | 79 | 1,205 |

### 1.4 Per file, with risk

The columns are:
- **strings:** distinct human units, multi + single;
- **godot / fork:** strings/words, whole multi-word literals;
- **printf:** literals with `%` placeholders;
- **tpl:** template literals interpolating human text;
- **+:** concatenation sites next to a literal;
- **fmt:** formatter calls;
- **frag:** fragment literals;
- **count:** count templates;
- **markup:** markup templates/text nodes;
- **ann:** announcement call sites;
- **canvas:** canvas text sites;
- **keyed:** text-keyed logic sites from 1.3.12.

A file is rated:
- **high** when + plus tpl ≥ 25, frag ≥ 30, canvas ≥ 5, keyed ≥ 2, or it is a CRLF file with more than 1,000 words;
- **medium** when + plus tpl ≥ 8, printf ≥ 10, count ≥ 5, markup ≥ 2, keyed ≥ 1, or words ≥ 300;
- **low** otherwise.

| File | strings | words | godot | fork | printf | tpl | + | fmt | frag | count | markup | ann | canvas | keyed | risk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| visits/text.js | 661 | 5,692 | 541/5,208 | 19/189 | 67 | 0 | 0 | 0 | 60 | 45 | 0 | 0 | 0 | 0 | high (volume, fragments) |
| game.js (CRLF) | 581 | 4,967 | 5/11 | 464/4,834 | 0 | 152 | 6 | 4 | 37 | 0 | 81/276 | 60 | 1 | 4 | high |
| ending/text.js | 439 | 4,799 | 367/4,073 | 13/564 | 43 | 0 | 0 | 0 | 117 | 13 | 0 | 0 | 0 | 0 | high (fragments) |
| characters.js | 246 | 2,691 | 197/2,322 | 23/333 | 35 | 4 | 6 | 42 | 16 | 16 | 0 | 1 | 0 | 4 | high |
| story.js | 80 | 613 | 44/482 | 14/90 | 21 | 2 | 0 | 9 | 0 | 13 | 0 | 0 | 0 | 1 | medium |
| civic.js | 32 | 468 | 15/195 | 4/113 | 0 | 2 | 1 | 0 | 0 | 0 | 1/1 | 0 | 0 | 0 | medium (housing content) |
| hosted-text.js | 32 | 386 | 14/189 | 6/93 | 3 | 0 | 3 | 4 | 10 | 2 | 0 | 0 | 0 | 1 | medium |
| programme.js | 30 | 343 | 13/189 | 7/117 | 0 | 6 | 0 | 0 | 0 | 0 | 2/2 | 0 | 0 | 0 | medium |
| visits/surprises.js | 20 | 340 | (shared with characters.js) | – | 0 | 0 | 3 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | medium |
| rhythm.js | 52 | 336 | 35/295 | 2/18 | 5 | 0 | 1 | 6 | 13 | 4 | 0 | 0 | 0 | 0 | medium |
| film.js | 24 | 280 | 1/2 | 6/110 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | low |
| hosting.js | 18 | 227 | 0/0 | 16/221 | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | medium |
| gathering.js | 17 | 145 | 0/0 | 13/123 | 0 | 6 | 0 | 0 | 4 | 0 | 1/1 | 0 | 0 | 0 | low |
| experiments/neighborhood-voices.js | 13 | 122 | 0/0 | 8/123 | 0 | 2 | 0 | 0 | 0 | 0 | 2/9 | 0 | 0 | 0 | medium (real organizations) |
| world.js (CRLF) | 30 | 100 | 0/0 | 17/44 | 0 | 3 | 0 | 7 | 2 | 0 | 0 | 0 | 18 | 2 | high (canvas) |
| visits-kit.js | 11 | 64 | 0/0 | 15/67 | 0 | 19 | 5 | 0 | 0 | 0 | 2/2 | 8 | 0 | 1 | medium |
| keepsake.js | 14 | 63 | 2/12 | 5/39 | 0 | 6 | 0 | 0 | 0 | 0 | 2/2 | 0 | 0 | 0 | medium |
| core.js (CRLF) | 13 | 56 | 5/38 | 9/18 | 4 | 0 | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 1 | medium |
| rewards.js | 18 | 55 | 10/35 | 2/11 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | low |
| soundtrack.js | 4 | 43 | 0/0 | 4/34 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | low |
| visits/dogs.js | 8 | 42 | 8/39 | 1/1 | 0 | 0 | 29 | 2 | 0 | 0 | 1/1 | 1 | 0 | 0 | high (concatenation, missing pets) |
| godot-save.js | 2 | 31 | 0/0 | 2/31 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | low (but the messages are save-safety text) |
| district.js | 9 | 23 | 0/0 | 9/23 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | low |
| visits/meal.js | 5 | 21 | 2/7 | 0/0 | 0 | 0 | 53 | 13 | 0 | 0 | 2/2 | 0 | 0 | 0 | high (concatenation) |
| sketch-core.js | 7 | 17 | 5/15 | 0/0 | 4 | 0 | 1 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | low |
| visits/election.js | 6 | 16 | 4/13 | 0/0 | 0 | 0 | 17 | 7 | 0 | 0 | 1/1 | 1 | 0 | 0 | medium (civic content) |
| ending/ui.js | 9 | 14 | 0/0 | 14/14 | 0 | 24 | 3 | 0 | 0 | 0 | 4/4 | 19 | 0 | 2 | high |
| bubble.js | 4 | 10 | 3/9 | 0/0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | high (wrapping, envelope) |
| history.js | 4 | 10 | 0/0 | 4/10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | low (street names stay) |
| visits/positions.js | 5 | 10 | 2/4 | 3/4 | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | low |
| rhythm-ui.js | 2 | 5 | 0/0 | 2/2 | 0 | 7 | 0 | 0 | 0 | 0 | 1/2 | 6 | 0 | 0 | low |
| visits-episodes.js | 2 | 5 | 0/0 | 9/12 | 0 | 15 | 0 | 0 | 1 | 0 | 0 | 2 | 0 | 0 | medium (overlays) |
| visits/lantern.js | 1 | 5 | 0/0 | 0/0 | 0 | 0 | 11 | 1 | 0 | 0 | 1/1 | 1 | 0 | 0 | medium |
| ending/orbital.js | 1 | 3 | 0/0 | 1/1 | 0 | 20 | 46 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | high (concatenation) |
| ending/hosted.js | 1 | 1 | 0/0 | 0/0 | 0 | 0 | 20 | 5 | 0 | 0 | 0 | 0 | 0 | 1 | medium |
| ending/art.js | 0 | 0 | 1/1 | 3/3 | 0 | 8 | 7 | 34 | 0 | 0 | 1/1 | 0 | 0 | 0 | medium |
| ending/habitat.js, bench.js, gather-again.js, mural.js, screening.js | 0 | 0 | – | – | 0 | 16 | 29 | 49 | 1 | 0 | 0 | 0 | 0 | 2 | medium (mural.js high: keyed) |
| visits/before-streets.js, power.js, landmarks.js, picker.js | 0 | 0 | – | – | 0 | 4 | 30 | 53 | 2 | 0 | 0 | 2 | 0 | 0 | medium |
| visits-ui.js, visits-world.js, sprites.js | 0 | 0 | – | – | 0 | 22 | 9 | 9 | 0 | 0 | 0 | 30 | 4 (sprites) | 0 | medium |
| index.html (CRLF) | 68 nodes + 18 aria | 312 | – | all | – | – | – | – | 3 kbd splits | 1 | all | 3 live | – | – | medium |
| style.css (CRLF) | 0 | 0 | – | – | – | – | – | – | – | – | – | – | – | – | high for RTL (63 physical declarations, 1.5) |

### 1.5 Experiments (scratch copy, Chrome 156, this machine)

1. **Fonts** (`lab/probe-fonts.mjs`, CDP `CSS.getPlatformFontsForNode`; screenshot `lab/shots/fonts.png`).

   | Language | `--sans` (`'Segoe UI',system-ui,sans-serif`) | `--serif` (`Georgia,'Times New Roman',serif`) |
   |---|---|---|
   | es | Segoe UI, all glyphs | Georgia, all glyphs |
   | vi | Segoe UI, all glyphs | **Broken.** Of the 61 glyphs in the sample, Chrome took 13 from Times New Roman because Georgia lacks them, and the tone marks render detached ("Điề` u tố´ t", visible in the screenshot). This affects all 8 `font-family:var(--serif)` rules, including `h1`, `dialog h2` and `.afterglow-heading h2` (`.brand` is too, but the brand stays English). |
   | ar | Segoe UI, all glyphs | Times New Roman (Arabic) mixed with Georgia (Latin) |
   | th | Tahoma (51 glyphs) + Segoe UI (5). Leelawadee UI is installed but not chosen. | Tahoma + Georgia |

   On the canvas, Thai under `"Segoe UI", sans-serif` measured a different width from both Tahoma and Leelawadee UI, so canvas fallback differs from DOM fallback. This could not be identified further.

2. **Width of translations** (`lab/probe-expansion.mjs`: 40 fork strings, machine-drafted renderings used only for measurement, at 13 px in `--sans`). Ratios are to English.

   | Language | median | p90 | max | Widest |
   |---|---|---|---|---|
   | es | 1.16 | 1.58 | 1.80 | "Full block" → "Cuadra completa" |
   | vi | 1.16 | 1.49 | 1.70 | |
   | ar | 0.93 | 1.16 | 1.66 | |
   | th | 0.87 | 1.17 | 1.51 | |

   Short labels grow most. Spanish short labels have a p90 of 1.52.

3. **Pseudo text at +40% and +70%** (`lab/probe-layout.mjs`, injected with `addInitScript` into the scratch copy). It covered the startup card, the main page, a neighbor conversation and 8 dialogs (Settings, Field notes, Meet the neighbors, map info, History walk, music, about, Living district), at 320×667, 390×844 and 1440×1000.
   - **DOM:** no dialog overflow, no text under ×, and no new control below 44 px. The only small controls are inline source links, the same as in English.
   - **The masthead at 320 px:** the page overflowed by 10 px only when the brand was pseudo-translated as well. With `.brand` and `.map-credit` left in English, nothing overflowed.
   - **The canvas** is where text has no limit. At 390 px the eatery chips reach about 300 of 358 px. The "Following you" camera status grows over the compass, and the compass "N" itself is text (`expand-390-canvas.png`).

4. **RTL pseudo**: `dir=rtl lang=ar`, Latin mapped to Arabic letters, +25% (`rtl-*.png`). Flex and grid layouts mirror correctly on their own. Defects:
   - × stays top-right and overlaps the startup card's `.welcome-art` bars (`rtl-390-startup.png`).
   - The conversation's accent border stays on the left (`rtl-390-conversation.png`).
   - ⓘ moves to the top-left beside `.camera-controls`. At 390 px the reversed camera row covers the compass.
   - The page overflows by 12 px at 320 px (`header.masthead`, even with the brand in English). It does not overflow in LTR.
   - A naive translation also translated the key "E" inside the world prompt.

5. **Bidi** (`lab/probe-bidi.mjs`, `bidi.png`; DOM and canvas agree).
   - "عند 361 Turk" displays as "Turk 361". Wrapping the address in LRI…PDI fixes it.
   - "WASD / ↑↓←→" reorders to "→←↓↑ / WASD". An isolate fixes it.
   - "1961 / 1966 / 1907" reads in RTL order, which is correct for Arabic readers.
   - The canvas inherits `direction` from `<html dir>`, and isolates work in `fillText`.

6. **Keyboard** (`lab/probe-keys.mjs`).
   - With an Arabic (101) or Thai (Kedmanee) layout, the D key reports `key` 'ي' or 'ก' with `code` 'KeyD'. The player moved 0 px against 90 px with a US layout, because `game.js` reads `event.key.toLowerCase()` against `MOVE_KEYS` and `'e'`.
   - Arrow keys work in every layout.
   - W/A/S/D and E therefore do nothing for Arabic and Thai players until they switch layouts, while the UI tells them to press them.

7. **Thai wrapping** (`tools/thai-wrap.mjs` on the snapshot's `bubble.js`).
   - `wrapLines` splits only on spaces and then breaks over-long runs by code point. It broke "เพื่อหา" mid-word ("เพื่อห|าไดโนเสาร์").
   - Breaking at `Intl.Segmenter('th', {granularity:'word'})` boundaries broke between words. Names missing from the dictionary still split ("บอดเด|เกอร์").
   - `spokenText` stripped Arabic and Thai envelopes with ASCII quotes, but not «» quotes.

8. **Intl** (Node 26.4, ICU 78.3, CLDR 48, and Chrome 156).
   - Plural categories: es one/many/other, vi other, ar zero/one/two/few/many/other, th other.
   - Plain `ar` now formats with Western digits, but `ar-EG` and `ar-SA` use Arabic-Indic digits ("١٬٢٣٤٫٥"), so the tag must pin `-u-nu-latn`.
   - Thai dates default to the Buddhist era ("18 ตุลาคม 2569").
   - `Intl.ListFormat('ar')` glues "و" to Latin names ("Bea وDez وThanh").
   - Chrome 156 supports `:dir()`, logical properties, `text-wrap: pretty`, `line-break: anywhere` and `Intl.Segmenter`.

---

## 2. Architecture

### 2.1 Recommendation

The design rests on seven parts:

1. **English stays where it is.**
   - Godot copies stay in the drift-tested tables (`characters.js`, `ending/text.js`, `visits/text.js`, `story.js`, `rhythm.js`, `hosted-text.js`, `sketch-core.js`, `rewards.js` and others).
   - Fork text stays in its declared `FORK_TEXT` tables.
   - Inline fork text in `game.js` moves to a new declared table, `browser-next/game-text.js` (LF).
   - No English byte changes.
2. **Catalogs are keyed by the exact English string the 2D edition shows**, after `webLine`, `web` or `webText` overrides. A context key is added only where one English string needs two translations. This is gettext's msgid plus msgctxt model.
3. **One module, `browser-next/i18n.js`** (pure, LF), holds the active catalog. It exposes:
   - `L(english, ctx?)`: template lookup;
   - `t(english, ctx?)`: lookup at the view boundary;
   - `format(...)`: the shared formatter core used by the five existing formatters;
   - `plural`, `select`, `list` and `num`;
   - `isolate`: bidi isolation for RTL;
   - `html`: escaped HTML with a `lang="en"` span for fallbacks;
   - `pseudo`: a deterministic pseudo-locale transform for tests.
4. **English is the identity.** With no catalog every function returns today's value through today's code path, so every existing test is unaffected.
5. **Localization is applied at two layers:**
   - *at composition*: the formatters look up the template before substituting, and table values passed as arguments go through `L()`;
   - *at the view boundary*: `show()` templates, `announce`, `toast`, `status`, chip text, aria/title/alt construction, `document.title` and `index.html`. Static strings are looked up there. Under the pseudo-locale every string that reaches the boundary is checked, and English that slips through is reported.
6. **Composed sentences that Godot builds from fragments get whole-sentence templates** in new fork tables (`ending/compose.js`, `visits/compose.js`, and composites in `game-text.js` and `characters.js`). A *composition-parity test* proves that each English composite produces exactly the legacy concatenation for a matrix of inputs. The localized path uses the composite. The English path may keep the concatenation or switch to the composite, since parity makes them equal.
7. **Runtime catalogs are served same-origin** under `browser-next/locales/` and fetched lazily, validated, hash-checked and fall back per string. Review metadata and the generated source catalog live outside the published folder in a new top-level `i18n/` folder.

### 2.2 Alternatives compared

| Criterion | **A. English text as key + optional context (recommended)** | B. Stable ids (`characters.PANEL_TEXT.header`) as keys | C. DOM pass: translate text nodes after `innerHTML` |
|---|---|---|---|
| Fit with drift-tested tables | Direct: formatters receive the template value and look it up | Needs ids at about 2,000 call sites, or a value-to-id index, which collides on duplicate values just like A | Direct for static nodes |
| English byte-identity | Identity by construction | Identity, but needs plumbing | Identity |
| Composed strings | Template looked up before substitution | Same | Fails: interpolated nodes never match a key, and fragments get translated |
| English edits (Godot drift) | Key changes, so the old translation can never show stale. The tool carries it over as a fuzzy suggestion, with location metadata. | Translation stays attached and is flagged stale by a source hash. The runtime must check hashes or show outdated meaning. | Like A |
| Homographs ("Ready", "On") | Context key at about 20 to 40 call sites | Implicit per id, but only if call sites pass ids | Impossible |
| Translator context | Source text visible; location and notes from the extractor | Id gives location; needs an English column | Poor |
| Future shared catalog with Godot | Same as gettext msgid. Godot's auto-translation (Label and Button text equal to a msgid) works for static text without code changes. | Godot needs `tr("ID")` at all 185 `.text =` sites of `main.gd` | – |
| Godot docs' caution ("games use … a unique ID") | Mitigated by the location ids in `i18n/source.json` and by fuzzy carry-over, gettext's msgmerge model | Natural | – |
| Detection of missed extraction | Pseudo-locale at the boundary | Same | Hides misses |

C is rejected. B is a sound design for a new code base, but in this one it adds an indirection without removing A's context work, and it gives up Godot compatibility. Ids still exist as tooling metadata: each msgid in `i18n/source.json` carries its table paths, such as `characters.PANEL_TEXT.header`, and that drives carry-over, review batching and context naming.

*Format.* JSON at runtime: no parser to ship, and it is CSP-safe. `.po` is a later export target (section 5). Authors edit JSON or a spreadsheet export (4.3).

### 2.3 Files

| Path | Kind | Purpose |
|---|---|---|
| `browser-next/i18n.js` | new, LF, pure | `LOCALES`, bootstrap strings, `readCatalog`, `loadCatalog` (injected fetch), `setLocale`, `L`, `t`, `format`, `plural`, `select`, `list`, `num`, `isolate`, `html`, `pseudo`, `canvasFont`, the miss hook |
| `browser-next/game-text.js` | new, LF | `GAME_TEXT`: the inline fork text of `game.js`, grouped by screen, plus fork composites. Declared fork text, tested not to be Godot literals. |
| `browser-next/ending/compose.js`, `browser-next/visits/compose.js` | new, LF, pure | Whole-sentence composites over Godot fragments, each with a parity test |
| `browser-next/locales/index.json` | new, generated | Manifest: per locale `code`, `endonym`, `dir`, `status`, `coverage`, `sha256` |
| `browser-next/locales/{es,vi,ar,th}.json` | new | Runtime catalogs, pretty-printed LF, keys sorted |
| `i18n/source.json` | new, generated, not published | Every msgid with context, table paths and locations, placeholder signature, length class (chip, label, button, sentence, paragraph), speaker and addressee, sensitivity tags |
| `i18n/review/<code>.json`, `i18n/glossary.csv`, `i18n/characters.md`, `i18n/style/<code>.md`, `i18n/README.md` | new | Review status per batch and entry, glossary, character sheet, style guides, contributor guide |
| `scripts/i18n.mjs` | new | `extract`, `check`, `init <code>`, `merge` (fuzzy carry-over), `manifest`, `export-sheet` and `import-sheet` (CSV), `pseudo` |
| `tests/next-i18n.test.mjs`, `tests/next-i18n-catalogs.test.mjs`, `tests/next-i18n-pseudo.test.mjs`, `tests/next-locales-browser.mjs` | new | 2.12 |

`.github/workflows/deploy-pages.yml` copies `browser-next/*` whole, so `locales/` is published without a workflow change. `scripts/serve.mjs` already serves `.json` as `application/json; charset=utf-8` with `no-cache`. `scripts/build-fingerprint-next.mjs` hashes every file, so a catalog update changes the fork's fingerprint as it should.

### 2.4 Catalog format

```json
{
  "format": 1,
  "locale": "es",
  "messages": {
    "Field notes": "Notas de campo",
    "Talking with %s (%s · %s · Turn %d/5)  ·  %s  ·  %d/%d Met  ·  Mural %s  ·  Sparks: %d":
      "Hablando con %1$s (%2$s · %3$s · Turno %4$d/5)  ·  %5$s  ·  %6$d/%7$d conocidos  ·  Mural %8$s  ·  Chispas: %9$d",
    "Copied rhythm: %d taps in eight slots, at %s.":
      { "one": "Ritmo copiado: %d golpe en ocho espacios, a %s.", "other": "Ritmo copiado: %d golpes en ocho espacios, a %s." },
    "%s added": { "$select": 1, "table": "Mesa añadida", "seats": "Asientos añadidos", "other": "%s añadido" }
  },
  "context": { "characters.PANEL_TEXT.scReady": { "Ready": "Lista" } },
  "narrow": { "Go Meet %s": "Conocer a %s", "Spot Surprise (%d/%d)": "Buscar %d/%d" },
  "address": { "m": { "…": "…" }, "f": { "…": "…" } }
}
```

**Values.** A value is one of:
- a string;
- a plural object with the locale's CLDR categories and a required `other`. The selector is the first `%d`, or `"$count": n` for the nth argument;
- a select object with `"$select": n` and a required `other`. The nth argument must be an id: neighbor ids, palette, slot, item.

**Placeholders.**
- Translations of Godot templates use the same printf family as the source: `%s`, `%d`, `%.Nf`, `%%`, and positional `%n$s` or `%n$d` for reordering.
- Fork-authored new templates may use named `{name}` placeholders (Godot's docs prefer named ones). Their translations must use the same names.

**Optional sections.**
- `narrow`: narrow-screen labels keyed by the wide template (1.3.12 #1).
- `address`: used only by `ar`, if decision D5 adopts a form-of-address setting.
- `context`: keyed by the context name, which is the table path.

**Never in the runtime file:** status, reviewer, notes. These live in `i18n/review/`.

### 2.5 Loading, validation, caching and hostile input

**Loading** (`i18n.js` `loadCatalog`):
1. Fetch `./locales/index.json` with `cache: 'no-cache'`, then `./locales/<code>.json?h=<sha256 prefix>`. Use an `AbortController` timeout of 10 s, the same as `loadVisitData` and `requestDistrict`.
2. Read with a 1 MB cap, as `neighborhood-voices.js` `readBounded` does.
3. Compute SHA-256 with `crypto.subtle` and compare it with the manifest. On a mismatch, refetch once with `cache: 'reload'`; if that also fails, use English.
4. `JSON.parse` inside try/catch.

**Validation.** `readCatalog(text, code, sourceIndex)` is pure.
- The envelope (`format === 1`, `locale === code`, the sections are objects) must be valid, or the whole catalog is rejected and English is used.
- An entry is dropped, and that string falls back to English, when:
  - its key is not in the source index;
  - its value is not a string, plural or select object;
  - it fails placeholder parity, newline parity, the speech envelope (`Name: "` … `"` with the localized name), curly-quote parity or `%%` parity;
  - it introduces `<`, `>` or a URL or domain absent from the source;
  - it contains control characters other than `\n`, LRI/RLI/FSI/PDI or LRM/RLM;
  - it is longer than 4 × the source + 120 characters;
  - its plural object has a key that is not one of `Intl.PluralRules(locale)`'s categories, or has no `other` (corrected in I1, below: not an exact category match);
  - it drops a protected token: brand, key names (E, WASD, Enter, Esc, Shift, F5), "BPM", or a name or address from the glossary's do-not-translate list.
- Results are stored in `Map`s (no prototype pollution) and frozen.

**Rendering and storage.**
- Catalog text is data. It is inserted only through `textContent`, `esc()` or `html()`, and attributes are always escaped. Keeping the `<`/`>` ban is defense in depth, because several `game.js` templates insert table values without `esc()` today.
- The language code is stored in the fork settings key. Catalogs are never stored in `localStorage`: the origin's storage quota is shared with the Godot save.
- Within a visit the catalog is cached in memory, and across visits by HTTP. GitHub Pages sends `max-age=600`, which is why the manifest hash parameter is used. There is no service worker.

**Async discipline**, the review rule:
- A language switch issues a request token. A response that arrives after a newer switch is ignored.
- After the await, the Settings screen re-renders only if it still holds the dialog: `modal.open && body.querySelector('[data-settings]')`, a marker I1 adds to the `showSettings()` markup, which has none today.
- Otherwise the new locale applies to the page chrome, the canvas and the next screen render. No other open screen is redrawn mid-interaction.

**Bootstrap strings.** For each locale, `i18n.js` embeds about 8 strings needed before or without a catalog: the endonym, "Language", the first-run offer, "Loading…", and "could not load; continuing in English". They are reviewed with the locale.

### 2.6 Where localization applies

| Surface | Today | With i18n |
|---|---|---|
| Dialogs: `game.js` `show(html)`; `ending/ui.js`, `rhythm-ui.js` and the visits screens via `host.show` | Templates with inline English (game.js) or table values | Text pieces through `t()`/`html()` at template construction. Inline English moves to `GAME_TEXT`. Markup stays in the template, and sentences with an inline element use placeholders filled with escaped HTML (`html(template, …parts)`). |
| `announce`, `status`, `toast`, `notify`, `routeSay`, `say`, `speak` | Composed English | Composed localized by the formatters. The boundary passes text through and, under the pseudo-locale, records any English. |
| Speech bubble (`bubble.js` + `world.js` `drawBubble`) | `spokenText(line)` | The line is already localized. Wrapping is locale-aware (3.4). `c.direction` is set from the locale (3.3). |
| Canvas chips (`world.js` `objectLabel`, `World.chip`; `sprites.js` `labelTexts`, `chip`) | Table values and literals | `t()` when the label is built. Font from `canvasFont()`. Hit width measured. Proper nouns stay as they are, isolated in RTL. |
| Canvas map text (`world.js` `this.text`) | Literals | Street names and the district's name are not translated (D8). 'HISTORY WALK' and 'A NEIGHBORHOOD OF MANY STORIES' go through `t()`. |
| aria-label, title, alt, `aria-describedby` texts | Templates | Built from translated pieces. The visible label comes first (WCAG 2.5.3); `btn()` adapts per locale. |
| `index.html` static text | English in HTML | `data-i18n` on elements whose whole text is one msgid, and `data-i18n-attr="aria-label"` for attributes. `game.js` replaces them from their own English text, which is the key, when the locale is applied. Arrows and `<kbd>` move into their own elements. The brand, street names and attribution get `translate="no"` and `lang="en"`. |
| `document.title` | Static | `t('Tenderloin Redux — A little room for good')`. The brand must remain, and the validator checks it. |
| Settings | No language row | A `<select id="language">` of endonyms, each option with `lang`, labelled "Language" in the active language plus " (Language)" when that is not English. 44 px minimum. |
| `neighborhood-voices` records | Shown verbatim | `readRecords` validates the English file unchanged. Display goes through `t(record.topic)`, `t(record.summary)` and so on, keyed by the English field values. Names and `sourceTitle` stay English, marked "(in English)" and `hreflang="en"`. |

### 2.7 Composition

- **Formatter core.** `format(template, args, flavor)`:
  - In English, it calls the legacy function for that flavor, so `fmt` and `fill` still ignore `%%`, `visits/format.js` still throws on missing arguments, and `%.Nf` is still `toFixed`.
  - In a locale, it looks the template up in the catalog (falling back to English for the whole sentence, so a sentence is never half-translated), picks the plural or select variant, substitutes positional or sequential arguments, and in RTL wraps every argument in FSI…PDI.
  - The five formatters become one-line wrappers that keep their names and signatures.
- **Arguments.** Table strings used as arguments (`PANEL_TEXT.playing`, `CAPTION_TEXT.goodbyeNobody`, programme titles, palette names) are localized at the call site with `L()`. A formatter does not translate arguments blindly, because a local music file name could equal an English key. Missed arguments show up in the pseudo-locale test as English inside pseudo text.
- **Fragments:**
  - Structural joiners (`' · '`, `': '`, `'\n'`, `'%s: %s'`) become small catalog entries, so translators can adjust punctuation.
  - Inserted noun phrases (names, titles, places) stay arguments, with case and article guidance in the style guide.
  - Sentence fragments, meaning beginnings and ends of sentences joined with `+`, become whole composites in `*/compose.js` (2.1 point 6). Estimated number of composites: about 150, mostly in visits/meal.js, ending/orbital.js, visits/dogs.js, ending/hosted.js, visits/election.js, visits/before-streets.js, ending/habitat.js, ending/gather-again.js, visits/power.js and visits/lantern.js.
- **Plurals.** `Intl.PluralRules(intl)` is applied only to entries that are plural objects. English has none, because Godot's templates are single and "1 taps" stays.
  - Ratio labels ("%d/5") are best rephrased by translators as "Label: %d/5" to avoid agreement.
  - `compassPhrase`'s `blocks` template becomes a plural object in locales. Godot's `blocks <= 1` branch keeps choosing the "a block" template.
- **Gender:**
  - Neighbor-dependent wording uses `select` on an id argument that the code passes, mapped by the character sheet (D7).
  - The player is ungendered. Spanish uses neutral rewording; Arabic follows decision D5.
- **Lists.** `list(items, englishJoin)`: English returns `englishJoin(items)`, today's code. Locales use `Intl.ListFormat(intl, {type:'conjunction'})`. Arabic needs transliterated names: verified "Bea وDez" against "بيا وديز".
- **Numbers.** `num()`: English returns `String()` as today. Locales use `Intl.NumberFormat(intl)`, which matters for decimals only: vi "1,5", es-US "1.5". Arabic uses `ar-u-nu-latn`, Western digits (D5).
- **Dates.** The game has no runtime dates; dates are text written by translators. `th-u-ca-gregory` is used if one is ever formatted.

### 2.8 Fallback

- Fallback is per msgid, and composed sentences fall back whole.
- In a non-English locale, `html()` wraps fallback English in `<span lang="en" dir="ltr">`.
  - Attributes cannot carry a `lang`. An untranslated aria-label is a release blocker for shipped locales.
- Proper nouns are not fallbacks: they carry no `lang` marking, but are isolated in RTL.
- Dev and test builds expose `window.tenderloin.i18n()`, with `{ locale, misses, rejected }`, through the existing frozen diagnostics object.

### 2.9 Language setting, first run, `lang`, `dir` and title

- **Storage.** The setting is `settings.language` (`'en' | 'es' | 'vi' | 'ar' | 'th'`, absent means not chosen) in `tenderloin-redux.browser-next.settings.v1`, saved by `game.js` `saveSettings()`, which already writes the whole object.
  - `settings.languageOffer: 'declined'` remembers a dismissed offer.
  - `settings.addressForm` (`'m' | 'f'`) is used only if D5 adopts it.
  - The loader accepts only known values.
  - The shared save `tenderloin-redux.godot.save.v1` gains nothing.
- **Boot.** `game.js` reads settings synchronously, as today. Then:
  1. If a language is set, it fetches the catalog in parallel with `./data/streets.osm.json` in `init()`, and awaits both before `showChapterCard(true)`.
  2. A failure means English, plus the bootstrap notice in a toast.
  3. Static `index.html` text shows English briefly behind the loading overlay (D17).
- **First run.**
  - Condition: no stored language, and `navigator.languages` holds a shipped locale (primary subtag match: `es-MX` gives es).
  - The startup card then shows one declared fork row, from bootstrap strings: "¿Jugar en español? · Play in Spanish?" with two buttons.
  - The game never switches on its own. Focus stays on Start Exploring, Godot's rule.
- **URL.** `?lang=xx` sets the session language for links and QA without storing it, and `&preview=1` admits non-shipped locales with a "Preview translation" badge.
- **Applying a locale:**
  - `document.documentElement.lang` is set to `es`, `vi`, `ar` or `th`, and `dir` to `rtl` for `ar`, otherwise `ltr`.
  - The `Intl` tag is kept separately: es-US, vi-VN, ar-u-nu-latn, th-TH-u-ca-gregory.
  - The canvas inherits `dir`.
  - `document.title` is set.
  - Static nodes are re-translated, and the next frame redraws the canvas.
  - The change is announced in the new language with the bootstrap string "Language: Español".
- **Transient messages.** The toast, `#route-status`, the bubble and `chapterNotice` are cleared on a switch. Side-story session messages already composed into visit state (`visits/dogs.js` `message`, `lantern.js`, `election.js`) stay in the old language until the next action, a documented limit (R9).

### 2.10 Logic keyed by text: fixes

Section 1.3.12 lists every site and its fix. The no-text-keyed-logic scan (2.12) enforces the rule afterwards: logic must never compare, search or split *rendered* text, and ids are never derived from text. Comparisons between two renderings in the same language are allowlisted, with the pseudo-locale test proving they still match. Lookups of English source text before localization are allowed (`webLine`, `web`, `WEB_OVERRIDES`).

### 2.11 Performance and CSP

**Size and parse** (estimates).
- A catalog carries the English keys (about 125 KB) plus the translation: about 270 KB raw for es and vi, about 370 KB for ar (2 bytes per letter in UTF-8), and about 480 KB for th (3 bytes per letter), or about 70 to 120 KB gzipped from Pages.
- It parses in a few ms on desktop and roughly 10 to 30 ms on a phone.

**Hot paths:**
- Lookups are `Map` gets.
- `Intl` objects are created once per locale.
- `stepBubble` re-wraps on every frame, so wrapped lines are memoized by (text, width, font).
- Canvas widths are memoized by (font, text) for chips and hits.

**CSP.**
- Everything stays within the pinned policy: same-origin `fetch` (`connect-src 'self'`), no `eval`, no inline script or handler, and system fonts only, so no `font-src` is needed.
- Self-hosting fonts later would need `font-src 'self'` and an update to the `deepEqual` in `tests/next-scaffold.test.mjs` (D12).

### 2.12 Tests (English stays the source of truth)

**Existing tests.** Every drift test is untouched. The few other tests that change are listed in 1.3.10: the sprites call lists, the hit tests and the runners' `locale`.

**`tests/next-i18n.test.mjs`** (pure):
- `readCatalog` against hostile input: non-JSON, wrong `locale`, arrays, `__proto__` keys, huge strings, markup, URLs, control characters, wrong plural categories, placeholder mismatch, envelope and newline mismatch.
- Per-string fallback.
- Whole-sentence fallback.
- English identity for all five formatter flavors, compared with the legacy functions over a randomized template and argument matrix.
- `list` and `num` identity in English.
- Isolation in RTL.
- `pseudo` determinism.
- Stale-response handling with an injected fetch and deferred promises.

**`tests/next-i18n-catalogs.test.mjs`:**
- *Freshness:* `i18n/source.json` equals `scripts/i18n.mjs extract` on the current tree, so English drift reaches translators.
- *Completeness:* each shipped locale covers 100% of msgids (minus the allowlist); preview locales report coverage.
- *Placeholder parity*, newline and `%%` parity, envelope, quotes, protected tokens.
- *Manifest:* hashes equal the files, and status values are valid.
- *Composition parity:* every composite in `*/compose.js` and `game-text.js` formatted in English equals the legacy concatenation for its input matrix.
- *No text-keyed logic:* `jslex`-style scan of `browser-next/**/*.js` for human-text literals or table values used with `===`, `!==`, `includes`, `startsWith`, `endsWith`, `indexOf`, `split`, `replace`, `match` or `case`; regexes with English words; `.textContent` or `.innerText` compared or searched. Each allowlist entry carries its reason.

**`tests/next-i18n-pseudo.test.mjs`:**
- Under the generated pseudo catalog (accents, tiered expansion ×2.0 up to 12 characters, ×1.6 up to 30, ×1.4 beyond, ⟦ ⟧ brackets), it drives the pure modules and the UI modules through the existing stand-in hosts (`tests/next-fixtures.mjs` `fakeDialog`, the ending, rhythm and visits hosts).
- It fails on any run of 2 or more plain English words reaching `show`, `status`, `announce`, `toast` or chip text, outside the proper-noun and key allowlist.
- An `rtl` pseudo variant checks `dir` and isolates.

**`tests/next-locales-browser.mjs` (`npm run next:locales`):** see I7 in section 6.

**Fixtures.** The pseudo catalogs are generated in memory, or served by the runner with `page.route`, never in `browser-next/`, under the "fixtures stay under tests/" rule.
- The runner also serves a test manifest listing two pseudo-locales, `qps-ploc` (expansion) and `qps-rtl` (`dir` rtl).
- Production manifests never list them, so `?lang=qps-…` falls back to English on the published site.

### 2.13 Adding a locale (contributor steps)

1. Add an entry to `i18n.js` `LOCALES` (code, endonym, `html`, `intl`, `dir`, expected plural categories) and its bootstrap strings.
2. Run `node scripts/i18n.mjs init xx`, which writes `browser-next/locales/xx.json` with an empty `messages`, and `i18n/review/xx.json` with batches.
3. Write `i18n/style/xx.md` (register, pronouns, quotes, numbers) and add glossary columns.
4. Draft, check, review and run in-context QA (4.1).
5. Run `npm test` and `npm run next:locales -- xx`.
6. `node scripts/i18n.mjs manifest` sets the status to `shipped` only when the gates in D10 pass.

Nothing outside `i18n.js`, `locales/` and `i18n/` changes for a new left-to-right locale with spaces between words. A new script with no spaces or a new RTL script goes through I3 and I4.

### 2.14 Save safety

There is no effect on save safety:
- The shared save gains no field.
- No reducer, `act()` or `persist()` path reads text.
- Save receipts (`saveReason()` 'save full', 'not saved', 'storage unavailable'; `sceneReceipt`) are localized only at display, as arguments to Godot's receipt template.
- Recovery, restart and "Some progress went back" controls stay bound by id.
- Their wording is safety-critical and is a mandatory human-review batch (4.4).

---

## 3. Per-language engineering and content notes

### 3.1 Spanish (`es`)

- **Variety.** US and Latin American neutral: `lang="es"` for voice support, `Intl` es-US. Use the "tú" form and "ustedes", never "vosotros". Use regional words such as "cuadra" for block, not "manzana".
- **Inclusive wording.** Reword instead of gendering the player ("¿Todo listo?", not "¿Estás listo?"). No "-x" or "-e" morphology. Follow community terms for trans history: "personas trans", "mujeres trans". Keep the official "Transgender District" name with a gloss on first mention (D8).
- **Expansion.** Median 1.16, p90 1.58, max 1.80 for short labels (1.5 #2). The DOM layout held at +70% (1.5 #3).
- **Risk spots:**
  - nowrap controls (`style.css` `.world-prompt`, `#music-button`, `.map-bottom #recenter`, `.tool-picker button`, `.sound-disclosure`, `kbd`);
  - the narrow chapter line ("Ch. %d · Next: %s" needs a narrow translation, for example "Cap. %d · Sigue: %s");
  - canvas chips.
- **Agreement.** "Ready", "On" and "Off" agree with feminine nouns ("Música: activada", "Prueba de sonido: lista"), so they need context entries. The `CAPTION_TEXT.goodbyeNobody`-style insertions need article guidance.
- **Typography.** Opening ¿ and ¡ in every question or exclamation, including chips and templates ("¿Qué sigue?"). Quotes “ ” are kept (validator); «» are not used, because `spokenText` needs ASCII `"` envelopes.
- **Code.** None beyond the shared packages.

### 3.2 Vietnamese (`vi`)

- **Pronouns and politeness.**
  - The player is "bạn".
  - Neighbors self-refer with "tôi" or "mình", and give character voice through particles (nhé, nha, đó, mà) rather than kinship pronouns. Kinship pronouns would fix the player's age and gender ("cô/chú/bác…cháu").
  - The reviewer may give Bea "bác" if the creator agrees (character sheet).
- **Classifiers.** Count templates take classifiers inside the template ("%d vị khách", "%d nhịp", "khoảng %d dãy nhà"). Plural rules have only `other`, so no plural objects.
- **Fonts.** On this machine Segoe UI covers everything, but **Georgia does not** (1.5 #1), so serif headings break. Rules for I3:
  - `:root:lang(vi) { --serif: 'Times New Roman', 'Noto Serif', serif; }`, or use `--sans` for headings: the visual designer's choice.
  - Verify Georgia on macOS and iOS (not tested).
  - Canvas text is Segoe UI, so it is fine on Windows.
- **Diacritic stacking.** Raise tight line-heights where translated text sits: `h1` 1.03 and `dialog h2` 1.12, with their `@media` repeats; `.brand` .86 stays English. A minimum of 1.25 for headings is recommended. Check that no `overflow:hidden` container clips Ấ, Ỗ, Ặ or ạ: `.world-panel` and `.grid-cell` (`style.css`) clip.
- **Expansion.** Median 1.16, max 1.70.
- **Input.** Telex and VNI IMEs act only in editable fields. Keys on the canvas are unaffected, but the `event.code` fix (I1) covers them anyway.
- **Content.** Little Saigon is in the Tenderloin. The "Morning Star Bánh Mì & Coffee (fictional)" name stays; "bánh mì" is native.

### 3.3 Arabic (`ar`)

- **Variety.** Modern Standard Arabic in a warm, simple register for dialogue. No dialect. Western digits: `ar-u-nu-latn` explicitly, because `ar-EG` and `ar-SA` default to Arabic-Indic digits.
- **Second person.** Second-person verbs and pronouns are gendered, and "you" or "your" occurs 463 times. Decision D5 settles the approach.
- **Plurals.** Six forms (zero/one/two/few/many/other; 0 zero, 1 one, 2 two, 3–10 few, 11–99 many, 100–102 other). They apply to the 19 count + noun templates. Ratio labels are rephrased as "الجيران: %d/5".
- **Whole-page RTL.** `<html dir="rtl">` mirrors flex, grid and dialogs automatically (1.5 #4).
- **`style.css` declarations** (I3). 63 physical declarations in 48 selectors (`tools/cssphys.mjs`, output `out/css-rtl.txt`).

  *Convert to logical properties:*

  | Selector | Declarations |
  |---|---|
  | `.edition` | `border-left`, `padding-left` |
  | `.masthead nav` | `margin-left:auto` |
  | `.quiet-button span` | `margin-left` |
  | `.chapter-name` | `border-left`, `padding-left` |
  | `.task button` | `text-align:left` |
  | `.task-arrow` | `margin-left:auto` |
  | `.stems` | `margin-left:auto`, and `margin-left:50px` at max-width 760px |
  | `.sound-disclosure` | `border-left`, `padding-left`, `margin-left` |
  | `.page-footer button span` | `margin-left` |
  | `.modal-close` (both rules) | `right:13px` and `right:4px`, to `inset-inline-end` |
  | `dialog h2` | `margin:13px 25px 15px 0` |
  | `.choice-card` | `text-align:left` |
  | `.page-footer button`, `.map-credit>span` (max-width 760px) | `text-align:right` |
  | `.file-picker input::file-selector-button` | `margin-right` |
  | `.plan-supplies` | `padding-left` |
  | `.sound-title` | `margin-right:auto` |
  | `.neighbor-directory button` | `text-align:left` |
  | `.loan-button` | `text-align:left` |
  | `.loan-button>span`, `.loan-button small` (mobile) | margins |
  | `.history-route` | `padding-left` |
  | `.history-route li` | `padding-left` |
  | `.history-route button` | `margin:4px 6px 4px 0` |
  | `.district-swatch` | `margin-right` |
  | `.programme-order` | `padding-left` |
  | `#hosting-order` | `padding-left` |
  | `.civic-voices` | `border-left`, `padding-left` |
  | `.modal-notice` | `padding:12px 56px 12px 20px` |
  | `#modal-body > .eyebrow:first-child`, `#modal-body > section > .eyebrow:first-child` | `padding-right:44px` |
  | `.conversation` | `border-left`, `padding-left` |
  | `.conversation .character-heading` | `padding-right:44px` |

  *Keep physical, deliberately.* The map and the illustrations are not mirrored.
  - `.map-topline` (`left:21px; right:18px`, mobile `left:12px`), `.map-compass` (`right:23px`), `.camera-controls` (`left:12px`), `.world-prompt` (`left:50%` + `translateX(-50%)`), `.map-bottom` and `.map-credit` (`left:0; right:0`), and `#toast` (symmetric).
    - Add `.camera-controls, .map-topline { direction: ltr }`, so ⓘ and the zoom row keep their English places and stop covering the compass.
    - Their text spans get `dir="auto"`.
  - `.placement-scroll` and its `.more-left`/`.more-right` masks. `game.js` `layoutEditor` reads `scrollLeft`, which is 0 or negative in RTL, so its "more" cues would be wrong. Use `.placement-scroll { direction: ltr }`: the 8×5 grid is the street's geometry, and its route arrows "→" stay.
  - Decorative and geographic rotations: `.compass-arrow` `rotate(9deg)`, `.neighbor-note`, `.note-pin` (`left:47%`) and `.success-stamp`.
  - Illustration overlays positioned inline: `visits-episodes.js` power pads (`left:${pct(pad.x, 360)}`) and election pins and labels; `ending/ui.js` habitat places (`left:` from `[42, 422, 42, 422]`). Their figure containers get `direction: ltr` in CSS (`.ending-picture` and the visits overlay figure).

  *Add:*
  - `[dir=rtl] .arrow { display:inline-block; transform:scaleX(-1) }` for the "↗" opens marker, once I2 moves the 43 arrows into `aria-hidden` spans.
  - `kbd { unicode-bidi:isolate; direction:ltr }`.
  - Space between `.welcome-art` and × (the measured collision).
  - `:lang(ar)` resets of `letter-spacing` in `.eyebrow` (1.8px), `h1` (-1.3px), `dialog h2` (-.7px), `.afterglow-heading h2` (-.5px) and the other letter-spacing rules, 14 declarations in all. Spacing breaks cursive joining. `.brand` (-1.5px) is exempt, because it stays English with `lang="en"`.
  - Line-height minimums of 1.5 for body text and 1.3 for headings.
  - `--serif` for ar set to the sans stack, or to an Arabic serif, Times New Roman, which this machine already uses (designer's choice).
- **Mirrored arrows and icons.** Mirror "↗" and the back or forward chevrons, if any. Do not mirror the compass ↑, arrow-key glyphs, the map, the route "→" in the LTR grid, media controls, or the step order of the Rhythm Circle's 8-step sequence, which is a time axis. `rhythm-ui.js` gets a `dir="ltr"` step row, or CSS on its class.
- **Bidi with Latin names, addresses and numbers.**
  - The formatter wraps every argument in FSI…PDI in RTL.
  - At load, `isolate()` wraps digit-led or Latin runs typed inside Arabic translations ("361 Turk", "Turk & Taylor", "Larkin/Eddy") in LRI…PDI. Measured: without this, "361 Turk" shows as "Turk 361".
  - Key hints are wrapped too, for example "WASD / ↑↓←→" (1.5 #5).
- **Canvas.** `ctx.direction` inherits `rtl` from `<html dir>`, and that is right for translated chips and bubble lines. Chips and bubble lines are centered (`textAlign='center'`), so geometry needs no change.
  - Set `c.direction = 'ltr'` explicitly for English-only map text: street names, 'TURK STREET', the district name.
  - `sprites.js` `chip()` and `world.js` `World.chip` and `drawBubble` set the direction per text (I4), which changes the `next-sprites` call lists.
  - Chip placement in `sprites.js` `chips()` already uses measured widths, so it is direction-neutral.
- **Speech bubbles.** `wrapLines` (space-split) works for Arabic. The `بيا: "…"` envelope survives `spokenText` (measured). The tail and `fitAround` placement are direction-free.
- **Keyboard hints.**
  - Keep the Latin keycaps E, WASD, Enter, Esc and Shift: Arabic keyboards print Latin letters too. Mark them `<kbd dir="ltr" translate="no">`.
  - **Fix input**: `game.js` keydown and keyup map `event.code` (KeyW, KeyA, KeyS, KeyD, KeyE) as well as `event.key` (I1). Measured: the Arabic layout does not walk today.
- **Close button.** `.modal-close` moves to `inset-inline-end`, so × sits at the top-left in RTL. The paddings that clear it (`.modal-notice`, eyebrow, `.conversation .character-heading`, `dialog h2`) become inline-end.
- **Fonts.** Segoe UI covers Arabic here. On Apple systems `system-ui` falls back to SF Arabic or Geeza Pro, and on Android to Noto Sans Arabic. Verify on devices.
- **Names.** Transliterate (D7). Latin names inside Arabic lists glue to "و" (measured).
- **Content.** Kibbeh bil sanieh appears under its Arabic name, "كبة بالصينية", in the Cook & Share story (`docs/COOKING_FOODWAYS_BRIEF.md` requires correct names and verified rendering).

### 3.4 Thai (`th`)

- **No spaces between words.** CSS line breaking already uses Chrome's ICU dictionary, and Firefox and Safari also break Thai words in CSS. Keep `overflow-wrap:anywhere`, already on `.chapter-name`, `.talk-line`, `.talk-header`, `.track-status`, `#sound-caption` and `.voices-cards a`, only as a last resort. Never set `word-break: break-all` (it breaks inside words).
- **Canvas wrapping** is the fork's own code (`bubble.js` `wrapLines`), measured broken (1.5 #7). I4 changes:
  - add a `breaker` parameter: English keeps the space split (tests pin it); other locales use `Intl.Segmenter(locale, {granularity:'word'})` boundaries, with Thai always using them;
  - break over-long words by grapheme (`granularity:'grapheme'`), never by code point, so a mark never separates from its base;
  - keep names whole by joining a name's segments: the glossary's Thai names are marked, and `isolate()`'s sibling `keepWhole()` inserts U+2060 WORD JOINER between their syllables;
  - memoize the result;
  - count graphemes in `holdSeconds` for `th`.
- **Line-height and size.** Thai marks stack above and below. With `h1` (39px, line-height 1.03) the marks rise above the line box (`fonts.png`), so any clipping container cuts them.
  - `:lang(th)` minimums: 1.5 for body text, 1.35 for headings.
  - Thai at 11 px, as in chips, `.talk-header`, `.loan-button` and `.consent-row small`, reads small. Use 12 px for `th` chips (`canvasFont`) and check contrast again.
- **Glyph coverage and fonts.** Segoe UI has no Thai. Chrome picked Tahoma, not the installed Leelawadee UI (1.5 #1).
  - `:root:lang(th) { --sans: 'Leelawadee UI', 'Segoe UI', Tahoma, 'Noto Sans Thai', system-ui, sans-serif; --serif: var(--sans); }`. Georgia has no Thai, so headings use the sans.
  - Canvas uses `canvasFont()` with the same stack. `game.js` `measureText` must measure in exactly the same font as `World.drawBubble` draws.
- **Particles and gendered politeness.**
  - Dialogue particles follow the *speaker's* gender: ครับ for male speakers, ค่ะ or คะ for female, and นะ or จ้ะ for warmth. First person also varies: ผม for male, ฉัน or ดิฉัน for female, and เรา as a neutral option.
  - The character sheet must say each neighbor's gender and register. Thanh and Imani are unconfirmed.
  - UI chrome uses no particles. The player is "คุณ".
- **Numbers and dates.** Western digits (Thai digits are optional and not recommended). Dates are text. If formatted, they use the Gregorian calendar to agree with the sources ("checked October 18, 2026").
- **Expansion.** Median 0.87; it is height, not width, that grows.
- **Keyboard.** The Kedmanee layout does not walk today (measured). Fixed by `event.code` (I1).
- **Content.** Pad kra pao appears under its Thai name, "ผัดกะเพราเนื้อ", in Cook & Share.

### 3.5 Browser support

| Feature | Minimum versions | Note |
|---|---|---|
| `Intl.Segmenter` | Chrome 87, Safari 14.1, Firefox 125 | On older Firefox, Thai bubbles fall back to the space split, and over-long runs break at a regex grapheme approximation (`/\P{M}\p{M}*/gu`), which keeps marks on their base. |
| `Intl.ListFormat` | Chrome 72, Safari 14.1, Firefox 78 | |
| `Intl.PluralRules` | Chrome 63, Safari 13, Firefox 58 | |
| CSS logical properties | Chrome 89, Safari 14.1, Firefox 66 | |
| `:dir()` | Safari 16.4 | Avoid: use `[dir=rtl]` and `:lang()`. |
| Canvas `direction` | Firefox 101 | Older Firefox renders LTR. Acceptable, because centered chips and bubbles stay readable. |

Fonts were verified only on Windows Chrome. macOS, iOS, Android and Linux need device checks (R6).

---

## 4. Translation workflow

### 4.1 Pipeline

1. **Extract** (`node scripts/i18n.mjs extract`).
   - Sources: the registered tables, after applying web overrides, `t()` literals, `data-i18n` nodes in `index.html`, and the declared displayed data fields. These are combined into `i18n/source.json`.
   - Each msgid is annotated with locations, its length class, its UI width budget (the narrowest container at 320 px), placeholder meanings, speaker and addressee, the preceding and following lines in its dialogue, and sensitivity tags.
2. **Batch.** About 25 batches of 500 to 1,500 words, grouped by area:
   - chrome and save;
   - the opening;
   - each neighbor;
   - music and rhythm;
   - gathering, hosting and programme;
   - Listening Hour (civic);
   - film;
   - the ending chain;
   - each side story;
   - history notes and sources;
   - Neighborhood Voices.
3. **Draft, model-assisted.** The prompt carries the glossary, the style guide, the character sheet, the batch's English with its context and notes, the placeholder and envelope rules, and the width budgets. The output is JSON: translation, notes, questions for the reviewer, and confidence.
4. **Automatic checks** (`scripts/i18n.mjs check`):
   - the validator from 2.5;
   - glossary compliance: do-not-translate terms are kept, fixed terms are used;
   - consistency: the same msgid or term always gets the same translation;
   - width: rendered width against the budget, using the lab's measurement method;
   - the pseudo-locale browser run.
5. **Back-translation.** A separate model run translates back to English. Meaning differences above a threshold, and every sensitive-tagged string, are flagged for the reviewer.
6. **Human review.** The reviewer edits drafts and marks each batch `reviewed`.
7. **In-context review.** The reviewer plays a preview build (`?lang=xx&preview=1`) at 320, 390 and 1440 px with a dev toggle that shows msgid locations. Screenshots from the `locales` suite back this up.
8. **Sign-off.** Coverage, review status and the D10 gates are met, and the status becomes `shipped`.

### 4.2 Status model

- **Per entry:** `missing`, `draft`, `checked`, `reviewed`, `stale`.
  - `stale` means the English changed: the old translation is kept only as a fuzzy suggestion in `i18n/review/`, never at runtime.
- **Per batch and per locale:** `draft`, `review`, `reviewed`, `shipped`.
- **Where the status shows:**
  - the manifest's `status` and `coverage`;
  - `i18n/README.md`'s table, regenerated by the `manifest` command;
  - in the UI, only shipped locales appear in the picker. Preview builds show a "Preview translation · not reviewed" badge, and About carries the credit line (4.7).

### 4.3 How reviewers work

- **Spreadsheet.** The default is a CSV per batch (`scripts/i18n.mjs export-sheet`), with the columns:
  - location id;
  - context and notes;
  - English;
  - draft;
  - back-translation;
  - flags;
  - reviewer text;
  - comment;
  - status.

  `import-sheet` validates it and writes the catalog.
- **Pull requests.** Reviewers comfortable with Git review the JSON diff in a PR, which is sorted and one entry per line, and comment inline.
- **Queries and questions.** Questions to the creator (meaning, tone, character) go into `i18n/review/<code>.json` `questions` and are answered there, so the next locale inherits them.

### 4.4 What must be human-reviewed before a locale ships

Two native readers are required for the first nine categories (the tags are measured in 1.3.15):
1. Civic and voting: Election Walk, the Listening Hour and tenant circle, the "Mayor Public Event". Mistakes here can read as real voting guidance.
2. Housing and tenants.
3. The power-outage story (the 2017 Larkin substation fire), and emergency or safety wording.
4. Missing pets (Two Dogs Home: a lead "is not a confirmed sighting").
5. History and identity: Compton's Cafeteria and the 1966 uprising, the Transgender District, drag, and the Ramaytush land acknowledgement in `visits/text.js` `BEFORE.FRAME`.
6. Real organizations and sources: Neighborhood Voices, history notes, credits.
7. Save, recovery and restart text (`game.js` `SAVE_TEXT`, `REFUSED_TEXT`, `KEEP_REFUSED`, `ending/text.js` `FORK_TEXT.restart`, `confirmRestart`). A mistranslation can lead to data loss in both editions.
8. Every neighbor's dialogue: voice and consistency, about 85 speech envelopes and their conversations.
9. Fiction and reality markers: "fictional", "real place", "Scenery & event are fictional".

Single review suffices for UI chrome and the music and rhythm controls.

### 4.5 Adaptation, names and glossary

- **Adapt, do not translate literally.** Keep meaning, tone and facts. Adapt idioms and wordplay ("Honk!", "Order Up"). Do not adapt facts, places, dates, sources, the fiction and reality statements, or quotations.
- **Dish names.** Use native names in the matching locale: kibbeh in Arabic, pad kra pao in Thai, bánh mì in Vietnamese. Use romanized names elsewhere, as the English does.
- **Names.** Every neighbor and fictional name stays (Bea, Celeste, Rook, Dez, Thanh, Imani, Pip…). In Arabic and Thai, names are transliterated in script (D7). Descriptive epithets are translated: "Pip the Tiny Dino" becomes "Pip, el pequeño dino".
- **The glossary** (`i18n/glossary.csv`, one row per term, one column per locale) holds:
  - *fixed terms*: block, gathering, neighbors, Field notes, Listening Hour, tenant circle, keepsake, sparks, stems, Rhythm Circle, mural, Mural Stories, Second afternoon, chapter titles, visit-only, shared save, 3D edition, Start over, "Keep this tab's progress", "Use the shared save as it is";
  - *do-not-translate terms*: tenderloin redux, names, streets, addresses, businesses, organizations, "Transgender District" (glossed), "So What", "BPM", key names, OpenStreetMap, ODbL, PDDL, "RISE".

### 4.6 Cost and time

The assumptions are stated so they can be replaced with real quotes:
- about 21,500 words per locale;
- full review of model drafts at 450 words per hour;
- in-context QA of 16 hours;
- a second sensitive-content read of about 3,500 words at 500 words per hour (7 hours);
- 6 hours of setup per locale (glossary, character sheet, style guide, questions);
- a rate of USD 55 per hour (US freelance professional reviewers range about 35 to 75; community stipends can use the same hours).

| Locale | Review (h) | In-context QA (h) | Sensitive second read (h) | Setup (h) | Extra (h) | Total (h) | At $55/h |
|---|---|---|---|---|---|---|---|
| es | 48 | 16 | 7 | 6 | – | 77 | ≈ $4,200 |
| vi | 48 | 16 | 7 | 6 | – | 77 | ≈ $4,200 |
| ar | 48 | 20 | 7 | 6 | 16 (address variants of about 460 strings, RTL QA) | 97 | ≈ $5,300 |
| th | 48 | 18 | 7 | 6 | 6 (particles per speaker, wrapping QA) | 85 | ≈ $4,700 |
| **All four** | | | | | | **336** | **≈ $18,500** |

- **Calendar.** At 15 to 20 reviewer hours a week, a locale takes 4 to 6 weeks, and locales run in parallel.
- **Model drafting.** Draft, back-translation and checks take on the order of 2 to 4 million tokens per locale. Prices are not quoted here: check current pricing before the pilot. It is small next to review.
- **Creator time.** About 3 hours per locale (character sheet, questions, sign-off).

### 4.7 Legal and attribution

**Credits stay in English:**
- "© OpenStreetMap contributors · ODbL" stays verbatim and linked (ODbL attribution).
- "San Francisco Planning Department / DataSF · PDDL…" stays verbatim.
- Source titles and citations in history notes, `BEFORE.SOURCES`, Neighborhood Voices `sourceTitle`, and Godot's data credits (`godot/data/SOURCES.md`, `source_receipt.json`) stay English.
- Translated text around them says the link is in English ("(en inglés)") and links carry `hreflang="en"`.

**Translators and AI assistance:**
- Translator and reviewer credit goes in About, by name or as a role, with consent.
- Contributions are under the repository's MIT license, through a short contributor note in `i18n/README.md`.
- AI assistance is disclosed: "Translated with AI assistance and reviewed by …".

**Optional notes for the creator to decide (D16):**
- On civic and election screens, a translated note that this is a historical story and not voting information, pointing to official multilingual resources. This would be new content, so it is the creator's call.
- Whether English prevails where the translations differ.

---

## 5. The 3D edition

**What Godot 4.7 offers** (from the 4.7 docs, "Internationalizing games" and "Importing translations"; Godot itself was not run):
- `TranslationServer` with `tr(message, context)` and `tr_n(singular, plural, n, context)`.
- Translations imported from CSV or gettext `.po`/`.mo`. The docs present `.po` as the more powerful format; CSV support for context and plurals in 4.7 was not confirmed.
- Automatic translation of Button and Label text that equals a key, which can be disabled per node ("Auto Translate > Mode").
- `String.format()` named placeholders are recommended over `%`, because `%` cannot reorder.
- Mirroring of anchors, margins, alignment and container order for RTL (`layout_direction`, `text_direction`, `language`). 3D and non-UI nodes are not mirrored.
- ICU break data for languages without spaces, which is not exported unless "Include Text Server Data" is enabled. That adds about 4 MB to the web build.
- Font fallbacks for Arabic, Thai and Vietnamese. On the web the fonts must be bundled into the PCK; the 2.1 MB PCK grows by about 0.3 to 0.6 MB with Noto Arabic and Thai subsets (estimate).

**A shared catalog** with one source and two outputs:
- *Source:* `i18n/` holds `.po` per locale. msgid is Godot's English, msgctxt the context, and `#:` comments the locations from `source.json`. Plural forms use the standard Plural-Forms header, with Arabic `nplurals=6`.
- *2D output:* `scripts/i18n.mjs` converts to `browser-next/locales/*.json`. CLDR categories map to gettext indices: the order is identical for ar; for es, CLDR has `many` where gettext has 2 forms.
- *3D output:* `.po` files placed in `godot/locale/`, outside today's scope.
- *2D-only entries:* msgids that exist only in 2D, meaning web overrides and composites, are tagged and ignored by Godot. The 3D-only originals that the overrides replace, such as surprise labels with "(Tap / Shift+D)", need their own entries when 3D is localized.

**What `godot/` would need** (out of scope, recorded for later):
1. Wrap the 185 `.text =` assignments and every `%`-formatted string of `main.gd` (16,327 lines) and the 26 other scripts in `tr()` or `tr_n()`. Static texts that equal a msgid translate automatically.
2. Restructure Godot's own fragment concatenation into whole templates. They are the same composites as 2D's, so 2D's `*/compose.js` English becomes the msgid.
3. Bundle the fonts and enable the text-server data.
4. Add a language setting in Godot's settings, not the save.
5. Set `layout_direction` to follow the locale at the UI root.
6. Teach the 2D drift tests (`tests/gd-lex.mjs`, `gd-literal.mjs`) to read literals inside `tr("…")`.

**Recommendation: defer the 3D edition**, but keep the 2D catalog lossless to `.po`. That means English msgids, contexts, printf or named placeholders, CLDR plurals and location comments, so the 3D work is conversion and code wrapping, not new translation. Revisit once two 2D locales have shipped.

---

## 6. Work packages with file ownership

Prerequisite (I0): Phase 3 is finished and committed, including the WP4 browser proof and WP5 docs, and `npm test` is green at the start of each package. When this review ended, `e0b876f` had committed the scene polish, and `tests/next-browser.mjs` was still modified in the working tree. Every agent works by the Phase 3 `agent-rules.md`:
- edit only owned files;
- no git staging;
- run only its own tests;
- CRLF edits only by exact-substring Node scripts, then verify 0 bare LF;
- fail-first deterministic tests.

### 6.0 Order and parallelism

```
I0 Phase 3 committed
  └─► I1 foundation (i18n.js, scripts/i18n.mjs, settings, boot, lang/dir, event.code) ───────────────┐
        ├─► I2a game.js + game-text.js + index.html ─────────┐                                     │
        ├─► I2b dialogue & music modules ────────────────────┤                                     │
        ├─► I2c classic-derived modules (+ core.js additive) ─┤ parallel, file-disjoint              │
        ├─► I2d ending/ + ending/compose.js ──────────────────┤                                     │
        ├─► I2e visits/ + visits-*.js + visits/compose.js ────┤                                     │
        ├─► I3 RTL & script CSS (style.css) ──────────────────┤                                     │
        ├─► I4 canvas text & wrapping (world.js, sprites.js, bubble.js; game.js measure after I2a) ─┤
        └─► I7 locales browser suite (built against pseudo, red until I2–I4) ───────────────────────┤
                                                    I5 Spanish (drafts after I2) ─► ship es          │
                                                    I6 vi │ ar (needs I3, pilot early) │ th (needs I4)
                                                    I8 docs (after I5) ◄────────────────────────────┘
```

| Package | Starts | Depends on | Parallel with | CRLF files |
|---|---|---|---|---|
| I1 | after I0 | – | nothing | game.js |
| I2a | after I1 | I1 | I2b–I2e, I3, I4 (except its game.js line), I7 | game.js, index.html |
| I2b | after I1 | I1 | all I2, I3, I4, I7 | – |
| I2c | after I1 | I1 | same | core.js (additive) |
| I2d | after I1 | I1 | same | – |
| I2e | after I1 | I1 | same | – |
| I3 | after I1 | I1 (lang/dir on `<html>`) | all I2, I4, I7 | style.css |
| I4 | after I1; game.js line after I2a | I1, I2a | I2b–I2e, I3, I7 | world.js, game.js (`measureText` only) |
| I7 | after I1 | I1; green only after I2–I4 | all | – (`package.json` script) |
| I5 | drafting after I2a–I2e merge (msgids stable) | I2, and I3 or I4 not needed for es | I6 drafting | – |
| I6 | vi after I5 proves the pipeline; ar after I3 plus the pilot; th after I4 | I3, I4, I5 | each other | – |
| I8 | after I5 ships | all | – | – |

The recommended order, with reasons:
1. **Engineering first, content in the order you lean.** I1, then I2a–I2e, I3, I4 and I7 in parallel, then Spanish. The content order es → vi → ar → th is confirmed:
   - Spanish proves the pipeline end to end with the lowest linguistic and layout risk.
   - Vietnamese has a large Tenderloin community and only a font-stack fix.
   - Arabic and Thai carry the heaviest engineering and content decisions.
2. **RTL and Thai engineering move earlier, before any locale ships.** I3 and I4 run with I2 and are proven by the pseudo-RTL and pseudo-Thai runs. A late RTL retrofit would touch every screen again, and Thai wrapping is canvas code no translation can fix.
3. **An Arabic pilot early.** About 150 strings: chrome, the startup card, save and recovery text, one full Bea conversation, and one count template per plural form. They are reviewed by an Arabic reader while Spanish is under review. This retires the form-of-address question (D5), the transliteration question (D7) and the real-text RTL check before the 97-hour Arabic budget is spent.
4. **Thai last**, because of reviewer availability and particles per character. Its engineering is done in I4 already.

### I1: foundation

Files:
- new `browser-next/i18n.js`;
- new `scripts/i18n.mjs`;
- new `browser-next/locales/index.json`, generated with no locales shipped;
- new `i18n/source.json`, generated;
- new `i18n/README.md`;
- `browser-next/game.js` (CRLF), in a limited set of places:
  - `settings` load;
  - `saveSettings` unchanged;
  - `init()` parallel catalog fetch;
  - a new `applyLocale()`;
  - `showSettings()` language row;
  - `showChapterCard(true)` offer row;
  - the keydown and keyup listeners map `event.code`;
  - `window.tenderloin` adds `i18n()`;
- new tests `tests/next-i18n.test.mjs` and `tests/next-i18n-catalogs.test.mjs` (catalog checks pass trivially with no shipped locale).

`package.json` belongs to I7 alone, which adds every new file to `next:check` at the end. Until then I1 and I2 run `node --check` on their own files, so parallel packages never edit `package.json` together.

Deliverables:
- the API in 2.3 to 2.5 and 2.7;
- the extractor's table registry, which lists every exported text table and the override function that applies to it;
- the settings fields from 2.9;
- `<html lang dir>` and the title;
- bootstrap strings, English only until each locale's review;
- the `event.code` fix: KeyW/A/S/D/E and arrows. Behaviour on a US layout is identical, and other layouts become positional.

Tests (fail-first):
- everything in the `next-i18n.test.mjs` list of 2.12;
- settings load and save with a hostile `language` value;
- the offer appears only under the stated condition, and never switches;
- `event.code` walking with a non-Latin `key`, against the `lab/probe-keys.mjs` cases.

Effort: agent 8–12 h; human 2 h (API and settings review) plus the D-decisions.

**Built (November 1, 2026).** Every file above exists; `browser-next/locales/index.json` lists no locale, so players see no change. Choices and deviations:
- *Settings row with only English:* not drawn. `languageChoices()` returns `[]` while no locale ships and the page is English, so `showSettings()` is byte-identical today. The row (a `<select id="language">` of endonyms) and its `[data-settings]` marker appear once a locale ships, or in a preview session so it can go back to English. The 44 px minimum height is left to I3 (`style.css`).
- *Offer row:* under Start Exploring's row, not above it: `tests/next-wiring.test.mjs` pins the visits entry directly above Start Exploring. Accepting or declining removes the row and returns the focus to Start Exploring; nothing else is redrawn.
- *Network for English players:* none. The manifest is fetched only when the URL or the stored setting names a locale, or when `navigator.languages` prefers es, vi, ar or th before any English (for the offer). Startup awaits only a URL or stored language, before the startup card, and `startupWait` caps that at 11 s: on the cap the late load is cancelled and the game goes on in English with the notice. The offer's manifest is never awaited; if it arrives while the startup card is open, the offer row joins it (`offerLate`), otherwise the offer is dropped for this visit.
- *A failed load* keeps English and toasts the bootstrap notice ("Español could not load; continuing in English."), also for `?lang=es` while es is not shipped. An unknown `?lang=zz` is ignored silently.
- *`?lang=`* is case-insensitive and takes a region tag (`ES`, `es-US` and `es_MX` give es).
- *A stored language* is saved only after its load succeeds (`storedLanguageAfter`). A stored language the manifest does not list or ship is deleted from the settings at startup, so it does not fail on every start; a network, timeout, hash or catalog failure keeps it.
- *Markup (for I2):* a translation must keep its English's tags exactly (names, attributes and order) and may not add any of `<`, `>`, `&`, `"` or `'` beyond the English's counts. `setLocale` accepts only catalogs `readCatalog` validated. So `t()`, `L()` and `format()` stay plain text and byte-identical in English, and a localized value can never inject more than its English already does at the same site; new HTML is built with `html()` or `tHTML()`, which escape. Escaping inside `t()` itself was rejected: it would change English bytes at every `textContent` and canvas site.
- *Preview:* `?lang=xx&preview=1` admits a locale the manifest lists as `preview` or `draft`, and the pseudo-locales `qps-ploc` and `qps-rtl` only when the manifest lists them (production never does). A "Preview translation" badge joins the chapter line. A preview locale is never stored.
- *`event.code`:* `inputKey(event)` keeps a typed basic Latin letter as it is (lowercased), exactly as before I1, so US, AZERTY, Dvorak and Colemak are unchanged. Only a key that types no Latin letter maps by position: KeyW/A/S/D/E and the arrows. AltGr (`getModifierState('AltGraph')`, or Ctrl+Alt), IME input (`isComposing`, `key === 'Process'`, `keyCode === 229`) and every other key keep their typed identity. Godot ORs the typed and the physical key (`main.gd` `is_key_pressed(KEY_D) or is_physical_key_pressed(KEY_D)`); a DOM event carries one identity, so a Latin layout's physical WASD positions (AZERTY's Z, Q) still do not walk, as before. The keyup also releases what its physical key went down as (`heldCodes`), and every place that clears the held keys (dialogs, blur, a hidden tab, a frame error) clears `heldCodes` too (`releaseKeys`).
- *Correction, plural categories:* section 2.5's "its plural categories are not those of `Intl.PluralRules(locale)`" is not an exact match. `Intl.PluralRules('es')` lists one, many and other (many is for millions), so an exact match would reject every ordinary Spanish { one, other } entry, including 2.4's own example. The rule: `other` is required, every key must be one of the locale's categories, and a missing category falls back to `other` at lookup. Tests: an es { one, other } entry loads and formats 2,000,000 with `other`; an unknown key (es `few`, vi `one`) and an entry without `other` are rejected.
- *Correction, Thai graphemes (for I4):* do not count or split Thai graphemes with `/\P{M}\p{M}*/gu`: it splits คำ into ค and ำ, because U+0E33 (and U+0E32) are Lo, not M. Use `Intl.Segmenter` (grapheme granularity). I1 has no grapheme code.
- *Validator:* a select or plural variant other than `other` may leave out the argument it is chosen by ("Mesa añadida" for "%s added", the plan's own example), positionally unless it is the last. Quote parity counts “ ” « » „ on both sides, since English sources use » as a separator. Allowed format characters besides \n, the isolates and LRM/RLM: ZWSP, ZWNJ and ZWJ, which Arabic and Thai text needs.
- *Extractor:* `REGISTRY` and `EXCLUDED` in `scripts/i18n.mjs`; a test fails on any text-like export in neither. `i18n/source.json` has 1,488 msgids today (game.js's inline text joins with I2a). Locations are table paths (and `file:line` for `t()` literals and `data-i18n` nodes), not source lines of table values. Of the data files only `experiments/neighborhood-voices.json` (topic, summary) is registered; the others are registered by the package that localizes their screen (I2c, I2e).
- *Not in I1:* `merge`, `export-sheet` and `import-sheet` (planned with I5), `tests/next-i18n-pseudo.test.mjs` (I2), and `package.json`: I7 adds `node --check browser-next/i18n.js && node --check scripts/i18n.mjs` to `next:check`.
- *Tests:* `tests/next-i18n.test.mjs` (34) and `tests/next-i18n-catalogs.test.mjs` (5). The `event.code` tests evaluate game.js's own keydown and keyup listeners over stand-ins, with the probe-keys cases.

### I2a: `game.js`, `game-text.js`, `index.html`

Files: `browser-next/game.js` (CRLF), new `browser-next/game-text.js`, `browser-next/index.html` (CRLF), and new `tests/next-game-text.test.mjs`.

Deliverables:
1. Move the 464 inline fork strings (4,834 words) to `GAME_TEXT`, by function. The largest are `filmScreen` 470 words, `journal` 414, `civicScreen` 363, `livingDistrict` 261, `updateAfterglow` 243, `hostingScreen` 240, `finale` 194 and `blackhawk` 192.
2. Replace the text inside the 152 interpolating template literals with `GAME_TEXT` entries. A sentence that carries values becomes one named-placeholder template, and the markup stays in `game.js`.
3. Wrap table values with `t()`/`L()`, including `savedMessage`, the two load messages `parseGodotSave` returns, and the `saveReason()` phrases when they become receipt arguments.
4. Arrows into `<span class="arrow" aria-hidden="true">`.
5. Display tables for ids: furniture, palette, slot.
6. `index.html`:
   - `data-i18n` markers;
   - the `.map-bottom` sentence as one template with `<kbd>` parts;
   - `translate="no"` and `lang="en"` on `.brand`, street labels and attributions.
7. Keep:
   - game.js column-0 declarations;
   - the `data-rapid` adjacency;
   - `BUTTON_TEXT.*` and `HOSTING_FORK_TEXT.beats` references.

Tests:
- `GAME_TEXT` has no Godot literal (`gdStrings`);
- composition parity of every new template against the legacy output;
- `next-wiring`, `next-press-settle`, `next-characters`, `next-music`, `next-ending`, `next-visits-*` and `next-scaffold` stay green;
- the English browser suites stay unchanged (run at I7).

Effort: agent 12–16 h; human 2–3 h code review.

### I2b: dialogue and music modules

Files:
- `characters.js`, `hosted-text.js`, `story.js`, `rewards.js`, `sketch-core.js`, `rhythm.js`, `rhythm-ui.js`;
- tests `tests/next-i18n-dialogue.test.mjs` (new).

The drift tests `next-characters`, `next-story` and `next-music` are read-only for this package.

Deliverables:
- the formatters delegate to `i18n.format`;
- table arguments go through `L()`;
- narrow variants: a localized `narrowLabel` path keyed by template;
- `capitalize`-based display moved to tables;
- the envelope rule;
- `compassPhrase` plural;
- character composites (`greetingLine` art tail, `quoted`).

Effort: agent 8–10 h; human 1–2 h.

### I2c: modules derived from classic

Files:
- `core.js` (CRLF; additive `blockMissingItems(state)` only, with `blockMissing` unchanged);
- `keepsake.js`, `gathering.js`, `programme.js`, `hosting.js`, `civic.js`, `film.js`, `soundtrack.js`;
- not `godot-save.js`, which is save-critical: I2a localizes its 2 load messages at display (`t(savedMessage)`);
- `history.js` (no text change; street names stay);
- `district.js` (display name only);
- `experimental-host.js`, `experiments/neighborhood-voices.js` (display through `t()`, file untouched);
- new `tests/next-i18n-classic.test.mjs`.

Effort: agent 6–8 h; human 1 h.

### I2d: the ending chain

Files:
- `ending/hosted.js`, `gather-again.js`, `screening.js`, `bench.js`, `habitat.js`, `orbital.js`, `mural.js`, `ui.js`, `art.js` (any SVG `<text>`), `rules.js` if needed;
- new `ending/compose.js`;
- `ending/text.js`, in limited ways:
  - its `gdf` and `capitalize` helpers delegate to `i18n.js`;
  - additive fork tables, for example the `place` alt fields;
  - `GODOT`, `GODOT_CONSTS` and `ENDING_WEB_OVERRIDES` stay untouched;
- new `tests/next-i18n-ending.test.mjs`.

Deliverables:
- composites for `hostedDetail` and the orbital recap, which has 46 concatenations;
- `mural.js` target `alt`, replacing the `split('. Paint')` in `ui.js` `stories()`;
- slot and palette display tables;
- `sceneReply` lists.

Effort: agent 10–12 h; human 1–2 h.

### I2e: the side stories

Files:
- `visits/dogs.js`, `meal.js`, `election.js`, `before-streets.js`, `lantern.js`, `power.js`, `landmarks.js`, `surprises.js`, `picker.js`, `format.js` (delegation only);
- new `visits/compose.js`;
- `visits-kit.js` (`VISITS_FORK_TEXT`, `btn` per locale, `esc`);
- `visits-ui.js`, `visits-episodes.js`, `visits-world.js`;
- new `tests/next-i18n-visits.test.mjs`.

`visits/text.js` is untouched. Composites go in `compose.js`.

Effort: agent 10–14 h; human 1–2 h.

### I3: RTL and script CSS

Files: `browser-next/style.css` (CRLF), and new `tests/next-i18n-css.test.mjs`.

The CSS test fails on any new physical `left`/`right` declaration outside the 3.3 keep-list, and checks that the `:lang()` stacks exist.

Deliverables: everything in the 3.3 `style.css` list, plus the `:lang(vi|ar|th)` font stacks and line-heights from 3.2 to 3.4.

Tests:
- the `next-characters` and `next-visits-kit` contrast tests stay green;
- the `next:locales` RTL checks (I7).

Effort: agent 5–7 h; human 2–3 h (an Arabic reader reviews the 320/390/1440 screenshots).

### I4: canvas text and wrapping

Files:
- `world.js` (CRLF): `objectLabel`, `World.text`, `World.chip`, `World.hit`, `drawBubble`, the gathering chip's 6 variants, and the map-text literals through `t()` or untranslated per D8;
- `sprites.js`: `chip`, `labelTexts` through `t()`, `FONT` to `canvasFont`;
- `bubble.js`: `wrapLines` breaker, grapheme breaks, `holdSeconds` per locale, `BUBBLE_TEXT` composition;
- `game.js`: `measureText` and `stepSpeech` only, after I2a merges;
- `tests/next-sprites.test.mjs` (call-list update);
- new `tests/next-i18n-canvas.test.mjs`.

Tests:
- English wrap cases unchanged;
- Thai wrap at word boundaries with no line starting with a combining mark;
- names kept whole;
- the hit box equals the drawn chip;
- direction set per text;
- memoization (a frame measures nothing new for unchanged text).

Effort: agent 8–10 h; human 1–2 h (a Thai reader checks bubble screenshots).

### I5: Spanish end to end

Files:
- `browser-next/locales/es.json`;
- `i18n/review/es.json`;
- `i18n/style/es.md`;
- `i18n/glossary.csv` (es column);
- `i18n/characters.md`, the character sheet, with the creator;
- the es bootstrap strings in `i18n.js`.

Deliverables: the 4.1 pipeline through sign-off, plus the list of Godot source defects reported to the creator (D14).

Effort: agent 6–8 h (drafting runs, checks, fixes, back-translation); human about 77 h review plus 3 h creator.

### I6: Vietnamese, Arabic and Thai

Files: per locale, `locales/<code>.json`, `i18n/review/<code>.json`, `i18n/style/<code>.md`, its glossary column, and its bootstrap strings. Arabic also has the pilot (6.0 point 3). If D5 adopts the address setting, it is implemented by the I1 owner as a follow-up.

Effort per locale: agent 6–8 h. Human: vi about 77 h, ar about 97 h, th about 85 h.

### I7: the `locales` browser suite

Files:
- new `tests/next-locales-browser.mjs`;
- `package.json` (`next:locales` script, plus `node --check` in `next:check`);
- the three existing runners, for `locale: 'en-US'` in their contexts only.

Per locale (pseudo, pseudo-RTL, and each shipped or preview locale), at 320, 390 and 1440 px:
- the startup card, main page, a neighbor conversation, Settings (including the language switch), the Field notes, history, Living district and map-info dialogs, one ending screen and one side-story screen;
- no page or dialog overflow, no text under ×, 44 px targets;
- the accessible name starts with the visible label (as `next-browser.mjs` checks today);
- `lang` and `dir` on `<html>`, and `lang="en"` on fallbacks;
- under pseudo, no plain English at the boundary;
- under RTL, × at inline-end, the conversation border on the right, the map overlays unmoved, kbd isolated;
- Thai bubble lines with no leading combining mark;
- CDP `getPlatformFontsForNode` for one heading and one paragraph (Chrome only), expecting the stack's first covering font, not Times New Roman for vi;
- WASD with non-Latin `key` values;
- no external requests and no CSP violation, as in `next-browser.mjs`.

Effort: agent 8–10 h; human 1 h.

### I8: docs

Files: `docs/BROWSER_NEXT.md` (a "Localization" section; Known debt: five formatters now delegate, duplicate memory tables, D17 flash), `i18n/README.md` (finished), and `docs/BUILD_STATUS.md` if the creator wants.

Effort: agent 2–3 h; human 1 h.

**Totals:** agent about 100–135 h; human about 336 h of linguistic review plus about 15 h of code and design review.

---

## 7. Risks and open decisions

Decisions, recommendation first:
- **D1. 2D-only now.** Build a 2D-only catalog that converts losslessly to `.po` for a later shared catalog (section 5). The alternative is to build the shared catalog now, which needs `godot/` edits that are out of scope.
- **D2. Keys are English text plus optional context** (2.2). The alternative is stable ids.
- **D3. Who reviews.** A paid native reviewer per locale, with ties to the Tenderloin community where possible (community organizations, language-access translators), plus a second reader for the 4.4 batches. The creator approves the character sheet. The alternative is volunteers only, which is cheaper but risky for the civic and safety content.
- **D4. Which Spanish.** US and Latin American neutral: `lang="es"`, `Intl` es-US, "tú", no "vosotros", neutral rewording instead of "-e" or "-x".
- **D5. Arabic variety and form of address.**
  - MSA with a warm register, and Western digits.
  - For the player's gender, rewrite UI chrome neutrally (verbal nouns, first-person plural invitations).
  - Dialogue that addresses the player gets masculine and feminine variants, chosen by a "Form of address" setting stored in the fork settings key. Its default is decided by the pilot reviewer and the creator.
  - Alternatives: masculine default only (cheapest, exclusionary), or plural address (reads as addressing a group).
- **D6. Default language.** English. The game never switches on its own. A first-run offer from `navigator.languages`; `?lang=` for links. Stored only in the fork settings key.
- **D7. Names.**
  - Neighbors and fictional characters keep their names.
  - Arabic and Thai transliterate them in script everywhere, including map chips and bubble envelopes. This avoids bidi mixing and Latin names glued to "و". Spanish and Vietnamese keep Latin.
  - Real places, streets, businesses and organizations stay as written, isolated in RTL. Descriptive epithets are translated.
- **D8. What is not translated:**
  - the brand;
  - OSM street labels on the canvas ('TURK STREET', the `WEST_INTERSECTIONS` names, the letter-spaced street names) and the map-topline street names;
  - the district's official name;
  - names and addresses;
  - business and organization names;
  - source titles, URLs and citations;
  - OSM and DataSF attributions and license names;
  - key names;
  - the mural's 'RISE';
  - "So What";
  - developer exception text.

  Translated: 'HISTORY WALK', 'A NEIGHBORHOOD OF MANY STORIES', "TAYLOR TO HYDE"'s "TO", and the compass "N" (vi B, ar ش, th น), in the `.map-topline` and `.map-compass` spans.
- **D9. Partly translated locales** are not offered to players. They are reachable with `?lang=xx&preview=1` and a visible badge, with fallback spans `lang="en"`.
- **D10. Release gates.** A locale ships when:
  - coverage is 100% of player-visible msgids, minus the allowlist;
  - every 4.4 batch has two reviews;
  - in-context QA passed at 320, 390 and 1440;
  - `next:locales` is green;
  - catalog tests are green;
  - About carries the credit and AI-assistance line and a feedback route.
- **D11. Deploying a locale update:**
  1. A PR with the catalog and the regenerated manifest.
  2. `npm test` and `npm run next:locales -- <code>`.
  3. A commit with `[skip ci]`, as the repo does.
  4. A Pages deploy only with the creator's explicit OK.
  5. Manifest hashes bust caches. No service worker.
- **D12. Fonts.** System fonts only, with `:lang()` stacks: no font files, no CSP change. Revisit self-hosted subsets (which need `font-src 'self'` and the scaffold test update) only if device QA finds gaps.
- **D13. Input.** Accept `event.code` (positional) as well as `event.key`. US behaviour is unchanged, and Arabic, Thai and AZERTY players can walk.
- **D14. Godot source defects** ("Step %d of5", "1 taps"). English stays verbatim. Translations correct them silently, and a list goes to the creator.
- **D15. Scope.** Chinese (Cantonese, Traditional) and Tagalog are not in scope. The architecture supports them, CJK through I4's Segmenter path plus fonts.
- **D16. Optional civic disclaimers and an "English prevails" note.** The creator decides (4.7).
- **D17. English flash at load** for non-English players: accept it (static text behind the loading overlay for one fetch). The alternative is to hide the chrome until the locale applies, with a CSS fallback.
- **D18. Canvas chips longer than the map at 320 and 390 px.** Recommend a maximum chip width (about 70% of the canvas) with an ellipsis, the full text in the hover chip, and `sprites.js` placement dropping lower priorities as today. The alternative is two-line chips, which need taller placement boxes.

Risks:
- **R1. English regressions during extraction**, about 2,000 edits across CRLF files. Mitigation: English-identity tests, composition parity, the existing English suites unchanged, and a small CRLF edit protocol.
- **R2. Composites drifting from Godot fragments** when Godot changes. Mitigation: parity tests fail immediately.
- **R3. Mistranslation in civic, housing, power, pets, emergency, identity or save content.** Mitigation: the 4.4 two-reviewer gate and back-translation flags.
- **R4. Arabic complexity**: form of address, RTL, transliteration. Mitigation: the early pilot and I3 before content.
- **R5. Canvas text has no wrapping or clipping**, so long labels are cut at phone widths. Mitigation: D18 and the I7 checks.
- **R6. Fonts unverified off Windows Chrome** (macOS Georgia and Vietnamese, iOS, Android, Linux). Mitigation: a device QA pass per locale.
- **R7. Concurrent Phase 3 work.** Mitigation: the I0 gate.
- **R8. Catalog and code skew after a deploy** (Pages caching). Mitigation: manifest hashes, per-string fallback, `?h=`.
- **R9. Messages composed before a language switch** stay in the old language until the next action (visit state stores text). Documented. The alternative, message descriptors in state, is too invasive for the pure modules.
- **R10. Phone performance.** Catalog parse, Segmenter work and per-frame wrapping. Mitigation: memoization, `Intl` objects reused, an I7 timing check.
- **R11. Text-keyed logic not found by this review.** Mitigation: the scan test and the pseudo-locale test.
- **R12. Reviewer availability and cost** for Thai and Arabic: about $18k and 336 hours in all.
- **R13. Browser machine translation** (Chrome Translate) rewrites DOM text. The fork's DOM-reading code would misbehave (fixed by 1.3.12 #9) and key names would be translated. Mitigation: `translate="no"` on protected elements.
- **R14. The later 3D localization** requires Godot's own fragment refactor across 16,327 lines of `main.gd`.

Could not verify:
- macOS, iOS, Android and Linux fonts;
- screen-reader voice switching for `lang` spans and Arabic or Thai text;
- Firefox and Safari rendering, since only Chrome 156 was run;
- expansion beyond the 40 probe strings;
- the identity of Chrome's canvas fallback font for Thai;
- Godot behaviour, since Godot was not run (section 5 rests on the docs);
- function contents that the uncommitted Phase 3 work may still change.

---

## 8. Acceptance checklists

Common to every package:
- `git diff --stat` lists only the package's files;
- CRLF files keep CRLF with 0 bare LF, and every new file is LF with at least one newline;
- `node --test tests/next-scaffold.test.mjs` passes;
- `node --check` passes on every new or edited JS file;
- `npm test` passes, with no test weakened. Changed assertions are listed with reasons.

**I1**
- `node --test tests/next-i18n.test.mjs tests/next-i18n-catalogs.test.mjs` passes.
- With no catalog, the English browser suites (`npm run next:browser`, `next:ending`, `next:visits`) pass unchanged.
- `localStorage['tenderloin-redux.godot.save.v1']` never contains "lang" after switching languages, and only the fork settings key holds `language`.
- A stale catalog response after a newer switch draws nothing (unit test).
- WASD walks with `key` 'ي' or 'ก' and `code` KeyD.
- `node scripts/i18n.mjs extract && git diff --exit-code i18n/source.json` is clean.

**I2a–I2e** (each):
- The package's i18n test passes, including composition parity for every new composite.
- Under the pseudo catalog, `tests/next-i18n-pseudo.test.mjs` reports zero English runs for the package's screens.
- I2a and I2d: `grep -rn "split('. Paint')" browser-next` and `grep -n "textContent.replace" browser-next/game.js` find nothing.
- `node --test tests/next-press-settle.test.mjs tests/next-wiring.test.mjs` passes.
- No file in the package's list holds a Godot literal outside the Godot tables (the `jsStrings` ∩ `gdStrings` check).

**I3**
- `node --test tests/next-i18n-css.test.mjs` passes.
- Physical `left`/`right` appear only in the keep-list.
- In the `locales` runner's `qps-rtl` mode at 320, 390 and 1440:
  - × sits top-left;
  - the conversation border is on the right;
  - `.welcome-art` does not touch ×;
  - ⓘ and the zoom row are where they are in English;
  - the compass is visible;
  - no page overflow at 320.
- Under vi, CDP lists no Times New Roman for `h1` text.

**I4**
- `node --test tests/next-i18n-canvas.test.mjs tests/next-sprites.test.mjs tests/next-characters.test.mjs` passes.
- Thai bubbles break only at Segmenter word boundaries; no line starts with U+0E31 or U+0E34–U+0E3A or U+0E47–U+0E4E.
- `World.hit` matches the drawn chip box for a long and a short label.
- In RTL, street names draw with `direction 'ltr'`.

**I5 and I6** (per locale):
- `node scripts/i18n.mjs check <code>` reports 0 errors and 100% coverage.
- `i18n/review/<code>.json` shows every batch `reviewed`, and every 4.4 batch with two reviewers.
- `npm run next:locales -- <code>` passes at 320, 390 and 1440.
- The About credit line is present.
- A native reader has played the opening, one neighbor conversation, Settings, the restart dialog and one side story in context.

**I7**
- `npm run next:locales` passes for pseudo, pseudo-RTL and every shipped locale.
- The receipt lists locales, widths and checks.
- `clean(log)`: no external request, no CSP violation.

**I8**
- `docs/BROWSER_NEXT.md` has a "Localization" section naming the files, the rules (English source of truth, catalog keys, fallback, the settings key, no save field), the tests and the release gates.
- `i18n/README.md` lets a contributor add a locale with the 2.13 steps alone.
