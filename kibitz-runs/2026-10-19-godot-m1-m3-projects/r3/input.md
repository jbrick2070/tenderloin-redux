# Review Brief — Godot Round 7 (`2026-10-19-godot-m1-m3-projects`)

## Scope
Audit the Godot 4.7.2 Round 7 implementation (`godot/main.gd`, `godot/tests/study_test.gd`, `tests/godot-browser.mjs`), which carries forward:
1. **M1 Afternoon Keepsake & Loan Returns** (`epilogue`, matching `public/core.js`):
   - `PHOTO_GUESTS = ["bea", "celeste", "dez", "thanh"]` (Rook declines a photo without penalty; `take_keepsake_photo()` rejects empty guest lists or any non-consenting/unknown participant ID).
   - `LOAN_IDS = ["table", "paint-case", "speaker"]` (`Thanh's folding table`, `Celeste's paint case`, `Rook's speaker`).
   - `take_keepsake_photo()` freezes a deep copy of `mural_placements`, `mural_palette`, `layout`, and canonical `participants` (`["bea", "celeste", "dez", "thanh"]`) when `block_opened == true`, `not epilogue_packing`, `keepsake_photo.status != "taken"`, and `mural_placements.size() == 3`. Subsequent edits to the live mural or palette do not mutate `keepsake_photo`.
   - `skip_keepsake_photo()` marks `status = "skipped"` and can still be reconsidered before `start_packing_epilogue()`.
   - `start_packing_epilogue()` enables loan returns and transitions `unasked` keepsake status to `skipped`.
   - `return_loan(loan_id)` records returned loans in canonical `LOAN_IDS` order; `advance_epilogue_step()` (`KEY_Y` / `BlockPanel` button) advances through photo -> packing -> loan returns.
   - 3D props: `KeepsakePhotoEasel` (`keepsake_frame_node` + `keepsake_guest_pips`) and `LoanBeacon_*` (`loan_return_beacons`).
2. **M3 Second Afternoon Programme Planning & Hosting** (`programme` + `hosting`, matching `public/programme.js` and `public/hosting.js`):
   - Works once `block_opened == true` (never gated on M1 packing or keepsake status).
   - `PROGRAMME_SEGMENTS = ["stories", "beats", "art", "pause"]`.
   - `programme_issue(order)` enforces all 4 unique segments and requires `"pause"` (`Quiet interval`) between `"beats"` (`Rhythm workshop`) and `"stories"` (`Story circle`) whenever `"beats"` precedes `"stories"`.
   - `programme_publish()` copies `programme_order` into `programme_published` without mutating `hosting_order`; subsequent draft edits do not mutate `programme_published` until re-published.
   - `host_start()` freezes `hosting_order = programme_published.duplicate()` and steps through all 4 segments (`host_set_story`, `host_toggle_beat`, `host_cycle_tile`, `host_set_palette`, `host_set_quiet`, `host_complete_current`, or `advance_programme_and_hosting_step()` on `KEY_Z`).
   - 3D props: `ProgrammeSignboard` (`programme_board_node` + 4 colored `programme_segment_bars`) and `HostingArtTilePanel` (`hosting_tile_panel_node` + 6 colored `hosting_tile_meshes`).
3. **Persistence & Browser Save Adapter**:
   - Strict Godot v1 save validation in `build_save_envelope()` / `apply_save_envelope()` (`validate_godot_epilogue`, `validate_godot_programme`, `validate_godot_hosting`).
   - Read-only browser v1 save (`tenderloin-redux.save.v1`) inspection and monotonic merge of `epilogue`, `programme`, and `hosting` in `inspect_browser_save_json()` / `import_browser_save_json()`.
   - Screen-reader DOM summary (`#godot-a11y-summary`) and `get_a11y_status_snapshot()` updated with M1/M3 fields.

## Files to Inspect
- `godot/main.gd`
- `godot/tests/study_test.gd`
- `tests/godot-browser.mjs`

## Questions for Reviewer
1. Are there any logic bugs, state-leak edge cases, or discrepancies between `public/core.js` / `public/programme.js` / `public/hosting.js` and `godot/main.gd`?
2. Are there any bypasses or type-confusion bugs in `validate_godot_epilogue`, `validate_godot_programme`, `validate_godot_hosting`, `inspect_browser_save_json`, or `import_browser_save_json`?
3. Are all 3D visual nodes (`keepsake_frame_node`, `loan_return_beacons`, `programme_board_node`, `hosting_tile_panel_node`) and UI controls properly synchronized across resets, reloads, and imports?
