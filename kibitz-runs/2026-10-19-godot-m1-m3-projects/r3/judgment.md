# Driver Judgment — Godot Round 7 (`2026-10-19-godot-m1-m3-projects`, r3)

- **Driver**: `AGY 4` (`Gemini 4 Argon` High)
- **Independent Reviewer**: `Claude Opus 5.5` High (`claude.md`, `rc=0`)

## Claim-by-Claim Verification Against Source

### MUST-FIX
1. **Hosting value sets mismatch (`public/hosting.js` vs `godot/main.gd`)**:
   - **Verified**: `public/hosting.js:3-5,12` defines `STORY_CHOICES = {memory, future}`, `TILE_PALETTES = {warm, cool}`, `QUIET_CHOICES = {arc, pairs}`, and `beats` `0..255` (where `0` is Dez's listening round). `godot/main.gd` previously had `HOSTING_STORIES = ["welcome", "memory", "thanks"]`, `HOSTING_PALETTES = ["warm", "sea", "dusk"]`, `HOSTING_QUIETS = ["tea", "stretch", "listen", "arc"]`, and required `beats >= 1`.
   - **Resolution**: Adopted in `godot/main.gd`: updated `HOSTING_STORIES`, `HOSTING_PALETTES`, and `HOSTING_QUIETS` to match `public/hosting.js` 1:1; allowed `beats` `0..255` (`0` = listening round) in `host_toggle_beat`, `host_complete_current`, `validate_godot_hosting`, and `inspect_browser_save_json`; updated `programme_segment_color` and `hosting_tile_color` to match `public/programme.js` and `public/hosting.js` `TILE_PALETTES`.
2. **Real browser v1 save fixture in `study_test.gd` and `tests/godot-browser.mjs`**:
   - **Verified**: `study_test.gd` and `tests/godot-browser.mjs` previously did not test importing a genuine `public/core.js`-serialized M1/M3 save containing `future`, `0` (listening round), `cool`, and `pairs` into a clean Godot state.
   - **Resolution**: Adopted in both `godot/tests/study_test.gd` and `tests/godot-browser.mjs`. `tests/godot-browser.mjs` now imports `initialState`, `applyAction`, and `serializeSave` directly from `public/core.js`, drives all M1/M3 actions (`photo`, `pack`, `return-loan`, `programme-*`, `host-beat` down to `0`, `host-quiet: "pairs"`, `host-story: "future"`, `host-palette: "cool"`, `host-complete`), clears the Godot save, reloads, imports via `KeyI`, and asserts all 4/4 hosted segments are restored intact.
3. **`ProgrammeSignboard` reads `programme_published` instead of `hosting_order` when hosting has started (`public/world.js:221` parity)**:
   - **Verified**: `public/world.js:221` renders `hosting.order` when hosting has started, falling back to `programme.published`.
   - **Resolution**: Adopted in `godot/main.gd` (`update_block_3d` uses `var board_order: Array[String] = hosting_order if not hosting_order.is_empty() else programme_published` and `get_a11y_status_snapshot` includes `hosting_order`).
4. **`inspect_browser_save_json` keepsake `photo` validation (`public/core.js:136-138` parity)**:
   - **Verified**: `public/core.js:136-138` accepts `photo.status === 'taken'` only when every participant is in `PHOTO_GUESTS`, `layout` is `'table'` or `'floor'`, `palette` is valid, and `photo.mural` has all 3 motifs. `godot/main.gd` previously filtered invalid participants and fell back to the live mural/palette/layout.
   - **Resolution**: Adopted in `godot/main.gd` (`inspect_browser_save_json` now requires all four conditions on `raw_ph` without falling back to the live mural/palette/layout, and `study_test.gd` verifies rejection of a browser save whose keepsake photo includes `"rook"`).
5. **Unbound helper APIs vs keyboard reachability**:
   - **Verified**: `set_programme_draft` and `programme_remove` were unused, and `skip_keepsake_photo` / hosting choice customization were only reachable programmatically.
   - **Resolution**: Removed unused `set_programme_draft` and `programme_remove`, and bound `Shift+Y` to `skip_keepsake_photo()` and `Shift+Z` to `cycle_programme_or_hosting_choice()` so all M1/M3 choices (`future`/`memory`, `0`/`85` beats, `cool`/`warm` palette, `pairs`/`arc` quiet seating, and programme order) are reachable via keyboard in addition to the programmatic API.

### SHOULD-FIX & CUT THESE
1. **`advance_programme_and_hosting_step` overwriting non-empty invalid draft**: Fixed — only populates `PROGRAMME_DEFAULT_ORDER` when `programme_order.is_empty()`, returning `"programme_blocked"` if a non-empty draft has an issue.
2. **Check boolean return of `take_keepsake_photo` and `host_start` in step helpers**: Fixed.
3. **`validate_godot_epilogue` with `packing: true` and missing `"photo"` key**: Fixed — now rejected, and covered by `study_test.gd`.
4. **`validate_godot_epilogue` non-Array `"participants"` on non-taken photo**: Fixed — now rejected, and covered by `study_test.gd`.
5. **Delete `hosting.order` fallback in `inspect_browser_save_json`**: Fixed — removed lines 4026-4027 so invalid/empty `hosting.order` returns empty hosting state matching `restoreHosting` (`public/hosting.js:19`), and covered by `study_test.gd`.
6. **`import_browser_save_from_web_storage` when `localStorage` is empty**: Fixed — sets `browser_import_status = "picker"` and returns `false` after opening the file picker instead of immediately calling `import_browser_save_json("")`.
7. **Preserve picker error reason (`"size"` vs `"read"`) in `poll_web_audio`**: Fixed.
8. **Assign `block_opened` before `update_mural_3d()` in `apply_save_envelope` and `import_browser_save_json`**: Fixed.
9. **Support `--test-suite` CLI flag in `resolve_save_path` and `package.json` `godot:test`**: Fixed.
10. **Label `block_epilogue_btn` `"Pack Loans"` whenever `keepsake_photo.status != "unasked"`**: Fixed.
