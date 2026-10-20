# Driver judgment

One native Claude Opus 5.5 High r3 call completed successfully (rc=0). All reviewed source hashes were unchanged across the review. Claude had no shell and did not run gates. Codex remains sole writer and judge.

1. CONFIRMED and fixed: surprises/finale/eatery orders dispatch their visual banners outside trigger_progress_cue. Admit these three cue IDs to the independent sound channel as well. Initial browser failure reproduces this. Native first/repeat order and browser discovery tests cover it.
2. CONFIRMED and fixed: resize refitting called overview and hid the startup card. Preserve visible card and pending-start state across refit. Fresh native instance resizes before keyboard acceptance.
3. CONFIRMED and fixed: startup's special screen pan differed from walking's target and could snap on first movement. Removed the pan; use the same player x/z, y=1 target. One common walking-view helper now serves Start, Find Me and F.
4. CONFIRMED and fixed: movement could bypass initial orientation. Observe startup movement keys before Controls consume them and accept/frame first.
5. PARTLY CONFIRMED: cards lacked initial focus. Give Continue/Start deferred keyboard focus, and release focus when entering the walking view. Clicking Sounds intentionally retains that control's standard keyboard activation; no claim that arbitrary focus should be overridden.
6. CONFIRMED input-category issue; unverified late-mixing speculation is not treated as fact. Exclude wheel, Escape and modifier keys; use touch release. Native and browser wheel checks assert no unlock; browser verifies actual player start/stop, mute and no replay.
7. CONFIRMED and fixed: settings file fallback was write-only on Web. Read it when browser storage returns no settings. Existing settings without reward_sounds are tested.
8. CONFIRMED coverage gap and fixed: add fresh-instance startup/resize/keyboard tests, preserving save and player position. Browser tests actual Start button and Enter after reload.

Optional claims: retain reason-specific melodies now that admission is reachable. Remove startup pan. Inspect header wrapping on 320px. Tour completion still intentionally waits for an earlier banner; it requires an already unlocked session.

Additional current-user steering and driver findings after review:

- The user reports characters appearing on roofs and requests permanent close/action and whole-neighborhood buttons. Source-grounded internal recon identified Serif addition osm:way/1072899109 as the opaque blocker: addition_meshes was omitted from both cutaway and restoration. Extend the existing algorithm to all eight additions, retain geometry/collision/data, verify Serif fades at actual startup and restores in overview, then inspect exported screenshots.
- Permanent Find Me closes panels, frames the actual player and preserves progress/route. Tenderloin Map opens the full wider overview. The same follow target prevents initial movement snapping. Zoom In now supports closer views down to 24m.
- The YOU caption is screen-sized and positioned below the feet to separate it from nearby conversation prompts.
- Persistent Sparks/keepsakes derive from existing game state; no extra save fields or score inflation.
- Larger close-view neighbor/object captions wrap to the viewport and use actual multiline font bounds before placement; avoid rewriting full and trimmed text each frame. The museum/portal caption is combined and duplicate neighbor/Talk labels are suppressed.
- Latest creator steering reduces the top box and font sizes. Default header details are collapsed behind Info; the title/objective/progress and tiny attribution remain visible. Internal review caught clipped source/uncertainty lines in the first expanded-Info implementation. Use a bounded scrollable RichTextLabel so all details remain reachable; native checks reach the final line at all three sizes.
- Internal review also caught hidden route-failure explanations when Info is collapsed. Unreachable/blocked paths reveal the explanatory details and synchronize the toggle. A native unreachable-point check verifies visible feedback.
- Follow-up review found that error disclosure from overview could schedule a refit that overwrote the failure two frames later. Route-error disclosure now skips overview refitting; a native wide-map rejection waits three frames and checks both visible text and the accessibility announcement.
- Final integration review found stale conversation fields after Tenderloin Map and a hidden What's Next answer when no neighbor is nearby. Wide overview now clears the conversation fields. Requested hints reveal bounded details when no speaker/panel can show them, or while viewing the map. Native tests cover solo hints and conversation cleanup; browser clicks What's Next from Map and closes Info.

These additional fixes are driver changes validated by the five gates and internal read-only review, not a second external Claude call.
