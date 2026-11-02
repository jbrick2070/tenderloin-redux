# Triage of the Gemini translatability QA report

- Date: 2026-11-01
- Report triaged: `docs/i18n-advice/gemini-translatability-qa.md` (Gemini 4 Argon; it read `i18n/source.json` at `bd865bc`, 1,488 msgids)
- Tree: branch `wip-i2`, commit `c02221b` (I2 built; `i18n/source.json` has 2,398 msgids)
- Method: every finding was checked against the current code and `source.json` (msgid greps, file:line reads), and the runtime claims were run in Node where that is cheap. Nothing else in the repo was edited.

## Counts

Findings are the report's numbered claims, split where one claim has parts in different classes. Item A below is net-new (found while triaging) and is counted once.

| Class | Findings |
|---|---:|
| FIXED-BY-I2 | 18 |
| OPEN-CODE | 13 |
| OPEN-CONTENT | 26 |
| WRONG | 5 |
| ALREADY-KNOWN | 12 |
| Total | 74 |

Headline: the report's critical section (runtime surgery, case mutation, `+` stitching, extractor drops) was real at `bd865bc` and I2 fixed it. The code left is small: dead fragment msgids that block the ship gate, hard `\n` in button labels, a bidi and a context item, and extractor tidy-ups. The rest is translator content.

