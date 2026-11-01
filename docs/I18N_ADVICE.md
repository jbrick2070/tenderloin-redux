# Language advice for the localization plan

On November 1, 2026 the creator asked for a second opinion on `docs/I18N_PLAN.md` from Gemini 4 Argon. It ran read-only (`agy --model gemini-4-argon-high --mode plan`). Its full answer is kept in `docs/i18n-advice/gemini-4-argon-2026-11-01.md`.

This page sorts that answer into three groups:
- engineering claims checked against the code and Node's `Intl`;
- one claim that proved wrong;
- language and community advice that only a native reviewer can confirm.

Nothing here changes a decision in section 7 of the plan. The work package each item belongs to is named in brackets.

## Checked and correct

- **Spanish plurals.** `Intl.PluralRules('es')` has three categories: `one`, `many` (millions) and `other`. A validator that required an exact category match would reject every ordinary Spanish `{one, other}` entry, including the plan's own 2.4 example. The rule is now:
  - `other` is required;
  - every key must be one of the locale's categories;
  - a missing category falls back to `other`.

  [I1]
- **Thai grapheme fallback.** The plan's fallback regex `/\P{M}\p{M}*/gu` splits คำ into `ค` and `ำ`, because U+0E33 (SARA AM) and U+0E32 (SARA AA) are letters, not marks. The fallback must keep these with their consonant. Section 8's line-start check must also forbid them, as well as U+0E45, and must forbid a line that ends in a leading vowel (U+0E40 to U+0E44). [I4]
- **Speaker envelopes.** `bubble.js` `spokenText` strips a `Name: "…"` envelope only when the name is at most 12 UTF-16 code units long. Translated or transliterated Arabic and Thai names and titles are often longer, for example "Bea (fictional neighbor)" or "Pip the Tiny Dino". The limit must come from the locale's own names, not a fixed 12. [I2b/I4]
- **Thanh's pronoun.** Two English strings already say "him" for Thanh: the film hold in `game.js` and `ending/text.js` "Invite him again". The plan lists Thanh's gender as unclear (1.3.8). The creator should confirm it on the character sheet. [I5]
- **Unaccented Vietnamese words in the source.** The source has "Banh Mi" and "Pho" without diacritics, for example "Morning Star Banh Mi & Coffee" in `visits/text.js`. The plan quotes them as "Bánh Mì". In the `vi` catalog these fictional business names should get their diacritics back. D8 keeps real business names as written; these businesses are fictional. [I5/I6]
- **Lowercased names.** `muralEditor` builds "Place ${label.toLowerCase()} anywhere…" from labels such as "Lulu's sun". In Spanish that lowercases the name, giving "el sol de lulu". It needs a whole-sentence template. [I2a]
- **"TAYLOR TO HYDE".** Translating "TO" on its own cannot produce Spanish "DE TAYLOR A HYDE". The street labels need a template with two placeholders. [I2a]
- **The compass letter.** In Vietnamese, N reads as Nam (South) and Bắc is North. The plan's `vi` compass "B" is right. The Larkin substation map's own "N" (`power_story.gd` `map2`) needs the same change. [I2e]
- **Fonts and text direction inside image SVGs.** SVG data-URI images, such as `postcardSVG` with `font-family="Georgia,serif"`, the civic plan and the programme board, do not inherit the page's `:lang()` font stacks or its `dir`. Each SVG needs its own locale font and direction. [I2c/I3]
- **The plan's catalog format.** It has no way to combine `address.m`/`address.f` (D5) with a plural or a `narrow` variant. Arabic needs this for lines such as "Have you spotted %s yet? … (%d/%d surprises found)". The schema must allow address variants of a plural or select object. [I1/I6]

## Checked and wrong

- **U+2060 WORD JOINER and Thai word segmentation.** The adviser said U+2060 does not stop `Intl.Segmenter('th', {granularity: 'word'})` from splitting a name. In Node it does: "สวัสดี⁠ครับ" with a joiner came back as one segment. The plan's `keepWhole()` approach stands. Each browser in 3.5 still needs a test of it in I4, along with a check that joiners do not disturb how the marks are drawn.

## For the native reviewers and the creator

These are not checked, and nothing changes on the adviser's word. Each goes to the reviewer for that language, as D3 says, and onto the character sheet.

- **Spanish.**
  - Use `tú` with `ustedes`, and avoid `vos` in writing.
  - Never use "coger".
  - Prefer neutral verb forms in the interface ("Te damos la bienvenida", not "Bienvenido/a").
  - Use an ungendered term of endearment for the drag show's "darling!" ("¡cariño!").
  - Younger neighbors may say `usted` to Bea: a question for the character sheet.
- **Vietnamese.**
  - Use the Southern diaspora usage of Little Saigon, which is on Larkin Street, next to the game's Eddy corridor.
  - Avoid mainland administrative terms.
  - Use Southern food words: trà lài, chả giò.
  - Neighbors speak to the player with "mình"/"bạn" rather than a stiff "tôi"/"bạn".
  - Bea is "cô Bea" to the younger neighbors, never "bác". Do not pair "cô" with "bạn".
  - Give each character their own sentence-final particles.
- **Arabic.**
  - Keep warm Modern Standard Arabic (D5) rather than any one dialect, given the Yemeni families and the other Arabic-speaking families in the neighborhood.
  - Write active sentences, not "تمّ + verbal noun" bureaucratic Arabic.
  - Name the form-of-address setting "صيغة المخاطبة" (how neighbors address you), never "gender".
  - Offer it when Arabic is chosen on the startup card, before the first chapter speaks to the player. This changes the D5 flow and is the creator's decision with the Arabic pilot reviewer.
  - Write foreign dish names in Arabic script with a gloss, not in Latin letters. This changes plan 4.5 for Arabic.
- **Thai.**
  - Never use "ดิฉัน" in neighbor dialogue.
  - Drop "คุณ" from interface labels and objectives.
  - Give each character a first-person pronoun and particles. Bea's พี่ or ป้า is a creator decision.
  - Keep historical years as Gregorian years, never Buddhist Era (1966, not พ.ศ. 2509). `scripts/i18n.mjs check` should test that.
  - Write foreign dish names in Thai script.
- **All languages.**
  - The English uses both "The Transgender District" and its older name "Transgender Cultural District", and both "1966 uprising" and "Riot". Translations need one rule for which to use where.
  - Godot's " , selected" has a stray space before the comma. It joins the D14 list of source defects that translations quietly fix.
