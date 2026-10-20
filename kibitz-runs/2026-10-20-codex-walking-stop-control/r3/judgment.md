# Driver judgment

One installed Kibitz r3 independent Claude call completed, exact selected claude-opus-5-5, high, rc0, yes-with-fixes. Requested/selected model and effort receipts are retained; usage is unknown. Source/input/anchor hashes were unchanged during review. The reviewer read files; runtime and fingerprint verification belong to Codex, the sole writer/judge.

## Must-fix

1. CONFIRMED. stop_walking intentionally retains selected_neighbor for Next cycling, but KEY_E, KEY_T and request_rook_soundcheck treated selection alone as a running route. After cancellation they could set a pending flag with no path. All three deferred branches now require an actual nonempty current_path. Selection and nearby-T behavior remain intact.
2. CONFIRMED coverage gap. Native checks now re-request Rook soundcheck and Celeste E/T after stopping, and assert a fresh path/pending action. Ordinary Next cycling after Stop is also checked. T deliberately prefers a nearby neighbor, so its retry fixture walks clear of the8m radius and asserts that precondition before expecting Celeste routing. The initial two-second fixture was still near Bea; its failure is retained.

## Should-fix

1. CONFIRMED fragility. button() now returns its Button, the retained walk_control is assigned directly and native tests use that reference. The existing browser layout smoke click is historical coverage; new Stop clicks use reported control bounds.
2. CONFIRMED missing keyboard-repeat evidence. Added an echoed Enter key between real ui_accept press and release. The native suite must prove it does not start Next. No claim of independently reading Godot engine C++ source is made.
3. CONFIRMED avoidable browser timing risk. The Stop probe now asserts more than25m to Thanh's source-defined target immediately before pressing, then restarts Digit5 after stopping. A trial using the long Black Hawk route changed the subsequent Thanh approach and missed the pre-existing1.3m light-pool condition; that failed run is retained. The final probe keeps the established approach with an explicit arrival margin, as the reviewer proposed. The earlier candidate browser pass remains separate.
4. PARTLY CONFIRMED. Stop now forces occlusion refresh after clearing active route flags, removing stale history/mural/speaker route focus where applicable. selected_neighbor remains the deliberate inspected selection used by Next and the block panel, so this does not claim to remove every selected-neighbor cutaway. Changing that general selection policy is outside this stop-control slice.
5. CONFIRMED existing focus behavior, intentionally retained. Buttons keep keyboard focus so Tab/arrow focus navigation and Enter activation remain predictable; WASD releases focus to walk. A fresh Enter activation operates the newly visible Walk & Talk label. Auto-repeat is separately tested to prevent unintended restart. No new pointer-only focus policy or accessibility regression is introduced.

## Optional / cuts

- Removed the duplicated initial Walk & Talk literal; the control starts empty and update_walk_control supplies its initial label.
- Press mode also starts Next on touch/mouse-down, so sliding off afterward does not cancel that activation. This is accepted within the existing button footprint; physical-phone gesture comfort remains untested.
- Kept the bounded settled-stride assertion alongside fresh-frame/no-displacement checks. It verifies that the character visibly stops walking after cancellation, not just that its position stops changing.
- Confirmed the review's no-defect wiring claims by inspecting route starts/clears, early-return ordering and pointer/UI exclusion. No save or public/ write was added.

All five gates are required again after these fixes; final.md and verification.json will identify the final-source evidence. No second external review call is implied.