The runtime bugs asked about:
- 6B "UTF-16 hitbox": true (`world.js:91`), already planned for I4 (plan 1.4 #10), latent until `world.js` is localized.
- 6B "ch-unit width": true but minor (`visits-episodes.js:72`, four labels).
- 2C "`lengthClass()` never emits chip": true (0 of 2,398), metadata only.
- 1A `.replaceAll()`: fixed. 1B case mutation: fixed (only unreachable id fallbacks remain).

## OPEN-CODE, ranked by severity

### A. Dead fragment msgids are still extracted and still gate shipping (net-new; I2 follow-up; High)

Evidence:
- The composites are built from the Godot fragments at module load (`ending/compose.js`, `visits/compose.js`, `hosted-text.js`, `characters.js`), so the fragments are never looked up on their own. They stay in `source.json` because the Godot tables are registered. Example: "Placed " and " on its city address pin." (`visits.election.TEXT.place_label.placed/onPin`) are read only at `visits/compose.js:66-67`; the player sees `Placed {address} on its city address pin.`
- Of 2,398 msgids, 267 are fragment-shaped (leading or trailing space or `\n`, or a lowercase start). 122 of those occur inside a composite msgid, so they are almost all dead (for example "\nThanh: Our ", " and ", " Celeste: ", "\nOpen place: "). The other 145 are mostly live whole sentences with a leading space or newline (for example `characters.COMPOSITION.riseLeft`).
- Consequence: `scripts/i18n.mjs:261` refuses to ship a locale while any source msgid is untranslated, and coverage (`:237`) counts them. Translators would translate strings no player sees, and a fragment such as " and " has no usable meaning for them.

Fix: have `extract` skip table values that are only composite inputs (a `FRAGMENTS` list, or a marker the compose modules emit), or mark them `unused: true` and exclude them from `missing` and coverage. For the exact set, run the integration pseudo tests with a lookup recorder (the miss hook in `i18n.js` is the same seam) and diff against `source.json`. Tell translators that the leading space or newline of the live sentence pieces (`COMPOSITION`, `MURAL_REPLY`, `RHYTHM_TEXT.*Tail`) is part of the msgid.

### B. Hard `\n` inside button and card labels (6A, 2D.5; I2 follow-up with I3 CSS; Medium-High)

Evidence: 36 msgids of 40 characters or fewer have one interior `\n` ("Compose\nMural", "Play\nBar", "Rhythm\nCircle", "Battery\nview", "Case\nmap", "A pair and\nan open seat", "Music:\nOn", ...). `checkText` requires the same number of newlines in the translation (`i18n.js:181`), and the renderers turn each into `<br>` (`ending/ui.js:36`, `visits-kit.js:110`, `rhythm-ui.js:22`, `game.js:471,555,704`). A translator must therefore break every such label exactly once, even where the target is one word or a Thai or Arabic compound. Many also exist twice, with and without the break (19 normalized-duplicate groups, for example "Making\nMusic" and "Making Music").

Fix: in a locale, render `\n` in these labels as a space and let `white-space: normal; text-wrap: balance` wrap (English keeps `<br>`, so output stays byte-identical). Relax the newline rule to "0 or 1" for labels of 40 characters or fewer with one interior newline. Key such labels without the newline in `extract` so the pairs merge.

### C. `%d/%d` is isolated per argument in RTL (3B.2; I3 or I2 follow-up; Medium; not proven in a browser)

`substitute` wraps each `%d` and `%s` in FSI...PDI (`i18n.js:532-534`). In "%d/%d" that puts "/" between two isolates. By UAX #9 rule N1 the slash then takes the paragraph direction (RTL), so Arabic "1/3" should display as "3/1". I could not run a browser probe (the preview pane serves local files as static snapshots), so treat this as likely, not proven. About 49 ratio labels are affected (plan 1.3.6).

Fix: isolate a run of `%d/%d` (or `%d/N`, `N/%d`) as one LRI...PDI span instead of per argument, and add it to the I7 bidi probe.

### D. Real msgid collisions need contexts at the call sites (4B, 4A; I5 before Spanish drafting; Medium)

No `source.json` entry has a context yet. The genuine same-msgid, different-use pairs left after I2:
- "Complete": `programme_gathering.gd refresh.complete` (status) and `rhythm.RHYTHM_TEXT.complete` (button).
- "Gathering": `orbital_commons.gd refresh.gathering` (tab) and `visits.dogs.LEADS[2]` (a place).
- "Continue": `story.show_story_card.resume` and `visits.picker.refresh.continue`.
- "Previous": `orbital_commons.gd refresh.previous` (panel) and `programme_gathering.gd setup.previous` (turn); matters for Arabic gender only.

Also pass a context for status words that agree with a noun: "Ready"/"Pending" (`characters.js:613`, rook header at `:586`) and "Playing"/"Paused" (`:586`). The mechanism exists (`L(english, ctx)`, catalog `context` section). The rest of the report's 4B list is single-use, so a translator note is enough.

### E. Button names quoted inside prose must match the button (9B.15; I5 tooling or I7; Medium)

Evidence: 52 distinct msgids name one of 16 checked buttons without quotes ("Keep exploring" 8, "Power Story" 8, "End story" 8, "Gather here" 6, "Spot Surprise" 6, "Ready together" 4, "Host Activity" 4, ...). Nothing checks that translated prose uses the translated button text; plan 1.3.4 covers only the aria-label rule.

Fix: add an `i18n/ui-terms` list (button msgids from `length: "button"`, `HUB_LABELS`, setup and refresh labels) and a `check` warning when a translated prose msgid whose English contains term T lacks the translation of T. Show the term list in review batches.

### F. Glued optional suffixes still live (3A.5; I2 follow-up; Low-Medium)

Still "%s%s" or "...%s" where the last argument is empty or a clause with a leading separator: `characters.js:743-747` (arrival captions, `more = ' ' + tail`), `visits/surprises.js:120-121` (" · Keepsake: %s"), `visits/dogs.js:110` (" | Reunited!"), `visits/power.js:212` ("Relay %d%s" with " OK"), `game.js:509` (film "Captured %s (%d/3 frames)%s"). Fix: one composite per variant, as already done for hosted, frame and jig. Translators can cope today by ending their template with `%s`, so this is polish.

### G. "You made a %s for %s" (3C.3; I2 follow-up; Low-Medium)

`ending/screening.js:36-41` passes lowercased labels (`midSentence(L(label))`) into `Dez: "You made a %s for %s. %s %s"`. The article "a" sits outside the placeholder, so Spanish un/una and Arabic agreement depend on which of two formats it is. Fix: pass the format id and give two templates (or `$select` on the id, as for ordinals).

### H. Extractor: `addressee` misses imperative-only speech (5B; I2 follow-up; Low-Medium)

`scripts/i18n.mjs:220` tags only English "you/your". Verified untagged: Thanh "Pull up a stool...", "Tap any action below...", eatery hosts "Come back anytime", "Careful, they're hot!", cooks "Come press the base with me". A heuristic finds 13 quoted untagged imperative lines plus the unquoted host lines; the report's 34 is plausible. The Arabic `address.m/f` batches are built from this tag. Fix: also tag speech whose sentences start with an imperative verb, and any speaker line addressed to the player.

### I. Extractor: `lengthClass` never emits "chip" (2C.1; I2 follow-up; Low)

Confirmed: `scripts/i18n.mjs:138` tests `startsWith('world.js')`, but paths are built with `.js` stripped (`world.PLACES[3].name`), and 0 of 2,398 entries are "chip". The report's one-line fix (`'world.'`) is not enough: chip text now lives under `characters.CHARACTER_PEOPLE[*]`, `history.BLACK_HAWK` and `world.PLACES`, so list the sources explicitly. It is metadata only; no check consumes it yet (budget checks are I5 or I7 work). The report's `world.NEIGHBORS[2].role` example is stale.

### J. Straight and curly apostrophe variants of one msgid (2D.4; I2 follow-up; Low)

`core.js:25-27` "Celeste’s paint case" and `story.js:31` "Celeste's paint case" (3 pairs). English must stay byte-identical, so do not edit the sources. Fix: key the catalog by an apostrophe-normalized msgid (in `readCatalog` and `L`) and merge such entries in `extract`, so one translation covers both.

### K. `SENSITIVE` regexes tag ordinary words (2D.7; I2 follow-up; Low)

Unchanged at `scripts/i18n.mjs:125-134`: `pets` fires on "lost" and "sighting", `save` on "progress", `keys` on "press" and "arrow". It adds noise to sensitive review batches. Fix: require pet context for lost and sighting, and key or storage context for press, arrow and progress.

### L. `${[...text].length}ch` label offset (6B.ch; I3 or I2e follow-up; Low)

Verified at `visits-episodes.js:72`: the right-edge clamp counts code points as `ch`, which over-reads Thai marks and Arabic diacritics and under-reads wide glyphs. Only the Larkin case map's four labels use it (`visits/power.js:224`: "40 m", "N" and two more), so the impact is small. The report's `translateX(-100%)` is not equivalent to a clamp. Fix: measure the width (canvas), or anchor with `max-inline-size` and `inset-inline-end`.

### Scheduled, still open (not counted as new)

- `world.js:91` hit box versus drawn chip (`world.js:156`): I4, test already planned.
- Canvas chip overflow at 320 and 390 px: D18.

## OPEN-CONTENT, by language

No code change. (NR) = needs a native reviewer. There is no `i18n/notes.json` and no placeholder-meaning field yet (plan 4.1); the notes below can seed them.

### All languages

- Narrow variants (1A.2, 6C.1): every `NARROW_LABEL_REWRITES` template needs a `narrow` entry per locale: "Go Meet %s", "Talk to %s", "Spot Surprise (%d/%d)", "Visit the Museum", "Visit Eateries", "Walk to Compton's", "Walk to Black Hawk", "See Compton's Plaque", "Paint with Celeste", "Soundcheck with Rook", "Open Floor (Dez & Celeste)", "Long Table (Bea)", "Take Group Photo", "All Block Actions". The report's budget (about 18 characters in es and vi, 16 graphemes in ar and th) is unverified; take it from the I4 measurements.
- Godot defects to add to the D14 list (2D.2, 2D.3, 2D.6): "jalapeno" in `godot/main.gd:238` (the specialty line says jalapeño); a space before the final period after the SFACC URL (`dog_story.gd:334`; put the URL on its own line, isolated in ar); "scale bar 40m" versus "40 m"; the double-spaced " · " in the three "Talking with..." headers; the straight and curly apostrophe pairs.
- Placeholder meanings (3A): seed from the report, for example `characters.PANEL_TEXT.header` (name, role, music state, turn, stem summary, met n of m, mural count, sparks) and `visits.power.TEXT.refresh.relay` (relay, kit, neighbor, clue, direction, connector, direction, connector). "IN" and "OUT" also appear in the diagram SVG: keep or localize both.
- Units and counters (3B.3): "%.0f m", "about %d m %s", "Volume: %d%%". Localize "m" (ar م or متر; th เมตร) and keep `%d%%` LTR in ar. Prefer "Label: %d/5" forms (plan line 529).
- Locatives and "style" (3C.2, 3C.5): each compass phrase must stand alone after "is" for any subject ("right here", "nearby", "about 2 blocks east") with its own preposition, gender-invariant in Arabic. ", %s style!" takes a layout name ("Long Table", "Open Floor").
- Pin labels (6C.2): "1 380 Eddy St\nCadillac" can read as 1380 (Godot text, `voting_story.gd:84`). A translator may add a separator ("1 · 380 Eddy St") and keep the one newline.
- Short terms (4A, 4B), a one-line note each, no context needed: Table and "Long Table" are furniture; Seats (habitat copy, furniture); Lead = a clue or tip in the dog story, never a leash, and a different sense as the melodic "Lead" stem; Bar = one 8-step measure, not a tavern; Hit and Rest = drum steps; Practice, Hosting, Listen = modes; Entry, Window, Far wall, Side nook = places in the room model; Across, Along, Corner = positions on a 2x2 grid; Draft = the schedule tab; Invite and Opening = pinboard badges; March = walk in the lantern procession (not the month); Assembly, Gather, Parade; Earlier and Later = pages of stories, not time; Stop = stop walking; Close = verb; Sources = citations; Story, Festival, Resume, Visit, Walk, Skip, Depart, Hint, Info are buttons.
- Idioms and jargon (7F): brush = jazz wire brush (Dez, Rook) versus paintbrush (Celeste); stems = audio layers; "harmonic pad" = sustained chord layer; downbeat; "in pocket" = locked groove; "local cut" = the player's own audio file; "platter" = turntable at the hi-fi bar, serving dish in Cook & Share; "soul 45s" = 45 rpm singles; "Order Up", "coming right up", "Rack 'em up!", "rack of pool"; "cold draft" = draft beer; "zero-proof" = non-alcoholic; "night owls"; "I'm holding you to it"; "Your call!"; "Roll Camera (Clear)" (Clear = route unobstructed); "Skol, neighbor!" (playful greeting); "everything bagel"; "olallieberry pie"; "sourdough griddle cakes".
- Glossary clusters (8B): Starlight versus Starlight Vee (one performer); Bea's rollator versus walker, and "walkers" in `thanh.before[4]` = mobility walkers, not pedestrians (one term across the four msgids); Listening Hour / Listening hour / Tenant Circle / tenant listening circle; Helper bench = workbench = Helper workshop (not a park bench, cf. "a bench and some trees"); Power Story / Power stories / Lights Back On (prose must match the "Power Story" button); block party / block gathering / The Gathering (a warm gathering, not a loud party); Portable Mural Board / sidewalk easel / street board / Celeste's Shared Panel / Shared art panel (one object).
- RISE (8A): D8 keeps the drawn sign "RISE" in Latin, but the texts say "Rise" ("My Rise opens the scene...", "Bea's Rise", "Paint Sun, Wave and Rise"). Glossary entry: the motif name is RISE as drawn, so the HUD matches the canvas. Lulu is an unseen fictional neighbor who gave the sun motif; keep the name.
- Larkin Street (8A): in `neighborhood-voices.json` record 2, "Larkin Street describes..." is the organization Larkin Street Youth Services, not the street. Keep the organization name. (An English edit of that data file would also work, but it changes English output and any test that pins it.)
- Culinary and dietary (7D, 7E): "smoked pork sausage" (RECIPES[3]) and "Chinese sausage" (lap cheong, pork; RECIPES[1]) keep the pork visible, in Arabic especially; Lo bak go uses regular (non-glutinous) rice flour and is a savory cake; holy basil is not sweet basil (Mali's Beef pad kra pao); "Gullah Geechee" and "Lowcountry" stay specific names; Kibbeh bil sanieh takes its native Arabic name (already plan 4.5).
- Civic, identity and housing (7A, 7B, 7C; plan 4.4, two readers; NR): Ramaytush, Ohlone and Yelamu stay, in the present tense ("continue to live today"), and "consultation and cultural acceptance have not occurred" keeps its exact meaning; "staying put" = remaining in one's home (anti-displacement); person-first wording for "young people experiencing homelessness" and "people with low incomes"; "trans women" in each community's affirming term; "drag" and "Two-step on the velvet runner" keep their register; "The Block Mayor" and "Mayor Public Event" keep the joke (scare quotes) and must not read as a real office; "2nd Floor Sanctuary" is a room designation (`data/voting_places.json` `room`), keep English beside any gloss; "San Francisco Department of Elections" stays recognizable; years stay Gregorian (2024).
- Halloween (7D): keep the secular paper-lantern framing; do not map it to Mid-Autumn or Loy Krathong.
- Mixed paragraphs (5D): 28 paragraphs mix quoted speech and system help (for example `visits.election.TEXT.begin.begun`, `helper_bench.gd refresh.intro`). The notes should say which sentences are spoken, so vi and th use pronouns and particles only inside the quotes.

### Spanish (es)

- Player-gender-neutral wording (5C): about 20 msgids say "when you are ready" or "when ready" (the report counted 13; the composites add more), plus "Lost?" and "Welcome!". Use "cuando quieras", "a tu ritmo", "¿Te perdiste?"; avoid listo/lista, perdido/a, bienvenido/a. This extends the neutral-form rule already in `docs/I18N_ADVICE.md` (D4).
- Agreement words: "Soundcheck: Ready" (prueba de sonido: lista) needs the context from OPEN-CODE D; ordinals ("%s was %s in the afternoon...") use `$select`.
- Table and "Long Table" = mesa; "jalapeño"; "El Alcalde de la Cuadra" (NR); sentence-case dish names in the "Order Up" titles (`MENU_TITLES` is free text now, so the RAE concern is a style-guide line, not code).

### Vietnamese (vi)

- Little Saigon (Southern) usage and food words are already in `docs/I18N_ADVICE.md`. New: holy basil versus ordinary pho basil (hương nhu or húng quế; NR); bột gạo tẻ for non-glutinous rice flour; "bánh" for a savory cake; "“Thị Trưởng” Khu Phố" for the Block Mayor (NR).
- "Invite {owner}" and Bea's honorific: the owner is a plain name argument, so "cô Bea" has to come from the name msgid or a style rule. The character sheet decides (Thanh's tone is already an open question).
- Classifiers inside count templates (nhịp, dãy phố, vị khách): already plan 3.2.

### Arabic (ar)

- Imperative speech needs `address.m/f` variants (D5); the tag gap that hides some of them from the batches is OPEN-CODE H. UI chrome uses verbal nouns (D5).
- Arabic comma "،" in lists comes from `Intl.ListFormat`; check every hand-written ", " in templates.
- Ramaytush, Yelamu and Ohlone in script with a Latin parenthesis on first mention (NR); "trans women" wording (NR); pork stays explicit; "Sanctuary" as the hall, not refuge or asylum; the URL after the SFACC text; Shift-key hints isolated; locatives gender-invariant.

### Thai (th)

- ผัดกะเพราเนื้อ and ใบกะเพรา (กะเพรา, not กระเพรา, not โหระพา); แป้งข้าวจ้าว for regular rice flour; ขนมผักกาด for Lo bak go (NR).
- Drop คุณ from UI and objectives; Bea's พี่ or ป้า is a creator decision (already in `docs/I18N_ADVICE.md`); avoid คนเร่ร่อน; ผู้หญิงข้ามเพศ (NR).
- Compound button labels must not be broken mid-compound by an artificial newline (OPEN-CODE B); Gregorian years only.

## FIXED-BY-I2, WRONG, ALREADY-KNOWN

### FIXED-BY-I2

- 1A.1 runtime `replaceAll(repairSurface, batteryView)`: gone. `visits/compose.js:58` builds the Larkin walk line once at module load from English fragments, one whole-sentence msgid, used at `visits/power.js:192`. (The report quotes Godot's `room` text; 2D shows "Make the window taller or wider...", and `walkCloses` is no longer referenced.)
- 1A.2 `narrowLabel` surgery: `characters.js:672-678` runs the English rewrites for English only; a locale uses the catalog `narrow` section keyed by the wide template, else the wide label. What remains is content.
- 1B.1 `gdCapitalize` on dishes: `MENU_TITLES` (`visits/compose.js:100-103`) is a msgid table; a locale translates the title and never title-cases.
- 1B.2 mid-sentence `toLowerCase()`: `midSentence` (`ending/compose.js:14`) lowercases English only, a locale uses `toLocaleLowerCase` on its own text. The calls left (`film.js:87`, `hosting.js:112`, `characters.js:442`) are unknown-id fallbacks no shipped id reaches.
- 1B.3 `capitalize()` of raw ids: `CHARACTER_COMPOSE.palettes`, `ENDING_DISPLAY.muralPalettes` and `.slots`, `BURST_DISPLAY.motifs` are msgids ("Garden", "Sunset", "Left"); `capitalize` returns the id unchanged in a locale (`ending/text.js:442`).
- 1C.1 Orbital Commons stitching: `ENDING_COMPOSE` (`ending/compose.js`, 70 composites) holds each paragraph as one named-placeholder template.
- 1C.2 dog story "'s note" stitching: `COMPOSE_TEXT.dogs` (`visits/compose.js:31-41`); the possessive is inside the template.
- 1C.3 election pin, address and source chains: `COMPOSE_TEXT.election` (`visits/compose.js:66-73`).
- 1C.5 loan Return/Returned, "Music\nOn", "Dez's Rhythm Circle - ...", "Palette:", "Detail of", "Invite {owner}", civic Follow, frame, meal, lantern, picker: whole composites (`CHARACTER_COMPOSE`, `RHYTHM_COMPOSE`, `ENDING_COMPOSE`, `COMPOSE_TEXT.*`). Residual glue is OPEN-CODE F; dead fragments are OPEN-CODE A.
- 2A `SKIP_KEYS`: no longer holds `art`, `kind`, `cue`. All 8 strings are in `source.json` (checked individually). `palette`, `shape`, `slot` stay skipped; they hold ids, and the shown words are display tables.
- 2B lowercase single words: `SHORT_TEXT` whitelists nearby, restored, rest, "40 m", N; fitted/empty, ordinals, left/right, palettes, compass words and stems are composites, display tables or ids chosen by `$select`. The `isHumanText` rule is unchanged, but the pseudo tests build their catalog from `source.json` alone and fail on any lookup it lacks.
- 2C.2 inline `['Entry', ...][i]` in `ending/ui.js`: now `v.picture.names` = `L(NAMES)` (`ending/habitat.js:172`).
- 2D.6a "Shift F8": gone; `WEB_OVERRIDES` is now applied per Godot file by the extractor.
- 3A.6 jig line, film frame "..., selected", hosted "Completed ... (%d/4 hosted)": `ENDING_COMPOSE.jig.*`, `frameName`/`frameSelected`, `HOSTED_COMPOSE`.
- 3C.2 locative collisions in "%s is %s": the compass phrases are whole msgids per direction (`COMPASS_TEXT`, `story.js:28`), so "a ..." lives inside the phrase. A note is still needed (content).
- 3C.4 ordinal and left/right agreement: ids reach the formatter and a catalog uses `$select` (`i18n.js:210`); slot and scene phrases are whole (`CHARACTER_COMPOSE.sceneAt`, `ENDING_DISPLAY.slots`).
- 3C.5 the hard-coded `', '` list joiner in "We just need: %s": `blockMissingItems` plus `list()` (`game.js:1015-1016`, `Intl.ListFormat`).
- 4A "On"/"Off" shared by Music and Step cues: live labels are atomic composites ("Music\nOn", "Step cues\nOff": `RHYTHM_COMPOSE`, `ENDING_COMPOSE.musicOn`); "On" and "Off" survive only as dead fragments (OPEN-CODE A).

### WRONG

- 1C.4 "Tea kettle lamp are back": no such strings exist. The festival `NAMES` are "Welcome lights", "Art lights", "Rhythm lights" (all plural), and Larkin mode uses its own line (`power.js:145`, `COMPOSE_TEXT.power.portable`).
- 4A "Back" has three senses: every use means "go back"; one translation fits all 10 paths. The real risk is the quoted-button match (OPEN-CODE E).
- 6B "[*] ... (Tap / Shift+D)" chips and the Shift+D surprise hints: that is Godot text. 2D shows "[*] ... (Tap)" and removes the key hint through `WEB_OVERRIDES`; 16 of the report's msgids no longer exist.
- 6C.3 speaker "header pill" with `nowrap`: there is no speaker pill. `drawBubble` (`world.js:284`) draws only the wrapped spoken text; the name is stripped by `spokenText`. The long-name limit is the envelope rule in `docs/I18N_ADVICE.md`, and `speakerLimit` is built (`bubble.js:47`).
- 5A counts (1,488 msgids, 213 tagged) are stale: 2,398 msgids and 384 tagged `addressee: player` now. The 5B conclusion about untagged imperatives still holds (OPEN-CODE H).

### ALREADY-KNOWN

- 2D.1 "Step %d of5": Godot defect (`shared_meal.gd:233`); D14 lists it, English stays verbatim.
- 3A positional placeholders: `%2$s` reorder is supported (`i18n.js` `placeholdersMatch`), and fork composites use `{name}`. Slot-meaning notes are plan 4.1 (not built); the report's 3A tables are good input.
- 3B.1 plurals on counts ("%d guests", "%d links fitted."): plural objects keyed by the first `%d` (plan 1.3.8, 2.4; engine built). English "1 links" and "1 taps" are D14.
- 3C.1 "You said goodbye to %s" with "the block": plan 1.3.7 names it. Both callers (`game.js:756, 1291`) pass an open conversation id, so `goodbyeNobody` is reached only for an unknown id.
- 4A gender agreement for Ready, Pending, Playing, Paused, Complete needs context entries: plan 1.3.1 and line 657. The call sites do not pass one yet (OPEN-CODE D).
- 5B Arabic `address.m/f` for dialogue and neutral UI chrome (verbal nouns): D5.
- 6B world chip hit box `chip.text.length * 7 + 20` (`world.js:91`; the drawn chip at `world.js:156` uses `measureText`): plan 1.4 #10 and the I4 test "the hit box equals the drawn chip". Verified true and still open, but latent: `world.js` does not import `i18n.js`, so its labels are English until I4. For Thai the estimate over-reads about 30% ("จุดประวัติศาสตร์แบล็กฮอว์ก": 26 UTF-16 units, 20 grapheme clusters, 6 zero-advance marks).
- 6B chips longer than the map at 320 and 390 px: D18 (70% cap with ellipsis).
- 6C.1 action buttons overflowing narrow phone grids: the plan's `narrow` catalog section (2.4); `NARROW_LABEL_REWRITES` is English-only. The entries are content.
- 7A Ramaytush acknowledgement: plan 4.4 category 5 (two readers). The report's wording guidance is OPEN-CONTENT.
- 8A do-not-translate matrix (brand, streets, organizations, names, dishes native-named, transliterated names in ar and th): D7, D8, plan 4.5.
- 5D vi "cô" with "bạn": `docs/I18N_ADVICE.md` ("Do not pair cô with bạn") and plan 3.2.

## Spot checks run

- Every backticked msgid in the report against the old and new `source.json`: 776 still present, 16 gone (all "Shift+D" or "Shift F8" Godot text), 612 not in the old file (paraphrases or truncations).
- `'world.NEIGHBORS[0].name'.startsWith('world.js')` is false, and 0 of 2,398 entries have `length: "chip"`.
- Thai segmentation counts above, from `Intl.Segmenter('th', {granularity: 'grapheme'})`.
- Bidi of "1/3" in RTL was reasoned from UAX #9, not run (OPEN-CODE C).
