# Grounded driver judgment
One Claude r3 CLI call, selected claude-opus-5-5/high, rc0, yes-with-fixes; source unchanged during review. Post-review changes receive driver verification and all five final gates, not another external call.

MUST1 HOLDS: page0 reopen could hide the suggested gold action. Both new hub opening and conversation All Actions entry now choose the suggested action page (fallback0). Native real mural-objective fixture tests both entries and keyboard focus. User page navigation remains explicit.
MUST2 HOLDS: original native bounds rect was stale. Each page now measures its actual panel/header/controls and button enclosure after frames settle; browser uses actual controls rect too.
MUST3 HOLDS: added320px coverage of longer completed/ready/error labels, on each page, preserving original text afterward. Text-fit checks both measured dimensions; existing callbacks and their order remain.
SHOULD1 HOLDS: resize selects the focused action page before hiding controls; conversation-to-hub moves focus from the old conversation choice to a visible action. Native tests cover both.
SHOULD2 HOLDS: explicit BLOCK_ACTION_COUNT12 replaces the implicit final-item count coupling. Native still asserts13 total including permanent Close. Positional test IDs remain an intentionally bounded contract; stable string migration is deferred.
SHOULD3/4/5/6 HOLDS: test page announcements, unchanged real-description scroll, snapshot controls rect/page counts, and no camera zoom/player motion from detail wheel.
SHOULD7 PARTIAL: the browser flow already deterministically imports the legacy fixture before this test; assert the retained imported-save explanation before requiring overflow. Keep a strict real scroll test rather than weakening it based on arbitrary text length. Native uses deterministic long actual dialogue state too.
SHOULD8 CONFIRMED: ignored gate logs identify exact Godot4.7.2; installed ClassDB probe also confirms Button autowrap. project feature version alone would not suffice.
OPTIONAL: preserve focus after pointer paging, so keyboard arrows remain captured by controls. No need to remove the cheap page clamp. No larger refactor or extra paid review.

Driver-found browser regression: preserved screenshot/JSON/log show the caption bottom257.6914825 and6px outlined guide top257.6914673 differ by0.000015px. The strict JS overlap check correctly flags this boundary. Keep strict tests; reserve7px in production placement for the6px outline, leaving a pixel of clearance. Native and browser gates must pass after this correction.

Automation resumed through existing Codex app automation tool, interval30minutes, ACTIVE with no end time; old cutoff superseded by direct creator request. Preserve sole writer/lock/review/commit policies. No public/ edits, deployment, geography/provenance changes or main save-schema changes.
