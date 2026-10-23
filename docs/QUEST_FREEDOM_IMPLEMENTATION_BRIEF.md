# Open quests and earned invitations

Creator-authorized next implementation, October 23, 2026. Prepared against current source while Election Walk full11 verification is running. This is a source-grounded brief, not implementation or the mandatory CLI pre-code idea pass. Finish and commit the verified in-flight checkpoint first.

## Current constraints

- story_picker.gd open_picker refuses an active story episode. Its two More stories entries dispatch directly to Halloween and Election Walk.
- main.gd current_objective prioritizes active Voting, Lantern, Dog, then Power. active_story_episode and episode start guards enforce one active episode.
- Dog, Lantern and Voting availability currently derives from block_opened plus valid sites; these are not individually earned surprise unlocks.
- Episode close hides its reader; ending and reload clear visit-only state. A selector alone cannot honestly promise resumable quests.

## Proposed coherent slice for pre-code review

An invitation journal accessible through the existing Story navigation, keeping all unlocked stories selectable. Introduce a deliberate selected quest and suspended visit state rather than allowing two routes/world effects to run at once. Switching must stop current travel, release focused controls and clean up episode-specific presentation; returning should restore the correct phase and reader without moving the camera. Examine each episode's cleanup and world state before choosing suspension versus an explicit restart message. Preserve existing completed activities and default overhead view.

Pair new invitations with actual accomplishments and an original resident acknowledgment. Reveal a newly earned invitation through play and offer Follow this invitation or Keep exploring. Choosing Keep exploring retains access. Show completed accomplishments and open invitations; keep undiscovered titles and future-era concepts out of the normal journal. Do not arbitrarily relock existing accessible stories for established saves. Decide persistence from current source and save budget before implementation; no new saved flags are authorized by this brief alone.

## Acceptance

Use actual native and browser input to switch away and return at distinct phases, including Stop during travel and manual camera ownership. Verify isolated world effects and no route continuation from a suspended quest. Test each End/reload boundary with honest copy. Complete an actual prerequisite; observe specific recognition and a visible consequence before the new invitation. Decline the invitation, continue another activity and return through the journal. Verify no duplicate rewards, repeated unlock announcements or future-title spoilers. Keep44px controls/readers/quiet/reduced-motion behavior and both save protections. Include established-save compatibility and the4096-byte guard.

Before coding: exact scoped Claude r1, grounded choice and rejected alternatives. After implementation: separate required r3, driver judgment, allfive fresh gates and retained failures. Human surprise, satisfaction and comfort remain human-playtest questions.
