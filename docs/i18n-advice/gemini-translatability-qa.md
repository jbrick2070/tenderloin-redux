> **Unverified machine QA.** Gemini 4 Argon, run by the creator on November 1, 2026 against `i18n/source.json` as it was before I2 (1,488 msgids). Its findings are triaged against the I2 code in `gemini-translatability-triage.md`; act on that file, not this one.

# English Source Translatability QA Audit — *Tenderloin Redux*

- **Date:** 2026-11-01
- **Source catalog audited:** `i18n/source.json` — **1,488 `msgid`s** (`format: 1`, `generatedBy: "node scripts/i18n.mjs extract"`)
- **Target locales audited:**
  - **`es`** — Spanish (neutral US / Latin American, `tú` + `ustedes`, gender-neutral phrasing without `-x`/`-e`)
  - **`vi`** — Vietnamese (Southern / Little Saigon diaspora usage)
  - **`ar`** — Arabic (warm Modern Standard Arabic, `ar-u-nu-latn` Western digits, neutral UI chrome + `address.m` / `address.f` dialogue variants, RTL)
  - **`th`** — Thai (conversational Central Thai, Gregorian years, speaker-gendered dialogue particles, particle-free UI chrome)
- **Non-duplication scope:** `docs/I18N_PLAN.md` (including Section 7 decisions D1–D15) and `docs/I18N_ADVICE.md` were cross-checked before auditing. All points already recorded in `docs/I18N_ADVICE.md` (Spanish `many` plural validator fallback; Thai grapheme regex and `U+2060`; 12-code-unit `bubble.js` speaker envelope limit; Thanh's `"him"` pronoun check; `vi` diacritics on fictional eatery names like `"Morning Star Banh Mi & Coffee"`; `muralEditor` `"Lulu's sun"` lowercasing; `"TAYLOR TO HYDE"`; `vi` compass `"B"`; SVG data-URI fonts/`dir`; `address.m`/`address.f` + plural/narrow catalog schema nesting; `"The Transgender District"` vs `"Transgender Cultural District"` and `"1966 uprising"` vs `"Riot"` rule; Godot `" , selected"` leading space; and the checked locale style bullets) are **not repeated here**. Every finding below is net-new against `i18n/source.json`, `scripts/i18n.mjs`, and the registered `browser-next/` modules.
- **Notation:** Literal newline characters inside JSON `msgid` values are shown as `\n` inside quoted strings so leading, mid-string, and trailing line breaks and spaces remain visible verbatim.

---

## Summary Table — Issues by Category × Language (Most Serious First)

| Rank | Audit Category | Unique `msgid`s / Defects | `es` (Spanish) | `vi` (Vietnamese) | `ar` (Arabic) | `th` (Thai) | Primary Failure Mode |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| **1** | **1. Fragments, Runtime String Surgery & Broken Composition** | **254** | 254 | 242 | 254 | 240 | `.replaceAll()` / `narrowLabel()` surgery, `.toLowerCase()` / `gdCapitalize()` mutation, `+` sentence stitching |
| **2** | **8. Source & Extractor Defects, Missing Strings & Tag Noise** | **94** | 94 | 94 | 94 | 94 | `SKIP_KEYS` & `isHumanText()` dropping 28 live strings, `chip: 0` bug, typos (`of5`, `jalapeno`), curly/straight `'` duplicates |
| **3** | **3. Placeholders, Positional Order, Plurals & Agreement** | **152** | 146 | 125 | 152 | 125 | Up to 9 positional `%s/%d` slots, 33 unpluralized counts/ratios, animacy/gender/article/preposition collisions |
| **4** | **2. Ambiguous Short Strings & Active `msgid` Collisions** | **53** | 51 | 49 | 53 | 49 | Same `msgid` shared by verb + adjective (`"Complete"`), event + place (`"Gathering"`), fem + masc (`"On"`/`"Off"`) |
| **5** | **4. Player Address, Gender Variants & Pronoun/Particle Register** | **260** | 28 | 247 | 247 | 247 | 213 `addressee: "player"` + 34 untagged spoken imperatives + 15 gendered `es` adjectives + 28 mixed quote/UI blocks |
| **6** | **6. Length, Hardcoded `\n` Breaks & Phone/Canvas Layout Risks** | **90** | 86 | 82 | 78 | 88 | 35 mid-label `\n` buttons/pins, 56-char single-line canvas chips, UTF-16 `.length * 7` & `[...str].length` `ch` bugs |
| **7** | **7. Cultural, Civic, Historical, Dietary & Idiomatic Content** | **92** | 76 | 84 | 90 | 88 | Ramaytush disclaimer, civic parody, trans history terms, pork/alcohol clarity, holy basil vs sweet basil, music/diner idioms |
| **8** | **5. Proper Names, DNT Boundaries & Terminology Consistency** | **106** | 102 | 104 | 106 | 106 | `Larkin Street` org vs street, `"Lulu's Sun"`, `"RISE"` vs `"My Rise"`, 7 net-new inconsistent English term clusters |

---

## 1. Fragments, Runtime String Surgery & Broken Sentence Composition (Severity: Critical)

### 1A. Runtime `.replaceAll()` and Substring Rewrite Surgery on Translated Text (16 `msgid`s)

1. **Runtime noun-swap inside full sentences via `text.replaceAll(R.repairSurface, R.batteryView)` (`browser-next/visits/power.js:199`)**
   - **Exact `msgid`s & `paths`:**
     - `"repair surface"` — `visits.power.TEXT.refresh.repairSurface`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.repairSurface`
     - `"battery view"` — `visits.power.TEXT.refresh.batteryView`, `visits.power.TEXT.walk_to_relay.battery`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.batteryView`, `visits.text.GODOT_TEXT["power_story.gd"].walk_to_relay.battery`
     - `"Choose Walk to relay. The repair surface opens when you arrive; Stop Walking cancels."` — `visits.power.TEXT.refresh.walkFirst`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.walkFirst`
     - `"\nWalk to relay closes this reader and walks here; arrival reopens the repair surface."` — `visits.power.TEXT.refresh.walkCloses`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.walkCloses`
     - `"Widen the window slightly so the four connector controls fit, then reopen this repair surface.\n"` — `visits.power.TEXT.refresh.room`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.room`
   - **Languages affected:** `es`, `vi`, `ar`, `th`
   - **Why:** In Larkin 2017 mode, `power.js` translates the whole sentence first and then calls `.replaceAll(t('repair surface'), t('battery view'))`.
     - In **`ar`**, `"the repair surface"` carries the definite article on the second noun of an *idafa* construct (`سطح الإصلاح`), whereas `"this repair surface"` requires a post-nominal masculine demonstrative (`سطح الإصلاح هذا`). Substituting feminine `"battery view"` (`واجهة البطارية`) leaves a masculine demonstrative (`واجهة البطارية هذا` — ungrammatical) or fails outright to match when `الـ` is attached.
     - In **`es`**, `"la superficie de reparación"` (fem.) vs `"la vista de batería"` (fem.) or `"el panel de batería"` (masc.) breaks article/demonstrative gender (`esta` vs `este`) if the translator chooses a masculine noun (`panel`/`esquema`).
     - In **`vi`** and **`th`**, classifier choice (`bề mặt` vs `khung nhìn`/`màn hình`; `หน้าจอ`/`มุมมอง`) shifts between the standalone noun key and the definite demonstrative clause.
   - **Concrete fix:** Remove `.replaceAll()` in `visits/power.js:199`. Split `walkFirst`, `walkCloses`, and `room` into six standalone whole-sentence `msgid`s (`walkFirstRepair` / `walkFirstBattery`, `walkClosesRepair` / `walkClosesBattery`, `roomRepair` / `roomBattery`).

2. **Runtime English substring stripping in `narrowLabel()` (`browser-next/characters.js:284-287, 612`)**
   - **Exact `msgid`s & `paths` operated on by `NARROW_LABEL_REWRITES`:**
     - `"Go Meet %s"` — `characters.ACTION_LABELS.meet`
     - `"Talk to %s"` — `characters.ACTION_LABELS.talkTo`
     - `"Spot Surprise (%d/%d)"` — `characters.ACTION_LABELS.surprise`, `visits.text.GODOT_TEXT["main.gd"].conversation_actions.spot`
     - `"Visit the Museum"` — `characters.ACTION_LABELS.museum`, `visits.text.GODOT_TEXT["main.gd"].conversation_actions.museum`, `visits.text.GODOT_TEXT["main.gd"].landmark_tour_state.museumAction`
     - `"Visit Eateries"` — `characters.ACTION_LABELS.eateries`, `visits.text.GODOT_TEXT["main.gd"].conversation_actions.eateries`
     - `"Walk to Compton's"` — `characters.ACTION_LABELS.comptons`
     - `"Walk to Black Hawk"` — `characters.ACTION_LABELS.blackhawk`
     - `"See Compton's Plaque"` — `characters.ACTION_LABELS.plaque`
     - `"Paint with Celeste"` — `characters.ACTION_LABELS.mural`
     - `"Soundcheck with Rook"` — `characters.ACTION_LABELS.soundcheck`
     - `"Open Floor (Dez & Celeste)"` — `characters.ACTION_LABELS.layoutFloor`
     - `"Long Table (Bea)"` — `characters.ACTION_LABELS.layoutTable`
     - `"Take Group Photo"` — `characters.ACTION_LABELS.photo`
     - `"All Block Actions"` — `characters.ACTION_LABELS.hub`
   - **Languages affected:** `es`, `vi`, `ar`, `th`
   - **Why:** On viewports `< 600px`, `narrowLabel()` runs `.split(from).join(to)` for English substrings (`'Go Meet '` → `'Meet '`, `' with Celeste'` → `''`, `' (Dez & Celeste)'` → `''`, etc.) *after* formatting the label. None of those English substrings match in `es`, `vi`, `ar`, or `th`, leaving full-length translated strings (often 25–38 characters in `es`/`vi`) unshortened on narrow phone action bars.
   - **Concrete fix:** Look up the `narrow` variant from the locale catalog on the unformatted template *before* `format()` (e.g., `tn('Go Meet %s', narrow)`), and provide explicit `narrow` entries in `es`, `vi`, `ar`, and `th` for all 14 `ACTION_LABELS` above.

---

### 1B. Runtime `.toLowerCase()` and `capitalize()` / `gdCapitalize()` Case-Mutation on Translated Strings (38 `msgid`s)

1. **Title-Casing every word of translated dish names via `gdCapitalize(item)` (`browser-next/visits/landmarks.js:76, 88`)**
   - **Exact `msgid`s & `paths`:**
     - `"Order Up: %s"` — `visits.text.GODOT_TEXT["main.gd"].eatery_counter_interact.burst`
     - All 18 menu items fed into `gdCapitalize()` before formatting `"Order Up: %s"`:
       - `"lemongrass beef pho"` — `visits.landmarks.EATERY_MENU_ITEMS.bowl_basil_pho[0]`
       - `"mushroom pho"` — `visits.landmarks.EATERY_MENU_ITEMS.bowl_basil_pho[1]`
       - `"imperial rolls"` — `visits.landmarks.EATERY_MENU_ITEMS.bowl_basil_pho[2]`
       - `"garlic naan"` — `visits.landmarks.EATERY_MENU_ITEMS.saffron_clay_oven[0]`
       - `"chana masala"` — `visits.landmarks.EATERY_MENU_ITEMS.saffron_clay_oven[1]`
       - `"mango lassi"` — `visits.landmarks.EATERY_MENU_ITEMS.saffron_clay_oven[2]`
       - `"botanical highball"` — `visits.landmarks.EATERY_MENU_ITEMS.blue_valve_hifi[0]`
       - `"1961 live jazz LP"` — `visits.landmarks.EATERY_MENU_ITEMS.blue_valve_hifi[1]`
       - `"neighborhood cocktail"` — `visits.landmarks.EATERY_MENU_ITEMS.blue_valve_hifi[2]`
       - `"banh mi"` — `visits.landmarks.EATERY_MENU_ITEMS.morning_star_banh_mi[0]`
       - `"condensed-milk iced coffee"` — `visits.landmarks.EATERY_MENU_ITEMS.morning_star_banh_mi[1]`
       - `"pickled daikon side"` — `visits.landmarks.EATERY_MENU_ITEMS.morning_star_banh_mi[2]`
       - `"cold draft"` — `visits.landmarks.EATERY_MENU_ITEMS.copper_cue_tavern[0]`
       - `"rack of pool"` — `visits.landmarks.EATERY_MENU_ITEMS.copper_cue_tavern[1]`
       - `"soul 45 on the jukebox"` — `visits.landmarks.EATERY_MENU_ITEMS.copper_cue_tavern[2]`
       - `"sourdough griddle cakes"` — `visits.landmarks.EATERY_MENU_ITEMS.open_seat_diner[0]`
       - `"hash browns"` — `visits.landmarks.EATERY_MENU_ITEMS.open_seat_diner[1]`
       - `"olallieberry pie"` — `visits.landmarks.EATERY_MENU_ITEMS.open_seat_diner[2]`
       - `"house special"` — `visits.text.GODOT_TEXT["main.gd"].eatery_counter_interact.special`
   - **Languages affected:** `es`, `vi`, `ar`, `th`
   - **Why:** `gdCapitalize()` splits on spaces/hyphens/underscores, uppercases index `0` of every token, and lowercases the rest (`1961 live jazz LP` → `1961 Live Jazz Lp`, corrupting `"LP"` even in English!). In **`es`**, Title-Casing every word (`"Tarta De Olallieberry"`, `" Café Helado Con Leche Condensada"`) violates Spanish orthography (RAE forbids Title Case on common nouns and prepositions) and breaks hyphenated compounds. In **`vi`**, Title-Casing every syllable (`"Bánh Mì"`, `"Cà Phê Sữa Đá"`) turns common dish names into proper nouns. In **`ar`** and **`th`**, hyphen-splitting strips hyphens into spaces (`condensed-milk` → `condensed milk`).
   - **Concrete fix:** Do not call `gdCapitalize()` on translated menu items. Store separate display-cased `msgid`s or sentence-case `EATERY_MENU_ITEMS` directly in `"Order Up: %s"` and `"Ordering at %s: %s (tap the counter again for more)"`.

2. **Mid-sentence `.toLowerCase()` on translated titles, room places, shot labels, and civic formats (`characters.js:409`, `hosting.js:57,63`, `ending/orbital.js:107,113,114`, `ending/habitat.js:76,124,138,139`, `ending/bench.js:34,36,37`, `ending/screening.js:20,38`)**
   - **Exact `msgid`s mutated with `.toLowerCase()` & `paths`:**
     - Film shot labels: `"An empty seat"` (`film.FILM_SHOTS.seat.label`), `"A shared motif"` (`film.FILM_SHOTS.paint.label`), `"Room for one more"` (`film.FILM_SHOTS.welcome.label`) — lowercased into `"“We ended on %s. A different order would tell a different little story.”"` (`characters.PROJECT_MEMORY.film.dez`), `"%s\n%s\n%s | %s\nYour ending is %s...\nDez: We ended on %s..."` (`ending.text.GODOT["film_screening.gd"].refresh.text`), `"Dez: Your %s holds all three pictures, ending on %s..."` (`helper_bench.gd.refresh.complete`), `habitat_room.gd.refresh.complete`, `habitat_room.gd.departure_text.ready`, `orbital_commons.gd.acknowledgments` & `response.film`.
     - Film framing & plan labels: `"Objects in close-up"` (`film.FILM_FRAMING.close.label`), `"Table and volunteer hands"` (`film.FILM_FRAMING.wide.label`), `"A quiet prop take"` (`film.FILM_PLANS.quiet.label`), `"Wait for the conversation"` (`film.FILM_PLANS.later.label`) — lowercased into `orbital_commons.gd.acknowledgments`.
     - Habitat room places & item titles: `"Entry"`, `"Window"`, `"Far wall"`, `"Side nook"` (`ending.habitat.NAMES[0..3]`) and `"Art"`, `"Film"`, `"Seats"` (`ending.habitat.TITLES[0..2]`) — lowercased into `"You left the %s open..."` (`habitat_room.gd.refresh.complete`), `"%s: My link faces our %s by %s..."` (`habitat_room.gd.departure_action.wrong`/`.right`), and `orbital_commons.gd`.
     - Hosting choices & programme segments: `"An open arc of seats"`, `"A pair and an open seat"` (`hosting.QUIET_CHOICES`), `"Welcome & Stories"`, `"Rhythm Circle"`, `"Shared Art Panel"`, `"Quiet Tea Pause"` (`programme.SEGMENTS[0..3].name`) — lowercased into `"Rhythm Circle complete (%d/4 hosted). %s is next."` (`rhythm.RHYTHM_TEXT.completed`) and `"Our afternoon began with %s and ended with %s."` (`hosted_afternoon.gd.invitation.opening`).
     - Bench displays: `"Low stand"`, `"Framed triptych"` (`ending.text.GODOT_CONSTS["helper_bench.gd"].FORMS`) — lowercased into `"Dez: Good, the %s has %s..."` and `"Dez: Your %s holds all three pictures..."`.
     - Civic format & topic labels: `"Small listening circle"`, `"Drop-in notice table"` (`civic.CIVIC_FORMATS.*.label`), `"Repairs and staying put"`, `"Room to come and go"` (`civic.CIVIC_TOPICS.*.label`) — lowercased into `"Dez: \"You made a %s for %s. %s %s\""` (`main.gd.civic_completion_acknowledgment.line`).
   - **Languages affected:** `es`, `vi`, `ar`, `th`
   - **Why:**
     - Lowercasing a standalone nominative title does not turn it into a grammatical mid-sentence NP in **`es`** or **`ar`**. For example, `"Entry"` (`"Entrada"` in `es`, `"المدخل"` in `ar`) plugged into `"You left the " + spare.toLowerCase() + " open"` or `"by %s"` produces `"Dejaste el entrada abierto"` (wrong gender article `"el"` + wrong adjective `"abierto"` for feminine `"entrada"`!) or `"بجانب مدخل"` / `"تركت المدخل"` mismatches depending on whether `NAMES` includes `الـ`.
     - Lowercasing `"Wait for the conversation"` (an imperative verb phrase!) after `"Our plan was: "` works only behind a colon, whereas lowercasing `"Welcome & Stories"` or `"Quiet Tea Pause"` in **`es`**/`**vi**` wipes out capitalized proper concepts (`"Listening Hour"` / `"Turk"` if referenced).
   - **Concrete fix:** Eliminate `.toLowerCase()` on translated labels. Either quote standalone titles cleanly (e.g., `«%s»` / `“%s”`) or define dedicated in-sentence noun-phrase keys (with articles included inside the placeholder value, not hardcoded as `"the "` outside `%s`).

3. **Runtime `capitalize()` on raw internal English IDs (`'garden'`, `'sunset'`, `'ocean'`, `'sun'`, `'wave'`, `'rise'`, `'warm'`, `'cool'`) (`characters.js:488`, `ending/mural.js:65`, `bursts.js:49`)**
   - **Exact `msgid`s receiving raw capitalized IDs & `paths`:**
     - `"Talking with Celeste (Mural Artist · %s · Turn %d/5)  ·  Easel: %s (%s Palette)  ·  Sparks: %d"` — `characters.PANEL_TEXT.celesteHeader` (`%s` #4 receives `capitalize(muralPalette)` → `"Garden"` / `"Sunset"` / `"Ocean"` without `t()`, or raw `'garden'` which is missing from `source.json`!)
     - `"Mural Spark — Painted %s Motif"` — `bursts.BURST_TEXT.mural_motif.title` (`%s` receives motif ID `'sun'`/`'wave'`/`'rise'` capitalized)
     - `"Palette:\n"` + `capitalize(palette)` — `ending.text.GODOT["mural_stories.gd"].present.paletteLabel` (`ending/mural.js:65` concatenates raw capitalized English ID `"Garden"` / `"Sunset"` / `"Ocean"`!)
   - **Languages affected:** `es`, `vi`, `ar`, `th`
   - **Why:** `capitalize('garden')` bypasses `source.json` and outputs English `"Garden"`, `"Sunset"`, `"Ocean"` inside translated Spanish, Vietnamese, Arabic, and Thai UI!
   - **Concrete fix:** Create an explicit `MURAL_PALETTE_LABELS` table (`{ garden: 'Garden', sunset: 'Sunset', ocean: 'Ocean' }`) and `MURAL_SHORT_MOTIF_LABELS` table registered in `scripts/i18n.mjs`, and pass `t(MURAL_PALETTE_LABELS[palette])` into whole-phrase templates (`"Palette: %s"`, `"%s Palette"`).

---

### 1C. Broken `+` Sentence Concatenation Chains Across `i18n/source.json` (228 Fragment `msgid`s)

Concatenating sentence fragments with `+` locks translations into English SVO word order, English preposition placement, English singular/plural verbs, and English Saxon genitives (`'s`). Below is the exhaustive inventory of concatenated fragment `msgid`s in `i18n/source.json`, grouped by module.

#### 1C-1. Orbital Commons Multi-Speaker Paragraph Stitching (`ending/orbital.js` — 35 fragment `msgid`s)
- **Exact `msgid`s & `paths`:**
  - `"\nThanh: Our "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.thanh`
  - `" invitation was never a finish line. You brought us together around "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.never`
  - `". We made time for one another.\nCeleste: Our "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.gatheredTail`
  - `" shapes belong to all of us. You left the "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.shapes`
  - `" open in our room, so the picture never has to be the whole story.\nDez: We framed "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.open`
  - `". Our plan was: "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.plan`
  - `". We brought the way we looked, not just the things we saw. "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.looked`
  - `" make room for a neighbor to pause and be heard.\nBea: This "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.pause`
  - `". Leave a place open for the next person."` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.tail`
  - `"A little later, everyone has gathered by "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.gathered`
  - `"Walk to "` — `ending.text.GODOT["orbital_commons.gd"].setup.walk`
  - `"Walking to "` — `ending.text.GODOT["orbital_commons.gd"].walk_to.walking`
  - `". Stop or focus the reading panel to pause. Arrival does not invite anyone."` — `ending.text.GODOT["orbital_commons.gd"].walk_to.walkingTail`
  - `"You are by "` — `ending.text.GODOT["orbital_commons.gd"].walk_to.here`
  - `". Invite Thanh when you want to share this view."` — `ending.text.GODOT["orbital_commons.gd"].walk_to.hereTail`
  - `"You reached "` — `ending.text.GODOT["orbital_commons.gd"]._process.reached`
  - `". Invite Thanh to share this view, or walk somewhere else."` — `ending.text.GODOT["orbital_commons.gd"]._process.reachedTail`
  - `"Thanh: I will join you by "` — `ending.text.GODOT["orbital_commons.gd"].invite_thanh.join`
  - `". You chose what to share; we can take our time."` — `ending.text.GODOT["orbital_commons.gd"].invite_thanh.joinTail`
  - `" colors and arrangement; nothing has been repainted."` — `ending.text.GODOT["orbital_commons.gd"].response.artTail`
  - `"Thanh: You brought me to our film. I can follow its three pictures at my own pace. Dez: Our copied film ends on "` — `ending.text.GODOT["orbital_commons.gd"].response.film`
  - `", with its original order and framing. "` — `ending.text.GODOT["orbital_commons.gd"].response.filmTail`
  - `"Thanh: You chose a place to pause together: "` — `ending.text.GODOT["orbital_commons.gd"].response.seats`
  - `". Our "` — `ending.text.GODOT["orbital_commons.gd"].response.seatsMid`
  - `" Listening Hour has room for another neighbor. Bea: We keep the invitation open. Gather here is a separate choice when you are ready."` — `ending.text.GODOT["orbital_commons.gd"].response.seatsTail`
  - `"Bea folds our "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.return0`
  - `" paper after the gathering by "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.return0Mid`
  - `". Celeste, Dez and Thanh leave an open place aboard the imagined neighborhood. We are taking the welcome home, not packing away that new home."` — `ending.text.GODOT["orbital_commons.gd"].finale_text.return0Tail`
  - `"Celeste's six original shapes keep their "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.recapArt`
  - `" palette. The room's open place was "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.recapArtMid`
  - `"Dez's three pictures remain in order: "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.recapFilm`
  - `"Thanh's copied seats: "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.recapSeats`
  - `". Listening Hour: "` — `ending.text.GODOT["orbital_commons.gd"].finale_text.recapSeatsMid`
  - `"\nBea's copied invitation: "` — `ending.text.GODOT["orbital_commons.gd"].refresh.invitation`
  - `"Return home | Still panel "` + `" of 3\n"` — `ending.text.GODOT["orbital_commons.gd"].finale_text.returnHome`, `.of3`
  - `"\nYou: "` / `"\nYour response: "` / `"Tenderloin to the Stars | "` / `"Memories of this visit | "` — `orbital_commons.gd.finale_text.you`, `.response`, `refresh.heading`, `finale_text.memories`
- **Languages affected:** `es`, `vi`, `ar`, `th`
- **Why:** Pre-nominal English noun modifiers (`"Our " + invitationTitle + " invitation"`, `"Our " + palette + " shapes"`, `"our " + topic + " Listening Hour"`, `"our " + invitationTitle + " paper"`) are **head-final**, whereas **`es`**, **`vi`**, **`ar`**, and **`th`** are **head-initial** (head noun MUST precede the modifier: `es` `"Nuestra invitación «...»"`, `"Nuestras figuras de tonos..."`; `vi` `"Lời mời ... của tụi mình"`, `"Các hình khối màu ... của tụi mình"`; `ar` `"دعوتنا ..."` / `"أشكالنا ذات ألوان ..."`; `th` `"คำชวนเรื่อง...ของเรา"`, `"รูปทรงโทนสี...ของเรา"`). Furthermore, `"You left the " + spare + " open"` splits the article `"the "` and adjective `" open"` across two fragments, making Spanish/Arabic gender agreement (`la entrada abierta` vs `el rincón lateral abierto`; `تركتَ المدخلَ مفتوحاً` vs `تركتِ النافذةَ مفتوحةً`) impossible. And `seats + " and " + format + " make room..."` relies on unextracted `" and "` plus plural English verb `"make"`.
- **Concrete fix:** Replace each stitched multi-fragment assembly with one complete per-speaker sentence template using named placeholders (`"Thanh: Our \"{invitation}\" invitation was never a finish line. You brought us together around {order}."`, `"Celeste: Our {palette} shapes belong to all of us. You left {openPlace} open in our room, so the picture never has to be the whole story."`, etc.).

#### 1C-2. Dog Story Saxon Genitive `'s` & Sighting Stitching (`visits/dogs.js` — 14 fragment `msgid`s)
- **Exact `msgid`s & `paths`:**
  - `"This is "` — `visits.dogs.TEXT.match_dog.differs`, `visits.text.GODOT_TEXT["dog_story.gd"].match_dog.differs`
  - `". That differs from "` — `visits.dogs.TEXT.match_dog.differs2`, `visits.text.GODOT_TEXT["dog_story.gd"].match_dog.differs2`
  - `"'s note. Try the other profile; there is no penalty."` — `visits.dogs.TEXT.match_dog.differs3`, `visits.text.GODOT_TEXT["dog_story.gd"].match_dog.differs3`
  - `"You chose "` — `visits.dogs.TEXT.choose_lead.chose`, `visits.text.GODOT_TEXT["dog_story.gd"].choose_lead.chose`
  - `" from the notes. Walk there to look; a lead is not a confirmed sighting."` — `visits.dogs.TEXT.choose_lead.choseTail`, `visits.text.GODOT_TEXT["dog_story.gd"].choose_lead.choseTail`
  - `" matched by ears and tag, not color alone. The fictional owner has your sighting. "` — `visits.dogs.TEXT.match_dog.matched`, `visits.text.GODOT_TEXT["dog_story.gd"].match_dog.matched`
  - `" is already matched. Find the other dog, then meet both owners at the gathering."` — `visits.dogs.TEXT.match_dog.already`, `visits.text.GODOT_TEXT["dog_story.gd"].match_dog.already`
  - `"Your selected lead: "` — `visits.dogs.TEXT.refresh.lead`, `visits.text.GODOT_TEXT["dog_story.gd"].refresh.lead`
  - `"Observed here: "` — `visits.dogs.TEXT.refresh.observed`, `visits.text.GODOT_TEXT["dog_story.gd"].refresh.observed`
  - `". Compare with the selected profile, then Match dog."` — `visits.dogs.TEXT.refresh.compare`, `visits.text.GODOT_TEXT["dog_story.gd"].refresh.compare`
  - `"Two Dogs Home: "` — `visits.dogs.TEXT.objective.prefix`, `visits.text.GODOT_TEXT["dog_story.gd"].objective.prefix`
  - `" | Reunited!"` — `visits.dogs.TEXT.refresh.headingWon`, `visits.text.GODOT_TEXT["dog_story.gd"].refresh.headingWon`
  - `". Independent soundtrack."` — `visits.dogs.TEXT.refresh.soundtrack`, `visits.power.TEXT._process.soundtrack`, `dog_story.gd.refresh.soundtrack`, `power_story.gd._process.soundtrack`
- **Languages affected:** `es`, `vi`, `ar`, `th`
- **Why:** `NAMES[profile] + "'s note..."` hardcodes the English enclitic possessive `'s` after the dog's name (`Pippin` / `Junebug`). **`es`**, **`vi`**, **`ar`**, and **`th`** all express possession in the opposite order (`es` `"la nota sobre Pippin"`, `vi` `"ghi chú về Pippin"`, `ar` `"ملاحظة بيبين"`, `th` `"บันทึกของพิพพิน"`). It cannot be translated when `NAMES[profile]` is prepended before `"'s note"`.
- **Concrete fix:** Merge into whole-sentence templates: `"This is {description}. That differs from the note for {dog}. Try the other profile; there is no penalty."`, `"You chose {lead} from the notes. Walk there to look; a lead is not a confirmed sighting."`, `"{dog} matched by ears and tag, not color alone. The fictional owner has your sighting."`, `"{dog} is already matched. Find the other dog, then meet both owners at the gathering."`.

#### 1C-3. Election Walk Pin, Address & Source Concatenations (`visits/election.js` — 14 fragment `msgid`s)
- **Exact `msgid`s & `paths`:**
  - `"Observe "` — `visits.election.TEXT.objective.observe`, `visits.text.GODOT_TEXT["voting_story.gd"].objective.observe`
  - `"Selected "` — `visits.election.TEXT.choose.selected`, `visits.text.GODOT_TEXT["voting_story.gd"].choose.selected`
  - `"Recorded "` — `visits.election.TEXT.record_site.recorded`, `visits.text.GODOT_TEXT["voting_story.gd"].record_site.recorded`
  - `" from the October 3 published list. This outdoor stop is not its doorway."` — `visits.election.TEXT.record_site.list`, `visits.text.GODOT_TEXT["voting_story.gd"].record_site.list`
  - `" Both records found! Choose Make map."` — `visits.election.TEXT.record_site.both`, `visits.text.GODOT_TEXT["voting_story.gd"].record_site.both`
  - `"Placed "` — `visits.election.TEXT.place_label.placed`, `visits.text.GODOT_TEXT["voting_story.gd"].place_label.placed`
  - `" on its city address pin."` — `visits.election.TEXT.place_label.onPin`, `visits.text.GODOT_TEXT["voting_story.gd"].place_label.onPin`
  - `" Both labels fit! Return to Bea and Share your original map."` — `visits.election.TEXT.place_label.fit`, `visits.text.GODOT_TEXT["voting_story.gd"].place_label.fit`
  - `"That pin belongs to "` — `visits.election.TEXT.place_label.belongs`, `visits.text.GODOT_TEXT["voting_story.gd"].place_label.belongs`
  - `". Your selected label is "` — `visits.election.TEXT.place_label.selected`, `visits.text.GODOT_TEXT["voting_story.gd"].place_label.selected`
  - `". Choose its matching pin; nothing was lost."` — `visits.election.TEXT.place_label.nothing`, `visits.text.GODOT_TEXT["voting_story.gd"].place_label.nothing`
  - `"HISTORICAL: November 5, 2024 consolidated election, including Mayor. Two entries from the City's October 3 published list; later relocations unverified.\nSELECTED: "` — `visits.election.TEXT.source_text.head`, `voting_story.gd.source_text.head`
  - `". City EAS "` — `visits.election.TEXT.source_text.eas`, `voting_story.gd.source_text.eas`
  - `" address pin, not a surveyed entrance or room..."` — `visits.election.TEXT.source_text.tail`, `voting_story.gd.source_text.tail`
  - `"Election Walk 2024 | "` / `"Election Walk: "` — `visits.election.TEXT.refresh.heading`, `objective.prefix`
- **Languages affected:** `es`, `vi`, `ar`, `th`
- **Why:** `"Placed " + label + " on its city address pin."`, `"Recorded " + site + " from the October 3 published list."`, and `". City EAS " + eas + " address pin..."` split verb, direct object, and prepositional complement (and in `. City EAS ` + number + ` address pin`, split a noun phrase around an ID number where `es` `"pin de dirección de City EAS {eas}"`, `vi` `"ghim địa chỉ City EAS {eas}"`, `ar` `"دبوس عنوان City EAS رقم {eas}"`, `th` `"หมุดที่อยู่ City EAS {eas}"` put `"address pin"` *before* `"City EAS {eas}"`!). Also `"Selected "` and `"Placed "` are subjectless past-participle ellipses that require active 2nd-person or passive verb agreement in `es` (`Seleccionaste {site}` / `Se colocó la etiqueta {label}`) and `ar`.
- **Concrete fix:** Replace all 5 concatenation chains with whole-sentence templates (`"Observe {site}"`, `"Selected {site}."`, `"Recorded {site} from the October 3 published list. This outdoor stop is not its doorway."`, `"Placed {label} on its city address pin."`, `"That pin belongs to {pinSite}. Your selected label is {selectedSite}. Choose its matching pin; nothing was lost."`, `"...SELECTED: {site}, {address}, {room}. City address pin (EAS {eas}), not a surveyed entrance or room..."`).

#### 1C-4. Power Story Plural Verb & Clue Concatenations (`visits/power.js` — 6 fragment `msgid`s)
- **Exact `msgid`s & `paths`:**
  - `" has a clue for "` — `visits.power.TEXT.objective.clue`, `visits.text.GODOT_TEXT["power_story.gd"].objective.clue`
  - `": \"There it is! "` — `visits.power.TEXT.check_path.there`, `visits.text.GODOT_TEXT["power_story.gd"].check_path.there`
  - `" are back. You made the connection.\""` — `visits.power.TEXT.check_path.backOn`, `visits.text.GODOT_TEXT["power_story.gd"].check_path.backOn`
  - `" OK"` — `visits.power.TEXT.refresh.ok`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.ok`
  - `"April 21, 2017 inspired fiction | "` — `visits.power.TEXT.refresh.inspired`, `visits.text.GODOT_TEXT["power_story.gd"].refresh.inspired`
  - `"Choose Power Story to walk to and connect the next fictional light kit. "` — `visits.power.TEXT.objective.hint`, `visits.text.GODOT_TEXT["power_story.gd"].objective.hint`
- **Languages affected:** `es`, `vi`, `ar`, `th`
- **Why:** `VOICES[st] + ": \"There it is! " + NAMES[st] + " are back. You made the connection.\""` hardcodes plural `" are back"` even though `NAMES` contains both plural `"Welcome lights"` AND singular `"Larkin / Eddy battery light"`, `"Tea kettle lamp"`, and `"Music stand light"` (grammatically broken even in English: `"Tea kettle lamp are back"`!). In **`es`** (`"¡Volvió la lámpara...!"` sg. fem. vs `"¡Volvieron las luces...!"` pl. fem.) and **`ar`** (`"عادت إضاءة..."` fem. sg. vs `"عاد مصباح..."` masc. sg. + `وصلتَ`/`وصلتِ` player gender), the verb MUST agree in gender and number with the light name AND precede or match the subject.
- **Concrete fix:** Replace `there` + `NAMES[st]` + `backOn` with 4 complete speaker-attributed lines (one per station, or a select/template per light kit), and replace `VOICES[st] + " has a clue for " + phaseName` with `"{neighbor} has a clue for {relay}"`.

#### 1C-5. Action Buttons, Rhythm Circle, Audio Sketch, Mural, Studio, Civic & Side-Story Concatenations (90+ remaining fragment `msgid`s)
- **Exact `msgid`s & `paths`:**
  - **Loan Return Buttons (`characters.js:272-273`):** `"Return "` (`characters.ACTION_LABELS.return`), `"Returned "` (`characters.ACTION_LABELS.returned`) concatenated with `LOAN_TITLES` (`"Thanh's folding table"`, `"Celeste's paint case"`, `"Rook's speaker"`). In **`es`** (`"Devuelta: la mesa plegable de Thanh"` fem. vs `"Devuelto: el altavoz de Rook"` masc.) and **`ar`** (`"أُعيدت طاولة ثانه"` fem. vs `"أُعيد مكبّر صوت روك"` masc.), `"Returned "` inflects for the object's grammatical gender! **Fix:** Replace with `"Return %s"` and gender-neutral `"Returned: %s"` (or 3 per-item `returnedTable`/`returnedPaintCase`/`returnedSpeaker` keys).
  - **Rhythm & Music Controls (`rhythm.js`, `sketch-core.js`, `ending/mural.js`):**
    - `"Music\n"` (`rhythm.RHYTHM_TEXT.musicLabel`) + `"On"` / `"Off"` (`rhythm.RHYTHM_TEXT.on`/`.off`)
    - `"Music:\n"` (`ending.text.GODOT["mural_stories.gd"].present.musicLabel`) + `"On"` / `"Off"` (`mural_stories.gd.present.on`/`.off`)
    - `"Palette:\n"` (`ending.text.GODOT["mural_stories.gd"].present.paletteLabel`)
    - `"Dez's Rhythm Circle - "` (`rhythm.RHYTHM_TEXT.headingMode`) + `"Practice"` / `"Hosting"`
    - `"Local: "` (`sketch-core.MUSIC_TEXT.localTag`) + track name (duplicate of `"Local: %s"` in `characters.PANEL_TEXT.local`!)
    - `"80 BPM Sketch"` + `" (" + stemSummary + ")"` (`sketch-core.js`)
    - `"Rhythm Circle. "` (`rhythm.RHYTHM_TEXT.openAnnounce`) + `" Play Bar optionally auditions..."` (`openAnnounceTail`) / `" Play Bar: one original drum bar..."` (`sketchTail`) / `" Local track: %s..."` (`localTail`)
    - `"Back to the block. "` (`rhythm.RHYTHM_TEXT.closeHosting`, shared across 5 paths) + `" Return when ready to complete it."` (`closeHostingTail`)
    - **Fix:** Replace `"Music\n"` + `"On"`/`"Off"` with atomic `"Music: On"` / `"Music: Off"` (matching `"Step cues\nOff"` / `"Step cues: On"`), `"Dez's Rhythm Circle — Practice"` / `"Dez's Rhythm Circle — Hosting"`, and `"Palette: %s"`.
  - **Mural Scenes & Celeste Composition (`ending/mural.js`, `characters.js`):**
    - `" is on your brush. Touch the left or right half to paint; a second placement moves it."` (`ending.text.GODOT["mural_stories.gd"].select_scene.brush`)
    - `". Choose a half of the paper to paint or move this scene."` (`ending.text.GODOT["mural_stories.gd"].setup.tooltip`)
    - `" Celeste: "` (`ending.text.GODOT["main.gd"].edit_mural_scene.celeste`, `mural_stories.gd.present.celeste`)
    - `" My Rise opens the scene on the left."`, `" My Rise carries it to the right."`, `" My Rise links the shapes together."`, `" Three neighbors' ideas, arranged your way. Choose Compose Mural, then Paint Scenes for food, music, art or gardening."`, `". You made room for everyday creativity."` (`characters.COMPOSITION.*`)
    - `" That painted guitar leaves room for a quiet song, too."`, `" Two pairs of hands tending that painted planter. Growing something takes neighbors, too."` (`characters.MURAL_REPLY.*`)
    - `"Choose any two of five scenes. "`, `" Making Music is a silent illustration; Music controls the soundtrack separately."`, `" Story scenes sit under the original marks on the street board. Your earlier keepsake stays as it was."`, `"Back to Mural Workshop. "` (`mural_stories.gd`, `mural_workshop.gd`)
    - **Fix:** Turn `" is on your brush..."` into `"{scene} is on your brush..."`, tooltip into `"{scene}. Choose a half of the paper..."`, and trim leading spaces from sentence-level `COMPOSITION` / `MURAL_REPLY` entries, joining sentences with locale-aware spacing in JS.
  - **Habitat Room, Helper Bench, Programme Studio/Gathering, Film Screening, Civic Listening & Hosted Afternoon (`ending/*.js`, `hosted-text.js`):**
    - `"Detail of "` (`habitat_room.gd.refresh.detailOf`), `"\nSelected: "` (`habitat_room.gd.refresh.selected`), `". View detail enlarges the selected copy; it does not place it."` (`habitat_room.gd.refresh.selectedTail`), `"\nOpen place: "` (`departure_text.open`), `"Bea's copied title: "` (`departure_text.title`), `"Bea: All three links belong together. My folded invitation keeps the middle open: "` (`departure_text.all`), `". Choose Ready together when you want to gather."` (`departure_text.allTail`), `"%d of 3 copies placed. "` (`description.placed`), `". The central passage stays clear."` (`description.tail`), `". %d of 3 links fitted. "` (`departure_text.links`), `" | Copies | This visit only"` (`refresh.credit`), `"Open-place frame. "` (`refresh.frame`), `"Ready together. "` (`departure_text.ready2`), `"Room model. "` (`refresh.roomModel`), `"Room welcomed. "` (`description.welcomed`).
    - `"Invite "` (`programme_gathering.gd.refresh.invite` + `OWNERS[i]` — in `vi` `"Mời cô Bea"` vs `"Mời Dez"` requires `"cô"` before Bea!), `"Gather again | "` (`programme_gathering.gd.refresh.heading`), `"Back to Posted. "` + `" keeps this visit's copied order..."` (`programme_gathering.gd.back_to_studio.back`/`.tail` — subject `"Gather again"` is inserted *between* `"Back to Posted. "` and `" keeps..."`!), `"Your gathering stays this visit. Open Programme Studio, Posted, then "` + `". Reload clears this visit..."` (`programme_studio.gd.close_studio.gathering`/`.gatheringTail`), `"Programme Studio | "` (`programme_studio.gd.refresh.heading`), `"\nCopied order: "` (`programme_gathering.gd.description.order`, `programme_studio.gd.description.copiedOrder`), `"\nPicture: "` + `". Draft and Posted keep..."` (`programme_studio.gd.description.picture`/`.pictureTail`).
    - `" Follow takes you to '"` + buttonName + `"'; choose that action when you are ready..."` (`civic_listening.gd.refresh.follow`/`.followTail`), `"Dez's invitation: "` + `". Choose this film action when you are ready; your film is unchanged."` (`civic_listening.gd.follow_invitation.invitation`/`.tail`), `"Authored shared request (not sent; no names or testimony collected): "` (`civic_listening.gd.request_text.themes`), `"\nRemembered turn:\n"` (`civic_listening.gd.refresh.remembered`).
    - `", selected"` (`film_screening.gd.refresh.selected`), `", with no people pictured"` (`film_screening.gd.description.close`), `" and Celeste and Dez's volunteered fictional hands"` (`film_screening.gd.description.wide` — injected into `"%s. Original illustrated props%s."`!).
    - `"Copied invitation: "` (`hosted_afternoon.gd.detail.storiesResult`), `"Copied seating: "` (`detail.pauseResult`), `" · Next: "` (`main.gd.host_complete_current.next`), `" — Second Afternoon Complete!"` (`host_complete_current.last`), `" — The Open Seat Complete!"` (`main.gd.film_capture_shot.complete`), `" Choose the invitation..."` (`bea_invitation.gd.update_choices.hub`), `" Choose the seats..."` (`quiet_seats.gd.update_ui.hub`), `" That is just my example..."` (`bea_invitation.gd.explanation.close`), `". Two fictional visitors can sit together..."` (`quiet_seats.gd.explanation.close`).
  - **Cook & Share, Story Picker, Lantern Procession & Before These Streets (`visits/*.js`):**
    - `" Follow this invitation visits "` (`visits.meal.TEXT.refresh.follow`) + cookName + `". Your shared dish..."` — ungrammatical concatenation in `es`, `vi`, `ar`, `th` where `"Follow this invitation"` is a quoted UI button name (`es` `"«Seguir esta invitación» visita a {cook}."`).
    - `"Next revealed cook. Current: "` / `"Previous revealed cook. Current: "` (`visits.meal.TEXT.refresh.nextName`/`.previousName`), `"Original illustration: "` + shape + `". Preparation %d/5. %s."` (`visits.meal.TEXT.art_description.prefix`/`.template`), `". Keep exploring retains it."` (`visits.meal.TEXT.refresh.retains`).
    - `"Completed this visit: "` (`visits.picker.TEXT.refresh.completed`), `". Progress for this visit only."` (`entrySuffix`), `"Your story visits. "` (`open_picker.announce`).
    - `"Lantern Procession | "` (`visits.lantern.TEXT.refresh.heading`), `"Lantern Procession: "` (`objective.prefix`), `"\nOriginal fictional Halloween procession on the modeled Turk block. "` (`refresh.route`).
    - `"Before These Streets. "` (`visits.before-streets.TEXT.refresh.announce`), `" Back to your existing chapter..."` (`close_opening.closed`).
    - `" · Keepsake: %s"` (`visits.text.GODOT_TEXT["main.gd"].inspect_neighborhood_surprise.keepsake`).
  - **Concrete fix across 1C-5:** Convert every prefix/mid/suffix fragment pair into a complete `%s` / `{named}` sentence template (`"Detail of {item}"`, `"{button} takes you to \"{target}\"; choose that action when you are ready."`, `"\"Follow this invitation\" visits {cook}."`, `"Original illustration: {shape}. Preparation {step}/5. {detail}."`, and split `"%s. Original illustrated props%s."` into two clean whole sentences: `"%s. Original illustrated props, with no people pictured."` vs `"%s. Original illustrated props and Celeste and Dez's volunteered fictional hands."`). Strip leading/trailing spaces and `\n` padding out of `msgid`s into layout/join helpers.

---

## 2. Source & Extractor Defects, Missing Extracted Strings & Tag Noise (Category 8 — Severity: Critical)

### 2A. Extractor Bug 1 — `SKIP_KEYS` Silently Drops 8 Distinct Player-Facing English Strings (`scripts/i18n.mjs:83, 127`)

- **Defect:** `SKIP_KEYS` contains `'art'`, `'kind'`, and `'cue'`. When `walk()` traverses registered text tables, `if (SKIP_KEYS.has(key) && typeof item === 'string') continue;` discards **every object property named `art`, `kind`, or `cue`**, even inside pure localization dialogue/label objects!
- **Exact player-facing English strings completely missing from `i18n/source.json` (`inSrc: false`):**
  1. `"the six copied shapes and palette, unchanged by future revisions"` — `ending.text.GODOT["programme_studio.gd"].hosted_picture_description.art`
  2. `"Celeste: These are our original six shapes in %s colors, in their original arrangement."` — `ending.text.GODOT["programme_gathering.gd"].contribution.art`
  3. `"Thanh: You brought me to Celeste's six shapes. We can look at the spaces between them together. Celeste: These are our original "` — `ending.text.GODOT["orbital_commons.gd"].response.art`
  4. `"Celeste: I'll set our original six shapes where everyone can see them."` — `ending.text.GODOT_CONSTS["programme_gathering.gd"].OPENINGS.art`
  5. `"Eatery"` — `visits.landmarks.EATERIES[0,1,3,5].kind`, `visits.text.GODOT_CONSTANTS["main.gd"].NEIGHBORHOOD_EATERIES[0,1,3,5].kind` (displayed to players via `landmarks.js:68` `"%s — %s (fictional)"`!)
  6. `"Bar & Lounge"` — `visits.landmarks.EATERIES[2].kind`, `NEIGHBORHOOD_EATERIES[2].kind` (displayed via `"%s — %s (fictional)"`!)
  7. `"Corner Bar"` — `visits.landmarks.EATERIES[4].kind`, `NEIGHBORHOOD_EATERIES[4].kind` (displayed via `"%s — %s (fictional)"`!)
  8. `"All %d session stops"` — `visits.text.GODOT_TEXT["main.gd"].update_landmark_tour_completion.cue`
  *(Note: `story.PROGRAMME_TITLES.art` `"Shared art panel"` and `main.gd.film_capture_shot.cue` `"The Open Seat 3/3"` were also skipped at those paths and survived only by coincidence via other tables.)*
- **Languages affected:** `es`, `vi`, `ar`, `th` (all 8 strings will render in raw untranslated English in every locale!)
- **Concrete fix:** Remove `'art'`, `'kind'`, `'cue'`, `'palette'`, `'shape'`, and `'slot'` from global `SKIP_KEYS` in `scripts/i18n.mjs:83` (scope non-text key skipping only to sprite/geometry tables, or rely on `isHumanText()` + `EXCLUDED`).

### 2B. Extractor Bug 2 — `isHumanText()` Rejects Every Single-Word Lowercase English Word (`scripts/i18n.mjs:92`)

- **Defect:** Line 92 `if (/^[a-z][\w$.:\-/]*$/.test(s)) return false;` treats **any single lowercase English word** (even after `.trim()`) as a code identifier and drops it from `i18n/source.json`.
- **Exact player-facing lowercase strings missing from `i18n/source.json` (`inSrc: false`):**
  1. `"fitted"` & `"empty"` — `ending.text.GODOT["helper_bench.gd"].description.fitted`, `.empty` (formatted directly into `"%s jig: left support %s; right support %s. %s"`!)
  2. `" for "`, `" placed"`, `" unplaced"` — `ending.text.GODOT["habitat_room.gd"].refresh.for`, `.placedName`, `.unplacedName` (concatenated into habitat room screen-reader/button state!)
  3. `" and "` — `ending.text.GODOT["orbital_commons.gd"].acknowledgments.and`
  4. `"first"`, `"second"`, `"third"`, `"fourth"` — `ending.text.GODOT_CONSTS["hosted_afternoon.gd"].POSITIONS[0..3]` (formatted directly into `"%s was %s in the afternoon we hosted."`!)
  5. `"left"`, `"right"` — `ending.text.GODOT_CONSTS["mural_stories.gd"].SLOTS[0..1]` (formatted directly into `"%s on the %s"`, `"%s painted on the %s."`, `"%s is already on the %s."`, `"Lifted the %s scene."`!)
  6. `"garden"`, `"sunset"`, `"ocean"` — `ending.text.GODOT_CONSTS["main.gd"].MURAL_PALETTES[0..2]` (formatted directly into `"Copied panel: %s colors..."`, `"Celeste: Our six shapes are by %s, in their original %s colors."`!)
  7. `"hit"`, `"rest"` — `rhythm.RHYTHM_TEXT.hit`, `.rest` (formatted directly into `"Step %d, %s"` and `"Step %d: %s. %s"`!)
  8. `"restored"` — `visits.power.TEXT.refresh.restoredWord`, `power_story.gd.refresh.restoredWord` (formatted directly into `"Relay %d: %s, %s"`!)
  9. `"present"` — `visits.text.GODOT_TEXT["main.gd"].inspect_tenderloin_museum_hub.era0`
  10. Plus raw lowercase direction & stem words formatted into templates outside registered tables: compass directions `'east'`, `'northeast'`, `'north'`, `'northwest'`, `'west'`, `'southwest'`, `'south'`, `'southeast'` + `'nearby'` in `story.js` (`"about %d blocks %s"`, `"%s is %s"`), and audio stem names `'bass'`, `'brush'`, `'chords'`, `'lead'`, `'silence'` in `sketch-core.js` (`"%s (%d/%d stems)"`).
- **Languages affected:** `es`, `vi`, `ar`, `th` (leaves raw English words embedded mid-sentence in every translation!)
- **Concrete fix:** Allow single-word lowercase human text in explicit text tables (move true ID arrays like `IDS`, `ITEMS`, `PLACES`, `PAGES`, `owner`, `neighbor` into `EXCLUDED` or `SKIP_KEYS`), and replace raw stem/direction/ordinal/slot words with explicit localized lookup tables or whole phrases.

### 2C. Extractor Bug 3 — `lengthClass()` Never Emits `"chip"` & Inline Duplicate Array in `ending/ui.js`

1. **`lengthClass()` broken `world.js` prefix check (`scripts/i18n.mjs:114, 150`):**
   - `extract()` strips `.js` at line 150 (`const base = module.replace(/\.js$/, '')` → `'world.NEIGHBORS[0].name'`), while line 114 checks `if (paths.every(p => p.startsWith('world.js'))) return 'chip';`. Result: **0 out of 1,488 entries** receive `length: "chip"` (`world.PLACES[3].name` `"A corner with a history"` is misclassified as `"sentence"`, and `world.NEIGHBORS[2].role` `"Good ears. Better stories."` is misclassified as `"paragraph"`!), disabling chip-length budget checks in `scripts/i18n.mjs check`.
   - **Concrete fix:** Change `p.startsWith('world.js')` to `p.startsWith('world.')`.
2. **Bypassed inline English array in `browser-next/ending/ui.js:160`:**
   - `['Entry', 'Window', 'Far wall', 'Side nook'][i]` is re-hardcoded inline without `t()` instead of importing `NAMES` from `ending/habitat.js`.
   - **Concrete fix:** Import `NAMES` from `./habitat.js` and wrap in `t(NAMES[i])`.

### 2D. Typos, Missing Accents, Stray Spaces, Apostrophe Duplicates & Shortcut Inconsistencies in `i18n/source.json`

1. **Typo `"of5"` (missing space):**
   - **Exact `msgid`:** `"Step %d of5: %s. %s"`
   - **Paths:** `visits.meal.TEXT.refresh.cueStep`, `visits.text.GODOT_TEXT["shared_meal.gd"].refresh.cueStep`
   - **Affects:** `es`, `vi`, `ar`, `th` (and English screen readers, which read `"of five"` as `"of5"`).
   - **Fix:** Fix English source to `"Step %d of 5: %s. %s"` (or add to D14 defect list if Godot strings stay frozen, with translator note).

2. **Missing Spanish tilde in `"jalapeno"` (inconsistent within same eatery):**
   - **Exact `msgid`:** `"Pickled daikon, carrot, jalapeno, cilantro. And a condensed-milk iced coffee."`
   - **Paths:** `visits.landmarks.EATERY_HOST_LINES.morning_star_banh_mi[1]`, `visits.text.GODOT_CONSTANTS["main.gd"].EATERY_HOST_LINES.morning_star_banh_mi[1]`
   - **Affects:** `es` (and English consistency — `visits.landmarks.EATERIES[3].specialty` two lines earlier spells it `"jalapeño"`).
   - **Fix:** Fix English `"jalapeno"` → `"jalapeño"`.

3. **Stray space before period after URL:**
   - **Exact `msgid`:** `"REAL SERVICE REFERENCE, checked October 22, 2026: San Francisco Animal Care & Control, 1419 Bryant Street at Alameda. OUTSIDE this Tenderloin play area. https://www.sfanimalcare.org/lost-found-pets/report-a-lost-pet/ . Check its official page for current information. No report is sent and no partnership or agency intake is simulated. These dogs, owners and sightings are fiction. Choose SFACC info again to return to the notes."`
   - **Paths:** `visits.dogs.TEXT.refresh.info`, `visits.text.GODOT_TEXT["dog_story.gd"].refresh.info`
   - **Affects:** `es`, `vi`, `ar`, `th` (especially **`ar`** RTL bidi, where `https://.../ .` places a neutral space+period adjacent to an LTR URL inside an RTL paragraph, causing visual period jumping across the URL!).
   - **Fix:** Wrap the URL in parentheses or place it on its own line without `" ."` (`"\nhttps://www.sfanimalcare.org/lost-found-pets/report-a-lost-pet/\n"` as `before-streets.SOURCES` already does), and isolate URLs in `<bdi>` / `dir="ltr"` in `ar`.

4. **Duplicate `msgid`s differing only by straight apostrophe `'` (`U+0027`) vs curly apostrophe `’` (`U+2019`) (6 `msgid`s):**
   - **Exact `msgid` pairs & `paths`:**
     - `"Celeste's paint case"` (`story.LOAN_TITLES["paint-case"]`) vs `"Celeste’s paint case"` (`core.LOANS[1].label`)
     - `"Rook's speaker"` (`story.LOAN_TITLES.speaker`) vs `"Rook’s speaker"` (`core.LOANS[2].label`)
     - `"Thanh's folding table"` (`story.LOAN_TITLES.table`) vs `"Thanh’s folding table"` (`core.LOANS[0].label`)
   - **Affects:** `es`, `vi`, `ar`, `th` — Translators must translate identical items twice; any divergence breaks player recognition between the HUD objective (`LOAN_TITLES`) and world/action prompt (`core.LOANS`).
   - **Fix:** Normalize apostrophe style across `core.LOANS` and `story.LOAN_TITLES` so each merges into a single `msgid`.

5. **10 duplicate `msgid` pairs differing only by embedded `\n` vs space (20 `msgid`s):**
   - **Exact `msgid` pairs & `paths`:**
     - `"A pair and\nan open seat"` (`quiet_seats.gd.update_ui.pairs`) vs `"A pair and an open seat"` (`QUIET_TITLES.pairs`, `QUIET_CHOICES.pairs`)
     - `"An open arc\nof seats"` (`quiet_seats.gd.update_ui.arc`) vs `"An open arc of seats"` (`QUIET_TITLES.arc`, `QUIET_CHOICES.arc`)
     - `"A small moment\nyou want to keep"` (`bea_invitation.gd.update_choices.memory`) vs `"A small moment you want to keep"` (`INVITATION_TITLES.memory`, `STORY_CHOICES.memory`)
     - `"Something you hope\nto make together"` (`bea_invitation.gd.update_choices.future`) vs `"Something you hope to make together"` (`INVITATION_TITLES.future`, `STORY_CHOICES.future`)
     - `"Cooking\nTogether"` vs `"Cooking Together"`, `"Growing\nTogether"` vs `"Growing Together"`, `"Making\nMusic"` vs `"Making Music"`, `"Making\nStreet Art"` vs `"Making Street Art"`, `"Sharing\na Bowl"` vs `"Sharing a Bowl"` (`ending.mural.SCENE_LABELS` vs `SCENE_NAMES`)
     - `"Larkin\n2017"` (`visits.power.TEXT.refresh.larkin`) vs `"Larkin 2017"` (`visits.picker.TEXT.remember_completed.larkin`)
   - **Affects:** `es`, `vi`, `ar`, `th` — Risks inconsistent wording for the exact same choice/scene between button and dialogue recap, while forcing unnatural hard line breaks (see Section 6A).
   - **Fix:** Unify on the single-line `msgid` and let CSS `white-space: normal; text-wrap: balance` wrap buttons naturally.

6. **Keyboard shortcut, unit-spacing, and double-space separator inconsistencies (9 `msgid`s):**
   - `"Shift F8"` (missing `+`) in `"Neighborhood Stories: resume F8; switch story visits Shift F8"` (`visits.power.TEXT.setup.storyTip`), `"Other story visits. Keep this visit's progress. Shift F8."` (`visits.picker.TEXT.add_reader_entry.name`), and `"Switch stories without losing this visit's choices... Shift F8 opens these choices."` (`visits.picker.TEXT.refresh.detail`) vs `"Shift+D"`, `"Shift+E"`, `"Shift+M"`, `"Shift+L"` across all other `msgid`s. (In **`ar`** RTL, `"Shift F8"` with a space splits into two separate LTR tokens that reorder around RTL context unless joined as `"Shift+F8"` or wrapped in LTR isolate!)
   - `"scale bar 40m"` (`visits.election.TEXT.source_text.tail`) vs `"scale bar 40 m"` (`visits.power.TEXT.source_text.text`).
   - Double spaces `"  ·  "` in `"Talking with %s (%s · %s · Turn %d/5)  ·  %s  ·  %d/%d Met  ·  Mural %s  ·  Sparks: %d"` (`characters.PANEL_TEXT.header`), `"Talking with Celeste..."` (`celesteHeader`), and `"Talking with Rook..."` (`rookHeader`).
   - **Fix:** Standardize `"Shift+F8"`, `"40 m"`, and single-space `" · "` (or CSS flex gaps).

7. **False-Positive `SENSITIVE` Tags in `scripts/i18n.mjs:101-110` Polluting Review Batches (15 `msgid`s):**
   - **`"save"` false positives (culinary/story verb `"save"` or art `"progress"`):**
     - `"I like these little plates. They leave room to taste what the other cooks brought. Save one for me while I pass the spoons."` (`visits.meal.RECIPES[3].recognition[1]`)
     - `"“I’m skipping photos today. Save me a story instead.”"` (`keepsake.PHOTO_RESPONSES[4].response`)
     - `"You saved the leaves for the end. I can see them through the beef instead of losing them in the pan. Let us carry the platter together."` (`visits.meal.RECIPES[2].recognition[0]`)
     - `"Easel progress: %d/3 motifs · Groove: %s"` (`bursts.BURST_TEXT.mural_motif.detail`)
     - `"Block hosting progress: %d/4 activities"` (`bursts.BURST_TEXT.hosting_segment.detail`)
   - **`"pets"` false positives (ordinary words `"lost"` and `"sighting"`):**
     - `"%s: My link faces our %s by %s. Across is the same row; Along is the same column; Corner is diagonal. Try another side; nothing is lost."` (`ending.text.GODOT["habitat_room.gd"].departure_action.wrong`)
     - `". Choose its matching pin; nothing was lost."` (`visits.election.TEXT.place_label.nothing`)
     - `"Bea: \"Lost? Tap What's Next? any time—or choose Spot Surprise...\""` (`characters.NEIGHBOR_LINES.bea.before[4]`)
     - `"Jeffrey's Lost 1961 Record"` + all 5 `jeffrey_record` lines (`SURPRISES.jeffrey_record.*`, `NEIGHBOR_LINES.dez.*`, `ROOK_LINES.completed[4]`, `SURPRISE_MEMORY.rook.first`)
     - `"Street Legend Sighting"` (`visits.surprises.SURPRISES.viking_dirt_biker.badge`)
   - **`"keys"` false positives (cooking verb `"press"` and diagram `"arrow"`):**
     - `"I am Nura... Come press the base with me; we can talk while our hands are busy."` (`visits.meal.RECIPES[0].welcome`)
     - `"Not connected yet. Trace from the IN arrow through all four elbows to OUT..."` (`visits.power.TEXT.check_path.notYet`)
   - **Fix:** Tighten `SENSITIVE` regexes in `scripts/i18n.mjs:105-109` (require pet context for `lost`/`sighting`, storage context for `save`/`progress`, and keyboard context for `press`/`arrow`).

---

## 3. Placeholders, Positional Order, Pluralization & Grammatical Agreement (Category 3 — Severity: High)

### 3A. Multi-Positional `%s` / `%d` Templates Blocking Word Reordering & Hiding Slot Types (99 `msgid`s)

`i18n/source.json` contains **189** placeholder `msgid`s, all using unindexed C-style `%s`, `%d`, or `%.0f` tokens (`99` of them have **2 to 9 positional slots**). If the runtime formatter does not support `%1$s` / `{named}` indexing, translators **cannot reorder slots** when target grammar requires reversed head-modifier, possessive, or clause order, and translators have zero visibility into what each `%s` represents.

Below are the highest-risk positional templates requiring `{named}` (or `%1$s`) placeholders and explicit slot documentation:

1. **9-slot, 6-slot & 5-slot Conversation HUD Headers:**
   - `"Talking with %s (%s · %s · Turn %d/5)  ·  %s  ·  %d/%d Met  ·  Mural %s  ·  Sparks: %d"` (`characters.PANEL_TEXT.header`) — `%1$s`=neighbor name, `%2$s`=role, `%3$s`=music state (`Playing`/`Paused`), `%4$d`=turn (1–5), `%5$s`=stem summary (`bass+brush (%d/%d stems)`), `%6$d/%7$d`=neighbors met, `%8$s`=mural count (`0/3`), `%9$d`=sparks.
   - `"Talking with Celeste (Mural Artist · %s · Turn %d/5)  ·  Easel: %s (%s Palette)  ·  Sparks: %d"` (`characters.PANEL_TEXT.celesteHeader`) — **`%4$s Palette` fails in `es`, `vi`, `ar`, `th`**, where `"Palette"` MUST precede `%4$s` (`es` `Paleta %4$s`, `vi` `Bảng màu %4$s`, `ar` `لوحة ألوان %4$s`, `th` `พาเลตต์%4$s`).
   - `"Talking with Rook (Sound & Stories · %s · Turn %d/5)  ·  %s  ·  %s  ·  Soundcheck: %s  ·  Sparks: %d"` (`characters.PANEL_TEXT.rookHeader`) — `%1$s`=music state, `%2$d`=turn, `%3$s`=track mode (`80 BPM Sketch` or `Local: filename`), `%4$s`=stems, `%5$s`=soundcheck status (`Ready`/`Pending`), `%6$d`=sparks.
   - **Affects:** `es`, `vi`, `ar`, `th`. **Fix:** Switch to `{named}` placeholders (or split into atomic HUD pills joined by ` · `).

2. **8-slot & 3-slot Power Relay Diagrams:**
   - `"Relay %d: %s. %s: \"%s\"\nIN: %s of connector %d. OUT: %s of connector %d. Connect all four elbows.\n"` (`visits.power.TEXT.refresh.relay`, `power_story.gd.refresh.relay`) — `%1$d`=relay index (1–3), `%2$s`=light kit name, `%3$s`=neighbor name, `%4$s`=spoken clue, `%5$s`=compass direction (`North`/`East`/`South`/`West`), `%6$d`=connector index (1–4), `%7$s`=compass direction, `%8$d`=connector index. (Also `"IN"` and `"OUT"` match untranslated SVG diagram labels — needs translator note whether SVG `"IN"`/`"OUT"` remain Latin DNT or localize!).
   - `"Connector %d now links %s to %s."` (`visits.power.TEXT.rotate.linked`) & `"Turn connector %d: %s to %s"` (`visits.power.TEXT.refresh.pad`) — `%2$s`, `%3$s` are compass directions (`North`, `East`, `South`, `West`).
   - **Affects:** `es`, `vi`, `ar`, `th`. **Fix:** Convert to `{relay}`, `{kit}`, `{speaker}`, `{clue}`, `{inDir}`, `{inConn}`, `{outDir}`, `{outConn}` + add translator note on `"IN"`/`"OUT"` diagram labels.

3. **7-slot & 6-slot Multi-Speaker Finale Blocks:**
   - `"Bea: \"Our invitation is %s. We leave space for someone new.\"\nCeleste: \"Our six shapes keep their %s colors by %s.\"\nDez: \"Our film ends on %s. %s\"\nThanh: \"We keep the %s and our %s Listening Hour. We are ready together.\""` (`ending.text.GODOT["habitat_room.gd"].departure_text.ready`) — `%2$s colors` (`"garden"`/`"sunset"`/`"ocean"`) and `our %7$s Listening Hour` (`"Repairs and staying put"` / `"Room to come and go"`) force English pre-nominal modifier order! In `es`/`vi`/`ar`/`th`, `"colors"` and `"Listening Hour"` precede `%2$s` and `%7$s`.
   - `"Thanh: \"You left the %s open. Our %s has room to pause, and the middle stays clear.\"\nCeleste: \"Our six shapes are by %s, in their original %s colors.\"\nDez: \"Our film is by %s, ending on %s. The originals stay on the block.\""` (`ending.text.GODOT["habitat_room.gd"].refresh.complete`) — `the %1$s open` and `their original %4$s colors` fail head-initial order and gender agreement in `es` and `ar`.
   - `"%s\n%s\n%s | %s\nYour ending is %s. The copied order, framing and production choice are remembered...\nDez: We ended on %s..."` (`ending.text.GODOT["film_screening.gd"].refresh.text`) — 6 opaque `%s` slots (`%1$s`=frame heading, `%2$s`=frame description, `%3$s`=framing label, `%4$s`=plan label, `%5$s`=last shot title, `%6$s`=lowercased last shot title).
   - **Affects:** `es`, `vi`, `ar`, `th`. **Fix:** Split multi-speaker blocks into one `msgid` per speaker with `{named}` placeholders, and move `"colors"` / `"Listening Hour"` head nouns before their modifiers in target templates.

4. **5-slot & 6-slot Directional Surprise Hints (Reordering Required!):**
   - `"Have you spotted %s yet? Look %s at %s (%d/%d surprises found, Shift+D)."` (`visits.text.GODOT_TEXT["main.gd"].ask_whats_next.pair`) — `%1$s`=surprise title, `%2$s`=compass phrase (`"about 2 blocks west"` / `"right here"`), `%3$s`=street location (`"Eddy & Taylor sidewalk"`).
   - `"You found both of my favorite block surprises! Next, check out %s %s at %s (%d/%d found, Shift+D)."` (`visits.text.GODOT_TEXT["main.gd"].ask_whats_next.next`) — `%1$s`=surprise title, `%2$s`=compass phrase, `%3$s`=street location.
   - `"Take your time. Spot the %d neighborhood surprises (%d/%d found, Shift+D)—next is %s (%s at %s)—or try the museum's Time-Portal on Eddy and the eateries along Turk."` (`visits.text.GODOT_TEXT["main.gd"].current_objective.spotHint`)
   - **Affects:** `es`, `vi`, `ar`, `th`. **Why:** In **`vi`**, **`th`**, and often **`es`**/`**ar**`, `"at {street} ({distance})"` is vastly more natural than `"{surprise} {distance} at {street}"` (`vi` `"tại {street}, cách đây khoảng..."`; `th` `"ตรง {street} ห่างไป..."`), which requires swapping `%2$s` and `%3$s`!
   - **Concrete fix:** Replace positional `%s` with `{surprise}`, `{distance}`, `{street}`, `{found}`, `{total}`.

5. **Glued Adjacent Placeholders (`%s%s`) Hiding Punctuation & Optional Clauses (7 `msgid`s):**
   - `"%s%s. %s says: %s"` (`visits.text.GODOT_TEXT["main.gd"].inspect_neighborhood_surprise.announce`) — `%2$s` is either `""` or `" · Keepsake: %s"`!
   - `"%s: \"%s\" · %s%s (Shift+D for next surprise)"` (`inspect_neighborhood_surprise.sub`) — `%1$s`=speaker, `%2$s`=speech, `%3$s`=street, `%4$s`=optional `" · Keepsake: %s"`.
   - `"Frame %d of 3: %s%s"` (`film_screening.gd.refresh.frame`) — `%3$s` is optional `", selected"`.
   - `"Captured %s (%d/3 frames)%s"` (`main.gd.film_capture_shot.summary`) — `%3$s` is `""` or `" — The Open Seat Complete!"`.
   - `"Completed %s (%d/4 hosted)%s"` (`main.gd.host_complete_current.summary`) — `%3$s` is `" · Next: ..."` or `" — Second Afternoon Complete!"`.
   - `"Arrived at %s (%s). Visited %d/5 neighbors.%s"`, `"Arrived at %s (%s). Portable Mural Board %d/3 motifs.%s"`, `"Arrived at %s (%s). %s.%s"` (`characters.CAPTION_TEXT.arrived*`) — trailing `%s` is an optional full sentence with leading space.
   - `"Relay %d%s"` (`visits.power.TEXT.refresh.tab`) — `%2$s` is `""` or `" OK"`.
   - `"Two Dogs Home | %d/2 matched%s"` (`visits.dogs.TEXT.refresh.heading`) — `%2$s` is `""` or `" | Reunited!"`.
   - **Affects:** `es`, `vi`, `ar`, `th`. **Why:** Optional glued `%s` suffixes hide sentence structure from translators and break punctuation/word order (e.g., `"Frame 1 of 3: An empty seat, selected"` in `es` needs `"Fotograma 1 de 3: Un asiento vacío (seleccionado)"` where `"selected"` inflects for the noun or stays neutral).
   - **Concrete fix:** Split each optional-suffix `msgid` into two explicit whole `msgid`s (base variant vs extended variant).

6. **Other Opaque Multi-`%s` Templates Needing `{named}` Keys & Translator Notes:**
   - `"%s half: %s. Paint %s here."` (`mural_stories.gd.present.target` — `%1$s`=`Left`/`Right`, `%2$s`=current scene or `"open paper"`, `%3$s`=selected brush scene) — **`%1$s half` fails head-initial order in `es` (`Mitad izquierda`), `vi` (`Nửa bên trái`), `ar` (`النصف الأيسر`), `th` (`ครึ่งซ้าย`)!**
   - `"%s jig: left support %s; right support %s. %s"` (`helper_bench.gd.description.line` — `%1$s`=`Low stand`/`Framed triptych`, `%2$s`/`%3$s`=`fitted`/`empty`, `%4$s`=optional foreshortened note) — **`%1$s jig` fails head-initial order in `es`/`vi`/`ar`/`th`!**
   - `"Next, return %s. %s is %s."` (`story.GODOT_TEMPLATES.current_objective.returnHint` — `%1$s`=borrowed item `"Thanh's folding table"`, `%2$s`=owner name `"Thanh"`, `%3$s`=compass phrase `"about 2 blocks east"`).
   - `"Talking with %s (%s) · Click %s again or choose an action below"` (`characters.CAPTION_TEXT.talking` — `%1$s`=neighbor name, `%2$s`=role, `%3$s`=neighbor name).
   - `"Dez: Good, the %s has %s. Fit the remaining support..."` (`helper_bench.gd.refresh.partial` — `%1$s`=lowercased display form, `%2$s`=`"one support"`).
   - `"\nCopied order: %s. %s; %s. These are the film's original illustrations..."` (`helper_bench.gd.refresh.copied` — `%1$s`=joined shot titles, `%2$s`=framing, `%3$s`=plan).
   - `"Local full track: %s (procedural stems hidden) — %s Use Sketch returns to the original 80 BPM music."` (`characters.PANEL_TEXT.rookLocalDetail` — `%1$s`=filename, `%2$s`=play state).

---

### 3B. Count & Ratio Placeholders Missing CLDR Plural Forms and RTL Bidi Isolation (33 `msgid`s)

1. **12 Direct `%d + Noun` `msgid`s Requiring Plural Objects (`es` `{one, other}` [+`many`], `ar` 6-form `{zero, one, two, few, many, other}`):**
   - `"%d guests"` — `rewards.CUE_REASONS.keepsake_photo` (`1 invitado` vs `5 invitados`; `ar` `ضيف واحد` / `ضيفان` / `5 ضيوف`)
   - `"%d links fitted."` — `ending.text.GODOT["habitat_room.gd"].refresh.linksFitted` (note: in English `1 links fitted.` is already broken!)
   - `". %d of 3 links fitted. "` — `ending.text.GODOT["habitat_room.gd"].departure_text.links`
   - `"%d of 3 copies placed. "` — `ending.text.GODOT["habitat_room.gd"].description.placed`
   - `"Copied rhythm: %d taps in eight slots, at %s."` — `ending.text.GODOT["hosted_afternoon.gd"].detail.beatsSome` (`0..8` taps; `1 tap` is broken in English too!)
   - `"You gave us %d taps in eight slots. I kept the spaces between them too."` — `ending.text.GODOT["hosted_afternoon.gd"].detail.beatsSomeReply` (`1..8` taps)
   - `"about %d blocks %s"` — `story.GODOT_TEMPLATES.compass_phrase.blocks` (`2..N`; needs `ar` `two` dual `حوالي مربعين سكنيين` vs `few` `3–10` `مربعات` vs `many` `11+` `مربعاً`!)
   - `"240 Eddy St at Jones · %d shade trees, lawn & play area"` — `bursts.BURST_TEXT.boeddeker_park.detail`
   - `"Fenced neighborhood park: lawn, %d shade trees, play structure & benches along a winding path · Outline © OpenStreetMap / ODbL; trees, path & furniture are stylized, not surveyed"` — `visits.text.GODOT_TEXT["main.gd"].inspect_boeddeker_park.sub`
   - `"Neighborhood Tour Complete! All %d stops visited this session. You found all 10 keepsakes; the optional tour starts fresh next session."` — `visits.text.GODOT_TEXT["main.gd"].update_landmark_tour_completion.announce`
   - `"You've visited all %d tour stops this session and found every keepsake!..."` — `visits.text.GODOT_TEXT["main.gd"].current_objective.doneHint`
   - `"Take your time. Spot the %d neighborhood surprises (%d/%d found, Shift+D)..."` — `visits.text.GODOT_TEXT["main.gd"].current_objective.spotHint`
   - **Affects:** `ar` (all 12 require 6-form CLDR plural objects, especially `2` vs `3–10` vs `11+`), `es` (all 12 require `one`/`other`), `vi` & `th` (classifier choice notes: `vi` `vị khách`, `nhịp gõ`, `dãy phố`, `cây bóng mát`, `điểm dừng`; `th` `คน`, `จังหวะ`, `ช่วงตึก`, `ต้น`, `จุด`).
   - **Concrete fix:** Convert all 12 `msgid`s to pluralized catalog entries keyed on `%d` (`count`), and fix English singular `1 link`, `1 tap`.

2. **21 Ratio `%d/%d + Noun` or `%d/N + Noun` `msgid`s Needing Arabic Plural/Bidi & Spanish Agreement Guidance:**
   - `"%d/%d Surprises"` (`main.gd.inspect_neighborhood_surprise.tag`), `"%d/%d stops · 10 keepsakes\nThanks for exploring!"` (`BURST_TEXT.tour_complete.detail`), `"%d/2 matched - %s"` (`dogs.TEXT.objective.count`), `"%d/2 sites observed"` (`election.TEXT.refresh.observed`), `"%d/3 Motifs Painted"` (`PANEL_TEXT.easelCount`), `"%d/3 mural motifs"` (`BLOCK_TEXT.mural`), `"%d/5 neighbors"` (`BLOCK_TEXT.neighbors`), `"%s (%d/%d stems)"` (`PANEL_TEXT.stems`, `MUSIC_TEXT.stemSummary`), `"\nShared this visit: %d/4 dishes. %s"` (`meal.TEXT.refresh.shared`), `"Block hosting progress: %d/4 activities"` (`BURST_TEXT.hosting_segment.detail`), `"Easel progress: %d/3 motifs · Groove: %s"` (`BURST_TEXT.mural_motif.detail`), `"Larkin 2017 | %d/3 neighbor lights"` (`power.TEXT.refresh.headingLarkin`), `"Mural Stories | Marks %d/3"` (`mural_stories.gd.present.title`), `"Meet %s (%d/%d neighbors met)"` (`current_objective.meet`), `"Sidewalk easel unlocked (%d/%d neighbors met)"` (`BURST_TEXT.celeste_talk.detail`), `"Power Story: %s (%d/3 lights restored)"` (`power.TEXT.objective.text`), `"Return %s · %d/3 returned"` (`current_objective.return`), `"The Open Seat: %d/3 frames captured"` (`BURST_TEXT.film_shot.detail`), `"Two Dogs Home | %d/2 matched%s"` (`dogs.TEXT.refresh.heading`), `"All 10 keepsakes are yours! Optional tour: %s, %s. %d/%d stops this session..."` (`current_objective.tourHint`), `"%s — %s (%d/%d Surprises Found)"` (`inspect_neighborhood_surprise.line`).
   - **Affects:** `ar` (and `es`). **Why:** In **`ar`** RTL with Western digits (`ar-u-nu-latn`), `1/3` adjacent to Arabic text or `/` inside RTL context can visually invert numerator/denominator or misattach unless isolated (`\u20661/3\u2069` or `"%1$d من %2$d"`), and phrasing as `"%1$d من %2$d"` triggers plural/genitive noun rules on the total (`من 3 عناصر` vs `من 10 مفاجآت`). In **`es`**, `"1/2 sitios observados"` / `"1/3 motivos pintados"` is acceptable as a compact HUD counter only if phrased `"Motivos pintados: %d/3"` so the participle agrees with the plural total rather than clashing with `1`.
   - **Concrete fix:** Wrap `%d/%d` ratios in LTR isolate (`\u2066...\u2069`) or format via `"Label: %d/%d"` in `ar` and `es`; document in translator notes.

3. **5 Metric & Percentage Placeholders (`%.0f m`, `%d m`, `%d%%`):**
   - `"Lead the lanterns - %.0f m left"` (`visits.lantern.TEXT.objective.left`), `"\nThis imagined gathering station is %.0f m from Larkin/Eddy..."` (`visits.power.TEXT.refresh.distance`), `"about %d m %s"` (`story.GODOT_TEMPLATES.compass_phrase.metres`), `"Volume: %d%%"` (`characters.BUTTON_TEXT.volume`), `"Music volume %d%%."` (`sketch-core.MUSIC_TEXT.volume`).
   - **Affects:** `ar`, `th`, `es`, `vi`. **Why:** In **`ar`**, `"%.0f m"` mixes LTR Latin `"m"` after digits inside RTL prose (causing bidi reordering next to punctuation; use Arabic `"م"` or `"متر"`), and `%d%%` must stay LTR-isolated (`\u2066%d%%\u2069`). In **`th`**, use `"เมตร"` (`"เหลืออีก %.0f เมตร"`).
   - **Concrete fix:** Localize `"m"` to `"م"`/`"متر"` in `ar` and `"เมตร"` in `th`, and LTR-isolate `%d%%` in `ar`.

---

### 3C. Placeholder Grammatical Gender, Animacy, Article & Preposition Collisions (26 `msgid`s)

1. **Person vs Inanimate Place in `"goodbye to %s"` (2 `msgid`s):**
   - **Exact `msgid`s:** `"You said goodbye to %s."` (`characters.CAPTION_TEXT.goodbye`), `"Said goodbye to %s. Next: %s"` (`characters.CAPTION_TEXT.goodbyeA11y`), plus `"the block"` (`characters.CAPTION_TEXT.goodbyeNobody`).
   - **Affects:** `es`, `vi`, `ar`, `th`.
   - **Why:** `%s` receives a neighbor's name (`"Bea"`, `"Rook"`) OR `"the block"` (`goodbyeNobody`).
     - **`es`:** `"Te despediste de Bea"` vs `"Te despediste de la cuadra"` (works with `de`, NOT `a`! If a translator translates `"to %s"` as `"Le dijiste adiós a %s"`, `"a la cuadra"` becomes `"a el bloque"` [uncontracted `a el`!]).
     - **`vi`:** `"Bạn đã chào tạm biệt cô Bea"` (needs kinship `"cô"` for Bea, none for peers, and `"tạm biệt khu phố"` for `"the block"`!).
     - **`th`:** `"บอกลา..."` works for people, whereas `"บอกลาบล็อกถนน"` sounds unnatural for leaving a street panel.
   - **Concrete fix:** Split `goodbyeNobody` into its own whole sentence (`"You closed the block panel."` / `"You stepped back to the street."`) so `"You said goodbye to %s."` ONLY takes a person's name (and in `vi`, uses a polite kinship-safeneighbor display helper or neutral `"Bạn đã tạm biệt %s."`).

2. **Locative Predicate Collision in `"%s is %s"` Across `compassPhrase` Outputs (7 `msgid`s):**
   - **Exact `msgid`s:**
     - `"%s is %s. Go say hello!"` (`story.GODOT_TEMPLATES.current_objective.meetHint`)
     - `"Next, return %s. %s is %s."` (`story.GODOT_TEMPLATES.current_objective.returnHint`)
     - `"The mural is %s. Add all three motifs."` (`current_objective.muralHint`)
     - `"Rook's speaker is %s. One soundcheck and we're ready."` (`current_objective.soundcheckHint`)
     - `"The Black Hawk site at Turk & Hyde is %s."` (`current_objective.blackhawkHint`)
     - `"The Compton's Cafeteria plaque at Turk & Taylor is %s."` (`current_objective.comptonsHint`)
     - `"Bea: \"Boeddeker Park is %s, if you ever want a bench and some trees.\""` (`characters.NEIGHBOR_LINES.bea.before[3]`)
   - **Affects:** `es`, `ar`, `vi`, `th`.
   - **Why:** The locative `%s` receives `"right here"`, `"nearby"`, `"about a block northwest"`, `"about 2 blocks east"`, or `"about 35 m south"`.
     - In **`es`**, `"está justo aquí"` and `"está cerca"` take **no preposition**, whereas `"about a block northwest"` requires **`a`** (`"está a una cuadra al noroeste"`). If `"a"` is omitted, `"El mural está aproximadamente una cuadra..."` is ungrammatical; if `"a"` is put in the template, `"está a justo aquí"` is ungrammatical!
     - In **`ar`**, if the locative phrase uses an adjective/participle (`قريب` masc. vs `قريبة` fem.), it must agree in gender with `"Bea"` (fem.) vs `"Rook"` (masc.), `"اللوحة الجدارية"` / `"لوحة كومبتونز"` (fem.) vs `"مكبّر صوت روك"` / `"منتزه بوديكر"` (masc.)!
   - **Concrete fix:** Include the locative preposition inside the distance templates (`es` `"a aproximadamente %d cuadras al %s"` vs `"justo aquí"` / `"muy cerca"`), and in **`ar`** use gender-invariant prepositional phrases (`هنا تماماً`, `بالقرب من هنا`, `على بُعد نحو %d م باتجاه %s`) so `%s` works identically for masculine and feminine subjects! Add a translator note enforcing prepositional locatives.

3. **Hardcoded English Indefinite Article `"a %s"` Before Variable-Gender Nouns:**
   - **Exact `msgid`:** `"Dez: \"You made a %s for %s. %s %s\""` (`ending.text.GODOT["main.gd"].civic_completion_acknowledgment.line`)
   - **Affects:** `es`, `ar`, `vi`, `th`.
   - **Why:** `%1$s` receives lowercased `"small listening circle"` (masculine in `es`: `un pequeño círculo de escucha`; masc. in `ar`: `حلقة استماع صغيرة` — wait: `حلقة` is feminine!) OR `"drop-in notice table"` (feminine in `es`: `una mesa abierta de avisos`; fem. in `ar`: `طاولة إعلانات مفتوحة`). Hardcoding `"un "` or `"una "` outside `%1$s` in `es` fails 50% of the time! Also `%3$s` and `%4$s` are two full sentences concatenated at the end.
   - **Concrete fix:** Move the indefinite article inside the two format phrases or split into two format-specific templates (`civic_ack_circle` and `civic_ack_dropin`).

4. **Ordinal & Left/Right Gender Agreement in Mural & Hosted Afternoon Templates (7 `msgid`s):**
   - `"%s was %s in the afternoon we hosted."` (`ending.text.GODOT["hosted_afternoon.gd"].detail.heading`) — `%1$s` = `"Welcome & Stories"` / `"Rhythm Circle"` / `"Shared art panel"` / `"Quiet tea pause"`, `%2$s` = `"first"` / `"second"` / `"third"` / `"fourth"`. In **`es`** (`fue la primera actividad` vs `fue el primer momento`) and **`ar`** (`كانت الفقرة الأولى` vs `كان النشاط الأول`), the ordinal `%2$s` and copula `كان`/`كانت` must agree in gender with `%1$s`! **Fix:** Reword template with an explicit invariant classifier noun: `"{segment} was the {ordinal} part of the afternoon we hosted."` (`es` `"{segment} fue la %2$s parte..."` — always feminine `parte`; `ar` `"كان «{segment}» الجزءَ {ordinal}..."` — always masculine `الجزء`!).
   - `"%s on the %s"`, `"%s painted on the %s."`, `"%s is already on the %s."`, `"Lift %s scene"`, `"Lifted the %s scene."` (`characters.COMPOSITION.scene`, `main.gd.edit_mural_scene.*`, `mural_stories.gd.setup.lift`) — `%s` takes unextracted `"left"` / `"right"`. **Fix:** Split `"left"` and `"right"` into two whole-sentence `msgid`s per template (`"%s painted on the left side."` / `"%s painted on the right side."`, `"Lift left scene"` / `"Lift right scene"`).

5. **Adverbial `"%s style!"` and Concatenated List `"Bea: ... We just need: %s."` (2 `msgid`s):**
   - `"Bea: \"Everyone's here, Celeste's 3/3 board is glowing, and Rook's speaker is set. Our Turk Street block gathering is open, %s style!\""` (`core.BLOCK_TEXT.opened`) — `%s` is `"Long Table"` or `"Open Floor"`. Add translator note (`es` `¡al estilo %s!`, `ar` `بأسلوب «%s»!`).
   - `"Bea: \"Almost ready to open the block party! We just need: %s.\""` (`core.BLOCK_TEXT.almost`) — `%s` joins `"%d/5 neighbors"`, `"%d/3 mural motifs"`, `"Rook's soundcheck"` with English `", "` in `core.js`! In **`ar`**, ASCII comma `,` must be Arabic comma `، ` (`U+060C`). **Fix:** Localize list joiner via `new Intl.ListFormat(locale)` instead of hardcoded `', '`.

---

## 4. Ambiguous Short Strings & Active `msgid` Collisions (Category 2 — Severity: High)

### 4A. Status of the 7 Prompt Benchmark Terms in `i18n/source.json`

| Term | Standalone `msgid` in `source.json`? | Exact `msgid`s & `paths` in `source.json` | Distinct Meanings Carried in the Game | Action Required |
| --- | --- | --- | --- | --- |
| **`"Ready"`** | **Yes** | `"Ready"` (`characters.PANEL_TEXT.scReady`); also `"Ready together"` (`habitat_room.gd`), `"Ready to share..."` (`meal.TEXT`) | **Adjective (equipment state):** Rook's speaker soundcheck is completed (`Soundcheck: Ready`), **NOT** asking the player if they are ready! (`es` `Listo` masc. matching `Sonido`/`Chequeo`, NOT `Lista`; `ar` `جاهز` masc., `vi` `Đã sẵn sàng`, `th` `พร้อมแล้ว`). | Add `msgctxt: "soundcheck_status"` + translator note. |
| **`"Back"`** | **Yes (10 paths!)** | `"Back"` (`programme_studio.gd.refresh.back`, `rhythm.RHYTHM_TEXT.back`, `dogs/election/lantern/power.setup.back`); `"Back to\nMural"`, `"Back to room"`, `"Back to choices"` | **(1) Overlay dismiss button:** close activity reader and return to Turk St (`rhythm`, `dogs`, `election`, `lantern`, `power`). **(2) Sub-view step-back button:** return from Gather Again / sub-panel to Studio (`programme_studio`). **(3) Quoted UI button name** inside 8 tutorial paragraphs (`"Back keeps this visit's progress..."`). | Split `(1)` `msgctxt: "nav_return_street"` vs `(2)` `msgctxt: "nav_step_back"`, and ensure inline tutorial quotes match button translation verbatim! |
| **`"Play"`** | Compound only | `"Play Groove"` (`BUTTON_TEXT.play`), `"Play\nBar"` (`RHYTHM_TEXT.playBar`), `"Play the 3D edition"` (`EDITION_TEXT.link`) | **(1) Audio playback** (`Play Groove`, `Play\nBar` → `es` `Reproducir`, `vi` `Phát`, `ar` `تشغيل`, `th` `เล่นเสียง`). **(2) Play a game** (`Play the 3D edition` → `es` `Jugar a la edición 3D`, `vi` `Chơi bản 3D`, `ar` `العب النسخة ثلاثية الأبعاد`, `th` `เข้าเล่นรุ่น 3 มิติ`). | Already distinct compounds; add translator note on `"Play\nBar"` (`"Bar"` = 1 musical measure of 8 beats, **NOT** a tavern/bar!). |
| **`"Off"`** (and **`"On"`**) | **Yes (ACTIVE COLLISION!)** | `"Off"` & `"On"` shared across `mural_stories.gd.present.off`/`.on` AND `rhythm.RHYTHM_TEXT.off`/`.on`; also `"Step cues\nOff"`, `"Sketch On"` | Shared across **`Music: Off`** (`Música` fem. sg. in `es`; `الموسيقى` fem. sg. in `ar`) AND **`Step cues: Off`** (`rhythm-ui.js` builds `"Step cues\n" + t('Off')` — `Indicadores` masc. pl. in `es`! If `Off`=`Desactivada`, `"Indicadores Desactivada"` is ungrammatical!). | Split into atomic whole labels `"Music: On"`, `"Music: Off"`, `"Step cues: On"`, `"Step cues: Off"` (or add `msgctxt` + gender-neutral `es` `Sí`/`No` or `Activo`/`Inactivo` only if atomic labels are used). |
| **`"Table"`** | Compound only | `"Long Table"` (`GATHERING_LAYOUT_TITLES.table`), `"Long Table (Bea)"` (`ACTION_LABELS.layoutTable`), `"Thanh's folding table"` (`LOAN_TITLES.table`), `"Table and volunteer hands"` (`FILM_FRAMING.wide.label`) | Always a **physical folding/communal table** on the sidewalk (`es` `mesa`, `vi` `bàn`, `ar` `طاولة`, `th` `โต๊ะ`), **never** a data/spreadsheet table (`tabla` / `bảng` / `جدول` / `ตาราง`). | Add translator note on `"Table and volunteer hands"` & `"Long Table"`. |
| **`"Seats"`** | **Yes** | `"Seats"` (`ending.habitat.TITLES[2]`, `habitat_room.gd.TITLES[2]`) | **Artifact copy noun:** the miniature/copied pair of Thanh's quiet sidewalk chairs & green open-seat cushion arranged inside the habitat room model (`es` `Asientos`, `vi` `Ghế ngồi`, `ar` `المقاعد`, `th` `ชุดที่นั่ง`), **NOT** vehicle seats or theater ticket capacity. | Add `msgctxt: "habitat_artifact_seats"` + translator note. |
| **`"Lead"`** | Compound only (4 senses!) | `"Choose a lead"` / `"choose a lead"` / `"Walk to lead"` / `"Your selected lead: "` (`dogs.TEXT.*`); `"Sidewalk Lead Stem"` (`CUE_REASONS.Soundcheck`); `"Lead the lanterns - %.0f m left"` (`lantern.TEXT.objective.left`); plus raw `'lead'` in `sketch-core.js` | **4 incompatible meanings across the game:** **(1) Investigative clue / tip** on where a missing dog was spotted (`dogs.js` — **NOT** a dog leash `"lead"`! Huge trap inside a dog story!). **(2) Melodic lead instrument track** (`Sidewalk Lead Stem`, `bass+brush+chords+lead`). **(3) Verb: guide at the front** (`Lead the lanterns`). **(4) Never** metal `Pb` ordog leash! | Add critical translator notes to all `dogs.js` `"lead"` strings (`es` `pista`, `vi` `manh mối`, `ar` `دليل`/`خيط بحث`, `th` `เบาะแส` — NEVER leash `correa`/`dây xích`/`مقود`/`สายจูง`!) and `Sidewalk Lead Stem` (`melodía principal`). |

---

### 4B. Active Multi-Path Collisions & Polysemous 1–2 Word `msgid`s Requiring `msgctxt` (46 Additional `msgid`s)

1. **`"Complete"` — ACTIVE VERB vs ADJECTIVE COLLISION!**
   - **Paths:** `ending.text.GODOT["programme_gathering.gd"].refresh.complete` (**status adjective**: gathering is finished → `es` `Completado`, `vi` `Đã hoàn tất`, `ar` `مكتمل`, `th` `เสร็จสมบูรณ์`) **COLLIDES WITH** `rhythm.RHYTHM_TEXT.complete` (**imperative action button**: finish hosting the Rhythm Circle → `es` `Completar` / `Terminar`, `vi` `Hoàn tất`, `ar` `إتمام`, `th` `จบกิจกรรม`)!
   - **Affects:** `es`, `vi`, `ar`, `th`. **Fix:** Split with `msgctxt: "status_complete"` vs `msgctxt: "action_complete_rhythm"`.

2. **`"Gathering"` — ACTIVE EVENT BUTTON vs STREET LOCATION COLLISION!**
   - **Paths:** `ending.text.GODOT["orbital_commons.gd"].refresh.gathering` (**action/state tab** in Orbital Commons for the final neighborhood gathering) **COLLIDES WITH** `visits.dogs.LEADS[2]`, `dog_story.gd.LEADS[2]` (**physical map location lead**: the block gathering area on Turk St where owners wait, alongside `"Turk & Taylor"` and `"Turk & Hyde"`)!
   - **Affects:** `es`, `vi`, `ar`, `th` (`vi` `"Buổi sum họp"` event vs `"Khu tụ họp"` place; `ar` `"اللقاء"` event vs `"ساحة التجمّع"` place; `th` `"งานรวมตัว"` vs `"จุดจัดงาน"`). **Fix:** Split with `msgctxt: "orbital_gathering_action"` vs `msgctxt: "dog_lead_gathering_site"`.

3. **`"Continue"` — CHAPTER CARD DISMISSAL vs SIDE-STORY RESUME:**
   - **Paths:** `story.GODOT_TEMPLATES.show_story_card.resume` (button dismissing a chapter intro card to start playing) vs `visits.picker.TEXT.refresh.continue`, `story_picker.gd.refresh.continue` (button resuming an already-started side story visit).
   - **Affects:** `vi`, `ar`, `th`, `es`. **Fix:** Split with `msgctxt: "story_card_continue"` vs `msgctxt: "visit_picker_continue"`.

4. **`"Previous"` — PANEL PAGINATION vs PROGRAMME TURN:**
   - **Paths:** `ending.text.GODOT["orbital_commons.gd"].refresh.previous` (previous still panel, feminine `لوحة`/`diapositiva` in `ar`/`es`) vs `ending.text.GODOT["programme_gathering.gd"].setup.previous` (previous hosted turn/segment, masculine `turno`/`نشاط` in `es`/`ar`).
   - **Affects:** `es`, `ar` (`Anterior` is gender-invariant in `es`, but in **`ar`** `السابق` masc. vs `السابقة` fem. collides!). **Fix:** Split with `msgctxt: "panel_previous"` vs `msgctxt: "turn_previous"`.

5. **Exhaustive Inventory of Remaining Single/Two-Word Polysemous `msgid`s Needing `msgctxt` & Translator Notes:**
   - `"Invite"` (`programme_gathering.gd._draw.invite` — SVG board badge showing a turn was joined via invitation, **NOT** an imperative button! Needs `msgctxt: "board_badge_invite"` vs `"Invite "` verb prefix).
   - `"Opening"` (`programme_gathering.gd._draw.opening` — SVG board badge for an unhurried pause/space held between segments, **NOT** grand opening or door opening! Needs `msgctxt: "board_badge_opening"`).
   - `"Draft"` (`programme_studio.gd.refresh.draft` — pinboard schedule draft tab, **NOT** `"cold draft"` beer in `copper_cue_tavern[0]` or air current! Needs `msgctxt: "studio_tab_draft"`).
   - `"Art"` (`ending.habitat.TITLES[0]`, `habitat_room.gd.TITLES[0]` — Celeste's 6-shape copied art panel object, `msgctxt: "habitat_artifact_art"`).
   - `"Film"` (`ending.habitat.TITLES[1]`, `habitat_room.gd.TITLES[1]` — Dez's 3-frame illustrated storyboard object, not plastic film or cinema feature, `msgctxt: "habitat_artifact_film"`).
   - `"Entry"` (`ending.habitat.NAMES[0]` — room doorway/entrance zone, **NOT** form input or polling list entry! `es` `Entrada`, `vi` `Lối vào`, `ar` `المدخل`, `th` `ทางเข้า`, `msgctxt: "habitat_place_entry"`).
   - `"Window"` (`ending.habitat.NAMES[1]` — architectural room window, **NOT** browser/OS UI window in `"Widen the window slightly..."`! `vi` `Cửa sổ phòng`, `ar` `النافذة`, `th` `หน้าต่างห้อง`, `msgctxt: "habitat_place_window"`).
   - `"Across"`, `"Along"`, `"Corner"` (`ending.text.GODOT_CONSTS["habitat_room.gd"].RELATIONS[0..2]` — 2×2 room grid geometry: same row, same column, diagonal! Translating `"Along"` as a bare preposition `a lo largo de` / `على طول` fails as a standalone button label; needs `msgctxt: "habitat_grid_relation"` + note).
   - `"Near edge"`, `"Other edge"` (`visits.meal.TEXT.setup.near`, `.other` — near side vs far side of the shared communal dining table while keeping the center clear; needs `msgctxt: "meal_table_edge"`).
   - `"Pending"`, `"Playing"`, `"Paused"` (`characters.PANEL_TEXT.scPending`, `.playing`, `.paused` — HUD status badges for soundcheck [masc./fem. noun agreement] vs music playback; needs `msgctxt: "hud_soundcheck_status"` and `"hud_music_status"`).
   - `"Hit"`, `"Rest"` (`rhythm.RHYTHM_TEXT.padHit`, `.padRest` — musical drum beat vs musical silence/rest in an 8-step sequencer bar! Without context, `"Hit"` mistranslates as punch/strike/popular song and `"Rest"` as sleep/remainder! `es` `Golpe`/`Pulso` & `Silencio`, `vi` `Phách gõ` & `Phách nghỉ`, `ar` `نبضة`/`ضربة` & `سكتة`, `th` `จังหวะเคาะ` & `จังหวะหยุด`, `msgctxt: "rhythm_step_state"`).
   - `"Practice"`, `"Hosting"`, `"Listen"` (`rhythm.RHYTHM_TEXT.practice`, `.hosting`, `.listen` — mode labels vs action button in Dez's Rhythm Circle, `msgctxt: "rhythm_mode"` / `"rhythm_action"`).
   - `"Stop"` (`orbital_commons.gd.refresh.stop`, `.setup.stop` — stop avatar walking, not stop audio! Contrast `"Stop\nBar"` which stops audio bar preview; `msgctxt: "walk_stop"`).
   - `"Return"` (`visits.before-streets.TEXT.setup.return` — button returning from Indigenous landscape prologue to Ch. 1, contrast `"Return "` borrowed gear! `msgctxt: "prologue_return"`).
   - `"Resume"` (`visits.picker.TEXT.refresh.resume` — resume active story visit, never CV/résumé! `msgctxt: "visit_resume"`).
   - `"Visit"` (`visits.picker.TEXT.refresh.visit` — imperative button `"Start/enter this side story"`, not noun `"a visit"`; `es` `Visitar`, `ar` `زيارة`, `msgctxt: "visit_start_button"`).
   - `"Walk"` (`visits.election.TEXT.setup.walk` — imperative button `"Walk to selected site"`, not noun `"a walk"`; `es` `Caminar`, `ar` `السير إلى الموقع`, `msgctxt: "election_walk_button"`).
   - `"March"` (`visits.lantern.TEXT.refresh.march` — imperative button `"Walk in the lantern procession"`, **NOT** the month of March [`marzo`/`Tháng 3`/`مارس`/`มีนาคม`]! Critical calendar collision! Needs `msgctxt: "lantern_action_march"`).
   - `"Parade"` (`visits.text.GODOT_TEXT["main.gd"].update_walk_control.lantern` — HUD chip reopening the paused Lantern Procession reader; `msgctxt: "walk_chip_lantern"`).
   - `"Assembly"` (`visits.lantern.TEXT.objective.assembly` — gathering point on Turk St where neighbors assemble paper lanterns, **NOT** legislative assembly or robot assembly! `msgctxt: "lantern_gathering_point"`).
   - `"Gather"` (`visits.lantern.TEXT.refresh.gather` — button to gather neighbors at the start of the lantern walk; `msgctxt: "lantern_action_gather"`).
   - `"Welcome"` vs `"Welcome!"` (`visits.lantern.TEXT.refresh.welcomeLabel` [button action: deliver the closing welcome at the end of the lantern loop] vs `.welcome` [status/exclamation after welcoming!]; needs `msgctxt: "lantern_action_welcome"` vs `"lantern_done_welcome"`).
   - `"Reunite"` vs `"Reunited!"` (`visits.dogs.TEXT.refresh.reunite` [imperative button] vs `objective.reunited` [completed status]).
   - `"Shared!"` (`visits.election.TEXT.refresh.shared` — completed button state for Bea's map, fem. `mapa` in `pt` vs masc. `el mapa` in `es` `¡Compartido!` vs fem. `الخريطة` in `ar` `تمت المشاركة!`; `msgctxt: "election_map_shared_status"`).
   - `"Festival"` (`visits.power.TEXT.refresh.festival` — mode-switcher button switching Power Story from `Larkin 2017` historical mode to the fictional festival light-kit mode; `msgctxt: "power_mode_festival"`).
   - `"Story"` (`visits.power.TEXT.setup.story` — button returning from `Case map`/`Place map` sub-view back to the Power Story main view; `msgctxt: "power_tab_story"`).
   - `"Earlier"`, `"Later"` (`visits.picker.TEXT.setup.earlier`, `.later` — pagination buttons scrolling through the list of 5 side stories, **NOT** chronological time! Translating as `"Más temprano"`/`"قبل ذلك"` misleads players into thinking stories are sorted by historical era! Reword or add `msgctxt: "picker_page_prev"` / `"picker_page_next"`).
   - `"Sources"` (`visits.before-streets.TEXT.setup.sources` — toggle button showing historical/tribal citations, not water/audio sources; `msgctxt: "citations_toggle"`).
   - `"Close"` (`characters.BUTTON_TEXT.close` — verb button closing a modal/panel, **NOT** adjective `"close/near"` as in `"Objects in close-up"`! `msgctxt: "modal_close_button"`).
   - `"Skip"` (`orbital_commons.gd.refresh.skip` — skip remaining still panels to final return panel), `"Depart"` (`habitat_room.gd.refresh.depart` — start speculative orbital departure sequence), `"Hint"` (`BUTTON_TEXT.hint`), `"Info"` (`BUBBLE_TEXT.info`).

---

## 5. Player Address, Gender Variants & Pronoun/Particle Register (Category 4 — Severity: High)

### 5A. Exact Corpus Count & Distribution Across `i18n/source.json`

A full-catalog scan of all **1,488 `msgid`s** yields the following verified player-address counts:

- **213 `msgid`s** are tagged `"addressee": "player"` in `i18n/source.json` (matched solely via English `\b(you|your|yours|yourself)\b`).
- **200 additional `msgid`s** address the player via 2nd-person imperatives or direct elliptical questions *without* the word `"you"`, comprising:
  - **34 untagged direct spoken dialogue lines** (neighbors, cooks, eatery hosts, museum docent, and surprise characters speaking face-to-face to the player — **missed by the extractor's `addressee` detector!**).
  - **43 UI action buttons** (`length: "button"`) and **123 HUD objectives / tutorial prompts**.
- **Total player-directed `msgid`s:** **413 `msgid`s (27.8% of the catalog)**, of which **247 `msgid`s** (`213 + 34`) require active 2nd-person pronoun, verb-gender, or conversational-particle decisions in `ar`, `vi`, and `th`, and **28 `msgid`s** require gender-neutral adjective or formality checks in `es`.

---

### 5B. Arabic (`ar`) — `address.m` / `address.f` Scope vs Gender-Neutral UI Chrome (~179 Dual-Variant `msgid`s + 34 Missed Tags)

1. **Spoken & Narrative 2nd-Person `msgid`s Needing `address.m` / `address.f` (~179 `msgid`s):**
   - In warm MSA, every finite 2nd-person singular verb (`أنتَ وجدتَ` vs `أنتِ وجدتِ`), imperative (`تعالَ`/`اخترْ` vs `تعالَيْ`/`اختاري`), and possessive suffix (`-كَ` vs `-كِ`, when vowelized or in hollow/defective verbs like `أعطيتنا` / `تركتَ` vs `تركتِ`, `يمكنكَ` vs `يمكنكِ`) distinguishes masculine and feminine addressee.
   - **Critical gap — 34 spoken dialogue `msgid`s lack `"addressee": "player"` in `i18n/source.json`** so `scripts/i18n.mjs` will not flag them for Arabic `address.m`/`address.f` review! Key examples to tag `"addressee": "player"`:
     - `"Thanh: \"Pull up a stool and pour some hot jasmine tea! We can snap a group photo, host the party schedule, or hold our tenant circle.\""` (`characters.NEIGHBOR_LINES.thanh.open[0]`) — `اسحبْ كرسياً واسكبْ...` (m) vs `اسحبي كرسياً واسكبي...` (f)!
     - `"Thanh: \"Tap any action below to meet the rest of the block...\""` (`thanh.before[2]`)
     - `"Bea: \"Tap 'Plan Party Schedule' to line up stories...\""` (`bea.open[1]`)
     - `"Bea: \"Lost? Tap What's Next? any time—or choose Spot Surprise...\""` (`bea.before[4]` — note `"if you hear"` gave it `addressee: "player"`, check `"Lost?"` = `أتائهٌ أنتَ؟` vs `أتائهةٌ أنتِ؟`!)
     - `"Bea: \"Help us make a little map from two published records...\" Choose either site and Walk."` (`visits.election.TEXT.begin.begun`) — `ساعدْنا` (m) vs `ساعدينا` (f)!
     - `"Bea: \"Our fictional festival light kit has gone dark. Help us link the three relays...\""` (`visits.power.TEXT.begin.festival`)
     - `"Bea: \"Let us keep neighbors connected... First, bring a portable battery light...\""` (`visits.power.TEXT.begin.larkin`)
     - `"Celeste: \"Try cycling Garden, Sunset, or Ocean palettes anytime...\""` (`characters.CELESTE_LINES.completed[1]`)
     - `"Dez: \"The block party is jumping! Tap 'Plan Party Schedule' or 'Shoot Short Film'...\""` (`dez.open[0]`)
     - `"Dez: \"Look at that Open Floor! Celeste's lettering and my beat, side by side.\""` (`LAYOUT_MEMORY.dez.floor`)
     - `"“I’m skipping photos today. Save me a story instead.”"` (`keepsake.PHOTO_RESPONSES[4].response`) — `احفظْ لي حكاية` (m) vs `احفظي لي حكاية` (f)!
     - `"“Yes, and make sure the mural gets in.”"` (`keepsake.PHOTO_RESPONSES[0].response`)
     - `"“Stay for a moment, or come back another day.”"` (`FILM_SHOT_LATER_CAPTIONS.welcome`)
     - `"I am Nura... Come press the base with me; we can talk while our hands are busy."` (`visits.meal.RECIPES[0].welcome`) — `تعالَ اضغطْ` (m) vs `تعالَيْ اضغطي` (f)!
     - `"I am Grace... Bring a serving spoon; there will be room for all our dishes."` (`visits.meal.RECIPES[3].welcome`)
     - `"I like these little plates... Save one for me while I pass the spoons."` (`visits.meal.RECIPES[3].recognition[1]`)
     - `"Look at those crisp edges... Put the slices together on that platter; I will find the serving tongs."` (`visits.meal.RECIPES[1].recognition[0]`)
     - `"There are the separate red grains... Bring the serving pan; I want a seat where I can hear everybody."` (`visits.meal.RECIPES[3].recognition[0]`)
     - `"Welcome in! The broth has been simmering since sunrise. Pull up a stool."` (`EATERY_HOST_LINES.bowl_basil_pho[0]`)
     - `"Crispy imperial rolls just came out of the fryer. Careful, they're hot!"` (`EATERY_HOST_LINES.bowl_basil_pho[2]`) — `انتبهْ` (m) vs `انتبهي` (f)!
     - `"A zero-proof botanical highball, shaken. Listen to that upright bass."` (`EATERY_HOST_LINES.blue_valve_hifi[1]`)
     - `"We stay open late for the night-shift crowd. Come back anytime."` (`EATERY_HOST_LINES.saffron_clay_oven[2]`)
     - `"Still warm from the rack! Take a pink-frosted glazed donut or a toasted everything bagel..."` (`SURPRISES.good_donut_and_bagel.speech`)
     - `"Two-step on the velvet runner, darling! When Taylor and Turk light up, every sidewalk is a main stage!"` (`SURPRISES.impromptu_drag_show.speech`)
     - `"Welcome to the Tenderloin Museum! Tap again and the Time-Portal will take us back."` (`MUSEUM_DOCENT_LINES[0]`)
   - **UI Chrome & System Instructions (~234 `msgid`s) Can Stay Single-Form Neutral in `ar`:** Buttons (`"Go Meet %s"`, `"Talk to %s"`, `"Visit the Museum"`, `"Keep exploring"`, `"Choose a lead"`) and HUD objectives should use Arabic verbal nouns (`المصدر`: `لقاء %s`, `التحدّث إلى %s`, `زيارة المتحف`, `مواصلة الاستكشاف`, `اختيار خيط بحث`) so UI chrome never requires `address.m`/`address.f` branching.
   - **Concrete fix:** Update `scripts/i18n.mjs` to set `addressee: "player"` on spoken dialogue lines containing imperatives, and supply `address.m`/`address.f` variants across the ~179 spoken/narrative 2nd-person `msgid`s.

---

### 5C. Spanish (`es`) — Gender-Neutral Rewrites for Player-Predicative Adjectives (15 `msgid`s)

In Spanish (`tú`), finite 2nd-person verbs (`hablaste`, `dejaste`, `elige`, `camina`) and pronouns (`tú`, `te`, `tu`, `tuyo` [when agreeing with a possessed object like `la música sigue siendo tuya`]) do **not** mark the player's gender. Only **predicative adjectives modifying the player** force a gendered `-o/-a` choice. Across all 1,488 `msgid`s, exactly **15 `msgid`s** carry that risk:

1. **`"Lost?"` (1 `msgid`):**
   - `"Bea: \"Lost? Tap What's Next? any time—or choose Spot Surprise if you hear rumors of a small cutesy dinosaur or a wild woman chef on a magic carpet!\""` (`characters.NEIGHBOR_LINES.bea.before[4]`)
   - **Why:** Literal `"¿Perdido?"` / `"¿Perdida?"` genders the player.
   - **Concrete fix:** Translate with a finite verb: `"¿Te perdiste?"` or `"¿No sabes por dónde seguir?"` (100% natural, zero player-gender marking).

2. **`"Welcome!"` (1 `msgid`):**
   - `"Welcome!"` (`visits.lantern.TEXT.refresh.welcome`, `lantern_procession.gd.refresh.welcome`)
   - **Why:** Completed button/status after welcoming the lantern loop; avoid `"¡Bienvenido/a!"`.
   - **Concrete fix:** Use `"¡Qué alegría recibirles!"` or `"¡Bienvenida dada!"` / `"¡Hogar abierto!"` (plural group welcome, matching the procession context).

3. **`"when you are ready"` / `"when you're ready"` / `"when ready"` (13 `msgid`s):**
   - **Exact `msgid`s & `paths`:**
     1. `"\nAll four contributions are here. Finish gathering when you are ready."` (`programme_gathering.gd.description.all`)
     2. `"\nFollow takes you to the Listening Hour button; open it when ready..."` (`programme_studio.gd.description.follow`)
     3. `" Choose the invitation, then Host Activity when ready. Nothing is timed."` (`bea_invitation.gd.update_choices.hub`)
     4. `" Choose the seats, then Host Activity when you are ready."` (`quiet_seats.gd.update_ui.hub`)
     5. `" Listening Hour has room for another neighbor... Gather here is a separate choice when you are ready."` (`orbital_commons.gd.response.seatsTail`)
     6. `" Listening Hour is focused. Open that button when you are ready..."` (`programme_studio.gd.follow_hosted_invitation.focused`)
     7. `" Return when ready to complete it."` (`rhythm.RHYTHM_TEXT.closeHostingTail`)
     8. `"'; choose that action when you are ready..."` (`civic_listening.gd.refresh.followTail`)
     9. `". Choose this film action when you are ready; your film is unchanged."` (`civic_listening.gd.follow_invitation.tail`)
     10. `"Bea (fictional neighbor): \"...When you are ready, come see what we are making together.\""` (`visits.before-streets.REPLIES[0]`)
     11. `"Dez: \"Celeste and I want to make a little three-shot film. Ask me when you're ready.\""` (`characters.NEIGHBOR_LINES.dez.open[3]`)
     12. `"Dez: Choose hits or rests. Listening is welcome too. Complete when you are ready."` (`rhythm.RHYTHM_TEXT.hostingOpen`)
     13. `"I would like to make room for a Listening Hour too, when you are ready."` (`hosted_afternoon.gd.invitation.idle`)
     *(Plus `"Two dogs home! ... Imani: \"Come make a lantern with us whenever you are ready.\""` in `visits.dogs.TEXT.match_dog.reunion`!)*
   - **Why:** Literal `"cuando estés listo"` / `"cuando estés lista"` genders the player in every single activity!
   - **Concrete fix:** Add a global Spanish style/translator note for `"when you are ready"` → use `"cuando quieras"`, `"a tu ritmo"`, or `"cuando tengas todo listo"` (where `listo` agrees with neuter `todo`, never the player!).

---

### 5D. Vietnamese (`vi`) & Thai (`th`) — Mixed Quote + System-Instruction `msgid`s (28 `msgid`s)

- **Problem:** In **28 paragraph `msgid`s**, a single string combines **spoken neighbor dialogue** (which requires warm first/second-person pronouns/kinship terms and sentence-final particles in `vi` and `th`) with **unquoted narrator/UI mechanics** (which must omit pronouns/particles and drop `คุณ` in `th` and `bạn` in terse UI rules).
- **Representative `msgid`s & `paths`:**
  - `"Bea: \"Help us make a little map from two published records. We are observing outside, not entering polling rooms.\" Choose either site and Walk."` (`visits.election.TEXT.begin.begun`)
  - `"Bea: \"You kept our neighbors connected!\" In the real April 21, 2017 outage, PG&E restored service by 4:46 p.m. This battery-light adventure and its residents are original fiction."` (`visits.power.TEXT.check_path.larkinWon`)
  - `"Two dogs home! Mara: \"Those floppy ears! Welcome back, Pippin.\" Imani: \"Junebug, there is your triangle tag. Thank you for bringing us together.\" Original fictional reunion. Imani: \"Come make a lantern with us whenever you are ready.\" Other stories keeps this personal invitation."` (`visits.dogs.TEXT.match_dog.reunion`)
  - `"Dez: Celeste and I imagine a little helper built by the neighbors. Let's give it a useful first job: lift our three film pictures onto a stand for a future neighborhood.\nChoose a display, then fit both supports in either order. Only you can ask the helper to lift. There is no timer."` (`ending.text.GODOT["helper_bench.gd"].refresh.intro`)
  - `"Dez: Your %s holds all three pictures, ending on %s...\nWe can imagine a home around what our neighbors made..."` (`helper_bench.gd.refresh.complete`)
  - `"Thanh: Let us arrange copies in a shared room we imagine visiting together... Suggested arrangement, not a remembered choice: art by Entry, seats by Window, film at Far wall. You decide."` (`habitat_room.gd.refresh.intro`)
  - `"Dez: Above Earth, we still have a neighborhood to make together... Choose Walk orbital to explore the commons..."` (`habitat_room.gd.departure_text.panel2`)
  - `"\nBea: Then this is a neighborhood. We keep the welcome open.\nReturn home begins a captioned journey closing our imagined future..."` (`orbital_commons.gd.finale_text.menu`)
- **Additional `vi`/`th` Register Note on Bea Addressing the Player (`needs native reviewer`):** When older organizer **Bea** speaks *to* the player (`bea.before[0..4]`, `bea.open[0..4]`, `before-streets.REPLIES`, `election`, `power`), **`vi`** cannot use `"cô"` (1st person) + `"bạn"` (peer 2nd person) together — if Bea refers to herself as `"cô"`, she must address the player as `"con"` or `"cháu"` or `"em"` (or `"mình"`/warm neutral phrasing if player age is unknown — `needs native reviewer`!). Similarly in **`th`**, if Bea uses `"ป้า"` or `"พี่"`, her 2nd-person reference when needed must avoid stiff `"คุณ"` (`เรา`/`เพื่อนบ้าน` or zero-pronoun warm Central Thai — `needs native reviewer`).
- **Concrete fix:** Split mixed dialogue+instruction `msgid`s at the quote/paragraph boundary into separate dialogue vs UI-instruction `msgid`s (or add explicit translator notes marking which sentences are spoken in-character vs system UI help).

---

## 6. Length, Hardcoded Line Breaks & Phone/Canvas Layout Risks (Category 6 — Severity: Medium-High)

### 6A. 35 UI Buttons, Choice Cards & Map Pins with Hardcoded Mid-Phrase `\n` Line Breaks

- **Exact `msgid`s & `paths`:**
  1. `"Compose\nMural"` (`characters.BUTTON_TEXT.compose`)
  2. `"Back to\nMural"` (`ending.text.GODOT["mural_stories.gd"].setup.back`)
  3. `"Food &\nArt"` (`ending.text.GODOT["mural_stories.gd"].present.pageFood`)
  4. `"Music &\nGarden"` (`ending.text.GODOT["mural_stories.gd"].present.pageMusic`)
  5. `"Cooking\nTogether"` (`ending.mural.SCENE_LABELS.cooking`)
  6. `"Growing\nTogether"` (`ending.mural.SCENE_LABELS.garden`)
  7. `"Making\nMusic"` (`ending.mural.SCENE_LABELS.music`)
  8. `"Making\nStreet Art"` (`ending.mural.SCENE_LABELS.painting`)
  9. `"Sharing\na Bowl"` (`ending.mural.SCENE_LABELS.sharing`)
  10. `"Play\nBar"` (`rhythm.RHYTHM_TEXT.playBar`)
  11. `"Stop\nBar"` (`rhythm.RHYTHM_TEXT.stopBar`)
  12. `"Reset\nPractice"` (`rhythm.RHYTHM_TEXT.resetPractice`)
  13. `"Rhythm\nCircle"` (`rhythm.RHYTHM_TEXT.entry`)
  14. `"Step cues\nOff"` (`rhythm.RHYTHM_TEXT.stepCuesOff`)
  15. `"View\nCircle"` (`rhythm.RHYTHM_TEXT.viewCircle`)
  16. `"Battery\nview"` (`visits.power.TEXT.refresh.batteryButton`)
  17. `"Begin\nstory"` (`visits.power.TEXT.setup.begin`)
  18. `"End\nstory"` (`visits.power.TEXT.setup.end`)
  19. `"Replay\nstory"` (`visits.power.TEXT.refresh.replay`)
  20. `"Case\nmap"` (`visits.power.TEXT.refresh.caseMap`)
  21. `"Place\nmap"` (`visits.power.TEXT.refresh.placeMap`)
  22. `"Check\npath"` (`visits.power.TEXT.setup.check`)
  23. `"Walk to\nrelay"` (`visits.power.TEXT.setup.walk`)
  24. `"Missing\ndogs"` (`visits.power.TEXT.setup.dogs`)
  25. `"More\nstories"` (`visits.power.TEXT.setup.more`)
  26. `"Other\nstories"` (`visits.picker.TEXT.add_reader_entry.label`)
  27. `"Larkin\n2017"` (`visits.power.TEXT.refresh.larkin`)
  28. `"1 380 Eddy St\nCadillac"` (`visits.election.TEXT.setup.label0`)
  29. `"2 246 Eddy St\nBoeddeker"` (`visits.election.TEXT.setup.label1`)
  30. `"Boeddeker\n246 Eddy"` (`visits.election.TEXT.setup.boeddeker`)
  31. `"Cadillac\n380 Eddy"` (`visits.election.TEXT.setup.cadillac`)
  32. `"A pair and\nan open seat"` (`hosted-text.HOSTED_GODOT_TEXT["quiet_seats.gd"].update_ui.pairs`)
  33. `"An open arc\nof seats"` (`hosted-text.HOSTED_GODOT_TEXT["quiet_seats.gd"].update_ui.arc`)
  34. `"A small moment\nyou want to keep"` (`hosted-text.HOSTED_GODOT_TEXT["bea_invitation.gd"].update_choices.memory`)
  35. `"Something you hope\nto make together"` (`hosted-text.HOSTED_GODOT_TEXT["bea_invitation.gd"].update_choices.future`)
- **Languages affected:** `es`, `vi`, `ar`, `th`
- **Why:** Hardcoding `\n` inside button labels forces a manual break on top of CSS automatic wrapping (`es` `"Componer\nmural"` → `"Componer"` is 8 wide letters that already wraps to 2 lines in a narrow button, producing 3 lines and vertical clipping!). In **`th`**, compound concepts like `"แผนที่สถานที่"` (`Place map`) or `"วงจังหวะ"` (`Rhythm Circle`) are single unspaced compounds that look broken if artificially split onto 2 lines. In **`ar`**, splitting an *idafa* construct (`"خريطة\nالموقع"`) across lines hurts legibility, and stacked **`vi`**/`**th**` diacritics (`ế`, `ẫ`, `ổ`, `้ำ`, `ื้`) clip vertically if button `line-height` is `< 1.35` (`th` needs `1.45`).
- **Concrete fix:** Replace hardcoded `\n` in buttons with normal spaces and let CSS `white-space: normal; text-wrap: balance; line-height: 1.4` wrap per locale width.

---

### 6B. Canvas Map Chips, UTF-16 Hitbox Math Bug & `ch`-Unit Width Bug (28 `msgid`s + 2 Runtime Bugs)

1. **Runtime Hitbox Width Bug (`browser-next/world.js:91`) & `ch`-Unit Label Offset Bug (`browser-next/visits-episodes.js:72`):**
   - `world.js:91` estimates canvas chip half-width as `const w = (chip.text.length * 7 + 20) / 2;` (using UTF-16 code units × 7px instead of `ctx.measureText(chip.text).width`), while `sprites.js:84` draws the pill using real `ctx.measureText(text).width + 18`.
     - In **`th`** (e.g., `"จุดประวัติศาสตร์แบล็กฮอว์ก"`, where combining vowels/tone marks `ุ ิ ์ ็` add `.length` with **0px horizontal advance**) and **`ar`** (connected cursive glyphs averaging ~4.5–5.5px at `11px`), `.length * 7` overestimates hitbox width by 30–50%, causing overlapping neighbor/landmark tap zones on Turk St! Conversely, wide **`es`**/**`vi`** uppercase/accented labels exceed `7px` per char at `600 11px`, making the outer ends of drawn pills **untappable**!
   - `visits-episodes.js:72` offsets `power` case-map labels via `${[...String(label.text)].length}ch`. `[...str]` counts Unicode scalar values — counting every Thai vowel/tone mark and Arabic diacritic as a full `1ch` (~8px) character width and pushing right-aligned map labels off their pins!
   - **Concrete fix:** Compute chip hitboxes in `world.js` with `ctx.measureText(chip.text).width` (or cache the width measured in `drawChip`), and replace `${[...String(label.text)].length}ch` in `visits-episodes.js:72` with CSS `transform: translateX(-100%)` right-anchoring!

2. **Single-Line Street, Landmark, Surprise & Badge Chips at High Overflow Risk on 360px Phones (28 `msgid`s):**
   - **50+ char landmark/surprise map chips (already near 360px edge in English; +30–40% in `es`/`vi` will clip off-canvas!):**
     - `"Tenderloin Museum & Info Hub · 398 Eddy (Cadillac Hotel)"` (56 chars — `main.gd.build_street_life_decor.museum`)
     - `"Living Archive Time-Portal · 1961 / 1966 / 1907"` (47 chars — `main.gd.build_street_life_decor.portal`)
     - All 10 `[*]` surprise chips (`main.gd.build_neighborhood_surprises.*`, 41–53 chars):
       - `"[*] Wild Woman Chef on a Magic Carpet (Tap / Shift+D)"` (53 chars)
       - `"[*] Impromptu 'Mayor Public Event' (Tap / Shift+D)"` (50 chars)
       - `"[*] Good Donut & Everything Bagel (Tap / Shift+D)"` (49 chars)
       - `"[*] Dirt Biker in a Viking Helmet (Tap / Shift+D)"` (49 chars)
       - `"[*] Guy with a Clown Horn — Honk! (Tap / Shift+D)"` (49 chars)
       - `"[*] 145 Leavenworth Hidden Mural (Tap / Shift+D)"` (48 chars)
       - `"[*] Jeffrey's Lost 1961 Record (Tap / Shift+D)"` (46 chars)
       - `"[*] Bite-Sized Bags of Nachos (Tap / Shift+D)"` (45 chars)
       - `"[*] Small Cutesy Dinosaur (Tap / Shift+D)"` (41 chars)
       - `"[*] Impromptu Drag Show! (Tap / Shift+D)"` (40 chars)
   - **Eatery & world canvas chips:**
     - `"%s (fictional)"` (`main.gd.build_street_life_decor.eatery`) with `"Morning Star Banh Mi & Coffee"` / `"The Blue Valve Vinyl & Hi-Fi Bar"` / `"Saffron Clay-Oven Naan & Curry"` (41–45 chars → **55–65 chars in `es` `" (ficticio)"` and `vi` `" (hư cấu)"`**!).
     - `"Today: %s"` (`main.gd.build_eatery_counters.menu`) with `"condensed-milk iced coffee"` (`es` `"Hoy: café helado con leche condensada"`, 37 chars).
     - `world.PLACES[0..3].name` & `world.NEIGHBORS[0..4].role`: `"Good ears. Better stories."` (26), `"Signs, paint & possibility"` (26), `"Neighbor & supply lender"` (24), `"Black Hawk history stop"` (23), `"A corner with a history"` (23), `"The one with the plan"` (21), `"Always making a beat"` (20), `"Neighbor-made mural"` (19).
     - `characters.NEIGHBOR_BADGES.*`: `"Sidewalk Muralist · Bright & Inviting"` (37), `"80 BPM Beatmaker · Easygoing Groove"` (35), `"Tea & Stools Host · Generous & Calm"` (35), `"Block Organizer · Warm & Steady"` (31), `"Sound Keeper · Cool & Observant"` (31).
   - **Affects:** `es` (+35%), `vi` (+30%), `th` (long compound transliterations/glosses), `ar` (RTL pill clamping & LTR `(Tap / Shift+D)` suffix reordering).
   - **Concrete fix:** Provide `narrow` catalog variants for map chips on `< 600px` screens (dropping `"(Tap / Shift+D)"` on touch devices where keyboard `Shift+D` is irrelevant anyway!), clamp `drawChip` horizontal x-coordinates within `[pad, canvasWidth - pad]`, and support 2-line chip wrapping above `280px` pill width.

---

### 6C. Constrained Phone-Width Action Buttons, `160px` Election Pins & Speech-Bubble Name Pills (27 `msgid`s)

1. **19 Action & Hub Buttons (`18–26` English chars) Overflowing 2–3 Column Phone Grids:**
   - `"Open Floor (Dez & Celeste)"` (26 — `ACTION_LABELS.layoutFloor`)
   - `"Chat & Soundcheck (Done)"` (24 — `BUTTON_TEXT.rookDone`)
   - `"Celeste's Shared Panel"` (22 — `ACTION_LABELS.sharedPanel`)
   - `"80 BPM Sketch (Active)"` (22 — `BUTTON_TEXT.sketchActive`)
   - `"Spot Surprise (%d/%d)"` (21 — `ACTION_LABELS.surprise`)
   - `"See Compton's Plaque"` (20 — `ACTION_LABELS.plaque`)
   - `"Soundcheck with Rook"` (20 — `ACTION_LABELS.soundcheck`)
   - `"Host Activity (%d/4)"` (20 — `HUB_LABELS.programmeHost`)
   - `"Plan Schedule (%d/4)"` (20 — `HUB_LABELS.programmeDraft`)
   - `"Tenant Circle (Done)"` (20 — `HUB_LABELS.civicDone`)
   - `"Hosted All 4 Events"` (19 — `HUB_LABELS.programmeDone`)
   - `"Plan Party Schedule"` (19 — `HUB_LABELS.programme`)
   - `"Roll Camera (Clear)"` (19 — `HUB_LABELS.filmHold`)
   - `"Start Hosting Party"` (19 — `HUB_LABELS.programmeStart`)
   - `"All Block Actions"` (17 — `ACTION_LABELS.hub`, expands to `"Todas las acciones de la cuadra"` [31 chars] in `es`!)
   - `"Hold Tenant Circle"` (18), `"Paint with Celeste"` (18), `"Return Gear (%d/3)"` (18), `"Share Circle Notes"` (18), `"Shoot Frame (%d/3)"` (18), `"Soundcheck w/ Rook"` (18), `"Walk to Black Hawk"` (18).
   - **Fix:** Add mandatory `narrow` catalog strings (`<= 18` chars in `es`/`vi`, `<= 16` graphemes in `ar`/`th`) for every button/hub label above.

2. **`160px`-Capped Election Map Pin Labels (`visits-episodes.js:23` `max-width: min(160px, calc(50% - 10px))`):**
   - `"1 380 Eddy St\nCadillac"` & `"2 246 Eddy St\nBoeddeker"` (`visits.election.TEXT.setup.label0`, `label1`) — mostly street numbers/proper names, but in **`ar`** RTL, leading digit `"1 "` + `"380 Eddy St"` merges visually into `"1 380"` (`1380`!) unless separated by punctuation (`"1 · 380 Eddy St"` or `<bdi>1</bdi>: 380 Eddy St`)!
   - **Concrete fix:** Change `"1 380 Eddy St\nCadillac"` to `"1. 380 Eddy St\nCadillac"` (or `"#1 · 380 Eddy St"`) so pin number `1` never visually fuses with street number `380` in RTL or LTR!

3. **Long Speech-Bubble Speaker Headers on Phone Width (`bubble.js` visual badge width):**
   - `"Bea (fictional neighbor)"` (24 chars inside `before-streets.REPLIES[0..2]` — expands to `"Bea (vecina ficticia)"` / `"Cô Bea (người hàng xóm hư cấu)"` [30 chars] / `"بيا (جارة خيالية)"` / `"บี (เพื่อนบ้านสมมติ)"`), `"Nacho Captain Rico"` (18), `"Pip the Tiny Dino"` (17), `"The Block Mayor"` (15), `"Honker Barnaby"` (14).
   - **Concrete fix:** Ensure the speech-bubble speaker header pill allows `max-width: 100%; overflow-wrap: break-word` instead of `white-space: nowrap` overflow.

---

## 7. Cultural, Civic, Historical, Dietary & Idiomatic Content (Category 7 — Severity: Medium)

### 7A. Indigenous Homeland & Non-Consultation Disclaimer (`visits/before-streets.js` — 4 `msgid`s)

- **Exact `msgid`s & `paths`:**
  - `"This is Ramaytush homeland today. The Yelamu were the original people of what is now San Francisco; Ramaytush people continue to live today."` (`visits.before-streets.FRAME`)
  - `"Ramaytush homeland, then and now\nOriginal regional illustration | Not a map"` (`visits.before-streets.TEXT.setup.subtitle`)
  - `"Sources checked October 25, 2026.\nNational Park Service: regional wind-blown sand and dunes...\nAssociation of Ramaytush Ohlone: living people and Peninsula homeland...\nRamaytush Tribe: Yelamu and ongoing historical landscape research...\nOriginal schematic artwork and fictional Bea dialogue. This is not a community-authored cultural account; consultation and cultural acceptance have not occurred. No Indigenous voice, village, ceremony or historical trail is invented. Links are reading references; this scene makes no network requests."` (`visits.before-streets.SOURCES`)
  - `"Before These Streets"` (`visits.before-streets.TEXT.setup.title`, `visits.picker.TITLES[0]`)
- **Affects:** `es`, `vi`, `ar`, `th` (**`needs native reviewer`**).
- **Why & Safe Direction:**
  1. Keep **`Ramaytush`**, **`Ramaytush Ohlone`**, and **`Yelamu`** untranslated in Latin script in `es`/`vi` and phonetically transliterated with Latin parenthetical on first mention in `ar` (`رامايتوش أولوني (Ramaytush Ohlone)`, `يلامو (Yelamu)`) and `th` (`ชาวรามายทุช โอโลนี (Ramaytush Ohlone)`, `เยลามู (Yelamu)`). Keep official organization names `"Association of Ramaytush Ohlone"` and `"Ramaytush Tribe"` recognizable alongside a respectful gloss so readers can match the linked URLs.
  2. Preserve the **present-tense living-people framing** (`"This is Ramaytush homeland today"`, `"continue to live today"`) — never use past-only or extinct-tribe phrasing in `es` (`territorio ancestral y actual del pueblo Ramaytush`), `vi` (`quê hương của người Ramaytush ngày nay`), `ar` (`وطن شعب رامايتوش اليوم`), or `th`.
  3. Translate `"consultation and cultural acceptance have not occurred"` with exact ethical clarity — do not soften into `"informal tribute"` and do not mistranslate `"acceptance"` as legal treaty ratification (`es` `"no se ha realizado consulta ni validación cultural"`, `vi` `"chưa qua tham vấn hay sự chấp thuận về mặt văn hóa từ cộng đồng"`, `ar` `"لم تجرِ استشارة مجتمعية أو إجازة ثقافية لهذا العمل"`, `th` `"ยังไม่ได้ผ่านการปรึกษาหารือหรือการรับรองทางวัฒนธรรมจากชุมชน"` — **`needs native reviewer`**).

---

### 7B. Civic Listening, Housing/SROs, 2024 Election Disclaimers & Mayoral Parody (18 `msgid`s)

1. **Housing, Displacement & Person-First Homelessness Terminology (`civic.js`, `neighborhood-voices.json`):**
   - **Exact `msgid`s & `paths`:**
     - `"Repairs and staying put"` (`civic.CIVIC_TOPICS.repairs.label`) & `"We want homes cared for and neighbors able to stay. We ask for a conversation about repairs without displacement."` (`civic.CIVIC_TOPICS.repairs.request`)
     - `"“We put repairs and staying put into the conversation. One listening hour is a beginning, not a promise that housing problems are solved.”"` (`characters.PROJECT_MEMORY.civic.beaRepairs`)
     - `"Larkin Street describes support for young people experiencing homelessness in San Francisco, including housing, education and employment programs."` (`experiments/neighborhood-voices.json.records[2].summary`)
     - `"TNDC describes its work as affordable housing, services and community development for people with low incomes in the Tenderloin and across San Francisco."` (`experiments/neighborhood-voices.json.records[0].summary`)
   - **Affects:** `es`, `vi`, `ar`, `th` (**`needs native reviewer`**).
   - **Why & Safe Direction:**
     - Idiom **`"staying put"`** cannot translate literally; it means **anti-displacement / remaining in one's neighborhood home** (`es` `"reparaciones y permanencia en el hogar"` / `"sin desplazamiento"`, `vi` `"sửa chữa nhà cửa và an cư tại chỗ"`, `ar` `"إصلاحات المساكن والبقاء في البيوت دون تهجير/إخلاء"`, `th` `"การซ่อมแซมที่พักและการได้อยู่ที่เดิมโดยไม่ถูกผลักดันออก"`).
     - **`"young people experiencing homelessness"`** & **`"people with low incomes"`**: strictly preserve **person-first, non-stigmatizing community language** — avoid derogatory vagrancy terms in `es` (use `"jóvenes en situación de falta de vivienda"` / `"sin hogar"`, never `"vagabundos"`/`"indigentes"`), `vi` (`"thanh thiếu niên đang trong hoàn cảnh vô gia cư"`, `"người có thu nhập thấp"`, never pejorative slang), `ar` (`"الشباب الذين يمرّون بتجربة التشرّد / بلا مأوى"` and `"ذوي الدخل المحدود"`), and `th` (`"เยาวชนที่ประสบภาวะไร้บ้าน"` and `"ผู้มีรายได้น้อย"`, never `"คนเร่ร่อน"`).

2. **Historical November 5, 2024 Election Disclaimers (`visits/election.js`):**
   - **Exact `msgid`s:** `"HISTORICAL: November 5, 2024 consolidated election, including Mayor..."` (`visits.election.TEXT.source_text.head`), `" address pin, not a surveyed entrance or room... This is not a complete list or an assigned voting site. For present-day voting, consult current San Francisco Department of Elections information..."` (`source_text.tail`), `"Historical November 5, 2024 polling-list map walk. Two outdoor Tenderloin stops from the City's October 3 list, plus Bea's hand-drawn neighborhood map. Not voter advice or an assigned polling place."` (`visits.election.TEXT.refresh.intro`).
   - **Affects:** `es`, `vi`, `ar`, `th`. **Safe Direction:** Keep `"San Francisco Department of Elections"` recognizable (translate + parenthetical English agency name in `es`, `vi`, `ar`, `th` so SF residents recognize the real civic office!) and preserve the explicit past-tense disclaimer (`2024` Gregorian year in `th`, never `2567`).

3. **Whimsical Civic Parody — `"The Block Mayor"` & `"Impromptu 'Mayor Public Event'"` (6 `msgid`s):**
   - **Exact `msgid`s:** `"Impromptu 'Mayor Public Event' & Ribbon Cutting"`, `"[*] Impromptu 'Mayor Public Event' (Tap / Shift+D)"`, `"The Block Mayor"`, `"A Little Pomp & Circumstance"`, `"Ahem—by the power vested in this tiny velvet podium and oversized golden scissors, I hereby proclaim today Official Neighbor Appreciation Hour! Cue the fanfare!"`, `"Joined an impromptu 'Mayor Public Event' complete with a miniature podium... (fictional civic comedy moment)."` (`visits.surprises.SURPRISES.mayor_pomp_event.*`).
   - **Affects:** `vi`, `ar`, `th`, `es` (**`needs native reviewer`**).
   - **Why & Safe Direction:** In **`vi`** (Little Saigon), **`ar`**, and **`th`**, literal official titles for `"Mayor"` (`Thị trưởng`, `عمدة`, `นายกเทศมนตรี`) can read as an actual city government official if the playful neighborhood nickname `"Block Mayor"` and mock-ceremonial English formula `"by the power vested in this tiny velvet podium..."` are translated stiffly. Keep scare quotes around `'Mayor Public Event'`, render `"The Block Mayor"` affectionately as a self-appointed neighborhood emcee (`es` `"El Alcalde de la Cuadra"`, `vi` `"“Thị Trưởng” Khu Phố"`, `ar` `"«عمدة الحيّ»"`, `th` `"“ท่านนายกฯ ประจำซอย”"`), and preserve the mock-grandiose humor of `"by the power vested in this tiny velvet podium"`!

---

### 7C. Trans History & Drag Runway Camp Register (8 `msgid`s)

- **Exact `msgid`s & `paths`:**
  - `"1966: at Compton's Cafeteria, trans women and neighbors stood up for each other."` (`visits.landmarks.MUSEUM_DOCENT_LINES[2]`)
  - `"Surprise Impromptu Drag Show!"`, `"Sidewalk Encore"`, `"Two-step on the velvet runner, darling! When Taylor and Turk light up, every sidewalk is a main stage!"`, `"Cheered a joyful impromptu sidewalk drag encore near Compton's Corner in the Transgender Cultural District (fictional celebration on the real corner)."` (`visits.surprises.SURPRISES.impromptu_drag_show.*`)
  - `"“Starlight Vee rolled out a magenta runway near Taylor & Turk for an impromptu drag show right in the Transgender Cultural District!”"` (`characters.SURPRISE_MEMORY.thanh.first`, `.both`)
- **Affects:** `es`, `vi`, `ar`, `th` (**`needs native reviewer`**).
- **Why & Safe Direction:**
  - **`"trans women"`**: Must use contemporary, community-affirming terminology in every target language — **`es`**: `"mujeres trans"` (never clinical/outdated terms); **`vi`**: `"phụ nữ chuyển giới"`; **`ar`**: `"النساء العابرات جندرياً"` (affirming contemporary Arabic queer/trans community usage, **never** pathologizing or derogatory terms — **`needs native reviewer`** confirmation); **`th`**: `"ผู้หญิงข้ามเพศ"` (respectful formal/community Thai).
  - **`"drag show"` / `"drag encore"` & `"Two-step on the velvet runner"`**: Keep `"drag"` recognizable (`es` `"show de drag"`, `vi` `"màn trình diễn drag ngẫu hứng"`, `ar` `"عرض دراغ (Drag) استعراضي"`, `th` `"โชว์แดร็กเซอร์ไพรส์"`). `"Two-step"` here means a joyful dance strut down the velvet carpet runner (not a 2-step verification or Texas country two-step!).

---

### 7D. Religion, Holidays & Pork / Alcohol Dietary Transparency (12 `msgid`s)

1. **`"2nd Floor Sanctuary"` Architectural Room Name (`visits/election.js`):**
   - **Exact `msgid`:** `" address pin... Other entries in our retained excerpt: Faithful Fools, 234 Hyde; Glide, 330 Ellis, 2nd Floor Sanctuary. They are outside this two-stop walk..."` (`visits.election.TEXT.source_text.tail`)
   - **Affects:** `es`, `vi`, `ar`, `th` (**`needs native reviewer`**).
   - **Why & Safe Direction:** `"2nd Floor Sanctuary"` is the literal published polling-place room designation inside GLIDE Memorial Church (`330 Ellis`). Translating `"Sanctuary"` as a wildlife/asylum refuge (`refugio`/`ملاذ`) or Buddhist/Hindu shrine (`วิหาร`/`ศาลเจ้า`) distorts the published civic record. Translate as the main hall/sanctuary room on the 2nd floor or retain `"2nd Floor Sanctuary"` in parentheses alongside a clear architectural gloss (`es` `"Salón/Santuario del 2.º piso (2nd Floor Sanctuary)"`, `ar` `"القاعة الرئيسية في الطابق الثاني (2nd Floor Sanctuary)"`, `vi` `"Khánh đường Tầng 2 (2nd Floor Sanctuary)"`, `th` `"ห้องโถงชั้น 2 (2nd Floor Sanctuary)"`).

2. **Pork Ingredients Must Be Explicit (Especially for Arabic `ar` Readers — 4 `msgid`s):**
   - **Exact `msgid`s & `paths`:**
     - `"Parboiled rice, smoked pork sausage, onion, bell pepper and tomato paste, with seasonings."` (`visits.meal.RECIPES[3].ingredients`)
     - `"Cook the diced smoked sausage, onion and bell pepper until the vegetables soften."` (`visits.meal.RECIPES[3].steps[1][1]`)
     - `"separate tomato-red rice grains with sausage and peppers"` (`visits.meal.TEXT.art_description.shape3`)
     - `"Daikon; regular rice flour and cornstarch; dried shrimp, mushrooms, Chinese sausage and scallion."` (`visits.meal.RECIPES[1].ingredients`) & `"Cook the shrimp, mushrooms and sausage with scallion..."` (`RECIPES[1].steps[1][1]`)
   - **Affects:** `ar` (and `vi`, `th`, `es`).
   - **Why & Safe Direction:** `RECIPES[3]` explicitly specifies `"smoked pork sausage"`, while `RECIPES[1]` lists `"Chinese sausage"` (Cantonese *lap cheong* `臘腸`, traditionally cured pork sausage). In **`ar`**, never obscure `"smoked pork sausage"` with a generic halal-sounding `"نقانق مدخنة"` where pork (`لحم الخنزير`) is omitted from the ingredient line (`RECIPES[3].ingredients`), and add a translator note on `"Chinese sausage"` (`نقانق صينية تقليدية [لاب تشيونغ]`) so culinary/dietary accuracy is preserved transparently without judgment.

3. **Alcoholic vs Zero-Proof Bar Menu Items (`visits/landmarks.js` — 6 `msgid`s):**
   - **Exact `msgid`s:** `"cold draft"` (`EATERY_MENU_ITEMS.copper_cue_tavern[0]`), `"A cold draft for you, and the jukebox is cued to soul 45s."` (`EATERY_HOST_LINES.copper_cue_tavern[1]`), `"Vintage neon booths, neighborhood pool table, jukebox soul 45s, and cold draft pours"` (`EATERIES[4].specialty`), `"botanical highball"` (`EATERY_MENU_ITEMS.blue_valve_hifi[0]`), `"A zero-proof botanical highball, shaken. Listen to that upright bass."` (`EATERY_HOST_LINES.blue_valve_hifi[1]`), `"Warm tube-amp jazz LPs, zero-proof botanical highballs, and classic neighborhood cocktails"` (`EATERIES[2].specialty`).
   - **Affects:** `es`, `vi`, `ar`, `th`.
   - **Why & Safe Direction:**
     - **`"cold draft"`** means **chilled draft beer from a tap** (`es` `"cerveza de barril bien fría"`, `vi` `"bia tươi mát lạnh"`, `ar` `"شراب الشعير المبرّد من الصنبور / بيرة طازجة باردة"`, `th` `"เบียร์สดเย็นๆ"`) — without a translator note, `"cold draft"` WILL be mistranslated as `"cold air breeze"` (`corriente de aire frío` / `تيار هواء بارد`) or `"rough document draft"` (`مسودة`)!
     - **`"zero-proof"`** is US bartender jargon (`0 proof` = `0% ABV`, completely non-alcoholic). Without a note, `"zero-proof"` mistranslates literally as `"without evidence/unproven"` (`sin pruebas` / `بلا دليل`)! Translate explicitly as **non-alcoholic** (`es` `"cóctel botánico sin alcohol"`, `vi` `"mocktail thảo mộc không cồn"`, `ar` `"مشروب أعشاب فوّار خالٍ من الكحول"`, `th` `"ไฮบอลสมุนไพรไร้แอลกอฮอล์"`).

4. **Halloween & Nordic Toast (`visits/lantern.js`, `visits/surprises.js` — 4 `msgid`s):**
   - `"Halloween: Lantern Procession"` (`visits.picker.TITLES[4]`), `"\nOriginal fictional Halloween procession on the modeled Turk block. "` (`visits.lantern.TEXT.refresh.route`), `"Bea, Celeste, Dez and Thanh gather on Turk with warm paper lanterns, walk a gentle loop together, and welcome everyone back. Untimed; Music stays independent. Original fiction."` (`visits.lantern.TEXT.refresh.intro`) — keep `"Halloween"` recognizable (`Halloween` in `es`/`vi`, `هالوين` in `ar`, `ฮาโลวีน` in `th`) and preserve the secular neighborhood paper-lantern craft framing (do not conflate `"paper lanterns"` with Mid-Autumn `Tết Trung Thu` in `vi` or `ลอยกระทง`/`ยี่เป็ง` sky lanterns in `th`!).
   - `"Skol, neighbor! Just cruising Turk Street at an easy idle—horns polished, helmet strapped, waving hello to the whole block party!"` (`visits.surprises.SURPRISES.viking_dirt_biker.speech`) — `"Skol"` is the playful Scandinavian greeting/toast (*Skål!*), **not** an alcohol toast here; keep playful phonetic exclamation + note (`es` `"¡Skål, vecindario!"`, `vi` `"Skol nào người anh em hàng xóm!"`, `ar` `"سكول يا جار!"`, `th` `"สโกลครับเพื่อนบ้าน!"`).

---

### 7E. Culinary Precision Guardrails (`visits/meal.js` & `visits/landmarks.js` — 16 `msgid`s)

1. **`Lo bak go` — Regular Rice Flour vs Glutinous Rice Flour (`RECIPES[1]`):**
   - **Exact `msgid`s:** `"Daikon; regular rice flour and cornstarch; dried shrimp, mushrooms, Chinese sausage and scallion."`, `"Combine the softened daikon, regular rice-flour mixture and savory filling."`, `"Recipe context: Bill Leung, adapted from his sister Ginny's family version, The Woks of Life. Regular rice flour, not glutinous rice flour."`, `"The pale strands are daikon. The cake is named for the radish, not a sweet cake batter."`
   - **Affects:** `vi`, `th`, `es`, `ar`. **Safe Direction:** Translators MUST distinguish non-glutinous vs glutinous rice flour accurately (`vi`: **`bột gạo tẻ`** vs `bột nếp`, and dish name `Bánh củ cải kiểu Quảng Đông (Lo bak go)` where `"bánh"` naturally covers savory cakes so `"not a sweet cake batter"` needs `"không phải bánh ngọt làm từ bột mì"`; `th`: **`แป้งข้าวจ้าว`** vs `แป้งข้าวเหนียว`, dish `ขนมผักกาดกวางตุ้ง (หล่อบักโก๊ว)`; `es`: **`harina de arroz común (no glutinoso)`**, and clarify `"pastel salado de rábano daikon, no un pastel dulce"`; `ar`: **`دقيق الأرز العادي، لا دقيق الأرز الدبق`**).

2. **`Beef pad kra pao` — Holy Basil (`กะเพรา`) vs Sweet Thai Basil (`โหระพา`) (`RECIPES[2]`):**
   - **Exact `msgid`s:** `"Beef pad kra pao"`, `"Thai holy-basil stir-fry"`, `"Beef, garlic and chilies; fish sauce, a little sugar and stock; holy basil. Jasmine rice and an egg for serving."`, `"Fold in holy basil"`, `"I am Mali. I am Thai, and an enthusiastic balcony gardener. The holy basil gets my last patch of sunlight..."`
   - **Affects:** `th`, `vi`, `es`, `ar` (**`vi` `needs native reviewer`**). **Safe Direction:**
     - **`th`**: Use authentic Thai **`ผัดกะเพราเนื้อ`** (spelled `กะเพรา`, NEVER misspelled `กระเพรา`!) and **`ใบกะเพรา`** (NEVER `ใบโหระพา`!).
     - **`vi`**: Distinguish Thai holy basil (**`lá hương nhu / húng quế Thái (กะเพรา)`**) from ordinary pho sweet basil (`húng quế` used at `Bowl & Basil Pho Counter`) — **`needs native reviewer`**.
     - **`es`** / **`ar`**: `"albahaca sagrada tailandesa (holy basil)"` / `"الريحان المقدّس التايلاندي (كابراو)"`.

3. **`Gullah Geechee red rice` — African American Lowcountry Heritage (`RECIPES[3]`):**
   - **Exact `msgid`s:** `"Gullah Geechee red rice"`, `"African American Lowcountry foodways"`, `"I am Grace, an African American neighbor with family ties to the South Carolina Lowcountry..."`, `"Recipe context: Kardea Brown's Gullah red rice. This is one family version of a living African American food tradition, not every family's recipe."`
   - **Affects:** `es`, `vi`, `ar`, `th`. **Safe Direction:** Per `docs/COOKING_FOODWAYS_BRIEF.md`, preserve **`Gullah Geechee`** and **`Lowcountry` (South Carolina)** as specific African American cultural/regional proper names (`es` `"Arroz rojo Gullah Geechee"`, `"tradición culinaria afroestadounidense del Lowcountry de Carolina del Sur"`; `vi` `"Cơm đỏ Gullah Geechee"`, `"truyền thống ẩm thực của người Mỹ gốc Phi vùng Lowcountry (Nam Carolina)"`; `ar` `"الأرز الأحمر على طريقة غولا غيتشي (Gullah Geechee)"`, `"تراث المطبخ الأمريكي الأفريقي في منطقة لوكانتري بكارولاينا الجنوبية"`; `th` `"ข้าวแดงกัลลาห์จีชี (Gullah Geechee)"`, `"วัฒนธรรมอาหารชาวอเมริกันเชื้อสายแอฟริกันแห่งแถบโลว์คันทรี รัฐเซาท์แคโรไลนา"`). Never flatten into generic `"African rice"` or immigrant framing.

4. **`Kibbeh bil sanieh` (`RECIPES[0]`) & US Regional Bakery/Diner Items (`landmarks.js`, `surprises.js`):**
   - `"Kibbeh bil sanieh"` (`RECIPES[0].title`): In **`ar`**, use native Levantine/MSA **`كبّة بالصينية`** (never back-transliterate from English spelling!).
   - `"olallieberry pie"` (`EATERIES[5].specialty`, `open_seat_diner[1,2]`): California blackberry hybrid unknown outside the US West Coast — gloss as `"tarta de mora olallieberry"` (`es`), `"bánh nướng dâu mâm xôi olallieberry"` (`vi`), `"فطيرة توت الأولاليبيري البري"` (`ar`), `"พายเบอร์รีโอลัลลีเบอร์รี"` (`th`).
   - `"everything bagel"` (`SURPRISES.good_donut_and_bagel.*`, `bea.both`): US bakery term for a bagel topped with sesame, poppy, garlic, onion & salt — **DO NOT** translate `"everything"` literally as `"bagel de todo"` / `"بغل كل شيء"` / `"เบเกิลทุกอย่าง"`! Gloss as `"bagel con semillas y especias"` (`es`), `"bánh bagel phủ mè và gia vị tổng hợp"` (`vi`), `"خبز البيغل المتبّل بالسمسم والبصل والثوم"` (`ar`), `"เบเกิลโรยธัญพืชและเครื่องเทศรวม"` (`th`).
   - `"sourdough griddle cakes"` (`EATERIES[5]`): Sourdough pancakes cooked on a diner flat-top (`es` `"hotcakes / panqueques de masa madre a la plancha"`, `vi` `"bánh kếp men tự nhiên áp chảo"`, `ar` `"فطائر العجين المخمّر على الصاج"`, `th` `"แพนเค้กซาวร์โดว์ย่างเตาแบน"`).

---

### 7F. Music Slang, Audio Engineering, Diner/Pool Lingo & English Idioms (34 `msgid`s)

| English Term / Idiom | Exact `msgid`s & `paths` (Representative) | Trap if Translated Literally | Safe Localization Direction (`es`, `vi`, `ar`, `th`) |
| --- | --- | --- | --- |
| **`"brush"` / `"Warm Brush Stem"` / `"brushes"`** vs **`"on your brush"`** | `"Warm Brush Stem"` (`CUE_REASONS.Meet`), `"bass+brush+chords+lead"` (`sketch-core.js`), `"Dez: \"With five neighbors in, the brushes and chords opened up!\""` (`dez.before[2]`) **VS** `" is on your brush..."` (`mural_stories.gd.select_scene.brush`) | Translating Dez/Rook's `"brush"` as a **paintbrush** (`pincel`/`cọ vẽ`/`فرشاة رسم`/`พู่กัน`)! | In Dez/Rook audio strings, `"brush(es)"` means **jazz wire drum brushes** (`es` `escobillas de batería`, `vi` `chổi gõ trống jazz`, `ar` `فرشاة الإيقاع (طبول الجاز)`, `th` `แปรงตีกลองแจ๊ส`). In Celeste's mural strings, it is a **paintbrush**! |
| **`"in pocket"` / `"80 BPM pocket"`** | `"Rook: \"...Jeffrey's lost 1961 LP and Honker Barnaby are right in pocket with our groove!\""` (`ROOK_LINES.completed[4]`), `"Dez: \"Hear that? Every neighbor you greet brings a new layer into our 80 BPM pocket.\""` (`dez.before[1]`), `"Rook: \"Speaker's warm and locked into an 80 BPM pocket...\""` (`ROOK_LINES.completed[0]`) | Clothing pocket (`bolsillo` / `túi áo` / `جيب` / `กระเป๋าเสื้อ`)! | Musical groove/tempo lock (`es` `compás / pulso de 80 BPM` & `en perfecta sintonía con nuestro ritmo`, `vi` `nhịp groove 80 BPM chắc gọn` & `ăn khớp nhịp nhàng`, `ar` `نبض إيقاعي متماسك بسرعة 80 نبضة/دقيقة` & `متناغمان تماماً مع إيقاعنا`, `th` `ร่องจังหวะ 80 BPM` & `เข้าจังหวะกับกรูฟของเราเป๊ะ`). |
| **`"stems"` / `"pad"` / `"downbeat"`** | `"%s (%d/%d stems)"` (`PANEL_TEXT.stems`), `"Harmonic pad stem unlocked · Groove: %s"` (`BURST_TEXT.mural_complete.detail`), `"...right on Dez's 80 BPM downbeat!"` (`clown_horn_walker.speech`) | Plant stems (`tallos`/`thân cây`/`سيقان`) or notepad/cushion (`almohadilla`/`وسادة`)! | `"stems"` = **audio tracks/layers** (`pistas`, `lớp âm thanh`, `مسارات صوتية`, `แทร็กเสียง`); `"Harmonic pad"` = **sustained chord layer** (`colchón armónico`, `lớp đệm hòa âm`, `طبقة تناغمية دافئة`, `เสียงคอร์ดแพดประสาน`); `"downbeat"` = **first strong beat of the bar** (`tiempo fuerte`, `phách mạnh đầu ô nhịp`, `النبضة القوية الأولى`, `จังหวะตก`). |
| **`"local cut"`** | `"Rook: \"Spinning your local cut (%s) on the Turk Street speaker...\""` (`ROOK_LINES.local`) | Wound/incision or meat cut! | User's **local audio file / track** from their device (`es` `tu pista local`, `vi` `bản nhạc trên máy của bạn`, `ar` `مقطعك الصوتي المحلي`, `th` `ไฟล์เพลงจากเครื่องของคุณ`). |
| **`"on the platter"`** vs **`"platter"`** | `"Evening! The tube amp is warm and a live 1961 jazz set is on the platter."` (`blue_valve_hifi[0]`) **VS** `"Shared platter"` / `"carry the platter"` (`meal.js`) | Serving dish inside a hi-fi record bar! | In `blue_valve_hifi[0]`, `"platter"` = **turntable platter** (`es` `en el tocadiscos`, `vi` `trên mâm đĩa than`, `ar` `على قرص الحاكي (الفينيل)`, `th` `บนแป้นเครื่องเล่นแผ่นเสียง`). In `meal.js`, it is a **large serving dish**. |
| **`"soul 45s"` / `"soul 45"`** | `"soul 45 on the jukebox"`, `"...cued to soul 45s."`, `"...jukebox soul 45s..."` (`copper_cue_tavern`) | Mysterious number `45` (age/year/count)! | **45 RPM 7-inch soul vinyl singles** (`es` `discos sencillos de soul de 45 RPM`, `vi` `đĩa đơn nhạc soul 45 vòng`, `ar` `أسطوانات السول المفردة (45 دورة)`, `th` `แผ่นเสียงเพลงโซลสปีด 45`). |
| **`"Order Up: %s"` & `"coming right up"`** | `"Order Up: %s"` (`eatery_counter_interact.burst`), `"One lemongrass beef pho, extra basil and lime, coming right up."` (`bowl_basil_pho[1]`) | Command/imperative `"Order upward"` or physical climbing! | Diner counter call when food is ready / on its way (`es` `¡Sale pedido: %s!` & `¡enseguida sale!`, `vi` `Món ra lò: %s` & `có ngay đây!`, `ar` `الطلب جاهز: %s` & `حاضر في الحال!`, `th` `เสิร์ฟแล้ว: %s` & `รอสักครู่ ได้เลย!`). |
| **`"Rack 'em up!"` & `"rack of pool"`** | `"Rack 'em up! The neighborhood pool table is open."` (`copper_cue_tavern[0]`), `"rack of pool"` (`EATERY_MENU_ITEMS.copper_cue_tavern[1]`) | Coat/oven rack (`"Still warm from the rack!"` in `Baker Mae`!) | Setting the triangle of billiard balls for a **game of pool** (`es` `¡A armar las bolas!` & `partida de billar`, `vi` `Xếp bi lên bàn nào!` & `ván bi-a`, `ar` `صفّ كرات البلياردو!` & `جولة بلياردو`, `th` `ตั้งลูกบิลเลียดเลย!` & `พูลหนึ่งเกม`). |
| **`"Roll Camera (Clear)"`** | `"Roll Camera (Clear)"` (`characters.HUB_LABELS.filmHold`) | `"Clear"` misread as `"delete/erase"` (`Borrar`/`مسح`)! | Here `(Clear)` means the sidewalk route is unobstructed / ready to shoot (`es` `Rodar toma (vía despejada)`, `vi` `Bấm máy (lối đi thông thoáng)`, `ar` `بدء التصوير (الممرّ سالك)`, `th` `เดินกล้อง (ทางโล่ง)`). |
| **`"holding you to it"` / `"Your call!"` / `"night owls"`** | `"Bea: \"That's neighbor power. ... I'm holding you to it!\""` (`bea.before[2]`), `"Bea: \"...Your call!\""` (`bea.before[0]`), `"...for the night owls."` (`open_seat_diner[2]`) | Physical gripping, phone call, or literal owls (`búhos`/`cú đêm`/`البوم`)! | `"I'm holding you to it!"` = warm `"¡Te tomo la palabra!"` / `"Cô nhớ lời hứa đó nha!"` / `"سآخذك على كلمتك!"` / `"จำคำพูดไว้เลยนะ!"`. `"Your call!"` = `"¡Tú decides!"` / `"Tùy bạn chọn!"` / `"القرار لك!"` / `"เลือกได้เลย!"`. `"night owls"` = late-night neighbors (`trasnochadores`, `khách thức khuya`, `الساهرين ليلاً`, `คนนอนดึก`). |

---

## 8. Proper Names, Do-Not-Translate Boundaries & Terminology Consistency (Category 5 — Severity: Medium)

### 8A. Master Do-Not-Translate (DNT) vs Transliterate vs Translate Governance Matrix

1. **Strict Do-Not-Translate (DNT) Brand & Artwork Sign Tokens:**
   - **`"Tenderloin Redux"`** (game brand title — DNT in `es`, `vi`; keep `"Tenderloin Redux"` or pair with script subtitle in `ar`/`th` per D8).
   - **`"RISE"`** on Celeste's mural board (`core.js` `SIGNS`, D8). **CRITICAL COLLISION IN `source.json`:** Four `msgid`s spell the `"RISE"` mural motif in Title Case: `"Paint Sun, Wave and Rise on the mural (%d/3)"` (`story.GODOT_TEMPLATES.current_objective.mural`), `" My Rise opens the scene on the left."`, `" My Rise carries it to the right."`, `" My Rise links the shapes together."` (`characters.COMPOSITION.rise*`), and `"Bea's Rise"` (`ending.text.GODOT_CONSTS["main.gd"].MURAL_MOTIF_LABELS.rise`). If translators translate `"Rise"` (`amanecer`/`sự vươn lên`/`نهوض`/`การตื่น`) while the drawn canvas sign literally says **`RISE`** in Latin letters, players cannot tell which of the 3 motifs is `"Rise"`! **Fix:** Write `"RISE"` (or gloss `"el letrero «RISE» de Bea"`, `"chữ «RISE» của cô Bea"`, `"لافتة «RISE» الخاصة ببيا"`, `"ป้าย «RISE» ของบี"`) so the spoken/HUD text connects to the visual `"RISE"` artwork!
   - **`"So What"`** & **`"Live at the Black Hawk"`** (`SURPRISES.jeffrey_record.*`, `main.gd.inspect_so_what_easter_egg.line`) — Real Miles Davis jazz composition (depicted in musical notation on the real 361 Turk St awning) and real 1961 Columbia Records album title. **DNT** (keep `'So What'` and `'Live at the Black Hawk'` in quotes!).

2. **Real San Francisco Streets, Buildings, Agencies & Organizations (`D8` Boundaries):**
   - **CRITICAL HOMONYM COLLISION — `"Larkin Street"` (Nonprofit Organization) vs `"Larkin Street"` (Thoroughfare):**
     - In `"Larkin Street describes support for young people experiencing homelessness in San Francisco, including housing, education and employment programs."` (`experiments/neighborhood-voices.json.records[2].summary`), **`"Larkin Street"` is the proper name of the real nonprofit organization *Larkin Street Youth Services*** — **NOT** the physical asphalt street in `visits/power.js` (`"Larkin Substation, 600 Larkin Street at Eddy"`)! Without a translator note, translators WILL translate `"Larkin Street describes..."` as `"La calle Larkin describe..."` / `"Đường Larkin mô tả..."` / `"يصف شارع لاركن..."` / `"ถนนลาร์กินอธิบายว่า..."` (nonsensical street personification!). **Fix:** Clarify English source to `"Larkin Street Youth Services describes..."` or add a mandatory DNT/org translator note (`"la organización Larkin Street Youth Services"`).
   - **Real SF Streets & Intersections (`Turk`, `Taylor`, `Eddy`, `Mason`, `Jones`, `Leavenworth`, `Hyde`, `Larkin`, `Ellis`, `Bryant`, `Alameda`, `Dodge Alley`):** In **`es`** and **`vi`**, keep English street names intact (`380 Eddy St`, `Turk & Taylor`, or `calle Turk con Taylor` / `góc đường Turk & Taylor` while preserving `Turk`/`Taylor` spelling for map matching). In **`ar`** and **`th`**, keep street numbers in Western digits (`380`, `246`, `145`, `361`, `600`) and pair phonetic street names with Latin street labels where players must match map pins (`380 Eddy St` / `Larkin`) — **`needs native reviewer`**.
   - **Real Landmarks, Nonprofits & Government/Technical Entities (Keep recognizable / DNT acronyms):** `Boeddeker Park`, `Cadillac Hotel`, `TL145` (`145 Leavenworth`), `Black Hawk`, `Compton's Cafeteria` (`Compton's Corner`), `Tenderloin Museum`, `TNDC` (Tenderloin Neighborhood Development Corporation), `GLIDE` / `Glide`, `Faithful Fools`, `San Francisco Animal Care & Control` (`SFACC`), `San Francisco Department of Elections`, `PG&E`, `CPUC`, `Exponent`, `National Park Service`, `Association of Ramaytush Ohlone`, `Ramaytush Tribe`, `OpenStreetMap` (`ODbL`, `PDDL`, `City EAS` / `SF EAS`, `CNN`).

3. **Character Names vs Titled Surprise Personas:**
   - **Given Names (DNT in `es`/`vi`; consistent phonetic script transliteration in `ar`/`th`):**
     - Core 5: `Bea`, `Celeste`, `Dez`, `Rook`, `Thanh` (`vi` keeps **`Thanh`** without inventing an arbitrary tone mark unless specified by the creator on the character sheet — **`needs native reviewer` / creator confirmation** whether `Thanh` is level-tone `Thanh` or `Thành`/`Thạnh`!).
     - Unseen Mural Contributor **`"Lulu"`** in `"Lulu's Sun"` (`ending.text.GODOT_CONSTS["main.gd"].MURAL_MOTIF_LABELS.sun`): Needs translator note explaining **Lulu is a fictional neighbor** who contributed the sun motif (not a brand or slang word!).
     - Creator Easter Egg **`"Jeffrey"`** in `"Jeffrey's Lost 1961 Record"` (`SURPRISES.jeffrey_record.*`) and historical jazz trumpeter **`"Miles Davis"`** (`MUSEUM_DOCENT_LINES[1]`).
     - Cook & Share neighbors & real cited recipe authors: `Nura`, `Mei`, `Mali`, `Grace`; `Ghinwa Alameen` (*Syrian Cooking*), `Bill Leung` & `Ginny` (*The Woks of Life*), `Pailin Chongchitnant` (*Hot Thai Kitchen*), `Kardea Brown` (keep book/blog titles in original English with optional gloss so readers can look up the real sources!).
     - Dog story owners & dogs: `Mara`, `Imani`, `Pippin`, `Junebug` (keep dog names `Pippin` and `Junebug` consistent across `NAMES` and `NOTES`).
   - **Titled / Descriptive Surprise Speaker Names (Translate the title/epithet, keep the personal name!):**
     - `"The Block Mayor"` (translate completely), `"Viking Rider"` (translate completely), `"Neighbor"` (translate completely), `"Baker Mae"` (`es` `Panadera Mae`, `vi` `Thợ bánh Mae`, `ar` `الخبّازة ماي`, `th` `เชฟขนมเม`), `"Chef Zafira"` (`Chef Zafira` / `Đầu bếp Zafira` / `الشيف زافيرة` / `เชฟซาฟิรา`), `"Pip the Tiny Dino"` (`Pip, el pequeño dino` / `Khủng long tí hon Pip` / `بيب الديناصور الصغير` / `พิพ ไดโนน้อย`), `"Honker Barnaby"` (`Barnaby el de la bocina` / `Barnaby bấm còi` / `بارنابي صاحب البوق` / `บาร์นาบีมือบีบแตร`), `"Nacho Captain Rico"` (`Capitán Nacho Rico` / `Đội trưởng Nacho Rico` / `كابتن الناتشو ريكو` / `กัปตันนาโช่ ริโก`), `"Starlight"` / `"Starlight Vee"` (stage persona — keep `Starlight` or gloss stage name consistently).

4. **Fictional Eateries, Dishes & Chapter/Episode/Film Titles (MUST Be Translated):**
   - **6 Fictional Eateries** (`Bowl & Basil Pho Counter`, `Saffron Clay-Oven Naan & Curry`, `The Blue Valve Vinyl & Hi-Fi Bar`, `Morning Star Banh Mi & Coffee`, `Copper Cue Tavern & Billiards`, `Open Seat Diner & Pie Counter`): All 6 are explicitly tagged `(fictional)` — translate descriptively (with `ar`/`th` script adaptation and `vi` natural Little Saigon shop naming).
   - **Fictional Short Film, Chapters & Side-Story Titles (Translate all!):** `"The Open Seat"`, `"Before These Streets"`, `"Cook & Share"`, `"Election Walk: November 2024"`, `"Power stories"` / `"Lights Back On"`, `"Two Dogs Home"`, `"Halloween: Lantern Procession"`, `"Tenderloin to the Stars"`, plus all 5 chapter titles (`"Meet the Block"`, `"Paint the Mural"`, `"The Gathering"`, `"A Listening Hour"`, `"What Stays Open"`).

---

### 8B. Seven Net-New Terminology Inconsistencies in `i18n/source.json`

*(Excluding `"Transgender District"` vs `"Transgender Cultural District"` and `"uprising"` vs `"Riot"`, already recorded in `docs/I18N_ADVICE.md`.)*

1. **`"Starlight"` vs `"Starlight Vee"` (Same Drag Performer Named Two Ways):**
   - `"Starlight"` (`visits.surprises.SURPRISES.impromptu_drag_show.speaker`), `"Starlight's fan & tiara on Thanh's crate"` (`KEEPSAKES.impromptu_drag_show.label`) **vs** `"“Starlight Vee rolled out a magenta runway...”"` (`characters.SURPRISE_MEMORY.thanh.first`) and `"“Starlight Vee's surprise drag runway...”"` (`SURPRISE_MEMORY.thanh.both`).
   - **Fix:** Unify on `"Starlight Vee"` (or `"Starlight"`) across `surprises.js` and `characters.js`, or document in translator notes that both refer to the same performer.

2. **`"Bea's rollator"` vs `"Bea's walker"` (Same Mobility Aid):**
   - `"Bea: \"Thanh set out folding stools, and I made sure my rollator and strollers still have a wide sidewalk lane.\""` (`characters.NEIGHBOR_LINES.bea.before[1]`) **vs** `"Golden ribbon rosette on Bea's walker"` (`KEEPSAKES.mayor_pomp_event.label`) and `"Mae's donut & bagel box on Bea's walker"` (`KEEPSAKES.good_donut_and_bagel.label`) and `"Thanh: \"Bea taught me to keep the sidewalk wide enough for walkers, strollers...\""` (`thanh.before[4]` — note `"walkers"` in `thanh.before[4]` means **mobility walkers**, NOT pedestrians! Huge translation trap!).
   - **Fix:** Add a critical translator note that `"walkers"` in `thanh.before[4]` (paired with `"strollers"`) means **wheeled mobility walkers (`andadores` / `khung tập đi` / `مشّايات طبية` / `วอล์กเกอร์ช่วยเดิน`)**, NOT `"pedestrians"` (`peatones` / `người đi bộ`), and use one consistent term for Bea's wheeled walker across all 4 `msgid`s!

3. **Five Variants for the Chapter 4 Civic Event (`"Listening Hour"` / `"Listening hour"` / `"Tenant Listening Circle"` / `"tenant listening circle"` / `"Tenant Circle"`):**
   - `"A Listening Hour"` (`STORY_CHAPTERS[3].title`), `"Listening Hour"` (21 `ending/*` `msgid`s), `"Listening hour"` (`rewards.CUE_REASONS.civic_planning`), `"Tenant Listening Circle Complete!"` (`BURST_TEXT.civic_complete.title`), `"Hold the tenant listening circle"` (`current_objective.civic`, `bea.open[0]`, `ROOK_LINES.completed[2]`), `"Hold Tenant Circle"` / `"Tenant Circle (Done)"` (`HUB_LABELS.civic*`, `thanh.open[0]`).
   - **Why:** If translators render `"Listening Hour"` (`Hora de escucha`) and `"Tenant Circle"` (`Círculo de inquilinos`) with unrelated terms, tutorial prompts like `"Follow takes you to 'Hold Tenant Circle'"` + `"Listening Hour is focused"` break player navigation!
   - **Fix:** Establish one canonical full term and one canonical short button term per locale in the glossary, and harmonize capitalization.

4. **`"Helper bench"` vs `"Helper workshop"` (Same Finale Scene Referenced Under Different Names):**
   - `"Helper bench | Lift the three pictures"` (`ending.text.GODOT["helper_bench.gd"].setup.heading`), `"Watch your film, then open Revisit finale on the helper bench."` (`orbital_commons.gd.return_home.tail`) **vs** `"Helper workshop"` (`film_screening.gd.refresh.workshop`, `main.gd.open_helper_bench.workshop`) and `"A small workshop invitation is open on the screening panel: Helper workshop."` (`film_screening.gd.refresh.invitation`).
   - **Why:** In English `"bench"` means **workbench** here, NOT a park bench (`"bench and some trees"` in `bea.before[3]`)! Without unification and a note, `"Helper bench"` translates as `"Banco de parque del ayudante"` (`park seat`) while the button says `"Taller del ayudante"` (`Helper workshop`)!
   - **Fix:** Unify on `"Helper workshop"` (or translate `"Helper bench"` explicitly as `"mesa de trabajo / taller del ayudante"`, never park bench!).

5. **`"Power stories"` vs `"Power Story"` vs `"Lights Back On"` (Three Titles for One Side Story):**
   - `"Power stories"` (`visits.picker.TITLES[2]`), `"Power Story"` (`main.gd.update_walk_control.power`, `power.TEXT.objective.*`), `"Lights Back On | %d/3"` (`power.TEXT.refresh.heading`), `"Lights Back On"` (`story_picker.gd.remember_completed.festival`).
   - **Why:** `"Choose Power Story to walk to..."` refers specifically to the HUD walk-control button `"Power Story"`, which must match `main.gd.update_walk_control.power` verbatim!
   - **Fix:** Keep button cross-references locked to the exact localized button string for `"Power Story"`.

6. **`"block party"` vs `"block gathering"` vs `"The Gathering"`:**
   - `"Open Block Party!"` (`ACTION_LABELS.open`), `"Plan Party Schedule"` (`HUB_LABELS.programme`), `"Start Hosting Party"` (`HUB_LABELS.programmeStart`), `bea.almost` **vs** `"The Gathering"` (`STORY_CHAPTERS[2].title`), `"Our Turk Street block gathering is open"` (`BLOCK_TEXT.opened`), `"Open the neighborhood gathering"` (`meal.TEXT.open_meal.closed`).
   - **Fix:** Glossary note: keep a warm neighborhood gathering register (`convivio / fiesta de la cuadra`, `buổi sum họp khu phố`, `لقاء الحيّ الاحتفالي`, `งานสังสรรค์ประจำซอย`) rather than a loud nightclub `"party"` (`حفلة صاخبة` / `ปาร์ตี้`).

7. **`"Portable Mural Board"` vs `"sidewalk easel"` vs `"street board"` vs `"Celeste's Shared Panel"` / `"Shared art panel"`:**
   - All five refer to Celeste's freestanding 6-shape sidewalk mural board. Document in glossary so translators don't invent five incompatible physical objects.

---

## 9. Ready-to-Add Proposed Context Keys (`msgctxt`) and Translator Notes

### 9A. Proposed `msgctxt` Context Keys to Split or Disambiguate `i18n/source.json`

| Exact `msgid` | `paths` in `i18n/source.json` | Proposed `msgctxt` | Disambiguated Meaning for Translators |
| --- | --- | --- | --- |
| `"Complete"` | `ending.text.GODOT["programme_gathering.gd"].refresh.complete` | `status.complete` | Status adjective/badge: this hosted gathering is already finished. |
| `"Complete"` | `rhythm.RHYTHM_TEXT.complete` | `action.complete_rhythm` | Imperative button: finish hosting Dez's Rhythm Circle segment. |
| `"Gathering"` | `ending.text.GODOT["orbital_commons.gd"].refresh.gathering` | `orbital.gathering_tab` | Action/tab button for the final neighborhood gathering in Orbital Commons. |
| `"Gathering"` | `visits.dogs.LEADS[2]`, `dog_story.gd.LEADS[2]` | `dogs.lead_gathering_site` | Physical search location on Turk St (the block gathering area where owners wait). |
| `"On"` | `ending.text.GODOT["mural_stories.gd"].present.on` | `toggle.music_on` | State value after `Music:` (soundtrack enabled). |
| `"On"` | `rhythm.RHYTHM_TEXT.on` | `toggle.rhythm_on` | State value toggled on `Music` or `Step cues` button (prefer atomic button labels). |
| `"Off"` | `ending.text.GODOT["mural_stories.gd"].present.off` | `toggle.music_off` | State value after `Music:` (soundtrack muted). |
| `"Off"` | `rhythm.RHYTHM_TEXT.off` | `toggle.rhythm_off` | State value toggled on `Music` or `Step cues` button (prefer atomic button labels). |
| `"Back"` | `ending.text.GODOT["programme_studio.gd"].refresh.back` | `nav.step_back_studio` | Button stepping back from sub-view/gathering to the Programme Studio pinboard. |
| `"Back"` | `rhythm.RHYTHM_TEXT.back`, `visits.{dogs,election,lantern,power}.TEXT.setup.back` | `nav.return_to_block` | Button closing the overlay reader and returning to Turk Street (preserving visit state). |
| `"Continue"` | `story.GODOT_TEMPLATES.show_story_card.resume` | `story_card.continue` | Button dismissing a chapter title card to continue playing on the block. |
| `"Continue"` | `visits.picker.TEXT.refresh.continue` | `visit_picker.continue` | Button resuming a previously started side-story visit from the Story Picker. |
| `"Previous"` | `ending.text.GODOT["orbital_commons.gd"].refresh.previous` | `panel.previous` | Pagination button: go to the previous illustrated still panel. |
| `"Previous"` | `ending.text.GODOT["programme_gathering.gd"].setup.previous` | `programme.previous_turn` | Navigation button: view the previous hosted programme segment/turn. |
| `"Ready"` | `characters.PANEL_TEXT.scReady` | `hud.soundcheck_ready` | Equipment status badge (`Soundcheck: Ready`): Rook's speaker check is done. |
| `"Pending"` | `characters.PANEL_TEXT.scPending` | `hud.soundcheck_pending` | Equipment status badge (`Soundcheck: Pending`): Rook's speaker check not yet done. |
| `"Playing"` | `characters.PANEL_TEXT.playing` | `hud.music_playing` | Audio status badge: background music is currently playing. |
| `"Paused"` | `characters.PANEL_TEXT.paused` | `hud.music_paused` | Audio status badge: background music is currently paused. |
| `"Invite"` | `ending.text.GODOT["programme_gathering.gd"]._draw.invite` | `board_badge.invited` | Visual pinboard connector badge showing two turns were linked by a neighbor handoff. |
| `"Opening"` | `ending.text.GODOT["programme_gathering.gd"]._draw.opening` | `board_badge.opening` | Visual pinboard connector badge showing an unhurried pause/space held between turns. |
| `"Draft"` | `ending.text.GODOT["programme_studio.gd"].refresh.draft` | `studio.tab_draft` | Tab button for the editable draft schedule pinboard (NOT beer draft or air draft). |
| `"Art"` | `ending.habitat.TITLES[0]`, `habitat_room.gd.TITLES[0]` | `habitat.item_art` | Selectable copy of Celeste's 6-shape art panel inside the habitat room model. |
| `"Film"` | `ending.habitat.TITLES[1]`, `habitat_room.gd.TITLES[1]` | `habitat.item_film` | Selectable copy of Dez's 3-frame illustrated film stand inside the habitat room model. |
| `"Seats"` | `ending.habitat.TITLES[2]`, `habitat_room.gd.TITLES[2]` | `habitat.item_seats` | Selectable copy of Thanh's quiet sidewalk chairs & open cushion in the room model. |
| `"Entry"` | `ending.habitat.NAMES[0]`, `habitat_room.gd.NAMES[0]` | `habitat.place_entry` | Room doorway/entrance placement zone (NOT text input or list entry). |
| `"Window"` | `ending.habitat.NAMES[1]`, `habitat_room.gd.NAMES[1]` | `habitat.place_window` | Architectural room window placement zone (NOT browser/OS application window). |
| `"Across"` | `ending.text.GODOT_CONSTS["habitat_room.gd"].RELATIONS[0]` | `habitat.grid_across` | 2×2 room grid geometry button: facing across the same horizontal row. |
| `"Along"` | `ending.text.GODOT_CONSTS["habitat_room.gd"].RELATIONS[1]` | `habitat.grid_along` | 2×2 room grid geometry button: facing along the same vertical column. |
| `"Corner"` | `ending.text.GODOT_CONSTS["habitat_room.gd"].RELATIONS[2]` | `habitat.grid_corner` | 2×2 room grid geometry button: facing diagonally across the room center. |
| `"Hit"` | `rhythm.RHYTHM_TEXT.padHit` | `rhythm.step_hit` | Musical beat/tap active on an 8-step drum bar pad (NOT punch/attack or hit song). |
| `"Rest"` | `rhythm.RHYTHM_TEXT.padRest` | `rhythm.step_rest` | Musical rest/silence on an 8-step drum bar pad (NOT sleep or remainder). |
| `"March"` | `visits.lantern.TEXT.refresh.march` | `lantern.action_march` | Imperative button: walk forward in the paper-lantern procession (NOT month of March!). |
| `"Assembly"` | `visits.lantern.TEXT.objective.assembly` | `lantern.phase_assembly` | Phase/location label: neighbors gathering to fold paper lanterns on Turk St. |
| `"Welcome"` | `visits.lantern.TEXT.refresh.welcomeLabel` | `lantern.action_welcome` | Imperative button: share the closing neighborhood welcome at the end of the loop. |
| `"Welcome!"` | `visits.lantern.TEXT.refresh.welcome` | `lantern.status_welcomed` | Completed button/status after welcoming the lantern procession home. |
| `"Earlier"` | `visits.picker.TEXT.setup.earlier` | `picker.page_prev` | Pagination button: show previous page of side stories in the picker (not time of day). |
| `"Later"` | `visits.picker.TEXT.setup.later` | `picker.page_next` | Pagination button: show next page of side stories in the picker (not time of day). |
| `"Return"` | `visits.before-streets.TEXT.setup.return` | `prologue.action_return` | Button closing the historical landscape prologue to return to the street chapter. |
| `"Stop"` | `ending.text.GODOT["orbital_commons.gd"].setup.stop` | `walk.action_stop` | Button stopping avatar walking movement in Orbital Commons (not audio stop). |
| `"Close"` | `characters.BUTTON_TEXT.close` | `ui.action_close` | Button dismissing/closing an open UI panel (verb, not adjective "near"). |

---

### 9B. Ready-to-Add Translator Notes (`i18n/notes.json`)

1. **`visits.dogs.*` (`"Choose a lead"`, `"choose a lead"`, `"Walk to lead"`, `"Your selected lead: "`, `" from the notes. Walk there to look; a lead is not a confirmed sighting."`):**
   > `"lead"` here means an **investigative clue / sighting tip** about where a lost dog was last seen — **NEVER** a dog leash!
2. **`rewards.CUE_REASONS.Meet` (`"Warm Brush Stem"`), `characters.NEIGHBOR_LINES.dez.before[2]` (`"brushes and chords"`), `sketch-core.MUSIC_TEXT.stemSummary` (`"%s (%d/%d stems)"`):**
   > Musical audio terms: `"brush"` / `"brushes"` = **wire jazz drum brushes** (NOT paintbrushes); `"lead"` (`Sidewalk Lead Stem`) = **melodic lead instrument track**; `"stems"` = **layered audio tracks**; `"Harmonic pad"` = **sustained chord layer**.
3. **`rhythm.RHYTHM_TEXT.playBar` / `.stopBar` (`"Play\nBar"`, `"Stop\nBar"`):**
   > `"Bar"` is **one 8-step musical measure** of drum beats — **NOT** a tavern/drinking bar!
4. **`characters.ROOK_LINES.local` (`"Spinning your local cut (%s)..."`):**
   > `"local cut"` = a local audio file selected from the player's own device (stays in browser memory, never uploaded).
5. **`visits.landmarks.EATERY_HOST_LINES.blue_valve_hifi[0,1]` (`"...on the platter."`, `"A zero-proof botanical highball..."`) & `copper_cue_tavern[0,1]` (`"Rack 'em up!"`, `"cold draft"`, `"soul 45s"`):**
   > `"on the platter"` = spinning on the vinyl **turntable platter** (not a food plate). `"zero-proof"` = **0% alcohol / non-alcoholic**. `"cold draft"` = **chilled draft beer from a tap** (not cold air or a rough draft). `"soul 45s"` = **45 RPM 7-inch soul vinyl singles**. `"Rack 'em up!"` / `"rack of pool"` = **setting billiard balls for a game of pool**.
6. **`characters.NEIGHBOR_LINES.thanh.before[4]` (`"...wide enough for walkers, strollers..."`) & `bea.before[1]` (`"my rollator"`):**
   > `"walkers"` here means **wheeled mobility walkers** (matching Bea's rollator/walker in `KEEPSAKES`), **NOT** pedestrians!
7. **`ending.text.GODOT["helper_bench.gd"].*` (`"Helper bench | Lift the three pictures"`):**
   > `"bench"` here is a **craft workbench** (same activity called `"Helper workshop"` on the film screening button), **NOT** a park seating bench.
8. **`characters.HUB_LABELS.filmHold` (`"Roll Camera (Clear)"`):**
   > `"(Clear)"` means the sidewalk path is **unobstructed and ready to shoot** — **NOT** erase/clear!
9. **`experiments/neighborhood-voices.json.records[2].summary` (`"Larkin Street describes support for young people experiencing homelessness..."`):**
   > `"Larkin Street"` here is the proper name of the real San Francisco nonprofit **Larkin Street Youth Services** — **NOT** the physical street! Keep the organization name intact and use respectful, person-first phrasing for young people experiencing homelessness.
10. **`story.GODOT_TEMPLATES.current_objective.mural` & `characters.COMPOSITION.rise*` (`"Paint Sun, Wave and Rise..."`, `" My Rise opens..."`) & `MURAL_MOTIF_LABELS.sun` (`"Lulu's Sun"`):**
    > `"Rise"` refers to Bea's mural lettering sign **`RISE`** (which stays `"RISE"` in Latin letters on the canvas artwork per D8 — keep `"RISE"` visible or glossed so players can identify the motif). `"Lulu"` in `"Lulu's Sun"` is an unseen fictional neighbor who contributed the sun motif.
11. **`characters.CAPTION_TEXT.goodbye` (`"You said goodbye to %s."`) & `story.GODOT_TEMPLATES.current_objective.*Hint` (`"%s is %s"`):**
    > In `"%s is %s"`, the 2nd `%s` is a distance/direction phrase (`"right here"`, `"nearby"`, `"about 2 blocks west"`). In **`ar`**, translate those distance phrases as gender-invariant prepositional locatives (`هنا تماماً`, `على بُعد...`) so they work for both masculine and feminine subjects; in **`es`**, include prepositional `a` inside the block/meter phrases (`"a unas %d cuadras..."`).
12. **All 13 `"when you are ready"` / `"when ready"` `msgid`s & `bea.before[4]` `"Lost?"` (`es` gender-neutrality rule):**
    > In **`es`**, never use gendered player adjectives `"listo/lista"` or `"¿Perdido/Perdida?"`. Use `"cuando quieras"` / `"cuando tengas todo listo"` / `"a tu ritmo"` and `"¿Te perdiste?"` / `"¿No sabes por dónde ir?"`.
13. **`visits.meal.RECIPES[0..3].*` (Culinary & Dietary Precision):**
    > - `RECIPES[0]` (`Kibbeh bil sanieh`): Use native Arabic **`كبّة بالصينية`** in `ar`.
    > - `RECIPES[1]` (`Lo bak go`): Must specify **non-glutinous / regular rice flour** (`bột gạo tẻ` in `vi`, `แป้งข้าวจ้าว` in `th`, never glutinous!), clarify `"cake"` means a **savory radish cake** (not sweet pastry), and keep `"Chinese sausage"` (*lap cheong*, pork) transparent for **`ar`** readers.
    > - `RECIPES[2]` (`Beef pad kra pao`): Must specify **Thai holy basil** (`ผัดกะเพราเนื้อ` / `ใบกะเพรา` in `th`, never misspelled `กระเพรา` and never sweet basil `โหระพา`!).
    > - `RECIPES[3]` (`Gullah Geechee red rice`): Keep **`Gullah Geechee`** and **South Carolina `Lowcountry`** African American heritage explicit, and keep **`smoked pork sausage`** (`لحم الخنزير`) explicit in **`ar`**.
14. **`visits.before-streets.*` (Ramaytush Ohlone Homeland & Non-Consultation Disclaimer):**
    > Keep **`Ramaytush`**, **`Ramaytush Ohlone`**, and **`Yelamu`** intact (with phonetic script + Latin parenthetical in `ar`/`th`). Preserve living-present-tense homeland framing and translate `"consultation and cultural acceptance have not occurred"` with exact ethical fidelity (**`needs native reviewer`**).
15. **UI Button Cross-References Inside Prose (`Back`, `Keep exploring`, `Power Story`, `Dog search`, `Election map`, `Make map`, `Check path`, `Walk to relay`, `Battery view`, `Gather here`, `Keep welcome open`, `Ready together`, `Follow this invitation`, `What's Next?`, `Spot Surprise`):**
    > Over 45 instructional sentences name an on-screen button inline without quotation marks in English (e.g., `"Other stories, then Keep exploring"`, `"Choose Walk to relay"`, `"Gather here brings everyone..."`). Wrap inline button references in locale quotation marks (`«…»` or `“…”`) and ensure **100% verbatim lexical match** with the translated button label!

QA-COMPLETE 1488