# Retained failures and corrections

- artifacts/codex-reward-godot-test-initial.log and -2.log: world-tap fixture still displayed a chapter card; new header height placed that card over the tap. Explicitly dismiss the card before testing world interactions. Negative inner guide-arrow rectangle under a crowded viewport was also guarded.
- artifacts/codex-reward-debug.log: retained diagnostics identify the chapter card as the tap consumer, not a world hitbox regression.
- artifacts/codex-reward-godot-test-3.log: old-settings assertion treated load_godot_settings() as parse success. Its established return is Voices-enabled state (false for valid default-off settings). Assert resulting settings instead.
- artifacts/codex-reward-browser-first.log and codex-reward-browser-surprise-failure.json/.png: first surprise did not start sound. External-banner cue IDs now share the sound admission path.
- First desktop startup screenshot showed an opaque Serif addition hiding the avatar; all addition meshes now participate in the existing cutaway/restoration system.
- artifacts/codex-reward-godot-test-4.log: GDScript could not infer boolean type through dynamic event narrowing. Explicit bool annotations fix parser errors.
- artifacts/codex-reward-godot-test-compact-header-old-assertion.log: the old test required desktop details always visible. Update the expectation for the creator's compact-by-default request and test expanded details separately, including final-line scrolling.
- Internal review before final verification found expanded details clipped to three lines and route errors hidden with collapsed Info. Bounded scrolling and explicit error disclosure correct both.
- Follow-up internal review identified delayed overview refitting overwriting route errors. Error disclosure skips the refit; a wide-map regression waits three frames before checking the message.
- Final integration review caught stale conversation context after Map and invisible solo hints with collapsed Info; both were fixed. artifacts/codex-reward-godot-test-hint-fixture.log retains the resulting fixture failure: the compact-header check inherited an explicitly revealed earlier hint. Close details before checking the collapsed conversation layout.
- artifacts/codex-reward-browser-perf-failure.log/.json/.png: one pre-final 320px run failed the existing aggregate M6 performance budget. The old failure receipt omitted the actual performance object, so the specific metric and cause cannot be established from that attempt. Preserve it, include performance metrics in future assertion/failure output, and rerun the final export without concurrent native/Node test suites. No budget was relaxed.

No gate failure was waived. Final receipts distinguish final passing runs from these retained attempts.
