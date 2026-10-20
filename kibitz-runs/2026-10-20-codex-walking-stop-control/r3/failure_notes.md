# Failure evidence

- artifacts/walking-stop-native-candidate.log: first test incorrectly called talk_with_celeste(), which is immediate dialogue rather than deferred route entry. The missing route made the subsequent control activation choose Next, producing follow-on failures. Fixed the fixture to create a real mural route plus the pending conversation flag; no production change was needed. Existing real KEY_E entry tests remain intact.
- artifacts/walking-stop-native-candidate-fixed.log: GODOT_STUDY_PASS; candidate check and104 Node tests pass. These precede independent review and are not a substitute for final gates after fixes.

- artifacts/walking-stop-browser-before-review.json and walking-stop-browser-candidate.log: all three candidate viewports passed with errors/external empty, but predate the reviewed deferred-input fixes and long-route test.
- artifacts/walking-stop-native-retry-fixture-failure.log: T retry initially remained within8m of Bea, so T correctly chose the nearby neighbor. The fixture now walks farther and explicitly requires no nearby neighbor before testing Celeste retry; production nearby-T behavior was preserved.
- artifacts/walking-stop-light-pool-route-failure.json/.png/.log: a trial Black Hawk Stop probe changed the subsequent Thanh approach. Stop/restart succeeded, but the existing lighting wait timed out with the player2.563m from a light-pool center instead of the required1.3m. Restored the established Thanh approach and added a more-than25m arrival margin before the Stop press; the lighting threshold was not weakened.

- Final post-review run: all five gates passed on the source hashes in source_after_fixes.json. Browser errors/external are empty at all three required sizes; Stop and restart assertions passed. Final logs use walking-stop-*-reviewed.log. verification.json records their hashes and the fresh export/screenshot evidence. Earlier failures above remain separate.
